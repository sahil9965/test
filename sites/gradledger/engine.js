/* GradLedger engine: grade scales, GPA, credits, hours, school years and course-description
   templates. Pure functions, no DOM. Works in the browser (window.GLEngine) and in Node (require). */
(function (root, factory) {
  const E = factory();
  if (typeof module === "object" && module.exports) module.exports = E;
  else root.GLEngine = E;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const YEARS = [8, 9, 10, 11, 12];
  const SUBJECTS = [
    ["eng", "English"], ["math", "Mathematics"], ["sci", "Science"], ["soc", "Social Studies"],
    ["lang", "World Language"], ["arts", "Fine Arts"], ["pe", "PE & Health"], ["bible", "Bible / Religion"],
    ["tech", "Technology & CTE"], ["elec", "Electives"],
  ];
  const SUBJECT_NAME = Object.fromEntries(SUBJECTS);
  const SUBJECT_NOUN = { eng: "English", math: "mathematics", sci: "science", soc: "social studies", lang: "world language", arts: "fine arts", pe: "physical education and health", bible: "Bible and religion", tech: "technology", elec: "elective" };
  const LEVELS = [["R", "Regular", ""], ["H", "Honors", "H"], ["AP", "AP", "AP"], ["DE", "Dual enrollment", "DE"]];
  const LEVEL_NAME = Object.fromEntries(LEVELS.map(l => [l[0], l[1]]));
  const LEVEL_MARK = Object.fromEntries(LEVELS.map(l => [l[0], l[2]]));

  const DEFAULT_SETTINGS = {
    plusMinus: true,        // A- = 3.7, B+ = 3.3 ... (false: whole letters only)
    pct: "10",              // percentage → letter: "10" (90/80/70/60) or "7" (93/85/77/70)
    aPlus: 4.0,             // A+ points (4.0 or 4.3)
    weights: { H: 0.5, AP: 1.0, DE: 1.0 },
    decimals: 2,
    hoursPerCredit: 120,
    paper: "letter",
    template: "classic",
    color: "#4338ca",
    showPercent: false,
    goals: { eng: 4, math: 4, sci: 3, soc: 3, lang: 2, arts: 1, pe: 1, total: 24 },
  };

  const clone = o => JSON.parse(JSON.stringify(o));
  function settingsWithDefaults(s) {
    const d = clone(DEFAULT_SETTINGS);
    s = s && typeof s === "object" ? s : {};
    const out = Object.assign(d, s);
    out.weights = Object.assign(clone(DEFAULT_SETTINGS.weights), s.weights || {});
    out.goals = Object.assign(clone(DEFAULT_SETTINGS.goals), s.goals || {});
    for (const k of ["H", "AP", "DE"]) { const w = Number(out.weights[k]); out.weights[k] = Number.isFinite(w) && w >= 0 && w <= 2 ? w : DEFAULT_SETTINGS.weights[k]; }
    out.decimals = out.decimals === 3 || out.decimals === "3" ? 3 : 2;
    const h = Number(out.hoursPerCredit); out.hoursPerCredit = Number.isFinite(h) && h >= 1 && h <= 1000 ? h : 120;
    out.aPlus = Number(out.aPlus) === 4.3 ? 4.3 : 4.0;
    out.pct = out.pct === "7" ? "7" : "10";
    out.plusMinus = out.plusMinus !== false;
    return out;
  }

  // ---- Grades -------------------------------------------------------------------------------
  // Points are kept as integers in thousandths so every GPA is computed exactly.
  const PM_POINTS = { "A+": 4000, A: 4000, "A-": 3700, "B+": 3300, B: 3000, "B-": 2700, "C+": 2300, C: 2000, "C-": 1700, "D+": 1300, D: 1000, "D-": 700, F: 0 };
  const PCT_10_PM = [[97, "A+"], [93, "A"], [90, "A-"], [87, "B+"], [83, "B"], [80, "B-"], [77, "C+"], [73, "C"], [70, "C-"], [67, "D+"], [63, "D"], [60, "D-"], [0, "F"]];
  const PCT_10 = [[90, "A"], [80, "B"], [70, "C"], [60, "D"], [0, "F"]];
  const PCT_7 = [[93, "A"], [85, "B"], [77, "C"], [70, "D"], [0, "F"]];

  function pctTable(s) { return s.pct === "7" ? PCT_7 : s.plusMinus ? PCT_10_PM : PCT_10; }
  function letterPoints(letter, s) {
    if (!s.plusMinus) return PM_POINTS[letter[0]];
    if (letter === "A+") return Math.round(s.aPlus * 1000);
    return PM_POINTS[letter];
  }
  function pctToLetter(p, s) { for (const [min, l] of pctTable(s)) if (p >= min) return l; return "F"; }

  /** Parse what a parent typed in a grade box.
   *  kind: graded | pass | ip | w | blank | invalid */
  function parseGrade(raw, settings) {
    const s = settingsWithDefaults(settings);
    const t = String(raw == null ? "" : raw).trim().toUpperCase().replace(/\s+/g, " ");
    if (!t) return { kind: "blank", label: "" };
    let m = t.match(/^([ABCDF])\s?([+\-−–])?$/);
    if (m) {
      const sign = m[2] ? (m[2] === "+" ? "+" : "-") : "";
      if (m[1] === "F" && sign) return { kind: "invalid", label: t };
      const letter = m[1] + sign;
      return { kind: "graded", letter, label: letter, pct: null, points: letterPoints(letter, s) };
    }
    m = t.match(/^(\d{1,3}(?:\.\d{1,2})?)\s?%?$/);
    if (m) {
      const p = Number(m[1]);
      if (p > 100) return { kind: "invalid", label: t };
      const letter = pctToLetter(p, s);
      return { kind: "graded", letter, label: letter, pct: p, points: letterPoints(letter, s) };
    }
    if (/^(P|PASS|PASSED|CR|CREDIT|S)$/.test(t)) return { kind: "pass", label: "P" };
    if (/^(IP|IN PROGRESS|INPROGRESS)$/.test(t)) return { kind: "ip", label: "IP" };
    if (/^(W|WD|WITHDRAWN)$/.test(t)) return { kind: "w", label: "W" };
    return { kind: "invalid", label: t };
  }

  function parseCredits(v) {
    const n = typeof v === "number" ? v : Number(String(v == null ? "" : v).trim().replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 20) return 0;
    return Math.round(n * 1000) / 1000;
  }
  const milli = n => Math.round(n * 1000);

  /** num/den rounded half-up to d decimals, using integer math (num, den are non-negative integers). */
  function ratio(num, den, d) {
    if (!den) return null;
    const p = Math.pow(10, d);
    const q = Math.floor((2 * num * p + den) / (2 * den));
    const s = String(q).padStart(d + 1, "0");
    return s.slice(0, s.length - d) + "." + s.slice(s.length - d);
  }

  function weightFor(level, s) { return level && s.weights[level] != null ? Number(s.weights[level]) || 0 : 0; }

  /** Compute unweighted and weighted GPA plus credit totals for a list of courses. */
  function computeGPA(courses, settings) {
    const s = settingsWithDefaults(settings);
    let qU = 0, qW = 0, att = 0, earned = 0, ip = 0, anyWeighted = false;
    const rows = [];
    for (const c of courses || []) {
      const g = parseGrade(c.grade, s);
      const cr = milli(parseCredits(c.credits));
      const row = { course: c, grade: g, credits: cr / 1000, points: null, bonus: 0, counted: false, earned: 0 };
      if (g.kind === "graded") {
        const bonus = g.points > 0 ? milli(weightFor(c.level, s)) : 0; // no weighting on failing grades
        row.points = g.points / 1000; row.bonus = bonus / 1000; row.counted = cr > 0;
        qU += g.points * cr; qW += (g.points + bonus) * cr; att += cr;
        if (bonus > 0 && cr > 0) anyWeighted = true;
        if (g.points > 0) { earned += cr; row.earned = cr / 1000; }
        row.qU = g.points * cr / 1e6; row.qW = (g.points + bonus) * cr / 1e6;
      } else if (g.kind === "pass") { earned += cr; row.earned = cr / 1000; }
      else if (g.kind === "ip" || g.kind === "blank") { ip += cr; }
      rows.push(row);
    }
    const d = s.decimals;
    return {
      rows,
      unweighted: ratio(qU, att * 1000, d),
      weighted: ratio(qW, att * 1000, d),
      unweightedExact: att ? qU / (att * 1000) : null,
      weightedExact: att ? qW / (att * 1000) : null,
      qualityU: qU / 1e6, qualityW: qW / 1e6,
      attempted: att / 1000, earned: earned / 1000, inProgress: ip / 1000,
      anyWeighted,
    };
  }

  function byYear(courses) {
    const m = {};
    for (const y of YEARS) m[y] = [];
    for (const c of courses || []) (m[c.year] || (m[c.year] = [])).push(c);
    return m;
  }

  /** Earned credits per subject area (passing grades and P), plus credits in progress. */
  function subjectTotals(courses, settings) {
    const s = settingsWithDefaults(settings);
    const out = {};
    for (const [k] of SUBJECTS) out[k] = { earned: 0, ip: 0 };
    for (const c of courses || []) {
      const k = out[c.subject] ? c.subject : "elec";
      const g = parseGrade(c.grade, s);
      const cr = milli(parseCredits(c.credits));
      if ((g.kind === "graded" && g.points > 0) || g.kind === "pass") out[k].earned += cr;
      else if (g.kind === "ip" || g.kind === "blank") out[k].ip += cr;
    }
    for (const k in out) { out[k].earned /= 1000; out[k].ip /= 1000; }
    return out;
  }

  function fmtCredits(n) {
    const v = Math.round((Number(n) || 0) * 1000) / 1000;
    const str = String(v);
    return str.includes(".") ? str : str + ".0";
  }
  function fmtPoints(n) { return (Math.round(n * 1000) / 1000).toFixed(n * 10 % 1 ? 2 : 1); }

  // ---- Hours and credits ----------------------------------------------------------------------
  /** Credits from logged minutes: exact value and the value rounded DOWN to a step (0.25 / 0.5). */
  function creditsFromMinutes(minutes, hoursPerCredit, step) {
    const m = Math.max(0, Math.round(Number(minutes) || 0));
    const hpc = Number(hoursPerCredit) > 0 ? Number(hoursPerCredit) : 120;
    const exact = m / (60 * hpc);
    const st = Number(step) > 0 ? Number(step) : 0.25;
    // floor(m / (60*hpc*st)) * st, computed so that exact multiples never fall below due to float error
    const units = Math.floor(m / (60 * hpc * st) + 1e-9);
    return { exact, rounded: Math.round(units * st * 1000) / 1000 };
  }
  function planHours(credits, hoursPerCredit, weeks, daysPerWeek) {
    const total = (Number(credits) || 0) * (Number(hoursPerCredit) || 0);
    const w = Number(weeks) > 0 ? Number(weeks) : 36, d = Number(daysPerWeek) > 0 ? Number(daysPerWeek) : 5;
    const perWeek = total / w;
    return { total, perWeek, minutesPerDay: perWeek * 60 / d };
  }
  function fmtHours(minutes) {
    const m = Math.max(0, Math.round(Number(minutes) || 0));
    const h = Math.floor(m / 60), r = m % 60;
    return !h ? `${r} min` : r ? `${h} h ${r} min` : `${h} h`;
  }
  function round1(n) { return Math.round(n * 10) / 10; }

  // ---- Dates ----------------------------------------------------------------------------------
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function fmtDateLong(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m || +m[2] < 1 || +m[2] > 12) return "";
    return `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
  }
  function fmtDateShort(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[2]}/${m[3]}/${m[1]}` : "";
  }
  function fmtMonth(ym) {
    const m = String(ym || "").match(/^(\d{4})-(\d{2})/);
    if (!m || +m[2] < 1 || +m[2] > 12) return "";
    return `${MONTHS[+m[2] - 1]} ${m[1]}`;
  }
  /** School-year label for a grade, from the graduation year: grade 12 of the class of 2027 is 2026–2027. */
  function yearLabel(gradYear, grade) {
    const gy = parseInt(gradYear, 10);
    if (!gy || gy < 1950 || gy > 2100) return "";
    return `${gy - (13 - grade)}–${gy - (12 - grade)}`;
  }
  function gradeName(y) { return y === 8 ? "Grade 8 (high school credit)" : `Grade ${y}`; }

  // ---- Course descriptions ----------------------------------------------------------------------
  const ACTIVITIES = [
    ["reading", "assigned reading"], ["essays", "essays and written assignments"], ["research", "a research paper"],
    ["problems", "daily problem sets"], ["labs", "hands-on lab work with written lab reports"], ["discussion", "discussion of readings and ideas"],
    ["projects", "hands-on projects"], ["presentations", "oral presentations"], ["online", "video or online lessons"],
    ["coop", "a weekly co-op or outside class"], ["fieldtrips", "field trips"], ["practice", "regular practice and performance"],
    ["fitness", "a regular fitness routine and skill practice"],
  ];
  const EVALUATIONS = [
    ["tests", "tests and quizzes"], ["final", "a final exam"], ["written", "graded written work"], ["labs", "lab reports"],
    ["projects", "projects"], ["oral", "oral narration and discussion"], ["presentations", "presentations"],
    ["participation", "participation and completion of assignments"], ["portfolio", "a portfolio of completed work"], ["skills", "demonstration of skills"],
  ];
  const ACT = Object.fromEntries(ACTIVITIES), EVAL = Object.fromEntries(EVALUATIONS);

  function joinList(arr) {
    arr = (arr || []).map(x => String(x).trim()).filter(Boolean);
    if (arr.length <= 1) return arr[0] || "";
    if (arr.length === 2) return / and /.test(arr[0] + " " + arr[1]) ? `${arr[0]} as well as ${arr[1]}` : `${arr[0]} and ${arr[1]}`;
    return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
  }
  /** Split a typed list on new lines, semicolons, or commas that are not inside parentheses. */
  function splitList(str) {
    const out = []; let cur = "", depth = 0;
    for (const ch of String(str || "")) {
      if (ch === "(") depth++;
      if (ch === ")") depth = Math.max(0, depth - 1);
      if ((ch === "\n" || ch === ";" || (ch === "," && depth === 0))) { out.push(cur); cur = ""; } else cur += ch;
    }
    out.push(cur);
    return out.map(x => x.trim().replace(/^[-•*]\s*/, "").replace(/[.;]+$/, "").trim()).filter(Boolean);
  }
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  // Lower-case a typed list item's first letter only when it is clearly an ordinary phrase
  // ("Cell structure and function"), never for names or titles ("The Great Gatsby", "Shakespeare").
  const lowerFirst = s => {
    const words = String(s).split(/\s+/);
    if (words.length < 2 || !/^[A-Z][a-z]+$/.test(words[0].replace(/[,:;]$/, ""))) return s;
    if (words.slice(1).some(w => /[A-Z]/.test(w))) return s;
    if (/^(I|English|French|Spanish|Latin|German|American|British|World|Bible|Roman|Greek|Christian)$/.test(words[0])) return s;
    return s[0].toLowerCase() + s.slice(1);
  };

  function durationOf(c) {
    if (c.dur === "year" || c.dur === "sem") return c.dur;
    return parseCredits(c.credits) && parseCredits(c.credits) < 1 ? "sem" : "year";
  }

  /** Build a course description from template text (no AI). style: standard | concise | detailed */
  function generateDescription(c, opts) {
    opts = opts || {};
    const gen = c.gen || {};
    const title = String(c.title || "This course").trim();
    const dur = durationOf(c) === "sem" ? "one-semester" : "full-year";
    const subj = SUBJECT_NOUN[c.subject] || "elective";
    const topics = splitList(gen.topics).map(lowerFirst);
    const materials = splitList(gen.materials);
    const acts = (gen.acts || []).map(k => ACT[k]).filter(Boolean).concat(splitList(gen.actsOther));
    const evals = (gen.evals || []).map(k => EVAL[k]).filter(Boolean).concat(splitList(gen.evalsOther));
    const hours = Number(opts.hours) > 0 ? Math.round(Number(opts.hours)) : 0;
    const yr = YEARS.includes(Number(c.year)) ? Number(c.year) : null;
    const when = yr ? ` completed in grade ${yr}${opts.yearLabel ? ` (${opts.yearLabel})` : ""}` : "";
    const credits = parseCredits(c.credits);
    const crText = credits ? `${fmtCredits(credits)} ${credits === 1 ? "credit" : "credits"}` : "";
    let opener;
    if (c.level === "DE") {
      opener = `${title} is a ${dur} college course taken through dual enrollment${c.provider ? ` at ${c.provider}` : ""}${yr ? ` in grade ${yr}${opts.yearLabel ? ` (${opts.yearLabel})` : ""}` : ""}`;
      opener += c.college ? `, earning ${c.college} of college credit.` : ".";
      if (crText) opener += ` It is recorded as ${crText} on the high school transcript.`;
    } else {
      const adj = c.level === "H" ? "honors-level " : c.level === "AP" ? "Advanced Placement (AP) " : "";
      opener = `${title} is a ${dur} ${adj}${subj} course${when}.`;
      if (c.provider) opener += ` It was taken through ${c.provider}.`;
    }
    const style = opts.style || gen.style || "standard";
    if (style === "concise") {
      const head = `${title} (${[LEVEL_NAME[c.level] && c.level !== "R" ? LEVEL_NAME[c.level] : "", dur === "full-year" ? "full year" : "one semester", crText].filter(Boolean).join(", ")})`;
      const parts = [topics.length ? `${head}: ${joinList(topics)}.` : `${head}.`];
      if (materials.length) parts.push(`Materials: ${joinList(materials)}.`);
      if (evals.length) parts.push(`Evaluation: ${joinList(evals)}.`);
      return parts.join(" ");
    }
    if (style === "detailed") {
      const lines = [opener];
      if (topics.length) lines.push(`Topics: ${cap(topics.join("; "))}.`);
      if (materials.length) lines.push(`Materials: ${materials.join("; ")}.`);
      if (acts.length) lines.push(`Coursework: ${cap(joinList(acts))}.`);
      if (evals.length) lines.push(`Evaluation: ${cap(joinList(evals))}.`);
      if (hours) lines.push(`Time: approximately ${hours} hours of coursework.`);
      return lines.join("\n");
    }
    const parts = [opener];
    if (topics.length) parts.push(`Topics covered included ${joinList(topics)}.`);
    if (materials.length) parts.push(`The main resources were ${joinList(materials)}.`);
    if (acts.length) parts.push(`Coursework included ${joinList(acts)}.`);
    if (evals.length) parts.push(`Progress was evaluated through ${joinList(evals)}.`);
    if (hours) parts.push(`The student completed approximately ${hours} hours of coursework.`);
    return parts.join(" ");
  }

  // Common high school courses with typical topics. Starting points only: parents edit them to match what was actually studied.
  const LIBRARY = [
    ["English 9", "eng", 1, "reading and analysis of short stories, novels, poetry, and drama; literary elements such as theme, plot, characterization, and point of view; grammar, usage, and mechanics; vocabulary development; paragraph and essay writing; the writing process from outline to revision"],
    ["English 10", "eng", 1, "analysis of classic and world literature; analytical and argumentative essays; research and citation skills; grammar and style; vocabulary development"],
    ["American Literature", "eng", 1, "major American writers from the colonial era to the twentieth century; literary movements including Romanticism, Realism, and Modernism; close reading of novels, short stories, poetry, and essays; analytical essay writing; connecting literature to its historical context"],
    ["British Literature", "eng", 1, "major British works from Beowulf through the twentieth century; Chaucer, Shakespeare, and the Romantic poets; literary periods and their historical context; poetry analysis; literary analysis essays"],
    ["World Literature", "eng", 1, "literature from several world regions and time periods; epics, novels, short stories, and poetry in translation; comparing themes across cultures; analytical writing"],
    ["Composition", "eng", 1, "the writing process: planning, drafting, revising, and editing; narrative, expository, persuasive, and analytical essays; thesis statements and paragraph structure; research and MLA citation; grammar and style"],
    ["Public Speaking", "elec", 0.5, "speech organization and outlining; informative, persuasive, and impromptu speeches; delivery skills such as voice, eye contact, and posture; audience analysis; evaluating speeches"],
    ["Pre-Algebra", "math", 1, "integers and rational numbers; ratios, proportions, and percents; expressions and equations; introductory geometry and measurement; basic statistics and probability"],
    ["Algebra 1", "math", 1, "real numbers and order of operations; solving linear equations and inequalities; graphing linear functions, slope, and intercepts; systems of linear equations; exponents and polynomials; factoring; quadratic equations; introduction to functions"],
    ["Geometry", "math", 1, "points, lines, planes, and angles; deductive reasoning and two-column proofs; congruent and similar triangles; properties of polygons and circles; right triangles and introductory trigonometry; area, surface area, and volume; coordinate geometry and transformations"],
    ["Algebra 2", "math", 1, "linear, quadratic, and polynomial functions; systems of equations and inequalities; rational and radical expressions; exponential and logarithmic functions; complex numbers; sequences and series; introductory probability and statistics"],
    ["Precalculus", "math", 1, "functions and their graphs; polynomial, rational, exponential, and logarithmic functions; trigonometric functions and identities; vectors; conic sections; sequences and series; an introduction to limits"],
    ["Calculus", "math", 1, "limits and continuity; derivatives and their applications; related rates and optimization; integrals and the Fundamental Theorem of Calculus; applications of integration"],
    ["Statistics", "math", 1, "describing data with graphs and numerical summaries; probability; sampling and experimental design; normal distributions; confidence intervals; hypothesis testing; correlation and linear regression"],
    ["Consumer Math", "math", 1, "budgeting; banking and interest; paychecks and taxes; credit and loans; insurance; comparison shopping"],
    ["Physical Science", "sci", 1, "the scientific method and measurement; matter and its properties; atoms and the periodic table; chemical reactions; motion, forces, and energy; waves, sound, and light; electricity and magnetism"],
    ["Earth Science", "sci", 1, "minerals and rocks; plate tectonics, earthquakes, and volcanoes; weathering and erosion; weather and climate; oceans; the solar system and stars"],
    ["Biology", "sci", 1, "the scientific method and lab safety; the chemistry of life; cell structure and function; photosynthesis and cellular respiration; cell division; genetics and DNA; evolution and classification; ecology; human body systems"],
    ["Chemistry", "sci", 1, "measurement and significant figures; atomic structure and the periodic table; chemical bonding; chemical formulas and equations; stoichiometry; gas laws; solutions; acids and bases; thermochemistry"],
    ["Physics", "sci", 1, "motion in one and two dimensions; Newton's laws of motion; work, energy, and power; momentum; circular motion and gravitation; waves and sound; electricity and circuits; magnetism"],
    ["Anatomy and Physiology", "sci", 1, "anatomical terminology; cells and tissues; the skeletal and muscular systems; the nervous system; the cardiovascular and respiratory systems; the digestive system; the endocrine and reproductive systems"],
    ["Environmental Science", "sci", 1, "ecosystems and biodiversity; population dynamics; energy resources; water and air quality; land use and agriculture; climate"],
    ["World History", "soc", 1, "ancient civilizations; classical Greece and Rome; the Middle Ages; the Renaissance and Reformation; the Age of Exploration; revolutions and the rise of nations; the World Wars; the modern world"],
    ["U.S. History", "soc", 1, "Native American cultures and European colonization; the American Revolution and the Constitution; westward expansion; the Civil War and Reconstruction; industrialization and immigration; the World Wars; the Civil Rights Movement; modern America"],
    ["American Government", "soc", 0.5, "the founding documents; federalism and separation of powers; the legislative, executive, and judicial branches; elections and political parties; civil rights and liberties; state and local government"],
    ["Economics", "soc", 0.5, "scarcity and opportunity cost; supply and demand; market structures; money and banking; GDP, inflation, and unemployment; fiscal and monetary policy"],
    ["World Geography", "soc", 1, "map skills; physical geography; world regions and their cultures; population and migration; economic geography"],
    ["Psychology", "soc", 0.5, "history and approaches of psychology; research methods; the brain and behavior; sensation and perception; learning and memory; human development; personality; psychological disorders and treatment"],
    ["Spanish 1", "lang", 1, "pronunciation and the alphabet; greetings and everyday vocabulary; present-tense verbs including ser, estar, and ir; noun-adjective agreement; asking and answering questions; reading short texts; Spanish-speaking cultures"],
    ["Spanish 2", "lang", 1, "review of the present tense; the preterite and imperfect past tenses; reflexive verbs; direct and indirect object pronouns; commands; expanded vocabulary; conversation and short compositions"],
    ["French 1", "lang", 1, "pronunciation; greetings and everyday vocabulary; present-tense regular verbs and common irregular verbs (être, avoir, aller, faire); articles and gender; asking questions; French-speaking cultures"],
    ["Latin 1", "lang", 1, "pronunciation and basic grammar; noun declensions and cases; verb conjugations; vocabulary and English derivatives; translating sentences and short passages; Roman history and culture"],
    ["Studio Art", "arts", 1, "elements and principles of design; drawing from observation; perspective; color theory; painting techniques; art history and artist studies; keeping a sketchbook and portfolio"],
    ["Music Theory", "arts", 1, "notation, rhythm, and meter; scales and key signatures; intervals and chords; harmony and chord progressions; ear training; composition"],
    ["Music Performance", "arts", 1, "instrumental or vocal technique and daily practice; repertoire study; sight-reading; applied music theory; performances and recitals"],
    ["Theater", "arts", 1, "acting techniques; script analysis; voice and movement; stagecraft; rehearsal and performance"],
    ["Photography", "arts", 0.5, "camera operation and exposure; composition; lighting; photo editing; history of photography; portfolio development"],
    ["Physical Education", "pe", 1, "cardiovascular fitness; strength and flexibility training; individual and team sport skills; rules and sportsmanship; setting and tracking fitness goals"],
    ["Health", "pe", 0.5, "nutrition; physical fitness; mental and emotional health; disease prevention; substance abuse prevention; first aid and safety; healthy relationships"],
    ["Personal Finance", "elec", 0.5, "budgeting and saving; banking; credit and debt; income and taxes; investing basics; insurance; consumer protection"],
    ["Computer Science", "tech", 1, "programming fundamentals: variables, conditionals, loops, and functions; data structures such as lists and dictionaries; algorithms and problem solving; debugging and testing; building small projects"],
    ["Logic", "elec", 0.5, "informal fallacies; deductive arguments and syllogisms; propositional logic and truth tables; evaluating arguments"],
    ["Bible Survey", "bible", 1, "an overview of the Old and New Testaments; biblical history and geography; major themes and literary genres; methods of Bible study"],
    ["Life Skills", "elec", 0.5, "cooking and nutrition; meal planning and grocery budgeting; basic sewing and mending; home maintenance; time management"],
  ].map(([title, subject, credits, topics]) => ({ title, subject, credits, topics }));

  const norm = s => String(s || "").toLowerCase().replace(/&/g, "and").replace(/\b(i)\b/g, "1").replace(/\bii\b/g, "2").replace(/\biii\b/g, "3").replace(/\b(honors|ap|advanced placement|dual enrollment|de|intro to|introduction to|introductory|course)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  const ALIASES = { "english 1": "English 9", "english 2": "English 10", "algebra": "Algebra 1", "us history": "U.S. History", "u s history": "U.S. History", "american history": "U.S. History", "government": "American Government", "civics": "American Government", "us government": "American Government", "art": "Studio Art", "pe": "Physical Education", "biology 1": "Biology", "chemistry 1": "Chemistry", "physics 1": "Physics", "pre calculus": "Precalculus", "calculus 1": "Calculus", "programming": "Computer Science", "computer programming": "Computer Science", "speech": "Public Speaking", "drama": "Theater", "theatre": "Theater", "anatomy": "Anatomy and Physiology", "geography": "World Geography", "earth and space science": "Earth Science", "music": "Music Performance" };
  function findLibrary(title) {
    const n = norm(title);
    if (!n) return null;
    const alias = ALIASES[n];
    return LIBRARY.find(l => norm(l.title) === n || (alias && l.title === alias)) || null;
  }

  // ---- Legend text ------------------------------------------------------------------------------
  function scaleRows(settings) {
    const s = settingsWithDefaults(settings);
    const t = pctTable(s);
    return t.map(([min, l], i) => {
      const max = i === 0 ? 100 : t[i - 1][0] - 1;
      return { letter: l, range: min === 0 ? `below ${t[i - 1][0]}` : `${min}–${max}`, points: (letterPoints(l, s) / 1000).toFixed(1) };
    });
  }
  function legendText(settings, usedLevels) {
    const s = settingsWithDefaults(settings);
    const scale = scaleRows(s).map(r => `${r.letter} ${r.range} = ${r.points}`).join(", ");
    const used = (usedLevels || ["H", "AP", "DE"]).filter(l => l !== "R" && s.weights[l] > 0);
    const w = used.map(l => `${LEVEL_NAME[l]} +${fmtPoints(s.weights[l])}`).join(", ");
    return {
      scale: `Grading scale: ${scale}.`,
      weights: w ? `Weighted GPA adds ${w} to passing grades.` : "",
      formula: "GPA = sum of (grade points × credits) ÷ sum of graded credits. Pass (P) and in-progress (IP) courses are not included in GPA.",
    };
  }

  // ---- Data model -------------------------------------------------------------------------------
  let idn = 0;
  const uid = () => Date.now().toString(36) + (idn++).toString(36) + Math.random().toString(36).slice(2, 6);
  function newCourse(year, init) {
    return Object.assign({ id: uid(), year: year || 9, title: "", subject: "eng", level: "R", grade: "", credits: 1, dur: "", provider: "", transfer: false, college: "", hours: "", desc: "", gen: { materials: "", topics: "", acts: [], evals: [], style: "standard" } }, init || {});
  }
  function newStudent(init) {
    return Object.assign({ id: uid(), name: "", dob: "", address: "", studentId: "", gradDate: "", years: {}, courses: [], tests: [], notes: "", log: [], attendance: {}, comments: {} }, init || {});
  }
  function emptyData() {
    const st = newStudent();
    return { v: 1, school: { name: "", address: "", phone: "", email: "", admin: "", logo: "", signature: "" }, settings: clone(DEFAULT_SETTINGS), students: [st], current: st.id, savedAt: "", backupAt: "" };
  }

  // Maximum lengths kept when records are loaded. The UI sets the same limits as maxlength on every
  // field, so nothing a parent types is ever cut off silently on the next visit.
  const LIMITS = { schoolName: 200, address: 500, phone: 60, email: 120, admin: 200, name: 200, studentId: 60, notes: 4000, yearLabel: 40, attendance: 200, comments: 3000, title: 200, grade: 20, provider: 200, college: 60, desc: 6000, materials: 1000, topics: 2000, other: 500, logNote: 300, testName: 80, testDate: 20, testScore: 80 };
  const str = (v, max) => String(v == null ? "" : v).slice(0, max || 2000);
  const isImg = v => typeof v === "string" && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 2e6;
  /** Validate and normalise data loaded from storage or from a backup file. Throws on garbage. */
  function normalize(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.students)) throw new Error("This file isn't a GradLedger backup.");
    const d = emptyData();
    const sc = raw.school || {};
    d.school = { name: str(sc.name, LIMITS.schoolName), address: str(sc.address, LIMITS.address), phone: str(sc.phone, LIMITS.phone), email: str(sc.email, LIMITS.email), admin: str(sc.admin, LIMITS.admin), logo: isImg(sc.logo) ? sc.logo : "", signature: isImg(sc.signature) ? sc.signature : "" };
    d.settings = settingsWithDefaults(raw.settings);
    if (!/^#[0-9a-f]{6}$/i.test(d.settings.color)) d.settings.color = DEFAULT_SETTINGS.color;
    if (!["classic", "modern", "minimal"].includes(d.settings.template)) d.settings.template = "classic";
    if (!["letter", "a4"].includes(d.settings.paper)) d.settings.paper = "letter";
    d.settings.showPercent = !!d.settings.showPercent;
    for (const k of Object.keys(d.settings.goals)) { const n = Number(d.settings.goals[k]); d.settings.goals[k] = Number.isFinite(n) && n >= 0 && n <= 99 ? n : DEFAULT_SETTINGS.goals[k] || 0; }
    d.students = raw.students.slice(0, 50).map(s => {
      const st = newStudent({ id: str(s.id, 40) || uid() });
      st.name = str(s.name, LIMITS.name); st.dob = /^\d{4}-\d{2}-\d{2}$/.test(s.dob) ? s.dob : ""; st.address = str(s.address, LIMITS.address);
      st.studentId = str(s.studentId, LIMITS.studentId); st.gradDate = /^\d{4}-\d{2}$/.test(s.gradDate) ? s.gradDate : ""; st.notes = str(s.notes, LIMITS.notes);
      st.years = {};
      for (const y of YEARS) if (s.years && s.years[y]) st.years[y] = { label: str(s.years[y].label, LIMITS.yearLabel) };
      st.attendance = {}; st.comments = {};
      for (const y of YEARS) {
        if (s.attendance && s.attendance[y] != null) st.attendance[y] = str(s.attendance[y], LIMITS.attendance);
        if (s.comments && s.comments[y] != null) st.comments[y] = str(s.comments[y], LIMITS.comments);
      }
      st.courses = (Array.isArray(s.courses) ? s.courses : []).slice(0, 400).map(c => {
        const g = c.gen || {};
        return newCourse(YEARS.includes(Number(c.year)) ? Number(c.year) : 9, {
          id: str(c.id, 40) || uid(), title: str(c.title, LIMITS.title), subject: SUBJECT_NAME[c.subject] ? c.subject : "elec",
          level: LEVEL_NAME[c.level] ? c.level : "R", grade: str(c.grade, LIMITS.grade), credits: c.credits === "" ? "" : parseCredits(c.credits),
          dur: c.dur === "year" || c.dur === "sem" ? c.dur : "", provider: str(c.provider, LIMITS.provider), transfer: !!c.transfer, college: str(c.college, LIMITS.college),
          hours: c.hours === "" || c.hours == null ? "" : Math.max(0, Math.min(5000, Number(c.hours) || 0)), desc: str(c.desc, LIMITS.desc),
          gen: { materials: str(g.materials, LIMITS.materials), topics: str(g.topics, LIMITS.topics), acts: (Array.isArray(g.acts) ? g.acts : []).filter(k => ACT[k]), evals: (Array.isArray(g.evals) ? g.evals : []).filter(k => EVAL[k]), actsOther: str(g.actsOther, LIMITS.other), evalsOther: str(g.evalsOther, LIMITS.other), style: ["standard", "concise", "detailed"].includes(g.style) ? g.style : "standard" },
        });
      });
      const ids = new Set(st.courses.map(c => c.id));
      st.log = (Array.isArray(s.log) ? s.log : []).slice(0, 20000).filter(e => e && ids.has(e.courseId) && /^\d{4}-\d{2}-\d{2}$/.test(e.date)).map(e => ({ id: str(e.id, 40) || uid(), date: e.date, courseId: e.courseId, min: Math.max(0, Math.min(24 * 60, Math.round(Number(e.min) || 0))), note: str(e.note, LIMITS.logNote) }));
      st.tests = (Array.isArray(s.tests) ? s.tests : []).slice(0, 30).map(t => ({ name: str(t.name, LIMITS.testName), date: str(t.date, LIMITS.testDate), score: str(t.score, LIMITS.testScore) }));
      return st;
    });
    if (!d.students.length) d.students = [newStudent()];
    d.current = d.students.some(s => s.id === raw.current) ? raw.current : d.students[0].id;
    d.savedAt = str(raw.savedAt, 40); d.backupAt = str(raw.backupAt, 40);
    return d;
  }

  function loggedMinutes(student, courseId) {
    let m = 0;
    for (const e of student.log || []) if (e.courseId === courseId) m += e.min;
    return m;
  }
  /** Hours used in a description: logged time if any, otherwise the manual hours field. */
  function courseHours(student, c) {
    const m = loggedMinutes(student, c.id);
    if (m > 0) return Math.round(m / 60);
    const h = Number(c.hours);
    return h > 0 ? Math.round(h) : 0;
  }

  function csvCell(v) { const s = String(v == null ? "" : v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
  function logToCSV(student) {
    const byId = Object.fromEntries((student.courses || []).map(c => [c.id, c]));
    const rows = [["Date", "Course", "Grade level", "Minutes", "Hours", "Note"]];
    for (const e of [...(student.log || [])].sort((a, b) => a.date.localeCompare(b.date))) {
      const c = byId[e.courseId] || {};
      rows.push([e.date, c.title || "", c.year || "", e.min, (e.min / 60).toFixed(2), e.note || ""]);
    }
    return rows.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }

  /** Example student used for previews and the "Load example" button. Grades chosen to exercise every rule. */
  function exampleStudent(gradYear) {
    const gy = gradYear || 2027;
    const st = newStudent({ name: "Emma Rose Carter", dob: `${gy - 18}-04-12`, address: "214 Maple Lane\nSpringfield, OH 45501", gradDate: `${gy}-05`, notes: "Volunteer, county library reading program (2 years). Piano: 8 years of private lessons, two recitals per year." });
    const add = (year, title, subject, level, grade, credits, extra) => st.courses.push(newCourse(year, Object.assign({ title, subject, level, grade, credits }, extra || {})));
    add(8, "Algebra 1", "math", "R", "A", 1);
    add(9, "English 9", "eng", "R", "A", 1); add(9, "Geometry", "math", "R", "B+", 1); add(9, "Biology", "sci", "H", "A-", 1);
    add(9, "World History", "soc", "R", "B", 1); add(9, "Spanish 1", "lang", "R", "A", 1); add(9, "Studio Art", "arts", "R", "A", 0.5); add(9, "Physical Education", "pe", "R", "P", 0.5);
    add(10, "English 10", "eng", "H", "A-", 1); add(10, "Algebra 2", "math", "R", "B", 1); add(10, "Chemistry", "sci", "R", "B+", 1);
    add(10, "U.S. History", "soc", "R", "A", 1); add(10, "Spanish 2", "lang", "R", "A-", 1); add(10, "Health", "pe", "R", "A", 0.5); add(10, "Music Performance", "arts", "R", "A", 0.5);
    add(11, "American Literature", "eng", "R", "A", 1); add(11, "Precalculus", "math", "H", "B+", 1); add(11, "Physics", "sci", "R", "B", 1);
    add(11, "American Government", "soc", "DE", "A", 1, { provider: "Maple Valley Community College", college: "3 semester hours", title: "American Government (POLS 1100)", dur: "sem" });
    add(11, "Economics", "soc", "R", "A", 0.5); add(11, "Personal Finance", "elec", "R", "A", 0.5); add(11, "Computer Science", "tech", "R", "A-", 1);
    add(12, "British Literature", "eng", "R", "IP", 1); add(12, "Statistics", "math", "AP", "IP", 1); add(12, "Anatomy and Physiology", "sci", "R", "IP", 1); add(12, "Psychology", "soc", "DE", "IP", 1, { provider: "Maple Valley Community College", college: "3 semester hours", dur: "sem" });
    st.tests = [{ name: "SAT", date: `${gy - 1}-03`, score: "1340 (ERW 680, Math 660)" }];
    return st;
  }

  return {
    YEARS, SUBJECTS, SUBJECT_NAME, LEVELS, LEVEL_NAME, LEVEL_MARK, DEFAULT_SETTINGS, ACTIVITIES, EVALUATIONS, LIBRARY,
    settingsWithDefaults, parseGrade, parseCredits, computeGPA, byYear, subjectTotals, ratio, fmtCredits, fmtPoints,
    creditsFromMinutes, planHours, fmtHours, round1, fmtDateLong, fmtDateShort, fmtMonth, yearLabel, gradeName,
    joinList, splitList, generateDescription, findLibrary, scaleRows, legendText, durationOf,
    uid, newCourse, newStudent, emptyData, normalize, loggedMinutes, courseHours, logToCSV, exampleStudent, clone, LIMITS,
  };
});
