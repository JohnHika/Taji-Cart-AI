import React, { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { FaRegUserCircle } from 'react-icons/fa'
import { IoClose } from "react-icons/io5"
import { useDispatch, useSelector } from 'react-redux'
import SummaryApi from '../common/SummaryApi'
import { updatedAvatar } from '../store/userSlice'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
// Import the cropper component - This assumes react-easy-crop has been installed
// If not installed, run: npm install react-easy-crop
import Cropper from 'react-easy-crop'

const UserProfileAvatarEdit = ({close}) => {
    const user = useSelector(state => state.user)
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [showCropper, setShowCropper] = useState(false)
    
    // Crop state
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

    const handleSubmit = (e) => {
        e.preventDefault()
        
        if (selectedFile && croppedAreaPixels) {
            // Process the cropped image
            getCroppedImage()
                .then(croppedImage => {
                    uploadAvatar(croppedImage)
                })
                .catch(error => {
                    console.error('Error cropping image:', error)
                    toast.error('Error processing image')
                })
        } else if (selectedFile) {
            uploadAvatar(selectedFile)
        } else {
            toast.error("Please select an image to upload")
        }
    }

    const validateFile = (file) => {
        // Check if file is an image
        if (!file.type.match('image.*')) {
            toast.error('Please select an image file (JPEG, PNG, GIF, etc.)')
            return false
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB')
            return false
        }
        
        return true
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        
        if (!file) return
        
        if (validateFile(file)) {
            setSelectedFile(file)
            
            // Create a preview URL
            const reader = new FileReader()
            reader.onload = () => {
                setPreviewUrl(reader.result)
                setShowCropper(true)
            }
            reader.readAsDataURL(file)
        }
    }
    
    // Handle crop complete
    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    // Create a cropped image
    const getCroppedImage = async () => {
        try {
            const image = new Image()
            image.src = previewUrl
            
            // Wait for image to load
            await new Promise((resolve) => {
                image.onload = resolve
            })
            
            // Create canvas for cropped image
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            
            // Set dimensions
            canvas.width = croppedAreaPixels.width
            canvas.height = croppedAreaPixels.height
            
            // Draw cropped image
            ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            )
            
            // Convert canvas to Blob
            return new Promise((resolve) => {
                canvas.toBlob(blob => {
                    // Create a File from the Blob
                    const file = new File([blob], selectedFile.name, { 
                        type: 'image/jpeg',
                        lastModified: Date.now() 
                    })
                    resolve(file)
                }, 'image/jpeg', 0.95)
            })
        } catch (e) {
            console.error('Error creating cropped image:', e)
            toast.error('Error processing image')
            throw e
        }
    }
    
    const uploadAvatar = async (file) => {
        const formData = new FormData()
        formData.append('avatar', file)
        
        try {
            setLoading(true)
            toast.loading('Uploading image...')
            
            const response = await Axios({
                ...SummaryApi.uploadAvatar,
                data: formData,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            
            const { data: responseData } = response
            
            if (responseData.success) {
                dispatch(updatedAvatar(responseData.data.avatar))
                toast.success('Profile picture updated successfully')
                close()
            }
        } catch (error) {
            console.error('Upload error:', error)
            AxiosToastError(error)
        } finally {
            setLoading(false)
            toast.dismiss()
        }
    }

    return (
        <section className='fixed top-0 bottom-0 left-0 right-0 bg-neutral-900 bg-opacity-60 p-4 flex items-center justify-center z-50'>
            <div className='bg-white dark:bg-gray-800 max-w-md w-full rounded p-6 flex flex-col items-center justify-center'>
                <button onClick={close} className='text-neutral-800 dark:text-white w-fit block ml-auto'>
                    <IoClose size={20}/>
                </button>
                <h3 className="text-lg font-medium mb-4 dark:text-white">Update Profile Picture</h3>
                
                {!previewUrl ? (
                    <>
                        <div className='w-24 h-24 bg-blue-50 dark:bg-gray-700 flex items-center justify-center rounded-full overflow-hidden drop-shadow-sm border-2 border-primary-100 dark:border-primary-300 mb-4'>
                            {user.avatar ? (
                                <img 
                                    alt={user.name}
                                    src={user.avatar}
                                    className='w-full h-full object-cover'
                                />
                            ) : (
                                <FaRegUserCircle size={65} className="text-gray-400 dark:text-gray-300"/>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
                            Upload a new profile picture<br/>
                            <span className="text-xs text-gray-500">Supported formats: JPEG, PNG, GIF (Max 5MB)</span>
                        </p>
                        <form className="w-full">
                            <label htmlFor='uploadProfile' className="w-full flex justify-center">
                                <div className='border border-primary-200 dark:border-primary-300 cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-300/30 px-6 py-2 rounded-full text-sm my-3 text-center transition-colors duration-200 flex items-center justify-center w-3/4 mx-auto'>
                                    {loading ? "Uploading..." : "Choose Image"}
                                </div>
                                <input 
                                    onChange={handleFileSelect} 
                                    type='file' 
                                    id='uploadProfile' 
                                    accept="image/*"
                                    className='hidden'
                                    disabled={loading}
                                />
                            </label>
                        </form>
                    </>
                ) : (
                    <div className="w-full">
                        {/* Image Cropper */}
                        {showCropper && (
                            <div className="relative h-64 w-full mb-6">
                                <Cropper
                                    image={previewUrl}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                    cropShape="round"
                                    showGrid={false}
                                />
                            </div>
                        )}
                        
                        {/* Zoom Control */}
                        <div className="w-full px-4 mb-4">
                            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                                Zoom
                            </label>
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-between space-x-3 w-full px-4 mt-4">
                            <button
                                onClick={() => {
                                    setPreviewUrl(null)
                                    setShowCropper(false)
                                    setSelectedFile(null)
                                }}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex-1"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-4 py-2 bg-primary-200 hover:bg-primary-300 text-white rounded-md transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? "Uploading..." : "Save Image"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

export default UserProfileAvatarEdit
