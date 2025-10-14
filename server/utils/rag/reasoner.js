import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';
import axios from 'axios';

export async function reasonOverContext({ query, draft, contexts = [], provider, model, apiKey }) {
  const system = `You are a helpful shopping assistant for an e-commerce site. 
You must provide concise, practical answers grounded in the provided product facts.
- Prefer local prices and availability.
- Avoid hallucinations. If unsure, say so briefly.
- Keep answers under 120 words unless asked for more.
`;
  const contextText = contexts.map((c, i) => `#${i+1} ${c.text}`).join('\n');
  const prompt = `${system}\n\nUser question: ${query}\n\nRetrieved facts:\n${contextText}\n\nDraft answer (from retrieval):\n${draft}\n\nRefine the draft to be more helpful and precise.`;

  switch ((provider || '').toLowerCase()) {
    case 'openai':
      if (!apiKey) throw new Error('OpenAI API key required');
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Question: ${query}\n\nFacts:\n${contextText}\n\nDraft:\n${draft}\n\nRefine.` }
        ],
        temperature: 0.3,
      });
      return completion.choices?.[0]?.message?.content?.trim() || draft;

    case 'hf':
    case 'huggingface':
      if (!apiKey) throw new Error('HF token required');
      const hf = new HfInference(apiKey);
      const res = await hf.textGeneration({
        model: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        inputs: prompt,
        parameters: { max_new_tokens: 220, temperature: 0.3 }
      });
      return (res.generated_text || '').trim() || draft;

    case 'ollama':
      // Assumes local Ollama server on 11434
      {
        const url = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const m = model || 'llama3:instruct';
        const resp = await axios.post(`${url}/api/generate`, {
          model: m,
          prompt,
          options: { temperature: 0.3, num_predict: 220 }
        }, { timeout: 30000 });
        const text = resp.data?.response || '';
        return text.trim() || draft;
      }

    default:
      return draft; // no reasoning provider, return draft
  }
}
