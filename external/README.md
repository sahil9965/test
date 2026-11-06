# External sites

Sites published from this repo that are not free tools, so they are not in `sites.json`.

| Folder | Live at | Source | Published by |
|---|---|---|---|
| `booking-site/` | https://booking.roohsites.com | `site/` in the private `sahil9965/slotsmith` repo | `.github/workflows/deploy-booking.yml` |
| `slotsmith-redirect/` | https://slotsmith.roohsites.com (old name) | here: a 301 to booking.roohsites.com | same workflow, after the new domain is live |

Edit the site in the slotsmith repo, copy `site/` here (`cp -r ../slotsmith/site/. external/booking-site/`) and push:
the workflow deploys to the Cloudflare Pages project that serves booking.roohsites.com (`rooh-booking`), and once that is live,
puts the redirect on the project that serves slotsmith.roohsites.com (`rooh-slotsmith`). See docs/cloudflare.md.
