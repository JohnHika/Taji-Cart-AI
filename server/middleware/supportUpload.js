import multer from 'multer';

// Separate from middleware/multer.js (images only, 5MB, for product photos):
// bug reports can include short screen-recording videos, matching the
// 25MB / image+video allowlist the huly-support-intake backend accepts.
const storage = multer.memoryStorage();

const ALLOWED_TYPES = [
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
];

const supportUpload = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            return cb(new Error('Unsupported attachment type. Please attach an image or video.'), false);
        }
        cb(null, true);
    }
});

export default supportUpload;
