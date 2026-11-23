#!/usr/bin/env python3
"""Create the small, public projection used by the v2 people directory."""
import json, sys
src = sys.argv[1] if len(sys.argv) > 1 else 'data/people_bio.json'
dst = sys.argv[2] if len(sys.argv) > 2 else 'data/v2_people.json'
bio = json.load(open(src, encoding='utf-8'))
out = {}
for name, row in bio.items():
    if not name or name.startswith('wd:') or (name.isalnum() and len(name) >= 6 and name.upper() == name):
        continue
    out[name] = {'k': row.get('kind') or '', 'r': row.get('role_title') or '', 'o': row.get('org') or '', 'e': len(row.get('events') or [])}
json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'v2 people projection: {len(out)} names')
