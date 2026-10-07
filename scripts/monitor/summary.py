#!/usr/bin/env python3
"""Summarise one day of collected fungio logs: what reached the Vercel function, from whom.

Usage: summary.py [YYYY-MM-DD]   (default: today; reads ~/fungio-logs/<date>.jsonl)

Counts the one-line-per-request entries written by server/plugins/request-log.ts.
"""
import collections
import json
import os
import sys
from datetime import date, datetime

day = sys.argv[1] if len(sys.argv) > 1 else date.today().isoformat()
path = os.path.join(os.environ.get('FUNGIO_MONITOR_DIR', os.path.expanduser('~/fungio-logs')), f'{day}.jsonl')

reqs, seen = [], set()
with open(path) as f:
    for line in f:
        try:
            entry = json.loads(line)
            # field names differ between `vercel logs --follow` (rowId, timestampInMs) and the
            # request-log API used without --follow (id, timestamp); accept both
            row_id = entry.get('rowId') or entry.get('id')
            if row_id in seen:  # a restart can repeat a line
                continue
            seen.add(row_id)
            msg = json.loads(entry.get('message') or '{}')
        except (json.JSONDecodeError, TypeError):
            continue
        if isinstance(msg, dict) and msg.get('reqlog') == 1:
            msg['path'] = entry.get('requestPath', '')
            msg['hour'] = datetime.fromtimestamp((entry.get('timestampInMs') or entry.get('timestamp')) / 1000).hour
            reqs.append(msg)

if not reqs:
    sys.exit(f'{day}: no request lines found in {path}')

def table(title, counter, top=10):
    print(f'\n{title}')
    for key, n in counter.most_common(top):
        print(f'  {n:>7}  {key}')

print(f'{day}: {len(reqs)} requests reached the function')
by_kind = collections.Counter((r['kind'], 'bot' if r['bot'] else 'human') for r in reqs)
table('By kind / visitor', collections.Counter({f'{k:<5} {v}': n for (k, v), n in by_kind.items()}))

img = [r['ms'] for r in reqs if r['kind'] == 'img' and r['status'] == 200]
page = [r['ms'] for r in reqs if r['kind'] == 'page']
for name, ms in (('image transforms', img), ('page renders', page)):
    if ms:
        ms.sort()
        print(f'\n{name}: {len(ms)}, median {ms[len(ms) // 2]} ms, total wall time {sum(ms) / 60000:.1f} min')

table('Top bots', collections.Counter(r['ua'] for r in reqs if r['bot']))
table('Status codes', collections.Counter(r['status'] for r in reqs))
print('\nRequests per hour')
per_hour = collections.Counter(r['hour'] for r in reqs)
for h in range(24):
    if per_hour[h]:
        print(f'  {h:02d}:00  {per_hour[h]:>6}  {"#" * min(60, per_hour[h] // 20 + 1)}')
