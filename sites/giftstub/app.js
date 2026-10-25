// GiftStub UI. #gs-tool mounts the certificate maker (data-preset picks a landing-page preset).
// Everything runs in the browser: the PDF is built with pdf-lib (loaded on first use), the PNG is
// drawn on a canvas, and the issue log lives in this browser's localStorage. Nothing is uploaded.
(() => {
  const C = window.GSCore;
  const mount = document.getElementById("gs-tool");
  if (!C || !mount) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("gs_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("gs_" + k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  const track = (name, data) => { try { window.va && window.va("event", data ? { name, data } : { name }); } catch {} };
  const fmtInt = n => Number(n).toLocaleString("en-US");
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gift-certificates";
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const shortDate = iso => { const t = C.fmtDate(iso); return t ? t.replace(/^(\w{3})\w*/, "$1") : ""; };
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
  const defaultPaper = () => {
    try {
      const region = (new Intl.Locale(navigator.language || "en-US").maximize().region || "US").toUpperCase();
      return LETTER_REGIONS.includes(region) ? "letter" : "a4";
    } catch { return "letter"; }
  };
  const loadScript = src => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load the PDF engine. Check your connection and try again."));
    document.head.appendChild(s);
  });

  const ds = mount.dataset;
  const presetName = C.isPreset(ds.preset) ? ds.preset : "";
  const chip = (v, label) => `<label class="gs-chip"><input type="radio" name="preset" value="${v}"><span>${esc(label)}</span></label>`;
  const opt = (v, t) => `<option value="${v}">${t}</option>`;
  const field = (name, label, attrs = "") => `<div><label for="gs-${name}">${label}</label><input id="gs-${name}" name="${name}" ${attrs}></div>`;
  const check = (name, label) => `<label class="gs-check"><input type="checkbox" name="${name}" id="gs-${name}"> ${label}</label>`;
  const SWATCHES = [["#881337", "Wine"], ["#9d174d", "Raspberry"], ["#0f766e", "Teal"], ["#1d4ed8", "Blue"], ["#9a3412", "Rust"], ["#b91c1c", "Red"], ["#334155", "Slate"]];
  mount.innerHTML = `
  <div class="gs">
    <form class="gs-form" autocomplete="off" novalidate>
      <fieldset class="gs-types">
        <legend>Preset</legend>
        <div class="gs-chips">${Object.entries(C.PRESETS).map(([k, p]) => chip(k, p.label)).join("")}</div>
      </fieldset>

      <section class="gs-sec" aria-labelledby="gs-h-text">
        <h3 id="gs-h-text">Certificate text</h3>
        ${field("business", "Business name", 'maxlength="60"')}
        <div class="row">
          ${field("headline", "Headline", 'maxlength="40" placeholder="Gift Certificate"')}
          ${field("value", "Value or service", 'maxlength="90" placeholder="e.g. $50 or One 60-minute massage"')}
        </div>
        ${check("toFrom", "Print “To” and “From” lines")}
        <div class="row gs-tf">
          ${field("to", "To (optional)", 'maxlength="40" placeholder="Blank = write-in line"')}
          ${field("from", "From (optional)", 'maxlength="40" placeholder="Blank = write-in line"')}
        </div>
        <div><label for="gs-terms">Terms line</label><textarea id="gs-terms" name="terms" maxlength="160" rows="2"></textarea></div>
        ${field("contact", "Contact or website line", 'maxlength="100"')}
      </section>

      <section class="gs-sec" aria-labelledby="gs-h-exp">
        <h3 id="gs-h-exp">Expiry date</h3>
        ${check("expiry", "Print an expiry date")}
        <div class="gs-exp-only">${field("expiryDate", "Expires on (leave blank for a write-in line)", 'type="date"')}</div>
        <p class="gs-legal small muted" id="gs-legal">Gift certificate expiry and fee rules vary by country and US state (US federal law limits expiry on many gift certificates). Check your local rules.</p>
      </section>

      <section class="gs-sec" aria-labelledby="gs-h-num">
        <h3 id="gs-h-num">Numbering</h3>
        <div class="gs-g4">
          ${field("prefix", "Prefix", 'maxlength="10" placeholder="e.g. GC-"')}
          ${field("start", "Start number", 'type="text" inputmode="numeric" maxlength="9"')}
          ${field("qty", "Quantity", 'type="text" inputmode="numeric" maxlength="4" aria-describedby="gs-qtyhint"')}
          <div><label for="gs-pad">Zero padding</label><select id="gs-pad" name="pad">${opt("none", "None (1)")}${["2", "3", "4", "5", "6"].map(n => opt(n, `${n} digits (${"1".padStart(+n, "0")})`)).join("")}</select></div>
        </div>
        <p class="gs-count small muted" aria-live="polite"></p>
        <p class="small muted gs-hint" id="gs-qtyhint">Up to 500 certificates per PDF. For your next batch, start where this one ends.</p>
      </section>

      <details class="gs-sec gs-fold" open>
        <summary><h3>Paper, design and logo</h3></summary>
        <div class="row">
          <div><label for="gs-paper">Paper (3 per page, portrait)</label><select id="gs-paper" name="paper">${opt("letter", "US Letter (8.5 × 11 in)")}${opt("a4", "A4 (210 × 297 mm)")}</select></div>
          <div><label for="gs-design">Design</label><select id="gs-design" name="design">${opt("classic", "Classic border")}${opt("modern", "Modern")}${opt("minimal", "Minimal (black ink)")}</select></div>
        </div>
        <div class="gs-color">
          <div><label for="gs-color">Accent colour</label><input type="color" id="gs-color" name="color"></div>
          <div class="gs-swatches" role="group" aria-label="Colour presets">${SWATCHES.map(([c, n]) => `<button type="button" class="gs-sw" data-color="${c}" style="background:${c}" aria-label="${n}" title="${n}"></button>`).join("")}</div>
        </div>
        <div class="gs-logo">
          <label for="gs-logo">Logo (PNG, JPG or SVG; stays in your browser)</label>
          <input type="file" id="gs-logo" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif">
          <button type="button" class="btn ghost sm" data-a="nologo" hidden>Remove logo</button>
        </div>
        <div class="gs-checks">${check("crop", "Cut marks")}${check("borders", "Light cut lines around each certificate")}</div>
      </details>
      <div class="gs-mobile-dl"><button type="button" class="btn" data-a="pdf">Download PDF</button></div>
    </form>

    <div class="gs-out">
      <div class="gs-actions">
        <button type="button" class="btn" data-a="pdf">Download PDF</button>
        <button type="button" class="btn ghost" data-a="png">Certificate image</button>
        <button type="button" class="btn ghost" data-a="csv">Issue log CSV</button>
      </div>
      <div class="gs-imgrow"><label for="gs-imgnum">Number on the image</label><input id="gs-imgnum" type="text" inputmode="numeric" maxlength="9"></div>
      <p class="gs-sum small" aria-live="polite"></p>
      <div class="gs-msg small" role="status" aria-live="polite"></div>
      <figure class="gs-cert"><div class="gs-csvg" role="img" aria-label="Preview of the first certificate and its stub"></div><figcaption class="small muted"></figcaption></figure>
      <div class="gs-sheetrow">
        <figure class="gs-sheet"><div class="gs-ssvg" role="img" aria-label="Preview of sheet 1"></div></figure>
        <ul class="gs-facts small"></ul>
      </div>
    </div>
  </div>

  <section class="gs-log" aria-labelledby="gs-h-log">
    <h2 id="gs-h-log">Issue and redeem log</h2>
    <p class="gs-lognote small">A convenience list stored <strong>only in this browser</strong> on this device. It isn't synced or backed up, and clearing your browser data deletes it, so export the CSV regularly and keep a copy.</p>
    <div class="gs-logadd">
      ${field("lnum", "Certificate number", 'maxlength="40" placeholder="e.g. GC-0001"')}
      ${field("lto", "Issued to", 'maxlength="80" placeholder="optional"')}
      ${field("lamt", "Amount", 'maxlength="30" placeholder="optional"')}
      <div class="gs-logbtn"><button type="button" class="btn sm" data-a="logissue">Log as issued</button></div>
    </div>
    <div class="gs-logtools">
      <button type="button" class="btn ghost sm" data-a="addprinted"></button>
      <div class="gs-search"><label for="gs-lsearch">Find a number</label><input id="gs-lsearch" type="search" maxlength="40" placeholder="e.g. 0007"></div>
    </div>
    <p class="gs-logsum small muted" aria-live="polite"></p>
    <ul class="gs-list" aria-label="Logged certificates"></ul>
    <div class="gs-logio">
      <button type="button" class="btn ghost sm" data-a="logexport">Export log CSV</button>
      <input type="file" id="gs-limport" class="sr" accept=".csv,.txt,text/csv,text/plain">
      <label class="btn ghost sm gs-filebtn" for="gs-limport">Import CSV</label>
      <button type="button" class="btn ghost sm" data-a="logclear">Clear log</button>
    </div>
    <p class="gs-logmsg small" role="status" aria-live="polite"></p>
  </section>`;

  const $ = s => mount.querySelector(s);
  const $$ = s => [...mount.querySelectorAll(s)];
  const form = $(".gs-form");
  const KEYS = ["business", "headline", "value", "to", "from", "toFrom", "terms", "contact", "expiry", "expiryDate", "prefix", "start", "qty", "pad", "paper", "design", "color", "crop", "borders"];
  const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
  const okLogo = l => (isObj(l) && typeof l.dataUrl === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(l.dataUrl) && +l.aspect > 0.01 && +l.aspect < 100) ? { dataUrl: l.dataUrl, aspect: +l.aspect } : null;
  const okState = v => {
    if (!isObj(v)) return null;
    const out = C.presetState(C.isPreset(v.preset) ? v.preset : "general");
    for (const k of KEYS) if (k in v && ["string", "number", "boolean"].includes(typeof v[k])) out[k] = v[k];
    return out;
  };

  // ---- initial state: the home page remembers your last certificate; landing pages start from their preset.
  const saved = !presetName ? okState(store.get("last", null)) : null;
  let st = saved || C.presetState(presetName || "general", { paper: defaultPaper() });
  // Landing pages can open on a fixed paper size and prefix (data-paper="a4", data-prefix="GV-").
  if (!saved) {
    if (ds.paper === "a4" || ds.paper === "letter") st.paper = ds.paper;
    if (ds.prefix) st.prefix = ds.prefix;
  }
  let logo = !presetName ? okLogo(store.get("logo", null)) : null;
  let logoBytes = null;

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

  // ---- preview
  let last = null, raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); };
  const legalEl = $("#gs-legal"), legalDefault = legalEl.textContent;
  const legalVoucher = "Voucher expiry and refund rules vary by country. Set clear terms, and check local consumer rules if you're unsure.";
  function render() {
    const { s, errors, lost } = C.normalize(st);
    const noun = C.noun(s);
    legalEl.textContent = noun === "voucher" ? legalVoucher : legalDefault;
    $(".gs-exp-only").hidden = !s.expiry;
    $(".gs-tf").hidden = !s.toFrom;
    $$('[data-a="pdf"],[data-a="png"],[data-a="csv"],[data-a="addprinted"]').forEach(b => { b.disabled = !!errors.length; });
    if (!presetName) store.set("last", st);
    if (errors.length) {
      $(".gs-count").textContent = "";
      $(".gs-sum").innerHTML = `<span class="gs-err">${esc(errors[0])}</span>`;
      last = null;
      return;
    }
    const g = C.sheetGeometry(s.paper);
    const lay = C.layoutCert(s, g.cellW, g.cellH, { logo: logo ? { aspect: logo.aspect } : null });
    const sheets = C.sheetCount(s.count);
    last = { s, g, lay, sheets };
    const first = C.fmtNum(s.start, s), lastN = C.fmtNum(s.end, s);
    $(".gs-csvg").innerHTML = C.svgCert(s, lay, g.cellW, g.cellH, 0, logo && logo.dataUrl);
    $(".gs-cert figcaption").textContent = `${noun === "voucher" ? "Voucher" : "Certificate"} ${first} with its stub, exactly as it prints`;
    $(".gs-ssvg").innerHTML = C.svgSheet(s, g, lay, 0, logo && logo.dataUrl);
    const word = s.count === 1 ? noun : noun + "s";
    $(".gs-count").textContent = `${fmtInt(s.count)} ${word}: ${first}${s.count > 1 ? " to " + lastN : ""}`;
    $(".gs-sum").textContent = `${fmtInt(s.count)} ${word} on ${fmtInt(sheets)} ${sheets === 1 ? "sheet" : "sheets"} of ${g.paperName}, 3 per page.${s.count % 3 ? ` The last sheet has ${s.count % 3}.` : ""}`;
    const inch = v => (v / 72).toFixed(2).replace(/0$/, ""), mm = v => Math.round((v / 72) * 25.4);
    $(".gs-facts").innerHTML = [
      `Each piece: ${inch(g.cellW)} × ${inch(g.cellH)} in (${mm(g.cellW)} × ${mm(g.cellH)} mm)`,
      `Stub: ${inch(lay.stubW)} in wide, dashed tear line`,
      `Certificate after tearing: ${inch(g.cellW - lay.stubW)} × ${inch(g.cellH)} in`,
      "Print at 100% / Actual size, not Fit to page",
    ].map(f => `<li>${esc(f)}</li>`).join("");
    const imgEl = $("#gs-imgnum");
    imgEl.placeholder = String(s.start);
    const msgs = [];
    if (lay.cut.length) msgs.push(`Shortened to fit: ${lay.cut.join(", ")}. Try shorter wording.`);
    if (lost.length) msgs.push(`These characters can't be printed with the built-in PDF fonts and were left out: ${lost.join(" ")}`);
    $(".gs-msg").innerHTML = msgs.map(m => `<p class="gs-warn">${esc(m)}</p>`).join("");
    $('[data-a="addprinted"]').textContent = `Add ${first}${s.count > 1 ? "–" + lastN : ""} to the log`;
  }

  // ---- events
  form.addEventListener("input", e => {
    if (e.target.name === "preset") return;
    readForm();
    schedule();
  });
  form.addEventListener("change", e => {
    const t = e.target;
    if (t.name === "preset") {
      // Keep your own business name and contact line; replace the sample wording, colour and design.
      const cur = C.presetValues(st.preset), keep = {};
      for (const k of ["business", "contact"]) if (st[k] !== cur[k]) keep[k] = st[k];
      st = Object.assign({}, st, C.presetValues(t.value), keep, { preset: t.value });
      writeForm();
      schedule();
      track("preset_used", { preset: t.value });
      return;
    }
    if (t.id === "gs-logo") return onLogo(t);
    readForm();
    schedule();
  });
  form.addEventListener("submit", e => e.preventDefault());
  mount.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.color) { st.color = b.dataset.color; form.elements.color.value = st.color; schedule(); return; }
    if (b.dataset.redeem != null) return setStatus(b.dataset.redeem, true);
    if (b.dataset.undo != null) return setStatus(b.dataset.undo, false);
    if (b.dataset.del != null) return removeEntry(b.dataset.del);
    const a = b.dataset.a;
    if (a === "pdf") download();
    else if (a === "png") exportPng();
    else if (a === "csv") exportIssueCsv();
    else if (a === "nologo") { logo = null; logoBytes = null; store.set("logo", null); $("#gs-logo").value = ""; b.hidden = true; schedule(); }
    else if (a === "addprinted") addPrinted();
    else if (a === "logissue") logIssue();
    else if (a === "logexport") exportLog();
    else if (a === "logclear") clearLog();
  });

  // ---- logo: any image is redrawn to a PNG (max 900 px) so pdf-lib can embed it
  function onLogo(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 600, h = img.naturalHeight || 300;
      const k = Math.min(1, 900 / Math.max(w, h));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      logo = { dataUrl: cv.toDataURL("image/png"), aspect: cv.width / cv.height };
      logoBytes = null;
      if (!presetName && !store.set("logo", logo)) store.set("logo", null);
      $('[data-a="nologo"]').hidden = false;
      schedule();
    };
    img.onerror = () => { URL.revokeObjectURL(url); input.value = ""; flash("That image couldn't be read. Try a PNG or JPG.", true); };
    img.src = url;
  }
  const logoPayload = () => {
    if (!logo) return null;
    if (!logoBytes) { const bin = atob(logo.dataUrl.split(",")[1]); logoBytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) logoBytes[i] = bin.charCodeAt(i); }
    return { bytes: logoBytes.slice(), type: "png", aspect: logo.aspect };
  };

  // ---- downloads
  let busy = false;
  function flash(html, isErr) { $(".gs-msg").innerHTML = `<p class="${isErr ? "gs-err" : "gs-ok"}">${isErr ? esc(html) : html}</p>`; }
  async function download() {
    if (busy || !last) return;
    busy = true;
    const btns = $$('[data-a="pdf"]');
    btns.forEach(b => { b.disabled = true; });
    flash("Building PDF…");
    try {
      if (!window.PDFLib) await loadScript("/vendor/pdf-lib.min.js");
      const { s } = last;
      const r = await C.buildPdf(window.PDFLib, st, { logo: logoPayload(), onProgress: (p, n, t) => flash(`Building sheet ${fmtInt(n)} of ${fmtInt(t)}…`) });
      const name = `gift-${C.noun(s)}s-${slug(C.fmtNum(s.start, s))}-${slug(C.fmtNum(s.end, s))}.pdf`;
      saveBlob(new Blob([r.bytes], { type: "application/pdf" }), name);
      flash(`Saved <b>${esc(name)}</b>: ${fmtInt(r.count)} ${r.count === 1 ? "certificate" : "certificates"} on ${fmtInt(r.sheets)} ${r.sheets === 1 ? "sheet" : "sheets"}. Print at 100% / Actual size, then use <em>Add to the log</em> below to track them.`);
      const c = r.count;
      track("certificates_generated", { bucket: c <= 10 ? "1-10" : c <= 50 ? "11-50" : c <= 150 ? "51-150" : "151-500", preset: s.preset, design: s.design });
    } catch (err) {
      flash("Couldn't build the PDF: " + (err && err.message ? err.message : err), true);
    } finally { busy = false; btns.forEach(b => { b.disabled = false; }); }
  }
  // One certificate (no stub) as a PNG at 2x screen resolution, for emailing a digital gift certificate.
  function exportPng() {
    if (!last) return;
    const { s, g } = last;
    const want = C.toInt($("#gs-imgnum").value, s.start);
    const n = want >= 0 && want <= 99999999 ? want : s.start;
    const lay = C.layoutCert(s, g.cellW, g.cellH, { logo: logo ? { aspect: logo.aspect } : null, digital: true });
    const svg = C.svgCert(s, lay, g.cellW, g.cellH, n - s.start, logo && logo.dataUrl);
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const k = 2 * 96 / 72, w = Math.round(g.cellW * k), h = Math.round(g.cellH * k), foot = 54;
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h + foot;
      const x = cv.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, cv.width, cv.height);
      x.drawImage(img, 0, 0, w, h);
      x.fillStyle = "#e6e3dc"; x.fillRect(0, h, w, 2);
      x.fillStyle = "#6b6b75";
      x.font = "500 21px system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(C.CREDIT, w / 2, h + foot / 2 + 1);
      URL.revokeObjectURL(url);
      cv.toBlob(b => {
        if (!b) return;
        const name = `${slug(s.business || "gift")}-gift-${C.noun(s)}-${slug(C.fmtNum(n, s))}.png`;
        saveBlob(b, name);
        flash(`Saved <b>${esc(name)}</b> (${w} × ${h + foot} px) for certificate ${esc(C.fmtNum(n, s))}. Attach it to an email or text, and log the number below.`);
        track("png_export");
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); flash("Your browser couldn't draw the image. Try another browser.", true); };
    img.src = url;
  }
  function exportIssueCsv() {
    if (!last) return;
    const { s } = last;
    const name = `gift-certificate-log-${slug(C.fmtNum(s.start, s))}-${slug(C.fmtNum(s.end, s))}.csv`;
    saveBlob(new Blob([C.issueLogCsv(st)], { type: "text/csv;charset=utf-8" }), name);
    flash(`Saved <b>${esc(name)}</b> with one row per certificate number. Open it in Excel, Numbers or Google Sheets.`);
    track("issue_csv");
  }

  /* ------------------------------------------------- issue and redeem log */
  let log = (() => { const l = store.get("log", []); return Array.isArray(l) ? l.map(C.cleanEntry).filter(Boolean) : []; })();
  const saveLog = () => { if (!store.set("log", log)) logMsg("Couldn't save to this browser's storage (it may be full or blocked). Export the CSV to keep your log.", true); };
  const find = n => log.findIndex(e => e.n.toLowerCase() === String(n).trim().toLowerCase());
  function logMsg(t, isErr) { const m = $(".gs-logmsg"); m.textContent = t || ""; m.className = "gs-logmsg small" + (isErr ? " gs-err" : ""); }
  function renderLog() {
    const q = $("#gs-lsearch").value.trim().toLowerCase();
    const list = q ? log.filter(e => e.n.toLowerCase().includes(q) || e.to.toLowerCase().includes(q)) : log;
    const red = log.filter(e => e.status === "redeemed").length;
    $(".gs-logsum").textContent = log.length
      ? `${fmtInt(log.length)} in the log: ${fmtInt(log.length - red)} issued, ${fmtInt(red)} redeemed.${q ? ` ${fmtInt(list.length)} ${list.length === 1 ? "match" : "matches"} for “${$("#gs-lsearch").value.trim()}”.` : ""}${list.length > 200 ? " Showing the first 200; search to find others." : ""}`
      : "The log is empty. Add the numbers you print, or log a certificate when you sell it.";
    $(".gs-list").innerHTML = list.slice(0, 200).map(e => {
      const meta = [e.to, e.amount, e.issued ? "issued " + shortDate(e.issued) : ""].filter(Boolean).map(esc).join(" · ");
      const red = e.status === "redeemed";
      return `<li class="gs-row${red ? " is-red" : ""}"><span class="gs-n">${esc(e.n)}</span><span class="gs-st">${red ? "Redeemed" + (e.redeemed ? " " + esc(shortDate(e.redeemed)) : "") : "Issued"}</span>${meta ? `<span class="gs-meta">${meta}</span>` : ""}<span class="gs-rowbtns">${red
        ? `<button type="button" class="btn ghost sm" data-undo="${esc(e.n)}" aria-label="Undo redeemed for ${esc(e.n)}">Undo</button>`
        : `<button type="button" class="btn ghost sm" data-redeem="${esc(e.n)}" aria-label="Mark ${esc(e.n)} redeemed">Mark redeemed</button>`}<button type="button" class="btn ghost sm gs-x" data-del="${esc(e.n)}" aria-label="Remove ${esc(e.n)} from the log">Remove</button></span></li>`;
    }).join("");
  }
  function setStatus(n, redeemed) {
    const i = find(n);
    if (i < 0) return;
    log[i] = Object.assign({}, log[i], redeemed ? { status: "redeemed", redeemed: today() } : { status: "issued", redeemed: "" });
    saveLog(); renderLog();
    logMsg(redeemed ? `${log[i].n} marked redeemed today.` : `${log[i].n} is back to issued.`);
    if (redeemed) track("log_redeem");
  }
  function removeEntry(n) {
    const i = find(n);
    if (i < 0 || !confirm(`Remove ${log[i].n} from the log?`)) return;
    const [gone] = log.splice(i, 1);
    saveLog(); renderLog(); logMsg(`${gone.n} removed.`);
  }
  function addPrinted() {
    if (!last) return;
    const { s } = last;
    let added = 0;
    for (let i = 0; i < s.count; i++) {
      const n = C.fmtNum(s.start + i, s);
      if (find(n) < 0) { log.push({ n, status: "issued", to: "", amount: "", issued: "", redeemed: "", note: "" }); added++; }
    }
    saveLog(); renderLog();
    logMsg(added ? `Added ${fmtInt(added)} ${added === 1 ? "number" : "numbers"} to the log${added < s.count ? ` (${fmtInt(s.count - added)} were already there)` : ""}.` : "Those numbers are already in the log.");
    track("log_add_printed");
  }
  function logIssue() {
    const n = $("#gs-lnum").value.trim();
    if (!n) { logMsg("Type the certificate number first, for example GC-0001.", true); $("#gs-lnum").focus(); return; }
    const e = C.cleanEntry({ n, status: "issued", to: $("#gs-lto").value, amount: $("#gs-lamt").value, issued: today() });
    const i = find(n);
    if (i >= 0) log[i] = Object.assign({}, log[i], { to: e.to || log[i].to, amount: e.amount || log[i].amount, issued: log[i].issued || e.issued });
    else log.push(e);
    saveLog(); renderLog();
    logMsg(`${e.n} logged as issued${e.to ? " to " + e.to : ""}.`);
    ["#gs-lnum", "#gs-lto", "#gs-lamt"].forEach(s => { $(s).value = ""; });
  }
  function exportLog() {
    if (!log.length) { logMsg("The log is empty, so there's nothing to export yet.", true); return; }
    const name = `gift-certificate-log-${today()}.csv`;
    saveBlob(new Blob([C.logCsv(log)], { type: "text/csv;charset=utf-8" }), name);
    logMsg(`Saved ${name} with ${fmtInt(log.length)} ${log.length === 1 ? "row" : "rows"}.`);
    track("log_export");
  }
  function clearLog() {
    if (!log.length || !confirm("Delete every entry in this browser's log? Export the CSV first if you want a copy.")) return;
    log = []; saveLog(); renderLog(); logMsg("Log cleared.");
  }
  $("#gs-limport").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 5e6) { logMsg("That file is over 5 MB.", true); return; }
    f.text().then(t => {
      const rows = C.parseLogCsv(t);
      let added = 0, updated = 0;
      for (const r of rows) { const i = find(r.n); if (i >= 0) { log[i] = r; updated++; } else { log.push(r); added++; } }
      saveLog(); renderLog();
      logMsg(rows.length ? `Imported ${fmtInt(rows.length)} ${rows.length === 1 ? "row" : "rows"}: ${fmtInt(added)} new, ${fmtInt(updated)} updated.` : "No certificate numbers found in that file. The first row should have a Number column.", !rows.length);
      e.target.value = "";
      track("log_import");
    });
  });
  $("#gs-lsearch").addEventListener("input", renderLog);
  $("#gs-lnum").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); logIssue(); } });

  writeForm();
  render();
  renderLog();
})();
