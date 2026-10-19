// Add cookie-free Umami analytics to every page of every live site (and the hub), between
// <!--UMAMI:START--> and <!--UMAMI:END--> right after <meta charset>. Settings live in tools/umami.json.
// - One Umami website for the whole network: each site sends data-tag=<slug>, and page paths are
//   prefixed with the slug (/bellbook/today) so the Pages report tells the tools apart.
// - The tools' existing window.va("event", …) calls are forwarded to umami.track, so events show up
//   without touching app code. Vercel Analytics keeps working as before.
// - The URL hash (where share links keep their data) is never sent, data-domains stops localhost and
//   preview URLs from being counted, and ?notrack=1 (localStorage "rooh-notrack") turns Umami off too.
// Usage: node tools/umami.mjs   (finalize.mjs runs it). With an empty websiteId it removes the block.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(root, "tools/umami.json"), "utf8"));
const id = (cfg.websiteId || "").trim();
if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new Error(`umami: websiteId "${id}" is not a UUID`);
const sites = JSON.parse(readFileSync(join(root, "sites.json"), "utf8")).filter(s => s.live !== false)
  .map(s => ({ slug: s.slug, host: new URL(s.url).host }))
  .concat([{ slug: "hub", host: "tools.roohsites.com" }]);

const shim = slug => `(function(){var inner,replay=false,q=[];` +
  `function fwd(n,d){try{if(window.umami&&umami.track)umami.track(n,d);else q.push([n,d])}catch(e){}}` +
  `function w(){var a=arguments;if(!replay&&a[0]==="event"&&a[1]&&a[1].name)fwd(a[1].name,a[1].data);if(inner)return inner.apply(this,a);(window.vaq=window.vaq||[]).push(a)}` +
  `try{Object.defineProperty(window,"va",{configurable:true,get:function(){return w},set:function(f){if(f!==w){inner=f;replay=true;setTimeout(function(){replay=false},0)}}})}catch(e){}` +
  `window.roohUmamiSend=function(t,p){try{if(localStorage.getItem("rooh-notrack"))return null}catch(e){}` +
  `if(p&&typeof p.url==="string"){var u=p.url.split("#")[0];p.url="/${slug}"+(u==="/"?"":u)}return p};` +
  `window.roohUmamiLoaded=function(){while(q.length){var e=q.shift();try{umami.track(e[0],e[1])}catch(x){}}}})();`;
const block = s => `<!--UMAMI:START--><script>${shim(s.slug)}</script>` +
  `<script defer src="${cfg.script}" data-website-id="${id}" data-domains="${s.host}" data-tag="${s.slug}" ` +
  `data-exclude-hash="true" data-before-send="roohUmamiSend" onload="roohUmamiLoaded()"></script><!--UMAMI:END-->`;

const RE = /\n?<!--UMAMI:START-->[\s\S]*?<!--UMAMI:END-->/;
let n = 0, missing = [];
for (const s of sites) {
  const dir = join(root, "sites", s.slug);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter(f => f.endsWith(".html"))) {
    const file = join(dir, f);
    const html = readFileSync(file, "utf8");
    let next = html.replace(RE, "");
    if (id) {
      const m = next.match(/<meta charset="utf-8">/i);
      if (!m) { missing.push(`${s.slug}/${f}`); continue; }
      next = next.replace(m[0], `${m[0]}\n${block(s)}`);
    }
    if (next !== html) { writeFileSync(file, next); n++; }
  }
}
console.log(id ? `umami added to ${n} pages${missing.length ? `; no <meta charset> in: ${missing.join(", ")}` : ""}`
  : `umami not configured (tools/umami.json websiteId is empty); removed from ${n} pages`);
