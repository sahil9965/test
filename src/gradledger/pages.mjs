// Generates every GradLedger page (home, guides, about, privacy) from one layout.
// Usage: node src/gradledger/pages.mjs   (writes into sites/gradledger/)
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/gradledger");
const require = createRequire(import.meta.url);
const E = require(join(OUT, "engine.js"));
const URL = "https://transcript.roohsites.com";
const NAME = "GradLedger";
const ACCENT = "#4338ca";
const DATE = "2026-10-08", DATE_H = "8 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const GUIDES = [
  ["/homeschool-gpa-calculator", "Homeschool GPA calculator"],
  ["/homeschool-credit-hours-calculator", "How many hours is a credit?"],
  ["/homeschool-course-description-generator", "Course description generator"],
  ["/homeschool-hours-tracker", "Homeschool hours tracker"],
  ["/dual-enrollment-homeschool-transcript", "Dual enrollment on a transcript"],
  ["/homeschool-transcript-template", "Homeschool transcript template"],
  ["/homeschool-report-card-template", "Homeschool report card"],
];
const DISCLAIM = "GradLedger is general information and a record-keeping tool, not legal advice. Homeschool laws and college requirements vary; check your state's rules and each college's admissions requirements.";

const APP_LD = (url, name, desc) => ({
  "@type": "WebApplication", name, url, description: desc, applicationCategory: "EducationalApplication", operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: "MiniTools", url: `${URL}/about` },
});

function layout({ path, title, desc, ogTitle, ogDesc, h1, lead, badges, tool, body, faq = [], graph = [], crumb, scripts = true }) {
  const url = URL + (path === "/" ? "/" : path);
  if (faq.length) graph.push({ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
  if (crumb) graph.unshift({ "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` }, { "@type": "ListItem", position: 2, name: crumb, item: url }] });
  const ld = { "@context": "https://schema.org", "@graph": graph };
  const related = GUIDES.filter(([p]) => p !== path);
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
<meta property="og:title" content="${esc(ogTitle || title)}">
<meta property="og:description" content="${esc(ogDesc || desc)}">
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
    <a class="logo" href="/"><img src="/favicon.svg" alt="" width="28" height="28">${NAME}</a>
    <nav aria-label="Main"><a href="/">Transcript</a><a href="/homeschool-gpa-calculator">GPA calculator</a><a href="/homeschool-course-description-generator">Course descriptions</a><a href="/homeschool-hours-tracker">Hours tracker</a></nav>
  </header>
  <main id="main">
${crumb ? `    <p class="crumbs"><a href="/">${NAME}</a> › ${esc(crumb)}</p>\n` : ""}    <section class="hero">
      <h1>${esc(h1)}</h1>
      <p class="lead">${lead}</p>
${badges ? `      <ul class="badges">${badges.map(b => `<li>${esc(b)}</li>`).join("")}</ul>\n` : ""}    </section>
${tool ? `    <section class="tool card" aria-label="${esc(tool.label)}"><div id="${tool.id}"${tool.attrs || ""}><noscript><p class="notice">${NAME} needs JavaScript. It runs entirely in your browser and nothing is uploaded.</p></noscript></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? `      <h2 id="faq">Frequently asked questions</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}\n` : ""}${related.length && path !== "/about" && path !== "/privacy" ? `      <h2>More homeschool record tools</h2>
      <ul class="related">
${path === "/" ? "" : `        <li><a href="/">Free homeschool transcript generator</a></li>\n`}${related.map(([p, n]) => `        <li><a href="${p}">${esc(n)}</a></li>`).join("\n")}
      </ul>\n` : ""}      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the MiniTools team. ${esc(DISCLAIM)}</p>
    </article>
  </main>
  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">Homeschool transcript generator</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Guides and tools</h4><ul>${GUIDES.map(([p, n]) => `<li><a href="${p}">${esc(n)}</a></li>`).join("")}</ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. Not affiliated with any school, college, testing organization or government agency.</p>
  </footer>
</div>
${scripts && tool ? `<script src="/engine.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

// ---- Numbers used in the copy come from the engine, so the text always matches the tool ----
const S = E.settingsWithDefaults({});
const EX = [["English 9", "A", 1, "R"], ["Algebra 1", "B+", 1, "R"], ["Biology", "A-", 1, "H"], ["World History", "B", 1, "R"], ["Spanish 1", "A", 1, "R"], ["Art", "A", 0.5, "R"], ["Physical Education", "P", 0.5, "R"]].map(([title, grade, credits, level]) => ({ title, grade, credits, level }));
const R = E.computeGPA(EX, S);
if (R.unweighted !== "3.64" || R.weighted !== "3.73") throw new Error("worked example drifted: " + R.unweighted + " " + R.weighted);
const exRows = R.rows.map(x => {
  const c = x.course, g = x.grade;
  if (g.kind !== "graded") return `<tr><td>${c.title}</td><td>${g.label}</td><td>—</td><td>${E.fmtCredits(x.credits)}</td><td>Not in GPA (credit still earned)</td></tr>`;
  return `<tr><td>${c.title}${c.level === "H" ? " (Honors)" : ""}</td><td>${g.letter}</td><td>${x.points.toFixed(1)}${x.bonus ? ` (+${x.bonus} = ${(x.points + x.bonus).toFixed(1)} weighted)` : ""}</td><td>${E.fmtCredits(x.credits)}</td><td>${(Math.round(x.qU * 100) / 100).toFixed(1)}${x.bonus ? ` (${(Math.round(x.qW * 100) / 100).toFixed(1)} weighted)` : ""}</td></tr>`;
}).join("\n        ");
const exTable = `<table>
        <thead><tr><th>Course</th><th>Grade</th><th>Grade points</th><th>Credits</th><th>Quality points</th></tr></thead>
        <tbody>
        ${exRows}
        <tr><th>Total (graded courses)</th><th></th><th></th><th>${E.fmtCredits(R.attempted)}</th><th>${R.qualityU.toFixed(1)} (${R.qualityW.toFixed(1)} weighted)</th></tr>
        </tbody>
      </table>`;
const exMath = `Unweighted GPA = ${R.qualityU.toFixed(1)} ÷ ${E.fmtCredits(R.attempted)} = ${R.unweightedExact.toFixed(3)} → <strong>${R.unweighted}</strong><br>Weighted GPA = ${R.qualityW.toFixed(1)} ÷ ${E.fmtCredits(R.attempted)} = ${R.weightedExact.toFixed(3)} → <strong>${R.weighted}</strong>`;
const scaleTable = `<table>
        <thead><tr><th>Letter</th><th>Percent (10-point scale)</th><th>Grade points</th></tr></thead>
        <tbody>
        ${E.scaleRows(S).map(r => `<tr><td>${r.letter}</td><td>${r.range}</td><td>${r.points}</td></tr>`).join("\n        ")}
        </tbody>
      </table>`;
const scale7 = E.scaleRows({ pct: "7" }).map(r => `${r.letter} ${r.range}`).join(", ");
const hoursRows = [120, 135, 150, 180].map(h => { const p = E.planHours(1, h, 36, 5); return `<tr><td>${h} hours</td><td>${p.perWeek.toFixed(1).replace(/\.0$/, "")} hours</td><td>${Math.round(p.minutesPerDay)} minutes</td><td>${h / 2} hours</td></tr>`; }).join("\n        ");
const h2c = [30, 60, 90, 120, 150, 180].map(h => `<tr><td>${h} hours</td><td>${E.fmtCredits(E.creditsFromMinutes(h * 60, 120, 0.25).rounded)}</td><td>${E.fmtCredits(E.creditsFromMinutes(h * 60, 150, 0.25).rounded)}</td><td>${E.fmtCredits(E.creditsFromMinutes(h * 60, 180, 0.25).rounded)}</td></tr>`).join("\n        ");
const descAlg = E.generateDescription(E.newCourse(9, { title: "Algebra 1", subject: "math", credits: 1, gen: { topics: E.findLibrary("Algebra 1").topics, materials: "an Algebra 1 textbook with video lessons", acts: ["problems", "online"], evals: ["tests", "final"] } }), { yearLabel: "2023–2024", hours: 140 });
const descBio = E.generateDescription(E.newCourse(10, { title: "Biology", subject: "sci", level: "H", credits: 1, gen: { topics: "cell structure and function; genetics and DNA; evolution and classification; ecology; human body systems", materials: "a high school biology textbook; a microscope and prepared slide set; a dissection kit", acts: ["reading", "labs", "research"], evals: ["tests", "labs", "written"], style: "detailed" } }), { hours: 165, style: "detailed" });
const descAmLit = E.generateDescription(E.newCourse(11, { title: "American Literature", subject: "eng", credits: 1, gen: { topics: "The Scarlet Letter; Adventures of Huckleberry Finn; The Great Gatsby; poetry of Emily Dickinson and Robert Frost; Romanticism, Realism, and Modernism", materials: "unabridged novels and a poetry anthology", acts: ["reading", "essays", "discussion"], evals: ["written", "oral"], style: "concise" } }), { style: "concise" });
const descDE = E.generateDescription(E.newCourse(11, { title: "American Government (POLS 1100)", subject: "soc", level: "DE", credits: 1, dur: "sem", provider: "a local community college", college: "3 semester hours" }), { yearLabel: "2025–2026" });
const para = t => t.split("\n").map(l => esc(l)).join("<br>");

const pages = [];

// ================================ HOME ================================
pages.push({
  path: "/", file: "index.html",
  title: "Free Homeschool Transcript Generator: GPA, Credits & PDF",
  desc: "Free homeschool transcript generator with weighted GPA, credits, course descriptions and an hours log. Download a PDF. No signup; data stays in your browser.",
  ogTitle: "Free Homeschool Transcript Generator (No Signup)",
  ogDesc: "Exact weighted and unweighted GPA, credits by subject, course descriptions and a one-page transcript PDF. Private: runs in your browser.",
  h1: "Free Homeschool Transcript Generator",
  lead: "Enter each course by grade, and GradLedger calculates exact weighted and unweighted GPAs and credits, then builds a one-page transcript PDF. Course descriptions, report cards and an hours log are included. No signup, no per-transcript fee, and nothing leaves your browser.",
  badges: ["100% free", "No signup", "Weighted GPA", "Course descriptions", "Hours log"],
  tool: { id: "gl-app", label: "Homeschool transcript generator" },
  graph: [
    APP_LD(`${URL}/`, NAME, "Free homeschool transcript generator. Builds a high school transcript PDF with weighted and unweighted GPA, credits by subject, course descriptions, report cards and an hours log, entirely in the browser."),
    { "@type": "HowTo", name: "How to make a homeschool transcript", totalTime: "PT30M", step: [
      { "@type": "HowToStep", name: "Enter school and student details", text: "Add your homeschool's name and address, the student's legal name, date of birth and graduation date, and the parent administrator's name." },
      { "@type": "HowToStep", name: "List courses by grade", text: "Add each high school course under the grade it was taken in (9 to 12, plus high school courses taken in 8th grade) with its subject area and level." },
      { "@type": "HowToStep", name: "Enter grades and credits", text: "Type the final grade (a letter, a percentage, P for pass or IP for in progress) and the credits: usually 1.0 for a full-year course and 0.5 for a semester." },
      { "@type": "HowToStep", name: "Check GPA and credits", text: "GradLedger calculates GPA as the sum of grade points times credits divided by total graded credits, both unweighted and weighted, per year and cumulative." },
      { "@type": "HowToStep", name: "Download, sign and date", text: "Choose a design, download the transcript PDF, then sign and date it as the parent or school administrator." }] },
  ],
  body: `      <p class="tldr"><strong>Quick answer:</strong> To make a homeschool transcript, list every high school course under the grade it was taken in, with its final grade and credits (usually 1.0 for a full-year course and 0.5 for a semester). Then calculate the GPA: multiply each course's grade points by its credits, add them up, and divide by the total graded credits. Add your grading scale, then sign and date it as the parent administrator. GradLedger does the math and makes the PDF for you.</p>

      <h2 id="how">How to make a homeschool transcript in 6 steps</h2>
      <ol class="steps">
        <li><strong>Add your homeschool and student details.</strong> Use your homeschool's own name, your address and the student's full legal name, date of birth and graduation date (or expected graduation date). These go at the top of the transcript.</li>
        <li><strong>List courses under the grade they were taken.</strong> Grades 9 to 12 each get their own block. High school level courses taken in 8th grade, such as Algebra 1 or Spanish 1, can be listed too, marked as high school credit earned in grade 8.</li>
        <li><strong>Pick a subject area and level for each course.</strong> The subject area (English, mathematics, science and so on) drives the credits-by-subject summary. Mark a course Honors, AP or Dual enrollment only when it really was more demanding or taken for college credit.</li>
        <li><strong>Enter the final grade and credits.</strong> Type a letter (A, B+), a percentage (93) or P for pass. A full-year course is usually 1.0 credit and a one-semester course 0.5. If you track time, the <a href="/homeschool-hours-tracker">hours tracker</a> turns logged hours into credits.</li>
        <li><strong>Check the GPA and the credit totals.</strong> GradLedger shows each year's GPA, the cumulative unweighted and weighted GPA, credits earned, and credits by subject against your graduation goals.</li>
        <li><strong>Download, sign and date.</strong> Choose the Classic, Modern or Minimal design, download the PDF, then sign it as the parent or school administrator. You can add a drawn or scanned signature before downloading.</li>
      </ol>

      <h2>What a homeschool transcript should include</h2>
      <p>Admissions offices read a lot of transcripts, so a clear, conventional layout helps. A complete homeschool transcript usually has:</p>
      <table>
        <thead><tr><th>Section</th><th>What to include</th></tr></thead>
        <tbody>
          <tr><td>School information</td><td>Your homeschool's name, address, phone or email, and the parent administrator's name.</td></tr>
          <tr><td>Student information</td><td>Full legal name, date of birth, address, and graduation date (or "expected" if still in school).</td></tr>
          <tr><td>Courses by year</td><td>Each course with its level (Honors, AP, Dual enrollment), final grade and credits, grouped by grade 9 to 12.</td></tr>
          <tr><td>GPA and credits</td><td>Credits earned and GPA for each year, plus cumulative GPA (unweighted, and weighted if you weight).</td></tr>
          <tr><td>Credits by subject</td><td>Totals for English, math, science and other areas, so readers can check requirements at a glance.</td></tr>
          <tr><td>Grading scale and key</td><td>How letters map to percentages and grade points, any weighting, and what H, AP, DE, P and IP mean.</td></tr>
          <tr><td>Test scores and notes</td><td>Optional: SAT, ACT, AP or CLEP scores, and a short line on activities or awards.</td></tr>
          <tr><td>Signature and date</td><td>The parent administrator's signature and the date the transcript was issued.</td></tr>
        </tbody>
      </table>

      <h2>How GPA is calculated on a homeschool transcript</h2>
      <p>GPA is a credit-weighted average. Each letter grade has a point value (A = 4.0, B = 3.0 and so on). Multiply the points by the course's credits to get <em>quality points</em>, add them up, and divide by the total credits of graded courses:</p>
      <p class="formula">GPA = Σ (grade points × credits) ÷ Σ graded credits</p>
      <p>A weighted GPA adds a bonus to passing grades in harder courses, commonly +0.5 for Honors and +1.0 for AP or dual enrollment. Pass/fail and in-progress courses earn or show credit but are left out of the GPA. Here is a real 9th-grade year, calculated exactly as GradLedger does it:</p>
      ${exTable}
      <p class="formula">${exMath}</p>
      <p>The student earned ${E.fmtCredits(R.earned)} credits (the pass/fail PE course counts toward credits, not GPA). Try your own numbers in the <a href="/homeschool-gpa-calculator">homeschool GPA calculator</a>, which shows every step.</p>

      <h2>How many credits is a homeschool course?</h2>
      <p>A full-year high school course is normally <strong>1 credit</strong> and a one-semester course <strong>0.5 credit</strong>. If you measure by time, the traditional benchmark is about 120 hours of work per credit, and many families use 150 to 180 hours for lab sciences. See <a href="/homeschool-credit-hours-calculator">how many hours is a homeschool credit</a> for a calculator and a full table.</p>

      <h2>Course descriptions, report cards and an hours log</h2>
      <p>Some colleges and programs ask homeschool applicants for course descriptions, especially for unusual courses. GradLedger's <a href="/homeschool-course-description-generator">course description generator</a> writes a description for each course from the topics, materials and coursework you enter, and puts them all in one PDF. You can also print a yearly <a href="/homeschool-report-card-template">report card</a> and keep a running <a href="/homeschool-hours-tracker">hours log</a> that feeds the transcript.</p>

      <h2>Dual enrollment, AP and transfer credit</h2>
      <p>College courses taken in high school go on the transcript in the year they were taken, marked DE, with the college named in a note. Courses from a previous school can be marked as transfer credit. The <a href="/dual-enrollment-homeschool-transcript">dual enrollment guide</a> explains how to convert college credit hours into high school credits.</p>

      <h2>Your records stay private</h2>
      <p>GradLedger runs entirely in your browser. Names, grades, logos and signatures are saved in your browser's storage on this device and are never uploaded. Because of that, there's no account to recover: use <em>Settings &amp; backup</em> to download a backup file now and then, and restore it on another device when you need to.</p>

      <h2>Free, with no catch</h2>
      <p>Every feature is free: unlimited students and transcripts, weighted GPA, three designs, logo and signature, course descriptions, report cards and the hours log. There's no account and no paid tier. Each PDF carries one small line at the bottom, "Prepared with GradLedger", and nothing else.</p>`,
  faq: [
    ["Is this homeschool transcript generator really free?", "Yes. Every feature is free, with no account and no paid tier: unlimited students, weighted GPA, course descriptions, report cards, the hours log and all three designs. Each PDF has one small \"Prepared with GradLedger\" line at the bottom."],
    ["Is a homeschool transcript official?", "In most US states the parent acts as the homeschool's administrator and issues the transcript, so a transcript you prepare, sign and date is your homeschool's record. Each college decides what it accepts, and some also ask for test scores, course descriptions or a portfolio. Check your state's homeschool law and each college's requirements."],
    ["How do I calculate a homeschool GPA?", "Multiply each course's grade points (A = 4.0, B = 3.0 and so on) by its credits, add those up, and divide by the total credits of graded courses. Pass/fail and in-progress courses are left out. GradLedger does this exactly for every year and for the whole transcript."],
    ["Should I use a weighted GPA?", "Use it only if some courses were genuinely more demanding, such as honors work, AP or college courses. Show both: GradLedger prints the unweighted and the weighted GPA, and explains the weighting in the grading key, so readers can compare fairly."],
    ["How many credits does a homeschooler need to graduate?", "There's no single national rule. Parents usually set graduation requirements, sometimes guided by state law or an umbrella school. Many college-prep plans total around 22 to 26 credits, including about 4 English, 3 to 4 math, 3 to 4 science and 3 to 4 social studies. Check your state and target colleges."],
    ["Can I include high school courses taken in 8th grade?", "Yes. If an 8th grader completed a high school level course such as Algebra 1 or Spanish 1, you can list it as high school credit earned in grade 8. GradLedger shows it in its own block."],
    ["Can I make transcripts for more than one child?", "Yes. Add as many students as you need. School details, your logo and signature are shared, and each student has their own courses, hours and notes."],
    ["Where is my data stored?", "Only in your browser on this device. Nothing is uploaded and there's no account. Download a backup file from Settings & backup and keep it somewhere safe, because clearing your browser data deletes the records."],
  ],
});

// ================================ GPA CALCULATOR ================================
pages.push({
  path: "/homeschool-gpa-calculator", crumb: "Homeschool GPA calculator",
  title: "Homeschool GPA Calculator: Weighted & Unweighted (Free)",
  desc: "Free homeschool GPA calculator for high school. Weighted and unweighted GPA with honors, AP and dual-enrollment weights, and every step of the math shown.",
  h1: "Homeschool GPA Calculator",
  lead: "Enter courses, grades and credits to get an exact unweighted and weighted GPA, with the full calculation shown so you can put it on a transcript with confidence.",
  tool: { id: "gl-gpa", label: "Homeschool GPA calculator" },
  graph: [APP_LD(`${URL}/homeschool-gpa-calculator`, "Homeschool GPA calculator", "Calculates weighted and unweighted high school GPA from letter or percentage grades and credits, showing every step.")],
  body: `      <p class="tldr"><strong>Quick answer:</strong> A homeschool GPA is the sum of (grade points × credits) divided by the total credits of graded courses. On the standard 4.0 scale A = 4.0, B = 3.0, C = 2.0, D = 1.0 and F = 0. For a weighted GPA, add 0.5 to passing grades in honors courses and 1.0 in AP or dual-enrollment courses before multiplying.</p>

      <h2>How to calculate a homeschool GPA</h2>
      <ol class="steps">
        <li><strong>Convert each grade to points.</strong> Use your grading scale: A = 4.0, A- = 3.7, B+ = 3.3, and so on (table below). Percentages convert to a letter first.</li>
        <li><strong>Multiply by credits.</strong> A full-year course is usually 1.0 credit and a semester 0.5. Grade points × credits = quality points.</li>
        <li><strong>Add the quality points and the credits.</strong> Include only graded courses. Leave out pass/fail and in-progress courses.</li>
        <li><strong>Divide.</strong> Total quality points ÷ total graded credits = GPA. Round the same way every time; GradLedger rounds half up to 2 decimals (or 3 if you choose).</li>
        <li><strong>For a weighted GPA,</strong> add the weight (for example +0.5 Honors, +1.0 AP) to each passing grade's points before multiplying, then divide by the same credits.</li>
      </ol>

      <h2>Worked example</h2>
      <p>A 9th grader with one honors course and a pass/fail PE class:</p>
      ${exTable}
      <p class="formula">${exMath}</p>
      <p>This is the example loaded in the calculator above, so you can check each number in the "Show the math" table.</p>

      <h2>Grade points on the 4.0 scale</h2>
      <p>This is the plus/minus scale most US high schools use. If you don't give plus or minus grades, use only A = 4, B = 3, C = 2, D = 1 and F = 0 (untick plus/minus in the calculator).</p>
      ${scaleTable}
      <p>Some families use a stricter 7-point percentage scale instead: ${esc(scale7)}. Some schools count A+ as 4.3; most cap it at 4.0. Whichever you use, print the scale on the transcript. GradLedger adds it automatically.</p>

      <h2>Weighted vs unweighted GPA</h2>
      <table>
        <thead><tr><th></th><th>Unweighted GPA</th><th>Weighted GPA</th></tr></thead>
        <tbody>
          <tr><td>Scale</td><td>0 to 4.0</td><td>Can go above 4.0</td></tr>
          <tr><td>Honors course, grade A</td><td>4.0</td><td>4.5 (with +0.5)</td></tr>
          <tr><td>AP or dual-enrollment course, grade B</td><td>3.0</td><td>4.0 (with +1.0)</td></tr>
          <tr><td>Best for</td><td>Comparing students fairly</td><td>Showing the rigor of harder courses</td></tr>
        </tbody>
      </table>
      <p>Many colleges recalculate GPA their own way, so show both and explain your weighting. Weight a course only when it really was more demanding. Note that the College Board asks schools to authorize a course through its AP Course Audit before labeling it "AP" on a transcript. If your student took an AP exam after a home course, many families label the course Honors and list the exam score separately. (GradLedger isn't affiliated with the College Board.)</p>

      <h2>Yearly and cumulative GPA</h2>
      <p>A transcript usually shows a GPA for each school year and a cumulative GPA for all years together. The cumulative GPA is <em>not</em> the average of the yearly GPAs: it is total quality points divided by total graded credits, so a year with more credits counts for more. The full <a href="/">transcript generator</a> calculates both for you.</p>`,
  faq: [
    ["What GPA scale should a homeschool transcript use?", "The 4.0 scale is the most widely understood: A = 4, B = 3, C = 2, D = 1, F = 0, with plus/minus steps of about 0.3. Print the scale on the transcript so readers know exactly how grades convert."],
    ["Do pass/fail courses count in GPA?", "No. A course graded P earns its credits but isn't included in the GPA. An F does count: it adds credits to the divisor and zero grade points."],
    ["How do I convert a percentage grade to GPA?", "Convert the percentage to a letter with your scale (on a 10-point scale 93 to 96 is an A, 90 to 92 an A-) and then use that letter's grade points. The calculator accepts percentages directly."],
    ["Is 89.5 an A- or a B+?", "The calculator compares the number you type with the scale exactly, so 89.5 is a B+ on the 10-point scale. If your policy is to round to the nearest whole percent, enter the rounded number (90)."],
    ["Can a weighted GPA be higher than 4.0?", "Yes. With +1.0 for AP or dual enrollment, an A in those courses counts as 5.0, so a weighted GPA can go above 4.0. The unweighted GPA always stays between 0 and 4.0."],
  ],
});

// ================================ CREDIT HOURS ================================
pages.push({
  path: "/homeschool-credit-hours-calculator", crumb: "Homeschool credit hours",
  title: "How Many Hours Is a Homeschool Credit? Free Calculator",
  desc: "A homeschool credit is usually 120 to 180 hours of work (often 120, or 150 for lab sciences). Convert logged hours to credits with this free calculator.",
  h1: "How Many Hours Is a Homeschool Credit?",
  lead: "Convert hours of work into high school credits, or plan how much time a course needs each week and each day.",
  tool: { id: "gl-credits", label: "Homeschool credit hours calculator" },
  graph: [APP_LD(`${URL}/homeschool-credit-hours-calculator`, "Homeschool credit hours calculator", "Converts homeschool hours to high school credits and plans weekly and daily time per course.")],
  body: `      <p class="tldr"><strong>Quick answer:</strong> One homeschool high school credit is usually <strong>120 to 180 hours</strong> of work in a subject. The traditional benchmark is 120 hours, about 40 minutes a day over a 36-week school year. Many families use 150 to 180 hours for lab sciences. A half credit (one semester) is half of that: 60 to 90 hours.</p>

      <h2>Where the 120-hour standard comes from</h2>
      <p>US high schools have long measured credit with the <strong>Carnegie unit</strong>: 120 hours of instruction in one subject over a school year. Homeschool families often use the same benchmark when they award credit by time, then adjust for the course: more hours for lab sciences, which add lab work and write-ups, and sometimes fewer for courses completed through a full textbook.</p>

      <h2>Time per credit at common standards</h2>
      <p>For a 36-week school year, 5 days a week:</p>
      <table>
        <thead><tr><th>Hours per credit</th><th>Per week</th><th>Per school day</th><th>Half credit</th></tr></thead>
        <tbody>
        ${hoursRows}
        </tbody>
      </table>

      <h2>Hours to credits</h2>
      <p>Credits = hours completed ÷ hours per credit. Most transcripts show credits in quarters or halves, so round down to the nearest 0.25 or 0.5:</p>
      <table>
        <thead><tr><th>Hours logged</th><th>at 120 h/credit</th><th>at 150 h/credit</th><th>at 180 h/credit</th></tr></thead>
        <tbody>
        ${h2c}
        </tbody>
      </table>

      <h2>Three ways homeschool families award credit</h2>
      <ul>
        <li><strong>By hours.</strong> Log time and award 1 credit per 120 to 180 hours. Good for electives, hands-on courses and anything without a textbook. The <a href="/homeschool-hours-tracker">hours tracker</a> adds up time per course.</li>
        <li><strong>By curriculum completed.</strong> Finishing a full high school textbook or curriculum (most of the chapters, tests and assignments) usually counts as 1 credit, however long it took.</li>
        <li><strong>By mastery.</strong> Award credit when the student shows they've learned the material, for example by passing a standardized exam such as a CLEP or AP exam.</li>
      </ul>
      <p>Pick a method for each course, use it consistently, and note it if you write <a href="/homeschool-course-description-generator">course descriptions</a>. Your state or umbrella school may have its own rules, so check them.</p>

      <h2>What counts as hours</h2>
      <p>Count the time the student actually spends on the subject: lessons, reading, writing, labs, practice, projects, field trips and co-op or online classes. Breaks and unrelated screen time don't count. For an English course, reading the assigned novels counts; for a PE credit, practice and games count.</p>`,
  faq: [
    ["How many hours is a half credit in homeschool?", "Half of a full credit: 60 hours at the 120-hour standard, 75 at 150 hours, or 90 at 180 hours. A one-semester course is usually a half credit."],
    ["Do I have to count hours to give credit?", "Usually not. Many families award credit for completing a full high school curriculum or for demonstrated mastery instead. Hours are most useful for electives and courses without a textbook. Check your state's homeschool law in case it sets record-keeping rules."],
    ["How many hours a day is one credit?", "At 120 hours per credit and 36 weeks of 5 days, about 40 minutes a day. At 150 hours it's about 50 minutes, and at 180 hours an hour a day."],
    ["How many credits is a lab science?", "Usually 1 credit, like other full-year courses, but many families expect 150 to 180 hours because of lab work. You can set any hours-per-credit standard in the calculator."],
    ["Can a student earn more than one credit in a year for a subject?", "Yes, if they complete the work: 240 hours of logged art at 120 hours per credit could become 2 credits, for example two separate courses such as Drawing and Painting."],
  ],
});

// ================================ COURSE DESCRIPTIONS ================================
pages.push({
  path: "/homeschool-course-description-generator", crumb: "Course description generator",
  title: "Homeschool Course Description Generator: Free, No AI",
  desc: `Write homeschool course descriptions for college applications in minutes. Free generator with typical topics for ${E.LIBRARY.length} courses. Copy or download a PDF.`,
  h1: "Homeschool Course Description Generator",
  lead: "Fill in what was studied, the materials and how work was graded, and get a clear course description you can copy, edit or download. Built from templates, not AI, and nothing leaves your browser.",
  tool: { id: "gl-descgen", label: "Homeschool course description generator" },
  graph: [APP_LD(`${URL}/homeschool-course-description-generator`, "Homeschool course description generator", "Generates homeschool course descriptions from course details using template text, with typical topics for common high school courses.")],
  body: `      <p class="tldr"><strong>Quick answer:</strong> A homeschool course description is a short paragraph (about 80 to 200 words) that names the course, its level, grade and credit, lists the main topics, the textbooks or curriculum used, the kinds of work done (labs, essays, projects), and how the work was evaluated. Write one for each course on the transcript and keep them in one document.</p>

      <h2>What to include in a course description</h2>
      <table>
        <thead><tr><th>Part</th><th>Example</th></tr></thead>
        <tbody>
          <tr><td>Course, length, level, grade</td><td>"Biology is a full-year honors-level science course completed in grade 10."</td></tr>
          <tr><td>Topics covered</td><td>Cell biology, genetics, evolution, ecology, human body systems.</td></tr>
          <tr><td>Materials</td><td>Textbook, lab kit, online course or co-op class.</td></tr>
          <tr><td>Coursework</td><td>Labs with written reports, reading, a research paper.</td></tr>
          <tr><td>Evaluation</td><td>Tests and quizzes, lab reports, graded writing.</td></tr>
          <tr><td>Time (optional)</td><td>"About 165 hours of coursework."</td></tr>
        </tbody>
      </table>

      <h2>Course description template</h2>
      <p>The generator follows this fill-in template. You can also use it by hand:</p>
      <p class="formula">[Course] is a [full-year / one-semester] [honors-level] [subject] course completed in grade [9–12] ([school year]). Topics covered included [topic], [topic], and [topic]. The main resources were [textbook or curriculum]. Coursework included [labs, essays, projects]. Progress was evaluated through [tests, written work, presentations]. The student completed approximately [hours] hours of coursework.</p>

      <h2>Examples</h2>
      <h3>Algebra 1 (standard style)</h3>
      <p>${para(descAlg)}</p>
      <h3>Biology, Honors (detailed style)</h3>
      <p>${para(descBio)}</p>
      <h3>American Literature (concise style)</h3>
      <p>${para(descAmLit)}</p>
      <h3>A dual-enrollment course</h3>
      <p>${para(descDE)}</p>

      <h2>Tips for strong course descriptions</h2>
      <ul>
        <li><strong>Be specific.</strong> Name the novels, the lab topics and the curriculum. "Read and analyzed six novels including <em>The Great Gatsby</em>" says more than "studied literature".</li>
        <li><strong>Describe what was actually done.</strong> The typical topics in the generator are a starting point; delete the ones your student didn't cover.</li>
        <li><strong>Explain anything unusual.</strong> For an interest-led course, say how you set goals and judged the work.</li>
        <li><strong>Keep the format consistent</strong> across courses so a reader can scan them quickly. GradLedger's full <a href="/">transcript generator</a> saves a description with each course and prints them all in one PDF, grouped by grade or by subject.</li>
        <li><strong>Write them as you go.</strong> It's much easier at the end of each school year than in the fall of senior year. Logging time in the <a href="/homeschool-hours-tracker">hours tracker</a> fills in the hours for you.</li>
      </ul>`,
  faq: [
    ["Do colleges require homeschool course descriptions?", "Requirements vary. Some colleges ask homeschool applicants for course descriptions or a reading list, others only for a transcript and test scores. Check each college's homeschool admissions page, and keep descriptions ready so you can send them if asked."],
    ["How long should a homeschool course description be?", "Usually one paragraph of about 80 to 200 words per course. Long enough to list the topics, materials and evaluation, short enough that a reader can scan a dozen of them."],
    ["Does this generator use AI?", "No. Descriptions are built from fixed template sentences using only the details you enter, so the result is predictable and nothing is sent anywhere. You can edit the text freely afterwards."],
    ["Can I save descriptions with my transcript?", "Yes. Press Save to my transcript and the course, with its description, is added to the current student in the transcript generator. From there you can download all descriptions as one PDF."],
    ["Should course descriptions include grades?", "It isn't necessary, because the grade is on the transcript. GradLedger's descriptions PDF shows the final grade and credits in a small line under each course title."],
  ],
});

// ================================ HOURS TRACKER ================================
pages.push({
  path: "/homeschool-hours-tracker", crumb: "Homeschool hours tracker",
  title: "Homeschool Hours Tracker: Log Hours and Earn Credits Free",
  desc: "Free homeschool hours tracker: log time by course and date, see totals and credits at 120 to 180 hours each, and print an hours log PDF. No account needed.",
  h1: "Homeschool Hours Tracker",
  lead: "Log time by course as the year goes on. GradLedger totals the hours, converts them into high school credits and puts them straight onto the transcript.",
  tool: { id: "gl-app", label: "Homeschool hours tracker and transcript generator", attrs: ' data-tab="hours"' },
  graph: [APP_LD(`${URL}/homeschool-hours-tracker`, "Homeschool hours tracker", "Logs homeschool hours by course and date, totals them, converts hours to high school credits and prints an hours log PDF.")],
  body: `      <p class="tldr"><strong>Quick answer:</strong> To track homeschool hours, record the date, the course and the time spent each day (or each week). Add up the hours per course and divide by your credit standard, usually 120 hours per credit (150 to 180 for lab sciences), to get the credits to put on the transcript. GradLedger keeps the log, does the totals and prints it as a PDF.</p>

      <h2>How to use the hours tracker</h2>
      <ol class="steps">
        <li><strong>Add the year's courses.</strong> Type a course name and grade in "Add a course", or add them on the Courses tab. Common courses fill in their subject automatically.</li>
        <li><strong>Log time as you go.</strong> Pick the date and course, enter hours and minutes, and add a short note such as "Chapter 4 reading" or "Lab 3: osmosis". The last course you used stays selected.</li>
        <li><strong>Watch the totals.</strong> "Totals by course" shows logged hours and the credits they equal at your standard (120, 135, 150, 180 or a custom number of hours).</li>
        <li><strong>Award the credit.</strong> When a course is finished, press "Set to…" to copy the earned credits (rounded down to a quarter credit) onto the transcript, or type your own number on the Courses tab.</li>
        <li><strong>Print or export.</strong> Download the hours log as a PDF for your records, or export a CSV to open in a spreadsheet.</li>
      </ol>

      <h2>What to record</h2>
      <table>
        <thead><tr><th>Field</th><th>Why it helps</th></tr></thead>
        <tbody>
          <tr><td>Date</td><td>Shows the work was spread across the school year.</td></tr>
          <tr><td>Course</td><td>Hours add up per course and become that course's credit.</td></tr>
          <tr><td>Time</td><td>Hours and minutes; even 20-minute sessions add up.</td></tr>
          <tr><td>Note</td><td>The chapter, lab, book or project. Notes make <a href="/homeschool-course-description-generator">course descriptions</a> much easier to write later.</td></tr>
        </tbody>
      </table>

      <h2>Daily or weekly logging?</h2>
      <p>Either works. Daily entries are the most accurate and take a few seconds each. If daily logging won't happen, enter a weekly total per course every Friday. What matters is a record made during the year rather than estimated afterwards.</p>

      <h2>Hours and state requirements</h2>
      <p>Homeschool laws differ a lot between states. A few set a minimum number of instruction days or hours per year or ask families to keep attendance or hours records; many don't. This tracker is a record-keeping tool, not legal advice, so check your own state's homeschool law for what you need to keep.</p>

      <h2>Your log stays on your device</h2>
      <p>Entries are saved in this browser only. Nothing is uploaded and there's no account, so download a backup (Settings &amp; backup tab) from time to time. The backup file holds every student, course and log entry and can be restored on another computer. To see how hours become credits, read <a href="/homeschool-credit-hours-calculator">how many hours is a homeschool credit</a>.</p>`,
  faq: [
    ["How many hours should a homeschool high schooler do per course?", "A common benchmark is 120 hours per credit, about 40 minutes a day over a 36-week year, and 150 to 180 hours for lab sciences. A half-credit course needs half that."],
    ["Can I log hours on my phone?", "Yes. The tracker works in any modern phone browser. Entries are saved in that browser, so log on the same device, or move your records with a backup file."],
    ["Can I export my hours to a spreadsheet?", "Yes. Export CSV gives one row per entry with the date, course, grade level, minutes, hours and note, ready for Excel, Numbers or Google Sheets."],
    ["Does logging hours change the transcript automatically?", "Logged hours show next to each course with the credits they equal. The credit on the transcript changes only when you press Set to… or edit it, so you stay in control."],
    ["What if I forgot to log some days?", "Add the entries afterwards with the correct dates, or add one entry with the total for the week. Keep notes honest; the log is your record."],
  ],
});

// ================================ DUAL ENROLLMENT ================================
pages.push({
  path: "/dual-enrollment-homeschool-transcript", crumb: "Dual enrollment on a transcript",
  title: "Dual Enrollment on a Homeschool Transcript: How to List It",
  desc: "How to list dual enrollment on a homeschool transcript: course names, credit conversion, weighting and notes, plus a free generator that formats it for you.",
  h1: "Dual Enrollment on a Homeschool Transcript",
  lead: "College courses taken in high school count twice: once on the college's transcript and once on yours. Here's how to list them clearly, and a free generator that does the formatting.",
  tool: { id: "gl-app", label: "Homeschool transcript generator", attrs: ' data-tab="courses"' },
  graph: [APP_LD(`${URL}/dual-enrollment-homeschool-transcript`, "Homeschool transcript generator with dual enrollment", "Builds a homeschool transcript that marks dual-enrollment courses, weights them in GPA and lists the college in a note.")],
  body: `      <p class="tldr"><strong>Quick answer:</strong> List each dual-enrollment course on the homeschool transcript in the grade year it was taken, using the college's course name (and number), the grade the college gave, and the high school credit you award. A widely used rule of thumb is that a one-semester college course of 3 or more semester hours equals 1 high school credit. Mark it "DE", name the college in a note, and say the college's own transcript is available from the college.</p>

      <h2>How to add a dual-enrollment course in GradLedger</h2>
      <ol class="steps">
        <li><strong>Add the course</strong> under the grade it was taken in, using the college's title, for example "English Composition I (ENG 1101)".</li>
        <li><strong>Set the level to Dual enrollment.</strong> The transcript marks it DE, and the weighted GPA adds +1.0 (you can change that in Settings).</li>
        <li><strong>Open the course's ⋯ options</strong> and fill in "Taken at" with the college's name and "College credit" with the hours, for example "3 semester hours".</li>
        <li><strong>Enter the college's final grade and your high school credit,</strong> usually 1.0 for a 3- or 4-hour college course.</li>
        <li><strong>Download the transcript.</strong> A note under the summary lists each dual-enrollment course and college, and says the college issues its own transcript.</li>
      </ol>

      <h2>Converting college credit to high school credit</h2>
      <table>
        <thead><tr><th>College course</th><th>Common high school credit</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td>3 or 4 semester hours (one semester)</td><td>1.0 credit</td><td>Widely used rule of thumb: a college semester covers about a high school year of material.</td></tr>
          <tr><td>3 or 4 semester hours, conservative approach</td><td>0.5 credit</td><td>Some families, schools and states count a semester as a half credit.</td></tr>
          <tr><td>1- or 2-hour course (for example a lab or PE)</td><td>0.25 to 0.5 credit</td><td>Scale by the work involved.</td></tr>
          <tr><td>Quarter-system course (4 to 5 quarter hours)</td><td>About 0.5 to 1.0 credit</td><td>Three quarter hours equal about two semester hours.</td></tr>
        </tbody>
      </table>
      <p>Policies vary by state and by college. Choose one rule, apply it to every course, and mention it in the transcript notes or course descriptions.</p>

      <h2>Should dual-enrollment courses be weighted?</h2>
      <p>Many high schools weight college courses like AP courses, adding 1.0 grade point in the weighted GPA. GradLedger does this by default and always prints the unweighted GPA too, so a college can compare either way. Use the grade the college gave you, not your own.</p>

      <h2>How it looks on the transcript</h2>
      <table>
        <thead><tr><th>Course</th><th>Type</th><th>Grade</th><th>Credits</th></tr></thead>
        <tbody>
          <tr><td>American Government (POLS 1100)</td><td>DE</td><td>A</td><td>1.0</td></tr>
          <tr><td>English Composition I (ENG 1101)</td><td>DE</td><td>B+</td><td>1.0</td></tr>
        </tbody>
      </table>
      <p>With the note: "Dual enrollment at [college]: American Government (POLS 1100) (3 semester hours) and English Composition I (ENG 1101) (3 semester hours). College transcripts for dual-enrollment courses are issued by the college."</p>

      <h2>Dual enrollment, AP, CLEP and transfer credit</h2>
      <ul>
        <li><strong>Dual enrollment:</strong> a real college course with a college transcript. Mark it DE.</li>
        <li><strong>AP:</strong> the College Board asks that a course be authorized through its AP Course Audit before it's labeled "AP". If your student only took the AP exam, list the score under test scores. GradLedger isn't affiliated with the College Board.</li>
        <li><strong>CLEP:</strong> an exam, not a course. List the score under test scores, and award credit for the related course if your policy allows.</li>
        <li><strong>Transfer credit:</strong> courses from a previous school. Tick "Transfer credit" in the course's options; it's marked TR.</li>
      </ul>
      <p>Also send the college's official transcript wherever it's required; colleges usually want it directly from the issuing college. For more detail on the course itself, write a <a href="/homeschool-course-description-generator">course description</a>.</p>`,
  faq: [
    ["Does dual enrollment go on a homeschool transcript?", "Yes. List each course in the year it was taken, with the grade from the college and the high school credit you award, marked as dual enrollment. Applicants usually also send the college's own transcript."],
    ["How many high school credits is a 3-credit college course?", "A widely used rule of thumb is 1 high school credit for a one-semester college course of 3 or more semester hours. Some families and states use 0.5. Pick one rule and apply it consistently."],
    ["Which grade year does a summer dual-enrollment course go in?", "Most families list it in the school year that follows the summer, or the year the course mostly belongs to. Keep it consistent and match the dates on the college transcript."],
    ["Should I use the college's grade?", "Yes. Use the final grade on the college transcript. Colleges may compare the two."],
    ["Are AP and dual enrollment weighted the same?", "Often, yes: many schools add 1.0 for both. In GradLedger you can set the Honors, AP and dual-enrollment weights separately in Settings."],
  ],
});

// ================================ TRANSCRIPT TEMPLATE ================================
pages.push({
  path: "/homeschool-transcript-template", crumb: "Homeschool transcript template",
  title: "Homeschool Transcript Template: Free and Fillable (PDF)",
  desc: "Free homeschool transcript template that fills itself in: add courses and grades, and GPA, credits and the grading scale are calculated. Download a PDF.",
  h1: "Free Homeschool Transcript Template",
  lead: "A ready-made high school transcript layout that does the math. Choose a design, add courses and grades, and download the finished PDF.",
  tool: { id: "gl-app", label: "Homeschool transcript template", attrs: ' data-tab="transcript" data-doc="transcript"' },
  graph: [APP_LD(`${URL}/homeschool-transcript-template`, "Homeschool transcript template", "Fillable homeschool transcript template with automatic GPA, credits and grading scale, downloadable as PDF.")],
  body: `      <p class="tldr"><strong>Quick answer:</strong> A homeschool transcript template has your school and student details at the top, a block of courses for each grade (course, level, grade, credits, yearly GPA), a cumulative summary with credits by subject, the grading scale, and a signature line. With GradLedger the template fills itself in: you enter courses and grades, and the GPA and totals are calculated for you.</p>

      <figure>
        <img src="/sample-transcript.png" alt="Sample homeschool transcript made with GradLedger: grade 8 to 12 course blocks, cumulative GPA, credits by subject, grading scale and signature line" width="850" height="1100" loading="lazy">
        <figcaption>The Classic design with the example student. Every number on it is calculated from the grades entered.</figcaption>
      </figure>

      <h2>What's in the template</h2>
      <table>
        <thead><tr><th>Part</th><th>Filled in from</th></tr></thead>
        <tbody>
          <tr><td>Header</td><td>Your homeschool's name, address, phone, email and optional logo or seal.</td></tr>
          <tr><td>Student details</td><td>Name, date of birth, address, parent administrator, graduation date and transcript date.</td></tr>
          <tr><td>Grade blocks</td><td>Courses for grades 9 to 12 (plus high school credit earned in grade 8), each with its level, grade and credits, and the year's credits and GPA.</td></tr>
          <tr><td>Cumulative summary</td><td>Total credits, unweighted and weighted GPA, credits in progress, and credits by subject.</td></tr>
          <tr><td>Test scores, notes</td><td>Optional SAT, ACT, AP or CLEP scores, college and transfer credit notes, activities.</td></tr>
          <tr><td>Grading key</td><td>Your grading scale, weights, the GPA formula and the meaning of H, AP, DE, TR, P and IP.</td></tr>
          <tr><td>Signature</td><td>The administrator's name, an optional drawn or scanned signature, and the date.</td></tr>
        </tbody>
      </table>

      <h2>Three designs</h2>
      <ul>
        <li><strong>Classic:</strong> serif type, centered header and double rule. Traditional and formal.</li>
        <li><strong>Modern:</strong> a color band across the top in the color of your choice, with sans-serif type.</li>
        <li><strong>Minimal:</strong> black and white, left-aligned, compact.</li>
      </ul>
      <p>All three print on US Letter or A4 and fit a typical four-year record on one page. Longer records continue onto a second page with a "continued" header.</p>

      <h2>By year or by subject?</h2>
      <p>Transcripts are usually organized <strong>by year</strong> (grade 9, 10, 11, 12), which shows progress over time and is what most admissions readers expect. A <strong>by subject</strong> layout groups all English courses together, all math together, and so on. It suits students whose work didn't follow a standard year-by-year pattern. GradLedger's transcript is by year and adds a credits-by-subject summary, so readers get both views. The <a href="/homeschool-course-description-generator">course descriptions</a> document can be ordered either way.</p>

      <h2>Template vs a word processor</h2>
      <table>
        <thead><tr><th></th><th>Blank document template</th><th>GradLedger</th></tr></thead>
        <tbody>
          <tr><td>GPA and credits</td><td>Calculated by hand</td><td>Calculated exactly, per year and cumulative</td></tr>
          <tr><td>Adding a course</td><td>Re-do the table layout</td><td>Type the name and press Enter</td></tr>
          <tr><td>Grading scale and key</td><td>Typed by hand</td><td>Added automatically from your settings</td></tr>
          <tr><td>Editing later</td><td>Edit the file</td><td>Saved in your browser; backup file for other devices</td></tr>
          <tr><td>Cost</td><td>Usually free</td><td>Free</td></tr>
        </tbody>
      </table>
      <p>If you prefer to keep your transcript in a document editor such as Google Docs or Word, you can still use GradLedger to calculate the <a href="/homeschool-gpa-calculator">GPA</a> and credits and copy the numbers in. GradLedger isn't affiliated with Google or Microsoft.</p>`,
  faq: [
    ["Is this homeschool transcript template free?", "Yes, completely, including all three designs, your logo and a signature. There's no signup. Each PDF has one small \"Prepared with GradLedger\" line at the bottom."],
    ["Can I edit the transcript after downloading?", "Edit your courses in GradLedger and download a new PDF. Your records stay saved in your browser, so updating the transcript each year takes a minute."],
    ["Does the template fit on one page?", "A typical four-year record of 6 to 8 courses a year fits on one page. Longer records continue onto a second page with a continued header and page numbers."],
    ["Can I add a school logo or seal?", "Yes, free. Upload an image on the Student tab. Only use a logo for your own homeschool, never the name or seal of another institution."],
    ["What should not go on a homeschool transcript?", "Leave off anything you can't support, such as courses that weren't completed or labels like AP without an authorized course. Don't claim accreditation you don't have. Keep personal details to what's needed: name, date of birth, address and graduation date."],
  ],
});

// ================================ REPORT CARD ================================
pages.push({
  path: "/homeschool-report-card-template", crumb: "Homeschool report card",
  title: "Homeschool Report Card Template: Free PDF Generator",
  desc: "Homeschool report card template: grades, credits, GPA, attendance and comments for each school year, made from your records. Free PDF download, no signup.",
  h1: "Homeschool Report Card Template",
  lead: "Make a one-page report card for any high school year from the courses and grades you've already entered: grades, credits, GPA, attendance and your comments.",
  tool: { id: "gl-app", label: "Homeschool report card generator", attrs: ' data-tab="transcript" data-doc="report"' },
  graph: [APP_LD(`${URL}/homeschool-report-card-template`, "Homeschool report card generator", "Creates a one-page homeschool report card PDF for a school year with grades, credits, GPA, attendance and comments.")],
  body: `      <p class="tldr"><strong>Quick answer:</strong> A homeschool report card covers one school year: the student's name and grade, each course with its final grade (letter and percentage), credits and hours, the year's credits and GPA, attendance if you track it, a short comment from the parent, the grading scale and a signature. GradLedger builds it from the same records as the transcript.</p>

      <h2>How to make a homeschool report card</h2>
      <ol class="steps">
        <li><strong>Enter the year's courses and grades</strong> on the Courses tab, or load the example to see how it works.</li>
        <li><strong>Choose "Report card"</strong> on the Transcript &amp; PDFs tab and pick the grade.</li>
        <li><strong>Add attendance and comments</strong> if you like, for example "176 of 180 days" and a few sentences on progress and goals.</li>
        <li><strong>Download the PDF</strong>, then sign and date it.</li>
      </ol>

      <h2>What goes on the report card</h2>
      <table>
        <thead><tr><th>Section</th><th>Details</th></tr></thead>
        <tbody>
          <tr><td>Header</td><td>Your homeschool's name and address, "Report Card", and the grade and school year.</td></tr>
          <tr><td>Student</td><td>Name, grade level, school year and the date of the report.</td></tr>
          <tr><td>Courses</td><td>Each course with its subject, level (Honors, AP, Dual enrollment), grade with percentage, credits and logged hours.</td></tr>
          <tr><td>Summary</td><td>Credits earned this year, credits in progress, and the year's GPA (weighted too, if any course is weighted).</td></tr>
          <tr><td>Attendance and comments</td><td>Optional. Printed only when you fill them in.</td></tr>
          <tr><td>Grading key and signature</td><td>Your grading scale and weights, then the administrator's signature line and date.</td></tr>
        </tbody>
      </table>

      <h2>Report card vs transcript</h2>
      <table>
        <thead><tr><th></th><th>Report card</th><th>Transcript</th></tr></thead>
        <tbody>
          <tr><td>Covers</td><td>One school year</td><td>All of high school</td></tr>
          <tr><td>Main reader</td><td>The family, sports leagues, programs that ask for current grades</td><td>Colleges, employers, the military, scholarship committees</td></tr>
          <tr><td>Shows</td><td>Grades with percentages, hours, attendance, comments</td><td>Final grades, credits, yearly and cumulative GPA, credits by subject</td></tr>
          <tr><td>When</td><td>End of each year (or term)</td><td>When applying, updated each year</td></tr>
        </tbody>
      </table>

      <h2>Writing report card comments</h2>
      <p>Two or three specific sentences are better than a paragraph of praise. Mention a strength, an area of growth and a goal, for example: "Wrote a 10-page research paper on the Dust Bowl and improved her citations. Algebra 2 took steady effort; her quiz average rose from 78 to 91 in the second semester. Next year: Precalculus and a lab-based chemistry course."</p>

      <h2>When a homeschool report card is useful</h2>
      <ul>
        <li>Keeping a yearly record alongside the cumulative <a href="/homeschool-transcript-template">transcript</a>.</li>
        <li>Sports leagues, programs, employers or other organizations that ask for proof of current grades.</li>
        <li>Moving between homeschooling and a school, where the school may ask for records of the last year.</li>
        <li>A family portfolio, next to work samples and an <a href="/homeschool-hours-tracker">hours log</a>.</li>
      </ul>
      <p>Whether your state requires any yearly records depends on its homeschool law, so check it. Report cards here are for grades 8 to 12; GradLedger is built for high school records.</p>`,
  faq: [
    ["Is the homeschool report card free?", "Yes, with no signup. It uses the same records as your transcript, and the PDF has a small \"Prepared with GradLedger\" line at the bottom."],
    ["Can the report card show percentages?", "Yes. If you enter percentage grades, the report card shows the letter with the percentage, such as A- (91)."],
    ["Can I make report cards for several children?", "Yes. Add each student, enter their courses, and switch between them with the student menu."],
    ["Does it work for semesters or quarters?", "The report card covers a whole grade year. For a mid-year report, enter grades so far and mark unfinished courses IP (in progress)."],
    ["Can I add attendance?", "Yes. Type it in any form, such as \"176 of 180 days\" or \"172 days\", and it prints under the grades."],
  ],
});

// ================================ ABOUT / PRIVACY ================================
pages.push({
  path: "/about", crumb: "About",
  title: "About GradLedger: Free Homeschool Records Tools",
  desc: "GradLedger is a free homeschool transcript, GPA and course description tool. It runs in your browser with no signup and never uploads your records.",
  h1: "About GradLedger",
  lead: "Free, private record-keeping for homeschool high school: transcripts, GPA, credits, course descriptions and hours.",
  body: `      <p>GradLedger is part of <strong>MiniTools</strong>, a small set of free, single-purpose web tools. It helps homeschool parents act as the school registrar: keep a record of high school courses, calculate GPA and credits correctly, write course descriptions and produce a clean transcript.</p>
      <h2>Why it exists</h2>
      <p>Many transcript tools charge per transcript, add a watermark, email the PDF to collect your address, or keep your records behind an account. Grade records are sensitive, and a family should be able to make a transcript without handing them over. GradLedger is free and works entirely in your browser.</p>
      <h2>How the numbers are calculated</h2>
      <p>GPA uses the standard credit-weighted formula with exact arithmetic and the grading scale and weights you choose. The formula, scale and weights are printed on every transcript. See the <a href="/homeschool-gpa-calculator">GPA calculator</a> for a worked example.</p>
      <h2>What GradLedger is not</h2>
      <p>GradLedger is a record-keeping tool. It doesn't accredit anything, isn't affiliated with any school, college, testing organization or government agency, and doesn't give legal advice. A transcript made here is a parent-issued homeschool record.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free with no paid tier and no ads in the tool. Each PDF carries a small "Prepared with GradLedger" line, which is how other families find it.</p>`,
});
pages.push({
  path: "/privacy", crumb: "Privacy & Terms",
  title: "Privacy Policy and Terms of Use for GradLedger",
  desc: "How GradLedger handles your data: student records stay in your browser and are never uploaded. Cookie-free page analytics and simple terms of use. All free.",
  h1: "Privacy & Terms",
  lead: "Short version: your student's records never leave your device.",
  body: `      <h2>Privacy</h2>
      <p>GradLedger runs in your browser. Student names, dates of birth, courses, grades, hours, notes, logos and signatures are stored in your browser's local storage on your device. They are never sent to our servers or anyone else. PDFs are created on your device. Clearing your browser's site data deletes the records, so download a backup file from the Settings &amp; backup tab.</p>
      <p>Backup files you download contain your records in plain JSON. Store them somewhere private.</p>
      <p>We use Vercel Web Analytics to count page views and a few anonymous events, such as "transcript downloaded". It's cookie-free, doesn't track you across sites, and never receives names, grades or anything you type into the tool.</p>
      <h2>Terms</h2>
      <p>GradLedger is provided "as is", without warranty. You're responsible for the accuracy of the records you create and for following your state's homeschool law and each college's requirements. Use GradLedger only for your own homeschool's records: don't use it to imitate another school or institution, or to create records of work that wasn't done.</p>
      <p>GradLedger is free for personal use and for co-ops and microschools keeping their students' records.</p>`,
});

// ---- write ------------------------------------------------------------------------------------
let warnings = 0;
for (const p of pages) {
  const html = layout(p);
  const file = p.file || p.path.slice(1) + ".html";
  if (p.title.length < 45 || p.title.length > 62) { warnings++; console.warn(`title ${p.title.length}: ${p.path}`); }
  if (p.desc.length < 120 || p.desc.length > 158) { warnings++; console.warn(`desc ${p.desc.length}: ${p.path}`); }
  writeFileSync(join(OUT, file), html);
}
console.log(`wrote ${pages.length} pages${warnings ? `, ${warnings} length warnings` : ""}`);
