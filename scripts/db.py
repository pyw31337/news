#!/usr/bin/env python3
"""NewsBoard 자체 DB 채우기 (collect·enrich·global_news 뒤에 실행)
1) 기사 DB: data/db/articles/YYYY-MM-DD/HHMM.json.gz — 그날 처음 본 기사만 조각으로 한 번 기록(덮어쓰기 없음 → git 이력 비대화 방지)
2) 엔티티 DB: data/db/entities/<해시>.json — 인물·기업·장소 타임라인 누적(최대 3000건) + 매 실행 몇 개씩 과거 백필(2·5·10년 전)
3) 사진: media/ (별도 media 브랜치)에 가장 큰 원본을 찾아 WebP(가로 최대 1600·확대 없음, 품질 82, 원본 크기 기록, URL 해시 파일명, 내용 해시로 중복 제거) 저장 후
   today/global JSON 이미지 주소를 자체 주소로 교체(원본은 *_src 보관). 용량 상한 넘으면 오래 안 쓴 것부터 삭제
환경변수: BACKFILL_N(기본 6), MEDIA_MAX_MB(기본 900), MEDIA_NEW_MAX(실행당 새 이미지, 기본 100)"""
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
# ---------- 3) 사진: 가장 큰 원본을 찾아 WebP(q82, 확대 없음)로 보존 + 원본 픽셀 크기 기록 ----------
# 뉴스 사진의 해상도는 신뢰도. 화면(assets/sharp.js)은 기록된/실제 크기와 칸 크기×화면 배율을 비교해 흐린 사진은 쓰지 않고 디자인 카드로 대체.
try: from PIL import Image
except Exception: Image = None
MAP_P = os.path.join(MEDIA, 'map.json'); MAXW = 1600; MINW = 400; MV = 2
def upgrade(u):
    """썸네일 주소 → 원본 주소 후보(큰 것부터)"""
    out = []; pu = urllib.parse.urlsplit(u); q = urllib.parse.parse_qs(pu.query)
    for k in ('fname', 'src', 'u', 'url'):   # 다음/카카오 thumb?fname=, 네이버 search.pstatic.net/?src=
        if k in q and q[k][0].startswith('http') and ('daumcdn' in pu.netloc or 'kakaocdn' in pu.netloc or 'pstatic' in pu.netloc):
            out += upgrade(q[k][0])
    if 'pstatic.net' in pu.netloc and pu.query and 'search.pstatic' not in pu.netloc:
        out.append(urllib.parse.urlunsplit(pu._replace(query='')))       # ?type=w800 등 크기 지정 제거 = 원본
    if 'upload.wikimedia.org' in pu.netloc and '/thumb/' in pu.path:   # 위키 썸네일 320px → 1280px
        out.append(re.sub(r'/(\d+)px-', '/1280px-', u))
    out.append(u); return list(dict.fromkeys(out))
import json as _json, urllib.request as _ur
UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
def gdecode(u,timeout=10):
    """Google News RSS 링크 → 원문 기사 주소"""
    m=re.search(r'/(?:rss/)?articles/([^?/]+)',u)
    if not m: return ''
    gid=m.group(1)
    t=_ur.urlopen(_ur.Request('https://news.google.com/articles/'+gid,headers=UA),timeout=timeout).read().decode('utf8','ignore')
    sg=re.search(r'data-n-a-sg="([^"]+)"',t);ts=re.search(r'data-n-a-ts="([^"]+)"',t)
    if not(sg and ts): return ''
    req=["Fbv4je",'["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"%s",%s,"%s"]'%(gid,ts.group(1),sg.group(1))]
    body='f.req='+urllib.parse.quote(_json.dumps([[req]]))
    r=_ur.urlopen(_ur.Request('https://news.google.com/_/DotsSplashUi/data/batchexecute',data=body.encode(),headers=dict(UA,**{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'})),timeout=timeout).read().decode('utf8','ignore')
    x=_json.loads(r.split('\n\n',1)[1])[:-2]
    return _json.loads(x[0][2])[1]

def page_imgs(url):
    """기사 페이지의 og:image·twitter:image·본문 큰 사진 후보"""
    t = get(url, timeout=10) if url and url.startswith('http') and 'news.google.com' not in url else ''
    if not t: return []
    c = []
    for pat in (r'<meta[^>]+(?:property|name)="(?:og:image|twitter:image)(?::src)?"[^>]+content="([^"]+)"', r'<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="(?:og:image|twitter:image)"',
                r'<img[^>]+(?:data-src|src)="(https?://[^"]+\.(?:jpe?g|png|webp)[^"]*)"'):
        c += [html.unescape(x) for x in re.findall(pat, t, re.I)]
    return list(dict.fromkeys(c))[:6]
if Image and os.path.isdir(MEDIA):
    M = load(MAP_P, {}) or {}   # 원본URL -> {f, h, used, b, w, h0(원본 높이), v, small}
    BYH = {v['h']: v['f'] for v in M.values() if v.get('h') and v.get('f')}
    G = load(os.path.join(ROOT, 'global.json'), {}) or {}
    refs = []; PAGE = {}
    def kid(o, k='img'):
        if isinstance(o, dict) and isinstance(o.get(k), str):
            refs.append((o, k))
            if o.get('url'): PAGE.setdefault(o.get(k + '_src') or o[k], o['url'])
    for i in D.get('issues', []):
        refs.append((i, 'image')); [kid(g) for g in (i.get('gallery') or [])]; [kid(x) for x in (i.get('sources') or [])]
        if i.get('url'): PAGE.setdefault(i.get('image_src') or i.get('image') or '', i['url'])
    for e in D.get('entities', []):
        if isinstance(e.get('wiki'), dict): refs.append((e['wiki'], 'thumb'))
    for t in D.get('trends', []) + G.get('issues', []) + G.get('trends', []):
        if isinstance(t, dict):
            refs.append((t, 'image')); [kid(x) for x in (t.get('today') or []) + (t.get('sources') or [])]
    for i in D.get('issues', []):
        for f in i.get('flow') or []: [kid(x) for x in f.get('items') or []]
    def kid0(L):
        for x in L or []:
            if isinstance(x, dict): x.setdefault('img', ''); kid(x)
    for i in D.get('issues', []): kid0(i.get('timeline'))
    for t in D.get('trends', []): kid0(t.get('news')); kid0(t.get('today'))
    for e in sorted(D.get('entities', []), key=lambda e: -(e.get('score') or 0)): kid0(sorted(e.get('timeline') or [], key=lambda x: x.get('t', ''), reverse=True))
    src = lambda o, k: o.get(k + '_src') if isinstance(o.get(k + '_src'), str) and o[k + '_src'].startswith('http') else o.get(k)
    urls = list(dict.fromkeys(src(o, k) for o, k in refs if isinstance(src(o, k), str) and src(o, k).startswith('http')))
    # 목록에 사진이 없던 기사: 기사 페이지의 대표 사진(og:image)을 찾아 채움 (실행당 PAGE_MAX건, 실패는 14일 뒤 재시도)
    NOIMG = {}
    for o, k in refs:
        if isinstance(o, dict) and o.get(k) == '' and not o.get(k + '_src') and str(o.get('url', '')).startswith('http'):
            NOIMG.setdefault('page:' + o['url'], []).append((o, k))
    OURL = {}; PDL = time.time() + int(os.environ.get('PAGE_SEC', '240'))
    ptodo = [u for u in NOIMG if u not in M][:int(os.environ.get('PAGE_MAX', '300'))]
    # 새 주소 + 예전 방식(640px 축소·크기 미기록) 백필
    todo = [u for u in urls if u not in M or (M[u].get('v') != MV and (M[u].get('f') or M[u].get('used', '') < DAY))][:int(os.environ.get('MEDIA_NEW_MAX', '100'))]
    def best(cands):
        top = None
        for c in cands:
            b = get(c, raw=True, timeout=12)
            if not b or len(b) < 800: continue
            try: im = Image.open(io.BytesIO(b)); im.load()
            except Exception: continue
            if not top or im.width > top.width: top = im
            if top.width >= 1200: break
        return top
    def fetch(u):
        if u.startswith('page:'):
            if time.time() > PDL: return u, None, -1, 0   # 시간 초과 → 기록 없이 다음 실행에서 재시도
            pg = u[5:]
            if 'news.google.com' in pg:
                try: pg = gdecode(pg) or ''
                except Exception: pg = ''
                if pg: OURL[u] = pg
            im = best([c for x in page_imgs(pg) for c in upgrade(x)][:6]) if pg else None
            if not im: return u, None, 0, 0
            return shrink(u, im)
        im = best(upgrade(u))
        if (not im or im.width < 1200) and PAGE.get(u):
            alt = best([c for x in page_imgs(PAGE[u]) for c in upgrade(x)][:6])
            if alt and (not im or alt.width > im.width): im = alt
        if not im: return u, None, 0, 0
        return shrink(u, im)
    def shrink(u, im):
        w0, h0 = im.size
        if w0 < MINW or h0 < 200: return u, None, w0, h0   # 너무 작음 → 쓰지 않음(디자인 카드로 대체)
        if im.mode not in ('RGB', 'L'): im = im.convert('RGB')
        if im.width > MAXW: im = im.resize((MAXW, round(im.height * MAXW / im.width)), Image.LANCZOS)   # 축소만, 확대 없음
        o = io.BytesIO(); im.save(o, 'WEBP', quality=82, method=5); return u, o.getvalue(), im.width, im.height
    added = upd = small = 0
    with ThreadPoolExecutor(16) as ex:
        for u, w, W, H in ex.map(fetch, todo + ptodo):
            if W == -1: continue
            if not w:
                if W: small += 1
                M[u] = dict(f=None, used=DAY, v=MV, w=W, h0=H, small=bool(W)); continue
            ch = hashlib.sha1(w).hexdigest(); f = BYH.get(ch) or 'img/%s/%s.webp' % (h8(u, 2), h8(u + '#v2', 16))
            if ch not in BYH:
                p = os.path.join(MEDIA, f); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'wb').write(w); BYH[ch] = f; added += 1
            if u in M and M[u].get('f') and M[u]['f'] != f: upd += 1
            M[u] = dict(f=f, h=ch, used=DAY, b=len(w), w=W, h0=H, v=MV)
    for u in urls + list(NOIMG):
        if u in M: M[u]['used'] = DAY
    for pu, lst in NOIMG.items():
        v = M.get(pu) or {}
        if v.get('f'):
            for o, k in lst: o[k] = 'media/' + v['f']; o[k + '_w'] = v['w']; o[k + '_h'] = v.get('h0')
        if pu in OURL and pu in M: M[pu]['ou'] = OURL[pu]
        if v.get('ou') or OURL.get(pu):
            for o, k in lst: o['ourl'] = v.get('ou') or OURL[pu]   # 구글 뉴스 중계 링크 대신 원문 주소
    for o, k in refs:
        if isinstance(o.get(k), str) and o[k].startswith('media/') and not o.get(k + '_src'): continue
        u = src(o, k)
        if not isinstance(u, str): continue
        v = M.get(u) or {}
        if v.get('f'): o[k + '_src'] = u; o[k] = 'media/' + v['f']
        if v.get('w'): o[k + '_w'] = v['w']; o[k + '_h'] = v.get('h0')
        if v.get('v') == MV and not v.get('f') and v.get('small'): o[k + '_src'] = u; o[k] = ''   # 흐린 사진은 아예 내보내지 않음
    lim = int(os.environ.get('MEDIA_MAX_MB', '900')) * 1048576; files = {}
    live = {v['f'] for v in M.values() if v.get('f')}
    for u, v in M.items():
        if v.get('f'):
            x = files.setdefault(v['f'], [v.get('b', 0), '']); x[1] = max(x[1], v.get('used', ''))
    for root, _, fs in os.walk(os.path.join(MEDIA, 'img')):   # 교체된 예전 저해상도 파일 정리
        for fn in fs:
            rel = os.path.relpath(os.path.join(root, fn), MEDIA)
            if rel not in live:
                try: os.remove(os.path.join(root, fn))
                except Exception: pass
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
    ws = [v['w'] for v in M.values() if v.get('f') and v.get('v') == MV]
    REPORT.update(media_new=added, media_upgraded=upd, media_small_rejected=small, media_files=len(files) - removed, media_mb=round(tot / 1048576, 1),
                  media_removed=removed, media_v2=len(ws), media_hd=sum(w >= 1200 for w in ws), media_left_v1=sum(1 for v in M.values() if v.get('f') and v.get('v') != MV))
save(os.path.join(ROOT, 'diag_db.json'), dict(step='db', at=NOW.isoformat(), ok={}, fail={}, errors=[], report=REPORT))
try: os.remove(os.path.join(ROOT, '_arts.json'))
except Exception: pass
print('db', REPORT)
