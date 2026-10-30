#!/usr/bin/env python3
"""시가총액 상위 종목 일별 시세(보조 수집): 네이버 금융 공개 시세 → data/gov/stocks.json
금융위 주식시세(kr_gov.py, 맥미니)가 비어 있을 때를 위해 GitHub Actions에서도 채움. 형식은 kr_gov.py와 같음:
  days[YYYYMMDD][종목코드] = [종가, 등락률(%), 시가총액(억 원)], names[종목코드] = [종목명, 시장]
6시간에 한 번만 실제로 받음(1회 약 150번 요청)."""
import os, json, time, datetime as dt, urllib.request, urllib.parse
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'gov'); os.makedirs(G, exist_ok=True)
P = os.path.join(G, 'stocks.json')
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST)
UA = {'User-Agent': 'Mozilla/5.0 (NewsBoard)'}
def get(u, enc='utf-8'):
    for i in range(3):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20).read().decode(enc, 'replace')
        except Exception: time.sleep(1 + i * 2)
    return ''
num = lambda s: float(str(s).replace(',', '') or 0) if str(s).replace(',', '').replace('.', '', 1).lstrip('-').isdigit() else 0.0
try: S = json.load(open(P))
except Exception: S = {}
S.setdefault('days', {}); S.setdefault('names', {})
last = S.get('naver_at', '')
if last and (NOW - dt.datetime.fromisoformat(last)).total_seconds() < 6 * 3600 and len(S['days']) >= 20:
    print('stocks_naver: skip (recent)'); raise SystemExit(0)
# 1) 시가총액 상위: 코스피 100 + 코스닥 50
top = []
for mk, n in (('KOSPI', 100), ('KOSDAQ', 50)):
    j = get(f'https://m.stock.naver.com/api/stocks/marketValue/{mk}?page=1&pageSize={n}')
    try: L = json.loads(j)['stocks']
    except Exception: L = []
    for s in L:
        if s.get('stockEndType') != 'stock': continue
        top.append((s['itemCode'], s['stockName'], mk, num(s.get('marketValue')), num(s.get('closePrice'))))
if not top: print('stocks_naver: no list'); raise SystemExit(0)
# 2) 종목별 최근 약 180일 일별 종가 → 날짜별 표로
start = (NOW - dt.timedelta(days=185)).strftime('%Y%m%d'); end = NOW.strftime('%Y%m%d'); got = 0
for code, name, mk, mcap, cur in top:
    t = get(f'https://api.finance.naver.com/siseJson.naver?symbol={code}&requestType=1&startTime={start}&endTime={end}&timeframe=day', 'euc-kr')
    rows = []
    for line in t.splitlines():
        line = line.strip().rstrip(',')
        if line.startswith('["2'):
            try: r = json.loads(line.replace("'", '"')); rows.append((r[0], float(r[4])))
            except Exception: pass
    if len(rows) < 2: continue
    got += 1; S['names'][code] = [name, mk]
    lastc = rows[-1][1] or cur or 1
    for k, (d, c) in enumerate(rows):
        prev = rows[k - 1][1] if k else c
        S['days'].setdefault(d, {})[code] = [int(c), round((c / prev - 1) * 100, 2) if prev else 0.0, int(mcap * c / lastc)]
    time.sleep(.15)
S['days'] = dict(sorted(S['days'].items())[-120:])
S['naver_at'] = NOW.isoformat(); S['updated'] = NOW.isoformat(); S['src'] = S.get('src') or 'naver'
json.dump(S, open(P, 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'stocks_naver: {got}/{len(top)} stocks, {len(S["days"])} days')
