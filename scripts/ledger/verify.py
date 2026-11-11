"""주간 무결성 점검: ledger 목록(manifest)과 R2 실제 보관분을 맞춰 봄. 사용: python scripts/ledger/verify.py <ledger폴더>
- 목록의 모든 성공 줄에 sha256·크기가 있는지, 대기열(pending/)에 48시간 넘은 파일이 없는지
- 새 Worker(/ledger/list)가 있으면 R2 ledger/ 아래 파일마다 크기·sha256이 목록과 같은지(빠짐·다름 = 실패)
- 예전 경로(branches/)로 올라간 것은 개수만 셈(개별 확인 불가)
결과는 state/verify.jsonl에 한 줄 추가, 문제가 있으면 종료 코드 1(작업 실패로 표시)."""
import glob, json, os, sys, time
from datetime import datetime, timezone, timedelta
sys.path.insert(0, os.path.dirname(__file__))
import r2

KST = timezone(timedelta(hours=9))
LED = sys.argv[1]
now = datetime.now(KST)
want, legacy, bad_lines, lines = {}, 0, 0, 0
for f in sorted(set(glob.glob(os.path.join(LED, 'manifest', '**', '*.jsonl'), recursive=True))):
    for ln in open(f):
        try:
            x = json.loads(ln)
        except Exception:
            bad_lines += 1; continue
        lines += 1
        if not x.get('ok') or not x.get('r2'):
            continue
        if not x.get('sha256') or not x.get('bytes'):
            if 'retry' not in x:
                bad_lines += 1
            continue
        if str(x['r2']).startswith('ledger/'):
            want[x['r2'][7:]] = (x['bytes'], x['sha256'])
        else:
            legacy += 1
old_pending = [p for p in glob.glob(os.path.join(LED, 'pending', '*', '*')) if time.time() - os.path.getmtime(p) > 48 * 3600]
pending = len(glob.glob(os.path.join(LED, 'pending', '*', '*')))
missing, mismatch, checked = [], [], None
got = r2.listing('')
if got is not None:
    have = {k: (s, h) for k, s, h in got}
    checked = len(have)
    for k, (s, h) in want.items():
        if k not in have:
            missing.append(k)
        elif have[k][0] != s or (have[k][1] and have[k][1] != h):
            mismatch.append(k)
u = r2.usage() or {}
res = {'at': now.isoformat(timespec='seconds'), 'manifest_lines': lines, 'bad_lines': bad_lines, 'ledger_objects_expected': len(want),
       'ledger_objects_in_r2': checked, 'missing': missing[:20], 'mismatch': mismatch[:20], 'legacy_branches_objects': legacy,
       'pending': pending, 'pending_over_48h': len(old_pending), 'r2_total_bytes': (u.get('r2') or {}).get('bytes'),
       'r2_total_objects': (u.get('r2') or {}).get('objects'), 'mode': 'per-object' if got is not None else 'manifest-only(새 Worker 배포 전)'}
res['ok'] = not (missing or mismatch or bad_lines or old_pending)
os.makedirs(os.path.join(LED, 'state'), exist_ok=True)
open(os.path.join(LED, 'state', 'verify.jsonl'), 'a').write(json.dumps(res, ensure_ascii=False) + '\n')
print(json.dumps(res, ensure_ascii=False, indent=1))
sys.exit(0 if res['ok'] else 1)
