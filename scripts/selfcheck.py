"""주간 자가점검: 각 수집기의 최근 실행 결과와 브랜치 갱신 시각을 보고, 이상이 있으면 이슈를 연다."""
import json, os, subprocess, datetime as dt
R = os.environ['REPO']; N = 3   # 연속 실패/무갱신 허용 횟수
def gh(*a): return json.loads(subprocess.run(['gh', 'api', *a], capture_output=True, text=True).stdout or '{}')
now = dt.datetime.now(dt.timezone.utc); bad = []
for wf, br, maxh in (('collect.yml', 'data', 6), ('collect.yml', 'media', 48), ('history.yml', 'history', 12),
                     ('legal.yml', 'legal', 24), ('politicians.yml', 'politicians', 36), ('archive.yml', 'data', 48)):
    runs = gh(f'repos/{R}/actions/workflows/{wf}/runs?per_page={N}').get('workflow_runs', [])
    if runs and all(r.get('conclusion') not in ('success', None) for r in runs): bad.append(f'- `{wf}`: 최근 {N}회 연속 실패')
    c = gh(f'repos/{R}/commits/{br}')
    t = c.get('commit', {}).get('committer', {}).get('date')
    if t and (now - dt.datetime.fromisoformat(t.replace('Z', '+00:00'))).total_seconds() > maxh * 3600:
        bad.append(f'- 브랜치 `{br}`: {maxh}시간 넘게 새 데이터 없음(마지막 {t})')
# 법제처: 대상별 0건 지속 여부
idx = subprocess.run(['gh', 'api', f'repos/{R}/contents/legal/v1/index.json?ref=legal', '-H', 'Accept: application/vnd.github.raw'], capture_output=True, text=True).stdout
try:
    for k, v in json.loads(idx).get('lawgo', {}).items():
        if not v: bad.append(f'- 법제처 `{k}`: 누적 0건')
except Exception: pass
bad = sorted(set(bad)); print('\n'.join(bad) or 'OK')
if bad:
    title = f'[자가점검] 수집 이상 {now:%Y-%m-%d}'
    subprocess.run(['gh', 'issue', 'create', '-R', R, '-t', title, '-b', '자동 점검 결과입니다.\n\n' + '\n'.join(bad)])
