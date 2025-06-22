import openai
import pytesseract
import re
from PIL import Image, ImageEnhance, ImageFilter
from pathlib import Path
import os
from dotenv import load_dotenv
import json
from datetime import datetime

class ReceiptProcessor:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.raw_text = ""
        self.price_pattern = r'\$?(\d+[.,]?\d{0,2})'
        self.date_formats = [
            (r'\b(\d{2})/(\d{2})/(\d{4})\b', '%m/%d/%Y'),
            (r'\b(\d{4})-(\d{2})-(\d{2})\b', '%Y-%m-%d')
        ]

    def process(self, image_path: Path) -> dict:
        try:
            self.raw_text = self._enhanced_ocr(image_path)

            if not self.raw_text or len(self.raw_text.strip()) < 20:
                return {"error": "No relevant text found. Please check your receipt image."}

            items = self._ai_item_parser()

            return {
                "store": self._extract_store(),
                "date": self._parse_date(),
                "items": items,
                "tax": self._extract_tax(),
                "tip": self._extract_tip(),
                "discount": -self._extract_discount(),
                "total": self._extract_total(),
                "currency": "$"
            }
        except Exception as e:
            return {"error": str(e)}

    def _enhanced_ocr(self, path: Path) -> str:
        """OCR with decimal point protection"""
        img = Image.open(path)
        img = img.convert('L')
        img = img.filter(ImageFilter.MedianFilter()) # Reduce noise
        img = ImageEnhance.Contrast(img).enhance(2) # Boost contrast
        img = ImageEnhance.Sharpness(img).enhance(2)  # Emphasize small dots
        text = pytesseract.image_to_string(img, config='--oem 3 --psm 6')
        return self._clean_text(text)

    def _clean_text(self, text: str) -> str:
        """Decimal-aware cleaning"""
        corrections = [
            # Protect existing decimals first
            (r'(\d)\.(\d{2})', r'\1<DECIMAL>\2'),
            # Fix common OCR errors
            (r'(\d)[lI](\d)', r'\1.\2'),
            (r'\$(\d{1,2})0{2,}', r'$\1.00'),
            (r'(\d) (\d)', r'\1\2'),
            # Restore protected decimals
            (r'<DECIMAL>', r'.')
        ]
        for pattern, replacement in corrections:
            text = re.sub(pattern, replacement, text)
        return text

    def _parse_price(self, price_str: str) -> float:
        """Context-aware price parsing"""
        try:
            cleaned = re.sub(r'[^\d.]', '', price_str)
            parts = cleaned.split('.')
            
            if len(parts) == 1:
                # Auto-detect missing decimal for small amounts
                if len(cleaned) > 2 and int(cleaned) > 1000:
                    return float(cleaned)
                return float(cleaned)/100
                
            return round(float(cleaned), 2)
        except:
            return 0.0

    def _get_validated_items(self) -> list:
        """Price validation with sanity checks"""
        lines = self.raw_text.splitlines()
        items = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Match: <name>  <price> (2+ spaces)
            match = re.match(r"(.+?)\s{2,}(\$?\d+[.,]?\d{0,2})$", line)
            if not match:
                # Fallback: <name> <price> (at least 1 space, price at end)
                match = re.match(r"(.+?)\s+(\$?\d+[.,]?\d{0,2})$", line)

            if match:
                name = self._clean_name(match.group(1))
                price = self._parse_price(match.group(2))

                if 0.01 < price < 1000:  # sanity filter
                    items.append({"name": name, "price": round(price, 2)})

        return items

    def _regex_item_parser(self) -> list:
        """Initial regex-based item extraction"""
        item_matches = re.findall(
            fr'(.+?)\s+({self.price_pattern})',
            self.raw_text,
            flags=re.IGNORECASE
        )
        return [{
            "name": self._clean_name(m[0]),
            "price": self._parse_price(m[1])
        } for m in item_matches if m[0].strip()]

    def _parse_price(self, price_str: str) -> float:
        """Smart price parsing with error correction"""
        try:
            # Remove non-numeric characters except decimal
            cleaned = re.sub(r'[^\d\.-]', '', price_str)
            
            # Handle multiple decimals
            parts = cleaned.split('.')
            if len(parts) > 2:
                return float(f"{parts[0]}.{''.join(parts[1:])[:2]}")
                
            # Handle missing decimals for small amounts
            if len(cleaned) in (3,4) and '.' not in cleaned:
                return float(cleaned[:-2] + '.' + cleaned[-2:])
                
            return round(float(cleaned), 2)
        except:
            return 0.0

    def _ai_item_parser(self) -> list:
        prompt = f"""You are given raw OCR text from a grocery receipt.

        Your task is to extract only the **purchased items**, along with their **final paid price** (after any adjustments or discounts).

        ✔ INCLUDE:
        - Food, groceries, household items
        - Final price paid per item (after adjustment/discount)
        - One entry per purchased product

        ❌ DO NOT include:
        - Weight references (e.g. "5 lb", "10.0 lb", etc.)
        - Original crossed-out prices
        - Subtotals, tax, fee, service fee, checkout, or total
        - Discounts, store credits, coupons, or promotions — they will be handled separately and **must NOT appear as items**

        Output must be a **valid JSON array** in this format:
        [
        {{ "name": "Item Name", "price": x.xx }},
        ...
        ]

        Only return the JSON, nothing else.

        Receipt text:
        {self.raw_text}
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2
            )
            json_str = response.choices[0].message.content.strip()

            # Auto-clean for embedded JSON
            if "```json" in json_str:
                json_str = json_str.split("```json")[-1].split("```")[0].strip()

            return json.loads(json_str)
        except Exception as e:
            raise RuntimeError(f"AI parsing failed: {str(e)}")


    def _validate_total(self, items: list) -> bool:
        """Check if items sum matches total"""
        try:
            item_sum = sum(item["price"] for item in items)
            total = self._extract_total()
            return abs(item_sum + self._extract_tax() - total) <= 0.01
        except:
            return False

    def _extract_total(self) -> float:
        """Reliable total extraction"""
        for line in self.raw_text.splitlines()[::-1]:  # search from bottom up
            if "total" in line.lower():
                match = re.search(self.price_pattern, line)
                if match:
                    return self._parse_price(match.group(1))
        return 0.0

    def _extract_tax(self) -> float:
        total_tax = 0.0
        keywords = ["tax", "fee"]

        for line in self.raw_text.splitlines():
            if any(keyword in line.lower() for keyword in keywords):
                match = re.search(self.price_pattern, line)
                if match:
                    total_tax += self._parse_price(match.group(1))

        return round(total_tax, 2)
    
    def _extract_discount(self) -> float:
        total_discount = 0.0
        keywords = ["discount", "credit", "coupon", "promotion", "rebate", "offer"]

        for line in self.raw_text.splitlines():
            if any(keyword in line.lower() for keyword in keywords):
                match = re.search(self.price_pattern, line)
                if match:
                    amount = self._parse_price(match.group(1))
                    total_discount += amount  # Keep as positive number

        return round(total_discount, 2)
    
    def _extract_tip(self) -> float:
        total_tip = 0.0
        keywords = ["tip", "gratuity"]

        for line in self.raw_text.splitlines():
            if any(keyword in line.lower() for keyword in keywords):
                match = re.search(self.price_pattern, line)
                if match:
                    amount = self._parse_price(match.group(1))
                    total_tip += amount

        return round(total_tip, 2)

    def _parse_date(self) -> str:
        """Flexible date parsing"""
        for pattern, fmt in self.date_formats:
            match = re.search(pattern, self.raw_text)
            if match:
                try:
                    dt = datetime.strptime(match.group(), fmt)
                    return dt.strftime("%Y-%m-%d")
                except:
                    continue
        return ""

    def _extract_store(self) -> str:
        """Store name detection"""
        store_match = re.search(
            r'(?:Shop|Store)\s*Name:\s*(.+)',
            self.raw_text,
            re.IGNORECASE
        )
        return store_match.group(1).strip() if store_match else ""

    def _detect_currency(self) -> str:
        """Currency symbol detection"""
        return "$" if "$" in self.raw_text else "€" if "€" in self.raw_text else "£"

    def _clean_name(self, name: str) -> str:
        """Clean item names"""
        return re.sub(r'\b(?:price|total|tax)\b', '', name, flags=re.IGNORECASE).strip()

if __name__ == "__main__":
    import sys
    load_dotenv()

    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)

    image_path = Path(sys.argv[1])
    processor = ReceiptProcessor()
    result = processor.process(image_path)
    print(json.dumps(result))  # Final result printed to stdout
