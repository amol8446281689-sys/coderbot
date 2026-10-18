import { useState } from 'react';

const starterCode = `console.log('hello from CoderBot');`;

export default function App() {
  const [message, setMessage] = useState('Create a Node.js function that calculates Fibonacci numbers.');
  const [result, setResult] = useState('');
  const [code, setCode] = useState(starterCode);
  const [runOutput, setRunOutput] = useState('');
  const [loading, setLoading] = useState(false);

  async function askBot() {
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userId: 'demo-user' })
      });
      const json = await response.json();
      setResult(json.assistant || 'No response');
    } catch (error) {
      setResult('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function runCode() {
    setLoading(true);
    try {
      const response = await fetch('/api/run/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'javascript', code })
      });
      const json = await response.json();
      if (json.ok) {
        setRunOutput(json.result.stdout || json.result.stderr || 'No output');
      } else {
        setRunOutput('Error: ' + json.error);
      }
    } catch (error) {
      setRunOutput('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>CoderBot</h1>
        <div className="panel">
          <label>Prompt</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
          <button onClick={askBot} disabled={loading}>{loading ? 'Thinking...' : 'Ask Bot'}</button>
        </div>

        <div className="panel">
          <label>AI response</label>
          <pre>{result || 'Your answer will appear here.'}</pre>
        </div>
      </aside>

      <main className="main-panel">
        <div className="panel">
          <label>Sandbox editor</label>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={18} />
          <button onClick={runCode} disabled={loading}>{loading ? 'Running...' : 'Run'}</button>
        </div>

        <div className="panel">
          <label>Output</label>
          <pre>{runOutput || 'Press Run to test the code.'}</pre>
        </div>
      </main>
    </div>
  );
}
