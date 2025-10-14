import ProductEmbedding from '../../models/productEmbedding.model.js';

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function upsertProductChunks(productId, chunks, { provider, model }) {
  // Remove existing embeddings for this product/model to keep latest
  await ProductEmbedding.deleteMany({ product: productId });
  await ProductEmbedding.insertMany(
    chunks.map((c, idx) => ({ product: productId, chunkIndex: idx, text: c.text, embedding: c.embedding, provider, model }))
  );
}

export async function topKSimilar(queryEmbedding, k = 5) {
  // Fetch in batches to compute similarity in app (simple approach). For production use vector indices.
  const docs = await ProductEmbedding.find({}).limit(5000).lean();
  const scored = docs.map((d) => ({ ...d, score: cosineSim(queryEmbedding, d.embedding || []) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
