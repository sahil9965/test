// Unit tests for the PriceBoard core (settings, menu parsing, page layout, SVG and PDF).
// Usage: node --test src/priceboard/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/priceboard");
const require = createRequire(import.meta.url);
const C = require(join(SITE, "core.js"));
const PDFLib = require(join(SITE, "vendor/pdf-lib.min.js"));
const QR = require(join(SITE, "vendor/qrcode-generator-1.4.4.js"));
const qrd = url => { const q = QR(0, "M"); q.addData(url, "Byte"); q.make(); return C.qrData(q); };
const EPS = 0.01;

// Text boxes from a layout: [x0, x1] by [y0, y1] in points (descender to cap height).
function boxes(lay) {
  return lay.prims.filter(p => p.t === "text" && p.text).map(p => {
    const w = C.textW(p.text, p.font, p.size), x0 = p.align === "center" ? p.x - w / 2 : p.align === "right" ? p.x - w : p.x;
    return { t: p.text, x0, x1: x0 + w, y0: p.y - 0.21 * p.size, y1: p.y + 0.72 * p.size };
  });
}
function assertClean(lay, label) {
  const b = boxes(lay), inset = (40 * Math.min(lay.W, lay.H) / 612) * 0.5;
  for (const r of b) {
    assert.ok(r.x0 >= inset - EPS && r.x1 <= lay.W - inset + EPS, `${label}: "${r.t}" inside the page horizontally`);
    assert.ok(r.y0 >= inset - EPS && r.y1 <= lay.H - inset + EPS, `${label}: "${r.t}" inside the page vertically`);
  }
  for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
    const p = b[i], q = b[j];
    const hit = p.x0 < q.x1 - EPS && q.x0 < p.x1 - EPS && p.y0 < q.y1 - EPS && q.y0 < p.y1 - EPS;
    assert.ok(!hit, `${label}: "${p.t}" overlaps "${q.t}"`);
  }
}

test("formats: page sizes in points, landscape swaps print sizes only", () => {
  assert.deepEqual([C.FORMATS.letter.w, C.FORMATS.letter.h], [612, 792]);
  assert.deepEqual([C.FORMATS["5x7"].w, C.FORMATS["5x7"].h], [360, 504]);
  assert.deepEqual([C.FORMATS.tabloid.w, C.FORMATS.tabloid.h], [792, 1224]);
  assert.ok(Math.abs(C.FORMATS.a4.w - (210 * 72) / 25.4) < 0.01 && Math.abs(C.FORMATS.a4.h - (297 * 72) / 25.4) < 0.01);
  const land = C.pageSize(C.normalize({ format: "letter", orient: "landscape" }).s);
  assert.deepEqual([land.w, land.h], [792, 612]);
  const sq = C.pageSize(C.normalize({ format: "square", orient: "landscape" }).s);
  assert.deepEqual([sq.w, sq.h], [540, 540]);
  assert.equal(C.FORMATS.square.px * C.FORMATS.square.h / C.FORMATS.square.w, 1080);
  assert.equal(C.FORMATS.story.px * C.FORMATS.story.h / C.FORMATS.story.w, 1920);
});

test("normalize: cleans text, drops empty rows and caps sizes", () => {
  const { s, lost, dropped } = C.normalize({
    business: "x".repeat(80), qrUrl: "example.com/book now", format: "nope", theme: "nope", font: "nope", cols: 7, cur: "¥", color: "red",
    sections: [{ title: "Cuts 💇", items: [{ name: "Cut", price: "45" }, { name: "", price: "", note: "" }, null] }, { title: "", items: [] }, "bad"],
  });
  assert.equal(s.business.length, C.MAXLEN.business);
  assert.equal(s.qrUrl, "https://example.com/booknow");
  assert.equal(s.format, "letter"); assert.equal(s.theme, "clean"); assert.equal(s.font, "classic"); assert.equal(s.cols, "auto"); assert.equal(s.cur, "$");
  assert.equal(s.color, "#9d174d");
  assert.equal(s.sections.length, 1);
  assert.equal(s.sections[0].title, "Cuts");
  assert.deepEqual(s.sections[0].items, [{ name: "Cut", price: "45", note: "" }]);
  assert.ok(lost.includes("💇"));
  assert.equal(dropped, 0);
  assert.equal(C.normalize({ qrUrl: "javascript:alert(1)" }).s.qrUrl, "");
  assert.equal(C.normalize({ qrUrl: "http://a.example" }).s.qrUrl, "http://a.example");
  assert.equal(C.normalize({ business: "Rs ₹500 – café" }).s.business, "Rs Rs.500 – café");
  // only small sizes can go on a full sheet
  assert.equal(C.normalize({ format: "letter", onSheet: true }).s.onSheet, false);
  assert.equal(C.normalize({ format: "5x7", onSheet: true }).s.onSheet, true);
});

test("normalize: at most 30 services per section and 150 in total", () => {
  const many = n => Array.from({ length: n }, (_, i) => ({ name: "Service " + (i + 1), price: String(10 + i) }));
  let r = C.normalize({ sections: [{ title: "A", items: many(40) }] });
  assert.equal(r.s.sections[0].items.length, C.MAX_ITEMS);
  assert.equal(r.dropped, 10);
  r = C.normalize({ sections: Array.from({ length: 8 }, (_, i) => ({ title: "S" + i, items: many(25) })) });
  assert.equal(C.countItems(r.s), C.MAX_TOTAL);
  assert.equal(r.dropped, 50);
  r = C.normalize({ sections: Array.from({ length: 15 }, (_, i) => ({ title: "S" + i, items: many(1) })) });
  assert.equal(r.s.sections.length, C.MAX_SECTIONS);
  assert.deepEqual(C.normalize({ business: "", sections: [] }).errors, ["Add a business name or at least one service."]);
});

test("presets: every preset is valid and copies are independent", () => {
  for (const name of Object.keys(C.PRESETS)) {
    const { s, errors, lost } = C.normalize(C.presetState(name));
    assert.deepEqual(errors, [], name); assert.deepEqual(lost, [], name);
    assert.ok(C.countItems(s) > 0, name);
  }
  const a = C.presetState("hair");
  a.sections[0].items[0].name = "Changed";
  assert.notEqual(C.PRESETS.hair.sections[0].items[0].name, "Changed");
  assert.equal(C.presetState("nope").preset, "hair");
});

test("prices: plain numbers get the currency sign, anything else stays as typed", () => {
  const cases = [["45", "$", "$45"], ["45+", "$", "$45+"], ["1,200", "$", "$1,200"], ["45.50", "£", "£45.50"], ["$45", "$", "$45"], ["from 45", "$", "from 45"], ["45-60", "$", "45-60"], ["Free", "$", "Free"], ["45", "", "45"], ["", "$", ""]];
  for (const [p, cur, want] of cases) assert.equal(C.fmtPrice(p, cur), want, `${p} ${cur}`);
});

test("parseMenu: headings, prices at the end, pipes, tabs and notes", () => {
  const out = C.parseMenu([
    "# Cuts & styling", "Women's cut ..... $65+", "Men's cut.....$40", "  quick and tidy", "Kids' cut (12 and under) 30",
    "COLOR:", "Balayage $195+", "(includes toner)", "Swedish massage $90 / 60 min", "Brow - 18", "Full set | 120 | classic", "Lash lift\t85\twith tint", "Consultation Free", "",
  ].join("\n"));
  assert.deepEqual(out.map(x => x.title), ["Cuts & styling", "COLOR"]);
  assert.deepEqual(out[0].items, [
    { name: "Women's cut", price: "$65+", note: "" },
    { name: "Men's cut", price: "$40", note: "quick and tidy" },
    { name: "Kids' cut (12 and under)", price: "30", note: "" },
  ]);
  assert.deepEqual(out[1].items.map(i => [i.name, i.price, i.note]), [
    ["Balayage", "$195+", "includes toner"], ["Swedish massage", "$90 / 60 min", ""], ["Brow", "18", ""], ["Full set", "120", "classic"], ["Lash lift", "85", "with tint"], ["Consultation", "Free", ""],
  ]);
  // items before any heading go into an untitled section
  assert.deepEqual(C.parseMenu("Cut $20"), [{ title: "", items: [{ name: "Cut", price: "$20", note: "" }] }]);
  assert.deepEqual(C.parseMenu(""), []);
});

test("layout: every preset, size and theme keeps text on the page with no overlaps", () => {
  const QRS = {};
  for (const preset of Object.keys(C.PRESETS)) for (const format of Object.keys(C.FORMATS)) for (const theme of Object.keys(C.THEMES)) {
    const st = Object.assign(C.presetState(preset), { format, theme });
    const qr = st.qrUrl ? (QRS[st.qrUrl] ||= qrd(st.qrUrl)) : null;
    const lay = C.layout(st, { qr, credit: true });
    const label = `${preset}/${format}/${theme}`;
    assert.equal(lay.overflow, false, label);
    assert.deepEqual(lay.cut, [], label);
    assertClean(lay, label);
    assert.ok(lay.fs >= 6, label);
  }
});

test("layout: long menus shrink and use more columns; short ones stay in one column at full size", () => {
  const big = Object.assign(C.presetState("hair"), { sections: [] });
  for (let i = 0; i < 6; i++) big.sections.push({ title: "Section " + (i + 1), items: Array.from({ length: 10 }, (_, j) => ({ name: `Service number ${j + 1} with a longer name`, price: String(20 + j * 5) + "+", note: j % 3 ? "" : "A short note about it" })) });
  const lay = C.layout(big, { credit: true });
  assert.equal(lay.overflow, false);
  assert.equal(lay.cols, 3);
  assert.ok(lay.fs >= 6 && lay.fs < 10, "60 services shrink on Letter: " + lay.fs);
  assertClean(lay, "60 services");
  const small = Object.assign(C.presetState("blank"), { format: "a4" });
  const one = C.layout(small, { credit: true });
  assert.equal(one.cols, 1);
  assert.ok(Math.abs(one.k - 1.75 / Math.sqrt(C.FORMATS.a4.w / 612)) < 1e-9, "few services use the largest size");
  const forced = C.layout(Object.assign(C.presetState("hair"), { cols: "3" }), {});
  assert.equal(forced.cols, 3);
});

test("layout: too much for the page leaves services out and says how many", () => {
  const st = Object.assign(C.presetState("hair"), { format: "5x7", sections: [] });
  for (let i = 0; i < 5; i++) st.sections.push({ title: "Section " + i, items: Array.from({ length: 30 }, (_, j) => ({ name: "A fairly long service name number " + j, price: "100+", note: "A note that also takes some room on the page" })) });
  const lay = C.layout(st, { credit: true });
  assert.equal(lay.overflow, true);
  assert.ok(lay.dropped > 0 && lay.dropped < 150);
  assertClean(lay, "overflow");
});

test("layout: sections stay whole when they fit, and a split column repeats the section title", () => {
  const st = C.normalize(C.presetState("hair")).s;
  const lay = C.layout(st, {});
  const titles = lay.prims.filter(p => p.t === "text" && p.font === "TB" && /^[A-Z &]+$/.test(p.text)).map(p => p.text);
  assert.deepEqual(titles.sort(), ["COLOR", "CUTS & STYLING", "TREATMENTS"]);
  // force a split: one long section in 2 columns
  const one = { title: "Waxing", items: Array.from({ length: 24 }, (_, i) => ({ name: "Area " + i, price: "20" })) };
  const lay2 = C.layout(Object.assign(C.presetState("skin"), { sections: [one], cols: "2", format: "square" }), {});
  assert.equal(lay2.prims.filter(p => p.t === "text" && p.text === "WAXING").length, 2);
});

test("layout: dot leaders run between the name and the price, aligned to a grid", () => {
  const lay = C.layout(C.presetState("barber"), {});
  const dots = lay.prims.filter(p => p.t === "line" && p.dash);
  assert.ok(dots.length >= 10);
  for (const d of dots) {
    assert.equal(d.y1, d.y2);
    assert.ok(d.x2 > d.x1);
    const step = d.dash[1];
    assert.ok(Math.abs(d.x1 / step - Math.round(d.x1 / step)) < 1e-6, "dots line up from row to row");
  }
  const none = C.layout(Object.assign(C.presetState("barber"), { leaders: false }), {});
  assert.equal(none.prims.filter(p => p.t === "line" && p.dash).length, 0);
});

test("QR code: drawn at the bottom with a link; dark theme gets a white backing", () => {
  const st = C.presetState("spa");
  const qr = qrd(st.qrUrl);
  assert.ok(qr.n >= 21 && /^M\d/.test(qr.d));
  const lay = C.layout(st, { qr, credit: true });
  const code = lay.prims.find(p => p.t === "path" && p.d === qr.d);
  assert.ok(code && code.y < lay.H / 3, "QR in the footer");
  assert.ok(lay.links.some(l => l.url === st.qrUrl));
  assert.ok(lay.links.some(l => l.url === C.CREDIT_URL));
  const dark = C.layout(Object.assign({}, st, { theme: "dark" }), { qr });
  const i = dark.prims.findIndex(p => p.t === "path" && p.d === qr.d);
  assert.deepEqual(dark.prims[i - 1].fill, [1, 1, 1]);
  const noQr = C.layout(Object.assign({}, st, { qrUrl: "" }), { qr });
  assert.ok(!noQr.prims.some(p => p.t === "path" && p.d === qr.d));
});

test("svg: escapes text and draws the full sheet with crop marks for small sizes", () => {
  const st = C.normalize(Object.assign(C.presetState("barber"), { format: "5x7", onSheet: true })).s;
  const lay = C.layout(st, {});
  const sh = C.sheetFor(st);
  assert.equal(sh.pageW, 612); assert.equal(sh.pageH, 792);
  assert.ok(Math.abs(sh.x - 126) < 1e-9 && Math.abs(sh.y - 144) < 1e-9);
  const out = C.svg(lay, null, { sheet: sh });
  assert.ok(out.startsWith("<svg") && out.endsWith("</svg>"));
  assert.ok(out.includes("Cut &amp; beard combo"));
  assert.ok(out.includes('viewBox="0 0 612 792"'));
  assert.equal((out.match(/<line /g) || []).length >= 8, true);
  assert.ok(C.svg(lay, null, { px: 1080 }).includes('width="1080" height="1512"'));
});

test("pdf: one page at the right size, standard fonts, links for the QR and the credit", async () => {
  const st = C.presetState("hair");
  const r = await C.buildPdf(PDFLib, st, { qr: qrd(st.qrUrl) });
  const doc = await PDFLib.PDFDocument.load(r.bytes);
  assert.equal(doc.getPageCount(), 1);
  assert.deepEqual(Object.values(doc.getPage(0).getSize()), [612, 792]);
  assert.equal(doc.getTitle(), "Willow Street Hair Studio price list");
  const annots = doc.getPage(0).node.Annots();
  const urls = annots.asArray().map(ref => doc.context.lookup(ref).get(PDFLib.PDFName.of("A")).get(PDFLib.PDFName.of("URI")).decodeText());
  assert.deepEqual(urls.sort(), [C.CREDIT_URL, st.qrUrl].sort());
  // a 5 x 7 on a Letter sheet, landscape A5 on an A4 sheet
  const small = await C.buildPdf(PDFLib, Object.assign(C.presetState("barber"), { format: "5x7", onSheet: true }), {});
  assert.deepEqual(Object.values((await PDFLib.PDFDocument.load(small.bytes)).getPage(0).getSize()), [612, 792]);
  const a5 = await C.buildPdf(PDFLib, Object.assign(C.presetState("spa"), { format: "a5", onSheet: true, orient: "landscape" }), {});
  const sz = (await PDFLib.PDFDocument.load(a5.bytes)).getPage(0).getSize();
  assert.ok(Math.abs(sz.width - 841.89) < 0.01 && Math.abs(sz.height - 595.28) < 0.01);
  await assert.rejects(C.buildPdf(PDFLib, { business: "", sections: [] }), /Add a business name/);
});
