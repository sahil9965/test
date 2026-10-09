// Generates every PrepLabel page (home, guides, about, privacy) from one layout.
// Usage: node src/preplabel/pages.mjs   (writes into sites/preplabel/)
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/preplabel");
const require = createRequire(import.meta.url);
const Core = require(join(OUT, "core.js"));
const URL = "https://preplabel.vercel.app";
const NAME = "PrepLabel";
const ACCENT = "#c2410c";
const DATE = "2026-10-08", DATE_H = "8 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

const GUIDES = [
  ["/fnsku-label-2x1-thermal", "2x1 thermal FNSKU labels"],
  ["/dymo-30334-fnsku-labels", "DYMO 30334 FNSKU labels"],
  ["/fnsku-pdf-to-thermal", "Seller Central PDF to thermal"],
  ["/fnsku-labels-from-csv", "Bulk FNSKU labels from CSV"],
  ["/fnsku-zpl-zebra", "FNSKU ZPL for Zebra"],
  ["/suffocation-warning-label", "Suffocation warning labels"],
  ["/sold-as-set-label", "Sold as set labels"],
  ["/expiration-date-label", "Expiration date labels"],
  ["/bin-location-labels", "Bin location labels"],
  ["/fnsku-labeling-requirements-2026", "FNSKU labeling requirements 2026"],
];
const LEGAL = `PrepLabel is an independent tool. It is not affiliated with, endorsed by or sponsored by Amazon. Amazon, FBA and Seller Central are trademarks of Amazon.com, Inc. or its affiliates. Avery, Brother, DYMO, Zebra, Rollo and Munbyn are trademarks of their owners and are named only to describe compatible label sizes and printers.`;

function layout({ path, title, desc, ogTitle, ogDesc, h1, lead, badges, preset, tool, body, faq = [], graph = [], crumb }) {
  const url = URL + (path === "/" ? "/" : path);
  const ld = { "@context": "https://schema.org", "@graph": graph };
  const guideLinks = GUIDES.filter(([p]) => p !== path).map(([p, n]) => `<li><a href="${p}">${esc(n)}</a></li>`).join("");
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
    <nav aria-label="Main"><a href="/">FNSKU labels</a><a href="/fnsku-pdf-to-thermal">PDF to thermal</a><a href="/suffocation-warning-label">Prep labels</a><a href="/fnsku-labeling-requirements-2026">Requirements</a></nav>
  </header>
  <main id="main">
${crumb ? `    <p class="crumbs"><a href="/">${NAME}</a> › ${esc(crumb)}</p>\n` : ""}    <section class="hero">
      <h1>${esc(h1)}</h1>
      <p class="lead">${lead}</p>
${badges ? `      <ul class="badges">${badges.map(b => `<li>${b}</li>`).join("")}</ul>\n` : ""}    </section>
${tool ? `    <section class="tool card" aria-label="FNSKU and prep label generator"><div id="pl-tool"${preset ? ` data-preset="${preset}"` : ""}><noscript><p class="notice">PrepLabel needs JavaScript to build labels in your browser.</p></noscript></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? `      <h2 id="faq">${path === "/" ? "Frequently asked questions" : "FAQ"}</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}\n` : ""}${path === "/about" || path === "/privacy" ? "" : `      <h2>More PrepLabel guides</h2>
      <ul class="related">${path === "/" ? "" : `<li><a href="/">FNSKU label generator</a></li>`}${guideLinks}</ul>\n`}      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the MiniTools team. ${path === "/about" || path === "/privacy" ? "" : "General information, not legal advice. Amazon changes its rules, so confirm current requirements in Seller Central."}</p>
    </article>
  </main>
  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">FNSKU label generator</a></li><li><a href="/fnsku-pdf-to-thermal">PDF to thermal converter</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Guides</h4><ul>${GUIDES.map(([p, n]) => `<li><a href="${p}">${esc(n)}</a></li>`).join("")}</ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p class="legal">${LEGAL}</p>
    <p>© 2026 ${NAME} · Free tools that respect your privacy.</p>
  </footer>
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

const faqLd = faq => ({ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
const crumbLd = (path, name) => ({ "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` }, { "@type": "ListItem", position: 2, name, item: URL + path }] });
const appLd = (path, name, description, features) => ({ "@type": "WebApplication", name, url: URL + (path === "/" ? "/" : path), description, applicationCategory: "BusinessApplication", operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, ...(features ? { featureList: features } : {}), publisher: { "@type": "Organization", name: "MiniTools", url: `${URL}/about` } });

/* ---------------------------------------------------------------- sample ZPL for the Zebra guide */
const SAMPLE_ZPL = Core.toZpl([{ code: "X001ABC123", title: "Stainless Steel Water Bottle, 750 ml, Blue", condition: "New", qty: 24 }], Core.STOCK["r-2x1"], { dpi: 203, showTitle: true, showCondition: true, titleLines: "auto" }).zpl.trim();

/* ---------------------------------------------------------------- home */
const homeFaq = [
  ["Is PrepLabel really free?", "Yes. Every feature is free: unlimited FNSKU labels, CSV and Excel import, the Seller Central PDF converter, ZPL export, prep labels, bin labels, saved products and the print log. There is no account and no paid tier."],
  ["Do I need to sign in to Seller Central or give PrepLabel my account?", "No. PrepLabel never connects to Amazon. Copy the FNSKU codes from your inventory page or inventory report in Seller Central and paste or import them here."],
  ["Is PrepLabel affiliated with Amazon?", "No. PrepLabel is an independent tool and is not affiliated with, endorsed by or sponsored by Amazon. Always check current labeling rules in Seller Central."],
  ["What barcode type does an FNSKU label use?", "Code 128. PrepLabel encodes FNSKUs in Code 128 subset A, the variant Amazon's item-label specification names, draws every bar as vector artwork and snaps bar widths to your printer's dots."],
  ["Can I print on a partly used sheet of Avery 5160 labels?", "Yes. Choose the 30-per-sheet Letter stock and set Start at label to the first unused position. Labels are counted left to right, top to bottom."],
  ["Does PrepLabel add its name or a watermark to my labels?", "Never on a unit label or a warning label. Those carry only their own content. The only credit is a small line in the outer margin of full-sheet printouts and on the alignment test page."],
];
const homeSteps = [
  ["Find your FNSKUs", "In Seller Central, open your FBA inventory and copy each product's FNSKU (it usually starts with X00). The inventory report download has the same codes in an fnsku column."],
  ["Enter or import products", "Type each FNSKU with its title, condition and the number of units, or import a CSV or Excel file with one row per product."],
  ["Pick your label stock", "Choose a thermal roll such as 2 × 1 in or DYMO 30334, or a sheet such as 30-up Letter (Avery 5160 size) or 21-up A4. On a part-used sheet, set the first free position."],
  ["Download and print at 100%", "Click Download PDF and print at Actual size with scaling turned off. For Zebra printers you can download ZPL instead."],
  ["Test-scan one label", "Scan a test label with a barcode scanner or the Test & scan tab before labeling the whole shipment, then cover any other barcodes on each unit."],
];
const home = {
  path: "/",
  title: "FNSKU Label Generator — Free Thermal & Sheet Labels (PDF)",
  desc: "Free FNSKU label generator for 2x1 thermal rolls, DYMO 30334 and Avery 5160 sheets. Import CSV, convert Seller Central PDFs, print prep labels. No signup.",
  ogTitle: "FNSKU Label Generator — Free, No Signup",
  ogDesc: "Scannable Code 128 FNSKU labels for thermal rolls and sheets, plus suffocation, sold-as-set and expiry labels. Runs in your browser.",
  h1: "FNSKU Label Generator",
  lead: "Make scannable FNSKU barcode labels for thermal rolls and label sheets, turn Seller Central label PDFs into 2 × 1 in labels, and print suffocation, sold-as-set and expiry labels. Free, no signup, and nothing leaves your browser.",
  badges: ["100% free", "No signup", "Rollo, Zebra &amp; DYMO", "Vector PDF + ZPL"],
  tool: true,
  graph: [],
  faq: homeFaq,
  body: `      <p class="tldr"><strong>Quick answer:</strong> To make FNSKU labels, copy each product's FNSKU (the X00… code from your FBA inventory in Seller Central), enter it with the title, condition and number of units, choose your label stock (for example 2 × 1 in thermal or 30-up Letter sheets) and click <em>Download PDF</em>. Print at 100% scale and scan one test label before you label the whole shipment.</p>

      <h2 id="how">How to print FNSKU labels</h2>
      <ol class="steps">
${homeSteps.map(([n, t]) => `        <li><strong>${n}.</strong> ${t}</li>`).join("\n")}
      </ol>

      <h2>What goes on an FNSKU label</h2>
      <p>An FNSKU (Fulfillment Network Stock Keeping Unit) label tells the fulfillment center which seller owns a unit. Amazon's item-label specification lists four things, and PrepLabel prints exactly those four and nothing else:</p>
      <ul>
        <li><strong>A Code 128 barcode</strong> of the FNSKU, with clear space on both sides so scanners can read it.</li>
        <li><strong>The FNSKU in plain text</strong> under the bars, for example X001ABC123.</li>
        <li><strong>The product title</strong>, shortened in the middle when it's long so the size or colour at the end stays visible.</li>
        <li><strong>The condition</strong>, such as New or Used - Very Good.</li>
      </ul>
      <p>The code checker under each FNSKU flags typos: Amazon FNSKUs are 10 characters and usually start with X0, and some listings use the ASIN (B0…) instead. You can also print labels for your own SKUs, which is handy for multichannel stock.</p>

      <h2>Label sizes PrepLabel supports</h2>
      <table>
        <thead><tr><th>Label stock</th><th>Size</th><th>Typical printer</th></tr></thead>
        <tbody>
          <tr><td>2 × 1 in thermal roll</td><td>50.8 × 25.4 mm</td><td>Rollo, Zebra, Munbyn and other 4-inch desktop thermal printers</td></tr>
          <tr><td>2.25 × 1.25 in roll (DYMO 30334 size)</td><td>57.2 × 31.8 mm</td><td>DYMO LabelWriter</td></tr>
          <tr><td>3 × 1 in or 50 × 25 mm roll</td><td>76.2 × 25.4 / 50 × 25 mm</td><td>Thermal printers; 3 × 1 suits long SKUs</td></tr>
          <tr><td>62 × 29 mm (Brother DK-1209 size)</td><td>62 × 29 mm</td><td>Brother QL label printers</td></tr>
          <tr><td>US Letter, 30 per sheet (Avery 5160/8160 size)</td><td>2-5/8 × 1 in</td><td>Laser printer</td></tr>
          <tr><td>A4, 21 / 24 / 27 per sheet</td><td>63.5 × 38.1 / 33.9 / 29.6 mm</td><td>Laser printer (UK and EU)</td></tr>
          <tr><td>A4, 40 or 44 per sheet</td><td>52.5 × 29.7 / 48.5 × 25.4 mm</td><td>Laser printer</td></tr>
          <tr><td>Custom roll or sheet</td><td>Any size you enter in mm</td><td>Any</td></tr>
        </tbody>
      </table>
      <p>Thermal PDFs have one label per page at the exact label size, so the printer driver doesn't have to guess. If your labels are on a Seller Central sheet already, the <a href="/fnsku-pdf-to-thermal">PDF to thermal converter</a> cuts each one out and puts it on its own 2 × 1 in page.</p>

      <h2>Printer settings that make labels scan</h2>
      <ul>
        <li><strong>Print at 100% / Actual size.</strong> “Fit to page” shrinks the bars, and shrunken barcodes are a common reason labels fail at receiving.</li>
        <li><strong>Match the paper size.</strong> In the printer dialog, pick the label size that matches the PDF (for example 2 × 1 in or 50.8 × 25.4 mm), not Letter or A4.</li>
        <li><strong>Tell PrepLabel your printer's resolution.</strong> Bars are snapped to whole printer dots: 203 dpi for most Rollo, Zebra and Munbyn printers, 300 dpi for DYMO LabelWriter and some Zebra models.</li>
        <li><strong>Use a thermal or laser printer.</strong> Amazon recommends thermal or laser printing on white labels with removable adhesive. Inkjet ink can bleed into the gaps between bars.</li>
        <li><strong>Calibrate once.</strong> If labels drift off the edge, run your printer's gap calibration and use the alignment test page in the <em>Test &amp; scan</em> tab.</li>
      </ul>

      <h2>Why a barcode won't scan, and how to fix it</h2>
      <table>
        <thead><tr><th>Symptom</th><th>Likely cause</th><th>Fix</th></tr></thead>
        <tbody>
          <tr><td>Label prints small in a corner</td><td>Paper size in the print dialog doesn't match the label</td><td>Select the label size and print at 100%</td></tr>
          <tr><td>Bars look fuzzy or merged</td><td>Scaling, or the wrong printer resolution</td><td>Set 203 or 300 dpi under <em>Printer and alignment</em></td></tr>
          <tr><td>Faint or grey print</td><td>Darkness too low or old thermal labels</td><td>Raise darkness in the printer settings</td></tr>
          <tr><td>Scanner reads a different code</td><td>The manufacturer barcode is still visible</td><td>Cover every other barcode on the unit</td></tr>
          <tr><td>“Too long for this label” warning</td><td>Long SKU on a narrow label</td><td>Use a 3 × 1 in label or a shorter SKU</td></tr>
        </tbody>
      </table>

      <h2>Prep labels, bin labels and bulk printing</h2>
      <p>The <em>Prep labels</em> tab makes <a href="/suffocation-warning-label">suffocation warnings</a> sized from your bag dimensions (in English, French, German, Spanish, Italian and Dutch), <a href="/sold-as-set-label">sold as set / do not separate</a> stickers and <a href="/expiration-date-label">expiration date labels</a>. The <em>Bin labels</em> tab prints <a href="/bin-location-labels">location labels with QR codes</a> for your shelves. For a whole shipment, <a href="/fnsku-labels-from-csv">import a CSV or Excel file</a> with a quantity per SKU, or export <a href="/fnsku-zpl-zebra">ZPL for a Zebra printer</a>. Every PDF you download is listed in the print log, which you can export as CSV.</p>

      <h2>Free, private and made for resellers</h2>
      <p>Seller guides report that Amazon stopped applying FNSKU labels for US sellers on 1 January 2026 and ended commingling on 31 March 2026, so most resellers now label every unit themselves (see <a href="/fnsku-labeling-requirements-2026">FNSKU labeling requirements in 2026</a>). PrepLabel is built for that job: it's free, needs no account, and runs entirely in your browser. Product lists, saved libraries and the print log stay on your device, and PDFs you convert are never uploaded.</p>
`,
};
home.graph = [
  appLd("/", NAME, "Free FNSKU label generator. Makes Code 128 FNSKU labels for thermal rolls and label sheets, converts Seller Central label PDFs to thermal sizes and prints prep labels, entirely in the browser.", ["Code 128 FNSKU and SKU labels", "2 x 1 in, DYMO 30334 and 3 x 1 in thermal labels", "Avery 5160 size and A4 21-44 up sheets", "Start position for part-used sheets", "CSV and Excel import with quantities", "Seller Central PDF to thermal converter", "ZPL export for Zebra", "Suffocation warning labels in 6 languages", "Sold as set and expiration date labels", "Bin location labels with QR codes", "Alignment test page and camera scan-check", "Saved product libraries and print log", "No signup"]),
  { "@type": "HowTo", name: "How to print FNSKU labels", totalTime: "PT3M", step: homeSteps.map(([n, t]) => ({ "@type": "HowToStep", name: n, text: t })) },
  faqLd(homeFaq),
];

/* ---------------------------------------------------------------- landing pages */
const pages = [
  {
    path: "/fnsku-label-2x1-thermal", preset: "thermal-2x1", crumb: "2x1 thermal FNSKU labels",
    title: "FNSKU Labels for 2x1 Thermal Printers — Free PDF Maker",
    desc: "Make FNSKU labels sized for 2x1 inch thermal rolls on Rollo, Zebra and Munbyn printers. Bars snapped to 203 or 300 dpi, one label per page. Free.",
    h1: "FNSKU Labels for 2x1 Thermal Printers",
    lead: "One FNSKU label per page at exactly 2 × 1 in, with bars snapped to your printer's dots so they print sharp on Rollo, Zebra, Munbyn and similar printers.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> To print FNSKU labels on a 2 × 1 in thermal printer, enter your FNSKUs above with the 2 × 1 in roll selected, download the PDF, then print it with the paper size set to 2 × 1 in (50.8 × 25.4 mm) and scaling at 100%. Each PDF page is one label, so the printer feeds exactly one label per page.</p>
      <h2>Why 2 × 1 in labels need their own layout</h2>
      <p>FNSKU label PDFs from Seller Central are usually laid out for sheets of 21 to 44 labels. Sending a sheet layout to a thermal printer either shrinks the whole page onto one small label or prints a single corner of it. A 2 × 1 in label also leaves little room: an FNSKU barcode is 145 modules wide, so on 2 inches each bar module can only be about a quarter of a millimetre. That's fine for scanners if the bars are crisp, and crisp bars on a 203 dpi printer means every bar must be a whole number of printer dots.</p>
      <p>PrepLabel lays out each label at the real size and snaps the module width to the printer: two dots (0.25 mm) at 203 dpi or three dots (0.254 mm) at 300 dpi, with at least 1/4 in of clear space each side of the bars when it fits.</p>
      <h2>Settings for popular 2 × 1 in thermal printers</h2>
      <table>
        <thead><tr><th>Printer</th><th>Resolution</th><th>What to set when printing the PDF</th></tr></thead>
        <tbody>
          <tr><td>Rollo (USB or wireless)</td><td>203 dpi</td><td>Paper size 2 × 1 in (or 50.8 × 25.4 mm), scale 100%, orientation landscape</td></tr>
          <tr><td>Zebra desktop (GK420d, ZD411, ZD421 and similar)</td><td>203 or 300 dpi</td><td>Label size 2 × 1 in in the Zebra driver, Actual size; or skip the driver and <a href="/fnsku-zpl-zebra">send ZPL</a></td></tr>
          <tr><td>Munbyn and other 4-inch thermal printers</td><td>Usually 203 dpi</td><td>Add a 50.8 × 25.4 mm paper size in the driver if it's missing, scale 100%</td></tr>
        </tbody>
      </table>
      <p>Check your own model's resolution in its manual. If it differs, change it under <em>Printer and alignment</em> in the tool; the summary above the preview shows the resulting bar width in millimetres and mils.</p>
      <h2>How to print FNSKU labels on a Rollo</h2>
      <ol class="steps">
        <li>Load the 2 × 1 in roll and let the Rollo detect the label size and gap. If labels start to drift, re-run the label detection described in your Rollo's manual.</li>
        <li>Enter or import your FNSKUs above, keep <em>2 × 1 in thermal roll</em> selected and click <em>Download PDF</em>.</li>
        <li>Open the PDF and print to the Rollo. Choose the 2 × 1 in paper size and turn off “fit to page” or “scale to fit”.</li>
        <li>Print one label first, scan it, then print the rest. The PDF already contains one page per unit.</li>
      </ol>
      <h2>Fixing common 2 × 1 in problems</h2>
      <ul>
        <li><strong>Every label prints across two labels:</strong> the paper size is still Letter or 4 × 6. Select 2 × 1 in, then recalibrate the gap sensor.</li>
        <li><strong>Label is rotated or cut off:</strong> some drivers expect portrait pages. Set <em>Rotate each label</em> to 90° under <em>Printer and alignment</em>.</li>
        <li><strong>The title is cut short:</strong> 2 × 1 in has room for one title line. PrepLabel keeps the start and end of the title, or switch to a 2.25 × 1.25 in roll for two lines.</li>
        <li><strong>Long merchant SKUs don't fit:</strong> the tool warns when bars would get too thin. Use 3 × 1 in labels for SKUs over about 12 characters.</li>
      </ul>`,
    faq: [
      ["Will a 2 × 1 in FNSKU label scan at the fulfillment center?", "It should if it prints crisp at 100% scale with enough clear space around the bars. Amazon's guidance has described labels between 1 × 2 in and 2 × 3 in, and 2 × 1 in is a common choice. Test-scan a label before labeling a shipment."],
      ["Should I choose 203 dpi or 300 dpi?", "Choose the resolution your printer actually has. Most Rollo, Munbyn and entry-level Zebra printers are 203 dpi. PrepLabel uses it to size the bars in whole printer dots."],
      ["Can I print 2 × 1 in labels from a Mac or Chromebook?", "Yes. PrepLabel runs in the browser and makes a normal PDF, so any system that can print a PDF to your thermal printer works."],
      ["Why does my 2 × 1 in label print tiny in one corner?", "The print dialog is using a Letter or 4 × 6 paper size and shrinking the page. Pick the 2 × 1 in paper size and print at Actual size."],
    ],
  },
  {
    path: "/dymo-30334-fnsku-labels", preset: "dymo", crumb: "DYMO 30334 FNSKU labels",
    title: "DYMO 30334 FNSKU Labels — Free 2.25 x 1.25 in Label PDF",
    desc: "Print FNSKU labels on DYMO 30334 (2-1/4 x 1-1/4 in) rolls with a LabelWriter. Free PDF at the exact label size with 300 dpi bars and two title lines.",
    h1: "DYMO 30334 FNSKU Labels",
    lead: "FNSKU labels laid out for DYMO 30334 rolls (2-1/4 × 1-1/4 in), with bars sized for a 300 dpi LabelWriter and room for two title lines.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> To print FNSKU labels on DYMO 30334 labels, choose the <em>2.25 × 1.25 in (DYMO 30334 size)</em> stock above, add your FNSKUs, download the PDF and print it to your LabelWriter with the 30334 paper size at 100% scale. Each page of the PDF is one label.</p>
      <h2>Why DYMO 30334 works well for FNSKU labels</h2>
      <p>The 30334 label is 2-1/4 × 1-1/4 in (about 57 × 32 mm). That's a little wider and taller than a 2 × 1 in label, which gives the barcode more clear space and leaves room for a two-line product title. On a 300 dpi LabelWriter, PrepLabel draws each bar module three printer dots wide (0.254 mm, about 10 mil), so the FNSKU barcode is roughly 37 mm long with generous quiet zones on both sides.</p>
      <table>
        <thead><tr><th>Setting</th><th>PrepLabel default for DYMO 30334</th></tr></thead>
        <tbody>
          <tr><td>Page size</td><td>2.25 × 1.25 in (57.15 × 31.75 mm), one label per page</td></tr>
          <tr><td>Printer resolution</td><td>300 dpi (change it under <em>Printer and alignment</em>)</td></tr>
          <tr><td>Barcode</td><td>Code 128, bars snapped to whole printer dots</td></tr>
          <tr><td>Text</td><td>FNSKU, title on up to two lines, condition</td></tr>
        </tbody>
      </table>
      <h2>Printing the PDF on a LabelWriter</h2>
      <ol class="steps">
        <li>Load the 30334 roll and check the LabelWriter shows as ready in your system's printer list.</li>
        <li>Download the PDF from the tool above and open it in your PDF viewer or browser.</li>
        <li>In the print dialog choose the LabelWriter, then the paper size named for 30334 (it may appear as “30334 2-1/4 in x 1-1/4 in”).</li>
        <li>Set scale to 100% or Actual size and orientation to landscape, then print one label and scan it before printing the rest.</li>
      </ol>
      <p>You don't need DYMO's label software for this. If you prefer to use it anyway, the codes and titles you type here can be exported from the <em>Print log</em> as CSV.</p>
      <h2>Tips for DYMO FNSKU labels</h2>
      <ul>
        <li>If labels come out shifted, use <em>Nudge right</em> and <em>Nudge down</em> under <em>Printer and alignment</em>, and print the test label from the <em>Test &amp; scan</em> tab.</li>
        <li>If your printer's manual lists a different resolution, choose it under <em>Printer and alignment</em> so the bars line up with its dots.</li>
        <li>Thermal labels fade with heat and sunlight. Store rolls somewhere cool and label close to shipping day.</li>
        <li>For long merchant SKUs, a 3 × 1 in label gives the barcode more room than 30334.</li>
      </ul>
      <p>Using a different thermal printer? See <a href="/fnsku-label-2x1-thermal">2 × 1 in thermal FNSKU labels</a>, or <a href="/fnsku-pdf-to-thermal">convert a Seller Central label PDF</a> straight to the 30334 size.</p>`,
    faq: [
      ["What size is a DYMO 30334 label?", "2-1/4 × 1-1/4 inches, about 57 × 32 mm. PrepLabel's PDF pages are exactly that size."],
      ["Can I convert my Seller Central label PDF to DYMO 30334?", "Yes. Open the PDF to thermal tab, choose the 2.25 × 1.25 in size and drop in the PDF. Each label is cut out and placed on its own 30334-sized page."],
      ["Do I need DYMO Connect or DYMO Label software?", "No. Print the PDF from any PDF viewer or browser using the LabelWriter driver and the 30334 paper size."],
      ["Which resolution should I choose for a LabelWriter?", "Most LabelWriter models print at 300 dpi, which is PrepLabel's default for this stock. If your model is different, change it under Printer and alignment."],
    ],
  },
  {
    path: "/fnsku-pdf-to-thermal", preset: "convert", crumb: "Seller Central PDF to thermal",
    title: "Convert FNSKU Label PDF to Thermal (2x1, DYMO) — Free",
    desc: "Turn a Seller Central FNSKU label sheet PDF into 2x1 in or DYMO 30334 thermal labels, one per page. Barcodes stay vector. Free, and the PDF is never uploaded.",
    h1: "Convert an FNSKU Label PDF to Thermal Labels",
    lead: "Drop in the label PDF you downloaded from Seller Central. PrepLabel finds every label on the sheet and puts each one on its own 2 × 1 in, 2.25 × 1.25 in or 3 × 1 in page.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> To convert an FNSKU label PDF to thermal, download your labels from Seller Central on any sheet size, choose the PDF in the converter above, pick your roll size (for example 2 × 1 in) and click <em>Download thermal PDF</em>. Each label becomes one page at the roll size, ready to print at 100% on a thermal printer.</p>
      <h2>How the converter works</h2>
      <ol class="steps">
        <li><strong>It reads the PDF in your browser.</strong> The file is opened with a PDF reader built into the page. Nothing is uploaded.</li>
        <li><strong>It finds each label.</strong> Every FNSKU label has exactly one barcode, so the converter looks for barcodes and groups the text around each one: FNSKU, title and condition. Empty positions on a part-printed sheet are skipped.</li>
        <li><strong>It cuts each label out as vector artwork.</strong> The original drawing is reused and clipped to the label, not turned into a picture, so the bars stay sharp at any printer resolution.</li>
        <li><strong>It scales each label to fit your roll</strong>, keeps its proportions, centres it and adds the margin you choose.</li>
      </ol>
      <p>The thumbnails show what was found, numbered in reading order. Check the count matches the number of units before you print.</p>
      <h2>Which Seller Central sheet size to download</h2>
      <p>Labels are scaled to fit the roll, so the closer the source label is to your roll size, the less the barcode shrinks. For 2 × 1 in rolls, the smaller sheet formats (30-up Letter or 40- and 44-up A4) need the least scaling. Larger labels such as 21-up A4 also convert, they just shrink more.</p>
      <table>
        <thead><tr><th>Seller Central sheet</th><th>Label size</th><th>Converts to 2 × 1 in</th></tr></thead>
        <tbody>
          <tr><td>30 per sheet, US Letter</td><td>2-5/8 × 1 in</td><td>Good</td></tr>
          <tr><td>44 per sheet, A4</td><td>48.5 × 25.4 mm</td><td>Good</td></tr>
          <tr><td>40 per sheet, A4</td><td>52.5 × 29.7 mm</td><td>Good</td></tr>
          <tr><td>24 or 27 per sheet, A4</td><td>about 64-70 × 30-37 mm</td><td>OK, more shrinking</td></tr>
          <tr><td>21 per sheet, A4</td><td>63.5 × 38.1 mm</td><td>OK, more shrinking; consider 2.25 × 1.25 in rolls</td></tr>
        </tbody>
      </table>
      <h2>Batch conversion</h2>
      <p>You can choose several PDFs at once, for example one per shipment. The labels from all of them go into a single thermal PDF in the order the files were chosen. Very large PDFs (hundreds of pages) take a little longer because each page is read on your device.</p>
      <h2>When to make labels from scratch instead</h2>
      <p>If you're starting from a list of FNSKUs rather than a PDF, the <a href="/">FNSKU label generator</a> builds thermal labels directly, with bars snapped to your printer's dots. It also handles <a href="/fnsku-labels-from-csv">CSV imports with quantities</a> and <a href="/fnsku-zpl-zebra">ZPL for Zebra printers</a>.</p>`,
    faq: [
      ["Is my Seller Central PDF uploaded anywhere?", "No. The PDF is read and converted inside your browser. It never leaves your device, which you can confirm by going offline after the page has loaded."],
      ["Will the barcode still scan after converting?", "The bars are copied as vector artwork and only scaled, so they stay sharp. Scaling does make bars thinner, so test-scan one converted label, and prefer the 30-up or 44-up sheet formats for 2 × 1 in rolls."],
      ["Does it work with scanned or photographed label sheets?", "Clean scans usually work because the converter looks at the rendered page. Photos taken at an angle don't. Download the original PDF from Seller Central whenever you can."],
      ["Can I convert to DYMO 30334 or 3 × 1 in labels?", "Yes. Choose 2.25 × 1.25 in (DYMO 30334 size), 3 × 1 in, 50 × 25 mm or a custom roll size before downloading."],
    ],
  },
  {
    path: "/fnsku-labels-from-csv", preset: "csv", crumb: "Bulk FNSKU labels from CSV",
    title: "Bulk FNSKU Labels from CSV or Excel — Free Label Generator",
    desc: "Print FNSKU labels in bulk from a CSV or Excel file with a quantity per SKU. Works with Seller Central inventory reports. Thermal or sheet PDF, free.",
    h1: "Bulk FNSKU Labels from a CSV or Excel File",
    lead: "Import a spreadsheet with an FNSKU and quantity per row and get every unit label for the shipment in one PDF, on thermal rolls or sheets.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> To print FNSKU labels in bulk, make a CSV or Excel file with the columns <code>fnsku</code>, <code>title</code>, <code>condition</code> and <code>quantity</code>, click <em>Import CSV / Excel</em> above, check the summary and click <em>Replace my list</em>. The PDF then has one label per unit, grouped by SKU, up to 5,000 labels per file.</p>
      <h2>CSV format</h2>
      <p>One row per product. Column order doesn't matter when the first row has headers; these names are recognised (upper or lower case, spaces or dashes):</p>
      <table>
        <thead><tr><th>Field</th><th>Header names recognised</th><th>Required?</th></tr></thead>
        <tbody>
          <tr><td>FNSKU or SKU</td><td>fnsku, fulfillment-network-sku, barcode, sku, seller-sku, asin</td><td>Yes</td></tr>
          <tr><td>Title</td><td>title, product-name, item-name, name, description</td><td>No</td></tr>
          <tr><td>Condition</td><td>condition, condition-type</td><td>No (defaults to New)</td></tr>
          <tr><td>Quantity</td><td>quantity, qty, units, labels, copies, units-to-send</td><td>No (defaults to 1)</td></tr>
        </tbody>
      </table>
      <p>When both <code>fnsku</code> and <code>sku</code> columns exist, the FNSKU column is used for the barcode. Files without headers work too: the first column is read as the code and a mostly-numeric column as the quantity. Commas, semicolons and tabs are all detected.</p>
      <pre><code>fnsku,title,condition,quantity
X001ABC123,"Water bottle, 750 ml, blue",New,24
X002DEF456,Ceramic mug set of 4,New,12
X003GHI789,Used hardcover cookbook,Used - Very Good,1</code></pre>
      <h2>Using a Seller Central inventory report</h2>
      <p>The inventory report you can download from Seller Central is a tab-separated file that already has <code>fnsku</code>, <code>product-name</code> and <code>condition</code> columns. Add a <code>quantity</code> column with the units you're sending, save it, and import it as it is. Rows with a quantity of 0 are skipped and listed in the import summary with their line numbers, so you can see what was left out.</p>
      <h2>Pasting from Google Sheets or Excel</h2>
      <p>No file needed: select the rows in your spreadsheet, copy, and paste them into the box under <em>Bulk import</em>. Copied cells arrive tab-separated, which the importer reads the same way as a file.</p>
      <h2>Reprints, client libraries and the print log</h2>
      <ul>
        <li><strong>Saved products:</strong> save the current list to a library and add products back with one click next time. Prep centers can keep a separate library per client.</li>
        <li><strong>Print log:</strong> every PDF or ZPL download is logged with the shipment name, SKUs and quantities. Export it as CSV to reconcile against your shipment.</li>
        <li><strong>Everything stays local:</strong> the file is read in your browser, and libraries and the log live in this browser's storage.</li>
      </ul>`,
    faq: [
      ["How many labels can I print from one CSV?", "Up to 5,000 labels per PDF. For bigger runs, split the file by shipment or SKU group and print in batches."],
      ["Can I import an .xlsx file directly?", "Yes. PrepLabel reads the first worksheet of an .xlsx file. Older .xls files need to be saved as .xlsx or CSV first."],
      ["What if my file has no quantity column?", "Each product gets one label. You can then change the number of labels for each product in the list before downloading."],
      ["Can I add expiration dates from the CSV?", "Expiration dates go on separate labels, not on the FNSKU unit label. Use the Prep labels tab to print expiration date labels."],
    ],
  },
  {
    path: "/fnsku-zpl-zebra", preset: "zpl", crumb: "FNSKU ZPL for Zebra",
    title: "FNSKU Label ZPL for Zebra Printers — Free ZPL Export",
    desc: "Export FNSKU labels as ZPL for Zebra thermal printers: Code 128 barcode, title and condition, ^PQ quantities, 203 or 300 dpi. Free, nothing to install.",
    h1: "FNSKU Label ZPL for Zebra Printers",
    lead: "Download ready-to-send ZPL for your FNSKU labels: one format per SKU with the quantity built in, sized for 203 or 300 dpi Zebra printers.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> To print FNSKU labels from ZPL, add your FNSKUs above, choose a thermal roll size, set your printer's resolution under <em>Printer and alignment</em> and click <em>Download ZPL (Zebra)</em>. Send the .zpl file to the printer with Zebra Setup Utilities, a shared-printer copy command or port 9100. Quantities are printed by the printer itself with <code>^PQ</code>.</p>
      <h2>What the ZPL looks like</h2>
      <p>This is the exact output for one 2 × 1 in label at 203 dpi with a quantity of 24:</p>
      <pre><code>${esc(SAMPLE_ZPL)}</code></pre>
      <table>
        <thead><tr><th>Command</th><th>What it does here</th></tr></thead>
        <tbody>
          <tr><td><code>^PW406 ^LL203</code></td><td>Label width and length in dots: 2 × 1 in at 203 dpi</td></tr>
          <tr><td><code>^BY2 ^BCN</code></td><td>Code 128 barcode with 2-dot modules, no interpretation line (the FNSKU is printed separately)</td></tr>
          <tr><td><code>^FB … ,C ^A0N</code></td><td>Centred text block in Zebra's scalable font for the FNSKU, title and condition</td></tr>
          <tr><td><code>^FH\\</code></td><td>Lets special characters such as ^ and ~ be sent as hex codes</td></tr>
          <tr><td><code>^PQ24</code></td><td>Print 24 copies of this label</td></tr>
        </tbody>
      </table>
      <h2>How to send ZPL to a Zebra printer</h2>
      <ul>
        <li><strong>Zebra Setup Utilities (Windows):</strong> select the printer, open the communication window and send the .zpl file.</li>
        <li><strong>Shared printer on Windows:</strong> share the Zebra printer, then run <code>copy /b fnsku-labels.zpl \\\\localhost\\ZebraShareName</code> in Command Prompt.</li>
        <li><strong>Network printer:</strong> send the file to port 9100, for example <code>nc 192.168.1.50 9100 &lt; fnsku-labels.zpl</code> on macOS or Linux.</li>
        <li><strong>macOS or Linux with CUPS:</strong> add the printer as a raw queue and print the file with <code>lp -o raw</code>.</li>
      </ul>
      <h2>ZPL or PDF?</h2>
      <p>ZPL skips the printer driver, so there's no paper-size or scaling dialog to get wrong, and a run of 200 labels is a few kilobytes. PDF works with every printer, including Rollo, DYMO and printers that don't understand ZPL, and shows exactly what you'll get. Both use the same layout. Set the resolution to match the printer: a 203 dpi file on a 300 dpi printer prints about two thirds of the intended size.</p>
      <p>Before sending a big batch, print a single copy (change the quantity to 1) and scan it. If the barcode sits off-centre, check the label width setting on the printer matches the roll.</p>`,
    faq: [
      ["Which Zebra printers accept this ZPL?", "Zebra desktop and industrial printers that use ZPL II, such as the GK, GX, ZD and ZT series. Printers from other brands may emulate ZPL; check your manual, or use the PDF instead."],
      ["How do I print several copies of each label?", "Set the number of labels per product in the list. Each SKU becomes one ^XA…^XZ format ending in ^PQ with that quantity, so the printer repeats it."],
      ["Why is my label printing too small or too large?", "The ZPL was made for a different resolution. Choose 203 or 300 dpi under Printer and alignment to match the printer, then export again."],
      ["Does the ZPL include anything besides the label content?", "No. It contains only the barcode, FNSKU, title and condition. No credit or branding is added to unit labels."],
    ],
  },
  {
    path: "/suffocation-warning-label", preset: "suffocation", crumb: "Suffocation warning labels",
    title: "Suffocation Warning Labels — Free Printable Template (PDF)",
    desc: "Printable suffocation warning labels with the font size picked from your poly bag size. English, French, German, Spanish, Italian and Dutch. Free PDF.",
    h1: "Printable Suffocation Warning Labels",
    lead: "Enter the bag size and PrepLabel picks the minimum font size, fits the warning on your labels and makes a print-ready PDF in up to six languages.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Amazon's poly bag guidance asks for a suffocation warning on bags with an opening of 5 in (12.7 cm) or more, measured flat, either printed on the bag or as a label. The minimum text size depends on length + width of the bag: under 29 in → 10 pt, 30-39 in → 14 pt, 40-59 in → 18 pt, 60 in or more → 24 pt. Enter your bag size above and the tool checks the label meets it.</p>
      <h2>Suffocation warning font size by bag size</h2>
      <table>
        <thead><tr><th>Bag length + width</th><th>Minimum font size</th><th>Example bag</th></tr></thead>
        <tbody>
          <tr><td>Under 29 in (about 74 cm)</td><td>10 pt</td><td>9 × 12 in → 21 in</td></tr>
          <tr><td>30-39 in (about 76-99 cm)</td><td>14 pt</td><td>14 × 20 in → 34 in</td></tr>
          <tr><td>40-59 in (about 102-150 cm)</td><td>18 pt</td><td>18 × 24 in → 42 in</td></tr>
          <tr><td>60 in or more (about 152 cm)</td><td>24 pt</td><td>24 × 36 in → 60 in</td></tr>
        </tbody>
      </table>
      <p>This is the table as seller guides and forum posts quote it from Amazon's poly bag requirements. It jumps from “under 29 in” to “30-39 in”, so PrepLabel uses 14 pt for anything from 29 in up, to stay on the safe side. Check the current poly bag page in Seller Central Help before buying label stock.</p>
      <h2>What the warning says</h2>
      <p>The standard English text, as shown in Amazon's sample, is:</p>
      <blockquote class="note"><strong>WARNING:</strong> To avoid danger of suffocation, keep this plastic bag away from babies and children. Do not use this bag in cribs, beds, carriages or play pens. This bag is not a toy.</blockquote>
      <p>PrepLabel also includes French, German, Spanish, Italian and Dutch versions for European marketplaces. They're careful translations of the same warning, not official texts, so have a native speaker check them if your marketplace or local law requires specific wording. You can replace the text with your own under <em>Edit the warning text</em>.</p>
      <h2>Choosing a label size</h2>
      <p>The required font size is a physical size, so the label has to be big enough to hold the whole warning at that size. These are the text sizes PrepLabel reaches with the standard English warning:</p>
      <table>
        <thead><tr><th>Minimum for your bag</th><th>Smallest label stock that reaches it (English)</th></tr></thead>
        <tbody>
          <tr><td>10 pt</td><td>2-5/8 × 1 in, 30-up Letter (10.4 pt) or 2 × 2 in roll (12.2 pt)</td></tr>
          <tr><td>14 pt</td><td>3 × 2 in roll (15.3 pt) or 4 × 2 in (17.9 pt)</td></tr>
          <tr><td>18 pt</td><td>4 × 3 in roll (21.5 pt) or A4 8-up, 99.1 × 67.7 mm (20.5 pt)</td></tr>
          <tr><td>24 pt</td><td>4 × 6 in roll (31.9 pt) or a full sheet cut to size</td></tr>
        </tbody>
      </table>
      <p>More languages need more room: English and French together reach 10 pt on a 4 × 2 in label (11.4 pt) and 14 pt only on 4 × 6 in (20.1 pt), and all six languages reach 10 pt only on a 4 × 6 in label (11.3 pt). The tool shows the size it achieved and turns red if it's below the minimum for your bag.</p>
      <ul>
        <li><strong>Thermal:</strong> 4 × 2, 4 × 3 and 4 × 6 in rolls work on most 4-inch thermal printers.</li>
        <li><strong>Laser sheets:</strong> 10-up Letter (4 × 2 in), 14-up or 8-up A4, or full sheets with <em>Outline each label</em> ticked as a cutting guide.</li>
        <li><strong>Placement:</strong> put the warning where it's easy to see and don't cover the FNSKU barcode.</li>
      </ul>
      <p>Bags that already have a printed warning don't need a sticker. Warning labels never carry PrepLabel's name; the small credit appears only in the outer margin of full sheets.</p>`,
    faq: [
      ["What font size does a suffocation warning need?", "It depends on the bag's length plus width: under 29 in, 10 pt; 30 to 39 in, 14 pt; 40 to 59 in, 18 pt; 60 in or more, 24 pt. PrepLabel rounds the 29 to 30 in gap up to 14 pt."],
      ["Which poly bags need a suffocation warning?", "Amazon's poly bag guidance applies the warning to bags with an opening of 5 inches (12.7 cm) or more, measured when flat. The warning can be printed on the bag or attached as a label."],
      ["Can I print suffocation warnings in other languages?", "Yes. Tick French, German, Spanish, Italian or Dutch to add those versions on the same label. Have a native speaker review translations used for compliance."],
      ["Are these labels free to use commercially?", "Yes. Print as many as you like for your products. There's no watermark on the labels themselves."],
    ],
  },
  {
    path: "/sold-as-set-label", preset: "set", crumb: "Sold as set labels",
    title: "Sold as Set — Do Not Separate Labels (Free Printable PDF)",
    desc: "Print “Sold as set / Do not separate” and “This is a set” labels for FBA bundles on thermal rolls or Avery-size sheets. Big bold text, free PDF, no signup.",
    h1: "Sold as Set / Do Not Separate Labels",
    lead: "Big, bold “SOLD AS SET — DO NOT SEPARATE” stickers for bundles and multipacks, on 2 × 1 in rolls, 30-up sheets or any size you need.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Amazon asks for units sold as a set to be marked on the packaging with a label saying they're received and sold as one unit, for example “Sold as set”, “Ready to ship” or “This is a set. Do not separate.” Choose the wording above, pick your label size, set how many you need and download the PDF.</p>
      <h2>When a set label is needed</h2>
      <p>Use one whenever several items are sold together under one FNSKU: bundles you build yourself, multipacks of the same product, or retail sets whose box could be mistaken for separate items. The label tells fulfillment center staff not to split the package and not to scan the barcodes on the individual items.</p>
      <h2>Wording options</h2>
      <table>
        <thead><tr><th>Wording in PrepLabel</th><th>Good for</th></tr></thead>
        <tbody>
          <tr><td>SOLD AS SET / DO NOT SEPARATE</td><td>Bundles and multipacks (the most common choice)</td></tr>
          <tr><td>THIS IS A SET / DO NOT SEPARATE</td><td>The same message in Amazon's sample wording</td></tr>
          <tr><td>SOLD AS SET</td><td>Small labels where two lines won't fit</td></tr>
          <tr><td>READY TO SHIP</td><td>Another of Amazon's example wordings for sets</td></tr>
          <tr><td>DO NOT SEPARATE</td><td>Items taped or banded together</td></tr>
          <tr><td>Your own wording</td><td>Other languages or extra instructions</td></tr>
        </tbody>
      </table>
      <p>Add the number of items to print a smaller “Set of 6 items” line under the main text, which helps when someone checks the package is complete.</p>
      <h2>How to prep a set for FBA</h2>
      <ol class="steps">
        <li>Put all items in one bag, shrink-wrap or box so they can't come apart in transit.</li>
        <li>Cover every barcode on the individual items, so only the set's FNSKU can be scanned.</li>
        <li>Apply the set's own FNSKU label to the outside. Make it with the <a href="/">FNSKU label generator</a>.</li>
        <li>Add the sold-as-set label where it's easy to see, without covering the FNSKU barcode.</li>
        <li>If the set is in a poly bag with an opening of 5 in or more, add a <a href="/suffocation-warning-label">suffocation warning</a> too.</li>
      </ol>
      <h2>Sizes and printing</h2>
      <p>On a 2 × 1 in thermal label, “SOLD AS SET / DO NOT SEPARATE” prints at roughly 20 pt for the main line, easy to read from arm's length. On sheets, use <em>Fill the sheet</em> to print a whole page at once, and <em>Start at label</em> to use up a part-used sheet. The text always sizes itself to the largest that fits your label.</p>`,
    faq: [
      ["What should a sold as set label say?", "Amazon's examples are “Sold as set”, “Ready to ship” and “This is a set. Do not separate.” PrepLabel offers these and lets you type your own wording."],
      ["Does the set need its own FNSKU?", "Yes. The set is listed and received as one unit, so it needs its own FNSKU label on the outside, and the barcodes on the items inside must be covered."],
      ["What size label should I use?", "A 2 × 1 in or 2-5/8 × 1 in label is enough for “SOLD AS SET / DO NOT SEPARATE”. Use a bigger label for large boxes so it's visible from a distance."],
      ["Can I print sold as set labels on Avery 5160 sheets?", "Yes. Choose the 30 per sheet Letter stock, click Fill the sheet and download the PDF."],
    ],
  },
  {
    path: "/expiration-date-label", preset: "expiry", crumb: "Expiration date labels",
    title: "FBA Expiration Date Labels — Free Printable EXP Date Labels",
    desc: "Print FBA expiration date labels in MM-DD-YYYY or MM-YYYY with optional lot numbers. Large text sized to your label, thermal or sheet PDF. Free, no signup.",
    h1: "FBA Expiration Date Labels",
    lead: "Large, clear expiration date stickers in the formats Amazon asks for, with an optional lot number, for units and cartons.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> For expiration-dated products, Amazon's guidance asks for the date in MM-DD-YYYY or MM-YYYY format on each unit and on the shipping carton, and seller guides cite 36 pt or larger text on cartons. Pick the date and format above, add a lot number if you want one, choose a label size and download the PDF. The tool shows the text size it reached.</p>
      <h2>Date formats</h2>
      <table>
        <thead><tr><th>Format</th><th>Example</th><th>When to use it</th></tr></thead>
        <tbody>
          <tr><td>MM-DD-YYYY</td><td>03-31-2027</td><td>Default for US expiration-dated products</td></tr>
          <tr><td>MM-YYYY</td><td>03-2027</td><td>Also accepted when the day isn't printed</td></tr>
          <tr><td>DD-MMM-YYYY</td><td>31-MAR-2027</td><td>Month as letters; seller guides report this is accepted too</td></tr>
          <tr><td>YYYY-MM-DD</td><td>2027-03-31</td><td>Medical devices, per seller guides</td></tr>
          <tr><td>DD-MM-YYYY</td><td>31-03-2027</td><td>Some European marketplaces; confirm in your Seller Central</td></tr>
        </tbody>
      </table>
      <p>If the original packaging shows the date in another format, or only shows a manufacturing date, cover it with a label in the accepted format. A lot number on its own isn't treated as an expiration date.</p>
      <h2>Text size: units vs cartons</h2>
      <p>The 36 pt figure seller guides quote is for the outside of the shipping box, where staff need to read the date at a glance. 36 pt is a type size of half an inch (12.7 mm), so “EXP 03-31-2027” at that size needs a label of about 3 × 2 in or larger (PrepLabel reaches 38 pt on 3 × 2 in and 52 pt on 4 × 2 in). Unit labels can be smaller, as long as the date is easy to read. The tool reports the size reached on the label you choose and tells you when it hits 36 pt.</p>
      <h2>Shelf life rules to plan for</h2>
      <ul>
        <li>Seller guides quoting Amazon's policy say units need more than 90 days of shelf life left when they arrive, and units within 50 days of expiry are removed from sale.</li>
        <li>Each box should contain only one expiration date per ASIN. Split units with different dates into different boxes.</li>
        <li>Expiration labels are separate from the FNSKU label. PrepLabel keeps unit FNSKU labels to barcode, FNSKU, title and condition.</li>
      </ul>
      <h2>Multipacks, bundles and case packs</h2>
      <p>Seller guides describe the date going on the outer box or bundle <em>and</em> on every item inside it. If the items in a bundle you build have different dates, put the earliest one on the bundle label so nothing is sold past its date. Print the outer-box label at 36 pt or larger (4 × 2 in or bigger) and the unit labels on 2 × 1 in or 30-up sheets: choose the stock, set <em>Number of labels</em> or click <em>Fill the sheet</em>, and download each set.</p>
      <p>Rules differ by category and marketplace, so confirm the current expiration-dated product requirements in Seller Central Help before you ship.</p>`,
    faq: [
      ["What date format does Amazon FBA require?", "Amazon's guidance for US expiration-dated products asks for MM-DD-YYYY or MM-YYYY. Medical devices use YYYY-MM-DD. Check Seller Central for other marketplaces."],
      ["How big should the expiration date be?", "Seller guides cite 36 pt or larger on cartons. On units, the date needs to be clearly readable. PrepLabel shows the text size it reached on your label."],
      ["Can I add a lot number?", "Yes. Type it in the lot field and it prints in smaller text under the date. A lot number alone doesn't replace the expiration date."],
      ["Can the expiration date go on the FNSKU label?", "PrepLabel keeps the FNSKU unit label to the barcode, FNSKU, title and condition, and prints expiration dates as separate labels."],
    ],
  },
  {
    path: "/bin-location-labels", preset: "bin", crumb: "Bin location labels",
    title: "Printable Bin Location Labels with QR Codes — Free PDF",
    desc: "Make printable bin and shelf location labels with QR codes or Code 128 barcodes. Number ranges like A-01-01 to A-01-24, any label size. Free, no signup.",
    h1: "Printable Bin Location Labels",
    lead: "Big location codes with a QR code or Code 128 barcode for shelves, bins and racks, generated from a list or a number range.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> To make bin location labels, type your location codes one per line (or use <em>Add a numbered range</em> to create A-01-01 to A-01-24), pick QR code or Code 128, choose a label size and download the PDF. Each label shows the code in large bold text next to a scannable code.</p>
      <h2>Naming your locations</h2>
      <p>A good location code reads from big to small, so anyone can walk to it: zone or aisle, then rack or bay, then shelf, then bin. Keep the same number of digits everywhere so codes sort in order.</p>
      <table>
        <thead><tr><th>Scheme</th><th>Example</th><th>Reads as</th></tr></thead>
        <tbody>
          <tr><td>Aisle-Shelf-Bin</td><td>A-03-12</td><td>Aisle A, shelf 3, bin 12</td></tr>
          <tr><td>Zone-Rack-Level-Position</td><td>Z1-R04-L2-P05</td><td>Zone 1, rack 4, level 2, position 5</td></tr>
          <tr><td>Simple bins</td><td>BIN-0042</td><td>Bin 42 in a small stockroom</td></tr>
        </tbody>
      </table>
      <p>Add a description after a vertical bar to print it under the code, for example <code>A-03-12 | Phone cases</code>.</p>
      <h2>QR code or Code 128?</h2>
      <table>
        <thead><tr><th></th><th>QR code</th><th>Code 128 barcode</th></tr></thead>
        <tbody>
          <tr><td>Scanners</td><td>Phone cameras and 2D scanners</td><td>Any barcode scanner, including older 1D laser scanners</td></tr>
          <tr><td>Label shape</td><td>Fits square and small labels</td><td>Needs a wide label for longer codes</td></tr>
          <tr><td>Reading angle</td><td>Any direction</td><td>Scanner roughly across the bars</td></tr>
        </tbody>
      </table>
      <p>If your inventory app scans with a phone, QR codes are the easy choice. If your team uses handheld laser scanners, choose Code 128.</p>
      <h2>Printing and placing bin labels</h2>
      <ul>
        <li>For shelf edges, 2-5/8 × 1 in (30-up Letter) or 2 × 1 in thermal labels fit most shelf lips. For bins and totes, 4 × 2 in labels are easier to read from a distance.</li>
        <li>Put labels at the same spot on every bin, ideally at eye level for the top shelves and on the shelf edge below each bin for floor-level ones.</li>
        <li>Print a spare set with <em>Copies of each label</em>, and use clear tape or laminate on labels that get handled a lot.</li>
        <li>The same codes work as SKU labels for your own stock. For Amazon inventory, use <a href="/">FNSKU labels</a> instead.</li>
      </ul>
      <h2>Labeling a whole rack in one go</h2>
      <p>Build the list one shelf at a time with <em>Add a numbered range</em>: prefix <code>A-01-</code> from 1 to 10 for the first shelf, then <code>A-02-</code> from 1 to 10 for the next, and so on. Each range is added to the end of the list, so the PDF comes out in walking order. Choose <em>Copies of each label</em> = 2 when a bin needs a label on the front and the side, and keep the codes in a spreadsheet so you can reprint a single damaged label later by pasting just that line.</p>`,
    faq: [
      ["Can I print bin labels on Avery 5160 sheets?", "Yes. Choose US Letter 30 per sheet, enter your codes and download the PDF. Set the start position to use up a part-used sheet."],
      ["How do I make a range of location codes?", "Open Add a numbered range, enter a prefix such as A-01-, the first and last number and how many digits to pad to, then click Add range."],
      ["Do QR bin labels work with phone inventory apps?", "Yes. The QR code contains just the location code as plain text, which phone cameras and most inventory apps can read."],
      ["Is there a limit on how many labels I can make?", "You can make up to 5,000 labels per PDF, from up to 2,000 location codes at a time."],
    ],
  },
  {
    path: "/fnsku-labeling-requirements-2026", tool: false, article: true, crumb: "FNSKU labeling requirements 2026",
    title: "FNSKU Labeling Requirements 2026: What FBA Sellers Must Do",
    desc: "What changed for FNSKU labels in 2026: the end of the Amazon US prep and label service and of commingling, plus label size, printing and placement rules.",
    h1: "FNSKU Labeling Requirements (2026)",
    lead: "What changed in 2026, who now has to label every unit, and the label rules that haven't changed. Checked on 8 October 2026.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Seller guides and Seller Forums posts quoting Amazon's announcements report two US changes in 2026: Amazon stopped offering FBA prep and item labeling for shipments created from 1 January 2026, and ended commingling on 31 March 2026. Since then, sellers who aren't the brand's Brand Representative in Brand Registry generally need an FNSKU label on every unit, even when it has a UPC or EAN. Confirm your own barcode setting in Seller Central.</p>
      <h2>What changed in 2026</h2>
      <table>
        <thead><tr><th>Change</th><th>Date (as reported)</th><th>What it means</th></tr></thead>
        <tbody>
          <tr><td>Amazon's US FBA prep and item labeling service ends</td><td>Shipments created from 1 January 2026</td><td>Amazon no longer applies FNSKU labels, bags or bundles for you. You or your prep center do it before shipping.</td></tr>
          <tr><td>Commingling (stickerless inventory) ends</td><td>31 March 2026</td><td>Units from different sellers are no longer pooled under the manufacturer barcode. Resellers label their own units with FNSKUs.</td></tr>
          <tr><td>Manufacturer barcode eligibility updated</td><td>From 31 March 2026</td><td>According to seller guides, only sellers with the Brand Representative role can keep using UPC/EAN barcodes for tracking.</td></tr>
        </tbody>
      </table>
      <p>We couldn't open Amazon's own announcement pages to check the exact wording, which need a Seller Central login. The dates above match several independent seller guides, such as <a href="https://www.gs1uk.org/insights/news/Amazon-new-FNSKU-labelling-requirement-what-you-need-to-know" rel="noopener">GS1 UK's summary</a>, and Seller Forums posts quoting the announcements. Read the announcement in your own Seller Central account before changing your process.</p>
      <h2>FNSKU label rules that haven't changed</h2>
      <table>
        <thead><tr><th>Rule</th><th>What to do</th><th>How PrepLabel helps</th></tr></thead>
        <tbody>
          <tr><td>Label content</td><td>Code 128 barcode, the FNSKU, product title and condition</td><td>Prints exactly these four, nothing else</td></tr>
          <tr><td>Label size</td><td>Amazon's guidance has described sizes between 1 × 2 in and 2 × 3 in</td><td>2 × 1, 2.25 × 1.25 and 3 × 1 in rolls; 21- to 44-up sheets</td></tr>
          <tr><td>Print quality</td><td>Black on white, non-reflective labels with removable adhesive; thermal or laser printer; 100% scale</td><td>Vector PDFs with bars snapped to printer dots; alignment test page</td></tr>
          <tr><td>Clear space</td><td>Blank space around the bars so they scan</td><td>Quiet zone of 1/4 in each side when the label allows</td></tr>
          <tr><td>Placement</td><td>On a flat outside surface, not across edges, corners or seams</td><td>Labels sized for the label stock you use</td></tr>
          <tr><td>Other barcodes</td><td>Cover every other scannable barcode on the unit</td><td>Scan-check to confirm the right code reads</td></tr>
        </tbody>
      </table>
      <h2>Related prep requirements</h2>
      <ul>
        <li><strong>Sets and bundles:</strong> mark them as sets, for example “Sold as set” or “This is a set. Do not separate”, with one FNSKU on the outside. See <a href="/sold-as-set-label">sold as set labels</a>.</li>
        <li><strong>Poly bags:</strong> bags with an opening of 5 in or more need a suffocation warning, with a minimum font size based on the bag size. See <a href="/suffocation-warning-label">suffocation warning labels</a>.</li>
        <li><strong>Expiration-dated products:</strong> dates in MM-DD-YYYY or MM-YYYY on units and cartons. See <a href="/expiration-date-label">expiration date labels</a>.</li>
      </ul>
      <h2>A labeling workflow that scales</h2>
      <ol class="steps">
        <li>Create the shipment in Seller Central and note the FNSKU and unit count for each product.</li>
        <li>Import the list into the <a href="/fnsku-labels-from-csv">bulk FNSKU label generator</a>, or <a href="/fnsku-pdf-to-thermal">convert the label PDF Seller Central gives you</a> to your thermal roll size.</li>
        <li>Print one test label, scan it, then print the run. Keep the print log CSV with the shipment.</li>
        <li>Cover old barcodes, apply FNSKU labels on a flat face, add any prep labels, and pack.</li>
      </ol>
      <p>Brand owners with the Brand Representative role may be able to keep using manufacturer barcodes. Everyone else should plan on labeling every unit. If you use a prep center, ask which label stock it uses so your PDFs match.</p>`,
    faq: [
      ["Does Amazon still put FNSKU labels on my products for a fee?", "Not in the US for shipments created from 1 January 2026, according to the announcement as reported by seller guides. Sellers or their prep centers now apply labels before shipping."],
      ["Do Brand Registry sellers need FNSKU labels?", "Reports say sellers with the Brand Representative role in Brand Registry can keep using manufacturer barcodes. Resellers without that role need FNSKU labels. Check the barcode setting for each offer in Seller Central."],
      ["What has to be on an FNSKU label?", "A scannable Code 128 barcode of the FNSKU, the FNSKU in text, the product title and the condition. Nothing else needs to be on the unit label."],
      ["What happens if an FNSKU label doesn't scan?", "Unscannable or missing labels can cause receiving problems, delays and possible fees. Print at 100% scale on a thermal or laser printer and test-scan before labeling a shipment."],
    ],
  },
];

const about = {
  path: "/about", tool: false, crumb: "About",
  title: "About PrepLabel — Free FNSKU and Prep Label Tools",
  desc: "PrepLabel is a free, private label tool for Amazon resellers and prep centers, part of MiniTools. It runs in your browser with no signup and no uploads.",
  h1: "About PrepLabel",
  lead: "A free label tool for resellers and small prep centers that does one job well and keeps your data on your device.",
  body: `      <p>PrepLabel is part of <strong>MiniTools</strong>, a set of free single-purpose web tools. It makes FNSKU unit labels, converts Seller Central label PDFs to thermal sizes, and prints the prep labels that FBA shipments need: suffocation warnings, sold-as-set stickers, expiration dates and bin locations.</p>
      <h2>Why we built it</h2>
      <p>With Amazon's US label service and commingling gone in 2026, most resellers now label every unit themselves. The free option, Seller Central's own label PDFs, is laid out for sheets and doesn't fit thermal rolls well, while dedicated label apps usually need an account and a subscription. PrepLabel fills that gap with a tool that works on first use, prints sharp barcodes and costs nothing.</p>
      <h2>How it works</h2>
      <p>Everything happens in your browser. Labels are built as vector PDFs on your device, Seller Central PDFs are read locally, and your product lists, libraries and print log are stored in this browser only. There are no accounts and no uploads.</p>
      <h2>Accuracy and independence</h2>
      <p>We test that every barcode PrepLabel makes decodes correctly, but you should still test-scan a label before labeling a shipment. PrepLabel is not affiliated with Amazon. Labeling rules change, so treat our guides as general information and confirm current requirements in Seller Central.</p>`,
};
const privacy = {
  path: "/privacy", tool: false, crumb: "Privacy & Terms",
  title: "Privacy & Terms — PrepLabel, the Free FNSKU Label Tool",
  desc: "How PrepLabel handles your data: labels, PDFs and spreadsheets are processed on your device and never uploaded. Cookie-free analytics and simple terms of use.",
  h1: "Privacy & Terms",
  lead: "Short version: your products, files and labels never leave your device.",
  body: `      <h2>Privacy</h2>
      <p>PrepLabel runs in your browser. The FNSKUs, titles and quantities you type, the CSV, Excel and PDF files you open, and the labels you make are processed on your device and are never sent to our servers. Camera frames used by the scan-check are decoded on your device and are not recorded or sent anywhere.</p>
      <p>Your product list, saved libraries, print log and settings are kept in your browser's local storage so they're there next time. Clearing your browser data deletes them. We can't see or recover them.</p>
      <p>We use Vercel Web Analytics to count page views and a few anonymous events, such as “a PDF was generated”. It's cookie-free, doesn't track you across sites and never receives the content of your labels or files.</p>
      <h2>Terms</h2>
      <p>PrepLabel is free to use for personal and commercial labeling and is provided “as is”, without warranty. You're responsible for checking that your labels scan and meet Amazon's and your marketplace's current requirements before you ship. PrepLabel is not affiliated with Amazon, and the guides on this site are general information, not legal or compliance advice.</p>`,
};

const all = [home, ...pages.map(p => ({ ...p, tool: p.tool !== false })), about, privacy];
for (const p of all) {
  if (p.path !== "/") {
    const graph = [crumbLd(p.path, p.crumb)];
    if (p.faq && p.faq.length) graph.push(faqLd(p.faq));
    if (p.tool) graph.push(appLd(p.path, p.h1, p.desc));
    if (p.article) graph.push({ "@type": "Article", headline: p.h1, description: p.desc, datePublished: DATE, dateModified: DATE, url: URL + p.path, image: `${URL}/og.png`, author: { "@type": "Organization", name: "MiniTools", url: `${URL}/about` }, publisher: { "@type": "Organization", name: "MiniTools", url: `${URL}/about` } });
    p.graph = graph;
  }
  const file = p.path === "/" ? "index.html" : p.path.slice(1) + ".html";
  writeFileSync(join(OUT, file), layout(p));
}
console.log(`wrote ${all.length} pages`);
