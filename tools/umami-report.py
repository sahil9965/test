#!/usr/bin/env python3
"""Per-tool Umami report from the public share link (no login or key). Usage: python3 -I tools/umami-report.py 2026-10-19 2026-11-05
Prints, per tool: pageviews, sessions, sessions that did something (the 'engaged' event), sessions that made a file or export,
top sources and countries. Linux sessions are counted apart: on these sites they almost never click anything, so they are mostly crawlers."""
import json, sys, time, urllib.request, urllib.error, urllib.parse, datetime, collections as C
from urllib.parse import urlparse, parse_qs
BASE, SHARE = "https://cloud.umami.is/analytics/us/api", "XbId9Ie5zpfnBsor"
A, B = sys.argv[1], sys.argv[2]
def get(url, h=None):
    for n in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=dict({"User-Agent": "Mozilla/5.0"}, **(h or {}))), timeout=30) as r: return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code in (403, 429, 502, 503) and n < 5: time.sleep(2 + 3 * n); continue
            sys.exit(f"HTTP {e.code}")
sh = get(f"{BASE}/share/{SHARE}"); wid = sh["websiteId"]; H = {"x-umami-share-token": sh["token"], "x-umami-share-context": "1"}
ms = lambda d, end=False: int(datetime.datetime.fromisoformat(d + ("T23:59:59" if end else "T00:00:00")).replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)
ev, page = [], 1
while True:
    r = get(f"{BASE}/websites/{wid}/events?" + urllib.parse.urlencode({"startAt": ms(A), "endAt": ms(B, True), "pageSize": 100, "page": page}), H)
    ev += r.get("data", [])
    if len(ev) >= r.get("count", 0) or not r.get("data"): break
    page += 1; time.sleep(0.5)
sites = json.load(open("sites.json")); h2 = {urlparse(s["url"]).hostname: s["name"] for s in sites}
h2.update({"roohsites.com": "Rooh Sites (agency)", "tools.roohsites.com": "Hub", "slotsmith.roohsites.com": "Slotsmith site"})
sess = {}
for e in ev:
    s = sess.setdefault(e["sessionId"], {"os": e["os"], "tools": set(), "eng": False, "out": 0, "pv": 0, "src": ""})
    s["tools"].add(h2.get(e["hostname"], e["hostname"]))
    if e["eventType"] == 1:
        s["pv"] += 1
        u = (parse_qs(e["urlQuery"].lstrip("?")).get("utm_source") or [""])[0]
        s["src"] = s["src"] or u or e["referrerDomain"]
    elif e["eventName"] == "engaged": s["eng"] = True
    elif e["eventName"]: s["out"] += 1
T = C.defaultdict(lambda: [0, 0, 0, 0])
for s in sess.values():
    if s["os"] == "Linux": continue
    for t in s["tools"]: d = T[t]; d[0] += 1; d[1] += s["eng"]; d[2] += s["out"] > 0; d[3] += s["pv"]
print(f"{A} to {B}: {len(ev)} events, {len(sess)} sessions, {sum(1 for s in sess.values() if s['os'] == 'Linux')} on Linux (counted apart)")
print("Tool | sessions (not Linux) | engaged | made an output")
for t, d in sorted(T.items(), key=lambda kv: -kv[1][0]): print(f"{t} | {d[0]} | {d[1]} | {d[2]}")
src = C.Counter(s["src"] or "(direct)" for s in sess.values() if s["os"] != "Linux")
print("Sources (sessions, not Linux):", dict(src.most_common(8)))
