/* GoalTally data-sheet builder (#gt-sheet): configurable sheets for every measurement type,
   PDF download and printing, and on-screen scoring that adds each session to the goal's graph. */
(() => {
  "use strict";
  const A = window.GTApp, GT = window.GT, GTS = window.GTS, GTR = window.GTR;
  const mount = document.getElementById("gt-sheet");
  if (!A || !mount) return;
  const { Lib, settings, saveSettings, makeLibrary, toast, download, track, esc, today, clock, clone, graphFromSheet, titleOf, fileSlug, $, $$ } = A;
  const show = GTS.show;

  const HELP = {
    trial: "One row per trial and one column per session. Score each trial + or –; the sheet works out % correct.",
    prompt: "Circle the level of help each trial needed, from full physical to independent. % independent is the main measure.",
    probe: "Test each target once at the start of a session, before teaching. Y means correct on the first try with no prompt.",
    task: "List the steps of a routine and score each step every session, then track % of steps done independently.",
    frequency: "Count each time the behavior happens. Add the minutes observed to turn counts into a rate.",
    duration: "Record how long each episode lasts. Total duration (or % of the session) is the measure.",
    latency: "Time from the end of an instruction to the start of the response, one row per opportunity.",
    partial: "Mark an interval if the behavior happens at any point in it. Best for brief or fast behaviors you want to reduce.",
    whole: "Mark an interval only if the behavior lasts the whole interval. Best for behaviors you want to increase, like on-task.",
    mts: "Look up only at the end of each interval and mark what you see at that moment. Lets one adult watch several students.",
    abc: "Log what happened right before and right after each incident to find patterns and possible functions.",
  };
  const PRESETS = {
    trial: { title: "Receptive ID of colors", goal: "Given a field of 3 colored cards and the instruction “Touch [color]”, the student will touch the correct card in 8 of 10 trials across 3 consecutive sessions." },
    prompt: { title: "Washing hands", goal: "" },
    probe: { title: "Receptive ID of common objects", targets: "Dog\nCat\nCup\nBall\nShoe\nCar\nSpoon\nBook", blankRows: 6 },
    task: { title: "Handwashing routine" },
    frequency: { behaviors: "Calling out without raising hand" },
    duration: { behaviors: "Tantrum (crying and dropping to the floor)" },
    latency: { behaviors: "Starting independent work after the instruction" },
    partial: { behaviors: "Off-task (looking away from work or talking to peers)" },
    whole: { behaviors: "On-task (eyes on work, pencil moving)" },
    mts: { behaviors: "Engaged with the activity" },
    abc: { behaviors: "Hitting\nThrowing materials\nScreaming" },
  };
  const presetCfg = t => ({ ...GTS.defaultSheet(t), ...(PRESETS[t] || {}) });
  const type0 = GTS.TYPES[mount.dataset.preset] ? mount.dataset.preset : "trial";
  let cfg = presetCfg(type0), sessions = [];

  const typeOptions = () => ["skill", "behavior", "interval", "abc"].map(gr => `<optgroup label="${{ skill: "Skill acquisition", behavior: "Behavior: count and time", interval: "Behavior: interval recording", abc: "Behavior: descriptive" }[gr]}">${GTS.ORDER.filter(t => GTS.TYPES[t].group === gr).map(t => `<option value="${t}">${esc(GTS.TYPES[t].name)}</option>`).join("")}</optgroup>`).join("");
  mount.innerHTML = `
  <div class="gt-lib"></div>
  <div class="gt gt-s">
    <div class="gt-main">
      <div class="gt-preview">
        <div class="gt-actions">
          <button type="button" class="btn" data-a="pdf">Download PDF</button>
          <button type="button" class="btn ghost" data-a="print">Print</button>
          <button type="button" class="btn ghost" data-a="score">Score a session on screen</button>
        </div>
        <div class="gt-recorded" hidden>
          <label class="gt-check"><input type="checkbox" data-fill> Fill the sheet with recorded sessions</label>
          <details class="gt-reclist"><summary>Recorded sessions (<span class="gt-reccount">0</span>)</summary><ol></ol></details>
        </div>
        <ul class="gt-warn" aria-live="polite"></ul>
        <div class="gt-pages" aria-label="Data sheet preview"></div>
      </div>
    </div>
    <form class="gt-form" autocomplete="off" novalidate>
      <label for="s-type">Measurement type</label>
      <select id="s-type" data-k="type">${typeOptions()}</select>
      <p class="hint gt-typehelp"></p>
      <div class="row">
        <div><label for="s-student">Student initials</label><input id="s-student" data-k="student" maxlength="16" placeholder="Initials only, e.g. J.D."></div>
        <div class="s-title"><label for="s-title">Target / skill</label><input id="s-title" data-k="title" placeholder="e.g. Receptive ID of colors"></div>
      </div>
      <div class="s-beh"><label for="s-beh">Behavior(s), one per line (up to 3)</label><textarea id="s-beh" data-k="behaviors" rows="2"></textarea></div>
      <label for="s-goal">Goal or objective (optional)</label><textarea id="s-goal" data-k="goal" rows="2" placeholder="Paste the IEP goal or program objective"></textarea>
      <div class="s-crit"><label for="s-crit">Mastery criterion</label><input id="s-crit" data-k="criterion"></div>
      <div class="s-def"><label for="s-def">Operational definition (optional)</label><textarea id="s-def" data-k="definition" rows="2" placeholder="What the behavior looks like, so any observer would score it the same way"></textarea></div>
      <h3>Sheet options</h3>
      <div class="s-opts"></div>
      <h3>Page</h3>
      <div class="row">
        <div><label for="s-paper">Paper</label><select id="s-paper" data-k="paper"><option value="letter">US Letter</option><option value="a4">A4</option></select></div>
        <div><label for="s-orient">Orientation</label><select id="s-orient" data-k="orient"><option value="auto">Automatic</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div>
      </div>
      <label class="gt-check"><input type="checkbox" data-k="notes"> Notes box at the bottom</label>
      <label class="gt-check s-codes"><input type="checkbox" data-k="printCodes"> Print the codes in each box (to circle)</label>
      <label for="s-df">Date format on filled sheets</label><select id="s-df" data-set="dateFmt"><option value="mdy">Month/day/year (US)</option><option value="dmy">Day/month/year</option></select>
      <label for="s-logo">School or clinic logo (optional)</label>
      <div class="gt-inline"><input type="file" id="s-logo" accept="image/png,image/jpeg"><button type="button" class="btn ghost sm" data-a="noLogo" hidden>Remove logo</button></div>
      <p class="hint">The logo is stored only in this browser and printed at the top right of every sheet.</p>
    </form>
  </div>
  <dialog class="gt-score" aria-labelledby="sc-h"></dialog>`;
  const form = $(".gt-form", mount), pagesEl = $(".gt-pages", mount);

  const lib = makeLibrary($(".gt-lib", mount), {
    kind: "sheet",
    collect: () => ({ state: cfg }),
    merge(goal, st) {
      goal.sheet = clone(st.state); goal.type = st.state.type; goal.student = st.state.student; goal.title = titleOf(st.state);
      if (goal.graph) { goal.graph.student = goal.student; goal.graph.title = goal.title; }
    },
    open(goal) {
      sessions = goal.sessions || [];
      const t = goal.sheet ? goal.sheet.type : cfg.type;
      load(goal.sheet || { ...GTS.defaultSheet(t), student: goal.student || "", title: goal.title || "" });
    },
    load: s => { sessions = []; load(s); },
    blank: first => { sessions = []; load(first ? presetCfg(type0) : { ...GTS.defaultSheet(cfg.type), paper: cfg.paper }); },
    restored: () => {},
  });

  function load(state) {
    cfg = { ...GTS.defaultSheet(state.type), ...clone(state) };
    sync(); renderOpts(); draw();
  }
  function sync() {
    for (const el of $$("[data-k]", form)) { if (el.closest(".s-opts")) continue; const v = cfg[el.dataset.k]; if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? ""; }
    $("#s-df", form).value = settings.dateFmt;
    const grp = GTS.TYPES[cfg.type].group;
    $(".s-title", form).hidden = grp !== "skill";
    $(".s-crit", form).hidden = grp !== "skill";
    $(".s-def", form).hidden = grp === "skill";
    $(".s-beh", form).hidden = grp === "skill";
    $(".s-codes", form).hidden = grp !== "skill";
    $("label[for=s-beh]", form).textContent = cfg.type === "abc" ? "Behaviors of concern, one per line (ticked on the sheet)" : "Behavior(s), one per line (up to 3)";
    const T = GTS.TYPES[cfg.type];
    const here = location.pathname === T.path;
    $(".gt-typehelp", form).innerHTML = esc(HELP[cfg.type]) + (here ? "" : ` <a href="${T.path}">How to use a ${esc(T.name.replace(/ \(.*\)$/, "").toLowerCase())} sheet</a>`);
    $("[data-a=noLogo]", form).hidden = !settings.logo;
    $("[data-a=score]", mount).hidden = cfg.type === "abc";
  }
  const num = (k, label, min, max, hint = "") => `<div><label for="so-${k}">${label}</label><input id="so-${k}" type="number" min="${min}" max="${max}" step="1" data-k="${k}" value="${esc(cfg[k])}">${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
  const sel = (k, label, opts) => `<div><label for="so-${k}">${label}</label><select id="so-${k}" data-k="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(cfg[k]) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select></div>`;
  const ta = (k, label, rows, ph = "") => `<label for="so-${k}">${label}</label><textarea id="so-${k}" data-k="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(cfg[k])}</textarea>`;
  const chk = (k, label) => `<label class="gt-check"><input type="checkbox" data-k="${k}"${cfg[k] ? " checked" : ""}> ${label}</label>`;
  function renderOpts() {
    const c = cfg, row = (...x) => `<div class="row">${x.join("")}</div>`;
    let h = "";
    switch (c.type) {
      case "trial": h = row(num("trials", "Trials per session", 1, 40), num("sessions", "Session (date) columns", 1, 31)) + row(sel("codes", "Scoring codes", [["+-", "+ / –"], ["+-P", "+ / P (prompted) / –"], ["YN", "Y / N"]]), "<div></div>"); break;
      case "prompt": h = row(num("trials", "Trials per session", 1, 40), num("sessions", "Session (date) columns", 1, 31)) + ta("prompts", "Prompt hierarchy: code = meaning, one per line", 6); break;
      case "probe": h = ta("targets", "Targets, one per line", 5, "e.g. Dog\nCat\nCup") + row(num("blankRows", "Extra blank rows", 0, 60), num("sessions", "Probe date columns", 1, 31)) + chk("introCol", "Add a “Date introduced” column"); break;
      case "task": h = ta("steps", "Steps of the task, one per line", 6) + row(num("sessions", "Session (date) columns", 1, 31), sel("chaining", "Chaining method", [["total", "Total task"], ["forward", "Forward chaining"], ["backward", "Backward chaining"]])) + row(sel("scoring", "Score each step with", [["prompt", "Prompt levels"], ["+-", "+ / –"]]), "<div></div>") + (c.scoring !== "+-" ? ta("prompts", "Prompt hierarchy: code = meaning, one per line", 6) : ""); break;
      case "frequency": h = row(sel("rate", "Convert counts to", [["hour", "Rate per hour"], ["min", "Rate per minute"], ["none", "Count only"]]), num("rows", "Rows (0 = fill the page)", 0, 200)); break;
      case "duration": h = row(num("episodes", "Episode boxes per row", 1, 10), sel("graphAs", "Graph it as", [["minutes", "Total minutes"], ["percent", "% of time observed"]])) + row(num("rows", "Rows (0 = fill the page)", 0, 200), "<div></div>"); break;
      case "latency": h = row(num("rows", "Rows (0 = fill the page)", 0, 300), "<div></div>"); break;
      case "partial": case "whole": case "mts": {
        const ii = GTS.intervalInfo(c);
        h = row(`<div><label for="so-interval">Interval length (seconds)</label><input id="so-interval" type="number" min="5" max="1800" step="1" list="so-ivals" data-k="interval" value="${esc(c.interval)}"><datalist id="so-ivals">${[5, 10, 15, 20, 30, 60, 120, 300].map(v => `<option value="${v}">`).join("")}</datalist></div>`, num("minutes", "Observation length (minutes)", 1, 240)) +
          row(num("perPage", "Observations per page", 1, 4), `<div><p class="hint gt-ivinfo">${ii.n} intervals of ${ii.sec >= 60 && ii.sec % 60 === 0 ? ii.sec / 60 + " min" : ii.sec + " s"} per observation.</p></div>`);
        break;
      }
      case "abc": h = row(sel("layout", "Layout", [["checklist", "Checklist (tick boxes)"], ["narrative", "Narrative (write-in)"]]), num("rows", "Rows (0 = fill the page)", 0, 60)) + (c.layout === "checklist" ? ta("antecedents", "Antecedent options, one per line", 5) + ta("consequences", "Consequence options, one per line", 5) : "") + chk("functionCol", "Add a “Possible function” column"); break;
    }
    $(".s-opts", form).innerHTML = h;
  }
  const fillOn = () => $("[data-fill]", mount).checked;
  const mySessions = () => sessions.filter(s => !s.type || s.type === cfg.type);
  function build() { return GTS.sheetPages({ ...cfg, dateFmt: settings.dateFmt }, { logo: settings.logo, sessions: fillOn() ? mySessions() : [] }); }
  let raf = 0;
  function changed() { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); lib.touch(); }
  function draw() {
    const sp = build();
    pagesEl.innerHTML = sp.pages.map((p, i) => `<figure class="gt-page" style="aspect-ratio:${sp.w}/${sp.h}">${GTR.svg({ w: sp.w, h: sp.h, items: p.items }, { label: `${GTS.TYPES[cfg.type].title}, page ${i + 1} of ${sp.pages.length}` })}</figure>${sp.pages.length > 1 ? `<p class="gt-pagelabel">Page ${i + 1} of ${sp.pages.length}</p>` : ""}`).join("");
    $(".gt-warn", mount).innerHTML = sp.info.warnings.map(w => `<li>${esc(w)}</li>`).join("");
    const mine = mySessions();
    $(".gt-recorded", mount).hidden = !mine.length;
    $(".gt-reccount", mount).textContent = mine.length;
    $(".gt-reclist ol", mount).innerHTML = mine.map(s => { const v = GTS.sessionValues(cfg, s); return `<li>${esc(GT.fmtDate(s.date, settings.dateFmt))}: ${v.map(x => GT.isNum(x) ? GT.fmtNum(x, 1) : "–").join(" / ")}${unitOf()} <button type="button" class="gt-x" data-del="${esc(s.id)}" aria-label="Delete the session from ${esc(GT.fmtDate(s.date, settings.dateFmt))}">×</button></li>`; }).join("");
    const ii = $(".gt-ivinfo", form);
    if (ii) { const x = GTS.intervalInfo(cfg); ii.textContent = `${x.n} intervals of ${x.sec >= 60 && x.sec % 60 === 0 ? x.sec / 60 + " min" : x.sec + " s"} per observation.`; }
  }
  const unitOf = () => /percent/i.test(GTS.graphSetup(cfg).yLabel) ? "%" : "";

  form.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.set === "dateFmt") { settings.dateFmt = t.value; saveSettings(); changed(); return; }
    const k = t.dataset.k; if (!k) return;
    if (k === "type") return; // handled on change
    let v = t.type === "checkbox" ? t.checked : t.value;
    if (t.type === "number") v = t.value === "" ? "" : +t.value;
    cfg[k] = v;
    if (k === "student" || k === "title" || k === "behaviors") { /* library label updates on save */ }
    changed();
  });
  form.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.k === "type") {
      const nt = t.value;
      const rec = sessions.filter(s => s.type === cfg.type).length;
      if (rec && !confirm(`This goal has ${rec} recorded ${GTS.TYPES[cfg.type].name.toLowerCase()} session${rec > 1 ? "s" : ""}. They stay saved, but only fill sheets of that type. Switch anyway?`)) { t.value = cfg.type; return; }
      const keep = { student: cfg.student, title: cfg.title, goal: cfg.goal, paper: cfg.paper, notes: cfg.notes };
      const fresh = GTS.defaultSheet(nt);
      cfg = { ...fresh, ...keep, behaviors: GTS.TYPES[nt].group === "skill" ? fresh.behaviors : (GTS.TYPES[cfg.type].group !== "skill" && cfg.behaviors) || (PRESETS[nt] && PRESETS[nt].behaviors) || fresh.behaviors };
      if (nt === "probe" && !cfg.targets) cfg.targets = "";
      sync(); renderOpts(); changed();
      return;
    }
    if (["scoring", "layout"].includes(t.dataset.k)) { renderOpts(); }
    if (t.id === "s-logo") {
      const f = t.files[0]; if (!f) return;
      readLogo(f).then(l => { settings.logo = l; if (!saveSettings()) { settings.logo = null; toast("That image is too large to store. Try a smaller PNG or JPG."); } sync(); draw(); }).catch(() => toast("Couldn't read that image. Use a PNG or JPG."));
      t.value = "";
    }
    if (t.matches("[data-fill]")) draw();
  });
  function readLogo(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onerror = rej;
      r.onload = () => {
        const img = new Image();
        img.onerror = rej;
        img.onload = () => {
          const s = Math.min(1, 600 / img.naturalWidth, 200 / img.naturalHeight);
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          res({ src: c.toDataURL("image/png"), w: c.width, h: c.height, fmt: "PNG" });
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  /* ---------- Print: the preview pages are exact page-size SVGs ---------- */
  function printSheet() {
    const sp = build();
    const st = document.createElement("style");
    st.id = "gt-print-size";
    st.textContent = `@page{size:${(sp.w / 72).toFixed(3)}in ${(sp.h / 72).toFixed(3)}in;margin:0}`;
    document.head.appendChild(st);
    document.body.classList.add("gt-printing");
    const done = () => { document.body.classList.remove("gt-printing"); st.remove(); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    track("sheet_printed", { type: cfg.type });
    window.print();
  }

  mount.addEventListener("click", async e => {
    const del = e.target.closest("[data-del]");
    if (del) { removeSession(del.dataset.del); return; }
    const b = e.target.closest("[data-a]"); if (!b || !mount.contains(b)) return;
    const a = b.dataset.a;
    if (a === "pdf") {
      try {
        b.disabled = true;
        const sp = build();
        const name = fileSlug(`${GTS.TYPES[cfg.type].title.replace(/ data sheet/i, "")} ${cfg.student} ${cfg.title}`) || "data-sheet";
        download(await GTR.sheetsPdf([sp], `${GTS.TYPES[cfg.type].title}${cfg.student ? " - " + cfg.student : ""}`), name + ".pdf");
        track("sheet_exported", { type: cfg.type });
      } catch (err) { toast("PDF failed: " + err.message); }
      finally { b.disabled = false; }
    } else if (a === "print") printSheet();
    else if (a === "score") openScore();
    else if (a === "noLogo") { settings.logo = null; saveSettings(); sync(); draw(); }
  });
  function removeSession(id) {
    const g = lib.id && Lib.get(lib.id); if (!g) return;
    const s = (g.sessions || []).find(x => x.id === id); if (!s) return;
    if (!confirm(`Delete the ${GT.fmtDate(s.date, settings.dateFmt)} session? Its point is also removed from the graph.`)) return;
    g.sessions = g.sessions.filter(x => x.id !== id);
    if (g.graph) {
      const i = g.graph.rows.findIndex(r => r.sid === id);
      if (i >= 0) { g.graph.rows.splice(i, 1); g.graph.phases = g.graph.phases.map(p => ({ ...p, start: p.start > i ? p.start - 1 : p.start })).filter((p, k, arr) => k === 0 || p.start < g.graph.rows.length || k === arr.length - 1); }
    }
    Lib.put(g); sessions = g.sessions; draw();
  }

  /* ---------- On-screen scoring ---------- */
  const dlg = $(".gt-score", mount);
  let S = null, timers = [];
  const stopTimers = () => { timers.forEach(t => clearInterval(t)); timers = []; };
  let audio;
  function beep() {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); const o = audio.createOscillator(), gn = audio.createGain(); o.frequency.value = 880; gn.gain.value = 0.15; o.connect(gn); gn.connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.15); } catch {}
    try { navigator.vibrate && navigator.vibrate(120); } catch {}
  }
  function scoreRows() {
    if (cfg.type === "task") { const st = GTS.lines(cfg.steps); return st.map((s, i) => `${i + 1}. ${s}`); }
    if (cfg.type === "probe") return GTS.lines(cfg.targets);
    return Array.from({ length: GT.clamp(+cfg.trials || 10, 1, 40) }, (_, i) => `Trial ${i + 1}`);
  }
  function openScore() {
    stopTimers();
    const g = lib.id && Lib.get(lib.id);
    const graph = g && g.graph;
    const lastPhase = graph && graph.phases && graph.phases.length ? GT.normPhases(graph.phases, graph.rows.length).pop().name : "";
    S = { type: cfg.type, date: today(), staff: "", phaseMode: "continue", newPhase: graph ? "Intervention" : "Baseline", cells: [], counts: GTS.behaviorsOf(cfg).map(() => 0), episodes: [], lat: [], marks: GTS.behaviorsOf(cfg).map(() => []), cur: 0, run: null, t0: 0, elapsed: 0, minutes: "", start: "", end: "", epStart: null, sdAt: null, n: GTS.intervalInfo(cfg).n };
    const grp = GTS.TYPES[cfg.type].group;
    const T = GTS.TYPES[cfg.type];
    const rows = grp === "skill" ? scoreRows() : [];
    if (grp === "skill" && !rows.length) { toast(cfg.type === "probe" ? "Add your targets in Sheet options first." : "Add the steps first."); return; }
    let body = "";
    if (grp === "skill") {
      const codes = GTS.codesFor(cfg).codes;
      body = `<div class="sc-list">${rows.map((r, i) => `<div class="sc-row"><span class="sc-lab">${esc(r)}</span><div class="sc-codes" role="group" aria-label="${esc(r)}">${codes.map(c => `<button type="button" class="sc-code" data-r="${i}" data-c="${esc(c)}" aria-pressed="false">${esc(show(c))}</button>`).join("")}</div></div>`).join("")}</div>`;
    } else if (cfg.type === "frequency") {
      body = `<div class="sc-counts">${GTS.behaviorsOf(cfg).map((b, i) => `<div class="sc-count"><span class="sc-bname">${esc(b || "Behavior")}</span><div class="sc-cbtns"><button type="button" class="sc-big" data-plus="${i}" aria-label="Add one: ${esc(b || "behavior")}">+1</button><output class="sc-num" data-cnt="${i}">0</output><button type="button" class="btn ghost sm" data-minus="${i}" aria-label="Remove one: ${esc(b || "behavior")}">−1</button></div></div>`).join("")}</div>` + timerHTML();
    } else if (cfg.type === "duration") {
      body = `<div class="sc-dur"><button type="button" class="sc-big wide" data-ep>Start episode</button><output class="sc-epclock">0:00</output></div>
        <div class="gt-inline"><label for="sc-man">Or add an episode (m:ss)</label><input id="sc-man" class="sc-man" placeholder="1:30" inputmode="numeric"><button type="button" class="btn ghost sm" data-addep>Add</button></div>
        <ol class="sc-eps"></ol>` + timerHTML();
    } else if (cfg.type === "latency") {
      body = `<div class="sc-dur"><button type="button" class="sc-big wide" data-sd>Instruction given</button><button type="button" class="btn ghost" data-nr disabled>No response</button><output class="sc-epclock">0.0 s</output></div>
        <div class="gt-inline"><label for="sc-man">Or type a latency (seconds)</label><input id="sc-man" class="sc-man" inputmode="decimal" placeholder="4.5"><button type="button" class="btn ghost sm" data-addlat>Add</button></div>
        <ol class="sc-eps"></ol>`;
    } else if (grp === "interval") {
      const L = GTS.intervalInfo(cfg), beh = GTS.behaviorsOf(cfg);
      body = `<div class="sc-ivbar"><button type="button" class="btn" data-iv="go">Start timer</button><button type="button" class="btn ghost" data-iv="reset">Reset</button>
          <output class="sc-ivclock">0:00 · interval 1 of ${L.n}</output>
          <label class="gt-check"><input type="checkbox" data-sound checked> Beep at each interval</label></div>
        ${beh.length > 1 ? `<div class="sc-behsel" role="radiogroup" aria-label="Behavior to mark">${beh.map((b, i) => `<label class="gt-check"><input type="radio" name="sc-beh" value="${i}"${i ? "" : " checked"}> ${String.fromCharCode(65 + i)}: ${esc(b || "Behavior")}</label>`).join("")}</div>` : ""}
        <p class="hint">${esc(cfg.type === "mts" ? "At the beep, look at the student and tap the box only if the behavior is happening at that moment." : cfg.type === "whole" ? "Tap a box if the behavior lasted for the entire interval." : "Tap a box if the behavior happened at any time during that interval.")} You can also tap boxes without the timer.</p>
        <div class="sc-grid" style="--cols:${GTS.intervalLayout({ w: 612, h: 792 }, cfg).C}">${Array.from({ length: L.n }, (_, i) => `<button type="button" class="sc-iv" data-i="${i}" aria-pressed="false" aria-label="Interval ${i + 1}, ends at ${GT.fmtClock((i + 1) * L.sec)}"><span>${GT.fmtClock((i + 1) * L.sec)}</span><b></b></button>`).join("")}</div>
        <div class="gt-inline"><label for="sc-n">Intervals observed</label><input id="sc-n" type="number" min="1" max="${L.n}" value="${L.n}" data-n></div>`;
    }
    dlg.innerHTML = `<form method="dialog" class="sc-in" novalidate>
      <header class="sc-head"><h3 id="sc-h">Score a session · ${esc(T.name.replace(/ \(.*\)$/, ""))}</h3><button type="button" class="sc-x" data-close aria-label="Close">×</button></header>
      <div class="sc-meta">
        <div><label for="sc-date">Date</label><input id="sc-date" type="date" value="${S.date}" data-m="date"></div>
        <div><label for="sc-staff">Staff initials</label><input id="sc-staff" maxlength="8" data-m="staff"></div>
        <div><label for="sc-ph">On the graph</label><select id="sc-ph" data-m="phaseMode"><option value="continue">${lastPhase ? "Continue “" + esc(lastPhase) + "”" : "First phase (Baseline)"}</option><option value="new">Start a new phase…</option></select></div>
        <div class="sc-newph" hidden><label for="sc-np">New phase name</label><input id="sc-np" data-m="newPhase" value="${esc(S.newPhase)}"></div>
      </div>
      <div class="sc-body">${body}</div>
      <p class="sc-sum" aria-live="polite"></p>
      <footer class="sc-foot"><button type="button" class="btn" data-save>Save session</button><button type="button" class="btn ghost" data-close>Cancel</button>
      <span class="small muted">${g ? "Adds a point to this goal's graph." : "Saves this goal on this device and starts its graph."}</span></footer>
    </form>`;
    updateSum();
    dlg.showModal();
  }
  function timerHTML() {
    return `<div class="sc-timer"><button type="button" class="btn ghost" data-timer>Start observation timer</button><output class="sc-elapsed">0:00</output>
      <div><label for="sc-min">Minutes observed</label><input id="sc-min" type="number" min="0" step="0.1" data-m="minutes"></div>
      <div><label for="sc-st">Start time</label><input id="sc-st" data-m="start" placeholder="9:00"></div>
      <div><label for="sc-en">End time</label><input id="sc-en" data-m="end" placeholder="9:30"></div></div>`;
  }
  function sessionObj() {
    const base = { id: Math.random().toString(36).slice(2, 10), type: cfg.type, date: S.date || today(), staff: S.staff.trim() };
    const t = cfg.type, grp = GTS.TYPES[t].group;
    if (grp === "skill") return { ...base, cells: scoreRows().map((_, i) => S.cells[i] ?? null) };
    if (t === "frequency") return { ...base, counts: S.counts.slice(), minutes: +S.minutes || 0, start: S.start, end: S.end };
    if (t === "duration") return { ...base, episodes: S.episodes.slice(), obsMin: +S.minutes || 0, start: S.start };
    if (t === "latency") return { ...base, lat: S.lat.slice() };
    return { ...base, start: S.start, n: GT.clamp(+S.n || GTS.intervalInfo(cfg).n, 1, GTS.intervalInfo(cfg).n), marks: S.marks.map(m => Array.from({ length: GTS.intervalInfo(cfg).n }, (_, i) => m[i] ? 1 : 0)) };
  }
  function updateSum() {
    if (!S) return;
    const s = sessionObj(), v = GTS.sessionValues(cfg, s), t = cfg.type, grp = GTS.TYPES[t].group;
    let txt = "";
    if (grp === "skill") { const c = GTS.codesFor(cfg), cl = s.cells.filter(x => x !== null); txt = `${cl.filter(x => c.good.includes(x)).length} of ${cl.length} scored ${t === "probe" ? "Yes" : t === "trial" ? "correct" : "independent"} · ${GT.isNum(v[0]) ? GT.fmtNum(v[0], 1) + "%" : "–"} (${s.cells.length - cl.length} not scored)`; }
    else if (t === "frequency") txt = GTS.behaviorsOf(cfg).map((b, i) => `${b || "Count"}: ${s.counts[i]}${cfg.rate !== "none" ? (GT.isNum(v[i]) ? ` = ${GT.fmtNum(v[i], 2)} per ${cfg.rate === "min" ? "minute" : "hour"}` : " (enter minutes observed for a rate)") : ""}`).join(" · ");
    else if (t === "duration") { const tot = s.episodes.reduce((a, b) => a + b, 0); txt = `${s.episodes.length} episode${s.episodes.length === 1 ? "" : "s"} · total ${GT.fmtClock(tot)}${cfg.graphAs === "percent" ? (GT.isNum(v[0]) ? ` · ${GT.fmtNum(v[0], 1)}% of time` : " (enter minutes observed for %)") : ""}`; }
    else if (t === "latency") txt = `${s.lat.length} trial${s.lat.length === 1 ? "" : "s"} · mean latency ${GT.isNum(v[0]) ? GT.fmtNum(v[0], 1) + " s" : "–"}`;
    else txt = GTS.behaviorsOf(cfg).map((b, i) => `${GTS.behaviorsOf(cfg).length > 1 ? String.fromCharCode(65 + i) + ": " : ""}${s.marks[i].slice(0, s.n).filter(Boolean).length} of ${s.n} intervals = ${GT.fmtNum(v[i], 1)}%`).join(" · ");
    $(".sc-sum", dlg).textContent = txt;
  }
  const parseClock = s => { const m = String(s).trim().match(/^(?:(\d+):)?(\d{1,2})(?:\.(\d))?$/); if (!m) return null; return (+(m[1] || 0)) * 60 + (+m[2]) + (m[3] ? +m[3] / 10 : 0); };
  function renderEps() {
    const ol = $(".sc-eps", dlg); if (!ol) return;
    const list = cfg.type === "duration" ? S.episodes.map(v => GT.fmtClock(v)) : S.lat.map(v => GT.isNum(v) ? GT.fmtNum(v, 1) + " s" : "No response");
    ol.innerHTML = list.map((t, i) => `<li>${t} <button type="button" class="gt-x" data-rmep="${i}" aria-label="Remove ${cfg.type === "duration" ? "episode" : "trial"} ${i + 1}">×</button></li>`).join("");
  }
  function startObsTimer() {
    if (S.run) { // stop
      S.elapsed += (performance.now() - S.t0) / 1000; S.run = null; stopTimers();
      S.end = clock(); S.minutes = String(GT.round(S.elapsed / 60, 1));
      $("[data-m=end]", dlg).value = S.end; $("[data-m=minutes]", dlg).value = S.minutes;
      $("[data-timer]", dlg).textContent = "Resume timer"; updateSum(); return;
    }
    S.run = true; S.t0 = performance.now();
    if (!S.start) { S.start = clock(); $("[data-m=start]", dlg).value = S.start; }
    $("[data-timer]", dlg).textContent = "Stop timer";
    timers.push(setInterval(() => {
      const el = S.elapsed + (performance.now() - S.t0) / 1000;
      $(".sc-elapsed", dlg).textContent = GT.fmtClock(el);
      S.minutes = String(GT.round(el / 60, 1)); $("[data-m=minutes]", dlg).value = S.minutes; updateSum();
    }, 250));
  }
  function ivTick() {
    const L = GTS.intervalInfo(cfg);
    const el = S.elapsed + (performance.now() - S.t0) / 1000;
    const cur = Math.min(L.n - 1, Math.floor(el / L.sec));
    if (cur !== S.cur) { if ($("[data-sound]", dlg).checked) beep(); const prevBtn = $(`.sc-iv[data-i="${S.cur}"]`, dlg); prevBtn && prevBtn.classList.add("flash"); setTimeout(() => prevBtn && prevBtn.classList.remove("flash"), 600); S.cur = cur; }
    $$(".sc-iv", dlg).forEach(b => b.classList.toggle("now", +b.dataset.i === S.cur));
    $(".sc-ivclock", dlg).textContent = `${GT.fmtClock(el)} · interval ${S.cur + 1} of ${L.n}`;
    if (el >= L.n * L.sec) { if ($("[data-sound]", dlg).checked) beep(); toggleIv(true); $(".sc-ivclock", dlg).textContent = `Done · ${L.n} intervals`; }
  }
  function toggleIv(forceStop) {
    const L = GTS.intervalInfo(cfg), btn = $("[data-iv=go]", dlg);
    if (S.run || forceStop) {
      if (S.run) S.elapsed += (performance.now() - S.t0) / 1000;
      S.run = null; stopTimers(); btn.textContent = "Resume timer";
      const done = Math.min(L.n, Math.ceil(S.elapsed / L.sec - 1e-9));
      if (done > 0 && done < L.n) { S.n = done; $("[data-n]", dlg).value = done; }
      updateSum(); return;
    }
    S.run = true; S.t0 = performance.now(); if (!S.start) S.start = clock();
    btn.textContent = "Pause timer";
    timers.push(setInterval(ivTick, 200)); ivTick();
  }
  dlg.addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.close !== undefined) { stopTimers(); dlg.close(); return; }
    if (t.classList.contains("sc-code")) {
      const r = +t.dataset.r, c = t.dataset.c;
      S.cells[r] = S.cells[r] === c ? null : c;
      $$(`.sc-code[data-r="${r}"]`, dlg).forEach(b => b.setAttribute("aria-pressed", String(S.cells[r] === b.dataset.c)));
      updateSum(); return;
    }
    if (t.dataset.plus !== undefined) { const i = +t.dataset.plus; S.counts[i]++; $(`[data-cnt="${i}"]`, dlg).textContent = S.counts[i]; updateSum(); return; }
    if (t.dataset.minus !== undefined) { const i = +t.dataset.minus; S.counts[i] = Math.max(0, S.counts[i] - 1); $(`[data-cnt="${i}"]`, dlg).textContent = S.counts[i]; updateSum(); return; }
    if (t.dataset.timer !== undefined) { startObsTimer(); return; }
    if (t.dataset.ep !== undefined) {
      if (S.epStart === null) {
        S.epStart = performance.now(); t.textContent = "Stop episode"; t.classList.add("on");
        if (!S.start) { S.start = clock(); const st = $("[data-m=start]", dlg); if (st) st.value = S.start; }
        timers.push(setInterval(() => { if (S.epStart !== null) $(".sc-epclock", dlg).textContent = GT.fmtClock((performance.now() - S.epStart) / 1000); }, 250));
      } else {
        const sec = Math.max(1, Math.round((performance.now() - S.epStart) / 1000));
        S.episodes.push(sec); S.epStart = null; t.textContent = "Start episode"; t.classList.remove("on");
        renderEps(); updateSum();
      }
      return;
    }
    if (t.dataset.addep !== undefined) { const v = parseClock($(".sc-man", dlg).value); if (v === null || v <= 0) { toast("Type the episode length as minutes:seconds, e.g. 1:30."); return; } S.episodes.push(Math.round(v)); $(".sc-man", dlg).value = ""; renderEps(); updateSum(); return; }
    if (t.dataset.sd !== undefined) {
      if (S.sdAt === null) {
        S.sdAt = performance.now(); t.textContent = "Response started"; t.classList.add("on"); $("[data-nr]", dlg).disabled = false;
        timers.push(setInterval(() => { if (S.sdAt !== null) $(".sc-epclock", dlg).textContent = GT.fmtNum((performance.now() - S.sdAt) / 1000, 1) + " s"; }, 100));
      } else {
        S.lat.push(GT.round((performance.now() - S.sdAt) / 1000, 1)); S.sdAt = null; stopTimers();
        t.textContent = "Instruction given"; t.classList.remove("on"); $("[data-nr]", dlg).disabled = true; renderEps(); updateSum();
      }
      return;
    }
    if (t.dataset.nr !== undefined) { S.lat.push(null); S.sdAt = null; stopTimers(); const sd = $("[data-sd]", dlg); sd.textContent = "Instruction given"; sd.classList.remove("on"); t.disabled = true; renderEps(); updateSum(); return; }
    if (t.dataset.addlat !== undefined) { const v = GT.toNum($(".sc-man", dlg).value); if (v === null || v < 0) { toast("Type the latency in seconds, e.g. 4.5."); return; } S.lat.push(v); $(".sc-man", dlg).value = ""; renderEps(); updateSum(); return; }
    if (t.dataset.rmep !== undefined) { (cfg.type === "duration" ? S.episodes : S.lat).splice(+t.dataset.rmep, 1); renderEps(); updateSum(); return; }
    if (t.dataset.iv === "go") { toggleIv(); return; }
    if (t.dataset.iv === "reset") { stopTimers(); S.run = null; S.elapsed = 0; S.cur = 0; S.start = ""; $("[data-iv=go]", dlg).textContent = "Start timer"; $$(".sc-iv", dlg).forEach(b => b.classList.remove("now")); $(".sc-ivclock", dlg).textContent = `0:00 · interval 1 of ${GTS.intervalInfo(cfg).n}`; return; }
    if (t.classList.contains("sc-iv")) {
      const i = +t.dataset.i, sel = $("input[name=sc-beh]:checked", dlg), b = sel ? +sel.value : 0;
      S.marks[b][i] = S.marks[b][i] ? 0 : 1;
      const on = S.marks.map(m => !!m[i]);
      t.setAttribute("aria-pressed", String(on.some(Boolean)));
      t.querySelector("b").textContent = GTS.behaviorsOf(cfg).length > 1 ? on.map((x, k) => x ? String.fromCharCode(65 + k) : "").join("") : on[0] ? "X" : "";
      updateSum(); return;
    }
    if (t.dataset.save !== undefined) saveSession();
  });
  dlg.addEventListener("input", e => {
    const m = e.target.dataset.m;
    if (m) { S[m] = e.target.value; if (m === "phaseMode") $(".sc-newph", dlg).hidden = e.target.value !== "new"; updateSum(); }
    if (e.target.dataset.n !== undefined) { S.n = +e.target.value; updateSum(); }
  });
  dlg.addEventListener("change", e => { if (e.target.dataset.m === "phaseMode") $(".sc-newph", dlg).hidden = e.target.value !== "new"; });
  dlg.addEventListener("close", stopTimers);
  dlg.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.classList.contains("sc-man")) { e.preventDefault(); const add = $("[data-addep],[data-addlat]", dlg); add && add.click(); } });

  function saveSession() {
    const s = sessionObj(), vals = GTS.sessionValues(cfg, s);
    if (!s.date) { toast("Pick a date for the session."); return; }
    if (vals.every(v => v === null)) {
      const why = GTS.TYPES[cfg.type].group === "skill" ? "Score at least one row first." : cfg.type === "frequency" ? "Enter the minutes observed (or choose Count only)." : cfg.type === "duration" && cfg.graphAs === "percent" ? "Enter the minutes observed." : "Record at least one value first.";
      toast(why); return;
    }
    let g = lib.id && Lib.get(lib.id);
    if (!g) {
      if (!cfg.student && !confirm("Save this goal without student initials? You can add them later.")) return;
      g = lib.saveNew(true); if (!g) return;
    }
    g.sessions = g.sessions || [];
    g.sessions.push(s);
    if (!g.graph) g.graph = graphFromSheet(cfg);
    const gr = g.graph;
    const su = GTS.graphSetup(cfg);
    while (gr.series.length < Math.min(3, vals.length)) gr.series.push({ name: su.series[gr.series.length] ? su.series[gr.series.length].name : "" });
    gr.phases = GT.normPhases(gr.phases, gr.rows.length).map(({ name, start }) => ({ name, start }));
    if (S.phaseMode === "new" && gr.rows.length) gr.phases.push({ name: (S.newPhase || "Intervention").trim(), start: gr.rows.length });
    else if (S.phaseMode === "new" && !gr.rows.length) gr.phases[0].name = (S.newPhase || "Baseline").trim();
    gr.rows.push({ d: s.date, v: vals.slice(0, 3), sid: s.id });
    Lib.put(g); sessions = g.sessions;
    stopTimers(); dlg.close();
    lib.refresh(); draw();
    const unit = unitOf();
    toast("", `Session saved: ${esc(vals.map(v => GT.isNum(v) ? GT.fmtNum(v, 1) + unit : "–").join(" / "))}. Point ${gr.rows.length} added to the graph. <a href="/?goal=${encodeURIComponent(g.id)}">Open the graph</a>`);
    track("session_scored", { type: cfg.type });
  }

  lib.init();
})();
