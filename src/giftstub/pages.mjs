// Generates every GiftStub page (home, landing pages, guide, about, privacy) from one layout.
// Usage: node src/giftstub/pages.mjs   (writes into sites/giftstub/)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/giftstub");
const C = createRequire(import.meta.url)(join(OUT, "core.js"));
const URL = "https://giftcert.roohsites.com";
const NAME = "GiftStub";
const ACCENT = "#881337";
const DATE = "2026-10-16", DATE_H = "16 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const LEGAL = "Gift certificate expiry and fee rules vary by country and US state (US federal law limits expiry on many gift certificates). Check your local rules.";

// Sizes straight from the layout engine, so the copy always matches the PDF.
const size = paper => {
  const g = C.sheetGeometry(paper);
  const { s } = C.normalize({ paper });
  const stub = C.layoutCert(s, g.cellW, g.cellH).stubW;
  const inch = v => (v / 72).toFixed(2).replace(/0$/, "");
  const mm = v => Math.round(v / 72 * 25.4);
  return { piece: `${inch(g.cellW)} × ${inch(g.cellH)} in`, pieceMm: `${mm(g.cellW)} × ${mm(g.cellH)} mm`, stub: `${inch(stub)} in`, stubMm: `${mm(stub)} mm`, cert: `${inch(g.cellW - stub)} × ${inch(g.cellH)} in`, certMm: `${mm(g.cellW - stub)} × ${mm(g.cellH)} mm` };
};
const L = size("letter"), A = size("a4");

const FOOT = `  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">Numbered gift certificate maker</a></li><li><a href="/gift-certificate-template-with-stub">Template with stub</a></li><li><a href="/how-to-track-gift-certificates">How to track gift certificates</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Templates</h4><ul><li><a href="/salon-gift-certificate-template">Salon gift certificates</a></li><li><a href="/massage-gift-certificate-template">Massage &amp; spa gift certificates</a></li><li><a href="/photography-gift-certificate-template">Photography gift certificates</a></li><li><a href="/christmas-gift-certificate-template">Christmas gift certificates</a></li></ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. ${NAME} is an independent tool, not affiliated with Canva, Microsoft, Google, Apple or any print shop or payment provider.</p>
  </footer>`;

const RELATED = `      <h2>More templates and guides</h2>
      <ul class="related">
        <li><a href="/">Printable gift certificates with numbers</a></li>
        <li><a href="/gift-certificate-template-with-stub">Template with stub</a></li>
        <li><a href="/salon-gift-certificate-template">Salon</a></li>
        <li><a href="/massage-gift-certificate-template">Massage &amp; spa</a></li>
        <li><a href="/photography-gift-certificate-template">Photography</a></li>
        <li><a href="/christmas-gift-certificate-template">Christmas</a></li>
        <li><a href="/how-to-track-gift-certificates">How to track gift certificates</a></li>
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
const FEATURES = ["Matching numbers on certificate and stub", "Prefix, start number and zero padding", "Up to 500 certificates per PDF", "3 per page on US Letter or A4", "Classic, modern and minimal designs", "Optional logo, To/From lines and expiry date", "PNG image for emailing", "Issue log CSV and a browser-only redeem log"];
const appLd = (name, path, desc) => ({
  "@type": "WebApplication", name, url: URL + path, description: desc, applicationCategory: "BusinessApplication",
  operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: FEATURES,
  publisher: PUBLISHER,
});
const howToLd = (name, steps) => ({ "@type": "HowTo", name, totalTime: "PT10M", step: steps.map(([n, t]) => ({ "@type": "HowToStep", name: n, text: strip(t) })) });
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
    ? `<a href="#how">How it works</a><a href="/how-to-track-gift-certificates">Tracking</a><a href="#faq">FAQ</a>`
    : `<a href="/">Certificate maker</a><a href="/how-to-track-gift-certificates">Tracking</a><a href="/about">About</a>`;
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
${quick ? `    <div class="content narrow quick"><p class="tldr"><strong>Quick answer:</strong> ${quick}</p></div>\n` : ""}${tool ? `    <section class="tool card" aria-label="Gift certificate maker"><div id="gs-tool"${toolAttr}></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? faqHtml(faq) + "\n" : ""}${noRelated ? "" : RELATED + "\n"}${updated(path === "/privacy" || path === "/about" ? "" : "General information, not legal or tax advice.")}
    </article>
  </main>
${FOOT}
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

/* ------------------------------------------------------------------ home */
const homeSteps = [
  ["Pick a preset", "Choose General, Salon, Massage &amp; spa, Photography, Bakery, Auto detailing or Holiday. Each one fills in sample wording, a colour and a design that you can change."],
  ["Write the certificate", "Type your business name, the headline, the value or service, a short terms line and your contact details. Add your logo if you have one. The preview updates as you type."],
  ["Set the numbering", "Enter a prefix such as GC-, the first number and how many you need (up to 500). Zero padding keeps every number the same width, so GC-0007 sorts before GC-0010."],
  ["Choose paper and design", "Pick US Letter or A4, then Classic border, Modern or Minimal. Every design also prints clearly in black and white."],
  ["Download, print and log", "Download the PDF and print it at 100% (Actual size). Cut on the marks, tear or fold the stub on the dashed line, then add the numbers to the issue log or download the log CSV."],
];
const homeFaq = [
  ["Is GiftStub free?", "Yes. Every feature is free, with no account, no watermark on the certificates and no limit on how often you use it. Each printed sheet has a small “Made with GiftStub” line in the bottom page margin, outside every certificate and cut line, so the certificates you hand out stay clean."],
  ["Will the stub always have the same number as the certificate?", "Yes. The stub number and the certificate number are drawn from the same counter in one pass, so they can't drift apart the way hand-typed numbers can. The automated tests behind the tool check this for every position on every sheet."],
  ["How many gift certificates can I make at once?", "Up to 500 in one PDF, which is 167 sheets at 3 per page. For more, make a second batch that starts where the first one ended, for example at 501."],
  ["What paper should I print gift certificates on?", "Plain paper is fine for a test sheet. For the real thing, use a cardstock your printer can feed, such as 65 lb or 80 lb cover (about 176 to 216 gsm). Check your printer's manual for the heaviest paper it accepts."],
  ["Can I email a gift certificate instead of printing it?", "Yes. Type the number you're selling into <em>Number on the image</em> and click <em>Certificate image</em>. You get a PNG of that one certificate, without the stub, sized for email or a text message. Log the number so you know it has been issued."],
  ["How do I keep track of which certificates were sold and redeemed?", "Download the issue log CSV for a spreadsheet, or use the issue and redeem log under the tool. That log is stored only in this browser, so export it as a CSV regularly. The <a href=\"/how-to-track-gift-certificates\">tracking guide</a> explains a simple routine."],
  ["Do gift certificates need an expiry date?", `The expiry date is off by default, and you can switch it on near the bottom of the form. ${LEGAL}`],
  ["Is my information uploaded anywhere?", "No. Certificates, logos and the log are made and kept on your device. The PDF is built in your browser and nothing you type is sent to a server."],
];
const home = {
  path: "/",
  title: "Printable Gift Certificates with Numbers — Free | GiftStub",
  desc: "Make printable gift certificates with matching numbered stubs, 3 per page on Letter or A4. Free PDF, PNG for email and an issue log. No signup, no uploads.",
  h1: "Printable Gift Certificates with Numbers",
  lead: "Design your certificate once and print a whole numbered run, each with a stub that carries the same number. Free, no signup, and nothing leaves your browser.",
  quick: "To make printable gift certificates with numbers, pick a preset below, type your business name, value and terms, set a prefix and start number (for example GC- and 1), choose how many you need (up to 500) and click <em>Download PDF</em>. Each US Letter or A4 page holds 3 certificates, and each stub repeats the number with blank Issued to, Date, Amount and Redeemed lines.",
  badges: ["100% free", "Matching numbered stubs", "Up to 500 per PDF", "Letter &amp; A4"],
  tool: { preset: "" },
  schema: [appLd(NAME, "/", "Free numbered gift certificate maker. Print gift certificates with matching numbered stubs, 3 per page on US Letter or A4, download a PNG for email and keep an issue log."), howToLd("How to print numbered gift certificates with stubs", homeSteps)],
  faq: homeFaq,
  body: `      <h2 id="how">How to make numbered gift certificates in 5 steps</h2>
${stepsHtml(homeSteps)}

      <h2>Why number your gift certificates?</h2>
      <p>A gift certificate is a promise to provide something later, often to a person you haven't met. A number turns each one into a record you can look up. When a customer hands one over, you can check the number against your stub or log, see whether it was already used, and see what it was sold for.</p>
      <p>Numbers also make the end of the season easier. You can count how many certificates went out, how many came back, and which ones are still outstanding, without guessing from a pile of paper. A number doesn't make a certificate impossible to copy, but it means a copy with a number that's already marked redeemed stands out.</p>

      <h2>What the stub is for</h2>
      <p>The stub sits on the left of each certificate, behind a dashed tear line. It repeats the certificate number and has four blank lines: <strong>Issued to</strong>, <strong>Date</strong>, <strong>Amount</strong> and <strong>Redeemed</strong>. When you sell a certificate, fill in the stub, tear it off and keep it. The customer gets the certificate; you keep a paper record with the same number. When the certificate comes back, find the stub and write the redemption date on it.</p>
      <p>Keep stubs in number order in an envelope, a recipe box or a small binder at the counter. If you also use the <a href="/how-to-track-gift-certificates">issue and redeem log</a>, the stubs are your paper backup.</p>

      <h2>Sizes on US Letter and A4</h2>
      <p>Each page holds three certificates stacked in portrait orientation, with cut marks in the margins and at least half an inch of white space around the edge, so home printers don't clip anything.</p>
      <table>
        <thead><tr><th></th><th>US Letter</th><th>A4</th></tr></thead>
        <tbody>
          <tr><td>Whole piece (stub + certificate)</td><td>${L.piece}</td><td>${A.pieceMm}</td></tr>
          <tr><td>Stub width</td><td>${L.stub}</td><td>${A.stubMm}</td></tr>
          <tr><td>Certificate after tearing off the stub</td><td>${L.cert}</td><td>${A.certMm}</td></tr>
        </tbody>
      </table>
      <p>The certificate part is a little smaller than a standard #10 business envelope, so it slips in without folding.</p>

      <h2>Choosing a design</h2>
      <div class="cards">
        <div class="card"><h3>Classic border</h3><p>A double frame, a serif headline and centred text. Suits salons, spas, bakeries and anything that's meant to feel like a gift.</p></div>
        <div class="card"><h3>Modern</h3><p>Bold sans-serif type, left-aligned, with a colour bar on the right edge. Suits auto detailers, studios and trades.</p></div>
        <div class="card"><h3>Minimal</h3><p>Black ink only and thin rules. The cheapest to print and the best choice for coloured or patterned paper.</p></div>
      </div>
      <p>All three designs use dark accent colours that turn into clear greys on a black-and-white printer. If you pick a very light colour, the tool darkens it slightly so the text stays readable on white paper.</p>

      <h2>Printing and cutting tips</h2>
      <ul>
        <li><strong>Print a test page first</strong> on plain paper at 100% / Actual size. If your print dialog says Fit to page or Shrink oversized pages, the certificates will come out smaller and the cut marks won't line up.</li>
        <li><strong>Use cardstock for the real run.</strong> Certificates on heavier paper feel like a gift and survive a wallet. Feed one sheet first to check your printer handles it.</li>
        <li><strong>Cut with a paper trimmer</strong> along the outer cut marks, then between the three pieces. Neighbouring certificates share a cut line, so one cut separates two.</li>
        <li><strong>Make the stub easy to tear.</strong> Fold back and forth along the dashed line a few times, or run a perforating blade along it if you have one.</li>
      </ul>

      <h2>Digital gift certificates</h2>
      <p>Not every gift is handed over in person. The <em>Certificate image</em> button saves one certificate as a PNG without the stub, at twice screen resolution, ready to attach to an email or a text. Type the number you're selling into <em>Number on the image</em> first, then log that number as issued so it can't be sold twice by mistake.</p>

      <h2>Track what you sell and redeem</h2>
      <p>Below the tool there's a simple issue and redeem log. Add the numbers you printed, log a sale with the buyer's name and amount, and click <em>Mark redeemed</em> when a certificate comes back. You can search by number and export or import the log as a CSV that opens in any spreadsheet app. The log is stored only in this browser, so export it regularly as a backup.</p>
      <p>Prefer a spreadsheet from the start? <em>Issue log CSV</em> downloads one row per printed number with empty columns for status, who it was issued to, amount, issue date, redemption date and notes.</p>

      <h2>Ideas by type of business</h2>
      <ul>
        <li><a href="/salon-gift-certificate-template">Salon gift certificates</a>: dollar amounts or named services, plus booking notes.</li>
        <li><a href="/massage-gift-certificate-template">Massage and spa gift certificates</a>: session length, cancellation policy and packages.</li>
        <li><a href="/photography-gift-certificate-template">Photography gift certificates</a>: session type, edited images and booking windows.</li>
        <li><a href="/christmas-gift-certificate-template">Christmas gift certificates</a>: holiday wording and a separate prefix for the season.</li>
        <li>Bakeries and auto detailers have presets in the tool too. Bakery wording covers order notice for custom cakes, and detailing wording covers appointments and vehicle size.</li>
      </ul>`,
};

/* ---------------------------------------------------------- landing pages */
const P = [];

P.push({
  path: "/gift-certificate-template-with-stub", crumb: "Template with stub",
  title: "Gift Certificate Template with Stub — Free Numbered PDF",
  desc: "Free gift certificate template with a numbered stub: matching numbers, Issued to, Date, Amount and Redeemed lines, 3 per page. Edit online, download a PDF.",
  h1: "Gift Certificate Template with Stub",
  lead: "Every certificate comes with a tear-off stub carrying the same number, so you keep a paper record of each one you sell.",
  quick: "This template prints 3 gift certificates per US Letter or A4 page. Each has a stub on the left, behind a dashed tear line, that repeats the certificate number and has blank Issued to, Date, Amount and Redeemed lines. Edit the wording above, set your numbers and download the PDF.",
  tool: { preset: "general" },
  faq: [
    ["Why does the stub have the same number as the certificate?", "So you can match them later. When a customer brings the certificate back, you look up the stub with the same number to see who bought it, when and for how much, and whether it has already been used."],
    ["Can I print the certificates without a stub?", "The PDF always includes the stub, because that is what keeps your record. If you don't want it, cut along the dashed line instead of tearing. For emailed certificates, the PNG image leaves the stub off automatically."],
    ["How do I make the stub tear cleanly?", "Fold along the dashed line, crease it with a fingernail or a ruler, and fold it the other way. Repeat once or twice and the stub tears off neatly. A rotary trimmer with a perforating blade makes a true perforation."],
    ["What should I do with the stubs?", "Keep them in number order in one place, such as an envelope or small box at the counter. Write the redemption date on the stub when the certificate is used, and keep finished batches with your records for the year."],
  ],
  body: `      <h2>What's on the stub</h2>
      <p>The stub takes up about the left ${Math.round(C.STUB_PCT)}% of each piece: ${L.stub} wide on US Letter and ${A.stubMm} on A4. From the top down it shows:</p>
      <ul>
        <li><strong>Certificate number</strong> in large type, identical to the number on the certificate itself, including the prefix and zero padding.</li>
        <li><strong>Issued to</strong>: the buyer, the recipient, or both.</li>
        <li><strong>Date</strong>: the day you sold or gave the certificate.</li>
        <li><strong>Amount</strong>: what the customer paid, which is handy when the certificate names a service rather than a dollar value.</li>
        <li><strong>Redeemed</strong>: the date it came back, and your initials if several people work the counter.</li>
      </ul>

      <h2>Why a stub beats a notebook</h2>
      <p>Many small businesses keep gift certificate sales in a notebook by the till. That works until someone forgets to write one down. A stub is attached to the certificate until the moment of sale, so the record is created by the act of selling: you can't hand over the certificate without having the stub in your hand. If a stub is missing from your box, you know a certificate went out without being logged.</p>
      <p>The stub also travels with the number, not with the person who sold it. Whoever is at the counter when the certificate comes back can find the matching stub, without needing to read someone else's handwriting in a ledger.</p>

      <h2>How the numbering works</h2>
      <p>You choose a prefix, a start number, how many certificates to print and how many digits to pad to. With prefix <code>GC-</code>, start 1 and four digits, the run reads GC-0001, GC-0002 and so on. Both the certificate and its stub are filled from the same counter in a single pass, so they always agree.</p>
      <p>When you print another batch later, start where the last one ended. If your first run was GC-0001 to GC-0030, start the next at 31. A different prefix per year or per promotion, such as <code>HOL-</code> for holiday sales, keeps batches apart.</p>

      <h2>Layout and cutting</h2>
      <p>Three pieces are stacked on a portrait page, each ${L.piece} on US Letter (${A.pieceMm} on A4). Short cut marks in the margins show where to trim, and neighbouring pieces share a cut line. After you trim the page and tear off the stub, the certificate part measures ${L.cert} (${A.certMm} on A4).</p>
      <p>Print at 100% or Actual size. Scaling the page to fit moves everything slightly and the cut marks will no longer meet the edges of the certificates.</p>

      <h2>Template versus a generator</h2>
      <p>A typical downloadable template shows one design with a sample number such as 0001, and you have to retype the number on every copy or set up a mail merge. A generator does the counting for you. Here the template is the design you set up in the form, and the generator turns it into as many numbered copies as you need, up to 500 per PDF.</p>`,
});

P.push({
  path: "/salon-gift-certificate-template", crumb: "Salon gift certificate template",
  title: "Salon Gift Certificate Template — Printable & Numbered",
  desc: "Free printable salon gift certificate template with numbered stubs. Add your salon name, logo, a dollar amount or service and booking notes. 3 per page.",
  h1: "Salon Gift Certificate Template",
  lead: "Hair, nail and beauty salons: print numbered gift certificates with your name and logo, and keep a stub for every one you sell.",
  quick: "The Salon preset above starts you with salon wording. Replace the sample name with your salon's, choose a dollar amount or a named service, add your booking line and download numbered certificates, 3 per page, each with a matching stub for the front desk.",
  tool: { preset: "salon" },
  faq: [
    ["Should a salon gift certificate include the tip?", "That's your choice, so say it on the certificate. A short terms line such as “Gratuity not included” or “Includes a 20% gratuity for your stylist” saves an awkward moment at checkout."],
    ["Can clients use a salon gift certificate for retail products?", "Only if you allow it. If you do, “toward any service or retail purchase” in the value line makes that clear. If not, list the services it covers in the terms line."],
    ["What if the service costs less than the certificate?", "Decide on a policy before you sell any. Some salons keep the remaining balance on file and note it in the log; others issue a new numbered certificate for the balance and write both numbers in the notes."],
    ["Can I add my salon's logo?", "Yes. Open the Paper, design and logo section and choose a PNG, JPG or SVG file. The logo prints in the top-left corner of every certificate and stays in your browser."],
  ],
  body: `      <h2>What to put on a salon gift certificate</h2>
      <ul>
        <li><strong>Your salon name and logo</strong>, so the certificate is recognisable in a drawer months later.</li>
        <li><strong>A value or a service.</strong> For example “$75 toward any salon service” or “Signature cut and blow-dry”.</li>
        <li><strong>To and From lines</strong> for the giver to fill in, or type the names if you're making one for a specific client.</li>
        <li><strong>Terms</strong> in one short line: which services it covers, whether gratuity is included, and that it isn't redeemable for cash.</li>
        <li><strong>How to book</strong>: phone number, booking page and address on the contact line.</li>
      </ul>

      <h2>Dollar amount or named service?</h2>
      <p>A dollar amount is the flexible choice when stylists at different levels charge different prices, or when the recipient might want colour instead of a cut. It also makes it easy to sell certificates at whatever price the buyer has in mind.</p>
      <p>A named service feels more like a present (“a manicure and pedicure” reads better in a card than “$65”) and suits packages such as a blowout series or a bridal trial. Keep in mind that the certificate promises that service, so if your prices go up before it's used, you provide the service as written. Fill in the <em>Amount</em> line on the stub with what the client actually paid.</p>

      <h2>Wording ideas for salons</h2>
      <ul>
        <li>“Treat yourself: $50 toward any hair or nail service”</li>
        <li>“One gel manicure with any nail technician”</li>
        <li>“Cut, colour and style with Maria”</li>
        <li>Terms: “Please mention this certificate when booking. Gratuity not included.”</li>
      </ul>

      <h2>Running it at the front desk</h2>
      <p>Keep a small stack of printed certificates at reception with the stubs still attached. When a client buys one, fill in the stub, tear it off and file it in number order. If several people work the desk, ask everyone to initial the Redeemed line when a certificate comes back, so you know who checked it.</p>
      <p>If your booking or point-of-sale system has its own gift card feature, printed certificates still work well for walk-in gifting and holiday displays. Type the certificate number into the appointment notes when it's redeemed so both records match.</p>

      <h2>Printing for a salon</h2>
      <p>The Salon preset uses the Modern design with a raspberry accent, but Classic border suits a traditional salon and Minimal suits a monochrome brand. Print on white or cream cardstock and slip each certificate into a small envelope with your business card. Each certificate is ${L.cert} after the stub is removed (${A.certMm} on A4).</p>
      <p>Before the holidays, Mother's Day and Valentine's Day, print a batch with its own prefix so you can see afterwards how many sold in that season.</p>`,
});

P.push({
  path: "/massage-gift-certificate-template", crumb: "Massage gift certificate template",
  title: "Massage Gift Certificate Template — Free Printable PDF",
  desc: "Free massage gift certificate template for therapists and spas: session length, cancellation policy and booking line, numbered stubs, 3 per page as a PDF.",
  h1: "Massage Gift Certificate Template",
  lead: "For massage therapists, day spas and wellness studios: numbered certificates with the session spelled out and a stub you keep.",
  quick: "Start from the Massage &amp; spa preset above. Replace the sample spa name with yours, state the session (for example “One 60-minute massage”), add your booking and cancellation line, and download numbered certificates with matching stubs, 3 per page.",
  tool: { preset: "massage" },
  faq: [
    ["Can I sell a package of several massages?", "Yes. Print one certificate per session with consecutive numbers, for example three certificates for a series of three. Each visit then has its own number and stub, and you can mark each one redeemed separately."],
    ["Should I put my cancellation policy on the certificate?", "A short version helps, such as “24-hour cancellation policy applies”. The terms line has room for about two lines of small text, so keep the full policy on your website and point to it."],
    ["Can I send a massage gift certificate by email?", "Yes. Enter the number in Number on the image and click Certificate image to save a PNG without the stub. Attach it to an email, then log the number as issued."],
    ["What if a client loses their certificate?", "Whether you replace it is up to your policy. The number lets you check the log or stub to see whether that certificate has already been redeemed before you decide."],
  ],
  body: `      <h2>What to put on a massage gift certificate</h2>
      <ul>
        <li><strong>The session</strong>: length and type, such as “One 60-minute Swedish massage” or “90-minute deep tissue massage”.</li>
        <li><strong>What's included</strong>: if add-ons like hot stones, aromatherapy or CBD oil are extra, say so in the terms line.</li>
        <li><strong>Booking instructions</strong>: “Call or book online and mention your certificate number.”</li>
        <li><strong>Cancellation policy</strong> in a few words, and whether gratuity is included.</li>
        <li><strong>Your therapist name</strong> if you work alone, so the recipient knows who they'll see.</li>
      </ul>

      <h2>Session certificates and price changes</h2>
      <p>A certificate for “one 60-minute massage” promises the session, not a dollar amount. If your rates go up before the recipient books, the certificate still covers a full hour. Many therapists prefer this because it reads as a real gift. If you'd rather cap the value, write an amount instead (“$95 toward any massage or spa service”) and the recipient pays any difference.</p>
      <p>Whichever you choose, write the amount actually paid on the stub. That's the figure you need when you reconcile at the end of the month.</p>

      <h2>Packages and couples sessions</h2>
      <p>For a series of sessions, give each session its own certificate with consecutive numbers and staple or clip them together. Each visit is redeemed and logged separately, so there's no confusion about how many are left. For a couples massage, one certificate that names the couples session is usually clearer than two separate ones.</p>

      <h2>Wording ideas</h2>
      <ul>
        <li>“Relax and unwind: one 60-minute massage of your choice”</li>
        <li>“Spa afternoon: 60-minute massage and express facial”</li>
        <li>“$100 toward any massage, facial or body treatment”</li>
        <li>Terms: “By appointment only. Please arrive 10 minutes early. 24-hour cancellation policy applies.”</li>
      </ul>

      <h2>A simple routine for a small practice</h2>
      <p>If you work alone, the paperwork has to be quick. Print a batch of ten or twenty, keep them in a folder with the stubs attached, and tear off the stub when you sell one. Add the number to the issue and redeem log under the tool with the buyer's name, and mark it redeemed after the session. Export the log CSV at the end of each month and save it with your other records.</p>
      <p>The Massage &amp; spa preset uses the Classic border design in teal, which prints as a soft grey in black and white. Cream or pale green cardstock suits it well.</p>`,
});

P.push({
  path: "/photography-gift-certificate-template", crumb: "Photography gift certificate template",
  title: "Photography Gift Certificate Template — Free Printable",
  desc: "Free photography gift certificate template: session type, edited images, booking window and a numbered stub. Print 3 per page or save a PNG to email.",
  h1: "Photography Gift Certificate Template",
  lead: "Portrait, family and pet photographers: sell sessions as numbered gift certificates and keep track of every one.",
  quick: "Use the Photography preset above: type your studio name, the session you're offering (for example “One 1-hour portrait session”), what's included and how to book, then download numbered certificates with matching stubs, or save one as a PNG to email.",
  tool: { preset: "photography" },
  faq: [
    ["Should a photography gift certificate cover prints?", "Say exactly what's included, such as a number of edited digital images, and whether prints, albums or extra images cost more. The terms line is the place for it."],
    ["Can I donate a gift certificate to a charity auction?", "Yes. Print one, write “Donated to” and the event in the Issued to line of the stub, and add the same note in the log. You'll recognise the number when the winner books."],
    ["How do I make just one certificate?", "Set Quantity to 1 and the start number to the next number in your sequence. The PDF will have a single certificate on one page. For email, use Certificate image instead."],
    ["Does the Minimal design work on coloured paper?", "Yes. Minimal prints in black ink only, so it reads well on cream, kraft or pale coloured cardstock."],
  ],
  body: `      <h2>What to put on a photography gift certificate</h2>
      <ul>
        <li><strong>Session type and length</strong>: portrait, family, newborn, pet, headshot or mini session, and how long it lasts.</li>
        <li><strong>What's included</strong>: the number of edited digital images, an online gallery, or a print credit.</li>
        <li><strong>Where</strong>: studio, a choice of outdoor locations, or travel within a certain distance.</li>
        <li><strong>Booking window</strong>: how far ahead to book, and whether certain dates (such as holiday mini sessions) are excluded.</li>
        <li><strong>Contact</strong>: email or booking page, plus phone.</li>
      </ul>

      <h2>Session or credit?</h2>
      <p>A named session (“one family session with 20 edited images”) is easy to give and easy to redeem, because the recipient knows exactly what they're getting. A credit (“$150 toward any session or print order”) suits clients who already work with you and want to choose later. If you offer both, use a different prefix for each, such as <code>SES-</code> and <code>CR-</code>, so your log shows which kind came back.</p>

      <h2>Mini sessions and seasonal offers</h2>
      <p>Photographers often sell short sessions on a few set dates, such as autumn or holiday minis. Gift certificates for those should name the dates, or say “valid for any mini session date in” followed by the season. When the dates are fixed, keep the batch small and number it separately so you can see at a glance how many slots are spoken for.</p>

      <h2>Wording ideas</h2>
      <ul>
        <li>“One 1-hour portrait session with 15 edited images”</li>
        <li>“Family session at the location of your choice within 20 miles”</li>
        <li>“Pet portrait mini session: 20 minutes, 5 edited images”</li>
        <li>Terms: “Book at least two weeks ahead. Prints and albums are extra.”</li>
      </ul>

      <h2>Printed or digital</h2>
      <p>Printed certificates in an envelope make a good wrapped gift, and the stub gives you a paper record. Many clients, though, buy at the last minute and want something they can forward. The <em>Certificate image</em> button saves a single certificate as a PNG, without the stub, with your logo and the number you choose. Log that number straight away so it can't be issued twice.</p>
      <p>The Photography preset uses the Minimal design in slate, which keeps the focus on your logo and prints well in black ink. Classic border suits wedding and boudoir studios that use a more formal style.</p>

      <h2>Keeping track</h2>
      <p>Sessions are often booked months after a certificate is sold. When the client gets in touch, ask for the number, check the log, and add it to the booking notes. Mark it redeemed on the day of the session, not the day it was booked, so your outstanding list stays accurate.</p>`,
});

P.push({
  path: "/christmas-gift-certificate-template", crumb: "Christmas gift certificate template",
  title: "Christmas Gift Certificate Template — Printable, Numbered",
  desc: "Free Christmas gift certificate template with holiday wording, numbered stubs and 3 per page on Letter or A4. Print a batch or email a PNG last minute.",
  h1: "Christmas Gift Certificate Template",
  lead: "Holiday gift certificates for small businesses: festive wording, numbered stubs and a quick PNG for last-minute shoppers.",
  quick: "The Holiday preset above sets the headline to “Holiday Gift Certificate” in red with seasonal wording. Change the headline to “Christmas Gift Certificate” if you prefer, add your business name and value, use a holiday prefix such as HOL-, and download numbered certificates with stubs.",
  tool: { preset: "holiday" },
  faq: [
    ["Can I change “Holiday” to “Christmas”?", "Yes. Edit the Headline field. “Christmas Gift Certificate” fits on one line in every design."],
    ["How many holiday gift certificates should I print?", "Print a modest first batch. If you run low, make another batch that starts at the next number, so the sequence continues without gaps or repeats."],
    ["Can I print on red, green or patterned paper?", "Choose the Minimal design, which uses black ink only and stays readable on coloured stock. Print one test sheet first to check contrast."],
    ["What's the quickest option for a last-minute gift?", "Type the next unused number into Number on the image, click Certificate image and email the PNG. Log the number as issued straight away."],
  ],
  body: `      <h2>Holiday wording ideas</h2>
      <ul>
        <li>Headline: “Christmas Gift Certificate”, “Holiday Gift Certificate” or “Season's Greetings”.</li>
        <li>Value: “$50 toward any service or purchase”, “One holiday blowout and style” or “A dozen festive cupcakes”.</li>
        <li>Terms: “Wishing you a happy holiday season! Not redeemable for cash.”</li>
        <li>Contact: add your holiday hours if they change, for example “Open until 8 pm through December 23”.</li>
      </ul>

      <h2>Plan the holiday run</h2>
      <p>Holiday sales come in bursts, often in the last two weeks before Christmas. Print certificates early in November so you're not cutting paper during your busiest days. Use a separate prefix such as <code>HOL-</code> or <code>XMAS-</code> so holiday certificates are easy to tell apart from the rest of the year when they come back in January and February.</p>
      <p>Decide on a few standard values in advance (for example $25, $50 and $100) and pre-print a small stack of each with the value on the certificate. Or leave the value general and write the amount on the stub when you sell.</p>

      <h2>Presenting holiday certificates</h2>
      <p>The certificate part is ${L.cert} (${A.certMm} on A4) once the stub is torn off, so it fits a standard business envelope without folding. A red or green envelope, a sticker with your logo, or a ribbon turns it into a ready-to-give present. Displaying a few filled envelopes by the till reminds customers they exist.</p>
      <p>The Holiday preset uses the Classic border design in red. In black and white it prints as a mid grey, so it still looks finished if you run out of colour ink in December.</p>

      <h2>Last-minute and online sales</h2>
      <p>Customers who remember on December 23rd will often ask if you can email something. Use <em>Certificate image</em> to save one certificate as a PNG with the number of your choice, then send it. Because it carries a number like the printed ones, it goes in the same log and is redeemed the same way.</p>

      <h2>After the holidays</h2>
      <p>Most holiday certificates come back in the new year. Keep the stubs together, mark each certificate redeemed when it's used, and export the log CSV once a month. By spring you'll be able to see how many are still outstanding and plan staffing or stock for the visits still to come. The <a href="/how-to-track-gift-certificates">tracking guide</a> walks through a simple monthly check.</p>

      <h2>Beyond Christmas</h2>
      <p>The same preset works for Hanukkah, New Year, Valentine's Day, Mother's Day and Father's Day. Change the headline and the terms line, keep your colours, and give each occasion its own prefix such as <code>VAL-</code> or <code>MOM-</code>. Over a year, the log then shows which occasions bring in gift certificate sales for your business.</p>`,
});

const trackSteps = [
  ["Number every certificate", "Print certificates with a unique number on both the certificate and its stub, for example GC-0001 to GC-0100."],
  ["Record each sale", "When you sell one, write the buyer or recipient, the date and the amount paid on the stub, and add the same details to your log."],
  ["Check the number at redemption", "When a certificate comes back, look the number up. If it's listed as issued and not yet redeemed, accept it."],
  ["Mark it redeemed", "Write the date on the stub and mark the number redeemed in the log, with a note if part of the value is left."],
  ["Reconcile and back up monthly", "Once a month, count issued and redeemed certificates, list the outstanding ones and save a copy of the log."],
];
P.push({
  path: "/how-to-track-gift-certificates", crumb: "How to track gift certificates",
  title: "How to Track Gift Certificates: Simple Log for Small Shops",
  desc: "How to track gift certificates in a small business: number them, log each sale, mark redemptions and reconcile monthly. Free issue and redeem log with CSV.",
  h1: "How to Track Gift Certificates",
  lead: "A plain routine for small businesses: numbered certificates, a stub for each sale and a log you check when certificates come back.",
  quick: "To track gift certificates, give each one a unique number, record every sale (number, buyer, date, amount), check the number when the certificate is redeemed and mark it used with the date. Keep the paper stubs, keep a spreadsheet or the log below, and back it up every month.",
  tool: { preset: "general" },
  schema: [howToLd("How to track gift certificates in a small business", trackSteps)],
  faq: [
    ["Where is the GiftStub log stored?", "Only in the browser you're using, in its local storage on this device. It isn't synced or backed up anywhere, and clearing your browser data erases it. Export the CSV regularly and keep the file somewhere safe."],
    ["Can two people share the log?", "Not directly, because it lives in one browser. Export the CSV from one device and import it on the other, or keep the CSV in a shared spreadsheet that everyone updates."],
    ["How do I handle a certificate that's only partly used?", "Mark it redeemed and note the remaining balance in the log or on the stub. Or issue a new numbered certificate for the balance and write both numbers in the notes so the trail is clear."],
    ["What if someone brings a number that isn't in the log?", "Check the paper stubs first, since a sale may not have been entered. If you still can't find it, ask when and where it was bought. A missing record usually means a gap in your routine, so it's worth tightening up."],
  ],
  body: `      <h2>The routine in five steps</h2>
${stepsHtml(trackSteps)}

      <h2>What to record</h2>
      <p>The log needs only a few columns. The issue log CSV from the tool uses these, so you can import it straight back later:</p>
      <table>
        <thead><tr><th>Column</th><th>What goes in it</th></tr></thead>
        <tbody>
          <tr><td>Number</td><td>The certificate number exactly as printed, such as GC-0007</td></tr>
          <tr><td>Status</td><td>Issued or redeemed</td></tr>
          <tr><td>Issued to</td><td>Buyer, recipient or both</td></tr>
          <tr><td>Amount</td><td>What was paid, or the service it covers</td></tr>
          <tr><td>Issued on / Redeemed on</td><td>Dates as YYYY-MM-DD, which sort correctly in any spreadsheet</td></tr>
          <tr><td>Notes</td><td>Remaining balance, who served the client, or a donation to an event</td></tr>
        </tbody>
      </table>

      <h2>Paper stubs plus a log</h2>
      <p>The stub and the log back each other up. The stub is created when the certificate is printed and is physically in your hand at the moment of sale, so it's hard to forget. The log is searchable and easy to total. When the two disagree, for example a torn-off stub with no log entry, you know exactly which sale to look into.</p>
      <p>File stubs in number order. When a certificate is redeemed, write the date on the stub and initial it. At the end of the year, the stubs for that batch go in an envelope with your other records.</p>

      <h2>Using the log in this tool</h2>
      <p>The issue and redeem log above is a convenience: a simple list stored only in this browser on this device. Click <em>Add … to the log</em> after printing a batch, log a sale with a name and amount, and click <em>Mark redeemed</em> when a certificate comes back. Search by number or name to find one quickly. <em>Undo</em> reverses a redemption made by mistake.</p>
      <p>Because the list lives in one browser, back it up. <em>Export log CSV</em> saves everything as a file that opens in Microsoft Excel, Google Sheets or Apple Numbers (GiftStub isn't affiliated with Microsoft, Google or Apple). <em>Import CSV</em> loads a file back in, matching rows by certificate number.</p>

      <h2>Monthly reconciliation</h2>
      <p>Once a month, take ten minutes to:</p>
      <ul>
        <li>Count certificates issued and redeemed that month, and the total still outstanding.</li>
        <li>Check that every torn-off stub has a log entry, and every log entry has a stub.</li>
        <li>Look for numbers redeemed twice or redeemed without being issued.</li>
        <li>Export the CSV and save it with the date in the file name.</li>
      </ul>
      <p>Outstanding certificates are services or goods you still owe. Ask your accountant how to record certificate sales and unredeemed balances in your books, since the treatment depends on where you are and how you keep accounts.</p>

      <h2>Common problems and simple fixes</h2>
      <ul>
        <li><strong>Two certificates with the same number.</strong> Always start a new batch where the last one ended, or use a new prefix.</li>
        <li><strong>Certificates sold but never logged.</strong> Make tearing off the stub part of the sale, and log from the stubs at the end of each day.</li>
        <li><strong>Partial redemptions.</strong> Note the balance, or replace the certificate with a new number for the balance.</li>
        <li><strong>A lost log.</strong> Export the CSV regularly; the stubs let you rebuild it if needed.</li>
      </ul>`,
});

/* ----------------------------------------------------------- about/privacy */
P.push({
  path: "/about", crumb: "About",
  title: "About GiftStub — Free Numbered Gift Certificate Maker",
  desc: "GiftStub is part of Rooh Sites' free tools: small, private web tools that run in your browser. Who makes it, why it's free and how it handles your data.",
  h1: "About GiftStub",
  lead: "A small, free tool that does one job: printable gift certificates with numbers that match their stubs.",
  body: `      <p>GiftStub is part of <a href="https://roohsites.com/">Rooh Sites</a>' collection of free single-purpose web tools. It's built for small businesses that sell gift certificates over the counter: salons, massage therapists and spas, photographers, home bakers, auto detailers, groomers, tutors and anyone else who wants a tidy, numbered certificate without paying a print shop.</p>
      <h2>Why we built it</h2>
      <p>Design apps make attractive certificates, but they don't number them, so every copy has to be edited by hand. Print shops number and perforate, at a price and with a wait. GiftStub fills the gap: you design a certificate once, choose a number range, and get a PDF where every certificate and its stub carry the same number.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free, with no account and no paid tier. Each printed sheet has a small “Made with GiftStub” line in the bottom margin, outside the certificates, and the PNG image has the same line along its bottom edge. That's how other business owners find the tool.</p>
      <h2>How it works</h2>
      <p>Everything runs in your browser. PDFs are built on your device with the open-source <a href="https://github.com/Hopding/pdf-lib" rel="noopener">pdf-lib</a> library, and the issue log is kept in your browser's local storage. Nothing you type is uploaded.</p>
      <p>GiftStub is independent and isn't affiliated with Canva, Microsoft, Google, Apple or any print shop. Our guides are general information, not legal, tax or accounting advice.</p>`,
});
P.push({
  path: "/privacy", crumb: "Privacy & Terms",
  title: "Privacy & Terms: Your Certificates Never Leave Your Device",
  desc: "How GiftStub handles your data: certificates, logos and the issue log are processed and stored on your device and never uploaded. Cookie-free analytics.",
  h1: "Privacy & Terms",
  lead: "Short version: your certificates, logo and log never leave your device.",
  noRelated: true,
  body: `      <h2>Privacy</h2>
      <p>GiftStub runs entirely in your browser. Certificate wording, numbers, logos and log entries are processed on your device to build the preview, the PDF, the PNG and the CSV files. They are never sent to our servers or to anyone else.</p>
      <p>To save you retyping, the tool remembers your last certificate and your logo in this browser's local storage. The issue and redeem log is stored there too. Clearing your browser's site data deletes all of it, so export the log CSV if you want to keep it.</p>
      <p>We use Vercel Web Analytics to count page views and a few anonymous events, such as “PDF downloaded” with a rough size bucket. It's cookie-free, doesn't track you across sites and never receives what you type into the tool.</p>
      <h2>Terms</h2>
      <p>GiftStub is provided “as is”, without warranty. Check your certificates before printing a full run. You're responsible for the certificates you issue, the promises written on them and following the rules that apply to your business. GiftStub is free for personal and commercial use.</p>
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
console.log(`wrote ${count} pages`);
