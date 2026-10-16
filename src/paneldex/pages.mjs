// Generates every PanelDex page (home, landing pages, about, privacy) plus llms.txt from one layout.
// Usage: node src/paneldex/pages.mjs   (writes into sites/paneldex/)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/paneldex");
const C = createRequire(import.meta.url)(join(OUT, "core.js"));
const URL = "https://panelschedule.roohsites.com";
const NAME = "PanelDex";
const ACCENT = "#854d0e";
const DATE = "2026-10-16", DATE_H = "16 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const SAFETY = "Labelling tool only. Turn power off and follow local code; have a licensed electrician do electrical work.";
const NOT_CODE = "These are totals of the loads you entered — not a code load calculation. For sizing a service, feeder or panel, a licensed electrician does an NEC Article 220 load calculation.";
const BRANDS = "PanelDex works with any brand of panel, including Square D, Siemens, Eaton, Leviton and GE, and is not affiliated with any of them.";

// Worked examples come straight from the engine, so the numbers in the copy always match the tool.
const exHome = C.example("home"), tHome = C.totals(exHome);
const ex3 = C.example("p3"), t3 = C.totals(ex3);
const legLine = t => t.legs.map(l => `${l.leg} ${C.fmtInt(l.va)} VA (about ${C.fmt1(l.amps)} A)`).join(", ");
const LG = { l: C.labelGeometry("letter"), a: C.labelGeometry("a4") };
const inch = pt => (pt / 72).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
const mm = pt => Math.round((pt / 72) * 25.4);

const FOOT = `  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">Electrical panel schedule template</a></li><li><a href="/panel-load-balancing-calculator">Load balancing calculator</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Templates</h4><ul><li><a href="/panel-schedule-template-pdf">Panel schedule PDF</a></li><li><a href="/circuit-breaker-directory-printable">Circuit breaker directory</a></li><li><a href="/breaker-box-label-template">Breaker box labels</a></li><li><a href="/42-circuit-panel-schedule">42 circuit panel schedule</a></li><li><a href="/3-phase-panel-schedule-template">3 phase panel schedule</a></li></ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. ${BRANDS} Excel is a trademark of Microsoft; ${NAME} is not affiliated with Microsoft. ${SAFETY}</p>
  </footer>`;

const RELATED = `      <h2>More templates and guides</h2>
      <ul class="related">
        <li><a href="/">Electrical panel schedule template</a></li>
        <li><a href="/panel-schedule-template-pdf">Panel schedule PDF</a></li>
        <li><a href="/circuit-breaker-directory-printable">Door directory</a></li>
        <li><a href="/breaker-box-label-template">Breaker labels</a></li>
        <li><a href="/42-circuit-panel-schedule">42 circuit panel</a></li>
        <li><a href="/3-phase-panel-schedule-template">3 phase panel</a></li>
        <li><a href="/panel-load-balancing-calculator">Load per leg</a></li>
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
const FEATURES = ["Two-column panel editor numbered like a real panel (odd left, even right)", "120/240 V split-phase, 120/208 V and 277/480 V three-phase", "12 to 84 spaces", "Single-pole, 2-pole, 3-pole, tandem and spare breakers with placement checks", "Description, room, amps, wire size, AFCI/GFCI/dual function and load in VA per circuit", "VA and approximate amps per leg or phase with an imbalance percentage", "Panel schedule PDF (Letter or A4)", "Door directory PDF in Letter, half letter or a custom size", "Breaker label strips PDF", "Excel .xlsx with live SUMIF formulas", "CSV export and import", "Share link and QR code", "Several saved panels in the browser"];
const appLd = (name, path, desc) => ({
  "@type": "WebApplication", name, url: URL + path, description: desc, applicationCategory: "BusinessApplication",
  operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: FEATURES,
  publisher: PUBLISHER,
});
const howToLd = (name, steps) => ({ "@type": "HowTo", name, totalTime: "PT30M", step: steps.map(([n, t]) => ({ "@type": "HowToStep", name: n, text: strip(t) })) });
const stepsHtml = steps => `      <ol class="steps">\n${steps.map(([n, t]) => `        <li><strong>${esc(n)}.</strong> ${t}</li>`).join("\n")}\n      </ol>`;
const faqHtml = faq => `      <h2 id="faq">Frequently asked questions</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}`;
const updated = extra => `      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the Rooh Sites team.${extra ? " " + extra : ""}</p>`;

function page({ path, title, desc, h1, lead, quick, badges, tool, body, faq = [], crumb, schema = [], noRelated }) {
  const isHome = path === "/";
  const graph = [];
  if (!isHome) graph.push({ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` },
    { "@type": "ListItem", position: 2, name: crumb || h1, item: URL + path }] });
  graph.push(...schema);
  if (faq.length) graph.push(faqLd(faq));
  const navHtml = isHome
    ? `<a href="#how">How it works</a><a href="/circuit-breaker-directory-printable">Door directory</a><a href="#faq">FAQ</a>`
    : `<a href="/">Schedule maker</a><a href="/breaker-box-label-template">Labels</a><a href="/about">About</a>`;
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
${quick ? `    <div class="content narrow quick"><p class="tldr"><strong>Quick answer:</strong> ${quick}</p></div>\n` : ""}${tool ? `    <section class="tool card" aria-label="Panel schedule maker"><div id="pd-tool"${toolAttr}></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? faqHtml(faq) + "\n" : ""}${noRelated ? "" : RELATED + "\n"}${updated(path === "/privacy" || path === "/about" ? "" : "General information, not electrical advice.")}
    </article>
  </main>
${FOOT}
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

const numberingDiagram = (sys, rows) => {
  const S = C.SYSTEMS[sys];
  const out = [];
  for (let r = 1; r <= rows; r++) {
    const leg = S.legs[(r - 1) % S.legs.length];
    out.push(`${String(2 * r - 1).padStart(3)}  ─┤ ${leg.padEnd(2)} ├─  ${String(2 * r).padEnd(3)}`);
  }
  return `      <pre class="diagram" aria-label="Numbering of the first ${rows * 2} spaces">${out.join("\n")}\n  …         …         …</pre>`;
};

/* ------------------------------------------------------------------ home */
const homeSteps = [
  ["Set up the panel", "Type the panel name (for example <em>Main panel</em> or <em>Garage subpanel</em>), where it is, what feeds it, the main breaker rating or <em>main lugs only</em>, and the bus rating from the panel's label. Choose the system and the number of spaces."],
  ["Walk the panel", "With the cover on, read the number and handle rating of each breaker and work out what it feeds. The usual way is to switch one breaker off at a time and see what stops working."],
  ["Enter each breaker", "Select a space in the two-column editor, pick single-pole, 2-pole, 3-pole, tandem or spare, and fill in the description, room, amps, wire size and AFCI/GFCI protection. <em>Next</em> moves to the following space."],
  ["Add loads if you know them", "Type each circuit's load in volt-amperes (VA), for example from an appliance nameplate. The totals panel adds them per leg or phase and shows the imbalance."],
  ["Download and post it", "Download the schedule PDF or the Excel file for your records, print the door directory for the inside of the panel door, and cut out the label strips to stick beside each breaker."],
];
const homeFaq = [
  ["Is PanelDex free?", "Yes. Every feature is free, with no account and no limit on panels or downloads. Each PDF page has a small “Made with PanelDex” line in the bottom margin, outside the schedule, the labels and the directory's trim line, and the Excel file has the same line in one cell below the totals."],
  ["Does PanelDex check my panel against the electrical code?", `No. It's a labelling and record-keeping tool. It checks only how breakers fit in the spaces (for example, a 2-pole breaker can't run off the bottom of a column), not wire sizes, breaker ratings or code rules. ${SAFETY}`],
  ["How are the circuits numbered?", "The standard way for North American panels: odd numbers down the left side (1, 3, 5…) and even numbers down the right (2, 4, 6…), so spaces 1 and 2 sit side by side on the top row. If the numbers printed on your panel follow a different pattern, go by what's printed on it."],
  ["How do I enter a tandem breaker?", "Select the space and choose <em>Tandem / twin</em>. The space gets two circuits labelled with the space number plus A and B, such as 13A and 13B, each with its own description, amps and load. Tandems only belong in panels whose label allows them, and only in the spaces it allows."],
  ["What's the difference between a spare and a space?", "A spare is a breaker that's installed but has nothing connected to it. A space is an empty position with no breaker at all. Both show on the schedule, so whoever adds a circuit later can see what's free."],
  ["Can I edit the Excel file?", "Yes. The .xlsx has one row per space with a live formula for each pole's share of the load, and the per-leg or per-phase totals are SUMIF formulas. Change a load in Excel, Google Sheets or LibreOffice and the totals update."],
  ["Can I keep schedules for several panels?", "Yes. Each panel autosaves in this browser. <em>Your panels</em> lists them with Open, Duplicate and Delete, and <em>Backup all</em> saves every panel to one JSON file that you can restore on another computer."],
  ["Is my panel data uploaded anywhere?", "No. Everything runs in your browser and is stored only on this device. The share link carries the panel inside the link itself, so it only goes where you send it."],
];
const home = {
  path: "/",
  title: "Electrical Panel Schedule Template (Excel & PDF) | PanelDex",
  desc: "Free electrical panel schedule template laid out like a real panel. Enter breakers, see load per leg, then download Excel, a PDF, a door directory and labels.",
  h1: "Electrical Panel Schedule Template (Excel & PDF)",
  lead: "Fill in your breakers on a panel numbered the way real panels are, see the load on each leg, then download a filled-in schedule, a door directory, breaker labels and an Excel file. Free, no signup, nothing uploaded.",
  quick: "Choose the system (120/240 V split-phase, 120/208 V or 277/480 V three-phase) and the number of spaces, then select each space and enter the breaker: description, room, amps, wire size, AFCI or GFCI, and load in VA. Odd circuits run down the left and even down the right, as in the panel. Download the schedule as a PDF or as Excel with live SUMIF totals, plus a door directory and label strips.",
  badges: ["100% free", "Excel with live formulas", "PDF, door directory &amp; labels", "Split-phase &amp; 3-phase"],
  tool: { preset: "home" },
  schema: [appLd(NAME, "/", "Free electrical panel schedule maker. Lay out breakers the way the panel is numbered, total the load per leg or phase, and download a PDF schedule, a door directory, breaker labels, Excel and CSV."), howToLd("How to fill in an electrical panel schedule", homeSteps)],
  faq: homeFaq,
  body: `      <h2 id="how">How to fill in a panel schedule in 5 steps</h2>
${stepsHtml(homeSteps)}
      <p class="note"><strong>Safety:</strong> ${SAFETY} You don't need to take the cover off to make a schedule: everything above can be read from the front of the panel.</p>

      <h2>How breaker panels are numbered</h2>
      <p>In a standard North American panel, the breaker spaces are numbered in pairs across the panel: 1 and 2 on the top row, 3 and 4 on the next, and so on. That puts all the odd numbers down the left and all the even numbers down the right. The editor above uses the same layout, so the screen looks like the panel in front of you.</p>
      <p>Each row connects to one bus position, and the rows alternate between the two hot legs of a 120/240 V panel:</p>
${numberingDiagram("1p240", 4)}
      <p>Because vertically neighbouring spaces are on different legs, a 2-pole breaker in spaces 1 and 3 connects to both L1 and L2 and supplies 240 V. On a three-phase panel the rows cycle through phases A, B and C, and a 3-pole breaker takes three spaces in a column, one on each phase. If your panel's printed numbers follow a different pattern, use what's printed on it.</p>

      <h2>What goes in each column</h2>
      <table>
        <thead><tr><th>Column</th><th>What to write</th></tr></thead>
        <tbody>
          <tr><td>Description</td><td>What the circuit feeds, specific enough that someone else can find it: “Kitchen counter, left of sink” rather than “Plugs”.</td></tr>
          <tr><td>Room / area</td><td>Where the loads are, using permanent names: “Bedroom, northeast” rather than a person's name.</td></tr>
          <tr><td>Amps</td><td>The rating on the breaker handle, such as 15, 20 or 30.</td></tr>
          <tr><td>Wire</td><td>The conductor size in AWG or kcmil, if you know it. It's printed on cable jackets. Leave it blank rather than guess.</td></tr>
          <tr><td>Protection</td><td>Standard, AFCI (arc-fault), GFCI (ground-fault) or dual function (both). The breaker itself is usually marked, often with a test button.</td></tr>
          <tr><td>Load (VA)</td><td>Optional. The load you expect on the circuit in volt-amperes, which you type in. PanelDex doesn't estimate loads.</td></tr>
        </tbody>
      </table>

      <h2>Breaker types the editor understands</h2>
      <ul>
        <li><strong>Single-pole</strong>: one space, one leg, a 120 V circuit on a 120/240 V or 120/208 V panel (277 V on a 277/480 V panel).</li>
        <li><strong>2-pole</strong>: two vertically adjacent spaces in the same column, such as 3 and 5, on two different legs or phases with one handle. Used for 240 V or 208 V loads like ranges, dryers and water heaters.</li>
        <li><strong>3-pole</strong>: three adjacent spaces in a column, one per phase. Three-phase panels only.</li>
        <li><strong>Tandem (twin)</strong>: two breakers in the body of one, so one space holds two circuits, labelled 13A and 13B. Only where the panel's label allows them.</li>
        <li><strong>Spare</strong>: a breaker with nothing connected. An empty position with no breaker is a <em>space</em>.</li>
      </ul>
      <p>The editor blocks placements that can't exist: a 2-pole breaker that would run off the bottom of a column, a 3-pole breaker on a single-phase panel, or a breaker that overlaps one already there.</p>

      <h2>Load per leg and imbalance</h2>
      <p>If you enter loads, PanelDex adds them up for each leg (L1 and L2) or each phase (A, B and C). A 2-pole or 3-pole load is split evenly across its poles, so a 4,800 VA water heater on spaces 12 and 14 counts 2,400 VA on each leg. Approximate amps are the leg total divided by 120 V (or 277 V on a 277/480 V panel), and the imbalance is the gap between the highest and lowest leg as a percentage of the highest.</p>
      <p>For the example panel that loads with the tool, that gives ${legLine(tHome)}, a total of ${C.fmtInt(tHome.total)} VA and an imbalance of ${C.fmt1(tHome.imbalance)}%. ${NOT_CODE} The <a href="/panel-load-balancing-calculator">load balancing page</a> explains the numbers in more detail.</p>

      <h2>One set of entries, five files</h2>
      <div class="cards">
        <div class="card"><h3>Panel schedule PDF</h3><p>Landscape Letter or A4 with a header block, the two-column circuit table in panel order and the totals. <a href="/panel-schedule-template-pdf">More</a></p></div>
        <div class="card"><h3>Door directory</h3><p>Large text in the same two columns, sized for the inside of the door: Letter, half letter or custom. <a href="/circuit-breaker-directory-printable">More</a></p></div>
        <div class="card"><h3>Breaker labels</h3><p>Small numbered labels with a short name, 4 across with cut lines, to stick beside each breaker. <a href="/breaker-box-label-template">More</a></p></div>
        <div class="card"><h3>Excel and CSV</h3><p>An .xlsx with SUMIF totals per leg or phase that update as you edit, and a CSV that imports back into PanelDex.</p></div>
      </div>
      <p>You can also copy a share link that carries the whole panel, and print its QR code for a sticker on the panel door, so anyone who scans it sees the full schedule on their phone.</p>

      <h2>Why a filled-in directory matters</h2>
      <p>When a breaker trips at night, or someone needs to shut off one circuit before working on it, a clear directory saves guessing. It also matters for inspections, home sales and handovers between property managers. In general terms, NEC section 408.4(A) asks for every circuit in a panel to be identified by its specific purpose in a directory at the panel, clear enough to tell circuits apart, and not described by things that change over time, such as who uses a bedroom. Check the code edition your area has adopted for the exact wording.</p>
      <p>Many panels still carry a handwritten card from the day they were installed, with entries like “lights” or “misc” that stopped matching the house after the first remodel. Re-doing the directory after any change to the panel keeps it useful.</p>

      <h2>Main panels, subpanels and many panels</h2>
      <p>Use one saved panel per panel. A subpanel schedule works the same way: choose <em>main lugs only</em> if it has no main breaker, and type the panel that feeds it in <em>Fed from</em>, for example “Main panel, circuits 16/18”. Facilities staff and property managers can keep every panel in the list, duplicate a typical unit's panel as a starting point, and back them all up to one JSON file.</p>
      <p>${BRANDS}</p>`,
};

/* ---------------------------------------------------------- landing pages */
const P = [];

P.push({
  path: "/panel-schedule-template-pdf", crumb: "Panel schedule template PDF",
  title: "Panel Schedule Template PDF — Filled In and Free to Print",
  desc: "Free panel schedule template PDF that comes out filled in: header block, circuits in panel order with breaker, wire, AFCI/GFCI and VA, then load totals.",
  h1: "Panel Schedule Template PDF",
  lead: "Skip the blank grid. Enter your circuits once and download a panel schedule PDF that's already filled in, in the same order as the panel.",
  quick: "Enter the panel details and each breaker in the editor above, choose US Letter or A4 under <em>Print and export</em>, and click <em>Panel schedule PDF</em>. You get a landscape page with a header block, a two-column circuit table numbered like the panel (odd left, even right) and per-leg load totals. Larger panels continue onto a second page.",
  tool: { preset: "home" },
  faq: [
    ["Can I get a blank panel schedule PDF to fill in by hand?", "Yes. Start a new blank panel, set the system and number of spaces, and download the schedule without entering any circuits. Every space prints as an empty row with its number and leg, ready for a pen."],
    ["Why is the schedule landscape?", "A panel has two columns of circuits, and each side needs room for a description, room, wire size, protection, breaker and load. Landscape gives both sides enough width to stay readable at normal print sizes."],
    ["What if my panel has 84 spaces?", "The schedule continues on a second page with the header repeated. A 2-pole or 3-pole breaker is never split across a page break, and the load totals print once, at the end."],
    ["Is this a panel schedule generator or a template?", "Both. The layout is fixed like a template, and the generator fills it from what you enter, so you don't retype anything when a circuit changes. Edit the saved panel and download again."],
  ],
  body: `      <h2>What's on the PDF</h2>
      <ul>
        <li><strong>Header block</strong>: the panel name in large type, then location, fed from, system voltage, main breaker or main lugs only, bus rating and number of spaces, plus the date it was printed.</li>
        <li><strong>Circuit table</strong>: two sides that mirror the panel. Each side has description, room or area, wire size, protection, breaker rating and poles, the load on that pole in VA, and the circuit number, with the leg or phase in a centre column.</li>
        <li><strong>Multi-pole breakers</strong>: a 2-pole or 3-pole breaker's description is merged across its rows, and the load is shown per pole so each leg's share is visible.</li>
        <li><strong>Tandems</strong>: a tandem space prints as two lines, such as 13A and 13B.</li>
        <li><strong>Totals</strong>: VA and approximate amps per leg or phase, the total, the imbalance percentage and the formulas behind them, with the note that these aren't a code load calculation.</li>
      </ul>

      <h2>A filled-in template beats a blank grid</h2>
      <p>Most downloadable panel schedule templates are an empty table with 42 numbered rows down one side. That's fine for a pen, but it doesn't match the panel. On a real panel, circuit 2 is beside circuit 1, not below it, and the legs alternate row by row. Filling a single-column grid means translating as you go, and it's easy to put a 2-pole breaker on the wrong pair of numbers.</p>
      <p>PanelDex lays the editor out the way the panel is built, so you enter what you see. The PDF then keeps that order. When an electrician or inspector holds it next to the panel, row 1 on paper is row 1 in the box.</p>

      <h2>Letter or A4, and printing</h2>
      <p>Choose US Letter or A4 before you download. Both print in landscape with half-inch margins, which suits most home and office printers. Print at 100% or <em>Actual size</em> so the text stays the intended size. For a binder or a panel room, slip the page into a sheet protector. Keep a copy with the building's records, since the PDF on paper is what people reach for when the power is off.</p>
      <p>The small “Made with PanelDex” line sits in the bottom page margin, below the table, so it never covers a circuit.</p>

      <h2>Keeping the schedule up to date</h2>
      <p>Every panel autosaves in your browser. When a circuit is added or moved, open the saved panel, change the space, and download again: the printed date in the header shows which version is newest. If you work on many sites, the Excel or CSV download gives you a copy outside the browser, and the CSV loads back in with <em>Import CSV</em>.</p>

      <h2>For contractors and facilities teams</h2>
      <p>Electricians can hand a typed schedule to the customer at the end of a job instead of a handwritten card. Facilities staff can keep one saved panel per panelboard, named after the panel's own label (for example LP-1 or Panel B), and print fresh schedules after each change. ${BRANDS}</p>
      <p class="note">${SAFETY}</p>`,
});

P.push({
  path: "/circuit-breaker-directory-printable", crumb: "Circuit breaker directory printable",
  title: "Circuit Breaker Directory Printable — Sized for Your Door",
  desc: "Printable circuit breaker directory for the inside of the panel door: large text in the panel's own two-column order, on Letter, half letter or a custom size.",
  h1: "Circuit Breaker Directory Printable",
  lead: "A door directory with large, readable text in the same two columns as the breakers, sized to fit the inside of your panel door.",
  quick: "Enter your circuits in the editor above, then under <em>Print and export</em> choose the door directory size: US Letter (8.5 × 11 in), half letter (5.5 × 8.5 in) or a custom width and height in inches or millimetres. Click <em>Door directory PDF</em>, print at 100%, trim on the dashed border and fix it inside the door.",
  tool: { preset: "home" },
  faq: [
    ["What size should a breaker panel directory be?", "Measure the inside of the panel door, or the card holder if it has one, and enter that as a custom size. If there's room for it, half letter (5.5 × 8.5 in) fits many residential panel doors, and Letter suits larger doors."],
    ["How big is the text?", "The text scales to the page and the number of spaces: fewer spaces or a bigger page means larger text. Each row gets an equal share of the height, and long descriptions wrap onto two lines before they shrink."],
    ["Will the “Made with PanelDex” line show on the card?", "No. It prints in the page margin below the dashed trim border. When you trim on the border, it's cut off with the margin."],
    ["Can I print a blank breaker directory?", "Yes. Start a new blank panel with the right number of spaces and download the directory. You'll get numbered, empty rows in two columns to fill in by hand."],
  ],
  body: `      <h2>How the directory is laid out</h2>
      <p>The directory follows the panel: odd circuit numbers down the left column and even numbers down the right, with the numbers on the inside edges where the breakers are. Each row gets equal height, so the card lines up visually with the breakers when it hangs on the open door.</p>
      <ul>
        <li><strong>Title</strong>: the panel name, with location, system, main and what feeds it underneath.</li>
        <li><strong>Each circuit</strong>: a number box, the description (or the room, if there's no description) and the breaker rating.</li>
        <li><strong>2-pole and 3-pole breakers</strong>: one description spanning their spaces, with a bar beside the numbers to show they're tied.</li>
        <li><strong>Tandems</strong>: two lines, such as 13A and 13B.</li>
        <li><strong>Footer</strong>: the date it was printed, the bus rating and the number of spaces.</li>
      </ul>

      <h2>Choosing the size</h2>
      <p>Measure the flat area inside the door before you print. Many doors have a card holder or a printed area on the back; use its inside dimensions. Then pick:</p>
      <table>
        <thead><tr><th>Option</th><th>Page size</th><th>Good for</th></tr></thead>
        <tbody>
          <tr><td>US Letter</td><td>8.5 × 11 in (216 × 279 mm)</td><td>Large doors, panel rooms, a copy on the wall beside the panel</td></tr>
          <tr><td>Half letter</td><td>5.5 × 8.5 in (140 × 216 mm)</td><td>Many residential panel doors</td></tr>
          <tr><td>Custom</td><td>2 in (51 mm) up to 17 × 22 in (432 × 559 mm)</td><td>Exactly the space you measured, in inches or mm</td></tr>
        </tbody>
      </table>
      <p>The dashed border is the trim line; everything inside it is the directory. A small margin outside it holds the credit line, so the card itself stays clean.</p>

      <h2>Writing descriptions that still make sense later</h2>
      <p>In general terms, NEC section 408.4(A) asks for each circuit to be identified by its specific purpose, in a directory at the panel, clear enough to tell it apart from the others, and without relying on things that change, like who sleeps in which bedroom. Local rules and code editions differ, so treat that as background, not a checklist. Some habits that help:</p>
      <ul>
        <li>Name rooms by location: “Bedroom, northeast corner” or “Front bedroom”, not “Emma's room”.</li>
        <li>Say what's on the circuit: “Kitchen counter, left of sink”, “Dishwasher”, “Garage door opener and ceiling light”.</li>
        <li>Mark spares and spaces so the next person knows what's free.</li>
        <li>For a subpanel, put the feeding panel and circuit in <em>Fed from</em>, so the directory says where to shut it off.</li>
      </ul>

      <h2>Printing and fitting it</h2>
      <p>Print at 100% or <em>Actual size</em>; any “fit to page” setting shrinks the card. Card stock lasts longer than plain paper on a door that gets opened often. Trim on the dashed border with a paper trimmer or a ruler and craft knife, then slide it into the card holder or fix it to the inside of the door with clear tape. A clear sleeve or laminating pouch keeps it readable for years.</p>
      <p>Pair the directory with <a href="/breaker-box-label-template">breaker labels</a> beside each handle, and add the share link's QR code as a sticker if you want the full schedule, with wire sizes and loads, a phone scan away.</p>
      <p class="note">${SAFETY}</p>`,
});

P.push({
  path: "/42-circuit-panel-schedule", crumb: "42 circuit panel schedule",
  title: "42 Circuit Panel Schedule Template — Free PDF and Excel",
  desc: "Free 42 circuit panel schedule template: circuits 1–41 down the left, 2–42 down the right, legs or phases per row, with PDF, Excel, directory and labels.",
  h1: "42 Circuit Panel Schedule Template",
  lead: "A 42-space panel schedule laid out in 21 rows the way the panel is numbered, ready to fill in and download as a PDF or Excel file.",
  quick: "The editor above starts with a 42-space, 120/240 V example. Replace the sample circuits with yours (select any space to edit it), or use <em>New blank panel</em> and pick 42 spaces. Download the schedule PDF, the Excel file with live per-leg totals, a door directory and label strips.",
  tool: { preset: "p42" },
  faq: [
    ["How many rows does a 42 circuit panel schedule have?", "21 rows of two spaces each: 1 and 2 on the top row down to 41 and 42 on the bottom. Odd numbers run down the left, even numbers down the right."],
    ["Can a 42-space panel have more than 42 circuits?", "Only with tandem breakers, and only if the panel's label allows tandems in those spaces. Each tandem space holds two circuits, numbered like 13A and 13B on the schedule."],
    ["Why can't I put a 2-pole breaker in space 41?", "A 2-pole breaker needs the space below it in the same column, which would be 43. A 42-space panel stops at 41 on the left, so the editor blocks it. Spaces 39 and 41 work."],
    ["Do you have a 30 circuit panel schedule too?", "Yes. Pick 30 under Spaces (or 12, 20, 24, 40, 54, 60 or 84, or type any even number from 12 to 84). A 30-space panel has 15 rows, 1 to 29 on the left and 2 to 30 on the right."],
  ],
  body: `      <h2>How a 42-space panel is numbered</h2>
      <p>Forty-two spaces make 21 rows. Circuit 1 is top left and circuit 2 is top right; circuit 41 is bottom left and 42 is bottom right. On a 120/240 V split-phase panel the rows alternate between the two legs:</p>
${numberingDiagram("1p240", 3)}
      <p>Row 21, with circuits 41 and 42, is on L1, because the odd-numbered rows are all on L1 and the even rows on L2. On a three-phase 42-space panel the 21 rows cycle A, B, C, giving each phase exactly 7 rows, and circuits 41 and 42 land on phase C.</p>

      <h2>Why 42 is such a common size</h2>
      <p>For many years, the electrical code limited some panelboards to 42 overcurrent devices, so 42 spaces became a standard size for both residential load centres and commercial lighting panels. Larger panels are common now too, but a great many existing panels have 42 spaces, which is why “42 circuit panel schedule” is one of the most searched sizes.</p>
      <p>The tool doesn't limit you to 42. The quick picks cover 12, 20, 24, 30, 40, 42, 54, 60 and 84 spaces, and you can type any even number from 12 to 84. A 30-space panel, for example, has 15 rows, 1 to 29 down the left and 2 to 30 down the right.</p>

      <h2>Filling in a 42-space schedule quickly</h2>
      <ol>
        <li>Start a new blank panel, set 42 spaces and the system, and fill in the header fields.</li>
        <li>Select space 1. Choose the breaker type, type the description and the rest, then press <em>Next</em>. The editor moves to space 2, then 3, in panel order, skipping spaces already taken by a 2-pole or 3-pole breaker.</li>
        <li>Leave unused positions as <em>Empty space</em>, and mark breakers with nothing connected as <em>Spare</em>.</li>
        <li>Check the totals card. Each leg's VA and approximate amps update as you type.</li>
      </ol>
      <p>If you already have the circuits in a spreadsheet, download a CSV from PanelDex to see the column layout, paste your data into it and use <em>Import CSV</em>.</p>

      <h2>2-pole breakers near the bottom</h2>
      <p>A 2-pole breaker takes two spaces one above the other in the same column, so it needs a free space two numbers higher. In a 42-space panel, a 2-pole can start at 39 (taking 39 and 41) or 40 (taking 40 and 42), but not at 41 or 42. The editor tells you why when a placement doesn't fit, and it also refuses one that would overlap a breaker that's already there.</p>

      <h2>The Excel version</h2>
      <p>The .xlsx download lists all 42 spaces in number order with the side, the leg or phase, and the load per pole. The totals at the bottom are SUMIF formulas over the leg column, so if you change a load in the spreadsheet, the leg totals, the approximate amps and the imbalance all recalculate. ${NOT_CODE}</p>
      <p class="note">${SAFETY}</p>`,
});

P.push({
  path: "/3-phase-panel-schedule-template", crumb: "3 phase panel schedule template",
  title: "3 Phase Panel Schedule Template — 120/208V and 277/480V",
  desc: "Free 3 phase panel schedule template for 120/208 V and 277/480 V panels: phases A, B, C by row, 2- and 3-pole breakers, VA per phase, PDF and Excel.",
  h1: "3 Phase Panel Schedule Template",
  lead: "For commercial and light-industrial panelboards: phases A, B and C assigned row by row, 3-pole breakers placed correctly and the load totalled per phase.",
  quick: "The editor above starts with a 42-space 120/208 V three-phase example. Set the system to 120/208 V or 277/480 V, choose the number of spaces, and enter each breaker. Rows cycle A, B, C from the top. Download the schedule PDF, Excel with SUMIF totals per phase, a door directory and labels.",
  tool: { preset: "p3" },
  faq: [
    ["How are phases assigned in a 3 phase panel schedule?", "By row. Circuits 1 and 2 are on phase A, 3 and 4 on B, 5 and 6 on C, then 7 and 8 back on A, and so on down the panel. Both circuits in a row share the same phase."],
    ["Where does a 3-pole breaker go?", "In three vertically adjacent spaces of one column, such as 1, 3 and 5, which puts one pole on each of A, B and C. The editor blocks a 3-pole breaker that would run off the bottom of the column or overlap another breaker."],
    ["How are amps per phase estimated?", "Phase VA divided by 120 V on a 120/208 V panel, or by 277 V on a 277/480 V panel. A 2-pole load on these panels is connected between two phases and draws somewhat more current than this even-split estimate shows."],
    ["Can I use this for a 277/480 V lighting panel?", "Yes. Choose 277/480 V three-phase. Single-pole circuits on that panel are 277 V, which is typical for commercial lighting. The approximate amps use 277 V."],
  ],
  body: `      <h2>Phase by row: A, B, C</h2>
      <p>Three-phase panelboards use the same odd-left, even-right numbering as residential panels, but the bus connects each row to one of three phases in turn:</p>
${numberingDiagram("3p208", 6)}
      <p>Because each row is one phase, a column of three spaces always covers A, B and C once each. That's why a 3-pole breaker takes spaces like 1, 3 and 5, and why a 2-pole breaker in 11 and 13 sits on two different phases.</p>

      <h2>120/208 V and 277/480 V</h2>
      <ul>
        <li><strong>120/208 V</strong>: 120 V from any phase to neutral and 208 V between phases. Single-pole circuits feed 120 V receptacles and lighting; 2-pole and 3-pole breakers feed 208 V equipment such as water heaters, rooftop units and motors.</li>
        <li><strong>277/480 V</strong>: 277 V from phase to neutral and 480 V between phases. Single-pole circuits often feed commercial lighting at 277 V; 3-pole breakers feed larger motors and equipment. Ordinary 120 V receptacles are usually supplied from a separate 120/208 V panel fed through a transformer.</li>
      </ul>

      <h2>Totals per phase</h2>
      <p>The totals card adds the VA you enter on each phase. A multi-pole load is split evenly across its poles, so a 14,000 VA rooftop unit on a 3-pole breaker counts about 4,667 VA on each phase. Approximate amps are the phase VA divided by 120 V (120/208 V panels) or 277 V (277/480 V panels). For two-pole loads on a three-phase panel, the real current is somewhat higher than this even split suggests, so treat the amps as a rough guide.</p>
      <p>For the example panel above, the phases come to ${legLine(t3)}, a total of ${C.fmtInt(t3.total)} VA and an imbalance of ${C.fmt1(t3.imbalance)}%. ${NOT_CODE}</p>

      <h2>A typical commercial schedule</h2>
      <p>Commercial schedules are usually named after the panel's own designation, such as LP-1 or Panel A, and say which switchboard or panel feeds them. Many branch panels are <em>main lugs only</em>, protected by a breaker at the switchboard. The header block carries all of that, plus the bus rating and the number of spaces, and the circuit table shows breaker rating and poles, wire size and the load on each pole.</p>
      <p>The Excel download gives one row per space with the phase in its own column and a per-phase SUMIF total at the bottom, which makes it a reasonable starting point for a 3 phase panel schedule template in Excel that your team can keep updating.</p>

      <h2>Panels with many circuits</h2>
      <p>Choose up to 84 spaces. On the PDF, larger panels continue onto a second page with the header repeated, and a 3-pole breaker is never split across the page break. The door directory scales its text to fit the size you choose, and the label sheet fits 64 labels on Letter or 72 on A4.</p>
      <p class="note">${SAFETY}</p>`,
});

P.push({
  path: "/breaker-box-label-template", crumb: "Breaker box label template",
  title: "Breaker Box Label Template — Printable Numbered Strips",
  desc: "Free breaker box label template: one small numbered label per circuit with a short name, 4 across on Letter or A4 with cut lines. Print, cut and stick.",
  h1: "Breaker Box Label Template",
  lead: "Small printed labels, one per circuit, with the circuit number and a short name to stick beside each breaker.",
  quick: "Enter your circuits in the editor above, choose Letter or A4 under <em>Print and export</em>, and click <em>Breaker labels PDF</em>. Each circuit gets one label with its number (such as 7, 3/5 or 13A) and a short name, 4 across with dashed cut lines. Print at 100%, cut and stick each one beside its breaker.",
  tool: { preset: "home" },
  faq: [
    ["What size are the breaker labels?", `On US Letter each label is ${inch(LG.l.lw)} × ${inch(LG.l.lh)} in, ${LG.l.per} to a page. On A4 they're ${mm(LG.a.lw)} × ${mm(LG.a.lh)} mm, ${LG.a.per} to a page. They're 4 across with dashed cut lines.`],
    ["What paper should I print breaker labels on?", "Plain paper with clear tape over it works, and full-sheet sticker paper is quicker: print, cut on the dashed lines and peel. Labels that will be handled often last longer laminated or covered with clear tape."],
    ["How are 2-pole and tandem breakers labelled?", "A 2-pole breaker gets one label with both space numbers, such as 3/5, and a 3-pole gets three, such as 1/3/5. A tandem gets two labels, such as 13A and 13B, one for each circuit."],
    ["Should I label spares?", "Spare breakers get a label that says Spare, so nobody has to switch them to find out. Empty spaces don't get a label."],
  ],
  body: `      <h2>What's on the label sheet</h2>
      <p>One label per circuit, in panel order, 4 across. Each label has the circuit number in large bold type on the left and a short name on the right: the description you typed, or the room if there's no description. Long names wrap onto two lines before they're shortened. The title at the top of the sheet names the panel, and the credit line sits in the bottom margin, away from the labels.</p>
      <table>
        <thead><tr><th>Paper</th><th>Label size</th><th>Labels per page</th></tr></thead>
        <tbody>
          <tr><td>US Letter</td><td>${inch(LG.l.lw)} × ${inch(LG.l.lh)} in</td><td>${LG.l.per} (${LG.l.rows} rows of 4)</td></tr>
          <tr><td>A4</td><td>${mm(LG.a.lw)} × ${mm(LG.a.lh)} mm</td><td>${LG.a.per} (${LG.a.rows} rows of 4)</td></tr>
        </tbody>
      </table>

      <h2>How circuits are numbered on the labels</h2>
      <ul>
        <li>Single-pole breakers and spares: the space number, such as <strong>7</strong>.</li>
        <li>2-pole breakers: both spaces, such as <strong>3/5</strong>. 3-pole breakers: all three, such as <strong>1/3/5</strong>.</li>
        <li>Tandem breakers: one label per circuit, <strong>13A</strong> and <strong>13B</strong>.</li>
      </ul>
      <p>The numbers match the schedule, the door directory and the Excel file, so a label on the panel always points to the same line on paper.</p>

      <h2>Where to put them</h2>
      <p>Stick each label on the panel cover beside its breaker, next to the number already printed there if there is one. Keep them off the breaker handles, and don't cover the panel's own labels, ratings or warnings. You don't need to remove the cover to label it.</p>
      <p>Each label is a little over half an inch tall. Measure the distance from one breaker to the next on your panel; if it's less than that, trim the labels a little shorter, or rely on the door directory instead.</p>

      <h2>Printing and cutting</h2>
      <p>Print at 100% or <em>Actual size</em>. Cut along the dashed lines with a paper trimmer, or with a ruler and craft knife for straight edges. Sticker paper saves a step. Plain paper works too, held on with a strip of clear tape that also protects the print.</p>
      <p>When a circuit changes, edit the saved panel and print just a fresh sheet; there's no need to re-label every breaker.</p>

      <h2>Labels, directory or both?</h2>
      <p>Labels answer “what is this breaker?” while you're standing at the panel. The <a href="/circuit-breaker-directory-printable">door directory</a> answers “which breaker is the dishwasher?” at a glance, in two columns that mirror the breakers. Most panels benefit from both, and they come from the same entries, so they always agree. ${BRANDS}</p>
      <p class="note">${SAFETY}</p>`,
});

P.push({
  path: "/panel-load-balancing-calculator", crumb: "Panel load balancing calculator",
  title: "Panel Load Balancing Calculator — VA per Leg and Phase",
  desc: "Add up the loads on each leg or phase of a panel: VA, approximate amps and an imbalance percentage. Plain totals, not a code load calculation. Free.",
  h1: "Panel Load Balancing Calculator",
  lead: "See how the loads you enter are spread across L1 and L2, or phases A, B and C, with approximate amps and an imbalance percentage.",
  quick: "Enter each circuit's load in VA in the editor above. The totals card adds them per leg (120/240 V) or per phase (three-phase), splits 2-pole and 3-pole loads evenly across their poles, divides by 120 V (or 277 V) for approximate amps, and shows the imbalance as (highest − lowest) ÷ highest. These are totals of your entries — not a code load calculation.",
  tool: { preset: "home" },
  faq: [
    ["Is this a load calculation for sizing my service?", `No. It adds up the numbers you type. Sizing a service, feeder or panel uses an NEC Article 220 load calculation, which has its own rules and demand factors; a licensed electrician does that. ${SAFETY}`],
    ["Where do I get the VA for each circuit?", "From the equipment: appliance nameplates list watts or amps. Watts are close to VA for heating loads; for others, volts × amps gives VA. Enter the whole load for a 240 V appliance and PanelDex splits it across the two poles."],
    ["What imbalance is acceptable?", "PanelDex shows the percentage but doesn't judge it. Whether and how to move circuits between legs is a decision for a licensed electrician, who can also check things these totals don't cover."],
    ["Why are the amps approximate?", "They divide each leg or phase's VA by 120 V (or 277 V). Loads don't all run at once, real power factors vary, and on three-phase panels a 2-pole load draws somewhat more current than the even split suggests."],
  ],
  body: `      <h2>The formulas</h2>
      <table>
        <thead><tr><th>Number</th><th>How it's worked out</th></tr></thead>
        <tbody>
          <tr><td>VA per leg or phase</td><td>Sum of the loads on that leg. A 2-pole load counts half on each of its legs; a 3-pole load counts a third on each phase.</td></tr>
          <tr><td>Approximate amps</td><td>120/240 V: leg VA ÷ 120. 120/208 V: phase VA ÷ 120. 277/480 V: phase VA ÷ 277.</td></tr>
          <tr><td>Total</td><td>Sum of every load you entered.</td></tr>
          <tr><td>Imbalance</td><td>(highest leg − lowest leg) ÷ highest leg, as a percentage.</td></tr>
        </tbody>
      </table>

      <h2>A worked example</h2>
      <p>The example panel that loads with the tool is a 40-space, 120/240 V house panel. Its loads come to ${legLine(tHome)}. The total is ${C.fmtInt(tHome.total)} VA, and the imbalance is (${C.fmtInt(Math.max(...tHome.legs.map(l => l.va)))} − ${C.fmtInt(Math.min(...tHome.legs.map(l => l.va)))}) ÷ ${C.fmtInt(Math.max(...tHome.legs.map(l => l.va)))} = ${C.fmt1(tHome.imbalance)}%.</p>
      <p>The 8,000 VA range on spaces 3 and 5 adds 4,000 VA to each leg, so it doesn't change the balance. The single-pole circuits are what move it: each one lands entirely on the leg of its row. That's why the editor shows the leg next to every row.</p>

      <h2>Why legs and phases matter</h2>
      <p>On a 120/240 V panel, 120 V circuits on L1 and on L2 share the neutral, which carries roughly the difference between the two legs' 120 V loads. Loads spread fairly evenly across the legs keep each leg's current closer to the other. On a three-phase panel the same idea applies across A, B and C. Seeing the totals makes it easy to notice when most of the heavy single-pole circuits have ended up on one leg.</p>

      <h2>What this is not</h2>
      <p>${NOT_CODE} Article 220 has its own rules, such as standard allowances for general lighting and demand factors for some appliances, and it's applied by someone qualified to size the equipment. Summing connected loads, as this page does, usually gives a different number. Don't use these totals to choose a service size, a feeder or a breaker.</p>
      <p>Moving a circuit to another space to balance the legs is work inside the panel. ${SAFETY}</p>

      <h2>Getting the numbers in</h2>
      <ul>
        <li>Use nameplate ratings where you can. Many appliances list watts; motors and some equipment list amps, which you multiply by the voltage.</li>
        <li>For general receptacle and lighting circuits, enter a figure you're comfortable with as an estimate, or leave the load blank. Blank loads count as zero.</li>
        <li>Enter a 240 V or 208 V appliance's full load once on its 2-pole breaker. PanelDex does the split.</li>
      </ul>
      <p>The Excel download keeps the same formulas live: per-pole loads, SUMIF totals per leg or phase, approximate amps and the imbalance, so you can try changes in a spreadsheet as well.</p>`,
});

/* ----------------------------------------------------------- about/privacy */
P.push({
  path: "/about", crumb: "About",
  title: "About PanelDex — Free Panel Schedule and Breaker Label Maker",
  desc: "PanelDex is one of Rooh Sites' free tools: small, private web tools that run in your browser. Who makes it, why it's free and how it handles your data.",
  h1: "About PanelDex",
  lead: "A small, free tool that does one job: turning a breaker panel into a clear schedule, a door directory and labels.",
  body: `      <p>PanelDex is part of <a href="https://roohsites.com/">Rooh Sites</a>' collection of free single-purpose web tools. It's built for residential and service electricians, handymen, property managers and facilities staff who look after many panels, and homeowners who need a proper directory after a remodel.</p>
      <h2>Why we built it</h2>
      <p>Searching for a printable breaker panel label template mostly turns up blank grids. They don't lay circuits out the way a real panel is numbered, they don't know that a 2-pole breaker takes two spaces in one column, and they don't add up the load on each leg. PanelDex does those three things and produces every printout from one set of entries.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free, with no account and no paid tier. Each PDF page has a small “Made with PanelDex” line in the bottom margin, and the Excel file has one cell with the same line below the totals. That's how other people find the tool.</p>
      <h2>How it works</h2>
      <p>Everything runs in your browser. PDFs are made on your device with the open-source jsPDF library, QR codes with qrcode-generator, and the Excel file is written by PanelDex itself. Panels are saved in your browser's local storage. Nothing you type is uploaded.</p>
      <h2>What it doesn't do</h2>
      <p>PanelDex is a labelling and record-keeping tool. It doesn't check wire sizes, breaker ratings or code compliance, and its totals aren't a load calculation. ${SAFETY}</p>
      <p>${BRANDS}</p>`,
});
P.push({
  path: "/privacy", crumb: "Privacy & Terms",
  title: "Privacy & Terms: Your Panel Data Stays on Your Device",
  desc: "How PanelDex handles your data: panels, circuits and loads are processed and stored on your device and never uploaded. Cookie-free analytics only.",
  h1: "Privacy & Terms",
  lead: "Short version: your panels and circuits never leave your device unless you send the share link to someone.",
  noRelated: true,
  body: `      <h2>Privacy</h2>
      <p>PanelDex runs entirely in your browser. Panel details, circuit descriptions, loads and settings are processed on your device to build the editor, the totals, the PDFs, the Excel and CSV files and the QR code. They are never sent to our servers or anyone else.</p>
      <p>Your panels are saved in this browser's local storage so they're there next time. Clearing your browser's site data deletes them, so download a backup or CSV if you want to keep them.</p>
      <p>The share link holds the panel inside the link itself, after the # sign, which browsers don't send to the web server. Anyone you give the link or its QR code to can see that panel.</p>
      <p>We use Vercel Web Analytics to count page views and a few anonymous events, such as “PDF downloaded” with the panel size. It's cookie-free, doesn't track you across sites and never receives what you type into the tool.</p>
      <h2>Terms</h2>
      <p>PanelDex is provided “as is”, without warranty. Check every schedule, directory and label against the panel before you rely on it. ${SAFETY} PanelDex doesn't check code compliance, and its load totals aren't a code load calculation. You're responsible for how you use what it produces. PanelDex is free for personal and commercial use.</p>
      <p>Questions? See the <a href="/about">About page</a>.</p>`,
});

let count = 0;
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
  if (p.title.length < 45 || p.title.length > 62) console.warn(`title ${p.title.length}: ${p.title}`);
  if (p.desc.length < 120 || p.desc.length > 158) console.warn(`desc ${p.desc.length}: ${p.path}`);
  count++;
}

writeFileSync(join(OUT, "llms.txt"), `# ${NAME}

> ${NAME} is a free online electrical panel schedule and breaker label maker. It works with no signup and runs entirely in the browser (nothing is uploaded). Circuits are entered in a two-column editor numbered like a real panel (odd numbers down the left, even down the right), for 120/240 V split-phase, 120/208 V or 277/480 V three-phase panels with 12 to 84 spaces. It supports single-pole, 2-pole, 3-pole, tandem and spare breakers, totals the VA you enter per leg or phase with approximate amps and an imbalance percentage, and outputs a panel schedule PDF, a door directory PDF sized for the panel door, breaker label strips, an Excel .xlsx with live SUMIF formulas, CSV, and a share link with a QR code. Every feature is free. There is no paid tier. It is a labelling tool only: it does not check code compliance and its totals are not an NEC Article 220 load calculation.

## Tool
- [Electrical panel schedule template (Excel & PDF)](${URL}/): enter breakers on a panel-shaped editor and download the schedule, directory, labels, Excel and CSV.

## Templates
- [Panel schedule template PDF](${URL}/panel-schedule-template-pdf): what's on the filled-in PDF, Letter or A4, multi-page panels.
- [Circuit breaker directory printable](${URL}/circuit-breaker-directory-printable): door directory sizes (Letter, half letter, custom) and writing clear descriptions.
- [42 circuit panel schedule](${URL}/42-circuit-panel-schedule): numbering of a 42-space panel, legs per row, 2-pole placement near the bottom.
- [3 phase panel schedule template](${URL}/3-phase-panel-schedule-template): phases A, B, C by row, 120/208 V and 277/480 V, per-phase totals.
- [Breaker box label template](${URL}/breaker-box-label-template): label sizes, numbering of 2-pole and tandem breakers, printing and cutting.

## Guides
- [Panel load balancing calculator](${URL}/panel-load-balancing-calculator): VA per leg or phase, approximate amps, imbalance formula and why it is not a code load calculation.

## Key facts
- Price: completely free. No paid tier.
- Privacy: panels stay in the browser's local storage. No account. Share links carry the data in the URL hash.
- Systems: 120/240 V single-phase (L1/L2), 120/208 V and 277/480 V three-phase (A/B/C). Spaces: 12 to 84, even.
- Output: schedule PDF (Letter/A4), door directory PDF (Letter, half letter or custom size), label strips PDF, Excel .xlsx with formulas, CSV import/export, share link + QR code.
- Safety: ${SAFETY}
- Works with any panel brand; not affiliated with Square D, Siemens, Eaton, Leviton or GE.

## Optional
- [About](${URL}/about)
- [Privacy & Terms](${URL}/privacy)
`);
console.log(`wrote ${count} pages + llms.txt`);
