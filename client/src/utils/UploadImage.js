import toast from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import Axios from './Axios';

const UPLOAD_TIMEOUT_MS = 45000;
// A stalled upload on a poor shop connection is a timeout or a plain network
// drop, not a server rejection — those are worth a couple of silent retries
// before bothering the cashier. A 4xx/5xx from the server (bad file, auth,
// etc.) won't succeed on retry, so it fails immediately instead.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = [1500, 3000];

const isRetryableError = (error) => !error.response; // covers ECONNABORTED (timeout) and network errors

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// onProgress (optional) receives 0-100 as the upload sends — mainly so a
// stalled upload reads as "40%, still going" instead of a plain frozen
// spinner, which is what makes a slow connection feel "stuck" versus just slow.
const uploadImage = async(image, onProgress) => {
    if (!image) {
        throw new Error("No image provided");
    }

    const formData = new FormData()
    formData.append('image', image)

    console.log("Uploading image:", image.name, "Size:", image.size);

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            onProgress?.(0);
            const response = await Axios({
                ...SummaryApi.uploadImage,
                data: formData,
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: UPLOAD_TIMEOUT_MS,
                onUploadProgress: (event) => {
                    if (!event.total) return;
                    onProgress?.(Math.round((event.loaded * 100) / event.total));
                }
            })

            console.log("Upload response:", response);
            return response
        } catch (error) {
            lastError = error;
            console.error(`Upload error (attempt ${attempt}/${MAX_ATTEMPTS}):`, error);

            const canRetry = attempt < MAX_ATTEMPTS && isRetryableError(error);
            if (canRetry) {
                await wait(RETRY_DELAY_MS[attempt - 1] || RETRY_DELAY_MS[RETRY_DELAY_MS.length - 1]);
                continue;
            }
            break;
        }
    }

    // Improve error messaging
    if (lastError.code === "ECONNABORTED") {
        toast.error("Upload timed out after several attempts. Check your connection and try again.");
    } else if (lastError.response) {
        toast.error(`Upload failed: ${lastError.response.data?.message || lastError.message}`);
    } else {
        toast.error("Failed to upload image after several attempts. Check your connection and try again.");
    }

    throw lastError;
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