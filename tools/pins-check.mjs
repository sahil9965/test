// Live check of the Pinterest schedule Cowork posts from: fetches https://tools.roohsites.com/pins/schedule.json and tests every post.
// - schedule: days 1..N with no gaps, the fields Cowork reads, unique titles under 100 characters, descriptions under 500, every board described;
// - image: 200, image/png, 1000 x 1500 (read from the PNG header), and Access-Control-Allow-Origin: *;
// - link: 200 after redirects, on a roohsites.com host, ending with the Pinterest UTM tags.
// Usage: node tools/pins-check.mjs [expected post count]   (the "pins-check" workflow runs it after every pins change; exits 1 on any failure)
const URL_ = "https://tools.roohsites.com/pins/schedule.json";
const UTM = "?utm_source=pinterest&utm_medium=social&utm_campaign=pins";
const FIELDS = ["day", "title", "description", "board", "image", "link", "alt", "keywords"];
const want = Number(process.argv[2] || 0);
const fails = [];
const fail = (where, why) => fails.push(`${where}: ${why}`);

// After a push, wait (up to 8 minutes) until the deploy has put the committed schedule live, so the check tests the new version.
import { readFileSync, existsSync } from "node:fs";
const LOCAL = "sites/hub/pins/schedule.json";
const local = existsSync(LOCAL) ? readFileSync(LOCAL, "utf8") : null;
let s = null;
for (let t = 0; t < 24; t++) {
  const res = await fetch(`${URL_}?t=${Date.now()}`, { cache: "no-store" });
  if (res.ok) {
    s = await res.json();
    if (!local || JSON.stringify(s) === JSON.stringify(JSON.parse(local))) break;
  }
  if (t === 23) { console.log(local ? "FAIL the live schedule.json never matched the committed one (deploy not finished or failed)" : `FAIL schedule.json: HTTP ${res.status}`); process.exit(1); }
  console.log("live schedule.json is not the committed version yet; waiting 20 s");
  await new Promise(r => setTimeout(r, 20000));
}
const posts = s.posts || [];
console.log(`schedule.json: ${posts.length} posts, ${Object.keys(s.boards || {}).length} boards, updated ${s.updated}`);
if (want && posts.length !== want) fail("schedule", `${posts.length} posts, expected ${want}`);
posts.forEach((p, i) => {
  if (p.day !== i + 1) fail(`post ${i + 1}`, `day is ${p.day}`);
  const missing = FIELDS.filter(f => !p[f]);
  if (missing.length || Object.keys(p).length !== FIELDS.length) fail(`day ${p.day}`, `fields ${Object.keys(p).join(",")}`);
  if (String(p.title).length >= 100) fail(`day ${p.day}`, "title 100+ characters");
  if (String(p.description).length >= 500) fail(`day ${p.day}`, "description 500+ characters");
  if (!(s.boards || {})[p.board]) fail(`day ${p.day}`, `board "${p.board}" has no description in "boards"`);
});
const titles = posts.map(p => p.title);
titles.forEach((t, i) => { if (titles.indexOf(t) !== i) fail(`day ${i + 1}`, `duplicate title "${t}"`); });

for (const p of posts) {
  try {
    const r = await fetch(p.image, { cache: "no-store" });
    const buf = Buffer.from(await r.arrayBuffer());
    const w = buf.length > 24 ? buf.readUInt32BE(16) : 0, h = buf.length > 24 ? buf.readUInt32BE(20) : 0;
    const acao = r.headers.get("access-control-allow-origin");
    const bad = [r.status !== 200 && `HTTP ${r.status}`, !/image\/png/.test(r.headers.get("content-type") || "") && `type ${r.headers.get("content-type")}`,
      (w !== 1000 || h !== 1500) && `${w}x${h}`, acao !== "*" && `Access-Control-Allow-Origin ${acao}`].filter(Boolean);
    if (bad.length) fail(`day ${p.day} image`, bad.join(", "));
  } catch (e) { fail(`day ${p.day} image`, e.message); }
  try {
    if (!p.link.endsWith(UTM)) fail(`day ${p.day} link`, "missing the Pinterest UTM tags");
    const r = await fetch(p.link, { redirect: "follow", cache: "no-store" });
    if (r.status !== 200) fail(`day ${p.day} link`, `HTTP ${r.status}`);
    if (!/(^|\.)roohsites\.com$/.test(new URL(r.url).hostname)) fail(`day ${p.day} link`, `ends on ${r.url}`);
  } catch (e) { fail(`day ${p.day} link`, e.message); }
  console.log(`checked day ${p.day}: ${p.title}`);
}
console.log(fails.length ? `\n${fails.length} problem(s):\n` + fails.map(f => `FAIL ${f}`).join("\n") : `\nALL OK: ${posts.length} posts, every image and link passed`);
process.exitCode = fails.length ? 1 : 0;
