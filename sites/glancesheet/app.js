/* GlanceSheet UI: caseload list, student editor, one-page fit check, backup, and the PDFs (single, batch, matrix, 504, sub).
   Everything stays in this browser (localStorage). Nothing typed is uploaded; analytics events carry only the kind of PDF. */
(function () {
  "use strict";
  const G = window.GSCore;
  const root = document.getElementById("gs-tool");
  if (!G || !root) return;
  const preset = root.dataset.preset || "";
  const $ = (s, el) => (el || root).querySelector(s);
  const $$ = (s, el) => Array.from((el || root).querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const track = (name, data) => { try { if (window.va) window.va("event", data ? { name, data } : { name }); } catch (e) { /* ignore */ } };
  const KEY = "glancesheet:v1";
  const today = G.todayISO();

  /* -------------------------------------------------------------- state */
  let ST = G.emptyState();
  let storageOk = true, prevState = null, pendingDel = null, confirmAll = false, libJ = null, measureDoc = null, fitTimer = 0;
  const view = { version: preset === "504" ? "504" : preset === "sub" ? "sub" : "std" };
  const openSec = new Set(preset === "sub" ? ["basics", "strengths", "helps", "watch", "accom", "contacts"] : ["basics", "strengths", "helps", "watch", "accom"]);
  try { const raw = localStorage.getItem(KEY); if (raw) ST = G.normalizeState(JSON.parse(raw)); } catch (e) { /* first visit or blocked storage */ }
  if (preset === "504") view.newPlan = "504";
  const cur = () => ST.students.find(s => s.id === ST.sel) || null;
  const idxOf = s => ST.students.indexOf(s);
  const labelOf = s => G.labelOf(s, ST.settings.initialsOnly, idxOf(s));
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, settings: ST.settings, students: ST.students, sel: ST.sel })); storageOk = true; }
    catch (e) { if (storageOk) { storageOk = false; say("#gs-datamsg", "This browser would not save your caseload (private mode or full storage). Export a backup so you don't lose it.", "gs-err"); } }
  }
  function say(sel, html, cls) { const el = $(sel); if (el) el.innerHTML = html ? `<p class="${cls || ""}">${html}</p>` : ""; }

  /* ------------------------------------------------------------ templates */
  const SEC_HELP = {
    strengths: "What the student is good at and likes. One per line.",
    helps: "Strategies that work. One per line.",
    watch: "Triggers or early signs that something is getting hard. One per line.",
  };
  const showBox = (key, label) => `<label class="gs-chk gs-showbox"><input type="checkbox" data-show="${key}"> <span>${label || "Print this section"}</span></label>`;
  const inp = (id, label, key, type, extra) => `<div><label for="gs-${id}">${label}</label><input id="gs-${id}" data-f="${key}" type="${type || "text"}" autocomplete="off" ${extra || ""}></div>`;
  const sec = (key, title, body, hint) => `<details class="gs-sec" data-sec="${key}"${openSec.has(key) ? " open" : ""}><summary>${title}${hint ? ` <small>${hint}</small>` : ""}</summary><div class="gs-secbody">${body}</div></details>`;
  const listArea = (key, id, label) => `${showBox(key)}<label for="gs-${id}">${label}</label><textarea id="gs-${id}" data-f="${key}" rows="4" maxlength="3000"></textarea><p class="small muted gs-help">${SEC_HELP[key]}</p>`;

  function skeleton() {
    root.innerHTML = `<div class="gs" data-preset="${esc(preset)}">
  <div class="gs-col gs-left">
    <section class="gs-card gs-case" aria-labelledby="gs-h-case">
      <h2 class="gs-h" id="gs-h-case">Your caseload</h2>
      <label class="gs-chk"><input type="checkbox" id="gs-ini" data-set="initialsOnly"> <span><b>Initials only on printed sheets</b><small>Recommended. Sheets show initials instead of names. Full names are optional and never required.</small></span></label>
      <div id="gs-list" class="gs-list"></div>
      <div class="gs-btns"><button class="btn sm" type="button" id="gs-add">Add student</button><button class="btn ghost sm" type="button" id="gs-pickall" data-pickall="1">Tick all</button><button class="btn ghost sm" type="button" data-pickall="0">Untick all</button></div>
      <p class="small muted">Tick students to include them in the caseload PDF and the class matrix.</p>
    </section>
    <section class="gs-card gs-outcard" id="gs-out" aria-labelledby="gs-h-out">
      <h2 class="gs-h" id="gs-h-out">Make your PDFs</h2>
      <fieldset class="gs-ver"><legend>Sheet version</legend>
        <label class="gs-radio"><input type="radio" name="gs-ver" value="std"> <span>Standard<small>IEP students get the full sheet; 504 students get the 504 sheet.</small></span></label>
        <label class="gs-radio"><input type="radio" name="gs-ver" value="504"> <span>504 Plan at a Glance<small>The same sheet without goals and services.</small></span></label>
        <label class="gs-radio"><input type="radio" name="gs-ver" value="sub"> <span>Sub &amp; para version<small>Only strengths, what helps, watch for, accommodations and contacts. No dates, goals or services.</small></span></label>
      </fieldset>
      <div class="gs-row2"><div><label for="gs-paper">Paper size</label><select id="gs-paper" data-set="paper"><option value="letter">US Letter</option><option value="a4">A4</option></select></div></div>
      <div class="gs-btns"><button class="btn" type="button" data-pdf="single" id="gs-dl-single">Download this student's sheet</button><button class="btn ghost" type="button" data-pdf="batch" id="gs-dl-batch">Download caseload (one page each)</button></div>
      <div class="gs-matrix" id="gs-matrixbox"><h3>Class accommodations matrix</h3>
        <p class="small muted">For a general education teacher: rows are the ticked students, columns are the accommodations any of them use. Landscape.</p>
        <label for="gs-class">Class name (optional)</label><input id="gs-class" data-set="className" maxlength="60" placeholder="Period 3 Math" autocomplete="off">
        <div class="gs-btns"><button class="btn" type="button" data-pdf="matrix" id="gs-dl-matrix">Download class matrix</button></div>
      </div>
      <div id="gs-pdfmsg" class="gs-msg" role="status" aria-live="polite"></div>
      <p class="small muted">PDFs are made in your browser. They print student information, so store and share them the way your district says to. Text outside Latin letters may print as ?.</p>
    </section>
    <section class="gs-card gs-datacard" aria-labelledby="gs-h-data">
      <h2 class="gs-h" id="gs-h-data">Backup and your data</h2>
      <p class="small muted">Your caseload is saved automatically in this browser only. Nothing is uploaded. Export a backup to reload next year or move to another computer.</p>
      <div class="gs-btns"><button class="btn ghost sm" type="button" id="gs-export">Export backup (JSON)</button><input type="file" id="gs-import" class="sr" accept=".json,application/json"><label for="gs-import" class="btn ghost sm gs-filebtn">Import backup</label></div>
      <p class="small muted">Importing replaces the caseload shown here.</p>
      <div id="gs-datamsg" class="gs-msg" role="status" aria-live="polite"></div>
      <div class="gs-danger"><div id="gs-delarea"></div><p class="small muted">On a shared or school computer, export a backup if you need one, then use this button before you leave.</p></div>
    </section>
  </div>
  <div class="gs-col gs-right">
    <section class="gs-card gs-edcard" aria-labelledby="gs-h-ed"><h2 class="gs-h" id="gs-h-ed">Student details</h2><div id="gs-fit" class="gs-fit" role="status" aria-live="polite"></div><div id="gs-editor"></div></section>
  </div>
</div>`;
  }

  function editorHtml(s) {
    const plan = s.plan === "504" ? "504" : "IEP";
    const basics = `<div class="gs-grid2">${inp("name", "Full name (optional)", "name", "text", 'maxlength="80"')}${inp("initials", "Initials (printed when initials-only is on)", "initials", "text", 'maxlength="8"')}</div>
      <div class="gs-grid3">${inp("grade", "Grade", "grade", "text", 'maxlength="12"')}${inp("year", "School year", "year", "text", 'maxlength="16"')}
      <fieldset class="gs-plan"><legend>Plan type</legend><label class="gs-radio"><input type="radio" name="gs-plan" data-f="plan" value="iep"> <span>IEP</span></label><label class="gs-radio"><input type="radio" name="gs-plan" data-f="plan" value="504"> <span>504 plan</span></label></fieldset></div>
      <div class="gs-grid2">${inp("cm", "Case manager", "caseManager", "text", 'maxlength="80"')}${inp("contact", "Case manager contact (email or extension)", "contact", "text", 'maxlength="100"')}</div>
      ${showBox("dates", "Print the dates below")}
      <div class="gs-grid3">
        <div>${inp("meeting", "Plan meeting date", "meeting", "date").slice(5, -6)}</div>
        <div>${inp("annual", "Annual review due", "annual", "date").slice(5, -6)}<div class="gs-due" data-due="annual"></div></div>
        <div>${inp("reeval", "Re-evaluation due", "reeval", "date").slice(5, -6)}<div class="gs-due" data-due="reeval"></div></div>
      </div>
      <label class="gs-chk"><input type="checkbox" data-f="printCountdown"> <span>Also print "due in N days" next to the dates<small>Off by default. It goes out of date once printed.</small></span></label>
      <div class="gs-sub">${showBox("eligibility", "Print the eligibility category")}
        ${inp("elig", "Eligibility category (optional)", "eligibility", "text", 'maxlength="100"')}
        <p class="small muted gs-help">Sensitive. Leave it off the printout unless the people reading the sheet need it and your school allows it.</p></div>`;
    const accom = `${showBox("accom")}
      <p class="small muted gs-help">Accommodations change <em>how</em> a student learns or shows learning. Tick the ones in the plan.</p>
      <label for="gs-accsearch">Search accommodations</label><input id="gs-accsearch" type="search" autocomplete="off" placeholder="e.g. extended time, calculator, seating">
      <p class="small" id="gs-acccount" aria-live="polite"></p>
      <div id="gs-acclist">${G.CATEGORIES.map(c => `<fieldset class="gs-cat" data-cat="${c.id}"><legend>${esc(c.name)}</legend>${G.ACCOMMODATIONS.filter(a => a.cat === c.id).map(a => `<label class="gs-chk gs-acc" data-text="${esc(a.text.toLowerCase())}"><input type="checkbox" data-acc="${a.id}"> <span>${esc(a.text)}</span></label>`).join("")}</fieldset>`).join("")}</div>
      <div class="gs-custom"><label for="gs-custom">Add your own accommodation</label><div class="gs-linkrow"><input id="gs-custom" maxlength="100" autocomplete="off" placeholder="A short plain phrase"><button class="btn ghost sm" type="button" id="gs-custom-add">Add</button></div><ul class="gs-chips" id="gs-customlist"></ul></div>`;
    const mods = `${showBox("mods")}<p class="small muted gs-help">Modifications change <em>what</em> a student is expected to learn or do, such as a different or reduced learning target. They are not the same as accommodations, so keep them separate.</p><label for="gs-mods">Modifications</label><textarea id="gs-mods" data-f="mods" rows="3" maxlength="3000"></textarea><p class="small muted gs-help">One per line.</p>`;
    const goals = `${showBox("goals")}<p class="small muted gs-help">A one- or two-line summary of each goal, not the full wording. Not printed on the 504 or sub sheets.</p><div id="gs-goals"></div><button class="btn ghost sm" type="button" data-add="goals">Add a goal</button>`;
    const services = `${showBox("services")}<p class="small muted gs-help">Not printed on the 504 or sub sheets.</p><div id="gs-services"></div><button class="btn ghost sm" type="button" data-add="services">Add a service</button>
      <fieldset class="gs-rel"><legend>Related services</legend>${G.RELATED.map(([k, t]) => `<label class="gs-chk"><input type="checkbox" data-rel="${k}"> <span>${t}</span></label>`).join("")}</fieldset>`;
    const support = `${showBox("bip", "Print the behavior plan line")}<label class="gs-chk"><input type="checkbox" data-f="bip"> <span>This student has a behavior intervention plan (BIP)</span></label>
      <div class="gs-sub">${showBox("health", "Print the health and safety note")}<label for="gs-health">Health or safety note (optional, keep it short)</label><textarea id="gs-health" data-f="health" rows="2" maxlength="400"></textarea>
      <p class="small muted gs-help">Follow your school's health-plan process for medical information. Only write what the adults in the room need to act safely.</p></div>`;
    const contacts = `${showBox("contacts")}<p class="small muted gs-help">School staff roles only, for example case manager, counselor or speech-language pathologist.</p><div id="gs-contacts"></div><button class="btn ghost sm" type="button" data-add="contacts">Add a contact</button>`;
    return [
      sec("basics", `Basics and dates <small>${plan}</small>`, basics),
      sec("strengths", "Strengths and interests", listArea("strengths", "strengths", "Strengths and interests")),
      sec("helps", "What helps", listArea("helps", "helps", "What helps")),
      sec("watch", "Watch for", listArea("watch", "watch", "Watch for")),
      sec("accom", "Accommodations", accom, `<span id="gs-accbadge"></span>`),
      sec("mods", "Modifications", mods),
      sec("goals", "Goals", goals),
      sec("services", "Services", services),
      sec("support", "Behavior plan and health notes", support),
      sec("contacts", "Key contacts", contacts),
    ].join("");
  }
  const rowGoal = (g, i) => `<div class="gs-rowbox" data-row="goals"><div class="gs-grid-g"><div><label for="gs-ga${i}">Area</label><select id="gs-ga${i}" data-l="goals" data-i="${i}" data-k="area">${G.GOAL_AREAS.map(a => `<option${a === g.area ? " selected" : ""}>${esc(a)}</option>`).join("")}</select></div>
    <div><label for="gs-gt${i}">Goal summary</label><textarea id="gs-gt${i}" data-l="goals" data-i="${i}" data-k="text" rows="2" maxlength="400">${esc(g.text)}</textarea></div></div><button class="btn ghost sm" type="button" data-del="goals" data-i="${i}">Remove goal ${i + 1}</button></div>`;
  const rowService = (v, i) => `<div class="gs-rowbox" data-row="services"><div class="gs-grid-s">
    <div class="gs-s-name"><label for="gs-sn${i}">Service</label><input id="gs-sn${i}" list="gs-svc" data-l="services" data-i="${i}" data-k="name" maxlength="80" value="${esc(v.name)}" autocomplete="off"></div>
    <div><label for="gs-sm${i}">Minutes</label><input id="gs-sm${i}" type="number" min="0" max="3000" inputmode="numeric" data-l="services" data-i="${i}" data-k="min" value="${esc(v.min)}"></div>
    <div><label for="gs-sf${i}">How often</label><select id="gs-sf${i}" data-l="services" data-i="${i}" data-k="per">${G.FREQS.map(([k, t]) => `<option value="${k}"${k === v.per ? " selected" : ""}>${t}</option>`).join("")}</select></div>
    <div><label for="gs-ss${i}">Setting</label><select id="gs-ss${i}" data-l="services" data-i="${i}" data-k="setting">${G.SETTINGS.map(([k, t]) => `<option value="${k}"${k === v.setting ? " selected" : ""}>${t}</option>`).join("")}</select></div>
    <div><label for="gs-sr${i}">Provider role</label><input id="gs-sr${i}" data-l="services" data-i="${i}" data-k="role" maxlength="60" value="${esc(v.role)}" autocomplete="off"></div></div>
    <button class="btn ghost sm" type="button" data-del="services" data-i="${i}">Remove service ${i + 1}</button></div>`;
  const rowContact = (c, i) => `<div class="gs-rowbox" data-row="contacts"><div class="gs-grid2"><div><label for="gs-cr${i}">Role</label><input id="gs-cr${i}" data-l="contacts" data-i="${i}" data-k="role" maxlength="60" value="${esc(c.role)}" autocomplete="off"></div>
    <div><label for="gs-cw${i}">Name or extension</label><input id="gs-cw${i}" data-l="contacts" data-i="${i}" data-k="who" maxlength="100" value="${esc(c.who)}" autocomplete="off"></div></div><button class="btn ghost sm" type="button" data-del="contacts" data-i="${i}">Remove contact ${i + 1}</button></div>`;

  /* ------------------------------------------------------------- rendering */
  function renderList() {
    const el = $("#gs-list");
    if (!ST.students.length) {
      el.innerHTML = `<p class="gs-empty">No students yet. Add one, or <button class="gs-link" type="button" id="gs-example">load an example caseload</button> (three made-up students) to see how it works.</p>`;
      return;
    }
    el.innerHTML = `<ol class="gs-roster">${ST.students.map((s, i) => {
      const lab = esc(labelOf(s)), on = s.id === ST.sel;
      const meta = [s.grade ? "Grade " + esc(s.grade) : "", s.plan === "504" ? "504" : "IEP"].filter(Boolean).join(" · ");
      let acts = "";
      if (on) {
        acts = pendingDel === s.id
          ? `<div class="gs-acts" role="group" aria-label="Confirm delete"><span class="small">Delete ${lab}?</span><button class="btn sm gs-bad" type="button" data-act="delyes">Yes, delete</button><button class="btn ghost sm" type="button" data-act="delno">Cancel</button></div>`
          : `<div class="gs-acts" role="group" aria-label="Actions for ${lab}"><button class="btn ghost sm" type="button" data-act="up"${i === 0 ? " disabled" : ""}>Move up</button><button class="btn ghost sm" type="button" data-act="down"${i === ST.students.length - 1 ? " disabled" : ""}>Move down</button><button class="btn ghost sm" type="button" data-act="dup">Duplicate</button><button class="btn ghost sm" type="button" data-act="del">Delete</button></div>`;
      }
      return `<li class="gs-st${on ? " is-sel" : ""}"><div class="gs-st-main"><input type="checkbox" data-pick="${s.id}" aria-label="Include ${lab} in the caseload PDF and matrix"${s.pick ? " checked" : ""}><button type="button" class="gs-pick" data-open="${s.id}" aria-pressed="${on}"><span class="gs-nm">${lab}</span><small>${meta}</small></button></div>${acts}</li>`;
    }).join("")}</ol>`;
  }
  function fillEditor() {
    const s = cur(), ed = $("#gs-editor");
    if (!s) { ed.innerHTML = `<p class="gs-empty">Add a student to start. Each student gets their own sheet.</p>`; $("#gs-fit").textContent = ""; return; }
    ed.innerHTML = `<datalist id="gs-svc"><option value="Specially designed instruction (reading)"><option value="Specially designed instruction (writing)"><option value="Specially designed instruction (math)"><option value="Speech-language therapy"><option value="Occupational therapy"><option value="Physical therapy"><option value="Counseling"><option value="Co-teaching support"><option value="Paraprofessional support"></datalist>` + editorHtml(s);
    $$("[data-f]", ed).forEach(el => {
      const v = s[el.dataset.f];
      if (el.type === "checkbox") el.checked = !!v;
      else if (el.type === "radio") el.checked = el.value === v;
      else el.value = v == null ? "" : v;
    });
    $$("[data-show]", ed).forEach(el => { el.checked = !!s.show[el.dataset.show]; });
    $$("[data-rel]", ed).forEach(el => { el.checked = !!s.related[el.dataset.rel]; });
    $$("[data-acc]", ed).forEach(el => { el.checked = s.accom.includes(el.dataset.acc); });
    fillRows(); fillCustom(); updateAcc(); updateDue();
    $("#gs-initials").placeholder = G.initialsOf(s.name) || "e.g. AB";
  }
  function fillRows() {
    const s = cur(); if (!s) return;
    $("#gs-goals").innerHTML = s.goals.length ? s.goals.map(rowGoal).join("") : `<p class="small muted">No goals added.</p>`;
    $("#gs-services").innerHTML = s.services.length ? s.services.map(rowService).join("") : `<p class="small muted">No services added.</p>`;
    $("#gs-contacts").innerHTML = s.contacts.length ? s.contacts.map(rowContact).join("") : `<p class="small muted">No contacts added.</p>`;
  }
  function fillCustom() {
    const s = cur(); if (!s) return;
    $("#gs-customlist").innerHTML = s.custom.map((c, i) => `<li><span>${esc(c)}</span><button type="button" class="gs-x" data-delcustom="${i}" aria-label="Remove ${esc(c)}">Remove</button></li>`).join("");
  }
  function updateAcc() {
    const s = cur(); if (!s) return;
    const n = s.accom.length + s.custom.length;
    const b = $("#gs-accbadge"); if (b) b.textContent = n ? `${n} selected` : "";
    const c = $("#gs-acccount"); if (c) c.textContent = `${n} selected${n > 12 ? ". A long list is harder for a busy teacher to use; keep the ones that matter most." : ""}`;
  }
  function updateDue() {
    const s = cur(); if (!s) return;
    $$("[data-due]").forEach(el => { const t = G.dueText(s[el.dataset.due], today); el.textContent = t; el.className = "gs-due" + (/overdue/.test(t) ? " is-over" : /in [0-9]+ day/.test(t) && parseInt(t.replace(/\D/g, ""), 10) <= 60 ? " is-soon" : ""); });
  }
  function filterAcc() {
    const q = ($("#gs-accsearch").value || "").trim().toLowerCase();
    $$(".gs-acc").forEach(l => { l.hidden = !!q && !l.dataset.text.includes(q); });
    $$(".gs-cat").forEach(f => { f.hidden = !$$(".gs-acc:not([hidden])", f).length; });
  }
  function renderControls() {
    $("#gs-ini").checked = ST.settings.initialsOnly;
    $("#gs-paper").value = ST.settings.paper;
    $("#gs-class").value = ST.settings.className;
    $$('input[name="gs-ver"]').forEach(r => { r.checked = r.value === view.version; });
    const picks = ST.students.filter(s => s.pick).length, one = !!cur();
    $("#gs-dl-single").disabled = !one;
    $("#gs-dl-batch").disabled = !picks;
    $("#gs-dl-batch").textContent = `Download caseload (${picks} page${picks === 1 ? "" : "s"})`;
    $("#gs-dl-matrix").disabled = !picks;
    $("#gs-dl-matrix").textContent = `Download class matrix (${picks} student${picks === 1 ? "" : "s"})`;
    $("#gs-delarea").innerHTML = confirmAll
      ? `<p class="small"><b>Delete every student and setting saved in this browser?</b> This cannot be undone. Export a backup first if you might need it.</p><div class="gs-btns"><button class="btn sm gs-bad" type="button" id="gs-delyes">Yes, delete everything</button><button class="btn ghost sm" type="button" id="gs-delno">Cancel</button></div>`
      : `<button class="btn ghost sm gs-bad-o" type="button" id="gs-delall">Delete all data from this browser</button>`;
  }
  function renderAll() { renderList(); fillEditor(); renderControls(); scheduleFit(); }

  /* ------------------------------------------------------------- fit check */
  function scheduleFit() { clearTimeout(fitTimer); fitTimer = setTimeout(runFit, 250); }
  function runFit() {
    const out = $("#gs-fit"), s = cur();
    if (!out) return;
    if (!s) { out.textContent = ""; out.className = "gs-fit"; return; }
    if (!libJ) { out.textContent = ""; return; }
    if (!measureDoc) measureDoc = G.measureDoc(libJ);
    const variant = G.resolveVariant(s, view.version);
    const p = G.planSheet(measureDoc, s, variant, { paper: ST.settings.paper, initialsOnly: ST.settings.initialsOnly, index: idxOf(s), today });
    const title = G.TITLES[variant];
    if (!p.hasSections) { out.className = "gs-fit"; out.textContent = `${title}: nothing to print yet. Add details below.`; return; }
    if (!p.fits) {
      out.className = "gs-fit is-bad";
      out.innerHTML = `<b>Too much for one page</b> even at ${G.FS_MIN} pt. Trim: ${p.overflow.map(o => esc(o.name)).join(", ")}. The PDF will shorten ${p.overflow.length === 1 ? "that section" : "those sections"} and say "More in the full plan" rather than add a second page.`;
    } else if (p.shrunk) { out.className = "gs-fit is-warn"; out.textContent = `${title}: fits on one page. Text shrunk slightly to ${p.fs} pt to fit.`; }
    else { out.className = "gs-fit is-ok"; out.textContent = `${title}: fits on one page at ${p.fs} pt.`; }
  }

  /* ---------------------------------------------------------------- events */
  function changed() { persist(); renderListSoft(); scheduleFit(); }
  function renderListSoft() { // update names/meta in the roster without losing focus in the editor
    const active = document.activeElement;
    if (active && active.closest && active.closest("#gs-list")) return;
    renderList(); renderControls();
  }
  function onField(e) {
    const el = e.target, s = cur();
    if (el.id === "gs-import") { if (e.type === "change") importFile(el); return; }
    if (el.dataset.set) {
      const k = el.dataset.set;
      ST.settings[k] = el.type === "checkbox" ? el.checked : el.value;
      if (k === "className") ST.settings.className = el.value.slice(0, 60);
      persist(); renderList(); scheduleFit(); return;
    }
    if (el.name === "gs-ver") { view.version = el.value; scheduleFit(); return; }
    if (el.id === "gs-accsearch") { filterAcc(); return; }
    if (!s) return;
    if (el.dataset.pick) { const t = ST.students.find(x => x.id === +el.dataset.pick); if (t) { t.pick = el.checked; persist(); renderControls(); } return; }
    if (el.dataset.f) {
      const k = el.dataset.f;
      if (el.type === "radio") { if (!el.checked) return; s[k] = el.value; }
      else s[k] = el.type === "checkbox" ? el.checked : el.value;
      if (k === "name") $("#gs-initials").placeholder = G.initialsOf(s.name) || "e.g. AB";
      if (k === "meeting" || k === "annual" || k === "reeval") { if (!G.isoOk(s[k])) s[k] = ""; updateDue(); }
      if (k === "plan") { const sm = $('[data-sec="basics"] summary small'); if (sm) sm.textContent = s.plan === "504" ? "504" : "IEP"; }
      changed(); return;
    }
    if (el.dataset.show) { s.show[el.dataset.show] = el.checked; changed(); return; }
    if (el.dataset.rel) { s.related[el.dataset.rel] = el.checked; changed(); return; }
    if (el.dataset.acc) {
      const id = el.dataset.acc, has = s.accom.includes(id);
      if (el.checked && !has) s.accom.push(id); else if (!el.checked && has) s.accom = s.accom.filter(x => x !== id);
      updateAcc(); changed(); return;
    }
    if (el.dataset.l) {
      const row = s[el.dataset.l][+el.dataset.i]; if (!row) return;
      row[el.dataset.k] = el.dataset.k === "min" ? (el.value === "" ? "" : Math.max(0, Math.min(3000, Math.round(+el.value) || 0))) : el.value;
      changed();
    }
  }
  root.addEventListener("input", onField);
  root.addEventListener("change", onField);
  root.addEventListener("toggle", e => { const d = e.target; if (d.dataset && d.dataset.sec) { if (d.open) openSec.add(d.dataset.sec); else openSec.delete(d.dataset.sec); } }, true);
  root.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "gs-custom") { e.preventDefault(); addCustom(); } });

  function newStudent(extra) {
    if (ST.students.length >= G.LIMITS.students) { say("#gs-datamsg", `The list is limited to ${G.LIMITS.students} students per browser.`, "gs-err"); return null; }
    const s = G.blankStudent(G.nextId(ST.students), Object.assign({ year: G.schoolYear(today), plan: view.newPlan || "iep" }, extra || {}));
    ST.students.push(s); ST.sel = s.id; return s;
  }
  function selectStudent(id, scroll) {
    ST.sel = id; pendingDel = null; persist(); renderAll();
    if (scroll && window.innerWidth < 940) { const h = $("#gs-h-ed"); if (h) h.scrollIntoView({ block: "start" }); }
  }
  function addCustom() {
    const s = cur(), i = $("#gs-custom"), v = i.value.replace(/\s+/g, " ").trim();
    if (!s || !v) return;
    if (s.custom.length >= G.LIMITS.custom) return;
    if (!s.custom.some(c => c.toLowerCase() === v.toLowerCase())) s.custom.push(v.slice(0, 100));
    i.value = ""; fillCustom(); updateAcc(); changed(); i.focus();
  }
  root.addEventListener("click", e => {
    const b = e.target.closest("button, label.gs-filebtn"); if (!b) return;
    const s = cur(), id = b.id;
    if (b.dataset.open) { selectStudent(+b.dataset.open, true); return; }
    if (id === "gs-add") { newStudent(); persist(); renderAll(); const n = $("#gs-name"); if (n) { if (window.innerWidth < 940) n.scrollIntoView({ block: "center" }); n.focus({ preventScroll: true }); } return; }
    if (id === "gs-example") { let first = null; G.exampleStudents().forEach(x => { const s2 = newStudent(); if (s2) { Object.assign(s2, x, { id: s2.id }); first = first || s2.id; } }); if (first) ST.sel = first; persist(); renderAll(); return; }
    if (b.dataset.pickall) { ST.students.forEach(t => { t.pick = b.dataset.pickall === "1"; }); persist(); renderList(); renderControls(); return; }
    if (b.dataset.act && s) {
      const i = idxOf(s);
      if (b.dataset.act === "up" && i > 0) ST.students.splice(i - 1, 0, ST.students.splice(i, 1)[0]);
      else if (b.dataset.act === "down" && i < ST.students.length - 1) ST.students.splice(i + 1, 0, ST.students.splice(i, 1)[0]);
      else if (b.dataset.act === "dup") { const c = G.normalizeStudent(JSON.parse(JSON.stringify(s)), G.nextId(ST.students)); c.id = G.nextId(ST.students); if (c.name) c.name += " (copy)"; else if (c.initials) c.initials += "2"; ST.students.splice(i + 1, 0, c); ST.sel = c.id; }
      else if (b.dataset.act === "del") { pendingDel = s.id; renderList(); const y = $('[data-act="delyes"]'); if (y) y.focus(); return; }
      else if (b.dataset.act === "delno") { pendingDel = null; renderList(); const d = $('[data-act="del"]'); if (d) d.focus(); return; }
      else if (b.dataset.act === "delyes") { ST.students.splice(i, 1); pendingDel = null; ST.sel = ST.students.length ? ST.students[Math.min(i, ST.students.length - 1)].id : null; persist(); renderAll(); say("#gs-pdfmsg", ""); return; }
      persist(); renderAll(); return;
    }
    if (b.dataset.add && s) {
      const k = b.dataset.add, list = s[k], cap = G.LIMITS[k];
      if (list.length >= cap) return;
      list.push(k === "goals" ? { area: "Reading", text: "" } : k === "services" ? { name: "", min: "", per: "week", setting: "spec", role: "" } : { role: "", who: "" });
      fillRows(); persist(); scheduleFit();
      const rows = $$(`[data-row="${k}"]`), last = rows[rows.length - 1]; if (last) { const f = last.querySelector("input,textarea,select"); if (f) f.focus(); }
      return;
    }
    if (b.dataset.del && s) { s[b.dataset.del].splice(+b.dataset.i, 1); fillRows(); persist(); scheduleFit(); return; }
    if (b.dataset.delcustom != null && s) { s.custom.splice(+b.dataset.delcustom, 1); fillCustom(); updateAcc(); changed(); return; }
    if (id === "gs-custom-add") { addCustom(); return; }
    if (id === "gs-export") { exportBackup(); return; }
    if (id === "gs-delall") { confirmAll = true; renderControls(); const y = $("#gs-delyes"); if (y) y.focus(); return; }
    if (id === "gs-delno") { confirmAll = false; renderControls(); const d = $("#gs-delall"); if (d) d.focus(); return; }
    if (id === "gs-delyes") { deleteAll(); return; }
    if (id === "gs-undo") { if (prevState) { ST = prevState; prevState = null; persist(); renderAll(); say("#gs-datamsg", "Import undone.", "gs-ok"); } return; }
    if (b.dataset.pdf) makePdf(b.dataset.pdf, b);
  });

  /* ---------------------------------------------------------------- backup */
  function saveBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  function exportBackup() {
    saveBlob(new Blob([G.makeBackup(ST, today)], { type: "application/json" }), `glancesheet-backup-${today}.json`);
    say("#gs-datamsg", "Backup saved to your device. It contains the names and notes you typed, so keep it somewhere private.", "gs-ok");
  }
  async function importFile(input) {
    const f = input.files && input.files[0];
    input.value = "";
    if (!f) return;
    const r = G.parseBackup(await f.text());
    if (!r.ok) { say("#gs-datamsg", esc(r.error), "gs-err"); return; }
    prevState = ST; ST = r.state; pendingDel = null; persist(); renderAll();
    $("#gs-datamsg").innerHTML = `<p class="gs-ok">Backup loaded: ${ST.students.length} student${ST.students.length === 1 ? "" : "s"}. <button class="gs-link" type="button" id="gs-undo">Undo</button></p>`;
  }
  function deleteAll() {
    try { Object.keys(localStorage).filter(k => k.indexOf("glancesheet") === 0).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    ST = G.emptyState(); prevState = null; confirmAll = false; pendingDel = null;
    renderAll(); say("#gs-pdfmsg", "");
    say("#gs-datamsg", "Everything saved by GlanceSheet in this browser has been deleted. PDFs and backups you downloaded earlier are separate files on your device.", "gs-ok");
  }

  /* ------------------------------------------------------------------ PDFs */
  const scripts = {};
  function loadScript(src, ready) {
    if (ready()) return Promise.resolve(ready());
    if (!scripts[src]) scripts[src] = new Promise((res, rej) => {
      const el = document.createElement("script");
      el.src = src; el.async = true;
      el.onload = () => (ready() ? res(ready()) : rej(new Error("load")));
      el.onerror = () => { delete scripts[src]; rej(new Error("Couldn't load the PDF library. Check your connection and try again.")); };
      document.head.appendChild(el);
    });
    return scripts[src];
  }
  const jsPDF = () => loadScript("/vendor/jspdf-4.2.1.umd.min.js", () => window.jspdf && window.jspdf.jsPDF).then(J => { libJ = J; return J; });
  const slug = s => (G.initialsFor(s) || "student").toLowerCase().replace(/[^a-z0-9]+/g, "") || "student";
  const entries = list => list.map(s => ({ s, i: idxOf(s) }));
  function trimNotes(plans, list) {
    const bad = plans.map((p, k) => (p.fits ? "" : `${esc(G.labelOf(list[k], ST.settings.initialsOnly, idxOf(list[k])))}: ${p.overflow.map(o => esc(o.name)).join(", ")}`)).filter(Boolean);
    return bad.length ? `<br><b>Heads up:</b> not everything fit on one page, so these were shortened (each says "More in the full plan"): ${bad.join("; ")}.` : "";
  }
  async function makePdf(kind, btn) {
    const paper = ST.settings.paper, paperName = paper === "a4" ? "A4" : "US Letter";
    const list = kind === "single" ? [cur()].filter(Boolean) : ST.students.filter(s => s.pick);
    if (!list.length) { say("#gs-pdfmsg", kind === "single" ? "Add a student first." : "Tick at least one student in your caseload.", "gs-err"); return; }
    if (btn) btn.disabled = true;
    try {
      const J = await jsPDF();
      let doc, name, extra = "", ev = kind;
      const opts = { paper, initialsOnly: ST.settings.initialsOnly, mode: view.version, today };
      if (kind === "matrix") {
        const r = G.matrixPdf(J, entries(list), { paper, initialsOnly: ST.settings.initialsOnly, className: ST.settings.className });
        doc = r.doc; name = "glancesheet-accommodations-matrix.pdf";
        extra = ` ${r.layout.pages.length} page${r.layout.pages.length === 1 ? "" : "s"}, ${r.model.cols.length} accommodations.`;
      } else {
        const r = G.sheetPdf(J, entries(list), opts);
        doc = r.doc;
        const v = G.resolveVariant(list[0], view.version);
        name = kind === "single" ? `glancesheet-${slug(list[0])}-${v}.pdf` : "glancesheet-caseload.pdf";
        if (kind === "single") ev = G.kindOf(v);
        extra = trimNotes(r.plans, list);
      }
      saveBlob(doc.output("blob"), name);
      say("#gs-pdfmsg", `Saved <b>${esc(name)}</b>. Print at 100% (Actual size) on ${paperName}.${extra}`, "gs-ok");
      if (window.va) track("pdf_download", { kind: ev });
    } catch (e) {
      say("#gs-pdfmsg", esc(e.message || "Something went wrong making that PDF."), "gs-err");
    } finally { if (btn) { btn.disabled = false; renderControls(); } }
  }

  /* ------------------------------------------------------------------ start */
  skeleton();
  if (!ST.students.length) { /* empty state shows the example prompt */ }
  renderAll();
  if (preset === "matrix") root.querySelector(".gs").classList.add("is-matrix");
  const warm = () => jsPDF().then(() => runFit()).catch(() => { /* the download button reports it */ });
  if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 2500 }); else setTimeout(warm, 800);
})();
