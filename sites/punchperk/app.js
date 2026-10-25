// PunchPerk UI. #pp-tool mounts the punch card maker (data-preset picks a landing-page preset).
// Everything runs in the browser: the PDF is built with pdf-lib (loaded on first use), the PNG is drawn
// on a canvas, and settings plus the logo are kept in this browser's localStorage. Nothing is uploaded.
(() => {
  const C = window.PPCore;
  const mount = document.getElementById("pp-tool");
  if (!C || !mount) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("pp_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { if (v === null) localStorage.removeItem("pp_" + k); else localStorage.setItem("pp_" + k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  const track = (name, data) => { try { if (window.va) window.va("event", data ? { name, data } : { name }); } catch {} };
  const fmtInt = n => Number(n).toLocaleString("en-US");
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "punch-cards";
  const saveBlob = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };
  const LETTER_REGIONS = ["US", "CA", "MX", "PH", "CL", "CO", "VE", "CR", "GT", "DO", "PR", "PA", "SV", "NI", "BZ"];
  const defaultLayout = () => {
    try {
      const region = (new Intl.Locale(navigator.language || "en-US").maximize().region || "US").toUpperCase();
      return LETTER_REGIONS.includes(region) ? "letter-10" : "a4-10";
    } catch { return "letter-10"; }
  };
  const loadScript = src => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load a script. Check your connection and try again."));
    document.head.appendChild(s);
  });

  const presetName = C.isPreset(mount.dataset.preset) ? mount.dataset.preset : "";
  const opt = (v, t) => `<option value="${v}">${esc(t)}</option>`;
  const field = (name, label, attrs = "") => `<div><label for="pp-${name}">${label}</label><input id="pp-${name}" name="${name}" ${attrs}></div>`;
  const check = (name, label) => `<label class="pp-check"><input type="checkbox" name="${name}" id="pp-${name}"> ${label}</label>`;
  const select = (name, label, options, attrs = "") => `<div><label for="pp-${name}">${label}</label><select id="pp-${name}" name="${name}" ${attrs}>${options}</select></div>`;
  mount.innerHTML = `
  <div class="pp">
    <form class="pp-form" autocomplete="off" novalidate>
      <fieldset class="pp-types">
        <legend>Start from a preset</legend>
        <div class="pp-chips">${Object.entries(C.PRESETS).map(([k, p]) => `<label class="pp-chip"><input type="radio" name="preset" value="${k}"><span>${esc(p.label)}</span></label>`).join("")}</div>
      </fieldset>

      <section class="pp-sec" aria-labelledby="pp-h-text">
        <h3 id="pp-h-text">Card text</h3>
        ${field("business", "Business or card name", 'maxlength="40"')}
        ${field("reward", "Reward line", 'maxlength="56" placeholder="e.g. Buy 9, get the 10th free"')}
        ${field("terms", "Terms line", 'maxlength="110"')}
        ${check("nameLine", "Print a “Name” write-in line")}
        ${field("contact", "Contact line (optional)", 'maxlength="64" placeholder="Phone, website or room number"')}
      </section>

      <section class="pp-sec" aria-labelledby="pp-h-punch">
        <h3 id="pp-h-punch">Punches</h3>
        <div class="row">
          ${select("punches", "Punches per card", [5, 6, 7, 8, 9, 10, 11, 12].map(n => opt(n, n + (n === 10 ? " (most popular)" : ""))).join(""))}
          ${select("rows", "Rows", opt("2", "2 rows") + opt("1", "1 row"))}
        </div>
        <div class="row">
          ${select("mark", "Punch mark", Object.entries(C.MARKS).map(([k, v]) => opt(k, v)).join(""))}
          ${select("rewardStyle", "Reward spot shows", opt("free", "The word FREE") + opt("gift", "A gift icon"))}
        </div>
        ${check("rewardSpot", "Make the last punch a filled reward spot")}
        ${check("initials", "Add a small “Initials” box for staff on each row")}
        <p class="small muted pp-hint">The punch count includes the reward spot, so “Buy 9, get the 10th free” is 10 punches with the reward spot on. Edit the reward line to match.</p>
      </section>

      <section class="pp-sec" aria-labelledby="pp-h-style">
        <h3 id="pp-h-style">Colours, font and logo</h3>
        <div class="pp-pals" role="group" aria-label="Ready-made palettes">${C.PALETTES.map((p, i) => `<button type="button" class="pp-pal" data-pal="${i}" aria-label="Palette: ${esc(p.name)}" title="${esc(p.name)}"><span style="background:${p.bg === "dark" ? "#17171a" : "#fff"}"><i style="background:${p.color}"></i></span></button>`).join("")}</div>
        <div class="row">
          <div><label for="pp-color">Accent colour</label><input type="color" id="pp-color" name="color"></div>
          ${select("bg", "Card background", opt("light", "Light (white)") + opt("dark", "Dark (uses more ink)"))}
        </div>
        <div class="row">
          ${select("font", "Font style", Object.entries(C.FONTS).map(([k, v]) => opt(k, v.label)).join(""))}
          <div class="pp-alignbottom">${check("border", "Rounded border")}</div>
        </div>
        <div class="pp-logo">
          <label for="pp-logo">Logo (PNG, JPG or SVG; stays on your device)</label>
          <input type="file" id="pp-logo" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif">
          <button type="button" class="btn ghost sm" data-a="nologo" hidden>Remove logo</button>
        </div>
      </section>

      <section class="pp-sec" aria-labelledby="pp-h-num">
        <h3 id="pp-h-num">Quantity and serial numbers</h3>
        <div class="row">
          ${field("qty", "Number of cards (1 to 500)", 'type="text" inputmode="numeric" maxlength="4"')}
          <div class="pp-alignbottom">${check("serials", "Print a serial number on each card")}</div>
        </div>
        <div class="pp-ser">
          <div class="pp-g3">
            ${field("prefix", "Prefix", 'maxlength="12" placeholder="e.g. No. "')}
            ${field("start", "Start number", 'type="text" inputmode="numeric" maxlength="9"')}
            ${select("pad", "Zero padding", opt("none", "None (1)") + ["2", "3", "4", "5", "6"].map(n => opt(n, `${n} digits (${"1".padStart(+n, "0")})`)).join(""))}
          </div>
          <p class="pp-count small muted" aria-live="polite"></p>
        </div>
        <p class="small muted pp-hint">Serial numbers and staff initials help you keep track of the cards you hand out. They don't make a printed card impossible to copy.</p>
      </section>

      <section class="pp-sec" aria-labelledby="pp-h-sheet">
        <h3 id="pp-h-sheet">Sheet layout</h3>
        ${select("layout", "Paper and layout", Object.entries(C.LAYOUTS).map(([k, v]) => opt(k, v.label)).join(""))}
        <p class="small muted pp-hint pp-layouthint"></p>
        <details class="pp-adv">
          <summary>Printer alignment (advanced)</summary>
          <p class="small muted">If your printed cards sit a little off the perforations, shift everything and reprint. Print the alignment test on plain paper first and hold it against a card sheet up to the light.</p>
          <div class="row">
            ${field("dx", "Shift right (mm, −3 to 3)", 'type="number" step="0.1" min="-3" max="3"')}
            ${field("dy", "Shift down (mm, −3 to 3)", 'type="number" step="0.1" min="-3" max="3"')}
          </div>
          ${check("outline", "Print light outlines around each card")}
          <p><button type="button" class="btn ghost sm" data-a="align">Download alignment test PDF</button></p>
        </details>
      </section>

      <section class="pp-sec" aria-labelledby="pp-h-back">
        <h3 id="pp-h-back">Back side</h3>
        ${check("back", "Print a matching back for every card")}
        <div class="pp-back">
          ${field("backNote", "Thank-you message", 'maxlength="60"')}
          ${field("address", "Address", 'maxlength="100"')}
          ${field("hours", "Opening hours", 'maxlength="90"')}
          ${field("social", "Social handle", 'maxlength="40" placeholder="e.g. @yourbusiness"')}
          <div class="row">
            ${field("qrUrl", "QR code link (optional)", 'type="text" inputmode="url" maxlength="150" placeholder="e.g. yourbusiness.com/menu"')}
            ${field("qrLabel", "QR caption", 'maxlength="28"')}
          </div>
          ${select("order", "Page order in the PDF", opt("interleaved", "Front, back, front, back (for two-sided printing)") + opt("separate", "All fronts, then all backs (print one side at a time)"))}
          <p class="small muted pp-hint"><strong>Flip on long edge.</strong> In your print dialog choose two-sided printing and “flip on long edge” (also called long-edge binding). The backs are mirrored left to right so each one lands behind its front. Print one test sheet before a full run.</p>
        </div>
      </section>
      <div class="pp-actions pp-mobile-dl"><button type="button" class="btn" data-a="pdf">Download print-ready PDF</button></div>
      <p class="pp-reset"><button type="button" class="btn ghost sm" data-a="reset">Reset to the preset</button> <span class="small muted">Your settings and logo are saved in this browser as you type.</span></p>
    </form>

    <div class="pp-out">
      <div class="pp-actions">
        <button type="button" class="btn" data-a="pdf">Download print-ready PDF</button>
        <button type="button" class="btn ghost" data-a="png">Card image (PNG)</button>
      </div>
      <p class="pp-sum small" aria-live="polite"></p>
      <div class="pp-msg small" role="status" aria-live="polite"></div>
      <figure class="pp-card"><div class="pp-fsvg" role="img" aria-label="Preview of the card front"></div><figcaption class="small muted">Front, as it prints</figcaption></figure>
      <figure class="pp-card pp-backfig"><div class="pp-bsvg" role="img" aria-label="Preview of the card back"></div><figcaption class="small muted">Back, as it prints</figcaption></figure>
      <div class="pp-sheetrow">
        <figure class="pp-sheet"><div class="pp-ssvg" role="img" aria-label="Thumbnail of the first sheet front"></div><figcaption class="small muted">Page 1</figcaption></figure>
        <figure class="pp-sheet pp-backfig"><div class="pp-tsvg" role="img" aria-label="Thumbnail of the first sheet back, mirrored for flipping on the long edge"></div><figcaption class="small muted">Its back, mirrored</figcaption></figure>
      </div>
      <ul class="pp-facts small"></ul>
    </div>
  </div>`;

  const $ = s => mount.querySelector(s);
  const $$ = s => [...mount.querySelectorAll(s)];
  const form = $(".pp-form");
  const KEYS = ["business", "reward", "punches", "rows", "mark", "rewardSpot", "rewardStyle", "initials", "terms", "contact", "nameLine", "color", "font", "bg", "border", "serials", "prefix", "start", "pad", "qty", "layout", "dx", "dy", "outline", "back", "order", "backNote", "address", "hours", "social", "qrUrl", "qrLabel"];
  const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
  const okLogo = l => (isObj(l) && typeof l.dataUrl === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(l.dataUrl) && +l.aspect > 0.01 && +l.aspect < 100) ? { dataUrl: l.dataUrl, aspect: +l.aspect } : null;
  const okState = v => {
    if (!isObj(v)) return null;
    const out = C.presetState(C.isPreset(v.preset) ? v.preset : "general");
    for (const k of KEYS) if (k in v && ["string", "number", "boolean"].includes(typeof v[k])) out[k] = v[k];
    out.landing = typeof v.landing === "string" ? v.landing : "";
    return out;
  };

  // The home page restores your last card. A landing page restores it only if you edited it on that same page,
  // so a visitor from "coffee punch card template" doesn't land on someone else's salon card.
  const saved = okState(store.get("last", null));
  const fresh = () => C.presetState(presetName || "general", { layout: defaultLayout(), landing: presetName });
  let st = saved && (!presetName || saved.landing === presetName) ? saved : fresh();
  st.landing = presetName;
  let logo = okLogo(store.get("logo", null));
  let logoBytes = null;
  let logoNote = ""; // shown under the preview while it applies, so a re-render doesn't wipe it

  function writeForm() {
    for (const k of KEYS) {
      const el = form.elements[k];
      if (!el) continue;
      if (el.type === "checkbox") el.checked = !!st[k];
      else el.value = st[k] ?? "";
    }
    $$('input[name="preset"]').forEach(r => { r.checked = r.value === st.preset; });
    $('[data-a="nologo"]').hidden = !logo;
  }
  function readForm() {
    for (const k of KEYS) {
      const el = form.elements[k];
      if (el) st[k] = el.type === "checkbox" ? el.checked : el.value;
    }
  }

  // QR code data, built with the vendored qrcode-generator (loaded the first time a link is typed).
  let qrCache = { url: "", data: null, error: "" };
  let qrLoading = false;
  function qrFor(url) {
    if (!url) return { data: null, error: "" };
    if (qrCache.url === url) return qrCache;
    if (typeof window.qrcode !== "function") {
      if (!qrLoading) { qrLoading = true; loadScript("/vendor/qrcode-generator-1.4.4.js").then(() => schedule()).catch(() => { qrLoading = false; }); }
      return { data: null, error: "" };
    }
    try {
      const q = window.qrcode(0, "M");
      q.addData(url, "Byte");
      q.make();
      qrCache = { url, data: C.qrData(q), error: "" };
    } catch { qrCache = { url, data: null, error: "That link is too long for a QR code. Try a shorter one." }; }
    return qrCache;
  }

  // ---- preview
  let last = null, raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); };
  function render() {
    const { s, errors, lost } = C.normalize(st);
    $(".pp-ser").hidden = !s.serials;
    $(".pp-back").hidden = !s.back;
    $$(".pp-backfig").forEach(f => { f.hidden = !s.back; });
    $$('[data-a="pdf"],[data-a="png"],[data-a="align"]').forEach(b => { b.disabled = !!errors.length; });
    store.set("last", st);
    if (errors.length) {
      $(".pp-sum").innerHTML = `<span class="pp-err">${esc(errors[0])}</span>`;
      last = null;
      return;
    }
    const g = C.sheetGeometry(s.layout, s.dx, s.dy);
    const L = C.LAYOUTS[s.layout];
    const lg = logo ? { aspect: logo.aspect } : null;
    const front = C.layoutFront(s, g.cardW, g.cardH, { logo: lg });
    const qr = s.back ? qrFor(s.qrUrl) : { data: null, error: "" };
    const back = s.back ? C.layoutBack(s, g.cardW, g.cardH, { qr: qr.data }) : null;
    const sheets = C.sheetCount(s), pages = C.pageList(s).length;
    last = { s, g, front, back, qr: qr.data, sheets, pages };
    const first = s.serials ? C.fmtNum(s.start, s) : "";
    $(".pp-fsvg").innerHTML = C.svgCard(s, front, g.cardW, g.cardH, first, logo && logo.dataUrl);
    if (back) $(".pp-bsvg").innerHTML = C.svgCard(s, back, g.cardW, g.cardH, "", null);
    $(".pp-ssvg").innerHTML = C.svgSheet(s, g, front, 0, "front", logo && logo.dataUrl);
    if (back) $(".pp-tsvg").innerHTML = C.svgSheet(s, g, back, 0, "back", null);
    if (s.serials) $(".pp-count").textContent = `${fmtInt(s.cards)} ${s.cards === 1 ? "card" : "cards"}: ${first}${s.cards > 1 ? " to " + C.fmtNum(s.end, s) : ""}`;
    const per = g.perPage;
    $(".pp-sum").textContent = `${fmtInt(s.cards)} ${s.cards === 1 ? "card" : "cards"} on ${fmtInt(sheets)} ${sheets === 1 ? "sheet" : "sheets"} of ${g.paperName}, ${per} per page${s.cards % per ? ` (the last sheet has ${s.cards % per})` : ""}. The PDF has ${fmtInt(pages)} ${pages === 1 ? "page" : "pages"}${s.back ? " including the backs" : ""}.`;
    const inch = v => String(+(v / 72).toFixed(2)).replace(/^(\d+)$/, "$1.0").replace(/^(\d+\.\d)$/, "$1"), mmv = v => Math.round((v / 72) * 25.4);
    const facts = [`Each card: ${inch(g.cardW)} × ${inch(g.cardH)} in (${mmv(g.cardW)} × ${mmv(g.cardH)} mm)`];
    facts.push(L.plain ? "Plain paper: 1/8 in gaps and crop marks for cutting by hand" : "For pre-cut 10-up business card sheets with no gaps (compatible with Avery 8371 and 5371 style sheets)");
    facts.push("Print at 100% / Actual size, not Fit to page");
    if (s.back) facts.push("Two-sided: flip on long edge");
    $(".pp-facts").innerHTML = facts.map(f => `<li>${esc(f)}</li>`).join("");
    $(".pp-layouthint").textContent = L.plain
      ? "Cut along the crop marks with a trimmer or scissors. Leaves room in the margins for the marks."
      : "Each card is a perfect fit for sheets of 10 business cards, 2 across and 5 down, with no gaps. Check your sheet's size before a full run.";
    const msgs = [];
    if (front.cut.length || (back && back.cut.length)) msgs.push(`Shortened to fit: ${[...new Set(front.cut.concat(back ? back.cut : []))].join(", ")}. Try shorter wording.`);
    front.notes.forEach(n => msgs.push(n));
    if (lost.length) msgs.push(`These characters can't be printed with the built-in PDF fonts and were left out: ${lost.join(" ")}`);
    if (qr.error) msgs.push(qr.error);
    if (logo && logoNote) msgs.push(logoNote);
    if (s.back && st.qrUrl && !qr.data && !qr.error) { /* QR library still loading */ }
    $(".pp-msg").innerHTML = msgs.map(m => `<p class="pp-warn">${esc(m)}</p>`).join("");
  }

  // ---- events
  form.addEventListener("input", e => {
    if (e.target.name === "preset" || e.target.id === "pp-logo") return;
    readForm();
    schedule();
  });
  form.addEventListener("change", e => {
    const t = e.target;
    if (t.name === "preset") {
      // Keep your own business name and contact line; replace the sample wording, marks and colours.
      const cur = C.presetValues(st.preset), keep = {};
      for (const k of ["business", "contact", "address", "hours", "social", "qrUrl"]) if (st[k] !== cur[k]) keep[k] = st[k];
      st = Object.assign({}, st, C.presetValues(t.value), keep, { preset: t.value });
      writeForm();
      schedule();
      return;
    }
    if (t.id === "pp-logo") return onLogo(t);
    readForm();
    schedule();
  });
  form.addEventListener("submit", e => e.preventDefault());
  mount.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.pal != null) { const p = C.PALETTES[+b.dataset.pal]; st.color = p.color; st.bg = p.bg; writeForm(); schedule(); return; }
    const a = b.dataset.a;
    if (a === "pdf") download();
    else if (a === "png") exportPng();
    else if (a === "align") alignmentTest();
    else if (a === "nologo") { logo = null; logoBytes = null; logoNote = ""; store.set("logo", null); $("#pp-logo").value = ""; b.hidden = true; schedule(); }
    else if (a === "reset") {
      if (!confirm("Reset every field to the preset and remove your saved logo?")) return;
      st = fresh(); logo = null; logoBytes = null; logoNote = ""; store.set("logo", null); store.set("last", null);
      $("#pp-logo").value = "";
      writeForm(); schedule(); flash("Reset to the preset.");
    }
  });

  // ---- logo: any image is redrawn to a PNG (max 600 px) so pdf-lib can embed it. A saved copy is capped at ~600 KB.
  const LOGO_CAP = 600 * 1024;
  function onLogo(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 600, h = img.naturalHeight || 300;
      const draw = max => {
        const k = Math.min(1, max / Math.max(w, h));
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        return { dataUrl: cv.toDataURL("image/png"), aspect: cv.width / cv.height };
      };
      let l = draw(600);
      if (l.dataUrl.length > LOGO_CAP) l = draw(360);
      URL.revokeObjectURL(url);
      logo = l; logoBytes = null; logoNote = "";
      if (l.dataUrl.length > LOGO_CAP) {
        store.set("logo", null);
        logoNote = "Your logo is quite detailed, so it works for this visit but won't be remembered after you close the page. A simpler or smaller image will be saved.";
      } else if (!store.set("logo", l)) logoNote = "Your logo is in use, but this browser wouldn't save it for next time.";
      $('[data-a="nologo"]').hidden = false;
      schedule();
    };
    img.onerror = () => { URL.revokeObjectURL(url); input.value = ""; flash("That image couldn't be read. Try a PNG or JPG.", true); };
    img.src = url;
  }
  const logoPayload = () => {
    if (!logo) return null;
    if (!logoBytes) { const bin = atob(logo.dataUrl.split(",")[1]); logoBytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) logoBytes[i] = bin.charCodeAt(i); }
    return { bytes: logoBytes.slice(), aspect: logo.aspect };
  };

  // ---- downloads
  let busy = false;
  function flash(html, isErr) { $(".pp-msg").innerHTML = `<p class="${isErr ? "pp-err" : "pp-ok"}">${isErr ? esc(html) : html}</p>`; }
  async function download() {
    if (busy || !last) return;
    busy = true;
    const btns = $$('[data-a="pdf"],[data-a="align"]');
    btns.forEach(b => { b.disabled = true; });
    flash("Building PDF…");
    try {
      if (!window.PDFLib) await loadScript("/vendor/pdf-lib.min.js");
      const { s } = last;
      const r = await C.buildPdf(window.PDFLib, st, { logo: logoPayload(), qr: last.qr, onProgress: (p, n, t) => flash(`Building page ${fmtInt(n)} of ${fmtInt(t)}…`) });
      const name = `punch-cards-${slug(s.business)}-${s.layout}.pdf`;
      saveBlob(new Blob([r.bytes], { type: "application/pdf" }), name);
      flash(`Saved <b>${esc(name)}</b>: ${fmtInt(r.cards)} ${r.cards === 1 ? "card" : "cards"} on ${fmtInt(r.pages)} ${r.pages === 1 ? "page" : "pages"}. Print at 100% / Actual size${s.back ? ", two-sided, flip on long edge" : ""}.`);
      track("pdf_download", { layout: s.layout, count: r.cards });
    } catch (err) {
      flash("Couldn't build the PDF: " + (err && err.message ? err.message : err), true);
    } finally { busy = false; btns.forEach(b => { b.disabled = false; }); }
  }
  async function alignmentTest() {
    if (busy || !last) return;
    busy = true;
    try {
      if (!window.PDFLib) await loadScript("/vendor/pdf-lib.min.js");
      const r = await C.buildAlignmentPdf(window.PDFLib, st);
      const name = `punchperk-alignment-test-${last.s.layout}.pdf`;
      saveBlob(new Blob([r.bytes], { type: "application/pdf" }), name);
      flash(`Saved <b>${esc(name)}</b>. Print it on plain paper at 100%, then hold it against a card sheet up to the light. Use the shift boxes if the outlines are off.`);
    } catch (err) {
      flash("Couldn't build the alignment test: " + (err && err.message ? err.message : err), true);
    } finally { busy = false; }
  }
  // One card front as a PNG at 300 dpi, without a serial number or any credit, for sharing as a digital punch card.
  function exportPng() {
    if (!last) return;
    const { s, g } = last;
    const lay = C.layoutFront(s, g.cardW, g.cardH, { logo: logo ? { aspect: logo.aspect } : null, digital: true });
    const svg = C.svgCard(s, lay, g.cardW, g.cardH, "", logo && logo.dataUrl);
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const k = 300 / 72, w = Math.round(g.cardW * k), h = Math.round(g.cardH * k);
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const x = cv.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
      x.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      cv.toBlob(b => {
        if (!b) return;
        const name = `${slug(s.business)}-punch-card.png`;
        saveBlob(b, name);
        flash(`Saved <b>${esc(name)}</b> (${w} × ${h} px) for sharing or a digital punch card.`);
        track("png_download");
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); flash("Your browser couldn't draw the image. Try another browser.", true); };
    img.src = url;
  }

  writeForm();
  render();
})();
