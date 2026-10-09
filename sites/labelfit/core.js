// LabelFit core: finds labels on a rendered page bitmap, works out output geometry, and builds
// small files (ZIP, PNG/JPEG metadata). Pure functions with no DOM access, shared by app.js and
// the tests. Page coordinates are PDF points (1/72 in) with a top-left origin, as the page is
// displayed (after its /Rotate). Grid coordinates are cells of a coarse ink mask.
(function (root) {
  "use strict";
  const MM = 72 / 25.4; // points per millimetre
  const mm = v => v * MM;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // Output sizes. h: 0 means continuous roll (length follows the label).
  const SIZES = {
    "4x6": { name: "4 × 6 in", w: 288, h: 432 },
    "100x150": { name: "100 × 150 mm", w: mm(100), h: mm(150) },
    "a6": { name: "A6 · 105 × 148 mm", w: mm(105), h: mm(148) },
    "4x4": { name: "4 × 4 in", w: 288, h: 288 },
    "57": { name: "57 mm roll", w: mm(57), h: 0 },
    "62": { name: "62 mm roll", w: mm(62), h: 0 },
    "letter2": { name: "Letter, 2 per sheet", w: 612, h: 792, slots: 2 },
    "a42": { name: "A4, 2 per sheet", w: mm(210), h: mm(297), slots: 2 },
  };

  function sheetSpec(key, custom) {
    if (key === "custom") {
      const w = mm(clamp(+custom?.w || 100, 20, 600));
      const h = +custom?.h > 0 ? mm(clamp(+custom.h, 20, 2000)) : 0;
      return { key, w, h, slots: 1 };
    }
    const s = SIZES[key] || SIZES["4x6"];
    return { key, w: s.w, h: s.h, slots: s.slots || 1 };
  }
  function slotRects(spec) {
    if (spec.slots === 2) { const h = spec.h / 2; return [{ x: 0, y: 0, w: spec.w, h }, { x: 0, y: h, w: spec.w, h }]; }
    return [{ x: 0, y: 0, w: spec.w, h: spec.h }];
  }

  // Place a bw x bh block (points, as displayed) into a slot. rot is the extra clockwise rotation
  // ("auto" picks 0 or 90 for the biggest print). mode "fit" scales to the printable area,
  // "actual" keeps 100%. footer reserves space at the bottom (credit line on packing slips).
  function fit(bw, bh, slot, o = {}) {
    const m = o.margin || 0, foot = o.footer || 0;
    const roll = !slot.h;
    const aw = Math.max(1, slot.w - 2 * m);
    const ah = roll ? Infinity : Math.max(1, slot.h - 2 * m - foot);
    const dims = r => (r % 180 ? [bh, bw] : [bw, bh]);
    const scaleFor = r => { const [vw, vh] = dims(r); return Math.min(aw / vw, ah / vh); };
    let rot;
    if (o.rot === "auto" || o.rot == null) rot = roll ? (bw > bh ? 90 : 0) : (scaleFor(90) > scaleFor(0) * 1.02 ? 90 : 0);
    else rot = ((Math.round(+o.rot / 90) * 90) % 360 + 360) % 360;
    const [vw, vh] = dims(rot);
    const s = o.mode === "actual" ? 1 : Math.min(aw / vw, ah / vh);
    const w = vw * s, h = vh * s;
    const sheetH = roll ? h + 2 * m + foot : slot.h;
    const x = (slot.x || 0) + (slot.w - w) / 2;
    const y = (slot.y || 0) + m + (sheetH - 2 * m - foot - h) / 2;
    const clipped = w > aw + 0.5 || (!roll && h > ah + 0.5);
    return { rot, s, x, y, w, h, sheetH, clipped };
  }

  // Lay jobs ([{bw, bh, rot, footer}]) out on sheets. Returns [{w, h, items:[{job, ...fit}]}].
  function layoutSheets(jobs, spec, o) {
    const sheets = [];
    const slots = slotRects(spec);
    jobs.forEach((job, i) => {
      const si = i % slots.length;
      if (si === 0) sheets.push({ w: spec.w, h: spec.h, items: [] });
      const sheet = sheets[sheets.length - 1];
      const f = fit(job.bw, job.bh, slots[si], { ...o, rot: job.rot, footer: job.footer || 0 });
      if (!spec.h) sheet.h = f.sheetH;
      sheet.items.push({ job, ...f });
    });
    return sheets;
  }

  // ---------- Ink grid ----------
  // rgba: bitmap of the page rendered on white (w x h px). cell: pixels per grid cell.
  function buildGrid(rgba, w, h, cell) {
    const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell), n = gw * gh;
    const hist = new Uint32Array(256);
    for (let i = 0, N = w * h; i < N; i += 5) { const p = i * 4; hist[(rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8]++; }
    let tot = 0, half = 0; for (let i = 0; i < 256; i++) tot += hist[i];
    let bg = 255; for (let i = 0; i < 256; i++) { half += hist[i]; if (half >= tot * 0.5) { bg = i; break; } }
    const tInk = Math.min(200, bg - 40), tDark = Math.min(128, bg - 100);
    const inkC = new Uint16Array(n), darkC = new Uint16Array(n), all = new Uint16Array(n);
    const colCell = new Int32Array(w); for (let x = 0; x < w; x++) colCell[x] = (x / cell) | 0;
    for (let y = 0; y < h; y++) {
      const row = ((y / cell) | 0) * gw; let p = y * w * 4;
      for (let x = 0; x < w; x++, p += 4) {
        const c = row + colCell[x]; all[c]++;
        const L = (rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8;
        if (L < tInk) { inkC[c]++; if (L < tDark) darkC[c]++; }
      }
    }
    const ink = new Uint8Array(n), cov = new Uint8Array(n);
    for (let i = 0; i < n; i++) { ink[i] = inkC[i] >= 2 ? 1 : 0; cov[i] = all[i] ? Math.round(255 * darkC[i] / all[i]) : 0; }
    return { gw, gh, ink, cov };
  }

  // Thin dashed/dotted cut lines (any length over 30% of the page) and solid fold lines that run
  // across most of the page are separators, not content. Lines with content right next to them
  // (text, barcodes, label frames hugging their content) are left alone.
  function findSeparators(g, cellMm) {
    const { gw, gh, ink } = g;
    const sep = new Uint8Array(gw * gh);
    const c = v => Math.max(1, Math.round(v / cellMm));
    const dashMax = c(7), gapMax = c(6), k = c(2.5);
    for (const horiz of [true, false]) {
      const lines = horiz ? gh : gw, len = horiz ? gw : gh;
      const at = horiz ? (l, p) => ink[l * gw + p] : (l, p) => ink[p * gw + l];
      const set = horiz ? (l, p) => { sep[l * gw + p] = 1; } : (l, p) => { sep[p * gw + l] = 1; };
      const minDashSpan = Math.max(c(40), Math.round(len * 0.3));
      const minSolid = Math.round(len * 0.8);
      for (let L = 0; L < lines; L++) {
        const runs = [];
        for (let p = 0; p < len; p++) {
          if (!at(L, p)) continue;
          const s = p; while (p < len && at(L, p)) p++;
          runs.push([s, p]);
        }
        if (!runs.length) continue;
        const cands = [];
        for (const r of runs) if (r[1] - r[0] >= minSolid) cands.push(r);
        let gs = -1, cnt = 0, prevEnd = -1e9;
        const flush = end => { if (cnt >= 5 && end - gs >= minDashSpan) cands.push([gs, end]); };
        for (const [s, e] of runs) {
          if (e - s <= dashMax && s - prevEnd <= gapMax && gs >= 0) { cnt++; prevEnd = e; continue; }
          if (gs >= 0) flush(prevEnd);
          if (e - s <= dashMax) { gs = s; cnt = 1; prevEnd = e; } else { gs = -1; cnt = 0; prevEnd = -1e9; }
        }
        if (gs >= 0) flush(prevEnd);
        for (const [a, b] of cands) {
          let near = 0, area = 0;
          for (let d = 2; d <= k; d++) for (const l of [L - d, L + d]) {
            if (l < 0 || l >= lines) continue;
            for (let p = a; p < b; p++) near += at(l, p);
            area += b - a;
          }
          if (!area || near / area >= 0.06) continue;
          // A separator has content on both sides; a line with nothing beyond it is a border.
          let before = 0, after = 0;
          for (let l = 0; l < lines && (before < 20 || after < 20); l++) {
            if (Math.abs(l - L) <= k) continue;
            let s = 0; for (let p = a; p < b; p += 2) s += at(l, p);
            if (l < L) before += s; else after += s;
          }
          if (before >= 20 && after >= 20) for (let l = L - 1; l <= L + 1; l++) {
            if (l < 0 || l >= lines) continue;
            for (let p = a; p < b; p++) if (at(l, p)) set(l, p);
          }
        }
      }
    }
    return sep;
  }

  // Connected groups of ink after closing gaps smaller than 2*r cells. rect limits the search.
  function segment(mask, gw, gh, r, rect = { x0: 0, y0: 0, x1: gw, y1: gh }) {
    const W = rect.x1 - rect.x0, H = rect.y1 - rect.y0, N = W * H;
    const tmp = new Uint8Array(N), dil = new Uint8Array(N), pre = new Int32Array(Math.max(W, H) + 1);
    for (let y = 0; y < H; y++) {
      const off = (y + rect.y0) * gw + rect.x0;
      for (let x = 0; x < W; x++) pre[x + 1] = pre[x] + mask[off + x];
      for (let x = 0; x < W; x++) tmp[y * W + x] = pre[Math.min(W, x + r + 1)] - pre[Math.max(0, x - r)] > 0 ? 1 : 0;
    }
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) pre[y + 1] = pre[y] + tmp[y * W + x];
      for (let y = 0; y < H; y++) dil[y * W + x] = pre[Math.min(H, y + r + 1)] - pre[Math.max(0, y - r)] > 0 ? 1 : 0;
    }
    const lab = new Int32Array(N), stack = new Int32Array(N);
    let n = 0;
    for (let i = 0; i < N; i++) {
      if (!dil[i] || lab[i]) continue;
      n++; let sp = 0; stack[sp++] = i; lab[i] = n;
      while (sp) {
        const j = stack[--sp], x = j % W, y = (j / W) | 0;
        if (x > 0 && dil[j - 1] && !lab[j - 1]) { lab[j - 1] = n; stack[sp++] = j - 1; }
        if (x < W - 1 && dil[j + 1] && !lab[j + 1]) { lab[j + 1] = n; stack[sp++] = j + 1; }
        if (y > 0 && dil[j - W] && !lab[j - W]) { lab[j - W] = n; stack[sp++] = j - W; }
        if (y < H - 1 && dil[j + W] && !lab[j + W]) { lab[j + W] = n; stack[sp++] = j + W; }
      }
    }
    const blocks = Array.from({ length: n }, () => ({ x0: 1e9, y0: 1e9, x1: -1, y1: -1, ink: 0 }));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, l = lab[i];
      if (!l || !mask[(y + rect.y0) * gw + x + rect.x0]) continue;
      const b = blocks[l - 1];
      const gx = x + rect.x0, gy = y + rect.y0;
      if (gx < b.x0) b.x0 = gx; if (gy < b.y0) b.y0 = gy;
      if (gx + 1 > b.x1) b.x1 = gx + 1; if (gy + 1 > b.y1) b.y1 = gy + 1;
      b.ink++;
    }
    return blocks.filter(b => b.ink > 0);
  }

  function integral(g) {
    const { gw, gh, cov } = g, I = new Float64Array((gw + 1) * (gh + 1));
    for (let y = 0; y < gh; y++) {
      let s = 0;
      for (let x = 0; x < gw; x++) { s += cov[y * gw + x]; I[(y + 1) * (gw + 1) + x + 1] = I[y * (gw + 1) + x + 1] + s; }
    }
    return I;
  }

  // Detect content blocks on one page. g: grid from buildGrid. o: {cellMm, ptPerCell}.
  function analyze(g, o) {
    const { gw, gh, ink, cov } = g, cellMm = o.cellMm;
    const c = v => Math.max(1, Math.round(v / cellMm));
    const sep = findSeparators(g, cellMm);
    const nl = new Uint8Array(gw * gh);
    for (let i = 0; i < nl.length; i++) nl[i] = ink[i] && !sep[i] ? 1 : 0;
    const I = integral(g), IW = gw + 1;
    const winMean = (x0, y0, x1, y1) => {
      x0 = clamp(x0, 0, gw); x1 = clamp(x1, 0, gw); y0 = clamp(y0, 0, gh); y1 = clamp(y1, 0, gh);
      const a = (x1 - x0) * (y1 - y0); if (!a) return 0;
      return (I[y1 * IW + x1] - I[y0 * IW + x1] - I[y1 * IW + x0] + I[y0 * IW + x0]) / a;
    };
    const w2 = c(2);
    const measure = b => {
      let dense = 0;
      for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) {
        if (!nl[y * gw + x]) continue;
        if (winMean(x - (w2 >> 1), y - (w2 >> 1), x + w2 - (w2 >> 1), y + w2 - (w2 >> 1)) >= 90) dense++;
      }
      b.wMm = (b.x1 - b.x0) * cellMm; b.hMm = (b.y1 - b.y0) * cellMm;
      b.areaMm = b.wMm * b.hMm; b.denseMm = dense * cellMm * cellMm;
      return b;
    };
    const oversized = b => { const L = Math.max(b.wMm, b.hMm), S = Math.min(b.wMm, b.hMm); return L > 160 || S > 112; };
    // Tight box around the ink inside a rectangle of cells.
    const tight = r => {
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
      for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) if (nl[y * gw + x]) {
        n++; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x + 1 > x1) x1 = x + 1; if (y + 1 > y1) y1 = y + 1;
      }
      return n ? { x0, y0, x1, y1, ink: n } : null;
    };
    // Split an oversized block along its widest clear gutter (whitespace running all the way
    // across it), e.g. a label and a packing slip side by side, or 2-4 labels on one sheet.
    const xyCut = b => {
      const minG = c(3), minPart = c(35);
      let best = null;
      for (const vert of [true, false]) {
        const n = vert ? b.x1 - b.x0 : b.y1 - b.y0, prof = new Int32Array(n);
        for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) if (nl[y * gw + x]) prof[vert ? x - b.x0 : y - b.y0]++;
        for (let i = 0; i < n; i++) {
          if (prof[i]) continue;
          const s = i; while (i < n && !prof[i]) i++;
          if (s === 0 || i >= n || i - s < minG || (best && i - s <= best.gap)) continue;
          const A = tight(vert ? { x0: b.x0, x1: b.x0 + s, y0: b.y0, y1: b.y1 } : { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y0 + s });
          const B = tight(vert ? { x0: b.x0 + i, x1: b.x1, y0: b.y0, y1: b.y1 } : { x0: b.x0, x1: b.x1, y0: b.y0 + i, y1: b.y1 });
          if (!A || !B) continue;
          const span = r => vert ? r.x1 - r.x0 : r.y1 - r.y0;
          if (span(A) >= minPart && span(B) >= minPart) best = { gap: i - s, parts: [A, B] };
        }
      }
      return best && best.parts.map(measure);
    };
    const split = (b, levels) => {
      if (!oversized(b)) return [b];
      const cut = xyCut(b);
      if (cut) return cut.flatMap(p => split(p, levels));
      if (!levels.length) return [b];
      const subs = segment(nl, gw, gh, c(levels[0]), b).map(measure).filter(s => s.areaMm >= 150);
      const big = subs.filter(s => Math.min(s.wMm, s.hMm) >= 45);
      if (big.length < 2) return split(b, levels.slice(1));
      return subs.flatMap(s => split(s, levels.slice(1)));
    };
    // Blocks sitting inside another block's box (a barcode inside a label frame) belong to it.
    const absorb = list => {
      list.sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0));
      const out = [];
      for (const b of list) {
        const area = (b.x1 - b.x0) * (b.y1 - b.y0);
        const host = out.find(o => {
          const ix = Math.min(o.x1, b.x1) - Math.max(o.x0, b.x0), iy = Math.min(o.y1, b.y1) - Math.max(o.y0, b.y0);
          return ix > 0 && iy > 0 && ix * iy >= 0.85 * area;
        });
        if (host) { host.x0 = Math.min(host.x0, b.x0); host.y0 = Math.min(host.y0, b.y0); host.x1 = Math.max(host.x1, b.x1); host.y1 = Math.max(host.y1, b.y1); host.ink += b.ink; }
        else out.push(b);
      }
      return out;
    };
    let blocks = absorb(segment(nl, gw, gh, c(4))).map(measure).flatMap(b => split(b, [2, 1.2]));
    blocks = absorb(blocks).map(measure);
    blocks = blocks.filter(b => b.areaMm >= 150 && b.ink >= 12);
    // Grow each block by up to 1.5 mm of clear paper so nothing sits flush against the cut.
    const clear = (x0, y0, x1, y1) => {
      if (x0 < 0 || y0 < 0 || x1 > gw || y1 > gh) return false;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (ink[y * gw + x]) return false;
      return true;
    };
    const pad = c(1.5);
    for (const b of blocks) {
      for (let i = 0; i < pad && clear(b.x0, b.y0 - 1, b.x1, b.y0); i++) b.y0--;
      for (let i = 0; i < pad && clear(b.x0, b.y1, b.x1, b.y1 + 1); i++) b.y1++;
      for (let i = 0; i < pad && clear(b.x0 - 1, b.y0, b.x0, b.y1); i++) b.x0--;
      for (let i = 0; i < pad && clear(b.x1, b.y0, b.x1 + 1, b.y1); i++) b.x1++;
      const p = o.ptPerCell;
      b.x = b.x0 * p; b.y = b.y0 * p; b.w = (b.x1 - b.x0) * p; b.h = (b.y1 - b.y0) * p;
      if (o.pageW) b.w = Math.min(b.w, o.pageW - b.x);
      if (o.pageH) b.h = Math.min(b.h, o.pageH - b.y);
    }
    return { blocks, sep };
  }

  const RX = {
    customs: /\bCN\s?2[23]\b|customs declaration|d[ée]claration en douane|zollinhaltserkl|\bcustoms\b|commercial invoice/i,
    slip: /packing (slip|list)|despatch note|dispatch note|delivery note|order (summary|details|no\b|number|#|id\b)|\bqty\b|quantity|subtotal|thank you|\binvoice\b|receipt|label record/i,
    instr: /instructions?\b|fold (the|this|along|here|in half)|cut (along|here|on|out)|dotted line|dashed line|scissors|\btape\b|affix|attach (the|this|your|it)\b|stick (the|this|your|it)\b|drop[- ]?off|print (this|the|your) label|place (the|this|your) label/i,
    label: /tracking|ship\s?to|deliver\s?to|\bpostage\b|\bto:|\bfrom:|return address|\bsender\b|recipient|postcode|zip\s?code|priority mail|ground advantage|first[- ]class|tracked|signed for|\bevri\b|royal mail|inpost|\bdpd\b|\busps\b|\bups\b|fedex|\bdhl\b|yodel|hermes|parcelforce|mondial relay|colissimo|\bgls\b/i,
  };

  const gapMm = (a, b) => Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1), Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));

  // Decide what each block is: label, slip (packing slip or other large content), customs,
  // instructions or small. b.text holds the PDF text found inside the block (may be empty).
  function classify(blocks, o = {}) {
    const cellMm = o.cellMm || 0.5;
    const maxDense = blocks.reduce((m, b) => Math.max(m, b.denseMm), 0);
    for (const b of blocks) {
      const t = b.text || "";
      const n = k => (t.match(new RegExp(RX[k].source, "gi")) || []).length;
      const labelT = n("label") > 0, cust = n("customs") > 0;
      const slipN = n("slip"), instrN = n("instr");
      const instr = instrN > 0 && instrN >= slipN, slip = slipN > 0 && !instr;
      // A label has a fair amount of barcode-like solid ink (1D/2D codes, black header bars).
      const strong = b.denseMm >= Math.max(150, 0.3 * maxDense) && b.areaMm >= 1200 && Math.min(b.wMm, b.hMm) >= 25;
      const top = strong && b.denseMm >= 0.6 * maxDense;
      let kind;
      if (cust && !(labelT && top)) kind = "customs";
      else if (strong && (labelT || top || !(slip || instr))) kind = "label";
      else if (slip && b.areaMm >= 600) kind = "slip";
      else if (instr) kind = "instructions";
      else if (b.areaMm >= 2500 && Math.min(b.wMm, b.hMm) >= 30) kind = "slip";
      else kind = "small";
      b.kind = kind; b.textKind = cust ? "customs" : slip ? "slip" : instr ? "instructions" : labelT ? "label" : "";
    }
    if (!blocks.some(b => b.kind === "label")) {
      const cand = blocks.filter(b => b.kind !== "customs" && b.kind !== "instructions")
        .sort((a, b) => (b.denseMm + 0.02 * b.areaMm) - (a.denseMm + 0.02 * a.areaMm))[0];
      // Only guess on single-page files; in a multi-page file a page without barcodes is usually
      // an instructions or receipt page.
      if (cand && o.single) { cand.kind = "label"; cand.guess = true; }
    }
    // Pull small fragments (a return address, a lone barcode) into a nearby label when the result
    // still has the size of a shipping label.
    const labels = blocks.filter(b => b.kind === "label");
    for (const L of labels) {
      const L0 = Math.max(L.wMm, L.hMm), S0 = Math.min(L.wMm, L.hMm);
      for (const b of blocks) {
        if (b.kind !== "small" || b.merged || b.textKind) continue;
        if (gapMm(L, b) * cellMm > 10) continue;
        const u = { x0: Math.min(L.x0, b.x0), y0: Math.min(L.y0, b.y0), x1: Math.max(L.x1, b.x1), y1: Math.max(L.y1, b.y1) };
        const uw = (u.x1 - u.x0) * cellMm, uh = (u.y1 - u.y0) * cellMm;
        if (Math.max(uw, uh) > Math.max(160, L0 * 1.1) || Math.min(uw, uh) > Math.max(112, S0 * 1.1)) continue;
        if (labels.some(o2 => o2 !== L && !(u.x1 <= o2.x0 || o2.x1 <= u.x0 || u.y1 <= o2.y0 || o2.y1 <= u.y0))) continue;
        const p = o.ptPerCell || 1;
        Object.assign(L, u, { x: u.x0 * p, y: u.y0 * p, w: (u.x1 - u.x0) * p, h: (u.y1 - u.y0) * p, wMm: uw, hMm: uh, areaMm: uw * uh });
        L.denseMm += b.denseMm; L.text = (L.text || "") + " " + (b.text || "");
        b.merged = true;
      }
    }
    return blocks.filter(b => !b.merged);
  }

  // Top-to-bottom rows, left-to-right inside a row (rows are blocks whose tops are within tol).
  function readingOrder(blocks, tol) {
    const s = blocks.slice().sort((a, b) => a.y - b.y), out = [];
    let row = [], top = -1e9;
    for (const b of s) {
      if (row.length && b.y - top > tol) { out.push(...row.sort((a, c) => a.x - c.x)); row = []; }
      if (!row.length) top = b.y;
      row.push(b);
    }
    return out.concat(row.sort((a, c) => a.x - c.x));
  }

  // Sides of a crop rect (points) where content runs across the edge (ink just inside and just
  // outside, ignoring cut lines). Used for the "nothing cut off" check.
  function cutSides(g, sep, rect, ptPerCell) {
    const { gw, gh, ink } = g;
    const at = (x, y) => x >= 0 && y >= 0 && x < gw && y < gh && ink[y * gw + x] && !(sep && sep[y * gw + x]);
    const x0 = Math.round(rect.x / ptPerCell), y0 = Math.round(rect.y / ptPerCell);
    const x1 = Math.round((rect.x + rect.w) / ptPerCell), y1 = Math.round((rect.y + rect.h) / ptPerCell);
    const out = [];
    const count = (fn, a, b) => { let n = 0; for (let i = a; i < b; i++) if (fn(i)) n++; return n; };
    if (count(x => at(x, y0) && at(x, y0 - 1), x0, x1) >= 2) out.push("top");
    if (count(x => at(x, y1 - 1) && at(x, y1), x0, x1) >= 2) out.push("bottom");
    if (count(y => at(x0, y) && at(x0 - 1, y), y0, y1) >= 2) out.push("left");
    if (count(y => at(x1 - 1, y) && at(x1, y), y0, y1) >= 2) out.push("right");
    return out;
  }

  // ---------- Files ----------
  const CRC_T = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8, start = 0, end = u8.length) {
    let c = 0xffffffff;
    for (let i = start; i < end; i++) c = CRC_T[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  // Minimal ZIP writer (stored, no compression: PNGs are already compressed).
  function zip(files, comment = "", date = new Date()) {
    const enc = new TextEncoder();
    const dosT = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
    const dosD = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    const parts = [], central = [];
    let off = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = f.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dosT, true); h.setUint16(12, dosD, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true); c.setUint16(12, dosT, true); c.setUint16(14, dosD, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
      c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    }
    const cm = enc.encode(comment);
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cdSize, true); e.setUint32(16, off, true); e.setUint16(20, cm.length, true);
    return concat([...parts, ...central, new Uint8Array(e.buffer), cm]);
  }
  function concat(arrs) {
    const out = new Uint8Array(arrs.reduce((s, a) => s + a.length, 0));
    let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; }
    return out;
  }

  // Add physical size (pHYs, so printer apps know the DPI) and a Software text chunk to a PNG.
  function pngMeta(png, dpi, software) {
    const be = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    const chunk = (type, data) => {
      const body = concat([new TextEncoder().encode(type), data]);
      return concat([new Uint8Array(be(data.length)), body, new Uint8Array(be(crc32(body)))]);
    };
    const ppm = Math.round(dpi / 0.0254);
    const phys = chunk("pHYs", new Uint8Array([...be(ppm), ...be(ppm), 1]));
    const text = chunk("tEXt", new TextEncoder().encode("Software\0" + software));
    const parts = [png.subarray(0, 8)];
    let p = 8;
    while (p + 8 <= png.length) {
      const len = ((png[p] << 24) | (png[p + 1] << 16) | (png[p + 2] << 8) | png[p + 3]) >>> 0;
      const type = String.fromCharCode(png[p + 4], png[p + 5], png[p + 6], png[p + 7]);
      const end = p + 12 + len;
      if (type !== "pHYs") parts.push(png.subarray(p, end));
      if (type === "IHDR") parts.push(phys, text);
      p = end;
      if (type === "IEND") break;
    }
    return concat(parts);
  }
  // Set the JFIF density of a canvas JPEG to the real DPI.
  function jpegDpi(jpg, dpi) {
    if (jpg[0] === 0xff && jpg[1] === 0xd8 && jpg[2] === 0xff && jpg[3] === 0xe0 && String.fromCharCode(jpg[6], jpg[7], jpg[8], jpg[9]) === "JFIF") {
      jpg[13] = 1; jpg[14] = dpi >> 8; jpg[15] = dpi & 255; jpg[16] = dpi >> 8; jpg[17] = dpi & 255;
    }
    return jpg;
  }
  // Threshold an RGBA buffer to pure black and white (crisper barcodes on thermal printers).
  function toBW(rgba, threshold = 165) {
    for (let p = 0; p < rgba.length; p += 4) {
      const v = ((rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8) < threshold ? 0 : 255;
      rgba[p] = rgba[p + 1] = rgba[p + 2] = v; rgba[p + 3] = 255;
    }
    return rgba;
  }

  root.LabelCore = { MM, mm, SIZES, sheetSpec, slotRects, fit, layoutSheets, buildGrid, findSeparators, segment, analyze, classify, readingOrder, cutSides, crc32, zip, pngMeta, jpegDpi, toBW, RX };
})(typeof window !== "undefined" ? window : globalThis);
