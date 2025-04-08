import toast from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import Axios from './Axios';

const uploadImage = async(image) => {
    try {
        // Validate the image
        if (!image) {
            throw new Error("No image provided");
        }
        
        const formData = new FormData()
        formData.append('image', image)
        
        console.log("Uploading image:", image.name, "Size:", image.size);
        
        // Increase timeout for large images
        const response = await Axios({
            ...SummaryApi.uploadImage,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 30000 // Increase timeout to 30 seconds for larger images
        })
        
        console.log("Upload response:", response);
        return response
    } catch (error) {
        console.error("Upload error:", error);
        
        // Improve error messaging
        if (error.code === "ECONNABORTED") {
            toast.error("Upload timed out. The image may be too large or the server is busy.");
        } else if (error.response) {
            toast.error(`Upload failed: ${error.response.data?.message || error.message}`);
        } else {
            toast.error("Failed to upload image. Please try again.");
        }
        
        throw error;
    }
}

// New function to handle multiple image uploads
export const uploadMultipleImages = async(files) => {
    if (!files || files.length === 0) {
        throw new Error("No images provided");
    }

    // Show a single toast for multiple uploads
    const uploadToastId = toast.loading(`Uploading ${files.length} images...`);
    
    try {
        // Map each file to a promise for parallel uploads
        const uploadPromises = Array.from(files).map(async (file) => {
            try {
                const response = await uploadImage(file);
                return response?.data?.data?.url || null;
            } catch (error) {
                console.error(`Error uploading ${file.name}:`, error);
                // Return null for failed images instead of rejecting the whole batch
                return null;
            }
        });
        
        // Wait for all uploads to complete
        const results = await Promise.all(uploadPromises);
        
        // Filter out any failed uploads (null values)
        const successfulUploads = results.filter(url => url !== null);
        
        // Update toast with results
        if (successfulUploads.length === files.length) {
            toast.success(`All ${files.length} images uploaded successfully!`, { id: uploadToastId });
        } else {
            toast.success(`Uploaded ${successfulUploads.length} of ${files.length} images`, { id: uploadToastId });
        }
        
        return successfulUploads;
    } catch (error) {
        toast.error("Failed to upload images. Please try again.", { id: uploadToastId });
        throw error;
    }
}

export default uploadImage