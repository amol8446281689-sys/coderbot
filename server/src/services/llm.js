const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

export async function generate(prompt, options = {}) {
  const url = process.env.TGI_URL || 'http://localhost:8081';
  const response = await fetch(`${url}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: options.max_tokens || 256,
        temperature: options.temperature || 0.2,
        do_sample: true,
        return_full_text: false
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM service failed: ${text}`);
  }

  const json = await response.json();
  if (Array.isArray(json)) {
    return json[0]?.generated_text || '';
  }

  return json.generated_text || json.output_text || '';
}
