from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
import os

MODEL_NAME = os.environ.get('MODEL_NAME', 'all-MiniLM-L6-v2')
model = SentenceTransformer(MODEL_NAME)
app = Flask(__name__)

@app.route('/embed', methods=['POST'])
def embed():
    payload = request.get_json(force=True)
    texts = payload.get('texts') or [payload.get('text')]
    if not texts or not texts[0]:
        return jsonify({'error': 'No text provided'}), 400

    vectors = model.encode(texts, show_progress_bar=False).tolist()
    return jsonify({ 'vectors': vectors })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({ 'ok': True, 'model': MODEL_NAME })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
