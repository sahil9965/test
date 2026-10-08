// Verifies a Gumroad license key server-side so the product ID stays out of the browser.
// Requires env var GUMROAD_PRODUCT_ID (Gumroad product → Content → License key → product_id).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const key = String((req.body && req.body.key) || "").trim();
  const productId = process.env.GUMROAD_PRODUCT_ID;
  if (!key || !productId) return res.status(400).json({ ok: false, error: "missing key or config" });

  const r = await fetch("https://api.gumroad.com/v2/licenses/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ product_id: productId, license_key: key, increment_uses_count: "false" }),
  });
  const data = await r.json().catch(() => ({}));
  const p = data.purchase || {};
  const ok = data.success === true && !p.refunded && !p.chargebacked && !p.disputed;
  res.status(ok ? 200 : 403).json({ ok });
}
