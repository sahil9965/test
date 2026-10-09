// BellBook rotation engine: pure functions, no DOM. Runs in browsers and in Node (unit tests).
// Dates are ISO strings (YYYY-MM-DD) at the edges and integer "day numbers" (days since
// 1970-01-01, UTC) inside, so daylight-saving changes can never shift a school day.

export const SITE = "https://bellbook-app.vercel.app";
export const CREDIT_URL = SITE + "/?utm_source=bellbook&utm_medium=watermark&utm_campaign=referral";
export const CREDIT_TEXT = "Made with BellBook · bellbook-app.vercel.app";

// ---------- dates ----------
export const dn = s => { const [y, m, d] = String(s).split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
export const iso = n => new Date(n * 864e5).toISOString().slice(0, 10);
export const wday = n => (((n % 7) + 7) % 7 + 4) % 7; // 0 = Sunday (1970-01-01 was a Thursday)
export const fromYMD = (y, m, d) => Math.round(Date.UTC(y, m, d) / 864e5); // m is 0-based
export const parts = n => { const t = new Date(n * 864e5); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() }; };
export const isIso = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(dn(s)) === s;
export const localToday = (now = new Date()) => fromYMD(now.getFullYear(), now.getMonth(), now.getDate());
export const mondayOf = n => n - ((wday(n) + 6) % 7);

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MON3 = MONTHS.map(m => m.slice(0, 3));
export const WDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WD3 = WDAYS.map(w => w.slice(0, 3));
export const fmtShort = n => { const p = parts(n); return `${WD3[wday(n)]}, ${MON3[p.m]} ${p.d}`; };           // Mon, Oct 12
export const fmtMD = n => { const p = parts(n); return `${MON3[p.m]} ${p.d}`; };                                  // Oct 12
export const fmtLong = n => { const p = parts(n); return `${WDAYS[wday(n)]}, ${MONTHS[p.m]} ${p.d}, ${p.y}`; }; // Monday, October 12, 2026
export const fmtMDY = n => { const p = parts(n); return `${MON3[p.m]} ${p.d}, ${p.y}`; };                         // Oct 12, 2026
export function fmtRange(a, b) {
  if (a === b) return fmtMDY(a);
  const pa = parts(a), pb = parts(b);
  if (pa.y !== pb.y) return `${fmtMDY(a)} – ${fmtMDY(b)}`;
  if (pa.m !== pb.m) return `${fmtMD(a)} – ${fmtMD(b)}, ${pb.y}`;
  return `${MON3[pa.m]} ${pa.d}–${pb.d}, ${pb.y}`;
}

// ---------- US federal holidays ----------
const nthWeekday = (y, m, wd, nth) => {
  if (nth > 0) { const first = fromYMD(y, m, 1); return first + ((wd - wday(first) + 7) % 7) + (nth - 1) * 7; }
  const last = fromYMD(y, m + 1, 0); return last - ((wday(last) - wd + 7) % 7);
};
// Federal rule: a holiday on Saturday is observed on Friday, on Sunday it is observed on Monday.
const observed = n => (wday(n) === 6 ? n - 1 : wday(n) === 0 ? n + 1 : n);
export const US_HOLIDAYS = [
  { k: "labor", n: "Labor Day", f: y => nthWeekday(y, 8, 1, 1), school: true },
  { k: "columbus", n: "Columbus Day / Indigenous Peoples' Day", f: y => nthWeekday(y, 9, 1, 2), school: false },
  { k: "veterans", n: "Veterans Day", f: y => fromYMD(y, 10, 11), obs: true, school: false },
  { k: "thanksgiving", n: "Thanksgiving Day", f: y => nthWeekday(y, 10, 4, 4), school: true },
  { k: "christmas", n: "Christmas Day", f: y => fromYMD(y, 11, 25), obs: true, school: true },
  { k: "newyear", n: "New Year's Day", f: y => fromYMD(y, 0, 1), obs: true, school: true },
  { k: "mlk", n: "Martin Luther King Jr. Day", f: y => nthWeekday(y, 0, 1, 3), school: true },
  { k: "presidents", n: "Presidents' Day", f: y => nthWeekday(y, 1, 1, 3), school: true },
  { k: "memorial", n: "Memorial Day", f: y => nthWeekday(y, 4, 1, -1), school: true },
  { k: "juneteenth", n: "Juneteenth", f: y => fromYMD(y, 5, 19), obs: true, school: true, from: 2021 },
  { k: "independence", n: "Independence Day", f: y => fromYMD(y, 6, 4), obs: true, school: true },
];
const holidayOn = (h, y) => { const a = h.f(y); return h.obs ? observed(a) : a; };
// Every federal holiday whose (observed) date falls between two ISO dates, oldest first.
export function usHolidays(startIso, endIso) {
  const s = dn(startIso), e = dn(endIso), out = [];
  for (let y = parts(s).y - 1; y <= parts(e).y + 1; y++) for (const h of US_HOLIDAYS) {
    if (h.from && y < h.from) continue;
    const raw = h.f(y), d = holidayOn(h, y);
    if (d >= s && d <= e) out.push({ k: h.k, date: iso(d), name: h.n + (d !== raw ? " (observed)" : ""), school: h.school });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- rotation types ----------
export const TYPES = {
  ab: { name: "A/B", labels: ["A", "B"], fmt: "{L} Day" },
  abc: { name: "A/B/C", labels: ["A", "B", "C"], fmt: "{L} Day" },
  abcd: { name: "A/B/C/D", labels: ["A", "B", "C", "D"], fmt: "{L} Day" },
  dayN: { name: "Day 1–N cycle", labels: null, fmt: "Day {L}" },
  oddeven: { name: "Odd/Even", labels: ["Odd", "Even"], fmt: "{L} Day" },
  custom: { name: "Custom labels", labels: null, fmt: "{L}" },
  none: { name: "No rotation", labels: [], fmt: "{L}" },
};
export const dayNLabels = n => Array.from({ length: Math.max(2, Math.min(20, n | 0)) }, (_, i) => String(i + 1));

// Print-friendly label colours: light fill + dark ink, in rotation order.
export const PALETTE = [
  ["#fde68a", "#78350f"], ["#bfdbfe", "#1e3a8a"], ["#bbf7d0", "#14532d"], ["#fecaca", "#7f1d1d"], ["#ddd6fe", "#4c1d95"],
  ["#fbcfe8", "#831843"], ["#a5f3fc", "#164e63"], ["#fed7aa", "#7c2d12"], ["#d9f99d", "#365314"], ["#e2e8f0", "#1e293b"],
];
export const FIXED_COLOR = ["#e7e5e4", "#292524"];
export const colorFor = day => (day.ci >= 0 ? PALETTE[day.ci % PALETTE.length] : FIXED_COLOR);

// ---------- config ----------
const str = (v, max = 80) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
export const WK_DEFAULT = ["off", "rot", "rot", "rot", "rot", "rot", "off"];

// Normalise any (possibly untrusted, e.g. from a share link) object into a valid config.
export function normalize(raw = {}) {
  const c = {};
  c.v = 1;
  c.title = str(raw.title, 90);
  c.school = str(raw.school, 90);
  c.start = isIso(raw.start) ? raw.start : "2026-08-17";
  c.end = isIso(raw.end) ? raw.end : "2027-05-28";
  c.type = TYPES[raw.type] ? raw.type : "ab";
  let labels = Array.isArray(raw.labels) ? raw.labels.map(l => str(l, 16)).filter(Boolean).slice(0, 20) : null;
  if (c.type === "none") labels = [];
  else if (TYPES[c.type].labels) labels = TYPES[c.type].labels.slice();
  else if (!labels || labels.length < 2) labels = c.type === "dayN" ? dayNLabels(6) : ["A", "B"];
  c.labels = [...new Set(labels)];
  c.fmt = typeof raw.fmt === "string" && raw.fmt.includes("{L}") ? str(raw.fmt, 24) : TYPES[c.type].fmt;
  c.first = Number.isInteger(raw.first) && raw.first >= 0 && raw.first < c.labels.length ? raw.first : 0;
  c.wk = WK_DEFAULT.map((d, i) => {
    const w = Array.isArray(raw.wk) ? raw.wk[i] : d;
    if (w === "off" || w === "rot") return w;
    if (typeof w === "string" && w.startsWith("fix:")) return "fix:" + str(w.slice(4), 24);
    return d;
  });
  c.ev = (Array.isArray(raw.ev) ? raw.ev : []).slice(0, 300).map(normEvent).filter(Boolean);
  c.sem2 = isIso(raw.sem2) ? raw.sem2 : "";
  if (raw.pl && typeof raw.pl === "object") c.pl = normPlanner(raw.pl, c);
  return c;
}
const EV_TYPES = ["off", "closed", "norot", "reset", "note", "extra"];
function normEvent(e) {
  if (!e || !EV_TYPES.includes(e.t) || !isIso(e.s)) return null;
  const o = { t: e.t, s: e.s, e: isIso(e.e) && e.e >= e.s ? e.e : e.s, n: str(e.n, 60) };
  if (e.t === "closed") o.m = e.m === "skip" ? "skip" : "continue";
  if (e.t === "reset") { o.l = Number.isInteger(e.l) && e.l >= 0 ? e.l : 0; o.e = o.s; }
  if (e.t === "off" && typeof e.h === "string" && US_HOLIDAYS.some(h => h.k === e.h)) o.h = e.h;
  return o;
}
export function normPlanner(p, cfg) {
  const periods = (Array.isArray(p.periods) ? p.periods : []).slice(0, 10).map(x => ({ n: str(x && x.n, 24), t: str(x && x.t, 24) }));
  const cls = {};
  if (p.cls && typeof p.cls === "object") for (const [k, v] of Object.entries(p.cls).slice(0, 40)) if (Array.isArray(v)) cls[str(k, 24)] = v.slice(0, 10).map(x => str(x, 40));
  return {
    teacher: str(p.teacher, 60),
    periods: periods.length ? periods : [{ n: "Period 1", t: "" }],
    same: !!p.same,
    cls,
    from: isIso(p.from) ? p.from : cfg.start,
    to: isIso(p.to) ? p.to : cfg.end,
    cover: p.cover !== false,
    monthly: p.monthly !== false,
    weekly: p.weekly !== false,
    tabs: !!p.tabs,
  };
}

// Display text for a day's label: "A Day", "Day 3", or a fixed label as typed.
export const longLabel = (cfg, day) => (day.label == null || day.label === "" ? "" : day.ci >= 0 ? cfg.fmt.replace("{L}", day.label) : day.label);

// ---------- the rotation walk ----------
// Rules, in priority order for each calendar date between start and end:
//  0. An "extra" (make-up) day turns a weekend or holiday into a rotating school day.
//  1. A "reset" sets the rotation so this (or the next rotating) school day gets the chosen label.
//  2. Weekday set to "off" (weekends by default): no school, the rotation pauses.
//  3. Holiday / break ("off" event): no school, the rotation pauses.
//  4. Closure ("closed", e.g. snow day): no school. Mode "continue" pauses the rotation (the next
//     school day gets the letter this day would have had); mode "skip" uses up this day's letter
//     so every later date keeps the letter it was originally scheduled to have.
//  5. "norot" (exam day, assembly day): school day with no rotation label; the rotation pauses.
//  6. Weekday set to "fix:<label>" (e.g. Monday = All classes): school day with that label; pauses.
//  7. Otherwise ("rot"): school day with labels[k mod n], then k advances.
export function compute(input) {
  const cfg = input && input.v ? input : normalize(input);
  const s = dn(cfg.start), e = dn(cfg.end);
  const res = { cfg, s, e, days: [], errors: [], counts: [], fixedCounts: {}, schoolDays: 0, daysOff: 0, closures: 0, norot: 0, first: null, last: null };
  if (e < s) { res.errors.push("The last day of school is before the first day."); return res; }
  if (e - s > 800) { res.errors.push("The date range is longer than two years. Use one school year at a time."); return res; }
  const n = cfg.labels.length;
  const offAt = new Map(), closedAt = new Map(), norotAt = new Map(), resetAt = new Map(), notesAt = new Map(), extraAt = new Map();
  // When two ranges overlap (Thanksgiving Day inside Thanksgiving break), the shorter, more specific one names the day.
  const span = ev => dn(ev.e || ev.s) - dn(ev.s);
  const keep = (map, d, ev) => { const o = map.get(d); if (!o || span(ev) < span(o)) map.set(d, ev); };
  for (const ev of cfg.ev) {
    const a = Math.max(s, dn(ev.s)), b = Math.min(e, dn(ev.e || ev.s));
    for (let d = a; d <= b; d++) {
      if (ev.t === "off") keep(offAt, d, ev);
      else if (ev.t === "closed") keep(closedAt, d, ev);
      else if (ev.t === "norot") keep(norotAt, d, ev);
      else if (ev.t === "reset") resetAt.set(d, ev);
      else if (ev.t === "extra") { if (!extraAt.has(d)) extraAt.set(d, ev); }
      else if (ev.t === "note") { if (!notesAt.has(d)) notesAt.set(d, []); notesAt.get(d).push(ev.n); }
    }
  }
  const counts = new Array(n).fill(0);
  let k = cfg.first;
  for (let d = s; d <= e; d++) {
    const w = wday(d), ex = extraAt.get(d), rule = ex ? (cfg.wk[w] === "off" ? "rot" : cfg.wk[w]) : cfg.wk[w];
    const day = { n: d, iso: iso(d), w, kind: "school", school: false, label: null, li: -1, ci: -1, name: "", notes: [...(notesAt.get(d) || [])] };
    if (ex) { day.extra = true; day.notes.unshift(ex.n || "Make-up day"); }
    const r = resetAt.get(d);
    if (r && n) { k = r.l % n; day.reset = true; }
    if (rule === "off") day.kind = "weekend";
    else if (!ex && offAt.has(d)) { day.kind = "off"; day.name = offAt.get(d).n || "No school"; res.daysOff++; }
    else if (closedAt.has(d)) {
      const c = closedAt.get(d);
      day.kind = "closed"; day.name = c.n || "School closed"; day.mode = c.m; res.closures++;
      if (c.m === "skip" && rule === "rot" && !norotAt.has(d) && n) { day.skipped = cfg.labels[((k % n) + n) % n]; k++; }
    } else if (norotAt.has(d)) { day.kind = "norot"; day.school = true; day.name = norotAt.get(d).n || "No rotation"; res.norot++; }
    else if (rule.startsWith("fix:")) {
      // A fixed label that matches a rotation label (Monday = A) counts and colours as that label.
      day.kind = "fixed"; day.school = true; day.label = rule.slice(4); day.ci = cfg.labels.indexOf(day.label);
      if (day.ci >= 0) counts[day.ci]++;
      else if (day.label) res.fixedCounts[day.label] = (res.fixedCounts[day.label] || 0) + 1;
    } else {
      day.school = true;
      if (n) { day.li = day.ci = ((k % n) + n) % n; day.label = cfg.labels[day.li]; counts[day.li]++; k++; }
    }
    if (day.school) { res.schoolDays++; if (res.first == null) res.first = d; res.last = d; }
    res.days.push(day);
  }
  res.counts = cfg.labels.map((l, i) => ({ label: l, long: cfg.fmt.replace("{L}", l), count: counts[i] }));
  return res;
}
export const dayAt = (res, d) => (d >= res.s && d <= res.e ? res.days[d - res.s] : null);
export function nextSchoolDay(res, from) {
  for (let d = Math.max(from, res.s); d <= res.e; d++) if (res.days[d - res.s].school) return res.days[d - res.s];
  return null;
}
// Number of school days whose status or label changed between two computations (for "re-flowed N days").
export function diffCount(a, b) {
  if (!a || !b) return 0;
  let n = 0;
  for (const d of b.days) {
    const o = dayAt(a, d.n);
    if (o && (o.school !== d.school || o.label !== d.label)) n++;
  }
  return n;
}

// ---------- months (for calendars) ----------
export function monthsIn(res) {
  const out = [];
  if (res.errors.length) return out;
  let { y, m } = parts(res.s);
  const end = parts(res.e);
  while (y < end.y || (y === end.y && m <= end.m)) { out.push({ y, m }); m++; if (m > 11) { m = 0; y++; } }
  return out;
}
// Weeks of a month as arrays of 7 day numbers (or null outside the month); weekStart 0 = Sunday, 1 = Monday.
export function monthGrid(y, m, weekStart = 0) {
  const first = fromYMD(y, m, 1), last = fromYMD(y, m + 1, 0);
  const lead = (wday(first) - weekStart + 7) % 7;
  const weeks = [];
  let cur = first - lead;
  while (cur <= last) {
    const row = [];
    for (let i = 0; i < 7; i++, cur++) row.push(cur >= first && cur <= last ? cur : null);
    weeks.push(row);
  }
  return weeks;
}

// ---------- events in range (legend lists) ----------
export function eventList(res) {
  const out = [];
  for (const ev of res.cfg.ev) {
    if (ev.t === "reset") continue;
    const a = Math.max(res.s, dn(ev.s)), b = Math.min(res.e, dn(ev.e));
    if (a > b) continue;
    out.push({ t: ev.t, s: a, e: b, n: ev.n || { off: "No school", closed: "School closed", norot: "No rotation", note: "Note", extra: "Make-up day" }[ev.t], m: ev.m });
  }
  return out.sort((x, y) => x.s - y.s || x.e - y.e);
}

// ---------- .ics (RFC 5545) ----------
const icsEsc = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const ymdc = d => iso(d).replace(/-/g, "");
// Fold lines longer than 75 octets (UTF-8), never splitting a multi-byte character.
export function foldLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = "", bytes = 0, limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) { out.push(cur); cur = ""; bytes = 0; limit = 74; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}
export function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
export const calName = cfg => cfg.title || [cfg.school, "Rotation calendar"].filter(Boolean).join(" ");
export function buildIcs(res, { includeOff = true, now = new Date() } = {}) {
  const cfg = res.cfg;
  const id = hashStr([cfg.school, cfg.title, cfg.start].join("|"));
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const name = calName(cfg);
  const credit = `Made with BellBook · ${CREDIT_URL}`;
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BellBook//Rotation Calendar 1.0//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:" + icsEsc(name), "X-WR-CALDESC:" + icsEsc(`School rotation days. ${credit}`)];
  const ev = (uid, a, b, summary, desc) => L.push("BEGIN:VEVENT", `UID:${uid}-${id}@bellbook-app.vercel.app`, "DTSTAMP:" + stamp,
    `DTSTART;VALUE=DATE:${ymdc(a)}`, `DTEND;VALUE=DATE:${ymdc(b + 1)}`, "SUMMARY:" + icsEsc(summary),
    "DESCRIPTION:" + icsEsc(desc), "TRANSP:TRANSPARENT", "END:VEVENT");
  const src = name + (cfg.school && cfg.title && !cfg.title.includes(cfg.school) ? ` (${cfg.school})` : "");
  for (const d of res.days) {
    if (d.school) {
      const lab = longLabel(cfg, d);
      const summary = d.kind === "norot" ? d.name : lab || "School day";
      if (!lab && d.kind !== "norot") continue; // no rotation and nothing to say
      const extra = d.notes.length ? d.notes.join("; ") + "\n" : "";
      ev(ymdc(d.n), d.n, d.n, summary + (d.notes.length ? " · " + d.notes.join("; ") : ""), `${extra}${src}\n${credit}`);
    } else if (includeOff && d.kind === "closed") {
      ev(ymdc(d.n), d.n, d.n, `No school: ${d.name}`, `${d.mode === "skip" ? `The ${d.skipped ? cfg.fmt.replace("{L}", d.skipped) : "rotation day"} is skipped.` : "The rotation continues on the next school day."}\n${src}\n${credit}`);
    }
  }
  if (includeOff) for (const x of eventList(res)) if (x.t === "off") ev(`off-${ymdc(x.s)}-${hashStr(x.n)}`, x.s, x.e, `No school: ${x.n}`, `${src}\n${credit}`);
  L.push("END:VCALENDAR");
  return L.map(foldLine).join("\r\n") + "\r\n";
}

// ---------- CSV ----------
const csvCell = v => (/[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
export function buildCsv(res) {
  const cfg = res.cfg;
  const rows = [["Date", "Weekday", "Rotation day", "Status", "Notes"]];
  const status = { school: "School day", fixed: "School day", norot: "School day (no rotation)", off: "No school", closed: "No school", weekend: "" };
  for (const d of res.days) {
    if (d.kind === "weekend" && !d.notes.length) continue;
    const name = d.kind === "off" || d.kind === "closed" || d.kind === "norot" ? d.name : "";
    const extra = d.kind === "closed" ? (d.mode === "skip" ? " (rotation day skipped)" : " (rotation continues)") : "";
    rows.push([d.iso, WDAYS[d.w], longLabel(cfg, d), status[d.kind] + (name ? ": " + name + extra : ""), d.notes.join("; ")]);
  }
  rows.push([], ["", "", "", "", `Made with BellBook (${SITE})`]);
  return rows.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// ---------- share link (config packed into the URL hash; nothing is sent to a server) ----------
const b64url = bytes => { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64url = s => { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
export function shareable(cfg) {
  const { pl, ...rest } = cfg; // the lesson planner stays private to this browser
  return rest;
}
export async function encodeShare(cfg) {
  const bytes = new TextEncoder().encode(JSON.stringify(shareable(cfg)));
  if (typeof CompressionStream === "function") {
    try { return "1" + b64url(await pipe(bytes, new CompressionStream("deflate-raw"))); } catch {}
  }
  return "0" + b64url(bytes);
}
export async function decodeShare(code) {
  try {
    code = String(code || "").trim();
    let bytes = unb64url(code.slice(1));
    if (code[0] === "1") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    else if (code[0] !== "0") return null;
    const raw = JSON.parse(new TextDecoder().decode(bytes));
    if (!raw || typeof raw !== "object") return null;
    return normalize(raw);
  } catch { return null; }
}

// ---------- lesson planner ----------
// Weeks (Monday-based) between two dates; columns are the weekdays that are not "off".
// A weekday that is normally off still gets a column in weeks where it holds a make-up school day.
export function plannerWeeks(res, fromIso, toIso) {
  const a = Math.max(res.s, dn(fromIso)), b = Math.min(res.e, dn(toIso));
  const weeks = [];
  if (a > b) return weeks;
  for (let mon = mondayOf(a); mon <= b; mon += 7) {
    const inRange = d => d >= a && d <= b;
    const cols = [1, 2, 3, 4, 5, 6, 0].filter(w => { const d = mon + ((w + 6) % 7); return res.cfg.wk[w] !== "off" || (inRange(d) && dayAt(res, d).school); });
    const days = cols.map(w => { const d = mon + ((w + 6) % 7); return inRange(d) ? dayAt(res, d) : null; });
    if (days.some(Boolean)) weeks.push({ mon, cols, days });
  }
  return weeks;
}
export const plannerKeys = cfg => {
  const keys = cfg.labels.slice();
  for (const w of cfg.wk) if (w.startsWith("fix:") && !keys.includes(w.slice(4))) keys.push(w.slice(4));
  return keys.length ? keys : [""];
};
export function classesFor(cfg, day) {
  const pl = cfg.pl;
  if (!pl || !day || !day.school) return [];
  const list = pl.same ? pl.cls["*"] : pl.cls[day.label == null ? "" : day.label];
  return pl.periods.map((p, i) => (list && list[i]) || "");
}

// ---------- class roster pages ----------
const dayKey = (cfg, day) => (cfg.pl && cfg.pl.same ? "*" : day.label == null ? "" : day.label);
// Every class typed in the planner, as choices for roster pages. A class that sits in more than one slot
// (e.g. Algebra 1 in Block 1 on A days and Block 3 on B days) gets one "all meetings" choice plus one per slot,
// because each slot is usually a different section with its own roster.
export function classChoices(cfg) {
  const pl = cfg.pl, byName = new Map();
  if (!pl) return [];
  const keys = pl.same ? ["*"] : plannerKeys(cfg);
  for (const k of keys) (pl.cls[k] || []).forEach((c, p) => {
    const n = str(c, 40);
    if (!n || p >= pl.periods.length) return;
    const id = n.toLowerCase();
    if (!byName.has(id)) byName.set(id, { name: n, slots: [] });
    byName.get(id).slots.push({ key: k, p });
  });
  const out = [];
  const keyText = k => (k === "*" ? "" : k === "" ? "school days" : cfg.labels.includes(k) ? cfg.fmt.replace("{L}", k) : k);
  for (const { name, slots } of byName.values()) {
    const per = s => pl.periods[s.p].n || `Period ${s.p + 1}`;
    if (slots.length === 1) { out.push({ cls: name, key: null, p: null, text: [name, [keyText(slots[0].key), per(slots[0])].filter(Boolean).join(", ")].join(" · ") }); continue; }
    out.push({ cls: name, key: null, p: null, text: `${name} · every meeting` });
    for (const sl of slots) out.push({ cls: name, key: sl.key, p: sl.p, text: `${name} · ${[keyText(sl.key), per(sl)].filter(Boolean).join(", ")}` });
  }
  return out;
}
// School days between two dates on which a class meets. sel = {cls, key, p}: key/p null means any slot;
// cls "" means every school day (homeroom, or a schedule without classes). Returns [{day, periods: [index...]}].
export function meetingDates(res, sel, fromIso, toIso) {
  const cfg = res.cfg, a = Math.max(res.s, dn(fromIso)), b = Math.min(res.e, dn(toIso)), out = [];
  const want = str(sel && sel.cls, 40).toLowerCase();
  for (let d = a; d <= b; d++) {
    const day = dayAt(res, d);
    if (!day || !day.school) continue;
    if (!want) { out.push({ day, periods: [] }); continue; }
    if (sel.key != null && dayKey(cfg, day) !== sel.key) continue;
    const periods = classesFor(cfg, day).map((c, i) => (str(c, 40).toLowerCase() === want && (sel.p == null || sel.p === i) ? i : -1)).filter(i => i >= 0);
    if (periods.length) out.push({ day, periods });
  }
  return out;
}
// Student names pasted from a list or a spreadsheet column: one per line. Tabs (spreadsheet cells) become spaces,
// unless a header row names "last" and "first" columns, which become "Last, First". Numbers-only cells (IDs) are dropped.
export function parseRoster(text, max = 80) {
  const lines = String(text ?? "").split(/\r?\n/).map(l => l.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").trim()).filter(Boolean);
  if (!lines.length) return [];
  let iLast = -1, iFirst = -1, start = 0;
  const head = lines[0].split("\t").map(c => c.trim().toLowerCase());
  if (head.length > 1 && head.some(c => /name/.test(c)) || head.length === 1 && /^(student\s*)?names?$/.test(head[0])) {
    start = 1;
    iLast = head.findIndex(c => /last/.test(c)); iFirst = head.findIndex(c => /first/.test(c));
  }
  const out = [];
  for (const line of lines.slice(start)) {
    const cells = line.split("\t").map(c => c.trim());
    let name;
    if (iLast >= 0 && iFirst >= 0 && cells[iLast] && cells[iFirst]) name = `${cells[iLast]}, ${cells[iFirst]}`;
    else name = cells.filter(c => c && !/^[\d\s#.-]+$/.test(c)).join(" ");
    name = name.replace(/^\d{1,3}[.)]\s+/, "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (name) out.push(name);
    if (out.length >= max) break;
  }
  return out;
}

// ---------- roll a configuration forward to the next school year ----------
// "2026–27" -> "2027–28", "2026-2027" -> "2027-2028", "2026" -> "2027" (one pass, so nothing is bumped twice).
export const bumpYears = s => s.replace(/\b(20\d\d)([–\-\/])(20\d\d|\d\d)\b|\b(20\d\d)\b/g, (m, a, sep, b, solo) =>
  solo ? String(+solo + 1) : `${+a + 1}${sep}${b.length === 4 ? +b + 1 : String((+b + 1) % 100).padStart(2, "0")}`);
export function rollForward(input) {
  const cfg = normalize(input);
  const W = 364; // 52 weeks keeps every date on the same weekday
  const shift = (s, k = W) => iso(dn(s) + k);
  const hol = new Map(); // holiday date -> delta to its next-year date
  const out = { ...cfg, title: bumpYears(cfg.title), start: shift(cfg.start), end: shift(cfg.end), sem2: cfg.sem2 ? shift(cfg.sem2) : "" };
  const evs = [];
  for (const ev of cfg.ev) {
    if (ev.t !== "off" || !ev.h) continue;
    const h = US_HOLIDAYS.find(x => x.k === ev.h), d = dn(ev.s), y0 = parts(d).y;
    const hy = [y0 - 1, y0, y0 + 1].find(y => holidayOn(h, y) === d);
    if (hy == null) { evs.push({ ...ev, s: shift(ev.s), e: shift(ev.e) }); continue; }
    const nd = holidayOn(h, hy + 1);
    hol.set(d, nd - d);
    evs.push({ ...ev, s: iso(nd), e: iso(nd), n: h.n + (nd !== h.f(hy + 1) ? " (observed)" : "") });
  }
  for (const ev of cfg.ev) {
    if (ev.t === "closed" || ev.t === "reset" || (ev.t === "off" && ev.h)) continue;
    // Breaks anchored to a weekday holiday (e.g. Thanksgiving break) move with it when that keeps weekdays aligned.
    let k = W;
    const a = dn(ev.s), b = dn(ev.e);
    for (const [hd, delta] of hol) if (hd >= a - 3 && hd <= b + 3 && delta % 7 === 0) { k = delta; break; }
    evs.push({ ...ev, s: shift(ev.s, k), e: shift(ev.e, k) });
  }
  out.ev = evs.sort((x, y) => x.s.localeCompare(y.s));
  if (cfg.pl) out.pl = { ...cfg.pl, from: shift(cfg.pl.from), to: shift(cfg.pl.to) };
  return normalize(out);
}

// ---------- sample configurations (presets for each landing page) ----------
const holidayEvents = (start, end) => usHolidays(start, end).filter(h => h.school).map(h => ({ t: "off", s: h.date, e: h.date, n: h.name, h: h.k }));
export function sample(kind = "ab") {
  const y2728 = kind === "y2728";
  const start = y2728 ? "2027-08-16" : "2026-08-17", end = y2728 ? "2028-05-26" : "2027-05-28";
  const breaks = y2728
    ? [{ t: "off", s: "2027-11-24", e: "2027-11-26", n: "Thanksgiving break" }, { t: "off", s: "2027-12-20", e: "2027-12-31", n: "Winter break" }, { t: "off", s: "2028-03-20", e: "2028-03-24", n: "Spring break" }]
    : [{ t: "off", s: "2026-11-25", e: "2026-11-27", n: "Thanksgiving break" }, { t: "off", s: "2026-12-21", e: "2027-01-01", n: "Winter break" }, { t: "off", s: "2027-03-22", e: "2027-03-26", n: "Spring break" }];
  const yr = y2728 ? "2027–28" : "2026–27";
  const base = { title: `${yr} A/B Day Calendar`, school: "", start, end, type: "ab", first: 0, wk: WK_DEFAULT.slice(), ev: [...holidayEvents(start, end), ...breaks], sem2: y2728 ? "2028-01-18" : "2027-01-19" };
  const periods = n => Array.from({ length: n }, (_, i) => ({ n: `Period ${i + 1}`, t: "" }));
  const blocks = [{ n: "Block 1", t: "8:00–9:30" }, { n: "Block 2", t: "9:40–11:10" }, { n: "Block 3", t: "11:50–1:20" }, { n: "Block 4", t: "1:30–3:00" }];
  const abPl = { periods: blocks, same: false, cls: { A: ["Algebra 1", "Geometry", "Planning", "Algebra 1"], B: ["Geometry", "Algebra 2", "Algebra 1", "Planning"], "All classes": [] }, from: start, to: end };
  base.ev.sort((x, y) => x.s.localeCompare(y.s) || y.e.localeCompare(x.e));
  const c = { ...base, pl: abPl };
  if (kind === "abc") Object.assign(c, { type: "abc", title: `${yr} A/B/C Day Calendar` });
  if (kind === "rotating") Object.assign(c, { type: "dayN", labels: dayNLabels(4), fmt: "Day {L}", title: `${yr} Day 1–4 Rotation Calendar`, pl: { periods: periods(6), same: false, cls: {}, from: start, to: end } });
  if (kind === "six") Object.assign(c, { type: "dayN", labels: dayNLabels(6), fmt: "Day {L}", title: `${yr} 6-Day Cycle Calendar`, pl: { periods: periods(7), same: false, cls: { 1: ["English 9", "English 9", "Planning", "Lunch duty", "English 10", "English 10", "Advisory"] }, from: start, to: end } });
  if (kind === "block") Object.assign(c, { title: `${yr} Block Schedule Calendar`, wk: ["off", "fix:All classes", "rot", "rot", "rot", "rot", "off"],
    pl: { ...abPl, periods: [...blocks], cls: { ...abPl.cls, "All classes": ["Algebra 1", "Geometry", "Algebra 2", "Planning"] } } });
  if (kind === "planner" || kind === "sem2") Object.assign(c, { title: `${yr} A/B Lesson Planner` });
  if (kind === "sem2") c.pl = { ...abPl, from: base.sem2, to: end };
  if (kind === "dated") Object.assign(c, { type: "none", title: `${yr} School Calendar`, pl: { periods: periods(7).map((p, i) => ({ ...p, t: ["7:50–8:40", "8:45–9:35", "9:40–10:30", "10:35–11:25", "12:00–12:50", "12:55–1:45", "1:50–2:40"][i] })), same: true, cls: { "*": ["Biology", "Biology", "Planning", "Chemistry", "Biology", "Chemistry", "Study hall"] }, from: start, to: end } });
  if (y2728) Object.assign(c, { title: "2027–28 Teacher Planner" });
  return normalize(c);
}
