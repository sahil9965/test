/* GoalTally renderers: scene -> SVG (preview), scene -> vector PDF (jsPDF, loaded on demand), scene -> PNG. */
(function (root) {
  "use strict";
  const GT = root.GT;
  const FONT = "Helvetica, Arial, 'Liberation Sans', 'Nimbus Sans', sans-serif";
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const n = v => Math.round(v * 100) / 100;

  function svg(scene, opt = {}) {
    const { w, h } = scene;
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(w)} ${n(h)}"${opt.px ? ` width="${n(w * opt.px)}" height="${n(h * opt.px)}"` : ""} font-family="${FONT}"${opt.label ? ` role="img" aria-label="${esc(opt.label)}"` : ` aria-hidden="true"`}${opt.cls ? ` class="${opt.cls}"` : ""}>`];
    for (const it of scene.items) out.push(item(it, opt));
    out.push("</svg>");
    return out.join("");
  }
  function stroke(it) {
    return ` stroke="${it.c || it.stroke || "#000"}" stroke-width="${it.w ?? it.sw ?? 1}"${it.dash ? ` stroke-dasharray="${it.dash.join(" ")}"` : ""}${it.round ? ` stroke-linecap="round"` : ""}`;
  }
  function item(it, opt) {
    switch (it.t) {
      case "line": return `<line x1="${n(it.x1)}" y1="${n(it.y1)}" x2="${n(it.x2)}" y2="${n(it.y2)}"${stroke(it)}/>`;
      case "poly": return `<polyline points="${it.pts.map(p => n(p[0]) + "," + n(p[1])).join(" ")}" fill="none" stroke-linejoin="round"${stroke(it)}/>`;
      case "polygon": return `<polygon points="${it.pts.map(p => n(p[0]) + "," + n(p[1])).join(" ")}" fill="${it.fill || "none"}" stroke="${it.stroke || "none"}" stroke-width="${it.w ?? 1}"/>`;
      case "circle": return `<circle cx="${n(it.x)}" cy="${n(it.y)}" r="${n(it.r)}" fill="${it.fill || "none"}" stroke="${it.stroke || "none"}" stroke-width="${it.w ?? 1}"/>`;
      case "rect": return `<rect x="${n(it.x)}" y="${n(it.y)}" width="${n(it.w)}" height="${n(it.h)}" fill="${it.fill || "none"}"${it.stroke ? ` stroke="${it.stroke}" stroke-width="${it.sw ?? 1}"` : ""}/>`;
      case "image": return `<image href="${esc(it.src)}" x="${n(it.x)}" y="${n(it.y)}" width="${n(it.w)}" height="${n(it.h)}" preserveAspectRatio="xMidYMid meet"/>`;
      case "text": {
        const t = `<text x="${n(it.x)}" y="${n(it.y)}" font-size="${it.size}"${it.bold ? ` font-weight="700"` : ""}${it.anchor && it.anchor !== "start" ? ` text-anchor="${it.anchor}"` : ""} fill="${it.c || "#000"}"${it.rot ? ` transform="rotate(${it.rot} ${n(it.x)} ${n(it.y)})"` : ""} xml:space="preserve">${esc(it.s)}</text>`;
        return it.href && !opt.noLinks ? `<a href="${esc(it.href)}" target="_blank" rel="noopener">${t}</a>` : t;
      }
    }
    return "";
  }

  /* ---------- PDF ---------- */
  let jsPDFPromise = null;
  function loadJsPDF() {
    if (root.jspdf && root.jspdf.jsPDF) return Promise.resolve(root.jspdf.jsPDF);
    if (!jsPDFPromise) jsPDFPromise = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "/vendor/jspdf-4.2.1.umd.min.js";
      s.onload = () => root.jspdf && root.jspdf.jsPDF ? res(root.jspdf.jsPDF) : rej(new Error("PDF library failed to load"));
      s.onerror = () => { jsPDFPromise = null; rej(new Error("Couldn't load the PDF library. Check your connection and try again.")); };
      document.head.appendChild(s);
    });
    return jsPDFPromise;
  }
  // Standard PDF fonts only cover Windows-1252; map the few other symbols we use and replace the rest.
  const WIN = new Set([0x20ac, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152, 0x17d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0x17e, 0x178]);
  const MAP = { "−": "-", "≥": ">=", "≤": "<=", "✓": "x", "✔": "x", "→": "->", "←": "<-", "≈": "~", " ": " " };
  function pdfSafe(s) {
    let o = "";
    for (const ch of String(s ?? "").normalize("NFC")) {
      const c = ch.codePointAt(0);
      if (MAP[ch]) o += MAP[ch];
      else if (c < 0x100 || WIN.has(c)) o += ch;
      else { const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, ""); o += base && base.codePointAt(0) < 0x100 ? base : "?"; }
    }
    return o;
  }
  const rgb = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); const v = m ? parseInt(m[1], 16) : 0; return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  function drawPdf(doc, items, tf = { s: 1, x: 0, y: 0 }) {
    const X = v => tf.x + v * tf.s, Y = v => tf.y + v * tf.s, S = v => v * tf.s;
    const dash = d => doc.setLineDashPattern(d ? d.map(S) : [], 0);
    for (const it of items) {
      if (it.t === "line" || it.t === "poly") {
        doc.setDrawColor(...rgb(it.c)); doc.setLineWidth(S(it.w ?? 1)); dash(it.dash); doc.setLineCap(it.round ? "round" : "butt"); doc.setLineJoin("round");
        if (it.t === "line") doc.line(X(it.x1), Y(it.y1), X(it.x2), Y(it.y2));
        else { const p = it.pts; doc.lines(p.slice(1).map((q, i) => [S(q[0] - p[i][0]), S(q[1] - p[i][1])]), X(p[0][0]), Y(p[0][1]), [1, 1], "S", false); }
        dash(null); doc.setLineCap("butt");
      } else if (it.t === "polygon") {
        const p = it.pts; doc.setFillColor(...rgb(it.fill)); doc.setDrawColor(...rgb(it.stroke || it.fill)); doc.setLineWidth(S(it.w ?? 1));
        doc.lines(p.slice(1).map((q, i) => [S(q[0] - p[i][0]), S(q[1] - p[i][1])]), X(p[0][0]), Y(p[0][1]), [1, 1], it.fill ? "FD" : "S", true);
      } else if (it.t === "circle") {
        if (it.fill) doc.setFillColor(...rgb(it.fill)); if (it.stroke) { doc.setDrawColor(...rgb(it.stroke)); doc.setLineWidth(S(it.w ?? 1)); }
        doc.circle(X(it.x), Y(it.y), S(it.r), it.fill && it.stroke ? "FD" : it.fill ? "F" : "S");
      } else if (it.t === "rect") {
        if (!it.fill && !it.stroke) continue;
        if (it.fill) doc.setFillColor(...rgb(it.fill)); if (it.stroke) { doc.setDrawColor(...rgb(it.stroke)); doc.setLineWidth(S(it.sw ?? 1)); }
        doc.rect(X(it.x), Y(it.y), S(it.w), S(it.h), it.fill && it.stroke ? "FD" : it.fill ? "F" : "S");
      } else if (it.t === "image") {
        try { doc.addImage(it.src, it.fmt || (/^data:image\/jpe?g/.test(it.src) ? "JPEG" : "PNG"), X(it.x), Y(it.y), S(it.w), S(it.h)); } catch (e) { /* unreadable logo: skip it */ }
      } else if (it.t === "text") {
        const s = pdfSafe(it.s), size = S(it.size);
        doc.setFont("helvetica", it.bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...rgb(it.c));
        const w = doc.getTextWidth(s);
        if (it.rot) {
          // SVG rotates clockwise for positive angles; jsPDF counter-clockwise. Anchor manually.
          const a = -it.rot * Math.PI / 180, off = it.anchor === "middle" ? w / 2 : it.anchor === "end" ? w : 0;
          doc.text(s, X(it.x) - off * Math.cos(a), Y(it.y) + off * Math.sin(a), { angle: -it.rot });
        } else {
          const x0 = it.anchor === "middle" ? X(it.x) - w / 2 : it.anchor === "end" ? X(it.x) - w : X(it.x);
          doc.text(s, x0, Y(it.y));
          if (it.href) doc.link(x0, Y(it.y) - size * 0.8, w, size * 1.05, { url: it.href });
        }
      }
    }
  }
  function newDoc(jsPDF, w, h) { return new jsPDF({ unit: "pt", format: [w, h], orientation: w > h ? "landscape" : "portrait", compress: true }); }
  function meta(doc, title) { doc.setProperties({ title: pdfSafe(title), creator: "GoalTally (goaltally.vercel.app)", subject: "Made with GoalTally" }); }

  async function sheetsPdf(list, title) {
    const jsPDF = await loadJsPDF();
    let doc = null;
    for (const sp of list) for (const page of sp.pages) {
      if (!doc) doc = newDoc(jsPDF, sp.w, sp.h); else doc.addPage([sp.w, sp.h], sp.w > sp.h ? "landscape" : "portrait");
      drawPdf(doc, page.items);
    }
    meta(doc, title || "Data sheet");
    return doc.output("blob");
  }

  // Phase summary table + mastery + progress note, laid out in PDF points.
  function summaryItems(model, note, W, x0, y0) {
    const it = [], m = model, unit = m.pct ? "%" : "";
    const T = (x, y, s, size, o = {}) => it.push({ t: "text", x, y, s, size, bold: !!o.bold, anchor: o.anchor || "start", c: o.c || "#111111" });
    let y = y0;
    T(x0, y + 12, "Summary by phase", 12, { bold: true }); y += 22;
    const cols = [["Phase", 0.26], ["Data points", 0.12], ["Mean", 0.12], ["Median", 0.12], ["Range", 0.16], [`Trend per ${m.cal ? "week" : "session"}`, 0.12], ["PND", 0.1]];
    let x = x0;
    const xs = cols.map(c => { const r = x; x += c[1] * W; return r; });
    it.push({ t: "rect", x: x0, y, w: W, h: 18, fill: "#efefef" });
    cols.forEach((c, i) => T(xs[i] + 4, y + 12.5, c[0], 8.5, { bold: true }));
    y += 18;
    const f = v => GT.isNum(v) ? GT.fmtNum(v, 1) + unit : "–";
    for (const s of m.stats) {
      if (!s.sessions) continue;
      const row = [GT.fit(s.name || `Phase ${s.k + 1}`, cols[0][1] * W - 8, 9), String(s.n), f(s.mean), f(s.median), s.n ? `${GT.fmtNum(s.min, 1)}–${GT.fmtNum(s.max, 1)}${unit}` : "–", s.slope === null ? "–" : (s.slope >= 0 ? "+" : "") + GT.fmtNum(s.slope, 2), s.pnd === null ? "–" : GT.fmtNum(s.pnd, 0) + "%"];
      row.forEach((v, i) => T(xs[i] + 4, y + 12.5, v, 9));
      it.push({ t: "line", x1: x0, y1: y + 18, x2: x0 + W, y2: y + 18, w: 0.5, c: "#cccccc" });
      y += 18;
    }
    T(x0, y + 12, "Trend per session uses a least-squares fit. PND = percentage of points that don't overlap the previous phase (" + (m.g.crit && m.g.crit.dir === "down" ? "below its lowest point" : "above its highest point") + ").", 7.5, { c: "#55555f" });
    y += 22;
    if (note) {
      T(x0, y + 12, "Progress note", 12, { bold: true }); y += 20;
      for (const l of GT.wrap(note, W, 10)) { T(x0, y + 10, l, 10); y += 14; }
    }
    return { items: it, y };
  }
  async function graphPdf(scene, opt = {}) {
    const jsPDF = await loadJsPDF();
    const [pw, ph] = opt.paper === "a4" ? [841.89, 595.28] : [792, 612];
    const doc = newDoc(jsPDF, pw, ph), M = 36;
    const s = Math.min((pw - 2 * M) / scene.w, (ph - 2 * M) / scene.h);
    const gx = (pw - scene.w * s) / 2;
    drawPdf(doc, scene.items, { s, x: gx, y: M });
    if (opt.summary) {
      const W = pw - 2 * M;
      let y0 = M + scene.h * s + 16;
      const test = summaryItems(scene.model, opt.note, W, M, 0);
      if (y0 + test.y > ph - M) { doc.addPage([pw, ph], "landscape"); y0 = M; }
      drawPdf(doc, summaryItems(scene.model, opt.note, W, M, y0).items);
      const credit = { t: "text", x: pw - M, y: ph - 18, s: GT.CREDIT, size: 8, anchor: "end", c: "#8a8a96", href: GT.CREDIT_URL };
      if (doc.getNumberOfPages() > 1) drawPdf(doc, [credit]);
    }
    meta(doc, opt.title || "ABA graph");
    return doc.output("blob");
  }
  async function png(scene, scale = 2) {
    const s = svg(scene, { px: scale, noLinks: true });
    const url = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = Math.round(scene.w * scale); c.height = Math.round(scene.h * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return await new Promise(res => c.toBlob(res, "image/png"));
    } finally { URL.revokeObjectURL(url); }
  }

  root.GTR = { svg, sheetsPdf, graphPdf, png, loadJsPDF, pdfSafe, drawPdf };
})(typeof self !== "undefined" ? self : this);
