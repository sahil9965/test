// Add cookie-free Umami analytics to every page of every live site (and the hub), between
// <!--UMAMI:START--> and <!--UMAMI:END--> right after <meta charset>. Settings live in tools/umami.json.
// - One Umami website for the whole network: each site sends data-tag=<slug>, and page paths are
//   prefixed with the slug (/bellbook/today) so the Pages report tells the tools apart.
// - The tools' existing window.va("event", …) calls are forwarded to umami.track, so events show up
//   without touching app code (the old Vercel Analytics script is gone; only the window.va stub remains).
// - The URL hash (where share links keep their data) is never sent, data-domains stops localhost and
//   preview URLs from being counted, and ?notrack=1 turns Umami off on every roohsites.com tool at once.
// - An "engaged" event fires once per page view on the first click, tap or keypress, to tell people from bots.
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

const shim = slug => `(function(){var inner,replay=false,q=[],engaged=false;` +
  // Owner opt-out shared by every *.roohsites.com site: ?notrack=1 sets a cookie on the parent domain (only in
  // the owner's browser), ?notrack=0 clears it, and this site's localStorage is kept in step with the cookie so
  // the opt-out in config.js (which runs later) sees it.
  `try{var nt=new URLSearchParams(location.search).get("notrack"),dom=location.hostname.replace(/^[^.]+\\./,"");` +
  `if(nt==="1"){document.cookie="rooh_notrack=1;domain="+dom+";path=/;max-age=315360000;SameSite=Lax;Secure";localStorage.setItem("rooh-notrack","1")}` +
  `else if(nt==="0"){document.cookie="rooh_notrack=;domain="+dom+";path=/;max-age=0;SameSite=Lax;Secure";localStorage.removeItem("rooh-notrack")}` +
  `else if(/(^|; )rooh_notrack=1/.test(document.cookie))localStorage.setItem("rooh-notrack","1");else localStorage.removeItem("rooh-notrack")}catch(e){}` +
  `function off(){try{return !!localStorage.getItem("rooh-notrack")}catch(e){return false}}` +
  // Every event is also announced on the page as "rooh:event" (name only), so add-ons like tools/leadline.mjs can react.
  `function fwd(n,d){try{document.dispatchEvent(new CustomEvent("rooh:event",{detail:{name:n}}))}catch(e){}` +
  `try{if(window.umami&&umami.track)umami.track(n,d);else q.push([n,d])}catch(e){}}` +
  `function w(){var a=arguments;if(!replay&&a[0]==="event"&&a[1]&&a[1].name)fwd(a[1].name,a[1].data);if(inner)return inner.apply(this,a);(window.vaq=window.vaq||[]).push(a)}` +
  `try{Object.defineProperty(window,"va",{configurable:true,get:function(){return w},set:function(f){if(f!==w){inner=f;replay=true;setTimeout(function(){replay=false},0)}}})}catch(e){}` +
  // One "engaged" event per page view on the first real click, tap or keypress: bots rarely interact, people do.
  `function eng(){if(engaged)return;engaged=true;fwd("engaged")}` +
  `["pointerdown","keydown"].forEach(function(t){addEventListener(t,eng,{capture:true,passive:true})});` +
  // Prefix the path with the tool's slug and drop the hash. Umami sends a full URL, so edit its pathname.
  `window.roohUmamiSend=function(t,p){if(off())return null;` +
  `if(p&&typeof p.url==="string"){try{var u=new URL(p.url,location.href),path=u.pathname==="/"?"":u.pathname;` +
  `u.pathname="/${slug}"+path;u.hash="";p.url=/^https?:/.test(p.url)?u.toString():u.pathname+u.search}catch(e){}}return p};` +
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
