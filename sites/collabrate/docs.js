/* CollabRate documents: the rate card (1080 × 1350, PNG or 8 × 10 in PDF) and the brand quote
   (A4 or US Letter PDF). Each layout is written once against a tiny "painter" interface and
   drawn either to <canvas> (preview + PNG) or to jsPDF (vector PDF with the Inter font embedded),
   so what you see is what you download. Loaded on demand by app.js. */
(function () {
  "use strict";
  const K = window.CRCalc;
  const FAMILY = "CRInter";
  const FONT_URLS = ["/vendor/inter-400.ttf", "/vendor/inter-700.ttf"];
  const JSPDF_SRC = "/vendor/jspdf-4.2.1.umd.min.js";
  const PAPER = { letter: [612, 792], a4: [595.28, 841.89] };
  const INK = "#1b1b1f", MUTED = "#62626e", LINE = "#e4e1da", SOFT = "#f4f2ee", WHITE = "#ffffff";

  // ---------- loading (fonts for canvas + PDF, jsPDF only when a PDF is requested) ----------
  let fontsP = null, pdfP = null, fontB64 = null;
  const toB64 = buf => { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  function loadFonts() {
    if (fontsP) return fontsP;
    fontsP = Promise.all(FONT_URLS.map(u => fetch(u).then(r => { if (!r.ok) throw new Error("font " + r.status); return r.arrayBuffer(); })))
      .then(async bufs => {
        fontB64 = bufs.map(toB64);
        const faces = [new FontFace(FAMILY, bufs[0].slice(0), { weight: "400" }), new FontFace(FAMILY, bufs[1].slice(0), { weight: "700" })];
        await Promise.all(faces.map(f => f.load()));
        faces.forEach(f => document.fonts.add(f));
      });
    fontsP.catch(() => { fontsP = null; });
    return fontsP;
  }
  function loadPdf() {
    if (pdfP) return pdfP;
    pdfP = new Promise((res, rej) => {
      if (window.jspdf) return res();
      const s = document.createElement("script");
      s.src = JSPDF_SRC; s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error("Couldn't load the PDF library. Check your connection and try again."));
      document.head.appendChild(s);
    });
    pdfP.catch(() => { pdfP = null; });
    return Promise.all([pdfP, loadFonts()]);
  }

  // ---------- colour helpers ----------
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgb2hex = a => "#" + a.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const lum = h => { const c = hex2rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  function palette(accent) {
    const a = /^#[0-9a-f]{6}$/i.test(accent || "") ? accent : "#a21caf";
    const onA = contrast(a, WHITE) >= 3 ? WHITE : INK;
    // Accent used as text on white must stay readable: darken light accents.
    let text = a; for (let i = 0; i < 8 && contrast(text, WHITE) < 4.5; i++) text = mix(text, INK, 0.2);
    return { a, onA, text, tint: mix(a, WHITE, 0.9), wash: mix(a, WHITE, 0.94), rule: mix(a, WHITE, 0.55), onAsoft: mix(onA, a, 0.22) };
  }

  // ---------- painters ----------
  function roundPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // Canvas painter over one or more pages. `scale` = device pixels per layout unit.
  function canvasPainter(w, h, scale, makeCanvas) {
    const pages = []; let ctx;
    const font = (size, bold) => `${bold ? 700 : 400} ${size}px ${FAMILY}, Inter, Helvetica, Arial, sans-serif`;
    const p = {
      w, h, pages,
      newPage() { const c = makeCanvas(); c.width = Math.round(w * scale); c.height = Math.round(h * scale); ctx = c.getContext("2d"); ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.fillStyle = WHITE; ctx.fillRect(0, 0, w, h); pages.push(c); },
      setPage(i) { ctx = pages[i].getContext("2d"); },
      measure(t, size, bold) { ctx.font = font(size, bold); return ctx.measureText(String(t)).width; },
      text(t, x, y, o = {}) { ctx.font = font(o.size, o.bold); ctx.fillStyle = o.color || INK; ctx.textAlign = o.align || "left"; ctx.textBaseline = "alphabetic"; ctx.fillText(String(t), x, y); },
      rect(x, y, rw, rh, o = {}) { roundPath(ctx, x, y, rw, rh, o.r); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 1; ctx.stroke(); } },
      line(x1, y1, x2, y2, color, lw) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = lw || 1; ctx.stroke(); },
      circle(cx, cy, r, o = {}) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 1; ctx.stroke(); } },
      image(im, x, y, iw, ih) { ctx.drawImage(im.canvas, x, y, iw, ih); },
      link() {},
    };
    p.newPage();
    return p;
  }
  // jsPDF painter. `k` = PDF points per layout unit.
  function pdfPainter(doc, w, h, k) {
    const setF = (size, bold) => { doc.setFont("Inter", bold ? "bold" : "normal"); doc.setFontSize(size * k); };
    const style = o => (o.fill && o.stroke ? "FD" : o.fill ? "F" : "S");
    const paint = o => { if (o.fill) doc.setFillColor(o.fill); if (o.stroke) { doc.setDrawColor(o.stroke); doc.setLineWidth((o.lw || 1) * k); } };
    return {
      w, h,
      newPage() { doc.addPage([w * k, h * k], w > h ? "landscape" : "portrait"); },
      setPage(i) { doc.setPage(i + 1); },
      get pageCount() { return doc.getNumberOfPages(); },
      measure(t, size, bold) { setF(size, bold); return doc.getTextWidth(String(t)) / k; },
      text(t, x, y, o = {}) { setF(o.size, o.bold); doc.setTextColor(o.color || INK); doc.text(String(t), x * k, y * k, { align: o.align || "left", baseline: "alphabetic" }); },
      rect(x, y, rw, rh, o = {}) { paint(o); if (o.r) doc.roundedRect(x * k, y * k, rw * k, rh * k, o.r * k, o.r * k, style(o)); else doc.rect(x * k, y * k, rw * k, rh * k, style(o)); },
      line(x1, y1, x2, y2, color, lw) { doc.setDrawColor(color); doc.setLineWidth((lw || 1) * k); doc.line(x1 * k, y1 * k, x2 * k, y2 * k); },
      circle(cx, cy, r, o = {}) { paint(o); doc.circle(cx * k, cy * k, r * k, style(o)); },
      image(im, x, y, iw, ih) { doc.addImage(im.png, "PNG", x * k, y * k, iw * k, ih * k, undefined, "FAST"); },
      link(x, y, lw, lh, url) { doc.link(x * k, y * k, lw * k, lh * k, { url }); },
    };
  }
  // Measures like `p` but draws nothing: used to fit content before drawing it.
  const dry = p => ({ ...p, newPage() {}, setPage() {}, text() {}, rect() {}, line() {}, circle() {}, image() {}, link() {} });

  function wrap(p, text, maxW, size, bold) {
    const out = [];
    for (const para of String(text || "").split(/\r?\n/)) {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(""); continue; }
      let line = "";
      for (let w of words) {
        const test = line ? line + " " + w : w;
        if (p.measure(test, size, bold) <= maxW) { line = test; continue; }
        if (line) out.push(line);
        while (w.length > 1 && p.measure(w, size, bold) > maxW) {
          let i = w.length - 1; while (i > 1 && p.measure(w.slice(0, i), size, bold) > maxW) i--;
          out.push(w.slice(0, i)); w = w.slice(i);
        }
        line = w;
      }
      out.push(line);
    }
    return out;
  }
  function clip(p, text, maxW, size, bold) {
    let t = String(text || "");
    if (p.measure(t, size, bold) <= maxW) return t;
    while (t.length > 1 && p.measure(t + "…", size, bold) > maxW) t = t.slice(0, -1);
    return t.trimEnd() + "…";
  }
  // "Made with CollabRate · domain", centred on cx, with a link over the whole credit in PDFs.
  function credit(p, cx, y, size, color, strong) {
    const a = "Made with ", b = "CollabRate", c = " · " + K.DOMAIN;
    const wa = p.measure(a, size), wb = p.measure(b, size, true), wc = p.measure(c, size), x = cx - (wa + wb + wc) / 2;
    p.text(a, x, y, { size, color }); p.text(b, x + wa, y, { size, bold: true, color: strong }); p.text(c, x + wa + wb, y, { size, color });
    p.link(x - 2, y - size, wa + wb + wc + 4, size * 1.4, K.REF);
  }

  // Square photo → circular crop, kept as a canvas (for drawing) and a PNG (for jsPDF).
  const imgCache = new Map();
  function headshot(dataUrl) {
    if (!dataUrl) return Promise.resolve(null);
    if (imgCache.has(dataUrl)) return imgCache.get(dataUrl);
    const pr = new Promise(res => {
      const im = new Image();
      im.onload = () => {
        const n = 400, c = document.createElement("canvas"); c.width = c.height = n;
        const x = c.getContext("2d"), s = Math.min(im.naturalWidth, im.naturalHeight);
        x.beginPath(); x.arc(n / 2, n / 2, n / 2, 0, Math.PI * 2); x.clip();
        x.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, n, n);
        res({ canvas: c, png: c.toDataURL("image/png") });
      };
      im.onerror = () => res(null);
      im.src = dataUrl;
    });
    imgCache.set(dataUrl, pr);
    return pr;
  }

  // ============================== RATE CARD ==============================
  const CW = 1080, CH = 1350, CM = 84;
  function cardData(d) {
    const rows = K.cardRows(d.calc, d.card);
    const pr = d.profile || {};
    return { rows, card: rows.card, pal: palette(rows.card.accent), name: String(pr.name || "").trim(), sub: [pr.handle, pr.niche].map(x => String(x || "").trim()).filter(Boolean).join(" · "), contact: [pr.email, pr.website].map(x => String(x || "").trim()).filter(Boolean).join("  ·  "), img: d.img || null };
  }

  function cardHeader(p, D, s) {
    const T = D.card.template, P = D.pal, title = (D.card.title || "").trim().toUpperCase();
    const name = D.name || "Your name";
    if (T === "soft") {
      p.rect(0, 0, CW, CH, { fill: P.wash });
      let y = 64 * s;
      if (D.img) { const r = 92 * s; p.circle(CW / 2, y + r, r + 8, { fill: WHITE }); p.image(D.img, CW / 2 - r, y, r * 2, r * 2); y += r * 2 + 30 * s; }
      if (title) { const ts = 22 * s, tw = p.measure(title, ts, true) + 44 * s; p.rect(CW / 2 - tw / 2, y, tw, 44 * s, { fill: P.a, r: 22 * s }); p.text(title, CW / 2, y + 30 * s, { size: ts, bold: true, color: P.onA, align: "center" }); y += 44 * s + 18 * s; }
      for (const l of wrap(p, name, CW - 2 * CM, 70 * s, true).slice(0, 2)) { y += 74 * s; p.text(l, CW / 2, y, { size: 70 * s, bold: true, align: "center" }); }
      if (D.sub) { y += 44 * s; p.text(clip(p, D.sub, CW - 2 * CM, 30 * s), CW / 2, y, { size: 30 * s, color: MUTED, align: "center" }); }
      return y + 40 * s;
    }
    const bold = T === "bold", r = 100 * s, imgW = D.img ? r * 2 + 40 : 0;
    const fg = bold ? P.onA : INK, fg2 = bold ? P.onAsoft : MUTED, top = (bold ? 78 : 84) * s;
    const lines = wrap(dry(p), name, CW - 2 * CM - imgW, 74 * s, true).slice(0, 2);
    let hh = top + (title ? 34 * s : 0) + lines.length * 80 * s + (D.sub ? 46 * s : 0);
    hh = Math.max(hh, D.img ? top + r * 2 : 0);
    if (bold) p.rect(0, 0, CW, hh + 64 * s, { fill: P.a });
    let y = top;
    if (title) { y += 26 * s; p.text(title, CM, y, { size: 24 * s, bold: true, color: bold ? fg2 : P.text }); y += 8 * s; }
    for (const l of lines) { y += 80 * s; p.text(l, CM, y - 6 * s, { size: 74 * s, bold: true, color: fg }); }
    if (D.sub) { y += 46 * s; p.text(clip(p, D.sub, CW - 2 * CM - imgW, 30 * s), CM, y - 4 * s, { size: 30 * s, color: fg2 }); }
    if (D.img) {
      const cy = top + Math.max(r, (hh - top) / 2);
      if (bold) p.circle(CW - CM - r, cy, r + 8, { fill: WHITE });
      p.image(D.img, CW - CM - 2 * r, cy - r, 2 * r, 2 * r);
    }
    if (bold) return hh + 64 * s + 50 * s;
    p.rect(CM, hh + 34 * s, CW - 2 * CM, 6, { fill: P.a, r: 3 });
    return hh + 34 * s + 6 + 48 * s;
  }

  // One titled block of rows. Returns the new y. `box` draws the soft template's white panel.
  function cardSection(p, D, s, y, title, kind, items) {
    const P = D.pal, T = D.card.template, soft = T === "soft", pad = soft ? 36 * s : 0, x0 = CM + pad, x1 = CW - CM - pad;
    const body = (q, y0) => {
      let y = y0;
      q.text(title.toUpperCase(), x0, y + 24 * s, { size: 23 * s, bold: true, color: T === "bold" ? INK : P.text });
      y += 24 * s + 14 * s;
      if (kind === "packages") {
        items.forEach((it, i) => {
          const vs = 38 * s, vw = it.value ? q.measure(it.value, vs, true) : 0, ls = 33 * s;
          const lab = clip(q, it.label, x1 - x0 - vw - 40 - (it.save ? 150 * s : 0), ls, true);
          const rh = 70 * s, base = y + rh / 2 + 12 * s;
          if (T === "bold") q.rect(x0, y + 6 * s, x1 - x0, rh - 12 * s, { fill: P.wash, r: 14 * s });
          const ix = T === "bold" ? x0 + 22 * s : x0, vx = T === "bold" ? x1 - 22 * s : x1;
          q.text(lab, ix, base, { size: ls, bold: true });
          if (it.save) { const sw = q.measure(it.save, 20 * s, true) + 24 * s, sx = ix + q.measure(lab, ls, true) + 16 * s; q.rect(sx, base - 27 * s, sw, 34 * s, { fill: P.tint, r: 17 * s }); q.text(it.save, sx + sw / 2, base - 4 * s, { size: 20 * s, bold: true, color: P.text, align: "center" }); }
          if (it.value) q.text(it.value, vx, base + 1 * s, { size: vs, bold: true, color: T === "studio" ? INK : P.text, align: "right" });
          if (T !== "bold" && i < items.length - 1) q.line(x0, y + rh, x1, y + rh, LINE, 1.5);
          y += rh;
        });
        if (D.rows.request) { y += 20 * s; for (const l of wrap(q, "Rates on request. Send me your brief and I'll reply with a custom quote.", x1 - x0, 27 * s, true)) { y += 38 * s; q.text(l, x0, y, { size: 27 * s, bold: true, color: P.text }); } y += 10 * s; }
      } else if (kind === "addons") {
        const ls = 28 * s, lh = 40 * s;
        items.forEach((it, i) => {
          const vw = it.value ? q.measure(it.value, ls, true) + 30 : 0;
          const lines = wrap(q, it.label, x1 - x0 - vw, ls, false);
          lines.forEach((l, j) => q.text(l, x0, y + 38 * s + j * lh, { size: ls, color: INK }));
          if (it.value) q.text(it.value, x1, y + 38 * s, { size: ls, bold: true, color: INK, align: "right" });
          const rh = 16 * s + lines.length * lh;
          if (i < items.length - 1) q.line(x0, y + rh, x1, y + rh, LINE, 1);
          y += rh;
        });
      } else {
        const ls = 27 * s, lh = 39 * s;
        items.forEach(it => {
          const lines = wrap(q, it, x1 - x0 - 34 * s, ls, false);
          q.circle(x0 + 7 * s, y + lh - 9 * s, 6 * s, { fill: P.a });
          lines.forEach((l, j) => q.text(l, x0 + 30 * s, y + lh + j * lh, { size: ls }));
          y += lines.length * lh + 4 * s;
        });
        y += 6 * s;
      }
      return y;
    };
    if (!soft) return body(p, y) + 34 * s;
    const end = body(dry(p), y + pad);
    p.rect(CM, y, CW - 2 * CM, end - y + pad, { fill: WHITE, r: 26 * s });
    body(p, y + pad);
    return end + pad + 24 * s;
  }

  function cardBody(p, D, s) {
    let y = cardHeader(p, D, s);
    const R = D.rows;
    if (R.packages.length) y = cardSection(p, D, s, y, "Packages", "packages", R.packages);
    if (R.addons.length) y = cardSection(p, D, s, y, "Add-ons", "addons", R.addons);
    if (R.included.length) y = cardSection(p, D, s, y, "Every video includes", "included", R.included);
    const note = [R.request ? "" : `Prices in ${R.currency}.`, D.card.note.trim()].filter(Boolean).join(" ");
    if (note) {
      const soft = D.card.template === "soft";
      for (const l of wrap(p, note, CW - 2 * CM, 24 * s, false).slice(0, 3)) { y += 34 * s; p.text(l, soft ? CW / 2 : CM, y, { size: 24 * s, color: MUTED, align: soft ? "center" : "left" }); }
    }
    return y;
  }

  // Draws the card, shrinking type until everything fits above the contact line.
  // Returns { scale, dropped } so the app can say when lines had to be left off.
  function drawCard(p, D) {
    const limit = CH - (D.contact ? 150 : 96);
    const fits = t => cardBody(dry(p), D, t) <= limit;
    let s = 0.5, dropped = 0;
    const scales = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5];
    const found = scales.find(fits);
    if (found) s = found;
    else {
      // Last resort: leave off trailing "includes" lines, then trailing add-ons, until it fits.
      const R = D.rows;
      while (!fits(s) && (R.included.length || R.addons.length > 1)) { if (R.included.length) R.included.pop(); else R.addons.pop(); dropped++; }
    }
    p.rect(0, 0, CW, CH, { fill: WHITE });
    cardBody(p, D, s);
    const P = D.pal, soft = D.card.template === "soft";
    if (D.contact) {
      const cs = 28;
      if (D.card.template === "bold") p.rect(0, CH - 140, CW, 140, { fill: P.a });
      const fg = D.card.template === "bold" ? P.onA : INK;
      let size = cs; while (size > 20 && p.measure(D.contact, size, true) > CW - 2 * CM) size -= 1;
      p.text(clip(p, D.contact, CW - 2 * CM, size, true), CW / 2, CH - 84, { size, bold: true, color: fg, align: "center" });
      credit(p, CW / 2, CH - 34, 19, D.card.template === "bold" ? P.onAsoft : MUTED, fg);
    } else credit(p, CW / 2, CH - 34, 19, MUTED, soft ? P.text : INK);
    return { scale: s, dropped };
  }

  async function prepCard(d) { const D = cardData(d); D.img = await headshot(d.headshot); return D; }

  async function renderCard(canvas, d, scale) {
    await loadFonts().catch(() => {});
    const D = await prepCard(d);
    const p = canvasPainter(CW, CH, scale, () => canvas);
    return drawCard(p, D);
  }
  async function cardPNG(d) {
    const c = document.createElement("canvas");
    await renderCard(c, d, 1);
    return new Promise(res => c.toBlob(res, "image/png"));
  }
  function newDoc(wPt, hPt, meta) {
    const doc = new window.jspdf.jsPDF({ unit: "pt", format: [wPt, hPt], orientation: wPt > hPt ? "landscape" : "portrait", compress: true });
    doc.addFileToVFS("inter-400.ttf", fontB64[0]); doc.addFont("inter-400.ttf", "Inter", "normal");
    doc.addFileToVFS("inter-700.ttf", fontB64[1]); doc.addFont("inter-700.ttf", "Inter", "bold");
    doc.setFont("Inter", "normal");
    doc.setProperties({ creator: "CollabRate (" + K.DOMAIN + ")", ...meta });
    return doc;
  }
  async function cardPDF(d) {
    await loadPdf();
    const D = await prepCard(d);
    const k = 576 / CW, doc = newDoc(576, 720, { title: `${D.card.title || "UGC rate card"}${D.name ? " – " + D.name : ""}`, author: D.name, subject: "UGC rate card" });
    drawCard(pdfPainter(doc, CW, CH, k), D);
    return doc.output("blob");
  }

  // ============================== BRAND QUOTE ==============================
  function quoteData(d) {
    const c = K.compute(d.calc), q = d.quote || {}, pr = d.profile || {};
    const paper = q.paper === "a4" || q.paper === "letter" ? q.paper : K.CURRENCIES[c.currency].paper;
    return { c, q, pr, paper, pal: palette(d.accent), opts: q.showOptions ? K.usageOptions(c.state) : [] };
  }

  function drawQuote(p, Q) {
    const { c, q, pr, pal } = Q, cur = c.currency, W = p.w, H = p.h, M = 50, BOT = H - 62, m = n => K.money(n, cur);
    let y = M;
    const need = h => { if (y + h > BOT) { p.newPage(); y = M; return true; } return false; };
    // Header: creator (left) and quote meta (right)
    const metaX = W - M - 170;
    let ly = y + 16;
    if (pr.name) { for (const l of wrap(p, pr.name, metaX - M - 20, 17, true).slice(0, 2)) { p.text(l, M, ly, { size: 17, bold: true }); ly += 21; } ly -= 4; }
    for (const t of [pr.handle, pr.email, pr.website].map(x => String(x || "").trim()).filter(Boolean)) { ly += 13; p.text(clip(p, t, metaX - M - 20, 9.5), M, ly, { size: 9.5, color: MUTED }); }
    p.text("QUOTE", W - M, y + 20, { size: 24, bold: true, color: pal.text, align: "right" });
    let ry = y + 40;
    const vu = K.validUntil(q);
    for (const [k, v] of [["Quote no.", q.no], ["Date", K.fmtDate(q.date)], ["Valid until", K.fmtDate(vu)]]) {
      if (!v) continue; ry += 13;
      p.text(k, metaX, ry, { size: 9, color: MUTED }); p.text(clip(p, v, 100, 9.5, true), W - M, ry, { size: 9.5, bold: true, align: "right" });
    }
    y = Math.max(ly, ry) + 18;
    p.rect(M, y, W - 2 * M, 2, { fill: pal.a }); y += 26;
    // Parties
    const half = (W - 2 * M) / 2;
    let by = y, py = y;
    if (q.brand || q.contact) {
      p.text("PREPARED FOR", M, by, { size: 7.5, bold: true, color: MUTED }); by += 16;
      if (q.brand) for (const l of wrap(p, q.brand, half - 20, 13, true).slice(0, 2)) { p.text(l, M, by, { size: 13, bold: true }); by += 16; }
      if (q.contact) { p.text(clip(p, q.contact, half - 20, 10), M, by, { size: 10, color: INK }); by += 14; }
    }
    if (q.project) {
      p.text("PROJECT", M + half, py, { size: 7.5, bold: true, color: MUTED }); py += 16;
      for (const l of wrap(p, q.project, half, 10).slice(0, 4)) { p.text(l, M + half, py, { size: 10 }); py += 13.5; }
    }
    y = Math.max(by, py) + (q.brand || q.contact || q.project ? 12 : 0);
    // Items table
    const xQty = W - M - 205, xUnit = W - M - 105, xAmt = W - M - 8, itemW = xQty - 40 - (M + 8);
    const head = () => {
      p.rect(M, y, W - 2 * M, 22, { fill: SOFT, r: 3 });
      p.text("ITEM", M + 8, y + 14.5, { size: 7.5, bold: true, color: MUTED });
      p.text("QTY", xQty, y + 14.5, { size: 7.5, bold: true, color: MUTED, align: "right" });
      p.text("UNIT PRICE", xUnit, y + 14.5, { size: 7.5, bold: true, color: MUTED, align: "right" });
      p.text("AMOUNT", xAmt, y + 14.5, { size: 7.5, bold: true, color: MUTED, align: "right" });
      y += 22;
    };
    need(60); head();
    for (const l of c.lines) {
      const lines = wrap(p, l.label, itemW, 10);
      const rh = 12 + lines.length * 13;
      if (need(rh)) head();
      lines.forEach((t, i) => p.text(t, M + 8, y + 17 + i * 13, { size: 10 }));
      p.text(String(l.qty), xQty, y + 17, { size: 10, align: "right" });
      p.text(m(l.unit), xUnit, y + 17, { size: 10, align: "right" });
      p.text(m(l.amount), xAmt, y + 17, { size: 10, bold: true, align: "right" });
      y += rh; p.line(M, y, W - M, y, LINE, 0.6);
    }
    const sumRow = (label, val, o = {}) => {
      need(20);
      p.text(label, xUnit, y + 15, { size: o.size || 10, bold: o.bold, color: o.color || INK, align: "right" });
      p.text(val, xAmt, y + 15, { size: o.size || 10, bold: true, color: o.color || INK, align: "right" });
      y += 20;
    };
    y += 4;
    if (c.discountAmt) { sumRow("Content subtotal", m(c.gross), { color: MUTED }); sumRow(`Package discount (${K.fmtPct(c.discountPct)})`, "−" + m(c.discountAmt), { color: MUTED }); }
    if (c.addons.length) sumRow("Content fee", m(c.content), { bold: true });
    // Rights and add-ons
    if (c.addons.length) {
      need(60); y += 14;
      p.text("Usage rights & add-ons", M + 8, y + 4, { size: 11, bold: true }); y += 12;
      const room = xAmt - 70 - (M + 8);
      for (const a of c.addons) {
        // Detail sits beside the label when it fits, otherwise on its own line below.
        const lw = p.measure(a.label, 10), inline = lw + 14 + p.measure(a.detail, 8.5) <= room;
        const lines = inline ? [a.label] : wrap(p, a.label, room, 10), rh = 12 + lines.length * 13 + (inline ? 0 : 12);
        need(rh);
        lines.forEach((t, i) => p.text(t, M + 8, y + 17 + i * 13, { size: 10 }));
        if (inline) p.text(a.detail, M + 8 + lw + 14, y + 17, { size: 8.5, color: MUTED });
        else p.text(a.detail, M + 8, y + 17 + lines.length * 13, { size: 8.5, color: MUTED });
        p.text(m(a.amount), xAmt, y + 17, { size: 10, bold: true, align: "right" });
        y += rh; p.line(M, y, W - M, y, LINE, 0.6);
      }
    }
    // Total
    y += 12; need(46);
    p.rect(M, y, W - 2 * M, 40, { fill: pal.tint, r: 6 });
    p.text(`Total (${cur})`, M + 14, y + 25, { size: 12, bold: true });
    p.text(m(c.total), W - M - 14, y + 27, { size: 18, bold: true, color: INK, align: "right" });
    y += 40;
    // Usage options
    if (Q.opts.length > 1) {
      y += 26; need(40 + Q.opts.length * 20);
      p.text("Usage options", M, y, { size: 12, bold: true }); y += 16;
      p.text("The same deliverables and extras, with a different paid-usage window:", M, y, { size: 9.5, color: MUTED }); y += 6;
      for (const o of Q.opts) {
        need(20);
        p.text(o.label + (o.current ? "  (this quote)" : ""), M + 8, y + 15, { size: 10, bold: o.current });
        p.text(m(o.total), xAmt, y + 15, { size: 10, bold: true, align: "right" });
        y += 20; p.line(M, y, W - M, y, LINE, 0.6);
      }
    }
    // Terms
    const terms = K.rightsTerms(c, q);
    if (vu) terms.push(`This quote is valid until ${K.fmtDate(vu)}.`);
    terms.push("This is a quote, not an invoice.");
    y += 28; need(40);
    p.text("Terms", M, y, { size: 12, bold: true }); y += 6;
    for (const t of terms) {
      const lines = wrap(p, t, W - 2 * M - 16, 9.5);
      need(lines.length * 13.5 + 6);
      p.circle(M + 3, y + 10, 1.8, { fill: pal.a });
      lines.forEach((l, i) => p.text(l, M + 14, y + 13.5 + i * 13.5, { size: 9.5 }));
      y += lines.length * 13.5 + 5;
    }
    const notes = String(q.notes || "").trim();
    if (notes) {
      y += 22; need(40);
      p.text("Notes", M, y, { size: 12, bold: true }); y += 4;
      for (const l of wrap(p, notes, W - 2 * M, 9.5)) { need(14); y += 13.5; p.text(l, M, y, { size: 9.5 }); }
    }
  }
  function quoteFooters(p, Q, count) {
    const W = p.w, H = p.h, M = 50;
    for (let i = 0; i < count; i++) {
      p.setPage(i);
      p.line(M, H - 44, W - M, H - 44, LINE, 0.6);
      if (Q.q.no) p.text(clip(p, `Quote ${Q.q.no}`, 120, 8), M, H - 28, { size: 8, color: MUTED });
      p.text(`Page ${i + 1} of ${count}`, W - M, H - 28, { size: 8, color: MUTED, align: "right" });
      credit(p, W / 2, H - 28, 8, MUTED, INK);
    }
  }
  async function renderQuote(container, d, scale) {
    await loadFonts().catch(() => {});
    const Q = quoteData(d), [w, h] = PAPER[Q.paper];
    const p = canvasPainter(w, h, scale, () => document.createElement("canvas"));
    drawQuote(p, Q); quoteFooters(p, Q, p.pages.length);
    container.replaceChildren(...p.pages.map((c, i) => { c.setAttribute("role", "img"); c.setAttribute("aria-label", `Quote preview, page ${i + 1} of ${p.pages.length}`); return c; }));
    return p.pages.length;
  }
  async function quotePDF(d) {
    await loadPdf();
    const Q = quoteData(d), [w, h] = PAPER[Q.paper];
    const doc = newDoc(w, h, { title: `Quote ${Q.q.no || ""}${Q.q.brand ? " – " + Q.q.brand : ""}`.trim(), author: Q.pr.name || "", subject: "UGC content quote" });
    const p = pdfPainter(doc, w, h, 1);
    drawQuote(p, Q); quoteFooters(p, Q, doc.getNumberOfPages());
    return doc.output("blob");
  }

  window.CRDocs = { loadFonts, loadPdf, renderCard, cardPNG, cardPDF, renderQuote, quotePDF, palette, CARD_SIZE: [CW, CH] };
})();
