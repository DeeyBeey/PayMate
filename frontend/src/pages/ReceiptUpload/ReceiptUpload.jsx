import React, { useState } from 'react';
import './ReceiptUpload.css';
import { useNavigate } from 'react-router-dom';

const ReceiptUpload = () => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  const [message, setMessage] = useState('');
  const [receiptId, setReceiptId] = useState(null);

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const fileUrl = URL.createObjectURL(uploadedFile);
    setPreviewUrl(fileUrl);
    setMessage('');
    setLoadingMessage('');
    setIsProcessed(false);
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setMessage('');
    setLoadingMessage('');
    setIsProcessed(false);
  };

  const handleSubmit = async () => {
    if (!file) {
      setMessage('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      setUploading(true);
      setLoadingMessage('⏳ Uploading and processing receipt...');
      const res = await fetch('http://localhost:5000/server/receipt/scan-receipt', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok && data && !data.error) {
        setMessage('✅ Receipt processed successfully!');
        console.log(data); // Optional: store data in global state or pass to next page
        setReceiptId(data._id);
        setIsProcessed(true);
      } else {
        const errorMsg = data.error || data.message || 'Upload failed.';
        setMessage(`❌ ${errorMsg}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('❌ Something went wrong. Please try again.');
    } finally {
      setUploading(false);
      setLoadingMessage('');
    }
  };

  const handleAssignSplits = () => {
    if (receiptId) {
      navigate(`/assign-splits/${receiptId}`); // ✅ pass the ID in the URL
    } else {
      setMessage('Could not locate receipt ID');
    }
  };
  

  return (
    <div className="upload-container">
      <h2>Upload Your Receipt</h2>

      <div className="upload-box">
        {!file ? (
          <label htmlFor="file-upload" className="upload-label">
            Click or drag a file here
            <input
              type="file"
              id="file-upload"
              accept="image/jpeg,image/png,image/jpg"
              onChange={handleFileChange}
              hidden
            />
          </label>
        ) : (
          <div className="preview">
            {file.type.startsWith('image/') ? (
              <img src={previewUrl} alt="Receipt Preview" />
            ) : file.type === 'application/pdf' ? (
              <iframe
                title="PDF Preview"
                src={previewUrl}
                frameBorder="0"
                width="100%"
                height="400px"
              ></iframe>
            ) : (
              <p>Unsupported file type</p>
            )}

            <div className="button-row">
              <button className="clear-btn" onClick={handleClear} disabled={uploading}>
                Clear
              </button>
              <button className="submit-btn" onClick={handleSubmit} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Submit'}
              </button>
            </div>

            {loadingMessage && <p className="loading-message">{loadingMessage}</p>}
            {message && <p className="upload-message">{message}</p>}

            {isProcessed && (
              <button className="assign-btn" onClick={handleAssignSplits}>
                Assign Splits
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptUpload;
