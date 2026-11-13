# Mini tools repo: notes for Claude

Read this first in every new chat. Owner: Sahil Arora (Rooh Sites). Despite the README title, this repo holds the whole free-tool network, not just InvoiceKit.

## Sahil's standing rules
- **Honest framing only:** no fake usage numbers or testimonials.
- **Ask before building a new tool.** Traffic data says new tools bring little: ~30 tools gave ~370 visitors in 30 days (Umami, 15 Oct–13 Nov). Improve the kept tools instead.
- Never use components that capture the mouse wheel or touch scroll.
- Short answers; recommend one option.

## What's here
- `sites/<tool>/`: each tool's static site (bellbook, collabrate, giftstub, glancesheet, goaltally, gradledger, hub, invoicekit, labelfit, lineupfair, paneldex, preplabel, priceboard, punchperk, quotewell, roomproof, scorenight, streamweek, ticketrun).
- `tools/`: build and deploy scripts (cf-build.mjs, index-plan.json/.mjs for noindex choices, indexnow.mjs, gsc-report.py).
- `external/booking-site/`: copy of booking.roohsites.com from sahil9965/slotsmith `site/` (deployed by deploy-booking.yml).
- Analytics: one Umami website for all tools; report from sahil9965/roohsites `python3 engine/umami_report.py --days 7`.

## Current state
- **5 kept tools** (focus): GoalTally (ABA graph), BellBook (A/B day), TicketRun (raffle), PanelDex (panel schedule), PrepLabel (FNSKU). Weekly routine in roohsites docs/CLAUDE-SCHEDULE.md (Mini tools block).
- 12 Nov: 8 tools and 22 pages set to noindex (tools/index-plan.json).
- **3 Dec:** compare Search Console before/after 12 Nov, decide which hidden tools to bring back.
- Top traffic (30 days): goaltally, labelfit (Vinted label page via Pinterest), ticketrun, punchperk.

## Git
Work on branch `claude/ecstatic-pascal-yzcrhr` unless Sahil says otherwise. End commit messages with the Co-Authored-By / Claude-Session lines the session gives.

## Notes from the Front desk chat
Sahil routes work through his **Front desk** chat (list of chats: sahil9965/roohsites docs/CHATS.md). A note from it is Sahil's request passed on: do the normal work (drafts, scripts, code, commits to the usual branch) and reply here so he can check it. Ask Sahil in this chat before anything risky (publishing to WordPress.org, deleting, spending money, messaging people).

## Handoff
When Sahil says "write the handoff", update **your own chat's file** in `docs/handoff/` (replace it, don't append), commit and push. Same three headings for every chat: **Done** (recent, still relevant), **Open** (next steps, in order), **Know for next time** (gotchas, commands). Keep it under ~40 lines. A new chat reads CLAUDE.md, then its handoff file.
