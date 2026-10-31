# External sites

Sites published from this repo that are not free tools, so they are not in `sites.json`.

| Folder | Live at | Source | Published by |
|---|---|---|---|
| `slotsmith-site/` | https://slotsmith.roohsites.com | `site/` in the private `sahil9965/slotsmith` repo | `.github/workflows/deploy-slotsmith.yml` |

Edit the site in the slotsmith repo, copy `site/` here (`cp -r ../slotsmith/site/. external/slotsmith-site/`) and push:
the workflow deploys to the Cloudflare Pages project that serves the domain (`rooh-slotsmith`). See docs/cloudflare.md.
