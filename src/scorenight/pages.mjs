// Generates every ScoreNight page (home, game pages, scoring chart, online score keeper, about, privacy) from one layout.
// Usage: node src/scorenight/pages.mjs   (writes into sites/scorenight/)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../sites/scorenight");
const C = createRequire(import.meta.url)(join(OUT, "core.js"));
const URL = "https://scoresheet.roohsites.com";
const NAME = "ScoreNight";
const ACCENT = "#1f6f43";
const DATE = "2026-10-30", DATE_H = "30 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

// Facts straight from the engine, so the copy always matches the PDF.
const FARKLE = C.farkleChart(C.normalize({ game: "farkle" }).s);
if (C.MAX_HALF !== 15 || FARKLE.length !== 15 || C.mexRounds(12).length !== 13) throw new Error("sheet facts changed");
const TM = "ScoreNight is an independent tool, not affiliated with Hasbro, Mattel, Patch Products or any other game maker. Yahtzee is a trademark of Hasbro.";

const FOOT = `  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">Printable score sheets</a></li><li><a href="/online-score-keeper">Online score keeper</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Score sheets</h4><ul><li><a href="/yahtzee-score-sheet">Yahtzee score sheet</a></li><li><a href="/farkle-score-sheet">Farkle score sheet</a></li><li><a href="/farkle-scoring-chart">Farkle scoring chart</a></li><li><a href="/mexican-train-score-sheet">Mexican Train score sheet</a></li><li><a href="/printable-score-sheet">Blank score sheet</a></li></ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. ${TM}</p>
  </footer>`;

const RELATED = `      <h2>More score sheets</h2>
      <ul class="related">
        <li><a href="/">All score sheets</a></li>
        <li><a href="/yahtzee-score-sheet">Yahtzee</a></li>
        <li><a href="/farkle-score-sheet">Farkle</a></li>
        <li><a href="/farkle-scoring-chart">Farkle scoring chart</a></li>
        <li><a href="/mexican-train-score-sheet">Mexican Train</a></li>
        <li><a href="/printable-score-sheet">Blank, any game</a></li>
        <li><a href="/online-score-keeper">Keep score on a phone</a></li>
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
const FEATURES = ["Printable score sheets for Yahtzee-style dice games, Farkle, Mexican Train and any card or board game", "Player names printed on the sheet", "1, 2 or 4 sheets per US Letter or A4 page", "Large-print option", "Farkle scoring chart with your house rules", "Phone score keeper that adds up totals, bonuses and the winner", "No account; nothing uploaded"];
const appLd = (name, path, desc) => ({
  "@type": "WebApplication", name, url: URL + path, description: desc, applicationCategory: "GameApplication",
  operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, featureList: FEATURES, publisher: PUBLISHER,
});
const howToLd = (name, steps) => ({ "@type": "HowTo", name, totalTime: "PT3M", step: steps.map(([n, t]) => ({ "@type": "HowToStep", name: n, text: strip(t) })) });
const stepsHtml = steps => `      <ol class="steps">\n${steps.map(([n, t]) => `        <li><strong>${esc(n)}.</strong> ${t}</li>`).join("\n")}\n      </ol>`;
const faqHtml = faq => `      <h2 id="faq">Frequently asked questions</h2>\n${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}`;
const updated = extra => `      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the Rooh Sites team.${extra ? " " + extra : ""}</p>`;
const chartTable = rows => `      <table>
        <thead><tr><th>Dice</th><th>Points</th></tr></thead>
        <tbody>
${rows.map(([a, b]) => `          <tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("\n")}
        </tbody>
      </table>`;

function page({ path, title, desc, h1, lead, quick, badges, tool, body, faq = [], crumb, schema = [], noRelated, note }) {
  const isHome = path === "/";
  const graph = [];
  if (!isHome) graph.push({ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` },
    { "@type": "ListItem", position: 2, name: crumb || h1, item: URL + path }] });
  graph.push(...schema);
  if (faq.length) graph.push(faqLd(faq));
  const navHtml = isHome
    ? `<a href="#how">How it works</a><a href="/online-score-keeper">Score keeper</a><a href="#faq">FAQ</a>`
    : `<a href="/">Score sheets</a><a href="/online-score-keeper">Score keeper</a><a href="/about">About</a>`;
  const attrs = tool ? `${tool.game ? ` data-game="${tool.game}"` : ""}${tool.mode ? ` data-mode="${tool.mode}"` : ""}` : "";
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
${quick ? `    <div class="content narrow quick"><p class="tldr"><strong>Quick answer:</strong> ${quick}</p></div>\n` : ""}${tool ? `    <section class="tool card" aria-label="Score sheet maker"><div id="sn-tool"${attrs}></div></section>\n` : ""}    <article class="content narrow">
${body}
${faq.length ? faqHtml(faq) + "\n" : ""}${noRelated ? "" : RELATED + "\n"}${updated(note === undefined ? "House rules vary from table to table; the sheets print whichever rules you set." : note)}
    </article>
  </main>
${FOOT}
</div>
${tool ? `<script src="/core.js" defer></script>\n<script src="/app.js" defer></script>\n` : ""}</body>
</html>
`;
}

/* ------------------------------------------------------------------ home */
const homeSteps = [
  ["Pick the game", "Choose a 5-dice game like Yahtzee, Farkle, Mexican Train or <em>Any game</em> for card games such as Rummy, Hearts or Golf. The sheet changes to match."],
  ["Add the players", "Choose how many people are playing and type their names, or leave them blank to write in by hand. Add a game night name if you like."],
  ["Set your house rules", "Farkle has the points to get on the board, the winning total and two common scoring choices. Mexican Train has the domino set. Any game has the rounds and whether the highest or lowest total wins."],
  ["Choose the paper", "US Letter or A4, and 1, 2 or 4 sheets per page. Large print puts one sheet on a page with bigger rows."],
  ["Download and print", "Download the PDF and print at 100%. Or switch to <em>Keep score on this phone</em> and let the totals add up as you play."],
];
const homeFaq = [
  ["Is ScoreNight free?", "Yes. Every sheet and the phone score keeper are free, with no account, no sign-up and no limit. Each printed page has a small “Made with ScoreNight” line in the bottom margin, outside the score sheets."],
  ["Which games does it make score sheets for?", "Yahtzee and other 5-dice games, Farkle, Mexican Train dominoes, and a blank sheet for any game with rounds, such as Rummy, Hearts, Golf, Phase 10, Spades or Uno. The blank sheet lets you set the title, the number of rounds and whether the highest or lowest total wins."],
  ["Can I print the players' names on the sheet?", "Yes. Type the names and they print at the top of each column, or on each dice card for Yahtzee. Leave a name blank and the column stays empty for writing in."],
  ["How many score sheets fit on a page?", "Dice cards for Yahtzee print 1, 2 or 4 to a page. Farkle, Mexican Train and the blank sheet print 1 or 2 to a page. Two to a page holds up to 15 turns or rounds; one to a page holds up to 30 and adds the Farkle scoring chart."],
  ["Is there a large-print version?", "Yes. Tick <em>Large print</em> and every sheet fills a whole page with taller rows and bigger text, which suits older players and anyone who keeps score from across the table."],
  ["Can I keep score on my phone instead of paper?", "Yes. Open <em>Keep score on this phone</em>. Type each score as you go and ScoreNight adds up the totals, the Yahtzee upper bonus, the Farkle running totals and final round, and tells you who is winning. Scores are saved on your phone if the screen turns off. See the <a href=\"/online-score-keeper\">online score keeper</a>."],
  ["Are these the official rules?", "No. Every family plays slightly differently, so ScoreNight prints the common rules and lets you change the ones that vary, such as Farkle's entry points, winning total and scoring choices. " + TM],
  ["Is anything uploaded?", "No. Names, settings and scores stay in your browser. The PDF is built on your device."],
];
const home = {
  path: "/",
  title: "Free Printable Score Sheets for Game Night | ScoreNight",
  desc: "Free printable score sheets for Yahtzee, Farkle, Mexican Train and any card game, with names printed on, large print and a phone score keeper. No login.",
  h1: "Free Printable Score Sheets for Game Night",
  lead: "Score sheets for Yahtzee-style dice games, Farkle, Mexican Train and any card or board game, with your players' names printed on. Print them, or keep score on your phone. Free, no login.",
  quick: "Pick a game below, choose the number of players and type their names, set any house rules, then click <em>Download print-ready PDF</em>. Dice cards print 1, 2 or 4 to a US Letter or A4 page; Farkle, Mexican Train and blank sheets print 1 or 2. Or tap <em>Keep score on this phone</em> and the totals add up for you.",
  badges: ["100% free", "Names printed on", "Letter &amp; A4", "Large print", "Phone scorer"],
  tool: {},
  schema: [appLd(NAME, "/", "Free printable score sheets for Yahtzee-style dice games, Farkle, Mexican Train and any game, plus a phone score keeper."), howToLd("How to print a score sheet for game night", homeSteps)],
  faq: homeFaq,
  body: `      <h2 id="how">How to make a score sheet in 5 steps</h2>
${stepsHtml(homeSteps)}

      <h2>The sheets</h2>
      <table>
        <thead><tr><th>Game</th><th>What prints</th><th>Per page</th></tr></thead>
        <tbody>
          <tr><td><a href="/yahtzee-score-sheet">Yahtzee and 5-dice games</a></td><td>One card per player with up to 6 games, the upper bonus and every box's points</td><td>1, 2 or 4</td></tr>
          <tr><td><a href="/farkle-score-sheet">Farkle</a></td><td>A turn-by-turn sheet with Score and Total columns for 2 to 8 players, plus the scoring chart</td><td>1 or 2</td></tr>
          <tr><td><a href="/mexican-train-score-sheet">Mexican Train</a></td><td>One row per round from your highest double down to the double blank, lowest total wins</td><td>1 or 2</td></tr>
          <tr><td><a href="/printable-score-sheet">Any game</a></td><td>Your title, 3 to 30 rounds, 2 to 10 players and a total row</td><td>1 or 2</td></tr>
        </tbody>
      </table>
      <p>Every sheet has a date line and a game night line at the top, so a stack of finished sheets doubles as a record of who won which night.</p>

      <h2>Why a score sheet generator</h2>
      <p>Most printable score sheets online are a single fixed PDF: the same six columns, no names, small print and somebody else's house rules. That works until your family plays to 5,000 instead of 10,000, or your grandmother wants to read the card without glasses. ScoreNight builds the sheet from your settings instead. The names you type print on the sheet, the number of turns or rounds matches your game, and the Farkle chart shows the rules you actually play.</p>
      <p>It also keeps the sheet honest about rules. Dice and domino games have been played in kitchens for generations and every table has its own version. The sheets print the common rules and say plainly when a number is a house-rule choice.</p>

      <h2>Keep score on your phone</h2>
      <p>Not every game night has a printer nearby. The <a href="/online-score-keeper">phone score keeper</a> works in the browser, needs no app and no account, and keeps going if the phone locks:</p>
      <ul>
        <li><strong>Dice cards:</strong> type each box's score and the upper subtotal, the 35-point bonus at 63 and the grand total add up. A box that can't hold that number turns red, such as 20 in Full house.</li>
        <li><strong>Farkle:</strong> the scorer shows whose turn it is. Type the points or tap <em>Farkle</em> for a zero, and it keeps running totals. It applies your entry minimum and starts the final round when someone reaches the winning total.</li>
        <li><strong>Mexican Train and any game:</strong> one row per round, totals for every player, and the leader shown as you go. Mexican Train counts the lowest total as the winner.</li>
      </ul>

      <h2>Printing tips</h2>
      <ul>
        <li><strong>Print at 100% / Actual size.</strong> “Fit to page” shrinks the rows.</li>
        <li><strong>Two or four to a page saves paper.</strong> Cut along the dashed line between the sheets.</li>
        <li><strong>Print a stack.</strong> Set <em>How many sets</em> to the number of game nights you want to cover. For dice cards each set is one card per player.</li>
        <li><strong>A clipboard helps.</strong> Score sheets are written on laps and couch arms more than tables.</li>
        <li><strong>Laminate one for reuse.</strong> A laminated sheet and a dry-erase pen last for months of weekly games.</li>
      </ul>

      <h2>House rules worth agreeing before you start</h2>
      <p>Most scoring arguments at game night come from rules nobody said out loud. A minute before the first roll saves a long one later:</p>
      <ul>
        <li><strong>Farkle:</strong> how many points to get on the board (500 is common), the winning total (10,000 is common), what three 1s are worth, and whether three farkles in a row cost points.</li>
        <li><strong>Dice cards:</strong> whether an extra 5 of a kind earns the 100-point bonus, and how the joker rule works when the 5-of-a-kind box is already filled.</li>
        <li><strong>Mexican Train:</strong> which double starts the first round and whether a double blank left in a hand counts as 0 or as a penalty.</li>
      </ul>
      <p>Write anything unusual on the game night line, so next week's sheet starts from the same rules.</p>`,
};

/* ----------------------------------------------------------- game pages */
const P = [];

P.push({
  path: "/yahtzee-score-sheet", crumb: "Yahtzee score sheet",
  title: "Yahtzee Score Sheet: Free Printable, 2 or 4 per Page",
  desc: "Free printable score sheet for Yahtzee: player names printed on, 6 games per card, 2 or 4 cards per page, large print, and a phone scorer that adds the bonus.",
  h1: "Yahtzee Score Sheet (Free Printable)",
  lead: "A score card for Yahtzee and other 5-dice games, with each player's name printed on, every box's points written in and up to 6 games per card.",
  quick: "The dice card above prints one card per player, each with 6 game columns, 2 cards to a page. Type the names, choose 1, 2 or 4 cards per page or large print, and download the PDF. The card lists the upper section, the 35-point bonus at 63, and the lower section with full house 25, small straight 30, large straight 40 and 5 of a kind 50.",
  tool: { game: "yahtzee" },
  faq: [
    ["How is Yahtzee scored?", "There are 13 boxes and each is filled once per game. The upper section scores the total of one number: three 4s in Fours is 12. The lower section scores combinations: 3 of a kind and 4 of a kind score all five dice, a full house scores 25, a small straight (four in a row) 30, a large straight (five in a row) 40, five of a kind 50 and Chance the total of all five dice."],
    ["How does the upper section bonus work?", "If the six upper boxes add up to 63 or more, you get a 35-point bonus. 63 is what you score with three of each number, so three 1s, three 2s and so on up to three 6s gets exactly 63. Four of a high number makes up for a short low number."],
    ["What is the Yahtzee bonus?", "If you've already scored 50 in the 5-of-a-kind box and you roll another 5 of a kind, you get a 100-point bonus. The card has a row for it; write a tick for each one, or type how many in the phone scorer and it adds 100 each."],
    ["Can I score 0 in a box?", "Yes. If a roll doesn't fit any open box, you must put a 0 in one. Many players sacrifice the 1s box or the 5-of-a-kind box early in the game when the roll is poor."],
    ["How many games fit on one card?", "Six, like the classic score pad. You can choose 1 to 6 game columns; fewer columns give each box more room, which suits large print."],
    ["Is this the official Yahtzee score card?", "No. It is our own score card for Yahtzee and other 5-dice games, with the commonly played scoring. " + TM],
  ],
  body: `      <h2>What the card prints</h2>
      <p>Each card has the player's name at the top, a date line, and a column for each game. The rows follow the usual order:</p>
      <ul>
        <li><strong>Upper section:</strong> Ones to Sixes, each with a reminder to add only that number, then the subtotal, the bonus row (35 if the subtotal is 63 or more) and the upper total.</li>
        <li><strong>Lower section:</strong> 3 of a kind and 4 of a kind (add all dice), full house (25), small straight (30), large straight (40), 5 of a kind (50), Chance (add all dice) and the 5-of-a-kind bonus row (100 each).</li>
        <li><strong>Totals:</strong> lower total, upper total again and the grand total, so nobody has to flip back to add.</li>
      </ul>
      <p>On the quarter-page card the reminders move to one line under the table to keep the rows big enough to write in.</p>

      <h2>Scoring at a glance</h2>
      <table>
        <thead><tr><th>Box</th><th>What scores</th><th>Points</th></tr></thead>
        <tbody>
          <tr><td>Ones to Sixes</td><td>Only dice showing that number</td><td>Total of those dice</td></tr>
          <tr><td>Upper bonus</td><td>Upper subtotal of 63 or more</td><td>35</td></tr>
          <tr><td>3 of a kind</td><td>At least three dice the same</td><td>Total of all five dice</td></tr>
          <tr><td>4 of a kind</td><td>At least four dice the same</td><td>Total of all five dice</td></tr>
          <tr><td>Full house</td><td>Three of one number and two of another</td><td>25</td></tr>
          <tr><td>Small straight</td><td>Four in a row, such as 2-3-4-5</td><td>30</td></tr>
          <tr><td>Large straight</td><td>Five in a row, 1-2-3-4-5 or 2-3-4-5-6</td><td>40</td></tr>
          <tr><td>5 of a kind</td><td>All five dice the same</td><td>50</td></tr>
          <tr><td>Chance</td><td>Anything</td><td>Total of all five dice</td></tr>
          <tr><td>5-of-a-kind bonus</td><td>Each extra 5 of a kind after scoring 50</td><td>100 each</td></tr>
        </tbody>
      </table>
      <p>On each turn you roll up to three times, keeping any dice you like between rolls, then score the result in one open box. After 13 turns every box is full and the highest grand total wins.</p>

      <h2>Choosing a layout</h2>
      <p><strong>Two cards per page</strong> is the everyday choice: tall cards side by side, easy to cut down the dashed line. <strong>Four per page</strong> saves paper for a big group or a stack of spare cards. <strong>Large print</strong> gives each card a full page with taller rows, which helps older players and anyone keeping score from across the room. Set <em>How many sets</em> to print cards for several game nights at once; each set is one card per player.</p>

      <h2>Common house rules</h2>
      <p>The joker rule is the one families disagree on most. When you roll a 5 of a kind but the 5-of-a-kind box is already filled, the usual rule is to score the matching upper box if it's open, and otherwise any lower box at full points (so a straight still scores 30 or 40). Some tables skip the joker rule or the 100-point bonus entirely. Decide before the first roll and write it on the game night line.</p>

      <h2>Keep score on a phone instead</h2>
      <p>Switch to <em>Keep score on this phone</em> above. Type each score into its box and the subtotal, bonus and totals add up for you. A box that can't hold a number turns red: 20 in Full house, or 7 in Fours. Scores are saved on the phone, so a locked screen or a closed tab doesn't lose the game.</p>`,
});

P.push({
  path: "/farkle-score-sheet", crumb: "Farkle score sheet",
  title: "Farkle Score Sheet: Free Printable with Scoring Chart",
  desc: "Free printable Farkle score sheet with player names, Score and Total columns, your house rules and the scoring chart on the page. Phone scorer included.",
  h1: "Farkle Score Sheet (Free Printable)",
  lead: "A turn-by-turn Farkle sheet for 2 to 8 players with Score and Total columns, your entry points and winning total at the top, and the scoring chart on the same page.",
  quick: "The Farkle sheet above prints one row per turn with a Score and a Total column for each player, and the scoring chart under the table when you print one sheet per page. Set the points to get on the board (500 is common) and the points to win (10,000 is common), type the names and download the PDF.",
  tool: { game: "farkle" },
  faq: [
    ["How many points do you need to get on the board in Farkle?", "Many families play 500: a player's first score only counts once they bank at least 500 in a single turn. Some play 350 or 1,000, and some have no minimum at all. Set yours under <em>Points to get on the board</em>; 0 means no minimum."],
    ["What score do you play Farkle to?", "10,000 is the most common target. When a player reaches it, everyone else gets one more turn to beat that total. For a shorter game, play to 5,000."],
    ["What is a farkle?", "A roll with no scoring dice. The player loses every point from that turn and the dice pass to the next player. On the sheet, write 0 for the turn."],
    ["What are hot dice?", "If every one of the six dice scores, you can pick them all up and roll all six again, adding to the same turn's points. Many tables require you to roll again after hot dice."],
    ["Do three farkles in a row cost points?", "Under some house rules, yes: three farkles in a row lose 1,000 points. It isn't universal. The phone scorer doesn't apply it, so subtract the penalty by hand if your table uses it."],
    ["Is three 1s worth 1,000 or 300?", "Both are common. Choose under <em>Three 1s score</em>; the chart on the sheet prints your choice. See the <a href=\"/farkle-scoring-chart\">Farkle scoring chart</a> for the full table."],
  ],
  body: `      <h2>What the sheet prints</h2>
      <p>The top of the sheet shows the game name, a date line, your game night name and your two key rules, for example “Get on the board: 500 · Win: 10,000”. Below that, each player has two columns: <strong>Score</strong> for the points banked that turn and <strong>Total</strong> for the running total. A one-per-page sheet holds up to 30 turns and the scoring chart; two to a page holds 15 turns each without the chart.</p>
      <p>Writing the running total each turn means nobody has to add up a long column at the end, and it's easy to see when someone is close to the winning total.</p>

      <h2>The scoring chart on the sheet</h2>
${chartTable(FARKLE)}
      <p>Single 1s and 5s score on their own; other numbers score only as part of a combination. If you choose <em>Double each extra die</em>, four of a kind is twice the three-of-a-kind value, five of a kind four times and six of a kind eight times. The <a href="/farkle-scoring-chart">scoring chart page</a> explains each combination.</p>

      <h2>How a turn works</h2>
      <ol>
        <li>Roll all six dice.</li>
        <li>Set aside at least one scoring die or combination.</li>
        <li>Stop and bank the turn's points, or roll the remaining dice to add more.</li>
        <li>If a roll has no scoring dice, that's a farkle: the turn scores 0.</li>
        <li>If all six dice score, you have hot dice and can roll all six again.</li>
      </ol>
      <p>A player's points don't count until they bank the entry minimum in one turn. When someone reaches the winning total, everyone else gets one last turn, and the highest total wins.</p>

      <h2>Keep score on a phone</h2>
      <p>Open <em>Keep score on this phone</em>. ScoreNight shows whose turn it is; type the points and tap <em>Add</em>, or tap <em>Farkle (0)</em>. It keeps the running totals, ignores a turn below the entry minimum until the player is on the board, starts the final round when someone reaches the target and names the winner. <em>Undo last turn</em> fixes a mistyped score.</p>

      <h2>Printing for a big group</h2>
      <p>Farkle works with any number of players, and the sheet takes up to 8. For a bigger crowd, print two sheets and split into two tables, or play in teams with one column per team. Set <em>How many sets</em> to print a stack for the season.</p>`,
});

P.push({
  path: "/farkle-scoring-chart", crumb: "Farkle scoring chart",
  title: "Farkle Scoring Chart: Printable Points Table and Rules",
  desc: "Farkle scoring chart: points for 1s, 5s, three of a kind, straights, three pairs and six of a kind, common house rules and a printable sheet with the chart.",
  h1: "Farkle Scoring Chart",
  lead: "The points for every Farkle combination, the house rules that change them, and a printable score sheet with the chart on the page.",
  quick: "Single 1 = 100, single 5 = 50, three 1s = 1,000 (300 in some homes), three of any other number = 100 × the number, four of a kind = 1,000, five of a kind = 2,000, six of a kind = 3,000, a 1-to-6 straight = 1,500, three pairs = 1,500, four of a kind plus a pair = 1,500 and two triplets = 2,500. Print it on a score sheet with the tool below.",
  tool: { game: "farkle" },
  faq: [
    ["What is the highest score in one Farkle roll?", "Under the common chart, six of a kind at 3,000. Under the doubling rule, six 6s is 8 × 600 = 4,800."],
    ["Do 2s, 3s, 4s and 6s score on their own?", "No. Only single 1s and single 5s score alone. Other numbers score as three or more of a kind, or as part of a straight, three pairs or two triplets."],
    ["Does three pairs include four of a kind?", "Tables differ. Under the common chart four of a kind plus a pair scores 1,500, the same as three pairs. Agree on it before you play."],
    ["Can I combine dice from different rolls?", "No. A combination must come from a single roll. Three 2s rolled across two rolls are just three 2s that don't score."],
    ["Why do some charts say three 1s is 300?", "Older rule sets score three 1s as 300, like 100 × the face value. Most modern charts give 1,000. Pick one and print it on your sheet so nobody argues mid-game."],
  ],
  body: `      <h2>The common Farkle scoring chart</h2>
${chartTable(FARKLE)}
      <p>This is the chart ScoreNight prints by default. It is the most widely played version, but not the only one, so the tool lets you switch two values that families often change: three 1s (1,000 or 300) and four or more of a kind (fixed points or doubling).</p>

      <h2>The doubling rule</h2>
      <p>Some families double the three-of-a-kind value for every extra matching die instead of using fixed points:</p>
      <table>
        <thead><tr><th>Dice</th><th>Example with 4s</th><th>Example with 1s (1,000 rule)</th></tr></thead>
        <tbody>
          <tr><td>Three of a kind</td><td>400</td><td>1,000</td></tr>
          <tr><td>Four of a kind (2 ×)</td><td>800</td><td>2,000</td></tr>
          <tr><td>Five of a kind (4 ×)</td><td>1,600</td><td>4,000</td></tr>
          <tr><td>Six of a kind (8 ×)</td><td>3,200</td><td>8,000</td></tr>
        </tbody>
      </table>
      <p>Doubling makes big rolls much bigger, so games end faster. Choose <em>Double each extra die</em> in the tool and the chart on your sheet says so.</p>

      <h2>Other rules that change the score</h2>
      <ul>
        <li><strong>Getting on the board:</strong> many tables require 500 points in one turn before any points count; some use 350 or 1,000.</li>
        <li><strong>Winning total:</strong> usually 10,000. When someone reaches it, every other player gets one more turn.</li>
        <li><strong>Three farkles in a row:</strong> some tables subtract 1,000 points.</li>
        <li><strong>Hot dice:</strong> when all six dice score, roll all six again and keep adding.</li>
        <li><strong>Straights:</strong> a few versions score a partial straight (1-2-3-4-5) at 500 or 750. The common chart only scores the full 1-to-6 straight.</li>
      </ul>

      <h2>Reading a roll</h2>
      <p>Take a roll of 1, 1, 1, 5, 2, 6. Three 1s score 1,000 and the single 5 scores 50: 1,050 if you set aside all four. You could also keep only the three 1s and roll three dice again, hoping for more. A roll of 2, 2, 3, 3, 6, 6 is three pairs for 1,500, and all six dice score, so you have hot dice.</p>

      <h2>Print the chart on your score sheet</h2>
      <p>The tool above prints a <a href="/farkle-score-sheet">Farkle score sheet</a> with the chart under the table when you choose one sheet per page. Set your house rules first and the chart prints exactly what your table plays, so the rules are on the paper instead of in someone's memory.</p>`,
});

P.push({
  path: "/mexican-train-score-sheet", crumb: "Mexican Train score sheet",
  title: "Mexican Train Score Sheet: Free Printable (Double 12)",
  desc: "Free printable Mexican Train score sheet for double-12 dominoes (also double-6, 9 and 15): one row per round, names printed on, lowest total wins.",
  h1: "Mexican Train Score Sheet (Free Printable)",
  lead: "A Mexican Train dominoes score sheet with one row per round, from the double 12 down to the double blank, for 2 to 8 players with names printed on.",
  quick: "The sheet above prints 13 rounds for a double-12 set, from Double 12 down to Double 0, with a column for each player and a total row. After each round, write the pips left in each player's hand; the lowest total after the last round wins. Choose a double-6, 9 or 15 set for 7, 10 or 16 rounds.",
  tool: { game: "mexican" },
  faq: [
    ["How do you score Mexican Train?", "When a player plays their last domino, the round ends. Everyone else adds up the dots (pips) on the dominoes left in their hand and writes that number for the round. The player who went out scores 0. After the last round, the lowest total wins."],
    ["How many rounds are in Mexican Train?", "With a double-12 set, 13 rounds: the first starts with the double 12, the next with the double 11, and so on down to the double blank. A double-9 set has 10 rounds and a double-15 set has 16."],
    ["What is the double blank worth?", "Usually 0, because it has no dots. Some families count a double blank left in a hand as 50 points as a penalty. Write your rule on the game night line."],
    ["How many people can play Mexican Train?", "A double-12 set works well for 2 to 8 players, which is what the sheet supports. Larger groups often use a double-15 set."],
    ["Can I keep score on my phone?", "Yes. Open <em>Keep score on this phone</em>: type each player's pips per round and ScoreNight keeps the totals and shows who is ahead, with the lowest total as the leader."],
  ],
  body: `      <h2>What the sheet prints</h2>
      <p>The top shows “Mexican Train score sheet”, a date line, your game night name and the set you play, for example “Double-12 set · 13 rounds · lowest total wins”. Each round has its own row labelled with the starting double, so everyone can see which double opens the next round. The total row at the bottom is shaded, and a note under the table explains the scoring for anyone new.</p>

      <h2>Rounds for each domino set</h2>
      <table>
        <thead><tr><th>Set</th><th>Dominoes in the set</th><th>Rounds</th><th>First and last double</th></tr></thead>
        <tbody>
          <tr><td>Double-6</td><td>28</td><td>7</td><td>Double 6 to double 0</td></tr>
          <tr><td>Double-9</td><td>55</td><td>10</td><td>Double 9 to double 0</td></tr>
          <tr><td>Double-12</td><td>91</td><td>13</td><td>Double 12 to double 0</td></tr>
          <tr><td>Double-15</td><td>136</td><td>16</td><td>Double 15 to double 0</td></tr>
        </tbody>
      </table>
      <p>Double-12 is the usual set for Mexican Train. Double-6 is short for a full game and often used for a quick version.</p>

      <h2>How a round ends and is scored</h2>
      <ol>
        <li>The round's starting double goes in the hub. Players build their own trains and the shared Mexican train.</li>
        <li>The round ends when someone plays their last domino, or when nobody can play and the boneyard is empty.</li>
        <li>Each player counts the dots on the dominoes left in their hand. The player who went out scores 0.</li>
        <li>Write each count in that round's row. After the last round, add the columns: the lowest total wins.</li>
      </ol>

      <h2>Choosing a layout</h2>
      <p>One sheet per page gives large rows that are easy to write in. Two per page fits a double-15 game on half a page, which is handy when you play two games in one evening or want spare sheets in the domino box. Tick <em>Large print</em> for players who prefer bigger numbers. Mexican Train is a favourite in retirement communities and RV parks, and large print with names printed on saves a lot of squinting.</p>

      <h2>House rules to agree on</h2>
      <ul>
        <li>Whether a double must be covered before anyone can play elsewhere.</li>
        <li>How many dominoes each player draws at the start, which depends on the number of players.</li>
        <li>Whether a double blank left in a hand counts as 0 or as a penalty such as 50.</li>
      </ul>
      <p>None of these change the sheet, but writing them on the game night line keeps the next game consistent.</p>`,
});

P.push({
  path: "/printable-score-sheet", crumb: "Blank score sheet",
  title: "Blank Score Sheet Template: Printable for Any Game",
  desc: "Free blank score sheet template for any game: your title, 3 to 30 rounds, 2 to 10 players with names printed on, and highest or lowest total wins.",
  h1: "Blank Score Sheet Template (Printable, Any Game)",
  lead: "A clean score sheet for card games, board games and anything played in rounds: your title, your number of rounds, up to 10 players and a total row.",
  quick: "Choose <em>Any game</em> above, type a title such as Rummy or Hearts, set the number of rounds (3 to 30) and whether the highest or lowest total wins, then type the players' names and download the PDF. One sheet per page fits 30 rounds; two per page fit 15.",
  tool: { game: "blank" },
  faq: [
    ["What games can I use the blank score sheet for?", "Any game scored in rounds or hands: Rummy, Gin, Hearts, Spades, Euchre, Golf, Phase 10, Uno, Skip-Bo, cribbage tallies, trivia rounds, bowling-style family games and more. Set the title and the number of rounds to match."],
    ["Can the lowest score win?", "Yes. Choose <em>Lowest total (Hearts, Golf)</em> under <em>Who wins</em>. The sheet prints “Lowest total wins” at the top, and the phone scorer shows the lowest total as the leader."],
    ["How many players fit?", "Up to 10. With many players each column is narrower, so for 8 to 10 players choose one sheet per page."],
    ["Can I use it for a tournament?", "Yes. Print a sheet per table and give each a game night name like “Table 3” so the sheets don't get mixed up. Set <em>How many sets</em> to the number of tables or games."],
    ["Can I keep score on my phone instead?", "Yes. Open <em>Keep score on this phone</em>: one row per round, totals for every player and the leader shown as you go."],
  ],
  body: `      <h2>What the sheet prints</h2>
      <p>Your title prints large at the top, with a date line, your game night name and a line saying whether the highest or lowest total wins. The table has a round number down the left, a column for each player with their name printed at the top, and a shaded total row. Leave a name blank to write it in.</p>

      <h2>Suggested settings by game</h2>
      <table>
        <thead><tr><th>Game</th><th>Rounds to set</th><th>Who wins</th></tr></thead>
        <tbody>
          <tr><td>Golf (card game)</td><td>9 holes, or 18</td><td>Lowest total</td></tr>
          <tr><td>Hearts</td><td>Enough hands to reach 100, about 12 to 20</td><td>Lowest total</td></tr>
          <tr><td>Phase 10</td><td>10 or more, one row per hand</td><td>Highest phase, then lowest points</td></tr>
          <tr><td>Rummy</td><td>10 to 15 hands, or until someone reaches your target</td><td>Usually highest total</td></tr>
          <tr><td>Spades or Euchre</td><td>Hands until the winning score, about 10 to 15</td><td>Highest total</td></tr>
          <tr><td>Uno</td><td>Hands until someone reaches 500</td><td>Highest total</td></tr>
        </tbody>
      </table>
      <p>These are common choices; every table plays a little differently. For team games such as Spades or Euchre, type the team names as players.</p>

      <h2>Why print instead of using any spreadsheet</h2>
      <p>A spreadsheet works, but it needs a laptop on the card table and someone to type every score. A printed sheet sits next to the cards, anyone can write on it, and it doubles as a record of who won. The names printed at the top keep the columns straight when the sheet is passed around, and the total row is ready to add at the end.</p>

      <h2>Tips for a smooth game</h2>
      <ul>
        <li>Choose one person to keep score each game, and rotate it.</li>
        <li>Write the running total in small numbers under each score if the game ends at a target, such as 500 in Uno.</li>
        <li>For games with negative scores, such as some Rummy variants, write a minus sign clearly; the phone scorer accepts negative numbers too.</li>
        <li>Keep the finished sheets in the game box. A season of sheets makes a nice family record.</li>
      </ul>`,
});

P.push({
  path: "/online-score-keeper", crumb: "Online score keeper",
  title: "Online Score Keeper for Yahtzee, Farkle and Card Games",
  desc: "Free online score keeper for game night: Yahtzee-style dice cards with the bonus, Farkle running totals and final round, Mexican Train and any card game.",
  h1: "Online Score Keeper for Game Night",
  lead: "Keep score on your phone: dice cards with the 35-point bonus, Farkle with running totals and the final round, Mexican Train and any card game. No app, no account.",
  quick: "Pick the game and players above, then type the scores as you play. ScoreNight adds up the totals, applies the Yahtzee upper bonus and the Farkle entry minimum, shows who's ahead and names the winner. Scores are saved on your phone, so a locked screen doesn't lose the game.",
  tool: { game: "yahtzee", mode: "score" },
  faq: [
    ["Do I need to install an app?", "No. ScoreNight runs in your phone's browser. You can add it to your home screen from the browser's share or menu button so it opens like an app."],
    ["Will I lose the scores if my phone locks?", "No. Every score is saved on your phone as you type it. Come back to the page and the game is still there. <em>New game</em> clears the scores and keeps the names."],
    ["Can several people use it at once?", "Each phone keeps its own scores; there is no shared online game. Choose one score keeper per table."],
    ["What happens at the end of a Farkle game?", "When a player reaches the winning total, ScoreNight announces the final round and asks only the remaining players for one more turn each. Then it names the winner, or both players if they tie."],
    ["Does it check that scores are possible?", "For dice cards, yes: a box turns red if it can't hold that number, such as 20 in Full house or 7 in Fours. Farkle turn scores must be a multiple of 50."],
    ["Is anything sent to a server?", "No. Names and scores stay in your browser's storage on your phone."],
  ],
  body: `      <h2>What the score keeper does for each game</h2>
      <ul>
        <li><strong>Yahtzee and 5-dice games:</strong> a column for each player with every box. It adds the upper subtotal and the 35-point bonus at 63, counts each extra 5 of a kind as 100, and keeps the lower and grand totals. When every box is filled, it names the winner.</li>
        <li><strong>Farkle:</strong> it shows whose turn it is. Type the points and tap <em>Add</em>, or tap <em>Farkle (0)</em>. A turn below your entry minimum doesn't count until that player is on the board. When someone reaches the winning total it starts the final round, then names the winner.</li>
        <li><strong>Mexican Train:</strong> one row per round from your highest double down to the double blank, the pips for each player and the totals, with the lowest total as the leader.</li>
        <li><strong>Any game:</strong> your number of rounds, totals for every player, and the highest or lowest total as the leader.</li>
      </ul>

      <h2>How to start a game</h2>
      <ol>
        <li>Choose the game at the top and the number of players.</li>
        <li>Type the names. They're kept for next time.</li>
        <li>Set the house rules in the <em>Print score sheets</em> tab if your game has them, such as Farkle's entry points and winning total.</li>
        <li>Open <em>Keep score on this phone</em> and start typing scores.</li>
      </ol>

      <h2>Paper or phone?</h2>
      <p>Both work, and plenty of families use both: a printed sheet on the table that everyone can see, and the phone to check the totals. Paper is better when several people want to see the scores at once and for keeping a record of each game night. The phone is better when there's no printer, when the maths is fiddly, as with the Yahtzee bonus or Farkle's final round, and for a quick game away from home. The <a href="/">printable score sheets</a> use the same names and rules, so you can switch any time.</p>

      <h2>Privacy</h2>
      <p>There is no account and no server game. Names and scores are saved only in your phone's browser, and clearing the browser's site data deletes them.</p>`,
});

/* ----------------------------------------------------------- about/privacy */
P.push({
  path: "/about", crumb: "About",
  title: "About ScoreNight: Free Printable Score Sheets for Games",
  desc: "ScoreNight is part of Rooh Sites' free tools: small, private web tools that run in your browser. Who makes it, why it's free and how it handles your data.",
  h1: "About ScoreNight",
  lead: "A small, free tool for game night: printable score sheets with your names and house rules, and a phone score keeper.",
  note: "",
  body: `      <p>ScoreNight is part of <a href="https://roohsites.com/">Rooh Sites</a>' collection of free single-purpose web tools. It's built for families, couples, friends, seniors' game groups and anyone who plays dice, domino or card games and keeps score on paper.</p>
      <h2>Why we built it</h2>
      <p>Searching for a printable Yahtzee, Farkle or Mexican Train score sheet mostly turns up the same fixed PDFs, many of them on copied or spammy pages. None print your players' names, change for your house rules or come in large print. ScoreNight builds the sheet from your settings, and its phone score keeper does the adding up.</p>
      <h2>Is it really free?</h2>
      <p>Yes. Every sheet and the score keeper are free, with no account. Each printed page has a small “Made with ScoreNight” line in the bottom margin, outside the score sheets. That's how other families find the tool.</p>
      <h2>How it works</h2>
      <p>Everything runs in your browser. PDFs are built on your device with the open-source <a href="https://github.com/Hopding/pdf-lib" rel="noopener">pdf-lib</a> library, and names, settings and scores are kept in your browser's local storage. Nothing you type is uploaded.</p>
      <p>${TM} Rules differ from table to table; the sheets print the common rules and whichever house rules you set.</p>`,
});
P.push({
  path: "/privacy", crumb: "Privacy & Terms",
  title: "Privacy & Terms: Your Names and Scores Stay on Your Device",
  desc: "How ScoreNight handles your data: player names, settings and scores are processed and stored on your device and never uploaded. Cookie-free analytics.",
  h1: "Privacy & Terms",
  lead: "Short version: your names, settings and scores never leave your device.",
  noRelated: true, note: "",
  body: `      <h2>Privacy</h2>
      <p>ScoreNight runs entirely in your browser. Player names, game night names, house rules and scores are processed on your device to build the preview, the PDF and the phone score keeper. They are never sent to our servers or to anyone else.</p>
      <p>To save you retyping, the tool remembers your last sheet settings and the game in progress in this browser's local storage. Clearing your browser's site data deletes them, and <em>New game</em> clears the scores.</p>
      <p>We use one privacy-friendly analytics service, Umami, to count page views and a few anonymous events, such as “PDF downloaded” with the game and the number of pages. It does not use cookies or track you across sites, and it never receives what you type into the tool.</p>
      <h2>Terms</h2>
      <p>ScoreNight is provided “as is”, without warranty. Check your printed sheets and your totals; game rules vary and you decide which ones your table plays. ScoreNight is free for personal and commercial use, such as printing sheets for a game club or a community center. ${TM}</p>
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
