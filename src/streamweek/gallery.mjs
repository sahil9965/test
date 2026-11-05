// Template gallery images for the StreamWeek home page: the tool's own renderer (sites/streamweek/core.js + render.js) draws
// each theme with sample data, and the result is saved as a small WebP in sites/streamweek/img/. src/streamweek/pages.mjs lists
// the same files in GALLERY. Usage: node src/streamweek/gallery.mjs   (re-run after changing a theme or the sample week; needs Playwright)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = join(ROOT, "sites/streamweek");

// file: name under /img; preset: one of core.js PRESETS (sets theme, labels and viewer zones); size: a core.js SIZES key
export const GALLERY = [
  { file: "stream-schedule-template-neon", preset: "discord", size: "landscape", home: "Europe/London" },
  { file: "stream-schedule-template-pastel-vtuber", preset: "vtuber", size: "landscape", home: "America/New_York" },
  { file: "stream-schedule-template-clean", preset: "youtube", size: "landscape", home: "America/Chicago" },
  { file: "stream-schedule-template-retro", preset: "twitch", size: "landscape", home: "America/Chicago" },
  { file: "stream-schedule-template-minimal", preset: "timezones", size: "landscape", home: "Europe/London" },
  { file: "stream-schedule-template-instagram-story", preset: "discord", size: "story", home: "Europe/London" },
  { file: "stream-schedule-template-portrait", preset: "vtuber", size: "portrait", home: "America/New_York" },
  { file: "stream-schedule-template-panel", preset: "twitch", size: "panel", home: "America/Chicago" },
];
const WEEK = "2026-11-09";   // a Monday, so the days read Mon to Sun

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(join(SITE, "img"), { recursive: true });
  const types = { ".js": "text/javascript", ".ttf": "font/ttf", ".html": "text/html", ".css": "text/css" };
  const server = createServer((req, res) => {
    const f = join(SITE, req.url.split("?")[0] === "/" ? "index.html" : req.url.split("?")[0]);
    if (!existsSync(f)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": types[extname(f)] || "application/octet-stream" }).end(readFileSync(f));
  }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = createRequire(join(ROOT, "tools/"))("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(base + "/about.html");
  await page.addScriptTag({ url: base + "/core.js" });
  await page.addScriptTag({ url: base + "/render.js" });
  for (const g of GALLERY) {
    const data = await page.evaluate(async ({ g, WEEK }) => {
      const C = window.SWCore, R = window.SWRender;
      await R.loadFonts();
      let s = C.normalize({ weekStart: WEEK, homeTz: g.home, size: g.size }, { today: WEEK });
      s = C.applyPreset(s, g.preset);
      const c = document.createElement("canvas");
      R.draw(c, s, null, g.size);
      // Gallery thumbnails: 720 px wide at most, which keeps each file small.
      const k = Math.min(1, 720 / c.width), t = document.createElement("canvas");
      t.width = Math.round(c.width * k); t.height = Math.round(c.height * k);
      const tg = t.getContext("2d"); tg.imageSmoothingQuality = "high"; tg.drawImage(c, 0, 0, t.width, t.height);
      return { url: t.toDataURL("image/webp", 0.86), w: t.width, h: t.height };
    }, { g, WEEK });
    writeFileSync(join(SITE, "img", g.file + ".webp"), Buffer.from(data.url.split(",")[1], "base64"));
    console.log(g.file, data.w + "x" + data.h, Math.round(data.url.length * 0.75 / 1024) + " KB");
  }
  await browser.close(); server.close();
}
