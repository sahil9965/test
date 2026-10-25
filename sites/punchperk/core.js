/* PunchPerk core: settings, sheet geometry, numbering, card layout, SVG preview and PDF building.
   No DOM access, so the same file runs on the page and in Node tests.
   All coordinates are PDF points (1/72 inch) with the origin at the bottom-left. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PPCore = api;
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
  // The Courier family is monospaced: every glyph is 600 wide.
  W.C = W.H.map(() => 600);
  W.CB = W.H.map(() => 600);

  /* ------------------------------------------------------------ constants */
  const SITE = "https://punchcard.roohsites.com";
  const CREDIT_URL = SITE + "/?utm_source=punchperk&utm_medium=watermark&utm_campaign=referral";
  const CREDIT = "Made with PunchPerk · punchcard.roohsites.com";
  const MAX_CARDS = 500, GAP = 9 /* 1/8 in */, MAX_NUDGE = 3 /* mm */;
  const mm = v => (v * 72) / 25.4;
  const PAPER = { letter: { w: 612, h: 792, name: "US Letter" }, a4: { w: 595.28, h: 841.89, name: "A4" } };
  // Card sizes: 3.5 x 2 in on Letter (matches 10-up business card sheets), 85 x 55 mm on A4.
  const LAYOUTS = {
    "letter-10": { paper: "letter", plain: false, cols: 2, rows: 5, cw: 252, ch: 144, label: "US Letter business-card sheet, 10 per page (3.5 × 2 in)" },
    "a4-10": { paper: "a4", plain: false, cols: 2, rows: 5, cw: mm(85), ch: mm(55), label: "A4 business-card sheet, 10 per page (85 × 55 mm)" },
    "letter-plain": { paper: "letter", plain: true, cols: 2, rows: 4, cw: 252, ch: 144, label: "Plain US Letter, 1/8 in gaps and crop marks, 8 per page" },
    "a4-plain": { paper: "a4", plain: true, cols: 2, rows: 4, cw: mm(85), ch: mm(55), label: "Plain A4, 1/8 in gaps and crop marks, 8 per page" },
  };
  const FONTS = {
    modern: { r: "H", b: "HB", label: "Modern (Helvetica)" },
    classic: { r: "T", b: "TB", label: "Classic (Times)" },
    typewriter: { r: "C", b: "CB", label: "Typewriter (Courier)" },
  };
  const MARKS = { circle: "Plain circles", coffee: "Coffee cup", star: "Star", heart: "Heart", scissors: "Scissors", paw: "Paw print", car: "Car", cupcake: "Cupcake", book: "Book", smiley: "Smiley face", check: "Check mark" };
  const PALETTES = [
    { name: "Lime green", color: "#4d7c0f", bg: "light" },
    { name: "Espresso", color: "#7c4a21", bg: "light" },
    { name: "Ocean teal", color: "#0f766e", bg: "light" },
    { name: "Berry", color: "#be185d", bg: "light" },
    { name: "Sunset orange", color: "#c2410c", bg: "light" },
    { name: "Midnight gold", color: "#f5b83d", bg: "dark" },
  ];

  /* ------------------------------------------------------------- icons */
  // Simple outline icons in a 24 x 24 box (y down), drawn as strokes. Original artwork, no icon fonts or sets.
  const ci = (cx, cy, r) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
  const starPath = (() => {
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4.5 : 10.6; pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12.7 + r * Math.sin(a)).toFixed(2)}`); }
    return "M" + pts.join("L") + "Z";
  })();
  const ICONS = {
    coffee: "M4 9.5V14C4 17.4 6.6 19.6 9.8 19.6H10.4C13.6 19.6 16 17.4 16 14V9.5ZM16 11H17.4C19.3 11 20.4 12.2 20.4 13.6C20.4 15 19.3 16.2 17.4 16.2H15.6M3 22H17M7.6 3.2C6.6 4.7 8.6 5.6 7.6 7.2M11.6 3.2C10.6 4.7 12.6 5.6 11.6 7.2",
    star: starPath,
    heart: "M12 20.4C4.2 14.6 3 10.8 3 8.4C3 5.6 5.1 3.6 7.6 3.6C9.5 3.6 11.2 4.7 12 6.5C12.8 4.7 14.5 3.6 16.4 3.6C18.9 3.6 21 5.6 21 8.4C21 10.8 19.8 14.6 12 20.4Z",
    scissors: `${ci(6.8, 18, 3)}${ci(17.2, 18, 3)}M8.9 15.8L18.8 3.6M15.1 15.8L5.2 3.6`,
    paw: `${ci(4.8, 10.6, 2)}${ci(9.2, 5.8, 2)}${ci(14.8, 5.8, 2)}${ci(19.2, 10.6, 2)}M12 12C8.6 12 6 15.4 6 17.6C6 19.8 8 20.4 9.6 19.9C11 19.5 13 19.5 14.4 19.9C16 20.4 18 19.8 18 17.6C18 15.4 15.4 12 12 12Z`,
    car: `M3 16.5V12L5.3 7.3C5.7 6.5 6.4 6 7.3 6H16.7C17.6 6 18.3 6.5 18.7 7.3L21 12V16.5H19.4M4.6 16.5H3M9.2 16.5H14.8M3 12H21M12 6V12${ci(7, 17, 2.1)}${ci(17, 17, 2.1)}`,
    cupcake: `M6 12.5L7.5 20.5H16.5L18 12.5ZM5 12.5C4.5 8.6 7.5 6 12 6C16.5 6 19.5 8.6 19 12.5ZM10 13.2L10.6 19.8M14 13.2L13.4 19.8${ci(12, 3.9, 1.5)}`,
    book: "M12 6.6C10 5 6.6 4.6 3.5 5V18C6.6 17.6 10 18 12 19.6C14 18 17.4 17.6 20.5 18V5C17.4 4.6 14 5 12 6.6ZM12 6.6V19.6",
    smiley: `${ci(12, 12, 9)}M9 9.4L9 10M15 9.4L15 10M7.6 14C9.2 17.6 14.8 17.6 16.4 14`,
    check: "M5 12.6L10 17.4L19.2 6.8",
    gift: "M4 11.2H20V20.6H4ZM3 7.6H21V11.2H3ZM12 7.6V20.6M12 7.6C12 7.6 8 7.6 8 5.3C8 3.6 10.6 3.6 12 7.6C13.4 3.6 16 3.6 16 5.3C16 7.6 12 7.6 12 7.6Z",
  };
  const rrect = (w, h, r) => `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;

  /* ------------------------------------------------------------ settings */
  const DEFAULTS = {
    preset: "general", business: "Your Business Name", reward: "Buy 9, get the 10th free", punches: 10, rows: "2",
    mark: "star", rewardSpot: true, rewardStyle: "free", terms: "One stamp per visit. No cash value.", contact: "", nameLine: true,
    color: "#4d7c0f", font: "modern", bg: "light", border: true,
    serials: false, prefix: "No. ", start: 1, pad: "4", initials: false, qty: 30,
    layout: "letter-10", dx: 0, dy: 0, outline: false,
    back: false, order: "interleaved", backNote: "Thank you for visiting!", address: "", hours: "", social: "", qrUrl: "", qrLabel: "Scan me",
  };
  // Sample wording for each kind of business. Names, phone numbers and .example domains are placeholders.
  const PRESETS = {
    general: { label: "General" },
    coffee: { label: "Coffee", business: "Corner Cup Coffee", reward: "Buy 9 drinks, get the 10th free", punches: 10, mark: "coffee", color: "#7c4a21", font: "modern", terms: "One stamp per drink. No cash value. Free drink up to a large.", contact: "Open daily 7am to 3pm · cornercup.example", backNote: "Thanks for the coffee run!", address: "12 Market Street", hours: "Mon to Fri 7am to 3pm · Sat 8am to 2pm", social: "@cornercupcoffee", qrUrl: "https://cornercup.example/menu", qrLabel: "See the menu" },
    salon: { label: "Salon & barber", business: "Studio Rose Hair & Barber", reward: "Buy 7 cuts, get the 8th free", punches: 8, rows: "2", mark: "scissors", color: "#9d174d", font: "classic", terms: "One stamp per paid service. Please book ahead. No cash value.", contact: "(555) 010-0142 · studiorose.example", backNote: "Thank you for your visit!", address: "42 Elm Street", hours: "Tue to Sat 9am to 6pm", social: "@studiorosehair", qrUrl: "https://studiorose.example/book", qrLabel: "Book online" },
    carwash: { label: "Car wash", business: "Sparkle Car Wash", reward: "Buy 5 washes, get the 6th free", punches: 6, rows: "1", mark: "car", color: "#1d4ed8", font: "modern", terms: "One stamp per paid wash. Free wash is the basic wash. No cash value.", contact: "Open 8am to 6pm · sparklewash.example", backNote: "Drive clean, drive happy.", address: "900 Route 9", hours: "Every day 8am to 6pm", social: "@sparklecarwash", qrUrl: "https://sparklewash.example", qrLabel: "Wash times" },
    bakery: { label: "Bakery", business: "Sweet Crumb Bakery", reward: "Buy 9 treats, get the 10th free", punches: 10, mark: "cupcake", color: "#c2410c", font: "classic", terms: "One stamp per treat. Free treat up to $5. No cash value.", contact: "Order at sweetcrumb.example · (555) 010-0125", backNote: "Baked fresh every morning.", address: "7 Baker Lane", hours: "Wed to Sun 7am to 2pm", social: "@sweetcrumbbakes", qrUrl: "https://sweetcrumb.example/order", qrLabel: "Order a cake" },
    grooming: { label: "Dog grooming", business: "Happy Paws Grooming", reward: "Buy 5 grooms, get $15 off the 6th", punches: 6, rows: "1", mark: "paw", rewardStyle: "gift", color: "#0f766e", font: "modern", terms: "One stamp per full groom. Discount applies to the 6th groom. No cash value.", contact: "(555) 010-0188 · happypaws.example", backNote: "Fresh, fluffy and happy.", address: "31 Willow Road", hours: "Mon to Sat 8am to 5pm", social: "@happypawsgrooming", qrUrl: "https://happypaws.example/book", qrLabel: "Book a groom" },
    classroom: { label: "Classroom behavior", business: "Star Student Card", reward: "10 punches = choose a prize", punches: 10, mark: "star", color: "#1d4ed8", font: "modern", terms: "Earn a punch for kindness, effort and being ready to learn.", contact: "Ms. Rivera · Room 12", backNote: "Great choices add up!", address: "", hours: "", social: "", qrUrl: "", qrLabel: "Scan me" },
    kids: { label: "Reading & chores", business: "My Reading Rewards", reward: "Read 9 nights, pick a reward", punches: 10, mark: "book", color: "#7c3aed", font: "modern", terms: "A grown-up punches the card after each finished night or chore.", contact: "", backNote: "Keep reading, keep growing!", address: "", hours: "", social: "", qrUrl: "", qrLabel: "Scan me" },
  };
  const PRESET_KEYS = ["business", "reward", "punches", "rows", "mark", "rewardSpot", "rewardStyle", "terms", "contact", "color", "font", "bg", "backNote", "address", "hours", "social", "qrUrl", "qrLabel"];
  const isPreset = name => typeof name === "string" && Object.prototype.hasOwnProperty.call(PRESETS, name);
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
  const MAXLEN = { business: 40, reward: 56, terms: 110, contact: 64, backNote: 60, address: 100, hours: 90, social: 40, qrUrl: 150, qrLabel: 28 };
  const STRINGS = [...Object.keys(MAXLEN)];
  // Adds https:// when someone types "example.com/menu" so phones open it as a link.
  function cleanUrl(str) {
    const t = String(str || "").replace(/\s+/g, "");
    if (!t) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
    return /^[^/.]+\.[^/]+/.test(t) || /^[^/]+\.[a-z]{2,}$/i.test(t) ? "https://" + t : "";
  }
  // Validates and cleans a settings object. Returns { s, errors, lost } where lost lists unprintable characters.
  function normalize(input) {
    const s = Object.assign({}, DEFAULTS, input && typeof input === "object" ? input : {});
    const errors = [], lost = new Set();
    for (const k of STRINGS) {
      const v = s[k];
      const c = clean(typeof v === "string" || typeof v === "number" ? [...String(v)].slice(0, MAXLEN[k]).join("") : "");
      s[k] = c.text; c.lost.forEach(x => lost.add(x));
    }
    s.qrUrl = cleanUrl(s.qrUrl);
    const pc = clean(typeof s.prefix === "string" || typeof s.prefix === "number" ? [...String(s.prefix)].slice(0, 12).join("") : "", true);
    s.prefix = pc.text.replace(/^ +/, ""); pc.lost.forEach(x => lost.add(x));
    if (!isPreset(s.preset)) s.preset = "general";
    s.start = toInt(s.start, NaN);
    s.qty = toInt(s.qty, NaN);
    if (s.serials) {
      if (!Number.isFinite(s.start) || s.start < 0) errors.push("Start number must be a whole number of 0 or more.");
      else if (s.start > 9999999) errors.push("Start number must be 9,999,999 or less.");
    } else if (!Number.isFinite(s.start) || s.start < 0 || s.start > 9999999) s.start = 1;
    if (!Number.isFinite(s.qty) || s.qty < 1) errors.push("Number of cards must be a whole number from 1 to 500.");
    else if (s.qty > MAX_CARDS) errors.push(`One PDF holds up to ${MAX_CARDS} cards. Make ${MAX_CARDS} now, then a second batch${s.serials && Number.isFinite(s.start) ? " starting at " + (s.start + MAX_CARDS) : ""}.`);
    s.cards = errors.length ? 0 : s.qty;
    s.end = errors.length ? s.start : s.start + s.qty - 1;
    s.punches = clampInt(toInt(s.punches, 10), 5, 12);
    s.rows = String(s.rows) === "1" ? "1" : "2";
    if (!["none", "2", "3", "4", "5", "6"].includes(String(s.pad))) s.pad = "4";
    s.pad = String(s.pad);
    if (!LAYOUTS[s.layout]) s.layout = "letter-10";
    if (!FONTS[s.font]) s.font = "modern";
    if (!MARKS[s.mark]) s.mark = "circle";
    if (s.bg !== "dark") s.bg = "light";
    if (s.rewardStyle !== "gift") s.rewardStyle = "free";
    if (s.order !== "separate") s.order = "interleaved";
    if (!/^#[0-9a-f]{6}$/i.test(String(s.color || ""))) s.color = DEFAULTS.color;
    for (const k of ["dx", "dy"]) { const n = Number(s[k]); s[k] = Number.isFinite(n) ? Math.round(clamp(n, -MAX_NUDGE, MAX_NUDGE) * 10) / 10 : 0; }
    for (const k of ["rewardSpot", "nameLine", "border", "serials", "initials", "outline", "back"]) s[k] = !!s[k];
    return { s, errors, lost: [...lost] };
  }
  function clampInt(v, a, b) { return Math.min(b, Math.max(a, Math.round(v))); }

  /* ------------------------------------------------------------ numbering */
  const padWidth = s => (s.pad === "none" ? 0 : Number(s.pad) || 0);
  const fmtNum = (n, s) => s.prefix + String(n).padStart(padWidth(s), "0");
  const perPage = layout => LAYOUTS[layout].cols * LAYOUTS[layout].rows;
  const sheetCount = s => Math.ceil(s.cards / perPage(s.layout));

  /* ------------------------------------------------------------ geometry */
  // Card positions on a page. + dx moves right, + dy moves down (mm), like a printer's offset setting.
  function sheetGeometry(layout, dxMm, dyMm) {
    const L = LAYOUTS[layout] || LAYOUTS["letter-10"], P = PAPER[L.paper];
    const gap = L.plain ? GAP : 0;
    const gw = L.cols * L.cw + (L.cols - 1) * gap, gh = L.rows * L.ch + (L.rows - 1) * gap;
    const dx = mm(clamp(Number(dxMm) || 0, -MAX_NUDGE, MAX_NUDGE)), dy = -mm(clamp(Number(dyMm) || 0, -MAX_NUDGE, MAX_NUDGE));
    const x0 = (P.w - gw) / 2 + dx, top = P.h - (P.h - gh) / 2 + dy;
    const cells = [];
    for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) cells.push({ pos: r * L.cols + c, r, c, x: x0 + c * (L.cw + gap), y: top - (r + 1) * L.ch - r * gap, w: L.cw, h: L.ch });
    return { layout, plain: L.plain, pageW: P.w, pageH: P.h, paperName: P.name, cols: L.cols, rows: L.rows, perPage: L.cols * L.rows, cardW: L.cw, cardH: L.ch, gap, gx: x0, gy: top - gh, gw, gh, cells };
  }
  // Duplex printing with "flip on long edge" mirrors the page left to right: the back of the card at
  // column c sits at column cols-1-c on the back page.
  const backCell = (g, pos) => { const r = Math.floor(pos / g.cols), c = pos % g.cols; return g.cells[r * g.cols + (g.cols - 1 - c)]; };
  // The cards on one sheet: position and index into the run (row by row, left to right).
  function sheetItems(s, sheet) {
    const per = perPage(s.layout), out = [];
    for (let pos = 0; pos < per; pos++) {
      const idx = sheet * per + pos;
      if (idx >= s.cards) break;
      out.push({ pos, idx, serial: s.serials ? fmtNum(s.start + idx, s) : "" });
    }
    return out;
  }
  // Order of pages in the PDF: fronts only, fronts then backs, or interleaved front/back for duplex.
  function pageList(s) {
    const n = sheetCount(s), out = [];
    if (!s.back) { for (let i = 0; i < n; i++) out.push({ side: "front", sheet: i }); return out; }
    if (s.order === "interleaved") { for (let i = 0; i < n; i++) out.push({ side: "front", sheet: i }, { side: "back", sheet: i }); return out; }
    for (let i = 0; i < n; i++) out.push({ side: "front", sheet: i });
    for (let i = 0; i < n; i++) out.push({ side: "back", sheet: i });
    return out;
  }

  /* ---------------------------------------------------------- primitives */
  const rect = (x, y, w, h, o) => Object.assign({ t: "rect", x, y, w, h }, o);
  const line = (x1, y1, x2, y2, o) => Object.assign({ t: "line", x1, y1, x2, y2, w: 0.6, color: INK }, o);
  const text = (str, x, y, size, font, color, align) => ({ t: "text", text: str, x, y, size, font, color, align: align || "left" });
  const circle = (cx, cy, r, o) => Object.assign({ t: "circle", cx, cy, r }, o);
  // SVG path data drawn with its top-left corner at (x, y) in page coordinates; `scale` maps path units to points.
  const pathP = (d, x, y, scale, o) => Object.assign({ t: "path", d, x, y, scale }, o);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const DARK = [0.09, 0.09, 0.1];
  function colors(s) {
    const dark = s.bg === "dark", a0 = hexRgb(s.color);
    const accent = dark ? (lum(a0) < 0.5 ? mix(a0, WHITE, Math.min(0.7, (0.5 - lum(a0)) * 1.6)) : a0) : readable(a0);
    const bg = dark ? DARK : WHITE;
    return { dark, accent, bg, ink: dark ? [0.96, 0.96, 0.94] : INK, sub: dark ? [0.72, 0.72, 0.74] : GRAY, faint: mix(accent, bg, 0.5), on: lum(accent) > 0.55 ? INK : WHITE };
  }
  const lineBase = (H, topY, size) => H - topY - size * 0.78; // baseline for text whose line box starts topY below the card top

  // Wrap to at most maxLines, shrinking the size a little before cutting.
  function fitWrap(str, font, sizes, maxW, maxLines) {
    let r = null, size = sizes[0];
    for (const sz of sizes) { size = sz; r = wrap(str, font, sz, maxW, maxLines); if (!r.cut) break; }
    return { lines: r.lines, size, cut: r.cut };
  }

  /* ------------------------------------------------------------ card front */
  // Lays out one card front in a W x H box. opt: { logo: {aspect}, digital: true for the shareable PNG (no serial number) }.
  // Returns { prims, serial, grid, cut, notes }; `serial` says where each card's number goes.
  function layoutFront(s, Wd, Ht, opt = {}) {
    const K = colors(s), F = FONTS[s.font], pad = 9, iw = Wd - 2 * pad;
    const P = [], cut = [], notes = [];
    if (K.dark) P.push(rect(0, 0, Wd, Ht, { fill: K.bg, bleed: true }));
    if (s.border) P.push(pathP(rrect(Wd - 7, Ht - 7, 5), 3.5, Ht - 3.5, 1, { stroke: K.accent, sw: 0.9 }));

    // header: logo, business name, serial number
    const hh = 20;
    let nameX = pad, nameMax = iw, serial = null;
    if (s.serials && !opt.digital) {
      const sw = textW(fmtNum(s.end, s), F.r, 6.5);
      serial = { x: Wd - pad, y: Ht - pad - hh / 2 - 0.36 * 13, size: 6.5, font: F.r, color: K.sub, align: "right", maxW: sw + 1 };
      nameMax -= sw + 8;
    }
    if (opt.logo) {
      let lh = hh, lw = lh * opt.logo.aspect;
      if (lw > 56) { lw = 56; lh = lw / opt.logo.aspect; }
      P.push({ t: "img", x: pad, y: Ht - pad - (hh + lh) / 2, w: lw, h: lh });
      nameX = pad + lw + 6; nameMax -= lw + 6;
    }
    if (s.business) {
      const f = fitLine(s.business, F.b, 13, 7.5, Math.max(20, nameMax));
      if (f.cut) cut.push("business name");
      P.push(text(f.text, nameX, Ht - pad - hh / 2 - 0.36 * f.size, f.size, F.b, K.ink));
    }
    let rewardBottom = pad + hh;
    if (s.reward) {
      const f = fitLine(s.reward, F.b, 8.5, 6, iw);
      if (f.cut) cut.push("reward line");
      P.push(text(f.text, pad, lineBase(Ht, pad + hh + 2, f.size), f.size, F.b, K.accent));
      rewardBottom = pad + hh + 2 + 10;
    }

    // footer, built from the bottom up
    let by = 8;
    if (s.nameLine || s.contact) {
      const base = by + 1;
      if (s.nameLine) {
        P.push(text("Name", pad, base, 6.5, F.r, K.sub));
        const lx = pad + textW("Name", F.r, 6.5) + 3, ex = s.contact ? pad + iw * 0.5 - 4 : Wd - pad;
        P.push(line(lx, base - 0.5, ex, base - 0.5, { w: 0.5, color: K.sub }));
      }
      if (s.contact) {
        const x0 = s.nameLine ? pad + iw * 0.52 : pad;
        const f = fitLine(s.contact, F.r, 6.5, 5, Wd - pad - x0);
        if (f.cut) cut.push("contact line");
        P.push(text(f.text, s.nameLine ? Wd - pad : Wd / 2, base, f.size, F.r, K.sub, s.nameLine ? "right" : "center"));
      }
      by += 13;
    }
    if (s.terms) {
      const f = fitWrap(s.terms, F.r, [6, 5.6, 5.2], iw, 2);
      if (f.cut) cut.push("terms line");
      f.lines.forEach((ln, i) => P.push(text(ln, pad, by + 1.5 + (f.lines.length - 1 - i) * 7, f.size, F.r, K.sub)));
      by += f.lines.length * 7 + 3;
    }

    // punch grid in the space between the reward line and the footer
    const n = s.punches, g = 5, boxW = 30;
    const aw = iw - (s.initials ? boxW + 8 : 0);
    const gTop = Ht - (rewardBottom + 5), avail = gTop - (by + 3);
    let R = s.rows === "1" ? 1 : 2;
    if (R === 1 && (aw - (n - 1) * g) / n < 15) { R = 2; notes.push("Using 2 rows so the punch marks stay big enough to stamp."); }
    const cs = R === 1 ? [n] : [Math.floor(n / 2), Math.ceil(n / 2)];
    const maxC = Math.max(...cs);
    const d = Math.max(8, Math.min((aw - (maxC - 1) * g) / maxC, (avail - (R - 1) * g) / R, 30));
    const blockH = R * d + (R - 1) * g, top0 = gTop - (avail - blockH) / 2;
    const grid = { d, rows: R, circles: [], boxes: [], top: gTop, bottom: by + 3, left: pad, right: Wd - pad };
    let i = 0;
    for (let r = 0; r < R; r++) {
      const cy = top0 - r * (d + g) - d / 2, rw = cs[r] * d + (cs[r] - 1) * g, x0 = pad + (aw - rw) / 2;
      for (let j = 0; j < cs[r]; j++, i++) {
        const cx = x0 + j * (d + g) + d / 2, rad = d / 2;
        grid.circles.push({ cx, cy, r: rad });
        const reward = s.rewardSpot && i === n - 1;
        if (reward) {
          P.push(circle(cx, cy, rad, { fill: K.accent }));
          if (s.rewardStyle === "gift") { const k = (d * 0.62) / 24; P.push(pathP(ICONS.gift, cx - 12 * k, cy + 12 * k, k, { stroke: K.on, sw: 1.8 })); }
          else { const sz = Math.min(d * 0.3, 9); P.push(text("FREE", cx, cy - 0.36 * sz, sz, F.b, K.on, "center")); }
        } else if (s.mark === "circle") {
          P.push(circle(cx, cy, rad, { stroke: K.accent, sw: 1 }));
        } else {
          P.push(circle(cx, cy, rad, { stroke: K.faint, sw: 0.9 }));
          const k = (d * 0.56) / 24;
          P.push(pathP(ICONS[s.mark], cx - 12 * k, cy + 12 * k, k, { stroke: K.accent, sw: 1.6 }));
        }
      }
      if (s.initials) {
        const bh = Math.min(17, d), bx = Wd - pad - boxW, by0 = cy - bh / 2;
        grid.boxes.push({ x: bx, y: by0, w: boxW, h: bh });
        P.push(rect(bx, by0, boxW, bh, { stroke: K.faint, sw: 0.7 }));
        P.push(text("Initials", bx + 2.5, by0 + bh - 6, 4.8, F.r, K.faint));
      }
    }
    return { prims: P, serial, grid, cut, notes };
  }

  /* ------------------------------------------------------------- card back */
  // qrData(qr) turns a qrcode-generator object into { n, d } (module count and one path of dark modules).
  function qrData(qr) {
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < n) {
        if (!qr.isDark(r, c)) { c++; continue; }
        let e = c;
        while (e < n && qr.isDark(r, e)) e++;
        d += `M${c} ${r}H${e}V${r + 1}H${c}Z`;
        c = e;
      }
    }
    return { n, d };
  }
  function layoutBack(s, Wd, Ht, opt = {}) {
    const K = colors(s), F = FONTS[s.font], pad = 9, iw = Wd - 2 * pad;
    const P = [], cut = [];
    if (K.dark) P.push(rect(0, 0, Wd, Ht, { fill: K.bg, bleed: true }));
    if (s.border) P.push(pathP(rrect(Wd - 7, Ht - 7, 5), 3.5, Ht - 3.5, 1, { stroke: K.accent, sw: 0.9 }));
    const qr = s.qrUrl && opt.qr ? opt.qr : null;
    let tw = iw, tile = null;
    if (qr) {
      const q = 4, capH = s.qrLabel ? 10 : 0, size = Math.min(62, Ht - 2 * pad - capH - 2 * q - 4), T = size + 2 * q;
      const topY = (Ht + T + capH) / 2, x = Wd - pad - T;
      tile = { x, y: topY - T, w: T, h: T, size, q };
      P.push(rect(x, topY - T, T, T, { fill: WHITE }));
      P.push(pathP(qr.d, x + q, topY - q, size / qr.n, { fill: INK }));
      if (s.qrLabel) {
        const f = fitLine(s.qrLabel, F.b, 6.5, 5, T + 6);
        P.push(text(f.text, x + T / 2, topY - T - 8, f.size, F.b, K.accent, "center"));
      }
      tw = iw - T - 10;
    }
    // text column: stacked from a start offset; a dry run measures it so it can be centred next to the QR code
    const stack = oy => {
      const out = [], cuts = [];
      let y = oy;
      if (s.business) {
        const f = fitLine(s.business, F.b, 12.5, 7.5, tw);
        if (f.cut) cuts.push("business name");
        out.push(text(f.text, pad, lineBase(Ht, y, f.size), f.size, F.b, K.ink));
        y += 17;
      }
      if (s.backNote) {
        const f = fitWrap(s.backNote, F.b, [8.5, 8, 7.5], tw, 2);
        if (f.cut) cuts.push("back message");
        f.lines.forEach((ln, i) => out.push(text(ln, pad, lineBase(Ht, y + i * 10.5, f.size), f.size, F.b, K.accent)));
        y += f.lines.length * 10.5 + 2;
      }
      out.push(rect(pad, Ht - y - 1.4, 22, 1.4, { fill: K.accent }));
      y += 8;
      for (const [key, label] of [["address", "address"], ["hours", "opening hours"]]) {
        if (!s[key]) continue;
        const f = fitWrap(s[key], F.r, [7, 6.6, 6.2], tw, 2);
        if (f.cut) cuts.push(label);
        f.lines.forEach((ln, i) => out.push(text(ln, pad, lineBase(Ht, y + i * 8.8, f.size), f.size, F.r, K.ink)));
        y += f.lines.length * 8.8 + 4;
      }
      if (s.social) {
        const f = fitLine(s.social, F.b, 7.5, 5.5, tw);
        if (f.cut) cuts.push("social handle");
        out.push(text(f.text, pad, lineBase(Ht, y, f.size), f.size, F.b, K.accent));
        y += 9;
      }
      return { out, cuts, h: y - oy };
    };
    const probe = stack(0);
    const run = stack(Math.max(pad, (Ht - probe.h) / 2 - 2));
    P.push(...run.out);
    cut.push(...run.cuts);
    return { prims: P, tile, cut };
  }

  /* ------------------------------------------------------------ page chrome */
  // Everything on a page except the cards: labels in the top margin, crop marks, light outlines and the credit line.
  const CREDIT_SIZE = 6, CREDIT_Y = 17;
  function creditRect(g) {
    const w = textW(CREDIT, "H", CREDIT_SIZE), cx = g.pageW / 2;
    return { x0: cx - w / 2 - 2, x1: cx + w / 2 + 2, y0: CREDIT_Y - 0.22 * CREDIT_SIZE - 1, y1: CREDIT_Y + 0.75 * CREDIT_SIZE + 0.5 };
  }
  function chromePrims(s, g, side, sheet, sheets, o = {}) {
    const P = [];
    if (g.plain) {
      const off = 4, len = 10, top = g.gy + g.gh, right = g.gx + g.gw;
      const xs = new Set(), ys = new Set();
      g.cells.forEach(c => { xs.add(c.x); xs.add(c.x + c.w); ys.add(c.y); ys.add(c.y + c.h); });
      for (const x of xs) { P.push(line(x, top + off, x, top + off + len, { w: 0.5 })); P.push(line(x, g.gy - off, x, g.gy - off - len, { w: 0.5 })); }
      for (const y of ys) { P.push(line(g.gx - off, y, g.gx - off - len, y, { w: 0.5 })); P.push(line(right + off, y, right + off + len, y, { w: 0.5 })); }
    }
    if (s.outline || o.outlines) {
      const items = o.outlines ? g.cells : sheetItems(s, sheet).map(it => (side === "back" ? backCell(g, it.pos) : g.cells[it.pos]));
      for (const c of items) P.push(rect(c.x, c.y, c.w, c.h, { stroke: o.outlines ? INK : CUT, sw: o.outlines ? 0.6 : 0.4 }));
    }
    const what = o.title || (side === "back" ? "Back" : "Front");
    P.push(text(`${what} · sheet ${sheet + 1} of ${sheets}${side === "back" ? " · flip on long edge" : ""}`, 36, g.pageH - 20, 6.5, "H", GRAY));
    P.push(text("Print at 100% (Actual size)", g.pageW - 36, g.pageH - 20, 6.5, "H", GRAY, "right"));
    const cr = creditRect(g);
    P.push(text(CREDIT, g.pageW / 2, CREDIT_Y, CREDIT_SIZE, "H", GRAY, "center"));
    P.push({ t: "link", x: cr.x0, y: cr.y0, w: cr.x1 - cr.x0, h: cr.y1 - cr.y0, url: CREDIT_URL });
    return P;
  }
  const BLEED = 3;
  // On plain paper, dark card backgrounds run 3 pt into the gap so a hand cut leaves no white edge.
  const withBleed = (prims, on) => (on ? prims.map(p => (p.bleed ? Object.assign({}, p, { x: p.x - BLEED, y: p.y - BLEED, w: p.w + 2 * BLEED, h: p.h + 2 * BLEED }) : p)) : prims);
  const serialPrim = (lay, str) => (lay.serial && str ? [text(str, lay.serial.x, lay.serial.y, lay.serial.size, lay.serial.font, lay.serial.color, "right")] : []);

  /* --------------------------------------------------------------- SVG preview */
  // Same primitives as the PDF, drawn as SVG for the on-page preview and the PNG export.
  const FAM = { H: "Helvetica,Arial,'Liberation Sans',sans-serif", T: "'Times New Roman',Times,'Liberation Serif',serif", C: "'Courier New',Courier,'Liberation Mono',monospace" };
  const xmlEsc = v => String(v).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const col = a => "rgb(" + a.map(v => Math.round(v * 255)).join(",") + ")";
  const r2 = v => Math.round(v * 100) / 100;
  function svgText(str, x, y, size, font, color, align, H) {
    const w = textW(str, font, size);
    const lx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    return `<text x="${r2(lx)}" y="${r2(H - y)}" font-size="${r2(size)}" font-family="${FAM[font[0]]}"${font.length > 1 ? ' font-weight="700"' : ""} fill="${col(color)}" textLength="${r2(w)}" lengthAdjust="spacingAndGlyphs">${xmlEsc(str)}</text>`;
  }
  const strokeAttrs = p => (p.stroke ? ` stroke="${col(p.stroke)}" stroke-width="${p.sw || 0.5}"` : "");
  function svgPrims(prims, H, dx, dy, logoHref) {
    let out = "";
    for (const p of prims) {
      if (p.t === "rect") out += `<rect x="${r2(dx + p.x)}" y="${r2(H - (dy + p.y + p.h))}" width="${r2(p.w)}" height="${r2(p.h)}" fill="${p.fill ? col(p.fill) : "none"}"${strokeAttrs(p)}/>`;
      else if (p.t === "circle") out += `<circle cx="${r2(dx + p.cx)}" cy="${r2(H - (dy + p.cy))}" r="${r2(p.r)}" fill="${p.fill ? col(p.fill) : "none"}"${strokeAttrs(p)}/>`;
      else if (p.t === "line") out += `<line x1="${r2(dx + p.x1)}" y1="${r2(H - dy - p.y1)}" x2="${r2(dx + p.x2)}" y2="${r2(H - dy - p.y2)}" stroke="${col(p.color)}" stroke-width="${p.w}"/>`;
      else if (p.t === "path") out += `<path d="${p.d}" transform="translate(${r2(dx + p.x)} ${r2(H - (dy + p.y))}) scale(${r2(p.scale * 1000) / 1000})" fill="${p.fill ? col(p.fill) : "none"}"${strokeAttrs(p)} stroke-linecap="round" stroke-linejoin="round"/>`;
      else if (p.t === "text" && p.text) out += svgText(p.text, dx + p.x, dy + p.y, p.size, p.font, p.color, p.align, H);
      else if (p.t === "img" && logoHref) out += `<image href="${xmlEsc(logoHref)}" x="${r2(dx + p.x)}" y="${r2(H - (dy + p.y + p.h))}" width="${r2(p.w)}" height="${r2(p.h)}" preserveAspectRatio="none"/>`;
    }
    return out;
  }
  const svgOpen = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(w)} ${r2(h)}" width="${r2(w)}" height="${r2(h)}" style="font-kerning:none"><rect width="100%" height="100%" fill="#fff"/>`;
  // One card (front or back) as a standalone SVG.
  function svgCard(s, lay, Wd, Ht, serialStr, logoHref) {
    return svgOpen(Wd, Ht) + svgPrims(lay.prims.concat(serialPrim(lay, serialStr)), Ht, 0, 0, logoHref) + "</svg>";
  }
  // A whole page as SVG, exactly as it will print.
  function svgSheet(s, g, lay, sheet, side, logoHref) {
    const sheets = sheetCount(s);
    let out = svgOpen(g.pageW, g.pageH).replace(' width="' + r2(g.pageW) + '" height="' + r2(g.pageH) + '"', "");
    out += svgPrims(chromePrims(s, g, side, sheet, sheets), g.pageH, 0, 0);
    for (const it of sheetItems(s, sheet)) {
      const c = side === "back" ? backCell(g, it.pos) : g.cells[it.pos];
      const prims = withBleed(lay.prims, g.plain).concat(side === "front" ? serialPrim(lay, it.serial) : []);
      out += svgPrims(prims, g.pageH, c.x, c.y, logoHref);
    }
    return out + "</svg>";
  }

  /* --------------------------------------------------------------- PDF */
  const FONT_NAMES = { H: "Helvetica", HB: "Helvetica-Bold", T: "Times-Roman", TB: "Times-Bold", C: "Courier", CB: "Courier-Bold" };
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
      } else if (p.t === "circle") {
        const o = { x: dx + p.cx, y: dy + p.cy, size: p.r };
        if (p.fill) o.color = c(p.fill);
        if (p.stroke) { o.borderColor = c(p.stroke); o.borderWidth = p.sw || 0.5; }
        page.drawCircle(o);
      } else if (p.t === "line") {
        page.drawLine({ start: { x: dx + p.x1, y: dy + p.y1 }, end: { x: dx + p.x2, y: dy + p.y2 }, thickness: p.w, color: c(p.color) });
      } else if (p.t === "path") {
        const o = { x: dx + p.x, y: dy + p.y, scale: p.scale };
        if (p.fill) o.color = c(p.fill);
        if (p.stroke) { o.borderColor = c(p.stroke); o.borderWidth = p.sw || 0.5; o.borderLineCap = L.LineCapStyle.Round; o.borderLineJoin = L.LineJoinStyle.Round; }
        page.drawSvgPath(p.d, o);
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
  function drawChrome(L, doc, page, prims, fonts) {
    drawPrims(L, page, prims.filter(p => p.t !== "link"), fonts, 0, 0);
    prims.filter(p => p.t === "link").forEach(p => addLink(L, doc, page, p));
  }
  function qrFor(s, opts) { return s.back && s.qrUrl && opts.qr ? opts.qr : null; }
  function fontKeys(...lays) {
    const used = new Set(["H"]);
    for (const l of lays) if (l) for (const p of l.prims) if (p.font) used.add(p.font);
    return [...used];
  }

  /* Builds the card PDF. opts: { logo: {bytes, aspect}, qr: {n, d}, onProgress } */
  async function buildPdf(L, input, opts = {}) {
    const { s, errors } = normalize(input);
    if (errors.length) throw new Error(errors[0]);
    const g = sheetGeometry(s.layout, s.dx, s.dy);
    const front = layoutFront(s, g.cardW, g.cardH, { logo: opts.logo ? { aspect: opts.logo.aspect } : null });
    const back = s.back ? layoutBack(s, g.cardW, g.cardH, { qr: qrFor(s, opts) }) : null;
    const doc = await L.PDFDocument.create();
    doc.setTitle(s.serials ? `Punch cards ${fmtNum(s.start, s)} to ${fmtNum(s.end, s)}` : "Punch cards");
    doc.setSubject(s.business ? `${s.business} punch cards` : "Punch cards");
    doc.setCreator("PunchPerk (punchcard.roohsites.com)");
    doc.setProducer("PunchPerk with pdf-lib");
    doc.setKeywords(["punch card", "loyalty card", "PunchPerk"]);
    const fonts = await embedFonts(L, doc, fontKeys(front, back));
    const img = opts.logo ? await doc.embedPng(opts.logo.bytes) : null;
    const sheets = sheetCount(s), pages = pageList(s);
    for (let pi = 0; pi < pages.length; pi++) {
      const { side, sheet } = pages[pi];
      const page = doc.addPage([g.pageW, g.pageH]);
      drawChrome(L, doc, page, chromePrims(s, g, side, sheet, sheets), fonts);
      for (const it of sheetItems(s, sheet)) {
        if (side === "back") { const c = backCell(g, it.pos); drawPrims(L, page, withBleed(back.prims, g.plain), fonts, c.x, c.y); }
        else { const c = g.cells[it.pos]; drawPrims(L, page, withBleed(front.prims, g.plain).concat(serialPrim(front, it.serial)), fonts, c.x, c.y, img); }
      }
      if (opts.onProgress && (pi % 10 === 9 || pi === pages.length - 1)) { opts.onProgress((pi + 1) / pages.length, pi + 1, pages.length); await tick(); }
    }
    return { bytes: await doc.save(), pages: pages.length, sheets, cards: s.cards, cut: front.cut.concat(back ? back.cut : []) };
  }

  /* Alignment test: card outlines only, one page for the front and one for the back. */
  async function buildAlignmentPdf(L, input) {
    const { s } = normalize(input);
    const g = sheetGeometry(s.layout, s.dx, s.dy);
    const doc = await L.PDFDocument.create();
    doc.setTitle("PunchPerk alignment test");
    doc.setCreator("PunchPerk (punchcard.roohsites.com)");
    doc.setProducer("PunchPerk with pdf-lib");
    const fonts = await embedFonts(L, doc, ["H"]);
    const sides = s.back ? ["front", "back"] : ["front"];
    sides.forEach((side, i) => {
      const page = doc.addPage([g.pageW, g.pageH]);
      const prims = chromePrims(s, g, side, 0, 1, { outlines: true, title: "Alignment test" });
      drawChrome(L, doc, page, prims, fonts);
    });
    return { bytes: await doc.save(), pages: sides.length };
  }

  return {
    clean, textW, fitLine, wrap, hexRgb, readable, mix,
    MAX_CARDS, MAX_NUDGE, GAP, PAPER, LAYOUTS, FONTS, MARKS, PALETTES, ICONS, DEFAULTS, PRESETS, PRESET_KEYS, presetValues, presetState, isPreset, normalize, toInt,
    padWidth, fmtNum, perPage, sheetCount, sheetGeometry, backCell, sheetItems, pageList,
    layoutFront, layoutBack, qrData, chromePrims, creditRect, withBleed, serialPrim, svgCard, svgSheet, buildPdf, buildAlignmentPdf,
    CREDIT, CREDIT_URL, SITE, mm,
  };
});
