const { GoogleGenAI, Modality, Type } = require('@google/genai');

// Vercel serverless function to proxy requests to Google GenAI.
// Expects POST body: { model, contents, config }

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end('Method Not Allowed');
    return;
  }

  let body = req.body;
  if (!body) {
    // Try to read raw body
    try {
      body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      if (typeof body === 'string' && body.length) body = JSON.parse(body);
    } catch (err) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
  }

  const apiKey = process.env.GENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GENAI_API_KEY environment variable not set on the server.' });
    return;
  }

  const { model, contents, config } = body;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model, contents, config });
    // Return the full response from the GenAI client to the frontend caller.
    res.status(200).json(response);
  } catch (err) {
    console.error('GenAI proxy error:', err);
    res.status(500).json({ error: String(err) });
  }
};
