// Renders the example student's transcript (Classic design) to sites/gradledger/sample-transcript.png
// using the site's own engine.js + docs.js + vendored jsPDF, then pdftoppm (poppler) for the PNG.
// Usage: node src/gradledger/sample.mjs
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "../../tools/node_modules/playwright/index.mjs";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/gradledger");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
const server = createServer((req, res) => {
  const f = join(SITE, decodeURIComponent(req.url.split("?")[0]));
  if (req.url === "/blank") { res.writeHead(200, { "Content-Type": types[".html"] }); return res.end('<!doctype html><meta charset="utf-8"><title>x</title>'); }
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
}).listen(0);
const base = `http://localhost:${server.address().port}`;
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(base + "/blank");
await p.addScriptTag({ url: "/engine.js" });
await p.addScriptTag({ url: "/docs.js" });
const b64 = await p.evaluate(async () => {
  await GLDocs.load();
  const E = GLEngine;
  const st = E.exampleStudent(2027);
  const data = { school: { name: "Maple Grove Homeschool", address: "214 Maple Lane\nSpringfield, OH 45501", phone: "(555) 010-0123", email: "", admin: "Laura Carter" }, settings: E.settingsWithDefaults({}) };
  const pdf = GLDocs.toPDF(GLDocs.buildTranscript(data, st, { date: "2026-10-08" }), { title: "Sample transcript" });
  const u = new Uint8Array(pdf.output("arraybuffer"));
  let s = ""; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
  return btoa(s);
});
await b.close(); server.close();
const tmp = mkdtempSync(join(tmpdir(), "glsample-"));
writeFileSync(join(tmp, "s.pdf"), Buffer.from(b64, "base64"));
execFileSync("pdftoppm", ["-r", "100", "-png", "-singlefile", join(tmp, "s.pdf"), join(SITE, "sample-transcript")]);
console.log("wrote sites/gradledger/sample-transcript.png");
