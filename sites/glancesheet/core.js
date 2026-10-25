/* GlanceSheet core: student model, accommodations list, normalising and backup (JSON), the one-page sheet layout
   with a font-size floor, the class accommodations matrix layout, and the PDFs. No DOM access, so the same file runs
   on the page and in Node tests. jsPDF is passed in (vendor/jspdf-4.2.1.umd.min.js). PDF units are points, origin top-left. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GSCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SITE = "https://iepglance.roohsites.com";
  const CREDIT = "Made with GlanceSheet · iepglance.roohsites.com";
  const CREDIT_URL = SITE + "/?utm_source=glancesheet&utm_medium=watermark&utm_campaign=referral";
  const CONF = "Confidential: share only with staff who work with this student";
  const FOOT_IEP = "This is a summary, not the IEP. Follow the full IEP.";
  const FOOT_504 = "This is a summary, not the 504 plan. Follow the full 504 plan.";
  const TITLES = { iep: "IEP at a Glance", "504": "504 Plan at a Glance", sub: "Student at a Glance" };

  /* ------------------------------------------------------------ accommodations */
  const CATEGORIES = [
    { id: "pres", name: "Presentation" }, { id: "resp", name: "Response" }, { id: "setting", name: "Setting" },
    { id: "time", name: "Timing & scheduling" }, { id: "org", name: "Organization & behavior" }, { id: "test", name: "Testing" },
  ];
  // [id, category, plain phrase, short label for matrix column headers]
  const ACCOMMODATIONS = [
    ["pres-aloud", "pres", "Directions read aloud and repeated", "Directions read aloud"],
    ["pres-text-aloud", "pres", "Text and assignments read aloud", "Text read aloud"],
    ["pres-audio", "pres", "Audio versions of books and texts", "Audio books"],
    ["pres-large", "pres", "Large print or enlarged materials", "Large print"],
    ["pres-notes", "pres", "Copy of class notes", "Copy of notes"],
    ["pres-visual", "pres", "Visual schedule and picture or written directions", "Visual supports"],
    ["pres-models", "pres", "Worked examples and models provided", "Worked examples"],
    ["pres-onestep", "pres", "Directions given one step at a time", "One-step directions"],
    ["pres-highlight", "pres", "Key words highlighted in texts and directions", "Highlighted key words"],
    ["pres-space", "pres", "Fewer items per page with more white space", "Less clutter on page"],
    ["pres-check", "pres", "Check for understanding before work starts", "Check understanding"],
    ["pres-vocab", "pres", "Key vocabulary list or word bank", "Word bank"],
    ["resp-calc", "resp", "Use of calculator", "Calculator"],
    ["resp-facts", "resp", "Multiplication chart or math fact reference", "Math fact chart"],
    ["resp-scribe", "resp", "Scribe or speech-to-text for written work", "Scribe / speech-to-text"],
    ["resp-type", "resp", "Type responses instead of handwriting", "Type responses"],
    ["resp-oral", "resp", "Oral responses instead of written", "Oral responses"],
    ["resp-spell", "resp", "Spell-check or word-prediction tool", "Spell-check"],
    ["resp-organizer", "resp", "Graphic organizers for writing", "Graphic organizers"],
    ["resp-frames", "resp", "Sentence starters or frames", "Sentence frames"],
    ["resp-mark", "resp", "Mark answers in the booklet instead of a separate sheet", "Mark in booklet"],
    ["resp-choice", "resp", "Choice of how to show learning (talk, poster, model)", "Choice of product"],
    ["set-seat", "setting", "Preferential seating", "Preferential seating"],
    ["set-quiet", "setting", "Quiet, low-distraction workspace", "Low-distraction space"],
    ["set-model", "setting", "Seat near a positive peer model", "Near peer model"],
    ["set-fidget", "setting", "Standing desk, wiggle seat or fidget tool", "Movement / fidget tools"],
    ["set-headphones", "setting", "Noise-reducing headphones", "Noise-reducing headphones"],
    ["set-calm", "setting", "Calm-down space available", "Calm-down space"],
    ["set-adult", "setting", "Adult nearby to check in during work", "Adult check-ins"],
    ["set-light", "setting", "Reduced glare or adjusted lighting", "Adjusted lighting"],
    ["set-access", "setting", "Accessible seating and room layout", "Accessible layout"],
    ["time-ext", "time", "Extended time (1.5x) on tests and assignments", "Extended time 1.5x"],
    ["time-process", "time", "Extra time to process and respond to questions", "Processing time"],
    ["time-breaks", "time", "Breaks as needed", "Breaks as needed"],
    ["time-chunk", "time", "Chunked assignments", "Chunked assignments"],
    ["time-submit", "time", "Extra time to turn in assignments", "Extra time to submit"],
    ["time-warn", "time", "Advance notice before transitions", "Transition warnings"],
    ["time-preview", "time", "Preview of the daily schedule and any changes", "Schedule preview"],
    ["time-split", "time", "Tests split across more than one session", "Split test sessions"],
    ["org-planner", "org", "Assignment notebook or planner checked daily", "Planner checked"],
    ["org-checklist", "org", "Checklists for multi-step tasks", "Task checklists"],
    ["org-color", "org", "Color-coded folders and materials", "Color-coding"],
    ["org-extra", "org", "Extra set of books or materials at home", "Extra book set"],
    ["org-timer", "org", "Visual timer or time-management tool", "Visual timer"],
    ["org-praise", "org", "Frequent, specific positive feedback", "Positive feedback"],
    ["org-reward", "org", "Reinforcement system or token board", "Reinforcement system"],
    ["org-private", "org", "Quiet, private redirection instead of public correction", "Private redirection"],
    ["org-preteach", "org", "Pre-teaching of new routines (social stories, previews)", "Pre-teach routines"],
    ["org-firstthen", "org", "First/then board or visual routine", "First/then board"],
    ["org-pass", "org", "Pass to leave class or go to a safe person", "Exit pass"],
    ["org-checkin", "org", "Daily check-in and check-out with a trusted adult", "Check-in / check-out"],
    ["org-buddy", "org", "Peer buddy or partner for group work", "Peer partner"],
    ["test-small", "test", "Testing in a small group / separate setting", "Small-group testing"],
    ["test-aloud", "test", "Test items read aloud where the test allows it", "Test read aloud"],
    ["test-scribe", "test", "Scribe or speech-to-text on tests", "Scribe on tests"],
    ["test-breaks", "test", "Supervised breaks during tests", "Breaks during tests"],
    ["test-bank", "test", "Word bank on tests", "Test word bank"],
    ["test-ref", "test", "Formula sheet or reference card on tests", "Reference sheet"],
    ["test-oral", "test", "Oral test option where the test allows it", "Oral test option"],
    ["test-time", "test", "Testing at the time of day the student works best", "Best-time testing"],
    ["test-proctor", "test", "Familiar adult gives the test", "Familiar test giver"],
    ["test-preview", "test", "Preview of the test format and directions", "Test preview"],
    ["test-state", "test", "State and district test accommodations as listed in the IEP", "State test supports"],
  ].map(([id, cat, text, short]) => ({ id, cat, text, short }));
  const ACC_BY_ID = new Map(ACCOMMODATIONS.map((a, i) => [a.id, Object.assign({ order: i }, a)]));

  const GOAL_AREAS = ["Reading", "Writing", "Math", "Communication", "Social-emotional", "Behavior", "Functional/adaptive", "Motor", "Transition", "Other"];
  const SETTINGS = [["gen", "General education"], ["spec", "Special education"], ["rel", "Related service"]];
  const FREQS = [["week", "per week"], ["month", "per month"]];
  const RELATED = [["speech", "Speech-language"], ["ot", "Occupational therapy"], ["pt", "Physical therapy"], ["counseling", "Counseling"]];
  const SECTIONS = [
    ["dates", "Dates"], ["eligibility", "Eligibility category"], ["strengths", "Strengths and interests"], ["helps", "What helps"], ["watch", "Watch for"],
    ["accom", "Accommodations"], ["mods", "Modifications"], ["goals", "Goals"], ["services", "Services"], ["bip", "Behavior plan"],
    ["health", "Health and safety notes"], ["contacts", "Key contacts"],
  ];
  const LIMITS = { students: 300, goals: 12, services: 12, contacts: 10, custom: 20, line: 200, text: 3000 };

  /* -------------------------------------------------------------------- model */
  const str = (v, max) => (typeof v === "string" ? v : typeof v === "number" && isFinite(v) ? String(v) : "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, max);
  const oneLine = (v, max) => str(v, max).replace(/\s+/g, " ").trim();
  const isoOk = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + "T00:00:00Z")) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
  const pickIn = (v, list, dflt) => (list.includes(v) ? v : dflt);
  const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
  const obj = v => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

  function blankStudent(id, extra) {
    return normalizeStudent(Object.assign({ id }, extra || {}), id);
  }
  function normalizeStudent(raw, fallbackId) {
    const r = obj(raw), show = obj(r.show), rel = obj(r.related);
    const s = {
      id: Number.isInteger(r.id) && r.id > 0 ? r.id : fallbackId,
      name: oneLine(r.name, 80), initials: oneLine(r.initials, 8), grade: oneLine(r.grade, 12), year: oneLine(r.year, 16),
      caseManager: oneLine(r.caseManager, 80), contact: oneLine(r.contact, 100),
      plan: pickIn(r.plan, ["iep", "504"], "iep"),
      meeting: isoOk(r.meeting) ? r.meeting : "", annual: isoOk(r.annual) ? r.annual : "", reeval: isoOk(r.reeval) ? r.reeval : "",
      eligibility: oneLine(r.eligibility, 100),
      strengths: str(r.strengths, LIMITS.text), helps: str(r.helps, LIMITS.text), watch: str(r.watch, LIMITS.text),
      accom: [...new Set(arr(r.accom, 200).filter(id => typeof id === "string" && ACC_BY_ID.has(id)))],
      custom: [...new Set(arr(r.custom, LIMITS.custom).map(c => oneLine(c, 100)).filter(Boolean))],
      mods: str(r.mods, LIMITS.text),
      goals: arr(r.goals, LIMITS.goals).map(g => ({ area: pickIn(obj(g).area, GOAL_AREAS, "Other"), text: str(obj(g).text, 400) })),
      services: arr(r.services, LIMITS.services).map(v => { v = obj(v); const m = Math.round(Number(v.min)); return { name: oneLine(v.name, 80), min: m > 0 && m <= 3000 ? m : "", per: pickIn(v.per, FREQS.map(f => f[0]), "week"), setting: pickIn(v.setting, SETTINGS.map(f => f[0]), "spec"), role: oneLine(v.role, 60) }; }),
      related: {},
      bip: r.bip === true,
      health: str(r.health, 400),
      contacts: arr(r.contacts, LIMITS.contacts).map(c => ({ role: oneLine(obj(c).role, 60), who: oneLine(obj(c).who, 100) })),
      show: {},
      printCountdown: r.printCountdown === true,
      pick: r.pick !== false,
    };
    for (const [k] of RELATED) s.related[k] = rel[k] === true;
    for (const [k] of SECTIONS) s.show[k] = k in show ? show[k] === true : k !== "eligibility";
    return s;
  }
  function normalizeState(raw) {
    const r = obj(raw), st = obj(r.settings);
    const students = [];
    const seen = new Set();
    let next = 1;
    for (const x of arr(r.students, LIMITS.students)) if (Number.isInteger(obj(x).id) && obj(x).id >= next) next = obj(x).id + 1;
    for (const x of arr(r.students, LIMITS.students)) {
      let s = normalizeStudent(x, next);
      if (seen.has(s.id)) s.id = next;
      seen.add(s.id); next = Math.max(next, s.id) + 1;
      students.push(s);
    }
    const sel = students.some(s => s.id === r.sel) ? r.sel : students.length ? students[0].id : null;
    return { settings: { initialsOnly: st.initialsOnly !== false, paper: pickIn(st.paper, ["letter", "a4"], "letter"), className: oneLine(st.className, 60) }, students, sel };
  }
  const nextId = students => students.reduce((m, s) => Math.max(m, s.id), 0) + 1;
  const emptyState = () => normalizeState({});

  // JSON backup: app marker + version, no photos, only the whitelisted fields above.
  const MAX_BACKUP = 6 * 1024 * 1024;
  function makeBackup(state, today) {
    const n = normalizeState(state);
    return JSON.stringify({ app: "glancesheet", v: 1, saved: today || "", settings: n.settings, sel: n.sel, students: n.students });
  }
  function parseBackup(text) {
    if (typeof text !== "string" || !text.trim()) return { ok: false, error: "That file is empty." };
    if (text.length > MAX_BACKUP) return { ok: false, error: "That file is too big to be a GlanceSheet backup." };
    let d;
    try { d = JSON.parse(text); } catch (e) { return { ok: false, error: "That file isn't valid JSON." }; }
    if (!d || typeof d !== "object" || Array.isArray(d) || d.app !== "glancesheet" || !Array.isArray(d.students)) return { ok: false, error: "That file isn't a GlanceSheet backup." };
    return { ok: true, state: normalizeState(d) };
  }

  /* ------------------------------------------------------------- labels, dates */
  const initialsOf = name => {
    const w = String(name || "").trim().split(/\s+/).filter(Boolean).map(x => Array.from(x)[0]);
    if (!w.length) return "";
    return (w.length === 1 ? w[0] : w[0] + w[w.length - 1]).toUpperCase();
  };
  const initialsFor = s => s.initials || initialsOf(s.name);
  function labelOf(s, initialsOnly, index) {
    const ini = initialsFor(s), fallback = "Student " + ((index || 0) + 1);
    return initialsOnly ? ini || fallback : s.name || ini || fallback;
  }
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtDate = iso => (isoOk(iso) ? `${MONTHS[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}, ${iso.slice(0, 4)}` : "");
  const dayNum = iso => Math.round(Date.parse(iso + "T00:00:00Z") / 86400000);
  function dueText(iso, today) {
    if (!isoOk(iso) || !isoOk(today)) return "";
    const d = dayNum(iso) - dayNum(today);
    if (d === 0) return "due today";
    if (d > 0) return `due in ${d} day${d === 1 ? "" : "s"}`;
    return `overdue by ${-d} day${d === -1 ? "" : "s"}`;
  }
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const schoolYear = today => { const y = +today.slice(0, 4), m = +today.slice(5, 7), a = m >= 7 ? y : y - 1; return `${a}-${String(a + 1).slice(2)}`; };

  const linesOf = text => String(text || "").split(/\r?\n/).map(l => l.replace(/^\s*(?:[-*•–]\s+)/, "").trim()).filter(Boolean);
  const resolveVariant = (s, mode) => (mode === "sub" ? "sub" : mode === "504" || s.plan === "504" ? "504" : "iep");
  const kindOf = variant => (variant === "iep" ? "single" : variant);

  /* ----------------------------------------------------------- text measuring */
  const INK = "#111111", MUTED = "#555555", LINE = "#bdbdbd", RULE = "#6b21a8", ACC = "#6b21a8", ACC_SOFT = "#f1e8f8";
  const CP1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  const MAP = { "→": "->", "←": "<-", "≥": ">=", "≤": "<=", "−": "-", "✓": "v", "✔": "v" };
  const inFont = ch => { const k = ch.codePointAt(0); return (k >= 32 && k < 127) || (k >= 160 && k <= 255) || CP1252.includes(ch); };
  // The standard PDF fonts only cover Windows-1252: map a few symbols, drop accents the font lacks, drop emoji.
  function pdfSafe(s, keepEdges) {
    let out = "";
    for (const ch of String(s == null ? "" : s).normalize("NFC")) {
      const k = ch.codePointAt(0);
      if (inFont(ch)) out += ch;
      else if (MAP[ch]) out += MAP[ch];
      else if (k > 0xffff || (k >= 0x2600 && k <= 0x27bf) || k === 0xfe0f || k === 0x200d || (k >= 0x300 && k <= 0x36f)) continue;
      else if (k >= 32) { const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, ""); out += base && [...base].every(inFont) ? base : "?"; }
    }
    out = out.replace(/\s+/g, " ");
    return keepEdges ? out : out.trim();
  }
  const makeMeasure = doc => (text, size, bold) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); return doc.getTextWidth(text); };

  function ellipsize(measure, text, size, bold, maxW) {
    let t = text;
    if (measure(t, size, bold) <= maxW) return t;
    while (t.length > 1 && measure(t + "...", size, bold) > maxW) t = t.slice(0, -1);
    return t.trimEnd() + "...";
  }
  // Wrap runs ([{s, b}]) into lines of positioned tokens {s, b, x, w}; same-style neighbours are merged into one run.
  function wrapRuns(measure, parts, maxW, size) {
    const toks = [];
    for (const p of parts) for (const w of pdfSafe(p.s, true).split(/(\s+)/)) if (w !== "") toks.push({ s: w, b: !!p.b, sp: /^\s+$/.test(w) });
    const lines = [];
    let cur = [], x = 0;
    const endLine = () => { while (cur.length && cur[cur.length - 1].sp) cur.pop(); lines.push(cur); cur = []; x = 0; };
    for (const t of toks) {
      if (t.sp) { if (cur.length) { const w = measure(" ", size, t.b); cur.push({ s: " ", b: t.b, sp: true, x, w }); x += w; } continue; }
      let w = measure(t.s, size, t.b);
      if (x + w > maxW && cur.length) endLine();
      if (w > maxW) {
        let rest = t.s;
        while (rest) {
          let n = rest.length;
          while (n > 1 && measure(rest.slice(0, n), size, t.b) > maxW - x) n--;
          const piece = rest.slice(0, n), pw = measure(piece, size, t.b);
          cur.push({ s: piece, b: t.b, x, w: pw }); x += pw; rest = rest.slice(n);
          if (rest) endLine();
        }
        continue;
      }
      cur.push({ s: t.s, b: t.b, x, w }); x += w;
    }
    if (cur.length) endLine();
    return lines.map(l => { const m = []; for (const t of l) { const p = m[m.length - 1]; if (p && p.b === t.b) { p.s += t.s; p.w += t.w; } else m.push({ s: t.s, b: t.b, x: t.x, w: t.w }); } return m; });
  }

  /* ------------------------------------------------------------- sheet layout */
  const dimsOf = paper => (paper === "a4" ? { W: 595.28, H: 841.89 } : { W: 612, H: 792 });
  const M = 36, GUT = 20, FS_MAX = 11, FS_MIN = 10, FS_STEP = 0.25;

  function buildSections(s, variant, today) {
    const sh = s.show, out = [];
    const add = (key, name, col, flex, items) => { if (sh[key] && items.length) out.push({ key, name, col, flex, items }); };
    const bullets = text => linesOf(text).map(l => ({ t: "b", parts: [{ s: l }] }));
    add("strengths", "Strengths and interests", 0, false, bullets(s.strengths));
    add("helps", "What helps", 0, false, bullets(s.helps));
    add("watch", "Watch for", 0, false, bullets(s.watch));
    if (sh.accom) {
      const items = [];
      const std = s.accom.map(id => ACC_BY_ID.get(id)).sort((a, b) => a.order - b.order);
      for (const c of CATEGORIES) {
        const list = std.filter(a => a.cat === c.id);
        if (list.length) { items.push({ t: "sub", parts: [{ s: c.name, b: true }] }); list.forEach(a => items.push({ t: "b", parts: [{ s: a.text }] })); }
      }
      if (s.custom.length) { if (items.length) items.push({ t: "sub", parts: [{ s: "Other", b: true }] }); s.custom.forEach(c => items.push({ t: "b", parts: [{ s: c }] })); }
      add("accom", "Accommodations", 1, false, items);
    }
    if (variant !== "sub") add("mods", "Modifications", 1, false, bullets(s.mods));
    if (variant === "iep") {
      add("goals", "Goals", 0, true, s.goals.filter(g => g.text.trim()).map(g => ({ t: "b", parts: [{ s: g.area + ": ", b: true }, { s: g.text.trim() }] })));
      const items = s.services.filter(v => v.name).map(v => {
        const bits = [v.min ? `${v.min} min ${v.per === "month" ? "per month" : "per week"}` : "", SETTINGS.find(x => x[0] === v.setting)[1].toLowerCase(), v.role].filter(Boolean);
        return { t: "b", parts: [{ s: v.name, b: true }, { s: bits.length ? ": " + bits.join(", ") : "" }] };
      });
      const rel = RELATED.filter(([k]) => s.related[k]).map(r => r[1]);
      if (rel.length) items.push({ t: "t", parts: [{ s: "Related services: ", b: true }, { s: rel.join(", ") }] });
      add("services", "Services", 1, true, items);
    }
    if (variant !== "sub") {
      add("bip", "Behavior plan", 0, true, s.bip ? [{ t: "t", parts: [{ s: "Has a behavior intervention plan (BIP). Ask the case manager for the plan." }] }] : []);
      add("health", "Health and safety", 0, true, linesOf(s.health).length ? [{ t: "t", parts: [{ s: linesOf(s.health).join(" ") }] }] : []);
    }
    const ct = s.contacts.filter(c => c.role || c.who).map(c => ({ t: "b", parts: c.role && c.who ? [{ s: c.role + ": ", b: true }, { s: c.who }] : [{ s: c.role || c.who }] }));
    add("contacts", "Key contacts", variant === "sub" ? 0 : 1, true, ct);
    return out;
  }

  function headerLines(measure, s, variant, today, width) {
    const sh = s.show;
    const join = list => { const parts = []; list.forEach((f, i) => { if (i) parts.push({ s: "  ·  " }); parts.push(...f); }); return parts; };
    const row1 = [];
    const f1 = (k, v) => { if (v) row1.push([{ s: k + ": ", b: true }, { s: v }]); };
    f1("Grade", s.grade); f1("School year", s.year);
    if (variant !== "sub") { f1("Plan", s.plan === "504" ? "504 plan" : "IEP"); f1("Case manager", s.caseManager); f1("Contact", s.contact); }
    if (variant !== "sub" && sh.eligibility && s.eligibility) f1("Eligibility category", s.eligibility);
    const rows = [row1];
    if (variant !== "sub" && sh.dates) {
      const dd = [];
      const cd = iso => (s.printCountdown && dueText(iso, today) ? ` (${dueText(iso, today)})` : "");
      const d1 = (k, iso) => { if (iso) dd.push([{ s: k + ": ", b: true }, { s: fmtDate(iso) + cd(iso) }]); };
      d1(s.plan === "504" ? "Plan meeting" : "IEP meeting", s.meeting); d1("Annual review due", s.annual); d1("Re-evaluation due", s.reeval);
      rows.push(dd);
    }
    return rows.filter(r => r.length).map(r => wrapRuns(measure, join(r), width, 10));
  }

  function planSheet(doc, s, variant, opts) {
    opts = opts || {};
    const { W, H } = dimsOf(opts.paper), today = opts.today || todayISO();
    const measure = makeMeasure(doc);
    const label = opts.label || labelOf(s, opts.initialsOnly !== false, opts.index || 0);
    const colW = (W - 2 * M - GUT) / 2;
    const hdrRows = headerLines(measure, s, variant, today, W - 2 * M);
    const hdrLines = hdrRows.reduce((n, r) => n + r.length, 0) + (variant === "sub" ? 1 : 0);
    const nameSize = Math.min(22, 22 * (W - 2 * M - 4) / Math.max(measure(pdfSafe(label), 22, true), 1));
    const headerH = 4 + 6 + 15 + 6 + nameSize * 1.2 + 6 + hdrLines * 13 + 8;
    const top = M + headerH, bottom = H - 58;
    const sections = buildSections(s, variant, today);

    const cacheFor = new Map();
    // cut[key] = how many trailing items of a section are left out (the section then ends with a "More in the full plan." line).
    function place(fs, cut) {
      const lh = fs * 1.25, hs = Math.max(9, fs - 1), headH = hs + 8, gap = 11, trimmed = Object.keys(cut).length > 0, avail = bottom - top - (trimmed ? 14 : 0);
      const cache = cacheFor.get(fs) || cacheFor.set(fs, new Map()).get(fs);
      const colH = [0, 0], cols = [[], []], notPlaced = [], heights = {};
      const fitItem = it => {
        if (cache.has(it)) return cache.get(it);
        const indent = it.t === "b" ? 10 : 0;
        const size = it.t === "sub" ? fs - 1.5 : fs;
        const lines = wrapRuns(measure, it.parts, colW - indent, size);
        const r = { it, lines, indent, size, h: lines.length * (it.t === "sub" ? size * 1.25 : lh) + 2 };
        cache.set(it, r);
        return r;
      };
      for (const sec of sections) {
        const n = sec.items.length - (cut[sec.key] || 0);
        if (n <= 0) { heights[sec.key] = 0; continue; }
        const items = sec.items.slice(0, n).map(fitItem);
        if (n < sec.items.length) items.push(fitItem(MORE));
        const h = headH + items.reduce((a, b) => a + b.h, 0) + gap;
        heights[sec.key] = h;
        let order = sec.col === 0 ? [0, 1] : [1, 0];
        if (sec.flex && colH[order[1]] + h <= colH[order[0]]) order = [order[1], order[0]];
        const c = order.find(k => colH[k] + h - gap <= avail);
        if (c === undefined) { notPlaced.push(sec.key); continue; }
        cols[c].push({ sec, items, y: colH[c], h: h - gap, headH, hs }); colH[c] += h;
      }
      return { fs, cols, notPlaced, heights, lh, colH };
    }
    const MORE = { t: "t", parts: [{ s: "More in the full plan.", b: true }] };

    let res = null, cut = {};
    for (let fs = FS_MAX; fs >= FS_MIN - 1e-9; fs -= FS_STEP) { const r = place(fs, {}); if (!r.notPlaced.length) { res = r; break; } }
    const fits = !!res;
    if (!res) {
      // At the floor: shorten the longest sections, one trailing item at a time, until everything fits on the page.
      res = place(FS_MIN, cut);
      for (let guard = 0; res.notPlaced.length && guard < 600; guard++) {
        const cand = sections.filter(sec => sec.items.length - (cut[sec.key] || 0) > 1).sort((a, b) => res.heights[b.key] - res.heights[a.key])[0];
        if (cand) cut[cand.key] = (cut[cand.key] || 0) + 1;
        else { const last = sections.filter(sec => (cut[sec.key] || 0) < sec.items.length).pop(); cut[last.key] = last.items.length; }
        res = place(FS_MIN, cut);
      }
    }
    if (!fits) {
      // Give items back to the sections that were cut, as long as everything still fits.
      for (let changed = true, guard = 0; changed && guard < 20; guard++) {
        changed = false;
        for (const sec of sections) {
          if (!(cut[sec.key] > 0)) continue;
          cut[sec.key]--;
          const r = place(FS_MIN, cut);
          if (r.notPlaced.length) cut[sec.key]++; else { res = r; changed = true; }
        }
      }
      res = place(FS_MIN, cut);
    }
    const overflow = sections.filter(sec => cut[sec.key]).map(sec => ({ key: sec.key, name: sec.name, dropped: cut[sec.key] >= sec.items.length, removed: cut[sec.key] }));
    return { variant, label, W, H, colW, fs: res.fs, fits, shrunk: res.fs < FS_MAX, cols: res.cols, lh: res.lh, overflow, hdrRows, nameSize, headerH, top, bottom, today, plan: s.plan, hasSections: sections.length > 0 };
  }

  function drawRuns(doc, runs, x, y, size) {
    for (const r of runs) { doc.setFont("helvetica", r.b ? "bold" : "normal"); doc.setFontSize(size); doc.text(r.s, x + r.x, y, { baseline: "top" }); }
  }
  function footerAndCredit(doc, W, H, text, left) {
    doc.setDrawColor(LINE); doc.setLineWidth(0.6); doc.line(M, H - 50, W - M, H - 50);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(INK);
    doc.text(text, M, H - 44, { baseline: "top" });
    if (left) { doc.setFontSize(8.5); doc.setTextColor(MUTED); doc.text(left, W - M, H - 44, { baseline: "top", align: "right" }); }
    doc.setFontSize(8); doc.setTextColor(MUTED);
    const w = doc.getTextWidth(CREDIT), x = (W - w) / 2;
    doc.text(CREDIT, x, H - 24, { baseline: "top" });
    doc.link(x, H - 25, w, 11, { url: CREDIT_URL });
  }

  function drawSheet(doc, p) {
    const { W, H } = p;
    doc.setFillColor(ACC); doc.rect(M, M, W - 2 * M, 4, "F");
    let y = M + 10;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(ACC);
    doc.text(TITLES[p.variant], M, y, { baseline: "top" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(MUTED);
    doc.text(CONF, W - M, y + 2, { baseline: "top", align: "right" });
    y += 19;
    doc.setFont("helvetica", "bold"); doc.setFontSize(p.nameSize); doc.setTextColor(INK);
    doc.text(pdfSafe(p.label), M, y, { baseline: "top" });
    y += p.nameSize * 1.2 + 6;
    doc.setTextColor(INK);
    for (const row of p.hdrRows) for (const line of row) { drawRuns(doc, line, M, y, 10); y += 13; }
    if (p.variant === "sub") { doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(MUTED); doc.text("For substitutes and paraprofessionals", M, y, { baseline: "top" }); y += 13; }
    doc.setDrawColor(ACC); doc.setLineWidth(0.8); doc.line(M, p.top - 4, W - M, p.top - 4);
    p.cols.forEach((col, ci) => {
      const x0 = M + ci * (p.colW + GUT);
      for (const sc of col) {
        const y0 = p.top + sc.y;
        doc.setFont("helvetica", "bold"); doc.setFontSize(sc.hs); doc.setTextColor(ACC);
        doc.text(sc.sec.name.toUpperCase(), x0, y0, { baseline: "top", charSpace: 0.4 });
        doc.setDrawColor(ACC); doc.setLineWidth(0.6); doc.line(x0, y0 + sc.hs + 3, x0 + p.colW, y0 + sc.hs + 3);
        let yy = y0 + sc.headH;
        doc.setTextColor(INK);
        for (const it of sc.items) {
          const isSub = it.it.t === "sub", size = it.size, lh = isSub ? size * 1.25 : p.lh;
          if (isSub) { yy += 1.5; doc.setTextColor(MUTED); } else doc.setTextColor(INK);
          if (it.it.t === "b") { doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.text("•", x0 + 1, yy, { baseline: "top" }); }
          for (const line of it.lines) { drawRuns(doc, line, x0 + it.indent, yy, size); yy += lh; }
          yy += isSub ? 0.5 : 2;
        }
      }
    });
    const dropped = p.overflow.filter(o => o.dropped).map(o => o.name);
    if (dropped.length) { doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor("#9a3412"); doc.text(`Not shown (no room): ${dropped.join(", ")}. See the full plan.`, M, p.bottom + 2, { baseline: "top" }); }
    footerAndCredit(doc, W, H, p.plan === "504" ? FOOT_504 : FOOT_IEP);
  }

  const asciiName = v => String(v || "").normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/[()\\]/g, "").trim();
  function newDoc(J, W, H, title) {
    const doc = new J({ orientation: W > H ? "landscape" : "portrait", unit: "pt", format: [Math.min(W, H), Math.max(W, H)] });
    doc.setProperties({ title: asciiName(title), creator: "GlanceSheet - iepglance.roohsites.com" });
    return doc;
  }
  // entries: [{ s: student, i: index in caseload }]. One page each; never a second page for one student.
  function sheetPdf(J, entries, opts) {
    opts = opts || {};
    const { W, H } = dimsOf(opts.paper);
    const first = entries[0], v0 = resolveVariant(first.s, opts.mode);
    const label0 = labelOf(first.s, opts.initialsOnly !== false, first.i);
    const doc = newDoc(J, W, H, entries.length > 1 ? `${TITLES[v0]} - caseload` : `${TITLES[v0]} - ${label0}`);
    const plans = [];
    entries.forEach((e, k) => {
      if (k) doc.addPage([W, H], "portrait");
      const variant = resolveVariant(e.s, opts.mode);
      const p = planSheet(doc, e.s, variant, { paper: opts.paper, initialsOnly: opts.initialsOnly !== false, index: e.i, today: opts.today });
      drawSheet(doc, p);
      plans.push(p);
    });
    return { doc, plans };
  }
  const measureDoc = J => new J({ unit: "pt", format: "letter" });

  /* ------------------------------------------------------------------- matrix */
  function buildMatrix(entries, opts) {
    opts = opts || {};
    const colMap = new Map();
    const keyOf = c => "c:" + c.toLowerCase();
    for (const e of entries) {
      for (const id of e.s.accom) { const a = ACC_BY_ID.get(id); if (a && !colMap.has(id)) colMap.set(id, { key: id, text: a.text, short: a.short, order: a.order }); }
      for (const c of e.s.custom) if (!colMap.has(keyOf(c))) colMap.set(keyOf(c), { key: keyOf(c), text: c, short: c.length > 24 ? c.slice(0, 23).trim() + "..." : c, order: 1000 });
    }
    const cols = [...colMap.values()].sort((a, b) => a.order - b.order || a.text.localeCompare(b.text)).map((c, i) => Object.assign(c, { n: i + 1 }));
    const labels = entries.map(e => labelOf(e.s, opts.initialsOnly !== false, e.i));
    const seen = {};
    const rows = entries.map((e, k) => {
      let l = labels[k]; seen[l] = (seen[l] || 0) + 1;
      if (labels.filter(x => x === l).length > 1) l += " (" + seen[l] + ")";
      const marks = new Set([...e.s.accom, ...e.s.custom.map(keyOf)]);
      return { label: l, marks, plan: e.s.plan };
    });
    return { cols, rows };
  }
  const MX = { M: 30, titleH: 50, headH: 104, rowH: 18, labelW: 96, footH: 52, maxCW: 30, minCW: 22 };
  function layoutMatrix(model, paper, keyHeightFn) {
    const W = paper === "a4" ? 841.89 : 792, H = paper === "a4" ? 595.28 : 612;
    const availW = W - 2 * MX.M - MX.labelW, maxCols = Math.floor(availW / MX.minCW);
    const nChunks = Math.max(1, Math.ceil(model.cols.length / maxCols)), per = Math.ceil(model.cols.length / nChunks);
    const rowsAvail = H - MX.M - MX.titleH - MX.headH - MX.footH;
    const perPage = Math.max(1, Math.floor(rowsAvail / MX.rowH));
    const pages = [];
    for (let c = 0; c < nChunks; c++) {
      const c0 = c * per, c1 = Math.min(model.cols.length, c0 + per);
      const keyH = keyHeightFn ? keyHeightFn(model.cols.slice(c0, c1), W) : 0;
      const cw = Math.min(MX.maxCW, availW / (c1 - c0));
      const n = model.rows.length;
      for (let r0 = 0; r0 < Math.max(n, 1); r0 += perPage) {
        const r1 = Math.min(n, r0 + perPage), last = r1 >= n;
        const fitsKey = last && (r1 - r0) * MX.rowH + keyH <= rowsAvail;
        pages.push({ c0, c1, r0, r1, cw, key: fitsKey, keyOnly: false });
        if (last && !fitsKey) pages.push({ c0, c1, r0: r1, r1, cw, key: true, keyOnly: true });
      }
    }
    return { W, H, pages, perPage, keyHeight: keyHeightFn ? undefined : 0 };
  }
  function matrixPdf(J, entries, opts) {
    opts = opts || {};
    const model = buildMatrix(entries, opts);
    if (!model.cols.length) throw new Error("None of the selected students has an accommodation yet.");
    const { W, H } = { W: opts.paper === "a4" ? 841.89 : 792, H: opts.paper === "a4" ? 595.28 : 612 };
    const doc = newDoc(J, W, H, "Class accommodations matrix");
    const measure = makeMeasure(doc);
    const keyColW = (W - 2 * MX.M - 2 * 16) / 3, KFS = 9, KLH = 11.5;
    const keyLayout = cols => {
      const per = Math.ceil(cols.length / 3), groups = [];
      for (let g = 0; g < 3; g++) groups.push(cols.slice(g * per, (g + 1) * per).map(c => ({ c, lines: wrapRuns(measure, [{ s: c.n + ". ", b: true }, { s: c.text }], keyColW, KFS) })));
      return groups;
    };
    const keyHeight = cols => 18 + Math.max(...keyLayout(cols).map(g => g.reduce((a, b) => a + b.lines.length * KLH + 2, 0)));
    const lay = layoutMatrix(model, opts.paper, keyHeight);
    const foot = model.rows.length && model.rows.every(r => r.plan === "504") ? FOOT_504 : FOOT_IEP;
    const className = oneLine(opts.className, 60);
    lay.pages.forEach((pg, pi) => {
      if (pi) doc.addPage([W, H], "landscape");
      const x0 = MX.M, tableX = x0 + MX.labelW, y0 = MX.M;
      doc.setFillColor(ACC); doc.rect(x0, y0, W - 2 * x0, 4, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(INK);
      doc.text("Class accommodations matrix", x0, y0 + 11, { baseline: "top" });
      if (className) { doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(ACC); doc.text(pdfSafe(className), x0, y0 + 30, { baseline: "top" }); }
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(MUTED);
      doc.text(CONF, W - x0, y0 + 11, { baseline: "top", align: "right" });
      const parts = [];
      if (model.cols.length > pg.c1 - pg.c0) parts.push(`Accommodations ${model.cols[pg.c0].n}-${model.cols[pg.c1 - 1].n} of ${model.cols.length}`);
      if (!pg.keyOnly && model.rows.length > lay.perPage) parts.push(`Students ${pg.r0 + 1}-${pg.r1} of ${model.rows.length}`);
      parts.push(`Page ${pi + 1} of ${lay.pages.length}`);
      doc.text(parts.join("  |  "), W - x0, y0 + 26, { baseline: "top", align: "right" });
      const cols = model.cols.slice(pg.c0, pg.c1);
      let yy = y0 + MX.titleH;
      let tableBottom = yy;
      if (!pg.keyOnly) {
        // column header: rotated short labels, then the number
        doc.setFillColor(ACC_SOFT); doc.rect(x0, yy, MX.labelW + cols.length * pg.cw, MX.headH, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(INK);
        doc.text("Student", x0 + 6, yy + MX.headH - 16, { baseline: "top" });
        cols.forEach((c, k) => {
          const cx = tableX + k * pg.cw;
          let fs = 9; const maxLen = MX.headH - 26;
          doc.setFont("helvetica", "normal");
          const t = pdfSafe(c.short);
          while (fs > 7.5 && measure(t, fs, false) > maxLen) fs -= 0.25;
          const txt = ellipsize(measure, t, fs, false, maxLen);
          doc.setFont("helvetica", "normal"); doc.setFontSize(fs); doc.setTextColor(INK);
          doc.text(txt, cx + pg.cw / 2 + fs * 0.35, yy + MX.headH - 20, { angle: 90 });
          doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(ACC);
          doc.text(String(c.n), cx + pg.cw / 2, yy + MX.headH - 15, { baseline: "top", align: "center" });
        });
        yy += MX.headH;
        const rows = model.rows.slice(pg.r0, pg.r1);
        rows.forEach((r, k) => {
          const ry = yy + k * MX.rowH;
          if (k % 2) { doc.setFillColor("#f6f6f6"); doc.rect(x0, ry, MX.labelW + cols.length * pg.cw, MX.rowH, "F"); }
          doc.setFont("helvetica", "bold"); let fs = 11; doc.setFontSize(fs); doc.setTextColor(INK);
          let t = pdfSafe(r.label); while (fs > 7 && measure(t, fs, true) > MX.labelW - 12) fs -= 0.5;
          t = ellipsize(measure, t, fs, true, MX.labelW - 12);
          doc.setFontSize(fs); doc.text(t, x0 + 6, ry + (MX.rowH - fs) / 2 + 0.5, { baseline: "top" });
          doc.setDrawColor(ACC); doc.setLineWidth(1.7); doc.setLineCap("round"); doc.setLineJoin("round");
          cols.forEach((c, j) => {
            if (!r.marks.has(c.key)) return;
            const cx = tableX + j * pg.cw + pg.cw / 2, cy = ry + MX.rowH / 2;
            doc.line(cx - 4.2, cy + 0.3, cx - 1.3, cy + 3.5); doc.line(cx - 1.3, cy + 3.5, cx + 4.4, cy - 3.4);
          });
          doc.setLineCap("butt");
        });
        tableBottom = yy + rows.length * MX.rowH;
        doc.setDrawColor(LINE); doc.setLineWidth(0.5);
        for (let k = 0; k <= rows.length; k++) doc.line(x0, yy + k * MX.rowH, tableX + cols.length * pg.cw, yy + k * MX.rowH);
        for (let j = 0; j <= cols.length; j++) doc.line(tableX + j * pg.cw, y0 + MX.titleH, tableX + j * pg.cw, tableBottom);
        doc.line(x0, y0 + MX.titleH, x0, tableBottom); doc.line(x0, y0 + MX.titleH, tableX + cols.length * pg.cw, y0 + MX.titleH);
      }
      if (pg.key) {
        let ky = tableBottom + (pg.keyOnly ? 0 : 14);
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(ACC);
        doc.text("KEY", x0, ky, { baseline: "top", charSpace: 0.4 });
        doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED); doc.setFontSize(9);
        doc.text("A check mark means the accommodation is listed for that student.", x0 + 34, ky + 0.5, { baseline: "top" });
        ky += 16;
        keyLayout(cols).forEach((g, gi) => {
          let gy = ky; const gx = x0 + gi * (keyColW + 16);
          for (const it of g) { doc.setTextColor(INK); for (const line of it.lines) { drawRuns(doc, line, gx, gy, KFS); gy += KLH; } gy += 2; }
        });
      }
      footerAndCredit(doc, W, H, foot);
    });
    return { doc, model, layout: lay };
  }

  /* ------------------------------------------------------------------ example */
  function exampleStudents() {
    const today = todayISO();
    const mk = (id, o) => normalizeStudent(Object.assign({ id, year: schoolYear(today), caseManager: "Ms. Okafor", contact: "case.manager@school.example" }, o), id);
    return [
      mk(1, { name: "Alex Sample", grade: "4", plan: "iep", meeting: "2026-03-10", annual: "2027-03-09", reeval: "2028-03-09", strengths: "Kind and funny\nLoves drawing and animals\nStrong memory for stories", helps: "Directions one step at a time\nA visual schedule at the desk\nQuiet check-in before group work", watch: "Rubs eyes and goes quiet when overwhelmed\nStruggles with unexpected schedule changes", accom: ["pres-aloud", "pres-notes", "time-ext", "time-breaks", "time-chunk", "set-seat", "test-small", "resp-calc"], custom: ["Draw or label ideas before writing"], goals: [{ area: "Reading", text: "Reads grade 3 text with 90% accuracy and answers questions about key details." }, { area: "Math", text: "Solves two-step word problems using a drawing or equation." }], services: [{ name: "Specially designed instruction (reading)", min: 120, per: "week", setting: "spec", role: "Special education teacher" }, { name: "Speech-language therapy", min: 30, per: "week", setting: "rel", role: "SLP" }], related: { speech: true }, bip: false, contacts: [{ role: "Case manager", who: "Ms. Okafor" }, { role: "School counselor", who: "Mr. Lind" }] }),
      mk(2, { name: "Riley Example", grade: "7", plan: "504", meeting: "2026-05-02", annual: "2027-05-01", strengths: "Great with numbers\nHelpful with younger students", helps: "Seat near the front\nAdvance notice of tests", watch: "Fidgeting and tapping when anxious", accom: ["time-ext", "set-seat", "test-small", "test-breaks", "org-checkin", "pres-notes"], contacts: [{ role: "504 coordinator", who: "Ms. Park" }] }),
      mk(3, { name: "Casey Demo", grade: "2", plan: "iep", strengths: "Curious and energetic\nLikes building with blocks", helps: "Movement breaks\nFirst/then board", watch: "Leaves the room when frustrated", accom: ["set-fidget", "org-firstthen", "time-breaks", "org-praise", "pres-visual", "set-seat"], bip: true, contacts: [{ role: "Case manager", who: "Ms. Okafor" }] }),
    ];
  }

  return {
    SITE, CREDIT, CREDIT_URL, CONF, FOOT_IEP, FOOT_504, TITLES, CATEGORIES, ACCOMMODATIONS, ACC_BY_ID, GOAL_AREAS, SETTINGS, FREQS, RELATED, SECTIONS, LIMITS, FS_MAX, FS_MIN,
    blankStudent, normalizeStudent, normalizeState, emptyState, nextId, makeBackup, parseBackup, initialsOf, initialsFor, labelOf, fmtDate, dueText, todayISO, schoolYear,
    linesOf, resolveVariant, kindOf, pdfSafe, wrapRuns, makeMeasure, planSheet, drawSheet, sheetPdf, measureDoc, buildMatrix, layoutMatrix, matrixPdf, exampleStudents, isoOk,
  };
});
