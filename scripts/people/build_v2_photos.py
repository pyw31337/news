#!/usr/bin/env python3
"""Create the small public portrait index used by the v2 people directory."""
import json
import sys

src = sys.argv[1] if len(sys.argv) > 1 else 'data/db/people/portraits.json'
dst = sys.argv[2] if len(sys.argv) > 2 else 'data/v2_person_photos.json'
data = json.load(open(src, encoding='utf-8'))
out = {}
for pid, row in (data.get('items') or {}).items():
    path = str(row.get('file') or '').strip()
    if pid.startswith('wd:Q') and path.startswith('media/ent/'):
        out[pid] = path
json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'v2 person photo index: {len(out)} ids')
