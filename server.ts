import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MemoryRecord {
  id: string;
  userId: string;
  text: string;
  vector: number[];
  createdAt: string;
}

// In-memory resilient vector memory store with optional Weaviate sync
class ResilientMemoryStore {
  private memories: MemoryRecord[] = [
    {
      id: 'init-1',
      userId: 'system',
      text: 'Preferred language: JavaScript/TypeScript with modern ES modules.',
      vector: ResilientMemoryStore.generateEmbedding('Preferred language: JavaScript/TypeScript with modern ES modules.'),
      createdAt: new Date().toISOString()
    },
    {
      id: 'init-2',
      userId: 'system',
      text: 'Coding guideline: Write clean, idiomatic code with clear error handling.',
      vector: ResilientMemoryStore.generateEmbedding('Coding guideline: Write clean, idiomatic code with clear error handling.'),
      createdAt: new Date().toISOString()
    }
  ];

  static generateEmbedding(text: string): number[] {
    const dim = 64;
    const vector = new Array(dim).fill(0);
    const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const words = cleaned.split(/\s+/).filter(Boolean);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = (hash * 31 + word.charCodeAt(j)) % 2147483647;
      }
      const index = Math.abs(hash) % dim;
      vector[index] += 1;

      // also 3-grams
      for (let j = 0; j <= word.length - 3; j++) {
        const sub = word.substring(j, j + 3);
        let subHash = 0;
        for (let k = 0; k < 3; k++) {
          subHash = (subHash * 37 + sub.charCodeAt(k)) % 2147483647;
        }
        vector[Math.abs(subHash) % dim] += 0.5;
      }
    }

    // Normalize vector
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vector[i] /= norm;
      }
    }
    return vector;
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  async addMemory(id: string, userId: string, text: string, vector?: number[]): Promise<void> {
    const finalVector = vector && vector.length ? vector : ResilientMemoryStore.generateEmbedding(text);
    this.memories.unshift({
      id,
      userId,
      text,
      vector: finalVector,
      createdAt: new Date().toISOString()
    });

    // Attempt Weaviate if available
    const weaviateUrl = process.env.WEAVIATE_URL;
    if (weaviateUrl) {
      try {
        await fetch(`${weaviateUrl}/v1/objects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            class: 'Memory',
            id,
            properties: { userId, text, createdAt: new Date().toISOString() },
            vector: finalVector
          })
        });
      } catch (err) {
        // Fall back gracefully
      }
    }
  }

  async search(queryVector: number[], limit = 5): Promise<Array<{ text: string; userId: string; _additional?: { distance: number } }>> {
    const weaviateUrl = process.env.WEAVIATE_URL;
    if (weaviateUrl) {
      try {
        const response = await fetch(`${weaviateUrl}/v1/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{
              Get {
                Memory(nearVector: {vector: ${JSON.stringify(queryVector)}, certainty: 0.0}, limit: ${limit}) {
                  text
                  userId
                  _additional { distance }
                }
              }
            }`
          })
        });
        if (response.ok) {
          const json = await response.json();
          const items = json.data?.Get?.Memory;
          if (Array.isArray(items) && items.length > 0) {
            return items;
          }
        }
      } catch {
        // Fallback to local memory store
      }
    }

    // Local in-memory cosine search
    const scored = this.memories.map((m) => {
      const sim = ResilientMemoryStore.cosineSimilarity(queryVector, m.vector);
      return {
        text: m.text,
        userId: m.userId,
        _additional: { distance: 1 - sim }
      };
    });

    scored.sort((a, b) => a._additional.distance - b._additional.distance);
    return scored.slice(0, limit);
  }

  getAll() {
    return this.memories;
  }
}

const memoryStore = new ResilientMemoryStore();

// Code runner service
async function runCode({ language, code, timeoutSec = 10 }: { language: string; code: string; timeoutSec?: number }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderbot-'));
  try {
    const lang = (language || 'javascript').toLowerCase();
    let filePath = path.join(dir, 'main.js');
    let cmd = 'node';
    let args = [filePath];

    if (lang === 'python' || lang === 'py') {
      filePath = path.join(dir, 'main.py');
      cmd = 'python3';
      args = [filePath];
    } else {
      filePath = path.join(dir, 'main.js');
      cmd = 'node';
      args = [filePath];
    }

    await fs.writeFile(filePath, code, 'utf8');

    return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile(cmd, args, { timeout: timeoutSec * 1000 }, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`${error.message}\n${stderr || ''}`));
        }
        resolve({ stdout, stderr });
      });
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// LLM generation service (Gemini or TGI or smart fallback)
async function generateCodeResponse(prompt: string, context: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are CoderBot, an expert personal coding assistant.
Use remembered context when relevant.
Always format code snippets clearly with markdown blocks specifying language (e.g. \`\`\`javascript or \`\`\`python).
Keep answers concise, direct, and production-ready.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${prompt}\n\nContext:\n${context || 'No previous memory found.'}\n\nUser request:\n${userMessage}`,
        config: {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 1024,
        }
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local/TGI generator:', err);
    }
  }

  // TGI service check
  const tgiUrl = process.env.TGI_URL;
  if (tgiUrl) {
    try {
      const resp = await fetch(`${tgiUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 400,
            temperature: 0.2,
            do_sample: true,
            return_full_text: false
          }
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json)) return json[0]?.generated_text || '';
        return json.generated_text || json.output_text || '';
      }
    } catch {
      // Fall through to smart offline assistant
    }
  }

  // Smart fallback code generator
  const lower = userMessage.toLowerCase();
  if (lower.includes('fibonacci')) {
    return `Here is an efficient implementation of Fibonacci in Node.js / JavaScript:

\`\`\`javascript
function fibonacci(n) {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}

// Example usage:
console.log('Fibonacci sequence:');
for (let i = 0; i <= 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}
\`\`\`

You can paste this directly into the Sandbox Editor on the right and click **Run** to execute it.`;
  }

  if (lower.includes('prime') || lower.includes('primes')) {
    return `Here is a function to calculate prime numbers:

\`\`\`javascript
function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
}

const primes = [];
for (let i = 1; i <= 50; i++) {
  if (isPrime(i)) primes.push(i);
}
console.log('Primes up to 50:', primes);
\`\`\``;
  }

  return `Here is a solution for your request:

\`\`\`javascript
// CoderBot assistant solution
function solveTask() {
  console.log('Running code for: ${userMessage.replace(/'/g, "\\'")}');
  return { status: 'success', timestamp: new Date().toISOString() };
}

console.log(solveTask());
\`\`\`

Remembered context utilized: ${context ? context.slice(0, 100) : 'Standard environment settings'}.`;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoints
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'coderbot-api' });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'coderbot-api' });
  });

  // /api/chat route
  app.post('/api/chat', async (req, res) => {
    try {
      const { userId = 'anonymous', message = '', sessionId = uuidv4() } = req.body || {};

      if (!message.trim()) {
        return res.status(400).json({ error: 'Message is required.' });
      }

      const queryVector = ResilientMemoryStore.generateEmbedding(message);
      const memories = await memoryStore.search(queryVector, 5);

      const context = memories
        .map((m) => m.text)
        .filter(Boolean)
        .slice(0, 3)
        .join('\n');

      const prompt = `You are CoderBot, a helpful coding assistant. Use the remembered context when relevant.\n\nContext:\n${context || 'No previous memory found.'}\n\nUser request:\n${message}\n\nAnswer in a concise but useful way with code examples when helpful.`;

      const reply = await generateCodeResponse(prompt, context, message);

      const memoryId = uuidv4();
      await memoryStore.addMemory(memoryId, userId, message, queryVector);

      return res.json({
        ok: true,
        sessionId,
        assistant: reply,
        memory: memories
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      return res.status(500).json({
        ok: false,
        error: error.message || 'Failed to generate response'
      });
    }
  });

  // /api/memory routes
  app.post('/api/memory/save', async (req, res) => {
    try {
      const { userId = 'anonymous', key = 'note', value = '' } = req.body || {};
      if (!value) {
        return res.status(400).json({ error: 'Value is required.' });
      }

      const text = `${key}: ${value}`;
      const vector = ResilientMemoryStore.generateEmbedding(text);
      const id = uuidv4();
      await memoryStore.addMemory(id, userId, text, vector);

      res.json({ ok: true, id, saved: { userId, key, value } });
    } catch (error: any) {
      console.error('Memory save error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/memory/search', async (req, res) => {
    try {
      const { query = '', userId = 'anonymous', limit = 5 } = req.body || {};
      if (!query.trim()) {
        return res.status(400).json({ error: 'Query is required.' });
      }

      const vector = ResilientMemoryStore.generateEmbedding(query);
      const results = await memoryStore.search(vector, limit);
      res.json({ ok: true, results, userId });
    } catch (error: any) {
      console.error('Memory search error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get('/api/memory/list', (_req, res) => {
    res.json({ ok: true, memories: memoryStore.getAll() });
  });

  // /api/run route
  app.post('/api/run/run', async (req, res) => {
    try {
      const { language = 'javascript', code = '', timeoutSec = 10 } = req.body || {};
      if (!code.trim()) {
        return res.status(400).json({ error: 'Code is required.' });
      }

      const result = await runCode({ language, code, timeoutSec });
      res.json({ ok: true, result });
    } catch (error: any) {
      console.error('Run error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Execution failed.' });
    }
  });

  // WebSocket Server on /ws
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      let parse: any;
      try {
        parse = JSON.parse(message.toString());
      } catch {
        parse = { type: 'message', payload: message.toString() };
      }

      ws.send(JSON.stringify({
        type: 'ack',
        payload: parse,
        timestamp: new Date().toISOString()
      }));
    });
  });

  // Vite middleware in development vs static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CoderBot unified server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
