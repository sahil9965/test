// Browser tests for Quotewell: a trade page starts from its trade, typing gives the totals the engine computes, the PDF
// downloads and says the same thing, saving and reopening works, odd input does not break anything, a logo can be added,
// phones do not scroll sideways, and nothing the user types is sent anywhere.
// Usage: node --test src/quotewell/e2e.test.mjs   (needs Playwright's Chromium and pdftotext)
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "../../sites/quotewell");
const { chromium } = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../tools/package.json"))("playwright");   // Playwright lives in tools/
const C = createRequire(import.meta.url)(join(SITE, "core.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new globalThis.URL(req.url, "http://x").pathname);
  let f = join(SITE, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!existsSync(f) && existsSync(f + ".html")) f += ".html";
  if (!existsSync(f) || !f.startsWith(SITE)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const tmp = mkdtempSync(join(tmpdir(), "qw-"));
test.after(async () => { await browser.close(); server.close(); });

async function open(path, opts = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: opts.viewport || { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const problems = [], requests = [];
  page.on("pageerror", e => problems.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/umami|Failed to load resource/i.test(m.text())) problems.push("console: " + m.text()); });
  page.on("request", r => requests.push({ url: r.url(), body: r.postData() || "" }));
  // Umami would load from the internet; the tests only care that nothing typed leaves the page.
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(BASE + path);
  await page.waitForSelector(".qw-item, .qw-empty");
  return { ctx, page, problems, requests };
}
const total = page => page.locator(".qw-tot").innerText();
const openBiz = page => page.evaluate(() => { document.querySelector("#qw-biz").open = true; });
const fillRow = async (page, i, { qty, rate, taxable }) => {
  const row = page.locator(".qw-item").nth(i);
  if (qty !== undefined) await row.locator('[data-f="qty"]').fill(String(qty));
  if (rate !== undefined) await row.locator('[data-f="rate"]').fill(String(rate));
  if (taxable !== undefined) await row.locator('[data-f="taxable"]').setChecked(taxable);
};

test("a trade page starts from its trade, with blank prices", async () => {
  const { ctx, page, problems } = await open("/electrician-estimate-template");
  assert.equal(await page.locator(".qw-item").count(), 5);
  assert.equal(await page.locator(".qw-item").first().locator('[data-f="desc"]').inputValue(), "Electrician labor");
  assert.equal(await page.locator('.qw-tchip[data-trade="electrician"]').getAttribute("aria-pressed"), "true");
  assert.ok(await page.locator('input[name="kind"][value="estimate"]').isChecked());
  assert.match(await page.locator("#qw-terms").inputValue(), /permit/i);
  assert.equal(await total(page), "$0.00");
  assert.ok((await page.locator(".qw-svg svg").innerHTML()).includes("ESTIMATE"));
  const quote = await open("/cleaning-service-quote-template");
  assert.ok(await quote.page.locator('input[name="kind"][value="quote"]').isChecked(), "a quote page starts as a quote");
  assert.deepEqual([...problems, ...quote.problems], []);
  await ctx.close(); await quote.ctx.close();
});

test("typing gives the engine's totals, and the downloaded PDF says the same", async () => {
  const { ctx, page, problems, requests } = await open("/contractor-estimate-template");
  await openBiz(page);
  await page.fill('[data-k="from.name"]', "Test Builders (made-up)");
  await page.fill('[data-k="from.phone"]', "(555) 010-0100");
  await page.fill('[data-k="to.name"]', "Alex Customer");
  await page.fill('[data-k="job.title"]', "Bathroom remodel");
  const rates = [1200, 55, 380, 1450, 150], qty = [1, 24, 1, 1, 1];
  for (let i = 0; i < 5; i++) await fillRow(page, i, { qty: qty[i], rate: rates[i], taxable: i === 2 || i === 3 });
  await page.fill('[data-k="tax.pct"]', "6");
  await page.fill('[data-k="markup.pct"]', "10");
  await page.fill('[data-k="deposit.value"]', "30");
  const want = (() => {
    const d = C.applyTrade({}, "general");
    d.items.forEach((it, i) => { it.rate = rates[i]; it.qty = qty[i]; it.taxable = i === 2 || i === 3; });
    d.tax.pct = 6; d.markup.pct = 10; d.deposit = { mode: "pct", value: 30 };
    return C.calc(d);
  })();
  // Worked out by hand: 1,200 + 1,320 + 380 + 1,450 + 150 = 4,500.00; markup 10% = 450.00; the taxable lines (380 + 1,450) are
  // 1,830 of 4,500, so 2,013.00 of 4,950.00 is taxed at 6% = 120.78; total 5,070.78; deposit 30% = 1,521.23.
  assert.equal(want.subtotal, 450000); assert.equal(want.tax, 12078); assert.equal(want.total, 507078); assert.equal(want.deposit, 152123);
  const shown = await total(page);
  assert.equal(shown, C.money(want.total, "USD"));
  assert.equal(await page.locator('[data-amt="1"]').innerText(), "$1,320.00");
  assert.match(await page.locator(".qw-dep").innerText(), new RegExp(C.money(want.deposit, "USD").replace(/[$.]/g, "\\$&")));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="pdf"]')]);
  const file = join(tmp, "out.pdf");
  await dl.saveAs(file);
  assert.match(dl.suggestedFilename(), /^estimate-est-0001-alex-customer\.pdf$/);
  const text = execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" });
  for (const v of ["Test Builders (made-up)", "ESTIMATE", "Alex Customer", "Bathroom remodel", C.money(want.total, "USD"), C.money(want.deposit, "USD"), "Page 1 of 1", "Made with Quotewell", "Customer signature"]) assert.ok(text.includes(v), `PDF text has ${v}`);
  await page.waitForSelector(".qw-msg p");
  assert.match(await page.locator(".qw-msg").innerText(), /Your PDF is ready \(1 page\)/);
  // Privacy: nothing typed went anywhere.
  for (const r of requests) assert.ok(!/Test Builders|Alex Customer|Bathroom/.test(r.url + r.body), "no request carries what was typed: " + r.url);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test("kind switch changes the title and the starting terms; the draft survives a reload; saved documents open, copy and delete", async () => {
  const { ctx, page, problems } = await open("/handyman-estimate-template");
  page.on("dialog", d => d.accept());
  await page.locator('input[name="kind"][value="quote"]').check({ force: true });
  assert.match(await page.locator("#qw-terms").inputValue(), /This quote is based/);
  await page.fill('[data-k="from.name"]', "Fix-It Fred");
  await fillRow(page, 0, { qty: 3.5, rate: 65 });
  await page.fill('[data-k="to.name"]', "Dana");
  await page.waitForTimeout(500);
  await page.reload(); await page.waitForSelector(".qw-item");
  assert.equal(await page.inputValue('[data-k="from.name"]'), "Fix-It Fred");
  assert.equal(await total(page), "$227.50");
  assert.ok((await page.locator(".qw-svg svg").innerHTML()).includes("QUOTE"));
  await page.click('[data-act="save"]');
  assert.equal(await page.locator(".qw-saved li").count(), 1);
  await page.click('[data-act="new"]');
  await page.waitForTimeout(100);
  assert.equal(await total(page), "$0.00", "a new document starts empty");
  await page.locator('.qw-saved [data-act="dup"]').click();
  await page.waitForTimeout(200);
  assert.equal(await page.inputValue('[data-k="number"]'), "QUO-0002", "a copy gets the next number");
  await page.locator('.qw-saved [data-act="rm"]').click();
  assert.equal(await page.locator(".qw-saved li").count(), 0);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test("odd input never breaks the totals, the preview or the PDF", async () => {
  const { ctx, page, problems } = await open("/painting-estimate-template");
  await fillRow(page, 0, { qty: "abc", rate: "-5" });
  await fillRow(page, 1, { qty: "1,000", rate: "$2.50" });
  assert.equal(await page.locator('[data-amt="0"]').innerText(), "$0.00");
  assert.equal(await page.locator('[data-amt="1"]').innerText(), "$2,500.00");
  await page.fill('[data-k="tax.pct"]', "999");
  await page.fill('[data-k="discount.value"]', "500");
  await page.selectOption('[data-k="discount.mode"]', "pct");
  assert.match(await total(page), /^\$[\d,]+\.\d\d$/);
  await page.selectOption('[data-k="discount.mode"]', "amt");
  await page.fill('[data-k="discount.value"]', "999999999");
  assert.equal(await total(page), "$0.00", "a discount can never push the total below zero");
  await page.fill('[data-k="job.title"]', "Kitchen 💡 ✓ <script>alert(1)</script>");
  await page.fill('[data-k="to.name"]', "Łukasz Müller");
  await page.fill('[data-k="job.scope"]', "x".repeat(3000));
  await page.waitForTimeout(200);
  assert.match(await page.locator(".qw-msg").innerText(), /can't be printed in the PDF/);
  assert.ok(!(await page.locator(".qw-svg").innerHTML()).includes("<script"), "text is escaped in the preview");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="pdf"]')]);
  const file = join(tmp, "odd.pdf"); await dl.saveAs(file);
  const text = execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" });
  assert.ok(text.includes("Lukasz Müller")); assert.ok(text.includes("<script>alert(1)</script>"));
  assert.deepEqual(problems, []);
  await ctx.close();
});

test("sixty lines is the limit, long estimates take several pages and the preview pager works", async () => {
  const { ctx, page, problems } = await open("/");
  await page.click('.qw-tchip[data-trade="handyman"]');
  for (let i = 0; i < 70; i++) await page.click('[data-act="add"]');
  assert.equal(await page.locator(".qw-item").count(), 60);
  assert.match(await page.locator(".qw-msg").innerText(), /up to 60 lines/);
  const descs = page.locator('.qw-item [data-f="desc"]');
  await page.evaluate(() => document.querySelectorAll(".qw-item").forEach((row, i) => {
    for (const [f, v] of [["desc", "Line " + (i + 1)], ["rate", "10"]]) { const el = row.querySelector(`[data-f="${f}"]`); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }
  }));
  await page.waitForTimeout(300);
  assert.equal(await total(page), "$600.00");
  assert.ok(await page.locator(".qw-pager").isVisible());
  assert.match(await page.locator(".qw-pager span").innerText(), /Page 1 of [2-9]/);
  await page.click('[data-act="next"]');
  assert.match(await page.locator(".qw-pager span").innerText(), /Page 2 of/);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="pdf"]')]);
  const file = join(tmp, "long.pdf"); await dl.saveAs(file);
  const info = execFileSync("pdfinfo", [file], { encoding: "utf8" });
  assert.match(info, /Pages:\s+[2-9]/);
  const text = execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" });
  for (let i = 1; i <= 60; i++) assert.ok(new RegExp(`Line ${i}\\b`).test(text), "Line " + i);
  // moving and removing lines
  await page.click('.qw-item:nth-child(2) [data-act="up"]');
  assert.equal(await descs.nth(0).inputValue(), "Line 2");
  await page.click('.qw-item:nth-child(1) [data-act="del"]');
  assert.equal(await page.locator(".qw-item").count(), 59);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test("a logo can be added, shows in the preview, is remembered and can be removed", async () => {
  const { ctx, page, problems } = await open("/roofing-estimate-template");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const f = join(tmp, "logo.png"); writeFileSync(f, png);
  await openBiz(page);
  await page.setInputFiles("#qw-logofile", f);
  await page.waitForSelector(".qw-svg image");
  assert.equal(await page.locator('[data-act="logo-clear"]').isVisible(), true);
  await fillRow(page, 0, { qty: 10, rate: 5 });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="pdf"]')]);
  const file = join(tmp, "logo.pdf"); await dl.saveAs(file);
  assert.match(execFileSync("pdfimages", ["-list", file], { encoding: "utf8" }), /\n\s+1\s+0\s+image/);
  await page.reload(); await page.waitForSelector(".qw-item");
  await page.waitForSelector(".qw-svg image");
  await openBiz(page);
  await page.click('[data-act="logo-clear"]');
  await page.waitForFunction(() => !document.querySelector(".qw-svg image"));   // the preview redraws a moment later
  assert.equal(await page.locator(".qw-svg image").count(), 0);
  await page.reload(); await page.waitForSelector(".qw-item");
  assert.equal(await page.locator(".qw-svg image").count(), 0, "a removed logo stays removed after a reload");
  assert.deepEqual(problems, []);
  await ctx.close();
});

test("on a phone nothing scrolls sideways, even with a filled-in estimate", async () => {
  const { ctx, page, problems } = await open("/lawn-care-quote-template", { viewport: { width: 390, height: 800 } });
  await page.click('[data-act="example"]');
  await page.fill('[data-k="from.name"]', "A very long business name that keeps going and going to test wrapping on a phone");
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(over <= 0, "horizontal overflow " + over);
  assert.ok(await page.locator('[data-act="pdf"]').isVisible());
  assert.match(await total(page), /^\$[\d,]+\.\d\d$/); assert.notEqual(await total(page), "$0.00");
  assert.deepEqual(problems, []);
  await ctx.close();
});
