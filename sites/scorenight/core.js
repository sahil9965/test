/* ScoreNight core: game sheets (Yahtzee-style dice card, Farkle, Mexican Train, any game), page layout,
   SVG preview, PDF building and the phone scorer's rules. No DOM access, so the same file runs on the page
   and in Node tests. All coordinates are PDF points (1/72 inch) with the origin at the bottom-left. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SNCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Glyph advance widths (1/1000 em) of the PDF standard fonts for every WinAnsi code point, from pdf-lib 1.17.1.
  const CPS = [32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,338,339,352,353,376,381,382,402,710,732,8211,8212,8216,8217,8218,8220,8221,8222,8224,8225,8226,8230,8240,8249,8250,8364,8482];
  const W = {
    H: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500,1000,944,667,500,500,611,500,556,333,333,556,1000,222,222,222,333,333,333,556,556,350,1000,1000,333,333,556,1000],
    HB: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556,1000,944,667,556,556,611,500,556,333,333,556,1000,278,278,278,500,500,500,556,556,350,1000,1000,333,333,556,1000],
  };
  const IDX = new Map(CPS.map((c, i) => [c, i]));
  const Q = IDX.get(63);

  /* ------------------------------------------------------------------ text */
  // Characters the built-in PDF fonts can't encode are swapped for a close equivalent or dropped.
  const SUBS = {
    "₹": "Rs.", "−": "-", "‐": "-", "‑": "-", "‒": "-", "―": "-", "⁃": "-",
    " ": " ", " ": " ", " ": " ", " ": " ", " ": " ", " ": " ", " ": " ",
    "′": "'", "″": "\"", "≤": "<=", "≥": ">=", "≠": "!=", "→": "->", "←": "<-",
    "№": "No.", "₩": "W", "₱": "PHP ", "₦": "NGN ", "₺": "TL", "₽": "RUB ", "₪": "ILS ",
    // Latin letters with a stroke or bar don't decompose to a base letter, so map them by hand
    // (otherwise "Łukasz" would print as "ukasz").
    "Ł": "L", "ł": "l", "Đ": "D", "đ": "d", "Ħ": "H", "ħ": "h", "Ŧ": "T", "ŧ": "t", "ı": "i", "Ŀ": "L", "ŀ": "l", "Ɨ": "I", "ɨ": "i",
  };
  const IGNORE = /[​-‍⁠︀-️﻿]/;
  function clean(str, keepSpaces) {
    let out = "";
    const lost = new Set();
    for (const ch of String(str == null ? "" : str).normalize("NFC")) {
      const cp = ch.codePointAt(0);
      if (cp === 9 || cp === 10 || cp === 13) { out += " "; continue; }
      if (IDX.has(cp)) { out += ch; continue; }
      if (SUBS[ch] !== undefined) { out += SUBS[ch]; continue; }
      if (IGNORE.test(ch)) continue;
      const base = ch.normalize("NFD")[0];
      if (base !== ch && IDX.has(base.codePointAt(0))) { out += base; continue; }
      if (cp >= 0x1f3fb && cp <= 0x1f3ff) continue; // skin-tone modifiers
      lost.add(ch);
    }
    out = keepSpaces ? out : out.replace(/ {2,}/g, " ").trim();
    return { text: out, lost: [...lost] };
  }
  function textW(str, font, size) {
    const w = W[font];
    let t = 0;
    for (const ch of str) { const i = IDX.get(ch.codePointAt(0)); t += w[i === undefined ? Q : i]; }
    return (t * size) / 1000;
  }
  // Shrink to fit one line (down to min), then cut with an ellipsis.
  function fitLine(str, font, size, min, maxW) {
    if (!str) return { text: "", size, cut: false };
    const w1 = textW(str, font, 1);
    let s = size;
    if (w1 * s > maxW) s = Math.max(min, maxW / w1);
    if (w1 * s <= maxW + 0.01) return { text: str, size: s, cut: false };
    return { text: ellipsize(str, font, s, maxW), size: s, cut: true };
  }
  function ellipsize(str, font, size, maxW) {
    const chars = [...str];
    while (chars.length && textW(chars.join("").trimEnd() + "…", font, size) > maxW) chars.pop();
    return chars.length ? chars.join("").trimEnd() + "…" : "";
  }
  // Greedy word wrap; returns at most maxLines lines and whether text was cut.
  function wrap(str, font, size, maxW, maxLines) {
    if (!str) return { lines: [], cut: false };
    const words = str.split(" ");
    const lines = [];
    let cur = "";
    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      const next = cur ? cur + " " + word : word;
      if (textW(next, font, size) <= maxW) { cur = next; continue; }
      if (cur) { lines.push(cur); cur = ""; }
      // A single word longer than the line: hard-break it.
      while (textW(word, font, size) > maxW) {
        const chars = [...word];
        let n = chars.length;
        while (n > 1 && textW(chars.slice(0, n).join(""), font, size) > maxW) n--;
        lines.push(chars.slice(0, n).join(""));
        word = chars.slice(n).join("");
      }
      cur = word;
    }
    if (cur) lines.push(cur);
    if (lines.length <= maxLines) return { lines, cut: false };
    const keep = lines.slice(0, maxLines);
    keep[maxLines - 1] = ellipsize(keep[maxLines - 1] + " " + lines[maxLines], font, size, maxW);
    return { lines: keep, cut: true };
  }

  /* --------------------------------------------------------------- colours */
  const INK = [0.106, 0.106, 0.122], GRAY = [0.42, 0.42, 0.46], LIGHT = [0.62, 0.62, 0.66], CUT = [0.72, 0.72, 0.75], WHITE = [1, 1, 1];
  function hexRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return [0.745, 0.071, 0.235];
    const n = parseInt(m[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
  // Very light accents (e.g. yellow) are darkened so text stays readable on white paper.
  function readable(c) {
    const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return lum > 0.55 ? mix(c, INK, Math.min(0.75, (lum - 0.45) * 1.4)) : c;
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ----------------------------------------------------------------- games */
  const CREDIT = "Made with ScoreNight · scoresheet.roohsites.com";
  const PAPER = { letter: [612, 792], a4: [595.28, 841.89] };
  // per: sheets per page the game offers, def: the one it starts on; minP/maxP: players
  const GAMES = {
    yahtzee: { name: "Yahtzee", title: "Dice score card", minP: 1, maxP: 8, per: [1, 2, 4], def: 2 },
    farkle: { name: "Farkle", title: "Farkle score sheet", minP: 2, maxP: 8, per: [1, 2], def: 1 },
    mexican: { name: "Mexican Train", title: "Mexican Train score sheet", minP: 2, maxP: 8, per: [1, 2], def: 2 },
    blank: { name: "Any game", title: "Score sheet", minP: 2, maxP: 10, per: [1, 2], def: 1 },
  };
  const DEFAULTS = {
    game: "yahtzee", paper: "letter", per: 2, large: false, players: 4, names: [], sets: 1, event: "",
    yGames: 6, fTurns: 20, fEntry: 500, fTarget: 10000, fOnes: 1000, fFour: "1000", fChart: true,
    mSet: 12, bRounds: 12, bWin: "high", bTitle: "",
  };
  const MAX_HALF = 15; // turns or rounds that still read well on a half page
  const fmt = n => Number(n).toLocaleString("en-US");
  const int = (v, d, a, b) => { const n = Math.round(Number(v)); return Number.isFinite(n) && String(v).trim() !== "" ? clamp(n, a, b) : d; };

  // Every input is clamped to something printable; notes say what was changed.
  function normalize(input) {
    const i = Object.assign({}, DEFAULTS, input || {});
    const s = {}, notes = [], lost = new Set();
    const txt = (v, n) => { const c = clean(String(v == null ? "" : v).slice(0, 80)); c.lost.forEach(ch => lost.add(ch)); return [...c.text].slice(0, n).join(""); };
    s.game = GAMES[i.game] ? i.game : "yahtzee";
    const G = GAMES[s.game];
    s.paper = i.paper === "a4" ? "a4" : "letter";
    s.large = !!i.large;
    s.per = s.large ? 1 : G.per.includes(Number(i.per)) ? Number(i.per) : G.def;
    s.players = int(i.players, 4, G.minP, G.maxP);
    s.names = Array.from({ length: s.players }, (_, k) => txt((i.names || [])[k], 24));
    s.event = txt(i.event, 40);
    s.sets = int(i.sets, 1, 1, 50);
    s.yGames = int(i.yGames, 6, 1, 6);
    s.fTurns = int(i.fTurns, 20, 5, 30);
    s.fEntry = int(i.fEntry, 500, 0, 5000);
    s.fTarget = int(i.fTarget, 10000, 1000, 100000);
    s.fOnes = Number(i.fOnes) === 300 ? 300 : 1000;
    s.fFour = i.fFour === "double" ? "double" : "1000";
    s.fChart = i.fChart !== false && i.fChart !== "false";
    s.mSet = [6, 9, 12, 15].includes(Number(i.mSet)) ? Number(i.mSet) : 12;
    s.bRounds = int(i.bRounds, 12, 3, 30);
    s.bWin = i.bWin === "low" ? "low" : "high";
    s.bTitle = txt(i.bTitle, 40);
    if (s.per > 1) {
      if (s.game === "farkle" && s.fTurns > MAX_HALF) { s.fTurns = MAX_HALF; notes.push(`Two sheets per page fit ${MAX_HALF} turns, so the sheets have ${MAX_HALF}. Choose one per page for more.`); }
      if (s.game === "blank" && s.bRounds > MAX_HALF) { s.bRounds = MAX_HALF; notes.push(`Two sheets per page fit ${MAX_HALF} rounds, so the sheets have ${MAX_HALF}. Choose one per page for more.`); }
      if (s.game === "farkle" && s.fChart) notes.push("The scoring chart prints on one-per-page sheets only.");
    }
    if (lost.size) notes.push(`These characters can't be printed and were left out: ${[...lost].join(" ")}`);
    return { s, notes };
  }

  /* --------------------------------------------------------------- geometry */
  const M = { side: 36, top: 36, bottom: 42 }, GAP = 18;
  function geometry(s) {
    const [W, H] = PAPER[s.paper];
    const cols = s.per === 1 ? 1 : s.game === "yahtzee" ? 2 : 1;
    const rows = s.per / cols;
    const aw = W - 2 * M.side, ah = H - M.top - M.bottom;
    const cw = (aw - (cols - 1) * GAP) / cols, ch = (ah - (rows - 1) * GAP) / rows;
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ x: M.side + c * (cw + GAP), y: H - M.top - (r + 1) * ch - r * GAP, w: cw, h: ch });
    return { pageW: W, pageH: H, cols, rows, cells, perPage: s.per };
  }
  const cardCount = s => (s.game === "yahtzee" ? s.players * s.sets : s.sets);

  /* ------------------------------------------------------------ sheet specs */
  const Y_UPPER = [["ones", "Ones", "Add only 1s"], ["twos", "Twos", "Add only 2s"], ["threes", "Threes", "Add only 3s"], ["fours", "Fours", "Add only 4s"], ["fives", "Fives", "Add only 5s"], ["sixes", "Sixes", "Add only 6s"]];
  const Y_LOWER = [["three", "3 of a kind", "Add all dice"], ["four", "4 of a kind", "Add all dice"], ["full", "Full house", "25"], ["small", "Small straight", "30"], ["large", "Large straight", "40"], ["yahtzee", "5 of a kind", "50"], ["chance", "Chance", "Add all dice"], ["ybonus", "5 of a kind bonus", "100 each"]];
  function farkleChart(s) {
    const dbl = s.fFour === "double";
    return [["Single 1", "100"], ["Single 5", "50"], ["Three 1s", fmt(s.fOnes)], ["Three 2s", "200"], ["Three 3s", "300"], ["Three 4s", "400"], ["Three 5s", "500"], ["Three 6s", "600"],
      ["Four of a kind", dbl ? "2 × three of a kind" : "1,000"], ["Five of a kind", dbl ? "4 × three of a kind" : "2,000"], ["Six of a kind", dbl ? "8 × three of a kind" : "3,000"],
      ["Straight 1 to 6", "1,500"], ["Three pairs", "1,500"], ["Four of a kind + a pair", "1,500"], ["Two triplets", "2,500"]];
  }
  const mexRounds = set => Array.from({ length: set + 1 }, (_, k) => set - k);

  // What one sheet holds: title lines, column heads and rows. idx = the sheet's number in the run.
  function spec(s, idx) {
    const G = GAMES[s.game];
    if (s.game === "yahtzee") {
      const rows = [{ k: "sec", l: "Upper section" }, ...Y_UPPER.map(([, l, h]) => ({ l, h })), { k: "sum", l: "Subtotal" }, { k: "sum", l: "Bonus", h: "35 if subtotal is 63+" }, { k: "sum", l: "Upper total" },
        { k: "sec", l: "Lower section" }, ...Y_LOWER.map(([, l, h]) => ({ l, h })), { k: "sum", l: "Lower total" }, { k: "sum", l: "Upper total" }, { k: "sum", l: "Grand total", strong: true }];
      const note = s.per === 4 ? "Bonus 35 if subtotal is 63+ · Full house 25 · Small straight 30 · Large straight 40 · 5 of a kind 50, each extra one 100" : "";
      return { title: G.title, sub: "For Yahtzee and other 5-dice games", who: ["Player", s.names[idx % s.players]], head: Array.from({ length: s.yGames }, (_, k) => "Game " + (k + 1)), labelShare: 0.44, rows, note };
    }
    const head = s.names.slice();
    const who = ["Game night", s.event];
    if (s.game === "farkle") {
      const rows = [...Array.from({ length: s.fTurns }, (_, k) => ({ l: String(k + 1), c: true })), { k: "sum", l: "Final", strong: true }];
      const rule = (s.fEntry ? `Get on the board: ${fmt(s.fEntry)}` : "No minimum to get on the board") + ` · Win: ${fmt(s.fTarget)}`;
      return { title: G.title, sub: rule, who, head, labelShare: 0.08, sub2: ["Score", "Total"], rows, labelHead: "Turn", chart: s.per === 1 && s.fChart ? farkleChart(s) : null, note: "Write each turn's points under Score and the running total under Total. A farkle scores 0 for the turn." };
    }
    if (s.game === "mexican") {
      const rows = [...mexRounds(s.mSet).map(r => ({ l: "Double " + r })), { k: "sum", l: "Total", strong: true }];
      return { title: G.title, sub: `Double-${s.mSet} set · ${s.mSet + 1} rounds · lowest total wins`, who, head, labelShare: 0.16, rows, labelHead: "Round", note: "After each round, write the pips left in each hand. The lowest total after the double blank round wins." };
    }
    const rows = [...Array.from({ length: s.bRounds }, (_, k) => ({ l: String(k + 1), c: true })), { k: "sum", l: "Total", strong: true }];
    return { title: s.bTitle || G.title, sub: s.bWin === "low" ? "Lowest total wins" : "Highest total wins", who, head, labelShare: 0.1, rows, labelHead: "Round" };
  }

  /* ---------------------------------------------------------------- layout */
  const LINE = [0.74, 0.74, 0.77];
  const T = (v, x, y, size, f, c, a) => ({ t: "text", v, x, y, s: size, f, c, a: a || "left" });
  function cellText(P, str, font, size, min, x, w, y, color, align) {
    if (!str) return;
    const r = fitLine(str, font, size, min, w - 6);
    const tx = align === "center" ? x + w / 2 : align === "right" ? x + w - 3 : x + 3;
    P.push(T(r.text, tx, y, r.size, font, color, align));
  }

  // One sheet inside rectangle r: border, title block, table, optional Farkle chart and a note.
  function layoutCard(s, sp, r, accent) {
    const P = [], k = s.large ? 1.2 : 1, pad = r.w < 300 ? 9 : 14;
    const fill = mix(accent, WHITE, 0.88), sumFill = mix(accent, WHITE, 0.95);
    P.push({ t: "rect", x: r.x, y: r.y, w: r.w, h: r.h, stroke: LINE, lw: 1 });
    const L = r.x + pad, R = r.x + r.w - pad, tw = R - L;
    let top = r.y + r.h - pad;
    const tSize = clamp(r.w / 24, 11, 19) * k, small = clamp(r.w / 52, 7, 10.5) * k;
    const date = "Date ____________";
    const dateW = textW(date, "H", small);
    const t1 = fitLine(sp.title, "HB", tSize, 9, tw - dateW - 12);
    P.push(T(t1.text, L, top - t1.size * 0.8, t1.size, "HB", readable(accent)));
    P.push(T(date, R, top - t1.size * 0.8, small, "H", GRAY, "right"));
    top -= t1.size + 4;
    if (!(r.h < 400 && s.game === "yahtzee")) { // quarter-page dice cards skip the subtitle to keep rows writable
      const sub = fitLine(sp.sub, "H", small, 6, tw);
      P.push(T(sub.text, L, top - sub.size, sub.size, "H", GRAY));
      top -= sub.size + 6;
    }
    // player / game night line: printed name, or a line to write on
    const lab = sp.who[0] + ":", labW = textW(lab, "HB", small * 1.1) + 6;
    P.push(T(lab, L, top - small * 1.1, small * 1.1, "HB", INK));
    if (sp.who[1]) cellText(P, sp.who[1], "H", small * 1.1, 6, L + labW - 3, tw - labW, top - small * 1.1, INK);
    else P.push({ t: "line", x1: L + labW, y1: top - small * 1.1 - 2, x2: Math.min(R, L + labW + tw * 0.55), y2: top - small * 1.1 - 2, c: LIGHT, lw: 0.6 });
    top -= small * 1.1 + 10;

    // bottom blocks: note line and Farkle chart
    let bottom = r.y + pad;
    if (sp.note) {
      const nl = wrap(sp.note, "H", small * 0.9, tw, 2);
      nl.lines.slice().reverse().forEach((line, j) => P.push(T(line, L, bottom + j * small * 1.15, small * 0.9, "H", GRAY)));
      bottom += nl.lines.length * small * 1.15 + 6;
    }
    if (sp.chart) {
      const lh = clamp(r.h / 70, 10, 13) * k, half = Math.ceil(sp.chart.length / 2), ch = half * lh + lh * 1.6 + 8;
      P.push({ t: "rect", x: L, y: bottom, w: tw, h: ch, fill: sumFill, stroke: LINE, lw: 0.6 });
      P.push(T("Scoring (house rules vary)", L + 8, bottom + ch - lh * 1.1, lh * 0.8, "HB", readable(accent)));
      sp.chart.forEach(([a, b], j) => {
        const col = j < half ? 0 : 1, row = j % half, x = L + 8 + col * (tw / 2), y = bottom + ch - lh * 1.6 - 6 - (row + 1) * lh + 3;
        P.push(T(a, x, y, lh * 0.72, "H", INK));
        P.push(T(b, x + tw / 2 - 18, y, lh * 0.72, "HB", INK, "right"));
      });
      bottom += ch + 8;
    }

    // table
    const subRow = !!sp.sub2;
    const nCols = sp.head.length, labelW = tw * sp.labelShare, colW = (tw - labelW) / nCols;
    const nRows = sp.rows.length;
    const avail = top - bottom;
    const rh = Math.min(30 * k, avail / (nRows + (subRow ? 2.3 : 1.4)));
    const headH = rh * 1.4, sub2H = subRow ? rh * 0.9 : 0;
    const tTop = top, hBottom = tTop - headH - sub2H;
    const fs = clamp(rh * 0.5, 6.5, 12.5) * (s.large ? 1.08 : 1), hs = fs * 0.78;
    P.push({ t: "rect", x: L, y: hBottom, w: tw, h: headH + sub2H, fill });
    if (sp.labelHead) cellText(P, sp.labelHead, "HB", hs, 5, L, labelW, hBottom + (headH + sub2H) / 2 - hs * 0.35, INK, "center");
    const short = sp.head.some(h => /^Game \d$/.test(h) && textW(h, "HB", fs) > colW - 6);
    sp.head.forEach((name, j) => {
      const x = L + labelW + j * colW;
      if (short) name = name.replace("Game ", "");
      if (name) cellText(P, name, "HB", fs, 5, x, colW, tTop - headH / 2 - fs * 0.35, INK, "center");
      if (subRow) sp.sub2.forEach((t2, q) => cellText(P, t2, "H", hs * 0.9, 4.5, x + q * colW / 2, colW / 2, hBottom + sub2H / 2 - hs * 0.32, GRAY, "center"));
    });
    let y = hBottom;
    sp.rows.forEach(row => {
      y -= rh;
      const ty = y + rh / 2 - fs * 0.35;
      if (row.k === "sec") {
        P.push({ t: "rect", x: L, y, w: tw, h: rh, fill });
        P.push(T(row.l.toUpperCase(), L + 4, ty + fs * 0.06, fs * 0.82, "HB", readable(accent)));
        return;
      }
      if (row.k === "sum") P.push({ t: "rect", x: L, y, w: tw, h: rh, fill: sumFill });
      const lf = row.k === "sum" || row.strong ? "HB" : "H";
      if (row.c) cellText(P, row.l, lf, fs * 0.9, 5, L, labelW, ty, GRAY, "center");
      else if (row.h && labelW > 150) {
        // wide label column: hint on the right of the label
        const lw2 = textW(row.l, lf, fs);
        P.push(T(fitLine(row.l, lf, fs, 5.5, labelW * 0.62).text, L + 3, ty, fs, lf, INK));
        const hw = labelW - Math.min(lw2, labelW * 0.62) - 10;
        if (hw > 24) { const h = fitLine(row.h, "H", fs * 0.7, 4.5, hw); if (!h.cut) P.push(T(h.text, L + labelW - 3, ty + 0.5, h.size, "H", GRAY, "right")); }
      } else if (row.h && rh >= 20) {
        // narrower column: hint on a second, smaller line
        const ls = Math.min(fs, rh * 0.42), hs2 = Math.max(5.5, ls * 0.68);
        cellText(P, row.l, lf, ls, 5, L, labelW, y + rh * 0.5, INK);
        cellText(P, row.h, "H", hs2, 4.5, L, labelW, y + rh * 0.5 - hs2 * 1.3, GRAY);
      } else cellText(P, row.l, lf, fs, 5, L, labelW, ty, INK);
    });
    // grid: rows, column lines, then the outer box on top
    for (let j = 0, yy = hBottom; j < nRows; j++, yy -= rh) P.push({ t: "line", x1: L, y1: yy, x2: R, y2: yy, c: LINE, lw: 0.5 });
    const gBottom = hBottom - nRows * rh;
    P.push({ t: "line", x1: L + labelW, y1: tTop, x2: L + labelW, y2: gBottom, c: LINE, lw: 0.8 });
    for (let j = 1; j < nCols; j++) P.push({ t: "line", x1: L + labelW + j * colW, y1: tTop, x2: L + labelW + j * colW, y2: gBottom, c: LINE, lw: 0.8 });
    if (subRow) for (let j = 0; j < nCols; j++) P.push({ t: "line", x1: L + labelW + j * colW + colW / 2, y1: hBottom, x2: L + labelW + j * colW + colW / 2, y2: gBottom, c: LINE, lw: 0.4, dash: [2, 2] });
    P.push({ t: "rect", x: L, y: gBottom, w: tw, h: tTop - gBottom, stroke: INK, lw: 0.9 });
    return { prims: P, rowH: rh, fontSize: fs };
  }

  // All pages: sheets placed in the page grid, a dashed cut line between them, the credit in the bottom margin.
  function layoutPages(input, accentHex) {
    const { s, notes } = normalize(input);
    const g = geometry(s), accent = readable(hexRgb(accentHex || "#1f6f43"));
    const total = cardCount(s), pages = [];
    let minRow = Infinity;
    for (let i = 0; i < total; i += s.per) {
      const P = [];
      for (let j = 0; j < s.per && i + j < total; j++) {
        const c = layoutCard(s, spec(s, i + j), g.cells[j], accent);
        minRow = Math.min(minRow, c.rowH);
        P.push(...c.prims);
      }
      if (s.per > 1) {
        if (g.cols > 1) { const x = M.side + g.cells[0].w + GAP / 2; P.push({ t: "line", x1: x, y1: M.bottom - 6, x2: x, y2: g.pageH - M.top + 6, c: CUT, lw: 0.5, dash: [4, 3] }); }
        if (g.rows > 1) { const y = g.cells[g.cells.length - 1].y + g.cells[0].h + GAP / 2; P.push({ t: "line", x1: M.side - 6, y1: y, x2: g.pageW - M.side + 6, y2: y, c: CUT, lw: 0.5, dash: [4, 3] }); }
      }
      P.push(T(CREDIT, g.pageW / 2, 18, 7, "H", LIGHT, "center"));
      pages.push(P);
    }
    return { s, notes, g, pages, cards: total, minRow };
  }

  /* ------------------------------------------------------------ renderers */
  const rgb = c => `rgb(${c.map(v => Math.round(v * 255)).join(",")})`;
  const xesc = v => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function svgPage(prims, W, H) {
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Helvetica, Arial, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`];
    for (const p of prims) {
      if (p.t === "rect") out.push(`<rect x="${p.x}" y="${H - p.y - p.h}" width="${p.w}" height="${p.h}" fill="${p.fill ? rgb(p.fill) : "none"}"${p.stroke ? ` stroke="${rgb(p.stroke)}" stroke-width="${p.lw}"` : ""}/>`);
      else if (p.t === "line") out.push(`<line x1="${p.x1}" y1="${H - p.y1}" x2="${p.x2}" y2="${H - p.y2}" stroke="${rgb(p.c)}" stroke-width="${p.lw}"${p.dash ? ` stroke-dasharray="${p.dash.join(" ")}"` : ""}/>`);
      else out.push(`<text x="${p.x}" y="${H - p.y}" font-size="${p.s.toFixed(2)}" fill="${rgb(p.c)}"${p.f === "HB" ? ' font-weight="700"' : ""}${p.a !== "left" ? ` text-anchor="${p.a === "center" ? "middle" : "end"}"` : ""}>${xesc(p.v)}</text>`);
    }
    out.push("</svg>");
    return out.join("");
  }

  async function buildPdf(L, input, accentHex) {
    const lay = layoutPages(input, accentHex);
    const doc = await L.PDFDocument.create();
    doc.setTitle(`${GAMES[lay.s.game].title} (ScoreNight)`);
    doc.setCreator("ScoreNight, scoresheet.roohsites.com");
    doc.setProducer("pdf-lib");
    const F = { H: await doc.embedFont(L.StandardFonts.Helvetica), HB: await doc.embedFont(L.StandardFonts.HelveticaBold) };
    const c = v => L.rgb(v[0], v[1], v[2]);
    for (const prims of lay.pages) {
      const page = doc.addPage([lay.g.pageW, lay.g.pageH]);
      for (const p of prims) {
        if (p.t === "rect") page.drawRectangle({ x: p.x, y: p.y, width: p.w, height: p.h, color: p.fill ? c(p.fill) : undefined, borderColor: p.stroke ? c(p.stroke) : undefined, borderWidth: p.stroke ? p.lw : 0 });
        else if (p.t === "line") page.drawLine({ start: { x: p.x1, y: p.y1 }, end: { x: p.x2, y: p.y2 }, thickness: p.lw, color: c(p.c), dashArray: p.dash });
        else {
          const w = textW(p.v, p.f, p.s);
          page.drawText(p.v, { x: p.a === "center" ? p.x - w / 2 : p.a === "right" ? p.x - w : p.x, y: p.y, size: p.s, font: F[p.f], color: c(p.c) });
        }
      }
    }
    return { bytes: await doc.save(), pages: lay.pages.length, cards: lay.cards, notes: lay.notes };
  }

  /* ------------------------------------------------- phone scorer: the rules */
  const Y_CATS = [...Y_UPPER, ...Y_LOWER].map(r => r[0]);
  const Y_FIXED = { full: 25, small: 30, large: 40, yahtzee: 50 };
  // Is v a score that box can hold? Blank is fine (not played yet).
  function yValid(cat, v) {
    if (v === "" || v == null) return true;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) return false;
    const face = Y_UPPER.findIndex(r => r[0] === cat) + 1;
    if (face) return n % face === 0 && n <= face * 5;
    if (Y_FIXED[cat]) return n === 0 || n === Y_FIXED[cat];
    if (cat === "ybonus") return n <= 12;
    return n === 0 || (n >= 5 && n <= 30);
  }
  function yTotals(cells) {
    const v = k => (cells && yValid(k, cells[k]) ? Number(cells[k]) || 0 : 0);
    const upper = Y_UPPER.reduce((a, r) => a + v(r[0]), 0), bonus = upper >= 63 ? 35 : 0;
    const lower = Y_LOWER.slice(0, 7).reduce((a, r) => a + v(r[0]), 0) + v("ybonus") * 100;
    const filled = Y_CATS.slice(0, 13).filter(k => cells && cells[k] !== undefined && cells[k] !== "").length;
    return { upper, bonus, upperTotal: upper + bonus, lower, total: upper + bonus + lower, filled, done: filled === 13 };
  }

  // Farkle: turns[p] = that player's turn scores in order. A turn below the entry minimum scores 0 until
  // the player is on the board. The first player to reach the target starts the final round: everyone
  // else gets one more turn, then the highest total wins.
  function farkleStatus(turns, entry, target) {
    const n = turns.length, totals = Array(n).fill(0), cum = turns.map(() => []);
    turns.forEach((list, p) => list.forEach(v => {
      const x = Math.max(0, Math.round(Number(v)) || 0);
      if (totals[p] > 0 || x >= entry) totals[p] += x;
      cum[p].push(totals[p]);
    }));
    let trigger = null;
    const rounds = Math.max(0, ...turns.map(t => t.length));
    for (let r = 0; r < rounds && !trigger; r++) for (let p = 0; p < n && !trigger; p++) if (cum[p][r] !== undefined && cum[p][r] >= target) trigger = { p, r };
    const done = !!trigger && turns.every((t, q) => q === trigger.p || t.length >= (q < trigger.p ? trigger.r + 2 : trigger.r + 1));
    const best = Math.max(...totals);
    const next = done ? null : (() => {
      const left = turns.map((t, q) => q).filter(q => !trigger || (q !== trigger.p && turns[q].length < (q < trigger.p ? trigger.r + 2 : trigger.r + 1)));
      const fewest = Math.min(...left.map(q => turns[q].length));
      return left.find(q => turns[q].length === fewest);
    })();
    return { totals, onBoard: totals.map(t => t > 0), trigger, finalRound: !!trigger && !done, done, next, winners: done ? totals.map((t, q) => (t === best ? q : -1)).filter(q => q >= 0) : [] };
  }

  // Mexican Train and "any game": a total per player; done when every round has a score.
  function roundStatus(scores, rounds, low) {
    const totals = scores.map(list => list.reduce((a, v) => a + (Math.round(Number(v)) || 0), 0));
    const done = scores.every(list => list.filter(v => v !== "" && v != null).length >= rounds);
    const best = low ? Math.min(...totals) : Math.max(...totals);
    return { totals, done, leaders: totals.map((t, q) => (t === best ? q : -1)).filter(q => q >= 0) };
  }

  return { GAMES, DEFAULTS, PAPER, CREDIT, MAX_HALF, clean, textW, fitLine, normalize, geometry, cardCount, spec, farkleChart, mexRounds, layoutCard, layoutPages, svgPage, buildPdf, Y_UPPER, Y_LOWER, Y_CATS, yValid, yTotals, farkleStatus, roundStatus };
});
