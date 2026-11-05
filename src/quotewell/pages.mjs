// Generates every Quotewell page (home, eight trade pages, two guides, about, privacy), llms.txt and the sitemap input from one layout.
// Usage: node src/quotewell/pages.mjs   (writes into sites/quotewell/)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/quotewell");
const C = createRequire(import.meta.url)(join(OUT, "core.js"));
const URL = "https://estimate.roohsites.com";
const NAME = "Quotewell";
const ACCENT = "#b45309";
const DATE = "2026-11-05", DATE_H = "5 November 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const money = c => C.money(c, "USD");

// Sources for the claims made on the pages. Every claim about what an estimate holds or how the words differ links to one of these.
const SRC = {
  cslb: ["California Contractors State License Board: What is a contract?", "https://www.cslb.ca.gov/Consumers/Hire_A_Contractor/Home_Improvement_Contracts/What_Is_A_Contract.aspx"],
  freshbooks: ["FreshBooks: Quote, estimate, bid or proposal? The differences explained", "https://www.freshbooks.com/blog/estimate-quote-bid-proposal"],
  projul: ["Projul: Quote vs estimate in construction", "https://projul.com/blog/quote-vs-estimate-construction"],
  letsbuild: ["Let's Build: Estimate, quote, bid, proposal, what's the difference?", "https://www.letsbuild.com/blog/estimate-quote-bid-proposal-whats-the-difference"],
  housecall: ["Housecall Pro: Free handyman quote template", "https://www.housecallpro.com/handyman/templates-calculators/free-handyman-quote-template/"],
  bookipi: ["Bookipi: Free handyman estimate templates", "https://bookipi.com/estimate-template/handyman-estimate-template/"],
};
const srcHtml = keys => `      <h2>Sources</h2>\n      <ul class="small">\n${keys.map(k => `        <li><a href="${SRC[k][1]}" rel="noopener nofollow">${esc(SRC[k][0])}</a></li>`).join("\n")}\n      </ul>`;
const DISCLAIM = "Quotewell is an independent tool, not legal, tax or accounting advice. Rules for estimates, contracts, permits and sales tax differ by state, country and trade, so check yours.";

const TRADES = [
  { key: "general", path: "/contractor-estimate-template", kind: "estimate", noun: "contractor", many: "contractors and remodelers",
    title: "Contractor Estimate Template: Free PDF Maker, No Signup", desc: "Make a contractor estimate with labor, materials, markup, tax and a deposit, then download a clean PDF. Free, no signup, runs in your browser.",
    h1: "Contractor estimate template", lead: "Build a clear contractor estimate in a few minutes: scope, labor, materials, markup, tax and deposit, ready to send as a PDF.",
    quick: "Pick <em>General contractor</em>, add your business and the customer, put a price on each line, and download the PDF. The total, tax and deposit are worked out for you, and nothing is uploaded.",
    lines: [["Demolition and haul-away", "Say what is being removed and who pays for disposal."], ["Carpentry labor", "Hours at your rate, or a flat price for the framing, trim or finish work."], ["Lumber and fasteners", "Materials you buy for the job, as one line or several."], ["Finish materials", "Items the customer picks, such as tile, flooring or cabinets, and who supplies them."], ["Permits and inspections", "If the job needs one, say whether the price includes it."]],
    pricing: "Bigger remodels are usually priced as a whole job, built up from labor, materials, subcontractors and a margin for overhead and profit. Smaller repairs are often hourly plus materials. Either way, write down how you got there: customers compare estimates line by line, and an estimate they can follow is easier to say yes to. Use the markup box for overhead and profit, or leave it at 0 and build the margin into your rates.",
    ex: { title: "Bathroom remodel", rates: [1200, 55, 380, 1450, 150], qty: [1, 24, 1, 1, 1], tax: 6, markup: 10, dep: 30, taxable: "material" },
    tips: ["Walk the job and measure before you price it, and write down what you measured.", "List what is <em>not</em> included (painting, drywall repair, furniture moving) so there is nothing to argue about later.", "Put a valid-until date on the estimate: material prices move, and an old estimate should not bind you forever."],
    faq: [["Should an estimate include a markup?", "That is your choice. Many contractors add a percentage for overhead and profit, others build it into their hourly rate and material prices. Quotewell lets you show it as its own line (the <em>Markup</em> box) or leave it at 0."], ["How do I show a deposit?", "Type a percentage or an amount in <em>Deposit to start</em>. The estimate shows the deposit and the balance due on completion."]] },
  { key: "handyman", path: "/handyman-estimate-template", kind: "estimate", noun: "handyman", many: "handymen",
    title: "Handyman Estimate Template: Free Printable PDF Maker", desc: "Write a handyman estimate in minutes: hourly labor, materials, trip fee and a clear total. Download a PDF with your logo. Free, no account.",
    h1: "Handyman estimate template", lead: "A quick, professional estimate for small jobs: labor, materials, a trip fee if you charge one, and a total your customer can read in ten seconds.",
    quick: "Choose <em>Handyman</em>, list each small job as a line, add your hourly rate and materials, and download the PDF. Totals, tax and deposit are worked out for you.",
    lines: [["Labor", "Your hourly rate times the hours you expect, or a flat price per small job."], ["Materials and supplies", "Screws, caulk, a replacement faucet: list them, or give an allowance."], ["Trip or service call fee", "A charge for showing up, if you use one. Say so on the estimate."], ["Disposal and haul-away", "Old fixtures and debris, if you take them away."]],
    pricing: "Handyman work is often quoted per task for small jobs and by the hour for anything open-ended. A minimum charge or a trip fee covers short visits. Whichever you use, say it on the estimate: \"Labor, 3.5 hr\" tells the customer how the price was built, while a bare total invites questions.",
    ex: { title: "Door and fixture repairs", rates: [65, 90, 35, 40], qty: [3.5, 1, 1, 1], tax: 0, markup: 0, dep: 0, taxable: "none" },
    tips: ["Quote small jobs the same day while the customer still remembers the conversation.", "Write the scope as a short list of jobs (\"replace bathroom faucet, re-hang back door\"), not one vague sentence.", "If a job could turn up surprises, say that extra work will be agreed first."],
    faq: [["Should I charge by the hour or by the job?", "Both work. Many handymen price short, well-defined jobs per task and open-ended work hourly. The estimate is clearest when it says which one you used."], ["Can I send it by text?", "Yes. Download the PDF, or use <em>Copy as text</em> to paste the lines and total into a message."]] },
  { key: "electrician", path: "/electrician-estimate-template", kind: "estimate", noun: "electrician", many: "electricians",
    title: "Electrician Estimate Template: Free PDF with Labor & Parts", desc: "Create an electrician estimate with labor, parts, permit and trip charge lines, tax and deposit. Download a PDF with your license number. Free.",
    h1: "Electrician estimate template", lead: "Itemize the labor, wire, devices, fixtures and permits, show your license number, and send a PDF the customer can approve.",
    quick: "Choose <em>Electrician</em>, enter your license or registration number, price each line and download the PDF. Parts can be marked taxable; the tax is worked out on those lines only.",
    lines: [["Electrician labor", "Hours at your rate for installing, replacing or troubleshooting."], ["Wire, boxes and devices", "Cable, boxes, breakers, outlets and switches the job needs."], ["Fixtures or equipment supplied", "Lights, fans, chargers or panels you supply, as separate lines."], ["Permit and inspection", "Say whether it is needed and whether it is in the price."], ["Service call or trip charge", "If you charge one for the first visit."]],
    pricing: "Small installs such as outlets or fixtures are often priced per item. Troubleshooting is usually hourly plus parts. Larger work, such as a panel upgrade, is often priced as one job after a site visit. Show labor and parts on separate lines so the customer can see what they are paying for, and list who supplies fixtures.",
    ex: { title: "Panel upgrade and 3 new garage outlets", rates: [95, 420, 300, 150, 75], qty: [8, 1, 1, 1, 1], tax: 7.25, markup: 0, dep: 30, taxable: "material" },
    tips: ["Put your license number on the estimate. The tool has a field for it under <em>Your business</em>.", "State clearly whether the customer or you supply the fixtures.", "Say who handles the permit and inspection, and whether the fee is in the price."],
    faq: [["Does an electrician estimate need a license number?", "Rules differ by state and country, and many places require licensed electricians to show their number on advertising or contracts. Check your licensing board. Quotewell has a field for it either way."], ["Can I mark only parts as taxable?", "Yes. Each line has a <em>Taxable</em> tick box, and tax is calculated only on the lines you tick."]],
    related: ["https://paneldex.roohsites.com", "Panel schedule maker", "free panel schedules and breaker labels"] },
  { key: "plumber", path: "/plumbing-estimate-template", kind: "estimate", noun: "plumber", many: "plumbers",
    title: "Plumbing Estimate Template: Free PDF Maker for Plumbers", desc: "Make a plumbing estimate with labor, pipe and fittings, fixtures, permit and service call lines. Totals, tax and deposit done for you. Free PDF.",
    h1: "Plumbing estimate template", lead: "Spell out the labor, pipe, fixtures and fees in plain lines, and send the customer a PDF estimate with a total they can approve.",
    quick: "Choose <em>Plumber</em>, price each line, set tax and a deposit if you take one, and download the PDF. Nothing is uploaded.",
    lines: [["Plumber labor", "Hours at your rate, or a flat price for the repair or replacement."], ["Pipe, fittings and supplies", "Materials the job uses, as one line or several."], ["Fixture or appliance supplied", "Water heaters, faucets, toilets: say who supplies them and what is included."], ["Permit", "If the job needs one, say whether it is in the price."], ["Service call or trip charge", "If you charge one for the first visit."]],
    pricing: "Many plumbers quote a flat price for a defined job such as replacing a water heater, and hourly plus parts for diagnosis and repairs. A flat price should say exactly what it covers. If access or hidden damage could change the work, say that extra work will be agreed before it is done.",
    ex: { title: "Water heater replacement", rates: [90, 160, 780, 120, 70], qty: [5, 1, 1, 1, 1], tax: 6.5, markup: 0, dep: 25, taxable: "material" },
    tips: ["Say who supplies the fixture. It changes the price and avoids arguments.", "Describe the old equipment you are removing and who disposes of it.", "If the job needs a permit, say who applies for it."],
    faq: [["Should I give a flat price or an hourly estimate?", "For a well-defined job a flat price is easier for the customer to approve. For diagnosis or open-ended repairs, hourly plus parts is more honest. The estimate should say which."], ["Can I add a service call fee?", "Yes. Use the <em>Service call or trip charge</em> line, or delete it if you do not charge one."]] },
  { key: "painter", path: "/painting-estimate-template", kind: "estimate", noun: "painter", many: "painters",
    title: "Painting Estimate Template: Free PDF for Painters", desc: "Create a painting estimate with prep, walls and ceilings, trim and paint lines, tax and a deposit. Download a clean PDF. Free, no signup.",
    h1: "Painting estimate template", lead: "Price prep, walls, trim and paint on separate lines, say what is and is not included, and send a PDF that is easy to approve.",
    quick: "Choose <em>Painter</em>, enter the rooms in the scope box, price each line by hour, square foot or item, and download the PDF.",
    lines: [["Prep: patching, sanding and masking", "Prep takes real time. Show it as its own line."], ["Painting: walls and ceilings", "Often priced per square foot or per room. Use the unit that matches how you measured."], ["Trim and doors", "Per door or window, or per foot of trim."], ["Paint, primer and supplies", "Say who buys the paint and which brand or finish it is."]],
    pricing: "Painters often price by the room or by the square foot of wall, with prep and trim on separate lines. Say how many coats are included, who picks and buys the paint, and what furniture moving is included. The more specific the scope, the fewer surprises on the day.",
    ex: { title: "Interior painting, 3 bedrooms", rates: [50, 1.6, 45, 320], qty: [6, 1400, 6, 1], tax: 0, markup: 0, dep: 30, taxable: "none" },
    tips: ["Write down the rooms, the number of coats and the colors or finish agreed.", "Say who moves furniture and who protects floors.", "List repairs you are not including, such as water damage or major drywall work."],
    faq: [["Should I price by square foot or by room?", "Either. Use whichever you can measure and explain. The estimate can use <em>sq ft</em>, <em>room</em> or <em>job</em> as the unit."], ["Do I show the paint as a separate line?", "Most painters do, as materials. It makes it clear whether the price includes paint and which one."]] },
  { key: "cleaner", path: "/cleaning-service-quote-template", kind: "quote", noun: "cleaning", many: "cleaning services",
    title: "Cleaning Service Quote Template: Free PDF Quote Maker", desc: "Make a cleaning service quote with per-visit prices, deep clean add-ons, extras and supplies. Download a PDF to send. Free, no signup.",
    h1: "Cleaning service quote template", lead: "Quote regular visits, a deep clean and extras on separate lines, with the rooms and tasks written out, and send the customer a clear PDF.",
    quick: "Choose <em>Cleaning service</em>, list what is included in the scope box, price each visit or add-on, and download the PDF quote.",
    lines: [["Standard cleaning", "The per-visit price, with the rooms and tasks it covers."], ["Deep clean add-on", "First visits and deep cleans can take longer, so list them separately."], ["Inside oven or fridge", "Extras that are not in the standard visit, priced each."], ["Supplies and equipment", "If you charge for them, or say they are included."]],
    pricing: "Cleaning is often quoted per visit, with the price depending on the size of the home and how often you come. A first deep clean is usually listed apart from the regular visits. Write down the frequency (weekly, every two weeks, one-off) and what is not included, such as windows, walls or inside cabinets.",
    ex: { title: "Move-out cleaning", rates: [140, 90, 35, 20], qty: [1, 1, 2, 1], tax: 0, markup: 0, dep: 0, taxable: "none" },
    tips: ["Say how often you will come and for how long the price holds.", "List the rooms and tasks in the scope box. \"Kitchen: counters, sink, stovetop, floors\" beats \"clean kitchen\".", "Say what you need from the customer: access, parking, pets, alarm codes."],
    faq: [["Is a quote different from an estimate?", "Many sources describe a quote as a firmer, itemized price and an estimate as an approximation. Pick <em>Quote</em> at the top of the tool to change the title and wording. See <a href=\"/estimate-vs-quote-vs-bid\">estimate vs quote vs bid</a>."], ["Can I quote a recurring service?", "Yes. Use <em>visit</em> as the unit, put the number of visits in <em>Qty</em>, and say the frequency in the scope."]] },
  { key: "lawn", path: "/lawn-care-quote-template", kind: "quote", noun: "lawn care", many: "lawn care and landscaping businesses",
    title: "Lawn Care Quote Template: Free PDF for Landscapers", desc: "Create a lawn care or landscaping quote with per-visit mowing, planting labor, mulch and haul-away. Download a PDF to send. Free, no signup.",
    h1: "Lawn care quote template", lead: "Quote a mowing route or a one-off yard cleanup with visits, labor and materials on clear lines, and send it as a PDF.",
    quick: "Choose <em>Lawn care and landscaping</em>, put the areas and tasks in the scope box, price each line and download the PDF quote.",
    lines: [["Mowing, edging and trimming", "Per visit. Say how often and which areas."], ["Planting labor", "Hours at your rate, or a flat price per bed."], ["Mulch, soil or plants", "Materials by the yard, bag or plant, with delivery if it is extra."], ["Haul-away", "Clippings, branches and debris, if you take them."]],
    pricing: "Recurring lawn care is usually priced per visit, sometimes as a seasonal package. One-off work such as a spring cleanup or a planting job is priced by the job or by the hour, with materials such as mulch listed separately. Say what happens when weather moves a visit.",
    ex: { title: "Spring yard cleanup", rates: [55, 45, 260, 80], qty: [2, 4, 1, 1], tax: 0, markup: 0, dep: 0, taxable: "none" },
    tips: ["Say which areas are included: front, back, side yards, beds.", "State the visit schedule and what happens when it rains.", "List materials with the quantity and the delivery charge."],
    faq: [["Can I quote a whole season?", "Yes. Put the number of visits in <em>Qty</em> with the unit <em>visit</em>, and say the season and the schedule in the scope."], ["How do I add mulch or plants?", "Add a line, set its type to <em>Materials</em>, and enter the quantity and price. Tick <em>Taxable</em> if your area taxes it."]] },
  { key: "roofing", path: "/roofing-estimate-template", kind: "estimate", noun: "roofing", many: "roofers",
    title: "Roofing Estimate Template: Free PDF Maker for Roofers", desc: "Make a roofing estimate with tear-off, shingles and underlayment, flashing, labor and permit lines. Tax and deposit done for you. Free PDF.",
    h1: "Roofing estimate template", lead: "Show the tear-off, materials, flashing and labor on clear lines, state the area you measured, and send a PDF the homeowner can approve.",
    quick: "Choose <em>Roofer</em>, write the roof area and the layers in the scope box, price each line, set the deposit and download the PDF.",
    lines: [["Tear-off and disposal", "State how many layers come off and who pays for disposal."], ["Shingles and underlayment", "The material, color and warranty line, priced by area."], ["Flashing, vents and fasteners", "Small items that are easy to forget and easy to dispute."], ["Installation labor", "Hours at your rate, or one price for the installation."], ["Permit", "If the job needs one, say whether it is in the price."]],
    pricing: "Roofers usually measure the roof and price by area, with the unit being square feet or the roofing square (100 square feet) depending on the business. You can use <em>sq ft</em>, <em>sq</em> or <em>job</em> as the unit. Put the measured area in the scope, so the customer can see what the price is based on, and say what happens if the decking underneath is damaged.",
    ex: { title: "Roof replacement", rates: [1.1, 2.4, 380, 70, 150], qty: [1800, 1800, 1, 16, 1], tax: 6, markup: 0, dep: 30, taxable: "material" },
    tips: ["Write the area you measured and how you measured it.", "Say what happens if rotten decking is found: a price per sheet agreed in writing beats an argument on the roof.", "Put the material name, color and any manufacturer warranty on the estimate."],
    faq: [["Can I price per roofing square?", "Yes. Type <em>sq</em> as the unit and enter the number of squares. Many roofers use square feet instead. Use whichever you measure in."], ["How do I handle damaged decking?", "Add a line for it with a price per sheet and quantity 0, or say in the terms that extra work is agreed in writing before it starts."]] },
];

const FOOT = `  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">Free estimate maker</a></li><li><a href="/how-to-write-a-contractor-estimate">How to write an estimate</a></li><li><a href="/estimate-vs-quote-vs-bid">Estimate vs quote vs bid</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Templates by trade</h4><ul>${TRADES.map(t => `<li><a href="${t.path}">${esc(t.h1.replace(/ template$/, ""))}</a></li>`).join("")}</ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. ${DISCLAIM}</p>
  </footer>`;

const RELATED = `      <h2>More estimate templates</h2>
      <ul class="related">
        <li><a href="/">Free estimate maker</a></li>
${TRADES.map(t => `        <li><a href="${t.path}">${esc(t.h1.replace(/ template$/, ""))}</a></li>`).join("\n")}
        <li><a href="/how-to-write-a-contractor-estimate">How to write an estimate</a></li>
        <li><a href="/estimate-vs-quote-vs-bid">Estimate vs quote vs bid</a></li>
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
const FEATURES = ["Estimates, quotes and proposals as PDF", "Starting lines and terms for eight trades", "Labor, materials and other lines, each with quantity, unit, rate and a taxable tick box", "Discount, markup, tax and deposit worked out in cents", "Valid-until date, numbering, your logo and signature lines", "US Letter or A4; US, Canadian and Australian dollars, pounds and euros", "Saved on your device only; no account; nothing uploaded"];
const appLd = (name, path, desc) => ({
  "@type": "WebApplication", name, url: URL + path, description: desc, applicationCategory: "BusinessApplication",
  operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, featureList: FEATURES, publisher: PUBLISHER,
});
const articleLd = (h1, path, desc) => ({ "@type": "Article", headline: h1, description: desc, datePublished: DATE, dateModified: DATE, mainEntityOfPage: URL + path, author: PUBLISHER, publisher: PUBLISHER, image: URL + "/og.png" });
const howToLd = (name, steps) => ({ "@type": "HowTo", name, totalTime: "PT5M", step: steps.map(([n, t]) => ({ "@type": "HowToStep", name: n, text: strip(t) })) });
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
    ? `<a href="#how">How it works</a><a href="#trades">Trades</a><a href="#faq">FAQ</a>`
    : `<a href="/">Estimate maker</a><a href="/how-to-write-a-contractor-estimate">Guide</a><a href="/about">About</a>`;
  const attrs = tool ? `${tool.trade ? ` data-trade="${tool.trade}"` : ""}${tool.kind ? ` data-kind="${tool.kind}"` : ""}` : "";
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
${quick ? `    <div class="content narrow quick"><p class="tldr"><strong>Quick answer:</strong> ${quick}</p></div>\n` : ""}${tool ? `    <section class="tool card" aria-label="Estimate maker"><div id="qw-tool"${attrs}></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? faqHtml(faq) + "\n" : ""}${noRelated ? "" : RELATED + "\n"}${updated(note === undefined ? "Prices on this page are made-up examples." : note)}
    </article>
  </main>
${FOOT}
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

/* ------------------------------------------------------------------ made-up examples, worked out by the same engine as the tool */
function example(t) {
  const d = C.applyTrade({ kind: t.kind, issued: "2026-11-05", validDays: 30 }, t.key);
  d.items.forEach((it, i) => { it.rate = t.ex.rates[i]; it.qty = t.ex.qty[i]; it.taxable = t.ex.taxable === "material" ? it.type === "material" : false; });
  d.tax.pct = t.ex.tax; d.markup.pct = t.ex.markup; d.deposit = { mode: "pct", value: t.ex.dep };
  return { d, c: C.calc(d) };
}
function exampleTable(t) {
  const { d, c } = example(t);
  const rows = d.items.map((it, i) => `          <tr><td>${esc(it.desc)}</td><td>${esc(C.qtyText(it.qty))} ${esc(it.unit)}</td><td>${esc(C.rateText(it.rate, "USD"))}</td><td>${money(c.lines[i].cents)}</td></tr>`).join("\n");
  const extra = [["Subtotal", c.subtotal]];
  if (c.markup) extra.push([`${d.markup.label} (${C.pctText(d.markup.pct)})`, c.markup]);
  if (c.tax) extra.push([`${d.tax.label} (${C.pctText(d.tax.pct)}, on the taxable lines)`, c.tax]);
  extra.push(["Total", c.total]);
  if (c.deposit) { extra.push([`Deposit to start (${C.pctText(d.deposit.value)})`, c.deposit]); extra.push(["Balance on completion", c.balance]); }
  return { d, c, html: `      <table>
        <caption>Example with made-up numbers: ${esc(t.ex.title.toLowerCase())}</caption>
        <thead><tr><th>Line</th><th>Quantity</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
${rows}
${extra.map(([l, v], i) => `          <tr><td colspan="3">${i === extra.findIndex(x => x[0] === "Total") ? "<strong>" + esc(l) + "</strong>" : esc(l)}</td><td>${i === extra.findIndex(x => x[0] === "Total") ? "<strong>" + money(v) + "</strong>" : money(v)}</td></tr>`).join("\n")}
        </tbody>
      </table>` };
}

const COMMON_STEPS = [
  ["Pick your trade", "Choose the trade nearest to yours. It fills in typical lines, units and starting terms. The prices are blank: they are yours to set."],
  ["Add your business and the customer", "Your name, phone, email, address, license or registration number and, if you like, your logo. Add the customer's name and the job address, then describe the scope of work."],
  ["Price the lines", "For each line choose labor, materials or other, then enter the quantity, unit and rate. Tick <em>Taxable</em> on the lines your area taxes."],
  ["Set discount, markup, tax and deposit", "Each is optional. The total, the deposit and the balance due update as you type."],
  ["Download the PDF", "The PDF is built on your device. Send it, print it with the signature lines, or use <em>Copy as text</em> for a message."],
];

/* ------------------------------------------------------------------ home */
const homeFaq = [
  ["Is Quotewell free?", "Yes. The estimate maker is free, with no account, no sign-up and no limit on documents. Each PDF has a small “Made with Quotewell” line in the bottom margin."],
  ["What is the difference between an estimate, a quote and a proposal?", "Sources describe an estimate as an approximate price, a quote as a firmer itemized offer and a proposal as a fuller document with scope and terms, but the words overlap. Pick <em>Estimate</em>, <em>Quote</em> or <em>Proposal</em> at the top of the tool to change the title. See <a href=\"/estimate-vs-quote-vs-bid\">estimate vs quote vs bid</a>."],
  ["Does it work out tax?", "Yes, but you decide which lines are taxable and at what rate. Tax rules for materials and labor differ by state and by job, so Quotewell does not guess: it applies your rate to the lines you tick."],
  ["Can I add a deposit?", "Yes. Enter a percentage or an amount in <em>Deposit to start</em>. The estimate shows the deposit and the balance due on completion."],
  ["Can I add my logo and a signature line?", "Yes. Upload a PNG or JPG logo (it stays on your device) and tick <em>Add signature lines</em> for a customer and contractor signature and date."],
  ["How many lines can an estimate have?", "Up to 60 lines. Long estimates continue on extra pages, with the column headings repeated and the totals and signature block kept together."],
  ["Where is my information stored?", "Only in your browser. Your business details, the document in progress and anything you choose to save stay on this device, and the PDF is built on your device. Nothing is uploaded."],
  ["Is this legal advice?", "No. Quotewell prints the lines and terms you enter. The starting terms are plain examples to edit. Rules for estimates, contracts and permits differ by state, country and trade, so check yours."],
];
const home = {
  path: "/",
  title: "Free Estimate Maker for Contractors: PDF Quotes in Minutes",
  desc: "Make a professional estimate, quote or proposal PDF for your trade: labor, materials, markup, tax, deposit and signature lines. Free, no signup.",
  h1: "Free estimate and quote maker for contractors and trades",
  lead: "Itemize labor and materials, add tax and a deposit, and download a professional PDF estimate in minutes. No account, nothing uploaded.",
  badges: ["Free, no sign-up", "Runs in your browser", "Your data stays on your device", "PDF in US Letter or A4"],
  tool: {},
  schema: [appLd(NAME + " estimate maker", "/", "Free estimate, quote and proposal maker for contractors, handymen, electricians, plumbers, painters, cleaners, lawn care and roofers.")],
  faq: homeFaq,
  body: `      <h2 id="how">How it works</h2>
${stepsHtml(COMMON_STEPS)}
      <h2 id="trades">Estimate templates by trade</h2>
      <p>Every trade page opens the same free tool with that trade's typical lines and starting terms filled in. The prices are left blank on purpose: they depend on your costs, your market and your area.</p>
      <ul class="related">
${TRADES.map(t => `        <li><a href="${t.path}">${esc(t.h1.replace(/ template$/, ""))}</a></li>`).join("\n")}
      </ul>
      <h2>What a good estimate contains</h2>
      <p>Sources on writing estimates agree on the basics: the scope of work, labor and material costs, the dates, what is included and excluded, and the payment terms (see <a href="https://www.freshbooks.com/blog/estimate-quote-bid-proposal" rel="noopener nofollow">FreshBooks</a> and <a href="https://www.housecallpro.com/handyman/templates-calculators/free-handyman-quote-template/" rel="noopener nofollow">Housecall Pro</a>). Quotewell gives each one a place: a scope box, typed lines with a quantity, unit and rate, a valid-until date, a terms box and signature lines. Our <a href="/how-to-write-a-contractor-estimate">step-by-step guide</a> explains each part.</p>
      <h2>What it does for you</h2>
      <ul class="check">
        <li>Works out line amounts, discount, markup, tax and deposit in whole cents, so the numbers on the page add up exactly.</li>
        <li>Marks each line as labor, materials or other, and can show that split in the totals.</li>
        <li>Numbers your documents (EST-0001, EST-0002 and so on) and sets a valid-until date.</li>
        <li>Remembers your business details and logo on your device, so you only type them once.</li>
        <li>Keeps up to 30 saved documents on your device, so you can reopen or copy an old estimate for a new job.</li>
        <li>Handles long estimates across several pages and prints in US Letter or A4, in US, Canadian or Australian dollars, pounds or euros.</li>
      </ul>
      <h2>Why it is free</h2>
      <p>Quotewell is one of Rooh Sites' free tools for small businesses. Rooh Sites builds simple websites for local businesses; the free tools are how people find us. Each PDF carries a small “Made with Quotewell” line in the bottom margin. There is no paid tier and nothing is locked.</p>
      <h2>Before you send an estimate</h2>
      <p>Check the lines, the totals and the terms, and check the rules where you work. In California, for example, the state licensing board says home improvement work over $500 needs a written contract signed by all parties, and changes must be in writing too (<a href="https://www.cslb.ca.gov/Consumers/Hire_A_Contractor/Home_Improvement_Contracts/What_Is_A_Contract.aspx" rel="noopener nofollow">CSLB</a>). Other places have their own rules. ${DISCLAIM}</p>`,
};

/* ------------------------------------------------------------------ trade pages */
const P = [];
for (const t of TRADES) {
  const ex = exampleTable(t);
  const Kind = C.KINDS[t.kind], kind = Kind.toLowerCase();
  const preset = C.TRADES[t.key];
  const common = [
    [`Is this ${t.noun} ${kind} template really free?`, `Yes. There is no account, no sign-up and no limit. Each PDF has a small “Made with Quotewell” line in the bottom margin.`],
    ["Where is my information stored?", "Only in your browser. Your details and documents stay on your device and the PDF is built there. Nothing is uploaded."],
    ["Can I add my logo and a signature line?", "Yes. Upload a PNG or JPG logo and tick <em>Add signature lines</em>. The PDF then has a customer and a contractor signature and date."],
  ];
  const faq = [...t.faq, ...common];
  const steps = [["Choose " + preset.label, `Click <em>${esc(preset.label)}</em> in the tool. It fills in typical lines and starting terms.`], ...COMMON_STEPS.slice(1)];
  const body = `      <h2>What goes on a ${esc(t.noun)} ${kind}</h2>
      <p>Whatever the trade, a good ${kind} says what the work is, what it costs and what it does not cover. The lines Quotewell starts you with for ${esc(t.many)} are below; rename, delete or add lines to suit the job.</p>
      <ul>
${t.lines.map(([l, why]) => `        <li><strong>${esc(l)}.</strong> ${esc(why)}</li>`).join("\n")}
      </ul>
      <p>Around the lines, put a clear scope of work, your contact details, the date and a valid-until date, the payment terms and a place to sign. Sources that describe what to include list the same things: the scope, labor and material costs, dates, inclusions and exclusions, and the payment terms (<a href="${SRC.freshbooks[1]}" rel="noopener nofollow">FreshBooks</a>, <a href="${SRC.housecall[1]}" rel="noopener nofollow">Housecall Pro</a>).</p>
      <h2>How to price ${esc(t.noun)} work</h2>
      <p>${t.pricing}</p>
      <h2>An example, with made-up numbers</h2>
      <p>This is a ${kind} for a made-up job, worked out by the same engine the tool uses. The numbers are invented to show the layout. They are not a price guide: charge what your costs, your market and your area support.</p>
${ex.html}
      <h2>How to make your ${kind} in four steps</h2>
${stepsHtml(steps)}
      <h2>Tips for a ${kind} that wins the job</h2>
      <ul>
${t.tips.map(x => `        <li>${x}</li>`).join("\n")}
      </ul>
      <h2>Check your local rules</h2>
      <p>Licensing, permits, written-contract rules and sales tax on materials or labor differ by state, province and country. In California, for example, the state licensing board says home improvement work over $500 needs a written contract signed by all parties, and changes must be in writing too (<a href="${SRC.cslb[1]}" rel="noopener nofollow">CSLB</a>). Check your own licensing board or tax office, and use the terms box for the terms that apply to you. ${DISCLAIM}</p>
${srcHtml(["freshbooks", "housecall", "cslb"])}`;
  const sch = [appLd(`${t.h1} (free PDF maker)`, t.path, t.desc), howToLd(`How to make a ${t.noun} ${kind}`, steps)];
  P.push({ path: t.path, title: t.title, desc: t.desc, h1: t.h1, crumb: t.h1, lead: t.lead, quick: t.quick, tool: { trade: t.key, kind: t.kind }, body, faq, schema: sch,
    badges: ["Free, no sign-up", "PDF with your logo", "Tax and deposit worked out", "Nothing uploaded"] });
}

/* ------------------------------------------------------------------ guides */
const gen = TRADES[0];
const genEx = exampleTable(gen);
P.push({
  path: "/how-to-write-a-contractor-estimate", crumb: "How to write an estimate", noRelated: false,
  title: "How to Write a Contractor Estimate: Steps and Example", desc: "A step-by-step guide to writing a contractor estimate: scope, labor, materials, exclusions, tax, deposit, validity date and signature, with a worked example.",
  h1: "How to write a contractor estimate", lead: "Eight steps from the site visit to the signed approval, with a worked example and a free tool that does the arithmetic.",
  quick: "Walk the job, write the scope, separate labor from materials, say what is not included, add tax, deposit and a valid-until date, then get it signed. Changes after that go in writing.",
  schema: [articleLd("How to write a contractor estimate", "/how-to-write-a-contractor-estimate", "Step-by-step guide to writing a contractor estimate.")],
  note: "Prices in the example are made up.",
  faq: [["How long should an estimate be valid?", "That is your decision. Material prices and your schedule change, so most estimates carry a valid-until date. Quotewell defaults to 30 days and lets you change it or remove it."], ["Do I need a signature on an estimate?", "Not always, but a signature or an approval message gives you a record of what the customer agreed to. Some places require a written, signed contract for larger home improvement work (see the California example below)."], ["What if the job changes after the customer approves?", "Agree the change in writing before doing the extra work, with its price. Some jurisdictions require this: California's licensing board says changes to a home improvement contract must be in writing and signed by all parties."]],
  body: `      <h2>1. Visit the job and measure</h2>
      <p>Price from what you saw and measured, not from a phone description. Write down the sizes, quantities and anything that could change the work: access, old wiring, rot, stairs. Photos help you and the customer remember what was agreed.</p>
      <h2>2. Write the scope of work</h2>
      <p>Describe what you will do, room by room or task by task, in words the customer would use. Sources on estimates all put the scope first because the price only means something against it (<a href="${SRC.freshbooks[1]}" rel="noopener nofollow">FreshBooks</a>, <a href="${SRC.projul[1]}" rel="noopener nofollow">Projul</a>).</p>
      <h2>3. Separate labor, materials and other costs</h2>
      <p>List labor (hours or a flat price), materials (with quantities) and other costs such as permits, disposal or a trip charge as separate lines. Customers can follow it, and you can see where a job lost money afterwards.</p>
      <h2>4. Say what is not included</h2>
      <p>Inclusions and exclusions are one of the most common items in what-to-include lists (<a href="${SRC.letsbuild[1]}" rel="noopener nofollow">Let's Build</a>, <a href="${SRC.housecall[1]}" rel="noopener nofollow">Housecall Pro</a>). \"Painting and drywall repair not included\" costs you one line and saves an argument.</p>
      <h2>5. Add markup, discount, tax and deposit</h2>
      <p>Decide how you cover overhead and profit: a percentage line, or built into your rates. Tax rules differ by place and by what you sell, so apply tax only to the lines your area taxes. If you take a deposit, show the amount and the balance due.</p>
      <h2>6. Set dates and payment terms</h2>
      <p>Put the date, a valid-until date, when you can start and how long it should take, and how and when the balance is due. These are standard parts of an estimate in the sources linked on this page.</p>
      <h2>7. Get it signed</h2>
      <p>Add customer and contractor signature and date lines, or ask for approval in writing. Some places require a written contract for home improvement work above a set amount. In California, the licensing board says that is over $500 in combined labor and materials, and the contract must be signed by all parties (<a href="${SRC.cslb[1]}" rel="noopener nofollow">CSLB</a>). Check your own rules.</p>
      <h2>8. Put changes in writing</h2>
      <p>If the customer adds work or you find something unexpected, agree the extra cost in writing before you do the work. Keep it simple: what changed, the price, the new total, and a date.</p>
      <h2>A worked example (made-up numbers)</h2>
      <p>Here is what steps 3 and 5 look like on a ${C.TRADES.general.label.toLowerCase()} job, with a 10% markup, tax on the materials only and a 30% deposit. Every figure is worked out in cents by the same engine as the tool.</p>
${genEx.html}
      <p>Want to make one like it? <a href="/contractor-estimate-template">Open the contractor estimate template</a>, or pick your trade from <a href="/">the home page</a>.</p>
${srcHtml(["freshbooks", "projul", "letsbuild", "housecall", "cslb"])}`,
});
P.push({
  path: "/estimate-vs-quote-vs-bid", crumb: "Estimate vs quote vs bid", noRelated: false,
  title: "Estimate vs Quote vs Bid: What's the Difference?", desc: "Estimate, quote, bid and proposal explained for small trades: how firm each one is, when to use it, and how to say which one you are sending.",
  h1: "Estimate vs quote vs bid: what is the difference?", lead: "The words overlap, and customers use them loosely. Here is how common sources describe each one, and how to make yours clear.",
  quick: "An estimate is generally described as an approximate price, a quote as a firmer itemized offer, a bid as an offer in competition (often on larger jobs) and a proposal as a fuller document with scope and terms. Say on the page which one you mean.",
  schema: [articleLd("Estimate vs quote vs bid: what is the difference?", "/estimate-vs-quote-vs-bid", "How estimates, quotes, bids and proposals differ.")],
  note: "These are general descriptions, not legal definitions.",
  faq: [["Is a quote legally binding?", "Several sources describe a quote as a fixed-price offer that becomes binding once the customer accepts it, but rules vary by place and by wording. Check your local rules, and write the terms down (what the price covers, how long it holds, how changes are handled)."], ["Which should a handyman send?", "Whichever matches the job. A fixed price for a well-defined repair suits a quote. If the work is open-ended and the final cost may move, call it an estimate and say what could change it."], ["Can I switch between them in Quotewell?", "Yes. Choose <em>Estimate</em>, <em>Quote</em> or <em>Proposal</em> at the top of the tool. The title, number prefix and starting terms follow."]],
  body: `      <h2>How the words are commonly used</h2>
      <p>Trade and accounting sources describe the four documents in broadly the same way, while noting that the terms overlap and that people use them loosely (<a href="${SRC.freshbooks[1]}" rel="noopener nofollow">FreshBooks</a>, <a href="${SRC.projul[1]}" rel="noopener nofollow">Projul</a>, <a href="${SRC.letsbuild[1]}" rel="noopener nofollow">Let's Build</a>).</p>
      <table>
        <thead><tr><th>Document</th><th>Generally described as</th><th>Often used for</th></tr></thead>
        <tbody>
          <tr><td>Estimate</td><td>An approximate price and timeline, which can change as the job is uncovered.</td><td>Early conversations, jobs with unknowns, repairs.</td></tr>
          <tr><td>Quote</td><td>A firmer, itemized price for defined work, usually with a time it is valid for.</td><td>Well-defined jobs where the customer wants a number.</td></tr>
          <tr><td>Bid</td><td>An offer made in competition with others, often on larger jobs or by subcontractors.</td><td>Commercial work, tenders, subcontracting.</td></tr>
          <tr><td>Proposal</td><td>A fuller document that adds scope, schedule, terms and sometimes plans or options.</td><td>Larger or more complex jobs.</td></tr>
        </tbody>
      </table>
      <h2>Why it matters to your customer</h2>
      <p>A customer comparing two documents needs to know whether each price is a rough guide or a firm offer, and whether both cover the same scope. A one-line note at the top does most of the work: <em>"This is an estimate: the final price may change if the work changes"</em> or <em>"This is a quote: the price holds until the valid-until date."</em></p>
      <h2>How to choose</h2>
      <ul>
        <li><strong>Use a quote</strong> when the work is clear and you are happy to hold the price for a set time.</li>
        <li><strong>Use an estimate</strong> when something could change the work, and say what.</li>
        <li><strong>Use a proposal</strong> when the job needs more explanation, options or a schedule.</li>
        <li><strong>Use a bid</strong> when you are competing for a larger job against other companies.</li>
      </ul>
      <h2>Whichever you send, include the basics</h2>
      <p>Scope of work, labor and material costs, dates, inclusions and exclusions, and payment terms appear in the sources above and in <a href="${SRC.housecall[1]}" rel="noopener nofollow">Housecall Pro's template</a>. Our guide to <a href="/how-to-write-a-contractor-estimate">writing a contractor estimate</a> goes through them one by one.</p>
      <h2>Check your local rules</h2>
      <p>What binds you, and what must be in writing, differs by place. ${DISCLAIM}</p>
${srcHtml(["freshbooks", "projul", "letsbuild", "housecall"])}`,
});

/* ----------------------------------------------------------- about/privacy */
P.push({
  path: "/about", crumb: "About",
  title: "About Quotewell: Free Estimate and Quote Maker for Trades",
  desc: "Quotewell is part of Rooh Sites' free tools: small, private web tools that run in your browser. Who makes it, why it's free and how it handles your data.",
  h1: "About Quotewell",
  lead: "A small, free tool for tradespeople: professional estimates, quotes and proposals as PDFs, with the arithmetic done for you.",
  note: "",
  body: `      <p>Quotewell is part of <a href="https://roohsites.com/">Rooh Sites</a>' collection of free single-purpose web tools. It is built for contractors, handymen, electricians, plumbers, painters, cleaners, lawn care businesses and roofers who need to send a clear estimate without learning a bookkeeping package.</p>
      <h2>Why we built it</h2>
      <p>Searching for an estimate template mostly turns up spreadsheets and Word files that you have to edit by hand, or software that asks you to create an account first. Quotewell is a form, a live preview and a PDF button. It works out the totals so the numbers add up, and it does not ask for anything before you start.</p>
      <h2>Is it really free?</h2>
      <p>Yes. There is no account and no paid tier. Each PDF has a small “Made with Quotewell” line in the bottom margin. Rooh Sites builds simple websites for local businesses, and the free tools are how some of them find us. If you would like a website, see <a href="https://roohsites.com/">roohsites.com</a>.</p>
      <h2>How it works</h2>
      <p>Everything runs in your browser. PDFs are built on your device with the open-source <a href="https://github.com/Hopding/pdf-lib" rel="noopener">pdf-lib</a> library, and your details are kept in this browser's local storage. Money is worked out in whole cents in a fixed order: line amounts, discount, markup, tax on the taxable share, total, deposit and balance.</p>
      <p>${DISCLAIM}</p>`,
});
P.push({
  path: "/privacy", crumb: "Privacy & Terms",
  title: "Privacy & Terms: Your Estimates Stay on Your Device",
  desc: "How Quotewell handles your data: business details, customers and estimates are processed and stored on your device and never uploaded. Cookie-free analytics.",
  h1: "Privacy & Terms",
  lead: "Short version: your business details, your customers' details and your estimates never leave your device.",
  noRelated: true, note: "",
  body: `      <h2>Privacy</h2>
      <p>Quotewell runs entirely in your browser. Your business details, logo, customer names and addresses, line items, prices and terms are processed on your device to build the preview, the PDF and the text copy. They are never sent to our servers.</p>
      <p>To save you retyping, the tool remembers your business details, your logo, your last document and any documents you choose to save in this browser's local storage (up to 30 documents). Clearing your browser's site data deletes them. Saved documents do not include your logo; it is added back from your business details.</p>
      <p>We use one privacy-friendly analytics service, Umami, to count page views and a few anonymous events, such as “PDF downloaded” with the document type, the number of pages and the number of lines. It does not use cookies, and it never receives names, addresses, prices or any text you type.</p>
      <h2>Terms</h2>
      <p>Quotewell is provided “as is”, without warranty. Check every line, total and term before you send a document. The starting terms are plain examples for you to edit. ${DISCLAIM} Quotewell is free for personal and commercial use.</p>
      <p>Questions? See the <a href="/about">About page</a>.</p>`,
});

/* ----------------------------------------------------------------- write */
let count = 0;
const wc = html => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").split(/\s+/).filter(Boolean).length;
for (const p of [home, ...P]) {
  const file = p.path === "/" ? "index.html" : p.path.slice(1) + ".html";
  const schema = [...(p.schema || [])];
  let html = page({ ...p, schema });
  // Keep the network links that tools/network.mjs filled in, so regenerating never wipes them.
  const NET = /<!--NETWORK:START-->[\s\S]*?<!--NETWORK:END-->/;
  const prev = existsSync(join(OUT, file)) ? (readFileSync(join(OUT, file), "utf8").match(NET) || [])[0] : null;
  if (prev) html = html.replace(NET, () => prev);
  writeFileSync(join(OUT, file), html);
  const main = (html.match(/<main[\s\S]*<\/main>/) || [""])[0];
  const words = wc(main);
  const min = p.path === "/" ? 900 : /^\/(about|privacy)$/.test(p.path) ? 120 : 500;
  if (p.title.length < 45 || p.title.length > 62) console.warn(`title ${p.title.length}: ${p.title}`);
  if (p.desc.length < 120 || p.desc.length > 158) console.warn(`desc ${p.desc.length}: ${p.path}`);
  if (words < min) console.warn(`words ${words} < ${min}: ${p.path}`);
  count++;
  console.log(`${p.path.padEnd(44)} title ${p.title.length} desc ${p.desc.length} words ${words}`);
}

const pages = [home, ...P];
const llms = `# ${NAME}

> ${NAME} is a free online estimate, quote and proposal maker for contractors, handymen, electricians, plumbers, painters, cleaners, lawn care businesses and roofers. It works with no signup and runs entirely in the browser (nothing is uploaded). It adds up labor and materials, applies markup, discount, tax and a deposit, and downloads a PDF in US Letter or A4.

## Tool
- [Free estimate maker](${URL}/): make an estimate, quote or proposal and download a PDF.

## Templates by trade
${TRADES.map(t => `- [${t.h1}](${URL}${t.path}): ${strip(t.quick)}`).join("\n")}

## Guides
- [How to write a contractor estimate](${URL}/how-to-write-a-contractor-estimate): eight steps from site visit to signed approval, with a worked example.
- [Estimate vs quote vs bid](${URL}/estimate-vs-quote-vs-bid): how the terms are commonly used and how to say which one you mean.

## Key facts
- Price: completely free. No paid tier. No login.
- Privacy: business details, customers and documents stay in the browser. Nothing is uploaded.
- Maths: worked out in whole cents in this order: line amounts, subtotal, discount, markup on what is left, tax on the taxable share, total, deposit, balance.
- Starting lines and terms exist for eight trades; they contain no prices and no tax rules.
- Not legal, tax or accounting advice. Rules for estimates, contracts, permits and sales tax differ by place.

## Optional
- [About](${URL}/about)
- [Privacy & Terms](${URL}/privacy)
`;
writeFileSync(join(OUT, "llms.txt"), llms);
console.log(`wrote ${count} pages and llms.txt`);
