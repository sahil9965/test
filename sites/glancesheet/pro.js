// Shared Pro licensing for every MiniTools site.
// Reads window.SITE (from config.js). While SITE.allFree is not false, every feature is
// unlocked and no upgrade UI is ever shown; Pro.require() simply returns true. Set
// allFree: false later to turn paid extras back on without changing any tool code.
// Paid mode: Pro state lives in localStorage; the key is checked against Gumroad by
// /api/verify on activation and re-checked weekly so cancelled subscriptions lapse.
(() => {
  const S = window.SITE || {};
  if (S.allFree !== false) {
    window.Pro = { active: true, free: true, open() {}, require() { return true; }, onChange() {}, deactivate() {} };
    const mark = () => document.body && document.body.classList.add("is-pro");
    document.body ? mark() : document.addEventListener("DOMContentLoaded", mark);
    return;
  }
  const LS = "mt_pro";
  const WEEK = 7 * 864e5;
  const listeners = [];
  const read = () => { try { return JSON.parse(localStorage.getItem(LS)) || null; } catch { return null; } };
  const write = v => { try { v ? localStorage.setItem(LS, JSON.stringify(v)) : localStorage.removeItem(LS); } catch {} };
  let state = read();

  async function check(key) {
    const r = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
    const j = await r.json().catch(() => ({}));
    return { ok: j.ok === true, definitive: r.status === 200 || r.status === 403 };
  }
  function set(v) { state = v; write(v); listeners.forEach(f => { try { f(!!state); } catch {} }); }

  // Background re-check; a network failure keeps Pro, only an explicit "not valid" revokes it.
  if (state && Date.now() - (state.at || 0) > WEEK) {
    check(state.key).then(r => { if (r.ok) set({ ...state, at: Date.now() }); else if (r.definitive) set(null); }).catch(() => {});
  }

  let dlg;
  function build() {
    dlg = document.createElement("dialog");
    dlg.className = "pro-dlg";
    const feats = (S.proFeatures || []).map(f => `<li>${f}</li>`).join("");
    dlg.innerHTML = `
      <button class="pro-x" aria-label="Close">×</button>
      <p class="pro-eyebrow">${S.name || ""} Pro</p>
      <h3 class="pro-h">Unlock everything</h3>
      <p class="pro-reason"></p>
      <ul class="pro-feats">${feats}</ul>
      <div class="pro-plans">
        <a class="btn" data-plan="monthly" target="_blank" rel="noopener" href="${S.monthlyUrl || "#"}">${S.monthlyPrice || "Monthly"}</a>
        <a class="btn ghost" data-plan="lifetime" target="_blank" rel="noopener" href="${S.lifetimeUrl || "#"}">${S.lifetimePrice || "Lifetime"}</a>
      </div>
      <p class="pro-small">${S.bundleNote || "One Pro pass unlocks every tool in the MiniTools network."}</p>
      <label class="pro-small" for="pro-key">Already bought? Paste your license key</label>
      <div class="pro-row"><input id="pro-key" placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX" autocomplete="off"><button class="btn sm pro-act">Activate</button></div>
      <p class="pro-msg" role="status"></p>`;
    document.body.appendChild(dlg);
    dlg.querySelector(".pro-x").onclick = () => dlg.close();
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
    dlg.querySelectorAll("[data-plan]").forEach(a => a.addEventListener("click", () => track("pro_checkout_" + a.dataset.plan)));
    dlg.querySelector(".pro-act").onclick = async () => {
      const key = dlg.querySelector("#pro-key").value.trim();
      const msg = dlg.querySelector(".pro-msg");
      if (!key) return;
      msg.textContent = "Checking…";
      try {
        const r = await check(key);
        if (r.ok) { set({ key, at: Date.now() }); msg.textContent = ""; dlg.close(); track("pro_activated"); }
        else msg.textContent = "That key wasn't recognised. Check your purchase email.";
      } catch { msg.textContent = "Couldn't reach the server. Try again."; }
    };
  }
  function track(name) { try { window.va && window.va("event", { name }); } catch {} }

  window.Pro = {
    get active() { return !!state; },
    open(reason) {
      if (state) return;
      if (!dlg) build();
      dlg.querySelector(".pro-reason").textContent = reason || "";
      track("pro_open");
      dlg.showModal();
    },
    // Returns true when Pro is active; otherwise opens the upgrade dialog and returns false.
    require(reason) { if (state) return true; this.open(reason); return false; },
    onChange(fn) { listeners.push(fn); },
    deactivate() { set(null); },
  };
})();
