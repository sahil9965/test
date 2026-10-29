// Generates every PriceBoard page (home, landing pages, guide, about, privacy) from one layout.
// Usage: node src/priceboard/pages.mjs   (writes into sites/priceboard/)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/priceboard");
const C = createRequire(import.meta.url)(join(OUT, "core.js"));
const URL = "https://pricelist.roohsites.com";
const NAME = "PriceBoard";
const ACCENT = "#8e3b5f";
const DATE = "2026-10-29", DATE_H = "29 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

// Limits and sizes straight from the layout engine, so the copy always matches the tool.
const FMT = C.FORMATS;
const printSizes = Object.values(FMT).filter(f => f.print).map(f => f.label.replace(/ \(.*$/, ""));
if (C.MAX_TOTAL !== 150 || C.MAX_SECTIONS !== 12 || C.MAX_ITEMS !== 30 || FMT.square.px !== 1080 || FMT["5x7"].w !== 360) throw new Error("tool facts changed");

const FOOT = `  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">Salon price list maker</a></li><li><a href="/how-to-price-salon-services">How to price salon services</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Templates</h4><ul><li><a href="/hair-salon-price-list-template">Hair salon price list</a></li><li><a href="/barber-price-list-template">Barber price list</a></li><li><a href="/nail-salon-price-list-template">Nail salon price list</a></li><li><a href="/spa-menu-template">Spa &amp; massage menu</a></li><li><a href="/lash-and-brow-price-list">Lash &amp; brow price list</a></li><li><a href="/esthetician-price-list-template">Esthetician &amp; waxing menu</a></li><li><a href="/instagram-price-list-template">Price list for Instagram</a></li></ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. ${NAME} is an independent tool, not affiliated with Canva, Adobe, Square, Vagaro, GlossGenius, Fresha, Booksy, Instagram or any print shop.</p>
  </footer>`;

const RELATED = `      <h2>More templates and guides</h2>
      <ul class="related">
        <li><a href="/">Salon price list template</a></li>
        <li><a href="/hair-salon-price-list-template">Hair salon</a></li>
        <li><a href="/barber-price-list-template">Barbershop</a></li>
        <li><a href="/nail-salon-price-list-template">Nail salon</a></li>
        <li><a href="/spa-menu-template">Spa &amp; massage</a></li>
        <li><a href="/lash-and-brow-price-list">Lash &amp; brow</a></li>
        <li><a href="/esthetician-price-list-template">Esthetician &amp; waxing</a></li>
        <li><a href="/instagram-price-list-template">For Instagram</a></li>
        <li><a href="/how-to-price-salon-services">How to price services</a></li>
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
const FEATURES = ["Sample menus for hair salons, barbershops, nail salons, spas, lash and brow studios and estheticians", "Sections and services with prices and short notes", "Paste an existing price list as text", "Automatic text size and 1 to 3 columns so everything fits one page", "Dot leaders between service and price", "US Letter, A4, Tabloid, A3, Half Letter, A5 and 5 x 7 in print sizes", "Instagram post, story and TV screen images", "Logo upload that stays on your device", "QR code to your booking page", "Print-ready PDF and PNG"];
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
// The sample menu of a preset as an HTML list, straight from the tool, so the page shows exactly what loads.
const sample = key => {
  const p = C.PRESETS[key];
  return `      <div class="note"><p><strong>${esc(p.business)}</strong> (sample)</p>\n${p.sections.map(s => `      <p><strong>${esc(s.title)}:</strong> ${s.items.map(i => `${esc(i.name)} ${esc(C.fmtPrice(i.price, "$"))}`).join(" · ")}</p>`).join("\n")}\n      </div>`;
};

function page({ path, title, desc, h1, lead, quick, badges, tool, body, faq = [], crumb, schema = [], noRelated, note }) {
  const isHome = path === "/";
  const graph = [];
  if (!isHome) graph.push({ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` },
    { "@type": "ListItem", position: 2, name: crumb || h1, item: URL + path }] });
  graph.push(...schema);
  if (faq.length) graph.push(faqLd(faq));
  const navHtml = isHome
    ? `<a href="#how">How it works</a><a href="/how-to-price-salon-services">Pricing guide</a><a href="#faq">FAQ</a>`
    : `<a href="/">Price list maker</a><a href="/how-to-price-salon-services">Pricing guide</a><a href="/about">About</a>`;
  const toolAttr = tool ? `${tool.preset ? ` data-preset="${tool.preset}"` : ""}${tool.format ? ` data-format="${tool.format}"` : ""}` : "";
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
${quick ? `    <div class="content narrow quick"><p class="tldr"><strong>Quick answer:</strong> ${quick}</p></div>\n` : ""}${tool ? `    <section class="tool card" aria-label="Price list maker"><div id="pb-tool"${toolAttr}></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? faqHtml(faq) + "\n" : ""}${noRelated ? "" : RELATED + "\n"}${updated(note === undefined ? "Sample businesses, phone numbers and prices are placeholders, not price advice." : note)}
    </article>
  </main>
${FOOT}
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

const TIP_PLUS = "Write <b>45+</b> for a starting price; PriceBoard prints it as $45+. Anything that isn't a plain number, like “from $45”, “$90 / 60 min” or “Free”, prints exactly as you type it.";

/* ------------------------------------------------------------------ home */
const homeSteps = [
  ["Pick a sample menu", "Choose Hair salon, Barbershop, Nail salon, Spa &amp; massage, Lash &amp; brow, Esthetician &amp; waxing or Start blank. Each one loads a full sample list with sections, services, notes, a colour and a style that you can change."],
  ["Type your services and prices", `Edit the sections and services, or paste the price list you already have and let PriceBoard split it into names and prices. ${TIP_PLUS}`],
  ["Add your details", "Put your business name, a short line under it, your logo, your phone and address, and fine print such as your cancellation policy. Add a link to your booking page and PriceBoard draws a QR code for it."],
  ["Choose a size and a look", `Pick a paper size (${printSizes.slice(0, 4).join(", ")}, ${printSizes.slice(4).join(", ")}) or an image for Instagram, a story or a TV screen. Then choose one of four styles, a colour, a font and whether you want dot leaders.`],
  ["Download and print or post", "Click <em>Download</em>. Print the PDF at 100% (Actual size), or post the PNG image. The text size and the number of columns are worked out for you, so a 10-service menu prints large and a 60-service menu still fits on one page."],
];
const homeFaq = [
  ["Is PriceBoard really free?", "Yes. Every feature is free, with no account, no login and no watermark on your menu. Printed PDFs carry one small “Made with PriceBoard” line at the very bottom of the page, under your fine print. Images for Instagram, stories and TV screens have no credit at all."],
  ["How do I show a starting price like $45+?", `${TIP_PLUS} The fine print is the place to explain it, for example “Prices are starting prices and can change with hair length and time needed.”`],
  ["Can I paste my old price list instead of retyping it?", "Yes. Open <em>Paste a price list you already have</em>, paste the text and click <em>Replace my list</em>. Each line with a price at the end becomes a service, a line without a price starts a new section, and a line starting with “-” or “(” under a service becomes its note. You can also paste two or three columns from a spreadsheet. Check the result before you print."],
  ["How many services fit on one page?", `Up to ${C.MAX_TOTAL} services in up to ${C.MAX_SECTIONS} sections. PriceBoard picks the largest text size that fits and uses one, two or three columns, keeping each section together where it can. If a list is too long for the size you picked, it tells you how many services were left out, so you can choose a bigger size, landscape or a shorter list.`],
  ["What size should a salon price list be?", "For a wall or a frame at the front desk, US Letter or A4 is the usual choice. A Tabloid (11 × 17 in) or A3 poster reads well from across the room. For a countertop sign holder, use 5 × 7 in or Half Letter and tick <em>Print it in the middle of a full sheet</em> so you can trim it. For Instagram, use the square post or the story size."],
  ["Can I add my logo, and is it uploaded anywhere?", "You can add a PNG, JPG or SVG logo. It is resized in your browser, placed above your business name and embedded in the PDF and the PNG. It never leaves your device. A copy is saved in this browser so it is still there next time, unless it is very large."],
  ["Will the QR code keep working?", "Yes. The QR code is a plain link to the address you type, drawn on your device. It doesn't go through a redirect service, so it never expires and nobody can change where it points. Scan it with your phone before you print, and use a link that won't change, such as your booking page."],
  ["Can I show the price list on a TV in my salon?", "Yes. Choose <em>TV screen (1920 × 1080 px)</em>, pick the dark style if you like, and download the PNG. Most smart TVs can show a photo from a USB stick, and casting apps can show it from a phone."],
  ["Is my information uploaded anywhere?", "No. Your services, prices, logo and settings are used in your browser to build the preview, the PDF and the PNG. They are saved only in this browser's local storage so your list is still there when you come back."],
];
const home = {
  path: "/",
  title: "Salon Price List Template: Free Maker, PDF or PNG | PriceBoard",
  desc: "Free salon and spa price list maker: pick a sample menu, type your services and prices, and download a print-ready PDF or an Instagram image. No login.",
  h1: "Salon Price List Template (Free Maker)",
  lead: "Make a clean price list for your salon, barbershop, nail studio or spa in a few minutes. Type your services, and PriceBoard fits them on one page for printing, or on an image for Instagram or a TV. Free, no login, and nothing leaves your browser.",
  quick: `Pick the sample menu closest to your business below, replace the services and prices with yours, add your name, logo and booking link, then click <em>Download</em>. You get a one-page PDF for US Letter, A4, a poster or a 5 × 7 frame, or a PNG for Instagram (1080 × 1080 px), a story or a TV screen. The text size and columns adjust so everything fits.`,
  badges: ["100% free", "Print &amp; Instagram sizes", "Fits on one page", "QR to your booking page", "No login"],
  tool: { preset: "" },
  schema: [appLd(NAME, "/", "Free salon and spa price list maker. Type your services and prices and download a one-page print-ready PDF or a PNG for Instagram, stories or a TV screen."), howToLd("How to make a salon price list", homeSteps)],
  faq: homeFaq,
  body: `      <h2 id="how">How to make a salon price list in 5 steps</h2>
${stepsHtml(homeSteps)}

      <h2>What to put on a salon price list</h2>
      <p>A price list has one job: let a client find the service they want and see what it costs before they ask. Clients read it standing at the front desk or scrolling on a phone, so it should be easy to scan. Most good salon menus include:</p>
      <ul>
        <li><strong>Sections in the order clients think:</strong> cuts before color, manicures before enhancements, massage before add-ons.</li>
        <li><strong>Service names clients use.</strong> “Women's cut &amp; style” is clearer than an in-house name. If you use a special name, add a short note under it.</li>
        <li><strong>A price for every service</strong>, with a plus sign for starting prices (“$65+”) and the length of treatments where it matters (“60 minutes”).</li>
        <li><strong>One or two lines of fine print:</strong> what makes a price go up, your cancellation or late policy, and whether gratuity is included.</li>
        <li><strong>How to book:</strong> your phone number, address and a QR code that opens your booking page.</li>
      </ul>
      <p>Leave out anything that changes every week, such as a monthly special. A menu that stays accurate for months is worth more than a busy one you have to reprint.</p>

      <h2>Sizes for print, posts and screens</h2>
      <table>
        <thead><tr><th>Size</th><th>Best for</th></tr></thead>
        <tbody>
          <tr><td>US Letter (8.5 × 11 in) or A4</td><td>The front desk, a wall frame, a binder at each station, or a PDF you email to clients</td></tr>
          <tr><td>Tabloid (11 × 17 in) or A3 poster</td><td>A wall poster that people can read from the waiting area; print at a copy shop</td></tr>
          <tr><td>Half Letter (5.5 × 8.5 in), A5 or 5 × 7 in</td><td>Countertop sign holders and small frames; can print in the middle of a full sheet with crop marks</td></tr>
          <tr><td>Instagram post (1080 × 1080 px)</td><td>A pinned post or a highlight cover so new followers see your prices</td></tr>
          <tr><td>Story or phone screen (1080 × 1920 px)</td><td>Stories, story highlights and a quick image to text to clients</td></tr>
          <tr><td>TV screen (1920 × 1080 px)</td><td>A TV in the waiting area, shown from a USB stick or a casting app</td></tr>
        </tbody>
      </table>
      <p>Every print size can also be turned to landscape. A wide page with three columns suits long menus, such as a full-service salon with color, treatments and nails.</p>

      <h2>How PriceBoard fits your list on one page</h2>
      <p>Templates in design apps have a fixed number of lines, so a long list overflows and a short one leaves a gap. PriceBoard works the other way round: it measures every service name, price and note, then tries the largest text size first and steps down until the whole list fits. It tries one, two and three columns and keeps each section together in one column where it can. If a section has to continue in the next column, its title is repeated at the top so clients don't lose their place.</p>
      <p>Spare room is shared out as a little extra space between the rows, so a short list still looks finished instead of stuck to the top of the page. If a list is too long even at the smallest readable size, the tool tells you how many services didn't fit. You can then choose a bigger size, switch to landscape or split the menu into two pages, for example hair on one and nails on the other.</p>

      <h2>Styles, colours and fonts</h2>
      <p>Four styles cover most salons: <strong>Clean</strong> (white with a thin frame in your colour), <strong>Colour band</strong> (your name on a band of colour across the top), <strong>Soft</strong> (a lightly tinted panel) and <strong>Dark</strong> (light text on a near-black background, made for screens and TVs). Six ready-made looks set the colour and style in one click, and the colour picker matches your brand exactly.</p>
      <p>The fonts are Classic (Times), Modern (Helvetica) and Mixed (Times headings with Helvetica text). They are the fonts built into every PDF reader, so the PDF looks the same on every computer and print shop. Dot leaders, the row of dots between a service and its price, help the eye across a wide page; you can turn them off for a cleaner look.</p>

      <h2>Printing tips</h2>
      <ul>
        <li><strong>Print at 100% (Actual size)</strong>, not “Fit to page”, so the margins and the QR code stay the right size.</li>
        <li><strong>Use heavier paper.</strong> Matte cardstock of about 65 to 110 lb (around 175 to 300 gsm) looks better than copy paper and stands up in a sign holder.</li>
        <li><strong>Protect it.</strong> A frame, an acrylic sign holder or a laminating pouch keeps a front-desk menu clean for months.</li>
        <li><strong>Test the QR code</strong> with your own phone before you print a batch.</li>
        <li><strong>Save your list.</strong> PriceBoard remembers your last list in this browser, so next time you raise a price you change one line and print again.</li>
      </ul>

      <h2>Why use a price list maker instead of a design template?</h2>
      <p>Design templates look good with the sample text and less good with yours: names wrap, prices don't line up, and every new service means moving boxes around. A maker that understands what a price list is does that work for you. You type services and prices, and the layout, alignment, columns and text size follow. It needs no account, so you can come back whenever your prices change, which is the moment most salons find their old menu file has gone missing.</p>
      <p>Not sure what to charge? Our guide <a href="/how-to-price-salon-services">how to price salon services</a> walks through a simple cost-per-hour method with a worked example.</p>`,
};

/* ----------------------------------------------------------- landing pages */
const P = [];

P.push({
  path: "/hair-salon-price-list-template", crumb: "Hair salon price list template",
  title: "Hair Salon Price List Template (Free, Printable or Post)",
  desc: "Free hair salon price list template: cuts, color and treatments with starting prices, notes and a booking QR code. Print it or post it. No login.",
  h1: "Hair Salon Price List Template",
  lead: "A ready-made hair salon menu with cuts and styling, color and treatments, which you can turn into your own price list in a few minutes.",
  quick: `The Hair salon sample below loads three sections: cuts and styling, color and treatments, with starting prices such as $65+. Replace the sample salon's name and prices with yours, add a line of fine print about how length and thickness affect the price, then download a Letter or A4 PDF, or an Instagram image.`,
  tool: { preset: "hair" },
  faq: [
    ["Should a hair salon list starting prices or exact prices?", "Most salons list starting prices for color and long-hair services, because the time and product depend on the client's hair. Exact prices work for short, predictable services such as a men's cut, a blow-dry or a toner. If you list starting prices, add a line of fine print saying what makes the price go up, so nobody is surprised at the till."],
    ["How do I show different prices for short, medium and long hair?", "Either list them as separate services, for example “All-over color, short” and “All-over color, long”, or keep one line and put the range in the price box, such as “$110–$150”, with a note like “by length”. Separate lines are clearer when the gap is large."],
    ["Should I list each stylist's level?", "If your prices differ by stylist level, add a short section or a note under the services that change, for example “Senior stylist +$15”. Keep it to one rule that the front desk can explain in a sentence."],
    ["What fine print do hair salons usually add?", "Common lines are: prices are starting prices, a consultation is needed for color corrections, the cancellation or late policy, and whether gratuity is included. Keep it to two short sentences so it is actually read."],
  ],
  body: `      <h2>What the Hair salon sample includes</h2>
${sample("hair")}
      <p>The sample prices are placeholders to show the layout, not a price guide. Every business name, phone number and web address in the sample is made up, so replace every one before you print.</p>

      <h2>How to organise a hair salon menu</h2>
      <p>Clients look for the service first and the price second, so order sections the way they think about a visit: <strong>cuts and styling</strong>, then <strong>color</strong>, then <strong>treatments</strong> and <strong>extensions</strong> if you offer them. Put the most-booked service at the top of each section. If you do a lot of special occasion work, a separate “Bridal &amp; events” section with trials and updos makes it easy to find.</p>
      <p>Name services the way clients ask for them. “Partial highlights” and “Balayage” are searched and asked for by name; an in-house name like “Sun-kissed package” needs a note underneath saying what it includes. Notes are also the place for what's included (“includes toner and blow-dry”) and how long a result lasts (“lasts up to 4 months”).</p>

      <h2>Starting prices and add-ons</h2>
      <p>${TIP_PLUS} In a color section most prices will be starting prices, and that's normal. What clients dislike is a surprise, so explain in the fine print what moves the price: length, thickness, extra product and extra time. Add-ons like a gloss, a bond-building treatment or extra color bowls can go in their own short section, so the main prices stay simple.</p>

      <h2>Where to use it</h2>
      <ul>
        <li><strong>Front desk and stations:</strong> a Letter or A4 print in a frame, or a 5 × 7 in a sign holder by the till.</li>
        <li><strong>Waiting area:</strong> a Tabloid or A3 poster, or the TV size on a screen.</li>
        <li><strong>Instagram:</strong> the square post as a pinned post, and the story size in a “Prices” highlight.</li>
        <li><strong>Your booking app and website:</strong> the PNG image on your booking profile, and the PDF linked from your website.</li>
      </ul>
      <p>Prices change, usually once or twice a year. PriceBoard keeps your list in this browser, so a price rise means editing a few lines and printing again rather than starting from scratch.</p>`,
});

P.push({
  path: "/barber-price-list-template", crumb: "Barber price list template",
  title: "Barber Price List Template: Free Printable & Shop Poster",
  desc: "Free barber price list template with haircuts, beard and shave services and extras. Print a poster for the wall or post it on Instagram. No login.",
  h1: "Barber Price List Template",
  lead: "A barbershop menu with haircuts, beard and shave services and extras, laid out in big clear type that customers can read from the chair.",
  quick: `The Barbershop sample below loads haircuts, beard and shave, and extras, in a bold red band style. Replace the sample shop's name, services and prices with yours, and download a Letter or A4 PDF for the wall, a Tabloid or A3 poster for across the room, or a TV image for a screen.`,
  tool: { preset: "barber" },
  faq: [
    ["How big should a barbershop price list be?", "Big enough to read from the waiting chairs. A Letter or A4 page works next to the mirror or at the counter, but on a wall across the shop a Tabloid (11 × 17 in) or A3 poster is easier to read. PriceBoard makes the text as large as the page allows, so a short barber menu prints in big type."],
    ["Should a barbershop list kids' and senior prices?", "If you offer them, yes. Listing them as their own services with the age in brackets, such as “Kids' cut (12 and under)”, answers the question before it is asked."],
    ["How do I show a combo price?", "List the combo as its own service, for example “Cut &amp; beard combo”, with a price lower than the two services added up. Clients notice the saving, and it is quicker to ring up."],
    ["Do barbers need to post their prices?", "Rules on posting prices and licences differ by state and city. Check with your state board or local licensing office, and keep your posted list up to date either way so customers aren't surprised."],
  ],
  body: `      <h2>What the Barbershop sample includes</h2>
${sample("barber")}
      <p>The sample uses the Colour band style, Helvetica and a barber red, but every part can be changed. The names, phone number and web address are placeholders; replace them all before you print.</p>

      <h2>A barber menu that reads from the chair</h2>
      <p>Barbershop menus work best short and bold. Most customers come in for one of three or four cuts, so put those first, then beard and shave, then extras. Keep names short (“Skin fade”, “Buzz cut”, “Hot towel shave”) so they fit on one line in big type, and use a note only where it matters, such as what a deluxe service adds.</p>
      <p>Because PriceBoard picks the text size from the length of your list, a menu with ten or fifteen services fills a Letter page in large, poster-like type. On a Tabloid or A3 poster it can be read from across the shop. If you also post on Instagram, switch the size to the square post and download the same list as an image.</p>

      <h2>Walk-ins, appointments and cash</h2>
      <p>The line under your shop name is a good place for the one thing every new customer asks, such as “Walk-ins welcome” or “Appointments only”. The fine print can cover payment (“Cash and cards accepted”), late arrivals and no-shows. Add your booking link and PriceBoard prints a QR code with your own caption, like “Book a chair”, so a customer waiting today can book their next cut before they leave.</p>

      <h2>Dark style for screens</h2>
      <p>The Dark style puts light text on a near-black background. It looks sharp on a TV in the shop, but it uses a lot of ink, so print the light styles and keep Dark for the screen and Instagram.</p>
      <ul>
        <li><strong>Wall:</strong> Tabloid or A3 poster, Colour band style, printed at a copy shop on matte paper.</li>
        <li><strong>Mirror stations:</strong> 5 × 7 in sign holders, printed in the middle of a Letter sheet and trimmed.</li>
        <li><strong>TV:</strong> TV screen size, Dark style, shown from a USB stick.</li>
      </ul>`,
});

P.push({
  path: "/nail-salon-price-list-template", crumb: "Nail salon price list template",
  title: "Nail Salon Price List Template (Free Printable & Post)",
  desc: "Free nail salon price list template with manicures, pedicures and enhancements, notes like “per nail”, and a booking QR code. Print or post it.",
  h1: "Nail Salon Price List Template",
  lead: "A nail salon menu with manicures, pedicures and enhancements, ready for your prices, your colours and your booking link.",
  quick: `The Nail salon sample below loads manicures, pedicures and enhancements, with notes such as “Free with a new gel set” and “Per nail”. Replace the sample studio's name and prices with yours, then download a Letter or A4 PDF for the front desk, or the square image for Instagram.`,
  tool: { preset: "nails" },
  faq: [
    ["How do I price nail art on a price list?", "Many salons list nail art as a starting price per nail, such as “$5+” with the note “per nail”, and quote complex sets in person. That keeps the menu honest without listing every design."],
    ["Should removal be a separate service?", "Listing removal as its own line, with a note if it is free with a new set, answers a common question at the desk. The Nail salon sample shows one way to write it."],
    ["How do I list fills and full sets?", "Put full sets and fills next to each other in an Enhancements section, and say in a note how long a fill is good for, for example “within 3 weeks”."],
    ["Can I make an image for my Instagram highlights?", "Yes. Choose the story size (1080 × 1920 px) and download the PNG. A tall image with one or two columns is easy to read on a phone, and you can save one per section if your menu is long."],
  ],
  body: `      <h2>What the Nail salon sample includes</h2>
${sample("nails")}
      <p>The sample uses the Soft style, a tinted panel in rose, with Times headings and Helvetica text. The salon name, phone number and web address are placeholders.</p>

      <h2>How to organise a nail menu</h2>
      <p>Nail clients usually decide between hands and feet first, then the finish. That makes three sections a natural start: <strong>manicures</strong>, <strong>pedicures</strong> and <strong>enhancements</strong> (acrylic, gel extensions, dip powder). If you offer a lot of add-ons, such as paraffin, chrome or French tips, give them their own short section instead of crowding the main services.</p>
      <p>Notes do a lot of work on a nail menu. Use them for what a spa pedicure includes (“scrub, mask and hot towels”), when a service is free (“free with a new gel set”) and how a price is counted (“per nail”). Keep each note to a few words so the page stays easy to scan.</p>

      <h2>Prices that change with length and design</h2>
      <p>${TIP_PLUS} Enhancements and art are often starting prices, and a short line of fine print such as “Prices may vary with length and design” covers it. A line about allergies or sensitive skin is also worth adding if you use products that need a patch test.</p>

      <h2>Where nail salons use it</h2>
      <ul>
        <li><strong>At each table:</strong> a 5 × 7 in or Half Letter menu in an acrylic sign holder, so clients can choose while they wait.</li>
        <li><strong>At the front desk:</strong> a Letter or A4 page in a frame.</li>
        <li><strong>Online:</strong> the square image as a pinned post, the story image in a highlight, and the same PNG on your booking profile.</li>
      </ul>
      <p>Because your list is saved in this browser, you can keep a seasonal version too: change a few services for the holidays, download, and change them back in January.</p>`,
});

P.push({
  path: "/spa-menu-template", crumb: "Spa menu template",
  title: "Spa Menu Template: Free Massage & Facial Price List Maker",
  desc: "Free spa menu template for massage, facials and body treatments, with treatment times, short descriptions and a booking QR code. Print or post it.",
  h1: "Spa Menu Template (Massage, Facials & Body)",
  lead: "A calm, easy-to-read spa and massage menu with treatment times and short descriptions, ready to print for your reception or share online.",
  quick: `The Spa &amp; massage sample below loads massage, facials and body treatments, each with its length in a short note. Replace the sample spa's name, treatments and prices with yours, add your arrival and gratuity policy to the fine print, and download a PDF or an image.`,
  tool: { preset: "spa" },
  faq: [
    ["How do I list 60 and 90 minute prices?", "Either list each length as its own line (“Swedish massage, 60 min” and “Swedish massage, 90 min”), or keep one line and type both in the price box, such as “$90 / $130”, with a note “60 / 90 minutes”. Separate lines are easier to read when you offer three lengths."],
    ["What should a spa menu description say?", "One short sentence about what the client feels or gets, plus the length: “60 minutes of relaxing full-body massage.” Leave longer descriptions for your website."],
    ["Should a spa menu mention gratuity?", "Yes, if your policy differs from what clients expect. A short line such as “Gratuity is not included” or “A 20% service charge is added” avoids an awkward moment at checkout."],
    ["Can I add a section for packages or gift certificates?", "Yes. Add a section such as “Packages” with each package as a service and what's included in its note. For gift certificates, a line in the fine print tells clients they're available, and our sister tool <a href=\"https://giftcert.roohsites.com/\">GiftStub</a> prints numbered gift certificates."],
  ],
  body: `      <h2>What the Spa &amp; massage sample includes</h2>
${sample("spa")}
      <p>The sample uses the Clean style with a thin frame, Times and a soft sage green. The spa name, phone number and web address are placeholders.</p>

      <h2>Writing a spa menu clients enjoy reading</h2>
      <p>A spa menu sells a feeling as much as a service, but clients still need the facts: what it is, how long it takes and what it costs. PriceBoard gives each treatment a name, a price and a short note. Use the note for the length and, if there's room, a few words of description. The layout keeps the note smaller and lighter than the name, so the page stays calm and easy to scan.</p>
      <p>Group treatments the way your booking system does, usually <strong>massage</strong>, <strong>facials</strong> and <strong>body treatments</strong>, with <strong>add-ons</strong> such as aromatherapy or hot stones in their own short section. Put the signature treatment first in its section; most clients choose from the top.</p>

      <h2>Policies that belong on the menu</h2>
      <p>The fine print at the bottom is read more than you'd think. Good candidates are arrival time (“Please arrive 10 minutes early”), cancellation notice, gratuity, and health questions such as pregnancy or recent treatments. Keep it to two or three short sentences; the full policy can live on your booking page, which the QR code opens.</p>

      <h2>Print, frame or post</h2>
      <ul>
        <li><strong>Reception and treatment rooms:</strong> Letter or A4 in a frame, or Half Letter on a stand.</li>
        <li><strong>Gift and retail area:</strong> a 5 × 7 in sign holder with your packages.</li>
        <li><strong>Online:</strong> the square image as a pinned post and the story size in a highlight; the PDF can be linked from your website or emailed to clients.</li>
      </ul>
      <p>The Classic font and the Clean or Soft style suit most spas. For a TV in the relaxation room, the Dark style is easier on the eyes than a bright white page.</p>`,
});

P.push({
  path: "/lash-and-brow-price-list", crumb: "Lash & brow price list",
  title: "Lash & Brow Price List Template: Free Lash Tech Menu",
  desc: "Free lash and brow price list template: full sets, fills, lifts, lamination and brow services with notes and a booking QR code. Print or post it.",
  h1: "Lash & Brow Price List Template",
  lead: "A lash tech and brow artist menu with full sets, fills, lifts and brow services, with room for your fill policy and prep rules.",
  quick: `The Lash &amp; brow sample below loads lash extensions (classic, hybrid and volume sets, fills and removal) and lifts and brows. Replace the sample studio's name and prices with yours, put your fill policy in the fine print, and download the story image for Instagram or a PDF for your room.`,
  tool: { preset: "lash" },
  faq: [
    ["How should I list lash fills?", "List fills by how long it has been since the last appointment, for example “Fill (within 2 weeks)” and “Fill (within 3 weeks)”, and say in the fine print when a fill becomes a full set. The Lash &amp; brow sample shows one way to word it."],
    ["Where do I put my prep rules?", "In the fine print: “Please come with clean lashes and no eye makeup” is short enough to print. Longer aftercare instructions belong on your booking page or a separate card."],
    ["Can I show prices for each lash artist level?", "Yes. Either add a short note such as “Master artist +$20” under the services it applies to, or make a section for each artist level if the menus are different."],
    ["What size works best for a lash studio?", "A Half Letter or 5 × 7 in menu in a sign holder suits a small room, and the story size suits Instagram, where most lash clients find their artist."],
  ],
  body: `      <h2>What the Lash &amp; brow sample includes</h2>
${sample("lash")}
      <p>The sample uses the Soft style in lavender with Times headings. The studio name, phone number and web address are placeholders.</p>

      <h2>Organising a lash and brow menu</h2>
      <p>Lash clients compare styles first, so list your <strong>full sets</strong> together, from classic to the fullest volume, then <strong>fills</strong> and <strong>removal</strong>. Lifts, tints, lamination and brow shaping make a natural second section. If you also do waxing or facials, add them as a third section rather than mixing them in.</p>
      <p>Most lash menus need a few rules in writing: how long a fill is valid, how much of the lash line must remain for a fill, and how to arrive. These fit in the fine print at the bottom, and a QR code can open your booking page with the full policy and aftercare.</p>

      <h2>Built for Instagram</h2>
      <p>Lash and brow artists often get most of their bookings from Instagram, so the price list may be seen more on a phone than on paper. Switch the size to <em>Story or phone screen</em> for a highlight, or <em>Instagram post</em> for a pinned post. The text size is chosen so the whole menu fits the image, and the same list prints as a PDF when you need a paper copy.</p>
      <ul>
        <li><strong>Story highlight:</strong> 1080 × 1920 px, one or two columns.</li>
        <li><strong>Pinned post:</strong> 1080 × 1080 px, two columns for a longer menu.</li>
        <li><strong>In the studio:</strong> a 5 × 7 in menu in a sign holder by the bed or the mirror.</li>
      </ul>
      <p>${TIP_PLUS}</p>`,
});

P.push({
  path: "/esthetician-price-list-template", crumb: "Esthetician price list template",
  title: "Esthetician Price List Template: Facials & Waxing Menu",
  desc: "Free esthetician price list template with facials, peels and a waxing menu, plus prep notes and a booking QR code. Print it or post it. No login.",
  h1: "Esthetician & Waxing Price List Template",
  lead: "A skin studio menu with facials and peels and a full waxing list, with space for the prep rules your clients need to read.",
  quick: `The Esthetician &amp; waxing sample below loads facials and peels plus a seven-line waxing menu. Replace the sample studio's name and prices with yours, add your prep rule to the fine print, and download a Letter or A4 PDF or an image for Instagram.`,
  tool: { preset: "skin" },
  faq: [
    ["How do I lay out a long waxing menu?", "Give waxing its own section and list areas from face down to legs, or from most to least booked. With dot leaders on, a long list of short names and prices is easy to scan, and PriceBoard puts it in its own column when there's room."],
    ["Should I list face and body waxing separately?", "If your waxing menu is long, two sections (“Face waxing” and “Body waxing”) make it quicker to find an area. For seven or eight areas, one section is enough."],
    ["Where do I put prep and aftercare rules?", "Short prep rules, such as stopping retinol before waxing or a peel, fit in the fine print. Longer aftercare belongs on your booking page; the QR code at the bottom can open it."],
    ["Can I mark which facials need a consultation?", "Yes, with a short note under the service, for example “Consultation required for first visit”."],
  ],
  body: `      <h2>What the Esthetician &amp; waxing sample includes</h2>
${sample("skin")}
      <p>The sample uses the Clean style in teal with Helvetica. The studio name, phone number and web address are placeholders.</p>

      <h2>Facials, peels and waxing on one page</h2>
      <p>An esthetician's menu often mixes a few long treatments with many short ones. The facials take a line each, with the length or the main benefit in a note, while waxing is a long list of short areas and prices. PriceBoard handles both on one page: it balances the sections across columns, so the waxing list doesn't push the facials off the page.</p>
      <p>If your treatment names come from a product line, add a few plain words in the note so a new client knows what to expect: “60 minutes, for dry and dull skin” or “Gentle exfoliation, no downtime”.</p>

      <h2>The fine print that saves appointments</h2>
      <p>Prep rules matter more for skin and waxing than for most services. A client who used a retinol last night may have to be turned away, so print the rule where they will see it. Good candidates for the fine print are retinol and exfoliant rules, hair length for waxing, sun exposure before a peel, and your cancellation policy. Keep it short; the QR code can open the full details.</p>

      <h2>Where to use it</h2>
      <ul>
        <li><strong>Treatment room:</strong> Letter or A4 in a frame, or Half Letter on a stand.</li>
        <li><strong>Front desk:</strong> a 5 × 7 in sign holder with your most-booked services.</li>
        <li><strong>Online:</strong> the square post and the story size for Instagram, and the PNG on your booking profile.</li>
      </ul>
      <p>${TIP_PLUS}</p>`,
});

P.push({
  path: "/instagram-price-list-template", crumb: "Price list for Instagram",
  title: "Instagram Price List Template: Free Salon Price Post Maker",
  desc: "Make a salon price list image for Instagram: a 1080 × 1080 post or a 1080 × 1920 story, with your services, prices, colours and logo. Free, no login.",
  h1: "Price List Template for Instagram",
  lead: "Turn your service menu into a sharp square post or story image in a minute, then pin it, add it to a highlight or put it on your booking profile.",
  quick: `This page starts on the square Instagram post size (1080 × 1080 px). Pick the sample menu closest to your business, type your services and prices, and click <em>Download image (PNG)</em>. Switch the size to <em>Story or phone screen</em> for a 1080 × 1920 px highlight image.`,
  tool: { preset: "", format: "square" },
  faq: [
    ["What size is an Instagram price list post?", "PriceBoard makes square posts at 1080 × 1080 px and story images at 1080 × 1920 px. Both are common sizes for Instagram, and the same images work on Facebook and in booking apps that show a gallery."],
    ["How many services fit on one Instagram image?", "On a square image, about 20 to 30 short services stay readable on a phone. For a longer menu, make one image per section: switch sections around, download, and repeat. Each image can be a slide in a carousel post."],
    ["Is there a watermark on the image?", "No. Images for Instagram, stories and TV screens have no credit or watermark. Printed PDFs carry one small line at the bottom of the page."],
    ["Should I post prices on Instagram?", "Many salons do, because it answers the most common question in DMs before it's asked. If your prices are starting prices, add one line of fine print saying so, and keep the image up to date when prices change."],
  ],
  body: `      <h2>Post sizes</h2>
      <table>
        <thead><tr><th>Size</th><th>Pixels</th><th>Use it for</th></tr></thead>
        <tbody>
          <tr><td>Instagram post</td><td>1080 × 1080</td><td>A pinned post, a carousel slide, a Facebook post</td></tr>
          <tr><td>Story or phone screen</td><td>1080 × 1920</td><td>Stories, a “Prices” highlight, sending to a client by text</td></tr>
          <tr><td>TV screen</td><td>1920 × 1080</td><td>A TV in the waiting area, or a wide image for a website banner</td></tr>
        </tbody>
      </table>

      <h2>Making a price post people actually read</h2>
      <p>On a phone, an image has a second or two to get its point across. Keep the menu short, the type large and the contrast high. PriceBoard sizes the text from the length of your list, so the fewer services you put on one image, the bigger they print. For a long menu, make one image per section and post them together as a carousel: “Cuts”, “Color”, “Treatments”.</p>
      <ul>
        <li><strong>Lead with your name or logo</strong> so the image still makes sense when it's shared.</li>
        <li><strong>Use your brand colour</strong> for section titles and keep the background light, or use the Dark style for a bold look.</li>
        <li><strong>Add the booking link to your bio and caption</strong> rather than relying on the QR code, which is hard to scan from the same phone.</li>
        <li><strong>Pin it</strong> to the top of your profile and save the story version in a highlight called “Prices” or “Menu”.</li>
      </ul>

      <h2>Same list, print and post</h2>
      <p>PriceBoard keeps one list for every size. Make the Instagram image, then switch the size to US Letter or A4 and download a PDF for the front desk: the layout is worked out again for the new page, so you never keep two menus in step by hand. When a price changes, edit one line and download both again.</p>
      <p>Not on Instagram? The same images work for a Facebook page, a Google Business Profile photo, or the gallery on your booking app. Check each platform's current image guidelines before you post.</p>`,
});

/* ----------------------------------------------------------------- guide */
const guideFaq = [
  ["How do I work out my cost per hour?", "Add up a typical month's business costs (rent or chair rent, utilities, insurance, software, card fees, education and the pay you want to take home), then divide by the hours you are actually with clients in that month, not the hours the doors are open."],
  ["Should I charge by the service or by the hour?", "Clients prefer a price per service, but the price should come from the time it takes. Time each service for a few weeks, then price it from that time and your cost per hour, plus the product it uses."],
  ["How often should a salon raise prices?", "There is no fixed rule. Many owners review prices once a year and whenever costs rise or the book stays full for weeks ahead. Tell regular clients in advance and update every printed and online price list on the same day."],
  ["What does a plus sign after a price mean?", "It means a starting price: the service costs at least that much and may cost more for longer hair, more product or extra time. Say what makes the price go up in the fine print on your price list."],
  ["Is this pricing advice for my salon?", "No. It is a general method for working out prices from your own numbers. Your costs, local market and laws differ, so check with an accountant for tax and business advice."],
];
P.push({
  path: "/how-to-price-salon-services", crumb: "How to price salon services",
  title: "How to Price Salon Services: A Simple Cost-per-Hour Method",
  desc: "A simple way to set salon, barber, nail and spa prices from your own costs: your cost per hour, service time and product cost, with a worked example.",
  h1: "How to Price Salon Services",
  lead: "A simple, honest method for setting prices from your own numbers: what an hour of your time costs, how long each service takes and what it uses.",
  quick: "Work out what one hour with a client costs you (all monthly costs, including the pay you want, divided by your client hours), multiply by the time a service takes, add the product it uses, then add a margin for profit and slow weeks. Compare the result with what clients near you expect, and adjust the service, not just the price.",
  schema: [articleLd("How to Price Salon Services", "/how-to-price-salon-services", "A simple cost-per-hour method for setting salon, barber, nail and spa prices, with a worked example.")],
  faq: guideFaq,
  note: "General information with made-up example numbers, not financial, tax or legal advice.",
  body: `      <p>Many salon prices are set by looking at the salon down the street. That's a useful check, but it isn't a method: the salon down the street may pay half your rent, or be quietly losing money. The steps below build a price from your own costs first, then check it against the market. They work the same for hair, barbering, nails, lashes, skin and massage.</p>

      <h2>1. Work out what an hour with a client costs you</h2>
      <p>Add up everything a typical month costs the business. Include the obvious costs and the ones that are easy to forget:</p>
      <ul>
        <li>Rent or chair or booth rent, utilities and insurance</li>
        <li>Booking software, card processing fees, phone and internet</li>
        <li>Tools, towels, laundry, cleaning and small equipment</li>
        <li>Education, licences and marketing</li>
        <li><strong>The pay you want to take home.</strong> If you leave this out, the price only covers the shop, not you.</li>
      </ul>
      <p>Then count the hours you actually spend with clients in a month. Not the hours you are open: gaps between bookings, cleaning, admin and no-shows don't earn anything. Divide the monthly total by those hours. That number is your <strong>cost per client hour</strong>.</p>

      <h2>2. Time each service honestly</h2>
      <p>For two or three weeks, note how long each service really takes, from greeting to the next client in the chair, including consultation, cleanup and checkout. Use the typical time, not your fastest. Services that vary a lot, like color on long hair, are a sign you need a starting price or separate prices by length.</p>

      <h2>3. Add the product each service uses</h2>
      <p>Color, lightener, developer, toner, gel, acrylic, wax, strips, masks and lash trays all cost money per client. Estimate the product cost for a typical service. For color, many salons weigh bowls for a while to get a realistic figure.</p>

      <h2>4. Put it together, then add a margin</h2>
      <p>The base price of a service is:</p>
      <p class="note"><strong>Base price = (cost per client hour × hours the service takes) + product cost</strong></p>
      <p>The base price only breaks even. Add a margin on top for profit, quiet months, price rises from suppliers and the day the dryer breaks. Many owners also round to a clean number.</p>

      <h2>A worked example (made-up numbers)</h2>
      <p>Imagine a one-chair studio with monthly costs of $3,000 for the business plus $3,500 the owner wants to take home: $6,500 in total. The owner is with clients for about 100 hours a month.</p>
      <table>
        <thead><tr><th>Step</th><th>Example</th></tr></thead>
        <tbody>
          <tr><td>Cost per client hour</td><td>$6,500 ÷ 100 hours = $65 an hour</td></tr>
          <tr><td>Service: all-over color</td><td>Takes 1.5 hours; uses about $12 of product</td></tr>
          <tr><td>Base price</td><td>$65 × 1.5 + $12 = $109.50</td></tr>
          <tr><td>Add a 15% margin and round</td><td>$109.50 × 1.15 ≈ $126, rounded to $125+</td></tr>
        </tbody>
      </table>
      <p>These numbers are invented to show the arithmetic. Your rent, hours, product and pay will give different answers, and that's the point: the price should come from your business, not someone else's.</p>

      <h2>5. Check it against your market</h2>
      <p>Now look at what similar businesses near you charge for a similar service. If your number is far above theirs, ask why: is the service slower, the product dearer or the hours lower? Sometimes the answer is to change the service (a shorter appointment, a different product, a package) rather than the price. If your number is far below, you may have room to charge more, especially if your book is full weeks ahead.</p>

      <h2>6. Write prices clients understand</h2>
      <ul>
        <li><strong>Use starting prices where time varies:</strong> “$125+” with a line of fine print saying length and thickness can change the price.</li>
        <li><strong>Price add-ons separately</strong> so the main prices stay simple: toner, treatments, nail art, extra length.</li>
        <li><strong>Say what's included</strong> in a short note, such as “includes toner and blow-dry”.</li>
        <li><strong>Keep every price list in step.</strong> The front desk, Instagram and your booking app should all show the same prices.</li>
      </ul>
      <p>When your prices are ready, <a href="/">make your price list</a> in a few minutes, or start from a sample: <a href="/hair-salon-price-list-template">hair salon</a>, <a href="/barber-price-list-template">barbershop</a>, <a href="/nail-salon-price-list-template">nail salon</a>, <a href="/spa-menu-template">spa</a>, <a href="/lash-and-brow-price-list">lash and brow</a> or <a href="/esthetician-price-list-template">esthetician</a>.</p>

      <h2>7. Review once a year</h2>
      <p>Costs creep up. Put a date in your calendar once a year to redo steps 1 to 4 with fresh numbers. When you raise prices, tell regular clients ahead of time, change every menu on the same day, and keep the explanation short and confident. Because PriceBoard saves your list in your browser, updating the printed and Instagram versions takes a few minutes.</p>`,
});

/* ----------------------------------------------------------- about/privacy */
P.push({
  path: "/about", crumb: "About",
  title: "About PriceBoard: Free Salon & Spa Price List Maker",
  desc: "PriceBoard is part of Rooh Sites' free tools: small, private web tools that run in your browser. Who makes it, why it's free and how it handles data.",
  h1: "About PriceBoard",
  lead: "A small, free tool that does one job: clear price lists and service menus for salons, barbers, nail studios and spas, for print and for Instagram.",
  note: "",
  body: `      <p>PriceBoard is part of <a href="https://roohsites.com/">Rooh Sites</a>' collection of free single-purpose web tools. It is built for hair salons, barbershops, nail salons, spas and massage therapists, lash and brow artists and estheticians who need a price list that looks professional and is quick to update.</p>
      <h2>Why we built it</h2>
      <p>Most price list templates online are fixed designs in an editor that wants an account, or paid files that break as soon as your list is longer than the sample. PriceBoard starts from the list instead of the design: you type services and prices, and it works out the text size, the columns and the alignment so the whole menu fits one page, in print sizes and in image sizes for Instagram, stories and TV screens.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free, with no account and no paid tier. Printed PDFs carry one small “Made with PriceBoard” line at the bottom of the page; images for Instagram, stories and TV screens have none. That line is how other business owners find the tool.</p>
      <h2>How it works</h2>
      <p>Everything runs in your browser. PDFs are built on your device with the open-source <a href="https://github.com/Hopding/pdf-lib" rel="noopener">pdf-lib</a> library, QR codes are drawn with the open-source qrcode-generator library, and your list and logo are kept in your browser's local storage. Nothing you type is uploaded.</p>
      <p>PriceBoard is independent and isn't affiliated with Canva, Adobe, any booking app or any print shop. Sample businesses, phone numbers and prices are made up to show the layout. Our guides are general information, not financial, tax or legal advice.</p>
      <p>Selling gift certificates or running a loyalty card too? Try <a href="https://giftcert.roohsites.com/">GiftStub</a> for numbered gift certificates and <a href="https://punchcard.roohsites.com/">PunchPerk</a> for punch cards.</p>`,
});
P.push({
  path: "/privacy", crumb: "Privacy & Terms",
  title: "Privacy & Terms: Your Price List Never Leaves Your Device",
  desc: "How PriceBoard handles your data: services, prices, logos and settings are processed and stored on your device and never uploaded. Cookie-free analytics.",
  h1: "Privacy & Terms",
  lead: "Short version: your price list, logo and settings never leave your device.",
  noRelated: true, note: "",
  body: `      <h2>Privacy</h2>
      <p>PriceBoard runs entirely in your browser. Service names, prices, notes, logos and QR links are processed on your device to build the preview, the PDF and the PNG. They are never sent to our servers or to anyone else.</p>
      <p>To save you retyping, the tool remembers your last list and your logo in this browser's local storage. Clearing your browser's site data deletes it, and the <em>Reset</em> button clears it too. A very large logo is used for the visit but not saved.</p>
      <p>We use one privacy-friendly analytics service, Umami, to count page views and a few anonymous events, such as “PDF downloaded” with the page size and the number of services. It does not use cookies or track you across sites, and it never receives what you type into the tool.</p>
      <h2>Terms</h2>
      <p>PriceBoard is provided “as is”, without warranty. Check the preview and a test print before you print a batch, and scan the QR code before you rely on it. You are responsible for the prices and policies you publish and for following the rules that apply to your business, including any rules on posting prices. PriceBoard is free for personal and commercial use.</p>
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
