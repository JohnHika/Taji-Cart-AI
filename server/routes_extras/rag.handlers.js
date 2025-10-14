import { ragAnswer, ragReindex } from '../utils/rag/pipeline.js';

function ensureEnabled(res) {
  if (process.env.RAG_ENABLED !== 'true') {
    res.status(403).json({ success: false, message: 'RAG is disabled. Set RAG_ENABLED=true.' });
    return false;
  }
  if (!process.env.OPENAI_API_KEY) {
    res.status(400).json({ success: false, message: 'OPENAI_API_KEY missing for embeddings.' });
    return false;
  }
  return true;
}

export async function ragReindexHandler(req, res) {
  if (!ensureEnabled(res)) return;
  try {
    const stats = await ragReindex();
    res.json({ success: true, stats });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export async function ragAskHandler(req, res) {
  if (!ensureEnabled(res)) return;
  try {
    const { query, session } = req.body || {};
    if (!query) return res.status(400).json({ success: false, message: 'query is required' });
    const ans = await ragAnswer(query, session || {});
    res.json({ success: true, ...ans });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
