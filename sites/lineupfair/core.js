/* LineupFair core: game model, fairness rules, the rotation solver, rule checker, batting order, season tally,
   share links and the four PDFs. No DOM access, so the same file runs on the page and in Node tests.
   jsPDF is passed in (vendor/jspdf-4.2.1.umd.min.js). PDF coordinates are points, origin top-left. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LFCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SITE = "https://lineup.roohsites.com";
  const CREDIT = "Made with LineupFair · lineup.roohsites.com";
  const CREDIT_URL = SITE + "/?utm_source=lineupfair&utm_medium=watermark&utm_campaign=referral";

  /* ------------------------------------------------------------ positions */
  const POS_ORDER = ["P", "C", "1B", "2B", "3B", "SS", "LF", "LCF", "CF", "RCF", "RF", "ROV", "SF"];
  const POS = {
    P: "Pitcher", C: "Catcher", "1B": "First base", "2B": "Second base", "3B": "Third base", SS: "Shortstop",
    LF: "Left field", LCF: "Left center", CF: "Center field", RCF: "Right center", RF: "Right field", ROV: "Rover", SF: "Short fielder",
  };
  // Where each position stands on the field diagram (fractions of the tile: x across, y down).
  const XY = {
    P: [0.5, 0.7], C: [0.5, 0.95], "1B": [0.84, 0.74], "2B": [0.67, 0.5], "3B": [0.16, 0.74], SS: [0.33, 0.5],
    LF: [0.12, 0.3], LCF: [0.31, 0.18], CF: [0.5, 0.14], RCF: [0.69, 0.18], RF: [0.88, 0.3], ROV: [0.12, 0.53], SF: [0.88, 0.53],
  };
  const STD9 = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
  const OF4 = ["P", "C", "1B", "2B", "3B", "SS", "LF", "LCF", "RCF", "RF"];
  const TBALL_BASE = ["P", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
  const TBALL_EXTRAS = ["ROV", "SF", "LCF", "RCF"];
  const FORMATS = { std9: "Standard 9", of4: "10 fielders, 4 outfielders", coach: "Coach pitch", tball: "T-ball", custom: "Custom" };
  const FORMAT_KEYS = Object.keys(FORMATS);
  const MAX_PLAYERS = 24, MAX_INNINGS = 9;
  const DEFAULT_RULES = { bench: true, noB2B: true, minInf: true, minInfN: 1, noRepeat: true, limits: true, maxP: 2, maxC: 2 };
  const RULE_NAMES = {
    bench: "Bench fairness", b2b: "No back-to-back bench", minInf: "Minimum infield innings", repeat: "No repeat position",
    limitP: "Pitcher innings limit", limitC: "Catcher innings limit",
  };

  const posSort = list => POS_ORDER.filter(p => list.includes(p));
  function positionsOf(G) {
    const o = G.opts || {};
    let list;
    if (G.format === "of4") list = OF4.slice();
    else if (G.format === "coach") list = STD9.filter(p => o.coachP !== false || p !== "P");
    else if (G.format === "tball") {
      list = TBALL_BASE.slice();
      if (o.tCatcher) list.splice(1, 0, "C");
      const extras = TBALL_EXTRAS.slice();
      while (list.length < (o.tFielders || 10) && extras.length) list.push(extras.shift());
    } else if (G.format === "custom") list = (o.custom || []).filter(p => POS[p]);
    else list = STD9.slice();
    return posSort(list);
  }
  function isInfield(G, p) {
    return p === "P" || p === "1B" || p === "2B" || p === "3B" || p === "SS" || (p === "C" && !!(G.opts && G.opts.catcherInfield));
  }
  const infieldList = G => positionsOf(G).filter(p => isInfield(G, p));

  /* ------------------------------------------------------------- the game */
  const clean = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
  const int = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  const bool = (v, d) => (v === undefined || v === null ? d : !!v);
  const nameOf = (p, i) => p.name || `Player ${i + 1}`;

  function normalizeGame(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    const ro = raw.opts && typeof raw.opts === "object" ? raw.opts : {};
    const rr = raw.rules && typeof raw.rules === "object" ? raw.rules : {};
    const D = DEFAULT_RULES;
    const G = {
      v: 1, label: clean(raw.label, 40), innings: int(raw.innings, 1, MAX_INNINGS, 6),
      format: FORMAT_KEYS.includes(raw.format) ? raw.format : "std9",
      opts: {
        catcherInfield: bool(ro.catcherInfield, true), coachP: bool(ro.coachP, true), tCatcher: bool(ro.tCatcher, false),
        tFielders: int(ro.tFielders, 8, 12, 10),
        custom: Array.isArray(ro.custom) ? posSort(ro.custom.filter(p => POS[p])) : STD9.slice(),
      },
      rules: {
        bench: bool(rr.bench, D.bench), noB2B: bool(rr.noB2B, D.noB2B), minInf: bool(rr.minInf, D.minInf), minInfN: int(rr.minInfN, 0, 9, D.minInfN),
        noRepeat: bool(rr.noRepeat, D.noRepeat), limits: bool(rr.limits, D.limits), maxP: int(rr.maxP, 0, 9, D.maxP), maxC: int(rr.maxC, 0, 9, D.maxC),
      },
      seed: int(raw.seed, 0, 2147483646, 1), players: [], order: [],
    };
    const used = new Set();
    let next = 1;
    for (const p of Array.isArray(raw.players) ? raw.players : []) {
      if (!p || typeof p !== "object" || G.players.length >= MAX_PLAYERS) continue;
      let id = Number.isInteger(p.id) && p.id > 0 && !used.has(p.id) ? p.id : 0;
      if (!id) { while (used.has(next)) next++; id = next; }
      used.add(id);
      const locks = [];
      for (const l of Array.isArray(p.locks) ? p.locks : []) {
        if (!l || !POS[l.pos]) continue;
        let a = int(l.from, 1, G.innings, 1), b = int(l.to, 1, G.innings, a);
        if (a > b) [a, b] = [b, a];
        locks.push({ pos: l.pos, from: a, to: b });
      }
      G.players.push({
        id, name: clean(p.name, 24), num: clean(p.num, 4), absent: !!p.absent, late: int(p.late, 1, G.innings, 1),
        excl: posSort([...new Set((Array.isArray(p.excl) ? p.excl : []).filter(x => POS[x]))]), locks,
      });
    }
    const ids = new Set(G.players.map(p => p.id));
    const ord = [];
    for (const id of Array.isArray(raw.order) ? raw.order : []) if (ids.has(id) && !ord.includes(id)) ord.push(id);
    for (const p of G.players) if (!ord.includes(p.id)) ord.push(p.id);
    G.order = ord;
    return G;
  }

  const emptyGame = () => normalizeGame({});
  function nextPlayerId(G) { return G.players.reduce((m, p) => Math.max(m, p.id), 0) + 1; }
  function parseRoster(text) {
    // One player per line; optional jersey number first ("7 Maya", "#7 Maya") or last ("Maya 7", "Maya #7", "Maya, 7").
    const out = [];
    for (let line of String(text || "").split(/\r?\n|;/)) {
      line = line.replace(/\t/g, " ").trim();
      if (!line) continue;
      let num = "", name = line, m;
      if ((m = line.match(/^#?(\d{1,3})\s*[.):\-,]?\s+(.+)$/))) { num = m[1]; name = m[2]; }
      else if ((m = line.match(/^(.+?)[\s,]+#?(\d{1,3})$/))) { name = m[1]; num = m[2]; }
      name = clean(name.replace(/^[\s,.\-•*]+|[\s,]+$/g, ""), 24);
      if (name) out.push({ name, num });
    }
    return out;
  }

  /* ---------------------------------------------------------- context/helpers */
  function ctx(G) {
    const positions = positionsOf(G), N = G.innings, K = positions.length;
    const byId = new Map(G.players.map((p, i) => [p.id, { p, i }]));
    const lockMap = Array.from({ length: N }, () => new Map()); // inning -> player id -> pos
    for (const p of G.players) for (const l of p.locks) for (let i = l.from; i <= l.to; i++) if (i <= N && !lockMap[i - 1].has(p.id)) lockMap[i - 1].set(p.id, l.pos);
    const present = (p, i) => !p.absent && p.late <= i + 1;
    return { G, positions, N, K, byId, lockMap, present, inf: q => isInfield(G, q) };
  }
  const rangeText = list => {
    const a = [...list].sort((x, y) => x - y), parts = [];
    for (let i = 0; i < a.length;) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; parts.push(j > i ? `${a[i]}–${a[j]}` : `${a[i]}`); i = j + 1; }
    return parts.join(", ");
  };
  const inningsText = list => (list.length === 1 ? `Inning ${list[0]}` : `Innings ${rangeText(list)}`);

  /* ------------------------------------------------------------ validation */
  // Max matching of positions to players (Kuhn). cand[q] = player indexes that may take position q.
  function matchPositions(cand, nPlayers) {
    const mp = new Array(nPlayers).fill(-1), unmatched = [];
    const tryQ = (q, seen) => {
      for (const pi of cand[q]) {
        if (seen[pi]) continue;
        seen[pi] = true;
        if (mp[pi] < 0 || tryQ(mp[pi], seen)) { mp[pi] = q; return true; }
      }
      return false;
    };
    for (let q = 0; q < cand.length; q++) if (!tryQ(q, new Array(nPlayers).fill(false))) unmatched.push(q);
    return unmatched;
  }
  // Returns a list of {code, msg}. Empty list = the inputs can be solved.
  function validate(G0) {
    const G = normalizeGame(G0), c = ctx(G), { positions, N, K } = c, errs = [];
    const add = (code, msg) => errs.push({ code, msg });
    if (K < 1) { add("positions", "No positions are selected. Tick at least one position under Custom."); return errs; }
    if (!G.players.length) { add("roster", "Add players to build a chart."); return errs; }
    const nm = p => nameOf(p, G.players.indexOf(p));
    // not enough players
    const short = [];
    for (let i = 0; i < N; i++) if (G.players.filter(p => c.present(p, i)).length < K) short.push(i + 1);
    if (short.length) {
      const have = Math.min(...short.map(i => G.players.filter(p => c.present(p, i - 1)).length));
      add("short", `${inningsText(short)}: only ${have} player${have === 1 ? " is" : "s are"} available for ${K} positions. Add players, mark fewer players absent or arriving late, or remove a position.`);
    }
    // locks
    for (const p of G.players) {
      for (const l of p.locks) {
        const first = l.from;
        if (!positions.includes(l.pos)) add("lock-format", `${nm(p)} is locked to ${l.pos}, which is not one of the positions in this format (${positions.join(", ")}). Remove the lock or change the format.`);
        if (p.absent) add("lock-absent", `${nm(p)} is locked to ${l.pos} but is marked absent. Remove the lock or mark ${nm(p)} available.`);
        else if (p.late > l.from) add("lock-late", `${nm(p)} is locked to ${l.pos} from inning ${first} but arrives in inning ${p.late}. Move the lock to inning ${p.late} or later, or change the arrival.`);
        if (p.excl.includes(l.pos)) add("lock-excl", `${nm(p)} is locked to ${l.pos} but is also marked "not ${l.pos}". Remove one of them.`);
      }
      for (let i = 0; i < N; i++) {
        const ps = [...new Set(p.locks.filter(l => l.from <= i + 1 && i + 1 <= l.to).map(l => l.pos))];
        if (ps.length > 1) add("lock-twice", `${nm(p)} is locked to two positions in inning ${i + 1} (${ps.join(" and ")}). A player can only be in one place.`);
      }
    }
    for (let i = 0; i < N; i++) {
      const byPos = {};
      for (const p of G.players) for (const l of p.locks) if (l.from <= i + 1 && i + 1 <= l.to) (byPos[l.pos] = byPos[l.pos] || new Set()).add(p.id);
      for (const q of Object.keys(byPos)) if (byPos[q].size > 1) add("lock-clash", `${[...byPos[q]].map(id => nm(c.byId.get(id).p)).join(" and ")} are both locked to ${q} in inning ${i + 1}.`);
    }
    if (errs.length) return dedupe(errs);
    // can every inning's positions be covered at all?
    const groups = new Map();
    for (let i = 0; i < N; i++) {
      const A = G.players.filter(p => c.present(p, i));
      if (A.length < K) continue;
      const lockedPos = new Map();
      for (const p of A) { const q = c.lockMap[i].get(p.id); if (q) lockedPos.set(q, p.id); }
      const ok = (p, q) => !p.excl.includes(q) && (c.lockMap[i].has(p.id) ? c.lockMap[i].get(p.id) === q : !lockedPos.has(q));
      const cand = positions.map(q => A.map((p, k) => (ok(p, q) ? k : -1)).filter(k => k >= 0));
      for (const q of matchPositions(cand, A.length)) {
        const who = cand[positions.indexOf(positions[q])];
        const msg = who.length === 0
          ? `nobody available can play ${positions[q]} (everyone is marked "not ${positions[q]}" or locked to another position). Remove an exclusion or add a player.`
          : `the available players cannot cover every position at once; ${positions[q]} has too few eligible players after exclusions and locks. Remove an exclusion or add a player.`;
        (groups.get(msg) || groups.set(msg, []).get(msg)).push(i + 1);
      }
    }
    for (const [msg, inn] of groups) add("cover", `${inningsText(inn)}: ${msg}`);
    return dedupe(errs);
  }
  const dedupe = errs => { const s = new Set(); return errs.filter(e => (s.has(e.msg) ? false : s.add(e.msg))); };

  /* -------------------------------------------------------------- the solver */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const BIG = 1e6;
  // Hungarian algorithm (min cost, n rows <= m columns). a[i][j] costs; returns col per row.
  function hungarian(a, n, m) {
    const INF = 1e18, u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0), p = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0);
    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Array(m + 1).fill(INF), used = new Array(m + 1).fill(false);
      do {
        used[j0] = true;
        const i0 = p[j0];
        let delta = INF, j1 = 0;
        for (let j = 1; j <= m; j++) if (!used[j]) {
          const cur = a[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= m; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
        j0 = j1;
      } while (p[j0] !== 0);
      do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    }
    const res = new Array(n).fill(-1);
    for (let j = 1; j <= m; j++) if (p[j]) res[p[j] - 1] = j - 1;
    return res;
  }

  const W = { rep: 60, rec: 8, vr: 5, cap: 300, inf: 120, bal: 6 };       // costs while building each inning
  const W2 = { rep: 100, vr: 5, cap: 300, inf: 300, bal: 3 };             // costs in the improvement pass

  // Solves once per attempt; if a rule is still broken it retries with seeds derived from the chosen one
  // (still fully deterministic) and keeps the chart with the fewest broken rules.
  function solve(G0, seed) {
    const G = normalizeGame(G0);
    if (seed !== undefined && seed !== null) G.seed = int(seed, 0, 2147483646, G.seed);
    const errors = validate(G);
    if (errors.length) return { ok: false, errors, seed: G.seed };
    let best = null;
    for (let a = 0; a < 12; a++) {
      const r = solveOnce(G, a === 0 ? G.seed : (G.seed * 7919 + a * 104729) % 2147483647);
      r.seed = G.seed;
      if (!best || r.issues.length < best.issues.length) best = r;
      if (!best.issues.length) break;
    }
    return best;
  }
  function solveOnce(G, seedVal) {
    const c = ctx(G), { positions, N, K } = c, R = G.rules, n = G.players.length;
    const rng = mulberry32((seedVal * 2654435761) >>> 0);
    const idOf = i => G.players[i].id;
    const A = Array.from({ length: N }, (_, i) => G.players.map((p, k) => (c.present(p, i) ? k : -1)).filter(k => k >= 0));
    const lockPos = (k, i) => c.lockMap[i].get(idOf(k)) || null;
    const lockedHere = Array.from({ length: N }, (_, i) => new Set(c.lockMap[i].values()));
    const allowed = (k, q, i) => {
      if (G.players[k].excl.includes(q)) return false;
      const lp = lockPos(k, i);
      return lp ? lp === q : !lockedHere[i].has(q);
    };

    /* stage 1: who sits each inning (fairness first) */
    const bench = Array.from({ length: N }, () => new Set());
    const E = new Array(n).fill(0), bc = new Array(n).fill(0), last = new Array(n).fill(-99);
    for (let i = 0; i < N; i++) {
      const ai = A[i], m = ai.length, b = m - K;
      for (const k of ai) E[k] += b / m;
      if (b <= 0) continue;
      const cost = ai.map(k => {
        const key = (R.bench ? E[k] - bc[k] : 0) - (R.noB2B && last[k] === i - 1 ? 0.9 : 0) + 0.03 * Math.min(10, i - last[k]) + 0.001 * rng();
        const row = [];
        for (let q = 0; q < K; q++) row.push(allowed(k, positions[q], i) ? 0 : BIG);
        for (let s = 0; s < b; s++) row.push(lockPos(k, i) ? BIG : -key);
        return row;
      });
      const asg = hungarian(cost, m, m);
      asg.forEach((col, r) => { if (col >= K) { bench[i].add(ai[r]); bc[ai[r]]++; last[ai[r]] = i; } });
    }
    const plays = G.players.map((p, k) => Array.from({ length: N }, (_, i) => c.present(p, i) && !bench[i].has(k)));
    const remAfter = (k, i) => { let r = 0; for (let j = i + 1; j < N; j++) if (plays[k][j]) r++; return r; };

    /* stage 2: positions inning by inning (one small assignment problem each) */
    const grid = G.players.map(() => new Array(N).fill(""));
    const st = G.players.map(() => ({ last: "", last2: "", cnt: {}, played: 0, inf: 0, p: 0, cc: 0 }));
    const infShare = infieldList(G).length / K;
    const capP = R.limits && R.maxP > 0 ? R.maxP : 0, capC = R.limits && R.maxC > 0 ? R.maxC : 0;
    for (let i = 0; i < N; i++) {
      const S = A[i].filter(k => !bench[i].has(k));
      const cost = S.map(k => {
        const s = st[k], lp = lockPos(k, i), row = [];
        for (const q of positions) {
          if (!allowed(k, q, i)) { row.push(BIG); continue; }
          if (lp) { row.push(-2000); continue; }
          let x = 0;
          if (R.noRepeat && s.last === q) x += W.rep;
          if (s.last2 === q) x += W.rec;
          x += W.vr * (s.cnt[q] || 0);
          if (q === "P") { x += 6 * s.p; if (capP && s.p >= capP) x += W.cap * (s.p - capP + 1); }
          if (q === "C") { x += 6 * s.cc; if (capC && s.cc >= capC) x += W.cap * (s.cc - capC + 1); }
          const inf = c.inf(q), d = s.inf - s.played * infShare;
          x += inf ? W.bal * d : -W.bal * d;
          if (inf && R.minInf) {
            const need = Math.max(0, R.minInfN - s.inf), rem = remAfter(k, i) + 1;
            if (need > 0) x -= need >= rem ? 600 : (W.inf * need) / rem;
          }
          row.push(x + rng() * 2);
        }
        return row;
      });
      const asg = hungarian(cost, S.length, K);
      S.forEach((k, r) => {
        const q = positions[asg[r]], s = st[k];
        grid[k][i] = q;
        s.played++; if (c.inf(q)) s.inf++; if (q === "P") s.p++; if (q === "C") s.cc++;
        s.cnt[q] = (s.cnt[q] || 0) + 1; s.last2 = s.last; s.last = q;
      });
      for (const k of A[i]) if (bench[i].has(k)) { st[k].last2 = st[k].last; st[k].last = ""; }
    }

    /* stage 3: local improvement by swapping two players' positions inside one inning */
    const score = () => {
      let t = 0;
      for (let k = 0; k < n; k++) {
        const row = grid[k], cnt = {};
        let played = 0, inf = 0, pc = 0, cc = 0, prev = "";
        for (let i = 0; i < N; i++) {
          const q = row[i];
          if (!q) { prev = ""; continue; }
          played++; if (c.inf(q)) inf++; if (q === "P") pc++; if (q === "C") cc++;
          cnt[q] = (cnt[q] || 0) + 1;
          if (R.noRepeat && q === prev && lockPos(k, i) !== q) t += W2.rep;
          prev = q;
        }
        for (const q in cnt) t += (W2.vr * cnt[q] * (cnt[q] - 1)) / 2;
        if (capP && pc > capP) t += W2.cap * (pc - capP);
        if (capC && cc > capC) t += W2.cap * (cc - capC);
        if (R.minInf) t += W2.inf * Math.max(0, Math.min(R.minInfN, played) - inf);
        const d = inf - played * infShare;
        t += W2.bal * d * d;
      }
      return t;
    };
    let best = score();
    for (let pass = 0; pass < 8; pass++) {
      let improved = false;
      for (let i = 0; i < N; i++) {
        const S = A[i].filter(k => !bench[i].has(k) && !lockPos(k, i));
        for (let x = 0; x < S.length; x++) for (let y = x + 1; y < S.length; y++) {
          const a = S[x], b = S[y], qa = grid[a][i], qb = grid[b][i];
          if (!allowed(a, qb, i) || !allowed(b, qa, i)) continue;
          grid[a][i] = qb; grid[b][i] = qa;
          const t = score();
          if (t < best - 1e-9) { best = t; improved = true; } else { grid[a][i] = qa; grid[b][i] = qb; }
        }
      }
      if (!improved) break;
    }

    const chart = [];
    for (let i = 0; i < N; i++) {
      const row = {};
      for (let k = 0; k < n; k++) if (grid[k][i]) row[grid[k][i]] = idOf(k);
      chart.push(row);
    }
    const res = check(G, chart);
    return { ok: true, chart, seed: G.seed, issues: res.issues, stats: res.stats };
  }

  /* ---------------------------------------------------------------- checker */
  // Checks a chart against the hard constraints (must hold) and the rules the coach switched on.
  // Returns { issues:[{rule, hard, id, inning, text}], stats:{id:{...}} }.
  function check(G0, chart) {
    const G = normalizeGame(G0), c = ctx(G), { positions, N, K } = c, R = G.rules, issues = [];
    const nm = id => { const e = c.byId.get(id); return e ? nameOf(e.p, e.i) : "Unknown player"; };
    const add = (rule, hard, id, inning, text) => issues.push({ rule, hard, id, inning, text });
    const seq = new Map(G.players.map(p => [p.id, new Array(N).fill("")]));
    for (let i = 0; i < N; i++) {
      const row = (chart && chart[i]) || {}, seen = new Map();
      for (const q of positions) {
        const id = row[q];
        if (id == null) { add("fill", true, null, i + 1, `${q} is empty in inning ${i + 1}.`); continue; }
        const e = c.byId.get(id);
        if (!e) { add("fill", true, null, i + 1, `${q} has an unknown player in inning ${i + 1}.`); continue; }
        if (seen.has(id)) add("twice", true, id, i + 1, `${nm(id)} is at ${seen.get(id)} and ${q} in inning ${i + 1}.`);
        seen.set(id, q);
        if (e.p.absent) add("absent", true, id, i + 1, `${nm(id)} is marked absent but is placed at ${q} in inning ${i + 1}.`);
        else if (e.p.late > i + 1) add("late", true, id, i + 1, `${nm(id)} arrives in inning ${e.p.late} but is placed at ${q} in inning ${i + 1}.`);
        if (e.p.excl.includes(q)) add("excl", true, id, i + 1, `${nm(id)} is marked "not ${q}" but plays ${q} in inning ${i + 1}.`);
        if (e.p.absent || e.p.late > i + 1) continue;
        seq.get(id)[i] = q;
      }
      for (const [id, q] of c.lockMap[i]) {
        const e = c.byId.get(id);
        if (e.p.absent || e.p.late > i + 1) continue;
        if (seen.get(id) !== q) add("lock", true, id, i + 1, `${nm(id)} is locked to ${q} in inning ${i + 1} but is not there.`);
      }
      for (const p of G.players) if (c.present(p, i) && !seen.has(p.id)) seq.get(p.id)[i] = "B";
    }
    const stats = {};
    for (const p of G.players) {
      const s = seq.get(p.id), cnt = {};
      let presentN = 0, played = 0, bench = 0, inf = 0;
      s.forEach(v => { if (v) presentN++; if (v === "B") bench++; else if (v) { played++; cnt[v] = (cnt[v] || 0) + 1; if (c.inf(v)) inf++; } });
      stats[p.id] = { id: p.id, present: presentN, played, bench, infield: inf, pos: cnt, seq: s, sig: s.map(v => (v ? 1 : 0)).join("") };
    }
    // bench fairness among players present for exactly the same innings
    if (R.bench) {
      const groups = new Map();
      for (const p of G.players) { const s = stats[p.id]; if (s.present) (groups.get(s.sig) || groups.set(s.sig, []).get(s.sig)).push(p.id); }
      for (const ids of groups.values()) {
        if (ids.length < 2) continue;
        const counts = ids.map(id => stats[id].bench), hi = Math.max(...counts), lo = Math.min(...counts);
        if (hi - lo > 1) {
          const his = ids.filter(id => stats[id].bench === hi), los = ids.filter(id => stats[id].bench === lo);
          add("bench", false, his[0], 0, `Bench innings are uneven: ${his.map(nm).join(", ")} sit${his.length === 1 ? "s" : ""} ${hi} time${hi === 1 ? "" : "s"} while ${los.map(nm).join(", ")} sit${los.length === 1 ? "s" : ""} ${lo}.`);
        }
      }
    }
    for (const p of G.players) {
      const s = stats[p.id];
      for (let i = 0; i < N; i++) {
        if (R.noB2B && s.seq[i] === "B" && s.seq[i + 1] === "B") add("b2b", false, p.id, i + 1, `${nm(p.id)} sits innings ${i + 1} and ${i + 2} in a row.`);
        const q = s.seq[i];
        if (R.noRepeat && i > 0 && q && q !== "B" && q === s.seq[i - 1] && c.lockMap[i].get(p.id) !== q) add("repeat", false, p.id, i + 1, `${nm(p.id)} plays ${q} in innings ${i} and ${i + 1}.`);
      }
      if (R.minInf) {
        const need = Math.min(R.minInfN, s.played);
        if (s.present && s.infield < need) add("minInf", false, p.id, 0, `${nm(p.id)} has ${s.infield} infield inning${s.infield === 1 ? "" : "s"}; the minimum is ${R.minInfN}.`);
      }
      if (R.limits) {
        if (R.maxP > 0 && (s.pos.P || 0) > R.maxP) add("limitP", false, p.id, 0, `${nm(p.id)} pitches ${s.pos.P} innings; the limit is ${R.maxP}.`);
        if (R.maxC > 0 && (s.pos.C || 0) > R.maxC) add("limitC", false, p.id, 0, `${nm(p.id)} catches ${s.pos.C} innings; the limit is ${R.maxC}.`);
      }
    }
    return { issues, stats, hard: issues.filter(x => x.hard).length };
  }

  /* ------------------------------------------------------------ chart edits */
  // Swap what two players are doing in the same inning (a position or the bench). Returns a new chart.
  function swapCells(G, chart, inning, idA, idB) {
    const row = Object.assign({}, chart[inning - 1]);
    const qa = Object.keys(row).find(q => row[q] === idA), qb = Object.keys(row).find(q => row[q] === idB);
    if (qa) row[qa] = idB;
    if (qb) row[qb] = idA;
    const out = chart.slice();
    out[inning - 1] = row;
    return out;
  }

  /* ----------------------------------------------------------- batting order */
  function effectiveOrder(G) {
    const on = [], late = [];
    G.order.forEach(id => {
      const p = G.players.find(x => x.id === id);
      if (!p || p.absent) return;
      (p.late > 1 ? late : on).push(p);
    });
    late.sort((a, b) => a.late - b.late); // stable: ties keep their listed order
    return on.concat(late).map(p => p.id);
  }
  const rotate = (arr, n) => { const k = arr.length ? ((n % arr.length) + arr.length) % arr.length : 0; return arr.slice(k).concat(arr.slice(0, k)); };
  // The next game's order: top n of tonight's order go to the bottom; absent players keep their place at the end.
  function rotateOrder(G, n) {
    const eff = effectiveOrder(G);
    const rest = G.order.filter(id => !eff.includes(id));
    return rotate(eff, int(n, 0, 99, 0)).concat(rest);
  }
  function moveInOrder(order, id, dir) {
    const i = order.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return order;
    const o = order.slice(); o[i] = o[j]; o[j] = id;
    return o;
  }

  /* ----------------------------------------------------------- season tally */
  function gameRecord(G0, chart, label, date) {
    const G = normalizeGame(G0), c = ctx(G), st = check(G, chart).stats;
    const order = effectiveOrder(G);
    const rows = order.map(id => { const e = c.byId.get(id); return { name: nameOf(e.p, e.i), num: e.p.num, cells: st[id].seq.slice() }; });
    return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: String(date || "").slice(0, 10), label: clean(label || G.label, 40), innings: G.innings, infield: infieldList(G), rows };
  }
  function seasonTally(records) {
    const m = new Map();
    for (const g of records || []) {
      const seen = new Set();
      for (const r of g.rows || []) {
        const key = String(r.name || "").trim().toLowerCase();
        if (!key) continue;
        let t = m.get(key);
        if (!t) m.set(key, (t = { name: r.name, num: r.num || "", games: 0, innings: 0, played: 0, bench: 0, infield: 0, pos: {} }));
        if (!seen.has(key)) { t.games++; seen.add(key); }
        if (r.num) t.num = r.num;
        for (const v of r.cells || []) {
          if (!v) continue;
          t.innings++;
          if (v === "B") t.bench++;
          else { t.played++; t.pos[v] = (t.pos[v] || 0) + 1; if ((g.infield || []).includes(v)) t.infield++; }
        }
      }
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  function cleanRecord(r) {
    if (!r || typeof r !== "object" || !Array.isArray(r.rows)) return null;
    const rows = r.rows.slice(0, MAX_PLAYERS).map(x => ({ name: clean(x && x.name, 24), num: clean(x && x.num, 4), cells: (Array.isArray(x && x.cells) ? x.cells : []).slice(0, MAX_INNINGS).map(v => (v === "B" || POS[v] ? v : "")) })).filter(x => x.name);
    return { id: clean(r.id, 20) || Date.now().toString(36), date: clean(r.date, 10), label: clean(r.label, 40), innings: int(r.innings, 1, MAX_INNINGS, 6), infield: (Array.isArray(r.infield) ? r.infield : []).filter(p => POS[p]), rows };
  }

  /* ------------------------------------------------------------ share links */
  const IDX = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const b64url = bytes => { let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  const unb64url = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), ch => ch.charCodeAt(0));
  function packGame(G, chart) {
    const o = G.opts, r = G.rules, pos = positionsOf(G), ix = id => G.players.findIndex(p => p.id === id);
    return [
      1, G.label, G.innings, FORMAT_KEYS.indexOf(G.format), [o.catcherInfield ? 1 : 0, o.coachP ? 1 : 0, o.tCatcher ? 1 : 0, o.tFielders, o.custom.join(",")],
      [+r.bench, +r.noB2B, +r.minInf, r.minInfN, +r.noRepeat, +r.limits, r.maxP, r.maxC], G.seed,
      G.players.map(p => [p.name, p.num, p.absent ? 1 : 0, p.late, p.excl.join(","), p.locks.map(l => `${l.pos}:${l.from}-${l.to}`).join(",")]),
      G.order.map(id => IDX[ix(id)]).join(""),
      chart ? chart.map(row => pos.map(q => (row[q] == null || ix(row[q]) < 0 ? "-" : IDX[ix(row[q])])).join("")) : [],
    ];
  }
  function unpackGame(a) {
    if (!Array.isArray(a) || a[0] !== 1 || !Array.isArray(a[7])) return null;
    const [, label, innings, fmt, o, r, seed, pl, ord, ch] = a;
    const players = pl.slice(0, MAX_PLAYERS).map((p, k) => ({
      id: k + 1, name: p[0], num: p[1], absent: !!p[2], late: p[3], excl: String(p[4] || "").split(",").filter(Boolean),
      locks: String(p[5] || "").split(",").filter(Boolean).map(s => { const m = s.match(/^([^:]+):(\d+)-(\d+)$/); return m ? { pos: m[1], from: +m[2], to: +m[3] } : null; }).filter(Boolean),
    }));
    const G = normalizeGame({
      label, innings, format: FORMAT_KEYS[fmt], seed, players, order: String(ord || "").split("").map(ch => IDX.indexOf(ch) + 1).filter(x => x > 0),
      opts: { catcherInfield: !!(o && o[0]), coachP: !!(o && o[1]), tCatcher: !!(o && o[2]), tFielders: o && o[3], custom: String((o && o[4]) || "").split(",").filter(Boolean) },
      rules: { bench: !!(r && r[0]), noB2B: !!(r && r[1]), minInf: !!(r && r[2]), minInfN: r && r[3], noRepeat: !!(r && r[4]), limits: !!(r && r[5]), maxP: r && r[6], maxC: r && r[7] },
    });
    let chart = null;
    if (Array.isArray(ch) && ch.length === G.innings) {
      const pos = positionsOf(G);
      chart = ch.map(s => { const row = {}; String(s).split("").slice(0, pos.length).forEach((c2, k) => { const idx = IDX.indexOf(c2); if (idx >= 0 && idx < G.players.length) row[pos[k]] = G.players[idx].id; }); return row; });
    }
    return { game: G, chart };
  }
  function encodeShare(G0, chart) {
    const G = normalizeGame(G0);
    return b64url(new TextEncoder().encode(JSON.stringify(packGame(G, chart))));
  }
  function decodeShare(code) {
    try { return unpackGame(JSON.parse(new TextDecoder().decode(unb64url(String(code || "").trim())))); } catch (e) { return null; }
  }
  const shareUrl = code => `${SITE}/#g=${code}`;

  /* -------------------------------------------------------------------- PDFs */
  const INK = "#111111", MUTED = "#555555", LINE = "#6b6b6b", LIGHT = "#cfcfcf", SOFT = "#ececec", ACC = "#0f4c81", ACC_SOFT = "#dbe8f5";
  const CP1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  const MAP = { "→": "->", "←": "<-", "≥": ">=", "≤": "<=", "−": "-", "Ł": "L", "ł": "l", "Đ": "D", "đ": "d", "ı": "i" };
  const inFont = ch => { const k = ch.codePointAt(0); return (k >= 32 && k < 127) || (k >= 160 && k <= 255) || CP1252.includes(ch); };
  // The standard PDF fonts only cover Windows-1252: map a few symbols, strip accents the font lacks, drop emoji.
  function pdfSafe(s) {
    let out = "";
    for (const ch of String(s == null ? "" : s).normalize("NFC")) {
      const k = ch.codePointAt(0);
      if (inFont(ch)) out += ch;
      else if (MAP[ch]) out += MAP[ch];
      else if (k > 0xffff || (k >= 0x2600 && k <= 0x27bf) || k === 0xfe0f || k === 0x200d || (k >= 0x300 && k <= 0x36f)) continue;
      else if (k >= 32) { const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, ""); out += base && [...base].every(inFont) ? base : "?"; }
    }
    return out.replace(/\s+/g, " ").trim();
  }
  function fitText(doc, text, x, y, maxW, size, opts) {
    opts = opts || {};
    const min = opts.min || 5.5;
    text = pdfSafe(text);
    if (!text || maxW <= 2) return;
    let s = size;
    doc.setFontSize(s);
    while (s > min && doc.getTextWidth(text) > maxW) { s -= 0.25; doc.setFontSize(s); }
    if (doc.getTextWidth(text) > maxW) {
      while (text.length > 1 && doc.getTextWidth(text + "...") > maxW) text = text.slice(0, -1);
      text = text.trimEnd() + "...";
    }
    doc.text(text, x, y, { align: opts.align || "left", baseline: "middle" });
  }
  function wrapLines(doc, text, maxW, size, maxLines) {
    doc.setFontSize(size);
    let lines = doc.splitTextToSize(pdfSafe(text), maxW);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      let l = lines[maxLines - 1];
      while (l.length > 1 && doc.getTextWidth(l + "...") > maxW) l = l.slice(0, -1);
      lines[maxLines - 1] = l.trimEnd() + "...";
    }
    return lines;
  }
  function credit(doc, W, y, size) {
    size = size || 7.5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(MUTED);
    const w = doc.getTextWidth(CREDIT), x = (W - w) / 2;
    doc.text(CREDIT, x, y, { baseline: "middle" });
    doc.link(x, y - size * 0.7, w, size * 1.4, { url: CREDIT_URL });
  }
  const ascii = v => String(v || "").normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/[()\\]/g, "").trim();
  const newDoc = (jsPDF, w, h, title) => {
    const doc = new jsPDF({ orientation: w >= h ? "landscape" : "portrait", unit: "pt", format: [Math.min(w, h), Math.max(w, h)] });
    doc.setProperties({ title: ascii(title), creator: "LineupFair - lineup.roohsites.com" });
    return doc;
  };
  const shortName = (name, maxChars) => {
    const parts = String(name).split(" ").filter(Boolean);
    if (String(name).length <= maxChars || parts.length < 2) return name;
    return parts[0] + " " + parts[parts.length - 1][0] + ".";
  };
  const legendText = (G, positions) => positions.map(q => `${q} ${POS[q]}`).join("   ");
  const titleOf = (G, fallback) => G.label || fallback;

  // Rows in batting order, then any other present players (so every present player is listed).
  function chartRows(G, chart) {
    const c = ctx(G), st = check(G, chart).stats, ids = effectiveOrder(G);
    return ids.map((id, k) => { const e = c.byId.get(id); return { bat: k + 1, name: nameOf(e.p, e.i), num: e.p.num, s: st[id] }; });
  }
  function drawGridCells(doc, x, y, cw, rh, seq, sizeCode, infieldOf) {
    seq.forEach((v, i) => {
      const cx = x + i * cw;
      if (v === "B") { doc.setFillColor(SOFT); doc.rect(cx, y, cw, rh, "F"); }
      else if (v && infieldOf(v)) { doc.setFillColor(ACC_SOFT); doc.rect(cx, y, cw, rh, "F"); }
      doc.setDrawColor(LINE); doc.setLineWidth(0.6); doc.rect(cx, y, cw, rh, "S");
      if (!v) { doc.setFont("helvetica", "normal"); doc.setTextColor(LIGHT); fitText(doc, "-", cx + cw / 2, y + rh / 2, cw - 4, sizeCode * 0.8, { align: "center", min: 5 }); return; }
      if (v === "B") { doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED); fitText(doc, "Bench", cx + cw / 2, y + rh / 2, cw - 4, sizeCode * 0.55, { align: "center", min: 4 }); }
      else { doc.setFont("helvetica", "bold"); doc.setTextColor(INK); fitText(doc, v, cx + cw / 2, y + rh / 2, cw - 4, sizeCode, { align: "center", min: 6 }); }
    });
  }

  // (a) Dugout card: players x innings, in batting order. kind "letter" (landscape Letter) or "index" (5 x 8 in card).
  function dugoutPdf(jsPDF, G0, chart, opts) {
    const G = normalizeGame(G0), kind = (opts && opts.kind) || "letter", positions = positionsOf(G), N = G.innings;
    const idx = kind === "index";
    const Wd = idx ? 576 : 792, Hd = idx ? 360 : 612, M = idx ? 20 : 36;
    const doc = newDoc(jsPDF, Wd, Hd, `${titleOf(G, "Fielding chart")} - dugout card`);
    const rows = chartRows(G, chart), R = Math.max(1, rows.length);
    const absent = G.players.filter(p => p.absent).map((p, k) => nameOf(p, G.players.indexOf(p)));
    // header
    doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
    const titleSize = idx ? 14 : 22;
    fitText(doc, titleOf(G, "Fielding chart"), M, M + titleSize * 0.5, Wd - 2 * M - 160, titleSize, { min: 10 });
    doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED);
    fitText(doc, `${N} innings · ${FORMATS[G.format] === "Custom" ? "Custom" : FORMATS[G.format]} · ${positions.length} fielders`, Wd - M, M + titleSize * 0.5, 156, idx ? 8 : 10, { align: "right", min: 6 });
    const top = M + titleSize + (idx ? 8 : 14);
    const legendH = idx ? 40 : 58, bottom = Hd - (idx ? 24 : 34) - legendH;
    const headH = idx ? 16 : 26;
    const batW = idx ? 20 : 32, statW = idx ? 26 : 40, avail = Wd - 2 * M;
    const cw = Math.min(idx ? 46 : 78, (avail - batW - 2 * statW - (idx ? 110 : 150)) / N);
    const nameW = avail - batW - 2 * statW - N * cw;
    const rh = Math.min(idx ? 22 : 36, (bottom - top - headH) / R);
    const codeSize = Math.min(idx ? 11 : 20, rh * 0.62), nameSize = Math.min(idx ? 10 : 16, rh * 0.5);
    // column headers
    let x = M, y = top;
    doc.setFillColor(ACC); doc.rect(M, y, avail, headH, "F");
    doc.setTextColor("#ffffff"); doc.setFont("helvetica", "bold");
    const hs = idx ? 8 : 12;
    fitText(doc, "Bat", x + batW / 2, y + headH / 2, batW - 2, hs, { align: "center", min: 5 });
    fitText(doc, "Player", x + batW + 6, y + headH / 2, nameW - 8, hs, { min: 5 });
    for (let i = 0; i < N; i++) fitText(doc, String(i + 1), x + batW + nameW + i * cw + cw / 2, y + headH / 2, cw - 2, hs + (idx ? 1 : 3), { align: "center", min: 5 });
    fitText(doc, "Inf", x + batW + nameW + N * cw + statW / 2, y + headH / 2, statW - 2, hs, { align: "center", min: 5 });
    fitText(doc, "Bench", x + batW + nameW + N * cw + statW * 1.5, y + headH / 2, statW - 2, hs, { align: "center", min: 5 });
    y += headH;
    rows.forEach(r => {
      doc.setDrawColor(LINE); doc.setLineWidth(0.6);
      doc.rect(M, y, batW, rh, "S"); doc.rect(M + batW, y, nameW, rh, "S");
      doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
      fitText(doc, String(r.bat), M + batW / 2, y + rh / 2, batW - 2, nameSize, { align: "center", min: 5 });
      const label = r.num ? `${r.name}  #${r.num}` : r.name;
      doc.setFont("helvetica", "bold");
      fitText(doc, label, M + batW + 6, y + rh / 2, nameW - 8, nameSize, { min: 6 });
      drawGridCells(doc, M + batW + nameW, y, cw, rh, r.s.seq, codeSize, q => isInfield(G, q));
      const sx = M + batW + nameW + N * cw;
      doc.setDrawColor(LINE); doc.rect(sx, y, statW, rh, "S"); doc.rect(sx + statW, y, statW, rh, "S");
      doc.setFont("helvetica", "normal"); doc.setTextColor(INK);
      fitText(doc, String(r.s.infield), sx + statW / 2, y + rh / 2, statW - 2, nameSize, { align: "center", min: 5 });
      fitText(doc, String(r.s.bench), sx + statW * 1.5, y + rh / 2, statW - 2, nameSize, { align: "center", min: 5 });
      y += rh;
    });
    // legend
    const ly = y + (idx ? 10 : 16);
    doc.setTextColor(INK); doc.setFont("helvetica", "bold"); doc.setFontSize(idx ? 7.5 : 10);
    doc.text("Positions", M, ly, { baseline: "middle" });
    doc.setFont("helvetica", "normal");
    const leg = wrapLines(doc, legendText(G, positions), avail - 60, idx ? 7.5 : 10, 2);
    leg.forEach((l, k) => doc.text(l, M + (idx ? 38 : 52), ly + k * (idx ? 9 : 12.5), { baseline: "middle" }));
    let ny = ly + leg.length * (idx ? 9 : 12.5) + (idx ? 3 : 5);
    doc.setFontSize(idx ? 7 : 9); doc.setTextColor(MUTED);
    const lateOnes = G.players.some(p => !p.absent && p.late > 1);
    const fine = `Shaded blue = infield (${infieldList(G).join(", ")}). Grey = bench.${lateOnes ? " A dash = not there yet." : ""} Inf = infield innings. Bench = bench innings.` + (absent.length ? ` Absent: ${absent.join(", ")}.` : "");
    wrapLines(doc, fine, avail, idx ? 7 : 9, 2).forEach((l, k) => doc.text(l, M, ny + k * (idx ? 8.5 : 11), { baseline: "middle" }));
    credit(doc, Wd, Hd - (idx ? 11 : 18), idx ? 6.5 : 7.5);
    return doc;
  }

  // (b) Field diagram: one small diamond per inning, 3 per row, 2 rows per page, bench listed under each.
  function drawDiamond(doc, x, y, w, h) {
    doc.setFillColor("#e8f3e6"); doc.setDrawColor(LIGHT); doc.setLineWidth(0.8);
    doc.roundedRect(x, y, w, h, 6, 6, "FD");
    // outfield fence (an arc across the top)
    doc.setDrawColor("#9ab79a"); doc.setLineWidth(1);
    const cx = x + w / 2, cy = y + h * 0.82, rx = w * 0.46, ry = h * 0.82;
    let prev = null;
    for (let a = 200; a <= 340; a += 6) {
      const px = cx + rx * Math.cos((a * Math.PI) / 180), py = cy + ry * Math.sin((a * Math.PI) / 180);
      if (prev) doc.line(prev[0], prev[1], px, py);
      prev = [px, py];
    }
    // infield dirt
    const hx = x + w * 0.5, hy = y + h * 0.88, bx = w * 0.19, by = h * 0.2;
    doc.setFillColor("#f1e4cc"); doc.setDrawColor("#b9a37c"); doc.setLineWidth(0.8);
    doc.lines([[bx, -by], [-bx, -by], [-bx, by]], hx, hy, [1, 1], "FD", true);
    doc.setFillColor("#ffffff"); doc.setDrawColor("#8a7a5c");
    [[hx + bx, hy - by], [hx, hy - 2 * by], [hx - bx, hy - by]].forEach(([px, py]) => doc.rect(px - 2.5, py - 2.5, 5, 5, "FD"));
    doc.lines([[7, 0], [0, -3], [-3.5, -3.5], [-3.5, 3.5]], hx - 3.5, hy + 3, [1, 1], "FD", true);
  }
  function fieldPdf(jsPDF, G0, chart) {
    const G = normalizeGame(G0), c = ctx(G), positions = positionsOf(G), N = G.innings;
    const Wd = 792, Hd = 612, M = 30;
    const doc = newDoc(jsPDF, Wd, Hd, `${titleOf(G, "Fielding chart")} - field diagram`);
    const gap = 12, tw = (Wd - 2 * M - 2 * gap) / 3, fh = 168, benchH = 36, th = 15 + fh + benchH;
    const perPage = 6;
    const st = check(G, chart).stats;
    for (let i = 0; i < N; i++) {
      if (i % perPage === 0) {
        if (i > 0) doc.addPage();
        doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
        fitText(doc, titleOf(G, "Fielding chart") + " - field positions", M, M + 8, Wd - 2 * M - 120, 18, { min: 10 });
        doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED);
        fitText(doc, `${G.innings} innings`, Wd - M, M + 8, 110, 10, { align: "right" });
        credit(doc, Wd, Hd - 16);
      }
      const k = i % perPage, col = k % 3, rowN = Math.floor(k / 3);
      const x = M + col * (tw + gap), y = M + 28 + rowN * (th + gap);
      doc.setFont("helvetica", "bold"); doc.setTextColor(ACC);
      fitText(doc, `Inning ${i + 1}`, x + 2, y + 6, tw - 4, 12, { min: 8 });
      const fy = y + 15;
      drawDiamond(doc, x, fy, tw, fh);
      const row = (chart && chart[i]) || {};
      for (const q of positions) {
        const [fx, fyy] = XY[q], px = x + fx * tw, py = fy + fyy * fh;
        const e = c.byId.get(row[q]);
        doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED);
        fitText(doc, q, px, py - 6.5, 40, 7, { align: "center", min: 5 });
        doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
        fitText(doc, e ? shortName(nameOf(e.p, e.i), 9) : "-", px, py + 3.5, 62, 10.5, { align: "center", min: 6 });
      }
      const benchNames = G.players.filter(p => st[p.id].seq[i] === "B").map(p => nameOf(p, G.players.indexOf(p)));
      doc.setFont("helvetica", "bold"); doc.setTextColor(INK); doc.setFontSize(8.5);
      const text = benchNames.length ? `Bench: ${benchNames.join(", ")}` : "Bench: nobody";
      wrapLines(doc, text, tw - 4, 8.5, 3).forEach((l, kk) => { doc.setFont("helvetica", kk === 0 ? "bold" : "normal"); doc.text(l, x + 2, fy + fh + 9 + kk * 10, { baseline: "middle" }); });
    }
    return doc;
  }

  // (c) Season summary
  function seasonPdf(jsPDF, records, opts) {
    const tally = seasonTally(records), Wd = 792, Hd = 612, M = 36;
    const doc = newDoc(jsPDF, Wd, Hd, "Season summary");
    const used = POS_ORDER.filter(q => tally.some(t => t.pos[q]));
    const cols = ["Player", "Games", "Innings", "Played", "Bench", "Infield"].concat(used);
    const avail = Wd - 2 * M, nameW = 150, numW = (avail - nameW) / (cols.length - 1);
    const rh = 22, head = 24;
    let y = 0;
    const header = () => {
      doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
      fitText(doc, (opts && opts.title) || "Season summary", M, M + 8, 400, 20, { min: 10 });
      doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED);
      fitText(doc, `${records.length} game${records.length === 1 ? "" : "s"} saved`, Wd - M, M + 8, 200, 10, { align: "right" });
      y = M + 30;
      doc.setFillColor(ACC); doc.rect(M, y, avail, head, "F"); doc.setTextColor("#ffffff"); doc.setFont("helvetica", "bold");
      cols.forEach((t, k) => { const x = k === 0 ? M + 6 : M + nameW + (k - 1) * numW; fitText(doc, t, k === 0 ? x : x + numW / 2, y + head / 2, k === 0 ? nameW - 8 : numW - 2, 10.5, { align: k === 0 ? "left" : "center", min: 6 }); });
      y += head;
    };
    header();
    const fin = () => credit(doc, Wd, Hd - 16);
    if (!tally.length) { doc.setTextColor(MUTED); doc.setFont("helvetica", "normal"); fitText(doc, "No saved games yet. Use Save game to add a game to the season.", M, y + 20, avail, 12); }
    tally.forEach((t, r) => {
      if (y + rh > Hd - 50) { fin(); doc.addPage(); header(); }
      if (r % 2) { doc.setFillColor("#f4f4f4"); doc.rect(M, y, avail, rh, "F"); }
      doc.setDrawColor(LIGHT); doc.setLineWidth(0.5); doc.line(M, y + rh, M + avail, y + rh);
      doc.setTextColor(INK); doc.setFont("helvetica", "bold");
      fitText(doc, t.num ? `${t.name}  #${t.num}` : t.name, M + 6, y + rh / 2, nameW - 8, 11, { min: 6 });
      doc.setFont("helvetica", "normal");
      const vals = [t.games, t.innings, t.played, t.bench, t.infield].concat(used.map(q => t.pos[q] || 0));
      vals.forEach((v, k) => { doc.setTextColor(v === 0 && k >= 5 ? LIGHT : INK); fitText(doc, String(v), M + nameW + k * numW + numW / 2, y + rh / 2, numW - 2, 11, { align: "center" }); });
      y += rh;
    });
    y += 14;
    if (records.length) {
      if (y + 60 > Hd - 40) { fin(); doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold"); doc.setTextColor(INK); doc.setFontSize(11); doc.text("Games", M, y, { baseline: "middle" });
      doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED);
      const line = records.map((g, k) => `${k + 1}. ${g.label || "Game"}${g.date ? " (" + g.date + ")" : ""}`).join("   ");
      wrapLines(doc, line, avail, 9.5, 4).forEach((l, k) => doc.text(l, M, y + 14 + k * 12, { baseline: "middle" }));
    }
    doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED); doc.setFontSize(8);
    doc.text("Innings = innings present. Infield counts follow each game's catcher setting. Totals are for your records; check your league's playing-time rules.", M, Hd - 34, { baseline: "middle" });
    fin();
    return doc;
  }

  // (d) Blank lineup card for writing by hand
  function blankPdf(jsPDF, G0, opts) {
    const G = normalizeGame(G0), positions = positionsOf(G);
    const N = int(opts && opts.innings, 1, 9, G.innings), R = int(opts && opts.rows, 8, 18, 15);
    const Wd = 792, Hd = 612, M = 36, avail = Wd - 2 * M;
    const doc = newDoc(jsPDF, Wd, Hd, "Blank lineup card");
    doc.setFont("helvetica", "bold"); doc.setTextColor(INK); doc.setFontSize(20);
    doc.text("Lineup card", M, M + 8, { baseline: "middle" });
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    const fields = [["Team", 190], ["Opponent", 190], ["Date", 110], ["Field", 110]];
    let fx = M + 130;
    const fy = M + 12;
    fields.forEach(([t, w]) => {
      const ww = Math.min(w, (Wd - M - fx) * (w / 600) + 20);
      doc.setTextColor(MUTED); doc.text(t, fx, fy, { baseline: "bottom" });
      const tw2 = doc.getTextWidth(t) + 4;
      doc.setDrawColor(LINE); doc.setLineWidth(0.7); doc.line(fx + tw2, fy, fx + tw2 + ww - tw2 + 20, fy);
      fx += ww + 28;
    });
    const top = M + 34, headH = 24, bottom = Hd - 96;
    const batW = 32, numW = 36, cw = Math.min(78, (avail - batW - numW - 170) / N), nameW = avail - batW - numW - N * cw;
    const rh = Math.min(30, (bottom - top - headH) / R);
    let y = top;
    doc.setFillColor(ACC); doc.rect(M, y, batW + numW + nameW + N * cw, headH, "F");
    doc.setTextColor("#ffffff"); doc.setFont("helvetica", "bold");
    fitText(doc, "Bat", M + batW / 2, y + headH / 2, batW - 2, 11, { align: "center" });
    fitText(doc, "Player", M + batW + 6, y + headH / 2, nameW - 8, 11);
    fitText(doc, "#", M + batW + nameW + numW / 2, y + headH / 2, numW - 2, 11, { align: "center" });
    for (let i = 0; i < N; i++) fitText(doc, String(i + 1), M + batW + nameW + numW + i * cw + cw / 2, y + headH / 2, cw - 2, 13, { align: "center" });
    y += headH;
    doc.setDrawColor(LINE); doc.setLineWidth(0.6);
    for (let r = 0; r < R; r++) {
      doc.setTextColor(MUTED); doc.setFont("helvetica", "normal");
      doc.rect(M, y, batW, rh, "S"); doc.rect(M + batW, y, nameW, rh, "S"); doc.rect(M + batW + nameW, y, numW, rh, "S");
      fitText(doc, String(r + 1), M + batW / 2, y + rh / 2, batW - 2, 10, { align: "center" });
      for (let i = 0; i < N; i++) doc.rect(M + batW + nameW + numW + i * cw, y, cw, rh, "S");
      y += rh;
    }
    doc.setTextColor(INK); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("Positions", M, y + 18, { baseline: "middle" });
    doc.setFont("helvetica", "normal");
    wrapLines(doc, legendText(G, positions) + "   B Bench", avail - 56, 10, 2).forEach((l, k) => doc.text(l, M + 52, y + 18 + k * 12.5, { baseline: "middle" }));
    doc.setTextColor(MUTED); doc.setFontSize(8.5);
    doc.text("Write the position code in each box, or B when a player sits. Playing-time rules vary by league; check yours.", M, y + 48, { baseline: "middle" });
    credit(doc, Wd, Hd - 16);
    return doc;
  }

  const EXAMPLE_NAMES = ["Ava", "Ben", "Chloe", "Dylan", "Ella", "Finn", "Grace", "Hugo", "Isla", "Jack", "Kai", "Lily"];
  function exampleGame(G0) {
    const base = normalizeGame(G0 || {});
    base.players = EXAMPLE_NAMES.map((name, k) => ({ id: k + 1, name, num: String(k + 1), absent: false, late: 1, excl: [], locks: [] }));
    base.order = base.players.map(p => p.id);
    return normalizeGame(base);
  }

  return {
    SITE, CREDIT, CREDIT_URL, POS, POS_ORDER, XY, FORMATS, FORMAT_KEYS, MAX_PLAYERS, MAX_INNINGS, DEFAULT_RULES, RULE_NAMES, STD9, OF4,
    positionsOf, isInfield, infieldList, normalizeGame, emptyGame, nextPlayerId, parseRoster, validate, solve, check, swapCells, nameOf,
    effectiveOrder, rotate, rotateOrder, moveInOrder, gameRecord, seasonTally, cleanRecord, encodeShare, decodeShare, shareUrl,
    pdfSafe, dugoutPdf, fieldPdf, seasonPdf, blankPdf, exampleGame, hungarian, mulberry32, rangeText,
  };
});
