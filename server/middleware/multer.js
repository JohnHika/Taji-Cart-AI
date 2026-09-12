import multer from 'multer';

// Using memory storage since you're uploading to Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        // Some phones capture HEIC/HEIF photos that the browser cannot
        // re-encode client-side; leave room for those originals while the
        // byte-signature check still rejects non-images.
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        // The byte-signature check in the controller is authoritative. Keep
        // accepting image MIME types here because mobile cameras can provide
        // HEIC/HEIF files with a browser-generated name that has no familiar
        // extension; spoofed content is still rejected after multer buffers it.
        const hasAllowedExtension = /\.(jpg|jpeg|png|gif|webp|heic|heif|avif)$/i.test(file.originalname || '');
        const hasImageMimeType = typeof file.mimetype === 'string' && file.mimetype.startsWith('image/');
        if (!hasAllowedExtension && !hasImageMimeType) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

export default upload;