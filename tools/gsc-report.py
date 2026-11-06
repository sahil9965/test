#!/usr/bin/env python3
"""Per-tool Search Console report from the three exports (web, images, AI features), unzipped into <exports dir>/search, /images and /generativeai.
Usage: python3 -I tools/gsc-report.py <exports dir> sites.json marketing/search-console-YYYY-MM-DD.md
The title and date text below are for the first export (8 Oct to 3 Nov 2026); change them and marketing/gsc-notes.json for a new one."""
import csv, json, sys, os, re
from collections import defaultdict
from urllib.parse import urlparse

D, SITES, OUT = sys.argv[1:4]
sites = json.load(open(SITES))
host2 = {urlparse(s["url"]).hostname: (s["name"], s["url"].replace("https://", "")) for s in sites}
host2["tools.roohsites.com"] = ("Hub", "tools.roohsites.com")
host2["roohsites.com"] = ("Rooh Sites (agency site)", "roohsites.com")
host2["slotsmith.roohsites.com"] = ("Slotsmith (plugin site)", "slotsmith.roohsites.com")
host2["booking.roohsites.com"] = ("Booking plugin site", "booking.roohsites.com")
rd = lambda p: list(csv.DictReader(open(p, encoding="utf-8")))
n = lambda s: float(str(s).replace("%", "").replace(",", "") or 0)


def agg(path, clicks=True):
    o = defaultdict(lambda: {"c": 0, "i": 0, "pw": 0.0, "pages": []})
    for r in rd(path):
        t = host2.get(urlparse(r["Top pages"]).hostname, ("Other",))[0]
        c = n(r["Clicks"]) if clicks else 0; i = n(r["Impressions"]); p = n(r["Position"]) if clicks else 0
        o[t]["c"] += c; o[t]["i"] += i; o[t]["pw"] += p * i
        o[t]["pages"].append((urlparse(r["Top pages"]).path or "/", c, i, p))
    return o

web, img, ai = agg(f"{D}/search/Pages.csv"), agg(f"{D}/images/Pages.csv"), agg(f"{D}/generativeai/Pages.csv", False)
order = sorted(web, key=lambda t: -web[t]["i"])
dev = {r["Device"]: r for r in rd(f"{D}/search/Devices.csv")}
tc = sum(n(r["Clicks"]) for r in dev.values()); ti = sum(n(r["Impressions"]) for r in dev.values())
ch = rd(f"{D}/search/Chart.csv")
avgpos = sum(n(r["Position"]) * n(r["Impressions"]) for r in ch) / sum(n(r["Impressions"]) for r in ch)
last7 = (sum(n(r["Clicks"]) for r in ch[-7:]), sum(n(r["Impressions"]) for r in ch[-7:]))
prev7 = (sum(n(r["Clicks"]) for r in ch[-14:-7]), sum(n(r["Impressions"]) for r in ch[-14:-7]))
countries = rd(f"{D}/search/Countries.csv")

NOTES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "marketing", "gsc-notes.json")
NOTE = json.load(open(NOTES, encoding="utf-8")) if os.path.exists(NOTES) else {}   # per-tool comments; edit this file for each new export

L = []
A = L.append
A("# Search Console report by tool: 8 Oct to 3 Nov 2026")
A("")
A("Made 5 Nov 2026 from three exports: web search, image search and AI features (domain property, all `roohsites.com` subdomains).")
A("")
A("## Overall (web search)")
A(f"- **{tc:.0f} clicks, {ti:,.0f} impressions, CTR {100*tc/ti:.2f}%, average position about {avgpos:.0f}** over 27 days. Earlier checks: 8 to 27 Oct 14 clicks / 1,212 impressions; 8 to 31 Oct 19 clicks / 1,582 impressions.")
A(f"- Last 7 days (28 Oct to 3 Nov): **{last7[0]:.0f} clicks, {last7[1]:.0f} impressions**; the 7 days before: {prev7[0]:.0f} clicks, {prev7[1]:.0f} impressions. Best days: 3 Nov (5 clicks), 2 Nov and 13 Oct (4).")
A(f"- Devices: desktop {n(dev['Desktop']['Clicks']):.0f} clicks / {n(dev['Desktop']['Impressions']):,.0f} impressions at position {n(dev['Desktop']['Position']):.1f}; mobile {n(dev['Mobile']['Clicks']):.0f} / {n(dev['Mobile']['Impressions']):.0f} at position {n(dev['Mobile']['Position']):.1f}.")
us = next(r for r in countries if r["Country"] == "United States")
A(f"- Countries: United States {n(us['Impressions']):,.0f} impressions ({100*n(us['Impressions'])/ti:.0f}%, {n(us['Clicks']):.0f} clicks); then UK 97, India 74, Canada 47, Philippines 30.")
A("- Image search: 71 impressions, 0 clicks. AI features: 131 impressions (clicks and position are not reported for these).")
A("")
A("## By tool, sorted by web impressions")
A("")
A("| Tool | Web clicks | Web impressions | CTR | Avg position | Pages shown | Image impr. | AI impr. |")
A("|---|---:|---:|---:|---:|---:|---:|---:|")
for t in order:
    w = web[t]; pos = w["pw"] / w["i"] if w["i"] else 0
    A(f"| {t} | {w['c']:.0f} | {w['i']:,.0f} | {100*w['c']/w['i']:.2f}% | {pos:.1f} | {len(w['pages'])} | {img[t]['i'] if t in img else 0:.0f} | {ai[t]['i'] if t in ai else 0:.0f} |")
sc = sum(web[t]["c"] for t in web); si = sum(web[t]["i"] for t in web)
A(f"| **Sum of the rows** | **{sc:.0f}** | **{si:,.0f}** | | | | | |")
A(f"| **Property total** | **{tc:.0f}** | **{ti:,.0f}** | **{100*tc/ti:.2f}%** | **{avgpos:.0f}** | | | |")
A("")
A("The rows add up to more than the property total because Search Console counts a page each time it shows, and one search can show two pages from the same site. Use the total row for the whole site and the tool rows to compare tools. Positions are impression-weighted averages of each tool's pages; with fewer than about 20 impressions they are noisy.")
A("")
A("## Tool by tool")
for t in order:
    w = web[t]; pos = w["pw"] / w["i"] if w["i"] else 0
    A("")
    A(f"### {t}")
    A(f"**{w['c']:.0f} clicks · {w['i']:.0f} impressions · CTR {100*w['c']/w['i']:.2f}% · average position {pos:.1f}** · {len(w['pages'])} pages shown"
      + (f" · images {img[t]['i']:.0f}" if t in img else "") + (f" · AI {ai[t]['i']:.0f}" if t in ai else ""))
    A("")
    verdict, todo = NOTE.get(t, ("", ""))
    A(verdict); A("")
    A("| Page | Clicks | Impressions | Position |"); A("|---|---:|---:|---:|")
    for p, c, i, ps in sorted(w["pages"], key=lambda x: (-x[2], x[0]))[:5]:
        A(f"| `{p}` | {c:.0f} | {i:.0f} | {ps:.0f} |")
    A("")
    A(f"**Next:** {todo}")

A("")
A("## Queries (matched to tools by keywords)")
A("The queries export has no page column, so the matching below is my reading of the words. Search Console also hides rare queries: the file shows 799 of the 2,064 impressions.")
A("")
A("| Tool | Queries | Impressions | Avg position | Top queries |")
A("|---|---:|---:|---:|---|")
RULES = [("BellBook", r"\b(a|an) (day|or)|a or b day|b day|day or b|a day or"), ("GoalTally", r"abc|aba |aba$|task analysis|probe|dtt|momentary|whole interval|phase|data sheet|data collection|narrative|graphing"),
 ("TicketRun", r"raffle|50/50|50 50|ticket|door prize|meal|coat check|numbered"), ("PanelDex", r"panel|breaker|circuit|electrical|connector load|fastener"),
 ("InvoiceKit", r"invoice|bill format|freebillkit|photography bill"), ("GradLedger", r"homeschool|transcript|gpa|report card"), ("LabelFit", r"label converter|convert label|6x4|vinted|meesho|usps"),
 ("PrepLabel", r"fnsku|suffocation"), ("StreamWeek", r"stream schedule"), ("PunchPerk", r"punch card"), ("CollabRate", r"ugc"), ("Slotsmith (plugin site)", r"latepoint|amelia|bookly"),
 ("GlanceSheet", r"iep at a glance|504"), ("LineupFair", r"lineup|softball|tball|t-ball|baseball|fielding"), ("Roomproof", r"photo report|roomproof"), ("GiftStub", r"gift certificate|gift voucher"),
 ("Rooh Sites (agency site)", r"website|rooh")]
by = defaultdict(list)
for r in rd(f"{D}/search/Queries.csv"):
    q = r["Top queries"]; hit = next((nm for nm, rx in RULES if re.search(rx, q.lower())), "Unmatched")
    by[hit].append((q, n(r["Impressions"]), n(r["Position"])))
for t, lst in sorted(by.items(), key=lambda kv: -sum(x[1] for x in kv[1])):
    imp = sum(x[1] for x in lst); ps = sum(x[1] * x[2] for x in lst) / imp
    A(f"| {t} | {len(lst)} | {imp:.0f} | {ps:.0f} | " + "; ".join(f"{q} ({i:.0f}, pos {p:.0f})" for q, i, p in sorted(lst, key=lambda x: -x[1])[:3]) + " |")
A("")
A("## What stands out")
A("- **Ranking is the problem, not the snippet.** The average position is about 31 (page 3 or 4), so most impressions are far down. The exceptions are pages in the top 15 with few clicks: LabelFit `/vinted-label-thermal-printer` (position 12, 36 impressions, 0 clicks), Roomproof home (13), PanelDex 3-phase page (18), BellBook `/today` (6, 3 clicks from 244).")
A("- **13 of the 20 hosts earned 0 clicks.** Five tools (GoalTally, BellBook, TicketRun, PrepLabel, PanelDex) account for 30 of the 33 page-level clicks.")
A("- **Mobile ranks far better than desktop** (position 10.8 against 36). The A/B day pages (positions 3 to 7) probably explain it, but the export doesn't split devices by page.")
A("- **AI features:** 131 impressions; BellBook 57, GoalTally 34, PrepLabel 11, PanelDex 8, TicketRun 7, LabelFit 6, GradLedger 5.")
A("- **New tools** (PriceBoard 29 Oct, ScoreNight 30 Oct, Quotewell 5 Nov, which isn't connected to its domain yet) need a few weeks. Don't judge them before the next export.")
A("- **Image search** gave 71 impressions and no clicks: not worth any work.")
A("")
A("## Next export")
A("Export again around **15 to 17 November** (last 28 days) and compare with this file. The holiday raffle pages, ScoreNight, PriceBoard and Quotewell should have data by then.")
open(OUT, "w", encoding="utf-8").write("\n".join(L) + "\n")
print("wrote", OUT, len(L), "lines")
