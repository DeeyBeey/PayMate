// clearDB.js or clearDB.mjs

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const db = process.env.MONGO_URL;

const clearDatabase = async () => {
  try {
    await mongoose.connect(db);
    const collections = await mongoose.connection.db.listCollections().toArray();

    for (const collection of collections) {
      console.log(`Clearing ${collection.name}...`);
      await mongoose.connection.db.collection(collection.name).deleteMany({});
    }

    console.log('✅ All documents deleted. Schema remains intact.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase();
