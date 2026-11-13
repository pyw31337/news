#!/usr/bin/env python3
"""원문 메타 보강 맵을 today.json에 안전하게 합친다.

수집 원문은 보존하고, URL이 일치하며 비어 있는 필드만 채운다. 원문 날짜가
확인되지 않은 경우 수집 시각을 기사 날짜로 추정하지 않는다.
"""
import json, os, sys


def main():
    today = sys.argv[1] if len(sys.argv) > 1 else 'data/today.json'
    mapping = sys.argv[2] if len(sys.argv) > 2 else 'data/db/og/map.json'
    try: d = json.load(open(today, encoding='utf-8'))
    except Exception as e: raise SystemExit(f'meta: today read failed: {e}')
    try: m = json.load(open(mapping, encoding='utf-8')).get('m', {})
    except Exception: m = {}
    changed = 0
    for issue in d.get('issues') or []:
        rows = list(issue.get('sources') or [])
        if issue.get('url'): rows.append(issue)
        for row in rows:
            u = row.get('url') or row.get('originallink') or ''
            meta = m.get(u) or {}
            if not meta: continue
            for key in ('t', 'desc', 'image'):
                if meta.get(key) and not row.get(key):
                    row[key] = meta[key]; changed += 1
    json.dump(d, open(today, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'meta: applied={changed} urls={len(m)}')


if __name__ == '__main__': main()
