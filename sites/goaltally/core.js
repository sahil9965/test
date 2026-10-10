/* GoalTally core: pure functions shared by the browser UI and the Node tests.
   No DOM access here. Everything a graph or data sheet shows is computed by this file and
   returned as a "scene" (a list of drawing primitives) that render.js turns into SVG or PDF. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GT = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SITE = "https://abagraph.roohsites.com";
  const CREDIT_URL = SITE + "/?utm_source=goaltally&utm_medium=watermark&utm_campaign=referral";
  const CREDIT = "Made with GoalTally · abagraph.roohsites.com";

  /* ---------- Text metrics (Helvetica, as used by jsPDF; Arial/Liberation Sans match it) ---------- */
  const W_N = [280,280,350,550,550,890,660,190,330,330,390,580,280,330,280,280,550,550,550,550,550,550,550,550,550,550,280,280,580,580,580,550,1010,660,660,720,720,660,610,780,720,280,500,660,550,830,720,780,660,780,720,660,610,720,660,940,660,660,610,280,280,280,470,550,330,550,550,500,550,550,280,550,550,220,220,500,220,830,550,550,550,550,330,500,280,550,500,720,500,500,500,330,260,330,580];
  const W_B = [280,330,470,550,550,890,720,240,330,330,390,580,280,330,280,280,550,550,550,550,550,550,550,550,550,550,330,330,580,580,580,610,970,720,720,720,720,660,610,780,720,280,550,720,610,830,720,780,660,780,720,660,610,720,660,940,660,660,610,330,280,330,580,550,330,550,610,550,610,550,330,610,610,280,280,550,280,890,610,610,610,610,390,550,330,610,550,780,550,550,500,390,280,390,580];
  const X_W = { "–": 556, "—": 1000, "·": 278, "•": 350, "×": 584, "°": 400, "±": 584, "‘": 222, "’": 222, "“": 333, "”": 333, "…": 1000, "−": 584 };
  function charW(ch, bold) {
    const c = ch.charCodeAt(0);
    if (c >= 32 && c < 127) return (bold ? W_B : W_N)[c - 32];
    if (X_W[ch]) return X_W[ch];
    if (c >= 0xc0 && c <= 0xff) return /[iìíîïIÌÍÎÏ]/.test(ch) ? 278 : 600;
    return 600;
  }
  // 2% safety margin so the browser's Arial/Liberation rendering never overflows a box.
  function textWidth(s, size, bold) { let w = 0; for (const ch of String(s ?? "")) w += charW(ch, bold); return w * size / 1000 * 1.02; }
  function wrap(s, maxW, size, bold) {
    const out = [];
    for (const para of String(s ?? "").split(/\r?\n/)) {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(""); continue; }
      let line = "";
      for (let w of words) {
        while (textWidth(w, size, bold) > maxW && w.length > 1) { // break very long words
          let k = w.length - 1;
          while (k > 1 && textWidth(w.slice(0, k), size, bold) > maxW) k--;
          if (line) { out.push(line); line = ""; }
          out.push(w.slice(0, k)); w = w.slice(k);
        }
        const t = line ? line + " " + w : w;
        if (textWidth(t, size, bold) <= maxW) line = t; else { if (line) out.push(line); line = w; }
      }
      out.push(line);
    }
    return out;
  }
  function fit(s, maxW, size, bold) {
    s = String(s ?? "");
    if (textWidth(s, size, bold) <= maxW) return s;
    while (s.length > 1 && textWidth(s + "…", size, bold) > maxW) s = s.slice(0, -1);
    return s.trimEnd() + "…";
  }

  /* ---------- Small helpers ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad2 = n => String(n).padStart(2, "0");
  const isNum = v => typeof v === "number" && Number.isFinite(v);
  const round = (v, d = 1) => { const p = Math.pow(10, d); return Math.round(v * p) / p + 0; }; // + 0 turns -0 into 0
  function fmtNum(v, d = 1) {
    if (!isNum(v)) return "–";
    const r = round(v, d);
    return String(Object.is(r, -0) ? 0 : r);
  }
  function mean(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN; }
  function median(a) {
    if (!a.length) return NaN;
    const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // Numbers typed or pasted by people: "80", "80%", "7,5" (decimal comma), "1,250" (thousands).
  function toNum(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    let s = String(v).trim().replace(/\s+/g, "").replace(/%$/, "");
    if (!s) return null;
    if (/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
    else if (/^[-+]?\d+,\d+$/.test(s)) s = s.replace(",", ".");
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  /* ---------- Dates (always stored as ISO yyyy-mm-dd, computed in UTC so time zones never shift a day) ---------- */
  const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function iso(y, m, d) {
    if (!(y > 1900 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    const t = new Date(Date.UTC(y, m - 1, d));
    if (t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }
  const monthIdx = s => { const i = MON.indexOf(String(s).slice(0, 3).toLowerCase()); return i < 0 ? 0 : i + 1; };
  function parseDate(s, pref = "mdy", defYear) {
    s = String(s ?? "").trim();
    if (!s) return null;
    let m;
    if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/))) return iso(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{1,2})([-/.])(\d{1,2})(?:\2(\d{2}|\d{4}))?$/))) {
      const a = +m[1], b = +m[3];
      if (!m[4] && m[2] !== "/") return null; // "10.5" and "3-4" are numbers or ranges, not dates
      let y = m[4] ? +m[4] : defYear;
      if (!y) return null;
      if (y < 100) y += 2000;
      const dmy = a > 12 || (pref === "dmy" && b <= 12);
      return dmy ? iso(y, b, a) : iso(y, a, b);
    }
    if ((m = s.match(/^(?:[A-Za-z]{3,9},?\s+)?([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4}|\d{2})?$/))) {
      const mo = monthIdx(m[1]); let y = m[3] ? +m[3] : defYear; if (!mo || !y) return null; if (y < 100) y += 2000;
      return iso(y, mo, +m[2]);
    }
    if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,9})\.?[\s,-]*(\d{4}|\d{2})?$/))) {
      const mo = monthIdx(m[2]); let y = m[3] ? +m[3] : defYear; if (!mo || !y) return null; if (y < 100) y += 2000;
      return iso(y, mo, +m[1]);
    }
    return null;
  }
  const dayNum = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : null; };
  const fromDay = n => { const t = new Date(Math.round(n) * 864e5); return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`; };
  const addDays = (d, n) => { const k = dayNum(d); return k === null ? null : fromDay(k + n); };
  function fmtDate(d, fmt = "mdy", style = "full") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || "");
    if (!m) return "";
    const y = +m[1], mo = +m[2], da = +m[3];
    if (style === "short") return fmt === "dmy" ? `${da}/${mo}` : `${mo}/${da}`;
    if (style === "mon") return fmt === "dmy" ? `${da} ${MON_SHORT[mo - 1]}` : `${MON_SHORT[mo - 1]} ${da}`;
    if (style === "monyear") return `${MON_SHORT[mo - 1]} ${y}`;
    if (style === "iso") return d;
    return fmt === "dmy" ? `${da}/${mo}/${y}` : `${mo}/${da}/${y}`;
  }
  function fmtClock(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`; }

  /* ---------- Paste parser (Excel / Google Sheets / CSV / plain lists) ---------- */
  // Split on a delimiter, honouring CSV quotes ("Baseline, cold" stays one cell; "" is a literal quote).
  function splitQuoted(line, d) {
    const out = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"' && !cur.trim()) { q = true; cur = ""; }
      else if (ch === d) { out.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  }
  function splitLine(line, sep) {
    if (sep === "tab") return splitQuoted(line, "\t");
    if (sep === ";") return splitQuoted(line, ";");
    if (sep === ",") return splitQuoted(line, ",");
    // Whitespace: split on runs of 2+ spaces first; fall back to single spaces and glue word runs back together.
    let t = line.trim().split(/\s{2,}|\s*\|\s*/);
    if (t.length > 1) return t;
    const raw = line.trim().split(/\s+/), out = [];
    for (let i = 0; i < raw.length; i++) {
      const w = raw[i];
      const textish = toNum(w) === null && !/^\d{1,4}[-/.]\d{1,2}([-/.]\d{2,4})?$/.test(w);
      const monthDate = /^[A-Za-z]{3,9}\.?$/.test(w) && MON.includes(w.slice(0, 3).toLowerCase()) && /^\d{1,2}(st|nd|rd|th)?,?$/.test(raw[i + 1] || "");
      if (monthDate) { // "Sep 3, 2026" stays one token
        let tok = w + " " + raw[++i];
        if (/^\d{4}$/.test(raw[i + 1] || "")) tok += " " + raw[++i];
        out.push(tok); continue;
      }
      if (textish && out.length && out[out.length - 1].__text) { const prev = out.pop(); const s = new String(prev + " " + w); s.__text = true; out.push(s); continue; }
      if (textish) { const s = new String(w); s.__text = true; out.push(s); continue; }
      out.push(w);
    }
    return out.map(String);
  }
  function kindOf(tok, pref, defYear) {
    if (tok === "" || tok === "-" || tok === "–") return "empty";
    if (/[/\-.]/.test(tok) || /[A-Za-z]{3}/.test(tok)) { if (parseDate(tok, pref, defYear)) return "date"; }
    if (toNum(tok) !== null) return "num";
    return "text";
  }
  const HEAD = { session: /^(sessions?|sess\.?|(session|sess\.?|day|trial|probe|week|obs(ervation)?)\s*(#|no\.?|num\.?|number)|#|no\.?|days?|trials?|probes?|weeks?|obs(ervations?)?|x)$/i, date: /date|^when$/i, phase: /phase|condition|cond\.?|treatment|label/i };
  // A column of consecutive whole numbers starting at 0 or 1 is a session counter, not data.
  const isCounter = v => v.length >= 2 && v.every((x, j) => x !== null && Number.isInteger(x) && (j === 0 ? x >= 0 && x <= 1 : x === v[j - 1] + 1));
  function parsePaste(text, opts = {}) {
    const pref = opts.pref || "mdy", defYear = opts.defYear || new Date().getUTCFullYear();
    const warnings = [];
    const lines = String(text ?? "").replace(/\r/g, "").split("\n").map(l => l.replace(/ /g, " ")).filter(l => l.trim());
    if (!lines.length) return { rows: [], phases: [], series: [], warnings: ["Nothing to import."] };
    const sep = lines.some(l => l.includes("\t")) ? "tab" : lines.some(l => l.includes(";")) ? ";" : lines.filter(l => l.includes(",")).length >= Math.ceil(lines.length / 2) && !lines.every(l => /^\s*[-+]?\d+,\d+\s*$/.test(l)) ? "," : "space";
    const toks = lines.map(l => splitLine(l, sep));
    const kinds = toks.map(t => t.map(x => kindOf(x, pref, defYear)));
    // Header row: first row whose non-empty cells are all text and has 2+ cells.
    let header = null, start = 0;
    if (kinds[0].filter(k => k !== "empty").length >= 2 && kinds[0].every(k => k === "text" || k === "empty")) { header = toks[0]; start = 1; }
    const ncol = Math.max(...toks.slice(start).map(t => t.length), header ? header.length : 0);
    const col = { session: -1, date: -1, phase: -1, values: [] };
    const names = [];
    if (header) {
      header.forEach((h, i) => {
        if (col.session < 0 && HEAD.session.test(h.trim())) col.session = i;
        else if (col.date < 0 && HEAD.date.test(h)) col.date = i;
        else if (col.phase < 0 && HEAD.phase.test(h)) col.phase = i;
        else { col.values.push(i); names.push(h.trim()); }
      });
      // Unrecognised header for a session counter ("Lesson", "Sitzung", "Session ID"): detect it from the numbers.
      if (col.session < 0 && col.values.length >= 2) {
        const c0 = col.values[0];
        const v = toks.slice(start).filter(t => t.some(x => x)).map(t => toNum(t[c0]));
        if (isCounter(v)) { col.session = c0; col.values.shift(); names.shift(); }
      }
    } else {
      const phaseLine = k => k.filter(x => x !== "empty").length === 1 && k.includes("text");
      const dataRows = kinds.slice(start).filter(k => !phaseLine(k));
      for (let i = 0; i < ncol; i++) {
        const cells = dataRows.map(k => k[i]).filter(k => k && k !== "empty");
        const share = kd => cells.length ? cells.filter(k => k === kd).length / cells.length : 0;
        if (share("date") >= 0.6 && col.date < 0) col.date = i;
        else if (share("text") >= 0.6 && col.phase < 0) col.phase = i;
        else if (cells.length) col.values.push(i);
      }
      // A first numeric column of consecutive whole numbers is a session number, if another numeric column exists.
      if (col.values.length >= 2) {
        const c0 = col.values[0];
        const v = toks.slice(start).filter((t, j) => !phaseLine(kinds[start + j])).map(t => toNum(t[c0]));
        if (isCounter(v)) { col.session = c0; col.values.shift(); }
      }
    }
    // Excel ABA templates often put each phase in its own column (blank cells break the line).
    // If every row has at most one value across 2+ named value columns, read those columns as phases.
    if (header && col.phase < 0 && col.values.length >= 2) {
      const body = toks.slice(start).filter(t => t.some(x => x));
      const counts = body.map(t => col.values.filter(c => toNum(t[c]) !== null).length);
      if (body.length >= 2 && counts.every(c => c <= 1) && counts.some(c => c === 1)) {
        const rows = [], runs = [];
        for (const t of body) {
          const c = col.values.find(c => toNum(t[c]) !== null);
          if (c === undefined) continue;
          const name = header[c].trim();
          rows.push({ d: col.date >= 0 ? parseDate(t[col.date], pref, defYear) || "" : "", v: [toNum(t[c])] });
          const prevCol = runs.length ? runs[runs.length - 1].col : -1;
          if (c !== prevCol) runs.push({ name, start: rows.length - 1, col: c });
        }
        warnings.push(`Read ${runs.length} phase column${runs.length > 1 ? "s" : ""} (${[...new Set(runs.map(r => r.name))].join(", ")}) as phases.`);
        return { rows, phases: runs.map(r => ({ name: r.name, start: r.start })), series: [""], warnings };
      }
    }
    if (col.values.length > 3) { warnings.push(`Only the first 3 value columns were imported (found ${col.values.length}).`); col.values = col.values.slice(0, 3); names.length = Math.min(names.length, 3); }
    const rows = [], runs = [];
    let curPhase = "";
    for (let j = start; j < toks.length; j++) {
      const t = toks[j], k = kinds[j];
      const nonEmpty = k.filter(x => x !== "empty");
      if (nonEmpty.length === 1 && k[k.indexOf("text")] === "text" && !(col.values.length && toNum(t[col.values[0]]) !== null)) {
        curPhase = t[k.indexOf("text")].replace(/^(phase|condition)\s*[:\-]\s*/i, "").replace(/:$/, "").trim();
        continue;
      }
      const ph = col.phase >= 0 && t[col.phase] ? t[col.phase].trim() : curPhase;
      const d = col.date >= 0 ? parseDate(t[col.date], pref, defYear) : null;
      if (col.date >= 0 && t[col.date] && !d) warnings.push(`Row ${j + 1}: couldn't read the date "${t[col.date]}".`);
      const v = col.values.map(c => toNum(t[c]));
      if (!d && v.every(x => x === null)) { if (nonEmpty.length) warnings.push(`Row ${j + 1} skipped: no value found.`); continue; }
      rows.push({ d: d || "", v });
      if (!runs.length || runs[runs.length - 1].name.toLowerCase() !== ph.toLowerCase()) runs.push({ name: ph, start: rows.length - 1 });
    }
    const series = col.values.map((c, i) => names[i] || "");
    if (!series.length) series.push("");
    return { rows, phases: runs.length ? runs : [{ name: "", start: 0 }], series, warnings };
  }

  /* ---------- Phases ---------- */
  // phases: [{name, start}] where start is the 0-based index of the first session in that phase.
  function normPhases(phases, n) {
    let p = (phases || []).map(x => ({ name: String(x.name ?? ""), start: Math.round(+x.start || 0) }));
    p = p.map(x => ({ ...x, start: clamp(x.start, 0, n) })).sort((a, b) => a.start - b.start);
    if (!p.length) p = [{ name: "", start: 0 }];
    p[0].start = 0;
    const out = [];
    for (const x of p) { if (out.length && x.start <= out[out.length - 1].start) { if (x.start === out[out.length - 1].start && out.length > 1) out[out.length - 1] = x; continue; } out.push(x); }
    return out.map((x, i) => ({ ...x, end: (i + 1 < out.length ? out[i + 1].start : n) - 1 }));
  }
  const phaseOf = (ph, i) => { let k = 0; for (let j = 0; j < ph.length; j++) if (i >= ph[j].start) k = j; return k; };

  /* ---------- Trend lines ---------- */
  // Ordinary least squares on (x, y).
  function ols(pts) {
    const n = pts.length;
    if (n < 2) return null;
    const mx = mean(pts.map(p => p.x)), my = mean(pts.map(p => p.y));
    let sxx = 0, sxy = 0;
    for (const p of pts) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); }
    if (sxx === 0) return null;
    const slope = sxy / sxx;
    return { slope, intercept: my - slope * mx, method: "ols" };
  }
  // White's split-middle line of progress: split the phase in half (an odd middle point is left out),
  // join (median x, median y) of each half, then shift the line parallel so half the points lie on or
  // above it and half on or below it.
  function splitMiddle(pts) {
    const n = pts.length;
    if (n < 2) return null;
    const s = [...pts].sort((a, b) => a.x - b.x), h = Math.floor(n / 2);
    const a = s.slice(0, h), b = s.slice(n - h);
    const x1 = median(a.map(p => p.x)), y1 = median(a.map(p => p.y)), x2 = median(b.map(p => p.x)), y2 = median(b.map(p => p.y));
    if (x2 === x1) return null;
    const slope = (y2 - y1) / (x2 - x1), i0 = y1 - slope * x1;
    const shift = median(s.map(p => p.y - (slope * p.x + i0)));
    return { slope, intercept: i0 + shift, method: "split", quarter: { x1, y1, x2, y2 }, shift };
  }

  /* ---------- Graph model ---------- */
  const PCT = /%|percent/i;
  function niceStep(range, target = 5) {
    if (!(range > 0)) return 1;
    const raw = range / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }
  function defaultGraph() {
    return {
      v: 1, title: "", student: "", yLabel: "Percent correct", xLabel: "", xMode: "session", tickLabels: "number", dates: true,
      yMin: "", yMax: "", series: [{ name: "" }], rows: [], phases: [{ name: "Baseline", start: 0 }],
      aim: { on: false, x1: "", y1: "", x2: "", y2: "" }, trend: "none", trendMin: 3,
      crit: { on: false, value: 80, n: 3, dir: "up", scope: "last", line: true, mark: true },
      connectGaps: false, style: "classic", dateFmt: "mdy",
    };
  }
  function graphModel(g0) {
    const g = { ...defaultGraph(), ...g0 };
    g.aim = { ...defaultGraph().aim, ...(g0.aim || {}) };
    g.crit = { ...defaultGraph().crit, ...(g0.crit || {}) };
    const warnings = [];
    const rows = (g.rows || []).map(r => ({ d: r.d || "", v: (r.v || []).map(toNum) }));
    const ns = clamp((g.series || []).length || 1, 1, 3);
    const n = rows.length;
    const cal = g.xMode === "calendar";
    const xs = rows.map((r, i) => cal ? dayNum(r.d) : i + 1);
    if (cal) {
      const missing = xs.filter(x => x === null).length;
      if (missing) warnings.push(`${missing} session${missing > 1 ? "s have" : " has"} no date and can't be placed on a date axis.`);
      for (let i = 1; i < n; i++) if (xs[i] !== null && xs[i - 1] !== null && xs[i] < xs[i - 1]) { warnings.push("Dates are not in order. Sessions are plotted by date; sort the rows so the phases stay correct."); break; }
    }
    const phases = normPhases(g.phases, n);
    const pts = [];
    for (let s = 0; s < ns; s++) pts.push(rows.map((r, i) => ({ i, x: xs[i], y: r.v[s] ?? null, ph: phaseOf(phases, i) })).filter(p => p.x !== null && isNum(p.y)));
    const allY = pts.flat().map(p => p.y);
    // Aim line in data coordinates.
    let aim = null;
    if (g.aim.on) {
      const ax = v => cal ? dayNum(parseDate(v, g.dateFmt) || v) : toNum(v);
      const x1 = ax(g.aim.x1), x2 = ax(g.aim.x2), y1 = toNum(g.aim.y1), y2 = toNum(g.aim.y2);
      if ([x1, x2, y1, y2].every(isNum) && x2 !== x1) aim = { x1, y1, x2, y2 };
      else warnings.push("The aim line needs a start and an end point (" + (cal ? "date" : "session") + " and value).");
    }
    const critV = toNum(g.crit.value);
    const showCrit = g.crit.on && isNum(critV);
    // X domain
    const xVals = xs.filter(isNum);
    if (aim) xVals.push(aim.x1, aim.x2);
    let xMin, xMax;
    if (cal) {
      if (!xVals.length) { const t = dayNum(new Date().toISOString().slice(0, 10)); xVals.push(t, t + 28); }
      const lo = Math.min(...xVals), hi = Math.max(...xVals), span = Math.max(hi - lo, 7);
      xMin = lo - Math.max(1, span * 0.04); xMax = hi + Math.max(1, span * 0.04);
    } else {
      xMin = 0; xMax = Math.max(10, ...xVals.map(Math.ceil)) + 1;
    }
    // Y domain
    const yHi = Math.max(0, ...allY, ...(aim ? [aim.y1, aim.y2] : []), ...(showCrit ? [critV] : []));
    const yLo = Math.min(0, ...allY, ...(aim ? [aim.y1, aim.y2] : []));
    let yMin = toNum(g.yMin), yMax = toNum(g.yMax);
    const pct = PCT.test(g.yLabel || "");
    if (yMin === null) yMin = yLo >= 0 ? 0 : -niceStep(-yLo, 4) * Math.ceil(-yLo / niceStep(-yLo, 4));
    if (yMax === null) {
      if (pct && yHi <= 100) yMax = 100;
      else { const st = niceStep(Math.max(yHi - yMin, 1), 5); yMax = yMin + st * Math.max(1, Math.ceil((yHi - yMin) / st)); }
    }
    if (yMax <= yMin) { warnings.push("The y-axis maximum must be larger than the minimum."); yMax = yMin + 10; }
    if (allY.some(y => y < yMin || y > yMax)) warnings.push("Some values fall outside the y-axis range you set.");
    let yStep = pct && yMin === 0 && yMax === 100 ? 10 : niceStep(yMax - yMin, 5);
    if (allY.length && allY.every(Number.isInteger) && yStep === 2.5) { // counts: whole-number ticks
      yStep = (yMax - yMin) / 2 <= 8 ? 2 : 5;
      if (toNum(g.yMax) === null) yMax = yMin + yStep * Math.ceil((yHi - yMin) / yStep);
    }
    const yTicks = [];
    for (let v = Math.ceil(yMin / yStep - 1e-9) * yStep; v <= yMax + 1e-9; v += yStep) yTicks.push(round(v, 6));
    // Phase geometry in data coordinates
    const ph = phases.map((p, k) => {
      const idx = []; for (let i = p.start; i <= p.end; i++) if (isNum(xs[i])) idx.push(i);
      return { ...p, k, idx, x0: idx.length ? xs[idx[0]] : null, x1: idx.length ? xs[idx[idx.length - 1]] : null };
    });
    const lines = [];
    for (let k = 1; k < ph.length; k++) {
      const prev = ph.slice(0, k).reverse().find(p => p.idx.length), cur = ph[k];
      if (!prev || !cur.idx.length) continue;
      lines.push({ k, x: (prev.x1 + cur.x0) / 2 });
    }
    // Trends on the first series, per phase
    const trends = [];
    if (g.trend === "ols" || g.trend === "split") {
      for (const p of ph) {
        const pp = pts[0].filter(q => q.ph === p.k);
        if (pp.length < Math.max(2, +g.trendMin || 3)) continue;
        const f = g.trend === "ols" ? ols(pp) : splitMiddle(pp);
        if (f) trends.push({ k: p.k, ...f, x0: pp[0].x, x1: pp[pp.length - 1].x });
      }
    }
    const stats = phaseStats(ph, pts[0], g, cal);
    const mastery = showCrit ? masteryCheck(ph, pts[0], { value: critV, n: g.crit.n, dir: g.crit.dir, scope: g.crit.scope }) : null;
    return { g, rows, n, ns, xs, cal, pts, phases: ph, lines, trends, aim, critV: showCrit ? critV : null, mastery, stats, xMin, xMax, yMin, yMax, yTicks, pct, warnings };
  }
  function phaseStats(ph, pts, g, cal) {
    const dir = g.crit && g.crit.dir === "down" ? "down" : "up";
    return ph.map((p, j) => {
      const mine = pts.filter(q => q.ph === p.k), ys = mine.map(q => q.y), xs = mine.map(q => q.x);
      const f = ols(mine);
      const xSpan = xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0;
      let pnd = null;
      const prev = j > 0 ? pts.filter(q => q.ph === p.k - 1).map(q => q.y) : [];
      if (prev.length && ys.length) {
        const lim = dir === "up" ? Math.max(...prev) : Math.min(...prev);
        pnd = ys.filter(y => dir === "up" ? y > lim : y < lim).length / ys.length * 100;
      }
      return { k: p.k, name: p.name, sessions: p.idx.length, n: ys.length, mean: mean(ys), median: median(ys), min: ys.length ? Math.min(...ys) : NaN, max: ys.length ? Math.max(...ys) : NaN, slope: f ? f.slope * (cal ? 7 : 1) : null, slopeUnit: cal ? "week" : "session", xSpan, pnd };
    });
  }
  // Mastery: value meets the criterion (>= when increasing, <= when decreasing) on N consecutive
  // sessions with data. Sessions without data are skipped; they neither count nor break a run.
  function masteryCheck(ph, pts, c) {
    const need = Math.max(1, Math.round(+c.n || 1));
    const lastK = ph.length ? ph.filter(p => p.idx.length).map(p => p.k).pop() : 0;
    const scope = c.scope === "all" ? pts : pts.filter(q => q.ph === lastK);
    let run = 0, runStart = null;
    for (const q of scope) {
      const ok = c.dir === "down" ? q.y <= c.value : q.y >= c.value;
      if (ok) { if (!run) runStart = q.i; run++; if (run >= need) return { met: true, at: q.i, from: runStart, need, run, value: c.value, dir: c.dir }; }
      else { run = 0; runStart = null; }
    }
    return { met: false, need, run, from: runStart, value: c.value, dir: c.dir };
  }

  /* ---------- Graph scene ---------- */
  const PALETTE = {
    classic: { s: ["#111111", "#111111", "#111111"], aim: "#111111", trend: "#111111", crit: "#6b6b76", phase: "#111111" },
    color: { s: ["#0369a1", "#c2410c", "#15803d"], aim: "#15803d", trend: "#b45309", crit: "#6b6b76", phase: "#374151" },
  };
  const MARK = ["circle", "square", "triangle"];
  function marker(items, kind, x, y, c, sz = 5) {
    if (kind === "circle") items.push({ t: "circle", x, y, r: sz, fill: c, stroke: c, w: 1 });
    else if (kind === "square") items.push({ t: "rect", x: x - sz, y: y - sz, w: sz * 2, h: sz * 2, fill: "#ffffff", stroke: c, sw: 1.6 });
    else items.push({ t: "polygon", pts: [[x, y - sz * 1.2], [x + sz * 1.1, y + sz * 0.8], [x - sz * 1.1, y + sz * 0.8]], fill: c, stroke: c, w: 1 });
  }
  function clipSeg(x1, y1, x2, y2, L, T, R, B) { // Liang–Barsky clip to the plot box
    let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
    for (const [p, q] of [[-dx, x1 - L], [dx, R - x1], [-dy, y1 - T], [dy, B - y1]]) {
      if (p === 0) { if (q < 0) return null; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
  }
  function xTicks(m, plotW) {
    const out = [];
    if (m.cal) {
      const lo = Math.ceil(m.xMin), hi = Math.floor(m.xMax), span = hi - lo, fmt = m.g.dateFmt;
      if (span <= 21) { const st = span <= 10 ? 1 : 2; for (let d = lo; d <= hi; d += st) out.push({ x: d, label: fmtDate(fromDay(d), fmt, "mon") }); }
      else if (span <= 150) {
        const st = span <= 70 ? 7 : 14;
        let d = lo; while (new Date(d * 864e5).getUTCDay() !== 1) d++; // Mondays
        for (; d <= hi; d += st) out.push({ x: d, label: fmtDate(fromDay(d), fmt, "mon") });
      } else {
        const st = span <= 400 ? 1 : span <= 800 ? 2 : 3;
        const t = new Date(lo * 864e5); let y = t.getUTCFullYear(), mo = t.getUTCMonth() + 1;
        for (let guard = 0; guard < 200; guard++) {
          const d = Date.UTC(y, mo, 1) / 864e5; // first of the next month
          if (d > hi) break;
          const mm = new Date(d * 864e5).getUTCMonth();
          if (mm % st === 0) out.push({ x: d, label: MON_SHORT[mm] + (mm === 0 || !out.length ? " " + new Date(d * 864e5).getUTCFullYear() : "") });
          mo++; if (mo > 11) { mo = 0; y++; }
        }
      }
      return { ticks: out, labels: out, rotate: out.length > 12 };
    }
    const last = Math.floor(m.xMax - 1);
    const useDates = m.g.tickLabels === "date" && m.rows.some(r => r.d);
    const maxLabels = useDates ? Math.max(4, Math.floor(plotW / 46)) : Math.max(5, Math.floor(plotW / 34));
    const k = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find(s => last / s <= maxLabels) || 1000;
    for (let s = 1; s <= last; s++) {
      const lab = s % k === 0 || k === 1;
      const label = !lab ? null : useDates ? (m.rows[s - 1] && m.rows[s - 1].d ? fmtDate(m.rows[s - 1].d, m.g.dateFmt, "short") : "") : String(s);
      if (last <= 60 || lab) out.push({ x: s, label });
    }
    return { ticks: out, labels: out.filter(t => t.label !== null), rotate: useDates && out.filter(t => t.label).length > 10 };
  }
  function graphScene(g0, opt = {}) {
    const m = opt.model || graphModel(g0), g = m.g;
    const W = opt.w || 1000, H = opt.h || 620;
    const P = PALETTE[g.style] || PALETTE.classic;
    const FONT = "#1b1b1f", GREY = "#55555f";
    const items = [{ t: "rect", x: 0, y: 0, w: W, h: H, fill: "#ffffff" }];
    let y = 16;
    if (g.title) { const lines = wrap(g.title, W - 80, 22, true).slice(0, 2); for (const l of lines) { y += 24; items.push({ t: "text", x: W / 2, y, s: l, size: 22, bold: true, anchor: "middle", c: FONT }); } }
    const sub = [];
    if (g.student) sub.push("Student: " + g.student);
    if (m.n) {
      const ds = m.rows.map(r => r.d).filter(Boolean);
      sub.push(m.n === 1 ? "1 session" : `${m.n} sessions`);
      if (ds.length) { const a = [...ds].sort()[0], b = [...ds].sort().pop(); sub.push(a === b ? fmtDate(a, g.dateFmt) : `${fmtDate(a, g.dateFmt)} – ${fmtDate(b, g.dateFmt)}`); }
    }
    if (sub.length) { y += 20; items.push({ t: "text", x: W / 2, y, s: sub.join("  ·  "), size: 13, anchor: "middle", c: GREY }); }
    // Left margin from y tick labels
    const tickLab = v => fmtNum(v, 2);
    const yTickW = Math.max(...m.yTicks.map(v => textWidth(tickLab(v), 13)), 10);
    const L = 28 + 14 + yTickW + 10, R = W - 28;
    const plotW = R - L;
    const xt = xTicks(m, plotW);
    // Legend items
    const leg = [];
    const named = (g.series || []).slice(0, m.ns).map((s, i) => ({ name: (s && s.name) || "", i }));
    if (m.ns > 1 || named.some(s => s.name)) named.forEach(s => leg.push({ kind: "s", i: s.i, label: s.name || `Series ${s.i + 1}` }));
    if (m.aim) leg.push({ kind: "aim", label: "Aim line" });
    if (m.trends.length) leg.push({ kind: "trend", label: g.trend === "ols" ? "Trend (least squares)" : "Trend (split-middle)" });
    if (m.critV !== null && g.crit.line) leg.push({ kind: "crit", label: `Criterion (${fmtNum(m.critV, 2)}${m.pct ? "%" : ""})` });
    const legW = leg.map(l => 34 + textWidth(l.label, 13) + 22);
    const legRows = []; { let row = [], w = 0; leg.forEach((l, i) => { if (w + legW[i] > W - 60 && row.length) { legRows.push(row); row = []; w = 0; } row.push(i); w += legW[i]; }); if (row.length) legRows.push(row); }
    const creditY = H - 12;
    let bottom = creditY - 16 - legRows.length * 22;
    const xLabel = g.xLabel || (m.cal ? "Date" : g.tickLabels === "date" ? "Session date" : "Sessions");
    const xLabY = bottom - 4; bottom = xLabY - 22;
    const tickLabH = xt.rotate ? Math.max(...xt.labels.map(t => textWidth(t.label, 12))) * 0.72 + 10 : 18;
    const B = bottom - tickLabH - 8; // x-axis line
    // Phase labels above the plot
    const pxRaw = v => L + (v - m.xMin) / (m.xMax - m.xMin) * plotW;
    const bounds = [L, ...m.lines.map(l => pxRaw(l.x)), R];
    // Each phase with data owns the region between its phase-change lines.
    const regions = m.phases.filter(p => p.idx.length).map((p, j) => ({ p, left: bounds[j], right: bounds[j + 1] }));
    // Phase labels: wrap only at spaces (max 2 lines), shrink to fit, and if a region is still too
    // narrow let the label spill sideways while never overlapping its neighbours.
    const wordWrap = (txt, maxW, size) => { const out = []; let line = ""; for (const w of String(txt).split(/\s+/).filter(Boolean)) { const t = line ? line + " " + w : w; if (!line || textWidth(t, size, true) <= maxW) line = t; else { out.push(line); line = w; } } if (line) out.push(line); return out; };
    let labLines = 0;
    const phaseLabs = regions.filter(r => r.p.name).map(r => {
      const wAvail = Math.max(24, r.right - r.left - 8);
      let size = 15, lines = wordWrap(r.p.name, wAvail, size);
      const widest = ls => Math.max(...ls.map(l => textWidth(l, size, true)));
      while ((lines.length > 2 || widest(lines) > wAvail) && size > 11) { size--; lines = wordWrap(r.p.name, wAvail, size); }
      if (lines.length > 2) lines = [lines[0], lines.slice(1).join(" ")];
      lines = lines.map(l => fit(l, Math.max(wAvail, plotW / 3), size, true));
      labLines = Math.max(labLines, lines.length);
      const w = Math.max(...lines.map(l => textWidth(l, size, true)));
      return { r, size, lines, w, cx: (r.left + r.right) / 2 };
    });
    for (let i = 0; i < phaseLabs.length; i++) { // push right past the previous label, keep inside the plot
      const a = phaseLabs[i];
      a.cx = clamp(a.cx, L + a.w / 2, R - a.w / 2);
      if (i > 0) { const pv = phaseLabs[i - 1]; a.cx = Math.max(a.cx, pv.cx + pv.w / 2 + 10 + a.w / 2); }
    }
    for (let i = phaseLabs.length - 2; i >= 0; i--) { // then pull back left if the last ones ran off the edge
      const a = phaseLabs[i], nx = phaseLabs[i + 1];
      if (nx.cx + nx.w / 2 > R) nx.cx = R - nx.w / 2;
      a.cx = Math.min(a.cx, nx.cx - nx.w / 2 - 10 - a.w / 2);
    }
    // Too many or too long labels to spill sideways: keep every label inside its own phase region
    // (smaller text, two lines, then shortened with an ellipsis) so none is pushed off the graph.
    const crowded = phaseLabs.length && (phaseLabs[0].cx - phaseLabs[0].w / 2 < L - 0.5 || phaseLabs.some(a => a.cx + a.w / 2 > R + 0.5));
    if (crowded) {
      labLines = 0;
      const avail = a => Math.max(18, a.r.right - a.r.left - 6);
      const widest = (ls, sz) => Math.max(...ls.map(l => textWidth(l, sz, true)));
      // One text size for every label: the largest (13 down to 9) at which each fits its region in 2 lines.
      let size = 13;
      while (size > 9 && phaseLabs.some(a => { const ls = wordWrap(a.r.p.name, avail(a), size); return ls.length > 2 || widest(ls, size) > avail(a); })) size--;
      for (const a of phaseLabs) {
        let lines = wordWrap(a.r.p.name, avail(a), size);
        if (lines.length > 2) lines = [lines[0], lines.slice(1).join(" ")];
        a.lines = lines.map(l => fit(l, avail(a), size, true));
        a.size = size; a.w = Math.min(avail(a), widest(a.lines, size)); a.cx = (a.r.left + a.r.right) / 2;
        labLines = Math.max(labLines, a.lines.length);
      }
    }
    const T = y + 14 + (labLines ? labLines * 18 + 8 : 6);
    const zeroOff = m.yMin === 0 ? 8 : 0;
    const Y0 = B - zeroOff;
    const px = pxRaw;
    const py = v => Y0 - (v - m.yMin) / (m.yMax - m.yMin) * (Y0 - T);
    const pyc = v => clamp(py(v), T - 2, B);
    // Criterion line
    if (m.critV !== null && g.crit.line) {
      const yy = py(m.critV);
      if (yy >= T - 0.5 && yy <= B) items.push({ t: "line", x1: L, y1: yy, x2: R, y2: yy, w: 1, c: P.crit, dash: [7, 5] });
    }
    // Aim line
    if (m.aim) {
      const c = clipSeg(px(m.aim.x1), py(m.aim.y1), px(m.aim.x2), py(m.aim.y2), L, T, R, B);
      if (c) {
        items.push({ t: "line", x1: c[0], y1: c[1], x2: c[2], y2: c[3], w: 1.8, c: P.aim });
        const ex = c[2], ey = c[3], above = ey - 8 > T + 10;
        items.push({ t: "text", x: Math.min(ex, R - 2), y: above ? ey - 8 : ey + 16, s: "Aim", size: 12, bold: true, anchor: ex > R - 30 ? "end" : "middle", c: P.aim });
      }
    }
    // Phase-change lines
    for (const l of m.lines) items.push({ t: "line", x1: px(l.x), y1: B, x2: px(l.x), y2: T - (labLines ? 0 : 2), w: 1.4, c: P.phase, dash: [6, 4] });
    // Phase labels
    for (const pl of phaseLabs) {
      const cx = pl.cx;
      pl.lines.forEach((ln, i) => items.push({ t: "text", x: cx, y: T - 8 - (pl.lines.length - 1 - i) * 18, s: ln, size: pl.size, bold: true, anchor: "middle", c: FONT }));
    }
    // Trend lines
    for (const tr of m.trends) {
      const c = clipSeg(px(tr.x0), py(tr.slope * tr.x0 + tr.intercept), px(tr.x1), py(tr.slope * tr.x1 + tr.intercept), L, T, R, B);
      if (c) items.push({ t: "line", x1: c[0], y1: c[1], x2: c[2], y2: c[3], w: 1.6, c: P.trend, dash: [2, 4], round: true });
    }
    // Data paths: never connected across a phase change; gaps break the path unless connectGaps.
    for (let s = 0; s < m.ns; s++) {
      const col = P.s[s];
      for (const p of m.phases) {
        let seg = [];
        const flush = () => { if (seg.length > 1) items.push({ t: "poly", pts: seg, w: 1.5, c: col }); seg = []; };
        for (let i = p.start; i <= p.end; i++) {
          const yv = m.rows[i] ? m.rows[i].v[s] : null, xv = m.xs[i];
          if (isNum(yv) && isNum(xv)) seg.push([px(xv), pyc(yv)]);
          else if (!g.connectGaps) flush();
        }
        flush();
      }
      for (const q of m.pts[s]) marker(items, MARK[s], px(q.x), pyc(q.y), col, s === 0 ? 5 : 4.6);
    }
    // Mastery annotation: try above, left, right, then below the point, avoiding markers and lines.
    if (m.mastery && m.mastery.met && g.crit.mark && m.rows[m.mastery.at]) {
      const xv = m.xs[m.mastery.at], yv = m.rows[m.mastery.at].v[0];
      if (isNum(xv) && isNum(yv)) {
        const X = px(xv), Yp = pyc(yv), label = "Criterion met", tw = textWidth(label, 12, true);
        const segs = items.filter(it => it.t === "line" || it.t === "poly").flatMap(it => it.t === "line" ? [[it.x1, it.y1, it.x2, it.y2]] : it.pts.slice(1).map((q, i) => [it.pts[i][0], it.pts[i][1], q[0], q[1]]));
        const dots = items.filter(it => it.t === "circle" || it.t === "rect" && it.w < 20 || it.t === "polygon").map(it => it.t === "circle" ? [it.x, it.y] : it.t === "rect" ? [it.x + it.w / 2, it.y + it.h / 2] : [it.pts[0][0], it.pts[1][1] - 4]);
        const free = (x0, y0, x1, y1) => {
          if (x0 < L + 2 || x1 > R - 2 || y0 < T - 4 || y1 > B - 2) return false;
          if (dots.some(([dx, dy]) => dx > x0 - 6 && dx < x1 + 6 && dy > y0 - 6 && dy < y1 + 6)) return false;
          for (const [a, b, c, d] of segs) for (let k = 0; k <= 12; k++) { const sx = a + (c - a) * k / 12, sy = b + (d - b) * k / 12; if (sx > x0 - 1 && sx < x1 + 1 && sy > y0 - 1 && sy < y1 + 1) return false; }
          return true;
        };
        const opts = [
          { box: [X - tw / 2, Yp - 47, X + tw / 2, Yp - 33], arrow: [X, Yp - 32, X, Yp - 11], tip: "down", tx: X, ty: Yp - 37, anchor: "middle" },
          { box: [X - 34 - tw, Yp - 9, X - 30, Yp + 5], arrow: [X - 28, Yp, X - 10, Yp], tip: "right", tx: X - 32, ty: Yp + 4, anchor: "end" },
          { box: [X + 30, Yp - 9, X + 34 + tw, Yp + 5], arrow: [X + 28, Yp, X + 10, Yp], tip: "left", tx: X + 32, ty: Yp + 4, anchor: "start" },
          { box: [X - tw / 2, Yp + 33, X + tw / 2, Yp + 47], arrow: [X, Yp + 32, X, Yp + 11], tip: "up", tx: X, ty: Yp + 45, anchor: "middle" },
        ];
        const o = opts.find(c => free(...c.box)) || opts.find(c => c.box[0] >= L && c.box[2] <= R && c.box[1] >= T - 4 && c.box[3] <= B) || opts[0];
        const [ax1, ay1, ax2, ay2] = o.arrow;
        items.push({ t: "line", x1: ax1, y1: ay1, x2: ax2, y2: ay2, w: 1.2, c: FONT });
        const tri = { down: [[ax2, ay2 + 1], [ax2 - 4, ay2 - 6], [ax2 + 4, ay2 - 6]], up: [[ax2, ay2 - 1], [ax2 - 4, ay2 + 6], [ax2 + 4, ay2 + 6]], right: [[ax2 + 1, ay2], [ax2 - 6, ay2 - 4], [ax2 - 6, ay2 + 4]], left: [[ax2 - 1, ay2], [ax2 + 6, ay2 - 4], [ax2 + 6, ay2 + 4]] }[o.tip];
        items.push({ t: "polygon", pts: tri, fill: FONT, stroke: FONT, w: 0.5 });
        items.push({ t: "rect", x: o.box[0] - 2, y: o.box[1], w: o.box[2] - o.box[0] + 4, h: o.box[3] - o.box[1], fill: "#ffffff" });
        items.push({ t: "text", x: o.tx, y: o.ty, s: label, size: 12, bold: true, anchor: o.anchor, c: FONT });
      }
    }
    // Axes (y-axis from the x-axis up; floating zero keeps 0 values off the x-axis line)
    items.push({ t: "line", x1: L, y1: B, x2: R, y2: B, w: 1.5, c: FONT });
    items.push({ t: "line", x1: L, y1: B, x2: L, y2: T, w: 1.5, c: FONT });
    for (const v of m.yTicks) {
      const yy = py(v);
      items.push({ t: "line", x1: L - 6, y1: yy, x2: L, y2: yy, w: 1.2, c: FONT });
      items.push({ t: "text", x: L - 10, y: yy + 4.5, s: tickLab(v), size: 13, anchor: "end", c: FONT });
    }
    for (const tk of xt.ticks) {
      const xx = px(tk.x);
      if (xx < L - 0.5 || xx > R + 0.5) continue;
      const major = tk.label !== null && tk.label !== undefined;
      items.push({ t: "line", x1: xx, y1: B, x2: xx, y2: B + (major ? 6 : 3.5), w: 1.2, c: FONT });
      if (major && tk.label) {
        if (xt.rotate) items.push({ t: "text", x: xx + 4, y: B + 14, s: tk.label, size: 12, anchor: "end", rot: -45, c: FONT });
        else items.push({ t: "text", x: xx, y: B + 21, s: tk.label, size: 13, anchor: "middle", c: FONT });
      }
    }
    items.push({ t: "text", x: (L + R) / 2, y: xLabY, s: xLabel, size: 15, bold: true, anchor: "middle", c: FONT });
    items.push({ t: "text", x: 24, y: (T + B) / 2, s: fit(g.yLabel || "Value", B - T, 15, true), size: 15, bold: true, anchor: "middle", rot: -90, c: FONT });
    // Legend
    legRows.forEach((row, ri) => {
      const total = row.reduce((s, i) => s + legW[i], 0) - 22;
      let x = (W - total) / 2; const yy = xLabY + 24 + ri * 22;
      for (const i of row) {
        const l = leg[i];
        if (l.kind === "s") { items.push({ t: "line", x1: x, y1: yy - 4, x2: x + 26, y2: yy - 4, w: 1.5, c: P.s[l.i] }); marker(items, MARK[l.i], x + 13, yy - 4, P.s[l.i], 4.5); }
        else if (l.kind === "aim") items.push({ t: "line", x1: x, y1: yy - 4, x2: x + 26, y2: yy - 4, w: 1.8, c: P.aim });
        else if (l.kind === "trend") items.push({ t: "line", x1: x, y1: yy - 4, x2: x + 26, y2: yy - 4, w: 1.6, c: P.trend, dash: [2, 4], round: true });
        else items.push({ t: "line", x1: x, y1: yy - 4, x2: x + 26, y2: yy - 4, w: 1, c: P.crit, dash: [7, 5] });
        items.push({ t: "text", x: x + 34, y: yy, s: l.label, size: 13, c: FONT });
        x += legW[i];
      }
    });
    if (!m.n) items.push({ t: "text", x: (L + R) / 2, y: (T + B) / 2, s: "Add session data to draw the graph", size: 16, anchor: "middle", c: "#8a8a96" });
    // Referral credit (always present on exported graphs)
    items.push({ t: "text", x: W - 14, y: creditY, s: CREDIT, size: 11, anchor: "end", c: "#8a8a96", href: CREDIT_URL });
    return { w: W, h: H, items, model: m, plot: { L, R, T, B, Y0 }, px, py };
  }

  /* ---------- Progress note (template-based, no AI) ---------- */
  function progressNote(g0, model) {
    const m = model || graphModel(g0), g = m.g;
    if (!m.pts[0].length) return "";
    const unit = m.pct ? "%" : "";
    const v = x => fmtNum(x, 1) + unit;
    const who = g.student || "the student";
    const what = g.title ? ` on ${g.title.replace(/[.\s]+$/, "")}` : "";
    const range = st => st.min === st.max ? v(st.min) : `${v(st.min)} to ${v(st.max)}`;
    const span = st => { const p = m.phases[st.k]; const a = p.start + 1, b = p.end + 1; const da = m.rows[p.start] && m.rows[p.start].d, db = m.rows[p.end] && m.rows[p.end].d; return da && db ? `${fmtDate(da, g.dateFmt)} to ${fmtDate(db, g.dateFmt)}` : a === b ? `session ${a}` : `sessions ${a} to ${b}`; };
    const parts = [];
    const withData = m.stats.filter(s => s.n);
    const yUnit = !m.pct && g.yLabel ? ` Data are reported as ${g.yLabel.toLowerCase()}.` : "";
    withData.forEach((st, j) => {
      const name = st.name ? (j === 0 ? `During ${st.name.toLowerCase().startsWith("baseline") ? "baseline" : st.name}` : `During ${st.name}`) : `During phase ${st.k + 1}`;
      let s = `${name} (${span(st)}, ${st.n} data point${st.n > 1 ? "s" : ""}), ${j === 0 ? who + "'s performance" : "performance"} averaged ${v(st.mean)} (range ${range(st)}).`;
      if (st.n >= 3 && st.slope !== null) {
        // "Flat" when the fitted line changes by less than 5% of the y-axis range across the phase.
        const yr = Math.max(m.yMax - m.yMin, 1e-9), rel = Math.abs(st.slope) / (m.cal ? 7 : 1) * Math.max(st.xSpan, 1) / yr;
        const dirw = rel < 0.05 ? "a relatively flat trend" : st.slope > 0 ? "an increasing trend" : "a decreasing trend";
        s += ` The data showed ${dirw} (${st.slope >= 0 ? "+" : ""}${fmtNum(st.slope, 2)}${m.pct ? " percentage points" : ""} per ${st.slopeUnit}, least-squares fit).`;
      }
      parts.push(s);
    });
    const last = m.pts[0].slice(-3);
    if (last.length === 3 && withData.length) parts.push(`Across the 3 most recent sessions, ${who} averaged ${v(mean(last.map(q => q.y)))}.`);
    if (m.mastery) {
      const c = `${m.mastery.dir === "down" ? "at or below" : "at or above"} ${v(m.mastery.value)} for ${m.mastery.need} consecutive session${m.mastery.need > 1 ? "s" : ""}`;
      if (m.mastery.met) { const d = m.rows[m.mastery.at] && m.rows[m.mastery.at].d; parts.push(`The mastery criterion (${c}) was met ${d ? "on " + fmtDate(d, g.dateFmt) + " (session " + (m.mastery.at + 1) + ")" : "at session " + (m.mastery.at + 1)}.`); }
      else parts.push(`The mastery criterion (${c}) has not been met yet${m.mastery.run ? `; the current run is ${m.mastery.run} session${m.mastery.run > 1 ? "s" : ""}` : ""}.`);
    }
    if (m.aim && m.pts[0].length) {
      const q = m.pts[0][m.pts[0].length - 1];
      if (q.x >= Math.min(m.aim.x1, m.aim.x2) && q.x <= Math.max(m.aim.x1, m.aim.x2)) {
        const expect = m.aim.y1 + (m.aim.y2 - m.aim.y1) * (q.x - m.aim.x1) / (m.aim.x2 - m.aim.x1);
        const upGoal = m.aim.y2 >= m.aim.y1;
        const onTrack = upGoal ? q.y >= expect : q.y <= expect;
        parts.push(`The most recent data point (${v(q.y)}) is ${onTrack ? "at or better than" : "below"} the aim line (${v(expect)} expected at that point).`);
      }
    }
    const lead = `Progress summary for ${who}${what}.`;
    return [lead, ...parts].join(" ") + yUnit;
  }

  /* ---------- CSV ---------- */
  const csvCell = v => { const s = String(v ?? ""); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"` : s; };
  function graphCSV(g0) {
    const m = graphModel(g0), g = m.g;
    const head = ["Session", "Date", "Phase", ...Array.from({ length: m.ns }, (_, i) => (g.series[i] && g.series[i].name) || (m.ns > 1 ? `Series ${i + 1}` : g.yLabel || "Value"))];
    const lines = [head.map(csvCell).join(",")];
    m.rows.forEach((r, i) => lines.push([i + 1, r.d, m.phases[phaseOf(m.phases, i)].name, ...Array.from({ length: m.ns }, (_, s) => isNum(r.v[s]) ? r.v[s] : "")].map(csvCell).join(",")));
    return lines.join("\r\n") + "\r\n";
  }

  return { SITE, CREDIT, CREDIT_URL, textWidth, wrap, fit, toNum, parseDate, dayNum, fromDay, addDays, fmtDate, fmtClock, fmtNum, mean, median, round, clamp, isNum,
    parsePaste, normPhases, phaseOf, ols, splitMiddle, niceStep, defaultGraph, graphModel, masteryCheck, graphScene, progressNote, graphCSV, csvCell, MON_SHORT,
    _internal: {} };
});
