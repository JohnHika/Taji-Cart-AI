import Product from '../../models/product.model.js';

export async function composeAnswer(query, hits, opts = {}) {
  // For now, generate a concise answer using retrieved chunks and DB lookup for prices.
  const productIds = [...new Set(hits.map(h => String(h.product)))].slice(0, 5);
  const products = await Product.find({ _id: { $in: productIds } }).select('name price stock brand');
  const lines = products.map((p, idx) => `${idx+1}. ${p.name} - KES ${Number(p.price).toLocaleString()}${p.stock > 0 ? ' (In stock)' : ' (Out of stock)'}`);
  const preface = `Here are items that match "${query}":`;
  const follow = `Reply with 1-${lines.length} for details or say "add to cart".`;
  return [preface, '', ...lines, '', follow].join('\n');
}
