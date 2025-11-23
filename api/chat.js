export default async function handler(req, res) {
  // 1. 限制只允許 POST 請求，這樣比較安全
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. 從前端取得使用者輸入的 prompt
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    // 3. 這裡讀取你的環境變數 (保險箱裡的鑰匙)
    const apiKey = process.env.GEMINI_API_KEY;
    
    // 檢查有沒有設定鑰匙
    if (!apiKey) {
        throw new Error("伺服器端未設定 API Key");
    }

    // 4. 定義 Google Gemini 的網址 (使用 gemini-2.5-flash 模型，速度快且便宜/免費)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // 5. 幫你去向 Google 請求資料
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();

    // 6. 檢查 Google 有沒有回傳錯誤
    if (!response.ok) {
        throw new Error(data.error?.message || "Google API Error");
    }

    // 7. 把結果回傳給你的網頁
    res.status(200).json(data);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: '伺服器處理發生錯誤', details: error.message });
  }

}
