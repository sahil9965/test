// LabelFit tool. Mounts into #lf-tool. Landing pages set defaults with data-preset, data-out
// ("pdf" or "img") and data-slips ("drop" or "page"). Everything runs in the browser: files are
// read with pdf.js, cropped, and written back out with pdf-lib (vector) or a canvas (images).
(() => {
  const mount = document.getElementById("lf-tool");
  if (!mount || !window.LabelCore) return;
  const C = window.LabelCore, MM = C.MM, mm = C.mm;
  const REF = "https://labelfit.vercel.app/?utm_source=labelfit&utm_medium=watermark&utm_campaign=referral";
  const DET = 3 / (0.5 * MM); // detection render: 3 px per 0.5 mm grid cell
  const FOOT = 10; // pt reserved under a packing slip for the credit line
  const $ = s => mount.querySelector(s);
  const $$ = s => [...mount.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("lf_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("lf_" + k, JSON.stringify(v)); } catch {} },
  };
  const track = (name, data) => { try { window.va && window.va("event", data ? { name, data } : { name }); } catch {} };
  const fmtMm = pt => (Math.round(pt / MM * 10) / 10).toString();

  const PRESETS = {
    auto: { name: "Auto-detect (any label PDF)" },
    vinted: { name: "Vinted A4 (Evri, InPost, Royal Mail, DPD)", size: "100x150" },
    evri: { name: "Evri A4", size: "100x150" },
    royalmail: { name: "Royal Mail A4 (1, 2 or 4 per page)", size: "100x150" },
    ebayuk: { name: "eBay UK A4", size: "100x150" },
    usps: { name: "USPS.com letter (8.5 × 11 in)", size: "4x6", region: { x: 0, y: 0, w: 1, h: 0.55 } },
    ebayhalf: { name: "eBay half-sheet (8.5 × 11 in)", size: "4x6", region: { x: 0, y: 0, w: 1, h: 0.5 } },
    mercari: { name: "Mercari letter (8.5 × 11 in)", size: "4x6" },
  };
  const SIZE_OPTS = [
    ["Thermal labels", [["4x6", "4 × 6 in (US thermal)"], ["100x150", "100 × 150 mm (UK/EU “6x4”)"], ["a6", "A6 · 105 × 148 mm"], ["4x4", "4 × 4 in"]]],
    ["Rolls", [["62", "62 mm continuous roll"], ["57", "57 mm continuous roll"]]],
    ["Sheets", [["letter2", "Letter, 2 per sheet (half-sheet labels)"], ["a42", "A4, 2 per sheet"]]],
    ["", [["custom", "Custom size…"]]],
  ];
  const ROLE = { label: "Label", slip: "Packing slip", customs: "Customs form", skip: "Left out" };
  const lang = (navigator.language || "en-US");
  const usLike = /-(US|CA|MX|PH)$/i.test(lang) || lang === "en";

  const saved = store.get("settings", {});
  const S = Object.assign({ preset: "auto", size: usLike ? "4x6" : "100x150", cw: 100, ch: 150, mode: "fit", margin: 2, slips: "drop", customs: "page", out: "pdf", fmt: "png", dpi: 203, bw: true, guide: "acrobat" }, saved);
  const d = mount.dataset;
  // Guide pages pick their preset; its paper size applies unless this visitor already chose one.
  if (d.preset && PRESETS[d.preset]) { S.preset = d.preset; if (PRESETS[d.preset].size && !saved.size) S.size = PRESETS[d.preset].size; }
  if (d.out) S.out = d.out;
  if (d.slips) S.slips = d.slips;
  if (!PRESETS[S.preset] && !String(S.preset).startsWith("my:")) S.preset = "auto";
  const save = () => store.set("settings", S);

  let layouts = store.get("layouts", []);
  const docs = [];
  let pages = [], cur = 0, sel = null, outIdx = 0, uid = 0, busy = false;

  // ---------- Markup ----------
  const sizeOptions = SIZE_OPTS.map(([g, opts]) => {
    const o = opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
    return g ? `<optgroup label="${g}">${o}</optgroup>` : o;
  }).join("");
  mount.innerHTML = `
  <div class="lf-top">
    <div class="lf-field"><label for="lf-preset">Label from</label><select id="lf-preset"></select></div>
    <div class="lf-field"><label for="lf-size">Print on</label><select id="lf-size">${sizeOptions}</select></div>
    <div class="lf-field lf-custom" hidden>
      <div class="lf-pair"><div><label for="lf-cw">Width (mm)</label><input id="lf-cw" type="number" min="20" max="600" step="1" inputmode="decimal"></div>
      <div><label for="lf-ch">Height (mm)</label><input id="lf-ch" type="number" min="0" max="2000" step="1" inputmode="decimal" placeholder="Roll"></div></div>
    </div>
  </div>
  <details class="lf-more">
    <summary>More options</summary>
    <div class="lf-grid">
      <div class="lf-field"><label for="lf-mode">Scaling</label><select id="lf-mode"><option value="fit">Fit the label to the page</option><option value="actual">Actual size (100%)</option></select></div>
      <div class="lf-field"><label for="lf-margin">Margin</label><select id="lf-margin"><option value="0">None</option><option value="2">Small (2 mm)</option><option value="4">Large (4 mm)</option></select></div>
      <div class="lf-field"><label for="lf-slips">Packing slips</label><select id="lf-slips"><option value="drop">Leave them out</option><option value="page">Print on their own page</option></select></div>
      <div class="lf-field"><label for="lf-customs">Customs forms (CN22/CN23)</label><select id="lf-customs"><option value="page">Print on their own page</option><option value="drop">Leave them out</option></select></div>
    </div>
    <div class="lf-layouts">
      <p class="lf-sub">Saved layouts</p>
      <p class="small muted lf-nolayouts">None yet. Draw or fix a crop below, then use <em>Save layout</em> to reuse it on every file with the same page design.</p>
      <div class="lf-row lf-haslayouts" hidden><label class="sr" for="lf-mylist">Saved layout</label><select id="lf-mylist"></select><button type="button" class="btn ghost sm" data-a="dellayout">Delete</button></div>
      <div class="lf-row"><button type="button" class="btn ghost sm" data-a="export">Export layouts</button><button type="button" class="btn ghost sm" data-a="import">Import layouts</button><input type="file" id="lf-import" accept="application/json,.json" hidden aria-label="Import layouts file"></div>
    </div>
  </details>
  <div class="lf-drop" tabindex="-1">
    <input type="file" id="lf-file" multiple accept="application/pdf,.pdf,image/png,image/jpeg,image/webp" hidden>
    <div class="lf-dropin">
      <svg class="lf-dropicon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <p class="lf-droph"><span class="lf-dt">Drop your label PDF here</span><span class="lf-mb">Open your label PDF</span></p>
      <p class="lf-dropor"><button type="button" class="btn" data-a="pick">Choose label files</button></p>
      <p class="small muted">PDF, PNG or JPG. Several files at once are fine. Nothing is uploaded: your buyers' addresses stay on this device.</p>
    </div>
    <div class="lf-loaded" hidden>
      <p class="lf-files"></p>
      <div class="lf-row"><button type="button" class="btn ghost sm" data-a="pick">Add files</button><button type="button" class="btn ghost sm" data-a="clear">Start over</button></div>
    </div>
  </div>
  <p class="lf-status" role="status" aria-live="polite"></p>
  <div class="lf-work" hidden>
    <section class="lf-out" aria-label="Result">
      <p class="lf-sum"></p>
      <div class="lf-paperwrap"><canvas class="lf-paper" role="img" aria-label="Preview of the converted label"></canvas></div>
      <div class="lf-onav"><button type="button" class="btn ghost sm" data-a="oprev" aria-label="Previous page">‹</button><span class="lf-opos"></span><button type="button" class="btn ghost sm" data-a="onext" aria-label="Next page">›</button></div>
      <ul class="lf-checks"></ul>
      <fieldset class="lf-seg"><legend class="sr">Output</legend>
        <label><input type="radio" name="lf-out" value="pdf"><span>PDF<small>desktop printer</small></span></label>
        <label><input type="radio" name="lf-out" value="img"><span>Image<small>phone printer app</small></span></label>
      </fieldset>
      <div class="lf-imgopts">
        <div class="lf-field"><label for="lf-fmt">Format</label><select id="lf-fmt"><option value="png">PNG</option><option value="jpg">JPG</option></select></div>
        <div class="lf-field"><label for="lf-dpi">Printer resolution</label><select id="lf-dpi"><option value="203">203 dpi</option><option value="300">300 dpi</option></select></div>
        <label class="lf-check"><input type="checkbox" id="lf-bw"> Pure black &amp; white</label>
      </div>
      <div class="lf-actions">
        <button type="button" class="btn" data-a="pdf">Download PDF</button>
        <button type="button" class="btn ghost" data-a="open">Open to print</button>
        <button type="button" class="btn" data-a="img">Save image</button>
        <button type="button" class="btn ghost" data-a="share" hidden>Share to printer app</button>
      </div>
      <details class="lf-guide">
        <summary>Print settings for a perfect 100% print</summary>
        <div class="lf-field"><label for="lf-gsel">I print from</label><select id="lf-gsel">
          <option value="acrobat">Adobe Acrobat Reader (Windows or Mac)</option>
          <option value="chrome">Chrome or Edge PDF viewer</option>
          <option value="preview">Preview on a Mac</option>
          <option value="phone">A phone app (Bluetooth printer)</option>
        </select></div>
        <ol class="lf-gsteps"></ol>
        <div class="lf-row"><button type="button" class="btn ghost sm" data-a="copyguide">Copy these steps</button><span class="small muted lf-copied" role="status"></span></div>
        <p class="lf-credit">Print guide by <a href="${REF}" target="_blank" rel="noopener">LabelFit</a> · labelfit.vercel.app</p>
      </details>
    </section>
    <section class="lf-src" aria-label="Source pages">
      <div class="lf-strip"></div>
      <p class="lf-hint small muted">Each box is one piece of the page. Tap a box to change what it is, drag it to move, or drag its corners to resize.</p>
      <div class="lf-stagewrap"><div class="lf-stage"><canvas class="lf-pagecv" aria-hidden="true"></canvas><svg class="lf-svg" role="group" aria-label="Detected areas on this page"></svg></div></div>
      <div class="lf-bt" hidden>
        <div class="lf-field"><label for="lf-role">Use this box as</label><select id="lf-role"><option value="label">Label</option><option value="slip">Packing slip (own page)</option><option value="customs">Customs form (own page)</option><option value="skip">Leave out</option></select></div>
        <div class="lf-rot"><span class="lf-sub">Rotate</span><button type="button" class="btn ghost sm" data-a="rotl" aria-label="Rotate left 90 degrees">⟲ Left</button><button type="button" class="btn ghost sm" data-a="rotr" aria-label="Rotate right 90 degrees">Right ⟳</button><button type="button" class="btn ghost sm" data-a="rotauto">Auto</button><span class="small muted lf-rotv"></span></div>
        <details class="lf-exact"><summary>Exact position (mm)</summary>
          <div class="lf-xywh">
            <div><label for="lf-bx">Left</label><input id="lf-bx" type="number" step="0.5" inputmode="decimal"></div>
            <div><label for="lf-by">Top</label><input id="lf-by" type="number" step="0.5" inputmode="decimal"></div>
            <div><label for="lf-bw2">Width</label><input id="lf-bw2" type="number" step="0.5" min="5" inputmode="decimal"></div>
            <div><label for="lf-bh">Height</label><input id="lf-bh" type="number" step="0.5" min="5" inputmode="decimal"></div>
          </div>
        </details>
        <button type="button" class="btn ghost sm" data-a="delbox">Remove this box</button>
      </div>
      <div class="lf-pa">
        <button type="button" class="btn ghost sm" data-a="addbox">+ Add a crop box</button>
        <button type="button" class="btn ghost sm" data-a="redetect">Auto-detect again</button>
        <button type="button" class="btn ghost sm" data-a="skippage"></button>
      </div>
      <div class="lf-savelayout">
        <label for="lf-lname">Save this page's boxes as a layout</label>
        <div class="lf-row"><input id="lf-lname" maxlength="40" placeholder="e.g. My Vinted Evri label"><button type="button" class="btn ghost sm" data-a="savelayout">Save layout</button></div>
      </div>
    </section>
  </div>`;

  // ---------- Settings UI ----------
  function fillPresetSelect() {
    const sel = $("#lf-preset");
    sel.innerHTML = Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${esc(p.name)}</option>`).join("") +
      (layouts.length ? `<optgroup label="My saved layouts">${layouts.map(l => `<option value="my:${esc(l.id)}">${esc(l.name)}</option>`).join("")}</optgroup>` : "");
    if (String(S.preset).startsWith("my:") && !layouts.some(l => "my:" + l.id === S.preset)) S.preset = "auto";
    sel.value = S.preset;
    const ml = $("#lf-mylist");
    ml.innerHTML = layouts.map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join("");
    $(".lf-nolayouts").hidden = !!layouts.length;
    $(".lf-haslayouts").hidden = !layouts.length;
  }
  function syncSettingsUI() {
    fillPresetSelect();
    $("#lf-size").value = S.size;
    $(".lf-custom").hidden = S.size !== "custom";
    $("#lf-cw").value = S.cw; $("#lf-ch").value = S.ch || "";
    $("#lf-mode").value = S.mode; $("#lf-margin").value = String(S.margin);
    $("#lf-slips").value = S.slips; $("#lf-customs").value = S.customs;
    $$('input[name="lf-out"]').forEach(r => { r.checked = r.value === S.out; });
    $("#lf-fmt").value = S.fmt; $("#lf-dpi").value = String(S.dpi); $("#lf-bw").checked = !!S.bw;
    $("#lf-gsel").value = S.guide;
    mount.classList.toggle("is-img", S.out === "img");
    renderGuide();
  }
  const spec = () => C.sheetSpec(S.size, { w: S.cw, h: S.ch });
  const sizeName = () => S.size === "custom" ? (S.ch ? `${S.cw} × ${S.ch} mm` : `${S.cw} mm roll`) : C.SIZES[S.size].name;

  // ---------- Libraries (loaded on first use) ----------
  let pdfjsP, pdflibP;
  const loadPdfJs = () => pdfjsP || (pdfjsP = import("/vendor/pdfjs/pdf.min.js").then(m => { m.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js"; return m; }).catch(e => { pdfjsP = null; throw e; }));
  const loadPdfLib = () => pdflibP || (pdflibP = new Promise((res, rej) => {
    if (window.PDFLib) return res(window.PDFLib);
    const s = document.createElement("script"); s.src = "/vendor/pdf-lib/pdf-lib.min.js";
    s.onload = () => res(window.PDFLib); s.onerror = () => { pdflibP = null; rej(new Error("Couldn't load the PDF writer")); };
    document.head.appendChild(s);
  }));
  // Start fetching pdf.js as soon as someone shows intent to use the tool.
  const warm = () => { loadPdfJs().catch(() => {}); };
  mount.addEventListener("pointerenter", warm, { once: true });
  mount.addEventListener("focusin", warm, { once: true });
  mount.addEventListener("touchstart", warm, { once: true, passive: true });

  const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  let queue = Promise.resolve();
  const serial = fn => (queue = queue.then(fn, fn));

  // ---------- Reading files ----------
  function status(msg, err) { const s = $(".lf-status"); s.textContent = msg || ""; s.classList.toggle("err", !!err); }

  async function addFiles(list) {
    const files = [...list];
    if (!files.length || busy) return;
    busy = true; mount.classList.add("busy");
    const errs = [];
    let added = 0;
    for (const f of files) {
      try { added += await addFile(f); }
      catch (e) { errs.push(errorText(f, e)); }
    }
    busy = false; mount.classList.remove("busy");
    if (!pages.length) { status(errs.join(" ") || "No pages found.", true); return; }
    if (added) { cur = Math.max(0, pages.length - added); outIdx = 0; sel = null; }
    status(errs.join(" "), !!errs.length);
    track("files_loaded", { pages: pages.length > 20 ? "20+" : pages.length > 3 ? "4-20" : String(pages.length), preset: S.preset.startsWith("my:") ? "saved" : S.preset });
    renderAll();
  }
  function errorText(f, e) {
    const n = e && e.name;
    if (n === "PasswordException") return `“${f.name}” is password-protected. Open it, print or save it as a new PDF without a password, then try again.`;
    if (n === "InvalidPDFException" || n === "notsupported") return `“${f.name}” isn't a PDF or image LabelFit can read.`;
    return `Couldn't read “${f.name}”${e && e.message ? ` (${e.message})` : ""}.`;
  }
  async function addFile(f) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const sig = String.fromCharCode(...bytes.subarray(0, 5));
    const isPdf = sig === "%PDF-" || /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);
    const isImg = /^image\/(png|jpe?g|webp|gif|bmp)$/i.test(f.type) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name);
    const doc = { id: ++uid, name: f.name, bytes };
    if (isPdf) {
      status(`Opening ${f.name}…`);
      const lib = await loadPdfJs();
      doc.kind = "pdf";
      doc.pdf = await lib.getDocument({ data: bytes.slice(), isEvalSupported: false, standardFontDataUrl: "/vendor/pdfjs/standard_fonts/" }).promise;
      const n = doc.pdf.numPages;
      docs.push(doc);
      for (let i = 0; i < n; i++) {
        status(`Finding the label in ${f.name}${n > 1 ? `: page ${i + 1} of ${n}` : ""}…`);
        pages.push(await analyzePdfPage(doc, i, n));
      }
      return n;
    }
    if (isImg) {
      status(`Opening ${f.name}…`);
      doc.kind = "img";
      doc.img = await loadImage(f);
      doc.ptPerPx = 72 / 150;
      docs.push(doc);
      pages.push(await analyzeImage(doc));
      return 1;
    }
    const e = new Error("unsupported"); e.name = "notsupported"; throw e;
  }
  async function loadImage(f) {
    if (window.createImageBitmap) { try { return await createImageBitmap(f); } catch {} }
    const url = URL.createObjectURL(f);
    try { const im = new Image(); im.src = url; await im.decode(); return im; } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  function detectScale(W, H) { return W * H * DET * DET > 6e6 ? Math.sqrt(6e6 / (W * H)) : DET; }
  function finishPage(pg, cv, ctx, rawBlocks, single) {
    const { data } = ctx.getImageData(0, 0, cv.width, cv.height);
    pg.grid = C.buildGrid(data, cv.width, cv.height, 3);
    const res = C.analyze(pg.grid, { cellMm: pg.cellMm, ptPerCell: pg.cellPt, pageW: pg.w, pageH: pg.h });
    pg.sep = res.sep;
    rawBlocks(res.blocks);
    let blocks = C.classify(res.blocks, { cellMm: pg.cellMm, ptPerCell: pg.cellPt, single });
    if (!blocks.some(b => b.kind === "label") && single) {
      const r = PRESETS[S.preset]?.region || { x: 0, y: 0, w: 1, h: 1 };
      blocks.push({ x: r.x * pg.w, y: r.y * pg.h, w: r.w * pg.w, h: r.h * pg.h, kind: "label", guess: true });
    }
    pg.auto = blocks.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, kind: b.kind, guess: !!b.guess }));
    const th = canvas(160, 160 * cv.height / cv.width);
    th.getContext("2d").drawImage(cv, 0, 0, th.width, th.height);
    pg.thumb = th.toDataURL("image/jpeg", 0.8);
    cv.width = cv.height = 0;
    applyLayoutOrAuto(pg);
    return pg;
  }
  async function analyzePdfPage(doc, i, n) {
    const page = await doc.pdf.getPage(i + 1);
    const vp1 = page.getViewport({ scale: 1 });
    const pg = { doc, index: i, w: vp1.width, h: vp1.height, rotate: page.rotate, include: true };
    const sc = detectScale(pg.w, pg.h);
    pg.cellPt = 3 / sc; pg.cellMm = pg.cellPt / MM;
    const vp = page.getViewport({ scale: sc });
    const cv = canvas(Math.ceil(vp.width), Math.ceil(vp.height));
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp, background: "#ffffff" }).promise;
    let items = [];
    try { items = (await page.getTextContent()).items; } catch {}
    return finishPage(pg, cv, ctx, blocks => {
      for (const it of items) {
        if (!it.str || !it.str.trim()) continue;
        const [x, y] = vp1.convertToViewportPoint(it.transform[4], it.transform[5]);
        const b = blocks.find(b => x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y - 3 && y <= b.y + b.h + 3);
        if (b) b.text = (b.text || "") + " " + it.str;
      }
    }, n === 1);
  }
  async function analyzeImage(doc) {
    const img = doc.img;
    const pg = { doc, index: 0, w: img.width * doc.ptPerPx, h: img.height * doc.ptPerPx, rotate: 0, include: true };
    const sc = detectScale(pg.w, pg.h);
    pg.cellPt = 3 / sc; pg.cellMm = pg.cellPt / MM;
    const cv = canvas(pg.w * sc, pg.h * sc);
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return finishPage(pg, cv, ctx, () => {}, true);
  }

  const mkBlock = (o, extra = {}) => ({ id: "b" + (++uid), x: o.x, y: o.y, w: o.w, h: o.h, kind: o.kind || "manual", guess: !!o.guess, rot: "auto", override: null, ...extra });
  function activeLayout() { return String(S.preset).startsWith("my:") ? layouts.find(l => "my:" + l.id === S.preset) : null; }
  function applyLayoutOrAuto(pg) {
    const L = activeLayout();
    if (L) {
      pg.blocks = L.boxes.map(b => mkBlock({ x: b.x * pg.w, y: b.y * pg.h, w: b.w * pg.w, h: b.h * pg.h, kind: "manual" }, { override: b.role, rot: b.rot ?? "auto" }));
      pg.fromLayout = true;
    } else {
      pg.blocks = pg.auto.map(b => mkBlock(b));
      pg.fromLayout = false;
    }
    pg.blocks.forEach(b => updateCut(pg, b));
  }
  function updateCut(pg, b) { b.cut = pg.grid ? C.cutSides(pg.grid, pg.sep, b, pg.cellPt) : []; }

  // ---------- Roles and output plan ----------
  function roleOf(b) {
    if (b.override) return b.override;
    if (b.kind === "label") return "label";
    if (b.kind === "slip") return S.slips === "page" ? "slip" : "skip";
    if (b.kind === "customs") return S.customs === "page" ? "customs" : "skip";
    if (b.kind === "manual") return "label";
    return "skip";
  }
  const ordered = pg => C.readingOrder(pg.blocks, mm(20));
  function plan() {
    const jobs = [];
    pages.forEach((pg, pi) => {
      if (!pg.include) return;
      for (const b of ordered(pg)) {
        const role = roleOf(b);
        if (role === "skip") continue;
        jobs.push({ pg, pi, b, role, bw: b.w, bh: b.h, rot: b.rot, footer: role === "slip" ? FOOT : 0 });
      }
    });
    const sheets = C.layoutSheets(jobs, spec(), { mode: S.mode, margin: mm(+S.margin) });
    return { jobs, sheets };
  }

  // ---------- Rendering an output sheet to a canvas ----------
  async function drawItem(ctx, it, k) {
    const { pg, b } = it.job;
    const dx = Math.round(it.x * k), dy = Math.round(it.y * k);
    const dw = Math.max(1, Math.round(it.w * k)), dh = Math.max(1, Math.round(it.h * k));
    if (pg.doc.kind === "pdf") {
      const page = await pg.doc.pdf.getPage(pg.index + 1);
      const vp1 = page.getViewport({ scale: 1 });
      const pts = [[b.x, b.y], [b.x + b.w, b.y + b.h]].map(([x, y]) => vp1.convertToPdfPoint(x, y));
      const rot = (page.rotate + it.rot) % 360, sc = it.s * k;
      const v = pts.map(p => page.getViewport({ scale: sc, rotation: rot }).convertToViewportPoint(p[0], p[1]));
      const vp = page.getViewport({ scale: sc, rotation: rot, offsetX: -Math.min(v[0][0], v[1][0]), offsetY: -Math.min(v[0][1], v[1][1]) });
      const tmp = canvas(dw, dh), tctx = tmp.getContext("2d");
      tctx.fillStyle = "#fff"; tctx.fillRect(0, 0, dw, dh);
      await page.render({ canvasContext: tctx, viewport: vp, background: "#ffffff" }).promise;
      ctx.drawImage(tmp, dx, dy);
      tmp.width = tmp.height = 0;
    } else {
      const p = pg.doc.ptPerPx, w0 = b.w * it.s * k, h0 = b.h * it.s * k;
      ctx.save();
      ctx.beginPath(); ctx.rect(dx, dy, dw, dh); ctx.clip();
      ctx.translate(dx + dw / 2, dy + dh / 2); ctx.rotate(it.rot * Math.PI / 180);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(pg.doc.img, b.x / p, b.y / p, b.w / p, b.h / p, -w0 / 2, -h0 / 2, w0, h0);
      ctx.restore();
    }
  }
  const CREDIT = ["Made with ", "LabelFit", " · labelfit.vercel.app"];
  function creditCanvas(ctx, it, sheetW, k) {
    ctx.save();
    ctx.fillStyle = "#6b6b76"; ctx.font = `${6 * k}px Helvetica, Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(CREDIT.join(""), (sheetW / 2) * k, (it.y + it.h + 7) * k);
    ctx.restore();
  }
  async function renderSheet(sheet, dpi, bw) {
    const k = dpi / 72;
    const cv = canvas(sheet.w * k, sheet.h * k);
    const ctx = cv.getContext("2d", { willReadFrequently: !!bw });
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    for (const it of sheet.items) {
      await drawItem(ctx, it, k);
      if (it.job.role === "slip") creditCanvas(ctx, it, sheet.w, k);
    }
    if (bw) { const id = ctx.getImageData(0, 0, cv.width, cv.height); C.toBW(id.data); ctx.putImageData(id, 0, 0); }
    return cv;
  }

  // ---------- PDF output ----------
  async function libDoc(doc) {
    if (doc.lib !== undefined) return doc.lib;
    const { PDFDocument } = await loadPdfLib();
    try {
      const d = await PDFDocument.load(doc.bytes, { ignoreEncryption: true, updateMetadata: false });
      doc.lib = d.isEncrypted ? null : d;
    } catch { doc.lib = null; }
    return doc.lib;
  }
  async function buildPdf(sheets) {
    const L = await loadPdfLib();
    const { PDFDocument, degrees, rgb, StandardFonts, PDFString } = L;
    const out = await PDFDocument.create();
    out.setTitle("Shipping labels"); out.setCreator("LabelFit (labelfit.vercel.app)"); out.setProducer("LabelFit · https://labelfit.vercel.app");
    let font = null, raster = 0;
    // Embed every crop from the same source file in one call, so its fonts and images are
    // copied into the new PDF once rather than once per label.
    const emb = new Map(), bySrc = new Map();
    for (const sh of sheets) for (const it of sh.items) {
      const { pg, b } = it.job;
      const src = pg.doc.kind === "pdf" && !window.__lfForceRaster ? await libDoc(pg.doc) : null;
      if (!src) continue;
      const p1 = await pg.doc.pdf.getPage(pg.index + 1);
      const vp1 = p1.getViewport({ scale: 1 });
      const [a, c] = [[b.x, b.y], [b.x + b.w, b.y + b.h]].map(([x, y]) => vp1.convertToPdfPoint(x, y));
      const box = { left: Math.min(a[0], c[0]), right: Math.max(a[0], c[0]), bottom: Math.min(a[1], c[1]), top: Math.max(a[1], c[1]) };
      if (!bySrc.has(src)) bySrc.set(src, []);
      bySrc.get(src).push({ it, page: src.getPage(pg.index), box, rotate: p1.rotate });
    }
    for (const list of bySrc.values()) {
      try { (await out.embedPages(list.map(x => x.page), list.map(x => x.box))).forEach((e, i) => emb.set(list[i].it, { e, rotate: list[i].rotate })); }
      catch (e) { console.warn("LabelFit: vector copy failed, using 300 dpi images", e); }
    }
    for (const sh of sheets) {
      const page = out.addPage([sh.w, sh.h]);
      for (const it of sh.items) {
        const em = emb.get(it);
        let done = false;
        if (em) {
          try {
            const e = em.e, r = (em.rotate + it.rot) % 360, s = it.s;
            const sw = e.width * s, shh = e.height * s;
            const cx = it.x + it.w / 2, cy = sh.h - (it.y + it.h / 2);
            const [x, y] = r === 90 ? [cx - shh / 2, cy + sw / 2] : r === 180 ? [cx + sw / 2, cy + shh / 2] : r === 270 ? [cx + shh / 2, cy - sw / 2] : [cx - sw / 2, cy - shh / 2];
            page.drawPage(e, { x, y, xScale: s, yScale: s, rotate: degrees(-r) });
            done = true;
          } catch (e) { console.warn("LabelFit: vector copy failed, using a 300 dpi image", e); }
        }
        if (!done) {
          if (it.job.pg.doc.kind === "pdf") raster++; // images are always placed as images
          const k = 300 / 72;
          const cv = canvas(it.w * k, it.h * k), ctx = cv.getContext("2d");
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
          await drawItem(ctx, { ...it, x: 0, y: 0 }, k);
          const png = await out.embedPng(await blobBytes(cv, "image/png"));
          page.drawImage(png, { x: it.x, y: sh.h - it.y - it.h, width: it.w, height: it.h });
          cv.width = cv.height = 0;
        }
        if (it.job.role === "slip") {
          font = font || await out.embedFont(StandardFonts.Helvetica);
          const size = 6, ws = CREDIT.map(t => font.widthOfTextAtSize(t, size));
          const x0 = (sh.w - ws[0] - ws[1] - ws[2]) / 2, yb = sh.h - (it.y + it.h + 7);
          page.drawText(CREDIT.join(""), { x: x0, y: yb, size, font, color: rgb(0.42, 0.42, 0.46) });
          const annot = out.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x0 + ws[0], yb - 1.5, x0 + ws[0] + ws[1], yb + size], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(REF) } });
          page.node.addAnnot(out.context.register(annot));
        }
      }
    }
    return { bytes: await out.save(), raster };
  }
  const blobBytes = (cv, type, q) => new Promise((res, rej) => cv.toBlob(b => b ? b.arrayBuffer().then(a => res(new Uint8Array(a)), rej) : rej(new Error("Image encoding failed")), type, q));
  function download(data, name, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  const baseName = () => {
    const n = (docs[0]?.name || "label").replace(/\.[a-z0-9]+$/i, "").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "label";
    return `${n}-${S.size === "custom" ? "custom" : S.size}`;
  };

  // ---------- Image output ----------
  async function buildImages(sheets) {
    const files = [];
    const ext = S.fmt === "jpg" ? "jpg" : "png", type = ext === "jpg" ? "image/jpeg" : "image/png";
    for (let i = 0; i < sheets.length; i++) {
      const cv = await renderSheet(sheets[i], +S.dpi, S.bw);
      let bytes = await blobBytes(cv, type, 0.95);
      bytes = ext === "png" ? C.pngMeta(bytes, +S.dpi, "LabelFit (labelfit.vercel.app)") : C.jpegDpi(bytes, +S.dpi);
      files.push({ name: `${baseName()}${sheets.length > 1 ? "-" + String(i + 1).padStart(2, "0") : ""}.${ext}`, data: bytes, type, w: cv.width, h: cv.height });
      cv.width = cv.height = 0;
    }
    return files;
  }

  // ---------- Main render ----------
  function renderAll() {
    const has = pages.length > 0;
    $(".lf-work").hidden = !has;
    $(".lf-dropin").hidden = has; $(".lf-loaded").hidden = !has;
    mount.classList.toggle("has-files", has);
    if (!has) return;
    $(".lf-files").textContent = docs.map(d => d.name).join(", ") + ` · ${pages.length} page${pages.length > 1 ? "s" : ""}`;
    cur = Math.min(cur, pages.length - 1);
    renderStrip(); renderStage(); renderBT(); refreshOutput();
  }
  function pageLabelCount(pg) { return pg.include ? pg.blocks.filter(b => roleOf(b) === "label").length : 0; }
  function renderStrip() {
    const st = $(".lf-strip");
    st.hidden = pages.length < 2;
    st.innerHTML = pages.map((pg, i) => {
      const n = pageLabelCount(pg);
      const badge = !pg.include ? "Skipped" : n ? `${n} label${n > 1 ? "s" : ""}` : "No label";
      return `<button type="button" class="lf-th${i === cur ? " cur" : ""}${!n ? " none" : ""}" data-page="${i}" aria-pressed="${i === cur}" aria-label="Page ${i + 1}: ${badge}"><img src="${pg.thumb}" alt=""><span>${i + 1} · ${badge}</span></button>`;
    }).join("");
    const pa = $('[data-a="skippage"]');
    pa.textContent = pages[cur]?.include ? "Skip this page" : "Use this page";
  }

  // Stage: the current source page with draggable boxes.
  let stageToken = 0;
  async function renderStage() {
    const pg = pages[cur]; if (!pg) return;
    const wrap = $(".lf-stagewrap"), stage = $(".lf-stage");
    const maxH = Math.max(320, window.innerHeight * 0.78);
    const cssW = Math.min(wrap.clientWidth || 600, maxH * pg.w / pg.h);
    stage.style.width = cssW + "px";
    stage.style.aspectRatio = `${pg.w} / ${pg.h}`;
    drawOverlay();
    const token = ++stageToken;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const k = Math.min(cssW * dpr / pg.w, 4);
    await serial(async () => {
      if (token !== stageToken) return;
      const cv = canvas(pg.w * k, pg.h * k), ctx = cv.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
      if (pg.doc.kind === "pdf") {
        const page = await pg.doc.pdf.getPage(pg.index + 1);
        await page.render({ canvasContext: ctx, viewport: page.getViewport({ scale: k }), background: "#ffffff" }).promise;
      } else ctx.drawImage(pg.doc.img, 0, 0, cv.width, cv.height);
      if (token !== stageToken) return;
      const out = $(".lf-pagecv");
      out.width = cv.width; out.height = cv.height;
      out.getContext("2d").drawImage(cv, 0, 0);
      cv.width = cv.height = 0;
    });
  }
  function selBlock() { return pages[cur]?.blocks.find(b => b.id === sel) || null; }
  function drawOverlay() {
    const pg = pages[cur], svg = $(".lf-svg"); if (!pg) return;
    const rect = svg.getBoundingClientRect();
    const px = rect.width ? pg.w / rect.width : 1; // points per CSS pixel
    svg.setAttribute("viewBox", `0 0 ${pg.w} ${pg.h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    let li = 0;
    const labelNo = new Map();
    plan().jobs.forEach(j => { if (j.role === "label") labelNo.set(j.b.id, ++li); });
    svg.innerHTML = ordered(pg).map((b, i) => {
      const role = pg.include ? roleOf(b) : "skip", on = b.id === sel;
      const tag = role === "label" ? `Label ${labelNo.get(b.id) || ""}`.trim() : ROLE[role];
      const fs = 12 * px, pad = 4 * px, tw = (tag.length * 6.6 + 10) * px;
      const warn = b.cut && b.cut.length && role !== "skip";
      let handles = "";
      if (on) {
        const hs = 12 * px, hit = 34 * px;
        const pts = { nw: [b.x, b.y], n: [b.x + b.w / 2, b.y], ne: [b.x + b.w, b.y], e: [b.x + b.w, b.y + b.h / 2], se: [b.x + b.w, b.y + b.h], s: [b.x + b.w / 2, b.y + b.h], sw: [b.x, b.y + b.h], w: [b.x, b.y + b.h / 2] };
        handles = Object.entries(pts).map(([k, [x, y]]) => `<g class="h h-${k}" data-h="${k}"><rect class="hit" x="${x - hit / 2}" y="${y - hit / 2}" width="${hit}" height="${hit}"/><rect class="hv" x="${x - hs / 2}" y="${y - hs / 2}" width="${hs}" height="${hs}" rx="${2 * px}"/></g>`).join("");
      }
      return `<g class="blk r-${role}${on ? " on" : ""}${warn ? " warn" : ""}" data-id="${b.id}" tabindex="0" role="button" aria-pressed="${on}" aria-label="Box ${i + 1}: ${esc(tag)}${warn ? ", content crosses its edge" : ""}">
        <rect class="area" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" style="stroke-width:${(on ? 2.5 : 2) * px}"/>
        <rect class="tagbg" x="${b.x}" y="${Math.max(0, b.y - fs - pad * 2)}" width="${tw}" height="${fs + pad * 2}" rx="${3 * px}"/>
        <text x="${b.x + 5 * px}" y="${Math.max(0, b.y - fs - pad * 2) + fs + pad * 0.6}" style="font-size:${fs}px">${esc(tag)}</text>${handles}</g>`;
    }).join("");
    svg.classList.toggle("editing", !!sel);
  }
  function renderBT() {
    const b = selBlock(), bt = $(".lf-bt");
    bt.hidden = !b;
    if (!b) return;
    const pg = pages[cur];
    $("#lf-role").value = pg.include ? roleOf(b) : "skip";
    $("#lf-bx").value = fmtMm(b.x); $("#lf-by").value = fmtMm(b.y); $("#lf-bw2").value = fmtMm(b.w); $("#lf-bh").value = fmtMm(b.h);
    const f = itemFor(b);
    $(".lf-rotv").textContent = b.rot === "auto" ? `Auto${f ? ` (${f.rot}°)` : ""}` : `${b.rot}°`;
  }
  function itemFor(b) {
    for (const sh of lastPlan?.sheets || []) for (const it of sh.items) if (it.job.b === b) return it;
    return null;
  }

  // Output preview and checks.
  let lastPlan = null, outToken = 0, outTimer = 0;
  function refreshOutput() { clearTimeout(outTimer); outTimer = setTimeout(renderOutput, 60); }
  async function renderOutput() {
    const p = lastPlan = plan();
    const { jobs, sheets } = p;
    const counts = { label: 0, slip: 0, customs: 0 };
    jobs.forEach(j => counts[j.role]++);
    const parts = [counts.label ? `${counts.label} label${counts.label > 1 ? "s" : ""}` : "", counts.customs ? `${counts.customs} customs form${counts.customs > 1 ? "s" : ""}` : "", counts.slip ? `${counts.slip} packing slip${counts.slip > 1 ? "s" : ""}` : ""].filter(Boolean);
    const warnPages = sheets.map((sh, i) => sh.items.some(it => itemWarnings(it).length) ? i + 1 : 0).filter(Boolean);
    $(".lf-sum").innerHTML = jobs.length
      ? `<strong>${parts.join(", ")}</strong> → ${sheets.length} page${sheets.length > 1 ? "s" : ""} of ${esc(sizeName())}${warnPages.length ? ` · <span class="lf-w">check page${warnPages.length > 1 ? "s" : ""} ${warnPages.join(", ")}</span>` : ""}`
      : `<strong>Nothing to print yet.</strong> Set a box to “Label” or add a crop box.`;
    outIdx = Math.max(0, Math.min(outIdx, sheets.length - 1));
    $(".lf-opos").textContent = sheets.length ? `Page ${outIdx + 1} of ${sheets.length}` : "";
    $(".lf-onav").hidden = sheets.length < 2;
    $$(".lf-actions .btn").forEach(bn => { bn.disabled = !jobs.length; });
    $('[data-a="img"]').textContent = sheets.length > 1 && !canShareFiles() ? `Save images (.zip)` : sheets.length > 1 ? "Save images" : "Save image";
    const sh = sheets[outIdx];
    const checks = $(".lf-checks");
    checks.innerHTML = sh ? sh.items.map(it => {
      const w = itemWarnings(it);
      const pre = sh.items.length > 1 ? `<b>${ROLE[it.job.role]} (page ${it.job.pi + 1}):</b> ` : "";
      const pct = Math.round(it.s * 100);
      const ok = [];
      if (!w.some(x => x.k === "cut")) ok.push(`<li class="ok">${pre}Nothing cut off at the edges</li>`);
      const turned = it.rot ? `, turned ${it.rot}°` : "";
      if (it.job.pg.doc.kind === "img") { if (!w.some(x => x.k === "lowres")) ok.push(`<li class="ok">${pre}Image prints at about ${effDpi(it)} dpi${turned}</li>`); }
      else if (!w.some(x => x.k === "small" || x.k === "clip")) ok.push(`<li class="ok">${pre}Printed at ${pct}% of its size on the page${turned}</li>`);
      return w.map(x => `<li class="bad">${pre}${x.t}</li>`).join("") + ok.join("");
    }).join("") : "";
    renderBT();
    drawOverlay();
    // Preview canvas
    const token = ++outToken;
    const cvOut = $(".lf-paper");
    if (!sh) { cvOut.width = cvOut.height = 0; return; }
    const wrapW = $(".lf-paperwrap").clientWidth || 300;
    const maxH = Math.max(280, Math.min(560, window.innerHeight * 0.62));
    const cssW = Math.min(wrapW, maxH * sh.w / sh.h, 420);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const dpi = Math.max(36, cssW * dpr / (sh.w / 72));
    await serial(async () => {
      if (token !== outToken) return;
      const cv = await renderSheet(sh, dpi, S.out === "img" && S.bw);
      if (token !== outToken) return;
      cvOut.width = cv.width; cvOut.height = cv.height;
      cvOut.style.width = cssW + "px";
      cvOut.getContext("2d").drawImage(cv, 0, 0);
      cvOut.setAttribute("aria-label", `Preview of output page ${outIdx + 1} (${sizeName()})`);
      cv.width = cv.height = 0;
    });
  }
  // Source pixels per printed inch for image inputs (images have no real physical size).
  const effDpi = it => { const b = it.job.b, px = (it.rot % 180 ? b.h : b.w) / it.job.pg.doc.ptPerPx; return Math.round(px / (it.w / 72)); };
  function itemWarnings(it) {
    const w = [], b = it.job.b;
    if (b.cut && b.cut.length) w.push({ k: "cut", t: `Something runs off the ${b.cut.join(" and ")} edge of the box. Drag the box so the whole label fits inside.` });
    const img = it.job.pg.doc.kind === "img";
    if (img) { const d = effDpi(it); if (d < 130) w.push({ k: "lowres", t: `This image is low resolution (about ${d} dpi when printed), so barcodes may print blurry. Use the original PDF if you can.` }); }
    if (it.clipped) w.push({ k: "clip", t: `At 100% this is bigger than ${esc(sizeName())}, so part of it will be cut off. Choose “Fit the label to the page” or a bigger size.` });
    else if (!img && it.s < 0.8) w.push({ k: "small", t: `Printed at only ${Math.round(it.s * 100)}% of its size. Barcodes shrunk this much may not scan; pick a bigger label size if you can.` });
    if (b.guess) w.push({ k: "guess", t: `No barcode was found on this page, so the box is a guess. Check that it covers the label.` });
    return w;
  }

  // ---------- Print guide ----------
  const GUIDES = {
    acrobat: [
      "Open the downloaded PDF in Adobe Acrobat Reader and choose Print.",
      "Printer: pick your label printer.",
      "Page Sizing & Handling: choose Actual size (not Fit or Shrink oversized pages).",
      "Orientation: Auto portrait/landscape.",
      "Paper: open Properties (Windows) or Page Setup (Mac) and pick SIZE. On Windows, ticking “Choose paper source by PDF page size” also works.",
      "Print one test label and check the barcode is sharp and nothing is cut off.",
    ],
    chrome: [
      "Click Open to print, then the printer icon in the PDF viewer (or press Ctrl+P / Cmd+P).",
      "Destination: your label printer.",
      "More settings → Paper size: SIZE. Add it in the printer's preferences if it isn't listed.",
      "Scale: Default or 100 (avoid “Fit to printable area”).",
      "Margins: None or Default. The PDF already has its own small margin.",
      "Print one test label and check the barcode is sharp and nothing is cut off.",
    ],
    preview: [
      "Open the downloaded PDF in Preview and choose File → Print.",
      "Printer: your label printer.",
      "Paper Size: SIZE. If it's missing, choose Manage Custom Sizes, add it with zero margins and save.",
      "Scale: 100% (untick Scale to Fit).",
      "Orientation: portrait.",
      "Print one test label and check the barcode is sharp and nothing is cut off.",
    ],
    phone: [
      "Choose Image above. Pick 203 dpi for most Bluetooth thermal printers, or 300 dpi if your printer is a 300 dpi model.",
      "Tap Share to printer app and pick your printer's app. If it isn't in the list, save the image and open it from inside the app.",
      "In the app, set the label size to SIZE.",
      "Turn off any extra stretching or cropping in the app so the image prints edge to edge as it is.",
      "Print one test label and check the barcode is sharp and nothing is cut off.",
    ],
  };
  function guideSteps() { const sz = sizeName(); return GUIDES[S.guide].map(s => s.replace("SIZE", sz)); }
  function renderGuide() { $(".lf-gsteps").innerHTML = guideSteps().map(s => `<li>${esc(s)}</li>`).join(""); }

  // ---------- Events ----------
  const fileIn = $("#lf-file");
  fileIn.addEventListener("change", () => { const f = fileIn.files; addFiles(f).finally(() => { fileIn.value = ""; }); });
  const drop = $(".lf-drop");
  ["dragenter", "dragover"].forEach(t => mount.addEventListener(t, e => { if ([...(e.dataTransfer?.types || [])].includes("Files")) { e.preventDefault(); drop.classList.add("over"); } }));
  ["dragleave", "drop"].forEach(t => mount.addEventListener(t, e => { if (t === "dragleave" && mount.contains(e.relatedTarget)) return; drop.classList.remove("over"); }));
  mount.addEventListener("drop", e => { if (e.dataTransfer?.files?.length) { e.preventDefault(); addFiles(e.dataTransfer.files); } });
  // Dropping a file anywhere on the page should load it rather than navigate away.
  window.addEventListener("dragover", e => { if ([...(e.dataTransfer?.types || [])].includes("Files")) e.preventDefault(); });
  window.addEventListener("drop", e => { if (e.dataTransfer?.files?.length && !mount.contains(e.target)) { e.preventDefault(); addFiles(e.dataTransfer.files); } });

  mount.addEventListener("change", e => {
    const t = e.target, id = t.id;
    if (id === "lf-preset") {
      S.preset = t.value;
      const P = PRESETS[S.preset], L = activeLayout();
      if (P?.size) S.size = P.size;
      if (L) { S.size = L.size || S.size; S.mode = L.mode || S.mode; if (L.margin != null) S.margin = L.margin; if (L.cw) { S.cw = L.cw; S.ch = L.ch; } }
      pages.forEach(applyLayoutOrAuto);
      track("preset_used", { preset: L ? "saved" : S.preset });
      sel = null;
    } else if (id === "lf-size") { S.size = t.value; }
    else if (id === "lf-cw") S.cw = Math.min(600, Math.max(20, +t.value || 100));
    else if (id === "lf-ch") S.ch = +t.value > 0 ? Math.min(2000, Math.max(20, +t.value)) : 0;
    else if (id === "lf-mode") S.mode = t.value;
    else if (id === "lf-margin") S.margin = +t.value;
    else if (id === "lf-slips") S.slips = t.value;
    else if (id === "lf-customs") S.customs = t.value;
    else if (t.name === "lf-out") { S.out = t.value; track("output_mode", { mode: S.out }); }
    else if (id === "lf-fmt") S.fmt = t.value;
    else if (id === "lf-dpi") S.dpi = +t.value;
    else if (id === "lf-bw") S.bw = t.checked;
    else if (id === "lf-gsel") S.guide = t.value;
    else if (id === "lf-role") { const b = selBlock(); if (b) { const pg = pages[cur]; if (!pg.include) pg.include = true; b.override = t.value; renderStrip(); } }
    else if (id === "lf-import") { importLayouts(t.files[0]); t.value = ""; return; }
    else if (["lf-bx", "lf-by", "lf-bw2", "lf-bh"].includes(id)) { exactEdit(); return; }
    else return;
    save(); syncSettingsUI();
    if (pages.length) { renderStrip(); refreshOutput(); }
  });
  function exactEdit() {
    const b = selBlock(), pg = pages[cur]; if (!b) return;
    const v = id => mm(parseFloat($(id).value));
    let x = v("#lf-bx"), y = v("#lf-by"), w = v("#lf-bw2"), h = v("#lf-bh");
    if (![x, y, w, h].every(Number.isFinite)) return;
    w = Math.max(mm(5), Math.min(w, pg.w)); h = Math.max(mm(5), Math.min(h, pg.h));
    x = Math.max(0, Math.min(x, pg.w - w)); y = Math.max(0, Math.min(y, pg.h - h));
    Object.assign(b, { x, y, w, h, guess: false });
    updateCut(pg, b); refreshOutput();
  }

  mount.addEventListener("click", async e => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    const th = e.target.closest("[data-page]");
    if (th) { cur = +th.dataset.page; sel = null; renderStrip(); renderStage(); renderBT(); return; }
    if (a === "pick" || (!a && e.target.closest(".lf-dropin"))) { fileIn.click(); return; }
    if (a === "import") { $("#lf-import").click(); return; }
    if (!a) return;
    const pg = pages[cur], b = selBlock();
    if (a === "clear") { docs.forEach(d => { try { d.pdf && d.pdf.destroy(); } catch {} }); docs.length = 0; pages = []; sel = null; status(""); renderAll(); }
    else if (a === "oprev") { outIdx--; refreshOutput(); }
    else if (a === "onext") { outIdx++; refreshOutput(); }
    else if (a === "rotl" || a === "rotr") {
      if (!b) return;
      const curRot = b.rot === "auto" ? (itemFor(b)?.rot || 0) : b.rot;
      b.rot = (curRot + (a === "rotr" ? 90 : 270)) % 360; refreshOutput();
    } else if (a === "rotauto") { if (b) { b.rot = "auto"; refreshOutput(); } }
    else if (a === "delbox") { if (b) { pg.blocks = pg.blocks.filter(x => x !== b); sel = null; renderStrip(); refreshOutput(); } }
    else if (a === "addbox") {
      const sp = spec(), ar = sp.h ? sp.h / sp.w : 1.5;
      let w = Math.min(pg.w * 0.6, mm(100)), h = w * ar;
      if (h > pg.h * 0.8) { h = pg.h * 0.8; w = h / ar; }
      const nb = mkBlock({ x: (pg.w - w) / 2, y: (pg.h - h) / 2, w, h, kind: "manual" }, { override: "label" });
      pg.blocks.push(nb); pg.include = true; sel = nb.id; updateCut(pg, nb); renderStrip(); refreshOutput();
    } else if (a === "redetect") { pg.blocks = pg.auto.map(x => mkBlock(x)); pg.blocks.forEach(x => updateCut(pg, x)); pg.include = true; sel = null; renderStrip(); refreshOutput(); }
    else if (a === "skippage") { pg.include = !pg.include; renderStrip(); refreshOutput(); }
    else if (a === "savelayout") saveLayout();
    else if (a === "dellayout") {
      const id = $("#lf-mylist").value; layouts = layouts.filter(l => l.id !== id); store.set("layouts", layouts);
      if (S.preset === "my:" + id) { S.preset = "auto"; pages.forEach(applyLayoutOrAuto); save(); refreshOutput(); }
      syncSettingsUI();
    } else if (a === "export") {
      download(JSON.stringify({ app: "LabelFit", version: 1, site: "https://labelfit.vercel.app", layouts }, null, 2), "labelfit-layouts.json", "application/json");
    } else if (a === "copyguide") {
      const txt = `How to print ${sizeName()} shipping labels at 100%:\n` + guideSteps().map((s, i) => `${i + 1}. ${s}`).join("\n") + `\n\nPrint guide from LabelFit, the free label converter: ${REF}`;
      let ok = false;
      try { await navigator.clipboard.writeText(txt); ok = true; } catch {}
      $(".lf-copied").textContent = ok ? "Copied" : "Couldn't copy; select the steps instead";
      setTimeout(() => { $(".lf-copied").textContent = ""; }, 2500);
    } else if (a === "pdf" || a === "open") await doPdf(a === "open");
    else if (a === "img") await doImages(false);
    else if (a === "share") await doImages(true);
  });

  async function withBusy(btn, fn) {
    if (busy) return; busy = true;
    const t = btn.textContent; btn.disabled = true; btn.textContent = "Working…";
    try { await fn(); } catch (e) { console.error(e); status("Something went wrong: " + (e && e.message || e), true); }
    finally { busy = false; btn.disabled = false; btn.textContent = t; }
  }
  async function doPdf(open) {
    // Open the tab inside the click so pop-up blockers allow it; fill it once the PDF is ready.
    let win = null;
    if (open) { try { win = window.open("", "_blank"); } catch {} }
    let shown = false;
    await withBusy($(`[data-a="${open ? "open" : "pdf"}"]`), async () => {
      const { sheets, jobs } = plan(); if (!jobs.length) return;
      if (jobs.length > 3 && window.Pro && !Pro.require("Convert any number of labels at once.")) return;
      const { bytes, raster } = await buildPdf(sheets);
      const name = `${baseName()}.pdf`;
      track("output_pdf", { size: S.size, count: jobs.length > 10 ? "10+" : String(jobs.length), open: open ? "1" : "0" });
      if (win) { const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })); win.location.href = url; shown = true; setTimeout(() => URL.revokeObjectURL(url), 600000); }
      else download(bytes, name, "application/pdf");
      status(`${shown ? "Opened" : "Saved"} ${name}: ${sheets.length} page${sheets.length > 1 ? "s" : ""}.${raster ? " Part of it couldn't be copied as sharp vector graphics, so that part was printed from a 300 dpi image." : ""} Print it at 100% scale.`);
    });
    if (win && !shown) { try { win.close(); } catch {} }
  }
  function canShareFiles() {
    try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File([new Uint8Array(1)], "t.png", { type: "image/png" })] })); } catch { return false; }
  }
  async function doImages(share) {
    await withBusy($(`[data-a="${share ? "share" : "img"}"]`), async () => {
      const { sheets } = plan(); if (!sheets.length) return;
      const files = await buildImages(sheets);
      track("output_png", { fmt: S.fmt, dpi: String(S.dpi), count: files.length > 10 ? "10+" : String(files.length), share: share ? "1" : "0" });
      if (share) {
        const fl = files.map(f => new File([f.data], f.name, { type: f.type }));
        try { await navigator.share({ files: fl }); status(`Shared ${fl.length} image${fl.length > 1 ? "s" : ""}.`); return; }
        catch (e) { if (e && e.name === "AbortError") return; }
      }
      if (files.length === 1) download(files[0].data, files[0].name, files[0].type);
      else download(C.zip(files, "Made with LabelFit · https://labelfit.vercel.app"), `${baseName()}-images.zip`, "application/zip");
      status(`Saved ${files.length} image${files.length > 1 ? "s" : ""} (${files[0].w} × ${files[0].h} px at ${S.dpi} dpi).`);
    });
  }

  function saveLayout() {
    const pg = pages[cur]; if (!pg) return;
    const nameIn = $("#lf-lname");
    const name = nameIn.value.trim() || `Layout ${layouts.length + 1}`;
    const boxes = pg.blocks.filter(b => roleOf(b) !== "skip").map(b => ({ x: b.x / pg.w, y: b.y / pg.h, w: b.w / pg.w, h: b.h / pg.h, role: roleOf(b), rot: b.rot }));
    if (!boxes.length) { status("Mark at least one box as a label before saving a layout.", true); return; }
    if (window.Pro && !Pro.require("Save crop layouts for every carrier.")) return;
    const id = Date.now().toString(36);
    layouts.push({ id, name, pageW: pg.w, pageH: pg.h, boxes, size: S.size, mode: S.mode, margin: S.margin, cw: S.cw, ch: S.ch });
    store.set("layouts", layouts);
    S.preset = "my:" + id; save(); nameIn.value = "";
    pages.forEach(p => { if (p !== pg) applyLayoutOrAuto(p); else p.fromLayout = true; });
    syncSettingsUI(); renderStrip(); refreshOutput();
    status(`Saved layout “${name}”. Pick it under “Label from” next time and LabelFit will use these boxes instead of auto-detecting.`);
  }
  async function importLayouts(file) {
    if (!file) return;
    try {
      const j = JSON.parse(await file.text());
      const list = Array.isArray(j) ? j : j.layouts;
      if (!Array.isArray(list)) throw new Error("no layouts");
      let n = 0;
      for (const l of list) {
        if (!l || typeof l.name !== "string" || !Array.isArray(l.boxes) || !l.boxes.length) continue;
        const boxes = l.boxes.filter(b => [b.x, b.y, b.w, b.h].every(v => Number.isFinite(+v) && +v >= 0 && +v <= 1.0001)).map(b => ({ x: +b.x, y: +b.y, w: +b.w, h: +b.h, role: ROLE[b.role] ? b.role : "label", rot: [0, 90, 180, 270].includes(b.rot) ? b.rot : "auto" }));
        if (!boxes.length) continue;
        const id = String(l.id || Date.now().toString(36) + n).replace(/[^\w-]/g, "").slice(0, 24) || "i" + n;
        layouts = layouts.filter(x => x.id !== id);
        layouts.push({ id, name: l.name.slice(0, 40), pageW: +l.pageW || 0, pageH: +l.pageH || 0, boxes, size: C.SIZES[l.size] || l.size === "custom" ? l.size : "4x6", mode: l.mode === "actual" ? "actual" : "fit", margin: [0, 2, 4].includes(+l.margin) ? +l.margin : 2, cw: +l.cw || 100, ch: +l.ch || 0 });
        n++;
      }
      store.set("layouts", layouts); syncSettingsUI();
      status(n ? `Imported ${n} layout${n > 1 ? "s" : ""}.` : "That file has no LabelFit layouts.", !n);
    } catch { status("That file isn't a LabelFit layouts file.", true); }
  }

  // Stage pointer editing.
  const svg = $(".lf-svg");
  let drag = null;
  const toPt = e => { const r = svg.getBoundingClientRect(), pg = pages[cur]; return { x: (e.clientX - r.left) / r.width * pg.w, y: (e.clientY - r.top) / r.height * pg.h }; };
  function select(id) {
    sel = id; drawOverlay(); renderBT();
    // Show the output page this box ends up on.
    const i = (lastPlan?.sheets || []).findIndex(sh => sh.items.some(it => it.job.b.id === id));
    if (i >= 0 && i !== outIdx) { outIdx = i; refreshOutput(); }
  }
  svg.addEventListener("pointerdown", e => {
    const pg = pages[cur]; if (!pg) return;
    const h = e.target.closest("[data-h]"), g = e.target.closest("[data-id]");
    const b = g ? pg.blocks.find(x => x.id === g.dataset.id) : null;
    if (!b) { if (sel) select(null); return; }
    if (sel !== b.id) select(b.id);
    drag = { mode: h ? h.dataset.h : "move", b, start: toPt(e), o: { x: b.x, y: b.y, w: b.w, h: b.h }, moved: false, id: e.pointerId };
    try { svg.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  });
  svg.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const pg = pages[cur], p = toPt(e), o = drag.o, b = drag.b, min = mm(10);
    const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
    if (!drag.moved && Math.hypot(dx, dy) < 1.5) return;
    drag.moved = true;
    let { x, y, w, h } = o;
    if (drag.mode === "move") { x = Math.max(0, Math.min(pg.w - w, o.x + dx)); y = Math.max(0, Math.min(pg.h - h, o.y + dy)); }
    else {
      const m = drag.mode;
      if (m.includes("w")) { const nx = Math.max(0, Math.min(o.x + o.w - min, o.x + dx)); w = o.x + o.w - nx; x = nx; }
      if (m.includes("e")) w = Math.max(min, Math.min(pg.w - o.x, o.w + dx));
      if (m.includes("n")) { const ny = Math.max(0, Math.min(o.y + o.h - min, o.y + dy)); h = o.y + o.h - ny; y = ny; }
      if (m.includes("s")) h = Math.max(min, Math.min(pg.h - o.y, o.h + dy));
    }
    Object.assign(b, { x, y, w, h });
    drawOverlay();
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { b, moved } = drag; drag = null;
    if (moved) { b.guess = false; updateCut(pages[cur], b); refreshOutput(); }
    else renderBT();
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  svg.addEventListener("keydown", e => {
    const g = e.target.closest("[data-id]"); if (!g) return;
    const pg = pages[cur], b = pg.blocks.find(x => x.id === g.dataset.id); if (!b) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(b.id); requestAnimationFrame(() => svg.querySelector(`[data-id="${b.id}"]`)?.focus()); return; }
    const step = mm(e.shiftKey ? 5 : 1);
    const dir = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!dir || sel !== b.id) return;
    e.preventDefault();
    b.x = Math.max(0, Math.min(pg.w - b.w, b.x + dir[0])); b.y = Math.max(0, Math.min(pg.h - b.h, b.y + dir[1]));
    updateCut(pg, b); refreshOutput();
    requestAnimationFrame(() => svg.querySelector(`[data-id="${b.id}"]`)?.focus());
  });

  let rsT = 0, lastW = window.innerWidth;
  window.addEventListener("resize", () => { if (Math.abs(window.innerWidth - lastW) < 2) return; lastW = window.innerWidth; clearTimeout(rsT); rsT = setTimeout(() => { if (pages.length) { renderStage(); refreshOutput(); } }, 200); });

  if (canShareFiles()) $('[data-a="share"]').hidden = false;
  syncSettingsUI();
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
  }
  // Test hook: read-only view of the current plan.
  window.LabelFit = { get pages() { return pages; }, plan, get settings() { return S; } };
})();
