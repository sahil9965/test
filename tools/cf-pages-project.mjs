// Finds the Cloudflare Pages project that serves a custom domain, for deploying a site that was first
// uploaded by hand in the dashboard (so its project name isn't rooh-<slug>).
// Usage: node tools/cf-pages-project.mjs slotsmith.roohsites.com
// Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. Prints every project, then writes name= and
// branch= (the production branch) to $GITHUB_OUTPUT when set. Exits non-zero if no direct-upload project has the domain.
import { appendFileSync } from "node:fs";

const domain = process.argv[2];
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, GITHUB_OUTPUT: output } = process.env;
if (!domain || !token || !account) {
  console.error("usage: CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… node tools/cf-pages-project.mjs <domain>");
  process.exit(1);
}

const projects = new Map();
for (let page = 1; page <= 20; page++) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!body.success) {
    console.error(`Cloudflare API error: ${JSON.stringify(body.errors)}`);
    process.exit(1);
  }
  const before = projects.size;
  for (const p of body.result || []) projects.set(p.name, p);
  const pages = body.result_info?.total_pages;
  if (!body.result?.length || projects.size === before || (pages && page >= pages)) break;
}

for (const p of projects.values()) {
  console.log(`${p.name.padEnd(28)} ${(p.domains || []).join(" ")}  [${p.source ? "git: " + p.source.type : "direct upload"}, production branch ${p.production_branch}]`);
}

const hit = [...projects.values()].find(p => (p.domains || []).includes(domain));
if (!hit) {
  console.error(`No Pages project in this account serves ${domain}.`);
  process.exit(1);
}
if (hit.source) {
  console.error(`${hit.name} is connected to ${hit.source.type}; it deploys from there, not from here.`);
  process.exit(1);
}
console.log(`\n${domain} is served by ${hit.name} (production branch ${hit.production_branch})`);
if (output) appendFileSync(output, `name=${hit.name}\nbranch=${hit.production_branch}\n`);
