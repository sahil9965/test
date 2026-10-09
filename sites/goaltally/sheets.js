/* GoalTally data sheets: layouts for every measurement type, as page "scenes" in PDF points.
   The same scene is drawn as SVG for the on-screen preview and as vector PDF for download. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./core.js"));
  else root.GTS = factory(root.GT);
})(typeof self !== "undefined" ? self : this, function (GT) {
  "use strict";
  const { textWidth, wrap, fit, clamp, fmtDate, fmtClock, fmtNum, isNum, CREDIT, CREDIT_URL } = GT;

  const TYPES = {
    trial: { name: "Trial-by-trial (DTT)", title: "Trial-by-Trial Data Sheet", group: "skill", y: "Percent correct", path: "/trial-by-trial-data-sheet" },
    prompt: { name: "Prompt level", title: "Prompt Level Data Sheet", group: "skill", y: "Percent independent", path: "/prompt-level-data-sheet" },
    probe: { name: "Cold probe", title: "Cold Probe Data Sheet", group: "skill", y: "Percent of targets correct", path: "/cold-probe-data-sheet" },
    task: { name: "Task analysis", title: "Task Analysis Data Sheet", group: "skill", y: "Percent of steps independent", path: "/task-analysis-data-sheet" },
    frequency: { name: "Frequency / rate", title: "Frequency Data Sheet", group: "behavior", y: "Responses per hour", path: "/frequency-data-sheet" },
    duration: { name: "Duration", title: "Duration Recording Data Sheet", group: "behavior", y: "Total duration (minutes)", path: "/duration-recording-data-sheet" },
    latency: { name: "Latency", title: "Latency Recording Data Sheet", group: "behavior", y: "Mean latency (seconds)", path: "/duration-recording-data-sheet" },
    partial: { name: "Partial interval", title: "Partial Interval Recording Data Sheet", group: "interval", y: "Percent of intervals", path: "/partial-interval-recording-data-sheet" },
    whole: { name: "Whole interval", title: "Whole Interval Recording Data Sheet", group: "interval", y: "Percent of intervals", path: "/whole-interval-recording-data-sheet" },
    mts: { name: "Momentary time sampling", title: "Momentary Time Sampling Data Sheet", group: "interval", y: "Percent of intervals", path: "/momentary-time-sampling-data-sheet" },
    abc: { name: "ABC (antecedent-behavior-consequence)", title: "ABC Data Sheet", group: "abc", y: null, path: "/abc-data-sheet" },
  };
  const ORDER = ["trial", "prompt", "probe", "task", "frequency", "duration", "latency", "partial", "whole", "mts", "abc"];
  const PROMPTS = "FP = Full physical\nPP = Partial physical\nM = Model\nG = Gestural\nV = Verbal\nI = Independent";
  const ANTECEDENTS = "Demand or instruction given\nTold \"no\" / item denied\nTransition between activities\nAttention given to others\nPreferred item removed\nAlone / unstructured time\nNoise or crowding";
  const CONSEQUENCES = "Verbal redirection\nReprimand\nDemand removed or delayed\nItem or activity given\nAttention from adult or peer\nPlanned ignoring\nBreak given";
  const TA_STEPS = "Turn on the water\nWet hands\nGet soap\nRub hands together for 20 seconds\nRinse hands\nTurn off the water\nDry hands with a towel\nThrow the towel away";

  function defaultSheet(type) {
    if (!TYPES[type]) type = "trial";
    const base = { v: 1, type, student: "", title: "", goal: "", criterion: "", definition: "", paper: "letter", orient: "auto", notes: true, printCodes: true };
    switch (type) {
      case "trial": return { ...base, trials: 10, sessions: 10, codes: "+-", criterion: "80% correct across 3 consecutive sessions" };
      case "prompt": return { ...base, trials: 10, sessions: 10, prompts: PROMPTS, criterion: "80% independent across 3 consecutive sessions" };
      case "probe": return { ...base, targets: "", blankRows: 12, sessions: 8, introCol: true, criterion: "Yes on 3 consecutive probes" };
      case "task": return { ...base, steps: TA_STEPS, sessions: 8, scoring: "prompt", prompts: PROMPTS, chaining: "total", criterion: "100% of steps independent across 3 consecutive sessions" };
      case "frequency": return { ...base, behaviors: "Target behavior", rows: 0, rate: "hour" };
      case "duration": return { ...base, behaviors: "Target behavior", episodes: 5, rows: 0, graphAs: "minutes" };
      case "latency": return { ...base, behaviors: "Response to instruction", rows: 0 };
      case "partial": case "whole": return { ...base, behaviors: "Target behavior", interval: 10, minutes: 10, perPage: 2 };
      case "mts": return { ...base, behaviors: "Target behavior", interval: 30, minutes: 15, perPage: 2 };
      case "abc": return { ...base, layout: "checklist", rows: 0, behaviors: "", antecedents: ANTECEDENTS, consequences: CONSEQUENCES, functionCol: true };
    }
  }
  const lines = s => String(s ?? "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  function parsePrompts(text) {
    const out = [];
    for (const l of lines(text)) {
      const m = l.match(/^([^=:–-]{1,6}?)\s*(?:=|:|–|-)\s*(.+)$/);
      if (m) out.push({ code: m[1].trim(), label: m[2].trim() }); else out.push({ code: l.slice(0, 4), label: l });
    }
    return out.slice(0, 10);
  }
  const indepCode = list => (list.find(p => /^i(nd)?$/i.test(p.code) || /independ/i.test(p.label)) || list[list.length - 1] || { code: "I" }).code;
  const behaviorsOf = cfg => { const b = lines(cfg.behaviors).slice(0, 3); return b.length ? b : [""]; };
  const show = c => c === "-" ? "–" : c;

  // Codes, the code that counts as "correct/independent", and labels used on a sheet type.
  function codesFor(cfg) {
    const t = cfg.type;
    if (t === "trial") {
      const codes = cfg.codes === "+-P" ? ["+", "P", "-"] : cfg.codes === "YN" ? ["Y", "N"] : ["+", "-"];
      const key = cfg.codes === "YN" ? "Y = correct · N = incorrect or no response" : cfg.codes === "+-P" ? "+ = correct, independent · P = correct with a prompt · – = incorrect or no response" : "+ = correct, independent · – = incorrect or no response";
      return { codes, good: [codes[0]], key: key + ". % correct = " + (cfg.codes === "YN" ? "Y" : "+") + " ÷ trials run × 100.", count: "# correct", pct: "% correct" };
    }
    if (t === "prompt" || (t === "task" && cfg.scoring !== "+-")) {
      const p = parsePrompts(cfg.prompts || PROMPTS);
      const ind = indepCode(p);
      const key = "Prompt codes: " + p.map(x => `${x.code} = ${x.label}`).join(" · ") + (t === "prompt" ? `. Circle the level of help needed on each trial. % independent = ${ind} ÷ trials run × 100.` : `. % independent = steps scored ${ind} ÷ steps scored × 100.`);
      return { codes: p.map(x => x.code), good: [ind], key, count: t === "prompt" ? "# independent" : "# indep. steps", pct: "% independent" };
    }
    if (t === "task") return { codes: ["+", "-"], good: ["+"], key: "+ = step completed independently · – = prompted or not completed. % independent = + ÷ steps scored × 100.", count: "# indep. steps", pct: "% independent" };
    if (t === "probe") return { codes: ["Y", "N"], good: ["Y"], key: "Y = correct on the first trial with no prompt · N = incorrect, prompted or no response. Probe each target once, before any teaching that day.", count: "# Yes", pct: "% Yes" };
    return { codes: [], good: [], key: "" };
  }
  function intervalInfo(cfg) {
    const sec = clamp(Math.round(+cfg.interval || 10), 5, 1800), min = clamp(+cfg.minutes || 10, 1, 240);
    const n = Math.floor(min * 60 / sec);
    return { sec, min, n: Math.min(n, 720), capped: n > 720 };
  }

  /* ---------- Session values for graphs ---------- */
  function sessionValues(cfg, s) {
    const t = cfg.type;
    if (["trial", "prompt", "task", "probe"].includes(t)) {
      const c = codesFor(cfg), cells = (s.cells || []).filter(x => x !== null && x !== undefined && x !== "");
      if (!cells.length) return [null];
      return [GT.round(cells.filter(x => c.good.includes(x)).length / cells.length * 100, 1)];
    }
    if (t === "frequency") {
      const mins = +s.minutes;
      return behaviorsOf(cfg).map((_, i) => {
        const n = +((s.counts || [])[i] || 0);
        if (cfg.rate === "none") return n;
        if (!(mins > 0)) return null;
        return GT.round(cfg.rate === "min" ? n / mins : n / mins * 60, 2);
      });
    }
    if (t === "duration") {
      const tot = (s.episodes || []).reduce((a, b) => a + (+b || 0), 0);
      if (cfg.graphAs === "percent") return [+s.obsMin > 0 ? GT.round(tot / (s.obsMin * 60) * 100, 1) : null];
      return [GT.round(tot / 60, 2)];
    }
    if (t === "latency") { const l = (s.lat || []).filter(isNum); return [l.length ? GT.round(GT.mean(l), 1) : null]; }
    if (["partial", "whole", "mts"].includes(t)) {
      const n = +s.n || intervalInfo(cfg).n;
      return behaviorsOf(cfg).map((_, i) => { const mk = (s.marks || [])[i] || []; return n ? GT.round(mk.slice(0, n).filter(Boolean).length / n * 100, 1) : null; });
    }
    return [null];
  }
  function graphSetup(cfg) {
    const t = cfg.type, T = TYPES[t] || TYPES.trial;
    let y = T.y || "Count";
    if (t === "frequency") y = cfg.rate === "min" ? "Responses per minute" : cfg.rate === "none" ? "Count per session" : "Responses per hour";
    if (t === "duration" && cfg.graphAs === "percent") y = "Percent of observation";
    const multi = t === "frequency" || T.group === "interval";
    const series = multi ? behaviorsOf(cfg).map(b => ({ name: behaviorsOf(cfg).length > 1 ? b : "" })) : [{ name: "" }];
    return { yLabel: y, series, dir: T.group === "skill" || t === "latency" ? (t === "latency" ? "down" : "up") : "down" };
  }

  /* ---------- Page building ---------- */
  const M = 36, FOOT = 16;
  const PAPER = { letter: [612, 792], a4: [595.28, 841.89] };
  const INK = "#111111", GRID = "#3a3a3a", SOFT = "#efefef", HINT = "#6b6b6b";
  function autoOrient(cfg) {
    const t = cfg.type;
    if (t === "duration" || t === "abc") return "landscape";
    if (t === "frequency") { const nb = behaviorsOf(cfg).length; return nb >= 3 || (nb === 2 && cfg.rate !== "none") ? "landscape" : "portrait"; }
    if (["trial", "prompt", "probe", "task"].includes(t)) {
      const W = PAPER[cfg.paper === "a4" ? "a4" : "letter"][0] - 2 * M;
      const lab = t === "task" ? clamp(W * 0.36, 150, 240) : t === "probe" ? clamp(W * 0.3, 120, 200) : 50;
      const fitCols = Math.floor((W - lab - (t === "probe" ? (cfg.introCol ? 104 : 52) : 0)) / minColW(cfg));
      return clamp(Math.round(+cfg.sessions || 10), 1, 31) > fitCols ? "landscape" : "portrait";
    }
    return "portrait";
  }
  function pageSize(cfg) {
    const [w, h] = PAPER[cfg.paper === "a4" ? "a4" : "letter"];
    const o = cfg.orient === "portrait" || cfg.orient === "landscape" ? cfg.orient : autoOrient(cfg);
    return o === "landscape" ? { w: h, h: w, o } : { w, h, o };
  }
  const T_ = (it, x, y, s, size, o = {}) => it.push({ t: "text", x, y, s: String(s), size, bold: !!o.bold, anchor: o.anchor || "start", c: o.c || INK, ...(o.href ? { href: o.href } : {}) });
  const L_ = (it, x1, y1, x2, y2, w = 0.6, c = GRID, dash) => it.push({ t: "line", x1, y1, x2, y2, w, c, ...(dash ? { dash } : {}) });
  const R_ = (it, x, y, w, h, o = {}) => it.push({ t: "rect", x, y, w, h, fill: o.fill || null, stroke: o.stroke === undefined ? GRID : o.stroke, sw: o.sw || 0.6 });
  function ctext(it, x, y, w, h, s, o = {}) {
    const size = o.size || 9, bold = !!o.bold, pad = o.pad ?? 3, lh = size * 1.2;
    s = String(s ?? "");
    if (!s) return;
    let ls = o.wrap ? wrap(s, w - 2 * pad, size, bold) : [fit(s, w - 2 * pad, size, bold)];
    const maxL = Math.max(1, Math.floor((h - 2) / lh));
    if (ls.length > maxL) { ls = ls.slice(0, maxL); ls[maxL - 1] = fit(ls[maxL - 1] + "…", w - 2 * pad, size, bold); }
    const y0 = o.valign === "top" ? y + pad + size * 0.8 : y + (h - ls.length * lh) / 2 + lh / 2 + size * 0.35;
    const anchor = o.align === "center" ? "middle" : o.align === "right" ? "end" : "start";
    const ax = anchor === "middle" ? x + w / 2 : anchor === "end" ? x + w - pad : x + pad;
    ls.forEach((l, i) => T_(it, ax, y0 + i * lh, l, size, { bold, anchor, c: o.c }));
  }
  // Wrap code hints ("FP  PP  M  G  V  I") token by token, keeping a double space between codes.
  function wrapTokens(tokens, maxW, size) {
    const out = []; let line = "";
    for (const t of tokens) { const c = line ? line + "  " + t : t; if (!line || textWidth(c, size) <= maxW) line = c; else { out.push(line); line = t; } }
    if (line) out.push(line);
    return out;
  }
  function hintText(it, x, y, w, h, tokens, size) {
    const ls = wrapTokens(tokens, w - 4, size), lh = size * 1.15;
    const y0 = y + (h - ls.length * lh) / 2 + lh / 2 + size * 0.35;
    ls.forEach((l, i) => T_(it, x + w / 2, y0 + i * lh, l, size, { anchor: "middle", c: "#555555" }));
  }
  const box = (it, x, y, s = 6.5) => R_(it, x, y, s, s, { sw: 0.7, stroke: "#333" });

  function fieldRow(it, x, y, W, fields) {
    const tot = fields.reduce((a, f) => a + (f[2] || 1), 0);
    let cx = x;
    for (const [label, val, fr = 1] of fields) {
      const fw = W * fr / tot;
      T_(it, cx, y + 12, label + ":", 8.5, { bold: true, c: "#333" });
      const lx = cx + textWidth(label + ":", 8.5, true) + 4;
      L_(it, lx, y + 14, cx + fw - 10, y + 14, 0.5, "#777");
      if (val) T_(it, lx + 2, y + 11.5, fit(val, cx + fw - 12 - lx - 2, 10), 10);
      cx += fw;
    }
    return y + 20;
  }
  function textBlock(it, x, y, W, label, value, maxLines = 3) {
    const lw = textWidth(label + ":", 8.5, true) + 4;
    T_(it, x, y + 11, label + ":", 8.5, { bold: true, c: "#333" });
    if (!value) { L_(it, x + lw, y + 13.5, x + W - 10, y + 13.5, 0.5, "#777"); return y + 19; }
    const ls = wrap(value, W - lw - 10, 9.5).slice(0, maxLines);
    ls.forEach((l, i) => T_(it, x + lw, y + 11 + i * 12, l, 9.5));
    return y + 7 + ls.length * 12;
  }
  function pageHeader(it, P, cfg, info, opts, pageNo) {
    const T = TYPES[cfg.type], W = P.w - 2 * M;
    let y = M, logoW = 0;
    if (opts.logo && opts.logo.src && opts.logo.w && opts.logo.h) {
      const r = Math.min(140 / opts.logo.w, 40 / opts.logo.h), lw = opts.logo.w * r, lh = opts.logo.h * r;
      it.push({ t: "image", x: P.w - M - lw, y: M - 6, w: lw, h: lh, src: opts.logo.src, fmt: opts.logo.fmt });
      logoW = lw + 14;
    }
    T_(it, M, y + 14, fit(T.title + (pageNo > 1 ? " (continued)" : ""), W - logoW, 16, true), 16, { bold: true });
    y += 24;
    const grp = T.group;
    const beh = behaviorsOf(cfg).filter(Boolean);
    const behLabel = beh.length > 1 ? beh.map((b, i) => `${String.fromCharCode(65 + i)} = ${b}`).join(", ") : beh[0] || "";
    if (pageNo > 1) {
      return fieldRow(it, M, y, W - logoW, grp === "skill" ? [["Student", cfg.student, 1], ["Target / skill", cfg.title, 2.2]] : [["Student", cfg.student, 1], [grp === "abc" ? "Staff" : "Behavior", grp === "abc" ? "" : behLabel, 2.2]]) + 4;
    }
    if (grp === "skill") {
      y = fieldRow(it, M, y, W - logoW, [["Student", cfg.student, 1], ["Target / skill", cfg.title, 2.2]]);
      y = fieldRow(it, M, y, W, [["Staff", "", 1], ["Setting", "", 1], ["Dates", "", 1]]);
      y = textBlock(it, M, y, W, "Goal", cfg.goal, 3);
      y = textBlock(it, M, y, W, "Mastery criterion", cfg.criterion, 2);
    } else if (grp === "abc") {
      y = fieldRow(it, M, y, W - logoW, [["Student", cfg.student, 1], ["Staff", "", 1], ["Setting", "", 1]]);
      y = textBlock(it, M, y, W, "Behavior(s) of concern", behLabel || cfg.title, 2);
      y = textBlock(it, M, y, W, "Definition", cfg.definition, 3);
    } else {
      y = fieldRow(it, M, y, W - logoW, [["Student", cfg.student, 1], ["Behavior", behLabel || cfg.title, 2.2]]);
      y = fieldRow(it, M, y, W, [["Staff", "", 1], ["Setting", "", 1], [grp === "interval" ? "Week of" : "Week of", "", 1]]);
      y = textBlock(it, M, y, W, "Definition", cfg.definition, 3);
      if (cfg.goal) y = textBlock(it, M, y, W, "Goal", cfg.goal, 2);
    }
    if (info.key) {
      const ls = wrap(info.key, W, 8).slice(0, 4);
      ls.forEach((l, i) => T_(it, M, y + 10 + i * 10, l, 8, { c: "#333" }));
      y += 4 + ls.length * 10;
    }
    return y + 8;
  }
  function footer(it, P, i, n) {
    const y = P.h - 20;
    T_(it, M, y, "Made with ", 7.5, { c: "#8a8a8a" });
    const x2 = M + textWidth("Made with ", 7.5);
    T_(it, x2, y, "GoalTally", 7.5, { bold: true, c: "#6b6b6b", href: CREDIT_URL });
    T_(it, x2 + textWidth("GoalTally", 7.5, true), y, " · abagraph.roohsites.com · free ABA graphs and data sheets", 7.5, { c: "#8a8a8a" });
    if (n > 1) T_(it, P.w - M, y, `Page ${i} of ${n}`, 7.5, { anchor: "end", c: "#6b6b6b" });
  }

  /* Band paginator: bands are horizontal strips drawn top to bottom. A band with .head repeats that
     header band at the top of a new page. Growable bands stretch (up to .max) to fill each page. */
  function paginate(P, bands, headerFn, cfg) {
    const bottom = P.h - M - FOOT, pages = [];
    let i = 0, guard = 0;
    while (i < bands.length && guard++ < 500) {
      const it = [], pageNo = pages.length + 1;
      const y0 = headerFn(it, pageNo);
      const avail = bottom - y0;
      const placed = [];
      let used = 0;
      const b0 = bands[i];
      if (b0.head && b0.head !== b0 && pageNo > 1) { placed.push(b0.head); used += b0.head.min; }
      while (i < bands.length) {
        const b = bands[i];
        if (used + b.min > avail + 0.01) break;
        if (b.isHead && i + 1 < bands.length && used + b.min + bands[i + 1].min > avail + 0.01) break; // never strand a header
        placed.push(b); used += b.min; i++;
      }
      if (!placed.length || placed.every(b => b.isHead || b === (bands[i] && bands[i].head))) { placed.push(bands[i]); used += bands[i].min; i++; } // oversize band: place it anyway
      const hs = placed.map(b => b.min);
      let extra = avail - used;
      const last = i >= bands.length;
      for (let pass = 0; pass < 6 && extra > 0.5; pass++) {
        const idx = placed.map((b, k) => k).filter(k => placed[k].grow && hs[k] < placed[k].max - 0.01);
        if (!idx.length) break;
        const share = extra / idx.length;
        for (const k of idx) { const add = Math.min(share, placed[k].max - hs[k]); hs[k] += add; extra -= add; }
      }
      let y = y0;
      placed.forEach((b, k) => { b.draw(it, y, hs[k], pageNo); y += hs[k]; });
      if (last && cfg.notes && bottom - y >= 34) {
        const top = y + 8;
        R_(it, M, top, P.w - 2 * M, bottom - top, { sw: 0.6 });
        T_(it, M + 5, top + 11, "Notes:", 8.5, { bold: true, c: "#333" });
      }
      pages.push({ items: it });
    }
    return pages;
  }

  /* ---------- Skill sheets: one column per session ---------- */
  function minColW(cfg) {
    const c = codesFor(cfg);
    if (!c.codes.length) return 30;
    const w = textWidth(c.codes.map(show).join("  "), 7.5);
    const widest = Math.max(...c.codes.map(x => textWidth(show(x), 7.5)));
    return clamp(Math.ceil(Math.max(widest, w / (w > 40 ? 2 : 1))) + 10, 28, 64);
  }
  function skillGeom(P, cfg) {
    const t = cfg.type, W = P.w - 2 * M;
    const labelW = t === "task" ? clamp(W * 0.36, 150, 240) : t === "probe" ? clamp(W * 0.3, 120, 200) : 50;
    const extras = t === "probe" ? [...(cfg.introCol ? [{ h: "Date introduced", w: 52 }] : []), { h: "Date mastered", w: 52 }] : [];
    const extraW = extras.reduce((a, e) => a + e.w, 0);
    const maxCols = Math.max(1, Math.floor((W - labelW - extraW) / minColW(cfg)));
    const want = clamp(Math.round(+cfg.sessions || 10), 1, 31);
    return { W, labelW, extras, extraW, maxCols, want, nCols: Math.min(want, maxCols) };
  }
  function skillBands(P, cfg, info, sessions) {
    const t = cfg.type, c = info.codes;
    const { W, labelW, extras, extraW, maxCols, want, nCols } = skillGeom(P, cfg);
    let labels, labelHead;
    if (t === "task") { const st = lines(cfg.steps); labels = (st.length ? st : Array(8).fill("")).map((s, i) => `${i + 1}. ${s}`); labelHead = "Step"; }
    else if (t === "probe") { const tg = lines(cfg.targets); labels = [...tg, ...Array(clamp(+cfg.blankRows || 0, 0, 60)).fill("")]; if (!labels.length) labels = Array(10).fill(""); labelHead = "Target"; }
    else { labels = Array.from({ length: clamp(+cfg.trials || 10, 1, 40) }, (_, i) => String(i + 1)); labelHead = "Trial"; }
    info.cols = nCols; info.maxCols = maxCols; info.rowsN = labels.length;
    if (want > maxCols) info.warnings.push(`Only ${maxCols} session columns fit at this paper size and orientation. Try landscape or fewer sessions.`);
    const colW = (W - labelW - extraW) / nCols;
    const xCol = j => M + labelW + j * colW;
    const xExtra = M + labelW + nCols * colW;
    const hintTok = c.codes.map(show), hint = hintTok.join("  ");
    const hintLines = cfg.printCodes ? wrapTokens(hintTok, colW - 4, 7.5).length : 0;
    const lblLines = labels.map(l => t === "trial" || t === "prompt" ? 1 : Math.max(1, wrap(l, labelW - 8, 8.5).length));
    const head = {
      isHead: true, min: 26, max: 26, grow: false,
      draw(it, y, h) {
        R_(it, M, y, labelW, h, { fill: SOFT }); ctext(it, M, y, labelW, h, labelHead, { size: 8.5, bold: true, align: t === "trial" || t === "prompt" ? "center" : "left" });
        for (let j = 0; j < nCols; j++) {
          R_(it, xCol(j), y, colW, h, { fill: SOFT });
          T_(it, xCol(j) + 2.5, y + 7.5, "Date", 5.5, { c: HINT });
          const s = sessions[j];
          if (s && s.date) ctext(it, xCol(j), y + 5, colW, h - 5, fmtDate(s.date, cfg.dateFmt, colW > 44 ? "full" : "short"), { size: 8, align: "center", bold: true });
        }
        let x = xExtra; for (const e of extras) { R_(it, x, y, e.w, h, { fill: SOFT }); ctext(it, x, y, e.w, h, e.h, { size: 7, bold: true, align: "center", wrap: true, pad: 2 }); x += e.w; }
      },
    };
    const bands = [head];
    const minH = Math.max(t === "trial" || t === "prompt" ? 17 : 18, hintLines * 8.6 + 6);
    labels.forEach((lab, r) => {
      const need = Math.max(minH, lblLines[r] * 10.2 + 6);
      bands.push({
        head, min: need, max: Math.max(need, t === "probe" || t === "task" ? 30 : 34), grow: true,
        draw(it, y, h) {
          R_(it, M, y, labelW, h);
          if (t === "trial" || t === "prompt") ctext(it, M, y, labelW, h, lab, { size: 9, bold: true, align: "center" });
          else ctext(it, M, y, labelW, h, lab, { size: 8.5, wrap: true, pad: 4 });
          for (let j = 0; j < nCols; j++) {
            R_(it, xCol(j), y, colW, h);
            const s = sessions[j], v = s && s.cells ? s.cells[r] : null;
            if (v !== null && v !== undefined && v !== "") ctext(it, xCol(j), y, colW, h, show(v), { size: 11, bold: true, align: "center" });
            else if (cfg.printCodes && hint && !(s && s.date)) hintText(it, xCol(j), y, colW, h, hintTok, 7.5);
          }
          let x = xExtra; for (const e of extras) { R_(it, x, y, e.w, h); x += e.w; }
        },
      });
    });
    const sums = [[c.count, s => { const cl = (s.cells || []).filter(v => v !== null && v !== undefined && v !== ""); return cl.length ? String(cl.filter(v => c.good.includes(v)).length) + " / " + cl.length : ""; }],
      [c.pct, s => { const v = sessionValues(cfg, s)[0]; return isNum(v) ? fmtNum(v, 0) + "%" : ""; }],
      [labelW < 80 ? "Staff" : "Staff initials", s => s.staff || ""]];
    for (const [label, fn] of sums) {
      bands.push({
        head, min: 18, max: 22, grow: true,
        draw(it, y, h) {
          R_(it, M, y, labelW, h, { fill: SOFT }); ctext(it, M, y, labelW, h, label, { size: labelW < 80 ? 7 : 7.5, bold: true, align: t === "trial" || t === "prompt" ? "center" : "left", pad: 2, wrap: true });
          for (let j = 0; j < nCols; j++) { R_(it, xCol(j), y, colW, h, { fill: SOFT }); const s = sessions[j]; if (s && s.date) ctext(it, xCol(j), y, colW, h, fn(s), { size: 8.5, bold: true, align: "center" }); }
          let x = xExtra; for (const e of extras) { R_(it, x, y, e.w, h, { fill: SOFT }); x += e.w; }
        },
      });
    }
    return bands;
  }

  /* ---------- Behavior tables: one row per session ---------- */
  function tally(it, x, y, w, h, n) {
    const gw = 17, groups = Math.ceil(n / 5);
    if (groups * gw > w - 6 || n > 60) { ctext(it, x, y, w, h, String(n), { size: 10, bold: true, align: "center" }); return; }
    let gx = x + 5; const top = y + h * 0.25, bot = y + h * 0.75;
    for (let g = 0; g < groups; g++) {
      const k = Math.min(5, n - g * 5);
      for (let s = 0; s < Math.min(k, 4); s++) L_(it, gx + s * 3.2, top, gx + s * 3.2, bot, 0.9, INK);
      if (k === 5) L_(it, gx - 2, bot - 1, gx + 11.6, top + 1, 0.9, INK);
      gx += gw;
    }
  }
  function tableBands(P, cfg, cols, rowMin, rowMax, rowCount, drawRow, headLines = 1) {
    const W = P.w - 2 * M;
    const fixed = cols.reduce((a, c) => a + (c.w || 0), 0), flex = cols.filter(c => !c.w).length;
    const fw = flex ? Math.max(30, (W - fixed) / flex) : 0;
    let x = M; const X = cols.map(c => { const r = { ...c, x, w: c.w || fw }; x += r.w; return r; });
    const groupH = cols.some(c => c.group) ? 14 : 0;
    const headH = groupH + (headLines > 1 ? 28 : 22);
    const head = {
      isHead: true, min: headH, max: headH, grow: false,
      draw(it, y) {
        if (groupH) { // group labels spanning columns
          let k = 0;
          while (k < X.length) {
            const g = X[k].group; let j = k; while (j + 1 < X.length && X[j + 1].group === g) j++;
            const gx = X[k].x, gw = X[j].x + X[j].w - gx;
            if (g) { R_(it, gx, y, gw, groupH, { fill: "#e2e2e2" }); ctext(it, gx, y, gw, groupH, g, { size: 7.5, bold: true, align: "center" }); }
            k = j + 1;
          }
        }
        for (const c of X) {
          const top = c.group || !groupH ? y + groupH : y;
          const hh = c.group || !groupH ? headH - groupH : headH;
          R_(it, c.x, top, c.w, hh, { fill: SOFT });
          ctext(it, c.x, top, c.w, c.sub ? hh - 8 : hh, c.h, { size: 7.5, bold: true, align: "center", wrap: true, pad: 2 });
          if (c.sub) ctext(it, c.x, top + hh - 11, c.w, 10, c.sub, { size: 5.8, align: "center", c: HINT, pad: 1 });
        }
      },
    };
    const bands = [head];
    for (let r = 0; r < rowCount; r++) bands.push({ head, min: rowMin, max: rowMax, grow: true, draw(it, y, h) { for (const c of X) R_(it, c.x, y, c.w, h); drawRow(it, y, h, r, X); } });
    return bands;
  }
  function autoRows(P, cfg, info, opts, headH, pref) {
    const it = [];
    const y0 = pageHeader(it, P, cfg, info, opts, 1);
    const avail = P.h - M - FOOT - y0 - headH - (cfg.notes ? 50 : 0);
    return Math.max(3, Math.floor(avail / pref));
  }
  function frequencyBands(P, cfg, info, opts, sessions) {
    const beh = behaviorsOf(cfg), multi = beh.length > 1, rate = cfg.rate !== "none";
    const cols = [{ h: "Date", w: 58 }, { h: "Start time", w: 44 }, { h: "End time", w: 44 }];
    beh.forEach((b, i) => { const g = multi ? `${String.fromCharCode(65 + i)}: ${b || "Behavior " + (i + 1)}` : null; cols.push({ h: "Tally", sub: "one mark per occurrence", group: g }, { h: "Total", w: 38, group: g }); });
    if (rate) cols.push({ h: "Minutes observed", w: 50 }, { h: cfg.rate === "min" ? "Rate per minute" : "Rate per hour", w: 48 });
    cols.push({ h: "Initials", w: 40 });
    const headH = (multi ? 14 : 0) + 28;
    const n = Math.max(+cfg.rows > 0 ? clamp(+cfg.rows, 1, 200) : autoRows(P, cfg, info, opts, headH, 28), sessions.length);
    info.rows = n;
    return tableBands(P, cfg, cols, 24, 34, n, (it, y, h, r, X) => {
      const s = sessions[r]; if (!s) return;
      const vals = sessionValues(cfg, s);
      let k = 0;
      ctext(it, X[k].x, y, X[k].w, h, fmtDate(s.date, cfg.dateFmt), { size: 8.5, align: "center" }); k++;
      ctext(it, X[k].x, y, X[k].w, h, s.start || "", { size: 8.5, align: "center" }); k++;
      ctext(it, X[k].x, y, X[k].w, h, s.end || "", { size: 8.5, align: "center" }); k++;
      beh.forEach((_, i) => { const cnt = +((s.counts || [])[i] || 0); tally(it, X[k].x, y, X[k].w, h, cnt); k++; ctext(it, X[k].x, y, X[k].w, h, String(cnt), { size: 10, bold: true, align: "center" }); k++; });
      if (rate) { ctext(it, X[k].x, y, X[k].w, h, s.minutes ? fmtNum(+s.minutes, 1) : "", { size: 9, align: "center" }); k++; ctext(it, X[k].x, y, X[k].w, h, vals.map(v => isNum(v) ? fmtNum(v, 2) : "–").join(" / "), { size: 9, bold: true, align: "center" }); k++; }
      ctext(it, X[k].x, y, X[k].w, h, s.staff || "", { size: 9, align: "center" });
    }, 2);
  }
  function durationBands(P, cfg, info, opts, sessions) {
    const E = clamp(Math.round(+cfg.episodes || 5), 1, 10), pct = cfg.graphAs === "percent";
    const cols = [{ h: "Date", w: 58 }, { h: "Observation start", w: 52 }];
    for (let e = 0; e < E; e++) cols.push({ h: `Episode ${e + 1}`, sub: "start–stop or m:ss" });
    cols.push({ h: "# of episodes", w: 44 }, { h: "Total duration", w: 52 }, { h: "Minutes observed", w: 50 });
    if (pct) cols.push({ h: "% of time", w: 42 });
    cols.push({ h: "Initials", w: 40 });
    const n = Math.max(+cfg.rows > 0 ? clamp(+cfg.rows, 1, 200) : autoRows(P, cfg, info, opts, 28, 30), sessions.length);
    info.rows = n;
    return tableBands(P, cfg, cols, 26, 38, n, (it, y, h, r, X) => {
      const s = sessions[r]; if (!s) return;
      const ep = (s.episodes || []).filter(isNum), tot = ep.reduce((a, b) => a + b, 0);
      let k = 0;
      ctext(it, X[k].x, y, X[k].w, h, fmtDate(s.date, cfg.dateFmt), { size: 8.5, align: "center" }); k++;
      ctext(it, X[k].x, y, X[k].w, h, s.start || "", { size: 8.5, align: "center" }); k++;
      for (let e = 0; e < E; e++) { const v = ep[e]; if (isNum(v)) ctext(it, X[k].x, y, X[k].w, h, fmtClock(v), { size: 9.5, align: "center" }); k++; }
      if (ep.length > E) T_(it, X[k - 1].x + X[k - 1].w - 2, y + h - 3, `+${ep.length - E} more`, 5.5, { anchor: "end", c: HINT });
      ctext(it, X[k].x, y, X[k].w, h, String(ep.length), { size: 9.5, bold: true, align: "center" }); k++;
      ctext(it, X[k].x, y, X[k].w, h, fmtClock(tot), { size: 9.5, bold: true, align: "center" }); k++;
      ctext(it, X[k].x, y, X[k].w, h, s.obsMin ? fmtNum(+s.obsMin, 1) : "", { size: 9, align: "center" }); k++;
      if (pct) { const v = sessionValues(cfg, s)[0]; ctext(it, X[k].x, y, X[k].w, h, isNum(v) ? fmtNum(v, 0) + "%" : "", { size: 9, bold: true, align: "center" }); k++; }
      ctext(it, X[k].x, y, X[k].w, h, s.staff || "", { size: 9, align: "center" });
    }, 2);
  }
  function latencyBands(P, cfg, info, opts, sessions) {
    const cols = [{ h: "Date", w: 58 }, { h: "Trial", w: 34 }, { h: "Instruction / opportunity" }, { h: "Time of instruction", w: 58 }, { h: "Time response began", w: 58 }, { h: "Latency (seconds)", w: 54 }, { h: "Initials", w: 40 }];
    const flat = [];
    sessions.forEach(s => (s.lat || []).forEach((v, i) => flat.push({ s, i, v })));
    const n = Math.max(+cfg.rows > 0 ? clamp(+cfg.rows, 1, 300) : autoRows(P, cfg, info, opts, 28, 22), flat.length);
    info.rows = n;
    return tableBands(P, cfg, cols, 20, 28, n, (it, y, h, r, X) => {
      const f = flat[r]; if (!f) return;
      if (f.i === 0) ctext(it, X[0].x, y, X[0].w, h, fmtDate(f.s.date, cfg.dateFmt), { size: 8.5, align: "center" });
      ctext(it, X[1].x, y, X[1].w, h, String(f.i + 1), { size: 9, align: "center" });
      ctext(it, X[5].x, y, X[5].w, h, isNum(f.v) ? fmtNum(f.v, 1) : "No response", { size: isNum(f.v) ? 9.5 : 7.5, bold: isNum(f.v), align: "center" });
      if (f.i === 0) ctext(it, X[6].x, y, X[6].w, h, f.s.staff || "", { size: 9, align: "center" });
    }, 2);
  }

  /* ---------- Interval recording (partial, whole, momentary time sampling) ---------- */
  const RULES = {
    partial: "Partial interval: mark an interval if the behavior happens at any time during it, even briefly. Partial interval tends to overestimate how much of the time the behavior occurs.",
    whole: "Whole interval: mark an interval only if the behavior lasts for the entire interval. Whole interval tends to underestimate how much of the time the behavior occurs.",
    mts: "Momentary time sampling: look at the student at the end of each interval (the time shown in the box) and mark it only if the behavior is happening at that moment.",
  };
  function intervalLayout(P, cfg) {
    const { sec, n } = intervalInfo(cfg), nb = behaviorsOf(cfg).length;
    const W = P.w - 2 * M, labW = 66, totW = nb === 1 ? 40 : 0;
    let C;
    if (sec < 60 && 60 % sec === 0) { const per = 60 / sec; C = per <= 12 ? per : per % 2 === 0 && per / 2 <= 12 ? per / 2 : 12; }
    else C = 10;
    C = Math.min(C, n, Math.max(2, Math.floor((W - labW - totW) / 26)));
    const rows = Math.ceil(n / C);
    return { sec, n, nb, C, rows, labW, totW, colW: (W - labW - totW) / C };
  }
  function intervalBands(P, cfg, info, opts, sessions) {
    const L = intervalLayout(P, cfg), beh = behaviorsOf(cfg), W = P.w - 2 * M;
    info.intervals = L.n; info.perRow = L.C;
    const rowMin = L.nb > 1 ? 24 : 21, rowMax = L.nb > 1 ? 32 : 28;
    const blockMin = 22 + L.rows * rowMin + 12 * L.nb + 8 + 12;
    const it0 = []; const y0 = pageHeader(it0, P, cfg, info, opts, 1);
    const availFirst = P.h - M - FOOT - y0;
    const want = clamp(Math.round(+cfg.perPage || 1), 1, 4);
    const fitN = Math.max(1, Math.floor((availFirst - (cfg.notes ? 40 : 0)) / blockMin));
    const blocks = Math.max(Math.min(want, fitN), sessions.length);
    if (want > fitN && !sessions.length) info.warnings.push(`Only ${fitN} observation${fitN > 1 ? "s" : ""} fit on a page at this interval length.`);
    info.blocks = blocks;
    const bands = [];
    for (let b = 0; b < blocks; b++) {
      const s = sessions[b];
      const head = {
        isHead: true, min: 22, max: 22, grow: false,
        draw(it, y) {
          T_(it, M, y + 9, blocks > 1 ? `Observation ${b + 1}` : "Observation", 8.5, { bold: true, c: "#333" });
          fieldRow(it, M + 76, y - 3, W - 76, [["Date", s ? fmtDate(s.date, cfg.dateFmt) : "", 1], ["Start time", s ? s.start || "" : "", 1], ["Observer", s ? s.staff || "" : "", 1], ["Activity", "", 1.3]]);
        },
      };
      bands.push(head);
      for (let r = 0; r < L.rows; r++) {
        bands.push({
          head, min: rowMin, max: rowMax, grow: true,
          draw(it, y, h) {
            const i0 = r * L.C, i1 = Math.min(L.n, i0 + L.C);
            R_(it, M, y, L.labW, h, { fill: SOFT });
            ctext(it, M, y, L.labW, h, `${fmtClock(i0 * L.sec)}–${fmtClock(i1 * L.sec)}`, { size: 7.5, bold: true, align: "center", pad: 1 });
            let rowCount = 0;
            for (let i = i0; i < i1; i++) {
              const x = M + L.labW + (i - i0) * L.colW;
              R_(it, x, y, L.colW, h);
              T_(it, x + 2, y + 6.5, fmtClock((i + 1) * L.sec), 5.2, { c: HINT });
              if (s) {
                const marked = beh.map((_, k) => !!((s.marks || [])[k] || [])[i]);
                if (marked.some(Boolean)) rowCount++;
                if (L.nb === 1) { if (marked[0]) ctext(it, x, y + 3, L.colW, h - 3, "X", { size: 11, bold: true, align: "center" }); }
                else ctext(it, x, y + 4, L.colW, h - 4, beh.map((_, k) => marked[k] ? String.fromCharCode(65 + k) : "·").join(" "), { size: 8, bold: true, align: "center", pad: 1 });
                if (i >= (+s.n || L.n)) L_(it, x + 2, y + h - 2, x + L.colW - 2, y + 2, 0.5, "#999");
              } else if (L.nb > 1) ctext(it, x, y + 4, L.colW, h - 4, beh.map((_, k) => String.fromCharCode(65 + k)).join(" "), { size: 8, align: "center", c: "#555555", pad: 1 });
            }
            for (let i = i1; i < i0 + L.C; i++) { const x = M + L.labW + (i - i0) * L.colW; R_(it, x, y, L.colW, h, { fill: "#f7f7f7", stroke: "#bdbdbd" }); }
            if (L.totW) {
              const x = M + L.labW + L.C * L.colW;
              R_(it, x, y, L.totW, h, { fill: SOFT });
              if (s) ctext(it, x, y, L.totW, h, String(((s.marks || [])[0] || []).slice(i0, i1).filter(Boolean).length), { size: 9, bold: true, align: "center" });
            }
          },
        });
      }
      bands.push({
        head, min: 12 * L.nb + 8, max: 12 * L.nb + 8, grow: false,
        draw(it, y) {
          beh.forEach((nm, k) => {
            const label = (L.nb > 1 ? String.fromCharCode(65 + k) + " " : "") + (nm || "Behavior");
            const yy = y + 12 + k * 12;
            T_(it, M, yy, fit(label, 200, 8.5, true) + ":", 8.5, { bold: true });
            const x = M + Math.min(210, textWidth(fit(label, 200, 8.5, true) + ":", 8.5, true) + 8);
            if (s) {
              const n = +s.n || L.n, c = ((s.marks || [])[k] || []).slice(0, n).filter(Boolean).length;
              T_(it, x, yy, `${c} of ${n} intervals = ${fmtNum(c / n * 100, 1)}%`, 9, { bold: true });
            } else T_(it, x, yy, `______ of ${L.n} intervals  =  ______ %`, 9);
          });
        },
      });
      if (b < blocks - 1) bands.push({ min: 12, max: 22, grow: true, draw(it, y, h) { L_(it, M, y + h / 2, M + W, y + h / 2, 0.4, "#c8c8c8", [3, 3]); } });
    }
    return bands;
  }

  /* ---------- ABC ---------- */
  function abcBands(P, cfg, info, opts) {
    const check = cfg.layout === "checklist";
    const ant = lines(cfg.antecedents).slice(0, 12), con = lines(cfg.consequences).slice(0, 12), beh = lines(cfg.behaviors).slice(0, 8);
    const FUNCS = ["Escape / avoid", "Attention", "Tangible / item", "Automatic / sensory"];
    const cols = [{ h: "Date & time", w: 62 }, { h: "Setting / activity", w: 84 }, { h: "Antecedent", sub: "what happened right before" }, { h: "Behavior", sub: "what the student did" }, { h: "Consequence", sub: "what happened right after" }];
    if (cfg.functionCol) cols.push({ h: "Possible function", w: 84 });
    cols.push({ h: "Initials", w: 38 });
    const listH = n => n ? 9 + n * 10.2 + 12 : 0;
    const minRow = check ? Math.max(60, listH(Math.max(ant.length, con.length, beh.length + 2)), cfg.functionCol ? listH(FUNCS.length + 1) : 0) : 62;
    const n = +cfg.rows > 0 ? clamp(+cfg.rows, 1, 60) : autoRows(P, cfg, info, opts, 28, Math.max(minRow, check ? 0 : 76));
    info.rows = n;
    const list = (it, x, y, w, items, other = true) => {
      let yy = y + 6;
      for (const s of items) { box(it, x + 4, yy, 6); T_(it, x + 13, yy + 5.6, fit(s, w - 17, 7.2), 7.2); yy += 10.2; }
      if (other) { box(it, x + 4, yy, 6); T_(it, x + 13, yy + 5.6, "Other:", 7.2); L_(it, x + 38, yy + 6.5, x + w - 5, yy + 6.5, 0.4, "#999"); }
    };
    return tableBands(P, cfg, cols, minRow, Math.max(minRow, check ? minRow + 24 : 110), n, (it, y, h, r, X) => {
      if (!check) return;
      list(it, X[2].x, y, X[2].w, ant);
      if (beh.length) {
        list(it, X[3].x, y, X[3].w, beh, false);
        const yy = y + 6 + beh.length * 10.2 + 4;
        T_(it, X[3].x + 4, yy + 6, "Duration:", 7); L_(it, X[3].x + 38, yy + 7, X[3].x + X[3].w - 5, yy + 7, 0.4, "#999");
        T_(it, X[3].x + 4, yy + 18, "Intensity:  low   med   high", 7);
      }
      list(it, X[4].x, y, X[4].w, con);
      if (cfg.functionCol) list(it, X[5].x, y, X[5].w, FUNCS, false);
    }, 2);
  }

  /* ---------- Entry point ---------- */
  function sheetPages(cfg0, opts = {}) {
    const cfg = { ...defaultSheet(cfg0.type), ...cfg0 };
    const T = TYPES[cfg.type];
    const P = pageSize(cfg);
    const info = { warnings: [], key: "", P };
    const sessions = Array.isArray(opts.sessions) ? opts.sessions : [];
    if (T.group === "skill") info.key = codesFor(cfg).key + (cfg.type === "task" ? ` Chaining: ${cfg.chaining === "forward" ? "forward" : cfg.chaining === "backward" ? "backward" : "total task"}.` : "");
    else if (T.group === "interval") { const L = intervalLayout(P, cfg); info.key = `${RULES[cfg.type]} Interval: ${L.sec >= 60 && L.sec % 60 === 0 ? L.sec / 60 + " min" : L.sec + " s"} · Observation: ${fmtNum(intervalInfo(cfg).min, 2)} min · ${L.n} intervals per observation.`; if (intervalInfo(cfg).capped) info.warnings.push("Observations are limited to 720 intervals."); }
    else if (cfg.type === "frequency") info.key = "Make one tally mark each time the behavior starts. Rate = total ÷ minutes observed" + (cfg.rate === "hour" ? " × 60 (per hour)." : cfg.rate === "min" ? " (per minute)." : ".");
    else if (cfg.type === "duration") info.key = "Write the start and stop time of each episode (or its length in minutes:seconds). Total duration = sum of all episodes." + (cfg.graphAs === "percent" ? " % of time = total duration ÷ time observed × 100." : "");
    else if (cfg.type === "latency") info.key = "Latency = seconds from the end of the instruction (or opportunity) to the start of the response. Start timing when the instruction ends; stop when the response begins.";
    else if (cfg.type === "abc") info.key = "Write what happened right before (A), what the student did (B) and what happened right after (C), as soon as possible after each incident. Describe what you saw, not why.";
    const header = (it, pageNo) => pageHeader(it, P, cfg, info, opts, pageNo);
    let pages;
    if (T.group === "skill") {
      info.codes = codesFor(cfg);
      // Recorded sessions fill the columns; more sessions than columns continue on extra copies.
      const per = skillGeom(P, cfg).nCols;
      pages = [];
      for (let k = 0; k < Math.max(1, Math.ceil(sessions.length / per)); k++) pages.push(...paginate(P, skillBands(P, cfg, info, sessions.slice(k * per, k * per + per)), header, cfg));
      info.warnings = [...new Set(info.warnings)];
    } else if (cfg.type === "frequency") pages = paginate(P, frequencyBands(P, cfg, info, opts, sessions), header, cfg);
    else if (cfg.type === "duration") pages = paginate(P, durationBands(P, cfg, info, opts, sessions), header, cfg);
    else if (cfg.type === "latency") pages = paginate(P, latencyBands(P, cfg, info, opts, sessions), header, cfg);
    else if (T.group === "interval") pages = paginate(P, intervalBands(P, cfg, info, opts, sessions), header, cfg);
    else pages = paginate(P, abcBands(P, cfg, info, opts), header, cfg);
    pages.forEach((p, k) => footer(p.items, P, k + 1, pages.length));
    return { w: P.w, h: P.h, orient: P.o, pages, info, cfg };
  }

  return { TYPES, ORDER, PROMPTS, defaultSheet, parsePrompts, codesFor, sessionValues, graphSetup, sheetPages, intervalInfo, intervalLayout, behaviorsOf, lines, show, pageSize };
});
