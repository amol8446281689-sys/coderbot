import { useState, useEffect } from 'react';

const starterCode = `// Fibonacci function example in JavaScript
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

console.log('Fibonacci sequence (0 to 10):');
for (let i = 0; i <= 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}
`;

const starterPythonCode = `# Fibonacci function example in Python
def fibonacci(n):
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

print("Python Fibonacci sequence (0 to 10):")
for i in range(11):
    print(f"F({i}) = {fibonacci(i)}")
`;

interface MemoryItem {
  text: string;
  userId: string;
  _additional?: { distance: number };
}

export default function App() {
  const [message, setMessage] = useState('Create a Node.js function that calculates Fibonacci numbers.');
  const [result, setResult] = useState('');
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript');
  const [code, setCode] = useState(starterCode);
  const [runOutput, setRunOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [memoryStatus, setMemoryStatus] = useState('');

  // When language switches, switch default starter code if untouched
  function handleLanguageChange(newLang: 'javascript' | 'python') {
    setLanguage(newLang);
    if (code === starterCode && newLang === 'python') {
      setCode(starterPythonCode);
    } else if (code === starterPythonCode && newLang === 'javascript') {
      setCode(starterCode);
    }
  }

  // Extract code from AI response to insert into Sandbox
  function extractCode(text: string): string | null {
    const match = text.match(/```(?:javascript|js|python|py)?\n([\s\S]*?)```/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  }

  const detectedCode = extractCode(result);

  function copyCodeToEditor() {
    if (detectedCode) {
      setCode(detectedCode);
      if (result.includes('```python') || result.includes('def ')) {
        setLanguage('python');
      } else {
        setLanguage('javascript');
      }
    }
  }

  async function askBot() {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userId: 'demo-user' })
      });
      const json = await response.json();
      if (json.ok) {
        setResult(json.assistant || 'No response generated.');
        if (Array.isArray(json.memory)) {
          setMemories(json.memory);
        }
      } else {
        setResult('Error: ' + (json.error || 'Failed to get response'));
      }
    } catch (error: any) {
      setResult('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function runCode() {
    setRunning(true);
    setRunOutput('Running sandbox execution...');
    try {
      const response = await fetch('/api/run/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code, timeoutSec: 10 })
      });
      const json = await response.json();
      if (json.ok) {
        const out = json.result.stdout || json.result.stderr || 'No output produced.';
        setRunOutput(out);
      } else {
        setRunOutput('Error: ' + (json.error || 'Execution failed'));
      }
    } catch (error: any) {
      setRunOutput('Error: ' + error.message);
    } finally {
      setRunning(false);
    }
  }

  async function saveMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!newValue.trim()) return;
    setMemoryStatus('Saving memory note...');
    try {
      const response = await fetch('/api/memory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          key: newKey.trim() || 'note',
          value: newValue.trim()
        })
      });
      const json = await response.json();
      if (json.ok) {
        setMemoryStatus('Memory saved successfully!');
        setNewKey('');
        setNewValue('');
        setTimeout(() => setMemoryStatus(''), 3000);
      } else {
        setMemoryStatus('Failed: ' + json.error);
      }
    } catch (err: any) {
      setMemoryStatus('Error: ' + err.message);
    }
  }

  return (
    <div className="app-shell">
      {/* Sidebar: Chat & Prompt */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1>CoderBot</h1>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', background: '#1e293b', padding: '4px 8px', borderRadius: '6px' }}>
            AI Coding Assistant
          </span>
        </div>

        <div className="panel">
          <label htmlFor="prompt-input">Prompt</label>
          <textarea
            id="prompt-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Ask CoderBot to generate code, explain logic, or debug..."
          />
          <button onClick={askBot} disabled={loading || !message.trim()}>
            {loading ? 'Thinking...' : 'Ask Bot'}
          </button>
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ margin: 0 }}>AI response</label>
            {detectedCode && (
              <button
                type="button"
                onClick={copyCodeToEditor}
                style={{
                  margin: 0,
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  width: 'auto'
                }}
              >
                Copy to Sandbox
              </button>
            )}
          </div>
          <pre style={{ flex: 1, minHeight: '180px' }}>
            {result || 'Your answer will appear here.'}
          </pre>

          {/* Context & Vector Memory Toggle */}
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
            <button
              type="button"
              onClick={() => setShowMemory(!showMemory)}
              style={{
                margin: 0,
                width: '100%',
                background: '#1e293b',
                color: '#94a3b8',
                fontSize: '0.82rem',
                padding: '6px 10px'
              }}
            >
              {showMemory ? 'Hide Vector Memory & Context' : 'View Vector Memory & Context'}
            </button>

            {showMemory && (
              <div style={{ marginTop: '10px', fontSize: '0.85rem' }}>
                <p style={{ margin: '0 0 6px 0', color: '#cbd5e1', fontWeight: 600 }}>
                  Active Context Memories ({memories.length}):
                </p>
                {memories.length === 0 ? (
                  <p style={{ color: '#64748b', margin: '4px 0' }}>No previous memories retrieved yet.</p>
                ) : (
                  <ul style={{ paddingLeft: '18px', margin: '4px 0', color: '#94a3b8' }}>
                    {memories.map((m, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        {m.text}
                      </li>
                    ))}
                  </ul>
                )}

                <form onSubmit={saveMemory} style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Add memory preference:</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Topic (e.g. style)"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      style={{
                        flex: '1',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--muted)',
                        color: 'var(--text)',
                        fontSize: '0.8rem'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Memory text..."
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      style={{
                        flex: '2',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--muted)',
                        color: 'var(--text)',
                        fontSize: '0.8rem'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      margin: '4px 0 0 0',
                      padding: '6px',
                      fontSize: '0.8rem',
                      background: '#334155'
                    }}
                  >
                    Save Memory
                  </button>
                  {memoryStatus && (
                    <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{memoryStatus}</span>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Panel: Sandbox & Output */}
      <main className="main-panel">
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ margin: 0 }}>Sandbox editor</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Language:</span>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as 'javascript' | 'python')}
                style={{
                  background: 'var(--muted)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="python">Python 3</option>
              </select>
            </div>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={16}
            style={{ flex: 1, minHeight: '300px' }}
            spellCheck={false}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={runCode} disabled={running} style={{ flex: 1 }}>
              {running ? 'Running...' : `Run (${language === 'javascript' ? 'Node.js' : 'Python 3'})`}
            </button>
            <button
              type="button"
              onClick={() => setCode(language === 'javascript' ? starterCode : starterPythonCode)}
              style={{
                width: 'auto',
                background: '#334155',
                color: '#e2e8f0',
                padding: '10px 16px'
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ margin: 0 }}>Output</label>
            {runOutput && (
              <button
                type="button"
                onClick={() => setRunOutput('')}
                style={{
                  margin: 0,
                  width: 'auto',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  background: '#334155'
                }}
              >
                Clear
              </button>
            )}
          </div>
          <pre style={{ minHeight: '120px' }}>
            {runOutput || 'Press Run to test the code.'}
          </pre>
        </div>
      </main>
    </div>
  );
}
