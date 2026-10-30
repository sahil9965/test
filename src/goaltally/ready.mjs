// Ready-made blank data sheets: PDFs (US Letter and A4) and a preview image for each sheet page, for visitors who
// search for "... data sheet pdf / printable" and just want the file. Built with the tool's own sheet layouts
// (sites/goaltally/sheets.js + render.js + the vendored jsPDF), written to sites/goaltally/pdf/<file>-letter.pdf and
// -a4.pdf, and sites/goaltally/img/<file>.png (the Letter version). src/goaltally/pages.mjs imports READY to link them.
// Usage: node src/goaltally/ready.mjs   (re-run after changing a sheet layout or this list; needs Playwright for the images)
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = join(ROOT, "sites/goaltally");
const BLANK_STEPS = Array.from({ length: 10 }, () => "______________________________").join("\n");
// Blank sheets: no sample behavior, criterion or goal, so they work for any student.
const blank = { student: "", title: "", goal: "", criterion: "", definition: "", behaviors: "" };

// page: the landing page slug; label: name of the variant when a page has more than one; alt: the preview image's alt text
export const READY = [
  { page: "abc-data-sheet", file: "abc-data-sheet-checklist", type: "abc", label: "Checklist", docTitle: "ABC Data Sheet (Checklist), Printable",
    alt: "Printable ABC data sheet with tick-box checklists of common antecedents and consequences, a behavior column and a possible function column" },
  { page: "abc-data-sheet", file: "abc-data-sheet-narrative", type: "abc", extra: { layout: "narrative" }, label: "Narrative (write-in)", docTitle: "ABC Data Sheet (Narrative), Printable",
    alt: "Printable narrative ABC data sheet with open columns for date, setting, antecedent, behavior, consequence and possible function" },
  { page: "trial-by-trial-data-sheet", file: "trial-by-trial-data-sheet", type: "trial", docTitle: "Trial-by-Trial (DTT) Data Sheet, Printable",
    alt: "Printable discrete trial (DTT) data sheet with plus and minus boxes for 10 trials across 10 sessions and a percent correct row" },
  { page: "prompt-level-data-sheet", file: "prompt-level-data-sheet", type: "prompt", docTitle: "Prompt Level Data Sheet, Printable",
    alt: "Printable prompt level data sheet with FP, PP, M, G, V and I codes to circle on each trial and a percent independent row" },
  { page: "cold-probe-data-sheet", file: "cold-probe-data-sheet", type: "probe", docTitle: "Cold Probe Data Sheet, Printable",
    alt: "Printable cold probe data sheet with Y and N boxes for each target across 8 probe days, plus date introduced and date mastered columns" },
  { page: "task-analysis-data-sheet", file: "task-analysis-data-sheet-blank", type: "task", extra: { steps: BLANK_STEPS }, label: "Blank (10 steps)", docTitle: "Task Analysis Data Sheet (Blank), Printable",
    alt: "Printable blank task analysis data sheet with 10 step rows, prompt codes for each session and a percent of steps independent row" },
  { page: "task-analysis-data-sheet", file: "task-analysis-handwashing", type: "task", label: "Handwashing example", docTitle: "Task Analysis Data Sheet: Handwashing Example",
    alt: "Sample task analysis data sheet for handwashing with 8 steps from turning on the water to throwing the towel away" },
  { page: "frequency-data-sheet", file: "frequency-data-sheet", type: "frequency", docTitle: "Frequency Data Sheet, Printable",
    alt: "Printable frequency data sheet with tally space, total count, minutes observed and rate per hour for each session" },
  { page: "duration-recording-data-sheet", file: "duration-recording-data-sheet", type: "duration", docTitle: "Duration Recording Data Sheet, Printable",
    alt: "Printable duration recording data sheet with start and stop times for up to 5 episodes, number of episodes, total duration and minutes observed" },
  { page: "partial-interval-recording-data-sheet", file: "partial-interval-recording-data-sheet", type: "partial", docTitle: "Partial Interval Recording Data Sheet, Printable",
    alt: "Printable partial interval recording data sheet with a grid of 10-second intervals and a percent of intervals total" },
  { page: "whole-interval-recording-data-sheet", file: "whole-interval-recording-data-sheet", type: "whole", docTitle: "Whole Interval Recording Data Sheet, Printable",
    alt: "Printable whole interval recording data sheet with a grid of 10-second intervals and a percent of intervals total" },
  { page: "momentary-time-sampling-data-sheet", file: "momentary-time-sampling-data-sheet", type: "mts", docTitle: "Momentary Time Sampling Data Sheet, Printable",
    alt: "Printable momentary time sampling data sheet with a box for each 30-second moment and a percent of moments total" },
];
export const PAPERS = [["letter", "US Letter"], ["a4", "A4"]];

async function main() {
  globalThis.self = globalThis;
  const require = createRequire(import.meta.url);
  globalThis.GT = require(join(SITE, "core.js"));
  const GTS = require(join(SITE, "sheets.js"));
  globalThis.jspdf = require(join(SITE, "vendor/jspdf-4.2.1.umd.min.js"));
  require(join(SITE, "render.js"));
  const GTR = globalThis.GTR;
  mkdirSync(join(SITE, "pdf"), { recursive: true });
  mkdirSync(join(SITE, "img"), { recursive: true });
  const shots = [];
  for (const r of READY) {
    for (const [paper] of PAPERS) {
      const cfg = Object.assign(GTS.defaultSheet(r.type), blank, r.extra || {}, { paper });
      if (r.type === "task" && !(r.extra && r.extra.steps)) Object.assign(cfg, { title: "Handwashing" });
      const sp = GTS.sheetPages(cfg, { sessions: [] });
      const blob = await GTR.sheetsPdf([sp], r.docTitle);
      const bytes = Buffer.from(await blob.arrayBuffer());
      writeFileSync(join(SITE, "pdf", `${r.file}-${paper}.pdf`), bytes);
      console.log(`${r.file}-${paper}.pdf  ${sp.pages.length} page(s)  ${(bytes.length / 1024).toFixed(0)} KB`);
      if (paper === "letter") shots.push({ file: r.file, svg: GTR.svg(sp.pages[0] ? { w: sp.w, h: sp.h, items: sp.pages[0].items } : sp, { px: 1.5, noLinks: true }), w: Math.round(sp.w * 1.5), h: Math.round(sp.h * 1.5) });
    }
  }
  const { chromium } = createRequire(join(ROOT, "tools/package.json"))("playwright"); // tools/ has Playwright installed
  const b = await chromium.launch();
  for (const s of shots) {
    const p = await b.newPage({ viewport: { width: s.w, height: s.h } });
    await p.setContent(`<body style="margin:0;background:#fff">${s.svg}</body>`);
    await p.screenshot({ path: join(SITE, "img", `${s.file}.png`), clip: { x: 0, y: 0, width: s.w, height: s.h } });
    await p.close();
  }
  await b.close();
  console.log(`${shots.length} preview images`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1); });
