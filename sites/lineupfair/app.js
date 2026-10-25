/* LineupFair UI: game settings, roster, rules, the fielding chart (tap two cells to swap), fairness summary, batting order,
   season tally, share link and the four PDFs. Everything stays in this browser (localStorage). Names are never sent anywhere. */
(function () {
  "use strict";
  const C = window.LFCore;
  const root = document.getElementById("lf-tool");
  if (!C || !root) return;
  const preset = root.dataset.preset || "";
  const $ = (s, el) => (el || root).querySelector(s);
  const $$ = (s, el) => Array.from((el || root).querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const track = (name, data) => { try { if (window.va) window.va("event", data ? { name, data } : { name }); } catch (e) { /* ignore */ } };
  const KEY = "lineupfair:v1", SEASON_KEY = "lineupfair:season:v1", PREV_KEY = "lineupfair:prev:v1";
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode or full */ } },
  };

  /* -------------------------------------------------------------- state */
  const S = { game: C.emptyGame(), chart: null, edited: false, sig: "", errors: [], sel: null };
  let season = [];
  let openLim = new Set();
  const sig = () => JSON.stringify([S.game.innings, S.game.format, S.game.opts, S.game.rules, S.game.players.map(p => [p.id, p.absent, p.late, p.excl, p.locks])]);
  const stale = () => !!S.chart && S.sig !== sig();
  function persist() { store.set(KEY, { game: S.game, chart: S.chart, edited: S.edited, sig: S.sig, preset }); }
  function applyPreset(G) {
    if (preset === "tball") G.format = "tball";
    else if (preset === "coach") G.format = "coach";
    else if (preset === "of4") G.format = "of4";
  }
  function load() {
    const saved = store.get(KEY);
    if (saved && saved.game) {
      S.game = C.normalizeGame(saved.game);
      S.chart = Array.isArray(saved.chart) ? saved.chart : null;
      S.edited = !!saved.edited; S.sig = saved.sig || "";
      if (preset && saved.preset !== preset) { applyPreset(S.game); regen(); }
    } else { applyPreset(S.game); }
    const sv = store.get(SEASON_KEY);
    season = Array.isArray(sv) ? sv.map(C.cleanRecord).filter(Boolean) : [];
  }
  function regen(newSeed) {
    const r = C.solve(S.game, newSeed);
    if (r.ok) { S.chart = r.chart; S.errors = []; S.game.seed = r.seed; S.sig = sig(); }
    else { S.chart = null; S.errors = r.errors; S.sig = ""; }
    S.edited = false; S.sel = null;
    return r;
  }
  // Called after anything that changes who can play where.
  function structural() {
    if (!S.edited) regen();
    S.sel = null;
    renderAll();
  }

  /* ------------------------------------------------------------- markup */
  const opt = (v, t, sel) => `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(t)}</option>`;
  root.innerHTML = `
  <p class="lf-skip small"><a href="#lf-chart-h">Skip to the chart</a></p>
  <div class="lf">
    <div class="lf-col lf-setup">
      <section class="lf-card" aria-labelledby="lf-game-h">
        <h2 class="lf-h" id="lf-game-h">1. Game</h2>
        <label for="lf-label">Game name (optional)</label>
        <input id="lf-label" maxlength="40" placeholder="e.g. vs Tigers, Saturday" autocomplete="off">
        <div class="row">
          <div><label for="lf-innings">Innings</label><select id="lf-innings">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => opt(n, n, 6)).join("")}</select></div>
          <div><label for="lf-format">Defensive format</label><select id="lf-format">${C.FORMAT_KEYS.map(k => opt(k, C.FORMATS[k])).join("")}</select></div>
        </div>
        <div id="lf-fopts" class="lf-fopts"></div>
        <p class="small muted" id="lf-poslist"></p>
      </section>
      <section class="lf-card" aria-labelledby="lf-players-h">
        <h2 class="lf-h" id="lf-players-h">2. Players</h2>
        <form id="lf-add" class="lf-add" autocomplete="off">
          <div class="lf-add-name"><label for="lf-newname">Player name</label><input id="lf-newname" maxlength="24" placeholder="e.g. Maya"></div>
          <div class="lf-add-num"><label for="lf-newnum">Jersey #</label><input id="lf-newnum" maxlength="4" inputmode="numeric" placeholder="7"></div>
          <button class="btn" type="submit">Add player</button>
        </form>
        <details class="lf-paste"><summary>Paste a list of names</summary>
          <label for="lf-paste">One player per line, with an optional jersey number (for example “7 Maya” or “Maya 7”)</label>
          <textarea id="lf-paste" rows="5" placeholder="Maya 7&#10;Ben 12&#10;Chloe"></textarea>
          <div class="lf-btns"><button class="btn ghost sm" type="button" data-a="paste">Add these players</button></div>
        </details>
        <div class="lf-btns" id="lf-rbtns"><button class="btn ghost sm" type="button" data-a="example">Add an example roster</button><button class="btn ghost sm" type="button" data-a="clear">Clear roster</button></div>
        <p class="small muted" id="lf-rcount" aria-live="polite"></p>
        <ul class="lf-roster" id="lf-roster" aria-label="Players"></ul>
        <p class="small muted">Names and numbers stay in this browser. Each player can be marked absent, arrive late, or be kept out of positions (for example not catcher or pitcher for safety) or locked to one.</p>
      </section>
      <section class="lf-card" aria-labelledby="lf-rules-h">
        <h2 class="lf-h" id="lf-rules-h">3. Rules</h2>
        <p class="small muted">Coach settings, not any league's policy. Check your league's rules for playing time, batting and pitching.</p>
        <div class="lf-rule"><label class="lf-chk"><input type="checkbox" id="r-bench"> <span><b>Bench fairness</b><small>Nobody sits a second time before everyone has sat once. Bench innings differ by at most 1 among players there for the same innings.</small></span></label></div>
        <div class="lf-rule"><label class="lf-chk"><input type="checkbox" id="r-noB2B"> <span><b>No sitting two innings in a row</b><small>When the roster allows it.</small></span></label></div>
        <div class="lf-rule"><label class="lf-chk"><input type="checkbox" id="r-minInf"> <span><b>Minimum infield innings</b><small>Every player gets at least this many innings at P, 1B, 2B, 3B or SS (and C if counted as infield).</small></span></label>
          <div class="lf-num-row"><label for="r-minInfN">Innings per player</label><input id="r-minInfN" type="number" min="0" max="9" inputmode="numeric"></div></div>
        <div class="lf-rule"><label class="lf-chk"><input type="checkbox" id="r-noRepeat"> <span><b>No same position two innings in a row</b><small>Locked positions are the exception.</small></span></label></div>
        <div class="lf-rule"><label class="lf-chk"><input type="checkbox" id="r-limits"> <span><b>Limit innings at pitcher and catcher</b><small>Per player, per game. Set a box to 0 for no limit. This is not a pitch count; LineupFair does not track pitches.</small></span></label>
          <div class="lf-num-row two"><div><label for="r-maxP">Max at P</label><input id="r-maxP" type="number" min="0" max="9" inputmode="numeric"></div><div><label for="r-maxC">Max at C</label><input id="r-maxC" type="number" min="0" max="9" inputmode="numeric"></div></div></div>
        <p class="small muted">Locks and “never plays” choices are always obeyed. Everything else is a goal: if a rule cannot be met, the chart tells you which rule and for whom.</p>
      </section>
    </div>
    <div class="lf-col lf-out">
      <section class="lf-card" aria-labelledby="lf-chart-h">
        <h2 class="lf-h" id="lf-chart-h">4. Fielding chart</h2>
        <div class="lf-btns lf-gen">
          <button class="btn" type="button" data-a="generate">Generate chart</button>
          <button class="btn ghost" type="button" data-a="shuffle">Shuffle</button>
          <span class="small muted" id="lf-seedinfo"></span>
        </div>
        <div id="lf-banner" class="lf-banner" role="status" aria-live="polite"></div>
        <div id="lf-chartbox" class="lf-chartbox" role="region" aria-label="Fielding chart. Scrolls sideways on small screens." tabindex="0"></div>
        <p class="small muted" id="lf-hint"></p>
        <div id="lf-issues" class="lf-issues"></div>
      </section>
      <section class="lf-card" aria-labelledby="lf-sum-h">
        <h2 class="lf-h" id="lf-sum-h">Fairness summary</h2>
        <div class="lf-tablebox" tabindex="0" role="region" aria-label="Fairness summary table"><table class="lf-sum" id="lf-sum"></table></div>
      </section>
      <section class="lf-card" aria-labelledby="lf-bat-h">
        <h2 class="lf-h" id="lf-bat-h">5. Batting order</h2>
        <p class="small muted">Continuous batting order: everyone present bats. Drag a name or use the arrows. Late arrivals bat last.</p>
        <ol class="lf-order" id="lf-order"></ol>
        <div class="lf-rotate">
          <div><label for="lf-rotn">Move the top</label><input id="lf-rotn" type="number" min="1" max="24" value="3" inputmode="numeric"></div>
          <button class="btn ghost" type="button" data-a="rotate">Rotate for next game</button>
        </div>
      </section>
      <section class="lf-card" aria-labelledby="lf-print-h">
        <h2 class="lf-h" id="lf-print-h">6. Print and share</h2>
        <div class="lf-btns">
          <button class="btn" type="button" data-pdf="dugout">Dugout card PDF (Letter)</button>
          <button class="btn ghost" type="button" data-pdf="index">Index card PDF (5 × 8 in)</button>
          <button class="btn ghost" type="button" data-pdf="field">Field diagram PDF</button>
        </div>
        <details class="lf-paste"><summary>Blank lineup card for writing by hand</summary>
          <div class="row"><div><label for="lf-binn">Innings</label><select id="lf-binn">${[5, 6, 7, 8, 9].map(n => opt(n, n, 6)).join("")}</select></div><div><label for="lf-brows">Player rows</label><select id="lf-brows">${[10, 12, 15, 18].map(n => opt(n, n, 15)).join("")}</select></div></div>
          <div class="lf-btns"><button class="btn ghost sm" type="button" data-pdf="blank">Blank lineup card PDF</button></div>
        </details>
        <div class="lf-msg" id="lf-pdfmsg" role="status" aria-live="polite"></div>
        <label for="lf-link">Share link for an assistant coach</label>
        <div class="lf-linkrow"><input id="lf-link" readonly><button class="btn ghost sm" type="button" data-a="copy">Copy link</button></div>
        <p class="small muted">The whole chart and roster are packed into the link itself; nothing is uploaded. Anyone who opens it gets their own copy. Only share it with people you want to see the names.</p>
      </section>
      <section class="lf-card" aria-labelledby="lf-season-h">
        <h2 class="lf-h" id="lf-season-h">7. Season tally</h2>
        <div class="lf-btns"><button class="btn" type="button" data-a="save">Save game to season</button><button class="btn ghost" type="button" data-pdf="season">Season summary PDF</button></div>
        <div class="lf-msg" id="lf-seasonmsg" role="status" aria-live="polite"></div>
        <div class="lf-tablebox" tabindex="0" role="region" aria-label="Season totals table"><table class="lf-sum" id="lf-season"></table></div>
        <ul class="lf-games" id="lf-games" aria-label="Saved games"></ul>
        <div class="lf-btns"><button class="btn ghost sm" type="button" data-a="backup">Export backup (JSON)</button><input type="file" id="lf-import" class="sr" accept=".json,application/json"><label for="lf-import" class="btn ghost sm lf-filebtn">Import backup</label></div>
        <p class="small muted">Saved games live in this browser only. Clearing site data deletes them, so export a backup now and then.</p>
      </section>
    </div>
  </div>
  <div class="sr" id="lf-live" role="status" aria-live="polite"></div>`;

  const say = (id, html, kind) => { const el = $(id); if (el) { el.innerHTML = html ? `<p class="${kind || ""}">${html}</p>` : ""; } };
  const live = t => { $("#lf-live").textContent = ""; setTimeout(() => { $("#lf-live").textContent = t; }, 30); };
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const slug = () => (S.game.label || "lineup").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "lineup";
  const pname = (p, i) => C.nameOf(p, i === undefined ? S.game.players.indexOf(p) : i);
  const byId = id => S.game.players.find(p => p.id === id);

  /* -------------------------------------------------------- game + rules */
  function renderSettings() {
    const G = S.game;
    $("#lf-label").value = G.label;
    $("#lf-innings").value = G.innings;
    $("#lf-format").value = G.format;
    const o = G.opts;
    let h = `<label class="lf-chk"><input type="checkbox" id="o-catinf"${o.catcherInfield ? " checked" : ""}> <span>Count catcher as infield</span></label>`;
    if (G.format === "coach") h += `<label class="lf-chk"><input type="checkbox" id="o-coachP"${o.coachP ? " checked" : ""}> <span>Put a player at pitcher, beside the coach</span></label>`;
    if (G.format === "tball") h += `<label class="lf-chk"><input type="checkbox" id="o-tcatch"${o.tCatcher ? " checked" : ""}> <span>Add a catcher</span></label>
      <div class="lf-inline"><label for="o-tfield">Fielders</label><select id="o-tfield">${[8, 9, 10, 11, 12].map(n => opt(n, n, o.tFielders)).join("")}</select></div>`;
    if (G.format === "custom") h += `<fieldset class="lf-chips"><legend>Positions on the field</legend>${C.POS_ORDER.map(q => `<label class="lf-chip"><input type="checkbox" data-custom="${q}"${o.custom.includes(q) ? " checked" : ""}><span title="${esc(C.POS[q])}">${q}</span></label>`).join("")}</fieldset>`;
    $("#lf-fopts").innerHTML = h;
    const pos = C.positionsOf(G);
    $("#lf-poslist").textContent = `${pos.length} fielders: ${pos.join(", ")}. Infield: ${C.infieldList(G).join(", ") || "none"}.`;
    const R = G.rules;
    $("#r-bench").checked = R.bench; $("#r-noB2B").checked = R.noB2B; $("#r-minInf").checked = R.minInf; $("#r-minInfN").value = R.minInfN;
    $("#r-noRepeat").checked = R.noRepeat; $("#r-limits").checked = R.limits; $("#r-maxP").value = R.maxP; $("#r-maxC").value = R.maxC;
    $("#r-minInfN").disabled = !R.minInf; $("#r-maxP").disabled = $("#r-maxC").disabled = !R.limits;
    $("#lf-binn").value = String(Math.max(5, Math.min(9, G.innings)));
  }
  $("#lf-label").addEventListener("input", e => { S.game.label = e.target.value.slice(0, 40); persist(); renderShare(); });
  $("#lf-innings").addEventListener("change", e => {
    S.game.innings = +e.target.value; S.game = C.normalizeGame(S.game);
    renderSettings(); renderRoster(); structural();
  });
  $("#lf-format").addEventListener("change", e => {
    const prev = C.positionsOf(S.game);
    if (e.target.value === "custom") S.game.opts.custom = prev;
    S.game.format = e.target.value;
    renderSettings(); renderRoster(); structural();
  });
  $("#lf-fopts").addEventListener("change", e => {
    const t = e.target, o = S.game.opts;
    if (t.id === "o-catinf") o.catcherInfield = t.checked;
    else if (t.id === "o-coachP") o.coachP = t.checked;
    else if (t.id === "o-tcatch") o.tCatcher = t.checked;
    else if (t.id === "o-tfield") o.tFielders = +t.value;
    else if (t.dataset.custom) o.custom = C.POS_ORDER.filter(q => (q === t.dataset.custom ? t.checked : o.custom.includes(q)));
    else return;
    renderSettings(); renderRoster(); structural();
  });
  const ruleMap = { "r-bench": "bench", "r-noB2B": "noB2B", "r-minInf": "minInf", "r-noRepeat": "noRepeat", "r-limits": "limits" };
  root.addEventListener("change", e => {
    const t = e.target;
    if (ruleMap[t.id]) { S.game.rules[ruleMap[t.id]] = t.checked; renderSettings(); structural(); }
    else if (t.id === "r-minInfN" || t.id === "r-maxP" || t.id === "r-maxC") {
      const k = { "r-minInfN": "minInfN", "r-maxP": "maxP", "r-maxC": "maxC" }[t.id];
      S.game.rules[k] = Math.max(0, Math.min(9, Math.round(+t.value) || 0)); t.value = S.game.rules[k]; structural();
    }
  });

  /* -------------------------------------------------------------- roster */
  const lockText = l => `${l.pos}, ${l.from === l.to ? "inning " + l.from : "innings " + l.from + "–" + l.to}`;
  function limSummary(p) {
    const bits = [];
    if (p.excl.length) bits.push("never " + p.excl.join(", "));
    if (p.locks.length) bits.push(p.locks.length + (p.locks.length === 1 ? " lock" : " locks"));
    return bits.length ? bits.join(" · ") : "none";
  }
  function renderRoster() {
    const G = S.game, pos = C.positionsOf(G);
    const list = $("#lf-roster");
    list.innerHTML = G.players.map((p, i) => {
      const nm = esc(pname(p, i)), id = p.id;
      const allPos = C.POS_ORDER.filter(q => pos.includes(q) || p.excl.includes(q));
      return `<li class="lf-pl${p.absent ? " is-absent" : ""}" data-pid="${id}">
        <div class="lf-pl-main">
          <div class="lf-pl-name"><label class="sr" for="lf-n${id}">Name, player ${i + 1}</label><input id="lf-n${id}" data-f="name" maxlength="24" value="${esc(p.name)}" placeholder="Player ${i + 1}" autocomplete="off"></div>
          <div class="lf-pl-num"><label class="sr" for="lf-j${id}">Jersey number, player ${i + 1}</label><input id="lf-j${id}" data-f="num" maxlength="4" value="${esc(p.num)}" placeholder="#" inputmode="numeric" autocomplete="off"></div>
          <button class="btn ghost sm" type="button" data-a="remove" aria-label="Remove ${nm}">Remove</button>
        </div>
        <div class="lf-pl-sub">
          <label class="lf-chk"><input type="checkbox" data-f="absent"${p.absent ? " checked" : ""} aria-label="${nm} is absent"> <span>Absent</span></label>
          <div class="lf-late"><label for="lf-l${id}">Arrives in inning</label><select id="lf-l${id}" data-f="late"${p.absent ? " disabled" : ""}>${Array.from({ length: G.innings }, (_, k) => opt(k + 1, k === 0 ? "1 (on time)" : k + 1, p.late)).join("")}</select></div>
        </div>
        <details class="lf-lim" data-pid="${id}"${openLim.has(id) ? " open" : ""}><summary>Position limits: <span data-sum>${esc(limSummary(p))}</span></summary>
          <fieldset class="lf-chips"><legend>Never plays (for example not catcher or pitcher)</legend>${allPos.map(q => `<label class="lf-chip"><input type="checkbox" data-excl="${q}"${p.excl.includes(q) ? " checked" : ""} aria-label="${nm} never plays ${esc(C.POS[q])}"><span title="${esc(C.POS[q])}">${q}</span></label>`).join("")}</fieldset>
          <p class="small muted lf-lockhead">Locks (always at this position in these innings)</p>
          <ul class="lf-locks">${p.locks.map((l, k) => `<li>${esc(lockText(l))} <button class="btn ghost sm" type="button" data-a="unlock" data-k="${k}" aria-label="Remove lock ${esc(lockText(l))} for ${nm}">Remove</button></li>`).join("")}</ul>
          <div class="lf-lockadd">
            <div><label for="lf-lp${id}">Position</label><select id="lf-lp${id}" data-lockpos>${pos.map(q => opt(q, q)).join("")}</select></div>
            <div><label for="lf-lf${id}">From inning</label><select id="lf-lf${id}" data-lockfrom>${Array.from({ length: G.innings }, (_, k) => opt(k + 1, k + 1)).join("")}</select></div>
            <div><label for="lf-lt${id}">To inning</label><select id="lf-lt${id}" data-lockto>${Array.from({ length: G.innings }, (_, k) => opt(k + 1, k + 1, 1)).join("")}</select></div>
            <button class="btn ghost sm" type="button" data-a="lock">Add lock</button>
          </div>
        </details>
      </li>`;
    }).join("");
    $("#lf-rcount").textContent = G.players.length ? `${G.players.length} player${G.players.length === 1 ? "" : "s"}, ${G.players.filter(p => !p.absent).length} available.` : "No players yet. Add players one by one, paste a list, or try the example roster.";
    $("#lf-rbtns").querySelector('[data-a="example"]').hidden = G.players.length > 0;
    $("#lf-rbtns").querySelector('[data-a="clear"]').hidden = G.players.length === 0;
  }
  function addPlayers(items) {
    const G = S.game, room = C.MAX_PLAYERS - G.players.length;
    const take = items.slice(0, Math.max(0, room));
    for (const it of take) { const id = C.nextPlayerId(G); G.players.push({ id, name: it.name, num: it.num || "", absent: false, late: 1, excl: [], locks: [] }); G.order.push(id); }
    S.game = C.normalizeGame(G);
    renderRoster(); structural();
    return { added: take.length, skipped: items.length - take.length };
  }
  $("#lf-add").addEventListener("submit", e => {
    e.preventDefault();
    const nameEl = $("#lf-newname"), numEl = $("#lf-newnum");
    const items = C.parseRoster(nameEl.value);
    if (!items.length) { nameEl.focus(); live("Type a name first."); return; }
    const it = items[0];
    if (numEl.value.trim()) it.num = numEl.value.trim().slice(0, 4);
    const r = addPlayers([it]);
    if (!r.added) { live(`A team can have up to ${C.MAX_PLAYERS} players here.`); return; }
    nameEl.value = ""; numEl.value = ""; nameEl.focus();
  });
  $("#lf-roster").addEventListener("input", e => {
    const t = e.target, li = t.closest("li[data-pid]");
    if (!li || !t.dataset.f) return;
    const p = byId(+li.dataset.pid);
    if (t.dataset.f === "name") p.name = t.value.replace(/[<>]/g, "").slice(0, 24);
    else if (t.dataset.f === "num") p.num = t.value.replace(/[<>]/g, "").slice(0, 4);
    else return;
    persist(); renderOutputs();
  });
  $("#lf-roster").addEventListener("change", e => {
    const t = e.target, li = t.closest("li[data-pid]");
    if (!li) return;
    const p = byId(+li.dataset.pid);
    if (t.dataset.f === "absent") { p.absent = t.checked; li.classList.toggle("is-absent", p.absent); $("[data-f=late]", li).disabled = p.absent; $("#lf-rcount").textContent = `${S.game.players.length} players, ${S.game.players.filter(x => !x.absent).length} available.`; structural(); }
    else if (t.dataset.f === "late") { p.late = +t.value; structural(); }
    else if (t.dataset.excl) {
      p.excl = C.POS_ORDER.filter(q => (q === t.dataset.excl ? t.checked : p.excl.includes(q)));
      $("[data-sum]", li).textContent = limSummary(p); structural();
    }
  });
  $("#lf-roster").addEventListener("toggle", e => {
    const d = e.target.closest && e.target.closest("details[data-pid]");
    if (d) { const id = +d.dataset.pid; if (d.open) openLim.add(id); else openLim.delete(id); }
  }, true);
  $("#lf-roster").addEventListener("click", e => {
    const b = e.target.closest("button[data-a]");
    if (!b) return;
    const li = b.closest("li[data-pid]"), id = +li.dataset.pid, p = byId(id);
    if (b.dataset.a === "remove") {
      const idx = S.game.players.indexOf(p), nm = pname(p, idx);
      S.game.players.splice(idx, 1); S.game.order = S.game.order.filter(x => x !== id); openLim.delete(id);
      S.game = C.normalizeGame(S.game); S.edited = false;
      renderRoster(); structural(); live(`Removed ${nm}.`);
      const nx = $$("#lf-roster li")[Math.min(idx, S.game.players.length - 1)];
      (nx ? $("input", nx) : $("#lf-newname")).focus();
    } else if (b.dataset.a === "lock") {
      const pos = $("[data-lockpos]", li).value, from = +$("[data-lockfrom]", li).value, to = +$("[data-lockto]", li).value;
      p.locks.push({ pos, from: Math.min(from, to), to: Math.max(from, to) });
      openLim.add(id); renderRoster(); structural();
      const again = $(`li[data-pid="${id}"] [data-lockpos]`); if (again) again.focus();
    } else if (b.dataset.a === "unlock") {
      p.locks.splice(+b.dataset.k, 1); openLim.add(id); renderRoster(); structural();
    }
  });
  root.addEventListener("click", e => {
    const b = e.target.closest("button[data-a]");
    if (!b || b.closest("#lf-roster")) return;
    const a = b.dataset.a;
    if (a === "paste") {
      const items = C.parseRoster($("#lf-paste").value);
      if (!items.length) { live("Paste at least one name first."); return; }
      const r = addPlayers(items);
      $("#lf-paste").value = "";
      live(`Added ${r.added} player${r.added === 1 ? "" : "s"}${r.skipped ? `; ${r.skipped} skipped (up to ${C.MAX_PLAYERS} players)` : ""}.`);
    } else if (a === "example") {
      S.game = C.exampleGame(S.game); S.edited = false; renderRoster(); structural();
    } else if (a === "clear") {
      if (!window.confirm("Remove every player from the roster?")) return;
      S.game.players = []; S.game.order = []; S.edited = false; openLim = new Set(); renderRoster(); structural();
    } else if (a === "generate") {
      regen(); renderAll(); live(S.chart ? "Chart generated." : "Could not build a chart. See the message above the chart.");
    } else if (a === "shuffle") {
      let r, tries = 0;
      const before = JSON.stringify(S.chart);
      do { r = regen(1 + Math.floor(Math.random() * 2000000000)); tries++; } while (r.ok && JSON.stringify(S.chart) === before && tries < 4);
      renderAll(); live(S.chart ? "New chart generated." : "Could not build a chart.");
    } else if (a === "rotate") {
      const n = Math.max(1, Math.min(24, Math.round(+$("#lf-rotn").value) || 1));
      S.game.order = C.rotateOrder(S.game, n); persist(); renderOutputs(); live(`Moved the top ${n} batters to the bottom.`);
    } else if (a === "copy") copyLink();
    else if (a === "save") saveGame();
    else if (a === "backup") backup();
    else if (a === "move") {
      const id = +b.dataset.id, eff = C.effectiveOrder(S.game), i = eff.indexOf(id), j = i + (+b.dataset.dir);
      swapOrder(id, eff[j]); renderOrder(); persist(); renderOutputsLight();
      const again = $(`#lf-order li[data-id="${id}"] button[data-dir="${b.dataset.dir}"]`); if (again && !again.disabled) again.focus(); else { const li = $(`#lf-order li[data-id="${id}"] button:not([disabled])`); if (li) li.focus(); }
    } else if (a === "delgame") {
      season = season.filter(g => g.id !== b.dataset.id); store.set(SEASON_KEY, season); renderSeason(); say("#lf-seasonmsg", "Game removed from the season.", "");
    } else if (a === "restore") restorePrev();
    else if (a === "dismiss") say("#lf-banner", "");
  });

  /* ------------------------------------------------------- the chart */
  const posCount = (st) => C.POS_ORDER.filter(q => st.pos[q]).map(q => (st.pos[q] > 1 ? `${q}×${st.pos[q]}` : q)).join(" · ");
  function errorsHtml() {
    if (!S.errors.length) return "";
    return `<div class="lf-problem" role="alert"><strong>Can't build a chart yet</strong><ul>${S.errors.map(e => `<li>${esc(e.msg)}</li>`).join("")}</ul></div>`;
  }
  function renderChart() {
    const G = S.game, box = $("#lf-chartbox"), banner = $("#lf-banner");
    const keepScroll = box.scrollLeft;
    $("#lf-seedinfo").textContent = S.chart ? `Version ${G.seed}` : "";
    if (!S.chart) {
      box.innerHTML = G.players.length ? "" : `<p class="lf-empty">Add players, then the chart appears here.</p>`;
      banner.innerHTML = errorsHtml() || (G.players.length ? "" : "");
      $("#lf-hint").textContent = ""; $("#lf-issues").innerHTML = "";
      return;
    }
    const res = C.check(G, S.chart), st = res.stats, order = C.effectiveOrder(G);
    const flagged = new Set(res.issues.filter(x => x.id != null).map(x => x.id));
    let h = `<table class="lf-chart"><thead><tr><th scope="col" class="c-bat">Bat</th><th scope="col" class="c-name">Player</th>${Array.from({ length: G.innings }, (_, i) => `<th scope="col" class="c-inn">${i + 1}<span class="sr"> inning</span></th>`).join("")}</tr></thead><tbody>`;
    order.forEach((id, k) => {
      const p = byId(id), nm = pname(p), s = st[id];
      h += `<tr${flagged.has(id) ? ' class="flag"' : ""}><td class="c-bat">${k + 1}</td><th scope="row" class="c-name"><span>${esc(nm)}</span>${p.num ? `<small>#${esc(p.num)}</small>` : ""}</th>`;
      s.seq.forEach((v, i) => {
        if (!v) { h += `<td class="c-cell"><span class="lf-na" aria-label="${esc(nm)}, inning ${i + 1}: not there">–</span></td>`; return; }
        const bench = v === "B", sel = S.sel && S.sel.pid === id && S.sel.inn === i + 1;
        h += `<td class="c-cell"><button type="button" class="lf-cell ${bench ? "bench" : C.isInfield(G, v) ? "inf" : "out"}${sel ? " sel" : ""}" data-pid="${id}" data-inn="${i + 1}" aria-pressed="${sel ? "true" : "false"}" aria-label="${esc(nm)}, inning ${i + 1}, ${bench ? "bench" : esc(C.POS[v])}. Select to swap.">${bench ? "Bench" : v}</button></td>`;
      });
      h += `</tr>`;
    });
    h += `</tbody></table>`;
    box.innerHTML = h;
    box.scrollLeft = keepScroll;
    const absent = G.players.filter(p => p.absent).map(p => pname(p));
    $("#lf-hint").innerHTML = (S.sel ? `<strong>Selected:</strong> ${esc(pname(byId(S.sel.pid)))}, inning ${S.sel.inn}. Choose another player in inning ${S.sel.inn} to swap, or the same cell to cancel. ` : "Tap a cell, then another cell in the same inning, to swap those two players. ")
      + (absent.length ? `Absent: ${esc(absent.join(", "))}.` : "");
    // banner + rule check
    let b = "";
    if (stale()) b += `<div class="lf-stale" role="status">The roster or rules changed after you swapped cells, so this chart may be out of date. <button class="btn sm" type="button" data-a="generate">Rebuild chart</button> (this discards your swaps)</div>`;
    banner.innerHTML = b;
    const hard = res.issues.filter(x => x.hard), soft = res.issues.filter(x => !x.hard);
    let ih = "";
    if (hard.length) ih += `<div class="lf-problem" role="alert"><strong>Broken hard rules</strong> (locks, “never plays”, availability)<ul>${hard.map(x => `<li>${esc(x.text)}</li>`).join("")}</ul></div>`;
    if (soft.length) {
      const groups = {};
      soft.forEach(x => (groups[x.rule] = groups[x.rule] || []).push(x));
      ih += `<div class="lf-warn"><strong>${soft.length} rule${soft.length === 1 ? "" : "s"} not met</strong> (these goals could not all be met with this roster)<ul>${Object.keys(groups).map(r => `<li><b>${esc(C.RULE_NAMES[r])}:</b> ${groups[r].map(x => esc(x.text)).join(" ")}</li>`).join("")}</ul></div>`;
    }
    if (!hard.length && !soft.length) ih += `<div class="lf-ok"><strong>All rules met.</strong> Every inning is filled, nobody is in two places, and each rule you switched on holds for everyone.</div>`;
    $("#lf-issues").innerHTML = ih;
  }
  $("#lf-chartbox").addEventListener("click", e => {
    const b = e.target.closest("button.lf-cell");
    if (!b || !S.chart) return;
    const pid = +b.dataset.pid, inn = +b.dataset.inn;
    if (S.sel && S.sel.inn === inn && S.sel.pid !== pid) {
      const a = S.sel.pid, G = S.game, st0 = C.check(G, S.chart).stats;
      const lab = id => `${pname(byId(id))} (${st0[id].seq[inn - 1] === "B" ? "bench" : st0[id].seq[inn - 1]})`;
      S.chart = C.swapCells(G, S.chart, inn, a, pid); S.edited = true; S.sel = null;
      renderOutputs();
      live(`Swapped ${lab(a)} and ${lab(pid)} in inning ${inn}.`);
      const again = $(`#lf-chartbox button[data-pid="${pid}"][data-inn="${inn}"]`); if (again) again.focus();
    } else if (S.sel && S.sel.pid === pid && S.sel.inn === inn) { S.sel = null; renderChart(); const a2 = $(`#lf-chartbox button[data-pid="${pid}"][data-inn="${inn}"]`); if (a2) a2.focus(); }
    else {
      S.sel = { pid, inn }; renderChart();
      const a3 = $(`#lf-chartbox button[data-pid="${pid}"][data-inn="${inn}"]`); if (a3) a3.focus();
      live(`Selected ${pname(byId(pid))}, inning ${inn}. Choose another player in the same inning to swap.`);
    }
  });
  root.addEventListener("keydown", e => { if (e.key === "Escape" && S.sel) { S.sel = null; renderChart(); } });

  function renderSummary() {
    const t = $("#lf-sum"), G = S.game;
    if (!S.chart) { t.innerHTML = `<caption class="small muted">Per-player totals appear when a chart exists.</caption>`; return; }
    const res = C.check(G, S.chart), st = res.stats, order = C.effectiveOrder(G);
    const bad = new Map();
    res.issues.forEach(x => { if (x.id != null) bad.set(x.id, (bad.get(x.id) || []).concat(C.RULE_NAMES[x.rule] || x.rule)); });
    t.innerHTML = `<caption class="sr">Innings played, bench innings, infield innings and positions for each player</caption><thead><tr><th scope="col">Player</th><th scope="col">Played</th><th scope="col">Bench</th><th scope="col">Infield</th><th scope="col">Positions</th></tr></thead><tbody>${order.map(id => {
      const s = st[id], p = byId(id), flag = bad.has(id);
      return `<tr${flag ? ' class="flag"' : ""}><th scope="row">${esc(pname(p))}${flag ? ` <span class="lf-flag" title="${esc([...new Set(bad.get(id))].join(", "))}">!<span class="sr"> rule not met: ${esc([...new Set(bad.get(id))].join(", "))}</span></span>` : ""}</th><td>${s.played}</td><td>${s.bench}</td><td>${s.infield}</td><td>${esc(posCount(s)) || "–"}</td></tr>`;
    }).join("")}</tbody>`;
  }

  /* --------------------------------------------------------- batting order */
  function swapOrder(a, b) {
    if (a == null || b == null) return;
    const o = S.game.order, i = o.indexOf(a), j = o.indexOf(b);
    if (i < 0 || j < 0) return;
    o[i] = b; o[j] = a;
  }
  function renderOrder() {
    const G = S.game, eff = C.effectiveOrder(G), ul = $("#lf-order");
    ul.innerHTML = eff.length ? eff.map((id, k) => {
      const p = byId(id), nm = pname(p), late = p.late > 1;
      const nb = eff[k - 1] != null ? byId(eff[k - 1]) : null, na = eff[k + 1] != null ? byId(eff[k + 1]) : null;
      const canUp = nb && nb.late === p.late, canDown = na && na.late === p.late;
      return `<li data-id="${id}" draggable="true"><span class="n">${k + 1}</span><span class="nm">${esc(nm)}${p.num ? ` <small>#${esc(p.num)}</small>` : ""}${late ? ` <small>arrives inning ${p.late}, bats last</small>` : ""}</span>
        <button class="btn ghost sm" type="button" data-a="move" data-dir="-1" data-id="${id}"${canUp ? "" : " disabled"} aria-label="Move ${esc(nm)} up"><span aria-hidden="true">↑</span></button>
        <button class="btn ghost sm" type="button" data-a="move" data-dir="1" data-id="${id}"${canDown ? "" : " disabled"} aria-label="Move ${esc(nm)} down"><span aria-hidden="true">↓</span></button></li>`;
    }).join("") : `<li class="lf-empty">Add players to set a batting order.</li>`;
  }
  let dragId = null;
  $("#lf-order").addEventListener("dragstart", e => { const li = e.target.closest("li[data-id]"); if (!li) return; dragId = +li.dataset.id; e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", String(dragId)); } catch (x) { /* ignore */ } });
  $("#lf-order").addEventListener("dragover", e => { if (dragId != null && e.target.closest("li[data-id]")) e.preventDefault(); });
  $("#lf-order").addEventListener("drop", e => {
    const li = e.target.closest("li[data-id]");
    if (!li || dragId == null) return;
    e.preventDefault();
    const target = +li.dataset.id, a = byId(dragId), b = byId(target);
    if (a && b && a.late === b.late && dragId !== target) {
      const o = S.game.order.filter(x => x !== dragId), at = o.indexOf(target);
      const fromIdx = S.game.order.indexOf(dragId), toIdx = S.game.order.indexOf(target);
      o.splice(fromIdx < toIdx ? at + 1 : at, 0, dragId);
      S.game.order = o; renderOrder(); persist(); renderOutputsLight();
    }
    dragId = null;
  });

  /* ------------------------------------------------- share, season, backup */
  function shareCode() { return C.encodeShare(S.game, S.chart && !stale() ? S.chart : S.chart); }
  function renderShare() {
    const inp = $("#lf-link");
    inp.value = S.game.players.length ? C.shareUrl(shareCode()) : "";
    inp.placeholder = "Add players to get a share link";
    $("#lf-link").dataset.len = inp.value.length;
  }
  async function copyLink() {
    const inp = $("#lf-link");
    if (!inp.value) { say("#lf-pdfmsg", "Add players first, then you can copy a link.", "lf-err"); return; }
    try { await navigator.clipboard.writeText(inp.value); say("#lf-pdfmsg", "Link copied. Send it by text or email; it opens the same chart on any phone.", "lf-okmsg"); }
    catch (e) { inp.focus(); inp.select(); say("#lf-pdfmsg", "Select the link and copy it (Ctrl+C or the share menu).", ""); }
  }
  function renderSeason() {
    const rows = C.seasonTally(season), used = C.POS_ORDER.filter(q => rows.some(r => r.pos[q]));
    const t = $("#lf-season");
    t.innerHTML = rows.length ? `<caption class="sr">Season totals per player across saved games</caption><thead><tr><th scope="col">Player</th><th scope="col">Games</th><th scope="col">Innings</th><th scope="col">Bench</th><th scope="col">Infield</th><th scope="col">Positions</th></tr></thead><tbody>${rows.map(r =>
      `<tr><th scope="row">${esc(r.name)}</th><td>${r.games}</td><td>${r.innings}</td><td>${r.bench}</td><td>${r.infield}</td><td>${esc(used.filter(q => r.pos[q]).map(q => `${q}×${r.pos[q]}`).join(" · ")) || "–"}</td></tr>`).join("")}</tbody>`
      : `<caption class="small muted">No saved games yet. Finish a game's chart, then choose Save game to season.</caption>`;
    $("#lf-games").innerHTML = season.map((g, k) => `<li><span>${k + 1}. ${esc(g.label || "Game")}${g.date ? ` <small>${esc(g.date)}</small>` : ""} <small>${g.rows.length} players, ${g.innings} innings</small></span><button class="btn ghost sm" type="button" data-a="delgame" data-id="${esc(g.id)}" aria-label="Remove game ${k + 1} from the season">Remove</button></li>`).join("");
  }
  function saveGame() {
    if (!S.chart) { say("#lf-seasonmsg", "Build a chart first, then save it.", "lf-err"); return; }
    const res = C.check(S.game, S.chart);
    if (res.hard) { say("#lf-seasonmsg", "Fix the broken hard rules in the chart before saving.", "lf-err"); return; }
    season.push(C.gameRecord(S.game, S.chart, S.game.label, todayStr()));
    store.set(SEASON_KEY, season); renderSeason();
    say("#lf-seasonmsg", `Saved. Your season now has ${season.length} game${season.length === 1 ? "" : "s"}.`, "lf-okmsg");
  }
  function saveBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  function backup() {
    const data = { app: "lineupfair", v: 1, saved: todayStr(), game: S.game, chart: S.chart, season };
    saveBlob(new Blob([JSON.stringify(data)], { type: "application/json" }), `lineupfair-backup-${todayStr()}.json`);
    say("#lf-seasonmsg", "Backup saved. Import it on another device or browser to restore your roster and season.", "lf-okmsg");
  }
  $("#lf-import").addEventListener("change", async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || d.app !== "lineupfair" || !d.game) throw new Error("not a LineupFair backup");
      S.game = C.normalizeGame(d.game);
      const ok = Array.isArray(d.chart) && d.chart.length === S.game.innings && C.check(S.game, d.chart).hard === 0;
      S.chart = ok ? d.chart : null; S.edited = ok; S.sig = ok ? sig() : "";
      if (!ok) regen();
      season = (Array.isArray(d.season) ? d.season : []).map(C.cleanRecord).filter(Boolean);
      store.set(SEASON_KEY, season);
      renderSettings(); renderRoster(); renderAll();
      say("#lf-seasonmsg", `Backup loaded: ${S.game.players.length} players and ${season.length} saved game${season.length === 1 ? "" : "s"}.`, "lf-okmsg");
    } catch (err) { say("#lf-seasonmsg", "That file isn't a LineupFair backup.", "lf-err"); }
  });
  function restorePrev() {
    const p = store.get(PREV_KEY);
    if (!p || !p.game) return;
    S.game = C.normalizeGame(p.game); S.chart = Array.isArray(p.chart) ? p.chart : null; S.edited = !!p.edited; S.sig = p.sig || "";
    if (!S.chart) regen();
    try { localStorage.removeItem(PREV_KEY); } catch (e) { /* ignore */ }
    renderSettings(); renderRoster(); renderAll(); say("#lf-banner", "");
  }

  /* ------------------------------------------------------------------ PDFs */
  const scripts = {};
  function loadScript(src, ready) {
    if (ready()) return Promise.resolve(ready());
    if (!scripts[src]) scripts[src] = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = () => (ready() ? res(ready()) : rej(new Error("load")));
      s.onerror = () => { delete scripts[src]; rej(new Error("Couldn't load the PDF library. Check your connection and try again.")); };
      document.head.appendChild(s);
    });
    return scripts[src];
  }
  const jsPDF = () => loadScript("/vendor/jspdf-4.2.1.umd.min.js", () => window.jspdf && window.jspdf.jsPDF);
  async function makePdf(kind, btn) {
    const G = S.game;
    if (kind !== "blank" && kind !== "season" && !S.chart) { say("#lf-pdfmsg", "Build a chart first. The PDF is made from the chart above.", "lf-err"); return; }
    if (btn) btn.disabled = true;
    try {
      const J = await jsPDF();
      let doc, name;
      if (kind === "dugout") { doc = C.dugoutPdf(J, G, S.chart, { kind: "letter" }); name = `${slug()}-dugout-card.pdf`; }
      else if (kind === "index") { doc = C.dugoutPdf(J, G, S.chart, { kind: "index" }); name = `${slug()}-index-card.pdf`; }
      else if (kind === "field") { doc = C.fieldPdf(J, G, S.chart); name = `${slug()}-field-diagram.pdf`; }
      else if (kind === "season") { doc = C.seasonPdf(J, season, { title: "Season summary" }); name = "season-summary.pdf"; }
      else { doc = C.blankPdf(J, G, { innings: +$("#lf-binn").value, rows: +$("#lf-brows").value }); name = "blank-lineup-card.pdf"; }
      saveBlob(doc.output("blob"), name);
      say(kind === "season" ? "#lf-seasonmsg" : "#lf-pdfmsg", `Saved <b>${esc(name)}</b>. Print at 100% (Actual size) on ${kind === "index" ? "a 5 × 8 in index card or plain paper" : "US Letter, landscape"}.`, "lf-okmsg");
      if (window.va) track("pdf_download", { kind });
    } catch (e) {
      say("#lf-pdfmsg", esc(e.message || "Something went wrong making that PDF."), "lf-err");
    } finally { if (btn) btn.disabled = false; }
  }
  root.addEventListener("click", e => { const b = e.target.closest("button[data-pdf]"); if (b) makePdf(b.dataset.pdf, b); });

  /* ---------------------------------------------------------------- render */
  function syncButtons() {
    const dis = !S.chart;
    $$('[data-pdf="dugout"],[data-pdf="index"],[data-pdf="field"]').forEach(b => { b.disabled = dis; });
    $('[data-a="save"]').disabled = dis;
    $('[data-a="shuffle"]').disabled = !S.game.players.length;
  }
  function renderOutputsLight() { renderChart(); renderSummary(); renderShare(); }
  function renderOutputs() { renderChart(); renderSummary(); renderOrder(); renderShare(); syncButtons(); persist(); }
  function renderAll() { renderOutputs(); renderSeason(); }

  /* ------------------------------------------------------------------ start */
  load();
  // A shared link (#g=...) opens that chart; the visitor's own lineup is kept so they can get it back.
  const m = location.hash.match(/[#&]g=([\w-]+)/);
  let shared = null;
  if (m) {
    shared = C.decodeShare(m[1]);
    if (shared) {
      if (S.game.players.length) store.set(PREV_KEY, { game: S.game, chart: S.chart, edited: S.edited, sig: S.sig });
      const hadPrev = S.game.players.length > 0;
      S.game = shared.game;
      const ok = shared.chart && C.check(S.game, shared.chart).hard === 0;
      S.chart = ok ? shared.chart : null; S.edited = !!ok; S.sig = ok ? sig() : "";
      if (!ok) regen();
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
      shared.hadPrev = hadPrev;
    }
  } else if (!S.chart && S.game.players.length) regen();
  else if (S.chart && !S.edited && stale()) regen();
  renderSettings(); renderRoster(); renderAll();
  if (shared) {
    $("#lf-banner").insertAdjacentHTML("afterbegin", `<div class="lf-stale" role="status">Opened a shared lineup (${S.game.players.length} players, ${S.game.innings} innings). ${shared.hadPrev ? `Your own lineup is saved. <button class="btn sm ghost" type="button" data-a="restore">Go back to my lineup</button>` : ""}</div>`);
    const h = $("#lf-chart-h"); if (h && h.scrollIntoView) h.scrollIntoView();
  } else if (m) {
    $("#lf-banner").insertAdjacentHTML("afterbegin", `<div class="lf-problem" role="alert">That share link couldn't be read. It may have been cut off when it was pasted.</div>`);
  }
})();
