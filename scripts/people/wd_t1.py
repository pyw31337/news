#!/usr/bin/env python3
"""1계층 인물의 위키데이터 사실(CC0)과 대표 사진(Wikimedia Commons, 자유 라이선스)을 한 번에 모은다.

  python scripts/people/wd_t1.py <data> [--photos <out_dir>] [--upload] [--limit N]

입력: db/people/tiers/current.json.gz(1계층), registry.json.gz, graph.py와 같은 pol→wd 묶기.
출력(data 브랜치):
  db/people/wd_t1.json.gz   id → {l 이름, d 설명, b 출생연도, bp 출생지, dd 사망연도, w 위키백과 제목, img Commons 파일,
                                 pos/edu/emp/party/mem/team/award/occ: [[Q, 이름, 시작연도, 끝연도]], site 공식 사이트}
  db/people/photos_t1.json  id → {k R2 키(720px), s R2 키(128px), w,h 원본 크기, src Commons 파일 주소, lic 라이선스, by 저작자}
규칙: 고정 QID만 사용(이름 검색 없음), 미성년(출생 19년 이내)·라이선스 미상·비자유 파일 제외, 사진은 원본이 128px 미만이면 제외.
사진 파일은 --photos 폴더에 쓰고 --upload면 Worker /pub/put(OIDC)으로 R2 people/pt/에 올림. 실패분은 14일 뒤 재시도.
"""
import argparse, datetime as dt, gzip, hashlib, html, io, json, os, re, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pcommon import load, norm_name  # noqa: E402

UA = 'NewsBoardPeople/1.1 (+https://github.com/pyw31337/news)'
API = 'https://www.wikidata.org/w/api.php'
CAPI = 'https://commons.wikimedia.org/w/api.php'
NOW = dt.datetime.now(dt.timezone(dt.timedelta(hours=9)))
PROPS = {'P39': 'pos', 'P69': 'edu', 'P108': 'emp', 'P102': 'party', 'P463': 'mem', 'P54': 'team', 'P166': 'award', 'P106': 'occ', 'P264': 'label'}
FREE = re.compile(r'^(cc[- ]?by|cc0|cc[- ]?zero|public domain|pd|gfdl|attribution|copyrighted free use|kogl|공공누리|ogl|godl|licence ouverte|no restrictions|정보공유라이선스)', re.I)


def get(url, params, tries=4):
    q = url + '?' + urllib.parse.urlencode(params)
    for n in range(tries):
        try:
            r = urllib.request.Request(q, headers={'User-Agent': UA, 'Accept': 'application/json'})
            with urllib.request.urlopen(r, timeout=40) as x:
                return json.loads(x.read().decode())
        except Exception as e:
            if n == tries - 1:
                print('  실패', str(e)[:80]); return {}
            time.sleep(3 * (n + 1))


def year(snak):
    try:
        t = snak['datavalue']['value']['time']
        return int(t[1:5]) if t[0] in '+-' else None
    except Exception:
        return None


def qual_year(cl, *ps):
    for p in ps:
        for s in (cl.get('qualifiers') or {}).get(p, []):
            y = year(s)
            if y:
                return y
    return None


def tier1(data):
    PD = os.path.join(data, 'db', 'people')
    tiers = (load(os.path.join(PD, 'tiers', 'current.json.gz'), {}) or {}).get('people', {})
    reg = {r['id']: r for r in (load(os.path.join(PD, 'registry.json.gz'), []) or [])}
    pub = {k: v for k, v in tiers.items() if v.get('t') in (1, 2)}
    by = {}
    for k, v in pub.items():
        by.setdefault(norm_name(v.get('n', '')), []).append(k)
    b = lambda p: int(str((reg.get(p) or {}).get('b') or '0')[:4] or 0)
    ids = set()
    for k, v in tiers.items():
        if v.get('t') != 1:
            continue
        if k.startswith('wd:Q'):
            ids.add(k[3:])
        elif k.startswith('pol:') and b(k):
            c = [q for q in by.get(norm_name(v.get('n', '')), []) if q.startswith('wd:Q') and pub[q].get('k') == '정치' and b(q) and abs(b(q) - b(k)) <= 1]
            if len(c) == 1:
                ids.add(c[0][3:])
    return sorted(ids, key=lambda q: int(q[1:]))


def facts(qids):
    out, refs = {}, set()
    for i in range(0, len(qids), 50):
        chunk = qids[i:i + 50]
        j = get(API, {'action': 'wbgetentities', 'ids': '|'.join(chunk), 'props': 'labels|descriptions|claims|sitelinks', 'languages': 'ko|en', 'sitefilter': 'kowiki', 'format': 'json'})
        for q, e in (j.get('entities') or {}).items():
            if 'missing' in e:
                continue
            C = e.get('claims') or {}
            lab = lambda d: (d.get('ko') or d.get('en') or {}).get('value', '')
            r = {'l': lab(e.get('labels') or {}), 'd': lab(e.get('descriptions') or {})}
            for p, key in (('P569', 'b'), ('P570', 'dd')):
                for c in C.get(p, []):
                    y = year(c.get('mainsnak') or {})
                    if y:
                        r[key] = y; break
            if r.get('b') and r['b'] > NOW.year - 19:
                continue  # 미성년 제외
            bp = [c['mainsnak']['datavalue']['value']['id'] for c in C.get('P19', []) if (c.get('mainsnak') or {}).get('datavalue')]
            if bp:
                r['bp'] = bp[0]; refs.add(bp[0])
            for p, key in PROPS.items():
                L = []
                for c in C.get(p, []):
                    if c.get('rank') == 'deprecated':
                        continue
                    try:
                        v = c['mainsnak']['datavalue']['value']['id']
                    except Exception:
                        continue
                    a = qual_year(c, 'P580', 'P585'); z = qual_year(c, 'P582')
                    L.append([v, a, z]); refs.add(v)
                if L:
                    r[key] = L
            img = [c['mainsnak']['datavalue']['value'] for c in C.get('P18', []) if (c.get('mainsnak') or {}).get('datavalue') and c.get('rank') != 'deprecated']
            if img:
                r['img'] = img[0]
            site = [c['mainsnak']['datavalue']['value'] for c in C.get('P856', []) if (c.get('mainsnak') or {}).get('datavalue')]
            if site:
                r['site'] = site[0]
            w = (e.get('sitelinks') or {}).get('kowiki', {}).get('title')
            if w:
                r['w'] = w
            out['wd:' + q] = r
        time.sleep(0.2)
        if i % 500 == 0:
            print('  사실', i, '/', len(qids))
    return out, refs


def labels(refs):
    L = {}
    refs = sorted(refs)
    for i in range(0, len(refs), 50):
        j = get(API, {'action': 'wbgetentities', 'ids': '|'.join(refs[i:i + 50]), 'props': 'labels', 'languages': 'ko|en', 'format': 'json'})
        for q, e in (j.get('entities') or {}).items():
            d = e.get('labels') or {}
            L[q] = (d.get('ko') or d.get('en') or {}).get('value', '')
        time.sleep(0.15)
    return L


def clean(s):
    return re.sub(r'<[^>]+>', '', html.unescape(str(s or ''))).strip()


def image_info(files):
    out = {}
    files = sorted(set(files))
    for i in range(0, len(files), 40):
        chunk = files[i:i + 40]
        j = get(CAPI, {'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': '720', 'titles': '|'.join('File:' + f for f in chunk)})
        norm = {n['to']: n['from'] for n in (j.get('query') or {}).get('normalized', [])}
        for p in ((j.get('query') or {}).get('pages') or {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            md = ii.get('extmetadata') or {}
            f = lambda k: clean((md.get(k) or {}).get('value'))
            lic = f('LicenseShortName') or f('UsageTerms')
            title = norm.get(p.get('title', ''), p.get('title', ''))[5:]
            if not ii.get('thumburl') or not lic:
                continue
            out[title] = {'u': ii['thumburl'], 'w': ii.get('width', 0), 'h': ii.get('height', 0), 'lic': lic, 'by': f('Artist')[:120],
                          'src': 'https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(title.replace(' ', '_'))}
        time.sleep(0.2)
    return out


def webp(blob, size):
    from PIL import Image
    with Image.open(io.BytesIO(blob)) as s:
        s.load(); im = s.convert('RGB')
    im.thumbnail((size, size), Image.Resampling.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=82, method=6); return b.getvalue(), im.size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('data'); ap.add_argument('--photos'); ap.add_argument('--upload', action='store_true'); ap.add_argument('--limit', type=int, default=0)
    a = ap.parse_args()
    PD = os.path.join(a.data, 'db', 'people')
    qids = tier1(a.data)
    if a.limit:
        qids = qids[:a.limit]
    print('1계층 위키데이터 인물', len(qids))
    F, refs = facts(qids)
    L = labels(refs)
    for r in F.values():
        if 'bp' in r:
            r['bp'] = [r['bp'], L.get(r['bp'], '')]
        for key in PROPS.values():
            if key in r:
                r[key] = [[q, L.get(q, ''), s, e] for q, s, e in r[key] if L.get(q)]
    with gzip.open(os.path.join(PD, 'wd_t1.json.gz'), 'wt', encoding='utf-8') as f:
        json.dump({'updated': NOW.isoformat(timespec='seconds'), 'license': 'CC0 (Wikidata)', 'items': F}, f, ensure_ascii=False, separators=(',', ':'))
    print('사실 저장', len(F))
    if not a.photos:
        return
    mpath = os.path.join(PD, 'photos_t1.json')
    M = load(mpath, {}) or {}
    M.setdefault('items', {}); M.setdefault('skip', {})
    todo = {}
    for pid, r in F.items():
        f = r.get('img')
        if not f:
            continue
        cur = M['items'].get(pid)
        if cur and cur.get('file') == f:
            continue
        sk = M['skip'].get(pid)
        if sk and sk.get('file') == f and not sk.get('why', '').startswith(('download', 'upload')) and (NOW.date() - dt.date.fromisoformat(sk['at'][:10])).days < 14:
            continue
        todo[pid] = f
    print('사진 후보', len(todo))
    info = image_info(list(todo.values()))
    if a.upload:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        import media_r2
    def one(item):
        pid, f = item
        ii = info.get(f)
        if not ii:
            return pid, None, 'no_info'
        if not FREE.search(ii['lic']) or re.search(r'non[- ]?free|fair use', ii['lic'], re.I):
            return pid, None, 'license:' + ii['lic'][:40]
        if min(ii['w'] or 0, ii['h'] or 0) < 128:
            return pid, None, 'small'
        blob, err = None, ''
        for n in range(5):  # upload.wikimedia.org는 몰리면 429 → 천천히 재시도
            try:
                r = urllib.request.Request(ii['u'], headers={'User-Agent': UA, 'Accept': 'image/*'})
                blob = urllib.request.urlopen(r, timeout=40).read(8 * 1024 * 1024); break
            except Exception as e:
                err = str(e)[:40]; time.sleep(4 * (n + 1))
        if blob is None:
            return pid, None, 'download:' + err
        try:
            big, bs = webp(blob, 720); small, _ = webp(blob, 128)
        except Exception as e:
            return pid, None, 'decode:' + str(e)[:40]
        h = hashlib.sha256((pid + '\0' + f).encode()).hexdigest()[:16]
        k, s = 'people/pt/%s/%s.webp' % (h[:2], h), 'people/pt/%s/%s_s.webp' % (h[:2], h)
        os.makedirs(os.path.join(a.photos, 'pt', h[:2]), exist_ok=True)
        open(os.path.join(a.photos, 'pt', h[:2], h + '.webp'), 'wb').write(big)
        open(os.path.join(a.photos, 'pt', h[:2], h + '_s.webp'), 'wb').write(small)
        if a.upload and not (media_r2.put(k, big) and media_r2.put(s, small)):
            return pid, None, 'upload'
        return pid, {'k': k, 's': s, 'w': ii['w'], 'h': ii['h'], 'tw': bs[0], 'th': bs[1], 'src': ii['src'], 'lic': ii['lic'], 'by': ii['by'], 'file': f, 'at': NOW.isoformat(timespec='seconds')}, ''
    ok = bad = 0
    with ThreadPoolExecutor(2) as ex:
        for pid, rec, why in ex.map(one, todo.items()):
            if rec:
                M['items'][pid] = rec; M['skip'].pop(pid, None); ok += 1
            else:
                M['skip'][pid] = {'file': todo[pid], 'why': why, 'at': NOW.isoformat(timespec='seconds')}; bad += 1
    M['updated'] = NOW.isoformat(timespec='seconds')
    json.dump(M, open(mpath, 'w'), ensure_ascii=False, indent=0)
    print('사진 저장', ok, '제외', bad, '합계', len(M['items']))


if __name__ == '__main__':
    main()
