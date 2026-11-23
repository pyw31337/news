#!/usr/bin/env python3
"""Audit the published NewsBoard contract without changing any source data.

This is intentionally small and dependency-free so it can run on every scheduled
check. It catches the failures users notice first: stale JSON, missing v2 assets,
broken internal person links, and accidental publication of the raw people ledger.
"""
from __future__ import annotations

import datetime as dt
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

BASE = 'https://pyw31337.github.io/news'
CHECKS = {
    'today': '/data/today.json',
    'people': '/data/v2_people.json',
    'person_ids': '/data/v2_person_ids.json',
    'person_photos': '/data/v2_person_photos.json',
    'persons_page': '/v2/persons/',
}


def fetch(path: str):
    req = urllib.request.Request(BASE + path, headers={'User-Agent': 'newsboard-public-audit/1'})
    try:
        response = urllib.request.urlopen(req, timeout=25)
    except urllib.error.HTTPError as response:
        return response.code, response.headers.get_content_type(), response.read()
    with response:
        body = response.read()
        return response.status, response.headers.get_content_type(), body


def main() -> int:
    report = {'checked_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'base': BASE, 'checks': {}, 'warnings': [], 'failures': []}
    payloads = {}
    for name, path in CHECKS.items():
        try:
            status, content_type, body = fetch(path)
            report['checks'][name] = {'status': status, 'content_type': content_type, 'bytes': len(body)}
            if status != 200:
                report['failures'].append(f'{name}: HTTP {status}')
            payloads[name] = body
        except Exception as exc:
            report['checks'][name] = {'error': str(exc)}
            report['failures'].append(f'{name}: {exc}')

    for name in ('today', 'people', 'person_ids', 'person_photos'):
        if name not in payloads:
            continue
        try:
            data = json.loads(payloads[name])
            report['checks'][name]['items'] = len(data) if isinstance(data, (dict, list)) else None
        except json.JSONDecodeError as exc:
            report['failures'].append(f'{name}: invalid JSON ({exc})')

    # Content contract: a published day must contain usable article records and
    # a fresh timestamp. Low image coverage is a warning because SVG fallbacks
    # keep the UI usable while the next collector run repairs the source field.
    if 'today' in payloads and report['checks'].get('today', {}).get('status') == 200:
        today = json.loads(payloads['today'])
        updated = str(today.get('updated') or '')
        try:
            stamp = dt.datetime.fromisoformat(updated.replace('Z', '+00:00'))
            age_h = (dt.datetime.now(dt.timezone.utc) - stamp).total_seconds() / 3600
            report['checks']['freshness_hours'] = round(age_h, 2)
            if age_h > 36:
                report['failures'].append(f'today.json is {age_h:.1f}h old')
        except ValueError:
            report['failures'].append('today.json has no valid updated timestamp')
        issues = [x for x in today.get('issues', []) if isinstance(x, dict)]
        usable = [x for x in issues if x.get('title') and x.get('url')]
        if len(usable) < 5:
            report['failures'].append(f'today.json has only {len(usable)} usable issue rows')
        duplicate_urls = len(usable) - len({x.get('url') for x in usable})
        report['checks']['issue_quality'] = {'rows': len(issues), 'usable': len(usable), 'duplicate_urls': duplicate_urls}
        section_rows = [x for rows in (today.get('sections') or {}).values() if isinstance(rows, list) for x in rows if isinstance(x, dict)]
        section_images = sum(bool(x.get('image') or x.get('img')) for x in section_rows)
        section_rate = section_images / max(1, len(section_rows))
        report['checks']['section_image_coverage'] = round(section_rate, 4)
        if section_rate < 0.5:
            report['warnings'].append(f'section image coverage is {section_rate:.1%}; fallback visuals are active')

    if 'person_ids' in payloads and 'person_photos' in payloads:
        ids, photos = json.loads(payloads['person_ids']), json.loads(payloads['person_photos'])
        report['checks']['portrait_coverage'] = {
            'mapped_ids': len(ids),
            'verified_portraits': len(photos),
            'coverage': round(len(set(ids.values()) & set(photos)) / max(1, len(ids)), 4),
        }
    if 'people' in payloads:
        try:
            raw_status = fetch('/data/people_bio.json')[0]
            report['checks']['raw_ledger_absent'] = raw_status == 404
            if not report['checks']['raw_ledger_absent']:
                report['failures'].append(f'raw people_bio.json is publicly accessible (HTTP {raw_status})')
        except Exception as exc:
            report['checks']['raw_ledger_absent'] = {'error': str(exc)}
            report['failures'].append(f'raw ledger check failed: {exc}')

    out = Path('reports/public-audit.json')
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
    return 1 if report['failures'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
