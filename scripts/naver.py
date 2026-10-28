"""NAVER API HUB 뉴스·이미지 검색 → 상위 이슈 sources 보강 (월 한도 가드)
키: NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (API HUB, X-NCP-APIGW 헤더). 값은 출력하지 않음.
한도: 다른 프로젝트와 공유하므로 NewsBoard 몫은 월 NAVER_MONTH_CAP(기본 280,000, 절대 30만 미만)·하루 NAVER_DAY_CAP(기본 9,000).
사용량은 data/db/naver_usage.json 에 월·일 단위로 누적 기록."""
import os, json, re, html, time, datetime, urllib.request, urllib.parse
from email.utils import parsedate_to_datetime
ID, SEC = os.environ.get('NAVER_CLIENT_ID', ''), os.environ.get('NAVER_CLIENT_SECRET', '')
BASE = 'https://naverapihub.apigw.ntruss.com/search/v1/'
MONTH_CAP = min(int(os.environ.get('NAVER_MONTH_CAP') or 280000), 299000)
DAY_CAP = int(os.environ.get('NAVER_DAY_CAP') or 9000)
BUDGET = int(os.environ.get('NAVER_BUDGET') or 20)
U = 'data/db/naver_usage.json'
KST = datetime.timezone(datetime.timedelta(hours=9))
now = datetime.datetime.now(KST); M, D = now.strftime('%Y-%m'), now.strftime('%Y-%m-%d')
os.makedirs('data/db', exist_ok=True)
try: use = json.load(open(U))
except Exception: use = {}
use.setdefault('month', {}); use.setdefault('day', {})
diag = {'calls': 0, 'items': 0, 'images': 0, 'issues': 0, 'errors': [], 'stopped': None}

def left():
    return min(MONTH_CAP - use['month'].get(M, 0), DAY_CAP - use['day'].get(D, 0), BUDGET - diag['calls'])

def call(kind, q, n):
    if left() <= 0: diag['stopped'] = 'cap'; return None
    use['month'][M] = use['month'].get(M, 0) + 1; use['day'][D] = use['day'].get(D, 0) + 1; diag['calls'] += 1
    url = BASE + kind + '?' + urllib.parse.urlencode({'query': q, 'display': n, 'sort': 'date' if kind == 'news' else 'sim'})
    r = urllib.request.Request(url, headers={'X-NCP-APIGW-API-KEY-ID': ID, 'X-NCP-APIGW-API-KEY': SEC})
    try:
        return json.load(urllib.request.urlopen(r, timeout=15)).get('items') or []
    except Exception as e:
        diag['errors'].append(f'{kind} {getattr(e, "code", type(e).__name__)}')
        if getattr(e, 'code', 0) in (401, 403, 429): diag['stopped'] = f'http {e.code}'
        return None

clean = lambda s: html.unescape(re.sub(r'<[^>]+>', '', s or '')).strip()
def press(u):
    h = urllib.parse.urlparse(u).netloc.lower()
    return re.sub(r'^(www|m|news)\.', '', h)

if not (ID and SEC):
    diag['stopped'] = 'no key'
else:
    p = 'data/today.json'; d = json.load(open(p))
    for i in d.get('issues', [])[:10]:
        if diag['stopped']: break
        kw = i.get('keywords') or []
        q = ' '.join(kw[:3]) if kw else i.get('title', '')[:40]
        its = call('news', q, 10)
        if its is None: continue
        src = i.setdefault('sources', []); seen = {s.get('url') for s in src}
        add = 0
        for it in its:
            u = it.get('originallink') or it.get('link')
            if not u or u in seen or it.get('link') in seen: continue
            try: t = parsedate_to_datetime(it['pubDate']).astimezone(KST).isoformat(timespec='seconds')
            except Exception: t = None
            src.append({'title': clean(it.get('title')), 'url': it.get('link') or u, 'press': press(u),
                        'portal': '네이버', 'kind': '검색', 't': t, 'desc': clean(it.get('description'))[:160]})
            seen.add(u); add += 1
        i['naver'] = add; diag['items'] += add; diag['issues'] += 1
        if not i.get('image') and not diag['stopped']:
            im = call('image', q, 3)
            if im:
                i['image'] = i['image_src'] = im[0].get('thumbnail') or im[0].get('link'); diag['images'] += 1
        time.sleep(0.05)
    d.setdefault('stats', {})['naver_search'] = diag['items']
    json.dump(d, open(p, 'w'), ensure_ascii=False)
for k in list(use['day'])[:-40]: use['day'].pop(k)
json.dump(use, open(U, 'w'))
diag.update(month_used=use['month'].get(M, 0), month_cap=MONTH_CAP, day_used=use['day'].get(D, 0))
json.dump(diag, open('data/diag_naver.json', 'w'), ensure_ascii=False)
print('naver', json.dumps(diag, ensure_ascii=False))
