#!/usr/bin/env python3
"""마켓 상세 화면 데이터(30분마다, collect): data/market_detail.json
오늘 화면의 증시·환율 카드(enrich.py market())를 누르면 보는 상세 정보. 네이버 증권·토스증권 구성을 참고:
  - 차트: 최근 60거래일(날짜·시가·고가·저가·종가) + 장기 2년(일별 종가, 야후 파이낸스)
  - 시세: 전일·시가·고가·저가·거래량·거래대금·52주 최고/최저 (지수)
  - 투자자별 매매(개인·외국인·기관), 상승·하락 종목 수, 시가총액 상위 구성 종목 (국내 지수)
  - 환율: 현찰 살 때·팔 때, 송금 보낼 때·받을 때 (하나은행 고시)
실패한 항목은 지난 값을 그대로 둠(화면이 비지 않게)."""
import os, json, urllib.request, urllib.parse, datetime as dt
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data'); P = os.path.join(ROOT, 'market_detail.json')
KST = dt.timezone(dt.timedelta(hours=9)); UA = {'User-Agent': 'Mozilla/5.0 (NewsBoard)'}
def get(u):
    for _ in range(2):
        try: return json.loads(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=15).read())
        except Exception: pass
    return None
num = lambda s: float(str(s).replace(',', '')) if s not in (None, '', 'N/A') else None
def yahoo(sym, scale=1):
    j = get('https://query1.finance.yahoo.com/v8/finance/chart/%s?range=2y&interval=1d' % urllib.parse.quote(sym))
    try:
        r = j['chart']['result'][0]; c = r['indicators']['quote'][0]['close']
        pts = [(dt.datetime.fromtimestamp(t, KST).strftime('%Y-%m-%d'), round(v * scale, 4)) for t, v in zip(r['timestamp'], c) if v is not None]
        return dict(d=[p[0] for p in pts], c=[p[1] for p in pts])
    except Exception: return None
def kr_index(code):
    o = {}
    pr = get('https://m.stock.naver.com/api/index/%s/price?pageSize=60&page=1' % code)
    if isinstance(pr, list) and pr:
        pr = list(reversed(pr)); o['day'] = dict(d=[x['localTradedAt'][:10] for x in pr], o=[num(x.get('openPrice')) for x in pr], h=[num(x.get('highPrice')) for x in pr],
                                                 l=[num(x.get('lowPrice')) for x in pr], c=[num(x['closePrice']) for x in pr])
    it = get('https://m.stock.naver.com/api/index/%s/integration' % code) or {}
    o['info'] = [[i['key'], i['value']] for i in it.get('totalInfos', [])]
    if it.get('description'): o['desc'] = it['description']
    d = it.get('dealTrendInfo') or {}
    if d: o['deal'] = dict(date=d.get('bizdate'), 개인=num(d.get('personalValue')), 외국인=num(d.get('foreignValue')), 기관=num(d.get('institutionalValue')))
    u = it.get('upDownStockInfo') or {}
    if u: o['updown'] = {k: int(num(u.get(f)) or 0) for k, f in (('상한', 'upperCount'), ('상승', 'riseCount'), ('보합', 'steadyCount'), ('하락', 'fallCount'), ('하한', 'lowerCount'))}
    o['members'] = [dict(name=s['stockName'], code=s['itemCode'], price=s.get('closePrice'), rate=num(s.get('fluctuationsRatio')), cap=num(s.get('marketValue')), url=s.get('endUrl'))
                    for s in (it.get('enrollStocks') or [])[:10]]
    return o
def world_index(code):
    o = {}
    pr = get('https://api.stock.naver.com/index/%s/price?pageSize=60&page=1' % urllib.parse.quote(code))
    if isinstance(pr, list) and pr:
        pr = list(reversed(pr)); o['day'] = dict(d=[x['localTradedAt'][:10] for x in pr], o=[num(x.get('openPrice')) for x in pr], h=[num(x.get('highPrice')) for x in pr],
                                                 l=[num(x.get('lowPrice')) for x in pr], c=[num(x['closePrice']) for x in pr])
        x = pr[-1]; y = pr[-2] if len(pr) > 1 else {}
        o['info'] = [['전일', y.get('closePrice', '')], ['시가', x.get('openPrice', '')], ['고가', x.get('highPrice', '')], ['저가', x.get('lowPrice', '')]]
    return o
def fx(code):
    o = {}
    pr = get('https://m.stock.naver.com/front-api/marketIndex/prices?category=exchange&reutersCode=%s&page=1&pageSize=60' % code)
    L = (pr or {}).get('result') if isinstance(pr, dict) else None
    if isinstance(L, list) and L:
        L = list(reversed(L)); o['day'] = dict(d=[x['localTradedAt'][:10] for x in L], c=[num(x['closePrice']) for x in L])
        x = L[-1]; o['cash'] = dict(buy=x.get('cashBuyValue'), sell=x.get('cashSellValue'), send=x.get('sendValue'), receive=x.get('receiveValue'))
    return o
JOBS = {  # 이름(enrich.py market()과 같게): (상세 수집, 장기 차트 야후 기호, 배율)
    'KOSPI': (lambda: kr_index('KOSPI'), '^KS11', 1), 'KOSDAQ': (lambda: kr_index('KOSDAQ'), '^KQ11', 1),
    'S&P 500': (lambda: world_index('.INX'), '^GSPC', 1), 'NASDAQ': (lambda: world_index('.IXIC'), '^IXIC', 1),
    '미국 USD': (lambda: fx('FX_USDKRW'), 'KRW=X', 1), '일본 JPY(100)': (lambda: fx('FX_JPYKRW'), 'JPYKRW=X', 100),
    '유럽 EUR': (lambda: fx('FX_EURKRW'), 'EURKRW=X', 1), '중국 CNY': (lambda: fx('FX_CNYKRW'), 'CNYKRW=X', 1),
    '금': (dict, 'GC=F', 1), '은': (dict, 'SI=F', 1), '구리': (dict, 'HG=F', 1), 'WTI 원유': (dict, 'CL=F', 1), '미국 10년물 금리': (dict, '^TNX', 1), '비트코인': (dict, 'BTC-USD', 1)}
try: OLD = json.load(open(P)).get('items', {})
except Exception: OLD = {}
def one(name):
    f, sym, sc = JOBS[name]
    try: o = f() or {}
    except Exception: o = {}
    lg = yahoo(sym, sc)
    if lg and len(lg['c']) > 20: o['long'] = lg
    old = OLD.get(name, {})
    for k, v in old.items():   # 이번에 못 받은 항목은 지난 값 유지
        if not o.get(k): o[k] = v
    return name, o
with ThreadPoolExecutor(6) as ex: items = dict(ex.map(one, JOBS))
json.dump(dict(updated=dt.datetime.now(KST).isoformat(timespec='minutes'), items=items), open(P, 'w'), ensure_ascii=False, separators=(',', ':'))
print('market_detail:', {k: [x for x in v if v.get(x)] for k, v in items.items()})
