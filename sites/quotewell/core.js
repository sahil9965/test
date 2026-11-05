/* Quotewell core: estimate, quote and proposal documents for small trades. Money is worked out in whole cents in a fixed
   order (line amounts, subtotal, discount, markup, tax on the taxable share, total, deposit, balance), the page layout and
   the PDF come from the same list of drawing steps, and nothing touches the DOM, so the same file runs on the page and in
   Node tests. All coordinates are PDF points (1/72 inch) with the origin at the bottom-left. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.QWCore = api;
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

  /* ---------------------------------------------------------------- constants */
  const KINDS = { estimate: "Estimate", quote: "Quote", proposal: "Proposal" };
  const PREFIX = { estimate: "EST", quote: "QUO", proposal: "PRO" };
  const PAPER = { letter: { w: 612, h: 792, name: "US Letter" }, a4: { w: 595.28, h: 841.89, name: "A4" } };
  const CURRENCIES = {
    USD: { symbol: "$", name: "US dollar" }, CAD: { symbol: "$", name: "Canadian dollar" }, AUD: { symbol: "$", name: "Australian dollar" },
    GBP: { symbol: "£", name: "Pound sterling" }, EUR: { symbol: "€", name: "Euro" },
  };
  const ACCENTS = { orange: "#b45309", blue: "#1d4ed8", green: "#15803d", red: "#b91c1c", slate: "#334155" };
  const TYPES = { labor: "Labor", material: "Materials", other: "Other" };
  const LIMITS = { items: 60, desc: 200, name: 70, line: 90, scope: 1500, terms: 2000, title: 90, unit: 10, number: 20, label: 24 };
  const DEFAULT_TERMS = [
    "This {kind} is based on the work described above. If the job changes, or something unexpected is found once work starts, we will tell you and agree any extra cost with you before doing the extra work.",
    "Permits, inspections and fees are not included unless a line above says so.",
    "The deposit and balance are due as shown above.",
  ];
  // Starting points per trade: line descriptions and units only. No prices, no tax rules: those depend on you and your area.
  const TRADES = {
    general: { label: "General contractor", title: "Kitchen remodel", scope: "Describe the work room by room, what is included and what is not.",
      extra: "Any permit or inspection the job needs is listed above or quoted separately.",
      items: [["Demolition and haul-away", "other", "job"], ["Carpentry labor", "labor", "hr"], ["Lumber and fasteners", "material", "lot"], ["Finish materials", "material", "lot"], ["Permits and inspections (if needed)", "other", "ea"]] },
    handyman: { label: "Handyman", title: "Door and fixture repairs", scope: "List each small job, for example: replace the bathroom faucet, re-hang the back door, patch two drywall holes.",
      extra: "Materials are priced as listed; anything extra is agreed with you first.",
      items: [["Labor", "labor", "hr"], ["Materials and supplies", "material", "lot"], ["Trip or service call fee", "other", "ea"], ["Disposal and haul-away", "other", "load"]] },
    electrician: { label: "Electrician", title: "Panel upgrade and new outlets", scope: "Say what will be installed or replaced and where, for example: 3 new outlets in the garage and a 20 amp circuit.",
      extra: "Any permit or inspection the job needs is listed above or quoted separately.",
      items: [["Electrician labor", "labor", "hr"], ["Wire, boxes and devices", "material", "lot"], ["Fixtures or equipment supplied", "material", "ea"], ["Permit and inspection (if needed)", "other", "ea"], ["Service call or trip charge", "other", "ea"]] },
    plumber: { label: "Plumber", title: "Water heater replacement", scope: "Say what will be repaired or replaced and where, and who supplies the fixtures.",
      extra: "Any permit or inspection the job needs is listed above or quoted separately.",
      items: [["Plumber labor", "labor", "hr"], ["Pipe, fittings and supplies", "material", "lot"], ["Fixture or appliance supplied", "material", "ea"], ["Permit (if needed)", "other", "ea"], ["Service call or trip charge", "other", "ea"]] },
    painter: { label: "Painter", title: "Interior painting, 3 bedrooms", scope: "List the rooms, walls, ceilings and trim to be painted, and who picks the colors.",
      extra: "Colors and finishes are agreed before work starts.",
      items: [["Prep: patching, sanding and masking", "labor", "hr"], ["Painting: walls and ceilings", "labor", "sq ft"], ["Trim and doors", "labor", "ea"], ["Paint, primer and supplies", "material", "lot"]] },
    cleaner: { label: "Cleaning service", title: "Move-out cleaning", scope: "Say which rooms and tasks are included, how often, and what is not (for example inside the oven or windows).",
      extra: "Please tell us about pets, alarms and access before the first visit.",
      items: [["Standard cleaning", "labor", "visit"], ["Deep clean add-on", "labor", "job"], ["Inside oven or fridge", "other", "ea"], ["Supplies and equipment", "material", "lot"]] },
    lawn: { label: "Lawn care and landscaping", title: "Spring yard cleanup", scope: "Describe the areas, the tasks and how often, for example: weekly mowing, edging and blowing for the front and back lawn.",
      extra: "The schedule may move for weather.",
      items: [["Mowing, edging and trimming", "labor", "visit"], ["Planting labor", "labor", "hr"], ["Mulch, soil or plants", "material", "lot"], ["Haul-away", "other", "load"]] },
    roofing: { label: "Roofer", title: "Roof replacement", scope: "Describe the roof area, the layers to be removed and installed, and what happens to damaged decking.",
      extra: "Any permit or inspection the job needs is listed above or quoted separately.",
      items: [["Tear-off and disposal", "labor", "sq ft"], ["Shingles and underlayment", "material", "sq ft"], ["Flashing, vents and fasteners", "material", "lot"], ["Installation labor", "labor", "hr"], ["Permit (if needed)", "other", "ea"]] },
  };

  const DEFAULTS = {
    kind: "estimate", number: "EST-0001", issued: "", validDays: 30, currency: "USD", paper: "letter", accent: ACCENTS.orange,
    from: { name: "", phone: "", email: "", address: "", license: "", logo: "", logoRatio: 0 },
    to: { name: "", phone: "", email: "", address: "" },
    job: { title: "", address: "", scope: "" },
    items: [],
    discount: { mode: "pct", value: 0 }, markup: { label: "Overhead and profit", pct: 0 }, tax: { label: "Sales tax", pct: 0 }, deposit: { mode: "pct", value: 0 },
    terms: "", sign: true, split: false,
  };

  /* ---------------------------------------------------------------- numbers and dates */
  // Reads what people type: "1,200.50", "$12", " 3 ". Anything else counts as 0; never negative.
  function num(v, max) {
    if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.min(v, max || 1e9) : 0;
    const s = String(v == null ? "" : v).replace(/[^0-9.\-]/g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? Math.min(n, max || 1e9) : 0;
  }
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  // Half-up rounding that survives floating point (1.005 * 100 is 100.49999999999999).
  const cents = x => Math.round(x * 100 + 1e-7);
  const pctOf = (c, pct) => Math.round((c * pct) / 100 + 1e-7);
  const pad2 = n => String(n).padStart(2, "0");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function isIso(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] && +m[1] >= 2000 && +m[1] <= 2100;
  }
  function addDays(iso, n) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n));
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  function fmtDate(iso) {
    if (!isIso(iso)) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return `${MONTHS[m - 1]} ${d}, ${y}`;
  }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  // "EST-0007" -> "EST-0008"; anything else -> the kind's first number.
  function nextNumber(prev, kind) {
    const pre = PREFIX[kind] || "EST";
    const m = /^(.*?)(\d+)$/.exec(String(prev || "").trim());
    if (!m) return `${pre}-0001`;
    const n = String(parseInt(m[2], 10) + 1).padStart(m[2].length, "0");
    return m[1] + n;
  }
  function money(c, cur) {
    const sym = (CURRENCIES[cur] || CURRENCIES.USD).symbol;
    const neg = c < 0;
    const a = Math.abs(c);
    const whole = Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${neg ? "-" : ""}${sym}${whole}.${pad2(a % 100)}`;
  }
  const trimNum = (n, dp) => { const s = Number(n).toFixed(dp); return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s; };
  const qtyText = q => { const [w, f] = trimNum(q, 3).split("."); return w.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (f ? "." + f : ""); };
  const pctText = p => trimNum(p, 3) + "%";
  // A unit rate keeps up to 4 decimals if it has them (for example $0.125 a foot), otherwise 2.
  function rateText(rate, cur) {
    const sym = (CURRENCIES[cur] || CURRENCIES.USD).symbol;
    const dp = Math.abs(rate * 100 - Math.round(rate * 100)) < 1e-6 ? 2 : 4;
    const [w, f] = Number(rate).toFixed(dp).split(".");
    return `${sym}${w.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${f}`;
  }

  /* ---------------------------------------------------------------- the document */
  function newItem(type, desc, unit) {
    return { desc: desc || "", type: TYPES[type] ? type : "labor", qty: 1, unit: unit || "", rate: "", taxable: false };
  }
  const str = (v, max) => String(v == null ? "" : v).replace(/[\r\n\t]+/g, " ").slice(0, max).trim();
  const free = (v, max) => String(v == null ? "" : v).replace(/\r\n?/g, "\n").slice(0, max);   // multi-line text, cleaned per line at layout time
  function normalize(input) {
    const i = input || {};
    const kind = KINDS[i.kind] ? i.kind : DEFAULTS.kind;
    const pick = (o, k) => (o && typeof o === "object" ? o[k] : undefined);
    const mode = v => (v === "amt" ? "amt" : "pct");
    const logo = typeof pick(i.from, "logo") === "string" && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(i.from.logo) && i.from.logo.length < 400000 ? i.from.logo : "";
    const items = (Array.isArray(i.items) ? i.items : []).slice(0, LIMITS.items).map(it => ({
      desc: str(it && it.desc, LIMITS.desc),
      type: it && TYPES[it.type] ? it.type : "labor",
      qty: it && it.qty !== "" && it.qty != null ? num(it.qty, 1e6) : 0,
      unit: str(it && it.unit, LIMITS.unit),
      rate: it && it.rate !== "" && it.rate != null ? num(it.rate, 1e8) : "",
      taxable: !!(it && it.taxable),
    }));
    return {
      kind,
      number: str(i.number, LIMITS.number) || DEFAULTS.number,
      issued: isIso(i.issued) ? i.issued : "",
      validDays: i.validDays == null ? DEFAULTS.validDays : Math.round(clamp(num(i.validDays, 365), 0, 365)),
      currency: CURRENCIES[i.currency] ? i.currency : DEFAULTS.currency,
      paper: PAPER[i.paper] ? i.paper : DEFAULTS.paper,
      accent: /^#[0-9a-f]{6}$/i.test(i.accent || "") ? i.accent.toLowerCase() : DEFAULTS.accent,
      from: { name: str(pick(i.from, "name"), LIMITS.name), phone: str(pick(i.from, "phone"), 30), email: str(pick(i.from, "email"), 80), address: str(pick(i.from, "address"), 120), license: str(pick(i.from, "license"), 40), logo, logoRatio: logo ? clamp(num(pick(i.from, "logoRatio"), 20), 0.2, 8) || 1 : 0 },
      to: { name: str(pick(i.to, "name"), LIMITS.name), phone: str(pick(i.to, "phone"), 30), email: str(pick(i.to, "email"), 80), address: str(pick(i.to, "address"), 120) },
      job: { title: str(pick(i.job, "title"), LIMITS.title), address: str(pick(i.job, "address"), 120), scope: free(pick(i.job, "scope"), LIMITS.scope) },
      items,
      discount: { mode: mode(pick(i.discount, "mode")), value: num(pick(i.discount, "value"), 1e8) },
      markup: { label: str(pick(i.markup, "label"), LIMITS.label) || DEFAULTS.markup.label, pct: clamp(num(pick(i.markup, "pct"), 1000), 0, 500) },
      tax: { label: str(pick(i.tax, "label"), LIMITS.label) || DEFAULTS.tax.label, pct: clamp(num(pick(i.tax, "pct"), 100), 0, 100) },
      deposit: { mode: mode(pick(i.deposit, "mode")), value: num(pick(i.deposit, "value"), 1e8) },
      terms: free(i.terms, LIMITS.terms),
      sign: i.sign === undefined ? true : !!i.sign,
      split: !!i.split,
    };
  }

  // Everything is worked out in whole cents, in this order, and the PDF prints exactly these numbers:
  // line amounts -> subtotal -> discount -> markup on what is left -> tax on the taxable share -> total -> deposit -> balance.
  function calc(input) {
    const d = normalize(input);
    const lines = d.items.map(it => ({ cents: cents(it.qty * (it.rate === "" ? 0 : it.rate)), type: it.type, taxable: it.taxable }));
    const sum = f => lines.filter(f).reduce((a, l) => a + l.cents, 0);
    const subtotal = sum(() => true);
    const by = { labor: sum(l => l.type === "labor"), material: sum(l => l.type === "material"), other: sum(l => l.type === "other") };
    const taxableSub = sum(l => l.taxable);
    const discount = d.discount.mode === "pct" ? pctOf(subtotal, clamp(d.discount.value, 0, 100)) : Math.min(subtotal, cents(d.discount.value));
    const afterDiscount = subtotal - discount;
    const markup = pctOf(afterDiscount, d.markup.pct);
    const net = afterDiscount + markup;
    const taxableBase = subtotal > 0 ? Math.round((net * taxableSub) / subtotal) : 0;
    const tax = pctOf(taxableBase, d.tax.pct);
    const total = net + tax;
    const deposit = d.deposit.mode === "pct" ? pctOf(total, clamp(d.deposit.value, 0, 100)) : Math.min(total, cents(d.deposit.value));
    return { d, lines, by, subtotal, discount, afterDiscount, markup, net, taxableBase, tax, total, deposit, balance: total - deposit };
  }
  const validUntil = d => (isIso(d.issued) && d.validDays > 0 ? addDays(d.issued, d.validDays) : "");

  // Start from a trade's lines, terms and wording. Rates stay blank: the prices are yours.
  function applyTrade(input, key) {
    const t = TRADES[key];
    const d = normalize(input);
    if (!t) return d;
    d.items = t.items.map(([desc, type, unit]) => newItem(type, desc, unit));
    d.terms = termsFor(d.kind, key);
    return d;
  }
  function termsFor(kind, key) {
    const base = DEFAULT_TERMS.map(s => s.replace("{kind}", (KINDS[kind] || "estimate").toLowerCase()));
    const t = TRADES[key];
    if (t && t.extra) base.splice(2, 0, t.extra);
    return base.join("\n");
  }

  /* ---------------------------------------------------------------- layout */
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const tint = (c, k) => c.map(v => v + (1 - v) * k);
  const INK = [0.1, 0.1, 0.12], GRAY = [0.4, 0.4, 0.44], LIGHT = [0.58, 0.58, 0.62], RULE = [0.86, 0.86, 0.88];

  function layout(input) {
    const d = normalize(input), c = calc(d);
    const { w: W, h: H } = PAPER[d.paper];
    const L = 42, R = W - 42, CW = R - L, TOP = H - 42, BOT = 56;
    const acc = hex(d.accent);
    const lost = new Set();
    const S = s => { const r = clean(s, false); r.lost.forEach(x => lost.add(x)); return r.text; };
    const kindName = KINDS[d.kind];
    const pages = [[]];
    let P = pages[0], y = TOP;
    const T = (v, x, yy, s, f, col, a) => { if (v !== "") P.push({ t: "text", v, x, y: yy, s, f: f || "H", c: col || INK, a: a || "left" }); };
    const RECT = (x, yy, w, h, fill) => P.push({ t: "rect", x, y: yy, w, h, fill });
    const LINE = (x1, yy, x2, lw, col) => P.push({ t: "line", x1, y1: yy, x2, y2: yy, lw: lw || 0.6, c: col || RULE });
    const fit = (v, f, s, maxW) => fitLine(v, f, s, Math.min(s, 7), maxW);
    const putFit = (v, x, yy, s, f, col, maxW, a) => { const r = fit(v, f, s, maxW); T(r.text, x, yy, r.size, f, col, a); };

    const biz = S(d.from.name) || "Your business";
    function newPage() {
      P = []; pages.push(P); y = TOP;
      putFit(biz, L, y - 10, 10, "HB", INK, CW * 0.55);
      T(`${kindName} ${S(d.number)} (continued)`, R, y - 10, 9, "H", GRAY, "right");
      LINE(L, y - 18, R, 1, acc);
      y -= 34;
    }
    const need = (h, floor) => { if (y - h < (floor || BOT)) newPage(); };
    const money_ = v => S(money(v, d.currency));

    /* ---- header */
    let hx = L;
    let hy = y;
    if (d.from.logo) {
      const lh = 40, lw = Math.min(150, lh * d.from.logoRatio), lhh = Math.min(lh, lw / d.from.logoRatio);
      P.push({ t: "img", x: L, y: y - lhh, w: lw, h: lhh, src: "logo" });
      hx = L + lw + 12;
    }
    putFit(biz, hx, hy - 16, 17, "HB", INK, CW * 0.55 - (hx - L));
    let by = hy - 31;
    const contact = [S(d.from.phone), S(d.from.email)].filter(Boolean).join("  ·  ");
    if (contact) { putFit(contact, hx, by, 9, "H", GRAY, CW * 0.55 - (hx - L)); by -= 12; }
    if (d.from.address) { putFit(S(d.from.address), hx, by, 9, "H", GRAY, CW * 0.55 - (hx - L)); by -= 12; }
    if (d.from.license) { putFit("License: " + S(d.from.license), hx, by, 9, "H", GRAY, CW * 0.55 - (hx - L)); by -= 12; }
    T(kindName.toUpperCase(), R, hy - 20, 24, "HB", acc, "right");
    let ry = hy - 36;
    T(`No. ${S(d.number)}`, R, ry, 10, "HB", INK, "right"); ry -= 13;
    if (d.issued) { T(`Date: ${fmtDate(d.issued)}`, R, ry, 9.5, "H", GRAY, "right"); ry -= 12.5; }
    const vu = validUntil(d);
    if (vu) { T(`Valid until: ${fmtDate(vu)}`, R, ry, 9.5, "H", GRAY, "right"); ry -= 12.5; }
    y = Math.min(by, ry, hy - (d.from.logo ? 46 : 0)) - 8;
    LINE(L, y, R, 1.5, acc);
    y -= 20;

    /* ---- prepared for / job */
    const colW = (CW - 24) / 2;
    const cust = [d.to.name && ["HB", d.to.name], d.to.phone && ["H", d.to.phone], d.to.email && ["H", d.to.email], d.to.address && ["H", d.to.address]].filter(Boolean);
    const job = [d.job.title && ["HB", d.job.title], d.job.address && ["H", "Site: " + d.job.address]].filter(Boolean);
    const rows = Math.max(cust.length, job.length, 1);
    need(18 + rows * 13);
    T("PREPARED FOR", L, y, 7.5, "HB", LIGHT);
    T("JOB", L + colW + 24, y, 7.5, "HB", LIGHT);
    let cy = y - 13;
    (cust.length ? cust : [["H", ""]]).forEach(([f, v]) => { putFit(S(v), L, cy, f === "HB" ? 11 : 9.5, f, f === "HB" ? INK : GRAY, colW); cy -= 13; });
    let jy = y - 13;
    (job.length ? job : [["H", ""]]).forEach(([f, v]) => { putFit(S(v), L + colW + 24, jy, f === "HB" ? 11 : 9.5, f, f === "HB" ? INK : GRAY, colW); jy -= 13; });
    y = Math.min(cy, jy) - 8;

    /* ---- scope of work */
    const para = (text, s, lh, maxW, f, col) => {
      const out = [];
      for (const p of String(text).split("\n")) {
        const t = S(p);
        if (!t) { out.push(""); continue; }
        out.push(...wrap(t, f || "H", s, maxW, 80).lines);
      }
      while (out.length && out[out.length - 1] === "") out.pop();
      return out;
    };
    if (d.job.scope.trim()) {
      const lines = para(d.job.scope, 9.5, 12.5, CW - 20);
      need(34);
      T("SCOPE OF WORK", L, y, 7.5, "HB", LIGHT);
      y -= 12;
      let i = 0;
      while (i < lines.length) {
        const room = Math.max(1, Math.floor((y - BOT) / 12.5));
        const chunk = lines.slice(i, i + room);
        RECT(L, y - chunk.length * 12.5 - 4, CW, chunk.length * 12.5 + 10, tint(acc, 0.93));
        chunk.forEach((ln, k) => T(ln, L + 10, y - 7 - k * 12.5, 9.5, "H", INK));
        y -= chunk.length * 12.5 + 8;
        i += chunk.length;
        if (i < lines.length) { newPage(); }
      }
      y -= 14;
    }

    /* ---- line items */
    const X = { desc: L + 6, qty: L + 292 + 48 - 6, unit: L + 292 + 48 + 6, rate: L + 292 + 48 + 52 + 66 - 6, amt: R - 6 };
    const DW = 292 - 12;
    const header = () => {
      need(40);
      RECT(L, y - 14, CW, 18, tint(acc, 0.88));
      T("DESCRIPTION", X.desc, y - 8.5, 7.5, "HB", INK);
      T("QTY", X.qty, y - 8.5, 7.5, "HB", INK, "right");
      T("UNIT", X.unit, y - 8.5, 7.5, "HB", INK);
      T("RATE", X.rate, y - 8.5, 7.5, "HB", INK, "right");
      T("AMOUNT", X.amt, y - 8.5, 7.5, "HB", INK, "right");
      y -= 20;
    };
    if (d.items.length) {
      header();
      d.items.forEach((it, i) => {
        const dl = wrap(S(it.desc) || "(no description)", "H", 9.5, DW, 6).lines;
        const rh = dl.length * 12 + 8;
        if (y - rh < BOT) { newPage(); header(); }
        dl.forEach((ln, k) => T(ln, X.desc, y - 11 - k * 12, 9.5, "H", it.desc ? INK : LIGHT));
        const base = y - 11;
        if (it.qty) T(S(qtyText(it.qty)), X.qty, base, 9.5, "H", INK, "right");
        T(S(it.unit), X.unit, base, 9.5, "H", GRAY);
        if (it.rate !== "") T(S(rateText(it.rate, d.currency)), X.rate, base, 9.5, "H", INK, "right");
        T(money_(c.lines[i].cents), X.amt, base, 9.5, "HB", INK, "right");
        y -= rh;
        LINE(L, y + 1, R, 0.5, RULE);
      });
      y -= 12;
    }

    /* ---- totals (kept together) */
    const tot = [];
    if (d.split) for (const k of ["labor", "material", "other"]) if (c.by[k]) tot.push([TYPES[k], money_(c.by[k]), "gray"]);
    tot.push(["Subtotal", money_(c.subtotal), ""]);
    if (c.discount) tot.push([d.discount.mode === "pct" ? `Discount (${pctText(d.discount.value)})` : "Discount", "-" + money_(c.discount), ""]);
    if (c.markup) tot.push([`${d.markup.label} (${pctText(d.markup.pct)})`, money_(c.markup), ""]);
    if (c.tax) tot.push([`${d.tax.label} (${pctText(d.tax.pct)})`, money_(c.tax), ""]);
    const tw = 230, tx = R - tw;
    need(tot.length * 15 + 40 + (c.deposit ? 32 : 0));
    tot.forEach(([l, v, k]) => {
      putFit(S(l), tx, y - 10, 9.5, "H", k === "gray" ? LIGHT : GRAY, tw - 90);
      T(v, R, y - 10, 9.5, "H", k === "gray" ? LIGHT : INK, "right");
      y -= 15;
    });
    y -= 4;
    RECT(tx - 8, y - 22, tw + 8 + 0, 26, tint(acc, 0.88));
    T("TOTAL", tx, y - 14.5, 10, "HB", INK);
    T(money_(c.total), R - 6, y - 15, 13, "HB", acc, "right");
    y -= 34;
    if (c.deposit) {
      T(d.deposit.mode === "pct" ? `Deposit due to start (${pctText(d.deposit.value)})` : "Deposit due to start", tx, y - 6, 9.5, "H", GRAY);
      T(money_(c.deposit), R, y - 6, 9.5, "HB", INK, "right");
      T("Balance due on completion", tx, y - 21, 9.5, "H", GRAY);
      T(money_(c.balance), R, y - 21, 9.5, "HB", INK, "right");
      y -= 32;
    }
    y -= 10;

    /* ---- terms */
    if (d.terms.trim()) {
      const lines = para(d.terms, 8.5, 11.5, CW);
      need(36);
      T("TERMS", L, y, 7.5, "HB", LIGHT);
      y -= 11;
      for (const ln of lines) {
        if (y - 11.5 < BOT) { newPage(); }
        if (ln !== "") T(ln, L, y - 8, 8.5, "H", GRAY);
        y -= ln === "" ? 6 : 11.5;
      }
      y -= 10;
    }

    /* ---- acceptance (kept together) */
    if (d.sign) {
      need(72, 46);
      T(d.kind === "estimate" ? "ACCEPTED: please sign to approve this estimate" : `ACCEPTED: please sign to accept this ${kindName.toLowerCase()}`, L, y - 8, 7.5, "HB", LIGHT);
      y -= 42;
      const half = (CW - 36) / 2;
      [[L, "Customer signature"], [L + half + 36, `${biz === "Your business" ? "Contractor" : biz} signature`]].forEach(([x, label]) => {
        LINE(x, y, x + half * 0.68, 0.8, INK);
        LINE(x + half * 0.74, y, x + half, 0.8, INK);
        putFit(S(label), x, y - 10, 8, "H", GRAY, half * 0.68);
        T("Date", x + half * 0.74, y - 10, 8, "H", GRAY);
      });
      y -= 22;
    }

    /* ---- footer on every page */
    const total = pages.length;
    pages.forEach((pg, i) => {
      pg.push({ t: "line", x1: L, y1: 40, x2: R, y2: 40, lw: 0.5, c: RULE });
      pg.push({ t: "text", v: `${kindName} ${S(d.number)}${d.from.name ? " · " + S(d.from.name) : ""}`, x: L, y: 28, s: 7.5, f: "H", c: LIGHT, a: "left" });
      pg.push({ t: "text", v: "Made with Quotewell · estimate.roohsites.com", x: W / 2, y: 28, s: 7.5, f: "H", c: LIGHT, a: "center" });
      pg.push({ t: "text", v: `Page ${i + 1} of ${total}`, x: R, y: 28, s: 7.5, f: "H", c: LIGHT, a: "right" });
    });
    return { pages, W, H, totals: c, lost: [...lost], doc: d };
  }

  /* ---------------------------------------------------------------- outputs */
  const rgb = c => `rgb(${c.map(v => Math.round(v * 255)).join(",")})`;
  const xml = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  function svgPage(prims, W, H, logo) {
    const body = prims.map(p => {
      if (p.t === "rect") return `<rect x="${p.x.toFixed(2)}" y="${(H - p.y - p.h).toFixed(2)}" width="${p.w.toFixed(2)}" height="${p.h.toFixed(2)}" fill="${rgb(p.fill)}"/>`;
      if (p.t === "line") return `<line x1="${p.x1.toFixed(2)}" y1="${(H - p.y1).toFixed(2)}" x2="${p.x2.toFixed(2)}" y2="${(H - p.y2).toFixed(2)}" stroke="${rgb(p.c)}" stroke-width="${p.lw}"/>`;
      if (p.t === "img") return logo ? `<image x="${p.x.toFixed(2)}" y="${(H - p.y - p.h).toFixed(2)}" width="${p.w.toFixed(2)}" height="${p.h.toFixed(2)}" href="${xml(logo)}" preserveAspectRatio="xMidYMid meet"/>` : "";
      const anchor = p.a === "center" ? "middle" : p.a === "right" ? "end" : "start";
      return `<text x="${p.x.toFixed(2)}" y="${(H - p.y).toFixed(2)}" font-size="${p.s.toFixed(2)}" font-family="Helvetica,Arial,sans-serif" font-weight="${p.f === "HB" ? 700 : 400}" fill="${rgb(p.c)}" text-anchor="${anchor}" xml:space="preserve">${xml(p.v)}</text>`;
    }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"><rect width="${W}" height="${H}" fill="#fff"/>${body}</svg>`;
  }

  async function buildPdf(Lib, input) {
    const lay = layout(input);
    const doc = await Lib.PDFDocument.create();
    const d = lay.doc;
    doc.setTitle(`${KINDS[d.kind]} ${d.number}${d.from.name ? " (" + d.from.name + ")" : ""}`.slice(0, 120));
    doc.setCreator("Quotewell, estimate.roohsites.com");
    doc.setProducer("pdf-lib");
    const F = { H: await doc.embedFont(Lib.StandardFonts.Helvetica), HB: await doc.embedFont(Lib.StandardFonts.HelveticaBold) };
    let logo = null;
    if (d.from.logo) {
      try {
        const bytes = Uint8Array.from(atobSafe(d.from.logo.split(",")[1]), ch => ch.charCodeAt(0));
        logo = d.from.logo.startsWith("data:image/png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      } catch (e) { logo = null; }
    }
    const col = v => Lib.rgb(v[0], v[1], v[2]);
    for (const prims of lay.pages) {
      const page = doc.addPage([lay.W, lay.H]);
      for (const p of prims) {
        if (p.t === "rect") page.drawRectangle({ x: p.x, y: p.y, width: p.w, height: p.h, color: col(p.fill) });
        else if (p.t === "line") page.drawLine({ start: { x: p.x1, y: p.y1 }, end: { x: p.x2, y: p.y2 }, thickness: p.lw, color: col(p.c) });
        else if (p.t === "img") { if (logo) page.drawImage(logo, { x: p.x, y: p.y, width: p.w, height: p.h }); }
        else {
          const w = textW(p.v, p.f, p.s);
          page.drawText(p.v, { x: p.a === "center" ? p.x - w / 2 : p.a === "right" ? p.x - w : p.x, y: p.y, size: p.s, font: F[p.f], color: col(p.c) });
        }
      }
    }
    return { bytes: await doc.save(), pages: lay.pages.length, lost: lay.lost, totals: lay.totals };
  }
  function atobSafe(b64) { return typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary"); }

  // A plain-text copy for a text message or email.
  function toText(input) {
    const c = calc(input), d = c.d, m = v => money(v, d.currency);
    const out = [`${KINDS[d.kind].toUpperCase()} ${d.number}`];
    if (d.from.name) out.push(`From: ${d.from.name}${d.from.phone ? ", " + d.from.phone : ""}`);
    if (d.to.name) out.push(`For: ${d.to.name}`);
    if (d.job.title) out.push(`Job: ${d.job.title}`);
    if (d.issued) out.push(`Date: ${fmtDate(d.issued)}${validUntil(d) ? " · valid until " + fmtDate(validUntil(d)) : ""}`);
    out.push("");
    d.items.forEach((it, i) => out.push(`- ${it.desc || "(no description)"}: ${it.qty ? qtyText(it.qty) + (it.unit ? " " + it.unit : "") + " x " + (it.rate === "" ? "?" : rateText(it.rate, d.currency)) + " = " : ""}${m(c.lines[i].cents)}`));
    out.push("");
    out.push(`Subtotal: ${m(c.subtotal)}`);
    if (c.discount) out.push(`Discount: -${m(c.discount)}`);
    if (c.markup) out.push(`${d.markup.label}: ${m(c.markup)}`);
    if (c.tax) out.push(`${d.tax.label}: ${m(c.tax)}`);
    out.push(`TOTAL: ${m(c.total)}`);
    if (c.deposit) out.push(`Deposit to start: ${m(c.deposit)} · balance on completion: ${m(c.balance)}`);
    return out.join("\n");
  }

  return { KINDS, PREFIX, PAPER, CURRENCIES, ACCENTS, TYPES, LIMITS, TRADES, DEFAULTS, clean, textW, wrap, fitLine, num, cents, pctOf, isIso, addDays, fmtDate, today, nextNumber, money, rateText, qtyText, pctText, newItem, normalize, calc, validUntil, applyTrade, termsFor, layout, svgPage, buildPdf, toText };
});
