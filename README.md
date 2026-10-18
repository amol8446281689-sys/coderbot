# CoderBot

CoderBot is a full-stack personal coding assistant that lets you:

- chat with an AI coding agent in a browser
- store memories and retrieve them semantically
- execute code in a safe sandbox for testing and debugging
- connect to multiple open-source services for LLM, embeddings, and vector memory
- keep a local workspace and project history

This repository is intentionally built with free and open-source platforms:

- Node.js + Express for the API backend
- React + Vite for the browser UI
- PostgreSQL for structured data
- Redis for session/cache state
- Weaviate for vector memory
- Hugging Face Text Generation Inference (TGI) for open-source LLM inference
- sentence-transformers for embedding generation
- Docker Compose for local orchestration

## Architecture

- API server: `server/`
- Browser UI: `frontend/`
- Embedding microservice: `embeddings/`
- Local orchestration: root `docker-compose.yml`

## Quick start

1. Clone the repo
2. Start support services:

```bash
docker compose up --build -d
```

3. Install backend dependencies:

```bash
cd server
npm install
```

4. Install frontend dependencies:

```bash
cd frontend
npm install
```

5. Start backend and frontend:

```bash
cd server && npm run dev
cd frontend && npm run dev -- --host 0.0.0.0
```

6. Open the frontend in the browser.

## API endpoints

### Chat

```bash
curl -X POST http://localhost:4000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Create a Python script that prints Hello World","userId":"demo-user"}'
```

### Save memory

```bash
curl -X POST http://localhost:4000/api/memory/save \
  -H 'Content-Type: application/json' \
  -d '{"userId":"demo-user","key":"project-state","value":"Working on CoderBot"}'
```

### Run code

```bash
curl -X POST http://localhost:4000/api/run/run \
  -H 'Content-Type: application/json' \
  -d '{"language":"javascript","code":"console.log(\"hello from sandbox\")"}'
```

## Environment variables

See `server/.env.example` for configuration values.

## Security note

This starter is designed for local development and learning. For real-world deployment, add:

- JWT auth / user auth
- per-user quotas and rate limits
- hardened sandboxing using gVisor or Firecracker
- secret management for LLM and database credentials
- isolated network rules for sandbox jobs
- audit logging for all user actions

## License

MIT
