// Unit tests for the LineupFair core: the rotation solver (property tests), the rule checker, batting order,
// share links, season tally and speed.   Usage: node --test src/lineupfair/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/lineupfair");
const C = createRequire(import.meta.url)(join(SITE, "core.js"));
const rngOf = C.mulberry32;

const player = (id, extra = {}) => ({ id, name: "P" + id, num: String(id), absent: false, late: 1, excl: [], locks: [], ...extra });
const roster = (n, f) => Array.from({ length: n }, (_, k) => player(k + 1, f ? f(k + 1) : {}));
const game = (o = {}) => C.normalizeGame({ innings: 6, format: "std9", players: roster(11), ...o });

/* ---- an independent re-implementation of the rules, used to check the solver AND the checker ---- */
function verify(G, chart) {
  const pos = C.positionsOf(G), N = G.innings, out = { hard: [], soft: { bench: 0, b2b: 0, minInf: 0, repeat: 0, limitP: 0, limitC: 0 } };
  const byId = new Map(G.players.map(p => [p.id, p]));
  const seq = new Map(G.players.map(p => [p.id, new Array(N).fill("")]));
  for (let i = 0; i < N; i++) {
    const row = chart[i], seen = new Set();
    for (const q of pos) {
      const id = row[q];
      if (id == null || !byId.has(id)) { out.hard.push(`inning ${i + 1}: ${q} unfilled`); continue; }
      const p = byId.get(id);
      if (seen.has(id)) out.hard.push(`inning ${i + 1}: player ${id} twice`);
      seen.add(id);
      if (p.absent) out.hard.push(`absent player ${id} in inning ${i + 1}`);
      if (p.late > i + 1) out.hard.push(`late player ${id} early in inning ${i + 1}`);
      if (p.excl.includes(q)) out.hard.push(`excluded ${id} at ${q}`);
      seq.get(id)[i] = q;
    }
    if (Object.keys(row).filter(k => pos.includes(k)).length !== pos.length) out.hard.push(`inning ${i + 1}: wrong number of positions`);
    for (const p of G.players) {
      const isPresent = !p.absent && p.late <= i + 1;
      if (isPresent && !seen.has(p.id)) seq.get(p.id)[i] = "B";
      for (const l of p.locks) if (l.from <= i + 1 && i + 1 <= l.to && row[l.pos] !== p.id) out.hard.push(`lock broken: ${p.id} ${l.pos} inning ${i + 1}`);
    }
  }
  const R = G.rules, infield = C.infieldList(G), groups = new Map();
  for (const p of G.players) {
    const s = seq.get(p.id), sig = s.map(v => (v ? 1 : 0)).join("");
    if (!sig.includes("1")) continue;
    const bench = s.filter(v => v === "B").length;
    (groups.get(sig) || groups.set(sig, []).get(sig)).push(bench);
    const played = s.filter(v => v && v !== "B");
    for (let i = 0; i < N; i++) {
      if (R.noB2B && s[i] === "B" && s[i + 1] === "B") out.soft.b2b++;
      const locked = p.locks.some(l => l.from <= i + 1 && i + 1 <= l.to && l.pos === s[i]);
      if (R.noRepeat && i > 0 && s[i] && s[i] !== "B" && s[i] === s[i - 1] && !locked) out.soft.repeat++;
    }
    if (R.minInf && played.filter(q => infield.includes(q)).length < Math.min(R.minInfN, played.length)) out.soft.minInf++;
    if (R.limits && R.maxP > 0 && played.filter(q => q === "P").length > R.maxP) out.soft.limitP++;
    if (R.limits && R.maxC > 0 && played.filter(q => q === "C").length > R.maxC) out.soft.limitC++;
  }
  if (R.bench) for (const counts of groups.values()) if (counts.length > 1 && Math.max(...counts) - Math.min(...counts) > 1) out.soft.bench++;
  return out;
}

/* ---- random cases ---- */
function randomCase(n, easy) {
  const rng = rngOf(1000 + n), pick = a => a[Math.floor(rng() * a.length)], ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  for (let attempt = 0; attempt < 40; attempt++) {
    const format = easy ? pick(["std9", "std9", "of4", "coach", "tball"]) : pick(["std9", "of4", "coach", "tball", "custom"]);
    const custom = C.POS_ORDER.filter(() => rng() < 0.7);
    const opts = { coachP: rng() < 0.7, tCatcher: rng() < 0.3, tFielders: ri(8, 12), custom: custom.length >= 5 ? custom : C.STD9, catcherInfield: rng() < 0.8 };
    const K = C.positionsOf({ format, opts }).length;
    const np = easy ? ri(K + 1, Math.min(15, K + 4)) : ri(Math.max(9, K - 1), 15);
    const innings = easy ? ri(4, 9) : ri(3, 9);
    const players = roster(np);
    if (!easy) {
      players.forEach(p => {
        if (rng() < 0.15) p.absent = true;
        else if (rng() < 0.15) p.late = ri(2, innings);
        const ex = []; if (rng() < 0.3) ex.push("C"); if (rng() < 0.2) ex.push("P"); if (rng() < 0.1) ex.push(pick(C.POS_ORDER));
        p.excl = [...new Set(ex)];
      });
      for (let l = ri(0, 3); l > 0; l--) {
        const p = pick(players), q = pick(["P", "C", "1B", "SS", "LF"]), from = ri(1, innings), to = Math.min(innings, from + ri(0, 2));
        p.locks.push({ pos: q, from, to });
      }
    }
    const G = C.normalizeGame({ innings, format, opts, players, seed: n });
    if (C.validate(G).length === 0) return G;
  }
  return game({ seed: n });
}

test("property: 600 random cases satisfy every hard constraint and the checker agrees with an independent verifier", () => {
  const total = { bench: 0, b2b: 0, minInf: 0, repeat: 0, limitP: 0, limitC: 0 }, flagged = { ...total };
  let withLocks = 0, withExcl = 0, withAbsent = 0, withLate = 0;
  const N = 600;
  for (let n = 0; n < N; n++) {
    const G = randomCase(n, false), r = C.solve(G);
    assert.ok(r.ok, `case ${n}: ${JSON.stringify(r.errors)}`);
    const v = verify(G, r.chart);
    assert.deepEqual(v.hard, [], `case ${n}`);
    // checker == independent verifier, rule by rule
    const byRule = { bench: 0, b2b: 0, minInf: 0, repeat: 0, limitP: 0, limitC: 0 };
    r.issues.filter(x => !x.hard).forEach(x => byRule[x.rule]++);
    assert.deepEqual(byRule, v.soft, `case ${n}: checker and verifier disagree`);
    assert.equal(r.issues.filter(x => x.hard).length, 0, `case ${n}`);
    for (const k in total) { total[k] += v.soft[k]; if (v.soft[k]) flagged[k]++; }
    if (G.players.some(p => p.locks.length)) withLocks++;
    if (G.players.some(p => p.excl.length)) withExcl++;
    if (G.players.some(p => p.absent)) withAbsent++;
    if (G.players.some(p => p.late > 1)) withLate++;
  }
  console.log(`# ${N} random cases (${withLocks} with locks, ${withExcl} with exclusions, ${withAbsent} with absences, ${withLate} with late arrivals)`);
  console.log(`# soft-rule violations reported across all hard cases: ${JSON.stringify(total)}; cases affected: ${JSON.stringify(flagged)}`);
  assert.ok(withLocks > 200 && withExcl > 300 && withAbsent > 200 && withLate > 150);
  // Most of the leftover violations are forced by the inputs themselves (a lock longer than the pitcher limit, an infield
  // minimum for a player locked in the outfield). Keep an eye on the overall rate so the solver does not regress.
  const casesWithAny = Math.max(...Object.values(flagged));
  assert.ok(Object.values(flagged).reduce((a, b) => a + b, 0) < N * 0.12, "soft violations in hard cases stay rare: " + JSON.stringify(flagged));
  assert.ok(casesWithAny < N * 0.05);
});

test("property: easy rosters (no locks, exclusions or absences) break none of the soft rules", () => {
  const total = { bench: 0, b2b: 0, minInf: 0, repeat: 0, limitP: 0, limitC: 0 };
  const N = 500;
  for (let n = 0; n < N; n++) {
    const G = randomCase(n, true), r = C.solve(G);
    assert.ok(r.ok);
    const v = verify(G, r.chart);
    assert.deepEqual(v.hard, []);
    for (const k in total) total[k] += v.soft[k];
    assert.equal(r.issues.length, 0, `easy case ${n} (${G.format}, ${G.players.length} players, ${G.innings} innings): ${r.issues.map(x => x.text).join(" | ")}`);
  }
  console.log(`# easy rosters: ${N} cases, soft violations ${JSON.stringify(total)}`);
  for (const k in total) assert.equal(total[k], 0, k);
});

test("easy roster from the brief: 11 players, 6 innings, standard 9, across 300 seeds", () => {
  for (let s = 1; s <= 300; s++) {
    const G = game({ seed: s }), r = C.solve(G);
    assert.ok(r.ok);
    assert.equal(r.issues.length, 0, `seed ${s}: ${r.issues.map(x => x.text).join(" | ")}`);
    const bench = Object.values(r.stats).map(x => x.bench);
    assert.ok(Math.max(...bench) - Math.min(...bench) <= 1);
    assert.equal(bench.reduce((a, b) => a + b, 0), 12);
  }
});

test("determinism: same seed gives the same chart, Shuffle (a new seed) gives a different one", () => {
  const G = game();
  const a = C.solve(G, 7), b = C.solve(G, 7), c2 = C.solve(G, 8);
  assert.deepEqual(a.chart, b.chart);
  assert.notDeepEqual(a.chart, c2.chart);
  let different = 0;
  for (let s = 1; s <= 40; s++) if (JSON.stringify(C.solve(G, s).chart) !== JSON.stringify(C.solve(G, s + 1).chart)) different++;
  assert.equal(different, 40);
});

test("infeasible inputs return a clear error and never a chart", () => {
  let r = C.solve(game({ players: roster(8) }));
  assert.equal(r.ok, false); assert.equal(r.chart, undefined);
  assert.match(r.errors[0].msg, /only 8 players are available for 9 positions/);
  r = C.solve(game({ players: roster(11, id => (id === 1 ? { absent: true, locks: [{ pos: "P", from: 1, to: 2 }] } : {})) }));
  assert.equal(r.ok, false);
  assert.match(r.errors.map(e => e.msg).join(" "), /P1 is locked to P but is marked absent/);
  r = C.solve(game({ players: roster(11, id => (id === 1 ? { late: 3, locks: [{ pos: "C", from: 2, to: 4 }] } : {})) }));
  assert.equal(r.ok, false); assert.match(r.errors[0].msg, /arrives in inning 3/);
  r = C.solve(game({ players: roster(11, id => (id === 1 ? { locks: [{ pos: "P", from: 1, to: 3 }, { pos: "C", from: 3, to: 4 }] } : {})) }));
  assert.equal(r.ok, false); assert.match(r.errors[0].msg, /locked to two positions in inning 3 \(P and C\)/);
  r = C.solve(game({ players: roster(11, id => (id <= 2 ? { locks: [{ pos: "SS", from: 1, to: 1 }] } : {})) }));
  assert.equal(r.ok, false); assert.match(r.errors[0].msg, /P1 and P2 are both locked to SS in inning 1/);
  r = C.solve(game({ players: roster(11, id => ({ excl: ["C"] })) }));
  assert.equal(r.ok, false); assert.match(r.errors[0].msg, /nobody available can play C/);
  r = C.solve(game({ players: roster(11, id => (id === 1 ? { excl: ["P"], locks: [{ pos: "P", from: 1, to: 1 }] } : {})) }));
  assert.equal(r.ok, false); assert.match(r.errors[0].msg, /also marked "not P"/);
  // a lock on a position the format does not have
  r = C.solve(game({ format: "coach", opts: { coachP: false }, players: roster(11, id => (id === 1 ? { locks: [{ pos: "P", from: 1, to: 1 }] } : {})) }));
  assert.equal(r.ok, false); assert.match(r.errors[0].msg, /not one of the positions/);
  // an empty roster
  assert.equal(C.solve(game({ players: [] })).ok, false);
  // a late arrival makes an early inning too short
  r = C.solve(game({ players: roster(9, id => (id === 1 ? { late: 3 } : {})) }));
  assert.equal(r.ok, false); assert.match(r.errors[0].msg, /Innings 1–2: only 8 players/);
});

test("locks and exclusions are hard; soft-rule trouble is reported by name and player", () => {
  // Only one player may catch, so the catcher limit cannot be met: the checker names the rule and the player.
  const G = game({ players: roster(11, id => (id === 1 ? {} : { excl: ["C"] })) });
  const r = C.solve(G);
  assert.ok(r.ok);
  assert.ok(r.chart.every(row => row.C === 1));
  const lim = r.issues.find(x => x.rule === "limitC");
  assert.ok(lim && lim.id === 1 && /P1 catches 6 innings; the limit is 2/.test(lim.text));
  // Lock P1 at pitcher for 4 innings with a limit of 2: allowed, flagged.
  const L = game({ players: roster(11, id => (id === 1 ? { locks: [{ pos: "P", from: 1, to: 4 }] } : {})) });
  const rl = C.solve(L);
  assert.ok(rl.ok && [0, 1, 2, 3].every(i => rl.chart[i].P === 1));
  assert.ok(rl.issues.some(x => x.rule === "limitP"));
  assert.equal(rl.issues.some(x => x.rule === "repeat"), false); // locked innings are exempt
});

test("rules can be switched off", () => {
  const G = game({ rules: { limits: false, noRepeat: false, minInf: false, noB2B: false, bench: false }, players: roster(11, id => (id === 1 ? {} : { excl: ["C"] })) });
  const r = C.solve(G);
  assert.ok(r.ok);
  assert.equal(r.issues.length, 0);
});

test("manual swaps: the checker flags broken rules and hard problems", () => {
  const G = game({ players: roster(11, id => (id === 2 ? { excl: ["C"] } : {})) }), r = C.solve(G);
  const row = r.chart[0], catcher = row.C, other = 2;
  let ch = C.swapCells(G, r.chart, 1, catcher, other);
  const res = C.check(G, ch);
  if (catcher !== other) {
    assert.equal(ch[0].C, other);
    assert.ok(res.issues.some(x => x.rule === "excl" && x.hard));
  }
  // swapping back restores the original
  assert.deepEqual(C.swapCells(G, ch, 1, catcher, other), r.chart);
  // a swap with a benched player moves the bench slot
  const benched = G.players.map(p => p.id).find(id => !Object.values(r.chart[0]).includes(id));
  const sw = C.swapCells(G, r.chart, 1, row.P, benched);
  assert.equal(sw[0].P, benched);
  assert.equal(C.check(G, sw).stats[row.P].seq[0], "B");
  // an empty chart is reported as unfilled positions
  assert.ok(C.check(G, null).issues.some(x => x.rule === "fill"));
});

test("late arrivals and absences: nobody sits before arriving, bench fairness among full-game players", () => {
  const G = game({ players: roster(13, id => (id === 3 ? { absent: true } : id === 5 ? { late: 3 } : {})) });
  const r = C.solve(G);
  assert.ok(r.ok);
  for (const row of r.chart.slice(0, 2)) assert.ok(!Object.values(row).includes(5) && !Object.values(row).includes(3));
  assert.equal(r.stats[5].seq[0], ""); assert.equal(r.stats[3].present, 0);
  assert.equal(r.issues.length, 0, r.issues.map(x => x.text).join(" | "));
});

test("formats: positions per preset", () => {
  const P = (format, opts) => C.positionsOf(C.normalizeGame({ format, opts }));
  assert.deepEqual(P("std9"), ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]);
  assert.deepEqual(P("of4"), ["P", "C", "1B", "2B", "3B", "SS", "LF", "LCF", "RCF", "RF"]);
  assert.deepEqual(P("coach"), C.STD9); assert.equal(P("coach", { coachP: false }).includes("P"), false);
  assert.equal(P("coach", { coachP: false }).length, 8);
  assert.deepEqual(P("tball", { tFielders: 8 }), ["P", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]);
  assert.equal(P("tball", { tFielders: 12 }).length, 12); assert.ok(P("tball", { tFielders: 12 }).includes("ROV"));
  assert.ok(P("tball", { tCatcher: true, tFielders: 9 }).includes("C"));
  assert.deepEqual(P("custom", { custom: ["P", "C", "LF"] }), ["P", "C", "LF"]);
  const g = C.normalizeGame({ format: "std9" });
  assert.deepEqual(C.infieldList(g), ["P", "C", "1B", "2B", "3B", "SS"]);
  assert.deepEqual(C.infieldList(C.normalizeGame({ opts: { catcherInfield: false } })), ["P", "1B", "2B", "3B", "SS"]);
});

test("batting order: rotation for the next game, late arrivals bat last, reorder", () => {
  const G = game({ players: roster(12, id => (id === 2 ? { late: 4 } : id === 5 ? { absent: true } : {})) });
  assert.deepEqual(C.effectiveOrder(G), [1, 3, 4, 6, 7, 8, 9, 10, 11, 12, 2]);
  const G2 = game({ players: roster(12, id => (id === 2 ? { late: 4 } : id === 3 ? { late: 2 } : {})) });
  assert.deepEqual(C.effectiveOrder(G2).slice(-2), [3, 2]); // earlier arrival first
  assert.deepEqual(C.rotate([1, 2, 3, 4, 5], 2), [3, 4, 5, 1, 2]);
  assert.deepEqual(C.rotate([1, 2, 3], 0), [1, 2, 3]); assert.deepEqual(C.rotate([1, 2, 3], 3), [1, 2, 3]); assert.deepEqual(C.rotate([], 2), []);
  const next = C.rotateOrder(G, 3);
  assert.deepEqual(next, [6, 7, 8, 9, 10, 11, 12, 2, 1, 3, 4, 5]); // top 3 (1,3,4) to the bottom; late 2 was already last; absent 5 trails
  assert.equal(next.length, 12); assert.equal(new Set(next).size, 12);
  assert.deepEqual(C.moveInOrder([1, 2, 3], 3, -1), [1, 3, 2]); assert.deepEqual(C.moveInOrder([1, 2, 3], 1, -1), [1, 2, 3]);
  const g3 = C.normalizeGame({ players: roster(3), order: [3, 1, 99] });
  assert.deepEqual(g3.order, [3, 1, 2]);
});

test("share link: the whole game and chart survive a round trip", () => {
  const G = game({
    label: "vs Tigers", innings: 7, format: "tball", opts: { tCatcher: true, tFielders: 11 }, seed: 99, rules: { minInfN: 2, maxP: 3, maxC: 0, bench: false },
    players: roster(13, id => (id === 2 ? { absent: true } : id === 4 ? { late: 3, excl: ["P", "C"] } : id === 6 ? { locks: [{ pos: "P", from: 1, to: 2 }, { pos: "C", from: 5, to: 6 }] } : {})),
  });
  G.players[0].name = "José Núñez";
  const r = C.solve(C.normalizeGame(G));
  assert.ok(r.ok, JSON.stringify(r.errors));
  const code = C.encodeShare(G, r.chart);
  assert.match(code, /^[\w-]+$/);
  assert.ok(code.length < 2200, "share code length " + code.length);
  const back = C.decodeShare(code);
  assert.deepEqual(back.game, C.normalizeGame(G));
  assert.deepEqual(back.chart, r.chart);
  assert.equal(C.decodeShare("not a code"), null); assert.equal(C.decodeShare(""), null); assert.equal(C.decodeShare(code.slice(0, 40)), null);
  // a hostile code cannot inject markup or break the model
  const evil = Buffer.from(JSON.stringify([1, "<img src=x onerror=1>", 99, 9, [], [], -5, [["<b>", "<i>", 1, 0, "ZZ", "P:9-1"]], "9", ["zzz"]])).toString("base64url");
  const e = C.decodeShare(evil);
  assert.ok(e && !/[<>]/.test(JSON.stringify(e.game)));
  assert.equal(e.game.innings, 9);
  // no chart shared
  assert.equal(C.decodeShare(C.encodeShare(G, null)).chart, null);
});

test("roster paste: names with optional jersey numbers", () => {
  assert.deepEqual(C.parseRoster("Maya\n7 Ben\n#12 Chloe Park\nDylan 4\nEllie, 9\n\n  Finn  \n"), [
    { name: "Maya", num: "" }, { name: "Ben", num: "7" }, { name: "Chloe Park", num: "12" }, { name: "Dylan", num: "4" }, { name: "Ellie", num: "9" }, { name: "Finn", num: "" },
  ]);
  assert.deepEqual(C.parseRoster(""), []);
});

test("season tally sums innings, bench, infield and positions across saved games", () => {
  const G1 = game({ players: roster(10, id => ({ name: id <= 3 ? ["Ann", "Bo", "Cy"][id - 1] : "X" + id })), seed: 3 }), r1 = C.solve(G1);
  const G2 = game({ players: roster(10, id => ({ name: id <= 3 ? ["Ann", "Bo", "Cy"][id - 1] : "X" + id })), seed: 4, innings: 5 }), r2 = C.solve(G2);
  const recs = [C.gameRecord(G1, r1.chart, "Game 1", "2026-04-01"), C.gameRecord(G2, r2.chart, "Game 2", "2026-04-08")];
  const t = C.seasonTally(recs), ann = t.find(x => x.name === "Ann");
  const s1 = r1.stats[1], s2 = r2.stats[1];
  assert.equal(ann.games, 2); assert.equal(ann.innings, 11);
  assert.equal(ann.bench, s1.bench + s2.bench); assert.equal(ann.played, s1.played + s2.played);
  assert.equal(ann.infield, s1.infield + s2.infield);
  assert.equal(Object.values(ann.pos).reduce((a, b) => a + b, 0), ann.played);
  assert.equal(t.reduce((a, x) => a + x.bench, 0), 6 + 5); // one bench slot per inning with 10 players
  assert.equal(t.length, 10);
  assert.equal(C.cleanRecord({ rows: [{ name: "<b>Z</b>", cells: ["P", "B", "", "zz"] }] }).rows[0].name, "bZ/b");
  assert.equal(C.cleanRecord(null), null);
});

test("performance: 15 players x 9 innings solves in under 200 ms", () => {
  const G = game({ innings: 9, players: roster(15, id => (id === 2 ? { excl: ["C"] } : id === 3 ? { late: 3 } : id === 4 ? { locks: [{ pos: "P", from: 1, to: 2 }] } : {})) });
  C.solve(G, 1); // warm up
  const times = [];
  for (let s = 1; s <= 10; s++) { const t0 = performance.now(); const r = C.solve(G, s); times.push(performance.now() - t0); assert.ok(r.ok); }
  // worst case: a rule that can never be met makes the solver use all of its retries
  const hard = game({ innings: 9, players: roster(15, id => (id === 4 ? { locks: [{ pos: "P", from: 1, to: 5 }] } : id === 5 ? { locks: [{ pos: "C", from: 1, to: 5 }] } : {})) });
  const worst = [];
  for (let s = 1; s <= 5; s++) { const t0 = performance.now(); const r = C.solve(hard, s); worst.push(performance.now() - t0); assert.ok(r.ok && r.issues.some(x => x.rule === "limitP")); }
  console.log(`# worst case (rule can never be met, all retries used): max ${Math.max(...worst).toFixed(1)} ms`);
  assert.ok(Math.max(...worst) < 200, `worst case ${Math.max(...worst)} ms`);
  console.log(`# 15 players x 9 innings: max ${Math.max(...times).toFixed(1)} ms, mean ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)} ms`);
  assert.ok(Math.max(...times) < 200, `slowest ${Math.max(...times)} ms`);
});
