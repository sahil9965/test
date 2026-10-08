# InvoiceKit: business and launch plan

**Product:** A free, no-signup invoice generator that runs entirely in the browser. **Pro** costs **$9 once** and adds a logo, removes the watermark, and unlocks saved clients, invoice history, three templates and a duplicate button.

**Why this product:** "Free invoice generator" and "invoice template" have steady, high search intent all year. Freelancers want three things that most competitors don't offer together: no account, no monthly subscription, and privacy. Running costs are close to zero (static files plus one tiny serverless function), so nearly all revenue is margin.

## Unit economics

| | |
|---|---|
| Price | $9 one-time |
| Gumroad fee (10% + $0.50) | about $1.40 |
| Net per sale | about $7.60 |
| **Sales for $500 revenue** | **56** |
| Sales for $500 net | 66 |
| Hosting cost per user | about $0 (all in the browser) |

## $100 budget allocation

| Item | Cost | Why |
|---|---|---|
| Domain (e.g. `invoicekit.app`, `getinvoicekit.com`) | about $12 | Trust and SEO; a vercel.app subdomain converts worse |
| Vercel Pro, first month | $20 | The Hobby plan prohibits commercial use. Upgrade before turning on payments, or host free on Cloudflare Pages instead and save this |
| Reddit ads test (r/freelance, r/smallbusiness) | $40 | Run for 7 days. Stop if cost per sale is above $9 |
| Reserve | $28 | Second month of hosting, or double the ad channel that works |
| Gumroad, Supabase, analytics | $0 | Gumroad charges per sale, and the other two aren't needed |

## Setup checklist (owner only: needs your identity and bank account)

1. Create a Gumroad product called "InvoiceKit Pro" priced at $9, and turn on **Generate a unique license key per sale**.
2. Put the product URL into `config.js` → `checkoutUrl`.
3. In Vercel, go to Project → Settings → Environment Variables and add `GUMROAD_PRODUCT_ID` (Gumroad product → License key section). Then redeploy.
4. Buy and attach the domain.
5. Make a test purchase with a 100% discount code to confirm the license key unlocks Pro.

## Free distribution (where most sales should come from)

- **Day 1:** Post on r/freelance, r/smallbusiness, r/SideProject and r/webdev (Show-off Saturday) using a "built a no-signup invoice generator" angle. Show it and be honest. No hard sell.
- **Day 1:** Launch on Product Hunt, Indie Hackers, Hacker News (Show HN), BetaList and AlternativeTo (list it as an alternative to Invoice Simple, Zoho Invoice and Wave).
- **Week 1:** Submit to free-tool directories such as SaaSHub, Uneed, Microlaunch and Fazier.
- **Weeks 1–4 (SEO):** Add currency- and profession-specific landing pages that link to the app, such as "free invoice template for photographers", "invoice generator INR GST" and "UK freelance invoice template". Each one is a cheap, long-tail Google entry point.
- **Ongoing:** The free tier's "Made with InvoiceKit" footer appears on every invoice sent to a client, which works as viral distribution.

## Targets

- 2,000 visitors at a 3% free-to-Pro conversion gives about 60 sales, or **about $540**.
- If conversion is below 1.5% after 1,000 visitors, try $5, or make saved clients the only Pro hook.
