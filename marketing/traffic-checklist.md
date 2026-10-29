# Traffic checklist

Made 29 Oct 2026. It turns the traffic part of `100-per-day-plan.md` into tasks, using what we know so far. **You** = your 8–15 hours a week; **Me** = work you ask me for in a session. Tick items as you go (edit the file, or tell me and I'll tick them).

## Where we start
- **Search Console (8–27 Oct):** 1,212 impressions, 14 clicks, average position about 30. Biggest topics: raffle (~400 impressions), ABA graphs (~300), A/B day calendars (~180, already at positions 7–8), panel schedules (~130), labels (~70).
- **Umami:** about 5 real visitors a week (27 Oct). roohsites.com has been tracked too since 28 Oct (shows as /roohsites).
- **Pinterest:** 3 pins a day, made automatically and posted by Cowork; about 238 days of pins left.
- **Goal (plan, month 3 = end of January 2027):** 3,000–5,000 page views a month.

## One-time: do these first

### You
- [ ] **PriceBoard domain** (one time): Cloudflare → Workers & Pages → rooh-priceboard → Custom domains → Set up a custom domain → `pricelist.roohsites.com` → Activate domain. Tell me when it opens and I'll switch on its pins and the roohsites.com links.
- [x] **Pinterest is posting** (done 29 Oct): open your Pinterest profile and check that today's 3 pins went up. If not, allow `tools.roohsites.com` in Claude desktop → Settings → Capabilities (network) for Cowork, then check again tomorrow.
- [x] **Bing Webmaster Tools** (done 29 Oct): roohsites.com verified and its sitemap submitted. The tool subdomains are not in that Bing site; instead all 16 tool sites (177 pages) went to Bing through IndexNow on 29 Oct, all accepted. After big page changes I run the "IndexNow" workflow (or a deploy with its IndexNow option) again. Bing results also feed DuckDuckGo and Yahoo.
- [x] **"Website by Rooh Sites" credit link** (done 29 Oct) in the footer of ksautolabel.com and halosell.com, pointing to `https://roohsites.com/` (a normal link, no nofollow). Or add the two repos to a session and I'll do it.
- [x] **Pinterest website claim:** tools.roohsites.com is claimed (checked 29 Oct). But every pin links to a tool subdomain (raffle., labels., giftcert. and others), not to tools.roohsites.com, so also:
- [x] **Claim roohsites.com itself** (claimed 29 Oct, TXT record). Around 31 Oct: check whether pins to raffle.roohsites.com show the claimed-site attribution. If they don't, tell me and I'll add the tag to the busiest tool sites so you can claim them one by one.
- [ ] **Directories, one a week**, with the copy in `directory-listings.md`: SaaSHub → Microlaunch → Fazier. AlternativeTo is in review until mid-December. Uneed: paste me the rejection message so I can fix the listing and you can resubmit.
- [ ] **Videos:** record the 6 scripts in `short-videos.md` (raffle first: it's our biggest Google topic) plus the Rooh Sites video (script 7).

### Me
- [x] **A/B day pages** (done 29 Oct): the searches are students asking "is today an A day or B day" (/today, position ~7, 94 impressions, 0 clicks). Without a school link the page only showed an example calendar; now it works the day out for any school from one day the visitor is sure of plus the days off, and remembers it on that device. Check Search Console clicks for /today in 2–3 weeks.
- [x] **Raffle pages** (done 29 Oct): titles already matched their searches, so the gap was searches that want a file ("raffle tickets 1-100 pdf", "meal ticket free download"). 11 ticket pages now link a ready-made numbered PDF (Letter and A4) under the generator; Umami counts downloads as ready_pdf.
- [ ] **ABA pages:** same check against the Search Console queries at positions 5–20.
- [ ] **Holiday pages now (Nov–Dec searches):** check the Christmas and holiday pages for gift certificates, raffle tickets and punch cards exist and are linked from the hubs. Pinterest needs holiday pins 30–45 days ahead (the 10 holiday pins are already in the schedule).
- [x] **Salon & spa price list maker** (built 29 Oct): **PriceBoard** at pricelist.roohsites.com. It has 7 sample menus, print sizes from 5 × 7 in to Tabloid, and Instagram, story and TV images, with 7 landing pages and a "how to price salon services" guide. It shows the "Need a website?" card after a download and has Amazon supplies (sign holders, cardstock, laminating pouches). Once the domain works: Pinterest pins switch on, and the salon, barbershop and spa pages on roohsites.com link to it.
- [ ] **ScoreNight** next month (`tool-ideas.md`, games section).

## Daily (about 20–30 minutes, you)
- [ ] **Pinterest:** glance at the profile: 3 new pins? (1 minute)
- [ ] **Communities:** answer 1–2 real questions where a tool solves the problem, using "Method B" in `launch-posts.md`. Good places:
  - r/Etsy, r/FulfillmentByAmazon, r/eBay, r/Flipping (labels, FNSKU)
  - r/Teachers, r/specialed, r/ABA, r/BCBA (A/B day, ABA graphs, IEP at a glance)
  - PTO and school-fundraiser Facebook groups (raffle tickets)
  - salon, barber and café owner groups (gift certificates, punch cards)
  - Meesho and Flipkart seller groups (label crop, in Hindi)
- [ ] **Outreach:** send the day's lead emails from the dashboard (brings visitors to roohsites.com and, more importantly, clients).

## Weekly (you, unless marked)
- [ ] Post 2–3 short videos (YouTube Shorts, Instagram Reels, Facebook Reels), each with its UTM link.
- [ ] One directory listing (see above).
- [ ] **Umami, 5 minutes:** Sources and UTM report for the last 7 days. Tell me which source sent visitors (Pinterest, YouTube, Reddit, a directory) so we do more of that.
- [ ] **Me (automatic):** the pins-daily workflow tops up pins twice a day and opens a GitHub issue if fewer than 30 days are left. Nothing to do unless an issue appears.

## Monthly
- [ ] **Me: one roohsites.com guide a month** for US small businesses, from the queue in the agency repo (`brand/guides/TOPICS.md`), linked to the matching trade page under roohsites.com/websites-for/.
- [ ] **You:** export Search Console → Performance → last 28 days → Export → ZIP (Queries and Pages), and send it to me.
- [ ] **Me:** from the export, find queries at positions 5–20 and fix titles, add FAQ answers or write a new page for each; add pages only where Search Console shows demand.
- [ ] **Me: Amazon rule pages check.** Google's AI answers quote PrepLabel's Amazon pages (suffocation warning label, expiration date label, FNSKU requirements). Each month, check them against Amazon's current Seller Central help pages and update the "Last updated" date; wrong rules quoted by an AI answer would hurt trust.
- [ ] **Me:** one new money tool (salon price list → ScoreNight → contractor estimate maker).
- [ ] **Me:** a one-page report against the milestones (month 3: 3–5k page views; month 6: 15–25k). If month 6 is far below, we change course instead of building more.
- [ ] **Seasonal pages, 6 weeks ahead:**
  - November: Christmas and holiday (gift certificates, raffles, punch cards)
  - December: New Year schedules (A/B day, stream schedules)
  - January: Valentine's punch cards and gift certificates, spring fundraiser raffles
  - March: tax season invoices, spring youth baseball (LineupFair)
  - July: back to school (A/B day, BellBook, IEP at a glance)

## Don'ts (these can cost us Google rankings or accounts)
- Don't buy links, join link swaps or post the same link in many places at once. Follow each subreddit's self-promotion rules.
- Don't put Amazon affiliate links in community posts, emails or PDFs: link to the tool page, which carries the links and the disclosure.
- Don't add AI-written pages in bulk. Only pages that answer a real search better than page 1 does.
- Don't chase broad terms like "free online games" or "invoice generator": the big sites own them. Long, specific searches are where we win.

## How we measure
| Check | Where | When | Target by end of January 2027 |
|---|---|---|---|
| Real visitors | Umami (visitors, "engaged" event) | Weekly | Steady rise week on week |
| Page views a month | Umami | Monthly | 3,000–5,000 |
| Clicks and impressions | Search Console | Monthly | Clicks rising; A/B day, raffle and ABA in the top 5 |
| Visitors by source | Umami UTM report | Weekly | Find the 1–2 sources worth doubling |
