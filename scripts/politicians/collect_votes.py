#!/usr/bin/env python3
"""본회의 표결 수집(열린국회정보, 키 필요·한국 IP). 대수별 처리안건 표결결과 + 안건별 의원 표결.
결과: PDATA/votes_<대수>.json(안건 단위 찬반 집계), people/<코드>.json의 votes(찬성·반대·기권·불참 집계, 반대·기권 목록, 최근 표결)
환경: ASSEMBLY_KEY, VOTE_AGES(기본 21,22)"""
import json, os, sys, glob, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import collect_assembly as A
P = sys.argv[1]; AGES = (os.environ.get('VOTE_AGES') or '21,22').split(',')
if not A.KEY: print('ASSEMBLY_KEY 없음 → 건너뜀'); sys.exit(0)
idx = json.load(open(f'{P}/index.json', encoding='utf-8'))
byname = {}
for e in idx['people']: byname.setdefault(e['name'], []).append(e['id'])
per = {}  # pid -> list
total = 0
for age in AGES:
    bills = A.all_rows('ncocpgfiaoituanbr', AGE=age)
    def votes(b):
        return b, A.all_rows('nojepdqqaweusdfbi', workers=1, AGE=age, BILL_ID=b['BILL_ID'])
    out = []
    with cf.ThreadPoolExecutor(6) as ex:
        for b, rows in ex.map(votes, bills):
            out.append({'id': b['BILL_ID'], 'no': b['BILL_NO'], 'name': b['BILL_NAME'], 'date': b.get('PROC_DT'), 'result': b.get('PROC_RESULT_CD'),
                        'yes': b.get('YES_TCNT'), 'no_': b.get('NO_TCNT'), 'blank': b.get('BLANK_TCNT'), 'total': b.get('MEMBER_TCNT'), 'url': b.get('LINK_URL')})
            for r in rows:
                pid = r.get('MONA_CD')
                if not pid:
                    c = byname.get(r.get('HG_NM'), [])
                    pid = c[0] if len(c) == 1 else None
                if not pid: continue
                per.setdefault(pid, []).append((age, b['BILL_ID'], b['BILL_NAME'], b.get('PROC_DT'), r.get('RESULT_VOTE_MOD')))
                total += 1
    json.dump(out, open(f'{P}/votes_{age}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('age', age, 'bills voted', len(out), flush=True)
cnt = {}
for pid, L in per.items():
    path = f'{P}/people/{pid}.json'
    if not os.path.exists(path): continue
    d = json.load(open(path, encoding='utf-8'))
    s = {}
    for a, *_x, v in L: s.setdefault(a, {}); s[a][v] = s[a].get(v, 0) + 1
    L.sort(key=lambda x: x[3] or '', reverse=True)
    d['votes'] = {'ages': AGES, 'summary': s, 'count': len(L),
                  'dissent': [{'age': a, 'id': i, 'name': n, 'date': dt, 'vote': v} for a, i, n, dt, v in L if v in ('반대', '기권')][:200],
                  'recent': [{'age': a, 'id': i, 'name': n, 'date': dt, 'vote': v} for a, i, n, dt, v in L[:30]],
                  'source': {'name': '열린국회정보 국회의원 본회의 표결정보 API', 'url': A.SRC, 'fetched': A.TODAY}}
    json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); cnt[pid] = len(L)
for e in idx['people']:
    if e['id'] in cnt: e['votes'] = cnt[e['id']]
idx['votes_rows'] = total; idx['vote_ages'] = AGES
json.dump(idx, open(f'{P}/index.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('vote rows', total, 'people', len(cnt))
