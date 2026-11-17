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
GENERIC = {'ai', '뉴스', '기사', '논란', '관련', '오늘', '현재', '정부', '한국', '사람', '이슈', '사건', '보도'}
def _terms(i):
    import re
    raw = list(i.get('keywords') or []) + list(i.get('entities') or []) + re.split(r'[\s·“”‘’\'"…,:!?()[\]{}]+', i.get('title', ''))
    return {str(x).strip().lower() for x in raw if len(str(x).strip()) >= 2 and str(x).strip().lower() not in GENERIC}
def _score(title, terms):
    t = (title or '').lower()
    return sum((2 if len(x) >= 3 else 1) for x in terms if x in t)
def _stage(title):
    import re
    t = title or ''
    if re.search(r'자수|인정|실토|시인', t): return '인정·자수'
    if re.search(r'변호사|법적 대응|말도 안|부인|아니다', t): return '부인·법적 대응'
    if re.search(r'의혹|만점|고득점|99\.38', t): return '만점·의혹'
    if re.search(r'경찰|출석|수사|피의자', t): return '수사·출석'
    if re.search(r'합격|수석|발표', t): return '합격 발표'
    return '후속 보도'
def _archive_flow(i):
    """현재 flow가 놓친 초기·중간 국면을 날짜별 archive에서 복원한다."""
    import glob as _glob
    terms = _terms(i); groups = {}
    for g in i.get('flow') or []:
        date = g.get('date')
        for it in g.get('items') or []:
            sc = _score(it.get('title'), terms)
            if date and sc:
                e = dict(date=date, title=it.get('title'), body=it.get('body',''), url=it.get('url') or it.get('ourl'), img=it.get('img'), press=it.get('press'), stage=_stage(it.get('title')),
                         score=sc)
                if not groups.get(date) or e['score'] > groups[date]['score']: groups[date] = e
    for ap in sorted(_glob.glob(os.path.join(SITE, 'data', 'archive', '20*.json'))):
        date = os.path.basename(ap)[:10]
        if date >= (D.get('date') or '9999-99-99'): continue
        try: aj = json.load(open(ap, encoding='utf-8'))
        except Exception: continue
        for old in aj.get('issues') or []:
            ot = _terms(old); overlap = len(terms & ot)
            if overlap < 2: continue
            sources = old.get('sources') or []
            if not sources: continue
            best = max(sources, key=lambda s: _score(s.get('title'), terms))
            sc = _score(best.get('title'), terms) + overlap
            e = dict(date=date, title=best.get('title') or old.get('title'), body=(old.get('summary') or [''])[0], url=best.get('url') or best.get('ourl'), img=best.get('img'), press=best.get('press'), stage=_stage(best.get('title') or old.get('title')), score=sc)
            if not groups.get(date) or e['score'] > groups[date]['score']: groups[date] = e
    return [groups[k] for k in sorted(groups)]
for i in D.get('issues', []):
    fl = sorted({f.get('date') for f in i.get('flow') or [] if f.get('date')})
    last = sorted(i.get('flow') or [], key=lambda f: f.get('date', ''))[-1:] if i.get('flow') else []
    V['issues'].append(dict(id=i['id'], rank=i.get('rank'), title=i['title'], cat=i.get('category'), img=i.get('image') or '',
        summary=(i.get('summary') or [])[:3], easy=(i.get('easy') or [])[:3], gloss=i.get('gloss') or {}, presses=i.get('presses'), mentions=i.get('mentions'),
        comments=(i.get('opinion') or {}).get('total'), score=round(i.get('score') or 0), days=len(fl), first=fl[0] if fl else None,
        today=(last[0]['items'][0]['title'] if last and last[0].get('items') else ''), new=not _seen(i['title']),
        ents=(i.get('entities') or [])[:4], kw=(i.get('keywords') or [])[:4]))
# 2차 시안(보는 뉴스): 사진 모음·등장인물 얼굴·댓글 여론·이슈별 OX를 함께
EV = {e['name']: e for e in D.get('entities', [])}
def face(n):
    e = EV.get(n) or {}; u = (e.get('visual') or {}).get('url') or (e.get('wiki') or {}).get('thumb') or ''
    return dict(n=n, img=u, t=e.get('type')) if u else None
try: QZ = json.load(open(os.path.join(SITE, 'data', 'quiz.json'), encoding='utf-8')).get('questions', [])
except Exception: QZ = []
for v, i in zip(V['issues'], D.get('issues', [])):
    v['imgs'] = list(dict.fromkeys([x.get('img') for x in (i.get('gallery') or []) if x.get('img')] + ([i['image']] if i.get('image') else [])))[:4]
    v['faces'] = [f for f in (face(n) for n in (i.get('entities') or [])[:6]) if f][:4]
    flow = _archive_flow(i)
    if flow:
        v['flow'] = flow[-8:]
        v['flow_gap'] = '최초 합격 발표 원문이 현재 누적 데이터에서 확인되지 않음' if len(flow) and flow[0].get('stage') != '합격 발표' else ''
    op = i.get('opinion') or {}; aop = (i.get('ai') or {}).get('opinion') or {}
    if op.get('total'):
        v['op'] = dict(total=op.get('total'), like=op.get('like'), dislike=op.get('dislike'), gender=op.get('gender'), ages=op.get('ages'),
                       words=[w[0] for w in (op.get('words') or [])[:6]], top=((op.get('top') or [{}])[0].get('text') or '')[:90],
                       stances=[dict(l=x.get('label'), s=x.get('share')) for x in (aop.get('stances') or [])[:3]], sum=aop.get('summary', ''))
    q = next((x for x in QZ if x.get('ref') == i['id'] and x.get('kind') == 'ox' and (x.get('scope') or 'kr') == 'kr'), None)
    if q: v['q'] = dict(t=q['q']['ko'], a=q['answer'], e=(q.get('exp') or {}).get('ko', ''))
V['people'] = [dict(n=e['name'], img=(e.get('visual') or {}).get('url') or (e.get('wiki') or {}).get('thumb'), d=((e.get('wiki') or {}).get('desc') or '')[:24], c=len(e.get('issues') or []))
               for e in D.get('entities', []) if e.get('type') == 'person' and ((e.get('visual') or {}).get('url') or (e.get('wiki') or {}).get('thumb'))][:12]
st = D.get('stats') or {}
V['nums'] = dict(arts=(st.get('naver') or 0) + (st.get('google') or 0), presses=st.get('presses'), comments=sum((i.get('opinion') or {}).get('total') or 0 for i in D.get('issues', [])))
for t in (D.get('trends') or [])[:10]:
    n = (t.get('news') or t.get('today') or [{}])[0]
    V['trends'].append(dict(k=t.get('keyword'), why=n.get('title', ''), n=t.get('traffic_n')))
for m in (D.get('market') or [])[:8]:
    V['market'].append({k: m.get(k) for k in ('name', 'price', 'rate', 'dir', 'kind')})
vo = os.path.join(SITE, 'data', 'today_v2.json')
json.dump(V, open(vo, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('today_v2: %dKB' % (os.path.getsize(vo) // 1024))
