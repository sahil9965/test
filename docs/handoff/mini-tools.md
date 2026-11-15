# Handoff: mini tools chat

Last updated: 15 Nov 2026

## Done
- Quality pass after the 7 Nov Google update (request came via Assistant chat, Sahil said yes). Search Console 8-14 Nov vs 1-7 Nov: impressions 1,008 to 434, 81% of the loss on KEPT tools (abday 208 to 9, abagraph 225 to 33, panelschedule 79 to 6). The drop began 7 Nov, before our 12 Nov noindex changes.
- Audited the 16 pages on the list. GoalTally and BellBook pages already had quick answer, steps, example, 4-7 FAQs and no duplicated text, so they were left unchanged.
- PanelDex (commit `fa6efc8`): example table on /42-circuit-panel-schedule, example figure on /panel-schedule-template-pdf, step lists on /3-phase-panel-schedule-template and /breaker-box-label-template. QA 9/9 pages clean, SEO check 0 errors. Pushed to the live branch, which triggers the Cloudflare deploy.
- Not checked: that the deploy finished (one early curl did not show the new section yet).

## Open
1. Confirm the new PanelDex content is live (e.g. "first rows of a filled-in schedule" on panelschedule.roohsites.com/42-circuit-panel-schedule).
2. Sahil: request indexing in Search Console for abday.roohsites.com/ and /today, abagraph.roohsites.com/ and /cold-probe-data-sheet, panelschedule.roohsites.com/ and /3-phase-panel-schedule-template.
3. 3 Dec: compare Search Console before/after, decide which hidden tools come back. A content pass probably can't explain a drop that began 7 Nov, so wait for that data before touching /today or the GoalTally sheets.
4. Not now: 301s for hidden tools, one-subfolder consolidation.

## Know for next time
- Work on `claude/ecstatic-pascal-yzcrhr`; never push to `main` in this repo (Sahil, 13 Nov). Push to that branch deploys changed sites (deploy-cf.yml).
- Notes from Front desk or Assistant chat are Sahil's requests passed on; ask Sahil before anything risky.
- Don't change URLs, tools/index-plan.json, or add pages/tools without asking.
- QA: `node tools/qa.mjs sites/<slug>` fails here (pinned Playwright has no browser). Workaround: run a temp copy of qa.mjs importing `/opt/node-tools/node_modules/playwright/index.mjs` with `chromium.launch({executablePath:"/opt/pw-browsers/chromium"})`, delete it after. SEO check: `node tools/seo-check.mjs sites/<slug>`.
- Honest framing only, no fake stats; no scroll-capturing components; short answers, one recommendation.
