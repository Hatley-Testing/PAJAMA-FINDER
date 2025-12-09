// server.js
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Pajama Finder server is running');
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/pajama-finder', async (req, res) => {
  try {
    const { question, kits } = req.body;
    console.log('[/pajama-finder] incoming request', {
      question,
      kitsCount: Array.isArray(kits) ? kits.length : 0
    });

    if (!question || !Array.isArray(kits) || kits.length === 0) {
      console.warn('[/pajama-finder] missing question or kits');
      return res.status(400).json({ recommendations: [] });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[/pajama-finder] OPENAI_API_KEY is missing');
      return res.status(500).json({ recommendations: [] });
    }

    // Build prompt
    const systemPrompt = `
You are a Shopify "Family Pajama Finder" assistant.
The user gives you a description of their family and preferences.
You get a list of available family pajama kits ("kits").
Pick 1–4 kits that best match their needs.

IMPORTANT:
- Only recommend kits whose "handle" exists in the given kits list.
- For each kit, return: handle, title, and a short reason.
- Output MUST be valid JSON with this shape:

{
  "recommendations": [
    { "handle": "...", "title": "...", "reason": "..." }
  ]
}
    `.trim();

    const kitsForModel = kits.map(k => ({
      handle: k.handle,
      title: k.title,
      description: k.description || '',
      product_titles: k.product_titles || ''
    }));

    const userPrompt =
      `Customer description:\n${question}\n\n` +
      `Available kits (JSON):\n` +
      JSON.stringify(kitsForModel, null, 2) +
      `\n\nReturn ONLY JSON in the specified format.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 400
    });

    const content = completion.choices[0].message.content;
    console.log('[/pajama-finder] raw model content:', content);

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('[/pajama-finder] JSON parse error:', e);
      return res.status(200).json({ recommendations: [] });
    }

    let recs = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : [];

    // Filter out any handles not in the kits list
    const handlesSet = new Set(kits.map(k => k.handle));
    recs = recs.filter(r => r && handlesSet.has(r.handle));

    console.log('[/pajama-finder] returning', recs.length, 'recommendations');
    res.json({ recommendations: recs });
  } catch (err) {
    console.error('[/pajama-finder] Error:', err);
    res.status(500).json({ recommendations: [] });
  }
});

app.listen(port, () => {
  console.log(`Pajama Finder server listening on port ${port}`);
});
