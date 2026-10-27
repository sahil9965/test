// Render Pinterest pins (1000x1500 PNG) for the tool sites, plus a CSV for Pinterest's bulk upload.
// Usage: node tools/pins.mjs   (writes sites/hub/pins/*.png and marketing/pinterest-pins.csv)
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "sites/hub/pins");
const PIN_BASE = "https://tools.roohsites.com/pins";
const sites = Object.fromEntries(JSON.parse(readFileSync(join(ROOT, "sites.json"), "utf8")).map(s => [s.slug, s]));
const UTM = "utm_source=pinterest&utm_medium=social&utm_campaign=pins";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Pin list: slug, file, page path, board, headline, subline, three points, visual, description, keywords.
const PINS = [
  { slug: "ticketrun", file: "printable-raffle-tickets-with-numbers", path: "/", board: "Raffle & Event Tickets",
    headline: "Printable Raffle Tickets with Numbers", sub: "Matching stubs, any range, free PDF",
    points: ["Numbers 1 to 20,000", "Name and phone lines on stubs", "8 or 10 per page, cut marks"], visual: "tickets",
    desc: "Make printable raffle tickets with numbers on both the ticket and the stub. Pick any range, 8 or 10 per Letter or A4 page, with cut marks. Free PDF, no signup.",
    keywords: "printable raffle tickets, raffle tickets with numbers, numbered raffle tickets, raffle ticket template, fundraiser" },
  { slug: "ticketrun", file: "50-50-raffle-tickets", path: "/50-50-raffle-tickets", board: "Raffle & Event Tickets",
    headline: "Free 50/50 Raffle Tickets", sub: "Numbered tickets and stubs for games and galas",
    points: ["Print your price deals", "Numbered stubs", "Fair winner picker"], visual: "tickets",
    desc: "Printable 50/50 raffle tickets with numbered stubs for school games, galas and fundraisers. Add your price deals, print on Letter or A4 and draw a winner fairly.",
    keywords: "50/50 raffle tickets, 50 50 raffle, printable raffle tickets, fundraiser ideas, PTO fundraiser" },
  { slug: "ticketrun", file: "drink-tickets", path: "/drink-tickets", board: "Raffle & Event Tickets",
    headline: "Printable Drink Tickets", sub: "Numbered drink tickets for weddings and events",
    points: ["Numbered tickets", "20 per page", "Free PDF, no signup"], visual: "tickets",
    desc: "Print numbered drink tickets for weddings, parties, galas and fundraisers: 20 per page with your event name and date. Free PDF, no signup.",
    keywords: "drink tickets, printable drink tickets, wedding drink tickets, event tickets, party tickets" },
  { slug: "ticketrun", file: "raffle-tickets-1-500", path: "/raffle-tickets-1-500", board: "Raffle & Event Tickets",
    headline: "Raffle Tickets 1–500 with Stubs", sub: "Ready-to-print numbered sheets",
    points: ["Numbers on ticket and stub", "Cut-and-stack order", "Letter or A4"], visual: "tickets",
    desc: "Printable raffle tickets numbered 1 to 500 with matching stubs and cut marks. Cut-and-stack order keeps numbers in sequence after cutting. Free PDF.",
    keywords: "raffle tickets 1-500, numbered raffle tickets, printable raffle tickets pdf, raffle ticket sheet" },
  { slug: "bellbook", file: "ab-day-calendar-generator", path: "/", board: "Teacher Planning & A/B Day Calendars",
    headline: "A/B Day Calendar Generator", sub: "Skips holidays, handles snow days",
    points: ["A/B, A/B/C or Day 1–6", "Printable year at a glance", "Google / Outlook calendar file"], visual: "calendar",
    desc: "Make an A/B day calendar for your school year in minutes. It skips holidays, re-flows after snow days and exports a printable PDF and a calendar file.",
    keywords: "a/b day calendar, ab day schedule, block schedule calendar, teacher planner, rotating schedule" },
  { slug: "bellbook", file: "ab-day-lesson-planner", path: "/ab-day-lesson-planner", board: "Teacher Planning & A/B Day Calendars",
    headline: "Dated A/B Day Lesson Planner", sub: "Every page already follows your rotation",
    points: ["Dated pages", "Matches your A/B days", "Free printable PDF"], visual: "calendar",
    desc: "A free dated lesson planner that follows your school's A/B rotation, so each page is already labelled with the right day. Print it or save as PDF.",
    keywords: "lesson planner, a/b day lesson planner, teacher planner printable, dated planner, block schedule" },
  { slug: "goaltally", file: "aba-graph-maker", path: "/", board: "ABA Data Sheets & Graphs",
    headline: "Free ABA Graph Maker", sub: "Phase change lines without Excel",
    points: ["Broken data paths", "Aim and trend lines", "PNG or PDF"], visual: "graph",
    desc: "Make ABA single-case graphs with proper phase change lines, condition labels, aim lines and trend lines. Free, runs in your browser, no Excel needed.",
    keywords: "aba graph, aba graphing, phase change line graph, bcba, behavior analysis, iep progress monitoring" },
  { slug: "goaltally", file: "trial-by-trial-data-sheet", path: "/trial-by-trial-data-sheet", board: "ABA Data Sheets & Graphs",
    headline: "Trial-by-Trial Data Sheet", sub: "Discrete trial (DTT) template, free PDF",
    points: ["1–40 trials", "Up to 31 sessions", "% correct row"], visual: "grid",
    desc: "Free printable trial-by-trial (discrete trial) data sheet with + / – codes, up to 40 trials and a % correct row. Print it or score on a tablet.",
    keywords: "trial by trial data sheet, discrete trial data sheet, dtt data sheet, aba data sheet, rbt" },
  { slug: "goaltally", file: "task-analysis-data-sheet", path: "/task-analysis-data-sheet", board: "ABA Data Sheets & Graphs",
    headline: "Task Analysis Data Sheet Template", sub: "Score each step by prompt level",
    points: ["List every step", "Prompt-level codes", "% independent"], visual: "grid",
    desc: "Free task analysis data sheet template: list each step, score prompt levels each session and track the percent of steps done independently.",
    keywords: "task analysis template, task analysis data sheet, chaining, aba data sheet, special education" },
  { slug: "goaltally", file: "abc-data-sheet", path: "/abc-data-sheet", board: "ABA Data Sheets & Graphs",
    headline: "ABC Data Sheet", sub: "Antecedent, behavior, consequence",
    points: ["Free printable PDF", "Checklist or narrative", "For BCBAs and teachers"], visual: "grid",
    desc: "Free printable ABC data sheet for recording antecedents, behaviors and consequences. Choose a checklist or narrative layout and print or save as PDF.",
    keywords: "abc data sheet, abc data collection, behavior data sheet, aba, special education teacher" },
  { slug: "gradledger", file: "homeschool-transcript-template", path: "/homeschool-transcript-template", board: "Homeschool Records",
    headline: "Homeschool Transcript Template", sub: "With weighted and unweighted GPA",
    points: ["Courses by grade", "Exact GPA, formula shown", "One-page PDF"], visual: "document",
    desc: "Make a free homeschool high school transcript with exact weighted and unweighted GPA, credits by subject and a one-page PDF. No signup.",
    keywords: "homeschool transcript, homeschool transcript template, homeschool gpa, high school homeschool, college applications" },
  { slug: "roomproof", file: "move-in-checklist-with-photos", path: "/move-in-inspection-checklist-with-photos", board: "Landlord & Tenant Checklists",
    headline: "Move-In Checklist with Photos", sub: "Dated photo report as a PDF",
    points: ["Room by room", "Date on every photo", "Signatures included"], visual: "photos",
    desc: "Make a move-in inspection checklist with dated photos, captions and condition ratings, room by room, then download a PDF. Photos stay on your phone.",
    keywords: "move in checklist, move in inspection, rental inspection checklist, tenant tips, security deposit" },
  { slug: "invoicekit", file: "free-invoice-generator", path: "/", board: "Small Business Invoices",
    headline: "Free Invoice Generator", sub: "PDF invoices with no signup",
    points: ["Tax, VAT or GST", "Your logo, saved clients", "24 currencies"], visual: "document",
    desc: "Create a professional invoice with tax, VAT or GST, your logo and saved clients, then download a PDF. Free, no signup, nothing uploaded.",
    keywords: "invoice template, free invoice generator, freelance invoice, small business, gst invoice" },
  { slug: "labelfit", file: "vinted-label-thermal-printer", path: "/vinted-label-thermal-printer", board: "Online Seller Shipping",
    headline: "Vinted Labels on a Thermal Printer", sub: "Turn A4 labels into 6x4 in seconds",
    points: ["Crops and rotates for you", "Splits packing slips", "Nothing uploaded"], visual: "label",
    desc: "Convert A4 Vinted, Evri and Royal Mail labels into crisp 6x4 thermal labels. It finds the label, crops and rotates it, all in your browser.",
    keywords: "vinted label, thermal printer, 6x4 label, shipping label converter, reseller tips" },
  // Holiday season (Nov–Dec): gift certificates, punch cards, holiday raffles and holiday shipping.
  { slug: "giftstub", file: "christmas-gift-certificate-template", path: "/christmas-gift-certificate-template", board: "Small Business Printables",
    headline: "Christmas Gift Certificate Template", sub: "Holiday wording, numbered stubs, free PDF",
    points: ["3 per Letter or A4 page", "A numbered stub for every certificate", "Print a batch or email a PNG"], visual: "certificate",
    cert: { line: "$50 toward any service" },
    desc: "Free Christmas gift certificate template with holiday wording and numbered stubs, 3 per page on Letter or A4. Print a batch for the season or email a PNG to a last-minute shopper. No signup.",
    keywords: "christmas gift certificate template, holiday gift certificate, printable gift certificate, gift certificate with stub, small business holiday" },
  { slug: "labelfit", file: "usps-label-to-4x6", path: "/usps-label-to-4x6", board: "Online Seller Shipping",
    headline: "USPS Label to 4x6", sub: "Click-N-Ship labels on a thermal printer",
    points: ["Crops and rotates the label", "Keeps the barcode sharp", "Free and private, in your browser"], visual: "label",
    desc: "Turn a USPS.com Click-N-Ship 8.5x11 label into a 4x6 PDF for your thermal printer. It crops, rotates and keeps the barcode sharp, right in your browser. Free.",
    keywords: "usps label 4x6, click n ship thermal printer, 4x6 shipping label, thermal label printer, holiday shipping" },
  { slug: "punchperk", file: "coffee-punch-card-template", path: "/coffee-punch-card-template", board: "Small Business Printables",
    headline: "Coffee Punch Card Template", sub: "Free printable loyalty cards for cafés",
    points: ["Coffee cup punches", "A free-drink reward", "Optional serial numbers and QR menu"], visual: "punch",
    card: { name: "Your Café", reward: "Buy 9 drinks, get the 10th free" },
    desc: "Free coffee punch card template for cafés, carts and trucks: coffee cup punches, a free-drink reward, optional serial numbers and a QR menu on the back. 10 cards per page.",
    keywords: "coffee punch card template, coffee loyalty card, printable punch card, cafe loyalty program, buy 9 get 1 free" },
  { slug: "ticketrun", file: "door-prize-tickets", path: "/door-prize-tickets", board: "Raffle & Event Tickets",
    headline: "Printable Door Prize Tickets", sub: "For holiday parties and staff events",
    points: ["Numbered ticket and stub", "Letter or A4 PDF", "Random number picker included"], visual: "tickets",
    tk: ["DOOR PRIZE", "Holiday party · Main hall"],
    desc: "Printable numbered door prize tickets with stubs for holiday parties, staff events and fundraisers: guests keep one half and drop the stub in the box. Letter or A4 PDF plus a random number picker. Free.",
    keywords: "door prize tickets, printable door prize tickets, holiday party raffle, christmas party games, numbered tickets" },
  { slug: "giftstub", file: "salon-gift-certificate-template", path: "/salon-gift-certificate-template", board: "Small Business Printables",
    headline: "Salon Gift Certificate Template", sub: "Sell gift certificates this holiday season",
    points: ["Your salon name and logo", "A dollar amount or a service", "Numbered stubs, 3 per page"], visual: "certificate",
    cert: { line: "Cut & blow-dry with Maria" },
    desc: "Free printable salon gift certificate template with numbered stubs. Add your salon name, logo, a dollar amount or service and booking notes. 3 per page, Letter or A4.",
    keywords: "salon gift certificate template, hair salon gift certificate, printable gift certificate, salon holiday gift, gift certificate with stub" },
  { slug: "invoicekit", file: "contractor-invoice-template", path: "/contractor-invoice-template", board: "Small Business Invoices",
    headline: "Contractor Invoice Template", sub: "Labor, materials and disposal lines",
    points: ["For builders, handymen and electricians", "Tax, VAT or GST", "Free PDF, no signup"], visual: "document",
    desc: "Free contractor invoice template with labor, materials and disposal lines, for builders, handymen, electricians and plumbers. Download a PDF, no signup.",
    keywords: "contractor invoice template, handyman invoice, construction invoice template, free invoice generator, electrician invoice" },
  { slug: "punchperk", file: "salon-loyalty-card-template", path: "/salon-loyalty-card-template", board: "Small Business Printables",
    headline: "Salon Loyalty Card Template", sub: "Punch cards for salons and barbers",
    points: ["Scissors punches", "A free-service reward", "QR code to your booking page"], visual: "punch",
    card: { name: "Your Salon", reward: "Your 10th cut is on us" },
    desc: "Free salon and barber loyalty card template: scissors punches, a free-service reward and a QR code to your booking page. 10 cards per page, Letter or A4.",
    keywords: "salon loyalty card, barber punch card, salon punch card template, loyalty card template, salon rewards" },
  { slug: "ticketrun", file: "raffle-tickets-1-100", path: "/raffle-tickets-1-100", board: "Raffle & Event Tickets",
    headline: "Raffle Tickets 1–100 with Stubs", sub: "For holiday fairs and fundraisers",
    points: ["10 per page, 10 sheets", "Numbered ticket and stub", "Letter or A4, free PDF"], visual: "tickets",
    tk: ["HOLIDAY RAFFLE", "Winter fair · School hall"],
    desc: "Print raffle tickets 1–100 with matching numbered stubs for holiday fairs, PTO fundraisers and office parties: 10 per page on Letter or A4. Edit the text and download a free PDF, no signup.",
    keywords: "raffle tickets 1-100, holiday raffle tickets, christmas raffle, printable raffle tickets, PTO fundraiser" },
  { slug: "giftstub", file: "massage-gift-certificate-template", path: "/massage-gift-certificate-template", board: "Small Business Printables",
    headline: "Massage Gift Certificate Template", sub: "For massage therapists and spas",
    points: ["Session length and booking line", "Your cancellation policy", "Numbered stubs, 3 per page"], visual: "certificate",
    cert: { line: "60-minute relaxation massage" },
    desc: "Free massage gift certificate template for therapists and spas: session length, cancellation policy and booking line, with numbered stubs, 3 per page as a PDF.",
    keywords: "massage gift certificate template, spa gift certificate, printable spa gift card, massage therapist, holiday gift certificate" },
  { slug: "labelfit", file: "ebay-half-sheet-label-to-4x6", path: "/ebay-half-sheet-label-to-4x6", board: "Online Seller Shipping",
    headline: "eBay Half-Sheet Label to 4x6", sub: "Ship faster this holiday season",
    points: ["8.5x11 label to a 4x6 thermal label", "Or two labels on one page", "Free, private, in your browser"], visual: "label",
    desc: "Turn an eBay half-sheet (8.5x11) shipping label into a 4x6 thermal label, or put two labels on one half-sheet page. Free, private and it works in your browser.",
    keywords: "ebay shipping label 4x6, ebay half sheet label, thermal label printer, ebay seller tips, 4x6 label" },
  // Days 25–34, added 27 Oct 2026: the tools that now carry Amazon supply links, plus the IEP sheet
  { slug: "preplabel", file: "fnsku-label-generator", path: "/", board: "Amazon FBA Prep Labels",
    headline: "Free FNSKU Label Generator", sub: "Thermal rolls, DYMO 30334 or label sheets",
    points: ["Paste FNSKUs or import a CSV", "2 × 1 in thermal or 30-up sheets", "Print-ready PDF, no signup"], visual: "fnsku",
    desc: "Make FNSKU labels for Amazon FBA in your browser: paste your X00 codes or import a CSV, pick 2 × 1 in thermal rolls, DYMO 30334 or 30-up Letter sheets, and download a PDF to print at 100%.",
    keywords: "fnsku label generator, fnsku labels, amazon fba labels, fba prep, thermal label printer" },
  { slug: "punchperk", file: "punch-card-template-10-per-sheet", path: "/punch-card-template-10-per-sheet", board: "Small Business Printables",
    headline: "Punch Cards, 10 per Page", sub: "A template sized for business card sheets",
    points: ["3.5 × 2 in on Letter, 85 × 55 mm on A4", "Alignment test page", "Matching backs for double-sided"], visual: "punch",
    card: { name: "Corner Bakery", reward: "Every 10th pastry is free" },
    desc: "Print 10 loyalty punch cards per page on business card sheets: 3.5 × 2 in on Letter or 85 × 55 mm on A4, with an alignment test and matching backs. Free PDF from your browser.",
    keywords: "punch card template, punch card 10 per page, business card punch card, loyalty card template, printable punch cards" },
  { slug: "paneldex", file: "electrical-panel-schedule-template", path: "/", board: "Electrician Printables",
    headline: "Electrical Panel Schedule Template", sub: "Laid out like the real panel",
    points: ["Odd circuits left, even right", "Load per leg as you type", "PDF, Excel, door directory, labels"], visual: "panel",
    desc: "Fill in a panel schedule that looks like the panel: odd circuits down the left, even down the right, with amps, wire size, AFCI/GFCI and load per leg. Download a PDF, Excel, a door directory or labels.",
    keywords: "panel schedule template, electrical panel schedule, breaker panel directory, electrician printables, circuit directory" },
  { slug: "glancesheet", file: "iep-at-a-glance-template", path: "/", board: "ABA Data Sheets & Graphs",
    headline: "IEP at a Glance Template", sub: "One page per student for subs and paras",
    points: ["Strengths, supports, what to watch", "Whole-caseload batch", "504 and sub versions"], visual: "document",
    desc: "Make a one-page IEP at a glance for the teachers, subs and paras who don't read the full IEP: strengths, what helps, what to watch for and accommodations. Batch a whole caseload as one PDF.",
    keywords: "iep at a glance, iep at a glance template, special education printables, 504 plan, sub plans" },
  { slug: "labelfit", file: "split-shipping-label-and-packing-slip", path: "/split-shipping-label-and-packing-slip", board: "Online Seller Shipping",
    headline: "Split Label and Packing Slip", sub: "One PDF page into two 4 × 6 pages",
    points: ["Label on page 1, slip on page 2", "Or leave the slip out", "Nothing is uploaded"], visual: "label",
    desc: "Got a PDF with the shipping label and packing slip on one page? Split it into two 4 × 6 in (100 × 150 mm) pages for your thermal printer, or drop the slip. Free and it runs in your browser.",
    keywords: "split shipping label, packing slip, 4x6 label, thermal printer, shipping label pdf" },
  { slug: "giftstub", file: "photography-gift-certificate-template", path: "/photography-gift-certificate-template", board: "Small Business Printables",
    headline: "Photography Gift Certificate Template", sub: "Sell portrait sessions as gifts",
    points: ["Session type and edited images", "How and when to book", "Numbered stubs or a PNG to email"], visual: "certificate",
    cert: { line: "One 1-hour portrait session" },
    desc: "A free gift certificate template for photographers: session type, edited images, booking window and a numbered stub. Print 3 per page, or save one as a PNG to email to the buyer.",
    keywords: "photography gift certificate, photo session gift card, photographer gift certificate template, mini session, holiday photos" },
  { slug: "paneldex", file: "breaker-box-label-template", path: "/breaker-box-label-template", board: "Electrician Printables",
    headline: "Breaker Box Label Template", sub: "One numbered label per circuit",
    points: ["Number and short name on each", "4 across with cut lines", "Letter or A4, print and stick"], visual: "strips",
    desc: "Print one small label per breaker with its circuit number and a short name, 4 across with cut lines on Letter or A4. Cut them out and stick each one beside its breaker. Free, no signup.",
    keywords: "breaker box labels, circuit breaker labels, breaker label template, electrical panel labels, label maker" },
  { slug: "preplabel", file: "dymo-30334-fnsku-labels", path: "/dymo-30334-fnsku-labels", board: "Amazon FBA Prep Labels",
    headline: "DYMO 30334 FNSKU Labels", sub: "2.25 × 1.25 in, one label per page",
    points: ["Exact DYMO 30334 size", "Sharp 300 dpi barcodes", "Two title lines"], visual: "fnsku",
    desc: "Print FNSKU labels on DYMO 30334 rolls (2-1/4 × 1-1/4 in) with a LabelWriter: the PDF is cut to the exact label size with 300 dpi barcodes and two title lines. Free, no signup.",
    keywords: "dymo 30334, dymo fnsku labels, labelwriter fnsku, amazon fba labels, 2.25 x 1.25 labels" },
  { slug: "giftstub", file: "gift-certificate-template-with-stub", path: "/gift-certificate-template-with-stub", board: "Small Business Printables",
    headline: "Gift Certificate Template with Stub", sub: "Numbered stubs so you can track every one",
    points: ["Issued to, date, amount, redeemed", "Matching numbers on both parts", "3 per page, free PDF"], visual: "certificate",
    desc: "Keep track of every gift certificate you sell: each one has a stub with the same number and lines for issued to, date, amount and redeemed. 3 per Letter or A4 page, free PDF.",
    keywords: "gift certificate template with stub, numbered gift certificates, gift certificate tracking, small business, printable gift certificate" },
  { slug: "labelfit", file: "print-shipping-label-from-phone", path: "/print-shipping-label-from-phone", board: "Online Seller Shipping",
    headline: "Print a Shipping Label from Your Phone", sub: "To a Bluetooth thermal printer",
    points: ["PDF to a 4 × 6 in image", "203 or 300 dpi", "iPhone and Android"], visual: "label",
    desc: "Selling from your phone? Turn the label PDF into a 4 × 6 in image at 203 or 300 dpi and share it to your Bluetooth printer app. Works on iPhone and Android, free.",
    keywords: "print shipping label from phone, bluetooth thermal printer, 4x6 label, iphone shipping label, poshmark label" },
];

function visual(kind, accent, p = {}) {
  const pale = `${accent}22`;
  const [tkTitle, tkLine] = p.tk || ["SPRING RAFFLE", "Saturday · School gym"];
  if (kind === "tickets") return `<div class="tickets">${[1, 2, 3, 4].map(n => `
    <div class="tk"><div class="tk-main"><b>${esc(tkTitle)}</b><span>${esc(tkLine)}</span><i>No. ${String(n).padStart(4, "0")}</i></div>
    <div class="tk-stub"><i>No. ${String(n).padStart(4, "0")}</i><span>Name ________</span><span>Phone ________</span></div></div>`).join("")}</div>`;
  if (kind === "calendar") {
    const days = []; let d = 0;
    for (let i = 0; i < 35; i++) { const wk = i % 7; if (wk === 0 || wk === 6 || i < 2 || i > 32) days.push(`<span class="off"></span>`); else if (i === 17) days.push(`<span class="hol">–</span>`); else days.push(`<span class="${d++ % 2 ? "b" : "a"}">${d % 2 ? "A" : "B"}</span>`); }
    return `<div class="cal"><div class="cal-h">OCTOBER</div><div class="cal-g">${["S","M","T","W","T","F","S"].map(x => `<em>${x}</em>`).join("")}${days.join("")}</div></div>`;
  }
  if (kind === "grid") return `<div class="grid">${Array.from({ length: 7 }, (_, r) => `<div class="row"><span class="lbl">${r === 0 ? "Target" : "Step " + r}</span>${Array.from({ length: 6 }, (_, c) => `<span class="cell">${r === 0 ? "S" + (c + 1) : ((r * 7 + c * 3) % 4 ? "+" : "–")}</span>`).join("")}</div>`).join("")}</div>`;
  if (kind === "graph") {
    const ys = [20, 25, 15, 22, 18, null, 40, 52, 58, 70, 75, 82, 88];
    const x = i => 60 + i * 52, y = v => 340 - v * 3.2;
    const seg = (a, b) => ys.slice(a, b).map((v, i) => `${x(a + i)},${y(v)}`).join(" ");
    return `<svg class="graph" viewBox="0 0 760 380"><line x1="50" y1="20" x2="50" y2="340" stroke="#1b1b1f" stroke-width="3"/><line x1="50" y1="340" x2="740" y2="340" stroke="#1b1b1f" stroke-width="3"/>
      <line x1="${x(5)}" y1="30" x2="${x(5)}" y2="340" stroke="#1b1b1f" stroke-width="3" stroke-dasharray="10 8"/>
      <text x="${x(2)}" y="50" text-anchor="middle" font-size="26" fill="#1b1b1f">Baseline</text><text x="${x(9)}" y="50" text-anchor="middle" font-size="26" fill="#1b1b1f">Intervention</text>
      <polyline points="${seg(0, 5)}" fill="none" stroke="${accent}" stroke-width="4"/><polyline points="${seg(6, 13)}" fill="none" stroke="${accent}" stroke-width="4"/>
      ${ys.map((v, i) => v == null ? "" : `<circle cx="${x(i)}" cy="${y(v)}" r="9" fill="${accent}"/>`).join("")}</svg>`;
  }
  if (kind === "photos") return `<div class="photos">${["Living room · walls", "Kitchen · oven", "Bedroom · carpet", "Bathroom · tiles"].map((c, i) => `<figure><div class="ph" style="background:linear-gradient(135deg,${pale},${accent}55)"><small>12 Oct 2026 · 09:4${i}</small></div><figcaption>${c}<b>${["Good", "Fair", "Good", "Worn"][i]}</b></figcaption></figure>`).join("")}</div>`;
  if (kind === "label") return `<div class="lbl-row"><div class="a4"><div class="lab"></div><div class="slip"></div></div><div class="arrow">→</div><div class="l64"><div class="bars"></div><span>6 × 4 in</span></div></div>`;
  if (kind === "certificate") return `<div class="cert"><div class="cert-stub"><b>STUB</b><i>GC-0001</i><span>Issued to</span><span>Date</span><span>Amount</span></div>
    <div class="cert-main"><small>YOUR BUSINESS NAME</small><h2>Gift Certificate</h2><p>${esc((p.cert || {}).line || "$50 toward any service")}</p><div class="tf"><span>To</span><span>From</span></div></div></div>`;
  if (kind === "fnsku") return `<div class="fn">${["Bamboo cutting board", "Silicone spatula set", "Glass jar 16 oz", "Linen napkins 4-pack"].map((t, i) => `
    <div class="fn-l"><div class="fn-bars"></div><b>X00${["2K7QF1", "3B9TZ4", "1M5RD8", "4H2WC6"][i]}</b><span>${t}</span><span>New</span></div>`).join("")}</div>`;
  if (kind === "panel") {
    const L = ["Kitchen counter", "Range", "Range", "Dishwasher", "Laundry", "Bath GFCI"], R = ["Furnace", "Water heater", "Water heater", "Garage", "Bedrooms", "Spare"];
    return `<div class="pnl"><div class="pnl-h">PANEL SCHEDULE · 200 A MAIN</div>${L.map((l, i) => `<div class="pnl-r"><span>${l}</span><b>${2 * i + 1}</b><b>${2 * i + 2}</b><span>${R[i]}</span></div>`).join("")}</div>`;
  }
  if (kind === "strips") return `<div class="strips">${["1 Kitchen", "2 Furnace", "3/5 Range", "4/6 Water htr", "7 Dishwasher", "8 Garage", "9 Laundry", "10 Bedrooms", "11 Bath", "12 Spare", "13 Lights", "14 Outdoor"].map(x => {
    const [n, ...w] = x.split(" "); return `<div class="st"><b>${n}</b><span>${w.join(" ")}</span></div>`; }).join("")}</div>`;
  if (kind === "punch") {
    const c = p.card || { name: "Your Business", reward: "Buy 9, get the 10th free" };
    return `<div class="punches">${[6, 3].map(on => `<div class="pc"><b>${esc(c.name)}</b><em>${esc(c.reward)}</em><div class="dots">${Array.from({ length: 10 }, (_, i) =>
      i === 9 ? `<span class="free">FREE</span>` : `<span class="${i < on ? "on" : ""}"></span>`).join("")}</div></div>`).join("")}</div>`;
  }
  // document (invoice / transcript)
  return `<div class="doc"><div class="doc-h"><b></b><i></i></div>${Array.from({ length: 6 }, (_, i) => `<div class="doc-r"><span style="width:${50 + (i * 13) % 30}%"></span><em></em></div>`).join("")}<div class="doc-t"><span>Total</span><b></b></div></div>`;
}

function pinHtml(p) {
  const s = sites[p.slug]; const accent = s.accent;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:1000px;height:1500px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"DejaVu Sans",sans-serif;background:#fbfaf7;color:#1b1b1f;display:flex;flex-direction:column}
.top{background:${accent};color:#fff;padding:70px 70px 60px}
.kicker{font-size:30px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.9}
h1{font-size:84px;line-height:1.04;margin:18px 0 18px;letter-spacing:-.02em}
.sub{font-size:36px;line-height:1.25;opacity:.95}
.vis{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 60px}
.pts{display:flex;flex-direction:column;gap:14px;padding:0 70px 30px}
.pts span{font-size:34px;display:flex;gap:16px;align-items:center}.pts span:before{content:"";width:18px;height:18px;border-radius:50%;background:${accent};flex:none}
.foot{display:flex;justify-content:space-between;align-items:center;padding:30px 70px 60px;font-size:32px}
.foot b{color:${accent}}.badge{background:#1b1b1f;color:#fff;border-radius:999px;padding:12px 26px;font-size:28px;font-weight:700}
.tickets{display:flex;flex-direction:column;gap:18px;width:100%}
.tk{display:flex;border:3px solid #1b1b1f;border-radius:10px;background:#fff;height:120px}
.tk-main{flex:1;padding:14px 24px;display:flex;flex-direction:column;justify-content:center;position:relative}
.tk-main b{font-size:32px;color:${accent}}.tk-main span{font-size:22px;color:#555}.tk-main i,.tk-stub i{font-style:normal;font-weight:800;font-size:26px}
.tk-main i{position:absolute;right:24px;top:14px}
.tk-stub{width:250px;border-left:3px dashed #1b1b1f;padding:12px 18px;display:flex;flex-direction:column;justify-content:center;gap:4px}.tk-stub span{font-size:20px;color:#444}
.cal{background:#fff;border:3px solid #1b1b1f;border-radius:14px;padding:26px;width:100%}
.cal-h{font-size:36px;font-weight:800;margin-bottom:16px;color:${accent}}
.cal-g{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}.cal-g em{font-style:normal;text-align:center;font-size:26px;color:#666;font-weight:700}
.cal-g span{height:78px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800}
.cal-g .a{background:${accent};color:#fff}.cal-g .b{background:${accent}33;color:#1b1b1f}.cal-g .off{background:#f0eee9}.cal-g .hol{background:#fde7a8}
.grid{background:#fff;border:3px solid #1b1b1f;border-radius:12px;width:100%;overflow:hidden}
.row{display:flex}.row span{border-right:2px solid #ccc;border-bottom:2px solid #ccc;height:76px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700}
.row .lbl{width:200px;justify-content:flex-start;padding-left:18px;font-size:26px;color:#444}.row .cell{flex:1}.row:first-child span{background:${accent}22;font-size:24px}
.graph{width:100%;background:#fff;border:3px solid #1b1b1f;border-radius:12px;padding:10px}
.photos{display:grid;grid-template-columns:1fr 1fr;gap:20px;width:100%}
figure{margin:0;background:#fff;border:3px solid #1b1b1f;border-radius:12px;overflow:hidden}.ph{height:200px;position:relative}.ph small{position:absolute;right:10px;bottom:8px;background:#000a;color:#fff;font-size:18px;padding:3px 8px;border-radius:6px}
figcaption{font-size:24px;padding:12px 14px;display:flex;justify-content:space-between}figcaption b{color:${accent}}
.lbl-row{display:flex;align-items:center;gap:30px}.a4{width:300px;height:424px;background:#fff;border:3px solid #1b1b1f;padding:20px;display:flex;flex-direction:column;gap:16px}
.lab{flex:1;border:3px solid ${accent};border-radius:6px}.slip{height:110px;background:#eee;border-radius:6px}
.arrow{font-size:90px;color:${accent};font-weight:800}.l64{width:260px;height:390px;background:#fff;border:3px solid #1b1b1f;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;font-size:28px;font-weight:700}
.bars{width:190px;height:140px;background:repeating-linear-gradient(90deg,#1b1b1f 0 6px,#fff 6px 10px,#1b1b1f 10px 12px,#fff 12px 18px)}
.cert{display:flex;width:100%;height:440px;background:#fff;border:3px solid #1b1b1f;border-radius:12px;overflow:hidden}
.cert-stub{width:240px;background:${accent}14;border-right:3px dashed #1b1b1f;padding:26px 20px;display:flex;flex-direction:column;gap:24px}
.cert-stub b{font-size:20px;color:#555;letter-spacing:.1em}.cert-stub i{font-style:normal;font-size:32px;font-weight:800;color:${accent}}
.cert-stub span{border-bottom:2px solid #999;font-size:20px;color:#666;padding-bottom:6px}
.cert-main{flex:1;margin:22px;border:5px double ${accent};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:20px}
.cert-main small{font-size:22px;letter-spacing:.14em;font-weight:700;color:#444}
.cert-main h2{margin:0;font-family:Georgia,"DejaVu Serif",serif;font-size:66px;color:${accent};font-weight:700}
.cert-main p{margin:0;font-size:30px;font-weight:700}
.cert-main .tf{display:flex;gap:30px;width:100%;margin-top:18px}.cert-main .tf span{flex:1;border-bottom:2px solid #999;text-align:left;font-size:20px;color:#666;padding-bottom:6px}
.punches{display:flex;flex-direction:column;gap:24px;width:100%}
.pc{background:#fff;border:3px solid #1b1b1f;border-radius:18px;padding:20px 34px 22px}
.pc b{display:block;font-size:40px}.pc em{display:block;font-style:normal;font-size:28px;color:${accent};font-weight:700;margin:4px 0 16px}
.pc .dots{display:grid;grid-template-columns:repeat(5,80px);justify-content:space-between;row-gap:14px}
.pc .dots span{width:80px;height:80px;border-radius:50%;border:5px solid ${accent};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800}
.pc .dots .on{background:${accent}88}.pc .dots .free{background:${accent};color:#fff}
.fn{display:grid;grid-template-columns:1fr 1fr;gap:22px;width:100%}
.fn-l{background:#fff;border:3px solid #1b1b1f;border-radius:10px;padding:18px 20px;display:flex;flex-direction:column;gap:6px}
.fn-bars{height:110px;background:repeating-linear-gradient(90deg,#1b1b1f 0 5px,#fff 5px 8px,#1b1b1f 8px 10px,#fff 10px 15px,#1b1b1f 15px 18px,#fff 18px 21px)}
.fn-l b{font-size:28px;letter-spacing:.08em}.fn-l span{font-size:20px;color:#444}
.pnl{background:#fff;border:3px solid #1b1b1f;border-radius:12px;width:100%;overflow:hidden}
.pnl-h{background:${accent};color:#fff;font-size:28px;font-weight:800;padding:16px 22px;letter-spacing:.04em}
.pnl-r{display:grid;grid-template-columns:1fr 70px 70px 1fr;border-top:2px solid #ddd}.pnl-r span{font-size:26px;padding:20px 18px}.pnl-r span:last-child{text-align:right}
.pnl-r b{font-size:28px;text-align:center;padding:20px 0;background:${accent}18;border-left:2px solid #ddd;border-right:2px solid #ddd}
.strips{display:grid;grid-template-columns:repeat(4,1fr);gap:0;width:100%;background:#fff;border:3px solid #1b1b1f;border-radius:10px;overflow:hidden}
.st{border-right:2px dashed #999;border-bottom:2px dashed #999;padding:22px 14px;display:flex;flex-direction:column;align-items:center;gap:6px}
.st b{font-size:38px;color:${accent}}.st span{font-size:20px;color:#333;text-align:center}
.doc{background:#fff;border:3px solid #1b1b1f;border-radius:12px;width:82%;padding:36px;display:flex;flex-direction:column;gap:22px}
.doc-h{display:flex;justify-content:space-between;margin-bottom:10px}.doc-h b{width:200px;height:44px;background:${accent};border-radius:6px}.doc-h i{width:140px;height:44px;background:#ddd;border-radius:6px}
.doc-r{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #eee;padding-bottom:16px}.doc-r span{height:20px;background:#ccc;border-radius:4px}.doc-r em{width:90px;height:20px;background:#bbb;border-radius:4px}
.doc-t{display:flex;justify-content:space-between;align-items:center;font-size:32px;font-weight:800}.doc-t b{width:150px;height:34px;background:${accent};border-radius:6px}
</style></head><body>
<div class="top"><div class="kicker">${esc(s.name)} · Free tool</div><h1>${esc(p.headline)}</h1><div class="sub">${esc(p.sub)}</div></div>
<div class="vis">${visual(p.visual, accent, p)}</div>
<div class="pts">${p.points.map(x => `<span>${esc(x)}</span>`).join("")}</div>
<div class="foot"><span><b>${esc(new URL(s.url).host)}</b></span><span class="badge">Free · No signup</span></div>
</body></html>`;
}

mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1000, height: 1500 } });
const rows = [["Title", "Media URL", "Pinterest board", "Thumbnail", "Description", "Link", "Publish date", "Keywords"]];
for (const p of PINS) {
  await page.setContent(pinHtml(p));
  await page.screenshot({ path: join(OUT, `${p.file}.png`) });
  const link = `${sites[p.slug].url}${p.path}${p.path.includes("?") ? "&" : "?"}${UTM}`;
  rows.push([p.headline, `${PIN_BASE}/${p.file}.png`, p.board, "", p.desc, link, "", p.keywords]);
}
await b.close();
const csv = rows.map(r => r.map(v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v).join(",")).join("\n") + "\n";
writeFileSync(join(ROOT, "marketing/pinterest-pins.csv"), csv);

// Daily posting schedule: alternate niches so no audience sees the same tool two days running.
const BOARDS = {
  "Raffle & Event Tickets": "Free printable raffle, 50/50, drink and meal tickets with numbered stubs for fundraisers, PTOs, schools and events.",
  "Teacher Planning & A/B Day Calendars": "Free A/B day and rotating-schedule calendars, dated lesson planners and printables for teachers.",
  "ABA Data Sheets & Graphs": "Free printable ABA data sheets and a graph maker for BCBAs, RBTs and special education teachers.",
  "Homeschool Records": "Free homeschool transcript, GPA and record-keeping tools for high school homeschoolers.",
  "Landlord & Tenant Checklists": "Free move-in, move-out and inspection checklists with dated photos for renters and landlords.",
  "Small Business Invoices": "Free invoice templates and an invoice generator for freelancers and small businesses.",
  "Online Seller Shipping": "Free tools and tips for Vinted, eBay and Etsy sellers: shipping labels, thermal printers and packing.",
  "Small Business Printables": "Free printable gift certificates, loyalty punch cards and vouchers for salons, spas, cafés and small shops.",
  "Amazon FBA Prep Labels": "Free FNSKU label tools for Amazon FBA sellers: thermal rolls, DYMO labels, label sheets and prep warnings.",
  "Electrician Printables": "Free electrical panel schedule templates, breaker box labels and circuit directories for electricians and homeowners.",
};
const ORDER = ["printable-raffle-tickets-with-numbers", "ab-day-calendar-generator", "aba-graph-maker", "homeschool-transcript-template",
  "50-50-raffle-tickets", "trial-by-trial-data-sheet", "move-in-checklist-with-photos", "vinted-label-thermal-printer",
  "ab-day-lesson-planner", "drink-tickets", "task-analysis-data-sheet", "free-invoice-generator", "raffle-tickets-1-500", "abc-data-sheet",
  // Holiday season, added 27 Oct 2026
  "christmas-gift-certificate-template", "usps-label-to-4x6", "coffee-punch-card-template", "door-prize-tickets", "salon-gift-certificate-template",
  "contractor-invoice-template", "salon-loyalty-card-template", "raffle-tickets-1-100", "massage-gift-certificate-template", "ebay-half-sheet-label-to-4x6",
  // Added 27 Oct 2026 (days 25–34): tools with Amazon supply links, two new boards
  "fnsku-label-generator", "punch-card-template-10-per-sheet", "electrical-panel-schedule-template", "iep-at-a-glance-template",
  "split-shipping-label-and-packing-slip", "photography-gift-certificate-template", "breaker-box-label-template", "dymo-30334-fnsku-labels",
  "gift-certificate-template-with-stub", "print-shipping-label-from-phone"];
const VISUAL_ALT = { tickets: "a sheet of numbered raffle tickets with matching stubs", calendar: "a month calendar with school days labelled A and B",
  graph: "a line graph with a dashed phase change line between baseline and intervention", grid: "a printable data sheet grid with plus and minus scores",
  photos: "four dated room photos with condition ratings", label: "an A4 label page converted into a 6 by 4 inch thermal label", document: "a one-page document preview",
  certificate: "a gift certificate with a numbered tear-off stub", punch: "two loyalty punch cards with ten punch circles and a free reward",
  fnsku: "a sheet of FNSKU barcode labels with product names", panel: "a two-column breaker panel schedule with numbered circuits",
  strips: "numbered breaker labels with short circuit names and cut lines" };
const byFile = Object.fromEntries(PINS.map(p => [p.file, p]));
const schedule = ORDER.map((f, i) => {
  const p = byFile[f], s = sites[p.slug];
  return { day: i + 1, title: p.headline, description: p.desc, board: p.board, image: `${PIN_BASE}/${p.file}.png`,
    link: `${s.url}${p.path}?${UTM}`, alt: `${p.headline}: ${p.sub}. The image shows ${VISUAL_ALT[p.visual]}, from ${new URL(s.url).host}.`,
    keywords: p.keywords };
});
writeFileSync(join(OUT, "schedule.json"), JSON.stringify({ updated: "2026-10-27", boards: BOARDS, posts: schedule }, null, 2) + "\n");
const md = [`# Pinterest posts: daily schedule`, ``,
  `One pin a day, in this order. Cowork reads the same list from ${PIN_BASE}/schedule.json (see marketing/cowork-pinterest-prompt.md). Regenerate both with \`node tools/pins.mjs\`.`, ``,
  `## Boards to create first`, ``, ...Object.entries(BOARDS).map(([n, d]) => `- **${n}**: ${d}`), ``,
  ...schedule.flatMap(x => [`## Day ${x.day}: ${x.title}`, ``, `- **Board:** ${x.board}`, `- **Image:** ${x.image}`, `- **Link:** ${x.link}`,
    `- **Description:** ${x.description}`, `- **Alt text:** ${x.alt}`, `- **Keywords:** ${x.keywords}`, ``])].join("\n");
writeFileSync(join(ROOT, "marketing/pinterest-posts.md"), md);
console.log(`wrote ${PINS.length} pins, sites/hub/pins/schedule.json, marketing/pinterest-pins.csv and marketing/pinterest-posts.md`);
