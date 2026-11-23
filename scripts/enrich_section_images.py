#!/usr/bin/env python3
"""Fill empty section thumbnails from already verified issue images."""
import json
import sys

path = sys.argv[1] if len(sys.argv) > 1 else 'data/today.json'
data = json.load(open(path, encoding='utf-8'))
issues = data.get('issues') or []
by_url = {x.get('url'): x.get('image') for x in issues if x.get('url') and x.get('image')}
by_title = {x.get('title'): x.get('image') for x in issues if x.get('title') and x.get('image')}
filled = 0
for rows in (data.get('sections') or {}).values():
    for row in rows or []:
        if not row.get('image') and not row.get('img'):
            image = by_url.get(row.get('url')) or by_title.get(row.get('title'))
            if image:
                row['image'] = image
                filled += 1
json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'section images enriched: {filled}')
