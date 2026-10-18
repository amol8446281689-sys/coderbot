import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { embedTexts } from '../services/embeddings.js';
import { addMemory, semanticSearch } from '../services/weaviate.js';

const router = express.Router();

router.post('/save', async (req, res) => {
  try {
    const { userId = 'anonymous', key = 'note', value = '' } = req.body || {};
    if (!value) {
      return res.status(400).json({ error: 'Value is required.' });
    }

    const [vector] = await embedTexts([value]);
    const id = uuidv4();
    await addMemory(id, userId, `${key}: ${value}`, vector);

    res.json({ ok: true, id, saved: { userId, key, value } });
  } catch (error) {
    console.error('Memory save error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { query = '', userId = 'anonymous', limit = 5 } = req.body || {};
    if (!query.trim()) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const [vector] = await embedTexts([query]);
    const results = await semanticSearch(vector, limit);
    res.json({ ok: true, results, userId });
  } catch (error) {
    console.error('Memory search error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
