// Unit tests for the ScoreNight core (input limits, page geometry, sheet contents, scoring rules, PDF pages).
// Usage: node --test src/scorenight/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/scorenight");
const require = createRequire(import.meta.url);
const C = require(join(SITE, "core.js"));
const PDFLib = require(join(SITE, "vendor/pdf-lib.min.js"));
const EPS = 1e-6;
const inside = (r, W, H) => r.x >= -EPS && r.y >= -EPS && r.x + r.w <= W + EPS && r.y + r.h <= H + EPS;
const overlap = (a, b) => a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;
const ALL = Object.keys(C.GAMES).flatMap(game => C.GAMES[game].per.flatMap(per => ["letter", "a4"].map(paper => ({ game, per, paper }))));

test("normalize clamps everything to printable values", () => {
  const { s } = C.normalize({ game: "nope", per: 9, players: 99, sets: -3, yGames: 40, names: ["<b>Ana</b>"] });
  assert.equal(s.game, "yahtzee"); assert.equal(s.per, 2); assert.equal(s.players, 8); assert.equal(s.sets, 1); assert.equal(s.yGames, 6);
  assert.equal(s.names[0], "<b>Ana</b>"); // text is escaped when drawn, not stripped
  assert.equal(C.normalize({ game: "farkle", players: 1 }).s.players, 2);
  assert.equal(C.normalize({ game: "blank", players: 12 }).s.players, 10);
  assert.equal(C.normalize({ game: "farkle", per: 4 }).s.per, 1, "Farkle has no 4-up layout, so it falls back to its usual one per page");
  assert.equal(C.normalize({ game: "mexican" }).s.per, 2);
  assert.equal(C.normalize({ game: "yahtzee", per: 4, large: true }).s.per, 1, "large print is one per page");
  assert.equal(C.normalize({ game: "mexican", mSet: 11 }).s.mSet, 12);
  assert.equal(C.normalize({ game: "farkle", fEntry: "" }).s.fEntry, 500);
  assert.equal(C.normalize({ game: "farkle", fEntry: 0 }).s.fEntry, 0);
});

test("half-page sheets cap turns and rounds, and say so", () => {
  const f = C.normalize({ game: "farkle", per: 2, fTurns: 30 });
  assert.equal(f.s.fTurns, C.MAX_HALF); assert.ok(f.notes.some(n => /turns/.test(n)));
  assert.equal(C.normalize({ game: "farkle", per: 1, fTurns: 30 }).s.fTurns, 30);
  const b = C.normalize({ game: "blank", per: 2, bRounds: 25 });
  assert.equal(b.s.bRounds, C.MAX_HALF); assert.ok(b.notes.some(n => /rounds/.test(n)));
});

test("names that can't print are reported, accents survive", () => {
  const r = C.normalize({ game: "blank", players: 3, names: ["José", "Zoë", "李"] });
  assert.deepEqual(r.s.names.slice(0, 2), ["José", "Zoë"]);
  assert.equal(r.s.names[2], "");
  assert.ok(r.notes.some(n => n.includes("李")));
});

test("every layout: sheets sit inside the margins and never overlap", () => {
  for (const o of ALL) {
    const { s } = C.normalize(o), g = C.geometry(s);
    assert.equal(g.cells.length, s.per, JSON.stringify(o));
    for (const c of g.cells) {
      assert.ok(inside(c, g.pageW, g.pageH), JSON.stringify(o));
      assert.ok(c.x >= 36 - EPS && c.y >= 42 - EPS && c.x + c.w <= g.pageW - 36 + EPS && c.y + c.h <= g.pageH - 36 + EPS);
    }
    for (let i = 0; i < g.cells.length; i++) for (let j = i + 1; j < g.cells.length; j++) assert.ok(!overlap(g.cells[i], g.cells[j]));
  }
});

test("every layout: all drawing stays inside its sheet, rows stay readable, one credit per page", () => {
  for (const o of ALL) for (const large of [false, true]) {
    const L = C.layoutPages(Object.assign({ players: 8, sets: 3, fTurns: 30, bRounds: 30, mSet: 15, large }, o));
    assert.ok(L.minRow >= 11.5, `${JSON.stringify(o)} rows ${L.minRow}`);
    for (const page of L.pages) {
      assert.equal(page.filter(p => p.t === "text" && p.v === C.CREDIT).length, 1);
      for (const p of page) {
        if (p.t === "text" && p.v !== C.CREDIT) assert.ok(p.y > 42 && p.y < L.g.pageH - 36 && p.s >= 4.5, `${JSON.stringify(o)} ${p.v} ${p.y} ${p.s}`);
        if (p.t === "rect") assert.ok(inside(p, L.g.pageW, L.g.pageH));
      }
    }
  }
});

test("card counts: Yahtzee is one card per player per set; the others one sheet per set", () => {
  assert.equal(C.layoutPages({ game: "yahtzee", per: 2, players: 4, sets: 2 }).cards, 8);
  assert.equal(C.layoutPages({ game: "yahtzee", per: 2, players: 4, sets: 2 }).pages.length, 4);
  assert.equal(C.layoutPages({ game: "yahtzee", per: 4, players: 3, sets: 1 }).pages.length, 1);
  assert.equal(C.layoutPages({ game: "farkle", per: 2, players: 4, sets: 3 }).pages.length, 2);
});

test("sheet contents: Yahtzee rows, Farkle chart, Mexican Train rounds", () => {
  const y = C.spec(C.normalize({ game: "yahtzee", players: 2, names: ["Ana", "Ben"] }).s, 3);
  assert.equal(y.who[1], "Ben", "the 4th card goes to the 2nd player");
  assert.equal(y.rows.filter(r => !r.k).length, 14);
  assert.ok(y.rows.some(r => r.l === "Bonus" && /63/.test(r.h)));
  const f = C.spec(C.normalize({ game: "farkle", per: 1, fEntry: 0, fTarget: 5000 }).s, 0);
  assert.match(f.sub, /No minimum.*5,000/);
  assert.equal(f.chart.length, 15);
  assert.equal(C.spec(C.normalize({ game: "farkle", per: 2 }).s, 0).chart, null);
  assert.deepEqual(C.farkleChart(C.normalize({ fOnes: 300 }).s).find(r => r[0] === "Three 1s"), ["Three 1s", "300"]);
  assert.match(C.farkleChart(C.normalize({ fFour: "double" }).s).find(r => r[0] === "Four of a kind")[1], /2 ×/);
  assert.deepEqual(C.mexRounds(12).slice(0, 2), [12, 11]);
  assert.equal(C.mexRounds(12).length, 13); assert.equal(C.mexRounds(9).at(-1), 0);
  const m = C.spec(C.normalize({ game: "mexican", mSet: 9 }).s, 0);
  assert.equal(m.rows.length, 11); assert.equal(m.rows[0].l, "Double 9");
});

test("Yahtzee rules: valid boxes and the upper bonus at 63", () => {
  assert.ok(C.yValid("threes", 12)); assert.ok(!C.yValid("threes", 13)); assert.ok(!C.yValid("threes", 18));
  assert.ok(C.yValid("full", 25)); assert.ok(C.yValid("full", 0)); assert.ok(!C.yValid("full", 20));
  assert.ok(C.yValid("chance", 30)); assert.ok(!C.yValid("chance", 31)); assert.ok(!C.yValid("chance", 3)); assert.ok(C.yValid("chance", ""));
  assert.ok(!C.yValid("ones", -1)); assert.ok(!C.yValid("ones", 1.5));
  const at62 = C.yTotals({ ones: 2, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
  assert.equal(at62.upper, 62); assert.equal(at62.bonus, 0);
  const at63 = C.yTotals({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
  assert.equal(at63.bonus, 35); assert.equal(at63.upperTotal, 98);
  const full = C.yTotals({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18, three: 20, four: 22, full: 25, small: 30, large: 40, yahtzee: 50, chance: 23, ybonus: 2 });
  assert.equal(full.lower, 20 + 22 + 25 + 30 + 40 + 50 + 23 + 200); assert.equal(full.total, 98 + full.lower); assert.ok(full.done);
  assert.equal(C.yTotals({ full: 20 }).lower, 0, "an invalid box doesn't count");
});

test("Farkle rules: entry minimum, final round and winner", () => {
  let st = C.farkleStatus([[300, 600], [500]], 500, 10000);
  assert.deepEqual(st.totals, [600, 500], "300 doesn't get Ana on the board; 600 does");
  assert.equal(st.next, 1);
  st = C.farkleStatus([[0], [0], [0]], 0, 1000);
  assert.deepEqual(st.totals, [0, 0, 0]); assert.equal(st.next, 0);
  // Ben (player 1) passes 1,000 in round 1: Cara still has her round-1 turn, Ana gets one more
  st = C.farkleStatus([[400], [1000], []], 0, 1000);
  assert.ok(st.finalRound); assert.equal(st.trigger.p, 1); assert.equal(st.next, 2);
  st = C.farkleStatus([[400], [1000], [300]], 0, 1000);
  assert.ok(st.finalRound); assert.equal(st.next, 0);
  st = C.farkleStatus([[400, 700], [1000], [300]], 0, 1000);
  assert.ok(st.done); assert.deepEqual(st.winners, [0], "Ana catches up and wins with 1,100");
  st = C.farkleStatus([[400, 600], [1000], [300]], 0, 1000);
  assert.deepEqual(st.winners, [0, 1], "a tie lists both players");
});

test("round games: totals, done and lowest-wins leaders", () => {
  const r = C.roundStatus([[5, 0, 12], [3, 9, 1]], 3, true);
  assert.deepEqual(r.totals, [17, 13]); assert.ok(r.done); assert.deepEqual(r.leaders, [1]);
  const h = C.roundStatus([[5, ""], [3, 9]], 2, false);
  assert.ok(!h.done); assert.deepEqual(h.leaders, [1]);
});

test("PDF: page count, page size and metadata", async () => {
  for (const [o, pages, w] of [[{ game: "yahtzee", per: 2, players: 4 }, 2, 612], [{ game: "farkle", per: 1, sets: 2, paper: "a4" }, 2, 595.28], [{ game: "mexican", per: 2, sets: 2 }, 1, 612]]) {
    const r = await C.buildPdf(PDFLib, o);
    const doc = await PDFLib.PDFDocument.load(r.bytes);
    assert.equal(doc.getPageCount(), pages); assert.equal(r.pages, pages);
    assert.ok(Math.abs(doc.getPage(0).getWidth() - w) < 0.01);
    assert.match(doc.getTitle(), /ScoreNight/);
  }
});
