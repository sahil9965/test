/* StreamWeek core: plain dates, time-zone maths (Intl only, no library), the week model, the
   Discord / X text and the .ics file. No DOM access, so the same file runs on the page and in
   Node tests. Every stream is a real date + wall time in the home zone, converted to a UTC
   instant, so daylight-saving changes are handled for the exact week you are posting. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SWCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SITE = "https://streamschedule.roohsites.com";
  const DAY = 86400000, MIN = 60000, HOUR = 3600000;
  const pad = n => String(n).padStart(2, "0");

  // ---------- plain calendar dates (YYYY-MM-DD) ----------
  const toMs = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const fromMs = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const isIso = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && fromMs(toMs(s)) === s;
  const addDays = (iso, n) => fromMs(toMs(iso) + n * DAY);
  const dow = iso => new Date(toMs(iso)).getUTCDay(); // 0 = Sunday
  const dayDiff = (a, b) => Math.round((toMs(a) - toMs(b)) / DAY);
  const weekStartOf = (iso, sunday) => addDays(iso, -((dow(iso) - (sunday ? 0 : 1) + 7) % 7));
  // Today if today is the first day of the week, otherwise the next one.
  const defaultWeekStart = (todayIso, sunday) => { const s = weekStartOf(todayIso, sunday); return s === todayIso ? s : addDays(s, 7); };
  const isTime = s => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

  // ---------- time zones ----------
  const fmtCache = new Map();
  function dtf(tz) {
    let f = fmtCache.get(tz);
    if (!f) {
      f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
      fmtCache.set(tz, f);
    }
    return f;
  }
  function validTz(tz) {
    if (typeof tz !== "string" || !tz) return false;
    try { dtf(tz); return true; } catch (e) { return false; }
  }
  function wallParts(t, tz) {
    const o = {};
    for (const p of dtf(tz).formatToParts(new Date(t))) o[p.type] = p.value;
    return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
  }
  // Minutes to add to UTC to get the wall clock in `tz` at instant `t`.
  function offsetMin(t, tz) {
    const w = wallParts(t, tz);
    return Math.round((Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) - Math.floor(t / 1000) * 1000) / MIN);
  }
  // Wall date/time in `tz` at instant `t`.
  function wall(t, tz) {
    const w = wallParts(t, tz);
    return { date: `${w.y}-${pad(w.mo)}-${pad(w.d)}`, time: `${pad(w.h)}:${pad(w.mi)}` };
  }
  // Home wall time -> UTC instant. Tries every offset in force within a day of the guess and keeps
  // the ones that round-trip. Two matches (clocks going back) → the first occurrence. No match
  // (clocks going forward) → the time is moved forward by the size of the gap, and `gap` says by
  // how many minutes, so the page can warn about it.
  function wallToUtc(dateIso, hhmm, tz) {
    const [h, mi] = hhmm.split(":").map(Number);
    const guess = toMs(dateIso) + (h * 60 + mi) * MIN;
    const offs = [...new Set([-24, -18, -12, -6, 0, 6, 12, 18, 24].map(k => offsetMin(guess + k * HOUR, tz)))];
    const ok = offs.map(o => guess - o * MIN).filter(t => t + offsetMin(t, tz) * MIN === guess).sort((a, b) => a - b);
    if (ok.length) return { t: ok[0], gap: 0 };
    const t = guess - Math.min(...offs) * MIN;
    return { t, gap: Math.round((t + offsetMin(t, tz) * MIN - guess) / MIN) };
  }

  // Short labels. Common zones get their usual abbreviation (daylight variant when the offset is the
  // larger of January/July); anything else uses Intl's short name or a plain UTC±h.
  const ABBR = {
    "Asia/Tokyo": ["JST"], "Asia/Seoul": ["KST"], "Asia/Kolkata": ["IST"], "Asia/Calcutta": ["IST"], "Asia/Singapore": ["SGT"], "Asia/Hong_Kong": ["HKT"], "Asia/Jakarta": ["WIB"], "Asia/Bangkok": ["ICT"],
    "Europe/London": ["GMT", "BST"], "Europe/Dublin": ["GMT", "IST"], "Europe/Lisbon": ["WET", "WEST"],
    "Europe/Berlin": ["CET", "CEST"], "Europe/Paris": ["CET", "CEST"], "Europe/Madrid": ["CET", "CEST"], "Europe/Rome": ["CET", "CEST"], "Europe/Amsterdam": ["CET", "CEST"], "Europe/Brussels": ["CET", "CEST"], "Europe/Stockholm": ["CET", "CEST"], "Europe/Oslo": ["CET", "CEST"], "Europe/Copenhagen": ["CET", "CEST"], "Europe/Warsaw": ["CET", "CEST"], "Europe/Vienna": ["CET", "CEST"], "Europe/Zurich": ["CET", "CEST"], "Europe/Prague": ["CET", "CEST"],
    "Europe/Helsinki": ["EET", "EEST"], "Europe/Athens": ["EET", "EEST"], "Europe/Kyiv": ["EET", "EEST"], "Europe/Bucharest": ["EET", "EEST"],
    "America/New_York": ["EST", "EDT"], "America/Toronto": ["EST", "EDT"], "America/Detroit": ["EST", "EDT"], "America/Chicago": ["CST", "CDT"], "America/Winnipeg": ["CST", "CDT"],
    "America/Denver": ["MST", "MDT"], "America/Edmonton": ["MST", "MDT"], "America/Phoenix": ["MST"], "America/Los_Angeles": ["PST", "PDT"], "America/Vancouver": ["PST", "PDT"],
    "America/Anchorage": ["AKST", "AKDT"], "Pacific/Honolulu": ["HST"], "America/Halifax": ["AST", "ADT"], "America/Sao_Paulo": ["BRT"], "America/Mexico_City": ["CST"],
    "Australia/Sydney": ["AEST", "AEDT"], "Australia/Melbourne": ["AEST", "AEDT"], "Australia/Brisbane": ["AEST"], "Australia/Adelaide": ["ACST", "ACDT"], "Australia/Perth": ["AWST"],
    "Pacific/Auckland": ["NZST", "NZDT"], "UTC": ["UTC"], "Etc/UTC": ["UTC"], "Etc/GMT": ["GMT"],
  };
  function utcLabel(o) {
    if (!o) return "UTC";
    const a = Math.abs(o);
    return `UTC${o > 0 ? "+" : "-"}${Math.floor(a / 60)}${a % 60 ? ":" + pad(a % 60) : ""}`;
  }
  function zoneLabel(tz, t) {
    const a = ABBR[tz];
    if (a) {
      if (a.length === 1) return a[0];
      const y = new Date(t).getUTCFullYear(), jan = offsetMin(Date.UTC(y, 0, 1), tz), jul = offsetMin(Date.UTC(y, 6, 1), tz);
      return jan !== jul && offsetMin(t, tz) === Math.max(jan, jul) ? a[1] : a[0];
    }
    try {
      const n = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(t)).find(p => p.type === "timeZoneName").value;
      if (/^[A-Z]{2,5}$/.test(n)) return n;
    } catch (e) { /* fall through */ }
    return utcLabel(offsetMin(t, tz));
  }
  const PRESET_ZONES = [["JST", "Asia/Tokyo"], ["PT", "America/Los_Angeles"], ["ET", "America/New_York"], ["UK", "Europe/London"], ["CET", "Europe/Berlin"], ["AEST", "Australia/Sydney"], ["IST", "Asia/Kolkata"]];
  const cityOf = tz => tz.split("/").pop().replace(/_/g, " ");

  // ---------- labels and formatting ----------
  const DOW_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const DOW_JA = ["日", "月", "火", "水", "木", "金", "土"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const TEXT = {
    off: { en: "OFF", ja: "おやすみ" }, offSub: { en: "No stream", ja: "配信なし" },
    tba: { en: "TBA", ja: "未定" }, tbaSub: { en: "Time to be announced", ja: "時間未定" },
  };
  function fmtTime(hhmm, clock) {
    if (clock === "24") return hhmm;
    const [h, m] = hhmm.split(":").map(Number);
    return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
  }
  function fmtTimeShort(hhmm, clock) {
    if (clock === "24") return hhmm;
    const [h, m] = hhmm.split(":").map(Number);
    return `${h % 12 || 12}${m ? ":" + pad(m) : ""}${h < 12 ? "AM" : "PM"}`;
  }
  const diffMark = (n, minus = "−") => (n > 0 ? `+${n}` : n < 0 ? `${minus}${-n}` : "");
  function dayInfo(iso) {
    const w = dow(iso), m = +iso.slice(5, 7), d = +iso.slice(8, 10);
    return { en: DOW_EN[w].toUpperCase(), short: DOW_EN[w], full: DOW_FULL[w], ja: DOW_JA[w], dateEn: `${MON[m - 1]} ${d}`, dateJa: `${m}/${d}`, d };
  }
  function weekRange(ws, labels) {
    const we = addDays(ws, 6);
    const [y1, m1, d1] = [+ws.slice(0, 4), +ws.slice(5, 7), +ws.slice(8, 10)];
    const [y2, m2, d2] = [+we.slice(0, 4), +we.slice(5, 7), +we.slice(8, 10)];
    if (labels === "ja") return y1 === y2 ? `${y1}/${m1}/${d1} – ${m2}/${d2}` : `${y1}/${m1}/${d1} – ${y2}/${m2}/${d2}`;
    if (y1 !== y2) return `${MON[m1 - 1]} ${d1}, ${y1} – ${MON[m2 - 1]} ${d2}, ${y2}`;
    if (m1 !== m2) return `${MON[m1 - 1]} ${d1} – ${MON[m2 - 1]} ${d2}, ${y1}`;
    return `${MON[m1 - 1]} ${d1} – ${d2}, ${y1}`;
  }

  // ---------- state ----------
  const THEMES = ["neon", "pastel", "clean", "retro", "minimal"];
  const SIZES = {
    landscape: { w: 1920, h: 1080, label: "1920 × 1080", hint: "Landscape · X, Discord, YouTube community posts" },
    x: { w: 1200, h: 675, label: "1200 × 675", hint: "Small landscape · X and Discord" },
    story: { w: 1080, h: 1920, label: "1080 × 1920", hint: "Stories · Instagram, TikTok, Shorts" },
    portrait: { w: 1080, h: 1350, label: "1080 × 1350", hint: "4:5 portrait · Instagram feed" },
    panel: { w: 320, h: 0, label: "320 wide", hint: "Panel · channel About sections (height fits the schedule)" },
  };
  const LIMITS = { title: 40, channel: 40, note: 90, sTitle: 60, game: 40 };
  const clip = (s, n) => String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").slice(0, n);
  const SAMPLE = [
    [{ start: "19:00", end: "21:00", title: "Chill chat & catch-up", game: "Just Chatting" }],
    "off",
    [{ start: "20:00", end: "23:00", title: "Cozy farm, year two", game: "Farming sim" }],
    "off",
    [{ start: "20:00", end: "", title: "Horror night: chapter 3", game: "Horror games" }],
    [{ start: "14:00", end: "16:00", title: "Viewer games", game: "Party games" }, { start: "21:00", end: "23:30", title: "Late-night karaoke", game: "Music" }],
    "off",
  ];
  const blankStream = () => ({ start: "", end: "", title: "", game: "" });
  const sampleDays = () => SAMPLE.map(d => (d === "off" ? { off: true, streams: [blankStream()] } : { off: false, streams: d.map(x => ({ ...x })) }));
  function defaults(o = {}) {
    const homeTz = validTz(o.homeTz) ? o.homeTz : "UTC";
    const today = o.today && isIso(o.today) ? o.today : wall(Date.now(), homeTz).date;
    return {
      v: 1, weekStart: defaultWeekStart(today, false), startSunday: false,
      title: "Stream Schedule", channel: "", note: "",
      homeTz, viewers: [], labels: "en", clock: "12", theme: "neon", accent: "", size: "landscape",
      days: sampleDays(),
    };
  }
  function cleanStream(x) {
    x = x && typeof x === "object" ? x : {};
    return { start: isTime(x.start) ? x.start : "", end: isTime(x.end) ? x.end : "", title: clip(x.title, LIMITS.sTitle), game: clip(x.game, LIMITS.game) };
  }
  function normalize(raw, o = {}) {
    const d = defaults(o);
    if (!raw || typeof raw !== "object") return d;
    const s = { ...d };
    s.startSunday = !!raw.startSunday;
    s.weekStart = isIso(raw.weekStart) ? weekStartOf(raw.weekStart, s.startSunday) : defaultWeekStart(o.today && isIso(o.today) ? o.today : wall(Date.now(), d.homeTz).date, s.startSunday);
    for (const k of ["title", "channel", "note"]) if (typeof raw[k] === "string") s[k] = clip(raw[k], LIMITS[k]);
    if (validTz(raw.homeTz)) s.homeTz = raw.homeTz;
    s.viewers = Array.isArray(raw.viewers) ? [...new Set(raw.viewers.filter(validTz))].slice(0, 3) : [];
    s.labels = ["en", "ja", "both"].includes(raw.labels) ? raw.labels : "en";
    s.clock = raw.clock === "24" ? "24" : "12";
    s.theme = THEMES.includes(raw.theme) ? raw.theme : d.theme;
    s.accent = typeof raw.accent === "string" && /^#[0-9a-f]{6}$/i.test(raw.accent) ? raw.accent.toLowerCase() : "";
    s.size = SIZES[raw.size] ? raw.size : "landscape";
    if (Array.isArray(raw.days) && raw.days.length === 7) {
      s.days = raw.days.map(day => {
        day = day && typeof day === "object" ? day : {};
        const streams = (Array.isArray(day.streams) ? day.streams : []).slice(0, 2).map(cleanStream);
        return { off: !!day.off, streams: streams.length ? streams : [blankStream()] };
      });
    }
    return s;
  }
  const clone = s => JSON.parse(JSON.stringify(s));
  // "Next week": same streams, dates 7 days later. Wall times stay put, so DST is recomputed.
  const nextWeek = s => ({ ...clone(s), weekStart: addDays(s.weekStart, 7) });
  const prevWeek = s => ({ ...clone(s), weekStart: addDays(s.weekStart, -7) });
  // Switching the first weekday keeps each weekday's streams on that weekday.
  function setStartSunday(s, sunday) {
    if (!!sunday === !!s.startSunday) return clone(s);
    const n = clone(s);
    n.startSunday = !!sunday;
    if (sunday) { n.weekStart = addDays(s.weekStart, -1); n.days = [n.days[6], ...n.days.slice(0, 6)]; }
    else { n.weekStart = addDays(s.weekStart, 1); n.days = [...n.days.slice(1), n.days[0]]; }
    return n;
  }
  const setWeekStart = (s, iso) => (isIso(iso) ? { ...clone(s), weekStart: weekStartOf(iso, s.startSunday) } : clone(s));

  const PRESETS = {
    vtuber: { theme: "pastel", labels: "both", title: "Weekly Schedule", zones: ["Asia/Tokyo", "America/Los_Angeles"], days: [
      [{ start: "20:00", end: "22:00", title: "Zatsudan: weekend talk", game: "Just Chatting" }], "off",
      [{ start: "21:00", end: "23:00", title: "Karaoke (unarchived)", game: "Singing" }], "off",
      [{ start: "20:00", end: "", title: "Collab night", game: "Party games" }],
      [{ start: "13:00", end: "15:00", title: "Morning-ish stream", game: "Cozy games" }, { start: "22:00", end: "", title: "Horror game, first play", game: "Horror" }], "off"] },
    home: { zones: ["America/New_York", "Europe/London"] },
    timezones: { theme: "minimal", zones: ["America/New_York", "Europe/London", "Asia/Tokyo"] },
    discord: { theme: "neon", zones: ["America/New_York", "Europe/London"] },
    twitch: { theme: "retro", zones: ["America/New_York", "America/Los_Angeles"] },
    youtube: { theme: "clean", zones: ["America/New_York", "Europe/London"] },
  };
  function applyPreset(s, key) {
    const p = PRESETS[key];
    if (!p) return clone(s);
    const n = clone(s);
    if (p.theme) { n.theme = p.theme; n.accent = ""; }
    if (p.labels) n.labels = p.labels;
    if (p.title) n.title = p.title;
    if (p.zones) {
      // A preset zone that is already the home zone is swapped for another common one.
      const z = p.zones.filter(t => t !== n.homeTz);
      for (const t of ["America/New_York", "Europe/London", "Asia/Tokyo", "America/Los_Angeles"]) if (z.length < p.zones.length && t !== n.homeTz && !z.includes(t)) z.push(t);
      n.viewers = z.slice(0, 3);
    }
    if (p.days) n.days = p.days.map(d => (d === "off" ? { off: true, streams: [blankStream()] } : { off: false, streams: d.map(x => ({ ...x })) }));
    return n;
  }

  // ---------- the resolved week ----------
  function computeWeek(s) {
    const viewers = s.viewers.filter(tz => tz !== s.homeTz);
    const days = [], warnings = [], items = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(s.weekStart, i), info = dayInfo(date), d = s.days[i];
      const list = [];
      if (!d.off) {
        d.streams.forEach((x, j) => {
          if (!isTime(x.start)) return;
          const st = wallToUtc(date, x.start, s.homeTz);
          const home = wall(st.t, s.homeTz);
          if (st.gap) warnings.push(`${info.short} ${info.dateEn}: ${x.start} doesn't exist in ${cityOf(s.homeTz)} that day because the clocks go forward, so it's shown as ${home.time}.`);
          let endT = null, end = "";
          if (isTime(x.end) && x.end !== x.start) {
            endT = wallToUtc(x.end > x.start ? date : addDays(date, 1), x.end, s.homeTz).t;
            if (endT > st.t) end = wall(endT, s.homeTz).time; else endT = null;
          }
          const it = {
            day: i, slot: j, date, start: home.time, startT: st.t, gap: st.gap, end, endT, icsEndT: endT || st.t + 2 * HOUR,
            title: x.title, game: x.game, homeLabel: zoneLabel(s.homeTz, st.t),
            viewers: viewers.map(tz => { const w = wall(st.t, tz); return { tz, label: zoneLabel(tz, st.t), time: w.time, diff: dayDiff(w.date, date) }; }),
          };
          list.push(it);
        });
        list.sort((a, b) => a.startT - b.startT);
      }
      items.push(...list);
      days.push({ i, date, info, off: !!d.off, tba: !d.off && !list.length, items: list });
    }
    return { days, items, warnings, viewers, range: weekRange(s.weekStart, s.labels) };
  }
  const unix = t => Math.floor(t / 1000);

  // ---------- copy texts ----------
  const mdEsc = t => String(t).replace(/([\\*_~`|>])/g, "\\$1");
  function discordText(s, wk = computeWeek(s)) {
    const L = [`**${mdEsc(s.title || "Stream Schedule")}**${s.channel ? " · " + mdEsc(s.channel) : ""}`, `${weekRange(s.weekStart, "en")} (times show in your own time zone)`, ""];
    for (const it of wk.items) {
      const u = unix(it.startT);
      const when = `<t:${u}:F>${it.endT ? ` – <t:${unix(it.endT)}:t>` : ""}`;
      const what = [it.title ? `**${mdEsc(it.title)}**` : "**Stream**", it.game ? mdEsc(it.game) : ""].filter(Boolean).join(" · ");
      L.push(`• ${when} (<t:${u}:R>) — ${what}`);
    }
    if (!wk.items.length) L.push("No streams this week.");
    const off = wk.days.filter(d => d.off).map(d => `${d.info.short} ${d.info.d}`);
    if (off.length) L.push("", `Days off: ${off.join(", ")}`);
    if (s.note) L.push("", `_${mdEsc(s.note)}_`);
    return L.join("\n");
  }
  function xDay(info, labels) {
    if (labels === "ja") return `${info.dateJa}(${info.ja})`;
    if (labels === "both") return `${info.short} ${info.d} (${info.ja})`;
    return `${info.short} ${info.d}`;
  }
  function xText(s, wk = computeWeek(s)) {
    const L = [`${s.title || "Stream Schedule"}${s.channel ? " · " + s.channel : ""}`, wk.range, ""];
    for (const d of wk.days) {
      const head = xDay(d.info, s.labels);
      if (d.off) { L.push(`${head}: ${s.labels === "ja" ? "おやすみ" : "off"}`); continue; }
      if (d.tba) { L.push(`${head}: TBA`); continue; }
      for (const it of d.items) {
        const times = [`${fmtTimeShort(it.start, s.clock)} ${it.homeLabel}`, ...it.viewers.map(v => `${fmtTimeShort(v.time, s.clock)} ${v.label}${v.diff ? " " + diffMark(v.diff, "-") : ""}`)].join(" / ");
        L.push(`${head}: ${times}${it.title || it.game ? " · " + [it.title, it.game].filter(Boolean).join(" · ") : ""}`);
      }
    }
    if (s.note) L.push("", s.note);
    return L.join("\n");
  }
  // Rough X length: CJK and emoji count double, like X's own counter.
  const xLength = t => { let n = 0; for (const ch of t) n += /[\u1100-\uffff]/.test(ch) && !/[\u2000-\u206f]/.test(ch) || ch.codePointAt(0) > 0xffff ? 2 : 1; return n; };

  // ---------- .ics (RFC 5545) ----------
  const icsEsc = t => String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const icsUtc = t => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  // Fold lines longer than 75 octets (UTF-8), never splitting a multi-byte character.
  function foldLine(line) {
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
  function hashStr(t) { let h = 2166136261; for (const ch of t) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function buildIcs(s, { now = new Date(), week = computeWeek(s) } = {}) {
    const stamp = icsUtc(now.getTime());
    const name = [s.channel, s.title || "Stream Schedule"].filter(Boolean).join(" · ");
    const id = hashStr([s.channel, s.title, s.homeTz].join("|"));
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StreamWeek//Stream Schedule 1.0//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:" + icsEsc(name)];
    for (const it of week.items) {
      const summary = (it.title || "Stream") + (s.channel ? ` (${s.channel})` : "");
      const desc = [it.game && `Category: ${it.game}`, s.note].filter(Boolean).join("\n");
      L.push("BEGIN:VEVENT", `UID:${it.date.replace(/-/g, "")}-${it.slot}-${id}@streamschedule.roohsites.com`, "DTSTAMP:" + stamp,
        "DTSTART:" + icsUtc(it.startT), "DTEND:" + icsUtc(it.icsEndT), "SUMMARY:" + icsEsc(summary));
      if (desc) L.push("DESCRIPTION:" + icsEsc(desc));
      L.push("END:VEVENT");
    }
    L.push("END:VCALENDAR");
    return L.map(foldLine).join("\r\n") + "\r\n";
  }

  return {
    SITE, DAY, toMs, fromMs, isIso, isTime, addDays, dow, dayDiff, weekStartOf, defaultWeekStart,
    validTz, wall, offsetMin, wallToUtc, zoneLabel, utcLabel, PRESET_ZONES, cityOf,
    DOW_EN, DOW_JA, TEXT, fmtTime, fmtTimeShort, diffMark, dayInfo, weekRange,
    THEMES, SIZES, LIMITS, defaults, normalize, nextWeek, prevWeek, setStartSunday, setWeekStart, blankStream, PRESETS, applyPreset,
    computeWeek, unix, discordText, xText, xLength, foldLine, buildIcs, hashStr,
  };
});
