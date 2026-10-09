// Generates every CollabRate page (home, guides, about, privacy) from one layout.
// Numbers in tables and worked examples come from the same engine the tool runs (calc.js),
// so the copy can never drift from the calculator.
// Usage: node src/collabrate/pages.mjs   (writes into sites/collabrate/)
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "../../sites/collabrate");
const K = createRequire(import.meta.url)(join(OUT, "calc.js"));
const URL = K.SITE;
const DATE = "2026-10-08", DATE_H = "8 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const $ = (n, cur = "USD") => K.money(n, cur);
const pct = p => K.fmtPct(p);

const GUIDES = [
  ["/ugc-usage-rights-calculator", "UGC usage rights calculator"],
  ["/ugc-whitelisting-rates", "UGC whitelisting rates"],
  ["/ugc-exclusivity-fee", "UGC exclusivity fee"],
  ["/how-much-to-charge-for-ugc", "How much to charge for UGC"],
  ["/beginner-ugc-rate-card", "Beginner UGC rate card"],
  ["/ugc-rate-card-template", "UGC rate card template"],
  ["/ugc-brand-quote-template", "UGC quote template for brands"],
];

// ---------- shared content blocks built from the engine ----------
const USAGE_WHY = {
  "30d": "A short ad test. The brand finds out which videos work.",
  "60d": "A short campaign or a seasonal push.",
  "90d": "A full campaign. The most common window to quote.",
  "6m": "Long-running ads on the content that performed best.",
  "12m": "A year of ads, often an evergreen product page or always-on ad.",
  perpetual: "No end date. The brand never has to come back to you.",
};
function methodTable() {
  const r = (a, b, c, d) => `<tr><td data-label="Item">${a}</td><td data-label="Default">${b}</td><td data-label="Range">${c}</td><td data-label="Pays for">${d}</td></tr>`;
  const I = K.ITEMS, A = K.ADDONS, U = K.USAGE;
  const rows = [
    r("UGC video, up to 60 s (your base rate)", "100% of base", "—", esc(I.video.why)),
    r("Long UGC video, over 60 s", `${pct(I.long.factor * 100)} of base`, `${I.long.range[0] * 100}–${pct(I.long.range[1] * 100)}`, esc(I.long.why)),
    r("Extra hook (alternate opening)", `${pct(I.hook.factor * 100)} of base`, `${I.hook.range[0] * 100}–${pct(I.hook.range[1] * 100)}`, esc(I.hook.why)),
    r("Product photo", `${pct(I.photo.factor * 100)} of base`, `${I.photo.range[0] * 100}–${pct(I.photo.range[1] * 100)}`, esc(I.photo.why)),
    r("Organic use on the brand's own channels", "Included", "—", "Posting your video on the brand's own social pages and website, with no ad spend behind it."),
    ...["30d", "60d", "90d", "6m", "12m", "perpetual"].map(id => r(`Paid usage: ${U[id].label.toLowerCase()}`, `+${pct(U[id].pct)} of content fee`, `${U[id].range[0]}–${pct(U[id].range[1])}`, esc(USAGE_WHY[id]))),
    r("Whitelisting / Spark Ads", `+${pct(A.whitelist.pct)} per month`, `${A.whitelist.range[0]}–${pct(A.whitelist.range[1])}`, esc(A.whitelist.why)),
    r("Exclusivity: named competitors", `+${pct(A.competitors.pct)} per month`, `${A.competitors.range[0]}–${pct(A.competitors.range[1])}`, esc(A.competitors.why)),
    r("Exclusivity: whole category", `+${pct(A.category.pct)} per month`, `${A.category.range[0]}–${pct(A.category.range[1])}`, esc(A.category.why)),
    r("Raw footage", `+${pct(A.raw.pct)} of content fee`, `${A.raw.range[0]}–${pct(A.raw.range[1])}`, esc(A.raw.why)),
    r("Extra revision round", `+${pct(A.revision.pct)} per round`, `${A.revision.range[0]}–${pct(A.revision.range[1])}`, esc(A.revision.why)),
    r("Rush delivery", `+${pct(A.rush.pct)} of content fee`, `${A.rush.range[0]}–${pct(A.rush.range[1])}`, esc(A.rush.why)),
  ];
  return `<table class="method"><thead><tr><th>Item</th><th>CollabRate default</th><th>Suggested range</th><th>What it pays for</th></tr></thead><tbody>
      ${rows.join("\n      ")}
      </tbody></table>
      <p class="small muted">Last reviewed <time datetime="${K.REVIEWED}">${DATE_H}</time>. These are negotiating starting points chosen for this calculator, not survey data or an industry standard. Published guides from agencies and creators disagree, sometimes widely, so every percentage in the tool is editable.</p>`;
}
const FORMULA = `<pre class="formula">Content fee  = (quantity × unit price, for each deliverable) − package discount
Add-on       = content fee × uplift %  (× months or rounds where it says "per")
Quote total  = content fee + paid usage + whitelisting + exclusivity
               + raw footage + extra revisions + rush</pre>`;
function breakdown(c, cur = "USD") {
  const rows = c.lines.map(l => `<tr><td>${l.qty} × ${esc(l.label)} at ${$(l.unit, cur)}</td><td>${$(l.amount, cur)}</td></tr>`);
  if (c.discountAmt) rows.push(`<tr><td>Package discount (${pct(c.discountPct)})</td><td>−${$(c.discountAmt, cur)}</td></tr>`);
  if (c.addons.length) rows.push(`<tr><td><strong>Content fee</strong></td><td><strong>${$(c.content, cur)}</strong></td></tr>`);
  c.addons.forEach(a => rows.push(`<tr><td>${esc(a.label)} (${esc(a.detail)})</td><td>${$(a.amount, cur)}</td></tr>`));
  rows.push(`<tr><td><strong>Total</strong></td><td><strong>${$(c.total, cur)}</strong></td></tr>`);
  return `<table><thead><tr><th>Line</th><th>Amount</th></tr></thead><tbody>\n      ${rows.join("\n      ")}\n      </tbody></table>`;
}

// ---------- layout ----------
function page(p) {
  const { slug, title, desc, h1, lead, preset, body, faq = [], crumb, home = false, tool = true, howto, badges } = p;
  const url = home ? `${URL}/` : `${URL}/${slug}`;
  const faqLd = faq.length ? [{ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) }] : [];
  const app = { "@type": "WebApplication", name: home ? "CollabRate" : `CollabRate ${crumb}`, url, description: home ? "Free UGC rate calculator for usage rights, whitelisting and exclusivity, with brand quote PDFs and rate cards." : strip(desc), applicationCategory: "BusinessApplication", operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
  if (home) Object.assign(app, { featureList: ["UGC rate calculator", "Paid usage rights pricing", "Whitelisting and Spark Ads fees", "Exclusivity fees", "Raw footage, revisions and rush fees", "Brand quote PDF", "Rate card PNG and PDF in 3 templates", "Pitch email builder", "Saved deals with CSV export and calendar reminders", "USD, EUR, GBP, INR, AUD and CAD", "No signup"], publisher: { "@type": "Organization", name: "MiniTools", url: `${URL}/about` } });
  const graph = home
    ? [app, ...(howto ? [howto] : []), ...faqLd]
    : [{ "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "CollabRate", item: `${URL}/` }, { "@type": "ListItem", position: 2, name: crumb, item: url }] }, ...faqLd, ...(tool ? [app] : [])];
  const nav = home
    ? `<a href="#how">How it works</a><a href="#methodology">Methodology</a><a href="/ugc-rate-card-template">Rate card</a><a href="#faq">FAQ</a>`
    : `<a href="/">Rate calculator</a><a href="/ugc-rate-card-template">Rate card</a><a href="/ugc-brand-quote-template">Quote</a><a href="/about">About</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#a21caf">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CollabRate">
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
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="top">
    <a class="logo" href="/"><img src="/favicon.svg" alt="" width="28" height="28">CollabRate</a>
    <nav aria-label="Main">${nav}</nav>
  </header>
  <main id="main">
${home ? "" : `    <p class="crumbs"><a href="/">CollabRate</a> › ${esc(crumb)}</p>\n`}    <section class="hero">
      <h1>${esc(h1)}</h1>
      <p class="lead">${lead}</p>
${badges ? `      <ul class="badges">${badges.map(b => `<li>${b}</li>`).join("")}</ul>\n` : ""}    </section>
${tool ? `    <section class="tool card" aria-label="UGC rate calculator"><div id="cr-tool"${preset ? ` data-preset="${preset}"` : ""}><noscript><p class="cr-noscript">The calculator needs JavaScript. The methodology table below lists every percentage it uses, so you can also work the numbers out by hand.</p></noscript></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? `      <h2 id="faq">${home ? "Frequently asked questions" : "FAQ"}</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}\n` : ""}      <h2>More UGC pricing guides</h2>
      <ul class="related">
        ${[["/", "UGC rate calculator"], ...GUIDES].filter(([h]) => h !== (home ? "/" : `/${slug}`)).map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("\n        ")}
      </ul>
      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the MiniTools team. Rates here are negotiating starting points, not financial, legal or tax advice. CollabRate isn't affiliated with any platform or brand named on this site.</p>
    </article>
  </main>
  <footer class="site">
    <div class="cols">
      <div><h4>CollabRate</h4><ul><li><a href="/">UGC rate calculator</a></li><li><a href="/#methodology">Methodology</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Guides</h4><ul>${GUIDES.map(([h, l]) => `<li><a href="${h}">${l.replace(/^UGC /, "").replace(/^./, m => m.toUpperCase())}</a></li>`).join("")}</ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 CollabRate · Free tools that respect your privacy.</p>
  </footer>
</div>
${tool ? `<script src="/calc.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

// ---------- worked examples (computed) ----------
const exHome = K.compute({ base: 150, items: [{ type: "video", qty: 3 }, { type: "hook", qty: 6 }], usage: "90d", raw: true });
const exWl = { base: 150, items: [{ type: "video", qty: 3 }] };
const wlFee = m => K.compute({ ...exWl, wlMonths: m }).addons[0].amount;
const exWlFull = K.compute({ ...exWl, usage: "90d", wlMonths: 3 });
const exEx = { base: 200, items: [{ type: "video", qty: 3 }] };
const exFee = (m, scope) => K.compute({ ...exEx, exMonths: m, exScope: scope }).addons[0].amount;
const sc = [
  ["A beginner's first paid video", K.compute({ level: "beginner", base: K.levelBase("beginner", "USD"), items: [{ type: "video", qty: 1 }] })],
  ["3 videos + 3 hooks, 30-day paid usage", K.compute({ base: 200, items: [{ type: "video", qty: 3 }, { type: "hook", qty: 3 }], usage: "30d" })],
  ["2 videos, 90-day usage, 3 months whitelisting, raw footage", K.compute({ base: 400, items: [{ type: "video", qty: 2 }], usage: "90d", wlMonths: 3, raw: true })],
];
const cardEx = K.cardRows({ base: 150 }, K.cardDefaults());
const emailEx = K.pitchEmail(K.compute({ base: 150, items: [{ type: "video", qty: 3 }, { type: "hook", qty: 3 }], usage: "30d" }), { name: "Mia Lopez", handle: "@mia.makes", email: "mia@example.com" }, { brand: "Glow Co", contact: "Sam Patel", project: "the summer SPF launch", date: DATE, validDays: 14, payment: "50-50", deliveryDays: 7 });
const usageTable = base => `<table><thead><tr><th>Paid usage window</th><th>Default uplift</th><th>Suggested range</th><th>On a ${$(base)} video</th></tr></thead><tbody>
      ${["30d", "60d", "90d", "6m", "12m", "perpetual"].map(id => { const U = K.USAGE[id]; return `<tr><td>${U.label}</td><td>+${pct(U.pct)}</td><td>${U.range[0]}–${pct(U.range[1])}</td><td>+${$(base * U.pct / 100)} (total ${$(base * (1 + U.pct / 100))})</td></tr>`; }).join("\n      ")}
      </tbody></table>`;

const homeFaq = [
  ["How much should I charge for a UGC video?", `Start from a base rate for one edited video up to 60 seconds with organic use only. CollabRate's starting points are ${$(50)}–${$(150)} if you're new, ${$(150)}–${$(300)} once you've done a few brand projects, and ${$(300)}–${$(600)} with proven ad results. Then add usage rights, whitelisting and extras on top as percentages.`],
  ["How much should I charge for UGC usage rights?", `Charge paid usage as a percentage of your content fee that grows with the time the brand can run ads. CollabRate's defaults are +25% for 30 days, +50% for 90 days, +100% for 12 months and +150% for perpetual use, with suggested ranges of 20–30% up to 100–200%.`],
  ["What is whitelisting, and what should I charge for it?", "Whitelisting (Spark Ads on TikTok, partnership ads on Instagram and Facebook) lets the brand run ads through your account, under your name. Charge it per month on top of paid usage. CollabRate's default is 20% of the content fee per month, with a suggested range of 15–30%."],
  ["Should I charge extra for raw footage?", "Yes. Raw clips let the brand cut new ads without paying you to edit them. CollabRate adds 40% of the content fee by default (suggested range 25–60%)."],
  ["Do I need followers to charge for UGC?", "No. Brands pay UGC creators for the content and the right to use it, not for posting to your audience. Price your work on quality, turnaround and rights, and use the beginner preset if you're starting out."],
  ["Where do the percentages come from?", "They're CollabRate's own negotiating starting points, set in the middle of the ranges creators and agencies commonly discuss. They aren't survey data or an industry standard, which is why the tool shows a range and lets you change every percentage."],
  ["Is CollabRate free? Is my data uploaded?", "Everything is free with no signup. The calculator, quotes, rate cards and saved deals all run in your browser, and nothing you type is sent to a server. Exported quotes and cards carry a small \"Made with CollabRate\" credit in the footer."],
];

const pages = [
  {
    home: true, slug: "", crumb: "UGC rate calculator",
    title: "UGC Rate Calculator: Usage Rights, Whitelisting & Quotes",
    desc: "Free UGC rate calculator. Price videos, hooks, paid usage rights, whitelisting and exclusivity, then download a brand quote PDF or rate card. No signup.",
    h1: "UGC Rate Calculator",
    lead: "Work out what to charge for UGC videos, paid usage rights, whitelisting, exclusivity and raw footage, then send a brand-ready quote PDF or rate card. Free, no signup, and nothing leaves your browser.",
    badges: ["100% free", "No signup", "Usage rights &amp; whitelisting", "Quote PDF + rate card"],
    howto: { "@type": "HowTo", name: "How to calculate a UGC rate", totalTime: "PT3M", step: [
      { "@type": "HowToStep", name: "Set your base rate", text: "Enter what you charge for one edited UGC video up to 60 seconds with organic use only, or pick the Beginner, Building or Experienced starting point." },
      { "@type": "HowToStep", name: "Add the deliverables", text: "List the videos, extra hooks, photos or custom items the brief asks for. Unit prices fill in from your base rate and can be overwritten." },
      { "@type": "HowToStep", name: "Add usage rights", text: "Choose the paid usage window, the number of whitelisting or Spark Ads months, and any exclusivity the brand wants." },
      { "@type": "HowToStep", name: "Add extras", text: "Tick raw footage or rush delivery and set any extra revision rounds. Each adds a percentage of the content fee." },
      { "@type": "HowToStep", name: "Send it", text: "Download a brand quote PDF or a rate card PNG or PDF, or copy the pitch email, and save the deal to track usage end dates." } ] },
    body: `      <p class="tldr"><strong>Quick answer:</strong> Price UGC in two parts. First the <em>content fee</em>: your base rate for one edited video (CollabRate suggests ${$(50)}–${$(150)} if you're new and ${$(300)}–${$(600)} once you have proven ad results) times the number of deliverables. Then add a percentage of that fee for anything beyond organic posting: paid usage rights (about 20–30% for 30 days up to 100–200% for perpetual use), whitelisting or Spark Ads (15–30% per month), exclusivity, raw footage and rush delivery. The result is a negotiating starting point, not a fixed price.</p>

      <h2 id="how">How to calculate your UGC rate in 5 steps</h2>
      <ol class="steps">
        <li><strong>Set your base rate:</strong> one edited video up to 60 seconds, organic use, one revision round. Pick a starting point or type your own.</li>
        <li><strong>Add the deliverables.</strong> Videos, extra hooks and photos price themselves from your base rate. Type over any unit price or add a custom item.</li>
        <li><strong>Add the rights:</strong> a paid usage window, months of whitelisting or Spark Ads, and any exclusivity. The typical range shows next to each.</li>
        <li><strong>Add extras:</strong> raw footage, extra revision rounds and rush delivery.</li>
        <li><strong>Send it</strong> as a quote PDF, a rate card or a pitch email, and save the deal for reminders when usage rights end.</li>
      </ol>

      <h2>The formula</h2>
      <p>Every add-on is a percentage of the <em>content fee</em> (deliverables after any package discount), so rights scale with the job. Lines are rounded to whole currency units and the total is their sum, so the quote always adds up.</p>
      ${FORMULA}

      <h2>Worked example</h2>
      <p>A brand asks for 3 videos with 2 extra hooks each, 90 days of paid usage, and the raw footage. With a base rate of ${$(150)}:</p>
      ${breakdown(exHome)}
      <p>The suggested ranges for 90-day usage (40–60%) and raw footage (25–60%) put this job between <strong>${$(exHome.low)}</strong> and <strong>${$(exHome.high)}</strong>. Quote near the top when the brand clearly wants ads, and treat the bottom as your floor.</p>

      <h2 id="methodology">Methodology: the default percentages</h2>
      <p>The defaults the calculator uses, and the ranges it shows while you quote:</p>
      ${methodTable()}

      <h2>Organic use, paid usage and whitelisting: what's the difference?</h2>
      <table><thead><tr><th></th><th>Organic use</th><th>Paid usage</th><th>Whitelisting / Spark Ads</th></tr></thead><tbody>
      <tr><td>Who posts it</td><td>The brand, on its own pages</td><td>The brand, as ads from its own ad account</td><td>The brand, as ads shown under your name and handle</td></tr>
      <tr><td>Ad spend behind it</td><td>No</td><td>Yes</td><td>Yes</td></tr>
      <tr><td>How it's priced here</td><td>Included in your base rate</td><td>One uplift for the whole window</td><td>An uplift for each month of access</td></tr>
      <tr><td>What to agree</td><td>Which channels</td><td>Duration, start date, channels</td><td>Duration, how access is granted and removed, creative approval</td></tr>
      </tbody></table>
      <p>Whitelisted ads are still paid ads, so charge paid usage for the same period too. The calculator warns you when they don't match.</p>

      <h2>Rate card or quote for each brief?</h2>
      <p>Both. A <a href="/ugc-rate-card-template">rate card</a> shows starting prices (or “rates on request”) in your media kit; a <a href="/ugc-brand-quote-template">quote</a> prices one specific brief with its exact rights and terms. CollabRate makes both from the same numbers.</p>

      <h2>What you can make, all free</h2>
      <ul>
        <li><strong>Brand quote PDF</strong>: itemised, with rights in plain words, payment terms, an expiry date and optional usage options.</li>
        <li><strong>Rate card</strong> in three templates, as a 1080 × 1350 PNG or a PDF, with your photo and colour.</li>
        <li><strong>Pitch email</strong> written from your quote.</li>
        <li><strong>Saved deals</strong> with status, CSV export and calendar reminders for when usage, whitelisting and exclusivity end.</li>
        <li><strong>Six currencies</strong>, autosave, and a share link that never includes your photo.</li>
      </ul>
      <p>No account, no paid tier, and your work stays in this browser. Exports carry a small “Made with CollabRate” credit.</p>
`,
    faq: homeFaq,
  },
  {
    slug: "ugc-usage-rights-calculator", preset: "usage", crumb: "UGC usage rights calculator",
    title: "UGC Usage Rights Calculator: Price Paid Usage by Duration",
    desc: "Work out how much to charge for UGC usage rights. Price 30-day, 90-day, 12-month and perpetual paid usage as a clear uplift, then send a quote PDF. Free.",
    h1: "UGC Usage Rights Calculator",
    lead: "Price paid usage as a clear uplift on your content fee, from a 30-day ad test to perpetual rights, and put the exact window and dates in your quote.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Usage rights are the brand's permission to run your content as paid ads. Charge them as a percentage of your content fee that grows with the length of the window. CollabRate's defaults are +${pct(K.USAGE["30d"].pct)} for 30 days, +${pct(K.USAGE["90d"].pct)} for 90 days, +${pct(K.USAGE["12m"].pct)} for 12 months and +${pct(K.USAGE.perpetual.pct)} for perpetual use. Organic posting on the brand's own pages is included in the base rate.</p>

      <h2>Usage rights pricing by duration</h2>
      <p>The calculator above starts with 2 videos and 90 days of paid usage. Change the window and the uplift updates. Here's what each window adds to a single ${$(200)} video at the default percentages:</p>
      ${usageTable(200)}
      <p>The ranges are CollabRate's suggested negotiating band, not market data. Type your own percentage into the tool if you price differently; your percentage then shows on the quote.</p>

      <h2>Organic use vs paid usage</h2>
      <p><strong>Organic use</strong> means the brand posts your video on its own social pages or website without paying to promote it. Most UGC creators include this in the base rate. <strong>Paid usage</strong> means the brand spends money to show your content as an ad, often to far more people and for longer. That's worth more to the brand, and it ties your face and voice to its advertising, which is why it's priced separately.</p>

      <h2>How to price usage rights in 4 steps</h2>
      <ol class="steps">
        <li><strong>Ask what the brand plans to do.</strong> Organic only, a short ad test, or a long campaign? Which platforms?</li>
        <li><strong>Pick the window.</strong> Match it to the campaign rather than defaulting to perpetual. Thirty days suits an ad test, 90 days a full campaign.</li>
        <li><strong>Apply the uplift to the whole content fee.</strong> Hooks and photos run in ads too, so they're included.</li>
        <li><strong>Write the window into the quote.</strong> Add a rights start date and the quote states the exact first and last day, for example “90 days (1 Nov 2026 to 29 Jan 2027)”.</li>
      </ol>

      <h2>What a usage clause should say</h2>
      <ul>
        <li><strong>Where:</strong> the channels and ad platforms covered.</li>
        <li><strong>How long:</strong> the number of days or months, and when the clock starts (delivery date or first ad).</li>
        <li><strong>What happens at the end:</strong> the brand stops running new ads, or renews at an agreed rate.</li>
        <li><strong>Whether the brand can edit:</strong> cutting new versions is usually fine; using your likeness in unrelated ads usually isn't.</li>
      </ul>

      <h2>Renewals and extensions</h2>
      <p>When a brand wants to keep running an ad after the window ends, quote a renewal for the new period at the same uplift. Save each quote to <em>Saved deals</em> with a rights start date and download the calendar file: you'll get a reminder the day before paid usage ends, which is the natural moment to offer an extension.</p>

      <h2>When perpetual usage makes sense</h2>
      <p>Perpetual rights mean the brand never has to come back to you. If you agree to it, charge for it: the default is +${pct(K.USAGE.perpetual.pct)}, with a suggested range of 100–200%. Many creators prefer to offer 12 months with a renewal price instead, and the quote's optional usage options table lets the brand compare both.</p>`,
    faq: [
      ["Does usage start on delivery or when the first ad runs?", "Either can work, so agree it in writing. Starting on delivery is simpler to track. If you use the first ad date, ask the brand to confirm it by email so you have a record."],
      ["Should I charge usage rights on extra hooks and photos?", "Yes. Hooks exist to be tested in ads, so they're part of the paid usage. The calculator applies the uplift to the whole content fee."],
      ["Is organic use free?", "Organic posting on the brand's own channels is included in your base rate in CollabRate's method. Some creators also charge for it; if you do, raise your base rate."],
      ["What if the brand keeps running ads after usage ends?", "Point to the end date in your quote, ask them to pause the ad or renew, and send a renewal quote for the new window."],
    ],
  },
  {
    slug: "ugc-whitelisting-rates", preset: "whitelisting", crumb: "UGC whitelisting rates",
    title: "UGC Whitelisting Rates & Spark Ads Fee Calculator",
    desc: "Calculate a UGC whitelisting fee per month for Spark Ads and partnership ads, on top of paid usage. See the formula and ranges, then send a quote PDF. Free.",
    h1: "UGC Whitelisting Rates & Fee Calculator",
    lead: "Whitelisting puts the brand's ads under your name. Price it per month, on top of paid usage, and spell out how access is granted and removed.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Charge whitelisting (Spark Ads on TikTok, partnership ads on Instagram and Facebook) as a monthly fee on top of paid usage. CollabRate's default is ${pct(K.ADDONS.whitelist.pct)} of the content fee for each month of access, with a suggested range of ${K.ADDONS.whitelist.range[0]}–${pct(K.ADDONS.whitelist.range[1])}. On a ${$(450)} content fee that's ${$(wlFee(1))} for one month or ${$(wlFee(3))} for three.</p>

      <h2>What whitelisting is</h2>
      <p>With normal paid usage the brand runs your video as an ad from <em>its own</em> account. With whitelisting the ad appears under <em>your</em> name and handle, using your account's identity. Viewers see a post from a creator rather than from a brand, which is why brands ask for it. You grant access through the platform's own tools, such as a Spark Ads authorisation code on TikTok or partnership ad permissions on Instagram and Facebook. Never share your password.</p>

      <h2>Whitelisting fee by number of months</h2>
      <p>For 3 videos at ${$(150)} each (content fee ${$(450)}) at the default ${pct(K.ADDONS.whitelist.pct)} per month:</p>
      <table><thead><tr><th>Whitelisting period</th><th>Fee at ${pct(K.ADDONS.whitelist.pct)} per month</th><th>At the suggested range</th></tr></thead><tbody>
      ${[1, 2, 3, 6, 12].map(m => `<tr><td>${K.plural(m, "month")}</td><td>${$(wlFee(m))}</td><td>${$(450 * K.ADDONS.whitelist.range[0] / 100 * m)}–${$(450 * K.ADDONS.whitelist.range[1] / 100 * m)}</td></tr>`).join("\n      ")}
      </tbody></table>

      <h2>Whitelisting, paid usage and Spark Ads compared</h2>
      <table><thead><tr><th></th><th>Paid usage</th><th>Whitelisting / Spark Ads</th></tr></thead><tbody>
      <tr><td>Whose name is on the ad</td><td>The brand's</td><td>Yours</td></tr>
      <tr><td>Access to your account</td><td>None</td><td>Ad permissions only, through the platform's tools</td></tr>
      <tr><td>How it's priced</td><td>One uplift for the window</td><td>A fee for each month, usually on top of paid usage</td></tr>
      <tr><td>What to watch</td><td>End date</td><td>End date, comments on the ads, removing access</td></tr>
      </tbody></table>

      <h2>A full example</h2>
      <p>The calculator above starts with this brief: 3 videos plus 3 extra hooks, 90 days of paid usage and 3 months of whitelisting. Here is the same job without the hooks, at a ${$(150)} base rate:</p>
      ${breakdown(exWlFull)}

      <h2>What to agree before you grant access</h2>
      <ul>
        <li><strong>Duration.</strong> Match it to the paid usage window. The calculator warns you if whitelisting runs longer than usage.</li>
        <li><strong>Creative approval.</strong> Ask to see ad copy before it runs under your name.</li>
        <li><strong>Comments.</strong> Agree who moderates comments on the ads.</li>
        <li><strong>Removing access.</strong> Put the end date in the quote, set a reminder, and revoke the permission when it passes.</li>
      </ul>
      <p>Add a rights start date to your quote and it lists the exact whitelisting end date. Saved deals turn that date into a calendar reminder the day before. CollabRate isn't affiliated with Meta or TikTok; platform names are used only to describe their ad features.</p>`,
    faq: [
      ["Is whitelisting the same as Spark Ads?", "Spark Ads is TikTok's name for running ads through a creator's post. Partnership ads do the same job on Instagram and Facebook. Creators often call all of these whitelisting."],
      ["Should I charge whitelisting on top of usage rights?", "Usually yes. Whitelisted ads are still paid ads, so most creators charge paid usage for the same period plus a monthly whitelisting fee for the use of their account and name."],
      ["How long should whitelisting last?", "Match the campaign: one to three months is common for testing, longer for always-on ads. Price each month and agree a renewal rate rather than open-ended access."],
      ["Do I have to give the brand my login?", "No. Grant ad permissions through the platform's own tools and never share your password."],
    ],
  },
  {
    slug: "ugc-exclusivity-fee", preset: "exclusivity", crumb: "UGC exclusivity fee",
    title: "UGC Exclusivity Fee: How to Price Not Working With Rivals",
    desc: "How to price a UGC exclusivity clause. Charge per month by scope, from named competitors to a whole category, with a calculator and a quote PDF. Free.",
    h1: "UGC Exclusivity Fee Calculator",
    lead: "Exclusivity means turning down paid work. Price it per month, by how much work it rules out, and keep the clause narrow.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> An exclusivity fee pays you for the work you'll have to turn down. Charge it per month as a percentage of the content fee, and charge more the wider it is. CollabRate's defaults are ${pct(K.ADDONS.competitors.pct)} per month for named competitors (range ${K.ADDONS.competitors.range[0]}–${pct(K.ADDONS.competitors.range[1])}) and ${pct(K.ADDONS.category.pct)} per month for a whole product category (range ${K.ADDONS.category.range[0]}–${pct(K.ADDONS.category.range[1])}).</p>

      <h2>Exclusivity fee by scope and length</h2>
      <p>For 3 videos at ${$(200)} each (content fee ${$(600)}):</p>
      <table><thead><tr><th>Length</th><th>Named competitors (${pct(K.ADDONS.competitors.pct)}/month)</th><th>Whole category (${pct(K.ADDONS.category.pct)}/month)</th></tr></thead><tbody>
      ${[1, 3, 6, 12].map(m => `<tr><td>${K.plural(m, "month")}</td><td>${$(exFee(m, "competitors"))}</td><td>${$(exFee(m, "category"))}</td></tr>`).join("\n      ")}
      </tbody></table>
      <p>Twelve months of category exclusivity more than triples the job. That's deliberate: if skincare is your niche, a year without other skincare brands could cost you most of your work.</p>

      <h2>Named competitors or a whole category?</h2>
      <p><strong>Named competitors</strong> is a short list of brands you won't work with, written into the agreement. It's easy to follow and leaves most of your market open. <strong>Category exclusivity</strong> (“no other haircare brands”) is much wider and harder to interpret: does a shampoo rule out a hair dryer? If a brand asks for it, ask for the list of competitors it actually cares about and offer that instead.</p>

      <h2>How to price an exclusivity request</h2>
      <ol class="steps">
        <li><strong>Get the scope in writing:</strong> the brand names or the exact category, and the regions covered.</li>
        <li><strong>Agree when it starts and ends.</strong> Usually from delivery or first post, for a set number of months.</li>
        <li><strong>Count what it costs you.</strong> If competitors already book you, use the top of the range or more.</li>
        <li><strong>Set it in the calculator:</strong> months, scope, and your percentage. The quote states the dates in plain words.</li>
      </ol>

      <h2>Exclusivity vs usage rights</h2>
      <p>They're separate. Usage rights are what the brand <em>can</em> do with your content. Exclusivity is what <em>you</em> can't do for other brands. A brand can have perpetual usage with no exclusivity, or a month of exclusivity on an organic-only job. Price each one on its own line so the brand can see what it's paying for, and drop either one if the budget is tight.</p>

      <h2>Keep it short and specific</h2>
      <p>Long, vague exclusivity is the clause most likely to cost you money later. Prefer a few months, named brands, and a clear end date. Save the quote to <em>Saved deals</em> with a rights start date to get a calendar reminder on the last day of exclusivity, so you know exactly when you can say yes to competing brands again.</p>`,
    faq: [
      ["Is an exclusivity fee normal for UGC?", "Many UGC jobs have no exclusivity at all. When a brand asks for it, charging a fee is normal because it stops you taking paid work from competitors."],
      ["How long should UGC exclusivity last?", "As short as the brand will accept. One to three months is easier to live with than a year. Price every month so longer periods cost more."],
      ["Does exclusivity stop me posting organic content?", "Only if the agreement says so. Make sure the clause covers paid brand work, not your own unpaid posts, unless you're paid for that too."],
      ["Can I refuse exclusivity?", "Yes. You can offer the job without exclusivity, or with a short named-competitor list instead of a whole category."],
    ],
  },
  {
    slug: "how-much-to-charge-for-ugc", preset: "charge", crumb: "How much to charge for UGC",
    title: "How Much to Charge for UGC Videos: Rates & Formula",
    desc: "How much to charge for UGC videos: starting rates by experience, a transparent formula for usage rights and add-ons, worked examples and a free calculator.",
    h1: "How Much to Charge for UGC Videos",
    lead: "A base rate for the video, plus a clear percentage for every right and extra the brand asks for. Here's the method, with starting points and worked examples.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Charge a base rate for each edited video, then add a percentage of the content fee for paid usage, whitelisting, exclusivity, raw footage and rush delivery. CollabRate's starting points for one video up to 60 seconds are ${$(50)}–${$(150)} for beginners, ${$(150)}–${$(300)} once you've done a few brand projects, and ${$(300)}–${$(600)} with repeat clients and proven ad results.</p>

      <h2>Starting points by experience</h2>
      <p>Base rate for one edited UGC video up to 60 seconds, organic use, one revision round. Amounts outside USD are rough conversions rounded for readability; local markets differ, sometimes a lot, so adjust to what brands in your market pay.</p>
      <table><thead><tr><th>Level</th>${Object.keys(K.CURRENCIES).map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>
      ${Object.entries(K.LEVELS).map(([id, L]) => `<tr><td>${L.label}<br><span class="small muted">${L.hint}</span></td>${Object.keys(K.CURRENCIES).map(c => { const [lo, hi] = K.levelRange(id, c); return `<td>${$(lo, c)}–${$(hi, c)}</td>`; }).join("")}</tr>`).join("\n      ")}
      </tbody></table>

      <h2>What moves your rate up or down</h2>
      <table><thead><tr><th>Factor</th><th>Why it matters</th></tr></thead><tbody>
      <tr><td>Portfolio and results</td><td>Brands pay more when they can see ads you've made that performed.</td></tr>
      <tr><td>Production</td><td>Scripting, multiple scenes, locations, props or other people on camera all take time.</td></tr>
      <tr><td>Rights</td><td>Paid usage, whitelisting and exclusivity are priced on top, never folded into the base rate for free.</td></tr>
      <tr><td>Turnaround</td><td>Rush jobs push other work aside.</td></tr>
      <tr><td>Volume</td><td>A package of several videos can earn a modest discount because briefing and filming are shared.</td></tr>
      </tbody></table>
      <p>Follower count isn't on the list. UGC is content the brand uses on its own channels and in ads, so you're paid for the work and the rights, not for reach.</p>

      <h2>Three example quotes</h2>
      ${sc.map(([t, c]) => `<div class="example"><h3>${t}</h3>${breakdown(c)}</div>`).join("\n      ")}

      <h2>Price per video or packages?</h2>
      <p>Quote per video so the brand can see the unit price, then offer a package with a small discount (for example 10% for 3 videos) if it wants more. In CollabRate the package discount comes off the content fee before usage and extras are added, so a discount also reduces every percentage-based add-on. Keep discounts modest for that reason.</p>

      <h2>When the brand says it's over budget</h2>
      <ul>
        <li><strong>Shorten the usage window</strong> (90 days to 30 days) rather than cutting your base rate.</li>
        <li><strong>Remove extras</strong> such as raw footage or some of the hooks.</li>
        <li><strong>Offer options.</strong> The quote's usage options table shows the same job at different windows so the brand can choose.</li>
        <li><strong>Keep a floor.</strong> The calculator's range shows the low end of the suggested percentages; below that, consider walking away.</li>
      </ul>`,
    faq: [
      ["How much should a beginner charge for UGC?", `CollabRate's beginner starting point is ${$(50)}–${$(150)} per edited video, with ${$(100)} as the default. Charge for usage rights from your first paid job.`],
      ["Should I charge per video or per hour?", "Per video. Brands buy deliverables and rights, and a per-video price is easier for them to approve. Track your hours privately to check the rate is worth it."],
      ["How much should I charge for a UGC hook?", `CollabRate prices an extra hook at ${pct(K.ITEMS.hook.factor * 100)} of your base rate (range ${pct(K.ITEMS.hook.range[0] * 100)}–${pct(K.ITEMS.hook.range[1] * 100)}): a new opening on a video you've already filmed.`],
      ["How often should I raise my UGC rates?", "Review them every few months, and whenever you're fully booked, brands come back for more, or you can show ad results."],
    ],
  },
  {
    slug: "beginner-ugc-rate-card", preset: "beginner", crumb: "Beginner UGC rate card",
    title: "Beginner UGC Rate Card: What to Charge With No Followers",
    desc: "Make a beginner UGC rate card with no followers or portfolio needed. Starting rates, “from” prices, usage rights and a free PNG or PDF rate card download.",
    h1: "Beginner UGC Rate Card (No Followers Needed)",
    lead: "You don't need an audience to charge for UGC. Set a sensible starting rate, show “from” prices, and never give away usage rights for free.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Brands pay UGC creators for content and the right to use it, not for followers. CollabRate's beginner starting point is ${$(50)}–${$(150)} per edited video (default ${$(100)}). Show “from” prices on your card, quote each brief separately, and charge for paid usage, whitelisting and raw footage from day one. The tool above opens with the beginner preset and “from” prices on a rate card.</p>

      <h2>A beginner rate card at a glance</h2>
      <table><thead><tr><th>Item</th><th>At a ${$(100)} base rate</th></tr></thead><tbody>
      ${K.cardRows({ base: 100 }, { ...K.cardDefaults(), mode: "from" }).packages.map(p => `<tr><td>${esc(p.label)}${p.save ? ` (${p.save})` : ""}</td><td>${esc(p.value)}</td></tr>`).join("\n      ")}
      ${K.cardRows({ base: 100 }, { ...K.cardDefaults(), mode: "from" }).addons.map(a => `<tr><td>${esc(a.label)}</td><td>${esc(a.value)}</td></tr>`).join("\n      ")}
      </tbody></table>

      <h2>How to price your first UGC deals</h2>
      <ol class="steps">
        <li><strong>Make three to five sample videos</strong> with products you already own, so brands can see your style.</li>
        <li><strong>Set a base rate you can deliver well at.</strong> Start inside the beginner range and pick a number you'd be happy to do ten times.</li>
        <li><strong>Use “from” prices on your card.</strong> They set expectations while leaving room to quote each brief properly.</li>
        <li><strong>Quote every real brief.</strong> Add the usage window, hooks and extras the brand actually wants, and send a quote PDF.</li>
        <li><strong>Raise your rate as proof arrives:</strong> repeat clients, renewals, or ad results a brand shares with you.</li>
      </ol>

      <h2>Beginner mistakes that cost the most</h2>
      <ul>
        <li><strong>Free perpetual usage.</strong> “Content for ads forever” at your organic rate is the most expensive thing you can give away.</li>
        <li><strong>Free raw footage.</strong> Raw clips let a brand make new ads without you.</li>
        <li><strong>Unlimited revisions.</strong> Include one round and price extra rounds.</li>
        <li><strong>No payment terms.</strong> Ask for a deposit (for example 50% upfront) before you film.</li>
        <li><strong>Gifted product as full payment for paid ads.</strong> A free product can be fair for organic posts you'd make anyway, but not for content that runs as paid ads.</li>
      </ul>

      <h2>Do you need to show prices?</h2>
      <p>No. The rate card has three modes: full prices, “from” prices, and “rates on request”, which lists what you offer without numbers. Beginners often do well with “from” prices: they filter out brands with no budget and still invite a conversation. See the <a href="/ugc-rate-card-template">rate card template</a> page for the three designs.</p>`,
    faq: [
      ["Can I charge for UGC with no followers?", "Yes. UGC is made for the brand to post and advertise, so your follower count doesn't matter. Your samples, reliability and the rights you grant do."],
      ["What should a beginner put on a UGC rate card?", "Your name and contact, two or three packages with “from” prices, the main add-ons (extra hooks, paid usage, whitelisting, raw footage) and what every video includes."],
      ["Should I do free UGC to build a portfolio?", "Making your own sample videos is usually better than working for free for a brand, because you keep full control and nobody runs your work as ads without paying for it."],
      ["How many revisions should a beginner include?", "One round is a common default. Price extra rounds so revision requests stay reasonable."],
    ],
  },
  {
    slug: "ugc-rate-card-template", preset: "ratecard", crumb: "UGC rate card template",
    title: "Free Editable UGC Rate Card Template (PNG & PDF)",
    desc: "Free editable UGC rate card template in three designs. Add packages, add-ons and your photo, show or hide prices, and download a 1080×1350 PNG or PDF.",
    h1: "Free Editable UGC Rate Card Template",
    lead: "Three clean designs that fill themselves in from your rates. Show prices, “from” prices or “rates on request”, then download a PNG or PDF.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Pick a template (Studio, Bold or Soft), enter your base rate and details, choose which packages and add-ons to show, and download a 1080 × 1350 px PNG for your media kit or a one-page PDF. Package prices and add-ons are calculated from your base rate, so the card always matches your quotes. It's free, with no signup and no upload.</p>

      <h2>What goes on a UGC rate card</h2>
      <table><thead><tr><th>Section</th><th>What to include</th></tr></thead><tbody>
      <tr><td>Header</td><td>Your name, handle, niche or content style, and an optional headshot.</td></tr>
      <tr><td>Packages</td><td>Two to four bundles (for example 1, 3 and 5 videos) with a small volume discount.</td></tr>
      <tr><td>Add-ons</td><td>Extra hooks, product photos, paid usage, whitelisting, exclusivity, raw footage, rush delivery.</td></tr>
      <tr><td>Every video includes</td><td>Editing, organic use, revision rounds and your turnaround time.</td></tr>
      <tr><td>Contact</td><td>Email and a link to your portfolio.</td></tr>
      </tbody></table>

      <h2>Package pricing example</h2>
      <p>Packages are your base rate times the number of videos, minus the package discount. At a ${$(150)} base rate with the default packages:</p>
      <table><thead><tr><th>Package</th><th>Discount</th><th>Price</th></tr></thead><tbody>
      ${cardEx.packages.map((p, i) => `<tr><td>${esc(p.label)}</td><td>${pct(K.cardDefaults().packages[i].disc)}</td><td>${esc(p.value)}</td></tr>`).join("\n      ")}
      </tbody></table>

      <h2>Show prices, “from” prices or rates on request?</h2>
      <table><thead><tr><th>Mode</th><th>Best when</th></tr></thead><tbody>
      <tr><td>Show prices</td><td>Your offer is simple and you want brands to self-qualify quickly.</td></tr>
      <tr><td>“From” prices</td><td>You quote each brief but want to set expectations. A good default for most creators.</td></tr>
      <tr><td>Rates on request</td><td>Briefs vary a lot, or you work with bigger brands. The card lists what you offer without numbers.</td></tr>
      </tbody></table>
      <p>Add-ons can show as a percentage of the fee (“+25%”) or as a price per video (“+${$(Math.round(150 * K.USAGE["30d"].pct / 100))} per video”). Percentages are clearer when brands order several videos.</p>

      <h2>The three templates</h2>
      <ul>
        <li><strong>Studio:</strong> white, minimal, with a coloured rule. Prints well and looks good in any media kit.</li>
        <li><strong>Bold:</strong> a full-colour header and footer in your brand colour, with tinted package rows.</li>
        <li><strong>Soft:</strong> a light tinted background with white panels and a centred header. Works well with a headshot.</li>
      </ul>
      <p>Every template takes your brand colour and photo. The photo is cropped to a circle in your browser and never uploaded. Each card carries a small “Made with CollabRate” credit at the bottom.</p>

      <h2>Tips for a card brands read</h2>
      <ul>
        <li>Keep it to one page. Long add-on lists are better handled in a quote.</li>
        <li>State the currency. The card adds “Prices in USD” (or your currency) automatically.</li>
        <li>Review it every few months and update the date in your file name.</li>
        <li>Send a <a href="/ugc-brand-quote-template">brand quote</a> for each real brief, built from the same numbers.</li>
      </ul>
      <p class="small muted">CollabRate isn't affiliated with Canva or any template marketplace. You can place the PNG inside any media kit or design tool.</p>`,
    faq: [
      ["Is this UGC rate card template really free?", "Yes. All three designs, PNG and PDF downloads, your photo and brand colour are free with no signup. A small “Made with CollabRate” credit appears at the bottom of the card."],
      ["What size is the rate card?", "The PNG is 1080 × 1350 pixels, a portrait size that suits Instagram and most media kits. The PDF is a single 8 × 10 inch page."],
      ["Can I edit the rate card later?", "Yes. Your details autosave in this browser, so you can come back, change your rates and download a new version."],
      ["Can I hide my prices?", "Yes. Choose “On request” to list your packages and add-ons without prices, or “From” prices to show starting points."],
    ],
  },
  {
    slug: "ugc-brand-quote-template", preset: "quote", crumb: "UGC quote template for brands",
    title: "UGC Quote Template for Brands: Free PDF Quote Maker",
    desc: "Free UGC quote template for brands. Itemised deliverables, usage rights in plain words, payment terms and usage options, as a PDF plus a ready pitch email.",
    h1: "UGC Quote Template for Brands",
    lead: "Turn a brief into an itemised quote PDF with usage rights in plain words, payment terms and an expiry date, plus a pitch email to send with it.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A UGC quote lists each deliverable with its price, every right and extra as its own line, the total in your currency, the usage terms in plain words, payment terms, delivery time and an expiry date. Fill in the brand and quote details above, then click <em>Download quote PDF</em>. The brand sees only your prices; the negotiation range stays on your screen.</p>

      <h2>What to include in a UGC quote</h2>
      <table><thead><tr><th>Field</th><th>Why it matters</th></tr></thead><tbody>
      <tr><td>Quote number and date</td><td>Lets you and the brand refer to the right version.</td></tr>
      <tr><td>Deliverables</td><td>Quantity, unit price and amount for videos, hooks and photos.</td></tr>
      <tr><td>Rights and extras</td><td>Paid usage, whitelisting, exclusivity, raw footage, revisions and rush, each on its own line.</td></tr>
      <tr><td>Usage terms</td><td>The window in days or months, and exact dates when you know the start date.</td></tr>
      <tr><td>Payment terms</td><td>Deposit, balance and due dates.</td></tr>
      <tr><td>Validity</td><td>An expiry date stops an old price being accepted months later.</td></tr>
      </tbody></table>

      <h2>Quote, rate card or invoice?</h2>
      <table><thead><tr><th>Document</th><th>When you send it</th><th>What it does</th></tr></thead><tbody>
      <tr><td>Rate card</td><td>Before a brief, in your media kit</td><td>Shows starting prices</td></tr>
      <tr><td>Quote</td><td>After a brief, before work starts</td><td>Prices this job and its rights</td></tr>
      <tr><td>Invoice</td><td>After the brand accepts, or on delivery</td><td>Requests payment</td></tr>
      </tbody></table>
      <p>CollabRate makes quotes and rate cards. When the brand accepts, send an invoice from your usual tool.</p>

      <h2>Give the brand options</h2>
      <p>Tick <em>Add a usage options table</em> and the PDF lists the same job at different paid-usage windows (organic only, 30 days, 90 days, perpetual), with your chosen option marked. Brands that can't afford the full package can pick a shorter window instead of asking you to cut your base rate.</p>

      <h2>Payment terms for UGC</h2>
      <ul>
        <li><strong>50% upfront, 50% on delivery:</strong> a common default that protects both sides.</li>
        <li><strong>100% upfront:</strong> reasonable for small jobs and new clients.</li>
        <li><strong>Net 15 or Net 30:</strong> payment within 15 or 30 days of delivery, often required by larger brands and agencies.</li>
      </ul>

      <h2>Sample pitch email</h2>
      <p>The <em>Pitch email</em> tab writes this from your quote. Here's what it produces for 3 videos with 3 hooks and 30 days of paid usage at a ${$(150)} base rate:</p>
      <pre class="formula email-sample">Subject: ${esc(emailEx.subject)}

${esc(emailEx.body)}</pre>

      <h2>Track every quote</h2>
      <p>Each downloaded quote is saved to <em>Saved deals</em> in your browser. Set the status (quoted, accepted, delivered, paid), add due dates, export everything to CSV, or download calendar reminders for payments and for when usage, whitelisting and exclusivity end.</p>`,
    faq: [
      ["Is a UGC quote the same as a contract?", "No. A quote sets out the price and terms you're offering. Once the brand accepts, confirm the terms in a written agreement or at least an email that both sides keep."],
      ["How long should a UGC quote be valid?", "Fourteen days is a sensible default. It keeps prices current and gives the brand a reason to decide."],
      ["Should I show my rate range to the brand?", "No. The PDF shows only your chosen prices. The range in the calculator is for you, to know your floor."],
      ["Can I quote in euros, pounds or rupees?", "Yes. Choose USD, EUR, GBP, INR, AUD or CAD. The PDF uses A4 or US Letter automatically, or you can pick the paper size."],
    ],
  },
  {
    slug: "about", tool: false, crumb: "About",
    title: "About CollabRate: Free, Private UGC Pricing Tools",
    desc: "CollabRate is a free UGC rate calculator from MiniTools. It runs in your browser with no signup. Learn who builds it and how the default rates are set.",
    h1: "About CollabRate",
    lead: "A free, transparent way for UGC creators to price their work and send it to brands.",
    body: `      <p>CollabRate is part of <strong>MiniTools</strong>, a set of small, free web tools that each do one job well. It helps UGC creators work out what to charge for videos, usage rights, whitelisting, exclusivity and extras, and turns the result into a quote PDF, a rate card or a pitch email.</p>
      <h2>Why it exists</h2>
      <p>The usual options for pricing UGC are static rate card templates that do no maths, calculators behind an email sign-up, and published advice that often disagrees. CollabRate shows its formula and every default percentage, lets you change all of them, and gives you a range instead of pretending there's one correct price.</p>
      <h2>How the defaults are set</h2>
      <p>The default percentages and starting rates are our own negotiating starting points, reviewed on ${DATE_H}. They're not survey data and not an industry standard. The full table is on the <a href="/#methodology">methodology section</a> of the calculator.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free, with no account and no paid tier. Exported quotes and cards carry a small “Made with CollabRate” credit, which is how other creators find the tool.</p>`,
  },
  {
    slug: "privacy", tool: false, crumb: "Privacy & Terms",
    title: "Privacy & Terms: How CollabRate Handles Your Data",
    desc: "How CollabRate handles your data: rates, quotes, deals and photos stay in your browser and are never uploaded. Cookie-free analytics and simple terms of use.",
    h1: "Privacy & Terms",
    lead: "Short version: your rates, quotes and photo never leave your device.",
    body: `      <h2>Privacy</h2>
      <p>CollabRate runs entirely in your browser. Your rates, quote details, saved deals, rate card settings and headshot are stored in your browser's local storage on this device and are never sent to our servers. PDFs and PNGs are created on your device. Clearing your browser data deletes everything.</p>
      <p>Share links put your numbers and text (never your photo) into the link itself, after the # sign, which browsers don't send to the server. Anyone you give the link to can read what's in it.</p>
      <p>We use Vercel Web Analytics to count page views and a few anonymous events, such as “quote downloaded”. It's cookie-free, doesn't track you across sites, and doesn't collect anything you type into the tool.</p>
      <h2>Terms</h2>
      <p>CollabRate is provided “as is”, without warranty. Default rates and percentages are starting points for negotiation, not financial, legal or tax advice. You're responsible for the prices and terms you send and for any agreements you make with brands. CollabRate is free for personal and commercial use.</p>`,
  },
];

for (const p of pages) writeFileSync(join(OUT, p.home ? "index.html" : `${p.slug}.html`), page(p));
console.log(`wrote ${pages.length} pages`);
