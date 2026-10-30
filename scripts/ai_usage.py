"""AI 분석 장부: 어디서(GitHub Actions·맥미니) 어떤 엔진(Gemini·Apple 온디바이스·Ollama)이 하루에 몇 번 분석했는지 누적.
수집기마다 파일을 따로 써서(data/db/ai_usage/<실행처>-<엔진>.json) 두 기계가 동시에 저장해도 서로 덮어쓰지 않는다.
calls=새로 분석한 횟수, reused=이전 분석을 다시 쓴 횟수, fail=실패, kinds=작업별(이슈 요약·깊게 보기·댓글 여론…)."""
import os, json, atexit, datetime as dt
KST = dt.timezone(dt.timedelta(hours=9))
_B = {}
def _engine(model, backend=None):
    backend = backend or os.environ.get('LLM_BACKEND'); m = (model or os.environ.get('LLM_MODEL') or 'gemini').lower()
    if backend == 'apple' or 'apple' in m: return 'apple'
    if any(h in (os.environ.get('LLM_ENDPOINT') or '') for h in ('127.0.0.1', 'localhost', 'ollama')) or ':' in m: return 'ollama'
    return 'gemini' if 'gemini' in m else (m.split('-')[0] or 'cloud')
def note(task, kind, model=None, backend=None, n=1, ok=True, reused=False):
    """task: enrich·voice·fun / kind: 키 앞부분(issue·a-deep·a-op …)"""
    where = 'actions' if os.environ.get('GITHUB_ACTIONS') else 'macmini'
    k = f'{where}-{_engine(model, backend)}'
    b = _B.setdefault(k, dict(calls=0, reused=0, fail=0, kinds={}, models={}))
    if reused: b['reused'] += n; return
    if not ok: b['fail'] += n; return
    b['calls'] += n; kk = f'{task}:{kind}'
    b['kinds'][kk] = b['kinds'].get(kk, 0) + n
    if model: b['models'][model] = b['models'].get(model, 0) + n
def _flush(root):
    if not _B: return
    day = dt.datetime.now(KST).strftime('%Y-%m-%d'); d = os.path.join(root, 'db', 'ai_usage'); os.makedirs(d, exist_ok=True)
    for k, b in _B.items():
        p = os.path.join(d, k + '.json')
        try: H = json.load(open(p))
        except Exception: H = {}
        t = H.setdefault(day, dict(calls=0, reused=0, fail=0, runs=0, kinds={}, models={}))
        for f in ('calls', 'reused', 'fail'): t[f] = t.get(f, 0) + b[f]
        t['runs'] = t.get('runs', 0) + 1
        for f in ('kinds', 'models'):
            for x, v in b[f].items(): t[f][x] = t[f].get(x, 0) + v
        json.dump({x: H[x] for x in sorted(H)[-800:]}, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    _B.clear()
def setup(root): atexit.register(_flush, root)
