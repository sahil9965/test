// Generates every StreamWeek page (home, landing pages, about, privacy) plus llms.txt from one layout.
// Usage: node src/streamweek/pages.mjs   (writes into sites/streamweek/)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/streamweek");
const C = createRequire(import.meta.url)(join(OUT, "core.js"));
const URL = "https://streamschedule.roohsites.com";
const NAME = "StreamWeek";
const ACCENT = "#7c3aed";
const DATE = "2026-10-16", DATE_H = "16 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const NOT_AFFILIATED = "StreamWeek is an independent tool, not affiliated with Twitch, YouTube, Kick, Discord, X, Instagram or TikTok.";

// The worked example used in the copy comes straight from the time engine, so the numbers always match the tool.
const ex = (() => {
  const mk = ws => C.computeWeek(C.normalize({ weekStart: ws, homeTz: "Europe/London", viewers: ["America/New_York", "America/Los_Angeles", "Asia/Tokyo"], days: [{ off: false, streams: [{ start: "20:00", end: "", title: "", game: "" }] }, ...Array(6).fill({ off: true, streams: [] })] })).items[0];
  const f = v => `${C.fmtTime(v.time, "12")} ${v.label}${v.diff ? " " + C.diffMark(v.diff) : ""}`;
  const a = mk("2026-10-19"), b = mk("2026-10-26"), c = mk("2026-11-02");
  return { before: a.viewers.map(f), during: b.viewers.map(f), after: c.viewers.map(f), unix: C.unix(b.startT) };
})();
const sizeRows = Object.values(C.SIZES).map(z => `<tr><td>${z.label}</td><td>${z.hint.split(" · ")[0]}</td><td>${z.hint.split(" · ")[1] || ""}</td></tr>`).join("\n          ");

const FOOT = `  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">Stream schedule maker</a></li><li><a href="/stream-schedule-time-zones">Schedules with time zones</a></li><li><a href="/stream-schedule-for-discord">Discord timestamps</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Templates</h4><ul><li><a href="/vtuber-schedule-template">VTuber schedule template</a></li><li><a href="/twitch-schedule-template">Twitch schedule template</a></li><li><a href="/youtube-live-schedule-template">YouTube Live schedule template</a></li></ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. ${NOT_AFFILIATED}</p>
  </footer>`;

const RELATED = `      <h2>More templates and guides</h2>
      <ul class="related">
        <li><a href="/">Stream schedule maker</a></li>
        <li><a href="/vtuber-schedule-template">VTuber schedule template</a></li>
        <li><a href="/stream-schedule-time-zones">Time zones</a></li>
        <li><a href="/stream-schedule-for-discord">Discord timestamps</a></li>
        <li><a href="/twitch-schedule-template">Twitch</a></li>
        <li><a href="/youtube-live-schedule-template">YouTube Live</a></li>
      </ul>`;

function head({ title, desc, path, graph }) {
  const url = URL + (path === "/" ? "/" : path);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="${ACCENT}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(title)}">
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
${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}
</script>
</head>`;
}

const PUBLISHER = { "@type": "Organization", name: "Rooh Sites", url: "https://roohsites.com/" };
const faqLd = faq => ({ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
const FEATURES = ["Weekly schedule with real dates", "Automatic time-zone conversion with daylight saving", "Up to 3 viewer time zones", "English, Japanese or bilingual day labels", "12-hour or 24-hour clock", "PNG images at 1920×1080, 1200×675, 1080×1920, 1080×1350 and a 320-px panel", "5 themes and an accent colour", "Copy for Discord with timestamps", "Copy for X", ".ics calendar download", "Autosave in the browser"];
const appLd = (name, path, desc) => ({
  "@type": "WebApplication", name, url: URL + path, description: desc, applicationCategory: "DesignApplication",
  operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: FEATURES,
  publisher: PUBLISHER,
});
const howToLd = (name, steps) => ({ "@type": "HowTo", name, totalTime: "PT10M", step: steps.map(([n, t]) => ({ "@type": "HowToStep", name: n, text: strip(t) })) });
const stepsHtml = steps => `      <ol class="steps">\n${steps.map(([n, t]) => `        <li><strong>${esc(n)}.</strong> ${t}</li>`).join("\n")}\n      </ol>`;
const faqHtml = faq => `      <h2 id="faq">Frequently asked questions</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}`;
const updated = () => `      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the Rooh Sites team.</p>`;

function page({ path, title, desc, h1, lead, quick, badges, tool, body, faq = [], crumb, schema = [], noRelated }) {
  const isHome = path === "/";
  const graph = [];
  if (!isHome) graph.push({ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` },
    { "@type": "ListItem", position: 2, name: crumb || h1, item: URL + path }] });
  graph.push(...schema);
  if (faq.length) graph.push(faqLd(faq));
  const navHtml = isHome
    ? `<a href="#how">How it works</a><a href="/stream-schedule-for-discord">Discord timestamps</a><a href="#faq">FAQ</a>`
    : `<a href="/">Schedule maker</a><a href="/vtuber-schedule-template">VTuber template</a><a href="/about">About</a>`;
  const toolAttr = tool && tool.preset ? ` data-preset="${tool.preset}"` : "";
  return `${head({ title, desc, path, graph })}
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="top">
    <a class="logo" href="/"><img src="/favicon.svg" alt="" width="28" height="28">${NAME}</a>
    <nav aria-label="Main">${navHtml}</nav>
  </header>
  <main id="main">
${isHome ? "" : `    <p class="crumbs"><a href="/">${NAME}</a> › ${esc(crumb || h1)}</p>\n`}    <section class="hero">
      <h1>${esc(h1)}</h1>
      <p class="lead">${lead}</p>
${badges ? `      <ul class="badges">${badges.map(b => `<li>${b}</li>`).join("")}</ul>\n` : ""}    </section>
${quick ? `    <div class="content narrow quick"><p class="tldr"><strong>Quick answer:</strong> ${quick}</p></div>\n` : ""}${tool ? `    <section class="tool card" aria-label="Stream schedule maker"><div id="sw-tool"${toolAttr}></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? faqHtml(faq) + "\n" : ""}${noRelated ? "" : RELATED + "\n"}${updated()}
    </article>
  </main>
${FOOT}
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/render.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

const discordEx = `**Stream Schedule** · @yourchannel
Oct 26 – Nov 1, 2026 (times show in your own time zone)

• &lt;t:${ex.unix}:F&gt; (&lt;t:${ex.unix}:R&gt;) — **Chess night** · Chess
Days off: Tue 27, Thu 29`;

/* ------------------------------------------------------------------ home */
const homeSteps = [
  ["Pick the week", "The week starting date defaults to the coming Monday (tick the box if your weeks start on Sunday). Every day in the schedule is a real date, which is what makes the time-zone maths right."],
  ["Set your time zones", "Your home zone is the one you type times in, and it starts as your device's zone. Add up to 3 viewer zones with the quick buttons, for example JST, ET and UK."],
  ["Fill in your streams", "For each day, tick Offline or type a start time, an optional end time, a title and a game or category. Add a second stream on busy days."],
  ["Choose a look and a size", "Pick one of 5 themes, an accent colour, English, Japanese or bilingual day names and a 12-hour or 24-hour clock. Add your avatar or logo if you like, then pick an image size."],
  ["Export and post", "Download the PNG for X, Instagram or your Discord announcement, copy the Discord text with timestamps, copy the X text, or download an .ics file. Next week, click <em>Next week</em> and edit what changed."],
];
const homeFaq = [
  ["Is StreamWeek free?", "Yes. Every feature is free, with no account and no paid tier. Each exported image has a small “Made with StreamWeek · streamschedule.roohsites.com” credit in a bottom corner, kept away from your schedule. The copied Discord and X text and the .ics file carry no credit."],
  ["How does StreamWeek convert time zones?", "Each stream is a real date and time in your home zone. Your browser's built-in time-zone database turns it into an exact moment, then shows that moment in each viewer zone. Because it works on real dates, daylight saving changes are handled for the exact week you are posting."],
  ["What does +1 or −1 next to a time mean?", "It means that time falls on the next day (+1) or the previous day (−1) for viewers in that zone, compared with the day in your schedule. A Monday 8:00 PM stream in London is 5:00 AM JST +1, which is Tuesday morning in Japan."],
  ["What happens if I type a time that doesn't exist?", "On the night the clocks go forward, one hour is skipped. If a start time falls in that gap, StreamWeek moves it forward by the size of the gap, the way your phone's clock would, and shows a warning under the preview so you can check it."],
  ["How do Discord timestamps work?", "<em>Copy for Discord</em> writes each stream as a code such as &lt;t:1793044800:F&gt;. Discord replaces the code with the date and time in each reader's own time zone, and &lt;t:…:R&gt; shows a countdown such as “in 3 days”. See the <a href=\"/stream-schedule-for-discord\">Discord timestamp guide</a>."],
  ["Which image size should I use?", "1920 × 1080 is a safe all-rounder for X, Discord and banners. 1080 × 1920 fits phone Stories, 1080 × 1350 fills more of an Instagram feed, and the 320-px panel fits the narrow About panels many streamers use. These are common sizes, so check each platform's current guidance if you need an exact fit."],
  ["Will my schedule be there next week?", "Yes, in the same browser. The schedule saves automatically in local storage. Click <em>Next week</em> to move every stream forward 7 days, change what's different and export again."],
  ["Is my avatar or model art uploaded anywhere?", "No. The picture is read and drawn by your browser and saved only in this browser's local storage. Nothing you type or upload is sent to a server."],
];
const home = {
  path: "/",
  title: "Stream Schedule Maker with Time Zones — Free | StreamWeek",
  desc: "Free stream schedule maker: type your week once and get PNG images, Discord timestamps, X text and an .ics file, with times converted for viewers' time zones.",
  h1: "Stream Schedule Maker with Time Zones",
  lead: "Plan your week once and get a schedule image, Discord timestamps and a calendar file, with every time converted for your viewers. Free, no signup, and nothing leaves your browser.",
  quick: "Pick the week, set your home time zone and up to 3 viewer zones (such as JST, ET and UK), type each day's start time, title and game, then click <em>Download PNG</em>. Times are converted with daylight saving handled for that exact week, <em>Copy for Discord</em> writes timestamps every viewer sees in their own time, and <em>Next week</em> copies the schedule forward.",
  badges: ["100% free", "Auto time zones", "Discord timestamps", "5 image sizes"],
  tool: { preset: "" },
  schema: [appLd(NAME, "/", "Free weekly stream schedule maker with automatic time-zone conversion, PNG images in 5 common sizes, Discord timestamps, X text and .ics export."), howToLd("How to make a weekly stream schedule with time zones", homeSteps)],
  faq: homeFaq,
  body: `      <h2 id="how">How to make a stream schedule in 5 steps</h2>
${stepsHtml(homeSteps)}

      <h2>Why time zones are the hard part</h2>
      <p>Most schedule templates give you seven boxes and a text field. That works if every viewer lives in your time zone. Once you have regulars in Tokyo, New York and London, someone has to do the conversion, and a mistake means people show up an hour late or to an empty channel.</p>
      <p>Daylight saving makes it worse, because regions change their clocks on different dates. The UK moves its clocks back on the last Sunday of October; the US does it on the first Sunday of November. For the week in between, the gap between London and New York is four hours instead of five. Here is one 8:00 PM London stream on three Mondays in a row, straight from the tool:</p>
      <table>
        <thead><tr><th>Week of</th><th>New York</th><th>Los Angeles</th><th>Tokyo</th></tr></thead>
        <tbody>
          <tr><td>Mon 19 Oct 2026</td><td>${ex.before.join("</td><td>")}</td></tr>
          <tr><td>Mon 26 Oct 2026</td><td>${ex.during.join("</td><td>")}</td></tr>
          <tr><td>Mon 2 Nov 2026</td><td>${ex.after.join("</td><td>")}</td></tr>
        </tbody>
      </table>
      <p>A template with fixed “ET / PT” columns would be wrong for at least one of those weeks. StreamWeek doesn't use fixed offsets. Every slot is a real date, and your browser's time-zone database (the same one your phone uses) converts it. Zone labels change with the season too, so you see EDT one week and EST the next.</p>

      <h2>What the +1 and −1 marks mean</h2>
      <p>A converted time can land on a different day. Rather than move the stream to another column, StreamWeek keeps it under your day and adds a small mark: <strong>+1</strong> means the next day for that viewer, <strong>−1</strong> the day before. It's the convention airline timetables use, and it keeps the image readable as one week. Late-night streams in Europe and the Americas usually show +1 in Japan and Australia; afternoon streams from Japan often show −1 in the Americas.</p>

      <h2>Image sizes and layouts</h2>
      <p>Each size has its own layout rather than one picture squeezed into different frames. Wide images use seven columns, tall ones a stacked list, and the panel a compact list whose height grows with your week.</p>
      <table>
        <thead><tr><th>Size (px)</th><th>Layout</th><th>Common use</th></tr></thead>
        <tbody>
          ${sizeRows}
        </tbody>
      </table>
      <p>These are common sizes, not official specifications. Platforms change their crops from time to time, so the layouts keep the important text away from the edges. The Stories layout leaves extra room at the top and bottom, where apps place their own buttons.</p>

      <h2>Discord, X and calendar exports</h2>
      <p>An image is easy to share, but text works better for some jobs. <em>Copy for Discord</em> produces a short announcement where every stream is a Discord timestamp, so each member sees the time in their own zone and a countdown such as “in 2 days”. The <a href="/stream-schedule-for-discord">Discord guide</a> explains the codes. <em>Copy for X</em> writes plain lines like “Mon 26: 8PM GMT / 4PM EDT / 5AM JST +1 · Chess night” and shows a rough character count, because a full week can run past the 280 characters a standard post allows.</p>
      <p><em>Download .ics</em> saves every stream as a calendar event in UTC, which Google Calendar, Apple Calendar and Outlook all import. Streams without an end time get a 2-hour slot. Share the file with mods or put it in your Discord so regulars can add the week to their own calendars.</p>

      <h2>Themes for different channels</h2>
      <div class="cards">
        <div class="card"><h3>Midnight neon</h3><p>Dark background, glowing card outlines. Suits gaming and late-night channels.</p></div>
        <div class="card"><h3>Pastel idol</h3><p>Soft pinks and lavender with sparkles. Made with VTubers and cosy streams in mind.</p></div>
        <div class="card"><h3>Clean light</h3><p>White cards on off-white. Easy to read and good for education, art and talk shows.</p></div>
        <div class="card"><h3>Retro arcade</h3><p>Chunky borders, hard shadows and a checker strip. Loud in a good way.</p></div>
        <div class="card"><h3>Minimal dark</h3><p>No boxes, just type and thin rules. Works with almost any brand colour.</p></div>
      </div>
      <p>Every theme takes an accent colour, so you can match your emotes or overlay. If you pick an accent that would be hard to read on the background, the tool lightens or darkens it for text.</p>

      <h2>Tips for a schedule people actually read</h2>
      <ul>
        <li><strong>Lead with times, then titles.</strong> Viewers scan for “when”, then decide whether to come. Keep titles short; the image shows up to two lines.</li>
        <li><strong>Pick viewer zones from your analytics.</strong> Most platforms show where viewers are. Three zones is plenty; more than that turns the image into a spreadsheet.</li>
        <li><strong>Mark days off.</strong> An honest “OFF” day stops people from checking an empty channel, and it tells your community you take breaks.</li>
        <li><strong>Use TBA when you're unsure.</strong> Leave a day without a start time and it shows as TBA instead of a guess you'll have to correct.</li>
        <li><strong>Post at the same time each week.</strong> Followers learn when to look for it. With <em>Next week</em>, an unchanged week takes seconds.</li>
        <li><strong>Add a note line</strong> such as “Times may change, check Discord” so viewers know where updates go.</li>
      </ul>

      <h2>Private by design</h2>
      <p>StreamWeek runs in your browser. Your schedule saves in this browser's local storage, the images are drawn on your device, and your avatar or model art is never uploaded. ${NOT_AFFILIATED}</p>`,
};

/* ---------------------------------------------------------- landing pages */
const P = [];

P.push({
  path: "/vtuber-schedule-template", crumb: "VTuber schedule template",
  title: "VTuber Schedule Template — EN/JP with JST Times | StreamWeek",
  desc: "Free VTuber schedule template with bilingual EN/JP day labels, Japan time (JST) next to your own, a pastel theme and a slot for your model art. Exports PNG.",
  h1: "VTuber Schedule Template (EN/JP)",
  lead: "A bilingual weekly schedule with Japan time beside your own, a pastel idol theme and room for your model art. Edit it below and export a PNG.",
  quick: "This VTuber schedule maker starts with the Pastel idol theme, bilingual day labels (MON 月) and Japan Standard Time as a viewer zone. Type your streams in your own time zone, upload your model art or avatar, and download a 1920 × 1080 image for X or a 1080 × 1920 one for Stories. JST times that fall on the next day show +1.",
  tool: { preset: "vtuber" },
  faq: [
    ["Can the schedule show Japanese day names?", "Yes. Choose Japanese for 月 火 水 木 金 土 日 with dates like 10/26, or Bilingual for MON 月 style labels. Offline days read おやすみ in Japanese and bilingual modes."],
    ["How do I show my time and Japan time together?", "Set your own zone as the home zone, then add JST with the quick button. Each stream shows your time first and the JST time underneath, with +1 when it's already the next day in Japan."],
    ["Where does my model art go?", "In the header: a circle beside the title on wide images, centred above the title on Stories, and a small circle on the panel. Tall art is cropped from the top so the face stays in frame. The picture never leaves your browser."],
    ["Can I mark a stream as members-only or unarchived?", "Put it in the title, for example “Karaoke (unarchived)” or “Members: zatsudan”. Titles wrap onto a second line on most layouts, so short labels in brackets fit well."],
    ["Do Japanese titles work?", "Yes. Japanese text in titles and categories is drawn with your device's Japanese font. The Discord and X text and the .ics file keep Japanese characters as typed."],
  ],
  body: `      <h2>Built for a two-language audience</h2>
      <p>Many VTubers stream for English and Japanese viewers at once, and the usual fix is a template with “EN / JP” columns where you type every time twice and hope you got the conversion right. Here you type each stream once, in your own time zone, and the tool fills in Japan time. Because each slot is a real date, the JST time stays right when your own clocks change for daylight saving. Japan doesn't use daylight saving, so the gap between you and Tokyo shifts by an hour twice a year if you live in Europe, North America or Australia.</p>
      <p>Labels can be English (MON TUE), Japanese (月 火) or both. Bilingual mode puts the English day in large type and the Japanese day beside it, and offline days read “OFF · おやすみ”. Dates follow the label: “Oct 26” in English, “10/26” in Japanese.</p>

      <h2>Common VTuber stream types to put in titles</h2>
      <ul>
        <li><strong>Zatsudan</strong> (free talk) or “Just Chatting” as the category.</li>
        <li><strong>Karaoke</strong>, often marked unarchived when music rights are a concern.</li>
        <li><strong>Collabs</strong>: add your partner's handle to the title so their viewers can find you.</li>
        <li><strong>Members-only streams</strong>: say so in the title so non-members don't wait for nothing.</li>
        <li><strong>Watchalongs and premieres</strong>: the end time is optional, so leave it blank when you don't know.</li>
      </ul>

      <h2>Model art and avatars</h2>
      <p>Upload a PNG with transparency or a square crop of your model. The image is drawn in a sensible slot for each size: a ring-framed circle beside the title on landscape images, a large circle above the title on Stories, and a small one on the 320-px panel. In the Retro arcade theme it becomes a square with a chunky frame. Tall full-body art is cropped from the top, which keeps the face visible. The file stays on your device and is saved in this browser so you don't have to upload it again next week.</p>

      <h2>Debut weeks, breaks and birthdays</h2>
      <p>The note line under the schedule is handy for one-off messages: “Birthday stream Saturday!”, “Back from break on the 3rd” or “Times may change, check Discord”. For a break, tick Offline on each day; the image shows a clear おやすみ instead of empty boxes. For a debut or anniversary week, set the schedule title to something like “Debut Week” and switch the theme if you want a different feel for that post.</p>

      <h2>Posting to X and Discord</h2>
      <p>The 1920 × 1080 and 1200 × 675 images suit X posts and Discord announcements; 1080 × 1920 suits Stories. <em>Copy for X</em> writes a text version in the label style you picked, such as “10/26(月): 8PM GMT / 5AM JST +1”. <em>Copy for Discord</em> writes timestamps that Discord shows in each viewer's own zone, so you don't need to list JST separately there.</p>
      <p class="note">StreamWeek isn't connected to any agency, platform or talent group. It's a free tool for independent and agency talent alike, and the image credit is a small line in a bottom corner.</p>`,
});

P.push({
  path: "/stream-schedule-time-zones", crumb: "Schedules with time zones",
  title: "Stream Schedule with Time Zones — Auto Convert | StreamWeek",
  desc: "Make a stream schedule with time zones that converts automatically, including weeks when Europe and the US change clocks on different dates. Free, in-browser.",
  h1: "Stream Schedule with Time Zones",
  lead: "Type your times once. StreamWeek shows them in up to 3 more time zones, with daylight saving handled for the exact week.",
  quick: "Set your home zone (the one you type times in) and up to 3 viewer zones, then fill in your week. Each stream is converted from its real date, so daylight-saving changes are correct even in weeks when the UK and US clocks differ. Times that fall on another day for a viewer show +1 or −1, and short labels such as EDT or JST appear next to each time.",
  tool: { preset: "timezones" },
  faq: [
    ["Why not just use fixed offsets like ET = UK − 5?", "Because the offset changes. The UK and US switch daylight saving on different Sundays, so for about a week in March and a week in late October or early November the gap is 4 hours, not 5. Fixed offsets are wrong in those weeks; real dates are not."],
    ["Which time zones should I show?", "Your home zone plus the 2 or 3 places most of your viewers live, from your channel analytics. Common picks are JST, PT, ET, UK, CET, AEST and IST, which all have quick buttons."],
    ["Why does a label say EDT one week and EST the next?", "The label follows the date. New York uses EDT in summer and EST in winter, London uses BST and GMT, Sydney uses AEDT and AEST. The image shows whichever applies to that stream."],
    ["What if my home zone has no daylight saving?", "Then your times never shift, but your viewers' times still can. If you live in Tokyo, the LA and New York conversions change by an hour when the US changes clocks, and the tool handles that."],
    ["Does it handle half-hour zones like India?", "Yes. India (IST, UTC+5:30), Adelaide and other zones with 30- or 45-minute offsets are converted with the same database, so a 20:00 IST stream shows the right minutes elsewhere."],
  ],
  body: `      <h2>How the conversion works</h2>
      <p>Your browser ships with the IANA time-zone database, the same rules your phone's clock uses. StreamWeek asks it two questions for every stream: “what exact moment is 8:00 PM on Monday 26 October in London?” and “what does that moment look like in New York, Los Angeles and Tokyo?”. Because the question includes the date, the answer accounts for whichever daylight-saving rules apply that day.</p>
      <p>For the week of 26 October 2026, an 8:00 PM London stream converts to ${ex.during.join(", ")}. A week earlier New York is ${ex.before[0]}, and a week later ${ex.after[0]}. A schedule with fixed offsets would have one of those weeks wrong.</p>

      <h2>The weeks that catch people out</h2>
      <ul>
        <li><strong>March:</strong> the US moves clocks forward on the second Sunday, Europe on the last Sunday. For two to three weeks, New York is 4 hours behind London instead of 5.</li>
        <li><strong>Late October to early November:</strong> Europe moves back on the last Sunday of October, the US a week later. Again the gap is an hour smaller for one week.</li>
        <li><strong>Southern hemisphere:</strong> Sydney moves forward in early October and back in early April, the opposite direction to Europe and the US. The gap between Sydney and London can change by two hours over a year.</li>
        <li><strong>Japan, India and most of Asia</strong> don't use daylight saving, so the change always comes from the other side.</li>
      </ul>

      <h2>Spring-forward gaps</h2>
      <p>On the night clocks go forward, one hour doesn't exist; in London, 1:00 AM jumps straight to 2:00 AM. If you schedule a stream inside that gap, StreamWeek moves it forward by an hour (1:30 becomes 2:30) and warns you under the preview. When clocks go back and an hour happens twice, it uses the first one.</p>

      <h2>Reading +1 and −1</h2>
      <p>Every converted time stays under your day, with a mark when it's a different day for that viewer. “5:00 AM JST +1” under Monday means Tuesday morning in Japan. “6:00 PM PDT −1” under a Tokyo Tuesday means Monday evening in Los Angeles. One rule everywhere keeps the week readable as a single row of seven days.</p>

      <h2>Let Discord do the conversion too</h2>
      <p>No image can show every viewer's zone. For everyone else, <em>Copy for Discord</em> writes timestamps that Discord displays in each reader's own time, and the .ics file lets people add streams to their calendar, which also shows local time. Between the image, the Discord post and the calendar file, nobody has to do maths.</p>`,
});

P.push({
  path: "/stream-schedule-for-discord", crumb: "Discord timestamps",
  title: "Stream Schedule for Discord with Timestamps | StreamWeek",
  desc: "Post your stream schedule in Discord with timestamps that show in every member's own time zone. Copy the <t:…> codes for your week and add the image too.",
  h1: "Stream Schedule for Discord with Timestamps",
  lead: "Copy your week as Discord timestamps, so every member sees stream times in their own time zone, plus a countdown.",
  quick: "Fill in your week below and click <em>Copy for Discord</em>. Each stream becomes a code like &lt;t:${ex.unix}:F&gt;, which Discord shows as a full date and time in each reader's own time zone, followed by &lt;t:${ex.unix}:R&gt;, a live countdown such as “in 3 days”. Paste it into your announcements channel, and attach the PNG if you want the image too.",
  tool: { preset: "discord" },
  faq: [
    ["What is a Discord timestamp?", "A code in the form &lt;t:UNIX:STYLE&gt;, where UNIX is the number of seconds since 1 January 1970 UTC and STYLE is a letter such as F or R. Discord replaces it with a date or time formatted for the reader's own time zone and language."],
    ["Why do the times look different for my members?", "That's the point: each member sees the same moment in their own local time. Someone in London and someone in Tokyo read different clock times for the same stream, and both are correct."],
    ["Can I edit the copied text?", "Yes. It's plain text, so you can add pings, emoji or channel links before posting. Keep each &lt;t:…&gt; code intact, including both angle brackets, or Discord shows the raw code."],
    ["Do timestamps work in channel topics and embeds?", "They work in messages, and bots commonly use them in embeds. Support elsewhere, such as some profile fields, can vary, so post the schedule as a message."],
    ["Should I still post the image?", "Many servers do both: the image catches the eye and shows titles, while the timestamp text answers “what time is that for me?”. Attach the PNG to the same message."],
  ],
  body: `      <h2>What the copied text looks like</h2>
      <p>Here is one stream from the week of 26 October 2026, typed as 8:00 PM in London. This is exactly what lands on your clipboard:</p>
      <pre class="ex">${discordEx}</pre>
      <p>In Discord, a member in New York sees “Monday, October 26, 2026 4:00 PM” followed by a countdown, and a member in Tokyo sees Tuesday at 5:00 AM. The bold title and category use normal Discord markdown, and any * or _ in your titles is escaped so it doesn't break the formatting.</p>

      <h2>Timestamp styles</h2>
      <p>Discord supports several styles. StreamWeek uses <strong>F</strong> for the start because it includes the weekday, <strong>t</strong> for the end time, and <strong>R</strong> for the countdown.</p>
      <table>
        <thead><tr><th>Code</th><th>Shows</th><th>Good for</th></tr></thead>
        <tbody>
          <tr><td><code>&lt;t:${ex.unix}:t&gt;</code></td><td>Short time</td><td>End times</td></tr>
          <tr><td><code>&lt;t:${ex.unix}:T&gt;</code></td><td>Time with seconds</td><td>Rarely needed</td></tr>
          <tr><td><code>&lt;t:${ex.unix}:d&gt;</code></td><td>Short date</td><td>Compact lists</td></tr>
          <tr><td><code>&lt;t:${ex.unix}:D&gt;</code></td><td>Long date</td><td>Week headers</td></tr>
          <tr><td><code>&lt;t:${ex.unix}:f&gt;</code></td><td>Date and time</td><td>The default style</td></tr>
          <tr><td><code>&lt;t:${ex.unix}:F&gt;</code></td><td>Weekday, date and time</td><td>Schedule lines</td></tr>
          <tr><td><code>&lt;t:${ex.unix}:R&gt;</code></td><td>Relative, like “in 2 days”</td><td>Countdowns</td></tr>
        </tbody>
      </table>
      <p>The exact wording depends on each member's language setting, so a Japanese client shows Japanese dates.</p>

      <h2>Why you can't just type the time</h2>
      <p>A message that says “8 PM GMT” leaves every member to do their own conversion, and daylight saving makes that error-prone. The timestamp number is a single moment in UTC, so there's nothing to convert by hand. StreamWeek works out that number from your real date and home zone, which is where most hand-made timestamps go wrong: a generator that assumes the wrong offset produces a code that's an hour off.</p>

      <h2>Posting tips</h2>
      <ul>
        <li>Post the schedule in an announcements channel and pin it, then replace it each week.</li>
        <li>Countdowns (<code>R</code>) update live, so a pinned message stays useful all week.</li>
        <li>Days off are listed in plain text at the end, because there is no moment to convert.</li>
        <li>If you change a time mid-week, edit the stream in StreamWeek, copy again and edit your message.</li>
        <li>The <a href="/stream-schedule-time-zones">time-zone guide</a> explains how the conversion behaves around clock changes.</li>
      </ul>
      <p class="note">${NOT_AFFILIATED} Discord timestamp behaviour can change; this page describes it as of ${DATE_H}.</p>`,
});

P.push({
  path: "/twitch-schedule-template", crumb: "Twitch schedule template",
  title: "Twitch Schedule Template — Free Image + Panel | StreamWeek",
  desc: "Free Twitch schedule template: weekly image with your times converted for viewers, a 320-px wide panel version, Discord timestamps and an .ics calendar file.",
  h1: "Twitch Schedule Template",
  lead: "Make a weekly schedule image for socials, a narrow panel for your channel page and a Discord post, from one form.",
  quick: "Fill in your week below, then pick a size: 1920 × 1080 for X and Discord, 1080 × 1920 for Stories, or the 320-px-wide panel for your channel's About section, whose height grows with your week. Times show in your zone and up to 3 viewer zones, and <em>Copy for Discord</em> gives timestamps every viewer sees in their own time.",
  tool: { preset: "twitch" },
  faq: [
    ["Does Twitch have its own schedule feature?", "Yes, channels can add stream segments to a built-in schedule on their channel page. Many streamers also post a schedule image on social media and in Discord, which is what this template is for. You can use both."],
    ["What size is the panel image?", "320 pixels wide, a width commonly used for channel About panels. The height fits your week: offline days take a short row and busy days take more."],
    ["Can I show categories?", "Yes. The game or category field appears as a small tag under each title, for example Just Chatting, Minecraft or Art."],
    ["Will the image look right in dark mode?", "The image carries its own background, so it looks the same on light and dark pages. Midnight neon, Retro arcade and Minimal dark suit dark channel pages; Clean light and Pastel idol stand out on light ones."],
    ["Is this an official Twitch template?", "No. StreamWeek is an independent free tool and isn't affiliated with Twitch. It uses no platform logos or brand colours."],
  ],
  body: `      <h2>Three places your schedule lives</h2>
      <p>Most streamers end up posting the schedule in three places: an image on social media, a panel on the channel page and an announcement in Discord. Keeping three copies in sync by hand is where mistakes creep in, especially when you change one stream mid-week. Here, one form feeds all of them: the PNG sizes, the Discord timestamp text, the X text and the .ics calendar file.</p>

      <h2>The panel version</h2>
      <p>The panel layout is a narrow, stacked list 320 pixels wide. Each day is a row with the day and date on the left and the streams on the right. Offline days collapse to a single short line, so a three-stream week makes a short panel and a busy week a taller one. The title, your handle and the week's dates sit at the top, and the zone line lists which zones the times are in. Re-export it each week, or keep a general version with TBA days if your schedule rarely changes.</p>

      <h2>Retro arcade, or any other theme</h2>
      <p>This page starts with the Retro arcade theme: chunky yellow borders, hard shadows in your accent colour and a checker strip along the edges. If it's too loud for your channel, switch to Minimal dark or Clean light. Every theme takes an accent colour, so you can match your overlay or emotes rather than any platform's colours.</p>

      <h2>Times for viewers in other countries</h2>
      <p>Viewers abroad often lurk because they can't tell when you're live. Pick the 2 or 3 zones your channel analytics show most, and each stream gets a line per zone: “4:00 PM EDT”, “5:00 AM JST +1”. The conversion uses the real date, so it stays right across daylight-saving changes. See the <a href="/stream-schedule-time-zones">time-zone guide</a> for the weeks that usually go wrong.</p>

      <h2>A weekly routine that takes two minutes</h2>
      <ol>
        <li>Open StreamWeek; last week's schedule is still there.</li>
        <li>Click <em>Next week</em>. Every stream moves forward 7 days with the same times.</li>
        <li>Change the titles and any days that differ.</li>
        <li>Download the 1920 × 1080 image and the panel, and copy the Discord text.</li>
        <li>Post, pin and update your channel's built-in schedule if you use it.</li>
      </ol>
      <p class="note">${NOT_AFFILIATED} The 320-px panel width is a common size, not an official specification.</p>`,
});

P.push({
  path: "/youtube-live-schedule-template", crumb: "YouTube Live schedule template",
  title: "YouTube Live Schedule Template — Free Maker | StreamWeek",
  desc: "Free YouTube Live schedule template: a weekly image in common sizes, times converted for viewers abroad, plus Discord timestamps and an .ics calendar file.",
  h1: "YouTube Live Schedule Template",
  lead: "A clean weekly schedule for your live streams and premieres, with times converted for viewers in other countries.",
  quick: "Fill in your streams below, choose a size (1920 × 1080 for a post or banner area, 1080 × 1350 for a 4:5 feed image, 1080 × 1920 for vertical Stories) and click <em>Download PNG</em>. Each stream shows your time and up to 3 viewer zones, with daylight saving handled for that exact week. The .ics file adds the week to anyone's calendar.",
  tool: { preset: "youtube" },
  faq: [
    ["Should I also schedule the streams on YouTube itself?", "If you can, yes. A scheduled stream gets its own watch page that viewers can set a reminder on. The schedule image tells people about the whole week at a glance, and the two work well together."],
    ["Can I list premieres and live streams together?", "Yes. Put “Premiere:” or “Live:” at the start of the title, and use the end time only for live streams if a premiere's length is fixed."],
    ["Which size works best for a channel post?", "1920 × 1080 and 1080 × 1350 are both common choices for image posts. Platforms crop previews differently and change them over time, so check how your post looks after publishing."],
    ["Can my viewers add the schedule to their calendar?", "Yes. Download the .ics file and share it, for example in Discord. Each stream becomes an event at the right moment in every viewer's calendar app, with a 2-hour slot when you didn't set an end time."],
    ["Is this connected to YouTube?", "No. StreamWeek is independent, uses no platform logos or brand colours, and never asks for your account. Everything happens in your browser."],
  ],
  body: `      <h2>A schedule for a global audience</h2>
      <p>Live streams and premieres often draw viewers from several continents, many of whom never see a time in their own zone. A schedule image that shows your time next to two or three of your biggest regions removes the guesswork. Pick the zones from your channel analytics, and each stream gets one line per zone, with +1 or −1 when it falls on another day for that viewer.</p>

      <h2>The Clean light theme</h2>
      <p>This page starts with Clean light: white cards on an off-white background, a thin accent bar at the top and plenty of contrast. It's easy to read on small screens and suits education, music, art and talk channels. Pick your accent colour to match your thumbnails. If your brand is darker, switch to Minimal dark or Midnight neon with the same content.</p>

      <h2>Sizes and where they fit</h2>
      <table>
        <thead><tr><th>Size (px)</th><th>Layout</th><th>Common use</th></tr></thead>
        <tbody>
          ${sizeRows}
        </tbody>
      </table>
      <p>These are common sizes, not platform rules. The layouts keep text away from the edges so a modest crop doesn't cut anything important.</p>

      <h2>Live streams, premieres and Shorts</h2>
      <ul>
        <li><strong>Live streams</strong>: add an end time if you have a hard stop. It shows on the image and sets the length of the calendar event.</li>
        <li><strong>Premieres</strong>: put “Premiere:” in the title; the start time is what matters.</li>
        <li><strong>Members-only streams</strong>: say so in the title so other viewers know.</li>
        <li><strong>Vertical content</strong>: the 1080 × 1920 layout is a stacked list with a large header, built for phone screens.</li>
      </ul>

      <h2>Keep it current with less work</h2>
      <p>The schedule saves in your browser. Each week, click <em>Next week</em> to move every stream 7 days forward, change what's different and export again. When a stream moves, edit it and re-export the image; the Discord text and .ics file update with it, so the copies never disagree.</p>
      <p class="note">${NOT_AFFILIATED}</p>`,
});

/* ----------------------------------------------------------- about/privacy */
P.push({
  path: "/about", crumb: "About",
  title: "About StreamWeek — Free Stream Schedule Maker by Rooh Sites",
  desc: "StreamWeek is part of Rooh Sites' free tools: small, private web tools that run in your browser. Who makes it, why it's free and how it handles your data.",
  h1: "About StreamWeek",
  lead: "A small, free tool that does one job: a weekly stream schedule with the times converted for your viewers.",
  noRelated: true,
  body: `      <p>StreamWeek is part of <a href="https://roohsites.com/">Rooh Sites</a>' collection of free single-purpose web tools. It's built for streamers and VTubers who post a schedule every week on X, Discord and Instagram and have viewers in more than one time zone.</p>
      <h2>Why we built it</h2>
      <p>Schedule templates make good-looking images, but they leave the hard part to you: working out what 8 PM your time is in Tokyo or New York, in the weeks when daylight saving shifts everything by an hour. StreamWeek does that conversion from real dates, then turns one form into images, Discord timestamps, X text and a calendar file.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free, with no account and no paid tier. Each exported image has a small “Made with StreamWeek · streamschedule.roohsites.com” credit in a bottom corner, away from your schedule. That's how other streamers find the tool. The copied text and the .ics file have no credit.</p>
      <h2>How it works</h2>
      <p>Everything runs in your browser. Time zones come from your browser's built-in time-zone database, images are drawn on a canvas on your device with the open-source Inter typeface, and your schedule is saved in local storage. Nothing you type or upload is sent to us.</p>
      <p>${NOT_AFFILIATED} Platform names are used only to describe what the tool works with.</p>`,
});
P.push({
  path: "/privacy", crumb: "Privacy & Terms",
  title: "Privacy & Terms: Your Schedule Never Leaves Your Device",
  desc: "How StreamWeek handles your data: your schedule, avatar and settings are processed and stored on your device and never uploaded. Cookie-free analytics.",
  h1: "Privacy & Terms",
  lead: "Short version: your schedule and pictures never leave your device.",
  noRelated: true,
  body: `      <h2>Privacy</h2>
      <p>StreamWeek runs entirely in your browser. Stream titles, times, time zones and any avatar, logo or model art you add are processed on your device to build the preview, the PNG images, the copied text and the .ics file. They are never sent to our servers or to anyone else.</p>
      <p>To save you retyping, the tool remembers your schedule and your picture in this browser's local storage. Clearing your browser's site data deletes them.</p>
      <p>We use two privacy-friendly analytics services, Vercel Web Analytics and Umami, to count page views and a few anonymous events, such as “PNG downloaded” with the size and theme. Neither uses cookies or tracks you across sites, and neither ever receives what you type into the tool.</p>
      <h2>Terms</h2>
      <p>StreamWeek is provided “as is”, without warranty. Check your schedule before posting. You're responsible for what you publish and for having the rights to any picture you add. StreamWeek is free for personal and commercial use.</p>
      <p>Questions? See the <a href="/about">About page</a>.</p>`,
});

let count = 0;
for (const p of [home, ...P]) {
  const file = p.path === "/" ? "index.html" : p.path.slice(1) + ".html";
  const schema = [...(p.schema || [])];
  if (p.tool && p.path !== "/") schema.unshift(appLd(p.h1, p.path, strip(p.desc)));
  let html = page({ ...p, schema });
  // Keep the network links the orchestrator filled in, so regenerating never wipes them.
  const NET = /<!--NETWORK:START-->[\s\S]*?<!--NETWORK:END-->/;
  const prev = existsSync(join(OUT, file)) ? (readFileSync(join(OUT, file), "utf8").match(NET) || [])[0] : null;
  if (prev) html = html.replace(NET, () => prev);
  writeFileSync(join(OUT, file), html);
  const dl = strip(p.desc).length;
  if (p.title.length < 45 || p.title.length > 62) console.warn(`title ${p.title.length}: ${p.title}`);
  if (dl < 120 || dl > 158) console.warn(`desc ${dl}: ${p.path}`);
  count++;
}

writeFileSync(join(OUT, "llms.txt"), `# ${NAME}

> ${NAME} is a free online stream schedule maker for streamers and VTubers. You type your week once, in your own time zone, and it converts every stream for up to 3 viewer time zones using real dates, so daylight-saving changes are correct for that exact week. It exports PNG images at 1920×1080, 1200×675, 1080×1920 (Stories), 1080×1350 (4:5) and a 320-px-wide panel, copies the schedule as Discord timestamps (<t:UNIX:F> and <t:UNIX:R>, shown in each reader's own time zone) or as plain text for X, and downloads an .ics calendar file with times in UTC. It runs entirely in the browser with no signup; the schedule autosaves in local storage and uploaded pictures are never sent anywhere. Every feature is free. There is no paid tier. Each exported image carries a small "Made with StreamWeek · streamschedule.roohsites.com" credit in a bottom corner.

## Tool
- [Stream schedule maker with time zones](${URL}/): weekly schedule image, Discord timestamps, X text and .ics from one form.

## Templates
- [VTuber schedule template](${URL}/vtuber-schedule-template): bilingual EN/JP day labels, JST as a viewer zone, pastel theme, model-art slot.
- [Twitch schedule template](${URL}/twitch-schedule-template): social image plus a 320-px panel whose height fits the week.
- [YouTube Live schedule template](${URL}/youtube-live-schedule-template): clean theme, common image sizes, calendar file for viewers.

## Guides
- [Stream schedule with time zones](${URL}/stream-schedule-time-zones): how conversion works, DST weeks that differ between Europe and the US, spring-forward gaps, +1/−1 marks.
- [Stream schedule for Discord](${URL}/stream-schedule-for-discord): Discord timestamp codes and styles, with a copy button.

## Key facts
- Price: completely free. No paid tier.
- Privacy: schedule, settings and pictures stay in the browser. No account.
- Time zones: browser Intl time-zone database, no library. Quick presets JST, PT, ET, UK, CET, AEST, IST.
- Day crossings: converted times on another day are marked +1 or −1.
- Themes: Midnight neon, Pastel idol, Clean light, Retro arcade, Minimal dark, plus an accent colour.
- Labels: English, Japanese or bilingual day names; 12-hour or 24-hour clock.
- ${NOT_AFFILIATED}

## Optional
- [About](${URL}/about)
- [Privacy & Terms](${URL}/privacy)
`);
console.log(`wrote ${count} pages + llms.txt`);
