import { v2 as cloudinaryV2 } from 'cloudinary';

// Configure cloudinary
cloudinaryV2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY // Use the correct environment variable name with _KEY
});

const BROWSER_INCOMPATIBLE_FORMATS = new Set(['heic', 'heif', 'avif']);

// Cloudinary accepts HEIC/HEIF/AVIF, but several browsers cannot render the
// original delivery format. Store a transformed delivery URL for those files
// so proof images remain viewable in Sales Hub and on receipts.
export const getBrowserSafeImageUrl = ({ secureUrl, mimetype, format }) => {
    if (!secureUrl || typeof secureUrl !== 'string') return secureUrl;

    const mimeFormat = String(mimetype || '').toLowerCase().split('/').pop();
    const uploadedFormat = String(format || '').toLowerCase();
    if (!BROWSER_INCOMPATIBLE_FORMATS.has(mimeFormat) && !BROWSER_INCOMPATIBLE_FORMATS.has(uploadedFormat)) {
        return secureUrl;
    }

    if (!secureUrl.includes('/image/upload/')) return secureUrl;
    const transformedUrl = secureUrl.includes('/image/upload/f_jpg')
        ? secureUrl
        : secureUrl.replace('/image/upload/', '/image/upload/f_jpg,q_auto/');
    return transformedUrl.replace(/\.(heic|heif|avif)(?=[?#]|$)/i, '.jpg');
};

const uploadImageClodinary = async(image) => {
    try {
        // Check if image exists
        if (!image) {
            throw new Error("No image provided");
        }
        
        console.log("Processing image for Cloudinary upload");
        console.log("Image data received:", image.mimetype, image.size);
        
        // Create buffer from file - multer stores the file in buffer property
        const buffer = image.buffer;
        
        if (!buffer || buffer.length === 0) {
            throw new Error("Invalid image buffer");
        }
        
        // Create base64 string
        const base64String = `data:${image.mimetype};base64,${buffer.toString('base64')}`;
        
        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            cloudinaryV2.uploader.upload(
                base64String,
                {
                    folder: "el-roi-one", // Optional: organize in folders
                    resource_type: "auto" // Auto-detect resource type
                },
                (error, result) => {
                    if (error) {
                        console.error("Cloudinary upload error:", error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
        
        console.log("Cloudinary upload successful");
        
        return {
            public_id: result.public_id,
            url: getBrowserSafeImageUrl({
                secureUrl: result.secure_url,
                mimetype: image.mimetype,
                format: result.format,
            }),
        };
    } catch (error) {
        console.error("Error in uploadImageCloudinary:", error);
        throw error;
    }
};

// Extracts the Cloudinary public_id from a delivery URL, e.g.
// https://res.cloudinary.com/<cloud>/image/upload/v169.../el-roi-one/abc123.png
// -> "el-roi-one/abc123". Returns null if the URL doesn't match the expected
// shape (e.g. it's not a Cloudinary URL at all).
export const extractCloudinaryPublicId = (url) => {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
    return match ? match[1] : null;
};

// Deletes an image from Cloudinary by its delivery URL. Used for expiring
// Equity payment-proof photos a fixed time after End of Day close (see
// server/utils/proofImageCleanup.js). Resolves to false (does not throw) on
// any failure — a missing/already-deleted asset should not block the rest
// of a cleanup sweep.
export const deleteImageFromUrlCloudinary = async (url) => {
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) {
        console.warn('Could not extract Cloudinary public_id from URL:', url);
        return false;
    }
    try {
        const result = await cloudinaryV2.uploader.destroy(publicId, { resource_type: 'image' });
        return result?.result === 'ok' || result?.result === 'not found';
    } catch (error) {
        console.error('Error deleting Cloudinary image:', publicId, error);
        return false;
    }
};

export default uploadImageClodinary;
