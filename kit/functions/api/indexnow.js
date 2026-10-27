// Cloudflare Pages Function: submits every URL in this site's sitemap to IndexNow (Bing, Yandex, Seznam, Naver, Yep…).
// Port of kit/api/indexnow.js (Vercel). cf-build copies it to functions/api/indexnow.js of every site.
// Trigger: GET /api/indexnow?go=1   (idempotent; safe to call after each deploy)
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "X-Robots-Tag": "noindex", "Cache-Control": "no-store" },
});

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("go") !== "1") return json({ ok: false, hint: "add ?go=1" }, 400);
  try {
    // Static files of this same site, read through the ASSETS binding (no network hop). A 404 counts as missing.
    const read = async path => { const r = await env.ASSETS.fetch(new URL(path, url)); return r.ok ? r.text() : ""; };
    const key = (await read("/indexnow-key.txt")).trim();
    const xml = await read("/sitemap.xml");
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
    if (!key || !urls.length) return json({ ok: false, error: "missing key or sitemap" }, 500);
    const origin = new URL(urls[0]).origin;
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(origin).host, key, keyLocation: `${origin}/indexnow-key.txt`, urlList: urls }),
    });
    return json({ ok: r.status === 200 || r.status === 202, indexnowStatus: r.status, submitted: urls.length, urls });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500);
  }
}
