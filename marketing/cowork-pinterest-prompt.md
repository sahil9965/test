# Cowork: daily Pinterest posting

Hand the prompt below to Claude Cowork as a **scheduled task that runs 3 times a day**, spread over the US day (most visitors are American): **9:00 AM, 1:00 PM and 8:00 PM US Eastern** (6:30 PM, 10:30 PM and 5:30 AM IST; one hour later in IST after US daylight saving ends on 1 Nov). Each run posts one pin.

**Before the first run (one-time, 5 minutes)**
0. Cowork's network access must allow **tools.roohsites.com** (Claude desktop → Settings → Capabilities → network access: add the domain, or allow all domains). Days 1–13 were posted that way. Backup only: if the network setting can't be changed, connect your **Downloads** folder to Cowork and it will use the "Download PNG" buttons at https://tools.roohsites.com/pins/.
1. Log in to Pinterest in the browser Cowork uses, and stay logged in.
2. Optional but recommended: switch to a free Pinterest **Business** account (Settings → Account management → Convert to business). It adds pin analytics and costs nothing.
3. Optional: claim your websites in Pinterest (Settings → Claimed accounts → Websites). Pinterest gives you a meta tag or file; send it to me and I'll add it to the sites.

The schedule (34 posts, one per day; days 15–24 are holiday-season pins, days 25–34 cover the FNSKU, panel schedule, punch card, gift certificate, label and IEP tools) is published at https://tools.roohsites.com/pins/schedule.json. A readable copy is in `marketing/pinterest-posts.md`. New pins are added automatically every morning (3 a day, by the `pins-daily` workflow: `tools/pins-auto.mjs`), so the task never runs out. Run the task **3 times a day** (for example 9:00 AM, 1:00 PM and 8:00 PM US Eastern); each run posts one pin.

---

## Prompt to paste into Cowork

```
You post one Pinterest pin per run for my free web tools (Rooh Sites). This task runs 3 times a day. Work in my browser, where I'm already logged in to Pinterest.

1. Get the schedule
   Open https://tools.roohsites.com/pins/schedule.json and read it. It has "boards" (board name → board description) and "posts", a list ordered by "day". Each post has: title, description, board, image (a PNG URL), link, alt, keywords.

2. Find the next post
   Go to my Pinterest profile and look at the pins already saved on each board named in the schedule. The next post is the lowest "day" whose exact title does not already appear as a pin on its board.
   If every post in the schedule is already published, don't post anything. Tell me "All scheduled pins are published. New ones are added every morning, so the next run will try again." and stop.

3. Get the image
   Open the post's image URL and download the PNG to this computer (this is how days 1–13 were posted).
   Only if that fails: in Chrome, open https://tools.roohsites.com/pins/#day-N (N = the post's day) and click that day's "Download PNG" button; Chrome saves it to my Downloads folder, and you upload it from there if that folder is connected.
   If neither works, don't post. Tell me which image failed and stop.

4. Check the link
   Open the post's link in a new tab and confirm the page loads (a tool page from roohsites.com, not an error page). If it fails, don't post. Tell me which link failed and stop.

5. Create the pin
   On Pinterest, go to Create → Pin (the normal organic pin builder) and upload the downloaded PNG. Then fill in:
   - Title: the post's title, exactly.
   - Description: the post's description, exactly.
   - Link (destination URL): the post's link, exactly, including everything after the "?".
   - Board: the post's board. If the board does not exist yet, create it with that exact name and use the description from "boards" in the schedule. Make the board public.
   - Alt text (under "More options" if it is hidden): the post's alt.
   - Tagged topics, if Pinterest offers them: pick up to 3 that match the post's keywords.
   Publish it now. Don't schedule it for later and don't boost or promote it.

6. Verify
   Open the new pin. Check that the title is right, the image shows, and clicking the destination opens the post's link. Copy the pin's URL.

7. Report back in two lines:
   "Posted day N: <title> on <board> — <pin URL>"
   "Next up: day N+1: <next title>" (or "That was the last scheduled pin.")

Rules
- Post at most one pin per run, even if earlier days were missed. If a pin from the schedule was published less than 2 hours ago, don't post; say "Last pin was under 2 hours ago, skipping this run." and stop.
- Use the text from the schedule as it is. Only shorten it if Pinterest rejects the length, and say so in the report.
- Never use "Save from URL", "Save from website" or anything that says "ad", "promote" or "boost". Those are Pinterest's ad tools.
- Don't follow, like, comment on, message or save other people's pins. Don't change my profile, settings or existing pins. Don't run ads or promotions.
- Never type a password or a verification code. If Pinterest asks me to log in, shows a captcha, or asks for a code, stop and tell me.
- If Pinterest shows a warning about the pin or my account (spam, policy, blocked link), stop and tell me exactly what it says. Don't retry.
- If anything is unclear or the Pinterest layout looks different from these steps, stop and describe what you see rather than guessing.
```
