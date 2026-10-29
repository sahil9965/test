// PriceBoard UI. #pb-tool mounts the price list maker (data-preset and data-format pick a landing-page start).
// Everything runs in the browser: the PDF is built with pdf-lib (loaded on first use), the PNG is drawn
// on a canvas, and the list plus the logo are kept in this browser's localStorage. Nothing is uploaded.
(() => {
  const C = window.PBCore;
  const mount = document.getElementById("pb-tool");
  if (!C || !mount) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("pb_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { if (v === null) localStorage.removeItem("pb_" + k); else localStorage.setItem("pb_" + k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  const track = (name, data) => { try { if (window.va) window.va("event", data ? { name, data } : { name }); } catch {} };
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "price-list";
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
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
  const letterRegion = () => {
    try { return LETTER_REGIONS.includes((new Intl.Locale(navigator.language || "en-US").maximize().region || "US").toUpperCase()); } catch { return true; }
  };
  const loadScript = src => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load a script. Check your connection and try again."));
    document.head.appendChild(s);
  });

  const presetName = C.isPreset(mount.dataset.preset) ? mount.dataset.preset : "";
  const formatName = C.FORMATS[mount.dataset.format] ? mount.dataset.format : "";
  const landing = presetName + (formatName ? "/" + formatName : "");
  const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
  const field = (name, label, attrs = "") => `<div><label for="pb-${name}">${label}</label><input id="pb-${name}" name="${name}" ${attrs}></div>`;
  const check = (name, label) => `<label class="pb-check"><input type="checkbox" name="${name}" id="pb-${name}"> ${label}</label>`;
  const select = (name, label, options) => `<div><label for="pb-${name}">${label}</label><select id="pb-${name}" name="${name}">${options}</select></div>`;
  const fmtOpts = print => Object.entries(C.FORMATS).filter(([, f]) => !!f.print === print).map(([k, f]) => opt(k, f.label)).join("");
  mount.innerHTML = `
  <div class="pb">
    <form class="pb-form" autocomplete="off" novalidate>
      <fieldset class="pb-types">
        <legend>Start from a sample menu</legend>
        <div class="pb-chips">${Object.entries(C.PRESETS).map(([k, p]) => `<label class="pb-chip"><input type="radio" name="preset" value="${k}"><span>${esc(p.label)}</span></label>`).join("")}</div>
      </fieldset>

      <section class="pb-sec" aria-labelledby="pb-h-biz">
        <h3 id="pb-h-biz">Business</h3>
        ${field("business", "Business name", `maxlength="${C.MAXLEN.business}"`)}
        ${field("tagline", "Line under the name (optional)", `maxlength="${C.MAXLEN.tagline}" placeholder="e.g. Cuts · Color · Treatments"`)}
        <div class="pb-logo">
          <label for="pb-logo">Logo (PNG, JPG or SVG; stays on your device)</label>
          <input type="file" id="pb-logo" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif">
          <button type="button" class="btn ghost sm" data-a="nologo" hidden>Remove logo</button>
        </div>
      </section>

      <section class="pb-sec" aria-labelledby="pb-h-list">
        <h3 id="pb-h-list">Services and prices</h3>
        <p class="small muted pb-hint">Type a plain number like <b>45</b> and the currency sign is added. Write <b>45+</b> for a starting price, or anything else, like “from $45” or “$90 / 60 min”. Press Enter in a price box to add the next service.</p>
        <div class="pb-list"></div>
        <p class="pb-listbtns"><button type="button" class="btn ghost sm" data-a="addsec">+ Add a section</button> <span class="small muted pb-count" aria-live="polite"></span></p>
        <details class="pb-paste">
          <summary>Paste a price list you already have</summary>
          <p class="small muted">One service per line with the price at the end, like “Women's cut $65+”. A line without a price starts a new section, and a line starting with “-” or “(” right under a service becomes its note. You can also paste columns from a spreadsheet.</p>
          <label for="pb-pastebox" class="sr">Price list to paste</label>
          <textarea id="pb-pastebox" rows="7" placeholder="Haircuts&#10;Women's cut $65+&#10;Men's cut $40&#10;Color&#10;Balayage $195+&#10;- includes toner and blow-dry"></textarea>
          <p class="pb-pastebtns"><button type="button" class="btn sm" data-a="pastereplace">Replace my list</button> <button type="button" class="btn ghost sm" data-a="pasteadd">Add to my list</button></p>
        </details>
      </section>

      <section class="pb-sec" aria-labelledby="pb-h-foot">
        <h3 id="pb-h-foot">Bottom of the page</h3>
        <div><label for="pb-fine">Fine print (optional)</label><textarea id="pb-fine" name="fine" rows="3" maxlength="${C.MAXLEN.fine}" placeholder="e.g. Prices are starting prices. Please give 24 hours' notice to cancel."></textarea></div>
        ${field("contact", "Contact line (optional)", `maxlength="${C.MAXLEN.contact}" placeholder="Phone · address · website"`)}
        <div class="row">
          ${field("qrUrl", "QR code link (optional)", `type="text" inputmode="url" maxlength="${C.MAXLEN.qrUrl}" placeholder="e.g. yoursalon.com/book"`)}
          ${field("qrLabel", "QR caption", `maxlength="${C.MAXLEN.qrLabel}"`)}
        </div>
        <p class="small muted pb-hint">The QR code is a plain link made on your device. It never expires and doesn't go through us. Scan it with your phone before you print a batch.</p>
      </section>

      <section class="pb-sec" aria-labelledby="pb-h-size">
        <h3 id="pb-h-size">Size</h3>
        <div><label for="pb-format">Paper or screen size</label><select id="pb-format" name="format"><optgroup label="Print">${fmtOpts(true)}</optgroup><optgroup label="Screens and social media">${fmtOpts(false)}</optgroup></select></div>
        <div class="pb-orient">${select("orient", "Orientation", opt("portrait", "Portrait (tall)") + opt("landscape", "Landscape (wide)"))}</div>
        <div class="pb-onsheet">${check("onSheet", "Print it in the middle of a full sheet with crop marks, then trim")}</div>
      </section>

      <section class="pb-sec" aria-labelledby="pb-h-look">
        <h3 id="pb-h-look">Look</h3>
        <div class="pb-pals" role="group" aria-label="Ready-made looks">${C.PALETTES.map((p, i) => `<button type="button" class="pb-pal" data-pal="${i}" aria-label="Look: ${esc(p.name)}" title="${esc(p.name)}"><span style="background:${p.theme === "dark" ? "#131316" : "#fff"}"><i style="background:${p.color}"></i></span></button>`).join("")}</div>
        <div class="row">
          ${select("theme", "Style", Object.entries(C.THEMES).map(([k, v]) => opt(k, v)).join(""))}
          <div><label for="pb-color">Accent colour</label><input type="color" id="pb-color" name="color"></div>
        </div>
        <div class="row">
          ${select("font", "Font", Object.entries(C.FONTS).map(([k, v]) => opt(k, v.label)).join(""))}
          ${select("cols", "Columns", opt("auto", "Automatic (best fit)") + opt("1", "1 column") + opt("2", "2 columns") + opt("3", "3 columns"))}
        </div>
        <div class="row">
          ${select("cur", "Currency sign for plain numbers", Object.entries(C.CURRENCIES).map(([k, v]) => opt(k, v)).join(""))}
          <div class="pb-checks">${check("leaders", "Dot leaders (Cut ….. $30)")}${check("caps", "Section titles in capitals")}</div>
        </div>
      </section>
      <div class="pb-actions pb-mobile-dl"><button type="button" class="btn" data-a="main">Download</button></div>
      <p class="pb-reset"><button type="button" class="btn ghost sm" data-a="reset">Reset to the sample menu</button> <span class="small muted">Your list and logo are saved in this browser as you type.</span></p>
    </form>

    <div class="pb-out">
      <div class="pb-actions">
        <button type="button" class="btn" data-a="main">Download</button>
        <button type="button" class="btn ghost" data-a="alt">Image (PNG)</button>
      </div>
      <p class="pb-sum small" aria-live="polite"></p>
      <div class="pb-msg small" role="status" aria-live="polite"></div>
      <figure class="pb-fig"><div class="pb-svg" role="img" aria-label="Preview of the price list"></div><figcaption class="small muted"></figcaption></figure>
      <ul class="pb-facts small"></ul>
    </div>
  </div>`;

  const $ = s => mount.querySelector(s);
  const $$ = s => [...mount.querySelectorAll(s)];
  const form = $(".pb-form");
  const KEYS = ["business", "tagline", "fine", "contact", "qrUrl", "qrLabel", "format", "orient", "onSheet", "theme", "color", "font", "cols", "cur", "leaders", "caps"];
  const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
  const okLogo = l => (isObj(l) && typeof l.dataUrl === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(l.dataUrl) && +l.aspect > 0.01 && +l.aspect < 100) ? { dataUrl: l.dataUrl, aspect: +l.aspect } : null;
  const okSections = v => Array.isArray(v) ? v.filter(isObj).slice(0, C.MAX_SECTIONS).map(x => ({
    title: typeof x.title === "string" ? x.title : "",
    items: (Array.isArray(x.items) ? x.items : []).filter(isObj).slice(0, C.MAX_ITEMS).map(i => ({ name: String(i.name ?? ""), price: String(i.price ?? ""), note: String(i.note ?? "") })),
  })) : null;
  const okState = v => {
    if (!isObj(v)) return null;
    const out = C.presetState(C.isPreset(v.preset) ? v.preset : "hair");
    for (const k of KEYS) if (k in v && ["string", "number", "boolean"].includes(typeof v[k])) out[k] = v[k];
    const secs = okSections(v.sections);
    if (secs) out.sections = secs;
    out.landing = typeof v.landing === "string" ? v.landing : "";
    return out;
  };

  // The home page restores your last list. A landing page restores it only if you edited it on that same page,
  // so a visitor from "barbershop price list" doesn't land on someone else's nail menu.
  const saved = okState(store.get("last", null));
  const fresh = () => C.presetState(presetName || "hair", { format: formatName || (letterRegion() ? "letter" : "a4"), landing });
  let st = saved && (!landing || saved.landing === landing) ? saved : fresh();
  st.landing = landing;
  let logo = okLogo(store.get("logo", null));
  let logoBytes = null;
  let logoNote = "";
  let pasteNote = "";

  const total = () => st.sections.reduce((a, x) => a + x.items.length, 0);
  function drawList() {
    const full = total() >= C.MAX_TOTAL;
    $(".pb-list").innerHTML = st.sections.map((sec, si) => {
      const name = sec.title || `Section ${si + 1}`;
      return `
      <fieldset class="pb-secbox">
        <legend class="sr">${esc(name)}</legend>
        <div class="pb-sechead">
          <input class="pb-sectitle" data-s="${si}" data-f="title" value="${esc(sec.title)}" maxlength="${C.TITLELEN}" aria-label="Section ${si + 1} title" placeholder="Section title, e.g. Haircuts">
          <button type="button" class="pb-ib" data-a="secup" data-s="${si}" aria-label="Move ${esc(name)} up"${si === 0 ? " disabled" : ""}>↑</button>
          <button type="button" class="pb-ib" data-a="secdown" data-s="${si}" aria-label="Move ${esc(name)} down"${si === st.sections.length - 1 ? " disabled" : ""}>↓</button>
          <button type="button" class="pb-ib" data-a="secdel" data-s="${si}" aria-label="Delete ${esc(name)}">×</button>
        </div>
        <ol class="pb-items">${sec.items.map((it, ii) => `
          <li class="pb-item">
            <input data-s="${si}" data-i="${ii}" data-f="name" value="${esc(it.name)}" maxlength="${C.ITEMLEN.name}" placeholder="Service" aria-label="${esc(name)}, service ${ii + 1}" enterkeyhint="next">
            <input class="pb-price" data-s="${si}" data-i="${ii}" data-f="price" value="${esc(it.price)}" maxlength="${C.ITEMLEN.price}" placeholder="Price" aria-label="Price for service ${ii + 1}" enterkeyhint="next">
            <input class="pb-note" data-s="${si}" data-i="${ii}" data-f="note" value="${esc(it.note)}" maxlength="${C.ITEMLEN.note}" placeholder="Note (optional)" aria-label="Note for service ${ii + 1}">
            <span class="pb-rowbtns"><button type="button" class="pb-ib" data-a="itemup" data-s="${si}" data-i="${ii}" aria-label="Move service ${ii + 1} up"${ii === 0 ? " disabled" : ""}>↑</button><button type="button" class="pb-ib" data-a="itemdel" data-s="${si}" data-i="${ii}" aria-label="Delete service ${ii + 1}">×</button></span>
          </li>`).join("")}</ol>
        <button type="button" class="btn ghost sm" data-a="additem" data-s="${si}"${full || sec.items.length >= C.MAX_ITEMS ? " disabled" : ""}>+ Add a service</button>
      </fieldset>`;
    }).join("");
    $('[data-a="addsec"]').disabled = st.sections.length >= C.MAX_SECTIONS;
    $(".pb-count").textContent = `${plural(total(), "service")} in ${plural(st.sections.length, "section")} (up to ${C.MAX_TOTAL} services)`;
  }
  function writeForm() {
    for (const k of KEYS) {
      const el = form.elements[k];
      if (!el) continue;
      if (el.type === "checkbox") el.checked = !!st[k];
      else el.value = st[k] ?? "";
    }
    $$('input[name="preset"]').forEach(r => { r.checked = r.value === st.preset; });
    $('[data-a="nologo"]').hidden = !logo;
    drawList();
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
  const inch = v => String(+(v / 72).toFixed(2)), mmv = v => Math.round((v / 72) * 25.4);
  function render() {
    const { s, errors, lost, dropped } = C.normalize(st);
    const f = C.FORMATS[s.format], page = C.pageSize(s), sheet = C.sheetFor(s);
    $(".pb-orient").hidden = !f.print;
    $(".pb-onsheet").hidden = !f.sheet;
    const mainLabel = f.print ? "Download print-ready PDF" : "Download image (PNG)", altLabel = f.print ? "Image (PNG)" : "PDF";
    $$('[data-a="main"]').forEach(b => { b.textContent = mainLabel; b.disabled = !!errors.length; });
    $$('[data-a="alt"]').forEach(b => { b.textContent = altLabel; b.disabled = !!errors.length; });
    store.set("last", st);
    if (errors.length) {
      $(".pb-sum").innerHTML = `<span class="pb-err">${esc(errors[0])}</span>`;
      $(".pb-msg").innerHTML = "";
      last = null;
      return;
    }
    const qr = qrFor(s.qrUrl);
    const lay = C.layout(s, { logo: logo ? { aspect: logo.aspect } : null, qr: qr.data, credit: C.wantsCredit(s) });
    last = { s, lay, qr: qr.data, page, sheet };
    $(".pb-svg").innerHTML = C.svg(lay, logo && logo.dataUrl);
    $(".pb-svg").style.maxWidth = page.w >= page.h ? "none" : Math.round(560 * page.w / page.h) + "px";
    $(".pb-fig figcaption").textContent = sheet.marks ? `Preview. The PDF puts it in the middle of a ${sheet.sheet} sheet with crop marks.` : "Preview, as it prints";
    const n = C.countItems(s), fsTxt = page.print ? `${Math.round(lay.fs * 10) / 10} pt` : `about ${Math.round(lay.fs * page.px / page.w)} px`;
    $(".pb-sum").textContent = `${plural(n, "service")} in ${plural(s.sections.length, "section")}, ${plural(lay.cols, "column")}, text ${fsTxt}. ${page.print ? "One-page PDF" : "PNG image"}, ${page.label.replace(/ \(.*\)$/, "")}${page.print && s.orient === "landscape" ? ", landscape" : ""}.`;
    const facts = [];
    if (page.print) {
      facts.push(`Page: ${inch(page.w)} × ${inch(page.h)} in (${mmv(page.w)} × ${mmv(page.h)} mm)${sheet.marks ? `, printed on ${sheet.sheet} and trimmed` : ""}`);
      facts.push("Print at 100% / Actual size, not Fit to page");
      if (s.theme === "dark") facts.push("The dark style uses a lot of ink. It's made for screens; the light styles print better at home.");
      if (s.format === "tabloid" || s.format === "a3") facts.push("Poster sizes print at a copy shop or on a printer that takes large paper");
    } else {
      facts.push(`Image: ${page.px} × ${Math.round(page.px * page.h / page.w)} px`);
      facts.push(s.format === "tv" ? "Show it on a TV from a USB stick or a casting app, as a photo" : "Post it, pin it in your story highlights or set it as your booking page image");
    }
    $(".pb-facts").innerHTML = facts.map(x => `<li>${esc(x)}</li>`).join("");
    const msgs = [];
    if (pasteNote) msgs.push(pasteNote);
    if (lay.overflow) msgs.push(`${plural(lay.dropped, "service")} didn't fit and ${lay.dropped === 1 ? "is" : "are"} left out. Pick a bigger size, shorten the notes or split the list over two pages.`);
    if (lay.cut.length) msgs.push(`Shortened to fit: ${lay.cut.join(", ")}. Try shorter wording.`);
    if (page.print && lay.fs < 8 && !lay.overflow) msgs.push(`The text is small (${Math.round(lay.fs * 10) / 10} pt). A bigger paper size, landscape or a shorter list reads better from a distance.`);
    if (dropped) msgs.push(`${plural(dropped, "service")} over the limit ${dropped === 1 ? "was" : "were"} left out (${C.MAX_ITEMS} per section, ${C.MAX_TOTAL} in total).`);
    if (lost.length) msgs.push(`These characters can't be printed with the built-in PDF fonts and were left out: ${lost.join(" ")}`);
    if (qr.error) msgs.push(qr.error);
    if (logo && logoNote) msgs.push(logoNote);
    $(".pb-msg").innerHTML = msgs.map(m => `<p class="pb-warn">${esc(m)}</p>`).join("");
  }

  // ---- events
  const listInput = t => t.dataset && t.dataset.f !== undefined && t.dataset.s !== undefined;
  form.addEventListener("input", e => {
    const t = e.target;
    if (t.name === "preset" || t.id === "pb-logo" || t.id === "pb-pastebox") return;
    if (listInput(t)) {
      const sec = st.sections[+t.dataset.s];
      if (!sec) return;
      if (t.dataset.i === undefined) sec.title = t.value;
      else if (sec.items[+t.dataset.i]) sec.items[+t.dataset.i][t.dataset.f] = t.value;
    } else readForm();
    schedule();
  });
  form.addEventListener("change", e => {
    const t = e.target;
    if (t.name === "preset") return onPreset(t);
    if (t.id === "pb-logo") return onLogo(t);
    if (listInput(t) || t.id === "pb-pastebox") return;
    readForm();
    schedule();
  });
  form.addEventListener("submit", e => e.preventDefault());
  // Enter moves name → price → next service, adding one at the end of a section.
  form.addEventListener("keydown", e => {
    const t = e.target;
    if (e.key !== "Enter" || !listInput(t) || e.isComposing) return;
    e.preventDefault();
    const si = +t.dataset.s, ii = t.dataset.i === undefined ? -1 : +t.dataset.i;
    const focus = (i, f) => { const el = $(`[data-s="${si}"][data-i="${i}"][data-f="${f}"]`); if (el) el.focus(); return !!el; };
    if (t.dataset.f === "title") { if (!focus(0, "name")) addItem(si); return; }
    if (t.dataset.f === "name") { focus(ii, "price"); return; }
    if (!focus(ii + 1, "name")) addItem(si);
  });
  function addItem(si) {
    const sec = st.sections[si];
    if (!sec || sec.items.length >= C.MAX_ITEMS || total() >= C.MAX_TOTAL) return;
    sec.items.push({ name: "", price: "", note: "" });
    drawList(); schedule();
    const el = $(`[data-s="${si}"][data-i="${sec.items.length - 1}"][data-f="name"]`);
    if (el) el.focus();
  }
  const swap = (arr, a, b) => { [arr[a], arr[b]] = [arr[b], arr[a]]; };
  mount.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.pal != null) { const p = C.PALETTES[+b.dataset.pal]; st.color = p.color; st.theme = p.theme; writeForm(); schedule(); return; }
    const a = b.dataset.a, si = +b.dataset.s, ii = +b.dataset.i;
    const sec = st.sections[si];
    if (a === "main") return last && (last.page.print ? download() : exportPng());
    if (a === "alt") return last && (last.page.print ? exportPng() : download());
    if (a === "addsec") {
      if (st.sections.length >= C.MAX_SECTIONS) return;
      st.sections.push({ title: "", items: total() < C.MAX_TOTAL ? [{ name: "", price: "", note: "" }] : [] });
      drawList(); schedule();
      const el = $(`[data-s="${st.sections.length - 1}"][data-f="title"]`);
      if (el) el.focus();
      return;
    }
    if (a === "additem") return addItem(si);
    if (a === "secup" && si > 0) swap(st.sections, si, si - 1);
    else if (a === "secdown" && si < st.sections.length - 1) swap(st.sections, si, si + 1);
    else if (a === "secdel" && sec) {
      if (sec.items.some(i => i.name || i.price) && !confirm(`Delete the section “${sec.title || "Untitled"}” and its ${plural(sec.items.length, "service")}?`)) return;
      st.sections.splice(si, 1);
    } else if (a === "itemup" && sec && ii > 0) swap(sec.items, ii, ii - 1);
    else if (a === "itemdel" && sec) sec.items.splice(ii, 1);
    else if (a === "pastereplace" || a === "pasteadd") return onPaste(a === "pasteadd");
    else if (a === "nologo") { logo = null; logoBytes = null; logoNote = ""; store.set("logo", null); $("#pb-logo").value = ""; b.hidden = true; schedule(); return; }
    else if (a === "reset") {
      if (!confirm("Reset everything to the sample menu and remove your saved logo?")) return;
      st = fresh(); logo = null; logoBytes = null; logoNote = ""; pasteNote = ""; store.set("logo", null); store.set("last", null);
      $("#pb-logo").value = "";
      writeForm(); schedule(); flash("Reset to the sample menu.");
      return;
    } else return;
    drawList(); schedule();
    // keep keyboard focus on the moved row's button
    const to = a === "secup" ? `[data-a="secup"][data-s="${si - 1}"]` : a === "secdown" ? `[data-a="secdown"][data-s="${si + 1}"]` : a === "itemup" ? `[data-a="itemup"][data-s="${si}"][data-i="${ii - 1}"]` : "";
    const el = to && $(to);
    if (el && !el.disabled) el.focus();
  });

  function onPreset(t) {
    const cur = C.presetValues(st.preset);
    const edited = JSON.stringify(st.sections) !== JSON.stringify(cur.sections);
    if (edited && !confirm(`Replace your services with the sample ${C.PRESETS[t.value].label.toLowerCase()} menu? Your business name and contact details stay.`)) {
      $$('input[name="preset"]').forEach(r => { r.checked = r.value === st.preset; });
      return;
    }
    // Keep your own name, tagline and contact details; replace the sample services and the look.
    const keep = {};
    for (const k of ["business", "tagline", "fine", "contact", "qrUrl", "qrLabel"]) if (st[k] !== cur[k]) keep[k] = st[k];
    st = Object.assign({}, st, C.presetValues(t.value), keep, { preset: t.value });
    pasteNote = "";
    writeForm();
    schedule();
  }
  function onPaste(add) {
    const box = $("#pb-pastebox");
    const secs = C.parseMenu(box.value);
    const n = secs.reduce((a, x) => a + x.items.length, 0);
    if (!n) { flash("No prices found. Put each service on its own line with the price at the end, like “Men's cut $40”.", true); return; }
    if (!add && st.sections.some(x => x.items.some(i => i.name || i.price)) && !confirm(`Replace your list with the ${plural(n, "service")} you pasted?`)) return;
    const merged = (add ? st.sections : []).concat(secs.map(x => ({ title: x.title, items: x.items })));
    const { s, dropped } = C.normalize({ sections: merged });
    st.sections = s.sections.map(x => ({ title: x.title, items: x.items.map(i => ({ name: i.name, price: i.price, note: i.note })) }));
    pasteNote = `Added ${plural(n - dropped, "service")} from your text. Check the names and prices below.`;
    box.value = "";
    drawList(); schedule();
    track("paste_menu", { count: n });
  }

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
  function flash(html, isErr) { $(".pb-msg").innerHTML = `<p class="${isErr ? "pb-err" : "pb-ok"}">${isErr ? esc(html) : html}</p>`; }
  const fileBase = s => `${slug(s.business)}-price-list-${s.format}`;
  async function download() {
    if (busy || !last) return;
    busy = true;
    const btns = $$('[data-a="main"],[data-a="alt"]');
    btns.forEach(b => { b.disabled = true; });
    flash("Building PDF…");
    try {
      if (!window.PDFLib) await loadScript("/vendor/pdf-lib.min.js");
      const { s } = last;
      const r = await C.buildPdf(window.PDFLib, st, { logo: logoPayload(), qr: last.qr });
      const name = fileBase(s) + ".pdf";
      saveBlob(new Blob([r.bytes], { type: "application/pdf" }), name);
      flash(`Saved <b>${esc(name)}</b>. Print at 100% / Actual size${r.sheet.marks ? ", then trim along the crop marks" : ""}.`);
      track("pdf_download", { format: s.format, count: C.countItems(s) });
    } catch (err) {
      flash("Couldn't build the PDF: " + (err && err.message ? err.message : err), true);
    } finally { busy = false; btns.forEach(b => { b.disabled = false; }); }
  }
  // Image sizes export at their pixel size; print sizes at 300 dpi, kept under ~12 megapixels for phones.
  function exportPng() {
    if (!last) return;
    const { s, lay, page } = last;
    let w = page.px || Math.round((page.w / 72) * 300);
    if (w * w * (page.h / page.w) > 12e6) w = Math.floor(Math.sqrt(12e6 * page.w / page.h));
    const h = Math.round((w * page.h) / page.w);
    const svg = C.svg(lay, logo && logo.dataUrl, { px: w });
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const x = cv.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
      x.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      cv.toBlob(b => {
        if (!b) { flash("Your browser couldn't make the image. Try a smaller size.", true); return; }
        const name = fileBase(s) + ".png";
        saveBlob(b, name);
        flash(`Saved <b>${esc(name)}</b> (${w} × ${h} px).`);
        track("png_download", { format: s.format });
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); flash("Your browser couldn't draw the image. Try another browser.", true); };
    img.src = url;
  }

  writeForm();
  render();
})();
