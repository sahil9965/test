// Generates InvoiceKit's landing, pricing and about pages from one layout.
// Usage: node src/invoicekit/pages.mjs   (writes into sites/invoicekit/)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../sites/invoicekit");
const URL = "https://invoice.roohsites.com";
const DATE = "2026-10-25", DATE_H = "25 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "");

// Template links shown in the footer and the "More invoice templates" list on every page.
const LINKS = [
  ["/freelance-invoice-template", "Freelance"], ["/photography-invoice-template", "Photography"], ["/contractor-invoice-template", "Contractor"],
  ["/gst-invoice-generator", "GST (India)"], ["/invoice-format-without-gst", "Invoice without GST"], ["/bill-of-supply-format", "Bill of Supply"],
  ["/export-invoice-without-igst-under-lut", "Export under LUT"], ["/vat-invoice-template-uk", "UK VAT"],
];

function page({ slug, title, desc, h1, lead, preset, tool = true, body, faq = [], crumb, schemaExtra = [], lang = "en", outro = "" }) {
  const url = `${URL}/${slug}`;
  const graph = [
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "InvoiceKit", item: `${URL}/` },
      { "@type": "ListItem", position: 2, name: crumb || h1, item: url } ] },
    ...(faq.length ? [{ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) }] : []),
    ...schemaExtra,
  ];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#2f5bea">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="InvoiceKit">
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
    <a class="logo" href="/"><img src="/favicon.svg" alt="" width="28" height="28">InvoiceKit</a>
    <nav aria-label="Main"><a href="/">Invoice generator</a><a href="/invoice-templates">Templates</a><a href="/about">About</a></nav>
  </header>
  <main id="main">
    <p class="crumbs"><a href="/">InvoiceKit</a> › ${esc(crumb || h1)}</p>
    <section class="hero">
      <h1>${esc(h1)}</h1>
      <p class="lead">${lead}</p>
    </section>
${tool ? `    <section class="tool card" aria-label="Invoice generator"><div id="ik-tool" data-preset="${preset}"></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? `      <h2 id="faq">FAQ</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}` : ""}
${outro ? `      <p class="small">${outro}</p>\n` : ""}      <h2>More invoice templates</h2>
      <ul class="related">
        <li><a href="/">Blank invoice generator</a></li>
${LINKS.map(([h, t]) => `        <li><a href="${h}">${t}</a></li>`).join("\n")}
      </ul>
      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the Rooh Sites team. This page is general information, not tax or legal advice.</p>
    </article>
  </main>
  <footer class="site">
    <div class="cols">
      <div><h4>InvoiceKit</h4><ul><li><a href="/">Invoice generator</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Templates</h4><ul>${LINKS.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 InvoiceKit · Free tools that respect your privacy.</p>
  </footer>
</div>
${tool ? `<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

const pages = [
  {
    slug: "freelance-invoice-template", preset: "freelancer", crumb: "Freelance invoice template",
    title: "Freelance Invoice Template — Free, No Signup (PDF) | InvoiceKit",
    desc: "Free freelance invoice template for designers, writers, developers and consultants. Bill hourly or per project, add deposits and download a PDF. No signup.",
    h1: "Freelance Invoice Template",
    lead: "Bill hourly or per project, show deposits, and send a professional PDF in under two minutes. Free, with no account.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A freelance invoice lists your services (hours × rate or a fixed project fee), your and your client's details, a unique number, a due date and how to pay. Edit the example above, then click <em>Download PDF</em>.</p>
      <h2>Hourly vs project-based freelance invoices</h2>
      <p><strong>Hourly:</strong> one line per type of work with hours as the quantity and your hourly rate as the price, for example “Design work, 10 h × $60”. Attach a timesheet if the client asks for one.</p>
      <p><strong>Project-based:</strong> one line per deliverable or milestone, for example “Website homepage design, milestone 1 of 3”. Clients usually prefer this because the total is predictable.</p>
      <h2>How to invoice a deposit</h2>
      <ol class="steps">
        <li>Send invoice INV-0001 for the deposit (often 30–50%) before work begins, with the line “Deposit: 50% of project fee”.</li>
        <li>When you deliver, send INV-0002 for the full fee, then add a line “Less deposit paid (INV-0001)” as a negative amount.</li>
        <li>The total due is the remaining balance. Mention the deposit invoice number in the notes.</li>
      </ol>
      <h2>Payment terms freelancers use</h2>
      <ul><li><strong>Net 14:</strong> a good default for small clients.</li><li><strong>Net 30:</strong> expected by most companies and agencies.</li><li><strong>Late fee:</strong> state it on the invoice, for example “1.5% per month on overdue balances”. Check local law first.</li></ul>
      <h2>What to write in the notes</h2>
      <p>Put your bank or PayPal details, the project name or PO number, and a short thank-you. Specific notes (“Payment for Acme homepage redesign, PO 4471”) get approved faster by accounts teams.</p>`,
    faq: [
      ["Do freelancers need to charge tax on invoices?", "It depends on your country and income. In the UK you charge VAT only if you're VAT-registered. In the EU and India rules depend on thresholds. In the US most services aren't subject to sales tax. Check with a local accountant."],
      ["Should I invoice hourly or per project?", "Per project is easier to sell and to approve. Hourly is fairer when the scope is unclear. Many freelancers quote per project and track hours internally."],
      ["What invoice number should I start with?", "Any unique sequence works, such as INV-0001 or 2026-001. Never reuse a number."],
    ],
  },
  {
    slug: "photography-invoice-template", preset: "photography", crumb: "Photography invoice template",
    title: "Photography Invoice Template — Free PDF, No Signup | InvoiceKit",
    desc: "Free photography invoice template for wedding, portrait and event photographers. Session fees, image packages, travel and deposits included. Download a PDF.",
    h1: "Photography Invoice Template",
    lead: "Session fees, image packages, travel and deposits, already laid out for photographers. Edit and download a PDF for free.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A photography invoice should list the session fee, the image package or print products, travel or extra hours, any deposit already paid, and the balance due with a deadline, usually before or on delivery of the gallery.</p>
      <h2>What photographers usually invoice for</h2>
      <table><thead><tr><th>Line item</th><th>Typical pricing</th></tr></thead><tbody>
      <tr><td>Session / coverage fee</td><td>Flat fee per session or per hour of coverage</td></tr>
      <tr><td>Edited digital images</td><td>Included in the package, or per image</td></tr>
      <tr><td>Prints, albums, wall art</td><td>Per product</td></tr>
      <tr><td>Travel</td><td>Flat fee or per mile/km beyond a radius</td></tr>
      <tr><td>Second shooter / assistant</td><td>Per hour or flat</td></tr>
      <tr><td>Rush editing</td><td>Surcharge (often 25–50%)</td></tr>
      </tbody></table>
      <h2>Wedding photography invoices and retainers</h2>
      <p>Most wedding photographers take a non-refundable retainer (commonly 25–50%) to book the date. Send a retainer invoice at signing and a final invoice 2–4 weeks before the wedding, listing “Less retainer paid” as a negative line.</p>
      <h2>Licensing and usage</h2>
      <p>For commercial shoots, state the usage licence on the invoice, for example “Licence: web and social use, 1 year, non-exclusive”. This avoids disputes about how the images can be used.</p>`,
    faq: [
      ["When should a photographer send the invoice?", "Send a deposit or retainer invoice at booking, and the balance invoice before delivering the final gallery. For events, many photographers require full payment before the event date."],
      ["Should I include image rights on my invoice?", "For commercial work, yes. List the licence scope (where, how long, exclusive or not) so the client knows what they paid for."],
      ["Can I add my studio logo?", "Yes, for free. Upload your logo in the Your business section and it appears on every invoice."],
    ],
  },
  {
    slug: "contractor-invoice-template", preset: "contractor", crumb: "Contractor invoice template",
    title: "Contractor Invoice Template — Labor & Materials, Free PDF",
    desc: "Free contractor invoice template with labor, materials and disposal lines. For builders, handymen, electricians and plumbers. Download a PDF, no signup.",
    h1: "Contractor Invoice Template",
    lead: "Labor, materials and extras on one clear invoice, for handymen, builders, electricians, plumbers and other trades.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A contractor invoice separates <em>labor</em> (hours × rate or a fixed price) from <em>materials</em> (at cost or with markup), adds extras such as disposal or permits, applies sales tax where required, and states when payment is due.</p>
      <h2>Labor vs materials</h2>
      <p>Show labor and materials as separate lines. Clients trust itemised invoices more, and in many US states materials are taxed differently from labor. If you mark up materials, show the marked-up price as the rate. You don't have to show the markup percentage.</p>
      <h2>Progress billing for larger jobs</h2>
      <ol class="steps">
        <li>Agree milestones in your estimate (for example 30% at start, 40% at rough-in, 30% on completion).</li>
        <li>Invoice each milestone as its own numbered invoice, describing the stage completed.</li>
        <li>On the final invoice, list change orders separately, each with its own line.</li>
      </ol>
      <h2>Change orders</h2>
      <p>Any extra work the client asks for should appear as a separate line, for example “Change order #2: add 3 outlets in garage”. That makes the final total easy to check against the original estimate.</p>`,
    faq: [
      ["Do contractors charge sales tax on labor?", "It depends on the state or country. Many US states tax materials but not labor on repairs. Others tax both. Check your local rules or ask an accountant."],
      ["Should I list my license number on the invoice?", "Many states require licensed contractors to show their license number on invoices and estimates. Put it in the From box."],
      ["What payment terms are normal for contractors?", "Due on completion is common for small jobs. Larger projects use deposits and progress payments."],
    ],
  },
  {
    slug: "gst-invoice-generator", preset: "gst", crumb: "GST invoice generator",
    title: "GST Invoice Generator — Free CGST/SGST Bill Maker, No Login",
    desc: "Free GST invoice generator for India. Add GSTIN, HSN/SAC codes and CGST + SGST or IGST, in rupees. Download a tax invoice PDF, no login needed.",
    h1: "GST Invoice Generator (India)",
    lead: "Make a GST tax invoice in rupees with CGST and SGST split automatically. Add your GSTIN and HSN/SAC codes, then download a PDF.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A GST tax invoice must show the supplier's name, address and GSTIN, a unique serial number, the date, the recipient's details (and GSTIN if registered), HSN/SAC codes, taxable value, the GST rate and amount (CGST + SGST for intra-state sales, IGST for inter-state sales), and the place of supply.</p>
      <h2>CGST + SGST or IGST?</h2>
      <table><thead><tr><th>Sale type</th><th>Tax to charge</th><th>Example at 18%</th></tr></thead><tbody>
      <tr><td>Within the same state (intra-state)</td><td>CGST + SGST, half each</td><td>9% CGST + 9% SGST</td></tr>
      <tr><td>To another state (inter-state)</td><td>IGST</td><td>18% IGST</td></tr>
      </tbody></table>
      <p>In the generator, set the tax name to <strong>GST</strong> and the rate to 18 (or 5, 12 or 28). Tick <em>Split tax in half</em> for intra-state sales to show CGST and SGST. For inter-state sales, change the tax name to <strong>IGST</strong> and untick the split.</p>
      <h2>Mandatory fields on a GST invoice</h2>
      <ul>
        <li>Supplier name, address and GSTIN (put these in the From box)</li>
        <li>Consecutive invoice serial number, unique for the financial year (for example GST/2026-27/001)</li>
        <li>Invoice date</li>
        <li>Recipient name, address and GSTIN if registered, plus the place of supply with state name and code</li>
        <li>HSN code for goods or SAC code for services in each item description</li>
        <li>Quantity, unit, taxable value, and the rate and amount of each tax</li>
        <li>Signature or digital signature of the supplier</li>
      </ul>
      <h2>Payment details Indian clients expect</h2>
      <p>Add your bank name, account number, IFSC and UPI ID in the notes box. UPI makes small invoices much faster to pay.</p>`,
    faq: [
      ["Is this a valid GST invoice format?", "It includes the fields usually required on a tax invoice. Add your GSTIN, HSN/SAC codes and place of supply. E-invoicing (IRN) is mandatory only above the turnover threshold notified by the GST Council. Confirm your obligations with a CA."],
      ["How do I show CGST and SGST separately?", "Set tax name to GST, enter the full rate (for example 18), and tick Split tax in half. The invoice shows CGST 9% and SGST 9%."],
      ["Can I make an invoice without GST?", "Yes. If you're not GST-registered, set the tax rate to 0 and use the title Invoice; see our <a href=\"/invoice-format-without-gst\">invoice format without GST</a>. A Bill of Supply is for registered composition or exempt suppliers instead; see the <a href=\"/bill-of-supply-format\">bill of supply format</a>."],
    ],
  },
  {
    slug: "invoice-format-without-gst", preset: "nogst", lang: "en-IN", priceCurrency: "INR", crumb: "Invoice format without GST",
    title: "Invoice Format Without GST — Free Template for India (PDF)",
    desc: "Invoice format without GST for freelancers and small businesses in India: PAN, bank and UPI details, no tax lines. Free generator, download a PDF.",
    h1: "Invoice Format Without GST (India)",
    lead: "A simple rupee invoice for freelancers and small businesses that are not registered for GST: no GSTIN, no tax lines, just your PAN, payment details and the amount due.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> An invoice format without GST has no GSTIN and no tax lines. It shows the title “Invoice”, a unique invoice number and date, your name, address and PAN, your client's details, a clear description of the work, the amount in rupees and your bank or UPI details. Edit the example above, then click <em>Download PDF</em>.</p>
      <h2>What to include when you are not registered for GST</h2>
      <p>If you have not registered for GST, your invoice can be short and simple. These are the parts that matter:</p>
      <ul>
        <li><strong>Title:</strong> “Invoice”. Do not use “Tax Invoice”, because you are not charging tax.</li>
        <li><strong>Your details:</strong> name or business name, address, phone and email. Add your PAN too. GST does not require it from an unregistered person, but clients who deduct TDS usually ask for it.</li>
        <li><strong>Invoice number and date:</strong> a unique running number such as INV-0001 or 2026-27/001, the issue date and, if you want one, a due date.</li>
        <li><strong>Client details:</strong> the client's name and billing address.</li>
        <li><strong>Description and amount:</strong> what you did, the quantity or hours, the rate and the total in rupees. HSN and SAC codes belong on GST invoices, so you can leave them out.</li>
        <li><strong>Payment details:</strong> bank name, account number, IFSC and UPI ID, so the client can pay without writing back to ask.</li>
      </ul>
      <h2>What to leave out</h2>
      <p>Leave out the GSTIN, the CGST, SGST and IGST lines and any GST rate. Only a registered person can collect GST from a customer, so an unregistered business should not add it to an invoice. In the generator the tax rate is already 0, so no tax lines appear. Some freelancers add a short line in the notes, such as “Not registered under GST”, so the client's accounts team knows why there is no tax.</p>
      <h2>A simple layout to copy</h2>
      <table><thead><tr><th>Section</th><th>Example</th></tr></thead><tbody>
      <tr><td>Title</td><td>Invoice</td></tr>
      <tr><td>Number and date</td><td>INV-0007, 25 October 2026</td></tr>
      <tr><td>From</td><td>Your name, address, email, PAN</td></tr>
      <tr><td>Bill to</td><td>Client name and address</td></tr>
      <tr><td>Item</td><td>Website design (fixed fee), 1 × ₹40,000</td></tr>
      <tr><td>Total due</td><td>₹40,000</td></tr>
      <tr><td>Payment details</td><td>Bank name, account number, IFSC, UPI ID</td></tr>
      </tbody></table>
      <h2>When you need to register for GST</h2>
      <p>For a business that supplies only services, GST registration is generally required once its aggregate turnover in a financial year crosses ₹20 lakh. In the special category states the limit is ₹10 lakh. Sellers of goods have a different, generally higher, limit. Aggregate turnover is worked out across India for all your businesses under one PAN, and it generally counts exempt supplies and exports as well as taxable sales.</p>
      <p>The turnover limit is not the only test. Some kinds of supply need registration whatever your turnover, and you can also register voluntarily. The limits and rules can change, so check the <a href="https://www.gst.gov.in/">GST portal</a> or ask a chartered accountant before you decide that you are below the line.</p>
      <p>Once you are registered, switch to a tax invoice with your GSTIN and the right tax lines. Our <a href="/gst-invoice-generator">GST invoice generator</a> is set up for that.</p>
      <h2>A bill of supply is not for unregistered businesses</h2>
      <p>Many people assume that “no GST” means “bill of supply”. It does not. A bill of supply is issued by a <em>registered</em> supplier, either a composition taxpayer or someone selling exempt goods or services, in place of a tax invoice. If you are not registered, you are not required to issue one, and a plain invoice is the right document. If you are registered under the composition scheme or sell exempt items, see our <a href="/bill-of-supply-format">bill of supply format</a>.</p>
      <h2>Invoicing a client outside India</h2>
      <p>If you are not registered, an invoice to a foreign client is also a plain invoice without GST. Pick the client's currency in the generator and the amount is shown in that currency. A Letter of Undertaking is something GST-registered exporters file, so it does not apply to you. If you are registered and bill clients abroad, read about the <a href="/export-invoice-without-igst-under-lut">export invoice under LUT</a>. Income tax and foreign exchange rules are separate from GST, so ask your CA about those.</p>
      <h2>How to make the invoice here</h2>
      <ol class="steps">
        <li>The generator above opens in rupees with the tax rate at 0 and the title set to Invoice.</li>
        <li>Type your name, address and email in the From box, and your client's name and address in Bill to.</li>
        <li>Replace the example item with your own work, quantity and rate.</li>
        <li>Fill in the PAN, bank, A/c number, IFSC and UPI lines in the notes box.</li>
        <li>Click <em>Download PDF</em> and choose Save as PDF. Everything stays in your browser.</li>
      </ol>
      <h2>Official sources</h2>
      <p>Registration limits and invoice rules are published on the <a href="https://www.gst.gov.in/">GST portal</a>. The text of the Act and the Rules is on the <a href="https://taxinformation.cbic.gov.in/">CBIC tax information site</a>.</p>`,
    faq: [
      ["Can I issue an invoice without GST in India?", "Yes. If you are not registered under GST, issue a plain invoice without GST. Leave out the GSTIN and the CGST, SGST and IGST lines, because only registered persons can collect GST."],
      ["Is a PAN required on an invoice?", "No GST rule requires an unregistered person to show a PAN on an invoice. Clients who deduct TDS usually need it, so most freelancers include it. Ask your CA if you are unsure."],
      ["What happens when my turnover crosses ₹20 lakh?", "For a service provider, GST registration is generally required once aggregate turnover crosses ₹20 lakh, or ₹10 lakh in the special category states. After that you issue tax invoices. Check the current limits and timelines on the GST portal or with a CA."],
      ["Should I use a bill of supply if I am not registered?", "No. A bill of supply is issued by registered composition taxpayers and by registered suppliers of exempt goods or services. If you are not registered, issue a normal invoice."],
      ["Can I invoice a foreign client without GST?", "If you are not registered, yes: issue an invoice without GST in the client's currency. If you are registered, you generally need a Letter of Undertaking to export services without paying IGST. See the export invoice under LUT page."],
    ],
    outro: "General information, not tax advice. GST rules change; check the GST portal or ask a chartered accountant.",
  },
  {
    slug: "bill-of-supply-format", preset: "billofsupply", lang: "en-IN", priceCurrency: "INR", crumb: "Bill of supply format",
    title: "Bill of Supply Format — Free Generator with Rule 49 Fields",
    desc: "Bill of supply format for composition taxpayers and exempt suppliers in India: required details, the composition declaration and a free PDF generator.",
    h1: "Bill of Supply Format (India)",
    lead: "Make a bill of supply for a composition taxpayer or an exempt supply: no GST charged, the required particulars, and the composition declaration printed in bold.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A bill of supply is issued instead of a tax invoice by registered suppliers who are composition taxpayers or who supply exempt goods or services. No GST is charged on it. It shows the supplier's name, address and GSTIN, a serial number of up to 16 characters, the date, the recipient's details, the HSN or accounting code, a description, the value after any discount, and a signature. A composition taxpayer also writes “Composition taxable person, not eligible to collect tax on supplies”.</p>
      <h2>Who issues a bill of supply</h2>
      <ul>
        <li><strong>Composition taxpayers:</strong> registered businesses that opted for the composition scheme pay tax at a prescribed percentage of their turnover and cannot collect GST from customers. They issue a bill of supply for their sales.</li>
        <li><strong>Suppliers of exempt goods or services:</strong> a registered person who supplies something that is exempt from GST issues a bill of supply for it, because there is no tax to show.</li>
      </ul>
      <p>A registered business that sells both taxable and exempt items uses a tax invoice for the taxable supplies and a bill of supply for the exempt ones. The rules allow a combined document in some cases, so ask your CA how to handle mixed sales. If you are not registered at all, you do not issue a bill of supply. Use a plain invoice instead, as described in our <a href="/invoice-format-without-gst">invoice format without GST</a>.</p>
      <h2>Details a bill of supply should carry</h2>
      <p>CGST Rule 49 lists the particulars of a bill of supply. In plain words:</p>
      <ol class="steps">
        <li>The supplier's name, address and GSTIN. Put these in the From box.</li>
        <li>A consecutive serial number of up to 16 characters, made of letters, numbers, a hyphen or a slash, and unique for the financial year. For example BOS/26-27/001.</li>
        <li>The date of issue.</li>
        <li>The recipient's name and address, with their GSTIN or UIN if they are registered. Put these in Bill to.</li>
        <li>The HSN code for goods, or the accounting code (SAC) for services.</li>
        <li>A description of the goods or services.</li>
        <li>The value of the supply after any discount or abatement. Because no tax is added, this is also the total.</li>
        <li>The signature or digital signature of the supplier or an authorised representative. The generator does not place a signature for you, so sign the PDF or the printed copy.</li>
      </ol>
      <h2>The composition declaration</h2>
      <p>A composition taxpayer writes this line on the bill of supply:</p>
      <p><strong>Composition taxable person, not eligible to collect tax on supplies</strong></p>
      <p>In the generator, click <em>Composition dealer</em> under Declaration and the line is printed in bold at the top of the bill of supply, under the title, on screen and in the PDF. That matches the composition rules, which ask for the wording at the top of the bill.</p>
      <h2>Bill of supply vs tax invoice</h2>
      <table><thead><tr><th></th><th>Bill of supply</th><th>Tax invoice</th></tr></thead><tbody>
      <tr><td>Issued by</td><td>Registered composition taxpayers, and registered suppliers of exempt goods or services</td><td>Registered suppliers of taxable goods or services</td></tr>
      <tr><td>GST charged</td><td>No</td><td>Yes: CGST + SGST or IGST</td></tr>
      <tr><td>Tax lines</td><td>None</td><td>Rate and amount of each tax</td></tr>
      <tr><td>Customer's input tax credit</td><td>None, because no GST is charged</td><td>Possible, subject to the GST conditions</td></tr>
      <tr><td>Extra wording</td><td>Composition taxpayers add the composition declaration</td><td>Place of supply and the tax details</td></tr>
      <tr><td>Rule</td><td>CGST Rules, Rule 49</td><td>CGST Rules, Rule 46</td></tr>
      </tbody></table>
      <h2>Make a bill of supply here</h2>
      <ol class="steps">
        <li>The generator above opens in rupees with the title set to Bill of Supply, the tax rate at 0 and the composition declaration filled in.</li>
        <li>Add your name, address and GSTIN in From, and the customer's details in Bill to.</li>
        <li>Replace the example line with your goods or services and the right HSN or accounting code. The example uses HSN 6109, which is for knitted T-shirts, so use the code for your own goods.</li>
        <li>Check the notes lines for your GSTIN, bank and UPI details.</li>
        <li>Click <em>Download PDF</em> and choose Save as PDF.</li>
      </ol>
      <h2>Official sources</h2>
      <p>Rule 49 and the composition rules are published on the <a href="https://taxinformation.cbic.gov.in/">CBIC tax information site</a>. Registration and filing information is on the <a href="https://www.gst.gov.in/">GST portal</a>.</p>`,
    faq: [
      ["Who has to issue a bill of supply?", "Registered composition taxpayers, and registered suppliers of exempt goods or services, issue a bill of supply instead of a tax invoice. Businesses that are not registered are not required to issue one."],
      ["Can I charge GST on a bill of supply?", "No. A composition taxpayer cannot collect tax from customers, and an exempt supply has no tax to collect, so a bill of supply shows no GST."],
      ["How long can a bill of supply number be?", "The serial number can have up to 16 characters, made of letters, numbers, a hyphen or a slash, and it should be unique for the financial year. BOS/26-27/001 is one example."],
      ["Do I need a GSTIN to issue a bill of supply?", "Yes. A bill of supply comes from a registered supplier and shows the supplier's GSTIN. If you are not registered, issue a plain invoice without a GSTIN."],
      ["Is a bill of supply the same as an invoice without GST?", "No. A bill of supply is for registered composition taxpayers and exempt supplies. An unregistered freelancer or small business issues a plain invoice."],
    ],
    outro: "General information, not tax advice. GST rules change; check the GST portal or ask a chartered accountant.",
  },
  {
    slug: "export-invoice-without-igst-under-lut", preset: "exportlut", lang: "en-IN", priceCurrency: "INR", crumb: "Export invoice under LUT",
    title: "Export Invoice Under LUT — Free Format for Foreign Clients",
    desc: "Export invoice under LUT without paying IGST: the endorsement wording, client and country details, and a free dollar invoice generator for Indian freelancers.",
    h1: "Export Invoice Under LUT (Without IGST)",
    lead: "For GST-registered freelancers and agencies billing clients abroad: the endorsement to print, the details to show, and a ready-to-edit invoice in dollars.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> If you are registered for GST and bill a client outside India, you can export services without charging IGST by filing a Letter of Undertaking (LUT, Form GST RFD-11) on the GST portal, generally once per financial year. The export invoice then carries a standard endorsement, the client's name and address, the delivery address, the country of destination and the amount in the foreign currency.</p>
      <h2>Step 1: file the LUT before you export</h2>
      <p>An export of services is a zero-rated supply. You can make it either by paying IGST and claiming a refund, or without paying IGST under a Letter of Undertaking. This page covers the LUT route. The LUT is Form GST RFD-11, filed online on the <a href="https://www.gst.gov.in/">GST portal</a> by a registered person, and it is generally filed once for each financial year, before you start exporting without paying IGST. The portal gives you an acknowledgement reference number (ARN), which is useful to quote on your invoices. The generator's notes box has a line for it.</p>
      <h2>Export of services invoice format: what to show</h2>
      <ul>
        <li><strong>Title:</strong> Tax Invoice. An export of services is a zero-rated taxable supply, so the document is a tax invoice with no IGST charged.</li>
        <li><strong>Your details:</strong> name, address and GSTIN in the From box.</li>
        <li><strong>Number and date:</strong> a consecutive serial number, unique for the financial year, and the date of issue.</li>
        <li><strong>The client:</strong> the overseas client's full name and address in Bill to.</li>
        <li><strong>Delivery address and country of destination:</strong> write them in the notes, as the preset does.</li>
        <li><strong>Description and code:</strong> what you did, with the SAC code for the service. The example uses SAC 998314, which is for IT design and development services. Use the code that matches your own service.</li>
        <li><strong>Value:</strong> the currency and amount, for example 40 hours at $50 gives $2,000.00.</li>
        <li><strong>Tax:</strong> none charged, plus the endorsement below.</li>
        <li><strong>Place of supply:</strong> outside India.</li>
        <li><strong>Payment details:</strong> your bank and SWIFT code, so the client can send the money.</li>
      </ul>
      <h2>The endorsement to write on the invoice</h2>
      <p>An invoice issued under an LUT carries this wording:</p>
      <p><strong>SUPPLY MEANT FOR EXPORT/SUPPLY TO SEZ UNIT OR SEZ DEVELOPER FOR AUTHORISED OPERATIONS UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX</strong></p>
      <p>In the generator, click <em>Export under LUT</em> under Declaration. The line is inserted exactly as written above and printed in bold at the top of the invoice, under the title, on screen and in the PDF.</p>
      <h2>Invoice for a foreign client from India: currency</h2>
      <p>You can bill in dollars, euros, pounds or another currency. Pick it in the generator and the invoice shows the currency and the amount. For your GST returns the value has to be stated in rupees using the exchange rate that the rules prescribe, so ask your CA which rate to use. Keep the bank's record of each foreign payment.</p>
      <h2>When a supply counts as an export of services</h2>
      <p>Not every invoice to a foreign client qualifies. The IGST Act sets conditions. For example, the supplier is in India, the client is outside India, the place of supply is outside India, and the payment is received in convertible foreign exchange (or in Indian rupees where the Reserve Bank of India permits). Other conditions also apply. If a condition is not met, IGST may be payable even though your client is abroad, so confirm the details for your service with a CA before you invoice without tax.</p>
      <h2>Not registered for GST?</h2>
      <p>An LUT is only for GST-registered suppliers. If you are a freelancer who is not required to register because your turnover is below the threshold, you do not file an LUT. You simply issue an invoice without GST. See the <a href="/invoice-format-without-gst">invoice format without GST</a>. If you are a composition taxpayer or sell exempt items, the <a href="/bill-of-supply-format">bill of supply format</a> covers your domestic sales.</p>
      <h2>Make the export invoice here</h2>
      <ol class="steps">
        <li>The generator above opens in US dollars with the tax rate at 0, the title set to Tax Invoice and the LUT endorsement filled in. Change the currency if you bill in something else.</li>
        <li>Add your name, address and GSTIN in From, and the client's name and address in Bill to.</li>
        <li>Edit the example item, hours and rate.</li>
        <li>Complete the notes: LUT ARN, country of destination and bank details with SWIFT code.</li>
        <li>Click <em>Download PDF</em> and choose Save as PDF.</li>
      </ol>
      <h2>Official sources</h2>
      <p>Forms, the LUT facility and notifications are on the <a href="https://www.gst.gov.in/">GST portal</a>. The text of the Acts and Rules is on the <a href="https://taxinformation.cbic.gov.in/">CBIC tax information site</a>.</p>`,
    faq: [
      ["What is an LUT in GST?", "A Letter of Undertaking (Form GST RFD-11) is filed online on the GST portal by a registered person. It lets you make an export without paying IGST. It is generally filed once per financial year."],
      ["Do I file an LUT for every invoice?", "No. An LUT is generally filed once for the financial year and then covers your exports in that year. Check the current rules on the GST portal."],
      ["Can my export invoice be in US dollars?", "Yes. Show the currency and the amount on the invoice. For GST returns the value is stated in rupees using the prescribed exchange rate, so ask your CA which rate to use."],
      ["Do freelancers who are not registered for GST need an LUT?", "No. An LUT is for GST-registered suppliers. A freelancer who is not registered issues an invoice without GST. See the invoice format without GST page."],
      ["Is every invoice to a foreign client an export of services?", "Not automatically. The IGST Act sets conditions, including that the place of supply is outside India and that payment is received in convertible foreign exchange. Confirm the details for your service with a CA."],
    ],
    outro: "General information, not tax advice. GST rules change; check the GST portal or ask a chartered accountant.",
  },
  {
    slug: "vat-invoice-template-uk", preset: "uk", crumb: "UK VAT invoice template",
    title: "UK VAT Invoice Template — Free Generator, Download PDF",
    desc: "Free UK VAT invoice template. Add your VAT number, 20% VAT and pound totals, then download a PDF. Works for sole traders and limited companies, no signup.",
    h1: "UK VAT Invoice Template",
    lead: "A VAT invoice in pounds with 20% VAT already set. Add your VAT registration number and download a PDF.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A full UK VAT invoice must show a unique sequential number, your business name and address, your VAT registration number, the invoice date and time of supply, the customer's name and address, a description of each item, the price excluding VAT, the VAT rate and amount for each rate, and the total including VAT.</p>
      <h2>VAT rates in the UK</h2>
      <table><thead><tr><th>Rate</th><th>%</th><th>Applies to (examples)</th></tr></thead><tbody>
      <tr><td>Standard</td><td>20%</td><td>Most goods and services</td></tr>
      <tr><td>Reduced</td><td>5%</td><td>Some energy, children's car seats</td></tr>
      <tr><td>Zero</td><td>0%</td><td>Most food, books, children's clothes</td></tr>
      </tbody></table>
      <h2>Not VAT-registered?</h2>
      <p>If you're a sole trader under the VAT threshold, don't charge VAT and don't call the document a VAT invoice. Set the tax rate to 0 and you'll get a normal invoice. Don't show a VAT number you don't have.</p>
      <h2>Simplified VAT invoices</h2>
      <p>For retail sales of £250 or less (including VAT), HMRC allows a simplified invoice without the customer's details. For B2B work, a full VAT invoice is the safer choice.</p>`,
    faq: [
      ["Do I need to show my VAT number?", "Yes, if you're VAT-registered. Put it in the From box under your address."],
      ["How long do I need to keep invoices in the UK?", "HMRC generally requires VAT records to be kept for at least 6 years."],
      ["Can I invoice in euros or dollars?", "Yes, but if you're VAT-registered you must show the VAT amount in pounds sterling too."],
    ],
  },
  {
    slug: "invoice-templates", tool: false, crumb: "Invoice templates",
    title: "Free Invoice Templates by Profession and Country (PDF)",
    desc: "Browse free invoice templates for freelancers, photographers, contractors, GST in India and VAT in the UK. Edit online and download a PDF with no signup.",
    h1: "Free Invoice Templates",
    lead: "Pick the template closest to your work. Each one opens the free generator with typical line items filled in.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> All templates are free, need no signup, and download as PDF. Start from the one that matches your work and edit anything.</p>
      <div class="grid2">
        <div class="card"><h3><a href="/freelance-invoice-template">Freelance invoice</a></h3><p>Hourly or per-project billing, deposits and Net 14/30 terms for designers, writers, developers and consultants.</p></div>
        <div class="card"><h3><a href="/photography-invoice-template">Photography invoice</a></h3><p>Session fees, image packages, travel, retainers and usage licences.</p></div>
        <div class="card"><h3><a href="/contractor-invoice-template">Contractor invoice</a></h3><p>Labor and materials, change orders and progress billing for trades.</p></div>
        <div class="card"><h3><a href="/gst-invoice-generator">GST invoice (India)</a></h3><p>Rupees with a CGST + SGST split, GSTIN and HSN/SAC codes.</p></div>
        <div class="card"><h3><a href="/invoice-format-without-gst">Invoice without GST</a></h3><p>A simple rupee invoice with PAN and UPI details for freelancers who are not GST-registered.</p></div>
        <div class="card"><h3><a href="/bill-of-supply-format">Bill of supply</a></h3><p>For composition taxpayers and exempt supplies, with the composition declaration.</p></div>
        <div class="card"><h3><a href="/export-invoice-without-igst-under-lut">Export invoice under LUT</a></h3><p>A dollar invoice with the LUT endorsement for GST-registered exporters of services.</p></div>
        <div class="card"><h3><a href="/vat-invoice-template-uk">UK VAT invoice</a></h3><p>Pounds with 20% VAT and the fields HMRC requires.</p></div>
        <div class="card"><h3><a href="/">Blank invoice</a></h3><p>Start from scratch in any of 24 currencies.</p></div>
      </div>
      <h2>Which invoice do I need in India?</h2>
      <table><thead><tr><th>Your situation</th><th>Document</th></tr></thead><tbody>
      <tr><td>Registered for GST and charging GST</td><td><a href="/gst-invoice-generator">GST tax invoice</a></td></tr>
      <tr><td>Not registered for GST</td><td><a href="/invoice-format-without-gst">Invoice without GST</a></td></tr>
      <tr><td>Registered composition taxpayer, or selling exempt items</td><td><a href="/bill-of-supply-format">Bill of supply</a></td></tr>
      <tr><td>Registered and billing a client abroad without IGST</td><td><a href="/export-invoice-without-igst-under-lut">Export invoice under LUT</a></td></tr>
      </tbody></table>
      <p>Rules differ by business and change over time, so confirm with a chartered accountant or on the GST portal.</p>
      <h2>Why use an online invoice generator instead of Word or Excel?</h2>
      <p>Spreadsheets break when you add rows, and Word templates don't calculate totals. A generator handles the maths, keeps invoice numbers in sequence, and gives you a clean PDF every time. InvoiceKit runs entirely in your browser, so your client data stays private.</p>`,
    faq: [],
  },
  {
    slug: "about", tool: false, crumb: "About",
    title: "About InvoiceKit — Private, Free Business Tools",
    desc: "InvoiceKit is part of Rooh Sites’ free tools: small, fast, private web tools that run in your browser with no signup. Learn who we are and how we handle your data.",
    h1: "About InvoiceKit",
    lead: "Small, fast tools that do one job well, free, with no accounts and no tracking of your data.",
    body: `      <p>InvoiceKit is part of <a href="https://roohsites.com/">Rooh Sites</a>’ collection of free single-purpose web tools for freelancers and small businesses. Each tool runs entirely in your browser: what you type stays on your device, and nothing is uploaded to our servers.</p>
      <h2>Why we built it</h2>
      <p>Most invoice apps want an account, a monthly subscription and your client list before you can send a single invoice. We think a freelancer sending three invoices a month deserves a tool that just works. Every feature of InvoiceKit is free, with no paid tier.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free today: logo, saved clients, history and all designs. There are no ads in the tool, and we never sell data, partly because we never have it.</p>`,
    faq: [],
  },
  {
    slug: "privacy", tool: false, crumb: "Privacy & Terms",
    title: "Privacy Policy & Terms of Use | InvoiceKit",
    desc: "How InvoiceKit handles your data: invoices stay in your browser and are never uploaded. Cookie-free analytics and simple terms of use. Everything is free.",
    h1: "Privacy & Terms",
    lead: "Short version: your invoices never leave your device.",
    body: `      <h2>Privacy</h2>
      <p>InvoiceKit runs in your browser. Invoice content, clients and your logo are stored in your browser's local storage on your device and are never sent to our servers. Clearing your browser data deletes them.</p>
      <p>We use two privacy-friendly analytics services, Vercel Web Analytics and Umami, to count page views. Neither uses cookies or tracks you across sites, and neither collects what you type into the tool.</p>
      <h2>Terms</h2>
      <p>InvoiceKit is provided “as is”, without warranty. You're responsible for the accuracy of your invoices and for following the invoicing and tax rules in your country. InvoiceKit is free to use for personal and commercial invoicing.</p>`,
    faq: [],
  },
];

for (const p of pages) {
  const schemaExtra = p.tool === false ? [] : [{ "@type": "WebApplication", name: p.h1, url: `${URL}/${p.slug}`, applicationCategory: "BusinessApplication", operatingSystem: "Any (web browser)", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: p.priceCurrency || "USD" } }];
  const file = join(OUT, `${p.slug}.html`);
  let html = page({ ...p, schemaExtra });
  // Keep the footer links block that tools/finalize.mjs filled in on a previous run.
  const net = /<!--NETWORK:START-->[\s\S]*?<!--NETWORK:END-->/;
  if (existsSync(file)) { const old = readFileSync(file, "utf8").match(net); if (old) html = html.replace(net, () => old[0]); }
  writeFileSync(file, html);
}
console.log(`wrote ${pages.length} pages`);
