// CollabRate tool. Mounts into #cr-tool. data-preset (landing pages) picks a starting scenario
// and tab. Everything runs in the browser: state autosaves to localStorage, PDFs and PNGs are
// drawn locally by docs.js (loaded on demand), and nothing is uploaded.
(() => {
  "use strict";
  const mount = document.getElementById("cr-tool");
  const K = window.CRCalc;
  if (!mount || !K) return;
  const $ = s => mount.querySelector(s), $$ = s => [...mount.querySelectorAll(s)];
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("cr_" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("cr_" + k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem("cr_" + k); } catch {} },
  };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const track = name => { try { window.va && window.va("event", { name }); } catch {} };
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const slug = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40);
  const money = n => K.money(n, state.calc.currency);

  // ---------- state ----------
  function guessCurrency() {
    const l = (navigator.language || "en-US").toLowerCase();
    if (/^en-gb/.test(l)) return "GBP";
    if (/^(en-in|hi|ta|te|mr|bn|kn|ml|gu)/.test(l)) return "INR";
    if (/^en-au/.test(l)) return "AUD";
    if (/-ca$/.test(l)) return "CAD";
    if (/^(de|fr|es|it|nl|pt-pt|fi|el|sk|sl|et|lv|lt|ga|mt)\b/.test(l) || /^en-(ie|mt)/.test(l)) return "EUR";
    return "USD";
  }
  const nextNo = () => "Q-" + pad(LS.get("seq", 0) + 1, 4);
  const defaultQuote = () => ({ brand: "", contact: "", project: "", no: nextNo(), date: today(), validDays: 14, payment: "50-50", paymentCustom: "", deliveryDays: 7, rightsStart: "", notes: "", showOptions: false, paper: "auto" });
  const defaultProfile = () => ({ name: "", handle: "", niche: "", email: "", website: "" });
  const str = (v, n) => String(v == null ? "" : v).slice(0, n);
  function normQuote(q) {
    const d = defaultQuote(), i = q && typeof q === "object" ? q : {};
    return {
      brand: str(i.brand, 80), contact: str(i.contact, 80), project: str(i.project, 160), no: i.no === undefined ? d.no : str(i.no, 24),
      date: K.parseDate(i.date) ? i.date : d.date, validDays: i.validDays === undefined || i.validDays === "" || !Number.isFinite(parseInt(i.validDays, 10)) ? d.validDays : Math.max(0, Math.min(365, parseInt(i.validDays, 10))),
      payment: i.payment in K.PAYMENT_TERMS ? i.payment : d.payment, paymentCustom: str(i.paymentCustom, 160),
      deliveryDays: i.deliveryDays === undefined || i.deliveryDays === "" || !Number.isFinite(parseInt(i.deliveryDays, 10)) ? d.deliveryDays : Math.max(0, Math.min(365, parseInt(i.deliveryDays, 10))), rightsStart: K.parseDate(i.rightsStart) ? i.rightsStart : "",
      notes: str(i.notes, 1200), showOptions: !!i.showOptions, paper: ["auto", "a4", "letter"].includes(i.paper) ? i.paper : "auto",
    };
  }
  function normProfile(p) { const i = p && typeof p === "object" ? p : {}; return { name: str(i.name, 80), handle: str(i.handle, 60), niche: str(i.niche, 60), email: str(i.email, 120), website: str(i.website, 120) }; }
  function normAll(s) {
    const i = s && typeof s === "object" ? s : {};
    const calc = K.normalize(i.calc || K.defaults(guessCurrency()));
    return { calc, profile: normProfile(i.profile), quote: normQuote(i.quote), card: K.normalizeCard(i.card), tab: ["quote", "card", "email", "deals"].includes(i.tab) ? i.tab : "quote" };
  }

  const PRESETS = {
    usage: { calc: { items: [{ type: "video", qty: 2 }], usage: "90d" }, tab: "quote" },
    whitelisting: { calc: { items: [{ type: "video", qty: 3 }, { type: "hook", qty: 3 }], usage: "90d", wlMonths: 3 }, tab: "quote" },
    exclusivity: { calc: { items: [{ type: "video", qty: 3 }], usage: "30d", exMonths: 3, exScope: "competitors" }, tab: "quote" },
    ratecard: { tab: "card" },
    beginner: { calc: { level: "beginner", items: [{ type: "video", qty: 1 }] }, card: { mode: "from" }, tab: "card" },
    charge: { calc: { items: [{ type: "video", qty: 3 }, { type: "hook", qty: 3 }], usage: "30d" }, tab: "quote" },
    quote: { calc: { items: [{ type: "video", qty: 3 }, { type: "hook", qty: 6 }], usage: "30d" }, quote: { showOptions: true }, tab: "quote" },
  };
  let state = normAll(LS.get("state", null));
  const presetName = mount.dataset.preset;
  const preset = PRESETS[presetName];
  if (preset) {
    // Landing pages: keep the creator's identity, currency and base rate; load the page's scenario.
    const keep = state.calc, scen = K.defaults(keep.currency);
    const lvl = preset.calc && preset.calc.level;
    const merged = { ...scen, level: lvl || keep.level, base: lvl ? K.levelBase(lvl, keep.currency) : keep.base, ...(preset.calc || {}) };
    delete merged.usagePct; // let the preset's usage window bring its own default uplift
    state.calc = K.normalize(merged);
    if (preset.card) state.card = K.normalizeCard({ ...state.card, ...preset.card });
    if (preset.quote) state.quote = normQuote({ ...state.quote, ...preset.quote });
    state.tab = preset.tab;
  }
  let deals = (LS.get("deals", []) || []).filter(d => d && typeof d === "object" && d.id).slice(0, 500);
  let headshot = LS.get("headshot", "") || "";

  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => LS.set("state", state), 250); };

  // ---------- markup ----------
  const opt = (v, label, sel) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(label)}</option>`;
  const CUR_OPTS = Object.keys(K.CURRENCIES).map(c => opt(c, `${c} (${K.money(0, c).replace(/0/g, "").trim() || c})`)).join("");
  const USAGE_OPTS = K.USAGE_ORDER.map(id => opt(id, id === "none" ? "Organic only (no ads)" : id === "perpetual" ? "Perpetual (no end date)" : K.USAGE[id].label)).join("");
  const months = (max, zero) => Array.from({ length: max + 1 }, (_, i) => opt(String(i), i === 0 ? zero : K.plural(i, "month"))).join("");
  const ITEM_OPTS = Object.keys(K.ITEMS).map(t => opt(t, K.ITEMS[t].label)).join("");
  const PAY_OPTS = Object.keys(K.PAYMENT_TERMS).map(k => opt(k, k === "custom" ? "Custom terms…" : K.PAYMENT_TERMS[k])).join("");
  const SHOW_OPTS = Object.keys(K.CARD_ADDONS).map(k => `<label class="cr-check"><input type="checkbox" data-show="${k}"> ${esc(K.CARD_ADDONS[k])}</label>`).join("");
  const pctField = (id, label, unit) => `<div class="cr-pct"><label for="cr-${id}" class="vh">${esc(label)}</label><input id="cr-${id}" data-c="${id}" type="number" inputmode="decimal" min="0" max="1000" step="1"><span aria-hidden="true">%${unit ? " / " + unit : ""}</span></div>`;
  const profileFields = p => `
        <div class="row"><div><label for="cr-${p}-name">Your name</label><input id="cr-${p}-name" data-p="name" autocomplete="name" placeholder="Mia Lopez"></div>
        <div><label for="cr-${p}-handle">Handle</label><input id="cr-${p}-handle" data-p="handle" placeholder="@mia.makes"></div></div>
        <div class="row"><div><label for="cr-${p}-email">Email</label><input id="cr-${p}-email" data-p="email" type="email" autocomplete="email" placeholder="you@example.com"></div>
        <div><label for="cr-${p}-website">Website or portfolio</label><input id="cr-${p}-website" data-p="website" placeholder="mia.studio/ugc"></div></div>`;

  mount.innerHTML = `
  <div class="cr-top">
    <div class="cr-cur"><label for="cr-currency">Currency</label><select id="cr-currency" data-c="currency">${CUR_OPTS}</select></div>
    <fieldset class="cr-levels"><legend>Experience level <span class="muted">(sets a starting base rate)</span></legend>
      ${Object.keys(K.LEVELS).map(l => `<label class="cr-pill"><input type="radio" name="cr-level" value="${l}"><span>${esc(K.LEVELS[l].label)}</span></label>`).join("")}
    </fieldset>
  </div>
  <div class="cr-grid">
    <form class="cr-form" autocomplete="off" onsubmit="return false">
      <section class="cr-sec">
        <h3>Your base rate</h3>
        <label for="cr-base">Base rate for one UGC video</label>
        <div class="cr-money"><span class="cr-sym" aria-hidden="true"></span><input id="cr-base" data-c="base" type="number" inputmode="decimal" min="0" step="any" aria-describedby="cr-base-hint"></div>
        <p class="cr-hint" id="cr-base-hint"></p>
      </section>
      <section class="cr-sec">
        <h3>Deliverables</h3>
        <div class="cr-items" role="list"></div>
        <button type="button" class="btn ghost sm" data-a="addItem">+ Add deliverable</button>
        <div class="cr-inline"><label for="cr-discount">Package discount</label><div class="cr-pct"><input id="cr-discount" data-c="discount" type="number" inputmode="decimal" min="0" max="90" step="1"><span aria-hidden="true">%</span></div></div>
      </section>
      <section class="cr-sec">
        <h3>Usage rights</h3>
        <div class="cr-add">
          <label for="cr-usage">Paid usage <span class="muted">(brand runs your content as ads)</span></label>
          <div class="cr-ctl"><select id="cr-usage" data-c="usage">${USAGE_OPTS}</select>${pctField("usagePct", "Paid usage uplift, percent of content fee")}</div>
          <p class="cr-hint" data-hint="usage"></p>
        </div>
        <div class="cr-add">
          <label for="cr-wlMonths">Whitelisting / Spark Ads <span class="muted">(ads run from your account)</span></label>
          <div class="cr-ctl"><select id="cr-wlMonths" data-c="wlMonths">${months(12, "None")}</select>${pctField("wlPct", "Whitelisting, percent of content fee per month", "mo")}</div>
          <p class="cr-hint" data-hint="wl"></p>
        </div>
        <div class="cr-add">
          <label for="cr-exMonths">Exclusivity</label>
          <div class="cr-ctl"><select id="cr-exMonths" data-c="exMonths">${months(12, "None")}</select>
            <label for="cr-exScope" class="vh">Exclusivity scope</label><select id="cr-exScope" data-c="exScope">${opt("competitors", "Named competitors")}${opt("category", "Whole category")}</select>
            ${pctField("exPct", "Exclusivity, percent of content fee per month", "mo")}</div>
          <p class="cr-hint" data-hint="ex"></p>
        </div>
      </section>
      <section class="cr-sec">
        <h3>Extras</h3>
        <div class="cr-add cr-tog"><label class="cr-check"><input type="checkbox" id="cr-raw" data-c="raw"> Raw footage <span class="muted">(unedited clips)</span></label>${pctField("rawPct", "Raw footage, percent of content fee")}</div>
        <div class="cr-add cr-tog"><div class="cr-check"><label for="cr-revisions">Extra revision rounds</label><select id="cr-revisions" data-c="revisions">${Array.from({ length: 7 }, (_, i) => opt(String(i), String(i))).join("")}</select></div>${pctField("revPct", "Extra revision round, percent of content fee", "round")}</div>
        <div class="cr-add cr-tog"><label class="cr-check"><input type="checkbox" id="cr-rush" data-c="rush"> Rush delivery</label>${pctField("rushPct", "Rush delivery, percent of content fee")}</div>
      </section>
    </form>
    <aside class="cr-result" aria-labelledby="cr-total-label">
      <p class="cr-total-label" id="cr-total-label">Your quote</p>
      <p class="cr-total" id="cr-total"></p>
      <p class="cr-range" id="cr-range"></p>
      <div class="cr-break-wrap"><table class="cr-break" aria-label="Price breakdown"><tbody></tbody></table></div>
      <ul class="cr-warn" aria-live="polite"></ul>
      <div class="cr-actions">
        <button type="button" class="btn" data-a="goQuote">Make a brand quote</button>
        <button type="button" class="btn ghost" data-a="goCard">Make a rate card</button>
        <button type="button" class="btn ghost sm" data-a="copyBreakdown">Copy breakdown</button>
        <button type="button" class="btn ghost sm" data-a="share">Copy share link</button>
      </div>
      <p class="sr-only" aria-live="polite" id="cr-live"></p>
    </aside>
  </div>

  <div class="cr-mbar" aria-hidden="true"><span>Your quote</span><strong id="cr-mtotal"></strong><button type="button" class="btn sm" data-a="seeResult" tabindex="-1">Breakdown</button></div>
  <div class="cr-tabs" role="tablist" aria-label="Outputs" id="cr-outputs">
    <button type="button" role="tab" id="cr-t-quote" aria-controls="cr-p-quote" data-tab="quote"><span class="cr-long">Brand quote</span><span class="cr-short" aria-hidden="true">Quote</span></button>
    <button type="button" role="tab" id="cr-t-card" aria-controls="cr-p-card" data-tab="card">Rate card</button>
    <button type="button" role="tab" id="cr-t-email" aria-controls="cr-p-email" data-tab="email"><span class="cr-long">Pitch email</span><span class="cr-short" aria-hidden="true">Email</span></button>
    <button type="button" role="tab" id="cr-t-deals" aria-controls="cr-p-deals" data-tab="deals"><span class="cr-long">Saved deals</span><span class="cr-short" aria-hidden="true">Deals</span> <span class="cr-count"></span></button>
  </div>

  <div class="cr-panel" role="tabpanel" id="cr-p-quote" aria-labelledby="cr-t-quote">
    <div class="cr-out">
      <form class="cr-oform" autocomplete="off" onsubmit="return false">
        <h3>You</h3>${profileFields("q")}
        <h3>Brand</h3>
        <div class="row"><div><label for="cr-brand">Brand name</label><input id="cr-brand" data-q="brand" placeholder="Glow Co"></div>
        <div><label for="cr-contact">Contact name</label><input id="cr-contact" data-q="contact" placeholder="Sam Patel"></div></div>
        <label for="cr-project">Project or brief</label><input id="cr-project" data-q="project" placeholder="Summer SPF launch: 3 videos for paid social">
        <h3>Quote details</h3>
        <div class="row"><div><label for="cr-no">Quote number</label><input id="cr-no" data-q="no"></div>
        <div><label for="cr-date">Quote date</label><input id="cr-date" data-q="date" type="date"></div></div>
        <div class="row"><div><label for="cr-valid">Valid for (days)</label><input id="cr-valid" data-q="validDays" type="number" min="0" max="365" inputmode="numeric"></div>
        <div><label for="cr-delivery">Delivery (days after product arrives)</label><input id="cr-delivery" data-q="deliveryDays" type="number" min="0" max="365" inputmode="numeric"></div></div>
        <label for="cr-payment">Payment terms</label><select id="cr-payment" data-q="payment">${PAY_OPTS}</select>
        <div class="cr-paycustom"><label for="cr-paycustom">Your payment terms</label><input id="cr-paycustom" data-q="paymentCustom" placeholder="e.g. 30% upfront, 70% within 7 days of delivery"></div>
        <div class="row"><div><label for="cr-rstart">Rights start date <span class="muted">(optional)</span></label><input id="cr-rstart" data-q="rightsStart" type="date"></div>
        <div><label for="cr-paper">Paper size</label><select id="cr-paper" data-q="paper">${opt("auto", "Auto (by currency)")}${opt("a4", "A4")}${opt("letter", "US Letter")}</select></div></div>
        <label class="cr-check"><input type="checkbox" id="cr-options" data-q="showOptions"> Add a usage options table (organic, 30 days, 90 days, perpetual)</label>
        <label for="cr-notes">Notes for the brand <span class="muted">(optional)</span></label><textarea id="cr-notes" data-q="notes" rows="3" placeholder="e.g. Product to be shipped to my address before filming. Captions included."></textarea>
        <div class="cr-btns">
          <button type="button" class="btn" data-a="quotePdf">Download quote PDF</button>
          <button type="button" class="btn ghost" data-a="saveDeal">Save to deals</button>
          <button type="button" class="btn ghost sm" data-a="newQuote">New quote</button>
        </div>
        <p class="small muted">A quote, not an invoice. The negotiation range stays private: the PDF shows only your prices.</p>
      </form>
      <div class="cr-prev"><div class="cr-pages" id="cr-qprev" aria-live="off"><p class="cr-loading">Preparing preview…</p></div></div>
    </div>
  </div>

  <div class="cr-panel" role="tabpanel" id="cr-p-card" aria-labelledby="cr-t-card" hidden>
    <div class="cr-out">
      <form class="cr-oform" autocomplete="off" onsubmit="return false">
        <h3>Design</h3>
        <fieldset class="cr-seg"><legend>Template</legend>
          ${[["studio", "Studio"], ["bold", "Bold"], ["soft", "Soft"]].map(([v, l]) => `<label class="cr-pill"><input type="radio" name="cr-tpl" value="${v}"><span>${l}</span></label>`).join("")}
        </fieldset>
        <fieldset class="cr-seg"><legend>Prices</legend>
          ${[["prices", "Show prices"], ["from", "“From” prices"], ["request", "On request"]].map(([v, l]) => `<label class="cr-pill"><input type="radio" name="cr-mode" value="${v}"><span>${l}</span></label>`).join("")}
        </fieldset>
        <fieldset class="cr-seg"><legend>Add-ons shown as</legend>
          ${[["pct", "% of fee"], ["amount", "Price per video"]].map(([v, l]) => `<label class="cr-pill"><input type="radio" name="cr-amode" value="${v}"><span>${l}</span></label>`).join("")}
        </fieldset>
        <div class="row"><div><label for="cr-accent">Brand colour <span class="muted">(card and quote)</span></label><input id="cr-accent" data-card="accent" type="color"></div>
        <div><label for="cr-title">Card title</label><input id="cr-title" data-card="title" maxlength="40"></div></div>
        <h3>You</h3>${profileFields("c")}
        <label for="cr-niche">Niche or content style</label><input id="cr-niche" data-p="niche" placeholder="Skincare · Wellness · Talking-head UGC">
        <label for="cr-photo">Headshot <span class="muted">(optional, stays on this device)</span></label>
        <div class="cr-photo"><input id="cr-photo" type="file" accept="image/*"><button type="button" class="btn ghost sm" data-a="rmPhoto">Remove photo</button></div>
        <h3>Packages</h3>
        <div class="cr-pk-head small muted" aria-hidden="true"><span>Name</span><span>Videos</span><span>Discount %</span></div>
        <div class="cr-packages"></div>
        <h3>Add-ons on the card</h3>
        <div class="cr-showgrid">${SHOW_OPTS}</div>
        <label for="cr-included">Every video includes <span class="muted">(one per line)</span></label><textarea id="cr-included" data-card="included" rows="4"></textarea>
        <label for="cr-note">Footer note</label><input id="cr-note" data-card="note" maxlength="160">
        <div class="cr-btns">
          <button type="button" class="btn" data-a="cardPng">Download PNG</button>
          <button type="button" class="btn ghost" data-a="cardPdf">Download PDF</button>
        </div>
        <p class="small muted">PNG is 1080 × 1350 px (portrait, sized for Instagram and media kits). PDF is a single 8 × 10 in page.</p>
      </form>
      <div class="cr-prev"><canvas id="cr-cprev" class="cr-card-canvas" role="img" aria-label="Rate card preview"></canvas><p class="cr-fit small" id="cr-cfit" aria-live="polite"></p></div>
    </div>
  </div>

  <div class="cr-panel" role="tabpanel" id="cr-p-email" aria-labelledby="cr-t-email" hidden>
    <div class="cr-email">
      <p class="small muted">Built from your calculation and the brand quote details. Edit it here or after pasting.</p>
      <label for="cr-subject">Subject</label><input id="cr-subject">
      <label for="cr-body">Email</label><textarea id="cr-body" rows="16"></textarea>
      <div class="cr-btns">
        <button type="button" class="btn" data-a="copyEmail">Copy email</button>
        <button type="button" class="btn ghost" data-a="copySubject">Copy subject</button>
        <button type="button" class="btn ghost" data-a="regenEmail">Rebuild from quote</button>
      </div>
    </div>
  </div>

  <div class="cr-panel" role="tabpanel" id="cr-p-deals" aria-labelledby="cr-t-deals" hidden>
    <div class="cr-deals-bar">
      <button type="button" class="btn ghost sm" data-a="csv">Export CSV</button>
      <button type="button" class="btn ghost sm" data-a="ics">Calendar reminders (.ics)</button>
    </div>
    <p class="small muted">Saved quotes live in this browser only. Add a rights start date to get reminders for when paid usage, whitelisting and exclusivity end.</p>
    <div class="cr-deals"></div>
  </div>`;

  // ---------- form sync ----------
  const calcInputs = $$("[data-c]");
  function syncCalcForm() {
    const s = state.calc;
    calcInputs.forEach(el => {
      const k = el.dataset.c, v = s[k];
      if (el.type === "checkbox") el.checked = !!v; else if (document.activeElement !== el) el.value = v == null ? "" : String(v);
    });
    $$('input[name="cr-level"]').forEach(r => { r.checked = r.value === s.level; });
    renderItems();
  }
  function renderItems() {
    const s = state.calc;
    $(".cr-items").innerHTML = `<div class="cr-ihead" aria-hidden="true"><span>Deliverable</span><span>Qty</span><span>Unit price</span><span></span></div>` + s.items.map((it, i) => {
      const auto = it.type === "custom" ? "" : String(Math.round(s.base * K.ITEMS[it.type].factor));
      return `<div class="cr-item" role="listitem" data-i="${i}">
        <label class="vh" for="cr-it-${i}">Deliverable ${i + 1} type</label><select id="cr-it-${i}" data-k="type">${ITEM_OPTS.replace(`value="${it.type}"`, `value="${it.type}" selected`)}</select>
        <span class="cr-f"><span class="cr-mini" aria-hidden="true">Qty</span><label class="vh" for="cr-iq-${i}">Deliverable ${i + 1} quantity</label><input id="cr-iq-${i}" data-k="qty" type="number" inputmode="numeric" min="0" max="999" value="${it.qty}"></span>
        <span class="cr-f"><span class="cr-mini" aria-hidden="true">Price</span><label class="vh" for="cr-ip-${i}">Deliverable ${i + 1} unit price${it.type === "custom" ? "" : " (blank uses the automatic price)"}</label><input id="cr-ip-${i}" data-k="price" type="number" inputmode="decimal" min="0" step="any" value="${it.price == null ? "" : it.price}" placeholder="${esc(auto)}"></span>
        <button type="button" class="cr-x" data-a="rmItem" aria-label="Remove deliverable ${i + 1}">×</button>
        ${it.type === "custom" ? `<label class="vh" for="cr-il-${i}">Deliverable ${i + 1} name</label><input class="cr-ilabel" id="cr-il-${i}" data-k="label" maxlength="80" value="${esc(it.label)}" placeholder="Item name, e.g. Story frames">` : ""}
      </div>`;
    }).join("");
  }
  function syncOther() {
    $$("[data-p]").forEach(el => { if (document.activeElement !== el) el.value = state.profile[el.dataset.p] || ""; });
    $$("[data-q]").forEach(el => { const v = state.quote[el.dataset.q]; if (el.type === "checkbox") el.checked = !!v; else if (document.activeElement !== el) el.value = v == null ? "" : String(v); });
    $(".cr-paycustom").hidden = state.quote.payment !== "custom";
    const c = state.card;
    $$("[data-card]").forEach(el => { if (document.activeElement !== el) el.value = c[el.dataset.card] || ""; });
    $$('input[name="cr-tpl"]').forEach(r => { r.checked = r.value === c.template; });
    $$('input[name="cr-mode"]').forEach(r => { r.checked = r.value === c.mode; });
    $$('input[name="cr-amode"]').forEach(r => { r.checked = r.value === c.addonMode; });
    $$("[data-show]").forEach(el => { el.checked = !!c.show[el.dataset.show]; });
    renderPackages();
  }
  function renderPackages() {
    const pk = state.card.packages;
    $(".cr-packages").innerHTML = pk.map((p, i) => `<div class="cr-pk" data-i="${i}">
      <label class="vh" for="cr-pkl-${i}">Package ${i + 1} name</label><input id="cr-pkl-${i}" data-k="label" maxlength="40" value="${esc(p.label)}" placeholder="${esc(K.plural(p.qty, "video"))}">
      <label class="vh" for="cr-pkq-${i}">Package ${i + 1} number of videos</label><input id="cr-pkq-${i}" data-k="qty" type="number" min="0" max="99" inputmode="numeric" value="${p.qty}">
      <label class="vh" for="cr-pkd-${i}">Package ${i + 1} discount percent</label><input id="cr-pkd-${i}" data-k="disc" type="number" min="0" max="90" inputmode="decimal" value="${p.disc}">
      <button type="button" class="cr-x" data-a="rmPk" aria-label="Remove package ${i + 1}">×</button></div>`).join("") +
      (pk.length < 4 ? `<button type="button" class="btn ghost sm" data-a="addPk">+ Add package</button>` : "");
  }

  // ---------- results ----------
  let calculatedOnce = false, liveT;
  function renderResult() {
    const c = K.compute(state.calc), s = c.state;
    state.calc = s;
    const sym = K.money(0, s.currency).replace(/[\d\s.,]/g, "") || s.currency;
    $(".cr-sym").textContent = sym;
    const L = K.LEVELS[s.level];
    const [lo, hi] = K.levelRange(s.level in K.LEVELS ? s.level : "building", s.currency);
    $("#cr-base-hint").innerHTML = `One edited video up to 60 seconds, organic use only, one round of revisions. ${L ? `Starting point for ${esc(L.label.toLowerCase())} creators (${esc(L.hint)}): ${esc(K.money(lo, s.currency))}–${esc(K.money(hi, s.currency))}.` : "You've set your own base rate."}${s.currency !== "USD" ? " Presets outside USD are rough conversions; adjust to your market." : ""}`;
    const U = K.USAGE[s.usage];
    $('[data-hint="usage"]').textContent = s.usage === "none" ? "Organic posting on the brand's own channels is included in the base rate." : `Typical ${U.range[0]}–${U.range[1]}% of the content fee. Change the % to use your own number.`;
    $('[data-hint="wl"]').textContent = `Typical ${K.ADDONS.whitelist.range[0]}–${K.ADDONS.whitelist.range[1]}% of the content fee for each month.`;
    const EX = K.ADDONS[s.exScope];
    $('[data-hint="ex"]').textContent = `Typical ${EX.range[0]}–${EX.range[1]}% per month for ${s.exScope === "category" ? "a whole category" : "named competitors"}.`;
    $("#cr-usagePct").disabled = s.usage === "none";
    $("#cr-wlPct").disabled = !s.wlMonths; $("#cr-exPct").disabled = !s.exMonths; $("#cr-exScope").disabled = !s.exMonths;
    $("#cr-rawPct").disabled = !s.raw; $("#cr-revPct").disabled = !s.revisions; $("#cr-rushPct").disabled = !s.rush;

    $("#cr-total").textContent = money(c.total);
    $("#cr-mtotal").textContent = money(c.total);
    $("#cr-range").innerHTML = c.addons.length
      ? `Typical range with these add-ons: <strong>${esc(money(c.low))}–${esc(money(c.high))}</strong>. Quote near the top if the brand wants more, and keep the low end as your floor.`
      : "No usage rights or extras yet: this is your content fee. Add paid usage, whitelisting or extras if the brief asks for them.";
    const row = (label, sub, amt, cls = "") => `<tr${cls ? ` class="${cls}"` : ""}><th scope="row">${esc(label)}${sub ? `<span>${esc(sub)}</span>` : ""}</th><td>${esc(amt)}</td></tr>`;
    let h = c.lines.map(l => row(`${l.qty} × ${l.label}`, `${money(l.unit)} each`, money(l.amount))).join("");
    if (c.discountAmt) h += row(`Package discount (${K.fmtPct(c.discountPct)})`, "", "−" + money(c.discountAmt));
    if (c.addons.length) h += row("Content fee", "", money(c.content), "sub") + c.addons.map(a => row(a.label, a.detail + (a.custom ? " (your %)" : ""), money(a.amount))).join("");
    h += row(`Total (${s.currency})`, "", money(c.total), "total");
    $(".cr-break tbody").innerHTML = h;
    $(".cr-warn").innerHTML = c.warnings.map(w => `<li>${esc(w)}</li>`).join("");
    // Item placeholders show the automatic unit price.
    $$(".cr-item").forEach(r => { const it = s.items[+r.dataset.i]; const inp = r.querySelector('[data-k="price"]'); if (it && inp && it.type !== "custom") inp.placeholder = String(Math.round(s.base * K.ITEMS[it.type].factor)); });
    clearTimeout(liveT); liveT = setTimeout(() => { $("#cr-live").textContent = `Total ${money(c.total)}`; }, 600);
    return c;
  }

  function update(opts = {}) {
    const c = renderResult();
    if (opts.items) renderItems();
    save();
    schedulePreview();
    if (state.tab === "email" && !emailDirty) fillEmail();
    if (opts.user && !calculatedOnce && c.total > 0) { calculatedOnce = true; track("rate_calculated"); }
    return c;
  }

  // ---------- events: calculator ----------
  const form = $(".cr-form");
  const inCalc = t => !!t.closest(".cr-form, .cr-top");
  mount.addEventListener("input", e => {
    const t = e.target, s = state.calc;
    if (!inCalc(t)) return;
    const row = t.closest(".cr-item");
    if (row) {
      const it = s.items[+row.dataset.i], k = t.dataset.k;
      if (!it) return;
      if (k === "type") { it.type = t.value; it.price = t.value === "custom" ? (it.price == null ? 0 : it.price) : null; state.calc = K.normalize(s); update({ user: true, items: true }); return; }
      if (k === "qty") { if (t.value === "") return; it.qty = +t.value; }
      else if (k === "price") it.price = t.value === "" ? (it.type === "custom" ? 0 : null) : +t.value;
      else if (k === "label") it.label = t.value;
      state.calc = K.normalize(s);
      update({ user: true });
      return;
    }
    if (t.name === "cr-level") { s.level = t.value; s.base = K.levelBase(t.value, s.currency); state.calc = K.normalize(s); syncCalcForm(); update({ user: true }); return; }
    const k = t.dataset.c; if (!k) return;
    if (k === "currency") {
      const from = K.CURRENCIES[s.currency], to = K.CURRENCIES[t.value];
      if (from === to) return;
      if (s.level in K.LEVELS) s.base = K.levelBase(s.level, t.value); else s.base = K.niceRound(s.base * to.fx / from.fx, to.step);
      s.items.forEach(it => { if (it.price != null) it.price = Math.max(0, Math.round(it.price * to.fx / from.fx)); });
      s.currency = t.value;
      state.calc = K.normalize(s); syncCalcForm(); update({ user: true });
      status(`Switched to ${t.value}. Preset amounts are rough conversions, so check your base rate against your local market.`);
      return;
    }
    if (t.type === "checkbox") s[k] = t.checked;
    else if (t.type === "number") {
      if (t.value === "" || !Number.isFinite(+t.value)) return; // keep the last good value while the field is being edited
      s[k] = +t.value;
      if (k === "base") { s.level = Object.keys(K.LEVELS).find(l => K.levelBase(l, s.currency) === s.base) || "custom"; $$('input[name="cr-level"]').forEach(r => { r.checked = r.value === s.level; }); }
    }
    else if (k === "usage") { s.usage = t.value; s.usagePct = K.USAGE[t.value].pct; $("#cr-usagePct").value = s.usagePct; }
    else if (k === "exScope") { s.exScope = t.value; s.exPct = K.ADDONS[t.value].pct; $("#cr-exPct").value = s.exPct; }
    else s[k] = t.value;
    state.calc = K.normalize(s);
    update({ user: true });
  });
  // When a number field is left empty or invalid, show the value actually used.
  mount.addEventListener("change", e => {
    const t = e.target;
    if (!inCalc(t) || t.type !== "number") return;
    const row = t.closest(".cr-item");
    if (row) { const it = state.calc.items[+row.dataset.i]; if (it && t.dataset.k === "qty" && t.value === "") t.value = it.qty; return; }
    if (t.dataset.c && (t.value === "" || +t.value !== state.calc[t.dataset.c])) t.value = state.calc[t.dataset.c];
  });

  // ---------- events: outputs ----------
  mount.addEventListener("input", e => {
    const t = e.target;
    if (inCalc(t)) return;
    if (t.dataset.p) { state.profile[t.dataset.p] = t.value; $$(`[data-p="${t.dataset.p}"]`).forEach(o => { if (o !== t) o.value = t.value; }); }
    else if (t.dataset.q) { state.quote[t.dataset.q] = t.type === "checkbox" ? t.checked : t.value; if (t.dataset.q === "payment") $(".cr-paycustom").hidden = t.value !== "custom"; state.quote = normQuote(state.quote); }
    else if (t.dataset.card) { state.card[t.dataset.card] = t.value; state.card = K.normalizeCard(state.card); }
    else if (t.dataset.show) { state.card.show[t.dataset.show] = t.checked; }
    else if (t.name === "cr-tpl") state.card.template = t.value;
    else if (t.name === "cr-mode") state.card.mode = t.value;
    else if (t.name === "cr-amode") state.card.addonMode = t.value;
    else if (t.closest(".cr-pk")) {
      const p = state.card.packages[+t.closest(".cr-pk").dataset.i], k = t.dataset.k;
      p[k] = k === "label" ? t.value : t.value === "" ? 0 : +t.value;
      state.card = K.normalizeCard(state.card);
    } else if (t.closest(".cr-deal")) { dealInput(t); return; }
    else if (t.id === "cr-subject" || t.id === "cr-body") { emailDirty = true; return; }
    else return;
    save(); schedulePreview();
  });
  mount.addEventListener("change", e => {
    const t = e.target;
    if (inCalc(t)) return;
    if (t.id === "cr-photo") return onPhoto(t);
    if (t.closest(".cr-deal")) return dealInput(t, true);
  });

  mount.addEventListener("click", async e => {
    const btn = e.target.closest("[data-a],[data-tab]");
    if (!btn) return;
    if (btn.dataset.tab) return selectTab(btn.dataset.tab, true);
    const a = btn.dataset.a, s = state.calc;
    if (a === "addItem") { s.items.push({ type: s.items.some(i => i.type === "video") ? "hook" : "video", qty: 1, price: null, label: "" }); state.calc = K.normalize(s); update({ user: true, items: true }); focusLast(".cr-item select"); }
    else if (a === "rmItem") { s.items.splice(+btn.closest(".cr-item").dataset.i, 1); if (!s.items.length) s.items.push({ type: "video", qty: 1, price: null, label: "" }); state.calc = K.normalize(s); update({ user: true, items: true }); }
    else if (a === "addPk") { const last = state.card.packages[state.card.packages.length - 1]; state.card.packages.push({ label: "", qty: last ? last.qty + 2 : 1, disc: last ? Math.min(90, last.disc + 5) : 0 }); state.card = K.normalizeCard(state.card); renderPackages(); save(); schedulePreview(); focusLast(".cr-pk input"); }
    else if (a === "rmPk") { state.card.packages.splice(+btn.closest(".cr-pk").dataset.i, 1); renderPackages(); save(); schedulePreview(); }
    else if (a === "goQuote" || a === "goCard") { selectTab(a === "goQuote" ? "quote" : "card", false); $("#cr-outputs").scrollIntoView({ behavior: "smooth", block: "start" }); $(`#cr-t-${state.tab}`).focus({ preventScroll: true }); }
    else if (a === "seeResult") $(".cr-result").scrollIntoView({ behavior: "smooth", block: "start" });
    else if (a === "copyBreakdown") copy(breakdownText(), "Breakdown copied.");
    else if (a === "share") shareLink();
    else if (a === "quotePdf") exportQuote(btn);
    else if (a === "saveDeal") saveDeal();
    else if (a === "newQuote") { state.quote = normQuote({ ...defaultQuote(), payment: state.quote.payment, paymentCustom: state.quote.paymentCustom, deliveryDays: state.quote.deliveryDays, validDays: state.quote.validDays, paper: state.quote.paper }); syncOther(); save(); schedulePreview(); emailDirty = false; status("New quote started. Your calculation is unchanged."); $("#cr-brand").focus(); }
    else if (a === "cardPng" || a === "cardPdf") exportCard(btn, a === "cardPng" ? "png" : "pdf");
    else if (a === "rmPhoto") { headshot = ""; LS.del("headshot"); $("#cr-photo").value = ""; schedulePreview(); }
    else if (a === "copyEmail") { copy($("#cr-body").value, "Email copied. Paste it into your email app."); track("email_copied"); }
    else if (a === "copySubject") copy($("#cr-subject").value, "Subject copied.");
    else if (a === "regenEmail") { emailDirty = false; fillEmail(); status("Email rebuilt from the current quote."); }
    else if (a === "csv") { if (!deals.length) return status("Save a quote to deals first."); download(new Blob(["﻿" + K.dealsCSV(deals)], { type: "text/csv;charset=utf-8" }), "brand-deals.csv"); track("deals_csv"); }
    else if (a === "ics") exportICS();
    else if (a === "openDeal") openDeal(btn.closest(".cr-deal").dataset.id);
    else if (a === "dealPdf") exportQuote(btn, deals.find(d => d.id === btn.closest(".cr-deal").dataset.id));
    else if (a === "rmDeal") { const id = btn.closest(".cr-deal").dataset.id, d = deals.find(x => x.id === id); if (d && confirm(`Delete the saved quote ${d.no || ""} for ${d.brand || "this brand"}?`)) { deals = deals.filter(x => x.id !== id); LS.set("deals", deals); renderDeals(); } }
  });
  const focusLast = sel => { const l = $$(sel); if (l.length) l[l.length - 1].focus(); };

  // ---------- tabs ----------
  const TABS = ["quote", "card", "email", "deals"];
  function selectTab(tab, user) {
    state.tab = tab;
    TABS.forEach(t => {
      const b = $(`#cr-t-${t}`), on = t === tab;
      b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
      $(`#cr-p-${t}`).hidden = !on;
    });
    if (tab === "email" && !emailDirty) fillEmail();
    if (tab === "deals") renderDeals();
    save();
    if (user || outputsSeen) schedulePreview(true);
  }
  $(".cr-tabs").addEventListener("keydown", e => {
    const i = TABS.indexOf(state.tab);
    let n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : null;
    if (n === null) return;
    e.preventDefault(); n = (n + TABS.length) % TABS.length;
    selectTab(TABS[n], true); $(`#cr-t-${TABS[n]}`).focus();
  });

  // ---------- previews (docs.js + fonts load only once the outputs are on screen) ----------
  let docsP = null, outputsSeen = false, prevT, prevToken = 0;
  function docs() {
    if (window.CRDocs) return Promise.resolve(window.CRDocs);
    if (docsP) return docsP;
    docsP = new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = "/docs.js"; sc.async = true;
      sc.onload = () => res(window.CRDocs);
      sc.onerror = () => { docsP = null; rej(new Error("Couldn't load the document builder. Check your connection and try again.")); };
      document.head.appendChild(sc);
    });
    return docsP;
  }
  const docData = () => ({ calc: state.calc, quote: { ...state.quote, paper: state.quote.paper }, profile: state.profile, card: state.card, accent: state.card.accent, headshot });
  function schedulePreview(now) {
    if (!outputsSeen) return;
    clearTimeout(prevT);
    prevT = setTimeout(renderPreview, now ? 0 : 220);
  }
  async function renderPreview() {
    const token = ++prevToken, tab = state.tab;
    if (tab !== "quote" && tab !== "card") return;
    try {
      const D = await docs();
      if (token !== prevToken) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (tab === "quote") {
        const box = $("#cr-qprev"), tmp = document.createElement("div");
        const n = await D.renderQuote(tmp, docData(), Math.max(1.25, dpr * 1.1));
        if (token !== prevToken) return;
        box.replaceChildren(...tmp.childNodes);
        box.dataset.pages = String(n);
      } else {
        const r = await D.renderCard($("#cr-cprev"), docData(), Math.max(0.5, Math.min(1, dpr * 0.5)));
        $("#cr-cfit").textContent = r && r.dropped ? `${K.plural(r.dropped, "line")} didn't fit on the card and ${r.dropped === 1 ? "was" : "were"} left off. Untick an add-on or shorten the “includes” list.` : "";
      }
    } catch (err) { status(err.message || "Preview failed."); }
  }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { outputsSeen = true; io.disconnect(); schedulePreview(true); } }, { rootMargin: "200px" });
    io.observe($("#cr-outputs"));
  } else { outputsSeen = true; }

  // ---------- exports ----------
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function busy(btn, fn) {
    const label = btn.textContent; btn.disabled = true; btn.textContent = "Preparing…";
    try { await fn(); } catch (err) { status(err.message || "Something went wrong. Please try again."); } finally { btn.disabled = false; btn.textContent = label; }
  }
  function bumpSeq(no) { const n = parseInt(String(no || "").replace(/\D/g, ""), 10); if (n > LS.get("seq", 0) && n < 1e7) LS.set("seq", n); }
  function exportQuote(btn, deal) {
    return busy(btn, async () => {
      const D = await docs();
      const data = deal ? { ...docData(), calc: deal.calc, quote: deal.quote } : docData();
      if (!deal && K.compute(data.calc).total <= 0) throw new Error("Add at least one deliverable with a price before downloading the quote.");
      const blob = await D.quotePDF(data);
      const q = data.quote;
      download(blob, `quote-${slug(q.no) || "ugc"}${q.brand ? "-" + slug(q.brand) : ""}.pdf`);
      if (!deal) { bumpSeq(q.no); upsertDeal(false); }
      status(deal ? "Quote PDF downloaded." : state.profile.name.trim() ? "Quote PDF downloaded and saved to your deals." : "Quote PDF downloaded and saved. Tip: add your name under “You” so the brand knows who it's from.");
      track("quote_exported");
    });
  }
  function exportCard(btn, fmt) {
    if (!state.profile.name.trim()) { status("Add your name under “You” first, so brands know whose card it is."); $("#cr-c-name").focus(); return; }
    return busy(btn, async () => {
      const D = await docs(), data = docData();
      const blob = fmt === "png" ? await D.cardPNG(data) : await D.cardPDF(data);
      download(blob, `ugc-rate-card${state.profile.name ? "-" + slug(state.profile.name) : ""}.${fmt}`);
      status(fmt === "png" ? "Rate card PNG downloaded (1080 × 1350 px)." : "Rate card PDF downloaded.");
      track("card_exported");
    });
  }

  // ---------- photo ----------
  function onPhoto(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { status("Choose an image file (JPG, PNG or WebP)."); input.value = ""; return; }
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const n = 400, c = document.createElement("canvas"); c.width = c.height = n;
      const s = Math.min(im.naturalWidth, im.naturalHeight), x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, n, n);
      x.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, n, n);
      headshot = c.toDataURL("image/jpeg", 0.86);
      URL.revokeObjectURL(url);
      if (!LS.set("headshot", headshot)) status("Photo added for this session only (browser storage is full).");
      schedulePreview(true);
    };
    im.onerror = () => { URL.revokeObjectURL(url); status("That image couldn't be read. Try a JPG or PNG."); input.value = ""; };
    im.src = url;
  }

  // ---------- text outputs ----------
  function breakdownText() {
    const c = K.compute(state.calc), L = [`UGC quote breakdown (${c.currency})`];
    c.lines.forEach(l => L.push(`${l.qty} × ${l.label} (${money(l.unit)} each): ${money(l.amount)}`));
    if (c.discountAmt) L.push(`Package discount (${K.fmtPct(c.discountPct)}): −${money(c.discountAmt)}`);
    if (c.addons.length) { L.push(`Content fee: ${money(c.content)}`); c.addons.forEach(a => L.push(`${a.label} (${a.detail}): ${money(a.amount)}`)); }
    L.push(`Total: ${money(c.total)}`);
    if (c.addons.length) L.push(`Typical range with these add-ons: ${money(c.low)}–${money(c.high)}`);
    L.push("", `Calculated with CollabRate · ${K.DOMAIN}`);
    return L.join("\n");
  }
  let emailDirty = false;
  function fillEmail() {
    const e = K.pitchEmail(K.compute(state.calc), state.profile, state.quote);
    $("#cr-subject").value = e.subject; $("#cr-body").value = e.body;
  }
  async function copy(text, msg) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); try { ok = document.execCommand("copy"); } catch {} ta.remove();
    }
    status(ok ? msg : "Couldn't copy automatically. Select the text and copy it yourself.");
    return ok;
  }
  let statusT;
  const toast = document.createElement("div");
  toast.className = "cr-toast"; toast.setAttribute("role", "status"); toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);
  function status(msg) { toast.textContent = msg; toast.classList.add("on"); clearTimeout(statusT); statusT = setTimeout(() => { toast.classList.remove("on"); }, 6000); }

  // ---------- share links (text only) ----------
  async function shareLink() {
    const p = { ...state.profile };
    const code = await K.encodeShare({ v: 1, calc: state.calc, card: state.card, profile: p });
    const url = `${location.origin}${location.pathname}#s=${code}`;
    if (await copy(url, "Share link copied. It holds your numbers and text, never your photo.")) track("share_link");
    else prompt("Copy this link:", url);
  }
  async function loadShared() {
    const m = /[#&]s=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return false;
    const v = await K.decodeShare(m[1]);
    history.replaceState(null, "", location.pathname + location.search);
    if (!v) { status("That share link is incomplete or damaged."); return false; }
    if (v.calc) state.calc = K.normalize(v.calc);
    if (v.card) state.card = K.normalizeCard(v.card);
    if (v.profile) state.profile = normProfile(v.profile);
    status("Loaded a shared calculation. Your own photo and saved deals are untouched.");
    return true;
  }

  // ---------- deals ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function upsertDeal(announce) {
    const q = state.quote, c = K.compute(state.calc);
    const existing = q.no ? deals.find(d => d.no === q.no) : null;
    const base = { no: q.no, brand: q.brand, project: q.project, date: q.date, total: c.total, currency: c.currency, calc: structuredClone(state.calc), quote: structuredClone(q), savedAt: Date.now() };
    if (existing) Object.assign(existing, base, { rightsStart: existing.rightsStart || q.rightsStart });
    else deals.unshift({ id: uid(), status: "Quoted", rightsStart: q.rightsStart, deliveryDue: "", paymentDue: "", ...base });
    if (!LS.set("deals", deals)) status("Browser storage is full, so this deal couldn't be saved.");
    bumpSeq(q.no);
    renderDealCount();
    if (announce) status(existing ? `Updated ${q.no} in your deals.` : `Saved ${q.no || "the quote"} to your deals.`);
    if (state.tab === "deals") renderDeals();
  }
  function saveDeal() {
    if (K.compute(state.calc).total <= 0) return status("Add at least one deliverable with a price first.");
    upsertDeal(true); track("deal_saved");
  }
  function renderDealCount() { $(".cr-count").textContent = deals.length ? `(${deals.length})` : ""; }
  function renderDeals() {
    renderDealCount();
    const box = $(".cr-deals");
    if (!deals.length) { box.innerHTML = `<p class="cr-empty">No saved quotes yet. Fill in the brand quote and click <strong>Save to deals</strong> or <strong>Download quote PDF</strong>.</p>`; return; }
    box.innerHTML = deals.map(d => {
      const c = K.compute(d.calc), dt = K.dealDates(d), id = esc(d.id);
      const ends = [dt.usageEnd && `Paid usage ends ${K.fmtDate(dt.usageEnd)}`, dt.whitelistEnd && `Whitelisting ends ${K.fmtDate(dt.whitelistEnd)}`, dt.exclusivityEnd && `Exclusivity ends ${K.fmtDate(dt.exclusivityEnd)}`].filter(Boolean);
      const usage = c.state.usage === "perpetual" ? "Perpetual paid usage" : c.state.usage === "none" ? "Organic use only" : "";
      return `<article class="cr-deal" data-id="${id}">
        <header><h4>${esc(d.brand || "Untitled brand")} <span class="muted">${esc(d.no || "")}</span></h4><strong>${esc(K.money(c.total, c.currency))}</strong></header>
        <p class="small muted">${esc(K.deliverablesSummary(c) || "No deliverables")} · quoted ${esc(K.fmtDate(d.date))}${d.project ? " · " + esc(d.project) : ""}</p>
        <div class="cr-deal-grid">
          <div><label for="ds-${id}">Status</label><select id="ds-${id}" data-d="status">${K.DEAL_STATUSES.map(s => opt(s, s, d.status)).join("")}</select></div>
          <div><label for="dr-${id}">Rights start</label><input id="dr-${id}" type="date" data-d="rightsStart" value="${esc(d.rightsStart || "")}"></div>
          <div><label for="dd-${id}">Content due</label><input id="dd-${id}" type="date" data-d="deliveryDue" value="${esc(d.deliveryDue || "")}"></div>
          <div><label for="dp-${id}">Payment due</label><input id="dp-${id}" type="date" data-d="paymentDue" value="${esc(d.paymentDue || "")}"></div>
        </div>
        <p class="small cr-ends">${esc(ends.join(" · ") || usage || (c.state.usage !== "none" ? "Add a rights start date to see when usage ends." : "Organic use only"))}</p>
        <div class="cr-btns"><button type="button" class="btn ghost sm" data-a="openDeal">Open in calculator</button><button type="button" class="btn ghost sm" data-a="dealPdf">PDF</button><button type="button" class="btn ghost sm" data-a="rmDeal">Delete</button></div>
      </article>`;
    }).join("");
  }
  function dealInput(t, rerender) {
    const d = deals.find(x => x.id === t.closest(".cr-deal").dataset.id), k = t.dataset.d;
    if (!d || !k) return;
    d[k] = k === "status" ? (K.DEAL_STATUSES.includes(t.value) ? t.value : "Quoted") : (K.parseDate(t.value) ? t.value : "");
    LS.set("deals", deals);
    if (rerender && k === "rightsStart") { const el = t.closest(".cr-deal").querySelector(".cr-ends"); const dt = K.dealDates(d); el.textContent = [dt.usageEnd && `Paid usage ends ${K.fmtDate(dt.usageEnd)}`, dt.whitelistEnd && `Whitelisting ends ${K.fmtDate(dt.whitelistEnd)}`, dt.exclusivityEnd && `Exclusivity ends ${K.fmtDate(dt.exclusivityEnd)}`].filter(Boolean).join(" · ") || "No end dates for this deal."; }
  }
  function openDeal(id) {
    const d = deals.find(x => x.id === id); if (!d) return;
    state.calc = K.normalize(d.calc); state.quote = normQuote({ ...d.quote, rightsStart: d.rightsStart || d.quote.rightsStart });
    syncCalcForm(); syncOther(); emailDirty = false; update();
    selectTab("quote", true);
    mount.scrollIntoView({ behavior: "smooth", block: "start" });
    status(`Opened ${d.no || "the quote"} for ${d.brand || "this brand"}.`);
  }
  function exportICS() {
    const n = deals.reduce((s, d) => s + K.dealEvents(d).length, 0);
    if (!n) return status("No dates yet. Add a rights start, content due or payment due date to a saved deal.");
    download(new Blob([K.dealsICS(deals)], { type: "text/calendar;charset=utf-8" }), "brand-deal-reminders.ics");
    status(`Downloaded ${K.plural(n, "reminder")}. Open the file to add them to your calendar.`);
    track("deals_ics");
  }

  // Mobile: show a sticky total while the form is on screen but the result panel isn't.
  if ("IntersectionObserver" in window) {
    const vis = { form: false, result: false };
    const bar = $(".cr-mbar");
    const set = () => { const on = vis.form && !vis.result; bar.classList.toggle("on", on); document.body.classList.toggle("cr-mbar-on", on); };
    new IntersectionObserver(es => { es.forEach(x => { vis[x.target === form ? "form" : "result"] = x.isIntersecting; }); set(); }).observe(form);
    new IntersectionObserver(es => { es.forEach(x => { vis.result = x.isIntersecting; }); set(); }).observe($(".cr-result"));
  }

  // ---------- start ----------
  (async () => {
    const shared = await loadShared();
    syncCalcForm(); syncOther(); renderDealCount();
    selectTab(state.tab, false);
    update();
    if (shared) save();
  })();
})();
