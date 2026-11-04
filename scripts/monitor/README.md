# Request monitoring (runs on a Raspberry Pi)

## Why

The Vercel Hobby plan has a monthly Fluid CPU quota, and fungio.de ran into it. Every request that is
not served from the CDN cache runs the Vercel function (a page render, an image transform, an API call)
and costs CPU time. This monitor records which requests reach the function and who sends them, so we
can tell what to cut: bots vs. people, page renders vs. the image proxy.

The source is `server/plugins/request-log.ts`: one JSON log line per function invocation (`kind`:
`page` / `img` / `api` / `internal`, `bot`, shortened user agent, status, duration in ms). Anything
served from the CDN cache or blocked by the Vercel Firewall never reaches the function and does not
show up here, which is exactly the traffic that costs no CPU.

`ms` is wall time including waits on Supabase, not pure CPU. Treat it as a proxy. The quota itself is
only visible in the Vercel dashboard (Usage).

## How it works

- `collect.sh` runs `vercel logs --follow --json` and appends each line to `~/fungio-logs/YYYY-MM-DD.jsonl`
  (the file is chosen per line, so the stream splits at midnight).
- `fungio-monitor.service` keeps `collect.sh` running as a systemd *user* service, also after a reboot.
- `summary.py` reads one day and prints requests by kind and visitor type, render and image wall time,
  top bot user agents, status codes and requests per hour.
- Without `--follow`, the CLI (v62+) only prints the latest entries and exits, so a restart loop replayed
  the same lines every ~25 s. With `--follow` it streams new lines only. If the stream ends anyway
  (Vercel's 5-minute query limit is logged once in a while), the loop restarts it and notes that in
  `collect-errors.log`.
- About 300 bytes per request, so even 20,000 bot requests a day are only ~6 MB.

## Setup

1. Node and the Vercel CLI: `node -v` (>= 18), then `sudo npm i -g vercel@latest` (>= 62, needed for `vercel logs --follow`).
2. Create a Vercel token (vercel.com, Account Settings, Tokens, scope of the team that owns the project,
   expiry e.g. 30 days) and store it on the Pi:
   `mkdir -p ~/.config/fungio-monitor && nano ~/.config/fungio-monitor/token && chmod 600 ~/.config/fungio-monitor/token`
   When the token expires the stream stops, so check `collect-errors.log` first if a day is empty.
3. Copy the scripts from the repo: `scp -r scripts/monitor <user>@<pi-host>:~/fungio-monitor`
4. Start the service:
   ```
   mkdir -p ~/.config/systemd/user
   cp ~/fungio-monitor/fungio-monitor.service ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now fungio-monitor
   sudo loginctl enable-linger $USER
   ```

## Usage

- Is it running? `systemctl --user status fungio-monitor` (it is a user service, plain `systemctl status`
  says "not found").
- Daily summary: `python3 ~/fungio-monitor/summary.py` (today) or `... summary.py 2026-10-28`.
- Errors: `~/fungio-logs/collect-errors.log`. It is mostly "waiting for new logs..." lines and grows
  (8 MB after four weeks); it is not rotated, so truncate it now and then.
- The collector itself costs the Pi CPU (about 15 % of one core over the first four weeks).

## Reading the numbers

- Normal days are 1,000 to 3,000 requests. A spike is almost always one bot.
- `internal` requests are the page render fetching its own translation files (`/_i18n/...`) or the error
  page, so they roughly track the number of page renders and are not extra visitors.
- Page renders by bots are the cost to watch: a bot opening thousands of species pages in one day adds
  tens of minutes of render wall time.

## Bot history and what is blocked

Blocked in `public/robots.txt` (crawlers that obeyed it stopped within a few days):

| Date seen | Bot | Volume |
| --- | --- | --- |
| 2026-10-07 | GPTBot | ~21k pages in 4 hours |
| 2026-10-18 | QlyzeBot | ~10.9k pages in one day |
| 2026-10-12 to 23 | Reflectionbot | ~200 to 300 pages a day |
| 2026-10-28 and 29 | ElevenlabsCrawler | 5.1k and 6.4k pages a day |
| from 2026-10-30 | AIWebIndex | growing, 450 a day by 2026-11-03 |

ElevenlabsCrawler and AIWebIndex were added to `robots.txt` on 2026-11-04. Compare the daily numbers
for those two a few days later to see whether they obey it. Search engine bots (Bing, Qwant, DuckDuckGo)
are allowed on purpose because they send visitors.

robots.txt only stops bots that obey it. For the others there is the Vercel Firewall (dashboard, not in
code; Project, Firewall, Rules and Traffic). It has one custom rule and two managed rulesets:

- **Custom rule "Deny AWS Linux-Chrome scraper (JA4)"** (added 2026-11-04, action **Log**): matches the JA4
  digest of the scraper described below. Check its hits under Traffic; if it matches only that scraper
  after a day or two, switch the action to **Deny** and publish. Then the "Linux x86_64" request count in
  `summary.py` should fall to near zero.

- **AI Bots**: already denying known AI crawlers (PetalBot, Applebot, Amazonbot, Bytespider, OAI-SearchBot,
  ~80 requests a day). Denied requests cost no CPU.
- **Bot Protection**: in **log** mode, so it only shows what it would catch (~1.9k requests a day). Switch it
  to challenge once the log shows only unwanted traffic.

The Bot Protection log of 2026-11-03/04 was dominated by (a) AIWebIndex (~520 a day, Hetzner) and (b) ~1.1k
requests a day from a "Linux x86_64 Chrome/152" user agent from Amazon (AWS) with a single TLS fingerprint
(JA4 `t13d1517h2_8daaf6152771_cb7bf5808d99`) that walks `/mushroom/*` pages. The monitor counts (b) as
human, because its user agent looks like a browser. In our own logs, user agents containing
`X11; Linux x86_64` were 400 to 800 page renders a day (25 to 35 % of all function requests) on 25 to 27 Oct
and 2 to 4 Nov. Some of that is real Linux users, so use the JA4 digest or the AWS network as the match, not
the user agent alone.
