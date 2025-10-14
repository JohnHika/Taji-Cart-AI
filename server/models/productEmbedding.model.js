import mongoose from 'mongoose';

const ProductEmbeddingSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true, required: true },
    chunkIndex: { type: Number, index: true },
    text: { type: String },
    embedding: { type: [Number], index: false },
    provider: { type: String, default: 'openai' },
    model: { type: String },
  },
  { timestamps: true }
);

// Helpful compound index for queries
ProductEmbeddingSchema.index({ product: 1, chunkIndex: 1 });

const ProductEmbedding = mongoose.model('ProductEmbedding', ProductEmbeddingSchema);
export default ProductEmbedding;
