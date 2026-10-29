/* PriceBoard core: settings, presets, page layout, SVG preview and PDF building for price lists and service menus.
   No DOM access, so the same file runs on the page and in Node tests.
   All coordinates are PDF points (1/72 inch) with the origin at the bottom-left. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PBCore = api;
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
  const SITE = "https://pricelist.roohsites.com";
  const CREDIT_URL = SITE + "/?utm_source=priceboard&utm_medium=watermark&utm_campaign=referral";
  const CREDIT = "Made with PriceBoard · pricelist.roohsites.com";
  const mm = v => (v * 72) / 25.4;
  // Sizes in points, portrait. Print sizes can turn landscape; the image sizes export at `px` pixels wide.
  const FORMATS = {
    letter: { w: 612, h: 792, label: "US Letter (8.5 × 11 in)", print: true },
    a4: { w: 595.28, h: 841.89, label: "A4 (210 × 297 mm)", print: true },
    tabloid: { w: 792, h: 1224, label: "Tabloid poster (11 × 17 in)", print: true },
    a3: { w: mm(297), h: mm(420), label: "A3 poster (297 × 420 mm)", print: true },
    halfletter: { w: 396, h: 612, label: "Half Letter (5.5 × 8.5 in)", print: true, sheet: "letter" },
    a5: { w: mm(148), h: mm(210), label: "A5 (148 × 210 mm)", print: true, sheet: "a4" },
    "5x7": { w: 360, h: 504, label: "5 × 7 in (frame or sign holder)", print: true, sheet: "letter" },
    square: { w: 540, h: 540, label: "Instagram post (1080 × 1080 px)", px: 1080 },
    story: { w: 540, h: 960, label: "Story or phone screen (1080 × 1920 px)", px: 1080 },
    tv: { w: 960, h: 540, label: "TV screen (1920 × 1080 px)", px: 1920 },
  };
  const FONTS = {
    classic: { h: "TB", b: "T", p: "TB", label: "Classic (Times)" },
    modern: { h: "HB", b: "H", p: "HB", label: "Modern (Helvetica)" },
    mixed: { h: "TB", b: "H", p: "HB", label: "Mixed (Times headings, Helvetica text)" },
  };
  const THEMES = { clean: "Clean white with a thin frame", band: "Colour band at the top", soft: "Soft tinted panel", dark: "Dark (for screens and TVs)" };
  const CURRENCIES = { "$": "$ (dollar)", "£": "£ (pound)", "€": "€ (euro)", "": "None" };
  const PALETTES = [
    { name: "Rose", color: "#9d174d", theme: "clean" },
    { name: "Sage", color: "#4d6b53", theme: "soft" },
    { name: "Lavender", color: "#6d4c9f", theme: "soft" },
    { name: "Barber red", color: "#b91c1c", theme: "band" },
    { name: "Navy", color: "#1e3a5f", theme: "band" },
    { name: "Black and gold", color: "#d4a64a", theme: "dark" },
  ];
  const MAX_SECTIONS = 12, MAX_ITEMS = 30, MAX_TOTAL = 150;
  const MAXLEN = { business: 50, tagline: 80, fine: 260, contact: 110, qrUrl: 200, qrLabel: 30 };
  const ITEMLEN = { name: 70, price: 24, note: 120 }, TITLELEN = 40;

  /* ------------------------------------------------------------ presets */
  // Sample menus. Business names, prices, phone numbers and .example domains are placeholders to show the layout.
  const it = (name, price, note) => ({ name, price, note: note || "" });
  const PRESETS = {
    hair: {
      label: "Hair salon", business: "Willow Street Hair Studio", tagline: "Cuts · Color · Treatments", color: "#9d174d", theme: "clean", font: "classic",
      sections: [
        { title: "Cuts & styling", items: [it("Women's cut & style", "65+"), it("Men's cut", "40+"), it("Kids' cut (12 and under)", "30"), it("Blow-dry & style", "45+"), it("Updo or event styling", "85+")] },
        { title: "Color", items: [it("Root touch-up", "85+"), it("All-over color", "110+"), it("Partial highlights", "130+"), it("Full highlights", "170+"), it("Balayage", "195+", "Includes toner and blow-dry"), it("Toner or gloss", "45")] },
        { title: "Treatments", items: [it("Deep conditioning", "25"), it("Keratin smoothing", "250+", "Lasts up to 4 months"), it("Scalp treatment", "35")] },
      ],
      fine: "Prices are starting prices and can change with hair length, thickness and time needed. Please give 24 hours' notice to cancel or reschedule.",
      contact: "(555) 010-0142 · 42 Elm Street · willowstreet.example", qrUrl: "https://willowstreet.example/book", qrLabel: "Book online",
    },
    barber: {
      label: "Barbershop", business: "Main Street Barber Co.", tagline: "Walk-ins welcome", color: "#b91c1c", theme: "band", font: "modern",
      sections: [
        { title: "Haircuts", items: [it("Classic cut", "30"), it("Skin fade", "35"), it("Buzz cut", "22"), it("Kids' cut (12 and under)", "22"), it("Senior cut (65+)", "22")] },
        { title: "Beard & shave", items: [it("Beard trim & line-up", "18"), it("Hot towel shave", "35"), it("Cut & beard combo", "48")] },
        { title: "Extras", items: [it("Eyebrow clean-up", "10"), it("Hair design", "10+"), it("Black mask facial", "20")] },
      ],
      fine: "Cash and cards accepted. Please arrive 5 minutes early for appointments.",
      contact: "(555) 010-0177 · 300 Main Street · mainstreetbarber.example", qrUrl: "https://mainstreetbarber.example/book", qrLabel: "Book a chair",
    },
    nails: {
      label: "Nail salon", business: "Polished Nail Studio", tagline: "Manicures · Pedicures · Nail art", color: "#be185d", theme: "soft", font: "mixed",
      sections: [
        { title: "Manicures", items: [it("Classic manicure", "25"), it("Gel manicure", "40"), it("Gel removal", "10", "Free with a new gel set")] },
        { title: "Pedicures", items: [it("Classic pedicure", "40"), it("Spa pedicure", "55", "Scrub, mask and hot towels"), it("Gel pedicure", "55")] },
        { title: "Enhancements", items: [it("Acrylic full set", "55+"), it("Acrylic fill", "40+"), it("Dip powder", "45"), it("Nail art", "5+", "Per nail")] },
      ],
      fine: "Prices may vary with length and design. Please let us know about any allergies.",
      contact: "(555) 010-0163 · 18 Rose Avenue · polishednails.example", qrUrl: "https://polishednails.example/book", qrLabel: "Book online",
    },
    spa: {
      label: "Spa & massage", business: "Quiet Pine Spa", tagline: "Massage · Facials · Body treatments", color: "#4d6b53", theme: "clean", font: "classic",
      sections: [
        { title: "Massage", items: [it("Swedish massage", "90", "60 minutes of relaxing full-body massage"), it("Deep tissue massage", "105", "60 minutes"), it("Hot stone massage", "125", "75 minutes"), it("Prenatal massage", "95", "60 minutes, after the first trimester")] },
        { title: "Facials", items: [it("Signature facial", "95", "60 minutes"), it("Express facial", "55", "30 minutes"), it("Hydrating facial", "110", "60 minutes")] },
        { title: "Body", items: [it("Body scrub", "75"), it("Body wrap", "95")] },
      ],
      fine: "Please arrive 10 minutes early. Gratuity is not included. Gift certificates are available at the front desk.",
      contact: "(555) 010-0118 · 9 Pine Road · quietpine.example", qrUrl: "https://quietpine.example/book", qrLabel: "Book a visit",
    },
    lash: {
      label: "Lash & brow", business: "Flutter & Arch Studio", tagline: "Lash extensions · Lifts · Brows", color: "#6d4c9f", theme: "soft", font: "mixed",
      sections: [
        { title: "Lash extensions", items: [it("Classic full set", "120"), it("Hybrid full set", "150"), it("Volume full set", "180"), it("Fill (within 2 weeks)", "60"), it("Fill (within 3 weeks)", "75"), it("Lash removal", "25")] },
        { title: "Lifts & brows", items: [it("Lash lift & tint", "85"), it("Brow lamination", "75"), it("Brow wax & shape", "20"), it("Brow tint", "18")] },
      ],
      fine: "Fills need at least 40% of your lashes in place; otherwise a full set is needed. Please come with clean lashes and no eye makeup.",
      contact: "(555) 010-0131 · flutterandarch.example", qrUrl: "https://flutterandarch.example/book", qrLabel: "Book online",
    },
    skin: {
      label: "Esthetician & waxing", business: "Glow Skin Studio", tagline: "Facials · Peels · Waxing", color: "#0f766e", theme: "clean", font: "modern",
      sections: [
        { title: "Facials & peels", items: [it("Classic facial", "85"), it("Dermaplaning", "75"), it("Chemical peel", "120+"), it("Microdermabrasion", "110")] },
        { title: "Waxing", items: [it("Brow", "18"), it("Lip", "12"), it("Underarm", "22"), it("Half leg", "45"), it("Full leg", "70"), it("Bikini", "40"), it("Brazilian", "60")] },
      ],
      fine: "Please stop retinol products 5 days before waxing or a peel.",
      contact: "(555) 010-0156 · 7 Market Square · glowskin.example", qrUrl: "https://glowskin.example/book", qrLabel: "Book online",
    },
    blank: {
      label: "Start blank", business: "Your Business Name", tagline: "Services & prices", color: "#1e3a5f", theme: "clean", font: "modern",
      sections: [{ title: "Services", items: [it("First service", "25"), it("Second service", "40"), it("Third service", "60")] }],
      fine: "", contact: "", qrUrl: "", qrLabel: "Book online",
    },
  };
  const PRESET_KEYS = ["business", "tagline", "color", "theme", "font", "sections", "fine", "contact", "qrUrl", "qrLabel"];
  const DEFAULTS = { preset: "hair", format: "letter", orient: "portrait", onSheet: false, cols: "auto", leaders: true, caps: true, cur: "$" };
  const isPreset = name => typeof name === "string" && Object.prototype.hasOwnProperty.call(PRESETS, name);
  const copySections = secs => secs.map(x => ({ title: x.title, items: x.items.map(i => ({ name: i.name, price: i.price, note: i.note })) }));
  function presetValues(name) {
    const p = PRESETS[isPreset(name) ? name : "hair"], o = {};
    for (const k of PRESET_KEYS) o[k] = k === "sections" ? copySections(p.sections) : p[k];
    return o;
  }
  function presetState(name, base) {
    const out = Object.assign({}, DEFAULTS, base || {}, presetValues(name));
    out.preset = isPreset(name) ? name : "hair";
    return out;
  }
  Object.assign(DEFAULTS, presetValues("hair"));

  /* ------------------------------------------------------------ settings */
  // Adds https:// when someone types "example.com/book" so phones open it as a link.
  function cleanUrl(str) {
    const t = String(str || "").replace(/\s+/g, "");
    if (!t) return "";
    if (/^https?:\/\//i.test(t)) return t;
    if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return "";
    return /^[^/.]+\.[^/]+/.test(t) ? "https://" + t : "";
  }
  const str = v => (typeof v === "string" || typeof v === "number" ? String(v) : "");
  const cut = (v, n) => [...str(v)].slice(0, n).join("");
  // A price typed as a plain number ("45", "45+", "45.50") gets the currency sign; anything else is kept as typed.
  function fmtPrice(p, cur) {
    const t = String(p || "").trim();
    if (!t || !cur) return t;
    return /^\d[\d,]*(?:\.\d{1,2})?\+?$/.test(t) ? cur + t : t;
  }
  // Validates and cleans a settings object. Returns { s, errors, lost, dropped } where lost lists unprintable characters.
  function normalize(input) {
    const src = input && typeof input === "object" ? input : {};
    const s = Object.assign({}, DEFAULTS, src);
    const lost = new Set(), errors = [];
    const c = (v, n) => { const r = clean(cut(v, n)); r.lost.forEach(x => lost.add(x)); return r.text; };
    for (const k of Object.keys(MAXLEN)) s[k] = c(s[k], MAXLEN[k]);
    s.qrUrl = cleanUrl(s.qrUrl);
    const secs = [];
    let total = 0, dropped = 0;
    for (const sec of Array.isArray(src.sections) ? src.sections : DEFAULTS.sections) {
      if (!sec || typeof sec !== "object") continue;
      const title = c(sec.title, TITLELEN), items = [];
      for (const i of Array.isArray(sec.items) ? sec.items : []) {
        if (!i || typeof i !== "object") continue;
        const row = { name: c(i.name, ITEMLEN.name), price: c(i.price, ITEMLEN.price), note: c(i.note, ITEMLEN.note) };
        if (!row.name && !row.price && !row.note) continue;
        if (items.length >= MAX_ITEMS || total >= MAX_TOTAL) { dropped++; continue; }
        items.push(row); total++;
      }
      if (!title && !items.length) continue;
      if (secs.length >= MAX_SECTIONS) { dropped += items.length; continue; }
      secs.push({ title, items });
    }
    s.sections = secs;
    if (!isPreset(s.preset)) s.preset = "hair";
    if (!FORMATS[s.format]) s.format = "letter";
    if (s.orient !== "landscape") s.orient = "portrait";
    if (!FONTS[s.font]) s.font = "classic";
    if (!THEMES[s.theme]) s.theme = "clean";
    if (!["auto", "1", "2", "3"].includes(String(s.cols))) s.cols = "auto";
    s.cols = String(s.cols);
    if (!Object.prototype.hasOwnProperty.call(CURRENCIES, s.cur)) s.cur = "$";
    if (!/^#[0-9a-f]{6}$/i.test(String(s.color || ""))) s.color = "#9d174d";
    for (const k of ["onSheet", "leaders", "caps"]) s[k] = !!s[k];
    if (!FORMATS[s.format].sheet) s.onSheet = false;
    if (!total && !s.business) errors.push("Add a business name or at least one service.");
    return { s, errors, lost: [...lost], dropped };
  }

  // Turns pasted text into sections. "# Title" or a line without a price starts a section; "Name | Price | Note",
  // a tab, or a price at the end of the line ("Women's cut ..... $65+") makes an item. A line starting with "(",
  // "-" or a lowercase letter right after an item becomes that item's note.
  const PRICE_END = /^(.*?)(?:[\s.·…_:–—-]*\s|[.·…_:–—-]{2,})((?:from\s+)?[$£€]?\s?\d[\d,]*(?:\.\d{1,2})?\+?(?:\s?[-–]\s?[$£€]?\d[\d,]*(?:\.\d{1,2})?\+?)?(?:\s?(?:\/|per)\s?[a-z0-9 ]{1,12})?|free|FREE|Free)$/;
  function parseMenu(text) {
    const out = [];
    let sec = null, prev = null;
    const push = title => { sec = { title, items: [] }; out.push(sec); prev = null; };
    for (const raw of String(text || "").split(/\r?\n/)) {
      const line = raw.replace(/\s+$/, "");
      const t = line.trim();
      if (!t) continue;
      if (/^#+\s*/.test(t)) { push(t.replace(/^#+\s*/, "").replace(/:$/, "")); continue; }
      let parts = null;
      if (t.includes("|")) parts = t.split("|").map(x => x.trim());
      else if (t.includes("\t")) parts = t.split(/\t+/).map(x => x.trim());
      else { const m = PRICE_END.exec(t); if (m && m[1].trim()) parts = [m[1].trim(), m[2].trim()]; }
      if (parts) {
        if (!sec) push("");
        prev = { name: parts[0] || "", price: parts[1] || "", note: parts.slice(2).join(" ").trim() };
        sec.items.push(prev);
        continue;
      }
      if (prev && (/^[(\-–•*~]/.test(t) || /^[a-z]/.test(t) || /^\s{2,}/.test(line))) {
        const n = t.replace(/^[\-–•*~]\s*/, "").replace(/^\((.*)\)$/, "$1");
        prev.note = prev.note ? prev.note + " " + n : n;
        continue;
      }
      push(t.replace(/:$/, ""));
    }
    return out.filter(x => x.title || x.items.length);
  }

  /* ------------------------------------------------------------ geometry */
  function pageSize(s) {
    const f = FORMATS[s.format] || FORMATS.letter;
    const land = f.print && s.orient === "landscape";
    return { w: land ? f.h : f.w, h: land ? f.w : f.h, print: !!f.print, px: f.px || 0, label: f.label };
  }
  // Where the price list sits in the PDF. Small sizes can go on a full Letter or A4 sheet with crop marks.
  function sheetFor(s) {
    const p = pageSize(s), f = FORMATS[s.format];
    if (!s.onSheet || !f.sheet) return { pageW: p.w, pageH: p.h, x: 0, y: 0, marks: false };
    const sh = FORMATS[f.sheet], land = p.w > p.h;
    const pageW = land ? sh.h : sh.w, pageH = land ? sh.w : sh.h;
    return { pageW, pageH, x: (pageW - p.w) / 2, y: (pageH - p.h) / 2, marks: true, sheet: sh.label };
  }

  /* ---------------------------------------------------------- primitives */
  const rect = (x, y, w, h, o) => Object.assign({ t: "rect", x, y, w, h }, o);
  const line = (x1, y1, x2, y2, o) => Object.assign({ t: "line", x1, y1, x2, y2, w: 0.6, color: INK }, o);
  const text = (s, x, y, size, font, color, align) => ({ t: "text", text: s, x, y, size, font, color, align: align || "left" });
  // SVG path data drawn with its top-left corner at (x, y) in page coordinates; `scale` maps path units to points.
  const pathP = (d, x, y, scale, o) => Object.assign({ t: "path", d, x, y, scale }, o);
  const rrect = (w, h, r) => `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const DARK_BG = [0.075, 0.075, 0.086];
  function colors(s) {
    const a0 = hexRgb(s.color);
    if (s.theme === "dark") {
      const accent = lum(a0) < 0.45 ? mix(a0, WHITE, Math.min(0.75, (0.45 - lum(a0)) * 1.6 + 0.15)) : a0;
      return { dark: true, bg: DARK_BG, panel: null, ink: [0.96, 0.95, 0.93], sub: [0.72, 0.72, 0.75], accent, faint: mix(accent, DARK_BG, 0.6), dot: [0.42, 0.42, 0.46], head: [0.96, 0.95, 0.93], headSub: [0.72, 0.72, 0.75] };
    }
    const accent = readable(a0), on = lum(accent) > 0.55 ? INK : WHITE;
    const panel = s.theme === "soft" ? mix(accent, WHITE, 0.92) : null;
    const band = s.theme === "band";
    return { dark: false, bg: WHITE, panel, ink: INK, sub: GRAY, accent, faint: mix(accent, panel || WHITE, 0.62), dot: panel ? mix(GRAY, panel, 0.35) : LIGHT, head: band ? on : INK, headSub: band ? mix(on, accent, 0.22) : GRAY, on };
  }
  // Baseline position (from the top) for text of `size` in a line box `lh` tall.
  const base = (lh, size) => (lh - size) / 2 + size * 0.8;

  /* ------------------------------------------------------------ layout */
  // Lays out the whole price list in a W x H box. opt: { logo: {aspect}, qr: {n, d}, credit: true to leave room for the credit line }.
  // Returns { W, H, prims, links, k, cols, cut, dropped, overflow, keys }.
  function layout(input, opt = {}) {
    const { s } = normalize(input);
    const p = pageSize(s), W = p.w, H = p.h;
    const u = Math.min(W, H) / 612, F = FONTS[s.font], K = colors(s);
    const m = 40 * u, inset = m * 0.5, iw = W - 2 * m;
    const qr = s.qrUrl && opt.qr ? opt.qr : null;
    const env = { s, F, K, W, H, u, m, iw, inset, logo: opt.logo, qr, credit: !!opt.credit };

    // body: largest text size that fits, trying 1 to 3 columns; the heading and footer grow with it
    const secs = s.sections.filter(x => x.title || x.items.length);
    const maxCols = s.cols === "auto" ? 3 : +s.cols, minCols = s.cols === "auto" ? 1 : +s.cols;
    const kMax = 1.75 / Math.sqrt(u), kMin = Math.max(0.5, (p.print ? 6 : 7) / (11 * u));
    // Keeping each section in one column wins unless splitting sections allows clearly bigger text.
    let whole = null, split = null;
    for (let k = kMax; k >= kMin - 1e-9 && !whole; k *= 0.97) {
      const hd = header(env, k), ft = footer(env, k), bodyH = Math.max(0, ft.top - hd.bottom);
      for (const sp of split ? [false] : [false, true]) {
        for (let c = minCols; c <= maxCols; c++) {
          const r = tryBody(s, F, secs, k, u, c, iw, bodyH, sp);
          if (r) { Object.assign(r, { hd, ft, bodyH }); if (sp) split = r; else whole = r; break; }
        }
      }
    }
    let best = whole && (!split || whole.k >= split.k * 0.85) ? whole : split, overflow = false, dropped = 0;
    if (!best) {
      const hd = header(env, kMin), ft = footer(env, kMin), bodyH = Math.max(0, ft.top - hd.bottom);
      best = Object.assign(fillGreedy(s, F, secs, kMin, u, Math.max(minCols, Math.min(maxCols, maxColsFor(kMin, u, iw))), iw, bodyH), { hd, ft, bodyH });
      overflow = true; dropped = best.dropped;
    }
    const { hd, ft } = best;

    const P = [], cuts = new Set(hd.cuts.concat(ft.cuts));
    if (K.dark) P.push(rect(0, 0, W, H, { fill: K.bg }));
    if (K.panel) P.push(pathP(rrect(W - 2 * inset, H - 2 * inset, 10 * u), inset, H - inset, 1, { fill: K.panel }));
    if (s.theme === "clean") P.push(rect(inset, inset, W - 2 * inset, H - 2 * inset, { stroke: K.accent, sw: 0.8 * u }));
    P.push(...hd.prims, ...ft.prims);
    // Spare height opens up the row spacing a little (to at most 2.2 times), then the rest goes above and below.
    const gaps = best.tallGaps || 1, extra = overflow ? 0 : Math.max(0, Math.min(((best.bodyH - best.h) * 0.7) / gaps, best.z.rowGap * 1.2));
    const spare = best.bodyH - best.h - extra * gaps;
    drawBody(P, best, secs, s, F, K, m + (iw - best.used) / 2, hd.bottom + Math.max(0, spare) * 0.3, H, u, cuts, extra);
    const keys = new Set(["H"]);
    for (const pr of P) if (pr.font) keys.add(pr.font);
    return { W, H, prims: P, links: ft.links, k: best.k, cols: best.cols, fs: best.fs, cut: [...cuts], dropped, overflow, keys: [...keys] };
  }

  // Heading (logo, business name, tagline) from the top. Returns its prims and where the body may start (from the top).
  function header(e, k) {
    const { s, F, K, W, H, u, m, iw, inset } = e, hk = clamp(k, 0.85, 1.4), P = [], cuts = [];
    const Y = y => H - y;
    let y = m;
    if (e.logo) {
      let lh = 52 * u * hk, lw = lh * e.logo.aspect;
      if (lw > iw * 0.5) { lw = iw * 0.5; lh = lw / e.logo.aspect; }
      P.push({ t: "img", x: (W - lw) / 2, y: Y(y + lh), w: lw, h: lh });
      y += lh + 10 * u * hk;
    }
    if (s.business) {
      const f = fitLine(s.business, F.h, 30 * u * hk, 15 * u, iw);
      if (f.cut) cuts.push("business name");
      P.push(text(f.text, W / 2, Y(y + base(f.size * 1.15, f.size)), f.size, F.h, K.head, "center"));
      y += f.size * 1.15;
    }
    if (s.tagline) {
      const sz = 11 * u * hk, r = wrap(s.tagline, F.b, sz, iw, 2);
      if (r.cut) cuts.push("tagline");
      y += 3 * u * hk;
      r.lines.forEach(ln => { P.push(text(ln, W / 2, Y(y + base(sz * 1.35, sz)), sz, F.b, K.headSub, "center")); y += sz * 1.35; });
    }
    if (s.theme === "band") {
      y += 14 * u * hk;
      P.unshift(pathP(rrect(W - 2 * inset, y - inset, 8 * u), inset, H - inset, 1, { fill: K.accent }));
      y += 18 * u * hk;
    } else {
      y += 10 * u * hk;
      P.push(line(W / 2 - 24 * u * hk, Y(y), W / 2 + 24 * u * hk, Y(y), { w: 1.4 * u, color: K.accent }));
      y += 18 * u * hk;
    }
    return { prims: P, cuts, bottom: y };
  }

  // Fine print, contact line, QR code and credit from the bottom. `top` is where the body must end (from the top).
  function footer(e, k) {
    const { s, F, K, W, H, u, m, iw, qr } = e, fk = clamp(k, 0.9, 1.3), P = [], links = [], cuts = [];
    let fy = m;
    if (e.credit) {
      const cs = Math.max(5.5, 6 * u), cw = textW(CREDIT, "H", cs);
      P.push(text(CREDIT, W / 2, fy, cs, "H", K.sub, "center"));
      links.push({ x: W / 2 - cw / 2 - 2, y: fy - 2, w: cw + 4, h: cs + 3, url: CREDIT_URL });
      fy += cs + 10 * u;
    }
    const q = 64 * u * fk, qGap = 16 * u;
    const tw = qr ? iw - q - qGap : iw;
    const ft = [];
    if (s.fine) {
      const sz = 8 * u * fk, r = wrap(s.fine, F.b, sz, tw, 4);
      if (r.cut) cuts.push("fine print");
      r.lines.forEach(ln => ft.push({ ln, sz, font: F.b, color: K.sub, lh: sz * 1.4 }));
    }
    if (s.contact) {
      const sz = 9 * u * fk, r = wrap(s.contact, F.p, sz, tw, 2);
      if (r.cut) cuts.push("contact line");
      if (ft.length) ft.push({ gap: 4 * u });
      r.lines.forEach(ln => ft.push({ ln, sz, font: F.p, color: K.ink, lh: sz * 1.4 }));
    }
    const ftH = ft.reduce((a, l) => a + (l.gap || l.lh), 0);
    const capSz = 7.5 * u * fk, qBlock = qr ? q + (s.qrLabel ? capSz * 1.6 : 0) : 0;
    const footH = Math.max(ftH, qBlock);
    if (footH) {
      const top = fy + footH; // PDF y of the footer's top edge
      let ty = top - (footH - ftH) / 2;
      const align = qr ? "left" : "center", tx = qr ? m : W / 2;
      for (const l of ft) {
        if (l.gap) { ty -= l.gap; continue; }
        P.push(text(l.ln, tx, ty - base(l.lh, l.sz), l.sz, l.font, l.color, align));
        ty -= l.lh;
      }
      if (qr) {
        const qx = ft.length ? W - m - q : (W - q) / 2, qTop = top - (footH - qBlock) / 2;
        if (K.dark) P.push(pathP(rrect(q + 8 * u, q + 8 * u, 4 * u), qx - 4 * u, qTop + 4 * u, 1, { fill: WHITE }));
        P.push(pathP(qr.d, qx, qTop, q / qr.n, { fill: INK }));
        links.push({ x: qx, y: qTop - q, w: q, h: q, url: s.qrUrl });
        if (s.qrLabel) {
          const f = fitLine(s.qrLabel, F.p, capSz, 5.5 * u, q + 24 * u);
          P.push(text(f.text, qx + q / 2, qTop - q - capSz * 1.35, f.size, F.p, K.accent, "center"));
        }
      }
      fy = top + 14 * u * fk;
      P.push(line(m, fy - 7 * u * fk, W - m, fy - 7 * u * fk, { w: 0.5 * u, color: K.faint }));
    }
    return { prims: P, links, cuts, top: H - fy };
  }

  // Sizes for scale k (points).
  function sizes(k, u) {
    const f = 11 * u * k;
    return { item: f, lhI: f * 1.3, note: f * 0.78, lhN: f * 0.78 * 1.32, title: f * 1.12, lhT: f * 1.12 * 1.3, rowGap: f * 0.5, secGap: f * 1.45, rule: f * 0.45, gutter: Math.max(18 * u, f * 1.8) };
  }
  const maxColsFor = (k, u, iw) => { const z = sizes(k, u); return Math.max(1, Math.min(3, Math.floor((iw + z.gutter) / (12.5 * z.item + z.gutter)))); };
  // Measures every row at one scale and column width.
  function measure(s, F, secs, z, colW) {
    const rows = [];
    secs.forEach((sec, si) => {
      const titleH = sec.title ? z.lhT + z.rule + z.rowGap : 0;
      if (!sec.items.length) { rows.push({ si, first: true, titleH, h: 0, item: null }); return; }
      sec.items.forEach((item, ii) => {
        const price = fmtPrice(item.price, s.cur);
        const pf = price ? fitLine(price, F.p, z.item, z.item * 0.8, colW * 0.42) : { text: "", size: z.item, cut: false };
        const pw = pf.text ? textW(pf.text, F.p, pf.size) : 0;
        const nameW = Math.max(colW * 0.4, colW - pw - (pw ? z.item * 0.9 : 0));
        const nr = item.name ? wrap(item.name, F.b, z.item, nameW, 3) : { lines: [], cut: false };
        const nr2 = item.note ? wrap(item.note, F.b, z.note, colW * 0.9, 3) : { lines: [], cut: false };
        const nameLines = Math.max(1, nr.lines.length);
        const h = nameLines * z.lhI + (nr2.lines.length ? z.note * 0.15 + nr2.lines.length * z.lhN : 0) + z.rowGap;
        rows.push({ si, first: ii === 0, titleH, h, item, price: pf, pw, name: nr, note: nr2 });
      });
    });
    return rows;
  }
  // Best split of the rows into `cols` columns (smallest tallest column). Cuts only between sections unless `split`.
  function partition(rows, z, cols, split) {
    const n = rows.length;
    if (!n) return { h: 0, groups: [] };
    const pre = [0], tpre = [0], spre = [0];
    rows.forEach((r, i) => { pre.push(pre[i] + r.h); tpre.push(tpre[i] + (r.first ? r.titleH : 0)); spre.push(spre[i] + (r.first && i > 0 ? 1 : 0)); });
    const height = (i, j) => pre[j] - pre[i] + tpre[j] - tpre[i] + z.secGap * (spre[j] - spre[i + 1]) - z.rowGap + (rows[i].first ? 0 : rows[i].titleH);
    const ok = i => i === 0 || split || rows[i].first;
    const INF = Infinity;
    const best = [new Array(n + 1).fill(INF)], from = [new Array(n + 1).fill(-1)];
    best[0][0] = 0;
    for (let c = 1; c <= cols; c++) {
      best[c] = new Array(n + 1).fill(INF); from[c] = new Array(n + 1).fill(-1);
      for (let j = 1; j <= n; j++) {
        if (j < n && !ok(j)) continue;
        for (let i = c - 1; i < j; i++) {
          if (!ok(i) || best[c - 1][i] === INF) continue;
          const v = Math.max(best[c - 1][i], height(i, j));
          if (v < best[c][j]) { best[c][j] = v; from[c][j] = i; }
        }
      }
    }
    if (best[cols][n] === INF) return null;
    const groups = [];
    for (let c = cols, j = n; c > 0; c--) { const i = from[c][j]; groups.unshift([i, j]); j = i; }
    // Gaps that can stretch in the tallest column: one per row and one per section break.
    let tallGaps = 1, tallH = -1;
    for (const [i, j] of groups) { const h = height(i, j); if (h > tallH) { tallH = h; tallGaps = (j - i) + (spre[j] - spre[i + 1]); } }
    return { h: best[cols][n], groups, tallGaps };
  }
  function tryBody(s, F, secs, k, u, cols, iw, bodyH, split) {
    const z = sizes(k, u);
    const colW = Math.min((iw - (cols - 1) * z.gutter) / cols, z.item * 40);
    if (colW < z.item * 12.5) return null;
    const rows = measure(s, F, secs, z, colW);
    if (rows.length < cols) return null;
    const part = partition(rows, z, cols, split);
    if (!part || part.h > bodyH + 0.01) return null;
    return { k, z, cols, colW, rows, groups: part.groups, tallGaps: part.tallGaps, h: part.h, used: cols * colW + (cols - 1) * z.gutter, fs: z.item, dropped: 0 };
  }
  // When nothing fits at the smallest size: fill columns in order and leave out the rest.
  function fillGreedy(s, F, secs, k, u, cols, iw, bodyH) {
    const z = sizes(k, u);
    const colW = Math.min((iw - (cols - 1) * z.gutter) / cols, z.item * 40);
    const rows = measure(s, F, secs, z, colW), groups = [];
    let i = 0, hMax = 0;
    for (let c = 0; c < cols && i < rows.length; c++) {
      let h = 0, j = i;
      while (j < rows.length) {
        const r = rows[j], add = r.h + (r.first || j === i ? r.titleH : 0) + (r.first && j > i ? z.secGap : 0);
        if (h + add - z.rowGap > bodyH && j > i) break;
        if (h + add - z.rowGap > bodyH) { j++; break; }
        h += add; j++;
      }
      groups.push([i, j]); hMax = Math.max(hMax, Math.min(bodyH, h - z.rowGap)); i = j;
    }
    const dropped = rows.slice(i).filter(r => r.item).length;
    return { k, z, cols: groups.length || 1, colW, rows, groups, h: hMax, used: (groups.length || 1) * colW + ((groups.length || 1) - 1) * z.gutter, fs: z.item, dropped };
  }
  function drawBody(P, b, secs, s, F, K, x0, top, H, u, cuts, extra) {
    const z = Object.assign({}, b.z, { rowGap: b.z.rowGap + extra, secGap: b.z.secGap + extra }), Y = y => H - y;
    b.groups.forEach(([i, j], c) => {
      const x = x0 + c * (b.colW + z.gutter), xr = x + b.colW;
      let y = top;
      for (let r = i; r < j; r++) {
        const row = b.rows[r], sec = secs[row.si];
        if (row.first && r > i) y += z.secGap;
        if ((row.first || r === i) && sec.title) {
          const t = s.caps ? clean(sec.title.toUpperCase()).text : sec.title;
          const f = fitLine(t, F.h, z.title, z.title * 0.75, b.colW);
          if (f.cut) cuts.add("section title");
          P.push(text(f.text, x, Y(y + base(z.lhT, z.title)), f.size, F.h, K.accent));
          y += z.lhT;
          P.push(line(x, Y(y + z.rule * 0.35), xr, Y(y + z.rule * 0.35), { w: Math.max(0.4, 0.5 * u), color: K.faint }));
          y += z.rule + z.rowGap;
        }
        if (!row.item) continue;
        if (row.name.cut || row.note.cut) cuts.add("service name or note");
        if (row.price.cut) cuts.add("price");
        const lines = row.name.lines.length ? row.name.lines : [""];
        lines.forEach((ln, li) => {
          const bl = y + base(z.lhI, z.item);
          if (ln) P.push(text(ln, x, Y(bl), z.item, F.b, K.ink));
          if (li === lines.length - 1 && row.price.text) {
            P.push(text(row.price.text, xr, Y(bl), row.price.size, F.p, K.ink, "right"));
            const lx = x + (ln ? textW(ln, F.b, z.item) + z.item * 0.35 : 0), rx = xr - row.pw - z.item * 0.35;
            if (s.leaders && rx - lx > z.item * 1.2) {
              const d = z.item * 0.09, step = z.item * 0.3;
              const a = Math.ceil(lx / step) * step, e = Math.floor(rx / step) * step;
              if (e > a) P.push(line(a, Y(bl) + d / 2, e, Y(bl) + d / 2, { w: d, color: K.dot, dash: [0, step], round: true }));
            }
          }
          y += z.lhI;
        });
        if (row.note.lines.length) {
          y += z.note * 0.15;
          row.note.lines.forEach(ln => { P.push(text(ln, x, Y(y + base(z.lhN, z.note)), z.note, F.b, K.sub)); y += z.lhN; });
        }
        y += z.rowGap;
      }
    });
  }

  /* ------------------------------------------------------------ QR */
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

  /* ------------------------------------------------------------ sheet chrome */
  // Crop marks and the credit for a small size printed on a full sheet.
  function sheetPrims(sh, W, H) {
    const P = [];
    if (!sh.marks) return { prims: P, links: [] };
    const off = 6, len = 14, x1 = sh.x, x2 = sh.x + W, y1 = sh.y, y2 = sh.y + H;
    for (const x of [x1, x2]) { P.push(line(x, y2 + off, x, y2 + off + len, { w: 0.5 })); P.push(line(x, y1 - off, x, y1 - off - len, { w: 0.5 })); }
    for (const y of [y1, y2]) { P.push(line(x1 - off, y, x1 - off - len, y, { w: 0.5 })); P.push(line(x2 + off, y, x2 + off + len, y, { w: 0.5 })); }
    P.push(text("Cut along the marks · Print at 100% (Actual size)", sh.pageW / 2, sh.pageH - 24, 7, "H", GRAY, "center"));
    const cw = textW(CREDIT, "H", 6.5);
    P.push(text(CREDIT, sh.pageW / 2, 20, 6.5, "H", GRAY, "center"));
    return { prims: P, links: [{ x: sh.pageW / 2 - cw / 2 - 2, y: 18, w: cw + 4, h: 10, url: CREDIT_URL }] };
  }

  /* --------------------------------------------------------------- SVG */
  const FAM = { H: "Helvetica,Arial,'Liberation Sans',sans-serif", T: "'Times New Roman',Times,'Liberation Serif',serif" };
  const xmlEsc = v => String(v).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const col = a => "rgb(" + a.map(v => Math.round(v * 255)).join(",") + ")";
  const r2 = v => Math.round(v * 100) / 100;
  function svgText(t, x, y, size, font, color, align, H) {
    const w = textW(t, font, size);
    const lx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    return `<text x="${r2(lx)}" y="${r2(H - y)}" font-size="${r2(size)}" font-family="${FAM[font[0]]}"${font.length > 1 ? ' font-weight="700"' : ""} fill="${col(color)}" textLength="${r2(w)}" lengthAdjust="spacingAndGlyphs">${xmlEsc(t)}</text>`;
  }
  const strokeAttrs = p => (p.stroke ? ` stroke="${col(p.stroke)}" stroke-width="${r2(p.sw || 0.5)}"` : "");
  function svgPrims(prims, H, dx, dy, logoHref) {
    let out = "";
    for (const p of prims) {
      if (p.t === "rect") out += `<rect x="${r2(dx + p.x)}" y="${r2(H - (dy + p.y + p.h))}" width="${r2(p.w)}" height="${r2(p.h)}" fill="${p.fill ? col(p.fill) : "none"}"${strokeAttrs(p)}/>`;
      else if (p.t === "line") out += `<line x1="${r2(dx + p.x1)}" y1="${r2(H - dy - p.y1)}" x2="${r2(dx + p.x2)}" y2="${r2(H - dy - p.y2)}" stroke="${col(p.color)}" stroke-width="${r2(p.w)}"${p.dash ? ` stroke-dasharray="${p.dash.map(r2).join(" ")}"` : ""}${p.round ? ' stroke-linecap="round"' : ""}/>`;
      else if (p.t === "path") out += `<path d="${p.d}" transform="translate(${r2(dx + p.x)} ${r2(H - (dy + p.y))}) scale(${Math.round(p.scale * 10000) / 10000})" fill="${p.fill ? col(p.fill) : "none"}"${strokeAttrs(p)}/>`;
      else if (p.t === "text" && p.text) out += svgText(p.text, dx + p.x, dy + p.y, p.size, p.font, p.color, p.align, H);
      else if (p.t === "img" && logoHref) out += `<image href="${xmlEsc(logoHref)}" x="${r2(dx + p.x)}" y="${r2(H - (dy + p.y + p.h))}" width="${r2(p.w)}" height="${r2(p.h)}" preserveAspectRatio="none"/>`;
    }
    return out;
  }
  // The price list as a standalone SVG (preview and PNG export). opt.sheet draws the full sheet with crop marks.
  function svg(lay, logoHref, opt = {}) {
    const sh = opt.sheet && opt.sheet.marks ? opt.sheet : null;
    const PW = sh ? sh.pageW : lay.W, PH = sh ? sh.pageH : lay.H, dx = sh ? sh.x : 0, dy = sh ? sh.y : 0;
    const size = opt.px ? ` width="${opt.px}" height="${Math.round((opt.px * PH) / PW)}"` : "";
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(PW)} ${r2(PH)}"${size} style="font-kerning:none"><rect width="100%" height="100%" fill="#fff"/>`;
    if (sh) out += svgPrims(sheetPrims(sh, lay.W, lay.H).prims, PH, 0, 0);
    return out + svgPrims(lay.prims, PH, dx, dy, logoHref) + "</svg>";
  }

  /* --------------------------------------------------------------- PDF */
  const FONT_NAMES = { H: "Helvetica", HB: "Helvetica-Bold", T: "Times-Roman", TB: "Times-Bold" };
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
        if (p.round) o.lineCap = L.LineCapStyle.Round;
        page.drawLine(o);
      } else if (p.t === "path") {
        const o = { x: dx + p.x, y: dy + p.y, scale: p.scale };
        if (p.fill) o.color = c(p.fill);
        if (p.stroke) { o.borderColor = c(p.stroke); o.borderWidth = p.sw || 0.5; }
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
  function addLinks(L, doc, page, links) {
    if (!links.length) return;
    const refs = links.map(p => doc.context.register(doc.context.obj({
      Type: "Annot", Subtype: "Link", Rect: [p.x, p.y, p.x + p.w, p.y + p.h], Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: L.PDFString.of(p.url) },
    })));
    page.node.set(L.PDFName.of("Annots"), doc.context.obj(refs));
  }

  // The small credit line goes on print sizes; a small size on a full sheet carries it in the sheet margin instead.
  const wantsCredit = s => pageSize(s).print && !sheetFor(s).marks;

  /* Builds the one-page PDF. opts: { logo: {bytes, aspect}, qr: {n, d} } */
  async function buildPdf(L, input, opts = {}) {
    const { s, errors } = normalize(input);
    if (errors.length) throw new Error(errors[0]);
    const sh = sheetFor(s);
    const lay = layout(s, { logo: opts.logo ? { aspect: opts.logo.aspect } : null, qr: opts.qr, credit: wantsCredit(s) });
    const doc = await L.PDFDocument.create();
    doc.setTitle(s.business ? `${s.business} price list` : "Price list");
    doc.setSubject("Price list");
    doc.setCreator("PriceBoard (pricelist.roohsites.com)");
    doc.setProducer("PriceBoard with pdf-lib");
    doc.setKeywords(["price list", "service menu", "PriceBoard"]);
    const fonts = {};
    for (const k of lay.keys) fonts[k] = await doc.embedFont(FONT_NAMES[k]);
    const img = opts.logo ? await doc.embedPng(opts.logo.bytes) : null;
    const page = doc.addPage([sh.pageW, sh.pageH]);
    const chrome = sheetPrims(sh, lay.W, lay.H);
    drawPrims(L, page, chrome.prims, fonts, 0, 0);
    drawPrims(L, page, lay.prims, fonts, sh.x, sh.y, img);
    addLinks(L, doc, page, chrome.links.concat(lay.links.map(l => Object.assign({}, l, { x: l.x + sh.x, y: l.y + sh.y }))));
    return { bytes: await doc.save(), lay, sheet: sh };
  }

  const countItems = s => s.sections.reduce((a, x) => a + x.items.length, 0);

  return {
    clean, textW, fitLine, wrap, hexRgb, readable, mix,
    SITE, CREDIT, CREDIT_URL, FORMATS, FONTS, THEMES, CURRENCIES, PALETTES, PRESETS, PRESET_KEYS, DEFAULTS,
    MAX_SECTIONS, MAX_ITEMS, MAX_TOTAL, MAXLEN, ITEMLEN, TITLELEN,
    isPreset, presetValues, presetState, normalize, cleanUrl, fmtPrice, parseMenu, countItems,
    pageSize, sheetFor, wantsCredit, layout, sizes, partition, qrData, sheetPrims, svg, buildPdf, mm,
  };
});
