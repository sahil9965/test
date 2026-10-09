// Roomproof PDF builder: cover + summary of issues + room-by-room checklist + photo pages
// (1, 2, 4 or 6 per page, or before/after pairs) + signatures + photo log.
// Uses jsPDF (vendored, loaded on first export). Photos are re-rendered page by page at the size
// they are printed, so the file stays small and memory stays low on phones.
(function () {
  "use strict";
  const C = window.RPCore, PH = window.RPPhoto;
  const SITE = "roomproof-app.vercel.app";
  const CREDIT_URL = "https://roomproof-app.vercel.app/?utm_source=roomproof&utm_medium=watermark&utm_campaign=referral";
  const INK = [27, 27, 31], MUTED = [100, 100, 112], LINE = [222, 219, 212], SOFT = [244, 242, 237], ACCENT = [21, 128, 61];
  const TONE = { ok: [21, 128, 61], warn: [180, 83, 9], bad: [185, 28, 28], na: [107, 114, 128] };
  const PT = 0.3528; // mm per point

  let loading;
  function loadJsPdf() {
    if (window.jspdf) return Promise.resolve(window.jspdf);
    return loading || (loading = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "/vendor/jspdf-4.2.1.umd.min.js";
      s.onload = () => (window.jspdf ? res(window.jspdf) : rej(new Error("PDF engine failed to start.")));
      s.onerror = () => { loading = null; s.remove(); rej(new Error("Couldn't load the PDF engine. Check your connection and try again.")); };
      document.head.appendChild(s);
    }));
  }

  async function build(r, blobs, onProgress = () => {}) {
    const { jsPDF } = await loadJsPdf();
    // Work on a copy with readable fallbacks for blank room and item names.
    r = { ...r, rooms: r.rooms.map(room => ({ ...room, name: (room.name || "").trim() || "Untitled room",
      items: room.items.map(it => ({ ...it, name: (it.name || "").trim() || "Untitled item" })) })) };
    const S = { paper: "a4", perPage: 2, stamp: true, checklist: true, photoLog: true, signPage: true, ...(r.settings || {}) };
    const t = C.tpl(r), sc = C.scaleOf(r), sum = C.summarize(r), num = C.numberPhotos(r);
    const { w: W, h: H } = C.pageSize(S.paper);
    const doc = new jsPDF({ unit: "mm", format: S.paper === "letter" ? "letter" : "a4", compress: true });
    const M = 14, TOP = 19, BOTTOM = H - 15, CW = W - 2 * M;
    const kinds = ["Cover"];
    const photoImgQueue = [], pills = [];
    let y = M, section = "Summary";

    // ---------- helpers ----------
    const T = s => C.pdfText(s);
    const font = (size, style = "normal", color = INK, face = "helvetica") => { doc.setFont(face, style); doc.setFontSize(size); doc.setTextColor(...color); };
    const lh = size => size * PT * 1.25;
    const wrap = (s, width) => doc.splitTextToSize(T(s), width);
    const fitLine = (s, width) => {
      let str = T(s);
      if (doc.getTextWidth(str) <= width) return str;
      while (str.length > 1 && doc.getTextWidth(str + "…") > width) str = str.slice(0, -1);
      return str.trimEnd() + "…";
    };
    const clampLines = (lines, max, width) => (lines.length <= max ? lines : [...lines.slice(0, max - 1), fitLine(lines[max - 1] + "…", width)]);
    const newPage = kind => { if (kind) section = kind; doc.addPage(); kinds.push(section); y = TOP; };
    const ensure = h => { if (y + h > BOTTOM) newPage(); };
    const lv = k => C.level(sc, k);
    const rule = (yy, color = LINE, x1 = M, x2 = W - M) => { doc.setDrawColor(...color); doc.setLineWidth(0.25); doc.line(x1, yy, x2, yy); };
    function heading(txt) {
      ensure(18);
      font(13.5, "bold");
      doc.text(T(txt), M, y + 5);
      y += 8.5;
    }
    function para(txt, size = 9.5, color = MUTED) {
      font(size, "normal", color);
      for (const line of wrap(txt, CW)) { ensure(lh(size)); doc.text(line, M, y + size * PT); y += lh(size); }
      y += 2;
    }
    // Simple table with wrapping cells, repeated header and page breaks.
    function table(cols, rows, o = {}) {
      const fs = o.fs || 8.5, pad = 1.7, l = lh(fs), headH = 6.5;
      const xs = []; let acc = M;
      const widths = cols.map(c => c.w || 0);
      const flex = CW - widths.reduce((a, b) => a + b, 0);
      const nFlex = widths.filter(w => !w).length || 1;
      cols.forEach((c, i) => { xs.push(acc); acc += widths[i] || flex / nFlex; });
      const wOf = i => (i + 1 < cols.length ? xs[i + 1] : M + CW) - xs[i];
      const head = () => {
        doc.setFillColor(...SOFT); doc.rect(M, y, CW, headH, "F");
        font(7.2, "bold", MUTED);
        cols.forEach((c, i) => doc.text(T(c.h.toUpperCase()), xs[i] + pad, y + 4.3));
        y += headH;
      };
      if (y + headH + l + 2 * pad > BOTTOM) newPage();
      head();
      for (const row of rows) {
        if (row.span) {
          const h = lh(9) + 2 * pad;
          if (y + h + l + 2 * pad > BOTTOM) { newPage(); head(); }
          font(9, "bold");
          doc.text(fitLine(row.span, CW - 2 * pad), M + pad, y + pad + 9 * PT);
          y += h; rule(y, [200, 197, 190]);
          continue;
        }
        let cells = row.cells.map((cell, i) => {
          const c = typeof cell === "object" && cell ? cell : { t: cell };
          const size = c.fs || fs;
          font(size, c.bold ? "bold" : "normal", c.color || INK, c.face || "helvetica");
          const lines = c.lines || wrap(c.t == null ? "" : String(c.t), wOf(i) - 2 * pad);
          return { ...c, size, lines: clampLines(lines, 400, wOf(i) - 2 * pad) };
        });
        const drawCells = cs => cs.forEach((c, i) => {
          font(c.size, c.bold ? "bold" : "normal", c.color || INK, c.face || "helvetica");
          c.lines.forEach((line, k) => doc.text(line, xs[i] + pad, y + pad + c.size * PT + k * lh(c.size)));
        });
        // Rows taller than the space left are split across pages (long notes are never cut).
        for (;;) {
          const h = Math.max(...cells.map(c => c.lines.length * lh(c.size))) + 2 * pad;
          if (y + h <= BOTTOM) { drawCells(cells); y += h; rule(y); break; }
          const room = BOTTOM - y - 2 * pad;
          const fits = cells.map(c => Math.floor(room / lh(c.size)));
          if (Math.min(...fits) < 3 || h <= BOTTOM - TOP - headH) { newPage(); head(); if (y + h <= BOTTOM) continue; }
          const room2 = BOTTOM - y - 2 * pad;
          const now = cells.map(c => ({ ...c, lines: c.lines.slice(0, Math.floor(room2 / lh(c.size))) }));
          drawCells(now);
          y = BOTTOM; rule(y, [235, 232, 226]);
          cells = cells.map((c, i) => ({ ...c, lines: c.lines.slice(now[i].lines.length) }));
          newPage(); head();
        }
      }
      y += 4;
    }
    const ratingCell = k => { const L = lv(k); return L ? { t: L.label, bold: true, color: TONE[L.tone] } : { t: "-", color: MUTED }; };
    const refs = it => C.photoRefs(it.photos, num);

    // ---------- cover ----------
    let top = M;
    if (r.logo) {
      try {
        const p = doc.getImageProperties(r.logo);
        const f = C.fitRect(p.width, p.height, 0, 0, 55, 20); // logo box 55 x 20 mm, top-right corner
        doc.addImage(r.logo, "PNG", W - M - f.w, M, f.w, f.h, "logo");
        top = Math.max(top, M + 22);
      } catch {}
    }
    if (r.company) {
      font(8.5, "normal", MUTED);
      const lines = clampLines(wrap(r.company, r.logo ? CW - 62 : CW), 5, r.logo ? CW - 62 : CW);
      doc.text(lines, M, M + 3);
      top = Math.max(top, M + lines.length * lh(8.5) + 2);
    }
    y = Math.max(top + 10, 34);
    doc.setFillColor(...ACCENT); doc.rect(M, y, 18, 1.5, "F");
    y += 9;
    font(22, "bold");
    for (const line of clampLines(wrap(r.title || t.title, CW), 3, CW)) { doc.text(line, M, y); y += 9; }
    if (r.property) {
      font(12, "normal", INK);
      for (const line of clampLines(wrap(r.property, CW), 4, CW)) { doc.text(line, M, y); y += lh(12); }
    }
    y += 5;
    const fields = [["Report date", C.formatDate(r.date)], [t.ref, r.ref], [t.prepared, r.preparedBy], [t.other, r.otherParty]];
    if (r.compare) fields.push(["Compared with", `${r.compare.title || "Earlier report"}${r.compare.date ? ", " + C.formatDate(r.compare.date) : ""}`]);
    const shown = fields.filter(f => String(f[1] || "").trim());
    const colW = (CW - 8) / 2;
    for (let i = 0; i < shown.length; i += 2) {
      let rowH = 0;
      shown.slice(i, i + 2).forEach(([label, val], j) => {
        const x = M + j * (colW + 8);
        font(7.2, "bold", MUTED); doc.text(T(label.toUpperCase()), x, y + 3);
        font(10.5, "normal", INK);
        const lines = clampLines(wrap(val, colW), 3, colW);
        doc.text(lines, x, y + 8);
        rowH = Math.max(rowH, 6 + lines.length * lh(10.5));
      });
      y += rowH + 3;
    }
    // Summary box
    y += 2;
    const boxH = 27;
    doc.setFillColor(...SOFT); doc.roundedRect(M, y, CW, boxH, 2.5, 2.5, "F");
    const stats = [[sum.items, "items recorded"], [sum.photos, sum.photos === 1 ? "photo" : "photos"], [sum.issues.length, sc === "punch" ? "open items" : sc === "clean" ? "need attention" : "issues noted"]];
    stats.forEach(([n, label], i) => {
      const x = M + 6 + i * (CW - 12) / 3;
      font(19, "bold", i === 2 && n ? TONE.bad : INK); doc.text(String(n), x, y + 11);
      font(8, "normal", MUTED); doc.text(label, x, y + 16);
    });
    let cx = M + 6;
    font(8, "normal", INK);
    for (const L of C.SCALES[sc].levels) {
      const n = sum.counts[L.k]; if (!n) continue;
      const label = `${L.label}: ${n}`;
      doc.setFillColor(...TONE[L.tone]); doc.circle(cx + 1.2, y + 22, 1.2, "F");
      doc.text(T(label), cx + 3.6, y + 23.1);
      cx += doc.getTextWidth(label) + 9;
    }
    if (!sum.rated) { font(8, "normal", MUTED); doc.text("No ratings recorded.", cx, y + 23.1); }
    y += boxH + 7;
    if ((r.notes || "").trim()) { heading("General notes"); para(r.notes, 9.5, INK); y += 2; }

    // ---------- summary of issues ----------
    heading(C.ISSUE_TITLE[sc] || "Summary of issues");
    if (!sum.issues.length) para(sum.rated ? "No items were marked as needing attention." : "No ratings were recorded in this report.");
    else {
      const cmp = !!r.compare;
      const cols = cmp
        ? [{ h: "Room / area", w: 34 }, { h: "Item", w: 36 }, { h: r.labels[0], w: 21 }, { h: r.labels[1], w: 21 }, { h: "Notes" }, { h: "Photos", w: 17 }]
        : [{ h: "Room / area", w: 38 }, { h: "Item", w: 40 }, { h: C.SCALES[sc].label, w: 24 }, { h: "Notes" }, { h: "Photos", w: 17 }];
      table(cols, sum.issues.map(({ room, item }) => ({
        cells: cmp
          ? [room.name, item.name, ratingCell(item.prevRating), ratingCell(item.rating), item.notes || "", refs(item)]
          : [room.name, item.name, ratingCell(item.rating), item.notes || "", refs(item)],
      })));
    }

    // ---------- checklist ----------
    if (S.checklist) {
      const rows = [];
      for (const room of r.rooms) {
        const items = room.items.filter(C.hasContent);
        if (!items.length) continue;
        rows.push({ span: room.name });
        for (const it of items) {
          const notes = [it.notes, r.compare && it.prevNotes ? `${r.labels[0]}: ${it.prevNotes}` : ""].filter(s => (s || "").trim()).join("\n");
          rows.push({ cells: r.compare ? [it.name, ratingCell(it.prevRating), ratingCell(it.rating), notes, refs(it)] : [it.name, ratingCell(it.rating), notes, refs(it)] });
        }
      }
      if (rows.length) {
        section = "Checklist";
        heading(r.compare ? "Room-by-room comparison" : "Room-by-room checklist");
        const cols = r.compare
          ? [{ h: "Item", w: 46 }, { h: r.labels[0], w: 22 }, { h: r.labels[1], w: 22 }, { h: "Notes" }, { h: "Photos", w: 17 }]
          : [{ h: "Item", w: 52 }, { h: C.SCALES[sc].label, w: 28 }, { h: "Notes" }, { h: "Photos", w: 17 }];
        table(cols, rows);
      }
    }

    // ---------- photos ----------
    const cards = [];
    for (const room of r.rooms) for (const it of room.items) {
      if (r.pair) for (const [b, a] of C.pairRows(r, it)) cards.push({ room, it, b, a });
      else for (const id of it.photos) if (r.photos[id]) cards.push({ room, it, id });
    }
    const totalPhotos = Object.keys(num).length;
    let done = 0;
    const photoImg = async (id, box) => {
      const ph = r.photos[id], blob = blobs.get(id);
      onProgress(++done, totalPhotos);
      if (!blob) return false;
      const f = C.fitRect(ph.w || 4, ph.h || 3, box.x, box.y, box.w, box.h);
      const j = await PH.renderJpeg(blob, C.targetPx(f.w, f.h), { markup: ph.markup, stamp: S.stamp ? C.formatStamp(ph.takenAt) : "" });
      doc.setFillColor(...SOFT); doc.rect(box.x, box.y, box.w, box.h, "F");
      doc.addImage(j.bytes, "JPEG", f.x, f.y, f.w, f.h, "ph" + num[id], "NONE");
      // photo number badge
      const label = String(num[id]);
      font(7.5, "bold", [255, 255, 255]);
      const bw = doc.getTextWidth(label) + 3.4;
      doc.setFillColor(20, 20, 24); doc.roundedRect(f.x + 1.5, f.y + 1.5, bw, 5, 1, 1, "F");
      doc.text(label, f.x + 1.5 + 1.7, f.y + 5);
      return true;
    };
    const takenLine = ph => `Taken ${C.formatTaken(ph.takenAt, ph.offset)} · ${C.SOURCE[ph.source] || "file date"}`;
    if (cards.length) {
      const g = C.grid(S.perPage, r.pair), gap = 6, per = g.cols * g.rows;
      const cw = (CW - gap * (g.cols - 1)) / g.cols, ch = (BOTTOM - TOP - gap * (g.rows - 1)) / g.rows;
      const small = !r.pair && S.perPage >= 4;
      const fsT = small ? 8 : 9.5, fsB = small ? 7.4 : 8.5, fsM = small ? 6.6 : 7.4;
      for (let i = 0; i < cards.length; i++) {
        const slot = i % per;
        if (slot === 0) newPage("Photos");
        const col = slot % g.cols, row = Math.floor(slot / g.cols);
        const x = M + col * (cw + gap), y0 = TOP + row * (ch + gap);
        const card = cards[i];
        const L = lv(card.it.rating);
        if (!r.pair) {
          const ph = r.photos[card.id];
          const capLines = S.perPage === 1 ? 4 : S.perPage === 6 ? 2 : 3;
          const textH = lh(fsT) + capLines * lh(fsB) + lh(fsM) + 3;
          await photoImg(card.id, { x, y: y0, w: cw, h: ch - textH });
          let ty = y0 + ch - textH + 2 + fsT * PT;
          font(fsT, "bold", L ? TONE[L.tone] : MUTED);
          const rw = L ? doc.getTextWidth(T(L.label)) + 3 : 0;
          if (L) doc.text(T(L.label), x + cw, ty, { align: "right" });
          font(fsT, "bold", INK);
          doc.text(fitLine(`Photo ${num[card.id]} · ${card.room.name} › ${card.it.name}`, cw - rw), x, ty);
          ty += lh(fsT);
          const cap = (ph.caption || "").trim() || (card.it.photos.filter(id => r.photos[id])[0] === card.id ? (card.it.notes || "").trim() : "");
          font(fsB, "normal", INK);
          const lines = cap ? clampLines(wrap(cap, cw), capLines, cw) : [];
          lines.forEach((line, k) => doc.text(line, x, ty + k * lh(fsB)));
          ty += Math.max(1, lines.length) * lh(fsB) + (lines.length ? 0.5 : -lh(fsB) + 0.5);
          font(fsM, "normal", MUTED);
          doc.text(fitLine(takenLine(ph), cw), x, ty);
        } else {
          // before/after pair
          const titleH = lh(9.5) + 1.5, metaH = lh(7.4) * 3 + 2, gapX = 4;
          const bw = (cw - gapX) / 2, bh = ch - titleH - metaH;
          font(9.5, "bold", L ? TONE[L.tone] : MUTED);
          let status = L ? L.label : "";
          if (r.compare) { const P = lv(card.it.prevRating); status = `${r.labels[0]}: ${P ? P.label : "-"}  ›  ${r.labels[1]}: ${L ? L.label : "-"}`; font(8.5, "bold", L ? TONE[L.tone] : MUTED); }
          const sw = status ? doc.getTextWidth(T(status)) + 3 : 0;
          if (status) doc.text(T(status), x + cw, y0 + 9.5 * PT, { align: "right" });
          font(9.5, "bold", INK);
          doc.text(fitLine(`${card.room.name} › ${card.it.name}`, cw - sw), x, y0 + 9.5 * PT);
          [card.b, card.a].forEach((id, k) => {
            const bx = x + k * (bw + gapX), by = y0 + titleH;
            if (id) photoImgQueue.push({ id, box: { x: bx, y: by, w: bw, h: bh } });
            else {
              doc.setDrawColor(...LINE); doc.setLineDashPattern([1.5, 1.2], 0); doc.setLineWidth(0.3);
              doc.rect(bx, by, bw, bh); doc.setLineDashPattern([], 0);
              font(8.5, "normal", MUTED); doc.text(`No ${r.labels[k].toLowerCase()} photo`, bx + bw / 2, by + bh / 2, { align: "center" });
            }
            // side label pill
            const lab = T(r.labels[k]);
            font(7.5, "bold", [255, 255, 255]);
            const lw2 = doc.getTextWidth(lab.toUpperCase()) + 4;
            pills.push({ x: bx + bw - lw2 - 1.5, y: by + 1.5, w: lw2, text: lab.toUpperCase(), k });
            let ty = by + bh + 1.6 + 7.4 * PT;
            if (id) {
              const ph = r.photos[id];
              font(7.4, "bold", INK); doc.text(fitLine(`Photo ${num[id]}${ph.caption ? " · " + ph.caption : ""}`, bw), bx, ty);
              font(7.4, "normal", MUTED); doc.text(fitLine(takenLine(ph), bw), bx, ty + lh(7.4));
            }
            if (k === 1 && card.it.notes && card.b === C.pairRows(r, card.it)[0][0] && card.a === C.pairRows(r, card.it)[0][1]) {
              font(7.4, "normal", INK); doc.text(fitLine(`Notes: ${card.it.notes}`, cw), x, ty + 2 * lh(7.4));
            }
          });
          for (const q of photoImgQueue.splice(0)) await photoImg(q.id, q.box);
          for (const p of pills.splice(0)) {
            doc.setFillColor(...(p.k ? ACCENT : [55, 65, 81])); doc.roundedRect(p.x, p.y, p.w, 5, 1, 1, "F");
            font(7.5, "bold", [255, 255, 255]); doc.text(p.text, p.x + 2, p.y + 3.6);
          }
        }
      }
    }

    // ---------- signatures ----------
    const sigs = (r.signatures || []).filter(s => s && (s.role || s.name || s.img));
    if (S.signPage && sigs.length) {
      newPage("Signatures");
      heading("Signatures");
      para(`By signing, each person confirms they have reviewed this report${sum.photos ? `, including its ${sum.photos} photo${sum.photos === 1 ? "" : "s"},` : ""} and that it records the condition on the date shown, except where noted.`, 9.5, INK);
      y += 4;
      const bw = (CW - 10) / 2, bh = 50;
      sigs.slice(0, 4).forEach((s, i) => {
        const col = i % 2;
        if (col === 0 && i > 0) y += bh + 8;
        if (col === 0) ensure(bh);
        const x = M + col * (bw + 10);
        font(7.2, "bold", MUTED); doc.text(T((s.role || "Signature").toUpperCase()), x, y + 3);
        if (s.img) {
          try { const p = doc.getImageProperties(s.img); const f = C.fitRect(p.width, p.height, 0, 0, bw, 24); doc.addImage(s.img, "PNG", x, y + 5 + (24 - f.h) / 2, f.w, f.h, "sig" + i); } catch {}
        }
        rule(y + 30, [120, 120, 130], x, x + bw);
        font(9.5, "normal", INK);
        doc.text(fitLine(`Name: ${s.name || ""}`, bw), x, y + 36);
        doc.text(`Date: ${s.date ? C.formatDate(s.date) : ""}`, x, y + 42);
      });
      y += bh + 6;
    }

    // ---------- photo log ----------
    if (S.photoLog && totalPhotos) {
      newPage("Photo log");
      heading("Appendix: photo log");
      para("Times come from each photo's camera data (EXIF) where the file has it, otherwise from the file's date, unless entered manually. The fingerprint is the SHA-256 hash of each photo file as it was added; anyone holding that original file can recompute it to confirm it is the same file.", 8.5);
      const order = Object.keys(num).sort((a, b) => num[a] - num[b]);
      const where = {};
      for (const room of r.rooms) for (const it of room.items) for (const id of it.photos) where[id] = `${room.name} › ${it.name}`;
      table([{ h: "#", w: 9 }, { h: "Room / item", w: 46 }, { h: "Taken", w: 42 }, { h: "File" }, { h: "SHA-256 fingerprint", w: 46 }],
        order.map(id => {
          const ph = r.photos[id];
          const hash = ph.sha256 ? [ph.sha256.slice(0, 32), ph.sha256.slice(32)] : ["not available"];
          return { cells: [String(num[id]), (r.pair ? `[${r.labels[ph.phase === "before" ? 0 : 1]}] ` : "") + (where[id] || ""), `${C.formatTaken(ph.takenAt, ph.offset, true)}\n${C.SOURCE[ph.source] || ""}`, `${ph.origName || ""}${ph.origSize ? `\n${(ph.origSize / 1024 / 1024).toFixed(2)} MB` : ""}`, { lines: hash, face: "courier", fs: 6.6 }] };
        }), { fs: 7.6 });
    }

    // ---------- header + footer on every page ----------
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      doc.setPage(p);
      if (p > 1) {
        font(7.6, "normal", MUTED);
        const right = `${kinds[p - 1] || ""}${r.date ? " · " + C.formatDate(r.date) : ""}`;
        doc.text(T(right), W - M, 10, { align: "right" });
        doc.text(fitLine([r.title || t.title, r.property].filter(Boolean).join(" · "), CW - doc.getTextWidth(T(right)) - 6), M, 10);
        rule(12.5);
      }
      rule(H - 11);
      font(7.6, "normal", MUTED);
      doc.text("Made with ", M, H - 7);
      let fx = M + doc.getTextWidth("Made with ");
      font(7.6, "bold", ACCENT);
      doc.textWithLink("Roomproof", fx, H - 7, { url: CREDIT_URL });
      fx += doc.getTextWidth("Roomproof");
      font(7.6, "normal", MUTED);
      doc.text(` · ${SITE} · free photo report generator`, fx, H - 7);
      doc.text(`Page ${p} of ${n}`, W - M, H - 7, { align: "right" });
    }
    doc.setProperties({
      title: T(r.title || t.title), subject: T([t.name, r.property].filter(Boolean).join(" - ")),
      author: T(r.preparedBy || ""), creator: "Roomproof (roomproof-app.vercel.app)", keywords: "photo report",
    });
    const blob = doc.output("blob");
    return { blob, pages: n, name: `${C.safeName(r.title || t.title)}-${r.date || C.todayIso()}.pdf` };
  }
  window.RPPdf = { build, loadJsPdf, CREDIT_URL };
})();
