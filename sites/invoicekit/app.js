// InvoiceKit tool. Mounts into #ik-tool; data-preset picks starter line items / tax for landing pages.
(() => {
  const mount = document.getElementById("ik-tool");
  if (!mount) return;
  const $ = s => mount.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem("ik_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("ik_" + k, JSON.stringify(v)); } catch {} },
  };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const day = (d = 0) => { const t = new Date(Date.now() + d * 864e5); return t.toISOString().slice(0, 10); };
  const CUR = ["USD","EUR","GBP","INR","CAD","AUD","NZD","SGD","AED","CHF","JPY","ZAR","BRL","MXN","SEK","NOK","DKK","PLN","PHP","NGN","KES","PKR","MYR","IDR"];
  const PRESETS = {
    default: { items: [{ d: "", q: 1, r: 0 }] },
    freelancer: { items: [{ d: "Design work (hours)", q: 10, r: 60 }, { d: "Revisions", q: 2, r: 60 }], notes: "Payment due within 14 days. Thank you for your business!" },
    photography: { items: [{ d: "Photography session (2 hours)", q: 1, r: 450 }, { d: "Edited high-resolution images", q: 40, r: 5 }, { d: "Travel fee", q: 1, r: 50 }], notes: "50% deposit received. Balance due on delivery of the gallery." },
    contractor: { items: [{ d: "Labor (hours)", q: 16, r: 55 }, { d: "Materials", q: 1, r: 380 }, { d: "Disposal / cleanup", q: 1, r: 75 }], taxLabel: "Sales tax", tax: 0, notes: "Payment due upon completion. Materials remain property of the contractor until paid in full." },
    gst: { currency: "INR", taxLabel: "GST", tax: 18, split: true, items: [{ d: "Consulting services (SAC 998311)", q: 1, r: 25000 }], notes: "Bank: \nA/c No: \nIFSC: \nUPI: " },
    uk: { currency: "GBP", taxLabel: "VAT", tax: 20, items: [{ d: "Professional services", q: 1, r: 500 }], notes: "Payment by bank transfer.\nSort code: \nAccount number: " },
  };
  const preset = PRESETS[mount.dataset.preset] || PRESETS.default;

  mount.innerHTML = `
  <div class="ik-bar no-print">
    <button class="btn" data-a="pdf">Download PDF</button>
    <button class="btn ghost" data-a="new">New invoice</button>
    <button class="btn ghost" data-a="dup">Duplicate</button>
    <select data-a="history" aria-label="Invoice history"><option value="">Invoice history</option></select>
  </div>
  <div class="ik">
    <form class="ik-form" autocomplete="off" onsubmit="return false">
      <h3>Your business</h3>
      <label for="ik-logo">Logo (optional)</label><input type="file" id="ik-logo" accept="image/*">
      <label for="ik-from">From</label><textarea id="ik-from" name="from" placeholder="Your name or company&#10;Address&#10;Email · Phone&#10;Tax ID (optional)"></textarea>
      <h3>Bill to</h3>
      <div class="row"><select id="ik-clients" aria-label="Saved clients"><option value="">Saved clients</option></select><button type="button" class="btn ghost sm" data-a="saveClient">Save client</button></div>
      <label for="ik-to">Client</label><textarea id="ik-to" name="to" placeholder="Client name&#10;Address&#10;Tax ID (optional)"></textarea>
      <h3>Details</h3>
      <div class="row"><div><label for="ik-number">Invoice #</label><input id="ik-number" name="number"></div><div><label for="ik-currency">Currency</label><select id="ik-currency" name="currency"></select></div></div>
      <div class="row"><div><label for="ik-date">Issue date</label><input type="date" id="ik-date" name="date"></div><div><label for="ik-due">Due date</label><input type="date" id="ik-due" name="due"></div></div>
      <label for="ik-template">Template</label>
      <select id="ik-template" name="template"><option value="classic">Classic</option><option value="modern">Modern</option><option value="minimal">Minimal</option></select>
      <h3>Line items</h3>
      <div class="ik-item small muted" aria-hidden="true"><span>Description</span><span>Qty</span><span>Rate</span><span></span></div>
      <div class="ik-items"></div>
      <button type="button" class="btn ghost sm" data-a="add">+ Add item</button>
      <div class="row" style="margin-top:6px">
        <div><label for="ik-taxLabel">Tax name</label><input id="ik-taxLabel" name="taxLabel" placeholder="Tax / VAT / GST"></div>
        <div><label for="ik-tax">Tax %</label><input type="number" step="any" min="0" id="ik-tax" name="tax"></div>
      </div>
      <label class="ik-check"><input type="checkbox" name="split"> Split tax in half (e.g. CGST + SGST)</label>
      <label for="ik-discount">Discount %</label><input type="number" step="any" min="0" id="ik-discount" name="discount">
      <h3>Notes &amp; payment details</h3>
      <textarea id="ik-notes" name="notes" placeholder="Bank / PayPal / UPI details, payment terms, thank-you note"></textarea>
    </form>
    <div><div class="ik-paper" aria-label="Invoice preview"></div></div>
  </div>`;

  const f = $(".ik-form");
  CUR.forEach(c => f.currency.add(new Option(c, c)));
  const nextNumber = () => "INV-" + String(store.get("seq", 0) + 1).padStart(4, "0");
  const blank = () => ({
    from: store.get("from", ""), to: "", number: nextNumber(), currency: preset.currency || store.get("currency", "USD"),
    date: day(), due: day(14), template: "classic", taxLabel: preset.taxLabel || "Tax", tax: preset.tax ?? 0, split: !!preset.split,
    discount: 0, notes: preset.notes ?? store.get("notes", ""), items: structuredClone(preset.items),
  });
  // Landing pages start from their preset; the home page resumes the last draft.
  let inv = (!mount.dataset.preset && store.get("draft", null)) || blank();

  const FIELDS = ["from","to","number","currency","date","due","template","taxLabel","tax","discount","notes"];
  function load(v) {
    inv = structuredClone(v);
    FIELDS.forEach(k => { f[k].value = inv[k] ?? ""; });
    f.split.checked = !!inv.split;
    renderItems(); render();
  }
  function renderItems() {
    $(".ik-items").innerHTML = inv.items.map((it, i) => `<div class="ik-item" data-i="${i}">
      <input data-k="d" value="${esc(it.d)}" placeholder="Service or product" aria-label="Description">
      <input data-k="q" type="number" step="any" value="${esc(it.q)}" aria-label="Quantity">
      <input data-k="r" type="number" step="any" value="${esc(it.r)}" aria-label="Rate">
      <button type="button" class="ik-x" aria-label="Remove item">×</button></div>`).join("");
  }
  const money = n => { try { return new Intl.NumberFormat(undefined, { style: "currency", currency: inv.currency }).format(n); } catch { return (+n).toFixed(2); } };
  const num = v => (Number.isFinite(+v) ? +v : 0);

  function render() {
    const pro = window.Pro && Pro.active;
    document.body.classList.toggle("is-pro", !!pro);
    const sub = inv.items.reduce((s, it) => s + num(it.q) * num(it.r), 0);
    const disc = sub * num(inv.discount) / 100;
    const tax = (sub - disc) * num(inv.tax) / 100;
    const total = sub - disc + tax;
    const label = esc(inv.taxLabel || "Tax");
    const logo = pro && store.get("logo", "");
    const p = $(".ik-paper");
    p.className = "ik-paper t-" + (pro ? inv.template : "classic");
    const taxRows = !tax ? "" : inv.split
      ? `<div><span>C${label} (${num(inv.tax) / 2}%)</span><span>${money(tax / 2)}</span></div><div><span>S${label} (${num(inv.tax) / 2}%)</span><span>${money(tax / 2)}</span></div>`
      : `<div><span>${label} (${num(inv.tax)}%)</span><span>${money(tax)}</span></div>`;
    p.innerHTML = `
      <div class="p-head">
        <div>${logo ? `<img class="p-logo" src="${logo}" alt="Business logo">` : ""}<p class="p-title">${inv.taxLabel === "GST" || inv.taxLabel === "VAT" ? "Tax Invoice" : "Invoice"}</p></div>
        <div class="p-meta r"><b>${esc(inv.number)}</b><br>Issued ${esc(inv.date)}<br>Due ${esc(inv.due)}</div>
      </div>
      <div class="p-parties"><div><div class="p-label">From</div>${esc(inv.from)}</div><div><div class="p-label">Bill to</div>${esc(inv.to)}</div></div>
      <table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>
      ${inv.items.map(it => `<tr><td>${esc(it.d)}</td><td class="r">${num(it.q)}</td><td class="r">${money(num(it.r))}</td><td class="r">${money(num(it.q) * num(it.r))}</td></tr>`).join("")}
      </tbody></table>
      <div class="p-totals">
        <div><span>Subtotal</span><span>${money(sub)}</span></div>
        ${disc ? `<div><span>Discount (${num(inv.discount)}%)</span><span>−${money(disc)}</span></div>` : ""}
        ${taxRows}
        <div class="grand"><span>Total due</span><span>${money(total)}</span></div>
      </div>
      ${inv.notes ? `<div class="p-notes"><div class="p-label">Notes</div>${esc(inv.notes)}</div>` : ""}
      <div class="p-wm">Made with <a href="https://invoicekit-coral.vercel.app/?utm_source=invoice&amp;utm_medium=watermark&amp;utm_campaign=referral">InvoiceKit</a> — free invoice generator · invoicekit-coral.vercel.app</div>`;
    if (!mount.dataset.preset) store.set("draft", inv);
  }

  f.addEventListener("input", e => {
    const t = e.target, row = t.closest(".ik-item");
    if (row) inv.items[row.dataset.i][t.dataset.k] = t.value;
    else if (t.name === "split") inv.split = t.checked;
    else if (t.name) {
      if (t.name === "template" && t.value !== "classic" && !Pro.require("Modern and Minimal templates are part of Pro.")) { t.value = "classic"; return; }
      inv[t.name] = t.value;
      if (["from", "currency"].includes(t.name)) store.set(t.name, t.value);
    }
    render();
  });
  f.addEventListener("click", e => {
    if (!e.target.classList.contains("ik-x")) return;
    inv.items.splice(+e.target.closest(".ik-item").dataset.i, 1);
    if (!inv.items.length) inv.items.push({ d: "", q: 1, r: 0 });
    renderItems(); render();
  });

  function refreshLists() {
    const pro = window.Pro && Pro.active;
    const c = $("#ik-clients"); c.length = 1;
    if (pro) store.get("clients", []).forEach(v => c.add(new Option(v.split("\n")[0], v)));
    const h = $('[data-a="history"]'); h.length = 1;
    if (pro) store.get("history", []).forEach((v, i) => h.add(new Option(`${v.number} · ${(v.to || "").split("\n")[0]}`, i)));
  }

  mount.addEventListener("click", e => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "add") { inv.items.push({ d: "", q: 1, r: 0 }); renderItems(); render(); }
    else if (a === "new") load(blank());
    else if (a === "dup") { if (Pro.require("Duplicate any invoice with one click.")) load({ ...structuredClone(inv), number: "INV-" + String(Math.max(store.get("seq", 0), parseInt(String(inv.number).replace(/\D/g, ""), 10) || 0) + 1).padStart(4, "0"), date: day(), due: day(14) }); }
    else if (a === "saveClient") {
      if (!Pro.require("Save clients and fill them in with one click.") || !inv.to.trim()) return;
      const c = store.get("clients", []); if (!c.includes(inv.to)) c.push(inv.to);
      store.set("clients", c); refreshLists();
    } else if (a === "pdf") {
      // Browser print dialog → "Save as PDF". Also files the invoice in local history.
      const hist = store.get("history", []).filter(h => h.number !== inv.number);
      hist.unshift(structuredClone(inv)); store.set("history", hist.slice(0, 200));
      const n = parseInt(String(inv.number).replace(/\D/g, ""), 10);
      if (n > store.get("seq", 0)) store.set("seq", n);
      refreshLists();
      try { window.va && va("event", { name: "pdf_download" }); } catch {}
      const t = document.title; document.title = inv.number || "invoice"; window.print(); document.title = t;
    }
  });
  mount.addEventListener("change", e => {
    if (e.target.id === "ik-logo") {
      if (!Pro.require("Add your logo to every invoice.")) { e.target.value = ""; return; }
      const file = e.target.files[0]; if (!file) return;
      const r = new FileReader(); r.onload = () => { store.set("logo", r.result); render(); }; r.readAsDataURL(file);
    } else if (e.target.id === "ik-clients") {
      if (e.target.value) { f.to.value = inv.to = e.target.value; render(); }
    } else if (e.target.dataset.a === "history") {
      const h = store.get("history", [])[+e.target.value]; if (h) load(h); e.target.value = "";
    }
  });

  const start = () => { Pro.onChange(() => { refreshLists(); render(); }); load(inv); refreshLists(); };
  // pro.js is deferred like this script; wait for it if needed.
  if (window.Pro) start(); else window.addEventListener("DOMContentLoaded", start);
})();
