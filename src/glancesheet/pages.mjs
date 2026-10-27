// Generates every GlanceSheet page (home, landing pages, checklist, about, privacy) from one layout.
// Usage: node src/glancesheet/pages.mjs   (writes into sites/glancesheet/)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/glancesheet");
const C = createRequire(import.meta.url)(join(OUT, "core.js"));
const URL = "https://iepglance.roohsites.com";
const NAME = "GlanceSheet";
const ACCENT = "#6b21a8";
const DATE = "2026-10-25", DATE_H = "25 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

const FOOT = `  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">IEP at a glance template</a></li><li><a href="/iep-accommodations-checklist">Accommodations checklist</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Templates and guides</h4><ul><li><a href="/iep-snapshot-template">IEP snapshot template</a></li><li><a href="/504-plan-at-a-glance-template">504 plan at a glance</a></li><li><a href="/accommodations-matrix-template">Accommodations matrix</a></li><li><a href="/student-at-a-glance-template">Student at a glance (subs and paras)</a></li></ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. ${NAME} is an independent tool, not affiliated with any school, district or government agency. It makes summaries, not legal documents. Always follow the full IEP or 504 plan and your district's rules for student records.</p>
  </footer>`;

const RELATED = `      <h2>More templates and guides</h2>
      <ul class="related">
        <li><a href="/">IEP at a glance template</a></li>
        <li><a href="/iep-snapshot-template">IEP snapshot template</a></li>
        <li><a href="/504-plan-at-a-glance-template">504 plan at a glance</a></li>
        <li><a href="/accommodations-matrix-template">Accommodations matrix</a></li>
        <li><a href="/iep-accommodations-checklist">Accommodations checklist</a></li>
        <li><a href="/student-at-a-glance-template">Student at a glance for subs</a></li>
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
<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}
</script>
</head>`;
}

const PUBLISHER = { "@type": "Organization", name: "Rooh Sites", url: "https://roohsites.com/" };
const faqLd = faq => ({ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
const FEATURES = [
  "One-page IEP at a Glance PDF per student, shrunk within a font floor and checked to fit on one page", "Caseload batch PDF with one page per selected student",
  "Class accommodations matrix PDF with rotated headers, a numbered key and repeated headers on every page", "504 Plan at a Glance variant without goals and services",
  "Sub and para version with only strengths, what helps, watch for, accommodations and contacts", "Initials-only printing switch, on by default, with optional full names",
  "About 60 plain-language accommodations in six groups with search and custom entries", "Goals, services, dates, behavior plan, health note and key contacts, each hideable from the printout",
  "Autosave in the browser, JSON backup and restore, and a delete-all-data button", "Letter and A4 paper, no photos, nothing uploaded",
];
const appLd = (name, path, desc) => ({
  "@type": "WebApplication", name, url: URL + path, description: desc, applicationCategory: "EducationalApplication",
  operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, featureList: FEATURES, publisher: PUBLISHER,
});
const howToLd = (name, steps) => ({ "@type": "HowTo", name, totalTime: "PT10M", step: steps.map(([n, t]) => ({ "@type": "HowToStep", name: n, text: strip(t) })) });
const stepsHtml = steps => `      <ol class="steps">\n${steps.map(([n, t]) => `        <li><strong>${esc(n)}.</strong> ${t}</li>`).join("\n")}\n      </ol>`;
const faqHtml = faq => `      <h2 id="faq">Frequently asked questions</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}`;
const updated = extra => `      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the Rooh Sites team.${extra ? " " + extra : ""}</p>`;

function page({ path, title, desc, h1, lead, quick, badges, tool, body, faq = [], crumb, schema = [], noRelated, note }) {
  const isHome = path === "/";
  const graph = [];
  if (!isHome) graph.push({ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` },
    { "@type": "ListItem", position: 2, name: crumb || h1, item: URL + path }] });
  graph.push(...schema);
  if (faq.length) graph.push(faqLd(faq));
  const navHtml = isHome
    ? `<a href="#how">How it works</a><a href="/iep-accommodations-checklist">Accommodations checklist</a><a href="#faq">FAQ</a>`
    : `<a href="/">IEP at a glance maker</a><a href="/iep-accommodations-checklist">Accommodations checklist</a><a href="/about">About</a>`;
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
${quick ? `    <div class="content narrow quick"><p class="tldr"><strong>Quick answer:</strong> ${quick}</p></div>\n` : ""}${tool ? `    <section class="tool" aria-label="IEP at a Glance maker"><div id="gs-tool"${toolAttr}><noscript><p class="notice">GlanceSheet needs JavaScript to build the sheets. Nothing is uploaded; it all runs in your browser.</p></noscript></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? faqHtml(faq) + "\n" : ""}${noRelated ? "" : RELATED + "\n"}${updated(note === undefined ? "A summary tool, not legal advice. Follow the full IEP or 504 plan." : note)}
    </article>
  </main>
${FOOT}
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

const SUMMARY = "A GlanceSheet is a summary, not the IEP or the 504 plan. The full plan is the document your school follows, so use the sheet to find your way in and the plan for the details.";
const POLICY = "Student records are protected information, so use the tools your district approves and follow its rules on where records are stored and who may see them. GlanceSheet keeps what you type on your own device and uploads nothing, but it cannot know your district's policy.";

/* ------------------------------------------------------------------ home */
const homeSteps = [
  ["Add your students", "Press <em>Add student</em> for each child on your caseload, or load the three-student example to see how it works. Leave <em>Initials only</em> switched on, so the printed sheets show initials. A full name is optional."],
  ["Fill in the basics", "Enter grade, school year, case manager and contact, and the plan type (IEP or 504 plan). Add the meeting, annual review and re-evaluation dates if you want to track them. The editor shows how many days are left; the printout only shows dates if you ask it to."],
  ["Write what a teacher needs", "List strengths and interests, what helps and what to watch for in short plain bullets. Tick accommodations from the list of about 60, search it, or add your own. Add goal summaries, services, a behavior plan note and key contacts. Hide any section you do not want on the printout."],
  ["Check that it fits one page", "A line above the form tells you if the sheet fits on one page. If it does not, the line names the sections to trim, and the PDF shortens them and says so instead of running onto a second page."],
  ["Download and share", "Download one student's sheet, the whole caseload as one page per student, a class accommodations matrix for a teacher, a 504 version, or the sub and para version. Share them the way your district says to."],
];
const homeFaq = [
  ["Is GlanceSheet really free?", "Yes. Every feature is free, with no account, no email wall and no limit on how often you use it. Each PDF has a small “Made with GlanceSheet” line in the bottom margin, which is how other teachers find the tool."],
  ["What is an IEP at a Glance?", "It is a one-page summary of a student's plan for the adults who work with the student but do not read the whole IEP, such as general education teachers, substitutes and paraprofessionals. It lists strengths, what helps, what to watch for, accommodations, and who to ask. It is a summary, not the IEP, and the full IEP is what the school follows."],
  ["Does it store my students' information on a server?", "No. Everything you type stays in this browser's local storage on your device, and the PDFs are built in your browser. Nothing is uploaded. Analytics count that a PDF was made and what kind, and never receive anything you type."],
  ["Is it FERPA compliant, or approved by my district?", "GlanceSheet makes no such claim and has no district approval. It keeps data on your device and uploads nothing, but your district decides which tools may be used with student records. Check with your administrator or technology department, and use initials only whenever you can."],
  ["Why does the sheet use initials by default?", "Printed sheets get left on desks, photocopied and emailed. Initials make a lost page less revealing. The Initials only switch is on by default, and you can turn it off if your school prefers names on the page. Full names are optional either way."],
  ["What is the difference between accommodations and modifications?", "Accommodations change how a student learns or shows what they know, for example extra time or a quiet room. Modifications change what the student is expected to learn or do, for example a different or reduced learning target. GlanceSheet keeps them in two separate lists."],
  ["Can I make a sheet for a 504 plan?", "Yes. Choose 504 as the plan type, or pick the 504 Plan at a Glance version when you download. That sheet is titled 504 Plan at a Glance and leaves out goals and services."],
  ["What is the substitute and para version?", "A shorter sheet with only strengths, what helps, what to watch for, accommodations and key contacts. It drops dates, goals and services, so a sub sees what they need for one day and nothing more."],
  ["How do I keep my caseload for next year or use another computer?", "Use Export backup to save a JSON file, and Import backup on the other computer or next year. The file contains whatever you typed, including any names, so store it somewhere private. The Delete all data button clears the browser's copy, which is a good habit on a shared computer."],
  ["What if the sheet will not fit on one page?", "The editor warns you and names the sections to trim. The PDF never adds a second page. At the smallest allowed text size it shortens the longest sections, marks them with “More in the full plan”, and lists anything it had no room for."],
];
const home = {
  path: "/",
  title: "IEP at a Glance Template (Free, Editable, Printable)",
  desc: "Free, editable IEP at a glance template: make a one-page student sheet, a whole-caseload batch, a class accommodations matrix and 504 or sub versions.",
  h1: "IEP at a Glance Template (Free, Editable, Printable)",
  lead: "Make a clear one-page summary of each student's accommodations, goals and supports, then print the whole caseload or a class accommodations matrix. Free, no signup, and what you type never leaves your browser.",
  quick: `An IEP at a glance is a one-page summary of a student's plan for the teachers, substitutes and paras who do not read the full IEP. To make one here, add a student below, fill in strengths, what helps, what to watch for and accommodations, check that it fits one page, and download the PDF. Initials print by default. It is a summary, not the IEP, so the full plan is still the document to follow.`,
  badges: ["100% free", "No signup", "Initials only by default", "Stays on your device", "Letter or A4"],
  tool: { preset: "" },
  schema: [appLd(NAME, "/", "Free, editable IEP at a Glance maker. One-page student sheets, caseload batch PDF, class accommodations matrix, 504 and sub versions. Runs in the browser; nothing is uploaded."), howToLd("How to make an IEP at a Glance", homeSteps)],
  faq: homeFaq,
  body: `      <h2 id="how">How to make an IEP at a glance in 5 steps</h2>
${stepsHtml(homeSteps)}
      <p class="note"><strong>A summary, not the plan.</strong> ${SUMMARY} ${POLICY}</p>

      <h2>What goes on an IEP at a glance</h2>
      <p>A good sheet answers the questions a teacher has on the first morning with a new student: who is this child, what are they good at, what helps, what should I look out for, and who do I ask. The sheet is built around those questions and nothing else.</p>
      <ul>
        <li><strong>Strengths and interests.</strong> Start with what is going well. It helps teachers connect with the student before they manage anything.</li>
        <li><strong>What helps.</strong> Strategies that work in the classroom, in plain words: “Give directions one step at a time” is more useful than “benefits from chunking.”</li>
        <li><strong>Watch for.</strong> Early signs that something is getting hard, such as going quiet, tapping, or asking to leave.</li>
        <li><strong>Accommodations.</strong> The supports that change how the student learns or shows learning, grouped as presentation, response, setting, timing and scheduling, organization and behavior, and testing.</li>
        <li><strong>Modifications.</strong> Changes to what the student is expected to learn, kept separate so nobody mixes them up.</li>
        <li><strong>Goals and services.</strong> A line or two on each goal, plus the minutes, how often, where and who provides each service.</li>
        <li><strong>Key contacts.</strong> The case manager and other school staff by role, so a teacher knows whom to ask.</li>
        <li><strong>Dates, if you want them.</strong> IEP or 504 meeting, annual review and re-evaluation dates help a case manager keep track. Every section can be hidden from the printout.</li>
      </ul>

      <h2>What to leave off</h2>
      <p>A sheet that travels around a building should hold the least personal information that still does the job. Leave off diagnoses a teacher does not need in order to teach, test scores, family details and anything from a private evaluation. Eligibility category is off by default for that reason, and the health and safety note is short on purpose. For medical information, follow your school's health-plan process rather than relying on a classroom handout. There are no photo uploads at all.</p>
      <p>When in doubt, ask your administrator what may appear on a page that other staff will see, and use initials. You can turn names on at any time.</p>

      <h2>One sheet, five outputs</h2>
      <div class="cards">
        <div class="card"><h3>One student</h3><p>The full IEP at a Glance on a single page, with text shrunk slightly only if it needs to be.</p></div>
        <div class="card"><h3>Whole caseload</h3><p>One page per ticked student in a single PDF, ready to print for the first week of school.</p></div>
        <div class="card"><h3>Class matrix</h3><p>Students down the side, accommodations across the top, a check mark in each cell. <a href="/accommodations-matrix-template">See the matrix</a>.</p></div>
        <div class="card"><h3>504 version</h3><p>The same sheet titled 504 Plan at a Glance, without goals and services. <a href="/504-plan-at-a-glance-template">See the 504 page</a>.</p></div>
        <div class="card"><h3>Sub and para</h3><p>Only what a sub needs for the day. <a href="/student-at-a-glance-template">See the sub version</a>.</p></div>
      </div>

      <h2>Tips for case managers</h2>
      <ul>
        <li><strong>Write for a stranger.</strong> Imagine a substitute who has never met the student. Would they know what to do after reading each bullet?</li>
        <li><strong>Keep the list short.</strong> A teacher will use eight accommodations well and thirty badly. Put the ones that matter most for daily work on the sheet and leave the rest to the full plan.</li>
        <li><strong>Hand it over early.</strong> Give each teacher the sheet at the start of the year or term, and again after any plan meeting that changes it.</li>
        <li><strong>Match the plan.</strong> Copy accommodations from the IEP or 504 plan as written. The sheet should never add or drop a support.</li>
        <li><strong>Ask for feedback.</strong> After a few weeks, ask a teacher what they used and what was missing, and edit. The sheet is easy to change and print again.</li>
        <li><strong>Keep a backup.</strong> Export the JSON backup after every big update so you can reload it next year.</li>
      </ul>

      <h2>Accommodations and modifications are different</h2>
      <table>
        <thead><tr><th></th><th>Accommodations</th><th>Modifications</th></tr></thead>
        <tbody>
          <tr><th scope="row">What changes</th><td>How the student learns or shows learning</td><td>What the student is expected to learn or do</td></tr>
          <tr><th scope="row">Example</th><td>Extra time, a quiet room, directions read aloud</td><td>A different or reduced learning target</td></tr>
          <tr><th scope="row">On the sheet</th><td>Ticked from a list of about 60, grouped in six categories</td><td>Written in their own short list</td></tr>
        </tbody>
      </table>
      <p>IEPs are written under the Individuals with Disabilities Education Act (IDEA) for students who receive special education. 504 plans come from Section 504 of the Rehabilitation Act and describe the accommodations and services a student with a disability needs to take part in school. Both kinds of plan can include accommodations. Your school team decides what goes in a plan, and this tool only helps you summarize it.</p>

      <h2>Your students' information stays on your device</h2>
      <p>GlanceSheet is a web page that runs in your browser. The caseload you build is saved in your browser's local storage so it is still there tomorrow, and the PDFs are made on your own computer. Nothing is uploaded, and analytics only learn which kind of PDF was made, never what is in it. On a shared computer, export a backup if you need one and use the <em>Delete all data from this browser</em> button before you leave. The <a href="/privacy">privacy page</a> explains this in more detail.</p>`,
};

/* --------------------------------------------------- checklist sentences */
const SENTENCE = {
  "pres-aloud": "Read directions out loud, then say them again, or let the student ask for a repeat.",
  "pres-text-aloud": "Read text, questions and assignments aloud, or provide a reader or text-to-speech tool, when the plan says so.",
  "pres-audio": "Provide recorded or digital audio versions of books and class texts.",
  "pres-large": "Give enlarged print or zoomed digital materials so the student can see them comfortably.",
  "pres-notes": "Hand over a copy of your notes or an outline so the student can listen instead of copying.",
  "pres-visual": "Post the schedule and give steps in pictures or writing as well as speech.",
  "pres-models": "Show a finished example or model before the student starts.",
  "pres-onestep": "Give one direction at a time and wait for the student to finish before giving the next.",
  "pres-highlight": "Highlight or bold the key words in directions and texts.",
  "pres-space": "Put fewer problems on each page and leave room between them.",
  "pres-check": "Ask the student to tell you what they are going to do before they begin.",
  "pres-vocab": "Give a list of key words with short meanings to keep at the desk.",
  "resp-calc": "Let the student use a calculator for the tasks the plan names.",
  "resp-facts": "Keep a multiplication chart or fact sheet on the desk during math.",
  "resp-scribe": "A trusted adult writes what the student says, or the student dictates into a speech-to-text tool.",
  "resp-type": "Let the student type instead of handwriting.",
  "resp-oral": "Accept a spoken answer in place of a written one.",
  "resp-spell": "Allow spell-check or word prediction while writing.",
  "resp-organizer": "Give a graphic organizer to plan writing before drafting.",
  "resp-frames": "Offer sentence starters such as “I think ___ because ___.”",
  "resp-mark": "Let the student circle or mark answers in the booklet instead of filling in a separate sheet.",
  "resp-choice": "Offer a choice, such as a short talk, a poster or a model, as long as it shows the same learning.",
  "set-seat": "Seat the student where the plan says, often near the teacher or board and away from distractions.",
  "set-quiet": "Offer a quiet spot or study carrel for independent work.",
  "set-model": "Seat the student near classmates who are steady, positive models.",
  "set-fidget": "Allow a standing desk, wiggle cushion or quiet fidget tool, as the plan lists.",
  "set-headphones": "Allow noise-reducing headphones during independent work.",
  "set-calm": "Keep a calm spot available and agree on how the student asks to use it.",
  "set-adult": "Have an adult stop by during work to check in quietly.",
  "set-light": "Reduce glare or adjust the lighting where the student works.",
  "set-access": "Keep paths clear and seating set up so the student can move and work easily.",
  "time-ext": "Allow time and a half (1.5 times the usual time) on tests and assignments.",
  "time-process": "Wait a few extra seconds after asking a question before expecting an answer.",
  "time-breaks": "Let the student take a short break when needed, using the signal or routine you agreed on.",
  "time-chunk": "Break a long assignment into smaller parts and check in after each part.",
  "time-submit": "Allow extra time to turn in assignments, as the plan describes.",
  "time-warn": "Tell the student a few minutes before the activity changes.",
  "time-preview": "Show the day's schedule at the start and mention any change ahead of time.",
  "time-split": "Give long tests in two or more sessions instead of one.",
  "org-planner": "Check that the student wrote down assignments in a planner or notebook each day.",
  "org-checklist": "Give a checklist for tasks with several steps.",
  "org-color": "Use one color for each subject for folders and materials.",
  "org-extra": "Keep a spare set of books or materials at home so nothing is forgotten.",
  "org-timer": "Use a visual timer to show how much time is left.",
  "org-praise": "Notice and name what the student does well, often and specifically.",
  "org-reward": "Use the reinforcement system in the plan, such as a token board, the same way every day.",
  "org-private": "Redirect quietly and privately instead of correcting in front of the class.",
  "org-preteach": "Preview new routines or events ahead of time so the student knows what to expect.",
  "org-firstthen": "Show what comes first and what comes next with a simple first/then board.",
  "org-pass": "Let the student leave class or go to a named safe person using the agreed pass or signal.",
  "org-checkin": "Have the student check in with a trusted adult at the start and end of the day.",
  "org-buddy": "Pair the student with a partner for group work.",
  "test-small": "Give the test in a small group or a separate room, as the plan specifies.",
  "test-aloud": "Read test items aloud where the test and the plan allow it.",
  "test-scribe": "Let the student dictate answers to a scribe or use speech-to-text on tests.",
  "test-breaks": "Allow short supervised breaks during a test.",
  "test-bank": "Provide a word bank on tests.",
  "test-ref": "Provide a formula sheet or reference card on tests.",
  "test-oral": "Offer an oral answer option where the test allows it.",
  "test-time": "Schedule tests at the time of day the student works best.",
  "test-proctor": "Have a familiar adult give the test.",
  "test-preview": "Show the test format and directions before test day.",
  "test-state": "Follow the state and district test accommodations listed in the student's plan.",
};
for (const a of C.ACCOMMODATIONS) if (!SENTENCE[a.id]) throw new Error("missing sentence for " + a.id);
const checklistHtml = C.CATEGORIES.map(c => `      <h3>${esc(c.name)}</h3>\n      <ul class="check">\n${C.ACCOMMODATIONS.filter(a => a.cat === c.id).map(a => `        <li><strong>${esc(a.text)}.</strong> ${esc(SENTENCE[a.id])}</li>`).join("\n")}\n      </ul>`).join("\n");
const COUNT = C.ACCOMMODATIONS.length;

/* ---------------------------------------------------------- landing pages */
const P = [];
const LEGAL_NOTE = "Your school team decides what belongs in a student's plan. This page is general information, not legal advice.";

P.push({
  path: "/iep-snapshot-template", crumb: "IEP snapshot template",
  title: "IEP Snapshot Template: One-Page Student Summary (Free)",
  desc: "Free IEP snapshot template: turn a long IEP into a one-page student summary with strengths, accommodations, goals and services. Editable, printable, private.",
  h1: "IEP Snapshot Template: One-Page Student Summary",
  lead: "A snapshot is the part of an IEP a teacher can use on Monday morning. Build one for each student, edit it whenever the plan changes, and print it in seconds.",
  quick: "An IEP snapshot is a one-page summary of an IEP that shows a teacher the essentials: strengths, what helps, accommodations, goals, services and who to contact. Add your student below, tick what applies, and download the PDF. It is a summary, not the IEP.",
  badges: ["Free", "Editable", "Printable", "No signup"],
  tool: { preset: "" },
  faq: [
    ["What is an IEP snapshot?", "An IEP snapshot is a short summary of an Individualized Education Program, usually one page, written for the adults who teach the student day to day. It pulls out the parts a teacher needs to act on and points to the full IEP for everything else."],
    ["How is a snapshot different from an IEP at a glance?", "They are the same idea with different names. Schools also say student snapshot, one-page profile, IEP summary or cheat sheet. GlanceSheet makes all of them, and the template here is the same one-page sheet."],
    ["Can a snapshot replace the IEP?", "No. A snapshot is a summary. The full IEP is the plan the school follows, so teachers should read the full plan or ask the case manager when the snapshot does not answer a question."],
    ["How long does it take to make one?", "Most case managers can fill in a student in about ten minutes by copying from the IEP. After that, updates take a minute, and the whole caseload can be printed in one go."],
    ["Is the template editable?", "Yes. It is a live form, not a static file. Change anything, and download the PDF again. Your caseload autosaves in your browser, and a JSON backup lets you reload it later."],
  ],
  body: `      <h2>A snapshot is for the person who has five minutes</h2>
      <p>A full IEP can run fifteen pages or more, and for good reason: it holds the present levels, the goals, the services, the accommodations and the legal details. A general education teacher with 120 students does not need all that on the first day. They need to know how to set this child up to succeed. An IEP snapshot does that job.</p>
      <p>The best snapshots are short enough to read standing up, written in plain words, and honest about being a summary. They carry the same information as the IEP, in a form that fits on a clipboard.</p>

      <h2>What this snapshot template includes</h2>
      <ul>
        <li>A header with the student's initials or name, grade, school year, case manager and contact.</li>
        <li>Optional meeting, annual review and re-evaluation dates.</li>
        <li>Strengths and interests, what helps, and what to watch for.</li>
        <li>Accommodations chosen from about ${COUNT} plain-language options, plus your own.</li>
        <li>A separate list for modifications.</li>
        <li>Goal summaries by area, and services with minutes, frequency, setting and provider role.</li>
        <li>A behavior plan note, an optional short health and safety note, and key contacts by role.</li>
      </ul>
      <p>Every section has a switch to hide it from the printout, so one student record can produce a fuller sheet for the case manager's file and a shorter one for the teacher.</p>

      <h2>How to write a snapshot people will actually use</h2>
      <p>Start from the IEP, not from memory. Copy accommodations as they are written and shorten only the wording, never the meaning. Put the student's strengths first, because a teacher who knows what a child loves will find it easier to build a relationship. Write what helps as things a teacher can do: “Check in quietly before group work,” not “needs support with transitions.”</p>
      <p>Goal summaries should be one or two lines: the area, and what the student is working toward. Teachers rarely need the baseline, the measurement method or the exact wording, which belong in the IEP. Services should say how much, how often, where and who, so a teacher can plan around a pull-out schedule.</p>

      <h2>Keep the snapshot current</h2>
      <p>A snapshot goes stale the day the IEP changes. After each amendment or annual meeting, update the sheet, print it again and replace the old copy in each teacher's folder. The editor shows how many days remain until the annual review and the re-evaluation, so the update does not slip past you. Those countdowns stay in the editor and are not printed unless you tick the option.</p>

      <h2>Share it carefully</h2>
      <p>Each sheet is marked “Confidential: share only with staff who work with this student,” and the footer reminds readers that it is a summary and that the full IEP is what to follow. ${POLICY}</p>
      <p>Want the full walkthrough? See the <a href="/">main IEP at a glance template page</a>, or build a <a href="/accommodations-matrix-template">class accommodations matrix</a> for one teacher's roster.</p>`,
});

P.push({
  path: "/504-plan-at-a-glance-template", crumb: "504 plan at a glance template",
  title: "504 Plan at a Glance Template (Free, One-Page PDF)",
  desc: "Free 504 plan at a glance template: a one-page summary of a student's 504 accommodations for teachers. Editable, printable, and private in your browser.",
  h1: "504 Plan at a Glance Template",
  lead: "A one-page summary of a student's 504 accommodations and supports, titled 504 Plan at a Glance, with no goals or services section to fill in.",
  quick: "A 504 plan at a glance is a one-page summary of the accommodations in a student's 504 plan, written for the teachers who carry them out. Pick the 504 version below, add the student's strengths, what helps and accommodations, and download the PDF. It is a summary, not the 504 plan.",
  badges: ["504 version", "Free", "Editable", "Initials only by default"],
  tool: { preset: "504" },
  faq: [
    ["What is a 504 plan?", "A 504 plan describes the accommodations and services a student with a disability needs so they can take part in school. It comes from Section 504 of the Rehabilitation Act, a civil rights law, and it is separate from an IEP, which comes from the Individuals with Disabilities Education Act (IDEA) and is for students who receive special education."],
    ["How is a 504 sheet different from an IEP sheet?", "The 504 version is titled 504 Plan at a Glance and leaves out the goals and services sections, because a 504 plan is usually built around accommodations. Everything else works the same, including strengths, what helps, accommodations and contacts."],
    ["Can I use the same tool for both IEP and 504 students?", "Yes. Set the plan type for each student, and the Standard sheet version gives IEP students the IEP sheet and 504 students the 504 sheet. You can also force the 504 version for any student."],
    ["Who should get a 504 at a glance?", "The teachers and staff who carry out the accommodations, such as classroom teachers, specialists and substitutes. Share it only with staff who work with the student, and follow your district's rules for student records."],
    ["Is this a replacement for the 504 plan?", "No. It is a summary. The 504 plan is the document your school follows, so use the sheet to remember the key supports and the plan for the details."],
  ],
  body: `      <h2>Built for accommodations</h2>
      <p>Most 504 plans are about access: what a student needs so that a disability does not keep them from learning alongside their classmates. That usually means a short list of accommodations, a few strategies, and a clear person to ask. A 504 plan at a glance puts those on one page. Because the plan typically does not carry special education goals or services, the 504 version of the sheet leaves those sections out.</p>

      <h2>What is on the 504 sheet</h2>
      <ul>
        <li><strong>Header.</strong> Initials or name, grade, school year, plan type, case manager or 504 coordinator and contact, and optional meeting and review dates.</li>
        <li><strong>Strengths and interests.</strong> Short bullets about what the student does well.</li>
        <li><strong>What helps and watch for.</strong> The classroom strategies that work and the early signs that something is getting hard.</li>
        <li><strong>Accommodations.</strong> Ticked from a list of about ${COUNT} plain-language options, grouped by presentation, response, setting, timing and scheduling, organization and behavior, and testing. Add your own where the plan says something the list does not.</li>
        <li><strong>Health and safety note and key contacts.</strong> Optional, short, and by role. For medical information, follow your school's health-plan process.</li>
      </ul>
      <p>Every section can be hidden from the printout, and the footer reads “This is a summary, not the 504 plan. Follow the full 504 plan.”</p>

      <h2>Common 504 accommodations teachers see</h2>
      <p>The accommodations below come up often. They are examples of the kinds of supports that appear on plans, not a recommendation for any student. Which ones belong in a plan is a decision for the student's team.</p>
      <ul>
        <li>Extended time on tests and assignments, and tests in a quieter or separate setting.</li>
        <li>Preferential seating, or a seat chosen to cut down on distractions.</li>
        <li>Breaks as needed, with an agreed signal.</li>
        <li>A copy of class notes, or directions given in writing as well as aloud.</li>
        <li>Use of a calculator, a spell-check tool or speech-to-text.</li>
        <li>An assignment planner checked daily, and chunked assignments with check-ins.</li>
      </ul>
      <p>The <a href="/iep-accommodations-checklist">accommodations checklist</a> explains what each one looks like in a classroom.</p>

      <h2>Keep it to one page</h2>
      <p>A sheet that spills onto a second page tends not to get read. As you add accommodations, the line above the form tells you whether the page still fits. When it does not, it names the sections to trim, and the PDF never prints a second page. The summary is the part people read, and the 504 plan holds the detail. ${LEGAL_NOTE}</p>
      <p>If you manage both kinds of plan, start at the <a href="/">main IEP at a glance page</a> and build the whole caseload in one place.</p>`,
});

P.push({
  path: "/accommodations-matrix-template", crumb: "Accommodations matrix template",
  title: "Accommodations Matrix Template for Teachers (Free PDF)",
  desc: "Free accommodations matrix template: students down the side, accommodations across the top, check marks, a numbered key and a landscape PDF for one class.",
  h1: "Accommodations Matrix Template for Teachers",
  lead: "Show one class's accommodations on a single chart: students down the side, accommodations across the top, a check mark where it applies. Built from the same student records as the sheets.",
  quick: "An accommodations matrix is a chart for one class: rows are students (initials), columns are the accommodations any of them use, and a check mark shows who gets what. Add students below, tick the ones in the class, enter a class name and download the landscape PDF.",
  badges: ["Landscape PDF", "Numbered key", "Initials by default", "Free"],
  tool: { preset: "matrix" },
  faq: [
    ["What is an accommodations matrix?", "It is a grid for one class or period. Each row is a student and each column is an accommodation. A check mark means that accommodation is listed for that student. It lets a teacher see the whole class at once instead of opening each plan."],
    ["How do I make one for my class?", "Add or select the students in your caseload who are in that class, tick them in the list, type a class name and press Download class matrix. If a student is in several classes, tick them for each one and print a matrix per class."],
    ["What happens when I have many students or accommodations?", "The matrix paginates. When there are too many columns, it splits them across pages and repeats the student column and the headers on every page. When there are too many rows, it continues onto the next page with the same headers. The numbered key lists every accommodation in full."],
    ["Can the matrix show names instead of initials?", "Yes, when you switch off Initials only. By default the rows show initials, which is safer for a page that may be posted at a desk or left in a folder."],
    ["Who should see the matrix?", "The teacher and staff who work with those students. It collects several students' supports on one page, so handle it with the same care as the plans, and follow your district's rules on student records."],
  ],
  body: `      <h2>See the whole class in one glance</h2>
      <p>A general education teacher with six students on plans might hold six different documents, each with a different layout and a different level of detail. An accommodations matrix turns that into one chart. Down the left side are the students, across the top are the accommodations, and a check mark in a cell says that accommodation applies. A teacher can spot at a glance that four of six students need directions repeated, three need extended time, and two need to test in a small group, and then plan the lesson and the test day around that.</p>

      <h2>How the matrix is built</h2>
      <ul>
        <li><strong>Rows.</strong> One row per ticked student, labelled with initials (or names if you turn initials-only off). Two students with the same initials are numbered so they stay distinct.</li>
        <li><strong>Columns.</strong> Every accommodation that at least one of the students uses, in the same order as the list in the editor. Accommodations nobody uses are left out, so the chart stays as narrow as it can.</li>
        <li><strong>Headers.</strong> Each column has a short rotated label and a number. The numbers match a key printed under the table, which gives each accommodation in full.</li>
        <li><strong>Pagination.</strong> With many students or many accommodations, the chart continues onto more pages and the headers repeat on every page, so no page is a mystery grid.</li>
        <li><strong>Layout.</strong> Landscape, on US Letter or A4, with the confidential line, a reminder that it is a summary, and the page number on each page.</li>
      </ul>

      <h2>How to use a matrix in the classroom</h2>
      <p>Print it once for the teacher's planning binder and read it before you plan a unit. Look at the columns with the most check marks: those are the supports that benefit the most students, and making them part of your usual routine, such as posting directions or giving a copy of notes to everyone who wants one, can reduce the work of doing them one student at a time.</p>
      <p>Use the matrix on test days. Check which students need a separate setting, extra time or a reader, and arrange rooms and adults before the day. Use it with a substitute: pair it with the <a href="/student-at-a-glance-template">sub and para sheets</a> so the sub sees both the class view and each student's page.</p>

      <h2>What the matrix does not show</h2>
      <p>The matrix lists accommodations only. It does not show modifications, goals, services or any detail on how an accommodation should be used. Where an accommodation has conditions, such as extended time on tests only or a calculator for certain tasks, the full plan has the detail. Treat the matrix as a planning aid, not a replacement for the plans themselves. ${LEGAL_NOTE}</p>
      <p>Not sure what an accommodation looks like in practice? The <a href="/iep-accommodations-checklist">accommodations checklist</a> gives a plain sentence for each of the ${COUNT} items.</p>`,
});

P.push({
  path: "/iep-accommodations-checklist", crumb: "IEP accommodations checklist",
  title: "IEP Accommodations Checklist for General Education Teachers",
  desc: "IEP accommodations checklist for general education teachers: 60+ common accommodations by category, each with a plain sentence on what it looks like in class.",
  h1: "IEP Accommodations Checklist for General Education Teachers",
  lead: `${COUNT} common accommodations in six groups, each with a plain sentence about what it looks like in a classroom, and a short guide to using them well.`,
  quick: "An IEP accommodations checklist lists the supports that change how a student learns or shows learning, such as extended time, directions read aloud or preferential seating. Use the list below to understand what each one means in class, then use the tool to build a sheet for each student. Always follow the accommodations as written in the student's plan.",
  badges: ["Plain language", `${COUNT} accommodations`, "Six categories", "Free"],
  tool: { preset: "" },
  faq: [
    ["What is the difference between an accommodation and a modification?", "An accommodation changes how a student learns or shows learning, for example extra time or a quiet room. A modification changes what the student is expected to learn or do, for example a different or reduced learning target. If you are not sure which one a plan describes, ask the case manager."],
    ["Do I have to give every accommodation on this list?", "No. This is a list of common examples. A student's plan names the accommodations that apply to that student, and those are the ones to provide. Do not add or drop supports on your own, and ask the case manager if something is unclear."],
    ["What if an accommodation is hard to do in my class?", "Tell the case manager early. There is often another way to meet the same need, but the plan should be changed by the student's team, not quietly by one teacher."],
    ["Can I give an accommodation to the whole class?", "Often yes. Posting directions, giving a copy of notes or offering a quiet spot to anyone who wants one can help many students. Keep providing the support the plan describes to the student who needs it, and do it privately so the student is not singled out."],
    ["Where do I find a student's accommodations?", "In the IEP or 504 plan, which the case manager can share with you. A one-page sheet from the case manager is a summary of those, and the full plan is the one to follow."],
  ],
  body: `      <h2>The checklist</h2>
      <p>These are common accommodations, written as short plain phrases with one sentence each. The accommodations a student actually receives are the ones in that student's plan, so use this page to understand the wording, not to decide what a student should get.</p>
${checklistHtml}

      <h2>How to use accommodations well in class</h2>
      <ul>
        <li><strong>Read the plan first.</strong> Know which accommodations apply, when they apply and any conditions, such as tests only.</li>
        <li><strong>Make them routine.</strong> A support that is offered the same way every day becomes part of the room, and a student is more likely to use it.</li>
        <li><strong>Be private.</strong> Hand over the copy of notes quietly, and use an agreed signal for breaks. Nobody should have to explain their plan to the class.</li>
        <li><strong>Teach students to ask.</strong> The goal is a student who can say what they need. Prompt, then step back.</li>
        <li><strong>Keep a simple record.</strong> A quick tally of when each accommodation was used helps at the next plan meeting.</li>
        <li><strong>Tell the case manager what works.</strong> Teachers see things in the room that the team does not.</li>
      </ul>

      <h2>Turn the checklist into a one-page sheet</h2>
      <p>Case managers can tick these same accommodations for each student in the tool above, add strengths and strategies, and print a one-page sheet for each teacher, or a <a href="/accommodations-matrix-template">class matrix</a> that shows every student's accommodations at once. For a quick start, see the <a href="/">IEP at a glance template</a>.</p>`,
});

P.push({
  path: "/student-at-a-glance-template", crumb: "Student at a glance template",
  title: "Student at a Glance Template for Substitutes and Paras",
  desc: "Free student at a glance template for substitutes and paras: strengths, what helps, what to watch for, accommodations and contacts on one page.",
  h1: "Student at a Glance Template for Substitutes and Paras",
  lead: "A short one-page sheet for the adult who is with a student for one day: what the student is good at, what helps, what to watch for, and who to ask. No dates, goals or services.",
  quick: "A student at a glance sheet for substitutes and paraprofessionals shows only what an adult needs to support a student for a day: strengths, what helps, what to watch for, accommodations and key contacts. Use the Sub and para version below and download the PDF. It is a summary, not the IEP.",
  badges: ["Sub and para version", "One page", "No dates or goals", "Free"],
  tool: { preset: "sub" },
  faq: [
    ["What goes on a student snapshot for substitute teachers?", "Strengths and interests, what helps, what to watch for, the student's accommodations, and who to ask. It leaves out dates, goals, services and eligibility, which a sub does not need and a hallway should not see."],
    ["Why leave out goals and services?", "A sub needs to know how to support the student today. Goals and services matter for planning and are in the full IEP, and a shorter page is more likely to be read in the five minutes before class."],
    ["Should a sub see a student's disability or diagnosis?", "Usually not. Describe what the adult should do and watch for, not the label. Where your school allows more detail, the case manager decides what a substitute needs. Follow your district's rules on student records."],
    ["How do I give these to a sub who has never been in the building?", "Many teachers keep a sub folder with the sheets for the class, with a class matrix on top. Handle the folder as confidential, keep it with the teacher or office, and do not leave it open on a desk."],
    ["Can paraprofessionals use the same sheet?", "Yes. A para who supports several students can keep a sheet for each of them. If a para works with one student all day, the case manager may share more detail, such as the full accommodation list or the behavior plan note."],
  ],
  body: `      <h2>What a sub really needs</h2>
      <p>A substitute walks in at 7:50, often without having met any of the students, and has a few minutes to get ready. The plan for a student with an IEP or 504 plan may be fifteen pages. The sub needs about ten lines: what is this child good at, what helps, what might go wrong and what to do, and who is down the hall to ask. The sub and para version is made for that moment.</p>

      <h2>What is on the sub and para sheet</h2>
      <ul>
        <li><strong>Header.</strong> The student's initials or name, grade and school year, titled “Student at a Glance.” There is no plan type, case manager line or dates.</li>
        <li><strong>Strengths and interests.</strong> Something to start a conversation with.</li>
        <li><strong>What helps.</strong> Strategies the adult can use straight away.</li>
        <li><strong>Watch for.</strong> Early signs that the student needs a break or support, and what to do.</li>
        <li><strong>Accommodations.</strong> What the student gets, grouped by type, so a sub can set up the day.</li>
        <li><strong>Key contacts.</strong> Who to ask, by role: the teacher next door, the case manager, the counselor.</li>
      </ul>
      <p>It omits dates, goals, services, modifications, the behavior plan note and the health and safety note. If a student has a safety need that a sub must know about, tell the sub through your school's usual process, and do not rely on this page alone.</p>

      <h2>Writing for someone who does not know the student</h2>
      <p>Be concrete and kind. “Gets upset easily” does not help, but “If he puts his head down and goes quiet, offer a break at the calm corner and check in after five minutes” does. List what the adult can say and do, in the order they will need it. Avoid labels and shorthand that only the team understands.</p>
      <p>Keep the contacts honest: a role and a room or extension, such as “Ms. Okafor, special education, room 114,” is more useful than an email nobody is checking.</p>

      <h2>How to hand it over</h2>
      <p>Print one page per student, paper-clip them in alphabetical order by initials, and put a <a href="/accommodations-matrix-template">class matrix</a> on top. Mark the folder confidential. Each sheet already says so and reminds the reader that it is a summary and not the IEP. ${POLICY}</p>
      <p>To build the rest of a caseload, start at the <a href="/">main IEP at a glance page</a>, or browse the <a href="/iep-accommodations-checklist">accommodations checklist</a> for plain-language wording.</p>`,
});

/* ----------------------------------------------------------- about/privacy */
P.push({
  path: "/about", crumb: "About",
  title: "About GlanceSheet: Free IEP at a Glance Maker",
  desc: "GlanceSheet is part of Rooh Sites' free tools: private web tools that run in your browser. Who makes it, why it's free and how it handles student information.",
  h1: "About GlanceSheet",
  lead: "A small, free tool that does one job: one-page student summaries for the adults who teach them.",
  note: "", noRelated: true,
  body: `      <p>GlanceSheet is part of <a href="https://roohsites.com/">Rooh Sites</a>' collection of free single-purpose web tools. It is built for case managers, co-teachers, school psychologists and speech-language pathologists in US schools, who are often asked for a one-page “IEP at a glance” that general education teachers, substitutes and paras can read in a few minutes.</p>
      <h2>Why we built it</h2>
      <p>Most IEP at a glance templates online are static files you fill in by hand, and many want an email address first. Nothing built a sheet for you, printed a whole caseload in one go, or turned a class's accommodations into one chart. GlanceSheet does those three things, in your browser, with no signup.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free, with no account and no paid tier. Each PDF has a small “Made with GlanceSheet” line in the bottom margin, and that is how other teachers find the tool.</p>
      <h2>How it works</h2>
      <p>Everything runs in your browser. The layout code is plain JavaScript on your device, PDFs are made there with the open-source <a href="https://github.com/parallax/jsPDF" rel="noopener">jsPDF</a> library, and your caseload is saved in your browser's local storage. Nothing you type is uploaded.</p>
      <h2>What it is not</h2>
      <p>GlanceSheet is independent. It is not affiliated with any school, district or government agency, and it does not make legal documents. A sheet is a summary, not an IEP or a 504 plan, and the full plan is what a school follows. We make no claim that it satisfies any law or district policy; your district decides which tools may be used with student records.</p>`,
});
P.push({
  path: "/privacy", crumb: "Privacy & Terms",
  title: "Privacy & Terms: Student Data Stays on Your Device",
  desc: "How GlanceSheet handles student information: what you type is saved only in your browser, initials print by default, and you can back up or delete it all.",
  h1: "Privacy & Terms",
  lead: "Short version: what you type stays on your device, and you control when it is deleted.",
  noRelated: true, note: "",
  body: `      <h2>Privacy</h2>
      <p>GlanceSheet runs entirely in your browser. Student names, initials, grades, notes, accommodations, goals, services, dates and contacts are processed on your device to build the sheets and PDFs. They are never sent to our servers or to anyone else. There are no photos in the tool, and no accounts.</p>
      <h2>Local storage</h2>
      <p>To save you retyping, the tool saves your caseload in this browser's local storage, on this device. Local storage is not shared with other browsers, other profiles or other computers, and it is not encrypted, so anyone who can use this browser profile can open the page and see the caseload. Clearing your browser's site data deletes it.</p>
      <h2>Initials only</h2>
      <p>The <em>Initials only</em> switch is on by default. While it is on, printed sheets and the class matrix show each student's initials, and the PDF's title and file name do not contain a name. A full name is optional and is only used if you switch initials off. Anything you type into the notes, such as a strength that mentions a name, is printed as you typed it, so write those notes with that in mind.</p>
      <h2>Backups</h2>
      <p>Export backup saves a JSON file to your device with everything you typed, including any full names. The tool does not send it anywhere. Keep it somewhere private, import it on another computer or next year to reload your caseload, and delete it when you no longer need it.</p>
      <h2>Delete all data</h2>
      <p>The <em>Delete all data from this browser</em> button removes your caseload and settings from this browser's local storage after you confirm. On a shared or school computer, use it before you leave, after exporting a backup if you need one. It does not delete PDFs or backup files you already downloaded, which are ordinary files on your device.</p>
      <h2>Your district's rules</h2>
      <p>${POLICY} GlanceSheet does not claim to meet FERPA, IDEA or any district requirement, and it has no district approval.</p>
      <h2>Analytics</h2>
      <p>We use one privacy-friendly analytics service, Umami, to count page views and a few anonymous events, such as “PDF downloaded” with the kind of PDF. It does not use cookies or track you across sites, and it never receives what you type into the tool.</p>
      <h2>Terms</h2>
      <p>GlanceSheet is provided “as is”, without warranty. A sheet is a summary and not the IEP or 504 plan, and not legal advice. You are responsible for checking each sheet against the full plan, for sharing it only with staff who work with the student, and for following your school's and district's rules on student records. GlanceSheet is free for personal and commercial use.</p>
      <p>Questions? See the <a href="/about">About page</a>.</p>`,
});

/* ----------------------------------------------------------------- write */
let count = 0;
const wc = html => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").split(/\s+/).filter(Boolean).length;
for (const p of [home, ...P]) {
  const file = p.path === "/" ? "index.html" : p.path.slice(1) + ".html";
  const schema = [...(p.schema || [])];
  if (p.tool && p.path !== "/") schema.unshift(appLd(p.h1, p.path, p.desc));
  let html = page({ ...p, schema });
  // Keep the network links that tools/network.mjs filled in, so regenerating never wipes them.
  const NET = /<!--NETWORK:START-->[\s\S]*?<!--NETWORK:END-->/;
  const prev = existsSync(join(OUT, file)) ? (readFileSync(join(OUT, file), "utf8").match(NET) || [])[0] : null;
  if (prev) html = html.replace(NET, () => prev);
  writeFileSync(join(OUT, file), html);
  const article = (html.match(/<article[\s\S]*<\/article>/) || [""])[0];
  const words = wc(article);
  const min = p.path === "/" ? 900 : /^\/(about|privacy)$/.test(p.path) ? 120 : 500;
  if (p.title.length < 45 || p.title.length > 62) console.warn(`title ${p.title.length}: ${p.title}`);
  if (p.desc.length < 120 || p.desc.length > 158) console.warn(`desc ${p.desc.length}: ${p.path}`);
  if (words < min) console.warn(`words ${words} < ${min}: ${p.path}`);
  count++;
  console.log(`${p.path.padEnd(36)} title ${p.title.length} desc ${p.desc.length} words ${words}`);
}
console.log(`wrote ${count} pages`);
