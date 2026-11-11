#!/usr/bin/env python3
"""인물 관계(유형·출처·신뢰도) 모으기: python scripts/people/edges.py <data> [pol_db] [legal]

관계 유형(t): family(가족) · school(학연) · region(지연) · career(경력·조직) · party(정당) · case(사건·법원)
  - family / case 는 사람↔사람, 나머지는 사람↔모임(g:<유형>:<이름>) 소속으로 저장한다(같은 학교 전원을 서로 잇는 폭증 방지).
  - 모든 관계에 출처 주소(src)와 신뢰도(conf 0~1)를 남긴다. 출처 없는 관계는 보관만 하고 공개하지 않는다(pub=0).
  - 공개 조건: 양쪽(모임이면 사람 쪽)이 1·2계층, 출처 주소 있음, 가족 관계에는 미성년자 없음.
출처: 위키데이터(P22·P25·P26·P40·P3373·P1038 가족, P69 학교, P19 출생지, P102 정당, P108·P463·P54 소속, P39 직위; 1·2계층 국내 인물을
      30일마다 돌아가며, 회당 WD_MAX명), 국회(정당·선거구), 판결 보도(판사↔법원, 판사↔변호인), 제미나이 elite_network.json(학연·지연·연수원 기수·
      범죄조직·크리에이터 MCN, 출처 없음 → 비공개 보관).
출력(data 브랜치): db/people/edges/current.json.gz(현재 전체), public.json.gz(공개 가능분), degree.json(중심성), summary.json,
                 wikidata.json.gz(위키데이터 원자료 캐시), log/YYYY-MM/*.jsonl.gz(추가·삭제 기록, 추가 전용)
"""
import os, sys, re, json, time, collections, urllib.request, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pcommon import load, save, append_log, today, now_iso, h, norm_name, norm_pid, is_url, UA

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'data'
POL = sys.argv[2] if len(sys.argv) > 2 else 'pol_db'
LEGAL = sys.argv[3] if len(sys.argv) > 3 else 'legal'
PD = os.path.join(ROOT, 'db', 'people')
ED = os.path.join(PD, 'edges')
TODAY = today()
WD_MAX = int(os.environ.get('WD_MAX', 6000))
WD_SEC = int(os.environ.get('WD_SEC', 1500))      # 위키데이터 단계 시간 상한(초)
REFRESH_DAYS = 30

tiers = (load(os.path.join(PD, 'tiers', 'current.json.gz'), {}) or {}).get('people', {})
reg = load(os.path.join(PD, 'registry.json.gz'), []) or []
reg_src = {r['id']: r.get('src', '') for r in reg}
name_ids = collections.defaultdict(set)
for pid, r in tiers.items():
    if r.get('n'):
        name_ids[norm_name(r['n'])].add(pid)


def by_name(n):
    ids = name_ids.get(norm_name(n)) or set()
    return next(iter(ids)) if len(ids) == 1 else None


def resolve(x):
    pid = norm_pid(x)
    if pid and pid in tiers:
        return pid
    return by_name(x)


E = {}


def edge(a, b, t, sub='', src=None, conf=0.5, via=''):
    if not a or not b or a == b:
        return
    if t in ('family', 'case') and b < a and not b.startswith('g:'):
        a, b = b, a
    k = '|'.join((a, b, t, sub))
    cur = E.get(k)
    s = src if is_url(src) else None
    if cur is None or conf > cur['conf'] or (s and not cur.get('src')):
        E[k] = dict(a=a, b=b, t=t, sub=sub, src=s or (cur or {}).get('src'), conf=round(max(conf, (cur or {}).get('conf', 0)), 2), via=via)


def group(t, label):
    label = re.sub(r'\s+', ' ', str(label or '')).strip()
    return 'g:%s:%s' % (t, label) if label else None


# ---- 1) 위키데이터(1·2계층 국내 인물, 30일 순환) ----
WD = load(os.path.join(ED, 'wikidata.json.gz'), {}) or {}
PROPS = {'P22': ('family', 'father'), 'P25': ('family', 'mother'), 'P26': ('family', 'spouse'), 'P40': ('family', 'child'),
         'P3373': ('family', 'sibling'), 'P1038': ('family', 'relative'), 'P69': ('school', 'educated'), 'P19': ('region', 'birthplace'),
         'P102': ('party', 'member'), 'P108': ('career', 'employer'), 'P463': ('career', 'member_of'), 'P54': ('career', 'team'), 'P39': ('career', 'position')}


def sparql(q):
    for i in range(4):
        try:
            req = urllib.request.Request('https://query.wikidata.org/sparql', data=urllib.parse.urlencode({'query': q}).encode(),
                                         headers={'User-Agent': UA, 'Accept': 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded'})
            return json.loads(urllib.request.urlopen(req, timeout=120).read())['results']['bindings']
        except Exception as e:
            print('  위키데이터 재시도', i, str(e)[:90])
            time.sleep(60 if '429' in str(e) else 10 + 10 * i)
    return None


def wd_due():
    rows = []
    for pid, r in tiers.items():
        if r.get('t') not in (1, 2) or not pid.startswith('wd:'):
            continue
        if r.get('t') == 2 and 'world' in reg_src.get(pid, ''):
            continue                                   # 해외 2계층은 관계 수집 제외(용량·필요성)
        last = (WD.get(pid[3:]) or {}).get('d', '')
        age = 9999 if not last else (time.mktime(time.strptime(TODAY, '%Y-%m-%d')) - time.mktime(time.strptime(last, '%Y-%m-%d'))) / 86400
        if age >= REFRESH_DAYS:
            rows.append((0 if not last else 1, r.get('t'), -(r.get('s') or 0), pid[3:]))
    rows.sort()
    return [x[3] for x in rows[:WD_MAX]]


if os.environ.get('WD_SKIP') != '1':
    due, t0, ok = wd_due(), time.time(), 0
    print('위키데이터 대상', len(due))
    vals = ' '.join('wdt:' + p for p in PROPS)
    for i in range(0, len(due), 120):
        if time.time() - t0 > WD_SEC:
            print('  시간 상한 도달, 다음 회차에 이어감')
            break
        chunk = due[i:i + 120]
        q = ('SELECT ?p ?prop ?o ?oLabel WHERE { VALUES ?p { %s } VALUES ?prop { %s } ?p ?prop ?o . '
             'SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". } }') % (' '.join('wd:' + x for x in chunk), vals)
        res = sparql(q)
        if res is None:
            continue
        got = collections.defaultdict(list)
        for b in res:
            p = b['p']['value'].rsplit('/', 1)[-1]
            prop = b['prop']['value'].rsplit('/', 1)[-1]
            o = b['o']['value'].rsplit('/', 1)[-1]
            got[p].append([prop, o, b.get('oLabel', {}).get('value', '')])
        for x in chunk:
            WD[x] = dict(d=TODAY, e=got.get(x, []))
        ok += len(chunk)
        time.sleep(1.5)
    print('위키데이터 갱신', ok, '명')
    save(os.path.join(ED, 'wikidata.json.gz'), WD)

for qid, rec in WD.items():
    a = 'wd:' + qid
    src = 'https://www.wikidata.org/wiki/' + qid
    for prop, o, olab in rec.get('e', []):
        t, sub = PROPS.get(prop, (None, None))
        if not t:
            continue
        if t == 'family':
            b = 'wd:' + o if re.fullmatch(r'Q\d+', o) else None
            edge(a, b, t, sub, src, 0.9, 'wikidata')
        else:
            lab = olab if olab and not re.fullmatch(r'Q\d+', olab) else o
            edge(a, group(t, lab), t, sub, src, 0.85, 'wikidata')

# ---- 2) 국회(정당·선거구) ----
pol = load(os.path.join(POL, 'index.json'), {}) or {}
for p in pol.get('people', []):
    a = 'pol:' + p['id']
    src = 'https://open.assembly.go.kr/portal/assm/search/memberSchPage.do'
    if p.get('party'):
        edge(a, group('party', p['party']), 'party', 'member', src, 0.95, 'assembly')
    if p.get('district') and p['district'] != '비례대표':
        edge(a, group('region', p['district']), 'region', 'district', src, 0.95, 'assembly')

# ---- 3) 판결 보도(판사↔법원, 판사↔변호인) ----
for key, j in (load(os.path.join(LEGAL, 'legal', 'v1', 'people', 'judges_from_news.json'), {}) or {}).items():
    a = 'jd:' + h(key, 10)
    cases = [u for u in j.get('cases', []) if is_url(u)]
    edge(a, group('case', j.get('court')), 'case', 'court', cases[0] if cases else None, 0.7, 'legal-news')
for f in sorted(os.listdir(os.path.join(LEGAL, 'legal', 'v1', 'news', 'cases'))) if os.path.isdir(os.path.join(LEGAL, 'legal', 'v1', 'news', 'cases')) else []:
    for c in load(os.path.join(LEGAL, 'legal', 'v1', 'news', 'cases', f), []) or []:
        if not c.get('judge') or not c.get('court'):
            continue
        a = 'jd:' + h('%s|%s' % (c['judge'], c['court']), 10)
        for cn in c.get('counsel') or []:
            nm = cn if isinstance(cn, str) else (cn or {}).get('name')
            b = resolve(nm) if nm else None
            if b:
                edge(a, b, 'case', 'judge_counsel', c.get('url'), 0.6, 'legal-news')

# ---- 4) 제미나이 elite_network.json(지우지 않고 그대로 두고, 관계만 읽어 옴) ----
elite = load(os.path.join(ROOT, 'elite_network.json'), {}) or {}
bio = load(os.path.join(ROOT, 'people_bio.json'), None) or load(os.path.join(ROOT, 'people_bio.json.gz'), {}) or {}


def bio_src(member, word):
    """인물사전 사건 중 그 학교·지역 낱말이 든 사건의 출처 주소(있으면)를 근거로 씀."""
    v = bio.get(member) or {}
    for e in v.get('events', []):
        if word and word in (e.get('title', '') + e.get('desc', '')) and is_url(e.get('url')) and 'github.io' not in e['url']:
            return e['url']
    return None


gem = collections.Counter()
for key, t, sub in (('academic_clusters', 'school', 'alumni'), ('judicial_exam_clusters', 'school', 'exam_class'), ('regional_clusters', 'region', 'hometown')):
    for label, members in (elite.get(key) or {}).items():
        g = group(t, label)
        for m in members if isinstance(members, list) else []:
            a = resolve(m)
            if a:
                edge(a, g, t, sub, bio_src(m, label), 0.5, 'gemini-elite')
                gem[key] += 1
for c in elite.get('creators_influencers') or []:
    a = resolve(c.get('channel_name')) or resolve(c.get('real_name'))
    if a and c.get('mcn'):
        edge(a, group('career', c['mcn']), 'career', 'mcn', None, 0.5, 'gemini-elite')
        gem['creators'] += 1
for c in elite.get('crime_underworld') or []:
    a = resolve(c.get('name'))
    if a and c.get('faction'):
        edge(a, group('career', c['faction']), 'career', 'faction', None, 0.4, 'gemini-elite')
        gem['crime'] += 1

# ---- 공개 판정·중심성 ----
FAMILY_OK = lambda pid: tiers.get(pid, {}).get('t') in (1, 2) and not tiers.get(pid, {}).get('minor')
edges = []
for k, e in E.items():
    a_ok = tiers.get(e['a'], {}).get('t') in (1, 2)
    if e['b'].startswith('g:'):
        pub = a_ok and bool(e['src'])
    elif e['t'] == 'family':
        pub = FAMILY_OK(e['a']) and FAMILY_OK(e['b']) and bool(e['src'])
    else:
        pub = a_ok and tiers.get(e['b'], {}).get('t') in (1, 2) and bool(e['src'])
    e['pub'] = 1 if pub else 0
    edges.append(e)

old = {('|'.join((e['a'], e['b'], e['t'], e.get('sub', '')))): e for e in (load(os.path.join(ED, 'current.json.gz'), {}) or {}).get('edges', [])}
log = []
for e in edges:
    k = '|'.join((e['a'], e['b'], e['t'], e['sub']))
    o = old.get(k)
    e['first'] = (o or {}).get('first', TODAY)
    e['last'] = TODAY
    if o is None:
        log.append(dict(d=TODAY, op='add', **{x: e[x] for x in ('a', 'b', 't', 'sub', 'src', 'conf', 'via', 'pub')}))
    elif o.get('pub') != e['pub'] or o.get('src') != e['src']:
        log.append(dict(d=TODAY, op='update', **{x: e[x] for x in ('a', 'b', 't', 'sub', 'src', 'conf', 'via', 'pub')}))
cur_keys = {'|'.join((e['a'], e['b'], e['t'], e['sub'])) for e in edges}
for k, o in old.items():
    if k not in cur_keys:
        # 원천에서 사라진 관계도 지우지 않고 기록으로 남김(출처가 바뀌었거나 위키데이터에서 삭제됨)
        o = dict(o, gone=TODAY)
        edges.append(o)
        if not o.get('gone_logged'):
            log.append(dict(d=TODAY, op='gone', a=o['a'], b=o['b'], t=o['t'], sub=o.get('sub', '')))
            o['gone_logged'] = 1

deg = collections.Counter()
for e in edges:
    if e.get('src') and not e.get('gone'):
        if e['b'].startswith('g:'):
            deg[e['a']] += 0.25                       # 모임 소속은 약하게(정당·선거구만으로 중심 인물이 되지 않게)
        else:
            deg[e['a']] += 1
            deg[e['b']] += 1
save(os.path.join(ED, 'current.json.gz'), dict(updated=now_iso(), edges=edges))
save(os.path.join(ED, 'public.json.gz'), dict(updated=now_iso(), edges=[{k: e[k] for k in ('a', 'b', 't', 'sub', 'src', 'conf')} for e in edges if e.get('pub') and not e.get('gone')]))
save(os.path.join(ED, 'degree.json'), {k: round(v, 2) for k, v in deg.items()})
live = [e for e in edges if not e.get('gone')]
summary = dict(updated=now_iso(), total=len(live), public=sum(e['pub'] for e in live),
               by_type={t: dict(total=sum(1 for e in live if e['t'] == t), public=sum(e['pub'] for e in live if e['t'] == t),
                                person_to_person=sum(1 for e in live if e['t'] == t and not e['b'].startswith('g:'))) for t in ('family', 'school', 'region', 'career', 'party', 'case')},
               by_source=dict(collections.Counter(e['via'] for e in live)), unsourced=sum(1 for e in live if not e.get('src')),
               gemini_imported=dict(gem), wikidata_people=len(WD), gone=sum(1 for e in edges if e.get('gone')), changes=len(log))
save(os.path.join(ED, 'summary.json'), summary, compact=False)
append_log(os.path.join(ED, 'log'), log)
print(json.dumps(summary, ensure_ascii=False))
