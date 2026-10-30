// ScoreNight UI. #sn-tool mounts the tool: data-game picks a landing page's game, data-mode="score" opens the phone scorer.
// Everything runs in the browser: the PDF is built with pdf-lib (loaded on first use) and the sheet settings and
// the game in progress are kept in this browser's localStorage. Nothing is uploaded.
(() => {
  const C = window.SNCore;
  const mount = document.getElementById("sn-tool");
  if (!C || !mount) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("sn_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("sn_" + k, JSON.stringify(v)); } catch {} },
  };
  const track = (name, data) => { try { if (window.va) window.va("event", data ? { name, data } : { name }); } catch {} };
  const fmt = n => Number(n).toLocaleString("en-US");
  const saveBlob = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };
  const loadScript = src => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load a script. Check your connection and try again."));
    document.head.appendChild(s);
  });
  const LETTER = ["US", "CA", "MX", "PH", "CL", "CO", "VE", "CR", "GT", "DO", "PR", "PA", "SV", "NI", "BZ"];
  const defaultPaper = () => { try { return LETTER.includes((new Intl.Locale(navigator.language || "en-US").maximize().region || "US").toUpperCase()) ? "letter" : "a4"; } catch { return "letter"; } };

  const fixedGame = C.GAMES[mount.dataset.game] ? mount.dataset.game : "";
  const opt = (v, t, sel) => `<option value="${v}"${sel ? " selected" : ""}>${esc(t)}</option>`;
  const field = (name, label, attrs = "") => `<div><label for="sn-${name}">${label}</label><input id="sn-${name}" name="${name}" ${attrs}></div>`;
  const select = (name, label, options) => `<div><label for="sn-${name}">${label}</label><select id="sn-${name}" name="${name}">${options}</select></div>`;
  const check = (name, label) => `<label class="sn-check"><input type="checkbox" name="${name}"> ${label}</label>`;
  const GAME_LABEL = { yahtzee: "Yahtzee (dice)", farkle: "Farkle", mexican: "Mexican Train", blank: "Any game" };

  mount.innerHTML = `
  <div class="sn-tabs" role="tablist">
    <button type="button" role="tab" data-tab="print" aria-selected="true">Print sheets</button>
    <button type="button" role="tab" data-tab="score" aria-selected="false">Keep score</button>
  </div>
  <form class="sn-form" autocomplete="off" novalidate>
    <fieldset class="sn-games"><legend>Game</legend>
      <div class="sn-chips">${Object.keys(C.GAMES).map(k => `<label class="sn-chip"><input type="radio" name="game" value="${k}"><span>${GAME_LABEL[k]}</span></label>`).join("")}</div>
    </fieldset>
    <details class="sn-sec sn-players" open>
      <summary><h3>Players</h3><span class="small muted sn-who"></span></summary>
      <div class="row">${select("players", "How many players", "")}${field("event", "Game night name (optional)", 'maxlength="40" placeholder="e.g. Friday at Mum’s"')}</div>
      <div class="sn-names"></div>
      <p class="small muted sn-hint">Leave a name blank to write it in by hand.</p>
    </details>
  </form>
  <div class="sn-pane" data-pane="print">
    <div class="sn">
      <form class="sn-form sn-opts" autocomplete="off" novalidate>
        <section class="sn-sec" data-for="yahtzee"><h3>Dice card</h3>
          <div class="row">${select("yGames", "Games on each card", [1, 2, 3, 4, 5, 6].map(n => opt(n, n === 6 ? "6 (classic)" : String(n))).join(""))}</div>
          <p class="small muted sn-hint">Upper bonus 35 at 63 or more, full house 25, small straight 30, large straight 40, 5 of a kind 50 and 100 for each extra one.</p>
        </section>
        <section class="sn-sec" data-for="farkle"><h3>Farkle rules</h3>
          <div class="row">${field("fEntry", "Points to get on the board", 'type="text" inputmode="numeric" maxlength="4"')}${field("fTarget", "Points to win", 'type="text" inputmode="numeric" maxlength="6"')}</div>
          <div class="row">${select("fOnes", "Three 1s score", opt(1000, "1,000") + opt(300, "300"))}${select("fFour", "Four or more of a kind", opt("1000", "1,000 / 2,000 / 3,000") + opt("double", "Double each extra die"))}</div>
          <div class="row">${field("fTurns", "Turns on the sheet (5 to 30)", 'type="text" inputmode="numeric" maxlength="2"')}<div class="sn-bottom">${check("fChart", "Print the scoring chart")}</div></div>
        </section>
        <section class="sn-sec" data-for="mexican"><h3>Dominoes</h3>
          ${select("mSet", "Domino set", [6, 9, 12, 15].map(n => opt(n, `Double-${n} (${n + 1} rounds)${n === 12 ? ", the usual set" : ""}`)).join(""))}
        </section>
        <section class="sn-sec" data-for="blank"><h3>Your game</h3>
          <div class="row">${field("bTitle", "Title on the sheet", 'maxlength="40" placeholder="e.g. Rummy, Hearts, Golf"')}${field("bRounds", "Rounds (3 to 30)", 'type="text" inputmode="numeric" maxlength="2"')}</div>
          ${select("bWin", "Who wins", opt("high", "Highest total") + opt("low", "Lowest total (Hearts, Golf)"))}
        </section>
        <section class="sn-sec"><h3>Paper</h3>
          <div class="row">${select("paper", "Paper size", opt("letter", "US Letter") + opt("a4", "A4"))}${select("per", "Sheets per page", "")}</div>
          <div class="row">${field("sets", "How many sets", 'type="text" inputmode="numeric" maxlength="2"')}<div class="sn-bottom">${check("large", "Large print (one per page)")}</div></div>
          <p class="small muted sn-sets"></p>
        </section>
      </form>
      <div class="sn-out">
        <div class="sn-actions"><button type="button" class="btn" data-a="pdf">Download print-ready PDF</button></div>
        <p class="sn-sum small" aria-live="polite"></p>
        <div class="sn-msg small" role="status" aria-live="polite"></div>
        <figure class="sn-page"><div class="sn-svg" role="img" aria-label="Preview of the first page"></div><figcaption class="small muted">Page 1, as it prints</figcaption></figure>
      </div>
    </div>
  </div>
  <div class="sn-pane" data-pane="score" hidden>
    <div class="sn-board" aria-live="polite"></div>
    <p class="sn-reset"><button type="button" class="btn ghost sm" data-a="new">New game</button> <span class="small muted">Scores are saved on this phone as you go. Players and rules come from the boxes above.</span></p>
  </div>`;

  const $ = s => mount.querySelector(s);
  const $$ = s => [...mount.querySelectorAll(s)];
  const forms = $$("form");
  forms.forEach(f => f.addEventListener("submit", e => e.preventDefault()));

  /* ------------------------------------------------------------ settings */
  const KEYS = Object.keys(C.DEFAULTS).filter(k => k !== "names");
  const saved = store.get("print", null) || {};
  let st = Object.assign({}, C.DEFAULTS, { paper: defaultPaper() });
  for (const k of KEYS) if (k in saved && ["string", "number", "boolean"].includes(typeof saved[k])) st[k] = saved[k];
  st.names = Array.isArray(saved.names) ? saved.names.map(n => String(n || "").slice(0, 24)) : [];
  // a new game starts on its usual layout, with enough sets to fill the page
  const startGame = g => { st.game = g; st.per = C.GAMES[g].def; st.sets = g === "yahtzee" ? 1 : st.per; };
  if (fixedGame && saved.game !== fixedGame) startGame(fixedGame);

  function namesHtml(n) {
    return Array.from({ length: n }, (_, k) => `<div><label for="sn-name${k}">Player ${k + 1}</label><input id="sn-name${k}" name="name${k}" maxlength="24" value="${esc(st.names[k] || "")}"></div>`).join("");
  }
  function writeForm() {
    const s = C.normalize(st).s, G = C.GAMES[s.game];
    $$('input[name="game"]').forEach(r => { r.checked = r.value === s.game; });
    $("#sn-players").innerHTML = Array.from({ length: G.maxP - G.minP + 1 }, (_, k) => opt(G.minP + k, String(G.minP + k), G.minP + k === s.players)).join("");
    $("#sn-per").innerHTML = G.per.map(p => opt(p, p === 1 ? "1 (full page)" : p === 2 ? (s.game === "yahtzee" ? "2 (side by side)" : "2 (top and bottom)") : "4 (quarter page)", p === s.per)).join("");
    $(".sn-names").innerHTML = namesHtml(s.players);
    for (const k of KEYS) {
      if (k === "game" || k === "players" || k === "per") continue;
      const el = forms.map(f => f.elements[k]).find(Boolean);
      if (!el) continue;
      if (el.type === "checkbox") el.checked = !!st[k]; else el.value = st[k];
    }
    $$("[data-for]").forEach(sec => { sec.hidden = sec.dataset.for !== s.game; });
  }
  function readForm() {
    const v = {};
    for (const f of forms) for (const el of f.elements) {
      if (!el.name || el.name.startsWith("name")) continue;
      if (el.type === "radio") { if (el.checked) v[el.name] = el.value; } else v[el.name] = el.type === "checkbox" ? el.checked : el.value;
    }
    const names = $$(".sn-names input").map(i => i.value);
    st = Object.assign(st, v, { names: names.concat(st.names.slice(names.length)) });
  }

  /* ------------------------------------------------------------- preview */
  let last = null, busy = false;
  function flash(html, isErr) { $(".sn-msg").innerHTML = html ? `<p class="${isErr ? "sn-err" : "sn-ok"}">${isErr ? esc(html) : html}</p>` : ""; }
  function render() {
    const L = C.layoutPages(st);
    last = L;
    const s = L.s;
    $(".sn-svg").innerHTML = C.svgPage(L.pages[0], L.g.pageW, L.g.pageH);
    const what = s.game === "yahtzee" ? `${fmt(L.cards)} ${L.cards === 1 ? "card" : "cards"} (one per player${s.sets > 1 ? ` × ${s.sets} sets` : ""})` : `${fmt(L.cards)} ${L.cards === 1 ? "sheet" : "sheets"}`;
    $(".sn-sum").innerHTML = `${what} on <b>${fmt(L.pages.length)} ${L.pages.length === 1 ? "page" : "pages"}</b>, ${s.paper === "a4" ? "A4" : "US Letter"}.`;
    $(".sn-sets").textContent = s.game === "yahtzee" ? "Each set is one card per player, so 2 sets of 4 players is 8 cards." : `Each set is one sheet for the whole table${s.per > 1 ? `; ${s.per} fit on a page` : ""}.`;
    const room = s.game !== "yahtzee" && s.per > 1 && L.cards % s.per ? `There's room for ${s.per - (L.cards % s.per)} more on the last page: set How many sets to ${L.cards + s.per - (L.cards % s.per)}.` : "";
    $(".sn-msg").innerHTML = [...L.notes, room].filter(Boolean).map(n => `<p class="sn-note">${esc(n)}</p>`).join("");
    $(".sn-who").textContent = s.names.filter(Boolean).length ? s.names.map((n, k) => n || `Player ${k + 1}`).join(", ") : `${s.players} players`;
    store.set("print", st);
    if (!$('[data-pane="score"]').hidden) board();
  }
  async function download() {
    if (busy || !last) return;
    busy = true;
    const btn = $('[data-a="pdf"]'); btn.disabled = true;
    flash("Building PDF…");
    try {
      if (!window.PDFLib) await loadScript("/vendor/pdf-lib.min.js");
      const r = await C.buildPdf(window.PDFLib, st);
      const s = last.s, name = `${s.game === "blank" ? "score" : s.game === "mexican" ? "mexican-train" : s.game}-score-sheets-${s.paper}.pdf`;
      saveBlob(new Blob([r.bytes], { type: "application/pdf" }), name);
      flash(`Saved <b>${esc(name)}</b>: ${fmt(r.cards)} ${s.game === "yahtzee" ? "card" : "sheet"}${r.cards === 1 ? "" : "s"} on ${fmt(r.pages)} ${r.pages === 1 ? "page" : "pages"}. Print at 100% / Actual size.`);
      track("pdf_download", { game: s.game, per: s.per, pages: r.pages });
    } catch (err) {
      flash("Couldn't build the PDF: " + (err && err.message ? err.message : err), true);
    } finally { busy = false; btn.disabled = false; }
  }

  /* -------------------------------------------------------- phone scorer */
  // sc = { game, y: { [player]: { cat: value } }, f: [[turn scores]], r: [[round scores]] }; players and rules come from st.
  let sc = store.get("score", null);
  const blankScore = game => ({ game, y: {}, f: [], r: [] });
  if (!sc || typeof sc !== "object" || !C.GAMES[sc.game]) sc = blankScore(st.game);
  const who = (s, p) => esc(s.names[p] || `Player ${p + 1}`);
  const num = v => (v === "" || v == null ? "" : Math.round(Number(v)));
  const cell = (key, val, bad, label) => `<input class="sn-in${bad ? " bad" : ""}" data-k="${key}" value="${esc(val ?? "")}" inputmode="numeric" maxlength="5" aria-label="${esc(label)}"${bad ? ' aria-invalid="true"' : ""}>`;
  function saveScore() { store.set("score", sc); }

  function board() {
    const s = C.normalize(st).s;
    if (sc.game !== s.game) { sc = blankScore(s.game); saveScore(); }
    const P = s.players, el = $(".sn-board");
    const head = `<tr><th></th>${Array.from({ length: P }, (_, p) => `<th scope="col">${who(s, p)}</th>`).join("")}</tr>`;
    if (s.game === "yahtzee") {
      const t = Array.from({ length: P }, (_, p) => C.yTotals(sc.y[p] || {}));
      const row = ([k, l, h]) => `<tr><th scope="row">${esc(l)}<small>${esc(h)}</small></th>${Array.from({ length: P }, (_, p) => { const v = (sc.y[p] || {})[k]; return `<td>${cell(`y.${p}.${k}`, v, !C.yValid(k, v), `${l}, ${s.names[p] || "Player " + (p + 1)}`)}</td>`; }).join("")}</tr>`;
      const sum = (l, f, strong) => `<tr class="sum${strong ? " strong" : ""}"><th scope="row">${l}</th>${t.map(x => `<td>${fmt(f(x))}</td>`).join("")}</tr>`;
      const best = Math.max(...t.map(x => x.total)), lead = t.map((x, p) => (x.total === best ? p : -1)).filter(p => p >= 0);
      const done = t.every(x => x.done);
      el.innerHTML = `<p class="sn-status">${done ? `🏆 <b>${lead.map(p => who(s, p)).join(" and ")}</b> ${lead.length > 1 ? "tie" : "wins"} with ${fmt(best)}.` : best ? `<b>${lead.map(p => who(s, p)).join(" and ")}</b> ${lead.length > 1 ? "are" : "is"} ahead with ${fmt(best)}.` : "Type each score in its box; totals and the 35-point bonus add up for you. A red box isn't a possible score."}</p>
        <div class="sn-scroll"><table class="sn-grid">${head}
        ${C.Y_UPPER.map(row).join("")}${sum("Upper subtotal", x => x.upper)}${sum("Bonus (63 or more)", x => x.bonus)}
        ${C.Y_LOWER.map(r => row(r[0] === "ybonus" ? [r[0], "Extra 5 of a kinds", "how many × 100"] : r)).join("")}${sum("Lower total", x => x.lower)}${sum("Grand total", x => x.total, true)}</table></div>`;
      return;
    }
    if (s.game === "farkle") {
      while (sc.f.length < P) sc.f.push([]);
      const turns = sc.f.slice(0, P), stt = C.farkleStatus(turns, s.fEntry, s.fTarget);
      const rounds = Math.max(1, ...turns.map(x => x.length));
      const msg = stt.done ? `🏆 <b>${stt.winners.map(p => who(s, p)).join(" and ")}</b> ${stt.winners.length > 1 ? "tie" : "wins"} with ${fmt(Math.max(...stt.totals))}.`
        : stt.finalRound ? `<b>Final round:</b> ${who(s, stt.trigger.p)} reached ${fmt(s.fTarget)}. Everyone else gets one more turn.` : `First to ${fmt(s.fTarget)} starts the final round.${s.fEntry ? ` You need ${fmt(s.fEntry)} in one turn to get on the board.` : ""}`;
      el.innerHTML = `<p class="sn-status">${msg}</p>
        ${stt.done ? "" : `<div class="sn-turn"><p><b>${who(s, stt.next)}</b>'s turn${stt.onBoard[stt.next] || !s.fEntry ? "" : " (not on the board yet)"}</p>
          <div class="sn-turnrow"><input class="sn-pts" inputmode="numeric" maxlength="5" placeholder="Points" aria-label="Points this turn"><button type="button" class="btn" data-a="add">Add</button><button type="button" class="btn ghost" data-a="farkle">Farkle (0)</button></div></div>`}
        <div class="sn-scroll"><table class="sn-grid">${head}
        ${Array.from({ length: rounds }, (_, r) => `<tr><th scope="row">Turn ${r + 1}</th>${turns.map((t, p) => `<td class="ro">${t[r] === undefined ? "" : t[r] === 0 ? "–" : fmt(t[r])}</td>`).join("")}</tr>`).join("")}
        <tr class="sum strong"><th scope="row">Total</th>${stt.totals.map(x => `<td>${fmt(x)}</td>`).join("")}</tr></table></div>
        <p><button type="button" class="btn ghost sm" data-a="undo"${turns.some(t => t.length) ? "" : " disabled"}>Undo last turn</button></p>`;
      const pts = $(".sn-pts"); if (pts) pts.addEventListener("keydown", e => { if (e.key === "Enter") addTurn(false); });
      return;
    }
    const low = s.game === "mexican" || s.bWin === "low";
    const labels = s.game === "mexican" ? C.mexRounds(s.mSet).map(d => `Double ${d}`) : Array.from({ length: s.bRounds }, (_, k) => `Round ${k + 1}`);
    while (sc.r.length < P) sc.r.push([]);
    const rs = C.roundStatus(sc.r.slice(0, P).map(x => labels.map((_, k) => x[k] ?? "")), labels.length, low);
    const best = rs.totals[rs.leaders[0]];
    el.innerHTML = `<p class="sn-status">${rs.done ? `🏆 <b>${rs.leaders.map(p => who(s, p)).join(" and ")}</b> ${rs.leaders.length > 1 ? "tie" : "wins"} with ${fmt(best)}.` : `${low ? "Lowest" : "Highest"} total wins.${rs.totals.some(Boolean) ? ` <b>${rs.leaders.map(p => who(s, p)).join(" and ")}</b> ${rs.leaders.length > 1 ? "are" : "is"} ahead.` : ""}`}</p>
      <div class="sn-scroll"><table class="sn-grid">${head}
      ${labels.map((l, k) => `<tr><th scope="row">${esc(l)}</th>${Array.from({ length: P }, (_, p) => { const v = (sc.r[p] || [])[k]; return `<td>${cell(`r.${p}.${k}`, v, v !== "" && v != null && !Number.isFinite(Number(v)), `${l}, ${s.names[p] || "Player " + (p + 1)}`)}</td>`; }).join("")}</tr>`).join("")}
      <tr class="sum strong"><th scope="row">Total</th>${rs.totals.map(x => `<td>${fmt(x)}</td>`).join("")}</tr></table></div>`;
  }
  function addTurn(farkle) {
    const s = C.normalize(st).s, stt = C.farkleStatus(sc.f.slice(0, s.players), s.fEntry, s.fTarget);
    if (stt.done || stt.next == null) return;
    const inp = $(".sn-pts"), v = farkle ? 0 : Math.round(Number(String(inp.value).replace(/[, ]/g, "")));
    if (!farkle && (!Number.isFinite(v) || v < 0 || v % 50 !== 0)) { inp.classList.add("bad"); inp.focus(); return; }
    if (!sc.f.some(t => t.length)) track("score_start", { game: "farkle" });
    sc.f[stt.next].push(v); saveScore(); board();
    const next = $(".sn-pts"); if (next) next.focus();
  }

  /* -------------------------------------------------------------- events */
  function setTab(tab) {
    $$("[data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    $$("[data-pane]").forEach(p => { p.hidden = p.dataset.pane !== tab; });
    // on the scoring tab the player list folds away so the scores sit near the top
    $(".sn-players").open = tab !== "score";
    if (tab === "score") board();
  }
  mount.addEventListener("click", e => {
    const t = e.target.closest("[data-tab]");
    if (t) { setTab(t.dataset.tab); return; }
    const a = e.target.closest("[data-a]");
    if (!a) return;
    const act = a.dataset.a;
    if (act === "pdf") download();
    else if (act === "add" || act === "farkle") addTurn(act === "farkle");
    else if (act === "undo") {
      const s = C.normalize(st).s, turns = sc.f.slice(0, s.players);
      const r = Math.max(...turns.map(x => x.length)) - 1;
      for (let p = turns.length - 1; p >= 0; p--) if (turns[p].length === r + 1) { turns[p].pop(); break; }
      saveScore(); board();
    } else if (act === "new") {
      if (!confirm("Clear the scores and start a new game? Player names stay.")) return;
      sc = blankScore(C.normalize(st).s.game); saveScore(); board();
    }
  });
  mount.addEventListener("input", e => {
    const t = e.target;
    if (t.classList.contains("sn-pts")) { t.classList.remove("bad"); return; }
    if (t.classList.contains("sn-in")) {
      const [kind, p, k] = t.dataset.k.split(".");
      const v = t.value.trim() === "" ? "" : num(t.value.replace(/[, ]/g, ""));
      const fresh = kind === "y" ? !Object.keys(sc.y).length : !sc.r.some(x => x && x.length);
      if (kind === "y") { sc.y[p] = sc.y[p] || {}; if (v === "") delete sc.y[p][k]; else sc.y[p][k] = Number.isFinite(v) ? v : t.value; }
      else { sc.r[p] = sc.r[p] || []; sc.r[p][k] = Number.isFinite(v) || v === "" ? v : t.value; }
      if (fresh && v !== "") track("score_start", { game: sc.game });
      saveScore();
      // refresh the totals without rebuilding the input the player is typing in
      const pos = t.selectionStart, key = t.dataset.k;
      board();
      const again = mount.querySelector(`[data-k="${key}"]`);
      if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch {} }
      return;
    }
    if (t.name === "game") { readForm(); startGame(st.game); writeForm(); render(); return; }
    readForm();
    if (t.name === "players") $(".sn-names").innerHTML = namesHtml(C.normalize(st).s.players);
    render();
  });
  mount.addEventListener("change", e => { if (e.target.name === "game") return; if (e.target.closest(".sn-form")) { readForm(); render(); } });

  writeForm();
  render();
  if (mount.dataset.mode === "score") setTab("score");
})();
