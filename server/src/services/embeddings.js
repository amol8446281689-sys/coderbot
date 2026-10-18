const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

export async function embedTexts(texts) {
  const url = process.env.EMBEDDING_URL || 'http://localhost:5000';
  const response = await fetch(`${url}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Embedding service failed: ${text}`);
  }

  const json = await response.json();
  return json.vectors || [];
}
