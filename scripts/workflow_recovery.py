"""최근 GitHub Actions 실패를 분류하고, 안전한 일시 오류만 한 번 재시도한다.

원본 뉴스와 누적 데이터는 절대 삭제·되돌리지 않는다. 코드/자격증명/수집 품질
오류는 재시도해도 해결되지 않으므로 원인과 근거만 보고서에 남긴다.
"""
import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = os.environ.get('REPO', '')
SUMMARY = os.environ.get('GITHUB_STEP_SUMMARY', '')
SAFE_EVENTS = {'push', 'schedule'}
SKIP_WORKFLOWS = {'workflow-recovery', 'selfcheck', 'news-history'}
STALE_DATA_MINUTES = int(os.environ.get('STALE_DATA_MINUTES', '75'))

RULES = (
    ('learning_catalog_exhausted', r'not enough reviewed words|reviewed glossary is incomplete', 'code_repaired',
     '검수 단어 풀이 소진됨 — 배포 안전판 유지, 사전 확충 대상'),
    ('data_branch_race', r'failed to push some refs|fetch first|cannot rebase:.*unstaged|no rebase in progress', 'retry_once',
     'data 브랜치 동시 갱신 충돌 — 최신 data 위로 안전 재시도'),
    ('pages_busy', r'in progress deployment|Creating Pages deployment failed|deployment.*already.*progress', 'retry_once',
     'GitHub Pages가 기존 배포를 처리 중 — 완료 후 한 번 재시도'),
    ('transient_network', r'HTTP (?:5\d\d)|timed out|timeout|connection reset|temporarily unavailable|TLS handshake', 'retry_once',
     '일시 네트워크/공급자 오류 — 한 번 재시도'),
    ('credentials', r'bad credentials|secret .*not set|unauthorized|permission denied|HTTP Error 401|HTTP Error 403', 'manual',
     '권한·비밀값 오류 — 자동 재시도 금지'),
    ('code_or_data', r'Traceback|SyntaxError|ModuleNotFoundError|KeyError|AssertionError', 'manual',
     '코드 또는 입력 데이터 오류 — 원인 수정 필요'),
)

def run(*args, check=True):
    cp = subprocess.run(args, capture_output=True, text=True)
    if check and cp.returncode:
        raise RuntimeError((cp.stderr or cp.stdout or 'command failed').strip()[:500])
    return cp

def api(path):
    return json.loads(run('gh', 'api', path).stdout or '{}')

def api_post(path, *args):
    return run('gh', 'api', '--method', 'POST', path, *args, check=False)

def iso_age_minutes(value, now):
    try:
        return max(0, int((now - dt.datetime.fromisoformat(str(value).replace('Z', '+00:00'))).total_seconds() / 60))
    except (TypeError, ValueError):
        return None

def stale_data_recovery(now, apply):
    """예약 cron 누락으로 data 브랜치가 멈춘 경우 수집을 한 번 깨운다.

    수집 중인 실행이 있거나 최근 실행이 있으면 아무 것도 하지 않는다. 이 함수는
    원장/파일을 직접 만지지 않고 collect.yml workflow_dispatch만 요청하므로, 기존
    누적 데이터와 동시 갱신을 훼손하지 않는다.
    """
    result = {
        'checked': False, 'data_age_minutes': None, 'last_collect_age_minutes': None,
        'active_collect': False, 'dispatch': 'not_needed',
    }
    try:
        commits = api(f'repos/{REPO}/commits?sha=data&per_page=1')
        head = commits[0] if isinstance(commits, list) and commits else None
    except Exception:
        head = None
    try:
        runs = api(f'repos/{REPO}/actions/workflows/collect.yml/runs?per_page=20').get('workflow_runs', [])
    except Exception:
        runs = []
    result['checked'] = True
    data_at = ((head or {}).get('commit') or {}).get('committer', {}).get('date')
    collect_times = [r.get('updated_at') or r.get('created_at') for r in runs if r.get('name') == 'collect-news']
    result['data_age_minutes'] = iso_age_minutes(data_at, now)
    result['last_collect_age_minutes'] = min((x for x in (iso_age_minutes(v, now) for v in collect_times) if x is not None), default=None)
    result['active_collect'] = any(r.get('status') in {'queued', 'in_progress'} for r in runs if r.get('name') == 'collect-news')
    collect_stale = result['last_collect_age_minutes'] is None or result['last_collect_age_minutes'] >= STALE_DATA_MINUTES
    # data 브랜치는 people-links·정치인·공공 데이터 작업도 갱신한다. 따라서 브랜치
    # 커밋이 새롭다는 이유만으로 뉴스 수집 정지를 정상으로 보지 않고, collect 실행
    # 자체의 최신 시각을 기준으로 감시한다.
    if not collect_stale or result['active_collect']:
        return result
    if not apply:
        result['dispatch'] = 'would_dispatch'
        return result
    cp = api_post(f'repos/{REPO}/actions/workflows/collect.yml/dispatches', '-f', 'ref=main')
    result['dispatch'] = 'dispatch_requested' if cp.returncode == 0 else 'dispatch_failed'
    if cp.returncode:
        result['error'] = (cp.stderr or cp.stdout or '')[:300]
    return result

def failed_log(run_id):
    cp = run('gh', 'run', 'view', str(run_id), '-R', REPO, '--log-failed', check=False)
    return (cp.stdout or '') + '\n' + (cp.stderr or '')

def classify(log):
    for kind, pattern, action, reason in RULES:
        if re.search(pattern, log, re.I | re.S):
            return kind, action, reason
    return 'unknown', 'manual', '분류 규칙에 없는 실패 — 자동 재시도 금지'

def report_path():
    base = Path('reports')
    base.mkdir(exist_ok=True)
    return base / 'workflow-recovery.json'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--hours', type=int, default=24)
    ap.add_argument('--apply', action='store_true', help='안전한 scheduled/push 실패만 failed jobs 재시도')
    ap.add_argument('--recover-stale', action='store_true', help='data 브랜치와 collect 실행이 오래되면 수집을 한 번 깨움')
    args = ap.parse_args()
    if not REPO:
        raise SystemExit('REPO is required')
    now = dt.datetime.now(dt.timezone.utc)
    payload = api(f'repos/{REPO}/actions/runs?status=failure&per_page=100')
    items = []
    for item in payload.get('workflow_runs', []):
        created = item.get('created_at', '')
        try:
            age = now - dt.datetime.fromisoformat(created.replace('Z', '+00:00'))
        except ValueError:
            continue
        if age.total_seconds() > args.hours * 3600:
            continue
        workflow = (item.get('name') or '').strip().lower()
        rid, event, attempt = item['id'], item.get('event', ''), int(item.get('run_attempt') or 1)
        kind, action, reason = classify(failed_log(rid))
        allowed = action == 'retry_once' and event in SAFE_EVENTS and attempt == 1 and workflow not in SKIP_WORKFLOWS
        outcome = 'reported'
        if args.apply and allowed:
            cp = run('gh', 'api', '--method', 'POST', f'repos/{REPO}/actions/runs/{rid}/rerun-failed-jobs', check=False)
            outcome = 'rerun_requested' if cp.returncode == 0 else 'retry_request_failed'
        items.append({
            'id': rid, 'workflow': item.get('name'), 'event': event, 'attempt': attempt,
            'created_at': created, 'url': item.get('html_url'), 'classification': kind,
            'action': action, 'auto_retry_eligible': allowed, 'outcome': outcome, 'reason': reason,
        })
    stale = stale_data_recovery(now, args.apply) if args.recover_stale else {'checked': False, 'dispatch': 'disabled'}
    result = {'checked_at': now.isoformat(), 'lookback_hours': args.hours, 'apply': args.apply,
              'total_failed': len(items), 'runs': items, 'stale_recovery': stale}
    report_path().write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    rows = ['# 자동 실행 복구 보고서', '', f'- 검사 범위: 최근 {args.hours}시간 · 실패 {len(items)}건',
            '- 자동 재시도: 동시 갱신·Pages 대기·일시 네트워크 오류만, scheduled/push의 첫 시도에 한 번',
            f"- 수집 정지 감시: data/collect가 {STALE_DATA_MINUTES}분 이상 오래되면 활성 실행이 없을 때 collect.yml을 한 번 기동",
            '- 코드·데이터·권한 오류와 수동 실행은 재시도하지 않고 근거만 남김', '', '|실행|분류|조치|결과|', '|---|---|---|---|']
    for x in items:
        rows.append('|[%s](%s)|%s|%s|%s|' % (x['id'], x['url'], x['classification'], x['reason'], x['outcome']))
    if stale.get('checked'):
        rows += ['', '## 수집 정지 감시', '',
                 f"- data 최신 커밋 경과: {stale.get('data_age_minutes')}분",
                 f"- collect 최신 실행 경과: {stale.get('last_collect_age_minutes')}분",
                 f"- 활성 collect 실행: {'예' if stale.get('active_collect') else '아니오'}",
                 f"- 조치: `{stale.get('dispatch')}`"]
    text = '\n'.join(rows) + '\n'
    print(text)
    if SUMMARY:
        Path(SUMMARY).write_text(text, encoding='utf-8')

if __name__ == '__main__':
    main()
