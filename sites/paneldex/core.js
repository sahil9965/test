/* PanelDex core: panel numbering, breaker placement, load totals, CSV, share codes, XLSX and the three PDFs.
   No DOM access, so the same file runs on the page and in Node tests.
   jsPDF is passed in (vendor/jspdf-4.2.1.umd.min.js). PDF coordinates are points, origin top-left. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PDCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SITE = "https://panelschedule.roohsites.com";
  const CREDIT = "Made with PanelDex · panelschedule.roohsites.com";
  const CREDIT_URL = SITE + "/?utm_source=paneldex&utm_medium=watermark&utm_campaign=referral";

  const SYSTEMS = {
    "1p240": { label: "120/240 V single-phase", legs: ["L1", "L2"], vln: 120, three: false },
    "3p208": { label: "120/208 V three-phase", legs: ["A", "B", "C"], vln: 120, three: true },
    "3p480": { label: "277/480 V three-phase", legs: ["A", "B", "C"], vln: 277, three: true },
  };
  const SYS_KEYS = Object.keys(SYSTEMS);
  const QUICK_SPACES = [12, 20, 24, 30, 40, 42, 54, 60, 84];
  const MIN_SPACES = 12, MAX_SPACES = 84;
  const TYPES = {
    "1": { poles: 1, label: "Single-pole" },
    "2": { poles: 2, label: "2-pole" },
    "3": { poles: 3, label: "3-pole" },
    t: { poles: 1, label: "Tandem (2 circuits)" },
    spare: { poles: 1, label: "Spare" },
  };
  const TYPE_KEYS = ["1", "2", "3", "t", "spare"];
  const PROT = { std: "Standard", afci: "AFCI", gfci: "GFCI", df: "Dual function" };
  const PROT_KEYS = ["std", "afci", "gfci", "df"];
  const PROT_SHORT = { std: "", afci: "AFCI", gfci: "GFCI", df: "DF" };
  const WIRES = ["14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0", "250", "300", "350", "400", "500", "600"];
  const wireLabel = w => (!w ? "" : /^\d{3}$/.test(w) ? w + " kcmil" : w + " AWG");

  /* --------------------------------------------------------------- model */
  const str = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const num = (v, max) => {
    const s = String(v == null ? "" : v).replace(/[,\s_]/g, "").replace(/(va|a)$/i, "");
    if (s === "") return "";
    const n = Number(s);
    if (!isFinite(n) || n < 0) return "";
    return Math.min(max, Math.round(n));
  };
  function normWire(w) {
    const s = String(w == null ? "" : w).trim().replace(/^#/, "").replace(/\s*(awg|kcmil|mcm)\s*$/i, "").trim();
    return WIRES.includes(s) ? s : "";
  }
  function protFrom(v) {
    if (PROT_KEYS.includes(v)) return v;
    const s = String(v || "").toLowerCase();
    if (/dual|df|afci\s*\/\s*gfci|combo/.test(s)) return "df";
    if (/afci|arc/.test(s)) return "afci";
    if (/gfci|gfi|ground/.test(s)) return "gfci";
    return "std";
  }
  function normCircuit(c) {
    c = c && typeof c === "object" ? c : {};
    return { desc: str(c.desc, 60), room: str(c.room, 40), amps: num(c.amps, 4000), wire: normWire(c.wire), prot: protFrom(c.prot), va: num(c.va, 9999999) };
  }
  function normSpaces(v) {
    let n = Math.round(Number(v));
    if (!isFinite(n)) n = 40;
    n = Math.max(MIN_SPACES, Math.min(MAX_SPACES, n));
    return n % 2 ? n + 1 : n;
  }
  function blankPanel() {
    return { name: "Main panel", location: "", fedFrom: "", mainType: "breaker", mainAmps: 200, busAmps: 200, system: "1p240", spaces: 40, breakers: [] };
  }
  // Cleans anything (saved state, CSV import, share link) into a valid panel. Breakers that don't fit are dropped with a warning.
  function normalize(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    const p = {
      name: str(raw.name, 60), location: str(raw.location, 60), fedFrom: str(raw.fedFrom, 60),
      mainType: raw.mainType === "mlo" ? "mlo" : "breaker", mainAmps: num(raw.mainAmps, 9999), busAmps: num(raw.busAmps, 9999),
      system: SYSTEMS[raw.system] ? raw.system : "1p240", spaces: normSpaces(raw.spaces == null ? 40 : raw.spaces), breakers: [],
    };
    const warnings = [];
    const list = (Array.isArray(raw.breakers) ? raw.breakers : []).filter(b => b && typeof b === "object").slice().sort((a, b) => (+a.sp || 0) - (+b.sp || 0));
    for (const r of list) {
      const sp = Math.round(Number(r.sp)), type = TYPES[r.type] ? r.type : "1";
      const e = placeError(p, sp, type);
      if (e) { warnings.push(e); continue; }
      const b = { sp, type, a: normCircuit(r.a) };
      if (type === "t") b.b = normCircuit(r.b);
      p.breakers.push(b);
    }
    return { panel: p, warnings };
  }

  /* ----------------------------------------------------------- numbering */
  // Standard numbering: odd spaces down the left, even down the right; spaces 2r-1 and 2r share bus row r.
  const rowOf = sp => Math.ceil(sp / 2);
  const sideOf = sp => (sp % 2 ? "left" : "right");
  const legIndex = (system, sp) => (rowOf(sp) - 1) % (SYSTEMS[system].three ? 3 : 2);
  const legOf = (system, sp) => SYSTEMS[system].legs[legIndex(system, sp)];
  const polesOf = type => (TYPES[type] || TYPES["1"]).poles;
  // A multi-pole breaker takes vertically adjacent spaces in the same column: sp, sp+2 (and sp+4).
  const spacesOf = b => Array.from({ length: polesOf(b.type) }, (_, i) => b.sp + 2 * i);
  const andList = a => (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);
  function circuitLabel(b) {
    if (b.type === "t") return `${b.sp}A/${b.sp}B`;
    return spacesOf(b).join("/");
  }
  const occupant = (panel, sp, ignoreSp) => panel.breakers.find(b => b.sp !== ignoreSp && spacesOf(b).includes(sp));
  function placeError(panel, sp, type, ignoreSp) {
    const n = panel.spaces, poles = polesOf(type);
    if (!Number.isInteger(sp) || sp < 1 || sp > n) return `Space ${sp} is outside this ${n}-space panel.`;
    if (poles === 3 && !SYSTEMS[panel.system].three) return "A 3-pole breaker needs a three-phase panel. Switch the system to 120/208 V or 277/480 V three-phase first.";
    const need = Array.from({ length: poles }, (_, i) => sp + 2 * i);
    if (need[need.length - 1] > n) return `A ${poles}-pole breaker at space ${sp} would run off the bottom of the column: it needs spaces ${andList(need)}, and this panel has ${n} spaces.`;
    for (const s of need) {
      const o = occupant(panel, s, ignoreSp);
      if (o) return `Space ${s} is already used by circuit ${circuitLabel(o)}${o.a.desc ? " (" + o.a.desc + ")" : ""}. Clear it first.`;
    }
    return null;
  }
  const breakerAt = (panel, sp) => panel.breakers.find(b => b.sp === sp) || null;
  // Changes the breaker type at a space ("space" clears it). Returns an error message, or null when it worked.
  function setType(panel, sp, type) {
    const cur = breakerAt(panel, sp);
    if (type === "space") { panel.breakers = panel.breakers.filter(b => b !== cur); return null; }
    if (!TYPES[type]) return "Unknown breaker type.";
    const e = placeError(panel, sp, type, cur ? sp : undefined);
    if (e) return e;
    if (cur) {
      cur.type = type;
      if (type === "t" && !cur.b) cur.b = normCircuit({});
      if (type !== "t") delete cur.b;
    } else {
      const b = { sp, type, a: normCircuit({}) };
      if (type === "t") b.b = normCircuit({});
      panel.breakers.push(b);
      panel.breakers.sort((x, y) => x.sp - y.sp);
    }
    return null;
  }
  function setSpaces(panel, n) {
    n = normSpaces(n);
    const bad = panel.breakers.filter(b => Math.max(...spacesOf(b)) > n);
    if (bad.length) return `Circuit${bad.length > 1 ? "s" : ""} ${andList(bad.map(circuitLabel))} use${bad.length > 1 ? "" : "s"} spaces beyond ${n}. Clear ${bad.length > 1 ? "them" : "it"} first, then choose ${n} spaces.`;
    panel.spaces = n;
    return null;
  }
  function setSystem(panel, sys) {
    if (!SYSTEMS[sys]) return "Unknown system.";
    if (!SYSTEMS[sys].three) {
      const bad = panel.breakers.filter(b => b.type === "3");
      if (bad.length) return `A single-phase panel can't hold 3-pole breakers. Clear circuit ${andList(bad.map(circuitLabel))} first.`;
    }
    panel.system = sys;
    return null;
  }

  // Every circuit in panel order. A tandem gives two circuits (5A, 5B); a 2-pole is one circuit on two spaces.
  function circuits(panel) {
    const out = [];
    for (const b of panel.breakers.slice().sort((x, y) => x.sp - y.sp)) {
      const spaces = spacesOf(b), legs = spaces.map(s => legOf(panel.system, s));
      const base = { sp: b.sp, type: b.type, poles: spaces.length, spaces, legs, side: sideOf(b.sp) };
      if (b.type === "t") {
        out.push({ ...base, ...b.a, id: b.sp + "A", half: "a" });
        out.push({ ...base, ...b.b, id: b.sp + "B", half: "b" });
      } else out.push({ ...base, ...b.a, id: spaces.join("/") });
    }
    return out;
  }
  // Panel rows top to bottom; each cell says which breaker (and which of its poles) sits in that space.
  function grid(panel) {
    const occ = new Map();
    for (const b of panel.breakers) spacesOf(b).forEach((s, i) => occ.set(s, { b, pole: i }));
    const cell = sp => { const o = occ.get(sp); return o ? { sp, b: o.b, pole: o.pole, span: polesOf(o.b.type) } : { sp, b: null, pole: 0, span: 1 }; };
    const rows = [];
    for (let r = 1; r <= panel.spaces / 2; r++) rows.push({ row: r, leg: legOf(panel.system, 2 * r - 1), left: cell(2 * r - 1), right: cell(2 * r) });
    return rows;
  }

  /* -------------------------------------------------------------- totals */
  // Sums of the loads typed in, per leg or phase. Multi-pole loads are split evenly across their poles.
  function totals(panel) {
    const sys = SYSTEMS[panel.system];
    const va = sys.legs.map(() => 0);
    for (const c of circuits(panel)) {
      if (c.va === "" || c.va == null) continue;
      const share = c.va / c.poles;
      for (const s of c.spaces) va[legIndex(panel.system, s)] += share;
    }
    const total = va.reduce((a, b) => a + b, 0);
    const hi = Math.max(...va), lo = Math.min(...va);
    const word = sys.three ? "phase" : "leg";
    return {
      legs: sys.legs.map((leg, i) => ({ leg, va: va[i], amps: va[i] / sys.vln })),
      total, volts: sys.vln, word,
      imbalance: hi > 0 ? ((hi - lo) / hi) * 100 : 0,
      formula: `Approx. amps per ${word} = ${word} VA ÷ ${sys.vln} V`,
      imbFormula: "Imbalance = (highest − lowest) ÷ highest",
    };
  }
  const fmtInt = n => Math.round(n).toLocaleString("en-US");
  const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  /* ----------------------------------------------------------------- CSV */
  function parseCSV(textIn) {
    const src = String(textIn || "").replace(/^﻿/, "");
    const first = src.split(/\r?\n/).find(l => l.trim()) || "";
    const counts = { ",": (first.match(/,/g) || []).length, ";": (first.match(/;/g) || []).length, "\t": (first.match(/\t/g) || []).length };
    const d = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    const rows = [];
    let row = [], f = "", q = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (q) {
        if (c === '"') { if (src[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"' && f === "") q = true;
      else if (c === d) { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && src[i + 1] === "\n") i++;
        row.push(f); f = "";
        rows.push(row);
        row = [];
      } else f += c;
    }
    row.push(f);
    if (row.some(v => v.trim() !== "")) rows.push(row);
    return rows;
  }
  // Text that starts like a formula gets a leading apostrophe so spreadsheets show it as text; import strips it again.
  const csvCell = v => {
    let s = String(v == null ? "" : v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return /[",;\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const uncsv = v => String(v == null ? "" : v).replace(/^'(?=[=+\-@])/, "").trim();
  const CSV_HEAD = ["Space", "Circuit", "Type", "Poles", "Leg/phase", "Description", "Room/area", "Amps", "Wire", "Protection", "Load VA"];
  function toCSV(panel) {
    const sys = SYSTEMS[panel.system], t = totals(panel);
    const rows = [
      ["PanelDex panel schedule"],
      ["Panel name", panel.name], ["Location", panel.location], ["Fed from", panel.fedFrom],
      ["Main", panel.mainType === "mlo" ? "Main lugs only" : "Main breaker"],
      ["Main breaker amps", panel.mainType === "mlo" ? "" : panel.mainAmps], ["Bus rating amps", panel.busAmps],
      ["System", sys.label], ["Spaces", panel.spaces], [], CSV_HEAD,
    ];
    for (const c of circuits(panel)) rows.push([c.sp, c.id, TYPES[c.type].label, c.poles, c.legs.join("/"), c.desc, c.room, c.amps, wireLabel(c.wire), PROT[c.prot], c.va]);
    rows.push([], [sys.three ? "Phase" : "Leg", "Load VA", "Approx. amps"]);
    for (const l of t.legs) rows.push([l.leg, Math.round(l.va), (Math.round(l.amps * 10) / 10).toFixed(1)]);
    rows.push(["Total VA", Math.round(t.total)], ["Imbalance %", (Math.round(t.imbalance * 10) / 10).toFixed(1)]);
    rows.push(["Totals of the loads you entered - not a code load calculation."], [`${CREDIT} (${SITE})`]);
    return rows.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }
  function fromCSV(text) {
    const rows = parseCSV(text);
    const raw = { breakers: [] };
    const tandems = new Map();
    let inTable = false;
    for (const r of rows) {
      const k = uncsv(r[0]).toLowerCase(), v = uncsv(r[1]);
      if (!inTable) {
        if (k === "space" && /circuit/i.test(v)) { inTable = true; continue; }
        if (k === "panel name") raw.name = v;
        else if (k === "location") raw.location = v;
        else if (k === "fed from") raw.fedFrom = v;
        else if (k === "main") raw.mainType = /lug|mlo/i.test(v) ? "mlo" : "breaker";
        else if (k === "main breaker amps") raw.mainAmps = v;
        else if (k === "bus rating amps") raw.busAmps = v;
        else if (k === "system") raw.system = /480|277/.test(v) ? "3p480" : /208|three|3.?ph/i.test(v) ? "3p208" : "1p240";
        else if (k === "spaces") raw.spaces = v;
        continue;
      }
      if (!/^\d+$/.test(k)) continue;
      const sp = +k, id = uncsv(r[1]), typeTxt = uncsv(r[2]), poles = +uncsv(r[3]) || 1;
      const type = /tandem|twin/i.test(typeTxt) || /^\d+[ab]$/i.test(id) ? "t" : /spare/i.test(typeTxt) ? "spare"
        : /^3/.test(typeTxt) || poles === 3 ? "3" : /^2|double/i.test(typeTxt) || poles === 2 ? "2" : "1";
      const c = { desc: uncsv(r[5]), room: uncsv(r[6]), amps: uncsv(r[7]), wire: uncsv(r[8]), prot: protFrom(uncsv(r[9])), va: uncsv(r[10]) };
      if (type === "t") {
        let b = tandems.get(sp);
        if (!b) { b = { sp, type: "t", a: {}, b: {} }; tandems.set(sp, b); raw.breakers.push(b); }
        b[/b$/i.test(id) ? "b" : "a"] = c;
      } else raw.breakers.push({ sp, type, a: c });
    }
    if (!inTable) return { panel: null, warnings: [], error: "This file doesn't look like a PanelDex CSV: it needs a header row starting Space, Circuit, Type." };
    return normalize(raw);
  }

  /* --------------------------------------------------------- share links */
  // Compact array form, deflated and base64url-encoded into the URL hash (#p=...). Nothing goes to a server.
  const trimEnd = a => { while (a.length && (a[a.length - 1] === "" || a[a.length - 1] == null)) a.pop(); return a; };
  const packC = c => trimEnd([c.desc, c.room, c.amps, c.wire, PROT_KEYS.indexOf(c.prot) || "", c.va]);
  const unpackC = a => (Array.isArray(a) ? { desc: a[0], room: a[1], amps: a[2], wire: a[3], prot: PROT_KEYS[+a[4] || 0], va: a[5] } : {});
  function pack(p) {
    return [1, p.name, p.location, p.fedFrom, p.mainType === "mlo" ? 1 : 0, p.mainAmps, p.busAmps, SYS_KEYS.indexOf(p.system), p.spaces,
      p.breakers.map(b => { const r = [b.sp, TYPE_KEYS.indexOf(b.type), packC(b.a)]; if (b.b) r.push(packC(b.b)); return r; })];
  }
  function unpack(a) {
    if (!Array.isArray(a) || a[0] !== 1) return null;
    return normalize({
      name: a[1], location: a[2], fedFrom: a[3], mainType: a[4] ? "mlo" : "breaker", mainAmps: a[5], busAmps: a[6], system: SYS_KEYS[a[7]], spaces: a[8],
      breakers: (Array.isArray(a[9]) ? a[9] : []).map(r => Array.isArray(r) ? { sp: r[0], type: TYPE_KEYS[r[1]], a: unpackC(r[2]), b: unpackC(r[3]) } : null),
    });
  }
  const b64url = bytes => { let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  const unb64url = s => { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
  async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
  async function encodeShare(panel) {
    const bytes = new TextEncoder().encode(JSON.stringify(pack(panel)));
    if (typeof CompressionStream === "function") {
      try { return "1" + b64url(await pipe(bytes, new CompressionStream("deflate-raw"))); } catch (e) { /* fall through */ }
    }
    return "0" + b64url(bytes);
  }
  async function decodeShare(code) {
    try {
      code = String(code || "").trim();
      let bytes = unb64url(code.slice(1));
      if (code[0] === "1") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
      else if (code[0] !== "0") return null;
      return unpack(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (e) { return null; }
  }
  const shareUrl = code => `${SITE}/#p=${code}`;

  /* ---------------------------------------------------------------- XLSX */
  const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(bytes) { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = CRC_T[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  // Store-only ZIP (no compression): local headers, file data, central directory, end record.
  function zipStore(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = typeof f.data === "string" ? enc.encode(f.data) : f.data, crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, 0, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    const all = [...parts, ...central, new Uint8Array(end.buffer)];
    const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
    let p = 0;
    for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }
  const xmlEsc = s => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const colName = i => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - 1 - m) / 26; } return s; };
  const ST = { bold: 1, pct: 2, int: 3, dec: 4 };
  function cellXml(ref, c) {
    if (c == null || c === "") return "";
    if (typeof c !== "object") c = { v: c };
    const s = c.s ? ` s="${c.s}"` : "";
    if (c.f) return `<c r="${ref}"${s}${c.str ? ' t="str"' : ""}><f>${xmlEsc(c.f)}</f></c>`;
    if (c.v === "" || c.v == null) return "";
    if (typeof c.v === "number") return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(c.v)}</t></is></c>`;
  }
  // One row per space in number order (two rows for a tandem). "VA on this pole" is a live formula, and the
  // totals are SUMIF formulas over the leg/phase column, so editing a load in Excel updates everything.
  function xlsxRows(panel) {
    const sys = SYSTEMS[panel.system], B = ST.bold;
    const n = v => (v === "" || v == null ? "" : Number(v));
    const rows = [
      [{ v: "Panel schedule: " + (panel.name || "Panel"), s: B }],
      ["Location", panel.location], ["Fed from", panel.fedFrom],
      ["Main", panel.mainType === "mlo" ? "Main lugs only" : `Main breaker${panel.mainAmps !== "" ? " " + panel.mainAmps + " A" : ""}`],
      ["Bus rating", panel.busAmps !== "" ? panel.busAmps + " A" : ""], ["System", sys.label], ["Spaces", panel.spaces], [],
      ["Space", "Circuit", "Side", sys.three ? "Phase" : "Leg", "Description", "Room/area", "Breaker (A)", "Poles", "Wire", "Protection", "Circuit load (VA)", "VA on this pole"].map(v => ({ v, s: B })),
    ];
    const first = rows.length + 1;
    const occ = new Map();
    for (const b of panel.breakers) spacesOf(b).forEach((s, i) => occ.set(s, { b, pole: i }));
    const startRow = new Map();
    for (let sp = 1; sp <= panel.spaces; sp++) {
      const o = occ.get(sp), side = sp % 2 ? "Left" : "Right", leg = legOf(panel.system, sp);
      if (!o) { rows.push([sp, "", side, leg, "(space)"]); continue; }
      const b = o.b, poles = polesOf(b.type);
      const line = (c, id, p) => { const r = rows.length + 1; rows.push([sp, id, side, leg, c.desc, c.room, n(c.amps), p, wireLabel(c.wire), PROT[c.prot], n(c.va), { f: `K${r}/H${r}`, s: ST.int }]); return r; };
      if (b.type === "t") { line(b.a, sp + "A", 1); line(b.b, sp + "B", 1); }
      else if (o.pole === 0) startRow.set(b, line(b.a, spacesOf(b).join("/"), poles));
      else { const r0 = startRow.get(b); rows.push([sp, spacesOf(b).join("/"), side, leg, b.a.desc, "", "", "", "", "", "", { f: `K${r0}/H${r0}`, s: ST.int }]); }
    }
    const last = rows.length;
    rows.push([], [sys.three ? "Phase" : "Leg", "Load (VA)", "Approx. amps"].map(v => ({ v, s: B })));
    const legRows = sys.legs.map(leg => {
      const r = rows.length + 1;
      rows.push([leg, { f: `SUMIF($D$${first}:$D$${last},"${leg}",$L$${first}:$L$${last})`, s: ST.int }, { f: `B${r}/${sys.vln}`, s: ST.dec }]);
      return r;
    });
    const rng = `B${legRows[0]}:B${legRows[legRows.length - 1]}`;
    rows.push([{ v: "Total VA", s: B }, { f: `SUM(${rng})`, s: ST.int }]);
    rows.push([{ v: "Imbalance", s: B }, { f: `IF(MAX(${rng})=0,0,(MAX(${rng})-MIN(${rng}))/MAX(${rng}))`, s: ST.pct }]);
    rows.push([`Approx. amps = VA ÷ ${sys.vln} V. Imbalance = (highest − lowest) ÷ highest. Multi-pole loads are split evenly across their poles.`]);
    rows.push(["Totals of the loads you entered — not a code load calculation. For sizing, have a licensed electrician do an NEC Article 220 load calculation."]);
    rows.push(["Labelling tool only. Turn power off and follow local code; have a licensed electrician do electrical work."]);
    rows.push([{ f: `HYPERLINK("${CREDIT_URL}","${CREDIT}")`, str: true }]);
    return { rows, first, last, legRows };
  }
  function xlsxBytes(panel) {
    const { rows } = xlsxRows(panel);
    const widths = [8, 10, 7, 9, 36, 20, 11, 7, 11, 14, 16, 15];
    const sheetData = rows.map((r, i) => {
      const cells = (r || []).map((c, j) => cellXml(colName(j) + (i + 1), c)).join("");
      return cells ? `<row r="${i + 1}">${cells}</row>` : "";
    }).join("");
    const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
    const HDR = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    const files = [
      { name: "[Content_Types].xml", data: HDR + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { name: "_rels/.rels", data: HDR + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", data: HDR + `<workbook ${NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Panel schedule" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: HDR + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: "xl/styles.xml", data: HDR + `<styleSheet ${NS}><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
      { name: "xl/worksheets/sheet1.xml", data: HDR + `<worksheet ${NS}><sheetViews><sheetView workbookViewId="0"/></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${sheetData}</sheetData><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape"/></worksheet>` },
    ];
    return zipStore(files);
  }

  /* ---------------------------------------------------------------- PDFs */
  const INK = "#111111", MUTED = "#5b5b5b", LINE = "#8c8c8c", LIGHT = "#cfcfcf", SOFT = "#efefef";
  const CP1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  const MAP = { "→": "->", "←": "<-", "≥": ">=", "≤": "<=", "≈": "~", "−": "-", " ": " ", "Ω": "ohm", "Ł": "L", "ł": "l", "Đ": "D", "đ": "d", "ı": "i" };
  const inFont = ch => { const c = ch.codePointAt(0); return (c >= 32 && c < 127) || (c >= 160 && c <= 255) || CP1252.includes(ch); };
  // The standard PDF fonts only cover Windows-1252: map a few symbols, strip accents the font lacks, drop emoji.
  function pdfSafe(s) {
    let out = "";
    for (const ch of String(s == null ? "" : s).normalize("NFC")) {
      const c = ch.codePointAt(0);
      if (inFont(ch)) out += ch;
      else if (MAP[ch]) out += MAP[ch];
      else if (c > 0xffff || (c >= 0x2600 && c <= 0x27bf) || c === 0xfe0f || c === 0x200d || (c >= 0x300 && c <= 0x36f)) continue;
      else if (c >= 32) { const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, ""); out += base && [...base].every(inFont) ? base : "?"; }
    }
    return out.replace(/\s+/g, " ").trim();
  }
  // Draws text shrunk (down to min) and then truncated so it fits maxW.
  function fitText(doc, text, x, y, maxW, size, opts) {
    opts = opts || {};
    const min = opts.min || 5.5;
    text = pdfSafe(text);
    if (!text || maxW <= 2) return;
    let s = size;
    doc.setFontSize(s);
    while (s > min && doc.getTextWidth(text) > maxW) { s -= 0.25; doc.setFontSize(s); }
    if (doc.getTextWidth(text) > maxW) {
      while (text.length > 1 && doc.getTextWidth(text + "…") > maxW) text = text.slice(0, -1);
      text = text.trimEnd() + "…";
    }
    doc.text(text, x, y, { align: opts.align || "left", baseline: "middle" });
  }
  // One line if it fits at >= 82% size, else two lines (when the cell is tall enough), else shrink and truncate.
  function fitCell(doc, text, x, yMid, maxW, h, size, opts) {
    opts = opts || {};
    text = pdfSafe(text);
    if (!text || maxW <= 2) return;
    const lo = opts.min || 5.5, align = opts.align || "left";
    for (let s = size; s >= Math.max(lo, size * 0.82); s -= 0.25) {
      doc.setFontSize(s);
      if (doc.getTextWidth(text) <= maxW) { doc.text(text, x, yMid, { align, baseline: "middle" }); return; }
    }
    for (let s = Math.min(size * 0.92, (h - 2) / 2.2); s >= lo; s -= 0.25) {
      doc.setFontSize(s);
      const ls = doc.splitTextToSize(text, maxW);
      if (ls.length <= 2 && ls.every(l => doc.getTextWidth(l) <= maxW)) {
        ls.forEach((l, i) => doc.text(l, x, yMid + (i - (ls.length - 1) / 2) * s * 1.1, { align, baseline: "middle" }));
        return;
      }
    }
    fitText(doc, text, x, yMid, maxW, Math.max(lo, size * 0.82), { min: lo, align });
  }
  function wrapLines(doc, text, maxW, size, maxLines) {
    doc.setFontSize(size);
    let lines = doc.splitTextToSize(pdfSafe(text), maxW);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      let l = lines[maxLines - 1];
      while (l.length > 1 && doc.getTextWidth(l + "…") > maxW) l = l.slice(0, -1);
      lines[maxLines - 1] = l.trimEnd() + "…";
    }
    return lines;
  }
  function credit(doc, W, y, size) {
    size = size || 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(MUTED);
    const w = doc.getTextWidth(CREDIT), x = (W - w) / 2;
    doc.text(CREDIT, x, y, { baseline: "middle" });
    doc.link(x, y - size * 0.7, w, size * 1.4, { url: CREDIT_URL });
  }
  const ascii = v => String(v || "").normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/[()\\]/g, "").trim();
  function meta(doc, title) { doc.setProperties({ title: ascii(title), creator: "PanelDex - panelschedule.roohsites.com" }); }
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const bkrText = (amps, poles) => (amps === "" ? (poles > 1 ? poles + "P" : "") : `${amps} A${poles > 1 ? " " + poles + "P" : ""}`);
  const mainText = p => (p.mainType === "mlo" ? "Main lugs only" : `${p.mainAmps !== "" ? p.mainAmps + " A " : ""}main breaker`);
  const lineCount = row => (row.left.b && row.left.b.type === "t") || (row.right.b && row.right.b.type === "t") ? 2 : 1;
  // Groups of rows that must stay on one page: a multi-pole breaker never splits across pages.
  function blocks(rows) {
    const out = [];
    let cur = [], end = 0;
    rows.forEach((r, i) => {
      cur.push(r);
      for (const c of [r.left, r.right]) if (c.b) end = Math.max(end, i + (c.span - 1 - c.pole));
      if (i >= end) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);
    return out;
  }

  // (a) Panel schedule: landscape, header block, the two-column circuit table in panel order, then totals.
  function schedulePdf(jsPDF, panel, opts) {
    opts = opts || {};
    const paper = opts.paper === "a4" ? "a4" : "letter";
    const doc = new jsPDF({ unit: "pt", format: paper, orientation: "landscape", compress: true });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    const sys = SYSTEMS[panel.system], t = totals(panel), rows = grid(panel), date = opts.date || today();
    meta(doc, "Panel schedule - " + (panel.name || "Panel"));
    const M = 30, BOTTOM = 28, HEAD1 = 84, HEADN = 30, THEAD = 18, TOTALS = 112;
    const LEGW = 28, TW = W - 2 * M, S = (TW - LEGW) / 2;
    const fixed = { room: 60, wire: 38, prot: 28, bkr: 40, va: 42, ckt: 30 };
    const descW = S - Object.values(fixed).reduce((a, b) => a + b, 0);
    // x of each column on each side (outer edge -> centre): description, room, wire, protection, breaker, VA, circuit no.
    const order = ["desc", "room", "wire", "prot", "bkr", "va", "ckt"];
    const widths = { desc: descW, ...fixed };
    const cols = { left: {}, right: {} };
    let x = M;
    for (const k of order) { cols.left[k] = { x, w: widths[k] }; x += widths[k]; }
    const legX = x; x += LEGW;
    for (const k of order.slice().reverse()) { cols.right[k] = { x, w: widths[k] }; x += widths[k]; }
    const MERGED = ["desc", "room", "wire", "prot", "bkr"];

    const totalLines = rows.reduce((a, r) => a + lineCount(r), 0);
    const avail1 = H - M - HEAD1 - THEAD - TOTALS - BOTTOM;
    let lh = Math.min(17, avail1 / totalLines);
    if (lh < 12) lh = 13;
    const fs = Math.min(9, lh * 0.56);

    const header = (y, first, page) => {
      doc.setTextColor(INK);
      if (first) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(MUTED);
        doc.text("PANEL SCHEDULE", M, y + 8, { baseline: "middle" });
        doc.setFont("helvetica", "normal"); doc.text("Updated " + date, W - M, y + 8, { align: "right", baseline: "middle" });
        doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
        fitText(doc, panel.name || "Panel", M, y + 27, TW - 120, 19, { min: 10 });
        const info = [["Location", panel.location || "-"], ["Fed from", panel.fedFrom || "-"], ["System", sys.label], ["Main", mainText(panel)], ["Bus rating", panel.busAmps !== "" ? panel.busAmps + " A" : "-"], ["Spaces", String(panel.spaces)]];
        const bw = TW / info.length, by = y + 44;
        info.forEach(([k, v], i) => {
          const bx = M + i * bw;
          doc.setDrawColor(LIGHT); doc.setLineWidth(0.6); doc.rect(bx, by, bw, 32, "S");
          doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(MUTED);
          doc.text(k.toUpperCase(), bx + 6, by + 9, { baseline: "middle" });
          doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
          fitText(doc, v, bx + 6, by + 22, bw - 12, 9.5, { min: 6 });
        });
        return y + HEAD1;
      }
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      fitText(doc, `${panel.name || "Panel"} - panel schedule (continued, page ${page})`, M, y + 10, TW, 10);
      return y + HEADN;
    };
    const thead = y => {
      doc.setFillColor(SOFT); doc.rect(M, y, TW, THEAD, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(INK);
      const names = { desc: "Description", room: "Room / area", wire: "Wire", prot: "Prot.", bkr: "Breaker", va: "VA", ckt: "Ckt" };
      for (const side of ["left", "right"]) for (const k of order) {
        const c = cols[side][k], right = k === "va";
        doc.text(names[k], right ? c.x + c.w - 4 : k === "ckt" ? c.x + c.w / 2 : c.x + 4, y + THEAD / 2, { baseline: "middle", align: right ? "right" : k === "ckt" ? "center" : "left" });
      }
      doc.text(sys.three ? "Ph" : "Leg", legX + LEGW / 2, y + THEAD / 2, { baseline: "middle", align: "center" });
      doc.setDrawColor(LINE); doc.setLineWidth(0.8); doc.rect(M, y, TW, THEAD, "S");
      return y + THEAD;
    };
    const vaText = (c, poles) => (c.va === "" ? "" : fmtInt(c.va / poles));
    const drawMerged = (side, c, id, y, h, poles, muted) => {
      const C = cols[side];
      doc.setTextColor(muted ? MUTED : INK); doc.setFont("helvetica", muted ? "italic" : "normal");
      fitCell(doc, c.desc, C.desc.x + 4, y + h / 2, C.desc.w - 8, h, fs);
      doc.setFont("helvetica", "normal"); doc.setTextColor(INK);
      fitCell(doc, c.room, C.room.x + 4, y + h / 2, C.room.w - 8, h, fs * 0.92);
      fitText(doc, wireLabel(c.wire), C.wire.x + 4, y + h / 2, C.wire.w - 6, fs * 0.92);
      doc.setFont("helvetica", "bold"); fitText(doc, PROT_SHORT[c.prot], C.prot.x + 4, y + h / 2, C.prot.w - 6, fs * 0.85);
      doc.setFont("helvetica", "normal"); fitText(doc, bkrText(c.amps, poles), C.bkr.x + 4, y + h / 2, C.bkr.w - 6, fs * 0.92);
    };
    const drawPerRow = (side, vaStr, ckt, y, h) => {
      const C = cols[side];
      doc.setFont("helvetica", "normal"); doc.setTextColor(INK);
      fitText(doc, vaStr, C.va.x + C.va.w - 4, y + h / 2, C.va.w - 6, fs * 0.95, { align: "right" });
      doc.setFont("helvetica", "bold");
      fitText(doc, ckt, C.ckt.x + C.ckt.w / 2, y + h / 2, C.ckt.w - 4, fs, { align: "center" });
    };
    const hline = (side, keys, y) => { const C = cols[side]; const a = C[keys[0]], b = C[keys[keys.length - 1]]; const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x + a.w, b.x + b.w); doc.line(x1, y, x2, y); };
    // Draws one block of rows starting at y; returns the y below it.
    const drawRows = (blk, y0) => {
      const ys = []; let y = y0;
      for (const r of blk) { const h = lineCount(r) * lh; ys.push({ y, h }); y += h; }
      blk.forEach((r, i) => {
        const { y, h } = ys[i];
        doc.setFillColor(SOFT); doc.rect(legX, y, LEGW, h, "F");
        doc.setFont("helvetica", "bold"); doc.setTextColor(INK); doc.setFontSize(fs);
        doc.text(r.leg, legX + LEGW / 2, y + h / 2, { align: "center", baseline: "middle" });
        for (const side of ["left", "right"]) {
          const cell = r[side], b = cell.b;
          doc.setDrawColor(LIGHT); doc.setLineWidth(0.5);
          if (!b) {
            doc.setFont("helvetica", "italic"); doc.setTextColor(MUTED);
            fitText(doc, "Space", cols[side].desc.x + 4, y + h / 2, cols[side].desc.w - 8, fs * 0.9);
            drawPerRow(side, "", String(cell.sp), y, h);
            hline(side, order, y + h);
          } else if (b.type === "t") {
            const half = h / 2;
            [[b.a, "A"], [b.b, "B"]].forEach(([c, s], k) => { drawMerged(side, c, "", y + k * half, half, 1); drawPerRow(side, vaText(c, 1), cell.sp + s, y + k * half, half); });
            doc.setLineDashPattern([1, 1.5], 0); hline(side, order, y + half); doc.setLineDashPattern([], 0);
            hline(side, order, y + h);
          } else {
            const poles = polesOf(b.type);
            if (cell.pole === 0) {
              let sh = 0; for (let k = 0; k < poles; k++) sh += ys[i + k] ? ys[i + k].h : lh;
              const c = b.type === "spare" && !b.a.desc ? { ...b.a, desc: "Spare" } : b.a;
              drawMerged(side, c, "", y, sh, poles);
            }
            drawPerRow(side, vaText(b.a, poles), String(cell.sp), y, h);
            hline(side, ["va", "ckt"], y + h);
            if (cell.pole === poles - 1) hline(side, order, y + h);
          }
        }
      });
      // column rules
      doc.setDrawColor(LIGHT); doc.setLineWidth(0.5);
      for (const side of ["left", "right"]) for (const k of order) { const c = cols[side][k]; doc.line(c.x, y0, c.x, y); }
      doc.setDrawColor(LINE); doc.setLineWidth(0.8);
      doc.line(legX, y0, legX, y); doc.line(legX + LEGW, y0, legX + LEGW, y); doc.line(M, y0, M, y); doc.line(M + TW, y0, M + TW, y);
      return y;
    };
    const totalsBlock = y => {
      doc.setTextColor(INK); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text("Load totals", M, y + 6, { baseline: "middle" });
      const tx = [M, M + 70, M + 150], rh = 12.5;
      let yy = y + 20;
      doc.setFontSize(7.5); doc.setTextColor(MUTED);
      doc.text(sys.three ? "Phase" : "Leg", tx[0], yy, { baseline: "middle" }); doc.text("Load (VA)", tx[1] + 60, yy, { align: "right", baseline: "middle" }); doc.text("Approx. amps", tx[2] + 70, yy, { align: "right", baseline: "middle" });
      doc.setDrawColor(LIGHT); doc.setLineWidth(0.5); doc.line(M, yy + 6, M + 230, yy + 6);
      doc.setTextColor(INK);
      for (const l of t.legs) {
        yy += rh;
        doc.setFont("helvetica", "bold"); doc.text(l.leg, tx[0], yy, { baseline: "middle" });
        doc.setFont("helvetica", "normal"); doc.text(fmtInt(l.va), tx[1] + 60, yy, { align: "right", baseline: "middle" }); doc.text(fmt1(l.amps) + " A", tx[2] + 70, yy, { align: "right", baseline: "middle" });
      }
      yy += rh; doc.line(M, yy - 6, M + 230, yy - 6);
      doc.setFont("helvetica", "bold"); doc.text("Total", tx[0], yy, { baseline: "middle" }); doc.text(fmtInt(t.total) + " VA", tx[1] + 60, yy, { align: "right", baseline: "middle" });
      yy += rh; doc.text("Imbalance", tx[0], yy, { baseline: "middle" }); doc.text(fmt1(t.imbalance) + " %", tx[1] + 60, yy, { align: "right", baseline: "middle" });
      const nx = M + 270, nw = W - M - nx;
      const notes = [
        [t.formula + ". " + t.imbFormula + ", as a percentage. Multi-pole loads are split evenly across their poles" + (sys.three ? "; two-pole loads on a three-phase panel draw somewhat more current than this estimate." : "."), false],
        ["Totals of the loads you entered - not a code load calculation. For service, feeder or panel sizing, have a licensed electrician do an NEC Article 220 load calculation.", false],
        ["Labelling tool only. Turn power off and follow local code; have a licensed electrician do electrical work.", true],
        ["Prot.: AFCI = arc-fault, GFCI = ground-fault, DF = dual function (AFCI + GFCI). VA column shows each pole's share of the circuit load.", false],
      ];
      let ny = y + 6;
      for (const [txt, bold] of notes) {
        doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setTextColor(bold ? INK : MUTED);
        const ls = wrapLines(doc, txt, nw, 7.5, 3);
        ls.forEach((l, i) => doc.text(l, nx, ny + i * 9.5, { baseline: "middle" }));
        ny += ls.length * 9.5 + 5;
      }
    };

    const bl = blocks(rows);
    let page = 1, y = header(M, true, 1);
    y = thead(y);
    const pageEnd = () => H - BOTTOM;
    for (const blk of bl) {
      const h = blk.reduce((a, r) => a + lineCount(r) * lh, 0);
      if (y + h > pageEnd() + 0.5) { doc.addPage(paper, "landscape"); page++; y = thead(header(M, false, page)); }
      y = drawRows(blk, y);
    }
    if (y + TOTALS > pageEnd() + 0.5) { doc.addPage(paper, "landscape"); page++; y = header(M, false, page); }
    totalsBlock(y + 12);
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      credit(doc, W, H - 14, 7);
      if (n > 1) { doc.setFontSize(7); doc.setTextColor(MUTED); doc.text(`Page ${i} of ${n}`, W - M, H - 14, { align: "right", baseline: "middle" }); }
    }
    return doc;
  }

  // (b) Door directory: sized to the inside of the panel door, big text, same two-column order. The referral
  // credit sits in the bottom page margin, outside the trim border.
  const DIR_SIZES = { letter: [612, 792], half: [396, 612] };
  function directorySize(opts) {
    opts = opts || {};
    if (DIR_SIZES[opts.size]) return { W: DIR_SIZES[opts.size][0], H: DIR_SIZES[opts.size][1] };
    const k = opts.unit === "mm" ? 72 / 25.4 : 72;
    const w = Number(opts.w), h = Number(opts.h);
    if (!(w > 0) || !(h > 0)) return { error: "Enter a width and a height for the custom size." };
    const W = w * k, H = h * k;
    if (Math.min(W, H) < 144 || Math.max(W, H) > 22 * 72 || Math.min(W, H) > 17 * 72) return { error: "Custom size must be between 2 in (51 mm) and 17 × 22 in (432 × 559 mm)." };
    return { W, H };
  }
  function directoryPdf(jsPDF, panel, opts) {
    opts = opts || {};
    const sz = directorySize(opts);
    if (sz.error) throw new Error(sz.error);
    const { W, H } = sz;
    const doc = new jsPDF({ unit: "pt", format: [W, H], orientation: W > H ? "landscape" : "portrait", compress: true });
    meta(doc, "Panel directory - " + (panel.name || "Panel"));
    const sys = SYSTEMS[panel.system], rows = grid(panel), date = opts.date || today();
    const m = Math.max(14, Math.min(28, Math.min(W, H) * 0.045)), mb = Math.max(m + 6, 20);
    const bx = m, by = m, bw = W - 2 * m, bh = H - m - mb;
    doc.setDrawColor(LINE); doc.setLineWidth(0.6); doc.setLineDashPattern([3, 2], 0); doc.rect(bx, by, bw, bh, "S"); doc.setLineDashPattern([], 0);
    const pad = Math.max(6, Math.min(14, bw * 0.03));
    const ts = Math.max(10, Math.min(22, bw / 20));
    doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
    fitText(doc, panel.name || "Panel directory", bx + pad, by + pad + ts * 0.55, bw - 2 * pad, ts, { min: 8 });
    const ss = Math.max(6, Math.min(10.5, ts * 0.5));
    doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED);
    const sub = [panel.location, sys.label, mainText(panel), panel.fedFrom ? "Fed from " + panel.fedFrom : ""].filter(Boolean).join("  ·  ");
    fitText(doc, sub, bx + pad, by + pad + ts + ss * 0.7, bw - 2 * pad, ss, { min: 5 });
    const foot = Math.max(5.5, Math.min(8, ss * 0.85));
    const gy0 = by + pad + ts + ss * 1.6 + 4, gy1 = by + bh - pad - foot * 1.8;
    const totalLines = rows.reduce((a, r) => a + lineCount(r), 0);
    const lh = (gy1 - gy0) / totalLines;
    const fs = Math.max(5, Math.min(12.5, lh * 0.56));
    const gut = Math.max(4, Math.min(10, bw * 0.02));
    const cw = (bw - 2 * pad - gut) / 2, numW = Math.max(fs * 2.3, 16);
    const colX = { left: bx + pad, right: bx + pad + cw + gut };
    // number boxes sit on the inner edges, next to where the breakers are
    const lay = side => side === "left" ? { nx: colX.left + cw - numW, dx: colX.left, dw: cw - numW } : { nx: colX.right, dx: colX.right + numW, dw: cw - numW };
    const cellText = (side, c, poles, y, h, muted) => {
      const L = lay(side), amps = bkrText(c.amps, poles), ap = 3;
      doc.setFont("helvetica", "normal"); doc.setFontSize(fs * 0.72);
      const aw = amps ? doc.getTextWidth(amps) + 4 : 0;
      doc.setTextColor(MUTED);
      if (amps) doc.text(amps, L.dx + L.dw - ap, y + h / 2, { align: "right", baseline: "middle" });
      doc.setTextColor(muted ? MUTED : INK); doc.setFont("helvetica", muted ? "italic" : "normal");
      fitCell(doc, c.desc || c.room, L.dx + ap + 1, y + h / 2, L.dw - aw - 2 * ap - 1, h, fs, { min: 4.5 });
    };
    const numBox = (side, label, y, h) => {
      const L = lay(side);
      doc.setFillColor(SOFT); doc.rect(L.nx, y, numW, h, "F");
      doc.setFont("helvetica", "bold"); doc.setTextColor(INK);
      fitText(doc, label, L.nx + numW / 2, y + h / 2, numW - 2, fs * 0.92, { align: "center", min: 4.5 });
    };
    const ys = [], ties = []; let y = gy0;
    for (const r of rows) { const h = lineCount(r) * lh; ys.push({ y, h }); y += h; }
    doc.setLineWidth(0.5);
    rows.forEach((r, i) => {
      const { y, h } = ys[i];
      for (const side of ["left", "right"]) {
        const cell = r[side], b = cell.b, L = lay(side);
        const under = (yy, from, w) => { doc.setDrawColor(LIGHT); doc.line(from, yy, from + w, yy); };
        if (!b) { numBox(side, String(cell.sp), y, h); under(y + h, colX[side], cw); continue; }
        if (b.type === "t") {
          const half = h / 2;
          [[b.a, "A"], [b.b, "B"]].forEach(([c, s], k) => { numBox(side, cell.sp + s, y + k * half, half); cellText(side, c, 1, y + k * half, half); });
          doc.setLineDashPattern([1, 1.5], 0); under(y + half, colX[side], cw); doc.setLineDashPattern([], 0);
          under(y + h, colX[side], cw);
          continue;
        }
        const poles = polesOf(b.type);
        numBox(side, String(cell.sp), y, h);
        under(y + h, L.nx, numW);
        if (cell.pole === 0) {
          let sh = 0; for (let k = 0; k < poles; k++) sh += ys[i + k] ? ys[i + k].h : lh;
          const c = b.type === "spare" && !b.a.desc ? { ...b.a, desc: "Spare" } : b.a;
          cellText(side, c, poles, y, sh, b.type === "spare");
          if (poles > 1) { // handle-tie bracket beside the numbers
            const bxx = side === "left" ? L.nx + 0.75 : L.nx + numW - 0.75;
            ties.push([bxx, y + 2, y + sh - 2]);
          }
          under(y + sh, L.dx, L.dw);
        }
      }
    });
    // handle-tie bars go on last, so later number boxes don't paint over them
    doc.setDrawColor(INK); doc.setLineWidth(1.2);
    for (const [tx, t0, t1] of ties) doc.line(tx, t0, tx, t1);
    doc.setDrawColor(LINE); doc.setLineWidth(0.6);
    doc.line(colX.left, gy0, colX.left + cw, gy0); doc.line(colX.right, gy0, colX.right + cw, gy0);
    doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED);
    const fy = by + bh - pad - foot * 0.5;
    fitText(doc, `Updated ${date}${panel.busAmps !== "" ? "  ·  Bus " + panel.busAmps + " A" : ""}  ·  ${panel.spaces} spaces`, bx + pad, fy, bw - 2 * pad, foot, { min: 4.5 });
    credit(doc, W, by + bh + (H - by - bh) / 2, Math.max(5, Math.min(6.5, (H - by - bh) * 0.32)));
    return doc;
  }

  // (c) Breaker label strips: one small label (number + short name) per circuit, cut lines between them.
  function labelItems(panel) {
    return circuits(panel).map(c => ({ num: c.id, name: c.desc || c.room || (c.type === "spare" ? "Spare" : "") }));
  }
  // 4 labels across; 0.5625 in tall, a little under the usual 1 in breaker pitch.
  function labelGeometry(paper) {
    const [W, H] = paper === "a4" ? [595.28, 841.89] : [612, 792];
    const M = 36, COLS = 4, lw = (W - 2 * M) / COLS, lh = 40.5, top = M + 34, bottom = 40;
    const rows = Math.floor((H - top - bottom) / lh);
    return { W, H, M, COLS, lw, lh, top, rows, per: rows * COLS };
  }
  function labelsPdf(jsPDF, panel, opts) {
    opts = opts || {};
    const paper = opts.paper === "a4" ? "a4" : "letter";
    const doc = new jsPDF({ unit: "pt", format: paper, orientation: "portrait", compress: true });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    meta(doc, "Breaker labels - " + (panel.name || "Panel"));
    const items = labelItems(panel);
    const { M, COLS, lw, lh: lhh, top, per } = labelGeometry(paper);
    const pages = Math.max(1, Math.ceil(items.length / per));
    for (let p = 0; p < pages; p++) {
      if (p) doc.addPage(paper, "portrait");
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(INK);
      fitText(doc, `Breaker labels - ${panel.name || "Panel"}`, M, M + 6, W - 2 * M, 11);
      doc.setFont("helvetica", "normal"); doc.setTextColor(MUTED);
      fitText(doc, "Cut on the dashed lines and stick each label beside its breaker. Print at 100% (actual size).", M, M + 20, W - 2 * M, 8);
      const chunk = items.slice(p * per, (p + 1) * per);
      if (!chunk.length) { doc.setTextColor(MUTED); doc.text("No circuits yet. Add breakers in the panel editor first.", M, top + 14); }
      const rowsUsed = Math.ceil(chunk.length / COLS);
      chunk.forEach((it, i) => {
        const r = Math.floor(i / COLS), c = i % COLS, x = M + c * lw, y = top + r * lhh;
        doc.setFont("helvetica", "bold"); doc.setTextColor(INK); doc.setFontSize(14);
        const nw = Math.max(34, Math.min(62, doc.getTextWidth(pdfSafe(it.num)) + 13));
        fitText(doc, it.num, x + 6, y + lhh / 2, nw - 10, 14, { min: 7 });
        doc.setFont("helvetica", "normal");
        const ls = wrapLines(doc, it.name, lw - nw - 6, 8.5, 2);
        const y0 = y + lhh / 2 - ((ls.length - 1) * 9.5) / 2;
        ls.forEach((l, k) => doc.text(l, x + nw, y0 + k * 9.5, { baseline: "middle" }));
      });
      if (rowsUsed) {
        // labels fill rows left to right, so row k holds cnt(k) labels; cut lines only run along real label edges
        const cnt = k => (k < 0 || k >= rowsUsed ? 0 : Math.min(COLS, chunk.length - k * COLS));
        doc.setDrawColor(LINE); doc.setLineWidth(0.5); doc.setLineDashPattern([3, 2.5], 0);
        for (let r = 0; r <= rowsUsed; r++) doc.line(M, top + r * lhh, M + Math.max(cnt(r - 1), cnt(r)) * lw, top + r * lhh);
        for (let c = 0; c <= COLS; c++) {
          let rowsHere = 0;
          for (let k = 0; k < rowsUsed; k++) if (cnt(k) >= Math.max(c, 1)) rowsHere++;
          if (rowsHere) doc.line(M + c * lw, top, M + c * lw, top + rowsHere * lhh);
        }
        doc.setLineDashPattern([], 0);
      }
      credit(doc, W, H - 18, 7);
    }
    return doc;
  }

  /* ------------------------------------------------------------ examples */
  const ck = (desc, room, amps, wire, prot, va) => ({ desc, room, amps, wire, prot, va });
  const br = (sp, type, a, b) => (b ? { sp, type, a, b } : { sp, type, a });
  const EXAMPLES = {
    home: {
      name: "Main panel", location: "Garage, north wall", fedFrom: "Utility meter", mainType: "breaker", mainAmps: 200, busAmps: 200, system: "1p240", spaces: 40,
      breakers: [
        br(1, "1", ck("Kitchen counter, left of sink", "Kitchen", 20, "12", "df", 1500)),
        br(2, "1", ck("Kitchen counter, right of sink", "Kitchen", 20, "12", "df", 1500)),
        br(3, "2", ck("Range", "Kitchen", 50, "6", "std", 8000)),
        br(4, "1", ck("Dishwasher", "Kitchen", 20, "12", "gfci", 1200)),
        br(6, "1", ck("Refrigerator", "Kitchen", 20, "12", "afci", 700)),
        br(7, "1", ck("Microwave", "Kitchen", 20, "12", "afci", 1500)),
        br(8, "1", ck("Laundry receptacles", "Laundry", 20, "12", "df", 1500)),
        br(9, "2", ck("Clothes dryer", "Laundry", 30, "10", "std", 5000)),
        br(10, "1", ck("Bathroom receptacles", "Hall bathroom", 20, "12", "gfci", 1500)),
        br(12, "2", ck("Water heater", "Basement", 30, "10", "std", 4500)),
        br(13, "t", ck("Bedroom 1 lights and receptacles", "Bedroom 1", 15, "14", "afci", 600), ck("Bedroom 2 lights and receptacles", "Bedroom 2", 15, "14", "afci", 600)),
        br(15, "1", ck("Living room lights and receptacles", "Living room", 15, "14", "afci", 800)),
        br(16, "2", ck("Air conditioner condenser", "Outside, east wall", 30, "10", "std", 3800)),
        br(17, "1", ck("Furnace", "Basement", 15, "14", "std", 800)),
        br(19, "1", ck("Garage receptacles", "Garage", 20, "12", "gfci", 1000)),
        br(20, "1", ck("Outdoor receptacles", "Outside", 20, "12", "gfci", 500)),
        br(21, "1", ck("Hall, stair and entry lights", "Hall", 15, "14", "afci", 400)),
        br(22, "spare", ck("", "", 20, "", "std", "")),
      ],
    },
    p3: {
      name: "Panel LP-1", location: "Electrical room 101", fedFrom: "Main switchboard MSB", mainType: "mlo", mainAmps: "", busAmps: 225, system: "3p208", spaces: 42,
      breakers: [
        br(1, "3", ck("Rooftop unit RTU-1", "Roof", 40, "8", "std", 14000)),
        br(2, "1", ck("Lighting, sales floor", "Sales floor", 20, "12", "std", 1600)),
        br(4, "1", ck("Lighting, stockroom", "Stockroom", 20, "12", "std", 900)),
        br(6, "1", ck("Exit and emergency lights", "Throughout", 20, "12", "std", 300)),
        br(7, "1", ck("Receptacles, front counter", "Front counter", 20, "12", "std", 1080)),
        br(8, "1", ck("Receptacles, office", "Office", 20, "12", "std", 1080)),
        br(9, "1", ck("Break room counter receptacles", "Break room", 20, "12", "gfci", 1500)),
        br(10, "1", ck("Refrigerator", "Break room", 20, "12", "std", 800)),
        br(11, "2", ck("Water heater", "Mechanical room", 30, "10", "std", 4500)),
        br(12, "1", ck("Microwave", "Break room", 20, "12", "std", 1500)),
        br(14, "1", ck("Sign", "Storefront", 20, "12", "std", 1200)),
        br(15, "1", ck("Restroom receptacles", "Restrooms", 20, "12", "gfci", 360)),
        br(16, "1", ck("Exterior lighting", "Outside", 20, "12", "std", 800)),
        br(17, "3", ck("Exhaust fan EF-1", "Roof", 15, "12", "std", 2400)),
        br(18, "1", ck("Receptacles, sales floor", "Sales floor", 20, "12", "std", 1080)),
        br(20, "1", ck("Network rack", "IT closet", 20, "12", "std", 1200)),
        br(22, "spare", ck("", "", 20, "", "std", "")),
        br(23, "spare", ck("", "", 20, "", "std", "")),
      ],
    },
  };
  EXAMPLES.p42 = { ...EXAMPLES.home, spaces: 42, breakers: [...EXAMPLES.home.breakers, br(23, "1", ck("Bathroom exhaust fan and lights", "Hall bathroom", 15, "14", "afci", 300)), br(24, "spare", ck("", "", 15, "", "std", ""))] };
  const example = key => normalize(JSON.parse(JSON.stringify(EXAMPLES[key] || EXAMPLES.home))).panel;

  return {
    SITE, CREDIT, CREDIT_URL, SYSTEMS, SYS_KEYS, QUICK_SPACES, MIN_SPACES, MAX_SPACES, TYPES, TYPE_KEYS, PROT, PROT_KEYS, PROT_SHORT, WIRES, wireLabel,
    normalize, normCircuit, normSpaces, blankPanel, rowOf, sideOf, legIndex, legOf, polesOf, spacesOf, circuitLabel, placeError, breakerAt, setType, setSpaces, setSystem,
    circuits, grid, totals, fmtInt, fmt1, parseCSV, toCSV, fromCSV, CSV_HEAD, pack, unpack, encodeShare, decodeShare, shareUrl,
    crc32, zipStore, xlsxRows, xlsxBytes, pdfSafe, schedulePdf, directorySize, directoryPdf, labelItems, labelGeometry, labelsPdf, EXAMPLES, example, bkrText, mainText,
  };
});
