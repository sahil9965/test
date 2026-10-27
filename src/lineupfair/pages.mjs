// Generates every LineupFair page (home, landing pages, guide, about, privacy) from one layout.
// Usage: node src/lineupfair/pages.mjs   (writes into sites/lineupfair/)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/lineupfair");
const C = createRequire(import.meta.url)(join(OUT, "core.js"));
const URL = "https://lineup.roohsites.com";
const NAME = "LineupFair";
const ACCENT = "#0f4c81";
const DATE = "2026-10-25", DATE_H = "25 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

/* ---- demo charts come from the real solver, so the examples on the page are what the tool produces ---- */
const NAMES = ["Ava", "Ben", "Chloe", "Dylan", "Ella", "Finn", "Grace", "Hugo", "Isla", "Jack", "Kai", "Lily", "Mia", "Noah", "Owen"];
function demoGame(n, innings, extra = {}) {
  return C.normalizeGame({ innings, seed: 3, players: NAMES.slice(0, n).map((name, k) => ({ id: k + 1, name })), ...extra });
}
function demoTable(G, caption) {
  const r = C.solve(G);
  if (!r.ok || r.issues.length) throw new Error("demo chart is not clean: " + JSON.stringify(r.errors || r.issues));
  const head = Array.from({ length: G.innings }, (_, i) => `<th scope="col">${i + 1}</th>`).join("");
  const rows = G.players.map(p => `<tr><th scope="row">${esc(p.name)}</th>${r.stats[p.id].seq.map(v => (v === "B" ? `<td class="b">Bench</td>` : `<td class="${C.isInfield(G, v) ? "i" : ""}">${v}</td>`)).join("")}</tr>`).join("");
  return `      <div class="tablewrap"><table class="chartdemo"><caption>${caption}</caption><thead><tr><th scope="col">Player</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function benchMath(innings, fielders, from, to) {
  const rows = [];
  for (let n = from; n <= to; n++) {
    const slots = (n - fielders) * innings, base = Math.floor(slots / n), extra = slots % n;
    const split = extra === 0 ? `everyone sits ${base}` : `${extra} player${extra === 1 ? "" : "s"} sit${extra === 1 ? "s" : ""} ${base + 1}, ${n - extra} sit${n - extra === 1 ? "s" : ""} ${base}`;
    rows.push(`          <tr><td>${n}</td><td>${n - fielders}</td><td>${slots}</td><td>${split}</td></tr>`);
  }
  return `      <table>
        <thead><tr><th>Players</th><th>On the bench each inning</th><th>Bench slots in ${innings} innings</th><th>Fair split</th></tr></thead>
        <tbody>
${rows.join("\n")}
        </tbody>
      </table>`;
}

const FOOT = `  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">Fielding rotation generator</a></li><li><a href="/fair-playing-time-lineup-generator">Fair playing time</a></li><li><a href="/printable-baseball-lineup-card">Printable lineup card</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Presets and guides</h4><ul><li><a href="/tball-fielding-rotation">T-ball rotation</a></li><li><a href="/coach-pitch-lineup-generator">Coach pitch lineup</a></li><li><a href="/softball-lineup-generator">Softball lineup</a></li><li><a href="/youth-baseball-position-rotation">Youth position rotation</a></li></ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. ${NAME} is an independent tool, not affiliated with any league, governing body, team or app. League rules vary, so check yours.</p>
  </footer>`;

const RELATED = `      <h2>More tools and guides</h2>
      <ul class="related">
        <li><a href="/">Baseball fielding rotation generator</a></li>
        <li><a href="/fair-playing-time-lineup-generator">Fair playing time</a></li>
        <li><a href="/tball-fielding-rotation">T-ball</a></li>
        <li><a href="/coach-pitch-lineup-generator">Coach pitch</a></li>
        <li><a href="/softball-lineup-generator">Softball</a></li>
        <li><a href="/printable-baseball-lineup-card">Printable lineup card</a></li>
        <li><a href="/youth-baseball-position-rotation">Youth position rotation</a></li>
      </ul>`;

function head({ title, desc, path, graph }) {
  const url = URL + (path === "/" ? "/" : path);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="${ACCENT}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/base.css">
<link rel="stylesheet" href="/style.css">
<script src="/config.js"></script>
<script defer src="/pro.js"></script>
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}
</script>
</head>`;
}

const PUBLISHER = { "@type": "Organization", name: "Rooh Sites", url: "https://roohsites.com/" };
const faqLd = faq => ({ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
const FEATURES = [
  "Inning-by-inning fielding chart for 1 to 9 innings", "Standard 9, 10 fielders with 4 outfielders, coach pitch, T-ball and custom formats",
  "Bench fairness: nobody sits twice before everyone has sat once", "No back-to-back bench innings and no repeat positions", "Minimum infield innings and pitcher and catcher limits",
  "Absences, late arrivals, never-plays exclusions and position locks", "Tap two cells to swap players with live rule checking", "Continuous batting order with rotate for next game",
  "Season tally of bench, infield and positions", "Dugout card, index card, field diagram, season and blank lineup card PDFs", "Share link that carries the chart in the URL",
];
const appLd = (name, path, desc) => ({
  "@type": "WebApplication", name, url: URL + path, description: desc, applicationCategory: "SportsApplication",
  operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, featureList: FEATURES, publisher: PUBLISHER,
});
const howToLd = (name, steps) => ({ "@type": "HowTo", name, totalTime: "PT5M", step: steps.map(([n, t]) => ({ "@type": "HowToStep", name: n, text: strip(t) })) });
const stepsHtml = steps => `      <ol class="steps">\n${steps.map(([n, t]) => `        <li><strong>${esc(n)}.</strong> ${t}</li>`).join("\n")}\n      </ol>`;
const faqHtml = faq => `      <h2 id="faq">Frequently asked questions</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}`;
const updated = extra => `      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the Rooh Sites team.${extra ? " " + extra : ""}</p>`;

function page({ path, title, desc, h1, lead, quick, badges, tool, body, faq = [], crumb, schema = [], noRelated, note }) {
  const isHome = path === "/";
  const graph = [];
  if (!isHome) graph.push({ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` },
    { "@type": "ListItem", position: 2, name: crumb || h1, item: URL + path }] });
  graph.push(...schema);
  if (faq.length) graph.push(faqLd(faq));
  const navHtml = isHome
    ? `<a href="#how">How it works</a><a href="/printable-baseball-lineup-card">Printable card</a><a href="#faq">FAQ</a>`
    : `<a href="/">Rotation generator</a><a href="/youth-baseball-position-rotation">Position rotation guide</a><a href="/about">About</a>`;
  const toolAttr = tool && tool.preset ? ` data-preset="${tool.preset}"` : "";
  return `${head({ title, desc, path, graph })}
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="top">
    <a class="logo" href="/"><img src="/favicon.svg" alt="" width="28" height="28">${NAME}</a>
    <nav aria-label="Main">${navHtml}</nav>
  </header>
  <main id="main">
${isHome ? "" : `    <p class="crumbs"><a href="/">${NAME}</a> › ${esc(crumb || h1)}</p>\n`}    <section class="hero">
      <h1>${esc(h1)}</h1>
      <p class="lead">${lead}</p>
${badges ? `      <ul class="badges">${badges.map(b => `<li>${b}</li>`).join("")}</ul>\n` : ""}    </section>
${quick ? `    <div class="content narrow quick"><p class="tldr"><strong>Quick answer:</strong> ${quick}</p></div>\n` : ""}${tool ? `    <section class="tool" aria-label="Fielding rotation generator"><div id="lf-tool"${toolAttr}><noscript><p class="notice">LineupFair needs JavaScript to build the chart. Nothing is uploaded; it all runs in your browser.</p></noscript></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? faqHtml(faq) + "\n" : ""}${noRelated ? "" : RELATED + "\n"}${updated(note === undefined ? "General coaching information. League rules vary, so check yours." : note)}
    </article>
  </main>
${FOOT}
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

const LEAGUE = "Every rule in LineupFair is a coach setting, not league policy. Leagues differ on minimum playing time, batting orders, pitching and substitutions, so check your league's rules before you rely on a chart.";

/* ------------------------------------------------------------------ home */
const homeSteps = [
  ["Set the game", "Pick the number of innings (1 to 9, default 6) and the defensive format: Standard 9, 10 fielders with four outfielders, Coach pitch, T-ball or Custom."],
  ["Add your players", "Type names one at a time or paste a list with one player per line and an optional jersey number. Mark anyone who is absent, set an arrival inning for late players, and tick positions a player should never play, such as catcher or pitcher."],
  ["Choose the rules", "Switch on the fairness rules you want: bench fairness, no sitting twice in a row, a minimum number of infield innings, no repeat positions and limits at pitcher and catcher."],
  ["Generate and adjust", "Press Generate chart. If you want a different version, press Shuffle. Tap one cell and then another in the same inning to swap two players; the summary and the rule check update at once."],
  ["Print or share", "Download the dugout card for a clipboard, a 5 × 8 in index card version or the field diagram, set the batting order, and copy the share link for your assistant coach."],
];
const homeFaq = [
  ["Is LineupFair really free?", "Yes. Every feature is free, with no account and no limit on how often you use it. Each PDF has a small “Made with LineupFair” line in the bottom margin."],
  ["How does it keep playing time fair?", "It decides who sits first. Each inning the bench goes to the players who have sat the least so far, so nobody sits a second time before everyone available has sat once, and bench innings differ by at most one among players there for the same innings. Then it fills the positions inning by inning, avoiding repeats and keeping infield time even."],
  ["Does it work for softball, T-ball and coach pitch?", "Yes. Standard 9 covers baseball and fastpitch softball. The 10-fielder format adds a fourth outfielder for slow-pitch and recreational softball. Coach pitch can include a player at pitcher beside the coach, or drop that position. T-ball allows up to 12 fielders with rover and extra outfield spots, and a catcher is optional."],
  ["What if someone is absent or shows up late?", "Mark the player absent and the chart is rebuilt without them. For a late arrival, choose the inning they arrive in; they will not appear before it, and in the batting order they are added at the end. If there are fewer available players than positions in some inning, the tool says which inning and how many players are missing."],
  ["Can I keep a player out of catcher or pitcher?", "Yes. Open Position limits on that player and tick the positions they should never play. These are hard constraints that the chart always obeys. You can also lock a player to a position for certain innings, for example pitcher in innings 1 and 2."],
  ["Can I change the chart by hand?", "Yes. Tap a cell, then tap another cell in the same inning to swap the two players. The fairness summary updates immediately and any broken rule is listed by name and player. A swap that breaks a lock or a “never plays” choice is flagged as a hard problem."],
  ["Is my roster uploaded anywhere?", "No. Names, numbers and charts are processed in your browser and kept in this browser's local storage. The share link contains the chart inside the link itself; it is not stored on a server. Analytics never receive names or other text you type."],
  ["Does it follow my league's rules, such as Little League?", "No, and it cannot know them. Leagues, including Little League programs, set their own rules for minimum playing time, batting and pitching. LineupFair gives you coach settings you can switch on or off to match what your league expects. LineupFair is not affiliated with Little League Baseball."],
  ["Does it track pitch counts?", "No. Pitch-count and rest-day tracking is out of scope. The innings limit at pitcher and catcher is a simple cap on innings in one game, not a pitch count. Use your league's own pitch-count rules and records."],
  ["How do I share the lineup with an assistant coach?", "Copy the share link under Print and share and send it by text or email. The roster and the chart are packed into the link, so the page opens on their phone with the same chart. Share it only with people who should see the names."],
];
const home = {
  path: "/",
  title: "Baseball Fielding Rotation Generator (Free, Fair Lineups)",
  desc: "Free baseball fielding rotation generator for youth coaches: fair bench time, position variety, batting order and a dugout card PDF. No login, in-browser.",
  h1: "Baseball Fielding Rotation Generator",
  lead: "Build an inning-by-inning defensive chart in seconds. Everyone sits their fair share, positions rotate, and the dugout card prints on one page. Free, no login, and your roster never leaves your browser.",
  quick: `To make a baseball fielding rotation, add your players below, choose the number of innings and the format (Standard 9 is the default), then press <em>Generate chart</em>. LineupFair decides who sits each inning first, so bench time is even, and then fills every position without repeats. Tap two cells to swap players, then download the dugout card PDF. Each rule is a setting you can turn off.`,
  badges: ["100% free", "No login", "Fair bench time", "Baseball, softball, T-ball", "Prints for the dugout"],
  tool: { preset: "" },
  schema: [appLd(NAME, "/", "Free baseball and softball fielding rotation generator. Fair bench time, position variety, batting order, dugout card and field diagram PDFs, season tally and share link."), howToLd("How to make a youth baseball fielding rotation", homeSteps)],
  faq: homeFaq,
  body: `      <h2 id="how">How to make a fielding rotation in 5 steps</h2>
${stepsHtml(homeSteps)}
      <p class="note"><strong>Check your league's rules.</strong> ${LEAGUE} LineupFair does not track pitch counts.</p>

      <h2>What makes a rotation fair</h2>
      <p>In recreational youth baseball and softball, most coaches try to give every child about the same time on the field and a turn at different positions. That sounds simple until a real roster arrives: eleven kids, one who cannot catch, one who is late, and a coach with a pencil trying to make six innings add up. LineupFair turns the usual goals into five rules you can switch on or off.</p>
      <ul>
        <li><strong>Bench fairness.</strong> Nobody sits a second time before everyone available has sat once, and bench innings differ by at most one among players who are there for the same innings.</li>
        <li><strong>No sitting two innings in a row</strong>, whenever the roster allows it.</li>
        <li><strong>Minimum infield innings.</strong> Every player gets at least the number you choose at pitcher, first, second, third or shortstop. The catcher counts as infield by default, and you can turn that off.</li>
        <li><strong>No same position two innings in a row</strong>, except where you have locked a position.</li>
        <li><strong>Limits at pitcher and catcher.</strong> A cap on how many innings one player can pitch or catch in a game, 2 by default, which keeps those demanding spots spread across the roster.</li>
      </ul>
      <p>Two things are not negotiable. A <em>lock</em> (for example, Maya pitches innings 1 and 2) and a <em>never plays</em> choice (for example, Ben does not catch) are always obeyed. Everything else is a goal. If a goal cannot be met, the chart still appears and a message names the rule and the player, so you decide what to do.</p>

      <h2>How the chart is built</h2>
      <p>Most hand-made rotations start with positions and hope the bench works out. LineupFair works the other way round. First it decides who sits in every inning, using the bench rules, because that is where unfairness usually starts. Then it fills the positions one inning at a time, scoring each possible assignment so that repeats, missing infield time and too many innings at pitcher or catcher cost more than a fresh position for a player. A final pass swaps pairs of players inside an inning when that improves the whole game.</p>
      <p>The result is deterministic: the same roster, rules and version number always produce the same chart. <em>Shuffle</em> picks a new version, which is useful when you want a different pitcher order. It is quick, well under a second for 15 players and 9 innings, and it runs entirely on your device.</p>
${demoTable(demoGame(10, 6), "A real chart from LineupFair: 10 players, 6 innings, Standard 9, default rules. Blue cells are infield, grey cells are the bench.")}
      <p>In that chart six players sit once and four never sit, which is as even as ten players and six innings allow. Nobody sits twice in a row, no one plays the same position in consecutive innings, and every player has at least one infield inning.</p>

      <h2>The bench math, in plain numbers</h2>
      <p>Bench time is arithmetic. The number of bench slots in a game is the number of players beyond the fielders, times the number of innings. Divide by the number of players to see what is fair. For Standard 9 over six innings:</p>
${benchMath(6, 9, 10, 15)}
      <p>When the slots do not divide evenly, a difference of one inning is unavoidable, which is why the rule says “at most one”. Late arrivals and absences change the numbers inning by inning, and the tool compares only players who were there for the same innings.</p>

      <h2>The nine standard positions</h2>
      <table>
        <thead><tr><th>Position</th><th>Code</th><th>Scorekeeping number</th><th>Counts as infield here?</th></tr></thead>
        <tbody>
          <tr><td>Pitcher</td><td>P</td><td>1</td><td>Yes</td></tr>
          <tr><td>Catcher</td><td>C</td><td>2</td><td>Yes by default; you can turn it off</td></tr>
          <tr><td>First base</td><td>1B</td><td>3</td><td>Yes</td></tr>
          <tr><td>Second base</td><td>2B</td><td>4</td><td>Yes</td></tr>
          <tr><td>Third base</td><td>3B</td><td>5</td><td>Yes</td></tr>
          <tr><td>Shortstop</td><td>SS</td><td>6</td><td>Yes</td></tr>
          <tr><td>Left field</td><td>LF</td><td>7</td><td>No</td></tr>
          <tr><td>Center field</td><td>CF</td><td>8</td><td>No</td></tr>
          <tr><td>Right field</td><td>RF</td><td>9</td><td>No</td></tr>
        </tbody>
      </table>
      <p>Strictly speaking the catcher is not an infielder, but many coaches count the catcher's innings toward infield time because the position is busy and skilled. If your league or team thinks otherwise, untick <em>Count catcher as infield</em>.</p>

      <h2>Absences, late arrivals and locks</h2>
      <p>Real games rarely start with the roster you planned. Mark a player absent and the chart is rebuilt without them. Give a late player an arrival inning and they are kept off the field and the bench until then, and they bat at the end of the order. If a lock clashes with an absence, or a player is locked to two positions in the same inning, LineupFair shows a plain message naming the problem rather than a broken chart.</p>
      <p>Use locks sparingly. A coach who locks the same child at pitcher for four innings has used up most of the pitcher limit on one player, and the tool will tell you the limit is exceeded. That is by design: the lock wins, and you stay informed.</p>

      <h2>Batting order, season totals and printouts</h2>
      <p>The batting order is continuous, so everyone present bats. Drag names or use the arrows to reorder, and use <em>Rotate for next game</em> to move the top few hitters to the bottom. Save a finished game to your season, and the season view adds up bench innings, infield innings and positions per player, so you can see whether the year is balancing out. Then print: a Letter-size dugout card, a 5 × 8 in index card version, a field diagram with one small diamond per inning, a season summary, or a <a href="/printable-baseball-lineup-card">blank lineup card</a> for writing by hand.</p>
      <p>Using a different sport or age group? See the presets for <a href="/tball-fielding-rotation">T-ball</a>, <a href="/coach-pitch-lineup-generator">coach pitch</a> and <a href="/softball-lineup-generator">softball</a>, or read how to <a href="/youth-baseball-position-rotation">rotate youth positions</a> by age.</p>`,
};

/* ---------------------------------------------------------- landing pages */
const P = [];

P.push({
  path: "/fair-playing-time-lineup-generator", crumb: "Fair playing time lineup generator",
  title: "Fair Playing Time Baseball Lineup Generator (Free Tool)",
  desc: "Free fair playing time baseball lineup generator. Even bench innings, no back-to-back sits, infield time for all, and a clear note when a rule can't be met.",
  h1: "Fair Playing Time Baseball Lineup Generator",
  lead: "Share the bench evenly, rotate positions and show parents exactly how many innings each child played. Free, with nothing to install.",
  quick: "Add your players, keep <em>Bench fairness</em> and <em>No sitting two innings in a row</em> switched on, and press <em>Generate chart</em>. Nobody sits a second time before everyone available has sat once, and the fairness summary under the chart shows innings played, bench innings and infield innings for every player.",
  badges: ["Even bench time", "No back-to-back sits", "Fairness summary", "Free"],
  tool: { preset: "" },
  schema: [],
  faq: [
    ["What does equal playing time mean in this tool?", "It means bench innings are even. Among players who are there for the same innings, the number of innings on the bench differs by at most one, and nobody sits a second time before everyone available has sat once. It does not measure skill, and it does not count at-bats."],
    ["Why can bench innings differ by one?", "Because the slots rarely divide evenly. With ten players and six innings of Standard 9 there are six bench slots for ten players, so six players sit once and four do not sit at all. A difference of one is the smallest possible."],
    ["Does a late arrival count as sitting?", "No. A player who arrives in inning 3 is not on the bench in innings 1 and 2; they are simply not there yet. Their bench innings are compared only with players who were present for the same innings."],
    ["Can I make the bench time exactly equal by turning off other rules?", "Bench fairness is already the first thing the tool settles. Turning off the other rules gives it more freedom for positions, but it cannot create bench slots that do not divide evenly."],
    ["Will parents see a record of playing time?", "You can print the dugout card or save games to a season tally that adds up bench innings, infield innings and positions per player. Share the tally only with people you choose; nothing is posted online."],
  ],
  body: `      <h2>What fair playing time means for a volunteer coach</h2>
      <p>Most recreational leagues ask for something like equal playing time, and every parent has a different idea of what that means. Some count innings on the field, some count at-bats, some count how often their child gets a turn at the interesting positions. The part a coach controls most directly is the bench: who sits, and when. If the bench is even, everything else gets easier to defend.</p>
      <p>This generator makes the bench the first decision of every game. For each inning it works out how many players must sit (the number of available players minus the number of positions), then chooses them from the players who have sat the least so far. A player who sat last inning is only picked again if there is no alternative. The positions are filled afterwards.</p>

      <h2>The two bench rules</h2>
      <ul>
        <li><strong>Bench fairness.</strong> Nobody sits a second time before everyone available has sat once. Among players present for the same innings, bench totals differ by at most one.</li>
        <li><strong>No sitting two innings in a row.</strong> A child who sits innings 3 and 4 watches a third of a six-inning game from the dugout. Spreading the bench stops that, as long as the roster allows it.</li>
      </ul>
      <p>When the numbers make it impossible, for example a player locked to pitcher for four innings who therefore cannot sit early, the chart still appears. Under it, the rule check says which rule was broken and for whom, in plain words, so you can decide whether to change a lock or accept it.</p>

      <h2>How many innings will each child sit?</h2>
      <p>This table shows the fair split for Standard 9 over six innings. The exact innings are chosen by the tool; the split is what the arithmetic allows.</p>
${benchMath(6, 9, 10, 15)}
      <p>Change the format and the numbers change with it. A 10-fielder softball lineup needs one more player on the field, so the bench shrinks by one place per inning. With nine players and nine positions there is no bench at all, and fairness is all about positions.</p>

      <h2>See who sits when</h2>
      <p>Here is a real bench pattern for 12 players over six innings: every player sits once or twice, and no one sits two innings in a row.</p>
${demoTable(demoGame(12, 6), "12 players, 6 innings, Standard 9, default rules. Each player sits once or twice.")}

      <h2>Use the fairness summary</h2>
      <p>Under the chart, the fairness summary lists every player with innings played, bench innings, infield innings and the positions they played. It updates as soon as you swap two cells by hand. A small warning mark appears beside any player whose row breaks a rule you have switched on, and the message above names the rule. If you save the game, the season view keeps adding these numbers, which is useful when a parent asks whether their child has played their share this year.</p>

      <h2>Be honest about the limits</h2>
      <p>${LEAGUE} Equal bench innings are not the same as equal quality of playing time, and the tool cannot judge it for you. It also does not track at-bats or pitch counts. Use it to make a fair starting chart quickly, then adjust it with what you know about your team.</p>`,
});

P.push({
  path: "/tball-fielding-rotation", crumb: "T-ball fielding rotation",
  title: "T-Ball Fielding Rotation and Positions Template (Free)",
  desc: "Free T-ball fielding rotation and tball positions template. Up to 12 fielders with rover and extra outfielders, fair rotation every inning, printable chart.",
  h1: "T-Ball Fielding Rotation and Positions Template",
  lead: "Rotate up to 12 young fielders through the infield and outfield, keep the bench fair, and print a chart you can read from the dugout.",
  quick: "This page opens the generator with the <em>T-ball</em> preset: pitcher, first, second, third, shortstop, left, center and right, plus a rover and extra outfielders up to 12 fielders. A catcher is optional and off by default. Add your players, press <em>Generate chart</em>, and print the dugout card.",
  badges: ["T-ball preset", "Up to 12 fielders", "Catcher optional", "Free printable chart"],
  tool: { preset: "tball" },
  schema: [],
  faq: [
    ["Does T-ball use a catcher?", "It depends on the league. Many T-ball leagues do not use a catcher because the ball is hit off a tee, so the preset leaves the catcher off. If your league wants one, tick Add a catcher."],
    ["How many fielders can I use?", "Choose 8 to 12. The extra spots after the eight standard ones are a rover, a short fielder, then left-center and right-center. Set the number to your roster size if everyone fields."],
    ["Do T-ball players ever sit?", "In many leagues everyone fields and nobody sits. If you have more players than fielders, the bench rules keep sitting even. With 12 players and 12 fielders the bench is empty and the rotation is only about positions."],
    ["How often should I rotate young players?", "Many coaches rotate every inning so each child tries different spots and nobody is stuck in one place. LineupFair does that by default: no position two innings in a row."],
    ["Can I print a T-ball positions template?", "Yes. Generate a chart and download the dugout card, the 5 × 8 in index card version or the field diagram. For a template to fill in by hand, use the blank lineup card."],
  ],
  body: `      <h2>A T-ball positions template that rotates</h2>
      <p>T-ball is where most children first stand in the field. At this age, a good rotation does three things: it gives every child a turn at different spots, it keeps the youngest players away from the busiest ones for a while, and it keeps the game moving so nobody waits for a coach to rewrite a list. The preset on this page starts you with that setup.</p>

      <h2>The positions in the preset</h2>
      <table>
        <thead><tr><th>Position</th><th>Code</th><th>Where the child stands</th></tr></thead>
        <tbody>
          <tr><td>Pitcher</td><td>P</td><td>Around the pitcher's mound area, at the distance your league sets</td></tr>
          <tr><td>First base</td><td>1B</td><td>Beside the first base bag</td></tr>
          <tr><td>Second base</td><td>2B</td><td>Between first and second base</td></tr>
          <tr><td>Third base</td><td>3B</td><td>Beside the third base bag</td></tr>
          <tr><td>Shortstop</td><td>SS</td><td>Between second and third base</td></tr>
          <tr><td>Left, center, right field</td><td>LF, CF, RF</td><td>Spread across the outfield grass</td></tr>
          <tr><td>Rover</td><td>ROV</td><td>Anywhere behind the infield; moves toward the ball</td></tr>
          <tr><td>Short fielder</td><td>SF</td><td>Between the infield and the outfield</td></tr>
          <tr><td>Left-center, right-center</td><td>LCF, RCF</td><td>Fill the gaps in the outfield for 11 or 12 fielders</td></tr>
          <tr><td>Catcher (optional)</td><td>C</td><td>Behind home plate, only if your league uses one</td></tr>
        </tbody>
      </table>
      <p>Set the number of fielders with the <em>Fielders</em> box. The list above fills in order: the eight standard positions first, then rover, short fielder, left-center and right-center. Rules on where children may stand vary by league, so follow your league's rule book where it is more specific.</p>

      <h2>A sample T-ball chart</h2>
      <p>Twelve players, four innings, ten fielders. Two children rest each inning, and the tool keeps the rests even. Blue cells are infield (the catcher is not in this preset).</p>
${demoTable(demoGame(12, 4, { format: "tball", opts: { tFielders: 10 } }), "12 players, 4 innings, T-ball with 10 fielders, default rules.")}

      <h2>Tips for rotating young players</h2>
      <ul>
        <li><strong>Rotate often.</strong> Changing positions every inning keeps attention up and gives everyone a turn at the busy spots.</li>
        <li><strong>Use the infield minimum.</strong> Setting the minimum to 1 or 2 makes sure no child spends the game in the outfield by accident.</li>
        <li><strong>Lock a helper.</strong> If a more confident child should stand at pitcher or first base in the early innings, lock them there. Locks always win.</li>
        <li><strong>Keep the printout simple.</strong> The dugout card uses large position codes and shades the bench, so a parent helper can read it from the bench rail.</li>
      </ul>

      <h2>Safety and league rules</h2>
      <p>${LEAGUE} Teach children where to stand relative to the tee and the batter, and where to look before a pitch. The preset only decides who stands where; supervision stays with the coaches.</p>
      <p>Want the same for older teams? See the <a href="/coach-pitch-lineup-generator">coach pitch</a> preset, or the guide to <a href="/youth-baseball-position-rotation">rotating positions fairly</a>.</p>`,
});

P.push({
  path: "/coach-pitch-lineup-generator", crumb: "Coach pitch lineup generator",
  title: "Coach Pitch Lineup Generator: Fair Fielding Rotations",
  desc: "Free coach pitch lineup generator with fair fielding rotations. Choose a player at pitcher beside the coach or no pitcher, set innings, print the dugout card.",
  h1: "Coach Pitch Lineup Generator for Fair Rotations",
  lead: "Set the defense for coach pitch games: a player at pitcher beside the coach or none, everyone getting infield time, and a chart you can print.",
  quick: "This page opens the generator with the <em>Coach pitch</em> preset: the nine standard positions, with an option to leave out the pitcher spot when the coach does the pitching. Add your players, choose your innings, press <em>Generate chart</em> and print the dugout card.",
  badges: ["Coach pitch preset", "Pitcher spot optional", "Fair bench time", "Free"],
  tool: { preset: "coach" },
  schema: [],
  faq: [
    ["Should I put a player at pitcher in coach pitch?", "That is a league and coach decision. Some leagues keep one fielder near the pitcher's spot, beside the coach, and others leave the area clear for safety. The preset lets you tick or untick Put a player at pitcher, beside the coach."],
    ["What does the pitcher limit do in coach pitch?", "If a player stands at pitcher beside the coach, the limit caps how many innings one child can do it. Set it to 0 for no limit. It is not a pitch count."],
    ["How many innings should I plan?", "Pick the number your league plays, usually four to six. The generator works for 1 to 9 innings, and the fairness rules look at the whole game."],
    ["Do I need nine players?", "You need at least as many available players as positions: nine with a pitcher, eight without. Below that the tool says how many are missing instead of making a broken chart."],
    ["Can I change the batting order each game?", "Yes. Reorder with the arrows or drag, and use Rotate for next game to move the top batters to the bottom."],
  ],
  body: `      <h2>Setting the defense when the coach pitches</h2>
      <p>Coach pitch is usually the step after T-ball. The coach, or sometimes a manager from the batting team, throws the pitches, so the defensive team has a different set of choices than in player pitch. Do you place a child at pitcher? Do you use a catcher? How do you rotate so every child sees the infield? The preset on this page lets you settle those choices once and then generate fair charts for every game.</p>

      <h2>The coach pitch preset</h2>
      <p>The preset uses the nine standard positions and one option:</p>
      <ul>
        <li><strong>Put a player at pitcher, beside the coach</strong> (on by default). Leave it ticked if your league places a fielder near the pitcher's spot. Untick it and the chart has eight fielders: catcher, first, second, third, shortstop and three outfielders.</li>
        <li><strong>Count catcher as infield</strong> (on by default), which feeds the minimum infield innings rule.</li>
      </ul>
      <p>Where a child stands relative to the coach, and what safety rules apply, vary by league. Follow your league's rule book first, then use the chart to decide who stands where.</p>

      <h2>A sample coach pitch chart</h2>
      <p>Ten players, four innings, a player at pitcher. One player sits each inning and the position rotation never repeats.</p>
${demoTable(demoGame(10, 4, { format: "coach" }), "10 players, 4 innings, Coach pitch with a player at pitcher, default rules.")}

      <h2>Fair rotation in a short game</h2>
      <p>Coach pitch games are short, often four to six innings, so each child's turn at the infield is a large share of their game. Use the <em>Minimum infield innings</em> rule to guarantee that every player gets some infield time. With ten players and six infield positions, a four-inning game has 24 infield slots, enough for every child to get two infield innings with slots to spare.</p>
      <p>Keep <em>No same position two innings in a row</em> on. Children in this age group often enjoy a change, and a chart that moves everyone around is easier to explain to parents than one where some players stay in the same spot all game.</p>

      <h2>Tips for coaches</h2>
      <ul>
        <li><strong>Lock confident fielders where you need them.</strong> If a particular child should stand at first base or catch grounders at shortstop in innings 1 and 2, lock that position.</li>
        <li><strong>Keep a player out of a position.</strong> For a child who is nervous about a spot, tick <em>never plays</em> for that position. The chart will always obey it.</li>
        <li><strong>Hand out the dugout card.</strong> The card lists positions by inning with large codes, and the batting order is the first column, so the assistant coach can send each child out at the right time.</li>
        <li><strong>Save the game.</strong> Saving to the season builds a record of bench innings and positions per child, handy for the end-of-season conversation.</li>
      </ul>
      <p>${LEAGUE} The tool does not track pitch counts. For older groups, see <a href="/youth-baseball-position-rotation">youth baseball position rotation</a> or the <a href="/">main generator</a>.</p>`,
});

P.push({
  path: "/softball-lineup-generator", crumb: "Softball lineup generator",
  title: "Softball Defensive Lineup Generator (Fastpitch & Rec)",
  desc: "Free softball defensive lineup generator for fastpitch and recreational softball: 9 or 10 fielders, fair bench time, locks, batting order and printable cards.",
  h1: "Softball Defensive Lineup Generator",
  lead: "Plan the defense for fastpitch and recreational softball with nine or ten fielders, even bench time and a printable dugout card.",
  quick: "This page opens the generator with the <em>10 fielders</em> preset (pitcher, catcher, four infielders and four outfielders: LF, LCF, RCF, RF), the usual setup for slow-pitch and many recreational leagues. For fastpitch with nine on defense, switch the format to <em>Standard 9</em>.",
  badges: ["10-fielder preset", "Fastpitch: Standard 9", "Fair bench time", "Free"],
  tool: { preset: "of4" },
  schema: [],
  faq: [
    ["Which format should I pick for fastpitch?", "Fastpitch teams usually field nine players, so choose Standard 9. If your league fields ten with a fourth outfielder, keep the 10-fielder format."],
    ["Does it handle a DP/FLEX lineup?", "No. Some softball rule sets use a designated player and a flex player. LineupFair does not model that; it plans who plays which defensive position each inning."],
    ["Can I limit innings at pitcher for softball?", "Yes. Use the pitcher limit to cap how many innings one player pitches in a game. It is a simple innings cap, not a pitch count; check your league for pitching rules."],
    ["What if I have exactly ten players?", "With ten players and ten fielders nobody sits and the rotation is about positions. Add a player and the bench rules start to apply."],
    ["Does it work for co-ed or recreational leagues?", "It works for any team that needs a fair defensive chart. If your league has rules about positions by gender or age, use exclusions and locks to reflect them."],
  ],
  body: `      <h2>Nine or ten on defense</h2>
      <p>Softball teams field different numbers depending on the league. Fastpitch usually has nine players on defense: pitcher, catcher, four infielders and three outfielders. Slow-pitch and many recreational leagues use ten, with four outfielders (left, left-center, right-center and right) or, in some leagues, a short fielder as the tenth player. This page starts with the 10-fielder layout and lets you switch to Standard 9 with one dropdown.</p>
      <table>
        <thead><tr><th>Format</th><th>Positions</th><th>Typical use</th></tr></thead>
        <tbody>
          <tr><td>Standard 9</td><td>P, C, 1B, 2B, 3B, SS, LF, CF, RF</td><td>Fastpitch and many youth programs</td></tr>
          <tr><td>10 fielders</td><td>P, C, 1B, 2B, 3B, SS, LF, LCF, RCF, RF</td><td>Slow-pitch and many recreational leagues</td></tr>
        </tbody>
      </table>
      <p>Your league decides which applies. The chart changes the number of positions, and the bench rules work from there: with twelve players and ten fielders, two sit each inning.</p>

      <h2>A sample 10-fielder chart</h2>
${demoTable(demoGame(12, 6, { format: "of4" }), "12 players, 6 innings, 10 fielders with four outfielders, default rules.")}
      <p>Blue cells are the infield: pitcher, catcher, first, second, third and shortstop. Every player gets at least one infield inning, nobody sits twice in a row, and no one repeats a position in consecutive innings.</p>

      <h2>Softball-specific tips</h2>
      <ul>
        <li><strong>Pitchers and catchers.</strong> These positions are physically demanding. Use the innings limits to spread them, and tick <em>never plays</em> for any player who should not pitch or catch.</li>
        <li><strong>Pitcher locks.</strong> If your best pitcher should start, lock them at pitcher for the first two or three innings. If that is more than the limit, the rule check tells you.</li>
        <li><strong>Outfield depth.</strong> In the 10-fielder layout the outfield has four spots, so the minimum infield rule matters more: without it, a player could end up in the outfield all game.</li>
        <li><strong>Late players.</strong> Recreational teams often have players arriving after the first pitch. Set the arrival inning and they are added to the end of the batting order.</li>
      </ul>

      <h2>Batting order for softball</h2>
      <p>Many recreational softball leagues bat the whole roster, which is a continuous batting order. LineupFair keeps a single order for everyone present, adds late arrivals at the end, and lets you rotate the order for the next game. If your league lists a different rule for substitutions or re-entry, follow it and edit the chart by hand.</p>

      <h2>Printing</h2>
      <p>Download the dugout card, the index-card version or the field diagram, which draws one diamond per inning with names at positions, including the four outfield spots. ${LEAGUE} For baseball, see the <a href="/">main generator</a> or the <a href="/fair-playing-time-lineup-generator">fair playing time</a> page.</p>`,
});

P.push({
  path: "/printable-baseball-lineup-card", crumb: "Printable baseball lineup card",
  title: "Printable Baseball Lineup Card: Dugout Card & Blank PDF",
  desc: "Free printable baseball lineup card: a dugout card PDF from your rotation, a 5 x 8 in index card version, a field diagram and a blank card to fill in by hand.",
  h1: "Printable Baseball Lineup Card (Dugout Card and Blank PDF)",
  lead: "Print the fielding chart for a clipboard or an index card, or download a blank lineup card to fill in by hand.",
  quick: "Generate your chart below, then choose <em>Dugout card PDF (Letter)</em> for a landscape players-by-innings grid with the batting order, or <em>Index card PDF (5 × 8 in)</em> for a smaller copy. Under <em>Blank lineup card for writing by hand</em> you can download an empty grid. Print at 100% (Actual size).",
  badges: ["Letter landscape", "5 × 8 in index card", "Blank card", "Field diagram"],
  tool: { preset: "" },
  schema: [],
  faq: [
    ["What does the dugout card show?", "A grid with one row per player in batting order and one column per inning, with the position code in each box. Bench innings are shaded grey, infield positions are tinted blue, and infield and bench totals are on the right. A legend and any absent players are listed underneath."],
    ["What size is the index card version?", "It is 8 × 5 in (landscape), the size of a 5 × 8 in index card. Print it on card stock or plain paper at 100% and trim if you want."],
    ["Is this the lineup card I give the umpire?", "Not exactly. Leagues usually ask for a batting order, sometimes with positions. The dugout card includes the batting order and defensive positions, but check what your league requires and copy it onto its form if needed."],
    ["Why do I need to print at Actual size?", "Choosing Fit to page or Shrink oversized pages scales the grid and can cut off the margins. Print at 100% on US Letter, landscape."],
    ["Can I print the blank card without a roster?", "Yes. The blank lineup card needs no roster. Choose 5 to 9 innings and 10 to 18 rows, download the PDF, and write in the names and positions yourself."],
  ],
  body: `      <h2>Four printouts from one chart</h2>
      <p>Coaches use the fielding chart in different ways. Some like a full-page sheet on a clipboard, some want something that fits in a pocket or clips to a fence, and some just want a clean grid and a pencil. LineupFair makes each of these from the same chart, so changes you make by hand show up on the printouts.</p>
      <table>
        <thead><tr><th>Printout</th><th>Size</th><th>What it shows</th></tr></thead>
        <tbody>
          <tr><td>Dugout card</td><td>US Letter, landscape</td><td>Players in batting order by innings, large position codes, bench shaded, infield and bench totals, legend</td></tr>
          <tr><td>Index card</td><td>8 × 5 in, landscape</td><td>The same grid, smaller, for a 5 × 8 in index card</td></tr>
          <tr><td>Field diagram</td><td>US Letter, landscape</td><td>One small diamond per inning, three across, with names at positions and the bench listed underneath</td></tr>
          <tr><td>Blank lineup card</td><td>US Letter, landscape</td><td>Empty grid with batting order, name, number and innings, plus a position legend</td></tr>
        </tbody>
      </table>

      <h2>How to read the dugout card</h2>
      <p>Each row is a player, in batting order from top to bottom. Each column is an inning. The code in the box is where that player fields: P, C, 1B, 2B, 3B, SS, LF, CF or RF, or LCF and RCF in a 10-fielder lineup. A grey box means the player is on the bench that inning. Blue boxes are infield positions, which makes it easy to see at a glance who has not had an infield turn yet. The two columns at the right add up infield innings and bench innings.</p>
      <p>The codes are large on purpose. The Letter card has room for up to 15 or so players at a size that is readable from arm's length, which is about how far a clipboard sits from your eyes in the dugout.</p>

      <h2>Printing tips</h2>
      <ul>
        <li><strong>Print at 100% (Actual size)</strong> on US Letter, landscape. Fit to page changes the sizes.</li>
        <li><strong>Use card stock for the index card.</strong> Check that your printer can take the thickness before you load it.</li>
        <li><strong>Laminate or use a sleeve.</strong> A clear sheet protector on a clipboard lets you wipe off marks and keep the card dry.</li>
        <li><strong>Print two.</strong> One for the dugout, one for the scorekeeper or assistant coach.</li>
      </ul>

      <h2>Using the blank lineup card</h2>
      <p>If you prefer to work in pencil, download the blank card. Choose how many innings (5 to 9) and how many player rows (10 to 18), then fill it out like this:</p>
      <ol>
        <li>Write the team, opponent, date and field along the top.</li>
        <li>List the batting order down the left, with names and numbers.</li>
        <li>In each box, write the position code, or <strong>B</strong> if the player sits.</li>
        <li>Count each player's B boxes as you go. If someone has more than the others, swap a box.</li>
      </ol>
      <p>Doing this by hand takes a few minutes per game. If you would like the arithmetic done for you, <a href="/">the generator</a> does it in seconds, and you can still print the blank card for emergencies, like a missing player half an hour before the game.</p>

      <h2>What goes on a lineup card</h2>
      <p>A lineup card in baseball traditionally lists the batting order and each batter's defensive position, and it is exchanged with the other team's manager and the umpire before the game. Youth leagues vary. Some ask for the full defensive alignment, some only for the batting order, and some do not use a card at all. ${LEAGUE}</p>
      <p>Want to see the fairness numbers for your roster? Open the <a href="/fair-playing-time-lineup-generator">fair playing time</a> page, or read the guide to <a href="/youth-baseball-position-rotation">rotating positions</a>.</p>`,
});

P.push({
  path: "/youth-baseball-position-rotation", crumb: "Youth baseball position rotation",
  title: "Youth Baseball Position Rotation: How to Rotate Fairly",
  desc: "How to rotate youth baseball positions fairly: simple coaching guidance by age group, plus a free generator that builds the inning-by-inning rotation for you.",
  h1: "Youth Baseball Position Rotation: How to Rotate Fairly",
  lead: "Plain coaching guidance on rotating positions in recreational youth baseball and softball, and a free tool that builds the rotation.",
  quick: "Rotate so every child sits about the same, plays the infield as well as the outfield, and does not stay in one spot all game. Younger players benefit most from variety; as players get older, many coaches let strengths show at some positions while still rotating. Use the generator below to build the rotation, then adjust it.",
  badges: ["Coaching guidance", "By age group", "Free generator"],
  tool: { preset: "" },
  schema: [],
  faq: [
    ["How often should kids change positions?", "There is no single rule. Many coaches of younger players rotate every inning, so each child plays several positions in a game. With older players, some teams rotate every game or every few innings instead. LineupFair rotates every inning by default and lets you switch that off."],
    ["Should my best player stay at shortstop?", "That is your call, and your league may have views. In recreational baseball many coaches rotate everyone through the busy positions in the early years and let players settle into a few positions as they get older. You can lock any player to any position for any innings."],
    ["Is it bad to keep a child in the outfield all game?", "It is not harmful, but children learn less when they never see a ground ball or a throw. The minimum infield innings rule makes sure everyone gets some infield time."],
    ["How do I protect children at pitcher and catcher?", "Use gear that fits, follow your league's rules, and limit innings at those positions. LineupFair lets you cap innings at pitcher and catcher, keep any player out of either position, and lock innings. It does not track pitch counts."],
    ["What if parents argue about positions?", "Show them the fairness summary: innings played, bench innings, infield innings and positions per player. A chart that applies the same rules to every child is easier to explain than a list made by feel."],
  ],
  body: `      <h2>Why rotate positions at all?</h2>
      <p>In recreational youth baseball, the point of the season is for children to learn the game, enjoy it and want to come back next year. Children who only ever play right field learn about right field. Children who try shortstop, first base and the outfield learn how the pieces of a play fit together: where the throw goes, who covers the base, and why the second baseman moves on a ball hit to the right side. A rotation that gives everyone variety also tends to give parents less to complain about.</p>

      <h2>Start with fair bench time</h2>
      <p>If your team has more players than fielders, someone sits every inning. The simplest fair rule is that nobody sits a second time before everyone has sat once, and nobody sits two innings in a row. Spreading the bench this way is the first step of a rotation, and it is how the generator starts. Fill the positions afterwards.</p>

      <h2>Position rotation by age group</h2>
      <p>These are general ideas many recreational coaches use, not rules. Children develop at different rates, so use your judgement and your league's guidance.</p>
      <table>
        <thead><tr><th>Age group</th><th>Typical focus</th><th>Rotation ideas</th></tr></thead>
        <tbody>
          <tr><td>About 5 to 6 (T-ball)</td><td>Fun, catching and throwing basics, knowing where to stand</td><td>Rotate every inning. Give everyone a turn in the infield and outfield. See the <a href="/tball-fielding-rotation">T-ball rotation</a>.</td></tr>
          <tr><td>About 7 to 8 (coach pitch)</td><td>Fielding ground balls, throwing to a base, backing up</td><td>Rotate every inning or two. Make sure each child plays several infield positions. See the <a href="/coach-pitch-lineup-generator">coach pitch lineup</a>.</td></tr>
          <tr><td>About 9 to 10</td><td>Positions start to matter more, including pitching and catching</td><td>Rotate through the infield and outfield, introduce pitcher and catcher with innings limits and proper gear, and keep a minimum infield rule.</td></tr>
          <tr><td>About 11 to 12</td><td>More specialised play, game awareness</td><td>Many coaches let strengths show at a few positions while still giving everyone infield time and a turn at less popular spots. Be open about how you decide.</td></tr>
        </tbody>
      </table>

      <h2>Mix infield and outfield</h2>
      <p>A balanced game gives each player time in both parts of the field. In the Standard 9 layout there are six infield positions (counting the catcher) and three outfield positions, so across a six-inning game, infield slots outnumber outfield slots two to one. Without a rule, a few children can end up with most of the infield and a few with none. The minimum infield rule fixes that. The generator also balances infield and outfield time across everyone, not just the minimum.</p>

      <h2>The classic rotation chain, and why it breaks</h2>
      <p>Many coaches use a chain: each inning, everyone moves one position along a fixed list, for example pitcher to first base to second base and so on. It is easy to explain and works when exactly nine children play. It breaks as soon as someone sits, arrives late or cannot catch, because the chain no longer lines up with who is on the field. LineupFair solves each inning separately instead: it fills every position from the children on the field while avoiding repeats, which handles bench innings and exclusions without special cases.</p>

      <h2>Pitchers and catchers need extra care</h2>
      <p>These two positions carry the most physical load. Fit equipment properly, follow your league's rules about who may pitch or catch, and spread the innings. In LineupFair you can cap innings at each position, keep any child out of either spot, or lock a child there for particular innings. Pitch counts and rest days are outside the scope of this tool, so keep your own records according to your league's rules.</p>

      <h2>A sample rotation</h2>
      <p>Eleven players, six innings. One player sits twice and the rest once, nobody repeats a position in consecutive innings, and each player gets infield time.</p>
${demoTable(demoGame(11, 6), "11 players, 6 innings, Standard 9, default rules.")}

      <h2>How to explain it to parents</h2>
      <p>Tell parents the rules before the first game: everyone sits about the same, everyone plays the infield, and positions change often. Say that you may lock a child at a position for safety or because they are new to the game. Share the fairness summary or the season tally when asked. ${LEAGUE}</p>`,
});

/* ----------------------------------------------------------- about/privacy */
P.push({
  path: "/about", crumb: "About",
  title: "About LineupFair: Free Baseball and Softball Lineup Tool",
  desc: "LineupFair is part of Rooh Sites' free tools: small, private web tools that run in your browser. Who makes it, why it's free and how it handles your data.",
  h1: "About LineupFair",
  lead: "A small, free tool that does one job: fair fielding rotations for volunteer coaches.",
  note: "", noRelated: true,
  body: `      <p>LineupFair is part of <a href="https://roohsites.com/">Rooh Sites</a>' collection of free single-purpose web tools. It is built for volunteer coaches and team parents in recreational youth baseball, softball and T-ball, who build an inning-by-inning defensive chart by hand before every game.</p>
      <h2>Why we built it</h2>
      <p>Most fielding-rotation templates online are a blank grid you fill in yourself, and the apps that do the arithmetic ask for an account. Coaches are busy, and the chart has to be ready before the first pitch. LineupFair works out who sits, who plays where and what the batting order is, in your browser, with no sign-up.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every feature is free, with no account and no paid tier. Each PDF has a small “Made with LineupFair” line in the bottom margin, and that is how other coaches find the tool.</p>
      <h2>How it works</h2>
      <p>Everything runs in your browser. The rotation solver is plain JavaScript that runs on your device, PDFs are built there with the open-source <a href="https://github.com/parallax/jsPDF" rel="noopener">jsPDF</a> library, and your roster, charts and season are kept in your browser's local storage. Nothing you type is uploaded.</p>
      <p>LineupFair is independent and is not affiliated with any league, governing body or app. Every rule in the tool is a coach setting, not league policy, and league rules vary, so check yours. The tool does not track pitch counts.</p>`,
});
P.push({
  path: "/privacy", crumb: "Privacy & Terms",
  title: "Privacy & Terms: Your Roster Never Leaves Your Device",
  desc: "How LineupFair handles your data: player names, rosters and charts are processed and stored on your device and never uploaded. Cookie-free analytics.",
  h1: "Privacy & Terms",
  lead: "Short version: your roster and charts never leave your device.",
  noRelated: true, note: "",
  body: `      <h2>Privacy</h2>
      <p>LineupFair runs entirely in your browser. Player names, jersey numbers, game names, rosters, charts and season totals are processed on your device to build the chart, the PDFs and the share link. They are never sent to our servers or to anyone else.</p>
      <p>To save you retyping, the tool remembers your current roster and chart and your saved season games in this browser's local storage. Clearing your browser's site data deletes them, and the <em>Clear roster</em> button clears the roster. A backup file you export is saved on your device.</p>
      <p>A share link contains the roster and chart inside the link itself, after the # sign, which browsers do not send to servers. Anyone you give the link to can read the names in it, so share it only with people who should see them.</p>
      <p>We use one privacy-friendly analytics service, Umami, to count page views and a few anonymous events, such as “PDF downloaded” with the kind of PDF. It does not use cookies or track you across sites, and it never receives what you type into the tool.</p>
      <h2>Terms</h2>
      <p>LineupFair is provided “as is”, without warranty. You are responsible for the lineups you use and for following the rules of your league, including rules on playing time, batting, substitutions, pitching and safety. Every rule in the tool is a coach setting, not official league policy. The tool does not track pitch counts. LineupFair is free for personal and commercial use.</p>
      <p>Questions? See the <a href="/about">About page</a>.</p>`,
});

/* ----------------------------------------------------------------- write */
let count = 0;
const wc = html => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").split(/\s+/).filter(Boolean).length;
for (const p of [home, ...P]) {
  const file = p.path === "/" ? "index.html" : p.path.slice(1) + ".html";
  const schema = [...(p.schema || [])];
  if (p.tool && p.path !== "/") schema.unshift(appLd(p.h1, p.path, p.desc));
  let html = page({ ...p, schema });
  // Keep the network links that tools/network.mjs filled in, so regenerating never wipes them.
  const NET = /<!--NETWORK:START-->[\s\S]*?<!--NETWORK:END-->/;
  const prev = existsSync(join(OUT, file)) ? (readFileSync(join(OUT, file), "utf8").match(NET) || [])[0] : null;
  if (prev) html = html.replace(NET, () => prev);
  writeFileSync(join(OUT, file), html);
  const article = (html.match(/<article[\s\S]*<\/article>/) || [""])[0];
  const words = wc(article);
  const min = p.path === "/" ? 900 : /^\/(about|privacy)$/.test(p.path) ? 120 : 500;
  if (p.title.length < 45 || p.title.length > 62) console.warn(`title ${p.title.length}: ${p.title}`);
  if (p.desc.length < 120 || p.desc.length > 158) console.warn(`desc ${p.desc.length}: ${p.path}`);
  if (words < min) console.warn(`words ${words} < ${min}: ${p.path}`);
  count++;
  console.log(`${p.path.padEnd(44)} title ${p.title.length} desc ${p.desc.length} words ${words}`);
}
console.log(`wrote ${count} pages`);
