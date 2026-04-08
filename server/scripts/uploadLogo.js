import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
});

const logoPath = path.resolve(__dirname, '../../client/public/images/nawiri_logo.jpeg');

const stream = cloudinary.uploader.upload_stream(
  { public_id: 'nawiri_logo_email', folder: 'brand', overwrite: true, transformation: [{ width: 200, crop: 'limit' }] },
  (err, res) => {
    if (err) {
      console.error('UPLOAD_ERR', err.message);
    } else {
      console.log('LOGO_URL:', res.secure_url);
    }
  }
);

fs.createReadStream(logoPath).pipe(stream);
