#!/usr/bin/env python3
"""공공데이터포털(data.go.kr) 수집 — 맥미니(국내 IP)에서 실행.
data.go.kr 게이트웨이는 해외 IP(GitHub Actions 등)를 막아서 SSL 끊김/500/403이 나요. 그래서 이 스크립트는 맥미니 launchd(com.pyw31337.newsboard-gov)가 매시 실행해 data 브랜치 gov/ 에 올립니다.
출력: data/briefs.json(재정경제부 보도자료), data/gov/{alerts,stocks,apt,winners_*,status}.json
환경변수 DATA_GO_KR_KEY. 키는 로그·파일에 남기지 않음. API별 하루 1만 회 한도 → 하루 약 300회 이하로 사용."""
import os, sys, json, re, html, time, datetime as dt, urllib.request, urllib.parse, xml.etree.ElementTree as ET
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data'); G = os.path.join(D, 'gov'); os.makedirs(G, exist_ok=True)
KEY = urllib.parse.unquote(os.environ.get('DATA_GO_KR_KEY', '').strip())
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST); TODAY = NOW.strftime('%Y%m%d')
ST = {'at': NOW.isoformat(), 'calls': {}, 'ok': {}, 'err': {}}
def load(n, d):
    try: return json.load(open(os.path.join(G, n)))
    except Exception: return d
def save(n, o, root=G): json.dump(o, open(os.path.join(root, n), 'w'), ensure_ascii=False, separators=(',', ':'))
def call(name, path, **q):
    ST['calls'][name] = ST['calls'].get(name, 0) + 1
    u = 'https://apis.data.go.kr/' + path + '?serviceKey=' + urllib.parse.quote(KEY, safe='') + '&' + urllib.parse.urlencode(q)
    for i in range(3):
        try:
            b = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'NewsBoard'}), timeout=30).read().decode('utf-8', 'replace')
            if 'SERVICE_KEY' in b[:400] or 'LIMITED_NUMBER' in b[:400]: raise RuntimeError(re.sub(r'\s+', ' ', b[:160]))
            return b
        except Exception as e:
            err = str(e).replace(KEY, '***')[:160]; time.sleep(2 + i * 3)
    ST['err'][name] = err; return ''
def rows(b):
    if not b: return []
    if b.lstrip().startswith('{'):
        try:
            j = json.loads(b); r = j.get('response', j); body = r.get('body', {}) if isinstance(r, dict) else {}
            it = body.get('items') or {}; it = it.get('item', []) if isinstance(it, dict) else it
            return it if isinstance(it, list) else [it]
        except Exception: return []
    try: return [dict({c.tag: (c.text or '').strip() for c in e}, _files=[((f.findtext('fileName') or '').strip(), (f.findtext('fileUrl') or '').strip()) for f in e.iter('file')]) for e in ET.fromstring('<r>' + re.sub(r'^\s*<\?xml[^>]*\?>', '', b) + '</r>').iter('item')]
    except Exception: return []
ymd = lambda d: d.strftime('%Y%m%d')

def briefs():  # 재정경제부 보도자료: start_date·end_date(YYYYMMDD) 필수, pageUnit = 페이지당 건수
    L, seen = [], set()
    for back in range(0, 10):  # 페이지 넘김(pageNo)이 동작하지 않고 한 번에 10건만 와서 하루 단위로 조회
        d = ymd(NOW - dt.timedelta(days=back))
        for r in rows(call('brief', '1053000/brief/list', pageNo=1, pageUnit=10, start_date=d, end_date=d)):
            if r.get('itemId') not in seen: seen.add(r.get('itemId')); L.append(r)
    out = []
    for r in L:
        t = html.unescape(re.sub(r'<[^>]+>', '', r.get('title', ''))).strip()
        if not t: continue
        m = re.match(r'(\d+)/(\d+)/(\d{4})', r.get('registDate', '')); d = '%s-%s-%s' % (m[3], m[1].zfill(2), m[2].zfill(2)) if m else ''
        body = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', r.get('contents', '')))).strip()
        body = re.sub(r'\s*문의\..*$', '', body)[:220]
        out.append(dict(id=r.get('itemId', ''), title=t, date=d, dept=' '.join(x for x in (r.get('divisionName', ''), r.get('deptName', '')) if x), summary=body,
                        url=next((u for n, u in r.get('_files', []) if n.lower().endswith('.pdf')), next((u for n, u in r.get('_files', []) if u), 'https://www.mofe.go.kr/nw/nes/nesdta.do')),
                        files=[n for n, u in r.get('_files', [])][:3]))
    ST['ok']['brief'] = len(out)
    if not out: return
    p = os.path.join(D, 'db', 'briefs'); os.makedirs(p, exist_ok=True); p = os.path.join(p, NOW.strftime('%Y-%m') + '.json')
    try: old = [x for x in json.load(open(p)) if x.get('id')]
    except Exception: old = []
    have = {x['id'] for x in old}; old += [x for x in out if x['id'] not in have]; json.dump(old, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    allx = {x['id']: x for x in old + out}.values()
    save('briefs.json', dict(updated=NOW.isoformat(), source='재정경제부 보도자료(공공데이터포털)', items=sorted(allx, key=lambda x: (x['date'], x['id']), reverse=True)[:60]), D)

def alerts():  # 지진(최대 3일 전부터)·기상특보(최대 6일 전부터) → 이슈 신호
    A = load('alerts.json', {'quakes': [], 'warnings': []})
    q = rows(call('quake', '1360000/EqkInfoService/getEqkMsg', dataType='JSON', numOfRows=50, pageNo=1, fromTmFc=ymd(NOW - dt.timedelta(days=3)), toTmFc=TODAY))
    have = {x['id'] for x in A['quakes']}
    for r in q:
        i = str(r.get('tmEqk', '')) + str(r.get('fcTp', ''))
        if i in have: continue
        t = str(r.get('tmEqk', '')); A['quakes'].append(dict(id=i, t='%s-%s-%s %s:%s' % (t[:4], t[4:6], t[6:8], t[8:10], t[10:12]), mag=r.get('mt'), loc=r.get('loc', ''), depth=r.get('dep'), note=(r.get('rem') or '').split('\n')[0], img=r.get('img', ''), domestic='국내영향없음' not in (r.get('rem') or '') and not re.search(r'일본|중국|대만|북한 |해역 [^ ]*일본', r.get('loc', ''))))
    w = rows(call('warn', '1360000/WthrWrnInfoService/getWthrWrnList', dataType='JSON', numOfRows=60, pageNo=1, stnId=108, fromTmFc=ymd(NOW - dt.timedelta(days=6)), toTmFc=TODAY))
    have = {x['id'] for x in A['warnings']}
    for r in w:
        i = '%s-%s' % (r.get('tmFc'), r.get('tmSeq'))
        if i in have: continue
        t = str(r.get('tmFc', '')); title = re.sub(r'^\[특보\]\s*제[\d-]+호\s*:\s*[\d.: ]+/\s*', '', r.get('title', '')).replace('(*)', '').strip()
        A['warnings'].append(dict(id=i, t='%s-%s-%s %s:%s' % (t[:4], t[4:6], t[6:8], t[8:10], t[10:12]), title=title, lift='해제' in title))
    A['quakes'] = sorted(A['quakes'], key=lambda x: x['t'], reverse=True)[:200]; A['warnings'] = sorted(A['warnings'], key=lambda x: x['t'], reverse=True)[:300]
    A['updated'] = NOW.isoformat(); ST['ok']['quake'] = len(q); ST['ok']['warn'] = len(w); save('alerts.json', A)

def stocks():  # 금융위 주식시세: 날짜(basDt) 한 번 호출로 전 종목 → 시총 상위 300 종목 일별 종가 120영업일 보관
    S = load('stocks.json', {'days': {}, 'names': {}})
    if S.get('checked') == TODAY + NOW.strftime('%H')[:1] and S['days']: return  # 10시간 단위로만 확인
    for back in range(0, 130):
        d = ymd(NOW - dt.timedelta(days=back))
        if d in S['days'] or dt.datetime.strptime(d, '%Y%m%d').weekday() > 4: continue
        if len(S['days']) >= 90 and back > 10: break
        if ST['calls'].get('stock', 0) >= 40: break  # 1회 실행당 최대 40회(백필은 며칠에 나눠서)
        L = rows(call('stock', '1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo', resultType='json', numOfRows=3000, pageNo=1, basDt=d))
        if ST['err'].get('stock'): break
        if not L: continue
        L = sorted(L, key=lambda r: -int(r.get('mrktTotAmt') or 0))[:300]
        S['days'][d] = {r['srtnCd']: [int(r.get('clpr') or 0), float(r.get('fltRt') or 0), int(int(r.get('mrktTotAmt') or 0) / 1e8)] for r in L}
        for r in L: S['names'][r['srtnCd']] = [r.get('itmsNm', ''), r.get('mrktCtg', '')]
    S['days'] = dict(sorted(S['days'].items())[-120:]); S['checked'] = TODAY + NOW.strftime('%H')[:1]; S['updated'] = NOW.isoformat()
    ST['ok']['stock'] = len(S['days']); save('stocks.json', S)

SEOUL = {'11110': '종로', '11140': '중구', '11170': '용산', '11200': '성동', '11215': '광진', '11230': '동대문', '11260': '중랑', '11290': '성북', '11305': '강북', '11320': '도봉', '11350': '노원', '11380': '은평', '11410': '서대문', '11440': '마포', '11470': '양천', '11500': '강서', '11530': '구로', '11545': '금천', '11560': '영등포', '11590': '동작', '11620': '관악', '11650': '서초', '11680': '강남', '11710': '송파', '11740': '강동'}
def apt():  # 국토부 실거래가: 서울 25개 구 × 월별(매매·전월세) → 구별 중위가·거래량. 지난달 이전은 한 번만, 최근 2개월은 하루 1번 갱신
    A = load('apt.json', {'trade': {}, 'rent': {}, 'fetched': {}})
    ms = []; y, m = NOW.year, NOW.month
    for _ in range(25): ms.append('%04d%02d' % (y, m)); y, m = (y, m - 1) if m > 1 else (y - 1, 12)
    for kind, path in (('trade', '1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev'), ('rent', '1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent')):
        for i, ym in enumerate(ms):
            for cd, gu in SEOUL.items():
                k = '%s:%s:%s' % (kind, ym, cd); f = A['fetched'].get(k)
                if f and (i >= 2 or f == TODAY): continue
                if ST['calls'].get(kind, 0) >= 150: break
                prices, n, pg = [], 0, 1
                while pg < 8:
                    L = rows(call(kind, path, LAWD_CD=cd, DEAL_YMD=ym, numOfRows=1000, pageNo=pg))
                    for r in L:
                        if (r.get('cdealType') or '').strip(): continue  # 해제된 거래 제외
                        a = float(r.get('excluUseAr') or 0) or 1
                        if kind == 'trade': v = int((r.get('dealAmount') or '0').replace(',', '')); prices.append(v / a * 3.3058)  # 만원/평
                        elif not int((r.get('monthlyRent') or '0').replace(',', '') or 0): prices.append(int((r.get('deposit') or '0').replace(',', '')) / a * 3.3058)  # 전세만
                        n += 1
                    if len(L) < 1000: break
                    pg += 1
                if ST['err'].get(kind): break
                prices.sort(); A[kind].setdefault(ym, {})[gu] = [n, round(prices[len(prices) // 2]) if prices else 0]
                A['fetched'][k] = TODAY
    for kind in ('trade', 'rent'): A[kind] = dict(sorted(A[kind].items()))
    A['updated'] = NOW.isoformat(); ST['ok']['apt'] = sum(len(v) for v in A['trade'].values()); save('apt.json', A)

EL = {'20180613': '제7회 지방선거', '20220601': '제8회 지방선거', '20260603': '제9회 지방선거', '20200415': '제21대 총선', '20240410': '제22대 총선'}
TY = {'2': '국회의원', '7': '국회의원(비례)', '3': '시·도지사', '4': '구·시·군의 장', '5': '시·도의원', '6': '구·시·군의원', '8': '광역의원(비례)', '9': '기초의원(비례)', '11': '교육감'}
def winners():  # 선관위 당선인 — 선거별 1회(이후 30일마다 재확인)
    for sg, nm in EL.items():
        fn = 'winners_%s.json' % sg; old = load(fn, None)
        if old and old.get('checked', '') > ymd(NOW - dt.timedelta(days=30)): continue
        out = []; tys = ('2', '7') if nm.endswith('총선') else ('3', '4', '5', '6', '8', '9', '11')
        for t in tys:
            pg = 1
            while pg < 60:
                L = rows(call('winner', '9760000/WinnerInfoInqireService2/getWinnerInfoInqire', resultType='json', numOfRows=100, pageNo=pg, sgId=sg, sgTypecode=t))
                for r in L: out.append([r.get('name', ''), r.get('jdName', ''), TY[t], r.get('sdName', ''), r.get('sggName', ''), r.get('wiwName', ''), r.get('birthday', ''), r.get('gender', ''), r.get('dugyul', ''), (r.get('career1') or '')[:60], r.get('huboid', '')])
                if len(L) < 100: break
                pg += 1
        if out: save(fn, dict(sgId=sg, name=nm, checked=TODAY, cols=['name', 'party', 'type', 'sd', 'sgg', 'wiw', 'birth', 'gender', 'rate', 'career', 'id'], rows=out)); ST['ok'][fn] = len(out)

if __name__ == '__main__':
    if not KEY: print('no key'); sys.exit(0)
    only = sys.argv[1:]
    for f in (briefs, alerts, stocks, apt, winners):
        if only and f.__name__ not in only: continue
        try: f()
        except Exception as e: ST['err'][f.__name__] = str(e).replace(KEY, '***')[:200]
    prev = load('status.json', {}); ST['history'] = (prev.get('history', []) + [dict(at=ST['at'], calls=sum(ST['calls'].values()), err=len(ST['err']))])[-200:]
    day = TODAY; dc = prev.get('daily', {}); dd = dc.get(day, {}); [dd.__setitem__(k, dd.get(k, 0) + v) for k, v in ST['calls'].items()]; ST['daily'] = {day: dd, **{k: v for k, v in dc.items() if k != day and k >= ymd(NOW - dt.timedelta(days=14))}}
    save('status.json', ST); print(json.dumps({k: ST[k] for k in ('calls', 'ok', 'err')}, ensure_ascii=False))
