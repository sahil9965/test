# Hosting on Cloudflare Pages

Each site (the 15 tools plus the hub) is its own Cloudflare Pages project, `rooh-<slug>`, deployed from `sites/<slug>/`.
Nothing here is deployed until the two secrets below exist. The Vercel setup (`vercel.json`, `api/`) stays in `sites/` as the rollback path.

## What the build does

`node tools/cf-build.mjs [slug ...]` (default: every live site in `sites.json` plus `hub`) writes `dist/<slug>/`:

- `public/`: a copy of `sites/<slug>/` without `api/`, `vercel.json` and test files, plus
  - `_headers`: the `vercel.json` headers as Pages globs (`/*`, `/*.png`, `/vendor/*`, `/sw.js` ...). Cloudflare combines the headers of every matching rule, Vercel let the last rule win, so overridden headers (Cache-Control on `/vendor/*` and `/sw.js`) are detached with `! Cache-Control` first. A last rule adds `X-Robots-Tag: noindex` on `*.pages.dev` hosts.
  - `_redirects`: the path redirects (`/app`, `/pricing`, `/index`, `/templates`). `permanent: true` becomes 301; Vercel's `permanent: false` stays temporary (307). The host redirect is dropped (the custom domain is canonical).
  - `_routes.json`: only `/api/*` runs the Function, so static requests stay free.
  - `404.html` (only if the site has none): without one, Pages answers every unknown URL with the home page and status 200.
- `functions/api/indexnow.js`: copied from `kit/functions/api/indexnow.js`, the port of `kit/api/indexnow.js`.

The build exits non-zero if a site folder is missing, a `vercel.json` pattern is not one it knows, or built HTML still contains `_vercel/insights`.
`dist/` is git-ignored. `verify.js` (Gumroad) is not ported; it is only used when `allFree` is false.

## Secrets (repo Settings > Secrets and variables > Actions)

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token with Account > Cloudflare Pages > Edit |
| `CLOUDFLARE_ACCOUNT_ID` | the account ID (Workers & Pages overview, right-hand side) |

The workflow stops at its first step with an error if either is missing.

## Deploys

`.github/workflows/deploy-cf.yml` runs on a push to `claude/ecstatic-pascal-yzcrhr` that touches `sites/**`, `sites.json`, `tools/cf-build.mjs`, `kit/functions/**` or the workflow, and by hand (Actions > Deploy to Cloudflare Pages > Run workflow).

- Push: deploys the sites whose files changed between `github.event.before` and the pushed commit; all sites if `sites.json`, `tools/cf-build.mjs`, `kit/functions/**` or the workflow changed, or if the before-commit is unknown.
- Manual: `sites` is `changed` (the last commit), `all`, or space-separated slugs such as `labelfit giftstub`.
- Per site: `wrangler pages project create rooh-<slug> --production-branch=main` (ignored if it exists), then `wrangler pages deploy public --project-name=rooh-<slug> --branch=main` from `dist/<slug>`. One failing site does not stop the others; the job fails at the end.
- Runs never overlap (`concurrency: deploy-cf`).

After the first deploy, add each custom domain (for example `labels.roohsites.com`) to its project under Workers & Pages > rooh-<slug> > Custom domains, then switch DNS.

## Post-deploy check

Always runs and prints (and adds to the job summary) a table per site: HTTP status and `server` header of `https://rooh-<slug>.pages.dev/` and of the custom host. `server: cloudflare` means Cloudflare answers; `Vercel` means DNS still points to Vercel. The custom host never fails the job.

## IndexNow

Run the workflow manually with `indexnow` ticked. After the deploy it calls `https://<custom host>/api/indexnow?go=1` for each deployed site and prints the JSON (`{ok, indexnowStatus, submitted, urls}`). The endpoint is idempotent, so you can also open it in a browser. Until DNS is switched, the custom host still answers from Vercel's copy of the function.

## Local test

```
node tools/cf-build.mjs labelfit
cd dist/labelfit && npx wrangler@4 pages dev public --port 8799
```

## Slotsmith sales site

`external/slotsmith-site/` (a copy of `site/` from the private slotsmith repo) is published by `.github/workflows/deploy-slotsmith.yml`
on a push that touches it, or by hand (Actions > Deploy Slotsmith site > Run workflow). It is not in `sites.json`, so it stays out of
the footers, hub, pins and IndexNow. The site was first uploaded in the dashboard, so its project isn't `rooh-<slug>`:
`node tools/cf-pages-project.mjs slotsmith.roohsites.com` asks the Cloudflare API which direct-upload project serves the domain, and the
workflow deploys there, to that project's production branch, adding an `X-Robots-Tag: noindex` rule for its `*.pages.dev` hosts.
The run summary lists the status of every page on the live domain.
