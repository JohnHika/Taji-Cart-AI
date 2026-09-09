import uploadImageClodinary from "../utils/uploadImageClodinary.js"
import isValidImageBuffer from "../utils/verifyImageMagicBytes.js"

const uploadImageController = async(request,response)=>{
    try {
        const file = request.file

        if (!file) {
            return response.status(400).json({
                message : "No image file provided",
                error : true,
                success : false
            })
        }

        // multer's fileFilter only checked the filename extension — verify the
        // actual bytes match a real image format before forwarding it anywhere.
        if (!isValidImageBuffer(file.buffer)) {
            return response.status(400).json({
                message : "File content does not match a supported image format",
                error : true,
                success : false
            })
        }

        const uploadImage = await uploadImageClodinary(file)

        return response.json({
            message : "Upload done",
            data : uploadImage,
            success : true,
            error : false
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export default uploadImageController