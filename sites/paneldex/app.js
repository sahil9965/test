/* PanelDex UI: panel setup, the two-column panel editor, live totals, exports, share link + QR and saved panels.
   Everything stays in this browser (localStorage). PDFs are built on the device with jsPDF (vendored). */
(function () {
  "use strict";
  const C = window.PDCore;
  const root = document.getElementById("pd-tool");
  if (!C || !root) return;
  const preset = root.dataset.preset || "home";
  const $ = (s, el) => (el || root).querySelector(s);
  const $$ = (s, el) => Array.from((el || root).querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const track = (name, data) => { try { window.va && window.va("event", data ? { name, data } : { name }); } catch (e) { /* ignore */ } };
  const KEY = "paneldex:v1", PREFS = "paneldex:prefs";
  let store = { cur: null, list: {} };
  const state = { id: null, panel: null };
  let editSp = null;
  let prefs = { paper: "letter", dsize: "half", w: "", h: "", unit: "in" };
  try { prefs = { ...prefs, ...(JSON.parse(localStorage.getItem(PREFS) || "{}") || {}) }; } catch (e) { /* ignore */ }
  const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };

  /* ------------------------------------------------------------- markup */
  const opt = (v, t, sel) => `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(t)}</option>`;
  const circFields = h => `
      <div class="pd-circ" data-half="${h}">
        <h3 class="pd-ch" id="pd-${h}-h"></h3>
        <div class="pd-f2">
          <div class="pd-wide"><label for="pd-${h}-desc">Description</label><input id="pd-${h}-desc" data-h="${h}" data-f="desc" maxlength="60" autocomplete="off" placeholder="e.g. Kitchen counter, left of sink"></div>
          <div><label for="pd-${h}-room">Room / area</label><input id="pd-${h}-room" data-h="${h}" data-f="room" maxlength="40" autocomplete="off" placeholder="e.g. Kitchen"></div>
          <div><label for="pd-${h}-amps">Breaker (A)</label><input id="pd-${h}-amps" data-h="${h}" data-f="amps" type="number" min="0" max="4000" inputmode="numeric" list="pd-amplist"></div>
          <div><label for="pd-${h}-wire">Wire size</label><select id="pd-${h}-wire" data-h="${h}" data-f="wire">${opt("", "Not set")}${C.WIRES.map(w => opt(w, C.wireLabel(w))).join("")}</select></div>
          <div><label for="pd-${h}-prot">Protection</label><select id="pd-${h}-prot" data-h="${h}" data-f="prot">${C.PROT_KEYS.map(k => opt(k, C.PROT[k] + (k === "df" ? " (AFCI + GFCI)" : ""))).join("")}</select></div>
          <div><label for="pd-${h}-va">Load (VA)</label><input id="pd-${h}-va" data-h="${h}" data-f="va" type="number" min="0" inputmode="numeric" placeholder="you enter it"></div>
        </div>
      </div>`;
  root.innerHTML = `
  <div class="pd">
    <div class="pd-main">
      <section class="pd-setup" aria-labelledby="pd-setup-h">
        <h2 class="pd-h" id="pd-setup-h">1. Panel setup</h2>
        <div class="pd-g3">
          <div><label for="pd-name">Panel name</label><input id="pd-name" data-k="name" maxlength="60" placeholder="Main panel" autocomplete="off"></div>
          <div><label for="pd-location">Location</label><input id="pd-location" data-k="location" maxlength="60" placeholder="Garage, north wall" autocomplete="off"></div>
          <div><label for="pd-fedFrom">Fed from</label><input id="pd-fedFrom" data-k="fedFrom" maxlength="60" placeholder="Utility meter" autocomplete="off"></div>
          <div><label for="pd-mainType">Main</label><select id="pd-mainType" data-k="mainType">${opt("breaker", "Main breaker")}${opt("mlo", "Main lugs only (MLO)")}</select></div>
          <div><label for="pd-mainAmps">Main breaker (A)</label><input id="pd-mainAmps" data-k="mainAmps" type="number" min="0" max="9999" inputmode="numeric"></div>
          <div><label for="pd-busAmps">Bus rating (A)</label><input id="pd-busAmps" data-k="busAmps" type="number" min="0" max="9999" inputmode="numeric"></div>
          <div class="pd-wide3"><label for="pd-system">System</label><select id="pd-system">${C.SYS_KEYS.map(k => opt(k, C.SYSTEMS[k].label + (C.SYSTEMS[k].three ? " (phases A, B, C)" : " (legs L1, L2)"))).join("")}</select></div>
        </div>
        <fieldset class="pd-spaces"><legend>Spaces</legend>
          <div class="pd-chips">${C.QUICK_SPACES.map(n => `<button type="button" class="pd-chip" data-spaces="${n}" aria-pressed="false">${n}</button>`).join("")}
            <span class="pd-spn"><label for="pd-spn" class="sr">Number of spaces, 12 to 84, even numbers</label><input id="pd-spn" type="number" min="12" max="84" step="2" inputmode="numeric"></span></div>
        </fieldset>
        <div class="pd-msg" id="pd-setup-msg" role="status" aria-live="polite"></div>
      </section>
      <section class="pd-panelsec" aria-labelledby="pd-panel-h">
        <h2 class="pd-h" id="pd-panel-h">2. Circuits</h2>
        <p class="small muted pd-help">Laid out like the real panel: odd numbers down the left, even down the right, each row on one bus ${"position"}. Select a space to add or edit its breaker.</p>
        <div class="pd-panel" id="pd-panel" role="group" aria-label="Panel layout"></div>
      </section>
    </div>
    <div class="pd-side">
      <section class="pd-card" aria-labelledby="pd-tot-h">
        <h2 class="pd-h" id="pd-tot-h">3. Load per leg</h2>
        <table class="pd-tot"><thead><tr><th scope="col" id="pd-tot-leg">Leg</th><th scope="col">Load (VA)</th><th scope="col">Approx. amps</th><th scope="col"><span class="sr">Share of the highest</span></th></tr></thead><tbody id="pd-tot-body"></tbody></table>
        <p class="pd-totline" id="pd-totline"></p>
        <p class="small muted" id="pd-formula"></p>
        <p class="small pd-note">Totals of the loads you entered — not a code load calculation. For service, feeder or panel sizing, a licensed electrician does an NEC Article 220 load calculation.</p>
        <p class="small pd-safety"><strong>Labelling tool only.</strong> Turn power off and follow local code; have a licensed electrician do electrical work.</p>
      </section>
      <section class="pd-card" aria-labelledby="pd-out-h">
        <h2 class="pd-h" id="pd-out-h">4. Print and export</h2>
        <fieldset class="pd-row"><legend>Paper for the schedule and labels</legend>
          <label class="pd-radio"><input type="radio" name="pd-paper" value="letter"> US Letter</label>
          <label class="pd-radio"><input type="radio" name="pd-paper" value="a4"> A4</label>
        </fieldset>
        <div class="pd-btns"><button type="button" class="btn" data-a="schedule">Panel schedule PDF</button><button type="button" class="btn ghost" data-a="labels">Breaker labels PDF</button></div>
        <div class="pd-dir">
          <label for="pd-dsize">Door directory size</label>
          <select id="pd-dsize">${opt("letter", "US Letter, 8.5 × 11 in")}${opt("half", "Half letter, 5.5 × 8.5 in")}${opt("custom", "Custom size")}</select>
          <div class="pd-custom" id="pd-custom">
            <div><label for="pd-dw">Width</label><input id="pd-dw" type="number" min="1" step="0.1" inputmode="decimal"></div>
            <div><label for="pd-dh">Height</label><input id="pd-dh" type="number" min="1" step="0.1" inputmode="decimal"></div>
            <div><label for="pd-dunit">Units</label><select id="pd-dunit">${opt("in", "inches")}${opt("mm", "mm")}</select></div>
          </div>
          <button type="button" class="btn ghost" data-a="directory">Door directory PDF</button>
        </div>
        <div class="pd-btns pd-files">
          <button type="button" class="btn ghost" data-a="xlsx">Excel (.xlsx)</button>
          <button type="button" class="btn ghost" data-a="csv">CSV</button>
          <input type="file" id="pd-csvin" class="sr" accept=".csv,text/csv"><label for="pd-csvin" class="btn ghost pd-filebtn">Import CSV</label>
        </div>
        <div class="pd-msg" id="pd-out-msg" role="status" aria-live="polite"></div>
      </section>
      <section class="pd-card" aria-labelledby="pd-share-h">
        <h2 class="pd-h" id="pd-share-h">5. Share link and QR code</h2>
        <p class="small muted">The whole panel is packed into the link itself, so nothing is uploaded. Anyone with the link sees a copy.</p>
        <label for="pd-link">Share link</label>
        <div class="pd-linkrow"><input id="pd-link" readonly><button type="button" class="btn ghost sm" data-a="copy">Copy</button></div>
        <div class="pd-qrrow"><div class="pd-qr" id="pd-qr"></div><div><p class="small" id="pd-qrmsg" aria-live="polite"></p><button type="button" class="btn ghost sm" data-a="qrpng">QR code PNG</button></div></div>
      </section>
      <section class="pd-card" aria-labelledby="pd-saved-h">
        <h2 class="pd-h" id="pd-saved-h">Your panels</h2>
        <p class="small muted">Saved automatically in this browser only. Clearing site data deletes them, so keep a backup.</p>
        <ul class="pd-saved" id="pd-saved"></ul>
        <div class="pd-btns"><button type="button" class="btn ghost sm" data-a="new">New blank panel</button><button type="button" class="btn ghost sm" data-a="example">Add an example</button></div>
        <div class="pd-btns"><button type="button" class="btn ghost sm" data-a="backup">Backup all (JSON)</button><input type="file" id="pd-jsonin" class="sr" accept=".json,application/json"><label for="pd-jsonin" class="btn ghost sm pd-filebtn">Restore backup</label></div>
        <div class="pd-msg" id="pd-saved-msg" role="status" aria-live="polite"></div>
      </section>
    </div>
  </div>
  <datalist id="pd-amplist">${[15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225].map(a => `<option value="${a}"></option>`).join("")}</datalist>
  <dialog class="pd-dlg" id="pd-dlg" aria-labelledby="pd-dlg-h">
    <form method="dialog">
      <div class="pd-dlghead"><h2 id="pd-dlg-h">Space</h2><button type="submit" value="close" class="pd-x" aria-label="Close editor">×</button></div>
      <label for="pd-type">Breaker in this space</label>
      <select id="pd-type"></select>
      <p class="pd-err" id="pd-type-err" role="alert"></p>
      <p class="small muted" id="pd-type-hint"></p>
      ${circFields("a")}
      ${circFields("b")}
      <div class="pd-dlgfoot"><button type="button" class="btn ghost sm" data-a="prev">← Previous</button><button type="button" class="btn ghost sm" data-a="next">Next →</button><button type="submit" value="done" class="btn sm">Done</button></div>
    </form>
  </dialog>`;
  const dlg = $("#pd-dlg");

  /* --------------------------------------------------------------- store */
  function loadStore() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && typeof s === "object" && s.list && typeof s.list === "object") store = { cur: s.cur, list: s.list };
    } catch (e) { /* private mode or corrupt: start fresh */ }
  }
  let saveOk = true;
  function saveStore() { try { localStorage.setItem(KEY, JSON.stringify(store)); saveOk = true; } catch (e) { saveOk = false; } }
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function addEntry(panel, ex) {
    const id = newId();
    store.list[id] = { panel, updated: Date.now() };
    if (ex) store.list[id].ex = ex;
    saveStore();
    return id;
  }
  function open(id) {
    const e = store.list[id];
    if (!e) return;
    state.id = id; state.panel = C.normalize(e.panel).panel; store.cur = id;
    e.panel = state.panel;
    saveStore();
    renderAll();
  }
  let saveT = null;
  function changed() {
    const e = store.list[state.id];
    if (e) { e.panel = state.panel; e.updated = Date.now(); delete e.ex; }
    clearTimeout(saveT); saveT = setTimeout(saveStore, 200);
    renderGrid(); renderTotals(); renderSaved(); queueShare();
  }
  window.addEventListener("pagehide", () => { clearTimeout(saveT); saveStore(); });
  const clean = () => C.normalize(state.panel).panel;
  const msg = (el, html, kind) => { const n = typeof el === "string" ? $(el) : el; n.innerHTML = html ? `<p class="${kind ? "pd-" + kind : ""}">${html}</p>` : ""; };

  /* -------------------------------------------------------------- render */
  function renderSetup() {
    const p = state.panel;
    for (const k of ["name", "location", "fedFrom", "mainAmps", "busAmps"]) $("#pd-" + k).value = p[k];
    $("#pd-mainType").value = p.mainType;
    $("#pd-mainAmps").disabled = p.mainType === "mlo";
    $("#pd-system").value = p.system;
    $("#pd-spn").value = p.spaces;
    $$(".pd-chip").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.spaces === p.spaces)));
    $("#pd-tot-leg").textContent = C.SYSTEMS[p.system].three ? "Phase" : "Leg";
    $("#pd-tot-h").textContent = "3. Load per " + (C.SYSTEMS[p.system].three ? "phase" : "leg");
  }
  const metaText = (c, poles) => [C.bkrText(c.amps, poles), C.PROT_SHORT[c.prot], c.va !== "" ? C.fmtInt(c.va) + " VA" : ""].filter(Boolean).join(" · ");
  const sayC = (c, poles) => [c.desc || c.room || "no description", c.amps !== "" ? c.amps + " amp" : "", poles > 1 ? poles + "-pole" : "", c.prot !== "std" ? C.PROT[c.prot] : "", c.va !== "" ? c.va + " VA" : ""].filter(Boolean).join(", ");
  function cellHtml(cell, row, side) {
    const p = state.panel, b = cell.b, sp = cell.sp;
    const span = b ? cell.span : 1;
    const legs = b ? C.spacesOf(b).map(s => C.legOf(p.system, s)) : [C.legOf(p.system, sp)];
    const sel = editSp != null && (b ? C.spacesOf(b).includes(editSp) : editSp === sp);
    const cls = `pd-cell pd-${side} ${b ? "is-" + b.type : "is-empty"}${sel ? " is-sel" : ""}`;
    const style = `grid-row:${row} / span ${span}`;
    if (!b) return `<button type="button" class="${cls}" style="${style}" data-sp="${sp}" aria-haspopup="dialog" aria-label="Space ${sp}, ${legs[0]}: empty. Add a breaker."><span class="pd-line"><span class="pd-num">${sp}</span><span class="pd-txt"><span class="pd-desc">Space</span></span></span></button>`;
    const line = (c, num, poles, fallback) => `<span class="pd-line"><span class="pd-num">${esc(num)}</span><span class="pd-txt"><span class="pd-desc">${esc(c.desc || c.room || fallback)}</span><span class="pd-meta">${esc(metaText(c, poles)) || "&nbsp;"}</span></span></span>`;
    if (b.type === "t") {
      return `<button type="button" class="${cls}" style="${style}" data-sp="${sp}" aria-haspopup="dialog" aria-label="Space ${sp}, ${legs[0]}, tandem. ${sp}A: ${esc(sayC(b.a, 1))}. ${sp}B: ${esc(sayC(b.b, 1))}. Edit.">${line(b.a, sp + "A", 1, "No description")}${line(b.b, sp + "B", 1, "No description")}</button>`;
    }
    const poles = C.polesOf(b.type), label = C.spacesOf(b).join("/");
    return `<button type="button" class="${cls}" style="${style}" data-sp="${sp}" aria-haspopup="dialog" aria-label="${poles > 1 ? "Spaces " + C.spacesOf(b).join(" and ") : "Space " + sp}, ${legs.join(" and ")}${b.type === "spare" ? ", spare" : ""}: ${esc(sayC(b.a, poles))}. Edit.">${line(b.a, label, poles, b.type === "spare" ? "Spare" : "No description")}</button>`;
  }
  function renderGrid() {
    const p = state.panel, rows = C.grid(p);
    let html = "";
    for (const r of rows) {
      if (r.left.pole === 0) html += cellHtml(r.left, r.row, "l");
      html += `<span class="pd-leg" style="grid-row:${r.row}" aria-hidden="true">${r.leg}</span>`;
      if (r.right.pole === 0) html += cellHtml(r.right, r.row, "r");
    }
    const box = $("#pd-panel");
    const focused = document.activeElement && box.contains(document.activeElement) ? document.activeElement.dataset.sp : null;
    box.innerHTML = html;
    box.classList.toggle("is-3p", C.SYSTEMS[p.system].three);
    if (focused) { const f = box.querySelector(`[data-sp="${focused}"]`); if (f) f.focus(); }
  }
  function renderTotals() {
    const t = C.totals(state.panel), max = Math.max(1, ...t.legs.map(l => l.va));
    $("#pd-tot-body").innerHTML = t.legs.map(l => `<tr><th scope="row">${l.leg}</th><td>${C.fmtInt(l.va)}</td><td>${C.fmt1(l.amps)} A</td><td class="pd-barc"><span class="pd-bar" style="width:${((l.va / max) * 100).toFixed(1)}%"></span></td></tr>`).join("");
    $("#pd-totline").innerHTML = `Total <strong>${C.fmtInt(t.total)} VA</strong> · Imbalance <strong>${C.fmt1(t.imbalance)}%</strong>`;
    $("#pd-formula").textContent = `${t.formula}. ${t.imbFormula}, as a %. Multi-pole loads are split evenly across their poles.`;
  }
  function renderSaved() {
    const ids = Object.keys(store.list).sort((a, b) => (store.list[b].updated || 0) - (store.list[a].updated || 0));
    $("#pd-saved").innerHTML = ids.map(id => {
      const p = store.list[id].panel || {}, name = (p.name || "").trim() || "Untitled panel", cur = id === state.id;
      let n = 0; try { n = C.circuits(C.normalize(p).panel).length; } catch (e) { /* ignore */ }
      return `<li class="${cur ? "is-cur" : ""}"><span class="pd-sname"><strong>${esc(name)}</strong><span class="small muted">${esc(p.spaces)} spaces · ${n} circuit${n === 1 ? "" : "s"}${cur ? " · open now" : ""}</span></span><span class="pd-sbtns"><button type="button" class="btn ghost sm" data-open="${id}"${cur ? " disabled" : ""} aria-label="Open ${esc(name)}">Open</button><button type="button" class="btn ghost sm" data-dup="${id}" aria-label="Duplicate ${esc(name)}">Duplicate</button><button type="button" class="btn ghost sm" data-del="${id}" aria-label="Delete ${esc(name)}">Delete</button></span></li>`;
    }).join("");
    if (!saveOk) msg("#pd-saved-msg", "This browser isn't letting PanelDex save (private mode or storage full). Download a CSV or backup so you don't lose your work.", "warn");
  }
  function renderOutPrefs() {
    $$('input[name="pd-paper"]').forEach(r => { r.checked = r.value === prefs.paper; });
    $("#pd-dsize").value = prefs.dsize;
    $("#pd-dw").value = prefs.w; $("#pd-dh").value = prefs.h; $("#pd-dunit").value = prefs.unit;
    $("#pd-custom").hidden = prefs.dsize !== "custom";
  }
  function renderAll() { renderSetup(); renderGrid(); renderTotals(); renderSaved(); queueShare(); }

  /* --------------------------------------------------------------- setup */
  $(".pd-setup").addEventListener("input", e => {
    const el = e.target, k = el.dataset.k;
    if (!k) return;
    if (k === "mainAmps" || k === "busAmps") state.panel[k] = el.value === "" ? "" : Math.max(0, Math.round(+el.value));
    else state.panel[k] = el.value;
    if (k === "mainType") $("#pd-mainAmps").disabled = el.value === "mlo";
    changed();
  });
  $("#pd-system").addEventListener("change", e => {
    const err = C.setSystem(state.panel, e.target.value);
    if (err) { e.target.value = state.panel.system; msg("#pd-setup-msg", esc(err), "err"); return; }
    msg("#pd-setup-msg", "");
    renderSetup(); changed();
  });
  function setSpaces(n) {
    const err = C.setSpaces(state.panel, n);
    if (err) msg("#pd-setup-msg", esc(err), "err"); else msg("#pd-setup-msg", "");
    renderSetup(); changed();
  }
  $$(".pd-chip").forEach(b => b.addEventListener("click", () => setSpaces(+b.dataset.spaces)));
  $("#pd-spn").addEventListener("change", e => setSpaces(e.target.value));

  /* -------------------------------------------------------------- editor */
  const covering = sp => state.panel.breakers.find(b => C.spacesOf(b).includes(sp));
  function fillEditor() {
    const p = state.panel, sp = editSp, b = C.breakerAt(p, sp), type = b ? b.type : "space";
    const legs = b ? C.spacesOf(b).map(s => C.legOf(p.system, s)) : [C.legOf(p.system, sp)];
    $("#pd-dlg-h").textContent = `Space ${b ? C.spacesOf(b).join(", ") : sp} · ${legs.join(" + ")} · ${sp % 2 ? "left" : "right"} side`;
    const sel = $("#pd-type");
    sel.innerHTML = [
      opt("space", "Empty space (no breaker)", type), opt("1", "Single-pole", type),
      opt("2", `2-pole (spaces ${sp} and ${sp + 2})`, type), opt("3", `3-pole (spaces ${sp}, ${sp + 2} and ${sp + 4})${C.SYSTEMS[p.system].three ? "" : ", three-phase only"}`, type),
      opt("t", `Tandem / twin (${sp}A and ${sp}B in one space)`, type), opt("spare", "Spare (breaker, nothing connected)", type),
    ].join("");
    $("#pd-type-err").textContent = "";
    $("#pd-type-hint").textContent = type === "space" ? "Typing a description below adds a single-pole breaker here." : type === "t" ? "Only use tandems where the panel's label allows them." : "";
    for (const h of ["a", "b"]) {
      const box = $(`.pd-circ[data-half="${h}"]`, dlg), c = b && b[h] ? b[h] : C.normCircuit({});
      box.hidden = h === "b" && type !== "t";
      $(`#pd-${h}-h`).textContent = type === "t" ? `Circuit ${sp}${h.toUpperCase()}` : b ? `Circuit ${C.circuitLabel(b)}` : `Circuit ${sp}`;
      for (const f of ["desc", "room", "amps", "wire", "prot", "va"]) $(`#pd-${h}-${f}`).value = c[f];
    }
    $('[data-a="prev"]', dlg).disabled = !stepTarget(-1);
    $('[data-a="next"]', dlg).disabled = !stepTarget(1);
  }
  function openEditor(sp) {
    const o = covering(sp);
    editSp = o ? o.sp : sp;
    fillEditor();
    renderGrid();
    if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); } }
    $("#pd-type").focus();
  }
  function stepTarget(dir) {
    const p = state.panel;
    let sp = editSp;
    do { sp += dir; } while (sp >= 1 && sp <= p.spaces && covering(sp) && covering(sp).sp !== sp);
    return sp >= 1 && sp <= p.spaces ? sp : null;
  }
  $("#pd-panel").addEventListener("click", e => { const b = e.target.closest("[data-sp]"); if (b) openEditor(+b.dataset.sp); });
  $("#pd-type").addEventListener("change", e => {
    const err = C.setType(state.panel, editSp, e.target.value);
    if (err) {
      const b = C.breakerAt(state.panel, editSp);
      e.target.value = b ? b.type : "space";
      $("#pd-type-err").textContent = err;
      return;
    }
    const b = C.breakerAt(state.panel, editSp);
    if (b && b.type === "spare" && !b.a.desc) b.a.desc = "";
    fillEditor(); changed();
  });
  dlg.addEventListener("input", e => {
    const el = e.target, h = el.dataset.h, f = el.dataset.f;
    if (!h || !f) return;
    let b = C.breakerAt(state.panel, editSp);
    if (!b) {
      if (C.setType(state.panel, editSp, "1")) return;
      b = C.breakerAt(state.panel, editSp);
      $("#pd-type").value = "1"; $("#pd-type-hint").textContent = "";
    }
    const c = b[h];
    if (!c) return;
    c[f] = f === "amps" || f === "va" ? (el.value === "" ? "" : Math.max(0, Math.round(+el.value))) : el.value;
    changed();
  });
  dlg.addEventListener("click", e => {
    const a = e.target.closest("[data-a]");
    if (!a || (a.dataset.a !== "prev" && a.dataset.a !== "next")) return;
    const t = stepTarget(a.dataset.a === "next" ? 1 : -1);
    if (!t) return;
    editSp = t; fillEditor(); renderGrid();
    (C.breakerAt(state.panel, t) ? $("#pd-a-desc") : $("#pd-type")).focus();
  });
  dlg.addEventListener("close", () => {
    const sp = editSp;
    editSp = null;
    renderGrid();
    const btn = $(`#pd-panel [data-sp="${sp}"]`);
    if (btn) btn.focus();
  });

  /* ------------------------------------------------------------- exports */
  const scripts = {};
  function loadScript(src, ready) {
    if (ready()) return Promise.resolve(ready());
    if (!scripts[src]) scripts[src] = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = () => (ready() ? res(ready()) : rej(new Error("load")));
      s.onerror = () => { delete scripts[src]; rej(new Error("Couldn't load a library. Check your connection and try again.")); };
      document.head.appendChild(s);
    });
    return scripts[src];
  }
  const jsPDF = () => loadScript("/vendor/jspdf-4.2.1.umd.min.js", () => window.jspdf && window.jspdf.jsPDF);
  const qrLib = () => loadScript("/vendor/qrcode-generator-1.4.4.js", () => window.qrcode);
  function saveBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  const slug = () => (state.panel.name || "panel").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "panel";
  async function exportAs(kind, btn) {
    const p = clean();
    btn.disabled = true;
    try {
      if (kind === "csv") { saveBlob(new Blob(["﻿" + C.toCSV(p)], { type: "text/csv;charset=utf-8" }), `${slug()}-schedule.csv`); msg("#pd-out-msg", "CSV saved. It opens in any spreadsheet app, and <em>Import CSV</em> loads it back.", "ok"); }
      else if (kind === "xlsx") { saveBlob(new Blob([C.xlsxBytes(p)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${slug()}-schedule.xlsx`); msg("#pd-out-msg", "Excel file saved. The per-leg totals are live SUMIF formulas, so they update when you change a load.", "ok"); }
      else {
        const J = await jsPDF();
        let doc, name;
        if (kind === "schedule") { doc = C.schedulePdf(J, p, { paper: prefs.paper }); name = `${slug()}-schedule.pdf`; }
        else if (kind === "labels") { doc = C.labelsPdf(J, p, { paper: prefs.paper }); name = `${slug()}-breaker-labels.pdf`; }
        else {
          const sz = C.directorySize({ size: prefs.dsize, w: prefs.w, h: prefs.h, unit: prefs.unit });
          if (sz.error) { msg("#pd-out-msg", esc(sz.error), "err"); return; }
          doc = C.directoryPdf(J, p, { size: prefs.dsize, w: prefs.w, h: prefs.h, unit: prefs.unit }); name = `${slug()}-door-directory.pdf`;
        }
        saveBlob(doc.output("blob"), name);
        msg("#pd-out-msg", `Saved <b>${esc(name)}</b>. Print at 100% / Actual size${kind === "directory" ? " and trim on the dashed border" : kind === "labels" ? " and cut on the dashed lines" : ""}.`, "ok");
      }
      track("export", { kind, spaces: p.spaces, system: p.system });
    } catch (e) {
      msg("#pd-out-msg", esc(e.message || "Something went wrong making that file."), "err");
    } finally { btn.disabled = false; }
  }
  function readFile(input, cb) {
    const f = input.files && input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { input.value = ""; cb(String(r.result || ""), f.name); };
    r.readAsText(f);
  }
  $("#pd-csvin").addEventListener("change", e => readFile(e.target, text => {
    const r = C.fromCSV(text);
    if (!r.panel) { msg("#pd-out-msg", esc(r.error), "err"); return; }
    open(addEntry(r.panel));
    const n = C.circuits(r.panel).length;
    msg("#pd-out-msg", `Imported <b>${esc(r.panel.name || "panel")}</b> with ${n} circuit${n === 1 ? "" : "s"} as a new saved panel.${r.warnings.length ? " Skipped: " + esc(r.warnings.join(" ")) : ""}`, r.warnings.length ? "warn" : "ok");
    track("csv_import");
  }));
  $("#pd-jsonin").addEventListener("change", e => readFile(e.target, text => {
    let list = [];
    try { const j = JSON.parse(text); list = Array.isArray(j) ? j : Array.isArray(j.panels) ? j.panels : []; } catch (err) { list = []; }
    const ok = list.map(p => C.normalize(p).panel).filter(p => p);
    if (!ok.length) { msg("#pd-saved-msg", "That file isn't a PanelDex backup.", "err"); return; }
    ok.forEach(p => addEntry(p));
    store.cur = state.id; saveStore(); renderSaved();
    msg("#pd-saved-msg", `Restored ${ok.length} panel${ok.length === 1 ? "" : "s"} from the backup.`, "ok");
  }));

  /* --------------------------------------------------------- share + QR */
  let shareT = null, lastUrl = "", qrSize = 0;
  const queueShare = () => { clearTimeout(shareT); shareT = setTimeout(updateShare, 250); };
  async function updateShare() {
    const url = C.shareUrl(await C.encodeShare(clean()));
    lastUrl = url;
    $("#pd-link").value = url;
    const box = $("#pd-qr"), info = $("#pd-qrmsg"), btn = $('[data-a="qrpng"]');
    let qr = null;
    try {
      const make = await qrLib();
      for (const lvl of ["M", "L"]) { try { qr = make(0, lvl); qr.addData(url, "Byte"); qr.make(); break; } catch (e) { qr = null; } }
    } catch (e) { info.textContent = "The QR code library didn't load. The link still works."; return; }
    if (url !== lastUrl) return;
    if (!qr) {
      box.innerHTML = ""; btn.disabled = true; qrSize = 0;
      info.textContent = `This link is ${url.length.toLocaleString("en-US")} characters, too long to fit in a QR code. The link itself still works: copy it and send it, or shorten long descriptions to make the link shorter.`;
      return;
    }
    const n = qr.getModuleCount(), q = 4;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
    box.innerHTML = `<svg viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" role="img" aria-label="QR code that opens this panel's share link" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
    btn.disabled = false; qrSize = n;
    const mm = Math.max(25, Math.ceil(((n + 2 * q) * 0.5) / 5) * 5);
    info.textContent = `Link: ${url.length.toLocaleString("en-US")} characters. Print the QR code at least ${mm} mm (${(mm / 25.4).toFixed(1)} in) wide so a phone can read it.`;
    updateShare.qr = qr;
  }
  function qrPng() {
    const qr = updateShare.qr;
    if (!qr || !qrSize) return;
    const n = qrSize, q = 4, s = 10, w = (n + 2 * q) * s, cap = 60;
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = w + cap;
    const g = cv.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = "#000";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect((c + q) * s, (r + q) * s, s, s);
    g.textAlign = "center"; g.font = `bold ${Math.round(w / 18)}px system-ui, sans-serif`;
    g.fillText((state.panel.name || "Panel") + " schedule", w / 2, w + cap * 0.35, w - 20);
    g.font = `${Math.round(w / 26)}px system-ui, sans-serif`;
    g.fillText("Scan to see every circuit", w / 2, w + cap * 0.8, w - 20);
    cv.toBlob(b => { if (b) saveBlob(b, `${slug()}-qr.png`); }, "image/png");
    track("qr_png");
  }

  /* ------------------------------------------------------------- buttons */
  root.addEventListener("click", async e => {
    const t = e.target.closest("button");
    if (!t || dlg.contains(t)) return;
    const a = t.dataset.a;
    if (a === "schedule" || a === "labels" || a === "directory" || a === "xlsx" || a === "csv") return exportAs(a, t);
    if (a === "copy") {
      const url = $("#pd-link").value;
      try { await navigator.clipboard.writeText(url); t.textContent = "Copied"; } catch (err) { $("#pd-link").select(); t.textContent = "Press Ctrl+C"; }
      setTimeout(() => { t.textContent = "Copy"; }, 1600);
      track("share_copy");
      return;
    }
    if (a === "qrpng") return qrPng();
    if (a === "new") { const p = C.blankPanel(); p.name = "New panel"; open(addEntry(p)); msg("#pd-saved-msg", "Started a new blank panel. Your other panels are still in the list.", "ok"); $("#pd-name").focus(); return; }
    if (a === "example") { open(addEntry(C.example(preset === "p3" ? "p3" : "home"))); msg("#pd-saved-msg", "Added an example panel you can edit or delete.", "ok"); return; }
    if (a === "backup") {
      const panels = Object.keys(store.list).map(id => C.normalize(store.list[id].panel).panel);
      const d = new Date().toISOString().slice(0, 10);
      saveBlob(new Blob([JSON.stringify({ app: "PanelDex", version: 1, exported: d, panels }, null, 1)], { type: "application/json" }), `paneldex-backup-${d}.json`);
      msg("#pd-saved-msg", `Backed up ${panels.length} panel${panels.length === 1 ? "" : "s"}.`, "ok");
      return;
    }
    if (t.dataset.open) { open(t.dataset.open); msg("#pd-saved-msg", ""); return; }
    if (t.dataset.dup) {
      const src = C.normalize(store.list[t.dataset.dup].panel).panel;
      src.name = (src.name || "Panel").slice(0, 52) + " (copy)";
      open(addEntry(src));
      msg("#pd-saved-msg", "Duplicated. You're now editing the copy.", "ok");
      return;
    }
    if (t.dataset.del) {
      const id = t.dataset.del, name = (store.list[id].panel.name || "Untitled panel");
      if (!window.confirm(`Delete “${name}”? This can't be undone.`)) return;
      delete store.list[id];
      if (id === state.id) {
        const rest = Object.keys(store.list).sort((x, y) => (store.list[y].updated || 0) - (store.list[x].updated || 0));
        open(rest[0] || addEntry(C.blankPanel()));
      } else { saveStore(); renderSaved(); }
      msg("#pd-saved-msg", `Deleted “${esc(name)}”.`, "ok");
    }
  });
  $$('input[name="pd-paper"]').forEach(r => r.addEventListener("change", () => { prefs.paper = r.value; savePrefs(); }));
  $("#pd-dsize").addEventListener("change", e => { prefs.dsize = e.target.value; savePrefs(); renderOutPrefs(); });
  for (const [id, k] of [["#pd-dw", "w"], ["#pd-dh", "h"], ["#pd-dunit", "unit"]]) $(id).addEventListener("input", e => { prefs[k] = e.target.value; savePrefs(); });

  /* --------------------------------------------------------------- start */
  async function start() {
    loadStore();
    renderOutPrefs();
    const exKey = preset === "p3" ? "p3" : preset === "p42" ? "p42" : "home";
    const m = location.hash.match(/[#&]p=([\w-]+)/);
    if (m) {
      const r = await C.decodeShare(m[1]);
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
      if (r && r.panel) {
        const json = JSON.stringify(r.panel);
        const same = Object.keys(store.list).find(id => { try { return JSON.stringify(C.normalize(store.list[id].panel).panel) === json; } catch (e) { return false; } });
        open(same || addEntry(r.panel));
        msg("#pd-setup-msg", "Opened the panel from the share link. It's saved in this browser as your own copy, so you can edit it.", "ok");
        track("share_open");
        return;
      }
      msg("#pd-setup-msg", "That share link couldn't be read. It may have been cut off when it was copied.", "err");
    }
    const cur = store.cur && store.list[store.cur];
    if (cur) {
      if (cur.ex && cur.ex !== exKey) { cur.panel = C.example(exKey); cur.ex = exKey; }
      open(store.cur);
      if (!cur.ex && exKey !== "home") {
        msg("#pd-setup-msg", `Showing your saved panel. <button type="button" class="btn ghost sm" id="pd-loadex">Open the ${exKey === "p3" ? "120/208 V three-phase" : "42-space"} example</button>`);
        const b = $("#pd-loadex");
        if (b) b.addEventListener("click", () => { open(addEntry(C.example(exKey), exKey)); msg("#pd-setup-msg", ""); });
      }
      return;
    }
    open(addEntry(C.example(exKey), exKey));
  }
  start();
})();
