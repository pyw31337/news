#!/usr/bin/env python3
"""화면 관계도용 고정 id 관계 조각 만들기: python scripts/people/graph.py <data>

입력(data 브랜치): db/people/tiers/current.json.gz, db/people/edges/public.json.gz, db/people/registry.json.gz
출력(data 브랜치, 사이트 data/graph/로 복사):
  db/people/graph/n/NN.json.gz  이름 → {c: 같은 이름 1·2계층 인원, x: 후보 [[id, 계층, 분야, 설명, 출생연도, 점수, 국회id]]} (후보는 공개 관계가 있는 사람만)
  db/people/graph/e/NN.json.gz  id → {n, k, t, e:[[상대id, 유형, 세부, 신뢰도, 출처, 방향]], g:{모임id:[같은 모임 상위 인물 id…]}, L:{상대id:[이름,분야,계층]}}
  db/people/graph/meta.json  조각 수·건수
  NN = 해시 % SHARDS. 화면은 이름 조각 → 중심 id 확정(국회 id·위키데이터 id 우선, 이름만으로는 1명일 때만) → 관계 조각.
같은 사람 묶기: 국회 id(pol:)와 위키데이터(wd:)가 이름·정치 분야·출생연도(±1년)로 딱 1명 맞으면 같은 사람으로 보고 관계를 합친다.
출처 주소 줄임: 'wd'=관계 주체의 위키데이터 문서, 'na'=국회 의원 검색, 나머지는 원래 주소.
"""
import os, sys, json, gzip, hashlib, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pcommon import load, norm_name, now_iso

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'data'
PD = os.path.join(ROOT, 'db', 'people')
OUT = os.path.join(PD, 'graph')
SHARDS = 64
PEERS = 3
NA = 'https://open.assembly.go.kr/portal/assm/search/memberSchPage.do'


def shard(s):
    return int(hashlib.sha1(s.encode()).hexdigest()[:6], 16) % SHARDS


tiers = (load(os.path.join(PD, 'tiers', 'current.json.gz'), {}) or {}).get('people', {})
reg = {r['id']: r for r in (load(os.path.join(PD, 'registry.json.gz'), []) or [])}
edges = (load(os.path.join(PD, 'edges', 'public.json.gz'), {}) or {}).get('edges', [])
pub = {k: v for k, v in tiers.items() if v.get('t') in (1, 2) and not v.get('minor')}


def birth(pid):
    try:
        return int(str((reg.get(pid) or {}).get('b') or '')[:4])
    except ValueError:
        return None


# 1) 같은 사람 묶기(pol: → wd:)
by_name = collections.defaultdict(list)
for pid, r in pub.items():
    by_name[norm_name(r.get('n', ''))].append(pid)
canon = {}
for pid in pub:
    if not pid.startswith('pol:'):
        continue
    b = birth(pid)
    if not b:
        continue
    c = [q for q in by_name[norm_name(pub[pid].get('n', ''))] if q.startswith('wd:Q') and pub[q].get('k') == '정치'
         and birth(q) and abs(birth(q) - b) <= 1]
    if len(c) == 1:
        canon[pid] = c[0]
C = lambda x: canon.get(x, x)

# 2) id별 관계
E = collections.defaultdict(list)
groups = collections.defaultdict(set)
for e in edges:
    a, b = C(e['a']), C(e['b'])
    if a == b:
        continue
    src = e.get('src') or ''
    subj = None
    if src.startswith('https://www.wikidata.org/wiki/'):
        q = 'wd:' + src.rsplit('/', 1)[-1]
        subj = q if q in (e['a'], e['b']) else None
        if subj:
            subj = C(subj)
            src = 'wd'
    elif src == NA:
        src = 'na'
    conf = e.get('conf', 0.5)
    if b.startswith('g:'):
        if a in pub:
            E[a].append([b, e['t'], e.get('sub', ''), conf, src, 0])
            groups[b].add(a)
        continue
    if a not in pub or b not in pub:
        continue
    # 방향: 1 = 상대가 '나의 <세부>'(예: 상대가 나의 father), -1 = 내가 '상대의 <세부>', 0 = 모름/대칭
    da = 1 if subj == a else (-1 if subj == b else 0)
    E[a].append([b, e['t'], e.get('sub', ''), conf, src, da])
    E[b].append([a, e['t'], e.get('sub', ''), conf, src, -da])

score = lambda p: pub.get(p, {}).get('s', 0)
peers = {g: sorted(m, key=score, reverse=True) for g, m in groups.items()}

# 3) 조각 쓰기
os.makedirs(os.path.join(OUT, 'n'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'e'), exist_ok=True)
NS = [dict() for _ in range(SHARDS)]
NC = collections.Counter(norm_name(r.get('n', '')) for p, r in pub.items() if p not in canon and r.get('n'))
for pid, r in pub.items():
    if pid in canon or not E.get(pid):   # 관계 없는 사람은 후보로 싣지 않음(용량 절약). 대신 같은 이름 전체 인원수(c)를 남겨 동명이인 판단
        continue
    nm = r.get('n')
    if not nm:
        continue
    pols = [p[4:] for p, c in canon.items() if c == pid] if pid.startswith('wd:') else ([pid[4:]] if pid.startswith('pol:') else [])
    rg = reg.get(pid) or {}
    NS[shard(norm_name(nm))].setdefault(nm, {'c': NC[norm_name(nm)], 'x': []})['x'].append([pid, r['t'], r.get('k', ''), (rg.get('d') or '')[:24], birth(pid), round(r.get('s', 0), 1), pols])
for d in NS:
    for nm in d:
        d[nm]['x'].sort(key=lambda x: -x[5])
ES = [dict() for _ in range(SHARDS)]
nedge = 0
for pid, lst in E.items():
    if pid in canon or pid not in pub:
        continue
    seen, out = set(), []
    for x in sorted(lst, key=lambda x: (-x[3], x[0])):
        k = (x[0], x[1], x[2])
        if k in seen:
            continue
        seen.add(k)
        out.append(x)
    g = {}
    L = {}
    for x in out:
        o = x[0]
        if o.startswith('g:'):
            ps = [p for p in peers.get(o, []) if p != pid][:PEERS]
            if ps:
                g[o] = ps
                for p in ps:
                    L[p] = [pub[p].get('n'), pub[p].get('k', ''), pub[p]['t']]
        else:
            L[o] = [pub[o].get('n'), pub[o].get('k', ''), pub[o]['t']]
    r = pub[pid]
    ES[shard(pid)][pid] = {'n': r.get('n'), 'k': r.get('k', ''), 't': r['t'], 'e': out, 'g': g, 'L': L}
    nedge += len(out)
for i in range(SHARDS):
    for kind, data in (('n', NS[i]), ('e', ES[i])):
        raw = json.dumps(data, ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode()
        with open(os.path.join(OUT, kind, '%02d.json.gz' % i), 'wb') as f:   # 화면은 DecompressionStream으로 풂(Pages 용량 1/4)
            f.write(gzip.compress(raw, 9, mtime=0))
meta = {'updated': now_iso(), 'shards': SHARDS, 'names': sum(len(d) for d in NS), 'people_with_edges': sum(len(d) for d in ES),
        'edges': nedge, 'merged_pol_wd': len(canon)}
with open(os.path.join(OUT, 'meta.json'), 'w') as f:
    json.dump(meta, f, ensure_ascii=False, indent=1)
print(json.dumps(meta, ensure_ascii=False))
