import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import chatRouter from './routes/chat.js';
import memoryRouter from './routes/memory.js';
import runRouter from './routes/run.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'coderbot-api' });
});

app.use('/api/chat', chatRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/run', runRouter);

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const parse = (() => {
      try {
        return JSON.parse(message.toString());
      } catch {
        return { type: 'message', payload: message.toString() };
      }
    })();

    ws.send(JSON.stringify({
      type: 'ack',
      payload: parse,
      timestamp: new Date().toISOString()
    }));
  });
});

server.listen(port, () => {
  console.log(`CoderBot API listening on http://localhost:${port}`);
});
