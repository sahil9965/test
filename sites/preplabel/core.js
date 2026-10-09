/*! PrepLabel core · https://fnsku.roohsites.com
 * Code 128 encoder, label stock geometry, label layouts, PDF / SVG / ZPL output,
 * CSV / XLSX import and Seller Central sheet detection. Pure functions with no DOM access,
 * so the same file runs in the browser (window.PLCore) and in Node tests (module.exports). */
(function (root) {
  "use strict";
  const PT = 25.4 / 72; // 1 pt in mm
  const MM = 72 / 25.4; // 1 mm in pt
  const LH = 1.15; // line height factor
  const SITE = "https://fnsku.roohsites.com";
  const CREDIT_URL = SITE + "/?utm_source=preplabel&utm_medium=watermark&utm_campaign=referral";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const r2 = v => Math.round(v * 100) / 100;

  /* ---------------------------------------------------------------- Code 128 */
  const C128 = ("212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112").split(" ");

  // Encodes printable ASCII (32-126). Uses subset A when there are no lowercase letters
  // (Amazon's item-label spec names Code 128A), subset B otherwise, and switches to
  // subset C only for long digit runs where it makes the symbol shorter.
  function code128(input) {
    const s = String(input);
    if (!s.length) throw new Error("Nothing to encode");
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c < 32 || c > 126) throw new Error("Only plain letters, digits and basic symbols can go in a Code 128 barcode");
    }
    const base = /[`a-z{|}~]/.test(s) ? "B" : "A";
    const n = s.length;
    const isD = i => { const c = s.charCodeAt(i); return c >= 48 && c <= 57; };
    const run = i => { let j = i; while (j < n && isD(j)) j++; return j - i; };
    const vals = [];
    let cur = null;
    const to = set => {
      if (cur === set) return;
      if (cur === null) vals.push({ A: 103, B: 104, C: 105 }[set]);
      else vals.push(set === "C" ? 99 : set === "B" ? 100 : 101);
      cur = set;
    };
    let i = 0;
    while (i < n) {
      const r = run(i);
      const whole = i === 0 && r === n;
      const useC = whole ? (r >= 2 && r % 2 === 0) || r >= 5 : r >= (i === 0 || i + r === n ? 4 : 6);
      if (useC) {
        let k = r;
        if (k % 2) { to(base); vals.push(s.charCodeAt(i) - 32); i++; k--; }
        to("C");
        for (let j = 0; j < k; j += 2) vals.push(+s.substr(i + j, 2));
        i += k;
      } else {
        to(base);
        vals.push(s.charCodeAt(i) - 32);
        i++;
      }
    }
    let sum = vals[0];
    for (let k = 1; k < vals.length; k++) sum += vals[k] * k;
    vals.push(sum % 103, 106);
    let modules = "";
    for (const v of vals) {
      let dark = true;
      for (const d of C128[v]) { modules += (dark ? "1" : "0").repeat(+d); dark = !dark; }
    }
    return { text: s, values: vals, modules, set: base };
  }
  // Dark runs of a module string as [start, length] pairs.
  function darkRuns(mod) {
    const out = [];
    for (let i = 0; i < mod.length;) {
      if (mod[i] === "1") { let j = i; while (j < mod.length && mod[j] === "1") j++; out.push([i, j - i]); i = j; } else i++;
    }
    return out;
  }

  /* ---------------------------------------------------------------- Text metrics (Helvetica AFM) */
  const SPECIAL = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  const GLYPHS = [];
  for (let c = 32; c < 127; c++) GLYPHS.push(String.fromCharCode(c));
  for (let c = 160; c < 256; c++) GLYPHS.push(String.fromCharCode(c));
  for (const ch of SPECIAL) GLYPHS.push(ch);
  const WR = "278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500,556,222,556,333,1000,556,556,333,1000,667,333,1000,611,222,222,333,333,350,556,1000,333,1000,500,333,944,500,500".split(",").map(Number);
  const WB = "278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556,556,278,556,500,1000,556,556,333,1000,667,333,1000,611,278,278,500,500,350,556,1000,333,1000,556,333,944,500,556".split(",").map(Number);
  const WMAP = { r: new Map(), b: new Map() };
  GLYPHS.forEach((g, i) => { WMAP.r.set(g, WR[i]); WMAP.b.set(g, WB[i]); });
  // Width of a string in mm at a point size.
  function textW(str, pt, bold) {
    const m = bold ? WMAP.b : WMAP.r;
    let w = 0;
    for (const ch of str) w += m.get(ch) ?? 556;
    return (w / 1000) * pt * PT;
  }
  const REPL = { "\u00a0": " ", "\u00ad": "", "\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2212": "-", "\u2032": "'", "\u2033": '"', "\u2009": " ", "\u202f": " ", "\u2007": " ", "\u200b": "", "\u0141": "L", "\u0142": "l", "\u0110": "D", "\u0111": "d", "\u0126": "H", "\u0127": "h", "\u0131": "i", "\u013f": "L", "\u0140": "l" };
  // Makes text printable with the built-in PDF fonts (WinAnsi). Accented Latin letters
  // that the font lacks are reduced to their base letter; anything else is dropped.
  function clean(input) {
    let out = "", lost = false;
    for (const ch of String(input ?? "").normalize("NFC")) {
      if (ch in REPL) { out += REPL[ch]; continue; }
      if (ch === "\t" || ch === "\n" || ch === "\r") { out += " "; continue; }
      if (WMAP.r.has(ch)) { out += ch; continue; }
      const base = ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
      if (base && [...base].every(c => WMAP.r.has(c))) { out += base; continue; }
      lost = true;
    }
    return { text: out.replace(/\s+/g, " ").trim(), lost };
  }

  // Greedy word wrap; words wider than the line are broken by character.
  function wrap(str, pt, bold, maxW) {
    const words = str.split(" ").filter(Boolean);
    const lines = [];
    const fits = t => textW(t, pt, bold) <= maxW + 1e-6;
    let line = "";
    for (let w of words) {
      const cand = line ? line + " " + w : w;
      if (fits(cand)) { line = cand; continue; }
      if (line) { lines.push(line); line = ""; }
      while (w.length > 1 && !fits(w)) {
        let k = w.length - 1;
        while (k > 1 && !fits(w.slice(0, k))) k--;
        lines.push(w.slice(0, k));
        w = w.slice(k);
      }
      line = w;
    }
    if (line) lines.push(line);
    return lines;
  }
  function midTrunc(chars, k) {
    const head = Math.ceil(k * 0.62), tail = k - head;
    return chars.slice(0, head).join("").trimEnd() + "…" + (tail > 0 ? chars.slice(chars.length - tail).join("").trimStart() : "");
  }
  // Fits text into maxLines lines. Long text is shortened in the middle ("Start of title…end"),
  // the way Seller Central shortens titles, so size and colour details at the end stay visible.
  function fitText(text, pt, bold, maxW, maxLines) {
    const t = String(text || "").trim();
    if (!t || maxLines < 1) return [];
    const lines = wrap(t, pt, bold, maxW);
    if (lines.length <= maxLines) return lines;
    const chars = [...t];
    let lo = 0, hi = chars.length - 1, best = ["…"];
    while (lo <= hi) {
      const k = (lo + hi) >> 1;
      const L = wrap(midTrunc(chars, k), pt, bold, maxW);
      if (L.length <= maxLines) { best = L; lo = k + 1; } else hi = k - 1;
    }
    return best;
  }

  /* ---------------------------------------------------------------- Label stock */
  const LETTER = [215.9, 279.4], A4 = [210, 297];
  const STOCKS = [
    { id: "letter-30", kind: "sheet", page: LETTER, cols: 3, rows: 10, w: 66.675, h: 25.4, left: 4.7625, top: 12.7, hp: 69.85, vp: 25.4, name: "US Letter · 30 per sheet · 2-5/8 × 1 in (Avery 5160/8160 size)", short: "Letter 30-up (2-5/8 × 1 in)", dpi: 600 },
    { id: "a4-21", kind: "sheet", page: A4, cols: 3, rows: 7, w: 63.5, h: 38.1, left: 7.21, top: 15.15, hp: 66.04, vp: 38.1, name: "A4 · 21 per sheet · 63.5 × 38.1 mm (L7160 size)", short: "A4 21-up (63.5 × 38.1 mm)", dpi: 600 },
    { id: "a4-24", kind: "sheet", page: A4, cols: 3, rows: 8, w: 63.5, h: 33.9, left: 7.21, top: 12.9, hp: 66.04, vp: 33.9, name: "A4 · 24 per sheet · 63.5 × 33.9 mm (L7159 size)", short: "A4 24-up (63.5 × 33.9 mm)", dpi: 600 },
    { id: "a4-24b", kind: "sheet", page: A4, cols: 3, rows: 8, w: 70, h: 37, left: 0, top: 0.5, hp: 70, vp: 37, name: "A4 · 24 per sheet · 70 × 37 mm (no margins)", short: "A4 24-up (70 × 37 mm)", dpi: 600 },
    { id: "a4-27", kind: "sheet", page: A4, cols: 3, rows: 9, w: 63.5, h: 29.6, left: 7.21, top: 15.3, hp: 66.04, vp: 29.6, name: "A4 · 27 per sheet · 63.5 × 29.6 mm", short: "A4 27-up (63.5 × 29.6 mm)", dpi: 600 },
    { id: "a4-40", kind: "sheet", page: A4, cols: 4, rows: 10, w: 52.5, h: 29.7, left: 0, top: 0, hp: 52.5, vp: 29.7, name: "A4 · 40 per sheet · 52.5 × 29.7 mm (no margins)", short: "A4 40-up (52.5 × 29.7 mm)", dpi: 600 },
    { id: "a4-44", kind: "sheet", page: A4, cols: 4, rows: 11, w: 48.5, h: 25.4, left: 8, top: 8.8, hp: 48.5, vp: 25.4, name: "A4 · 44 per sheet · 48.5 × 25.4 mm", short: "A4 44-up (48.5 × 25.4 mm)", dpi: 600 },
    { id: "letter-10", kind: "sheet", page: LETTER, cols: 2, rows: 5, w: 101.6, h: 50.8, left: 3.96875, top: 12.7, hp: 106.3625, vp: 50.8, name: "US Letter · 10 per sheet · 4 × 2 in (Avery 5163/8163 size)", short: "Letter 10-up (4 × 2 in)", dpi: 600, big: true },
    { id: "a4-14", kind: "sheet", page: A4, cols: 2, rows: 7, w: 99.1, h: 38.1, left: 4.65, top: 15.15, hp: 101.6, vp: 38.1, name: "A4 · 14 per sheet · 99.1 × 38.1 mm (L7163 size)", short: "A4 14-up (99.1 × 38.1 mm)", dpi: 600, big: true },
    { id: "a4-8", kind: "sheet", page: A4, cols: 2, rows: 4, w: 99.1, h: 67.7, left: 4.65, top: 13.1, hp: 101.6, vp: 67.7, name: "A4 · 8 per sheet · 99.1 × 67.7 mm (L7165 size)", short: "A4 8-up (99.1 × 67.7 mm)", dpi: 600, big: true },
    { id: "letter-1", kind: "sheet", page: LETTER, cols: 1, rows: 1, w: 215.9, h: 279.4, left: 0, top: 0, hp: 215.9, vp: 279.4, name: "US Letter · full sheet (cut to size)", short: "Letter full sheet", dpi: 600, big: true, full: true },
    { id: "a4-1", kind: "sheet", page: A4, cols: 1, rows: 1, w: 210, h: 297, left: 0, top: 0, hp: 210, vp: 297, name: "A4 · full sheet (cut to size)", short: "A4 full sheet", dpi: 600, big: true, full: true },
    { id: "r-2x1", kind: "roll", w: 50.8, h: 25.4, name: "2 × 1 in thermal roll (Rollo, Zebra, Munbyn and similar)", short: "2 × 1 in roll", dpi: 203 },
    { id: "r-2.25x1.25", kind: "roll", w: 57.15, h: 31.75, name: "2.25 × 1.25 in thermal roll (DYMO 30334 size)", short: "2.25 × 1.25 in roll (DYMO 30334)", dpi: 300 },
    { id: "r-3x1", kind: "roll", w: 76.2, h: 25.4, name: "3 × 1 in thermal roll", short: "3 × 1 in roll", dpi: 203 },
    { id: "r-50x25", kind: "roll", w: 50, h: 25, name: "50 × 25 mm thermal roll", short: "50 × 25 mm roll", dpi: 203 },
    { id: "r-62x29", kind: "roll", w: 62, h: 29, name: "62 × 29 mm labels (Brother DK-1209 size)", short: "62 × 29 mm (Brother DK-1209)", dpi: 300 },
    { id: "r-2x2", kind: "roll", w: 50.8, h: 50.8, name: "2 × 2 in thermal roll", short: "2 × 2 in roll", dpi: 203, big: true },
    { id: "r-3x2", kind: "roll", w: 76.2, h: 50.8, name: "3 × 2 in thermal roll", short: "3 × 2 in roll", dpi: 203, big: true },
    { id: "r-4x2", kind: "roll", w: 101.6, h: 50.8, name: "4 × 2 in thermal roll", short: "4 × 2 in roll", dpi: 203, big: true },
    { id: "r-4x3", kind: "roll", w: 101.6, h: 76.2, name: "4 × 3 in thermal roll", short: "4 × 3 in roll", dpi: 203, big: true },
    { id: "r-4x6", kind: "roll", w: 101.6, h: 152.4, name: "4 × 6 in thermal roll", short: "4 × 6 in roll", dpi: 203, big: true },
  ];
  const STOCK = Object.fromEntries(STOCKS.map(s => [s.id, s]));
  // Builds a stock from the custom-size inputs (all values in mm).
  function customStock(c) {
    const num = (v, d) => (Number.isFinite(+v) && +v > 0 ? +v : d);
    if (c.kind === "roll") {
      const w = clamp(num(c.w, 50.8), 10, 220), h = clamp(num(c.h, 25.4), 10, 300);
      return { id: "custom-roll", kind: "roll", w, h, name: `Custom roll ${r2(w)} × ${r2(h)} mm`, short: `${r2(w)} × ${r2(h)} mm roll`, dpi: 203, big: true };
    }
    const page = c.page === "a4" ? A4 : LETTER;
    const cols = clamp(Math.round(num(c.cols, 3)), 1, 10), rows = clamp(Math.round(num(c.rows, 10)), 1, 30);
    const w = clamp(num(c.w, 63.5), 5, page[0]), h = clamp(num(c.h, 25.4), 5, page[1]);
    const left = clamp(+c.left || 0, 0, page[0]), top = clamp(+c.top || 0, 0, page[1]);
    const hp = w + clamp(+c.hgap || 0, 0, 50), vp = h + clamp(+c.vgap || 0, 0, 50);
    return { id: "custom-sheet", kind: "sheet", page, cols, rows, w, h, left, top, hp, vp, name: `Custom sheet ${cols * rows}-up · ${r2(w)} × ${r2(h)} mm`, short: `Custom ${cols * rows}-up`, dpi: 600, big: true };
  }
  function sheetCells(st) {
    const out = [];
    for (let r = 0; r < st.rows; r++) for (let c = 0; c < st.cols; c++) out.push({ x: st.left + c * st.hp, y: st.top + r * st.vp, w: st.w, h: st.h });
    return out;
  }
  // Problems with a custom sheet layout (cells off the page).
  function stockIssues(st) {
    if (st.kind !== "sheet") return [];
    const right = st.left + (st.cols - 1) * st.hp + st.w, bottom = st.top + (st.rows - 1) * st.vp + st.h;
    const out = [];
    if (right > st.page[0] + 0.01) out.push(`Labels run ${r2(right - st.page[0])} mm past the right edge of the page.`);
    if (bottom > st.page[1] + 0.01) out.push(`Labels run ${r2(bottom - st.page[1])} mm past the bottom of the page.`);
    return out;
  }

  /* ---------------------------------------------------------------- FNSKU / SKU unit label */
  const CONDITIONS = ["New", "Used - Like New", "Used - Very Good", "Used - Good", "Used - Acceptable", "Collectible - Like New", "Collectible - Very Good", "Collectible - Good", "Collectible - Acceptable", "Renewed"];
  function checkCode(code) {
    const c = String(code || "").trim();
    if (!c) return { level: "empty", msg: "Enter an FNSKU or SKU." };
    if (/[^\x20-\x7e]/.test(c)) return { level: "error", msg: "Only plain letters, digits and basic symbols can go in the barcode." };
    if (/^X0[0-9A-Z]{8}$/.test(c)) return { level: "ok", msg: "FNSKU format looks right." };
    if (/^B0[0-9A-Z]{8}$/.test(c)) return { level: "ok", msg: "ASIN-style code (B0…). Some listings use the ASIN as the FNSKU." };
    if (/^\d{9}[\dX]$/.test(c)) return { level: "ok", msg: "ISBN-10 style code (used as the FNSKU for some books)." };
    if (/^[xb]0[0-9a-z]{8}$/i.test(c)) return { level: "warn", msg: "FNSKUs are upper case. Check the letters." };
    if (c.length > 24) return { level: "warn", msg: "Long code: it may not fit small labels." };
    return { level: "warn", msg: "Not the FNSKU pattern (10 characters starting X0 or B0). Fine for your own SKU or bin labels." };
  }
  // Normalises what people paste: trims, removes inner spaces and upper-cases FNSKU-looking codes.
  function normCode(code) {
    let c = String(code ?? "").trim();
    if (/^[xb]0[0-9a-z]{8}$/i.test(c.replace(/\s+/g, ""))) c = c.replace(/\s+/g, "").toUpperCase();
    return c;
  }
  // Module width: as wide as the label allows (up to 20 mil), snapped to whole printer dots,
  // keeping a quiet zone of 1/4 in each side when it fits and never less than 2.5 mm.
  function barcodeFit(nModules, labelW, dpi) {
    const dot = 25.4 / (dpi || 600);
    const minDots = Math.ceil(0.19 / dot - 1e-9);
    const maxM = Math.floor(0.508 / dot + 1e-9) * dot;
    let m = 0, qz = 0;
    for (const q of [6.35, 5.5, 4.5, 3.5, 2.5]) {
      qz = q;
      m = Math.floor((labelW - 2 * q) / nModules / dot + 1e-9) * dot;
      if (m >= 0.25) break;
    }
    m = Math.min(m, maxM);
    const ok = m >= minDots * dot && m >= 0.19;
    return { m, bw: m * nModules, qz: (labelW - m * nModules) / 2, ok, tight: m < 0.25, dot };
  }
  function unitLabel(item, o) {
    const code = normCode(item.code);
    let enc = null, err = "";
    try { enc = code128(code); } catch (e) { err = e.message; }
    const runs = enc ? darkRuns(enc.modules) : [];
    const title = clean(item.title).text, cond = clean(item.condition).text;
    const lost = clean(item.title).lost;
    return function draw(cell) {
      const { x, y, w, h } = cell;
      const pad = o.kind === "sheet" ? clamp(Math.min(w, h) * 0.07, 1.6, 3) : clamp(h * 0.06, 1.2, 2.2);
      const ih = h - 2 * pad, iw = w - 2 * pad;
      let fn = clamp(ih * 0.34, 6, 11), ts = clamp(fn * 0.85, 5.5, 9);
      let maxTl = !o.showTitle || !title ? 0 : o.titleLines === "1" || o.titleLines === 1 ? 1 : o.titleLines === "2" || o.titleLines === 2 ? 2 : ih >= 27 ? 2 : 1;
      const showCond = o.showCondition !== false && !!cond;
      while (textW(code, fn, false) > iw && fn > 5) fn -= 0.25;
      let lines = [], textH = 0, barH = 0;
      const gap = clamp(ih * 0.04, 0.6, 1.2);
      for (let it = 0; it < 30; it++) {
        lines = fitText(title, ts, false, iw, maxTl);
        textH = (fn + (lines.length + (showCond ? 1 : 0)) * ts) * LH * PT;
        barH = ih - textH - gap;
        if (barH >= 7.5) break;
        if (maxTl > 1) { maxTl--; continue; }
        if (fn <= 5 && ts <= 4.5) break;
        fn = Math.max(5, fn - 0.4); ts = Math.max(4.5, ts - 0.4);
      }
      barH = Math.min(barH, 18, ih * 0.64);
      const blockH = barH + gap + textH;
      let cy = y + pad + Math.max(0, (ih - blockH) / 2);
      const items = [];
      const fit = enc ? barcodeFit(enc.modules.length, w, o.dpi) : null;
      if (enc) items.push({ t: "bars", x: x + (w - fit.bw) / 2, y: cy, h: barH, m: fit.m, runs });
      cy += barH + gap;
      const cx = x + w / 2;
      const line = (str, s) => { items.push({ t: "text", x: cx, y: cy + s * PT * 0.9, s, str, b: false, a: "c" }); cy += s * LH * PT; };
      line(clean(code).text, fn);
      lines.forEach(l => line(l, ts));
      if (showCond) line(fitText(cond, ts, false, iw, 1)[0] || "", ts);
      return { items, info: { err, fit, barH, fn, ts, lost } };
    };
  }

  /* ---------------------------------------------------------------- Text labels (prep, set, expiry) */
  // paras: [{ runs: [{ t, b }], rel }]. Finds the largest font size (pt) at which every
  // paragraph fits in w × h mm without breaking words.
  function wrapRuns(runs, pt, maxW) {
    const words = [];
    runs.forEach(r => String(r.t).split(" ").forEach((t, i) => { if (t) words.push({ t, b: !!r.b }); }));
    const lines = [];
    let cur = [], curW = 0;
    for (const wd of words) {
      const ww = textW(wd.t, pt, wd.b);
      if (ww > maxW + 1e-6) return null;
      const sp = cur.length ? textW(" ", pt, cur[cur.length - 1].b) : 0;
      if (cur.length && curW + sp + ww > maxW + 1e-6) { lines.push({ words: cur, w: curW }); cur = []; curW = 0; }
      curW += (cur.length ? textW(" ", pt, cur[cur.length - 1].b) : 0) + ww;
      cur.push(wd);
    }
    if (cur.length) lines.push({ words: cur, w: curW });
    return lines;
  }
  function layoutParas(paras, s, w, gapRel) {
    let H = 0;
    const out = [];
    for (let i = 0; i < paras.length; i++) {
      const p = paras[i], ps = s * (p.rel || 1);
      const lines = wrapRuns(p.runs, ps, w);
      if (!lines) return null;
      if (i) H += ps * gapRel * PT;
      H += lines.length * ps * LH * PT;
      out.push({ ps, lines });
    }
    return { H, out };
  }
  function fitParas(paras, w, h, o = {}) {
    const maxPt = o.maxPt || 72, gapRel = o.gapRel ?? 0.45;
    let lo = 2, hi = maxPt, best = null;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      const L = layoutParas(paras, mid, w, gapRel);
      if (L && L.H <= h) { best = { s: mid, L }; lo = mid; } else hi = mid;
      if (hi - lo < 0.05) break;
    }
    if (!best) { const L = layoutParas(paras, 2, w, gapRel); best = { s: 2, L: L || { H: 0, out: [] }, broken: true }; }
    // settle on the largest size in 0.1 pt steps that fits, so results don't depend on maxPt
    let s = Math.floor(best.s * 10 + 1e-6) / 10;
    while (!best.broken && s + 0.1 <= maxPt + 1e-9) {
      const L = layoutParas(paras, Math.round((s + 0.1) * 10) / 10, w, gapRel);
      if (!L || L.H > h) break;
      s = Math.round((s + 0.1) * 10) / 10;
    }
    best.s = s;
    best.L = layoutParas(paras, best.s, w, gapRel) || best.L;
    best.gapRel = gapRel;
    return best;
  }
  function emitParas(fit, box, align) {
    const items = [];
    let cy = box.y + Math.max(0, (box.h - fit.L.H) / 2);
    fit.L.out.forEach((p, i) => {
      if (i) cy += p.ps * (fit.gapRel ?? 0.45) * PT;
      p.lines.forEach(line => {
        const base = cy + p.ps * PT * 0.9;
        let x = align === "l" ? box.x : align === "r" ? box.x + box.w - line.w : box.x + (box.w - line.w) / 2;
        // merge consecutive words with the same weight into one text run
        let run = null;
        line.words.forEach((wd, k) => {
          if (run && run.b === wd.b) run.str += " " + wd.t;
          else {
            if (run) { items.push(run); x += textW(run.str, p.ps, run.b) + textW(" ", p.ps, run.b); }
            run = { t: "text", x, y: base, s: p.ps, str: wd.t, b: wd.b, a: "l" };
          }
        });
        if (run) items.push(run);
        cy += p.ps * LH * PT;
      });
    });
    return items;
  }
  function textLabel(paras, o = {}) {
    const fits = new Map();
    const get = (w, h) => {
      const k = w.toFixed(2) + "x" + h.toFixed(2);
      if (!fits.has(k)) fits.set(k, fitParas(paras, w, h, o));
      return fits.get(k);
    };
    const draw = cell => {
      const pad = clamp(Math.min(cell.w, cell.h) * (o.padRel ?? 0.08), 1.5, o.full ? 12 : 5);
      const box = { x: cell.x + pad, y: cell.y + pad, w: cell.w - 2 * pad, h: cell.h - 2 * pad };
      const f = get(box.w, box.h);
      const items = emitParas(f, box, o.align || "c");
      if (o.border) items.unshift({ t: "stroke", x: cell.x + pad * 0.45, y: cell.y + pad * 0.45, w: cell.w - pad * 0.9, h: cell.h - pad * 0.9, lw: o.border, color: "#000000" });
      return { items, info: { size: f.s, broken: !!f.broken } };
    };
    draw.sizeFor = cell => {
      const pad = clamp(Math.min(cell.w, cell.h) * (o.padRel ?? 0.08), 1.5, o.full ? 12 : 5);
      return get(cell.w - 2 * pad, cell.h - 2 * pad).s;
    };
    return draw;
  }

  /* ---------------------------------------------------------------- Suffocation warnings */
  // Font sizes for the warning by bag length + width (inches), as quoted from Amazon's poly bag
  // guidance: 60 in or more 24 pt; 40-59 in 18 pt; 30-39 in 14 pt; under 29 in 10 pt.
  // The quoted table skips 29-30 in, so PrepLabel rounds up to 14 pt from 29 in.
  function suffocationMinPt(lengthIn, widthIn) {
    const s = (+lengthIn || 0) + (+widthIn || 0);
    if (s >= 60) return 24;
    if (s >= 40) return 18;
    if (s >= 29) return 14;
    return 10;
  }
  const NB = "\u00a0";
  const SUFFOCATION = {
    en: { name: "English", head: "WARNING:", body: "To avoid danger of suffocation, keep this plastic bag away from babies and children. Do not use this bag in cribs, beds, carriages or play pens. This bag is not a toy." },
    fr: { name: "Français", head: "AVERTISSEMENT" + NB + ":", body: "Pour éviter tout risque d'étouffement, tenir ce sac en plastique hors de portée des bébés et des enfants. Ne pas utiliser ce sac dans les berceaux, les lits, les poussettes ou les parcs pour enfants. Ce sac n'est pas un jouet." },
    de: { name: "Deutsch", head: "WARNUNG:", body: "Um Erstickungsgefahr zu vermeiden, diesen Plastikbeutel von Babys und Kindern fernhalten. Diesen Beutel nicht in Kinderbetten, Betten, Kinderwagen oder Laufställen verwenden. Dieser Beutel ist kein Spielzeug." },
    es: { name: "Español", head: "ADVERTENCIA:", body: "Para evitar el peligro de asfixia, mantenga esta bolsa de plástico fuera del alcance de bebés y niños. No use esta bolsa en cunas, camas, cochecitos ni corrales. Esta bolsa no es un juguete." },
    it: { name: "Italiano", head: "AVVERTENZA:", body: "Per evitare il pericolo di soffocamento, tenere questo sacchetto di plastica lontano da neonati e bambini. Non usare questo sacchetto in culle, letti, carrozzine o box. Questo sacchetto non è un giocattolo." },
    nl: { name: "Nederlands", head: "WAARSCHUWING:", body: "Om verstikkingsgevaar te voorkomen, deze plastic zak uit de buurt van baby's en kinderen houden. Gebruik deze zak niet in wiegen, bedden, kinderwagens of boxen. Deze zak is geen speelgoed." },
  };
  function suffocationParas(langs, custom) {
    if (custom && custom.trim()) {
      return custom.split(/\n+/).map(t => clean(t).text).filter(Boolean).map((t, i) => {
        const m = t.match(/^([^:]{2,24}:)\s*(.*)$/);
        return m ? { runs: [{ t: m[1], b: true }, { t: m[2], b: false }] } : { runs: [{ t, b: i === 0 && t.length < 30 }] };
      });
    }
    const ls = (langs && langs.length ? langs : ["en"]).filter(l => SUFFOCATION[l]);
    return ls.map(l => ({ runs: [{ t: SUFFOCATION[l].head, b: true }, { t: SUFFOCATION[l].body, b: false }] }));
  }

  /* ---------------------------------------------------------------- Set, expiry and custom labels */
  const SET_TEXTS = {
    "sold-as-set": ["SOLD AS SET", "DO NOT SEPARATE"],
    "this-is-a-set": ["THIS IS A SET", "DO NOT SEPARATE"],
    "sold-as-set-only": ["SOLD AS SET"],
    "ready-to-ship": ["READY TO SHIP"],
    "do-not-separate": ["DO NOT SEPARATE"],
  };
  function setParas(kind, count, custom) {
    let lines = kind === "custom" ? String(custom || "").split(/\n+/).map(t => clean(t).text).filter(Boolean) : SET_TEXTS[kind] || SET_TEXTS["sold-as-set"];
    if (!lines.length) lines = ["SOLD AS SET"];
    const paras = lines.map((t, i) => ({ runs: [{ t, b: true }], rel: i === 0 ? 1 : 0.62 }));
    const n = parseInt(count, 10);
    if (n > 1) paras.push({ runs: [{ t: `Set of ${n} items`, b: false }], rel: 0.5 });
    return paras;
  }
  const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  // date: "YYYY-MM-DD" from <input type=date>
  function formatDate(date, fmt) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
    if (!m) return "";
    const [, Y, M, D] = m;
    switch (fmt) {
      case "MM-YYYY": return `${M}-${Y}`;
      case "DD-MM-YYYY": return `${D}-${M}-${Y}`;
      case "YYYY-MM-DD": return `${Y}-${M}-${D}`;
      case "DD-MMM-YYYY": return `${D}-${MON[+M - 1]}-${Y}`;
      case "MM/DD/YYYY": return `${M}/${D}/${Y}`;
      case "DD/MM/YYYY": return `${D}/${M}/${Y}`;
      default: return `${M}-${D}-${Y}`;
    }
  }
  function dateParas(o) {
    const paras = [];
    const d = formatDate(o.date, o.format);
    if (d) paras.push({ runs: [...(o.prefix ? [{ t: clean(o.prefix).text, b: true }] : []), { t: d, b: true }], rel: 1 });
    const lot = clean(o.lot).text;
    const lotPrefix = clean(o.lotPrefix ?? "LOT").text;
    if (lot) paras.push({ runs: [...(lotPrefix ? [{ t: lotPrefix, b: true }] : []), { t: lot, b: false }], rel: d ? 0.55 : 1 });
    if (!paras.length) paras.push({ runs: [{ t: "EXP MM-DD-YYYY", b: true }], rel: 1 });
    return paras;
  }

  /* ---------------------------------------------------------------- Bin / location labels */
  // qr: an object with getModuleCount() and isDark(r, c) (qrcode-generator), or null for Code 128.
  function binLabel(code, desc, o, qr) {
    const c = clean(code).text, d = clean(desc).text;
    let enc = null, err = "";
    if (!qr) { try { enc = code128(c); } catch (e) { err = e.message; } }
    const runs = enc ? darkRuns(enc.modules) : [];
    return function draw(cell) {
      const { x, y, w, h } = cell;
      const pad = clamp(Math.min(w, h) * 0.08, 2, 5);
      const items = [];
      let fitInfo = null;
      if (qr) {
        const n = qr.getModuleCount();
        const side = Math.min(h - 2 * pad, w * 0.48);
        const mod = side / (n + 2); // 1-module margin inside the area (plus label padding)
        const qx = x + pad, qy = y + (h - mod * n) / 2;
        const rects = [];
        for (let r = 0; r < n; r++) {
          for (let k = 0; k < n;) {
            if (qr.isDark(r, k)) { let j = k; while (j < n && qr.isDark(r, j)) j++; rects.push([qx + k * mod, qy + r * mod, (j - k) * mod, mod]); k = j; } else k++;
          }
        }
        items.push({ t: "rects", list: rects });
        const tx = qx + mod * n + pad * 1.2, tw = x + w - pad - tx;
        const paras = [{ runs: [{ t: c, b: true }], rel: 1 }];
        if (d) paras.push({ runs: [{ t: d, b: false }], rel: 0.42 });
        const f = fitParas(paras, tw, h - 2 * pad, { maxPt: 60, gapRel: 0.3 });
        items.push(...emitParas(f, { x: tx, y: y + pad, w: tw, h: h - 2 * pad }, "l"));
        fitInfo = { size: f.s, qrModule: mod };
      } else {
        const fit = enc ? barcodeFit(enc.modules.length, w, o.dpi) : null;
        const paras = [{ runs: [{ t: c, b: true }], rel: 1 }];
        if (d) paras.push({ runs: [{ t: d, b: false }], rel: 0.45 });
        const textBox = { x: x + pad, w: w - 2 * pad, h: (h - 2 * pad) * 0.42 };
        const f = fitParas(paras, textBox.w, textBox.h, { maxPt: 48, gapRel: 0.2 });
        const barH = Math.min(h - 2 * pad - f.L.H - 1, 25);
        const top = y + (h - (barH + 1 + f.L.H)) / 2;
        if (enc) items.push({ t: "bars", x: x + (w - fit.bw) / 2, y: top, h: barH, m: fit.m, runs });
        items.push(...emitParas(f, { x: textBox.x, y: top + barH + 1, w: textBox.w, h: f.L.H }, "c"));
        fitInfo = { size: f.s, fit };
      }
      return { items, info: { err, ...fitInfo } };
    };
  }
  // Expands "A-01" to "A-12" style ranges into a list of codes.
  function rangeCodes(prefix, from, to, digits, suffix) {
    const a = parseInt(from, 10), b = parseInt(to, 10), d = clamp(parseInt(digits, 10) || 0, 0, 6);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
    const out = [];
    const step = a <= b ? 1 : -1;
    for (let i = a; step > 0 ? i <= b : i >= b; i += step) { out.push(`${prefix || ""}${String(i).padStart(d, "0")}${suffix || ""}`); if (out.length >= 2000) break; }
    return out;
  }

  /* ---------------------------------------------------------------- Alignment test */
  function testDraw(stock, idx) {
    return function draw(cell) {
      const { x, y, w, h } = cell, items = [];
      const inset = stock.kind === "roll" ? 1 : 0;
      items.push({ t: "stroke", x: x + inset, y: y + inset, w: w - 2 * inset, h: h - 2 * inset, lw: 0.2, color: "#000000" });
      const cx = x + w / 2, cy = y + h / 2, arm = Math.min(5, w / 6, h / 6);
      items.push({ t: "line", x1: cx - arm, y1: cy, x2: cx + arm, y2: cy, lw: 0.2, color: "#000000" });
      items.push({ t: "line", x1: cx, y1: cy - arm, x2: cx, y2: cy + arm, lw: 0.2, color: "#000000" });
      const s = clamp(h * 0.16, 4.5, 9);
      if (stock.kind === "roll") {
        const sz = `${r2(w / 25.4)} × ${r2(h / 25.4)} in · ${r2(w)} × ${r2(h)} mm`;
        items.push({ t: "text", x: cx, y: y + 2 + s * PT, s, str: sz, b: true, a: "c" });
        const bar = Math.min(25.4, w - 6);
        const by = cy + arm + 2.2;
        items.push({ t: "rect", x: cx - bar / 2, y: by, w: bar, h: 0.6, color: "#000000" });
        items.push({ t: "rect", x: cx - bar / 2, y: by - 1.2, w: 0.3, h: 1.8, color: "#000000" });
        items.push({ t: "rect", x: cx + bar / 2 - 0.3, y: by - 1.2, w: 0.3, h: 1.8, color: "#000000" });
        items.push({ t: "text", x: cx, y: by + 0.6 + s * 0.8 * PT + 0.3, s: s * 0.8, str: bar === 25.4 ? "this bar = 1 in / 25.4 mm" : `this bar = ${r2(bar)} mm`, b: false, a: "c" });
        items.push({ t: "text", x: cx, y: y + h - 1.6, s: Math.min(5, s * 0.7), str: "Made with PrepLabel · fnsku.roohsites.com", b: false, a: "c", color: "#555555" });
        items.push({ t: "link", x: x + 2, y: y + h - 1.6 - 2.2, w: w - 4, h: 2.6, url: CREDIT_URL });
      } else {
        items.push({ t: "text", x: x + 1.5, y: y + 1.5 + 6 * PT, s: 6, str: String(idx + 1), b: true, a: "l" });
      }
      return { items, info: {} };
    };
  }
  // A full page with rulers so the printed scale can be checked.
  function rulerPage(stock) {
    const page = stock.kind === "sheet" ? stock.page : LETTER;
    const items = [];
    const W = page[0];
    const x0 = (W - 150) / 2;
    let y = 30;
    const hd = (str, s = 14) => { items.push({ t: "text", x: W / 2, y, s, str, b: true, a: "c" }); };
    hd("PrepLabel alignment test");
    y += 10;
    [
      "1. Print this file at 100% / Actual size (turn off Fit to page, Shrink, or Scale to fit).",
      "2. Measure both rulers below. The 150 mm and 5 in rulers must measure exactly that.",
      "3. Page 1 shows every label outline. Hold it against a blank label sheet up to a window.",
      "4. If the grid sits off, set the X / Y nudge in PrepLabel and test again.",
    ].forEach(t => { items.push({ t: "text", x: x0, y, s: 10, str: t, b: false, a: "l" }); y += 6; });
    y += 12;
    const ruler = (len, step, major, label, unit) => {
      items.push({ t: "rect", x: x0, y, w: len, h: 0.35, color: "#000000" });
      for (let i = 0, k = 0; i <= len + 1e-6; i += step, k++) {
        const isMajor = k % major === 0;
        items.push({ t: "rect", x: x0 + i - 0.12, y: y - (isMajor ? 5 : 2.5), w: 0.24, h: isMajor ? 5 : 2.5, color: "#000000" });
        if (isMajor) items.push({ t: "text", x: x0 + i, y: y + 4.5, s: 7, str: String(Math.round(k / major * (unit === "in" ? 1 : 10))), b: false, a: "c" });
      }
      items.push({ t: "text", x: x0, y: y - 8, s: 9, str: label, b: true, a: "l" });
      y += 26;
    };
    ruler(150, 1, 10, "150 mm (ticks every 1 mm, numbers in cm)", "mm");
    ruler(127, 25.4 / 8, 8, "5 in (ticks every 1/8 in)", "in");
    items.push({ t: "text", x: x0, y, s: 9, str: `Stock: ${stock.name}`, b: false, a: "l" });
    y += 12;
    items.push({ t: "text", x: W / 2, y, s: 8, str: "Made with PrepLabel · fnsku.roohsites.com", b: false, a: "c", color: "#555555" });
    const cw = textW("Made with PrepLabel · fnsku.roohsites.com", 8, false);
    items.push({ t: "link", x: W / 2 - cw / 2, y: y - 3, w: cw, h: 4, url: CREDIT_URL });
    return { w: page[0], h: page[1], rotate: 0, items };
  }

  /* ---------------------------------------------------------------- Memoised drawing */
  // Labels with the same content and size are laid out once and then moved into place.
  function shift(p, dx, dy) {
    if (p.t === "line") return { ...p, x1: p.x1 + dx, x2: p.x2 + dx, y1: p.y1 + dy, y2: p.y2 + dy };
    if (p.t === "rects") return { ...p, list: p.list.map(([x, y, w, h]) => [x + dx, y + dy, w, h]) };
    return { ...p, x: p.x + dx, y: p.y + dy };
  }
  function memo(draw) {
    let key = null, base = null;
    const m = cell => {
      const k = cell.w + "x" + cell.h;
      if (k !== key) { key = k; base = draw({ x: 0, y: 0, w: cell.w, h: cell.h }); }
      return { items: base.items.map(p => shift(p, cell.x, cell.y)), info: base.info };
    };
    if (draw.sizeFor) m.sizeFor = draw.sizeFor;
    return m;
  }

  /* ---------------------------------------------------------------- Pagination */
  // Places label draw functions onto pages. Sheets fill cells row by row starting at `start`
  // (1-based) and carry the credit line only in the outer page margin, outside every label.
  function paginate(stock, draws, o = {}) {
    const pages = [];
    const dx = +o.dx || 0, dy = +o.dy || 0;
    if (stock.kind === "roll") {
      for (const d of draws) {
        const r = d({ x: dx, y: dy, w: stock.w, h: stock.h });
        pages.push({ w: stock.w, h: stock.h, rotate: +o.rotate || 0, items: r.items, infos: [r.info] });
      }
      return pages;
    }
    const cells = sheetCells(stock), per = cells.length;
    let slot = clamp((parseInt(o.start, 10) || 1) - 1, 0, per - 1);
    let page = null;
    const open = () => {
      page = { w: stock.page[0], h: stock.page[1], rotate: 0, items: [], infos: [], cells: cells.map(c => ({ ...c, state: "empty" })) };
      pages.push(page);
    };
    for (const d of draws) {
      if (!page) { open(); for (let k = 0; k < slot; k++) page.cells[k].state = "skipped"; }
      else if (slot >= per) { open(); slot = 0; }
      const c = cells[slot];
      const r = d({ x: c.x + dx, y: c.y + dy, w: c.w, h: c.h });
      page.items.push(...r.items);
      page.infos.push(r.info);
      page.cells[slot].state = "used";
      slot++;
    }
    if (o.credit !== false) pages.forEach(p => addCredit(p, stock));
    return pages;
  }
  function creditSpot(stock) {
    if (stock.kind !== "sheet" || stock.full) return null;
    const bottom = stock.page[1] - (stock.top + (stock.rows - 1) * stock.vp + stock.h);
    if (bottom >= 6) return { y: stock.page[1] - bottom / 2 + 1 };
    if (stock.top >= 6) return { y: stock.top / 2 + 1 };
    return null;
  }
  function addCredit(page, stock) {
    const spot = creditSpot(stock);
    if (!spot) return;
    const str = "Made with PrepLabel · fnsku.roohsites.com", s = 6.5;
    const w = textW(str, s, false);
    page.items.push({ t: "text", x: page.w / 2, y: spot.y, s, str, b: false, a: "c", color: "#6b6b76", credit: true });
    page.items.push({ t: "link", x: page.w / 2 - w / 2, y: spot.y - s * PT, w, h: s * PT * 1.3, url: CREDIT_URL });
  }

  /* ---------------------------------------------------------------- Output: SVG preview */
  const escX = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const f3 = v => Math.round(v * 1000) / 1000;
  function toSvg(pg, o = {}) {
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f3(pg.w)} ${f3(pg.h)}" class="${o.cls || ""}" role="img" aria-label="${escX(o.label || "Label preview")}">`, `<rect width="${f3(pg.w)}" height="${f3(pg.h)}" fill="#fff"/>`];
    if (o.cells && pg.cells) {
      for (const c of pg.cells) {
        const fill = c.state === "skipped" ? "#ece9e2" : "none";
        parts.push(`<rect x="${f3(c.x)}" y="${f3(c.y)}" width="${f3(c.w)}" height="${f3(c.h)}" rx="1.2" fill="${fill}" stroke="#cfcac0" stroke-width="0.3" stroke-dasharray="1 0.8"/>`);
      }
    }
    let path = "";
    for (const p of pg.items) {
      if (p.t === "bars") for (const [s, n] of p.runs) path += `M${f3(p.x + s * p.m)} ${f3(p.y)}h${f3(n * p.m)}v${f3(p.h)}h${f3(-n * p.m)}z`;
      else if (p.t === "rects") for (const [x, y, w, h] of p.list) path += `M${f3(x)} ${f3(y)}h${f3(w)}v${f3(h)}h${f3(-w)}z`;
      else if (p.t === "rect") parts.push(`<rect x="${f3(p.x)}" y="${f3(p.y)}" width="${f3(p.w)}" height="${f3(p.h)}" fill="${p.color || "#000"}"/>`);
      else if (p.t === "stroke") parts.push(`<rect x="${f3(p.x)}" y="${f3(p.y)}" width="${f3(p.w)}" height="${f3(p.h)}" fill="none" stroke="${p.color || "#000"}" stroke-width="${f3(p.lw)}"/>`);
      else if (p.t === "line") parts.push(`<line x1="${f3(p.x1)}" y1="${f3(p.y1)}" x2="${f3(p.x2)}" y2="${f3(p.y2)}" stroke="${p.color || "#000"}" stroke-width="${f3(p.lw)}"/>`);
      else if (p.t === "text") parts.push(`<text x="${f3(p.x)}" y="${f3(p.y)}" font-size="${f3(p.s * PT)}" font-family="Helvetica,Arial,'Liberation Sans',sans-serif"${p.b ? ' font-weight="700"' : ""}${p.a === "c" ? ' text-anchor="middle"' : p.a === "r" ? ' text-anchor="end"' : ""} fill="${p.color || "#000"}" xml:space="preserve">${escX(p.str)}</text>`);
    }
    if (path) parts.push(`<path d="${path}" fill="#000" shape-rendering="crispEdges"/>`);
    parts.push("</svg>");
    return parts.join("");
  }

  /* ---------------------------------------------------------------- Output: PDF (pdf-lib) */
  const hexRgb = (P, hex) => { const h = (hex || "#000000").replace("#", ""); return P.rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255); };
  function rotOps(P, rot, W, H) {
    if (rot === 90) return P.concatTransformationMatrix(0, 1, -1, 0, H, 0);
    if (rot === 270) return P.concatTransformationMatrix(0, -1, 1, 0, 0, W);
    if (rot === 180) return P.concatTransformationMatrix(-1, 0, 0, -1, W, H);
    return null;
  }
  function addLink(P, doc, page, rect, url) {
    const annot = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: rect, Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: P.PDFString.of(url) } });
    const ref = doc.context.register(annot);
    page.node.addAnnot(ref);
  }
  async function toPdf(P, pages, meta = {}) {
    const doc = await P.PDFDocument.create();
    doc.setTitle(meta.title || "Labels");
    doc.setAuthor("PrepLabel");
    doc.setCreator("PrepLabel · fnsku.roohsites.com");
    doc.setProducer("PrepLabel (pdf-lib)");
    if (meta.subject) doc.setSubject(meta.subject);
    const F = { r: await doc.embedFont(P.StandardFonts.Helvetica), b: await doc.embedFont(P.StandardFonts.HelveticaBold) };
    for (const pg of pages) {
      const W = pg.w * MM, H = pg.h * MM, rot = pg.rotate || 0;
      const page = doc.addPage(rot % 180 ? [H, W] : [W, H]);
      const rop = rotOps(P, rot, W, H);
      if (rop) page.pushOperators(P.pushGraphicsState(), rop);
      for (const p of pg.items) {
        if (p.t === "bars" || p.t === "rects") {
          const ops = [P.pushGraphicsState(), P.setFillingGrayscaleColor(0)];
          if (p.t === "bars") for (const [s, n] of p.runs) ops.push(P.rectangle((p.x + s * p.m) * MM, H - (p.y + p.h) * MM, n * p.m * MM, p.h * MM));
          else for (const [x, y, w, h] of p.list) ops.push(P.rectangle(x * MM, H - (y + h) * MM, w * MM, h * MM));
          ops.push(P.fill(), P.popGraphicsState());
          page.pushOperators(...ops);
        } else if (p.t === "rect") {
          page.drawRectangle({ x: p.x * MM, y: H - (p.y + p.h) * MM, width: p.w * MM, height: p.h * MM, color: hexRgb(P, p.color) });
        } else if (p.t === "stroke") {
          page.drawRectangle({ x: p.x * MM, y: H - (p.y + p.h) * MM, width: p.w * MM, height: p.h * MM, borderColor: hexRgb(P, p.color), borderWidth: p.lw * MM });
        } else if (p.t === "line") {
          page.drawLine({ start: { x: p.x1 * MM, y: H - p.y1 * MM }, end: { x: p.x2 * MM, y: H - p.y2 * MM }, thickness: p.lw * MM, color: hexRgb(P, p.color) });
        } else if (p.t === "text") {
          if (!p.str) continue;
          const font = p.b ? F.b : F.r;
          const tw = font.widthOfTextAtSize(p.str, p.s);
          const x = p.a === "c" ? p.x * MM - tw / 2 : p.a === "r" ? p.x * MM - tw : p.x * MM;
          page.drawText(p.str, { x, y: H - p.y * MM, size: p.s, font, color: hexRgb(P, p.color) });
        } else if (p.t === "link" && !rot) {
          addLink(P, doc, page, [p.x * MM, H - (p.y + p.h) * MM, (p.x + p.w) * MM, H - p.y * MM], p.url);
        }
      }
      if (rop) page.pushOperators(P.popGraphicsState());
    }
    return doc.save();
  }

  /* ---------------------------------------------------------------- Output: ZPL (Zebra) */
  function zplField(s) {
    let out = "";
    for (const ch of String(s)) {
      const c = ch.codePointAt(0);
      if (ch === "^" || ch === "~" || ch === "\\" || c < 32 || c > 126) {
        const bytes = typeof TextEncoder !== "undefined" ? new TextEncoder().encode(ch) : Buffer.from(ch, "utf8");
        for (const b of bytes) out += "\\" + b.toString(16).toUpperCase().padStart(2, "0");
      } else out += ch;
    }
    return out;
  }
  // One ^XA…^XZ format per SKU with ^PQ for the quantity. Layout mirrors the PDF label.
  function toZpl(items, stock, o) {
    const dpi = o.dpi === 300 || o.dpi === "300" ? 300 : 203;
    const dpmm = dpi / 25.4;
    const PW = Math.round(stock.w * dpmm), LL = Math.round(stock.h * dpmm);
    const out = [];
    const warnings = [];
    for (const it of items) {
      const code = normCode(it.code);
      if (!code) continue;
      if (/[^\x20-\x7e]/.test(code) || code.includes(">")) { warnings.push(`${code}: has characters ZPL barcodes can't take; skipped.`); continue; }
      const qty = clamp(parseInt(it.qty, 10) || 0, 0, 99999);
      if (!qty) continue;
      // Zebra encodes ^BC data in subset B by default: 11 modules per character + start, check, stop.
      const nMod = 11 * (code.length + 2) + 13;
      const pad = Math.round(clamp(stock.h * 0.06, 1.2, 2.2) * dpmm);
      let mDots = Math.floor((PW - 2 * Math.round(5 * dpmm)) / nMod);
      if (mDots < 2) mDots = Math.floor((PW - 2 * Math.round(2.5 * dpmm)) / nMod);
      mDots = clamp(mDots, 1, dpi === 300 ? 6 : 4);
      if (mDots < 2) warnings.push(`${code}: too long for a ${r2(stock.w)} mm wide label; bars would be 1 dot wide.`);
      const draw = unitLabel({ code, title: it.title, condition: it.condition }, { kind: "roll", dpi, showTitle: o.showTitle, showCondition: o.showCondition, titleLines: o.titleLines });
      const r = draw({ x: 0, y: 0, w: stock.w, h: stock.h });
      const bars = r.items.find(p => p.t === "bars");
      const texts = r.items.filter(p => p.t === "text");
      const bw = nMod * mDots;
      const lines = ["^XA", "^CI28", `^PW${PW}`, `^LL${LL}`, "^LH0,0"];
      const by = Math.round((bars ? bars.y : stock.h * 0.08) * dpmm), bh = Math.round((bars ? bars.h : stock.h * 0.5) * dpmm);
      lines.push(`^FO${Math.max(0, Math.round((PW - bw) / 2))},${by}^BY${mDots}^BCN,${bh},N,N,N^FD${code}^FS`);
      for (const t of texts) {
        const hDots = Math.max(10, Math.round(t.s * PT * dpmm * 1.05));
        const top = Math.round((t.y - t.s * PT * 0.9) * dpmm);
        lines.push(`^FO${pad},${top}^FB${PW - 2 * pad},1,0,C^A0N,${hDots},${hDots}^FH\\^FD${zplField(t.str)}^FS`);
      }
      lines.push(`^PQ${qty}`, "^XZ");
      out.push(lines.join("\n"));
    }
    return { zpl: out.join("\n") + (out.length ? "\n" : ""), warnings };
  }

  /* ---------------------------------------------------------------- Import: CSV / TSV / XLSX */
  function parseDelimited(text) {
    text = String(text || "").replace(/^\uFEFF/, "");
    const firstLine = text.split(/\r?\n/).find(l => l.trim()) || "";
    const delim = ["\t", ",", ";", "|"].map(d => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = [];
    let row = [], f = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += ch;
      } else if (ch === '"' && f === "") q = true;
      else if (ch === delim) { row.push(f); f = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(f); f = "";
        rows.push(row); row = [];
      } else f += ch;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows.filter(r => r.some(c => String(c).trim() !== ""));
  }
  const HEADS = {
    code: ["fnsku", "fulfillment-network-sku", "fulfilment-network-sku", "x00", "amazon-barcode", "barcode", "label-barcode", "fba-barcode", "code", "merchant-sku", "seller-sku", "sku", "asin", "location", "bin"],
    title: ["title", "product-title", "product-name", "item-name", "item-title", "name", "product", "description", "item-description"],
    condition: ["condition", "condition-type", "item-condition", "product-condition"],
    qty: ["qty", "quantity", "units", "labels", "copies", "count", "label-qty", "label-quantity", "labels-to-print", "number-of-labels", "units-to-label", "quantity-to-label", "units-to-send", "quantity-to-send", "quantity-shipped", "shipped"],
  };
  const normHead = h => String(h || "").trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "");
  function mapRows(rows) {
    const report = { items: [], skipped: [], mapping: {}, header: false };
    if (!rows.length) return report;
    const head = rows[0].map(normHead);
    const idx = {};
    for (const k of Object.keys(HEADS)) {
      for (const name of HEADS[k]) { const i = head.indexOf(name); if (i >= 0 && !Object.values(idx).includes(i)) { idx[k] = i; break; } }
    }
    let body = rows;
    if (idx.code !== undefined) { report.header = true; body = rows.slice(1); }
    else {
      // No recognised header: first column is the code; a mostly-numeric later column is the quantity.
      idx.code = 0;
      const cols = Math.max(...rows.map(r => r.length));
      const isNum = v => /^\s*\d+(\.0+)?\s*$/.test(String(v));
      for (let c = cols - 1; c >= 1; c--) {
        const vals = rows.map(r => r[c]).filter(v => v !== undefined && String(v).trim() !== "");
        if (vals.length && vals.filter(isNum).length / vals.length >= 0.8) { idx.qty = c; break; }
      }
      const condSet = new Set(CONDITIONS.map(c => c.toLowerCase()).concat(["used", "collectible", "refurbished"]));
      for (let c = 1; c < cols; c++) {
        if (c === idx.qty) continue;
        const vals = rows.map(r => String(r[c] || "").trim().toLowerCase()).filter(Boolean);
        if (idx.condition === undefined && vals.length && vals.every(v => condSet.has(v))) { idx.condition = c; continue; }
        if (idx.title === undefined) idx.title = c;
      }
      if (/^(fnsku|sku|code|barcode)$/i.test(String(rows[0][0]).trim())) { body = rows.slice(1); report.header = true; }
    }
    report.mapping = Object.fromEntries(Object.entries(idx).map(([k, i]) => [k, report.header ? rows[0][i] : `column ${i + 1}`]));
    body.forEach((r, n) => {
      const line = n + 1 + (report.header ? 1 : 0);
      const code = normCode(r[idx.code]);
      if (!code) { report.skipped.push({ line, reason: "no code" }); return; }
      let qty = 1;
      if (idx.qty !== undefined) {
        const raw = String(r[idx.qty] ?? "").trim();
        qty = raw === "" ? 1 : Math.round(parseFloat(raw));
        if (!Number.isFinite(qty) || qty < 0) { report.skipped.push({ line, reason: `quantity “${raw}” is not a number` }); return; }
        if (qty === 0) { report.skipped.push({ line, reason: "quantity is 0" }); return; }
        qty = Math.min(qty, 9999);
      }
      report.items.push({ code, title: idx.title !== undefined ? String(r[idx.title] ?? "").trim() : "", condition: idx.condition !== undefined ? String(r[idx.condition] ?? "").trim() || "New" : "New", qty });
    });
    return report;
  }
  // Minimal .xlsx reader: unzips with DecompressionStream and reads the first worksheet.
  async function inflateRaw(data) {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function unzipIndex(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("Not a valid .xlsx file");
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {};
    const dec = new TextDecoder();
    for (let k = 0; k < count; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const off = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      const lnlen = dv.getUint16(off + 26, true), lxlen = dv.getUint16(off + 28, true);
      const start = off + 30 + lnlen + lxlen;
      files[name] = { method, data: u8.subarray(start, start + csize) };
      p += 46 + nlen + xlen + clen;
    }
    return files;
  }
  const xmlText = s => s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k === "lt") return "<"; if (k === "gt") return ">"; if (k === "amp") return "&"; if (k === "quot") return '"'; if (k === "apos") return "'";
    return String.fromCodePoint(k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  });
  async function readXlsx(buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const files = unzipIndex(u8);
    const read = async name => {
      const f = files[name] || files[Object.keys(files).find(k => k.toLowerCase() === name.toLowerCase())];
      if (!f) return null;
      const raw = f.method === 8 ? await inflateRaw(f.data) : f.data;
      return new TextDecoder().decode(raw);
    };
    const wb = await read("xl/workbook.xml");
    if (!wb) throw new Error("Not a valid .xlsx file");
    const rid = (/<(?:\w+:)?sheet\b[^>]*\br:id="([^"]+)"/.exec(wb) || [])[1];
    let target = "worksheets/sheet1.xml";
    const rels = await read("xl/_rels/workbook.xml.rels");
    if (rid && rels) {
      const m = new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*>`).exec(rels);
      const t = m && /Target="([^"]+)"/.exec(m[0]);
      if (t) target = t[1].replace(/^\/?xl\//, "").replace(/^\//, "");
    }
    const sheet = await read("xl/" + target);
    if (!sheet) throw new Error("Couldn't find the first worksheet");
    const ssXml = await read("xl/sharedStrings.xml");
    const shared = [];
    if (ssXml) for (const m of ssXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
      const body = m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
      shared.push(xmlText([...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join("")));
    }
    const colIdx = ref => { let n = 0; for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
    const rows = [];
    for (const rm of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = [];
      for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[1], inner = cm[2] || "";
        const ref = (/\br="([A-Z]+\d+)"/.exec(attrs) || [])[1];
        const t = (/\bt="(\w+)"/.exec(attrs) || [])[1];
        let v = "";
        if (t === "inlineStr") v = xmlText([...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(""));
        else {
          const vm = /<v>([\s\S]*?)<\/v>/.exec(inner);
          v = vm ? xmlText(vm[1]) : "";
          if (t === "s") v = shared[+v] ?? "";
        }
        const c = ref ? colIdx(ref) : row.length;
        while (row.length < c) row.push("");
        row[c] = v;
      }
      rows.push(row);
    }
    return rows.filter(r => r.some(c => String(c).trim() !== ""));
  }

  /* ---------------------------------------------------------------- Seller Central sheet detection */
  // lum: luminance per pixel (0-255), W×H, ppm: pixels per mm. Returns label boxes in pixels,
  // in reading order. Every FNSKU label has exactly one barcode, which anchors the grouping.
  function detectLabels(lum, W, H, ppm) {
    const INK = 165;
    const ink = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) ink[i] = lum[i] < INK ? 1 : 0;
    const colSum = new Uint32Array(W);
    for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) colSum[x] += ink[o + x]; }
    const bands = (sum, len, minGap, minSize, thr = 1) => {
      const runs = [];
      let s = -1;
      for (let i = 0; i <= len; i++) {
        const on = i < len && sum[i] >= thr;
        if (on && s < 0) s = i;
        if (!on && s >= 0) { runs.push([s, i - 1]); s = -1; }
      }
      const merged = [];
      for (const r of runs) {
        const last = merged[merged.length - 1];
        if (last && r[0] - last[1] - 1 < minGap) last[1] = r[1]; else merged.push([r[0], r[1]]);
      }
      return merged.filter(r => r[1] - r[0] + 1 >= minSize);
    };
    // Column bands: ignore faint columns (a page header crossing the gaps between label columns),
    // then widen each band back out to its first empty column so no label text is clipped.
    const nz = [];
    for (let x = 0; x < W; x++) if (colSum[x]) nz.push(colSum[x]);
    nz.sort((a, b) => a - b);
    const thr = Math.max(2, Math.round((nz[Math.floor(nz.length * 0.9)] || 0) * 0.05));
    const raw = bands(colSum, W, Math.round(2.5 * ppm), Math.round(4 * ppm), thr);
    const cols = raw.map(([a, b], i) => {
      const lo = i ? Math.ceil((raw[i - 1][1] + a) / 2) : 0, hi = i < raw.length - 1 ? Math.floor((b + raw[i + 1][0]) / 2) : W - 1;
      while (a > lo && colSum[a - 1] > 1) a--;
      while (b < hi && colSum[b + 1] > 1) b++;
      return [a, b];
    });
    const labels = [];
    for (const [cx0, cx1] of cols) {
      const rs = new Uint32Array(H);
      for (let y = 0; y < H; y++) { const o = y * W; let s = 0; for (let x = cx0; x <= cx1; x++) s += ink[o + x]; rs[y] = s; }
      const lines = bands(rs, H, Math.max(1, Math.round(0.35 * ppm)), 1, 1).map(([y0, y1]) => ({ y0, y1 }));
      const xExtent = (y0, y1) => {
        let a = cx1, b = cx0;
        for (let y = y0; y <= y1; y++) { const o = y * W; for (let x = cx0; x <= cx1; x++) if (ink[o + x]) { if (x < a) a = x; if (x > b) b = x; } }
        return [a, b];
      };
      const transitions = y => { const o = y * W; let t = 0; for (let x = cx0 + 1; x <= cx1; x++) if (ink[o + x] && !ink[o + x - 1]) t++; return t; };
      const similar = (ya, yb) => {
        const oa = ya * W, ob = yb * W; let same = 0, any = 0;
        for (let x = cx0; x <= cx1; x++) { const a = ink[oa + x], b = ink[ob + x]; if (a || b) { any++; if (a === b) same++; } }
        return any ? same / any : 0;
      };
      for (const L of lines) {
        const hgt = L.y1 - L.y0 + 1;
        L.bar = false;
        if (hgt >= 3 * ppm) {
          const ya = L.y0 + Math.round(hgt * 0.15), yb = L.y0 + Math.round(hgt * 0.45);
          L.bar = transitions(ya) >= 18 && transitions(yb) >= 18 && similar(ya, yb) >= 0.9;
        }
      }
      const bars = lines.map((l, i) => (l.bar ? i : -1)).filter(i => i >= 0);
      const groups = [];
      if (bars.length) {
        let startIdx = bars[0];
        // leading lines that sit close above the first barcode belong to it
        while (startIdx > 0 && lines[startIdx].y0 - lines[startIdx - 1].y1 < 3.5 * ppm) startIdx--;
        for (let b = 0; b < bars.length; b++) {
          let end;
          if (b + 1 < bars.length) {
            let cut = bars[b], best = -1;
            for (let j = bars[b]; j < bars[b + 1]; j++) { const g = lines[j + 1].y0 - lines[j].y1; if (g > best) { best = g; cut = j; } }
            end = cut;
          } else {
            end = bars[b];
            while (end + 1 < lines.length && lines[end + 1].y0 - lines[end].y1 < 3.5 * ppm) end++;
          }
          groups.push([startIdx, end]);
          startIdx = end + 1;
        }
      } else {
        // No barcode found (e.g. a heavily blurred scan): split on gaps of 2.5 mm or more.
        let s = 0;
        for (let j = 0; j < lines.length; j++) {
          if (j + 1 === lines.length || lines[j + 1].y0 - lines[j].y1 >= 2.5 * ppm) { groups.push([s, j]); s = j + 1; }
        }
      }
      groups.forEach(([a, b], gi) => {
        const y0 = lines[a].y0, y1 = lines[b].y1;
        if ((y1 - y0) < 4 * ppm) return; // specks or stray text
        const [x0, x1] = xExtent(y0, y1);
        const prevBottom = gi > 0 ? lines[groups[gi - 1][1]].y1 : -Infinity;
        const nextTop = gi + 1 < groups.length ? lines[groups[gi + 1][0]].y0 : Infinity;
        const pad = 0.8 * ppm;
        labels.push({
          x0: Math.max(0, x0 - pad, cx0 - pad), x1: Math.min(W - 1, x1 + pad, cx1 + pad),
          y0: Math.max(0, y0 - Math.min(pad, (y0 - prevBottom) / 2)), y1: Math.min(H - 1, y1 + Math.min(pad, (nextTop - y1) / 2)),
          barcode: bars.length > 0,
        });
      });
    }
    // reading order: rows top to bottom, then left to right
    labels.sort((a, b) => a.y0 - b.y0);
    const rows = [];
    for (const l of labels) {
      const r = rows.find(r => Math.abs(r.cy - (l.y0 + l.y1) / 2) < (l.y1 - l.y0) * 0.5);
      if (r) r.items.push(l); else rows.push({ cy: (l.y0 + l.y1) / 2, items: [l] });
    }
    return rows.sort((a, b) => a.cy - b.cy).flatMap(r => r.items.sort((a, b) => a.x0 - b.x0));
  }
  // Matrix that maps the embedded source page (PDF user space, shifted by the media box origin)
  // onto a crop placed at (ox, oy) with scale k on the output page. vt: pdf.js viewport.transform.
  function cropMatrix(vt, crop, k, ox, oy, mbLeft, mbBottom) {
    const [a, b, c, d, e, f] = vt;
    const A = k * a, B = -k * b, C = k * c, D = -k * d;
    const E = ox + k * (e - crop.x0), Fy = oy + k * (crop.y1 - f);
    return [A, B, C, D, E + A * mbLeft + C * mbBottom, Fy + B * mbLeft + D * mbBottom];
  }

  const api = {
    PT, MM, SITE, CREDIT_URL, code128, darkRuns, textW, clean, wrap, fitText, STOCKS, STOCK, customStock, sheetCells, stockIssues,
    CONDITIONS, checkCode, normCode, barcodeFit, unitLabel, fitParas, textLabel, suffocationMinPt, SUFFOCATION, suffocationParas,
    SET_TEXTS, setParas, formatDate, dateParas, binLabel, rangeCodes, testDraw, rulerPage, memo, paginate, creditSpot, toSvg, toPdf, toZpl,
    parseDelimited, mapRows, readXlsx, detectLabels, cropMatrix, rotOps,
  };
  root.PLCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
