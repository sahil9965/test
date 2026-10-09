// Generates every LabelFit page (home, guides, about, privacy) from one layout.
// Usage: node src/labelfit/pages.mjs   (writes into sites/labelfit/)
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../sites/labelfit");
const URL = "https://labels.roohsites.com";
const NAME = "LabelFit";
const ACCENT = "#0f766e";
const DATE = "2026-10-08", DATE_H = "8 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const GUIDES = [
  ["/vinted-label-thermal-printer", "Vinted labels on a thermal printer", "Vinted"],
  ["/evri-label-6x4", "Evri label to 6x4", "Evri 6x4"],
  ["/royal-mail-label-6x4", "Royal Mail label to 6x4", "Royal Mail 6x4"],
  ["/usps-label-to-4x6", "USPS.com label to 4x6", "USPS.com to 4x6"],
  ["/ebay-half-sheet-label-to-4x6", "eBay half-sheet label to 4x6", "eBay half-sheet"],
  ["/split-shipping-label-and-packing-slip", "Split a label and packing slip", "Label + packing slip"],
  ["/print-shipping-label-from-phone", "Print labels from your phone", "From your phone"],
];
const DISCLAIM = `LabelFit is an independent tool. It isn't affiliated with or endorsed by Vinted, Evri, Royal Mail, InPost, DPD, USPS, eBay, Mercari or any printer maker. Their names are used only to describe which labels and printers it works with.`;

const APP = (name, url, desc) => ({
  "@type": "WebApplication", name, url, description: desc,
  applicationCategory: "BusinessApplication", operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript",
  isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: "MiniTools", url: `${URL}/about` },
});

function layout({ path, title, desc, ogTitle, ogDesc, graph, main, tool }) {
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
${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="top">
    <a class="logo" href="/"><img src="/favicon.svg" alt="" width="28" height="28">${NAME}</a>
    <nav aria-label="Main"><a href="/">Converter</a><a href="/#guides">Guides</a><a href="/#faq">FAQ</a><a href="/about">About</a></nav>
  </header>
  <main id="main">
${main}
  </main>
  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">A4 to 6x4 label converter</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Guides</h4><ul>${GUIDES.map(([h, , s]) => `<li><a href="${h}">${esc(s)}</a></li>`).join("")}</ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p class="disclaim">${esc(DISCLAIM)}</p>
    <p>© 2026 ${NAME} · Free tools that respect your privacy.</p>
  </footer>
</div>
${tool ? `<noscript><p class="wrap notice">LabelFit needs JavaScript to read and convert PDFs in your browser.</p></noscript>
<script src="/core.js" defer></script>
<script src="/app.js" defer></script>
` : ""}</body>
</html>
`;
}

const toolSection = (attrs = "") => `    <section class="tool card" aria-label="Label converter"><div id="lf-tool"${attrs}></div></section>`;
const faqHtml = faq => `      <h2 id="faq">Frequently asked questions</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}`;
const faqLd = faq => ({ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
const related = (except) => `      <h2>More label guides</h2>
      <ul class="related">
        <li><a href="/">A4 to 6x4 label converter</a></li>
${GUIDES.filter(([h]) => h !== except).map(([h, t]) => `        <li><a href="${h}">${esc(t)}</a></li>`).join("\n")}
      </ul>`;
const updated = extra => `      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the MiniTools team.${extra ? " " + extra : ""}</p>`;

// ---------------------------------------------------------------- Home
const HOME_FAQ = [
  ["Is LabelFit really free?", "Yes. Every feature is free: any number of labels, batch conversion, packing-slip splitting, saved layouts and phone images. There's no account and nothing is added to your labels."],
  ["Are my labels uploaded anywhere?", "No. The PDF is opened and converted inside your browser tab, so your buyers' names and addresses never leave your device. After your first conversion LabelFit also works offline."],
  ["Will the barcode still scan after converting?", "LabelFit copies the label into the new PDF as vector graphics, so bars and text stay as sharp as in the original. It shows the print scale for every label and warns you if a label would be shrunk below 80%. Print one test label and check the barcode is crisp and nothing is cut off."],
  ["Should I choose 4 × 6 in or 100 × 150 mm?", "Pick the size printed on your label roll and set your printer to the same size. UK and EU “6x4” rolls are usually 100 × 150 mm; US rolls are 4 × 6 in (101.6 × 152.4 mm). The two differ by less than 2.5 mm, so either works as long as the PDF and the printer setting match."],
  ["Why does my label print tiny or in a corner?", "Usually the printer is still set to A4 or Letter paper, or the print dialog is set to Fit to page, which shrinks the whole sheet. Convert the label to 6x4 here, set the paper size to 4 × 6 in or 100 × 150 mm, and print at Actual size or 100%."],
  ["Can I convert several labels at once?", "Yes. Drop several PDFs, a multi-page PDF or an A4 sheet with 2 or 4 labels. Every label becomes its own 6x4 page in one PDF, or one image each in a ZIP when you choose Image."],
  ["Does LabelFit change anything on the label?", "No. It only crops, rotates and scales. Nothing is ever printed on a shipping label or customs form. If you choose to keep a packing slip, that page gets a small “Made with LabelFit” line under the slip."],
  ["Which printers does it work with?", "Any printer that takes 4 × 6 in or 100 × 150 mm labels: desktop thermal label printers such as Rollo, Munbyn, Zebra or iDPRT models, Bluetooth label printers that print from a phone app, and ordinary printers with half-sheet label paper (use the 2-per-sheet sizes)."],
];
const HOME_STEPS = [
  ["Get the label PDF", "Download the printable label from Vinted, Evri, Royal Mail, eBay, USPS.com or your carrier. Keep it as a PDF if you can; a screenshot works but is less sharp."],
  ["Drop it into LabelFit", "LabelFit finds the label on each page. It leaves out instructions and cut lines, and marks packing slips and customs forms as separate pieces."],
  ["Check the preview", "Green ticks mean nothing is cut off and the label isn't shrunk too much. If a box is wrong, drag it or its corners, or tap it to change what it is."],
  ["Download and print at 100%", "Download the PDF for a desktop printer, or save the image for a phone printer app. Print with the paper size set to 4 × 6 in or 100 × 150 mm and the scale at Actual size or 100%."],
];
function home() {
  const graph = [
    { ...APP(NAME, `${URL}/`, "Free browser-based converter that crops A4 and letter shipping label PDFs to 6x4 (100 x 150 mm or 4 x 6 in) for thermal printers, as a vector PDF or a phone-ready image. Nothing is uploaded."),
      featureList: ["A4 and letter to 6x4 / 4x6", "100 x 150 mm, 4 x 6 in, A6, 4 x 4 in, 62 mm rolls and 2-per-sheet layouts", "Automatic label detection", "Vector PDF output", "203 or 300 dpi PNG or JPG for phone printer apps", "Packing slip and CN22 splitting", "Batch conversion", "Saved crop layouts", "Works offline", "No upload"] },
    { "@type": "HowTo", name: "How to convert an A4 shipping label to 6x4 for a thermal printer", totalTime: "PT1M", step: HOME_STEPS.map(([n, t]) => ({ "@type": "HowToStep", name: n, text: t })) },
    faqLd(HOME_FAQ),
  ];
  const main = `    <section class="hero">
      <h1>A4 to 6x4 Label Converter</h1>
      <p class="lead">Drop in an A4 or 8.5 × 11 in shipping label and get a 6 × 4 label for your thermal printer: cropped, turned upright and sized for 100 × 150 mm or 4 × 6 in rolls. Everything happens in your browser.</p>
      <ul class="badges"><li>Free, no signup</li><li>Nothing uploaded</li><li>Sharp vector PDF</li><li>Phone image option</li></ul>
    </section>
${toolSection()}
    <article class="content narrow">
      <p class="tldr"><strong>Quick answer:</strong> To convert an A4 shipping label to 6x4, open the label PDF in LabelFit, check the box covers the whole label, choose 100 × 150 mm (or 4 × 6 in) and download the PDF. Print it at Actual size or 100% on your thermal printer. The label is cropped out of the page rather than shrunk with it, so the barcode stays at or near its original size.</p>

      <h2 id="how">How to convert an A4 label to 6x4 in 4 steps</h2>
      <ol class="steps">
${HOME_STEPS.map(([n, t]) => `        <li><strong>${esc(n)}.</strong> ${esc(t)}</li>`).join("\n")}
      </ol>

      <h2>Why “Fit to page” ruins A4 labels on a thermal printer</h2>
      <p>An A4 page is 210 × 297 mm and a 6x4 label is about 100 × 150 mm. If you send the whole A4 page to a 6x4 printer with Fit to page, it shrinks everything, label and blank paper alike, to about 48% (100 ÷ 210). A label that was already 6x4 on the sheet comes out roughly half size, with bars so thin that many scanners struggle. A US letter page shrinks to about 47%.</p>
      <p>LabelFit crops the label first and then fits only the label to your roll, so a 6x4 label on an A4 sheet prints at around 95–100% instead of 48%. The preview shows the exact percentage before you print.</p>

      <h2>Label and paper sizes</h2>
      <table>
        <thead><tr><th>Size</th><th>Millimetres</th><th>Inches</th><th>Typical use</th></tr></thead>
        <tbody>
          <tr><td>4 × 6 in (“6x4”)</td><td class="kv">101.6 × 152.4</td><td class="kv">4 × 6</td><td>US thermal shipping labels</td></tr>
          <tr><td>100 × 150 mm</td><td class="kv">100 × 150</td><td class="kv">3.94 × 5.91</td><td>UK and EU thermal rolls sold as 6x4</td></tr>
          <tr><td>A6</td><td class="kv">105 × 148</td><td class="kv">4.13 × 5.83</td><td>A quarter of an A4 sheet</td></tr>
          <tr><td>Half sheet</td><td class="kv">139.7 × 215.9</td><td class="kv">5.5 × 8.5</td><td>Two-per-sheet label paper for ordinary printers</td></tr>
          <tr><td>A4</td><td class="kv">210 × 297</td><td class="kv">8.27 × 11.69</td><td>UK and EU home printer paper</td></tr>
          <tr><td>US Letter</td><td class="kv">215.9 × 279.4</td><td class="kv">8.5 × 11</td><td>US home printer paper</td></tr>
        </tbody>
      </table>
      <p>LabelFit can also print to A6, 4 × 4 in, a 62 mm continuous roll, any custom size, or two labels per Letter or A4 sheet for half-sheet sticker paper.</p>

      <h2>Which labels does it work with?</h2>
      <p>Any label that comes as a PDF or an image. Presets set the usual paper size for each source; the label itself is still found automatically, because layouts change.</p>
      <table>
        <thead><tr><th>Where the label comes from</th><th>What you usually get</th><th>Guide</th></tr></thead>
        <tbody>
          <tr><td>Vinted (Evri, InPost, Royal Mail, DPD)</td><td>An A4 PDF with the label on part of the page</td><td><a href="/vinted-label-thermal-printer">Vinted guide</a></td></tr>
          <tr><td>Evri</td><td>A4 from marketplaces; Evri's own site also offers a 4 × 6 label</td><td><a href="/evri-label-6x4">Evri guide</a></td></tr>
          <tr><td>Royal Mail Click &amp; Drop</td><td>A4 with 1, 2 or 4 labels, or a native 6x4 label</td><td><a href="/royal-mail-label-6x4">Royal Mail guide</a></td></tr>
          <tr><td>USPS.com Click-N-Ship</td><td>An 8.5 × 11 in page with the label in the top half</td><td><a href="/usps-label-to-4x6">USPS guide</a></td></tr>
          <tr><td>eBay (US half-sheet, UK A4)</td><td>Label across the top half of a letter page, or in a corner of an A4 page</td><td><a href="/ebay-half-sheet-label-to-4x6">eBay guide</a></td></tr>
          <tr><td>Mercari</td><td>An 8.5 × 11 in page, unless you pick 4 × 6 in Mercari's label settings</td><td>Use the Mercari preset</td></tr>
          <tr><td>Anything else</td><td>Any PDF, PNG or JPG with a label on it</td><td>Auto-detect</td></tr>
        </tbody>
      </table>

      <h2>Print settings that keep the barcode sharp</h2>
      <table>
        <thead><tr><th>Where you print from</th><th>Settings</th></tr></thead>
        <tbody>
          <tr><td>Adobe Acrobat Reader</td><td>Page Sizing &amp; Handling: <strong>Actual size</strong>. Paper size 4 × 6 in or 100 × 150 mm in the printer properties.</td></tr>
          <tr><td>Chrome or Edge PDF viewer</td><td>Paper size 4 × 6 in or 100 × 150 mm. Scale <strong>Default</strong> or 100, not Fit to printable area.</td></tr>
          <tr><td>Preview on a Mac</td><td>Paper Size: your 4 × 6 in or 100 × 150 mm custom size. Scale <strong>100%</strong>.</td></tr>
          <tr><td>Phone printer app</td><td>Choose Image here, 203 dpi for most printers or 300 dpi for 300 dpi models. Set the same label size in the app and turn off extra scaling.</td></tr>
        </tbody>
      </table>
      <p>The tool has a step-by-step version of these settings under <em>Print settings for a perfect 100% print</em>, with a button to copy them.</p>

      <h2>Packing slips, customs forms and multi-label sheets</h2>
      <ul>
        <li><strong>Label and packing slip on one page:</strong> LabelFit marks the slip separately. Leave it out, or print it on its own 6x4 page. See <a href="/split-shipping-label-and-packing-slip">how to split a label and packing slip</a>.</li>
        <li><strong>CN22 and CN23 customs forms:</strong> printed on their own page by default, so they don't get left behind.</li>
        <li><strong>A4 sheets with 2 or 4 labels:</strong> every label becomes its own page, in reading order.</li>
        <li><strong>Lots of orders:</strong> drop several PDFs at once and print them all from one file.</li>
        <li><strong>A layout auto-detect gets wrong:</strong> fix the box once, save it as a layout, and LabelFit reuses it for every file from that source. Layouts can be exported and imported as a file.</li>
      </ul>

      <h2>Private by design: nothing is uploaded</h2>
      <p>Shipping labels carry your buyer's name and home address. LabelFit reads the PDF with pdf.js inside your browser tab and writes the new PDF with pdf-lib, also in the tab. There's no upload step and no server that could keep a copy. After your first conversion, LabelFit keeps working offline, so you can switch on airplane mode and see for yourself that nothing needs the internet.</p>

      <h2>Printing from a phone</h2>
      <p>Bluetooth label printers print from their own app, and many apps handle images better than A4 PDFs. Choose <em>Image</em>, pick 203 or 300 dpi and tap <em>Share to printer app</em>: the image is exactly label-sized. See the <a href="/print-shipping-label-from-phone">phone printing guide</a> for iPhone and Android steps.</p>

      <h2 id="guides">Step-by-step guides</h2>
      <ul class="related">
${GUIDES.map(([h, t]) => `        <li><a href="${h}">${esc(t)}</a></li>`).join("\n")}
      </ul>

${faqHtml(HOME_FAQ)}
${updated("Print a test label before shipping a batch.")}
    </article>`;
  return layout({
    path: "/", title: "A4 to 6x4 Label Converter – Free, No Upload | LabelFit",
    desc: "Convert A4 or letter shipping label PDFs to 6x4 (100x150 mm or 4x6 in) for thermal printers. Free, and nothing is uploaded: labels stay on your device.",
    ogTitle: "A4 to 6x4 Label Converter – Free, No Upload",
    ogDesc: "Crop A4 and letter shipping labels to 6x4 for thermal printers. Vector PDF or phone image. Runs in your browser.",
    graph, main, tool: true,
  });
}

// ---------------------------------------------------------------- Landing pages
function landing(p) {
  const url = URL + p.path;
  const graph = [
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` },
      { "@type": "ListItem", position: 2, name: p.crumb, item: url }] },
    faqLd(p.faq),
    ...(p.steps ? [{ "@type": "HowTo", name: p.howto, step: p.steps.map(([n, t]) => ({ "@type": "HowToStep", name: n, text: strip(t) })) }] : []),
    APP(p.appName, url, p.appDesc),
  ];
  const attrs = Object.entries(p.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("");
  const main = `    <p class="crumbs"><a href="/">${NAME}</a> › ${esc(p.crumb)}</p>
    <section class="hero">
      <h1>${esc(p.h1)}</h1>
      <p class="lead">${p.lead}</p>
    </section>
${toolSection(attrs)}
    <article class="content narrow">
      <p class="tldr"><strong>Quick answer:</strong> ${p.answer}</p>
${p.steps ? `      <h2 id="how">${esc(p.howto)}</h2>
      <ol class="steps">
${p.steps.map(([n, t]) => `        <li><strong>${esc(n)}.</strong> ${t}</li>`).join("\n")}
      </ol>
` : ""}${p.body}
${faqHtml(p.faq)}
${related(p.path)}
${updated(p.note || "")}
    </article>`;
  return layout({ path: p.path, title: p.title, desc: p.desc, graph, main, tool: true });
}

const PAGES = [
  {
    path: "/vinted-label-thermal-printer", crumb: "Vinted label on a thermal printer", data: { preset: "vinted" },
    title: "Vinted Label on a Thermal Printer – A4 to 6x4 Free",
    desc: "Print Vinted labels on a 6x4 thermal printer. Crop the A4 Evri, InPost, Royal Mail or DPD label to 100x150 mm in your browser. Free, nothing uploaded.",
    h1: "Print a Vinted Label on a Thermal Printer",
    lead: "Vinted's printable labels usually come as an A4 PDF. Drop yours in to get a 6 × 4 (100 × 150 mm) label for your thermal printer, cropped and the right way up.",
    appName: "Vinted label to 6x4 converter", appDesc: "Crops A4 Vinted shipping labels to 100 x 150 mm or 4 x 6 in for thermal label printers, in the browser.",
    answer: "To print a Vinted label on a 6x4 thermal printer, get the printable label from your conversation with the buyer, open the PDF here, check the green ticks, and download the 100 × 150 mm PDF. Print it with the paper size set to 100 × 150 mm (or 4 × 6 in) and the scale at 100% or Actual size. Don't print the A4 page with Fit to page: that shrinks the label to about half size.",
    howto: "How to print a Vinted label on a 6x4 thermal printer",
    steps: [
      ["Get the printable label", "In the conversation with your buyer, tap <em>Get shipping label</em> and choose the printable label. Save the PDF (on a phone, share it to Files or Downloads)."],
      ["Open it in LabelFit", "Choose the file above. The <em>Vinted A4</em> preset sets 100 × 150 mm paper and finds the label on the page."],
      ["Check the preview", "The label should fill the 6x4 page, with ticks for <em>Nothing cut off</em> and a print scale close to 100%."],
      ["Download or share", "Use <em>Download PDF</em> for a desktop printer, or <em>Image</em> and <em>Share to printer app</em> for a Bluetooth printer."],
      ["Print at 100%", "Paper size 100 × 150 mm or 4 × 6 in, scale 100% or Actual size, portrait. Stick the label flat on the biggest side of the parcel."],
    ],
    body: `      <h2>Fixing common Vinted label printing problems</h2>
      <table>
        <thead><tr><th>What you see</th><th>Likely cause</th><th>Fix</th></tr></thead>
        <tbody>
          <tr><td>Label prints tiny in one corner</td><td>The whole A4 page was shrunk to fit the 6x4 label</td><td>Convert the label here first, then print at 100%</td></tr>
          <tr><td>Part of the label is missing</td><td>The printer's paper size is still A4, or the crop box is too small</td><td>Set paper size to 100 × 150 mm or 4 × 6 in; check the green ticks in the preview</td></tr>
          <tr><td>The label comes out blank</td><td>The roll is loaded upside down. Direct thermal labels only darken on one side</td><td>Turn the roll so the heat-sensitive side faces the print head</td></tr>
          <tr><td>Barcode looks grey or patchy</td><td>Print darkness is low, or the label came from a blurry screenshot</td><td>Use the original PDF and raise the darkness or density in the printer settings</td></tr>
          <tr><td>Label prints sideways</td><td>The print dialog is set to landscape</td><td>Choose portrait or automatic orientation. LabelFit's PDF is already upright</td></tr>
        </tbody>
      </table>

      <h2>Which thermal printer size do I need for Vinted?</h2>
      <p>Any printer that takes 4 × 6 in or 100 × 150 mm labels works. In the UK these are often sold as “6x4” and the rolls are usually 100 × 150 mm. Set the printer and the converter to the same size. If your rolls say 4 × 6 in, choose that under <em>Print on</em> instead; the difference is less than 2.5 mm.</p>
      <p>Smaller printers that use 57 mm or 62 mm rolls can't print a full-size shipping label. LabelFit can make a 62 mm wide version, but the label is then shrunk to around 60%, which LabelFit flags as risky for scanning.</p>

      <h2>No printer at home?</h2>
      <p>When you get the label, Vinted also offers a digital label: a QR code you show at the drop-off point so they print the label for you. That's handy for occasional sales. If you sell often, a 6x4 thermal printer and this converter save a trip and a lot of paper.</p>

      <h2>Several Vinted sales at once</h2>
      <p>Download each label PDF, then choose them all at once above. Every label becomes its own 100 × 150 mm page in one PDF, in the order you picked them, so you can print the whole batch in one go. Pages without a label, such as instruction pages, are skipped automatically.</p>
      <p>If a label is in a layout LabelFit doesn't recognise, drag the box to fit it once and use <em>Save layout</em>. Next time, pick that layout under <em>Label from</em> and it is used for every page.</p>`,
    faq: [
      ["Does Vinted give you a 6x4 label?", "Vinted's printable labels are generally A4 PDFs meant for an ordinary printer. Options vary by carrier and change over time, so check your label screen. If you get an A4 PDF, convert it here."],
      ["Is it safe to put my Vinted labels into a website?", "LabelFit doesn't upload them. The PDF is read and converted inside your browser, so your buyer's name and address stay on your device."],
      ["Does it work with Evri, InPost, Royal Mail and DPD labels from Vinted?", "Yes. LabelFit doesn't rely on one fixed layout: it looks for the part of the page with the label and barcodes, and you can adjust the box if needed."],
      ["Can I print Vinted labels from my phone?", "Yes. Choose Image, then Share to printer app to send a 100 × 150 mm image straight to your Bluetooth printer's app."],
    ],
  },
  {
    path: "/evri-label-6x4", crumb: "Evri label 6x4", data: { preset: "evri" },
    title: "Evri Label 6x4 – Print A4 Evri Labels on a Thermal Printer",
    desc: "Turn an A4 Evri label into a 6x4 (100x150 mm) label for your thermal printer. Crops and rotates in your browser, keeps the barcode sharp. Free, no upload.",
    h1: "Evri Label 6x4 for Thermal Printers",
    lead: "Got an Evri label on an A4 page? Convert it to a 6 × 4 label for your thermal printer in a few seconds, without uploading it anywhere.",
    appName: "Evri label to 6x4 converter", appDesc: "Converts A4 Evri shipping labels into 6x4 (100 x 150 mm or 4 x 6 in) labels for thermal printers, in the browser.",
    answer: "If you book on Evri's own site, download the thermal 4 × 6 label it offers and print that directly. If you only have an A4 Evri label, for example from Vinted or another marketplace, open the PDF here, download the 100 × 150 mm version and print it at 100% scale on your 6x4 thermal printer.",
    howto: "How to print an A4 Evri label on 6x4 labels",
    steps: [
      ["Download the Evri label PDF", "Save the A4 label from Evri, Vinted or wherever you bought postage."],
      ["Open it above", "The <em>Evri A4</em> preset sets 100 × 150 mm paper. Choose <em>4 × 6 in</em> under <em>Print on</em> if that's what your roll says."],
      ["Check the box and ticks", "The box should hug the label, including the barcode and the address. Drag a corner if anything sits outside."],
      ["Print at Actual size", "Download the PDF and print with the paper size set to your roll and the scale at 100%."],
    ],
    body: `      <h2>Two ways to get a 6x4 Evri label</h2>
      <table>
        <thead><tr><th>Where you bought the postage</th><th>What to do</th></tr></thead>
        <tbody>
          <tr><td>Directly with Evri</td><td>Evri's help centre says it provides both A4 and thermal-printer (4 × 6) labels, which you download from your account. Pick the thermal one and you don't need a converter.</td></tr>
          <tr><td>Through a marketplace (Vinted, eBay and others)</td><td>You usually get an A4 PDF. Convert it here: the label is cropped out of the page and fitted to 100 × 150 mm or 4 × 6 in.</td></tr>
          <tr><td>A screenshot or photo of a label</td><td>Open the PNG or JPG here. It works, but the original PDF prints sharper.</td></tr>
        </tbody>
      </table>

      <h2>Getting the barcode to scan first time</h2>
      <p>Couriers scan the barcode at collection, in the depot and at delivery, so a sharp barcode matters more than anything else on the label. Three things help:</p>
      <ul>
        <li><strong>Print the PDF, not a photo.</strong> LabelFit copies the label as vector graphics, so the bars are exactly as sharp as the original file.</li>
        <li><strong>Keep the scale near 100%.</strong> The preview shows the percentage. Most A4 Evri labels convert at roughly 95–100%. Below 80% LabelFit shows a warning.</li>
        <li><strong>Stick it flat.</strong> Put the label on the largest flat side, not over a seam, edge or tape fold.</li>
      </ul>

      <h2>Thermal printer settings for Evri labels</h2>
      <p>In the print dialog choose your label printer, set the paper size to 100 × 150 mm or 4 × 6 in, set the scale to 100% or Actual size, and keep the orientation portrait. If labels come out faint, raise the darkness or density in the printer's own settings rather than enlarging the label.</p>

      <h2>No printer at all?</h2>
      <p>Evri also offers ways to send without printing at home, such as QR codes or print-in-store at some ParcelShops when you book. Check what's offered when you buy the postage.</p>`,
    faq: [
      ["Does Evri do 6x4 labels?", "Yes, when you book with Evri directly: its help centre says it offers A4 and thermal-printer 4 × 6 labels to download from your account. Labels from marketplaces are often A4, which you can convert here."],
      ["Is 100 × 150 mm OK for an Evri label?", "Yes. 100 × 150 mm is the common UK “6x4” roll. LabelFit fits the label to whichever size you choose and shows the print scale, so you can see it isn't shrunk much."],
      ["My Evri label has instructions under it. Will they print?", "No. LabelFit leaves out instruction text and cut lines by default and keeps only the label."],
      ["Do I need to install anything?", "No. LabelFit runs in your web browser on Windows, Mac, Chromebook, iPhone or Android."],
    ],
  },
  {
    path: "/royal-mail-label-6x4", crumb: "Royal Mail label 6x4", data: { preset: "royalmail" },
    title: "Royal Mail Label 6x4 – Convert A4 for Thermal Printers",
    desc: "Convert A4 Royal Mail labels (1, 2 or 4 per sheet) into 6x4 thermal labels. Keeps CN22 forms as their own page. Free, runs in your browser, no upload.",
    h1: "Royal Mail Label 6x4 Converter",
    lead: "Turn an A4 Royal Mail label sheet into separate 6 × 4 thermal labels, one label per page, with customs forms kept as their own page.",
    appName: "Royal Mail label to 6x4 converter", appDesc: "Splits A4 Royal Mail label sheets into 6x4 (100 x 150 mm or 4 x 6 in) thermal labels in the browser.",
    answer: "If you use Royal Mail Click & Drop, you can switch to its 6x4 label format in the label settings and skip converting. If you already have an A4 Royal Mail label, with 1, 2 or 4 labels on the sheet or an integrated label and despatch note, open it here: each label becomes its own 100 × 150 mm page. Print at 100%.",
    howto: "How to turn an A4 Royal Mail label into 6x4 labels",
    steps: [
      ["Open the A4 PDF", "Choose the Royal Mail label file above. The <em>Royal Mail A4</em> preset sets 100 × 150 mm paper."],
      ["Check every label was found", "With 2 or 4 labels on a sheet, each gets its own box and its own page. Use the arrows under the preview to page through them."],
      ["Decide on despatch notes and customs forms", "Despatch notes are left out unless you choose <em>Print on their own page</em> under More options. CN22 forms are kept by default."],
      ["Download and print", "Print at 100% or Actual size on 100 × 150 mm or 4 × 6 in labels."],
    ],
    body: `      <h2>Royal Mail Click &amp; Drop label formats</h2>
      <p>Royal Mail's Click &amp; Drop help centre lists several label templates. Which one you have decides whether you need a converter at all:</p>
      <table>
        <thead><tr><th>Click &amp; Drop format</th><th>Paper</th><th>Need LabelFit?</th></tr></thead>
        <tbody>
          <tr><td>Integrated label &amp; despatch note</td><td>A4 only</td><td>Yes: it splits the label from the despatch note</td></tr>
          <tr><td>Separate label, 1, 2 or 4 per page</td><td>A4</td><td>Yes: each label becomes its own 6x4 page</td></tr>
          <tr><td>Separate label, 6x4</td><td>6x4 thermal</td><td>No, print it directly</td></tr>
          <tr><td>Separate label, 4x3</td><td>4x3 thermal</td><td>No, print it directly</td></tr>
        </tbody>
      </table>
      <p>If you buy postage some other way, such as through a marketplace, you may only get the A4 version. That's what LabelFit is for.</p>

      <h2>A4 sheets with 2 or 4 labels</h2>
      <p>LabelFit finds every label on the sheet and puts each on its own page, top row first and left to right, so the order matches the sheet. If two labels are printed very close together and end up in one box, drag the box to cover one label and use <em>+ Add a crop box</em> for the other.</p>
      <p>Already printed half the sheet? Tap the labels you don't need and set them to <em>Leave out</em>.</p>

      <h2>International parcels and CN22</h2>
      <p>Customs declarations such as CN22 and CN23 are recognised from their wording and printed on their own 6x4 page by default, so they aren't lost when you crop the label. Nothing is added to the label or the customs form. Set <em>Customs forms</em> to <em>Leave them out</em> under More options if you print them separately.</p>`,
    faq: [
      ["Can Royal Mail print 6x4 labels directly?", "Yes. Click & Drop has a 6x4 separate label template in its label settings. Use that if you can; LabelFit is for A4 labels you already have or can't change."],
      ["Will the label order stay the same?", "Yes. Labels are taken top row first, left to right, page by page, and you can see each one in the preview before printing."],
      ["Does LabelFit work with Royal Mail labels from Vinted or eBay?", "Yes. It detects the label on any A4 page, whichever site the postage came from."],
      ["Is anything added to the Royal Mail label?", "No. Shipping labels and customs forms are only cropped and scaled, never written on."],
    ],
  },
  {
    path: "/usps-label-to-4x6", crumb: "USPS.com label to 4x6", data: { preset: "usps" },
    title: "USPS.com Label to 4x6 – Free Converter, No Upload",
    desc: "Convert a USPS.com Click-N-Ship 8.5x11 label into a 4x6 PDF for your thermal printer. Crops, rotates and keeps the barcode sharp. Free and private.",
    h1: "Convert a USPS.com Label to 4x6",
    lead: "USPS.com gives you the label on a full 8.5 × 11 in page. Turn it into a 4 × 6 in label for your thermal printer in seconds.",
    appName: "USPS.com label to 4x6 converter", appDesc: "Crops USPS.com Click-N-Ship letter-size labels into 4 x 6 inch PDFs for thermal printers, in the browser.",
    answer: "USPS.com Click-N-Ship gives you the label on a letter-size (8.5 × 11 in) page, with the label in the upper part and receipt details and instructions below. Open that PDF here: LabelFit crops the label, turns it upright and makes a 4 × 6 in PDF. Print it on your thermal printer at Actual size or 100%.",
    howto: "How to print a USPS.com label on 4x6 thermal labels",
    steps: [
      ["Save the label PDF", "After buying postage on USPS.com, save the 8.5 × 11 in label PDF instead of printing it."],
      ["Open it above", "The <em>USPS.com letter</em> preset sets 4 × 6 in paper and finds the label in the top part of the page."],
      ["Check the preview", "The label should be upright on the 4 × 6 page. If it's the wrong way round, select the box and use Rotate."],
      ["Print at Actual size", "Paper size 4 × 6 in, scale 100% or Actual size, portrait."],
    ],
    body: `      <h2>What happens to the rest of the page</h2>
      <p>The lower part of a USPS.com label page usually holds the label receipt and instructions, separated from the label by a cut line. LabelFit ignores the cut line and leaves the receipt and instructions out, shown as a grey dashed box. If you want the receipt on its own 4 × 6 page too, tap that box and choose <em>Packing slip (own page)</em>.</p>

      <h2>Why not print the letter page with “Fit to page”?</h2>
      <table>
        <thead><tr><th>Method</th><th>Size of the printed label</th></tr></thead>
        <tbody>
          <tr><td>Whole 8.5 × 11 page fitted onto 4 × 6</td><td>About 47% of the original, so the barcode bars are less than half as wide</td></tr>
          <tr><td>Label cropped with LabelFit, Fit</td><td>Usually 90–100%, shown in the preview</td></tr>
          <tr><td>Label cropped with LabelFit, Actual size</td><td>Exactly 100%, if the label fits on 4 × 6</td></tr>
        </tbody>
      </table>
      <p>Shippo's printing guidance notes that USPS has said poor print quality or barcodes near package edges or creases can get a parcel flagged. A full-size, sharp barcode stuck flat on the box avoids that.</p>

      <h2>Thermal printer setup for 4x6</h2>
      <p>Install your printer's driver and set its default paper size to 4 × 6 in. On a Mac, if 4 × 6 isn't listed, add it in the print dialog under <em>Manage Custom Sizes</em>. Then print the LabelFit PDF at 100%. Desktop thermal printers sold for shipping, such as Rollo, Munbyn, iDPRT or Zebra models, all take 4 × 6 in labels.</p>

      <h2>Other shipping sites</h2>
      <p>Some shipping platforms can produce 4 × 6 labels directly; check their label settings first. For any service that only gives you a letter-size PDF, this converter works the same way. For eBay's half-sheet labels see the <a href="/ebay-half-sheet-label-to-4x6">eBay half-sheet guide</a>.</p>`,
    faq: [
      ["Can USPS.com print 4x6 labels directly?", "Not usually. Printer makers such as Arkscan note that USPS.com Click-N-Ship produces labels for 8.5 × 11 in paper, which is why a cropping step is needed for 4 × 6 thermal printers."],
      ["Is it OK to ship with a USPS label printed on a thermal printer?", "Yes, 4 × 6 thermal labels are widely used for USPS shipping. What matters is a clear, unsmudged barcode that isn't folded over an edge or covered by shiny tape."],
      ["Will the label be rotated correctly?", "LabelFit turns a landscape label 90° so it fills the portrait 4 × 6 page. You can rotate it the other way or 180° with the Rotate buttons."],
      ["Does it work with Mercari or other letter-size labels?", "Yes. Use the Mercari letter preset, or Auto-detect for any other 8.5 × 11 in label PDF."],
    ],
  },
  {
    path: "/ebay-half-sheet-label-to-4x6", crumb: "eBay half-sheet label to 4x6", data: { preset: "ebayhalf" },
    title: "eBay Half-Sheet Label to 4x6 – Free Converter, No Upload",
    desc: "Turn an eBay half-sheet (8.5x11) shipping label into a 4x6 thermal label, or put two labels on one half-sheet page. Free, private, works in your browser.",
    h1: "eBay Half-Sheet Label to 4x6",
    lead: "Got an eBay label printed across the top half of a letter page? Convert it to an upright 4 × 6 in label for your thermal printer.",
    appName: "eBay half-sheet to 4x6 converter", appDesc: "Converts eBay half-sheet and letter-size shipping labels to 4 x 6 inch thermal labels in the browser.",
    answer: "An eBay half-sheet label PDF is a letter-size page with the label across the top half. Open it here: LabelFit crops the label, turns it upright and gives you a 4 × 6 in PDF to print at 100%. To avoid converting next time, change the label format in eBay's label settings to 4 × 6.",
    howto: "How to convert an eBay half-sheet label to 4x6",
    steps: [
      ["Save the label as a PDF", "On eBay's print screen, save the label PDF instead of printing it."],
      ["Open it above", "The <em>eBay half-sheet</em> preset sets 4 × 6 in paper and looks for the label in the top half."],
      ["Check the rotation", "The landscape label is turned to fit the portrait 4 × 6 page. Use Rotate if you prefer it the other way round."],
      ["Print at 100%", "Paper size 4 × 6 in, scale 100% or Actual size."],
    ],
    body: `      <h2>Change eBay's label format to 4x6</h2>
      <p>eBay lets you choose the label format when you buy postage. Sellers on the eBay community forum describe finding it on the create-label page, under <em>Show more</em> or next to the current label format, and switching it to 4 × 6. Bulk printing has its own size option, and eBay updates have been known to reset the choice, so check it before a big batch. If you already have half-sheet PDFs, convert them here.</p>

      <h2>Half-sheet or 4x6: which suits you?</h2>
      <table>
        <thead><tr><th></th><th>Half-sheet labels</th><th>4 × 6 thermal labels</th></tr></thead>
        <tbody>
          <tr><td>Label size</td><td>5.5 × 8.5 in, two per letter sheet</td><td>4 × 6 in on a roll or fanfold stack</td></tr>
          <tr><td>Printer</td><td>Any inkjet or laser printer</td><td>Thermal label printer, no ink</td></tr>
          <tr><td>LabelFit size to choose</td><td>Letter, 2 per sheet</td><td>4 × 6 in</td></tr>
        </tbody>
      </table>
      <p>Printing on half-sheet sticker paper with an ordinary printer? Choose <em>Letter, 2 per sheet</em> under <em>Print on</em>. LabelFit then places two labels on each letter page, one per half-sheet sticker, so a sheet isn't wasted on one label.</p>

      <h2>eBay UK A4 labels</h2>
      <p>On eBay UK, labels often come as an A4 page with the 6 × 4 label in the top-left corner. Pick the <em>eBay UK A4</em> preset to crop it to 100 × 150 mm, or 4 × 6 in if that's what your roll says.</p>

      <h2>Placement instructions on the page</h2>
      <p>If your eBay label includes placement instructions, LabelFit leaves them out and keeps only the label. You can also turn the instructions off on eBay's print screen to save paper when printing half-sheets.</p>`,
    faq: [
      ["How big is a half-sheet label?", "5.5 × 8.5 in, two per US letter sheet. A 4 × 6 in thermal label is smaller, so LabelFit crops away the blank margin around the label and fits the label itself."],
      ["Can I print two eBay labels on one sheet?", "Yes. Open both PDFs, choose Letter, 2 per sheet, and each page of the PDF will hold two labels, one per half."],
      ["Will the barcode be shrunk?", "Usually only a little, because LabelFit fits the label rather than the whole page. The preview shows the exact print scale and warns you below 80%."],
      ["Does it work for eBay labels with a packing slip?", "Yes. The slip is marked separately; leave it out or print it on its own page."],
    ],
  },
  {
    path: "/split-shipping-label-and-packing-slip", crumb: "Split label and packing slip", data: { slips: "page" },
    title: "Split Shipping Label and Packing Slip PDF – Free Tool",
    desc: "Split a PDF with a shipping label and packing slip on one page into separate 4x6 or 100x150 mm pages, or drop the slip. Free, works offline, nothing uploaded.",
    h1: "Split a Shipping Label and Packing Slip",
    lead: "One page with the label and the packing slip side by side? Get the label and the slip as separate 6 × 4 pages, or drop the slip entirely.",
    appName: "Shipping label and packing slip splitter", appDesc: "Splits shipping label PDFs that contain a packing slip or customs form into separate 4x6 or 100x150 mm pages, in the browser.",
    answer: "Open the PDF here. LabelFit marks the shipping label and the packing slip as separate boxes. With <em>Packing slips</em> set to <em>Print on their own page</em> (already chosen on this page), you get a PDF with the label on page 1 and the slip on page 2, both 4 × 6 in or 100 × 150 mm. Choose <em>Leave them out</em> to keep only the label.",
    howto: "How to split a shipping label and packing slip",
    steps: [
      ["Open the combined PDF", "Choose the file above. Multi-page files and several files at once are fine."],
      ["Check the boxes", "Green boxes are labels, purple boxes are packing slips, orange boxes are customs forms. Grey dashed boxes are left out."],
      ["Fix any wrong guess", "Tap a box and pick what it is under <em>Use this box as</em>, or drag it to resize."],
      ["Download", "One PDF with each label, slip and customs form on its own page, in page order."],
    ],
    body: `      <h2>How LabelFit tells the pieces apart</h2>
      <table>
        <thead><tr><th>Piece</th><th>How it's recognised</th><th>Default</th></tr></thead>
        <tbody>
          <tr><td>Shipping label</td><td>The part of the page with large barcodes or 2D codes and address blocks</td><td>Printed</td></tr>
          <tr><td>Packing slip</td><td>Mostly text and tables, with words such as “Order”, “Qty”, “Subtotal” or “Packing slip”</td><td>Printed on its own page here, left out on the main converter</td></tr>
          <tr><td>Customs form (CN22, CN23)</td><td>Wording such as “CN22” or “Customs declaration”</td><td>Printed on its own page</td></tr>
          <tr><td>Instructions and cut lines</td><td>Words such as “fold”, “cut along” or “instructions”, and dashed lines across the page</td><td>Left out</td></tr>
        </tbody>
      </table>
      <p>Text recognition only works when the PDF contains real text. If the whole page is a scanned image, LabelFit still finds the label from its barcodes, and treats other large blocks as “other content” that you can mark yourself.</p>

      <h2>What gets printed on each page</h2>
      <p>Shipping labels and customs forms are only cropped, rotated and scaled; nothing is ever added to them. Packing slips you keep get a small “Made with LabelFit” line under the slip, in light grey, so the label stays exactly as the carrier issued it.</p>

      <h2>Many orders at once</h2>
      <p>Choose all your order PDFs together. LabelFit keeps the page order, so each label is followed by its own slip if you print slips. That makes it easy to match slips to parcels while packing. If you only need the slips, set every label box to <em>Leave out</em> on the pages you want, or change <em>Packing slips</em> and keep the labels for a second print run.</p>

      <h2>Packing slip on plain paper instead?</h2>
      <p>If you'd rather print slips on an ordinary printer, set the size to <em>A4, 2 per sheet</em> or <em>Letter, 2 per sheet</em> and set every label box to <em>Leave out</em>: LabelFit lays two slips on each sheet.</p>`,
    faq: [
      ["Can I keep only the label and drop the packing slip?", "Yes. Set Packing slips to Leave them out under More options, or tap the slip's box and choose Leave out."],
      ["What if the label and slip are on separate pages?", "That works too. Each page is checked on its own, and pages with only a slip are treated the same way."],
      ["Is anything added to my shipping label?", "No. Only packing slips you choose to keep get a small credit line. Labels and customs forms stay exactly as issued, just cropped and scaled."],
      ["Are my order details uploaded?", "No. Everything happens in your browser, so order numbers, names and addresses stay on your device."],
      ["Is the slip's text removed from the label page?", "It's hidden, not deleted. To keep labels razor-sharp, the PDF reuses the original page and only shows the cropped part, like other PDF crop tools. Nothing outside the crop prints, but it is still inside the file. If you need a file that contains only the label, use the Image output."],
    ],
  },
  {
    path: "/print-shipping-label-from-phone", crumb: "Print labels from your phone", data: { out: "img" },
    title: "Print a Shipping Label from Your Phone to a Thermal Printer",
    desc: "Turn a shipping label PDF into a 4x6 or 100x150 mm image at 203 or 300 dpi and share it to your Bluetooth printer app. Free, on iPhone and Android.",
    h1: "Print Shipping Labels from Your Phone",
    lead: "Bluetooth label printers print from their own app. Convert the label PDF into an exact 4 × 6 or 100 × 150 mm image and share it straight to that app.",
    appName: "Shipping label to phone image converter", appDesc: "Converts shipping label PDFs into 4 x 6 inch or 100 x 150 mm PNG or JPG images at 203 or 300 dpi for Bluetooth label printer apps.",
    answer: "Open the label PDF in this page on your phone, check that <em>Image</em> is selected, pick 203 dpi (or 300 dpi for a 300 dpi printer), and tap <em>Share to printer app</em>. Choose your Bluetooth printer's app, set the label size to match, and print. If sharing isn't offered, tap <em>Save image</em> and open the image from inside the printer app.",
    howto: "How to print a shipping label from your phone",
    steps: [
      ["Save the label PDF to your phone", "On iPhone, open the PDF and use Share → Save to Files. On Android it usually goes to Downloads."],
      ["Open it here", "Tap <em>Choose label files</em> and pick the PDF from Files or Downloads. Nothing is uploaded."],
      ["Choose the image settings", "Image is already selected on this page. Pick 4 × 6 in or 100 × 150 mm, then 203 dpi for most Bluetooth printers or 300 dpi for 300 dpi models."],
      ["Share to the printer app", "Tap <em>Share to printer app</em> and pick your printer's app, or save the image and open it from the app."],
      ["Print at the same size", "In the app, choose the same label size and turn off extra scaling, stretching or cropping."],
    ],
    body: `      <h2>Image sizes LabelFit makes</h2>
      <table>
        <thead><tr><th>Label size</th><th>203 dpi</th><th>300 dpi</th></tr></thead>
        <tbody>
          <tr><td>4 × 6 in</td><td class="kv">812 × 1218 px</td><td class="kv">1200 × 1800 px</td></tr>
          <tr><td>100 × 150 mm</td><td class="kv">799 × 1199 px</td><td class="kv">1181 × 1772 px</td></tr>
          <tr><td>A6 (105 × 148 mm)</td><td class="kv">839 × 1183 px</td><td class="kv">1240 × 1748 px</td></tr>
        </tbody>
      </table>
      <p>Each image also records its resolution, so apps that read it can print it at the right physical size. Thermal print heads have a fixed resolution, most often 203 dpi, so an image made at the printer's own resolution prints dot for dot with no resizing blur.</p>

      <h2>PNG or JPG, and pure black and white</h2>
      <p>Choose PNG unless your printer app only accepts JPG. PNG keeps barcode edges perfectly sharp. <em>Pure black &amp; white</em> turns every grey pixel into black or white before saving. Thermal printers can only print black dots, so this stops the app from turning grey edges into speckled patterns, which keeps barcodes crisp.</p>

      <h2>Several labels on a phone</h2>
      <p>Pick several PDFs at once, or a PDF with several labels. When sharing, all images go to the printer app together if your phone supports it. Otherwise LabelFit saves them in one ZIP file.</p>

      <h2>Works without signal</h2>
      <p>Everything runs on your phone. After you've converted one label, LabelFit keeps working offline, which helps in a stockroom or post office queue with poor signal.</p>`,
    faq: [
      ["Does it work on iPhone and Android?", "Yes, in Safari, Chrome and other current mobile browsers. Sharing images straight to an app needs a browser that supports sharing files; recent iPhones and Android phones do. Otherwise use Save image."],
      ["Which dpi should I choose?", "Use your printer's resolution. Most 4 × 6 desktop and Bluetooth thermal printers are 203 dpi; some are 300 dpi. If you're unsure, 203 dpi works on both."],
      ["Why not just send the PDF to the printer app?", "Some apps print an A4 PDF shrunk onto the label, or crop it badly. An image that is already exactly label-sized avoids both problems."],
      ["Is the image watermarked?", "No. Nothing is printed on the label. The file only carries a small Software note in its metadata."],
    ],
    note: "Printer apps differ; check your app's own help for its import options.",
  },
];

// ---------------------------------------------------------------- About & Privacy
function simple({ path, title, desc, h1, lead, crumb, body }) {
  const url = URL + path;
  const graph = [{ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` },
    { "@type": "ListItem", position: 2, name: crumb, item: url }] }];
  const main = `    <p class="crumbs"><a href="/">${NAME}</a> › ${esc(crumb)}</p>
    <section class="hero">
      <h1>${esc(h1)}</h1>
      <p class="lead">${lead}</p>
    </section>
    <article class="content narrow">
${body}
${related("")}
${updated("")}
    </article>`;
  return layout({ path, title, desc, graph, main, tool: false });
}
const ABOUT = {
  path: "/about", crumb: "About", title: "About LabelFit – Free, Private Shipping Label Converter",
  desc: "LabelFit is a tool from MiniTools that converts A4 and letter shipping labels to 6x4 in your browser. Who makes it, how it works and how it stays private.",
  h1: "About LabelFit", lead: "A small, free tool that does one job: getting shipping labels onto 6 × 4 thermal labels, without uploading them anywhere.",
  body: `      <p>LabelFit is part of <strong>MiniTools</strong>, a set of free single-purpose web tools. It's built for people who sell on marketplaces and ship from home: thermal printer owners who are tired of cropping every A4 or letter-size label by hand.</p>
      <h2>Why we built it</h2>
      <p>Plenty of label sources still produce A4 or 8.5 × 11 in PDFs, while most sellers now use 6 × 4 thermal printers. Printing the whole page with Fit to page shrinks the barcode to about half size. Cropping by hand in a PDF editor works but is slow, and many online converters want you to upload a file full of your buyers' addresses. LabelFit does the crop automatically, on your device.</p>
      <h2>How it works</h2>
      <p>LabelFit renders each page in your browser with Mozilla's open-source pdf.js, looks for the parts of the page that contain the label (barcodes, address blocks, borders) and the parts that don't (instructions, cut lines, packing slips), and then builds a new PDF with the open-source pdf-lib library, copying the label as vector graphics. Both libraries are served from this site, not from a third-party CDN.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free, with no account and no limit on labels. There are no ads in the tool. We never see your labels, so there's nothing to sell.</p>
      <h2>Independent</h2>
      <p>${esc(DISCLAIM)}</p>`,
};
const PRIVACY = {
  path: "/privacy", crumb: "Privacy & Terms", title: "Privacy & Terms – LabelFit Shipping Label Converter",
  desc: "How LabelFit handles your data: label PDFs are converted on your device and never uploaded. Cookie-free analytics, local settings only and plain terms of use.",
  h1: "Privacy & Terms", lead: "Short version: your shipping labels never leave your device.",
  body: `      <h2>Your labels stay on your device</h2>
      <p>When you open a label PDF or image, your browser reads it from your device and LabelFit converts it inside the browser tab. The file, the names and addresses on it, and the converted result are never sent to our servers or anyone else. Closing the tab clears them from memory.</p>
      <h2>What's inside a converted PDF</h2>
      <p>Like other PDF crop tools, LabelFit keeps the label as sharp vector graphics by reusing the original page and hiding everything outside the crop box. The rest of the original page, such as a packing slip next to the label, is not printed or shown, but it is still inside the PDF file. That's fine for printing yourself. If you send a converted label to someone else, use the Image output: an image contains only what you see.</p>
      <h2>What is stored in your browser</h2>
      <ul>
        <li><strong>Settings</strong> such as your label size, output type and print guide choice, in local storage, so they're remembered next time.</li>
        <li><strong>Saved layouts</strong> you create: only box positions and sizes as fractions of the page, never the label content.</li>
        <li><strong>The app itself</strong>, cached by a service worker so LabelFit works offline. This cache holds LabelFit's own pages and scripts, not your files.</li>
      </ul>
      <p>Clearing your browser's site data for labels.roohsites.com removes all of it.</p>
      <h2>Analytics</h2>
      <p>We use Vercel Web Analytics to count page views and a few anonymous events, such as “PDF downloaded” with the chosen label size and a rough number of labels. It's cookie-free, doesn't track you across sites, and never receives file names or anything from your labels.</p>
      <h2>Terms</h2>
      <p>LabelFit is provided “as is”, without warranty. Always check the preview and print a test label: you're responsible for making sure each label prints completely and scans, and for following your carrier's labelling rules. LabelFit is free for personal and commercial use.</p>`,
};

writeFileSync(join(OUT, "index.html"), home());
for (const p of PAGES) writeFileSync(join(OUT, p.path.slice(1) + ".html"), landing(p));
for (const p of [ABOUT, PRIVACY]) writeFileSync(join(OUT, p.path.slice(1) + ".html"), simple(p));
console.log(`wrote ${PAGES.length + 3} pages`);
