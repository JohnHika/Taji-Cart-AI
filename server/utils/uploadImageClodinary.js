import { v2 as cloudinaryV2 } from 'cloudinary';

// Configure cloudinary
cloudinaryV2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY // Use the correct environment variable name with _KEY
});

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
            url: result.secure_url
        };
    } catch (error) {
        console.error("Error in uploadImageCloudinary:", error);
        throw error;
    }
};

export default uploadImageClodinary;
