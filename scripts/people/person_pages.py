#!/usr/bin/env python3
"""1계층 인물 페이지·모임(엔티티) 페이지용 정적 묶음: python scripts/people/person_pages.py <data> <pol_db> <_site>

화면: /news/person/?id=<id> (assets/nbp/person.js), /news/e/?k=<모임키> (assets/nbp/entity.js)
출력(_site/data/p/):
  x/NNN.json   id → 인물 묶음(프로필·사진·경력·관계·기사 요약·출처). NNN = sha1(id) 앞 6자리 % 256
  g/NN.json    모임키 → {n 이름, t 유형, c 인원, m [[id,이름,분야,계층,사진,역할,시작,끝,페이지]]}. NN = sha1(키) % 64
  names.json   이름 → 인물 id(1계층에서 그 이름의 주인이 분명할 때만: 1명이거나 점수 1.5배 이상 앞섬)
  kinds.json   분야 → 1계층 인원 상위 목록(분야 페이지)
  meta.json    건수·사진 보유율(분야별)
규칙(docs/PEOPLE.md): 1계층만 페이지를 만든다. 2계층은 이름·분야·출처 링크만, 3계층·미성년은 넣지 않는다. 출처 없는 관계는 넣지 않는다.
사진: 1계층 위키미디어(photos_t1.json, R2) → 국회 공식(정치인) → 검증 초상(portraits.json) 순. 없으면 비움(화면이 중립 아이콘).
"""
import collections, glob, gzip, hashlib, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pcommon import load, norm_name, now_iso  # noqa: E402

DATA, POL, SITE = (sys.argv[1:4] + ['data', 'pol_db', '_site'][len(sys.argv[1:4]):])[:3]
PD = os.path.join(DATA, 'db', 'people')
OUT = os.path.join(SITE, 'data', 'p')
R2 = os.environ.get('NB_WORKER', 'https://newsboard-sync.pyw213.workers.dev') + '/m/'
XS, GS = 256, 64
KIND_ORDER = ['정치', '법조', '언론', '연예', '스포츠', '경제', '문화', '학계', '인플루언서', '기타']
sh = lambda s, n: int(hashlib.sha1(s.encode()).hexdigest()[:6], 16) % n

tiers = (load(os.path.join(PD, 'tiers', 'current.json.gz'), {}) or {}).get('people', {})
reg = {r['id']: r for r in (load(os.path.join(PD, 'registry.json.gz'), []) or [])}
edges = (load(os.path.join(PD, 'edges', 'public.json.gz'), {}) or {}).get('edges', [])
WD = (load(os.path.join(PD, 'wd_t1.json.gz'), {}) or {}).get('items', {})
PH = (load(os.path.join(PD, 'photos_t1.json'), {}) or {}).get('items', {})
PORT = (load(os.path.join(PD, 'portraits.json'), {}) or {}).get('items', {})
AIX = load(os.path.join(PD, 'index.json'), {}) or {}
BIO = load(os.path.join(DATA, 'people_bio.json.gz'), None) or load(os.path.join(DATA, 'people_bio.json'), {}) or {}
pub = {k: v for k, v in tiers.items() if v.get('t') in (1, 2) and not v.get('minor')}
PERSON_ID = re.compile(r'^(wd:Q\d+|pol:[A-Z0-9]+|jd:[0-9a-f]+|bio:.+)$')   # nw:(뉴스에서 찾은 이름)은 사람 확인 전이라 페이지를 만들지 않음


def birth(pid):
    try:
        return int(str((reg.get(pid) or {}).get('b') or '')[:4])
    except ValueError:
        return None


# 1) pol: → wd: 같은 사람 묶기(graph.py와 같은 규칙)
by_name = collections.defaultdict(list)
for pid, r in pub.items():
    by_name[norm_name(r.get('n', ''))].append(pid)
canon = {}
for pid in pub:
    if pid.startswith('pol:') and birth(pid):
        c = [q for q in by_name[norm_name(pub[pid].get('n', ''))] if q.startswith('wd:Q') and pub[q].get('k') == '정치' and birth(q) and abs(birth(q) - birth(pid)) <= 1]
        if len(c) == 1:
            canon[pid] = c[0]
C = lambda x: canon.get(x, x)
alias = collections.defaultdict(set)
for a, b in canon.items():
    alias[b].add(a)
T1 = {}
for pid, r in tiers.items():
    if r.get('t') != 1 or r.get('minor') or not PERSON_ID.match(pid):
        continue
    cid = C(pid)
    if cid not in pub:
        continue
    T1[cid] = pub[cid] if pub[cid].get('t') == 1 else r
for cid in T1:
    alias[cid].add(cid)
polid = lambda cid: next((a[4:] for a in sorted(alias[cid]) if a.startswith('pol:')), None)


def pol_json(pid):
    return load(os.path.join(POL, 'people', pid + '.json'), {}) if pid else {}


# 2) 사진
pol_photo = {f[:-5] for f in os.listdir(os.path.join(POL, 'photos'))} if os.path.isdir(os.path.join(POL, 'photos')) else set()


def photo(cid):
    p = PH.get(cid)
    if p:
        return {'u': R2 + p['k'], 's': R2 + p['s'], 'w': p.get('tw'), 'h': p.get('th'), 'src': p['src'], 'lic': p['lic'], 'by': re.sub(r'\s+', ' ', p.get('by') or '')[:80], 'o': 'wm'}
    pp = polid(cid)
    if pp and pp in pol_photo:
        u = 'data/pol/photos/%s.webp' % pp
        return {'u': u, 's': u, 'w': 167, 'h': 230, 'src': 'https://open.assembly.go.kr', 'lic': '국회 공식 사진', 'by': '대한민국 국회', 'o': 'na'}
    q = PORT.get(cid)
    if q:
        f = re.sub(r'^/?(?:news/)?media/', R2, q['file'])  # media/ent/… 는 R2 ent/… 로 옮겨짐
        return {'u': f, 's': f, 'w': 720, 'h': 720, 'src': q['source'], 'lic': q['license'], 'by': q.get('author', '')[:80], 'o': 'wm'}
    return None


PHOTO = {cid: photo(cid) for cid in T1}
small = lambda cid: (PHOTO.get(cid) or {}).get('s') if cid in T1 else None


def card(pid):
    """관계·모임 목록에 쓰는 사람 요약 [이름, 분야, 계층, 작은 사진, 페이지 있음]"""
    pid = C(pid)
    r = pub.get(pid) or T1.get(pid) or {}
    return [r.get('n', ''), r.get('k', ''), r.get('t', 3), small(pid), 1 if pid in T1 else 0]


# 3) 모임: 공개 관계 + 위키데이터 목록 + 국회 위원회
GROUPS = collections.defaultdict(dict)   # 키 → {사람id: (역할, 시작, 끝)}
GNAME = {}
person_groups = collections.defaultdict(list)
SUB = {'educated': '출신 학교', 'alumni': '동문', 'birthplace': '출생지', 'district': '지역구', 'member': '소속 정당', 'position': '역임 직위',
       'employer': '소속 기관', 'team': '소속 팀', 'member_of': '소속', 'court': '재판'}
for e in edges:
    a, b = C(e['a']), e['b']
    if not b.startswith('g:') or a not in pub:
        continue
    GROUPS[b].setdefault(a, (SUB.get(e.get('sub', ''), e.get('sub', '')), None, None))
    GNAME[b] = b.split(':', 2)[2]
WDG = {'pos': 'career', 'edu': 'school', 'emp': 'career', 'party': 'party', 'mem': 'org', 'team': 'career', 'award': 'award', 'occ': 'occ', 'label': 'org'}
WDROLE = {'pos': '역임 직위', 'edu': '출신 학교', 'emp': '소속 기관', 'party': '소속 정당', 'mem': '소속', 'team': '소속 팀', 'award': '수상', 'occ': '직업', 'label': '소속 레이블'}
gkey = lambda typ, label: 'g:%s:%s' % (typ, label)
for cid in T1:
    w = WD.get(cid) or {}
    for k, typ in WDG.items():
        for q, label, y0, y1 in w.get(k, []):
            if not label or re.fullmatch(r'Q\d+', label):
                continue
            g = gkey(typ, label)
            GROUPS[g][cid] = (WDROLE[k], y0, y1); GNAME[g] = label
    if w.get('bp') and w['bp'][1]:
        g = gkey('region', w['bp'][1]); GROUPS[g].setdefault(cid, ('출생지', None, None)); GNAME[g] = w['bp'][1]
    pj = pol_json(polid(cid))
    for cm in re.split(r'\s*[,·]\s*', pj.get('committees') or ''):
        if cm:
            g = gkey('committee', cm); GROUPS[g][cid] = ('위원', None, None); GNAME[g] = cm
score = lambda p: (pub.get(p) or {}).get('s', 0)
# 생애 기록 제목 → 모임 페이지 연결(두 명 이상 모인 학교·기관·직위·정당·소속·위원회, 세 글자 이상 이름 중 가장 긴 것)
_GN = {}
for g, mem in GROUPS.items():
    t, nmg = g.split(':')[1], GNAME.get(g, '')
    if t in ('career', 'school', 'party', 'org', 'committee') and len(mem) >= 2 and len(nmg) >= 3 and not re.search(r'[A-Za-z]{4}', nmg):
        _GN.setdefault(nmg, g)
GRE = re.compile('|'.join(re.escape(n) for n in sorted(_GN, key=len, reverse=True))) if _GN else None
def ev_group(title):
    if not GRE:
        return None
    ms = [m.group(0) for m in GRE.finditer(title)]
    return _GN[max(ms, key=len)] if ms else None

# 4) 기사(인물 기사 타임라인 t/) 요약
def articles(cid):
    paths, months = [], collections.Counter()
    rows = []
    for a in sorted(alias[cid]):
        x = AIX.get(a)
        if not x or not x.get('f'):
            continue
        paths.append(x['f'])
        for f in sorted(glob.glob(os.path.join(PD, x['f'], '*.json.gz'))):
            mon = os.path.basename(f)[:7]
            L = load(f, []) or []
            months[mon] += len(L)
            rows += [r + [mon] for r in L]
    if not rows:
        return None
    seen, uniq = set(), []
    for r in sorted(rows, key=lambda r: r[0] or r[-1], reverse=True):
        k = re.sub(r'\s+', '', r[1])[:40]
        if k in seen:
            continue
        seen.add(k); uniq.append(r)
    press = collections.Counter(r[3] for r in uniq if r[3])
    return {'c': len(uniq), 'f': paths, 'm': sorted(months.items()), 'pc': len(press), 'top': press.most_common(10),
            'last': [[r[0], r[1], r[2], r[3]] for r in uniq[:8]]}


# 5) 오늘·지난 이슈와 사진 기사
TD = load(os.path.join(SITE, 'data', 'today.json'), {}) or {}
issues_by = collections.defaultdict(list)
for f in sorted(glob.glob(os.path.join(DATA, 'archive', '20*.json')))[-60:] + ['__today__']:
    A = TD if f == '__today__' else load(f, {}) or {}
    for i in A.get('issues', []) if isinstance(A, dict) else []:
        for n in i.get('entities') or []:
            issues_by[n].append([(A.get('date') or '')[:10], i.get('title', ''), i.get('id', '')])
img_arts = []
for i in TD.get('issues', []):
    for s in (i.get('sources') or []) + (i.get('gallery') or []):
        if s.get('img') and s.get('title') and s.get('url'):
            img_arts.append([s.get('t') or TD.get('date', ''), s['title'], s['url'], s.get('press', ''), s['img']])

# 6) 인물사전(제미나이) 사건: id 키 우선. 이름 키는 동명이인이 없을 때만 전부, 있으면 손으로 정리된 사건(선거·위키데이터 자동분 제외)만
AUTO = re.compile(r'선거|Wikidata|공공 인물 레지스트리|열린국회정보')
def bio_events(cid, nm):
    b = None
    for a in sorted(alias[cid]):
        if a in BIO:
            b, trust = BIO[a], True; break
    if b is None and nm in BIO:
        b, trust = BIO[nm], len(by_name[norm_name(nm)]) == 1
    if not b:
        return [], {}
    out, seen = [], set()
    for e in b.get('events') or []:
        if e.get('typ') == 'article' or e.get('status') not in (None, 'fact'):
            continue
        if not trust and AUTO.search(e.get('src') or ''):
            continue
        k = (e.get('d'), e.get('title'))
        if k in seen:
            continue
        seen.add(k)
        out.append([e.get('d') or '', e.get('title', ''), e.get('typ', ''), e.get('stage', ''), (e.get('desc') or '')[:240], e.get('src') or '', e.get('url') or ''])
    extra = {k: b.get(k) for k in ('military', 'birth_desc', 'role_title') if b.get(k) and trust}
    return out, extra


# 7) 인물 묶음
PARTY_RE = re.compile(r'(더불어민주당|국민의힘|자유한국당|새누리당|한나라당|민주통합당|새정치민주연합|국민의당|바른미래당|정의당|조국혁신당|개혁신당|진보당|민주당|미래통합당|열린우리당|통합진보당|민주노동당)')
ADJ = collections.defaultdict(list)
for e in edges:
    ADJ[C(e['a'])].append(e)
    if not e['b'].startswith('g:'):
        ADJ[C(e['b'])].append(e)
def bundle(cid):
    r = T1[cid]; rg = reg.get(cid) or {}; w = WD.get(cid) or {}; pp = polid(cid); pj = pol_json(pp)
    nm = r.get('n') or w.get('l') or rg.get('n', '')
    ev, extra = bio_events(cid, nm)
    rel, L, gp = [], {}, {}
    seen = set()
    for e in ADJ.get(cid, []):
        a, b = C(e['a']), C(e['b']) if not e['b'].startswith('g:') else e['b']
        if cid not in (a, b):
            continue
        o = b if a == cid else a
        if o == cid or (not o.startswith('g:') and o not in pub):
            continue
        k = (o, e['t'], e.get('sub', ''))
        if k in seen:
            continue
        seen.add(k)
        src = e.get('src') or ''
        d = 0
        if not o.startswith('g:') and src.startswith('https://www.wikidata.org/wiki/'):
            subj = C('wd:' + src.rsplit('/', 1)[-1])
            d = 1 if subj == cid else (-1 if subj == o else 0)
        rel.append([o, e['t'], e.get('sub', ''), round(e.get('conf', 0.5), 2), src, d if a == cid else -d])
        if o.startswith('g:'):
            ps = sorted((p for p in GROUPS.get(o, {}) if p != cid), key=score, reverse=True)[:3]
            if ps:
                gp[o] = ps
                for p in ps:
                    L[p] = card(p)
        else:
            L[o] = card(o)
    car = {}
    for k in WDG:
        if w.get(k):
            car[k] = [[label, y0, y1, gkey(WDG[k], label)] for q, label, y0, y1 in w[k] if label and not re.fullmatch(r'Q\d+', label)]
    # 선관위 당선인 명부는 같은 이름을 한데 묶어 들어온 경우가 있음: 정당을 아는 사람은 다른 정당 당선 기록을 버림
    known = {x[0] for x in car.get('party', [])}
    if pj:
        known |= {pj.get('party') or ''} | {str(x.get('to') or x.get('party') or x) if isinstance(x, dict) else str(x) for x in pj.get('party_switches') or []}
    known |= {m for e in ev if '선거관리위원회' not in e[5] for m in PARTY_RE.findall(e[1])}
    known = {k for k in known if k}
    if known:
        def ok(e):
            if '선거관리위원회' not in e[5]:
                return True
            m = re.search(r'\(([^()]+)\)\s*$', e[1])
            return not m or any(m.group(1) in k or k in m.group(1) for k in known)
        ev = [e for e in ev if ok(e)]
    for e in ev:
        g = ev_group(e[1]) if re.search(r'\d{4}', e[0]) else None
        e.append(g)
        if g:
            y = re.findall(r'\d{4}', e[0])
            GROUPS[g].setdefault(cid, ('경력', int(y[0]), int(y[1]) if len(y) > 1 else None))
    src = {}
    if cid.startswith('wd:'):
        src['wd'] = 'https://www.wikidata.org/wiki/' + cid[3:]
    if w.get('w'):
        src['wiki'] = 'https://ko.wikipedia.org/wiki/' + w['w'].replace(' ', '_')
    if pp:
        src['pol'] = 'https://open.assembly.go.kr/portal/assm/search/memberSchPage.do'
    if w.get('site'):
        src['site'] = w['site']
    hist = rg.get('hist') or next((('a' + a[4:]) for a in alias[cid] if a.startswith('pol:')), None)
    iss = []
    for d, t, i in issues_by.get(nm, [])[-12:]:
        iss.append([d, t, i])
    pa = [a for a in img_arts if nm and len(nm) >= 2 and nm in a[1]][:4]
    out = {'id': cid, 'n': nm, 'k': r.get('k', ''), 't': 1, 'o': r.get('o', ''), 'd': w.get('d') or rg.get('d', ''),
           'b': w.get('b') or birth(cid), 'dd': w.get('dd'), 'bp': (w.get('bp') or [None, None])[1],
           'ph': PHOTO.get(cid), 'src': src, 'pol': pp if pj else None, 'h': hist, 'ev': ev, 'x': extra, 'car': car,
           'ea': ehash(nm) if names.get(nm) == cid and ehash(nm) in ENT else None,
           'rel': rel, 'L': L, 'gp': gp, 'ar': articles(cid), 'pa': pa, 'iss': iss, 'al': sorted(alias[cid])}
    if pj:
        out['hz'] = pj.get('hanja'); out['en'] = pj.get('en'); out['bd'] = pj.get('birth')
    return {k: v for k, v in out.items() if v not in (None, '', [], {})}


def jw(p, o):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(o, f, ensure_ascii=False, separators=(',', ':'))


# 이름 → id (페이지로 바로 보내도 되는 경우만)
NM = collections.defaultdict(list)
for cid, r in T1.items():
    NM[r.get('n', '')].append(cid)
names = {}
for n, ids in NM.items():
    if not n:
        continue
    cands = sorted(ids, key=score, reverse=True)
    others = [q for q in by_name[norm_name(n)] if C(q) not in ids]
    top, rest = score(cands[0]), max([score(q) for q in cands[1:] + others] or [0])
    if top >= rest * 1.5:
        names[n] = cands[0]
ENT = {f[:-5] for f in os.listdir(os.path.join(DATA, 'db', 'entities'))} if os.path.isdir(os.path.join(DATA, 'db', 'entities')) else set()
ehash = lambda n: hashlib.sha1(n.encode()).hexdigest()[:10]
XB = [dict() for _ in range(XS)]
stats = collections.defaultdict(collections.Counter)
for cid in T1:
    b = bundle(cid)
    XB[sh(cid, XS)][cid] = b
    k = b.get('k') or '기타'
    s = stats[k]; s['people'] += 1
    s['photo'] += bool(b.get('ph')); s['photo_wm'] += (b.get('ph') or {}).get('o') == 'wm'; s['photo_na'] += (b.get('ph') or {}).get('o') == 'na'
    s['events'] += bool(b.get('ev')); s['career'] += bool(b.get('car')); s['relations'] += bool(b.get('rel')); s['articles'] += bool(b.get('ar'))
    s['history'] += bool(b.get('h')); s['parliament'] += bool(b.get('pol')); s['wiki'] += bool((b.get('src') or {}).get('wiki'))
    pc = sum(1 for o, *_ in b.get('rel', []) if not o.startswith('g:'))
    s['rel_people'] += pc; s['rel_people_photo'] += sum(1 for o, *_ in b.get('rel', []) if not o.startswith('g:') and (b['L'].get(o) or [0, 0, 0, None])[3])
for i, d in enumerate(XB):
    jw(os.path.join(OUT, 'x', '%03d.json' % i), d)

GB = [dict() for _ in range(GS)]
for g, mem in GROUPS.items():
    ms = sorted(mem.items(), key=lambda kv: -score(kv[0]))
    ms = [m for m in ms if (pub.get(m[0]) or {}).get('t') in (1, 2)]
    if not ms:
        continue
    gn = GNAME.get(g, g.split(':', 2)[-1])
    GB[sh(g, GS)][g] = {'n': gn, 't': g.split(':')[1], 'c': len(ms), 'ea': ehash(gn) if ehash(gn) in ENT else None,
                        'm': [[p] + card(p) + [role, y0, y1] for p, (role, y0, y1) in ms[:240]]}
for i, d in enumerate(GB):
    jw(os.path.join(OUT, 'g', '%02d.json' % i), d)

jw(os.path.join(OUT, 'names.json'), names)
kinds = {}
for cid, r in T1.items():
    kinds.setdefault(r.get('k') or '기타', []).append(cid)
jw(os.path.join(OUT, 'kinds.json'), {k: {'c': len(v), 'm': [[p] + card(p) + [(T1[p].get('o') or (reg.get(p) or {}).get('d') or '')[:30]] for p in sorted(v, key=score, reverse=True)[:240]]}
                                     for k, v in sorted(kinds.items(), key=lambda kv: KIND_ORDER.index(kv[0]) if kv[0] in KIND_ORDER else 99)})
meta = {'updated': now_iso(), 'people': len(T1), 'groups': sum(len(d) for d in GB), 'names': len(names), 'by_kind': {k: dict(v) for k, v in stats.items()}}
jw(os.path.join(OUT, 'meta.json'), meta)
print(json.dumps({k: v for k, v in meta.items() if k != 'by_kind'}, ensure_ascii=False))
for k, v in sorted(stats.items(), key=lambda kv: -kv[1]['people']):
    print(' ', k, dict(v))
