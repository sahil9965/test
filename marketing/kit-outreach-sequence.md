# Outreach email sequence with a Google Business Profile audit opener

DRAFT, written 4 Nov 2026. **Nothing is sent and sending is not switched on.** Send only after you have read this and said go.

The lead robot in `/home/user/roohsites` (`engine/emails.py`) already writes a first email with one verified fact about the business's website and offers a free printable. This sequence is an alternative opener that leads with a short check of the business's Google listing, and it sells the new packages (Standard $599, Launch $1,500, Growth $3,000, care plans from $99 a month).

## Rules every email follows (CAN-SPAM and honesty)
- The subject says what the email is about. No fake "Re:", no "urgent", no pretending we know them.
- Every email ends with our real postal address (`BRAND['postal_address']` in `config/brand.json`) and a plain way out: *Reply "no thanks" and I won't email you again.*
- A reply of "no" (or any opt-out) stops all emails to that address within the day, and is logged in the dashboard.
- Every fact in the email must be true on the day it is sent. If we cannot check it, we do not write it. No claims about their rankings, revenue or customers.
- Sent from the Rooh Sites address, never from hello@halosell.com. No Amazon affiliate links in any email or PDF.
- Send in the recipient's morning, Tuesday to Thursday, 5 new businesses a day at most (the dashboard setting).

## What we check on the listing before writing (public information only)
Pick the **one or two** facts that are true and most useful. Do not list them all.

| Check | Where to look | Say it like this (only if true) |
|---|---|---|
| Website button leads nowhere or to a Google "business.site" page | Click it | "The Website button on your Google listing doesn't open a working page." |
| No website listed at all | Listing | "Your Google listing doesn't link to a website, so people who find you can only call." |
| Website link goes to Facebook or Instagram | Click it | "The website link goes to your Facebook page, not a site of your own." |
| Opening hours missing or looks out of date | Listing | "Your listing has no opening hours." |
| Few photos (under about 5) or none from the owner | Photos tab | "Your listing shows only N photos." |
| Reviews with no owner reply | Reviews | "N of your recent reviews have no reply from you." |
| No booking or menu link | Listing | "There's no booking link on your listing." |
| Only one or two categories, or an odd primary category | Listing | "Your main category is X; most similar businesses nearby also list Y." (check 3 competitors first) |

Also keep for the personal line: the town, the type of business, the review count and rating (only if there are reviews).

## Email 1: the audit opener (day 0)

**Subject (pick one that is true):**
- `A quick note about the Google listing for {Business}`
- `{Business}: the website button on your Google listing`  *(only when that is the fact)*
- `Two things I noticed on {Business}'s Google listing`

**Body:**

> Hi {Business} team,
>
> I came across {Business} on Google Maps while looking at {niche} in {town}.{ reviews sentence, if true: "N Google reviews at X stars is a strong record."}
>
> While I was there I noticed {fact 1}. {fact 2, if true.} These are small things, and they decide whether a person who finds you ends up calling you or the next result.
>
> I'm Sahil from Rooh Sites. We're a small studio that builds simple, fast websites for local businesses and tidies up Google listings. I wrote down what I'd fix on yours, in plain English, one page. Want me to send it? It's yours either way, no strings.
>
> {Sahil}
> Rooh Sites · roohsites.com
>
> --
> Rooh Sites, {postal address}
> Not interested? Reply "no thanks" and I won't email you again.

Under 120 words before the footer. One ask, a yes or no.

## Email 2: the useful follow-up (day 3, same thread, same subject)

> Hi {Business} team,
>
> Just floating this back up. One thing you can fix yourself in five minutes: {the single easiest fix from the table, with the exact steps; for example "In your Business Profile, choose Edit profile, find the Website field, and enter your full web address starting with https://"}.
>
> If you'd like the one-page note with everything I found, reply "yes" and I'll send it today.
>
> {Sahil}
>
> {footer}

## Email 3: the offer, short (day 8)

> Hi {Business} team,
>
> If you ever want help with this, here is what it looks like:
> - **A simple website of up to 6 pages: $599** one time, domain and hosting included for the first year.
> - **A site plus a tidy Google listing and a contact form or online booking: $1,500.**
> - After launch, an optional care plan from **$99 a month**, cancel any time.
>
> Examples and details: roohsites.com. Or pick a time for a 15-minute call: https://cal.com/roohsites/15min
>
> {Sahil}
>
> {footer}

## Email 4: the last note (day 14)

> Hi {Business} team,
>
> Last note from me. If a better website or listing ever moves up your list, reply to this email or pick a time here: https://cal.com/roohsites/15min
>
> All the best with {Business},
> {Sahil}
>
> {footer}

After email 4 the business is not emailed again unless it replies.

## The one-page "listing note" (what we send when they say yes)
Built per business, **by hand, from what we checked**: three to five specific, true findings, each with a plain-English fix and how long it takes, then one paragraph: "If you'd like us to do this for you, it's part of our Launch package ($1,500)." No scores, no invented numbers, no comparison to named competitors. This is the thing that earns the call.

## Replies (copy into the Gmail reply)
- **They say yes to the note:** send the note within a day, then one line: "If any of it is useful, happy to talk it through for 15 minutes: {link}."
- **They ask the price:** use the "They asked the price" reply in `engine/emails.py` (kit), now listing Standard, Launch, Growth and the care plans.
- **They say no:** "No problem, thanks for letting me know. I won't email you again." Mark opted out.
- **They are annoyed:** apologise in one line, mark opted out, do not argue.

## How to run it (after you say go)
1. Pick 5 businesses a day from the dashboard that have a checkable fact. 2. Write the fact lines by hand (two minutes each). 3. Send from Gmail through the dashboard's "Open in Gmail" button. 4. Log it. 5. Follow-ups on days 3, 8 and 14 come from the dashboard.

Week-one target from the checklist: 25 new businesses contacted, 5 listing notes sent, 2 calls booked.
