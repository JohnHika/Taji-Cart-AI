import Product from '../../models/product.model.js';
import { embedTexts } from './embedder.js';
import { upsertProductChunks, topKSimilar } from './vectorStore.js';

function chunkText(text, chunkSize = 400) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }
  return chunks.length ? chunks : [text];
}

export async function reindexAllProducts() {
  const provider = (process.env.RAG_EMBED_PROVIDER || 'openai').toLowerCase();
  const model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
  const products = await Product.find({}).select('name description specs price brand category').populate('category','name');
  let total = 0;
  for (const p of products) {
    const specText = p.specs && typeof p.specs === 'object' ? Object.entries(p.specs).map(([k,v])=>`${k}: ${v}`).join('\n') : '';
    const base = `${p.name}\nBrand: ${p.brand || ''}\nCategory: ${p.category?.name || ''}\nPrice: ${p.price}\n${p.description || ''}\n${specText}`.trim();
    const parts = chunkText(base, 120);
    const embeddings = await embedTexts(parts);
    const chunks = parts.map((text, i) => ({ text, embedding: embeddings[i] }));
    await upsertProductChunks(p._id, chunks, { provider, model });
    total += chunks.length;
  }
  return { products: products.length, chunks: total };
}

export async function retrieveRelevantContexts(query, k = 5) {
  const [queryEmbedding] = await embedTexts([query]);
  const hits = await topKSimilar(queryEmbedding, k);
  return hits;
}
