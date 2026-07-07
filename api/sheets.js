const DEFAULT_SHEET_ID = "16y8_QTo0QrQe5El9ylVvps94mhNi7zRuErIrxRkwoQc";

async function readJson(url) {
  const response = await fetch(url);
  const rawText = await response.text();

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (error) {
    throw new Error(`Google 回傳非 JSON：${rawText.trim().slice(0, 120) || "空白回應"}`);
  }

  if (!response.ok) {
    throw new Error(data.error?.message || `Google 回應錯誤 ${response.status}`);
  }

  return data;
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function fetchSheetTitlesFromPublicHtml(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/edit?usp=sharing`;
  const response = await fetch(url);
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`公開試算表頁面讀取失敗 ${response.status}`);
  }

  const titles = [...html.matchAll(/docs-sheet-tab-caption">([^<]+)</g)]
    .map(match => decodeHtmlEntities(match[1]).trim())
    .filter(Boolean);

  return [...new Set(titles)];
}

async function fetchSheetTitles(sheetId) {
  try {
    const titles = await fetchSheetTitlesFromPublicHtml(sheetId);
    if (titles.length) return titles;
  } catch (error) {
    console.warn("Public sheet HTML detection failed:", error);
  }

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY || process.env.SHEETS_API_KEY || "";
  const metadataUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`);
  metadataUrl.searchParams.set("fields", "sheets.properties.title");
  if (apiKey) metadataUrl.searchParams.set("key", apiKey);

  try {
    const data = await readJson(metadataUrl.toString());
    const titles = (data.sheets || [])
      .map(sheet => sheet.properties && sheet.properties.title)
      .filter(Boolean);
    if (titles.length) return titles;
  } catch (error) {
    console.warn("Sheets API metadata failed:", error);
  }

  const legacyUrl =
    `https://spreadsheets.google.com/feeds/worksheets/${encodeURIComponent(sheetId)}/public/basic?alt=json`;
  const data = await readJson(legacyUrl);
  return (data.feed?.entry || [])
    .map(entry => entry.title && entry.title.$t)
    .filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const sheetId = typeof req.query.id === "string" ? req.query.id : DEFAULT_SHEET_ID;

  try {
    const titles = await fetchSheetTitles(sheetId);
    if (!titles.length) {
      return res.status(404).json({ error: "找不到工作表頁籤，請確認試算表已公開。", titles: [] });
    }

    return res.status(200).json({ titles });
  } catch (error) {
    return res.status(502).json({
      error: error.message || "無法讀取工作表頁籤，請確認試算表已公開。",
      titles: [],
    });
  }
}
