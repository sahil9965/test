// TicketRun UI. #tr-tool mounts the ticket generator (data-preset / data-start / data-end /
// data-per-page set landing-page defaults); #tr-picker mounts the fair raffle winner picker.
// Everything runs in the browser: PDFs are built with pdf-lib in a Web Worker, nothing is uploaded.
(() => {
  const C = window.TRCore;
  if (!C) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("tr_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("tr_" + k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  const track = (name, data) => { try { window.va && window.va("event", data ? { name, data } : { name }); } catch {} };
  const allow = reason => !window.Pro || window.Pro.require(reason);
  const fmtInt = n => Number(n).toLocaleString("en-US");
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tickets";
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

  /* ---------------------------------------------------------- PDF engine */
  let worker = null, workerBroken = false, jobId = 0;
  const loadScript = src => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load the PDF engine. Check your connection and try again."));
    document.head.appendChild(s);
  });
  async function makePdf(kind, state, opts, onProgress) {
    if (!workerBroken && window.Worker) {
      try {
        if (!worker) worker = new Worker("/pdf-worker.js");
        const id = ++jobId;
        return await new Promise((resolve, reject) => {
          const onMsg = e => {
            const d = e.data || {};
            if (d.id !== id) return;
            if (d.progress != null && !d.done) { onProgress && onProgress(d.progress, d.n, d.t); return; }
            worker.removeEventListener("message", onMsg);
            worker.removeEventListener("error", onErr);
            if (d.error) reject(Object.assign(new Error(d.error), { fromTool: true }));
            else resolve({ bytes: d.bytes, info: d.info });
          };
          const onErr = e => { worker.removeEventListener("message", onMsg); worker.removeEventListener("error", onErr); e.preventDefault && e.preventDefault(); reject(new Error("worker")); };
          worker.addEventListener("message", onMsg);
          worker.addEventListener("error", onErr);
          worker.postMessage({ id, kind, state, opts });
        });
      } catch (err) {
        if (err.fromTool) throw err;
        workerBroken = true; // fall back to the main thread below
        try { worker && worker.terminate(); } catch {}
        worker = null;
      }
    }
    if (!window.PDFLib) await loadScript("/vendor/pdf-lib.min.js");
    const fn = kind === "seller" ? C.buildSellerPdf : C.buildTicketPdf;
    const r = await fn(window.PDFLib, state, Object.assign({}, opts, { onProgress }));
    return { bytes: r.bytes, info: r };
  }

  const genMount = document.getElementById("tr-tool");
  if (genMount) initGenerator(genMount);
  const pickMount = document.getElementById("tr-picker");
  if (pickMount) initPicker(pickMount);

  /* =================================================== ticket generator */
  function initGenerator(mount) {
    const ds = mount.dataset;
    const presetName = ds.preset || "";
    const chip = (v, label) => `<label class="tr-chip"><input type="radio" name="preset" value="${v}"><span>${label}</span></label>`;
    const opt = (v, t) => `<option value="${v}">${t}</option>`;
    const field = (name, label, attrs = "", help = "") => `<div><label for="tr-${name}">${label}</label><input id="tr-${name}" name="${name}" ${attrs}>${help}</div>`;
    const check = (name, label) => `<label class="tr-check"><input type="checkbox" name="${name}"> ${label}</label>`;
    mount.innerHTML = `
  <div class="tr">
    <form class="tr-form" autocomplete="off" novalidate>
      <fieldset class="tr-types">
        <legend>Ticket type</legend>
        <div class="tr-chips">${Object.entries(C.PRESETS).map(([k, p]) => chip(k, p.label)).join("")}</div>
      </fieldset>

      <section class="tr-sec" aria-labelledby="tr-h-num">
        <h3 id="tr-h-num">Numbers</h3>
        <div class="tr-g3">
          ${field("start", "First number", 'type="text" inputmode="numeric" pattern="[0-9]*" maxlength="9"')}
          ${field("end", "Last number", 'type="text" inputmode="numeric" pattern="[0-9]*" maxlength="9"')}
          <div><label for="tr-pad">Digits</label><select id="tr-pad" name="pad">${opt("auto", "Auto (001)")}${opt("none", "No zeros (1)")}${["2", "3", "4", "5", "6"].map(n => opt(n, `${n} digits (${"1".padStart(+n, "0")})`)).join("")}</select></div>
        </div>
        <div class="tr-g3">
          ${field("prefix", "Prefix", 'maxlength="16" placeholder="e.g. A-"')}
          ${field("suffix", "Suffix", 'maxlength="16" placeholder="optional"')}
          ${field("numLabel", "Label", 'maxlength="12" placeholder="No."')}
        </div>
        <p class="tr-count small muted" aria-live="polite"></p>
      </section>

      <section class="tr-sec" aria-labelledby="tr-h-text">
        <h3 id="tr-h-text">Ticket text</h3>
        ${field("title", "Event name", 'maxlength="120"')}
        ${field("subtitle", "Prize or main line", 'maxlength="160"')}
        <div class="row">
          ${field("date", "Date and time", 'maxlength="120"')}
          ${field("venue", "Location", 'maxlength="120"')}
        </div>
        <div class="row">
          ${field("price", "Price", 'maxlength="40" placeholder="e.g. $5 or 3 for $10"')}
          ${field("typeLabel", "Small label", 'maxlength="40" placeholder="e.g. Raffle ticket"')}
        </div>
        <div><label for="tr-fine">Small print</label><textarea id="tr-fine" name="fine" maxlength="240" rows="2"></textarea></div>
        ${check("bigNumber", "Big number layout (coat-check style)")}
      </section>

      <details class="tr-sec tr-fold" open>
        <summary><h3>Stub</h3></summary>
        <div class="row">
          <div><label for="tr-stub">Stub style</label><select id="tr-stub" name="stub">${opt("lines", "Write-in lines (raffle)")}${opt("claim", "Big number (two-part)")}${opt("none", "No stub")}</select></div>
          <div><label for="tr-stubPct">Stub width</label><select id="tr-stubPct" name="stubPct">${opt("30", "30% of ticket")}${opt("36", "36% of ticket")}${opt("42", "42% of ticket")}${opt("50", "Half (50%)")}</select></div>
        </div>
        <p class="tr-stubnote small muted" hidden>Tickets printed 20 per page are too small for a stub.</p>
        <div class="tr-stubopts">
          ${field("stubTitle", "Stub heading", 'maxlength="60" placeholder="optional, e.g. Keep for the draw"')}
          <div class="tr-lines-only">
            <p class="tr-lbl">Write-in lines</p>
            <div class="tr-checks">${check("stubName", "Name")}${check("stubPhone", "Phone")}${check("stubEmail", "Email")}</div>
            ${field("stubExtra", "Extra line", 'maxlength="24" placeholder="e.g. Address or Seller"')}
          </div>
          <div class="tr-claim-only">${field("stubNote", "Stub note", 'maxlength="90" placeholder="e.g. Guest copy"')}</div>
        </div>
      </details>

      <details class="tr-sec tr-fold" open>
        <summary><h3>Paper and layout</h3></summary>
        <div class="row">
          <div><label for="tr-paper">Paper</label><select id="tr-paper" name="paper">${opt("letter", "US Letter (8.5 × 11 in)")}${opt("a4", "A4 (210 × 297 mm)")}</select></div>
          <div><label for="tr-perPage">Tickets per page</label><select id="tr-perPage" name="perPage">${opt("8", "8 per page (large)")}${opt("10", "10 per page")}${opt("20", "20 per page (small, no stub)")}</select></div>
        </div>
        <div><label for="tr-order">Number order</label><select id="tr-order" name="order">${opt("row", "In order on each sheet (1–10, 11–20…)")}${opt("stack", "Cut-and-stack (piles come out in order)")}</select></div>
        <div class="tr-checks">${check("crop", "Crop marks")}${check("borders", "Cut lines around tickets")}</div>
      </details>

      <details class="tr-sec tr-fold">
        <summary><h3>Design, colour and logo</h3></summary>
        <div class="row">
          <div><label for="tr-design">Design</label><select id="tr-design" name="design">${opt("classic", "Classic (tinted stub)")}${opt("bold", "Bold (solid colour stub)")}${opt("minimal", "Minimal (black ink only)")}</select></div>
          <div><label for="tr-font">Font</label><select id="tr-font" name="font">${opt("sans", "Sans serif (Helvetica)")}${opt("serif", "Serif (Times)")}</select></div>
        </div>
        <div class="tr-color">
          <div><label for="tr-color">Accent colour</label><input type="color" id="tr-color" name="color"></div>
          <div class="tr-swatches" role="group" aria-label="Colour presets">${["#be123c", "#1d4ed8", "#047857", "#7c3aed", "#c2410c", "#0f172a"].map(c => `<button type="button" class="tr-sw" data-color="${c}" style="background:${c}" aria-label="Use colour ${c}"></button>`).join("")}</div>
        </div>
        <div class="tr-logo">
          <label for="tr-logo">Logo or image (PNG, JPG, SVG)</label>
          <input type="file" id="tr-logo" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif">
          <button type="button" class="btn ghost sm" data-a="nologo" hidden>Remove logo</button>
        </div>
      </details>

      <details class="tr-sec tr-fold tr-guests">
        <summary><h3>Named tickets from a guest list</h3></summary>
        <p class="small muted">Paste a list or open a CSV (first row = column names). One ticket is made per row, numbered from your first number. Save Excel or Google Sheets files as CSV first.</p>
        <label for="tr-csv">Guest list</label>
        <textarea id="tr-csv" rows="4" placeholder="Name,Table,Meal&#10;Jane Doe,4,Vegetarian&#10;Sam Lee,4,Chicken"></textarea>
        <div class="row">
          <div><label for="tr-csvfile">Or open a CSV file</label><input type="file" id="tr-csvfile" accept=".csv,.txt,.tsv,text/csv,text/plain"></div>
          <div><label for="tr-namecol">Name column</label><select id="tr-namecol"></select></div>
        </div>
        <div class="tr-extracols"></div>
        <p class="tr-csvmsg small" aria-live="polite"></p>
        <button type="button" class="btn ghost sm" data-a="clearcsv">Clear guest list</button>
      </details>

      <details class="tr-sec tr-fold tr-books">
        <summary><h3>Seller books and tracking sheet</h3></summary>
        <p class="small muted">Split the run into books for volunteer sellers, print the book number on each stub, and download a log to record who took which numbers, what came back and the cash.</p>
        <div class="row">
          <div><label for="tr-books">Tickets per book</label><input id="tr-books" type="text" inputmode="numeric" maxlength="4"></div>
          <div><label for="tr-bps">Books per seller</label><input id="tr-bps" type="text" inputmode="numeric" maxlength="4"></div>
        </div>
        <label class="tr-check"><input type="checkbox" id="tr-showBook"> Print the book number on each stub</label>
        <label for="tr-sellers">Seller names (optional, one per line)</label>
        <textarea id="tr-sellers" rows="3" placeholder="Maria Lopez&#10;Tom Becker"></textarea>
        <p class="tr-bookmsg small muted"></p>
        <button type="button" class="btn ghost sm" data-a="seller">Download seller log (PDF)</button>
      </details>

      <details class="tr-sec tr-fold">
        <summary><h3>Saved designs</h3></summary>
        <p class="small muted">Save this design to reuse next time (stored only in this browser).</p>
        <div class="tr-saverow"><label for="tr-savename" class="sr">Design name</label><input id="tr-savename" maxlength="60" placeholder="e.g. Spring raffle 2027"><button type="button" class="btn ghost sm" data-a="save">Save design</button></div>
        <ul class="tr-saved"></ul>
      </details>
      <div class="tr-mobile-dl"><button type="button" class="btn" data-a="pdf">Download PDF</button></div>
    </form>

    <div class="tr-out">
      <div class="tr-actions">
        <button type="button" class="btn" data-a="pdf">Download PDF</button>
        <button type="button" class="btn ghost" data-a="test">Test sheet</button>
        <button type="button" class="btn ghost" data-a="png">Ticket image</button>
      </div>
      <p class="tr-sum small" aria-live="polite"></p>
      <div class="tr-prog" hidden><progress max="100" value="0" aria-label="PDF progress"></progress><span class="small muted"></span></div>
      <div class="tr-msg small" role="status" aria-live="polite"></div>
      <figure class="tr-ticket"><div class="tr-tsvg" role="img" aria-label="Preview of the first ticket"></div><figcaption class="small muted">First ticket preview</figcaption></figure>
      <div class="tr-sheetrow">
        <figure class="tr-sheet"><div class="tr-ssvg" role="img" aria-label="Preview of sheet 1"></div></figure>
        <ul class="tr-facts small"></ul>
      </div>
    </div>
  </div>`;

    const $ = s => mount.querySelector(s);
    const $$ = s => [...mount.querySelectorAll(s)];
    const form = $(".tr-form");
    const KEYS = ["start", "end", "prefix", "suffix", "pad", "numLabel", "typeLabel", "title", "subtitle", "date", "venue", "price", "fine", "bigNumber", "stub", "stubPct", "stubTitle", "stubNote", "stubName", "stubPhone", "stubEmail", "stubExtra", "paper", "perPage", "order", "crop", "borders", "design", "color", "font"];

    // ---- initial state
    const saved = !presetName ? store.get("last", null) : null;
    let st, extra = { books: 25, bps: 1, showBook: false, sellers: "" };
    if (saved && saved.st) {
      st = Object.assign(C.presetState(saved.st.preset || "raffle"), saved.st);
      extra = Object.assign(extra, saved.extra || {});
    } else {
      st = C.presetState(presetName || "raffle", { paper: defaultPaper() });
      if (ds.start) st.start = +ds.start;
      if (ds.end) st.end = +ds.end;
      if (ds.perPage) st.perPage = +ds.perPage;
      if (ds.pad) st.pad = ds.pad;
    }
    let logo = !presetName ? store.get("logo", null) : null; // { dataUrl, aspect }
    let logoBytes = null;
    let guests = null; // { rows, head, nameCol, extra:[], list:[{v0,v1}] }

    function writeForm() {
      for (const k of KEYS) {
        const el = form.elements[k];
        if (!el) continue;
        if (el.type === "checkbox") el.checked = !!st[k];
        else el.value = st[k] ?? "";
      }
      $$('input[name="preset"]').forEach(r => { r.checked = r.value === st.preset; });
      $("#tr-books").value = extra.books;
      $("#tr-bps").value = extra.bps;
      $("#tr-showBook").checked = !!extra.showBook;
      $("#tr-sellers").value = extra.sellers || "";
      $('[data-a="nologo"]').hidden = !logo;
    }
    function readForm() {
      for (const k of KEYS) {
        const el = form.elements[k];
        if (!el) continue;
        st[k] = el.type === "checkbox" ? el.checked : el.value;
      }
      st.perPage = +st.perPage; st.stubPct = +st.stubPct;
      extra.books = parseInt($("#tr-books").value, 10) || 0;
      extra.bps = parseInt($("#tr-bps").value, 10) || 1;
      extra.showBook = $("#tr-showBook").checked;
      extra.sellers = $("#tr-sellers").value;
    }
    const effective = () => Object.assign({}, st, { perBook: extra.showBook ? Math.max(1, extra.books) : 0 });
    const guestOpt = () => (guests && guests.list.length ? { rows: guests.list } : null);

    // ---- preview
    let last = null, raf = 0;
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); };
    function render() {
      const names = guestOpt();
      const { s, errors, lost } = C.normalize(effective(), names ? { rows: names.rows.length } : {});
      const msgs = [];
      $(".tr-stubnote").hidden = s.perPage !== 20;
      form.elements.stub.disabled = s.perPage === 20;
      $(".tr-stubopts").hidden = s.stub === "none";
      $(".tr-lines-only").hidden = s.stub !== "lines";
      $(".tr-claim-only").hidden = s.stub !== "claim";
      form.elements.stubPct.disabled = s.stub === "none";
      form.elements.end.disabled = !!names;
      if (names) form.elements.end.value = s.end;
      $$('[data-a="pdf"],[data-a="test"],[data-a="png"],[data-a="seller"]').forEach(b => { b.disabled = !!errors.length; });
      if (errors.length) {
        $(".tr-count").textContent = "";
        $(".tr-sum").innerHTML = `<span class="tr-err">${esc(errors[0])}</span>`;
        last = null;
        return;
      }
      const g = C.sheetGeometry(s.paper, s.perPage);
      const vars = names ? (names.rows.some(r => r.v1) ? 2 : 1) : 0;
      const lay = C.layoutTicket(s, g.cellW, g.cellH, { logo: logo ? { aspect: logo.aspect } : null, vars, stubVar: !!names });
      const sheets = C.sheetCount(s.count, s.perPage);
      last = { s, g, lay, sheets };
      $(".tr-tsvg").innerHTML = C.svgTicket(s, lay, g.cellW, g.cellH, 0, names, logo && logo.dataUrl);
      $(".tr-ssvg").innerHTML = C.svgSheet(s, g, lay, 0, names, logo && logo.dataUrl);
      const inch = v => (v / 72).toFixed(2).replace(/0$/, ""), mm = v => Math.round((v / 72) * 25.4);
      const tk = s.count === 1 ? "ticket" : "tickets";
      $(".tr-count").textContent = `${fmtInt(s.count)} ${tk}: ${C.fmtNum(s.start, s)} to ${C.fmtNum(s.end, s)}`;
      $(".tr-sum").textContent = `${fmtInt(s.count)} ${tk} on ${fmtInt(sheets)} ${sheets === 1 ? "sheet" : "sheets"} of ${g.paperName}, ${s.perPage} per page.`;
      const facts = [
        `Ticket size: ${inch(g.cellW)} × ${inch(g.cellH)} in (${mm(g.cellW)} × ${mm(g.cellH)} mm)`,
        s.stub !== "none" ? `Stub: ${inch(lay.stubW)} in wide, dashed tear line` : "No stub",
        s.order === "stack" ? `Cut-and-stack: after cutting, each of the ${s.perPage} piles holds ${fmtInt(Math.ceil(s.count / s.perPage))} tickets in order` : "Numbers run left to right, top to bottom",
        "Print at 100% / Actual size, not Fit to page",
      ];
      $(".tr-facts").innerHTML = facts.map(f => `<li>${esc(f)}</li>`).join("");
      if (lay.cut.length) msgs.push(`Shortened to fit: ${lay.cut.join(", ")}. Try shorter text, a wider stub setting or 8 per page.`);
      if (lost.length) msgs.push(`These characters can't be printed with the built-in PDF fonts and were left out: ${lost.join(" ")}`);
      $(".tr-msg").innerHTML = msgs.map(m => `<p class="tr-warn">${esc(m)}</p>`).join("");
      const nb = extra.books > 0 ? Math.ceil(s.count / extra.books) : 0;
      $(".tr-books .tr-bookmsg").textContent = nb ? `${fmtInt(nb)} ${nb === 1 ? "book" : "books"} of ${extra.books}: book 1 is ${C.fmtNum(s.start, s)}–${C.fmtNum(Math.min(s.end, s.start + extra.books - 1), s)}${nb > 1 ? `, book 2 starts at ${C.fmtNum(s.start + extra.books, s)}` : ""}.` : "";
      if (guests) showGuests();
      if (!presetName) { store.set("last", { st, extra }); }
    }

    // ---- events
    form.addEventListener("input", e => {
      const t = e.target;
      if (t.name === "preset") return;
      if (t.closest(".tr-guests")) return;
      readForm();
      schedule();
    });
    form.addEventListener("change", e => {
      const t = e.target;
      if (t.name === "preset") {
        const keep = {};
        ["start", "end", "prefix", "suffix", "pad", "numLabel", "paper", "order", "crop", "borders", "design", "color", "font"].forEach(k => { keep[k] = st[k]; });
        st = Object.assign(C.presetState(t.value), keep);
        writeForm();
        schedule();
        track("preset_used", { preset: t.value });
        return;
      }
      if (t.id === "tr-logo") return onLogo(t);
      if (t.id === "tr-csvfile") return onCsvFile(t);
      if (t.id === "tr-namecol" || t.closest(".tr-extracols")) return onGuestCols();
      if (t.closest(".tr-guests")) return;
      readForm();
      schedule();
    });
    $("#tr-csv").addEventListener("input", () => { clearTimeout(csvT); csvT = setTimeout(() => onCsvText($("#tr-csv").value), 250); });
    let csvT = 0;
    mount.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.color) { st.color = b.dataset.color; form.elements.color.value = st.color; schedule(); return; }
      const a = b.dataset.a;
      if (a === "pdf") download(false);
      else if (a === "test") download(true);
      else if (a === "png") exportPng();
      else if (a === "seller") sellerLog();
      else if (a === "nologo") { logo = null; logoBytes = null; store.set("logo", null); $("#tr-logo").value = ""; b.hidden = true; schedule(); }
      else if (a === "clearcsv") { guests = null; $("#tr-csv").value = ""; $("#tr-csvfile").value = ""; showGuests(); schedule(); }
      else if (a === "save") saveDesign();
      else if (b.dataset.load != null) loadDesign(+b.dataset.load);
      else if (b.dataset.del != null) delDesign(+b.dataset.del);
    });
    form.addEventListener("submit", e => e.preventDefault());

    // ---- logo: any image is redrawn to a PNG (max 900 px) so pdf-lib can embed it
    function onLogo(input) {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!allow("Add your logo to tickets.")) { input.value = ""; return; }
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
      if (!logoBytes) { const b64 = logo.dataUrl.split(",")[1]; const bin = atob(b64); logoBytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) logoBytes[i] = bin.charCodeAt(i); }
      return { bytes: logoBytes.slice(), type: "png", aspect: logo.aspect };
    };

    // ---- guest list (CSV)
    function onCsvFile(input) {
      const f = input.files && input.files[0];
      if (!f) return;
      if (f.size > 5e6) { flash("That file is over 5 MB. Split the list and try again.", true); return; }
      f.text().then(t => { $("#tr-csv").value = t; onCsvText(t); });
    }
    function onCsvText(text) {
      if (!text.trim()) { guests = null; showGuests(); schedule(); return; }
      if (!allow("Print guest names on tickets.")) return;
      let rows = C.parseCSV(text);
      if (rows.length === 1 || (rows[0] && rows[0].length === 1 && !/name|guest/i.test(rows[0][0]))) rows = [["Name"], ...rows]; // plain list of names
      if (rows.length < 2) { guests = null; showGuests("Add at least one row under the column names."); schedule(); return; }
      if (rows.length - 1 > C.MAX_TICKETS) rows = rows.slice(0, C.MAX_TICKETS + 1);
      const head = rows[0].map((h, i) => h || `Column ${i + 1}`);
      let nameCol = head.findIndex(h => /name|guest|attendee/i.test(h));
      if (nameCol < 0) nameCol = 0;
      const extraCols = head.map((_, i) => i).filter(i => i !== nameCol).slice(0, 3);
      guests = { rows, head, nameCol, extra: extraCols, list: [] };
      buildGuestCols();
      onGuestCols();
      track("guest_list_used");
    }
    function buildGuestCols() {
      const sel = $("#tr-namecol");
      sel.innerHTML = guests.head.map((h, i) => `<option value="${i}">${esc(h)}</option>`).join("") + `<option value="-1">(none)</option>`;
      sel.value = guests.nameCol;
      $(".tr-extracols").innerHTML = `<p class="tr-lbl">Also print</p><div class="tr-checks">` + guests.head.map((h, i) => `<label class="tr-check"${i === guests.nameCol ? " hidden" : ""}><input type="checkbox" value="${i}" ${guests.extra.includes(i) ? "checked" : ""}> ${esc(h)}</label>`).join("") + `</div>`;
    }
    function onGuestCols() {
      if (!guests) return;
      guests.nameCol = +$("#tr-namecol").value;
      $$(".tr-extracols label").forEach(l => { l.hidden = +l.querySelector("input").value === guests.nameCol; });
      guests.extra = $$(".tr-extracols input:checked").map(i => +i.value).filter(i => i !== guests.nameCol).slice(0, 4);
      guests.list = C.guestRows(guests.rows, { name: guests.nameCol, extra: guests.extra });
      showGuests();
      schedule();
    }
    function showGuests(msg) {
      const m = $(".tr-csvmsg");
      if (!guests) { m.textContent = msg || ""; $(".tr-extracols").innerHTML = ""; $("#tr-namecol").innerHTML = ""; return; }
      const n = guests.list.length;
      const { s } = C.normalize(st, { rows: n });
      const onStub = st.stub === "lines" && st.stubName && +st.perPage !== 20;
      m.textContent = `${fmtInt(n)} named ${n === 1 ? "ticket" : "tickets"}, numbered ${C.fmtNum(s.start, s)} to ${C.fmtNum(s.end, s)}. ${guests.nameCol < 0 ? "No name column is selected." : onStub ? "The name goes on the ticket and on the stub's Name line." : "The name goes on each ticket."}`;
    }

    // ---- downloads
    let busy = false;
    function setBusy(on, label) {
      busy = on;
      $(".tr-prog").hidden = !on;
      $$('[data-a="pdf"],[data-a="test"],[data-a="seller"]').forEach(b => { b.disabled = on; });
      if (on) { $(".tr-prog progress").value = 0; $(".tr-prog span").textContent = label || "Building PDF…"; }
    }
    function flash(html, isErr) { $(".tr-msg").innerHTML = `<p class="${isErr ? "tr-err" : "tr-ok"}">${isErr ? esc(html) : html}</p>`; }
    async function download(testOnly) {
      if (busy || !last) return;
      const names = guestOpt();
      const { s } = last;
      setBusy(true, testOnly ? "Building test sheet…" : `Building ${fmtInt(last.sheets)} sheets…`);
      try {
        const { bytes, info } = await makePdf("tickets", effective(), { names, logo: logoPayload(), sheets: testOnly ? 1 : 0 }, (p, n, t) => {
          $(".tr-prog progress").value = Math.round(p * 100);
          $(".tr-prog span").textContent = `Sheet ${fmtInt(n)} of ${fmtInt(t)}`;
        });
        const name = `${slug(s.typeLabel || "tickets")}-${slug(C.fmtNum(s.start, s))}-${slug(C.fmtNum(s.end, s))}${testOnly ? "-test-sheet" : ""}.pdf`;
        saveBlob(new Blob([bytes], { type: "application/pdf" }), name);
        const pickUrl = `/raffle-winner-picker?first=${s.start}&last=${s.end}&prefix=${encodeURIComponent(s.prefix)}&suffix=${encodeURIComponent(s.suffix)}&pad=${encodeURIComponent(s.pad === "auto" ? String(C.padWidth(s)) : s.pad)}&name=${encodeURIComponent(s.title)}`;
        flash(testOnly
          ? `Saved <b>${esc(name)}</b> (sheet 1 only). Print it at 100% / Actual size on plain paper and check the cut marks before printing the full run.`
          : `Saved <b>${esc(name)}</b>: ${fmtInt(info.count)} ${info.count === 1 ? "ticket" : "tickets"} on ${fmtInt(info.sheets)} ${info.sheets === 1 ? "sheet" : "sheets"}. Print at 100% / Actual size. <a href="${pickUrl}">Pick a winner from ${esc(C.fmtNum(s.start, s))}–${esc(C.fmtNum(s.end, s))} →</a>`);
        const c = info.count;
        track(testOnly ? "test_sheet" : "tickets_generated", { bucket: c <= 100 ? "1-100" : c <= 500 ? "101-500" : c <= 1000 ? "501-1000" : c <= 5000 ? "1001-5000" : "5000+", preset: s.preset });
      } catch (err) {
        flash("Couldn't build the PDF: " + (err && err.message ? err.message : err), true);
      } finally { setBusy(false); }
    }
    async function sellerLog() {
      if (busy || !last) return;
      const per = parseInt($("#tr-books").value, 10);
      if (!(per >= 1)) { flash("Enter how many tickets go in each book (for example 25).", true); return; }
      if (!allow("Seller books and the tracking sheet.")) return;
      setBusy(true, "Building seller log…");
      try {
        const sellers = $("#tr-sellers").value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
        const st2 = Object.assign({}, effective(), { perBook: per });
        if (guestOpt()) st2.end = last.s.end;
        const { bytes, info } = await makePdf("seller", st2, { perBook: per, sellers, booksPerSeller: parseInt($("#tr-bps").value, 10) || 1 });
        const name = `seller-log-${slug(C.fmtNum(last.s.start, last.s))}-${slug(C.fmtNum(last.s.end, last.s))}.pdf`;
        saveBlob(new Blob([bytes], { type: "application/pdf" }), name);
        flash(`Saved <b>${esc(name)}</b>: ${fmtInt(info.books)} books on ${info.pages} ${info.pages === 1 ? "page" : "pages"}.`);
        track("seller_log");
      } catch (err) { flash("Couldn't build the seller log: " + (err.message || err), true); }
      finally { setBusy(false); }
    }
    // Social image: the first ticket on a 1200 x 630 card, with the credit line.
    function exportPng() {
      if (!last) return;
      const { s, g, lay } = last;
      const svg = C.svgTicket(s, lay, g.cellW, g.cellH, 0, guestOpt(), logo && logo.dataUrl);
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      img.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = 1200; cv.height = 630;
        const x = cv.getContext("2d");
        const rgb = C.hexRgb(s.color).map(v => Math.round(v * 255));
        x.fillStyle = `rgb(${rgb.map(v => Math.round(v * 0.12 + 255 * 0.88)).join(",")})`;
        x.fillRect(0, 0, 1200, 630);
        const k = Math.min(1040 / g.cellW, 470 / g.cellH);
        const w = g.cellW * k, h = g.cellH * k, ox = (1200 - w) / 2, oy = (585 - h) / 2;
        x.shadowColor = "rgba(0,0,0,.18)"; x.shadowBlur = 30; x.shadowOffsetY = 10;
        x.fillStyle = "#fff"; x.fillRect(ox, oy, w, h);
        x.shadowColor = "transparent";
        x.drawImage(img, ox, oy, w, h);
        x.fillStyle = "#55555f";
        x.font = "600 22px system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
        x.textAlign = "center";
        x.fillText("Made with TicketRun · raffle.roohsites.com", 600, 605);
        URL.revokeObjectURL(url);
        cv.toBlob(b => { if (b) { saveBlob(b, `${slug(s.title || s.typeLabel || "ticket")}.png`); track("png_export"); } }, "image/png");
      };
      img.onerror = () => { URL.revokeObjectURL(url); flash("Your browser couldn't draw the image. Try another browser.", true); };
      img.src = url;
    }

    // ---- saved designs
    function listDesigns() {
      const list = store.get("designs", []);
      $(".tr-saved").innerHTML = list.length ? list.map((d, i) => `<li><span>${esc(d.name)}</span><span class="tr-savedbtns"><button type="button" class="btn ghost sm" data-load="${i}">Load</button><button type="button" class="btn ghost sm" data-del="${i}" aria-label="Delete ${esc(d.name)}">Delete</button></span></li>`).join("") : `<li class="muted small">No saved designs yet.</li>`;
    }
    function saveDesign() {
      const nameEl = $("#tr-savename");
      const name = nameEl.value.trim() || `${st.title || "Tickets"} (${new Date().toLocaleDateString()})`;
      const list = store.get("designs", []).filter(d => d.name !== name);
      list.unshift({ name, st: Object.assign({}, st), extra: Object.assign({}, extra), logo });
      let ok = store.set("designs", list.slice(0, 20));
      if (!ok && logo) { list[0].logo = null; ok = store.set("designs", list.slice(0, 20)); if (ok) flash("Saved without the logo: it was too large for browser storage.", true); }
      if (!ok) flash("Couldn't save: browser storage is full or turned off.", true);
      nameEl.value = "";
      listDesigns();
    }
    function loadDesign(i) {
      const d = store.get("designs", [])[i];
      if (!d) return;
      st = Object.assign(C.presetState(d.st.preset || "raffle"), d.st);
      extra = Object.assign(extra, d.extra || {});
      logo = d.logo || null; logoBytes = null;
      writeForm(); schedule();
      flash(`Loaded “${esc(d.name)}”.`);
    }
    function delDesign(i) {
      const list = store.get("designs", []);
      list.splice(i, 1);
      store.set("designs", list);
      listDesigns();
    }

    writeForm();
    listDesigns();
    render();
  }

  /* ===================================================== winner picker */
  function initPicker(mount) {
    const q = new URLSearchParams(location.search);
    const opt = (v, t) => `<option value="${v}">${t}</option>`;
    mount.innerHTML = `
  <div class="tp">
    <form class="tp-form" autocomplete="off" novalidate>
      <div class="tr-g3">
        <div><label for="tp-first">First ticket number</label><input id="tp-first" type="text" inputmode="numeric" maxlength="9"></div>
        <div><label for="tp-last">Last ticket number</label><input id="tp-last" type="text" inputmode="numeric" maxlength="9"></div>
        <div><label for="tp-count">Winners to draw</label><input id="tp-count" type="number" min="1" max="100" step="1"></div>
      </div>
      <label for="tp-exclude">Leave out (unsold, void or already drawn)</label>
      <textarea id="tp-exclude" rows="2" placeholder="e.g. 51-75, 102, 340-350"></textarea>
      <details class="tp-more">
        <summary>Draw name, prizes and number format</summary>
        <label for="tp-name">Draw name</label><input id="tp-name" maxlength="80" placeholder="e.g. Spring Fundraiser Raffle">
        <label for="tp-prizes">Prizes in draw order (optional, one per line)</label>
        <textarea id="tp-prizes" rows="3" placeholder="Grand prize: weekend getaway&#10;Second prize: $100 gift card"></textarea>
        <div class="tr-g3">
          <div><label for="tp-prefix">Prefix</label><input id="tp-prefix" maxlength="16"></div>
          <div><label for="tp-suffix">Suffix</label><input id="tp-suffix" maxlength="16"></div>
          <div><label for="tp-pad">Digits</label><select id="tp-pad">${opt("auto", "Auto (001)")}${opt("none", "No zeros")}${["2", "3", "4", "5", "6"].map(n => opt(n, n + " digits")).join("")}</select></div>
        </div>
      </details>
      <p class="tp-pool small muted" aria-live="polite"></p>
      <div class="tp-btns">
        <button type="submit" class="btn tp-go">Draw a winner</button>
        <button type="button" class="btn ghost" data-a="reset">Start over</button>
      </div>
    </form>
    <div class="tp-stage">
      <p class="tp-label small muted">Winning number</p>
      <div class="tp-big" aria-live="polite" aria-atomic="true">–</div>
      <p class="tp-when small muted"></p>
      <ol class="tp-log"></ol>
      <div class="tp-actions" hidden>
        <button type="button" class="btn ghost sm" data-a="copy">Copy result</button>
        <button type="button" class="btn ghost sm" data-a="share">Share</button>
        <button type="button" class="btn ghost sm" data-a="img">Save image</button>
      </div>
      <p class="tp-msg small" role="status"></p>
    </div>
  </div>`;
    const $ = s => mount.querySelector(s);
    const f = {
      first: $("#tp-first"), last: $("#tp-last"), count: $("#tp-count"), exclude: $("#tp-exclude"), name: $("#tp-name"),
      prizes: $("#tp-prizes"), prefix: $("#tp-prefix"), suffix: $("#tp-suffix"), pad: $("#tp-pad"),
    };
    const P = mount.dataset;
    f.first.value = q.get("first") || P.first || "1";
    f.last.value = q.get("last") || P.last || "500";
    f.count.value = "1";
    f.prefix.value = q.get("prefix") || "";
    f.suffix.value = q.get("suffix") || "";
    f.name.value = q.get("name") || "";
    const qp = q.get("pad");
    f.pad.value = ["auto", "none", "2", "3", "4", "5", "6"].includes(qp) ? qp : "auto";
    if (f.prefix.value || f.suffix.value || q.get("name")) $(".tp-more").open = true;

    let pool = null, info = null, log = [], drawing = false;
    const fmtState = () => ({ prefix: C.clean(f.prefix.value, true).text, suffix: C.clean(f.suffix.value, true).text, pad: f.pad.value, end: parseInt(f.last.value, 10) || 0, numLabel: "No." });
    const show = n => C.fmtNum(n, fmtState());
    function prep() {
      const ex = C.parseRanges(f.exclude.value);
      try {
        const r = C.buildPool(f.first.value, f.last.value, ex.ranges);
        pool = r.pool; info = { total: r.total, excluded: r.excluded, bad: ex.bad, first: parseInt(f.first.value, 10), last: parseInt(f.last.value, 10) };
        const odds = pool.length ? `each has a 1 in ${fmtInt(pool.length)} chance` : "nothing left to draw";
        $(".tp-pool").innerHTML = `${fmtInt(pool.length)} eligible ${pool.length === 1 ? "ticket" : "tickets"} (${esc(show(info.first))}–${esc(show(info.last))}${info.excluded ? `, ${fmtInt(info.excluded)} left out` : ""}): ${odds}.` + (ex.bad.length ? ` <span class="tr-err">Couldn't read: ${esc(ex.bad.join(", "))}</span>` : "");
        return true;
      } catch (err) {
        pool = null;
        $(".tp-pool").innerHTML = `<span class="tr-err">${esc(err.message)}</span>`;
        return false;
      }
    }
    ["first", "last", "exclude", "prefix", "suffix", "pad"].forEach(k => f[k].addEventListener("input", () => { log = []; renderLog(); prep(); }));
    mount.addEventListener("submit", e => { e.preventDefault(); draw(); });
    mount.addEventListener("click", e => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (a === "reset") { log = []; renderLog(); prep(); $(".tp-big").textContent = "–"; $(".tp-big").classList.remove("multi"); $(".tp-label").textContent = "Winning number"; $(".tp-when").textContent = ""; $(".tp-msg").textContent = ""; }
      else if (a === "copy") copyResult();
      else if (a === "share") shareResult();
      else if (a === "img") saveImage();
    });

    async function draw() {
      if (drawing) return;
      if (!pool) { if (!prep()) return; }
      const k = Math.max(1, Math.min(100, parseInt(f.count.value, 10) || 1));
      if (!pool.length) { $(".tp-msg").textContent = "Every eligible ticket has already been drawn. Press Start over to begin again."; return; }
      // The winners are fixed here, before any animation, by an unbiased crypto draw.
      const picks = C.drawFrom(pool, k);
      const at = new Date();
      drawing = true;
      $(".tp-go").disabled = true;
      const big = $(".tp-big");
      const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce && pool.length + picks.length > 1) {
        big.setAttribute("aria-busy", "true");
        const span = info.last - info.first + 1;
        const t0 = performance.now();
        await new Promise(res => {
          const step = () => {
            if (performance.now() - t0 > 900) return res();
            big.textContent = show(info.first + Math.floor(Math.random() * span)); // cosmetic only
            setTimeout(step, 55);
          };
          step();
        });
        big.removeAttribute("aria-busy");
      }
      const prizes = f.prizes.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      picks.forEach(n => { log.push({ n, at, prize: prizes[log.length] || "" }); });
      big.textContent = picks.map(show).join(", ");
      big.classList.toggle("multi", picks.length > 1);
      $(".tp-label").textContent = picks.length > 1 ? "Winning numbers" : "Winning number";
      $(".tp-when").textContent = `Drawn ${at.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })} · ${fmtInt(pool.length)} left in the draw`;
      $(".tp-go").textContent = log.length ? "Draw another" : "Draw a winner";
      renderLog();
      $(".tp-go").disabled = false;
      drawing = false;
      track("winner_picked", { count: picks.length });
    }
    function renderLog() {
      $(".tp-log").innerHTML = log.map((e, i) => `<li><b>${esc(show(e.n))}</b>${e.prize ? ` <span class="muted">· ${esc(e.prize)}</span>` : ""} <span class="small muted">${esc(e.at.toLocaleTimeString())}</span></li>`).join("");
      $(".tp-actions").hidden = !log.length;
      if (!log.length) $(".tp-go").textContent = "Draw a winner";
    }
    function resultText() {
      const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })();
      const lines = [];
      lines.push((f.name.value.trim() || "Raffle draw") + ": result");
      lines.push(`Tickets ${show(info.first)} to ${show(info.last)}${info.excluded ? ` (${fmtInt(info.excluded)} left out)` : ""}, ${fmtInt(info.total - info.excluded)} eligible`);
      log.forEach((e, i) => lines.push(`${i + 1}. No. ${show(e.n)}${e.prize ? ` (${e.prize})` : ""}`));
      const at = log[log.length - 1].at;
      lines.push(`Drawn ${at.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium" })}${tz ? ` (${tz})` : ""} with an unbiased crypto.getRandomValues draw.`);
      lines.push("Picked with TicketRun · https://raffle.roohsites.com/raffle-winner-picker");
      return lines.join("\n");
    }
    async function copyResult() {
      try { await navigator.clipboard.writeText(resultText()); $(".tp-msg").textContent = "Result copied."; }
      catch { $(".tp-msg").textContent = "Couldn't copy automatically. Select the result and copy it."; }
    }
    async function shareResult() {
      const text = resultText();
      if (navigator.share) { try { await navigator.share({ title: "Raffle draw result", text }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
      copyResult();
    }
    function saveImage() {
      const cv = document.createElement("canvas");
      cv.width = 1200; cv.height = 630;
      const x = cv.getContext("2d");
      const font = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      x.fillStyle = "#fff5f7"; x.fillRect(0, 0, 1200, 630);
      x.fillStyle = "#be123c"; x.fillRect(0, 0, 1200, 14);
      x.textAlign = "center";
      x.fillStyle = "#55555f"; x.font = `600 34px ${font}`;
      x.fillText(f.name.value.trim() || "Raffle draw", 600, 110, 1080);
      x.font = `600 26px ${font}`;
      x.fillText(log.length > 1 ? "Winning numbers" : "Winning number", 600, 175);
      const nums = log.map(e => show(e.n));
      x.fillStyle = "#be123c";
      const shown = nums.slice(0, 12).join("   ") + (nums.length > 12 ? "  …" : "");
      let size = 150;
      x.font = `800 ${size}px ${font}`;
      while (size > 40 && x.measureText(shown).width > 1100) { size -= 6; x.font = `800 ${size}px ${font}`; }
      x.fillText(shown, 600, 250 + size * 0.75);
      const at = log[log.length - 1].at;
      x.fillStyle = "#55555f"; x.font = `400 24px ${font}`;
      x.fillText(`Drawn ${at.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })} from ${fmtInt(info.total - info.excluded)} eligible tickets`, 600, 520, 1100);
      x.font = `600 22px ${font}`;
      x.fillText("Picked with TicketRun · raffle.roohsites.com", 600, 590);
      cv.toBlob(b => { if (b) saveBlob(b, "raffle-winner.png"); }, "image/png");
    }
    prep();
  }
})();
