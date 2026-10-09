// BellBook "What day is it today?" page. The calendar is decoded from the URL hash (#c=...),
// so nothing is stored on a server. Dates use the viewer's own local date.
import * as E from "./engine.js";

const mount = document.getElementById("bb-today");
if (mount) run(mount);

async function run(mount) {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const m = location.hash.match(/[#&]c=([\w-]+)/);
  let cfg = m ? await E.decodeShare(m[1]) : null;
  const demo = !cfg;
  if (!cfg) { cfg = E.sample("ab"); delete cfg.pl; }
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
  mount.innerHTML = `${demo ? `<p class="notice td-demo">This is an example calendar. Open the link your school or teacher shared, or <a href="/">make a link for your school</a> in two minutes.</p>` : ""}
    <p class="td-school">${esc(title)}</p>${cfg.school && !title.includes(cfg.school) ? `<p class="small muted" style="margin:0">${esc(cfg.school)}</p>` : ""}
    <div class="td-view" aria-live="polite">${view(TODAY)}</div>
    <div class="td-check"><div><label for="td-date">Check another date</label><input type="date" id="td-date" min="${cfg.start}" max="${cfg.end}" value="${E.iso(Math.min(Math.max(TODAY, res.s), res.e))}"></div><button type="button" class="btn ghost sm" data-a="today">Back to today</button></div>
    <div class="td-acts">
      <button type="button" class="btn" data-a="ics">Add to my calendar (.ics)</button>
      ${demo ? "" : `<button type="button" class="btn ghost" data-a="copy">Copy this link</button>`}
      <a class="btn ghost" href="/${demo ? "" : `#c=${m[1]}`}">${demo ? "Make your school's calendar" : "Open in the calendar maker"}</a>
    </div>
    <p class="small muted bb-tstatus" role="status"></p>
    <p class="small muted">Made with <a href="${E.CREDIT_URL}">BellBook</a> · free A/B day calendar generator</p>`;

  const viewEl = mount.querySelector(".td-view"), st = mount.querySelector(".bb-tstatus");
  mount.addEventListener("change", e => { if (e.target.id === "td-date" && E.isIso(e.target.value)) viewEl.innerHTML = view(E.dn(e.target.value)); });
  mount.addEventListener("click", async e => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "today") { viewEl.innerHTML = view(TODAY); mount.querySelector("#td-date").value = E.iso(Math.min(Math.max(TODAY, res.s), res.e)); }
    else if (a === "ics") {
      const blob = new Blob([E.buildIcs(res)], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = (title.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "rotation-calendar") + ".ics";
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      st.textContent = "Calendar file downloaded. Import it into a new calendar in Google, Outlook or Apple Calendar.";
      try { window.va && window.va("event", { name: "ics_exported", data: { from: "today" } }); } catch {}
    } else if (a === "copy") {
      try { await navigator.clipboard.writeText(location.href); st.textContent = "Link copied."; } catch { st.textContent = "Copy the address from your browser's address bar."; }
    }
  });
  if (!demo) document.title = `${title}: what day is it today? | BellBook`;
}
