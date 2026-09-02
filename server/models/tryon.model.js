import mongoose from 'mongoose';

// AI hairstyle try-on ("wear it look") — a generated photo of a person
// wearing a catalog hairstyle, produced from a hairstyle product photo plus
// an optional model/customer face photo. Admins generate and curate; each
// result can be attached to the product's image gallery once it looks
// right. Gated behind the ai-style-tryon feature flag in the Feature
// Releases panel (admin-only until explicitly released).
const tryOnResultSchema = new mongoose.Schema({
  // Catalog product this result was generated for.
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true,
    index: true,
  },
  // Cloudinary URL of the generated "installed" photo.
  resultImageUrl: {
    type: String,
    required: true,
  },
  // Cloudinary URL of the hairstyle photo the generation started from
  // (product image or a custom upload).
  sourceImageUrl: {
    type: String,
    default: '',
  },
  // The actual image sent to the image model. This can be a stronger
  // reference photo than the product's standard catalog cover image.
  referenceImageUrl: {
    type: String,
    default: '',
  },
  // Optional face photo the customer/Aunty supplied, when one was used.
  faceUsedUrl: {
    type: String,
    default: '',
  },
  // Free-text styling notes that guided this generation (length, colour,
  // vibe...). Kept so a result can be reproduced or tweaked.
  promptNotes: {
    type: String,
    default: '',
    trim: true,
  },
  // Stored with each result so reviewers can compare a generation against
  // the provider/model that made it and reproduce a preferred look later.
  provider: {
    type: String,
    enum: ['openai', 'gemini', 'ollama'],
    default: 'openai',
  },
  model: {
    type: String,
    default: '',
  },
  // Admins approve a result before it can go anywhere near the public
  // gallery. Rejected ones stay here for reference/retry.
  status: {
    type: String,
    enum: ['pending_review', 'approved', 'rejected'],
    default: 'pending_review',
  },
  // Set when the result is pushed into the product's image gallery.
  attachedToProductAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdByName: {
    type: String,
    default: '',
  },
}, { timestamps: true });

const TryOnResultModel = mongoose.model('TryOnResult', tryOnResultSchema);

export default TryOnResultModel;