#!/usr/bin/env python3
"""인물 3계층 판정(매주): python scripts/people/tiers.py <data> [pol_db] [hist] [legal]

1계층(공인·핵심 인물): 우리 서버에 전부 보관(프로필·사진·타임라인·관계).
2계층(준공인): 프로필은 보관, 나머지는 외부 링크.
3계층(민간인·미확인): 외부 링크 + 최소 필드(이름·분야·출처)만. 사진 저장 금지, 가족·관계 추론 금지,
                     공개 관계도에서 제외(뉴스에 반복 등장하면 점수가 올라 자동 승격).

점수(0~100) = 직위·직업(0~40) + 뉴스 언급(0~35, 60일 반감) + 관심도(0~20, 위키 언어판 수) + 관계 중심성(0~10)
승격은 즉시, 강등은 '기준-8점 미만이 2주 연속'일 때만(1계층은 승격 후 90일 보호, 현직은 강등 없음).
계층 크기는 무료 저장 예산(docs/PEOPLE.md) 안에 머물도록 상한을 넘으면 1계층 기준점을 자동으로 올린다.
출력(data 브랜치): db/people/tiers/current.json.gz, summary.json, state.json, log/YYYY-MM/*.jsonl.gz(추가 전용),
                 people_public.json(사이트 공개용: 1·2계층 이름 목록, 관계도 공개 여부 판단에 사용)
"""
import os, sys, math, re, datetime, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pcommon import load, save, append_log, today, now_iso, h, norm_name, norm_pid

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'data'
POL = sys.argv[2] if len(sys.argv) > 2 else 'pol_db'
HIST = sys.argv[3] if len(sys.argv) > 3 else 'hist'
LEGAL = sys.argv[4] if len(sys.argv) > 4 else 'legal'
PD = os.path.join(ROOT, 'db', 'people')
TD = os.path.join(PD, 'tiers')
TODAY = today()
YEAR = int(TODAY[:4])

# 무료 한도 안의 계층 상한(사람 수). 근거는 docs/PEOPLE.md '저장 예산'.
CAP = {1: int(os.environ.get('TIER1_CAP', 30000)), 2: int(os.environ.get('TIER2_CAP', 150000))}
THR = {1: 40.0, 2: 12.0}
MARGIN = 8.0
PROTECT_T1_DAYS = 90
# 계층별 1인당 저장량 추정(바이트): 사진 WebP 2배 해상도(약 15KB, 사진이 있는 1계층만) + 프로필·타임라인 / 2계층 프로필 / 3계층 링크
BYTES = {1: 21000, 2: 1500, 3: 220}

TOP = r'대통령|국무총리|부총리|장관|차관|대법원장|대법관|헌법재판|국회의장|검찰총장|감사원장|국정원장|당\s*대표|원내대표|도지사|특별시장|광역시장|특별자치시장|청와대|비서실장|대사$'
LOCAL_HEAD = r'시장|군수|구청장|교육감'
LOCAL_COUNCIL = r'시·도의원|구·시·군의원|도의원|시의원|군의원|구의원|의회 의원'
EXEC = r'회장|부회장|대표이사|사장|CEO|창업자|총수|의장'
KIND_BASE = {'정치': 15, '법조': 18, '언론': 15, '경제': 12, '연예': 20, '스포츠': 18, '인플루언서': 16, '문화': 10, '학계': 6, '기타': 4}


def days_since(d):
    try:
        return (datetime.date.fromisoformat(TODAY) - datetime.date.fromisoformat(d[:10])).days
    except Exception:
        return 9999


C = {}   # id -> 후보 레코드
name_ids = collections.defaultdict(set)


def cand(pid, n, **kw):
    p = C.get(pid)
    if p is None:
        p = C[pid] = dict(id=pid, n=n, office=0.0, off_why='', kind='', news=0, last='', hist=0, sl=0, b=None, src=set(), current=False)
        name_ids[norm_name(n)].add(pid)
    for k, v in kw.items():
        if k == 'src':
            p['src'].add(v)
        elif k == 'office':
            if v[0] > p['office']:
                p['office'], p['off_why'] = v
        elif v not in (None, '', 0):
            if k in ('news', 'hist', 'sl'):
                p[k] = max(p[k], v)
            elif k == 'last':
                p[k] = max(p[k], v)
            else:
                p[k] = v
    return p


def by_name(n):
    ids = name_ids.get(norm_name(n)) or set()
    return next(iter(ids)) if len(ids) == 1 else None


# 1) 인물 명부(위키데이터·국회·연표 대상·뉴스 발견)
reg = load(os.path.join(PD, 'registry.json.gz'), []) or []
for r in reg:
    b = None
    try:
        b = int(str(r.get('b'))[:4]) if r.get('b') else None
    except ValueError:
        pass
    cand(r['id'], r['n'], kind=r.get('k') or '기타', sl=int(r.get('sl') or 0), b=b, src='registry:' + str(r.get('src', '')), desc=r.get('d') or '')

# 2) 국회의원(역대 전원, 현직 표시)
pol = load(os.path.join(POL, 'index.json'), {}) or {}
for p in pol.get('people', []):
    pid = 'pol:' + p['id']
    cur = bool(p.get('current'))
    b = int(p['birth'][:4]) if str(p.get('birth') or '')[:4].isdigit() else None
    cand(pid, p['name'], kind='정치', b=b, current=cur, news=int(p.get('news') or 0),
         office=(40.0, '현직 국회의원') if cur else (30.0, '전직 국회의원'), src='politicians')

# 3) 인물사전(제미나이 people_bio.json, 7.9만): 직함으로 직위 점수
bio = load(os.path.join(ROOT, 'people_bio.json'), None)
if bio is None:
    bio = load(os.path.join(ROOT, 'people_bio.json.gz'), {}) or {}
for key, v in bio.items():
    pid = norm_pid(key) if str(key).startswith(('wd:', 'pol:')) else None
    if pid and pid not in C:
        pid = None
    nm = key if not pid else C[pid]['n']
    if not pid:
        pid = by_name(key) or ('bio:' + h(norm_name(key), 10))
    role = (v.get('role_title') or '') + ' ' + (v.get('org') or '')
    kind = v.get('kind') or ''
    sc, why = 0.0, ''
    if re.search(TOP, role):
        sc, why = 38.0, '고위 공직'
    elif re.search(r'판사|검사|법관|재판관|검사장|법원장', role):
        sc, why = 40.0, '판사·검사'
    elif kind == 'legal':
        sc, why = 25.0, '법조인'
    elif re.search(LOCAL_HEAD, role) and kind in ('official', 'politician'):
        sc, why = 25.0, '자치단체장·교육감'
    elif re.search(LOCAL_COUNCIL, role):
        sc, why = 14.0, '지방의원'
    elif kind == 'corporate' and re.search(EXEC, role):
        sc, why = 30.0, '기업 경영진'
    elif kind == 'reporter':
        sc, why = 40.0, '언론인'
    elif kind in ('official', 'politician'):
        sc, why = 16.0, '공직·선출직'
    # 명부(위키데이터) 인물에 인물사전 직함을 붙일 때는 위키데이터 설명과 분야가 맞을 때만(동명이인 직함이 옮겨 붙는 것 방지)
    d = (C.get(pid) or {}).get('desc', '')
    if sc and not pid.startswith(('bio:', 'pol:')) and d:
        need = {'법조인': r'법|판사|검사|변호사|재판', '판사·검사': r'법|판사|검사|재판', '기업 경영진': r'기업|경영|회장|사장|대표|CEO|창업', '언론인': r'기자|언론|앵커|방송|아나운서'}.get(
            why, r'정치|의원|공무원|관료|시장|군수|구청장|도지사|교육감|장관|차관|외교관|대통령|총리|청장|위원장')
        if not re.search(need, d):
            sc, why = 0.0, ''
    elif sc and not pid.startswith(('bio:', 'pol:')) and not d:
        sc, why = 0.0, ''
    kmap = {'politician': '정치', 'official': '정치', 'legal': '법조', 'corporate': '경제', 'reporter': '언론', 'scholar': '학계', 'sports': '스포츠'}
    cand(pid, nm, kind=C.get(pid, {}).get('kind') or kmap.get(kind, '기타'), office=(sc, why), src='people_bio')

# 4) 법조(판사: 판결 보도에 나온 이름+법원, 대법관·헌법재판관)
for key, j in (load(os.path.join(LEGAL, 'legal', 'v1', 'people', 'judges_from_news.json'), {}) or {}).items():
    pid = 'jd:' + h(key, 10)
    cand(pid, j.get('name', ''), kind='법조', office=(40.0, '판사(판결 보도)'), news=len(j.get('cases', [])), src='legal:judges_from_news')
for j in load(os.path.join(LEGAL, 'legal', 'v1', 'people', 'justices_wikidata.json'), []) or []:
    pid = 'wd:' + j['qid'] if j.get('qid') else 'jd:' + h(j.get('name'), 10)
    cand(pid, j.get('name', ''), kind='법조', office=(38.0, '대법관·헌법재판관'), src='legal:justices')

# 5) 뉴스 언급(30분마다 쌓이는 인물별 기사 색인) + 과거 블랙박스 기록 수
for pid, v in (load(os.path.join(PD, 'index.json'), {}) or {}).items():
    if pid in C:
        cand(pid, C[pid]['n'], news=int(v.get('c') or 0), last=v.get('last', ''))
for name, v in (load(os.path.join(PD, 'discovered.json'), {}) or {}).items():
    pid = by_name(name) or ('nw:' + h(norm_name(name), 10))
    role = v.get('role', '')
    off = (25.0, '법조인') if re.search(r'판사|검사', role) else (0.0, '')
    cand(pid, name, kind=v.get('k') or '기타', news=len(v.get('u') or []), office=off, src='news:discovered')
for key, v in (load(os.path.join(HIST, 'h', 'index.json'), {}) or {}).items():
    if v.get('k') != 'p':
        continue
    pid = norm_pid(key)
    pid = pid if pid in C else by_name(v.get('n'))
    if pid:
        cand(pid, C[pid]['n'], hist=int(v.get('c') or 0))

# 6) 관계 중심성(edges.py가 만든 출처 있는 관계 수)
deg = load(os.path.join(PD, 'edges', 'degree.json'), {}) or {}

# ---- 점수 ----
def score(p):
    office = max(p['office'], KIND_BASE.get(p['kind'] or '기타', 4))
    age = days_since(p['last']) if p['last'] else 60
    m = p['news'] * (0.5 ** (age / 60.0))
    news = min(35.0, 15.0 * math.log10(1 + m) + 4.0 * math.log10(1 + p['hist']))
    interest = min(20.0, 7.0 * math.log10(1 + p['sl']))
    cent = min(10.0, 3.0 * math.log2(1 + deg.get(p['id'], 0)))
    return round(min(100.0, office + news + interest + cent), 1), dict(o=round(office), n=round(news), i=round(interest), c=round(cent))


def raw_tier(s, thr):
    return 1 if s >= thr[1] else 2 if s >= thr[2] else 3


# 위키데이터 설명이 '○○의 아버지/장남/배우자'처럼 가족으로만 알려진 사람 = 민간인 가족. 직위가 없고 본인 뉴스가 적으면 3계층.
RELATIVE_ONLY = re.compile(r'의\s*(친|외)?(아버지|어머니|부친|모친|아들|딸|장남|차남|삼남|장녀|차녀|막내|자녀|배우자|부인|남편|아내|형|오빠|누나|언니|동생|남동생|여동생|손자|손녀|조카|장인|장모|사위|며느리|처남|처제|시아버지|시어머니)(이다)?\s*$')
scored = []
for p in C.values():
    if not p['n']:
        continue
    rel_only = bool(RELATIVE_ONLY.search(p.get('desc') or ''))
    if rel_only and p['office'] < 25:
        p['office'], p['off_why'], p['kind'] = 0.0, '', '기타'
    s, parts = score(p)
    if rel_only and p['office'] < 25 and p['news'] < 5 and p['sl'] < 5:
        s = min(s, THR[2] - 0.1)              # 가족으로만 알려진 민간인은 3계층에 고정
        p['off_why'] = '가족으로만 알려짐'
    minor = bool(p['b'] and YEAR - p['b'] < 19)
    scored.append((s, p, parts, minor))

# 상한: 1계층이 CAP을 넘으면 기준점을 올림(무료 저장 예산 보호)
thr = dict(THR)
ss = sorted((x[0] for x in scored), reverse=True)
for t in (1, 2):
    if len(ss) > CAP[t] and ss[CAP[t] - 1] >= thr[t]:
        thr[t] = max(thr[t], ss[CAP[t]] + 0.1)

state = {} if os.environ.get('TIERS_RESET') == '1' else (load(os.path.join(TD, 'state.json.gz'), {}) or {})   # 판정 규칙을 고친 뒤 한 번만 기준선 재설정
out, changes, counts = {}, [], collections.Counter()
for s, p, parts, minor in scored:
    pid = p['id']
    rt = raw_tier(s, thr)
    if minor:
        rt = max(rt, 2)                      # 미성년자는 1계층(사진·가족 관계 보관) 금지
    old = state.get(pid)
    t = rt
    since, below = TODAY, 0
    if old:
        ot, since, below = old[0], old[1], old[2] if len(old) > 2 else 0
        t = ot
        if rt < ot:                          # 승격
            t, since, below = rt, TODAY, 0
        elif rt > ot:                        # 강등 후보: 여유폭·연속 2주·보호기간
            below = below + 1 if s < thr.get(ot, 0) - MARGIN else 0
            protect = (ot == 1 and (p['current'] or days_since(since) < PROTECT_T1_DAYS))
            if below >= 2 and not protect:
                t, since, below = rt, TODAY, 0
        else:
            below = 0
        if minor and t == 1:
            t = 2
    if not old or old[0] != t:
        changes.append(dict(d=TODAY, id=pid, n=p['n'], fr=old[0] if old else None, to=t, s=s, why=p['off_why'] or p['kind']))
    state[pid] = [t, since, below]
    counts[t] += 1
    rec = dict(t=t, s=s, n=p['n'], k=p['kind'] or '기타', p=parts)
    if p['off_why']:
        rec['o'] = p['off_why']
    if minor:
        rec['minor'] = 1
    if p['current']:
        rec['cur'] = 1
    if p['news']:
        rec['m'] = p['news']
    out[pid] = rec

# 명부에서 빠진 사람은 지우지 않고 계층·기록 유지(유실 금지)
for pid, st in state.items():
    if pid not in out:
        out[pid] = dict(t=st[0], s=None, n='', k='', gone=1)
        counts[st[0]] += 1

est = {t: counts[t] * BYTES[t] for t in (1, 2, 3)}
summary = dict(updated=now_iso(), total=len(out), tiers={str(t): counts[t] for t in (1, 2, 3)},
               thresholds={'1': thr[1], '2': thr[2]}, caps={'1': CAP[1], '2': CAP[2]},
               storage_estimate_mb={str(t): round(est[t] / 1e6, 1) for t in est},
               storage_estimate_total_mb=round(sum(est.values()) / 1e6, 1),
               changes=len(changes), minors=sum(1 for x in scored if x[3]),
               by_kind={str(t): dict(collections.Counter(r['k'] for r in out.values() if r['t'] == t).most_common(12)) for t in (1, 2, 3)},
               sources={k: v for k, v in collections.Counter(s for p in C.values() for s in p['src']).most_common()})
save(os.path.join(TD, 'current.json.gz'), dict(updated=summary['updated'], thresholds=summary['thresholds'], people=out))
save(os.path.join(TD, 'state.json.gz'), state)
save(os.path.join(TD, 'summary.json'), summary, compact=False)
lp = append_log(os.path.join(TD, 'log'), changes)

# 사이트 공개용: 1·2계층 이름(이 목록에 없는 사람 = 3계층·미확인은 공개 관계도에서 빠짐). 이름 기준이라 동명이인은 보수적으로 같이 공개됨
t1 = sorted({r['n'] for r in out.values() if r['t'] == 1 and r['n']})
t2 = sorted({r['n'] for pid, r in out.items() if r['t'] == 2 and r['n']} - set(t1))
# 가족 관계 공개 목록: 1·2계층 중 뉴스에 3번 이상 나왔거나(우리 기사 색인), 출처 있는 공개 가족 관계(위키데이터 등)의 당사자.
# 흔한 이름의 동명이인이 남의 가족으로 공개되지 않도록 가족에는 더 엄격한 기준을 씀.
fam_ids = set()
for e in (load(os.path.join(PD, 'edges', 'current.json.gz'), {}) or {}).get('edges', []):
    if e.get('t') == 'family' and e.get('pub') and not e.get('gone'):
        fam_ids.update((e['a'], e['b']))
fam = sorted({r['n'] for pid, r in out.items() if r['t'] in (1, 2) and r['n'] and not r.get('minor') and ((r.get('m') or 0) >= 3 or pid in fam_ids)})
save(os.path.join(ROOT, 'people_public.json'), dict(updated=summary['updated'], v=1, t1=t1, t2=t2, fam=fam))
print('계층', dict(counts), '기준', thr, '변경', len(changes), '추정 저장량 MB', summary['storage_estimate_mb'], '기록', lp)
print('공개 이름', len(t1), len(t2), '가족 공개', len(fam))
