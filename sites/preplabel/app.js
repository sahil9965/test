// PrepLabel tool UI. Mounts into #pl-tool; data-preset picks the starting tab and label stock
// on landing pages. Everything runs in the browser: PDFs are built with pdf-lib, Seller Central
// PDFs are read with pdf.js, and nothing is uploaded.
(() => {
  const mount = document.getElementById("pl-tool");
  if (!mount || !window.PLCore) return;
  const C = window.PLCore;
  const preset = mount.dataset.preset || "";

  /* ------------------------------------------------------------ helpers */
  const $ = (s, el = mount) => el.querySelector(s);
  const $$ = (s, el = mount) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("pl_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("pl_" + k, JSON.stringify(v)); } catch {} },
  };
  const track = name => { try { window.va && window.va("event", { name }); } catch {} };
  const allow = reason => !window.Pro || window.Pro.require(reason);
  const loaded = {};
  const loadScript = src => loaded[src] || (loaded[src] = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = res;
    s.onerror = () => { delete loaded[src]; rej(new Error("Couldn't load a component. Check your connection and try again.")); };
    document.head.appendChild(s);
  }));
  const getPdfLib = async () => { if (!window.PDFLib) await loadScript("/vendor/pdf-lib.min.js"); return window.PDFLib; };
  const getQr = async () => {
    if (!window.qrcode) await loadScript("/vendor/qrcode.js");
    if (window.qrcode.stringToBytesFuncs && window.qrcode.stringToBytesFuncs["UTF-8"]) window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs["UTF-8"];
    return window.qrcode;
  };
  let pdfjsP = null;
  const getPdfjs = () => pdfjsP || (pdfjsP = import("/vendor/pdfjs/pdf.min.js").then(m => { m.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js"; return m; }).catch(e => { pdfjsP = null; throw e; }));
  const saveBlob = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };
  const today = () => new Date().toISOString().slice(0, 10);
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
  const num = (v, d = 0) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);
  const plural = (n, one, many = one + "s") => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
  const fmtPt = v => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");
  const MAX_LABELS = 5000;

  /* ------------------------------------------------------------ state */
  const defaults = {
    tab: "fnsku",
    items: [{ code: "", title: "", condition: "New", qty: 1 }],
    cal: { dx: 0, dy: 0 },
    custom: { roll: { w: 50.8, h: 25.4 }, sheet: { page: "letter", cols: 3, rows: 10, w: 66.7, h: 25.4, left: 4.8, top: 12.7, hgap: 3.2, vgap: 0 } },
    fnsku: { stock: "r-2x1", start: 1, dpi: "auto", rotate: 0, showTitle: true, showCondition: true, titleLines: "auto", shipment: "" },
    prep: { type: "suffocation", stock: "r-4x2", start: 1, rotate: 0, qty: 10, border: false, langs: ["en"], bagW: 9, bagL: 12, unit: "in", suffText: "", setKind: "sold-as-set", setCount: "", setText: "", date: "", dateFmt: "MM-DD-YYYY", prefix: "EXP", lot: "", lotPrefix: "LOT", customText: "FRAGILE\nHandle with care" },
    bin: { codes: "A-01-01\nA-01-02\nA-01-03", symb: "qr", stock: "letter-30", start: 1, copies: 1, rotate: 0, dpi: "auto", rp: "A-01-", rf: 1, rt: 12, rd: 2, rs: "" },
    conv: { target: "r-2x1", margin: 1, rotate: 0 },
    test: { stock: "r-2x1" },
    lib: "Default",
  };
  const saved = store.get("state", {});
  const S = structuredClone(defaults);
  for (const k of Object.keys(defaults)) {
    if (saved[k] === undefined) continue;
    if (Array.isArray(defaults[k]) || typeof defaults[k] !== "object") S[k] = saved[k];
    else S[k] = { ...defaults[k], ...saved[k] };
  }
  if (!Array.isArray(S.items) || !S.items.length) S.items = structuredClone(defaults.items);
  S.custom.roll = { ...defaults.custom.roll, ...(S.custom.roll || {}) };
  S.custom.sheet = { ...defaults.custom.sheet, ...(S.custom.sheet || {}) };
  const PRESETS = {
    "thermal-2x1": () => { S.tab = "fnsku"; S.fnsku.stock = "r-2x1"; },
    dymo: () => { S.tab = "fnsku"; S.fnsku.stock = "r-2.25x1.25"; },
    csv: () => { S.tab = "fnsku"; },
    zpl: () => { S.tab = "fnsku"; if (C.STOCK[S.fnsku.stock]?.kind !== "roll") S.fnsku.stock = "r-2x1"; },
    convert: () => { S.tab = "convert"; },
    suffocation: () => { S.tab = "prep"; S.prep.type = "suffocation"; },
    set: () => { S.tab = "prep"; S.prep.type = "set"; if (S.prep.stock === "r-4x2") S.prep.stock = "r-2x1"; },
    expiry: () => { S.tab = "prep"; S.prep.type = "expiry"; },
    bin: () => { S.tab = "bin"; },
  };
  if (PRESETS[preset]) PRESETS[preset]();
  if (!S.prep.date) { const d = new Date(Date.now() + 365 * 864e5); S.prep.date = d.toISOString().slice(0, 10); }
  let saveT = 0;
  const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set("state", S), 250); };

  const stockOf = id => id === "custom-roll" ? C.customStock({ kind: "roll", ...S.custom.roll }) : id === "custom-sheet" ? C.customStock({ kind: "sheet", ...S.custom.sheet }) : C.STOCK[id] || C.STOCK["r-2x1"];
  const SMALL = s => !s.big;
  function stockSelect(id, value, filter = () => true, label = "Label stock") {
    const opt = s => `<option value="${s.id}"${s.id === value ? " selected" : ""}>${esc(s.name)}</option>`;
    const rolls = C.STOCKS.filter(s => s.kind === "roll" && filter(s)), sheets = C.STOCKS.filter(s => s.kind === "sheet" && filter(s));
    return `<label for="${id}">${label}</label><select id="${id}" data-stock>
      <optgroup label="Thermal rolls (one label per page)">${rolls.map(opt).join("")}</optgroup>
      ${sheets.length ? `<optgroup label="Label sheets (laser printer)">${sheets.map(opt).join("")}</optgroup>` : ""}
      <optgroup label="Custom"><option value="custom-roll"${value === "custom-roll" ? " selected" : ""}>Custom roll size…</option>${sheets.length ? `<option value="custom-sheet"${value === "custom-sheet" ? " selected" : ""}>Custom sheet layout…</option>` : ""}</optgroup>
    </select>`;
  }
  function customFields(p) {
    const r = S.custom.roll, s = S.custom.sheet;
    const f = (key, lab, val, step = "0.1") => `<div><label for="${p}-c-${key}">${lab}</label><input id="${p}-c-${key}" type="number" step="${step}" min="0" inputmode="decimal" data-custom="${key}" value="${esc(val)}"></div>`;
    return `<div class="pl-custom" data-custom-roll hidden><div class="row">${f("roll.w", "Label width (mm)", r.w)}${f("roll.h", "Label height (mm)", r.h)}</div><p class="pl-hint">1 in = 25.4 mm. A 2 × 1 in label is 50.8 × 25.4 mm.</p></div>
    <div class="pl-custom" data-custom-sheet hidden>
      <label for="${p}-c-page">Paper</label><select id="${p}-c-page" data-custom="sheet.page"><option value="letter"${s.page === "letter" ? " selected" : ""}>US Letter (8.5 × 11 in)</option><option value="a4"${s.page === "a4" ? " selected" : ""}>A4 (210 × 297 mm)</option></select>
      <div class="row">${f("sheet.cols", "Columns", s.cols, "1")}${f("sheet.rows", "Rows", s.rows, "1")}</div>
      <div class="row">${f("sheet.w", "Label width (mm)", s.w)}${f("sheet.h", "Label height (mm)", s.h)}</div>
      <div class="row">${f("sheet.left", "Left margin (mm)", s.left)}${f("sheet.top", "Top margin (mm)", s.top)}</div>
      <div class="row">${f("sheet.hgap", "Gap between columns (mm)", s.hgap)}${f("sheet.vgap", "Gap between rows (mm)", s.vgap)}</div>
      <p class="pl-hint" data-custom-issues></p>
    </div>`;
  }
  function startField(p, value) {
    return `<div class="pl-start" data-sheet-only><label for="${p}-start">Start at label</label>
      <div class="pl-start-row"><input id="${p}-start" type="number" min="1" step="1" inputmode="numeric" data-start value="${esc(value)}"><span class="pl-hint">Skip labels already used on a part-used sheet. Labels are counted left to right, top to bottom.</span></div>
      <div class="pl-mini" data-mini aria-label="Pick the first label position"></div></div>`;
  }
  function printerFields(p, o) {
    return `<details class="pl-more"><summary>Printer and alignment</summary>
      ${o.dpi ? `<label for="${p}-dpi">Printer resolution</label><select id="${p}-dpi" data-k="dpi">
        <option value="auto">Automatic for this label stock</option><option value="203">203 dpi (most Rollo, Zebra, Munbyn)</option><option value="300">300 dpi (DYMO LabelWriter, some Zebra)</option><option value="600">600 dpi or laser printer</option></select>
        <p class="pl-hint">Bars are snapped to whole printer dots so they print crisp and scan reliably.</p>` : ""}
      <div data-roll-only><label for="${p}-rot">Rotate each label</label><select id="${p}-rot" data-k="rotate"><option value="0">No rotation</option><option value="90">90° (portrait page)</option><option value="270">270° (portrait page, other way)</option></select>
      <p class="pl-hint">Only if your printer feeds labels sideways and the driver doesn't rotate them for you.</p></div>
      <div class="row"><div><label for="${p}-dx">Nudge right (mm)</label><input id="${p}-dx" type="number" step="0.1" inputmode="decimal" data-cal="dx" value="${esc(S.cal.dx)}"></div>
      <div><label for="${p}-dy">Nudge down (mm)</label><input id="${p}-dy" type="number" step="0.1" inputmode="decimal" data-cal="dy" value="${esc(S.cal.dy)}"></div></div>
      <p class="pl-hint">Moves everything on the page. Use negative numbers to move left or up. Shared by every tab; check it with the alignment test.</p>
    </details>`;
  }
  const previewBox = p => `<div class="pl-out-head"><p class="pl-summary" data-summary aria-live="polite"></p></div>
    <div class="pl-stage" data-stage><div class="pl-paper" data-paper></div></div>
    <div class="pl-pager" data-pager hidden><button type="button" class="btn ghost sm" data-page="-1" aria-label="Previous page">‹</button><span data-pageinfo></span><button type="button" class="btn ghost sm" data-page="1" aria-label="Next page">›</button></div>`;

  /* ------------------------------------------------------------ shell */
  const TABS = [["fnsku", "FNSKU labels"], ["convert", "PDF → thermal"], ["prep", "Prep labels"], ["bin", "Bin labels"], ["test", "Test & scan"]];
  mount.innerHTML = `<div class="pl-tabs" role="tablist" aria-label="PrepLabel tools">${TABS.map(([id, name]) => `<button type="button" role="tab" id="pl-tab-${id}" aria-controls="pl-panel-${id}" data-tab="${id}">${name}</button>`).join("")}</div>
  ${TABS.map(([id]) => `<section class="pl-panel" role="tabpanel" id="pl-panel-${id}" aria-labelledby="pl-tab-${id}" data-panel="${id}" hidden></section>`).join("")}`;

  const panels = {};
  const P = id => $(`[data-panel="${id}"]`);

  function selectTab(id, focus) {
    S.tab = id; persist();
    $$("[data-tab]").forEach(b => { const on = b.dataset.tab === id; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    $$("[data-panel]").forEach(p => { p.hidden = p.dataset.panel !== id; });
    panels[id].show();
  }
  $(".pl-tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) selectTab(b.dataset.tab); });
  $(".pl-tabs").addEventListener("keydown", e => {
    const ids = TABS.map(t => t[0]);
    let i = ids.indexOf(S.tab);
    if (e.key === "ArrowRight") i = (i + 1) % ids.length;
    else if (e.key === "ArrowLeft") i = (i - 1 + ids.length) % ids.length;
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = ids.length - 1;
    else return;
    e.preventDefault();
    selectTab(ids[i], true);
  });

  /* ------------------------------------------------------------ shared label-job panel behaviour */
  // A job panel has a stock select, optional start field, preview and a download button.
  function jobPanel(id, cfg) {
    const root = P(id);
    const st = S[id];
    let page = 0, lastPages = [], lastJob = null, timer = 0;
    const view = { root, st, cfg, render: () => schedule(), get pages() { return lastPages; } };
    function syncStockUI() {
      const stock = stockOf(st.stock);
      const sel = $("[data-stock]", root);
      if (sel && sel.value !== st.stock) sel.value = st.stock;
      $$("[data-sheet-only]", root).forEach(el => { el.hidden = stock.kind !== "sheet"; });
      $$("[data-roll-only]", root).forEach(el => { el.hidden = stock.kind !== "roll"; });
      const cr = $("[data-custom-roll]", root), cs = $("[data-custom-sheet]", root);
      if (cr) cr.hidden = st.stock !== "custom-roll";
      if (cs) cs.hidden = st.stock !== "custom-sheet";
      const iss = $("[data-custom-issues]", root);
      if (iss) iss.textContent = st.stock === "custom-sheet" ? C.stockIssues(stock).join(" ") : "";
      const dpi = $("[data-k=dpi]", root); if (dpi) dpi.value = String(st.dpi ?? "auto");
      const rot = $("[data-k=rotate]", root); if (rot) rot.value = String(st.rotate || 0);
      const s = $("[data-start]", root);
      if (s && stock.kind === "sheet") {
        const per = stock.cols * stock.rows;
        s.max = per;
        if (+st.start > per) st.start = 1;
        if (document.activeElement !== s) s.value = st.start;
        const mini = $("[data-mini]", root);
        if (mini.dataset.key !== `${stock.id}:${stock.cols}x${stock.rows}`) {
          mini.dataset.key = `${stock.id}:${stock.cols}x${stock.rows}`;
          mini.style.gridTemplateColumns = `repeat(${stock.cols}, minmax(0, 1fr))`;
          mini.innerHTML = per > 120 ? "" : Array.from({ length: per }, (_, i) => `<button type="button" data-cell="${i + 1}" aria-label="Start at label ${i + 1}" title="Label ${i + 1}"></button>`).join("");
        }
        $$("[data-cell]", mini).forEach(b => { const n = +b.dataset.cell; b.classList.toggle("skip", n < st.start); b.classList.toggle("first", n === +st.start); b.setAttribute("aria-pressed", n === +st.start); });
      }
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(draw, 60); }
    function draw() {
      syncStockUI();
      const job = cfg.job();
      lastJob = job;
      if (job.loading) { $("[data-summary]", root).textContent = "Loading…"; return; }
      const opts = { start: st.start, dx: S.cal.dx, dy: S.cal.dy, rotate: +st.rotate || 0, credit: job.credit !== false };
      lastPages = job.draws.length ? C.paginate(job.stock, job.draws, opts) : [];
      if (job.extraPages) lastPages = lastPages.concat(job.extraPages);
      if (page >= lastPages.length) page = Math.max(0, lastPages.length - 1);
      const pg = lastPages[page];
      const paper = $("[data-paper]", root);
      paper.className = "pl-paper " + (job.stock.kind === "roll" ? "is-roll" : "is-sheet") + (job.example ? " is-example" : "");
      if (pg) {
        const ratio = pg.w / pg.h;
        paper.style.setProperty("--ar", `${pg.w} / ${pg.h}`);
        paper.style.maxWidth = job.stock.kind === "roll" ? `min(100%, ${Math.round(Math.min(460, Math.max(220, 300 * ratio)))}px)` : "100%";
        paper.innerHTML = C.toSvg(pg, { cells: true, label: job.example ? "Example label preview" : `Preview of ${job.stock.kind === "roll" ? "label" : "sheet"} ${page + 1}` });
      } else paper.innerHTML = `<p class="pl-empty">${esc(job.empty || "Nothing to preview yet.")}</p>`;
      const stage = $("[data-stage]", root);
      const badge = $(".pl-badge", stage);
      if (job.example && !badge) stage.insertAdjacentHTML("afterbegin", `<span class="pl-badge">Example</span>`);
      else if (!job.example && badge) badge.remove();
      const pager = $("[data-pager]", root);
      pager.hidden = lastPages.length < 2;
      $("[data-pageinfo]", root).textContent = `${job.stock.kind === "roll" ? "Label" : "Page"} ${page + 1} of ${lastPages.length}`;
      $("[data-page='-1']", root).disabled = page === 0;
      $("[data-page='1']", root).disabled = page >= lastPages.length - 1;
      $("[data-summary]", root).innerHTML = job.summary || "";
      cfg.after && cfg.after(job, lastPages);
    }
    root.addEventListener("click", e => {
      const pb = e.target.closest("[data-page]");
      if (pb) { page = Math.max(0, Math.min(lastPages.length - 1, page + +pb.dataset.page)); draw(); return; }
      const cell = e.target.closest("[data-cell]");
      if (cell) { st.start = +cell.dataset.cell; const si = $("[data-start]", root); if (si) si.value = st.start; persist(); draw(); }
    });
    root.addEventListener("change", e => {
      const t = e.target;
      if (t.matches("[data-stock]")) { st.stock = t.value; page = 0; if (cfg.onStock) cfg.onStock(); persist(); schedule(); }
    });
    root.addEventListener("input", e => {
      const t = e.target;
      if (t.matches("[data-start]")) { st.start = Math.max(1, parseInt(t.value, 10) || 1); persist(); schedule(); }
      else if (t.matches("[data-cal]")) { S.cal[t.dataset.cal] = num(t.value); $$(`[data-cal="${t.dataset.cal}"]`).forEach(o => { if (o !== t) o.value = t.value; }); persist(); schedule(); }
      else if (t.matches("[data-custom]")) {
        const [grp, key] = t.dataset.custom.split(".");
        S.custom[grp][key] = key === "page" ? t.value : num(t.value);
        $$(`[data-custom="${t.dataset.custom}"]`).forEach(o => { if (o !== t) o.value = t.value; });
        persist(); schedule();
      } else if (t.matches("[data-k]")) {
        const k = t.dataset.k;
        st[k] = t.type === "checkbox" ? t.checked : t.value;
        persist(); schedule();
      }
    });
    view.flush = () => { clearTimeout(timer); draw(); return lastJob; };
    view.download = async (btn, msgEl, name, meta) => {
      const job = view.flush();
      if (!job || !lastPages.length || job.example) { msgEl.textContent = job && job.example ? "Add at least one code first. The preview shows an example." : "Nothing to print yet."; msgEl.className = "pl-msg err"; return false; }
      btn.disabled = true;
      msgEl.className = "pl-msg"; msgEl.textContent = "Building PDF…";
      try {
        const PL = await getPdfLib();
        const bytes = await C.toPdf(PL, lastPages, meta);
        saveBlob(new Blob([bytes], { type: "application/pdf" }), name);
        msgEl.className = "pl-msg ok";
        msgEl.textContent = `Saved ${name} (${plural(lastPages.length, "page")}). Print it at 100% / Actual size.`;
        return true;
      } catch (e) {
        msgEl.className = "pl-msg err"; msgEl.textContent = "Couldn't build the PDF: " + (e.message || e);
        return false;
      } finally { btn.disabled = false; }
    };
    view.job = () => lastJob;
    return view;
  }

  /* ------------------------------------------------------------ FNSKU tab */
  const condOptions = v => C.CONDITIONS.concat([""]).map(c => `<option value="${esc(c)}"${c === v ? " selected" : ""}>${c ? esc(c) : "(no condition line)"}</option>`).join("");
  P("fnsku").innerHTML = `<div class="pl-grid">
    <form class="pl-form" autocomplete="off" onsubmit="return false">
      <h3 id="pl-prod-h">Products</h3>
      <div class="pl-items-head" aria-hidden="true"><span>FNSKU or SKU</span><span>Labels</span></div>
      <div class="pl-items" data-items aria-labelledby="pl-prod-h"></div>
      <div class="pl-row-btns"><button type="button" class="btn ghost sm" data-a="add">+ Add product</button><button type="button" class="btn ghost sm" data-a="import" aria-expanded="false" aria-controls="pl-import">Import CSV / Excel</button><button type="button" class="btn ghost sm" data-a="library" aria-expanded="false" aria-controls="pl-library">Saved products</button><button type="button" class="btn ghost sm" data-a="clearList">Clear list</button></div>
      <div class="pl-sub" id="pl-import" hidden>
        <h4>Bulk import</h4>
        <p class="pl-hint">Columns: FNSKU, title, condition, quantity (header names like <code>fnsku</code>, <code>product-name</code>, <code>quantity</code> are recognised; Seller Central inventory reports work as they are). CSV, TSV, TXT or XLSX.</p>
        <label for="pl-file">Spreadsheet file</label><input type="file" id="pl-file" accept=".csv,.tsv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">
        <label for="pl-paste">…or paste rows from a spreadsheet</label><textarea id="pl-paste" rows="4" placeholder="X001ABC123	Water bottle 750 ml	New	24"></textarea>
        <div class="pl-row-btns"><button type="button" class="btn sm" data-a="readPaste">Read pasted rows</button><button type="button" class="btn ghost sm" data-a="template">Download CSV template</button></div>
        <div class="pl-report" data-report aria-live="polite"></div>
      </div>
      <div class="pl-sub" id="pl-library" hidden>
        <h4>Saved products</h4>
        <div class="row"><div><label for="pl-lib">Library</label><select id="pl-lib" data-lib></select></div><div><label for="pl-newlib">New client library</label><div class="pl-inline"><input id="pl-newlib" placeholder="Client name"><button type="button" class="btn ghost sm" data-a="newLib">Add</button></div></div></div>
        <div class="pl-row-btns"><button type="button" class="btn sm" data-a="saveLib">Save current list to this library</button><button type="button" class="btn ghost sm" data-a="addAllLib">Add all to list</button></div>
        <label for="pl-libq">Search</label><input id="pl-libq" type="search" placeholder="FNSKU or title">
        <ul class="pl-liblist" data-liblist></ul>
        <p class="pl-hint">Libraries are stored in this browser only. Use one per client if you prep for others.</p>
      </div>
      <h3>Label stock</h3>
      ${stockSelect("pl-f-stock", S.fnsku.stock, SMALL, "Print on")}
      ${customFields("pl-f")}
      ${startField("pl-f", S.fnsku.start)}
      <h3>On the label</h3>
      <label class="pl-check"><input type="checkbox" data-k="showTitle"${S.fnsku.showTitle ? " checked" : ""}> Product title</label>
      <label class="pl-check"><input type="checkbox" data-k="showCondition"${S.fnsku.showCondition ? " checked" : ""}> Condition line</label>
      <label for="pl-f-lines">Title lines</label><select id="pl-f-lines" data-k="titleLines"><option value="auto">Automatic for the label height</option><option value="1">1 line</option><option value="2">2 lines</option></select>
      <p class="pl-hint">Unit labels carry only the barcode, the code, the title and the condition. Long titles are shortened in the middle so the size or colour at the end stays visible.</p>
      ${printerFields("pl-f", { dpi: true })}
    </form>
    <div class="pl-out">
      ${previewBox("pl-f")}
      <label for="pl-f-ship">Shipment or batch name (optional, for your print log)</label><input id="pl-f-ship" data-k="shipment" placeholder="e.g. FBA17ABC1234 or 8 Oct wholesale" value="${esc(S.fnsku.shipment)}">
      <div class="pl-actions"><button type="button" class="btn" data-a="pdf">Download PDF</button><button type="button" class="btn ghost" data-a="zpl" data-roll-only>Download ZPL (Zebra)</button></div>
      <p class="pl-msg" data-msg role="status"></p>
      <ul class="pl-warn" data-warn></ul>
      <p class="pl-hint">Print a test label first and scan it (the Test &amp; scan tab can check it with your phone camera). Always print at 100% / Actual size.</p>
      <details class="pl-more" data-logbox><summary>Print log</summary><div data-log></div></details>
    </div>
  </div>`;

  const F = P("fnsku");
  const fItems = $("[data-items]", F);
  function itemRow(it, i) {
    const chk = C.checkCode(it.code);
    return `<div class="pl-item" data-i="${i}">
      <div class="pl-item-a"><input class="mono" data-f="code" value="${esc(it.code)}" placeholder="X00…" aria-label="FNSKU or SKU, product ${i + 1}" autocapitalize="characters" spellcheck="false" maxlength="48">
      <input type="number" data-f="qty" min="0" max="9999" step="1" inputmode="numeric" value="${esc(it.qty)}" aria-label="Number of labels, product ${i + 1}">
      <button type="button" class="pl-x" data-a="del" aria-label="Remove product ${i + 1}">×</button></div>
      <div class="pl-item-b"><input data-f="title" value="${esc(it.title)}" placeholder="Product title" aria-label="Product title, product ${i + 1}" maxlength="500">
      <select data-f="condition" aria-label="Condition, product ${i + 1}">${condOptions(it.condition)}</select></div>
      <p class="pl-chk ${chk.level}" data-chk>${it.code ? esc(chk.msg) : ""}</p>
    </div>`;
  }
  const renderItems = () => { fItems.innerHTML = S.items.map(itemRow).join(""); };

  const fView = jobPanel("fnsku", {
    job() {
      const st = S.fnsku, stock = stockOf(st.stock);
      const dpi = st.dpi === "auto" ? stock.dpi : +st.dpi;
      const opts = { kind: stock.kind, dpi, showTitle: !!st.showTitle, showCondition: !!st.showCondition, titleLines: st.titleLines };
      let list = S.items.filter(it => String(it.code).trim() && (parseInt(it.qty, 10) || 0) > 0);
      const example = !list.length;
      if (example) list = [{ code: "X00EXAMPLE", title: "Example product title, size and colour", condition: "New", qty: 1 }];
      const draws = [], warns = [];
      let total = 0, fit = null;
      for (const it of list) {
        const d = C.memo(C.unitLabel(it, opts));
        const q = Math.min(9999, parseInt(it.qty, 10) || 0);
        const info = d({ x: 0, y: 0, w: stock.w, h: stock.h }).info;
        const code = C.normCode(it.code);
        if (!fit && info.fit) fit = info.fit;
        if (info.err) warns.push(`<strong>${esc(code)}</strong>: ${esc(info.err)}`);
        else if (!info.fit.ok) warns.push(`<strong>${esc(code)}</strong> is too long for this label: bars would be ${info.fit.m.toFixed(3)} mm wide, too thin to scan. Use a wider label (3 × 1 in) or a shorter code.`);
        else if (info.fit.tight) warns.push(`<strong>${esc(code)}</strong>: bars are only ${info.fit.m.toFixed(2)} mm wide on this label. Test-scan before printing a batch.`);
        if (info.lost) warns.push(`<strong>${esc(code)}</strong>: some title characters can't be printed with the label font and were left out.`);
        for (let k = 0; k < q && total < MAX_LABELS; k++, total++) draws.push(d);
      }
      const capped = S.items.reduce((s, it) => s + (parseInt(it.qty, 10) || 0), 0) > MAX_LABELS;
      if (capped) warns.unshift(`Only the first ${MAX_LABELS.toLocaleString()} labels fit in one PDF. Split larger runs into batches.`);
      const per = stock.kind === "sheet" ? stock.cols * stock.rows : 1;
      const sheets = stock.kind === "sheet" ? Math.ceil((draws.length + (Math.max(1, +st.start) - 1)) / per) : draws.length;
      const barInfo = fit ? ` · bars ${fit.m.toFixed(3)} mm (${(fit.m / 0.0254).toFixed(1)} mil)` : "";
      const summary = example ? `Example label on <strong>${esc(stock.short)}</strong>. Type an FNSKU to start.` :
        stock.kind === "sheet" ? `<strong>${plural(draws.length, "label")}</strong> on ${plural(sheets, "sheet")} of ${esc(stock.short)}${barInfo}` :
        `<strong>${plural(draws.length, "label")}</strong> on ${esc(stock.short)} (one label per PDF page)${barInfo}`;
      return { stock, draws, example, summary, warns, dpi };
    },
    after(job) {
      $("[data-warn]", F).innerHTML = job.warns.map(w => `<li>${w}</li>`).join("");
    },
  });
  fView.show = () => { fView.render(); };

  F.addEventListener("input", e => {
    const t = e.target, row = t.closest(".pl-item");
    if (!row) return;
    const it = S.items[+row.dataset.i];
    const f = t.dataset.f;
    if (!it || !f) return;
    it[f] = f === "qty" ? Math.max(0, Math.min(9999, parseInt(t.value, 10) || 0)) : t.value;
    if (f === "code") {
      const chk = C.checkCode(t.value);
      const p = $("[data-chk]", row);
      p.className = "pl-chk " + chk.level;
      p.textContent = t.value.trim() ? chk.msg : "";
    }
    persist(); fView.render();
  });
  F.addEventListener("change", e => {
    const t = e.target, row = t.closest(".pl-item");
    if (row && t.dataset.f === "code") {
      const n = C.normCode(t.value);
      if (n !== t.value) {
        t.value = n; S.items[+row.dataset.i].code = n; persist(); fView.render();
        const chk = C.checkCode(n), pEl = $("[data-chk]", row);
        pEl.className = "pl-chk " + chk.level; pEl.textContent = n ? chk.msg : "";
      }
    }
    if (row && t.dataset.f === "condition") { S.items[+row.dataset.i].condition = t.value; persist(); fView.render(); }
  });
  F.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.matches("[data-f=code],[data-f=title],[data-f=qty]")) {
      e.preventDefault();
      const row = e.target.closest(".pl-item");
      if (+row.dataset.i === S.items.length - 1 && e.target.value.trim()) addItem(true);
    }
  });
  function addItem(focus) {
    const last = S.items[S.items.length - 1];
    S.items.push({ code: "", title: "", condition: last ? last.condition : "New", qty: last ? last.qty || 1 : 1 });
    renderItems(); persist(); fView.render();
    if (focus) $$(".pl-item [data-f=code]", F).pop().focus();
  }

  /* import */
  function showReport(rep, source) {
    const box = $("[data-report]", F);
    const labels = rep.items.reduce((s, i) => s + i.qty, 0);
    const map = Object.entries(rep.mapping).map(([k, v]) => `${{ code: "FNSKU", title: "Title", condition: "Condition", qty: "Quantity" }[k]} ← ${esc(v)}`).join(" · ");
    box.innerHTML = rep.items.length ? `<p><strong>${plural(rep.items.length, "product")}, ${plural(labels, "label")}</strong> found in ${esc(source)}.</p>
      <p class="pl-hint">${map}</p>
      ${rep.skipped.length ? `<p class="pl-hint">Skipped ${plural(rep.skipped.length, "row")}: ${rep.skipped.slice(0, 8).map(s => `line ${s.line} (${esc(s.reason)})`).join(", ")}${rep.skipped.length > 8 ? "…" : ""}</p>` : ""}
      <div class="pl-row-btns"><button type="button" class="btn sm" data-a="useReplace">Replace my list</button><button type="button" class="btn ghost sm" data-a="useAppend">Add to my list</button></div>`
      : `<p class="pl-msg err">No rows with an FNSKU or SKU found in ${esc(source)}.</p>`;
    box._rep = rep;
  }
  async function importFile(file) {
    if (!allow("Bulk import from CSV or Excel.")) return;
    const box = $("[data-report]", F);
    box.innerHTML = `<p class="pl-hint">Reading ${esc(file.name)}…</p>`;
    try {
      let rows;
      if (/\.xlsx$/i.test(file.name) || file.type.includes("spreadsheetml")) {
        if (typeof DecompressionStream === "undefined") throw new Error("This browser can't open .xlsx files. Save the sheet as CSV and import that.");
        rows = await C.readXlsx(await file.arrayBuffer());
      } else rows = C.parseDelimited(await file.text());
      showReport(C.mapRows(rows), file.name);
      track("csv_imported");
    } catch (e) { box.innerHTML = `<p class="pl-msg err">${esc(e.message || "Couldn't read that file.")}</p>`; }
  }
  $("#pl-file", F).addEventListener("change", e => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ""; });

  /* library */
  const libs = () => { const l = store.get("lib", { Default: [] }); if (!l.Default) l.Default = []; return l; };
  function renderLib() {
    const l = libs();
    if (!l[S.lib]) S.lib = "Default";
    $("[data-lib]", F).innerHTML = Object.keys(l).map(n => `<option${n === S.lib ? " selected" : ""}>${esc(n)}</option>`).join("");
    const q = $("#pl-libq", F).value.trim().toLowerCase();
    const list = (l[S.lib] || []).map((it, i) => ({ ...it, i })).filter(it => !q || it.code.toLowerCase().includes(q) || (it.title || "").toLowerCase().includes(q));
    $("[data-liblist]", F).innerHTML = list.length ? list.slice(0, 200).map(it => `<li><span><span class="mono">${esc(it.code)}</span> ${esc(it.title || "")}</span><span class="pl-libbtns"><button type="button" class="btn ghost sm" data-a="libAdd" data-li="${it.i}" aria-label="Add ${esc(it.code)} to the list">Add</button><button type="button" class="pl-x" data-a="libDel" data-li="${it.i}" aria-label="Delete ${esc(it.code)} from the library">×</button></span></li>`).join("") : `<li class="pl-hint">No saved products${q ? " match" : " yet"}.</li>`;
  }
  $("#pl-libq", F).addEventListener("input", renderLib);
  $("[data-lib]", F).addEventListener("change", e => { S.lib = e.target.value; persist(); renderLib(); });

  /* print log */
  const log = () => store.get("log", []);
  function addLog(kind) {
    const job = fView.job();
    if (!job || job.example) return;
    const counts = new Map();
    S.items.forEach(it => { const c = C.normCode(it.code), q = parseInt(it.qty, 10) || 0; if (c && q > 0) { const e = counts.get(c) || { code: c, title: it.title, qty: 0 }; e.qty += q; counts.set(c, e); } });
    const entry = { at: new Date().toISOString(), kind, stock: job.stock.short, shipment: S.fnsku.shipment || "", items: [...counts.values()], total: job.draws.length };
    const l = log(); l.unshift(entry); store.set("log", l.slice(0, 500));
    renderLog();
  }
  function renderLog() {
    const l = log();
    $("[data-log]", F).innerHTML = l.length ? `<table class="pl-logt"><thead><tr><th>Date</th><th>Shipment</th><th>Labels</th></tr></thead><tbody>${l.slice(0, 20).map(e => `<tr><td>${esc(e.at.slice(0, 16).replace("T", " "))}</td><td>${esc(e.shipment || "–")}<br><span class="pl-hint">${plural(e.items.length, "SKU")} · ${esc(e.stock)} · ${e.kind.toUpperCase()}</span></td><td>${e.total}</td></tr>`).join("")}</tbody></table>
      <div class="pl-row-btns"><button type="button" class="btn ghost sm" data-a="logCsv">Export log as CSV</button><button type="button" class="btn ghost sm" data-a="logClear">Clear log</button></div>` : `<p class="pl-hint">Each PDF or ZPL you download is listed here with its SKUs and quantities (stored in this browser only).</p>`;
  }
  const csvCell = v => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

  F.addEventListener("click", async e => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const a = b.dataset.a;
    const msg = $("[data-msg]", F);
    if (a === "add") addItem(true);
    else if (a === "del") {
      S.items.splice(+b.closest(".pl-item").dataset.i, 1);
      if (!S.items.length) S.items.push({ code: "", title: "", condition: "New", qty: 1 });
      renderItems(); persist(); fView.render();
    } else if (a === "clearList") {
      if (S.items.some(it => String(it.code).trim() || String(it.title).trim()) && !confirm("Remove every product from the list? Saved products and the print log are kept.")) return;
      S.items = [{ code: "", title: "", condition: "New", qty: 1 }];
      renderItems(); persist(); fView.flush();
    } else if (a === "import" || a === "library") {
      const box = $(a === "import" ? "#pl-import" : "#pl-library", F);
      box.hidden = !box.hidden;
      b.setAttribute("aria-expanded", String(!box.hidden));
      if (a === "library" && !box.hidden) renderLib();
    } else if (a === "readPaste") {
      if (!allow("Bulk import from CSV or Excel.")) return;
      const txt = $("#pl-paste", F).value;
      if (!txt.trim()) { $("[data-report]", F).innerHTML = `<p class="pl-msg err">Paste some rows first.</p>`; return; }
      showReport(C.mapRows(C.parseDelimited(txt)), "the pasted rows");
      track("csv_imported");
    } else if (a === "template") {
      saveBlob(new Blob(["fnsku,title,condition,quantity\r\nX00EXAMPLE,Replace with your product title,New,12\r\n"], { type: "text/csv" }), "preplabel-fnsku-template.csv");
    } else if (a === "useReplace" || a === "useAppend") {
      const rep = $("[data-report]", F)._rep;
      if (!rep) return;
      const rows = rep.items.map(i => ({ ...i }));
      const keep = S.items.filter(it => String(it.code).trim());
      S.items = a === "useReplace" ? rows : keep.concat(rows);
      renderItems(); persist(); fView.render();
      $("[data-report]", F).innerHTML = `<p class="pl-msg ok">${plural(rows.length, "product")} ${a === "useReplace" ? "loaded" : "added"}.</p>`;
    } else if (a === "newLib") {
      const name = $("#pl-newlib", F).value.trim().slice(0, 60);
      if (!name || !allow("Separate libraries per client.")) return;
      const l = libs(); if (!l[name]) l[name] = [];
      store.set("lib", l); S.lib = name; persist(); $("#pl-newlib", F).value = ""; renderLib();
    } else if (a === "saveLib") {
      if (!allow("Save products for one-click reprints.")) return;
      const l = libs(); const cur = l[S.lib] || (l[S.lib] = []);
      let n = 0;
      S.items.forEach(it => {
        const code = C.normCode(it.code); if (!code) return;
        const ex = cur.find(x => x.code === code);
        if (ex) { ex.title = it.title; ex.condition = it.condition; } else cur.push({ code, title: it.title, condition: it.condition });
        n++;
      });
      store.set("lib", l); renderLib();
      msg.className = "pl-msg ok"; msg.textContent = `Saved ${plural(n, "product")} to “${S.lib}”.`;
    } else if (a === "libAdd" || a === "addAllLib") {
      const cur = libs()[S.lib] || [];
      const add = a === "libAdd" ? [cur[+b.dataset.li]] : cur;
      const keep = S.items.filter(it => String(it.code).trim());
      S.items = keep.concat(add.filter(Boolean).map(x => ({ code: x.code, title: x.title || "", condition: x.condition ?? "New", qty: 1 })));
      if (!S.items.length) S.items.push({ code: "", title: "", condition: "New", qty: 1 });
      renderItems(); persist(); fView.render();
    } else if (a === "libDel") {
      const l = libs(); (l[S.lib] || []).splice(+b.dataset.li, 1); store.set("lib", l); renderLib();
    } else if (a === "pdf") {
      const st = fView.flush()?.stock;
      const name = `fnsku-labels-${slug(st ? st.short.replace(/\(.*\)/, "") : "labels")}-${today()}.pdf`;
      if (await fView.download(b, msg, name, { title: "FNSKU labels", subject: S.fnsku.shipment || "" })) { track("pdf_generated"); addLog("pdf"); }
    } else if (a === "zpl") {
      if (!allow("ZPL export for Zebra printers.")) return;
      const job = fView.flush();
      if (!job || job.example) { msg.className = "pl-msg err"; msg.textContent = "Add at least one code first."; return; }
      const dpi = job.dpi >= 300 ? 300 : 203;
      const { zpl, warnings } = C.toZpl(S.items, job.stock, { dpi, showTitle: S.fnsku.showTitle, showCondition: S.fnsku.showCondition, titleLines: S.fnsku.titleLines });
      if (!zpl.trim()) { msg.className = "pl-msg err"; msg.textContent = "Nothing to export."; return; }
      const name = `fnsku-labels-${dpi}dpi-${today()}.zpl`;
      saveBlob(new Blob([zpl], { type: "text/plain" }), name);
      msg.className = "pl-msg ok";
      msg.textContent = `Saved ${name} for a ${dpi} dpi Zebra printer.` + (warnings.length ? " " + warnings.join(" ") : "");
      track("zpl_exported"); addLog("zpl");
    } else if (a === "logCsv") {
      const rows = [["date", "shipment", "stock", "format", "fnsku", "title", "quantity"]];
      log().forEach(e => e.items.forEach(it => rows.push([e.at, e.shipment, e.stock, e.kind, it.code, it.title, it.qty])));
      saveBlob(new Blob([rows.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n"], { type: "text/csv" }), `preplabel-print-log-${today()}.csv`);
    } else if (a === "logClear") {
      if (confirm("Clear the print log in this browser?")) { store.set("log", []); renderLog(); }
    }
  });
  F.addEventListener("input", e => { if (e.target.id === "pl-f-ship") { S.fnsku.shipment = e.target.value; persist(); } });
  $("#pl-f-lines", F).value = S.fnsku.titleLines;
  renderItems();
  renderLog();
  if (preset === "csv") { $("#pl-import", F).hidden = false; $("[data-a=import]", F).setAttribute("aria-expanded", "true"); }

  /* ------------------------------------------------------------ Prep labels tab */
  const LANGS = Object.entries(C.SUFFOCATION).map(([k, v]) => [k, v.name]);
  P("prep").innerHTML = `<div class="pl-grid">
    <form class="pl-form" autocomplete="off" onsubmit="return false">
      <fieldset class="pl-seg"><legend>Label type</legend>
        ${[["suffocation", "Suffocation warning"], ["set", "Sold as set"], ["expiry", "Expiration date"], ["custom", "Custom text"]].map(([v, n]) => `<label><input type="radio" name="pl-ptype" value="${v}" data-k="type"${S.prep.type === v ? " checked" : ""}> ${n}</label>`).join("")}
      </fieldset>
      <div data-ptype="suffocation">
        <h3>Bag size (measured flat)</h3>
        <div class="row3"><div><label for="pl-bagw">Width (opening)</label><input id="pl-bagw" type="number" min="0" step="0.1" inputmode="decimal" data-k="bagW" value="${esc(S.prep.bagW)}"></div><div><label for="pl-bagl">Length</label><input id="pl-bagl" type="number" min="0" step="0.1" inputmode="decimal" data-k="bagL" value="${esc(S.prep.bagL)}"></div><div><label for="pl-unit">Unit</label><select id="pl-unit" data-k="unit"><option value="in">inches</option><option value="cm">cm</option></select></div></div>
        <p class="pl-rule" data-rule aria-live="polite"></p>
        <fieldset class="pl-langs"><legend>Languages</legend>${LANGS.map(([k, n]) => `<label><input type="checkbox" data-lang="${k}"${S.prep.langs.includes(k) ? " checked" : ""}> ${n}</label>`).join("")}</fieldset>
        <details class="pl-more"><summary>Edit the warning text</summary><label for="pl-sufftext">Your own wording (leave empty for the standard text). Start a line with “WARNING:” to make that word bold.</label><textarea id="pl-sufftext" rows="4" data-k="suffText">${esc(S.prep.suffText)}</textarea></details>
      </div>
      <div data-ptype="set">
        <label for="pl-setkind">Wording</label><select id="pl-setkind" data-k="setKind"><option value="sold-as-set">SOLD AS SET / DO NOT SEPARATE</option><option value="this-is-a-set">THIS IS A SET / DO NOT SEPARATE</option><option value="sold-as-set-only">SOLD AS SET</option><option value="ready-to-ship">READY TO SHIP</option><option value="do-not-separate">DO NOT SEPARATE</option><option value="custom">My own wording</option></select>
        <div data-setcustom><label for="pl-settext">Your wording (one line each)</label><textarea id="pl-settext" rows="3" data-k="setText">${esc(S.prep.setText)}</textarea></div>
        <label for="pl-setcount">Items in the set (optional)</label><input id="pl-setcount" type="number" min="0" step="1" inputmode="numeric" data-k="setCount" value="${esc(S.prep.setCount)}" placeholder="e.g. 6">
      </div>
      <div data-ptype="expiry">
        <div class="row"><div><label for="pl-date">Expiration date</label><input id="pl-date" type="date" data-k="date" value="${esc(S.prep.date)}"></div><div><label for="pl-datefmt">Format</label><select id="pl-datefmt" data-k="dateFmt"><option>MM-DD-YYYY</option><option>MM-YYYY</option><option>DD-MMM-YYYY</option><option>DD-MM-YYYY</option><option>YYYY-MM-DD</option></select></div></div>
        <div class="row"><div><label for="pl-prefix">Text before the date</label><select id="pl-prefix" data-k="prefix"><option value="EXP">EXP</option><option value="Expires">Expires</option><option value="Use by">Use by</option><option value="Best before">Best before</option><option value="">(none)</option></select></div><div><label for="pl-lot">Lot or batch number (optional)</label><input id="pl-lot" data-k="lot" value="${esc(S.prep.lot)}" placeholder="e.g. 24-118B"></div></div>
        <p class="pl-hint">Amazon's guidance asks for MM-DD-YYYY or MM-YYYY on US expiration-dated products (medical devices: YYYY-MM-DD). Check Seller Central for your marketplace.</p>
      </div>
      <div data-ptype="custom">
        <label for="pl-ctext">Text (one line per row; the first line is the largest)</label><textarea id="pl-ctext" rows="4" data-k="customText">${esc(S.prep.customText)}</textarea>
      </div>
      <h3>Label stock</h3>
      ${stockSelect("pl-p-stock", S.prep.stock, () => true, "Print on")}
      ${customFields("pl-p")}
      <div class="row"><div><label for="pl-pqty">Number of labels</label><input id="pl-pqty" type="number" min="1" max="5000" step="1" inputmode="numeric" data-k="qty" value="${esc(S.prep.qty)}"></div><div data-sheet-only class="pl-fill"><button type="button" class="btn ghost sm" data-a="fill">Fill the sheet</button></div></div>
      ${startField("pl-p", S.prep.start)}
      <label class="pl-check"><input type="checkbox" data-k="border"${S.prep.border ? " checked" : ""}> Outline each label (handy when cutting plain paper)</label>
      ${printerFields("pl-p", { dpi: false })}
    </form>
    <div class="pl-out">
      ${previewBox("pl-p")}
      <p class="pl-size" data-size aria-live="polite"></p>
      <div class="pl-actions"><button type="button" class="btn" data-a="pdf">Download PDF</button></div>
      <p class="pl-msg" data-msg role="status"></p>
      <p class="pl-hint">Warnings and prep labels carry only their own text. The small PrepLabel credit appears only in the outer margin of full sheets, never on a label.</p>
    </div>
  </div>`;
  const PR = P("prep");
  $("#pl-unit", PR).value = S.prep.unit;
  $("#pl-setkind", PR).value = S.prep.setKind;
  $("#pl-datefmt", PR).value = S.prep.dateFmt;
  $("#pl-prefix", PR).value = S.prep.prefix;
  function prepParas() {
    const p = S.prep;
    if (p.type === "suffocation") return C.suffocationParas(p.langs, p.suffText);
    if (p.type === "set") return C.setParas(p.setKind, p.setCount, p.setText);
    if (p.type === "expiry") return C.dateParas({ date: p.date, format: p.dateFmt, prefix: p.prefix, lot: p.lot });
    const lines = String(p.customText || "").split(/\n+/).map(t => C.clean(t).text).filter(Boolean);
    return (lines.length ? lines : ["Your text"]).map((t, i) => ({ runs: [{ t, b: i === 0 }], rel: i === 0 ? 1 : 0.6 }));
  }
  const pView = jobPanel("prep", {
    job() {
      const p = S.prep, stock = stockOf(p.stock);
      const paras = prepParas();
      const draw = C.memo(C.textLabel(paras, { padRel: 0.07, border: p.border ? 0.25 : 0, full: !!stock.full, maxPt: p.type === "suffocation" ? 40 : 160 }));
      const qty = Math.max(1, Math.min(MAX_LABELS, parseInt(p.qty, 10) || 1));
      const draws = Array(qty).fill(draw);
      const size = draw.sizeFor({ x: 0, y: 0, w: stock.w, h: stock.h });
      let sizeHtml = `Text size on this label: <strong>${fmtPt(size)} pt</strong>.`;
      if (p.type === "suffocation") {
        const k = p.unit === "cm" ? 1 / 2.54 : 1;
        const w = num(p.bagW) * k, l = num(p.bagL) * k;
        const min = C.suffocationMinPt(l, w);
        const sum = Math.round((w + l) * 10) / 10;
        const needed = w >= 5;
        $("[data-rule]", PR).innerHTML = (w || l) ? `Length + width = <strong>${sum} in</strong>${p.unit === "cm" ? ` (${Math.round((num(p.bagW) + num(p.bagL)) * 10) / 10} cm)` : ""} → minimum <strong>${min} pt</strong> text.` + (needed ? "" : ` <span class="pl-hint">The opening is under 5 in (12.7 cm), so Amazon's poly bag rule doesn't require a warning. Adding one is still fine.</span>`) : "Enter the bag size to get the minimum font size.";
        const okSize = size + 0.05 >= min;
        sizeHtml = `Warning text on this label: <strong>${fmtPt(size)} pt</strong>. ` + (okSize ? `<span class="ok">Meets the ${min} pt minimum.</span>` : `<span class="err">Below the ${min} pt minimum for this bag. Choose a bigger label or fewer languages.</span>`);
      } else if (p.type === "expiry") {
        sizeHtml = `Date text size: <strong>${fmtPt(size)} pt</strong>. ` + (size >= 36 ? `<span class="ok">36 pt or larger.</span>` : `<span class="hint">Seller guides cite 36 pt or larger for expiration dates on cartons; use a bigger label for boxes.</span>`);
      }
      const name = { suffocation: "Suffocation warning", set: "Set label", expiry: "Expiration date label", custom: "Custom label" }[p.type];
      const per = stock.kind === "sheet" ? stock.cols * stock.rows : 1;
      const pages = stock.kind === "sheet" ? Math.ceil((qty + (Math.max(1, +p.start) - 1)) / per) : qty;
      return { stock, draws, sizeHtml, name, summary: `<strong>${plural(qty, "label")}</strong> on ${stock.kind === "sheet" ? plural(pages, "sheet") + " of " : ""}${esc(stock.short)}` };
    },
    after(job) { $("[data-size]", PR).innerHTML = job.sizeHtml; syncPrepUI(); },
  });
  function syncPrepUI() {
    $$("[data-ptype]", PR).forEach(el => { el.hidden = el.dataset.ptype !== S.prep.type; });
    $("[data-setcustom]", PR).hidden = S.prep.setKind !== "custom";
  }
  pView.show = () => { syncPrepUI(); pView.render(); };
  PR.addEventListener("change", e => {
    const t = e.target;
    if (t.matches("[data-lang]")) {
      const set = new Set(S.prep.langs);
      t.checked ? set.add(t.dataset.lang) : set.delete(t.dataset.lang);
      S.prep.langs = LANGS.map(l => l[0]).filter(k => set.has(k));
      persist(); pView.render();
    }
    if (t.name === "pl-ptype") { syncPrepUI(); }
  });
  PR.addEventListener("click", async e => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    if (b.dataset.a === "fill") {
      const st = stockOf(S.prep.stock);
      S.prep.start = Math.max(1, parseInt($("#pl-p-start", PR).value, 10) || 1);
      S.prep.qty = st.cols * st.rows - (Math.max(1, +S.prep.start) - 1);
      $("#pl-pqty", PR).value = S.prep.qty; persist(); pView.render();
    } else if (b.dataset.a === "pdf") {
      const job = pView.flush();
      const st = job.stock;
      if (await pView.download(b, $("[data-msg]", PR), `${slug(job.name)}-${slug(st.short.replace(/\(.*\)/, ""))}.pdf`, { title: job.name })) track("prep_pdf_generated");
    }
  });

  /* ------------------------------------------------------------ Bin labels tab */
  P("bin").innerHTML = `<div class="pl-grid">
    <form class="pl-form" autocomplete="off" onsubmit="return false">
      <h3>Locations</h3>
      <label for="pl-codes">Location codes, one per line. Add a description after a | or a tab (optional).</label>
      <textarea id="pl-codes" rows="7" class="mono" data-k="codes" spellcheck="false">${esc(S.bin.codes)}</textarea>
      <details class="pl-more"><summary>Add a numbered range</summary>
        <div class="row3"><div><label for="pl-rp">Prefix</label><input id="pl-rp" data-k="rp" value="${esc(S.bin.rp)}"></div><div><label for="pl-rf">From</label><input id="pl-rf" type="number" data-k="rf" value="${esc(S.bin.rf)}"></div><div><label for="pl-rt">To</label><input id="pl-rt" type="number" data-k="rt" value="${esc(S.bin.rt)}"></div></div>
        <div class="row"><div><label for="pl-rd">Digits (zero padding)</label><input id="pl-rd" type="number" min="0" max="6" data-k="rd" value="${esc(S.bin.rd)}"></div><div><label for="pl-rs">Suffix</label><input id="pl-rs" data-k="rs" value="${esc(S.bin.rs)}"></div></div>
        <div class="pl-row-btns"><button type="button" class="btn ghost sm" data-a="range">Add range</button><span class="pl-hint" data-rangeprev></span></div>
      </details>
      <fieldset class="pl-seg"><legend>Code type</legend><label><input type="radio" name="pl-symb" value="qr" data-k="symb"${S.bin.symb === "qr" ? " checked" : ""}> QR code</label><label><input type="radio" name="pl-symb" value="c128" data-k="symb"${S.bin.symb !== "qr" ? " checked" : ""}> Code 128 barcode</label></fieldset>
      <h3>Label stock</h3>
      ${stockSelect("pl-b-stock", S.bin.stock, () => true, "Print on")}
      ${customFields("pl-b")}
      <label for="pl-copies">Copies of each label</label><input id="pl-copies" type="number" min="1" max="50" step="1" inputmode="numeric" data-k="copies" value="${esc(S.bin.copies)}">
      ${startField("pl-b", S.bin.start)}
      ${printerFields("pl-b", { dpi: true })}
    </form>
    <div class="pl-out">
      ${previewBox("pl-b")}
      <div class="pl-actions"><button type="button" class="btn" data-a="pdf">Download PDF</button></div>
      <p class="pl-msg" data-msg role="status"></p>
      <ul class="pl-warn" data-warn></ul>
    </div>
  </div>`;
  const B = P("bin");
  let qrLib = window.qrcode || null;
  const parseCodes = () => String(S.bin.codes || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const m = l.split(/\s*[|\t]\s*/); return { code: m[0], desc: m.slice(1).join(" ") }; });
  const bView = jobPanel("bin", {
    job() {
      const st = S.bin, stock = stockOf(st.stock);
      const dpi = st.dpi === "auto" ? stock.dpi : +st.dpi;
      if (st.symb === "qr" && !qrLib) { getQr().then(q => { qrLib = q; bView.render(); }).catch(() => {}); return { loading: true, stock }; }
      const list = parseCodes();
      const copies = Math.max(1, Math.min(50, parseInt(st.copies, 10) || 1));
      const draws = [], warns = [];
      for (const { code, desc } of list.slice(0, 2000)) {
        let qr = null;
        if (st.symb === "qr") { try { qr = qrLib(0, "M"); qr.addData(code); qr.make(); } catch { warns.push(`${esc(code)}: too long for a QR code.`); continue; } }
        const d = C.memo(C.binLabel(code, desc, { dpi }, qr));
        const info = d({ x: 0, y: 0, w: stock.w, h: stock.h }).info;
        if (info.err) { warns.push(`<strong>${esc(code)}</strong>: ${esc(info.err)}`); continue; }
        if (info.fit && !info.fit.ok) warns.push(`<strong>${esc(code)}</strong> is too long for a Code 128 barcode on this label. Use QR codes or a wider label.`);
        for (let k = 0; k < copies && draws.length < MAX_LABELS; k++) draws.push(d);
      }
      const per = stock.kind === "sheet" ? stock.cols * stock.rows : 1;
      const pages = stock.kind === "sheet" ? Math.ceil((draws.length + (Math.max(1, +st.start) - 1)) / per) : draws.length;
      return { stock, draws, warns, empty: "Add at least one location code.", summary: draws.length ? `<strong>${plural(draws.length, "label")}</strong> on ${stock.kind === "sheet" ? plural(pages, "sheet") + " of " : ""}${esc(stock.short)}` : "No locations yet." };
    },
    after(job) {
      $("[data-warn]", B).innerHTML = (job.warns || []).map(w => `<li>${w}</li>`).join("");
      const prev = C.rangeCodes(S.bin.rp, S.bin.rf, S.bin.rt, S.bin.rd, S.bin.rs);
      $("[data-rangeprev]", B).textContent = prev.length ? `${prev[0]} … ${prev[prev.length - 1]} (${prev.length})` : "";
    },
  });
  bView.show = () => bView.render();
  B.addEventListener("click", async e => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    if (b.dataset.a === "range") {
      const codes = C.rangeCodes(S.bin.rp, S.bin.rf, S.bin.rt, S.bin.rd, S.bin.rs);
      if (!codes.length) return;
      const ta = $("#pl-codes", B);
      S.bin.codes = (ta.value.trim() ? ta.value.trim() + "\n" : "") + codes.join("\n");
      ta.value = S.bin.codes; persist(); bView.render();
    } else if (b.dataset.a === "pdf") {
      if (!allow("Bin and location labels.")) return;
      const st = bView.flush().stock;
      if (await bView.download(b, $("[data-msg]", B), `bin-labels-${slug(st.short.replace(/\(.*\)/, ""))}.pdf`, { title: "Bin location labels" })) track("bin_pdf_generated");
    }
  });

  /* ------------------------------------------------------------ Test & scan tab */
  P("test").innerHTML = `<div class="pl-grid">
    <div class="pl-form">
      <h3>Alignment test page</h3>
      <p class="pl-hint">Print this before a big batch. Sheets get every label outline plus a ruler page; rolls get one test label with a 1 in bar.</p>
      ${stockSelect("pl-t-stock", S.test.stock, () => true, "Label stock to test")}
      ${customFields("pl-t")}
      ${printerFields("pl-t", { dpi: false })}
      <div class="pl-actions"><button type="button" class="btn" data-a="pdf">Download test PDF</button></div>
      <p class="pl-msg" data-msg role="status"></p>
      <h3 id="pl-scan-h">Scan-check a printed label</h3>
      <p class="pl-hint">Point your camera at a printed barcode, or take a photo of it. PrepLabel decodes it on this device and checks it against your FNSKU list.</p>
      <div class="pl-row-btns"><button type="button" class="btn" data-a="cam">Start camera</button><button type="button" class="btn ghost" data-a="camStop" hidden>Stop camera</button></div>
      <label for="pl-photo">…or check a photo</label><input type="file" id="pl-photo" accept="image/*" capture="environment">
      <div class="pl-cam" data-cam hidden><video playsinline muted aria-label="Camera view"></video></div>
      <div class="pl-scanres" data-scanres aria-live="polite"></div>
    </div>
    <div class="pl-out">
      ${previewBox("pl-t")}
    </div>
  </div>`;
  const T = P("test");
  const tView = jobPanel("test", {
    job() {
      const stock = stockOf(S.test.stock);
      if (stock.kind === "roll") return { stock, draws: [C.testDraw(stock, 0)], credit: false, summary: `Test label for <strong>${esc(stock.short)}</strong>. It should fill the label with the outline just inside the edges.` };
      const cells = C.sheetCells(stock);
      return { stock, draws: cells.map((_, i) => C.testDraw(stock, i)), extraPages: [C.rulerPage(stock)], summary: `Outline of every label on <strong>${esc(stock.short)}</strong>, plus a ruler page.` };
    },
  });
  S.test.start = 1;
  tView.show = () => tView.render();
  T.addEventListener("click", async e => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    if (b.dataset.a === "pdf") {
      const st = tView.flush().stock;
      if (await tView.download(b, $("[data-msg]", T), `alignment-test-${slug(st.short.replace(/\(.*\)/, ""))}.pdf`, { title: "PrepLabel alignment test" })) track("test_page");
    } else if (b.dataset.a === "cam") startCam();
    else if (b.dataset.a === "camStop") stopCam();
  });

  // Decoding: BarcodeDetector where the browser has it, otherwise ZXing (loaded on demand).
  let detector = null, zx = null;
  async function getDecoder() {
    if (detector === null && "BarcodeDetector" in window) {
      try {
        const fmts = await window.BarcodeDetector.getSupportedFormats();
        detector = fmts.includes("code_128") ? new window.BarcodeDetector({ formats: ["code_128", "qr_code"].filter(f => fmts.includes(f)) }) : false;
      } catch { detector = false; }
    }
    if (!detector && !zx) {
      await loadScript("/vendor/zxing.min.js");
      const Z = window.ZXing;
      const hints = new Map([[Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.QR_CODE]], [Z.DecodeHintType.TRY_HARDER, true]]);
      const reader = new Z.MultiFormatReader();
      reader.setHints(hints);
      zx = canvas => {
        const src = new Z.HTMLCanvasElementLuminanceSource(canvas);
        for (const Bin of [Z.HybridBinarizer, Z.GlobalHistogramBinarizer]) {
          try { return reader.decodeWithState(new Z.BinaryBitmap(new Bin(src))).getText(); } catch {}
        }
        return null;
      };
    }
  }
  async function decodeCanvas(canvas) {
    await getDecoder();
    if (detector) { try { const r = await detector.detect(canvas); if (r.length) return r[0].rawValue; } catch {} }
    if (!zx) await (async () => { detector = false; await getDecoder(); })();
    return zx(canvas);
  }
  function showScan(value) {
    const box = $("[data-scanres]", T);
    if (!value) { box.innerHTML = `<p class="pl-msg err">No barcode found. Fill the frame with the label, keep it flat and well lit, and try again.</p>`; track("scan_fail"); return; }
    const code = C.normCode(value);
    const hit = S.items.find(it => C.normCode(it.code) === code);
    box.innerHTML = `<p class="pl-scanval">Read: <span class="mono">${esc(value)}</span></p>` + (hit ? `<p class="pl-msg ok">Matches ${esc(code)}${hit.title ? " – " + esc(hit.title) : ""} in your FNSKU list.</p>` : `<p class="pl-hint">${S.items.some(it => String(it.code).trim()) ? "Not in your current FNSKU list. Check you printed the right label." : "The barcode scans. Add products on the FNSKU tab to check it against your list."}</p>`);
    track("scan_ok");
  }
  $("#pl-photo", T).addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    const box = $("[data-scanres]", T);
    box.innerHTML = `<p class="pl-hint">Reading the photo…</p>`;
    try {
      const bmp = await createImageBitmap(f);
      let found = null;
      for (const maxSide of [1600, 1000, 2400]) {
        const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
        found = await decodeCanvas(cv);
        if (found) break;
      }
      showScan(found);
    } catch (err) { box.innerHTML = `<p class="pl-msg err">${esc(err.message || "Couldn't read that image.")}</p>`; }
    e.target.value = "";
  });
  let stream = null, camTimer = 0;
  async function startCam() {
    const box = $("[data-scanres]", T);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { box.innerHTML = `<p class="pl-msg err">This browser can't open the camera here. Use “check a photo” instead.</p>`; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (err) { box.innerHTML = `<p class="pl-msg err">Camera not available (${esc(err.name || "blocked")}). Use “check a photo” instead.</p>`; return; }
    const wrap = $("[data-cam]", T), video = $("video", wrap);
    wrap.hidden = false;
    video.srcObject = stream;
    await video.play().catch(() => {});
    $("[data-a=cam]", T).hidden = true; $("[data-a=camStop]", T).hidden = false;
    box.innerHTML = `<p class="pl-hint">Looking for a barcode…</p>`;
    await getDecoder().catch(() => {});
    const cv = document.createElement("canvas");
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    let busy = false;
    camTimer = setInterval(async () => {
      if (busy || !video.videoWidth) return;
      busy = true;
      try {
        const k = Math.min(1, 1280 / video.videoWidth);
        cv.width = Math.round(video.videoWidth * k); cv.height = Math.round(video.videoHeight * k);
        ctx.drawImage(video, 0, 0, cv.width, cv.height);
        const v = await decodeCanvas(cv);
        if (v) { showScan(v); stopCam(); }
      } finally { busy = false; }
    }, 250);
  }
  function stopCam() {
    clearInterval(camTimer);
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    const wrap = $("[data-cam]", T);
    wrap.hidden = true; $("video", wrap).srcObject = null;
    $("[data-a=cam]", T).hidden = false; $("[data-a=camStop]", T).hidden = true;
  }

  /* ------------------------------------------------------------ PDF → thermal converter */
  P("convert").innerHTML = `<div class="pl-grid">
    <div class="pl-form">
      <h3>Seller Central label PDF</h3>
      <div class="pl-drop" data-drop>
        <label for="pl-pdf" class="btn">Choose PDF files</label>
        <input type="file" id="pl-pdf" accept="application/pdf,.pdf" multiple class="pl-file-hidden">
        <p class="pl-hint">or drop them here. Download your FNSKU labels from Seller Central on any sheet size (21 to 44 per page) first. Files never leave this device.</p>
      </div>
      <h3>Thermal label size</h3>
      ${stockSelect("pl-c-stock", S.conv.target, s => s.kind === "roll", "Convert to")}
      ${customFields("pl-c")}
      <div class="row"><div><label for="pl-c-margin">Margin inside the label (mm)</label><input id="pl-c-margin" type="number" min="0" max="8" step="0.5" inputmode="decimal" data-k="margin" value="${esc(S.conv.margin)}"></div>
      <div><label for="pl-c-rot">Rotate</label><select id="pl-c-rot" data-k="rotate"><option value="0">No rotation</option><option value="90">90° (portrait page)</option><option value="270">270° (portrait page, other way)</option></select></div></div>
      <p class="pl-hint">Each label is cut out exactly as Amazon drew it and scaled to fit, so the barcode stays sharp vector artwork.</p>
    </div>
    <div class="pl-out">
      <div class="pl-out-head"><p class="pl-summary" data-csummary aria-live="polite">No file yet. Choose a Seller Central label PDF to see the labels it contains.</p></div>
      <div class="pl-actions"><button type="button" class="btn" data-a="convert" disabled>Download thermal PDF</button><button type="button" class="btn ghost" data-a="clear" hidden>Clear</button></div>
      <p class="pl-msg" data-msg role="status"></p>
      <div class="pl-thumbs" data-thumbs></div>
      <p class="pl-hint">Wrong number of labels? Use the label PDF exactly as Seller Central downloads it (not a scan or screenshot), or make the labels from scratch on the FNSKU tab.</p>
    </div>
  </div>`;
  const CV = P("convert");
  const conv = { files: [], labels: [] };
  $("#pl-c-rot", CV).value = String(S.conv.rotate || 0);
  CV.addEventListener("change", e => {
    const t = e.target;
    if (t.matches("[data-stock]")) { S.conv.target = t.value; syncConvUI(); persist(); }
  });
  CV.addEventListener("input", e => {
    const t = e.target;
    if (t.matches("[data-k]")) { S.conv[t.dataset.k] = t.value; persist(); }
    else if (t.matches("[data-custom]")) { const [g, k] = t.dataset.custom.split("."); S.custom[g][k] = num(t.value); persist(); }
  });
  function syncConvUI() {
    $("[data-custom-roll]", CV).hidden = S.conv.target !== "custom-roll";
    $("[data-custom-sheet]", CV).hidden = true;
  }
  async function analyse(files) {
    const sum = $("[data-csummary]", CV), thumbs = $("[data-thumbs]", CV), btn = $("[data-a=convert]", CV), msg = $("[data-msg]", CV);
    if (files.length > 1 && !allow("Convert several PDFs in one go.")) return;
    conv.files = []; conv.labels = [];
    thumbs.innerHTML = ""; btn.disabled = true; msg.textContent = "";
    let pdfjs;
    try { sum.textContent = "Loading the PDF reader…"; pdfjs = await getPdfjs(); }
    catch { sum.innerHTML = `<span class="err">Couldn't load the PDF reader. This needs a recent browser (Chrome, Edge, Firefox or Safari 17.4+).</span>`; return; }
    const perFile = [];
    for (const file of files) {
      if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") { perFile.push(`${esc(file.name)}: not a PDF`); continue; }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const rec = { name: file.name, bytes, count: 0 };
      let doc;
      try { doc = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false, useSystemFonts: true }).promise; }
      catch (e) { perFile.push(`${esc(file.name)}: ${e && e.name === "PasswordException" ? "password-protected" : "couldn't be opened"}`); continue; }
      const fi = conv.files.push(rec) - 1;
      for (let p = 1; p <= doc.numPages; p++) {
        sum.textContent = `Reading ${file.name}: page ${p} of ${doc.numPages}…`;
        const page = await doc.getPage(p);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(8 * 72 / 25.4, 5000 / Math.max(base.width, base.height));
        const vp = page.getViewport({ scale });
        const cv = document.createElement("canvas");
        cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
        const lum = new Uint8Array(cv.width * cv.height);
        for (let i = 0, j = 0; j < lum.length; i += 4, j++) lum[j] = (img[i] * 299 + img[i + 1] * 587 + img[i + 2] * 114) / 1000;
        const ppm = scale * 72 / 25.4;
        const boxes = C.detectLabels(lum, cv.width, cv.height, ppm);
        for (const b of boxes) {
          const lab = { fi, page: p - 1, vt: vp.transform.slice(), box: { x0: b.x0, x1: b.x1 + 1, y0: b.y0, y1: b.y1 + 1 }, barcode: b.barcode };
          if (conv.labels.length < 48) {
            const tw = 150, k = tw / (lab.box.x1 - lab.box.x0);
            const t = document.createElement("canvas");
            t.width = tw; t.height = Math.max(1, Math.round((lab.box.y1 - lab.box.y0) * k));
            t.getContext("2d").drawImage(cv, lab.box.x0, lab.box.y0, lab.box.x1 - lab.box.x0, lab.box.y1 - lab.box.y0, 0, 0, t.width, t.height);
            t.setAttribute("role", "img");
            t.setAttribute("aria-label", `Label ${conv.labels.length + 1} as found in ${file.name}`);
            lab.thumb = t;
          }
          conv.labels.push(lab);
          rec.count++;
        }
        page.cleanup();
      }
      await doc.destroy();
      perFile.push(`${esc(file.name)}: ${plural(rec.count, "label")}`);
    }
    const n = conv.labels.length;
    sum.innerHTML = n ? `Found <strong>${plural(n, "label")}</strong> (${perFile.join("; ")}). Check them below, then download.` : `<span class="err">No labels found</span> (${perFile.join("; ")}). Is this a Seller Central FNSKU label PDF?`;
    conv.labels.slice(0, 48).forEach((l, i) => { const fig = document.createElement("figure"); fig.appendChild(l.thumb); const cap = document.createElement("figcaption"); cap.textContent = String(i + 1); fig.appendChild(cap); thumbs.appendChild(fig); });
    if (n > 48) thumbs.insertAdjacentHTML("beforeend", `<p class="pl-hint">…and ${n - 48} more.</p>`);
    btn.disabled = !n;
    $("[data-a=clear]", CV).hidden = !n;
    if (window.innerWidth < 920) { const r = sum.getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight - 120) sum.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
  async function buildConverted() {
    const PL = await getPdfLib();
    const stock = stockOf(S.conv.target);
    const out = await PL.PDFDocument.create();
    out.setTitle("FNSKU labels (thermal)"); out.setCreator("PrepLabel · preplabel.vercel.app"); out.setProducer("PrepLabel (pdf-lib)");
    const W = stock.w * C.MM, H = stock.h * C.MM, m = Math.max(0, Math.min(8, num(S.conv.margin, 1))) * C.MM;
    const rot = +S.conv.rotate || 0;
    const srcDocs = [], embeds = new Map();
    for (const lab of conv.labels) {
      const rec = conv.files[lab.fi];
      if (!srcDocs[lab.fi]) srcDocs[lab.fi] = await PL.PDFDocument.load(rec.bytes, { ignoreEncryption: true, updateMetadata: false });
      const key = lab.fi + ":" + lab.page;
      let e = embeds.get(key);
      if (!e) {
        const sp = srcDocs[lab.fi].getPage(lab.page);
        const mb = sp.getMediaBox();
        e = { emb: await out.embedPage(sp, { left: mb.x, bottom: mb.y, right: mb.x + mb.width, top: mb.y + mb.height }), mb };
        embeds.set(key, e);
      }
      const cw = lab.box.x1 - lab.box.x0, ch = lab.box.y1 - lab.box.y0;
      const k = Math.min((W - 2 * m) / cw, (H - 2 * m) / ch);
      const ox = (W - cw * k) / 2, oy = (H - ch * k) / 2;
      const M = C.cropMatrix(lab.vt, lab.box, k, ox, oy, e.mb.x, e.mb.y);
      const page = out.addPage(rot % 180 ? [H, W] : [W, H]);
      const rop = C.rotOps(PL, rot, W, H);
      page.pushOperators(PL.pushGraphicsState(), ...(rop ? [rop] : []), PL.rectangle(ox, oy, cw * k, ch * k), PL.clip(), PL.endPath(), PL.concatTransformationMatrix(...M));
      page.drawPage(e.emb, { x: 0, y: 0 });
      page.pushOperators(PL.popGraphicsState());
    }
    return out.save();
  }
  $("#pl-pdf", CV).addEventListener("change", e => { const fs = [...e.target.files]; if (fs.length) analyse(fs); e.target.value = ""; });
  const drop = $("[data-drop]", CV);
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => { const fs = [...(e.dataTransfer?.files || [])]; if (fs.length) analyse(fs); });
  CV.addEventListener("click", async e => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const msg = $("[data-msg]", CV);
    if (b.dataset.a === "convert") {
      if (!conv.labels.length) return;
      b.disabled = true; msg.className = "pl-msg"; msg.textContent = "Building the thermal PDF…";
      try {
        const bytes = await buildConverted();
        const st = stockOf(S.conv.target);
        const name = `fnsku-labels-thermal-${slug(st.short.replace(/\(.*\)/, "").replace(/roll/, ""))}.pdf`;
        saveBlob(new Blob([bytes], { type: "application/pdf" }), name);
        msg.className = "pl-msg ok"; msg.textContent = `Saved ${name}: ${plural(conv.labels.length, "label")}, one per page. Print at 100% / Actual size on ${st.short}.`;
        track("pdf_converted");
      } catch (err) { msg.className = "pl-msg err"; msg.textContent = "Couldn't convert: " + (err.message || err); }
      finally { b.disabled = false; }
    } else if (b.dataset.a === "clear") {
      conv.files = []; conv.labels = [];
      $("[data-thumbs]", CV).innerHTML = ""; $("[data-a=convert]", CV).disabled = true; b.hidden = true; msg.textContent = "";
      $("[data-csummary]", CV).textContent = "No file yet. Choose a Seller Central label PDF to see the labels it contains.";
    }
  });
  panels.convert = { show: syncConvUI };
  panels.fnsku = fView; panels.prep = pView; panels.bin = bView; panels.test = tView;

  /* ------------------------------------------------------------ start */
  // keep the tab list's selects in sync with state that may have come from storage
  $$("[data-k=titleLines]", F).forEach(s => { s.value = S.fnsku.titleLines; });
  selectTab(S.tab in panels ? S.tab : "fnsku");
  // Expose a tiny hook for automated tests and debugging.
  window.PrepLabel = { state: S, render: () => panels[S.tab].show(), pages: () => (panels[S.tab].pages || []) };
})();
