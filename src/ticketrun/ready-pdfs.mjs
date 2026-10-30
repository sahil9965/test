// Ready-made ticket PDFs: already numbered, with blank lines for the event, prize and price, so a visitor who only wants
// plain numbered tickets can download one file without using the generator. Built with the tool's own PDF code
// (sites/ticketrun/core.js + the vendored pdf-lib), written to sites/ticketrun/pdf/<file>-letter.pdf and -a4.pdf.
// src/ticketrun/pages.mjs imports READY to link them under the generator on each page.
// Usage: node src/ticketrun/ready-pdfs.mjs   (re-run after changing the ticket layout or this list)
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BLANK = { subtitle: "Prize: ____________________", date: "Drawing: ______________________", venue: "Event: ______________________________", price: "$_____" };
const KEEP = "Keep this ticket. The winner must show the matching number.";
const raffle = n => ({ page: `/raffle-tickets-1-${n}`, file: `raffle-tickets-1-${n}`, preset: "raffle", end: n, what: "raffle tickets with stubs",
  docTitle: `Raffle Tickets 1-${n} Printable, Numbered with Stubs`, over: { typeLabel: "Raffle ticket", title: "Raffle", ...BLANK, fine: KEEP } });

// page: the landing page that links the file; what: words used in the link sentence; over: text that replaces the preset's example text
export const READY = [
  ...[100, 250, 500, 1000, 2000].map(raffle),
  { ...raffle(200), page: "/raffle-ticket-template-8-per-page", file: "raffle-tickets-8-per-page-1-200", perPage: 8,
    docTitle: "Raffle Ticket Template 8 per Page, Numbered 1-200" },
  { page: "/50-50-raffle-tickets", file: "50-50-raffle-tickets-1-500", preset: "fiftyfifty", end: 500, what: "50/50 raffle tickets with stubs",
    docTitle: "50/50 Raffle Tickets 1-500 Printable, Numbered with Stubs",
    over: { date: BLANK.date, venue: BLANK.venue, price: BLANK.price, fine: KEEP } },
  { page: "/door-prize-tickets", file: "door-prize-tickets-1-300", preset: "door", end: 300, what: "door prize tickets with stubs",
    docTitle: "Door Prize Tickets 1-300 Printable, Numbered with Stubs",
    over: { date: BLANK.date, venue: BLANK.venue, fine: "Keep this half for the prize drawing." } },
  { page: "/christmas-raffle-tickets", file: "christmas-raffle-tickets-1-200", preset: "raffle", end: 200, what: "Christmas raffle tickets with stubs",
    docTitle: "Christmas Raffle Tickets 1-200 Printable, Numbered with Stubs",
    over: { typeLabel: "Raffle ticket", title: "Christmas Raffle", ...BLANK, fine: KEEP, color: "#b91c1c" } },
  { page: "/turkey-raffle-tickets", file: "turkey-raffle-tickets-1-200", preset: "raffle", end: 200, what: "turkey raffle tickets with stubs",
    docTitle: "Turkey Raffle Tickets 1-200 Printable, Numbered with Stubs",
    over: { typeLabel: "Raffle ticket", title: "Turkey Raffle", ...BLANK, fine: KEEP, color: "#9a3412" } },
  { page: "/meal-tickets", file: "meal-tickets-1-300", preset: "meal", end: 300, what: "meal tickets",
    docTitle: "Meal Tickets 1-300 Printable, Numbered",
    over: { title: "Meal Ticket", date: "Date: ______________________", venue: "Event: ______________________________", price: "", fine: "No cash value." } },
  { page: "/drink-tickets", file: "drink-tickets-1-400", preset: "drink", end: 400, what: "drink tickets",
    docTitle: "Drink Tickets 1-400 Printable, Numbered",
    over: { date: "Valid: ______________________", venue: "" } },
  { page: "/coat-check-tickets", file: "coat-check-tickets-1-300", preset: "coat", end: 300, what: "two-part coat check tickets",
    docTitle: "Coat Check Tickets 1-300 Printable, Numbered Two-Part", over: { venue: "" } },
].map(r => ({ start: 1, ...r }));

export const PAPERS = [["letter", "US Letter"], ["a4", "A4"]];

async function main() {
  const require = createRequire(import.meta.url);
  const C = require(join(ROOT, "sites/ticketrun/core.js"));
  const L = require(join(ROOT, "sites/ticketrun/vendor/pdf-lib.min.js"));
  const out = join(ROOT, "sites/ticketrun/pdf");
  mkdirSync(out, { recursive: true });
  for (const r of READY) {
    for (const [paper] of PAPERS) {
      const state = Object.assign(C.presetState(r.preset), r.over, { start: r.start, end: r.end, paper }, r.perPage ? { perPage: r.perPage } : {});
      const { bytes } = await C.buildTicketPdf(L, state);
      const doc = await L.PDFDocument.load(bytes);
      doc.setTitle(r.docTitle);
      doc.setAuthor("TicketRun (raffle.roohsites.com)");
      doc.setSubject(`Free printable ${r.what}, numbered ${r.start}-${r.end}. Make your own at https://raffle.roohsites.com${r.page}`);
      doc.setKeywords(["printable tickets", "numbered tickets", r.what, "free PDF", "TicketRun"]);
      const file = `${r.file}-${paper}.pdf`;
      const data = await doc.save();
      writeFileSync(join(out, file), data);
      console.log(`${file}  ${doc.getPageCount()} pages  ${(data.length / 1024).toFixed(0)} KB`);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
