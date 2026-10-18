import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { embedTexts } from '../services/embeddings.js';
import { semanticSearch, addMemory } from '../services/weaviate.js';
import { generate } from '../services/llm.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { userId = 'anonymous', message = '', sessionId = uuidv4() } = req.body || {};

    if (!message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const [vector] = await embedTexts([message]);
    const memories = await semanticSearch(vector, 5);

    const context = memories
      .map((m) => m.text)
      .filter(Boolean)
      .slice(0, 3)
      .join('\n');

    const prompt = `You are CoderBot, a helpful coding assistant. Use the remembered context when relevant.\n\nContext:\n${context || 'No previous memory found.'}\n\nUser request:\n${message}\n\nAnswer in a concise but useful way with code examples when helpful.`;
    const reply = await generate(prompt, { max_tokens: 400, temperature: 0.2 });

    const memoryId = uuidv4();
    await addMemory(memoryId, userId, message, vector);

    return res.json({
      ok: true,
      sessionId,
      assistant: reply,
      memory: memories
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to generate response'
    });
  }
});

export default router;
