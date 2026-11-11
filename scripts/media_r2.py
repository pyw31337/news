#!/usr/bin/env python3
"""사진을 GitHub(media 브랜치·Pages)에서 Cloudflare R2로: docs/DATA.md 「사진·큰 파일」
  python scripts/media_r2.py upload <media폴더> [정치인브랜치폴더]   새 파일만 R2 pub/에 올리고 <media>/r2.json에 기록, 올린 파일은 지움(--keep이면 남김)
  python scripts/media_r2.py rewrite <_site> <media폴더>            사이트 JSON의 media/img·media/ent 주소 중 R2에 있는 것을 Worker 주소로 바꿈
R2 키: pub/img/<xx>/<해시>.webp(기사 썸네일), pub/ent/<xx>/<해시>.webp(인물·로고), pub/pol/<국회id>.webp(정치인 공식 사진)
읽기: https://newsboard-sync.pyw213.workers.dev/m/<키>(CDN 1년 캐시). 쓰기: GitHub Actions OIDC만.
시간 상한 MEDIA_R2_SEC(기본 420초) 안에서 처리하고 남은 것은 다음 실행이 이어서 올림(r2.json이 체크포인트)."""
import hashlib, json, os, re, sys, threading, time, urllib.request, urllib.error, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

W = os.environ.get('NB_WORKER', 'https://newsboard-sync.pyw213.workers.dev')
BASE = W + '/m/'
UA = 'curl/8 newsboard-media'
_tok = {'v': None, 'at': 0}
_lock = threading.Lock()


def token():
    with _lock:
        if _tok['v'] and time.time() - _tok['at'] < 180:
            return _tok['v']
        u, t = os.environ.get('ACTIONS_ID_TOKEN_REQUEST_URL'), os.environ.get('ACTIONS_ID_TOKEN_REQUEST_TOKEN')
        if not (u and t):
            raise SystemExit('OIDC 없음(GitHub Actions에서만 실행)')
        r = urllib.request.Request(u + '&audience=newsboard-sync', headers={'Authorization': 'bearer ' + t, 'User-Agent': UA})
        _tok['v'] = json.load(urllib.request.urlopen(r, timeout=20))['value']; _tok['at'] = time.time()
        return _tok['v']


def put(key, body):
    for n in range(3):
        try:
            r = urllib.request.Request(W + '/pub/put?k=' + urllib.parse.quote(key, safe='/'), data=body, method='PUT',
                                       headers={'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/octet-stream', 'User-Agent': UA,
                                                'X-Sha256': hashlib.sha256(body).hexdigest()})
            with urllib.request.urlopen(r, timeout=60) as x:
                if json.loads(x.read()).get('bytes') == len(body):
                    return True
        except Exception as e:
            if n == 2:
                print('  실패', key, str(e)[:80])
        time.sleep(2 * (n + 1))
    return False


def files(media, pol):
    out = []
    for sub in ('img', 'ent'):
        root = os.path.join(media, sub)
        for d, _, fs in os.walk(root):
            for fn in fs:
                if fn.endswith(('.webp', '.png', '.jpg')):
                    p = os.path.join(d, fn); out.append((os.path.relpath(p, media), p))
    if pol and os.path.isdir(os.path.join(pol, 'photos')):
        for fn in os.listdir(os.path.join(pol, 'photos')):
            if fn.endswith('.webp'):
                out.append(('pol/' + fn, os.path.join(pol, 'photos', fn)))
    return out


def upload(media, pol=None, keep=False):
    rp = os.path.join(media, 'r2.json')
    st = json.load(open(rp)) if os.path.exists(rp) else {'files': {}}
    F = st['files']
    todo = []
    for rel, p in files(media, pol):
        sz = os.path.getsize(p)
        if F.get(rel) != sz:
            todo.append((rel, p, sz))
    end = time.time() + int(os.environ.get('MEDIA_R2_SEC', '420'))
    ok = fail = 0
    t0 = time.time()
    with ThreadPoolExecutor(16) as ex:
        it = iter(todo); fut = {}
        def more():
            for rel, p, sz in it:
                if time.time() > end:
                    return
                fut[ex.submit(put, rel, open(p, 'rb').read())] = (rel, sz)
                if len(fut) >= 64:
                    return
        more()
        while fut:
            for f in as_completed(list(fut)):
                rel, sz = fut.pop(f)
                if f.result():
                    F[rel] = sz; ok += 1
                else:
                    fail += 1
                break
            more()
            if ok and ok % 1000 == 0:
                json.dump(st, open(rp, 'w'), separators=(',', ':'))
    st['updated'] = time.strftime('%Y-%m-%dT%H:%M:%S%z'); st['count'] = len(F); st['bytes'] = sum(F.values())
    json.dump(st, open(rp, 'w'), separators=(',', ':'), sort_keys=True)
    pruned = 0
    if not keep:   # 올린 사진은 media 브랜치에서 지움(R2가 원본). 정치인 사진은 politicians 브랜치 것이라 손대지 않음
        for rel, p in files(media, None):
            if F.get(rel) == os.path.getsize(p):
                os.remove(p); pruned += 1
    left = len(todo) - ok
    print(f'media→R2: 새로 {ok}개, 실패 {fail}, 남음 {left}, R2 합계 {len(F)}개 {st["bytes"] / 1e6:.0f}MB, media 브랜치에서 지움 {pruned}, {time.time() - t0:.0f}초')
    return left


REF = re.compile(r'"media/((?:img|ent)/[0-9a-f]{2}/[^"\\]+)"')


def rewrite(site, media):
    rp = os.path.join(media, 'r2.json')
    F = (json.load(open(rp)) if os.path.exists(rp) else {}).get('files', {})
    if not F:
        print('rewrite: r2.json 없음 → 그대로'); return
    n = files_n = 0
    for d, _, fs in os.walk(os.path.join(site, 'data')):
        for fn in fs:
            if not fn.endswith('.json'):
                continue
            p = os.path.join(d, fn)
            s = open(p, encoding='utf-8', errors='surrogatepass').read()
            if '"media/' not in s:
                continue
            c = [0]
            def sub(m):
                if m.group(1) in F:
                    c[0] += 1; return '"' + BASE + m.group(1) + '"'
                return m.group(0)
            s2 = REF.sub(sub, s)
            if c[0]:
                open(p, 'w', encoding='utf-8', errors='surrogatepass').write(s2); n += c[0]; files_n += 1
    print(f'rewrite: {files_n}개 파일에서 사진 주소 {n}개 → R2')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'upload':
        upload(a[1], a[2] if len(a) > 2 and not a[2].startswith('--') else None, keep='--keep' in a)
    elif a and a[0] == 'rewrite':
        rewrite(a[1], a[2])
    else:
        print(__doc__)
