#!/usr/bin/env python3
"""품질 점수(0~100) — 사진·기사·이슈·인물을 건별로 채점해 '좋은 것 먼저' 배열 (사용자 요청 t57u, 규칙 문서 docs/QUALITY.md)
data/today.json 을 읽어 각 항목에 q(총점)·qs(항목별 점수)를 붙이고, 갤러리·출처 기사·인물을 점수순으로 다시 정렬해 저장.
요약은 data/quality.json (관리자 화면·검증용). 실패해도 수집 파이프라인은 계속(워크플로 continue-on-error).
"""
import json, re, io, sys, os, time, hashlib, urllib.request, datetime
from concurrent.futures import ThreadPoolExecutor
try:
    from PIL import Image, ImageFilter, ImageStat
except Exception: Image = None
P = sys.argv[1] if len(sys.argv) > 1 else 'data/today.json'
UA = 'Mozilla/5.0 (NewsBoardQuality)'
SITE = 'https://pyw31337.github.io/news/'
CACHE_P = os.path.join(os.path.dirname(P), 'quality_cache.json')
# ---------- 공통 가중치(합 100) ----------
W_PHOTO = dict(res=30, sharp=20, orig=15, rel=15, subject=10, mark=5, fresh=5)
W_ART = dict(cred=25, orig=25, depth=20, cite=15, eng=15)
W_ISSUE = dict(heat=30, breadth=20, depth=20, photo=15, fresh=15)
W_PERSON = dict(heat=35, reach=25, record=25, photo=15)
# 언론사 신뢰 등급(공영·전국 종합/경제/통신 = A, 전국 방송·주요 일간 = B, 그 외 = C). 편향 평가가 아니라 '원 출처 가능성' 기준
TIER_A = set('연합뉴스 KBS MBC SBS JTBC YTN 한겨레 경향신문 조선일보 중앙일보 동아일보 한국일보 서울신문 국민일보 세계일보 매일경제 한국경제 서울경제 뉴스1 뉴시스 연합뉴스TV 한국경제TV MBN TV조선 채널A 머니투데이 이데일리 헤럴드경제 아시아경제 파이낸셜뉴스 문화일보 SBS Biz 조선비즈 비즈워치 한국방송 블로터 전자신문 디지털타임스 ZDNet Korea'.split())
WIRE = set('연합뉴스 뉴스1 뉴시스 연합뉴스TV'.split())
def clamp(x, a=0, b=1): return max(a, min(b, x))
def total(qs, W): return round(sum(qs[k] * W[k] for k in W))
def jl(p, d):
    try: return json.load(open(p))
    except Exception: return d

CACHE = jl(CACHE_P, {})
def probe(url):
    """사진 원본을 받아 크기·선명도(라플라시안 분산)·중앙 피사체 비중·워터마크 띠 여부를 잼. 결과는 캐시."""
    k = hashlib.sha1(url.encode()).hexdigest()[:16]
    if k in CACHE: return CACHE[k]
    r = {'w': 0, 'h': 0, 'sharp': 0, 'subject': 0.5, 'band': 0}
    if not Image or not url: return r
    try:
        if url.startswith('http'):
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA, 'Referer': ''}), timeout=12) as f: b = f.read(6_000_000)
        elif os.path.exists(url): b = open(url, 'rb').read()  # 수집 중엔 media/ 폴더에 WebP 원본이 있음
        else:
            with urllib.request.urlopen(urllib.request.Request(SITE + url, headers={'User-Agent': UA}), timeout=12) as f: b = f.read(6_000_000)
        im = Image.open(io.BytesIO(b)); r['w'], r['h'] = im.size
        g = im.convert('L'); g.thumbnail((480, 480))
        e = g.filter(ImageFilter.FIND_EDGES); r['sharp'] = round(ImageStat.Stat(e).var[0], 1)
        W, H = e.size; c = e.crop((W // 4, H // 4, 3 * W // 4, 3 * H // 4))
        tot = sum(ImageStat.Stat(e).sum) or 1; r['subject'] = round(sum(ImageStat.Stat(c).sum) / tot, 3)  # 가운데 1/4 면적에 윤곽이 몰릴수록 피사체가 분명
        bot = e.crop((0, int(H * .9), W, H)); r['band'] = round(ImageStat.Stat(bot).mean[0] / (ImageStat.Stat(e).mean[0] or 1), 2)  # 하단 띠에 글자(워터마크·자막) 몰림
    except Exception as ex: r['err'] = str(ex)[:60]
    CACHE[k] = r; return r

def words(s): return set(w for w in re.findall(r'[가-힣A-Za-z0-9]{2,}', s or ''))
def date_in_url(u):
    m = re.search(r'(20\d\d)[/-]?(\d\d)[/-]?(\d\d)', u or '')
    try: return datetime.date(int(m[1]), int(m[2]), int(m[3])) if m else None
    except Exception: return None

def score_photo(g, iss, n_same):
    p = probe(g.get('img', ''))
    w = p.get('w', 0); d = date_in_url(g.get('img', ''))
    kw = words(' '.join(iss.get('keywords', []) + iss.get('entities', [])))
    src = next((s for s in iss.get('sources', []) if s.get('url') == g.get('url')), {})
    rel = len(kw & words(src.get('title', '') or iss.get('title', ''))) / max(1, min(4, len(kw)))
    qs = dict(res=clamp((w - 400) / 1200),                       # 1600px 이상 만점, 400px 이하 0
              sharp=clamp(p.get('sharp', 0) / 2500),               # 윤곽 분산(흐림·과압축은 낮음)
              orig=0.35 if (g.get('press') in WIRE or n_same > 1) else 1.0,  # 통신사 배포·여러 매체 재사용 = 재게시
              rel=clamp(rel),
              subject=clamp((p.get('subject', .25) - .2) / .35),  # 중앙 피사체(인물·현장) 뚜렷함
              mark=0.0 if (p.get('band', 0) > 2.2 or re.search(r'logo|watermark|wm_|banner', g.get('img', ''), re.I)) else 1.0,
              fresh=1.0 if not d else clamp(1 - (datetime.date.today() - d).days / 30))
    return total(qs, W_PHOTO), {k: round(v, 2) for k, v in qs.items()}, p

def score_article(s, iss, dup):
    t = s.get('title', '')
    qs = dict(cred=1.0 if s.get('press') in TIER_A else 0.55,
              orig=clamp((1.0 if re.search(r'\[단독\]|단독|\[인터뷰\]|탐사|기획', t) else 0.7) - 0.25 * max(0, dup - 1)),
              depth=clamp(len(s.get('desc') or s.get('body') or t) / 160),
              cite=clamp(len(re.findall(r'["“”‘’]', t)) / 4 + (0.4 if re.search(r'\d', t) else 0)),
              eng=1.0 if s.get('kind') in ('많이 본', '댓글 많은') else (0.6 if s.get('portal') == '네이버' else 0.4))
    return total(qs, W_ART), {k: round(v, 2) for k, v in qs.items()}

def run():
    D = json.load(open(P)); today = D.get('date') or datetime.date.today().isoformat()
    mx = max([i.get('score', 0) for i in D['issues']] + [1]); out = {'at': datetime.datetime.now().isoformat(timespec='minutes'), 'issues': []}
    jobs = [g.get('img') for i in D['issues'] for g in (i.get('gallery') or []) if g.get('img')]
    with ThreadPoolExecutor(8) as ex: list(ex.map(probe, jobs[:160]))
    for i in D['issues']:
        G = i.get('gallery') or []
        seen = {}
        for g in G: k = re.sub(r'\?.*|_\d+x\d+|w\d+', '', g.get('img', '')).rsplit('/', 1)[-1]; seen[k] = seen.get(k, 0) + 1; g['_k'] = k
        for g in G:
            g['q'], g['qs'], p = score_photo(g, i, seen[g.pop('_k')]); g['w'] = p.get('w', 0); g['h'] = p.get('h', 0)
        G.sort(key=lambda g: -g['q']); i['gallery'] = G
        tk = {}
        for s in i.get('sources', []): k = re.sub(r'\W', '', s.get('title', ''))[:14]; tk[k] = tk.get(k, 0) + 1
        for s in i.get('sources', []): s['q'], s['qs'] = score_article(s, i, tk[re.sub(r'\W', '', s.get('title', ''))[:14]])
        i['sources'] = sorted(i.get('sources', []), key=lambda s: -s['q'])
        best = G[0]['q'] if G else 0
        qs = dict(heat=clamp(i.get('score', 0) / mx), breadth=clamp(i.get('presses', 0) / 30),
                  depth=clamp(len(i.get('flow') or []) / 6 * .6 + len(i.get('past') or []) / 5 * .4), photo=best / 100,
                  fresh=1.0 if (i.get('flow') or [{}])[0].get('date', today) >= today else 0.6)
        i['q'], i['qs'] = total(qs, W_ISSUE), {k: round(v, 2) for k, v in qs.items()}
        out['issues'].append({'id': i['id'], 'q': i['q'], 'photo_best': best, 'photos': len(G), 'src_top': i['sources'][0]['q'] if i['sources'] else 0})
    E = D.get('entities') or []; me = max([len(e.get('timeline') or []) for e in E] + [1]); mi = max([e.get('count', 0) or 0 for e in E] + [1])
    for e in E:
        qs = dict(heat=clamp((e.get('count') or len(e.get('timeline') or [])) / mi), reach=1.0 if e.get('wiki') else 0.4,
                  record=clamp(len(e.get('timeline') or []) / me), photo=1.0 if (e.get('img') or e.get('image') or (e.get('wiki') or {}).get('img')) else 0.0)
        e['q'], e['qs'] = total(qs, W_PERSON), {k: round(v, 2) for k, v in qs.items()}
    out['people_avg'] = round(sum(e['q'] for e in E) / max(1, len(E)), 1)
    json.dump(D, open(P, 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump(out, open(os.path.join(os.path.dirname(P), 'quality.json'), 'w'), ensure_ascii=False)
    if len(CACHE) > 4000: [CACHE.pop(k) for k in list(CACHE)[:len(CACHE) - 4000]]
    json.dump(CACHE, open(CACHE_P, 'w'))
    print('품질 점수:', json.dumps(out['issues'][:3], ensure_ascii=False), '인물 평균', out['people_avg'])

if __name__ == '__main__': run()
