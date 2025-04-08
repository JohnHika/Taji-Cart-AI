import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ensureDirectoriesExist = () => {
  const uploadDir = path.join(__dirname, '../uploads');
  
  if (!fs.existsSync(uploadDir)) {
    console.log('Creating uploads directory...');
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Uploads directory created at:', uploadDir);
  } else {
    console.log('Uploads directory exists at:', uploadDir);
  }
};
