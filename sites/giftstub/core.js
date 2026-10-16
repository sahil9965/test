/* GiftStub core: numbering, the 3-up certificate layout, PDF building and the issue-log CSV.
   No DOM access, so the same file runs on the page and in Node tests.
   All coordinates are PDF points (1/72 inch) with the origin at the bottom-left. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GSCore = api;
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

  /* ------------------------------------------------------------ settings */
  const MAX_CERTS = 500, PER_PAGE = 3, STUB_PCT = 29;
  const PAPER = { letter: { w: 612, h: 792, name: "US Letter" }, a4: { w: 595.28, h: 841.89, name: "A4" } };
  const MX = 36, MY = 48; // sheet margins: 0.5 in at the sides, 0.67 in top and bottom (room for marks and the credit)
  const SITE = "https://giftcert.roohsites.com";
  const CREDIT_URL = SITE + "/?utm_source=giftstub&utm_medium=watermark&utm_campaign=referral";
  const CREDIT = "Made with GiftStub · giftcert.roohsites.com";
  const STUB_LINES = ["Issued to", "Date", "Amount", "Redeemed"];
  const DESIGNS = ["classic", "modern", "minimal"];

  const DEFAULTS = {
    preset: "general", business: "Your Business Name", headline: "Gift Certificate",
    value: "$50 toward any service or purchase", to: "", from: "", toFrom: true,
    terms: "Not redeemable for cash. Lost or stolen certificates can't be replaced.",
    contact: "123 Main Street · (555) 010-0100 · yourbusiness.example",
    expiry: false, expiryDate: "", prefix: "GC-", start: 1, qty: 30, pad: "4",
    paper: "letter", design: "classic", color: "#881337", crop: true, borders: true,
  };
  // Sample wording and colours for each kind of business. Business names, phone numbers and
  // .example domains are placeholders.
  const PRESETS = {
    general: { label: "General" },
    salon: { label: "Salon", business: "Bella Hair Studio", value: "$75 toward any salon service", terms: "Valid for hair, color and nail services. Please book ahead. Not redeemable for cash.", contact: "42 Elm Street · (555) 010-0142 · bellahair.example", color: "#9d174d", design: "modern" },
    massage: { label: "Massage & spa", business: "Still Water Massage & Spa", value: "One 60-minute massage", terms: "Please call ahead to book. Our 24-hour cancellation policy applies. Not redeemable for cash.", contact: "(555) 010-0177 · stillwaterspa.example", color: "#0f766e", design: "classic" },
    photography: { label: "Photography", business: "Golden Hour Photography", value: "One 1-hour portrait session", terms: "Includes 15 edited digital images. Book at least two weeks ahead. Prints are extra.", contact: "hello@goldenhour.example · (555) 010-0163", color: "#334155", design: "minimal" },
    bakery: { label: "Bakery", business: "Sweet Crumb Bakery", value: "$25 toward cakes, pastries and treats", terms: "Custom cake orders need 7 days' notice. Not redeemable for cash.", contact: "Order at sweetcrumb.example · (555) 010-0125", color: "#9a3412", design: "classic" },
    auto: { label: "Auto detailing", business: "Shine Pro Auto Detailing", value: "One full interior and exterior detail", terms: "Appointment required. Valid for one standard-size car or SUV.", contact: "(555) 010-0190 · shinepro.example", color: "#1d4ed8", design: "modern" },
    holiday: { label: "Holiday", headline: "Holiday Gift Certificate", value: "$50 toward any service or purchase", terms: "Wishing you a happy holiday season! Not redeemable for cash.", color: "#b91c1c", design: "classic" },
  };
  const PRESET_KEYS = ["business", "headline", "value", "terms", "contact", "color", "design"];
  const isPreset = name => typeof name === "string" && Object.prototype.hasOwnProperty.call(PRESETS, name);
  // Full wording for a preset (keys the preset leaves out fall back to the defaults).
  const presetValues = name => { const p = PRESETS[isPreset(name) ? name : "general"], o = {}; for (const k of PRESET_KEYS) o[k] = p[k] !== undefined ? p[k] : DEFAULTS[k]; return o; };
  function presetState(name, base) {
    const out = Object.assign({}, DEFAULTS, base || {}, presetValues(name));
    out.preset = isPreset(name) ? name : "general";
    return out;
  }

  const toInt = (v, d) => {
    const t = String(v == null ? "" : v).replace(/[,\s_]/g, "");
    return /^-?\d{1,15}$/.test(t) ? parseInt(t, 10) : d;
  };
  const MAXLEN = { business: 60, headline: 40, value: 90, to: 40, from: 40, terms: 160, contact: 100 };
  // Validates and cleans a settings object. Returns { s, errors, lost } where lost lists unprintable characters.
  function normalize(input) {
    const s = Object.assign({}, DEFAULTS, input && typeof input === "object" ? input : {});
    const errors = [], lost = new Set();
    for (const k of Object.keys(MAXLEN)) {
      const v = s[k];
      const c = clean(typeof v === "string" || typeof v === "number" ? [...String(v)].slice(0, MAXLEN[k]).join("") : "");
      s[k] = c.text; c.lost.forEach(x => lost.add(x));
    }
    const pc = clean(typeof s.prefix === "string" || typeof s.prefix === "number" ? [...String(s.prefix)].slice(0, 10).join("") : "", true);
    s.prefix = pc.text; pc.lost.forEach(x => lost.add(x));
    if (!isPreset(s.preset)) s.preset = "general";
    s.start = toInt(s.start, NaN);
    s.qty = toInt(s.qty, NaN);
    if (!Number.isFinite(s.start) || s.start < 0) errors.push("Start number must be a whole number of 0 or more.");
    else if (s.start > 9999999) errors.push("Start number must be 9,999,999 or less.");
    if (!Number.isFinite(s.qty) || s.qty < 1) errors.push("Quantity must be a whole number from 1 to 500.");
    else if (s.qty > MAX_CERTS) errors.push(`One PDF holds up to ${MAX_CERTS} certificates. Make ${MAX_CERTS} now, then a second batch starting at ${Number.isFinite(s.start) ? s.start + MAX_CERTS : MAX_CERTS + 1}.`);
    s.count = errors.length ? 0 : s.qty;
    s.end = errors.length ? s.start : s.start + s.qty - 1;
    if (!["none", "2", "3", "4", "5", "6"].includes(String(s.pad))) s.pad = "4";
    s.pad = String(s.pad);
    if (!PAPER[s.paper]) s.paper = "letter";
    if (!DESIGNS.includes(s.design)) s.design = "classic";
    if (!/^#[0-9a-f]{6}$/i.test(String(s.color || ""))) s.color = DEFAULTS.color;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.expiryDate || ""))) s.expiryDate = "";
    for (const k of ["toFrom", "expiry", "crop", "borders"]) s[k] = !!s[k];
    return { s, errors, lost: [...lost] };
  }

  /* ------------------------------------------------------------ numbering */
  const padWidth = s => (s.pad === "none" ? 0 : Number(s.pad) || 0);
  const fmtNum = (n, s) => s.prefix + String(n).padStart(padWidth(s), "0");
  const sheetCount = count => Math.ceil(count / PER_PAGE);
  // Which certificate (0-based index into the run) sits at a position on a sheet, or -1 for an empty slot.
  function indexAt(sheet, pos, count) {
    const i = sheet * PER_PAGE + pos;
    return pos >= 0 && pos < PER_PAGE && i < count ? i : -1;
  }
  // Three certificates stacked on a portrait page; neighbours share a cut line.
  function sheetGeometry(paper) {
    const P = PAPER[paper] || PAPER.letter;
    const gw = P.w - 2 * MX, gh = P.h - 2 * MY, ch = gh / PER_PAGE;
    const cells = [];
    for (let r = 0; r < PER_PAGE; r++) cells.push({ x: MX, y: P.h - MY - (r + 1) * ch, w: gw, h: ch });
    return { pageW: P.w, pageH: P.h, gx: MX, gy: MY, gw, gh, cols: 1, rows: PER_PAGE, cellW: gw, cellH: ch, cells, paperName: P.name };
  }
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m || +m[2] < 1 || +m[2] > 12) return "";
    return `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
  }

  /* --------------------------------------------------------------- layout */
  const rect = (x, y, w, h, o) => Object.assign({ t: "rect", x, y, w, h }, o);
  const line = (x1, y1, x2, y2, o) => Object.assign({ t: "line", x1, y1, x2, y2, w: 0.6, color: INK }, o);
  const text = (str, x, y, size, font, color, align) => ({ t: "text", text: str, x, y, size, font, color, align: align || "left" });
  const ASC = 0.72; // approximate cap height used to place text from a top edge

  // Lays out one certificate (stub + certificate) in a W x H cell. Static parts go in `prims`;
  // the per-certificate numbers go in `slots` ("stubnum" and "certnum"), which the renderer fills
  // from the same index so the stub always matches its certificate.
  // opt: { logo: {aspect}, digital: true for the emailable image (no stub, no cut line) }
  function layoutCert(s, W, H, opt = {}) {
    const prims = [], slots = [], cuts = new Set();
    const design = s.design, classic = design === "classic", modern = design === "modern";
    const acc = design === "minimal" ? INK : readable(hexRgb(s.color));
    const hasStub = !opt.digital;
    const sw = hasStub ? Math.round(W * STUB_PCT / 100) : 0;
    const longest = [fmtNum(s.start, s), fmtNum(s.end, s)].sort((a, b) => b.length - a.length)[0];

    if (hasStub && design !== "minimal") prims.push(rect(0, 0, sw, H, { fill: mix(acc, WHITE, 0.92) }));
    if (s.borders && hasStub) prims.push(rect(0, 0, W, H, { stroke: CUT, sw: 0.5 }));
    if (hasStub) { prims.push(line(sw, 3, sw, H - 3, { color: GRAY, w: 0.8, dash: [4, 3] })); stub(); }
    body();
    return { prims, slots, cut: [...cuts], stubW: sw };

    function stub() {
      const x0 = 14, x1 = sw - 12, w = x1 - x0;
      const k = clamp(H / 232, 0.8, 1.15);
      let y = H - 16 * k;
      const ls = 6.6 * k;
      prims.push(text("STUB · CERTIFICATE NO.", x0, y - ASC * ls, ls, "HB", GRAY));
      y -= ls + 6 * k;
      const ns = Math.min(17 * k, w / textW(longest, "HB", 1));
      slots.push({ key: "stubnum", x: x0, y: y - ASC * ns, size: ns, font: "HB", color: acc, align: "left", maxW: w });
      y -= ns + 4 * k;
      const bottom = 14 * k;
      const gap = (y - bottom) / STUB_LINES.length;
      STUB_LINES.forEach((lab, i) => {
        const base = y - gap * (i + 1) + 2;
        prims.push(text(lab, x0, base + 2, 7.2 * k, "H", GRAY));
        const lx = x0 + textW(lab, "H", 7.2 * k) + 4;
        prims.push(line(lx, base, x1, base, { color: LIGHT, w: 0.6 }));
      });
    }

    function body() {
      let best = null;
      for (let k = clamp(Math.min(H / 220, (W - sw) / 360), 0.6, 1.2); k >= 0.5; k -= 0.04) {
        best = bodyAt(k);
        if (best.ok) break;
      }
      prims.push(...best.P);
      slots.push(...best.S);
      best.C.forEach(c => cuts.add(c));
    }

    function bodyAt(k) {
      const P = [], S = [], C = [];
      const inset = classic ? 25 : 18;
      const x0 = sw + inset, x1 = W - inset - (modern ? 9 : 0), bw = x1 - x0, cx = (x0 + x1) / 2;
      const top = H - inset, bottom = inset;
      const align = classic ? "center" : "left", ax = classic ? cx : x0;
      if (classic) {
        P.push(rect(sw + 9, 9, W - sw - 18, H - 18, { stroke: acc, sw: 1.6 }));
        P.push(rect(sw + 13.5, 13.5, W - sw - 27, H - 27, { stroke: acc, sw: 0.5 }));
      }
      if (modern) P.push(rect(W - 9, 0, 9, H, { fill: acc }));
      const put = (str, size, font, color, maxW, minSize, what, y) => {
        const f = fitLine(str, font, size, minSize, maxW);
        if (f.cut) C.push(what);
        if (f.text) P.push(text(f.text, ax, y, f.size, font, color, align));
        return f;
      };
      let y = top;

      // Header: logo, business name and the certificate number.
      const ns = 9.5 * k;
      const numW = textW("No. " + longest, "HB", ns);
      let lw = 0, lh = 0;
      if (opt.logo) {
        lh = 30 * k; lw = lh * opt.logo.aspect;
        if (lw > bw * 0.3) { lw = bw * 0.3; lh = lw / opt.logo.aspect; }
        P.push({ t: "img", x: x0, y: y - lh, w: lw, h: lh });
      }
      const bs = 11 * k, bfont = classic ? "TB" : "HB";
      const hh = Math.max(lh, bs);
      const mid = y - hh / 2;
      S.push({ key: "certnum", x: x1, y: mid - ns * 0.36, size: ns, font: "HB", color: design === "minimal" ? INK : acc, align: "right", maxW: bw * 0.42 });
      if (s.business) {
        const name = s.business.toUpperCase();
        const side = Math.max(lw, numW) + 10;
        const maxW = classic ? bw - 2 * side : x1 - numW - 12 - (x0 + (lw ? lw + 10 : 0));
        const f = fitLine(name, bfont, bs, 6.5, Math.max(30, maxW));
        if (f.cut) C.push("business name");
        P.push(text(f.text, classic ? cx : x0 + (lw ? lw + 10 : 0), mid - f.size * 0.36, f.size, bfont, classic ? acc : INK, classic ? "center" : "left"));
      }
      y -= hh + 9 * k;
      if (design === "minimal") { P.push(line(x0, y + 3 * k, x1, y + 3 * k, { color: LIGHT, w: 0.6 })); y -= 5 * k; }

      // Headline and value.
      if (s.headline) {
        const hs = (classic ? 31 : modern ? 27 : 25) * k, hf = classic ? "TB" : "HB";
        const f = put(s.headline, hs, hf, classic ? acc : INK, bw, 12, "headline", y - ASC * hs);
        y -= f.size * ASC + 9 * k;
        if (classic) { P.push(line(cx - 26, y - 2 * k, cx + 26, y - 2 * k, { color: acc, w: 0.8 })); y -= 11 * k; }
      }
      if (s.value) {
        const vs = 15 * k;
        const w2 = wrap(s.value, "HB", vs, bw, 2);
        if (w2.cut) C.push("value or service");
        for (const l of w2.lines) { P.push(text(l, ax, y - ASC * vs, vs, "HB", modern ? acc : INK, align)); y -= vs * 1.22; }
        y -= 2 * k;
      }

      // From the bottom up: contact, terms, expiry.
      let by = bottom;
      if (s.contact) { const f = put(s.contact, 8.2 * k, "H", INK, bw, 6, "contact line", by); by += f.size * 1.45; }
      if (s.terms) {
        const ts = 7.4 * k;
        const w3 = wrap(s.terms, "H", ts, bw, 2);
        if (w3.cut) C.push("terms");
        const n = w3.lines.length;
        w3.lines.forEach((l, i) => P.push(text(l, ax, by + (n - 1 - i) * ts * 1.25, ts, "H", GRAY, align)));
        by += n * ts * 1.25 + 3 * k;
      }
      if (s.expiry) {
        const es = 8.6 * k, d = fmtDate(s.expiryDate);
        if (d) put("Expires " + d, es, "HB", INK, bw, 6, "expiry date", by);
        else {
          const lab = "Expires", lw2 = textW(lab, "HB", es), len = 96 * k;
          const gx = classic ? cx - (lw2 + 4 + len) / 2 : x0;
          P.push(text(lab, gx, by, es, "HB", INK));
          P.push(line(gx + lw2 + 4, by - 1, gx + lw2 + 4 + len, by - 1, { color: GRAY, w: 0.6 }));
        }
        by += es * 1.7;
      }

      // To / From write-in lines in the space between.
      let ok = y >= by;
      if (s.toFrom) {
        const rowH = 22 * k, fs = 8.4 * k, gap = 18 * k, colW = (bw - gap) / 2;
        ok = y - by >= rowH;
        const base = by + Math.max(0, (y - by - rowH) / 2) + 6 * k;
        [["To", s.to], ["From", s.from]].forEach(([lab, val], i) => {
          const lx = x0 + i * (colW + gap);
          P.push(text(lab, lx, base + 1.5, fs, "HB", GRAY));
          const sx = lx + textW(lab, "HB", fs) + 5;
          P.push(line(sx, base, lx + colW, base, { color: GRAY, w: 0.6 }));
          if (val) { const f = fitLine(val, "HB", 10.5 * k, 6.5, lx + colW - sx - 4); P.push(text(f.text, sx + 3, base + 2.5, f.size, "HB", INK)); if (f.cut) C.push(lab + " line"); }
        });
      }
      return { ok, P, S, C };
    }
  }

  // Everything printed on a sheet outside the certificates: crop marks, sheet info, the referral credit.
  function sheetPrims(s, g, sheet, sheets) {
    const P = [];
    if (s.crop) {
      const o = 3, L = 9, top = g.gy + g.gh, right = g.gx + g.gw;
      for (const x of [g.gx, right]) { P.push(line(x, top + o, x, top + o + L, { w: 0.5 })); P.push(line(x, g.gy - o, x, g.gy - o - L, { w: 0.5 })); }
      for (let r = 0; r <= g.rows; r++) { const y = g.gy + r * g.cellH; P.push(line(g.gx - o, y, g.gx - o - L, y, { w: 0.5 })); P.push(line(right + o, y, right + o + L, y, { w: 0.5 })); }
    }
    P.push(text(`Gift certificates · sheet ${sheet + 1} of ${sheets} · cut on the marks, tear or fold on the dashed line`, g.gx + 8, g.pageH - MY + 18, 6.5, "H", GRAY));
    P.push(text("Print at 100% (Actual size)", g.gx + g.gw - 8, g.pageH - MY + 18, 6.5, "H", GRAY, "right"));
    const cw = textW(CREDIT, "H", 7), cx = g.pageW / 2, cy = MY - 26;
    P.push(text(CREDIT, cx, cy, 7, "H", GRAY, "center"));
    P.push({ t: "link", x: cx - cw / 2 - 2, y: cy - 2.5, w: cw + 4, h: 10, url: CREDIT_URL });
    return P;
  }

  // Text for a per-certificate slot. Both keys come from the same number.
  function slotText(key, idx, s) {
    const n = s.start + idx;
    if (key === "stubnum") return fmtNum(n, s);
    if (key === "certnum") return "No. " + fmtNum(n, s);
    return "";
  }
  // The certificates on one sheet: position, index, and the number printed on the stub and on the certificate.
  function sheetItems(s, sheet) {
    const out = [];
    for (let pos = 0; pos < PER_PAGE; pos++) {
      const idx = indexAt(sheet, pos, s.count);
      if (idx < 0) continue;
      out.push({ pos, idx, number: fmtNum(s.start + idx, s), stub: slotText("stubnum", idx, s), cert: slotText("certnum", idx, s).replace(/^No\. /, "") });
    }
    return out;
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
  function svgSlots(lay, s, idx, H, dx, dy) {
    let out = "";
    for (const sl of lay.slots) {
      const str = slotText(sl.key, idx, s);
      if (!str) continue;
      const f = fitSlot(sl, str);
      out += svgText(f.text, dx + sl.x, dy + sl.y, f.size, sl.font, sl.color, sl.align, H);
    }
    return out;
  }
  // One certificate as a standalone SVG (W x H points).
  function svgCert(s, lay, W, H, idx, logoHref) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(W)} ${r2(H)}" width="${r2(W)}" height="${r2(H)}" style="font-kerning:none"><rect width="100%" height="100%" fill="#fff"/>` +
      svgPrims(lay.prims, H, 0, 0, logoHref) + svgSlots(lay, s, idx, H, 0, 0) + "</svg>";
  }
  // A whole sheet as SVG, exactly as it will print.
  function svgSheet(s, g, lay, sheet, logoHref) {
    const sheets = sheetCount(s.count);
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(g.pageW)} ${r2(g.pageH)}" style="font-kerning:none"><rect width="100%" height="100%" fill="#fff"/>`;
    out += svgPrims(sheetPrims(s, g, sheet, sheets), g.pageH, 0, 0);
    for (const it of sheetItems(s, sheet)) {
      const c = g.cells[it.pos];
      out += svgPrims(lay.prims, g.pageH, c.x, c.y, logoHref) + svgSlots(lay, s, it.idx, g.pageH, c.x, c.y);
    }
    return out + "</svg>";
  }


  /* --------------------------------------------------------------- CSV */
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


  /* Builds the certificate PDF. opts: { logo: {bytes, type:'png'|'jpg', aspect}, onProgress } */
  async function buildPdf(L, input, opts = {}) {
    const { s, errors } = normalize(input);
    if (errors.length) throw new Error(errors[0]);
    const g = sheetGeometry(s.paper);
    const lay = layoutCert(s, g.cellW, g.cellH, { logo: opts.logo ? { aspect: opts.logo.aspect } : null });
    const doc = await L.PDFDocument.create();
    const title = `Gift certificates ${fmtNum(s.start, s)}-${fmtNum(s.end, s)}`;
    doc.setTitle(title);
    doc.setSubject(s.business ? `${s.business} gift certificates` : title);
    doc.setCreator("GiftStub (giftcert.roohsites.com)");
    doc.setProducer("GiftStub with pdf-lib");
    doc.setKeywords(["gift certificates", "numbered", "GiftStub"]);
    const used = new Set(["H"]);
    for (const p of lay.prims.concat(lay.slots)) if (p.font) used.add(p.font);
    const fonts = await embedFonts(L, doc, [...used]);
    let img = null;
    if (opts.logo) img = opts.logo.type === "jpg" ? await doc.embedJpg(opts.logo.bytes) : await doc.embedPng(opts.logo.bytes);
    const sheets = sheetCount(s.count);
    const c = a => L.rgb(a[0], a[1], a[2]);
    for (let sh = 0; sh < sheets; sh++) {
      const page = doc.addPage([g.pageW, g.pageH]);
      const sp = sheetPrims(s, g, sh, sheets);
      drawPrims(L, page, sp.filter(p => p.t !== "link"), fonts, 0, 0);
      sp.filter(p => p.t === "link").forEach(p => addLink(L, doc, page, p));
      for (const it of sheetItems(s, sh)) {
        const cell = g.cells[it.pos];
        drawPrims(L, page, lay.prims, fonts, cell.x, cell.y, img);
        for (const sl of lay.slots) {
          const f = fitSlot(sl, slotText(sl.key, it.idx, s));
          const x = sl.align === "center" ? sl.x - f.w / 2 : sl.align === "right" ? sl.x - f.w : sl.x;
          page.drawText(f.text, { x: cell.x + x, y: cell.y + sl.y, size: f.size, font: fonts[sl.font], color: c(sl.color) });
        }
      }
      if (opts.onProgress && (sh % 20 === 19 || sh === sheets - 1)) { opts.onProgress((sh + 1) / sheets, sh + 1, sheets); await tick(); }
    }
    const bytes = await doc.save();
    return { bytes, sheets, count: s.count, cut: lay.cut };
  }

  /* ------------------------------------------------------- issue log CSV */
  const LOG_HEAD = ["Number", "Status", "Issued to", "Amount", "Issued on", "Redeemed on", "Notes"];
  // Quote for CSV, and stop spreadsheet apps from treating a cell as a formula.
  const csvCell = v => {
    let t = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csvRows = rows => "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  // Blank tracking sheet for the numbers just printed (same columns as the log, so it can be imported).
  function issueLogCsv(input) {
    const { s, errors } = normalize(input);
    if (errors.length) throw new Error(errors[0]);
    const rows = [LOG_HEAD];
    for (let i = 0; i < s.count; i++) rows.push([fmtNum(s.start + i, s), "", "", "", "", "", ""]);
    return csvRows(rows);
  }
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  function cleanEntry(e) {
    if (!e || typeof e !== "object") return null;
    const str = (v, n) => String(v == null ? "" : v).replace(/^'(?=[=+\-@])/, "").trim().slice(0, n);
    const n = str(e.n, 40);
    if (!n) return null;
    const redeemed = ISO.test(str(e.redeemed, 10)) ? str(e.redeemed, 10) : "";
    const status = e.status === "redeemed" || redeemed ? "redeemed" : "issued";
    return { n, status, to: str(e.to, 80), amount: str(e.amount, 30), issued: ISO.test(str(e.issued, 10)) ? str(e.issued, 10) : "", redeemed: status === "redeemed" ? redeemed : "", note: str(e.note, 200) };
  }
  const logCsv = entries => csvRows([LOG_HEAD, ...entries.map(e => [e.n, e.status, e.to, e.amount, e.issued, e.redeemed, e.note])]);
  // Reads a log CSV (ours, or a spreadsheet with similar column names). Rows without a number are skipped.
  function parseLogCsv(textIn) {
    const rows = parseCSV(textIn);
    if (!rows.length) return [];
    const head = rows[0].map(h => h.toLowerCase());
    const find = re => head.findIndex(h => re.test(h));
    const hasHead = find(/number|no\.?$|cert/) >= 0;
    const col = hasHead
      ? { n: find(/number|no\.?$|cert/), status: find(/status/), to: find(/issued to|to$|name|customer|recipient/), amount: find(/amount|value/), issued: find(/issued on|issue date|date issued|sold/), redeemed: find(/redeem/), note: find(/note/) }
      : { n: 0, status: 1, to: 2, amount: 3, issued: 4, redeemed: 5, note: 6 };
    const get = (r, i) => (i >= 0 ? r[i] || "" : "");
    const out = [];
    for (const r of hasHead ? rows.slice(1) : rows) {
      const st = get(r, col.status).toLowerCase();
      const e = cleanEntry({ n: get(r, col.n), status: /redeem|used/.test(st) ? "redeemed" : "issued", to: get(r, col.to), amount: get(r, col.amount), issued: get(r, col.issued), redeemed: get(r, col.redeemed), note: get(r, col.note) });
      if (e) out.push(e);
    }
    return out;
  }

  return {
    clean, textW, fitLine, wrap, hexRgb, readable, mix,
    MAX_CERTS, PER_PAGE, STUB_PCT, PAPER, MX, MY, DEFAULTS, PRESETS, PRESET_KEYS, DESIGNS, STUB_LINES, presetValues, presetState, normalize, isPreset, toInt,
    padWidth, fmtNum, fmtDate, sheetCount, indexAt, sheetGeometry, layoutCert, sheetPrims, slotText, sheetItems, fitSlot,
    svgCert, svgSheet, buildPdf, parseCSV, issueLogCsv, logCsv, parseLogCsv, cleanEntry, LOG_HEAD,
    CREDIT, CREDIT_URL, SITE,
  };
});
