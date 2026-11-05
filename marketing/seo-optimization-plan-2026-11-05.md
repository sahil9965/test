# Optimization plan for all tools

Made 5 Nov 2026 from Search Console (8 Oct to 3 Nov: web, images, AI features) and Umami (19 Oct, when tracking started, to 5 Nov). Details: `marketing/search-console-2026-11-03.md`; scripts: `tools/gsc-report.py` and `tools/umami-report.py` (rerun both on the next export).

Targets in this file are things to steer by, not forecasts.

---

## 1. What the two data sources say together

| Tool | Google clicks | Google impressions | Avg position | Umami sessions* | Engaged* | Made a file or export* |
|---|---:|---:|---:|---:|---:|---:|
| GoalTally | 15 | 570 | 33.5 | 35 | 21 | 13 |
| BellBook | 5 | 425 | **10.3** | 5 | 3 | no events set up |
| TicketRun | 4 | 404 | 38.1 | 21 | 5 | 4 |
| PanelDex | 2 | 251 | 31.7 | 5 | 3 | 1 |
| InvoiceKit | 1 | 157 | 61.7 | 2 | 1 | 0 |
| GradLedger | 0 | 128 | 34.5 | 1 | 0 | 0 |
| LabelFit | 2 | 121 | 34.1 | 19 | **16** | **12** |
| PunchPerk | 0 | 78 | 42.9 | 12 | 2 | 0 |
| StreamWeek | 0 | 77 | 28.5 | 4 | 3 | 1 |
| Roomproof | 0 | 58 | 19.2 | 1 | 0 | 0 |
| PrepLabel | 4 | 55 | 23.7 | 9 | 3 | 2 |
| CollabRate | 0 | 49 | 32.3 | 4 | 1 | 0 |
| GiftStub | 0 | 42 | 47.5 | 5 | 2 | 1 |
| LineupFair | 0 | 23 | 82.6 | 2 | 0 | 0 |
| GlanceSheet | 0 | 15 | 66.5 | 9 | 2 | 0 |
| ScoreNight | 0 | 11 | 74.2 | 11 | 3 | 1 |
| PriceBoard | 0 | 4 | 79.2 | 9 | 2 | 0 |
| Quotewell | n/a | n/a | n/a | 2 | 0 | 0 |

\*Umami counts from 19 Oct, when tracking started. Pageviews on 19 to 23 Oct carry a path glitch (38 events, `/slug` stuck in front of a full address) that was fixed; it only affects page-level counts for those days. Linux sessions are left out: 62 of the 229 sessions came from Linux machines in data-centre cities (Paris, Warsaw, San Jose, New York), and only 3 of them ever clicked anything, so they are almost certainly crawlers. A session can touch two tools, so the rows slightly overlap.

### What stands out

1. **Almost nobody reaches page 1.** 10 of the 153 pages Search Console lists average position 10 or better. The middle of the table is where the clicks are: the 20 pages at positions 11 to 20 earned 18 of the 33 page-level clicks, and the 26 at positions 21 to 30 earned 4. Moving pages from page 2 to page 1 is the main job.
2. **"Ranks well but isn't clicked" is one tool, not many.** Only BellBook (positions 3 to 7 on the "is today an A day or B day" searches, 3 clicks from 244 impressions on `/today`). The Google results for that search are school-district pages that answer for one school, so the searcher wants a school's answer, not a calculator. That is a likely cause, not a proven one.
3. **ChatGPT is your best source of engaged visitors.** 18 sessions in 5 days, 16 of them engaged, 69 tool actions (LabelFit 25 pageviews, StreamWeek 5). That is higher engagement than Google, Pinterest or Instagram. Cities and devices differ, so most of these look like real people. Google sent 27 sessions, Pinterest 6 (some of those are you in Chandigarh), Instagram 9 with **0 engaged**, Facebook about 5.
4. **LabelFit is the most-used tool** (12 of 19 sessions made a PDF, 37 PDFs in all), yet Google sent it 2 clicks. Its visitors come from AI answers and direct visits, not search.
5. **Umami agrees with Search Console:** 34 Google pageviews against 31 Google clicks, so both are measuring the same thing.
6. **Real visits are growing:** non-Linux sessions went from 8 or fewer a day before 27 Oct to 13 to 27 a day in the last week.
7. **Most visitors do nothing.** Of 229 sessions, 70 clicked anything and 33 made a file or export. Only 3 Linux sessions out of 62 clicked, so this is partly bots; still, PunchPerk (12 sessions, 2 engaged), PriceBoard (9, 2), GlanceSheet (9, 2) and the agency site (15, 3) show people arriving and leaving.
8. **About 70 of the 207 pages in the sitemaps have never shown in Google** in 27 days (list in section 6). Some are `/about` and `/privacy`; most are real landing pages.
9. **Money and traffic are in different places.** GoalTally, BellBook, GradLedger, GlanceSheet, LineupFair and ScoreNight (teachers, therapists, families) bring the clicks but have no buyer: ABA and school users don't hire a web designer. PanelDex, InvoiceKit, PrepLabel, LabelFit, TicketRun, PunchPerk, GiftStub, PriceBoard and Quotewell serve people who sell something or run a business. Spend ranking effort on the second group first when it costs the same.

---

## 2. Four problems, four playbooks

### A. Page 1 but few clicks (BellBook)
Test one change at a time and wait 14 to 28 days (the numbers are too small to judge a change within a week).

1. **Make `/today` answer straight away.** Today it asks you to pick a reference day. Add three one-tap presets above the fold: *alternates every school day*, *Mon/Wed A, Tue/Thu B, Fri alternates*, *my school has a published calendar (enter it once)*. Remember the choice on the device so a return visit shows the answer instantly.
2. **Then test the title.** Current: `Is Today an A Day or B Day? Rotation Day Checker | BellBook`. Variant: lead with the result ("Is today an A day or B day? Answer in 10 seconds").
3. **Add the missing event tracking.** BellBook has no events in Umami, so we can't tell whether anyone used the tool. Add `today_calc` (answer shown) and `school_link_made`.
4. **Teachers are the buyers, students are the searchers.** Put a "Make this link for your school" box under the answer, and record clicks on it.

### B. Page 2 and 3: "push to page 1" (positions 11 to 30, the biggest lever)
Use this same recipe on every page in the push list (section 5), one batch at a time:

1. **Check which query the page really ranks for** (Search Console, Performance, filter by page, Queries tab). Make the page win that query.
2. **Put the exact phrase in the H1, the first sentence and one H2.**
3. **Put the file above the fold:** buttons for the Letter PDF, the A4 PDF and the editable version, each named after the query ("Download ABC data sheet PDF"), plus a preview image with an alt text that uses the phrase.
4. **Answer the neighbouring questions** on the page (3 to 5 short questions, sourced where they make claims).
5. **Link to the page from every sibling page and the tool home with the exact phrase as the link text.**
6. **Show a "last updated 5 Nov 2026" line** and update it whenever the page changes.
7. **Get 2 to 3 links from outside** (section 4).
8. **Request indexing** after the change (Search Console, URL Inspection) and write the date in the tracker.

### C. Deep (position 31 and beyond)
These pages have impressions but sit on page 4 to 10. A better title won't move them. Choose per page:
- **Keep and build links** if the tool serves a commercial audience (PanelDex home, InvoiceKit niche pages, StreamWeek).
- **Merge** two pages that compete for the same query (check TicketRun's raffle pages and GoalTally's data sheets).
- **Leave alone** if neither applies (LineupFair, GlanceSheet, ScoreNight, PriceBoard for now). Zero effort is a valid choice.
- Rewrite to a **different, narrower query** the page can win (long-tail variants taken from real impressions).

The thinnest pages in the whole set are InvoiceKit's: freelance (444 words), photography (361), UK VAT (344). Grow them to about 800 words each with a worked example (made-up numbers, labelled) and one sourced paragraph (for the UK page, HMRC's rules on what a VAT invoice must show).

### D. No impressions at all
Check the cause before doing anything else:
1. **Is it indexed?** In Search Console, Indexing, Pages: look for "Crawled, currently not indexed" and "Discovered, currently not indexed". Then URL Inspection on the pages in section 6 and click Request indexing (a few a day).
2. **Is it linked?** Each page needs 2 or more internal links from a page that already has impressions.
3. **Is it in Bing?** Bing's index also feeds other engines and AI answers. Verify the domain in Bing Webmaster Tools and submit the sitemaps. IndexNow is already sent.
4. **Time-box it.** Indexed but 0 impressions after 6 weeks: rewrite around a real query or merge into a stronger page. Under 10 impressions and no outputs after 8 weeks: freeze the tool (no more work, leave it live).
5. **Raffle season is now.** TicketRun's `/christmas-raffle-tickets` and `/turkey-raffle-tickets` have no impressions yet. US Thanksgiving is on 26 Nov; index them this week.

### E. Visitors who don't use the tool
Looking at Umami, the problem is usually the first 10 seconds:
- **Show a result before asking for anything:** a prefilled example, "Load example" button, or a visible preview that already looks like the output (GlanceSheet, PunchPerk, PriceBoard, ScoreNight, GiftStub).
- **TicketRun's visitors are often on phones** (19 of its 36 pageviews, many from Pinterest and Facebook) but the tool is built for a desktop and a printer. Test the whole flow on a phone.
- **Instagram bio clicks: 9 sessions, 0 engaged.** Send Instagram traffic to a page that matches the post (the post's tool), not the hub or the agency home page.
- **Give every tool the same event names** (`pdf_download`, `png_download`, `export`) so the lead card and the reports can see them. Today LabelFit, PrepLabel, TicketRun and GoalTally use their own names.
- **The "Need a website?" card exists on only 7 tools** (GiftStub, PunchPerk, InvoiceKit, PanelDex, PriceBoard, ScoreNight, Quotewell). 11 never show it: BellBook, CollabRate, GlanceSheet, GoalTally, GradLedger, LabelFit, LineupFair, PrepLabel, Roomproof, StreamWeek, TicketRun (the list is in `tools/leadline.json`). Add it only where the audience runs a business: TicketRun (organizers of fundraisers and events), PrepLabel and LabelFit (sellers) with a different ask, Roomproof (property managers and cleaners).
- **`lead_click` has not fired once.** Reword the ask on the tools where the card shows, and look again in two weeks.

### F. The ChatGPT and AI channel (new)
- **Keep the pages quotable.** Start each page with one plain sentence that says what the tool does, that it is free and needs no signup, and what it outputs. Keep `llms.txt` current.
- **Make sure Bing has every page** (Bing Webmaster Tools) so AI search engines that use it can find them.
- **Watch it in Umami:** `utm_source=chatgpt.com` is now a source. Count it every Monday.
- Google AI features showed 131 impressions (BellBook 57, GoalTally 34). The pages that get cited there are the ones with a clear question and a clear answer.

---

## 3. Tool by tool

| Tool | Where it stands | Do this (in order) | Owner |
|---|---|---|---|
| **GoalTally** | Most Google clicks (15); Malaysia leads by pageviews (mostly a few repeat visitors); 13 of 35 sessions use the tool | 1. `/abc-data-sheet` (140 impr., position 50): file buttons above the fold, preview image, and a new `/abc-data-sheet-checklist` page for the tick-box intent (about 30 impressions across those queries). 2. `/task-analysis-data-sheet` (78 impr., position 33): same recipe. 3. Links from the home page and sibling pages with exact anchors. 4. Link-building in ABA and special-education resource lists | Claude + you |
| **BellBook** | Best rankings, low clicks, no events | Playbook A. Then index `/6-day-cycle-calendar`, `/block-schedule-calendar`, `/ab-day-lesson-planner`, `/dated-lesson-plan-book` (no impressions yet; teacher planning peaks in summer) | Claude |
| **TicketRun** | 404 impressions; head terms at position 85 to 98; long-tail pages rank at 14 to 29; many phone visitors from Pinterest and Facebook | 1. Index the holiday pages now (Thanksgiving 26 Nov). 2. Push `/how-to-number-raffle-tickets-in-word` (position 14), `/raffle-ticket-template-8-per-page` (16), `/door-prize-tickets` (21), `/meal-tickets` (29, "meal ticket free download" at 38). 3. Test the full flow on a phone. 4. Don't chase "raffle generator" yet | Claude + you |
| **LabelFit** | Used a lot (12 of 19 sessions make a PDF), AI-sourced | 1. `/vinted-label-thermal-printer` (position 12, 36 impr.): Evri, InPost, Royal Mail and DPD sections, a screenshot, step list. 2. Index `/evri-label-6x4` and `/royal-mail-label-6x4` (no impressions). 3. Keep answers short and quotable. 4. Add a UK Amazon supplies block (printers, label rolls) | Claude |
| **PrepLabel** | Best click rate (7.3%); niche queries | 1. Index `/fnsku-labeling-requirements-2026`, `/dymo-30334-fnsku-labels`, `/fnsku-zpl-zebra`, `/fnsku-labels-from-csv`, `/bin-location-labels` (no impressions: they target specific, low-competition queries). 2. Link them from `/suffocation-warning-label` (position 14) and the home page | Claude + you |
| **PanelDex** | 251 impressions; commercial audience | 1. `/3-phase-panel-schedule-template` (position 18) and `/breaker-box-label-template` (24): add a filled-in example image and sourced voltage notes. 2. Home page (position 39, 83 impr.): add a visible sample. 3. Links from electrician communities (check rules). 4. The new Quotewell electrician page links to it | Claude + you |
| **InvoiceKit** | 157 impressions, position 62; thin niche pages | Section 2C. Grow the three thin pages; add pages for "blank VAT invoice template" and "invoice template for hours worked" (real queries, 7 to 8 impressions each). Lower priority than the rows above | Claude |
| **GradLedger** | 128 impressions, 0 clicks | 1. `/homeschool-credit-hours-calculator`, `/homeschool-course-description-generator`, `/homeschool-hours-tracker`: no impressions, and they are real tools. Index and link them from the home page. 2. `/dual-enrollment-homeschool-transcript` (position 17): push. 3. Answer-first line on the GPA calculator for the question query that already shows at position 3.7 | Claude + you |
| **StreamWeek** | All 77 impressions come from "stream schedule template" (position 28.5); 6 of 8 pages never shown | 1. Index the 5 template pages. 2. Put a gallery of 6 to 8 template styles above the fold (the results that win are visual galleries). 3. Add the phrase "stream schedule template" to the H1. 4. ChatGPT already sends traffic here (5 pageviews) | Claude + you |
| **Roomproof** | Home at position 13; 8 of 12 pages never shown | Index them; check `/photo-report-template` against the home page (same query?); examples of a finished report. Audience: property managers, cleaners, Airbnb hosts | Claude |
| **PunchPerk** | 12 sessions, 2 engaged, no downloads | `/behavior-punch-card-printable` (position 24) push; "Load example" button; index `/salon-loyalty-card-template` | Claude |
| **GiftStub** | 42 impressions, 6 pages never shown (salon, massage, voucher, Diwali) | Index the salon and massage pages (commercial intent); links from PriceBoard and PunchPerk; Pinterest is already running | Claude + you |
| **CollabRate** | 49 impressions; India pages never shown | Index `/influencer-rate-card-india` and `/ugc-rate-card-india`; share them through your own Instagram | You |
| **PriceBoard** | Live since 29 Oct; home page never shown | Index home and the 5 landing pages; wait 4 weeks | You |
| **ScoreNight** | Live since 30 Oct; all 9 pages already shown once | Wait 4 weeks | none |
| **GlanceSheet** | 15 impressions, 9 sessions, 0 downloads | "Load example" button; low priority (IEP season is autumn) | Claude |
| **LineupFair** | 23 impressions, position 83 | Freeze until spring | none |
| **Quotewell** | Domain now answers (3 pageviews seen); no search data yet | Request indexing of the home page and 8 trade pages; run IndexNow; first look at Search Console in 2 weeks | You |
| **Agency site** | 108 impressions, 15 sessions, 3 engaged | Not a tool: the leads come from outreach and the tools' after-download card. Link the guides from the tool pages that serve businesses | Claude |
| **Slotsmith site** | 16 impressions, position 70 | Handled in `slotsmith/marketing/launch-offer-checklist.md` | n/a |

---

## 4. Getting links from outside (rankings above position 20 need them)

New domains need other sites to point at them. Do about five a week and write each in the tracker.

- **Directories and "free tools" lists** (`marketing/directory-listings.md` has the list).
- **Resource pages:** ABA and special-education resource lists, homeschool resource lists, fundraising and PTO resource pages, Amazon-seller communities, electrician forums. One short, honest message: what the tool does, that it's free, one example link.
- **Value-first replies** in Reddit and Facebook groups where links are allowed (read the rules first). Answer the question; mention the tool only if it solves it.
- **Pinterest** (running for 8 tools), **YouTube Shorts** (`marketing/short-videos.md`), **Instagram** (send visitors to the matching tool page).
- **AI answers:** keep pages clear and current; nothing else to do.
- **Never:** buy links, post in bulk, or use the same text in many places.

---

## 5. The push list (pages at positions 9 to 30 with 15 or more impressions)

| Page | Impr. | Position | Do first |
|---|---:|---:|---|
| goaltally `/cold-probe-data-sheet` | 61 | 11 | Already earns clicks: keep, add links |
| goaltally `/aba-graph-template-excel` | 57 | 14 | Already earns clicks: keep, add links |
| goaltally `/` | 70 | 20 | Push the "ABA graph maker" phrase |
| goaltally `/trial-by-trial-data-sheet` | 23 | 29 | File buttons, preview |
| goaltally `/duration-recording-data-sheet` | 17 | 28 | File buttons, preview |
| ticketrun `/how-to-number-raffle-tickets-in-word` | 49 | 14 | Add a downloadable Word file and FAQ |
| ticketrun `/raffle-ticket-template-8-per-page` | 25 | 16 | File buttons |
| ticketrun `/door-prize-tickets` | 25 | 21 | File buttons |
| ticketrun `/raffle-tickets-1-100` | 20 | 25 | File buttons |
| ticketrun `/meal-tickets` | 26 | 29 | File buttons, the phrase "meal ticket free download" |
| ticketrun `/` | 48 | 28 | Phrase and links |
| paneldex `/3-phase-panel-schedule-template` | 39 | 18 | Example image, sourced notes |
| paneldex `/breaker-box-label-template` | 57 | 24 | Example image |
| paneldex `/panel-load-balancing-calculator` | 14 | 19 | Add to the push (just under 15) |
| labelfit `/vinted-label-thermal-printer` | 36 | 12 | Carrier sections, screenshot |
| gradledger `/dual-enrollment-homeschool-transcript` | 22 | 17 | Example, sources |
| gradledger `/homeschool-report-card-template` | 21 | 28 | Example |
| roomproof `/` | 43 | 13 | Example report |
| punchperk `/behavior-punch-card-printable` | 16 | 24 | File buttons |
| streamweek `/` | 74 | 29 | Gallery, H1 phrase |
| preplabel `/suffocation-warning-label` | 17 | 14 | Links to its new siblings |
| preplabel `/` | 18 | 9 | Phrase and links |
| collabrate `/` | 23 | 22 | Phrase and links |
| bellbook `/today` and `/` | 244 and 135 | 6 | Playbook A |

---

## 6. Pages with no impressions in 27 days (check indexing first)

InvoiceKit: bill-of-supply-format, export-invoice-without-igst-under-lut, invoice-format-without-gst, invoice-templates · LabelFit: ebay-half-sheet-label-to-4x6, evri-label-6x4, flipkart-label-crop-4x6, print-shipping-label-from-phone, royal-mail-label-6x4, split-shipping-label-and-packing-slip · PrepLabel: bin-location-labels, dymo-30334-fnsku-labels, fnsku-labeling-requirements-2026, fnsku-labels-from-csv, fnsku-zpl-zebra · TicketRun: christmas-raffle-tickets, diwali-lucky-draw-coupons, drink-tickets, lucky-draw-coupon-generator, lucky-draw-coupons-1-to-1000, turkey-raffle-tickets · GradLedger: homeschool-course-description-generator, homeschool-credit-hours-calculator, homeschool-hours-tracker · Roomproof: cleaning-photo-report, entry-condition-report-photos, move-in-inspection-checklist-with-photos, move-out-checklist-with-photos, photo-report-template, property-inventory-with-photos · CollabRate: beginner-ugc-rate-card, influencer-rate-card-india, ugc-rate-card-india, ugc-usage-rights-calculator, ugc-whitelisting-rates · GoalTally: frequency-data-sheet, partial-interval-recording-data-sheet, phase-change-line-graph, prompt-level-data-sheet · BellBook: 6-day-cycle-calendar, ab-day-lesson-planner, block-schedule-calendar, dated-lesson-plan-book, teacher-planner-2027-2028 · GiftStub: diwali-gift-voucher, gift-voucher-template, massage-gift-certificate-template, salon-gift-certificate-template, salon-gift-voucher-format · StreamWeek: stream-schedule-for-discord, stream-schedule-time-zones, twitch-schedule-template, vtuber-schedule-template, youtube-live-schedule-template · PunchPerk: salon-loyalty-card-template · GlanceSheet: iep-snapshot-template · PriceBoard: the home page, barber-price-list-template, hair-salon-price-list-template, how-to-price-salon-services, instagram-price-list-template, lash-and-brow-price-list, nail-salon-price-list-template · Quotewell: all 13 pages (new).

---

## 7. Schedule

| When | Claude | You |
|---|---|---|
| **Week 1 (5 to 11 Nov)** | Push batch 1: the 10 pages with the most impressions in section 5, plus BellBook `/today` presets and events; BellBook, TicketRun and LabelFit event names; StreamWeek gallery; `/abc-data-sheet-checklist` | **Indexing audit (45 minutes):** Indexing report screenshot; URL Inspection and Request indexing for the Thanksgiving and Christmas raffle pages and the 3 to 4 highest-value pages of each tool in section 6; verify Bing Webmaster Tools and submit sitemaps; open any page with `?notrack=1` on every device you use |
| **Week 2 (12 to 18 Nov)** | Push batch 2 (rest of section 5); expand the 3 thin InvoiceKit pages; build up to 6 new long-tail pages from real queries | First off-site sprint (5 placements); **export Search Console again on 17 Nov** and I rerun both reports |
| **Week 3 (19 to 25 Nov)** | Holiday pages and TicketRun mobile fixes; add the website card where it fits; second batch of internal links | Second sprint of 5 placements |
| **Week 4 (26 Nov to 2 Dec)** | Measure; apply the decision rules below | Export Search Console and Umami again on 1 to 3 Dec |

New long-tail pages to build only after the push batches, each from a real query seen in Search Console (2 to 9 impressions each, so these are signals, not volumes): "blank VAT invoice template", "invoice template for hours worked", "task analysis template", "dtt data sheet", "aba graph generator", "50/50 raffle ticket prices", "homeschool report card generator", "punch cards for business", "6x4 label in mm".

---

## 8. Targets and decision rules

Compare the next two exports (17 Nov and 1 to 3 Dec) with this one.

| Measure | Now | Target for the 1 to 3 Dec export |
|---|---:|---:|
| Google clicks, 28 days | 31 | 60 or more |
| Google impressions | 2,064 | 4,000 or more |
| Pages at average position 10 or better | 10 | 18 or more |
| Sitemap pages never shown in Google | about 70 | under 40 |
| Real sessions per day (Umami, not Linux) | about 15 to 27 | 35 or more |
| Sessions from ChatGPT in a week | 18 in 5 days | keeps growing |
| Sessions that make a file or export | 33 | 70 or more |

Decision rules (use the page filter in Search Console):
- A pushed page **gains 5 or more positions** in 4 weeks: use the same recipe on the next pages.
- It gains less and has **20 or more impressions:** it needs outside links, not more edits.
- Indexed but **no impressions after 6 weeks:** rewrite around a real query or merge into a stronger page.
- A tool with **under 10 impressions and no outputs after 8 weeks:** freeze it.
- A change to a title or a snippet: **judge it after 14 to 28 days at a similar position,** not before.

---

## 9. What I need from you

1. **Search Console: Indexing, Pages** (screenshot, or export the reasons table) and the result of URL Inspection on a few pages from section 6.
2. **A go** for Week 1 on-page work. These are edits to titles, descriptions, headings, links and example images on existing pages, plus the BellBook presets. I can start straight away.
3. **`?notrack=1`** opened once on each of your phones and laptops, so your own visits stop counting (some Chandigarh sessions in Umami look like yours).
4. **Bing Webmaster Tools:** add the domain if it isn't there yet (a few minutes) and tell me.
5. **Your 17 Nov export** (the three zips): I'll rerun the reports and compare.
