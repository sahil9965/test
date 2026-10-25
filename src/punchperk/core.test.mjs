// Unit tests for the PunchPerk core (sheet geometry, duplex mirroring, numbering, punch grid, credit line, PDF pages).
// Usage: node --test src/punchperk/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/punchperk");
const require = createRequire(import.meta.url);
const C = require(join(SITE, "core.js"));
const PDFLib = require(join(SITE, "vendor/pdf-lib.min.js"));
const QR = require(join(SITE, "vendor/qrcode-generator-1.4.4.js"));
const norm = o => { const r = C.normalize(o); assert.deepEqual(r.errors, []); return r.s; };
const EPS = 1e-6;
const inside = (c, W, H) => c.x >= -EPS && c.y >= -EPS && c.x + c.w <= W + EPS && c.y + c.h <= H + EPS;
const overlap = (a, b) => a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;
const LAYOUTS = Object.keys(C.LAYOUTS);

test("layout a: US Letter 3.5 x 2 in, 10 per sheet, Avery-style margins are exact", () => {
  const g = C.sheetGeometry("letter-10");
  assert.equal(g.pageW, 612); assert.equal(g.pageH, 792);
  assert.equal(g.cells.length, 10); assert.equal(g.perPage, 10);
  assert.equal(g.cardW, 252); assert.equal(g.cardH, 144); // 3.5 x 2 in
  const minX = Math.min(...g.cells.map(c => c.x)), maxX = Math.max(...g.cells.map(c => c.x + c.w));
  const minY = Math.min(...g.cells.map(c => c.y)), maxY = Math.max(...g.cells.map(c => c.y + c.h));
  assert.equal(minX, 54); // 0.75 in
  assert.equal(612 - maxX, 54);
  assert.equal(minY, 36); // 0.5 in
  assert.equal(792 - maxY, 36);
  // no gutter: neighbours touch exactly
  assert.equal(g.cells[1].x, g.cells[0].x + 252);
  assert.equal(g.cells[2].y + 144, g.cells[0].y);
  assert.equal(g.gap, 0);
});

test("layout b: A4 85 x 55 mm, 10 per sheet, centred", () => {
  const g = C.sheetGeometry("a4-10");
  assert.equal(g.cells.length, 10);
  assert.ok(Math.abs(g.cardW - (85 * 72) / 25.4) < 1e-9 && Math.abs(g.cardH - (55 * 72) / 25.4) < 1e-9);
  const minX = Math.min(...g.cells.map(c => c.x)), maxX = Math.max(...g.cells.map(c => c.x + c.w));
  const minY = Math.min(...g.cells.map(c => c.y)), maxY = Math.max(...g.cells.map(c => c.y + c.h));
  assert.ok(Math.abs(minX - (g.pageW - maxX)) < 1e-9, "left and right margins match");
  assert.ok(Math.abs(minY - (g.pageH - maxY)) < 1e-9, "top and bottom margins match");
  assert.ok(Math.abs((minX / 72) * 25.4 - 20) < 0.05, "20 mm side margins");
});

test("layout c: plain paper has 1/8 in gaps and crop marks outside the cards", () => {
  for (const key of ["letter-plain", "a4-plain"]) {
    const g = C.sheetGeometry(key);
    assert.equal(g.cells.length, 8);
    assert.equal(g.gap, 9);
    assert.ok(Math.abs(g.cells[1].x - (g.cells[0].x + g.cardW + 9)) < EPS);
    assert.ok(Math.abs(g.cells[0].y - (g.cells[2].y + g.cardH + 9)) < EPS);
    const { s } = C.normalize({ layout: key, serials: false });
    const marks = C.chromePrims(s, g, "front", 0, 1).filter(p => p.t === "line");
    assert.ok(marks.length >= 24, "crop marks drawn");
    for (const m of marks) {
      const box = { x: Math.min(m.x1, m.x2) - 0.25, y: Math.min(m.y1, m.y2) - 0.25, w: Math.abs(m.x2 - m.x1) + 0.5, h: Math.abs(m.y2 - m.y1) + 0.5 };
      assert.ok(inside(box, g.pageW, g.pageH), "mark inside the page");
      for (const c of g.cells) assert.ok(!overlap(box, c), "mark does not touch a card");
      // marks sit outside the block of cards
      assert.ok(box.x + box.w <= g.gx + EPS || box.x >= g.gx + g.gw - EPS || box.y + box.h <= g.gy + EPS || box.y >= g.gy + g.gh - EPS);
    }
  }
});

test("every layout: cards sit inside the page and never overlap", () => {
  for (const key of LAYOUTS) for (const [dx, dy] of [[0, 0], [3, 3], [-3, -3]]) {
    const g = C.sheetGeometry(key, dx, dy);
    for (const c of g.cells) assert.ok(inside(c, g.pageW, g.pageH), `${key} ${dx},${dy} card inside page`);
    for (let i = 0; i < g.cells.length; i++) for (let j = i + 1; j < g.cells.length; j++) assert.ok(!overlap(g.cells[i], g.cells[j]), `${key} overlap ${i},${j}`);
  }
});

test("duplex: each back is mirrored left to right so it lands behind its front", () => {
  for (const key of LAYOUTS) {
    const g = C.sheetGeometry(key);
    for (const f of g.cells) {
      const b = C.backCell(g, f.pos);
      assert.ok(Math.abs(b.x - (g.pageW - (f.x + f.w))) < 1e-9, `${key} pos ${f.pos}: back x mirrors front x`);
      assert.equal(b.y, f.y);
      assert.equal(b.w, f.w);
      assert.equal(b.r, f.r);
      assert.equal(b.c, g.cols - 1 - f.c);
    }
  }
  // 25 cards on Letter: the last sheet has 5 fronts, and exactly 5 backs at the mirrored positions
  const s = norm({ qty: 25, back: true });
  const items = C.sheetItems(s, 2);
  assert.deepEqual(items.map(i => i.pos), [0, 1, 2, 3, 4]);
  const g = C.sheetGeometry(s.layout);
  assert.deepEqual(items.map(i => C.backCell(g, i.pos).pos), [1, 0, 3, 2, 5]);
});

test("page order: fronts only, interleaved F B F B, or all fronts then all backs", () => {
  const sides = o => C.pageList(norm(Object.assign({ qty: 25 }, o))).map(p => p.side[0] + (p.sheet + 1)).join(" ");
  assert.equal(sides({ back: false }), "f1 f2 f3");
  assert.equal(sides({ back: true, order: "interleaved" }), "f1 b1 f2 b2 f3 b3");
  assert.equal(sides({ back: true, order: "separate" }), "f1 f2 f3 b1 b2 b3");
});

test("serial numbering: prefix, start and padding across sheets", () => {
  const s = norm({ serials: true, prefix: "No. ", start: 1, pad: "4", qty: 25 });
  assert.equal(C.fmtNum(1, s), "No. 0001");
  assert.equal(C.sheetCount(s), 3);
  const all = [];
  for (let sh = 0; sh < C.sheetCount(s); sh++) all.push(...C.sheetItems(s, sh).map(i => i.serial));
  assert.equal(all.length, 25);
  assert.equal(all[0], "No. 0001");
  assert.equal(all[9], "No. 0010"); // last card of sheet 1
  assert.equal(all[10], "No. 0011"); // first card of sheet 2
  assert.equal(all[24], "No. 0025");
  assert.equal(new Set(all).size, 25);
  assert.deepEqual(all, Array.from({ length: 25 }, (_, i) => "No. " + String(i + 1).padStart(4, "0")));
  const t = norm({ serials: true, prefix: "A-", start: 495, pad: "3", qty: 10 });
  assert.equal(C.sheetItems(t, 0)[9].serial, "A-504");
  assert.equal(C.fmtNum(12345, norm({ serials: true, pad: "4" })), "No. 12345"); // wider than the padding: never cut
  assert.equal(C.fmtNum(7, norm({ serials: true, prefix: "", pad: "none" })), "7");
  assert.equal(C.sheetItems(norm({ serials: false, qty: 10 }), 0)[0].serial, "");
});

test("quantity and validation", () => {
  assert.match(C.normalize({ qty: 0 }).errors[0], /from 1 to 500/);
  assert.match(C.normalize({ qty: 501 }).errors[0], /500/);
  assert.equal(C.normalize({ qty: 500 }).errors.length, 0);
  assert.equal(C.sheetCount(norm({ qty: 500 })), 50);
  assert.equal(C.sheetCount(norm({ qty: 500, layout: "letter-plain" })), 63);
  assert.equal(norm({ punches: 99 }).punches, 12);
  assert.equal(norm({ punches: 1 }).punches, 5);
  assert.equal(norm({ dx: 50, dy: -50 }).dx, 3);
  assert.equal(norm({ layout: "nope" }).layout, "letter-10");
  assert.equal(norm({ qrUrl: "example.com/menu" }).qrUrl, "https://example.com/menu");
  assert.equal(norm({ qrUrl: "not a link" }).qrUrl, ""); // not a usable link, so no QR code
});

// Everything printed on a card must stay inside its edges, and the punch grid inside its own region.
function checkCard(lay, W, H, label) {
  const g = lay.grid;
  for (const c of g.circles) {
    assert.ok(c.cx - c.r >= g.left - 0.01 && c.cx + c.r <= g.right + 0.01, `${label}: circle inside the side padding`);
    assert.ok(c.cy + c.r <= g.top + 0.01 && c.cy - c.r >= g.bottom - 0.01, `${label}: circle inside the grid region`);
  }
  for (let i = 0; i < g.circles.length; i++) {
    for (let j = i + 1; j < g.circles.length; j++) {
      const a = g.circles[i], b = g.circles[j];
      assert.ok(Math.hypot(a.cx - b.cx, a.cy - b.cy) >= a.r + b.r - 0.01, `${label}: circles ${i},${j} don't overlap`);
    }
    for (const bx of g.boxes) {
      const a = g.circles[i];
      assert.ok(a.cx + a.r <= bx.x + 0.01, `${label}: circle left of the initials box`);
    }
  }
  assert.ok(g.d >= 14, `${label}: punches are at least 14 pt across (got ${g.d.toFixed(1)})`);
  for (const p of lay.prims) {
    if (p.t === "text") {
      const w = C.textW(p.text, p.font, p.size), x0 = p.align === "center" ? p.x - w / 2 : p.align === "right" ? p.x - w : p.x;
      assert.ok(x0 >= 0 && x0 + w <= W + 0.01, `${label}: text "${p.text}" inside the card width`);
      assert.ok(p.y >= 0 && p.y + p.size <= H, `${label}: text "${p.text}" inside the card height`);
    }
  }
}
test("punch grid fits inside the card for 5-12 punches, 1 or 2 rows, with every option on", () => {
  for (const key of ["letter-10", "a4-10"]) {
    const g = C.sheetGeometry(key);
    for (let n = 5; n <= 12; n++) for (const rows of ["1", "2"]) for (const initials of [false, true]) for (const rewardSpot of [false, true]) {
      const s = norm({ punches: n, rows, initials, rewardSpot, serials: true, qty: 500, contact: "Open daily 7am to 3pm · cornercup.example", terms: "One stamp per drink. No cash value. Free drink up to a large size only.", mark: "paw", business: "A Fairly Long Business Name Ltd" });
      const lay = C.layoutFront(s, g.cardW, g.cardH, { logo: { aspect: 3 } });
      checkCard(lay, g.cardW, g.cardH, `${key} n=${n} rows=${rows} init=${initials} reward=${rewardSpot}`);
      assert.equal(lay.grid.circles.length, n);
    }
  }
});

test("every preset prints without cut text on both card sizes, front and back", () => {
  const q = QR(0, "M"); q.addData("https://cornercup.example/menu", "Byte"); q.make();
  for (const name of Object.keys(C.PRESETS)) for (const key of ["letter-10", "a4-10"]) {
    const s = norm(C.presetState(name, { layout: key, back: true, serials: true, initials: true }));
    const g = C.sheetGeometry(key);
    const f = C.layoutFront(s, g.cardW, g.cardH), b = C.layoutBack(s, g.cardW, g.cardH, { qr: C.qrData(q) });
    assert.deepEqual(f.cut, [], `${name} front shortened: ${f.cut}`);
    assert.deepEqual(b.cut, [], `${name} back shortened: ${b.cut}`);
    checkCard(f, g.cardW, g.cardH, `${name} ${key}`);
    if (b.tile) assert.ok(b.tile.x >= 0 && b.tile.x + b.tile.w <= g.cardW && b.tile.y >= 0 && b.tile.y + b.tile.h <= g.cardH, `${name}: QR tile inside the card`);
  }
});

test("credit line: bottom margin, outside every card and every crop mark, linked, at all nudges", () => {
  for (const key of LAYOUTS) for (const [dx, dy] of [[0, 0], [3, 3], [3, -3], [-3, 3], [-3, -3]]) for (const side of ["front", "back"]) {
    const s = norm({ layout: key, dx, dy, outline: true, qty: 25, back: true });
    const g = C.sheetGeometry(key, dx, dy);
    const prims = C.chromePrims(s, g, side, 0, 3);
    const cr = C.creditRect(g);
    const box = { x: cr.x0, y: cr.y0, w: cr.x1 - cr.x0, h: cr.y1 - cr.y0 };
    assert.ok(inside(box, g.pageW, g.pageH));
    assert.ok(box.y + box.h < g.pageH / 2, "bottom margin");
    for (const c of g.cells) assert.ok(!overlap(box, c), `${key} ${dx},${dy}: credit clear of cards`);
    for (const p of prims.filter(p => p.t === "line")) {
      const lb = { x: Math.min(p.x1, p.x2) - 0.3, y: Math.min(p.y1, p.y2) - 0.3, w: Math.abs(p.x2 - p.x1) + 0.6, h: Math.abs(p.y2 - p.y1) + 0.6 };
      assert.ok(!overlap(box, lb), "credit clear of crop marks");
    }
    const text = prims.find(p => p.t === "text" && p.text === C.CREDIT);
    assert.ok(text && text.y > 0);
    assert.equal(prims.find(p => p.t === "link").url, "https://punchcard.roohsites.com/?utm_source=punchperk&utm_medium=watermark&utm_campaign=referral");
  }
  // the credit never appears in a card's own primitives
  const s = norm({ back: true, serials: true });
  const g = C.sheetGeometry(s.layout);
  for (const prims of [C.layoutFront(s, g.cardW, g.cardH).prims, C.layoutBack(s, g.cardW, g.cardH).prims]) assert.ok(!prims.some(p => p.t === "text" && /Made with/.test(p.text)));
});

test("PDF: page count, page size and one credit line per page", async () => {
  const q = QR(0, "M"); q.addData("https://example.com/menu", "Byte"); q.make();
  const run = async (o) => {
    const r = await C.buildPdf(PDFLib, C.presetState("coffee", Object.assign({ serials: true, qty: 25, back: true }, o)), { qr: C.qrData(q) });
    const doc = await PDFLib.PDFDocument.load(r.bytes);
    return { r, doc, sizes: doc.getPages().map(p => p.getSize()) };
  };
  const a = await run({});
  assert.equal(a.doc.getPageCount(), 6);
  for (const z of a.sizes) { assert.equal(z.width, 612); assert.equal(z.height, 792); }
  const b = await run({ layout: "a4-10", back: false });
  assert.equal(b.doc.getPageCount(), 3);
  assert.ok(Math.abs(b.sizes[0].width - 595.28) < 0.01 && Math.abs(b.sizes[0].height - 841.89) < 0.01);
  const c = await run({ layout: "letter-plain", qty: 25 });
  assert.equal(c.doc.getPageCount(), 8); // 4 sheets x (front + back)
  const al = await C.buildAlignmentPdf(PDFLib, C.presetState("general", { back: true }));
  assert.equal((await PDFLib.PDFDocument.load(al.bytes)).getPageCount(), 2);
});
