// 檔案位置: api/chat.js
export default async function handler(req, res) {
  // 1. 限制只能用 POST 方法請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;
  
  // 2. 檢查前端有沒有傳入 prompt
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // 安全檢查：如果環境變數忘記設定，直接報錯提示
    if (!apiKey) {
      return res.status(500).json({ error: '後端環境變數 GEMINI_API_KEY 未設定，請檢查 .env 檔案' });
    }

    // 【已修正】改用自動更新的別名網址，未來推出新 Flash 模型時會自動對接，不用再手動改版號
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    // 3. 發送請求給 Google API
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    // 4. 如果 Google API 回傳錯誤，將錯誤訊息抓出來傳給前端
    if (!response.ok) {
        return res.status(response.status).json({ 
          error: data.error?.message || "Google API 發生錯誤" 
        });
    }

    // 5. 成功，回傳 Google API 的完整資料
    return res.status(200).json(data);

  } catch (error) {
    // 6. 捕捉伺服器本身的系統錯誤
    return res.status(500).json({ error: error.message });
  }
}
