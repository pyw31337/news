#!/usr/bin/env python3
"""무료 한도 사용량 점검(매일, quota.yml): 80%를 넘는 항목이 있으면 GitHub 이슈를 열어 알림(메일로 옴). 같은 항목은 열린 이슈가 있으면 다시 열지 않음.
항목: 저장소 전체 크기(5GB 권장), 공개 사이트 묶음(GitHub Pages 1GB), 썸네일(media, 자체 상한 MEDIA_MAX_MB 900MB — 넘으면 오래된 것부터 지워짐),
      data 브랜치 작업 크기, Cloudflare D1(DB당 500MB), R2(10GB), 네이버 검색 API(월 28만 회)."""
import os, json, subprocess, sys
R = os.environ['REPO']; WARN = float(os.environ.get('QUOTA_WARN', '0.8'))
def gh(*a):
    try: return json.loads(subprocess.run(['gh', 'api', *a], capture_output=True, text=True).stdout or '{}')
    except Exception: return {}
def du(p):
    try: return int(subprocess.run(['du', '-sb', '--exclude=.git', p], capture_output=True, text=True).stdout.split()[0])
    except Exception: return -1
MB = 1 << 20; GB = 1 << 30; rows = []
def add(name, used, limit, unit, hint):
    if used is None or used < 0: rows.append((name, None, limit, unit, hint)); return
    rows.append((name, used, limit, unit, hint))
add('저장소 전체(GitHub)', gh(f'repos/{R}').get('size', -1) * 1024, 5 * GB, 'B', '오래된 data 이력 압축(이미 400MB마다 자동) → 그래도 차면 기사 원문 DB를 R2로 옮기기')
arts = [a for a in gh(f'repos/{R}/actions/artifacts?per_page=50').get('artifacts', []) if a.get('name') == 'github-pages']
add('공개 사이트 묶음(GitHub Pages)', arts[0]['size_in_bytes'] if arts else -1, 1 * GB, 'B', '썸네일을 Cloudflare R2 공개 주소로 옮기면 사이트 묶음이 크게 줄어듦')
add('썸네일(media 브랜치)', du('media'), int(os.environ.get('MEDIA_MAX_MB', '900')) * MB, 'B', '상한을 넘으면 오래된 썸네일부터 지워짐 → R2(10GB)로 옮기기')
add('data 브랜치', du('data'), 2 * GB, 'B', '기사·인물 DB를 연도별로 R2나 별도 저장소로 옮기기')
U = {}
try: U = json.load(open('usage.json'))
except Exception: pass
d1 = U.get('d1', {})
add('Cloudflare D1 계정 동기화 DB', d1.get('sync', -1), 500 * MB, 'B', '오래된 세션·알림 정리, 그래도 차면 유료(월 5달러) 또는 새 DB로 분할')
add('Cloudflare D1 인물 아카이브 DB', d1.get('archive', -1), 500 * MB, 'B', '새 D1 DB를 하나 더 만들어 연도별로 분할(무료 계정당 10개)')
add('Cloudflare R2 백업', U.get('r2', {}).get('bytes', -1), 10 * GB, 'B', '월별 백업 보관 개수 줄이기 또는 다른 무료 저장소(B2 10GB)로 분산')
try:
    mo = json.load(open('data/db/naver_usage.json')).get('month', {})
    if mo: add('네이버 검색 API(이번 달)', mo[max(mo)], 280000, '회', '수집 주기 늘리기(NAVER_BUDGET)')
except Exception: pass
fmt = lambda v, u: (f'{v / GB:.2f}GB' if v >= GB else f'{v / MB:.0f}MB') if u == 'B' else f'{v:,}{u}'
lines, hot = [], []
for name, used, limit, unit, hint in rows:
    if used is None: lines.append(f'| {name} | 확인 못 함 | {fmt(limit, unit)} | - |'); continue
    pct = used / limit; lines.append(f'| {name} | {fmt(used, unit)} | {fmt(limit, unit)} | {pct:.0%} |')
    if pct >= WARN: hot.append((name, pct, hint))
table = '| 항목 | 사용 | 한도 | 비율 |\n|---|---|---|---|\n' + '\n'.join(lines)
print(table)
open_titles = {i['title'] for i in json.loads(subprocess.run(['gh', 'issue', 'list', '-R', R, '--state', 'open', '--json', 'title', '-L', '100'], capture_output=True, text=True).stdout or '[]')}
for name, pct, hint in hot:
    t = f'[용량 알림] {name} {pct:.0%} 사용'
    if any(x.startswith(f'[용량 알림] {name} ') for x in open_titles): continue
    body = f'무료 한도의 {WARN:.0%}를 넘었어요. 데이터가 지워지기 전에 옮길 준비가 필요해요.\n\n- 지금: **{pct:.0%}**\n- 권장 대응: {hint}\n\n전체 현황\n\n{table}\n\n---\n_자동 점검(quota.yml)_'
    subprocess.run(['gh', 'issue', 'create', '-R', R, '-t', t, '-b', body])
