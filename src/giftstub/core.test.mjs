// Unit tests for the GiftStub core (numbering, padding, pagination, 3-up geometry, CSV, PDF).
// Usage: node --test src/giftstub/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/giftstub");
const require = createRequire(import.meta.url);
const C = require(join(SITE, "core.js"));
const PDFLib = require(join(SITE, "vendor/pdf-lib.min.js"));
const norm = o => { const r = C.normalize(o); assert.deepEqual(r.errors, []); return r.s; };

test("numbering: prefix, start and zero padding", () => {
  const s = norm({ prefix: "GC-", start: 1, qty: 10, pad: "4" });
  assert.equal(C.fmtNum(1, s), "GC-0001");
  assert.equal(C.fmtNum(10, s), "GC-0010");
  assert.equal(C.fmtNum(12345, s), "GC-12345"); // wider than the padding: never truncated
  assert.equal(s.end, 10);
  assert.equal(C.fmtNum(7, norm({ prefix: "", pad: "none" })), "7");
  assert.equal(C.fmtNum(7, norm({ prefix: "HOL-", pad: "3" })), "HOL-007");
  assert.equal(norm({ pad: "9" }).pad, "4"); // unknown padding falls back to the default
  assert.equal(norm({ start: "1,001", qty: "20" }).end, 1020);
});

test("numbering: invalid ranges are rejected", () => {
  assert.match(C.normalize({ qty: 0 }).errors[0], /Quantity/);
  assert.match(C.normalize({ qty: 501 }).errors[0], /500/);
  assert.match(C.normalize({ start: -1 }).errors[0], /Start/);
  assert.match(C.normalize({ start: "1.5" }).errors[0], /Start/);
  assert.equal(C.normalize({ qty: 500 }).errors.length, 0);
});

test("pagination: 3 per page, last page partially filled", () => {
  const s = norm({ prefix: "GC-", start: 1, qty: 10, pad: "4" });
  const sheets = C.sheetCount(s.count);
  assert.equal(sheets, 4);
  const all = [];
  for (let sh = 0; sh < sheets; sh++) all.push(...C.sheetItems(s, sh));
  assert.deepEqual(all.map(i => i.number), Array.from({ length: 10 }, (_, i) => "GC-" + String(i + 1).padStart(4, "0")));
  const last = C.sheetItems(s, 3);
  assert.equal(last.length, 1);
  assert.deepEqual(last.map(i => i.pos), [0]); // the leftover certificate takes the top slot
  assert.equal(C.indexAt(3, 1, 10), -1);
  assert.equal(C.indexAt(3, 2, 10), -1);
  assert.equal(C.sheetItems(s, 4).length, 0);
  for (const [n, pages, onLast] of [[1, 1, 1], [3, 1, 3], [4, 2, 1], [5, 2, 2], [6, 2, 3], [500, 167, 2]]) {
    const t = norm({ qty: n });
    assert.equal(C.sheetCount(t.count), pages, `${n} certificates`);
    assert.equal(C.sheetItems(t, pages - 1).length, onLast, `${n} certificates, last sheet`);
  }
});

test("stub number equals certificate number in every slot", () => {
  for (const [start, qty, pad, prefix] of [[1, 10, "4", "GC-"], [998, 7, "none", ""], [41, 500, "6", "SPA/"]]) {
    const s = norm({ start, qty, pad, prefix });
    let seen = 0;
    for (let sh = 0; sh < C.sheetCount(s.count); sh++) {
      for (const it of C.sheetItems(s, sh)) {
        assert.equal(it.stub, it.cert);
        assert.equal(it.stub, C.fmtNum(start + it.idx, s));
        seen++;
      }
    }
    assert.equal(seen, qty);
  }
});

test("3-up geometry: cells, stub and credit on Letter and A4", () => {
  for (const paper of ["letter", "a4"]) {
    const s = norm({ paper, qty: 10 });
    const g = C.sheetGeometry(paper);
    assert.equal(g.cells.length, 3);
    for (const c of g.cells) {
      assert.ok(c.x >= 36 && c.x + c.w <= g.pageW - 36 + 1e-6, "inside side margins");
      assert.ok(c.y >= 36 && c.y + c.h <= g.pageH - 36 + 1e-6, "inside top/bottom margins");
      assert.equal(c.h, g.cellH);
    }
    for (let i = 1; i < 3; i++) assert.ok(Math.abs(g.cells[i - 1].y - (g.cells[i].y + g.cellH)) < 1e-6, "stacked, sharing a cut line");
    const lay = C.layoutCert(s, g.cellW, g.cellH);
    assert.ok(lay.stubW > g.cellW * 0.2 && lay.stubW < g.cellW * 0.4, "stub on the left");
    const stub = lay.slots.find(sl => sl.key === "stubnum"), cert = lay.slots.find(sl => sl.key === "certnum");
    assert.ok(stub.x >= 0 && stub.x + stub.maxW <= lay.stubW, "stub number inside the stub");
    assert.ok(cert.x - cert.maxW >= lay.stubW && cert.x <= g.cellW, "certificate number right of the tear line");
    const tear = lay.prims.find(p => p.t === "line" && p.dash);
    assert.equal(tear.x1, lay.stubW, "dashed tear line at the stub edge");
    // Referral credit sits in the bottom page margin, clear of every certificate and cut mark.
    const sp = C.sheetPrims(s, g, 0, 4);
    const credit = sp.find(p => p.t === "text" && p.text === C.CREDIT);
    const link = sp.find(p => p.t === "link");
    assert.ok(credit && link);
    assert.equal(link.url, "https://giftcert.roohsites.com/?utm_source=giftstub&utm_medium=watermark&utm_campaign=referral");
    const marks = sp.filter(p => p.t === "line");
    const lowestMark = Math.min(...marks.map(m => Math.min(m.y1, m.y2)));
    for (const c of g.cells) assert.ok(link.y + link.h < c.y, "credit below every certificate");
    assert.ok(link.y + link.h < lowestMark, "credit below the cut marks");
    assert.ok(credit.y > 12, "credit not at the paper edge");
  }
});

test("every preset, design and paper fits without shortening and stays inside the cell", () => {
  for (const name of Object.keys(C.PRESETS)) for (const design of C.DESIGNS) for (const paper of ["letter", "a4"]) for (const expiry of [false, true]) {
    const s = norm(Object.assign(C.presetState(name), { design, paper, expiry, qty: 500, to: "Alexandra Johnson", from: "The Martinez family" }));
    const g = C.sheetGeometry(paper);
    for (const digital of [false, true]) {
      const lay = C.layoutCert(s, g.cellW, g.cellH, { digital, logo: { aspect: 2 } });
      assert.deepEqual(lay.cut, [], `${name}/${design}/${paper}`);
      for (const p of lay.prims.filter(p => p.t === "text")) {
        const w = C.textW(p.text, p.font, p.size);
        const x0 = p.align === "center" ? p.x - w / 2 : p.align === "right" ? p.x - w : p.x;
        assert.ok(x0 >= 0 && x0 + w <= g.cellW + 0.01 && p.y > 0 && p.y < g.cellH, `${name}/${design}: "${p.text}" inside cell`);
      }
    }
  }
});

test("expiry is off by default", () => {
  assert.equal(C.DEFAULTS.expiry, false);
  assert.equal(norm({}).expiry, false);
  assert.equal(C.fmtDate("2027-12-31"), "December 31, 2027");
});

test("issue log CSV and browser log round trip", () => {
  const csv = C.issueLogCsv({ prefix: "GC-", start: 1, qty: 10, pad: "4" });
  const rows = C.parseCSV(csv);
  assert.deepEqual(rows[0], C.LOG_HEAD);
  assert.equal(rows.length - 1, 10);
  assert.equal(rows[10][0], "GC-0010");
  const entries = [
    { n: "GC-0001", status: "redeemed", to: "Ann, Lee", amount: "$50", issued: "2026-11-02", redeemed: "2026-12-01", note: 'said "thanks"' },
    { n: "GC-0002", status: "issued", to: "=HYPERLINK(1)", amount: "", issued: "", redeemed: "", note: "" },
  ];
  const out = C.logCsv(entries);
  assert.ok(out.includes("'=HYPERLINK(1)"), "formula cells are neutralised");
  assert.deepEqual(C.parseLogCsv(out), entries);
  assert.equal(C.parseLogCsv(csv).length, 10);
});

test("PDF: 10 certificates make 4 Letter pages", async () => {
  const r = await C.buildPdf(PDFLib, { prefix: "GC-", start: 1, qty: 10, pad: "4", paper: "letter" });
  const doc = await PDFLib.PDFDocument.load(r.bytes);
  assert.equal(doc.getPageCount(), 4);
  assert.deepEqual(doc.getPage(0).getSize(), { width: 612, height: 792 });
  const a4 = await C.buildPdf(PDFLib, { qty: 3, paper: "a4" });
  assert.equal((await PDFLib.PDFDocument.load(a4.bytes)).getPageCount(), 1);
});

test("voucher presets: heading, A4 and rupee sign; certificate wording is unchanged", async () => {
  const sheetLine = s => C.sheetPrims(C.normalize(s).s, C.sheetGeometry("a4"), 0, 1).find(p => p.text && p.text.startsWith("Gift ")).text;
  assert.ok(sheetLine(C.presetState("general")).startsWith("Gift certificates · sheet 1 of 1"));
  assert.ok(sheetLine(C.presetState("holiday")).startsWith("Gift certificates · sheet 1 of 1"));
  for (const name of ["voucher", "salonvoucher", "diwalivoucher"]) {
    const st = C.presetState(name);
    assert.match(st.headline, /Gift Voucher$/);
    assert.ok(sheetLine(st).startsWith("Gift vouchers · sheet 1 of 1"), name);
    assert.ok(C.PRESETS[name].value.includes("₹"));
    assert.equal(C.normalize(st).s.value.includes("₹"), false, "rupee sign is swapped for Rs. before printing");
    assert.match(C.normalize(st).s.value, /Rs\./);
    assert.deepEqual(C.normalize(st).lost, []);
  }
  assert.equal(C.presetState("diwalivoucher").headline, "Diwali Gift Voucher");
  assert.equal(C.presetState("voucher").value, "₹2,000");
  assert.equal(C.presetState("diwalivoucher").value, "₹1,000");
  const r = await C.buildPdf(PDFLib, Object.assign(C.presetState("voucher"), { paper: "a4", qty: 4 }));
  const doc = await PDFLib.PDFDocument.load(r.bytes);
  assert.equal(doc.getTitle(), "Gift vouchers GC-0001-GC-0004");
  assert.equal(doc.getPageCount(), 2);
});
