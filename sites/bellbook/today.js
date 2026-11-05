// BellBook "What day is it today?" page. The calendar is decoded from the URL hash (#c=...),
// so nothing is stored on a server. Dates use the viewer's own local date.
// Without a link (or with one that can't be read) the page works the day out for any school instead: the visitor picks one
// school day they're sure of and the days off since, and it counts school days from there (E.rotationFrom). Those answers are
// kept in this browser's localStorage only.
import * as E from "./engine.js";


async function run(mount) {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const m = location.hash.match(/[#&]c=([\w-]+)/);
  const cfg = m ? await E.decodeShare(m[1]).catch(() => null) : null;
  if (!cfg) return workItOut(mount, esc, !!m);
  const res = E.compute(cfg);
  if (res.errors.length) { mount.innerHTML = `<p class="bb-err">${esc(res.errors[0])}</p>`; return; }
  const TODAY = E.localToday();
  const chip = (day, text) => { const [f, i] = E.colorFor(day); return `style="--f:${f};--i:${i}"`; };

  function view(d) {
    const day = E.dayAt(res, d);
    const isToday = d === TODAY;
    const when = isToday ? "Today" : E.fmtShort(d);
    let big, next = "";
    if (!day) {
      if (d < res.s) {
        const f = E.nextSchoolDay(res, res.s);
        big = `<div class="td-big td-none">School starts ${E.fmtShort(f ? f.n : res.s)}</div>`;
        if (f && E.longLabel(cfg, f)) next = `The first day is ${esc(E.longLabel(cfg, f))}.`;
      } else big = `<div class="td-big td-none">The school year has ended</div>`, next = `The last day was ${E.fmtLong(res.last ?? res.e)}.`;
    } else if (day.school) {
      const lab = E.longLabel(cfg, day);
      big = lab ? `<div class="td-big" ${chip(day)}>${esc(lab)}</div>` : `<div class="td-big td-none">${esc(day.name || "School day")}</div>`;
      const nx = E.nextSchoolDay(res, d + 1);
      if (nx) next = `${nx.n === d + 1 ? "Tomorrow" : `Next school day, ${E.fmtShort(nx.n)}`}: ${esc(E.longLabel(cfg, nx) || nx.name || "school day")}`;
    } else {
      big = `<div class="td-big td-none">No school${day.kind === "weekend" ? "" : `: ${esc(day.name)}`}</div>`;
      const nx = E.nextSchoolDay(res, d + 1);
      if (nx) next = `Next school day, ${E.fmtShort(nx.n)}: <strong>${esc(E.longLabel(cfg, nx) || nx.name || "school day")}</strong>`;
    }
    const upcoming = [];
    for (let x = Math.max(d + 1, res.s); x <= res.e && upcoming.length < 10; x++) {
      const dd = E.dayAt(res, x);
      if (dd.school) upcoming.push(`<li><span>${E.fmtShort(x)}</span>${E.longLabel(cfg, dd) ? `<b ${chip(dd)}>${esc(E.longLabel(cfg, dd))}</b>` : `<span>${esc(dd.name || "School day")}</span>`}</li>`);
      else if (dd.kind === "off" || dd.kind === "closed") upcoming.push(`<li class="td-off"><span>${E.fmtShort(x)}</span><span>No school: ${esc(dd.name)}</span></li>`);
    }
    const notes = day && day.notes.length ? `<p class="small">${esc(day.notes.join(" · "))}</p>` : "";
    return `<p class="td-date">${when === "Today" ? `Today, ${E.fmtLong(d)}` : E.fmtLong(d)}</p>${big}${notes}${next ? `<p class="td-next">${next}</p>` : ""}
      ${upcoming.length ? `<ul class="td-list" aria-label="Coming up">${upcoming.join("")}</ul>` : ""}`;
  }

  const title = E.calName(cfg);
  mount.innerHTML = `<p class="td-school">${esc(title)}</p>${cfg.school && !title.includes(cfg.school) ? `<p class="small muted" style="margin:0">${esc(cfg.school)}</p>` : ""}
    <div class="td-view" aria-live="polite">${view(TODAY)}</div>
    <div class="td-check"><div><label for="td-date">Check another date</label><input type="date" id="td-date" min="${cfg.start}" max="${cfg.end}" value="${E.iso(Math.min(Math.max(TODAY, res.s), res.e))}"></div><button type="button" class="btn ghost sm" data-a="today">Back to today</button></div>
    <div class="td-acts">
      <button type="button" class="btn" data-a="ics">Add to my calendar (.ics)</button>
      <button type="button" class="btn ghost" data-a="copy">Copy this link</button><button type="button" class="btn ghost" data-a="poster">Classroom poster (PDF)</button>
      <a class="btn ghost" href="/#c=${m[1]}">Open in the calendar maker</a>
    </div>
    <p class="small muted bb-tstatus" role="status"></p>
    <p class="small muted">Made with <a href="${E.CREDIT_URL}">BellBook</a> · free A/B day calendar generator</p>`;

  const viewEl = mount.querySelector(".td-view"), st = mount.querySelector(".bb-tstatus");
  const fileBase = title.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "rotation-calendar";
  const save = (blob, name) => {
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  mount.addEventListener("change", e => { if (e.target.id === "td-date" && E.isIso(e.target.value)) viewEl.innerHTML = view(E.dn(e.target.value)); });
  mount.addEventListener("click", async e => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "today") { viewEl.innerHTML = view(TODAY); mount.querySelector("#td-date").value = E.iso(Math.min(Math.max(TODAY, res.s), res.e)); }
    else if (a === "ics") {
      save(new Blob([E.buildIcs(res)], { type: "text/calendar;charset=utf-8" }), fileBase + ".ics");
      st.textContent = "Calendar file downloaded. Import it into a new calendar in Google, Outlook or Apple Calendar.";
      try { window.va && window.va("event", { name: "ics_exported", data: { from: "today" } }); } catch {}
    } else if (a === "copy") {
      try { await navigator.clipboard.writeText(location.href); st.textContent = "Link copied."; } catch { st.textContent = "Copy the address from your browser's address bar."; }
    } else if (a === "poster") {
      const btn = e.target.closest("button"), old = btn.textContent;
      btn.disabled = true; btn.textContent = "Making PDF…";
      try {
        // Same paper size as the calendar maker when this browser has used it; US Letter otherwise.
        let size = "letter";
        try { size = JSON.parse(localStorage.getItem("bb_ui") || "{}").size === "a4" ? "a4" : "letter"; } catch {}
        const { makePoster } = await import("./poster.js");
        const doc = await makePoster(res, `${location.origin}/today#c=${m[1]}`, { size });
        save(doc.output("blob"), fileBase + "-poster.pdf");
        st.textContent = "Poster downloaded. Print it for your classroom: students scan the QR code to see today's day.";
        try { window.va && window.va("event", { name: "poster_pdf", data: { from: "today" } }); } catch {}
      } catch (err) { st.textContent = err.message || String(err); }
      finally { btn.disabled = false; btn.textContent = old; }
    }
  });
  document.title = `${title}: what day is it today? | BellBook`;
}

// No school link: count from a day the visitor is sure of.
const ROTS = [["ab", "A/B days", ["A", "B"], "{L} Day"], ["abc", "A/B/C days", ["A", "B", "C"], "{L} Day"],
  ...[4, 5, 6, 7, 8].map(n => [`d${n}`, `Day 1–${n}`, E.dayNLabels(n), "Day {L}"])];
const CALC_KEY = "bb_today_calc";

function workItOut(mount, esc, badLink) {
  const TODAY = E.localToday();
  const weekend = d => E.wday(d) === 0 || E.wday(d) === 6;
  let last = TODAY - 1;
  while (weekend(last)) last--;
  const st = { rot: "ab", ref: E.iso(last), lab: "", off: [] };
  try { Object.assign(st, JSON.parse(localStorage.getItem(CALC_KEY) || "{}")); } catch {}
  if (!ROTS.some(r => r[0] === st.rot)) st.rot = "ab";
  st.off = (Array.isArray(st.off) ? st.off : []).filter(E.isIso);
  const rot = () => ROTS.find(r => r[0] === st.rot);
  const save = () => { try { localStorage.setItem(CALC_KEY, JSON.stringify(st)); } catch {} };
  const labOpts = () => `<option value="">Choose…</option>` + rot()[2].map(l => `<option value="${l}"${l === st.lab ? " selected" : ""}>${esc(rot()[3].replace("{L}", l))}</option>`).join("");
  const offChips = () => st.off.map(d => `<li>${E.fmtShort(E.dn(d))} <button type="button" class="tc-x" data-a="rmoff" data-d="${d}" aria-label="Remove ${E.fmtShort(E.dn(d))}">×</button></li>`).join("");
  let counted = false;
  const track = (name, data) => { try { window.va && window.va("event", data ? { name, data } : { name }); } catch {} };
  const lastIso = E.iso(last);
  // The one-tap answer: an A/B school, and the visitor says what the last school day was.
  const quick = () => st.rot === "ab" && st.ref === lastIso && !st.off.length;
  const quickBtns = () => ["A", "B"].map(l => `<button type="button" class="btn${quick() && st.lab === l ? "" : " ghost"}" data-a="preset" data-l="${l}" aria-pressed="${quick() && st.lab === l}">It was ${l === "A" ? "an A" : "a B"} day</button>`).join("");

  function result() {
    const [, , labels, fmt] = rot(), n = labels.length, idx = labels.indexOf(st.lab);
    if (!E.isIso(st.ref)) return `<p class="td-next">Pick a school day you're sure of.</p>`;
    const ref = E.dn(st.ref), off = new Set(st.off.map(E.dn));
    if (idx < 0) return `<p class="td-next muted">Tap A or B above and today's day shows here.</p>`;
    if (weekend(ref) || off.has(ref)) return `<p class="bb-err">Pick a school day for the day you're sure of, not a weekend or a day off.</p>`;
    const at = d => E.rotationFrom(ref, idx, n, off, d);
    const name = i => esc(fmt.replace("{L}", labels[i]));
    const chip = i => { const [f, c] = E.colorFor({ ci: i }); return `style="--f:${f};--i:${c}"`; };
    const t = at(TODAY);
    const big = t >= 0 ? `<div class="td-big" ${chip(t)}>${name(t)}</div>`
      : `<div class="td-big td-none">No school today${off.has(TODAY) ? ": day off" : ""}</div>`;
    const up = [];
    for (let x = TODAY + 1; x <= TODAY + 40 && up.length < 10; x++) { const i = at(x); if (i >= 0) up.push([x, i]); }
    const next = up.length ? `${up[0][0] === TODAY + 1 ? "Tomorrow" : `Next school day, ${E.fmtShort(up[0][0])}`}: <strong>${name(up[0][1])}</strong>` : "";
    if (!counted) { counted = true; track("today_calc", { rot: st.rot, quick: quick() }); }
    return `<p class="td-date">Today, ${E.fmtLong(TODAY)}</p>${big}${next ? `<p class="td-next">${next}</p>` : ""}
      <ul class="td-list" aria-label="Coming up">${up.map(([x, i]) => `<li><span>${E.fmtShort(x)}</span><b ${chip(i)}>${name(i)}</b></li>`).join("")}</ul>`;
  }

  mount.innerHTML = `${badLink ? `<p class="notice td-demo">This link couldn't be read. Ask for a new link, or work the day out below.</p>` : ""}
    <p class="tc-q" id="tc-q">Which was your last school day, <strong>${E.fmtShort(last)}</strong>?</p>
    <div class="tc-quick" role="group" aria-labelledby="tc-q">${quickBtns()}</div>
    <div class="td-view" aria-live="polite">${result()}</div>
    <details class="tc-more"${quick() || (!st.lab && st.rot === "ab" && !st.off.length) ? "" : " open"}>
      <summary>Different schedule, or days off since?</summary>
      <p class="small muted" style="margin:6px 0 12px">Pick one school day you're sure of. Weekends are skipped, and you can add the days off since then. Use this for A/B/C and Day 1–8 schedules too.</p>
      <div class="tc-form">
        <div><label for="tc-rot">Your school's rotation</label><select id="tc-rot">${ROTS.map(r => `<option value="${r[0]}"${r[0] === st.rot ? " selected" : ""}>${r[1]}</option>`).join("")}</select></div>
        <div><label for="tc-ref">A school day you're sure of</label><input type="date" id="tc-ref" max="${E.iso(TODAY)}" value="${esc(st.ref)}"></div>
        <div><label for="tc-lab">That day was</label><select id="tc-lab">${labOpts()}</select></div>
      </div>
      <div class="td-check"><div><label for="tc-off">Days off since then (holidays, snow days)</label><input type="date" id="tc-off"></div><button type="button" class="btn ghost sm" data-a="addoff">Add day off</button></div>
      <ul class="tc-offs" aria-label="Days off">${offChips()}</ul>
    </details>
    <p class="small muted">This assumes no other days off. After a snow day or a special schedule, add it above or check with your school. Your answers stay on this device, so the page remembers them next time.</p>
    <p class="notice td-demo"><strong>Teachers:</strong> <a href="/" data-a="school-link">make your school's full calendar</a> with the holidays built in, then share a "What day is it?" link or print a classroom poster with a QR code.</p>
    <p class="small muted">Made with <a href="${E.CREDIT_URL}">BellBook</a> · free A/B day calendar generator</p>`;

  const viewEl = mount.querySelector(".td-view"), offsEl = mount.querySelector(".tc-offs"), labEl = mount.querySelector("#tc-lab"),
    quickEl = mount.querySelector(".tc-quick"), refEl = mount.querySelector("#tc-ref"), rotEl = mount.querySelector("#tc-rot");
  const redraw = () => { save(); viewEl.innerHTML = result(); offsEl.innerHTML = offChips(); quickEl.innerHTML = quickBtns(); };
  mount.addEventListener("change", e => {
    const id = e.target.id, v = e.target.value;
    if (id === "tc-rot") { st.rot = v; if (!rot()[2].includes(st.lab)) st.lab = ""; labEl.innerHTML = labOpts(); }
    else if (id === "tc-ref") st.ref = E.isIso(v) ? v : "";
    else if (id === "tc-lab") st.lab = v;
    else return;
    redraw();
  });
  mount.addEventListener("click", e => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    if (b.dataset.a === "school-link") track("school_link_click", { from: "today" });
    else if (b.dataset.a === "preset") {
      st.rot = "ab"; st.ref = lastIso; st.lab = b.dataset.l; st.off = [];
      rotEl.value = "ab"; refEl.value = lastIso; labEl.innerHTML = labOpts();
      track("today_preset", { l: st.lab });
      redraw();
    } else if (b.dataset.a === "addoff") {
      const v = mount.querySelector("#tc-off").value;
      if (E.isIso(v) && !st.off.includes(v)) { st.off.push(v); st.off.sort(); }
      mount.querySelector("#tc-off").value = "";
      redraw();
    } else if (b.dataset.a === "rmoff") { st.off = st.off.filter(d => d !== b.dataset.d); redraw(); }
  });
}

// Last, so ROTS and CALC_KEY above are initialised before the page can need them.
const mount = document.getElementById("bb-today");
if (mount) run(mount);
