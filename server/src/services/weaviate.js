const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const WEAVIATE_URL = process.env.WEAVIATE_URL || 'http://localhost:8080';
const CLASS_NAME = 'Memory';

export async function ensureSchema() {
  try {
    await fetch(`${WEAVIATE_URL}/v1/schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class: CLASS_NAME,
        vectorizer: 'none',
        properties: [
          { name: 'userId', dataType: ['text'] },
          { name: 'text', dataType: ['text'] },
          { name: 'createdAt', dataType: ['date'] }
        ]
      })
    });
  } catch {
    // ignore schema creation errors; we can retry or check existing class
  }
}

export async function addMemory(id, userId, text, vector) {
  await ensureSchema();

  const response = await fetch(`${WEAVIATE_URL}/v1/objects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      class: CLASS_NAME,
      id,
      properties: {
        userId,
        text,
        createdAt: new Date().toISOString()
      },
      vector
    })
  });

  if (!response.ok) {
    throw new Error(`Weaviate add failed: ${await response.text()}`);
  }

  return response.json();
}

export async function semanticSearch(queryVector, limit = 5) {
  await ensureSchema();

  const response = await fetch(`${WEAVIATE_URL}/v1/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{
        Get {
          ${CLASS_NAME}(nearVector: {vector: ${JSON.stringify(queryVector)}, certainty: 0.0}, limit: ${limit}) {
            text
            userId
            _additional { distance }
          }
        }
      }`
    })
  });

  if (!response.ok) {
    throw new Error(`Weaviate search failed: ${await response.text()}`);
  }

  const json = await response.json();
  return json.data?.Get?.[CLASS_NAME] || [];
}
