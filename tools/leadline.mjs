// Add a small, dismissible "Need a website?" card that appears right after a file is made on the business tools
// listed in tools/leadline.json, between <!--LEADLINE:START--> and <!--LEADLINE:END--> before </body>.
// - It listens for the "rooh:event" DOM event that the Umami shim (tools/umami.mjs) dispatches for every analytics
//   event, so no tool code changes. Only event names are used, never their data.
// - Pages with lang="en-IN" link to the India offer, others to the international one. Shown once per page view,
//   and not again in that browser tab after it's closed. A click is counted as the "lead_click" event.
// Usage: node tools/leadline.mjs   (finalize.mjs runs it). Sites not in leadline.json get the block removed.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(root, "tools/leadline.json"), "utf8"));
const sites = JSON.parse(readFileSync(join(root, "sites.json"), "utf8")).filter(s => s.live !== false);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const CSS = `.rl-card{position:fixed;right:16px;bottom:16px;z-index:9999;max-width:360px;box-sizing:border-box;padding:14px 40px 14px 16px;` +
  `border:1px solid #d9d4cc;border-radius:12px;background:#fff;color:#1b1b1f;box-shadow:0 8px 28px rgba(0,0,0,.16);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}` +
  `.rl-card[hidden]{display:none}.rl-card p{margin:0 0 6px}.rl-card .rl-done{font-weight:700}` +
  `.rl-card a{color:inherit;font-weight:700;text-decoration:underline;text-underline-offset:2px}` +
  `.rl-card button{position:absolute;top:6px;right:6px;width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:inherit;font-size:20px;line-height:1;cursor:pointer}` +
  `.rl-card button:focus-visible,.rl-card a:focus-visible{outline:2px solid currentColor;outline-offset:2px}` +
  `@media (max-width:520px){.rl-card{left:12px;right:12px;bottom:12px;max-width:none}}` +
  `@media (prefers-color-scheme:dark){.rl-card{background:#1f1d1b;color:#f2efe9;border-color:#3a3632}}` +
  `@media print{.rl-card{display:none!important}}`;

const block = (slug, c) => {
  const opts = { events: c.events, intl: cfg.intl, india: cfg.india, slug };
  return `<!--LEADLINE:START--><style>${CSS}</style>` +
    `<div class="rl-card" role="status" aria-live="polite" hidden><p class="rl-done">✓ ${esc(c.done)}</p>` +
    `<p>${esc(c.ask)} Rooh Sites, the studio behind these free tools, builds them <span class="rl-price"></span>.</p>` +
    `<p><a class="rl-link" href="#">See examples and prices →</a></p><button type="button" aria-label="Close">×</button></div>` +
    `<script>(function(o){var card=document.querySelector(".rl-card");if(!card)return;` +
    `var india=(document.documentElement.lang||"").toLowerCase()==="en-in",offer=india?o.india:o.intl,shown=false;` +
    `card.querySelector(".rl-price").textContent=offer.price;` +
    `var a=card.querySelector(".rl-link");a.href=offer.href+"?utm_source="+o.slug+"&utm_medium=tool&utm_campaign=after-download";` +
    `function closed(){try{return sessionStorage.getItem("rooh-lead-x")==="1"}catch(e){return false}}` +
    `document.addEventListener("rooh:event",function(e){var n=e.detail&&e.detail.name;if(shown||closed()||o.events.indexOf(n)<0)return;` +
    `shown=true;setTimeout(function(){card.hidden=false},1200)});` +
    `card.querySelector("button").addEventListener("click",function(){card.hidden=true;try{sessionStorage.setItem("rooh-lead-x","1")}catch(e){}});` +
    `a.addEventListener("click",function(){try{window.va&&window.va("event",{name:"lead_click",data:{tool:o.slug,offer:india?"india":"intl"}})}catch(e){}});` +
    `})(${JSON.stringify(opts)});</script><!--LEADLINE:END-->`;
};

const RE = /\n?<!--LEADLINE:START-->[\s\S]*?<!--LEADLINE:END-->/;
let n = 0, missing = [];
for (const s of sites) {
  const dir = join(root, "sites", s.slug);
  if (!existsSync(dir)) continue;
  const c = cfg.sites[s.slug];
  for (const f of readdirSync(dir).filter(f => f.endsWith(".html"))) {
    const file = join(dir, f);
    const html = readFileSync(file, "utf8");
    let next = html.replace(RE, "");
    if (c && f !== "about.html" && f !== "privacy.html") {
      const i = next.lastIndexOf("</body>");
      if (i < 0) { missing.push(`${s.slug}/${f}`); continue; }
      next = next.slice(0, i) + block(s.slug, c) + "\n" + next.slice(i);
    }
    if (next !== html) { writeFileSync(file, next); n++; }
  }
}
for (const slug of Object.keys(cfg.sites)) if (!sites.some(s => s.slug === slug)) throw new Error(`leadline: unknown site ${slug}`);
console.log(`lead line updated in ${n} pages${missing.length ? `; no </body> in: ${missing.join(", ")}` : ""}`);
