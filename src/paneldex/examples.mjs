// Filled-in example images for the PanelDex landing pages: the tool's own PDF code (sites/paneldex/core.js + vendored jsPDF) draws the
// built-in example panels, and page 1 of each PDF is saved as a PNG in sites/paneldex/img/ for src/paneldex/pages.mjs.
// Usage: node src/paneldex/examples.mjs   (re-run after changing a PDF layout or an example panel; needs pdftoppm)
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/paneldex");
const require = createRequire(import.meta.url);
const C = require(join(SITE, "core.js"));
const { jsPDF } = require(join(SITE, "vendor/jspdf-4.2.1.umd.min.js"));

// file: PNG name in /img; make: draws the PDF; dpi: resolution of the PNG; crop: [x, y, width, height] in pixels, to drop empty paper
export const EXAMPLES = [
  { file: "3-phase-panel-schedule-example", dpi: 80, make: () => C.schedulePdf(jsPDF, C.example("p3"), { paper: "letter", date: "2026-11-05" }) },
  { file: "breaker-box-labels-example", dpi: 70, crop: [0, 0, 595, 290], make: () => C.labelsPdf(jsPDF, C.example("home"), { paper: "letter" }) },
  { file: "panel-schedule-example", dpi: 80, make: () => C.schedulePdf(jsPDF, C.example("home"), { paper: "letter", date: "2026-11-05" }) },
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(join(SITE, "img"), { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), "paneldex-"));
  for (const e of EXAMPLES) {
    const pdf = join(tmp, e.file + ".pdf");
    writeFileSync(pdf, Buffer.from(e.make().output("arraybuffer")));
    const crop = e.crop ? ["-x", e.crop[0], "-y", e.crop[1], "-W", e.crop[2], "-H", e.crop[3]].map(String) : [];
    execFileSync("pdftoppm", ["-png", "-r", String(e.dpi), ...crop, "-f", "1", "-l", "1", "-singlefile", pdf, join(SITE, "img", e.file)]);
    console.log("img/" + e.file + ".png");
  }
  rmSync(tmp, { recursive: true });
}
