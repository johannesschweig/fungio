#!/bin/sh
# Collects fungio's production runtime logs into one JSONL file per day.
# Needs Vercel CLI >= 62: there `vercel logs` without --follow only prints the most recent entries and
# exits (restarting it in a loop would replay the same lines every few seconds). With --follow it
# streams new log lines as they happen; the loop only restarts it if the stream ever ends, and each
# start attaches to the then-active production deployment, so new deploys are picked up.
#
# Needs: Node + `npm i -g vercel@latest`, and a Vercel token in ~/.config/fungio-monitor/token (chmod 600).
set -u
DIR="${FUNGIO_MONITOR_DIR:-$HOME/fungio-logs}"
TOKEN="$(cat "$HOME/.config/fungio-monitor/token")"
mkdir -p "$DIR"

while true; do
  # the stream runs for days, so pick the day file per line (not once per start) to split at midnight
  vercel logs --follow --project fungio --environment production --json \
    --scope jss-projects-14e1cf9d --token "$TOKEN" 2>> "$DIR/collect-errors.log" |
    while IFS= read -r line; do
      printf '%s\n' "$line" >> "$DIR/$(date +%F).jsonl"
    done
  echo "$(date -Is) stream ended, restarting" >> "$DIR/collect-errors.log"
  sleep 5
done
