import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';

const DEFAULT_OPENAI_EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

export async function embedTexts(texts, opts = {}) {
  const provider = (opts.provider || process.env.RAG_EMBED_PROVIDER || 'openai').toLowerCase();
  if (provider === 'openai') {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = opts.model || DEFAULT_OPENAI_EMBED_MODEL;
    const res = await openai.embeddings.create({ model, input: texts });
    return res.data.map((d) => d.embedding);
  }
  if (provider === 'huggingface' || provider === 'hf') {
    const apiKey = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error('HF_TOKEN is required for Hugging Face embeddings');
    const hf = new HfInference(apiKey);
    const model = opts.model || process.env.HF_EMBED_MODEL || 'intfloat/multilingual-e5-small';
    const outputs = await Promise.all(texts.map((t) => hf.featureExtraction({ model, inputs: t })));
    return outputs.map((arr) => Array.from(arr));
  }
  throw new Error(`Unsupported embed provider: ${provider}`);
}
