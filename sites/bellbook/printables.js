// BellBook printables: month calendars, year-at-a-glance and the dated lesson planner, drawn with jsPDF.
// The jsPDF constructor is passed in, so the same code runs in the browser (vendored UMD) and in Node tests.
import {
  MONTHS, MON3, WDAYS, WD3, CREDIT_URL, PALETTE, FIXED_COLOR, iso, dn, parts, wday, fromYMD, monthsIn, monthGrid, dayAt,
  longLabel, colorFor, eventList, fmtMD, fmtMDY, fmtRange, plannerWeeks, plannerKeys, classesFor, calName, mondayOf,
} from "./engine.js";

const SIZES = { letter: [612, 792], a4: [595.28, 841.89] };
const INK = "#1c1917", MUTED = "#6b6560", LINE = "#d6d3d1", SOFT = "#f5f3ef", RULE = "#e7e5e4";
const CP1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const MAP = { "→": "->", "←": "<-", "≥": ">=", "≤": "<=", "✓": "v", "×": "x", "−": "-", " ": " " };
// Standard PDF fonts only cover Windows-1252: keep those characters, map a few common ones, drop the rest.
export function pdfSafe(s) {
  let out = "";
  for (const ch of String(s ?? "")) {
    const c = ch.codePointAt(0);
    if ((c >= 32 && c < 127) || (c >= 160 && c <= 255) || CP1252.includes(ch)) out += ch;
    else if (MAP[ch]) out += MAP[ch];
    else if (c > 0xffff || (c >= 0x2600 && c <= 0x27bf) || c === 0xfe0f || c === 0x200d) continue; // emoji
    else if (c >= 32) out += "?";
  }
  return out.replace(/\s+/g, " ").trim();
}

function makeDoc(jsPDF, size, orientation) {
  return new jsPDF({ unit: "pt", format: size === "a4" ? "a4" : "letter", orientation, compress: true });
}
const pageBox = (size, orientation) => { const [w, h] = SIZES[size] || SIZES.letter; return orientation === "landscape" ? { W: h, H: w } : { W: w, H: h }; };

// Draws text shrunk (down to min) and then truncated so it fits maxW. Returns the font size used.
function fitText(doc, text, x, y, maxW, size, opts = {}) {
  const min = opts.min || 6;
  text = pdfSafe(text);
  let s = size;
  doc.setFontSize(s);
  while (s > min && doc.getTextWidth(text) > maxW) { s -= 0.5; doc.setFontSize(s); }
  if (doc.getTextWidth(text) > maxW) {
    while (text.length > 1 && doc.getTextWidth(text + "…") > maxW) text = text.slice(0, -1);
    text = text.trimEnd() + "…";
  }
  doc.text(text, x, y, { align: opts.align || "left", baseline: opts.baseline || "alphabetic" });
  return s;
}
function wrap(doc, text, x, y, maxW, size, maxLines, lh = size * 1.18, align = "left") {
  doc.setFontSize(size);
  let lines = doc.splitTextToSize(pdfSafe(text), maxW);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && doc.getTextWidth(last + "…") > maxW) last = last.slice(0, -1);
    lines[maxLines - 1] = last.trimEnd() + "…";
  }
  lines.forEach((l, i) => doc.text(l, x, y + i * lh, { align }));
  return lines.length;
}
// "Made with BellBook · bellbook-app.vercel.app", with BellBook linked (the referral credit).
function credit(doc, x, y, align = "right", size = 7.5) {
  doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(MUTED);
  const a = "Made with ", b = "BellBook", c = " · bellbook-app.vercel.app";
  doc.setFont("helvetica", "normal"); const wa = doc.getTextWidth(a), wc = doc.getTextWidth(c);
  doc.setFont("helvetica", "bold"); const wb = doc.getTextWidth(b);
  const total = wa + wb + wc;
  let x0 = align === "right" ? x - total : align === "center" ? x - total / 2 : x;
  doc.setFont("helvetica", "normal"); doc.text(a, x0, y);
  doc.setFont("helvetica", "bold"); doc.text(b, x0 + wa, y);
  doc.link(x0 + wa - 1, y - size, wb + 2, size + 3, { url: CREDIT_URL });
  doc.setFont("helvetica", "normal"); doc.text(c, x0 + wa + wb, y);
}
function chipWidth(doc, text, size, maxW) {
  doc.setFont("helvetica", "bold");
  text = pdfSafe(text);
  let s = size; doc.setFontSize(s);
  while (s > 6 && doc.getTextWidth(text) + s * 0.9 > maxW) { s -= 0.5; doc.setFontSize(s); }
  return Math.min(doc.getTextWidth(text), maxW - s * 0.9) + s * 0.9;
}
function chip(doc, text, cx, cy, size, fill, ink, maxW, color) {
  doc.setFont("helvetica", "bold");
  text = pdfSafe(text);
  let s = size; doc.setFontSize(s);
  while (s > 6 && doc.getTextWidth(text) + s * 0.9 > maxW) { s -= 0.5; doc.setFontSize(s); }
  const tw = Math.min(doc.getTextWidth(text), maxW - s * 0.9), w = tw + s * 0.9, h = s * 1.45;
  if (color) { doc.setFillColor(fill); doc.roundedRect(cx - w / 2, cy - h / 2, w, h, h / 2.6, h / 2.6, "F"); }
  else { doc.setDrawColor(INK); doc.setLineWidth(0.8); doc.roundedRect(cx - w / 2, cy - h / 2, w, h, h / 2.6, h / 2.6, "S"); }
  doc.setTextColor(color ? ink : INK);
  fitText(doc, text, cx, cy + s * 0.35, maxW - s * 0.9, s, { align: "center", min: 5 });
  return w;
}
// Year-view cells are tiny: long labels become initials ("All classes" -> "AC") or their first 3 letters.
export const abbr = l => (l.length <= 5 ? l : /\s/.test(l.trim()) ? l.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 3).toUpperCase() : l.slice(0, 3));
const withAbbr = (text, raw) => (abbr(raw) !== raw ? `${text} (${abbr(raw)})` : text);
const brand = color => (color ? "#92400e" : INK);
const header = (doc, box, big, right1, right2, color) => {
  doc.setTextColor(brand(color)); doc.setFont("helvetica", "bold");
  fitText(doc, big, box.x, box.y + 22, box.w * 0.55, 24);
  doc.setTextColor(INK); doc.setFont("helvetica", "bold");
  if (right1) fitText(doc, right1, box.x + box.w, box.y + 10, box.w * 0.42, 11, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED);
  if (right2) fitText(doc, right2, box.x + box.w, box.y + 24, box.w * 0.42, 9, { align: "right" });
};

// ---------- one month as a full page ----------
// Returns the day cells [{d, x, y, w, h}] so the planner can link each day to its week page.
function drawMonth(doc, res, y0, m0, box, o) {
  const cfg = res.cfg, color = o.color !== false;
  header(doc, box, `${MONTHS[m0]} ${y0}`, calName(cfg), cfg.school && !calName(cfg).includes(cfg.school) ? cfg.school : "", color);
  const ws = o.weekStart || 0;
  let cols = [0, 1, 2, 3, 4, 5, 6].map(i => (i + ws) % 7);
  if (o.hideWeekends) cols = cols.filter(w => cfg.wk[w] !== "off");
  const weight = w => (cfg.wk[w] === "off" ? 0.55 : 1);
  const tw = cols.reduce((s, w) => s + weight(w), 0);
  const top = box.y + 36, footH = 26, hdrH = 17;
  const gridH = box.h - (top - box.y) - hdrH - footH;
  let weeks = monthGrid(y0, m0, ws).map(r => r.filter((_, i) => cols.includes((i + ws) % 7)));
  weeks = weeks.filter(r => r.some(d => d != null));
  const rowH = gridH / weeks.length;
  const xs = []; let acc = box.x;
  for (const w of cols) { const cw = (box.w * weight(w)) / tw; xs.push([acc, cw]); acc += cw; }
  // weekday header
  doc.setFillColor(brand(color)); doc.rect(box.x, top, box.w, hdrH, "F");
  doc.setTextColor("#ffffff"); doc.setFont("helvetica", "bold");
  cols.forEach((w, i) => { const [x, cw] = xs[i]; fitText(doc, cw > 70 ? WDAYS[w] : WD3[w], x + cw / 2, top + 12, cw - 4, 9, { align: "center" }); });
  const cells = [];
  const counts = new Map();
  let school = 0;
  weeks.forEach((row, ri) => {
    const y = top + hdrH + ri * rowH;
    row.forEach((d, ci) => {
      const [x, cw] = xs[ci];
      doc.setDrawColor(LINE); doc.setLineWidth(0.6);
      if (d == null) { doc.setFillColor("#fafaf9"); doc.rect(x, y, cw, rowH, "FD"); return; }
      cells.push({ d, x, y, w: cw, h: rowH });
      const day = dayAt(res, d);
      const offish = day && (day.kind === "off" || day.kind === "closed");
      const weekend = !day ? cfg.wk[wday(d)] === "off" : day.kind === "weekend";
      doc.setFillColor(offish ? "#efedea" : weekend ? "#f7f6f3" : "#ffffff");
      doc.rect(x, y, cw, rowH, "FD");
      // date number
      doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
      doc.setTextColor(!day || weekend ? "#a8a29e" : INK);
      doc.text(String(parts(d).d), x + 5, y + 12);
      if (!day) return;
      const lines = [];
      if (d === res.first) lines.push("First day of school");
      if (d === res.last) lines.push("Last day of school");
      if (day.school) {
        school++;
        const lab = longLabel(cfg, day);
        if (lab) {
          const [fill, ink] = colorFor(day);
          counts.set(lab, (counts.get(lab) || 0) + 1);
          chip(doc, lab, x + cw / 2, y + Math.min(rowH * 0.42, 34), Math.min(15, rowH / 4.2), fill, ink, cw - 10, color);
        }
        if (day.kind === "norot") {
          doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
          fitText(doc, day.name, x + cw / 2, y + Math.min(rowH * 0.42, 34) + 3, cw - 8, 10, { align: "center" });
        }
      } else if (offish) {
        lines.unshift(day.kind === "closed" ? `${day.name}${day.mode === "skip" ? ` (${day.skipped ? cfg.fmt.replace("{L}", day.skipped) : "day"} skipped)` : ""}` : day.name);
      }
      lines.push(...day.notes);
      if (lines.length) {
        doc.setFont("helvetica", offish ? "bold" : "normal"); doc.setTextColor(offish ? "#57534e" : INK);
        const size = cw < 80 ? 6.5 : offish ? 8.5 : 7.5, lh = size * 1.18;
        doc.setFontSize(size);
        const all = lines.flatMap(l => doc.splitTextToSize(pdfSafe(l), cw - 8));
        const fitN = Math.max(1, Math.floor((rowH - (day.school ? Math.min(rowH * 0.42, 34) + 12 : 18)) / lh));
        const shown = all.slice(0, fitN);
        if (all.length > fitN) shown[fitN - 1] = shown[fitN - 1].replace(/.{0,2}$/, "…");
        const by = day.school ? y + rowH - 5 - (shown.length - 1) * lh : y + 24;
        shown.forEach((l, i) => doc.text(l, x + 4, by + i * lh));
      }
    });
  });
  // footer: legend with this month's counts + credit
  const fy = box.y + box.h - 8;
  let lx = box.x;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(MUTED);
  const legend = [...counts.entries()];
  if (school) { doc.setFont("helvetica", "bold"); doc.setTextColor(INK); doc.text(`${school} school day${school === 1 ? "" : "s"}`, lx, fy); lx += doc.getTextWidth(`${school} school days`) + 12; }
  for (const [lab, n] of legend) {
    const sample = res.days.find(d => longLabel(cfg, d) === lab);
    const [fill, ink] = colorFor(sample);
    doc.setFont("helvetica", "bold");
    const w = chipWidth(doc, lab, 7.5, 120); // measure
    if (lx + w + 30 > box.x + box.w - 200) break;
    chip(doc, lab, lx + w / 2, fy - 2.5, 7.5, fill, ink, 120, color);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(MUTED);
    doc.text(`× ${n}`, lx + w + 3, fy);
    lx += w + 24;
  }
  if (!o.noCredit) credit(doc, box.x + box.w, fy);
  return cells;
}

// ---------- year at a glance (portrait) ----------
function drawYear(doc, res, months, box, o) {
  const cfg = res.cfg, color = o.color !== false;
  const title = calName(cfg);
  doc.setTextColor(brand(color)); doc.setFont("helvetica", "bold");
  fitText(doc, title, box.x, box.y + 20, box.w, 20);
  doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED);
  const sub = [cfg.school && !title.includes(cfg.school) ? cfg.school : "", res.first != null ? `${fmtMDY(res.first)} – ${fmtMDY(res.last)}` : ""].filter(Boolean).join(" · ");
  fitText(doc, sub, box.x, box.y + 36, box.w, 10);
  // summary chips
  let sx = box.x, sy = box.y + 54;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(INK);
  const total = `${res.schoolDays} school days`;
  doc.text(total, sx, sy + 3); sx += doc.getTextWidth(total) + 14;
  const items = res.counts.map((c, i) => ({ lab: withAbbr(c.long, c.label), n: c.count, col: PALETTE[i % PALETTE.length] })).filter(c => c.n)
    .concat(Object.entries(res.fixedCounts).map(([k, n]) => ({ lab: withAbbr(k, k), n, col: FIXED_COLOR })));
  for (const it of items) {
    const w = chipWidth(doc, it.lab, 8, 110);
    if (sx + w + 30 > box.x + box.w) { sx = box.x; sy += 16; }
    chip(doc, it.lab, sx + w / 2, sy, 8, it.col[0], it.col[1], 110, color);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(MUTED);
    doc.text(String(it.n), sx + w + 3, sy + 3);
    sx += w + 10 + doc.getTextWidth(String(it.n)) + 8;
  }
  // mini months grid
  const evs = eventList(res).filter(e => e.t !== "note" || e.s === e.e);
  const listLines = Math.min(evs.length, 36);
  const listH = listLines ? Math.ceil(listLines / 3) * 10.5 + 24 : 0;
  const gTop = sy + 16, gBottom = box.y + box.h - 18 - listH;
  const cols = 3, rowsN = Math.max(1, Math.ceil(months.length / cols));
  const gap = 14, mw = (box.w - gap * (cols - 1)) / cols, mh = (gBottom - gTop - gap * (rowsN - 1)) / rowsN;
  const ws = o.weekStart || 0;
  months.forEach(({ y, m }, i) => {
    const mx = box.x + (i % cols) * (mw + gap), my = gTop + Math.floor(i / cols) * (mh + gap);
    doc.setFont("helvetica", "bold"); doc.setTextColor(brand(color));
    fitText(doc, `${MONTHS[m]} ${y}`, mx, my + 10, mw, 10);
    const cw = mw / 7, top = my + 15;
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(MUTED);
    for (let c = 0; c < 7; c++) doc.text(WDAYS[(c + ws) % 7][0], mx + c * cw + cw / 2, top + 6, { align: "center" });
    const grid = monthGrid(y, m, ws);
    const ch = Math.min(22, (mh - 24) / 6);
    grid.forEach((row, r) => row.forEach((d, c) => {
      if (d == null) return;
      const x = mx + c * cw, yy = top + 9 + r * ch;
      const day = dayAt(res, d);
      const lab = day && day.school ? longLabel(cfg, day) : "";
      if (day && (day.kind === "off" || day.kind === "closed")) { doc.setFillColor("#e7e5e4"); doc.rect(x + 0.6, yy + 0.6, cw - 1.2, ch - 1.2, "F"); }
      else if (day && day.school && lab && color) { doc.setFillColor(colorFor(day)[0]); doc.rect(x + 0.6, yy + 0.6, cw - 1.2, ch - 1.2, "F"); }
      else if (day && day.school && !color) { doc.setDrawColor(LINE); doc.setLineWidth(0.4); doc.rect(x + 0.6, yy + 0.6, cw - 1.2, ch - 1.2, "S"); }
      const muted = !day || day.kind === "weekend";
      doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); doc.setTextColor(muted ? "#b5b0aa" : day.kind === "off" || day.kind === "closed" ? "#57534e" : INK);
      doc.text(String(parts(d).d), x + 2, yy + 6.2);
      if (day && day.school) {
        const short = day.label != null && day.label !== "" ? abbr(day.label) : day.kind === "norot" ? "–" : "";
        if (short) { doc.setFont("helvetica", "bold"); doc.setTextColor(color ? colorFor(day)[1] : INK); fitText(doc, short, x + cw / 2, yy + ch - 3.2, cw - 3, Math.min(8, ch * 0.42), { align: "center", min: 4 }); }
      }
      if (day && day.kind === "closed") { doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor("#57534e"); doc.text("x", x + cw / 2, yy + ch - 3.5, { align: "center" }); }
    }));
  });
  // events list
  if (listLines) {
    let ly = gBottom + 14;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(INK);
    doc.text("Days off, closures and notes", box.x, ly);
    ly += 12;
    const colW = box.w / 3;
    evs.slice(0, listLines).forEach((e, i) => {
      const per = Math.ceil(listLines / 3);
      const cx = box.x + Math.floor(i / per) * colW, cy = ly + (i % per) * 10.5;
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.2); doc.setTextColor(INK);
      const when = e.s === e.e ? fmtMD(e.s) : parts(e.s).m === parts(e.e).m ? `${fmtMD(e.s)}–${parts(e.e).d}` : `${fmtMD(e.s)}–${fmtMD(e.e)}`;
      doc.text(when, cx, cy);
      const tag = e.t === "closed" ? (e.m === "skip" ? " (closed, day skipped)" : " (closed)") : e.t === "norot" ? " (no rotation)" : "";
      doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED);
      fitText(doc, e.n + tag, cx + 50, cy, colW - 54, 7.2, { min: 5.5 });
    });
    if (evs.length > listLines) { doc.setFontSize(7); doc.setTextColor(MUTED); doc.text(`+ ${evs.length - listLines} more`, box.x + box.w, ly - 12, { align: "right" }); }
  }
  credit(doc, box.x + box.w / 2, box.y + box.h, "center");
}

// ---------- public: rotation calendar PDF ----------
export function calendarPdf(jsPDF, res, opts = {}) {
  const o = { size: "letter", months: true, year: true, color: true, weekStart: 0, hideWeekends: false, ...opts };
  if (res.errors.length) throw new Error(res.errors[0]);
  const months = monthsIn(res);
  let doc = null;
  const add = orient => { if (!doc) doc = makeDoc(jsPDF, o.size, orient); else doc.addPage(o.size === "a4" ? "a4" : "letter", orient); return pageBox(o.size, orient); };
  const M = 36;
  if (o.year) for (let i = 0; i < months.length; i += 12) {
    const { W, H } = add("portrait");
    drawYear(doc, res, months.slice(i, i + 12), { x: M, y: M, w: W - 2 * M, h: H - 2 * M }, o);
  }
  if (o.months) for (const { y, m } of months) {
    const { W, H } = add("landscape");
    drawMonth(doc, res, y, m, { x: M, y: M - 6, w: W - 2 * M, h: H - 2 * M + 12 }, o);
  }
  if (!doc) throw new Error("Choose at least one page type.");
  doc.setProperties({ title: calName(res.cfg), subject: "School rotation calendar", creator: "BellBook (bellbook-app.vercel.app)", author: res.cfg.school || "BellBook" });
  return doc;
}

// ---------- public: dated lesson planner PDF ----------
export function plannerPdf(jsPDF, res, opts = {}) {
  const cfg = res.cfg, pl = cfg.pl;
  const o = { size: "letter", color: true, weekStart: 0, ...opts };
  if (res.errors.length) throw new Error(res.errors[0]);
  if (!pl) throw new Error("Add your periods first.");
  const from = Math.max(res.s, dn(pl.from)), to = Math.min(res.e, dn(pl.to));
  if (from > to) throw new Error("The planner dates are outside the school year.");
  const weeks = pl.weekly ? plannerWeeks(res, iso(from), iso(to)) : [];
  const months = monthsIn(res).filter(({ y, m }) => fromYMD(y, m + 1, 0) >= from && fromYMD(y, m, 1) <= to);
  if (!weeks.length && !(pl.monthly && months.length)) throw new Error("Nothing to print: choose monthly or weekly pages.");
  const color = o.color !== false;
  const { W, H } = pageBox(o.size, "landscape");
  const M = 30, tabW = pl.tabs ? 30 : 0;
  // Page plan: [cover] [schedule] then per month: [month page] + weeks whose Monday falls in that month.
  const plan = [];
  if (pl.cover) plan.push({ t: "cover" });
  plan.push({ t: "schedule" });
  const firstWeekIdx = new Map();
  for (const mo of months) {
    if (pl.monthly) plan.push({ t: "month", ...mo });
    weeks.forEach((wk, wi) => {
      const anchor = Math.max(wk.mon, from), p = parts(anchor);
      if (p.y === mo.y && p.m === mo.m) { if (!firstWeekIdx.has(`${mo.y}-${mo.m}`)) firstWeekIdx.set(`${mo.y}-${mo.m}`, plan.length + 1); plan.push({ t: "week", wk, wi }); }
    });
  }
  const pageOf = new Map(); // "m:y-m" / "w:index" -> page number
  plan.forEach((p, i) => { if (p.t === "month") pageOf.set(`m:${p.y}-${p.m}`, i + 1); if (p.t === "week") pageOf.set(`w:${p.wi}`, i + 1); });
  const monthTarget = (y, m) => pageOf.get(`m:${y}-${m}`) || firstWeekIdx.get(`${y}-${m}`);
  const doc = makeDoc(jsPDF, o.size, "landscape");
  const box = { x: M, y: M - 4, w: W - 2 * M - tabW, h: H - 2 * M + 8 };
  const title = cfg.title || "Lesson Planner";
  const keys = plannerKeys(cfg).filter(k => k !== "" || cfg.labels.length === 0);

  const tabs = (cur) => {
    if (!pl.tabs) return;
    const n = months.length, x = W - tabW - 6, th = Math.min(46, (H - 40) / Math.max(n, 1));
    months.forEach(({ y, m }, i) => {
      const ty = 20 + i * th, on = cur && cur.y === y && cur.m === m;
      doc.setFillColor(on ? brand(color) : i % 2 ? "#f1ede6" : "#e9e3d8");
      doc.rect(x, ty, tabW, th - 2, "F");
      doc.setTextColor(on ? "#ffffff" : INK); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text(MON3[m], x + tabW / 2, ty + th / 2 + 3, { align: "center" });
      const target = monthTarget(y, m);
      if (target) doc.link(x, ty, tabW, th - 2, { pageNumber: target });
    });
  };
  const footer = (pageNo) => {
    credit(doc, box.x + box.w, H - 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(MUTED);
    doc.text(String(pageNo), box.x, H - 14);
    if (pl.cover && pageNo > 1) { doc.textWithLink("Contents", box.x + 18, H - 14, { pageNumber: 1 }); }
  };

  plan.forEach((p, i) => {
    if (i) doc.addPage(o.size === "a4" ? "a4" : "letter", "landscape");
    const pageNo = i + 1;
    if (p.t === "cover") drawCover(doc, res, { W, H, box, from, to, months, monthTarget, color, keys, title });
    else if (p.t === "schedule") drawSchedule(doc, res, { box, color, keys, title });
    else if (p.t === "month") {
      const cells = drawMonth(doc, res, p.y, p.m, { ...box, h: box.h - 14 }, { ...o, color, noCredit: true });
      // every day in the planner range links to its week page
      for (const cell of cells) {
        const wi = weeks.findIndex(w => cell.d >= w.mon && cell.d < w.mon + 7 && w.days.some(x => x && x.n === cell.d));
        const target = wi >= 0 && pageOf.get(`w:${wi}`);
        if (target) doc.link(cell.x, cell.y, cell.w, cell.h, { pageNumber: target });
      }
      tabs(p);
    } else if (p.t === "week") {
      drawWeek(doc, res, p.wk, { box, color, title, from, to, monthTarget, weekNo: p.wi + 1, weekTotal: weeks.length });
      const anchor = parts(Math.max(p.wk.mon, from));
      tabs({ y: anchor.y, m: anchor.m });
    }
    footer(pageNo);
  });
  doc.setProperties({ title: `${title} – lesson planner`, subject: "Dated lesson planner", creator: "BellBook (bellbook-app.vercel.app)", author: pl.teacher || "BellBook" });
  return doc;
}

function drawCover(doc, res, c) {
  const cfg = res.cfg, pl = cfg.pl, { W, H, color } = c;
  doc.setFillColor(brand(c.color)); doc.rect(0, 0, 18, H, "F");
  doc.setTextColor(MUTED); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("LESSON PLANNER", W / 2, H * 0.3, { align: "center", charSpace: 2 });
  doc.setTextColor(brand(color)); doc.setFont("helvetica", "bold");
  fitText(doc, c.title, W / 2, H * 0.3 + 44, W - 160, 36, { align: "center", min: 16 });
  doc.setFont("helvetica", "normal"); doc.setTextColor(INK);
  const who = [pl.teacher, cfg.school].filter(Boolean).join(" · ");
  if (who) fitText(doc, who, W / 2, H * 0.3 + 76, W - 160, 15, { align: "center" });
  doc.setTextColor(MUTED);
  fitText(doc, `${fmtMDY(c.from)} – ${fmtMDY(c.to)}`, W / 2, H * 0.3 + 100, W - 160, 12, { align: "center" });
  // rotation legend
  const labels = res.counts.map((x, i) => ({ t: x.long, col: PALETTE[i % PALETTE.length] })).concat(Object.keys(res.fixedCounts).map(k => ({ t: k, col: FIXED_COLOR })));
  if (labels.length) {
    let tot = 0; const ws = labels.map(l => { const w = chipWidth(doc, l.t, 10, 140); tot += w + 8; return w; });
    let x = W / 2 - (tot - 8) / 2;
    labels.forEach((l, i) => { chip(doc, l.t, x + ws[i] / 2, H * 0.3 + 128, 10, l.col[0], l.col[1], 140, color); x += ws[i] + 8; });
  }
  // contents: month links
  const targets = c.months.map(({ y, m }) => ({ y, m, p: c.monthTarget(y, m) })).filter(t => t.p);
  if (targets.length) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(MUTED);
    doc.text("JUMP TO", W / 2, H - 110, { align: "center", charSpace: 1.5 });
    const n = targets.length, bw = Math.min(64, (W - 140) / n), x0 = W / 2 - (bw * n) / 2;
    targets.forEach((t, i) => {
      const x = x0 + i * bw;
      doc.setDrawColor(LINE); doc.setLineWidth(0.7); doc.roundedRect(x + 2, H - 98, bw - 4, 22, 5, 5, "S");
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(INK);
      doc.text(MON3[t.m], x + bw / 2, H - 84, { align: "center" });
      doc.link(x + 2, H - 98, bw - 4, 22, { pageNumber: t.p });
    });
  }
}

function drawSchedule(doc, res, c) {
  const cfg = res.cfg, pl = cfg.pl, { box, color } = c;
  header(doc, box, "My schedule", c.title, [pl.teacher, cfg.school].filter(Boolean).join(" · "), color);
  const keys = pl.same ? ["*"] : c.keys;
  const top = box.y + 50, colL = 120;
  const cw = Math.min(150, (box.w - colL) / keys.length);
  const tableW = colL + cw * keys.length;
  const rh = Math.min(40, (box.h - 120) / (pl.periods.length + 1));
  doc.setFillColor(brand(color)); doc.rect(box.x, top, tableW, 22, "F");
  doc.setTextColor("#ffffff"); doc.setFont("helvetica", "bold");
  fitText(doc, "Period", box.x + 8, top + 15, colL - 12, 10);
  keys.forEach((k, i) => {
    const t = k === "*" ? "Every day" : k === "" ? "School day" : cfg.labels.includes(k) ? cfg.fmt.replace("{L}", k) : k;
    fitText(doc, t, box.x + colL + i * cw + 8, top + 15, cw - 12, 10);
  });
  pl.periods.forEach((p, r) => {
    const y = top + 22 + r * rh;
    doc.setFillColor(r % 2 ? "#ffffff" : SOFT); doc.rect(box.x, y, tableW, rh, "F");
    doc.setTextColor(INK); doc.setFont("helvetica", "bold");
    fitText(doc, p.n || `Period ${r + 1}`, box.x + 8, y + rh / 2 + (p.t ? -1 : 3), colL - 12, 10);
    if (p.t) { doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED); fitText(doc, p.t, box.x + 8, y + rh / 2 + 10, colL - 12, 8.5); }
    keys.forEach((k, i) => {
      const cls = (pl.cls[k] || [])[r] || "";
      doc.setFont("helvetica", "normal"); doc.setTextColor(INK);
      if (cls) fitText(doc, cls, box.x + colL + i * cw + 8, y + rh / 2 + 3, cw - 12, 10);
    });
  });
  doc.setDrawColor(LINE); doc.setLineWidth(0.6); doc.rect(box.x, top, tableW, 22 + rh * pl.periods.length, "S");
  const ty = top + 22 + rh * pl.periods.length + 26;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(MUTED);
  const rot = cfg.labels.length ? `Rotation: ${cfg.labels.map(l => cfg.fmt.replace("{L}", l)).join(", ")}. ` : "";
  wrap(doc, `${rot}${res.schoolDays} school days from ${fmtMDY(res.first ?? res.s)} to ${fmtMDY(res.last ?? res.e)}. Weekly pages show the rotation day and the classes that meet on that day.`, box.x, ty, Math.min(box.w, 560), 9, 3);
}

function drawWeek(doc, res, wk, c) {
  const cfg = res.cfg, pl = cfg.pl, { box, color } = c;
  const real = wk.days.filter(Boolean);
  const a = real[0].n, b = real[real.length - 1].n;
  const pa = parts(a);
  doc.setTextColor(brand(color)); doc.setFont("helvetica", "bold");
  fitText(doc, `Week of ${fmtRange(a, b)}`, box.x, box.y + 18, box.w * 0.6, 18);
  doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED); doc.setFontSize(9);
  doc.text(`Week ${c.weekNo} of ${c.weekTotal}`, box.x, box.y + 32);
  doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
  fitText(doc, c.title, box.x + box.w, box.y + 12, box.w * 0.38, 10, { align: "right" });
  const mt = c.monthTarget(pa.y, pa.m);
  doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED); doc.setFontSize(9);
  const mlabel = `${MONTHS[pa.m]} ${pa.y}`;
  doc.text(mlabel, box.x + box.w, box.y + 26, { align: "right" });
  if (mt) doc.link(box.x + box.w - doc.getTextWidth(mlabel), box.y + 18, doc.getTextWidth(mlabel), 11, { pageNumber: mt });
  if (pl.teacher) { doc.setFontSize(8.5); fitText(doc, pl.teacher, box.x + box.w, box.y + 37, box.w * 0.38, 8.5, { align: "right" }); }

  const top = box.y + 44, colL = 84, hdrH = 34, bottom = box.y + box.h - 18;
  const n = wk.days.length, cw = (box.w - colL) / n;
  const rows = pl.periods.length, rh = (bottom - top - hdrH) / rows;
  // day headers
  wk.days.forEach((day, i) => {
    const x = box.x + colL + i * cw;
    doc.setFillColor(day && day.school ? SOFT : "#ece9e4"); doc.rect(x, top, cw, hdrH, "F");
    const dnum = day ? day.n : wk.mon + ((wk.cols[i] + 6) % 7);
    doc.setFont("helvetica", "bold"); doc.setTextColor(day ? INK : "#a8a29e"); doc.setFontSize(10);
    doc.text(`${WD3[wday(dnum)]} ${fmtMD(dnum)}`, x + 6, top + 13);
    if (!day) return;
    const lab = day.school ? longLabel(cfg, day) : "";
    if (lab) { const [fill, ink] = colorFor(day); const w = chipWidth(doc, lab, 8.5, cw - 12); chip(doc, lab, x + 6 + w / 2, top + 24, 8.5, fill, ink, cw - 12, color); }
    else if (day.kind !== "school" && day.kind !== "fixed") {
      doc.setFont("helvetica", day.school ? "bold" : "normal"); doc.setTextColor(day.school ? INK : "#57534e");
      const t = day.school ? day.name : day.kind === "weekend" ? "No school" : day.name || "No school";
      fitText(doc, day.kind === "closed" ? `Closed: ${t}` : t, x + 6, top + 27, cw - 12, 8);
    }
  });
  // period labels
  pl.periods.forEach((p, r) => {
    const y = top + hdrH + r * rh;
    doc.setFillColor(r % 2 ? "#ffffff" : "#faf9f7"); doc.rect(box.x, y, colL, rh, "F");
    doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
    fitText(doc, p.n || `Period ${r + 1}`, box.x + 5, y + 12, colL - 9, 9);
    if (p.t) { doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED); fitText(doc, p.t, box.x + 5, y + 22, colL - 9, 7.5); }
  });
  // cells
  wk.days.forEach((day, i) => {
    const x = box.x + colL + i * cw;
    if (!day || !day.school) {
      doc.setFillColor("#f3f1ee"); doc.rect(x, top + hdrH, cw, rows * rh, "F");
      if (day && day.kind !== "weekend") {
        doc.setFont("helvetica", "bold"); doc.setTextColor("#8a837c");
        wrap(doc, day.kind === "closed" ? `${day.name}${day.mode === "skip" && day.skipped ? ` (${cfg.fmt.replace("{L}", day.skipped)} skipped)` : ""}` : day.name, x + cw / 2, top + hdrH + 30, cw - 16, 10, 3, 12, "center");
      }
      if (day && day.notes.length) { doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED); wrap(doc, day.notes.join("; "), x + cw / 2, top + hdrH + 70, cw - 16, 8, 3, 10, "center"); }
      return;
    }
    const cls = classesFor(cfg, day);
    for (let r = 0; r < rows; r++) {
      const y = top + hdrH + r * rh;
      let ly = y + 6;
      if (cls[r]) { doc.setFont("helvetica", "bold"); doc.setTextColor(color ? "#92400e" : INK); fitText(doc, cls[r], x + 5, y + 11, cw - 10, 8.5); ly = y + 14; }
      if (r === 0 && day.notes.length) { doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED); fitText(doc, day.notes.join("; "), x + cw - 5, y + 11, cls[r] ? cw * 0.45 : cw - 10, 7, { align: "right" }); }
      doc.setDrawColor(RULE); doc.setLineWidth(0.4);
      for (let yy = ly + 13; yy < y + rh - 4; yy += 13) doc.line(x + 5, yy, x + cw - 5, yy);
    }
  });
  // grid lines
  doc.setDrawColor(LINE); doc.setLineWidth(0.6);
  doc.rect(box.x, top, box.w, hdrH + rows * rh, "S");
  for (let r = 0; r <= rows; r++) doc.line(box.x, top + hdrH + r * rh, box.x + box.w, top + hdrH + r * rh);
  for (let i = 0; i <= n; i++) doc.line(box.x + colL + i * cw, top, box.x + colL + i * cw, top + hdrH + rows * rh);
}
