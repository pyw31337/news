#!/usr/bin/env python3
"""맥미니 로컬 보강 산출물의 원격 신선도 점검.

GitHub는 맥미니의 전원·LaunchAgent 상태를 직접 볼 수 없으므로, data 브랜치에
마지막으로 올라온 산출물 시각을 heartbeat로 사용한다. stale은 원본을 삭제하지
않고 보고서와 종료 코드로만 알린다.
"""
import argparse, datetime as dt, json, os, sys

KST = dt.timezone(dt.timedelta(hours=9))

def load(path):
    try:
        with open(path, encoding='utf-8') as f: return json.load(f)
    except Exception as e: return {'_error': str(e)}

def parse(value):
    if not value: return None
    try:
        return dt.datetime.fromisoformat(str(value).replace('Z', '+00:00')).astimezone(KST)
    except Exception:
        return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('data', nargs='?', default='data')
    ap.add_argument('--output', default='reports/macmini-health.json')
    ap.add_argument('--warn-hours', type=float, default=6)
    ap.add_argument('--fail-hours', type=float, default=36)
    a = ap.parse_args()
    now = dt.datetime.now(KST)
    specs = [
        ('journalists', os.path.join(a.data, 'reporters_local.json'), 'updated'),
        ('overlay', os.path.join(a.data, 'overlay', 'latest.json'), 'updated'),
    ]
    rows = []; failed = False
    for kind, path, key in specs:
        obj = load(path)
        stamp = parse(obj.get(key)) if isinstance(obj, dict) else None
        age = round((now - stamp).total_seconds() / 3600, 1) if stamp else None
        state = 'ok' if age is not None and age <= a.warn_hours else ('warn' if age is not None and age <= a.fail_hours else 'stale')
        if state == 'stale': failed = True
        rows.append(dict(kind=kind, path=path, updated=obj.get(key) if isinstance(obj, dict) else None, age_hours=age, state=state,
                         reporters=len(obj.get('reporters') or []) if kind == 'journalists' and isinstance(obj, dict) else None,
                         issues=len(obj.get('issues') or []) if kind == 'overlay' and isinstance(obj, dict) else None,
                         error=obj.get('_error') if isinstance(obj, dict) else None))
    report = dict(schema='newsboard.macmini-health.v1', checked=now.isoformat(timespec='seconds'), warn_hours=a.warn_hours,
                  fail_hours=a.fail_hours, ok=not failed, artifacts=rows)
    os.makedirs(os.path.dirname(a.output) or '.', exist_ok=True)
    with open(a.output, 'w', encoding='utf-8') as f: json.dump(report, f, ensure_ascii=False, indent=2)
    for row in rows:
        print('[%s] %s updated=%s age_h=%s' % (row['state'].upper(), row['kind'], row['updated'], row['age_hours']))
        if row['state'] == 'warn': print('::warning::Mac mini %s 산출물이 %.1f시간 경과했습니다' % (row['kind'], row['age_hours']))
        if row['state'] == 'stale': print('::error::Mac mini %s 산출물이 갱신되지 않았습니다 (%s)' % (row['kind'], row['updated'] or 'missing'))
    return 1 if failed else 0

if __name__ == '__main__': sys.exit(main())
