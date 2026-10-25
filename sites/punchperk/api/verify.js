// Verifies a Gumroad license key server-side. Works for one-time and membership products.
// Env: GUMROAD_PRODUCT_IDS = comma-separated Gumroad product IDs (e.g. monthly pass, lifetime pass).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const key = String((req.body && req.body.key) || "").trim().slice(0, 200);
  const ids = String(process.env.GUMROAD_PRODUCT_IDS || process.env.GUMROAD_PRODUCT_ID || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  if (!key || !ids.length) return res.status(400).json({ ok: false, error: "missing key or config" });

  for (const id of ids) {
    try {
      const r = await fetch("https://api.gumroad.com/v2/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ product_id: id, license_key: key, increment_uses_count: "false" }),
      });
      const data = await r.json().catch(() => ({}));
      const p = data.purchase || {};
      const valid = data.success === true && !p.refunded && !p.chargebacked && !p.disputed &&
        !p.subscription_ended_at && !p.subscription_failed_at;
      if (valid) return res.status(200).json({ ok: true });
    } catch {
      return res.status(502).json({ ok: false, error: "upstream" });
    }
  }
  res.status(403).json({ ok: false });
}
