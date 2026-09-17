import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ProductModel from '../../models/product.model.js';

dotenv.config({ path: './.env' });

const buildDirectUri = (source) => {
  const raw = source.replace(/^mongodb\+srv:\/\//, '');
  const slash = raw.indexOf('/');
  const authority = slash >= 0 ? raw.slice(0, slash) : raw;
  const suffix = slash >= 0 ? raw.slice(slash) : '/nawiri';
  const at = authority.lastIndexOf('@');
  const auth = at >= 0 ? `${authority.slice(0, at)}@` : '';
  const hosts = [
    'ac-tdgjoui-shard-00-00.3zocvsx.mongodb.net:27017',
    'ac-tdgjoui-shard-00-01.3zocvsx.mongodb.net:27017',
    'ac-tdgjoui-shard-00-02.3zocvsx.mongodb.net:27017',
  ];
  const separator = suffix.includes('?') ? '&' : '?';
  return `mongodb://${auth}${hosts.join(',')}${suffix}${separator}tls=true&authSource=admin`;
};

const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  await mongoose.connect(buildDirectUri(process.env.MONGODB_URI), {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
  });

  try {
    const indexes = await ProductModel.collection.indexes();
    const target = indexes.find((idx) => idx.name === 'qrCode_ci');
    if (!target) {
      console.log(JSON.stringify({ dropped: false, reason: 'qrCode_ci index not found (already absent)' }));
      return;
    }
    await ProductModel.collection.dropIndex('qrCode_ci');
    console.log(JSON.stringify({ dropped: true, index: 'qrCode_ci' }));
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(`Dropping qrCode_ci index failed: ${error.message}`);
  process.exitCode = 1;
});
