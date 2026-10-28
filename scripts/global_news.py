"""해외 뉴스 수집: Google News(US/UK/World)·BBC·Guardian·Al Jazeera RSS + Google 트렌드(US) + GDELT(이미지·보도량)
→ 영어 제목 군집화 → TOP 이슈 → 한국어 번역(무료: Google 번역 웹 엔드포인트, 실패 시 MyMemory) → data/global.json"""
import re, json, os, html, time, math, collections, urllib.request, urllib.parse, datetime as dt
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST)
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}

import atexit as _ax, collections as _co, urllib.parse as _up
DIAG = {'ok': _co.Counter(), 'fail': _co.Counter(), 'errors': []}
def _dhost(u): return _up.urlsplit(u).netloc
_DDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
def _dsave():
    try:
        os.makedirs(_DDIR, exist_ok=True)
        json.dump(dict(step='global', at=dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).isoformat(), ok=DIAG['ok'], fail=DIAG['fail'], errors=DIAG['errors'][-40:]),
                  open(os.path.join(_DDIR, 'diag_global.json'), 'w'), ensure_ascii=False)
    except Exception as e: print('diag', e)
_ax.register(_dsave)

def get(u, timeout=20):
    for n in range(2):
        try:
            _r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=timeout).read().decode('utf-8', 'replace'); DIAG['ok'][_dhost(u)] += 1; return _r
        except Exception as e: err = e; time.sleep(2)
    DIAG['fail'][_dhost(u)] += 1; DIAG['errors'].append(dict(t=time.strftime('%H:%M:%S'), host=_dhost(u), path=_up.urlsplit(u).path[:60], err=str(err)[:120])); print('fail', u[:120], err); return ''
def un(s): return html.unescape(re.sub(r'<[^>]+>', '', html.unescape(s or ''))).strip()
GN = 'https://news.google.com/rss%s?hl=en-%s&gl=%s&ceid=%s:en'
FEEDS = {
 'Google News US': GN % ('', 'US', 'US', 'US'), 'Google News UK': GN % ('', 'GB', 'GB', 'GB'),
 'Google News World': GN % ('/headlines/section/topic/WORLD', 'US', 'US', 'US'),
 'Google News Business': GN % ('/headlines/section/topic/BUSINESS', 'US', 'US', 'US'),
 'Google News Tech': GN % ('/headlines/section/topic/TECHNOLOGY', 'US', 'US', 'US'),
 'BBC': 'https://feeds.bbci.co.uk/news/world/rss.xml', 'BBC Business': 'https://feeds.bbci.co.uk/news/business/rss.xml',
 'Guardian': 'https://www.theguardian.com/world/rss', 'Al Jazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
 'NPR': 'https://feeds.npr.org/1004/rss.xml',
}
CAT = {'Business': '경제', 'Tech': 'IT', 'World': '세계'}
def feed(name, u):
    t = get(u); out = []
    for it in re.findall(r'<item>(.*?)</item>', t, re.S):
        g = lambda tag: (re.search(r'<%s[^>]*>(.*?)</%s>' % (tag, tag), it, re.S) or [None, ''])[1]
        title = un(g('title')); src = un(g('source')) or name
        if ' - ' in title and name.startswith('Google'): title, src = title.rsplit(' - ', 1)[0], title.rsplit(' - ', 1)[1]
        img = re.search(r'<media:(?:thumbnail|content)[^>]*url="([^"]+)"', it)
        try: ts = dt.datetime.strptime(re.sub(r' (GMT|UTC|\+0000|-0000)$', '', g('pubDate').strip()), '%a, %d %b %Y %H:%M:%S').replace(tzinfo=dt.timezone.utc).astimezone(KST)
        except Exception: ts = NOW
        if (NOW - ts).days > 2: continue
        out.append(dict(title=title, url=un(g('link')), press=src, img=html.unescape(img.group(1)) if img else '', t=ts.isoformat(),
                        desc=un(g('description'))[:300] if not name.startswith('Google') else '', feed=name))
    return out
STOP = set('the a an of to in on for and or with by from at as is are was were be been after over into about amid says said new us uk vs its it this that his her their more than up out who what how why will can could would may not no live latest news report reports video watch'.split())
def tok(t): return [w for w in re.findall(r"[a-z][a-z'\-]+", t.lower()) if w not in STOP and len(w) > 2]
# ---- 번역(캐시) ----
TC_P = os.path.join(ROOT, 'tr_cache.json')
try: TC = json.load(open(TC_P))
except Exception: TC = {}
TR_STAT = collections.Counter()
def tr(text):
    text = (text or '').strip()
    if not text: return ''
    if text in TC: TR_STAT['cache'] += 1; return TC[text]
    try:
        j = json.loads(get('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=' + urllib.parse.quote(text[:1800]), 15))
        out = ''.join(x[0] for x in j[0] if x[0]); TR_STAT['google'] += 1
    except Exception:
        try:
            j = json.loads(get('https://api.mymemory.translated.net/get?langpair=en|ko&q=' + urllib.parse.quote(text[:480]), 15))
            out = j['responseData']['translatedText']; TR_STAT['mymemory'] += 1
        except Exception: TR_STAT['fail'] += 1; return ''
    TC[text] = out; return out
def og_img(u):
    if 'news.google.com' in u: return ''
    t = get(u, 10)
    m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', t) or re.search(r'<meta[^>]+content="([^"]+)"[^>]+property="og:image"', t)
    return html.unescape(m.group(1)) if m else ''
def gdelt(q):
    t = get('https://api.gdeltproject.org/api/v2/doc/doc?format=json&mode=artlist&maxrecords=15&sort=hybridrel&timespan=2d&query=' + urllib.parse.quote(q + ' sourcelang:english'), 25)
    try: return json.loads(t).get('articles', [])
    except Exception: return []

with ThreadPoolExecutor(8) as ex: arts = [a for f in ex.map(lambda kv: feed(*kv), FEEDS.items()) for a in f]
seen = set(); A = []
for a in arts:
    k = re.sub(r'\W', '', a['title'].lower())[:40]
    if k and k not in seen: seen.add(k); A.append(a)
# TF-IDF 군집
docs = [collections.Counter(tok(a['title'] + ' ' + a['desc'][:120])) for a in A]
df = collections.Counter(w for d in docs for w in d)
N = len(docs)
vec = [{w: c * math.log(N / (1 + df[w])) for w, c in d.items()} for d in docs]
nrm = [math.sqrt(sum(v * v for v in x.values())) or 1 for x in vec]
def cos(i, j): return sum(v * vec[j].get(w, 0) for w, v in vec[i].items()) / nrm[i] / nrm[j]
cl = []
for i in range(N):
    for c in cl:
        if cos(i, c[0]) > 0.3: c.append(i); break
    else: cl.append([i])
def score(c): return len({A[i]['press'] for i in c}) * 2 + len({A[i]['feed'] for i in c}) * 1.5 + len(c) * .3
cl.sort(key=score, reverse=True)
issues = []
for c in cl[:12]:
    items = [A[i] for i in c]
    lead = max(items, key=lambda a: (bool(a['img']), bool(a['desc']), -len(a['title'])))
    words = collections.Counter(w for i in c for w in tok(A[i]['title']))
    issues.append(dict(title=lead['title'], url=lead['url'], press=lead['press'], image=lead['img'], summary=next((a['desc'] for a in items if a['desc']), ''),
                       keywords=[w for w, _ in words.most_common(5)], category=next((CAT[k] for a in items for k in CAT if k in a['feed']), '세계'),
                       presses=len({a['press'] for a in items}), mentions=len(items), score=round(score(c), 1),
                       sources=[dict(title=a['title'], url=a['url'], press=a['press'], t=a['t'], img=a['img']) for a in sorted(items, key=lambda a: a['t'], reverse=True)[:12]]))
# GDELT: 이미지·추가 보도(속도 제한 고려해 순차)
for k, i in enumerate(issues):
    if k: time.sleep(5.5)
    g = gdelt(' '.join(i['keywords'][:3]))
    i['gdelt'] = len(g)
    if not i['image']: i['image'] = next((a.get('socialimage') for a in g if a.get('socialimage')), '')
    for a in g[:6]:
        if a.get('url') and all(a['url'] != s['url'] for s in i['sources']):
            try: ts = dt.datetime.strptime(a['seendate'], '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc).astimezone(KST).isoformat()
            except Exception: ts = NOW.isoformat()
            i['sources'].append(dict(title=a.get('title', ''), url=a['url'], press=a.get('domain', ''), t=ts, img=a.get('socialimage', '')))
with ThreadPoolExecutor(4) as ex:
    imgs = list(ex.map(lambda i: i['image'] or next((og_img(s['url']) for s in i['sources'][:3] if 'news.google' not in s['url']), ''), issues))
for i, im in zip(issues, imgs): i['image'] = im
# 해외 트렌드
tt = get('https://trends.google.com/trending/rss?geo=US'); trends = []
for it in re.findall(r'<item>(.*?)</item>', tt, re.S)[:15]:
    kw = un(re.search(r'<title>(.*?)</title>', it).group(1)); trf = un((re.search(r'approx_traffic>(.*?)<', it) or [0, ''])[1])
    news = [dict(title=un(a), url=un(b)) for a, b in re.findall(r'news_item_title>(.*?)</ht:news_item_title>.*?news_item_url>(.*?)</ht:news_item_url>', it, re.S)][:3]
    pic = un((re.search(r'<ht:picture>(.*?)</ht:picture>', it) or [0, ''])[1])
    trends.append(dict(keyword=kw, traffic=trf, traffic_n=int(re.sub(r'\D', '', trf) or 0), news=news, image=pic))
trends.sort(key=lambda t: -t['traffic_n'])
# 번역
with ThreadPoolExecutor(4) as ex:
    for i in issues:
        i['title_ko'], i['summary_ko'] = ex.submit(tr, i['title']).result(), ex.submit(tr, i['summary']).result()
        for s, k in zip(i['sources'], ex.map(tr, [s['title'] for s in i['sources']])): s['title_ko'] = k
    for t, k in zip(trends, ex.map(tr, [t['keyword'] for t in trends])): t['keyword_ko'] = k
    for t in trends:
        for n, k in zip(t['news'], ex.map(tr, [n['title'] for n in t['news']])): n['title_ko'] = k
for r, i in enumerate(issues, 1): i['rank'] = r; i['id'] = 'g' + __import__('hashlib').md5((i['sources'][0]['url'] if i.get('sources') else i['title']).encode()).hexdigest()[:8]
json.dump(dict(list(TC.items())[-4000:]), open(TC_P, 'w'), ensure_ascii=False)
json.dump(dict(updated=NOW.isoformat(), issues=issues, trends=trends, stats=dict(articles=len(A), feeds=len(FEEDS), presses=len({a['press'] for a in A})),
               translate=dict(TR_STAT)), open(os.path.join(ROOT, 'global.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('global', len(A), 'articles', len(issues), 'issues', dict(TR_STAT))
