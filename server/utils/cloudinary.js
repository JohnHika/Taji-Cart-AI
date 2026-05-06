import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY || process.env.CLOUDINARY_API_SECRET
});

function assertCloudinaryConfig() {
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
        throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET_KEY.');
    }
}

function fileToUploadSource(fileOrPath) {
    if (!fileOrPath) {
        throw new Error('No file provided for Cloudinary upload');
    }

    if (typeof fileOrPath === 'string') {
        return fileOrPath;
    }

    if (fileOrPath.path) {
        return fileOrPath.path;
    }

    if (fileOrPath.buffer) {
        const mimetype = fileOrPath.mimetype || 'application/octet-stream';
        return `data:${mimetype};base64,${fileOrPath.buffer.toString('base64')}`;
    }

    throw new Error('Unsupported Cloudinary upload input');
}

export async function uploadFileToCloudinary(fileOrPath, options = {}) {
    assertCloudinaryConfig();

    const result = await cloudinary.uploader.upload(fileToUploadSource(fileOrPath), {
        folder: options.folder || 'taji-cart/driver-documents',
        resource_type: options.resource_type || 'auto',
        ...options
    });

    return {
        ...result,
        url: result.secure_url
    };
}

export default {
    uploadFileToCloudinary
};
