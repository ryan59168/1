export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { text, voiceName = "Kore" } = req.body || {};

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "後端環境變數 GEMINI_API_KEY 未設定，請檢查 Vercel 環境變數。",
    });
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

  const payload = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (error) {
      return res.status(502).json({
        error: `Google API 回傳非 JSON：${rawText.trim().slice(0, 120) || "空白回應"}`,
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Google API 發生錯誤",
      });
    }

    const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!part || !part.data) {
      return res.status(502).json({
        error: "Google API 未回傳音訊資料，可能是這個 Gemini 帳號/專案還沒開放 TTS 模型。",
      });
    }

    return res.status(200).json({
      audioData: part.data,
      mimeType: part.mimeType || "audio/L16;rate=24000",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "伺服器發生錯誤",
    });
  }
}
