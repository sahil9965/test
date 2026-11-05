# On-page change log

Every ranking test needs a record of what changed and when, so a later Search Console export can be judged against a baseline. Judge each change **14 to 28 days after it goes live** (from about 19 Nov to 3 Dec 2026). Change one thing per page where you can, and don't edit these pages again before judging unless something is broken.

Baselines are from the Search Console export of 8 Oct to 3 Nov 2026 (impressions, average position) in `seo-optimization-plan-2026-11-05.md` section 5.

## Week 1: pushed 5 Nov 2026

| Page | Baseline | What changed | Judge by |
|---|---|---|---|
| bellbook `/today` | 244 impr., pos 6, 3 clicks | One-tap "It was an A day / a B day" answer on the page itself (the old three-field form moved under "Different schedule, or days off since?"); the lead and quick answer rewritten; new events `today_preset`, `school_link_click`; `today_calc` now says whether the one-tap path was used | 19 Nov: Umami events and clicks |
| goaltally `/abc-data-sheet` | 140 impr., pos 50 | Ready-made PDF card (preview image, Letter and A4, checklist and narrative) moved above the generator; new section "ABC data sheet PDF: free printable download"; link to the new checklist page | 3 Dec |
| goaltally `/abc-data-sheet-checklist` (new) | about 30 impr. across the queries it targets (pos 34 to 55) | New page: H1 and first sentence "ABC data sheet checklist", blank PDF card, column table, how to tally, 4 FAQs. Added to sitemap, llms.txt, footer and home page | 3 Dec; request indexing |
| goaltally `/task-analysis-data-sheet` | 78 impr., pos 33 | File card above the generator; new section "Task analysis template: blank PDF and a filled-in example" | 3 Dec |
| goaltally `/trial-by-trial-…`, `/prompt-level-…`, `/cold-probe-…`, `/frequency-…`, `/duration-…`, `/partial-interval-…`, `/whole-interval-…`, `/momentary-time-sampling-…` | 17 to 61 impr., pos 11 to 29 | The same file card moved above the generator (cold probe already earns clicks: watch it for a drop). Image no longer lazy-loaded | 3 Dec |
| streamweek `/` | 74 impr., pos 29 | H1 "Stream Schedule Template and Maker with Time Zones", lead starts "Pick a stream schedule template", gallery of 8 template styles above the maker (5 themes linking to their pages, 3 image formats); template pages link back with the anchor "Stream schedule template and maker" | 3 Dec |
| ticketrun `/how-to-number-raffle-tickets-in-word` | 49 impr., pos 14 | Free Word file (1 to 200, 8 per page, SEQ fields; Letter and A4) with preview, new section and FAQ | 19 Nov |
| ticketrun `/meal-tickets` | 26 impr., pos 29 | File card with preview above the generator; new section "Meal ticket free download" | 3 Dec |
| ticketrun `/door-prize-tickets`, `/raffle-ticket-template-8-per-page`, `/raffle-tickets-1-100` and the other range pages | 20 to 25 impr., pos 16 to 25 | File card with preview image above the generator | 3 Dec |
| paneldex `/3-phase-panel-schedule-template` | 39 impr., pos 18 | Filled-in example image (from the tool's own PDF) and a sourced note on 120/208 V and 277/480 V (NEC 220.5(A), ANSI C84.1) | 3 Dec |
| paneldex `/breaker-box-label-template` | 57 impr., pos 24 | Example label sheet image | 3 Dec |
| paneldex `/` | 83 impr., pos 39 | "What a finished panel schedule looks like" with a sample image | 3 Dec |
| labelfit `/vinted-label-thermal-printer` | 36 impr., pos 12 | Carrier table for Evri, InPost, Royal Mail and DPD (hedged: Vinted's options change by sale) | 19 Nov |

## Event names (5 Nov)

BellBook, TicketRun and LabelFit now also send the standard `pdf_download` (and `png_download` for TicketRun and LabelFit) next to their own event names, so the lead card and the reports can read them. The old names are kept so history still lines up.

## Not done in Week 1

- **Roomproof `/` example report.** Needs real example photos; see the note in the Week 1 report.
- **LabelFit screenshot** of a converted label. Needs a real (redacted) Vinted label.
- Pages in the push list still to do: gradledger (2), punchperk `/behavior-punch-card-printable`, preplabel (2), collabrate `/`, paneldex `/panel-load-balancing-calculator`, ticketrun `/`.
- Title tests (BellBook `/today`: "Answer in 10 seconds"): wait until the new page has 14 days of data, then test one title change.
