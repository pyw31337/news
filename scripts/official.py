#!/usr/bin/env python3
"""공식 통계·공시: 한국은행 ECOS 100대 지표(금리·환율·물가) + OpenDART 오늘 공시 → data/official.json
환경변수 ECOS_API_KEY, DART_API_KEY (없으면 해당 부분 건너뜀). 키는 로그·파일에 남기지 않음."""
import os, json, datetime as dt, urllib.request
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST)
EK, DK = os.environ.get('ECOS_API_KEY', '').strip(), os.environ.get('DART_API_KEY', '').strip()
diag = dict(step='official', at=NOW.isoformat(), ok={}, fail={}, errors=[])
def mask(s):
    for k in (EK, DK):
        if k: s = s.replace(k, '***')
    return s
def get(u):
    try: return json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'NewsBoard'}), timeout=25).read())
    except Exception as e: diag['errors'].append(dict(t=NOW.isoformat(), msg=mask('%s %s' % (u.split('/')[2], e))[:200])); return None
OUT = dict(updated=NOW.isoformat())
WANT = ('기준금리', '콜금리', 'CD', '국고채', '회사채', '원/달러', '원/엔', '원/유로', '원/위안', '소비자물가', '생산자물가', '경제성장률', '실업률', '경상수지', 'M2', '가계', 'KOSPI', 'KOSDAQ')
if EK:
    j = get('https://ecos.bok.or.kr/api/KeyStatisticList/%s/json/kr/1/100' % EK)
    rows = ((j or {}).get('KeyStatisticList') or {}).get('row') or []
    OUT['ecos'] = [dict(name=r.get('KEYSTAT_NAME'), group=r.get('CLASS_NAME'), value=r.get('DATA_VALUE'), unit=r.get('UNIT_NAME'), cycle=r.get('CYCLE'))
                   for r in rows if any(w in (r.get('KEYSTAT_NAME') or '') for w in WANT)]
    diag['ok' if OUT['ecos'] else 'fail']['ecos'] = len(OUT['ecos']) or 1
    if j and not rows: diag['errors'].append(dict(t=NOW.isoformat(), msg=mask(json.dumps(j, ensure_ascii=False))[:200]))
if DK:
    L = []
    for cls in ('Y', 'K'):
        for pg in (1, 2):
            j = get('https://opendart.fss.or.kr/api/list.json?crtfc_key=%s&corp_cls=%s&page_no=%d&page_count=100' % (DK, cls, pg))
            if not j or j.get('status') != '000':
                if j and j.get('status') != '013': diag['errors'].append(dict(t=NOW.isoformat(), msg='dart %s %s' % (j.get('status'), j.get('message'))))
                break
            L += j.get('list') or []
            if pg >= int(j.get('total_page', 1)): break
    OUT['dart'] = [dict(corp=x['corp_name'], code=x.get('stock_code'), cls=x.get('corp_cls'), title=x['report_nm'].strip(), date=x['rcept_dt'],
                        url='https://dart.fss.or.kr/dsaf001/main.do?rcpNo=' + x['rcept_no']) for x in L]
    diag['ok' if L else 'fail']['dart'] = len(L) or 1
    # 엔티티(화제>기업)와 연결
    try:
        D = json.load(open(os.path.join(ROOT, 'today.json')))
        names = {e['name'] for e in D.get('entities', []) if e.get('type') == 'org'}
        OUT['dart_by_entity'] = {n: [x for x in OUT['dart'] if n in x['corp'] or x['corp'] in n][:10] for n in names}
        OUT['dart_by_entity'] = {k: v for k, v in OUT['dart_by_entity'].items() if v}
    except Exception: pass
    if L:  # 월별 누적
        p = os.path.join(ROOT, 'db', 'dart', NOW.strftime('%Y-%m') + '.json'); os.makedirs(os.path.dirname(p), exist_ok=True)
        try: old = json.load(open(p))
        except Exception: old = []
        have = {x['url'] for x in old}; old += [x for x in OUT['dart'] if x['url'] not in have]
        json.dump(old, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
if 'ecos' in OUT or 'dart' in OUT:
    json.dump(OUT, open(os.path.join(ROOT, 'official.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(diag, open(os.path.join(ROOT, 'diag_official.json'), 'w'), ensure_ascii=False)
print('official', diag['ok'], diag['fail'], [e['msg'][:90] for e in diag['errors']][:3])
