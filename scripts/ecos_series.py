#!/usr/bin/env python3
"""한국은행 ECOS 시계열(3~6년) → data/ecos_series.json. 기존 파일에 이어 붙이는 증분 수집.
통계표·항목 코드는 ECOS 항목 목록에서 이름으로 찾아 확인한 뒤 사용(코드가 바뀌어도 안전). 키는 로그·파일에 남기지 않음."""
import os, json, datetime as dt, urllib.request, urllib.parse
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
P = os.path.join(ROOT, 'ecos_series.json')
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST)
EK = os.environ.get('ECOS_API_KEY', '').strip()
errs = []
def get(path):
    u = 'https://ecos.bok.or.kr/api/%s' % path.replace('{K}', EK)
    try: return json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'NewsBoard'}), timeout=30).read())
    except Exception as e: errs.append(('%s %s' % (path.split('/')[0], e)).replace(EK, '***')[:160]); return None
# id, 통계표 후보, 주기, 항목 이름(포함) 후보, 2차 항목 선호 키워드, 기간(년), 변환(yoy=전년동월비)
SPECS = [
 ('base', ['722Y001'], 'M', ['한국은행 기준금리', '기준금리'], None, 6, None),
 ('cd91', ['817Y002', '721Y001'], 'D', ['CD(91일)', 'CD'], None, 3, None),
 ('ktb3', ['817Y002', '721Y001'], 'D', ['국고채(3년)'], None, 3, None),
 ('ktb10', ['817Y002', '721Y001'], 'D', ['국고채(10년)'], None, 3, None),
 ('corp3', ['817Y002', '721Y001'], 'D', ['회사채(3년, AA-)', '회사채(3년,AA-)', '회사채'], None, 3, None),
 ('usd', ['731Y001', '731Y003'], 'D', ['원/미국달러'], None, 3, None),
 ('jpy', ['731Y001', '731Y003'], 'D', ['원/일본엔'], None, 3, None),
 ('eur', ['731Y001', '731Y003'], 'D', ['원/유로'], None, 3, None),
 ('cny', ['731Y001', '731Y003'], 'D', ['원/위안'], None, 3, None),
 ('cpi', ['901Y009'], 'M', ['총지수'], None, 6, 'yoy'),
 ('ppi', ['404Y014'], 'M', ['총지수'], None, 6, 'yoy'),
 ('unemp', ['901Y027'], 'M', ['실업률'], ['계절조정', ''], 5, None),
 ('cab', ['301Y013'], 'M', ['경상수지'], None, 5, None),
 ('gdp', ['200Y102', '200Y002', '200Y001'], 'Q', ['GDP(실질, 계절조정, 전기비)', '국내총생산(GDP)(실질, 계절조정, 전기비)', '실질, 계절조정, 전기비', '국내총생산(GDP)(실질, 계절조정, 전기대비)', 'GDP(실질, 계절조정, 전기대비)', '실질, 계절조정, 전기대비', '경제성장률'], None, 6, None),
 ('kospi', ['802Y001'], 'D', ['KOSPI지수', 'KOSPI'], None, 3, None),
 ('kosdaq', ['802Y001'], 'D', ['KOSDAQ지수', 'KOSDAQ'], None, 3, None),
 ('m2', ['161Y006', '101Y004'], 'M', ['M2(평잔, 원계열)', 'M2 평잔', 'M2'], None, 5, 'yoy'),
 # 경기종합지수
 ('cli', ['901Y067'], 'M', ['선행종합지수'], None, 10, None),
 ('cli_cyc', ['901Y067'], 'M', ['선행지수순환변동치'], None, 10, None),
 ('cci', ['901Y067'], 'M', ['동행종합지수'], None, 10, None),
 ('cci_cyc', ['901Y067'], 'M', ['동행지수순환변동치'], None, 10, None),
]
def fmt(c, d):
    return d.strftime('%Y%m%d') if c == 'D' else d.strftime('%Y%m') if c == 'M' else '%dQ%d' % (d.year, (d.month - 1) // 3 + 1)
def norm(c, t):  # → 'YYYY-MM-DD' / 'YYYY-MM' / 'YYYY-Qn'
    return '%s-%s-%s' % (t[:4], t[4:6], t[6:8]) if c == 'D' else '%s-%s' % (t[:4], t[4:6]) if c == 'M' else t[:4] + '-' + t[4:]
items_cache = {}
def items(stat):
    if stat not in items_cache:
        j = get('StatisticItemList/{K}/json/kr/1/500/%s' % stat)
        items_cache[stat] = ((j or {}).get('StatisticItemList') or {}).get('row') or []
    return items_cache[stat]
def resolve(stats, cyc, names):
    for s in stats:
        rows = [r for r in items(s) if r.get('CYCLE') == cyc]
        for n in names:
            for r in rows:
                if r.get('ITEM_NAME', '').replace(' ', '') == n.replace(' ', ''): return s, r
            for r in rows:
                if n.replace(' ', '') in r.get('ITEM_NAME', '').replace(' ', ''): return s, r
    return None, None
try: OLD = json.load(open(P))
except Exception: OLD = {'series': {}}
OUT = dict(updated=NOW.isoformat(), series=OLD.get('series', {}), components=OLD.get('components', []))
def fetch(stat, cyc, code, start, end, pref2=None):
    L = []
    for pg in range(0, 5):
        j = get('StatisticSearch/{K}/json/kr/%d/%d/%s/%s/%s/%s/%s' % (pg * 10000 + 1, pg * 10000 + 10000, stat, cyc, start, end, urllib.parse.quote(code)))
        rows = ((j or {}).get('StatisticSearch') or {}).get('row') or []
        L += rows
        if len(rows) < 10000: break
    if pref2 and any(r.get('ITEM_NAME2') for r in L):
        for k in pref2:
            sub = [r for r in L if k in (r.get('ITEM_NAME2') or '')]
            if sub: L = sub; break
        n2 = L[0].get('ITEM_CODE2') if L else None; L = [r for r in L if r.get('ITEM_CODE2') == n2]
    elif any(r.get('ITEM_CODE2') for r in L):
        n2 = L[0].get('ITEM_CODE2'); L = [r for r in L if r.get('ITEM_CODE2') == n2]
    out = []
    for r in L:
        try: out.append([norm(cyc, r['TIME']), float(r['DATA_VALUE'])])
        except Exception: pass
    return out, (L[0].get('UNIT_NAME') if L else '')
FRESH = False
try: FRESH = (NOW - dt.datetime.fromisoformat(OLD['updated'])).total_seconds() < 3 * 3600 and 'gdp' in OLD.get('series', {})
except Exception: pass
if EK and not FRESH:
    for sid, stats, cyc, names, pref2, yrs, tf in SPECS:
        stat, it = resolve(stats, cyc, names)
        if not it: errs.append('항목 없음 ' + sid); continue
        old = OUT['series'].get(sid) or {}
        raw = old.get('raw') or old.get('data') or []
        start = NOW - dt.timedelta(days=365 * yrs + (400 if tf == 'yoy' else 0))
        if raw and old.get('code') == it['ITEM_CODE']:  # 증분: 마지막 몇 구간만 다시 받음
            last = raw[-1][0]; y, m = int(last[:4]), int(last[5:7]) if cyc != 'Q' else int(last[6]) * 3
            start = max(start, dt.datetime(y, m, 1, tzinfo=KST) - dt.timedelta(days=100))
        new, unit = fetch(stat, cyc, it['ITEM_CODE'], fmt(cyc, start), fmt(cyc, NOW), pref2)
        if not new and not raw: errs.append('데이터 없음 ' + sid); continue
        m = dict(raw); m.update(dict(new))
        cut = fmt('D', NOW - dt.timedelta(days=365 * yrs + (400 if tf == 'yoy' else 0)))
        cut = norm('D', cut)[:len(next(iter(m)))] if m else ''
        raw = sorted([[k, v] for k, v in m.items() if k >= cut])
        data = raw
        if tf == 'yoy':
            d = dict(raw); data = []
            for k, v in raw:
                pk = '%04d-%s' % (int(k[:4]) - 1, k[5:])
                if pk in d and d[pk]: data.append([k, round((v / d[pk] - 1) * 100, 2)])
        OUT['series'][sid] = dict(name=it['ITEM_NAME'], stat=stat, code=it['ITEM_CODE'], cycle=cyc, unit=('%' if tf == 'yoy' else unit or old.get('unit', '')), tf=tf, raw=raw if tf else None, data=data)
        if not tf: OUT['series'][sid].pop('raw')
    # 경기종합지수 구성지표(선행): 901Y067의 나머지 월간 항목 중 일부
    try:
        import re
        main = {'선행종합지수', '동행종합지수', '후행종합지수', '선행지수순환변동치', '동행지수순환변동치'}
        comp = [r for r in items('901Y067') if r.get('CYCLE') == 'M' and re.sub(r'[\s\d\)]', '', r.get('ITEM_NAME', '')) not in main and '전월' not in r.get('ITEM_NAME', '')]
        cl = []
        for r in comp[:8]:
            d, u = fetch('901Y067', 'M', r['ITEM_CODE'], fmt('M', NOW - dt.timedelta(days=365 * 5)), fmt('M', NOW))
            if len(d) > 12: cl.append(dict(name=r['ITEM_NAME'], code=r['ITEM_CODE'], unit=u, data=d))
        OUT['components'] = cl
    except Exception as e: errs.append('구성지표 %s' % e)
    OUT['items_gdp'] = [[r.get('ITEM_CODE'), r.get('ITEM_NAME'), r.get('CYCLE')] for st in ('200Y102', '200Y002') for r in items(st)][:80]
    OUT['items_901Y067'] = [[r.get('ITEM_CODE'), r.get('ITEM_NAME'), r.get('CYCLE')] for r in items('901Y067')][:60]
    if any(v.get('data') for v in OUT['series'].values()):
        json.dump(OUT, open(P, 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(dict(step='ecos_series', at=NOW.isoformat(), n=len(OUT['series']), errors=errs[:20]), open(os.path.join(ROOT, 'diag_ecos_series.json'), 'w'), ensure_ascii=False)
print('ecos_series', len(OUT['series']), errs[:6])
