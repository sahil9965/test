/* GradLedger UI. Mounts:
   #gl-app      full transcript builder (data-tab picks the first tab)
   #gl-gpa      standalone GPA calculator
   #gl-credits  hours-to-credits calculator
   #gl-descgen  course-description generator
   Everything stays in this browser (localStorage). PDFs are made on the device with jsPDF. */
(() => {
  "use strict";
  const E = window.GLEngine;
  if (!E) return;
  const KEY = "gl_data";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const track = name => { try { window.va && window.va("event", { name }); } catch (e) { /* analytics is optional */ } };
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const opt = (v, label, sel) => `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(label)}</option>`;
  const subjOpts = sel => E.SUBJECTS.map(([k, n]) => opt(k, n, sel)).join("");
  const levelOpts = sel => E.LEVELS.map(([k, n]) => opt(k, n, sel)).join("");
  const fileSafe = s => (String(s || "").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "student").slice(0, 60);

  // ---- Storage ------------------------------------------------------------------------------
  let storageOK = true;
  const store = {
    load() {
      try { const raw = localStorage.getItem(KEY); return raw ? E.normalize(JSON.parse(raw)) : null; }
      catch (e) { return null; }
    },
    save(d) {
      try { d.savedAt = new Date().toISOString(); localStorage.setItem(KEY, JSON.stringify(d)); storageOK = true; return true; }
      catch (e) { storageOK = false; return false; }
    },
    get(k, def) { try { const v = localStorage.getItem("gl_" + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem("gl_" + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };

  // ---- PDF library (lazy) -------------------------------------------------------------------
  let docsP = null;
  function docs() {
    if (!docsP) {
      docsP = new Promise((res, rej) => {
        if (window.GLDocs) return res();
        const s = document.createElement("script");
        s.src = "/docs.js"; s.async = true;
        s.onload = () => res(); s.onerror = () => rej(new Error("Couldn't load the document builder. Check your connection and try again."));
        document.head.appendChild(s);
      }).then(() => window.GLDocs.load()).then(() => window.GLDocs).catch(e => { docsP = null; throw e; });
    }
    return docsP;
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  // ---- Toast --------------------------------------------------------------------------------
  let toastEl, toastTimer;
  function toast(msg, undo) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "gl-toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button" class="btn sm ghost">Undo</button>' : ""}`;
    toastEl.classList.add("on");
    if (undo) toastEl.querySelector("button").onclick = () => { undo(); toastEl.classList.remove("on"); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("on"), undo ? 7000 : 3500);
  }

  // ---- Images (logo, signature) ---------------------------------------------------------------
  function fileToImage(file, maxW, maxH) {
    return new Promise((res, rej) => {
      if (!file || !/^image\/(png|jpeg|gif|webp|bmp|svg\+xml)$/.test(file.type)) return rej(new Error("Choose a PNG or JPG image."));
      if (file.size > 15e6) return rej(new Error("That image is too large (15 MB max)."));
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => {
        const s = Math.min(1, maxW / im.naturalWidth, maxH / im.naturalHeight);
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL("image/png"));
      };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("That file couldn't be read as an image.")); };
      im.src = url;
    });
  }
  function signaturePad(onSave) {
    const dlg = document.createElement("dialog");
    dlg.className = "gl-dlg";
    dlg.innerHTML = `<h3>Draw your signature</h3><p class="small muted">Use a finger, stylus or mouse. It's saved only in this browser.</p>
      <canvas width="900" height="300" aria-label="Signature drawing area"></canvas>
      <div class="gl-btns"><button type="button" class="btn ghost sm" data-s="clear">Clear</button><span class="gl-flex"></span><button type="button" class="btn ghost sm" data-s="cancel">Cancel</button><button type="button" class="btn sm" data-s="save">Use signature</button></div>`;
    document.body.appendChild(dlg);
    const cv = dlg.querySelector("canvas"), ctx = cv.getContext("2d");
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
    let drawing = false, drawn = false, last = null;
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.addEventListener("pointerdown", e => { drawing = true; last = pt(e); cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last[0], last[1], 1.5, 0, 7); ctx.fill(); drawn = true; });
    cv.addEventListener("pointermove", e => { if (!drawing) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; drawn = true; });
    const end = () => { drawing = false; };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    const close = () => { dlg.close(); dlg.remove(); };
    dlg.addEventListener("click", e => {
      const a = e.target.dataset && e.target.dataset.s;
      if (a === "clear") { ctx.clearRect(0, 0, cv.width, cv.height); drawn = false; }
      else if (a === "cancel") close();
      else if (a === "save") {
        if (!drawn) return close();
        // Crop to the drawn area
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
        for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 <= x0 || y1 <= y0) return close();
        const pad = 6, w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad;
        const out = document.createElement("canvas"); out.width = w; out.height = h;
        out.getContext("2d").drawImage(cv, x0 - pad, y0 - pad, w, h, 0, 0, w, h);
        onSave(out.toDataURL("image/png")); close();
      }
    });
    dlg.addEventListener("cancel", () => setTimeout(() => dlg.remove(), 0));
    dlg.showModal();
  }

  const EXAMPLE_SCHOOL = { name: "Maple Grove Homeschool", address: "214 Maple Lane\nSpringfield, OH 45501", phone: "", email: "", admin: "Laura Carter", logo: "", signature: "" };
  // Short hint shown inside the grade box: grade points, or how the entry is treated.
  const gradeHint = g => g.kind === "graded" ? `${g.pct != null ? g.letter + " " : ""}${(g.points / 1000).toFixed(1)}` : g.kind === "pass" ? "pass" : g.kind === "w" ? "no credit" : g.kind === "invalid" ? "?" : "";
  const gpaText = r => r.unweighted == null ? "GPA —" : r.anyWeighted ? `GPA ${r.unweighted} · weighted ${r.weighted}` : `GPA ${r.unweighted}`;

  // =================================================================================================
  // Full transcript builder
  // =================================================================================================
  function mountApp(root) {
    let D = store.load() || E.emptyData();
    const TABS = [["student", "Student", "Student"], ["courses", "Courses & grades", "Courses"], ["hours", "Hours log", "Hours"], ["descriptions", "Course descriptions", "Descriptions"], ["transcript", "Transcript & PDFs", "PDFs"], ["settings", "Settings & backup", "Settings"]];
    const fromHash = (location.hash || "").slice(1);
    let tab = TABS.some(t => t[0] === fromHash) ? fromHash : TABS.some(t => t[0] === root.dataset.tab) ? root.dataset.tab : store.get("tab", "courses");
    if (!TABS.some(t => t[0] === tab)) tab = "courses";
    let doc = root.dataset.doc || store.get("doc", "transcript"), show8 = false, logShown = 40, logYear = "", descOrder = "year", descEmpty = false, rcYear = null, rcChosen = false, hlYear = "", issueDate = today();
    const cur = () => D.students.find(s => s.id === D.current) || D.students[0];
    const S = () => D.settings;

    let saveT;
    function save(now) {
      clearTimeout(saveT);
      const run = () => { const ok = store.save(D); status(ok ? "" : "Couldn't save: this browser's storage is full or blocked. Download a backup now."); };
      if (now) run(); else saveT = setTimeout(run, 250);
    }
    window.addEventListener("beforeunload", () => { if (saveT) { clearTimeout(saveT); store.save(D); } });

    root.innerHTML = `
      <div class="gl-top">
        <div class="gl-stu"><label for="gl-cur">Student</label><select id="gl-cur"></select><button type="button" class="btn ghost sm" data-a="addStudent">+ Add student</button></div>
        <p class="gl-status small muted" role="status" aria-live="polite"></p>
      </div>
      <div class="gl-tabs" role="tablist" aria-label="Transcript builder sections">
        ${TABS.map(([k, n, short], i) => `<button type="button" role="tab" id="gl-t-${k}" aria-controls="gl-p-${k}" data-tab="${k}" aria-label="${esc(n)}"><span class="gl-num" aria-hidden="true">${i + 1}</span><span class="gl-tl" aria-hidden="true">${esc(n)}</span><span class="gl-ts" aria-hidden="true">${esc(short)}</span></button>`).join("")}
      </div>
      ${TABS.map(([k]) => `<div class="gl-panel" role="tabpanel" id="gl-p-${k}" aria-labelledby="gl-t-${k}" tabindex="-1" hidden></div>`).join("")}
      <datalist id="gl-lib">${E.LIBRARY.map(l => `<option value="${esc(l.title)}"></option>`).join("")}</datalist>
      <datalist id="gl-grades">${["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", "P", "IP"].map(g => `<option value="${g}"></option>`).join("")}</datalist>`;
    const $ = s => root.querySelector(s);
    const panel = k => $(`#gl-p-${k}`);

    function status(msg) {
      const el = $(".gl-status");
      if (msg) { el.textContent = msg; el.classList.add("warn"); return; }
      el.classList.remove("warn");
      const n = D.students.reduce((a, s) => a + s.courses.length, 0);
      const stale = n >= 5 && (!D.backupAt || Date.now() - Date.parse(D.backupAt) > 30 * 864e5);
      el.innerHTML = stale ? `Saved in this browser only. <button type="button" class="gl-link" data-a="backup">Download a backup</button>` : n ? "Saved in this browser. Nothing is uploaded." : "Your records stay in this browser. Nothing is uploaded.";
    }
    function renderStudents() {
      $("#gl-cur").innerHTML = D.students.map((s, i) => opt(s.id, s.name.trim() || `Student ${i + 1}`, D.current)).join("");
    }
    function showTab(k, focus, initial) {
      tab = k;
      if (!initial) store.set("tab", k); // remember only tabs the visitor chose, not a landing page's preset
      for (const [t] of TABS) {
        const b = $(`#gl-t-${t}`), p = panel(t);
        b.setAttribute("aria-selected", String(t === k)); b.tabIndex = t === k ? 0 : -1;
        p.hidden = t !== k;
      }
      render(k);
      if (focus) $(`#gl-t-${k}`).focus();
    }
    function render(k) {
      ({ student: renderStudent, courses: renderCourses, hours: renderHours, descriptions: renderDesc, transcript: renderExport, settings: renderSettings })[k || tab]();
    }

    // ---------- Student & school ----------
    function renderStudent() {
      const st = cur(), sc = D.school;
      const [gy, gm] = (st.gradDate || "").split("-");
      const y0 = new Date().getFullYear();
      const years = []; for (let y = y0 - 6; y <= y0 + 8; y++) years.push(y);
      panel("student").innerHTML = `
        <div class="grid2">
          <fieldset class="gl-box"><legend>Student</legend>
            <label for="gl-s-name">Full legal name</label><input id="gl-s-name" data-f="st.name" value="${esc(st.name)}" autocomplete="off" placeholder="First Middle Last">
            <div class="row">
              <div><label for="gl-s-dob">Date of birth</label><input id="gl-s-dob" type="date" data-f="st.dob" value="${esc(st.dob)}"></div>
              <div><label for="gl-s-sid">Student ID (optional)</label><input id="gl-s-sid" data-f="st.studentId" value="${esc(st.studentId)}" autocomplete="off"></div>
            </div>
            <div class="row">
              <div><label for="gl-s-gm">Graduation month</label><select id="gl-s-gm" data-grad="m"><option value="">Month</option>${["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((m, i) => opt(m, ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][i], gm)).join("")}</select></div>
              <div><label for="gl-s-gy">Graduation year</label><select id="gl-s-gy" data-grad="y"><option value="">Year</option>${years.map(y => opt(y, y, gy)).join("")}</select></div>
            </div>
            <p class="gl-hint">The graduation year fills in each grade's school year (class of 2027: grade 9 is 2023–2024).</p>
            <label for="gl-s-addr">Student address</label><textarea id="gl-s-addr" data-f="st.address" rows="2" placeholder="Street&#10;City, State ZIP">${esc(st.address)}</textarea>
            <div class="gl-btns"><button type="button" class="btn ghost sm" data-a="copyAddr">Use school address</button><span class="gl-flex"></span>${D.students.length > 1 || st.courses.length || st.name ? `<button type="button" class="btn ghost sm danger" data-a="delStudent">Delete this student</button>` : ""}</div>
          </fieldset>
          <fieldset class="gl-box"><legend>Your homeschool</legend>
            <label for="gl-sc-name">Homeschool name</label><input id="gl-sc-name" data-f="school.name" value="${esc(sc.name)}" placeholder="For example: Maple Grove Homeschool" autocomplete="organization">
            <p class="gl-hint">Use your own homeschool's name, not the name of a school or umbrella program you don't run.</p>
            <label for="gl-sc-addr">Address</label><textarea id="gl-sc-addr" data-f="school.address" rows="2" placeholder="Street&#10;City, State ZIP">${esc(sc.address)}</textarea>
            <div class="row">
              <div><label for="gl-sc-phone">Phone</label><input id="gl-sc-phone" type="tel" data-f="school.phone" value="${esc(sc.phone)}" autocomplete="tel"></div>
              <div><label for="gl-sc-email">Email</label><input id="gl-sc-email" type="email" data-f="school.email" value="${esc(sc.email)}" autocomplete="email"></div>
            </div>
            <label for="gl-sc-admin">Parent / school administrator</label><input id="gl-sc-admin" data-f="school.admin" value="${esc(sc.admin)}" autocomplete="name" placeholder="Name printed under the signature line">
            <div class="gl-imgs">
              <div><span class="gl-lab" id="gl-logo-lab">Logo or seal (optional)</span>
                ${sc.logo ? `<img class="gl-thumb" src="${sc.logo}" alt="Your logo">` : ""}
                <div class="gl-btns"><label class="btn ghost sm gl-file">${sc.logo ? "Replace" : "Upload image"}<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" data-img="logo" aria-labelledby="gl-logo-lab"></label>${sc.logo ? `<button type="button" class="btn ghost sm" data-a="rmImg" data-k="logo">Remove</button>` : ""}</div></div>
              <div><span class="gl-lab" id="gl-sig-lab">Signature (optional)</span>
                ${sc.signature ? `<img class="gl-thumb sig" src="${sc.signature}" alt="Your signature">` : ""}
                <div class="gl-btns"><button type="button" class="btn ghost sm" data-a="drawSig">Draw</button><label class="btn ghost sm gl-file">Upload<input type="file" accept="image/png,image/jpeg" data-img="signature" aria-labelledby="gl-sig-lab"></label>${sc.signature ? `<button type="button" class="btn ghost sm" data-a="rmImg" data-k="signature">Remove</button>` : ""}</div></div>
            </div>
            <p class="gl-hint">School details are shared by every student in your family.</p>
          </fieldset>
        </div>
        <fieldset class="gl-box"><legend>Test scores (optional)</legend>
          <div class="gl-tests">${st.tests.map((t, i) => `<div class="gl-test" data-t="${i}">
            <input data-tk="name" value="${esc(t.name)}" placeholder="SAT, ACT, CLEP, AP exam…" aria-label="Test name">
            <input data-tk="date" value="${esc(t.date)}" placeholder="Month and year" aria-label="Test date">
            <input data-tk="score" value="${esc(t.score)}" placeholder="Score" aria-label="Score">
            <button type="button" class="gl-x" data-a="rmTest" aria-label="Remove test ${esc(t.name)}">×</button></div>`).join("")}</div>
          <button type="button" class="btn ghost sm" data-a="addTest">+ Add test score</button>
        </fieldset>
        <fieldset class="gl-box"><legend>Activities and notes (optional)</legend>
          <label for="gl-s-notes">Printed near the bottom of the transcript. Keep it short: activities, awards, volunteer work.</label>
          <textarea id="gl-s-notes" data-f="st.notes" rows="3">${esc(st.notes)}</textarea>
        </fieldset>
        <div class="gl-next"><button type="button" class="btn" data-go="courses">Next: courses &amp; grades →</button></div>`;
    }

    // ---------- Courses ----------
    function courseRow(c) {
      const g = E.parseGrade(c.grade, S());
      const hint = gradeHint(g);
      const t = esc(c.title || "untitled course");
      return `<div class="gl-course" data-c="${c.id}">
        <input class="gl-title" data-k="title" value="${esc(c.title)}" placeholder="Course title" aria-label="Course title" list="gl-lib" autocomplete="off">
        <select data-k="subject" aria-label="Subject area for ${t}">${subjOpts(c.subject)}</select>
        <select data-k="level" aria-label="Level for ${t}">${levelOpts(c.level)}</select>
        <div class="gl-g"><input data-k="grade" value="${esc(c.grade)}" placeholder="A, 93, P" aria-label="Grade for ${t}" list="gl-grades" autocomplete="off"${g.kind === "invalid" ? ' aria-invalid="true"' : ""} aria-describedby="gp-${c.id}"><span class="gl-gp${g.kind === "invalid" ? " bad" : ""}" id="gp-${c.id}">${esc(hint)}</span></div>
        <input data-k="credits" type="number" step="0.25" min="0" max="20" inputmode="decimal" value="${esc(c.credits)}" aria-label="Credits for ${t}">
        <button type="button" class="gl-ib" data-a="more" aria-expanded="false" aria-controls="gx-${c.id}" aria-label="More options for ${t}" title="More options">⋯</button>
        <button type="button" class="gl-ib gl-x" data-a="rmCourse" aria-label="Remove ${t}" title="Remove">×</button>
        <div class="gl-extra" id="gx-${c.id}" hidden>
          <div><label for="gp1-${c.id}">Taken at (college, co-op or provider)</label><input id="gp1-${c.id}" data-k="provider" value="${esc(c.provider)}" placeholder="Leave blank if taught at home"></div>
          <div><label for="gp2-${c.id}">College credit (dual enrollment)</label><input id="gp2-${c.id}" data-k="college" value="${esc(c.college)}" placeholder="e.g. 3 semester hours"></div>
          <div><label for="gp3-${c.id}">Length</label><select id="gp3-${c.id}" data-k="dur">${opt("", "Automatic (from credits)", c.dur)}${opt("year", "Full year", c.dur)}${opt("sem", "One semester", c.dur)}</select></div>
          <div><label for="gp4-${c.id}">Hours (if not logged)</label><input id="gp4-${c.id}" data-k="hours" type="number" min="0" step="1" inputmode="numeric" value="${esc(c.hours)}"></div>
          <div><label for="gp5-${c.id}">Move to</label><select id="gp5-${c.id}" data-k="year">${E.YEARS.map(y => opt(y, E.gradeName(y), c.year)).join("")}</select></div>
          <label class="gl-check"><input type="checkbox" data-k="transfer"${c.transfer ? " checked" : ""}> Transfer credit (earned at another school)</label>
        </div>
      </div>`;
    }
    function yearStat(st, y) {
      const list = st.courses.filter(c => c.year === y);
      const r = E.computeGPA(list, S());
      return list.length ? `${E.fmtCredits(r.earned)} credits${r.inProgress ? ` (+${E.fmtCredits(r.inProgress)} in progress)` : ""} · ${gpaText(r)}` : "No courses yet";
    }
    function renderCourses() {
      const st = cur();
      const by = E.byYear(st.courses);
      const gy = String(st.gradDate || "").slice(0, 4);
      const years = E.YEARS.filter(y => y !== 8 || show8 || by[8].length);
      panel("courses").innerHTML = `
        <div class="gl-sum" data-sum></div>
        ${st.courses.length ? "" : `<div class="notice gl-empty"><p><strong>Add your student's high school courses below</strong>, one grade at a time. Type a course name and press Enter; common courses fill in their subject and credits. Grades can be letters (A, B+), percentages (93), P for pass or IP for in progress.</p><button type="button" class="btn ghost sm" data-a="example">Load an example student</button></div>`}
        ${years.map(y => `<section class="gl-year" data-year="${y}" aria-labelledby="gl-yh-${y}">
          <div class="gl-yhead">
            <h3 id="gl-yh-${y}">${esc(E.gradeName(y))}</h3>
            <label class="gl-ylab">School year <input data-ylabel="${y}" value="${esc((st.years[y] && st.years[y].label) || "")}" placeholder="${esc(E.yearLabel(gy, y) || "YYYY–YYYY")}" aria-label="${esc(E.gradeName(y))} school year"></label>
            <p class="gl-ystat" data-ystat="${y}">${esc(yearStat(st, y))}</p>
          </div>
          ${by[y].length ? `<div class="gl-chead" aria-hidden="true"><span>Course</span><span>Subject</span><span>Level</span><span>Grade</span><span>Credits</span></div>` : ""}
          <div class="gl-rows">${by[y].map(courseRow).join("")}</div>
          <form class="gl-add" data-addyear="${y}"><input list="gl-lib" placeholder="Add a ${y === 8 ? "grade 8 high school" : `grade ${y}`} course…" aria-label="New ${esc(E.gradeName(y))} course title" autocomplete="off"><button type="submit" class="btn ghost sm">Add</button></form>
        </section>`).join("")}
        ${years.includes(8) ? "" : `<button type="button" class="btn ghost sm" data-a="show8">+ Add high school credit earned in 8th grade</button>`}
        <div class="gl-box gl-goals" data-goals></div>
        <div class="gl-next"><button type="button" class="btn ghost" data-go="hours">Log hours</button><button type="button" class="btn" data-go="transcript">Preview transcript →</button></div>`;
      updateStats();
    }
    function updateStats() {
      const p = panel("courses"); if (p.hidden) return;
      const st = cur(), s = S();
      const r = E.computeGPA(st.courses, s);
      const sum = p.querySelector("[data-sum]");
      if (sum) sum.innerHTML = `
        <div><span class="gl-big">${r.unweighted || "—"}</span><span class="gl-cap">Cumulative GPA${r.anyWeighted ? " (unweighted)" : ""}</span></div>
        ${r.anyWeighted ? `<div><span class="gl-big">${r.weighted}</span><span class="gl-cap">Weighted GPA</span></div>` : ""}
        <div><span class="gl-big">${E.fmtCredits(r.earned)}</span><span class="gl-cap">Credits earned</span></div>
        ${r.inProgress ? `<div><span class="gl-big">${E.fmtCredits(r.inProgress)}</span><span class="gl-cap">In progress</span></div>` : ""}`;
      for (const el of p.querySelectorAll("[data-ystat]")) el.textContent = yearStat(st, +el.dataset.ystat);
      const goals = p.querySelector("[data-goals]");
      if (goals) {
        const t = E.subjectTotals(st.courses, s), g = s.goals;
        const rowsG = [["eng"], ["math"], ["sci"], ["soc"], ["lang"], ["arts"], ["pe"]].map(([k]) => [E.SUBJECT_NAME[k], t[k].earned, t[k].ip, g[k]]);
        const other = ["bible", "tech", "elec"].reduce((a, k) => [a[0] + t[k].earned, a[1] + t[k].ip], [0, 0]);
        rowsG.push(["Electives & other", other[0], other[1], null]);
        rowsG.push(["Total", r.earned, r.inProgress, g.total]);
        goals.innerHTML = `<h3>Credits by subject</h3>
          <table class="gl-gt"><thead><tr><th scope="col">Subject</th><th scope="col">Earned</th><th scope="col">Goal</th><th scope="col"><span class="sr">Progress</span></th></tr></thead><tbody>
          ${rowsG.map(([n, e, ip, goal]) => { const pct = goal ? Math.min(100, Math.round(e / goal * 100)) : 0; const pctIp = goal ? Math.min(100 - pct, Math.round(ip / goal * 100)) : 0; return `<tr${n === "Total" ? ' class="gl-total"' : ""}><td>${esc(n)}</td><td>${E.fmtCredits(e)}${ip ? ` <span class="muted">+${E.fmtCredits(ip)} IP</span>` : ""}</td><td>${goal == null ? "—" : E.fmtCredits(goal)}</td><td>${goal ? `<span class="gl-bar" role="img" aria-label="${pct}% of goal"><i style="width:${pct}%"></i><b style="width:${pctIp}%"></b></span>` : ""}</td></tr>`; }).join("")}
          </tbody></table>
          <p class="gl-hint">Goals are your own targets (change them in Settings). The defaults follow a common college-prep pattern; graduation requirements vary by state, umbrella school and college, so check the ones that apply to you.</p>`;
      }
    }

    // ---------- Hours log ----------
    function renderHours() {
      const st = cur(), s = S();
      const opts = E.YEARS.map(y => { const cs = st.courses.filter(c => c.year === y); return cs.length ? `<optgroup label="${esc(E.gradeName(y))}">${cs.map(c => opt(c.id, c.title || "Untitled course", store.get("lastCourse", ""))).join("")}</optgroup>` : ""; }).join("");
      const ids = new Set(st.courses.filter(c => !logYear || c.year === +logYear).map(c => c.id));
      const entries = st.log.filter(e => ids.has(e.courseId)).sort((a, b) => b.date.localeCompare(a.date));
      const byId = Object.fromEntries(st.courses.map(c => [c.id, c]));
      const hpc = s.hoursPerCredit;
      const totals = st.courses.filter(c => ids.has(c.id)).map(c => ({ c, m: E.loggedMinutes(st, c.id) })).filter(x => x.m > 0);
      panel("hours").innerHTML = `
        <div class="grid2 gl-hgrid">
          <form class="gl-box gl-logform" data-form="log">
            <h3>Log time</h3>
            ${st.courses.length ? `
            <div class="row"><div><label for="gl-l-date">Date</label><input id="gl-l-date" type="date" name="date" value="${today()}" required></div>
            <div><label for="gl-l-course">Course</label><select id="gl-l-course" name="course" required>${opts}</select></div></div>
            <div class="row gl-keep"><div><label for="gl-l-h">Hours</label><input id="gl-l-h" type="number" name="h" min="0" max="24" step="1" inputmode="numeric" placeholder="0"></div>
            <div><label for="gl-l-m">Minutes</label><input id="gl-l-m" type="number" name="m" min="0" max="59" step="5" inputmode="numeric" placeholder="45"></div></div>
            <label for="gl-l-note">Note (optional)</label><input id="gl-l-note" name="note" maxlength="300" placeholder="Chapter 4 reading, lab 2, essay draft…" autocomplete="off">
            <div class="gl-btns"><button type="submit" class="btn">Add entry</button></div>` : `<p>Add a course first. You can also do it right here:</p>`}
          </form>
          <form class="gl-box" data-form="newcourse">
            <h3>${st.courses.length ? "Add another course" : "Add a course"}</h3>
            <label for="gl-nc-title">Course title</label><input id="gl-nc-title" name="title" list="gl-lib" required autocomplete="off" placeholder="e.g. Biology">
            <div class="row"><div><label for="gl-nc-year">Grade</label><select id="gl-nc-year" name="year">${E.YEARS.map(y => opt(y, E.gradeName(y), store.get("lastYear", 9))).join("")}</select></div>
            <div><label for="gl-nc-subj">Subject</label><select id="gl-nc-subj" name="subject">${subjOpts("eng")}</select></div></div>
            <div class="gl-btns"><button type="submit" class="btn ghost">Add course</button></div>
            <p class="gl-hint">Credit standard: <label class="gl-inline" for="gl-hpc">hours per credit</label> <select id="gl-hpc" data-f="set.hoursPerCredit" data-type="num">${[120, 135, 150, 180].concat([120, 135, 150, 180].includes(hpc) ? [] : [hpc]).map(v => opt(v, `${v} hours`, hpc)).join("")}</select></p>
          </form>
        </div>
        <div class="gl-box">
          <div class="gl-hbar"><h3>Totals by course</h3><label class="gl-inline" for="gl-l-year">Show</label><select id="gl-l-year" data-logyear>${opt("", "All grades", logYear)}${E.YEARS.map(y => opt(y, E.gradeName(y), logYear)).join("")}</select></div>
          ${totals.length ? `<div class="gl-tw"><table class="gl-tt"><thead><tr><th scope="col">Course</th><th scope="col">Logged</th><th scope="col">Credits at ${hpc} h</th><th scope="col">On transcript</th><th scope="col"><span class="sr">Action</span></th></tr></thead><tbody>
          ${totals.map(({ c, m }) => { const cr = E.creditsFromMinutes(m, hpc, 0.25); return `<tr><td>${esc(c.title || "Untitled")}<span class="muted small"> · Gr ${c.year}</span></td><td>${esc(E.fmtHours(m))}</td><td>${cr.exact.toFixed(2)}</td><td>${E.fmtCredits(E.parseCredits(c.credits))}</td><td>${cr.rounded > 0 && cr.rounded !== E.parseCredits(c.credits) ? `<button type="button" class="btn ghost sm" data-a="useCredits" data-c="${c.id}" data-v="${cr.rounded}">Set to ${E.fmtCredits(cr.rounded)}</button>` : ""}</td></tr>`; }).join("")}
          </tbody></table></div>
          <p class="gl-hint">Credits = logged hours ÷ ${hpc}. "Set to" rounds down to the nearest quarter credit. You decide the credit actually awarded.</p>` : `<p class="muted">No time logged${logYear ? " for this grade" : ""} yet.</p>`}
        </div>
        <div class="gl-box">
          <div class="gl-hbar"><h3>Entries</h3><span class="gl-flex"></span>
            <button type="button" class="btn ghost sm" data-a="logCsv"${st.log.length ? "" : " disabled"}>Export CSV</button>
            <button type="button" class="btn sm" data-a="logPdf"${st.log.length ? "" : " disabled"}>Download hours log PDF</button></div>
          ${entries.length ? `<ul class="gl-log">${entries.slice(0, logShown).map(e => `<li><span class="gl-ld">${esc(E.fmtDateShort(e.date))}</span><span class="gl-lc">${esc((byId[e.courseId] || {}).title || "")}</span><span class="gl-lm">${esc(E.fmtHours(e.min))}</span><span class="gl-ln">${esc(e.note)}</span><button type="button" class="gl-ib gl-x" data-a="rmLog" data-id="${e.id}" aria-label="Delete entry from ${esc(E.fmtDateShort(e.date))}">×</button></li>`).join("")}</ul>
          ${entries.length > logShown ? `<button type="button" class="btn ghost sm" data-a="moreLog">Show more (${entries.length - logShown} older)</button>` : ""}` : `<p class="muted">Entries you add appear here, newest first.</p>`}
        </div>`;
    }

    // ---------- Descriptions ----------
    function descEditor(c, st) {
      const g = c.gen || {};
      const lib = E.findLibrary(c.title);
      const chips = (list, sel, key) => list.map(([k, n]) => `<label class="gl-chip"><input type="checkbox" data-gen="${key}" value="${k}"${(sel || []).includes(k) ? " checked" : ""}> ${esc(n)}</label>`).join("");
      return `<details class="gl-dc" data-c="${c.id}">
        <summary><span class="gl-dt">${esc(c.title || "Untitled course")}</span><span class="gl-ds ${c.desc.trim() ? "ok" : ""}">${esc(E.gradeName(c.year))} · ${c.desc.trim() ? "Written" : "Needs a description"}</span></summary>
        <div class="gl-dgen">
          <div class="grid2">
            <div><label for="gt-${c.id}">Topics covered</label><textarea id="gt-${c.id}" data-gen="topics" rows="3" placeholder="Separate topics with commas or new lines">${esc(g.topics)}</textarea>
              ${lib ? `<button type="button" class="btn ghost sm" data-a="suggest" data-c="${c.id}">Use typical ${esc(lib.title)} topics</button>` : ""}</div>
            <div><label for="gm-${c.id}">Materials (textbooks, curriculum, online classes)</label><textarea id="gm-${c.id}" data-gen="materials" rows="3" placeholder="Separate items with semicolons or new lines">${esc(g.materials)}</textarea></div>
          </div>
          <fieldset class="gl-chips"><legend>Coursework</legend>${chips(E.ACTIVITIES, g.acts, "acts")}<input data-gen="actsOther" value="${esc(g.actsOther || "")}" placeholder="Other coursework" aria-label="Other coursework"></fieldset>
          <fieldset class="gl-chips"><legend>How work was evaluated</legend>${chips(E.EVALUATIONS, g.evals, "evals")}<input data-gen="evalsOther" value="${esc(g.evalsOther || "")}" placeholder="Other evaluation" aria-label="Other evaluation methods"></fieldset>
          <div class="gl-btns"><label class="gl-inline" for="gs-${c.id}">Style</label><select id="gs-${c.id}" data-gen="style">${opt("standard", "Standard paragraph", g.style)}${opt("concise", "Concise (one or two sentences)", g.style)}${opt("detailed", "Detailed (labelled lines)", g.style)}</select>
            <button type="button" class="btn sm" data-a="gen" data-c="${c.id}">Write description from these details</button></div>
          <label for="gd-${c.id}">Description (printed in the course descriptions PDF)</label>
          <textarea id="gd-${c.id}" class="gl-desc" data-k="desc" rows="6" placeholder="Write your own, or fill in the details above and press the button.">${esc(c.desc)}</textarea>
          <p class="gl-hint" data-wc>${wordCount(c.desc)}</p>
        </div>
      </details>`;
    }
    const wordCount = t => { const n = (String(t || "").match(/\S+/g) || []).length; return n ? `${n} words` : ""; };
    function renderDesc() {
      const st = cur();
      const done = st.courses.filter(c => c.desc.trim()).length;
      const by = E.byYear(st.courses);
      panel("descriptions").innerHTML = `
        <div class="gl-hbar"><p class="gl-dprog"><strong>${done} of ${st.courses.length}</strong> courses have a description.</p><span class="gl-flex"></span>
          ${done < st.courses.length ? `<button type="button" class="btn ghost sm" data-a="genAll">Draft the ${st.courses.length - done} missing</button>` : ""}
          <button type="button" class="btn ghost sm" data-go="transcript" data-doc="descriptions">Preview</button>
          <button type="button" class="btn sm" data-a="descPdf"${done ? "" : " disabled"}>Download course descriptions PDF</button></div>
        <p class="gl-hint">Each description is built from template sentences using the details you enter: no AI, nothing leaves your device. Edit the result freely.</p>
        ${st.courses.length ? E.YEARS.filter(y => by[y].length).map(y => `<h3 class="gl-dh">${esc(E.gradeName(y))}</h3>${by[y].map(c => descEditor(c, st)).join("")}`).join("") : `<p class="notice">Add courses first, then come back to describe them. <button type="button" class="gl-link" data-go="courses">Go to courses</button></p>`}`;
    }

    // ---------- Transcript & PDFs ----------
    const DOCS = [["transcript", "Transcript"], ["report", "Report card"], ["descriptions", "Course descriptions"], ["hours", "Hours log"]];
    function renderExport() {
      const st = cur(), s = S();
      const yearsWith = E.YEARS.filter(y => st.courses.some(c => c.year === y));
      if (!rcChosen || !yearsWith.includes(rcYear)) rcYear = yearsWith[yearsWith.length - 1] || 9;
      panel("transcript").innerHTML = `
        <div class="gl-seg" role="radiogroup" aria-label="Document">${DOCS.map(([k, n]) => `<label><input type="radio" name="gl-doc" value="${k}"${doc === k ? " checked" : ""}><span>${n}</span></label>`).join("")}</div>
        <div class="gl-xgrid">
          <div class="gl-opts">
            <div class="row">
              <div><label for="gl-o-tpl">Design</label><select id="gl-o-tpl" data-f="set.template">${opt("classic", "Classic (serif)", s.template)}${opt("modern", "Modern (color band)", s.template)}${opt("minimal", "Minimal", s.template)}</select></div>
              <div><label for="gl-o-paper">Paper</label><select id="gl-o-paper" data-f="set.paper">${opt("letter", "US Letter", s.paper)}${opt("a4", "A4", s.paper)}</select></div>
            </div>
            <div class="row">
              <div${s.template === "modern" ? "" : " hidden"}><label for="gl-o-color">Band color</label><input id="gl-o-color" type="color" data-f="set.color" value="${esc(s.color)}"></div>
              <div><label for="gl-o-date">Date printed</label><input id="gl-o-date" type="date" data-issue value="${esc(issueDate)}"></div>
            </div>
            ${doc === "transcript" ? `<label class="gl-check"><input type="checkbox" data-f="set.showPercent"${s.showPercent ? " checked" : ""}> Show percentages next to letter grades</label>` : ""}
            ${doc === "report" ? `<label for="gl-o-rcy">Grade</label><select id="gl-o-rcy" data-rcyear>${(yearsWith.length ? yearsWith : [9]).map(y => opt(y, E.gradeName(y), rcYear)).join("")}</select>
              <label for="gl-o-att">Attendance (optional)</label><input id="gl-o-att" data-yearf="attendance" value="${esc(st.attendance[rcYear] || "")}" placeholder="e.g. 176 of 180 days">
              <label for="gl-o-com">Comments (optional)</label><textarea id="gl-o-com" data-yearf="comments" rows="4">${esc(st.comments[rcYear] || "")}</textarea>` : ""}
            ${doc === "descriptions" ? `<label for="gl-o-ord">Order</label><select id="gl-o-ord" data-descorder>${opt("year", "By grade", descOrder)}${opt("subject", "By subject", descOrder)}</select>
              <label class="gl-check"><input type="checkbox" data-descempty${descEmpty ? " checked" : ""}> Include courses without a description</label>
              <button type="button" class="btn ghost sm" data-go="descriptions">Write descriptions</button>` : ""}
            ${doc === "hours" ? `<label for="gl-o-hly">Period</label><select id="gl-o-hly" data-hlyear>${opt("", "All grades", hlYear)}${E.YEARS.map(y => opt(y, E.gradeName(y), hlYear)).join("")}</select>` : ""}
            <div class="gl-btns gl-dl"><button type="button" class="btn" data-a="pdf">Download PDF</button><span class="gl-pages small muted" aria-live="polite"></span></div>
            <ul class="gl-warn" aria-live="polite"></ul>
            <p class="gl-hint">Every PDF has a small "Prepared with GradLedger" line at the bottom. Print at 100% (actual size).</p>
          </div>
          <div class="gl-prev" aria-label="Preview"><p class="muted small">Building preview…</p></div>
        </div>`;
      preview();
    }
    let prevT, prevSeq = 0;
    function buildDoc(G, forExample) {
      const st = forExample ? E.exampleStudent(new Date().getFullYear() + 1) : cur();
      const data = forExample ? { school: Object.assign({}, D.school.name ? D.school : EXAMPLE_SCHOOL, { logo: D.school.logo, signature: D.school.signature }), settings: D.settings } : D;
      return G.images(data.school).then(imgs => {
        const o = { date: issueDate || today(), imgs, order: descOrder, includeEmpty: descEmpty };
        if (doc === "report") return { st, d: G.buildReportCard(data, st, forExample ? 11 : rcYear, o) };
        if (doc === "descriptions") {
          if (forExample) st.courses.forEach(c => { const lib = E.findLibrary(c.title); c.desc = E.generateDescription(Object.assign({}, c, { gen: { topics: lib ? lib.topics : "", acts: ["reading"], evals: ["tests"] } }), { yearLabel: E.yearLabel(String(st.gradDate).slice(0, 4), c.year) }); });
          return { st, d: G.buildDescriptions(data, st, o) };
        }
        if (doc === "hours") return { st, d: G.buildHoursLog(data, st, hlYear ? +hlYear : null, o) };
        return { st, d: G.buildTranscript(data, st, o) };
      });
    }
    function warnings() {
      const st = cur(), s = S(), w = [];
      if (!st.name.trim()) w.push("Add the student's name on the Student tab.");
      if (!D.school.name.trim()) w.push("Your homeschool's name is blank, so \"Homeschool\" is printed instead.");
      if (doc === "transcript" && (!st.dob || !st.gradDate)) w.push(`Add the student's ${!st.dob && !st.gradDate ? "date of birth and graduation date" : !st.dob ? "date of birth" : "graduation date"} on the Student tab.`);
      const bad = st.courses.filter(c => E.parseGrade(c.grade, s).kind === "invalid");
      if (bad.length) w.push(`Check the grade for ${E.joinList(bad.map(c => c.title || "an untitled course"))}. Use a letter, a percentage, P or IP.`);
      const untitled = st.courses.filter(c => !c.title.trim()).length;
      if (untitled) w.push(`${untitled} course${untitled > 1 ? "s have" : " has"} no title.`);
      const zero = st.courses.filter(c => !E.parseCredits(c.credits) && c.title.trim());
      if (zero.length) w.push(`${E.joinList(zero.map(c => c.title))} ${zero.length > 1 ? "have" : "has"} 0 credits and won't count toward GPA.`);
      return w;
    }
    function preview() {
      clearTimeout(prevT);
      prevT = setTimeout(async () => {
        const p = panel("transcript"); if (p.hidden) return;
        const box = p.querySelector(".gl-prev"), seq = ++prevSeq;
        try {
          const G = await docs();
          const st = cur();
          const empty = !st.courses.length && (doc !== "hours");
          const { d } = await buildDoc(G, empty);
          if (seq !== prevSeq) return;
          const replaced = G.replacedCount();
          const label = DOCS.find(x => x[0] === doc)[1];
          box.innerHTML = (empty ? `<div class="notice gl-exnote"><strong>Example preview.</strong> Add courses to see your own ${label.toLowerCase()}. <button type="button" class="gl-link" data-a="example">Load this example to edit</button></div>` : "") +
            d.pages.map((_, i) => `<div class="gl-page">${G.toSVG(d, i, label)}</div>`).join("");
          p.querySelector(".gl-pages").textContent = empty ? "" : `${d.pages.length} page${d.pages.length > 1 ? "s" : ""}`;
          const w = empty ? [] : warnings();
          if (replaced) w.push("Some characters can't be printed with the PDF's built-in fonts and were replaced with a plain letter or \"?\".");
          if (doc === "hours" && !st.log.length) w.push("No hours logged yet. Use the Hours log tab.");
          if (doc === "descriptions" && !empty && !st.courses.some(c => c.desc.trim()) && !descEmpty) w.push("No descriptions written yet. Use the Course descriptions tab.");
          p.querySelector(".gl-warn").innerHTML = w.map(x => `<li>${esc(x)}</li>`).join("");
          p.querySelector('[data-a="pdf"]').disabled = empty;
        } catch (e) {
          box.innerHTML = `<p class="notice">${esc(e.message)}</p>`;
        }
      }, 120);
    }
    async function exportPdf(kind) {
      const st = cur();
      const prevDoc = doc; doc = kind || doc;
      try {
        const G = await docs();
        const { d } = await buildDoc(G, false);
        const names = { transcript: "transcript", report: `report-card-grade-${rcYear}`, descriptions: "course-descriptions", hours: "hours-log" };
        const titles = { transcript: "High School Transcript", report: "Report Card", descriptions: "Course Descriptions", hours: "Hours Log" };
        const pdf = G.toPDF(d, { title: `${titles[doc]} - ${st.name || "Student"}`, author: D.school.admin || D.school.name, subject: "Parent-issued homeschool record" });
        G.replacedCount();
        download(pdf.output("blob"), `${fileSafe(st.name)}-${names[doc]}.pdf`);
        track({ transcript: "transcript_exported", report: "report_card_exported", descriptions: "descriptions_exported", hours: "hours_log_exported" }[doc]);
      } catch (e) { toast(e.message); }
      doc = prevDoc;
    }

    // ---------- Settings ----------
    function renderSettings() {
      const s = S(), g = s.goals;
      const hpcPreset = [120, 135, 150, 180].includes(s.hoursPerCredit);
      panel("settings").innerHTML = `
        <div class="grid2">
          <fieldset class="gl-box"><legend>Grading scale</legend>
            <label class="gl-check"><input type="checkbox" data-f="set.plusMinus"${s.plusMinus ? " checked" : ""}> Use plus/minus grades (A- = 3.7, B+ = 3.3…)</label>
            <div class="row">
              <div><label for="gl-st-pct">Percentage scale</label><select id="gl-st-pct" data-f="set.pct">${opt("10", "10-point (90 / 80 / 70 / 60)", s.pct)}${opt("7", "7-point (93 / 85 / 77 / 70)", s.pct)}</select></div>
              <div><label for="gl-st-ap">A+ counts as</label><select id="gl-st-ap" data-f="set.aPlus" data-type="num">${opt(4, "4.0", s.aPlus)}${opt(4.3, "4.3", s.aPlus)}</select></div>
            </div>
            <label for="gl-st-dec">GPA decimals</label><select id="gl-st-dec" data-f="set.decimals" data-type="num">${opt(2, "2 (3.65)", s.decimals)}${opt(3, "3 (3.650)", s.decimals)}</select>
            <div class="gl-scale" data-scale></div>
          </fieldset>
          <fieldset class="gl-box"><legend>Weighted GPA</legend>
            <p class="gl-hint">Points added to passing grades for the weighted GPA. Set a level to 0 if you don't weight it. The unweighted GPA is always shown too.</p>
            <div class="row3">
              <div><label for="gl-w-h">Honors</label><input id="gl-w-h" type="number" step="0.1" min="0" max="2" inputmode="decimal" data-f="set.weights.H" data-type="num" value="${s.weights.H}"></div>
              <div><label for="gl-w-ap">AP</label><input id="gl-w-ap" type="number" step="0.1" min="0" max="2" inputmode="decimal" data-f="set.weights.AP" data-type="num" value="${s.weights.AP}"></div>
              <div><label for="gl-w-de">Dual enrollment</label><input id="gl-w-de" type="number" step="0.1" min="0" max="2" inputmode="decimal" data-f="set.weights.DE" data-type="num" value="${s.weights.DE}"></div>
            </div>
            <h4>Hours per credit</h4>
            <div class="row"><div><label for="gl-st-hpc">Standard</label><select id="gl-st-hpc" data-hpc>${[120, 135, 150, 180].map(v => opt(v, `${v} hours = 1 credit`, s.hoursPerCredit)).join("")}${opt("custom", "Custom…", hpcPreset ? "" : "custom")}</select></div>
            <div${hpcPreset ? " hidden" : ""} data-hpcwrap><label for="gl-st-hpcc">Custom hours</label><input id="gl-st-hpcc" type="number" min="1" max="1000" step="1" data-f="set.hoursPerCredit" data-type="num" value="${s.hoursPerCredit}"></div></div>
          </fieldset>
        </div>
        <fieldset class="gl-box"><legend>Graduation credit goals</legend>
          <p class="gl-hint">Your own targets for the progress table on the Courses tab. Defaults follow a common college-prep pattern; check your state, umbrella school and target colleges.</p>
          <div class="gl-goalgrid">${[["eng"], ["math"], ["sci"], ["soc"], ["lang"], ["arts"], ["pe"]].map(([k]) => `<div><label for="gl-g-${k}">${esc(E.SUBJECT_NAME[k])}</label><input id="gl-g-${k}" type="number" min="0" max="99" step="0.5" inputmode="decimal" data-f="set.goals.${k}" data-type="num" value="${g[k]}"></div>`).join("")}
          <div><label for="gl-g-total">Total credits</label><input id="gl-g-total" type="number" min="0" max="99" step="0.5" inputmode="decimal" data-f="set.goals.total" data-type="num" value="${g.total}"></div></div>
        </fieldset>
        <fieldset class="gl-box"><legend>Backup and restore</legend>
          <p>Your records live only in this browser on this device. Clearing browser data deletes them, so download a backup now and then and keep it somewhere safe.</p>
          <div class="gl-btns"><button type="button" class="btn" data-a="backup">Download backup (.json)</button>
          <label class="btn ghost gl-file">Restore from backup<input type="file" accept="application/json,.json" data-restore aria-label="Restore from a GradLedger backup file"></label></div>
          <p class="gl-hint">${D.backupAt ? `Last backup: ${esc(E.fmtDateLong(D.backupAt.slice(0, 10)))}.` : "No backup downloaded yet."} The backup holds every student, course, hours entry, logo and signature.</p>
          <div class="gl-btns"><button type="button" class="btn ghost sm danger" data-a="erase">Erase all data on this device</button></div>
        </fieldset>`;
      renderScale();
    }
    function renderScale() {
      const el = panel("settings").querySelector("[data-scale]"); if (!el) return;
      el.innerHTML = `<table class="gl-st"><caption class="sr">Current grading scale</caption><thead><tr><th scope="col">Grade</th><th scope="col">Percent</th><th scope="col">Points</th></tr></thead><tbody>${E.scaleRows(S()).map(r => `<tr><td>${r.letter}</td><td>${r.range}</td><td>${r.points}</td></tr>`).join("")}</tbody></table>`;
    }

    // ---------- Data helpers ----------
    function setPath(path, value) {
      const [rootKey, ...rest] = path.split(".");
      let o = rootKey === "school" ? D.school : rootKey === "st" ? cur() : D.settings;
      for (let i = 0; i < rest.length - 1; i++) o = o[rest[i]];
      o[rest[rest.length - 1]] = value;
    }
    const findCourse = id => cur().courses.find(c => c.id === id);
    function addCourse(year, title) {
      const st = cur();
      const lib = E.findLibrary(title);
      const c = E.newCourse(year, { title: title.trim() });
      if (lib) { c.subject = lib.subject; c.credits = lib.credits; }
      else {
        const t = title.toLowerCase();
        const guess = [["math", /algebra|geometry|calculus|math|statistic|trigonometry/], ["sci", /biology|chemistry|physics|science|anatomy|astronomy|botany|zoology|geology/], ["soc", /history|government|civics|economics|geography|psychology|sociology/], ["lang", /spanish|french|latin|german|chinese|mandarin|japanese|greek|italian|asl|sign language|russian/], ["arts", /art|music|piano|guitar|band|choir|drama|theat|photograph|drawing|painting|dance/], ["pe", /physical education|\bpe\b|health|fitness|sport/], ["bible", /bible|theology|religion|scripture/], ["tech", /computer|coding|programming|robotics|technology|web design/], ["eng", /english|literature|composition|writing|grammar|reading/]].find(([, re]) => re.test(t));
        c.subject = guess ? guess[0] : "elec";
      }
      // Level from the title, whether or not it matched a common course
      if (/^(honors|hon\.)\s|\(honors\)|\bhonors$/i.test(title.trim())) c.level = "H";
      if (/^ap\s|\bAP\b|advanced placement/i.test(title)) c.level = "AP";
      if (/dual enrollment|\bDE\b/.test(title)) c.level = "DE";
      st.courses.push(c);
      store.set("lastYear", year);
      return c;
    }

    // ---------- Events ----------
    root.addEventListener("input", e => {
      const t = e.target;
      if (t.dataset.f) {
        let v = t.type === "checkbox" ? t.checked : t.value;
        if (t.dataset.type === "num") { v = Number(v); if (!Number.isFinite(v)) return; }
        setPath(t.dataset.f, v);
        if (t.dataset.f === "st.name") renderStudents();
        if (t.dataset.f.startsWith("set.")) { D.settings = E.settingsWithDefaults(D.settings); renderScale(); }
        save();
        if (tab === "transcript") { if (t.dataset.f === "set.template") renderExport(); else preview(); }
        if (tab === "hours" && t.dataset.f === "set.hoursPerCredit") renderHours();
        return;
      }
      const row = t.closest("[data-c]");
      if (row && t.dataset.k) {
        const c = findCourse(row.dataset.c); if (!c) return;
        const k = t.dataset.k;
        if (k === "transfer") c.transfer = t.checked;
        else if (k === "credits") c.credits = t.value === "" ? "" : E.parseCredits(t.value);
        else if (k === "hours") c.hours = t.value === "" ? "" : Math.max(0, Number(t.value) || 0);
        else if (k === "year") { c.year = +t.value; save(); renderCourses(); toast(`Moved ${c.title || "course"} to ${E.gradeName(c.year)}.`); return; }
        else c[k] = t.value;
        if (k === "grade") {
          const g = E.parseGrade(c.grade, S()), gp = row.querySelector(".gl-gp");
          gp.textContent = gradeHint(g); gp.classList.toggle("bad", g.kind === "invalid");
          if (g.kind === "invalid") t.setAttribute("aria-invalid", "true"); else t.removeAttribute("aria-invalid");
        }
        if (k === "desc") { const wc = row.querySelector("[data-wc]"); if (wc) wc.textContent = wordCount(c.desc); }
        save(); updateStats();
        return;
      }
      if (row && t.dataset.gen) {
        const c = findCourse(row.dataset.c); if (!c) return;
        const k = t.dataset.gen;
        if (k === "acts" || k === "evals") c.gen[k] = [...row.querySelectorAll(`[data-gen="${k}"]:checked`)].map(x => x.value);
        else c.gen[k] = t.value;
        save(); return;
      }
      if (t.dataset.ylabel) { const st = cur(); st.years[t.dataset.ylabel] = { label: t.value }; save(); return; }
      if (t.dataset.tk) { const i = +t.closest("[data-t]").dataset.t; cur().tests[i][t.dataset.tk] = t.value; save(); return; }
      if (t.dataset.yearf) { cur()[t.dataset.yearf][rcYear] = t.value; save(); preview(); return; }
      if (t.hasAttribute("data-issue")) { issueDate = t.value || today(); preview(); return; }
    });
    root.addEventListener("change", async e => {
      const t = e.target;
      if (t.id === "gl-cur") { D.current = t.value; rcChosen = false; save(); render(); status(); return; }
      if (t.dataset.grad) {
        const st = cur();
        const m = panel("student").querySelector('[data-grad="m"]').value, y = panel("student").querySelector('[data-grad="y"]').value;
        st.gradDate = y ? `${y}-${m || "05"}` : "";
        if (y && !m) panel("student").querySelector('[data-grad="m"]').value = "05";
        save(); return;
      }
      if (t.name === "gl-doc") { doc = t.value; store.set("doc", doc); renderExport(); return; }
      if (t.hasAttribute("data-rcyear")) { rcYear = +t.value; rcChosen = true; renderExport(); return; }
      if (t.hasAttribute("data-hlyear")) { hlYear = t.value; preview(); return; }
      if (t.hasAttribute("data-descorder")) { descOrder = t.value; preview(); return; }
      if (t.hasAttribute("data-descempty")) { descEmpty = t.checked; preview(); return; }
      if (t.hasAttribute("data-logyear")) { logYear = t.value; renderHours(); return; }
      if (t.hasAttribute("data-hpc")) {
        const wrap = panel("settings").querySelector("[data-hpcwrap]");
        if (t.value === "custom") { wrap.hidden = false; wrap.querySelector("input").focus(); return; }
        wrap.hidden = true; D.settings.hoursPerCredit = +t.value; save(); return;
      }
      if (t.dataset.k === "level" && t.closest("[data-c]")) { updateStats(); return; }
      if (t.dataset.img) {
        const file = t.files && t.files[0]; if (!file) return;
        try {
          const url = await fileToImage(file, t.dataset.img === "logo" ? 400 : 600, t.dataset.img === "logo" ? 400 : 200);
          D.school[t.dataset.img] = url; save(true); renderStudent();
        } catch (err) { toast(err.message); }
        return;
      }
      if (t.hasAttribute("data-restore")) {
        const file = t.files && t.files[0]; if (!file) return;
        try {
          const text = await file.text();
          const nd = E.normalize(JSON.parse(text));
          const n = nd.students.reduce((a, s) => a + s.courses.length, 0);
          if (!confirm(`Restore ${nd.students.length} student${nd.students.length > 1 ? "s" : ""} and ${n} courses from this backup? This replaces the records currently in this browser.`)) { t.value = ""; return; }
          D = nd; save(true); renderStudents(); render(); status(); toast("Backup restored.");
        } catch (err) { toast(err instanceof SyntaxError ? "That file isn't a valid backup (it couldn't be read as JSON)." : err.message); }
        t.value = "";
      }
    });
    root.addEventListener("submit", e => {
      e.preventDefault();
      const f = e.target;
      if (f.dataset.addyear) {
        const input = f.querySelector("input"), title = input.value.trim();
        if (!title) { input.focus(); return; }
        const c = addCourse(+f.dataset.addyear, title);
        save(); renderCourses();
        const g = panel("courses").querySelector(`[data-c="${c.id}"] [data-k="grade"]`); if (g) g.focus();
        return;
      }
      if (f.dataset.form === "log") {
        const st = cur(), fd = new FormData(f);
        const min = (Number(fd.get("h")) || 0) * 60 + (Number(fd.get("m")) || 0);
        if (!fd.get("course") || !/^\d{4}-\d{2}-\d{2}$/.test(fd.get("date"))) return;
        if (min <= 0 || min > 24 * 60) { toast("Enter the time spent (hours and/or minutes)."); f.querySelector('[name="h"]').focus(); return; }
        st.log.push({ id: E.uid(), date: fd.get("date"), courseId: fd.get("course"), min: Math.round(min), note: String(fd.get("note") || "").slice(0, 300) });
        store.set("lastCourse", fd.get("course"));
        save(); renderHours();
        const c = findCourse(fd.get("course"));
        toast(`Logged ${E.fmtHours(min)} for ${c ? c.title : "course"}.`);
        const h = panel("hours").querySelector('[name="h"]'); if (h) h.focus();
        track("hours_logged");
        return;
      }
      if (f.dataset.form === "newcourse") {
        const fd = new FormData(f), title = String(fd.get("title") || "").trim();
        if (!title) return;
        const c = addCourse(+fd.get("year"), title);
        if (!E.findLibrary(title)) c.subject = fd.get("subject");
        store.set("lastCourse", c.id);
        save(); renderHours(); toast(`Added ${c.title} to ${E.gradeName(c.year)}.`);
      }
    });
    root.addEventListener("keydown", e => {
      const t = e.target;
      if (t.getAttribute("role") === "tab" && ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const i = TABS.findIndex(x => x[0] === tab);
        const n = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
        showTab(TABS[n][0], true);
      }
    });
    root.addEventListener("click", e => {
      const tb = e.target.closest("[role=tab]");
      if (tb) { showTab(tb.dataset.tab); return; }
      const go = e.target.closest("[data-go]");
      if (go) { if (go.dataset.doc) { doc = go.dataset.doc; store.set("doc", doc); } showTab(go.dataset.go); root.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      const b = e.target.closest("[data-a]"); if (!b) return;
      const a = b.dataset.a, st = cur();
      if (a === "addStudent") {
        const ns = E.newStudent(); D.students.push(ns); D.current = ns.id; save(); renderStudents(); showTab("student");
        const n = panel("student").querySelector("#gl-s-name"); if (n) n.focus();
        toast("New student added. School details are shared."); track("student_added");
      } else if (a === "delStudent") {
        if (!confirm(`Delete ${st.name || "this student"} and all of their courses and hours from this browser?`)) return;
        D.students = D.students.filter(s => s.id !== st.id);
        if (!D.students.length) D.students.push(E.newStudent());
        D.current = D.students[0].id; save(true); renderStudents(); render(); status();
      } else if (a === "copyAddr") { st.address = D.school.address; save(); renderStudent(); }
      else if (a === "rmImg") { D.school[b.dataset.k] = ""; save(); renderStudent(); }
      else if (a === "drawSig") signaturePad(url => { D.school.signature = url; save(true); renderStudent(); });
      else if (a === "addTest") { st.tests.push({ name: "", date: "", score: "" }); save(); renderStudent(); const ins = panel("student").querySelectorAll('[data-tk="name"]'); ins[ins.length - 1].focus(); }
      else if (a === "rmTest") { st.tests.splice(+b.closest("[data-t]").dataset.t, 1); save(); renderStudent(); }
      else if (a === "more") {
        const ex = b.closest("[data-c]").querySelector(".gl-extra");
        ex.hidden = !ex.hidden; b.setAttribute("aria-expanded", String(!ex.hidden));
      } else if (a === "rmCourse") {
        const id = b.closest("[data-c]").dataset.c, i = st.courses.findIndex(c => c.id === id);
        if (i < 0) return;
        const [c] = st.courses.splice(i, 1);
        const logs = st.log.filter(l => l.courseId === id);
        st.log = st.log.filter(l => l.courseId !== id);
        save(); renderCourses();
        toast(`Removed ${c.title || "course"}${logs.length ? ` and ${logs.length} hours entr${logs.length > 1 ? "ies" : "y"}` : ""}.`, () => { st.courses.splice(i, 0, c); st.log.push(...logs); save(); renderCourses(); });
      } else if (a === "show8") { show8 = true; renderCourses(); const inp = panel("courses").querySelector('[data-addyear="8"] input'); if (inp) inp.focus(); }
      else if (a === "example") {
        const ex = E.exampleStudent(new Date().getFullYear() + 1);
        ex.name += " (example)";
        const blank = !st.name.trim() && !st.courses.length;
        if (blank) D.students = D.students.map(s => s.id === st.id ? ex : s); else D.students.push(ex);
        D.current = ex.id;
        if (!D.school.name.trim()) Object.assign(D.school, { name: EXAMPLE_SCHOOL.name, address: EXAMPLE_SCHOOL.address, admin: D.school.admin || EXAMPLE_SCHOOL.admin });
        save(true); renderStudents(); render(); status();
        toast("Example student loaded. Delete it on the Student tab when you're done."); track("example_loaded");
      } else if (a === "useCredits") {
        const c = findCourse(b.dataset.c); if (!c) return;
        const old = c.credits; c.credits = +b.dataset.v; save(); renderHours();
        toast(`${c.title}: credits set to ${E.fmtCredits(c.credits)}.`, () => { c.credits = old; save(); renderHours(); });
      } else if (a === "rmLog") {
        const i = st.log.findIndex(l => l.id === b.dataset.id); if (i < 0) return;
        const [l] = st.log.splice(i, 1); save(); renderHours();
        toast("Entry deleted.", () => { st.log.push(l); save(); renderHours(); });
      } else if (a === "moreLog") { logShown += 100; renderHours(); }
      else if (a === "logCsv") { download(new Blob([E.logToCSV(st)], { type: "text/csv;charset=utf-8" }), `${fileSafe(st.name)}-hours-log.csv`); track("hours_csv_exported"); }
      else if (a === "logPdf") exportPdf("hours");
      else if (a === "descPdf") exportPdf("descriptions");
      else if (a === "pdf") exportPdf();
      else if (a === "suggest") {
        const c = findCourse(b.dataset.c), lib = c && E.findLibrary(c.title); if (!lib) return;
        if (c.gen.topics.trim() && !confirm("Replace the topics you typed with the typical topics?")) return;
        c.gen.topics = lib.topics.split("; ").join("\n"); save();
        const ta = b.closest(".gl-dc").querySelector('[data-gen="topics"]'); ta.value = c.gen.topics; ta.focus();
      } else if (a === "gen") {
        const c = findCourse(b.dataset.c); if (!c) return;
        const text = E.generateDescription(c, { yearLabel: (st.years[c.year] && st.years[c.year].label) || E.yearLabel(String(st.gradDate).slice(0, 4), c.year), hours: E.courseHours(st, c) });
        if (c.desc.trim() && c.desc.trim() !== text && !confirm("Replace the current description with a new one built from these details?")) return;
        c.desc = text; save();
        const row = b.closest(".gl-dc"); row.querySelector(".gl-desc").value = text; row.querySelector("[data-wc]").textContent = wordCount(text);
        const sumEl = row.querySelector(".gl-ds"); sumEl.textContent = `${E.gradeName(c.year)} · Written`; sumEl.classList.add("ok");
        const done = st.courses.filter(x => x.desc.trim()).length;
        panel("descriptions").querySelector(".gl-dprog").innerHTML = `<strong>${done} of ${st.courses.length}</strong> courses have a description.`;
        panel("descriptions").querySelector('[data-a="descPdf"]').disabled = !done;
        track("description_generated");
      } else if (a === "genAll") {
        const missing = st.courses.filter(c => !c.desc.trim());
        if (!missing.length) return;
        if (!confirm(`Draft descriptions for ${missing.length} course${missing.length > 1 ? "s" : ""}? Courses with no topics entered get the typical topics for that course where available. Review and edit each one before you use it.`)) return;
        for (const c of missing) {
          const lib = E.findLibrary(c.title);
          if (!c.gen.topics.trim() && lib) c.gen.topics = lib.topics.split("; ").join("\n");
          c.desc = E.generateDescription(c, { yearLabel: (st.years[c.year] && st.years[c.year].label) || E.yearLabel(String(st.gradDate).slice(0, 4), c.year), hours: E.courseHours(st, c) });
        }
        save(); renderDesc(); toast(`Drafted ${missing.length} description${missing.length > 1 ? "s" : ""}. Open each course to review it.`); track("description_generated");
      } else if (a === "backup") {
        D.backupAt = new Date().toISOString(); save(true);
        download(new Blob([JSON.stringify(D, null, 1)], { type: "application/json" }), `gradledger-backup-${today()}.json`);
        status(); if (tab === "settings") renderSettings(); track("backup_downloaded");
      } else if (a === "erase") {
        if (!confirm("Erase every student, course, hours entry, logo and signature from this browser? Download a backup first if you might need them.")) return;
        D = E.emptyData(); save(true); renderStudents(); render(); status(); toast("All GradLedger data erased from this browser.");
      }
    });
    window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h)) { showTab(h); root.scrollIntoView({ block: "start" }); } });
    window.addEventListener("storage", e => { if (e.key === KEY && e.newValue) { const nd = store.load(); if (nd) { D = nd; renderStudents(); render(); status(); } } });

    renderStudents(); showTab(tab, false, true); status();
    if (TABS.some(t => t[0] === fromHash)) setTimeout(() => root.scrollIntoView({ block: "start" }), 50);
  }

  // =================================================================================================
  // Standalone GPA calculator
  // =================================================================================================
  const EXAMPLE_ROWS = [["English 9", "A", 1, "R"], ["Algebra 1", "B+", 1, "R"], ["Biology", "A-", 1, "H"], ["World History", "B", 1, "R"], ["Spanish 1", "A", 1, "R"], ["Art", "A", 0.5, "R"], ["Physical Education", "P", 0.5, "R"]].map(([title, grade, credits, level]) => ({ title, grade, credits, level }));
  function mountGPA(root) {
    let st = store.get("gpacalc", null);
    if (!st || !Array.isArray(st.rows)) st = { rows: E.clone(EXAMPLE_ROWS), settings: E.settingsWithDefaults({}) };
    st.settings = E.settingsWithDefaults(st.settings);
    let tracked = false;
    const save = () => store.set("gpacalc", st);
    root.innerHTML = `
      <div class="glc">
        <div class="glc-main">
          <div class="glc-head" aria-hidden="true"><span>Course</span><span>Grade</span><span>Credits</span><span>Level</span><span></span></div>
          <div class="glc-rows"></div>
          <datalist id="glc-grades">${["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", "P"].map(g => `<option value="${g}"></option>`).join("")}</datalist>
          <div class="gl-btns"><button type="button" class="btn ghost sm" data-a="add">+ Add course</button><button type="button" class="btn ghost sm" data-a="clear">Clear all</button><button type="button" class="btn ghost sm" data-a="example">Load example</button></div>
          <details class="glc-set"><summary>Grading scale and weights</summary>
            <label class="gl-check"><input type="checkbox" data-s="plusMinus"${st.settings.plusMinus ? " checked" : ""}> Plus/minus grades (A- = 3.7, B+ = 3.3…)</label>
            <div class="row"><div><label for="glc-pct">Percentage scale</label><select id="glc-pct" data-s="pct">${opt("10", "10-point (90/80/70/60)", st.settings.pct)}${opt("7", "7-point (93/85/77/70)", st.settings.pct)}</select></div>
            <div><label for="glc-dec">Decimals</label><select id="glc-dec" data-s="decimals">${opt(2, "2", st.settings.decimals)}${opt(3, "3", st.settings.decimals)}</select></div></div>
            <div class="row3"><div><label for="glc-wh">Honors +</label><input id="glc-wh" type="number" step="0.1" min="0" max="2" inputmode="decimal" data-w="H" value="${st.settings.weights.H}"></div>
            <div><label for="glc-wap">AP +</label><input id="glc-wap" type="number" step="0.1" min="0" max="2" inputmode="decimal" data-w="AP" value="${st.settings.weights.AP}"></div>
            <div><label for="glc-wde">Dual enroll. +</label><input id="glc-wde" type="number" step="0.1" min="0" max="2" inputmode="decimal" data-w="DE" value="${st.settings.weights.DE}"></div></div>
          </details>
        </div>
        <div class="glc-out" aria-live="polite"></div>
      </div>
      <details class="glc-math" open><summary>Show the math</summary><div class="glc-mathbody"></div></details>
      <div class="glc-send gl-btns"><label class="gl-inline" for="glc-to">Copy these courses into the transcript builder as</label><select id="glc-to">${E.YEARS.map(y => opt(y, E.gradeName(y), 9)).join("")}</select><button type="button" class="btn ghost sm" data-a="send">Copy to transcript</button><span class="glc-sent small"></span></div>`;
    const rowsEl = root.querySelector(".glc-rows");
    function renderRows() {
      rowsEl.innerHTML = st.rows.map((r, i) => {
        const g = E.parseGrade(r.grade, st.settings);
        return `<div class="glc-row" data-i="${i}">
        <input data-k="title" value="${esc(r.title)}" placeholder="Course ${i + 1}" aria-label="Course ${i + 1} name" autocomplete="off">
        <input data-k="grade" value="${esc(r.grade)}" placeholder="A, 93, P" aria-label="Course ${i + 1} grade" list="glc-grades" autocomplete="off"${g.kind === "invalid" ? ' aria-invalid="true"' : ""}>
        <input data-k="credits" type="number" step="0.25" min="0" max="20" inputmode="decimal" value="${esc(r.credits)}" aria-label="Course ${i + 1} credits">
        <select data-k="level" aria-label="Course ${i + 1} level">${levelOpts(r.level)}</select>
        <button type="button" class="gl-ib gl-x" data-a="rm" aria-label="Remove course ${i + 1}">×</button></div>`;
      }).join("");
    }
    function compute() {
      const r = E.computeGPA(st.rows, st.settings);
      const d = st.settings.decimals;
      const q = n => E.fmtCredits(n);
      root.querySelector(".glc-out").innerHTML = `
        <div class="glc-res"><span class="gl-cap">Unweighted GPA</span><span class="glc-big" data-out="u">${r.unweighted || "—"}</span></div>
        <div class="glc-res"><span class="gl-cap">Weighted GPA</span><span class="glc-big" data-out="w">${r.weighted || "—"}</span></div>
        <p class="small muted">${E.fmtCredits(r.attempted)} graded credits${r.earned !== r.attempted ? ` · ${E.fmtCredits(r.earned)} earned` : ""}${r.inProgress ? ` · ${E.fmtCredits(r.inProgress)} in progress` : ""}</p>`;
      const rows = r.rows.map(x => {
        const t = esc(x.course.title || "Untitled");
        if (x.grade.kind !== "graded") return `<tr class="muted"><td>${t}</td><td>${esc(x.grade.label || "—")}</td><td colspan="4">${x.grade.kind === "pass" ? "Pass: credit earned, not in GPA" : x.grade.kind === "invalid" ? "Grade not recognised" : x.grade.kind === "w" ? "Withdrawn: not counted" : "Not graded yet: not in GPA"}</td><td>${E.fmtCredits(x.credits)}</td></tr>`;
        return `<tr><td>${t}</td><td>${esc(x.grade.letter)}${x.grade.pct != null ? ` (${x.grade.pct})` : ""}</td><td>${x.points.toFixed(1)}</td><td>${x.bonus ? "+" + E.fmtPoints(x.bonus) : "—"}</td><td>${E.fmtCredits(x.credits)}</td><td>${q(x.qU)}</td><td>${q(x.qW)}</td></tr>`;
      }).join("");
      root.querySelector(".glc-mathbody").innerHTML = `
        <div class="gl-tw"><table class="glc-t"><thead><tr><th scope="col">Course</th><th scope="col">Grade</th><th scope="col">Points</th><th scope="col">Weight</th><th scope="col">Credits</th><th scope="col">Quality pts</th><th scope="col">Weighted pts</th></tr></thead>
        <tbody>${rows}</tbody><tfoot><tr><th scope="row" colspan="4">Totals (graded courses)</th><td>${E.fmtCredits(r.attempted)}</td><td>${q(r.qualityU)}</td><td>${q(r.qualityW)}</td></tr></tfoot></table></div>
        ${r.attempted ? `<p class="glc-f">Unweighted GPA = ${q(r.qualityU)} ÷ ${E.fmtCredits(r.attempted)} = ${r.unweightedExact.toFixed(d + 2)}… → <strong>${r.unweighted}</strong></p>
        <p class="glc-f">Weighted GPA = ${q(r.qualityW)} ÷ ${E.fmtCredits(r.attempted)} = ${r.weightedExact.toFixed(d + 2)}… → <strong>${r.weighted}</strong></p>` : `<p class="muted">Enter at least one graded course with credits.</p>`}
        <p class="gl-hint">Quality points = grade points × credits. Weights are added only to passing grades. Results are rounded half up to ${d} decimals.</p>`;
      if (!tracked && st.rows.some(x => x.grade)) { tracked = true; track("gpa_calculated"); }
    }
    root.addEventListener("input", e => {
      const t = e.target, row = t.closest("[data-i]");
      if (row) {
        const r = st.rows[+row.dataset.i];
        r[t.dataset.k] = t.dataset.k === "credits" ? (t.value === "" ? "" : E.parseCredits(t.value)) : t.value;
        if (t.dataset.k === "grade") { if (E.parseGrade(t.value, st.settings).kind === "invalid") t.setAttribute("aria-invalid", "true"); else t.removeAttribute("aria-invalid"); }
      } else if (t.dataset.s) {
        st.settings[t.dataset.s] = t.type === "checkbox" ? t.checked : t.dataset.s === "decimals" ? +t.value : t.value;
        st.settings = E.settingsWithDefaults(st.settings);
      } else if (t.dataset.w) { const v = Number(t.value); if (!Number.isFinite(v)) return; st.settings.weights[t.dataset.w] = v; st.settings = E.settingsWithDefaults(st.settings); }
      else return;
      save(); compute();
    });
    root.addEventListener("change", e => { if (e.target.dataset.k === "level") { save(); compute(); } });
    root.addEventListener("click", e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      const a = b.dataset.a;
      if (a === "add") { st.rows.push({ title: "", grade: "", credits: 1, level: "R" }); renderRows(); [...rowsEl.querySelectorAll("[data-k=title]")].pop().focus(); }
      else if (a === "rm") { st.rows.splice(+b.closest("[data-i]").dataset.i, 1); if (!st.rows.length) st.rows.push({ title: "", grade: "", credits: 1, level: "R" }); renderRows(); }
      else if (a === "clear") { st.rows = [1, 2, 3, 4, 5, 6].map(() => ({ title: "", grade: "", credits: 1, level: "R" })); renderRows(); rowsEl.querySelector("[data-k=title]").focus(); }
      else if (a === "example") { st.rows = E.clone(EXAMPLE_ROWS); renderRows(); }
      else if (a === "send") {
        const year = +root.querySelector("#glc-to").value;
        const rows = st.rows.filter(r => r.title.trim() || r.grade);
        if (!rows.length) { root.querySelector(".glc-sent").textContent = "Add some courses first."; return; }
        const D = store.load() || E.emptyData();
        const s = D.students.find(x => x.id === D.current) || D.students[0];
        for (const r of rows) {
          const lib = E.findLibrary(r.title);
          s.courses.push(E.newCourse(year, { title: r.title.trim() || "Untitled course", grade: r.grade, credits: E.parseCredits(r.credits), level: r.level, subject: lib ? lib.subject : "elec" }));
        }
        store.save(D);
        root.querySelector(".glc-sent").innerHTML = `Copied ${rows.length} course${rows.length > 1 ? "s" : ""}. <a href="/#courses">Open the transcript builder</a>`;
        track("gpa_sent_to_transcript");
        return;
      } else return;
      save(); compute();
    });
    renderRows(); compute();
  }

  // =================================================================================================
  // Hours-to-credits calculator
  // =================================================================================================
  function mountCredits(root) {
    const st = Object.assign({ hours: 150, hpc: 120, step: "0.25", credits: 1, weeks: 36, days: 5 }, store.get("credcalc", {}));
    root.innerHTML = `
      <div class="grid2 glh">
        <div class="gl-box">
          <h3>Hours → credits</h3>
          <div class="row"><div><label for="glh-hours">Hours completed</label><input id="glh-hours" type="number" min="0" max="5000" step="0.5" inputmode="decimal" data-k="hours" value="${esc(st.hours)}"></div>
          <div><label for="glh-hpc">Hours per credit</label><input id="glh-hpc" type="number" min="1" max="1000" step="1" inputmode="numeric" data-k="hpc" value="${esc(st.hpc)}" list="glh-hpcs"><datalist id="glh-hpcs"><option value="120"></option><option value="135"></option><option value="150"></option><option value="180"></option></datalist></div></div>
          <div class="gl-btns glh-presets" role="group" aria-label="Common hours-per-credit standards">${[120, 135, 150, 180].map(v => `<button type="button" class="btn ghost sm" data-hpc="${v}">${v} h</button>`).join("")}</div>
          <label for="glh-step">Round down to</label><select id="glh-step" data-k="step">${opt("0.25", "Nearest quarter credit (0.25)", st.step)}${opt("0.5", "Nearest half credit (0.5)", st.step)}${opt("0", "Don't round", st.step)}</select>
          <div class="glh-out" data-out="credits" aria-live="polite"></div>
        </div>
        <div class="gl-box">
          <h3>Plan a course</h3>
          <div class="row"><div><label for="glh-cr">Credits to earn</label><input id="glh-cr" type="number" min="0.25" max="10" step="0.25" inputmode="decimal" data-k="credits" value="${esc(st.credits)}"></div>
          <div><label for="glh-hpc2">Hours per credit</label><input id="glh-hpc2" type="number" min="1" max="1000" step="1" inputmode="numeric" data-k="hpc" value="${esc(st.hpc)}"></div></div>
          <div class="row"><div><label for="glh-weeks">School weeks</label><input id="glh-weeks" type="number" min="1" max="52" step="1" inputmode="numeric" data-k="weeks" value="${esc(st.weeks)}"></div>
          <div><label for="glh-days">Days per week</label><input id="glh-days" type="number" min="1" max="7" step="1" inputmode="numeric" data-k="days" value="${esc(st.days)}"></div></div>
          <div class="glh-out" data-out="plan" aria-live="polite"></div>
        </div>
      </div>
      <p class="gl-hint">Want to log hours as you go? The <a href="/homeschool-hours-tracker">hours tracker</a> adds them up per course and turns them into credits on the transcript.</p>`;
    const n = (v, d) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? x : d; };
    const fmt = x => (Math.round(x * 100) / 100).toString();
    function compute() {
      const hours = n(st.hours, 0), hpc = n(st.hpc, 120) || 120, step = Number(st.step);
      const exact = hours / hpc;
      const r = step ? E.creditsFromMinutes(Math.round(hours * 60), hpc, step).rounded : exact;
      root.querySelector('[data-out="credits"]').innerHTML = `<span class="glc-big" data-v="credits">${step ? E.fmtCredits(r) : fmt(exact)}</span><span class="gl-cap">credit${(step ? r : exact) === 1 ? "" : "s"}</span>
        <p class="glc-f">${fmt(hours)} h ÷ ${fmt(hpc)} h per credit = ${exact.toFixed(3).replace(/\.?0+$/, "")} credits${step ? `, rounded down to the nearest ${step === 0.25 ? "quarter" : "half"} credit` : ""}.</p>`;
      const p = E.planHours(n(st.credits, 1), hpc, n(st.weeks, 36) || 36, n(st.days, 5) || 5);
      root.querySelector('[data-out="plan"]').innerHTML = `<span class="glc-big" data-v="total">${fmt(p.total)}</span><span class="gl-cap">hours in total</span>
        <p class="glc-f">${fmt(p.total)} h ÷ ${n(st.weeks, 36)} weeks = <strong data-v="week">${p.perWeek.toFixed(1)} h per week</strong>, or about <strong data-v="day">${Math.round(p.minutesPerDay)} minutes a day</strong> over ${n(st.days, 5)} days a week.</p>`;
    }
    root.addEventListener("input", e => {
      const k = e.target.dataset.k; if (!k) return;
      st[k] = e.target.value;
      if (k === "hpc") root.querySelectorAll('[data-k="hpc"]').forEach(x => { if (x !== e.target) x.value = e.target.value; });
      store.set("credcalc", st); compute();
    });
    root.addEventListener("click", e => {
      const b = e.target.closest("[data-hpc]"); if (!b) return;
      st.hpc = b.dataset.hpc; root.querySelectorAll('[data-k="hpc"]').forEach(x => { x.value = st.hpc; });
      store.set("credcalc", st); compute();
    });
    compute();
  }

  // =================================================================================================
  // Course description generator
  // =================================================================================================
  function mountDescGen(root) {
    const blank = { title: "", subject: "sci", level: "R", year: 10, credits: 1, dur: "", provider: "", college: "", hours: "", gen: { topics: "", materials: "", acts: [], evals: [], actsOther: "", evalsOther: "", style: "standard" } };
    let c = Object.assign(E.clone(blank), store.get("descgen", {}));
    c.gen = Object.assign(E.clone(blank.gen), c.gen || {});
    if (!c.title && !c.gen.topics) { c.title = "Biology"; c.gen.topics = E.findLibrary("Biology").topics.split("; ").slice(0, 6).join("\n"); c.gen.materials = "a high school biology textbook with lab manual; a microscope with prepared slides"; c.gen.acts = ["reading", "labs"]; c.gen.evals = ["tests", "labs"]; c.hours = 150; }
    let edited = false;
    const chips = (list, sel, key) => list.map(([k, n]) => `<label class="gl-chip"><input type="checkbox" data-g="${key}" value="${k}"${(sel || []).includes(k) ? " checked" : ""}> ${esc(n)}</label>`).join("");
    root.innerHTML = `
      <div class="gld">
        <form class="gld-form" onsubmit="return false" autocomplete="off">
          <label for="gld-title">Course title</label><input id="gld-title" data-k="title" list="gld-lib" value="${esc(c.title)}" placeholder="e.g. Algebra 1, American Literature">
          <datalist id="gld-lib">${E.LIBRARY.map(l => `<option value="${esc(l.title)}"></option>`).join("")}</datalist>
          <div class="row"><div><label for="gld-subj">Subject</label><select id="gld-subj" data-k="subject">${subjOpts(c.subject)}</select></div>
          <div><label for="gld-level">Level</label><select id="gld-level" data-k="level">${levelOpts(c.level)}</select></div></div>
          <div class="row3"><div><label for="gld-year">Grade</label><select id="gld-year" data-k="year">${E.YEARS.map(y => opt(y, y === 8 ? "8 (HS credit)" : y, c.year)).join("")}</select></div>
          <div><label for="gld-cr">Credits</label><input id="gld-cr" data-k="credits" type="number" min="0" max="20" step="0.25" inputmode="decimal" value="${esc(c.credits)}"></div>
          <div><label for="gld-hrs">Hours</label><input id="gld-hrs" data-k="hours" type="number" min="0" max="5000" step="1" inputmode="numeric" value="${esc(c.hours)}" placeholder="optional"></div></div>
          <div class="gld-de"${c.level === "DE" ? "" : " hidden"}><div class="row"><div><label for="gld-prov">College</label><input id="gld-prov" data-k="provider" value="${esc(c.provider)}"></div><div><label for="gld-col">College credit</label><input id="gld-col" data-k="college" value="${esc(c.college)}" placeholder="e.g. 3 semester hours"></div></div></div>
          <label for="gld-topics">Topics covered</label><textarea id="gld-topics" data-g="topics" rows="4" placeholder="One per line, or separated by commas">${esc(c.gen.topics)}</textarea>
          <button type="button" class="btn ghost sm" data-a="suggest" hidden>Use typical topics</button>
          <label for="gld-mat">Materials</label><textarea id="gld-mat" data-g="materials" rows="2" placeholder="Textbooks, curriculum, online classes (separate with semicolons)">${esc(c.gen.materials)}</textarea>
          <fieldset class="gl-chips"><legend>Coursework</legend>${chips(E.ACTIVITIES, c.gen.acts, "acts")}</fieldset>
          <fieldset class="gl-chips"><legend>How work was evaluated</legend>${chips(E.EVALUATIONS, c.gen.evals, "evals")}</fieldset>
        </form>
        <div class="gld-out">
          <div class="gl-btns"><label class="gl-inline" for="gld-style">Style</label><select id="gld-style" data-g="style">${opt("standard", "Standard paragraph", c.gen.style)}${opt("concise", "Concise", c.gen.style)}${opt("detailed", "Detailed (labelled lines)", c.gen.style)}</select></div>
          <label for="gld-text">Course description</label>
          <textarea id="gld-text" rows="12"></textarea>
          <p class="gl-hint gld-wc"></p>
          <div class="gl-btns"><button type="button" class="btn" data-a="copy">Copy text</button><button type="button" class="btn ghost" data-a="pdf">Download PDF</button><button type="button" class="btn ghost" data-a="save">Save to my transcript</button><button type="button" class="btn ghost sm" data-a="regen" hidden>Rebuild from details</button></div>
          <p class="small gld-msg" role="status" aria-live="polite"></p>
        </div>
      </div>`;
    const ta = root.querySelector("#gld-text");
    const save = () => store.set("descgen", c);
    function regen(force) {
      if (edited && !force) return;
      ta.value = E.generateDescription(c, { hours: Number(c.hours) > 0 ? Number(c.hours) : 0 });
      edited = false; root.querySelector('[data-a="regen"]').hidden = true;
      wc();
    }
    const wc = () => { const n = (ta.value.match(/\S+/g) || []).length; root.querySelector(".gld-wc").textContent = `${n} words`; };
    const libCheck = () => { const lib = E.findLibrary(c.title); const b = root.querySelector('[data-a="suggest"]'); b.hidden = !lib; if (lib) b.textContent = `Use typical ${lib.title} topics`; return lib; };
    root.addEventListener("input", e => {
      const t = e.target;
      if (t === ta) { edited = true; root.querySelector('[data-a="regen"]').hidden = false; wc(); return; }
      if (t.dataset.k) {
        const k = t.dataset.k;
        c[k] = k === "year" ? +t.value : k === "credits" ? E.parseCredits(t.value) : t.value;
        if (k === "title") { const lib = libCheck(); if (lib && e.inputType !== "insertText") { c.subject = lib.subject; c.credits = lib.credits; root.querySelector("#gld-subj").value = lib.subject; root.querySelector("#gld-cr").value = lib.credits; } }
        if (k === "level") root.querySelector(".gld-de").hidden = c.level !== "DE";
      } else if (t.dataset.g) {
        const k = t.dataset.g;
        if (k === "acts" || k === "evals") c.gen[k] = [...root.querySelectorAll(`[data-g="${k}"]:checked`)].map(x => x.value);
        else c.gen[k] = t.value;
        if (k === "style") { save(); regen(true); return; }
      } else return;
      save(); regen();
    });
    root.addEventListener("change", e => { if (e.target.dataset.k === "title") { const lib = libCheck(); if (lib) { c.subject = lib.subject; c.credits = lib.credits; root.querySelector("#gld-subj").value = lib.subject; root.querySelector("#gld-cr").value = lib.credits; save(); regen(); } } });
    const msg = t => { root.querySelector(".gld-msg").innerHTML = t; };
    root.addEventListener("click", async e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      const a = b.dataset.a;
      if (a === "suggest") {
        const lib = E.findLibrary(c.title); if (!lib) return;
        if (c.gen.topics.trim() && !confirm("Replace the topics you typed with the typical topics?")) return;
        c.gen.topics = lib.topics.split("; ").join("\n"); root.querySelector("#gld-topics").value = c.gen.topics; save(); regen();
      } else if (a === "regen") regen(true);
      else if (a === "copy") {
        try { await navigator.clipboard.writeText(ta.value); msg("Copied to the clipboard."); }
        catch (err) { ta.select(); try { document.execCommand("copy"); msg("Copied to the clipboard."); } catch (e2) { msg("Select the text and copy it with Ctrl+C or Cmd+C."); } }
        track("description_copied");
      } else if (a === "pdf") {
        try {
          const G = await docs();
          const D = store.load();
          const st = D && (D.students.find(x => x.id === D.current) || D.students[0]);
          const d = G.buildSingleDescription(c, ta.value, D ? D.settings : {}, { school: D ? D.school.name : "", student: st ? st.name : "", date: today() });
          download(G.toPDF(d, { title: `Course description - ${c.title || "course"}` }).output("blob"), `${fileSafe(c.title || "course")}-course-description.pdf`);
          G.replacedCount(); track("description_pdf");
        } catch (err) { msg(esc(err.message)); }
      } else if (a === "save") {
        const D = store.load() || E.emptyData();
        const st = D.students.find(x => x.id === D.current) || D.students[0];
        const title = (c.title || "").trim() || "Untitled course";
        let course = st.courses.find(x => x.title.trim().toLowerCase() === title.toLowerCase() && x.year === c.year);
        const fields = { title, subject: c.subject, level: c.level, credits: c.credits, provider: c.provider, college: c.college, hours: c.hours === "" ? "" : Number(c.hours) || "", desc: ta.value, gen: E.clone(c.gen) };
        if (course) Object.assign(course, fields); else { course = E.newCourse(c.year, fields); st.courses.push(course); }
        store.save(D);
        msg(`Saved ${esc(title)} to ${esc(st.name || "your student")}'s ${esc(E.gradeName(c.year))} courses. <a href="/#descriptions">Open the transcript builder</a>`);
        track("description_saved");
      }
    });
    libCheck(); regen();
  }

  function start() {
    const app = document.getElementById("gl-app"); if (app) mountApp(app);
    const gpa = document.getElementById("gl-gpa"); if (gpa) mountGPA(gpa);
    const cr = document.getElementById("gl-credits"); if (cr) mountCredits(cr);
    const dg = document.getElementById("gl-descgen"); if (dg) mountDescGen(dg);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
