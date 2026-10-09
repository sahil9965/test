// Roomproof tool UI. Mounts into #rp-tool; data-preset picks the starting template on landing pages.
// Photos are processed and stored on this device only (IndexedDB draft + .roomproof project file).
(() => {
  "use strict";
  const mount = document.getElementById("rp-tool");
  if (!mount || !window.RPCore || !window.RPPhoto) return;
  const C = window.RPCore, PH = window.RPPhoto;
  const preset = C.TEMPLATES[mount.dataset.preset] ? mount.dataset.preset : "";
  const $ = (s, el = mount) => el.querySelector(s);
  const $$ = (s, el = mount) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const track = (name, data) => { try { window.va && window.va("event", data ? { name, data } : { name }); } catch {} };
  const plural = (n, w, p) => `${n} ${n === 1 ? w : p || w + "s"}`;
  const fmtSize = b => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
  const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  const defaultPaper = () => (/-(US|CA|MX|PH|CL|CO|VE|GT|CR|PA|DO|PR|SV)$/i.test(navigator.language || "") ? "letter" : "a4");

  // ---------- IndexedDB (draft autosave; the .roomproof file is the real save) ----------
  let idbOk = typeof indexedDB !== "undefined";
  const DB = (() => {
    let dbp;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const q = indexedDB.open("roomproof", 1);
      q.onupgradeneeded = () => { q.result.createObjectStore("kv"); q.result.createObjectStore("photos"); };
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
      q.onblocked = () => rej(new Error("blocked"));
    }));
    const run = async (store, mode, fn) => {
      const db = await open();
      return new Promise((res, rej) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => res(req && req.result);
        tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
      });
    };
    return {
      get: k => run("kv", "readonly", s => s.get(k)),
      set: (k, v) => run("kv", "readwrite", s => s.put(v, k)),
      putPhoto: (id, v) => run("photos", "readwrite", s => s.put(v, id)),
      getPhoto: id => run("photos", "readonly", s => s.get(id)),
      delPhoto: id => run("photos", "readwrite", s => s.delete(id)),
      keys: () => run("photos", "readonly", s => s.getAllKeys()),
      clearPhotos: () => run("photos", "readwrite", s => s.clear()),
    };
  })();
  const safe = p => (idbOk ? Promise.resolve(p()).catch(() => {}) : Promise.resolve());

  // ---------- state ----------
  let R = null;
  const blobs = new Map();   // photo id -> JPEG Blob (max 1600 px)
  const thumbs = new Map();  // photo id -> object URL of a small thumbnail
  const openRooms = new Set();
  let target = null, saveTimer = 0, persisted = false, lastPdf = null;

  const T = () => C.tpl(R);
  const scale = () => C.SCALES[C.scaleOf(R)];
  const roomById = id => R.rooms.find(r => r.id === id);
  const itemById = (room, id) => room && room.items.find(i => i.id === id);
  const photoCount = () => Object.keys(R.photos).length;
  const hasWork = r => !!r && (Object.keys(r.photos || {}).length > 0 || (r.rooms || []).some(room => room.items.some(it => it.rating || (it.notes || "").trim())) || !!(r.property || "").trim());

  function customTemplates() { try { return JSON.parse(localStorage.getItem("rp_tpls") || "[]"); } catch { return []; } }

  // ---------- skeleton ----------
  const ICON_CAM = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9 4h6l1.5 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5L9 4zm3 4.5A4.5 4.5 0 1 0 12 17.5 4.5 4.5 0 0 0 12 8.5zm0 2A2.5 2.5 0 1 1 12 15.5 2.5 2.5 0 0 1 12 10.5z"/></svg>';
  const ICON_ADD = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2V5H6v10.6l3.3-3.3 2.7 2.7 1.3-1.3 1.4 1.4-2.7 2.7-2.7-2.7L6 18.4V19h7v2H6a2 2 0 0 1-2-2V5zm10.5 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM19 14h2v3h3v2h-3v3h-2v-3h-3v-2h3v-3z"/></svg>';
  mount.innerHTML = `
  <div class="rp">
    <div class="rp-bar">
      <div class="rp-tplpick"><label for="rp-template">Template</label><select id="rp-template"></select></div>
      <div class="rp-bar-btns">
        <button type="button" class="btn ghost sm" data-a="new">New report</button>
        <button type="button" class="btn ghost sm" data-a="open">Open project</button>
        <button type="button" class="btn ghost sm" data-a="save">Save project</button>
      </div>
    </div>
    <div class="rp-status" role="status" aria-live="polite"></div>
    <div class="rp-cols">
      <div class="rp-main">
        <section class="rp-sec" aria-labelledby="rp-h-details">
          <h2 class="rp-h" id="rp-h-details"><span class="rp-n">1</span>Report details</h2>
          <div class="rp-details"></div>
        </section>
        <section class="rp-sec" aria-labelledby="rp-h-rooms">
          <h2 class="rp-h" id="rp-h-rooms"><span class="rp-n">2</span><span class="rp-rooms-title">Rooms, items and photos</span></h2>
          <p class="rp-hint">Open a room, rate each item, add photos and notes. Items you leave blank are left out of the PDF.</p>
          <div class="rp-rooms"></div>
          <div class="rp-addroom"><button type="button" class="btn ghost sm" data-a="addRoom">+ Add room</button></div>
        </section>
        <section class="rp-sec" aria-labelledby="rp-h-sign">
          <h2 class="rp-h" id="rp-h-sign"><span class="rp-n">3</span>Signatures <span class="rp-opt">optional</span></h2>
          <p class="rp-hint">Sign on screen with a finger or mouse, or leave the line blank to sign the printout.</p>
          <div class="rp-sigs"></div>
        </section>
      </div>
      <aside class="rp-side">
        <section class="rp-sec rp-export" aria-labelledby="rp-h-pdf">
          <h2 class="rp-h" id="rp-h-pdf"><span class="rp-n">4</span>Create the PDF</h2>
          <ul class="rp-stats" aria-label="Report summary"></ul>
          <div class="rp-opts">
            <div class="row">
              <div><label for="rp-paper">Paper</label><select id="rp-paper" data-s="paper"><option value="a4">A4</option><option value="letter">US Letter</option></select></div>
              <div><label for="rp-per">Per page</label><select id="rp-per" data-s="perPage"></select></div>
            </div>
            <label class="rp-check"><input type="checkbox" data-s="stamp"> Print date and time on each photo</label>
            <label class="rp-check"><input type="checkbox" data-s="checklist"> Room-by-room checklist table</label>
            <label class="rp-check"><input type="checkbox" data-s="signPage"> Signature page</label>
            <label class="rp-check"><input type="checkbox" data-s="photoLog"> Photo log with file fingerprints</label>
          </div>
          <button type="button" class="btn rp-make" data-a="pdf">Create PDF report</button>
          <p class="rp-progress" role="status" aria-live="polite"></p>
          <div class="rp-result" hidden>
            <a class="btn rp-dl" href="#" download>Download PDF</a>
            <button type="button" class="btn ghost rp-share" data-a="share" hidden>Share</button>
            <p class="rp-resinfo"></p>
          </div>
          <div class="rp-more">
            <p class="rp-hint"><strong>Keep your work:</strong> <em>Save project</em> downloads a <code>.roomproof</code> file with every photo and note. Open it later, on any device, to keep editing. Drafts also autosave in this browser.</p>
            <button type="button" class="btn ghost sm" data-a="followup">Start a follow-up from a saved project</button>
            <p class="rp-hint">For example, open your move-in file to make a move-out report with the earlier photos side by side.</p>
            <button type="button" class="btn ghost sm" data-a="tplSave">Save rooms as my template</button>
          </div>
        </section>
      </aside>
    </div>
    <input type="file" class="rp-file" id="rp-cam" accept="image/*" capture="environment" tabindex="-1" aria-label="Take a photo">
    <input type="file" class="rp-file" id="rp-lib" accept="image/*" multiple tabindex="-1" aria-label="Choose photos">
    <input type="file" class="rp-file" id="rp-proj" accept=".roomproof,.zip,application/zip,application/octet-stream" tabindex="-1" aria-label="Open a Roomproof project file">
    <input type="file" class="rp-file" id="rp-logo" accept="image/*" tabindex="-1" aria-label="Choose a logo">
    <dialog class="rp-dlg" aria-labelledby="rp-dlg-title">
      <div class="rp-dlg-head"><h3 id="rp-dlg-title">Photo</h3><button type="button" class="rp-x" data-a="dlgClose" aria-label="Close">×</button></div>
      <div class="rp-stage"><div class="rp-stage-in"><img class="rp-stage-img" alt=""><canvas class="rp-ink" aria-hidden="true"></canvas></div></div>
      <div class="rp-tools" role="toolbar" aria-label="Mark up this photo">
        <button type="button" class="btn ghost sm" data-tool="circle" aria-pressed="false">◯ Circle</button>
        <button type="button" class="btn ghost sm" data-tool="arrow" aria-pressed="false">↗ Arrow</button>
        <button type="button" class="btn ghost sm" data-tool="pen" aria-pressed="false">✎ Draw</button>
        <button type="button" class="btn ghost sm" data-a="mkUndo">Undo</button>
        <button type="button" class="btn ghost sm" data-a="mkClear">Clear marks</button>
      </div>
      <label for="rp-cap">Caption</label>
      <input id="rp-cap" class="rp-cap" maxlength="300" placeholder="e.g. 5 cm scratch on oven door">
      <div class="row">
        <div><label for="rp-taken">Date and time taken</label><input id="rp-taken" class="rp-taken" type="datetime-local" step="1"></div>
        <div class="rp-phase-wrap"><label for="rp-phase">Side</label><select id="rp-phase" class="rp-phase-sel"></select></div>
      </div>
      <p class="rp-src"></p>
      <div class="rp-dlg-actions">
        <button type="button" class="btn ghost sm" data-a="rotL">⟲ Rotate left</button>
        <button type="button" class="btn ghost sm" data-a="rotR">⟳ Rotate right</button>
        <button type="button" class="btn ghost sm" data-a="mvPrev">← Move earlier</button>
        <button type="button" class="btn ghost sm" data-a="mvNext">Move later →</button>
        <button type="button" class="btn ghost sm rp-danger" data-a="delPhoto">Delete photo</button>
        <button type="button" class="btn sm" data-a="dlgClose">Done</button>
      </div>
    </dialog>
  </div>`;

  const statusEl = $(".rp-status"), progressEl = $(".rp-progress");
  function status(html, tone = "") {
    statusEl.className = "rp-status" + (html ? " on" : "") + (tone ? " " + tone : "");
    statusEl.innerHTML = html ? `<span>${html}</span><button type="button" class="rp-x sm" data-a="hideStatus" aria-label="Dismiss">×</button>` : "";
  }
  const progress = (txt, tone = "") => { progressEl.textContent = txt; progressEl.className = "rp-progress" + (tone ? " " + tone : ""); };

  // ---------- template picker ----------
  function renderTemplatePicker() {
    const sel = $("#rp-template");
    const custom = customTemplates();
    sel.innerHTML = Object.entries(C.TEMPLATES).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join("") +
      (custom.length ? `<optgroup label="My templates">${custom.map((c, i) => `<option value="custom:${i}">${esc(c.name)}</option>`).join("")}</optgroup>` : "");
    sel.value = R.customTpl != null && custom[R.customTpl] ? `custom:${R.customTpl}` : R.template;
  }

  // ---------- details ----------
  function renderDetails() {
    const t = T();
    $(".rp-details").innerHTML = `
      <label for="rp-title">Report title</label><input id="rp-title" data-r="title" value="${esc(R.title)}" maxlength="120">
      <label for="rp-prop">Property or site address</label><textarea id="rp-prop" data-r="property" rows="2" maxlength="300" placeholder="e.g. Apt 4B, 120 Elm Street, Springfield">${esc(R.property)}</textarea>
      <div class="row">
        <div><label for="rp-date">Report date</label><input id="rp-date" type="date" data-r="date" value="${esc(R.date)}"></div>
        <div><label for="rp-ref">${esc(t.ref)}</label><input id="rp-ref" data-r="ref" value="${esc(R.ref)}" maxlength="80"></div>
      </div>
      <div class="row">
        <div><label for="rp-prep">${esc(t.prepared)}</label><input id="rp-prep" data-r="preparedBy" value="${esc(R.preparedBy)}" maxlength="120" autocomplete="name"></div>
        <div><label for="rp-other">${esc(t.other)}</label><input id="rp-other" data-r="otherParty" value="${esc(R.otherParty)}" maxlength="120"></div>
      </div>
      <label for="rp-notes">General notes</label><textarea id="rp-notes" data-r="notes" rows="2" maxlength="3000" placeholder="e.g. Keys returned: 2 front door, 1 mailbox. Inspection done in daylight.">${esc(R.notes)}</textarea>
      <details class="rp-brand"${R.company || R.logo ? " open" : ""}>
        <summary>Company name and logo (optional)</summary>
        <label for="rp-company">Company or contact details</label><textarea id="rp-company" data-r="company" rows="2" maxlength="400" placeholder="Business name, phone, email, licence number">${esc(R.company)}</textarea>
        <div class="rp-logo-row">
          ${R.logo ? `<img src="${esc(R.logo)}" alt="Your logo" class="rp-logo-img">` : ""}
          <button type="button" class="btn ghost sm" data-a="logo">${R.logo ? "Change logo" : "Add logo"}</button>
          ${R.logo ? `<button type="button" class="btn ghost sm" data-a="logoDel">Remove logo</button>` : ""}
        </div>
      </details>
      ${R.compare ? `<p class="rp-cmp">Comparing with <strong>${esc(R.compare.title || "earlier report")}</strong>${R.compare.date ? ` from ${esc(C.formatDate(R.compare.date))}` : ""}. Earlier photos appear on the <em>${esc(R.labels[0])}</em> side.</p>` : ""}`;
  }

  // ---------- rooms ----------
  function thumbHtml(id, item) {
    const ph = R.photos[id];
    const url = thumbs.get(id) || "";
    const when = C.formatTaken(ph.takenAt, ph.offset);
    return `<button type="button" class="rp-th" data-a="photo" data-id="${id}" title="${esc(ph.caption || "Edit photo")}">
      <img src="${esc(url)}" alt="Photo of ${esc(item.name || "item")}${when ? ", taken " + esc(when) : ""}${ph.caption ? ": " + esc(ph.caption) : ""}" loading="lazy">
      ${R.settings.stamp ? `<span class="rp-th-ts" aria-hidden="true">${esc(C.formatStamp(ph.takenAt).replace(/ \d{4} /, " "))}</span>` : ""}
      ${ph.markup && ph.markup.length ? '<span class="rp-th-mk" aria-hidden="true">✎</span>' : ""}
      ${ph.caption ? '<span class="rp-th-cap" aria-hidden="true">Aa</span>' : ""}
    </button>`;
  }
  function stripHtml(room, it, phase, label) {
    const ids = it.photos.filter(id => R.photos[id] && (!R.pair || (phase === "before" ? R.photos[id].phase === "before" : R.photos[id].phase !== "before")));
    const nm = esc(it.name || "item");
    return `<div class="rp-strip">
      ${label ? `<span class="rp-side-l${phase === "before" ? "" : " after"}">${esc(label)}</span>` : ""}
      ${ids.map(id => thumbHtml(id, it)).join("")}
      ${coarse ? `<button type="button" class="rp-add" data-a="camera" data-phase="${phase}" aria-label="Take a ${label ? esc(label.toLowerCase()) + " " : ""}photo of ${nm}">${ICON_CAM}<span>Camera</span></button>` : ""}
      <button type="button" class="rp-add" data-a="library" data-phase="${phase}" aria-label="Add ${label ? esc(label.toLowerCase()) + " " : ""}photos of ${nm}">${ICON_ADD}<span>${coarse ? "Library" : "Add photos"}</span></button>
    </div>`;
  }
  function itemHtml(room, it) {
    const sc = scale();
    const prevL = C.level(C.scaleOf(R), it.prevRating);
    const nm = it.name || "this item";
    return `<div class="rp-item" data-room="${room.id}" data-item="${it.id}">
      <div class="rp-item-top">
        <input class="rp-iname" data-f="itemName" value="${esc(it.name)}" placeholder="Item name" aria-label="Item name" maxlength="80">
        <div class="rp-rates" role="radiogroup" aria-label="${esc(sc.label)} of ${esc(nm)}">
          ${sc.levels.map(l => `<label class="rp-chip tone-${l.tone}"><input type="radio" name="rate-${it.id}" value="${l.k}"${it.rating === l.k ? " checked" : ""}><span>${esc(l.label)}</span></label>`).join("")}
        </div>
        <button type="button" class="rp-x" data-a="delItem" aria-label="Remove ${esc(nm)}" title="Remove item">×</button>
      </div>
      ${R.compare && (prevL || it.prevNotes) ? `<p class="rp-prev">${esc(R.labels[0])}: ${prevL ? `<b class="tone-${prevL.tone}">${esc(prevL.label)}</b>` : "not rated"}${it.prevNotes ? ` · ${esc(it.prevNotes)}` : ""}</p>` : ""}
      <div class="rp-item-body">
        ${R.pair ? stripHtml(room, it, "before", R.labels[0]) + stripHtml(room, it, "after", R.labels[1]) : stripHtml(room, it, "", "")}
        <textarea class="rp-note" data-f="itemNotes" rows="2" maxlength="2000" placeholder="Notes, e.g. size and location of any damage" aria-label="Notes for ${esc(nm)}">${esc(it.notes)}</textarea>
      </div>
    </div>`;
  }
  function roomMeta(room) {
    const sc = C.scaleOf(R);
    const n = room.items.reduce((s, it) => s + it.photos.filter(id => R.photos[id]).length, 0);
    const rated = room.items.filter(it => it.rating).length;
    const flagged = room.items.filter(it => { const l = C.level(sc, it.rating); return l && l.issue; }).length;
    return `${rated}/${room.items.length} rated · ${plural(n, "photo")}${flagged ? ` · <b class="tone-bad">${flagged} flagged</b>` : ""}`;
  }
  function roomHtml(room, i) {
    const word = T().roomWord || "room";
    return `<details class="rp-room" data-room="${room.id}"${openRooms.has(room.id) ? " open" : ""}>
      <summary><span class="rp-rname">${esc(room.name || "Untitled " + word)}</span><span class="rp-rmeta">${roomMeta(room)}</span></summary>
      <div class="rp-room-body">
        <div class="rp-room-tools">
          <label class="rp-sr" for="rn-${room.id}">Name of ${word}</label>
          <input id="rn-${room.id}" class="rp-rinput" data-f="roomName" value="${esc(room.name)}" maxlength="60" placeholder="Name of ${word}">
          <button type="button" class="rp-x" data-a="roomUp" aria-label="Move ${esc(room.name || word)} up"${i === 0 ? " disabled" : ""}>↑</button>
          <button type="button" class="rp-x" data-a="roomDown" aria-label="Move ${esc(room.name || word)} down"${i === R.rooms.length - 1 ? " disabled" : ""}>↓</button>
          <button type="button" class="btn ghost sm rp-danger" data-a="delRoom">Delete ${word}</button>
        </div>
        ${room.items.map(it => itemHtml(room, it)).join("")}
        <button type="button" class="btn ghost sm" data-a="addItem">+ Add item</button>
      </div>
    </details>`;
  }
  function renderRooms() {
    const word = T().roomWord || "room";
    $(".rp-rooms-title").textContent = `${word[0].toUpperCase() + word.slice(1)}s, items and photos`;
    $('[data-a="addRoom"]').textContent = `+ Add ${word}`;
    $(".rp-rooms").innerHTML = R.rooms.map(roomHtml).join("") || `<p class="rp-hint">No ${word}s yet. Add one to start.</p>`;
    autosizeAll();
  }
  function renderRoom(room) {
    const el = $(`.rp-room[data-room="${room.id}"]`);
    if (!el) return renderRooms();
    const i = R.rooms.indexOf(room);
    el.outerHTML = roomHtml(room, i);
    autosizeAll($(`.rp-room[data-room="${room.id}"]`));
  }
  const autosize = ta => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight + 2, 320) + "px"; };
  const autosizeAll = (el = mount) => $$("textarea.rp-note", el).forEach(ta => { if (ta.value) autosize(ta); });

  // ---------- signatures ----------
  function renderSigs() {
    $(".rp-sigs").innerHTML = R.signatures.map((s, i) => `<div class="rp-sig" data-sig="${i}">
      <div class="row">
        <div><label for="sr-${i}">Role</label><input id="sr-${i}" data-sf="role" value="${esc(s.role)}" maxlength="60"></div>
        <div><label for="sn-${i}">Name</label><input id="sn-${i}" data-sf="name" value="${esc(s.name)}" maxlength="80"></div>
      </div>
      <p class="rp-padlabel" id="sl-${i}">Signature</p>
      <div class="rp-pad"><canvas width="900" height="300" role="img" aria-labelledby="sl-${i}"></canvas><span class="rp-padline" aria-hidden="true"></span></div>
      <div class="rp-padbtns">
        <button type="button" class="btn ghost sm" data-a="sigType">Sign with typed name</button>
        <button type="button" class="btn ghost sm" data-a="sigClear">Clear</button>
        <span class="rp-sigdate"><label for="sd-${i}">Date</label><input id="sd-${i}" type="date" data-sf="date" value="${esc(s.date)}"></span>
      </div>
    </div>`).join("");
    $$(".rp-sig").forEach(el => setupPad(el, +el.dataset.sig));
  }
  function setupPad(el, i) {
    const cv = $("canvas", el), ctx = cv.getContext("2d");
    const s = R.signatures[i];
    if (s.img) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, cv.width, cv.height); im.src = s.img; }
    let last = null, drew = false;
    const pos = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * cv.width, (e.clientY - b.top) / b.height * cv.height]; };
    cv.addEventListener("pointerdown", e => {
      e.preventDefault(); cv.setPointerCapture(e.pointerId); last = pos(e); drew = false;
      ctx.fillStyle = "#14213d"; ctx.beginPath(); ctx.arc(last[0], last[1], 2.6, 0, Math.PI * 2); ctx.fill();
    });
    cv.addEventListener("pointermove", e => {
      if (!last) return;
      const p = pos(e);
      ctx.strokeStyle = "#14213d"; ctx.lineWidth = 5.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      last = p; drew = true;
    });
    const end = () => {
      if (!last) return; last = null;
      s.img = cv.toDataURL("image/png");
      if (!s.date) { s.date = C.todayIso(); $('[data-sf="date"]', el).value = s.date; }
      changed();
    };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end); cv.addEventListener("lostpointercapture", end);
    void drew;
  }
  function typedSignature(i) {
    const s = R.signatures[i], el = $(`.rp-sig[data-sig="${i}"]`);
    if (!s.name.trim()) { $('[data-sf="name"]', el).focus(); status("Type your name first, then choose “Sign with typed name”.", "warn"); return; }
    const cv = $("canvas", el), ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    let size = 120;
    ctx.fillStyle = "#14213d"; ctx.textBaseline = "alphabetic";
    do { ctx.font = `italic ${size}px "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive, Georgia, serif`; size -= 6; } while (ctx.measureText(s.name).width > cv.width - 60 && size > 30);
    ctx.fillText(s.name, 30, cv.height * 0.68);
    s.img = cv.toDataURL("image/png");
    if (!s.date) s.date = C.todayIso();
    renderSigs(); changed();
  }

  // ---------- export panel ----------
  function renderExport() {
    const S = R.settings;
    const per = $("#rp-per");
    per.innerHTML = R.pair
      ? `<option value="1">1 pair</option><option value="2">2 pairs</option><option value="4">3 pairs</option>`
      : `<option value="1">1 photo</option><option value="2">2 photos</option><option value="4">4 photos</option><option value="6">6 photos</option>`;
    if (R.pair && S.perPage === 6) S.perPage = 4;
    per.value = String(S.perPage);
    $("#rp-paper").value = S.paper;
    $$('input[data-s]').forEach(cb => { cb.checked = !!S[cb.dataset.s]; });
    renderStats();
  }
  function renderStats() {
    const s = C.summarize(R);
    const issueWord = { condition: "flagged", punch: "open", clean: "to fix" }[s.scale];
    $(".rp-stats").innerHTML = `<li><b>${s.items}</b> items</li><li><b>${s.photos}</b> photos</li><li class="${s.issues.length ? "bad" : ""}"><b>${s.issues.length}</b> ${issueWord}</li>`;
  }

  function renderAll() {
    renderTemplatePicker(); renderDetails(); renderRooms(); renderSigs(); renderExport();
    mount.classList.toggle("rp-pair", !!R.pair);
  }

  // ---------- saving ----------
  function changed(light) {
    if (!light) renderStats();
    const res = $(".rp-result");
    if (!res.hidden) { res.hidden = true; progress("You changed the report. Create the PDF again to include the changes."); }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => safe(() => DB.set("draft", R)), 350);
  }
  function persist() {
    if (persisted) return; persisted = true;
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(() => {}); } catch {}
  }

  // ---------- photos ----------
  async function addPhotos(files, tgt) {
    const room = roomById(tgt.room), it = itemById(room, tgt.item);
    if (!it || !files.length) return;
    const errs = [];
    openRooms.add(room.id);
    for (let i = 0; i < files.length; i++) {
      status(`Adding photo ${i + 1} of ${files.length}…`);
      try {
        const { blob, thumb, meta } = await PH.importFile(files[i]);
        const id = C.uid("p");
        meta.phase = R.pair ? (tgt.phase === "before" ? "before" : "after") : "";
        R.photos[id] = meta;
        it.photos.push(id);
        blobs.set(id, blob);
        thumbs.set(id, URL.createObjectURL(thumb));
        await safe(() => DB.putPhoto(id, { blob, thumb }));
      } catch (e) { errs.push(e.message || String(e)); }
    }
    persist();
    renderRoom(room); changed();
    const focusBtn = $(`.rp-item[data-item="${it.id}"] [data-a="library"][data-phase="${tgt.phase || ""}"]`);
    if (focusBtn) focusBtn.focus({ preventScroll: true });
    const n = files.length - errs.length;
    if (errs.length) status(`${n ? plural(n, "photo") + " added. " : ""}${errs.map(esc).join(" ")}`, "warn");
    else status(`${plural(n, "photo")} added to ${esc(room.name)} › ${esc(it.name)}.${photoCount() > 150 ? " Very large reports can be slow to export on older phones." : ""}`);
  }
  function removePhoto(id) {
    for (const room of R.rooms) for (const it of room.items) it.photos = it.photos.filter(x => x !== id);
    delete R.photos[id];
    blobs.delete(id);
    if (thumbs.has(id)) { URL.revokeObjectURL(thumbs.get(id)); thumbs.delete(id); }
    safe(() => DB.delPhoto(id));
  }
  function whereIs(id) {
    for (const room of R.rooms) for (const it of room.items) if (it.photos.includes(id)) return { room, it };
    return null;
  }

  // ---------- photo dialog with markup ----------
  const dlg = $(".rp-dlg"), stageImg = $(".rp-stage-img"), ink = $(".rp-ink");
  let cur = null; // { id, shapes, tool, drawing, url, dirty }
  function openPhoto(id) {
    const ph = R.photos[id], w = whereIs(id);
    if (!ph || !w) return;
    const num = C.numberPhotos(R)[id];
    cur = { id, shapes: JSON.parse(JSON.stringify(ph.markup || [])), tool: null, drawing: null, dirty: false, url: URL.createObjectURL(blobs.get(id)) };
    $("#rp-dlg-title").textContent = `Photo ${num} · ${w.room.name} › ${w.it.name}`;
    stageImg.src = cur.url;
    stageImg.alt = `Photo of ${w.it.name}`;
    $(".rp-cap").value = ph.caption || "";
    $(".rp-taken").value = (ph.takenAt || "").slice(0, 19);
    const pw = $(".rp-phase-wrap");
    pw.hidden = !R.pair;
    if (R.pair) { $(".rp-phase-sel").innerHTML = `<option value="before">${esc(R.labels[0])}</option><option value="after">${esc(R.labels[1])}</option>`; $(".rp-phase-sel").value = ph.phase === "before" ? "before" : "after"; }
    updateSrc();
    setTool(null);
    stageImg.onload = drawInk;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  }
  function updateSrc() {
    const ph = R.photos[cur.id];
    $(".rp-src").textContent = `Time source: ${C.SOURCE[ph.source] || "file date"}${ph.offset ? ` (UTC${ph.offset})` : ""} · File: ${ph.origName || "photo"}${ph.origSize ? ` (${fmtSize(ph.origSize)})` : ""} · Saved at ${ph.w}×${ph.h} px`;
  }
  function setTool(t) {
    cur && (cur.tool = t);
    $$("[data-tool]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tool === t)));
    ink.classList.toggle("on", !!t);
  }
  function drawInk() {
    if (!cur) return;
    const r = stageImg.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ink.width = Math.max(1, Math.round(r.width * dpr)); ink.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = ink.getContext("2d");
    ctx.clearRect(0, 0, ink.width, ink.height);
    PH.drawMarkup(ctx, cur.drawing ? [...cur.shapes, cur.drawing] : cur.shapes, ink.width, ink.height);
  }
  const npos = e => { const b = ink.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), Math.min(1, Math.max(0, (e.clientY - b.top) / b.height))]; };
  ink.addEventListener("pointerdown", e => {
    if (!cur || !cur.tool) return;
    e.preventDefault(); ink.setPointerCapture(e.pointerId);
    const [x, y] = npos(e);
    cur.drawing = cur.tool === "pen" ? { t: "pen", pts: [[x, y]] } : { t: cur.tool, x1: x, y1: y, x2: x, y2: y };
    drawInk();
  });
  ink.addEventListener("pointermove", e => {
    if (!cur || !cur.drawing) return;
    const [x, y] = npos(e);
    if (cur.drawing.t === "pen") cur.drawing.pts.push([+x.toFixed(4), +y.toFixed(4)]); else { cur.drawing.x2 = x; cur.drawing.y2 = y; }
    drawInk();
  });
  const inkEnd = () => {
    if (!cur || !cur.drawing) return;
    const d = cur.drawing; cur.drawing = null;
    const big = d.t === "pen" ? d.pts.length > 1 : Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > 0.02;
    if (big) { cur.shapes.push(d); cur.dirty = true; }
    drawInk();
  };
  ink.addEventListener("pointerup", inkEnd); ink.addEventListener("pointercancel", inkEnd);
  window.addEventListener("resize", () => { if (dlg.open) drawInk(); });
  async function closePhoto() {
    if (!cur) return;
    const c = cur; cur = null;
    if (dlg.open) dlg.close();
    const ph = R.photos[c.id];
    URL.revokeObjectURL(c.url);
    if (!ph) return;
    if (c.dirty) {
      ph.markup = c.shapes;
      const t = await PH.thumbFor(blobs.get(c.id), ph.markup);
      if (thumbs.has(c.id)) URL.revokeObjectURL(thumbs.get(c.id));
      thumbs.set(c.id, URL.createObjectURL(t));
      await safe(() => DB.putPhoto(c.id, { blob: blobs.get(c.id), thumb: t }));
    }
    const w = whereIs(c.id);
    if (w) { renderRoom(w.room); const b = $(`.rp-th[data-id="${c.id}"]`); if (b) b.focus({ preventScroll: true }); }
    changed();
  }
  dlg.addEventListener("cancel", e => { e.preventDefault(); closePhoto(); });
  dlg.addEventListener("click", e => { if (e.target === dlg) closePhoto(); });
  dlg.addEventListener("input", e => {
    if (!cur) return;
    const ph = R.photos[cur.id];
    if (e.target.classList.contains("rp-cap")) { ph.caption = e.target.value; changed(true); }
  });
  dlg.addEventListener("change", e => {
    if (!cur) return;
    const ph = R.photos[cur.id];
    if (e.target.classList.contains("rp-taken")) {
      const v = e.target.value;
      if (C.parseLocal(v)) { ph.takenAt = v.length === 16 ? v + ":00" : v.slice(0, 19); ph.offset = ""; ph.source = "manual"; updateSrc(); changed(true); }
    } else if (e.target.classList.contains("rp-phase-sel")) {
      ph.phase = e.target.value; changed(true);
    }
  });
  async function rotatePhoto(dir) {
    const id = cur.id, ph = R.photos[id];
    const out = await PH.rotate(blobs.get(id), dir);
    blobs.set(id, out.blob);
    ph.w = out.w; ph.h = out.h;
    cur.shapes = C.rotateShapes(cur.shapes, dir);
    ph.markup = cur.shapes; cur.dirty = true;
    URL.revokeObjectURL(cur.url);
    cur.url = URL.createObjectURL(out.blob);
    stageImg.src = cur.url;
    updateSrc();
  }
  function movePhoto(delta) {
    const w = whereIs(cur.id); if (!w) return;
    const ph = R.photos[cur.id];
    const same = w.it.photos.filter(x => R.photos[x] && (!R.pair || (R.photos[x].phase === "before") === (ph.phase === "before")));
    const k = same.indexOf(cur.id), j = k + delta;
    if (j < 0 || j >= same.length) return;
    const a = w.it.photos.indexOf(same[k]), b = w.it.photos.indexOf(same[j]);
    [w.it.photos[a], w.it.photos[b]] = [w.it.photos[b], w.it.photos[a]];
    $("#rp-dlg-title").textContent = `Photo ${C.numberPhotos(R)[cur.id]} · ${w.room.name} › ${w.it.name}`;
    cur.dirty = cur.dirty || false;
    changed(true);
  }

  // ---------- project files ----------
  async function saveProject() {
    const files = [];
    const rep = JSON.parse(JSON.stringify(R));
    const manifest = ["photo,file,room,item,taken,time_source,original_file,original_bytes,sha256"];
    const num = C.numberPhotos(R);
    for (const [id, ph] of Object.entries(R.photos)) {
      const blob = blobs.get(id);
      if (!blob) continue;
      const w = whereIs(id);
      files.push({ name: `photos/${id}.jpg`, data: new Uint8Array(await blob.arrayBuffer()) });
      const q = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
      manifest.push([num[id] || "", `photos/${id}.jpg`, q(w && w.room.name), q(w && w.it.name), ph.takenAt + (ph.offset || ""), ph.source, q(ph.origName), ph.origSize || "", ph.sha256 || ""].join(","));
    }
    files.unshift(
      { name: "report.json", data: JSON.stringify({ app: "roomproof", format: 1, savedAt: new Date().toISOString(), report: rep }, null, 1) },
      { name: "README.txt", data: `Roomproof project file\r\n\r\n"${R.title}"${R.property ? " - " + R.property : ""}\r\nSaved ${new Date().toString()}\r\n\r\nOpen this file at https://photoreport.roohsites.com (Open project) to keep editing or to create the PDF again.\r\nphotos/ holds each photo (resized), manifest.csv lists them with capture times and SHA-256 fingerprints of the files as added.\r\n\r\nMade with Roomproof - free photo report generator - photoreport.roohsites.com\r\n` },
      { name: "manifest.csv", data: manifest.join("\r\n") + "\r\n" });
    const z = C.zip(files);
    download(new Blob([z], { type: "application/octet-stream" }), `${C.safeName(R.title)}-${R.date || C.todayIso()}.roomproof`);
    status(`Project saved (${plural(photoCount(), "photo")}, ${fmtSize(z.length)}). Keep the .roomproof file somewhere safe, such as cloud storage or email.`);
    track("project_saved");
  }
  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  async function readProject(file) {
    const u8 = new Uint8Array(await file.arrayBuffer());
    let entries;
    try { entries = await C.unzip(u8); } catch (e) { throw new Error(`That file isn't a Roomproof project (${e.message})`); }
    const raw = entries.get("report.json");
    if (!raw) throw new Error("That file isn't a Roomproof project (report.json is missing).");
    let j;
    try { j = JSON.parse(new TextDecoder().decode(raw)); } catch { throw new Error("The project file is damaged (report.json can't be read)."); }
    const rep = j && j.app === "roomproof" && j.report;
    if (!rep || !Array.isArray(rep.rooms) || typeof rep.photos !== "object") throw new Error("That file isn't a Roomproof project.");
    const fresh = C.newReport(rep.template);
    const r = { ...fresh, ...rep, settings: { ...fresh.settings, ...(rep.settings || {}) }, signatures: Array.isArray(rep.signatures) ? rep.signatures : fresh.signatures };
    const pics = new Map();
    let missing = 0;
    for (const id of Object.keys(r.photos)) {
      const d = entries.get(`photos/${id}.jpg`);
      if (d) pics.set(id, new Blob([d], { type: "image/jpeg" })); else { delete r.photos[id]; missing++; }
    }
    for (const room of r.rooms) for (const it of room.items) it.photos = (it.photos || []).filter(id => r.photos[id]);
    return { r, pics, missing };
  }
  async function adopt(r, pics) {
    for (const u of thumbs.values()) URL.revokeObjectURL(u);
    thumbs.clear(); blobs.clear();
    await safe(() => DB.clearPhotos());
    R = r;
    let i = 0;
    for (const [id, blob] of pics) {
      if (!R.photos[id]) continue;
      if (++i % 5 === 0) status(`Loading photos… ${i} of ${pics.size}`);
      const thumb = await PH.thumbFor(blob, R.photos[id].markup);
      blobs.set(id, blob);
      thumbs.set(id, URL.createObjectURL(thumb));
      await safe(() => DB.putPhoto(id, { blob, thumb }));
    }
    openRooms.clear();
    const first = R.rooms.find(room => room.items.some(it => it.photos.length)) || R.rooms[0];
    if (first) openRooms.add(first.id);
    renderAll();
    await safe(() => DB.set("draft", R));
    $(".rp-result").hidden = true; progress("");
  }

  // ---------- reset / templates ----------
  async function startNew(key, custom) {
    // Keep your own name and branding; the address and the other party belong to the old report.
    const keep = R ? { preparedBy: R.preparedBy, company: R.company, logo: R.logo } : {};
    const paper = R ? R.settings.paper : defaultPaper();
    const ct = custom != null ? customTemplates()[custom] : null;
    const r = C.newReport(ct ? ct.base : key, { paper, rooms: ct ? ct.rooms : undefined });
    if (ct) { r.customTpl = custom; r.title = ct.title || r.title; }
    Object.assign(r, keep);
    await adopt(r, new Map());
    if (R.rooms[0]) { openRooms.add(R.rooms[0].id); renderRooms(); }
    track("template_used", { template: ct ? "custom" : R.template });
  }
  const confirmLoss = msg => !hasWork(R) || Object.keys(R.photos).length === 0 && !R.rooms.some(r => r.items.some(i => i.rating || i.notes)) || window.confirm(msg);

  // ---------- PDF ----------
  async function makePdf() {
    const s = C.summarize(R);
    if (!s.items) { progress("Add a photo, a rating or a note to at least one item first.", "warn"); return; }
    const btn = $(".rp-make");
    btn.disabled = true;
    progress("Preparing the PDF…");
    try {
      const out = await window.RPPdf.build(R, blobs, (d, n) => progress(`Adding photo ${d} of ${n}…`));
      if (lastPdf) URL.revokeObjectURL(lastPdf.url);
      lastPdf = { ...out, url: URL.createObjectURL(out.blob) };
      const a = $(".rp-dl");
      a.href = lastPdf.url; a.download = out.name;
      $(".rp-resinfo").textContent = `${out.name} · ${plural(out.pages, "page")} · ${fmtSize(out.blob.size)}`;
      const file = typeof File === "function" ? new File([out.blob], out.name, { type: "application/pdf" }) : null;
      $(".rp-share").hidden = !(file && navigator.canShare && navigator.canShare({ files: [file] }));
      $(".rp-result").hidden = false;
      progress("Your PDF is ready.", "ok");
      a.focus({ preventScroll: false });
      const b = s.photos === 0 ? "0" : s.photos <= 10 ? "1-10" : s.photos <= 25 ? "11-25" : s.photos <= 60 ? "26-60" : "61+";
      track("report_exported", { photos: b, template: R.template, layout: String(R.settings.perPage) });
    } catch (e) {
      progress(`Couldn't create the PDF: ${e.message || e}`, "warn");
    } finally { btn.disabled = false; }
  }
  async function sharePdf() {
    if (!lastPdf) return;
    try { await navigator.share({ files: [new File([lastPdf.blob], lastPdf.name, { type: "application/pdf" })], title: R.title }); track("report_shared"); }
    catch (e) { if (e && e.name !== "AbortError") progress("Sharing isn't available here. Use Download PDF instead.", "warn"); }
  }

  // ---------- events ----------
  mount.addEventListener("input", e => {
    const el = e.target;
    if (el.dataset.r) { R[el.dataset.r] = el.value; changed(true); return; }
    const sigEl = el.closest(".rp-sig");
    if (sigEl && el.dataset.sf) { R.signatures[+sigEl.dataset.sig][el.dataset.sf] = el.value; changed(true); return; }
    const roomEl = el.closest(".rp-room");
    if (!roomEl) return;
    const room = roomById(roomEl.dataset.room);
    if (el.dataset.f === "roomName") { room.name = el.value; $(".rp-rname", roomEl).textContent = el.value || "Untitled"; changed(true); return; }
    const itemEl = el.closest(".rp-item"), it = itemEl && itemById(room, itemEl.dataset.item);
    if (!it) return;
    if (el.dataset.f === "itemName") { it.name = el.value; changed(true); }
    else if (el.dataset.f === "itemNotes") { it.notes = el.value; autosize(el); changed(); }
  });
  mount.addEventListener("change", async e => {
    const el = e.target;
    if (el.type === "radio" && el.name.startsWith("rate-")) {
      const roomEl = el.closest(".rp-room"), room = roomById(roomEl.dataset.room), it = itemById(room, el.closest(".rp-item").dataset.item);
      it.rating = el.value;
      $(".rp-rmeta", roomEl).innerHTML = roomMeta(room);
      changed();
    } else if (el.dataset.s) {
      const k = el.dataset.s;
      R.settings[k] = el.type === "checkbox" ? el.checked : k === "perPage" ? +el.value : el.value;
      if (k === "stamp") renderRooms();
      changed(true);
    } else if (el.id === "rp-template") {
      const v = el.value;
      if (!confirmLoss("Start a new report from this template? Your current rooms, photos and notes will be cleared from this page. Save the project first if you want to keep them.")) { renderTemplatePicker(); return; }
      if (v.startsWith("custom:")) await startNew(null, +v.slice(7)); else await startNew(v);
      status(`Started a new ${esc(T().name.toLowerCase())} report.`);
    } else if (el.id === "rp-cam" || el.id === "rp-lib") {
      const files = [...el.files]; el.value = "";
      if (target && files.length) await addPhotos(files, target);
    } else if (el.id === "rp-proj") {
      const f = el.files[0]; el.value = "";
      if (!f) return;
      const mode = el.dataset.mode;
      try {
        status("Opening project…");
        const { r, pics, missing } = await readProject(f);
        if (mode === "followup") {
          const fr = C.followUp(r, { date: C.todayIso() });
          await adopt(fr, pics);
          status(`Started “${esc(fr.title)}” from “${esc(r.title)}”. Earlier photos are on the <strong>${esc(fr.labels[0])}</strong> side; add new ones on the <strong>${esc(fr.labels[1])}</strong> side.`);
          track("followup_started");
        } else {
          await adopt(r, pics);
          status(`Opened “${esc(r.title)}” with ${plural(Object.keys(r.photos).length, "photo")}.${missing ? ` ${plural(missing, "photo was", "photos were")} missing from the file.` : ""}`);
          track("project_opened");
        }
      } catch (err) { status(esc(err.message || String(err)), "warn"); }
    } else if (el.id === "rp-logo") {
      const f = el.files[0]; el.value = "";
      if (!f) return;
      try { R.logo = await PH.importLogo(f); renderDetails(); changed(true); } catch (err) { status(esc(err.message), "warn"); }
    }
  });
  mount.addEventListener("toggle", e => {
    const d = e.target;
    if (d.classList && d.classList.contains("rp-room")) { if (d.open) openRooms.add(d.dataset.room); else openRooms.delete(d.dataset.room); }
  }, true);
  mount.addEventListener("click", async e => {
    const btn = e.target.closest("[data-a],[data-tool]");
    if (!btn || btn.disabled) return;
    // Clicking a selected rating chip again clears it.
    const a = btn.dataset.a;
    if (btn.dataset.tool) { setTool(cur && cur.tool === btn.dataset.tool ? null : btn.dataset.tool); return; }
    const roomEl = btn.closest(".rp-room"), room = roomEl && roomById(roomEl.dataset.room);
    const itemEl = btn.closest(".rp-item"), it = room && itemEl && itemById(room, itemEl.dataset.item);
    const sigEl = btn.closest(".rp-sig");
    switch (a) {
      case "hideStatus": status(""); break;
      case "camera": case "library":
        target = { room: room.id, item: it.id, phase: btn.dataset.phase || "" };
        $(a === "camera" ? "#rp-cam" : "#rp-lib").click();
        break;
      case "photo": openPhoto(btn.dataset.id); break;
      case "addItem": {
        const ni = { id: C.uid("i"), name: "", rating: "", notes: "", photos: [] };
        room.items.push(ni); renderRoom(room); changed(true);
        const inp = $(`.rp-item[data-item="${ni.id}"] .rp-iname`); if (inp) inp.focus();
        break;
      }
      case "delItem": {
        if (it.photos.length && !confirm(`Remove “${it.name || "this item"}” and its ${plural(it.photos.length, "photo")}?`)) return;
        it.photos.slice().forEach(removePhoto);
        room.items = room.items.filter(x => x !== it); renderRoom(room); changed();
        break;
      }
      case "addRoom": {
        const word = T().roomWord || "room";
        const nr = { id: C.uid("r"), name: "", items: [{ id: C.uid("i"), name: "", rating: "", notes: "", photos: [] }] };
        R.rooms.push(nr); openRooms.add(nr.id); renderRooms(); changed(true);
        const inp = $(`#rn-${nr.id}`); if (inp) { inp.placeholder = `Name of ${word}`; inp.focus(); }
        break;
      }
      case "delRoom": {
        const n = room.items.reduce((s, x) => s + x.photos.length, 0);
        if ((n || room.items.some(x => x.rating || x.notes)) && !confirm(`Delete “${room.name || "this room"}”${n ? ` and its ${plural(n, "photo")}` : ""}?`)) return;
        room.items.forEach(x => x.photos.slice().forEach(removePhoto));
        R.rooms = R.rooms.filter(x => x !== room); renderRooms(); changed();
        break;
      }
      case "roomUp": case "roomDown": {
        const i = R.rooms.indexOf(room), j = i + (a === "roomUp" ? -1 : 1);
        if (j < 0 || j >= R.rooms.length) return;
        [R.rooms[i], R.rooms[j]] = [R.rooms[j], R.rooms[i]];
        renderRooms(); changed(true);
        const b = $(`.rp-room[data-room="${room.id}"] [data-a="${a}"]`); if (b && !b.disabled) b.focus();
        break;
      }
      case "sigClear": {
        const i = +sigEl.dataset.sig; R.signatures[i].img = "";
        const cv = $("canvas", sigEl); cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); changed(true);
        break;
      }
      case "sigType": typedSignature(+sigEl.dataset.sig); break;
      case "logo": $("#rp-logo").click(); break;
      case "logoDel": R.logo = ""; renderDetails(); changed(true); break;
      case "pdf": makePdf(); break;
      case "share": sharePdf(); break;
      case "save":
        if (!photoCount() && !hasWork(R)) { status("There's nothing to save yet.", "warn"); return; }
        saveProject().catch(err => status(esc(err.message), "warn"));
        break;
      case "open": case "followup": {
        const p = $("#rp-proj");
        p.dataset.mode = a;
        if (!confirmLoss(a === "followup" ? "Start a follow-up report? Your current report will be cleared from this page. Save the project first if you want to keep it." : "Open a project? Your current report will be cleared from this page. Save the project first if you want to keep it.")) return;
        p.click();
        break;
      }
      case "new":
        if (!confirmLoss("Start a new, empty report? Your current rooms, photos and notes will be cleared from this page. Save the project first if you want to keep them.")) return;
        await startNew(R.template, R.customTpl);
        status("Started a new report.");
        break;
      case "newPreset":
        if (!confirmLoss("Start a new report? Your current report will be cleared from this page. Save the project first if you want to keep it.")) return;
        await startNew(preset); status(""); break;
      case "tplSave": {
        const name = (prompt("Name for this template (your rooms and item names are saved in this browser):", `My ${T().name.toLowerCase()}`) || "").trim();
        if (!name) return;
        const list = customTemplates();
        list.push({ name: name.slice(0, 60), base: R.template, title: R.title, rooms: R.rooms.map(r => [r.name, r.items.map(i => i.name)]) });
        try { localStorage.setItem("rp_tpls", JSON.stringify(list)); R.customTpl = list.length - 1; renderTemplatePicker(); status(`Saved “${esc(name)}”. Pick it from the Template list next time.`); }
        catch { status("Couldn't save the template in this browser.", "warn"); }
        break;
      }
      case "dlgClose": closePhoto(); break;
      case "mkUndo": if (cur && cur.shapes.length) { cur.shapes.pop(); cur.dirty = true; drawInk(); } break;
      case "mkClear": if (cur && cur.shapes.length) { cur.shapes = []; cur.dirty = true; drawInk(); } break;
      case "rotL": case "rotR": if (cur) { btn.disabled = true; try { await rotatePhoto(a === "rotR" ? 1 : -1); } finally { btn.disabled = false; } } break;
      case "mvPrev": case "mvNext": if (cur) movePhoto(a === "mvPrev" ? -1 : 1); break;
      case "delPhoto":
        if (cur && confirm("Delete this photo from the report?")) {
          const w = whereIs(cur.id), id = cur.id;
          cur.dirty = false; await closePhoto(); removePhoto(id); if (w) renderRoom(w.room); changed();
        }
        break;
    }
  });
  // Clicking an already-selected rating clears it (keyboard users can pick N/A or another value).
  mount.addEventListener("pointerdown", e => {
    const chip = e.target.closest(".rp-chip");
    if (!chip) return;
    const input = $("input", chip);
    if (input.checked) chip.dataset.wasChecked = "1"; else delete chip.dataset.wasChecked;
  });
  mount.addEventListener("click", e => {
    const chip = e.target.closest(".rp-chip");
    if (!chip || e.target.tagName !== "INPUT" || !chip.dataset.wasChecked) return;
    delete chip.dataset.wasChecked;
    const input = e.target;
    input.checked = false;
    const roomEl = chip.closest(".rp-room"), room = roomById(roomEl.dataset.room), it = itemById(room, chip.closest(".rp-item").dataset.item);
    it.rating = ""; $(".rp-rmeta", roomEl).innerHTML = roomMeta(room); changed();
  });

  // ---------- start ----------
  async function init() {
    let draft = null;
    if (idbOk) { try { draft = await DB.get("draft"); } catch { idbOk = false; } }
    let restored = false;
    if (draft && draft.v === 1 && Array.isArray(draft.rooms) && (hasWork(draft) || !preset || draft.template === preset)) {
      R = draft;
      const fresh = C.newReport(R.template);
      R.settings = { ...fresh.settings, ...(R.settings || {}) };
      let lost = 0;
      for (const id of Object.keys(R.photos)) {
        let rec = null;
        try { rec = await DB.getPhoto(id); } catch {}
        if (rec && rec.blob) { blobs.set(id, rec.blob); thumbs.set(id, URL.createObjectURL(rec.thumb || rec.blob)); }
        else { delete R.photos[id]; lost++; }
      }
      for (const room of R.rooms) for (const it of room.items) it.photos = it.photos.filter(id => R.photos[id]);
      restored = hasWork(R);
      if (lost) status(`${plural(lost, "photo")} from your last session couldn't be restored from this browser's storage.`, "warn");
      // Drop stored photos that no longer belong to the draft.
      safe(async () => { for (const k of await DB.keys()) if (!R.photos[k]) await DB.delPhoto(k); });
    }
    if (!R) {
      R = C.newReport(preset || "general", { paper: defaultPaper() });
      if (R.rooms[0]) openRooms.add(R.rooms[0].id);
    } else {
      const first = R.rooms.find(room => room.items.some(it => it.photos.length || it.rating)) || R.rooms[0];
      if (first) openRooms.add(first.id);
    }
    renderAll();
    if (restored && !statusEl.textContent) {
      const n = photoCount();
      status(`Restored your ${esc(T().name.toLowerCase())} report from this browser${n ? ` (${plural(n, "photo")})` : ""}. Use <em>Save project</em> to keep a copy.${preset && preset !== R.template ? ` <button type="button" class="linkbtn" data-a="newPreset">Start a new ${esc(C.TEMPLATES[preset].name.toLowerCase())} instead</button>` : ""}`);
    }
    if (!idbOk) progress("This browser isn't saving drafts (private mode?). Use Save project to keep your work.", "warn");
  }
  init().catch(e => { console.error(e); if (!R) { R = C.newReport(preset || "general", { paper: defaultPaper() }); renderAll(); } });

  // Offline support (installable app). Never caches photos; they stay in this browser's storage.
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
  }
  window.__rp = { get report() { return R; }, blobs }; // for debugging in the console
})();
