#!/usr/bin/env python3
"""Build a compact name -> canonical person id index for the v2 directory."""
import gzip, json, sys
from collections import defaultdict

src = sys.argv[1] if len(sys.argv) > 1 else 'data/db/people/registry.json.gz'
dst = sys.argv[2] if len(sys.argv) > 2 else 'data/v2_person_ids.json'
rows = json.load(gzip.open(src, mode='rt', encoding='utf-8'))
pool = defaultdict(list)
for row in rows:
    name, pid = str(row.get('n') or '').strip(), str(row.get('id') or '').strip()
    if not name or not pid or pid.startswith('wd:a'):
        continue
    if pid.startswith('wd:Q'):
        pool[name].append(row)
    elif not pool[name]:
        pool[name].append(row)
def score(row):
    pid = str(row.get('id') or '')
    return (1 if pid.startswith('wd:Q') else 0, int(row.get('sl') or 0), 1 if row.get('src') == 'wikidata' else 0)
out = {name: max(items, key=score)['id'] for name, items in pool.items()}
json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'v2 person id index: {len(out)} names')
