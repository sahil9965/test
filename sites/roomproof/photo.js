// Roomproof photo pipeline (browser only): decode -> downscale -> JPEG, read the capture time,
// fingerprint the original file, and render photos with markup and a burned-in date stamp.
// Everything happens on this device; no image is ever uploaded.
(function () {
  "use strict";
  const C = window.RPCore;
  const MAX = 1600, THUMB = 320, QUALITY = 0.85;

  function toBlob(canvas, type = "image/jpeg", q = QUALITY) {
    return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error("Could not encode image"))), type, q));
  }
  // Decoding through <img> applies the EXIF orientation in every current browser and also
  // reads HEIC in Safari.
  function loadImage(blob) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.decoding = "async";
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("unreadable")); };
      img.src = url;
    });
  }
  function canvas(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function release(c) { if (c) { c.width = 0; c.height = 0; } }
  async function sha256(file) {
    try {
      if (!(window.crypto && crypto.subtle)) return "";
      const d = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
    } catch { return ""; }
  }
  function scaled(src, sw, sh, max) {
    const s = Math.min(1, max / Math.max(sw, sh));
    const c = canvas(sw * s, sh * s);
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  async function importFile(file) {
    const name = file.name || "photo";
    if (file.type && !/^image\//.test(file.type)) throw new Error(`${name} is not an image.`);
    let exif = null;
    try { exif = C.readExif(await file.slice(0, 256 * 1024).arrayBuffer()); } catch {}
    let img;
    try { img = await loadImage(file); }
    catch { throw new Error(/\.hei[cf]$/i.test(name) || /hei[cf]/i.test(file.type) ? `${name}: this browser can't open HEIC photos. Use Safari, or set your camera to "Most compatible" (JPEG).` : `${name} couldn't be opened as an image.`); }
    const w0 = img.naturalWidth, h0 = img.naturalHeight;
    if (!w0 || !h0) throw new Error(`${name} couldn't be opened as an image.`);
    const big = scaled(img, w0, h0, MAX);
    const blob = await toBlob(big);
    const thumbC = scaled(big, big.width, big.height, THUMB);
    const thumb = await toBlob(thumbC, "image/jpeg", 0.75);
    const meta = {
      w: big.width, h: big.height, origName: name, origSize: file.size || 0, sha256: await sha256(file),
      caption: "", phase: "", markup: [], added: new Date().toISOString(),
    };
    release(big); release(thumbC); img.src = "";
    if (exif && exif.takenAt) Object.assign(meta, { takenAt: exif.takenAt, offset: exif.offset || "", source: "exif" });
    else Object.assign(meta, C.localFromMs(file.lastModified || Date.now()), { source: "file" });
    return { blob, thumb, meta };
  }

  function drawMarkup(ctx, shapes, w, h) {
    if (!shapes || !shapes.length) return;
    const lw = Math.max(2, Math.round(Math.max(w, h) * 0.007));
    const pass = (color, width) => {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const s of shapes) {
        ctx.beginPath();
        if (s.t === "circle") {
          const cx = (s.x1 + s.x2) / 2 * w, cy = (s.y1 + s.y2) / 2 * h;
          const rx = Math.max(2, Math.abs(s.x2 - s.x1) / 2 * w), ry = Math.max(2, Math.abs(s.y2 - s.y1) / 2 * h);
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        } else if (s.t === "arrow") {
          const x1 = s.x1 * w, y1 = s.y1 * h, x2 = s.x2 * w, y2 = s.y2 * h;
          const a = Math.atan2(y2 - y1, x2 - x1), head = Math.max(lw * 4, Math.hypot(x2 - x1, y2 - y1) * 0.18);
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          ctx.moveTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)); ctx.lineTo(x2, y2);
          ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
        } else if (s.t === "pen" && s.pts && s.pts.length) {
          ctx.moveTo(s.pts[0][0] * w, s.pts[0][1] * h);
          for (const [x, y] of s.pts.slice(1)) ctx.lineTo(x * w, y * h);
          if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * w + 0.1, s.pts[0][1] * h);
        }
        ctx.stroke();
      }
      ctx.restore();
    };
    pass("rgba(0,0,0,.45)", lw + Math.max(2, lw * 0.6));
    pass("#ff2a2a", lw);
  }

  function drawStamp(ctx, text, w, h) {
    if (!text) return;
    const fs = Math.max(11, Math.round(Math.max(w, h) * 0.026));
    ctx.save();
    ctx.font = `600 ${fs}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    const tw = ctx.measureText(text).width;
    const padX = fs * 0.55, padY = fs * 0.38, m = fs * 0.6;
    const bw = tw + padX * 2, bh = fs + padY * 2;
    const x = w - m - bw, y = h - m - bh;
    ctx.fillStyle = "rgba(0,0,0,.66)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, fs * 0.3); else ctx.rect(x, y, bw, bh);
    ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
    ctx.fillText(text, x + padX, y + bh / 2 + fs * 0.04);
    ctx.restore();
  }

  // Render a stored photo at up to maxPx on the long side, with optional markup and stamp.
  async function render(blob, maxPx, o = {}) {
    const img = await loadImage(blob);
    const c = scaled(img, img.naturalWidth, img.naturalHeight, maxPx);
    img.src = "";
    const ctx = c.getContext("2d");
    drawMarkup(ctx, o.markup, c.width, c.height);
    if (o.stamp) drawStamp(ctx, o.stamp, c.width, c.height);
    return c;
  }
  async function renderJpeg(blob, maxPx, o = {}) {
    const c = await render(blob, maxPx, o);
    const out = { bytes: new Uint8Array(await (await toBlob(c, "image/jpeg", o.quality || 0.82)).arrayBuffer()), w: c.width, h: c.height };
    release(c);
    return out;
  }
  async function thumbFor(blob, markup) {
    const c = await render(blob, THUMB, { markup });
    const t = await toBlob(c, "image/jpeg", 0.75);
    release(c);
    return t;
  }
  // Rotate the stored photo by 90 degrees (dir 1 = clockwise).
  async function rotate(blob, dir) {
    const img = await loadImage(blob);
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = canvas(h, w);
    const ctx = c.getContext("2d");
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    ctx.drawImage(img, -w / 2, -h / 2);
    img.src = "";
    const out = { blob: await toBlob(c), w: c.width, h: c.height };
    release(c);
    return out;
  }
  // Logo: keep transparency, max 600 x 240.
  async function importLogo(file) {
    const img = await loadImage(file).catch(() => { throw new Error("That logo file couldn't be opened."); });
    const s = Math.min(1, 600 / img.naturalWidth, 240 / img.naturalHeight);
    const c = canvas(img.naturalWidth * s, img.naturalHeight * s);
    const ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/png");
    release(c);
    return url;
  }

  window.RPPhoto = { importFile, loadImage, render, renderJpeg, thumbFor, rotate, drawMarkup, drawStamp, importLogo, toBlob, MAX };
})();
