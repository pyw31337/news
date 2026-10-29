#!/usr/bin/env python3
"""세계 시장 지표(미국 연준 FRED 공개 데이터, 무료·키 불필요) → market_extra.json (ecos_series.json과 같은 형식)"""
import csv, io, json, sys, time, urllib.request, datetime
OUT = sys.argv[1]
S = [  # id, FRED 코드, 이름, 단위, 주기, 그룹, 아이콘, 설명
 ('us10y','DGS10','미국 국채 10년','%','D','세계 금리','building-bank','세계 금리의 기준. 오르면 전 세계 대출금리와 성장주에 부담이에요.'),
 ('fedfunds','FEDFUNDS','미국 기준금리','%','M','세계 금리','building-bank','미국 중앙은행이 정하는 금리. 한국 금리와 환율에 큰 영향을 줘요.'),
 ('t10y2y','T10Y2Y','미국 장단기 금리차','%','D','세계 금리','arrows-diff','10년물−2년물. 마이너스(역전)면 경기 침체 경고로 자주 해석돼요.'),
 ('mort30','MORTGAGE30US','미국 30년 주택대출 금리','%','W','세계 금리','home','미국 집값과 소비 심리를 좌우해요.'),
 ('sp500','SP500','S&P 500','pt','D','세계 증시','chart-line','미국 대표 기업 500곳의 주가 지수예요.'),
 ('nasdaq','NASDAQCOM','나스닥','pt','D','세계 증시','cpu','기술·성장 기업 중심의 미국 주가 지수예요.'),
 ('vix','VIXCLS','VIX 공포지수','pt','D','세계 증시','alert-triangle','시장이 앞으로 얼마나 출렁일지 예상하는 값. 30을 넘으면 불안이 큰 상태예요.'),
 ('wti','DCOILWTICO','국제유가(WTI)','$','D','원자재','droplet','미국 원유 가격. 오르면 기름값·물가가 따라 올라요.'),
 ('brent','DCOILBRENTEU','국제유가(브렌트)','$','D','원자재','droplet','유럽·중동 원유 가격의 기준이에요.'),
 ('btc','CBBTCUSD','비트코인','$','D','원자재','currency-bitcoin','대표 가상자산 가격(코인베이스 기준)이에요.'),
 ('dxy','DTWEXBGS','달러 가치(무역가중)','pt','D','세계 환율','currency-dollar','여러 나라 통화 대비 달러 힘. 오르면 원화가 약해지기 쉬워요.'),
 ('jpyusd','DEXJPUS','엔/달러 환율','엔','D','세계 환율','currency-yen','1달러에 몇 엔인지예요.'),
 ('uscpi','CPIAUCSL','미국 소비자물가지수','pt','M','미국 경제','shopping-cart','미국 물가 수준. 미국 금리 결정의 핵심 근거예요.'),
 ('usunemp','UNRATE','미국 실업률','%','M','미국 경제','users','미국 고용 상황을 보여줘요.'),
]
since = (datetime.date.today() - datetime.timedelta(days=365 * 10)).isoformat()
out = {'src': '미국 연방준비은행(FRED) 공개 데이터', 'upd': datetime.datetime.now().isoformat(timespec='minutes'), 'series': {}}
for sid, code, name, unit, cyc, g, ic, what in S:
    try:
        with urllib.request.urlopen(urllib.request.Request(f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={code}&cosd={since}', headers={'User-Agent': 'curl/8.5.0'}), timeout=30) as f:
            rows = list(csv.reader(io.StringIO(f.read().decode())))[1:]
        d = [[r[0], float(r[1])] for r in rows if len(r) > 1 and r[1] not in ('', '.')]
        if cyc == 'D' and len(d) > 1300: d = [x for i, x in enumerate(d) if i % 2 == 0 or i > len(d) - 400]  # 오래된 일별은 이틀 간격
        out['series'][sid] = {'name': name, 'unit': unit, 'cycle': 'D' if cyc in 'DW' else 'M', 'g': g, 'ic': ic, 'what': what, 'data': d}
    except Exception as e: print('실패', code, e)
    time.sleep(0.5)
json.dump(out, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print('지표', len(out['series']))
