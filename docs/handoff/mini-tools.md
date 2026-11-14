# Handoff: mini tools chat

Last updated: 14 Nov 2026

## Done
- Read CLAUDE.md, moved to the live branch `claude/ecstatic-pascal-yzcrhr` (Sahil approved commits and pushes there).
- Wrote this handoff in the new format. Never push to `main` in this repo (Sahil's rule, confirmed 13 Nov).
- Checked Google AI Mode's noindex advice against the repo: robots.txt on every site is `Allow: /` with only `Disallow: /api/`, so Googlebot can see the noindex tags. `tools/index-plan.mjs` rebuilds sitemaps via `tools/sitemap.mjs`, which skips noindex pages. No changes needed.

## Open
1. 3 Dec: compare Search Console before/after the 12 Nov noindex change (8 tools, 22 pages; `tools/index-plan.json`). Decide which hidden tools to bring back.
2. Improve the 5 kept tools (GoalTally, BellBook, TicketRun, PanelDex, PrepLabel) instead of building new ones.
3. Not now: 301 redirects for hidden tools and moving everything under one subfolder (AI Mode suggested both). Revisit only after the 3 Dec comparison.

## Know for next time
- Work on `claude/ecstatic-pascal-yzcrhr`. Commit messages end with the Co-Authored-By / Claude-Session lines the session gives.
- Notes from Front desk are Sahil's requests passed on. Ask Sahil in this chat before anything risky.
- Ask Sahil before building any new tool (~30 tools gave ~370 visitors in 30 days).
- Honest framing only: no fake usage numbers or testimonials.
- Never use components that capture mouse wheel or touch scroll.
- Short answers; recommend one option.
- Analytics: `python3 engine/umami_report.py --days 7` in sahil9965/roohsites.
