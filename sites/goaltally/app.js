/* GoalTally app: ABA graph maker (#gt-graph), data-sheet builder (#gt-sheet), saved goals,
   on-screen scoring, encrypted backups and bulk printing. Everything runs and stays in this browser. */
(() => {
  "use strict";
  const GT = window.GT, GTS = window.GTS, GTR = window.GTR;
  if (!GT || !GTS || !GTR) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const today = () => { const t = new Date(); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; };
  const clock = (t = new Date()) => `${t.getHours()}:${pad(t.getMinutes())}`;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clone = o => JSON.parse(JSON.stringify(o));
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("gt_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("gt_" + k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem("gt_" + k); } catch {} },
  };
  const track = (name, props = {}) => { try { window.va && window.va("event", { name, ...props }); } catch {} };
  const fileSlug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const settings = Object.assign({ logo: null, paper: "letter", dateFmt: "mdy" }, LS.get("settings", {}));
  const saveSettings = () => LS.set("settings", settings);
  let toastT;
  function toast(msg, html) {
    let el = $("#gt-toast");
    if (!el) { el = document.createElement("div"); el.id = "gt-toast"; el.className = "gt-toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
    if (html) el.innerHTML = html; else el.textContent = msg;
    el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 6000);
  }

  /* ---------- Saved goals (this browser only) ---------- */
  const Lib = {
    all() { const a = LS.get("goals", []); return Array.isArray(a) ? a : []; },
    get(id) { return this.all().find(g => g.id === id) || null; },
    put(goal) {
      goal.updated = Date.now();
      const a = this.all(), i = a.findIndex(g => g.id === goal.id);
      if (i >= 0) a[i] = goal; else a.push(goal);
      const ok = LS.set("goals", a);
      if (!ok) toast("Couldn't save: this browser's storage is full or blocked. Download a backup.");
      return ok;
    },
    remove(id) { LS.set("goals", this.all().filter(g => g.id !== id)); },
    label(g) { return `${g.student || "No initials"} · ${g.title || "Untitled goal"}${g.type ? " (" + GTS.TYPES[g.type].name.replace(/ \(.*\)$/, "") + ")" : ""}`; },
    students() { return [...new Set(this.all().map(g => (g.student || "").trim()).filter(Boolean))].sort(); },
  };
  const titleOf = cfg => cfg.title || (GTS.TYPES[cfg.type] && GTS.TYPES[cfg.type].group !== "skill" ? GTS.lines(cfg.behaviors).join(", ") : "") || "";
  function graphFromSheet(cfg) {
    const su = GTS.graphSetup(cfg);
    return { ...GT.defaultGraph(), student: cfg.student || "", title: titleOf(cfg), yLabel: su.yLabel, series: su.series, rows: [], phases: [{ name: "Baseline", start: 0 }],
      dateFmt: settings.dateFmt, crit: { ...GT.defaultGraph().crit, dir: su.dir, value: GTS.TYPES[cfg.type].group === "skill" ? 80 : 0 } };
  }

  /* ---------- Encrypted backup (AES-GCM, key from passphrase with PBKDF2-SHA256) ---------- */
  const b64 = buf => { let s = ""; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const ITER = 310000;
  async function keyFrom(pass, salt, iter) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function encryptBackup(pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await keyFrom(pass, salt, ITER);
    const plain = new TextEncoder().encode(JSON.stringify({ app: "GoalTally", exported: new Date().toISOString(), goals: Lib.all(), settings }));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
    return JSON.stringify({ app: "GoalTally", type: "encrypted-backup", v: 1, kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITER, salt: b64(salt) }, cipher: { name: "AES-GCM", iv: b64(iv) }, data: b64(ct) });
  }
  async function decryptBackup(text, pass) {
    let j; try { j = JSON.parse(text); } catch { throw new Error("That file isn't a GoalTally backup."); }
    if (!j || j.app !== "GoalTally" || !j.data) throw new Error("That file isn't a GoalTally backup.");
    try {
      const key = await keyFrom(pass, unb64(j.kdf.salt), +j.kdf.iterations || ITER);
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(j.cipher.iv) }, key, unb64(j.data));
      return JSON.parse(new TextDecoder().decode(pt));
    } catch { throw new Error("Wrong passphrase, or the file is damaged."); }
  }
  function allCSV() {
    const rows = [["Student", "Goal", "Measurement", "Session", "Date", "Phase", "Series", "Value"]];
    for (const g of Lib.all()) {
      if (!g.graph || !g.graph.rows) continue;
      const m = GT.graphModel(g.graph);
      m.rows.forEach((r, i) => { for (let s = 0; s < m.ns; s++) rows.push([g.student, g.title, g.type ? GTS.TYPES[g.type].name : "", i + 1, r.d, m.phases[GT.phaseOf(m.phases, i)].name, (g.graph.series[s] && g.graph.series[s].name) || (m.ns > 1 ? `Series ${s + 1}` : g.graph.yLabel), GT.isNum(r.v[s]) ? r.v[s] : ""]); });
    }
    return rows.map(r => r.map(GT.csvCell).join(",")).join("\r\n") + "\r\n";
  }

  /* ---------- Library bar shared by both tools ---------- */
  function makeLibrary(host, o) {
    const lib = { id: null };
    const draftKey = `draft:${o.kind}:${location.pathname}`;
    host.innerHTML = `
      <div class="gt-libbar">
        <div class="gt-libpick"><label for="gt-pick-${o.kind}">Saved goals <span class="muted">(this device)</span></label>
          <select id="gt-pick-${o.kind}" data-l="pick"></select></div>
        <div class="gt-libbtns">
          <button type="button" class="btn sm" data-l="save">Save goal</button>
          <button type="button" class="btn ghost sm" data-l="new">New</button>
          <button type="button" class="btn ghost sm" data-l="del" hidden>Delete</button>
        </div>
        <p class="gt-libstate small muted" aria-live="polite"></p>
      </div>
      <details class="gt-backup">
        <summary>Backup, restore${o.kind === "sheet" ? ", print all" : ""} &amp; export</summary>
        <div class="gt-backup-in">
          ${o.kind === "sheet" ? `<div class="gt-bk"><h4>Print every saved sheet for a student</h4>
            <div class="gt-inline"><label class="sr" for="gt-bulk-st">Student</label><select id="gt-bulk-st" data-l="bulkStudent"></select>
            <label class="gt-check"><input type="checkbox" data-l="bulkFill"> include recorded sessions</label>
            <button type="button" class="btn sm" data-l="bulk">Download PDF</button></div></div>` : ""}
          <div class="gt-bk"><h4>Encrypted backup</h4>
            <p class="small muted">Saves every goal, sheet and data point to one file, locked with your passphrase (AES-256). Keep the passphrase somewhere safe: without it the file can't be opened.</p>
            <div class="gt-inline"><label class="sr" for="gt-pass-${o.kind}">Passphrase</label><input id="gt-pass-${o.kind}" type="password" autocomplete="new-password" placeholder="Passphrase (8+ characters)" data-l="pass">
            <button type="button" class="btn sm" data-l="backup">Download backup</button></div></div>
          <div class="gt-bk"><h4>Restore a backup</h4>
            <div class="gt-inline"><label class="sr" for="gt-file-${o.kind}">Backup file</label><input id="gt-file-${o.kind}" type="file" accept=".goaltally,.json,application/json" data-l="file">
            <label class="sr" for="gt-rpass-${o.kind}">Backup passphrase</label><input id="gt-rpass-${o.kind}" type="password" autocomplete="off" placeholder="Passphrase" data-l="rpass">
            <button type="button" class="btn ghost sm" data-l="restore">Restore</button></div></div>
          <div class="gt-bk"><h4>Export</h4><button type="button" class="btn ghost sm" data-l="csvAll">All graph data (CSV)</button></div>
          <p class="gt-bkmsg small" role="status" aria-live="polite"></p>
        </div>
      </details>`;
    const q = s => host.querySelector(`[data-l="${s}"]`);
    const msg = t => { host.querySelector(".gt-bkmsg").textContent = t; };
    lib.refresh = () => {
      const pick = q("pick"), all = Lib.all().sort((a, b) => Lib.label(a).localeCompare(Lib.label(b)));
      pick.innerHTML = `<option value="">${lib.id ? "Unsaved draft" : "Unsaved draft (not in your list)"}</option>` + all.map(g => `<option value="${esc(g.id)}">${esc(Lib.label(g))}</option>`).join("");
      pick.value = lib.id && Lib.get(lib.id) ? lib.id : "";
      if (!pick.value) lib.id = null;
      q("del").hidden = !lib.id;
      q("save").textContent = lib.id ? "Saved" : "Save goal";
      q("save").disabled = !!lib.id;
      host.querySelector(".gt-libstate").textContent = lib.id ? "Changes save automatically on this device." : all.length ? `${all.length} saved goal${all.length > 1 ? "s" : ""}. This one isn't saved yet.` : "Save goals to keep data for each student on this device. Use initials only.";
      const bs = q("bulkStudent");
      if (bs) { const st = Lib.students(); bs.innerHTML = st.length ? st.map(s => `<option>${esc(s)}</option>`).join("") + `<option value="*">All students</option>` : `<option value="">No saved goals yet</option>`; }
    };
    let saveT;
    lib.touch = () => {
      clearTimeout(saveT);
      saveT = setTimeout(() => {
        lib.flush();
      }, 250);
    };
    // Remember what this page shows: the open saved goal, or the unsaved draft itself.
    lib.flush = () => {
      clearTimeout(saveT);
      const st = o.collect();
      if (lib.id) { const g = Lib.get(lib.id); if (g) { o.merge(g, st); Lib.put(g); LS.set(draftKey, { id: lib.id }); return; } lib.id = null; }
      LS.set(draftKey, { state: st.state });
    };
    lib.saveNew = (silent) => {
      const st = o.collect();
      const g = { id: uid(), created: Date.now(), student: "", title: "", type: null, sheet: null, graph: null, sessions: [] };
      o.merge(g, st);
      if (!Lib.put(g)) return null;
      lib.id = g.id; LS.del(draftKey); lib.refresh();
      if (!silent) toast(`Saved “${Lib.label(g)}” on this device.`);
      track("goal_saved", { tool: o.kind });
      return g;
    };
    host.addEventListener("click", async e => {
      const a = e.target.closest("[data-l]") && e.target.closest("[data-l]").dataset.l;
      if (a === "save") { lib.saveNew(); }
      else if (a === "new") { lib.flush(); lib.id = null; o.blank(); lib.refresh(); lib.touch(); }
      else if (a === "del") {
        const g = Lib.get(lib.id); if (!g) return;
        if (!confirm(`Delete “${Lib.label(g)}” and all its recorded sessions from this device? This can't be undone.`)) return;
        Lib.remove(g.id); lib.id = null; lib.refresh(); lib.touch(); toast("Goal deleted from this device.");
      } else if (a === "backup") {
        const pass = q("pass").value;
        if (pass.length < 8) { msg("Use a passphrase of at least 8 characters."); q("pass").focus(); return; }
        if (!Lib.all().length) { msg("There are no saved goals to back up yet."); return; }
        try {
          lib.flush();
          const text = await encryptBackup(pass);
          download(new Blob([text], { type: "application/json" }), `goaltally-backup-${today()}.goaltally`);
          q("pass").value = ""; msg(`Backup downloaded (${Lib.all().length} goals).`); track("backup_downloaded");
        } catch (err) { msg("Backup failed: " + err.message); }
      } else if (a === "restore") {
        const f = q("file").files[0];
        if (!f) { msg("Choose a backup file first."); return; }
        try {
          const data = await decryptBackup(await f.text(), q("rpass").value);
          const cur = Lib.all(), byId = new Map(cur.map(g => [g.id, g]));
          let added = 0, updated = 0;
          for (const g of data.goals || []) {
            if (!g || !g.id) continue;
            const ex = byId.get(g.id);
            if (!ex) { byId.set(g.id, g); added++; } else if ((g.updated || 0) > (ex.updated || 0)) { byId.set(g.id, g); updated++; }
          }
          if (!LS.set("goals", [...byId.values()])) throw new Error("This browser's storage is full.");
          if (data.settings && data.settings.logo && !settings.logo) { settings.logo = data.settings.logo; saveSettings(); }
          q("rpass").value = ""; q("file").value = "";
          lib.refresh(); msg(`Restored: ${added} new goal${added === 1 ? "" : "s"}, ${updated} updated.`); track("backup_restored");
          o.restored && o.restored();
        } catch (err) { msg(err.message); }
      } else if (a === "csvAll") {
        download(new Blob([allCSV()], { type: "text/csv" }), `goaltally-data-${today()}.csv`); track("csv_exported", { scope: "all" });
      } else if (a === "bulk") {
        const st = q("bulkStudent").value;
        const goals = Lib.all().filter(g => g.sheet && (st === "*" || (g.student || "").trim() === st));
        if (!goals.length) { msg("No saved data sheets for that student yet. Save a sheet with the student's initials first."); return; }
        const fill = q("bulkFill").checked;
        try {
          const list = goals.map(g => GTS.sheetPages({ ...g.sheet, dateFmt: settings.dateFmt }, { logo: settings.logo, sessions: fill ? (g.sessions || []) : [] }));
          const blob = await GTR.sheetsPdf(list, `Data sheets ${st === "*" ? "all students" : st}`);
          download(blob, `data-sheets-${fileSlug(st === "*" ? "all" : st) || "student"}-${today()}.pdf`);
          msg(`Downloaded ${goals.length} sheet${goals.length > 1 ? "s" : ""} (${list.reduce((s, x) => s + x.pages.length, 0)} pages).`); track("bulk_print", { count: goals.length });
        } catch (err) { msg(err.message); }
      }
    });
    q("pick").addEventListener("change", e => {
      lib.flush();
      const g = Lib.get(e.target.value);
      if (g) { lib.id = g.id; o.open(clone(g)); }
      else { lib.id = null; }
      lib.refresh();
    });
    // Initial state: ?goal=<id>, then the last draft or open goal on this page, then the page preset.
    lib.init = () => {
      const want = new URLSearchParams(location.search).get("goal");
      const d = LS.get(draftKey, null);
      const g = (want && Lib.get(want)) || (d && d.id && Lib.get(d.id));
      if (g) { lib.id = g.id; o.open(clone(g)); }
      else if (d && d.state) o.load(d.state);
      else o.blank(true);
      lib.refresh();
    };
    return lib;
  }

  /* =====================================================================
     Graph maker
     ===================================================================== */
  const GRAPH_PRESETS = {
    ab: () => ({ ...GT.defaultGraph(), title: "Manding for preferred items", student: "J.D.", yLabel: "Percent correct", trend: "ols",
      rows: [20, 30, 20, 25, 30, 40, 50, 45, 60, 65, 70, 75, 85, 80, 90].map((v, i) => ({ d: GT.addDays("2026-09-01", i + Math.floor(i / 5) * 2), v: [v] })),
      phases: [{ name: "Baseline", start: 0 }, { name: "Intervention", start: 5 }],
      crit: { on: true, value: 80, n: 3, dir: "up", scope: "last", line: true, mark: true } }),
    iep: () => ({ ...GT.defaultGraph(), title: "Oral reading fluency (grade 2 passages)", student: "M.R.", yLabel: "Words correct per minute", xMode: "calendar", trend: "ols", style: "color",
      rows: [["2026-09-08", 41], ["2026-09-10", 44], ["2026-09-12", 42], ["2026-09-19", 46], ["2026-09-26", 45], ["2026-10-03", 50], ["2026-10-10", 49], ["2026-10-17", 53], ["2026-10-24", 55]].map(([d, v]) => ({ d, v: [v] })),
      phases: [{ name: "Baseline", start: 0 }, { name: "Repeated reading", start: 3 }],
      aim: { on: true, x1: "2026-09-12", y1: 42, x2: "2027-01-29", y2: 72 },
      crit: { on: false, value: 72, n: 3, dir: "up", scope: "last", line: false, mark: true } }),
    reversal: () => ({ ...GT.defaultGraph(), title: "Aggression during work tasks", student: "K.L.", yLabel: "Instances per session", trend: "none",
      rows: [9, 11, 8, 10, 3, 2, 2, 1, 7, 9, 8, 2, 1, 1, 0, 1].map((v, i) => ({ d: "", v: [v] })),
      phases: [{ name: "Baseline", start: 0 }, { name: "FCT", start: 4 }, { name: "Baseline", start: 8 }, { name: "FCT", start: 11 }],
      crit: { on: false, value: 1, n: 3, dir: "down", scope: "last", line: false, mark: true } }),
    blank: () => ({ ...GT.defaultGraph(), rows: [], phases: [{ name: "Baseline", start: 0 }] }),
  };
  GRAPH_PRESETS.excel = GRAPH_PRESETS.ab;
  const YLABELS = ["Percent correct", "Percent independent", "Percent of intervals", "Percent of steps independent", "Frequency (count)", "Responses per hour", "Responses per minute", "Duration (minutes)", "Latency (seconds)", "Words correct per minute", "Number of targets mastered"];

  function GraphTool(mount) {
    const preset = mount.dataset.preset || "ab";
    let g = GRAPH_PRESETS[preset] ? GRAPH_PRESETS[preset]() : GRAPH_PRESETS.ab();
    let noteEdited = false;
    mount.innerHTML = `
    <div class="gt-lib"></div>
    <div class="gt">
      <div class="gt-main">
        <div class="gt-preview">
          <div class="gt-canvas"></div>
          <div class="gt-actions">
            <button type="button" class="btn" data-a="png">Download PNG</button>
            <button type="button" class="btn ghost" data-a="pdf">Download PDF</button>
            <button type="button" class="btn ghost" data-a="csv">CSV</button>
            <span class="gt-pdfopts"><label class="sr" for="g-paper">PDF paper size</label><select id="g-paper" data-s="paper"><option value="letter">Letter</option><option value="a4">A4</option></select>
            <label class="gt-check"><input type="checkbox" data-s="summary" checked> Add summary &amp; note</label></span>
          </div>
          <ul class="gt-warn" aria-live="polite"></ul>
        </div>
      </div>
      <form class="gt-form" autocomplete="off" novalidate>
        <h3>Graph</h3>
        <div class="row">
          <div><label for="g-student">Student initials</label><input id="g-student" data-k="student" maxlength="16" placeholder="Initials only, e.g. J.D."></div>
          <div><label for="g-ylabel">Y-axis label</label><input id="g-ylabel" data-k="yLabel" list="g-ylabels"><datalist id="g-ylabels">${YLABELS.map(y => `<option value="${y}">`).join("")}</datalist></div>
        </div>
        <label for="g-title">Title (goal or target)</label><input id="g-title" data-k="title" placeholder="e.g. Manding for preferred items">
        <div class="row">
          <div><label for="g-xmode">X-axis</label><select id="g-xmode" data-k="xMode"><option value="session">Session numbers</option><option value="calendar">Calendar dates</option></select></div>
          <div><label for="g-ns">Data paths</label><select id="g-ns" data-a="ns"><option value="1">1 series</option><option value="2">2 series</option><option value="3">3 series</option></select></div>
        </div>
        <div class="gt-sernames"></div>
        <h3>Phases</h3>
        <p class="hint">Each new phase gets a dashed phase-change line and its own label, and the data path breaks there.</p>
        <div class="gt-phases"></div>
        <button type="button" class="btn ghost sm" data-a="addPhase">+ Add phase change</button>
        <h3>Session data</h3>
        <div class="gt-rows"></div>
        <div class="gt-rowbtns">
          <button type="button" class="btn ghost sm" data-a="addRow">+ Add session</button>
          <button type="button" class="btn ghost sm" data-a="clear">Clear data</button>
          <button type="button" class="btn ghost sm" data-a="example">Load example</button>
        </div>
        <details class="gt-paste"${preset === "excel" ? " open" : ""}>
          <summary>Paste from Excel or Google Sheets</summary>
          <label for="g-paste">Copy your cells and paste them here</label>
          <textarea id="g-paste" rows="6" spellcheck="false" placeholder="Session&#9;Phase&#9;Percent correct&#10;1&#9;Baseline&#9;20&#10;2&#9;Baseline&#9;30&#10;3&#9;Intervention&#9;55"></textarea>
          <p class="hint">Works with a header row (Session, Date, Phase, Value), one column per phase, phase names on their own lines, or a plain list of numbers. Up to 3 value columns.</p>
          <div class="gt-inline"><button type="button" class="btn sm" data-a="import">Replace data</button><button type="button" class="btn ghost sm" data-a="append">Add to the end</button></div>
          <p class="gt-pastemsg small" role="status" aria-live="polite"></p>
        </details>
        <h3>Lines &amp; mastery</h3>
        <label for="g-trend">Trend line</label>
        <select id="g-trend" data-k="trend"><option value="none">None</option><option value="ols">Least squares, per phase</option><option value="split">Split-middle, per phase</option></select>
        <label class="gt-check"><input type="checkbox" data-k="aim.on"> Aim line (goal line)</label>
        <div class="gt-aim gt-sub"></div>
        <label class="gt-check"><input type="checkbox" data-k="crit.on"> Mastery criterion</label>
        <div class="gt-crit gt-sub">
          <div class="row">
            <div><label for="g-cv">Criterion value</label><input id="g-cv" data-k="crit.value" inputmode="decimal"></div>
            <div><label for="g-cn">Sessions in a row</label><input id="g-cn" type="number" min="1" max="30" data-k="crit.n"></div>
          </div>
          <div class="row">
            <div><label for="g-cd">Goal direction</label><select id="g-cd" data-k="crit.dir"><option value="up">Increase: at or above</option><option value="down">Decrease: at or below</option></select></div>
            <div><label for="g-cs">Count sessions in</label><select id="g-cs" data-k="crit.scope"><option value="last">The last phase</option><option value="all">All phases</option></select></div>
          </div>
          <label class="gt-check"><input type="checkbox" data-k="crit.line"> Draw a criterion line</label>
          <label class="gt-check"><input type="checkbox" data-k="crit.mark"> Mark the session where it was met</label>
        </div>
        <details class="gt-more">
          <summary>Axes &amp; style</summary>
          <div class="row">
            <div><label for="g-ymin">Y-axis minimum</label><input id="g-ymin" data-k="yMin" inputmode="decimal" placeholder="Auto (0)"></div>
            <div><label for="g-ymax">Y-axis maximum</label><input id="g-ymax" data-k="yMax" inputmode="decimal" placeholder="Auto"></div>
          </div>
          <div class="row">
            <div><label for="g-ticks">X-axis labels</label><select id="g-ticks" data-k="tickLabels"><option value="number">Session numbers</option><option value="date">Session dates</option></select></div>
            <div><label for="g-df">Date format</label><select id="g-df" data-k="dateFmt"><option value="mdy">Month/day (US)</option><option value="dmy">Day/month</option></select></div>
          </div>
          <div class="row">
            <div><label for="g-style">Style</label><select id="g-style" data-k="style"><option value="classic">Black &amp; white (ABA journal style)</option><option value="color">Color</option></select></div>
            <div><label for="g-xl">X-axis title</label><input id="g-xl" data-k="xLabel" placeholder="Auto"></div>
          </div>
          <label class="gt-check"><input type="checkbox" data-k="connectGaps"> Connect the line across missed sessions</label>
        </details>
      </form>
    </div>
    <section class="gt-results" aria-label="Graph summary">
      <div class="gt-res-grid">
        <div><h3>Summary by phase</h3><div class="gt-stats"></div><p class="gt-mastery"></p></div>
        <div><h3><label for="g-note">Progress note</label></h3>
          <textarea id="g-note" class="gt-note" rows="9"></textarea>
          <div class="gt-inline"><button type="button" class="btn ghost sm" data-a="copyNote">Copy</button><button type="button" class="btn ghost sm" data-a="resetNote">Rewrite from data</button></div>
          <p class="hint">Written from your numbers with fixed templates (no AI). Edit it before pasting into a report.</p>
        </div>
      </div>
    </section>`;
    const form = $(".gt-form", mount), canvas = $(".gt-canvas", mount);
    const lib = makeLibrary($(".gt-lib", mount), {
      kind: "graph",
      collect: () => ({ state: g }),
      merge(goal, st) { goal.graph = clone(st.state); goal.student = st.state.student; goal.title = st.state.title; if (goal.sheet) { goal.sheet.student = goal.student; if (GTS.TYPES[goal.sheet.type].group === "skill") goal.sheet.title = goal.title; } },
      open(goal) { load(goal.graph || (goal.sheet ? graphFromSheet(goal.sheet) : { ...GRAPH_PRESETS.blank(), student: goal.student, title: goal.title })); },
      load: s => load(s),
      blank: first => load(first ? (GRAPH_PRESETS[preset] || GRAPH_PRESETS.ab)() : { ...GRAPH_PRESETS.blank(), style: g.style, dateFmt: g.dateFmt }),
      restored: () => {},
    });
    const getK = (o, k) => k.split(".").reduce((a, p) => a && a[p], o);
    const setK = (o, k, v) => { const ps = k.split("."); let a = o; for (const p of ps.slice(0, -1)) a = a[p] = a[p] || {}; a[ps[ps.length - 1]] = v; };
    function load(state) {
      g = { ...GT.defaultGraph(), ...clone(state) };
      g.aim = { ...GT.defaultGraph().aim, ...(state.aim || {}) };
      g.crit = { ...GT.defaultGraph().crit, ...(state.crit || {}) };
      if (!Array.isArray(g.rows)) g.rows = [];
      if (!Array.isArray(g.series) || !g.series.length) g.series = [{ name: "" }];
      noteEdited = !!g.note;
      $("#g-note", mount).value = g.note || "";
      syncForm(); renderPhases(); renderRows(); renderAim(); draw();
    }
    function syncForm() {
      for (const el of $$("[data-k]", form)) { const v = getK(g, el.dataset.k); if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? ""; }
      $("#g-ns", form).value = String(Math.min(3, g.series.length));
      $(".gt-crit", form).hidden = !g.crit.on; $(".gt-aim", form).hidden = !g.aim.on;
      $("#g-ticks", form).closest("div").hidden = g.xMode === "calendar";
      renderSeriesNames();
    }
    function renderSeriesNames() {
      const n = g.series.length;
      $(".gt-sernames", form).innerHTML = n > 1 ? `<div class="row${n > 2 ? "3" : ""}">` + g.series.map((s, i) => `<div><label for="g-sn${i}">Series ${i + 1} name ${["(●)", "(□)", "(▲)"][i]}</label><input id="g-sn${i}" data-sn="${i}" value="${esc(s.name)}" placeholder="${["e.g. Independent", "e.g. Prompted", "e.g. Errors"][i]}"></div>`).join("") + `</div>` : "";
    }
    function renderPhases() {
      g.phases = GT.normPhases(g.phases, g.rows.length).map(({ name, start }) => ({ name, start }));
      $(".gt-phases", form).innerHTML = g.phases.map((p, i) => `
        <div class="gt-phase" data-i="${i}">
          <label class="sr" for="g-pn${i}">Phase ${i + 1} name</label><input id="g-pn${i}" data-p="name" value="${esc(p.name)}" placeholder="${i ? "e.g. Intervention" : "e.g. Baseline"}">
          <label for="g-ps${i}" class="gt-from">starts at session</label><input id="g-ps${i}" data-p="start" type="number" min="1" value="${p.start + 1}"${i === 0 ? " disabled" : ""}>
          <button type="button" class="gt-x" data-a="delPhase" aria-label="Remove phase ${i + 1}"${i === 0 ? " disabled" : ""}>×</button>
        </div>`).join("");
    }
    function rowHTML(r, i) {
      const div = g.phases.find((p, k) => k > 0 && p.start === i);
      const vals = g.series.map((s, k) => `<input data-v="${k}" inputmode="decimal" value="${esc(r.v[k] ?? "")}" aria-label="Session ${i + 1} ${g.series.length > 1 ? esc(s.name || "series " + (k + 1)) : "value"}">`).join("");
      return (div ? `<div class="gt-divider" aria-hidden="true"><span>${esc(div.name || "New phase")}</span></div>` : "") +
        `<div class="gt-row" data-i="${i}" style="--ns:${g.series.length}"><span class="gt-n">${i + 1}</span><input type="date" data-d value="${esc(r.d)}" aria-label="Session ${i + 1} date">${vals}<button type="button" class="gt-x" data-a="delRow" aria-label="Remove session ${i + 1}">×</button></div>`;
    }
    function renderRows() {
      const head = `<div class="gt-row gt-head" style="--ns:${g.series.length}" aria-hidden="true"><span>#</span><span>Date${g.xMode === "calendar" ? "" : " (optional)"}</span>${g.series.map((s, k) => `<span>${esc(g.series.length > 1 ? s.name || "Series " + (k + 1) : "Value")}</span>`).join("")}<span></span></div>`;
      $(".gt-rows", form).innerHTML = head + (g.rows.length ? g.rows.map(rowHTML).join("") : `<p class="hint gt-empty">No sessions yet. Add one, or paste from a spreadsheet.</p>`);
    }
    function renderAim() {
      const cal = g.xMode === "calendar", t = cal ? "date" : "number";
      $(".gt-aim", form).innerHTML = `
        <div class="row"><div><label for="g-ax1">Start ${cal ? "date" : "session"}</label><input id="g-ax1" type="${t}" data-k="aim.x1" value="${esc(g.aim.x1)}"></div><div><label for="g-ay1">Start value</label><input id="g-ay1" data-k="aim.y1" inputmode="decimal" value="${esc(g.aim.y1)}"></div></div>
        <div class="row"><div><label for="g-ax2">Goal ${cal ? "date" : "session"}</label><input id="g-ax2" type="${t}" data-k="aim.x2" value="${esc(g.aim.x2)}"></div><div><label for="g-ay2">Goal value</label><input id="g-ay2" data-k="aim.y2" inputmode="decimal" value="${esc(g.aim.y2)}"></div></div>
        <button type="button" class="btn ghost sm" data-a="suggestAim">Start at the baseline median</button>`;
    }
    function suggestAim() {
      const m = GT.graphModel(g), withData = m.phases.filter(p => p.idx.length);
      if (!withData.length) { toast("Add some baseline data first."); return; }
      const base = withData[0], vals = m.pts[0].filter(q => q.ph === base.k).map(q => q.y);
      const lastI = base.idx[base.idx.length - 1];
      const y1 = GT.round(GT.median(withData.length > 1 ? vals : vals.slice(0, 3)), 1);
      if (m.cal) {
        const d0 = g.rows[lastI].d || today();
        g.aim.x1 = d0; g.aim.x2 = g.aim.x2 || GT.addDays(d0, 56);
      } else { g.aim.x1 = String(lastI + 1); g.aim.x2 = g.aim.x2 || String(g.rows.length + 10); }
      g.aim.y1 = String(y1);
      if (!g.aim.y2) g.aim.y2 = String(g.crit.on && GT.isNum(GT.toNum(g.crit.value)) ? g.crit.value : m.pct ? 80 : GT.round(Math.max(...m.pts[0].map(q => q.y)) * 1.5, 0));
      g.aim.on = true; syncForm(); renderAim(); changed();
    }
    let rafId = 0;
    function changed() { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(draw); lib.touch(); }
    function previewSize() { const cw = canvas.clientWidth || 800; const W = Math.round(Math.min(1000, Math.max(540, cw * 1.08))); return { w: W, h: Math.round(W < 760 ? W * 0.8 : W * 0.64) }; }
    function draw() {
      const sc = GT.graphScene(g, previewSize());
      const m = sc.model;
      const label = `${g.title || "ABA graph"}: ${m.n} sessions across ${m.phases.filter(p => p.idx.length).length} phase(s)` + (m.mastery ? (m.mastery.met ? ", mastery criterion met at session " + (m.mastery.at + 1) : ", mastery criterion not yet met") : "");
      canvas.innerHTML = GTR.svg(sc, { label });
      $(".gt-warn", mount).innerHTML = m.warnings.map(w => `<li>${esc(w)}</li>`).join("");
      // Stats table
      const unit = m.pct ? "%" : "", f = v => GT.isNum(v) ? GT.fmtNum(v, 1) + unit : "–";
      const rows = m.stats.filter(s => s.sessions);
      $(".gt-stats", mount).innerHTML = rows.length ? `<div class="gt-tablewrap"><table class="gt-table"><thead><tr><th>Phase</th><th>Points</th><th>Mean</th><th>Median</th><th>Range</th><th>Trend / ${m.cal ? "week" : "session"}</th><th title="Percentage of non-overlapping data compared with the previous phase">PND</th></tr></thead><tbody>${rows.map(s => `<tr><td>${esc(s.name || "Phase " + (s.k + 1))}</td><td>${s.n}</td><td>${f(s.mean)}</td><td>${f(s.median)}</td><td>${s.n ? GT.fmtNum(s.min, 1) + "–" + GT.fmtNum(s.max, 1) + unit : "–"}</td><td>${s.slope === null ? "–" : (s.slope >= 0 ? "+" : "") + GT.fmtNum(s.slope, 2)}</td><td>${s.pnd === null ? "–" : GT.fmtNum(s.pnd, 0) + "%"}</td></tr>`).join("")}</tbody></table></div><p class="hint">Trend uses least squares${g.series.length > 1 ? " on the first series" : ""}. PND compares each phase with the one before it (${g.crit.dir === "down" ? "points below its lowest value" : "points above its highest value"}).</p>` : `<p class="hint">Add data to see phase means, ranges and trends.</p>`;
      const ms = $(".gt-mastery", mount);
      if (m.mastery) {
        const c = `${m.mastery.dir === "down" ? "≤" : "≥"} ${GT.fmtNum(m.mastery.value, 2)}${unit} for ${m.mastery.need} consecutive session${m.mastery.need > 1 ? "s" : ""}`;
        ms.className = "gt-mastery " + (m.mastery.met ? "ok" : "");
        ms.textContent = m.mastery.met ? `Mastery criterion met (${c}) at session ${m.mastery.at + 1}${g.rows[m.mastery.at] && g.rows[m.mastery.at].d ? ", " + GT.fmtDate(g.rows[m.mastery.at].d, g.dateFmt) : ""}.` : `Mastery criterion (${c}) not met yet${m.mastery.run ? ` · current run: ${m.mastery.run}` : ""}.`;
      } else { ms.textContent = ""; ms.className = "gt-mastery"; }
      if (!noteEdited) $("#g-note", mount).value = GT.progressNote(g, m);
    }

    form.addEventListener("input", e => {
      const t = e.target;
      if (t.dataset.k) {
        const v = t.type === "checkbox" ? t.checked : t.value;
        setK(g, t.dataset.k, v);
        if (t.dataset.k === "aim.on") { $(".gt-aim", form).hidden = !v; if (v && !g.aim.x1 && !g.aim.y1) suggestAim(); }
        if (t.dataset.k === "crit.on") $(".gt-crit", form).hidden = !v;
        if (t.dataset.k === "xMode") {
          // Convert the aim line between session numbers and dates where possible.
          if (v === "calendar") { const d = i => g.rows[(+i || 1) - 1] && g.rows[(+i || 1) - 1].d; g.aim.x1 = d(g.aim.x1) || ""; g.aim.x2 = d(g.aim.x2) || ""; }
          else { const idx = s => { const k = g.rows.findIndex(r => r.d === s); return k >= 0 ? String(k + 1) : ""; }; g.aim.x1 = idx(g.aim.x1); g.aim.x2 = idx(g.aim.x2); }
          $("#g-ticks", form).closest("div").hidden = v === "calendar";
          renderAim(); renderRows();
        }
        if (t.dataset.k === "dateFmt") { settings.dateFmt = v; saveSettings(); }
        changed(); return;
      }
      if (t.dataset.sn !== undefined) { g.series[+t.dataset.sn].name = t.value; renderRowsHeadOnly(); changed(); return; }
      const ph = t.closest(".gt-phase");
      if (ph && t.dataset.p) {
        const i = +ph.dataset.i;
        if (t.dataset.p === "name") { g.phases[i].name = t.value; const dv = $$(".gt-divider span", form); const k = g.phases.slice(1, i).filter(p => p.start < g.rows.length).length; if (i > 0 && dv[k]) dv[k].textContent = t.value || "New phase"; }
        else { const n = Math.round(+t.value); if (n >= 2) g.phases[i].start = n - 1; }
        changed(); return;
      }
      const row = t.closest(".gt-row");
      if (row && !row.classList.contains("gt-head")) {
        const r = g.rows[+row.dataset.i];
        if (t.dataset.d !== undefined) r.d = t.value;
        else if (t.dataset.v !== undefined) { r.v[+t.dataset.v] = t.value.trim() === "" ? null : (GT.toNum(t.value) ?? t.value); t.classList.toggle("bad", t.value.trim() !== "" && GT.toNum(t.value) === null); }
        changed();
      }
    });
    function renderRowsHeadOnly() { const h = $(".gt-head", form); if (h) h.outerHTML = `<div class="gt-row gt-head" style="--ns:${g.series.length}" aria-hidden="true"><span>#</span><span>Date${g.xMode === "calendar" ? "" : " (optional)"}</span>${g.series.map((s, k) => `<span>${esc(g.series.length > 1 ? s.name || "Series " + (k + 1) : "Value")}</span>`).join("")}<span></span></div>`; }
    form.addEventListener("change", e => {
      const t = e.target;
      if (t.closest(".gt-phase") && t.dataset.p === "start") { renderPhases(); renderRows(); changed(); }
      if (t.id === "g-ns") {
        const n = +t.value;
        while (g.series.length < n) g.series.push({ name: "" });
        g.series.length = n;
        g.rows.forEach(r => { r.v = (r.v || []).slice(0, n); });
        renderSeriesNames(); renderRows(); changed();
      }
    });
    form.addEventListener("keydown", e => {
      if (e.key !== "Enter" || e.target.dataset.v === undefined) return;
      e.preventDefault();
      const i = +e.target.closest(".gt-row").dataset.i, k = e.target.dataset.v;
      if (i === g.rows.length - 1) addRow();
      const next = $(`.gt-row[data-i="${i + 1}"] [data-v="${k}"]`, form);
      next && next.focus();
    });
    function addRow() {
      const last = g.rows[g.rows.length - 1], prev = g.rows[g.rows.length - 2];
      let d = "";
      if (last && last.d) { const gap = prev && prev.d ? Math.max(1, GT.dayNum(last.d) - GT.dayNum(prev.d)) : 1; d = GT.addDays(last.d, Math.min(gap, 31)); }
      else if (!last && g.xMode === "calendar") d = today();
      g.rows.push({ d, v: g.series.map(() => null) });
      renderPhases(); renderRows(); changed();
    }
    mount.addEventListener("click", async e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      const a = b.dataset.a;
      if (a === "addRow") { addRow(); const last = $$(".gt-row [data-v='0']", form).pop(); last && last.focus(); }
      else if (a === "delRow") {
        const i = +b.closest(".gt-row").dataset.i;
        g.rows.splice(i, 1);
        g.phases = g.phases.map(p => ({ ...p, start: p.start > i ? p.start - 1 : p.start }));
        renderPhases(); renderRows(); changed();
      } else if (a === "addPhase") {
        const names = g.phases.map(p => p.name.toLowerCase());
        const name = !names.some(n => /interv|treat|tx/.test(n)) ? "Intervention" : names.length % 2 ? "Baseline" : "Intervention";
        const start = Math.max(g.rows.length, (g.phases[g.phases.length - 1].start || 0) + 1);
        g.phases.push({ name, start: Math.min(start, Math.max(g.rows.length, 1)) });
        if (g.phases[g.phases.length - 1].start <= g.phases[g.phases.length - 2].start) g.phases[g.phases.length - 1].start = g.phases[g.phases.length - 2].start + 1;
        renderPhases(); renderRows(); changed();
        const inp = $$(".gt-phase [data-p='name']", form).pop(); inp && inp.select();
        if (g.phases[g.phases.length - 1].start >= g.rows.length) toast("New phase added. It starts with the next session you add.");
      } else if (a === "delPhase") {
        g.phases.splice(+b.closest(".gt-phase").dataset.i, 1);
        renderPhases(); renderRows(); changed();
      } else if (a === "clear") {
        if (g.rows.length && !confirm("Clear all session data from this graph?")) return;
        g.rows = []; g.phases = [{ name: g.phases[0] ? g.phases[0].name : "Baseline", start: 0 }];
        renderPhases(); renderRows(); changed();
      } else if (a === "example") { load({ ...(GRAPH_PRESETS[preset] || GRAPH_PRESETS.ab)() }); lib.touch(); }
      else if (a === "import" || a === "append") {
        const txt = $("#g-paste", form).value, out = $(".gt-pastemsg", form);
        const r = GT.parsePaste(txt, { pref: g.dateFmt, defYear: new Date().getFullYear() });
        if (!r.rows.length) { out.textContent = r.warnings[0] || "No data rows found."; return; }
        const n = Math.min(3, Math.max(r.series.length, a === "append" ? g.series.length : 1));
        if (a === "import") {
          g.rows = r.rows.map(x => ({ d: x.d, v: x.v.slice(0, n) }));
          g.phases = r.phases.map(p => ({ name: p.name || (r.phases.length > 1 ? "" : g.phases[0].name), start: p.start }));
          g.series = Array.from({ length: n }, (_, i) => ({ name: n > 1 ? r.series[i] || "" : "" }));
          if (n === 1 && r.series[0] && !/^value|series/i.test(r.series[0])) g.yLabel = r.series[0];
          if (r.rows.every(x => x.d) && r.rows.length > 1) { const sp = GT.dayNum(r.rows[r.rows.length - 1].d) - GT.dayNum(r.rows[0].d); if (sp > r.rows.length * 2) g.xMode = "calendar"; }
        } else {
          const off = g.rows.length;
          while (g.series.length < n) g.series.push({ name: r.series[g.series.length] || "" });
          g.rows.push(...r.rows.map(x => ({ d: x.d, v: x.v })));
          r.phases.forEach((p, k) => { const last = g.phases[g.phases.length - 1]; if (k === 0 && (!p.name || p.name.toLowerCase() === (last.name || "").toLowerCase())) return; g.phases.push({ name: p.name, start: off + p.start }); });
        }
        load(g); lib.touch();
        out.textContent = `Imported ${r.rows.length} session${r.rows.length > 1 ? "s" : ""} in ${r.phases.length} phase${r.phases.length > 1 ? "s" : ""}.` + (r.warnings.length ? " " + r.warnings.slice(0, 3).join(" ") : "");
        track("data_pasted", { rows: r.rows.length });
      } else if (a === "suggestAim") suggestAim();
      else if (a === "png" || a === "pdf" || a === "csv") {
        const name = fileSlug((g.student ? g.student + " " : "") + (g.title || "aba graph")) || "aba-graph";
        try {
          b.disabled = true;
          if (a === "csv") download(new Blob([GT.graphCSV(g)], { type: "text/csv" }), name + ".csv");
          else {
            const sc = GT.graphScene(g, { w: 1000, h: 620 });
            if (a === "png") download(await GTR.png(sc, 2), name + ".png");
            else download(await GTR.graphPdf(sc, { paper: $("#g-paper", mount).value, summary: $("[data-s=summary]", mount).checked, note: $("#g-note", mount).value.trim(), title: g.title || "ABA graph" }), name + ".pdf");
          }
          track("graph_exported", { format: a });
        } catch (err) { toast("Export failed: " + err.message); }
        finally { b.disabled = false; }
      } else if (a === "copyNote") {
        const t = $("#g-note", mount).value;
        try { await navigator.clipboard.writeText(t); toast("Progress note copied."); } catch { $("#g-note", mount).select(); document.execCommand && document.execCommand("copy"); toast("Progress note copied."); }
      } else if (a === "resetNote") { noteEdited = false; g.note = ""; draw(); lib.touch(); }
    });
    $("#g-note", mount).addEventListener("input", e => { noteEdited = true; g.note = e.target.value; lib.touch(); });
    $("#g-paper", mount).value = settings.paper;
    $("#g-paper", mount).addEventListener("change", e => { settings.paper = e.target.value; saveSettings(); });
    let rw; window.addEventListener("resize", () => { clearTimeout(rw); rw = setTimeout(draw, 150); });
    lib.init();
  }

  // Offline support (PWA). Registered on every page; the worker only caches this site's own files.
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
  }
  const gm = document.getElementById("gt-graph");
  if (gm) GraphTool(gm);

  window.GTApp = { GraphTool, Lib, LS, settings, saveSettings, makeLibrary, toast, download, track, esc, today, clock, clone, graphFromSheet, titleOf, fileSlug, $, $$ };
})();
