// BellBook classroom poster: one page with a QR code for a "What day is it today?" link.
// Imported on demand by app.js and today.js, so the PDF and QR libraries only load when someone asks for a poster.
import { posterPdf } from "./printables.js";

const loading = {};
function script(src, get) {
  if (get()) return Promise.resolve(get());
  return loading[src] || (loading[src] = new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => (get() ? ok(get()) : fail(new Error("Couldn't start the poster maker. Reload the page and try again.")));
    s.onerror = () => { delete loading[src]; fail(new Error("Couldn't load the poster maker. Check your connection and try again.")); };
    document.head.appendChild(s);
  }));
}

// res: a computed calendar (engine.compute); url: the exact share link the QR code should open.
export async function makePoster(res, url, { size = "letter" } = {}) {
  const [jsPDF, qrcode] = await Promise.all([
    script("/vendor/jspdf-4.2.1.umd.min.js", () => window.jspdf && window.jspdf.jsPDF),
    script("/vendor/qrcode-generator-1.4.4.js", () => window.qrcode),
  ]);
  return posterPdf(jsPDF, qrcode, res, url, { size: size === "a4" ? "a4" : "letter" });
}
