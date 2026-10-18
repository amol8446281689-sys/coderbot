import express from 'express';
import { runCode } from '../services/runner.js';

const router = express.Router();

router.post('/run', async (req, res) => {
  try {
    const { language = 'javascript', code = '', timeoutSec = 10 } = req.body || {};
    if (!code.trim()) {
      return res.status(400).json({ error: 'Code is required.' });
    }

    const result = await runCode({ language, code, timeoutSec });
    res.json({ ok: true, result });
  } catch (error) {
    console.error('Run error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Execution failed.' });
  }
});

export default router;
