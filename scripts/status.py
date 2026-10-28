#!/usr/bin/env python3
"""관리자 대시보드용 공개 상태(data/status.json) + 실행 이력(data/runlog.json) 생성.
공개 데이터만 담는다: 토큰·키·환경변수·사내 경로는 절대 넣지 않는다."""
import json, os, glob, datetime as dt
ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST)
def load(p, d=None):
    try: return json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
    except Exception: return d
D = load('today.json', {}); G = load('global.json', {}); OV = load('overlay/latest.json', {})
diag = {k: load('diag_%s.json' % k, {}) for k in ('collect', 'enrich', 'global', 'db', 'briefs', 'official')}
def size(p):
    p = os.path.join(ROOT, p)
    if os.path.isfile(p): return os.path.getsize(p)
    return sum(os.path.getsize(f) for f in glob.glob(p + '/**/*', recursive=True) if os.path.isfile(f))
src = {}
for k, d in diag.items():
    for h, c in (d.get('ok') or {}).items(): src.setdefault(h, {'ok': 0, 'fail': 0, 'steps': []}); src[h]['ok'] += c; src[h]['steps'].append(k)
    for h, c in (d.get('fail') or {}).items(): src.setdefault(h, {'ok': 0, 'fail': 0, 'steps': []}); src[h]['fail'] += c; src[h]['steps'].append(k)
for v in src.values(): v['steps'] = sorted(set(v['steps']))
errors = sorted([dict(e, step=k) for k, d in diag.items() for e in (d.get('errors') or [])], key=lambda e: e.get('t', ''))[-60:]
arch = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(ROOT, 'archive', '20*.json')))
llm = D.get('llm') or {}
llm_pub = {k: v for k, v in llm.items() if k != 'errors' and (k == 'overlay' or not isinstance(v, (dict, list))) and 'key' not in k.lower() and 'token' not in k.lower()}
llm_pub['errors'] = [str(x)[:120] for x in (llm.get('errors') or [])][:5]
eh = load('entity_history.json', {})
run = dict(at=NOW.isoformat(), stats=D.get('stats'), issues=len(D.get('issues', [])), entities=len(D.get('entities', [])), trends=len(D.get('trends', [])),
           global_articles=(G.get('stats') or {}).get('articles'), ok=sum(v['ok'] for v in src.values()), fail=sum(v['fail'] for v in src.values()),
           ai=sum(1 for i in D.get('issues', []) if i.get('ai')), event=os.environ.get('GITHUB_EVENT_NAME', 'local'))
RL = load('runlog.json', []); RL.append(run); RL = RL[-1500:]
json.dump(RL, open(os.path.join(ROOT, 'runlog.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
daily = {}
for r in RL:
    d = r['at'][:10]; x = daily.setdefault(d, dict(date=d, runs=0, articles=0, ok=0, fail=0))
    x['runs'] += 1; x['articles'] += sum((r.get('stats') or {}).get(k, 0) or 0 for k in ('naver', 'google')); x['ok'] += r.get('ok', 0); x['fail'] += r.get('fail', 0)
st = dict(updated=NOW.isoformat(), data_updated=D.get('updated'), stats=D.get('stats'), llm=llm_pub,
          counts=dict(issues=len(D.get('issues', [])), entities=len(D.get('entities', [])), entity_history=len(eh) if isinstance(eh, dict) else 0,
                      archive_days=len(arch), archive_first=arch[0] if arch else None, archive_last=arch[-1] if arch else None,
                      global_issues=len(G.get('issues', [])), global_trends=len(G.get('trends', []))),
          sizes={p: size(p) for p in ('today.json', 'global.json', 'archive', 'index', 'entity_history.json', 'llm_cache.json', 'wiki_cache.json', 'tr_cache.json', 'overlay', 'runlog.json', 'db', 'db/articles', 'db/entities', '../media')},
          macmini=dict(updated=OV.get('updated'), issues=len(OV.get('issues', [])), ai=sum(1 for i in OV.get('issues', []) if i.get('ai')), flow=sum(1 for i in OV.get('issues', []) if i.get('flow')),
                       trends=len(OV.get('trends') or {}), words=len(OV.get('words') or []), age_h=round((NOW - dt.datetime.fromisoformat(OV['updated'])).total_seconds() / 3600, 1) if OV.get('updated') else None),
          global_translate=G.get('translate'), db=diag['db'].get('report'), sources=src, errors=errors, daily=sorted(daily.values(), key=lambda x: x['date'])[-60:], runs=RL[-48:])
json.dump(st, open(os.path.join(ROOT, 'status.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('status', st['counts'], 'sources', len(src), 'errors', len(errors))
