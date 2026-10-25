// Submits every URL in this site's sitemap to IndexNow (Bing, Yandex, Seznam, Naver, Yep…).
// Bing's index also feeds ChatGPT search and Copilot answers.
// Trigger: GET /api/indexnow?go=1   (idempotent; safe to call after each deploy)
export default async function handler(req, res) {
  if (req.query.go !== "1") return res.status(400).json({ ok: false, hint: "add ?go=1" });
  const self = `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
  try {
    const key = (await (await fetch(`${self}/indexnow-key.txt`)).text()).trim();
    const xml = await (await fetch(`${self}/sitemap.xml`)).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
    if (!key || !urls.length) return res.status(500).json({ ok: false, error: "missing key or sitemap" });
    const origin = new URL(urls[0]).origin;
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(origin).host, key, keyLocation: `${origin}/indexnow-key.txt`, urlList: urls }),
    });
    res.status(200).json({ ok: r.status === 200 || r.status === 202, indexnowStatus: r.status, submitted: urls.length, urls });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
}
