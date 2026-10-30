#!/usr/bin/env python3
"""언론사 원형 배지 만들기: python scripts/press_badges.py [today.json 경로 또는 URL ...]
assets/press/의 로고(각 언론사 공식 아이콘)를 원형 배지에 맞게 하나씩 가공해 assets/press/b/에 저장한다.
- 바깥 여백·회색 테두리(더팩트 등)는 잘라냄: 가장자리 색과 다른 부분만 남김
- 로고 바탕이 색이 있는 네모(SBS 네이비, 한국경제 등)면 원 전체를 그 색으로 채워 네모 경계가 안 보이게
- 바탕이 흰색·투명이면 흰 원 안에 로고를 70% 크기로
- 오늘 기사에 나온 언론사 중 로고가 없는 곳은 공식 사이트 아이콘을 새로 받아 옴(64px 이상만)
- index.json: 이름→로고 파일, _b: 로고→배지 파일, _n: 도메인→언론사 이름(말풍선용)"""
import os, re, io, sys, json, urllib.request, urllib.parse
from PIL import Image, ImageChops, ImageStat
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'press'); BD = os.path.join(OUT, 'b'); os.makedirs(BD, exist_ok=True)
IP = os.path.join(OUT, 'index.json'); IDX = json.load(open(IP))
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh) NewsBoard logo fetch'}
def get(u, t=6): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t).read()
# 도메인 → 언론사 이름(press_logos.py 표를 뒤집어 씀)
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'press_logos.py'), encoding='utf-8').read()
NAMES = {}
for name, dom in re.findall(r"'([^']+)':'([a-z0-9.\-]+\.[a-z]{2,})'", src):
    NAMES.setdefault(dom, name); NAMES.setdefault(dom.removeprefix('news.').removeprefix('www.'), name)
NAMES.update({'iminju.net': '민주신문', 'joseilbo.com': '조세일보', 'seoul.co.kr': '서울신문', 'biz.sbs.co.kr': 'SBS Biz', 'kbs.co.kr': 'KBS', 'sbs.co.kr': 'SBS', 'fnnews.com': '파이낸셜뉴스',
              'jnilbo.com': '전남일보', 'hankyung.com': '한국경제', 'yna.co.kr': '연합뉴스', 'yonhapnewstv.co.kr': '연합뉴스TV', 'news1.kr': '뉴스1', 'newsis.com': '뉴시스', 'mk.co.kr': '매일경제',
              'chosun.com': '조선일보', 'donga.com': '동아일보', 'joongang.co.kr': '중앙일보', 'hani.co.kr': '한겨레', 'khan.co.kr': '경향신문', 'mt.co.kr': '머니투데이', 'edaily.co.kr': '이데일리',
              'etoday.co.kr': '이투데이', 'ddaily.co.kr': '디지털데일리', 'zdnet.co.kr': '지디넷코리아', 'etnews.com': '전자신문', 'asiae.co.kr': '아시아경제', 'heraldcorp.com': '헤럴드경제'})
def best(dom):
    cands = []
    for base in ('https://' + dom, 'https://www.' + dom.removeprefix('news.')):
        try:
            h = get(base).decode('utf-8', 'replace')
            for m in re.finditer(r'<link[^>]+>', h, re.I):
                tag = m.group(0)
                if re.search(r'rel=["\'][^"\']*(apple-touch-icon|icon)', tag, re.I):
                    hr = re.search(r'href=["\']([^"\']+)', tag)
                    if hr: cands.append(urllib.parse.urljoin(base + '/', hr.group(1)))
            cands.append(base + '/apple-touch-icon.png'); break
        except Exception: continue
    cands.append('https://www.google.com/s2/favicons?domain=%s&sz=128' % dom)
    top = None
    for u in cands:
        try:
            b = get(u)
            if u.endswith('.svg') or b[:5] in (b'<?xml', b'<svg '): continue
            im = Image.open(io.BytesIO(b)); im.load()
            if min(im.size) >= 64 and (not top or min(im.size) > top[0]): top = (min(im.size), im.convert('RGBA'))
        except Exception: continue
    return top[1] if top else None
# 1) 오늘 기사에 나온 언론사 중 로고가 없는 곳 채우기
def sources(arg):
    try: d = json.loads(get(arg)) if arg.startswith('http') else json.load(open(arg))
    except Exception: return []
    out = []
    for i in d.get('issues', []):
        for s in [i] + (i.get('sources') or []): out.append((s.get('press') or '', s.get('ourl') or s.get('url') or ''))
    return out
host = lambda u: (urllib.parse.urlparse(u).hostname or '').removeprefix('www.')
added = 0
for arg in sys.argv[1:] or ['https://pyw31337.github.io/news/data/today.json', 'https://pyw31337.github.io/news/data/global.json']:
    for name, url in sources(arg):
        if not name or name in IDX: continue
        dom = name if re.fullmatch(r'[a-z0-9.\-]+\.[a-z]{2,}', name) else next((d for d, n in NAMES.items() if n == name), None) or host(url)
        if not dom or 'google.com' in dom or 'naver.com' in dom: continue
        f = dom.replace('.', '_') + '.webp'
        if not os.path.exists(os.path.join(OUT, f)):
            im = best(dom)
            if im is None: print('로고 없음', name, dom, flush=True); continue
            im.thumbnail((128, 128), Image.LANCZOS); im.save(os.path.join(OUT, f), 'WEBP', quality=90); added += 1; print('새 로고', name, dom, flush=True)
            json.dump(IDX, open(IP, 'w'), ensure_ascii=False, separators=(',', ':'))   # 중간 저장
        IDX[name] = f
IDX = {k: v for k, v in IDX.items() if v and not k.startswith('_')}
# 2) 배지 가공
def edge_color(im):
    w, h = im.size; px = im.load(); ring = [px[x, y] for x in range(w) for y in (0, 1, h - 2, h - 1)] + [px[x, y] for y in range(h) for x in (0, 1, w - 2, w - 1)]
    a = sorted(p[3] for p in ring)[len(ring) // 2]
    if a < 128: return None   # 가장자리가 투명
    rgb = [sorted(p[c] for p in ring)[len(ring) // 2] for c in range(3)]
    return tuple(rgb)
def trim(im, col):
    if col is None: bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    else:
        bgim = Image.new('RGBA', im.size, col + (255,)); diff = ImageChops.difference(im, bgim).convert('L').point(lambda v: 255 if v > 38 else 0); bb = diff.getbbox()
    return im.crop(bb) if bb else im
def lum(c): return .299 * c[0] + .587 * c[1] + .114 * c[2]
B, C = {}, {}
for f in sorted({v for v in IDX.values() if isinstance(v, str) and v.endswith('.webp')}):
    try: im = Image.open(os.path.join(OUT, f)).convert('RGBA')
    except Exception: continue
    col = edge_color(im)
    # 회색 테두리 액자(더팩트 등): 바깥 1~3px만 다른 색이면 안쪽 색을 가장자리 색으로
    inner = im.crop((4, 4, im.size[0] - 4, im.size[1] - 4)); icol = edge_color(inner)
    if col and icol and abs(lum(col) - lum(icol)) > 12: col = icol; im = inner
    lg = trim(im, col)
    S = 192; white = col is None or lum(col) > 238
    bg = (255, 255, 255, 255) if white else col + (255,)
    canvas = Image.new('RGBA', (S, S), bg)
    ar = lg.size[0] / max(1, lg.size[1])
    box = .66 if white else (.74 if .8 < ar < 1.25 else .78)   # 색 바탕 네모 로고는 바탕색이 원을 채우므로 조금 크게
    lg.thumbnail((int(S * box), int(S * box)), Image.LANCZOS)
    canvas.alpha_composite(lg, ((S - lg.size[0]) // 2, (S - lg.size[1]) // 2))
    canvas.convert('RGB').resize((96, 96), Image.LANCZOS).save(os.path.join(BD, f), 'WEBP', quality=88)
    B[f] = 'b/' + f; C[f] = '#%02x%02x%02x' % bg[:3]
IDX['_b'] = B; IDX['_c'] = C; IDX['_n'] = NAMES
json.dump(IDX, open(IP, 'w'), ensure_ascii=False, separators=(',', ':'))
print('press badges:', len(B), 'new logos:', added)
