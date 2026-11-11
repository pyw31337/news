"""수집 기사 대표 이미지(og:image) 보강 → R2 img/og/<hh>/<해시>.webp(긴 변 480px), 추가 전용.
  python scripts/og_backfill.py <data> [--upload] [--max N] [--sec S]
대상 우선순위: 1계층 인물 기사 타임라인(db/people/t) → 기사 DB(db/articles). news.google.com(중계 주소)은 제외.
robots.txt를 지키고, 같은 사이트는 1.5초에 한 번만, 회차당 --max 건·--sec 초 안에서만. 실패는 30일 뒤 다시.
목록: db/og/map.json {u: {기사주소: [키, 폭, 높이]}, skip: {기사주소: 날짜}} — 지우지 않고 더하기만.
"""
import argparse, datetime as dt, glob, gzip, hashlib, html, io, json, os, re, sys, time, urllib.parse, urllib.request, urllib.robotparser
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict
import threading

UA = 'NewsBoardThumb/1.0 (+https://github.com/pyw31337/news)'
NOW = dt.datetime.now(dt.timezone(dt.timedelta(hours=9)))
OG = re.compile(r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]*>', re.I)
CONTENT = re.compile(r'content=["\']([^"\']+)["\']', re.I)
SKIP_HOST = re.compile(r'(^|\.)news\.google\.com$')
ROBOTS, LAST, LOCK = {}, defaultdict(float), threading.Lock()


def jl(p, d):
    try:
        return json.load(gzip.open(p, 'rt') if p.endswith('.gz') else open(p))
    except Exception:
        return d


def allowed(u):
    p = urllib.parse.urlsplit(u); base = p.scheme + '://' + p.netloc
    with LOCK:
        rp = ROBOTS.get(base)
    if rp is None:
        rp = urllib.robotparser.RobotFileParser()
        try:
            raw = urllib.request.urlopen(urllib.request.Request(base + '/robots.txt', headers={'User-Agent': UA}), timeout=15).read(200000).decode('utf-8', 'ignore')
            rp.parse(raw.splitlines())
        except Exception:
            rp.parse([])
        with LOCK:
            ROBOTS[base] = rp
    return rp.can_fetch(UA, u)


def polite(host):
    while True:
        with LOCK:
            w = LAST[host] + 1.5 - time.time()
            if w <= 0:
                LAST[host] = time.time(); return
        time.sleep(w)


def get(u, limit):
    polite(urllib.parse.urlsplit(u).netloc)
    r = urllib.request.Request(u, headers={'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(r, timeout=20) as x:
        return x.read(limit), x.geturl()


def og_image(u):
    if not allowed(u):
        return None, 'robots'
    body, final = get(u, 600000)
    m = OG.search(body.decode('utf-8', 'ignore'))
    c = CONTENT.search(m.group(0)) if m else None
    if not c:
        return None, 'no_og'
    img = urllib.parse.urljoin(final, html.unescape(c.group(1)).strip())
    if not img.startswith('http') or re.search(r'logo|default|noimage|no_image|blank', img, re.I):
        return None, 'generic'
    return img, ''


def webp(blob):
    from PIL import Image
    with Image.open(io.BytesIO(blob)) as s:
        s.load(); im = s.convert('RGB')
    if min(im.size) < 160:
        raise ValueError('small')
    im.thumbnail((480, 480), Image.Resampling.LANCZOS)  # 화면 240px × 2
    b = io.BytesIO(); im.save(b, 'WEBP', quality=78, method=6); return b.getvalue(), im.size


def targets(data):
    PD = os.path.join(data, 'db', 'people')
    out, seen = [], set()
    for f in sorted(glob.glob(os.path.join(PD, 't', '*', '*', '*.json.gz')), reverse=True):
        for r in jl(f, []):
            if len(r) > 2 and r[2] and r[2] not in seen:
                seen.add(r[2]); out.append(r[2])
    for f in sorted(glob.glob(os.path.join(data, 'db', 'articles', '*', '*.json.gz')), reverse=True):
        for a in jl(f, []):
            u = a.get('url')
            if u and u not in seen:
                seen.add(u); out.append(u)
    return [u for u in out if u.startswith('http') and not SKIP_HOST.search(urllib.parse.urlsplit(u).netloc)]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('data'); ap.add_argument('--upload', action='store_true')
    ap.add_argument('--max', type=int, default=2500); ap.add_argument('--sec', type=int, default=2400)
    a = ap.parse_args()
    mp = os.path.join(a.data, 'db', 'og', 'map.json'); os.makedirs(os.path.dirname(mp), exist_ok=True)
    M = jl(mp, {}); M.setdefault('u', {}); M.setdefault('skip', {})
    T = targets(a.data)
    todo = [u for u in T if u not in M['u'] and (NOW.date() - dt.date.fromisoformat(M['skip'].get(u, '2000-01-01')[:10])).days >= 30][:a.max]
    print('대상', len(T), '완료', sum(1 for u in T if u in M['u']), '이번 회차', len(todo))
    put = None
    if a.upload:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import media_r2
        put = media_r2.put
    t0 = time.time()
    def one(u):
        if time.time() - t0 > a.sec:
            return u, None, None
        try:
            img, why = og_image(u)
            if not img:
                return u, None, why
            blob, _ = get(img, 6 * 1024 * 1024)
            b, sz = webp(blob)
        except Exception as e:
            return u, None, 'err:' + str(e)[:30]
        h = hashlib.sha256(u.encode()).hexdigest()[:20]
        k = 'img/og/%s/%s.webp' % (h[:2], h)
        if put and not put(k, b):
            return u, None, 'upload'
        return u, [k, sz[0], sz[1]], ''
    ok = bad = 0; why = defaultdict(int)
    with ThreadPoolExecutor(6) as ex:
        for u, rec, w in ex.map(one, todo):
            if w is None and rec is None:
                continue
            if rec:
                M['u'][u] = rec; M['skip'].pop(u, None); ok += 1
            else:
                M['skip'][u] = NOW.date().isoformat(); bad += 1; why[w.split(':')[0]] += 1
            if (ok + bad) % 250 == 0:
                json.dump(M, open(mp, 'w'), separators=(',', ':'))
    M['updated'] = NOW.isoformat(timespec='seconds')
    json.dump(M, open(mp, 'w'), separators=(',', ':'))
    print('저장', ok, '실패', bad, dict(why), '합계', len(M['u']), '/', len(T))


if __name__ == '__main__':
    main()
