// BellBook generator UI. Mounts into #bb-tool; data-preset picks the starting school year / rotation.
import * as E from "./engine.js";

const mount = document.getElementById("bb-tool");
if (mount) init(mount);

function init(mount) {
  const preset = mount.dataset.preset || "";
  const $ = s => mount.querySelector(s);
  const $$ = s => [...mount.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("bb_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("bb_" + k, JSON.stringify(v)); } catch {} },
  };
  const track = (name, data) => { try { window.va && window.va("event", data ? { name, data } : { name }); } catch {} };
  const TODAY = E.localToday();

  // ---------- state ----------
  const presetKind = { "": "ab", ab: "ab", rotating: "rotating", six: "six", block: "block", planner: "planner", sem2: "sem2", dated: "dated", y2728: "y2728" }[preset] || "ab";
  const fourWeeks = c => {
    const s = E.dn(c.start), e = E.dn(c.end);
    let a = TODAY >= s && TODAY <= e ? E.mondayOf(TODAY) : s;
    a = Math.max(a, s);
    return { from: E.iso(a), to: E.iso(Math.min(e, E.mondayOf(a) + 25)) };
  };
  function fresh() {
    const c = E.sample(presetKind);
    if (!["sem2", "y2728"].includes(presetKind)) c.pl = { ...c.pl, ...fourWeeks(c) };
    return c;
  }
  let cfg = fresh();
  if (!preset) { const d = store.get("draft", null); if (d) cfg = E.normalize(d); }
  const ui = { size: "letter", color: true, year: true, months: true, weekStart: 0, hideWeekends: false, includeOff: true, key: null, ...store.get("ui", {}) };
  let res = E.compute(cfg), prev = null;

  // ---------- markup ----------
  mount.innerHTML = `
  <div class="bb-bar">
    <button type="button" class="btn" data-a="pdf">Download PDF calendar</button>
    <button type="button" class="btn ghost" data-a="ics">Add to Google / Outlook (.ics)</button>
    <button type="button" class="btn ghost" data-a="share">Copy “What day is it?” link</button>
  </div>
  <div class="bb">
    <form class="bb-form" autocomplete="off" onsubmit="return false" aria-label="Calendar settings">
      <h3>1 · School year</h3>
      <label for="bb-title">Calendar title</label><input id="bb-title" name="title" maxlength="90" placeholder="2026–27 A/B Day Calendar">
      <label for="bb-school">School name (optional)</label><input id="bb-school" name="school" maxlength="90" placeholder="Lincoln High School">
      <div class="row"><div><label for="bb-start">First day of school</label><input type="date" id="bb-start" name="start" required></div>
      <div><label for="bb-end">Last day of school</label><input type="date" id="bb-end" name="end" required></div></div>

      <h3>2 · Rotation</h3>
      <div class="row"><div><label for="bb-type">Rotation type</label><select id="bb-type" name="type">
        <option value="ab">A/B days</option><option value="abc">A/B/C days</option><option value="abcd">A/B/C/D days</option>
        <option value="dayN">Day 1–N cycle</option><option value="oddeven">Odd/Even days</option><option value="custom">Custom labels</option><option value="none">No rotation (dates only)</option></select></div>
        <div class="bb-only-dayN"><label for="bb-n">Days in the cycle</label><select id="bb-n" name="n">${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option value="${n}">${n} (Day 1–${n})</option>`).join("")}</select></div>
        <div class="bb-only-rot"><label for="bb-first">First school day is</label><select id="bb-first" name="first"></select></div>
      </div>
      <div class="bb-only-custom">
        <label for="bb-labels">Labels, in order (comma-separated)</label><input id="bb-labels" name="labels" placeholder="Red, White, Blue">
        <label for="bb-fmt">Show labels as</label><select id="bb-fmt" name="fmt"><option value="{L}">Red</option><option value="{L} Day">Red Day</option><option value="Day {L}">Day Red</option></select>
      </div>
      <details class="bb-wk"><summary>Weekday pattern (block schedules, Saturday school)</summary>
        <p class="small muted">Set a weekday to a fixed label for schedules like “Monday: all classes, Tuesday–Friday alternate A/B”. Fixed days don't move the rotation.</p>
        <div class="bb-wk-list"></div>
      </details>

      <h3>3 · Holidays and breaks</h3>
      <p class="small muted bb-hint">No school on these dates; the rotation pauses and picks up on the next school day.</p>
      <div class="bb-offs"></div>
      <div class="bb-btns"><button type="button" class="btn ghost sm" data-a="addOff">+ Add break</button><button type="button" class="btn ghost sm" data-a="holidays" aria-expanded="false" aria-controls="bb-hol">US federal holidays…</button></div>
      <div class="bb-hol notice" id="bb-hol" hidden></div>

      <h3>4 · Snow days and changes</h3>
      <p class="small muted bb-hint">Tip: click any day in the calendar to mark a snow day, reset the rotation or add a note.</p>
      <div class="bb-chs"></div>
      <div class="bb-btns"><button type="button" class="btn ghost sm" data-a="addSnow">+ Snow day / closure</button><button type="button" class="btn ghost sm" data-a="addChange">+ Other change</button></div>

      <h3>Saved calendars</h3>
      <p class="small muted bb-hint">Saved only in this browser. Nothing is uploaded.</p>
      <div class="bb-save"><label for="bb-savename" class="sr">Name to save as</label><input id="bb-savename" placeholder="Name, e.g. Lincoln HS 2026–27"><button type="button" class="btn ghost sm" data-a="save">Save</button></div>
      <div class="bb-save"><label for="bb-saved" class="sr">Saved calendars</label><select id="bb-saved"><option value="">Saved calendars</option></select><button type="button" class="btn ghost sm" data-a="load">Open</button><button type="button" class="btn ghost sm" data-a="del">Delete</button></div>
      <div class="bb-btns"><button type="button" class="btn ghost sm" data-a="roll">Copy to next school year</button><button type="button" class="btn ghost sm" data-a="clear">Remove all dates off</button><button type="button" class="btn ghost sm" data-a="reset">Reset example</button></div>
    </form>

    <div class="bb-view">
      <div class="bb-sum" aria-live="polite"></div>
      <p class="bb-status small" role="status" aria-live="polite"></p>
      <div class="bb-cal" aria-label="Rotation calendar preview. Use arrow keys to move between days and Enter to edit a day."></div>
      <p class="bb-credit small muted">Made with <a href="${E.CREDIT_URL}">BellBook</a> · bellbook-app.vercel.app</p>
    </div>
  </div>

  <div class="bb-export" id="export">
    <section class="card bb-card" aria-labelledby="bb-x1"><h3 id="bb-x1">Printable calendar (PDF)</h3>
      <div class="row"><div><label for="bb-size">Paper</label><select id="bb-size" data-ui="size"><option value="letter">US Letter</option><option value="a4">A4</option></select></div>
      <div><label for="bb-ws">Week starts on</label><select id="bb-ws" data-ui="weekStart"><option value="0">Sunday</option><option value="1">Monday</option></select></div></div>
      <label class="bb-check"><input type="checkbox" data-ui="year"> Year at a glance (1 page)</label>
      <label class="bb-check"><input type="checkbox" data-ui="months"> Monthly pages (1 per month)</label>
      <label class="bb-check"><input type="checkbox" data-ui="hideWeekends"> Hide weekends on monthly pages</label>
      <label class="bb-check"><input type="checkbox" data-ui="bw"> Black and white (ink saver)</label>
      <button type="button" class="btn" data-a="pdf">Download PDF calendar</button>
    </section>
    <section class="card bb-card" aria-labelledby="bb-x2"><h3 id="bb-x2">Google, Outlook or Apple Calendar</h3>
      <p class="small muted">An .ics file with one all-day event per school day (“A Day”, “Day 3”). Import it into a new, separate calendar so you can replace it after a snow day.</p>
      <label class="bb-check"><input type="checkbox" data-ui="includeOff"> Include holidays, breaks and closures</label>
      <button type="button" class="btn ghost" data-a="ics">Download .ics</button>
      <button type="button" class="btn ghost" data-a="csv">Download spreadsheet (.csv)</button>
    </section>
    <section class="card bb-card" aria-labelledby="bb-x3"><h3 id="bb-x3">“What day is it today?” link</h3>
      <p class="small muted">Students and parents open the link and see today's rotation day. The whole calendar is packed into the link itself: no account and no server.</p>
      <label for="bb-link">Share link</label>
      <div class="bb-linkrow"><input id="bb-link" readonly value="Making link…"><button type="button" class="btn sm" data-a="share">Copy</button></div>
      <p class="small"><a class="bb-open" href="/today" target="_blank" rel="noopener">Open the link</a> · Update and re-share it after a snow day.</p>
    </section>
  </div>

  <section class="card bb-planner" id="planner" aria-labelledby="bb-p">
    <h3 id="bb-p">Dated lesson planner <span class="muted small">(optional)</span></h3>
    <p class="small muted">Printable weekly plan pages with the date, the rotation day and the classes that meet that day already filled in, plus monthly calendars. It follows the school year, days off and rotation set in this tool.</p>
    <div class="bb-pl">
      <div>
        <label for="bb-teacher">Teacher name (optional)</label><input id="bb-teacher" name="pl.teacher" maxlength="60" placeholder="Ms. Rivera">
        <h4>Periods or blocks <span class="muted small">(up to 10)</span></h4>
        <div class="bb-pers"></div>
        <button type="button" class="btn ghost sm" data-a="addPer">+ Add period</button>
      </div>
      <div>
        <h4>Classes</h4>
        <label class="bb-check"><input type="checkbox" name="pl.same"> Same classes every day</label>
        <div class="bb-keys" role="tablist" aria-label="Rotation day"></div>
        <div class="bb-cls"></div>
      </div>
      <div>
        <h4>Dates and pages</h4>
        <div class="row"><div><label for="bb-pfrom">From</label><input type="date" id="bb-pfrom" name="pl.from"></div><div><label for="bb-pto">To</label><input type="date" id="bb-pto" name="pl.to"></div></div>
        <div class="bb-btns bb-quick"><button type="button" class="btn ghost sm" data-r="4w">Next 4 weeks</button><button type="button" class="btn ghost sm" data-r="s1">Semester 1</button><button type="button" class="btn ghost sm" data-r="s2">Semester 2</button><button type="button" class="btn ghost sm" data-r="yr">Whole year</button></div>
        <label for="bb-sem2">Second semester starts</label><input type="date" id="bb-sem2" name="sem2">
        <label class="bb-check"><input type="checkbox" name="pl.cover"> Cover and contents page</label>
        <label class="bb-check"><input type="checkbox" name="pl.monthly"> Monthly calendar pages</label>
        <label class="bb-check"><input type="checkbox" name="pl.weekly"> Weekly lesson plan pages</label>
        <label class="bb-check"><input type="checkbox" name="pl.tabs"> Clickable month tabs (GoodNotes, Notability)</label>
        <label for="bb-psize">Paper</label><select id="bb-psize" data-ui="size"><option value="letter">US Letter</option><option value="a4">A4</option></select>
        <p class="small muted bb-pcount"></p>
        <button type="button" class="btn" data-a="planner">Download lesson planner (PDF)</button>
      </div>
    </div>
  </section>
  <dialog class="bb-dlg" aria-labelledby="bb-dlg-h"></dialog>`;

  const f = $(".bb-form");
  const F = n => f.elements.namedItem(n);
  const dlg = $(".bb-dlg");

  // ---------- form <-> state ----------
  function fillForm() {
    F("title").value = cfg.title; F("school").value = cfg.school; F("start").value = cfg.start; F("end").value = cfg.end;
    F("type").value = cfg.type;
    if (cfg.type === "dayN") F("n").value = String(cfg.labels.length);
    $("#bb-labels").value = cfg.type === "custom" ? cfg.labels.join(", ") : "";
    $("#bb-fmt").value = ["{L}", "{L} Day", "Day {L}"].includes(cfg.fmt) ? cfg.fmt : "{L}";
    const pl = cfg.pl;
    $("#bb-teacher").value = pl.teacher; $("#bb-pfrom").value = pl.from; $("#bb-pto").value = pl.to; $("#bb-sem2").value = cfg.sem2;
    for (const k of ["same", "cover", "monthly", "weekly", "tabs"]) mount.querySelector(`[name="pl.${k}"]`).checked = !!pl[k];
    $$("[data-ui]").forEach(el => {
      const k = el.dataset.ui;
      if (el.type === "checkbox") el.checked = k === "bw" ? !ui.color : !!ui[k];
      else el.value = String(ui[k]);
    });
    renderStructure();
  }
  function renderStructure(keepFocus) {
    const a = keepFocus && document.activeElement, id = a && a.id, pos = a && a.selectionStart;
    mount.classList.toggle("is-dayN", cfg.type === "dayN");
    mount.classList.toggle("is-custom", cfg.type === "custom");
    mount.classList.toggle("is-none", cfg.type === "none");
    F("first").innerHTML = cfg.labels.map((l, i) => `<option value="${i}">${esc(cfg.fmt.replace("{L}", l))}</option>`).join("");
    F("first").value = String(cfg.first);
    // weekday pattern, Monday first
    $(".bb-wk-list").innerHTML = [1, 2, 3, 4, 5, 6, 0].map(w => {
      const r = cfg.wk[w], mode = r.startsWith("fix:") ? "fix" : r;
      return `<div class="bb-wkrow"><label for="bb-wk${w}">${E.WDAYS[w]}</label>
        <select id="bb-wk${w}" data-wk="${w}"><option value="off"${mode === "off" ? " selected" : ""}>No school</option><option value="rot"${mode === "rot" ? " selected" : ""}>${cfg.labels.length ? "Rotates" : "School day"}</option><option value="fix"${mode === "fix" ? " selected" : ""}>Fixed label</option></select>
        <input aria-label="${E.WDAYS[w]} fixed label" data-wkfix="${w}" value="${esc(mode === "fix" ? r.slice(4) : "")}" placeholder="e.g. All classes"${mode === "fix" ? "" : " hidden"}></div>`;
    }).join("");
    renderEvents();
    renderPlanner();
    if (id) { const el = document.getElementById(id); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch {} } }
  }
  const typeName = { closed: "Snow day / closure", extra: "Make-up school day", reset: "Rotation reset", norot: "No-rotation school day", note: "Note" };
  function renderEvents() {
    const offs = [], chs = [];
    cfg.ev.forEach((ev, i) => (ev.t === "off" ? offs : chs).push([ev, i]));
    const out = d => (d < cfg.start || d > cfg.end ? ' class="bb-out" title="Outside the school year"' : "");
    $(".bb-offs").innerHTML = offs.length ? offs.map(([ev, i]) => `<div class="bb-ev bb-off" data-ev="${i}">
      <input data-k="n" value="${esc(ev.n)}" aria-label="Name of day off" placeholder="Winter break">
      <input type="date" data-k="s" value="${ev.s}" aria-label="${esc(ev.n || "Day off")} first day"${out(ev.s)}>
      <input type="date" data-k="e" value="${ev.e}" aria-label="${esc(ev.n || "Day off")} last day"${out(ev.e)}>
      <button type="button" class="bb-x" data-a="rm" aria-label="Remove ${esc(ev.n || "day off")}">×</button></div>`).join("") : `<p class="small muted">No holidays or breaks yet.</p>`;
    $(".bb-chs").innerHTML = chs.length ? chs.map(([ev, i]) => {
      const labelSel = `<select data-k="l" aria-label="Rotation day to set">${cfg.labels.map((l, j) => `<option value="${j}"${ev.l === j ? " selected" : ""}>${esc(cfg.fmt.replace("{L}", l))}</option>`).join("")}</select>`;
      return `<div class="bb-ev bb-ch" data-ev="${i}">
        <select data-k="t" aria-label="Type of change">${Object.entries(typeName).map(([k, v]) => `<option value="${k}"${ev.t === k ? " selected" : ""}>${v}</option>`).join("")}</select>
        <button type="button" class="bb-x" data-a="rm" aria-label="Remove this change">×</button>
        <input type="date" data-k="s" value="${ev.s}" aria-label="${ev.t === "reset" ? "Date" : "First day"}"${out(ev.s)}>
        ${ev.t === "reset" ? labelSel : `<input type="date" data-k="e" value="${ev.e}" aria-label="Last day (same as first for one day)"${out(ev.e)}>`}
        ${ev.t === "reset" ? `<span class="small muted bb-evhelp">This day gets the chosen label; the rotation continues from it.</span>` : `<input data-k="n" value="${esc(ev.n)}" aria-label="Description" placeholder="${{ closed: "Snow day", norot: "Final exams", extra: "Snow make-up day", note: "Early release" }[ev.t]}">`}
        ${ev.t === "closed" ? `<select data-k="m" aria-label="What happens to the rotation"><option value="continue"${ev.m !== "skip" ? " selected" : ""}>Rotation continues next school day</option><option value="skip"${ev.m === "skip" ? " selected" : ""}>Skip this day's letter</option></select>` : ""}
      </div>`;
    }).join("") : `<p class="small muted">No snow days or changes yet.</p>`;
  }
  function plKeys() { return cfg.pl.same ? ["*"] : E.plannerKeys(cfg); }
  const keyName = k => (k === "*" ? "Every day" : k === "" ? "Every school day" : cfg.labels.includes(k) ? cfg.fmt.replace("{L}", k) : k);
  function renderPlanner() {
    const pl = cfg.pl;
    $(".bb-pers").innerHTML = pl.periods.map((p, i) => `<div class="bb-per" data-p="${i}">
      <input data-pk="n" value="${esc(p.n)}" aria-label="Period ${i + 1} name" placeholder="Period ${i + 1}">
      <input data-pk="t" value="${esc(p.t)}" aria-label="Period ${i + 1} time" placeholder="8:00–8:50">
      <button type="button" class="bb-x" data-a="rmPer" aria-label="Remove period ${i + 1}"${pl.periods.length < 2 ? " disabled" : ""}>×</button></div>`).join("");
    mount.querySelector('[data-a="addPer"]').disabled = pl.periods.length >= 10;
    const keys = plKeys();
    if (!keys.includes(ui.key)) ui.key = keys[0];
    $(".bb-keys").innerHTML = keys.length > 1 ? keys.map(k => `<button type="button" role="tab" class="bb-key" aria-selected="${k === ui.key}" data-key="${esc(k)}">${esc(keyName(k))}</button>`).join("") : "";
    renderClasses();
  }
  function renderClasses() {
    const pl = cfg.pl, list = pl.cls[ui.key] || [];
    $(".bb-cls").innerHTML = `<p class="small muted">${pl.same ? "Classes that meet every day:" : `Classes that meet on <strong>${esc(keyName(ui.key))}</strong>:`}</p>` + pl.periods.map((p, i) => `<div class="bb-clsrow">
      <label for="bb-cls${i}">${esc(p.n || `Period ${i + 1}`)}</label><input id="bb-cls${i}" data-ci="${i}" value="${esc(list[i] || "")}" placeholder="Class or prep (blank = free)"></div>`).join("");
  }

  // ---------- compute + preview ----------
  let saveT;
  function update({ announce = "" } = {}) {
    cfg = E.normalize(cfg);
    prev = res; res = E.compute(cfg);
    renderSummary(); renderCalendar(); refreshLink(); renderPlanCount();
    if (announce) status(announce);
    clearTimeout(saveT);
    saveT = setTimeout(() => { if (!preset) store.set("draft", cfg); store.set("ui", ui); }, 250);
  }
  const status = msg => { $(".bb-status").textContent = msg; };
  function renderSummary() {
    const el = $(".bb-sum");
    if (res.errors.length) { setHtml(el, `<p class="bb-err">${esc(res.errors[0])}</p>`); return; }
    const chips = res.counts.map((c, i) => `<span class="bb-chip" style="--f:${E.PALETTE[i % 10][0]};--i:${E.PALETTE[i % 10][1]}">${esc(c.long)} <b>${c.count}</b></span>`).join("")
      + Object.entries(res.fixedCounts).map(([k, n]) => `<span class="bb-chip" style="--f:${E.FIXED_COLOR[0]};--i:${E.FIXED_COLOR[1]}">${esc(k)} <b>${n}</b></span>`).join("");
    const t = E.dayAt(res, TODAY);
    let today = "";
    if (t) {
      const nx = E.nextSchoolDay(res, TODAY + (t.school ? 0 : 1));
      today = t.school ? `Today (${E.fmtShort(TODAY)}): <strong>${esc(E.longLabel(cfg, t) || t.name || "School day")}</strong>.`
        : `No school today (${esc(t.kind === "weekend" ? "weekend" : t.name)}).${nx ? ` Next school day: ${E.fmtShort(nx.n)}${E.longLabel(cfg, nx) ? ", " + esc(E.longLabel(cfg, nx)) : ""}.` : ""}`;
    }
    setHtml(el, `<p class="bb-total"><strong>${res.schoolDays}</strong> school days${res.first != null ? ` · ${E.fmtMDY(res.first)} – ${E.fmtMDY(res.last)}` : ""}</p>
      <div class="bb-chips">${chips}</div>${today ? `<p class="small bb-today">${today}</p>` : ""}`);
  }
  let focusDay = null;
  const setHtml = (el, html) => { if (el._html !== html) { el.innerHTML = html; el._html = html; } };
  function renderCalendar() {
    const el = $(".bb-cal");
    if (res.errors.length) { setHtml(el, ""); return; }
    const ws = Number(ui.weekStart) || 0;
    if (focusDay == null || focusDay < res.s || focusDay > res.e) focusDay = TODAY >= res.s && TODAY <= res.e ? TODAY : res.s;
    setHtml(el, E.monthsIn(res).map(({ y, m }) => `<div class="bb-month" role="group" aria-label="${E.MONTHS[m]} ${y}"><h4 aria-hidden="true">${E.MONTHS[m]} ${y}</h4>
      <div class="bb-grid"><div class="bb-wd" aria-hidden="true">${[0, 1, 2, 3, 4, 5, 6].map(i => `<span>${E.WDAYS[(i + ws) % 7][0]}</span>`).join("")}</div>
      ${E.monthGrid(y, m, ws).map(row => row.map(d => cell(d)).join("")).join("")}</div></div>`).join(""));
  }
  function cell(d) {
    if (d == null) return `<span class="bb-d bb-empty"></span>`;
    const day = E.dayAt(res, d), num = E.parts(d).d;
    if (!day) return `<span class="bb-d bb-outside" aria-hidden="true"><i>${num}</i></span>`;
    const lab = E.longLabel(cfg, day);
    let cls = "bb-d k-" + day.kind, style = "", text = "";
    if (day.school && lab) { const [fl, ink] = E.colorFor(day); style = ` style="--f:${fl};--i:${ink}"`; text = day.label; cls += " bb-lab"; }
    else if (day.kind === "norot") text = "–";
    const desc = [E.fmtLong(d), day.school ? lab || day.name || "School day" : day.kind === "weekend" ? "No school" : `No school: ${day.name}${day.kind === "closed" ? (day.mode === "skip" ? ", rotation day skipped" : ", rotation continues") : ""}`, ...day.notes, day.reset ? "rotation reset" : ""].filter(Boolean).join(". ");
    if (d === TODAY) cls += " bb-now";
    const marks = (day.notes.length ? `<b class="bb-dot" aria-hidden="true"></b>` : "") + (day.reset ? `<b class="bb-rs" aria-hidden="true">↻</b>` : "");
    return `<button type="button" class="${cls}"${style} data-d="${d}" tabindex="${d === focusDay ? 0 : -1}" aria-label="${esc(desc)}" title="${esc(desc)}"><i>${num}</i>${text ? `<span>${esc(text.length > 4 ? text.slice(0, 3) : text)}</span>` : ""}${marks}</button>`;
  }
  function renderPlanCount() {
    const el = $(".bb-pcount");
    if (res.errors.length) { el.textContent = ""; return; }
    const pl = cfg.pl, a = Math.max(res.s, E.dn(pl.from)), b = Math.min(res.e, E.dn(pl.to));
    if (a > b) { el.textContent = "The planner dates are outside the school year."; return; }
    const weeks = pl.weekly ? E.plannerWeeks(res, E.iso(a), E.iso(b)).length : 0;
    const months = pl.monthly ? E.monthsIn(res).filter(({ y, m }) => E.fromYMD(y, m + 1, 0) >= a && E.fromYMD(y, m, 1) <= b).length : 0;
    const pages = (pl.cover ? 1 : 0) + 1 + months + weeks;
    el.textContent = `${E.fmtMDY(a)} – ${E.fmtMDY(b)}: ${pages} pages (${weeks} weekly, ${months} monthly).`;
  }
  let linkCode = "", linkT;
  function refreshLink() {
    clearTimeout(linkT);
    linkT = setTimeout(async () => {
      linkCode = await E.encodeShare(cfg);
      const url = `${location.origin}/today#c=${linkCode}`;
      $("#bb-link").value = url;
      $(".bb-open").href = url;
    }, 150);
  }

  // ---------- events from the form ----------
  let typingT;
  f.addEventListener("input", e => onInput(e, true));
  $(".bb-planner").addEventListener("input", e => onInput(e, true));
  mount.addEventListener("change", e => onInput(e, false));
  function onInput(e, typing) {
    const t = e.target;
    if (t.closest(".bb-dlg")) return;
    // selects, checkboxes and dates are handled once, on "change"; text fields update while typing
    if (typing && (t.tagName === "SELECT" || t.type === "checkbox" || t.type === "date")) return;
    if (!typing && t.tagName === "INPUT" && !["checkbox", "date"].includes(t.type)) return;
    if (t.dataset.ui) {
      const k = t.dataset.ui;
      if (k === "bw") ui.color = !t.checked;
      else if (t.type === "checkbox") ui[k] = t.checked;
      else ui[k] = k === "weekStart" ? Number(t.value) : t.value;
      $$(`[data-ui="${k}"]`).forEach(o => { if (o !== t && o.type !== "checkbox") o.value = t.value; });
      store.set("ui", ui);
      if (k === "weekStart") renderCalendar();
      return;
    }
    const row = t.closest("[data-ev]");
    if (row && t.dataset.k) {
      const ev = cfg.ev[+row.dataset.ev], k = t.dataset.k;
      if (k === "s") { if (!E.isIso(t.value)) return; ev.s = t.value; if (!ev.e || ev.e < ev.s || ev.t === "reset") ev.e = ev.s; const end = row.querySelector('[data-k="e"]'); if (end) end.value = ev.e; }
      else if (k === "e") { if (!E.isIso(t.value)) return; ev.e = t.value < ev.s ? ev.s : t.value; }
      else if (k === "l") ev.l = Number(t.value);
      else if (k === "t") { ev.t = t.value; if (ev.t === "closed") ev.m = ev.m || "continue"; if (ev.t === "reset") { ev.e = ev.s; ev.l = ev.l || 0; } cfg = E.normalize(cfg); update(); renderEvents(); return; }
      else ev[k] = t.value;
      return later(typing, k === "m" ? "Rotation rule changed." : "");
    }
    if (t.dataset.wk != null) {
      const w = +t.dataset.wk, fix = () => mount.querySelector(`[data-wkfix="${w}"]`);
      if (t.value === "fix") { fix().hidden = false; cfg.wk[w] = "fix:" + (fix().value || "All classes"); if (!fix().value) fix().value = "All classes"; }
      else { fix().hidden = true; cfg.wk[w] = t.value; }
      cfg = E.normalize(cfg); update(); renderPlanner(); return;
    }
    if (t.dataset.wkfix != null) { cfg.wk[+t.dataset.wkfix] = "fix:" + t.value; return later(typing, "", () => renderPlanner()); }
    if (t.closest(".bb-per") && t.dataset.pk) {
      const i = +t.closest(".bb-per").dataset.p;
      cfg.pl.periods[i][t.dataset.pk] = t.value;
      return later(typing, "", () => { if (!typing) renderClasses(); });
    }
    if (t.dataset.ci != null) {
      const list = cfg.pl.cls[ui.key] || (cfg.pl.cls[ui.key] = []);
      list[+t.dataset.ci] = t.value;
      return later(typing);
    }
    const name = t.name;
    if (!name) return;
    if (name.startsWith("pl.")) {
      const k = name.slice(3);
      if (t.type === "checkbox") { cfg.pl[k] = t.checked; if (k === "same") { cfg = E.normalize(cfg); renderPlanner(); } update(); return; }
      if (t.type === "date") { if (!E.isIso(t.value)) return; cfg.pl[k] = t.value; update(); return; }
      cfg.pl[k] = t.value; return later(typing);
    }
    if (t.type === "date") {
      if (!E.isIso(t.value)) return;
      cfg[name] = t.value;
      update({ announce: name === "start" || name === "end" ? "School year dates updated." : "" });
      renderEvents();
      return;
    }
    if (name === "type") {
      const T = E.TYPES[t.value];
      cfg.type = t.value;
      cfg.labels = T.labels ? T.labels.slice() : t.value === "dayN" ? E.dayNLabels(+F("n").value || 6) : (cfg.type === "custom" && $("#bb-labels").value ? $("#bb-labels").value.split(",") : ["A", "B"]);
      cfg.fmt = t.value === "custom" ? $("#bb-fmt").value : T.fmt;
      cfg.first = 0;
      if (t.value === "custom" && !$("#bb-labels").value) $("#bb-labels").value = cfg.labels.join(", ");
      cfg = E.normalize(cfg); update({ announce: `Rotation set to ${T.name}.` }); renderStructure(); return;
    }
    if (name === "n") { cfg.labels = E.dayNLabels(+t.value); cfg.first = 0; cfg = E.normalize(cfg); update(); renderStructure(); return; }
    if (name === "labels") {
      const ls = t.value.split(",").map(s => s.trim()).filter(Boolean);
      if (ls.length < 2) { status("Enter at least two labels, separated by commas."); return; }
      cfg.labels = ls; cfg.first = Math.min(cfg.first, ls.length - 1);
      return later(typing, "", () => renderStructure(true));
    }
    if (name === "fmt") { cfg.fmt = t.value; update(); renderStructure(); return; }
    if (name === "first") { cfg.first = Number(t.value); update({ announce: "Starting day changed." }); return; }
    cfg[name] = t.value;
    later(typing);
  }
  function later(typing, msg = "", after) {
    clearTimeout(typingT);
    const run = () => { update({ announce: msg }); after && after(); };
    if (typing) typingT = setTimeout(run, 200); else run();
  }

  // ---------- buttons ----------
  mount.addEventListener("click", async e => {
    const b = e.target.closest("button");
    if (!b || b.closest(".bb-dlg")) return;
    const a = b.dataset.a;
    if (b.dataset.d) { openDay(+b.dataset.d); return; }
    if (b.dataset.key != null) { ui.key = b.dataset.key; renderPlanner(); mount.querySelector(`.bb-key[data-key="${CSS.escape(ui.key)}"]`)?.focus(); return; }
    if (b.dataset.r) { setRange(b.dataset.r); return; }
    if (!a) return;
    if (a === "rm") { cfg.ev.splice(+b.closest("[data-ev]").dataset.ev, 1); update({ announce: "Removed." }); renderEvents(); }
    else if (a === "addOff") { const d = defaultDate(); cfg.ev.push({ t: "off", s: d, e: d, n: "" }); update(); renderEvents(); focusLast(".bb-off", '[data-k="n"]'); }
    else if (a === "addSnow") { const d = defaultDate(true); cfg.ev.push({ t: "closed", s: d, e: d, n: "Snow day", m: "continue" }); update({ announce: reflowMsg() }); renderEvents(); focusLast(".bb-ch", '[data-k="s"]'); }
    else if (a === "addChange") { const d = defaultDate(true); cfg.ev.push({ t: "note", s: d, e: d, n: "" }); update(); renderEvents(); focusLast(".bb-ch", '[data-k="t"]'); }
    else if (a === "holidays") toggleHolidays(b);
    else if (a === "addHol") addHolidays();
    else if (a === "addPer") { if (cfg.pl.periods.length < 10) { cfg.pl.periods.push({ n: `Period ${cfg.pl.periods.length + 1}`, t: "" }); update(); renderPlanner(); focusLast(".bb-per", '[data-pk="n"]'); } }
    else if (a === "rmPer") {
      const i = +b.closest(".bb-per").dataset.p;
      cfg.pl.periods.splice(i, 1);
      for (const k of Object.keys(cfg.pl.cls)) cfg.pl.cls[k].splice(i, 1);
      update(); renderPlanner();
    }
    else if (a === "pdf") await download("pdf", b);
    else if (a === "planner") await download("planner", b);
    else if (a === "ics") exportIcs();
    else if (a === "csv") exportCsv();
    else if (a === "share") await copyLink();
    else if (a === "save") saveCal();
    else if (a === "load") loadCal();
    else if (a === "del") delCal();
    else if (a === "roll") { cfg = E.rollForward(cfg); if (cfg.pl) cfg.pl = { ...cfg.pl, from: cfg.start, to: cfg.end }; update({ announce: "Copied to the next school year. Holidays were recalculated and breaks moved forward 52 weeks: check them against your district calendar." }); fillForm(); }
    else if (a === "clear") { if (confirm("Remove every holiday, break, snow day and change?")) { cfg.ev = []; update({ announce: "All dates off removed." }); renderEvents(); } }
    else if (a === "reset") { if (confirm("Replace this calendar with the example?")) { cfg = fresh(); update({ announce: "Example restored." }); fillForm(); } }
  });
  const focusLast = (row, sel) => { const rows = $$(row); const el = rows.length && rows[rows.length - 1].querySelector(sel); if (el) el.focus(); };
  const sortOffs = () => { const offs = cfg.ev.filter(e => e.t === "off").sort((a, b) => a.s.localeCompare(b.s)); cfg.ev = [...offs, ...cfg.ev.filter(e => e.t !== "off")]; };
  function defaultDate(schoolDay) {
    const s = E.dn(cfg.start), e = E.dn(cfg.end);
    let d = TODAY >= s && TODAY <= e ? TODAY : s;
    if (schoolDay && !res.errors.length) { const n = E.nextSchoolDay(res, d); if (n) d = n.n; }
    return E.iso(d);
  }
  const reflowMsg = () => { const n = E.diffCount(prev, res); return n ? `Re-flowed: ${n} day${n === 1 ? "" : "s"} changed.` : "Updated."; };

  function toggleHolidays(btn) {
    const box = $(".bb-hol");
    const open = box.hidden;
    btn.setAttribute("aria-expanded", String(open));
    if (!open) { box.hidden = true; return; }
    const have = new Set(cfg.ev.filter(e => e.t === "off").flatMap(e => [e.s, e.h]).filter(Boolean));
    const list = E.usHolidays(cfg.start, cfg.end);
    box.innerHTML = list.length ? `<p class="small"><strong>US federal holidays in this school year</strong> (observed dates). Many schools stay open on Columbus Day and Veterans Day.</p>
      ${list.map((h, i) => `<label class="bb-check"><input type="checkbox" data-hol="${i}"${have.has(h.date) ? " disabled checked" : h.school ? " checked" : ""}> ${E.fmtShort(E.dn(h.date))}: ${esc(h.name)}${have.has(h.date) ? " <span class=\"muted\">(added)</span>" : ""}</label>`).join("")}
      <button type="button" class="btn sm" data-a="addHol">Add selected holidays</button>` : `<p class="small">No federal holidays fall between the first and last day of school.</p>`;
    box.hidden = false;
    box._list = list;
  }
  function addHolidays() {
    const box = $(".bb-hol");
    let n = 0;
    box.querySelectorAll("[data-hol]").forEach(c => { if (c.checked && !c.disabled) { const h = box._list[+c.dataset.hol]; cfg.ev.push({ t: "off", s: h.date, e: h.date, n: h.name, h: h.k }); n++; } });
    sortOffs();
    box.hidden = true; $('[data-a="holidays"]').setAttribute("aria-expanded", "false");
    update({ announce: `Added ${n} holiday${n === 1 ? "" : "s"}.` }); renderEvents();
  }
  function setRange(r) {
    const s = cfg.start, e = cfg.end;
    const sem2 = cfg.sem2 || (() => { const y = E.parts(E.dn(s)).y + 1; const d = E.nextSchoolDay(res, E.fromYMD(y, 0, 1)); return d ? d.iso : `${y}-01-02`; })();
    let from = s, to = e;
    if (r === "4w") ({ from, to } = fourWeeks(cfg));
    else if (r === "s1") to = E.iso(E.dn(sem2) - 1);
    else if (r === "s2") from = sem2;
    cfg.pl.from = from; cfg.pl.to = to;
    $("#bb-pfrom").value = from; $("#bb-pto").value = to;
    update();
  }

  // ---------- day dialog (click a date in the preview) ----------
  function openDay(d) {
    const day = E.dayAt(res, d);
    if (!day) return;
    focusDay = d;
    const lab = E.longLabel(cfg, day);
    const here = cfg.ev.map((ev, i) => [ev, i]).filter(([ev]) => ev.s <= day.iso && ev.e >= day.iso);
    const sim = extra => E.compute(E.normalize({ ...cfg, ev: [...cfg.ev, extra] }));
    let snowInfo = "";
    if (day.school && cfg.labels.length && day.kind === "school") {
      const c = sim({ t: "closed", s: day.iso, n: "Snow day", m: "continue" }), next = E.nextSchoolDay(c, d + 1);
      const nc = E.diffCount(res, c), ns = E.diffCount(res, sim({ t: "closed", s: day.iso, n: "Snow day", m: "skip" }));
      snowInfo = { cont: next ? `${E.fmtShort(next.n)} becomes ${E.longLabel(cfg, next) || "a school day"}; ${nc - 1} later day${nc - 1 === 1 ? "" : "s"} shift.` : "No later school days.", skip: `${lab} is skipped; every other day keeps its label (${ns} day changed).` };
    }
    const kindText = day.school ? lab || day.name || "School day" : day.kind === "weekend" ? "No school (weekend)" : `No school: ${day.name}`;
    dlg.innerHTML = `<button type="button" class="pro-x" data-x aria-label="Close">×</button>
      <h3 id="bb-dlg-h">${E.fmtLong(d)}</h3>
      <p class="muted">${esc(kindText)}${day.notes.length ? " · " + esc(day.notes.join("; ")) : ""}</p>
      ${here.length ? `<div class="bb-here"><p class="small"><strong>On this date</strong></p>${here.map(([ev, i]) => `<div class="bb-hererow"><span>${esc(ev.t === "off" ? "Day off" : typeName[ev.t])}${ev.n ? ": " + esc(ev.n) : ""}${ev.t === "reset" ? ": " + esc(cfg.fmt.replace("{L}", cfg.labels[ev.l % Math.max(1, cfg.labels.length)] || "")) : ""}${ev.s !== ev.e ? ` (${E.fmtRange(E.dn(ev.s), E.dn(ev.e))})` : ""}</span><button type="button" class="btn ghost sm" data-del="${i}">Remove</button></div>`).join("")}</div>` : ""}
      <div class="bb-acts">
        ${day.school ? `
        <button type="button" class="btn" data-act="snowC">Snow day: rotation continues${snowInfo ? `<small>${esc(snowInfo.cont)}</small>` : ""}</button>
        ${snowInfo ? `<button type="button" class="btn ghost" data-act="snowS">Snow day: skip ${esc(lab)}<small>${esc(snowInfo.skip)}</small></button>` : ""}
        ${cfg.labels.length ? `<div class="bb-inline"><label for="bb-dl">Make this day</label><select id="bb-dl">${cfg.labels.map((l, i) => `<option value="${i}"${l === day.label ? " selected" : ""}>${esc(cfg.fmt.replace("{L}", l))}</option>`).join("")}</select><button type="button" class="btn ghost sm" data-act="reset">Set</button></div>
        <p class="small muted">The rotation continues from the day you set.</p>` : ""}
        <div class="bb-inline"><label for="bb-dn">Name</label><input id="bb-dn" placeholder="e.g. Teacher workday, Final exams"><button type="button" class="btn ghost sm" data-act="off">Day off</button><button type="button" class="btn ghost sm" data-act="norot">No-rotation day</button></div>` : ""}
        ${day.kind === "weekend" || day.kind === "off" ? `<div class="bb-inline"><label for="bb-dn">Name</label><input id="bb-dn" placeholder="e.g. Snow make-up day"><button type="button" class="btn ghost sm" data-act="extra">Make-up school day</button></div>
        <p class="small muted">A make-up day gets the next rotation day and the rotation continues after it.</p>` : ""}
        <div class="bb-inline"><label for="bb-nt">Note</label><input id="bb-nt" placeholder="e.g. Early release"><button type="button" class="btn ghost sm" data-act="note">Add note</button></div>
      </div>`;
    dlg.showModal();
    const first = dlg.querySelector("[data-act]"); if (first) first.focus();
  }
  dlg.addEventListener("click", e => {
    if (e.target === dlg || e.target.closest("[data-x]")) { dlg.close(); return; }
    const b = e.target.closest("button"); if (!b) return;
    const d = focusDay, s = E.iso(d);
    let msg = "";
    if (b.dataset.del != null) { cfg.ev.splice(+b.dataset.del, 1); msg = "Removed."; }
    else {
      const act = b.dataset.act, name = (dlg.querySelector("#bb-dn") || {}).value || "";
      if (act === "snowC") cfg.ev.push({ t: "closed", s, e: s, n: "Snow day", m: "continue" });
      else if (act === "snowS") cfg.ev.push({ t: "closed", s, e: s, n: "Snow day", m: "skip" });
      else if (act === "reset") { cfg.ev = cfg.ev.filter(ev => !(ev.t === "reset" && ev.s === s)); cfg.ev.push({ t: "reset", s, e: s, l: Number(dlg.querySelector("#bb-dl").value) }); }
      else if (act === "off") { cfg.ev.push({ t: "off", s, e: s, n: name || "No school" }); sortOffs(); }
      else if (act === "norot") cfg.ev.push({ t: "norot", s, e: s, n: name || "No rotation" });
      else if (act === "extra") cfg.ev.push({ t: "extra", s, e: s, n: name || "Make-up day" });
      else if (act === "note") { const n = dlg.querySelector("#bb-nt").value.trim(); if (!n) { dlg.querySelector("#bb-nt").focus(); return; } cfg.ev.push({ t: "note", s, e: s, n }); }
      else return;
    }
    dlg.close();
    update();
    status(msg || reflowMsg());
    renderEvents();
    const btn = mount.querySelector(`.bb-cal [data-d="${d}"]`); if (btn) btn.focus();
  });
  dlg.addEventListener("close", () => { const btn = mount.querySelector(`.bb-cal [data-d="${focusDay}"]`); if (btn && document.activeElement === document.body) btn.focus(); });
  // roving focus with arrow keys inside the calendar
  $(".bb-cal").addEventListener("keydown", e => {
    const b = e.target.closest("[data-d]"); if (!b) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -E.wday(+b.dataset.d), End: 6 - E.wday(+b.dataset.d) }[e.key];
    if (step == null) return;
    e.preventDefault();
    let d = +b.dataset.d + step, next;
    while (d >= res.s && d <= res.e && !(next = mount.querySelector(`.bb-cal [data-d="${d}"]`))) d += Math.sign(step);
    if (!next) return;
    b.tabIndex = -1; next.tabIndex = 0; next.focus(); focusDay = d;
  });

  // ---------- exports ----------
  const slug = () => (cfg.title || cfg.school || "rotation-calendar").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-").replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "rotation-calendar";
  function save(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  let jspdfP;
  const loadJsPDF = () => jspdfP || (jspdfP = new Promise((ok, fail) => {
    if (window.jspdf) return ok(window.jspdf.jsPDF);
    const s = document.createElement("script"); s.src = "/vendor/jspdf-4.2.1.umd.min.js";
    s.onload = () => ok(window.jspdf.jsPDF); s.onerror = () => { jspdfP = null; fail(new Error("Couldn't load the PDF library. Check your connection and try again.")); };
    document.head.appendChild(s);
  }));
  async function download(kind, btn) {
    if (res.errors.length) { status(res.errors[0]); return; }
    const old = btn.textContent; btn.disabled = true; btn.textContent = "Making PDF…";
    try {
      const [jsPDF, P] = await Promise.all([loadJsPDF(), import("./printables.js")]);
      await new Promise(r => setTimeout(r, 30));
      if (kind === "pdf") {
        if (!ui.year && !ui.months) throw new Error("Tick “Year at a glance” or “Monthly pages” first.");
        const doc = P.calendarPdf(jsPDF, res, { size: ui.size, color: ui.color, year: ui.year, months: ui.months, weekStart: Number(ui.weekStart) || 0, hideWeekends: ui.hideWeekends });
        save(doc.output("blob"), slug() + ".pdf");
        status(`PDF ready: ${doc.getNumberOfPages()} page${doc.getNumberOfPages() === 1 ? "" : "s"}.`);
        track("calendar_pdf", { type: cfg.type });
      } else {
        const doc = P.plannerPdf(jsPDF, res, { size: ui.size, color: ui.color, weekStart: Number(ui.weekStart) || 0 });
        save(doc.output("blob"), slug() + (slug().includes("planner") ? ".pdf" : "-lesson-planner.pdf"));
        status(`Lesson planner ready: ${doc.getNumberOfPages()} pages.`);
        track("planner_generated", { pages: doc.getNumberOfPages() });
      }
    } catch (err) { status(err.message || String(err)); }
    finally { btn.disabled = false; btn.textContent = old; }
  }
  function exportIcs() {
    if (res.errors.length) return status(res.errors[0]);
    save(new Blob([E.buildIcs(res, { includeOff: ui.includeOff })], { type: "text/calendar;charset=utf-8" }), slug() + ".ics");
    status("Calendar file downloaded. In Google Calendar: Settings → Import & export → Import.");
    track("ics_exported");
  }
  function exportCsv() {
    if (res.errors.length) return status(res.errors[0]);
    save(new Blob(["﻿" + E.buildCsv(res)], { type: "text/csv;charset=utf-8" }), slug() + ".csv");
    status("Spreadsheet downloaded.");
    track("csv_exported");
  }
  async function copyLink() {
    clearTimeout(linkT);
    linkCode = await E.encodeShare(cfg);
    const url = `${location.origin}/today#c=${linkCode}`;
    const input = $("#bb-link"); input.value = url; $(".bb-open").href = url;
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch { try { input.select(); ok = document.execCommand("copy"); } catch {} }
    status(ok ? "Link copied. Paste it into your website, Google Classroom or an email." : "Select the link below and copy it.");
    track("share_link_created");
  }

  // ---------- saved calendars ----------
  function refreshSaved() {
    const sel = $("#bb-saved"); sel.length = 1;
    store.get("saved", []).forEach((s, i) => sel.add(new Option(s.name, i)));
  }
  function saveCal() {
    const name = ($("#bb-savename").value || cfg.title || "My calendar").trim().slice(0, 60);
    const list = store.get("saved", []).filter(s => s.name !== name);
    list.unshift({ name, cfg, at: Date.now() });
    store.set("saved", list.slice(0, 30)); refreshSaved();
    $("#bb-saved").value = "0";
    status(`Saved “${name}” in this browser.`);
  }
  function loadCal() {
    const s = store.get("saved", [])[+$("#bb-saved").value];
    if (!s) { status("Choose a saved calendar first."); return; }
    cfg = E.normalize(s.cfg); if (!cfg.pl) cfg.pl = E.sample(presetKind).pl;
    update({ announce: `Opened “${s.name}”.` }); fillForm();
  }
  function delCal() {
    const i = $("#bb-saved").value; if (i === "") return;
    const list = store.get("saved", []); const [s] = list.splice(+i, 1);
    store.set("saved", list); refreshSaved(); status(`Deleted “${s.name}”.`);
  }

  // ---------- start ----------
  async function start() {
    const m = location.hash.match(/[#&]c=([\w-]+)/);
    if (m) {
      const c = await E.decodeShare(m[1]);
      if (c) { cfg = { ...c, pl: cfg.pl }; status("Opened the calendar from the link. Edit it, then copy the new link."); }
      history.replaceState(null, "", location.pathname + location.search);
    }
    cfg = E.normalize(cfg);
    if (!cfg.pl) cfg.pl = E.sample(presetKind).pl;
    $("#bb-savename").value = cfg.title;
    fillForm(); refreshSaved(); update();
    if (["planner", "sem2", "dated"].includes(preset)) mount.classList.add("bb-plan-first");
  }
  start();
}
