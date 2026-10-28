# CoderBot

CoderBot is an interactive AI coding assistant built with React 19, Vite, TypeScript, Tailwind CSS, and Express.

## Features

- **Interactive AI Coding Assistant**: Chat with an intelligent coding assistant capable of generating, explaining, and debugging code.
- **Sandboxed Code Execution**: Run JavaScript (Node.js) and Python 3 code in real time with captured stdout and stderr.
- **One-Click Code Import**: Extract code snippets from AI responses directly into the sandbox editor.
- **Vector Memory & Context Retrieval**: Remembers preferences and conversation context using semantic vector similarity search.
- **Resilient Multi-Provider Backend**: Supports server-side Gemini API with fallback to TGI/Weaviate or built-in vector search.
- **Real-Time WebSocket Support**: Real-time message acknowledgements over `/ws`.

## Project Structure

```
├── server.ts         # Full-stack Express server with Vite middleware & APIs
├── src/
│   ├── App.tsx       # Main React app shell with Chat, Sandbox, and Memory
│   ├── main.tsx      # React entry point
│   └── index.css     # Tailwind CSS styles and theme variables
├── index.html        # HTML entry point
├── vite.config.ts    # Vite bundler configuration
└── package.json      # Dependencies and execution scripts
```

## Running the App

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

- `POST /api/chat`: Chat with the coding assistant with vector memory context.
- `POST /api/run/run`: Run code snippets in a safe Node.js or Python 3 sandbox.
- `POST /api/memory/save`: Store key-value notes and preferences into vector memory.
- `POST /api/memory/search`: Semantic search through stored memories.
- `GET /health` & `GET /api/health`: Health status.
- `ws://0.0.0.0:3000/ws`: Real-time WebSocket connection.

## License

MIT
