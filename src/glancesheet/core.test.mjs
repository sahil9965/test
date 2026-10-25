// Unit tests for the GlanceSheet core: accommodations list, one-page fit, matrix pagination, privacy of initials-only
// output, sheet variants, and the JSON backup (including hostile input).   Usage: node --test src/glancesheet/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/glancesheet");
const require = createRequire(import.meta.url);
const G = require(join(SITE, "core.js"));
const { jsPDF } = require(join(SITE, "vendor/jspdf-4.2.1.umd.min.js"));
const TODAY = "2026-10-25";

// jsPDF writes standard-font text uncompressed, so the output string can be searched for what was drawn.
const pdfText = doc => doc.output();
const lines = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("\n");
const entries = list => list.map((s, i) => ({ s, i }));
function fullStudent(id, extra) {
  return G.normalizeStudent({
    id, name: "Jordan Rivera", grade: "5", year: "2026-27", caseManager: "Ms. Okafor", contact: "ext. 114", plan: "iep",
    meeting: "2026-03-10", annual: "2027-03-09", reeval: "2028-03-09", eligibility: "Specific learning disability",
    strengths: lines(4, i => `Strength number ${i + 1} about what the student enjoys and does well`), helps: lines(4, i => `Helpful strategy ${i + 1} that works in the classroom`),
    watch: lines(3, i => `Early warning sign ${i + 1} to watch for in class`), mods: lines(2, i => `Modified expectation ${i + 1} for the unit`),
    accom: G.ACCOMMODATIONS.slice(0, 14).map(a => a.id), custom: ["Custom accommodation one"],
    goals: Array.from({ length: 3 }, (_, i) => ({ area: G.GOAL_AREAS[i], text: `Goal text ${i + 1}: works toward a skill with a short measurable target in class.` })),
    services: Array.from({ length: 3 }, (_, i) => ({ name: `Service name ${i + 1}`, min: 30 + i, per: "week", setting: "spec", role: "Special education teacher" })),
    related: { speech: true, ot: true, pt: true, counseling: true }, bip: true, health: "Carries an inhaler; follow the school health plan.",
    contacts: Array.from({ length: 3 }, (_, i) => ({ role: `Role ${i + 1}`, who: `Staff ${i + 1} room ${100 + i}` })),
    show: { eligibility: true }, ...extra,
  }, id);
}

test("accommodations list is well formed", () => {
  const A = G.ACCOMMODATIONS;
  assert.ok(A.length >= 56 && A.length <= 66, "about 60 items, got " + A.length);
  assert.equal(new Set(A.map(a => a.id)).size, A.length, "unique ids");
  assert.equal(new Set(A.map(a => a.text.toLowerCase())).size, A.length, "unique phrases");
  const cats = new Set(G.CATEGORIES.map(c => c.id));
  assert.deepEqual(G.CATEGORIES.map(c => c.name), ["Presentation", "Response", "Setting", "Timing & scheduling", "Organization & behavior", "Testing"]);
  for (const a of A) {
    assert.ok(cats.has(a.cat), `${a.id} has a valid category`);
    assert.ok(a.text.length >= 8 && a.text.length <= 70, `${a.id} short plain phrase`);
    assert.ok(a.short && a.short.length <= 26, `${a.id} has a short label`);
  }
  for (const c of cats) assert.ok(A.some(a => a.cat === c), `category ${c} is used`);
  for (const phrase of ["Extended time (1.5x) on tests and assignments", "Preferential seating", "Directions read aloud and repeated", "Use of calculator", "Breaks as needed", "Chunked assignments", "Copy of class notes", "Testing in a small group / separate setting"])
    assert.ok(A.some(a => a.text === phrase), "has " + phrase);
});

test("a full student fits on one page or reports exactly which sections overflow, never a second page", () => {
  const doc = G.measureDoc(jsPDF);
  const s = fullStudent(1);
  const p = G.planSheet(doc, s, "iep", { today: TODAY });
  const names = new Set(["Strengths and interests", "What helps", "Watch for", "Accommodations", "Modifications", "Goals", "Services", "Behavior plan", "Health and safety", "Key contacts"]);
  assert.ok(p.fs >= G.FS_MIN && p.fs <= G.FS_MAX, "font size inside the range: " + p.fs);
  assert.ok(p.fits && p.overflow.length === 0, "a realistic full student fits");
  if (!p.fits) { assert.ok(p.overflow.length > 0); for (const o of p.overflow) assert.ok(names.has(o.name), "known section " + o.name); assert.equal(p.fs, G.FS_MIN, "uses the floor before giving up"); }
  const r = G.sheetPdf(jsPDF, entries([s]), { today: TODAY });
  assert.equal(r.doc.getNumberOfPages(), 1);

  // A maximal student: every section as full as the editor allows.
  const maxed = fullStudent(4, { strengths: lines(12, i => "Strength " + i + " " + "word ".repeat(8)), helps: lines(12, i => "Help " + i + " " + "word ".repeat(8)), watch: lines(12, i => "Watch " + i + " " + "word ".repeat(8)),
    accom: G.ACCOMMODATIONS.slice(0, 40).map(a => a.id), custom: Array.from({ length: 20 }, (_, i) => "Custom accommodation number " + i), mods: lines(10, i => "Mod " + i + " " + "word ".repeat(8)),
    goals: Array.from({ length: 12 }, (_, i) => ({ area: G.GOAL_AREAS[i % 10], text: "goal words ".repeat(30) + i })), services: Array.from({ length: 12 }, (_, i) => ({ name: "Service " + i, min: 30, per: "week", setting: "gen", role: "Teacher" })),
    contacts: Array.from({ length: 10 }, (_, i) => ({ role: "Role " + i, who: "Person " + i })) });
  const mp = G.planSheet(doc, maxed, "iep", { today: TODAY });
  assert.ok(mp.fs >= G.FS_MIN);
  assert.equal(mp.fits, false);
  assert.ok(mp.overflow.length >= 3 && mp.overflow.every(o => names.has(o.name) && o.removed > 0), "reports which sections were shortened");
  assert.equal(mp.fs, G.FS_MIN);
  assert.equal(G.sheetPdf(jsPDF, entries([maxed]), { today: TODAY }).doc.getNumberOfPages(), 1);
  // An extreme student: every list at its limit. Must report overflow, name the sections, stay on one page.
  const huge = fullStudent(2, {
    strengths: lines(30, i => `Long strength ${i} ` + "word ".repeat(20)), helps: lines(30, i => `Long help ${i} ` + "word ".repeat(20)), watch: lines(30, i => `Long watch ${i} ` + "word ".repeat(20)),
    accom: G.ACCOMMODATIONS.map(a => a.id), mods: lines(30, i => `Long mod ${i} ` + "word ".repeat(20)),
    goals: Array.from({ length: 12 }, (_, i) => ({ area: "Reading", text: "goal ".repeat(70) + i })),
  });
  const hp = G.planSheet(doc, huge, "iep", { today: TODAY });
  assert.equal(hp.fits, false);
  assert.equal(hp.fs, G.FS_MIN);
  assert.ok(hp.overflow.length >= 2);
  for (const o of hp.overflow) assert.ok(names.has(o.name));
  const hr = G.sheetPdf(jsPDF, entries([huge]), { today: TODAY });
  assert.equal(hr.doc.getNumberOfPages(), 1, "never a second page");
  assert.match(pdfText(hr.doc), /More in the full plan|Not shown \(no room\)/);
  const batch = G.sheetPdf(jsPDF, entries([s, huge, s]), { today: TODAY });
  assert.equal(batch.doc.getNumberOfPages(), 3, "one page per student");

  // A modest student does not shrink at all.
  const small = G.planSheet(doc, G.normalizeStudent({ id: 3, strengths: "Kind", accom: ["pres-aloud"] }, 3), "iep", { today: TODAY });
  assert.ok(small.fits && !small.shrunk && small.fs === G.FS_MAX);
});

test("initials-only output never contains the full name; turning it off shows the name", () => {
  const s = fullStudent(1, { name: "Jordan Rivera", initials: "" });
  const on = pdfText(G.sheetPdf(jsPDF, entries([s]), { initialsOnly: true, today: TODAY }).doc);
  assert.ok(!/Jordan|Rivera/.test(on), "no name anywhere in the PDF, including metadata");
  assert.match(on, /\(JR\)/, "initials are printed");
  const off = pdfText(G.sheetPdf(jsPDF, entries([s]), { initialsOnly: false, today: TODAY }).doc);
  assert.match(off, /Jordan Rivera/);
  // matrix and batch too, and no name in a blank-initials student (falls back to Student N)
  const m = pdfText(G.matrixPdf(jsPDF, entries([s, fullStudent(2, { name: "Maria Lopez Garcia" })]), { initialsOnly: true, className: "Period 3" }).doc);
  assert.ok(!/Jordan|Rivera|Maria|Garcia/.test(m));
  assert.equal(G.labelOf(G.normalizeStudent({ id: 1 }, 1), true, 4), "Student 5");
  assert.equal(G.initialsOf("maria lopez garcia"), "MG");
  assert.equal(G.initialsOf("Cher"), "C");
});

test("every sheet carries the confidential line, the summary footer and the linked credit", () => {
  const t = pdfText(G.sheetPdf(jsPDF, entries([fullStudent(1)]), { today: TODAY }).doc);
  assert.ok(t.includes("Confidential: share only with staff who work with this student"));
  assert.ok(t.includes("This is a summary, not the IEP. Follow the full IEP."));
  assert.ok(t.includes("Made with GlanceSheet"));
  assert.ok(t.includes("https://iepglance.roohsites.com/?utm_source=glancesheet&utm_medium=watermark&utm_campaign=referral"));
  const t5 = pdfText(G.sheetPdf(jsPDF, entries([fullStudent(1, { plan: "504" })]), { today: TODAY }).doc);
  assert.ok(t5.includes("This is a summary, not the 504 plan. Follow the full 504 plan."));
});

test("sub and para version omits dates, goals and services; 504 variant omits goals and services", () => {
  const s = fullStudent(1);
  const full = pdfText(G.sheetPdf(jsPDF, entries([s]), { mode: "std", initialsOnly: true, today: TODAY }).doc);
  assert.ok(full.includes("Goal text 1") && full.includes("Service name 1") && full.includes("Annual review due") && full.includes("IEP at a Glance"));
  const sub = pdfText(G.sheetPdf(jsPDF, entries([s]), { mode: "sub", today: TODAY }).doc);
  for (const bad of ["Goal text", "Service name", "Annual review", "Re-evaluation", "IEP meeting", "Mar 10, 2026", "Specific learning", "Modified expectation", "inhaler", "Related services", "Case manager", "Behavior plan"]) assert.ok(!sub.includes(bad), "sub sheet omits " + bad);
  for (const good of ["Student at a Glance", "Strength number 1", "Helpful strategy 1", "Early warning sign 1", "Directions read aloud and repeated", "Role 1"]) assert.ok(sub.includes(good), "sub sheet has " + good);
  const p504 = pdfText(G.sheetPdf(jsPDF, entries([s]), { mode: "504", today: TODAY }).doc);
  assert.ok(p504.includes("504 Plan at a Glance"));
  for (const bad of ["Goal text", "Service name", "Related services"]) assert.ok(!p504.includes(bad), "504 sheet omits " + bad);
  for (const good of ["Strength number 1", "Directions read aloud and repeated", "Annual review due"]) assert.ok(p504.includes(good));
  // a 504-plan student gets the 504 sheet under Standard
  const std504 = pdfText(G.sheetPdf(jsPDF, entries([fullStudent(2, { plan: "504" })]), { mode: "std", today: TODAY }).doc);
  assert.ok(std504.includes("504 Plan at a Glance") && !std504.includes("Goal text"));
  assert.equal(G.kindOf(G.resolveVariant(s, "std")), "single");
  assert.equal(G.kindOf(G.resolveVariant(s, "504")), "504");
  assert.equal(G.kindOf(G.resolveVariant(s, "sub")), "sub");
});

test("hidden sections and the countdown stay off the printout", () => {
  const s = fullStudent(1, { show: { goals: false, dates: false, eligibility: false, accom: false, health: false } });
  const t = pdfText(G.sheetPdf(jsPDF, entries([s]), { today: TODAY }).doc);
  for (const bad of ["Goal text", "Annual review", "Specific learning", "Directions read aloud", "inhaler", "days)"]) assert.ok(!t.includes(bad), "omits " + bad);
  const dated = fullStudent(2, { annual: "2026-11-24" });
  assert.ok(!pdfText(G.sheetPdf(jsPDF, entries([dated]), { today: TODAY }).doc).includes("due in 30 days"));
  assert.ok(pdfText(G.sheetPdf(jsPDF, entries([fullStudent(3, { annual: "2026-11-24", printCountdown: true })]), { today: TODAY }).doc).includes("due in 30 days"));
  assert.equal(G.dueText("2026-11-24", TODAY), "due in 30 days");
  assert.equal(G.dueText("2026-10-26", TODAY), "due in 1 day");
  assert.equal(G.dueText(TODAY, TODAY), "due today");
  assert.equal(G.dueText("2026-10-20", TODAY), "overdue by 5 days");
  assert.equal(G.dueText("nonsense", TODAY), "");
  assert.equal(G.schoolYear("2026-10-25"), "2026-27");
  assert.equal(G.schoolYear("2027-03-01"), "2026-27");
});

test("matrix: 30 students x 25 accommodations paginates with repeated headers and a complete key", () => {
  const ids = G.ACCOMMODATIONS.slice(0, 25).map(a => a.id);
  const students = Array.from({ length: 30 }, (_, i) => G.normalizeStudent({ id: i + 1, name: `Student${String.fromCharCode(65 + (i % 26))} Name${i}`, initials: `S${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) || ""}`, accom: i === 0 ? ids : ids.filter((_, k) => (k + i) % 3 === 0) }, i + 1));
  const model = G.buildMatrix(entries(students), { initialsOnly: true });
  assert.equal(model.cols.length, 25);
  assert.equal(model.rows.length, 30);
  assert.deepEqual(model.cols.map(c => c.n), Array.from({ length: 25 }, (_, i) => i + 1));
  const r = G.matrixPdf(jsPDF, entries(students), { initialsOnly: true, className: "Period 3 Math" });
  const pages = r.layout.pages;
  assert.ok(pages.length > 1, "splits onto several pages: " + pages.length);
  assert.equal(r.doc.getNumberOfPages(), pages.length);
  // every column chunk shows every student exactly once, and each page has its own header range
  const chunks = [...new Set(pages.map(p => p.c0 + "-" + p.c1))];
  for (const ch of chunks) {
    const rows = pages.filter(p => p.c0 + "-" + p.c1 === ch && !p.keyOnly).flatMap(p => Array.from({ length: p.r1 - p.r0 }, (_, i) => p.r0 + i));
    assert.deepEqual(rows, Array.from({ length: 30 }, (_, i) => i), "every student once per chunk");
  }
  for (const p of pages) assert.ok(p.c1 > p.c0 && p.cw >= 20, "page has columns and a readable width");
  // the key covers every column exactly once
  const keyed = pages.filter(p => p.key).flatMap(p => Array.from({ length: p.c1 - p.c0 }, (_, i) => p.c0 + i + 1));
  assert.deepEqual(keyed.sort((a, b) => a - b), Array.from({ length: 25 }, (_, i) => i + 1));
  const t = pdfText(r.doc);
  for (const c of model.cols) assert.ok(t.includes(c.text.split(" ")[0]), "key mentions " + c.text);
  assert.ok(t.includes("Class accommodations matrix") && t.includes("Period 3 Math") && t.includes("Page 1 of " + pages.length));
  assert.ok(t.includes("Confidential: share only with staff who work with this student") && t.includes("Made with GlanceSheet"));
  assert.ok(!/StudentA Name0/.test(t), "initials only");
  // headers repeat: each page prints the column numbers of its own range
  assert.equal((t.match(/\(Student\) Tj/g) || []).length, pages.filter(p => !p.keyOnly).length, "student header on every table page");
  assert.throws(() => G.matrixPdf(jsPDF, entries([G.normalizeStudent({ id: 1 }, 1)]), {}), /accommodation/);
  // many columns: 30 students x every accommodation + customs splits columns across pages, headers repeat, key complete
  const wide = students.map((s, i) => G.normalizeStudent({ ...s, accom: G.ACCOMMODATIONS.map(a => a.id), custom: i % 2 ? ["Custom thing " + i] : [] }, s.id));
  const wr = G.matrixPdf(jsPDF, entries(wide), { initialsOnly: true });
  const wchunks = [...new Set(wr.layout.pages.map(p => p.c0 + "-" + p.c1))];
  assert.ok(wchunks.length >= 3, "columns split across pages: " + wchunks.length);
  assert.equal(wr.doc.getNumberOfPages(), wr.layout.pages.length);
  const wkey = wr.layout.pages.filter(p => p.key).flatMap(p => Array.from({ length: p.c1 - p.c0 }, (_, i) => p.c0 + i + 1));
  assert.deepEqual(wkey.sort((a, b) => a - b), Array.from({ length: wr.model.cols.length }, (_, i) => i + 1));
  assert.equal((pdfText(wr.doc).match(/\(Student\) Tj/g) || []).length, wr.layout.pages.filter(p => !p.keyOnly).length);
  // duplicate initials stay distinct; custom accommodations become columns
  const dup = G.buildMatrix(entries([G.normalizeStudent({ id: 1, initials: "AB", custom: ["Fidget tool in class"] }, 1), G.normalizeStudent({ id: 2, initials: "AB", custom: ["fidget tool in class"] }, 2)]), { initialsOnly: true });
  assert.deepEqual(dup.rows.map(x => x.label), ["AB (1)", "AB (2)"]);
  assert.equal(dup.cols.length, 1);
});

test("backup round-trips and survives hostile or malformed input", () => {
  const ex = G.exampleStudents();
  const state = G.normalizeState({ settings: { initialsOnly: false, paper: "a4", className: "Period 2" }, students: [...ex, fullStudent(10, { show: { goals: false } })], sel: 2 });
  const json = G.makeBackup(state, TODAY);
  const back = G.parseBackup(json);
  assert.ok(back.ok);
  assert.deepEqual(back.state, state);
  assert.deepEqual(JSON.parse(json).app, "glancesheet");
  assert.ok(!/photo|image|data:/i.test(json), "no photos");

  for (const bad of ["", "   ", "not json", "[]", "null", "42", '"x"', "{}", '{"app":"other","students":[]}', '{"app":"glancesheet"}', '{"app":"glancesheet","students":"no"}'])
    assert.equal(G.parseBackup(bad).ok, false, "rejects " + bad);
  assert.equal(G.parseBackup(undefined).ok, false);
  assert.equal(G.parseBackup("x".repeat(7 * 1024 * 1024)).ok, false);

  const hostile = JSON.stringify({
    app: "glancesheet", v: 99, __proto__: { polluted: true }, constructor: { prototype: { polluted2: true } },
    settings: { initialsOnly: "no", paper: { a: 1 }, className: "<img src=x onerror=alert(1)>".repeat(50) },
    students: [
      { id: -5, name: "<script>alert(1)</script>".repeat(100), initials: 12345, plan: "root", meeting: "2026-13-45", annual: "2026-02-30", reeval: "2026-02-28",
        accom: ["nope", "pres-aloud", "pres-aloud", 7, null, {}, "__proto__"], custom: ["a", "a", "", null, 5, "x".repeat(500)], strengths: { a: 1 }, helps: 5, goals: [null, 7, { area: "Hax", text: "y".repeat(5000) }, { area: "Math" }],
        services: [{ name: "s", min: "abc" }, { min: 999999, per: "year", setting: "moon" }, "str"], related: { speech: "yes", ot: true, __proto__: { x: 1 } }, show: { goals: "no", accom: true, __proto__: { y: 1 } },
        contacts: "none", bip: "true", pick: 0 },
      null, 7, "str", [], { id: 2.5 }, { id: 3, name: "ok" }, { id: 3, name: "dup id" },
      ...Array.from({ length: 5000 }, (_, i) => ({ id: i + 100, name: "n" + i })),
    ],
  });
  const h = G.parseBackup(hostile);
  assert.ok(h.ok);
  assert.equal(({}).polluted, undefined);
  assert.equal(({}).polluted2, undefined);
  assert.equal(({}).x, undefined);
  assert.equal(h.state.settings.initialsOnly, true, "non-false values keep the safe default");
  assert.equal(h.state.settings.paper, "letter");
  assert.ok(h.state.settings.className.length <= 60);
  assert.ok(h.state.students.length <= G.LIMITS.students);
  assert.equal(new Set(h.state.students.map(s => s.id)).size, h.state.students.length, "ids stay unique");
  const s0 = h.state.students[0];
  assert.ok(Number.isInteger(s0.id) && s0.id > 0);
  assert.equal(s0.plan, "iep");
  assert.equal(s0.meeting, "");
  assert.equal(s0.annual, "");
  assert.equal(s0.reeval, "2026-02-28");
  assert.deepEqual(s0.accom, ["pres-aloud"]);
  assert.deepEqual(s0.custom.slice(0, 2), ["a", "5"]);
  assert.ok(s0.custom.every(c => c.length <= 100));
  assert.equal(s0.strengths, "");
  assert.ok(s0.goals.every(g => G.GOAL_AREAS.includes(g.area) && g.text.length <= 400));
  assert.ok(s0.services.every(v => ["week", "month"].includes(v.per) && ["gen", "spec", "rel"].includes(v.setting) && (v.min === "" || (v.min > 0 && v.min <= 3000))));
  assert.equal(s0.related.speech, false);
  assert.equal(s0.show.goals, false);
  assert.equal(s0.show.eligibility, false);
  assert.equal(s0.bip, false);
  assert.deepEqual(s0.contacts, []);
  assert.ok(s0.name.length <= 80 && s0.initials === "12345");
  // a hostile import still makes a valid one-page PDF
  const r = G.sheetPdf(jsPDF, entries(h.state.students.slice(0, 3)), { today: TODAY });
  assert.equal(r.doc.getNumberOfPages(), 3);
  // text outside the PDF font never breaks layout
  assert.equal(G.pdfSafe("Zoë 学生 😀 → ok"), "Zoë ?? -> ok");
});
