// Render a 1200x630 social preview image (og.png) for a site.
// Usage: node tools/og.mjs sites/<slug> "<Name>" "<Headline>" <accentHex> ["<emoji or short glyph>"]
import { chromium } from "playwright";
import { join } from "node:path";

const [dir, name, headline, accent = "#2f5bea", glyph = ""] = process.argv.slice(2);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#fbfaf7;color:#1b1b1f;display:flex}
.bar{width:28px;background:${accent}}
.main{flex:1;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
.name{font-size:34px;font-weight:750;color:${accent};display:flex;align-items:center;gap:14px}
.glyph{font-size:44px}
h1{font-size:68px;line-height:1.08;letter-spacing:-.02em;margin:0;max-width:1000px}
.pills{display:flex;gap:14px}.pills span{font-size:26px;background:#efece5;border-radius:999px;padding:10px 22px;color:#3b3b44}
</style></head><body><div class="bar"></div><div class="main">
<div class="name">${glyph ? `<span class="glyph">${esc(glyph)}</span>` : ""}${esc(name)}</div>
<h1>${esc(headline)}</h1>
<div class="pills"><span>Free</span><span>No signup</span><span>Private — runs in your browser</span></div>
</div></body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html);
await p.screenshot({ path: join(dir, "og.png") });
await b.close();
console.log(`wrote ${join(dir, "og.png")}`);
