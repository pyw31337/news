#!/usr/bin/env python3
"""인물 아카이브 수집기: 정치인 DB(politicians 브랜치) + Wikidata(CC0) + 한국어 위키백과 요약(CC BY-SA, 출처 표기)
→ 인물별 평생 타임라인(events)과 관계(edges)를 Cloudflare D1(newsboard-archive)에 저장.
원칙: 공인의 공적 정보만. 주소·연락처 저장 안 함. 미성년자 제외. 의혹(allegation)과 확인된 사실(fact) 구분. 숫자는 원자료 그대로.
나무위키는 이용약관상 자동 수집 금지라 사용하지 않음.
사용: python build.py <politicians 데이터 폴더> [하루 처리 인원]"""
import html, json, os, re, sys, time, hashlib, datetime, urllib.request, urllib.parse
from collections import defaultdict

PD = sys.argv[1]; LIMIT = int(sys.argv[2]) if len(sys.argv) > 2 else 300
API = os.environ.get('ARCHIVE_API', 'https://newsboard-sync.pyw213.workers.dev'); KEY = os.environ.get('ARCHIVE_KEY', '')
UA = 'NewsBoardArchive/1.0 (https://pyw31337.github.io/news/; contact via GitHub pyw31337)'
TODAY = datetime.date.today(); ADULT = TODAY.year - 19
AGE_YEAR = {1:1948,2:1950,3:1954,4:1958,5:1960,6:1963,7:1967,8:1971,9:1973,10:1978,11:1981,12:1985,13:1988,14:1992,15:1996,16:2000,17:2004,18:2008,19:2012,20:2016,21:2020,22:2024}
ASM = ('열린국회정보(국회 공개 API)', 'https://open.assembly.go.kr/')

def get(url, data=None, hdr=None, tries=4):
    for i in range(tries):
        try:
            r = urllib.request.Request(url, data=data, headers={'User-Agent': UA, **(hdr or {})})
            with urllib.request.urlopen(r, timeout=90) as f: return f.read()
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(3 * (i + 1))
def jget(url): return json.loads(get(url))
H = lambda *a: hashlib.sha1('|'.join(map(str, a)).encode()).hexdigest()[:20]
norm = lambda t: re.sub(r'[\W_]+', '', re.sub(r'\[[^\]]*\]', '', t or ''))[:36]

# 1) 정치인 DB
idx = json.load(open(f'{PD}/index.json'))['people']
def load(pid):
    try: return json.load(open(f'{PD}/people/{pid}.json'))
    except Exception: return None
def score(p): return (p.get('news') or 0) * 3 + (60 if p.get('current') else 0) + len(p.get('ages') or []) * 6 + (p.get('inc') or 0) * 4 + (p.get('lead') or 0) // 20
idx.sort(key=score, reverse=True)

# 2) Wikidata 일괄 매칭(동명이인: 이름+생년월일 일치 우선, 없으면 이름+출생연도가 유일할 때만)
q = 'SELECT DISTINCT ?p ?name ?b WHERE { ?p wdt:P27 wd:Q884; wdt:P106 wd:Q82955; wdt:P569 ?b. ?p rdfs:label ?name FILTER(lang(?name)="ko") }'
rows = jget('https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': q, 'format': 'json'}))['results']['bindings']
wd = defaultdict(list)
for r in rows: wd[r['name']['value']].append((r['p']['value'].rsplit('/', 1)[1], r['b']['value'][:10]))
qid_of, aid_of = {}, {}
for p in idx:
    c = wd.get(p['name'], []); b = p.get('birth') or ''
    hit = [x for x in c if b and x[1] == b] or ([x for x in c if b and x[1][:4] == b[:4]] if len([x for x in c if b and x[1][:4] == b[:4]]) == 1 else [])
    if len(hit) >= 1 and len({h[0] for h in hit}) == 1: qid_of[p['id']] = hit[0][0]; aid_of[hit[0][0]] = p['id']
print('wikidata 매칭', len(qid_of), '/', len(idx))

def entities(ids, props='claims|sitelinks|labels'):
    out = {}
    ids = list(dict.fromkeys(ids))
    for i in range(0, len(ids), 50):
        d = jget('https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode({'action': 'wbgetentities', 'ids': '|'.join(ids[i:i+50]), 'props': props, 'languages': 'ko|en', 'format': 'json', 'sitefilter': 'kowiki'}))
        out.update(d.get('entities', {})); time.sleep(0.3)
    return out
ENT = entities(list(qid_of.values()))
def claims(e, p): return e.get('claims', {}).get(p, [])
def val(c):
    v = c.get('mainsnak', {}).get('datavalue', {}).get('value')
    return v.get('id') if isinstance(v, dict) and 'id' in v else v
def qual(c, p):
    for q in c.get('qualifiers', {}).get(p, []):
        v = q.get('datavalue', {}).get('value')
        if isinstance(v, dict) and 'time' in v: return tdate(v)
    return None
def tdate(v):
    t = v['time'].lstrip('+'); pr = v.get('precision', 11)
    return t[:10] if pr >= 11 else t[:7] if pr == 10 else t[:4] if pr >= 9 else None
REL = {'P22': ('parent', '아버지'), 'P25': ('parent', '어머니'), 'P26': ('spouse', '배우자'), 'P40': ('child', '자녀'), 'P3373': ('sibling', '형제자매'), 'P1038': ('relative', '친척')}
refs = set()
for e in ENT.values():
    for p in list(REL) + ['P69', 'P19', 'P39', 'P102', 'P108', 'P1399', 'P166', 'P463']:
        for c in claims(e, p):
            v = val(c)
            if isinstance(v, str) and v.startswith('Q'): refs.add(v)
LAB = entities([r for r in refs if r not in ENT], 'labels|claims')
LAB.update(ENT)
def lab(q):
    l = LAB.get(q, {}).get('labels', {})
    return (l.get('ko') or l.get('en') or {}).get('value')
def birthyear(q):
    for c in claims(LAB.get(q, {}), 'P569'):
        v = val(c)
        if isinstance(v, dict) and 'time' in v: return int(v['time'].lstrip('+')[:4])
    return None
def dead(q): return bool(claims(LAB.get(q, {}), 'P570'))
WDS = lambda q: ('위키데이터(CC0)', f'https://www.wikidata.org/wiki/{q}')

# 3) 전역 관계: 가족(위키데이터), 같은 학교 동문(출생 ±3년 = 동창 가능), 같은 출생지(소수 지역), 지역구 전·후임
edges, nodes = {}, {}
def edge(a, b, typ, label, src, conf=1.0):
    if a == b: return
    k = (a, b, typ) if typ in ('parent', 'child', 'predecessor') else tuple(sorted([a, b])) + (typ,)
    edges.setdefault(k, {'a': k[0], 'b': k[1], 'typ': typ, 'label': label, 'conf': conf, 'src': src[0], 'url': src[1]})
pname = {p['id']: p for p in idx}
for aid, qid in qid_of.items():
    e = ENT.get(qid, {})
    for P, (typ, label) in REL.items():
        for c in claims(e, P):
            r = val(c)
            if not isinstance(r, str): continue
            if r in aid_of: other = aid_of[r]
            else:
                by = birthyear(r)
                if not dead(r) and (by is None or by > ADULT): continue   # 미성년·생년 불명 생존 인물 제외
                if not lab(r): continue
                other = 'wd:' + r; nodes[other] = {'id': other, 'name': lab(r), 'note': '위키데이터 등재 인물', 'qid': r}
            if typ == 'parent': edge(other, aid, 'parent', label, WDS(qid))
            elif typ == 'child': edge(aid, other, 'parent', '부모-자녀', WDS(qid))
            else: edge(aid, other, typ, label, WDS(qid))
school, born = defaultdict(list), defaultdict(list)
for aid, qid in qid_of.items():
    e = ENT.get(qid, {}); by = int((pname[aid].get('birth') or '0000')[:4] or 0)
    for c in claims(e, 'P69'):
        if val(c): school[val(c)].append((aid, by))
    for c in claims(e, 'P19'):
        if val(c): born[val(c)].append(aid)
for s, L in school.items():
    for i in range(len(L)):
        for j in range(i + 1, len(L)):
            if L[i][1] and L[j][1] and abs(L[i][1] - L[j][1]) <= 3:
                edge(L[i][0], L[j][0], 'schoolmate', f'{lab(s) or "같은 학교"} 동문(나이 차 {abs(L[i][1]-L[j][1])}년)', WDS(qid_of[L[i][0]]), 0.7)
for s, L in born.items():
    if 2 <= len(L) <= 12:
        for i in range(len(L)):
            for j in range(i + 1, len(L)): edge(L[i], L[j], 'hometown', f'같은 출생지({lab(s) or ""})', WDS(qid_of[L[i]]), 0.8)
dist = defaultdict(dict)
FULL = {}
for p in idx:
    d = load(p['id'])
    if not d: continue
    FULL[p['id']] = d
    for t in d.get('terms') or []:
        if t.get('kind') == '지역구' and t.get('district'): dist[t['district']][t['age']] = p['id']
for dname, by in dist.items():
    ages = sorted(by)
    for a, b in zip(ages, ages[1:]):
        if b == a + 1 and by[a] != by[b]: edge(by[a], by[b], 'predecessor', f'{dname} 지역구 전임→후임({a}대→{b}대)', ASM, 1.0)
for k, e in edges.items():
    for x in (e['a'], e['b']):
        if x in pname and x not in nodes: nodes[x] = {'id': x, 'name': pname[x]['name'], 'note': pname[x].get('party') or ''}
deg = defaultdict(int)
for e in edges.values(): deg[e['a']] += 1; deg[e['b']] += 1

# 4) 처리 대상: 우선순위 순, 미처리 또는 7일 지난 인물
try: done = {r['id']: r['updated'] for r in jget(API + '/archive/done')}
except Exception: done = {}
cut = (time.time() - (0 if os.environ.get('ARCHIVE_FORCE') else 7 * 86400)) * 1000
todo = [p for p in idx if done.get(p['id'], 0) < cut][:LIMIT]
print('이번 처리', len(todo))

STAGE = {'birth': '출생·성장', 'edu': '학업', 'career': '사회 경력', 'election': '정치 활동', 'office': '정치 활동', 'party': '정치 활동', 'award': '사회 경력', 'family': '출생·성장', 'assets': '재산', 'allegation': '논란·사법', 'ruling': '논란·사법', 'news': '언론 보도'}
def wiki_summary(qid):
    t = ENT.get(qid, {}).get('sitelinks', {}).get('kowiki', {}).get('title')
    if not t: return None
    try:
        s = jget('https://ko.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(t.replace(' ', '_')))
        x = (s.get('extract') or '').strip()
        return {'text': x[:420], 'title': t, 'url': f'https://ko.wikipedia.org/wiki/{urllib.parse.quote(t.replace(" ", "_"))}', 'license': 'CC BY-SA 4.0 · 한국어 위키백과'} if x else None
    except Exception: return None

P_OUT, E_OUT = [], []
for p in todo:
    aid = p['id']; d = FULL.get(aid) or {}; qid = qid_of.get(aid); e = ENT.get(qid, {}) if qid else {}
    ev = {}
    def add(dt, typ, title, src, status='fact', conf=1.0, extra=None):
        if not title: return
        title = html.unescape(title)
        k = H(aid, (dt or '')[:7], norm(title))
        if k in ev: return
        ev[k] = {'h': k, 'pid': aid, 'd': dt, 'typ': typ, 'stage': STAGE.get(typ, '기타'), 'title': title[:200], 'status': status, 'conf': conf, 'src': src[0], 'url': src[1], 'extra': extra}
    if d.get('birth'): add(d['birth'], 'birth', '출생', ASM)
    for t in d.get('terms') or []:
        y = AGE_YEAR.get(t.get('age'))
        add(str(y) if y else None, 'election', f"제{t.get('age')}대 국회의원 당선 · {t.get('party') or ''} · {t.get('district') or ''}{' (' + t['kind'] + ')' if t.get('kind') else ''}", ASM)
    for s in d.get('party_switches') or []:
        y = AGE_YEAR.get((s.get('between') or [0, 0])[1])
        add(str(y) if y else None, 'party', f"{'당명 변경' if s.get('kind') == 'rename' else '당적 변경'}: {s.get('from')} → {s.get('to')}", ASM, conf=0.9)
    for h in d.get('history') or []:
        m = re.match(r'\s*(\d{4})(?:\.(\d{1,2}))?', h)
        if not m: continue
        dt = m.group(1) + ('-%02d' % int(m.group(2)) if m.group(2) else '')
        txt = html.unescape(html.unescape(re.sub(r'^[\d.\s~-]+', '', h))).strip()
        typ = 'edu' if re.search(r'(대학교|고등학교|졸업|대학원|학위|박사|석사)', txt) and not re.search(r'교수|강사|총장', txt) else 'office' if re.search(r'국회의원|장관|시장|도지사|의장|위원장|대표|최고위원|비서관|대변인', txt) else 'career'
        add(dt, typ, txt, ASM, conf=0.95)
    for c in claims(e, 'P69'):
        add(qual(c, 'P582') or qual(c, 'P580'), 'edu', f"{lab(val(c)) or '학교'} 수학/졸업", WDS(qid), conf=0.85)
    for c in claims(e, 'P39'):
        l = lab(val(c)) or ''
        if '국회의원' in l or not l: continue   # 국회 기록이 더 정확
        st = qual(c, 'P580'); en = qual(c, 'P582')
        add(st, 'office', f"{l} 취임" + (f" (~{en})" if en else ''), WDS(qid), conf=0.85)
    for c in claims(e, 'P108'):
        if lab(val(c)): add(qual(c, 'P580'), 'career', f"{lab(val(c))} 근무", WDS(qid), conf=0.8)
    for c in claims(e, 'P166'):
        if lab(val(c)): add(qual(c, 'P585'), 'award', f"{lab(val(c))} 수상", WDS(qid), conf=0.85)
    for c in claims(e, 'P1399'):
        if lab(val(c)): add(qual(c, 'P585'), 'ruling', f"유죄 확정 기록: {lab(val(c))}", WDS(qid), 'confirmed', 0.9)
    for c in claims(e, 'P26'):
        r = val(c); dt = qual(c, 'P580')
        if dt and isinstance(r, str) and lab(r) and (r in aid_of or dead(r) or (birthyear(r) or 9999) <= ADULT): add(dt, 'family', f"{lab(r)}와(과) 결혼", WDS(qid), conf=0.85)
    for r in (d.get('assets') or {}).get('records') or []:
        if r.get('total') is not None: add(r.get('date'), 'assets', f"{r.get('kind') or '재산 신고'}: 총 {r['total']/1e5:.1f}억 원 (전년 대비 {'+' if (r.get('change') or 0) >= 0 else ''}{(r.get('change') or 0)/1e5:.1f}억)", ('국회공보 ' + (r.get('issue') or ''), 'https://open.assembly.go.kr/'), conf=1.0)
    for it in (d.get('incidents') or {}).get('items') or []:
        add(it.get('date'), 'allegation', it.get('title'), (it.get('press') or '언론 보도', it.get('url')), 'allegation', 0.6, {'stage': it.get('stage')})
    seen = set()
    for n in sorted(d.get('news') or [], key=lambda x: x.get('date') or '', reverse=True):
        k = norm(n.get('title'))[:18]
        if k in seen: continue
        seen.add(k)
        if len(seen) > 40: break
        add(n.get('date'), 'news', n.get('title'), (n.get('press') or '언론 보도', n.get('url')), 'report', 0.7)
    summ = wiki_summary(qid) if qid else None
    if summ: time.sleep(0.2)
    data = {'photo': d.get('photo_local') or p.get('photo_local'), 'hanja': d.get('hanja'), 'district': d.get('district'), 'ages': d.get('ages'), 'current': d.get('current'),
            'summary': summ['text'][:140] if summ else None, 'wiki': summ, 'sources': [ASM[0]] + (['위키데이터(CC0)'] if qid else []) + (['한국어 위키백과(CC BY-SA 4.0)'] if summ else []),
            'qid': qid}
    P_OUT.append({'id': aid, 'name': p['name'], 'kind': 'politician', 'party': p.get('party'), 'birth': p.get('birth'), 'qid': qid, 'score': score(p), 'ev': len(ev), 'ed': deg.get(aid, 0), 'data': data})
    E_OUT.extend(ev.values())
print('인물', len(P_OUT), '사건', len(E_OUT), '관계', len(edges), '외부 인물', len([n for n in nodes if n.startswith('wd:')]))

def post(body):
    if not KEY: print('ARCHIVE_KEY 없음: 업로드 생략'); return
    r = get(API + '/archive/ingest', json.dumps(body, ensure_ascii=False).encode(), {'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'})
    return json.loads(r)
for i in range(0, len(P_OUT), 25):
    ch = P_OUT[i:i+25]; ids = {x['id'] for x in ch}
    post({'persons': ch, 'replace': list(ids), 'events': [x for x in E_OUT if x['pid'] in ids]})
EL, NL = list(edges.values()), list(nodes.values())
for i in range(0, max(len(EL), len(NL)), 400): post({'edges': EL[i:i+400], 'nodes': NL[i:i+400]})
post({'run': {'persons': len(P_OUT), 'events': len(E_OUT), 'edges': len(EL), 'note': f'wikidata {len(qid_of)}'}})
print('완료')
