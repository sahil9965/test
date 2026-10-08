// Generates InvoiceKit's landing, pricing and about pages from one layout.
// Usage: node src/invoicekit/pages.mjs   (writes into sites/invoicekit/)
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../sites/invoicekit");
const URL = "https://invoicekit-coral.vercel.app";
const DATE = "2026-10-08", DATE_H = "8 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "");

function page({ slug, title, desc, h1, lead, preset, tool = true, body, faq = [], crumb, schemaExtra = [] }) {
  const url = `${URL}/${slug}`;
  const graph = [
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "InvoiceKit", item: `${URL}/` },
      { "@type": "ListItem", position: 2, name: crumb || h1, item: url } ] },
    ...(faq.length ? [{ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) }] : []),
    ...schemaExtra,
  ];
  return `<!doctype html>
<html lang="en">
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
    <nav aria-label="Main"><a href="/">Invoice generator</a><a href="/invoice-templates">Templates</a><a href="/pricing">Pricing</a></nav>
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
      <h2>More invoice templates</h2>
      <ul class="related">
        <li><a href="/">Blank invoice generator</a></li>
        <li><a href="/freelance-invoice-template">Freelance</a></li>
        <li><a href="/photography-invoice-template">Photography</a></li>
        <li><a href="/contractor-invoice-template">Contractor</a></li>
        <li><a href="/gst-invoice-generator">GST (India)</a></li>
        <li><a href="/vat-invoice-template-uk">UK VAT</a></li>
      </ul>
      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the MiniTools team. This page is general information, not tax or legal advice.</p>
    </article>
  </main>
  <footer class="site">
    <div class="cols">
      <div><h4>InvoiceKit</h4><ul><li><a href="/">Invoice generator</a></li><li><a href="/pricing">Pricing</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Templates</h4><ul><li><a href="/freelance-invoice-template">Freelance</a></li><li><a href="/photography-invoice-template">Photography</a></li><li><a href="/contractor-invoice-template">Contractor</a></li><li><a href="/gst-invoice-generator">GST (India)</a></li><li><a href="/vat-invoice-template-uk">UK VAT</a></li></ul></div>
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
      ["Can I add my studio logo?", "Yes. With Pro you can upload your logo and remove the InvoiceKit footer for a fully branded invoice."],
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
      ["Can I make an invoice without GST?", "Yes. If you're not GST-registered, set the tax rate to 0 and call it an Invoice or Bill of Supply as applicable."],
    ],
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
        <div class="card"><h3><a href="/vat-invoice-template-uk">UK VAT invoice</a></h3><p>Pounds with 20% VAT and the fields HMRC requires.</p></div>
        <div class="card"><h3><a href="/">Blank invoice</a></h3><p>Start from scratch in any of 24 currencies.</p></div>
      </div>
      <h2>Why use an online invoice generator instead of Word or Excel?</h2>
      <p>Spreadsheets break when you add rows, and Word templates don't calculate totals. A generator handles the maths, keeps invoice numbers in sequence, and gives you a clean PDF every time. InvoiceKit runs entirely in your browser, so your client data stays private.</p>`,
    faq: [],
  },
  {
    slug: "pricing", tool: false, crumb: "Pricing",
    title: "InvoiceKit Pricing — Free Forever, Pro from $3.99",
    desc: "InvoiceKit is free for unlimited invoices. Pro adds your logo, removes the footer, saves clients and history, and unlocks premium designs, from $3.99 a month.",
    h1: "Simple pricing",
    lead: "Free for unlimited invoices. Upgrade only if you want branding and saved clients.",
    body: `      <div class="pricing">
        <div class="card"><h3>Free</h3><div class="price">$0</div>
          <ul class="check"><li>Unlimited invoices and PDFs</li><li>24 currencies</li><li>Tax, VAT, GST and discounts</li><li>Auto-saved draft</li><li>Small “Made with InvoiceKit” footer</li></ul>
          <a class="btn ghost" href="/">Create an invoice</a></div>
        <div class="card pro"><h3>Pro</h3><div class="price">$3.99<span class="small muted"> / month</span></div><p class="muted small">or $24 once, for life</p>
          <ul class="check"><li>Your logo on every invoice</li><li>No footer</li><li>Saved clients and invoice history</li><li>Modern and Minimal designs</li><li>Duplicate and auto-number</li><li>Pro on every MiniTools site</li></ul>
          <button class="btn" onclick="Pro.open()">Get Pro</button></div>
      </div>
      <h2>Questions about Pro</h2>`,
    faq: [
      ["How do I activate Pro?", "After checkout you receive a license key by email. Click Get Pro, paste the key and press Activate."],
      ["Can I cancel the monthly plan?", "Yes, at any time from your Gumroad receipt or library. Pro stays active until the end of the paid period."],
      ["Refunds?", "If Pro isn't right for you, email within 14 days of purchase for a full refund."],
    ],
  },
  {
    slug: "about", tool: false, crumb: "About",
    title: "About InvoiceKit — Private, Free Business Tools",
    desc: "InvoiceKit is part of MiniTools: small, fast, private web tools that run in your browser with no signup. Learn who we are and how we handle your data.",
    h1: "About InvoiceKit",
    lead: "Small, fast tools that do one job well, without accounts or tracking your data.",
    body: `      <p>InvoiceKit is part of <strong>MiniTools</strong>, a set of free single-purpose web tools for freelancers and small businesses. Each tool runs entirely in your browser: what you type stays on your device, and nothing is uploaded to our servers.</p>
      <h2>Why we built it</h2>
      <p>Most invoice apps want an account, a monthly subscription and your client list before you can send a single invoice. We think a freelancer sending three invoices a month deserves a tool that just works. The core tool is free forever. An optional Pro pass pays for development and unlocks extras.</p>
      <h2>How we make money</h2>
      <p>Through optional Pro upgrades. No ads in the tool, and we never sell data, partly because we never have it.</p>
      <h2>Contact</h2>
      <p>Questions, bugs or feature requests: use the contact link on your Pro receipt, or reach us through the Gumroad store page.</p>`,
    faq: [],
  },
  {
    slug: "privacy", tool: false, crumb: "Privacy & Terms",
    title: "Privacy Policy & Terms of Use | InvoiceKit",
    desc: "How InvoiceKit handles your data: invoices stay in your browser and are never uploaded. Privacy-friendly analytics, Gumroad payments, and simple terms of use.",
    h1: "Privacy & Terms",
    lead: "Short version: your invoices never leave your device.",
    body: `      <h2>Privacy</h2>
      <p>InvoiceKit runs in your browser. Invoice content, clients and your logo are stored in your browser's local storage on your device and are never sent to our servers. Clearing your browser data deletes them.</p>
      <p>We use Vercel Web Analytics to count page views. It's cookie-free, doesn't track you across sites and doesn't collect what you type into the tool.</p>
      <p>When you activate Pro, your license key is sent to our server once a week to check it with our payment provider, Gumroad. Payments are handled by Gumroad, and we never see your card details.</p>
      <h2>Terms</h2>
      <p>InvoiceKit is provided “as is”, without warranty. You're responsible for the accuracy of your invoices and for following the invoicing and tax rules in your country. Pro is licensed to one person or business. Monthly plans can be cancelled at any time. Refunds are available within 14 days of purchase.</p>`,
    faq: [],
  },
];

for (const p of pages) {
  const schemaExtra = p.tool === false ? [] : [{ "@type": "WebApplication", name: p.h1, url: `${URL}/${p.slug}`, applicationCategory: "BusinessApplication", operatingSystem: "Any (web browser)", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }];
  writeFileSync(join(OUT, `${p.slug}.html`), page({ ...p, schemaExtra }));
}
console.log(`wrote ${pages.length} pages`);
