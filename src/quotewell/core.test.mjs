// Unit tests for the Quotewell core (input limits, money maths in cents, dates and numbering, trade starting points,
// page layout and pagination, PDF building, text export).
// Usage: node --test src/quotewell/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/quotewell");
const require = createRequire(import.meta.url);
const C = require(join(SITE, "core.js"));
const PDFLib = require(join(SITE, "vendor/pdf-lib.min.js"));
const PNG_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// A small, fully worked example. Every figure below was worked out by hand in cents.
function sample(over = {}) {
  const d = C.applyTrade({ issued: "2026-11-05", from: { name: "Rivera Electric" }, to: { name: "Sam Lee" }, job: { title: "Panel upgrade", scope: "Replace the panel." } }, "electrician");
  const rate = [95, 420, 300, 150, 75], qty = [8, 1, 1, 1, 1];
  d.items.forEach((it, i) => { it.rate = rate[i]; it.qty = qty[i]; it.taxable = it.type === "material"; });
  return Object.assign(d, over);
}

test("num reads what people type and never goes negative", () => {
  assert.equal(C.num("1,200.50"), 1200.5);
  assert.equal(C.num("$12"), 12);
  assert.equal(C.num(" 3 "), 3);
  assert.equal(C.num("-5"), 0);
  assert.equal(C.num("abc"), 0);
  assert.equal(C.num(""), 0);
  assert.equal(C.num(null), 0);
  assert.equal(C.num(NaN), 0);
  assert.equal(C.num(Infinity), 0);
  assert.equal(C.num("1.2.3"), 1.2);
  assert.equal(C.num(5e9, 1e6), 1e6);
});

test("cents rounds half up even where floating point would not", () => {
  assert.equal(C.cents(1.005), 101);       // 1.005 * 100 is 100.49999999999999 in floating point
  assert.equal(C.cents(0.1 * 3), 30);
  assert.equal(C.cents(2.5 * 19.99), 4998);  // 49.975
  assert.equal(C.cents(0), 0);
  assert.equal(C.pctOf(10050, 7.25), 729);  // 728.625
  assert.equal(C.pctOf(1000, 0), 0);
  assert.equal(C.pctOf(999, 10), 100);      // 99.9
});

test("normalize clamps, cleans and caps everything it is given", () => {
  const d = C.normalize({
    kind: "nonsense", currency: "XYZ", paper: "legal", accent: "red", issued: "2026-02-30", validDays: 99999,
    number: "N".repeat(80), from: { name: "A".repeat(200), logo: "javascript:alert(1)" },
    discount: { mode: "weird", value: -4 }, markup: { pct: 9999 }, tax: { pct: 500, label: "" }, deposit: { value: "abc" },
    items: Array.from({ length: 200 }, (_, i) => ({ desc: "x".repeat(500), type: "bogus", qty: "-3", rate: "99999999999", unit: "u".repeat(50), taxable: 1 })),
    terms: "t".repeat(9999), job: { scope: "s".repeat(9999) },
  });
  assert.equal(d.kind, "estimate"); assert.equal(d.currency, "USD"); assert.equal(d.paper, "letter");
  assert.equal(d.accent, C.ACCENTS.orange); assert.equal(d.issued, ""); assert.equal(d.validDays, 365);
  assert.equal(d.number.length, C.LIMITS.number); assert.equal(d.from.name.length, C.LIMITS.name);
  assert.equal(d.from.logo, ""); assert.equal(d.from.logoRatio, 0);
  assert.equal(d.discount.mode, "pct"); assert.equal(d.discount.value, 0);
  assert.equal(d.markup.pct, 500); assert.equal(d.tax.pct, 100); assert.equal(d.tax.label, "Sales tax"); assert.equal(d.deposit.value, 0);
  assert.equal(d.items.length, C.LIMITS.items);
  assert.equal(d.items[0].desc.length, C.LIMITS.desc); assert.equal(d.items[0].type, "labor"); assert.equal(d.items[0].qty, 0);
  assert.equal(d.items[0].rate, 1e8); assert.equal(d.items[0].unit.length, C.LIMITS.unit); assert.equal(d.items[0].taxable, true);
  assert.equal(d.terms.length, C.LIMITS.terms); assert.equal(d.job.scope.length, C.LIMITS.scope);
  assert.deepEqual(C.normalize(C.normalize(sample())), C.normalize(sample()), "normalizing twice changes nothing");
  assert.deepEqual(C.normalize(null).items, []);
  assert.equal(C.normalize({}).validDays, 30); assert.equal(C.normalize({ validDays: "" }).validDays, 0); assert.equal(C.normalize({ validDays: 14 }).validDays, 14);
  assert.equal(C.normalize({ from: { logo: PNG_1PX } }).from.logo, PNG_1PX);
});

test("the maths follows one fixed order and matches the hand-worked figures", () => {
  const d = sample();
  d.tax.pct = 7.25; d.markup.pct = 10; d.discount = { mode: "pct", value: 5 }; d.deposit = { mode: "pct", value: 30 };
  const c = C.calc(d);
  assert.equal(c.subtotal, 170500);        // 760 + 420 + 300 + 150 + 75
  assert.deepEqual(c.by, { labor: 76000, material: 72000, other: 22500 });
  assert.equal(c.discount, 8525);          // 5% of 1,705.00
  assert.equal(c.afterDiscount, 161975);
  assert.equal(c.markup, 16198);           // 10% of 1,619.75 = 161.975, half up
  assert.equal(c.net, 178173);
  assert.equal(c.taxableBase, 75240);      // 1,781.73 x 720 / 1,705
  assert.equal(c.tax, 5455);               // 7.25% of 752.40 = 54.549
  assert.equal(c.total, 183628);
  assert.equal(c.deposit, 55088);          // 30% of 1,836.28 = 550.884
  assert.equal(c.balance, 128540);
});

test("tax only applies to lines marked taxable; a fixed discount and deposit are capped", () => {
  const d = sample(); d.tax.pct = 10;
  d.items.forEach(it => (it.taxable = false));
  assert.equal(C.calc(d).tax, 0);
  d.items[1].taxable = true;                 // only the 420.00 materials line
  assert.equal(C.calc(d).tax, 4200);
  d.discount = { mode: "amt", value: 99999 };
  const c = C.calc(d);
  assert.equal(c.discount, c.subtotal); assert.equal(c.total, 0); assert.equal(c.tax, 0);
  d.discount = { mode: "amt", value: 100 }; d.deposit = { mode: "amt", value: 999999 };
  const e = C.calc(d);
  assert.equal(e.deposit, e.total); assert.equal(e.balance, 0);
});

test("an empty or unpriced document gives zeros, never NaN", () => {
  for (const d of [{}, { items: [] }, { items: [{ desc: "x" }] }, { items: [{ desc: "x", qty: 3, rate: "" }] }, C.applyTrade({}, "handyman")]) {
    const c = C.calc(d);
    for (const k of ["subtotal", "discount", "markup", "tax", "total", "deposit", "balance"]) assert.ok(Number.isInteger(c[k]) && c[k] === 0, k);
  }
});

test("totals add up for hundreds of random documents", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let n = 0; n < 500; n++) {
    const d = {
      items: Array.from({ length: 1 + Math.floor(rnd() * 12) }, () => ({ desc: "i", type: ["labor", "material", "other"][Math.floor(rnd() * 3)], qty: Math.round(rnd() * 5000) / 100, rate: Math.round(rnd() * 100000) / 100, taxable: rnd() < 0.5 })),
      discount: { mode: rnd() < 0.5 ? "pct" : "amt", value: Math.round(rnd() * 3000) / 100 },
      markup: { pct: Math.round(rnd() * 40 * 100) / 100 }, tax: { pct: Math.round(rnd() * 12 * 100) / 100 },
      deposit: { mode: rnd() < 0.5 ? "pct" : "amt", value: Math.round(rnd() * 5000) / 100 },
    };
    const c = C.calc(d);
    for (const k of ["subtotal", "discount", "markup", "net", "taxableBase", "tax", "total", "deposit", "balance"]) assert.ok(Number.isInteger(c[k]) && c[k] >= 0, `${k} ${c[k]}`);
    assert.equal(c.by.labor + c.by.material + c.by.other, c.subtotal);
    assert.equal(c.lines.reduce((a, l) => a + l.cents, 0), c.subtotal);
    assert.equal(c.total, c.net + c.tax);
    assert.equal(c.net, c.subtotal - c.discount + c.markup);
    assert.equal(c.balance, c.total - c.deposit);
    assert.ok(c.discount <= c.subtotal && c.deposit <= c.total && c.taxableBase <= c.net);
  }
});

test("dates: adding days crosses months, years and leap days; invalid dates are refused", () => {
  assert.equal(C.addDays("2026-11-05", 30), "2026-12-05");
  assert.equal(C.addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(C.addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(C.addDays("2027-02-28", 1), "2027-03-01");
  assert.equal(C.addDays("2026-03-08", 1), "2026-03-09");      // a daylight-saving date in the US
  assert.equal(C.isIso("2026-02-30"), false); assert.equal(C.isIso("26-1-1"), false); assert.equal(C.isIso("1999-01-01"), false); assert.equal(C.isIso("2026-11-05"), true);
  assert.equal(C.fmtDate("2026-11-05"), "Nov 5, 2026"); assert.equal(C.fmtDate("nope"), "");
  assert.equal(C.validUntil(C.normalize({ issued: "2026-11-05", validDays: 30 })), "2026-12-05");
  assert.equal(C.validUntil(C.normalize({ issued: "2026-11-05", validDays: 0 })), "");
  assert.equal(C.validUntil(C.normalize({ validDays: 30 })), "");
});

test("numbering continues the last number and keeps its width", () => {
  assert.equal(C.nextNumber("EST-0007", "estimate"), "EST-0008");
  assert.equal(C.nextNumber("EST-0099", "estimate"), "EST-0100");
  assert.equal(C.nextNumber("2026-014", "estimate"), "2026-015");
  assert.equal(C.nextNumber("Job 9", "quote"), "Job 10");
  assert.equal(C.nextNumber("", "quote"), "QUO-0001");
  assert.equal(C.nextNumber("abc", "proposal"), "PRO-0001");
});

test("money and number text", () => {
  assert.equal(C.money(123456789, "USD"), "$1,234,567.89");
  assert.equal(C.money(5, "USD"), "$0.05"); assert.equal(C.money(-250, "GBP"), "-£2.50"); assert.equal(C.money(100000, "EUR"), "€1,000.00");
  assert.equal(C.rateText(95, "USD"), "$95.00"); assert.equal(C.rateText(0.125, "USD"), "$0.1250"); assert.equal(C.rateText(1234.5, "USD"), "$1,234.50");
  assert.equal(C.qtyText(2.5), "2.5"); assert.equal(C.qtyText(1000), "1,000"); assert.equal(C.qtyText(0.333333), "0.333");
  assert.equal(C.pctText(7.25), "7.25%"); assert.equal(C.pctText(10), "10%");
});

test("every trade starting point is usable and carries no prices or tax rules", () => {
  const keys = Object.keys(C.TRADES);
  assert.ok(keys.length >= 8);
  for (const k of keys) {
    const t = C.TRADES[k];
    assert.ok(t.label && t.title && t.scope && t.extra, k);
    assert.ok(t.items.length >= 4 && t.items.length <= 6, k);
    for (const [desc, type, unit] of t.items) { assert.ok(desc && unit, k); assert.ok(C.TYPES[type], `${k} ${type}`); }
    const d = C.applyTrade({ kind: "quote" }, k);
    assert.equal(d.items.length, t.items.length);
    assert.ok(d.items.every(i => i.rate === "" && i.taxable === false), "no prices, nothing taxable by default");
    assert.equal(C.calc(d).total, 0);
    assert.match(d.terms, /This quote is based on the work described above/);
    assert.ok(d.terms.includes(t.extra));
    assert.equal(C.normalize(d).items.length, t.items.length);
  }
});

const rowsOf = (n, d = sample()) => { d.items = Array.from({ length: n }, (_, i) => ({ desc: `Line item number ${i + 1} with a description`, type: "labor", qty: 1, unit: "ea", rate: 10 + i, taxable: false })); return d; };
const texts = L => L.pages.map(p => p.filter(x => x.t === "text").map(x => x.v));
const inside = (L, p) => p.every(x => x.t === "text" ? x.y > 0 && x.y < L.H && x.x >= 0 && x.x <= L.W : x.t === "line" ? x.y1 >= 0 && x.y1 <= L.H && Math.min(x.x1, x.x2) >= 0 && Math.max(x.x1, x.x2) <= L.W : x.x >= 0 && x.y >= 0 && x.x + x.w <= L.W + 0.01 && x.y + x.h <= L.H + 0.01);

test("a normal estimate fits on one US Letter page, and the numbers printed are the engine's", () => {
  const d = sample(); d.tax.pct = 7.25; d.discount = { mode: "pct", value: 5 }; d.deposit = { mode: "pct", value: 30 };
  const L = C.layout(d);
  assert.equal(L.pages.length, 1); assert.equal(L.W, 612); assert.equal(L.H, 792);
  const all = texts(L).flat();
  const c = C.calc(d);
  for (const v of [C.money(c.total, "USD"), C.money(c.subtotal, "USD"), C.money(c.tax, "USD"), C.money(c.deposit, "USD"), C.money(c.balance, "USD"), "ESTIMATE", "No. EST-0001", "Date: Nov 5, 2026", "Valid until: Dec 5, 2026", "Page 1 of 1"])
    assert.ok(all.includes(v) || all.includes("-" + v), v);
  assert.ok(all.some(t => t.startsWith("Made with Quotewell")));
  assert.ok(all.some(t => t.startsWith("Customer signature")));
  assert.ok(inside(L, L.pages[0]));
});

test("A4 changes the page size; sign: false removes the acceptance lines; kind changes the title", () => {
  const L = C.layout({ ...sample(), paper: "a4", sign: false, kind: "proposal" });
  assert.equal(Math.round(L.W), 595); assert.equal(Math.round(L.H), 842);
  const all = texts(L).flat();
  assert.ok(all.includes("PROPOSAL")); assert.ok(!all.some(t => /signature/.test(t) || /^ACCEPTED/.test(t)));
});

test("long documents continue on more pages: header repeats, rows are never cut, totals and signatures stay together", () => {
  let last = 1;
  for (const n of [5, 20, 40, 60]) {
    const d = rowsOf(n); d.tax.pct = 5; d.deposit = { mode: "pct", value: 25 };
    d.terms = Array.from({ length: 30 }, (_, i) => `Term paragraph ${i + 1}: ` + "words ".repeat(30)).join("\n");
    const L = C.layout(d);
    assert.ok(L.pages.length >= last, `${n} rows`); last = L.pages.length;
    L.pages.forEach(p => assert.ok(inside(L, p), `all drawing steps stay on the page (${n} rows)`));
    const t = texts(L);
    t.forEach((p, i) => { assert.ok(p.includes(`Page ${i + 1} of ${L.pages.length}`)); if (i > 0) assert.ok(p.some(v => v.endsWith("(continued)"))); });
    assert.equal(t.flat().filter(v => /^Line item number \d+ with/.test(v)).length, n, "every row printed exactly once");
    const where = key => t.map((p, i) => p.some(v => v === key) ? i : -1).filter(i => i >= 0);
    assert.deepEqual(where("TOTAL").length, 1);
    assert.equal(where("TOTAL")[0], where("Subtotal")[0], "totals block is not split");
    assert.equal(where("Customer signature")[0], where("ACCEPTED: please sign to approve this estimate")[0], "acceptance block is not split");
    assert.ok(t.slice(1).every(p => p.includes("DESCRIPTION") || !p.some(v => /^Line item number/.test(v))), "item rows on a later page get the column header again");
  }
  assert.ok(last >= 3, "60 rows really do take several pages");
});

test("the scope text wraps and can run across a page break without losing a line", () => {
  const d = sample(); d.job.scope = Array.from({ length: 100 }, (_, i) => `Scope line ${i + 1}`).join("\n");   // about 1,300 characters, under the 1,500 limit
  const L = C.layout(d);
  const n = texts(L).flat().filter(v => /^Scope line \d+/.test(v)).length;
  assert.equal(n, d.job.scope.split("\n").length);
  L.pages.forEach(p => assert.ok(inside(L, p)));
});

test("nothing is printed wider than its column", () => {
  const d = sample();
  d.items[0].desc = "A very long description that goes on and on ".repeat(5);
  d.items[1].desc = "Supercalifragilisticexpialidocious".repeat(4);
  d.from.name = "An extremely long business name that would normally run into the title ".repeat(2);
  d.from.email = "x".repeat(70) + "@example.com";
  const L = C.layout(d);
  const R = L.W - 42;
  for (const p of L.pages) for (const x of p) if (x.t === "text") {
    const w = C.textW(x.v, x.f, x.s);
    const [left, right] = x.a === "right" ? [x.x - w, x.x] : x.a === "center" ? [x.x - w / 2, x.x + w / 2] : [x.x, x.x + w];
    assert.ok(left >= 41.9 && right <= R + 0.5, `"${x.v.slice(0, 30)}" spans ${left.toFixed(1)}..${right.toFixed(1)}`);
  }
});

test("characters the PDF fonts cannot print are reported, and accents survive", () => {
  const d = sample(); d.items[0].desc = "Install light 💡 in kitchen"; d.to.name = "Łukasz Müller-Çelik"; d.job.title = "Café – bar";
  const L = C.layout(d);
  assert.deepEqual(L.lost, ["💡"]);
  const all = texts(L).flat();
  assert.ok(all.includes("Lukasz Müller-Çelik")); assert.ok(all.some(v => v.includes("Café – bar")));
  assert.ok(all.some(v => v === "Install light in kitchen"));
});

test("the PDF has the same pages as the layout, a logo is embedded, and a broken logo is ignored", async () => {
  for (const [n, logo] of [[5, ""], [50, PNG_1PX], [5, "data:image/png;base64,AAAA"]]) {
    const d = rowsOf(n); d.from.logo = logo; d.from.logoRatio = 1;
    const r = await C.buildPdf(PDFLib, d);
    assert.equal(Buffer.from(r.bytes.slice(0, 5)).toString(), "%PDF-");
    assert.equal(r.pages, C.layout(d).pages.length);
    const back = await PDFLib.PDFDocument.load(r.bytes);
    assert.equal(back.getPageCount(), r.pages);
    assert.equal(back.getPage(0).getWidth(), 612);
    assert.ok(r.bytes.length > 1500);
  }
  const bad = await C.buildPdf(PDFLib, { ...sample(), from: { name: "x", logo: "data:image/png;base64,####" } });
  assert.ok(bad.pages >= 1);
});

test("the SVG preview draws the same text as the PDF and escapes it", () => {
  const d = sample(); d.items[0].desc = `Wire <b> & "fuses"`;
  const L = C.layout(d);
  const svg = C.svgPage(L.pages[0], L.W, L.H, "");
  assert.match(svg, /^<svg /); assert.ok(svg.includes("Wire &lt;b&gt; &amp; &quot;fuses&quot;")); assert.ok(!svg.includes("<b>"));
  assert.ok(svg.includes(C.money(C.calc(d).total, "USD")));
});

test("the plain-text copy lists the lines and totals", () => {
  const d = sample(); d.tax.pct = 7.25; d.deposit = { mode: "amt", value: 500 };
  const t = C.toText(d);
  assert.match(t, /^ESTIMATE EST-0001/); assert.ok(t.includes("Electrician labor: 8 hr x $95.00 = $760.00"));
  assert.ok(t.includes("TOTAL: " + C.money(C.calc(d).total, "USD"))); assert.ok(t.includes("Deposit to start: $500.00"));
});
