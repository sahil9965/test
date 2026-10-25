// Generates every PunchPerk page (home, landing pages, guide, about, privacy) from one layout.
// Usage: node src/punchperk/pages.mjs   (writes into sites/punchperk/)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/punchperk");
const C = createRequire(import.meta.url)(join(OUT, "core.js"));
const URL = "https://punchcard.roohsites.com";
const NAME = "PunchPerk";
const ACCENT = "#4d7c0f";
const DATE = "2026-10-25", DATE_H = "25 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

// Sheet facts straight from the layout engine, so the copy always matches the PDF.
const inch = v => (v / 72).toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
const mmv = v => Math.round((v / 72) * 25.4);
const GL = C.sheetGeometry("letter-10"), GA = C.sheetGeometry("a4-10"), PL = C.sheetGeometry("letter-plain"), PA = C.sheetGeometry("a4-plain");
const F = {
  card: `${inch(GL.cardW)} × ${inch(GL.cardH)} in`, cardMm: `${mmv(GL.cardW)} × ${mmv(GL.cardH)} mm`, a4: `${mmv(GA.cardW)} × ${mmv(GA.cardH)} mm`,
  lSide: inch(GL.gx), lTop: inch(GL.pageH - (GL.gy + GL.gh)), aSide: Math.round(GA.gx / 72 * 25.4), aTop: Math.round((GA.pageH - (GA.gy + GA.gh)) / 72 * 25.4),
  plain: PL.perPage, gap: "1/8 in (about 3 mm)",
};
if (GL.perPage !== 10 || GA.perPage !== 10 || F.lSide !== "0.75" || F.lTop !== "0.5") throw new Error("sheet facts changed");

const FOOT = `  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">Printable punch card maker</a></li><li><a href="/punch-card-template-10-per-sheet">10 per sheet template</a></li><li><a href="/how-to-run-a-punch-card-loyalty-program">Loyalty program guide</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Templates</h4><ul><li><a href="/coffee-punch-card-template">Coffee punch cards</a></li><li><a href="/salon-loyalty-card-template">Salon &amp; barber loyalty cards</a></li><li><a href="/behavior-punch-card-printable">Behavior punch cards</a></li><li><a href="/reward-punch-card-for-kids">Reward cards for kids</a></li><li><a href="/editable-punch-card-template">Editable punch card template</a></li></ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. ${NAME} is an independent tool, not affiliated with Avery, Canva, Microsoft, Google, Apple or any print shop.</p>
  </footer>`;

const RELATED = `      <h2>More templates and guides</h2>
      <ul class="related">
        <li><a href="/">Printable punch card template</a></li>
        <li><a href="/coffee-punch-card-template">Coffee</a></li>
        <li><a href="/salon-loyalty-card-template">Salon &amp; barber</a></li>
        <li><a href="/behavior-punch-card-printable">Classroom behavior</a></li>
        <li><a href="/reward-punch-card-for-kids">Kids reward cards</a></li>
        <li><a href="/punch-card-template-10-per-sheet">10 per sheet</a></li>
        <li><a href="/editable-punch-card-template">Editable template</a></li>
        <li><a href="/how-to-run-a-punch-card-loyalty-program">Loyalty program guide</a></li>
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
const FEATURES = ["10 business-card-size punch cards per US Letter or A4 sheet", "Plain-paper layout with crop marks", "5 to 12 punches in 1 or 2 rows", "Plain circles or 10 vector icons", "Optional serial numbers and staff initials boxes", "Matching backs with address, hours and a QR code, mirrored for two-sided printing", "Logo upload that stays on your device", "Alignment test PDF and printer offset", "PNG of the card front for sharing"];
const appLd = (name, path, desc) => ({
  "@type": "WebApplication", name, url: URL + path, description: desc, applicationCategory: "BusinessApplication",
  operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: FEATURES, publisher: PUBLISHER,
});
const articleLd = (headline, path, desc) => ({
  "@type": "Article", headline, description: desc, mainEntityOfPage: URL + path, datePublished: DATE, dateModified: DATE,
  author: PUBLISHER, publisher: PUBLISHER, image: URL + "/og.png",
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
    ? `<a href="#how">How it works</a><a href="/how-to-run-a-punch-card-loyalty-program">Loyalty guide</a><a href="#faq">FAQ</a>`
    : `<a href="/">Punch card maker</a><a href="/how-to-run-a-punch-card-loyalty-program">Loyalty guide</a><a href="/about">About</a>`;
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
${quick ? `    <div class="content narrow quick"><p class="tldr"><strong>Quick answer:</strong> ${quick}</p></div>\n` : ""}${tool ? `    <section class="tool card" aria-label="Punch card maker"><div id="pp-tool"${toolAttr}></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? faqHtml(faq) + "\n" : ""}${noRelated ? "" : RELATED + "\n"}${updated(note === undefined ? "General information, not legal or tax advice." : note)}
    </article>
  </main>
${FOOT}
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

const HONEST = "Serial numbers and staff initials help you keep track of the cards you hand out, but a card printed at home can be copied, so they are not fraud-proof.";

/* ------------------------------------------------------------------ home */
const homeSteps = [
  ["Pick a preset", "Choose Coffee, Salon &amp; barber, Car wash, Bakery, Dog grooming, Classroom behavior, Reading &amp; chores or General. Each one fills in sample wording, a punch mark, a punch count and colours that you can change."],
  ["Write the card", "Type your business name, the reward line (for example “Buy 9, get the 10th free”) and a short terms line. Add your logo, a contact line or a “Name” write-in line if you want them. The preview updates as you type."],
  ["Set punches and style", `Choose 5 to 12 punches in one or two rows, plain circles or an icon, and whether the last spot is a filled “FREE” reward spot. Pick a ready-made palette or your own accent colour, a font style and a light or dark background.`],
  ["Choose the sheet and quantity", `Pick US Letter (10 cards of ${F.card}), A4 (10 cards of ${F.a4}) or plain paper with crop marks. Enter how many cards you need, up to 500, and switch on serial numbers or a matching back if you want them.`],
  ["Download, print and cut", "Download the PDF and print it at 100% (Actual size). Print one test sheet on plain paper first, then use cardstock. Separate the cards along the perforations, or cut on the crop marks."],
];
const homeFaq = [
  ["Is PunchPerk really free?", "Yes. Every feature is free, with no account, no login and no limit on how often you use it. Each printed sheet has a small “Made with PunchPerk” line in the bottom page margin, outside every card and crop mark, so the cards you hand out stay clean."],
  ["What size are the punch cards and how many fit on a page?", `On US Letter each card is ${F.card} and 10 fit on a page, 2 across and 5 down. On A4 each card is ${F.a4}, also 10 per page. The plain-paper layouts put ${F.plain} cards on a page with ${F.gap} gaps and crop marks, so you can cut them by hand.`],
  ["Will it work with Avery business card sheets?", `PunchPerk's Letter layout is compatible with common 10-up business card sheets such as Avery 8371 and 5371 style sheets: ${F.card} cards, ${F.lTop} in top and bottom margins and ${F.lSide} in side margins. Check the size printed on your box before a full run. PunchPerk is not affiliated with Avery.`],
  ["How do I print the backs on the other side?", "Switch on <em>Print a matching back</em>, keep the order on <em>Front, back, front, back</em>, and print the PDF two-sided with “flip on long edge”. PunchPerk mirrors each back left to right so it lands behind its front. If your printer can't print two-sided, choose <em>All fronts, then all backs</em>, print the front pages, put the same sheets back in the tray and print the back pages."],
  ["Are serial numbers and staff initials fraud-proof?", HONEST + " A numbered card does let you notice a duplicate number and see which batch a card came from. Stamping with a distinctive punch or stamp, and keeping a short log of redeemed numbers, adds a little more protection."],
  ["Can I add my logo, and is it uploaded anywhere?", "You can add a PNG, JPG or SVG logo. It is resized inside your browser, drawn on the card and embedded in the PDF, and it never leaves your device. A copy is kept in this browser's local storage so it is still there when you come back, unless it is very large, in which case it is used for this visit only."],
  ["How many cards can I make at once?", "Up to 500 cards in one PDF, which is 50 sheets of 10. For more, make a second batch that starts where the first ended, for example at serial number 501."],
  ["How many punches should a card have?", "Most small businesses use 8 to 10. Fewer punches get customers to the reward faster, which suits low-priced items or busy weeks; more punches suit higher-priced services. The <a href=\"/how-to-run-a-punch-card-loyalty-program\">loyalty program guide</a> shows what each choice costs you."],
  ["Can I use the card as a digital punch card?", "Yes. <em>Card image (PNG)</em> saves the front of one card at 300 dpi, without a serial number, for sharing in a message or posting. Customers can mark it with any image or drawing app, but a digital card is easier to edit than a punched paper one, so it suits friendly rewards more than cash-value ones."],
  ["Is my information uploaded anywhere?", "No. Your wording, logo and settings are used in your browser to build the preview, the PDF and the PNG. They are saved only in this browser's local storage so your card is still there next time."],
];
const home = {
  path: "/",
  title: "Printable Punch Card Template (Free, 10 per Page) | PunchPerk",
  desc: "Free printable punch card template: 10 business-card-size loyalty cards per page, with your logo, icons, serial numbers and matching backs. No login.",
  h1: "Printable Punch Card Template (Free, 10 per Page)",
  lead: "Design a loyalty punch card once and print 10 real business-card-size cards per sheet, with optional serial numbers and matching backs. Free, no login, and nothing leaves your browser.",
  quick: `To make a printable punch card, pick a preset below, type your business name and reward (for example “Buy 9, get the 10th free”), choose 5 to 12 punches and a punch mark, then click <em>Download print-ready PDF</em>. Each US Letter page holds 10 cards at ${F.card}; each A4 page holds 10 at ${F.a4}. Turn on serial numbers or a back side with a QR code if you want them.`,
  badges: ["100% free", "10 cards per page", "Letter &amp; A4", "Serials &amp; backs", "No login"],
  tool: { preset: "" },
  schema: [appLd(NAME, "/", "Free printable punch card maker. Print 10 loyalty punch cards per US Letter or A4 sheet with your logo, icons, optional serial numbers and matching backs."), howToLd("How to make printable punch cards", homeSteps)],
  faq: homeFaq,
  body: `      <h2 id="how">How to make printable punch cards in 5 steps</h2>
${stepsHtml(homeSteps)}

      <h2>What goes on a punch card</h2>
      <p>A paper punch card is a small promise: do this a few times and you get something back. The card only has to say who is making the promise, what the reward is, and how many visits it takes. PunchPerk puts those on the front in a fixed order so a customer can read the card in two seconds:</p>
      <ul>
        <li><strong>Business name and logo</strong> across the top, with an optional serial number such as No. 0001 on the right.</li>
        <li><strong>The reward line</strong> in your accent colour, for example “Buy 9 drinks, get the 10th free”.</li>
        <li><strong>The punch grid</strong>: 5 to 12 marks in one or two neat rows. The last mark can be a filled reward spot that says FREE or shows a gift icon.</li>
        <li><strong>A terms line</strong> in small type: one stamp per visit, no cash value, any limits on the free item.</li>
        <li><strong>A “Name” write-in line</strong> and an optional contact line along the bottom.</li>
      </ul>
      <p>The optional back adds your address, opening hours, social handle and a QR code that points to your menu, booking page or review link. Customers keep the card in a wallet for weeks, so the back is useful space.</p>

      <h2>Sizes, sheets and layouts</h2>
      <table>
        <thead><tr><th>Layout</th><th>Card size</th><th>Per page</th><th>Best for</th></tr></thead>
        <tbody>
          <tr><td>US Letter business-card sheet</td><td>${F.card} (${F.cardMm})</td><td>10 (2 × 5), ${F.lTop} in top and bottom margins, ${F.lSide} in side margins</td><td>Pre-cut perforated sheets, no cutting</td></tr>
          <tr><td>A4 business-card sheet</td><td>${F.a4}</td><td>10 (2 × 5), centred on the page</td><td>Pre-cut A4 sheets in 85 × 55 mm</td></tr>
          <tr><td>Plain paper with crop marks</td><td>${F.card} on Letter, ${F.a4} on A4</td><td>${F.plain} (2 × 4), ${F.gap} gaps</td><td>Any paper or cardstock, cut by hand</td></tr>
        </tbody>
      </table>
      <p>The Letter layout is compatible with common 10-up business card sheets such as Avery 8371 and 5371 style sheets. Pre-cut sheets save the most time. If you don't have any, the plain-paper layout prints the same cards with a small gap and crop marks, which you can cut with a paper trimmer in a few minutes. <a href="/punch-card-template-10-per-sheet">The 10-per-sheet guide</a> covers sheet margins, alignment and two-sided printing in more detail.</p>

      <h2>Punch marks, colours and fonts</h2>
      <p>Choose plain circles, which are easy to punch or stamp, or one of ten simple icons drawn for this tool: coffee cup, star, heart, scissors, paw print, car, cupcake, book, smiley face or check mark. Six ready-made palettes set the accent colour and the background in one click, and the colour picker lets you match your brand exactly.</p>
      <p>Three font styles use the fonts built into every PDF reader, so the PDF looks the same on every device: Modern (Helvetica), Classic (Times) and Typewriter (Courier). A dark card background looks striking for a barber or a late-night café, but it uses a lot of ink and needs your printer to be well aligned, so a light background is the safer choice for your first run.</p>

      <h2>Serial numbers and staff initials</h2>
      <p>Turn on <em>Print a serial number on each card</em> and set a prefix, a start number and zero padding. With the prefix “No. ” and four digits, a run reads No. 0001, No. 0002 and so on, and numbers continue across sheets. The optional <em>Initials</em> box adds a small write-in box at the end of each punch row, where the staff member who gives the reward can sign.</p>
      <p>${HONEST} They are still worth having: a number tells you which batch a card came from, lets you keep a short log of redeemed cards, and makes a duplicate easy to spot. For stronger protection, punch with a shaped hole punch or use an ink stamp that is hard to buy.</p>

      <h2>Printing tips that save paper</h2>
      <ul>
        <li><strong>Print at 100% / Actual size.</strong> “Fit to page” or “Shrink oversized pages” scales the cards and moves them off the perforations.</li>
        <li><strong>Test on plain paper first.</strong> Hold the printed test sheet against a real card sheet up to a window. If it is off, open <em>Printer alignment</em>, shift the layout by up to 3 mm and print another test. The <em>alignment test PDF</em> prints card outlines only.</li>
        <li><strong>Use the right paper.</strong> Choose card sheets that match your printer type, inkjet or laser, and a weight your printer accepts. Check the printer manual for the heaviest paper it can feed.</li>
        <li><strong>Two-sided printing:</strong> choose “flip on long edge” and print one test sheet before a full run.</li>
        <li><strong>Let ink dry</strong> before you flip a sheet, especially on glossy stock.</li>
      </ul>

      <h2>Ideas by type of business</h2>
      <ul>
        <li><a href="/coffee-punch-card-template">Coffee punch cards</a> for carts, trucks and cafés, with a coffee cup mark and a free-drink reward.</li>
        <li><a href="/salon-loyalty-card-template">Salon and barber loyalty cards</a> with scissors, a Classic font and a QR code to your booking page.</li>
        <li><a href="/behavior-punch-card-printable">Behavior punch cards</a> for teachers, with a Name line and a prize at the end.</li>
        <li><a href="/reward-punch-card-for-kids">Reward punch cards for kids</a>: reading nights and chores, for parents and teachers.</li>
        <li><a href="/editable-punch-card-template">An editable punch card template</a> with no Canva account or login.</li>
        <li><a href="/how-to-run-a-punch-card-loyalty-program">The loyalty program guide</a>: how many punches, what counts as a stamp and how to handle lost cards.</li>
      </ul>

      <h2>Why a punch card generator</h2>
      <p>A design app can make one attractive card, but you then have to copy it nine times onto a sheet, line the copies up and number them by hand. A generator does the repetitive part: you design the card once and PunchPerk lays out the whole sheet, numbers every card, mirrors the backs for two-sided printing and puts everything where the perforations are. It needs no account, so you can come back next season, change the reward and print another batch in a few minutes.</p>`,
};

/* ----------------------------------------------------------- landing pages */
const P = [];

P.push({
  path: "/coffee-punch-card-template", crumb: "Coffee punch card template",
  title: "Coffee Punch Card Template: Free Printable, 10 per Page",
  desc: "Free coffee punch card template for carts, trucks and cafés: coffee cup punches, a free-drink reward, optional serial numbers and a QR menu on the back.",
  h1: "Coffee Punch Card Template (Free Printable)",
  lead: "For coffee carts, food trucks, cafés and tea or boba stands: a 10-punch card with a coffee cup on every spot, ready to print 10 per page.",
  quick: "The Coffee preset above gives you a 10-punch card with coffee cups and a filled FREE spot, in espresso brown. Replace the sample name with yours, check the reward line says what you really give away, and download the PDF. Ten cards fit on each US Letter or A4 page.",
  tool: { preset: "coffee" },
  faq: [
    ["How many punches should a coffee card have?", "Ten is the usual choice: nine paid drinks and the tenth free, which is what the Coffee preset prints. If your drinks are cheap and customers come in daily, 8 punches reaches the reward in under two weeks. If most customers visit once or twice a week, 10 or more may feel too far away to bother with."],
    ["Should the free drink be any drink?", "That is your call, and you should say it on the card. “Free drink up to a large” or “free drink up to $5” stops the card being used on a specialty drink that costs much more than the ones that earned it. The terms line has room for about two short lines."],
    ["Can customers earn a punch for extra shots or pastries?", "Decide a rule and print it. Many stands give one punch per drink, however many items are in the order, which keeps the line moving. Others punch once per $5 spent. Whatever you choose, make it simple enough that a new employee can follow it without asking."],
    ["What can I use to punch the cards?", "A single-hole paper punch makes a clean mark in a circle. A small decorative punch, such as a star, is harder to copy. A rubber stamp with your logo and an ink pad also works on glossy stock, where a punch can leave a ragged edge."],
    ["Can I put a menu QR code on the back?", "Yes. Turn on <em>Print a matching back</em>, paste your menu link, and PunchPerk draws the QR code as sharp vector squares. Test it with a phone before printing a full run, and use a link you won't change."],
  ],
  body: `      <h2>What the Coffee preset prints</h2>
      <p>The front has your business name across the top, the reward line in espresso brown, and ten circles each holding a small coffee cup outline. The tenth is a filled reward spot with the word FREE. Under the grid sit a short terms line, a “Name” write-in line and a contact line for your opening hours or website. The back, if you switch it on, carries a thank-you line, your address, your hours, your social handle and a QR code to your menu or order page.</p>
      <p>Everything on the card is text you can change. The sample business, address and web link are placeholders, so replace every one before you print.</p>

      <h2>Why coffee suits punch cards</h2>
      <p>Coffee is a habit purchase. People buy the same drink at the same place many times, and a card in the wallet is a small reminder to come back to you instead of the next cart down the street. A paper card has real advantages for a stand: there is no sign-up, no app to install, no tablet to charge and nothing to explain at a busy counter. The customer hands the card over, you punch it, and you carry on.</p>
      <p>That is also why the card should be simple. Put one clear sentence in the reward line, keep the terms to one stamp per drink, and let the punch grid do the explaining.</p>

      <h2>Setting the reward</h2>
      <p>The classic structure is buy nine, get the tenth free. If every drink costs the same and a customer finishes the card, one drink in ten is free. The <a href="/how-to-run-a-punch-card-loyalty-program">loyalty program guide</a> lists the arithmetic for other sizes. Not every customer finishes a card, and some cards are lost or forgotten in a drawer, so the real cost is lower than the headline figure, but it is wise to make sure you can afford the number if everyone does.</p>
      <ul>
        <li><strong>Cap the free drink.</strong> “Up to a large” or “up to $5” in the terms line.</li>
        <li><strong>Say what counts.</strong> One stamp per drink, per visit, or per $5.</li>
        <li><strong>Make the reward easy to claim.</strong> The filled FREE spot tells the customer and the barista exactly where the card ends.</li>
      </ul>

      <h2>Printing for a cart or truck</h2>
      <p>Most stands print their first batch at home or at a library and reprint when they run low, so the layouts are built around that. Pre-cut business card sheets (Letter ${F.card}, A4 ${F.a4}) need no cutting at all. On plain cardstock, the crop-mark layout fits ${F.plain} cards per page. A 250-card run is 25 sheets on a 10-up layout.</p>
      <p>Coffee stands are often damp. Printing on a heavier, coated or waterproof stock helps cards survive a cup holder, and an inkjet card stock that is rated for your printer is safest. Let the ink dry before you stack or flip the sheets.</p>

      <h2>Serial numbers for a loyal base</h2>
      <p>If you hand out cards at several events or from more than one cart, turn on serial numbers. You will see No. 0001 to No. 0250 across the run, and you can keep a short list of numbers that have been redeemed. ${HONEST}</p>

      <h2>Try a dark card</h2>
      <p>The <em>Midnight gold</em> palette in the style section gives you a dark card with a gold accent, a good look for an evening coffee bar or a cocktail-and-coffee cart. Keep in mind that dark cards use more ink and show misalignment more, so print one test sheet first.</p>`,
});

P.push({
  path: "/salon-loyalty-card-template", crumb: "Salon loyalty card template",
  title: "Salon Loyalty Card Template: Free Printable Punch Cards",
  desc: "Free salon and barber loyalty card template: scissors punches, a free-service reward, Classic font, QR code to your booking page and 10 cards per page.",
  h1: "Salon Loyalty Card Template",
  lead: "For hair salons, barbers, nail studios and lash artists: a punch card with scissors on every spot, a free-service reward and a QR code to book the next visit.",
  quick: "The Salon &amp; barber preset above prints an 8-punch card with scissor marks, a Classic serif font and a filled FREE spot, plus a back with your address, hours and a QR code to your booking page. Swap in your own name, reward and link, then download the PDF, 10 cards per page.",
  tool: { preset: "salon" },
  faq: [
    ["How many visits should a salon loyalty card ask for?", "Salon visits are less frequent than coffee runs, so shorter cards work better. The preset uses 8 punches: seven paid services and the eighth free. A barber with clients every two to three weeks may prefer 6. Spend a minute working out how long a client would take to finish the card."],
    ["Should a free service be the same as the one stamped?", "Say it on the card. “Free cut is the same service as the one stamped” is clear, and so is “free service up to $40”. For salons that sell colour, a fixed value avoids a long-running debate over whether a free cut can be swapped for foils."],
    ["Can the staff punch cards for walk-ins?", "Yes, and the optional Initials box helps. Each row has a small box where the stylist who gives the free service can write their initials. It is a record of who handled the card, not protection against copying."],
    ["What goes on the back of a salon card?", "Your address, opening hours, social handle, a thank-you line and a QR code that opens your online booking page. Clients tend to keep the card for months, so the back is a place to put the details they will want."],
    ["Does this work for nail technicians and lash studios?", "Yes. Change the punch mark to a star, heart or check, edit the reward line to match your services, and set the number of punches that fits your pricing."],
  ],
  body: `      <h2>What the Salon &amp; barber preset prints</h2>
      <p>The preset uses a Classic (Times) font in raspberry, eight scissor-mark punches in two rows of four, and a filled FREE spot as the last punch. The reward line reads “Buy 7 cuts, get the 8th free”, a terms line asks clients to book ahead, and a contact line carries your phone number and website. On the back, a thank-you message sits above your address, hours and social handle, and a QR code points to your booking page.</p>
      <p>The sample name, phone number and web address are placeholders. Replace them all before you print.</p>

      <h2>Pick a reward that matches your pricing</h2>
      <p>Salon prices vary much more than coffee prices, so be specific. A free service that a client can use on anything from a trim to a colour treatment may cost you far more than a free cut. Some practical ways to cap it:</p>
      <ul>
        <li><strong>Name the service:</strong> “8th cut free” or “free blow-dry on the 6th visit”.</li>
        <li><strong>Set a value:</strong> “Free service up to $40”.</li>
        <li><strong>Offer a discount instead:</strong> “$15 off your 6th visit” keeps the reward predictable.</li>
      </ul>
      <p>The reward line fits roughly 40 characters at full size and shrinks slightly for longer text, so keep it short and put the detail in the terms line.</p>

      <h2>What counts as a stamp</h2>
      <p>Decide this before the first card goes out. Common rules for salons and barbers: one stamp per paid service regardless of price; one stamp per visit even if the client has two services; or one stamp per $25 spent. Print the rule in the terms line so the stylist and the client read the same words. If clients can pay with a gift certificate, decide whether that visit earns a stamp, and say so. For gift certificates, our sister tool <a href="https://giftcert.roohsites.com/">GiftStub</a> prints numbered ones.</p>

      <h2>Make rebooking part of the card</h2>
      <p>The QR code on the back can open your booking page, so the card does more than count visits. Test it with a phone before printing a full run, and use a booking link that you won't change. A short caption such as “Book online” explains what the code does.</p>
      <p>If your salon takes bookings by text or phone only, leave the QR link blank and put the number in the contact line. The back is then your hours and address with a thank-you message.</p>

      <h2>Printing for a salon or barbershop</h2>
      <p>Pre-cut business card sheets suit a busy front desk because there is nothing to trim. The Letter layout prints ${F.card} cards in a 2 × 5 grid; the A4 layout prints ${F.a4} cards. Choose a matte or satin card stock that can be written on, because clients and stylists will write dates and initials. A glossy card can smudge.</p>
      <p>Keep a stack of cards at the desk, and hand one to every new client with their first service. A card with the first punch already on it, sometimes called a head start, gives people a reason to keep it.</p>

      <h2>Colours and finish</h2>
      <p>The raspberry palette suits a boutique salon; <em>Midnight gold</em> gives a barber a dark card with a gold accent; <em>Ocean teal</em> and <em>Lime green</em> suit a wellness or nail studio. Switch the font to Modern for a cleaner, sans-serif look. Turn off the rounded border if your cards will be trimmed close, because a border near the edge shows any cutting error.</p>`,
});

P.push({
  path: "/behavior-punch-card-printable", crumb: "Behavior punch card printable",
  title: "Behavior Punch Card Printable: Free Classroom Template",
  desc: "Free behavior punch card printable for teachers: star punches, a prize at the end, a name line and 10 cards per page. Print for a whole class in minutes.",
  h1: "Behavior Punch Card Printable (Free Classroom Template)",
  lead: "For teachers: a clear, positive punch card for effort, kindness and being ready to learn. Print a class set in one go, 10 cards per page.",
  quick: "The Classroom behavior preset above prints a 10-punch card with stars, a Name line and the reward line “10 punches = choose a prize”. Type your class name, edit the terms to match your expectations, and print one card per student: 30 cards is 3 pages.",
  tool: { preset: "classroom" },
  faq: [
    ["How many punches should a classroom behavior card have?", "Ten works for a month-long goal; five or six suits younger children or a weekly goal. A card that can be completed within a week gives students a reachable target, and teachers who want a longer goal can run a second card."],
    ["What should students earn punches for?", "Choose a short list of positive behaviors and put it on the board. Examples: being kind to a classmate, finishing work, helping tidy up or showing a good effort. The terms line on the card has room for one short sentence, so keep the full list on the wall."],
    ["What rewards work without a budget?", "Many teachers use no-cost rewards: choosing a seat for the day, being line leader, extra reading time, a note home or picking the class song. Put the prize on the reward line so students know exactly what they are working for."],
    ["Can I print a class set quickly?", "Yes. Enter the number of students as the quantity and print. For 30 students, that's 3 sheets of 10. Add a few spare cards for new arrivals. If you want to hand out cards by name, leave the Name line on and have students write their own."],
    ["Is it fair to use punch cards for behavior?", "Many teachers prefer to reward what they want to see rather than to record misbehavior, and punch cards fit that approach. Keep expectations consistent, give punches promptly and privately where you can, and don't use the card as public ranking of students."],
  ],
  body: `      <h2>What the Classroom behavior preset prints</h2>
      <p>The card is titled “Star Student Card” in blue. Ten star outlines make up the punch grid in two rows of five, with the tenth a filled reward spot. The reward line says “10 punches = choose a prize”, the terms line reads “Earn a punch for kindness, effort and being ready to learn”, and a Name line at the bottom is for the student to fill in. The contact line holds a teacher name and room number. Change any of it to match your own classroom.</p>
      <p>Everything stays in your browser. No student names are entered into the tool, and nothing is uploaded, so there is nothing to sign up for and nothing to report to your school's tech team. The tool needs no student data to work.</p>

      <h2>Setting expectations before you hand out cards</h2>
      <p>A punch card works best when students know the rules. Spend two minutes on the first day explaining what earns a punch, who punches the card and where it is kept. Younger students lose cards, so many teachers keep them in a pocket chart or a labeled envelope and let students collect them at the end of the day.</p>
      <ul>
        <li><strong>Keep the list short.</strong> Three to five behaviors are easier to remember than a page of rules.</li>
        <li><strong>Punch quickly and quietly.</strong> A punch right after the behavior means more than one at the end of the week.</li>
        <li><strong>Let every student succeed.</strong> A card that only the top few can finish teaches the rest to stop trying. Adjust the number of punches or the goals so most students can complete it.</li>
      </ul>

      <h2>Choosing a punch mark</h2>
      <p>The preset uses stars. Other choices that suit a classroom are a check mark for completed work, a smiley for kindness or a heart for helping others. A hole punch in a fun shape makes the mark more special, and a star stamp is quick if you have a big class. You can also use a sticker in each circle.</p>
      <p>If you teach a younger class, switch to 5 or 6 larger punches. Fewer, bigger circles are easier for small hands and give a quicker reward. For older students a 10- or 12-punch card suits a longer term goal.</p>

      <h2>Printing a class set</h2>
      <p>Print on white card stock if your printer can feed it. Thin paper works, but cards last longer when they are sturdy. Letter and A4 pre-cut business card sheets save cutting time; if you don't have any, the plain-paper layout puts ${F.plain} cards on a page with crop marks for a paper trimmer. A class of 28 on a 10-up sheet takes 3 pages, with two spare cards.</p>
      <p>Turn on <em>Print a serial number on each card</em> if you want to give each student a numbered card, such as No. 01 to No. 28 with a prefix and two-digit padding. It makes it easy to match a lost card to a student without writing names on the front. ${HONEST}</p>

      <h2>Make the back useful</h2>
      <p>Use the back for a short message to families or a list of the behaviors that earn punches. The back supports a thank-you line, an address and hours, so adapt those fields: put “Ask me about our classroom goals” in the thank-you message and your school contact in the address line. Leave the QR link blank unless you have a class page you want families to open.</p>`,
});

P.push({
  path: "/reward-punch-card-for-kids", crumb: "Reward punch card for kids",
  title: "Reward Punch Card for Kids: Free Printable Template",
  desc: "Free reward punch card for kids: reading nights, chores and good habits, with book icons, a prize spot and 10 cards per page for parents and teachers.",
  h1: "Reward Punch Card for Kids (Free Printable)",
  lead: "For parents and teachers: a punch card for reading nights, chores and new habits, with a prize at the end. Print several at once, 10 per page.",
  quick: "The Reading &amp; chores preset above gives you a 10-punch card with book marks and a filled prize spot in purple. Type the child's reward, change the terms line to the habit you are working on, and print. Each page holds 10 cards, so one sheet covers a family or a small reading group.",
  tool: { preset: "kids" },
  faq: [
    ["How many punches suit younger children?", "For ages 4 to 6, try 5 or 6 punches so the reward arrives within a week. Older children can handle 10 or 12 for a month-long goal. A reward that arrives soon matters more than a big one that is far away."],
    ["What are good rewards that don't cost much?", "Time and choices work well: pick a family movie, stay up 15 minutes late, choose the weekend breakfast, have a friend over or get a trip to the library. Match the reward to the effort, and let the child help choose it."],
    ["Should a punch card be used for chores?", "Many families use one for new habits and short-term goals. Keep the list small, make the rules clear, and don't punch for basic things the child is expected to do every day. The card is for building a new habit, not for paying for everything."],
    ["Can I make a card for each child?", "Yes. Print a card for each child, change the Name line, or give siblings different colours so they can tell them apart. The palettes change the accent colour in one click."],
    ["Can the card be reused?", "A card with a clear reward at the end is easy to reset. Print a spare batch and start a new card when one is finished, or laminate a card and mark it with a dry-erase pen."],
  ],
  body: `      <h2>What the Reading &amp; chores preset prints</h2>
      <p>The front shows “My Reading Rewards” in purple, ten open-book outlines in two rows of five and a filled prize spot at the end. The reward line says “Read 9 nights, pick a reward”, and the terms line says that a grown-up punches the card after each finished night or chore. The back thanks the child with “Keep reading, keep growing!”. Change the wording to suit your family, your classroom or a library program.</p>

      <h2>Make the goal small enough to win</h2>
      <p>Children respond to goals they can see themselves reaching. A reading card that fills in a month is a long wait for a six-year-old. Choose the number of punches to match how often the habit happens. For a nightly habit, 7 punches is a week; for a habit that happens three times a week, 6 punches is two weeks. The punch count in PunchPerk runs from 5 to 12.</p>
      <ul>
        <li><strong>One habit per card.</strong> Reading, tidying a room, practicing an instrument or brushing teeth. Mixed cards are harder to follow.</li>
        <li><strong>Punch right away.</strong> The sooner the punch follows the habit, the stronger the link.</li>
        <li><strong>Give the reward on time.</strong> A reward that is promised and delayed teaches nothing good.</li>
      </ul>

      <h2>For parents</h2>
      <p>Print a few cards on card stock, keep a hole punch or stamp on the fridge and let your child choose which punch mark to use. Letting kids pick the icon, the colour and the reward makes them more likely to care about the card. A star, heart or smiley suits most children, and the paw print is popular with animal fans. Add your child's name on the Name line.</p>
      <p>Don't worry about the serial numbers and staff initials boxes; they are designed for businesses and are switched off in this preset.</p>

      <h2>For teachers and librarians</h2>
      <p>A reading challenge works well with a punch card. Hand one to every student at the start of the challenge, give a punch for each book finished or each night of reading logged, and award a bookmark or a prize at the end. A class of 25 needs 3 pages at 10 cards per page. Try the <a href="/behavior-punch-card-printable">behavior punch card</a> for classroom conduct goals.</p>
      <p>For a library program, turn on the back and add the library's address and opening hours, with a QR code to the events page or the catalogue. The thank-you line can carry the program name.</p>

      <h2>Printing and keeping the cards</h2>
      <p>Print on card stock for cards that survive a school bag or a fridge door. If you only need a few, use the plain-paper layout with crop marks: ${F.plain} cards per page, cut with scissors or a trimmer. Pre-cut ${F.card} business card sheets suit a bigger group. A cheap sleeve or a bit of tape stops the card from tearing, and a ring of cards held together with a binder clip keeps a family set tidy.</p>`,
});

P.push({
  path: "/punch-card-template-10-per-sheet", crumb: "Punch card template 10 per page",
  title: "Punch Card Template 10 per Page (Business Card Size)",
  desc: "Punch card template with 10 cards per page for business card sheets: Letter 3.5 × 2 in and A4 85 × 55 mm, exact margins, alignment test and duplex backs.",
  h1: "Punch Card Template, 10 per Page (Business Card Sheets)",
  lead: "A 10-per-sheet punch card layout for pre-cut business card sheets, with exact margins, a printer offset, an alignment test and backs that line up when printed two-sided.",
  quick: `Choose <em>US Letter business-card sheet</em> for ${F.card} cards in a 2 × 5 grid (${F.lTop} in top and bottom margins, ${F.lSide} in side margins, no gaps), or <em>A4 business-card sheet</em> for ${F.a4} cards. Print at 100%, test on plain paper, and use the alignment test and shift boxes if the cards sit off the perforations.`,
  tool: { preset: "general" },
  faq: [
    ["Is this compatible with Avery 8371 and 5371 sheets?", `The Letter layout matches the standard 10-up business card sheet geometry used by Avery 8371 and 5371 style sheets: ${F.card} cards, 2 across and 5 down, ${F.lTop} in top and bottom margins and ${F.lSide} in side margins with no gutter. Always compare with the size printed on your own box. PunchPerk is not affiliated with Avery.`],
    ["Why do my cards print slightly off the perforations?", "Home printers rarely print exactly where the file says. Print the alignment test on plain paper, hold it against a card sheet up to the light, and use the shift boxes under Printer alignment to move the layout up to 3 mm in any direction. Also check that the print dialog is set to 100% or Actual size, not Fit to page."],
    ["How do I make the backs line up with the fronts?", "Print two-sided with “flip on long edge”. PunchPerk mirrors each back left to right so the card at the top-left on the front has its back at the top-right of the back page, which is directly behind it. Print one test sheet before a full run."],
    ["Can I print the fronts and backs separately?", "Yes. Choose <em>All fronts, then all backs</em>. Print the front pages first, put the same sheets back in the tray the way your printer needs them and print the back pages. A test on plain paper marked with a pencil arrow shows which way the paper should go."],
    ["Does the A4 layout fit 85 × 55 mm card sheets?", `Yes. It prints ${F.a4} cards in a 2 × 5 grid, centred on the page with ${F.aSide} mm side margins and ${F.aTop} mm top and bottom margins. As with Letter, check your sheet's own dimensions first, because suppliers differ.`],
  ],
  body: `      <h2>The layouts in numbers</h2>
      <table>
        <thead><tr><th></th><th>US Letter</th><th>A4</th></tr></thead>
        <tbody>
          <tr><td>Page size</td><td>8.5 × 11 in</td><td>210 × 297 mm</td></tr>
          <tr><td>Card size</td><td>${F.card} (${F.cardMm})</td><td>${F.a4}</td></tr>
          <tr><td>Grid</td><td>2 across, 5 down (10)</td><td>2 across, 5 down (10)</td></tr>
          <tr><td>Side margins</td><td>${F.lSide} in</td><td>${F.aSide} mm</td></tr>
          <tr><td>Top and bottom margins</td><td>${F.lTop} in</td><td>${F.aTop} mm</td></tr>
          <tr><td>Gap between cards</td><td>None</td><td>None</td></tr>
        </tbody>
      </table>
      <p>The cards touch each other, so a pre-cut sheet needs no trimming. Your printer needs to print right up to the edge of each card for a dark card background, which is why light backgrounds are easier. If you want guide lines to check the fit, switch on <em>Print light outlines around each card</em> in the alignment section.</p>

      <h2>Step by step: a clean first print</h2>
      <ol>
        <li>Choose your layout and set the number of cards. Use a quantity that fills whole sheets, such as 10, 20 or 30, to avoid a half-empty last sheet.</li>
        <li>Open <em>Printer alignment</em> and download the alignment test PDF.</li>
        <li>Print it on plain paper at 100% (Actual size), with any “fit to page” or “scale” option off.</li>
        <li>Hold the print against a real card sheet and a window. If the outlines are off, enter a shift in millimetres and download the test again. Positive numbers move the layout right and down.</li>
        <li>When the outlines sit on the perforations, download the real PDF and print one sheet on card stock before you run the batch.</li>
      </ol>

      <h2>Printing the back side</h2>
      <p>With <em>Print a matching back</em> on, the PDF includes a back page for every front page. Under duplex printing with “flip on long edge”, the paper turns like the page of a book, so the left side of the front becomes the right side of the back. PunchPerk does that mirroring for you: the back of the top-left card is drawn at the top right of the back page.</p>
      <p>Some printers label the setting “long-edge binding” or “flip on long side”. If the backs come out upside down, your printer's setting is the other one: choose the opposite, or print a test on plain paper marked with an arrow. For single-sided printers, use <em>All fronts, then all backs</em>, and feed the front-printed sheets back in.</p>

      <h2>Plain paper with crop marks</h2>
      <p>Without pre-cut sheets, choose a plain-paper layout. It places ${F.plain} cards on the page in two columns and four rows with ${F.gap} gaps and crop marks outside the card block. Cut along the marks with a paper trimmer, one column cut, then the row cuts. Dark card backgrounds run a little into the gap so a small cutting error doesn't leave a white edge.</p>

      <h2>Choosing sheets</h2>
      <ul>
        <li>Match the sheet to your printer: inkjet sheets for inkjet printers, laser sheets for laser printers.</li>
        <li>Check the box for the card size, the number per sheet and the margins before ordering a pack.</li>
        <li>Buy a small pack first and print a test run. Brands differ slightly even when the nominal size is the same.</li>
      </ul>
      <p>The sheets that PunchPerk targets are common 3.5 × 2 in (US) and 85 × 55 mm (Europe) business card sheets with 10 cards each. Other sizes, such as 8 up with 3.5 × 2 in cards and gaps, are covered by the plain-paper layouts.</p>`,
});

P.push({
  path: "/editable-punch-card-template", crumb: "Editable punch card template",
  title: "Editable Punch Card Template: No Canva, No Login",
  desc: "Editable punch card template you edit right on the page: change the text, punches, icons and colours, add a logo and print 10 per page. No Canva, no login.",
  h1: "Editable Punch Card Template (No Canva, No Login)",
  lead: "Edit the wording, punches, colours and logo right here, see the card update as you type, and print 10 per page. No design app, no account, no email.",
  quick: "Everything in the tool above is editable: business name, reward line, terms, the number of punches (5 to 12), the punch mark, colours, font and logo. When it looks right, click <em>Download print-ready PDF</em>. No account or app is needed, and your card is saved in this browser so you can edit it again later.",
  tool: { preset: "general" },
  faq: [
    ["Do I need Canva, Word or any software?", "No. The template is edited in your browser on this page. You don't need an account, an app or a download. The PDF it produces opens in any PDF viewer and prints from any printer."],
    ["Can I edit the PDF later?", "The PDF is for printing, so it isn't designed to be edited. Edit the card here instead: your settings are saved in this browser, so you can come back, change the reward line and download a new PDF."],
    ["Will my edits be saved?", "Yes, in this browser. Your text, choices and logo are saved on your device as you type and reload when you return. If you clear your browser data or use another device, you'll start fresh, so note down the wording you want to keep."],
    ["How is this different from a Word or Google Docs template?", "A document template shows one card and asks you to copy it into a table, line it up and number it by hand. Here the card is laid out for the whole sheet, ten to a page, with margins that fit common business card sheets, and numbers continue across pages."],
    ["Can I share the design with a colleague?", "Send them the PDF or the PNG image of the card front. There is no shared account, so two people can't edit the same card at once. If you both use the tool, agree on the wording and copy it across."],
  ],
  body: `      <h2>What you can edit</h2>
      <ul>
        <li><strong>Text:</strong> business name, reward line, terms line, contact line, and on the back a thank-you message, address, opening hours and social handle.</li>
        <li><strong>Punches:</strong> 5 to 12 per card, in one or two rows, with plain circles or one of ten icons, and an optional filled FREE or gift reward spot.</li>
        <li><strong>Look:</strong> six ready-made palettes or any accent colour, three font styles, a light or dark background and an optional rounded border.</li>
        <li><strong>Logo:</strong> upload a PNG, JPG or SVG. It is resized on your device and used on every card.</li>
        <li><strong>Numbering:</strong> optional serial numbers with a prefix, start number and zero padding, plus an optional staff Initials box on each row.</li>
        <li><strong>Sheet:</strong> US Letter or A4, pre-cut business card sheets or plain paper with crop marks, and a printer offset for fine alignment.</li>
      </ul>

      <h2>Why not just use a design app?</h2>
      <p>Design apps are good at making one card look special. Printing a full sheet of numbered cards is a different job. You need ten copies on a page, with the margins set to the sheet; you need numbers that go up by one on each copy; and you need backs that line up when the paper goes through the printer a second time. In an editor those are manual steps, repeated for every batch.</p>
      <p>PunchPerk does only that job. It's not a design suite: you can't drag elements around or draw freehand. In return, the layout rules are built in and every card is guaranteed to land in the same place on every sheet. If you want a unique illustration, make it in any app you like, export it as an image and upload it as the logo.</p>

      <h2>No account, nothing uploaded</h2>
      <p>There is no sign-in, because there is nothing for a server to store. The preview is drawn in your browser, the PDF is built in your browser with the open-source pdf-lib library and the QR code on the back is generated in your browser too. Nothing you type or upload is sent anywhere. Our <a href="/privacy">privacy page</a> explains the two privacy-friendly analytics services we use to count visits.</p>

      <h2>A quick editing workflow</h2>
      <ol>
        <li>Pick the preset closest to your business. You can change every field afterwards.</li>
        <li>Replace the sample name, reward and terms. Check the preview for any text that has been shortened to fit.</li>
        <li>Choose the number of punches so the reward is within reach of your usual customer.</li>
        <li>Upload your logo and pick a palette. A logo with a transparent background looks best.</li>
        <li>Download the PDF, print a test sheet on plain paper and check the sizes, then print on card stock.</li>
      </ol>

      <h2>Text that fits</h2>
      <p>Every line on the card has a limited width. Long names and reward lines are shrunk slightly, down to a readable minimum, and then cut with an ellipsis. When that happens a note appears beneath the preview telling you which line was shortened. The terms line wraps onto two lines and gets smaller before it is cut. Keeping each line short makes the card easier to read at arm's length, which matters more than fitting everything in.</p>
      <p>The tool uses the standard fonts built into every PDF viewer, so Modern (Helvetica), Classic (Times) and Typewriter (Courier). A few characters outside the Western European set can't be printed with those fonts; if you type one, the tool tells you which characters it left out.</p>`,
});

/* ----------------------------------------------------------------- guide */
const guideFaq = [
  ["What is a good reward for a punch card?", "Pick something that costs you less than it feels like it is worth to the customer. A free item you make cheaply, a small discount or an add-on often works better than a large discount. Keep the reward easy to say in one line on the card."],
  ["How many punches should a punch card have?", "Between 5 and 10 for most small businesses. Choose the number from how often a typical customer visits, so the first reward arrives within a few weeks, not a few months."],
  ["Should punch cards expire?", "Many businesses don't expire them, because an expiry date creates arguments. If you do, print the rule on the card, for example “complete within 12 months of the first stamp”, and apply it the same way every time. Rules for loyalty cards vary by country and region, so check what applies to you."],
  ["What if a customer loses a card?", "Decide your policy in advance and apply it kindly. Common choices are no replacement, a fresh card with the punches the customer can describe and you can confirm, or a replacement if the card has a serial number you can check against your records."],
  ["How do I stop people copying punch cards?", "You can't stop it completely. Use a distinctive hole punch or stamp, add serial numbers and staff initials, and keep a short log of redeemed card numbers. These make casual copying harder and help you spot duplicates, but they are not fraud-proof."],
];
P.push({
  path: "/how-to-run-a-punch-card-loyalty-program", crumb: "How to run a punch card loyalty program",
  title: "How to Run a Punch Card Loyalty Program: Simple Guide",
  desc: "How to run a punch card loyalty program: size the reward, set stamp rules, choose expiry, track cards with serial numbers and handle lost cards.",
  h1: "How to Run a Punch Card Loyalty Program",
  lead: "A practical guide for small businesses: how many punches to ask for, what counts as a stamp, whether cards expire and how to keep track of them.",
  quick: "To run a punch card loyalty program, choose a reward you can afford, set the number of punches from how often customers visit, print one clear stamp rule on the card, punch it at the moment of sale, and keep a short record of redeemed cards. Numbered cards make that record easy. Start small, and change the numbers if the first batch teaches you something.",
  note: "General information, not legal or tax advice.",
  schema: [articleLd("How to Run a Punch Card Loyalty Program", "/how-to-run-a-punch-card-loyalty-program", "A practical guide to sizing the reward, setting stamp rules, expiry and tracking for a paper punch card loyalty program.")],
  faq: guideFaq,
  body: `      <h2>Start with what the card has to do</h2>
      <p>A punch card rewards repeat customers with something small once they have come back enough times. It does three things at once: it gives a customer a reason to choose you over a similar shop, it makes the reward visible so they can see their progress, and it costs you nothing until the reward is claimed. Before you print any cards, write down in one sentence what you want from the program, such as “more weekday visits” or “more customers who come back within a month”. That sentence will help you decide the numbers below.</p>

      <h2>Size the reward</h2>
      <p>The headline cost of a punch card is simple arithmetic. If every item costs the same and a customer finishes the card, the free item is one out of every set of paid items plus the free one:</p>
      <table>
        <thead><tr><th>Card</th><th>Paid items</th><th>Free items</th><th>Free share of items</th></tr></thead>
        <tbody>
          <tr><td>Buy 5, get the 6th free (6 punches)</td><td>5</td><td>1</td><td>1 in 6, about 16.7%</td></tr>
          <tr><td>Buy 7, get the 8th free (8 punches)</td><td>7</td><td>1</td><td>1 in 8, 12.5%</td></tr>
          <tr><td>Buy 9, get the 10th free (10 punches)</td><td>9</td><td>1</td><td>1 in 10, 10%</td></tr>
          <tr><td>Buy 11, get the 12th free (12 punches)</td><td>11</td><td>1</td><td>1 in 12, about 8.3%</td></tr>
        </tbody>
      </table>
      <p>These are the most the card can cost you if every customer finishes it and always redeems it on the same priced item. Real results differ: some customers never finish a card, some pay more on the visits that earn a punch, and the free item costs you its ingredients or time, not its menu price. Use the table as an upper limit when you decide whether you can afford the program.</p>
      <p>Then choose the number of punches from the visit pattern. If a typical customer comes in twice a week, a 10-punch card is finished in about five weeks. If a typical customer comes once a month, 10 punches is nearly a year, and the card will probably end up in a drawer. Pick a number that gets most regulars to the first reward within a few weeks.</p>

      <h2>Write the stamp rule on the card</h2>
      <p>Most disputes happen because the rule is unclear. Decide, and print it in the terms line:</p>
      <ul>
        <li><strong>What earns a stamp:</strong> one per drink, one per visit, one per $10 spent or one per service.</li>
        <li><strong>Who stamps:</strong> any staff member, at the moment of purchase. Never stamp for a purchase that has not happened.</li>
        <li><strong>What the free item is:</strong> “free drink up to $5”, “same service as the one stamped” or “$15 off the 6th visit”.</li>
        <li><strong>What it can't be used with:</strong> “not valid with other offers” if that is your policy.</li>
        <li><strong>Whether it has cash value:</strong> “No cash value” is a common line.</li>
      </ul>
      <p>Train every employee on the same rule, and keep the rule short enough to fit on the card.</p>

      <h2>Choose an expiry policy</h2>
      <p>You have three simple options. <strong>No expiry</strong> is the easiest to run and the easiest to explain; its cost is old cards turning up years later. <strong>A date on the card</strong>, such as “Valid until 31 December”, creates a deadline that pushes customers to come back, but it needs consistent enforcement. <strong>A time limit from the first stamp</strong>, such as “complete within 12 months”, gives each customer their own deadline, but you have to be able to see when the first stamp was made, for example by dating it.</p>
      <p>Loyalty card rules differ from gift card rules, and both vary by country and region. Check the rules that apply to you before you print an expiry date, and keep the policy the same for everyone.</p>

      <h2>Track cards with serial numbers</h2>
      <p>Serial numbers turn each card into something you can refer to. With the prefix “No. ” and four digits, PunchPerk prints No. 0001, No. 0002 and so on, continuing across sheets. A simple routine:</p>
      <ol>
        <li>Print a batch and note the range, for example No. 0001 to No. 0250.</li>
        <li>When a customer redeems a finished card, keep the card and write the date on it.</li>
        <li>Add the number to a short list or spreadsheet of redeemed cards. If the same number turns up again, you will see it.</li>
        <li>Print the next batch starting where the last one ended, such as No. 0251, so numbers never repeat.</li>
      </ol>
      <p>The optional Initials box on each punch row records which staff member gave the reward. ${HONEST} Use the numbers and initials as a way of noticing problems, not as security.</p>

      <h2>Handle lost cards and edge cases</h2>
      <p>Decide once and apply it to everyone. Many businesses simply don't replace lost cards. Others restart the card with the punches the customer can describe, or replace it if the serial number matches a record. Whatever you choose, put the idea in your staff notes so it doesn't depend on who is on shift.</p>
      <ul>
        <li><strong>Part-finished cards at a price change:</strong> honour the old reward for cards already in circulation, and change the card on the next print.</li>
        <li><strong>Multiple cards at once:</strong> if one customer hands over two part-filled cards, say whether stamps can be combined (most businesses say no).</li>
        <li><strong>Large orders:</strong> one stamp per transaction keeps it fair, or a cap of one stamp per visit.</li>
      </ul>

      <h2>Print, test and adjust</h2>
      <p>Start with a small batch of 50 or 100 cards. Watch how customers use them in the first month: how many come back, how many ask what a stamp means, and whether staff forget to punch. Then change the number of punches, the reward or the wording and print the next batch. Because the cards are cheap and the template is free, it costs very little to try a different version.</p>
      <p>Ready to print? <a href="/">Make punch cards</a> in minutes, or start from a preset: <a href="/coffee-punch-card-template">coffee</a>, <a href="/salon-loyalty-card-template">salon and barber</a>, <a href="/reward-punch-card-for-kids">kids</a> or <a href="/behavior-punch-card-printable">classroom behavior</a>. If you also sell gift certificates, our sister tool <a href="https://giftcert.roohsites.com/">GiftStub</a> prints numbered gift certificates with matching stubs.</p>`,
});

/* ----------------------------------------------------------- about/privacy */
P.push({
  path: "/about", crumb: "About",
  title: "About PunchPerk: Free Printable Punch Card Maker",
  desc: "PunchPerk is part of Rooh Sites' free tools: small, private web tools that run in your browser. Who makes it, why it's free and how it handles your data.",
  h1: "About PunchPerk",
  lead: "A small, free tool that does one job: printable loyalty punch cards, 10 to a page, ready for a home printer.",
  note: "",
  body: `      <p>PunchPerk is part of <a href="https://roohsites.com/">Rooh Sites</a>' collection of free single-purpose web tools. It is built for coffee carts, food trucks, cafés, salons, barbers, car washes, home bakers, dog groomers and boba stands who want cheap paper loyalty cards, and for teachers and parents who want behavior, reading and chore cards.</p>
      <h2>Why we built it</h2>
      <p>Most punch card templates online are single images or documents that you have to copy, line up and number yourself, and most design editors want an account and make one card at a time. PunchPerk fills the gap: you design a card once, and get a PDF with 10 real business-card-size cards per sheet, optional serial numbers and matching backs that line up when printed two-sided.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free, with no account and no paid tier. Each printed sheet has a small “Made with PunchPerk” line in the bottom margin, outside the cards and the crop marks. It never appears on a card or in the PNG image. That's how other business owners find the tool.</p>
      <h2>How it works</h2>
      <p>Everything runs in your browser. PDFs are built on your device with the open-source <a href="https://github.com/Hopding/pdf-lib" rel="noopener">pdf-lib</a> library, the QR code on the back is made with the open-source qrcode-generator library, and your settings and logo are kept in your browser's local storage. Nothing you type is uploaded.</p>
      <p>PunchPerk is independent and isn't affiliated with Avery, Canva, Microsoft, Google, Apple or any print shop. Where we say a layout is compatible with common business card sheets, we mean the card size and margins match. Our guides are general information, not legal, tax or accounting advice.</p>
      <p>Looking for gift certificates? Try <a href="https://giftcert.roohsites.com/">GiftStub</a>, which prints numbered gift certificates with matching stubs.</p>`,
});
P.push({
  path: "/privacy", crumb: "Privacy & Terms",
  title: "Privacy & Terms: Your Punch Cards Never Leave Your Device",
  desc: "How PunchPerk handles your data: card text, logos and settings are processed and stored on your device and never uploaded. Cookie-free analytics.",
  h1: "Privacy & Terms",
  lead: "Short version: your cards, logo and settings never leave your device.",
  noRelated: true, note: "",
  body: `      <h2>Privacy</h2>
      <p>PunchPerk runs entirely in your browser. Card wording, serial numbers, logos and QR links are processed on your device to build the preview, the PDF, the PNG and the alignment test. They are never sent to our servers or to anyone else.</p>
      <p>To save you retyping, the tool remembers your last card and your logo in this browser's local storage. Clearing your browser's site data deletes it, and the <em>Reset</em> button clears it too. A very large logo is used for the visit but not saved.</p>
      <p>We use two privacy-friendly analytics services, Vercel Web Analytics and Umami, to count page views and a few anonymous events, such as “PDF downloaded” with the sheet layout and number of cards. Neither uses cookies or tracks you across sites, and neither ever receives what you type into the tool.</p>
      <h2>Terms</h2>
      <p>PunchPerk is provided “as is”, without warranty. Check a test print before you print a full run. You are responsible for the cards you issue, the promises written on them and following the rules that apply to your business, including any rules on loyalty program expiry and terms. Serial numbers and staff initials help you track cards but are not fraud-proof. PunchPerk is free for personal and commercial use.</p>
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
  console.log(`${p.path.padEnd(44)} title ${p.title.length} desc ${p.desc.length} words ${words}`);
}
console.log(`wrote ${count} pages`);
