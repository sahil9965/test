// Generates the tools hub (tools.roohsites.com) from sites.json, so new tools appear
// automatically. Usage: node src/hub/pages.mjs   (writes sites/hub/index.html, privacy.html, llms.txt)
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "sites/hub");
const URL = "https://tools.roohsites.com";
const AGENCY = "https://roohsites.com";
const DATE = "2026-10-09", DATE_H = "9 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const tools = JSON.parse(readFileSync(join(ROOT, "sites.json"), "utf8")).filter(s => s.live !== false);

// Who each tool is for, and a one-line description of what it does.
const INFO = {
  invoicekit: { group: "Business & freelancing", who: "freelancers and small businesses", what: "Create a professional invoice with tax, VAT or GST (CGST + SGST split), your logo and saved clients, then download a PDF." },
  labelfit: { group: "Online sellers & shipping", who: "Vinted, eBay, Etsy and USPS shippers", what: "Turn A4 or letter-size shipping label PDFs into crisp 6x4 / 100x150 mm thermal labels, with packing slips split off." },
  preplabel: { group: "Online sellers & shipping", who: "Amazon FBA sellers and prep centers", what: "Print Code 128 FNSKU labels for thermal rolls or Avery-size sheets, plus suffocation warning, sold-as-set and bin labels." },
  ticketrun: { group: "Events & fundraising", who: "PTOs, schools, clubs and nonprofits", what: "Print sequentially numbered raffle, 50/50, drink and coat check tickets with matching stubs, and draw winners fairly." },
  gradledger: { group: "Teachers & education", who: "homeschool parents of high schoolers", what: "Build a homeschool transcript with exact weighted and unweighted GPA, credits by subject, course descriptions and report cards." },
  goaltally: { group: "Teachers & education", who: "BCBAs, RBTs and special education teachers", what: "Make ABA single-case graphs with phase-change lines, aim and trend lines, plus printable data sheets for 11 measurement types." },
  bellbook: { group: "Teachers & education", who: "teachers and school staff on rotating schedules", what: "Generate an A/B or Day 1–N rotation calendar that skips holidays and re-flows after snow days; export PDF, .ics or CSV." },
  roomproof: { group: "Property & home", who: "tenants, landlords, contractors and cleaners", what: "Make a dated, captioned photo report PDF for move-in/move-out inspections, punch lists and before/after jobs." },
  collabrate: { group: "Creators & marketing", who: "UGC creators and micro-influencers", what: "Price UGC videos with transparent uplifts for usage rights, whitelisting and exclusivity, then export a rate card and quote." },
};
const GROUPS = ["Business & freelancing", "Online sellers & shipping", "Events & fundraising", "Teachers & education", "Property & home", "Creators & marketing"];

const FAQ = [
  ["Are these tools really free?", "Yes. Every tool and every feature is free, with no account and no paid tier. Exports carry a small “Made with …” credit."],
  ["Is my data uploaded anywhere?", "No. Every tool runs entirely in your browser. Invoices, labels, photos, student records and schedules stay on your device and are never sent to our servers."],
  ["Do I need to sign up or install anything?", "No. Open a tool in any modern browser on a computer, tablet or phone and start using it. Several tools also work offline after the first visit."],
  ["Who makes these tools?", "Rooh Sites, a web design studio. We build small, fast, privacy-first tools that each do one job well, alongside the websites we design for local businesses."],
];

function head({ title, desc, path, jsonld }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${URL}${path}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#16110e">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Rooh Sites Tools">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${URL}${path}">
<meta property="og:image" content="${URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/base.css">
<link rel="stylesheet" href="/style.css">
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
<script defer src="/_vercel/insights/script.js"></script>
<script type="application/ld+json">
${JSON.stringify(jsonld)}
</script>
</head>`;
}

const header = `<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="top">
    <a class="logo" href="/"><img src="/favicon.svg" alt="" width="28" height="28">Rooh Sites <span class="muted">Tools</span></a>
    <nav aria-label="Main"><a href="/#tools">All tools</a><a href="/#faq">FAQ</a><a href="${AGENCY}/?utm_source=hub&amp;utm_medium=nav&amp;utm_campaign=tools">Rooh Sites</a></nav>
  </header>`;

const footer = `  <footer class="site">
    <div class="cols">
      <div><h4>Rooh Sites Tools</h4><ul><li><a href="/">All tools</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li><li><a href="/llms.txt">llms.txt</a></li></ul></div>
      <div><h4>Tools</h4><ul>${tools.map(t => `<li><a href="${esc(t.url)}/">${esc(t.label)}</a></li>`).join("")}</ul></div>
      <div><h4>Rooh Sites</h4><ul><li><a href="${AGENCY}/?utm_source=hub&amp;utm_medium=footer&amp;utm_campaign=tools">Websites with soul</a></li><li><a href="https://www.instagram.com/roohsites/">Instagram</a></li><li><a href="https://www.facebook.com/roohsites">Facebook</a></li></ul></div>
    </div>
    <p>© 2026 Rooh Sites · Free tools that respect your privacy.</p>
  </footer>
</div>
</body>
</html>
`;

const org = { "@type": "Organization", "@id": `${AGENCY}/#org`, name: "Rooh Sites", url: `${AGENCY}/`, logo: `${URL}/favicon.svg`, sameAs: ["https://www.instagram.com/roohsites/", "https://www.facebook.com/roohsites"] };

// Home
const cards = GROUPS.map(g => {
  const list = tools.filter(t => INFO[t.slug]?.group === g);
  if (!list.length) return "";
  return `      <h3 class="group">${esc(g)}</h3>
      <div class="tools">
${list.map(t => `        <a class="tcard" href="${esc(t.url)}/" style="--c:${t.accent}">
          <span class="glyph" aria-hidden="true">${t.glyph}</span>
          <span class="tname">${esc(t.name)}</span>
          <span class="tlabel">${esc(t.label)}</span>
          <span class="twhat">${esc(INFO[t.slug].what)}</span>
          <span class="twho">For ${esc(INFO[t.slug].who)}</span>
        </a>`).join("\n")}
      </div>`;
}).join("\n");

const homeLd = { "@context": "https://schema.org", "@graph": [
  org,
  { "@type": "WebSite", "@id": `${URL}/#site`, name: "Rooh Sites Tools", url: `${URL}/`, publisher: { "@id": `${AGENCY}/#org` } },
  { "@type": "CollectionPage", name: "Free online tools by Rooh Sites", url: `${URL}/`, isPartOf: { "@id": `${URL}/#site` },
    mainEntity: { "@type": "ItemList", itemListElement: tools.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${t.url}/`, name: `${t.name}: ${t.label}` })) } },
  ...tools.map(t => ({ "@type": "WebApplication", name: t.name, url: `${t.url}/`, description: INFO[t.slug]?.what, applicationCategory: "UtilitiesApplication", operatingSystem: "Any (web browser)", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, publisher: { "@id": `${AGENCY}/#org` } })),
  { "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
] };

writeFileSync(join(OUT, "index.html"), `${head({
  title: "Free Online Tools — No Signup, Private | Rooh Sites Tools",
  desc: `${tools.length} free, private browser tools by Rooh Sites: invoices, shipping and FNSKU labels, raffle tickets, homeschool transcripts, ABA graphs, school calendars and more.`,
  path: "/", jsonld: homeLd })}
<body>
${header}
  <main id="main">
    <section class="hero">
      <p class="eyebrow">By Rooh Sites</p>
      <h1>Free online tools that do one job well</h1>
      <p class="lead">${tools.length} small, fast tools for sellers, teachers, freelancers, creators and landlords. No signup, no paid tier, and nothing you type is uploaded. Everything runs in your browser.</p>
      <ul class="badges"><li>100% free</li><li>No signup</li><li>Private: runs on your device</li></ul>
    </section>

    <section id="tools" aria-label="All tools">
${cards}
    </section>

    <article class="content narrow">
      <p class="tldr"><strong>Quick answer:</strong> Rooh Sites Tools is a collection of ${tools.length} free web tools. Each one solves a single job (making an invoice, converting a shipping label, printing numbered raffle tickets, building a homeschool transcript and so on), works without an account, and processes everything in your browser so your data stays on your device.</p>

      <h2>Why these tools are different</h2>
      <ul>
        <li><strong>Private by design.</strong> There is no server-side processing. Your files, photos and records never leave your device, which matters for buyers' addresses, student data and client details.</li>
        <li><strong>Free, with no catch.</strong> Every feature is free. There are no accounts, trials or upgrade walls. Exports carry a small credit, which is how other people find the tools.</li>
        <li><strong>Made for one job.</strong> Each tool has presets and guides for its exact use: carrier label sizes, Amazon label formats, ABA graphing conventions, A/B rotation rules and GPA weighting.</li>
        <li><strong>Fast on any device.</strong> No frameworks, no ads in the tools, and several of them work offline after the first visit.</li>
      </ul>

      <h2>How to pick the right tool</h2>
      <p>Start from the job, not the tool: if you sell online and print labels, LabelFit fixes carrier labels and PrepLabel makes Amazon FNSKU labels. Teachers will find GoalTally for ABA data, BellBook for rotation calendars and GradLedger for homeschool transcripts. Each tool's home page has a short guide, presets for common cases and an FAQ, so you can get a correct result on the first try.</p>

      <h2>About Rooh Sites</h2>
      <p>Rooh Sites is a web design studio that builds “websites with soul” for local businesses. These tools are a side project: they show the kind of fast, careful, privacy-first work we put into every site. If you need a website for your business, <a href="${AGENCY}/?utm_source=hub&amp;utm_medium=content&amp;utm_campaign=tools">visit roohsites.com</a>.</p>

      <h2 id="faq">Frequently asked questions</h2>
${FAQ.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n")}
      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Rooh Sites</p>
    </article>
  </main>
${footer}`);

// Privacy
writeFileSync(join(OUT, "privacy.html"), `${head({
  title: "Privacy & Terms | Rooh Sites Tools",
  desc: "How Rooh Sites Tools handle your data: every tool runs in your browser and nothing you enter is uploaded. Cookie-free analytics and simple terms of use.",
  path: "/privacy",
  jsonld: { "@context": "https://schema.org", "@graph": [org, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Tools", item: `${URL}/` }, { "@type": "ListItem", position: 2, name: "Privacy & Terms", item: `${URL}/privacy` }] }] } })}
<body>
${header}
  <main id="main" class="content narrow">
    <h1>Privacy &amp; Terms</h1>
    <p>Every Rooh Sites tool runs entirely in your web browser. What you type, upload or photograph is processed on your device and is never sent to our servers. Some tools save your work in your browser's local storage so you can come back to it. Clearing your browser data deletes it.</p>
    <p>We use Vercel Web Analytics to count page visits. It doesn't use cookies, doesn't track you across websites and never sees what you enter into a tool.</p>
    <h2>Terms</h2>
    <p>The tools are provided free and “as is”, without warranty. You're responsible for checking anything you print, send or rely on, including tax, shipping, school and legal requirements in your country. Each tool's own Privacy &amp; Terms page has any tool-specific notes.</p>
    <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Rooh Sites</p>
  </main>
${footer}`);

// llms.txt
writeFileSync(join(OUT, "llms.txt"), `# Rooh Sites Tools

> Rooh Sites Tools (${URL}) is a collection of ${tools.length} free, private web tools made by Rooh Sites (${AGENCY}), a web design studio. Every tool runs entirely in the browser (nothing is uploaded), needs no signup and has no paid tier.

## Tools
${tools.map(t => `- [${t.name}: ${t.label}](${t.url}/): ${INFO[t.slug]?.what || t.tagline} For ${INFO[t.slug]?.who || "everyone"}.`).join("\n")}

## About
- [Rooh Sites](${AGENCY}/): web design studio building websites for local businesses.
- [Privacy & Terms](${URL}/privacy)
`);
console.log(`hub: ${tools.length} tools`);
