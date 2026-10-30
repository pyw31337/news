"""첫 화면용 가벼운 today_lite.json 생성: python scripts/split_today.py _site
인물별 과거 기사 타임라인(entities[].timeline)이 today.json 용량의 약 80%라서, 최신 LITE_N건만 남기고
전체 건수는 tn 에 기록. 원본 today.json 은 그대로 두며, 앱이 화면을 그린 뒤 뒤에서 받아 합침(assets/app.js load)."""
import json, os, sys
SITE = sys.argv[1] if len(sys.argv) > 1 else '_site'
LITE_N = 12
P = os.path.join(SITE, 'data', 'today.json')
D = json.load(open(P, encoding='utf-8'))
for e in D.get('entities', []):
    tl = e.get('timeline') or []
    e['tn'] = len(tl)
    e['timeline'] = tl[:LITE_N]  # 최신순 정렬이라 앞쪽이 최근 기사
D['lite'] = 1
out = os.path.join(SITE, 'data', 'today_lite.json')
json.dump(D, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('today_lite: %dKB → %dKB' % (os.path.getsize(P) // 1024, os.path.getsize(out) // 1024))

# ---------- v2 첫 화면 전용 초경량 데이터(today_v2.json): TOP10·흐름·브리핑·검색어·시세만 ----------
# 원본(today.json) 대비 수십 분의 1 크기. 어제 아카이브와 비교해 '새로 오른 이슈'·'이어지는 이슈'를 표시
import datetime as _dt, glob as _g
def _arch():
    fs = sorted(_g.glob(os.path.join(SITE, 'data', 'archive', '20*.json')))
    fs = [f for f in fs if os.path.basename(f)[:10] < (D.get('date') or '9')]
    if not fs: return {}
    try: return json.load(open(fs[-1], encoding='utf-8'))
    except Exception: return {}
Y = _arch(); ytit = [i.get('title', '') for i in Y.get('issues', [])]
def _bi(t):
    import re as _re; t = _re.sub(r'[^가-힣A-Za-z0-9]', '', t or ''); return {t[k:k + 2] for k in range(len(t) - 1)}
def _seen(t):
    b = _bi(t)
    return any(len(b & _bi(y)) / max(1, min(len(b), len(_bi(y)))) >= .45 for y in ytit)
V = dict(date=D.get('date'), updated=D.get('updated'), yday=Y.get('date'), issues=[], trends=[], market=[])
for i in D.get('issues', []):
    fl = sorted({f.get('date') for f in i.get('flow') or [] if f.get('date')})
    last = sorted(i.get('flow') or [], key=lambda f: f.get('date', ''))[-1:] if i.get('flow') else []
    V['issues'].append(dict(id=i['id'], rank=i.get('rank'), title=i['title'], cat=i.get('category'), img=i.get('image') or '',
        summary=(i.get('summary') or [])[:3], easy=(i.get('easy') or [])[:3], gloss=i.get('gloss') or {}, presses=i.get('presses'), mentions=i.get('mentions'),
        comments=(i.get('opinion') or {}).get('total'), score=round(i.get('score') or 0), days=len(fl), first=fl[0] if fl else None,
        today=(last[0]['items'][0]['title'] if last and last[0].get('items') else ''), new=not _seen(i['title']),
        ents=(i.get('entities') or [])[:4], kw=(i.get('keywords') or [])[:4]))
for t in (D.get('trends') or [])[:10]:
    n = (t.get('news') or t.get('today') or [{}])[0]
    V['trends'].append(dict(k=t.get('keyword'), why=n.get('title', ''), n=t.get('traffic_n')))
for m in (D.get('market') or [])[:8]:
    V['market'].append({k: m.get(k) for k in ('name', 'price', 'rate', 'dir', 'kind')})
vo = os.path.join(SITE, 'data', 'today_v2.json')
json.dump(V, open(vo, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('today_v2: %dKB' % (os.path.getsize(vo) // 1024))
