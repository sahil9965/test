// Generates every BellBook page (home, /today, landing pages, about, privacy) from one layout.
// Facts that depend on dates (holidays, page counts) are computed with the same engine the tool uses.
// Usage: node src/bellbook/pages.mjs   (writes into sites/bellbook/)
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as E from "../../sites/bellbook/engine.js";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../sites/bellbook");
const URL = "https://bellbook-app.vercel.app";
const DATE = "2026-10-08", DATE_H = "8 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
const longDate = iso => E.fmtLong(E.dn(iso));

const WEBAPP = (name, url, desc) => ({
  "@type": "WebApplication", name, url, description: desc, applicationCategory: "EducationalApplication", operatingSystem: "Any (web browser)",
  browserRequirements: "Requires JavaScript", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: "MiniTools", url: `${URL}/about` },
});

const NAV_SUB = `<a href="/">Calendar</a><a href="/today">What day is it?</a><a href="/ab-day-lesson-planner">Lesson planner</a><a href="/about">About</a>`;
const NAV_HOME = `<a href="#how">How it works</a><a href="/today">What day is it?</a><a href="/ab-day-lesson-planner">Lesson planner</a><a href="#faq">FAQ</a>`;
const FOOTER = `  <footer class="site">
    <div class="cols">
      <div><h4>BellBook</h4><ul><li><a href="/">A/B day calendar generator</a></li><li><a href="/today">What day is it today?</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Calendars</h4><ul><li><a href="/rotating-schedule-calendar-maker">Rotating schedule maker</a></li><li><a href="/6-day-cycle-calendar">6-day cycle calendar</a></li><li><a href="/block-schedule-calendar">Block schedule calendar</a></li><li><a href="/teacher-planner-2027-2028">2027–28 calendar &amp; planner</a></li></ul></div>
      <div><h4>Lesson planners</h4><ul><li><a href="/ab-day-lesson-planner">A/B day lesson planner</a></li><li><a href="/second-semester-lesson-planner">Second semester planner</a></li><li><a href="/dated-lesson-plan-book">Dated lesson plan book</a></li></ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 BellBook · Free tools that respect your privacy. BellBook is not affiliated with any school district, Google, Microsoft or Apple.</p>
  </footer>`;
const RELATED = (self) => {
  const all = [["/", "A/B day calendar generator"], ["/today", "What day is it today?"], ["/rotating-schedule-calendar-maker", "Rotating schedule calendar maker"], ["/6-day-cycle-calendar", "6-day rotation calendar"], ["/block-schedule-calendar", "Block schedule calendar"], ["/ab-day-lesson-planner", "A/B day lesson planner"], ["/second-semester-lesson-planner", "Second semester lesson planner"], ["/teacher-planner-2027-2028", "Teacher planner 2027–2028"], ["/dated-lesson-plan-book", "Dated lesson plan book"]];
  return `      <ul class="related">\n${all.filter(([h]) => h !== self).map(([h, t]) => `        <li><a href="${h}">${t}</a></li>`).join("\n")}\n      </ul>`;
};

function page({ slug, title, desc, h1, lead, badges, tool, preset = "", body, faq = [], crumb, graph, home = false }) {
  const url = home ? `${URL}/` : `${URL}/${slug}`;
  const ld = { "@context": "https://schema.org", "@graph": graph };
  const toolHtml = tool === "gen"
    ? `    <section class="tool card" aria-label="A/B day calendar generator"><div id="bb-tool"${preset ? ` data-preset="${preset}"` : ""}></div><noscript><p>The calendar generator needs JavaScript. Everything runs in your browser; nothing is uploaded.</p></noscript></section>\n`
    : tool === "today" ? `    <section class="tool card" aria-label="Rotation day for today"><div id="bb-today" class="td"></div><noscript><p>This page needs JavaScript to read the calendar in the link.</p></noscript></section>\n` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#92400e">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="BellBook">
<meta property="og:title" content="${esc(title.replace(/ \| BellBook$/, ""))}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/base.css">
<link rel="stylesheet" href="/style.css">
<script src="/config.js"></script>
<script defer src="/pro.js"></script>
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
<script defer src="/_vercel/insights/script.js"></script>
<script type="application/ld+json">
${JSON.stringify(ld)}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="top">
    <a class="logo" href="/"><img src="/favicon.svg" alt="" width="28" height="28">BellBook</a>
    <nav aria-label="Main">${home ? NAV_HOME : NAV_SUB}</nav>
  </header>
  <main id="main">
${home ? "" : `    <p class="crumbs"><a href="/">BellBook</a> › ${esc(crumb || h1)}</p>\n`}    <section class="hero">
      <h1>${esc(h1)}</h1>
      <p class="lead">${lead}</p>
${badges ? `      <ul class="badges">${badges.map(b => `<li>${b}</li>`).join("")}</ul>\n` : ""}    </section>
${toolHtml}    <article class="content narrow">
${body}
${faq.length ? `      <h2 id="faq">${home ? "Frequently asked questions" : "FAQ"}</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}\n` : ""}${home || tool ? `      <h2>More rotation calendars and planners</h2>\n${RELATED(home ? "/" : "/" + slug)}\n` : ""}      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the MiniTools team. Holiday dates are US federal holidays; always check your own district's calendar.</p>
    </article>
  </main>
${FOOTER}
</div>
${tool === "gen" ? `<script type="module" src="/app.js"></script>\n` : tool === "today" ? `<script type="module" src="/today.js"></script>\n` : ""}</body>
</html>
`;
}
const faqLd = faq => ({ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
const crumbLd = (slug, name) => ({ "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "BellBook", item: `${URL}/` }, { "@type": "ListItem", position: 2, name, item: `${URL}/${slug}` }] });

// ---------- facts computed from the engine ----------
const sampleAB = E.compute(E.sample("ab"));
const six = E.compute(E.sample("six"));
const y2728 = E.compute(E.sample("y2728"));
const hol2728 = E.usHolidays("2027-07-01", "2028-06-30");
const spring27 = E.usHolidays("2027-01-01", "2027-06-30");
const sem2cfg = E.sample("sem2"), sem2Weeks = E.plannerWeeks(E.compute(sem2cfg), sem2cfg.pl.from, sem2cfg.pl.to).length;
const yearWeeks = E.plannerWeeks(sampleAB, sampleAB.cfg.start, sampleAB.cfg.end).length;
const y2728Weeks = E.plannerWeeks(y2728, y2728.cfg.start, y2728.cfg.end).length;
function easter(y) { // Anonymous Gregorian algorithm
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return E.iso(E.fromYMD(y, month - 1, day));
}
// The worked snow-day example used on several pages (Mon Nov 30 – Mon Dec 7, 2026, snow day on Wed Dec 2)
const ex = (m) => { const r = E.compute(E.normalize({ start: "2026-11-30", end: "2026-12-07", type: "ab", ev: m ? [{ t: "closed", s: "2026-12-02", n: "Snow day", m }] : [] })); return r.days.filter(d => d.kind !== "weekend").map(d => d.label || "Snow day"); };
const exRows = (() => {
  const a = ex(null), c = ex("continue"), s = ex("skip");
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Next Monday"];
  return names.map((n, i) => `<tr><td>${n}</td><td>${a[i]}</td><td>${c[i] === "Snow day" ? "<em>Snow day</em>" : c[i]}</td><td>${s[i] === "Snow day" ? `<em>Snow day (${a[i]} skipped)</em>` : s[i]}</td></tr>`).join("");
})();
const SNOW_TABLE = `      <table><thead><tr><th>School day</th><th>Original</th><th>Rotation continues</th><th>Skip the day's letter</th></tr></thead><tbody>${exRows}</tbody></table>`;

// ---------- pages ----------
const pages = [];

// HOME
{
  const faq = [
    ["Is BellBook really free?", "Yes. Every feature is free: unlimited calendars, PDF downloads, .ics export, the share link, the dated lesson planner and the class roster pages. There's no account and no paid tier."],
    ["What happens to the rotation after a snow day?", "You choose. <strong>Rotation continues</strong> means the next school day takes the letter the snow day would have had, so every later day shifts by one. <strong>Skip the day's letter</strong> means the snow day's letter is lost and every other date keeps its original letter. BellBook re-letters the rest of the year instantly either way."],
    ["Does it skip weekends and holidays automatically?", "Yes. Weekends never get a rotation day. Add US federal holidays with one click, then add your district's breaks (Thanksgiving, winter and spring break) and teacher workdays. The rotation pauses on every day off and picks up on the next school day."],
    ["Can I make a Day 1–6 or A/B/C calendar?", "Yes. Choose A/B, A/B/C, A/B/C/D, Odd/Even, a Day 1–N cycle of 2 to 10 days, or your own labels such as Red/White/Blue. You can also fix a weekday to one label, for example Monday as an all-classes day."],
    ["How do I put the A/B days into Google Calendar?", "Download the .ics file, create a new calendar in Google Calendar (Settings → Add calendar → Create new calendar), then use Settings → Import &amp; export → Import and choose that calendar. Outlook and Apple Calendar can import the same file."],
    ["How do students find out if today is an A day or a B day?", "Copy the “What day is it?” link and post it on your website, in Google Classroom or in an email. It opens a page that shows today's rotation day, tomorrow's and the next two weeks, using the viewer's own date."],
    ["Is my school's calendar uploaded anywhere?", "No. BellBook runs entirely in your browser. Calendars you save stay in your browser's local storage, and the share link carries the calendar inside the link itself, after the # sign, which browsers don't send to servers."],
  ];
  const steps = [
    ["Enter the school year", "Type the first and last day of school and, if you like, a title and your school's name."],
    ["Pick the rotation", "Choose A/B, A/B/C, a Day 1–N cycle or custom labels, and which label the first school day gets."],
    ["Add days off", "Add US federal holidays with one click, then your district's breaks and teacher workdays."],
    ["Mark snow days", "Click any date to mark a closure and choose whether the rotation continues or that day's letter is skipped."],
    ["Print or share", "Download a PDF calendar, an .ics file for Google or Outlook Calendar, or copy a “What day is it?” link for students."],
  ];
  pages.push({
    slug: "index", home: true, tool: "gen",
    title: "A/B Day Calendar Generator – Free Rotation Calendar | BellBook",
    desc: "Free A/B day calendar generator. Make A/B, Day 1–6 and block schedule calendars that skip holidays and re-flow after snow days. PDF, .ics, no signup.",
    h1: "A/B Day Calendar Generator",
    lead: "Make a printable A/B, Day 1–6 or block schedule calendar that skips weekends and holidays and re-letters itself after snow days. Free, no signup, and nothing leaves your browser.",
    badges: ["100% free", "No signup", "Snow-day re-flow", "PDF, .ics &amp; share link"],
    body: `      <p class="tldr"><strong>Quick answer:</strong> To make an A/B day calendar, enter the first and last day of school, choose the rotation (A/B, A/B/C or Day 1–N), and add your holidays and breaks. BellBook labels every school day for you and skips weekends and days off. When a snow day closes school, click that date and choose whether the rotation continues or the day's letter is skipped. The rest of the year updates instantly. Then download a PDF, add the days to Google or Outlook Calendar, or share a “What day is it?” link.</p>

      <h2 id="how">How to make an A/B day calendar in 5 steps</h2>
      <ol class="steps">
${steps.map(([n, t]) => `        <li><strong>${n}.</strong> ${t}</li>`).join("\n")}
      </ol>
      <p>The example above is a ${E.fmtMDY(sampleAB.first)} to ${E.fmtMDY(sampleAB.last)} school year with US federal holidays and typical Thanksgiving, winter and spring breaks. It has ${sampleAB.schoolDays} school days: ${sampleAB.counts.map(c => `${c.count} ${c.long}s`).join(" and ")}. Replace the dates with your district's calendar before you print.</p>

      <h2>How rotation days are counted</h2>
      <p>BellBook walks through the school year one date at a time and applies the same rules a scheduler would:</p>
      <ul>
        <li><strong>Weekends</strong> never get a rotation day. Saturday school is possible: set Saturday to “Rotates” in the weekday pattern, or mark a single Saturday as a make-up day.</li>
        <li><strong>Holidays, breaks and teacher workdays</strong> pause the rotation. If Friday is an A day and Monday is a holiday, Tuesday is the B day.</li>
        <li><strong>Fixed weekdays</strong> such as “Monday = all classes” get their own label and don't move the rotation, which is how many modified block schedules work.</li>
        <li><strong>No-rotation days</strong> (final exams, testing, assemblies) are school days without a letter. The rotation picks up afterwards.</li>
        <li><strong>Rotation resets</strong> let you force a date to a label (“Monday will be an A day”) when your school re-syncs the cycle.</li>
      </ul>

      <h2>Snow days: “rotation continues” or “skip the day”?</h2>
      <p>Schools handle unexpected closures in one of two ways, and BellBook supports both for every closure. Here is the same week with a snow day on Wednesday:</p>
${SNOW_TABLE}
      <p><strong>Rotation continues</strong> keeps the A and B day counts balanced, so every class meets about the same number of times. <strong>Skip the day's letter</strong> keeps every date on the printed calendar correct, so nothing needs to be reprinted. Check which rule your district uses. If it changes its mind mid-year, add a rotation reset on the day it re-syncs.</p>

      <h2>Rotation types you can make</h2>
      <table>
        <thead><tr><th>Rotation</th><th>Labels</th><th>Typical use</th></tr></thead>
        <tbody>
          <tr><td>A/B days</td><td>A, B</td><td>Alternating block schedules: half the classes meet each day for a longer period</td></tr>
          <tr><td>A/B/C or A/B/C/D</td><td>A, B, C (D)</td><td>Three- or four-day rotations, often for specials or lab sections</td></tr>
          <tr><td>Day 1–N cycle</td><td>Day 1 … Day N (2–10)</td><td><a href="/6-day-cycle-calendar">6-day cycles</a> for elementary specials, drop rotations in middle and high school</td></tr>
          <tr><td>Odd/Even</td><td>Odd, Even</td><td>Block schedules named after the periods that meet (1, 3, 5, 7 or 2, 4, 6, 8)</td></tr>
          <tr><td>Custom labels</td><td>Anything, e.g. Red, White, Blue</td><td>Schools that name rotation days after colours or houses</td></tr>
          <tr><td>Fixed weekday + rotation</td><td>e.g. Monday “All classes”, then A/B</td><td><a href="/block-schedule-calendar">Modified block schedules</a> with a skinny or all-period day</td></tr>
        </tbody>
      </table>

      <h2>Three ways to share the calendar</h2>
      <h3>Printable PDF</h3>
      <p>Download a one-page year at a glance (every month with each day's label, plus a list of days off), monthly pages with large day labels and room for notes, or both. Choose US Letter or A4, Sunday or Monday week starts, and an ink-saving black-and-white version.</p>
      <h3>Google, Outlook and Apple Calendar (.ics)</h3>
      <p>The .ics file adds one all-day event per school day, titled “A Day” or “Day 3”, plus your holidays and closures. Import it into a separate calendar, such as “Rotation days”. After a snow day you can then delete that one calendar and import the updated file without touching anything else.</p>
      <h3>“What day is it today?” link</h3>
      <p>The share link opens a page that tells students and parents today's rotation day and the next two weeks. The whole calendar is packed into the link, so there's no account and nothing to host. After a snow day, update the calendar and share the new link. See <a href="/today">what the link looks like</a>.</p>

      <h2>A dated lesson planner that follows the rotation</h2>
      <p>Below the calendar you can also print a dated lesson planner: weekly pages with each date, its rotation day and the classes that meet that day already filled in, plus monthly calendars. Choose up to 10 periods or blocks, set different classes for A and B days, and print 4 weeks, a semester or the whole year. Read more about the <a href="/ab-day-lesson-planner">A/B day lesson planner</a> or the <a href="/dated-lesson-plan-book">dated lesson plan book for schools without a rotation</a>.</p>

      <h2>Class pages from your roster</h2>
      <p>Paste a class list to print an attendance sheet with one column for each day that class actually meets. A class that meets only on A days gets only A-day dates. You also get a gradebook, a seating chart and a family contact sheet. Click any school day in the calendar for a one-page substitute plan with that day's blocks and classes. Student names stay in the open tab and are never saved or uploaded.</p>

      <h2>Why not just use a spreadsheet?</h2>
      <p>A spreadsheet works until the first snow day. Then every later cell needs retyping, and a single missed holiday puts the rest of the year out of sync. BellBook stores the rules (the start date, the rotation, the days off and the closures) instead of the letters, so changing one date re-letters the year correctly. You can still download a spreadsheet (.csv) of every school day if your office needs one.</p>`,
    faq,
    graph: [
      { ...WEBAPP("BellBook", `${URL}/`, "Free A/B day and rotating schedule calendar generator. Skips weekends and holidays, re-flows after snow days, and exports PDF, .ics and a share link."),
        featureList: ["A/B, A/B/C, Day 1–N and custom rotations", "US federal holidays", "Snow-day re-flow (continue or skip)", "Rotation resets and no-rotation days", "Printable year-at-a-glance and monthly PDF", ".ics export for Google, Outlook and Apple Calendar", "“What day is it today?” share link", "Dated lesson planner up to 10 periods", "Attendance sheets dated by class meeting", "Gradebook, seating chart and family contact sheets", "One-page substitute plan for any school day", "No signup"] },
      { "@type": "HowTo", name: "How to make an A/B day calendar", totalTime: "PT5M", step: steps.map(([name, text]) => ({ "@type": "HowToStep", name, text })) },
      faqLd(faq),
    ],
  });
}

// TODAY
{
  const faq = [
    ["How does the page know which day it is?", "It uses the date on the device you open it with, so a student in any time zone sees their own local date. The rotation is worked out from the calendar packed into the link."],
    ["Where do I get the link for my school?", "Ask the teacher or office that publishes your rotation calendar. Teachers and admins can make one for free with the <a href=\"/\">A/B day calendar generator</a> by clicking “Copy ‘What day is it?’ link”."],
    ["Does the link still work after a snow day?", "Only if the calendar was updated. Whoever made the link should mark the snow day in BellBook and share the new link, because each link holds a fixed copy of the calendar."],
    ["Is any information sent to a server?", "No. The calendar sits after the # in the link, and browsers never send that part to the server. The page reads it on your device."],
  ];
  pages.push({
    slug: "today", tool: "today", crumb: "What day is it today?",
    title: "Is Today an A Day or B Day? Rotation Day Checker | BellBook",
    desc: "See whether today is an A day or a B day (or Day 1–6) from your school's BellBook link, plus tomorrow and the next two weeks. Free, private, no app.",
    h1: "Is today an A day or B day?",
    lead: "Open your school's BellBook link to see today's rotation day, tomorrow's and the next two weeks. No app and no account.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> If your school runs an A/B or rotating-day schedule, today's letter depends on how many school days have passed since the first day, not on the date itself. Holidays, breaks and snow days all change it. Open the BellBook link your school or teacher shared and it shows today's rotation day straight away. Without a link, the page above shows an example calendar.</p>

      <h2>Why you can't tell from the date</h2>
      <p>On an A/B schedule the days alternate A, B, A, B, but only on school days. A three-day weekend, a teacher workday or a snow day stops the count, so a Monday can be an A day one week and a B day the next. That's why a printed list or a calendar that knows the days off is more reliable than guessing from the weekday.</p>

      <h2>How teachers and schools make a link</h2>
      <ol class="steps">
        <li><strong>Build the calendar.</strong> Enter the school year, the rotation and the days off in the <a href="/">A/B day calendar generator</a>.</li>
        <li><strong>Copy the link.</strong> Click “Copy ‘What day is it?’ link”. The whole calendar is packed into the link.</li>
        <li><strong>Share it.</strong> Post it on the school website, pin it in Google Classroom, add it to a newsletter or save it to a phone's home screen.</li>
        <li><strong>Update after closures.</strong> After a snow day, mark it in BellBook and share the new link. Old links keep showing the old calendar.</li>
      </ol>

      <h2>What the page shows</h2>
      <table>
        <thead><tr><th>Situation</th><th>What you see</th></tr></thead>
        <tbody>
          <tr><td>A school day</td><td>Today's label in large type (for example “B Day” or “Day 4”) and tomorrow's label</td></tr>
          <tr><td>A weekend, holiday or snow day</td><td>“No school”, the reason, and the next school day with its label</td></tr>
          <tr><td>Before the first day of school</td><td>The first day of school and the label it starts with</td></tr>
          <tr><td>After the last day</td><td>The last day of the school year</td></tr>
        </tbody>
      </table>
      <p>Below that is a list of the next 10 school days with their labels. You can check any other date with the date box, or add the whole rotation to your own calendar with the .ics button. Both work on phones.</p>

      <h2>Private by design</h2>
      <p>The calendar travels inside the link after the # sign. Browsers don't send that part to servers, so BellBook never receives your school's calendar or anything else about you. The page counts visits with cookie-free analytics only.</p>`,
    faq,
    graph: [crumbLd("today", "What day is it today?"), WEBAPP("What day is it today? (BellBook)", `${URL}/today`, "Shows today's A/B or rotation day from a school's shared BellBook link."), faqLd(faq)],
  });
}

// ROTATING SCHEDULE CALENDAR MAKER
{
  const faq = [
    ["What is a rotating schedule in school?", "A rotating schedule changes which classes meet, or in what order, from one school day to the next, following a repeating cycle such as A/B or Day 1–6. The cycle counts school days, not weekdays, so holidays and closures push it back."],
    ["How do I make a rotating schedule calendar for free?", "Enter the first and last day of school, choose the cycle (for example Day 1–4), add holidays and breaks, and download the PDF. BellBook is free with no signup."],
    ["Can the rotation restart on a specific date?", "Yes. Add a rotation reset (or click the date and choose “Make this day”) and that date gets the label you pick, with the cycle continuing from there. Schools often re-sync at the start of a semester."],
    ["Can I have a different label on some weekdays?", "Yes. In the weekday pattern, set a weekday to a fixed label, such as Wednesday = “Late start”. Fixed days don't use up a rotation day."],
  ];
  pages.push({
    slug: "rotating-schedule-calendar-maker", tool: "gen", preset: "rotating", crumb: "Rotating schedule calendar maker",
    title: "Rotating Schedule Calendar Maker – Free, Skips Holidays",
    desc: "Free rotating schedule calendar maker for schools. Day 1–N cycles, A/B/C days and custom labels that skip holidays and re-flow after snow days. Print as PDF.",
    h1: "Rotating Schedule Calendar Maker",
    lead: "Build a school calendar for any rotating cycle, from Day 1–4 to Day 1–10 or your own labels. Holidays pause the cycle and snow days re-flow it automatically.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A rotating schedule calendar labels each school day with its place in the cycle, such as Day 1, Day 2, Day 3, Day 4, then Day 1 again, skipping weekends and days off. Enter your first and last day, pick the cycle length, add your holidays, and BellBook labels the whole year. The example above uses a 4-day cycle.</p>

      <h2>Common rotating schedules</h2>
      <table>
        <thead><tr><th>Schedule</th><th>How it rotates</th><th>Set it up in BellBook</th></tr></thead>
        <tbody>
          <tr><td>A/B (alternating day)</td><td>Two days alternate; each class meets every other day</td><td>Rotation type: A/B days</td></tr>
          <tr><td>Day 1–N cycle</td><td>A numbered cycle of N school days (4, 5, 6, 7 or 8 are common)</td><td>Rotation type: Day 1–N cycle, then the number of days</td></tr>
          <tr><td>Drop rotation</td><td>Each day one or more periods “drop” and the order shifts; the day number tells you which</td><td>Day 1–N cycle, with each day's classes in the lesson planner</td></tr>
          <tr><td>Fixed day + rotation</td><td>One weekday is always the same (all classes, late start), the others rotate</td><td>Weekday pattern: set that weekday to a fixed label</td></tr>
          <tr><td>Named days</td><td>Colours, houses or letters, e.g. Red/White/Blue</td><td>Rotation type: Custom labels</td></tr>
        </tbody>
      </table>

      <h2>How to make a rotating schedule calendar</h2>
      <ol class="steps">
        <li><strong>Set the school year.</strong> Enter the first and last day of school.</li>
        <li><strong>Choose the cycle.</strong> Pick Day 1–N and the number of days, or type your own labels in order.</li>
        <li><strong>Choose the starting day.</strong> Most schools start on Day 1. If your year starts mid-cycle, pick the right label for the first school day.</li>
        <li><strong>Add days off.</strong> Add US federal holidays and your district's breaks. The cycle pauses on each one.</li>
        <li><strong>Handle surprises.</strong> Click a date to mark a snow day, an exam day without a rotation, or a reset that forces a date to a given day.</li>
        <li><strong>Publish it.</strong> Print the PDF, import the .ics into a shared Google Calendar, or share the “What day is it?” link.</li>
      </ol>

      <h2>Why a generator beats a hand-made calendar</h2>
      <p>A rotating schedule is easy to count forward and easy to get wrong. One forgotten teacher workday or snow day shifts every later label, and fixing it by hand means retyping the rest of the year. BellBook keeps the rules instead of the labels, so you change one date and every later day is re-labelled. Before you confirm, it tells you how many days changed. It also shows the total number of times each day occurs (for example how many Day 3s there are), which helps you check that each class meets about the same number of times.</p>

      <h2>Snow days on a rotating schedule</h2>
      <p>Each closure can either let the rotation continue (the next school day takes the closed day's label) or skip the closed day's label (every other date keeps its label). This is the same choice on an A/B schedule:</p>
${SNOW_TABLE}
      <p>On longer cycles the difference matters more: skipping a day in a 6-day cycle means one class misses a meeting until the cycle comes round again.</p>`,
    faq,
    graph: [crumbLd("rotating-schedule-calendar-maker", "Rotating schedule calendar maker"), WEBAPP("Rotating schedule calendar maker", `${URL}/rotating-schedule-calendar-maker`, "Make a school calendar for any rotating day cycle that skips holidays and re-flows after closures."), faqLd(faq)],
  });
}

// 6-DAY CYCLE
{
  const first10 = E.compute(E.normalize({ ...E.sample("six"), end: "2026-08-28" })).days.filter(d => d.school).map(d => `<td>${E.WD3[d.w]}<br>Day ${d.label}</td>`);
  const faq = [
    ["What is a 6-day rotation?", "It's a schedule where school days are numbered Day 1 to Day 6 and then start again at Day 1. Because a school week has five days, each Day number falls on a different weekday from one week to the next."],
    ["How many times does each day come up in a school year?", `It depends on the number of school days. In the example 2026–27 year with ${six.schoolDays} school days, each Day number comes up ${Math.min(...six.counts.map(c => c.count))} or ${Math.max(...six.counts.map(c => c.count))} times. BellBook shows the exact count for your calendar above the preview.`],
    ["What happens to Day 1–6 on a holiday?", "Nothing is used up: the cycle pauses and the next school day gets the next Day number. If the day before the holiday was Day 4, the day after is Day 5."],
    ["Can I make a 4-, 5-, 7- or 8-day cycle instead?", "Yes. Choose Day 1–N cycle and any length from 2 to 10 days."],
  ];
  pages.push({
    slug: "6-day-cycle-calendar", tool: "gen", preset: "six", crumb: "6-day rotation calendar",
    title: "6 Day Rotation Calendar Maker – Day 1–6 Cycle, Free PDF",
    desc: "Make a 6 day rotation calendar for your school year. Day 1–6 labels skip weekends and holidays, re-flow after snow days, and print as PDF or export to Google.",
    h1: "6-Day Rotation Calendar (Day 1–6 Cycle)",
    lead: "Number every school day from Day 1 to Day 6, skipping weekends, holidays and closures. Print it, put it in Google Calendar or share a link.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> In a 6-day cycle, school days are numbered Day 1 to Day 6 in order and then repeat, ignoring weekends and days off. The first two weeks of school go Day 1–5, then Day 6 on the second Monday, then Day 1 again. Enter your school year above and BellBook numbers every day for you, including after holidays and snow days.</p>

      <h2>How a Day 1–6 cycle lines up with the week</h2>
      <p>Because there are six days in the cycle but five days in a school week, the Day numbers drift across the weekdays. Here are the first ten school days of the example year:</p>
      <table><tbody><tr>${first10.slice(0, 5).join("")}</tr><tr>${first10.slice(5, 10).join("")}</tr></tbody></table>
      <p>That drift is why families and students lose track. A printed calendar or a “What day is it?” link avoids the guesswork.</p>

      <h2>Where 6-day cycles are used</h2>
      <ul>
        <li><strong>Elementary specials.</strong> Art, music, PE, library, STEM and a second PE or computer slot each take one day of the cycle, so each class sees each specialist once per cycle.</li>
        <li><strong>Middle and high school drop rotations.</strong> Six or seven classes rotate through the day's periods in a different order on each Day number.</li>
        <li><strong>Lab and section rotations</strong> where six groups share a room or a resource.</li>
      </ul>

      <h2>Counting Day 1–6 across the school year</h2>
      <p>BellBook shows how many times each Day number occurs, which is useful for planning a specials curriculum. In the example year above (${E.fmtMDY(six.first)} to ${E.fmtMDY(six.last)}, ${six.schoolDays} school days) the counts are:</p>
      <table><thead><tr>${six.counts.map(c => `<th>${c.long}</th>`).join("")}</tr></thead><tbody><tr>${six.counts.map(c => `<td>${c.count}</td>`).join("")}</tr></tbody></table>
      <p>If the counts matter for your program, compare the two snow-day rules. “Rotation continues” keeps the counts even, while “skip the day” means one Day number loses a meeting for each closure.</p>

      <h2>Make your 6-day rotation calendar</h2>
      <ol class="steps">
        <li>Enter the first and last day of school.</li>
        <li>Keep the rotation at <em>Day 1–N cycle</em> with 6 days, and choose which day the year starts on.</li>
        <li>Add federal holidays and your breaks, plus any teacher workdays.</li>
        <li>Download the PDF: a year-at-a-glance page for the office and monthly pages for classroom doors.</li>
        <li>Optional: add each day's classes in the lesson planner to print dated plan pages that follow the cycle.</li>
      </ol>`,
    faq,
    graph: [crumbLd("6-day-cycle-calendar", "6-day rotation calendar"), WEBAPP("6-day rotation calendar maker", `${URL}/6-day-cycle-calendar`, "Make a Day 1–6 cycle school calendar that skips holidays and re-flows after snow days."), faqLd(faq)],
  });
}

// BLOCK SCHEDULE
{
  const blk = E.compute(E.sample("block"));
  const wk = blk.days.filter(d => d.iso >= "2026-08-24" && d.iso <= "2026-09-04" && d.kind !== "weekend").map(d => `<td>${E.WD3[d.w]} ${E.fmtMD(d.n)}<br><strong>${E.longLabel(blk.cfg, d)}</strong></td>`);
  const faq = [
    ["What is an A/B block schedule?", "Students take about eight classes but only four meet each day, in longer blocks of roughly 80 to 95 minutes. Classes alternate between A days and B days, so each one meets every other school day."],
    ["How do I make Monday an all-classes day?", "Open “Weekday pattern” and set Monday to a fixed label such as “All classes”. Tuesday to Friday keep rotating A/B, and Monday doesn't use up an A or B day."],
    ["Does a 4×4 block schedule need a rotation calendar?", "Usually not, because the same four classes meet every day for a semester. Choose “No rotation (dates only)” to print a dated school calendar with your holidays, or use the dated lesson planner."],
    ["Can I print a block schedule calendar on A4?", "Yes. Choose A4 or US Letter under Printable calendar. Both the year-at-a-glance page and the monthly pages resize to fit."],
  ];
  pages.push({
    slug: "block-schedule-calendar", tool: "gen", preset: "block", crumb: "Block schedule calendar",
    title: "Block Schedule Calendar Template – A/B Days, Free Printable",
    desc: "Free block schedule calendar template with A/B block days and an optional all-classes Monday. Skips holidays and re-flows after snow days. Print a PDF.",
    h1: "Block Schedule Calendar Template",
    lead: "A printable calendar for A/B block schedules, including modified blocks with an all-classes day. Fill in your dates and it updates itself.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A block schedule calendar marks each school day as an A day or a B day so students know which set of blocks meets. Many schools also keep one weekday, often Monday, as an all-classes day. The example above does exactly that: Monday is “All classes” and Tuesday to Friday alternate A and B, skipping holidays.</p>

      <h2>Types of block schedules</h2>
      <table>
        <thead><tr><th>Block schedule</th><th>What meets</th><th>Calendar you need</th></tr></thead>
        <tbody>
          <tr><td>A/B block (alternating)</td><td>Half the classes on A days, the other half on B days</td><td>A/B rotation calendar</td></tr>
          <tr><td>Modified block</td><td>One weekday with all classes in short periods; A/B blocks the rest of the week</td><td>A/B rotation with a fixed weekday</td></tr>
          <tr><td>4×4 block</td><td>Four long classes every day, new classes each semester</td><td>Dated calendar, no rotation</td></tr>
          <tr><td>Odd/even block</td><td>Odd periods (1, 3, 5, 7) one day, even periods the next</td><td>Odd/Even rotation</td></tr>
        </tbody>
      </table>

      <h2>Example: a modified block schedule</h2>
      <p>With Monday fixed as “All classes”, the A/B rotation only counts Tuesday to Friday. Here are two weeks of the example year, including the Labor Day holiday:</p>
      <table><tbody><tr>${wk.slice(0, 5).join("")}</tr><tr>${wk.slice(5, 10).join("")}</tr></tbody></table>
      <p>Because Monday is fixed, a Monday holiday doesn't change the A/B order at all, while a Tuesday-to-Friday closure follows your snow-day rule.</p>

      <h2>How to set up your block schedule calendar</h2>
      <ol class="steps">
        <li>Enter your first and last day of school.</li>
        <li>Choose <em>A/B days</em> (or <em>Odd/Even</em>, or custom labels such as Blue/Gold).</li>
        <li>For a modified block, open <em>Weekday pattern</em> and set the all-classes day to a fixed label.</li>
        <li>Add holidays, breaks, and early-release or testing days. Testing days can be school days with no rotation.</li>
        <li>Print the year at a glance for the front office and monthly pages for classrooms, or share the link with families.</li>
      </ol>

      <h2>Teachers: plan by block, not by date</h2>
      <p>The lesson planner under the calendar prints weekly pages with your A-day and B-day classes in the right blocks, and the all-classes day lists every class. When a snow day shifts the rotation, regenerate the planner and the classes move with it.</p>`,
    faq,
    graph: [crumbLd("block-schedule-calendar", "Block schedule calendar"), WEBAPP("Block schedule calendar template", `${URL}/block-schedule-calendar`, "Printable A/B block schedule calendar with an optional all-classes weekday."), faqLd(faq)],
  });
}

// A/B DAY LESSON PLANNER
{
  const faq = [
    ["What is an A/B day lesson planner?", "It's a plan book whose pages are dated and marked with each day's rotation letter, with the right classes printed in the right blocks. You don't have to work out which classes meet on which date."],
    ["How many periods can the planner have?", "Up to 10 periods or blocks, each with an optional time. Different classes can meet on A and B days, and fixed days such as an all-classes Monday get their own list."],
    ["Can I use it in GoodNotes or Notability?", "Yes. Tick “Clickable month tabs” to add month tabs down the side. Month pages link to their weeks and week pages link back. The links work in PDF apps that support them, including GoodNotes and Notability."],
    ["What if a snow day changes the rotation?", "Mark the snow day in the calendar and download the planner again. Every page after the closure gets the new letters and classes. If you've already written in a printed copy, print only the weeks you need with the From and To dates."],
  ];
  pages.push({
    slug: "ab-day-lesson-planner", tool: "gen", preset: "planner", crumb: "A/B day lesson planner",
    title: "A/B Day Lesson Planner – Free Printable, Dated by Block",
    desc: "Free printable A/B day lesson planner. Every week is dated with A and B days and your classes in the right blocks. Snow days re-flow it. Letter or A4 PDF.",
    h1: "A/B Day Lesson Planner",
    lead: "A printable, dated lesson planner that knows your A/B rotation. Each weekly page shows the date, the letter day and the classes that meet in each block.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Set up your school year and A/B rotation, list your blocks, type the classes that meet on A days and on B days, choose the dates, and download the PDF. Each weekly page is dated and labelled “A Day” or “B Day”, with your classes printed in the right blocks and lined space to plan. Holidays and breaks are greyed out. Everything is free.</p>

      <h2>What's in the planner PDF</h2>
      <table>
        <thead><tr><th>Page</th><th>What it shows</th></tr></thead>
        <tbody>
          <tr><td>Cover and contents</td><td>Your title, name, school and dates, with a clickable “jump to” button for each month</td></tr>
          <tr><td>My schedule</td><td>Your blocks and times, with the classes for A days, B days and any fixed day side by side</td></tr>
          <tr><td>Monthly calendar</td><td>The whole month with each day's letter, holidays and notes. Every day links to its week</td></tr>
          <tr><td>Weekly plan pages</td><td>Monday to Friday columns, one row per block, each day's letter and the class in each block, with lined writing space</td></tr>
        </tbody>
      </table>
      <p>A full ${E.parts(sampleAB.s).y}–${String(E.parts(sampleAB.e).y).slice(2)} school year like the example is ${yearWeeks} weekly pages plus 10 monthly pages. Pick <em>Next 4 weeks</em> to print just the coming month.</p>

      <h2>How to make your A/B day lesson planner</h2>
      <ol class="steps">
        <li><strong>Check the calendar.</strong> Enter your first and last day, A/B rotation, holidays and breaks (further down this page).</li>
        <li><strong>List your blocks.</strong> Name each block or period and add its time, for example “Block 1, 8:00–9:30”.</li>
        <li><strong>Fill in A-day and B-day classes.</strong> Click <em>A Day</em> and type the class for each block, then do the same for <em>B Day</em>. Leave planning periods blank or type “Planning”.</li>
        <li><strong>Choose dates and pages.</strong> Next 4 weeks, a semester or the whole year, with or without the cover and monthly pages.</li>
        <li><strong>Download and print.</strong> Print double-sided and hole-punch it for a binder, or open it in a PDF annotation app.</li>
      </ol>

      <h2>Why a dated, rotation-aware planner helps</h2>
      <p>Undated plan books mean writing the dates, the letter day and each block's class into every square, then crossing it all out when a snow day shifts the rotation. Generated pages get the dates and letters right from the calendar, show holidays before you plan a lesson for them, and can be reprinted from any week after the schedule changes.</p>

      <h2>Attendance sheets that follow the rotation</h2>
      <p>Under the planner, <em>Class pages from a roster</em> turns a pasted class list into an attendance sheet whose columns are the dates that section actually meets. Choose “Algebra 1 · A Day, Block 1” and you get only A-day dates, already adjusted for holidays and snow days, plus a gradebook, a seating chart and a family contact sheet. Names are never saved or uploaded. For a planned absence, click the day in the calendar and download a one-page substitute plan with that day's blocks and classes.</p>

      <h2>Teaching on a block with an all-classes day?</h2>
      <p>If Monday (or another day) is an all-classes day, set it as a fixed weekday in the calendar. The planner then adds an <em>All classes</em> tab so you can list the shorter periods for that day. See the <a href="/block-schedule-calendar">block schedule calendar</a> for an example.</p>`,
    faq,
    graph: [crumbLd("ab-day-lesson-planner", "A/B day lesson planner"), WEBAPP("A/B day lesson planner", `${URL}/ab-day-lesson-planner`, "Printable dated lesson planner that follows an A/B day rotation."), faqLd(faq)],
  });
}

// SECOND SEMESTER
{
  const faq = [
    ["When does the second semester start?", "It depends on the district. Many US high schools start the spring semester in mid to late January, after winter break and final exams. Type your own date into “Second semester starts” and click Semester 2."],
    ["Can I print just January to May?", "Yes. Set the From and To dates, or click Semester 2, and the planner contains only those weeks and months."],
    ["Does it include spring break?", "It includes whatever breaks you add to the calendar. Spring break dates vary by district, so add yours under Holidays and breaks and those weeks appear greyed out."],
    ["Is the second semester planner free?", "Yes, like everything on BellBook. No signup and no watermark beyond a small footer credit."],
  ];
  pages.push({
    slug: "second-semester-lesson-planner", tool: "gen", preset: "sem2", crumb: "Second semester lesson planner",
    title: "Second Semester Lesson Planner – Free Printable, Dated 2027",
    desc: "Free printable second semester lesson planner for January to June 2027. Dated weekly pages with your periods, A/B days, holidays and breaks. Letter or A4 PDF.",
    h1: "Second Semester Lesson Planner",
    lead: "Dated weekly lesson-plan pages for the spring 2027 semester, with your periods, your rotation days and every holiday already marked.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Enter your school year and the date the second semester starts, then click <em>Semester 2</em> in the lesson planner and download the PDF. The example runs from ${E.fmtMDY(E.dn(sem2cfg.pl.from))} to ${E.fmtMDY(E.dn(sem2cfg.pl.to))}: ${sem2Weeks} dated weekly pages plus monthly calendars, with A and B days and your classes filled in.</p>

      <h2>Spring 2027 dates to plan around</h2>
      <p>These US federal holidays fall in the first half of 2027. Your district may add its own days off.</p>
      <table>
        <thead><tr><th>Date</th><th>Holiday</th></tr></thead>
        <tbody>
${spring27.map(h => `          <tr><td>${longDate(h.date)}</td><td>${h.name}</td></tr>`).join("\n")}
        </tbody>
      </table>
      <p>Spring break isn't a federal holiday, so dates vary. Some districts tie it to Easter, which falls on ${longDate(easter(2027))}. Others use a fixed week in March. Add your district's dates under <em>Holidays and breaks</em>.</p>

      <h2>How to print a second semester planner</h2>
      <ol class="steps">
        <li><strong>Check the school year.</strong> Make sure the calendar's last day and your spring breaks are right.</li>
        <li><strong>Set the semester start.</strong> Type it into <em>Second semester starts</em>, then click <em>Semester 2</em>.</li>
        <li><strong>Update your classes.</strong> Many teachers get new sections in January. Edit the classes for each rotation day.</li>
        <li><strong>Choose pages.</strong> Weekly pages are the planner. Add monthly calendars for long-range planning and the cover for a binder.</li>
        <li><strong>Download.</strong> Print double-sided, or tick month tabs for a clickable digital planner.</li>
      </ol>

      <h2>New semester, new rotation?</h2>
      <p>Some schools re-sync the rotation at the start of the second semester, for example by declaring the first day back an A day. Click that date in the calendar, choose <em>Make this day</em> → A Day, and the rest of the semester follows from it. If your school uses snow days that don't move the letters, choose <em>Skip this day's letter</em> for each closure.</p>

      <h2>Mid-year planner tips</h2>
      <ul>
        <li>Print only through spring break first. If snow days shift the rotation, the later weeks are still blank and easy to regenerate.</li>
        <li>Add notes for testing windows, report-card dates and early releases so they appear on the weekly pages.</li>
        <li>Mark state testing days as <em>No-rotation school days</em> if your school suspends the A/B schedule for them.</li>
      </ul>`,
    faq,
    graph: [crumbLd("second-semester-lesson-planner", "Second semester lesson planner"), WEBAPP("Second semester lesson planner", `${URL}/second-semester-lesson-planner`, "Printable dated second-semester lesson planner with rotation days and holidays."), faqLd(faq)],
  });
}

// TEACHER PLANNER 2027-2028
{
  const faq = [
    ["When is Labor Day 2027?", `Labor Day 2027 is ${longDate(hol2728.find(h => h.k === "labor").date)}. Many districts start school before it, some after.`],
    ["Is the 2027–2028 planner already dated correctly?", "The federal holidays are calculated for 2027–28, and the example uses typical break dates. Replace the first and last day and the breaks with your district's calendar once it's published, and the planner re-dates itself."],
    ["Can I copy this year's calendar to 2027–28?", "Yes. Open your saved 2026–27 calendar and click “Copy to next school year”. Dates move forward 52 weeks so they stay on the same weekdays, federal holidays are recalculated, and snow days are cleared. Check the breaks against the new district calendar."],
    ["Can I get the 2027–2028 calendar without the planner?", "Yes. Download only the PDF calendar (year at a glance and monthly pages) or the .ics file. The planner is optional."],
  ];
  pages.push({
    slug: "teacher-planner-2027-2028", tool: "gen", preset: "y2728", crumb: "Teacher planner 2027–2028",
    title: "Teacher Planner 2027–2028 – Free Printable, Dated PDF",
    desc: "Free printable teacher planner for 2027–2028: dated weekly lesson pages, monthly calendars, federal holidays and your A/B or rotation days. Letter or A4.",
    h1: "Teacher Planner 2027–2028",
    lead: "A dated 2027–28 teacher planner and school calendar with federal holidays already in. Add your district's dates and rotation, then print.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> This printable 2027–2028 teacher planner starts from an example school year (${E.fmtMDY(y2728.first)} to ${E.fmtMDY(y2728.last)}, ${y2728.schoolDays} school days) with US federal holidays filled in. Change the first and last day, add your district's breaks, list your periods, and download a dated PDF with ${y2728Weeks} weekly lesson-plan pages and 10 monthly calendars.</p>

      <h2>2027–2028 US federal holidays</h2>
      <p>Calculated with the federal rules (a holiday on a Saturday is observed on Friday, one on a Sunday on Monday). Schools don't close for all of them, so untick any your district stays open for.</p>
      <table>
        <thead><tr><th>Holiday</th><th>Date</th></tr></thead>
        <tbody>
${hol2728.map(h => `          <tr><td>${h.name}</td><td>${longDate(h.date)}</td></tr>`).join("\n")}
        </tbody>
      </table>

      <h2>What the 2027–28 planner includes</h2>
      <ul>
        <li><strong>Cover and contents</strong> with clickable month buttons.</li>
        <li><strong>My schedule:</strong> your periods, times and classes for each rotation day.</li>
        <li><strong>Monthly calendars</strong> for August 2027 to May 2028 with rotation days, holidays and notes.</li>
        <li><strong>Weekly lesson-plan pages,</strong> one per school week, with dates, rotation days and your classes.</li>
        <li>An optional <strong>year-at-a-glance</strong> calendar from the PDF calendar button.</li>
      </ul>

      <h2>How to make your 2027–2028 planner</h2>
      <ol class="steps">
        <li>Replace the example first and last day with your district's 2027–28 dates.</li>
        <li>Pick your rotation: A/B, Day 1–N, block with a fixed day, or none for a traditional schedule.</li>
        <li>Check the holidays and add Thanksgiving, winter and spring breaks, teacher workdays and conference days.</li>
        <li>In the lesson planner, list up to 10 periods and the classes for each rotation day.</li>
        <li>Choose <em>Whole year</em>, then download. Save the calendar in your browser so you can update it after snow days.</li>
      </ol>

      <h2>Plan ahead, update later</h2>
      <p>District calendars for 2027–28 are often approved in the spring. You can build your planner now and adjust it later: BellBook stores the rules (dates, rotation and days off), not finished pages, so changing a break re-dates every later page. Save the calendar in your browser and regenerate the PDF whenever the district publishes changes.</p>`,
    faq,
    graph: [crumbLd("teacher-planner-2027-2028", "Teacher planner 2027–2028"), WEBAPP("Teacher planner 2027–2028", `${URL}/teacher-planner-2027-2028`, "Printable dated 2027–2028 teacher planner and school calendar with federal holidays."), faqLd(faq)],
  });
}

// DATED LESSON PLAN BOOK
{
  const faq = [
    ["What is a dated lesson plan book?", "A plan book whose pages already have the dates of each school week printed on them. Holidays and breaks are marked, so you never plan a lesson for a day off."],
    ["How many pages is a full year?", `About one weekly page per school week. The example ${E.parts(sampleAB.s).y}–${String(E.parts(sampleAB.e).y).slice(2)} year is ${yearWeeks} weekly pages, plus a monthly calendar for each month and an optional cover and schedule page.`],
    ["Can I make a 7-period lesson planner?", "Yes. The example has 7 periods with times, and you can use anywhere from 1 to 10. Each row prints the class for that period."],
    ["Is there a version with rotation days?", "Yes. Change the rotation type to A/B, Day 1–N or custom labels and the weekly pages show each day's label and its classes. See the <a href=\"/ab-day-lesson-planner\">A/B day lesson planner</a>."],
  ];
  pages.push({
    slug: "dated-lesson-plan-book", tool: "gen", preset: "dated", crumb: "Dated lesson plan book",
    title: "Dated Lesson Plan Book – Free Printable, 1–10 Periods",
    desc: "Free dated lesson plan book printable: weekly pages with real dates, holidays and 1–10 periods (7-period layout included). Made for your school year as a PDF.",
    h1: "Dated Lesson Plan Book (Printable)",
    lead: "A printable lesson plan book with real dates, your holidays and up to 10 periods, made for your school year in a couple of minutes.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Enter your first and last day of school and your holidays, list your periods (the example has 7), type the class for each one, and download the PDF. You get weekly pages with Monday to Friday dated, days off greyed out and each period labelled, plus monthly calendars. The example has no rotation; switch to A/B or Day 1–N if your school rotates.</p>

      <h2>Dated vs undated plan books</h2>
      <table>
        <thead><tr><th></th><th>Undated template</th><th>Dated plan book from BellBook</th></tr></thead>
        <tbody>
          <tr><td>Dates</td><td>Write them in every week</td><td>Printed on every page</td></tr>
          <tr><td>Holidays and breaks</td><td>Easy to miss</td><td>Greyed out with the reason</td></tr>
          <tr><td>Class names</td><td>Write them in every square</td><td>Printed in each period row</td></tr>
          <tr><td>Rotation days</td><td>Work them out by hand</td><td>Calculated, including after snow days</td></tr>
          <tr><td>Reprinting</td><td>Start again</td><td>Regenerate any range of weeks</td></tr>
        </tbody>
      </table>

      <h2>Layout of the weekly pages</h2>
      <p>Each landscape page covers one school week. Columns are the school days (Monday to Friday, plus Saturday if your school meets then). Rows are your periods, with the period name and time on the left and the class at the top of each square. Lined space fills the rest of the square, so with 7 periods each square still has room for a short plan. With 4 blocks the squares are much taller.</p>

      <h2>How to make your dated lesson plan book</h2>
      <ol class="steps">
        <li><strong>School year:</strong> enter the first and last day, then add holidays and breaks.</li>
        <li><strong>Periods:</strong> name each period, add times if you like, and remove the ones you don't need.</li>
        <li><strong>Classes:</strong> leave “Same classes every day” ticked for a traditional schedule and type each period's class.</li>
        <li><strong>Range:</strong> choose the whole year, a semester or the next 4 weeks.</li>
        <li><strong>Print:</strong> download the PDF and print double-sided on US Letter or A4.</li>
      </ol>

      <h2>Printing and binding tips</h2>
      <ul>
        <li>Print the cover and schedule pages single-sided, then the weekly pages double-sided (flip on the long edge).</li>
        <li>A 3-hole punch and a 1-inch binder hold about one semester; use a 1.5-inch binder for a full year.</li>
        <li>Print one semester at a time so later weeks can be regenerated if the calendar changes.</li>
        <li>Each page has a small “Made with BellBook” footer credit and a page number.</li>
        <li>Need attendance sheets or a seating chart too? Paste your class list under <em>Class pages from a roster</em>. Each attendance column is a real class date.</li>
      </ul>`,
    faq,
    graph: [crumbLd("dated-lesson-plan-book", "Dated lesson plan book"), WEBAPP("Dated lesson plan book", `${URL}/dated-lesson-plan-book`, "Printable dated lesson plan book with holidays and 1 to 10 periods."), faqLd(faq)],
  });
}

// ABOUT + PRIVACY
pages.push({
  slug: "about", crumb: "About",
  title: "About BellBook – Free School Rotation Calendar Tools",
  desc: "BellBook is part of MiniTools: small, free, private web tools. It makes A/B day and rotating school calendars and dated lesson planners in your browser.",
  h1: "About BellBook",
  lead: "A small, free tool for the teachers and school staff who keep the A/B calendar running.",
  body: `      <p>BellBook is part of <strong>MiniTools</strong>, a set of free, single-purpose web tools. It makes A/B day, Day 1–N and block schedule calendars, dated lesson planners that follow the same rotation, and class pages (attendance dated by class meeting, a gradebook, a seating chart and a substitute plan). Like every MiniTools site, it runs entirely in your browser: what you type stays on your device.</p>
      <h2>Why we built it</h2>
      <p>Schools on rotating schedules often publish the year's A/B calendar from a spreadsheet. When a snow day or a new holiday shifts the rotation, the spreadsheet has to be redone by hand and teachers rewrite their planners. BellBook stores the rules instead: the dates, the rotation, the days off and how closures are handled. So one change re-letters the rest of the year correctly.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free, with no account and no paid tier. Printed and exported calendars carry a small “Made with BellBook” credit, which is how other teachers find the tool.</p>
      <h2>Accuracy</h2>
      <p>Federal holiday dates are calculated with the official US rules, and the rotation logic is covered by automated tests, including tests of both snow-day rules. Your district's calendar is always the final word, so check printed calendars against it. BellBook is not affiliated with any school, district or calendar provider.</p>`,
  graph: [crumbLd("about", "About")],
});
pages.push({
  slug: "privacy", crumb: "Privacy & Terms",
  title: "Privacy Policy & Terms of Use – BellBook Calendars",
  desc: "How BellBook handles your data: calendars are built in your browser and never uploaded. Share links keep the calendar after the #. Cookie-free analytics only.",
  h1: "Privacy & Terms",
  lead: "Short version: your school's calendar and your lesson planner never leave your device.",
  body: `      <h2>Privacy</h2>
      <p>BellBook runs in your browser. Your calendar settings, saved calendars and lesson-planner details are kept in your browser's local storage on your device and are never sent to our servers. PDFs, .ics and .csv files are generated on your device. Clearing your browser data deletes everything BellBook stored.</p>
      <p>The “What day is it?” share link contains the calendar (dates, rotation, days off and their names, but not your lesson planner) after the # sign. Browsers don't send that part of a link to servers, so we never receive it. Anyone you give the link to can read the calendar, so don't put private information in day names or notes.</p>
      <p>Student names you paste for class pages (attendance, gradebook, seating chart) are used only to draw the PDF in your browser. They are not saved, not put in share links and never uploaded.</p>
      <p>We use Vercel Web Analytics to count page visits and a few anonymous events (for example “PDF downloaded”). It doesn't use cookies, doesn't track you across sites and doesn't collect anything you type into the tool.</p>
      <h2>Terms</h2>
      <p>BellBook is provided “as is”, without warranty. Check generated calendars and planners against your school's official calendar before publishing or printing them. You may use BellBook and its outputs freely for personal, classroom and school use.</p>`,
  graph: [crumbLd("privacy", "Privacy & Terms")],
});

for (const p of pages) writeFileSync(join(OUT, `${p.slug}.html`), page(p));
console.log(`wrote ${pages.length} pages`);
