// Generates every TicketRun page (home, landing pages, about, privacy) from one layout.
// Usage: node src/ticketrun/pages.mjs   (writes into sites/ticketrun/)
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/ticketrun");
const C = createRequire(import.meta.url)(join(OUT, "core.js"));
const URL = "https://raffle.roohsites.com";
const NAME = "TicketRun";
const ACCENT = "#be123c";
const DATE = "2026-10-08", DATE_H = "8 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const n = v => Number(v).toLocaleString("en-US");

// Ticket sizes straight from the layout engine, so the copy always matches the PDF.
const size = (paper, per) => {
  const g = C.sheetGeometry(paper, per);
  const inch = v => (v / 72).toFixed(2).replace(/0$/, "");
  return { in: `${inch(g.cellW)} × ${inch(g.cellH)} in`, mm: `${Math.round(g.cellW / 72 * 25.4)} × ${Math.round(g.cellH / 72 * 25.4)} mm` };
};
const S = { l8: size("letter", 8), l10: size("letter", 10), l20: size("letter", 20), a8: size("a4", 8), a10: size("a4", 10), a20: size("a4", 20) };

const FOOT = `  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">Raffle ticket generator</a></li><li><a href="/numbered-raffle-ticket-generator">Numbered ticket generator</a></li><li><a href="/raffle-winner-picker">Raffle winner picker</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Ticket types</h4><ul><li><a href="/50-50-raffle-tickets">50/50 raffle tickets</a></li><li><a href="/coat-check-tickets">Coat check tickets</a></li><li><a href="/drink-tickets">Drink tickets</a></li><li><a href="/door-prize-tickets">Door prize tickets</a></li><li><a href="/meal-tickets">Meal tickets</a></li><li><a href="/raffle-ticket-template-8-per-page">8 per page template</a></li></ul></div>
      <div><h4>Number ranges</h4><ul><li><a href="/raffle-tickets-1-100">Raffle tickets 1-100</a></li><li><a href="/raffle-tickets-1-250">Raffle tickets 1-250</a></li><li><a href="/raffle-tickets-1-500">Raffle tickets 1-500</a></li><li><a href="/raffle-tickets-1-1000">Raffle tickets 1-1000</a></li><li><a href="/raffle-tickets-1-2000">Raffle tickets 1-2000</a></li><li><a href="/how-to-number-raffle-tickets-in-word">Numbering tickets in Word</a></li></ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. ${NAME} is an independent tool, not affiliated with Microsoft or any ticket or paper supplier.</p>
  </footer>`;

const RELATED = `      <h2>More ticket types and guides</h2>
      <ul class="related">
        <li><a href="/">Raffle tickets with numbers</a></li>
        <li><a href="/numbered-raffle-ticket-generator">Numbered ticket generator</a></li>
        <li><a href="/50-50-raffle-tickets">50/50 raffle tickets</a></li>
        <li><a href="/coat-check-tickets">Coat check tickets</a></li>
        <li><a href="/drink-tickets">Drink tickets</a></li>
        <li><a href="/door-prize-tickets">Door prize tickets</a></li>
        <li><a href="/meal-tickets">Meal tickets</a></li>
        <li><a href="/raffle-ticket-template-8-per-page">8 per page template</a></li>
        <li><a href="/raffle-tickets-1-500">Raffle tickets 1-500</a></li>
        <li><a href="/raffle-tickets-1-1000">Raffle tickets 1-1000</a></li>
        <li><a href="/how-to-number-raffle-tickets-in-word">Number tickets in Word</a></li>
        <li><a href="/raffle-winner-picker">Raffle winner picker</a></li>
      </ul>`;

const LEGAL = `<p class="note"><strong>Check your local raffle rules.</strong> Raffle and 50/50 laws vary by state, province and country: some require a licence or limit raffles to registered charities and nonprofits, and some restrict prices, prizes or online sales. This page is general information, not legal advice.</p>`;

function head({ title, desc, path, graph }) {
  const url = URL + path;
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

const faqLd = faq => ({ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
const appLd = (name, path, desc, features) => ({
  "@type": "WebApplication", name, url: URL + path, description: desc, applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  ...(features ? { featureList: features } : {}),
  publisher: { "@type": "Organization", name: "MiniTools", url: `${URL}/about` },
});
const faqHtml = (faq, h = "Frequently asked questions") => `      <h2 id="faq">${h}</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}`;
const updated = extra => `      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the MiniTools team.${extra ? " " + extra : ""}</p>`;

function toolSection(o) {
  if (o.picker) return `    <section class="tool card" aria-label="Raffle winner picker"><div id="tr-picker"></div></section>\n`;
  const attrs = Object.entries(o).filter(([k, v]) => v !== "" && ["preset", "start", "end", "perPage"].includes(k)).map(([k, v]) => ` data-${k === "perPage" ? "per-page" : k}="${v}"`).join("");
  return `    <section class="tool card" aria-label="Ticket generator"><div id="tr-tool"${attrs}></div></section>\n`;
}

function page({ path, title, desc, h1, lead, badges, tool, body, faq = [], crumb, schema = [], nav, noRelated }) {
  const isHome = path === "/";
  const graph = [];
  if (!isHome) graph.push({ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` },
    { "@type": "ListItem", position: 2, name: crumb || h1, item: URL + path }] });
  graph.push(...schema);
  if (faq.length) graph.push(faqLd(faq));
  const navHtml = nav || (isHome
    ? `<a href="#how">How it works</a><a href="/raffle-winner-picker">Winner picker</a><a href="#faq">FAQ</a>`
    : `<a href="/">Ticket generator</a><a href="/raffle-winner-picker">Winner picker</a><a href="/about">About</a>`);
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
${tool ? toolSection(tool) : ""}    <article class="content narrow">
${body}
${faq.length ? faqHtml(faq) + "\n" : ""}${noRelated ? "" : RELATED + "\n"}${updated(path === "/privacy" || path === "/about" ? "" : "General information, not legal advice.")}
    </article>
  </main>
${FOOT}
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

/* ------------------------------------------------------------------ home */
const homeFaq = [
  ["Is TicketRun really free?", "Yes. Every feature is free: up to 20,000 numbered tickets per PDF, stubs, logos, colours, guest names from a CSV, seller logs and the winner picker. There's no account, no paid plan and no ads in the tool. Each sheet carries a small “Made with TicketRun” line in the bottom margin, outside the tickets."],
  ["Will the stub and the ticket always have the same number?", "Yes. Both halves of each ticket are drawn from the same number in one pass, so a stub can never get out of step with its ticket the way it can when you copy and paste numbers by hand."],
  ["How many tickets can I print at once?", "Up to 20,000 tickets in one PDF, which is 2,000 sheets at 10 per page. For more, make a second batch that starts where the first one ended, for example 20001."],
  ["What paper should I print raffle tickets on?", "Plain paper works for a test. For the real run, light cardstock such as 65 lb cover (about 176 gsm) feels like a proper ticket and tears cleanly along a fold. Check your printer's manual for the heaviest stock it accepts."],
  ["Why don't my tickets line up with the cut marks?", "The print dialog probably scaled the page. Choose Actual size or 100% instead of Fit to page or Shrink oversized pages, and print a test sheet first."],
  ["Can I print tickets starting at a number other than 1?", "Yes. Set any first and last number, for example 501 to 1000 for a second batch. Add a prefix such as A- or a suffix if you run several raffles at once."],
  ["Is my information uploaded?", "No. TicketRun runs in your browser. The PDF is built on your device and never sent to a server, so guest names and phone numbers stay private."],
];
const homeHowTo = {
  "@type": "HowTo", name: "How to print numbered raffle tickets with stubs", totalTime: "PT5M",
  step: [
    { "@type": "HowToStep", name: "Choose the ticket type", text: "Pick Raffle, 50/50, Door prize, Drink, Coat check, Admission or Meal to start from a ready-made layout." },
    { "@type": "HowToStep", name: "Set the numbers", text: "Enter the first and last ticket number, for example 1 and 500, and choose zero padding (001) or a prefix such as A-." },
    { "@type": "HowToStep", name: "Add your event details", text: "Type the event name, prize, draw date, location, price and small print. The preview updates as you type." },
    { "@type": "HowToStep", name: "Choose the layout", text: "Pick US Letter or A4, 8 or 10 tickets per page, and whether numbers run in order or in cut-and-stack order." },
    { "@type": "HowToStep", name: "Download and print", text: "Click Download PDF and print at 100% (Actual size). Cut along the crop marks and tear or fold along the dashed stub line." },
  ],
};
const rangeRows = [100, 250, 500, 1000, 2000].map(N => `<tr><td><a href="/raffle-tickets-1-${N}">1–${n(N)}</a></td><td>${Math.ceil(N / 8)}</td><td>${Math.ceil(N / 10)}</td><td>${String(N).length === 4 ? "0001" : "001"}–${N}</td></tr>`).join("\n          ");
const home = {
  path: "/",
  title: "Printable Raffle Tickets with Numbers — Free PDF | TicketRun",
  desc: "Print numbered raffle tickets with matching stubs. Any range up to 20,000, 8 or 10 per Letter or A4 page, cut marks, free PDF. No signup, nothing uploaded.",
  h1: "Printable Raffle Tickets with Numbers",
  lead: "Type your event details, pick a number range and download a print-ready PDF where every stub matches its ticket. Free, with no signup, and nothing leaves your browser.",
  badges: ["100% free", "Up to 20,000 tickets", "Matching stubs", "Letter &amp; A4"],
  tool: { preset: "" },
  schema: [appLd(NAME, "/", "Free numbered ticket generator. Print raffle, 50/50, door prize, drink, coat check, admission and meal tickets with matching numbered stubs as a PDF.", ["Sequential numbering on ticket and stub", "Up to 20,000 tickets per PDF", "8, 10 or 20 tickets per Letter or A4 page", "Cut-and-stack order", "Crop marks and dashed tear line", "Prefix, suffix and zero padding", "Logo, colours and three designs", "Guest names from CSV", "Seller books and reconciliation sheet", "Fair raffle winner picker", "No signup"]), homeHowTo],
  faq: homeFaq,
  body: `      <p class="tldr"><strong>Quick answer:</strong> To print raffle tickets with numbers, choose a ticket type above, enter the first and last number (for example 1 to 500), add your event name, prize, date and price, then click <em>Download PDF</em>. Each stub gets the same number as its ticket. Print at 100% scale, cut along the crop marks and tear along the dashed line.</p>

      <h2 id="how">How to print numbered raffle tickets in 5 steps</h2>
      <ol class="steps">
        <li><strong>Pick a ticket type.</strong> Raffle, 50/50, door prize, drink, coat check, admission or meal. Each one sets sensible text, stub style and layout that you can change.</li>
        <li><strong>Set the number range.</strong> Enter the first and last number. <em>Digits: Auto</em> pads with zeros so every number is the same width (001 to 500), which makes stubs easier to sort. Add a prefix like <code>A-</code> if you run more than one raffle.</li>
        <li><strong>Write the ticket text.</strong> Event name, prize, draw date, location, price and small print. Long text shrinks to fit, and the tool tells you if anything had to be shortened.</li>
        <li><strong>Choose paper and layout.</strong> US Letter or A4, 8 or 10 tickets per page, and the number order (see below). Crop marks and a dashed tear line are on by default.</li>
        <li><strong>Download, test, print.</strong> Print the <em>Test sheet</em> on plain paper first to check scaling, then print the full PDF at 100% / Actual size.</li>
      </ol>

      <h2>Ticket sizes</h2>
      <p>Every page keeps a margin of at least half an inch on all four edges for the crop marks, sheet info and credit line, so home printers don't clip anything. Tickets share their cut lines, so one cut separates two tickets.</p>
      <table>
        <thead><tr><th>Layout</th><th>US Letter</th><th>A4</th><th>Best for</th></tr></thead>
        <tbody>
          <tr><td>8 per page (2 × 4)</td><td>${S.l8.in}</td><td>${S.a8.mm}</td><td>Raffles with long prize lists, admission tickets with a logo</td></tr>
          <tr><td>10 per page (2 × 5)</td><td>${S.l10.in}</td><td>${S.a10.mm}</td><td>Most raffles and 50/50s, coat check, meal tickets</td></tr>
          <tr><td>20 per page (4 × 5, no stub)</td><td>${S.l20.in}</td><td>${S.a20.mm}</td><td>Drink tickets, small vouchers</td></tr>
        </tbody>
      </table>

      <h2>How many sheets do you need?</h2>
      <table>
        <thead><tr><th>Tickets</th><th>Sheets at 8 per page</th><th>Sheets at 10 per page</th><th>Numbers print as</th></tr></thead>
        <tbody>
          ${rangeRows}
        </tbody>
      </table>
      <p>Add a few spare sheets for misprints. If a sheet jams, reprint just that page from the PDF: the sheet number and number range are printed in the top margin of every page.</p>

      <h2>In order or cut-and-stack?</h2>
      <p><strong>In order</strong> puts 1–10 on sheet 1, 11–20 on sheet 2 and so on. It's simplest for a few hundred tickets that you cut one sheet at a time.</p>
      <p><strong>Cut-and-stack</strong> is for when you cut the whole printed stack at once on a guillotine or stack cutter. TicketRun spreads the numbers so that each pile comes out in sequence: with 500 tickets at 10 per page, the top-left pile is 001–050, the next pile 051–100, and so on. Depending on whether your printer stacks pages face up or face down, a pile may have its lowest or its highest number on top; either way it's in order.</p>

      <h2>What goes on the stub and what goes on the ticket</h2>
      <table>
        <thead><tr><th>Part</th><th>Who keeps it</th><th>What to print</th></tr></thead>
        <tbody>
          <tr><td>Stub</td><td>The organizer. It goes in the drum or box for the draw.</td><td>The number, plus write-in lines for the buyer's name and phone or email so you can reach a winner who has left.</td></tr>
          <tr><td>Ticket</td><td>The buyer, as proof of entry</td><td>The same number, event name, prize, draw date and place, price, and any conditions such as “need not be present to win”.</td></tr>
        </tbody>
      </table>
      <p>For coat check and admission, switch the stub style to <em>Big number</em> so both halves show a large, easy-to-read number.</p>

      <h2>Printing and cutting tips</h2>
      <ul>
        <li>Print at <strong>100% / Actual size</strong>. “Fit to page” shrinks the sheet a little, so cuts drift away from the ticket edges.</li>
        <li>Use light cardstock for the real run; plain paper is fine for the test sheet and for drink tickets.</li>
        <li>A rotary trimmer or guillotine gives straighter cuts than scissors. Line the blade up with the crop marks in the margin.</li>
        <li>To make the stub tear cleanly, fold back and forth along the dashed line a couple of times, or run a perforating blade or a dry ballpoint pen along it with a ruler.</li>
        <li>Pick the <em>Minimal</em> design to save colour ink, or <em>Bold</em> for a solid colour stub that's easy to spot in the drum.</li>
      </ul>

      <h2>Run a fair draw</h2>
      <p>Mix the stubs well and have someone who isn't selling tickets draw them in front of the audience. If you prefer a random number, use the <a href="/raffle-winner-picker">raffle winner picker</a>: enter your printed range, leave out unsold numbers and draw one or more winners with your browser's cryptographic random number generator.</p>
      ${LEGAL}

      <h2>Free features, no account</h2>
      <p>Everything is included at no cost: up to 20,000 tickets per PDF, a logo, accent colours and three designs, guest names from a CSV for named or seated tickets, book numbers with a printable <a href="/numbered-raffle-ticket-generator#books">seller log</a>, saved designs, a ticket image for social posts and the winner picker. Your settings are remembered in this browser only.</p>`,
};

/* ------------------------------------------------------------- landing */
const P = [];

P.push({
  path: "/numbered-raffle-ticket-generator", crumb: "Numbered raffle ticket generator", tool: { preset: "raffle", end: 500 },
  title: "Numbered Raffle Ticket Generator — Free PDF, No Signup",
  desc: "Free numbered raffle ticket generator: the same sequential number on each ticket and stub, prefixes, zero padding and cut-and-stack order. Download a PDF.",
  h1: "Numbered Raffle Ticket Generator",
  lead: "Sequential numbers on every ticket and matching stub, from 1 to 20,000, with prefixes, zero padding and cut-and-stack ordering. Free PDF, no signup.",
  body: `      <p class="tldr"><strong>Quick answer:</strong> A numbered raffle ticket generator prints a unique, sequential number on each ticket and the same number on its stub, so you don't have to type numbers into a template or run a mail merge. Set the first and last number above, choose how the numbers look, and download a PDF ready to print and cut.</p>

      <h2>Number formats you can make</h2>
      <table>
        <thead><tr><th>Setting</th><th>Example</th><th>When to use it</th></tr></thead>
        <tbody>
          <tr><td>Digits: Auto</td><td>001 … 500</td><td>The default. Every number has the same width, which sorts and reads more easily.</td></tr>
          <tr><td>Digits: No zeros</td><td>1 … 500</td><td>Small events where zeros look odd.</td></tr>
          <tr><td>Fixed digits</td><td>00001 … 00500</td><td>When later batches will go past the current number of digits.</td></tr>
          <tr><td>Prefix</td><td>A-001, B-001</td><td>Several raffles or ticket colours at one event, or a year code such as 27-001.</td></tr>
          <tr><td>Suffix</td><td>001-PTA</td><td>Marking which group sold the ticket.</td></tr>
          <tr><td>Label</td><td>No. 001, # 001, Ticket 001</td><td>Change or clear the word printed before the number.</td></tr>
          <tr><td>Start anywhere</td><td>501 … 1000</td><td>Printing a second batch that carries on from the first.</td></tr>
        </tbody>
      </table>

      <h2>Why matching stub numbers matter</h2>
      <p>The stub is your record of who bought each ticket. If a stub and ticket ever disagree, a winner can't prove their win, or two people can claim the same number. Hand-typed templates and copied pages are where that usually goes wrong. TicketRun draws both halves from the same number in a single pass, so they can't drift apart, and a sheet with a jam can be reprinted on its own because every page shows its sheet number and range.</p>

      <h2>Cut-and-stack numbering</h2>
      <p>If you cut the whole print run at once on a stack cutter, ordinary page order leaves you with piles like 1, 11, 21, 31… that have to be sorted by hand. Choose <em>Cut-and-stack</em> and TicketRun lays the numbers out so each pile comes out in sequence. With 1,000 tickets at 10 per page you print 100 sheets; after cutting, the first pile holds 0001–0100, the second 0101–0200, and so on.</p>
      <ol class="steps">
        <li>Choose <em>Number order: Cut-and-stack</em> before downloading.</li>
        <li>Print all sheets and keep them together in the order they came out of the printer.</li>
        <li>Cut the stack along the crop marks. Each pile is a complete run you can band into books.</li>
      </ol>

      <h2 id="books">Seller books and the tracking sheet</h2>
      <p>For raffles sold by volunteers, open <em>Seller books and tracking sheet</em> in the generator. Enter the tickets per book (25 is common) and tick <em>Print the book number on each stub</em>. Then download the seller log: one row per book with its number range, the seller's name and phone, and columns for tickets sold, unsold tickets returned, cash due and cash received. At the end, sold + returned + missing should add up to the tickets printed.</p>

      <h2>Generator, Word template or numbering machine?</h2>
      <table>
        <thead><tr><th>Method</th><th>Numbering</th><th>Effort for 500 tickets</th></tr></thead>
        <tbody>
          <tr><td>TicketRun</td><td>Automatic on ticket and stub, any range</td><td>One PDF; print and cut</td></tr>
          <tr><td>Word template</td><td>Typed by hand, or SEQ fields or mail merge</td><td>Set up fields or a data source, then check every page (<a href="/how-to-number-raffle-tickets-in-word">see how</a>)</td></tr>
          <tr><td>Numbering stamp</td><td>Stamped by hand, two impressions per ticket</td><td>1,000 stamps</td></tr>
          <tr><td>Pre-printed double roll</td><td>Factory numbered, no event details</td><td>Buy and tear; no custom text</td></tr>
        </tbody>
      </table>`,
  faq: [
    ["What's the largest range I can number?", "Up to 20,000 tickets per PDF and numbers up to 99,999,999. For a bigger run, make several PDFs with consecutive ranges, for example 1–20000 and 20001–40000."],
    ["Can I skip numbers or reprint a few tickets?", "Yes. To reprint, set the first and last number to just the tickets you need, for example 137 to 137. Keep the same prefix and digits so the reprint matches."],
    ["Does the number print on the stub and the ticket?", "Yes, by default. You can switch the stub to big-number style for coat check or admission tickets, or turn the stub off for drink tickets."],
    ["How do I number tickets for two different raffles?", "Use a prefix (for example A- and B-) or a different colour for each raffle, so stubs from the two drums can't be mixed up."],
  ],
});

/* range pages */
const RANGE = {
  100: {
    title: "Raffle Tickets 1-100 Printable — Free Numbered PDF",
    desc: "Print raffle tickets 1-100 with matching numbered stubs: 10 sheets at 10 per page, Letter or A4. Edit the text and download a free PDF, no signup needed.",
    lead: "One hundred numbered tickets with stubs on 10 sheets. Ideal for a classroom, club night or small door-prize draw.",
    intro: "A hundred tickets is the right size for a class basket raffle, an office charity draw, a club meeting or a small door prize. It prints on 10 sheets at 10 per page, and you can cut the whole run in a few minutes with a paper trimmer.",
    unique: `      <h2>Is 100 tickets enough?</h2>
      <p>Think about how many people will be there and how many tickets each might buy. If 40 guests buy two or three tickets each, 100 tickets will run out. A good rule is to print more than you expect to sell: unsold tickets cost only paper, and you simply leave their numbers out of the draw. If you're unsure, print 1–250 instead, or print 1–100 now and 101–200 later with the same design.</p>
      <h2>001 or 1?</h2>
      <p>With <em>Digits: Auto</em>, numbers print as 001 to 100, because the last number has three digits. Same-width numbers are easier to read out and sort. Pick <em>No zeros</em> if you'd rather print 1 to 100.</p>`,
    faq: [["How many pages is 1-100?", "10 pages at 10 tickets per page, or 13 pages at 8 per page (the last page has 4 tickets)."], ["Can I print 1-100 on A4?", "Yes. Choose A4 in Paper and layout; each ticket is " + S.a10.mm + " at 10 per page."], ["What if I sell out?", "Print a second batch from 101 upward with the same settings. Use Saved designs to keep the layout for next time."]],
  },
  250: {
    title: "Raffle Tickets 1-250 Printable — Numbered Stubs, Free PDF",
    desc: "Printable raffle tickets numbered 1-250 with matching stubs: 25 Letter or A4 sheets, ten books of 25 for volunteer sellers. Free PDF, no signup.",
    lead: "Two hundred and fifty numbered tickets on 25 sheets, ready to split into ten books of 25 for your volunteers.",
    intro: "250 tickets suits a school or PTA raffle, a youth sports team fundraiser or a church bazaar. It prints on 25 sheets at 10 per page and divides neatly into ten books of 25, so ten volunteers can each take one book.",
    unique: `      <h2>Splitting 250 tickets between sellers</h2>
      <p>Open <em>Seller books and tracking sheet</em>, set 25 tickets per book and tick <em>Print the book number on each stub</em>. Book 1 is 001–025, book 2 is 026–050, and so on up to book 10 (226–250). Download the seller log and write each volunteer's name next to their book when you hand it out. When books come back, count sold and unsold tickets against the cash before the draw.</p>
      <h2>Keeping the stubs safe</h2>
      <p>Ask sellers to return stubs and cash together in an envelope marked with their book number. Put stubs in the drum only after the book has been reconciled, so an unpaid ticket can't win.</p>`,
    faq: [["How many sheets is 1-250?", "25 sheets at 10 per page, or 32 sheets at 8 per page (the last sheet has 2 tickets)."], ["How many books of 25 is 250 tickets?", "Exactly 10 books. Each book's range is printed on the seller log, for example book 4 is 076–100."], ["Should I number from 1 or 001?", "001 is easier to read and sort, and is the default. Choose No zeros in Digits for plain 1 to 250."]],
  },
  500: {
    title: "Raffle Tickets 1-500 Printable — Free PDF with Stubs",
    desc: "Print raffle tickets numbered 1-500 with matching stubs: 50 sheets at 10 per page, Letter or A4, crop marks and cut-and-stack order. Free PDF, no signup.",
    lead: "Five hundred numbered tickets with matching stubs on 50 sheets. The usual size for a school, church or club fundraiser raffle.",
    intro: "500 tickets is the most common size for a school, church or club fundraiser. It prints on 50 sheets at 10 per page, which is a tenth of a standard 500-sheet ream, and fits in one envelope box when cut.",
    unique: `      <h2>Cutting 500 tickets quickly</h2>
      <p>At this size, cutting sheet by sheet gets slow. Choose <em>Number order: Cut-and-stack</em>, print all 50 sheets, keep them in order and cut the whole stack along the crop marks (or in a few smaller stacks, keeping them in order, if your cutter can't take 50 sheets of cardstock). You end up with 10 piles of 50 tickets: 001–050, 051–100 and so on, each already in sequence.</p>
      <h2>Selling 500 tickets with volunteers</h2>
      <p>Twenty books of 25 or fifty books of 10 are both common. Books of 10 suit sellers who sell to family and friends; books of 25 suit people selling at a stall. The seller log prints the range of every book and has columns for sold, returned and cash, so you can see straight away if a book is short.</p>`,
    faq: [["How many sheets do I need for 500 raffle tickets?", "50 sheets at 10 per page, or 63 sheets at 8 per page (the last sheet has 4 tickets). Add a few spares for misprints."], ["Can I print 1-500 in two colours?", "Yes. Download 1–250 in one accent colour and 251–500 in another, or use two prefixes such as R- and B-."], ["How long does the PDF take?", "A few seconds. The PDF is built in your browser and downloads straight away."]],
  },
  1000: {
    title: "Raffle Tickets 1-1000 Printable — Numbered PDF, Free",
    desc: "Printable raffle tickets 1-1000 with matching numbered stubs: 100 sheets, four-digit numbers 0001-1000, cut-and-stack piles of 100, seller log. Free.",
    lead: "A thousand numbered tickets on 100 sheets, with four-digit numbers, cut-and-stack piles of 100 and a seller log for your volunteers.",
    intro: "1,000 tickets is a large community raffle, a big school carnival or a club's main fundraiser of the year. It prints on 100 sheets at 10 per page. Because 1000 has four digits, numbers print as 0001 to 1000 with Digits set to Auto.",
    unique: `      <h2>Plan the print run</h2>
      <ol class="steps">
        <li>Print the <em>Test sheet</em> on plain paper and check the cut marks at 100% scale.</li>
        <li>Choose <em>Cut-and-stack</em> order. After cutting, you get 10 piles of 100: 0001–0100, 0101–0200 and so on.</li>
        <li>If your printer struggles with 100 sheets of cardstock, print in a few smaller page ranges from the same PDF (for example pages 1–25, 26–50, 51–75 and 76–100) and stack them in order.</li>
        <li>Band each pile into books (for example four books of 25) and record them in the seller log.</li>
      </ol>
      <h2>Keep track of 1,000 tickets</h2>
      <p>At this volume the seller log matters. Number the books on the stubs, record who has each book, and reconcile before the draw: tickets sold + unsold returned + missing should equal 1,000. Leave unsold and missing numbers out of the draw. The <a href="/raffle-winner-picker">winner picker</a> lets you paste them as ranges such as 0476–0500.</p>`,
    faq: [["How many pages is 1-1000 raffle tickets?", "100 pages at 10 tickets per page, or 125 pages at 8 per page."], ["Why do the numbers start at 0001?", "With Digits set to Auto, every number gets as many digits as the last number, so 1000 makes them four digits. Choose No zeros to print 1 to 1000."], ["Can I print 1001-2000 later?", "Yes. Set the first number to 1001 and the last to 2000, keep the same digits setting, and the second batch carries on where the first ended."]],
  },
  2000: {
    title: "Raffle Tickets 1-2000 Printable — Free Numbered PDF",
    desc: "Print raffle tickets 1-2000 with matching stubs on 200 sheets: four-digit numbers, cut-and-stack piles of 200, seller books and log. Free PDF, no signup.",
    lead: "Two thousand numbered tickets with stubs on 200 sheets, organised for cutting in stacks and selling in books.",
    intro: "2,000 tickets is a festival, a fair or a regional raffle with many sellers. It prints on 200 sheets at 10 per page. Numbers print as 0001 to 2000, and the stack is easiest to handle in several print batches.",
    unique: `      <h2>Printing 2,000 tickets at home or at a copy shop</h2>
      <p>200 sheets is a lot for a home inkjet. Two options work well:</p>
      <ul>
        <li><strong>Print in batches.</strong> Download one PDF and print it in page ranges (for example 50 pages at a time), letting the ink dry between batches. Keep the batches in order if you use cut-and-stack.</li>
        <li><strong>Use a copy shop.</strong> The PDF is a standard vector file at exact size, so a print shop can print and cut it. Ask them to print at 100% with no scaling and to cut on the crop marks.</li>
      </ul>
      <h2>Is a printed run better than double-roll tickets?</h2>
      <p>Pre-printed double-roll tickets are cheap and come numbered, but they carry no event name, prize, date or price, and the stub has no space for a name and phone number. A printed run from TicketRun carries all of that, matches your branding and can include the book number on each stub. For a quick door prize, roll tickets are fine; for a raffle where you need to contact winners, printed stubs with write-in lines are more practical.</p>`,
    faq: [["How many sheets is 2000 raffle tickets?", "200 sheets at 10 per page or 250 at 8 per page."], ["Can I put all 2,000 in one PDF?", "Yes. One PDF holds up to 20,000 tickets, and 2,000 tickets builds in a few seconds in most browsers."], ["How should I split 2,000 tickets between sellers?", "Books of 25 give 80 books, and books of 50 give 40 books. Set the size in Seller books and download the seller log to record who took each one."]],
  },
};
for (const [N0, R] of Object.entries(RANGE)) {
  const N = +N0;
  const pad = String(N).length;
  const first = "1".padStart(pad, "0");
  const piles = Math.ceil(N / 10);
  const price = [1, 2, 5, 10, 20];
  P.push({
    path: `/raffle-tickets-1-${N}`, crumb: `Raffle tickets 1-${N}`, tool: { preset: "raffle", start: 1, end: N },
    title: R.title, desc: R.desc, h1: `Raffle Tickets 1-${N}, Printable with Stubs`, lead: R.lead,
    body: `      <p class="tldr"><strong>Quick answer:</strong> Raffle tickets 1-${N} print on ${n(Math.ceil(N / 10))} sheets at 10 per page (or ${n(Math.ceil(N / 8))} sheets at 8 per page). The generator above is already set to ${first}–${N}: change the event name, prize, date and price, then click <em>Download PDF</em> and print at 100% scale.</p>
      <p>${R.intro}</p>

      <h2>1-${N} at a glance</h2>
      <table>
        <tbody>
          <tr><th>Tickets</th><td>${n(N)}, numbered ${first} to ${N}</td></tr>
          <tr><th>Sheets at 10 per page</th><td>${n(Math.ceil(N / 10))} (tickets ${S.l10.in} on Letter, ${S.a10.mm} on A4)</td></tr>
          <tr><th>Sheets at 8 per page</th><td>${n(Math.ceil(N / 8))}${N % 8 ? ` (the last sheet has ${N % 8} tickets)` : ""}</td></tr>
          <tr><th>Cut-and-stack piles</th><td>10 piles of ${n(piles)} at 10 per page</td></tr>
          <tr><th>Books of 25</th><td>${n(Math.ceil(N / 25))}</td></tr>
          <tr><th>Books of 10</th><td>${n(Math.ceil(N / 10))}</td></tr>
          <tr><th>Chance per ticket if all are sold</th><td>1 in ${n(N)}</td></tr>
        </tbody>
      </table>

${R.unique}

      <h2>What ${n(N)} tickets can raise</h2>
      <p>If every ticket sells, the gross is simply tickets × price. Take off the cost of prizes and printing to get what you'll keep.</p>
      <table>
        <thead><tr><th>Price per ticket</th>${price.map(p => `<th>$${p}</th>`).join("")}</tr></thead>
        <tbody><tr><td>${n(N)} tickets sold</td>${price.map(p => `<td>$${n(N * p)}</td>`).join("")}</tr>
        <tr><td>Half sold</td>${price.map(p => `<td>$${n(N * p / 2)}</td>`).join("")}</tr></tbody>
      </table>

      <h2>Print and cut</h2>
      <ol class="steps">
        <li>Print the <em>Test sheet</em> on plain paper at 100% / Actual size and check that the crop marks line up.</li>
        <li>Print the full PDF${N >= 500 ? " (in batches if your printer prefers)" : ""} on light cardstock.</li>
        <li>Cut along the crop marks: ${N >= 500 ? "with cut-and-stack order, cut the whole stack at once; " : ""}one cut down the middle and four across at 10 per page.</li>
        <li>Fold along the dashed line so the stub tears off cleanly when you sell each ticket.</li>
      </ol>
      ${LEGAL}`,
    faq: R.faq,
  });
}

P.push({
  path: "/how-to-number-raffle-tickets-in-word", crumb: "Number raffle tickets in Word", tool: { preset: "raffle", end: 200, perPage: 8 },
  title: "How to Number Raffle Tickets in Word: 3 Methods That Work",
  desc: "Number raffle tickets in Microsoft Word with SEQ fields or mail merge, keep the stub and ticket matching, and why most Word templates only hold 8 tickets.",
  h1: "How to Number Raffle Tickets in Word",
  lead: "Two reliable ways to get sequential numbers on tickets and stubs in Word, the mistakes that cause mismatched stubs, and a faster option if you just need the PDF.",
  schema: [{
    "@type": "HowTo", name: "Number raffle tickets in Word with SEQ fields", totalTime: "PT20M",
    step: [
      { "@type": "HowToStep", name: "Insert the ticket number field", text: "Click where the ticket number goes, press Ctrl+F9 to insert field braces and type SEQ ticket \\# \"000\" between them." },
      { "@type": "HowToStep", name: "Repeat the number on the stub", text: "In the stub, insert another field with SEQ ticket \\c \\# \"000\" so it repeats the ticket's number instead of counting on." },
      { "@type": "HowToStep", name: "Copy the ticket", text: "Copy the finished ticket and stub into every ticket position on the page, then copy the page as many times as you need." },
      { "@type": "HowToStep", name: "Update the fields", text: "Press Ctrl+A then F9 to update every field. Check the first and last pages and print a test page." },
    ],
  }],
  body: `      <p class="tldr"><strong>Quick answer:</strong> In Word, put a <code>{ SEQ ticket \\# "000" }</code> field where each ticket number goes and <code>{ SEQ ticket \\c \\# "000" }</code> on the stub to repeat the same number, copy the ticket across the page and the page as often as needed, then press Ctrl+A and F9 to update. Mail merge from an Excel list of numbers also works. To skip both, set your range in the generator above and download a numbered PDF.</p>

      <h2>Why most Word raffle templates show only 8 tickets</h2>
      <p>A Word template is a single page with a fixed grid, usually 8 or 10 tickets, and the numbers on it are typed text. Word doesn't number copies of a page by itself. If you copy the page, you copy the same numbers, so you either retype every number, add fields, or merge from a data source. That's where mismatched stubs come from: a number changed on the ticket but not on the stub, or a page pasted twice.</p>

      <h2>Method 1: SEQ fields (no data file needed)</h2>
      <ol class="steps">
        <li><strong>Set up one ticket.</strong> Lay out the stub and ticket in a table cell or text box, as in your template.</li>
        <li><strong>Add the ticket number.</strong> Click where the number goes, press <kbd>Ctrl</kbd>+<kbd>F9</kbd> to insert field braces (don't type the braces), and type <code>SEQ ticket \\# "000"</code> inside. The <code>\\# "000"</code> part pads numbers to three digits.</li>
        <li><strong>Add the stub number.</strong> In the stub, insert another field: <code>SEQ ticket \\c \\# "000"</code>. The <code>\\c</code> switch repeats the most recent number instead of adding one, so the stub always matches the ticket next to it. Order matters: the ticket's counting field must come before its stub's repeating field in the document. If your stub sits to the left of the ticket, put the counting field in the stub and the repeating <code>\\c</code> field in the ticket instead.</li>
        <li><strong>Start at another number (optional).</strong> For the very first ticket, use <code>SEQ ticket \\r 501 \\# "000"</code> to start at 501.</li>
        <li><strong>Copy and update.</strong> Copy the ticket into each position, then copy the whole page as many times as needed (500 tickets at 8 per page is 63 pages). Press <kbd>Ctrl</kbd>+<kbd>A</kbd>, then <kbd>F9</kbd> to update all fields. Press <kbd>Alt</kbd>+<kbd>F9</kbd> if you see the field code instead of a number.</li>
      </ol>

      <h2>Method 2: Mail merge from a list of numbers</h2>
      <ol class="steps">
        <li>In Excel or Google Sheets, type <em>Number</em> in A1, then 1 and 2 below it and drag the fill handle down to your last number. Save the file.</li>
        <li>In Word, go to <em>Mailings › Start Mail Merge › Labels</em> and choose a label size that matches your ticket, or set a custom size.</li>
        <li><em>Select Recipients › Use an Existing List</em> and pick your spreadsheet.</li>
        <li>In the first label, design the ticket and stub, and use <em>Insert Merge Field › Number</em> in <strong>both</strong> places. For zero padding, press <kbd>Alt</kbd>+<kbd>F9</kbd> and change the field to <code>{ MERGEFIELD Number \\# "000" }</code>.</li>
        <li>Click <em>Update Labels</em> to copy the design to every label, then <em>Finish &amp; Merge › Edit Individual Documents</em>.</li>
      </ol>
      <p>The stub and ticket must sit in the <strong>same</strong> label. Word adds a “Next Record” rule before each label, so if the stub and ticket are in separate labels they get different numbers.</p>

      <h2>Common problems and fixes</h2>
      <table>
        <thead><tr><th>Problem</th><th>Cause</th><th>Fix</th></tr></thead>
        <tbody>
          <tr><td>Every ticket shows 1</td><td>Fields haven't updated</td><td>Select all and press F9</td></tr>
          <tr><td>Stub is one number ahead of the ticket</td><td>The stub uses a plain SEQ field, or comes first in the document</td><td>Use <code>\\c</code> on whichever part comes second</td></tr>
          <tr><td>Numbers jump by two</td><td>Two counting fields per ticket</td><td>Only one field per ticket should count; the other uses <code>\\c</code></td></tr>
          <tr><td>Merge skips numbers</td><td>Stub and ticket in separate labels</td><td>Put both halves in one label</td></tr>
          <tr><td>Tickets don't line up with perforations</td><td>Print scaling or a template meant for different stock</td><td>Print at 100% and test on plain paper first</td></tr>
        </tbody>
      </table>

      <h2>The faster way: generate the numbered PDF</h2>
      <p>If you don't need to edit the design in Word, the generator above does the numbering for you: set the first and last number, type the event details and download the PDF. It's set to 8 per page like most Word templates, and every stub matches its ticket. See the <a href="/raffle-ticket-template-8-per-page">8 per page template</a> for sizes, or the <a href="/numbered-raffle-ticket-generator">numbered ticket generator</a> for prefixes and cut-and-stack order.</p>`,
  faq: [
    ["How do I make Word count up on each ticket?", "Use a SEQ field such as { SEQ ticket } where the number goes. Each SEQ field with the same name counts up by one through the document. Update with Ctrl+A then F9."],
    ["How do I get the same number on the stub?", "Use { SEQ ticket \\c } on whichever part comes second in the document. The \\c switch repeats the previous number instead of counting on."],
    ["How do I add leading zeros in Word?", "Add a numeric picture switch to the field: { SEQ ticket \\# \"000\" } prints 001, 002 and so on. For mail merge use { MERGEFIELD Number \\# \"000\" }."],
    ["Can I number raffle tickets in Google Docs?", "Google Docs has no sequence fields. Use a mail merge add-on, or generate a numbered PDF with TicketRun and print it."],
  ],
});

P.push({
  path: "/50-50-raffle-tickets", crumb: "50/50 raffle tickets", tool: { preset: "fiftyfifty", end: 500 },
  title: "50/50 Raffle Tickets Printable — Free Numbered PDF",
  desc: "Printable 50/50 raffle tickets with numbered stubs for games, galas and fundraisers. Print your price deals on Letter or A4, then pick a winner fairly.",
  h1: "Printable 50/50 Raffle Tickets",
  lead: "Numbered 50/50 tickets with stubs for the drum, your price deals printed on every ticket, and a fair winner picker for halftime.",
  body: `      <p class="tldr"><strong>Quick answer:</strong> In a 50/50 raffle the winner gets half of the money collected and the organizer keeps the other half. Print numbered tickets with stubs (the generator above is set up for a 50/50), sell them during the event, announce the pot, then draw one stub and pay the winner half.</p>

      <h2>How a 50/50 raffle works</h2>
      <ol class="steps">
        <li><strong>Sell tickets.</strong> Write the buyer's name and phone on the stub, put the stub in the drum and give the buyer the ticket.</li>
        <li><strong>Close sales and count.</strong> Stop selling at a set time, count the cash with two people present and announce the total pot.</li>
        <li><strong>Draw.</strong> Draw one stub, or use the <a href="/raffle-winner-picker">winner picker</a> with the sold range.</li>
        <li><strong>Pay out.</strong> The winner receives half the pot and the organizer keeps the rest. Check the winner's ticket number against the stub before paying.</li>
      </ol>

      <h2>Payout examples</h2>
      <table>
        <thead><tr><th>Total collected</th><th>Winner gets (50%)</th><th>Organizer keeps</th></tr></thead>
        <tbody>
          <tr><td>$300</td><td>$150</td><td>$150</td></tr>
          <tr><td>$1,000</td><td>$500</td><td>$500</td></tr>
          <tr><td>$2,450</td><td>$1,225</td><td>$1,225</td></tr>
        </tbody>
      </table>
      <p>Some 50/50s split differently, for example 60/40, or pay several winners from the winner's half. Print the split you use in the small print so buyers know before they pay.</p>

      <h2>Pricing deals that print well</h2>
      <p>Bundles such as <em>$2 each · 3 for $5</em> or <em>$5 for an arm's length</em> sell more tickets than a single price. Put the deal in the <em>Price</em> field and it prints in the bottom corner of every ticket. When someone buys a bundle, tear off several consecutive tickets so their numbers are easy to check later.</p>

      <h2>Tips for game days and galas</h2>
      <ul>
        <li>Give each seller a book of consecutive numbers and note the range in the seller log, so the pot can be reconciled per seller.</li>
        <li>Use a bold colour stub so stubs are easy to spot and don't get mixed with other raffles in the same venue.</li>
        <li>Announce the pot before the draw, and the winning number twice. Post it afterwards on your social channels with the ticket image or the picker result.</li>
        <li>If a winner isn't present, use the name and phone on the stub to contact them, as your rules state.</li>
      </ul>
      ${LEGAL}`,
  faq: [
    ["What does 50/50 mean in a raffle?", "The prize is half of the money collected from ticket sales. The other half goes to the organizer or cause."],
    ["How much should 50/50 tickets cost?", "Low prices with bundles are common, such as $1 each or $2 each and 3 for $5. Choose prices that make change easy for sellers."],
    ["Do 50/50 tickets need stubs?", "Yes. The stub goes in the drum with the buyer's name and phone, and the buyer keeps the matching ticket as proof."],
    ["Are 50/50 raffles legal everywhere?", "No. Many places regulate 50/50 raffles as gaming and require a licence or limit them to charities. Check local rules before you sell."],
  ],
});

P.push({
  path: "/coat-check-tickets", crumb: "Coat check tickets", tool: { preset: "coat", end: 300 },
  title: "Coat Check Tickets Printable — Numbered Two-Part PDF",
  desc: "Printable numbered coat check tickets in two parts: one half for the hanger, one for the guest, each with the same big number. Letter or A4, free PDF.",
  h1: "Printable Coat Check Tickets, Numbered",
  lead: "Two-part tickets with the same big number on both halves: one stays with the coat, one goes with the guest.",
  body: `      <p class="tldr"><strong>Quick answer:</strong> A coat check ticket has two parts with the same number. Attach one part to the coat or its hanger, give the other to the guest, and swap the guest's part for the coat at pickup. The generator above makes numbered two-part tickets with big, easy-to-read numbers on both halves.</p>

      <h2>How to run a coat check with numbered tickets</h2>
      <ol class="steps">
        <li><strong>Number the hangers or rack spaces</strong> in the same order as your tickets, if you can. Then ticket 042 hangs on hanger 42 and pickup is quick.</li>
        <li><strong>Tear the ticket in two.</strong> Hang the item half on the coat with a safety pin, a clip or a loop of string through a punched hole, or slip it over the hanger hook.</li>
        <li><strong>Give the guest the other half.</strong> The guest copy says “show this ticket to collect your item”.</li>
        <li><strong>At pickup</strong>, match the guest's number to the item, collect the guest half and keep both halves together as a record.</li>
      </ol>

      <h2>Layout options</h2>
      <table>
        <thead><tr><th>Setting</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td>Stub style: Big number</td><td>Both halves show a large number, readable at arm's length in a dim cloakroom.</td></tr>
          <tr><td>Stub width: Half</td><td>Splits the ticket into two equal parts.</td></tr>
          <tr><td>10 per page</td><td>Each two-part ticket is ${S.l10.in} on Letter (${S.a10.mm} on A4).</td></tr>
          <tr><td>Prefix</td><td>Use one letter per rack, such as A-001 and B-001, so a ticket points to the right rail.</td></tr>
          <tr><td>Bold design</td><td>A solid colour guest half that's easy to spot and hard to confuse with a raffle ticket.</td></tr>
        </tbody>
      </table>

      <h2>How many coat check tickets do you need?</h2>
      <p>Print at least one ticket per expected guest, plus spares for bags and umbrellas checked separately. Most events also keep a few blank-numbered sheets back in case some get wet or lost. Because tickets are numbered, you'll know exactly which numbers are still out at the end of the night.</p>

      <h2>Coat check tickets vs roll tickets</h2>
      <p>Pre-printed double-roll tickets work for a coat check too, but the numbers are small and the tickets don't carry your venue name or pickup instructions. Printed two-part tickets on cardstock hold up better on a hanger, show the number in large type and can include your logo.</p>`,
  faq: [
    ["What do you write on a coat check ticket?", "The number on both halves, your venue or event name and a short instruction such as “show this ticket to collect your item”. Some venues add their closing time."],
    ["How do you attach a coat check ticket?", "Punch a hole and use a loop of string or a safety pin, or slide the ticket over the hanger hook. Light cardstock lasts better than paper."],
    ["What if a guest loses their ticket?", "Ask them to describe the item and wait until the end of the night, when the remaining items narrow it down. Numbered tickets make it easy to see which numbers are still out."],
    ["Can I print coat check tickets 20 per page?", "Yes, but 20-per-page tickets have no stub. Print two copies of each number, or use 10 per page with the half-and-half stub instead."],
  ],
});

P.push({
  path: "/drink-tickets", crumb: "Drink tickets", tool: { preset: "drink", end: 400 },
  title: "Drink Tickets Printable — Free Numbered PDF, 20 per Page",
  desc: "Printable numbered drink tickets for weddings, galas, parties and bars: 20 per page, your event name and date, no cash value line. Free PDF, Letter or A4.",
  h1: "Printable Drink Tickets, Numbered",
  lead: "Small numbered drink tickets, 20 to a page, with your event name, date and a no-cash-value line.",
  body: `      <p class="tldr"><strong>Quick answer:</strong> Drink tickets are small vouchers guests swap at the bar for a drink. Print them 20 per page with your event name, the valid date and “good for one drink”, and number them so you can count how many were handed out and redeemed. The generator above is set up for drink tickets.</p>

      <h2>When to use drink tickets</h2>
      <ul>
        <li><strong>Hosted bars with a limit:</strong> give each guest two tickets instead of running an open bar.</li>
        <li><strong>Fundraisers:</strong> sell tickets at the door or a table so bar staff never handle cash.</li>
        <li><strong>Staff and volunteer thank-yous:</strong> one or two tickets each, valid on the night.</li>
        <li><strong>Festivals and club nights:</strong> separate tickets for soft drinks and alcoholic drinks, printed in two colours.</li>
      </ul>

      <h2>Why number drink tickets?</h2>
      <p>Numbers make tickets harder to copy and let you reconcile at the end: if you handed out 001–400 and the bar collected 312, you know 88 are still out. Change the prefix or colour for each event night so tickets from a previous event can't be used again.</p>

      <h2>Sizes and layout</h2>
      <table>
        <thead><tr><th>Layout</th><th>Ticket size (Letter)</th><th>Ticket size (A4)</th><th>Stub</th></tr></thead>
        <tbody>
          <tr><td>20 per page</td><td>${S.l20.in}</td><td>${S.a20.mm}</td><td>No</td></tr>
          <tr><td>10 per page</td><td>${S.l10.in}</td><td>${S.a10.mm}</td><td>Optional</td></tr>
        </tbody>
      </table>
      <p>400 drink tickets at 20 per page is 20 sheets. Plain paper is fine because drink tickets are used once; cardstock feels nicer at weddings and galas.</p>

      <h2>What to print on a drink ticket</h2>
      <ul>
        <li>The words <em>Drink ticket</em> and what it's good for (“one drink”, “one soft drink”, “one beer or wine”).</li>
        <li>The event name and the date it's valid.</li>
        <li>A short condition such as “No cash value”. Follow your venue's and local alcohol service rules.</li>
        <li>A different prefix or colour per drink type if prices differ.</li>
      </ul>

      <h2>Running the bar with tickets</h2>
      <ol class="steps">
        <li>Decide what one ticket buys and post it at the bar, for example “1 ticket = beer, wine or soft drink”.</li>
        <li>Hand out or sell tickets at the entrance or a separate table, and note the first and last number given out.</li>
        <li>Bar staff drop each ticket in a box or tear it in half as it's redeemed, so it can't be passed back.</li>
        <li>At closing, count the redeemed tickets. The difference from the number handed out is how many were never used.</li>
      </ol>`,
  faq: [
    ["How many drink tickets per guest?", "It depends on your budget and event length. Many hosts give one or two per guest and sell extras. Decide the number before printing and count the tickets you hand out."],
    ["Can I make drink tickets without a stub?", "Yes. The 20 per page layout has no stub, and you can also turn the stub off at 10 per page."],
    ["How do I stop people reusing old drink tickets?", "Print the date on the ticket, use a new prefix or colour for each event, and collect tickets at the bar."],
    ["Can I add our logo?", "Yes. Open Design, colour and logo, and choose a PNG, JPG or SVG image. It prints on every ticket."],
  ],
});

P.push({
  path: "/door-prize-tickets", crumb: "Door prize tickets", tool: { preset: "door", end: 300 },
  title: "Door Prize Tickets Printable — Numbered with Stubs, Free",
  desc: "Printable numbered door prize tickets with stubs: guests keep one half and drop the stub in the box. Letter or A4 PDF, plus a random number picker. Free.",
  h1: "Printable Door Prize Tickets",
  lead: "Hand every guest a numbered ticket at the door, collect the stubs in a box and draw winners during the event.",
  body: `      <p class="tldr"><strong>Quick answer:</strong> A door prize ticket is a free numbered ticket handed to each guest as they arrive. The guest writes their name on the stub, drops it in a box and keeps the matching half. During the event you draw stubs (or random numbers) and call out the winners. The generator above is ready for door prizes.</p>

      <h2>How to run a door prize draw</h2>
      <ol class="steps">
        <li><strong>Print tickets</strong> for everyone you expect, plus spares. Number them so you know how many people came in.</li>
        <li><strong>At the door</strong>, give each guest one ticket. They write their name on the stub and drop it in the box.</li>
        <li><strong>Draw</strong> at set times or at the end. Pull a stub, or use the <a href="/raffle-winner-picker">random number picker</a> with the range you handed out.</li>
        <li><strong>Call the number</strong> twice and give the winner a short time to claim the prize before drawing again, if your rules say they must be present.</li>
      </ol>

      <h2>Door prize vs raffle</h2>
      <table>
        <thead><tr><th></th><th>Door prize</th><th>Raffle</th></tr></thead>
        <tbody>
          <tr><td>Ticket cost</td><td>Free with entry</td><td>Bought separately</td></tr>
          <tr><td>Tickets per person</td><td>Usually one</td><td>As many as they buy</td></tr>
          <tr><td>Stub details</td><td>Name is often enough</td><td>Name and phone, so absent winners can be reached</td></tr>
          <tr><td>Must be present</td><td>Common</td><td>Often not</td></tr>
        </tbody>
      </table>
      <p>Because a door prize ticket comes with admission, the rules that apply can differ from a paid raffle. If entry is paid, check whether your local rules treat it as a raffle.</p>

      <h2>Ideas that make door prizes run smoothly</h2>
      <ul>
        <li>Use the <em>Stub heading</em> to print “Door prize entry” so the stub's purpose is clear.</li>
        <li>For several prizes, add them in order to the picker's prize list and draw them one by one; each winner is removed from the next draw.</li>
        <li>At a multi-day event, print each day in a different colour or with a day prefix such as SAT- and SUN-.</li>
        <li>Count the tickets left at the end to get an attendance figure.</li>
      </ul>

      <h2>How many door prize tickets to print</h2>
      <p>Print one ticket per expected guest plus about a sheet of spares, and number from 1 so the last ticket handed out tells you how many people came. If guests arrive through more than one entrance, give each door its own range (for example 1–200 at the front and 201–400 at the side) so the stacks never overlap. Ten tickets per page means 300 guests need 30 sheets.</p>`,
  faq: [
    ["What is a door prize ticket?", "A free numbered ticket given to each guest on arrival. One half goes in a box for the draw and the guest keeps the other half."],
    ["Do door prize tickets need a name?", "A name on the stub helps if the winner has to be found, and it stops arguments over lost tickets. A phone number is optional for door prizes."],
    ["How do I pick a door prize winner?", "Draw a stub from a well-mixed box, or enter the range you handed out into the TicketRun winner picker, which draws numbers with an unbiased random generator."],
  ],
});

P.push({
  path: "/meal-tickets", crumb: "Meal tickets", tool: { preset: "meal", end: 300 },
  title: "Meal Tickets Printable — Numbered or Named, Free PDF",
  desc: "Printable numbered meal tickets for pancake breakfasts, spaghetti dinners, conferences and galas. Print names, tables and meal choices from a CSV. Free PDF.",
  h1: "Printable Meal Tickets",
  lead: "Numbered meal tickets for fundraiser dinners and events, or named tickets with table and meal choice from your guest list.",
  body: `      <p class="tldr"><strong>Quick answer:</strong> Print numbered meal tickets with the event name, date, place and price, sell or hand them out, and collect them at the serving table. For seated dinners, paste your guest list into <em>Named tickets from a guest list</em> and each ticket prints the guest's name, table and meal choice.</p>

      <h2>Numbered meal tickets for fundraiser meals</h2>
      <p>Pancake breakfasts, spaghetti dinners, fish fries and barbecues usually sell tickets in advance. Numbered tickets let you count advance sales, plan how much food to buy and see how many tickets were used at the door. The generator above is set to 300 meal tickets, 10 per page, with no stub; turn on a stub if you want a record of who bought each ticket.</p>

      <h2>Named tickets with table and meal choice</h2>
      <ol class="steps">
        <li>Keep your guest list in a spreadsheet with columns such as <em>Name</em>, <em>Table</em> and <em>Meal</em>.</li>
        <li>Save it as CSV, or copy the cells and paste them into <em>Named tickets from a guest list</em>.</li>
        <li>Choose the name column and tick the other columns to print. A ticket then reads, for example, “Jane Doe” and “Table 4 · Meal: Vegetarian”.</li>
        <li>Download the PDF. Tickets are numbered from your first number, one per guest, in list order.</li>
      </ol>
      <p>The guest list is read in your browser and never uploaded. Sort the spreadsheet by table before exporting if you want tickets grouped by table.</p>

      <h2>Meal ticket ideas</h2>
      <table>
        <thead><tr><th>Event</th><th>Useful fields</th></tr></thead>
        <tbody>
          <tr><td>Pancake breakfast</td><td>Date and serving hours, “includes one drink”, price</td></tr>
          <tr><td>Conference or retreat</td><td>Day and meal (Lunch, Tuesday), guest name, dietary note</td></tr>
          <tr><td>Gala dinner</td><td>Guest name, table number, meal choice</td></tr>
          <tr><td>School lunch or camp</td><td>Week, meal type, a prefix per child group</td></tr>
          <tr><td>Volunteer meals</td><td>“Volunteer meal”, the shift date, no cash value</td></tr>
        </tbody>
      </table>

      <h2>Collecting tickets at the serving line</h2>
      <ol class="steps">
        <li>Put one volunteer at the start of the line to collect tickets in a box or on a spike, so each ticket is used once.</li>
        <li>Sell walk-up tickets at a separate table and give those buyers a ticket too. Every meal served then has a ticket, which keeps the count simple.</li>
        <li>After the event, count the collected tickets against the cash and the number of plates served. Missing or duplicate numbers show up straight away.</li>
      </ol>
      <p>For a takeout or drive-through dinner, print the pickup time in the <em>Date and time</em> line and use a prefix for each time slot (for example 5PM- and 6PM-), so the kitchen can see how many meals are due in each slot.</p>`,
  faq: [
    ["How do I print names on meal tickets?", "Paste your guest list (with a header row) into Named tickets from a guest list, choose the name column and any extra columns such as table or meal, then download the PDF."],
    ["Can I print meal tickets for several days?", "Yes. Make one batch per day with a prefix such as MON- or a different colour, or include the day in the ticket text."],
    ["Do meal tickets need numbers?", "Numbers aren't required, but they help you count sales, spot copies and reconcile cash after the event."],
    ["Is my guest list uploaded?", "No. It's read and turned into a PDF entirely in your browser."],
  ],
});

P.push({
  path: "/raffle-ticket-template-8-per-page", crumb: "Raffle ticket template 8 per page", tool: { preset: "raffle", end: 200, perPage: 8 },
  title: "Raffle Ticket Template 8 per Page — Numbered, Free PDF",
  desc: "A raffle ticket template with 8 tickets per Letter or A4 page, stubs and crop marks, already numbered. Edit the text and download a free PDF, no Word needed.",
  h1: "Raffle Ticket Template, 8 per Page",
  lead: "Eight larger tickets per page, each with a numbered stub and ticket, laid out like a classic Word template but numbered for you.",
  body: `      <p class="tldr"><strong>Quick answer:</strong> This template puts 8 raffle tickets on each page in 2 columns and 4 rows. Each ticket is ${S.l8.in} on US Letter (${S.a8.mm} on A4), with a stub on the left and a dashed tear line. Unlike a Word template, every page is numbered automatically: set your range above and download the PDF.</p>

      <h2>8 per page or 10 per page?</h2>
      <table>
        <thead><tr><th></th><th>8 per page</th><th>10 per page</th></tr></thead>
        <tbody>
          <tr><td>Ticket size (Letter)</td><td>${S.l8.in}</td><td>${S.l10.in}</td></tr>
          <tr><td>Ticket size (A4)</td><td>${S.a8.mm}</td><td>${S.a10.mm}</td></tr>
          <tr><td>Sheets for 500 tickets</td><td>63</td><td>50</td></tr>
          <tr><td>Room for text</td><td>More: long prize lists, a logo, bigger write-in lines</td><td>Enough for most raffles</td></tr>
          <tr><td>Cuts per sheet</td><td>1 down the middle, 3 across</td><td>1 down the middle, 4 across</td></tr>
        </tbody>
      </table>
      <p>Choose 8 per page when the ticket carries a lot of text or a logo, or when buyers will write a full name, phone and email on the stub. Choose 10 per page to save paper on large runs.</p>

      <h2>What's on each ticket</h2>
      <ul>
        <li><strong>Stub (left):</strong> the number, an optional heading and write-in lines for name and phone. You can add Email or a custom line such as Address or Seller.</li>
        <li><strong>Ticket (right):</strong> a small label, the event name, the prize line, date and time, location, small print and the price, with the same number in the top corner.</li>
        <li><strong>Sheet margin:</strong> crop marks, the sheet number and range, and a small credit line, all outside the tickets.</li>
      </ul>

      <h2>Using pre-perforated ticket paper</h2>
      <p>This layout is designed for plain paper or cardstock that you cut yourself. It isn't built to match any brand of pre-perforated ticket sheets, whose sizes and margins differ. If you want to use perforated stock, print the test sheet on plain paper, hold it against a perforated sheet up to the light and check that the lines match before printing the run.</p>

      <h2>Turn the template into tickets</h2>
      <ol class="steps">
        <li>Set the first and last number and your text in the generator above.</li>
        <li>Download and print the test sheet at 100% / Actual size.</li>
        <li>Print the full PDF on cardstock, cut along the crop marks and fold the stub line.</li>
      </ol>`,
  faq: [
    ["What size is an 8 per page raffle ticket?", `On US Letter each ticket is ${S.l8.in}; on A4 it's ${S.a8.mm}. The stub takes about a third of the width.`],
    ["Is this the same as the Word raffle template?", "It's a similar 2 × 4 layout, but the numbers are filled in for you and the stub always matches the ticket. You don't need Word to use it."],
    ["Can I print 8 per page on A4?", "Yes. Choose A4 under Paper and layout; the tickets resize to fit the A4 page."],
  ],
});

P.push({
  path: "/raffle-winner-picker", crumb: "Raffle winner picker", tool: { picker: true },
  title: "Random Raffle Number Picker — Fair Winner Draw, Free",
  desc: "Pick raffle winners fairly: enter your ticket range, leave out unsold numbers and draw one or more winners with an unbiased random generator. Free, no signup.",
  h1: "Random Raffle Number Picker",
  lead: "Enter the ticket numbers you printed, leave out the ones you didn't sell and draw winners with an unbiased, cryptographic random number.",
  schema: [appLd("TicketRun raffle winner picker", "/raffle-winner-picker", "Free random raffle number picker using crypto.getRandomValues with rejection sampling. Exclude unsold numbers, draw several winners without repeats and copy or share the result.", ["Unbiased cryptographic random draw", "Exclude unsold or void numbers", "Several winners without repeats", "Prize list", "Copy, share or save the result as an image"])],
  body: `      <p class="tldr"><strong>Quick answer:</strong> Enter the first and last ticket numbers, list any unsold numbers to leave out, and press <em>Draw a winner</em>. Every eligible ticket has exactly the same chance. Draw again for more prizes; earlier winners aren't drawn twice. Copy or save the result to share it.</p>

      <h2>How to pick a raffle winner online</h2>
      <ol class="steps">
        <li><strong>Enter the range you printed,</strong> for example 1 to 500. If you came from the ticket generator, it's filled in already.</li>
        <li><strong>Leave out tickets that weren't sold.</strong> Type numbers and ranges such as <code>51-75, 102, 340-350</code>. The picker shows how many tickets are eligible and each one's chance.</li>
        <li><strong>Choose how many winners</strong> to draw at once, or draw them one at a time for each prize.</li>
        <li><strong>Draw.</strong> Read the number out, check it against the stub and the buyer's ticket, and record it. <em>Copy result</em> gives a text record with the date, time and time zone.</li>
      </ol>

      <h2>How the draw is kept fair</h2>
      <p>The picker uses your browser's built-in cryptographically secure random number generator (<code>crypto.getRandomValues</code>), not the simpler <code>Math.random</code>, whose output isn't designed to be unpredictable.</p>
      <p>It also avoids a subtle problem called <em>modulo bias</em>. A random 32-bit value has 4,294,967,296 possible results. If you just take “value mod 500”, some ticket numbers come up very slightly more often, because 4,294,967,296 isn't a multiple of 500. The picker throws away the few values at the top that would cause that imbalance and draws again (this is called rejection sampling), so every eligible ticket has exactly the same chance. Winners are chosen the moment you press the button; the rolling numbers are only an animation.</p>

      <h2>Drawing stubs or drawing numbers?</h2>
      <table>
        <thead><tr><th></th><th>Drawing stubs from a drum</th><th>Random number picker</th></tr></thead>
        <tbody>
          <tr><td>Visible to the audience</td><td>Yes, very</td><td>Yes, if shown on a screen</td></tr>
          <tr><td>Depends on mixing</td><td>Yes: folded or stuck stubs can be missed</td><td>No</td></tr>
          <tr><td>Unsold tickets</td><td>Leave their stubs out</td><td>List them as exclusions</td></tr>
          <tr><td>Record of the draw</td><td>Write it down</td><td>Copy the result text or save the image</td></tr>
        </tbody>
      </table>
      <p>Whichever you choose, announce the method before the draw, have someone who isn't selling tickets run it, and check the winning number against the stub before handing over a prize.</p>
      ${LEGAL}
      <p>Need tickets first? Make them with the <a href="/">raffle ticket generator</a>; after downloading, the confirmation links straight here with your range filled in.</p>`,
  faq: [
    ["Is this raffle number picker really random?", "Yes. It uses crypto.getRandomValues, your browser's cryptographically secure random number generator, with rejection sampling so no number is favoured."],
    ["Can the same ticket win twice?", "No. Each winner is removed from the pool, so later draws can't repeat a number until you press Start over."],
    ["How do I leave out unsold tickets?", "Type them in Leave out as single numbers or ranges separated by commas, for example 51-75, 102. The eligible count updates straight away."],
    ["Can I prove the result later?", "Copy result gives a text record with the range, exclusions, winners, date, time and time zone. For a public draw, show the picker on a screen and have a witness note the result."],
  ],
});

/* ----------------------------------------------------------- about/privacy */
P.push({
  path: "/about", crumb: "About", noRelated: false,
  title: "About TicketRun — Free Numbered Ticket Generator",
  desc: "TicketRun is part of MiniTools: small, private web tools that run in your browser. Who makes it, why it's free and how it handles your data.",
  h1: "About TicketRun",
  lead: "A small, free tool that does one job well: printable tickets with numbers that always match.",
  body: `      <p>TicketRun is part of <strong>MiniTools</strong>, a set of free single-purpose web tools. It was built for the volunteers who end up running the raffle: PTA parents, church committees, sports club treasurers and event planners who need a few hundred numbered tickets by Friday.</p>
      <h2>Why we built it</h2>
      <p>Getting sequential numbers onto printed tickets is surprisingly awkward. Word templates show one page with typed numbers, mail merge takes setup, and many free generators stop at a few dozen tickets. Mismatched stub numbers cause arguments on draw night. TicketRun numbers every ticket and stub for you, up to 20,000 at a time.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free, with no account and no paid tier. Each printed sheet carries a small “Made with TicketRun” line in the margin, outside the tickets, which is how other organizers find the tool.</p>
      <h2>How it works</h2>
      <p>Everything runs in your browser. Ticket PDFs are built on your device with the open-source <a href="https://github.com/Hopding/pdf-lib" rel="noopener">pdf-lib</a> library, and the winner picker uses your browser's cryptographic random number generator. Nothing you type is uploaded.</p>
      <p>TicketRun is independent and isn't affiliated with Microsoft (the maker of Word) or any ticket or paper supplier. Raffle rules vary by place; our guides are general information, not legal advice.</p>`,
});
P.push({
  path: "/privacy", crumb: "Privacy & Terms",
  title: "Privacy & Terms: Your Tickets Never Leave Your Device",
  desc: "How TicketRun handles your data: tickets, guest lists and logos are processed on your device and never uploaded. Cookie-free analytics and simple terms.",
  h1: "Privacy & Terms",
  lead: "Short version: your tickets, guest lists and logos never leave your device.",
  noRelated: true,
  body: `      <h2>Privacy</h2>
      <p>TicketRun runs entirely in your browser. Ticket text, number ranges, guest lists, seller names and logos are processed on your device to build the preview and the PDF. They are never sent to our servers or to anyone else.</p>
      <p>To save you retyping, the tool remembers your last design, any designs you save and your logo in your browser's local storage on this device. Guest lists are not stored. Clearing your browser's site data deletes everything.</p>
      <p>We use Vercel Web Analytics to count page views and a few anonymous events, such as “PDF downloaded” with a rough size bucket. It's cookie-free, doesn't track you across sites and never receives what you type into the tool.</p>
      <h2>Terms</h2>
      <p>TicketRun is provided “as is”, without warranty. Check your tickets before printing a full run. You're responsible for your event and for following the raffle, gaming and alcohol rules where you hold it. TicketRun is free for personal, nonprofit and commercial use.</p>
      <p>Questions? See the <a href="/about">About page</a>.</p>`,
});

let count = 0;
for (const p of [home, ...P]) {
  const file = p.path === "/" ? "index.html" : p.path.slice(1) + ".html";
  const schema = [...(p.schema || [])];
  if (p.tool && !p.tool.picker && p.path !== "/") schema.push(appLd(p.h1, p.path, p.desc));
  writeFileSync(join(OUT, file), page({ ...p, schema }));
  count++;
}
console.log(`wrote ${count} pages`);
