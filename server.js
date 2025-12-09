const express = require('express');
const cors = require('cors');
// On Node 18+, fetch is built-in. If you're on Node 16 or lower, tell me and we'll adjust.

const app = express();
app.use(express.json());

// Allow your Shopify sites (you can add/remove domains later)
app.use(cors());

// Simple test route
app.get('/', (req, res) => {
  res.send('Pajama Finder server is running');
});

// Main AI route
app.post('/pajama-finder', async (req, res) => {
  const question = req.body && req.body.question;
  const kits = req.body && Array.isArray(req.body.kits) ? req.body.kits : null;

  if (!question || !kits) {
    return res.status(400).json({ error: 'Missing question or kits.' });
  }

  // Safety cap – we don't need more than 100 kits in prompt
  const limitedKits = kits.slice(0, 100);

  const prompt = `
You are a shopping assistant for Little Blue House matching family pajamas.

User description:
${question}

You are given a JSON array "kits". Each kit looks like:
{
  "handle": string,
  "title": string,
  "description": string,
  "product_titles": string,
  "url": string
}

Using ONLY this information, choose the best 2 or 3 kits for the user.
Think about:
- family composition (parents / kids) if mentioned
- themes or vibes (Christmas, winter, animals, etc.)
- climate hints (cold winter, warm, etc.)
- any budget hints (cheap, expensive, under 150$ etc.)

Return a JSON object exactly like:
{
  "recommendations": [
    {
      "handle": "kit-handle",
      "title": "Kit Title",
      "reason": "Short one-sentence explanation."
    }
  ]
}

Here is the kits JSON:
${JSON.stringify(limitedKits)}
`;

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'You always return valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4
      })
    });

    if (!aiRes.ok) {
      console.error('OpenAI error', aiRes.status, await aiRes.text());
      throw new Error('AI API error');
    }

    const json = await aiRes.json();
    const content = json.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI JSON', e, content);
      throw new Error('Bad AI JSON');
    }

    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      throw new Error('No recommendations in AI JSON');
    }

    // Success: send the recommendations back
    res.json(parsed);
  } catch (err) {
    console.error('Pajama Finder route error', err);

    // Fallback: first 3 kits with generic message
    const fallbackRecs = limitedKits.slice(0, 3).map(k => ({
      handle: k.handle,
      title: k.title,
      reason: 'Popular choice from our matching family sets.'
    }));

    res.json({ recommendations: fallbackRecs });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Pajama Finder server listening on port', PORT);
});
