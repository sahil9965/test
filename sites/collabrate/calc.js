/* CollabRate pricing engine. Pure functions, no DOM. Used by the browser app (window.CRCalc),
   the page generator (methodology tables) and the Node unit tests (module.exports).
   Every number here is an editable starting point, not market data. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CRCalc = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const REVIEWED = "2026-10-08";
  const SITE = "https://ugcrates.roohsites.com";
  const DOMAIN = "ugcrates.roohsites.com";
  const CREDIT = "Made with CollabRate · " + DOMAIN;
  const REF = SITE + "/?utm_source=collabrate&utm_medium=watermark&utm_campaign=referral";

  // fx: rough multiplier used only to convert the US-dollar presets into a sensible local number.
  const CURRENCIES = {
    USD: { locale: "en-US", fx: 1, step: 5, paper: "letter", name: "US dollar" },
    EUR: { locale: "en-IE", fx: 0.9, step: 5, paper: "a4", name: "euro" },
    GBP: { locale: "en-GB", fx: 0.8, step: 5, paper: "a4", name: "British pound" },
    INR: { locale: "en-IN", fx: 85, step: 500, paper: "a4", name: "Indian rupee" },
    AUD: { locale: "en-AU", fx: 1.5, step: 5, paper: "a4", name: "Australian dollar" },
    CAD: { locale: "en-CA", fx: 1.4, step: 5, paper: "letter", name: "Canadian dollar" },
  };

  // Base rate = one edited UGC video up to 60 s, organic use only, one revision round.
  const LEVELS = {
    beginner: { label: "Beginner", hint: "no paid briefs or portfolio yet", usd: 100, range: [50, 150] },
    building: { label: "Building", hint: "a few brand projects done", usd: 200, range: [150, 300] },
    experienced: { label: "Experienced", hint: "repeat clients, proven ad results", usd: 400, range: [300, 600] },
  };

  // Deliverables: unit price = factor × base rate (unless the creator types a price).
  const ITEMS = {
    video: { label: "UGC video (up to 60 s)", short: "video", factor: 1, range: [1, 1], why: "Your base rate: one edited video with organic use and one revision round." },
    long: { label: "Long UGC video (over 60 s)", short: "long video", factor: 1.5, range: [1.25, 1.75], why: "More scripting, filming and editing time than a short video." },
    hook: { label: "Extra hook (alternate opening)", short: "extra hook", factor: 0.2, range: [0.1, 0.3], why: "A new first 3–5 seconds on a video you already made, so the brand can test ads." },
    photo: { label: "Product photo", short: "photo", factor: 0.25, range: [0.15, 0.35], why: "One edited still image, usually shot during the same session." },
    custom: { label: "Custom item", short: "item", factor: 0, range: [0, 0], why: "Anything else, at a price you set." },
  };

  // Paid usage: the brand runs your content as ads from its own accounts. % of the content fee.
  const USAGE = {
    none: { label: "Organic only", long: "Organic use only (no paid ads)", pct: 0, range: [0, 0] },
    "30d": { label: "30 days", long: "30 days of paid usage", days: 30, pct: 25, range: [20, 30] },
    "60d": { label: "60 days", long: "60 days of paid usage", days: 60, pct: 40, range: [30, 50] },
    "90d": { label: "90 days", long: "90 days of paid usage", days: 90, pct: 50, range: [40, 60] },
    "6m": { label: "6 months", long: "6 months of paid usage", months: 6, pct: 75, range: [60, 90] },
    "12m": { label: "12 months", long: "12 months of paid usage", months: 12, pct: 100, range: [80, 120] },
    perpetual: { label: "Perpetual", long: "Perpetual paid usage (no end date)", pct: 150, range: [100, 200] },
  };
  const USAGE_ORDER = ["none", "30d", "60d", "90d", "6m", "12m", "perpetual"];

  const ADDONS = {
    whitelist: { label: "Whitelisting / Spark Ads", pct: 20, range: [15, 30], per: "month", why: "Ads run from your account, using your name and audience trust. Charged for each month of access." },
    competitors: { label: "Exclusivity: named competitors", pct: 10, range: [5, 15], per: "month", why: "You turn down work from the brands you list for the period." },
    category: { label: "Exclusivity: whole category", pct: 20, range: [15, 30], per: "month", why: "You turn down a whole product category (for example all skincare), which costs more future work." },
    raw: { label: "Raw footage", pct: 40, range: [25, 60], why: "Unedited clips let the brand cut new ads without you, so it replaces future editing work." },
    revision: { label: "Extra revision round", pct: 15, range: [10, 20], per: "round", why: "The base rate includes one round; more rounds take more filming or editing time." },
    rush: { label: "Rush delivery", pct: 25, range: [20, 50], why: "Moving other work around to deliver faster than your normal turnaround." },
  };

  const PAYMENT_TERMS = {
    "50-50": "50% upfront, 50% on delivery",
    "100-up": "100% upfront, before filming",
    net15: "Net 15: payment within 15 days of delivery",
    net30: "Net 30: payment within 30 days of delivery",
    custom: "",
  };

  const DEAL_STATUSES = ["Quoted", "Negotiating", "Accepted", "Delivered", "Invoiced", "Paid", "Declined"];

  // ---------- small helpers ----------
  const num = (v, d = 0) => { const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : +v; return Number.isFinite(n) ? n : d; };
  const clamp = (v, lo, hi, d = lo) => Math.min(hi, Math.max(lo, num(v, d)));
  const int = (v, lo, hi, d = lo) => Math.round(clamp(v, lo, hi, d));
  const str = (v, max = 200) => String(v == null ? "" : v).slice(0, max);
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const fmtPct = p => (Math.round(p * 100) / 100).toString() + "%";

  function niceRound(v, step) { return Math.max(step, Math.round(v / step) * step); }
  function levelBase(level, currency) {
    const L = LEVELS[level] || LEVELS.building, C = CURRENCIES[currency] || CURRENCIES.USD;
    return niceRound(L.usd * C.fx, C.step);
  }
  function levelRange(level, currency) {
    const L = LEVELS[level] || LEVELS.building, C = CURRENCIES[currency] || CURRENCIES.USD;
    return L.range.map(v => niceRound(v * C.fx, C.step));
  }

  const fmtCache = {};
  function money(n, currency = "USD") {
    const C = CURRENCIES[currency] ? currency : "USD";
    const f = fmtCache[C] || (fmtCache[C] = new Intl.NumberFormat(CURRENCIES[C].locale, { style: "currency", currency: C, minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    return f.format(Math.round(n)).replace(/\u00a0/g, " ");
  }

  // ---------- state ----------
  function defaults(currency = "USD", level = "building") {
    return {
      currency, level, base: levelBase(level, currency),
      items: [{ type: "video", qty: 1, price: null, label: "" }],
      discount: 0,
      usage: "none", usagePct: 0,
      wlMonths: 0, wlPct: ADDONS.whitelist.pct,
      exMonths: 0, exScope: "competitors", exPct: ADDONS.competitors.pct,
      raw: false, rawPct: ADDONS.raw.pct,
      revisions: 0, revPct: ADDONS.revision.pct,
      rush: false, rushPct: ADDONS.rush.pct,
    };
  }

  // Coerces anything (old autosave, a share link, form strings) into a valid calculator state.
  function normalize(input) {
    const i = input && typeof input === "object" ? input : {};
    const currency = CURRENCIES[i.currency] ? i.currency : "USD";
    const level = LEVELS[i.level] ? i.level : (i.level === "custom" ? "custom" : "building");
    const d = defaults(currency, LEVELS[level] ? level : "building");
    const items = (Array.isArray(i.items) ? i.items : d.items).slice(0, 30).map(it => {
      const type = ITEMS[it && it.type] ? it.type : "video";
      const p = it && it.price !== null && it.price !== undefined && it.price !== "" ? num(it.price, NaN) : NaN;
      return { type, qty: int(it && it.qty, 0, 999, 1), price: Number.isFinite(p) ? clamp(p, 0, 1e9) : (type === "custom" ? 0 : null), label: str(it && it.label, 80) };
    });
    const usage = USAGE[i.usage] ? i.usage : "none";
    const exScope = i.exScope === "category" ? "category" : "competitors";
    const pctOr = (v, dflt) => (v === undefined || v === null || v === "" ? dflt : clamp(v, 0, 1000, dflt));
    return {
      currency, level,
      base: clamp(i.base === undefined ? d.base : i.base, 0, 1e9, d.base),
      items,
      discount: clamp(i.discount, 0, 90, 0),
      usage, usagePct: usage === "none" ? 0 : pctOr(i.usagePct, USAGE[usage].pct),
      wlMonths: int(i.wlMonths, 0, 12, 0), wlPct: pctOr(i.wlPct, ADDONS.whitelist.pct),
      exMonths: int(i.exMonths, 0, 12, 0), exScope, exPct: pctOr(i.exPct, ADDONS[exScope].pct),
      raw: !!i.raw, rawPct: pctOr(i.rawPct, ADDONS.raw.pct),
      revisions: int(i.revisions, 0, 6, 0), revPct: pctOr(i.revPct, ADDONS.revision.pct),
      rush: !!i.rush, rushPct: pctOr(i.rushPct, ADDONS.rush.pct),
    };
  }

  function unitPrice(s, it) {
    if (it.price !== null && it.price !== undefined) return Math.round(it.price);
    return Math.round(s.base * ITEMS[it.type].factor);
  }

  // ---------- the calculation ----------
  // All money is rounded to whole currency units per line, and totals are sums of the
  // rounded lines, so every table adds up exactly.
  function compute(input) {
    const s = normalize(input);
    const lines = s.items.filter(it => it.qty > 0).map(it => {
      const unit = unitPrice(s, it);
      const label = it.type === "custom" ? (it.label.trim() || "Custom item") : (it.label.trim() || ITEMS[it.type].label);
      return { type: it.type, label, qty: it.qty, unit, amount: unit * it.qty, auto: it.price === null };
    });
    const gross = sum(lines, l => l.amount);
    const discountAmt = Math.round(gross * s.discount / 100);
    const content = gross - discountAmt;
    const addons = [];
    const add = (key, label, detail, pct, mult, range, dflt) => {
      const f = p => Math.round(content * p / 100 * mult);
      addons.push({ key, label, detail, pct, mult, amount: f(pct), low: f(Math.min(range[0], pct)), high: f(Math.max(range[1], pct)), range, custom: pct !== dflt });
    };
    if (s.usage !== "none") {
      const U = USAGE[s.usage];
      add("usage", `Paid usage: ${U.label.toLowerCase()}`, `${fmtPct(s.usagePct)} of content fee`, s.usagePct, 1, U.range, U.pct);
    }
    if (s.wlMonths > 0) add("whitelist", `Whitelisting / Spark Ads: ${plural(s.wlMonths, "month")}`, `${fmtPct(s.wlPct)} of content fee × ${plural(s.wlMonths, "month")}`, s.wlPct, s.wlMonths, ADDONS.whitelist.range, ADDONS.whitelist.pct);
    if (s.exMonths > 0) {
      const A = ADDONS[s.exScope];
      add("exclusivity", `Exclusivity (${s.exScope === "category" ? "whole category" : "named competitors"}): ${plural(s.exMonths, "month")}`, `${fmtPct(s.exPct)} of content fee × ${plural(s.exMonths, "month")}`, s.exPct, s.exMonths, A.range, A.pct);
    }
    if (s.raw) add("raw", "Raw footage", `${fmtPct(s.rawPct)} of content fee`, s.rawPct, 1, ADDONS.raw.range, ADDONS.raw.pct);
    if (s.revisions > 0) add("revisions", `Extra revision rounds: ${s.revisions}`, `${fmtPct(s.revPct)} of content fee × ${plural(s.revisions, "round")}`, s.revPct, s.revisions, ADDONS.revision.range, ADDONS.revision.pct);
    if (s.rush) add("rush", "Rush delivery", `${fmtPct(s.rushPct)} of content fee`, s.rushPct, 1, ADDONS.rush.range, ADDONS.rush.pct);
    const addTotal = sum(addons, a => a.amount);
    const total = content + addTotal;
    const low = content + sum(addons, a => a.low), high = content + sum(addons, a => a.high);

    const warnings = [];
    if (!lines.length || gross === 0) warnings.push("Add at least one deliverable with a price above zero.");
    if (s.wlMonths > 0 && s.usage === "none") warnings.push("Whitelisting means the brand runs paid ads, so you'd normally also charge paid usage for the same period.");
    else if (s.wlMonths > 0 && s.usage !== "perpetual" && usageDays(s.usage) < s.wlMonths * 30) warnings.push(`Paid usage (${USAGE[s.usage].label.toLowerCase()}) is shorter than whitelisting (${plural(s.wlMonths, "month")}). Most creators match the two.`);
    if (s.discount >= 40) warnings.push("A package discount this large cuts into every add-on too, because add-ons are a percentage of the content fee.");

    return { state: s, currency: s.currency, lines, gross, discountPct: s.discount, discountAmt, content, addons, addTotal, total, low, high, warnings };
  }

  function usageDays(id) { const U = USAGE[id]; return U.days || (U.months ? U.months * 30 : U === USAGE.perpetual ? Infinity : 0); }

  // Same deliverables and extras, different paid-usage windows: lets a brand pick.
  function usageOptions(input, ids = ["none", "30d", "90d", "perpetual"]) {
    const s = normalize(input);
    let list = ids.slice();
    if (!list.includes(s.usage)) list.push(s.usage);
    // With whitelisting, offer only usage windows that cover the whitelisting period.
    if (s.wlMonths > 0) list = list.filter(id => id === s.usage || (id !== "none" && usageDays(id) >= s.wlMonths * 30));
    list = USAGE_ORDER.filter(id => list.includes(id));
    return list.map(id => {
      const t = { ...s, usage: id, usagePct: id === s.usage ? s.usagePct : USAGE[id].pct };
      return { id, label: USAGE[id].long, total: compute(t).total, current: id === s.usage };
    });
  }

  function deliverablesSummary(c) {
    // "3 videos, 6 extra hooks" for standard items; "2 × Story frame" for custom labels.
    return c.lines.map(l => (l.type === "custom" || l.label !== ITEMS[l.type].label
      ? `${l.qty} × ${l.label}` : plural(l.qty, ITEMS[l.type].short))).join(", ");
  }

  // ---------- dates (all date-only, UTC, no time zones involved) ----------
  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
  }
  const isoOf = d => d.toISOString().slice(0, 10);
  function addDays(s, n) { const d = parseDate(s); if (!d) return ""; d.setUTCDate(d.getUTCDate() + n); return isoOf(d); }
  // Last day (inclusive) of a period of n months that starts on `s`.
  // 1 Nov + 6 months ends 30 Apr; 31 Jan + 1 month ends on the last day of February.
  function monthsEnd(s, n) {
    const d = parseDate(s); if (!d) return "";
    const y = d.getUTCFullYear(), tm = d.getUTCMonth() + n, day = d.getUTCDate();
    const last = new Date(Date.UTC(y, tm + 1, 0)).getUTCDate();
    return isoOf(new Date(Date.UTC(y, tm, day > last ? last : day - 1)));
  }
  function usageEnd(start, id) {
    const U = USAGE[id];
    if (!parseDate(start) || !U || id === "none" || id === "perpetual") return "";
    return U.days ? addDays(start, U.days - 1) : monthsEnd(start, U.months);
  }
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(s) { const d = parseDate(s); return d ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : ""; }

  // ---------- quote wording ----------
  function rightsTerms(c, q = {}) {
    const s = c.state, out = [];
    const start = parseDate(q.rightsStart) ? q.rightsStart : "";
    const span = end => (start ? ` (${fmtDate(start)} to ${fmtDate(end)})` : ", starting on the delivery date");
    if (s.usage === "none") out.push("Usage: the brand may post the content organically on its own social channels and website. Paid ads are not included.");
    else if (s.usage === "perpetual") out.push("Paid usage: the brand may run the content as paid ads from its own accounts, with no end date. Organic posting is included.");
    else out.push(`Paid usage: the brand may run the content as paid ads from its own accounts for ${USAGE[s.usage].label}${span(usageEnd(start, s.usage))}. Organic posting is included.`);
    if (s.wlMonths > 0) out.push(`Whitelisting / Spark Ads: the brand may run ads through the creator's account for ${plural(s.wlMonths, "month")}${span(start ? monthsEnd(start, s.wlMonths) : "")}, using the platform's own ad-authorisation tools. The creator keeps ownership and control of the account.`);
    if (s.exMonths > 0) out.push(`Exclusivity: the creator won't make content for ${s.exScope === "category" ? "other brands in the same product category" : "the direct competitors named by the brand"} for ${plural(s.exMonths, "month")}${span(start ? monthsEnd(start, s.exMonths) : "")}.`);
    if (s.raw) out.push("Raw footage: unedited source clips are delivered along with the final edits.");
    const rounds = 1 + s.revisions;
    out.push(`Revisions: ${plural(rounds, "round")} of revisions included.`);
    const dd = int(q.deliveryDays, 0, 365, 0);
    if (dd > 0) out.push(`Delivery: within ${plural(dd, "day")} of receiving the product${s.rush ? " (rush turnaround)" : ""}.`);
    else if (s.rush) out.push("Delivery: rush turnaround, faster than the standard timeline.");
    const pay = q.payment === "custom" ? str(q.paymentCustom, 200).trim() : PAYMENT_TERMS[q.payment] || "";
    if (pay) out.push(`Payment: ${pay.replace(/\.$/, "")}.`);
    return out;
  }

  function validUntil(q) { const d = parseDate(q.date) ? q.date : ""; const n = int(q.validDays, 0, 365, 14); return d && n ? addDays(d, n) : ""; }

  function pitchEmail(c, profile = {}, q = {}) {
    const cur = c.currency, brand = str(q.brand, 80).trim() || "your brand";
    const first = (str(q.contact, 80).trim().split(/\s+/)[0] || "").replace(/[,;]$/, "");
    const project = str(q.project, 120).trim();
    const lines = [];
    lines.push(`Hi ${first || "there"},`, "");
    lines.push(project ? `Thanks for sending over the brief for ${project}. Here's my quote:` : `Thanks for reaching out about a UGC collaboration with ${brand}. Here's my quote:`, "");
    c.lines.forEach(l => lines.push(`- ${l.qty} × ${l.label}: ${money(l.amount, cur)}`));
    if (c.discountAmt) lines.push(`- Package discount (${fmtPct(c.discountPct)}): −${money(c.discountAmt, cur)}`);
    c.addons.forEach(a => lines.push(`- ${a.label}: ${money(a.amount, cur)}`));
    lines.push("", `Total: ${money(c.total, cur)} (${cur})`, "");
    rightsTerms(c, q).forEach(t => lines.push(t));
    const vu = validUntil(q);
    if (vu) lines.push(`This quote is valid until ${fmtDate(vu)}.`);
    lines.push("");
    if (c.state.usage !== "none" || c.state.wlMonths > 0) lines.push("If the budget is tight, I'm happy to adjust the package, for example with a shorter usage window or fewer hooks.", "");
    lines.push("I've attached a PDF with the full breakdown. Let me know if you have any questions.", "", "Best,");
    const sig = [str(profile.name, 80).trim(), [str(profile.handle, 60).trim(), str(profile.email, 120).trim(), str(profile.website, 120).trim()].filter(Boolean).join(" · ")].filter(Boolean);
    lines.push(...(sig.length ? sig : ["[Your name]"]));
    const what = c.lines.length ? deliverablesSummary(c) : "UGC content";
    return { subject: `UGC quote for ${brand}: ${what}`, body: lines.join("\n") };
  }

  // ---------- rate card numbers ----------
  const CARD_ADDONS = {
    hook: "Extra hook", photo: "Product photo", usage30: "Paid usage, 30 days", usage90: "Paid usage, 90 days",
    usage12m: "Paid usage, 12 months", perpetual: "Paid usage, perpetual", whitelist: "Whitelisting / Spark Ads",
    exclusivity: "Exclusivity", raw: "Raw footage", rush: "Rush delivery", revision: "Extra revision round",
  };
  function cardDefaults() {
    return {
      template: "studio", mode: "prices", addonMode: "pct", title: "UGC rate card", accent: "#a21caf",
      packages: [{ label: "1 video", qty: 1, disc: 0 }, { label: "3 videos", qty: 3, disc: 10 }, { label: "5 videos", qty: 5, disc: 15 }],
      show: { hook: true, photo: false, usage30: true, usage90: true, usage12m: false, perpetual: false, whitelist: true, exclusivity: false, raw: true, rush: true, revision: false },
      included: "Edited, ready-to-post video\nOrganic use on your brand's channels\n1 round of revisions\nDelivery within 7 days of receiving the product",
      note: "Every brief is different. Send me yours for a custom quote.",
    };
  }
  function normalizeCard(input) {
    const d = cardDefaults(), i = input && typeof input === "object" ? input : {};
    const show = {};
    Object.keys(CARD_ADDONS).forEach(k => { show[k] = i.show && k in i.show ? !!i.show[k] : d.show[k]; });
    const pk = (Array.isArray(i.packages) ? i.packages : d.packages).slice(0, 4).map(p => ({ label: str(p && p.label, 40), qty: int(p && p.qty, 0, 99, 1), disc: clamp(p && p.disc, 0, 90, 0) }));
    return {
      template: ["studio", "bold", "soft"].includes(i.template) ? i.template : d.template,
      mode: ["prices", "from", "request"].includes(i.mode) ? i.mode : d.mode,
      addonMode: i.addonMode === "amount" ? "amount" : "pct",
      title: i.title === undefined ? d.title : str(i.title, 40),
      accent: /^#[0-9a-f]{6}$/i.test(i.accent || "") ? i.accent.toLowerCase() : d.accent,
      packages: pk, show,
      included: i.included === undefined ? d.included : str(i.included, 600),
      note: i.note === undefined ? d.note : str(i.note, 160),
    };
  }
  // Returns the text rows a rate card shows. Percent add-ons use the creator's own settings
  // where they apply, otherwise the methodology defaults.
  function cardRows(calcState, cardInput) {
    const s = normalize(calcState), card = normalizeCard(cardInput), cur = s.currency, req = card.mode === "request";
    const pre = card.mode === "from" ? "From " : "";
    const packages = card.packages.filter(p => p.qty > 0).map(p => {
      const price = Math.round(p.qty * s.base * (1 - p.disc / 100));
      return { label: p.label.trim() || plural(p.qty, "video"), price, value: req ? "" : pre + money(price, cur), save: p.disc > 0 ? `save ${fmtPct(p.disc)}` : "" };
    });
    const pctRow = (label, pct, per) => {
      const unit = per ? ` per ${per}` : "";
      const v = card.addonMode === "amount" ? `+${money(Math.round(s.base * pct / 100), cur)} per video${unit}` : `+${fmtPct(pct)}${unit}`;
      return { label, value: req ? "" : v };
    };
    const usagePct = id => (s.usage === id ? s.usagePct : USAGE[id].pct);
    const rows = [];
    const sh = card.show;
    if (sh.hook) rows.push({ label: CARD_ADDONS.hook, value: req ? "" : `${money(Math.round(s.base * ITEMS.hook.factor), cur)} each` });
    if (sh.photo) rows.push({ label: CARD_ADDONS.photo, value: req ? "" : `${money(Math.round(s.base * ITEMS.photo.factor), cur)} each` });
    if (sh.usage30) rows.push(pctRow(CARD_ADDONS.usage30, usagePct("30d")));
    if (sh.usage90) rows.push(pctRow(CARD_ADDONS.usage90, usagePct("90d")));
    if (sh.usage12m) rows.push(pctRow(CARD_ADDONS.usage12m, usagePct("12m")));
    if (sh.perpetual) rows.push(pctRow(CARD_ADDONS.perpetual, usagePct("perpetual")));
    if (sh.whitelist) rows.push(pctRow(CARD_ADDONS.whitelist, s.wlPct, "month"));
    if (sh.exclusivity) rows.push(pctRow(`${CARD_ADDONS.exclusivity} (${s.exScope === "category" ? "category" : "competitors"})`, s.exPct, "month"));
    if (sh.raw) rows.push(pctRow(CARD_ADDONS.raw, s.rawPct));
    if (sh.rush) rows.push(pctRow(CARD_ADDONS.rush, s.rushPct));
    if (sh.revision) rows.push(pctRow(CARD_ADDONS.revision, s.revPct, "round"));
    const included = card.included.split("\n").map(x => x.trim()).filter(Boolean).slice(0, 8);
    return { card, packages, addons: rows, included, currency: cur, request: req };
  }

  // ---------- deals tracker: CSV and iCalendar ----------
  function csvCell(v) {
    let t = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(t) && !/^-?\d+(\.\d+)?$/.test(t)) t = "'" + t; // spreadsheet formula injection guard
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  }
  function dealDates(deal) {
    const s = normalize(deal.calc), start = parseDate(deal.rightsStart) ? deal.rightsStart : "";
    return {
      usageEnd: start ? usageEnd(start, s.usage) : "",
      whitelistEnd: start && s.wlMonths ? monthsEnd(start, s.wlMonths) : "",
      exclusivityEnd: start && s.exMonths ? monthsEnd(start, s.exMonths) : "",
    };
  }
  function dealsCSV(deals) {
    const head = ["Quote #", "Brand", "Project", "Quote date", "Status", "Currency", "Total", "Deliverables", "Paid usage", "Rights start", "Usage ends", "Whitelisting ends", "Exclusivity ends", "Delivery due", "Payment due"];
    const rows = deals.map(d => {
      const c = compute(d.calc), dt = dealDates(d);
      return [d.no, d.brand, d.project, d.date, d.status, c.currency, c.total, deliverablesSummary(c), USAGE[c.state.usage].label, d.rightsStart, dt.usageEnd, dt.whitelistEnd, dt.exclusivityEnd, d.deliveryDue, d.paymentDue];
    });
    return [head, ...rows].map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }
  function icsEscape(t) { return String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  // RFC 5545 line folding: max 75 octets per line, continuation lines start with a space.
  function icsFold(line) {
    const enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
    const len = ch => (enc ? enc.encode(ch).length : unescape(encodeURIComponent(ch)).length);
    const out = []; let cur = "", n = 0;
    for (const ch of line) {
      const l = len(ch);
      if (n + l > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; }
      cur += ch; n += l;
    }
    out.push(cur);
    return out.join("\r\n ");
  }
  function dealEvents(deal) {
    const dt = dealDates(deal), s = normalize(deal.calc), who = `${deal.brand || "Brand deal"}${deal.no ? ` (${deal.no})` : ""}`, ev = [];
    if (parseDate(deal.deliveryDue)) ev.push({ kind: "delivery", date: deal.deliveryDue, summary: `Content due: ${who}`, text: `Deliver the content for ${who}.` });
    if (parseDate(deal.paymentDue)) ev.push({ kind: "payment", date: deal.paymentDue, summary: `Payment due: ${who}`, text: `Payment for ${who} is due today. Check it has arrived.` });
    if (dt.usageEnd) ev.push({ kind: "usage", date: dt.usageEnd, summary: `Paid usage ends: ${who}`, text: `Last day of ${USAGE[s.usage].label} paid usage for ${who}. After today the brand needs to renew usage rights to keep running the ads.` });
    if (dt.whitelistEnd) ev.push({ kind: "whitelist", date: dt.whitelistEnd, summary: `Whitelisting ends: ${who}`, text: `Last day of whitelisting / Spark Ads access for ${who}. Remove the ad authorisation or agree a renewal.` });
    if (dt.exclusivityEnd) ev.push({ kind: "exclusivity", date: dt.exclusivityEnd, summary: `Exclusivity ends: ${who}`, text: `Last day of exclusivity for ${who}. From tomorrow you're free to work with competing brands.` });
    return ev;
  }
  function dealsICS(deals, now = new Date()) {
    const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CollabRate//Brand deal reminders//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Brand deals (CollabRate)"];
    for (const d of deals) for (const e of dealEvents(d)) {
      const day = e.date.replace(/-/g, "");
      L.push("BEGIN:VEVENT", `UID:${str(d.id, 60).replace(/[^\w-]/g, "")}-${e.kind}@${DOMAIN}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${addDays(e.date, 1).replace(/-/g, "")}`,
        `SUMMARY:${icsEscape(e.summary)}`, `DESCRIPTION:${icsEscape(e.text + "\n\n" + CREDIT)}`, "TRANSP:TRANSPARENT",
        "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(e.summary)}`, "TRIGGER:-P1D", "END:VALARM", "END:VEVENT");
    }
    L.push("END:VCALENDAR");
    return L.map(icsFold).join("\r\n") + "\r\n";
  }

  // ---------- share links (text only; images never go in the URL) ----------
  const b64u = bytes => { let b = ""; for (let i = 0; i < bytes.length; i += 0x8000) b += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  const unb64u = s => { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/")); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
  async function encodeShare(obj) {
    const json = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === "function") { try { return "z" + b64u(await pipe(json, new CompressionStream("deflate-raw"))); } catch (e) { /* fall through */ } }
    return "j" + b64u(json);
  }
  async function decodeShare(code) {
    const t = String(code || ""), kind = t[0], body = t.slice(1);
    if (!body || body.length > 20000 || !/^[A-Za-z0-9_-]+$/.test(body)) return null;
    try {
      let bytes = unb64u(body);
      if (kind === "z") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
      else if (kind !== "j") return null;
      const v = JSON.parse(new TextDecoder().decode(bytes));
      return v && typeof v === "object" ? v : null;
    } catch (e) { return null; }
  }

  return {
    REVIEWED, SITE, DOMAIN, CREDIT, REF, CURRENCIES, LEVELS, ITEMS, USAGE, USAGE_ORDER, ADDONS, PAYMENT_TERMS, DEAL_STATUSES, CARD_ADDONS,
    money, fmtPct, fmtDate, plural, niceRound, levelBase, levelRange, defaults, normalize, compute, unitPrice, usageOptions, deliverablesSummary,
    parseDate, addDays, monthsEnd, usageEnd, rightsTerms, validUntil, pitchEmail, cardDefaults, normalizeCard, cardRows,
    dealDates, dealEvents, dealsCSV, dealsICS, icsFold, csvCell, encodeShare, decodeShare,
  };
});
