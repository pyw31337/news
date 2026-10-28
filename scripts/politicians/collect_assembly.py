#!/usr/bin/env python3
"""열린국회정보 Open API → 정치인 DB (사람별 JSON + 인덱스).
키가 없으면 호출당 5건 제한으로 천천히 페이징, ASSEMBLY_KEY 환경변수가 있으면 1000건씩.
해외 IP(GitHub Actions)는 막힐 수 있어 한국 IP(회사 맥미니)에서 돌리는 것이 기본.
사용: python collect_assembly.py OUT_DIR [--bills-ages 22]"""
import json, os, sys, time, re, urllib.request, urllib.parse, concurrent.futures as cf, datetime as dt
OUT = sys.argv[1] if len(sys.argv) > 1 else 'pdata'
AGES = [a for a in (os.environ.get('BILL_AGES') or '22').split(',') if a]
KEY = os.environ.get('ASSEMBLY_KEY', '').strip()
PS = 1000 if KEY else 5
UA = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130 Safari/537.36 NewsBoard-politicians'
B = 'https://open.assembly.go.kr/portal/openapi/'
TODAY = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).strftime('%Y-%m-%d')
SRC = 'https://open.assembly.go.kr'

def call(svc, p, **q):
    q = dict(q); q.update(Type='json', pIndex=p, pSize=PS)
    if KEY: q['KEY'] = KEY
    u = B + svc + '?' + urllib.parse.urlencode(q)
    for n in range(4):
        try:
            r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=30)
            d = json.loads(r.read().decode('utf-8'))
            if svc not in d: return 0, []
            return d[svc][0]['head'][0]['list_total_count'], d[svc][1]['row']
        except Exception as e:
            time.sleep(2 + n * 3)
    print('fail', u, flush=True); return 0, []

def all_rows(svc, workers=6, **q):
    tot, rows = call(svc, 1, **q)
    pages = (tot + PS - 1) // PS
    with cf.ThreadPoolExecutor(workers) as ex:
        for r in ex.map(lambda p: call(svc, p, **q)[1], range(2, pages + 1)):
            rows += r
    print(svc, q, 'total', tot, 'got', len(rows), flush=True)
    return rows

# 같은 계보의 당명 변경·합당 계승(당적 이동으로 세지 않음). 필요하면 계속 추가
LINEAGE = [['민주정의당', '민주자유당', '신한국당', '한나라당', '새누리당', '자유한국당', '미래통합당', '국민의힘'],
           ['새천년민주당', '열린우리당', '대통합민주신당', '통합민주당', '민주당', '민주통합당', '새정치민주연합', '더불어민주당'],
           ['국민의당', '바른미래당'], ['정의당', '녹색정의당']]
LIN = {p: i for i, L in enumerate(LINEAGE) for p in L}
def split(s): return [x.strip() for x in (s or '').split('/')] if s else []
def ages(s): return [int(x) for x in re.findall(r'제(\d+)대', s or '')]

def main():
    os.makedirs(OUT + '/people', exist_ok=True)
    if KEY:
        allm = all_rows('ALLNAMEMBER')
        cur = {r['MONA_CD']: r for r in all_rows('nwvrqwxyaytdsfvhu')}
    else:  # 키 없음: 위키백과 역대 의원 목록에서 뽑은 이름(seed_names.txt)으로 한 명씩 조회
        seeds = [l.strip() for l in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seed_names.txt'), encoding='utf-8') if l.strip()]
        with cf.ThreadPoolExecutor(6) as ex:
            res = list(ex.map(lambda n: call('ALLNAMEMBER', 1, NAAS_NM=n)[1], seeds))
        allm = [r for rs in res for r in rs]
        n22 = sorted({r['NAAS_NM'] for r in allm if '제22대' in (r.get('GTELT_ERACO') or '')})
        with cf.ThreadPoolExecutor(6) as ex:
            res = list(ex.map(lambda n: call('nwvrqwxyaytdsfvhu', 1, HG_NM=n)[1], n22))
        cur = {r['MONA_CD']: r for rs in res for r in rs}
        print('keyless: seeds', len(seeds), 'members', len(allm), 'current', len(cur), flush=True)
    allm = list({r['NAAS_CD']: r for r in allm}.values())
    idx = []
    for r in allm:
        cd = r['NAAS_CD']; a = ages(r.get('GTELT_ERACO'))
        parties, dists, kinds = split(r.get('PLPT_NM')), split(r.get('ELECD_NM')), split(r.get('ELECD_DIV_NM'))
        # 대수별 정당·지역구 (API는 '/'로 대수 순서대로 이어 붙임; 개수가 다르면 마지막 값 유지)
        terms = []
        for i, g in enumerate(a):
            pick = lambda L: (L[i] if i < len(L) else (L[-1] if L else None)) or None
            terms.append({'age': g, 'party': pick(parties), 'district': pick(dists), 'kind': pick(kinds)})
        switches = []
        for p, q in zip(terms, terms[1:]):
            if p['party'] and q['party'] and p['party'] != q['party']:
                same = p['party'] in LIN and LIN.get(p['party']) == LIN.get(q['party'])
                switches.append({'from': p['party'], 'to': q['party'], 'between': [p['age'], q['age']], 'kind': 'rename' if same else 'switch'})
        c = cur.get(cd, {})
        hist = [l.strip() for l in (c.get('MEM_TITLE') or r.get('BRF_HST') or '').replace('\r', '').split('\n') if l.strip()]
        P = {
            'id': cd, 'name': r['NAAS_NM'], 'hanja': r.get('NAAS_CH_NM'), 'en': r.get('NAAS_EN_NM'),
            'birth': r.get('BIRDY_DT'), 'sex': r.get('NTR_DIV'), 'type': 'national_assembly',
            'current': bool(c), 'party': (c.get('POLY_NM') if c else (terms[-1]['party'] if terms else None)),
            'district': c.get('ORIG_NM') if c else (terms[-1]['district'] if terms else None),
            'reelect': r.get('RLCT_DIV_NM'), 'ages': a, 'terms': terms, 'party_switches': switches,
            'committees': c.get('CMITS') or r.get('BLNG_CMIT_NM'), 'office': c.get('ASSEM_ADDR'),
            'homepage': c.get('HOMEPAGE') or r.get('NAAS_HP_URL'), 'email': c.get('E_MAIL'),
            'photo': r.get('NAAS_PIC'), 'photo_credit': '대한민국 국회 (열린국회정보 공개 사진)',
            'history': hist,
            'sources': [{'name': '열린국회정보 국회의원 정보통합 API(ALLNAMEMBER)', 'url': SRC + '/portal/data/service/selectAPIServicePage.do/OOWY4R001216HX11439', 'fetched': TODAY}]
              + ([{'name': '열린국회정보 국회의원 인적사항(nwvrqwxyaytdsfvhu)', 'url': SRC, 'fetched': TODAY}] if c else []),
        }
        path = f'{OUT}/people/{cd}.json'
        old = {}
        if os.path.exists(path):
            try: old = json.load(open(path, encoding='utf-8'))
            except Exception: pass
        for k in ('bills', 'news', 'incidents', 'media', 'wikidata', 'assets', 'votes'):  # 다른 수집기가 채운 칸은 보존
            if k in old: P[k] = old[k]
        json.dump(P, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        if os.path.exists(f'{OUT}/photos/{cd}.webp'): P['photo_local'] = f'data/pol/photos/{cd}.webp'
        json.dump(P, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        idx.append({'photo_local': P.get('photo_local')} | {k: P[k] for k in ('id', 'name', 'hanja', 'party', 'district', 'current', 'ages', 'reelect', 'photo', 'birth', 'sex')} | {'switches': sum(1 for s in switches if s['kind'] == 'switch')})
    # 법안 (대표발의/공동발의)
    bills_by = {}
    allb = []
    for age in (AGES if KEY else []):  # 법안은 키가 있어야 전체 수집 가능(키 없으면 5건 샘플만 나옴)
        rows = all_rows('nzmimeepazxkubdpn', AGE=age)
        for b in rows:
            res = b.get('PROC_RESULT') or '계류'
            o = {'id': b['BILL_ID'], 'no': b['BILL_NO'], 'name': b['BILL_NAME'], 'date': b.get('PROPOSE_DT'), 'age': int(age),
                 'committee': b.get('COMMITTEE'), 'result': res, 'proc_date': b.get('PROC_DT'), 'url': b.get('DETAIL_LINK'), 'proposer': b.get('PROPOSER')}
            allb.append(o)
            for cd in (b.get('RST_MONA_CD') or '').split(','):
                if cd: bills_by.setdefault(cd.strip(), {'lead': [], 'co': []})['lead'].append(o['id'])
            for cd in (b.get('PUBL_MONA_CD') or '').split(','):
                if cd: bills_by.setdefault(cd.strip(), {'lead': [], 'co': []})['co'].append(o['id'])
        json.dump(allb_age := [x for x in allb if x['age'] == int(age)], open(f'{OUT}/bills_{age}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    B_ = {b['id']: b for b in allb}
    PASSED = ('원안가결', '수정가결', '대안반영폐기', '수정안반영폐기')
    for e in idx:
        bb = bills_by.get(e['id'])
        if not bb: continue
        path = f'{OUT}/people/{e["id"]}.json'; P = json.load(open(path, encoding='utf-8'))
        lead = [B_[i] for i in bb['lead']]
        by_res = {}
        for b in lead: by_res[b['result']] = by_res.get(b['result'], 0) + 1
        by_month = {}
        for b in lead: by_month[(b['date'] or '')[:7]] = by_month.get((b['date'] or '')[:7], 0) + 1
        P['bills'] = {'ages': AGES, 'lead_count': len(lead), 'co_count': len(bb['co']),
                      'passed': sum(1 for b in lead if b['result'] in PASSED), 'by_result': by_res,
                      'by_month': dict(sorted(by_month.items())),
                      'recent': sorted(lead, key=lambda b: b['date'] or '', reverse=True)[:30],
                      'source': {'name': '열린국회정보 국회의원 발의법률안 API', 'url': SRC, 'fetched': TODAY}}
        json.dump(P, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        e['lead'] = len(lead); e['passed'] = P['bills']['passed']; e['co'] = len(bb['co'])
    idx.sort(key=lambda e: (not e['current'], e['name']))
    json.dump({'updated': TODAY, 'count': len(idx), 'current': sum(e['current'] for e in idx), 'bills': len(allb), 'bill_ages': AGES,
               'people': idx}, open(f'{OUT}/index.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('people', len(idx), 'current', sum(e['current'] for e in idx), 'bills', len(allb))

if __name__ == '__main__': main()

