import { retrieveRelevantContexts, reindexAllProducts } from './retriever.js';
import { composeAnswer } from './generator.js';
import { reasonOverContext } from './reasoner.js';

export async function ragAnswer(query, session = {}) {
  const k = Number(process.env.RAG_TOP_K || 5);
  const hits = await retrieveRelevantContexts(query, k);
  const draft = await composeAnswer(query, hits, { currency: session.preferredCurrency || 'KES' });

  let text = draft;
  if (String(process.env.REASONING_ENABLED || 'false').toLowerCase() === 'true') {
    const provider = process.env.REASONING_PROVIDER || 'ollama';
    const model = process.env.REASONING_MODEL;
    const apiKey = provider === 'openai' ? process.env.OPENAI_API_KEY
                  : (provider === 'hf' || provider === 'huggingface') ? process.env.HF_TOKEN
                  : undefined;
    try {
      text = await reasonOverContext({
        query,
        draft,
        contexts: hits.map(h => ({ text: h.text || '', score: h.score })),
        provider,
        model,
        apiKey
      });
    } catch (e) {
      // Fallback silently on reasoning failure
      text = draft;
    }
  }

  return { text, hits };
}

export async function ragReindex() {
  return reindexAllProducts();
}
