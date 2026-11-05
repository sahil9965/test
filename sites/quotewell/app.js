// Quotewell UI. #qw-tool mounts the tool: data-trade starts a landing page from one trade, data-kind picks estimate, quote or proposal.
// Everything runs in the browser: the PDF is built with pdf-lib (loaded on first use) and your business details, the document in
// progress and your saved documents are kept in this browser's localStorage. Nothing is uploaded.
(() => {
  const C = window.QWCore;
  const mount = document.getElementById("qw-tool");
  if (!C || !mount) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("qw_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("qw_" + k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  const track = (name, data) => { try { if (window.va) window.va("event", data ? { name, data } : { name }); } catch {} };
  const saveBlob = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };
  const loadScript = src => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load the PDF library. Check your connection and try again."));
    document.head.appendChild(s);
  });
  const LETTER = ["US", "CA", "MX", "PH", "CL", "CO", "VE", "CR", "GT", "DO", "PR", "PA", "SV", "NI", "BZ"];
  const defaultPaper = () => { try { return LETTER.includes((new Intl.Locale(navigator.language || "en-US").maximize().region || "US").toUpperCase()) ? "letter" : "a4"; } catch { return "letter"; } };
  const defaultCurrency = () => { try { const r = (new Intl.Locale(navigator.language || "en-US").maximize().region || "US").toUpperCase(); return { CA: "CAD", AU: "AUD", GB: "GBP", IE: "EUR", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR" }[r] || "USD"; } catch { return "USD"; } };
  const fileName = d => `${d.kind}-${(d.number || "1").replace(/[^A-Za-z0-9_-]+/g, "-")}${d.to.name ? "-" + d.to.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) : ""}.pdf`.toLowerCase();

  const startTrade = C.TRADES[mount.dataset.trade] ? mount.dataset.trade : "";
  const startKind = C.KINDS[mount.dataset.kind] ? mount.dataset.kind : "";
  let profile = store.get("profile", null) || { from: { name: "", phone: "", email: "", address: "", license: "", logo: "", logoRatio: 0 }, currency: defaultCurrency(), paper: defaultPaper(), accent: C.ACCENTS.orange, tax: { label: "Sales tax", pct: 0 }, validDays: 30 };
  let saved = store.get("saved", []);
  let doc, page = 0, timer = null, previewTimer = null, busy = false;

  /* ------------------------------------------------------------ the document in progress */
  function fresh(tradeKey, kind) {
    const k = kind || startKind || "estimate";
    const d = C.applyTrade({ kind: k, number: C.nextNumber(store.get("last", ""), k), issued: C.today(), validDays: profile.validDays, currency: profile.currency, paper: profile.paper, accent: profile.accent, from: profile.from, tax: profile.tax }, tradeKey || "general");
    d.trade = tradeKey || "general";
    return d;
  }
  const hasWork = d => d.items.some(i => String(i.rate).trim() !== "" && Number(i.rate) !== 0) || d.to.name || d.job.title || d.job.scope;
  const draft = store.get("draft", null);
  doc = draft && draft.items ? draft : fresh(startTrade, startKind);
  if (draft && draft.items && !hasWork(draft)) doc = fresh(startTrade, startKind);   // an untouched draft from another page: start clean for this one
  if (!doc.from) doc.from = {};
  if (profile.from.logo && !doc.from.logo) { doc.from.logo = profile.from.logo; doc.from.logoRatio = profile.from.logoRatio; }

  /* ------------------------------------------------------------ markup */
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`;
  const field = (path, label, attrs = "", cls = "") => `<div class="${cls}"><label for="qw-${path.replace(/\./g, "-")}">${label}</label><input id="qw-${path.replace(/\./g, "-")}" data-k="${path}" ${attrs}></div>`;
  mount.innerHTML = `
  <div class="qw">
    <div class="qw-form">
      <div class="qw-start">
        <fieldset class="qw-kinds"><legend>Document</legend>
          <div class="qw-chips">${Object.entries(C.KINDS).map(([k, n]) => `<label class="qw-chip"><input type="radio" name="kind" value="${k}"><span>${n}</span></label>`).join("")}</div>
        </fieldset>
        <fieldset class="qw-trades"><legend>Start from your trade</legend>
          <div class="qw-chips">${Object.entries(C.TRADES).map(([k, t]) => `<button type="button" class="qw-tchip" data-trade="${k}">${esc(t.label)}</button>`).join("")}</div>
          <p class="small muted qw-hint">This fills in typical lines and starting terms. The prices are yours: nothing is pre-priced.</p>
        </fieldset>
      </div>
      <details class="qw-sec" id="qw-biz"><summary><h3>Your business</h3><span class="small muted qw-bizsum"></span></summary>
        <div class="row">${field("from.name", "Business name", 'maxlength="70" autocomplete="organization"')}${field("from.license", "License or registration no. (optional)", 'maxlength="40"')}</div>
        <div class="row">${field("from.phone", "Phone", 'maxlength="30" autocomplete="tel" inputmode="tel"')}${field("from.email", "Email", 'maxlength="80" autocomplete="email" inputmode="email"')}</div>
        ${field("from.address", "Address or service area", 'maxlength="120" autocomplete="street-address"')}
        <div class="qw-logo"><label for="qw-logofile">Logo (optional)</label><div class="qw-logorow"><input id="qw-logofile" type="file" accept="image/png,image/jpeg"><button type="button" class="btn ghost sm" data-act="logo-clear" hidden>Remove logo</button></div><p class="small muted">Stays on this device. Large images are shrunk.</p></div>
        <div class="row">
          <div><label for="qw-currency">Currency</label><select id="qw-currency" data-k="currency">${Object.entries(C.CURRENCIES).map(([k, c]) => opt(k, `${k} (${c.symbol})`)).join("")}</select></div>
          <div><label for="qw-paper">Paper</label><select id="qw-paper" data-k="paper">${Object.entries(C.PAPER).map(([k, p]) => opt(k, p.name)).join("")}</select></div>
        </div>
        <fieldset class="qw-acc"><legend>Color</legend><div class="qw-chips">${Object.entries(C.ACCENTS).map(([k, h]) => `<label class="qw-sw" title="${k}"><input type="radio" name="accent" value="${h}"><span style="background:${h}"></span><em class="sr">${k}</em></label>`).join("")}</div></fieldset>
        <p class="small muted">Saved in this browser so you only type it once.</p>
      </details>
      <details class="qw-sec" open><summary><h3>Customer and job</h3></summary>
        <div class="row">${field("to.name", "Customer name", 'maxlength="70" autocomplete="off"')}${field("to.phone", "Customer phone", 'maxlength="30" inputmode="tel" autocomplete="off"')}</div>
        <div class="row">${field("to.email", "Customer email", 'maxlength="80" inputmode="email" autocomplete="off"')}${field("to.address", "Customer address", 'maxlength="120" autocomplete="off"')}</div>
        <div class="row">${field("job.title", "Job title", 'maxlength="90"')}${field("job.address", "Job site address (if different)", 'maxlength="120"')}</div>
        <label for="qw-scope">Scope of work</label><textarea id="qw-scope" data-k="job.scope" maxlength="1500" rows="4" placeholder=""></textarea>
        <p class="small muted qw-count"></p>
      </details>
      <details class="qw-sec" open><summary><h3>Line items</h3><span class="small muted qw-itemsum"></span></summary>
        <div class="qw-items"></div>
        <div class="qw-add"><button type="button" class="btn ghost sm" data-act="add">+ Add a line</button><button type="button" class="btn ghost sm" data-act="example">Fill with example numbers</button></div>
        <datalist id="qw-units">${["ea", "hr", "day", "job", "sq ft", "ln ft", "room", "visit", "load", "lot"].map(u => `<option value="${u}">`).join("")}</datalist>
        <p class="small muted">Tick <em>Tax</em> on the lines your area taxes. Tax rules differ by state and by job, so ask your tax office or accountant if you are unsure.</p>
      </details>
      <details class="qw-sec" open><summary><h3>Discount, markup, tax and deposit</h3></summary>
        <div class="qw-adj">
          <div><label for="qw-discount">Discount</label><div class="qw-pair"><input id="qw-discount" data-k="discount.value" inputmode="decimal" placeholder="0"><select data-k="discount.mode" aria-label="Discount type"><option value="pct">%</option><option value="amt">amount</option></select></div></div>
          <div><label for="qw-markup">Markup or overhead (%)</label><div class="qw-pair"><input id="qw-markup" data-k="markup.pct" inputmode="decimal" placeholder="0"><input data-k="markup.label" maxlength="24" aria-label="Markup label"></div></div>
          <div><label for="qw-tax">Tax (%)</label><div class="qw-pair"><input id="qw-tax" data-k="tax.pct" inputmode="decimal" placeholder="0"><input data-k="tax.label" maxlength="24" aria-label="Tax label"></div></div>
          <div><label for="qw-deposit">Deposit to start</label><div class="qw-pair"><input id="qw-deposit" data-k="deposit.value" inputmode="decimal" placeholder="0"><select data-k="deposit.mode" aria-label="Deposit type"><option value="pct">%</option><option value="amt">amount</option></select></div></div>
        </div>
        <p class="small muted">Order: line items, discount, markup on what is left, then tax on the taxable lines. The deposit is taken from the total.</p>
      </details>
      <details class="qw-sec" open><summary><h3>Document details and terms</h3></summary>
        <div class="row">${field("number", "Number", 'maxlength="20"')}<div><label for="qw-issued">Date</label><input id="qw-issued" type="date" data-k="issued"></div></div>
        <div class="row">${field("validDays", "Valid for (days, 0 for no limit)", 'inputmode="numeric" maxlength="3"')}<div></div></div>
        <label for="qw-terms">Terms</label><textarea id="qw-terms" data-k="terms" maxlength="2000" rows="6"></textarea>
        <p class="small muted">Starting text only: edit it to fit your business and your local rules. It is not legal advice.</p>
        <label class="qw-check"><input type="checkbox" data-k="sign"> Add signature lines</label>
        <label class="qw-check"><input type="checkbox" data-k="split"> Show the labor, materials and other split in the totals</label>
      </details>
    </div>
    <div class="qw-out">
      <div class="qw-total card"><div class="qw-row"><span>Total</span><strong class="qw-tot" aria-live="polite">$0.00</strong></div><div class="qw-row qw-depline" hidden><span>Deposit to start</span><span class="qw-dep"></span></div></div>
      <div class="qw-actions">
        <button type="button" class="btn" data-act="pdf">Download PDF</button>
        <button type="button" class="btn ghost" data-act="copy">Copy as text</button>
        <button type="button" class="btn ghost" data-act="save">Save on this device</button>
        <button type="button" class="btn ghost" data-act="new">New document</button>
      </div>
      <div class="qw-msg" role="status" aria-live="polite"></div>
      <div class="qw-pager" hidden></div>
      <div class="qw-svg" aria-label="Preview of the PDF"></div>
      <div class="qw-saved" hidden><h3>Saved on this device</h3><ul></ul></div>
    </div>
  </div>`;

  const $ = s => mount.querySelector(s);
  const $$ = s => [...mount.querySelectorAll(s)];
  const get = (o, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  function set(o, path, v) { const ks = path.split("."); const last = ks.pop(); const t = ks.reduce((a, k) => (a[k] = a[k] && typeof a[k] === "object" ? a[k] : {}), o); t[last] = v; }
  const say = (text, bad) => { const m = $(".qw-msg"); m.textContent = ""; if (text) { const p = document.createElement("p"); p.textContent = text; if (bad) p.className = "qw-err"; m.appendChild(p); } };

  /* ------------------------------------------------------------ fill the form from the document */
  function syncForm() {
    $$("[data-k]").forEach(el => {
      const v = get(doc, el.dataset.k);
      if (el.type === "checkbox") el.checked = v === undefined ? el.dataset.k === "sign" : !!v;
      else el.value = v == null || v === 0 && /value|pct/.test(el.dataset.k) ? "" : v;
    });
    $$("input[name=kind]").forEach(r => (r.checked = r.value === doc.kind));
    $$("input[name=accent]").forEach(r => (r.checked = r.value.toLowerCase() === (doc.accent || "").toLowerCase()));
    $$(".qw-tchip").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.trade === doc.trade)));
    $("[data-k='validDays']").value = doc.validDays === undefined ? 30 : doc.validDays;
    $("[data-k='markup.label']").value = get(doc, "markup.label") || "Overhead and profit";
    $("[data-k='tax.label']").value = get(doc, "tax.label") || "Sales tax";
    $("[data-act='logo-clear']").hidden = !(doc.from && doc.from.logo);
    $(".qw-bizsum").textContent = doc.from.name || "Add your name, phone and logo";
    if (!doc.from.name) $("#qw-biz").open = true;
    renderItems();
  }
  function renderItems() {
    $(".qw-items").innerHTML = doc.items.map((it, i) => `
      <div class="qw-item" data-i="${i}">
        <div class="qw-f qw-fd"><small>Description</small><input data-f="desc" aria-label="Description, line ${i + 1}" maxlength="200" value="${esc(it.desc)}" placeholder="What the work or material is"></div>
        <div class="qw-f qw-ft"><small>Type</small><select data-f="type" aria-label="Type, line ${i + 1}">${Object.entries(C.TYPES).map(([k, n]) => opt(k, n, it.type === k)).join("")}</select></div>
        <div class="qw-f qw-fq"><small>Qty</small><input data-f="qty" aria-label="Quantity, line ${i + 1}" inputmode="decimal" value="${esc(it.qty)}"></div>
        <div class="qw-f qw-fu"><small>Unit</small><input data-f="unit" aria-label="Unit, line ${i + 1}" maxlength="10" list="qw-units" value="${esc(it.unit)}"></div>
        <div class="qw-f qw-fr"><small>Rate</small><input data-f="rate" aria-label="Rate, line ${i + 1}" inputmode="decimal" value="${esc(it.rate)}" placeholder="0.00"></div>
        <label class="qw-tax"><input type="checkbox" data-f="taxable" aria-label="Taxable, line ${i + 1}"${it.taxable ? " checked" : ""}><span>Taxable</span></label>
        <output class="qw-amt" data-amt="${i}" aria-label="Amount, line ${i + 1}">$0.00</output>
        <span class="qw-ib"><button type="button" class="qw-ic" data-act="up" aria-label="Move line ${i + 1} up"${i === 0 ? " disabled" : ""}>↑</button><button type="button" class="qw-ic" data-act="down" aria-label="Move line ${i + 1} down"${i === doc.items.length - 1 ? " disabled" : ""}>↓</button><button type="button" class="qw-ic" data-act="del" aria-label="Remove line ${i + 1}">✕</button></span>
      </div>`).join("") || `<p class="small muted qw-empty">No lines yet. Pick your trade above or add a line.</p>`;
  }

  /* ------------------------------------------------------------ refresh: totals, preview, autosave */
  const money = c => C.money(c, doc.currency);
  function refresh() {
    const c = C.calc(doc);
    $(".qw-tot").textContent = money(c.total);
    $(".qw-depline").hidden = !c.deposit;
    $(".qw-dep").textContent = c.deposit ? `${money(c.deposit)} · balance ${money(c.balance)}` : "";
    $$("[data-amt]").forEach(o => { o.textContent = money(c.lines[+o.dataset.amt] ? c.lines[+o.dataset.amt].cents : 0); });
    $(".qw-itemsum").textContent = doc.items.length ? `${doc.items.length} line${doc.items.length === 1 ? "" : "s"} · ${money(c.subtotal)}` : "";
    $(".qw-count").textContent = `${(doc.job.scope || "").length} of 1,500 characters`;
    clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 90);
    clearTimeout(timer); timer = setTimeout(() => store.set("draft", doc), 350);
  }
  function renderPreview() {
    const L = C.layout(doc);
    page = Math.min(page, L.pages.length - 1);
    $(".qw-svg").innerHTML = C.svgPage(L.pages[page], L.W, L.H, L.doc.from.logo);
    const pager = $(".qw-pager");
    pager.hidden = L.pages.length < 2;
    pager.innerHTML = L.pages.length < 2 ? "" : `<button type="button" class="btn ghost sm" data-act="prev"${page === 0 ? " disabled" : ""}>←</button><span>Page ${page + 1} of ${L.pages.length}</span><button type="button" class="btn ghost sm" data-act="next"${page === L.pages.length - 1 ? " disabled" : ""}>→</button>`;
    const note = L.lost.length ? `These characters can't be printed in the PDF and are left out: ${L.lost.join(" ")}` : "";
    if (note && !$(".qw-msg .qw-err")) say(note, true);
  }
  function renderSaved() {
    const box = $(".qw-saved");
    box.hidden = !saved.length;
    box.querySelector("ul").innerHTML = saved.map(s => `<li data-id="${esc(s.id)}"><span><strong>${esc(s.title)}</strong> <span class="muted small">${esc(s.sub)}</span></span><span class="qw-sb"><button type="button" class="btn ghost sm" data-act="open">Open</button><button type="button" class="btn ghost sm" data-act="dup">Copy</button><button type="button" class="btn ghost sm" data-act="rm" aria-label="Delete ${esc(s.title)}">✕</button></span></li>`).join("");
  }

  /* ------------------------------------------------------------ editing */
  mount.addEventListener("input", e => {
    const el = e.target;
    if (el.dataset.f) {
      const it = doc.items[+el.closest(".qw-item").dataset.i];
      if (!it) return;
      it[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value;
      return refresh();
    }
    if (el.dataset.k) {
      const k = el.dataset.k;
      if (el.type === "file") return;
      set(doc, k, el.type === "checkbox" ? el.checked : el.value);
      if (k === "validDays") doc.validDays = el.value === "" ? 0 : Number(el.value) || 0;
      if (k.startsWith("from.") || k === "currency" || k === "paper" || k === "tax.label" || k === "tax.pct") rememberProfile();
      if (k === "from.name") $(".qw-bizsum").textContent = el.value || "Add your name, phone and logo";
      refresh();
    }
  });
  mount.addEventListener("change", e => {
    const el = e.target;
    if (el.name === "kind") {
      const was = C.termsFor(doc.kind, doc.trade || "general");
      const oldNum = C.nextNumber(store.get("last", ""), doc.kind), keepNum = doc.number !== oldNum;
      doc.kind = el.value;
      if ((doc.terms || "").trim() === was.trim() || !doc.terms) doc.terms = C.termsFor(doc.kind, doc.trade || "general");
      if (!keepNum) doc.number = C.nextNumber(store.get("last", ""), doc.kind);
      syncForm(); refresh(); track("kind_pick", { kind: doc.kind });
    } else if (el.name === "accent") { doc.accent = el.value; rememberProfile(); refresh(); }
    else if (el.id === "qw-logofile" && el.files && el.files[0]) loadLogo(el.files[0]);
    else if (el.dataset.f === "type" || el.dataset.k === "currency") refresh();
  });
  function rememberProfile() {
    profile = { from: { ...doc.from }, currency: doc.currency, paper: doc.paper, accent: doc.accent, tax: { label: (doc.tax && doc.tax.label) || "Sales tax", pct: (doc.tax && doc.tax.pct) || 0 }, validDays: doc.validDays };
    if (!store.set("profile", profile)) { profile.from.logo = ""; store.set("profile", profile); }
  }
  function loadLogo(file) {
    if (!/^image\/(png|jpeg)$/.test(file.type)) return say("Please choose a PNG or JPG image.", true);
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 400, k = Math.min(1, max / img.width, 160 / img.height);
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const url = cv.toDataURL("image/png");
        if (url.length > 380000) return say("That logo is too detailed. Try a simpler or smaller image.", true);
        doc.from.logo = url; doc.from.logoRatio = cv.width / cv.height;
        rememberProfile(); syncForm(); refresh(); say("");
      };
      img.onerror = () => say("That image couldn't be read.", true);
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ------------------------------------------------------------ actions */
  function applyTrade(key) {
    if (hasWork(doc) && !confirm("Replace your lines, terms and wording with the starting point for this trade? Your business details stay.")) return;
    const keep = { number: doc.number, issued: doc.issued, accent: doc.accent, currency: doc.currency, paper: doc.paper, kind: doc.kind, from: doc.from, tax: doc.tax, validDays: doc.validDays };
    doc = Object.assign(C.applyTrade(keep, key), { trade: key });
    page = 0; syncForm(); refresh(); say(""); track("trade_pick", { trade: key });
  }
  const EXAMPLE_RATES = [85, 240, 120, 60, 45], EXAMPLE_QTY = [4, 1, 1, 1, 1];
  function example() {
    if (hasWork(doc) && !confirm("Fill in made-up example numbers? This replaces the prices and customer details you typed.")) return;
    const t = C.TRADES[doc.trade] || C.TRADES.general;
    if (!doc.items.length) doc.items = t.items.map(([d, ty, u]) => C.newItem(ty, d, u));
    doc.items.forEach((it, i) => { it.rate = EXAMPLE_RATES[i % 5]; it.qty = EXAMPLE_QTY[i % 5]; it.taxable = it.type === "material"; });
    doc.to = { name: "Pat Example (made-up customer)", phone: "(555) 010-0100", email: "pat@example.com", address: "12 Sample Street" };
    doc.job.title = t.title + " (example)";
    doc.job.scope = "EXAMPLE WITH MADE-UP NUMBERS: replace everything with your own details.\n" + t.scope;
    doc.tax = { label: doc.tax.label || "Sales tax", pct: 7 }; doc.deposit = { mode: "pct", value: 30 };
    syncForm(); refresh(); track("example_fill");
  }
  function freshDoc() {
    if (hasWork(doc) && !confirm("Start a new document? Your current one is kept only if you saved it.")) return;
    doc = fresh(doc.trade || startTrade, doc.kind); page = 0; syncForm(); refresh(); say("");
  }
  function saveDoc(quiet) {
    const c = C.calc(doc), copy = JSON.parse(JSON.stringify(doc));
    copy.from.logo = ""; copy.from.logoRatio = 0;
    const id = doc.id || ("d" + Date.now().toString(36));
    doc.id = id;
    saved = saved.filter(s => s.id !== id);
    saved.unshift({ id, title: `${C.KINDS[doc.kind]} ${doc.number}`, sub: [doc.to.name, C.money(c.total, doc.currency)].filter(Boolean).join(" · "), doc: copy });
    saved = saved.slice(0, 30);
    store.set("last", doc.number);
    const ok = store.set("saved", saved);
    store.set("draft", doc);
    renderSaved();
    if (!quiet) say(ok ? "Saved on this device. It stays in this browser only." : "Your browser wouldn't let us save. Download the PDF to keep it.", !ok);
  }
  async function makePdf() {
    if (busy) return;
    if (!doc.items.length) return say("Add at least one line item first.", true);
    busy = true; say("Building your PDF…");
    try {
      if (!window.PDFLib) await loadScript("/vendor/pdf-lib.min.js");
      const r = await C.buildPdf(window.PDFLib, doc);
      saveBlob(new Blob([r.bytes], { type: "application/pdf" }), fileName(C.normalize(doc)));
      saveDoc(true);
      const warn = r.lost.length ? ` These characters can't be printed in a PDF and were left out: ${r.lost.join(" ")}` : "";
      say(`Your PDF is ready (${r.pages} page${r.pages === 1 ? "" : "s"}).${warn} It was also saved on this device.`, !!warn);
      track("pdf_download", { kind: doc.kind, pages: r.pages, lines: doc.items.length, trade: doc.trade || "none" });
    } catch (err) { say(err && err.message ? err.message : "Something went wrong building the PDF.", true); }
    busy = false;
  }
  async function copyText() {
    const text = C.toText(doc);
    try { await navigator.clipboard.writeText(text); say("Copied. Paste it into a text message or email."); track("text_copy"); }
    catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); say("Copied. Paste it into a text message or email."); } catch { say("Couldn't copy. Select the text in the preview instead.", true); } ta.remove(); }
  }
  mount.addEventListener("click", e => {
    const t = e.target.closest("button");
    if (!t) return;
    const act = t.dataset.act;
    if (t.dataset.trade) return applyTrade(t.dataset.trade);
    if (!act) return;
    const row = t.closest(".qw-item");
    const i = row ? +row.dataset.i : -1;
    if (act === "add") { if (doc.items.length >= C.LIMITS.items) return say(`An estimate can have up to ${C.LIMITS.items} lines. Combine some lines to add more.`, true); doc.items.push(C.newItem("labor", "", "")); renderItems(); refresh(); const last = $$(".qw-item").pop(); if (last) last.querySelector("input").focus(); }
    else if (act === "del") { doc.items.splice(i, 1); renderItems(); refresh(); }
    else if (act === "up" || act === "down") { const j = act === "up" ? i - 1 : i + 1; if (doc.items[j]) { [doc.items[i], doc.items[j]] = [doc.items[j], doc.items[i]]; renderItems(); refresh(); const b = $(`.qw-item[data-i="${j}"] [data-act="${act}"]:not([disabled])`) || $(`.qw-item[data-i="${j}"] input`); if (b) b.focus(); } }
    else if (act === "pdf") makePdf();
    else if (act === "copy") copyText();
    else if (act === "save") saveDoc();
    else if (act === "new") freshDoc();
    else if (act === "example") example();
    else if (act === "logo-clear") { doc.from.logo = ""; doc.from.logoRatio = 0; rememberProfile(); syncForm(); refresh(); }
    else if (act === "prev" || act === "next") { page += act === "next" ? 1 : -1; renderPreview(); }
    else if (act === "open" || act === "dup" || act === "rm") {
      const id = t.closest("li").dataset.id, s = saved.find(x => x.id === id);
      if (!s) return;
      if (act === "rm") { saved = saved.filter(x => x.id !== id); store.set("saved", saved); renderSaved(); return; }
      if (hasWork(doc) && !confirm("Open this document? Unsaved changes to the current one are lost.")) return;
      doc = JSON.parse(JSON.stringify(s.doc));
      doc.from.logo = profile.from.logo; doc.from.logoRatio = profile.from.logoRatio;
      if (act === "dup") { delete doc.id; doc.number = C.nextNumber(store.get("last", doc.number), doc.kind); doc.issued = C.today(); }
      page = 0; syncForm(); refresh(); mount.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  syncForm(); renderSaved(); refresh();
  if (!doc.items.length) say("");
})();
