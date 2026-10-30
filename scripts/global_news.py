"""해외 뉴스 수집: 여러 권역 Google News·BBC·Guardian·Al Jazeera·NPR·DW RSS + 권역별 Google 트렌드
→ 한국 관련 보도를 제외한 영어 제목 군집화 → TOP 이슈 → 선택적 한국어 번역 → data/global.json"""
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
    DIAG['fail'][_dhost(u)] += 1; DIAG['errors'].append(dict(t=time.strftime('%H:%M:%S', time.gmtime(time.time() + 32400)), host=_dhost(u), path=_up.urlsplit(u).path[:60], err=str(err)[:120])); print('fail', u[:120], err); return ''
def un(s): return html.unescape(re.sub(r'<[^>]+>', '', html.unescape(s or ''))).strip()
GN = 'https://news.google.com/rss%s?hl=en-%s&gl=%s&ceid=%s:en'
GSEARCH = lambda q: 'https://news.google.com/rss/search?q=' + urllib.parse.quote(q) + '&hl=en-US&gl=US&ceid=US:en'
FEEDS = {
 # 지역판을 섞어 북미·유럽·아시아·오세아니아·아프리카의 지역 이슈도 받는다.
 'Google News US': GN % ('', 'US', 'US', 'US'), 'Google News UK': GN % ('', 'GB', 'GB', 'GB'),
 'Google News Canada': GN % ('', 'CA', 'CA', 'CA'), 'Google News Australia': GN % ('', 'AU', 'AU', 'AU'),
 'Google News India': GN % ('', 'IN', 'IN', 'IN'), 'Google News Singapore': GN % ('', 'SG', 'SG', 'SG'),
 'Google News South Africa': GN % ('', 'ZA', 'ZA', 'ZA'),
 'Google News World': GN % ('/headlines/section/topic/WORLD', 'US', 'US', 'US'),
 'Google News Business': GN % ('/headlines/section/topic/BUSINESS', 'US', 'US', 'US'),
 'Google News Tech': GN % ('/headlines/section/topic/TECHNOLOGY', 'US', 'US', 'US'),
 'Google News Science': GSEARCH('science OR research'), 'Google News Health': GSEARCH('health OR medicine'),
 'Google News Climate': GSEARCH('climate OR environment'), 'Google News Culture': GSEARCH('culture OR arts'),
 'Google News Entertainment': GN % ('/headlines/section/topic/ENTERTAINMENT', 'US', 'US', 'US'), 'Google News Sports': GN % ('/headlines/section/topic/SPORTS', 'US', 'US', 'US'),
 'BBC World': 'https://feeds.bbci.co.uk/news/world/rss.xml', 'BBC Business': 'https://feeds.bbci.co.uk/news/business/rss.xml',
 'BBC Science': 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', 'BBC Health': 'https://feeds.bbci.co.uk/news/health/rss.xml', 'BBC Culture': 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
 'Guardian World': 'https://www.theguardian.com/world/rss', 'Guardian Environment': 'https://www.theguardian.com/environment/rss', 'Guardian Culture': 'https://www.theguardian.com/culture/rss',
 'Al Jazeera World': 'https://www.aljazeera.com/xml/rss/all.xml', 'NPR World': 'https://feeds.npr.org/1004/rss.xml', 'DW World': 'https://rss.dw.com/rdf/rss-en-world',
}
CAT = {'Business': '경제', 'Tech': 'IT', 'Science': '과학', 'Health': '건강', 'Climate': '환경', 'Environment': '환경', 'Culture': '문화', 'Entertainment': '연예', 'Sports': '스포츠', 'World': '세계'}
KOREA_RX = re.compile(r'\b(?:south\s+korea|korean|seoul|busan|incheon|jeju|대한민국|한국)\b', re.I)
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
def tr_batch(texts):
    """기사마다 무료 번역을 호출하지 않고 3.8KB 묶음만 보낸다. 제한 시 원문을 남긴다."""
    values = list(dict.fromkeys((x or '').strip() for x in texts if (x or '').strip()))
    out = {x: TC[x] for x in values if x in TC}; missing = [x for x in values if x not in out]
    TR_STAT['cache'] += len(out); groups, current, size = [], [], 0
    for text in missing:
        add = len(text) + 28
        if current and size + add > 3800: groups.append(current); current, size = [], 0
        current.append(text[:1800]); size += add
    if current: groups.append(current)
    for group in groups:
        marked = '\n\n'.join((f'<<<NBSEP{n:04d}>>>\n{text}' if n else text) for n, text in enumerate(group))
        try:
            u = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=' + urllib.parse.quote(marked)
            raw = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=12).read().decode('utf-8', 'replace')
            translated = ''.join(x[0] for x in json.loads(raw)[0] if x[0]); parts = re.split(r'<<<NBSEP\d{4}>>>\s*', translated)
            if len(parts) == len(group):
                for text, value in zip(group, parts): TC[text] = value.strip(); out[text] = value.strip()
                TR_STAT['google_batches'] += 1; TR_STAT['google_items'] += len(group); continue
        except Exception as e:
            DIAG['fail']['translate.googleapis.com'] += 1
            DIAG['errors'].append(dict(t=time.strftime('%H:%M:%S', time.gmtime(time.time() + 32400)), host='translate.googleapis.com', path='/translate_a/single', err=str(e)[:120]))
        TR_STAT['deferred'] += len(group)
    return out
def og_img(u):
    if 'news.google.com' in u: return ''
    t = get(u, 10)
    m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', t) or re.search(r'<meta[^>]+content="([^"]+)"[^>]+property="og:image"', t)
    return html.unescape(m.group(1)) if m else ''
def gdelt(q):
    t = get('https://api.gdeltproject.org/api/v2/doc/doc?format=json&mode=artlist&maxrecords=15&sort=hybridrel&timespan=2d&query=' + urllib.parse.quote(q + ' sourcelang:english'), 25)
    try: return json.loads(t).get('articles', [])
    except Exception: return []

with ThreadPoolExecutor(12) as ex: arts = [a for f in ex.map(lambda kv: feed(*kv), FEEDS.items()) for a in f]
seen = set(); A = []
for a in arts:
    if KOREA_RX.search(a['title'] + ' ' + a['desc']): continue
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
# GDELT는 무료 공개 API가 쉽게 429를 내므로 기본 수집 경로에서는 끈다.
# 필요할 때만 GLOBAL_GDELT=1로 상위 일부 이슈에 부가 보도·이미지를 더한다.
if os.environ.get('GLOBAL_GDELT') == '1':
    for k, i in enumerate(issues[:4]):
        if k: time.sleep(6)
        g = gdelt(' '.join(i['keywords'][:3]))
        i['gdelt'] = len(g)
        if not i['image']: i['image'] = next((a.get('socialimage') for a in g if a.get('socialimage')), '')
        for a in g[:6]:
            if a.get('url') and all(a['url'] != s['url'] for s in i['sources']):
                try: ts = dt.datetime.strptime(a['seendate'], '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc).astimezone(KST).isoformat()
                except Exception: ts = NOW.isoformat()
                i['sources'].append(dict(title=a.get('title', ''), url=a.get('url'), press=a.get('domain', ''), t=ts, img=a.get('socialimage', '')))
for i in issues: i.setdefault('gdelt', 0)
with ThreadPoolExecutor(4) as ex:
    imgs = list(ex.map(lambda i: i['image'] or next((og_img(s['url']) for s in i['sources'][:3] if 'news.google' not in s['url']), ''), issues))
for i, im in zip(issues, imgs): i['image'] = im
def trend_feed(geo):
    out=[]; tt=get('https://trends.google.com/trending/rss?geo='+geo)
    for it in re.findall(r'<item>(.*?)</item>', tt, re.S)[:12]:
        m=re.search(r'<title>(.*?)</title>',it)
        if not m: continue
        kw=un(m.group(1));
        if KOREA_RX.search(kw): continue
        trf=un((re.search(r'approx_traffic>(.*?)<',it) or [0,''])[1])
        news=[dict(title=un(a),url=un(b)) for a,b in re.findall(r'news_item_title>(.*?)</ht:news_item_title>.*?news_item_url>(.*?)</ht:news_item_url>',it,re.S)][:3]
        pic=un((re.search(r'<ht:picture>(.*?)</ht:picture>',it) or [0,''])[1])
        out.append(dict(keyword=kw,traffic=trf,traffic_n=int(re.sub(r'\D','',trf) or 0),news=news,image=pic,geo=geo))
    return out
with ThreadPoolExecutor(7) as ex: raw_trends=[t for ts in ex.map(trend_feed,['US','GB','CA','AU','IN','SG','ZA']) for t in ts]
seen_t=set(); trends=[]
for t in sorted(raw_trends,key=lambda t:-t['traffic_n']):
    k=re.sub(r'\W','',t['keyword'].lower())
    if k and k not in seen_t: seen_t.add(k);trends.append(t)
trends=trends[:20]
# 번역은 한 큐에서 배치 처리한다. 제한 중에는 빈 번역값으로 저장되어 화면이 영어 원문으로 자연스럽게 대체된다.
jobs = []
for i in issues:
    jobs.extend([(i, 'title_ko', i['title']), (i, 'summary_ko', i['summary'])]); jobs.extend([(s, 'title_ko', s['title']) for s in i['sources']])
for t in trends:
    jobs.append((t, 'keyword_ko', t['keyword'])); jobs.extend([(n, 'title_ko', n['title']) for n in t['news']])
translated = tr_batch([text for _, _, text in jobs])
for target, key, source in jobs: target[key] = translated.get(source, '')
for r, i in enumerate(issues, 1): i['rank'] = r; i['id'] = 'g' + __import__('hashlib').md5((i['sources'][0]['url'] if i.get('sources') else i['title']).encode()).hexdigest()[:8]
json.dump(dict(list(TC.items())[-4000:]), open(TC_P, 'w'), ensure_ascii=False)
json.dump(dict(updated=NOW.isoformat(), issues=issues, trends=trends, stats=dict(articles=len(A), feeds=len(FEEDS), presses=len({a['press'] for a in A})),
               translate=dict(TR_STAT)), open(os.path.join(ROOT, 'global.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('global', len(A), 'articles', len(issues), 'issues', dict(TR_STAT))
