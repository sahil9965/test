// Unit tests for the PanelDex core (numbering, legs/phases, breaker placement, totals, CSV, share links, XLSX).
// Usage: node --test src/paneldex/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/paneldex");
const C = createRequire(import.meta.url)(join(SITE, "core.js"));
const panel = (raw = {}) => { const r = C.normalize({ name: "Test", spaces: 40, ...raw }); assert.deepEqual(r.warnings, []); return r.panel; };
const ck = (desc, amps, va, extra = {}) => ({ desc, amps, va, ...extra });

test("numbering: odd down the left, even down the right, one bus row per pair", () => {
  assert.equal(C.sideOf(1), "left"); assert.equal(C.sideOf(2), "right"); assert.equal(C.sideOf(41), "left");
  assert.deepEqual([1, 2, 3, 4, 41, 42].map(C.rowOf), [1, 1, 2, 2, 21, 21]);
  const g = C.grid(panel({ spaces: 42 }));
  assert.equal(g.length, 21);
  assert.deepEqual([g[0].left.sp, g[0].right.sp, g[20].left.sp, g[20].right.sp], [1, 2, 41, 42]);
  assert.equal(C.normSpaces(13), 14); assert.equal(C.normSpaces(2), 12); assert.equal(C.normSpaces(200), 84);
});

test("legs: split-phase rows alternate L1/L2; three-phase rows cycle A/B/C", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 41, 42].map(s => C.legOf("1p240", s)), ["L1", "L1", "L2", "L2", "L1", "L1", "L1", "L1"]);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(s => C.legOf("3p208", s)), ["A", "A", "B", "B", "C", "C", "A", "A"]);
  assert.equal(C.legOf("3p480", 41), "C");
  assert.equal(C.legOf("3p480", 42), "C");
});

test("2-pole and 3-pole placement: adjacent spaces in one column on different legs", () => {
  const p = panel({ system: "3p208", breakers: [{ sp: 1, type: "3", a: ck("RTU", 40, 9000) }, { sp: 2, type: "2", a: ck("WH", 30, 4000) }] });
  const [rtu, wh] = C.circuits(p);
  assert.deepEqual(rtu.spaces, [1, 3, 5]); assert.deepEqual(rtu.legs, ["A", "B", "C"]); assert.equal(rtu.id, "1/3/5");
  assert.deepEqual(wh.spaces, [2, 4]); assert.deepEqual(wh.legs, ["A", "B"]); assert.equal(wh.id, "2/4");
  const s = panel({ breakers: [{ sp: 3, type: "2", a: ck("Range", 50, 8000) }] });
  assert.deepEqual(C.circuits(s)[0].legs, ["L2", "L1"]);
  const g = C.grid(s);
  assert.equal(g[1].left.b, g[2].left.b); assert.equal(g[1].left.pole, 0); assert.equal(g[2].left.pole, 1);
});

test("invalid placements are rejected", () => {
  const p = panel({ breakers: [{ sp: 3, type: "2", a: ck("Range", 50, 8000) }] });
  assert.match(C.placeError(p, 39, "2"), /off the bottom.*39 and 41/);
  assert.match(C.placeError(p, 40, "2"), /off the bottom/);
  assert.equal(C.placeError(p, 37, "2"), null);
  assert.match(C.placeError(p, 7, "3"), /three-phase/);
  assert.match(C.placeError(p, 1, "2"), /Space 3 is already used by circuit 3\/5 \(Range\)/);
  assert.match(C.placeError(p, 5, "1"), /already used/);
  assert.match(C.placeError(p, 43, "1"), /outside/);
  // setType refuses and leaves the panel unchanged
  assert.match(C.setType(p, 1, "2"), /already used/);
  assert.equal(p.breakers.length, 1);
  assert.equal(C.setType(p, 1, "1"), null);
  assert.equal(C.setType(p, 3, "1"), null); // shrinking the range frees space 5
  assert.equal(C.placeError(p, 5, "1"), null);
  // spaces and system changes are blocked when they would orphan a breaker
  const t = panel({ system: "3p208", breakers: [{ sp: 35, type: "3", a: ck("Fan", 15, 900) }] });
  assert.match(C.setSpaces(t, 30), /35\/37\/39/);
  assert.match(C.setSystem(t, "1p240"), /3-pole/);
  assert.equal(t.spaces, 40); assert.equal(t.system, "3p208");
  // normalize drops overlapping or impossible breakers with a warning
  const r = C.normalize({ spaces: 12, breakers: [{ sp: 1, type: "2", a: {} }, { sp: 3, type: "1", a: {} }, { sp: 11, type: "2", a: {} }, { sp: 2, type: "3", a: {} }] });
  assert.equal(r.panel.breakers.length, 1);
  assert.equal(r.warnings.length, 3);
});

test("tandem breakers: two circuits in one space, numbered nA and nB on the same leg", () => {
  const p = panel({ breakers: [{ sp: 13, type: "t", a: ck("Bedroom 1", 15, 600), b: ck("Bedroom 2", 15, 500) }] });
  const cs = C.circuits(p);
  assert.deepEqual(cs.map(c => c.id), ["13A", "13B"]);
  assert.deepEqual(cs.map(c => c.legs[0]), ["L1", "L1"]);
  assert.equal(C.circuitLabel(p.breakers[0]), "13A/13B");
  assert.deepEqual(C.labelItems(p).map(i => i.num), ["13A", "13B"]);
  assert.match(C.placeError(p, 13, "1"), /13A\/13B/);
});

test("totals: VA per leg, multi-pole split evenly, amps and imbalance", () => {
  const p = panel({ breakers: [
    { sp: 1, type: "1", a: ck("A", 20, 1500) },           // L1
    { sp: 3, type: "2", a: ck("Range", 50, 8000) },       // L2 + L1
    { sp: 4, type: "t", a: ck("x", 15, 600), b: ck("y", 15, 400) }, // L2
    { sp: 6, type: "1", a: ck("B", 20, "") },             // blank load counts as 0
  ] });
  const t = C.totals(p);
  assert.deepEqual(t.legs.map(l => l.va), [5500, 5000]);
  assert.equal(t.total, 10500);
  assert.equal(t.legs[0].amps, 5500 / 120);
  assert.ok(Math.abs(t.imbalance - (500 / 5500) * 100) < 1e-9);
  assert.match(t.formula, /÷ 120 V/);
  const p3 = panel({ system: "3p480", breakers: [{ sp: 1, type: "3", a: ck("Motor", 30, 9000) }, { sp: 2, type: "1", a: ck("Lights", 20, 2770) }] });
  const t3 = C.totals(p3);
  assert.deepEqual(t3.legs.map(l => l.va), [5770, 3000, 3000]);
  assert.equal(t3.legs[0].amps, 5770 / 277);
  assert.ok(Math.abs(t3.imbalance - (2770 / 5770) * 100) < 1e-9);
  assert.equal(C.totals(panel()).imbalance, 0);
});

test("CSV round-trips every field, including tandems, multi-pole and tricky text", () => {
  for (const key of ["home", "p3", "p42"]) {
    const p = C.example(key);
    const back = C.fromCSV(C.toCSV(p));
    assert.deepEqual(back.warnings, []);
    assert.deepEqual(back.panel, p);
  }
  const odd = panel({ name: 'Unit "B", 2nd floor', location: "=SUM(A1)", breakers: [{ sp: 1, type: "1", a: ck("-Lights, hall; stairs", 15, 300, { wire: "14", prot: "afci", room: "Hall\nway" }) }] });
  const csv = C.toCSV(odd);
  assert.match(csv, /'=SUM\(A1\)/);
  assert.deepEqual(C.fromCSV(csv).panel, odd);
  assert.match(C.fromCSV("a,b\n1,2").error, /PanelDex CSV/);
});

test("share link round-trips through the compressed URL hash", async () => {
  for (const key of ["home", "p3"]) {
    const p = C.example(key);
    const code = await C.encodeShare(p);
    assert.match(code, /^1[\w-]+$/);
    assert.ok(C.shareUrl(code).length < 1500, "fits comfortably in a QR code");
    const r = await C.decodeShare(code);
    assert.deepEqual(r.panel, p);
  }
  assert.equal(await C.decodeShare("1garbage!!"), null);
  assert.equal(await C.decodeShare(""), null);
});

test("XLSX: valid zip with live SUMIF formulas that LibreOffice computes to the same totals", () => {
  const dir = mkdtempSync(join(tmpdir(), "paneldex-"));
  try {
    for (const key of ["home", "p3"]) {
      const p = C.example(key), t = C.totals(p);
      const f = join(dir, `${key}.xlsx`);
      writeFileSync(f, C.xlsxBytes(p));
      const { legRows } = C.xlsxRows(p);
      // openpyxl opens it and sees the formulas
      const py = `import openpyxl,sys,json
wb=openpyxl.load_workbook(sys.argv[1]); ws=wb.active
rows=[int(x) for x in sys.argv[2].split(",")]
out={"legs":[ws.cell(r,1).value for r in rows],"f":[ws.cell(r,2).value for r in rows],"total":ws.cell(rows[-1]+1,2).value,"imb":ws.cell(rows[-1]+2,2).value,"pole":ws.cell(10,12).value,"credit":ws.cell(rows[-1]+6,1).value}
print(json.dumps(out))`;
      const o = JSON.parse(execFileSync("python3", ["-I", "-c", py, f, legRows.join(",")]).toString());
      assert.deepEqual(o.legs, t.legs.map(l => l.leg));
      for (const fx of o.f) assert.match(fx, /^=SUMIF\(\$D\$10:\$D\$\d+,"(L1|L2|A|B|C)",\$L\$10:\$L\$\d+\)$/);
      assert.match(o.total, /^=SUM\(B\d+:B\d+\)$/);
      assert.match(o.imb, /^=IF\(MAX/);
      assert.equal(o.pole, "=K10/H10");
      assert.match(o.credit, /HYPERLINK\("https:\/\/panelschedule\.roohsites\.com\/\?utm_source=paneldex&utm_medium=watermark&utm_campaign=referral","Made with PanelDex/);
      // LibreOffice recalculates on load; its computed totals must match the engine
      execFileSync("libreoffice", ["--headless", "--convert-to", "csv", "--outdir", dir, f], { stdio: "ignore", timeout: 120000 });
      const csv = C.parseCSV(readFileSync(join(dir, `${key}.csv`), "utf8"));
      // CSV export may write the raw value or the formatted one, so compare numerically
      const num = v => Number(String(v).replace(/[,%\s]/g, ""));
      const pct = v => (String(v).includes("%") ? num(v) : num(v) * 100);
      const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
      legRows.forEach((r, i) => {
        assert.equal(csv[r - 1][0], t.legs[i].leg);
        near(num(csv[r - 1][1]), t.legs[i].va, 0.5, `${key} ${t.legs[i].leg} VA`);
        near(num(csv[r - 1][2]), t.legs[i].amps, 0.05, `${key} ${t.legs[i].leg} amps`);
      });
      const last = legRows[legRows.length - 1];
      near(num(csv[last][1]), t.total, 0.5, `${key} total`);
      near(pct(csv[last + 1][1]), t.imbalance, 0.005, `${key} imbalance`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
