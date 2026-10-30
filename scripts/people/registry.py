#!/usr/bin/env python3
"""인물 명부 만들기: python scripts/people/registry.py <data 폴더> [politicians 폴더] [history 폴더]
출처: 국회의원(역대 전체) + 위키데이터(한국 국적 인물 전체, 주요 국가의 이름난 인물) + 연표 대상 + 뉴스에서 새로 찾은 인물.
결과: <data>/db/people/registry.json.gz = [{id, n(이름), al(다른 이름), d(설명), k(분야), sl(유명도), b(출생 연도), src}]
일주일에 한 번 다시 만듦(people.yml). 위키데이터가 막혀도 지난 명부를 지우지 않고 합쳐서 유지."""
import os, re, sys, json, gzip, time, glob, urllib.request, urllib.parse
ROOT = sys.argv[1] if len(sys.argv) > 1 else 'data'
POL = sys.argv[2] if len(sys.argv) > 2 else 'pol_db'
HIST = sys.argv[3] if len(sys.argv) > 3 else 'hist'
PD = os.path.join(ROOT, 'db', 'people'); os.makedirs(PD, exist_ok=True); RP = os.path.join(PD, 'registry.json.gz')
SP = 'https://query.wikidata.org/sparql'; UA = {'User-Agent': 'NewsBoard/1.0 (https://github.com/pyw31337/news)', 'Accept': 'application/sparql-results+json'}
def sparql(q):
    for i in range(4):
        try: return json.loads(urllib.request.urlopen(urllib.request.Request(SP + '?' + urllib.parse.urlencode({'query': q}), headers=UA), timeout=150).read())['results']['bindings']
        except Exception as e: print('wikidata 재시도', i, str(e)[:80]); time.sleep(65 if '429' in str(e) else 15 + 15 * i)
    return None
try: OLD = {p['id']: p for p in json.load(gzip.open(RP, 'rt', encoding='utf-8'))}
except Exception: OLD = {}
R = {}
def add(pid, n, **kw):
    n = re.sub(r'\s*\(.*?\)\s*$', '', (n or '')).strip()
    if not n or len(n) > 30 or re.fullmatch(r'Q\d+', n): return
    p = R.setdefault(pid, dict(id=pid, n=n)); p.update({k: v for k, v in kw.items() if v not in (None, '', [])})
KIND = [('정치', '정치인|국회의원|의원|장관|대통령|총리|시장|도지사|군수|구청장|외교관|당 대표'), ('법조', '판사|검사|변호사|법조인|대법관|헌법재판'),
        ('연예', '배우|가수|아이돌|래퍼|방송인|코미디언|개그맨|모델|성우|MC|아나운서|작곡가|음악가|프로듀서|댄서'), ('스포츠', '선수|감독|코치|축구|야구|농구|배구|골프|체육|올림픽|격투|e스포츠'),
        ('경제', '기업인|사업가|경영인|회장|CEO|대표이사|투자자|경제학자|은행'), ('인플루언서', '유튜버|인플루언서|스트리머|크리에이터|BJ|틱톡'),
        ('언론', '기자|언론인|앵커|평론가|칼럼니스트'), ('학계', '교수|학자|연구자|과학자|의사|박사'), ('문화', '작가|소설가|시인|감독|화가|만화가|웹툰|예술가|건축가')]
def kind(d):
    for k, rx in KIND:
        if re.search(rx, d or ''): return k
    return ''
# 1) 국회의원(역대 전체)
for f in glob.glob(os.path.join(POL, 'people', '*.json')):
    try: x = json.load(open(f))
    except Exception: continue
    ages = x.get('ages') or []
    add('pol:' + x['id'], x.get('name'), d=f"{'현직 ' if x.get('current') else ''}국회의원({','.join(map(str, ages))}대) {x.get('party') or ''}".strip(), k='정치',
        b=(x.get('birth') or '')[:4], sl=60 if x.get('current') else 20, pol=x['id'], src='assembly')
print('국회의원', len(R))
# 2) 위키데이터: 한국(남·북) 국적 인물 전체 — 출생 연대별로 나눠 요청
Q_KR = '''SELECT ?p ?l ?d ?b ?sl WHERE { ?p wdt:P27 wd:%s; wdt:P31 wd:Q5; wikibase:sitelinks ?sl. %s
  ?p rdfs:label ?l FILTER(LANG(?l)="ko") OPTIONAL{?p schema:description ?d FILTER(LANG(?d)="ko")} }'''
wd_ok = 0
def take(rows, src):
    global wd_ok
    if rows is None: return
    wd_ok += 1
    for r in rows:
        qid = r['p']['value'].rsplit('/', 1)[1]; d = r.get('d', {}).get('value', '')
        b = r.get('b', {}).get('value', '')[:4]; b = b if b.isdigit() else ''
        add('wd:' + qid, r['l']['value'], d=d, k=kind(d), b=b, sl=int(r.get('sl', {}).get('value', 0) or 0), src=src)
for c in ('Q884', 'Q423'):
    for y in list(range(1850, 2020, 10)) + [None]:
        f = ('?p wdt:P569 ?b. FILTER(?b >= "%d-01-01"^^xsd:dateTime && ?b < "%d-01-01"^^xsd:dateTime)' % (y, y + 10)) if y else 'FILTER NOT EXISTS{?p wdt:P569 ?x}'
        if y == 1850: f = '?p wdt:P569 ?b. FILTER(?b < "1860-01-01"^^xsd:dateTime)'
        take(sparql(Q_KR % (c, f)), 'wikidata'); time.sleep(5)
    print('위키데이터', c, len(R))
# 3) 주요 국가의 이름난 인물(한국어 이름이 있는 사람, 유명도 기준)
Q_F = '''SELECT ?p ?l ?d ?sl WHERE { ?p wdt:P27 wd:%s; wdt:P31 wd:Q5; wikibase:sitelinks ?sl. FILTER(?sl >= %d)
  ?p rdfs:label ?l FILTER(LANG(?l)="ko") OPTIONAL{?p schema:description ?d FILTER(LANG(?d)="ko")} }'''
for c, m in [('Q30', 25), ('Q148', 15), ('Q17', 15), ('Q865', 15), ('Q159', 25), ('Q145', 30), ('Q142', 30), ('Q183', 30), ('Q212', 25), ('Q801', 25), ('Q668', 30),
             ('Q881', 20), ('Q16', 30), ('Q38', 35), ('Q29', 35), ('Q155', 35), ('Q408', 30), ('Q794', 25), ('Q43', 30), ('Q851', 25), ('Q928', 25), ('Q96', 35), ('Q20', 35), ('Q252', 25), ('Q836', 25)]:
    take(sparql(Q_F % (c, m)), 'wikidata-world'); time.sleep(5)
print('해외 포함', len(R))
# 해외 인물: 성(마지막 단어)만으로도 찾기 — 아주 유명하고 겹치지 않을 때만(트럼프, 머스크, 시진핑은 그대로)
last = {}
for p in R.values():
    if p.get('src') == 'wikidata-world' and ' ' in p['n'] and p.get('sl', 0) >= 120: last.setdefault(p['n'].split()[-1], []).append(p)
for w, L in last.items():
    if len(L) == 1 and len(w) >= 2: L[0].setdefault('al', []).append(w)
# 4) 연표 대상(활동명 등 별칭 포함)
try:
    for t in json.load(open(os.path.join(HIST, 'h', 'targets.json'))):
        if t.get('k') != 'p': continue
        p = R.get('wd:' + t['id'])
        if p is None: add('wd:' + t['id'], t['n'], k=kind(t.get('occ', '')) or '', d=t.get('occ', ''), b=t.get('b', ''), sl=t.get('sl', 0), src='history'); p = R.get('wd:' + t['id'])
        if p and t['n'] != p['n']: p['al'] = list(dict.fromkeys((p.get('al') or []) + [p['n']])); p['n'] = t['n']
        if p and t.get('al'): p['al'] = list(dict.fromkeys((p.get('al') or []) + t['al']))
        if p: p['hist'] = t['id']
except Exception as e: print('연표 대상 없음', e)
# 5) 뉴스에서 새로 찾은 인물(mentions.py가 쌓음)
try:
    for n, v in json.load(open(os.path.join(PD, 'discovered.json'))).items():
        if v.get('ok') and not any(p['n'] == n for p in R.values() if p.get('k') == v.get('k')): add('nw:' + n, n, d=v.get('role', ''), k=v.get('k', ''), sl=1, src='news')
except Exception: pass
# 위키데이터가 막힌 회차: 지난 명부를 그대로 이어서(지우지 않음)
for pid, p in OLD.items():
    if pid not in R: R[pid] = p
L = sorted(R.values(), key=lambda p: -p.get('sl', 0))
with gzip.open(RP, 'wt', encoding='utf-8', compresslevel=9) as g: json.dump(L, g, ensure_ascii=False, separators=(',', ':'))
st = {}
for p in L: st[p.get('k') or '기타'] = st.get(p.get('k') or '기타', 0) + 1
json.dump(dict(total=len(L), names=len({p['n'] for p in L}), by_kind=st, wikidata_requests_ok=wd_ok, updated=time.strftime('%Y-%m-%d')),
          open(os.path.join(PD, 'registry_stats.json'), 'w'), ensure_ascii=False, indent=1)
print('인물 명부', len(L), st)
