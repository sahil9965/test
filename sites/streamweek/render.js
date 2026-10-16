/* StreamWeek renderer: lays the week out for one of five image sizes and draws it on a <canvas>.
   The live preview and every PNG export use the same plan() + paint() path, so what you see is
   what you download. Two layouts: a 7-column grid for landscape images and a stacked list for
   Stories, 4:5 portrait and the 320-px panel (whose height follows the schedule). */
(function () {
  "use strict";
  const C = window.SWCore;
  const FAMILY = "SWInter";
  const STACK = `"${FAMILY}", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", Meiryo, "Noto Sans JP", "Noto Sans CJK JP", system-ui, sans-serif`;
  const CREDIT = "Made with StreamWeek · streamschedule.roohsites.com";

  let fontsP = null;
  function loadFonts() {
    if (fontsP) return fontsP;
    if (typeof FontFace === "undefined" || !document.fonts) return (fontsP = Promise.resolve());
    const faces = [["/vendor/inter-400.ttf", "400"], ["/vendor/inter-700.ttf", "700"]].map(([u, w]) => new FontFace(FAMILY, `url(${u})`, { weight: w }));
    fontsP = Promise.all(faces.map(f => f.load().then(() => document.fonts.add(f)))).catch(() => {});
    return fontsP;
  }

  // ---------- colour ----------
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgba = (h, a) => `rgba(${hex(h).join(",")},${a})`;
  const mix = (a, b, t) => "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
  const lum = h => { const [r, g, b] = hex(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const readable = h => (lum(h) > 0.4 ? "#111114" : "#ffffff");

  // ---------- themes ----------
  function linear(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
  function glow(g, x, y, r, c) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  function sparkle(g, x, y, r, c) {
    g.beginPath(); g.moveTo(x, y - r);
    g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
    g.fillStyle = c; g.fill();
  }
  const THEMES = {
    neon: {
      label: "Midnight neon", accent: "#22d3ee", dark: true,
      ink: "#f7f5ff", muted: "#b6afdb", title: "#ffffff", off: "#857db0",
      bg(g, W, H, A, u) {
        g.fillStyle = linear(g, 0, 0, 0, H, [[0, "#0b0720"], [1, "#1a0b3d"]]); g.fillRect(0, 0, W, H);
        glow(g, W * 0.1, -H * 0.05, Math.max(W, H) * 0.55, rgba(A, 0.24));
        glow(g, W * 0.98, H * 1.02, Math.max(W, H) * 0.5, "rgba(236,72,153,0.2)");
        g.fillStyle = "rgba(255,255,255,0.035)";
        const st = Math.max(16, 60 * u);
        for (let x = st; x < W; x += st) g.fillRect(x, 0, Math.max(1, u), H);
        for (let y = st; y < H; y += st) g.fillRect(0, y, W, Math.max(1, u));
      },
      card: A => ({ fill: "rgba(255,255,255,0.05)", stroke: rgba(A, 0.9), lw: 2, r: 18, shadow: rgba(A, 0.5), blur: 18 }),
      time: () => "#ffffff",
      pill: A => ({ fill: rgba(A, 0.16), ink: mix(A, "#ffffff", 0.5) }),
      ring: A => A,
    },
    pastel: {
      label: "Pastel idol", accent: "#ff5fa2",
      ink: "#4a2d5e", muted: "#86699c", title: "#4a2d5e", off: "#b49dc6",
      bg(g, W, H, A, u) {
        g.fillStyle = linear(g, 0, 0, W, H, [[0, "#ffe1ef"], [0.55, "#f3e3ff"], [1, "#dfe3ff"]]); g.fillRect(0, 0, W, H);
        g.fillStyle = "rgba(255,255,255,0.5)";
        for (const [fx, fy, fr] of [[0.06, 0.1, 0.09], [0.94, 0.05, 0.12], [0.88, 0.92, 0.1], [0.04, 0.95, 0.07], [0.5, 1.02, 0.08]]) { g.beginPath(); g.arc(fx * W, fy * H, fr * Math.max(W, H), 0, Math.PI * 2); g.fill(); }
        for (const [fx, fy, fr, c] of [[0.965, 0.18, 22, A], [0.93, 0.25, 12, "#ffffff"], [0.03, 0.3, 14, "#ffffff"], [0.975, 0.62, 16, mix(A, "#ffffff", 0.35)], [0.025, 0.72, 20, A], [0.52, 0.035, 12, mix(A, "#ffffff", 0.4)]]) sparkle(g, fx * W, fy * H, fr * u * 1.4, rgba(c, 0.8));
      },
      card: A => ({ fill: "rgba(255,255,255,0.9)", stroke: rgba(A, 0.18), lw: 2, r: 28, shadow: "rgba(150,90,170,0.18)", blur: 26, sy: 8 }),
      time: A => mix(A, "#4a2d5e", 0.3),
      pill: A => ({ fill: mix(A, "#ffffff", 0.84), ink: mix(A, "#3b1f4d", 0.4) }),
      ring: () => "#ffffff",
    },
    clean: {
      label: "Clean light", accent: "#2563eb",
      ink: "#15151a", muted: "#64646e", title: "#15151a", off: "#a1a1aa",
      bg(g, W, H, A, u) { g.fillStyle = "#f5f5f2"; g.fillRect(0, 0, W, H); g.fillStyle = A; g.fillRect(0, 0, W, Math.max(4, 12 * u)); },
      card: () => ({ fill: "#ffffff", stroke: "#e2e2dc", lw: 2, r: 16, shadow: "rgba(0,0,0,0.06)", blur: 12, sy: 3 }),
      time: () => "#15151a",
      pill: A => ({ fill: mix(A, "#ffffff", 0.88), ink: mix(A, "#000000", 0.3) }),
      ring: () => "#ffffff",
    },
    retro: {
      label: "Retro arcade", accent: "#ff4f8b", dark: true, upper: true, square: true,
      ink: "#ffffff", muted: "#c9c3ff", title: "#ffd23f", off: "#8c86cf",
      bg(g, W, H, A, u) {
        g.fillStyle = "#231c5c"; g.fillRect(0, 0, W, H);
        const q = Math.max(6, 16 * u);
        for (let row = 0; row < 2; row++) for (let i = 0; i * q < W; i++) {
          g.fillStyle = (i + row) % 2 ? A : "#ffd23f";
          g.fillRect(i * q, row * q, q, q); g.fillRect(i * q, H - (row + 1) * q, q, q);
        }
        g.fillStyle = "rgba(0,0,0,0.13)";
        const st = Math.max(3, 5 * u);
        for (let y = 2 * q; y < H - 2 * q; y += st) g.fillRect(0, y, W, Math.max(1, 1.6 * u));
      },
      card: A => ({ fill: "#16123d", stroke: "#ffd23f", lw: 5, r: 4, hard: A, off: 9 }),
      time: () => "#ffd23f",
      pill: A => ({ fill: A, ink: readable(A) }),
      ring: () => "#ffd23f",
      mark: () => "#5ef2ff",
    },
    minimal: {
      label: "Minimal dark", accent: "#c4b5fd", dark: true, flat: true,
      ink: "#f4f4f5", muted: "#8d8d97", title: "#f4f4f5", off: "#5c5c66",
      bg(g, W, H) { g.fillStyle = "#0e0e10"; g.fillRect(0, 0, W, H); },
      card: () => ({ rule: "#2c2c33", lw: 2 }),
      time: () => "#f4f4f5",
      pill: A => ({ fill: null, ink: A }),
      ring: () => "#2c2c33",
    },
  };
  // Accent as text colour: lifted on dark themes or deepened on light ones when it would be too faint.
  const accText = (T, A) => (T.dark ? (lum(A) < 0.16 ? mix(A, "#ffffff", 0.5) : A) : (lum(A) > 0.42 ? mix(A, "#000000", 0.45) : A));

  // ---------- text ----------
  const MC = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
  const font = (px, b) => `${b ? 700 : 400} ${px}px ${STACK}`;
  const tw = (t, px, b) => { MC.font = font(px, b); return MC.measureText(t).width; };
  function ellipsize(t, px, b, maxW) {
    if (tw(t, px, b) <= maxW) return t;
    const ch = [...t];
    while (ch.length && tw(ch.join("").trimEnd() + "…", px, b) > maxW) ch.pop();
    return ch.join("").trimEnd() + "…";
  }
  function wrap(t, px, b, maxW, maxLines) {
    const toks = String(t).match(/\S+\s*/g) || [];
    const lines = []; let cur = "";
    const push = () => { lines.push(cur.trimEnd()); cur = ""; };
    for (const tok of toks) {
      if (tw(cur + tok.trimEnd(), px, b) <= maxW) { cur += tok; continue; }
      if (cur) push();
      if (tw(tok.trimEnd(), px, b) <= maxW) { cur = tok; continue; }
      for (const c of tok) { if (cur && tw(cur + c, px, b) > maxW) push(); cur += c; }
    }
    if (cur.trim()) push();
    if (lines.length <= maxLines) return lines;
    const keep = lines.slice(0, maxLines);
    keep[maxLines - 1] = ellipsize(lines.slice(maxLines - 1).join(" "), px, b, maxW);
    return keep;
  }
  const fitPx = (t, px, minPx, b, maxW) => { while (px > minPx && tw(t, px, b) > maxW) px -= 1; return px; };
  const segW = parts => parts.reduce((w, p) => w + tw(p.t, p.px, p.b), 0);

  // ---------- shared pieces ----------
  function labelsFor(s) {
    const L = s.labels;
    return {
      day: d => (L === "ja" ? d.info.ja : d.info.en), jaSide: d => (L === "both" ? d.info.ja : ""),
      date: d => (L === "ja" ? d.info.dateJa : d.info.dateEn),
      off: L === "ja" ? [C.TEXT.off.ja, C.TEXT.offSub.ja] : L === "both" ? [C.TEXT.off.en, C.TEXT.off.ja] : [C.TEXT.off.en, C.TEXT.offSub.en],
      tba: L === "ja" ? [C.TEXT.tba.ja, C.TEXT.tbaSub.ja] : L === "both" ? [C.TEXT.tba.en, C.TEXT.tba.ja] : [C.TEXT.tba.en, C.TEXT.tbaSub.en],
    };
  }
  function zonesLine(s, wk) {
    const home = [...new Set(wk.items.map(i => i.homeLabel))];
    const first = wk.items[0];
    const lbl = home.length ? home.join("/") : C.zoneLabel(s.homeTz, C.toMs(s.weekStart) + 12 * 3600000);
    const vs = first ? first.viewers.map(v => v.label) : wk.viewers.map(tz => C.zoneLabel(tz, C.toMs(s.weekStart) + 12 * 3600000));
    return `Times in ${lbl}${vs.length ? " · " + vs.join(" · ") : ""}`;
  }
  const timeStr = (it, s) => C.fmtTime(it.start, s.clock) + (it.end ? " – " + C.fmtTime(it.end, s.clock) : "");
  const viewerParts = (v, s, px, T, A, M) => {
    const p = [{ t: C.fmtTime(v.time, s.clock), px, b: true, c: T.ink }, { t: " " + v.label, px, b: false, c: T.muted }];
    if (v.diff) p.push({ t: " " + C.diffMark(v.diff), px, b: true, c: M });
    return p;
  };

  // ---------- painting ----------
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function paintCard(g, o, T, A, u) {
    const c = T.card(A);
    if (c.rule) { g.fillStyle = c.rule; g.fillRect(o.x, o.y, o.w, Math.max(1, c.lw * u)); return; }
    const r = c.r * u;
    if (c.hard) { g.fillStyle = c.hard; rr(g, o.x + c.off * u, o.y + c.off * u, o.w, o.h, r); g.fill(); }
    g.save();
    if (c.shadow) { g.shadowColor = c.shadow; g.shadowBlur = c.blur * u; g.shadowOffsetY = (c.sy || 0) * u; }
    rr(g, o.x, o.y, o.w, o.h, r);
    if (c.fill) { g.fillStyle = c.fill; g.fill(); }
    if (c.stroke && !c.fill) { g.strokeStyle = c.stroke; g.lineWidth = c.lw * u; g.stroke(); }
    g.restore();
    if (c.stroke && c.fill) { rr(g, o.x, o.y, o.w, o.h, r); g.strokeStyle = c.stroke; g.lineWidth = c.lw * u; g.stroke(); }
  }
  function paintAvatar(g, img, o, T, A) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const sq = Math.min(iw, ih), sx = (iw - sq) / 2, sy = ih > iw ? (ih - sq) * 0.1 : (ih - sq) / 2;
    const { x, y, size } = o, ring = Math.max(2, size * 0.035);
    g.save();
    if (T.square) { g.fillStyle = A; g.fillRect(x + size * 0.06, y + size * 0.06, size, size); rr(g, x, y, size, size, 0); }
    else { g.beginPath(); g.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); }
    g.clip(); g.drawImage(img, sx, sy, sq, sq, x, y, size, size); g.restore();
    g.strokeStyle = T.ring(A); g.lineWidth = ring;
    if (T.square) g.strokeRect(x, y, size, size);
    else { g.beginPath(); g.arc(x + size / 2, y + size / 2, size / 2 - ring / 2, 0, Math.PI * 2); g.stroke(); }
  }
  function paint(g, plan, T, A, img) {
    const u = plan.u;
    T.bg(g, plan.W, plan.H, A, u);
    g.textBaseline = "alphabetic";
    for (const o of plan.ops) {
      if (o.k === "card") paintCard(g, o, T, A, u);
      else if (o.k === "avatar") { if (img) paintAvatar(g, img, o, T, A); }
      else if (o.k === "t") { g.font = font(o.px, o.b); g.fillStyle = o.c; g.textAlign = o.a || "left"; g.globalAlpha = o.alpha || 1; g.fillText(o.t, o.x, o.y); g.globalAlpha = 1; }
      else if (o.k === "segs") {
        let x = o.a === "right" ? o.x - segW(o.parts) : o.a === "center" ? o.x - segW(o.parts) / 2 : o.x;
        g.textAlign = "left";
        for (const p of o.parts) { g.font = font(p.px, p.b); g.fillStyle = p.c; g.fillText(p.t, x, o.y); x += g.measureText(p.t).width; }
      } else if (o.k === "pill") {
        if (o.fill) { rr(g, o.x, o.y, o.w, o.h, o.h / 2); g.fillStyle = o.fill; g.fill(); }
        g.font = font(o.px, true); g.fillStyle = o.c; g.textAlign = o.fill ? "center" : "left";
        g.fillText(o.t, o.fill ? o.x + o.w / 2 : o.x, o.y + o.h / 2 + o.px * 0.36);
      } else if (o.k === "rule") { g.fillStyle = o.c; g.globalAlpha = o.alpha || 1; g.fillRect(o.x, o.y, o.w, o.h); g.globalAlpha = 1; }
    }
  }

  // A pill or a run of text parts, laid out left to right and wrapped to new lines.
  function flow(ops, chunks, x, y, maxW, lineH, gap) {
    let cx = x, cy = y;
    for (const c of chunks) {
      if (cx > x && cx + c.w > x + maxW) { cx = x; cy += lineH + gap * 0.45; }
      c.put(cx, cy);
      cx += c.w + gap;
    }
    return chunks.length ? cy + lineH - y : 0;
  }
  function pillChunk(ops, text, px, maxW, T, A) {
    const p = T.pill(A), padX = p.fill ? px * 0.75 : 0;
    const t = ellipsize(text, px, true, maxW - padX * 2);
    const w = tw(t, px, true) + padX * 2;
    return { w, put: (x, y) => ops.push({ k: "pill", x, y, w, h: px * 1.75, t, px, fill: p.fill, c: p.ink }) };
  }
  function partsChunk(ops, parts, lineH, maxW) {
    let w = segW(parts);
    if (w > maxW) { const f = maxW / w; parts = parts.map(p => ({ ...p, px: p.px * f })); w = maxW; }
    const px = Math.max(...parts.map(p => p.px));
    return { w, put: (x, y) => ops.push({ k: "segs", x, y: y + lineH / 2 + px * 0.36, parts }) };
  }

  // ---------- landscape grid (1920 × 1080 layout units; 1200 × 675 is the same layout scaled) ----------
  function planGrid(s, wk, hasImg) {
    const T = THEMES[s.theme], A = s.accent || T.accent, AT = accText(T, A), MK = T.mark ? T.mark(A) : AT, Lb = labelsFor(s);
    const W = 1920, H = 1080, M = 64, ops = [];
    // header
    const top = 52, av = 160;
    let tx = M;
    if (hasImg) { ops.push({ k: "avatar", x: M, y: top, size: av }); tx = M + av + 36; }
    const range = wk.range, zl = zonesLine(s, wk);
    const rw = Math.max(tw(range, 38, true), tw(zl, 24, false));
    const title = T.upper ? (s.title || "Stream Schedule").toUpperCase() : s.title || "Stream Schedule";
    const tMax = W - M - rw - 64 - tx, tpx = fitPx(title, 86, 48, true, tMax);
    const ty = s.channel ? top + 96 : top + 112;
    ops.push({ k: "t", t: ellipsize(title, tpx, true, tMax), x: tx, y: ty, px: tpx, b: true, c: T.title });
    if (s.channel) ops.push({ k: "t", t: ellipsize(s.channel, 34, false, tMax), x: tx, y: ty + 54, px: 34, b: false, c: T.muted });
    ops.push({ k: "t", t: range, x: W - M, y: top + 86, px: 38, b: true, c: MK, a: "right" });
    ops.push({ k: "t", t: zl, x: W - M, y: top + 128, px: 24, b: false, c: T.muted, a: "right" });
    // columns
    const gap = 16, cw = (W - 2 * M - 6 * gap) / 7, pad = 22, inner = cw - 2 * pad;
    const regionTop = 252, regionBot = H - 116, avail = regionBot - regionTop;
    const headH = k => 34 * k + 30 * k + 20 * k + 22 * k;
    function col(d, k) {
      const o = []; let y = 0;
      if (d.off || d.tba) return { o, h: headH(k) + 120 * k };
      d.items.forEach((it, n) => {
        if (n) { y += 18 * k; o.push({ k: "rule", x: 0, y, w: inner, h: Math.max(1, 1.5 * k), c: T.muted, alpha: 0.3 }); y += 22 * k; }
        const tpx = fitPx(timeStr(it, s), 36 * k, 20 * k, true, inner);
        const long = tw(timeStr(it, s), 36 * k, true) > inner;
        if (long) {
          y += 36 * k; o.push({ k: "t", t: C.fmtTime(it.start, s.clock), x: 0, y, px: 36 * k, b: true, c: T.time(A) });
          y += 28 * k; o.push({ k: "segs", x: 0, y, parts: [{ t: "– " + C.fmtTime(it.end, s.clock) + " ", px: 21 * k, b: true, c: T.muted }, { t: it.homeLabel, px: 21 * k, b: false, c: T.muted }] });
        } else {
          y += 36 * k; o.push({ k: "t", t: timeStr(it, s), x: 0, y, px: tpx, b: true, c: T.time(A) });
          y += 28 * k; o.push({ k: "t", t: it.homeLabel, x: 0, y, px: 21 * k, b: false, c: T.muted });
        }
        if (it.title) { y += 8 * k; for (const ln of wrap(it.title, 24 * k, true, inner, 2)) { y += 30 * k; o.push({ k: "t", t: ln, x: 0, y, px: 24 * k, b: true, c: T.ink }); } }
        if (it.game) { y += 14 * k; const c = pillChunk(o, it.game, 18 * k, inner, T, A); c.put(0, y); y += 18 * k * 1.75; }
        if (it.viewers.length) {
          y += 12 * k;
          for (const v of it.viewers) { const c = partsChunk(o, viewerParts(v, s, 20 * k, T, A, MK), 27 * k, inner); c.put(0, y); y += 27 * k; }
        }
      });
      return { o, h: headH(k) + y };
    }
    let k = 1, need = 0;
    for (let i = 0; i < 4; i++) {
      need = Math.max(...wk.days.map(d => col(d, k).h)) + 2 * pad;
      const nk = Math.min(1.22, Math.max(0.6, k * (avail / need) * (need > avail ? 0.98 : 1)));
      if (Math.abs(nk - k) < 0.01) break;
      k = nk;
    }
    need = Math.max(...wk.days.map(d => col(d, k).h)) + 2 * pad;
    const ch = Math.min(avail, Math.max(need, avail * 0.72)), cy = regionTop + (avail - ch) / 2;
    wk.days.forEach((d, i) => {
      const x = M + i * (cw + gap), ix = x + pad;
      ops.push({ k: "card", x, y: cy, w: cw, h: ch });
      let y = cy + pad + 34 * k;
      ops.push({ k: "t", t: Lb.day(d), x: ix, y, px: 34 * k, b: true, c: AT });
      if (Lb.jaSide(d)) ops.push({ k: "t", t: Lb.jaSide(d), x: ix + inner, y, px: 30 * k, b: true, c: T.muted, a: "right" });
      y += 30 * k; ops.push({ k: "t", t: Lb.date(d), x: ix, y, px: 24 * k, b: false, c: T.muted });
      y += 20 * k; ops.push({ k: "rule", x: ix, y, w: inner, h: Math.max(1, 2 * k), c: AT, alpha: 0.45 });
      y += 22 * k;
      if (d.off || d.tba) {
        const [a, b] = d.off ? Lb.off : Lb.tba, mid = y + (cy + ch - pad - y) / 2;
        ops.push({ k: "t", t: a, x: x + cw / 2, y: mid, px: fitPx(a, 40 * k, 18, true, inner), b: true, c: T.off, a: "center" });
        ops.push({ k: "t", t: ellipsize(b, 21 * k, false, inner), x: x + cw / 2, y: mid + 34 * k, px: 21 * k, b: false, c: T.muted, a: "center" });
        return;
      }
      for (const o of col(d, k).o) ops.push({ ...o, x: o.x + ix, y: o.y + y });
    });
    // footer
    const credW = tw(CREDIT, 18, false);
    if (s.note) ops.push({ k: "t", t: ellipsize(s.note, 26, false, W - 2 * M - credW - 48), x: M, y: H - 46, px: 26, b: false, c: T.muted });
    ops.push({ k: "t", t: CREDIT, x: W - M, y: H - 42, px: 18, b: false, c: T.muted, a: "right", alpha: 0.8 });
    return { W, H, ops, u: 1 };
  }

  // ---------- stacked list (Stories, 4:5 portrait, panel) ----------
  const LIST = {
    story: { W: 1080, H: 1920, M: 64, top: 150, head: "center", av: 180, h1: 84, sub: 38, range: 30, bottom: 250, foot: 28, credit: 22,
      pad: 26, dayW: 170, gx: 22, day: 44, date: 26, time: 40, label: 26, title: 32, tl: 2, chip: 24, conv: 25, gap: 16, kMax: 1.18 },
    portrait: { W: 1080, H: 1350, M: 56, top: 52, head: "left", av: 128, h1: 66, sub: 32, range: 28, bottom: 92, foot: 24, credit: 20,
      pad: 20, dayW: 150, gx: 18, day: 38, date: 23, time: 34, label: 22, title: 27, tl: 1, chip: 20, conv: 22, gap: 12, kMax: 1.12 },
    panel: { W: 320, H: 0, M: 12, top: 14, head: "compact", av: 46, h1: 21, sub: 12, range: 12, bottom: 0, foot: 11, credit: 9,
      pad: 9, dayW: 44, gx: 8, day: 14, date: 10.5, time: 14, label: 10, title: 12, tl: 2, chip: 10, conv: 10.5, gap: 6, kMax: 1 },
  };
  function planList(s, wk, hasImg, key) {
    const m = LIST[key], T = THEMES[s.theme], A = s.accent || T.accent, AT = accText(T, A), MK = T.mark ? T.mark(A) : AT, Lb = labelsFor(s);
    const W = m.W, M = m.M, ops = [], u = W / 1080;
    const title = T.upper ? (s.title || "Stream Schedule").toUpperCase() : s.title || "Stream Schedule";
    const zl = zonesLine(s, wk);
    // header
    let y = m.top;
    if (m.head === "center") {
      if (hasImg) { ops.push({ k: "avatar", x: (W - m.av) / 2, y, size: m.av }); y += m.av + 34; }
      const px = fitPx(title, m.h1, m.h1 * 0.55, true, W - 2 * M);
      y += px * 0.86; ops.push({ k: "t", t: ellipsize(title, px, true, W - 2 * M), x: W / 2, y, px, b: true, c: T.title, a: "center" }); y += px * 0.3;
      if (s.channel) { y += m.sub * 1.15; ops.push({ k: "t", t: ellipsize(s.channel, m.sub, false, W - 2 * M), x: W / 2, y, px: m.sub, b: false, c: T.muted, a: "center" }); y += m.sub * 0.3; }
      y += 26;
      const p = T.pill(A), rw = tw(wk.range, m.range, true) + m.range * 1.6, rh = m.range * 1.9;
      ops.push({ k: "pill", x: (W - rw) / 2, y, w: rw, h: rh, t: wk.range, px: m.range, fill: p.fill || null, c: p.fill ? p.ink : AT });
      if (!p.fill) ops[ops.length - 1].x = (W - tw(wk.range, m.range, true)) / 2;
      y += rh + m.label * 1.5; ops.push({ k: "t", t: ellipsize(zl, m.label, false, W - 2 * M), x: W / 2, y, px: m.label, b: false, c: T.muted, a: "center" });
      y += 34;
    } else {
      const left = hasImg ? M + m.av + (key === "panel" ? 10 : 28) : M, maxW = W - M - left;
      if (hasImg) ops.push({ k: "avatar", x: M, y, size: m.av });
      const px = fitPx(title, m.h1, m.h1 * 0.6, true, maxW);
      const lines = [{ t: ellipsize(title, px, true, maxW), px, b: true, c: T.title }];
      if (s.channel) lines.push({ t: ellipsize(s.channel, m.sub, false, maxW), px: m.sub, b: false, c: T.muted });
      let blockH = lines.reduce((h, l) => h + l.px * 1.25, 0);
      if (key === "portrait") { lines.push({ t: ellipsize(wk.range, m.range, true, maxW), px: m.range, b: true, c: MK }); blockH += m.range * 1.45; }
      let ty = y + Math.max(0, ((hasImg ? m.av : blockH) - blockH) / 2);
      for (const l of lines) { ty += l.px * (l === lines[0] ? 1 : 1.3); ops.push({ k: "t", ...l, x: left, y: ty }); ty += l.px * 0.05; }
      y = Math.max(y + (hasImg ? m.av : 0), ty + m.label * 0.4);
      if (key === "panel") {
        y += m.range * 1.6; ops.push({ k: "t", t: ellipsize(wk.range, m.range, true, W - 2 * M), x: M, y, px: m.range, b: true, c: MK });
        y += m.label * 1.5; ops.push({ k: "t", t: ellipsize(zl, m.label, false, W - 2 * M), x: M, y, px: m.label, b: false, c: T.muted });
        y += 10;
      } else {
        y += m.label * 1.6; ops.push({ k: "t", t: ellipsize(zl, m.label, false, W - 2 * M), x: M, y, px: m.label, b: false, c: T.muted });
        y += 22;
      }
    }
    const rowsTop = y;
    // rows
    const cw = W - 2 * M;
    function row(d, k) {
      const o = [], pad = m.pad * k, dayW = m.dayW * k, rx = pad + dayW + m.gx * k, rw = cw - rx - pad;
      const dp = m.day * k, dt = m.date * k;
      o.push({ k: "t", t: Lb.day(d), x: pad, y: pad + dp * 0.8, px: dp, b: true, c: AT });
      o.push({ k: "t", t: Lb.date(d) + (Lb.jaSide(d) ? " · " + Lb.jaSide(d) : ""), x: pad, y: pad + dp * 0.8 + dt * 1.35, px: dt, b: false, c: T.muted });
      const dayH = dp * 0.8 + dt * 1.35 + dt * 0.3;
      if (d.off || d.tba) {
        const [a, b] = d.off ? Lb.off : Lb.tba, px = m.time * k * 0.8;
        o.push({ k: "segs", x: rx, y: pad + dayH / 2 + px * 0.36, parts: [{ t: a, px, b: true, c: T.off }, { t: "   " + b, px: px * 0.75, b: false, c: T.muted }] });
        return { o, h: pad * 2 + dayH };
      }
      let yy = pad;
      d.items.forEach((it, n) => {
        if (n) { yy += m.gap * k * 0.7; o.push({ k: "rule", x: rx, y: yy, w: rw, h: Math.max(1, 1.5 * k), c: T.muted, alpha: 0.3 }); yy += m.gap * k * 0.9; }
        const tp = m.time * k, parts = [{ t: timeStr(it, s), px: tp, b: true, c: T.time(A) }, { t: "  " + it.homeLabel, px: m.label * k, b: false, c: T.muted }];
        const sw = segW(parts), f = sw > rw ? rw / sw : 1;
        yy += tp * 0.82 * f; o.push({ k: "segs", x: rx, y: yy, parts: parts.map(p => ({ ...p, px: p.px * f })) }); yy += tp * 0.22;
        if (it.title) for (const ln of wrap(it.title, m.title * k, true, rw, m.tl)) { yy += m.title * k * 1.22; o.push({ k: "t", t: ln, x: rx, y: yy, px: m.title * k, b: true, c: T.ink }); }
        const lineH = m.chip * k * 1.75, chunks = [];
        if (it.game) chunks.push(pillChunk(o, it.game, m.chip * k, rw, T, A));
        for (const v of it.viewers) chunks.push(partsChunk(o, viewerParts(v, s, m.conv * k, T, A, MK), lineH, rw));
        if (chunks.length) { yy += m.chip * k * 0.55; yy += flow(o, chunks, rx, yy, rw, lineH, m.chip * k * 0.85); }
      });
      return { o, h: pad * 2 + Math.max(dayH, yy - pad + m.title * k * 0.15) };
    }
    const noteLines = s.note ? wrap(s.note, m.foot, false, cw, 2) : [];
    const footH = noteLines.length * m.foot * 1.35 + (noteLines.length ? m.foot * 0.8 : 0) + m.credit * 2.2;
    let k = 1, rows, total;
    const measure = () => { rows = wk.days.map(d => row(d, k)); total = rows.reduce((h, r) => h + r.h, 0) + 6 * m.gap * k; };
    let H = m.H, avail = 0;
    if (H) {
      avail = H - m.bottom - rowsTop - (noteLines.length ? noteLines.length * m.foot * 1.35 + 12 : 0);
      for (let i = 0; i < 4; i++) {
        measure();
        const nk = Math.min(m.kMax, Math.max(0.5, k * (avail / total) * (total > avail ? 0.98 : 1)));
        if (Math.abs(nk - k) < 0.01) break;
        k = nk;
      }
    }
    measure();
    if (!H) H = Math.ceil(rowsTop + total + 12 + footH + M * 0.5);
    let ry = rowsTop + (avail ? Math.max(0, (avail - total) / 2) : 0);
    rows.forEach(r => {
      ops.push({ k: "card", x: M, y: ry, w: cw, h: r.h });
      for (const o of r.o) ops.push({ ...o, x: o.x + M, y: o.y + ry });
      ry += r.h + m.gap * k;
    });
    // footer: note (centred on Stories), then the credit in the bottom-right corner
    let fy = m.H ? H - m.bottom + m.foot * 1.6 : ry + 6 + m.foot * 1.1;
    const center = key === "story";
    for (const ln of noteLines) { ops.push({ k: "t", t: ln, x: center ? W / 2 : M, y: fy, px: m.foot, b: false, c: T.muted, a: center ? "center" : "left" }); fy += m.foot * 1.35; }
    ops.push({ k: "t", t: CREDIT, x: W - M, y: H - Math.max(8, m.credit * 1.6), px: fitPx(CREDIT, m.credit, 7, false, cw), b: false, c: T.muted, a: "right", alpha: 0.8 });
    return { W, H, ops, u: key === "panel" ? 0.3 : u };
  }

  // ---------- public ----------
  function plan(s, img, key) {
    const wk = C.computeWeek(s);
    return key === "landscape" || key === "x" ? planGrid(s, wk, !!img) : planList(s, wk, !!img, key);
  }
  // Draws `key` into `canvas` at its export size and returns that size.
  function draw(canvas, s, img, key) {
    const p = plan(s, img, key), size = C.SIZES[key];
    const w = size.w, h = size.h || p.H, scale = w / p.W;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const g = canvas.getContext("2d");
    g.setTransform(scale, 0, 0, scale, 0, 0);
    g.clearRect(0, 0, p.W, p.H);
    const T = THEMES[s.theme];
    paint(g, p, T, s.accent || T.accent, img);
    g.setTransform(1, 0, 0, 1, 0, 0);
    return { w, h };
  }
  function png(s, img, key) {
    const c = document.createElement("canvas");
    draw(c, s, img, key);
    return new Promise(res => c.toBlob(res, "image/png"));
  }
  window.SWRender = { THEMES, CREDIT, loadFonts, plan, draw, png };
})();
