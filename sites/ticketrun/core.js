/* TicketRun core: numbering, ticket layout, PDF building and fair winner draws.
   No DOM access, so the same file runs on the page, in the PDF Web Worker and in Node tests.
   All coordinates are PDF points (1/72 inch) with the origin at the bottom-left. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TRCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Glyph advance widths (1/1000 em) of the PDF standard fonts for every WinAnsi code point, from pdf-lib 1.17.1.
  const CPS = [32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,338,339,352,353,376,381,382,402,710,732,8211,8212,8216,8217,8218,8220,8221,8222,8224,8225,8226,8230,8240,8249,8250,8364,8482];
  const W = {
    H: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500,1000,944,667,500,500,611,500,556,333,333,556,1000,222,222,222,333,333,333,556,556,350,1000,1000,333,333,556,1000],
    HB: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556,1000,944,667,556,556,611,500,556,333,333,556,1000,278,278,278,500,500,500,556,556,350,1000,1000,333,333,556,1000],
    T: [250,333,408,500,500,833,778,180,333,333,500,564,250,333,250,278,500,500,500,500,500,500,500,500,500,500,278,278,564,564,564,444,921,722,667,667,722,611,556,722,722,333,389,722,611,889,722,722,556,722,667,556,611,722,722,944,722,722,611,333,278,333,469,500,333,444,500,444,500,444,333,500,500,278,278,500,278,778,500,500,500,500,333,389,278,500,500,722,500,500,444,480,200,480,541,250,333,500,500,500,500,200,500,333,760,276,500,564,333,760,333,400,564,300,300,333,500,453,250,333,300,310,500,750,750,750,444,722,722,722,722,722,722,889,667,611,611,611,611,333,333,333,333,722,722,722,722,722,722,722,564,722,722,722,722,722,722,556,500,444,444,444,444,444,444,667,444,444,444,444,444,278,278,278,278,500,500,500,500,500,500,500,564,500,500,500,500,500,500,500,500,889,722,556,389,500,611,444,500,333,333,500,1000,333,333,333,444,444,444,500,500,350,1000,1000,333,333,500,980],
    TB: [250,333,555,500,500,1000,833,278,333,333,500,570,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,570,570,570,500,930,722,667,722,722,667,611,778,778,389,500,778,667,944,722,778,611,778,722,556,667,722,722,1000,722,722,667,333,278,333,581,500,333,500,556,444,556,444,333,500,556,278,333,556,278,833,556,500,556,556,444,389,333,556,500,722,500,500,444,394,220,394,520,250,333,500,500,500,500,220,500,333,747,300,500,570,333,747,333,400,570,300,300,333,556,540,250,333,300,330,500,750,750,750,500,722,722,722,722,722,722,1000,722,667,667,667,667,389,389,389,389,722,722,778,778,778,778,778,570,778,722,722,722,722,722,611,556,500,500,500,500,500,500,722,444,444,444,444,444,278,278,278,278,500,556,500,500,500,500,500,570,500,556,556,556,556,500,556,500,1000,722,556,389,500,667,444,500,333,333,500,1000,333,333,333,500,500,500,500,500,350,1000,1000,333,333,500,1000],
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

  /* ------------------------------------------------------------ settings */
  const MAX_TICKETS = 20000;
  const PAPER = { letter: { w: 612, h: 792, name: "US Letter" }, a4: { w: 595.28, h: 841.89, name: "A4" } };
  const GRIDS = { 8: { cols: 2, rows: 4 }, 10: { cols: 2, rows: 5 }, 20: { cols: 4, rows: 5 } };
  const MX = 36, MY = 42; // sheet margins: 0.5 in at the sides, 0.58 in top and bottom
  const SITE = "https://ticketrun.vercel.app";
  const CREDIT_URL = SITE + "/?utm_source=ticketrun&utm_medium=watermark&utm_campaign=referral";
  const CREDIT = "Made with TicketRun · ticketrun.vercel.app";

  const DEFAULTS = {
    preset: "raffle", start: 1, end: 500, prefix: "", suffix: "", pad: "auto", numLabel: "No.",
    typeLabel: "Raffle ticket", title: "Spring Fundraiser Raffle", subtitle: "Grand prize: weekend getaway for two",
    date: "Draw: Sat, Dec 12, 2026 at 7 pm", venue: "Lincoln Elementary School gym", price: "$5",
    fine: "Need not be present to win. Thank you for supporting our school!",
    bigNumber: false, stub: "lines", stubPct: 36, stubTitle: "", stubNote: "",
    stubName: true, stubPhone: true, stubEmail: false, stubExtra: "",
    paper: "letter", perPage: 10, order: "row", crop: true, borders: true,
    design: "classic", color: "#be123c", font: "sans", perBook: 0,
  };
  const PRESETS = {
    raffle: { label: "Raffle" },
    fiftyfifty: { label: "50/50", typeLabel: "50/50 raffle", title: "50/50 Raffle", subtitle: "Winner takes half the pot!", date: "Drawing at halftime", venue: "Eagles vs. Lions, Riverside Field", price: "$2 · 3 for $5", fine: "Half of all ticket sales go to the winner, half to the booster club. Need not be present to win.", stub: "lines", stubPct: 36, stubName: true, stubPhone: true, stubEmail: false, stubTitle: "", perPage: 10, bigNumber: false },
    door: { label: "Door prize", typeLabel: "Door prize", title: "Door Prize Ticket", subtitle: "Drop your stub in the box for a chance to win", date: "Prize drawing at 9 pm", venue: "Annual Holiday Party", price: "", fine: "Keep this half. You must be present to win.", stub: "lines", stubPct: 36, stubName: true, stubPhone: false, stubEmail: false, stubTitle: "Door prize entry", perPage: 10, bigNumber: false },
    drink: { label: "Drink", typeLabel: "Drink ticket", title: "Drink Ticket", subtitle: "Good for one drink", date: "Valid Sat, Dec 12, 2026 only", venue: "Winter Gala", price: "", fine: "No cash value.", stub: "none", perPage: 20, bigNumber: false, numLabel: "No." },
    coat: { label: "Coat check", typeLabel: "Coat check", title: "Coat Check", subtitle: "Attach to item", date: "", venue: "The Grand Ballroom", price: "", fine: "Hang this half with the item.", stub: "claim", stubPct: 50, stubTitle: "Coat check", stubNote: "Guest copy: show this ticket to collect your item", perPage: 10, bigNumber: true },
    admission: { label: "Admission", typeLabel: "Admission", title: "Spring Musical", subtitle: "Admit one", date: "Friday, April 16, 2027 at 7 pm", venue: "Westfield High School auditorium", price: "$10", fine: "Non-refundable. Keep your ticket until the end of the show.", stub: "claim", stubPct: 30, stubTitle: "Admit one", stubNote: "Door stub", perPage: 10, bigNumber: false },
    meal: { label: "Meal", typeLabel: "Meal ticket", title: "Pancake Breakfast", subtitle: "Good for one meal", date: "Sat, Dec 12, 2026, 8-11 am", venue: "Fire Station 3", price: "$8", fine: "Includes one drink. No cash value.", stub: "none", perPage: 10, bigNumber: false },
  };
  PRESETS.raffle = Object.assign({}, PRESETS.raffle, {
    typeLabel: DEFAULTS.typeLabel, title: DEFAULTS.title, subtitle: DEFAULTS.subtitle, date: DEFAULTS.date, venue: DEFAULTS.venue,
    price: DEFAULTS.price, fine: DEFAULTS.fine, stub: "lines", stubPct: 36, stubName: true, stubPhone: true, stubEmail: false,
    stubTitle: "", perPage: 10, bigNumber: false,
  });
  function presetState(name, base) {
    const p = PRESETS[name] || PRESETS.raffle;
    const out = Object.assign({}, DEFAULTS, base || {});
    for (const k of Object.keys(p)) if (k !== "label") out[k] = p[k];
    out.preset = PRESETS[name] ? name : "raffle";
    return out;
  }

  const toInt = (v, d) => { const n = Number(String(v == null ? "" : v).replace(/[,\s]/g, "")); return Number.isFinite(n) ? Math.trunc(n) : d; };
  // Validates and cleans a settings object. Returns { s, errors, lost } where lost lists unprintable characters.
  function normalize(input, opts = {}) {
    const s = Object.assign({}, DEFAULTS, input || {});
    const errors = [];
    const lost = new Set();
    for (const k of ["typeLabel", "title", "subtitle", "date", "venue", "price", "fine", "stubTitle", "stubNote", "stubExtra", "numLabel"]) {
      const c = clean(String(s[k] == null ? "" : s[k]).slice(0, 240));
      s[k] = c.text; c.lost.forEach(x => lost.add(x));
    }
    for (const k of ["prefix", "suffix"]) {
      const c = clean(String(s[k] == null ? "" : s[k]).slice(0, 16), true);
      s[k] = c.text; c.lost.forEach(x => lost.add(x));
    }
    s.start = toInt(s.start, NaN);
    s.end = toInt(s.end, NaN);
    if (!Number.isFinite(s.start) || s.start < 0) errors.push("Start number must be a whole number of 0 or more.");
    if (Number.isFinite(s.start) && s.start > 99999999) errors.push("Start number must be 99,999,999 or less.");
    if (opts.rows != null) {
      if (Number.isFinite(s.start)) s.end = s.start + Math.max(1, opts.rows) - 1;
    } else if (!Number.isFinite(s.end) || s.end < 0) errors.push("End number must be a whole number.");
    else if (Number.isFinite(s.start) && s.end < s.start) errors.push("End number must be the same as or larger than the start number.");
    if (Number.isFinite(s.end) && s.end > 99999999) errors.push("End number must be 99,999,999 or less.");
    s.count = errors.length ? 0 : s.end - s.start + 1;
    if (s.count > MAX_TICKETS) errors.push(`That's ${s.count.toLocaleString("en-US")} tickets. One PDF holds up to ${MAX_TICKETS.toLocaleString("en-US")}, so make the rest as a second batch starting at ${(s.start + MAX_TICKETS).toLocaleString("en-US")}.`);
    if (!["auto", "none", "2", "3", "4", "5", "6", "7", "8"].includes(String(s.pad))) s.pad = "auto";
    s.pad = String(s.pad);
    if (!PAPER[s.paper]) s.paper = "letter";
    s.perPage = GRIDS[s.perPage] ? Number(s.perPage) : 10;
    if (!["row", "stack"].includes(s.order)) s.order = "row";
    if (!["none", "lines", "claim"].includes(s.stub)) s.stub = "lines";
    if (s.perPage === 20) s.stub = "none"; // 20-up tickets are too small for a stub
    s.stubPct = clamp(toInt(s.stubPct, 36), 25, 50);
    if (!["classic", "bold", "minimal"].includes(s.design)) s.design = "classic";
    if (!/^#[0-9a-f]{6}$/i.test(String(s.color || ""))) s.color = DEFAULTS.color;
    s.font = s.font === "serif" ? "serif" : "sans";
    s.perBook = clamp(toInt(s.perBook, 0), 0, 1000);
    for (const k of ["bigNumber", "crop", "borders", "stubName", "stubPhone", "stubEmail"]) s[k] = !!s[k];
    return { s, errors, lost: [...lost] };
  }

  /* ------------------------------------------------------------ numbering */
  function padWidth(s) {
    if (s.pad === "none") return 0;
    if (s.pad === "auto") return String(s.end).length;
    return Number(s.pad) || 0;
  }
  const fmtNum = (n, s) => s.prefix + String(n).padStart(padWidth(s), "0") + s.suffix;
  const numText = (n, s) => (s.numLabel ? s.numLabel + " " : "") + fmtNum(n, s);
  const sheetCount = (count, perPage) => Math.ceil(count / perPage);
  // Which ticket (0-based index into the range) sits at a position on a sheet, or -1 for an empty cell.
  // "stack" (cut-and-stack) order: after cutting the whole printed stack once, every pile is in sequence.
  function indexAt(sheet, pos, count, perPage, order) {
    if (order === "stack") {
      const n = Math.ceil(count / perPage);
      const i = pos * n + sheet;
      return i < count ? i : -1;
    }
    const i = sheet * perPage + pos;
    return i < count ? i : -1;
  }
  function sheetGeometry(paper, perPage) {
    const P = PAPER[paper] || PAPER.letter, G = GRIDS[perPage] || GRIDS[10];
    const gw = P.w - 2 * MX, gh = P.h - 2 * MY;
    const cw = gw / G.cols, ch = gh / G.rows;
    const cells = [];
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) cells.push({ x: MX + c * cw, y: P.h - MY - (r + 1) * ch });
    return { pageW: P.w, pageH: P.h, gx: MX, gy: MY, gw, gh, cols: G.cols, rows: G.rows, cellW: cw, cellH: ch, cells, paperName: P.name };
  }
  function books(s) {
    const out = [];
    if (!s.perBook) return out;
    for (let a = s.start, b = 1; a <= s.end; a += s.perBook, b++) out.push({ book: b, from: a, to: Math.min(s.end, a + s.perBook - 1) });
    return out;
  }
  const bookOf = (n, s) => Math.floor((n - s.start) / s.perBook) + 1;

  /* --------------------------------------------------------------- layout */
  const rect = (x, y, w, h, o) => Object.assign({ t: "rect", x, y, w, h }, o);
  const line = (x1, y1, x2, y2, o) => Object.assign({ t: "line", x1, y1, x2, y2, w: 0.6, color: INK }, o);
  const text = (str, x, y, size, font, color, align) => ({ t: "text", text: str, x, y, size, font, color, align: align || "left" });
  const ASC = 0.74; // approximate cap/ascender height used to place text from a top edge

  // Lays out one ticket (stub + body) in a W x H cell. Static parts go in `prims`; per-ticket text
  // (numbers, book numbers, guest fields) goes in `slots`, which the renderer fills for each ticket.
  // opt: { logo: {aspect}, vars: 0|1|2, stubVar: bool }
  function layoutTicket(s, W, H, opt = {}) {
    const prims = [], slots = [], cuts = new Set();
    const F = s.font === "serif" ? { R: "T", B: "TB" } : { R: "H", B: "HB" };
    const minimal = s.design === "minimal";
    const acc = minimal ? INK : readable(hexRgb(s.color));
    const hasStub = s.stub !== "none";
    const sw = hasStub ? W * s.stubPct / 100 : 0;
    const pad = clamp(Math.min(W, H) * 0.065, 6, 10);
    const sampleNum = numText(s.end, s).length >= numText(s.start, s).length ? numText(s.end, s) : numText(s.start, s);
    const sampleBig = fmtNum(s.end, s).length >= fmtNum(s.start, s).length ? fmtNum(s.end, s) : fmtNum(s.start, s);

    if (hasStub && s.design === "bold") prims.push(rect(0, 0, sw, H, { fill: acc }));
    else if (hasStub && s.design === "classic") prims.push(rect(0, 0, sw, H, { fill: mix(acc, WHITE, 0.91) }));
    if (s.design === "bold") prims.push(rect(sw, H - 4, W - sw, 4, { fill: acc }));
    if (s.borders) prims.push(rect(0, 0, W, H, { stroke: CUT, sw: 0.5 }));
    if (hasStub) prims.push(line(sw, 2.5, sw, H - 2.5, { color: GRAY, w: 0.7, dash: [3, 2.2] }));

    if (hasStub) layoutStub();
    layoutBody();
    return { prims, slots, cut: [...cuts], stubW: sw };

    function layoutStub() {
      const onFill = s.design === "bold";
      const ink = onFill ? WHITE : INK, sub = onFill ? WHITE : GRAY, rule = onFill ? WHITE : LIGHT, numC = onFill ? WHITE : acc;
      const x0 = pad * 0.9, x1 = sw - pad * 0.8, w = x1 - x0;
      const k = clamp(Math.min(w / 72, H / 140), 0.75, 1.25);
      let y = H - pad;
      const bottom = pad * 0.9 + (s.perBook ? 9 * k : 0);
      if (s.perBook) slots.push({ key: "book", x: x0, y: pad * 0.9 + 1, size: 6.3 * k, font: F.B, color: sub, align: "left", maxW: w });

      if (s.stub === "claim") {
        const cx = (x0 + x1) / 2;
        if (s.stubTitle) {
          const f = fitLine(s.stubTitle.toUpperCase(), F.B, 7.5 * k, 5.5, w);
          if (f.cut) cuts.add("stub heading");
          prims.push(text(f.text, cx, y - ASC * f.size, f.size, F.B, onFill ? WHITE : acc, "center"));
          y -= f.size * 1.25 + 2;
        }
        const noteSize = 6.4 * k;
        const note = wrap(s.stubNote, F.R, noteSize, w, 3);
        if (note.cut) cuts.add("stub note");
        const nl = note.lines.length;
        const noteH = nl ? nl * noteSize * 1.2 + 3 : 0;
        note.lines.forEach((l, i) => prims.push(text(l, cx, bottom + 1 + (nl - 1 - i) * noteSize * 1.2, noteSize, F.R, sub, "center")));
        const room = y - bottom - noteH;
        const ns = Math.max(7, Math.min(30 * k, (w * 0.94) / textW(sampleBig, F.B, 1), room * 0.72));
        const ny = bottom + noteH + (room - ns * ASC) / 2;
        slots.push({ key: "big", x: cx, y: ny, size: ns, font: F.B, color: numC, align: "center", maxW: w });
        return;
      }

      // "lines" stub: number, optional heading, then write-in lines (Name, Phone, ...)
      let ns = Math.min(10.5 * k, w / textW(sampleNum, F.B, 1));
      slots.push({ key: "num", x: x0, y: y - ASC * ns, size: ns, font: F.B, color: numC, align: "left", maxW: w });
      y -= ns * 1.2 + 1.5;
      if (s.stubTitle) {
        const hs = 6.2 * k;
        const t = wrap(s.stubTitle, F.R, hs, w, 2);
        if (t.cut) cuts.add("stub heading");
        for (const l of t.lines) { prims.push(text(l, x0, y - ASC * hs, hs, F.R, sub)); y -= hs * 1.2; }
        y -= 1;
      }
      const labels = [];
      if (s.stubName) labels.push("Name");
      if (s.stubPhone) labels.push("Phone");
      if (s.stubEmail) labels.push("Email");
      if (s.stubExtra) labels.push(s.stubExtra);
      if (!labels.length) return;
      const ls = 6.2 * k;
      let gap = Math.min(23 * k, (y - bottom) / labels.length);
      let n = labels.length;
      while (n > 1 && gap < 10) { n--; gap = Math.min(23 * k, (y - bottom) / n); }
      if (n < labels.length) cuts.add("stub lines (" + labels.slice(n).join(", ") + ")");
      if (gap < 7) return;
      for (let i = 0; i < n; i++) {
        const base = y - gap * (i + 1) + Math.min(3, gap * 0.2);
        const lf = fitLine(labels[i], F.R, ls, 5, w * 0.6);
        prims.push(text(lf.text, x0, base + 1.2, lf.size, F.R, sub));
        const lx = x0 + textW(lf.text, F.R, lf.size) + 3;
        prims.push(line(lx, base, x1, base, { color: rule, w: 0.5 }));
        if (i === 0 && opt.stubVar && labels[0] === "Name") slots.push({ key: "sv", x: lx + 1.5, y: base + 1.8, size: 7.4 * k, font: F.B, color: ink, align: "left", maxW: x1 - lx - 2 });
      }
    }

    function layoutBody() {
      const x0 = sw + pad * (hasStub ? 1.05 : 1), x1 = W - pad, top = H - pad - (s.design === "bold" ? 3 : 0), bottom = pad * 0.95;
      const bw = x1 - x0;
      const k0 = clamp(Math.min(bw / 172, H / 136), 0.62, 1.2);
      // Largest scale where everything fits uncut; else the largest that fits with some text shortened.
      let best = null, last = null;
      for (let f = 1.2; f >= 0.55; f -= 0.05) {
        const r = s.bigNumber ? bigBody(k0 * f, false) : infoBody(k0 * f, false);
        last = r;
        if (r.ok && (!best || r.cuts.length < best.cuts.length)) best = r;
        if (best && !best.cuts.length) break;
      }
      best = best || last;
      if (!best.ok) {
        // Still too tall at the smallest size: drop optional lines in order until it fits.
        for (const drop of [["venue"], ["venue", "date"], ["venue", "date", "sub2"], ["venue", "date", "sub2", "fine2"]]) {
          const r = s.bigNumber ? bigBody(k0 * 0.55, drop) : infoBody(k0 * 0.55, drop);
          best = r;
          if (r.ok) { drop.forEach(d => cuts.add({ venue: "venue line", date: "date line", sub2: "second subtitle line", fine2: "second small-print line" }[d])); break; }
        }
      }
      best.cuts.forEach(c => cuts.add(c));
      prims.push(...best.prims);
      slots.push(...best.slots);

      function infoBody(k, drop) {
        drop = drop || [];
        const P = [], S = [], C = [];
        let y = top;
        // Header row: type label (left) and ticket number (right), with an optional logo.
        const ns = Math.min(Math.max(7.5, 11 * k), (bw * 0.56) / textW(sampleNum, F.B, 1));
        const numW = textW(sampleNum, F.B, ns);
        let logo = null;
        if (opt.logo) {
          let lh = clamp(H * 0.19, 13, 30), lw = lh * opt.logo.aspect;
          const maxLW = Math.max(10, bw - numW - 8) * 0.6;
          if (lw > maxLW) { lw = maxLW; lh = lw / opt.logo.aspect; }
          logo = { x: x0, y: y - lh, w: lw, h: lh };
          P.push({ t: "img", x: logo.x, y: logo.y, w: lw, h: lh });
        }
        const headH = Math.max(ns * 0.98, logo ? logo.h : 0);
        const base = logo ? y - headH / 2 - ns * 0.36 : y - ns * ASC;
        S.push({ key: "num", x: x1, y: base, size: ns, font: F.B, color: acc, align: "right", maxW: bw * 0.56 });
        const lx = logo ? x0 + logo.w + 5 : x0;
        if (s.typeLabel) {
          const lf = fitLine(s.typeLabel.toUpperCase(), F.B, Math.max(5, 6.6 * k), 5, Math.max(0, x1 - numW - 6 - lx));
          if (lf.cut) C.push("type label");
          if (lf.text) P.push(text(lf.text, lx, base, lf.size, F.B, acc));
        }
        y -= headH + 4.5 * k;
        // Title: one line if it fits at a decent size, otherwise two wrapped lines.
        if (s.title) {
          let ts = Math.max(9, 15.5 * k);
          let lines;
          const one = fitLine(s.title, F.B, ts, Math.max(8.5, 11 * k), bw);
          if (!one.cut) { lines = [one.text]; ts = one.size; }
          else {
            ts = Math.max(8, 11 * k);
            let w2 = wrap(s.title, F.B, ts, bw, 2);
            while (w2.cut && ts > Math.max(7, 8 * k)) { ts -= 0.5; w2 = wrap(s.title, F.B, ts, bw, 2); }
            if (w2.cut) C.push("title");
            lines = w2.lines;
          }
          for (const l of lines) { P.push(text(l, x0, y - ASC * ts, ts, F.B, INK)); y -= ts * 1.13; }
          y -= 1.5 * k;
          if (s.design !== "minimal") { P.push(line(x0, y - 1, x0 + Math.min(26 * k, bw), y - 1, { color: acc, w: 1.3 * k })); y -= 4.5 * k; }
          else y -= 2 * k;
        }
        // Guest fields from a CSV (per ticket)
        if (opt.vars >= 1) { const vs = Math.max(7, 9.2 * k); S.push({ key: "v0", x: x0, y: y - ASC * vs, size: vs, font: F.B, color: INK, align: "left", maxW: bw }); y -= vs * 1.25; }
        if (opt.vars >= 2) { const vs = Math.max(6, 7.6 * k); S.push({ key: "v1", x: x0, y: y - ASC * vs, size: vs, font: F.R, color: INK, align: "left", maxW: bw }); y -= vs * 1.3; }
        if (opt.vars) y -= 1.5 * k;
        if (s.subtitle) {
          const ss = Math.max(6.5, 8.6 * k);
          const w2 = wrap(s.subtitle, F.R, ss, bw, drop.includes("sub2") ? 1 : 2);
          if (w2.cut) C.push("subtitle");
          for (const l of w2.lines) { P.push(text(l, x0, y - ASC * ss, ss, F.R, INK)); y -= ss * 1.2; }
          y -= 2 * k;
        }
        for (const key of ["date", "venue"]) {
          if (!s[key] || drop.includes(key)) continue;
          const ds = Math.max(6, 7.5 * k);
          const f = fitLine(s[key], F.R, ds, Math.max(6, 6.6 * k), bw);
          let lines = [f.text], size = f.size;
          if (f.cut) {
            const w2 = wrap(s[key], F.R, ds, bw, drop.includes("sub2") ? 1 : 2);
            if (w2.cut) C.push(key === "date" ? "date line" : "venue line");
            lines = w2.lines; size = ds;
          }
          for (const l of lines) { P.push(text(l, x0, y - ASC * size, size, F.R, GRAY)); y -= size * 1.2; }
          y -= 0.5;
        }
        // Bottom row: small print (left) and price (right)
        let priceW = 0, bottomH = 0;
        if (s.price) {
          const pf = fitLine(s.price, F.B, Math.max(8, 12.5 * k), 7, bw * 0.5);
          if (pf.cut) C.push("price");
          priceW = textW(pf.text, F.B, pf.size);
          P.push(text(pf.text, x1, bottom + 1, pf.size, F.B, acc, "right"));
          bottomH = pf.size * 0.9;
        }
        if (s.fine) {
          const fs = Math.max(5, 6.1 * k);
          const fw = bw - (priceW ? priceW + 7 : 0);
          const w2 = wrap(s.fine, F.R, fs, fw, drop.includes("fine2") ? 1 : 3);
          if (w2.cut) C.push("small print");
          const n = w2.lines.length;
          w2.lines.forEach((l, i) => P.push(text(l, x0, bottom + 1 + (n - 1 - i) * fs * 1.18, fs, F.R, GRAY)));
          bottomH = Math.max(bottomH, (n - 1) * fs * 1.18 + fs * ASC + 1);
        }
        const ok = y >= bottom + bottomH + 2;
        return { ok, prims: P, slots: S, cuts: C };
      }

      function bigBody(k, drop) {
        drop = drop || [];
        const P = [], S = [], C = [];
        const cx = (x0 + x1) / 2;
        let y = top;
        if (opt.logo) {
          let lh = clamp(H * 0.16, 12, 24), lw = lh * opt.logo.aspect;
          if (lw > bw * 0.3) { lw = bw * 0.3; lh = lw / opt.logo.aspect; }
          P.push({ t: "img", x: x0, y: y - lh, w: lw, h: lh });
        }
        if (s.typeLabel) {
          const lf = fitLine(s.typeLabel.toUpperCase(), F.B, Math.max(5.5, 7.5 * k), 5, bw * (opt.logo ? 0.6 : 1));
          if (lf.cut) C.push("type label");
          P.push(text(lf.text, cx, y - ASC * lf.size, lf.size, F.B, acc, "center"));
          y -= lf.size * 1.3;
        }
        if (s.title && s.title.toUpperCase() !== s.typeLabel.toUpperCase()) {
          const tf = fitLine(s.title, F.B, Math.max(7.5, 10.5 * k), 6.5, bw);
          if (tf.cut) C.push("title");
          P.push(text(tf.text, cx, y - ASC * tf.size, tf.size, F.B, INK, "center"));
          y -= tf.size * 1.25;
        }
        // Bottom block, built upwards: small print, then venue/date, then price.
        let by = bottom + 1;
        const under = [];
        if (s.fine) {
          const fs = Math.max(5, 6.1 * k);
          const w2 = wrap(s.fine, F.R, fs, bw, drop.includes("fine2") ? 1 : 2);
          if (w2.cut) C.push("small print");
          w2.lines.slice().reverse().forEach(l => { P.push(text(l, cx, by, fs, F.R, GRAY, "center")); by += fs * 1.18; });
          by += 1.5 * k;
        }
        for (const key of ["venue", "date"]) {
          if (!s[key] || drop.includes(key)) continue;
          const f = fitLine(s[key], F.R, Math.max(6, 7.2 * k), 5.5, bw);
          if (f.cut) C.push(key === "date" ? "date line" : "venue line");
          P.push(text(f.text, cx, by, f.size, F.R, GRAY, "center"));
          by += f.size * 1.25;
        }
        if (s.price) {
          const pf = fitLine(s.price, F.B, Math.max(7.5, 10 * k), 6.5, bw);
          P.push(text(pf.text, cx, by, pf.size, F.B, acc, "center"));
          by += pf.size * 1.2;
        }
        // Number in the middle, subtitle (and guest name) under it.
        const ss = Math.max(6.5, 8.2 * k);
        const subLines = s.subtitle ? wrap(s.subtitle, F.R, ss, bw, drop.includes("sub2") ? 1 : 2) : { lines: [], cut: false };
        if (subLines.cut) C.push("subtitle");
        const varH = opt.vars ? 9 * k * 1.3 : 0;
        const subH = subLines.lines.length * ss * 1.2 + varH;
        const room = y - by - subH - 3;
        const ns = Math.min(34 * k, (bw * 0.92) / textW(sampleBig, F.B, 1), room * 0.85);
        const ok = ns >= 9 && room > 0;
        const mid = by + subH + 3 + room / 2;
        const nb = mid - (ns * ASC) / 2;
        S.push({ key: "big", x: cx, y: nb, size: Math.max(ns, 6), font: F.B, color: acc, align: "center", maxW: bw });
        let sy = nb - ns * 0.26 - ss * ASC - 2;
        if (opt.vars) { const vs = Math.max(7, 9 * k); S.push({ key: "v0", x: cx, y: sy, size: vs, font: F.B, color: INK, align: "center", maxW: bw }); sy -= vs * 1.3; }
        for (const l of subLines.lines) { P.push(text(l, cx, sy, ss, F.R, INK, "center")); sy -= ss * 1.2; }
        return { ok, prims: P, slots: S, cuts: C };
      }
    }
  }

  // Everything printed on a sheet outside the tickets: crop marks, sheet info, the referral credit.
  function sheetPrims(s, g, sheet, sheets, firstIdx, lastIdx) {
    const P = [];
    if (s.crop) {
      const o = 3, L = 9, xs = [], ys = [];
      for (let c = 0; c <= g.cols; c++) xs.push(g.gx + c * g.cellW);
      for (let r = 0; r <= g.rows; r++) ys.push(g.gy + r * g.cellH);
      const top = g.gy + g.gh, right = g.gx + g.gw;
      for (const x of xs) { P.push(line(x, top + o, x, top + o + L, { w: 0.5 })); P.push(line(x, g.gy - o, x, g.gy - o - L, { w: 0.5 })); }
      for (const y of ys) { P.push(line(g.gx - o, y, g.gx - o - L, y, { w: 0.5 })); P.push(line(right + o, y, right + o + L, y, { w: 0.5 })); }
    }
    const label = s.typeLabel || "Tickets";
    let info = `${label} · sheet ${sheet + 1} of ${sheets}`;
    if (s.order === "stack") info += " · cut-and-stack order";
    else if (firstIdx >= 0) info += ` · ${fmtNum(s.start + firstIdx, s)}–${fmtNum(s.start + lastIdx, s)}`;
    const infoF = fitLine(info, "H", 6.5, 5, g.gw * 0.62);
    P.push(text(infoF.text, g.gx + 8, g.pageH - MY + 16, infoF.size, "H", GRAY));
    P.push(text("Print at 100% (Actual size)", g.gx + g.gw - 8, g.pageH - MY + 16, 6.5, "H", GRAY, "right"));
    const cw = textW(CREDIT, "H", 7);
    const cx = g.pageW / 2, cy = MY - 22;
    P.push(text(CREDIT, cx, cy, 7, "H", GRAY, "center"));
    P.push({ t: "link", x: cx - cw / 2 - 2, y: cy - 2.5, w: cw + 4, h: 10, url: CREDIT_URL });
    return P;
  }

  // Text for a per-ticket slot.
  function slotText(key, idx, s, names) {
    const n = s.start + idx;
    if (key === "num") return numText(n, s);
    if (key === "big") return fmtNum(n, s);
    if (key === "book") return "Book " + bookOf(n, s);
    if (names) {
      const row = names.rows[idx] || {};
      if (key === "v0" || key === "sv") return row.v0 || "";
      if (key === "v1") return row.v1 || "";
    }
    return "";
  }

  /* --------------------------------------------------------------- SVG preview */
  // Same primitives as the PDF, drawn as SVG for the on-page preview and PNG export.
  const FAM = { H: "Helvetica,Arial,'Liberation Sans',sans-serif", T: "'Times New Roman',Times,'Liberation Serif',serif" };
  const xmlEsc = v => String(v).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const col = a => "rgb(" + a.map(v => Math.round(v * 255)).join(",") + ")";
  const r2 = v => Math.round(v * 100) / 100;
  function svgText(str, x, y, size, font, color, align, H) {
    const w = textW(str, font, size);
    const lx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    return `<text x="${r2(lx)}" y="${r2(H - y)}" font-size="${r2(size)}" font-family="${FAM[font[0]]}"${font.length > 1 ? ' font-weight="700"' : ""} fill="${col(color)}" textLength="${r2(w)}" lengthAdjust="spacingAndGlyphs">${xmlEsc(str)}</text>`;
  }
  function svgPrims(prims, H, dx, dy, logoHref) {
    let out = "";
    for (const p of prims) {
      if (p.t === "rect") out += `<rect x="${r2(dx + p.x)}" y="${r2(H - (dy + p.y + p.h))}" width="${r2(p.w)}" height="${r2(p.h)}" fill="${p.fill ? col(p.fill) : "none"}"${p.stroke ? ` stroke="${col(p.stroke)}" stroke-width="${p.sw || 0.5}"` : ""}/>`;
      else if (p.t === "line") out += `<line x1="${r2(dx + p.x1)}" y1="${r2(H - dy - p.y1)}" x2="${r2(dx + p.x2)}" y2="${r2(H - dy - p.y2)}" stroke="${col(p.color)}" stroke-width="${p.w}"${p.dash ? ` stroke-dasharray="${p.dash.join(" ")}"` : ""}/>`;
      else if (p.t === "text" && p.text) out += svgText(p.text, dx + p.x, dy + p.y, p.size, p.font, p.color, p.align, H);
      else if (p.t === "img" && logoHref) out += `<image href="${xmlEsc(logoHref)}" x="${r2(dx + p.x)}" y="${r2(H - (dy + p.y + p.h))}" width="${r2(p.w)}" height="${r2(p.h)}" preserveAspectRatio="none"/>`;
    }
    return out;
  }
  function svgSlots(lay, s, idx, names, H, dx, dy) {
    let out = "";
    for (const sl of lay.slots) {
      const str = slotText(sl.key, idx, s, names);
      if (!str) continue;
      const f = fitSlot(sl, str);
      out += svgText(f.text, dx + sl.x, dy + sl.y, f.size, sl.font, sl.color, sl.align, H);
    }
    return out;
  }
  // One ticket as a standalone SVG (W x H points). pad adds white space around it.
  function svgTicket(s, lay, W, H, idx, names, logoHref, pad = 0) {
    const TW = W + 2 * pad, TH = H + 2 * pad;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(TW)} ${r2(TH)}" width="${r2(TW)}" height="${r2(TH)}" style="font-kerning:none"><rect width="100%" height="100%" fill="#fff"/>` +
      svgPrims(lay.prims, TH, pad, pad, logoHref) + svgSlots(lay, s, idx, names, TH, pad, pad) + "</svg>";
  }
  // A whole sheet as SVG, exactly as it will print.
  function svgSheet(s, g, lay, sheet, names, logoHref) {
    const sheets = sheetCount(s.count, s.perPage);
    const idxs = [];
    for (let pos = 0; pos < s.perPage; pos++) idxs.push(indexAt(sheet, pos, s.count, s.perPage, s.order));
    const used = idxs.filter(i => i >= 0);
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(g.pageW)} ${r2(g.pageH)}" style="font-kerning:none"><rect width="100%" height="100%" fill="#fff"/>`;
    out += svgPrims(sheetPrims(s, g, sheet, sheets, Math.min(...used), Math.max(...used)), g.pageH, 0, 0);
    idxs.forEach((idx, pos) => {
      if (idx < 0) return;
      const c = g.cells[pos];
      out += svgPrims(lay.prims, g.pageH, c.x, c.y, logoHref) + svgSlots(lay, s, idx, names, g.pageH, c.x, c.y);
    });
    return out + "</svg>";
  }

  /* --------------------------------------------------------------- CSV */
  function parseCSV(textIn) {
    const src = String(textIn || "").replace(/^﻿/, "");
    const first = src.split(/\r?\n/)[0] || "";
    const counts = { ",": (first.match(/,/g) || []).length, ";": (first.match(/;/g) || []).length, "\t": (first.match(/\t/g) || []).length };
    const d = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    const rows = [];
    let row = [], f = "", q = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (q) {
        if (c === '"') { if (src[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"' && f === "") q = true;
      else if (c === d) { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && src[i + 1] === "\n") i++;
        row.push(f); f = "";
        if (row.some(v => v.trim() !== "")) rows.push(row);
        row = [];
      } else f += c;
    }
    row.push(f);
    if (row.some(v => v.trim() !== "")) rows.push(row);
    return rows.map(r => r.map(v => v.trim()));
  }
  // Turns parsed CSV rows into per-ticket guest lines. cols: { name: index, extra: [indexes] }
  function guestRows(rows, cols) {
    const head = rows[0] || [];
    return rows.slice(1).map(r => {
      const v0 = cols.name >= 0 ? clean(r[cols.name] || "").text : "";
      const parts = (cols.extra || []).map(i => {
        const val = clean(r[i] || "").text;
        if (!val) return "";
        const h = clean(head[i] || "").text;
        if (!h) return val;
        return val.length <= 4 && /^[\w-]+$/.test(val) ? `${h} ${val}` : `${h}: ${val}`;
      }).filter(Boolean);
      return { v0, v1: parts.join(" · ") };
    });
  }

  /* ------------------------------------------------------------ PDF output */
  const FONT_NAMES = { H: "Helvetica", HB: "Helvetica-Bold", T: "Times-Roman", TB: "Times-Bold" };
  async function embedFonts(L, doc, keys) {
    const out = {};
    for (const k of keys) out[k] = await doc.embedFont(FONT_NAMES[k]);
    return out;
  }
  function drawPrims(L, page, prims, fonts, dx, dy, img) {
    const c = a => L.rgb(a[0], a[1], a[2]);
    for (const p of prims) {
      if (p.t === "rect") {
        const o = { x: dx + p.x, y: dy + p.y, width: p.w, height: p.h };
        if (p.fill) o.color = c(p.fill);
        if (p.stroke) { o.borderColor = c(p.stroke); o.borderWidth = p.sw || 0.5; }
        page.drawRectangle(o);
      } else if (p.t === "line") {
        const o = { start: { x: dx + p.x1, y: dy + p.y1 }, end: { x: dx + p.x2, y: dy + p.y2 }, thickness: p.w, color: c(p.color) };
        if (p.dash) o.dashArray = p.dash;
        page.drawLine(o);
      } else if (p.t === "text") {
        if (!p.text) continue;
        const w = textW(p.text, p.font, p.size);
        const x = p.align === "center" ? p.x - w / 2 : p.align === "right" ? p.x - w : p.x;
        page.drawText(p.text, { x: dx + x, y: dy + p.y, size: p.size, font: fonts[p.font], color: c(p.color) });
      } else if (p.t === "img" && img) {
        page.drawImage(img, { x: dx + p.x, y: dy + p.y, width: p.w, height: p.h });
      }
    }
  }
  function addLink(L, doc, page, p) {
    const annot = doc.context.obj({
      Type: "Annot", Subtype: "Link", Rect: [p.x, p.y, p.x + p.w, p.y + p.h], Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: L.PDFString.of(p.url) },
    });
    page.node.set(L.PDFName.of("Annots"), doc.context.obj([doc.context.register(annot)]));
  }
  const tick = () => new Promise(r => setTimeout(r, 0));
  // Fit a slot's text: shrink if wider than its box (only guest names normally need this).
  function fitSlot(sl, str) {
    const w = textW(str, sl.font, sl.size);
    if (w <= sl.maxW) return { text: str, size: sl.size, w };
    const f = fitLine(str, sl.font, sl.size, Math.max(5, sl.size * 0.6), sl.maxW);
    return { text: f.text, size: f.size, w: textW(f.text, sl.font, f.size) };
  }

  /* Builds the ticket PDF. opts: { names: {rows}, logo: {bytes, type:'png'|'jpg', aspect}, sheets: limit, onProgress } */
  async function buildTicketPdf(L, input, opts = {}) {
    const rowsN = opts.names ? opts.names.rows.length : null;
    const { s, errors } = normalize(input, rowsN != null ? { rows: rowsN } : {});
    if (errors.length) throw new Error(errors[0]);
    const g = sheetGeometry(s.paper, s.perPage);
    const vars = opts.names ? (opts.names.rows.some(r => r.v1) ? 2 : 1) : 0;
    const lay = layoutTicket(s, g.cellW, g.cellH, { logo: opts.logo ? { aspect: opts.logo.aspect } : null, vars, stubVar: !!opts.names });
    const doc = await L.PDFDocument.create();
    const title = `${s.typeLabel || "Tickets"} ${fmtNum(s.start, s)}-${fmtNum(s.end, s)}`;
    doc.setTitle(title);
    doc.setSubject(s.title || title);
    doc.setCreator("TicketRun (ticketrun.vercel.app)");
    doc.setProducer("TicketRun with pdf-lib");
    doc.setKeywords(["tickets", "numbered", "TicketRun"]);
    const fonts = await embedFonts(L, doc, ["H", "HB", "T", "TB"].filter(k => k === "H" || (s.font === "serif" ? k[0] === "T" : k === "HB")));

    // The static ticket design is drawn once into a template page and reused as a Form XObject,
    // so thousands of tickets stay small and fast.
    const tdoc = await L.PDFDocument.create();
    const tfonts = await embedFonts(L, tdoc, s.font === "serif" ? ["T", "TB"] : ["H", "HB"]);
    const tpage = tdoc.addPage([g.cellW, g.cellH]);
    let timg = null;
    if (opts.logo) timg = opts.logo.type === "jpg" ? await tdoc.embedJpg(opts.logo.bytes) : await tdoc.embedPng(opts.logo.bytes);
    drawPrims(L, tpage, lay.prims, tfonts, 0, 0, timg);
    await tdoc.flush(); // pdf-lib embeds fonts/images lazily; make them real before copying the page
    const tpl = await doc.embedPage(tpage);

    const sheets = sheetCount(s.count, s.perPage);
    const limit = Math.min(sheets, opts.sheets || sheets);
    const c = a => L.rgb(a[0], a[1], a[2]);
    for (let sh = 0; sh < limit; sh++) {
      const page = doc.addPage([g.pageW, g.pageH]);
      const idxs = [];
      for (let pos = 0; pos < s.perPage; pos++) idxs.push(indexAt(sh, pos, s.count, s.perPage, s.order));
      const used = idxs.filter(i => i >= 0);
      const sp = sheetPrims(s, g, sh, sheets, Math.min(...used), Math.max(...used));
      drawPrims(L, page, sp.filter(p => p.t !== "link"), fonts, 0, 0);
      sp.filter(p => p.t === "link").forEach(p => addLink(L, doc, page, p));
      idxs.forEach((idx, pos) => {
        if (idx < 0) return;
        const cell = g.cells[pos];
        page.drawPage(tpl, { x: cell.x, y: cell.y });
        for (const sl of lay.slots) {
          const str = slotText(sl.key, idx, s, opts.names);
          if (!str) continue;
          const f = fitSlot(sl, str);
          const x = sl.align === "center" ? sl.x - f.w / 2 : sl.align === "right" ? sl.x - f.w : sl.x;
          page.drawText(f.text, { x: cell.x + x, y: cell.y + sl.y, size: f.size, font: fonts[sl.font], color: c(sl.color) });
        }
      });
      if (opts.onProgress && (sh % 25 === 24 || sh === limit - 1)) { opts.onProgress((sh + 1) / limit, sh + 1, limit); await tick(); }
    }
    const bytes = await doc.save();
    return { bytes, sheets: limit, totalSheets: sheets, count: s.count, cut: lay.cut };
  }

  /* Seller log / reconciliation sheet: one row per book of tickets. */
  async function buildSellerPdf(L, input, opts = {}) {
    const { s, errors } = normalize(input);
    if (errors.length) throw new Error(errors[0]);
    const per = clamp(toInt(opts.perBook || s.perBook, 25), 1, 1000);
    s.perBook = per;
    const bk = books(s);
    const sellers = (opts.sellers || []).map(x => clean(x).text).filter(Boolean);
    const bps = clamp(toInt(opts.booksPerSeller, 1), 1, 1000);
    const P = PAPER[s.paper] || PAPER.letter;
    const pw = P.h, ph = P.w; // landscape
    const doc = await L.PDFDocument.create();
    doc.setTitle(`Ticket seller log ${fmtNum(s.start, s)}-${fmtNum(s.end, s)}`);
    doc.setCreator("TicketRun (ticketrun.vercel.app)");
    doc.setProducer("TicketRun with pdf-lib");
    const fonts = await embedFonts(L, doc, ["H", "HB"]);
    const c = a => L.rgb(a[0], a[1], a[2]);
    const mx = 36, top = ph - 40, rowH = 20;
    const cols = [["Book", 0.055], ["Ticket numbers", 0.15], ["Seller", 0.16], ["Phone", 0.105], ["Date out", 0.075], ["Sold", 0.06], ["Unsold returned", 0.08], ["Cash due", 0.08], ["Cash received", 0.085], ["Date in", 0.075], ["Initials", 0.075]];
    const tw = pw - 2 * mx;
    const xs = [mx];
    cols.forEach(([, f]) => xs.push(xs[xs.length - 1] + f * tw));
    xs[xs.length - 1] = mx + tw;
    const headH = 26;
    const tableTop = top - 46;
    // Full pages take `cap` rows; the last page also needs the totals row and the summary lines.
    const cap = Math.floor((tableTop - headH - 40) / rowH), lastCap = Math.floor((tableTop - headH - 72) / rowH);
    const chunks = [];
    for (let i = 0; ;) {
      const rem = bk.length - i;
      if (rem + 1 <= lastCap) { chunks.push(bk.slice(i)); break; }
      const take = rem <= cap ? rem - 1 : cap; // never leave the totals row alone on a page
      chunks.push(bk.slice(i, i + take));
      i += take;
    }
    const pages = chunks.length;
    const priceNum = (() => { const m = /^\D{0,3}(\d+(?:[.,]\d{1,2})?)\D{0,6}$/.exec(s.price || ""); return m && !/for|\//i.test(s.price) ? parseFloat(m[1].replace(",", ".")) : null; })();
    const T = (str, x, y, size, font, color, align) => {
      const st = clean(str).text, w = textW(st, font, size);
      const xx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
      return { st, x: xx, y, size, font, color };
    };
    for (let pg = 0; pg < pages; pg++) {
      const page = doc.addPage([pw, ph]);
      const put = t => page.drawText(t.st, { x: t.x, y: t.y, size: t.size, font: fonts[t.font], color: c(t.color) });
      put(T("Ticket seller log" + (s.title ? " — " + s.title : ""), mx, top - 4, 15, "HB", INK));
      const per$ = priceNum != null ? ` · ${s.price} each, a full book is ${s.price.replace(/[\d.,]+/, (priceNum * per).toFixed(Number.isInteger(priceNum * per) ? 0 : 2))}` : (s.price ? ` · Price: ${s.price}` : "");
      put(T(`${s.count.toLocaleString("en-US")} tickets (${fmtNum(s.start, s)}–${fmtNum(s.end, s)}) in ${bk.length} books of ${per}${per$}`, mx, top - 22, 9, "H", GRAY));
      put(T(`Page ${pg + 1} of ${pages}`, pw - mx, top - 4, 9, "H", GRAY, "right"));
      // header row
      page.drawRectangle({ x: mx, y: tableTop - headH, width: tw, height: headH, color: c(mix(INK, WHITE, 0.92)) });
      cols.forEach(([h], i) => {
        const w = xs[i + 1] - xs[i] - 6;
        const lines = wrap(h, "HB", 7.5, w, 2).lines;
        lines.forEach((l, j) => put(T(l, xs[i] + 3, tableTop - 10 - j * 8.5 + (lines.length === 1 ? -4 : 0), 7.5, "HB", INK)));
      });
      const rows = chunks[pg];
      const isLast = pg === pages - 1;
      const nRows = rows.length + (isLast ? 1 : 0);
      for (let r = 0; r < nRows; r++) {
        const y = tableTop - headH - (r + 1) * rowH;
        if (r % 2 === 1) page.drawRectangle({ x: mx, y, width: tw, height: rowH, color: c(mix(INK, WHITE, 0.965)) });
        const b = rows[r];
        if (b) {
          put(T(String(b.book), xs[0] + 3, y + 7, 9, "HB", INK));
          put(T(`${fmtNum(b.from, s)}–${fmtNum(b.to, s)}`, xs[1] + 3, y + 7, 9, "H", INK));
          const si = Math.floor((b.book - 1) / bps);
          if (sellers[si]) put(T(fitLine(sellers[si], "H", 9, 6, xs[3] - xs[2] - 6).text, xs[2] + 3, y + 7, 9, "H", INK));
          if (b.to - b.from + 1 !== per) put(T(`(${b.to - b.from + 1} tickets)`, xs[1] + 3 + textW(`${fmtNum(b.from, s)}–${fmtNum(b.to, s)}`, "H", 9) + 4, y + 7, 7, "H", GRAY));
        } else {
          put(T("Totals", xs[0] + 3, y + 7, 9, "HB", INK));
        }
      }
      // grid
      const gTop = tableTop, gBot = tableTop - headH - nRows * rowH;
      for (const x of xs) page.drawLine({ start: { x, y: gTop }, end: { x, y: gBot }, thickness: 0.5, color: c(LIGHT) });
      page.drawLine({ start: { x: mx, y: gTop }, end: { x: mx + tw, y: gTop }, thickness: 0.5, color: c(LIGHT) });
      for (let r = 0; r <= nRows; r++) { const y = tableTop - headH - r * rowH; page.drawLine({ start: { x: mx, y }, end: { x: mx + tw, y }, thickness: r === 0 || (isLast && r === nRows - 1) ? 0.9 : 0.4, color: c(r === 0 ? INK : LIGHT) }); }
      if (isLast) {
        let y = gBot - 22;
        const items = ["Tickets printed: " + s.count.toLocaleString("en-US"), "Sold: ________", "Returned unsold: ________", "Missing: ________", "Cash counted: __________", "Counted by: ______________ and ______________"];
        let x = mx;
        for (const it of items) {
          const t = T(it, x, y, 9, it.startsWith("Tickets") ? "HB" : "H", INK);
          const w = textW(t.st, t.font, 9);
          if (x + w > mx + tw) { y -= 16; x = mx; t.x = x; t.y = y; }
          put(t);
          x += w + 18;
        }
        put(T("Sold + returned unsold + missing should equal tickets printed. Count cash with two people present.", mx, y - 15, 8, "H", GRAY));
      }
      const cw = textW(CREDIT, "H", 7);
      put(T(CREDIT, pw / 2, 18, 7, "H", GRAY, "center"));
      addLink(L, doc, page, { x: pw / 2 - cw / 2 - 2, y: 15.5, w: cw + 4, h: 10, url: CREDIT_URL });
    }
    return { bytes: await doc.save(), pages, books: bk.length };
  }

  /* ---------------------------------------------------------- fair draws */
  const defaultFill = a => (globalThis.crypto || self.crypto).getRandomValues(a);
  // Uniform integer in [0, n) from 32-bit random values, using rejection sampling (no modulo bias).
  function uniformInt(n, fill = defaultFill) {
    if (!Number.isInteger(n) || n < 1 || n > 0x100000000) throw new RangeError("n out of range");
    const limit = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    for (let tries = 0; tries < 1000; tries++) {
      fill(buf);
      if (buf[0] < limit) return buf[0] % n;
    }
    throw new Error("random source failed");
  }
  // "1-50, 75, 101–120" -> [[1,50],[75,75],[101,120]]; reports tokens it couldn't read.
  function parseRanges(str) {
    const ranges = [], bad = [];
    for (const raw of String(str || "").split(/[,;\n]+/)) {
      const t = raw.trim();
      if (!t) continue;
      const m = /^(?:[A-Za-z#.\s-]*?)(\d+)(?:\s*(?:-|–|—|to|\.\.)\s*(?:[A-Za-z#.\s-]*?)(\d+))?\s*[A-Za-z]*$/i.exec(t);
      if (!m) { bad.push(t); continue; }
      let a = parseInt(m[1], 10), b = m[2] != null ? parseInt(m[2], 10) : a;
      if (b < a) [a, b] = [b, a];
      ranges.push([a, b]);
    }
    return { ranges, bad };
  }
  const MAX_POOL = 2000000;
  function buildPool(first, last, exclude) {
    first = toInt(first, NaN); last = toInt(last, NaN);
    if (!Number.isFinite(first) || !Number.isFinite(last) || first < 0) throw new Error("Enter the first and last ticket numbers.");
    if (last < first) throw new Error("The last number must be the same as or larger than the first.");
    if (last - first + 1 > MAX_POOL) throw new Error("The picker handles up to 2,000,000 numbers at a time.");
    const ex = new Set();
    for (const [a, b] of (exclude || [])) for (let n = Math.max(a, first); n <= Math.min(b, last); n++) ex.add(n);
    const pool = [];
    for (let n = first; n <= last; n++) if (!ex.has(n)) pool.push(n);
    return { pool, excluded: ex.size, total: last - first + 1 };
  }
  // Draws k distinct winners; removes them from pool (so repeated calls never repeat a winner).
  function drawFrom(pool, k, fill = defaultFill) {
    const out = [];
    for (let i = 0; i < k && pool.length; i++) {
      const j = uniformInt(pool.length, fill);
      out.push(pool[j]);
      pool[j] = pool[pool.length - 1];
      pool.pop();
    }
    return out;
  }

  return {
    CPS, W, clean, textW, fitLine, wrap, ellipsize, hexRgb, readable, mix,
    MAX_TICKETS, PAPER, GRIDS, MX, MY, DEFAULTS, PRESETS, presetState, normalize,
    padWidth, fmtNum, numText, sheetCount, indexAt, sheetGeometry, books, bookOf,
    layoutTicket, sheetPrims, slotText, fitSlot, parseCSV, guestRows, svgTicket, svgSheet,
    buildTicketPdf, buildSellerPdf, uniformInt, parseRanges, buildPool, drawFrom, MAX_POOL,
    CREDIT, CREDIT_URL, SITE,
  };
});
