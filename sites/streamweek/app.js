// StreamWeek UI. #sw-tool mounts the schedule maker (data-preset picks a landing-page preset).
// Everything runs in the browser: the schedule autosaves to this browser's localStorage, the image
// is drawn on a canvas by render.js, and the uploaded picture never leaves the device.
(() => {
  const C = window.SWCore, R = window.SWRender;
  const mount = document.getElementById("sw-tool");
  if (!C || !R || !mount) return;
  const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("sw_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("sw_" + k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem("sw_" + k); } catch {} },
  };
  const track = (name, data) => { try { window.va && window.va("event", data ? { name, data } : { name }); } catch {} };
  const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "stream-schedule";
  const saveBlob = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };
  const browserTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } })();
  let ZONES = [];
  try { ZONES = Intl.supportedValuesOf("timeZone"); } catch { ZONES = C.PRESET_ZONES.map(z => z[1]); }
  for (const z of ["UTC", browserTz]) if (C.validTz(z) && !ZONES.includes(z)) ZONES.unshift(z);

  // ---------- state ----------
  const preset = C.PRESETS[mount.dataset.preset] ? mount.dataset.preset : "";
  const saved = store.get("state", null);
  let s = C.normalize(saved, { homeTz: browserTz });
  if (!saved) s = C.applyPreset(s, preset || "home");
  let img = null, imgUrl = store.get("img", "");
  const save = () => store.set("state", s);

  // ---------- markup ----------
  const zoneOpts = (() => {
    const common = C.PRESET_ZONES.map(([l, z]) => `<option value="${z}">${esc(C.cityOf(z))} (${l})</option>`).join("");
    const all = ZONES.map(z => `<option value="${esc(z)}">${esc(z.replace(/_/g, " "))}</option>`).join("");
    return `<optgroup label="Common">${common}</optgroup><optgroup label="All time zones">${all}</optgroup>`;
  })();
  const chip = (name, v, label, extra = "") => `<label class="sw-chip"><input type="radio" name="${name}" value="${v}"${extra}><span>${label}</span></label>`;
  const field = (id, label, attrs) => `<div><label for="sw-${id}">${label}</label><input id="sw-${id}" ${attrs}></div>`;
  mount.innerHTML = `
  <div class="sw">
    <form class="sw-form" autocomplete="off" novalidate>
      ${preset && saved ? `<p class="sw-presetrow"><button type="button" class="btn ghost sm" data-a="preset">Use this page's look and time zones</button> <span class="small muted">Keeps your streams.</span></p>` : ""}
      <section class="sw-sec" aria-labelledby="sw-h-week">
        <h3 id="sw-h-week">Week</h3>
        <div class="row">
          <div><label for="sw-week">Week starting</label><input type="date" id="sw-week" required></div>
          <div class="sw-weekbtns"><button type="button" class="btn ghost sm" data-a="prev" aria-label="Previous week">← Prev</button><button type="button" class="btn sm" data-a="next">Next week →</button></div>
        </div>
        <label class="sw-check"><input type="checkbox" id="sw-sunday"> Weeks start on Sunday</label>
        <p class="small muted sw-hint">“Next week” keeps every stream and moves the dates forward 7 days. Your schedule saves automatically in this browser.</p>
      </section>
      <section class="sw-sec" aria-labelledby="sw-h-det">
        <h3 id="sw-h-det">Details</h3>
        <div class="row">
          ${field("title", "Schedule title", `maxlength="${C.LIMITS.title}" data-f="title" placeholder="Stream Schedule"`)}
          ${field("channel", "Channel name or handle", `maxlength="${C.LIMITS.channel}" data-f="channel" placeholder="@yourchannel"`)}
        </div>
        ${field("note", "Note line (optional)", `maxlength="${C.LIMITS.note}" data-f="note" placeholder="Times may change, check Discord"`)}
      </section>
      <section class="sw-sec" aria-labelledby="sw-h-tz">
        <h3 id="sw-h-tz">Time zones</h3>
        <label for="sw-home">Your time zone (you type times in this zone)</label>
        <select id="sw-home">${zoneOpts}</select>
        <div class="sw-g3">
          ${[0, 1, 2].map(n => `<div><label for="sw-v${n}">Viewer zone ${n + 1}</label><select id="sw-v${n}" data-v="${n}"><option value="">None</option>${zoneOpts}</select></div>`).join("")}
        </div>
        <div class="sw-quick" role="group" aria-label="Quick viewer zones">
          <span class="small muted">Quick add:</span>
          ${C.PRESET_ZONES.map(([l, z]) => `<button type="button" class="sw-qz" data-zone="${z}" aria-pressed="false" title="${esc(z)}">${l}</button>`).join("")}
        </div>
        <p class="small muted sw-zmsg" aria-live="polite"></p>
      </section>
      <section class="sw-sec" aria-labelledby="sw-h-days">
        <div class="sw-dayshead"><h3 id="sw-h-days">Streams</h3><button type="button" class="btn ghost sm" data-a="clear">Clear all</button></div>
        <p class="small muted sw-hint">Leave a day without a start time to show it as TBA, or tick Offline. An end time earlier than the start runs past midnight.</p>
        <div class="sw-days"></div>
      </section>
      <section class="sw-sec" aria-labelledby="sw-h-look">
        <h3 id="sw-h-look">Look</h3>
        <fieldset class="sw-fs"><legend>Theme</legend><div class="sw-chips">${C.THEMES.map(t => chip("theme", t, R.THEMES[t].label)).join("")}</div></fieldset>
        <div class="sw-color">
          <div><label for="sw-accent">Accent colour</label><input type="color" id="sw-accent"></div>
          <button type="button" class="btn ghost sm" data-a="accent-reset">Use theme colour</button>
        </div>
        <div class="row">
          <div><label for="sw-labels">Day labels</label><select id="sw-labels"><option value="en">English (MON TUE)</option><option value="ja">Japanese (月 火)</option><option value="both">Bilingual (MON 月)</option></select></div>
          <fieldset class="sw-fs"><legend>Clock</legend><div class="sw-chips">${chip("clock", "12", "12-hour")}${chip("clock", "24", "24-hour")}</div></fieldset>
        </div>
        <div class="sw-img">
          <label for="sw-file">Avatar, logo or model art (optional)</label>
          <input type="file" id="sw-file" accept="image/png,image/jpeg,image/webp,image/gif">
          <p class="small muted sw-hint">Stays in this browser. Square images work best; tall art is cropped from the top.</p>
          <button type="button" class="btn ghost sm" data-a="noimg" hidden>Remove picture</button>
        </div>
      </section>
    </form>
    <div class="sw-out">
      <fieldset class="sw-fs sw-sizes"><legend>Image size</legend><div class="sw-chips">${Object.entries(C.SIZES).map(([k, v]) => chip("size", k, v.label)).join("")}</div></fieldset>
      <figure class="sw-fig">
        <div class="sw-canvasbox"><canvas id="sw-canvas" width="1920" height="1080" role="img" aria-label="Preview of the schedule image"></canvas></div>
        <figcaption class="small muted" id="sw-cap"></figcaption>
      </figure>
      <div class="sw-actions">
        <button type="button" class="btn" data-a="png">Download PNG</button>
        <button type="button" class="btn ghost" data-a="discord">Copy for Discord</button>
        <button type="button" class="btn ghost" data-a="x">Copy for X</button>
        <button type="button" class="btn ghost" data-a="ics">Download .ics</button>
      </div>
      <p class="small muted sw-dnote">Discord shows the copied <code>&lt;t:…&gt;</code> timestamps in each viewer's own local time.</p>
      <div class="sw-warn small" role="status" aria-live="polite"></div>
      <div class="sw-copy" hidden>
        <label for="sw-text" id="sw-textlbl">Copied text</label>
        <textarea id="sw-text" rows="9" readonly></textarea>
        <p class="small muted" id="sw-copymsg" aria-live="polite"></p>
      </div>
    </div>
  </div>`;

  const $ = sel => mount.querySelector(sel);
  const form = $(".sw-form"), canvas = $("#sw-canvas"), daysBox = $(".sw-days");

  function dayHtml(i) {
    const d = s.days[i], info = C.dayInfo(C.addDays(s.weekStart, i));
    const st = (x, j) => {
      const id = `sw-d${i}s${j}`, a = (k, extra) => `id="${id}-${k}" data-d="${i}" data-j="${j}" data-k="${k}" ${extra}`;
      return `<div class="sw-stream">${j ? `<p class="sw-sh">Second stream</p>` : ""}
        <div class="sw-g2">
          <div><label for="${id}-start">Start</label><input type="time" ${a("start", `value="${x.start}"`)}></div>
          <div><label for="${id}-end">End <span class="muted">(optional)</span></label><input type="time" ${a("end", `value="${x.end}"`)}></div>
        </div>
        <div class="sw-g2">
          <div><label for="${id}-title">Title</label><input ${a("title", `maxlength="${C.LIMITS.sTitle}" value="${esc(x.title)}"`)}></div>
          <div><label for="${id}-game">Game / category</label><input ${a("game", `maxlength="${C.LIMITS.game}" value="${esc(x.game)}"`)}></div>
        </div></div>`;
    };
    return `<fieldset class="sw-day${d.off ? " is-off" : ""}" id="sw-day${i}">
      <legend>${info.full}, ${info.dateEn} <span class="muted" lang="ja">${info.ja}</span></legend>
      <label class="sw-check sw-offck"><input type="checkbox" id="sw-d${i}-off" data-d="${i}" data-k="off"${d.off ? " checked" : ""}> Offline</label>
      <div class="sw-streams"${d.off ? " hidden" : ""}>
        ${d.streams.map(st).join("")}
        ${d.streams.length < 2 ? `<button type="button" class="btn ghost sm" data-a="add" data-d="${i}">+ Second stream</button>` : `<button type="button" class="btn ghost sm" data-a="rm" data-d="${i}">Remove second stream</button>`}
      </div>
    </fieldset>`;
  }
  const renderDays = () => { daysBox.innerHTML = s.days.map((_, i) => dayHtml(i)).join(""); };
  function renderDay(i, focusSel) {
    const el = $(`#sw-day${i}`);
    el.outerHTML = dayHtml(i);
    if (focusSel) { const f = $(focusSel); if (f) f.focus(); }
  }

  function syncForm() {
    $("#sw-week").value = s.weekStart;
    $("#sw-sunday").checked = s.startSunday;
    for (const k of ["title", "channel", "note"]) $(`#sw-${k}`).value = s[k];
    $("#sw-home").value = s.homeTz;
    [0, 1, 2].forEach(n => { $(`#sw-v${n}`).value = s.viewers[n] || ""; });
    form.querySelectorAll('input[name="theme"]').forEach(r => { r.checked = r.value === s.theme; });
    form.querySelectorAll('input[name="clock"]').forEach(r => { r.checked = r.value === s.clock; });
    mount.querySelectorAll('input[name="size"]').forEach(r => { r.checked = r.value === s.size; });
    $("#sw-labels").value = s.labels;
    $("#sw-accent").value = s.accent || R.THEMES[s.theme].accent;
    syncZones();
    renderDays();
  }
  function syncZones() {
    mount.querySelectorAll(".sw-qz").forEach(b => b.setAttribute("aria-pressed", String(s.viewers.includes(b.dataset.zone))));
    [0, 1, 2].forEach(n => { $(`#sw-v${n}`).value = s.viewers[n] || ""; });
  }

  // ---------- preview ----------
  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  function draw() {
    const size = R.draw(canvas, s, img, s.size), info = C.SIZES[s.size];
    canvas.setAttribute("aria-label", `Preview of the ${size.w} × ${size.h} schedule image`);
    $("#sw-cap").textContent = `${size.w} × ${size.h} px · ${info.hint}`;
    const wk = C.computeWeek(s);
    const warn = [...wk.warnings];
    if (s.viewers.includes(s.homeTz)) warn.push("A viewer zone is the same as your home zone, so it's left off the image.");
    $(".sw-warn").innerHTML = warn.map(w => `<p>⚠ ${esc(w)}</p>`).join("");
  }
  const changed = () => { save(); schedule(); };

  // ---------- events ----------
  form.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.f) { s[t.dataset.f] = t.value.slice(0, C.LIMITS[t.dataset.f]); return changed(); }
    if (t.dataset.k && t.dataset.k !== "off") {
      const x = s.days[+t.dataset.d].streams[+t.dataset.j];
      x[t.dataset.k] = t.value;
      return changed();
    }
    if (t.id === "sw-accent") { s.accent = t.value.toLowerCase(); return changed(); }
  });
  form.addEventListener("change", e => {
    const t = e.target;
    if (t.id === "sw-week") {
      if (!C.isIso(t.value)) { t.value = s.weekStart; return; }
      s = C.setWeekStart(s, t.value);
      t.value = s.weekStart; renderDays(); return changed();
    }
    if (t.id === "sw-sunday") { s = C.setStartSunday(s, t.checked); $("#sw-week").value = s.weekStart; renderDays(); return changed(); }
    if (t.id === "sw-home") { s.homeTz = t.value; return changed(); }
    if (t.dataset.v !== undefined) {
      const v = [0, 1, 2].map(n => $(`#sw-v${n}`).value).filter(Boolean);
      s.viewers = [...new Set(v)];
      syncZones(); return changed();
    }
    if (t.dataset.k === "off") {
      const i = +t.dataset.d;
      s.days[i].off = t.checked;
      const box = $(`#sw-day${i}`);
      box.classList.toggle("is-off", t.checked);
      box.querySelector(".sw-streams").hidden = t.checked;
      return changed();
    }
    if (t.name === "theme") { s.theme = t.value; s.accent = ""; $("#sw-accent").value = R.THEMES[s.theme].accent; return changed(); }
    if (t.name === "clock") { s.clock = t.value; return changed(); }
    if (t.id === "sw-labels") { s.labels = t.value; return changed(); }
    if (t.id === "sw-file") return loadFile(t.files && t.files[0]);
  });
  mount.querySelector(".sw-sizes").addEventListener("change", e => { if (e.target.name === "size") { s.size = e.target.value; changed(); } });
  mount.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b || !mount.contains(b)) return;
    if (b.dataset.zone) return toggleZone(b.dataset.zone);
    const a = b.dataset.a;
    if (!a) return;
    if (a === "next" || a === "prev") {
      s = a === "next" ? C.nextWeek(s) : C.prevWeek(s);
      $("#sw-week").value = s.weekStart; renderDays(); changed();
      track("week_moved", { dir: a });
    } else if (a === "clear") {
      if (!confirm("Clear every stream on this week? Titles, times and offline days are reset.")) return;
      s.days = s.days.map(() => ({ off: false, streams: [C.blankStream()] }));
      renderDays(); changed();
    } else if (a === "add") {
      const i = +b.dataset.d;
      s.days[i].streams.push(C.blankStream());
      renderDay(i, `#sw-d${i}s1-start`); changed();
    } else if (a === "rm") {
      const i = +b.dataset.d;
      s.days[i].streams = s.days[i].streams.slice(0, 1);
      renderDay(i, `#sw-day${i} [data-a="add"]`); changed();
    } else if (a === "accent-reset") { s.accent = ""; $("#sw-accent").value = R.THEMES[s.theme].accent; changed(); }
    else if (a === "noimg") { img = null; imgUrl = ""; store.del("img"); $("#sw-file").value = ""; b.hidden = true; changed(); }
    else if (a === "preset") { const n = C.applyPreset(s, preset); n.days = s.days; n.title = s.title; s = n; syncForm(); changed(); }
    else if (a === "png") exportPng(b);
    else if (a === "discord" || a === "x") copyText(a);
    else if (a === "ics") exportIcs();
  });
  function toggleZone(z) {
    const msg = $(".sw-zmsg");
    msg.textContent = "";
    if (s.viewers.includes(z)) s.viewers = s.viewers.filter(v => v !== z);
    else if (z === s.homeTz) msg.textContent = "That's already your home zone.";
    else if (s.viewers.length >= 3) msg.textContent = "Up to 3 viewer zones. Remove one first.";
    else s.viewers = [...s.viewers, z];
    syncZones(); changed();
  }

  // ---------- picture ----------
  function setImg(url) {
    if (!url) { img = null; return; }
    const im = new Image();
    im.onload = () => { img = im; $('[data-a="noimg"]').hidden = false; schedule(); };
    im.onerror = () => { img = null; };
    im.src = url;
  }
  function loadFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { $(".sw-warn").innerHTML = "<p>⚠ That file isn't an image.</p>"; return; }
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        // Downscale so it fits in local storage; 720 px is plenty for the biggest slot.
        const max = 720, f = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.naturalWidth * f)); c.height = Math.max(1, Math.round(im.naturalHeight * f));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        let url = c.toDataURL("image/webp", 0.9);
        if (!url.startsWith("data:image/webp")) url = c.toDataURL("image/png");
        imgUrl = url;
        if (!store.set("img", url)) $(".sw-warn").innerHTML = "<p>⚠ The picture is too big to remember after a reload, but it's used for this session.</p>";
        setImg(url);
        track("image_added");
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  // ---------- exports ----------
  const base = () => `${slug(s.title)}-${s.weekStart}`;
  async function exportPng(btn) {
    btn.disabled = true;
    try {
      await R.loadFonts();
      const blob = await R.png(s, img, s.size);
      const { w, h } = C.SIZES[s.size].h ? C.SIZES[s.size] : { w: 320, h: "auto" };
      saveBlob(blob, `${base()}-${s.size === "panel" ? "panel-320" : `${w}x${h}`}.png`);
      track("png_downloaded", { size: s.size, theme: s.theme });
    } finally { btn.disabled = false; }
  }
  async function copyText(kind) {
    const text = kind === "discord" ? C.discordText(s) : C.xText(s);
    const box = $(".sw-copy"), ta = $("#sw-text"), msg = $("#sw-copymsg");
    box.hidden = false; ta.value = text; box.dataset.kind = kind;
    $("#sw-textlbl").textContent = kind === "discord" ? "Discord text (timestamps convert for each viewer)" : "Text for X";
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { ta.focus(); ta.select(); }
    const n = C.xLength(text);
    msg.textContent = (ok ? "Copied. " : "Select the text above and copy it. ") +
      (kind === "discord" ? "Paste it into a Discord message or channel." : `About ${n} characters${n > 280 ? ", over the 280 a standard X post allows, so trim titles or post the image with a shorter caption." : "."}`);
    track(kind === "discord" ? "discord_copied" : "x_copied");
  }
  function exportIcs() {
    const wk = C.computeWeek(s);
    if (!wk.items.length) { $(".sw-warn").innerHTML = "<p>⚠ Add at least one stream with a start time first.</p>"; return; }
    saveBlob(new Blob([C.buildIcs(s, { week: wk })], { type: "text/calendar;charset=utf-8" }), `${base()}.ics`);
    track("ics_downloaded", { n: String(wk.items.length) });
  }

  syncForm();
  draw();
  R.loadFonts().then(schedule);
  if (imgUrl) setImg(imgUrl);
})();
