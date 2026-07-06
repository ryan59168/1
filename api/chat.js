export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    prompt,
    systemPrompt = '',
    isJson = false,
    model = 'gemini-flash-latest'
  } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: '後端環境變數 GEMINI_API_KEY 未設定，請檢查 Vercel 環境變數'
    });
  }

  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  if (systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  if (isJson) {
    payload.generationConfig = {
      responseMimeType: 'application/json'
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Google API 發生錯誤'
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({
      ...data,
      text
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
