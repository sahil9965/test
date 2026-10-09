// Roomproof core: templates, report model, EXIF date reading, ZIP project files and layout maths.
// Pure functions with no DOM access, shared by app.js, pdf.js and the tests.
(function (root) {
  "use strict";

  // ---------- Rating scales ----------
  // issue: true puts the item in the "summary of issues". tone drives the colour.
  const SCALES = {
    condition: { label: "Condition", levels: [
      { k: "good", label: "Good", tone: "ok" },
      { k: "fair", label: "Fair", tone: "warn", issue: true },
      { k: "damaged", label: "Damaged", tone: "bad", issue: true },
      { k: "na", label: "N/A", tone: "na" },
    ] },
    punch: { label: "Status", levels: [
      { k: "open", label: "Open", tone: "bad", issue: true },
      { k: "progress", label: "In progress", tone: "warn", issue: true },
      { k: "done", label: "Done", tone: "ok" },
    ] },
    clean: { label: "Result", levels: [
      { k: "done", label: "Done", tone: "ok" },
      { k: "attention", label: "Needs attention", tone: "warn", issue: true },
      { k: "damage", label: "Damage found", tone: "bad", issue: true },
      { k: "na", label: "N/A", tone: "na" },
    ] },
  };
  const level = (scaleKey, k) => (SCALES[scaleKey] || SCALES.condition).levels.find(l => l.k === k) || null;

  // ---------- Templates ----------
  const HOME = [
    ["Entry & hallway", ["Front door & locks", "Walls & ceiling", "Floor", "Lights & switches"]],
    ["Living room", ["Walls & ceiling", "Floor / carpet", "Windows & screens", "Blinds / curtains", "Lights & outlets"]],
    ["Kitchen", ["Walls & ceiling", "Floor", "Cabinets & drawers", "Countertops", "Sink & faucet", "Stove / oven", "Refrigerator", "Dishwasher"]],
    ["Bedroom 1", ["Walls & ceiling", "Floor / carpet", "Windows", "Closet", "Door"]],
    ["Bathroom", ["Walls & ceiling", "Floor", "Toilet", "Sink & vanity", "Tub / shower", "Mirror & cabinet", "Exhaust fan"]],
    ["Other", ["Smoke & CO alarms", "Heating / AC", "Water heater", "Laundry", "Keys & remotes"]],
    ["Outside", ["Balcony / patio", "Parking / garage"]],
  ];
  const UK = [
    ["Front door & hallway", ["Front door & locks", "Walls & ceiling", "Flooring", "Light fittings", "Smoke alarm"]],
    ["Living room", ["Walls & ceiling", "Carpet / flooring", "Windows & sills", "Curtains / blinds", "Light fittings & sockets", "Radiator", "Furniture"]],
    ["Kitchen", ["Walls & ceiling", "Flooring", "Units & worktops", "Sink & taps", "Oven & hob", "Extractor hood", "Fridge freezer", "Washing machine"]],
    ["Bedroom 1", ["Walls & ceiling", "Carpet / flooring", "Windows & sills", "Wardrobe", "Bed & mattress"]],
    ["Bathroom", ["Bath / shower", "Toilet", "Basin & taps", "Tiles & sealant", "Extractor fan", "Mirror"]],
    ["Meters & keys", ["Electricity meter reading", "Gas meter reading", "Water meter reading", "Keys handed over"]],
    ["Garden & exterior", ["Garden", "Bins", "Shed / garage"]],
  ];
  const AU = [
    ["Entrance / hall", ["Door & screen door", "Walls", "Ceiling", "Floor coverings", "Light fittings", "Power points"]],
    ["Lounge / living", ["Walls", "Ceiling", "Floor coverings", "Windows & screens", "Blinds / curtains", "Light fittings", "Power points"]],
    ["Kitchen", ["Walls", "Benchtops", "Cupboards & drawers", "Sink & taps", "Stove / oven", "Rangehood", "Dishwasher"]],
    ["Bedroom 1", ["Walls", "Ceiling", "Floor coverings", "Windows & screens", "Built-in wardrobe"]],
    ["Bathroom", ["Shower & screen", "Bath", "Basin & taps", "Toilet", "Tiles & grout", "Exhaust fan", "Mirror"]],
    ["Laundry", ["Tub & taps", "Floor"]],
    ["Outside", ["Garden", "Garage / carport", "Smoke alarms", "Keys & remotes"]],
  ];
  const TEMPLATES = {
    general: {
      name: "General photo report", title: "Photo report", scale: "condition",
      prepared: "Prepared by", other: "Client / recipient", ref: "Reference",
      roles: ["Prepared by", "Received by"],
      rooms: [["Location 1", ["Overview", "Detail"]]],
      roomWord: "location",
    },
    movein: {
      name: "Move-in inspection", title: "Move-in inspection report", scale: "condition",
      prepared: "Tenant", other: "Landlord / property manager", ref: "Unit / lease ref",
      roles: ["Tenant", "Landlord / property manager"], rooms: HOME, roomWord: "room",
      followUp: { template: "moveout", title: "Move-out inspection report", labels: ["Move-in", "Move-out"] },
    },
    moveout: {
      name: "Move-out inspection", title: "Move-out inspection report", scale: "condition",
      prepared: "Tenant", other: "Landlord / property manager", ref: "Unit / lease ref",
      roles: ["Tenant", "Landlord / property manager"], rooms: HOME, roomWord: "room",
    },
    punch: {
      name: "Punch list", title: "Punch list", scale: "punch",
      prepared: "Contractor", other: "Client / site contact", ref: "Job number",
      roles: ["Contractor", "Client"], roomWord: "area",
      rooms: [
        ["Kitchen", ["Paint touch-ups", "Cabinet doors & hardware", "Grout & caulk"]],
        ["Bathroom", ["Caulk & sealant", "Fixtures & accessories"]],
        ["Living areas", ["Paint touch-ups", "Trim & baseboards", "Doors & hardware"]],
        ["Exterior", ["Siding & trim", "Site cleanup"]],
      ],
    },
    beforeafter: {
      name: "Before & after", title: "Before and after photo report", scale: "clean",
      prepared: "Prepared by", other: "Client", ref: "Job number",
      roles: ["Technician", "Client"], pair: true, labels: ["Before", "After"], roomWord: "area",
      rooms: [["Work area 1", ["Wide view", "Close-up"]]],
    },
    cleaning: {
      name: "Cleaning job", title: "Cleaning report", scale: "clean",
      prepared: "Cleaner / company", other: "Client", ref: "Job number",
      roles: ["Cleaner", "Client"], pair: true, labels: ["Before", "After"], roomWord: "room",
      rooms: [
        ["Kitchen", ["Oven", "Stovetop", "Sink & faucet", "Counters", "Floor"]],
        ["Bathroom", ["Toilet", "Shower / tub", "Sink & mirror", "Floor"]],
        ["Living areas", ["Floors", "Surfaces & baseboards", "Windows"]],
        ["Bedrooms", ["Floors", "Surfaces"]],
      ],
    },
    turnover: {
      name: "Airbnb / rental turnover", title: "Turnover report", scale: "clean",
      prepared: "Cleaner / co-host", other: "Host", ref: "Booking / stay",
      roles: ["Cleaner", "Host"], roomWord: "room",
      rooms: [
        ["Arrival check", ["Entry & lockbox", "Condition as found"]],
        ["Kitchen", ["Dishes & cookware", "Appliances", "Counters & sink", "Supplies restocked"]],
        ["Bathroom", ["Toilet & shower", "Towels", "Toiletries restocked"]],
        ["Bedroom", ["Bed & linens", "Under the bed", "Closet"]],
        ["Living area", ["Sofa & cushions", "TV & remotes", "Floors"]],
        ["Damage & missing items", ["Damage", "Missing items"]],
        ["Final check", ["Thermostat set", "Windows & doors locked", "Trash out"]],
      ],
    },
    ukinventory: {
      name: "UK inventory photo schedule", title: "Inventory photo schedule (check-in)", scale: "condition",
      prepared: "Landlord / agent / clerk", other: "Tenant", ref: "Inventory ref",
      roles: ["Landlord / agent", "Tenant"], rooms: UK, roomWord: "room",
      followUp: { template: "ukinventory", title: "Check-out photo schedule", labels: ["Check-in", "Check-out"] },
    },
    auentry: {
      name: "AU entry condition photos", title: "Entry condition report: photo addendum", scale: "condition",
      prepared: "Tenant / renter", other: "Landlord / agent", ref: "Condition report ref",
      roles: ["Tenant / renter", "Landlord / agent"], rooms: AU, roomWord: "room",
      followUp: { template: "auentry", title: "Exit condition report: photo addendum", labels: ["Entry", "Exit"] },
    },
  };
  const ISSUE_TITLE = { condition: "Summary of issues (Fair or Damaged)", punch: "Open items", clean: "Items needing attention" };

  let seq = 0;
  const uid = p => (p || "x") + Date.now().toString(36) + (++seq).toString(36) + Math.random().toString(36).slice(2, 6);

  function todayIso(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function roomsFrom(list) {
    return list.map(([name, items]) => ({ id: uid("r"), name, items: items.map(n => ({ id: uid("i"), name: n, rating: "", notes: "", photos: [] })) }));
  }

  function newReport(key, opts = {}) {
    const t = TEMPLATES[key] || TEMPLATES.general;
    return {
      v: 1, template: TEMPLATES[key] ? key : "general",
      title: t.title, property: "", date: opts.date || todayIso(), ref: "",
      preparedBy: "", otherParty: "", company: "", logo: "", notes: "",
      pair: !!t.pair, labels: t.labels ? [...t.labels] : ["Before", "After"], compare: null,
      rooms: roomsFrom(opts.rooms || t.rooms),
      photos: {},
      signatures: t.roles.map(role => ({ role, name: "", img: "", date: "" })),
      settings: { paper: opts.paper || "a4", perPage: 2, stamp: true, checklist: true, photoLog: true, signPage: true },
    };
  }
  const tpl = r => TEMPLATES[r.template] || TEMPLATES.general;
  const scaleOf = r => tpl(r).scale;

  // Start a follow-up (move-out from move-in, check-out from check-in): rooms and items are kept,
  // earlier photos go on the left ("before") side and earlier ratings are kept for comparison.
  function followUp(earlier, opts = {}) {
    const t0 = tpl(earlier);
    const f = t0.followUp || { template: earlier.template, title: (earlier.title || t0.title) + " (follow-up)", labels: ["Earlier", "Now"] };
    const r = newReport(f.template, { date: opts.date, paper: earlier.settings && earlier.settings.paper });
    Object.assign(r, {
      title: f.title, property: earlier.property || "", ref: earlier.ref || "", preparedBy: earlier.preparedBy || "",
      otherParty: earlier.otherParty || "", company: earlier.company || "", logo: earlier.logo || "",
      pair: true, labels: [...f.labels], compare: { title: earlier.title || "", date: earlier.date || "" },
    });
    r.settings = { ...r.settings, ...(earlier.settings || {}) };
    r.photos = {};
    r.rooms = (earlier.rooms || []).map(room => ({
      id: uid("r"), name: room.name,
      items: room.items.map(it => {
        const ids = it.photos.filter(id => earlier.photos[id]);
        ids.forEach(id => { r.photos[id] = { ...earlier.photos[id], phase: "before" }; });
        return { id: uid("i"), name: it.name, rating: "", notes: "", prevRating: it.rating || "", prevNotes: it.notes || "", photos: ids };
      }),
    }));
    return r;
  }

  // ---------- Dates ----------
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = n => String(n).padStart(2, "0");
  // "YYYY-MM-DDTHH:MM(:SS)" local wall-clock time -> parts, or null.
  function parseLocal(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(s || ""));
    if (!m) return null;
    const p = { y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0), s: +(m[6] || 0), hasTime: m[4] != null };
    if (p.y < 1900 || p.y > 2200 || p.mo < 1 || p.mo > 12 || p.d < 1 || p.d > 31 || p.h > 23 || p.mi > 59 || p.s > 59) return null;
    return p;
  }
  function formatDate(iso) { const p = parseLocal(iso); return p ? `${p.d} ${MONTHS[p.mo - 1]} ${p.y}` : ""; }
  // Burned-in stamp: unambiguous in every country, like a camera date stamp.
  function formatStamp(takenAt) { const p = parseLocal(takenAt); return p ? `${pad(p.d)} ${MONTHS[p.mo - 1]} ${p.y}  ${pad(p.h)}:${pad(p.mi)}` : ""; }
  function formatTaken(takenAt, offset, seconds) {
    const p = parseLocal(takenAt); if (!p) return "";
    return `${p.d} ${MONTHS[p.mo - 1]} ${p.y}, ${pad(p.h)}:${pad(p.mi)}${seconds ? ":" + pad(p.s) : ""}${offset ? ` (UTC${offset})` : ""}`;
  }
  const SOURCE = { exif: "camera data (EXIF)", file: "file date", manual: "entered manually" };
  function localFromMs(ms) {
    const d = new Date(ms);
    if (!isFinite(d)) return null;
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? "+" : "-";
    return {
      takenAt: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
      offset: `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`,
    };
  }

  // ---------- EXIF (JPEG) ----------
  // Returns { takenAt, offset, orientation } from DateTimeOriginal / DateTimeDigitized,
  // OffsetTimeOriginal and Orientation, or null when the file has no usable EXIF date.
  function readExif(buf) {
    const v = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return null;
    let p = 2;
    while (p + 4 <= v.byteLength) {
      if (v.getUint8(p) !== 0xFF) return null;
      const marker = v.getUint8(p + 1);
      if (marker === 0xFF) { p++; continue; }
      if (marker === 0xD9 || marker === 0xDA) return null;
      if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) { p += 2; continue; }
      const len = v.getUint16(p + 2);
      if (len < 2) return null;
      if (marker === 0xE1 && len >= 16 && p + 10 <= v.byteLength && v.getUint32(p + 4) === 0x45786966 && v.getUint16(p + 8) === 0) {
        try { return parseTiff(v, p + 10, Math.min(v.byteLength, p + 2 + len)); } catch { return null; }
      }
      p += 2 + len;
    }
    return null;
  }
  function parseTiff(v, t, end) {
    const order = v.getUint16(t);
    const le = order === 0x4949;
    if (!le && order !== 0x4D4D) return null;
    const ok = (o, n) => t + o >= t && t + o + n <= end;
    const u16 = o => (ok(o, 2) ? v.getUint16(t + o, le) : 0);
    const u32 = o => (ok(o, 4) ? v.getUint32(t + o, le) : 0);
    if (u16(2) !== 42) return null;
    const ifd = off => {
      const out = {};
      if (!off || !ok(off, 2)) return out;
      const n = Math.min(u16(off), 500);
      for (let i = 0; i < n; i++) {
        const e = off + 2 + i * 12;
        if (!ok(e, 12)) break;
        out[u16(e)] = { type: u16(e + 2), count: u32(e + 4), e };
      }
      return out;
    };
    const ascii = ent => {
      if (!ent || ent.type !== 2) return "";
      const off = ent.count <= 4 ? ent.e + 8 : u32(ent.e + 8);
      let s = "";
      for (let i = 0; i < Math.min(ent.count, 64) && ok(off + i, 1); i++) { const c = v.getUint8(t + off + i); if (!c) break; s += String.fromCharCode(c); }
      return s.trim();
    };
    const ifd0 = ifd(u32(4));
    const orientation = ifd0[0x0112] ? u16(ifd0[0x0112].e + 8) : 1;
    let raw = "", offset = "";
    if (ifd0[0x8769]) {
      const ex = ifd(u32(ifd0[0x8769].e + 8));
      raw = ascii(ex[0x9003]) || ascii(ex[0x9004]);
      offset = ascii(ex[0x9011]) || ascii(ex[0x9012]);
    }
    const takenAt = exifDate(raw);
    if (!/^[+-]\d{2}:\d{2}$/.test(offset)) offset = "";
    return takenAt ? { takenAt, offset, orientation } : (orientation !== 1 ? { takenAt: "", offset: "", orientation } : null);
  }
  function exifDate(s) {
    const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s || "");
    if (!m) return "";
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || "00"}`;
    return parseLocal(iso) ? iso : "";
  }

  // ---------- ZIP (stored entries; reads stored + deflated) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const enc = s => new TextEncoder().encode(s);
  function dosTime(d) {
    return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
  }
  function zip(files, when = new Date()) {
    const { time, date } = dosTime(when);
    const parts = [], central = [];
    let off = 0;
    for (const f of files) {
      const name = enc(f.name), data = f.data instanceof Uint8Array ? f.data : enc(String(f.data));
      const crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((s, a) => s + a.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
    const all = [...parts, ...central, new Uint8Array(e.buffer)];
    const out = new Uint8Array(all.reduce((s, a) => s + a.length, 0));
    let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }
  async function inflateRaw(u8) {
    if (typeof DecompressionStream === "undefined") throw new Error("This browser can't read compressed ZIP entries.");
    const ds = new DecompressionStream("deflate-raw");
    const buf = await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(buf);
  }
  async function unzip(u8) {
    const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let e = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 22 - 65535); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("Not a ZIP file.");
    const n = v.getUint16(e + 10, true);
    let p = v.getUint32(e + 16, true);
    const out = new Map();
    const dec = new TextDecoder();
    for (let i = 0; i < n; i++) {
      if (v.getUint32(p, true) !== 0x02014b50) throw new Error("Damaged ZIP directory.");
      const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), crc = v.getUint32(p + 16, true);
      const nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + xl + cl;
      if (name.endsWith("/")) continue;
      if (v.getUint32(lo, true) !== 0x04034b50) throw new Error("Damaged ZIP entry.");
      const start = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true);
      const raw = u8.subarray(start, start + csize);
      let data;
      if (method === 0) data = raw.slice();
      else if (method === 8) data = await inflateRaw(raw);
      else throw new Error("Unsupported ZIP compression.");
      if (crc32(data) !== crc) throw new Error(`File ${name} is damaged (checksum mismatch).`);
      out.set(name, data);
    }
    return out;
  }

  // ---------- Report helpers ----------
  const hasContent = it => !!(it.rating || (it.notes || "").trim() || it.photos.length || it.prevRating || (it.prevNotes || "").trim());
  // In pair mode photos are shown as rows of [before, after]; otherwise in item order.
  function pairRows(r, it) {
    const b = it.photos.filter(id => r.photos[id] && r.photos[id].phase === "before");
    const a = it.photos.filter(id => r.photos[id] && r.photos[id].phase !== "before");
    const rows = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) rows.push([b[i] || null, a[i] || null]);
    return rows;
  }
  // Photo numbers (1-based) in the order they appear in the PDF.
  function numberPhotos(r) {
    const num = {};
    let n = 0;
    for (const room of r.rooms) for (const it of room.items) {
      if (r.pair) for (const [b, a] of pairRows(r, it)) { if (b) num[b] = ++n; if (a) num[a] = ++n; }
      else for (const id of it.photos) if (r.photos[id]) num[id] = ++n;
    }
    return num;
  }
  // "3", "3-5", "3, 7"
  function photoRefs(ids, num) {
    const ns = ids.map(id => num[id]).filter(Boolean).sort((a, b) => a - b);
    if (!ns.length) return "";
    const runs = [];
    for (const x of ns) { const last = runs[runs.length - 1]; if (last && x === last[1] + 1) last[1] = x; else runs.push([x, x]); }
    return runs.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(", ");
  }
  function summarize(r) {
    const sc = scaleOf(r);
    const counts = {};
    let items = 0, rated = 0, photos = 0;
    const issues = [];
    for (const room of r.rooms) for (const it of room.items) {
      photos += it.photos.filter(id => r.photos[id]).length;
      if (!hasContent(it)) continue;
      items++;
      if (it.rating) { rated++; counts[it.rating] = (counts[it.rating] || 0) + 1; }
      const lv = level(sc, it.rating);
      if (lv && lv.issue) issues.push({ room, item: it, level: lv });
    }
    return { items, rated, photos, counts, issues, scale: sc };
  }

  // ---------- Layout maths ----------
  // Fit an image (iw x ih) inside a box, centred.
  function fitRect(iw, ih, bx, by, bw, bh) {
    const s = Math.min(bw / iw, bh / ih);
    const w = iw * s, h = ih * s;
    return { x: bx + (bw - w) / 2, y: by + (bh - h) / 2, w, h };
  }
  // Grid for photo pages. In pair mode each cell holds a before/after pair (full width).
  function grid(perPage, pair) {
    if (pair) return { cols: 1, rows: { 1: 1, 2: 2, 4: 3, 6: 3 }[perPage] || 2 };
    return { 1: { cols: 1, rows: 1 }, 2: { cols: 1, rows: 2 }, 4: { cols: 2, rows: 2 }, 6: { cols: 2, rows: 3 } }[perPage] || { cols: 1, rows: 2 };
  }
  function pageSize(paper) { return paper === "letter" ? { w: 215.9, h: 279.4 } : { w: 210, h: 297 }; }
  // Pixel size to render a photo for a box of bw x bh mm (about 170 dpi, capped).
  function targetPx(bwMm, bhMm, cap = 1600) {
    const dpi = 170;
    return Math.min(cap, Math.round(Math.max(bwMm, bhMm) / 25.4 * dpi));
  }

  // ---------- Markup ----------
  // Shapes use normalised 0..1 coordinates of the (upright) photo.
  function rotateShapes(shapes, dir) {
    const f = dir > 0 ? ([x, y]) => [1 - y, x] : ([x, y]) => [y, 1 - x];
    return (shapes || []).map(s => s.t === "pen"
      ? { ...s, pts: s.pts.map(f) }
      : (() => { const [x1, y1] = f([s.x1, s.y1]); const [x2, y2] = f([s.x2, s.y2]); return { ...s, x1, y1, x2, y2 }; })());
  }

  // ---------- PDF text ----------
  // The PDF uses the built-in Helvetica (Windows-1252). Keep those characters, fold accents
  // on others (Ł -> L), and replace anything left (emoji, CJK) with "?".
  const CP1252_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  const FOLD = { "Ł": "L", "ł": "l", "Đ": "D", "đ": "d", "Ħ": "H", "ħ": "h", "ı": "i", "Ŀ": "L", "ŀ": "l", "‐": "-", "‑": "-", "‒": "-", "−": "-", "→": "->", "←": "<-", "≈": "~", "≤": "<=", "≥": ">=", " ": " ", " ": " ", " ": " " };
  function pdfText(s) {
    let out = "";
    for (const ch of String(s ?? "").normalize("NFC")) {
      const c = ch.codePointAt(0);
      if (ch === "\n" || ch === "\t" || (c >= 0x20 && c <= 0x7E) || (c >= 0xA0 && c <= 0xFF) || CP1252_EXTRA.includes(ch)) { out += ch === "\t" ? " " : ch; continue; }
      if (FOLD[ch]) { out += FOLD[ch]; continue; }
      if (c < 0x20 || (c >= 0x7F && c < 0xA0) || (c >= 0xFE00 && c <= 0xFE0F) || c === 0x200D) continue;
      const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (base && [...base].every(b => { const k = b.codePointAt(0); return (k >= 0x20 && k <= 0x7E) || (k >= 0xA0 && k <= 0xFF); })) out += base;
      else out += "?";
    }
    return out;
  }
  const safeName = s => (pdfText(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "report").toLowerCase();

  const api = {
    SCALES, TEMPLATES, ISSUE_TITLE, SOURCE, MONTHS, level, uid, todayIso, newReport, followUp, tpl, scaleOf, roomsFrom,
    parseLocal, formatDate, formatStamp, formatTaken, localFromMs, readExif, exifDate,
    crc32, zip, unzip, hasContent, pairRows, numberPhotos, photoRefs, summarize,
    fitRect, grid, pageSize, targetPx, rotateShapes, pdfText, safeName,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RPCore = api;
})(typeof self !== "undefined" ? self : globalThis);
