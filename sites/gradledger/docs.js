/* GradLedger documents: lays out transcripts, report cards, course descriptions and hours logs
   once (in PDF points) and renders the same layout to a PDF (jsPDF, vendored) or to SVG for
   the on-screen preview. Loaded on demand by app.js. */
(function () {
  "use strict";
  const E = window.GLEngine;
  const PAPER = { letter: [612, 792], a4: [595.28, 841.89] };
  const REF = "https://transcript.roohsites.com/?utm_source=gradledger&utm_medium=watermark&utm_campaign=referral";
  const CREDIT = "Prepared with GradLedger · transcript.roohsites.com";
  const JSPDF_SRC = "/vendor/jspdf-4.2.1.umd.min.js";

  let ready = null, mdoc = null;
  function load() {
    if (ready) return ready;
    ready = new Promise((res, rej) => {
      if (window.jspdf) return res();
      const s = document.createElement("script");
      s.src = JSPDF_SRC; s.async = true;
      s.onload = () => res(); s.onerror = () => { ready = null; rej(new Error("Couldn't load the PDF library. Check your connection and try again.")); };
      document.head.appendChild(s);
    }).then(() => { mdoc = new window.jspdf.jsPDF({ unit: "pt", format: "letter" }); });
    return ready;
  }

  // ---- Text helpers -------------------------------------------------------------------------
  // The PDF uses the built-in Helvetica/Times fonts (WinAnsi). Other characters are transliterated.
  const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  const MAP = { "ł": "l", "Ł": "L", "đ": "d", "Đ": "D", "ı": "i", "ħ": "h", "ŀ": "l", "‐": "-", "‑": "-", "‒": "-", "−": "-", "′": "'", "″": '"', "→": "->", "←": "<-", "≈": "~", "≤": "<=", "≥": ">=", "✓": "v" };
  let replaced = 0;
  function clean(s) {
    s = String(s == null ? "" : s).normalize("NFC").replace(/\t/g, " ");
    let out = "";
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if ((c >= 32 && c <= 126) || (c >= 160 && c <= 255) || WINANSI_EXTRA.includes(ch) || ch === "\n") { out += ch; continue; }
      if (MAP[ch]) { out += MAP[ch]; continue; }
      const base = ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
      if (base && [...base].every(b => { const k = b.codePointAt(0); return k >= 32 && k <= 255; })) { out += base; continue; }
      if (c < 32) continue;
      out += "?"; replaced++;
    }
    return out;
  }
  const cache = new Map();
  function measure(s, font, style, size) {
    const k = font + style + size + "|" + s;
    let w = cache.get(k);
    if (w == null) {
      mdoc.setFont(font, style); mdoc.setFontSize(size);
      w = mdoc.getTextWidth(s);
      if (cache.size > 20000) cache.clear();
      cache.set(k, w);
    }
    return w;
  }
  function fit(s, maxW, f) {
    s = clean(s);
    if (measure(s, f.font, f.style, f.size) <= maxW) return s;
    let lo = 0, hi = s.length;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (measure(s.slice(0, mid).trimEnd() + "…", f.font, f.style, f.size) <= maxW) lo = mid; else hi = mid - 1; }
    return s.slice(0, lo).trimEnd() + "…";
  }
  /** Word-wrap text into lines no wider than maxW. Keeps explicit line breaks; breaks very long words. */
  function wrap(s, maxW, f) {
    const lines = [];
    for (const para of clean(s).split("\n")) {
      const words = para.split(/ +/).filter(w => w !== "");
      if (!words.length) { lines.push(""); continue; }
      let cur = "";
      for (let w of words) {
        while (measure(w, f.font, f.style, f.size) > maxW && w.length > 1) {
          let n = w.length - 1;
          while (n > 1 && measure(w.slice(0, n), f.font, f.style, f.size) > maxW) n--;
          if (cur) { lines.push(cur); cur = ""; }
          lines.push(w.slice(0, n)); w = w.slice(n);
        }
        const test = cur ? cur + " " + w : w;
        if (measure(test, f.font, f.style, f.size) <= maxW) cur = test;
        else { if (cur) lines.push(cur); cur = w; }
      }
      lines.push(cur);
    }
    return lines;
  }

  // ---- Page model -----------------------------------------------------------------------------
  class Doc {
    constructor(paper) { [this.W, this.H] = PAPER[paper] || PAPER.letter; this.paper = PAPER[paper] ? paper : "letter"; this.pages = []; this.add(); }
    add() { this.ops = []; this.pages.push(this.ops); }
    text(s, x, y, f, extra) { s = clean(s); if (s) this.ops.push(Object.assign({ t: "text", s, x, y, font: f.font, style: f.style || "normal", size: f.size, color: f.color || "#111111", align: (extra && extra.align) || "left" })); }
    line(x1, y1, x2, y2, color, w) { this.ops.push({ t: "line", x1, y1, x2, y2, color: color || "#999999", w: w || 0.5 }); }
    rect(x, y, w, h, o) { this.ops.push(Object.assign({ t: "rect", x, y, w, h, fill: null, stroke: null, lw: 0.5, r: 0 }, o)); }
    img(im, x, y, w, h) { if (im && im.src) this.ops.push({ t: "img", src: im.src, fmt: im.fmt, x, y, w, h }); }
    link(x, y, w, h, url) { this.ops.push({ t: "link", x, y, w, h, url }); }
  }

  function tint(hex, amt) {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const m = v => Math.round(v + (255 - v) * amt).toString(16).padStart(2, "0");
    return "#" + m(r) + m(g) + m(b);
  }
  function theme(settings) {
    const accent = /^#[0-9a-f]{6}$/i.test(settings.color) ? settings.color : "#4338ca";
    const base = { ink: "#111111", muted: "#5b5b66", rule: "#b9b9c2", light: "#dcdce2" };
    if (settings.template === "modern") return Object.assign(base, { key: "modern", head: "helvetica", body: "helvetica", accent, fill: tint(accent, 0.88), band: true, center: false });
    if (settings.template === "minimal") return Object.assign(base, { key: "minimal", head: "helvetica", body: "helvetica", accent: "#111111", fill: "#f0f0f2", band: false, center: false });
    return Object.assign(base, { key: "classic", head: "times", body: "times", accent: "#111111", fill: "#ececf0", band: false, center: true });
  }
  const F = (th, kind, size, style, color) => ({ font: kind === "head" ? th.head : th.body, size, style: style || "normal", color: color || th.ink });

  // ---- Shared blocks --------------------------------------------------------------------------
  function contactLine(school) {
    return [String(school.address || "").split(/\n+/).map(x => x.trim()).filter(Boolean).join(", "), school.phone, school.email].filter(x => x && String(x).trim()).join("  ·  ");
  }
  /** Document header. Returns the y below it. */
  function header(doc, th, school, title, subtitle, imgs) {
    const M = 36, W = doc.W;
    const name = (school.name || "").trim() || (school.fallback != null ? school.fallback : "Homeschool");
    const contact = contactLine(school);
    const logo = imgs && imgs.logo;
    if (th.band) {
      const h = 66;
      doc.rect(0, 0, W, h, { fill: th.accent });
      let x = M;
      if (logo) { const s = Math.min(46 / logo.h, 46 / logo.w); doc.rect(M - 3, 10 - 3, logo.w * s + 6, logo.h * s + 6, { fill: "#ffffff", r: 4 }); doc.img(logo, M, 10, logo.w * s, logo.h * s); x = M + logo.w * s + 14; }
      const rightW = 190;
      doc.text(fit(name, W - M - x - rightW, F(th, "head", 16, "bold")), x, 31, F(th, "head", 16, "bold", "#ffffff"));
      if (contact) doc.text(fit(contact, W - M - x - rightW, F(th, "body", 8)), x, 46, F(th, "body", 8, "normal", "#ffffff"));
      doc.text(fit(title.toUpperCase(), rightW - 10, F(th, "head", 11, "bold")), W - M, 30, F(th, "head", 11, "bold", "#ffffff"), { align: "right" });
      if (subtitle) doc.text(fit(subtitle, rightW - 10, F(th, "body", 8, "italic")), W - M, 44, F(th, "body", 8, "italic", "#ffffff"), { align: "right" });
      return h + 14;
    }
    if (th.center) {
      let y = 40;
      if (logo) { const s = Math.min(50 / logo.h, 70 / logo.w); doc.img(logo, M, 30, logo.w * s, logo.h * s); }
      const maxW = W - 2 * M - (logo ? 170 : 0);
      doc.text(fit(name, maxW, F(th, "head", 17, "bold")), W / 2, y + 8, F(th, "head", 17, "bold"), { align: "center" });
      y += 22;
      if (contact) { doc.text(fit(contact, maxW, F(th, "body", 8.5)), W / 2, y, F(th, "body", 8.5, "normal", th.muted), { align: "center" }); y += 16; } else y += 4;
      doc.text(title.toUpperCase(), W / 2, y + 2, F(th, "head", 12.5, "bold"), { align: "center" });
      y += 13;
      if (subtitle) { doc.text(subtitle, W / 2, y, F(th, "body", 8.5, "italic", th.muted), { align: "center" }); y += 8; }
      y = Math.max(y, logo ? 84 : 0);
      doc.line(M, y + 2, W - M, y + 2, th.ink, 1.1);
      doc.line(M, y + 4.5, W - M, y + 4.5, th.ink, 0.4);
      return y + 16;
    }
    // minimal
    let x = M;
    if (logo) { const s = Math.min(44 / logo.h, 64 / logo.w); doc.img(logo, M, 30, logo.w * s, logo.h * s); x = M + logo.w * s + 12; }
    doc.text(fit(name, W - M - x - 200, F(th, "head", 15, "bold")), x, 46, F(th, "head", 15, "bold"));
    if (contact) doc.text(fit(contact, W - M - x - 200, F(th, "body", 8)), x, 60, F(th, "body", 8, "normal", th.muted));
    doc.text(title.toUpperCase(), W - M, 46, F(th, "head", 11, "bold"), { align: "right" });
    if (subtitle) doc.text(subtitle, W - M, 60, F(th, "body", 8, "italic", th.muted), { align: "right" });
    doc.line(M, 72, W - M, 72, th.ink, 0.8);
    return 86;
  }

  /** Label/value grid. items: [[label, value], ...]. Returns height. */
  function infoGrid(doc, th, items, x, y, w, draw) {
    const colW = (w - 16) / 2, f = F(th, "body", 8.5), lf = F(th, "body", 7, "bold", th.muted);
    const labW = Math.min(colW / 2, Math.max(70, ...items.map(([l]) => measure(clean(l).toUpperCase(), lf.font, lf.style, lf.size))) + 10);
    let yy = y, h = 0;
    for (let i = 0; i < items.length; i += 2) {
      let rowH = 0;
      for (let j = 0; j < 2 && i + j < items.length; j++) {
        const [label, value] = items[i + j];
        const lines = wrap(value || "—", colW - labW, f).slice(0, 3);
        const cx = x + j * (colW + 16);
        if (draw) {
          doc.text(label.toUpperCase(), cx, yy + 8, lf);
          lines.forEach((l, k) => doc.text(l, cx + labW, yy + 8.5 + k * 10.5, f));
        }
        rowH = Math.max(rowH, lines.length * 10.5 + 3);
      }
      yy += rowH; h += rowH;
    }
    return h;
  }

  function sigBlock(th, school, dateText, opts) {
    const h = opts && opts.cert === false ? 48 : 58;
    return {
      h,
      draw(doc, x, y, w, imgs) {
        let yy = y;
        if (!(opts && opts.cert === false)) {
          const cert = (opts && opts.certText) || "I certify that this transcript is a true and accurate record of the high school courses completed by the student named above.";
          doc.text(fit(cert, w, F(th, "body", 7.5, "italic")), x, yy + 8, F(th, "body", 7.5, "italic", th.muted));
          yy += 12;
        }
        const lineY = yy + 30, sigW = 230;
        const sig = imgs && imgs.signature;
        if (sig) { const s = Math.min(28 / sig.h, (sigW - 10) / sig.w); doc.img(sig, x + 4, lineY - 1 - sig.h * s, sig.w * s, sig.h * s); }
        doc.line(x, lineY, x + sigW, lineY, th.ink, 0.6);
        doc.text(fit(["Parent / school administrator", school.admin].filter(Boolean).join(": "), sigW, F(th, "body", 7.5)), x, lineY + 10, F(th, "body", 7.5, "normal", th.muted));
        const dx = x + sigW + 40, dw = 130;
        if (dateText) doc.text(dateText, dx + 2, lineY - 4, F(th, "body", 9));
        doc.line(dx, lineY, dx + dw, lineY, th.ink, 0.6);
        doc.text("Date", dx, lineY + 10, F(th, "body", 7.5, "normal", th.muted));
      },
    };
  }

  /** Paragraph block (label + wrapped text). */
  function paraBlock(th, label, text, w, size, color) {
    const f = F(th, "body", size || 7.5, "normal", color || th.ink);
    const lines = wrap(text, w, f);
    const lh = (size || 7.5) * 1.32;
    return {
      h: (label ? 10.5 : 0) + lines.length * lh + 2,
      draw(doc, x, y) {
        let yy = y;
        if (label) { doc.text(label, x, yy + 8, F(th, "head", 8, "bold")); yy += 10.5; }
        lines.forEach((l, i) => doc.text(l, x, yy + size * 1.05 + i * lh, f));
      },
    };
  }

  function footer(doc, th, leftText) {
    const n = doc.pages.length;
    doc.pages.forEach((ops, i) => {
      doc.ops = ops;
      const y = doc.H - 18;
      const f = { font: "helvetica", style: "normal", size: 6.8, color: "#77777f" };
      doc.text(CREDIT, doc.W / 2, y, f, { align: "center" });
      const w = measure(CREDIT, f.font, f.style, f.size);
      doc.link(doc.W / 2 - w / 2, y - 7, w, 9, REF);
      if (n > 1) doc.text(`Page ${i + 1} of ${n}`, doc.W - 36, y, f, { align: "right" });
      if (n > 1 && leftText) doc.text(fit(leftText, 170, f), 36, y, f);
    });
    doc.ops = doc.pages[doc.pages.length - 1];
  }

  const BOTTOM = 34; // space kept free for the footer line
  function contHeader(doc, th, text) {
    doc.text(fit(text, doc.W - 72, F(th, "head", 9, "bold")), 36, 40, F(th, "head", 9, "bold"));
    doc.line(36, 46, doc.W - 36, 46, th.rule, 0.6);
    return 58;
  }

  function gradeText(c, s, showPct) {
    const g = E.parseGrade(c.grade, s);
    if (g.kind === "graded") return showPct && g.pct != null ? `${g.letter} (${g.pct})` : g.letter;
    if (g.kind === "blank") return "IP";
    return g.label;
  }
  function marks(c) { return [E.LEVEL_MARK[c.level], c.transfer ? "TR" : ""].filter(Boolean).join(" "); }
  function yearLabelOf(student, y) {
    const custom = student.years && student.years[y] && student.years[y].label;
    return custom || E.yearLabel(String(student.gradDate || "").slice(0, 4), y);
  }
  function gradLine(student, issueISO) {
    if (!student.gradDate) return "";
    const future = issueISO && student.gradDate + "-31" > issueISO;
    return (future ? "Expected " : "") + E.fmtMonth(student.gradDate);
  }

  // ---- Transcript -------------------------------------------------------------------------------
  function yearBlock(th, s, student, year, courses, w, showPct) {
    const r = E.computeGPA(courses, s);
    const gW = showPct ? 50 : 34, cW = 34, tW = 24, pad = 5;
    const titleW = w - 2 * pad - gW - cW - tW;
    const f = F(th, "body", 8);
    const rows = courses.map(c => {
      let lines = wrap(c.title || "Untitled course", titleW - 4, f);
      if (lines.length > 2) lines = [lines[0], fit(lines.slice(1).join(" "), titleW - 4, f)];
      return { c, lines, h: lines.length * 9.3 + (lines.length > 1 ? 3.4 : 2.4) };
    });
    const h = 15 + 12 + 1 + rows.reduce((a, b) => a + b.h, 0) + 16;
    return {
      h,
      draw(doc, x, y) {
        const label = yearLabelOf(student, year);
        doc.rect(x, y, w, 15, { fill: th.fill });
        doc.text(fit(E.gradeName(year) + (label ? "  ·  " + label : ""), w - 2 * pad, F(th, "head", 8.8, "bold")), x + pad, y + 10.6, F(th, "head", 8.8, "bold"));
        let yy = y + 15;
        const hf = F(th, "body", 6.6, "bold", th.muted);
        const xT = x + pad + titleW, xG = xT + tW, xC = x + w - pad;
        doc.text("COURSE", x + pad, yy + 8.6, hf);
        doc.text("TYPE", xT, yy + 8.6, hf);
        doc.text("GRADE", xG, yy + 8.6, hf);
        doc.text("CREDITS", xC, yy + 8.6, hf, { align: "right" });
        yy += 12;
        doc.line(x, yy, x + w, yy, th.rule, 0.5);
        yy += 1;
        for (const row of rows) {
          row.lines.forEach((l, i) => doc.text(l, x + pad, yy + 8.4 + i * 9.3, f));
          const m = marks(row.c);
          if (m) doc.text(m, xT, yy + 8.4, F(th, "body", 7, "bold"));
          doc.text(gradeText(row.c, s, showPct), xG, yy + 8.4, f);
          doc.text(E.fmtCredits(E.parseCredits(row.c.credits)), xC, yy + 8.4, f, { align: "right" });
          yy += row.h;
        }
        doc.line(x, yy + 1, x + w, yy + 1, th.rule, 0.5);
        const sf = F(th, "body", 7.4, "bold");
        doc.text(!r.earned && r.inProgress ? `In progress: ${E.fmtCredits(r.inProgress)} credits` : `Credits: ${E.fmtCredits(r.earned)}${r.inProgress ? ` (+${E.fmtCredits(r.inProgress)} IP)` : ""}`, x + pad, yy + 11, sf);
        const gpa = r.unweighted == null ? "GPA: —" : r.anyWeighted ? `GPA ${r.unweighted}  ·  Weighted ${r.weighted}` : `GPA ${r.unweighted}`;
        doc.text(gpa, xC, yy + 11, sf, { align: "right" });
        doc.rect(x, y, w, h, { stroke: th.light, lw: 0.6 });
      },
    };
  }

  function summaryBlock(th, s, student, w) {
    const r = E.computeGPA(student.courses, s);
    const subj = E.subjectTotals(student.courses, s);
    const left = [["Total credits earned", E.fmtCredits(r.earned)]];
    if (r.anyWeighted) { left.push(["Cumulative GPA (unweighted)", r.unweighted || "—"], ["Cumulative GPA (weighted)", r.weighted || "—"]); }
    else left.push(["Cumulative GPA", r.unweighted || "—"]);
    if (r.inProgress > 0) left.push(["Credits in progress", E.fmtCredits(r.inProgress)]);
    const subs = E.SUBJECTS.filter(([k]) => subj[k].earned > 0 || subj[k].ip > 0).map(([k, n]) => [n, E.fmtCredits(subj[k].earned) + (subj[k].ip ? ` + ${E.fmtCredits(subj[k].ip)} IP` : "")]);
    const leftW = 210, rows = Math.ceil(subs.length / 2);
    const h = 18 + Math.max(left.length * 12.5, rows * 11.5) + 8;
    return {
      h,
      draw(doc, x, y) {
        doc.rect(x, y, w, h, { stroke: th.rule, lw: 0.7 });
        doc.text("CUMULATIVE SUMMARY", x + 8, y + 12, F(th, "head", 7.6, "bold", th.muted));
        doc.text("CREDITS BY SUBJECT", x + leftW + 14, y + 12, F(th, "head", 7.6, "bold", th.muted));
        left.forEach(([k, v], i) => {
          const yy = y + 27 + i * 12.5;
          doc.text(k, x + 8, yy, F(th, "body", 8.6));
          doc.text(v, x + leftW - 4, yy, F(th, "body", 9, "bold"), { align: "right" });
        });
        doc.line(x + leftW + 4, y + 6, x + leftW + 4, y + h - 6, th.light, 0.6);
        const cw = (w - leftW - 24) / 2;
        subs.forEach(([n, v], i) => {
          const col = i < rows ? 0 : 1, row = i < rows ? i : i - rows;
          const cx = x + leftW + 14 + col * (cw + 8), yy = y + 27 + row * 11.5;
          doc.text(n, cx, yy, F(th, "body", 8.2));
          doc.text(v, cx + cw - 6, yy, F(th, "body", 8.2, "bold"), { align: "right" });
        });
        if (!subs.length) doc.text("No credits yet", x + leftW + 14, y + 27, F(th, "body", 8.2, "italic", th.muted));
      },
    };
  }

  function creditNotes(student) {
    const out = [];
    const groups = {};
    for (const c of student.courses) {
      if (c.level === "DE" || c.transfer) {
        const kind = c.level === "DE" ? "Dual enrollment" : "Transfer credit";
        const key = kind + "|" + (c.provider || "").trim();
        (groups[key] = groups[key] || []).push(c);
      }
    }
    for (const key of Object.keys(groups)) {
      const [kind, prov] = key.split("|");
      const items = groups[key].map(c => (c.title || "Untitled") + (c.college ? ` (${c.college})` : ""));
      out.push(`${kind}${prov ? ` at ${prov}` : ""}: ${E.joinList(items)}.`);
    }
    if (out.some(l => l.startsWith("Dual"))) out.push("College transcripts for dual-enrollment courses are issued by the college.");
    return out.join(" ");
  }

  function legendBlock(th, s, courses, w) {
    const used = [...new Set(courses.map(c => c.level))];
    const l = E.legendText(s, used);
    const keys = [];
    if (used.includes("H")) keys.push("H = Honors");
    if (used.includes("AP")) keys.push("AP = Advanced Placement");
    if (used.includes("DE")) keys.push("DE = Dual enrollment (college course)");
    if (courses.some(c => c.transfer)) keys.push("TR = Transfer credit");
    const gk = new Set(courses.map(c => E.parseGrade(c.grade, s).kind));
    if (gk.has("pass")) keys.push("P = Pass");
    if (gk.has("ip") || gk.has("blank")) keys.push("IP = In progress");
    if (gk.has("w")) keys.push("W = Withdrawn");
    const text = [l.scale, l.weights, l.formula, keys.length ? "Key: " + keys.join(", ") + "." : ""].filter(Boolean).join(" ");
    return paraBlock(th, "", text, w, 6.8, th.muted);
  }

  function testsText(student) {
    return (student.tests || []).filter(t => (t.name || "").trim()).map(t => `${t.name.trim()}${t.date ? ` (${E.fmtMonth(t.date) || t.date})` : ""}${t.score ? `: ${t.score}` : ""}`).join("   ·   ");
  }

  /** Lay out blocks top to bottom, starting a continuation page when one doesn't fit. */
  function flow(doc, th, blocks, y, contText, x, w, imgs) {
    for (const b of blocks) {
      if (!b) continue;
      if (y + b.h > doc.H - BOTTOM) { doc.add(); y = contHeader(doc, th, contText); }
      b.draw(doc, x, y, w, imgs);
      y += b.h + (b.gap == null ? 8 : b.gap);
    }
    return y;
  }

  function buildTranscript(data, student, opts) {
    opts = opts || {};
    const s = E.settingsWithDefaults(data.settings);
    const th = theme(s);
    const doc = new Doc(s.paper);
    const M = 36, CW = doc.W - 2 * M, imgs = opts.imgs || {};
    const issue = opts.date || new Date().toISOString().slice(0, 10);
    let y = header(doc, th, data.school, "High School Transcript", "Parent-issued homeschool transcript", imgs);
    const items = [["Student", student.name], ["Date of birth", E.fmtDateLong(student.dob)], ["Address", String(student.address || "").split(/\n+/).join(", ")], ["Parent / administrator", data.school.admin], ["Graduation", gradLine(student, issue)], ["Transcript date", E.fmtDateLong(issue)]];
    if (student.studentId) items.push(["Student ID", student.studentId]);
    y += infoGrid(doc, th, items, M, y, CW, true) + 8;
    const contText = `${student.name || "Student"}  ·  High school transcript (continued)`;
    const by = E.byYear(student.courses);
    const years = E.YEARS.filter(yr => by[yr].length);
    const gap = 12, colW = (CW - gap) / 2;
    const yb = years.map(yr => yearBlock(th, s, student, yr, by[yr], colW, s.showPercent));
    if (!yb.length) { doc.text("No courses entered yet.", M, y + 12, F(th, "body", 9, "italic", th.muted)); y += 24; }
    // Two-column flow: each grade block goes into the shorter column, in grade order.
    let cols = [y, y];
    for (const b of yb) {
      let c = cols[0] <= cols[1] ? 0 : 1;
      if (cols[c] + b.h > doc.H - BOTTOM) {
        const other = 1 - c;
        if (cols[other] + b.h <= doc.H - BOTTOM) c = other;
        else { doc.add(); const top = contHeader(doc, th, contText); cols = [top, top]; c = 0; }
      }
      b.draw(doc, M + c * (colW + gap), cols[c]);
      cols[c] += b.h + 8;
    }
    if (yb.length) y = Math.max(cols[0], cols[1]) + 2;
    const tail = [summaryBlock(th, s, student, CW)];
    const tt = testsText(student);
    if (tt) tail.push(paraBlock(th, "Test scores", tt, CW, 7.8));
    const cn = creditNotes(student);
    if (cn) tail.push(paraBlock(th, "College and transfer credit", cn, CW, 7.6));
    if ((student.notes || "").trim()) tail.push(paraBlock(th, "Activities and notes", student.notes.trim(), CW, 7.6));
    // The grading key and the signature stay together, so a signature never sits alone on a page.
    const lg = legendBlock(th, s, student.courses, CW), sg = sigBlock(th, data.school, E.fmtDateLong(issue));
    tail.push({ h: lg.h + 6 + sg.h, draw(d, x, yy, w, im) { lg.draw(d, x, yy, w, im); sg.draw(d, x, yy + lg.h + 6, w, im); } });
    flow(doc, th, tail, y, contText, M, CW, imgs);
    footer(doc, th, student.name);
    return doc;
  }

  // ---- Report card ------------------------------------------------------------------------------
  function tableBlocks(th, cols, rows, w, opts) {
    // cols: [{label, w (fraction or px), align}], rows: [[cells]]. Returns header factory + row blocks.
    opts = opts || {};
    const size = opts.size || 8.6, f = F(th, "body", size), pad = 5;
    const fixed = cols.reduce((a, c) => a + (c.px || 0), 0);
    const flex = cols.filter(c => !c.px).length;
    const widths = cols.map(c => c.px || (w - fixed) / flex);
    const head = {
      h: 16, gap: 0,
      draw(doc, x, y) {
        doc.rect(x, y, w, 16, { fill: th.fill });
        let cx = x;
        cols.forEach((c, i) => { const ax = c.align === "right" ? cx + widths[i] - pad : cx + pad; doc.text(c.label.toUpperCase(), ax, y + 11, F(th, "body", 6.8, "bold", th.muted), { align: c.align || "left" }); cx += widths[i]; });
      },
    };
    const body = rows.map(cells => {
      const wrapped = cells.map((v, i) => cols[i].wrap ? wrap(v, widths[i] - 2 * pad, f) : [fit(v, widths[i] - 2 * pad, f)]);
      const n = Math.max(...wrapped.map(l => l.length));
      const h = n * size * 1.25 + 6;
      return {
        h, gap: 0,
        draw(doc, x, y) {
          let cx = x;
          wrapped.forEach((lines, i) => {
            const c = cols[i];
            lines.forEach((l, k) => doc.text(l, c.align === "right" ? cx + widths[i] - pad : cx + pad, y + size + 2 + k * size * 1.25, f, { align: c.align || "left" }));
            cx += widths[i];
          });
          doc.line(x, y + h, x + w, y + h, th.light, 0.5);
        },
      };
    });
    return { head, body };
  }

  /** Flow a table, repeating its header on each new page. */
  function flowTable(doc, th, t, y, contText, x, w) {
    let needHead = true;
    for (const r of t.body) {
      if (needHead || y + r.h > doc.H - BOTTOM) {
        if (!needHead || y + t.head.h + r.h > doc.H - BOTTOM) { doc.add(); y = contHeader(doc, th, contText); }
        t.head.draw(doc, x, y); y += t.head.h; needHead = false;
      }
      r.draw(doc, x, y); y += r.h;
    }
    if (needHead) { t.head.draw(doc, x, y); y += t.head.h; }
    return y + 10;
  }

  function buildReportCard(data, student, year, opts) {
    opts = opts || {};
    const s = E.settingsWithDefaults(data.settings);
    const th = theme(s);
    const doc = new Doc(s.paper);
    const M = 36, CW = doc.W - 2 * M, imgs = opts.imgs || {};
    const issue = opts.date || new Date().toISOString().slice(0, 10);
    const label = yearLabelOf(student, year);
    let y = header(doc, th, data.school, "Report Card", `${E.gradeName(year)}${label ? " · " + label : ""}`, imgs);
    y += infoGrid(doc, th, [["Student", student.name], ["Grade level", E.gradeName(year)], ["School year", label], ["Report date", E.fmtDateLong(issue)]], M, y, CW, true) + 10;
    const courses = E.byYear(student.courses)[year] || [];
    const rows = courses.map(c => {
      const mins = E.loggedMinutes(student, c.id);
      const hrs = mins ? E.round1(mins / 60) : Number(c.hours) > 0 ? Number(c.hours) : "";
      return [c.title || "Untitled course", E.SUBJECT_NAME[c.subject] || "", [E.LEVEL_NAME[c.level] !== "Regular" ? E.LEVEL_NAME[c.level] : "", c.transfer ? "Transfer" : ""].filter(Boolean).join(", "), gradeText(c, s, true), E.fmtCredits(E.parseCredits(c.credits)), hrs === "" ? "" : String(hrs)];
    });
    const contText = `${student.name || "Student"}  ·  Report card (continued)`;
    const t = tableBlocks(th, [{ label: "Course", wrap: true }, { label: "Subject", px: 96 }, { label: "Level", px: 86 }, { label: "Grade", px: 58 }, { label: "Credits", px: 48, align: "right" }, { label: "Hours", px: 44, align: "right" }], rows, CW);
    y = flowTable(doc, th, t, y, contText, M, CW);
    if (!rows.length) { doc.text("No courses entered for this year yet.", M, y + 4, F(th, "body", 9, "italic", th.muted)); y += 18; }
    const r = E.computeGPA(courses, s);
    const sumText = [`Credits earned this year: ${E.fmtCredits(r.earned)}`, r.inProgress ? `In progress: ${E.fmtCredits(r.inProgress)}` : "", r.unweighted ? `GPA: ${r.unweighted}` : "GPA: —", r.anyWeighted ? `Weighted GPA: ${r.weighted}` : ""].filter(Boolean).join("     ");
    const att = (student.attendance && student.attendance[year] || "").trim();
    const com = (student.comments && student.comments[year] || "").trim();
    const blocks = [
      { h: 22, draw(d, x, yy) { d.rect(x, yy, CW, 20, { stroke: th.rule }); d.text(sumText, x + 8, yy + 13.4, F(th, "body", 8.8, "bold")); } },
      att ? paraBlock(th, "Attendance", att, CW, 8.6) : null,
      com ? paraBlock(th, "Comments", com, CW, 8.6) : null,
      legendBlock(th, s, courses, CW),
      sigBlock(th, data.school, E.fmtDateLong(issue), { cert: false }),
    ];
    flow(doc, th, blocks, y, contText, M, CW, imgs);
    footer(doc, th, student.name);
    return doc;
  }

  // ---- Course descriptions ----------------------------------------------------------------------
  function courseMeta(c, s, student, single) {
    const g = gradeText(c, s, s.showPercent);
    const hrs = E.courseHours(student, c);
    const cr = E.parseCredits(c.credits);
    return [E.SUBJECT_NAME[c.subject], c.level !== "R" ? E.LEVEL_NAME[c.level] + (c.level === "DE" && c.provider ? ` at ${c.provider}` : "") : "", c.transfer ? `Transfer credit${c.provider && c.level !== "DE" ? ` from ${c.provider}` : ""}` : "", `${E.fmtCredits(cr)} ${cr === 1 ? "credit" : "credits"}`, single ? "" : g && g !== "IP" ? `Final grade: ${g}` : g === "IP" ? "In progress" : "", hrs ? `About ${hrs} hours` : ""].filter(Boolean).join("  ·  ");
  }

  function buildDescriptions(data, student, opts) {
    opts = opts || {};
    const s = E.settingsWithDefaults(data.settings);
    const th = theme(s);
    const doc = new Doc(s.paper);
    const M = 40, CW = doc.W - 2 * M, imgs = opts.imgs || {};
    const issue = opts.date || new Date().toISOString().slice(0, 10);
    let y = header(doc, th, data.school, opts.title || "Course Descriptions", student.name ? `for ${student.name}` : "", imgs);
    const intro = [student.name ? `Student: ${student.name}` : "", student.gradDate ? `Graduation: ${gradLine(student, issue)}` : "", `Prepared ${E.fmtDateLong(issue)}`].filter(Boolean).join("   ·   ");
    doc.text(fit(intro, CW, F(th, "body", 8.6)), M, y + 4, F(th, "body", 8.6, "normal", th.muted));
    y += 18;
    const contText = `${student.name || "Student"}  ·  Course descriptions (continued)`;
    const newPage = () => { doc.add(); y = contHeader(doc, th, contText); };
    const room = h => y + h <= doc.H - BOTTOM;
    const pool = opts.includeEmpty ? student.courses : student.courses.filter(c => (c.desc || "").trim());
    const by = E.byYear(pool);
    const list = opts.order === "subject"
      ? E.SUBJECTS.map(([k, n]) => [n, pool.filter(c => c.subject === k).sort((a, b) => a.year - b.year)]).filter(g => g[1].length)
      : E.YEARS.filter(yr => by[yr].length).map(yr => [E.gradeName(yr) + (yearLabelOf(student, yr) ? "  ·  " + yearLabelOf(student, yr) : ""), by[yr]]);
    if (!list.length) doc.text(student.courses.length ? "No course descriptions written yet." : "No courses entered yet.", M, y + 10, F(th, "body", 10, "italic", th.muted));
    const tf = F(th, "head", 11, "bold"), mf = F(th, "body", 8, "normal", th.muted), bf = F(th, "body", 9.6), lh = 13;
    for (const [groupName, courses] of list) {
      if (!room(22 + 16 + 12 + 2 * lh)) newPage();
      doc.text(groupName, M, y + 12, F(th, "head", 12, "bold", th.key === "modern" ? th.accent : th.ink));
      doc.line(M, y + 17, M + CW, y + 17, th.key === "modern" ? th.accent : th.rule, 0.8);
      y += 26;
      for (const c of courses) {
        const title = (c.title || "Untitled course") + (opts.order === "subject" ? `  (grade ${c.year})` : "");
        const tl = wrap(title, CW, tf);
        const ml = wrap(courseMeta(c, s, student, opts.single), CW, mf);
        const body = (c.desc || "").trim() ? wrap(c.desc.trim(), CW, bf) : [];
        const headH = tl.length * 13 + ml.length * 10.5 + 4;
        if (!room(headH + Math.min(body.length, 2) * lh + 4)) newPage();
        tl.forEach(l => { doc.text(l, M, y + 11, tf); y += 13; });
        ml.forEach(l => { doc.text(l, M, y + 9, mf); y += 10.5; });
        y += 4;
        if (!body.length) { doc.text("No description written yet.", M, y + 9, F(th, "body", 9, "italic", th.muted)); y += lh; }
        for (const l of body) {
          if (!room(lh)) newPage();
          if (l) doc.text(l, M, y + 9.6, bf);
          y += lh;
        }
        y += 10;
      }
      y += 4;
    }
    footer(doc, th, student.name);
    return doc;
  }

  // ---- Hours log -------------------------------------------------------------------------------
  function buildHoursLog(data, student, year, opts) {
    opts = opts || {};
    const s = E.settingsWithDefaults(data.settings);
    const th = theme(s);
    const doc = new Doc(s.paper);
    const M = 36, CW = doc.W - 2 * M, imgs = opts.imgs || {};
    const issue = opts.date || new Date().toISOString().slice(0, 10);
    const courses = student.courses.filter(c => !year || c.year === year);
    const ids = new Set(courses.map(c => c.id));
    const entries = (student.log || []).filter(e => ids.has(e.courseId)).sort((a, b) => a.date.localeCompare(b.date) || 0);
    const label = year ? `${E.gradeName(year)}${yearLabelOf(student, year) ? " · " + yearLabelOf(student, year) : ""}` : "All years";
    let y = header(doc, th, data.school, "Hours Log", label, imgs);
    const total = entries.reduce((a, e) => a + e.min, 0);
    y += infoGrid(doc, th, [["Student", student.name], ["Period", label], ["Total time", E.fmtHours(total)], ["Entries", String(entries.length)], ["Credit standard", `${s.hoursPerCredit} hours = 1 credit`], ["Printed", E.fmtDateLong(issue)]], M, y, CW, true) + 10;
    const contText = `${student.name || "Student"}  ·  Hours log (continued)`;
    const byId = Object.fromEntries(student.courses.map(c => [c.id, c]));
    const sumRows = courses.map(c => {
      const m = E.loggedMinutes(student, c.id);
      if (!m) return null;
      const cr = E.creditsFromMinutes(m, s.hoursPerCredit, 0.25);
      return [c.title || "Untitled course", year ? E.SUBJECT_NAME[c.subject] : `Grade ${c.year}`, E.round1(m / 60).toFixed(1), cr.exact.toFixed(2), E.fmtCredits(E.parseCredits(c.credits))];
    }).filter(Boolean);
    doc.text("Totals by course", M, y + 10, F(th, "head", 10, "bold")); y += 16;
    const t1 = tableBlocks(th, [{ label: "Course", wrap: true }, { label: year ? "Subject" : "Grade", px: 90 }, { label: "Hours", px: 60, align: "right" }, { label: `Credits at ${s.hoursPerCredit} h`, px: 96, align: "right" }, { label: "Transcript credits", px: 96, align: "right" }], sumRows, CW);
    y = flowTable(doc, th, t1, y, contText, M, CW);
    if (!sumRows.length) { doc.text("No hours logged yet.", M, y + 2, F(th, "body", 9, "italic", th.muted)); y += 16; }
    if (entries.length) {
      if (y + 60 > doc.H - BOTTOM) { doc.add(); y = contHeader(doc, th, contText); }
      doc.text("Daily entries", M, y + 10, F(th, "head", 10, "bold")); y += 16;
      const t2 = tableBlocks(th, [{ label: "Date", px: 70 }, { label: "Course", px: 170 }, { label: "Time", px: 70, align: "right" }, { label: "Note", wrap: true }], entries.map(e => [E.fmtDateShort(e.date), (byId[e.courseId] || {}).title || "", E.fmtHours(e.min), e.note || ""]), CW, { size: 8 });
      y = flowTable(doc, th, t2, y, contText, M, CW);
    }
    flow(doc, th, [paraBlock(th, "", `Credits are estimated as logged hours ÷ ${s.hoursPerCredit} hours per credit. The parent decides the credit actually awarded on the transcript.`, CW, 7.2, th.muted)], y, contText, M, CW, imgs);
    footer(doc, th, student.name);
    return doc;
  }

  // ---- Single description (standalone generator page) -----------------------------------------
  function buildSingleDescription(course, text, settings, opts) {
    opts = opts || {};
    const school = (opts.school || "").trim();
    const data = { settings: Object.assign({}, settings, { template: "minimal" }), school: { name: school || "Course Description", fallback: "", address: "", admin: "" } };
    const st = E.newStudent({ name: opts.student || "", courses: [Object.assign({}, course, { desc: text, hours: Number(course.hours) > 0 ? Number(course.hours) : "" })], log: [] });
    return buildDescriptions(data, st, Object.assign({ includeEmpty: true, single: true, title: school ? "Course Description" : " " }, opts));
  }

  // ---- Renderers --------------------------------------------------------------------------------
  const SVG_FONT = { helvetica: "Helvetica, Arial, 'Liberation Sans', sans-serif", times: "'Times New Roman', Times, 'Liberation Serif', serif" };
  const xesc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function toSVG(doc, i, label) {
    const ops = doc.pages[i];
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${doc.W} ${doc.H}" role="img" aria-label="${xesc(label || "Document preview")}, page ${i + 1} of ${doc.pages.length}"><rect width="${doc.W}" height="${doc.H}" fill="#fff"/>`;
    for (const o of ops) {
      if (o.t === "text") {
        const anchor = o.align === "right" ? "end" : o.align === "center" ? "middle" : "start";
        out += `<text x="${o.x.toFixed(2)}" y="${o.y.toFixed(2)}" font-family="${xesc(SVG_FONT[o.font])}" font-size="${o.size}"${/bold/.test(o.style) ? ' font-weight="700"' : ""}${/italic/.test(o.style) ? ' font-style="italic"' : ""} fill="${o.color}" text-anchor="${anchor}" xml:space="preserve">${xesc(o.s)}</text>`;
      } else if (o.t === "line") out += `<line x1="${o.x1}" y1="${o.y1}" x2="${o.x2}" y2="${o.y2}" stroke="${o.color}" stroke-width="${o.w}"/>`;
      else if (o.t === "rect") out += `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}"${o.r ? ` rx="${o.r}"` : ""} fill="${o.fill || "none"}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.lw}"` : ""}/>`;
      else if (o.t === "img") out += `<image href="${o.src}" x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" preserveAspectRatio="none"/>`;
      else if (o.t === "link") out += `<a href="${xesc(o.url)}" target="_blank" rel="noopener"><rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="transparent"/></a>`;
    }
    return out + "</svg>";
  }

  function toPDF(doc, meta) {
    const pdf = new window.jspdf.jsPDF({ unit: "pt", format: doc.paper, compress: true });
    // Metadata strings must stay ASCII: jsPDF miscounts byte offsets for other characters there.
    const ascii = v => String(v || "").normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/[()\\]/g, "").trim();
    pdf.setProperties({ title: ascii(meta && meta.title) || "Document", subject: ascii(meta && meta.subject), author: ascii(meta && meta.author), creator: "GradLedger - transcript.roohsites.com" });
    const aliases = new Map();
    doc.pages.forEach((ops, i) => {
      if (i) pdf.addPage(doc.paper, "portrait");
      for (const o of ops) {
        if (o.t === "text") {
          pdf.setFont(o.font, o.style); pdf.setFontSize(o.size); pdf.setTextColor(o.color);
          pdf.text(o.s, o.x, o.y, { align: o.align, baseline: "alphabetic" });
        } else if (o.t === "line") { pdf.setDrawColor(o.color); pdf.setLineWidth(o.w); pdf.line(o.x1, o.y1, o.x2, o.y2); }
        else if (o.t === "rect") {
          if (o.fill) pdf.setFillColor(o.fill);
          if (o.stroke) { pdf.setDrawColor(o.stroke); pdf.setLineWidth(o.lw); }
          const style = o.fill && o.stroke ? "FD" : o.fill ? "F" : "S";
          if (!o.fill && !o.stroke) continue;
          if (o.r) pdf.roundedRect(o.x, o.y, o.w, o.h, o.r, o.r, style); else pdf.rect(o.x, o.y, o.w, o.h, style);
        } else if (o.t === "img") {
          let a = aliases.get(o.src); if (!a) { a = "img" + aliases.size; aliases.set(o.src, a); }
          try { pdf.addImage(o.src, o.fmt || "PNG", o.x, o.y, o.w, o.h, a, "FAST"); } catch (e) { /* skip unreadable image */ }
        } else if (o.t === "link") pdf.link(o.x, o.y, o.w, o.h, { url: o.url });
      }
    });
    return pdf;
  }

  function imgInfo(src) {
    return new Promise(res => {
      if (!src) return res(null);
      const im = new Image();
      im.onload = () => res({ src, w: im.naturalWidth || 1, h: im.naturalHeight || 1, fmt: /^data:image\/jpe?g/.test(src) ? "JPEG" : "PNG" });
      im.onerror = () => res(null);
      im.src = src;
    });
  }
  async function images(school) {
    const [logo, signature] = await Promise.all([imgInfo(school && school.logo), imgInfo(school && school.signature)]);
    return { logo, signature };
  }

  window.GLDocs = {
    load, images, toSVG, toPDF, clean,
    buildTranscript, buildReportCard, buildDescriptions, buildHoursLog, buildSingleDescription,
    replacedCount() { const n = replaced; replaced = 0; return n; },
    CREDIT, REF,
  };
})();
