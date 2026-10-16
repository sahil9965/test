<!-- Research method: 3 Sonnet researchers (15 categories) → 7 skeptical verifiers + 1 judge on the stronger model, 16 Oct 2026. No vendor pricing page could be opened from this environment; prices come from search summaries and are marked as such. Raw notes: scratchpad (not committed). -->

# Final verdict: tools to sell on roohsites (16 Oct 2026)

## Verdict on the strategy

"The same job, much cheaper, in the browser" mostly fails. In 6 of the 7 candidates we checked, and in all 9 categories the researchers dropped, a free tool already does the core job and ranks for the long-tail searches a new domain could win. Buyers mostly pay incumbents for what a static page can't offer: lasting hosting, human checks, guarantees, top model accuracy, verification services. **Only one tool qualifies, and only after a half-day test.** Build that one, not 3–5. Look for the next ones where free tools break at scale or on file-format fidelity, bought by people with a work budget.

## Recommended tools

### 1. Org charts for large organisations, from a spreadsheet (conditional)

**Pitch:** Drop in an HR export of any size and get an editable PowerPoint deck with one slide per manager, plus a tiled print PDF. Staff data never leaves the browser.

**Who pays and why:**
- **Buyers:** HR generalists, consultants, chiefs of staff, and school or nonprofit admins who must turn an Excel export into slides or a poster. Staff records are personal data, so "no upload" is a real reason to choose us.
- **Tailwind:** Microsoft retired the free route from Excel. The Visio Data Visualizer service shut down on 2 Mar 2026, diagrams embedded in Excel stopped loading, and the "Create Diagram from Data" wizard needs Visio Plan 2. I checked this on Microsoft's own domains, via search summaries.
- **Unmet need:** On Lucid's own forum, a Lucid answer says big charts can't be split by manager automatically (from the verifier).

**Incumbent prices.** Nobody opened a pricing page.
- **Vendor domain, via search summary:** Lucidchart Individual $9/mo billed annually. Visio Plan 1 $5 and Plan 2 $15 per user per month, paid yearly. Savvy Org Charts (an Excel-to-PowerPoint add-in) $99/mo billed annually, $1,188/yr.
- **Third party only:** Creately Personal $5 or $8/mo; OrgPlease from $19/mo flat; OrgChartDesk $19 per editor per month; OrgChart Now $29.99–$325/mo; Pingboard/Workleap $4,999/yr (competitors' blogs). Four sources disagree on Organimi, so treat its price as unknown.

**Our wedge.** Output that works for a big organisation, which no free tool I found claims:
- a validation report (missing managers, loops, duplicates);
- a compact layout readable at 500–2,000 people;
- a PPTX deck with one slide per manager or department, linked by "continued on slide N";
- a tiled A4/Letter/A3 PDF;
- a "what changed since last quarter" comparison.

My spot-check: MLC, the strongest free rival, exports editable PPTX from Excel/CSV/Sheets, but its own page says auto-layout goes "up to 5 levels", and no MLC page claims multi-slide splitting. A general search found no tool claiming one-slide-per-manager output. Search silence is not proof.

**Free vs paid:**
- **Free:** unlimited charts of up to 75 people; PNG, SVG, single-page PDF and a single editable PPTX slide; all validation checks; a small "Made with" credit line as the referral hook. Big files still preview in full on screen.
- **Pro, $24 one-time:** no people limit, multi-slide deck, tiled and poster PDFs, photos, vacancies, span-of-control figures, saved styles, the re-import comparison, no credit line.
- **Fees on $24 (my arithmetic):** Lemon Squeezy or Paddle keep $1.70 (5% + 50¢); Gumroad keeps $2.90.
- A $49 consultant licence can come later if asked for; it is above the $9–29 target.

**MVP scope:**
- **Gate first (half a day):** run fake 300-row and 1,000-row CSVs through MLC, Common Ninja, imageonline, Google Sheets, draw.io and Lexchart's free tier. If any produces a readable multi-slide PPTX or tiled PDF for free, drop the idea or narrow it.
- **Import:** CSV, XLSX or paste; detect columns automatically; match managers by ID or name. A validation panel with click-to-fix.
- **Libraries:** d3-flextree (WTFPL) or our own tree layout; read-excel-file or exceljs, plus PapaParse (all MIT); PptxGenJS and jsPDF with svg2pdf.js (all MIT). Avoid elkjs (EPL-2.0 OR GPL-3.0) and the stale npm `xlsx` 0.18.5.
- **Other:** licence-key unlock with no accounts; works offline after the first load; a 300-person demo file, so the free preview shows what Pro produces.

**First long-tail pages:**
- `/print-large-org-chart-multiple-pages`: only forum threads rank; the best target.
- `/visio-data-visualizer-alternative`: results are Microsoft's retirement pages; no tool seen ranking.
- `/excel-org-chart-to-powerpoint`: Savvy on AppSource, MLC and tutorials rank.
- `/csv-to-org-chart`: weak results, winnable per the verifier.
- `/org-chart-powerpoint-one-slide-per-department` and `/org-chart-csv-template`: not checked.

**Risks:**
- A free tool may already handle big organisations; nobody has tested one by hand.
- Large organisations may already get charts from their HR system or pay for Lucid or Visio through IT (not verified).
- Mostly one-off use: few repeat sales, some refund pressure.
- No search-volume data.
- New 2026 rivals (OrgPlease, OrgChartDesk, orgcanvas) publish comparison pages.
- Keeping a 500-box PPTX right in PowerPoint, Google Slides and Keynote is real work.

**Confidence: low.** Raise it to medium only if the gate passes and the first pages get impressions in Search Console. The org-chart verifier said to rank it "below the certificate and resume tools", but those tools' own verifiers rejected them, so I set that aside.

## Rejected

- **Resume builder:** Reactive Resume (MIT, 44.4k stars), FlowCV, Resume.com and Google Docs give good free PDFs. One-time indie rivals ($9, €4.99, $34.99) already exist.
- **Transcription/SRT:** many free in-browser Whisper tools rank; people pay for long-file speed and accuracy, where the browser is weakest.
- **Dynamic QR:** Hovercode gives 3 free never-expiring codes; pay-once rivals start at $3.99; we'd take on permanent hosting and phishing liability for a one-time fee.
- **Bulk certificates:** certifyfast.io's own pages (via search summary, untested) claim it is free and runs in the browser. It takes CSV or Excel and outputs one PDF or a ZIP of PDFs at 300 DPI with no watermark. Fine as a free feature on our ticket engine.
- **Passport/ID photo:** Passlens and others are free; paid rivals charge $1–14 per use. The US, Canada, India and Australia ban the edits people pay for; Canada and Germany don't accept DIY photos.
- **Vocal remover/stems:** free unlimited options everywhere; the Demucs maintainer says its weights are "only for scientific purposes".
- **PDF tools:** PDF24 and others are free with no limits; good compression libraries are AGPL; search is saturated.
- **Gantt/timeline:** many free makers, including MLC with editable PPT/Excel export. Mild pain.
- **Video compress/GIF:** Clipchamp free 1080p with no watermark, and ezgif. ffmpeg.wasm with libx264 carries GPL risk.
- **Email signature:** free no-sign-up tools from HubSpot and others already rank.
- **Logo maker:** Zarla gives free PNG and SVG. The real value is AI concepts, which needs a server; font and icon licences are a risk.
- **Mockups/screenshot beautifiers:** many free in-browser tools with no watermark; no complaints found.
- **Label/badge mail-merge:** Avery Design & Print is free with mail merge; no pain found.
- **Background remover:** free in-browser tools are a commodity. Good models are AGPL (@imgly), non-commercial (RMBG-2.0) or have unverified licences (BiRefNet).
- **Bulk watermark/resize:** incumbents already charge once and cheaply (BatchPhoto lifetime from $29.95; Visual Watermark $19.95 or $29.95, sources conflict). No pain found.

The last nine come from the researchers' third-party-sourced notes; I did not re-check them.

## Before we build: practical setup

**Hosting rule:**
- **Vercel Hobby** "restricts users to non-commercial, personal use only" (vercel.com/docs/plans/hobby, vendor domain, via search summary). Third parties quoting Vercel say "commercial" covers any deployment that financially benefits anyone, and breaches can get a project paused.
- **Vercel Pro:** $20/mo, including one deploying seat and $20 of usage credit; extra deploying seats $20/mo each (vercel.com/pricing and docs, vendor domain, via search summary).
- **Cloudflare Pages Free:** 500 builds a month, 1 build at a time, unlimited sites, requests and bandwidth. The terms forbid disproportionate use for non-web content such as video (developers.cloudflare.com, vendor domain). On commercial use I found only a staff reply on Cloudflare's forum ("perfectly fine with commercial and non-commercial"), not a contract term. Workers Free allows 100,000 requests a day and fails hard after that (vendor domain, per the QR verifier).
- **Rule: no sale goes live from a Hobby project.**
  - Cheapest option that is probably allowed: Cloudflare Pages Free for the selling site, plus Workers Free for any webhook. Read Cloudflare's self-serve terms first.
  - Option we know is allowed: Vercel Pro at $20/mo.
  - Free sites that point to the paid tool may also count as commercial under Vercel's broad definition; plan to move the whole network.

**Payments** (merchants of record, so they handle VAT and GST):
- **Lemon Squeezy** (vendor domain, via search summaries; the pricing page looked old):
  - 5% + 50¢ per sale, no monthly fee.
  - Extras: +1.5% international orders, +1.5% PayPal, +0.5% subscriptions, +5% recovered abandoned carts, 3% affiliate referrals.
  - Payouts free to US banks and 1% to non-US banks (a vendor blog post about two years old); $15 per dispute.
  - Owned by Stripe since 2024 (third party).
- **Paddle:** 5% + 50¢ per sale, covering tax, fraud screening and chargebacks (paddle.com, vendor domain, via search summary). Seller-approval rules not checked.
- **Gumroad:** 10% + 50¢ per direct sale, 30% through its Discover marketplace. It handles sales tax worldwide as merchant of record at no extra cost (gumroad.com/pricing, vendor domain, via search summary). Older help pages give other figures.
- **Choose Lemon Squeezy or Paddle.** A $24 sale on a non-US card through Lemon Squeezy costs $2.06 in fees (my arithmetic).

**Licence keys without accounts:**
- **Option A (no server of ours):** use the provider's built-in licence keys and check them through its validate/activate API from the page. From memory, Lemon Squeezy and Gumroad both offer this; I did not verify it, or whether the API works from a browser.
- **Option B:** after checkout the page sends the order ID to one Cloudflare Worker, which confirms payment with the provider's API and returns an Ed25519-signed key; the page checks it offline against an embedded public key. Keep it in localStorage plus a downloadable file; a lost key is re-issued from the order ID in the provider's receipt email.
- Either way, the key holds only the product, the tier and the order ID. We store no user data or files.

**Refund policy:**
- 14-day no-questions refund, stated on the pricing page and at checkout; the full free preview should keep refunds low.
- Option A lets you revoke the key on refund; with Option B a refunded key keeps working.
- Never "no refunds": it invites chargebacks ($15 each on Lemon Squeezy).
- The EU digital-content withdrawal waiver is from memory; confirm with the provider.

## What I could not verify

- **Prices:** no vendor pricing page was opened by me or any researcher; every price comes from search summaries.
- **Org chart:** search volume; whether any free tool handles 300+ people (no hands-on test); Lucid's Team rate; the charts built into HR systems; the exact date Data Visualizer left Microsoft's add-in store.
- **Cloudflare:** a formal contract term permitting commercial use (only a forum reply found).
- **Payment providers:** Lemon Squeezy's current payout fees; Paddle's live pricing page and seller approval; Gumroad's current Discover rate.
- **From memory only:** the providers' licence-key APIs and the EU refund rules.
- **Free rivals** (CertifyFast, Passlens, Transcrisper and others): described from their own pages, not tested.