// Generates every Roomproof page (home, landing pages, about, privacy) from one layout.
// Usage: node src/roomproof/pages.mjs   (writes into sites/roomproof/)
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../sites/roomproof");
const URL = "https://photoreport.roohsites.com";
const NAME = "Roomproof";
const ACCENT = "#15803d";
const DATE = "2026-10-08", DATE_H = "8 October 2026";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const tbl = (head, rows) => `      <table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>
${rows.map(r => `      <tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("\n")}
      </tbody></table>`;
const steps = items => `      <ol class="steps">\n${items.map(([b, t]) => `        <li><strong>${b}</strong> ${t}</li>`).join("\n")}\n      </ol>`;
const ul = items => `      <ul>\n${items.map(t => `        <li>${t}</li>`).join("\n")}\n      </ul>`;

const LANDING = [
  ["/move-out-checklist-with-photos", "Move-out checklist"],
  ["/move-in-inspection-checklist-with-photos", "Move-in inspection"],
  ["/punch-list-with-photos", "Punch list"],
  ["/before-and-after-photo-report", "Before and after"],
  ["/cleaning-photo-report", "Cleaning report"],
  ["/airbnb-turnover-checklist-with-photos", "Airbnb turnover"],
  ["/property-inventory-with-photos", "UK property inventory"],
  ["/entry-condition-report-photos", "AU entry condition"],
];

function page(p) {
  const { slug, title, desc, h1, lead, preset, tool = true, body, faq = [], crumb, home = false, badges, schemaExtra = [] } = p;
  const path = home ? "/" : `/${slug}`;
  const url = home ? `${URL}/` : `${URL}/${slug}`;
  if (title.length < 45 || title.length > 62) throw new Error(`${slug || "home"}: title length ${title.length}: ${title}`);
  if (desc.length < 120 || desc.length > 158) throw new Error(`${slug || "home"}: description length ${desc.length}`);
  const graph = [
    ...(home ? [] : [{ "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` },
      { "@type": "ListItem", position: 2, name: crumb || h1, item: url }] }]),
    ...schemaExtra,
    ...(faq.length ? [{ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) }] : []),
  ];
  const nav = home
    ? `<a href="#how">How it works</a><a href="/photo-report-template">Templates</a><a href="#faq">FAQ</a>`
    : `<a href="/">Photo report generator</a><a href="/photo-report-template">Templates</a><a href="/about">About</a>`;
  return `<!doctype html>
<html lang="${p.lang || "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="${ACCENT}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(p.ogTitle || title)}">
<meta property="og:description" content="${esc(p.ogDesc || desc)}">
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
    <nav aria-label="Main">${nav}</nav>
  </header>
  <main id="main">
${home ? "" : `    <p class="crumbs"><a href="/">${NAME}</a> › ${esc(crumb || h1)}</p>\n`}    <section class="hero">
      <h1>${esc(h1)}</h1>
      <p class="lead">${lead}</p>
${badges ? `      <ul class="badges">${badges.map(b => `<li>${b}</li>`).join("")}</ul>\n` : ""}    </section>
${tool ? `    <section class="tool card" aria-label="Photo report generator"><div id="rp-tool"${preset ? ` data-preset="${preset}"` : ""}><p class="rp-hint">Loading the photo report generator… It needs JavaScript turned on.</p></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? `      <h2 id="faq">${home ? "Frequently asked questions" : "FAQ"}</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}\n` : ""}${p.related === false ? "" : `      <h2>${home ? "More photo report templates" : "Other photo report templates"}</h2>
      <ul class="related">
${[["/", "General photo report"], ...LANDING].filter(([h]) => h !== path).map(([h, t]) => `        <li><a href="${h}">${t}</a></li>`).join("\n")}
${path === "/photo-report-template" ? "" : `        <li><a href="/photo-report-template">All templates</a></li>\n`}      </ul>
`}      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the Rooh Sites team. ${p.disclaimer || "Roomproof is a documentation tool. This page is general information, not legal advice."}</p>
    </article>
  </main>
  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">Photo report generator</a></li><li><a href="/photo-report-template">Photo report templates</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Templates</h4><ul>${LANDING.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy.</p>
  </footer>
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/photo.js" defer></script>\n<script src="/pdf.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

const app = (name, url, extra = {}) => ({
  "@type": "WebApplication", name, url, applicationCategory: "BusinessApplication", operatingSystem: "Any (web browser)",
  browserRequirements: "Requires JavaScript", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, ...extra,
});

// ---------------------------------------------------------------- home
const homeFaq = [
  ["Is Roomproof really free?", "Yes. Every feature is free: as many photos and rooms as you need, before and after pairs, photo markup, signatures, your logo and project files. There's no account and no paid tier. Each PDF page has a small “Made with Roomproof” footer."],
  ["Are my photos uploaded anywhere?", "No. Photos are resized, stored and turned into a PDF inside your browser on this device. Nothing you add is sent to a server, so there is nothing for us to see, sell or delete."],
  ["How many photos can I add?", "There's no fixed limit. Each photo is resized to 1,600 pixels on its longest side when you add it, and printed at the size the layout needs, which keeps the PDF manageable. Reports with well over 100 photos can be slow to export on older phones; choosing 4 or 6 photos per page makes the file smaller."],
  ["Does a photo report count as evidence?", "Dated photo reports are widely used in deposit disputes, small claims and insurance claims, but the person deciding (an adjudicator, judge or insurer) chooses how much weight to give them. Roomproof doesn't make a report legally binding. Photos taken on the day, signatures from both sides and sending the PDF promptly all make a report more persuasive."],
  ["How do I add a timestamp to my photos?", "Just add them. Roomproof reads the time your camera saved in each photo file and prints it in the corner of every photo in the PDF. If a photo has no camera time, it uses the file date and says so. Untick “Print date and time on each photo” if you don't want the stamp."],
  ["Can I turn my move-in report into a move-out report?", "Yes. Save the move-in report as a project file. At move-out, choose “Start a follow-up from a saved project” and open that file. Rooms and items carry over, your move-in photos and ratings appear on the left, and you add move-out photos on the right."],
  ["Does it work on iPhone and Android?", "Yes, in Safari, Chrome, Edge, Firefox and Samsung Internet. On a phone, the Camera button takes photos straight into the report. You can add Roomproof to your home screen, and it keeps working without a connection after your first visit."],
  ["Can I edit the report later or on another device?", "Yes. Your draft autosaves in this browser. “Save project” downloads a .roomproof file with every photo and note, which you can open on any device to keep editing or create the PDF again. There's no cloud sync, so the project file is how you move a report between devices."],
];
const home = {
  home: true, preset: "",
  title: "Photo Report Generator — Free, Timestamped PDF | Roomproof",
  desc: "Make a photo report PDF in minutes: date-stamped photos, captions, condition ratings and signatures, room by room. Free, no signup, nothing is uploaded.",
  ogTitle: "Photo Report Generator — Free, Timestamped PDF",
  h1: "Photo Report Generator",
  lead: "Turn phone photos into a dated, captioned PDF report, room by room. Free, no signup, and your photos never leave your device.",
  badges: ["100% free", "No signup", "Photos stay on your device", "A4 &amp; US Letter"],
  schemaExtra: [
    app(NAME, `${URL}/`, {
      description: "Free online photo report generator. Add photos room by room with date stamps, captions, condition ratings and signatures, then download a PDF. Runs in the browser; nothing is uploaded.",
      featureList: ["Date and time stamp on every photo", "Condition ratings and notes per item", "Captions and photo markup", "Before and after photo pairs", "Move-in to move-out comparison", "Two on-screen signatures", "Summary of issues", "1, 2, 4 or 6 photos per page", "A4 and US Letter", "Logo and company details", "Project file to reopen and edit", "Works offline", "No signup"],
      publisher: { "@type": "Organization", name: "Rooh Sites", url: "https://roohsites.com/" },
    }),
    { "@type": "HowTo", name: "How to make a photo report", totalTime: "PT15M", step: [
      { "@type": "HowToStep", name: "Pick a template", text: "Choose move-in, move-out, punch list, before and after, cleaning, rental turnover, UK inventory, Australian entry condition, or a general photo report." },
      { "@type": "HowToStep", name: "Fill in the details", text: "Add the address, date, who prepared the report and who it is for. Optionally add a company name and logo." },
      { "@type": "HowToStep", name: "Work through each room", text: "Rate each item, take or add photos, and write a short note about anything that isn't in good condition. Tap a photo to caption it or mark the problem." },
      { "@type": "HowToStep", name: "Sign", text: "Each person signs on screen, or leaves the line blank to sign the printout." },
      { "@type": "HowToStep", name: "Create the PDF", text: "Choose A4 or US Letter and how many photos per page, then create, download or share the PDF. Save the project file to edit it later." }] },
  ],
  body: `      <p class="tldr"><strong>Quick answer:</strong> To make a photo report, choose a template, add photos to each room or item, rate its condition and add a short note, then click <em>Create PDF report</em>. Roomproof prints the date and time on every photo, numbers the photos, lists the problems on a summary page and adds signature lines. It's free and runs entirely in your browser.</p>

      <h2 id="how">How to make a photo report in 5 steps</h2>
${steps([
  ["Pick a template.", "Move-in, move-out, punch list, before and after, cleaning, rental turnover, UK inventory or Australian entry condition. Or keep the general report and name your own rooms or locations."],
  ["Fill in the details.", "The address, the date, who prepared the report and who it's for. Add a company name and logo if you send reports to clients."],
  ["Work through each room.", "Rate each item (for example Good, Fair or Damaged), take photos with the camera or add them from your library, and write what you see: “5 cm scratch, left side of oven door”. Tap a photo to add a caption, circle or point to the problem, or correct its time."],
  ["Sign.", "Each person can sign on screen with a finger or mouse. Or leave the lines blank and sign the printout."],
  ["Create the PDF.", "Choose A4 or US Letter and 1, 2, 4 or 6 photos per page, then download or share the PDF. Click <em>Save project</em> to keep an editable copy."],
])}

      <h2>What's in the PDF report</h2>
${tbl(["Part", "What it contains"], [
  ["Cover page", "Title, address, date, the people involved, your logo, and totals: items recorded, photos and issues."],
  ["Summary of issues", "Every item rated Fair or Damaged (or Open, or Needs attention, depending on the template), with its notes and photo numbers."],
  ["Room-by-room checklist", "Each item's rating and notes, grouped by room, with references to its photos."],
  ["Photo pages", "Numbered photos with the room, item, rating, caption and the time each was taken. Before and after reports show pairs side by side."],
  ["Signatures", "A short confirmation, the on-screen signatures (or blank lines), names and dates."],
  ["Photo log", "For each photo: the time, where that time came from, the original file name and size, and a SHA-256 fingerprint of the file."],
])}
      <p>Every page has a page number and a small “Made with Roomproof” footer. Items you leave completely blank are left out, so a long template still produces a tidy report.</p>

      <h2>How the date and time stamp works</h2>
      <p>Most phone cameras save the moment a photo was taken inside the file, in its EXIF data. Roomproof reads that time and prints it in the corner of the photo, for example <em>30 Sep 2026 09:15</em>. If a photo has no camera time (screenshots and some edited or messaged images), Roomproof uses the file's date instead and says so. If you correct a time by hand, the report says “entered manually”.</p>
      <p>The photo log at the end lists where every time came from, so nobody has to guess. Bear in mind that a phone records the time set on the phone, and file dates can change when photos are copied. A stamped photo is good evidence of what you saw, not proof on its own. To make your record harder to dispute:</p>
${ul([
  "Take the photos on the day and send the PDF to the other party straight away. Their inbox then holds a dated copy.",
  "Keep the original photos on your phone or in a cloud backup. Their fingerprints are listed in the photo log.",
  "Ask the other party to sign on your device if they're there.",
  "Record a short video walk-through as a backup.",
])}

      <h2>Tips for photos that settle disputes</h2>
${ul([
  "<strong>Wide shot first, then close-up.</strong> The wide shot shows where the damage is; the close-up shows how bad it is.",
  "<strong>Show scale.</strong> Put a coin, a key or a tape measure next to marks, chips and holes.",
  "<strong>Photograph everything, not just problems.</strong> A clean, undamaged oven is evidence too.",
  "<strong>Open things up.</strong> Oven, fridge, freezer, dishwasher, cupboards, drawers and wardrobes.",
  "<strong>Meters and keys.</strong> Photograph meter readings and the keys you hand over or receive.",
  "<strong>Use the same angles next time.</strong> Matching move-in and move-out photos make changes obvious.",
  "<strong>Light it well.</strong> Turn on lights and open blinds. Avoid flash glare on glossy surfaces.",
])}

      <h2>Templates for every kind of report</h2>
${tbl(["Template", "Best for", "Ratings"], [
  ['<a href="/move-out-checklist-with-photos">Move-out checklist with photos</a>', "Tenants leaving a rental, landlords checking it", "Good, Fair, Damaged, N/A"],
  ['<a href="/move-in-inspection-checklist-with-photos">Move-in inspection</a>', "Recording condition on day one", "Good, Fair, Damaged, N/A"],
  ['<a href="/punch-list-with-photos">Punch list with photos</a>', "Contractors and homeowners at a final walkthrough", "Open, In progress, Done"],
  ['<a href="/before-and-after-photo-report">Before and after report</a>', "Repairs, renovation, landscaping, pest control", "Done, Needs attention, Damage found"],
  ['<a href="/cleaning-photo-report">Cleaning photo report</a>', "Cleaners and end-of-tenancy cleans", "Done, Needs attention, Damage found"],
  ['<a href="/airbnb-turnover-checklist-with-photos">Airbnb turnover checklist</a>', "Short-term rental cleaners and hosts", "Done, Needs attention, Damage found"],
  ['<a href="/property-inventory-with-photos">UK property inventory</a>', "Landlords, agents and tenants in the UK", "Good, Fair, Damaged, N/A"],
  ['<a href="/entry-condition-report-photos">AU entry condition photos</a>', "Renters and agents in Australia", "Good, Fair, Damaged, N/A"],
])}
      <p>You can rename, add and remove rooms and items in any template, then choose <em>Save rooms as my template</em> to reuse your own checklist next time. See <a href="/photo-report-template">all photo report templates</a>.</p>

      <h2>Your photos stay on your device</h2>
      <p>Roomproof has no account and no upload. Photos are resized and stored in your browser on this device, and the PDF is built on your device too. It keeps working without a signal once the page has loaded, and there's nothing on our servers to delete. The trade-off is that there's no sync between devices.</p>
      <p>Browsers can clear stored data (Safari on iPhone may remove a site's data after about a week without a visit), so use <em>Save project</em> to download a <code>.roomproof</code> file. It holds every photo, note and signature. Open it later on any device to keep editing, or to start a move-out report from your move-in report.</p>
`,
  faq: homeFaq,
  disclaimer: "Roomproof is a documentation tool, not legal advice, and isn't affiliated with any landlord, agency or deposit scheme.",
  related: false,
};

// ---------------------------------------------------------------- landing pages
const pages = [
  {
    slug: "move-out-checklist-with-photos", preset: "moveout", crumb: "Move-out checklist with photos",
    title: "Move Out Checklist with Photos (PDF) — Free, No Signup",
    desc: "Free move-out checklist with photos: rate every room, add date-stamped photos and notes, compare with move-in and download a PDF to protect your deposit.",
    h1: "Move-Out Checklist with Photos",
    lead: "Walk through every room, add date-stamped photos and notes, and download a PDF record of the condition you left the place in. Free, and nothing is uploaded.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A move-out checklist with photos is a room-by-room record of the condition you returned a rental in, with a dated photo of every wall, floor, fixture and appliance. Fill in the checklist above, add photos as you go, and download the PDF. Send it to your landlord or property manager on the day you hand back the keys, and keep a copy until your deposit is settled.</p>
      <h2>Why photos matter for your security deposit</h2>
      <p>When a landlord keeps part of a deposit, the dispute usually comes down to two questions: was the damage there when you moved in, and was it there when you left? Dated move-out photos answer the second one. In most US states a landlord can't charge for normal wear and tear, only for damage beyond it, and many states require an itemized list of deductions within a deadline, for example 21 days in California, 14 days in New York and 30 days in Texas. Check the current rules for your state and your lease.</p>
      <p>Some states now require landlords to take photos as well. California's AB 2801, for example, requires landlords to photograph a unit after the tenant moves out and again after any repairs or cleaning. Your own photos are still your best record, because you decide what gets photographed.</p>
      <h3>Normal wear and tear or damage?</h3>
${tbl(["Usually normal wear and tear", "Usually damage"], [
  ["Light scuffs and slightly faded paint", "Large marks, holes, or walls painted without permission"],
  ["Carpet worn along walkways", "Stains, burns, rips or pet damage"],
  ["A few small nail holes from pictures", "Large anchor holes or broken drywall"],
  ["Loose handles and hinges from normal use", "Broken doors, frames, blinds or locks"],
  ["Minor scratches on countertops", "Burns, cuts and chips"],
])}
      <p class="small muted">A general guide only. Leases and state laws differ.</p>
      <h2>Room-by-room move-out photo checklist</h2>
${tbl(["Room", "What to photograph"], [
  ["Entry and hallway", "Front door inside and out, locks, walls, floor, light switches"],
  ["Living room", "Each wall, ceiling, floor or carpet, windows and screens, blinds, outlets"],
  ["Kitchen", "Inside the oven, stovetop, fridge and freezer, dishwasher, cabinets and drawers, countertops, sink, floor"],
  ["Bedrooms", "Each wall, carpet, inside the closet, windows, door"],
  ["Bathrooms", "Toilet, tub or shower, grout and caulk, vanity, mirror, exhaust fan, floor"],
  ["Other", "Smoke and CO alarms, thermostat, water heater, laundry area, keys and remotes laid out on the counter"],
  ["Outside", "Balcony or patio, parking space, garage, and the yard if it's your responsibility"],
])}
      <h2>How to timestamp photos for move-out</h2>
      <p>You don't need a timestamp camera app. Your phone already stores the time each photo was taken inside the file. Roomproof reads it and prints it in the corner of every photo in the PDF, and the photo log at the end shows where each time came from. Take the photos on the day you hand back the keys, after cleaning, so the dates match your move-out.</p>
${steps([
  ["Clean first, then photograph.", "Photos of a clean, empty unit are the whole point."],
  ["Shoot wide, then close.", "One photo of each wall or appliance, plus a close-up of anything marked or worn, with a coin or tape measure for scale."],
  ["Rate and note as you go.", "Mark each item Good, Fair or Damaged and describe anything that isn't Good."],
  ["Sign and send.", "Ask the landlord or agent to sign on your phone if they attend. Either way, email them the PDF the same day."],
  ["Save the project file.", "Keep the <code>.roomproof</code> file and your original photos until the deposit is returned."],
])}
      <h2>Compare with your move-in report</h2>
      <p>If you made a <a href="/move-in-inspection-checklist-with-photos">move-in inspection report</a> with Roomproof, choose <em>Start a follow-up from a saved project</em> and open your move-in file. Every room and item carries over, your move-in photos appear on the Move-in side, and the PDF puts move-in and move-out photos side by side with both ratings. If you don't have one, keep whatever you received at move-in (the landlord's checklist, emails, old photos) together with this report.</p>`,
    faq: [
      ["What should I photograph when moving out?", "Every room from the doorway, each wall, floor and ceiling, inside every appliance and cupboard, bathroom fixtures, windows and blinds, smoke alarms, and the keys you return. Photograph clean, undamaged things too."],
      ["Can my landlord charge for normal wear and tear?", "In most US states, no. A deposit can generally cover unpaid rent and damage beyond normal wear and tear, and in some states cleaning needed to return the unit to its move-in condition. Rules vary, so check your state's landlord-tenant law."],
      ["Should my landlord sign the move-out checklist?", "It helps if they will, because a signature shows they saw the report. If they won't, email the PDF to them the same day so there's a dated record that they received it."],
      ["Do I need a special timestamp app?", "No. Phone cameras record the time inside each photo file. Roomproof prints that time on every photo and lists its source in the photo log."],
      ["How long should I keep move-out photos?", "At least until your deposit is returned and any dispute is closed; a year or more is sensible. Keep the .roomproof project file and the original photos."],
    ],
  },
  {
    slug: "move-in-inspection-checklist-with-photos", preset: "movein", crumb: "Move-in inspection checklist",
    title: "Move-In Inspection Checklist with Photos — Free PDF",
    desc: "Free move-in inspection checklist with photos. Record each room's condition with date-stamped photos, notes and signatures, then download a PDF to share.",
    h1: "Move-In Inspection Checklist with Photos",
    lead: "Record the condition of your new rental on day one, with dated photos of every room. Send the PDF to your landlord and keep the project file for move-out.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A move-in inspection checklist with photos records the condition of a rental before you live in it: every room, wall, floor, fixture and appliance, rated and photographed with the date. Do it on move-in day before you unpack, send the PDF to your landlord or property manager, and keep a copy. At move-out, open the saved project to compare.</p>
      <h2>Why the move-in inspection matters</h2>
      <p>Deductions from a deposit depend on comparing the unit's condition at the end of a tenancy with its condition at the start. Without a move-in record, it's your word against the landlord's about who caused a stain or a chipped tile. Some states build this into the law: Massachusetts landlords who take a security deposit must give the tenant a written statement of the unit's condition, and Washington landlords need a written checklist of the unit's condition before they can collect a deposit. Check the rules where you live.</p>
      <p>If your landlord gives you a printed form, fill it in and return it on time. Photos add detail a tick box can't, so attach the Roomproof PDF as a photo appendix and mention it on the form.</p>
      <h2>What to inspect in each room</h2>
${tbl(["Area", "Check", "Photograph"], [
  ["Kitchen", "Appliances turn on, oven is clean, fridge gets cold, no leaks under the sink, cabinet doors close", "Inside each appliance, countertops, sink, floor"],
  ["Bathroom", "Toilet flushes, hot water arrives, no leaks, fan works, grout and caulk are intact", "Tub or shower, toilet, vanity, floor, the ceiling above the shower"],
  ["Living areas and bedrooms", "Walls, carpet, windows open and lock, blinds work, outlets and lights work", "Each wall, the floor or carpet, windows, closets"],
  ["Safety", "Smoke and CO alarms are present and working, door and window locks work", "Alarms, locks"],
  ["Utilities", "Heating and AC work, water heater, meter readings", "Thermostat, meters, the keys you received"],
])}
      <h2>Step by step</h2>
${steps([
  ["Do it before the furniture goes in.", "Empty rooms are quicker to inspect and photograph."],
  ["Test as you rate.", "Run taps, flip switches, open windows and turn on appliances. Note anything that doesn't work."],
  ["Photograph wide and close.", "One photo of each wall and fixture, plus close-ups of marks with a coin or tape measure for scale. The camera time is printed on each photo."],
  ["Sign together if you can.", "If the landlord or agent is there, both of you can sign on screen."],
  ["Send it the same day.", "Email the PDF to your landlord, and ask in writing for repairs to anything that doesn't work."],
  ["Save the project file.", "You'll open it again when you move out."],
])}
      <h2>Using your move-in report at move-out</h2>
      <p>When you leave, choose <em>Start a follow-up from a saved project</em> and open your move-in file. Roomproof creates a move-out report with the same rooms and items. Your move-in photos and ratings sit on the left of each pair, the move-out photos you add sit on the right, and the PDF shows both ratings so changes stand out. The <a href="/move-out-checklist-with-photos">move-out checklist guide</a> covers what to photograph on the way out.</p>
      <p>Keep the project file somewhere safe for the whole tenancy, such as cloud storage or an email to yourself. Browser storage alone isn't reliable for a year or more.</p>`,
    faq: [
      ["When should I do a move-in inspection?", "On move-in day, before you unpack, or as soon as you get the keys. Your lease or local law may set a deadline for returning the landlord's checklist, often within a few days to two weeks."],
      ["What if my landlord already gave me a checklist?", "Fill it in and return it on time, and attach your Roomproof PDF as a photo appendix. Keep copies of both."],
      ["Do the photos need a date on them?", "Dated photos are far more useful. Roomproof prints the time from your camera on each photo and lists it in the photo log. Emailing the PDF to your landlord straight away also gives you an independent dated record."],
      ["Should I report problems I find?", "Yes. Note them in the report and ask your landlord in writing to fix anything that affects safety, security or basic use of the home."],
      ["Can landlords use this checklist too?", "Yes. Landlords and property managers can use the same template, walk the unit with the tenant and ask them to sign on the device."],
    ],
  },
  {
    slug: "punch-list-with-photos", preset: "punch", crumb: "Punch list with photos",
    title: "Punch List Template with Photos — Free PDF Generator",
    desc: "Free punch list template with photos. List items by area, mark them open, in progress or done, circle the problem on each photo and download a signed PDF.",
    h1: "Punch List with Photos",
    lead: "List every item still to finish, by area, with a marked-up photo of each one. Track it as Open, In progress or Done and send a clean PDF to the client or crew.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A punch list is the list of work that still needs fixing or finishing before a job is complete. A photo of each item removes the guesswork: circle the problem, add a note such as “touch up paint left of switch”, set the status, and download a PDF with every open item on the first page.</p>
      <h2>What goes on a punch list</h2>
${tbl(["Field", "Example"], [
  ["Area or location", "Kitchen, 2nd floor hall, Unit 4B"],
  ["Item", "Upper cabinet door"],
  ["Description", "Rubs on the frame when closing; adjust hinges"],
  ["Status", "Open, In progress or Done"],
  ["Photo", "A close-up with the spot circled, plus a wide shot showing where it is"],
  ["Responsible", "Cabinet installer (write it in the notes)"],
])}
      <p>In Roomproof, areas are the rooms, each item carries its status and notes, and every photo is numbered, so the summary can point the crew to “Photos 4-5”.</p>
      <h2>How to run a punch list walkthrough</h2>
${steps([
  ["Walk the job area by area", "with the client, architect or site manager. Rename the sample areas and items to match the job."],
  ["Add an item for each defect and photograph it.", "Tap the photo and use the circle or arrow to mark the exact spot."],
  ["Say who fixes it.", "Write the trade or person in the notes, for example “Painter: touch up”."],
  ["Set the status and create the PDF.", "The first page lists every Open and In progress item with its photo numbers."],
  ["Walk it again after the fixes.", "Change items to Done and add a photo of the finished work. Save the project file so the next walk starts from this one."],
])}
      <h2>Punch list statuses</h2>
${tbl(["Status", "Meaning", "In the summary of open items?"], [
  ["Open", "Not started", "Yes"],
  ["In progress", "Work has started but isn't signed off", "Yes"],
  ["Done", "Fixed and checked", "No, but it stays in the full checklist"],
])}
      <h2>Punch list, snag list, deficiency list</h2>
      <p>They're the same idea under different names. “Punch list” is the usual US term, “snag list” is common in the UK, Ireland and Australia, and “deficiency list” is often used in Canada. Whatever you call it, the list works best when each item is specific, has one owner and has a photo.</p>
      <p>For homeowners, a punch list is also the moment to hold back final payment until the work is right. Agree the list in writing with your contractor, ideally signed by both of you, and keep it with the contract.</p>`,
    faq: [
      ["Who makes the punch list?", "Usually the general contractor or project manager, together with the client or architect, at a walkthrough near completion. Homeowners and subcontractors make their own lists too."],
      ["When should I create a punch list?", "Near substantial completion and before final payment. Many contractors also run rolling punch lists room by room as areas finish."],
      ["Can I show before and after photos of fixes?", "Yes. Add a photo of the fixed item to the same entry, or use the <a href=\"/before-and-after-photo-report\">before and after template</a> to show pairs side by side."],
      ["Can I put my company logo on the punch list?", "Yes, for free. Open “Company name and logo” in the report details and add your logo and contact details."],
      ["Can the client sign the punch list?", "Yes, on screen on your phone or tablet, or on the printout. Each signature has a name and date."],
    ],
  },
  {
    slug: "before-and-after-photo-report", preset: "beforeafter", crumb: "Before and after photo report",
    title: "Before and After Photo Report Template — Free PDF",
    desc: "Free before and after photo report template. Put matching before and after photos side by side with dates, captions and notes, then download a client PDF.",
    h1: "Before and After Photo Report",
    lead: "Show the work you did: before and after photos side by side, each with the date and time it was taken, plus notes and a client signature.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A before and after photo report pairs a photo of each area before the work with a photo of the same area afterwards, from the same angle, each with its date. Add <em>Before</em> photos when you arrive and <em>After</em> photos when you finish; Roomproof lines them up in pairs in the PDF with captions and the time each was taken.</p>
      <h2>Who uses before and after reports</h2>
${tbl(["Work", "Typical photos"], [
  ["Repairs and handyman jobs", "Walls, doors, fixtures, leaks, patched drywall"],
  ['<a href="/cleaning-photo-report">Cleaning</a> and end-of-tenancy cleans', "Oven, stovetop, bathroom, floors, windows"],
  ["Painting and decorating", "Each wall and ceiling, trim, doors"],
  ["Landscaping and gardening", "Lawns, beds, hedges, paths, fences"],
  ["Pressure washing", "Driveways, decks, patios, siding"],
  ["Pest control and remediation", "Entry points, treated areas, damage found"],
  ["Property management", "Repairs completed between tenants"],
])}
      <h2>How to take before and after photos that match</h2>
${ul([
  "<strong>Stand in the same spot.</strong> Note it in the caption (“from doorway, facing window”) so you can find it again.",
  "<strong>Don't zoom.</strong> Use the same lens and distance for both photos.",
  "<strong>Shoot the before photos before you touch anything,</strong> including moving furniture or tools.",
  "<strong>Take a wide shot and a close-up</strong> of each area. They become two items, or two pairs on one item.",
  "<strong>Match the light</strong> where you can: same lights on, same blinds open.",
])}
      <h2>How the report lays out the pairs</h2>
      <p>Each pair is one row: the before photo on the left with a grey label and the after photo on the right with a green label. Under each photo is its number, caption and the time it was taken. Choose 1, 2 or 3 pairs per page. If an item has a before photo but no after photo yet, the empty side is marked, which makes unfinished work easy to spot.</p>
      <p>The first page lists anything marked <em>Needs attention</em> or <em>Damage found</em>, so pre-existing damage you photographed on arrival is on record before the job starts. That protects you if a client later blames the damage on your work.</p>
      <h2>Sending it to the client</h2>
${steps([
  ["Add your details.", "Put your business name, phone and logo in “Company name and logo”."],
  ["Ask for a signature.", "The client signs on your phone or tablet when you finish, or on the printout."],
  ["Send the PDF.", "Download it or use Share on your phone to email or message it straight away."],
  ["Keep the project.", "Save the project file with the job number, in case questions come up later."],
])}`,
    faq: [
      ["Can I add more than one before or after photo per item?", "Yes. Pairs are matched in order: the first before photo with the first after photo, and so on. Tap a photo to move it earlier or later, or switch it to the other side."],
      ["Are the dates added to before and after photos automatically?", "Yes. Roomproof reads the time saved by the camera in each photo file and prints it on the photo. If a file has no camera time it uses the file date, and the report says which."],
      ["What if I took the before photos on another phone?", "Add them from your library; the time still comes from the files. If a time is wrong or missing, tap the photo and correct it. The report marks that time as entered manually."],
      ["Can I use it for insurance claims?", "You can use it to document damage and repairs. Check what your insurer asks for, and keep the original photo files as well."],
      ["Is there a limit on photos?", "No. Large reports simply take a little longer to export, especially on older phones."],
    ],
  },
  {
    slug: "cleaning-photo-report", preset: "cleaning", crumb: "Cleaning photo report",
    title: "Cleaning Before and After Photo Report — Free PDF Maker",
    desc: "Free cleaning photo report for cleaners: before and after photos of every room, a task checklist, client signature and a branded PDF. No app, no signup.",
    h1: "Cleaning Photo Report (Before and After)",
    lead: "Prove what you cleaned: before and after photos for every room and task, a checklist, and your client's signature, in one PDF.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A cleaning photo report shows the job before and after: a before photo and an after photo of each room or task, side by side, with the time each was taken, a checklist marked <em>Done</em> or <em>Needs attention</em>, and the client's signature. Make it on your phone during the job and send the PDF before you leave.</p>
      <h2>Why cleaners send photo reports</h2>
${ul([
  "<strong>Fewer re-clean arguments.</strong> Clear after photos settle “the oven wasn't done” before it becomes a refund.",
  "<strong>End-of-tenancy and move-out cleans.</strong> Tenants and landlords use your report when the deposit is checked.",
  "<strong>Remote clients.</strong> Hosts and property managers who can't visit see exactly what was done.",
  "<strong>Damage you didn't cause.</strong> Photograph existing damage on arrival and mark it <em>Damage found</em>, so it's on record before you start.",
])}
      <h2>Cleaning checklist by room</h2>
${tbl(["Room", "Tasks worth photographing"], [
  ["Kitchen", "Inside the oven, stovetop, range hood and filter, inside the microwave and fridge, sink and faucet, counters, cabinet fronts, floor"],
  ["Bathroom", "Toilet including the base, tub or shower, glass and grout, sink, mirror, floor"],
  ["Living areas", "Floors including under furniture, baseboards, window sills, light switches, mirrors"],
  ["Bedrooms", "Floors, under the bed, closet, surfaces"],
  ["Extras", "Inside windows, blinds, walls spot-cleaned, balcony"],
])}
      <p>The template starts with the most common rooms and tasks. Rename or add items to match your service, then choose <em>Save rooms as my template</em> so every job starts with your checklist.</p>
      <h2>How to make a cleaning report during the job</h2>
${steps([
  ["Before you start,", "walk each room and add <em>Before</em> photos with the Camera button. Mark any existing damage."],
  ["Clean as normal.", "There's nothing to do in the app while you work."],
  ["After each room,", "take the <em>After</em> photos from the same spots and mark tasks Done."],
  ["Note anything you couldn't finish,", "such as a stain that won't lift, as <em>Needs attention</em>, with a note."],
  ["Get a signature and send it.", "The client signs on your phone, then download or share the PDF."],
])}
      <h2>Make it look like your business</h2>
      <p>Add your company name, phone, website and logo once in “Company name and logo”. They appear on the cover of every report you make on that device, and your project files keep them too. Reports are free and unlimited, so send one with every job if you like.</p>`,
    faq: [
      ["Do I need to install an app?", "No. Roomproof runs in your phone's browser. You can add it to your home screen, and it works offline once loaded."],
      ["Can I add my cleaning company's logo?", "Yes, free. Open “Company name and logo” in the report details."],
      ["Should I photograph every room?", "Photograph every room you clean, and especially the tasks clients notice: oven, stovetop, bathroom fixtures, floors and inside the fridge."],
      ["How do I send the report to my client?", "Create the PDF, then download it or tap Share to send it by email or messaging app. The client gets a normal PDF; they don't need an account."],
      ["Can I use it for Airbnb turnovers?", "Yes. There's also a dedicated <a href=\"/airbnb-turnover-checklist-with-photos\">turnover checklist</a> with restocking and damage sections."],
    ],
  },
  {
    slug: "airbnb-turnover-checklist-with-photos", preset: "turnover", crumb: "Airbnb turnover checklist",
    title: "Airbnb Turnover Checklist with Photos — Free PDF Report",
    desc: "Free Airbnb turnover checklist with photos for cleaners and hosts: room tasks, restock checks, damage and missing items, and a dated PDF. No app needed.",
    h1: "Airbnb Turnover Checklist with Photos",
    lead: "A photo record of every changeover between guests: condition as found, each room after cleaning, restocking, and any damage, in one dated PDF.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A turnover checklist with photos documents each changeover between guests: the condition the last guest left, every room after cleaning, restocked supplies, and any damage or missing items with dated photos. Cleaners fill it in on a phone and the host gets one PDF per turnover. Roomproof isn't affiliated with Airbnb; it works for any short-term rental.</p>
      <h2>Why hosts want photos of every turnover</h2>
${ul([
  "<strong>Damage claims need fast evidence.</strong> Airbnb's AirCover for Hosts asks hosts to request reimbursement within 14 days of the guest's checkout, with photos of the damage. Check the current terms for your platform.",
  "<strong>“As found” versus “after cleaning”.</strong> Photos taken on arrival show what the guest left, separate from anything that happens during the clean.",
  "<strong>Remote hosting.</strong> Hosts who live elsewhere can check that the place is ready before the next check-in.",
  "<strong>Fair pay for cleaners.</strong> Photos show the job was done, which helps when a guest complains.",
])}
      <h2>Turnover checklist</h2>
${tbl(["Area", "Check", "Photograph"], [
  ["Arrival", "Lockbox or keypad, condition as found, anything left behind", "Each room before you start"],
  ["Kitchen", "Dishes washed and put away, appliances wiped, fridge emptied, coffee and basics restocked", "Counters, sink, inside fridge, supplies shelf"],
  ["Bathroom", "Toilet, shower and sink cleaned, fresh towels, toiletries restocked", "Toilet, shower, towel set-up"],
  ["Bedroom", "Fresh linens, bed made, under the bed checked, closet empty", "Made bed, under the bed"],
  ["Living area", "Sofa and cushions, remotes, floors, games and books tidy", "Room overview, remotes"],
  ["Damage and missing items", "Broken, stained or missing items", "Wide and close-up of each"],
  ["Final check", "Thermostat set, windows and doors locked, trash out", "Thermostat, locked door"],
])}
      <h2>Documenting damage and missing items</h2>
      <p>Mark the <em>Damage</em> or <em>Missing items</em> entry as <em>Damage found</em>, take a wide photo that shows where the item is and a close-up of the damage, and write what happened and what it may cost to fix or replace. These items go on the first page of the PDF. Send the report to the host straight away, while the guest's checkout is still recent.</p>
      <h2>Using your own checklist every time</h2>
${steps([
  ["Set it up once.", "Rename rooms and items to match the listing: “Bedroom 2 (bunk room)”, “Hot tub”, “Welcome basket”."],
  ["Save it.", "Choose <em>Save rooms as my template</em> and give it the listing's name."],
  ["Start each turnover from it.", "Pick your template from the Template list, add the booking reference, and go."],
  ["Send the PDF to the host.", "Download it or use Share on your phone. Save the project if the host may need it for a claim."],
])}`,
    faq: [
      ["Is Roomproof affiliated with Airbnb?", "No. Roomproof is an independent tool and isn't affiliated with or endorsed by Airbnb, Vrbo, Booking.com or any other platform. It works for any short-term rental."],
      ["Do cleaners need an account?", "No. Cleaners open the page on their phone, fill in the checklist and send the PDF. Nothing is uploaded."],
      ["Can I reuse my checklist for each turnover?", "Yes. Customise the rooms and items, choose “Save rooms as my template”, and pick it from the Template list next time on the same device."],
      ["How quickly should I report guest damage?", "As soon as you find it. Platforms set deadlines for damage claims, for example Airbnb's 14 days from checkout for AirCover for Hosts, so check your platform's current rules."],
      ["Does it work offline at the property?", "Yes, after you've opened the site once with a connection. Photos are stored on the phone until you create the PDF."],
    ],
  },
  {
    slug: "property-inventory-with-photos", preset: "ukinventory", crumb: "Property inventory with photos (UK)", lang: "en-GB",
    title: "Property Inventory Template with Photos (UK) — Free PDF",
    desc: "Free UK property inventory template with photos: a room-by-room schedule of condition, meter readings, keys and signatures. Download a check-in PDF.",
    h1: "Property Inventory with Photos",
    lead: "A room-by-room schedule of condition with dated photos for check-in and check-out. For landlords, letting agents and tenants in the UK.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A property inventory lists what is in a let property and the condition of each room and item, backed by dated photos. Make one at check-in, ask the tenant to sign it, and repeat the same rooms at check-out. Roomproof produces the photo schedule as a PDF, including meter readings and keys, and can lay check-in and check-out photos side by side.</p>
      <h2>Why inventories matter for deposits</h2>
      <p>In England and Wales, deposits for most assured shorthold tenancies must be protected in a government-approved scheme: the Deposit Protection Service, mydeposits or the Tenancy Deposit Scheme. If the landlord and tenant can't agree on deductions, the scheme's free dispute resolution service decides on the evidence, and a signed check-in inventory with photos plus a check-out report are the heart of that evidence. Scotland and Northern Ireland have their own approved schemes. Roomproof isn't affiliated with any of them.</p>
      <p>Since the Tenant Fees Act 2019, landlords and agents in England can't charge tenants for an inventory, so many smaller landlords now make their own, and many tenants make one too.</p>
      <h2>What a check-in inventory includes</h2>
${tbl(["Section", "What to record"], [
  ["Property details", "Address, date, landlord or agent, tenant, inventory reference"],
  ["Each room", "Walls, ceilings, flooring, windows, doors, fixtures, furniture and appliances, with condition and cleanliness"],
  ["Meter readings", "Electricity, gas and water, with a photo of each meter showing the reading"],
  ["Keys", "Number and type of keys and fobs handed over"],
  ["Alarms", "Smoke and carbon monoxide alarms present and tested on the day"],
  ["Photos", "A wide shot of each room plus close-ups of marks, chips and stains"],
  ["Signatures", "Landlord or agent and tenant, with dates"],
])}
      <h2>Describing condition and cleanliness</h2>
      <p>Inventory clerks usually describe condition and cleanliness separately. In Roomproof, rate the condition (Good, Fair or Damaged) and put the detail and cleanliness in the notes, for example: “Good condition, domestically clean, two small scuffs to lower wall by door, 3 cm”. Precise notes, with a size and a location, are what make a photo meaningful to an adjudicator months later.</p>
      <h2>Check-in, mid-term and check-out</h2>
${steps([
  ["At check-in,", "complete the inventory, sign it with the tenant, and email the PDF. Give the tenant a few days to add comments in writing."],
  ["Save the project file", "with the property address in the name. Browser storage alone won't last the tenancy."],
  ["For mid-term inspections,", "open the project or start a follow-up to record changes and maintenance needs."],
  ["At check-out,", "choose <em>Start a follow-up from a saved project</em> and open the check-in file. Each item shows Check-in and Check-out photos side by side, with both ratings."],
])}
      <p>Tenants can use the same steps: if the landlord's inventory is missing or thin, make your own at check-in and email it to the landlord or agent within the first few days.</p>`,
    faq: [
      ["Is a photo inventory enough on its own?", "A written schedule of condition plus photos is stronger than either alone. The Roomproof PDF combines both: a rating and notes for each item, and numbered, dated photos."],
      ["Who should sign the inventory?", "Both the landlord or agent and the tenant, ideally at check-in. If the tenant needs time to check, agree a short deadline for written comments."],
      ["Can I use this instead of a professional inventory clerk?", "Many landlords do for smaller lets. A clerk adds independence, which can carry weight in a dispute. Either way, detailed descriptions and clear dated photos matter most."],
      ["Does it include meter readings and keys?", "Yes. The template has a Meters &amp; keys section for electricity, gas and water readings and the keys handed over. Photograph each meter so the reading is visible."],
      ["Can tenants make their own inventory?", "Yes. Make it at check-in, email it to the landlord or agent promptly, and keep the project file and original photos until the deposit is returned."],
    ],
    disclaimer: "General information for the UK, not legal advice. Roomproof isn't affiliated with any deposit protection scheme.",
  },
  {
    slug: "entry-condition-report-photos", preset: "auentry", crumb: "Entry condition report photos (AU)", lang: "en-AU",
    title: "Entry Condition Report Photos — Free Photo Addendum PDF",
    desc: "Make a dated photo addendum for your entry condition report: each room photographed and rated, with notes and signatures, as a PDF for your agent. Free.",
    h1: "Entry Condition Report Photos",
    lead: "Back up your rental's entry condition report with dated photos. Roomproof makes a room-by-room photo addendum PDF to return with the official form.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> Your state's entry condition report is the official record of a rental's condition at the start of the lease, and photos are the best way to back it up. Fill in the official form from your agent, then use Roomproof to photograph each room, note anything that differs from the form, and download a dated photo addendum PDF. Return both before your state's deadline and keep copies.</p>
      <h2>How condition reports work in Australia</h2>
      <p>Each state and territory has its own form and rules, but the process is similar. The agent or landlord fills in the report and gives it to you at the start of the tenancy. You check every room, add your comments where you disagree, sign and return it within a short window, for example 7 days in NSW and 3 days in Queensland. At the end of the lease the same report is used to decide bond claims, and unresolved disputes go to the state tribunal.</p>
${tbl(["State", "Form (common name)", "Bond disputes heard by"], [
  ["NSW", "Condition report", "NCAT"],
  ["Victoria", "Condition report", "VCAT"],
  ["Queensland", "Entry condition report (Form 1a)", "QCAT, after RTA dispute resolution"],
])}
      <p>Other states and territories have their own versions. Roomproof doesn't reproduce government forms: it makes a photo addendum that sits alongside the official report. Check the current rules with your state's tenancy authority.</p>
      <h2>What to photograph</h2>
${tbl(["Area", "Photograph"], [
  ["Entrance and hall", "Door and screen door, walls, ceiling, floor coverings, light fittings, power points"],
  ["Lounge and bedrooms", "Each wall, ceiling, carpet or floorboards, windows and screens, blinds, built-in wardrobes"],
  ["Kitchen", "Benchtops, cupboards and drawers, sink and taps, stove and oven, rangehood, dishwasher"],
  ["Bathroom", "Shower and screen, bath, basin and taps, toilet, tiles and grout, exhaust fan, mirror"],
  ["Laundry", "Tub, taps, floor"],
  ["Outside", "Garden, garage or carport, smoke alarms, keys and remotes"],
])}
      <h2>Matching the official form</h2>
      <p>Most forms ask whether each item is clean, undamaged and working. In Roomproof, rate the overall condition (Good, Fair or Damaged) and say which part fails in the notes, for example “Not clean: grease on rangehood filter” or “Working, but tap drips”. Put the condition report's date or reference in the reference field so the addendum points to the form, and write “See attached photo addendum” on the form itself.</p>
${steps([
  ["Get the agent's report", "and read it room by room."],
  ["Photograph every room", "with the Camera button. The date and time are printed on each photo."],
  ["Note every difference", "between what you see and what the form says."],
  ["Sign the addendum", "on screen, and create the PDF."],
  ["Return the form and the PDF", "to the agent by email before the deadline, and keep the project file for the end of the lease."],
])}
      <h2>At the end of the lease</h2>
      <p>Choose <em>Start a follow-up from a saved project</em> and open your entry file. Roomproof makes an exit report with Entry and Exit photos side by side for each item, which makes it easy to show that a mark was already there.</p>`,
    faq: [
      ["Can I add photos to my condition report?", "Yes. Most agents accept attachments. Label the PDF clearly as a photo addendum, note on the form that it's attached, and keep proof that you sent it."],
      ["What if I disagree with the agent's report?", "Write your comments on the form and back them up with photos in your addendum. Return it on time and keep copies of everything."],
      ["What's the deadline to return the report?", "It depends on your state, for example 7 days in NSW and 3 days in Queensland. Check your state's tenancy authority for the current rule."],
      ["Do I need to sign the photo addendum?", "Signing and dating it helps show when it was made. Ask the agent to confirm by email that they received it."],
      ["Can agents and landlords use it?", "Yes. Agents can use the same template to photograph a property before a tenancy starts and attach the PDF to their report."],
    ],
    disclaimer: "General information for Australia, not legal advice. Roomproof isn't affiliated with any state tenancy authority or tribunal.",
  },
  {
    slug: "photo-report-template", preset: "general", crumb: "Photo report templates",
    title: "Photo Report Template — Free Formats for Every Job (PDF)",
    desc: "Free photo report templates: general, move-in, move-out, punch list, before and after, cleaning, turnover, UK inventory and AU condition. Edit and export PDF.",
    h1: "Photo Report Templates",
    lead: "Every template is free, runs in your browser and exports a clean PDF. Start with the general photo report above, or pick a template below.",
    body: `      <p class="tldr"><strong>Quick answer:</strong> A photo report template is a ready-made structure for documenting something with photos: sections (rooms, areas or locations), the items to check, a rating scale and the report details. Roomproof's templates fill in the rooms and items for you; you add photos, ratings and notes and download a PDF.</p>
      <div class="grid2">
        <div class="card"><h3><a href="/move-out-checklist-with-photos">Move-out checklist</a></h3><p>Every room of a rental with date-stamped photos, to protect a security deposit.</p></div>
        <div class="card"><h3><a href="/move-in-inspection-checklist-with-photos">Move-in inspection</a></h3><p>Record condition on day one, then reuse it for a side-by-side move-out report.</p></div>
        <div class="card"><h3><a href="/punch-list-with-photos">Punch list</a></h3><p>Open, in progress and done items by area, with marked-up photos.</p></div>
        <div class="card"><h3><a href="/before-and-after-photo-report">Before and after</a></h3><p>Matching photo pairs for repairs, renovations and outdoor work.</p></div>
        <div class="card"><h3><a href="/cleaning-photo-report">Cleaning report</a></h3><p>Before and after photos per task, with a client signature.</p></div>
        <div class="card"><h3><a href="/airbnb-turnover-checklist-with-photos">Rental turnover</a></h3><p>Changeovers between guests, restocking, damage and missing items.</p></div>
        <div class="card"><h3><a href="/property-inventory-with-photos">UK property inventory</a></h3><p>Schedule of condition with meter readings and keys, check-in to check-out.</p></div>
        <div class="card"><h3><a href="/entry-condition-report-photos">AU entry condition photos</a></h3><p>A photo addendum to return with your state's condition report.</p></div>
      </div>
      <h2>What to include in a photo documentation report</h2>
${tbl(["Element", "Why it matters"], [
  ["Title, address and date", "Says what was documented, where and when"],
  ["Who prepared it, and for whom", "Shows responsibility and who received it"],
  ["Sections and items", "Make the report easy to follow and hard to dispute: every item was looked at"],
  ["A rating for each item", "Turns photos into a clear verdict: good, worn, damaged, open, done"],
  ["Numbered photos with captions", "So the text can point to “Photo 12” and each photo explains itself"],
  ["The time each photo was taken", "Ties the record to a date; Roomproof prints it on the photo"],
  ["Summary of issues", "The first thing a busy reader looks at"],
  ["Signatures", "Show that both sides saw the report"],
])}
      <h2>Choosing a photo layout</h2>
${tbl(["Layout", "Best for"], [
  ["1 photo per page", "Insurance claims and detailed damage, where every detail counts"],
  ["2 photos per page", "Most inspections; the default"],
  ["4 photos per page", "Long checklists where photos support the notes"],
  ["6 photos per page", "Contact-sheet style overviews of large properties"],
  ["1 to 3 pairs per page", "Before and after and move-in versus move-out comparisons"],
])}
      <h2>Writing captions that stand on their own</h2>
      <p>A good caption says what, where and how big: “Chip in worktop, 2 cm, right of sink” beats “damage”. Captions appear under each photo in the PDF. If you leave a caption empty, the item's notes appear under its first photo instead.</p>
      <h2>Make your own template</h2>
      <p>Start from any template, rename rooms and items, add your own, and remove what you don't need. Then choose <em>Save rooms as my template</em>. It appears under “My templates” in the Template list on that device, and any project you save keeps its rooms, so you can share a ready-made checklist with a colleague by sending them a project file.</p>`,
    faq: [
      ["Is there a Word or Excel photo report template?", "Roomproof works in the browser instead, which avoids resizing photos by hand and broken table layouts. It produces a PDF, which is what most people send anyway."],
      ["How many photos fit on a page?", "Choose 1, 2, 4 or 6 photos per page, or 1 to 3 before-and-after pairs per page."],
      ["Can I create my own template?", "Yes. Edit the rooms and items, then choose “Save rooms as my template”. It's stored in your browser and listed under My templates."],
      ["Is it free?", "Yes. All templates and features are free, with no signup."],
    ],
  },
  {
    slug: "about", tool: false, crumb: "About", related: false,
    title: "About Roomproof — Free, Private Photo Report Generator",
    desc: "Roomproof is part of Rooh Sites’ free tools: small, fast web tools that run in your browser with no signup. Learn why we built it and how it keeps your photos private.",
    h1: "About Roomproof",
    lead: "A free photo report generator that keeps your photos on your device.",
    body: `      <p>Roomproof is part of <a href="https://roohsites.com/">Rooh Sites</a>’ collection of free, single-purpose web tools. It turns phone photos into dated, captioned PDF reports for move-ins and move-outs, punch lists, before-and-after jobs, cleaning, rental turnovers and property inventories.</p>
      <h2>Why we built it</h2>
      <p>People documenting a rental or a job usually face a choice between a printable checklist with no photos and an app that wants an account, a subscription or a fee per report. Roomproof does the job in the browser: add photos, rate each item, sign, and download a PDF. Every feature is free.</p>
      <h2>How it works</h2>
      <p>Everything happens on your device. Photos are resized and stored in your browser, the PDF is built in your browser, and project files are downloaded straight to you. We never receive your photos or what you type. See the <a href="/privacy">privacy policy</a> for details.</p>
      <h2>What Roomproof isn't</h2>
      <p>Roomproof is a documentation tool, not a legal service. A report doesn't become legally binding because it was made here, and we don't give legal advice. Roomproof isn't affiliated with any landlord, letting agent, platform, deposit scheme or government body.</p>`,
  },
  {
    slug: "privacy", tool: false, crumb: "Privacy & Terms", related: false,
    title: "Privacy Policy and Terms of Use | Roomproof Photo Reports",
    desc: "How Roomproof handles your data: photos and reports are processed on your device and never uploaded. Cookie-free analytics and simple terms of use.",
    h1: "Privacy & Terms",
    lead: "Short version: your photos and reports never leave your device.",
    body: `      <h2>Privacy</h2>
      <p><strong>On-device processing.</strong> When you add a photo, your browser reads it, resizes it, reads the capture time and calculates its fingerprint on your device. The resized photo and your report are stored in your browser's storage (IndexedDB) on this device so a draft survives a reload. PDFs and <code>.roomproof</code> project files are created on your device and downloaded directly to you. None of this is sent to our servers.</p>
      <p><strong>Deleting your data.</strong> Choosing <em>New report</em> clears the photos stored for the previous report. Clearing this site's data in your browser settings deletes everything. Files you downloaded are yours to keep or delete.</p>
      <p><strong>Offline files.</strong> A service worker caches the site's own pages and scripts so Roomproof works offline. It never stores your photos.</p>
      <p><strong>Analytics.</strong> We use Vercel Web Analytics to count page views and a few anonymous events, such as “a PDF was created” with the template name and a rough photo-count range. It's cookie-free, doesn't track you across sites, and never receives photos, file names or anything you type.</p>
      <h2>Terms</h2>
      <p>Roomproof is provided free and “as is”, without warranty. You're responsible for what you photograph and include in a report, for its accuracy, and for respecting other people's privacy (don't photograph people or their belongings without permission). Roomproof doesn't give legal advice and doesn't guarantee that any report will be accepted as evidence. You may use Roomproof and the reports you create for personal and commercial purposes.</p>`,
  },
];

const all = [{ ...home, slug: "index" }, ...pages];
for (const p of all) {
  const schemaExtra = p.home ? p.schemaExtra : p.tool === false ? [] : [app(p.h1, `${URL}/${p.slug}`)];
  writeFileSync(join(OUT, `${p.slug}.html`), page({ ...p, schemaExtra }));
}
console.log(`wrote ${all.length} pages`);
