// Unit tests for the StreamWeek core: time-zone maths, the week model, Discord / X text and .ics.
// Usage: node --test src/streamweek/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/streamweek");
const C = createRequire(import.meta.url)(join(SITE, "core.js"));
const off = () => ({ off: true, streams: [C.blankStream()] });
const week = (ws, homeTz, viewers, days) => C.normalize({ weekStart: ws, homeTz, viewers, days: [...days, ...Array(7 - days.length).fill(0).map(off)] });
const on = (...streams) => ({ off: false, streams });

test("Europe and the US on different DST: week of Mon 2026-10-26", () => {
  // UK left BST on Sun 25 Oct; the US stays on daylight time until Sun 1 Nov.
  const s = week("2026-10-26", "Europe/London", ["America/New_York", "America/Los_Angeles", "Asia/Tokyo"], [on({ start: "20:00", end: "22:00", title: "Test", game: "" })]);
  const it = C.computeWeek(s).items[0];
  assert.equal(it.startT, Date.UTC(2026, 9, 26, 20, 0));
  assert.equal(it.homeLabel, "GMT");
  assert.deepEqual(it.viewers.map(v => [v.label, v.time, v.diff]), [["EDT", "16:00", 0], ["PDT", "13:00", 0], ["JST", "05:00", 1]]);
  // One week earlier the UK is still on BST, so the same wall time is an hour earlier in UTC.
  const prev = C.computeWeek(C.prevWeek(s)).items[0];
  assert.equal(prev.startT, Date.UTC(2026, 9, 19, 19, 0));
  assert.equal(prev.homeLabel, "BST");
  assert.equal(prev.viewers[0].time, "15:00");
  // And a week later both sides are on standard time again.
  const next = C.computeWeek(C.nextWeek(s)).items[0];
  assert.deepEqual(next.viewers.map(v => [v.label, v.time]), [["EST", "15:00"], ["PST", "12:00"], ["JST", "05:00"]]);
});

test("day crossing: +1 into Asia/Tokyo and −1 out of it", () => {
  const s = week("2026-10-26", "America/Los_Angeles", ["Asia/Tokyo"], [on({ start: "19:00", end: "", title: "", game: "" })]);
  const v = C.computeWeek(s).items[0].viewers[0];
  assert.deepEqual([v.time, v.diff, v.label], ["11:00", 1, "JST"]);
  const t = week("2026-10-26", "Asia/Tokyo", ["America/Los_Angeles"], [on({ start: "10:00", end: "", title: "", game: "" })]);
  const w = C.computeWeek(t).items[0].viewers[0];
  assert.deepEqual([w.time, w.diff, w.label], ["18:00", -1, "PDT"]);
  assert.equal(C.diffMark(1), "+1");
  assert.equal(C.diffMark(-1), "−1");
});

test("spring-forward gap moves forward and warns; fall-back picks the first occurrence", () => {
  const g = C.wallToUtc("2026-03-29", "01:30", "Europe/London");
  assert.equal(g.gap, 60);
  assert.equal(C.wall(g.t, "Europe/London").time, "02:30");
  const ny = C.wallToUtc("2026-03-08", "02:30", "America/New_York");
  assert.equal(ny.gap, 60);
  assert.equal(C.wall(ny.t, "America/New_York").time, "03:30");
  // Southern hemisphere (Sydney, first Sunday of October) and a +13 zone (Auckland).
  assert.equal(C.wallToUtc("2026-10-04", "02:15", "Australia/Sydney").gap, 60);
  const ak = C.wallToUtc("2026-09-27", "02:30", "Pacific/Auckland");
  assert.equal(ak.gap, 60);
  assert.equal(C.wall(ak.t, "Pacific/Auckland").time, "03:30");
  // Ambiguous 01:30 on 25 Oct 2026 in London: first occurrence is 01:30 BST = 00:30Z.
  assert.deepEqual(C.wallToUtc("2026-10-25", "01:30", "Europe/London"), { t: Date.UTC(2026, 9, 25, 0, 30), gap: 0 });
  const s = C.normalize({ weekStart: "2026-03-23", homeTz: "Europe/London", days: [off(), off(), off(), off(), off(), off(), on({ start: "01:30", end: "", title: "", game: "" })] });
  const wk = C.computeWeek(s);
  assert.equal(wk.items[0].start, "02:30");
  assert.equal(wk.warnings.length, 1);
  assert.match(wk.warnings[0], /clocks go forward/);
});

test("Discord timestamps for a known instant", () => {
  const s = week("2026-10-26", "Europe/London", ["America/New_York"], [on({ start: "20:00", end: "22:00", title: "Chess *night*", game: "Chess" })]);
  s.note = "Times may change";
  const t = C.discordText(s);
  assert.equal(C.unix(Date.UTC(2026, 9, 26, 20)), 1793044800);
  assert.match(t, /<t:1793044800:F> – <t:1793052000:t> \(<t:1793044800:R>\) — \*\*Chess \\\*night\\\*\*\* · Chess/);
  assert.match(t, /Days off: Tue 27, Wed 28, Thu 29, Fri 30, Sat 31, Sun 1/);
  assert.match(t, /_Times may change_/);
  assert.doesNotMatch(t, /StreamWeek|roohsites/);
  const x = C.xText({ ...s, clock: "12" });
  assert.match(x, /Mon 26: 8PM GMT \/ 4PM EDT · Chess \*night\* · Chess/);
  assert.doesNotMatch(x, /StreamWeek|roohsites/);
});

test("dates: default week start, next week rolling, Sunday start", () => {
  assert.equal(C.defaultWeekStart("2026-10-16", false), "2026-10-19"); // Friday -> next Monday
  assert.equal(C.defaultWeekStart("2026-10-19", false), "2026-10-19"); // Monday -> today
  assert.equal(C.defaultWeekStart("2026-10-16", true), "2026-10-18");  // Sunday weeks
  assert.equal(C.weekStartOf("2026-10-22", false), "2026-10-19");
  const s = week("2026-12-28", "UTC", [], [on({ start: "18:00", end: "", title: "A", game: "" })]);
  const n = C.nextWeek(s);
  assert.equal(n.weekStart, "2027-01-04");
  assert.equal(n.days[0].streams[0].title, "A");
  assert.equal(C.computeWeek(n).items[0].startT - C.computeWeek(s).items[0].startT, 7 * C.DAY);
  assert.equal(C.weekRange("2026-12-28", "en"), "Dec 28, 2026 – Jan 3, 2027");
  assert.equal(C.weekRange("2026-10-26", "en"), "Oct 26 – Nov 1, 2026");
  // Switching to Sunday weeks keeps Monday's stream on Monday.
  const sun = C.setStartSunday(s, true);
  assert.equal(sun.weekStart, "2026-12-27");
  assert.equal(sun.days[1].streams[0].title, "A");
  assert.deepEqual(C.setStartSunday(sun, false).days, s.days);
  assert.equal(C.setWeekStart(s, "2026-11-05").weekStart, "2026-11-02");
});

test("end time past midnight and 2-hour default in .ics", () => {
  const s = week("2026-10-26", "Europe/London", [], [on({ start: "23:00", end: "01:00", title: "Late", game: "" }, { start: "12:00", end: "", title: "Noon", game: "" })]);
  const [a, b] = C.computeWeek(s).items;
  assert.equal(a.title, "Noon"); // sorted by start time
  assert.equal(a.icsEndT - a.startT, 2 * 3600000);
  assert.equal(b.endT - b.startT, 2 * 3600000);
  assert.equal(b.end, "01:00");
});

test(".ics: UTC times, CRLF, folding, one event per stream", () => {
  const long = "A very long stream title that keeps going 配信スケジュール";
  const s = week("2026-10-26", "America/New_York", [], [on({ start: "20:00", end: "", title: long, game: "Chess, blitz" }), off(), on({ start: "09:30", end: "11:00", title: "Morning", game: "" })]);
  s.channel = "@tester";
  const ics = C.buildIcs(s, { now: new Date(Date.UTC(2026, 9, 16, 12)) });
  assert.ok(ics.endsWith("\r\n"));
  assert.equal(ics.split("\r\n").filter(l => l && !l.startsWith(" ")).every(l => /^[A-Z-]+[:;]/.test(l)), true);
  assert.doesNotMatch(ics.replace(/\r\n/g, ""), /\n/);
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  const unfolded = ics.replace(/\r\n /g, "");
  assert.equal((unfolded.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(unfolded, /DTSTART:20261027T000000Z\r\nDTEND:20261027T020000Z/); // 20:00 EDT Monday
  assert.match(unfolded, /DTSTART:20261028T133000Z\r\nDTEND:20261028T150000Z/);
  assert.match(unfolded, new RegExp(`SUMMARY:${long} \\(@tester\\)`));
  assert.match(unfolded, /DESCRIPTION:Category: Chess\\, blitz/);
  assert.match(unfolded, /DTSTAMP:20261016T120000Z/);
  assert.doesNotMatch(unfolded, /StreamWeek ·|Made with/);
  assert.ok(ics.includes("\r\n "), "long lines are folded");
  // UIDs are stable, so re-importing the same week updates instead of duplicating.
  assert.equal(C.buildIcs(s).match(/UID:[^\r]+/g).join(), unfolded.match(/UID:[^\r]+/g).join());
});

test("normalize cleans bad input and labels zones", () => {
  const s = C.normalize({ weekStart: "2026-02-30", homeTz: "Mars/Base", viewers: ["Asia/Tokyo", "Asia/Tokyo", "Nope/Zone", "Europe/Berlin", "Asia/Kolkata", "UTC"], theme: "x", days: [{ streams: [{ start: "25:00", title: "x".repeat(200) }] }, 1, 2, 3, 4, 5, 6] }, { today: "2026-10-16" });
  assert.equal(s.homeTz, "UTC");
  assert.equal(s.weekStart, "2026-10-19");
  assert.deepEqual(s.viewers, ["Asia/Tokyo", "Europe/Berlin", "Asia/Kolkata"]);
  assert.equal(s.theme, "neon");
  assert.equal(s.days[0].streams[0].start, "");
  assert.equal(s.days[0].streams[0].title.length, C.LIMITS.sTitle);
  assert.equal(C.zoneLabel("Europe/Berlin", Date.UTC(2026, 6, 1)), "CEST");
  assert.equal(C.zoneLabel("Australia/Sydney", Date.UTC(2026, 11, 1)), "AEDT");
  assert.equal(C.zoneLabel("Asia/Kolkata", Date.UTC(2026, 0, 1)), "IST");
  assert.equal(C.utcLabel(330), "UTC+5:30");
  assert.equal(C.fmtTime("00:05", "12"), "12:05 AM");
  assert.equal(C.fmtTime("13:30", "24"), "13:30");
  const v = C.applyPreset(C.normalize({ homeTz: "Asia/Tokyo" }), "vtuber");
  assert.equal(v.theme, "pastel");
  assert.equal(v.labels, "both");
  assert.ok(!v.viewers.includes("Asia/Tokyo") && v.viewers.length === 2);
});
