#!/usr/bin/env python3
"""NewsBoard 자체 DB 채우기 (collect·enrich·global_news 뒤에 실행)
1) 기사 DB: data/db/articles/YYYY-MM-DD/HHMM.json.gz — 그날 처음 본 기사만 조각으로 한 번 기록(덮어쓰기 없음 → git 이력 비대화 방지)
2) 엔티티 DB: data/db/entities/<해시>.json — 인물·기업·장소 타임라인 누적(최대 3000건) + 매 실행 몇 개씩 과거 백필(2·5·10년 전)
3) 썸네일: media/ (별도 media 브랜치)에 WebP(가로 최대 640, 품질 72, URL 해시 파일명, 내용 해시로 중복 제거) 저장 후
   today/global JSON 이미지 주소를 자체 주소로 교체(원본은 *_src 보관). 용량 상한 넘으면 오래 안 쓴 것부터 삭제
환경변수: BACKFILL_N(기본 6), MEDIA_MAX_MB(기본 700), MEDIA_NEW_MAX(실행당 새 이미지, 기본 150)"""
import os, json, gzip, glob, hashlib, re, io, time, html, datetime as dt, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ROOT = os.path.join(BASE, 'data'); MEDIA = os.path.join(BASE, 'media')
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST); DAY = NOW.strftime('%Y-%m-%d')
UA = {'User-Agent': 'Mozilla/5.0 (NewsBoard; +https://pyw31337.github.io/news/)'}
h8 = lambda s, n=10: hashlib.sha1(s.encode()).hexdigest()[:n]
def load(p, d=None):
    try: return json.load(open(p, encoding='utf-8'))
    except Exception: return d
def save(p, o):
    os.makedirs(os.path.dirname(p), exist_ok=True); json.dump(o, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
def get(u, raw=False, timeout=15):
    for n in range(2):
        try:
            b = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=timeout).read()
            return b if raw else b.decode('utf-8', 'replace')
        except Exception as e:
            if getattr(e, 'code', 0) in (403, 404): break
            time.sleep(2)
    return b'' if raw else ''
REPORT = {}
# ---------- 1) 기사 DB ----------
arts = load(os.path.join(ROOT, '_arts.json'), []) or []
ad = os.path.join(ROOT, 'db', 'articles', DAY); os.makedirs(ad, exist_ok=True)
seen = set()
for f in glob.glob(os.path.join(ad, '*.json.gz')):
    try: seen.update(x['url'] for x in json.load(gzip.open(f, 'rt', encoding='utf-8')))
    except Exception: pass
new, u2 = [], set()
for a in arts:
    if a['url'] in seen or a['url'] in u2: continue
    u2.add(a['url']); new.append(a)
if new:
    with gzip.open(os.path.join(ad, NOW.strftime('%H%M') + '.json.gz'), 'wt', encoding='utf-8', compresslevel=9) as g:
        json.dump(new, g, ensure_ascii=False, separators=(',', ':'))
REPORT['articles_new'] = len(new); REPORT['articles_today'] = len(seen) + len(new)
REPORT['article_days'] = len(glob.glob(os.path.join(ROOT, 'db', 'articles', '20*')))
# ---------- 2) 엔티티 DB + 과거 백필 ----------
D = load(os.path.join(ROOT, 'today.json'), {}) or {}
ED = os.path.join(ROOT, 'db', 'entities'); IDX_P = os.path.join(ED, 'index.json'); IDX = load(IDX_P, {}) or {}
def merge_ent(name, typ, items, wiki=None):
    p = os.path.join(ED, h8(name) + '.json'); e = load(p, None) or dict(name=name, type=typ, timeline=[], first_seen=DAY)
    have = {x['url'] for x in e['timeline']}
    for x in items:
        if isinstance(x, dict) and x.get('url') and x['url'] not in have and x.get('t'):
            have.add(x['url']); e['timeline'].append({k: x.get(k) for k in ('t', 'title', 'url', 'press')})
    e['timeline'] = sorted(e['timeline'], key=lambda x: x['t'], reverse=True)[:3000]
    e['type'] = typ or e.get('type'); e['last_seen'] = DAY
    if isinstance(wiki, dict): e['wiki'] = {k: wiki.get(k) for k in ('title', 'desc', 'thumb', 'url')}
    save(p, e)
    IDX[name] = dict(f=h8(name), type=e['type'], n=len(e['timeline']), first=e['timeline'][-1]['t'][:10] if e['timeline'] else None,
                     last_seen=DAY, backfill=IDX.get(name, {}).get('backfill', 0))
for e in D.get('entities', []):
    if e.get('name'): merge_ent(e['name'], e.get('type'), e.get('timeline') or [], e.get('wiki'))
def gnews(q):
    t = get('https://news.google.com/rss/search?q=%s&hl=ko&gl=KR&ceid=KR:ko' % urllib.parse.quote(q)); out = []
    for it in re.findall(r'<item>(.*?)</item>', t, re.S):
        ti = re.search(r'<title>(.*?)</title>', it, re.S); li = re.search(r'<link>(.*?)</link>', it, re.S)
        pd = re.search(r'<pubDate>(.*?)</pubDate>', it); so = re.search(r'<source[^>]*>(.*?)</source>', it)
        if not (ti and li and pd): continue
        try: ts = dt.datetime.strptime(pd.group(1)[5:25], '%d %b %Y %H:%M:%S').replace(tzinfo=dt.timezone.utc).astimezone(KST).isoformat()
        except Exception: continue
        title = html.unescape(re.sub(r'<[^>]+>', '', html.unescape(ti.group(1)))).strip(); press = html.unescape(so.group(1)) if so else ''
        if press and title.endswith(' - ' + press): title = title[:-len(press) - 3]
        out.append(dict(t=ts, title=title, url=html.unescape(li.group(1)).strip(), press=press))
    return out
STEPS = (2, 5, 10)  # 단계마다 몇 년 전 구간을 한 번씩 채움
queue = sorted([n for n, v in IDX.items() if v.get('backfill', 0) < len(STEPS)],
               key=lambda n: (IDX[n].get('backfill', 0), -IDX[n].get('n', 0)))[:int(os.environ.get('BACKFILL_N', '6'))]
def bf(name):
    yrs = STEPS[IDX[name].get('backfill', 0)]; q = '"%s"' % name
    lo = (NOW - dt.timedelta(days=365 * (yrs + 1))).strftime('%Y-%m-%d'); hi = (NOW - dt.timedelta(days=365 * yrs)).strftime('%Y-%m-%d')
    return name, gnews('%s after:%s before:%s' % (q, lo, hi)) + gnews('%s before:%s' % (q, hi))
with ThreadPoolExecutor(3) as ex:
    for name, items in ex.map(bf, queue):
        e = load(os.path.join(ED, IDX[name]['f'] + '.json'), {}) or {}
        merge_ent(name, e.get('type'), items); IDX[name]['backfill'] = IDX[name].get('backfill', 0) + 1
save(IDX_P, IDX); REPORT['entities_db'] = len(IDX); REPORT['entity_items'] = sum(v.get('n', 0) for v in IDX.values()); REPORT['backfilled'] = queue
# ---------- 3) 썸네일 WebP 자체 저장 ----------
try: from PIL import Image
except Exception: Image = None
MAP_P = os.path.join(MEDIA, 'map.json')
if Image and os.path.isdir(MEDIA):
    M = load(MAP_P, {}) or {}   # 원본URL -> {f: 'img/ab/xxxx.webp', h: 내용해시, used: 마지막 사용일, b: 바이트}
    BYH = {v['h']: v['f'] for v in M.values() if v.get('h') and v.get('f')}
    G = load(os.path.join(ROOT, 'global.json'), {}) or {}
    refs = []
    for i in D.get('issues', []):
        refs.append((i, 'image')); refs += [(g, 'img') for g in (i.get('gallery') or []) if isinstance(g, dict)]
    for e in D.get('entities', []):
        if isinstance(e.get('wiki'), dict): refs.append((e['wiki'], 'thumb'))
    for t in D.get('trends', []) + G.get('issues', []) + G.get('trends', []):
        if isinstance(t, dict): refs.append((t, 'image'))
    urls = list(dict.fromkeys(o[k] for o, k in refs if isinstance(o.get(k), str) and o[k].startswith('http')))
    todo = [u for u in urls if u not in M][:int(os.environ.get('MEDIA_NEW_MAX', '150'))]
    def fetch(u):
        b = get(u, raw=True, timeout=12)
        if not b or len(b) < 800: return u, None
        try:
            im = Image.open(io.BytesIO(b)); im.load()
            if im.width < 80 or im.height < 60: return u, None
            if im.mode not in ('RGB', 'L'): im = im.convert('RGB')
            if im.width > 640: im = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
            o = io.BytesIO(); im.save(o, 'WEBP', quality=72, method=5); return u, o.getvalue()
        except Exception: return u, None
    added = 0
    with ThreadPoolExecutor(8) as ex:
        for u, w in ex.map(fetch, todo):
            if not w: M[u] = dict(f=None, used=DAY); continue
            ch = hashlib.sha1(w).hexdigest(); f = BYH.get(ch) or 'img/%s/%s.webp' % (h8(u, 2), h8(u, 16))
            if ch not in BYH:
                p = os.path.join(MEDIA, f); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'wb').write(w); BYH[ch] = f; added += 1
            M[u] = dict(f=f, h=ch, used=DAY, b=len(w))
    for u in urls:
        if u in M: M[u]['used'] = DAY
    for o, k in refs:
        u = o.get(k)
        if isinstance(u, str) and (M.get(u) or {}).get('f'): o[k + '_src'] = u; o[k] = 'media/' + M[u]['f']
    lim = int(os.environ.get('MEDIA_MAX_MB', '700')) * 1048576; files = {}
    for u, v in M.items():
        if v.get('f'):
            x = files.setdefault(v['f'], [v.get('b', 0), '']); x[1] = max(x[1], v.get('used', ''))
    tot = sum(b for b, _ in files.values()); removed = 0
    if tot > lim:
        for f, (b, used) in sorted(files.items(), key=lambda x: x[1][1]):
            if tot <= lim * 0.9 or used == DAY: break
            try: os.remove(os.path.join(MEDIA, f))
            except Exception: pass
            tot -= b; removed += 1
            for u in [u for u, v in M.items() if v.get('f') == f]: M.pop(u)
    cut = (NOW - dt.timedelta(days=14)).strftime('%Y-%m-%d')
    M = {u: v for u, v in M.items() if v.get('f') or v.get('used', '') >= cut}  # 실패 기록은 14일 뒤 재시도
    save(MAP_P, M); save(os.path.join(ROOT, 'today.json'), D)
    if G: save(os.path.join(ROOT, 'global.json'), G)
    REPORT.update(media_new=added, media_files=len(files) - removed, media_mb=round(tot / 1048576, 1), media_removed=removed)
save(os.path.join(ROOT, 'diag_db.json'), dict(step='db', at=NOW.isoformat(), ok={}, fail={}, errors=[], report=REPORT))
try: os.remove(os.path.join(ROOT, '_arts.json'))
except Exception: pass
print('db', REPORT)
