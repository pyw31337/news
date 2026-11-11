"""1계층 인물 주변 시각 자료(위키미디어 공용, 자유 이용 허락만) → R2.
  python scripts/people/wd_media.py <data> [--upload] [--logos] [--dated] [--max-people N]

로고·상징: wd_t1.json.gz의 정당·학교·소속·기관·팀·레이블 QID → P154 로고 > P158 인장 > P94 문장 > P41 깃발.
  SVG는 공용 썸네일러로 512px 투명 WebP로 바꿔 저장(Worker가 SVG를 내려 주지 않음, 보안상 그대로 둠).
  R2 ent/lg/<hh>/<해시>.webp(512) · _s.webp(128). 목록 db/people/logos.json {items: QID → {...}, skip}.
연도별 사진: 공용 구조화 데이터 'depicts(P180) = 그 사람 QID'인 파일만(이름 검색·얼굴 추정 없음),
  P180에 다른 사람이 함께 있으면 제외, 날짜(P571 또는 촬영일)가 있어야 함. 지금·5·10·20년 전에 가장 가까운 것.
  R2 people/ph/<hh>/<해시>.webp(720). 목록 db/people/photos_dated.json {items: 인물id → [{y, k, w, h, src, lic, by, file}], done}.
추가 전용: 이미 올린 파일은 다시 받지 않음. 회차당 --max-people 명씩 돌아가며 처리.
"""
import argparse, datetime as dt, gzip, hashlib, io, json, os, re, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pcommon import load  # noqa: E402
from wd_t1 import UA, API, CAPI, FREE, get, clean  # noqa: E402

NOW = dt.datetime.now(dt.timezone(dt.timedelta(hours=9)))
LOGO_P = ['P154', 'P158', 'P94', 'P41']
GKIND = {'party': 'party', 'edu': 'school', 'emp': 'career', 'mem': 'org', 'team': 'career', 'label': 'org'}


def imageinfo(titles, width):
    out = {}
    titles = sorted(set(titles))
    for i in range(0, len(titles), 40):
        j = get(CAPI, {'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata|mime', 'iiurlwidth': str(width),
                       'titles': '|'.join('File:' + t for t in titles[i:i + 40])})
        norm = {n['to']: n['from'] for n in (j.get('query') or {}).get('normalized', [])}
        for p in ((j.get('query') or {}).get('pages') or {}).values():
            ii = (p.get('imageinfo') or [{}])[0]; md = ii.get('extmetadata') or {}
            f = lambda k: clean((md.get(k) or {}).get('value'))
            t = norm.get(p.get('title', ''), p.get('title', ''))[5:]
            lic = f('LicenseShortName') or f('UsageTerms')
            if not ii.get('thumburl') or not lic:
                continue
            out[t] = {'u': ii['thumburl'], 'w': ii.get('width', 0), 'h': ii.get('height', 0), 'mime': ii.get('mime', ''), 'lic': lic, 'by': f('Artist')[:120],
                      'date': f('DateTimeOriginal'), 'pid': p.get('pageid'), 'src': 'https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(t.replace(' ', '_'))}
        time.sleep(0.2)
    return out


def free(lic):
    return bool(FREE.search(lic)) and not re.search(r'non[- ]?free|fair use', lic, re.I)


def fetch(u):
    for n in range(5):
        try:
            return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA, 'Accept': 'image/*'}), timeout=40).read(8 * 1024 * 1024)
        except Exception:
            time.sleep(4 * (n + 1))
    return None


def webp(blob, size, alpha=False):
    from PIL import Image
    with Image.open(io.BytesIO(blob)) as s:
        s.load(); im = s.convert('RGBA' if alpha else 'RGB')
    im.thumbnail((size, size), Image.Resampling.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=86 if alpha else 82, method=6); return b.getvalue(), im.size


def logos(PD, W, up):
    path = os.path.join(PD, 'logos.json')
    M = load(path, {}) or {}; M.setdefault('items', {}); M.setdefault('skip', {})
    want = {}
    for r in W.values():
        for k, g in GKIND.items():
            for q, label, *_ in r.get(k, []):
                if label and not re.fullmatch(r'Q\d+', label):
                    want.setdefault(q, set()).add('g:%s:%s' % (g, label))
    todo = [q for q in want if q not in M['items'] and (NOW.date() - dt.date.fromisoformat((M['skip'].get(q) or {}).get('at', '2000-01-01')[:10])).days >= 30]
    print('로고 대상', len(want), '이번 회차', len(todo))
    files = {}
    for i in range(0, len(todo), 50):
        j = get(API, {'action': 'wbgetentities', 'ids': '|'.join(todo[i:i + 50]), 'props': 'claims', 'format': 'json'})
        for q, e in (j.get('entities') or {}).items():
            C = e.get('claims') or {}
            for p in LOGO_P:
                v = [c['mainsnak']['datavalue']['value'] for c in C.get(p, []) if (c.get('mainsnak') or {}).get('datavalue') and c.get('rank') != 'deprecated']
                if v:
                    files[q] = (v[0], p); break
        time.sleep(0.2)
    for q in todo:
        if q not in files:
            M['skip'][q] = {'why': 'none', 'at': NOW.isoformat(timespec='seconds')}
    info = imageinfo([f for f, _ in files.values()], 512)
    def one(q):
        f, p = files[q]; ii = info.get(f)
        if not ii:
            return q, None, 'no_info'
        if not free(ii['lic']):
            return q, None, 'license:' + ii['lic'][:40]
        blob = fetch(ii['u'])
        if not blob:
            return q, None, 'download'
        try:
            big, bs = webp(blob, 512, True); small, _ = webp(blob, 128, True)
        except Exception as e:
            return q, None, 'decode:' + str(e)[:40]
        h = hashlib.sha256((q + '\0' + f).encode()).hexdigest()[:16]
        k, s = 'ent/lg/%s/%s.webp' % (h[:2], h), 'ent/lg/%s/%s_s.webp' % (h[:2], h)
        if up and not (up(k, big) and up(s, small)):
            return q, None, 'upload'
        return q, {'k': k, 's': s, 'w': bs[0], 'h': bs[1], 'prop': p, 'svg': ii['mime'] == 'image/svg+xml', 'src': ii['src'], 'lic': ii['lic'], 'by': ii['by'], 'file': f,
                   'at': NOW.isoformat(timespec='seconds')}, ''
    ok = 0
    with ThreadPoolExecutor(2) as ex:
        for q, rec, why in ex.map(one, list(files)):
            if rec:
                M['items'][q] = rec; M['skip'].pop(q, None); ok += 1
            else:
                M['skip'][q] = {'why': why, 'at': NOW.isoformat(timespec='seconds')}
    # 모임 키 → QID(화면 묶음용)
    M['g'] = {g: q for q, gs in want.items() if q in M['items'] for g in sorted(gs)}
    M['updated'] = NOW.isoformat(timespec='seconds')
    json.dump(M, open(path, 'w'), ensure_ascii=False, indent=0)
    print('로고 저장', ok, '합계', len(M['items']), '/ 대상', len(want))


def one_face(blob):
    """얼굴이 정확히 하나(작은 얼굴까지 세어 하나, 세로형, 폭의 15% 이상)일 때만 참. 여럿이 찍힌 사진·풍경·행사 사진을 거름(누구인지는 판단하지 않음)"""
    import cv2, numpy as np
    im = cv2.imdecode(np.frombuffer(blob, np.uint8), cv2.IMREAD_GRAYSCALE)
    if im is None:
        return False
    det = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    w = im.shape[1]
    fs = det.detectMultiScale(im, scaleFactor=1.08, minNeighbors=5, minSize=(max(20, w // 33),) * 2)
    return im.shape[0] >= w * 0.9 and len(fs) == 1 and fs[0][2] >= w * 0.15   # 세로·정사각 사진, 얼굴 폭 15% 이상


MULTI = re.compile(r'\b(and|with|meets?|meeting|summit|family|couple|wife|husband|team|dinner|ceremony with)\b|&|부부|회담|만찬|가족|단체|일행', re.I)


def year_of(s):
    m = re.search(r'(1[89]\d\d|20\d\d)', s or '')
    return int(m.group(1)) if m else None


def dated(PD, W, up, maxp):
    path = os.path.join(PD, 'photos_dated.json')
    M = load(path, {}) or {}; M.setdefault('items', {}); M.setdefault('done', {})
    people = sorted(W, key=lambda p: M['done'].get(p, ''))[:maxp]
    print('연도별 사진 대상', len(people))
    Y = NOW.year; got = 0
    for n, pid in enumerate(people):
        q = pid[3:]
        j = get(CAPI, {'action': 'query', 'format': 'json', 'list': 'search', 'srnamespace': '6', 'srlimit': '50', 'srsearch': 'haswbstatement:P180=' + q})
        hits = [(h['title'][5:], h['pageid']) for h in (j.get('query') or {}).get('search', [])]
        M['done'][pid] = NOW.isoformat(timespec='seconds')
        if len(hits) < 2:
            continue
        mids = ['M%d' % pg for _, pg in hits]
        ents = {}
        for i in range(0, len(mids), 50):
            ents.update((get(CAPI, {'action': 'wbgetentities', 'ids': '|'.join(mids[i:i + 50]), 'format': 'json'}).get('entities') or {}))
        cands = {}
        for t, pg in hits:
            st = (ents.get('M%d' % pg) or {}).get('statements') or {}
            dep = [((c.get('mainsnak') or {}).get('datavalue') or {}).get('value', {}).get('id') for c in st.get('P180', [])]
            if dep != [q] or MULTI.search(t):   # 그 사람 하나만 찍힌 것으로 표시된 파일만
                continue
            y = None
            for c in st.get('P571', []):
                y = year_of(((c.get('mainsnak') or {}).get('datavalue') or {}).get('value', {}).get('time'))
            cands[t] = y
        if len(cands) < 2:
            continue
        # 원본도 최소 720px 이상인 자유 이용 사진만 받아 720px WebP로 보관한다.
        # 화면은 두 장 이상일 때만 '변화 과정'을 보여 주지만, 한 장도 다음 회차의
        # 비교 기준이 되므로 인덱스에는 축적한다.
        info = imageinfo(list(cands), 720)
        rows = []
        for t, y in cands.items():
            ii = info.get(t)
            if not ii or not free(ii['lic']) or min(ii['w'], ii['h']) < 720 or not ii['mime'].startswith('image/j'):
                continue
            y = y or year_of(ii['date'])
            if y and 1900 < y <= Y:
                rows.append((y, t, ii))
        old = {x['file']: x for x in M['items'].get(pid, [])}
        out, used = [], set()
        for back in (0, 5, 10, 20):
          for y, t, ii in sorted((r for r in rows if r[1] not in used and abs(r[0] - (Y - back)) <= (2 if back < 10 else 4)), key=lambda r: abs(r[0] - (Y - back)))[:4]:
            used.add(t)
            if t in old:
                out.append(old[t]); break
            blob = fetch(ii['u'])
            if not blob or not one_face(blob):
                continue
            try:
                b, bs = webp(blob, 720)
            except Exception:
                continue
            h = hashlib.sha256((pid + '\0' + t).encode()).hexdigest()[:16]
            k = 'people/ph/%s/%s.webp' % (h[:2], h)
            if os.environ.get('NB_MEDIA_LOCAL'):  # 시험용 로컬 사본
                lp = os.path.join(os.environ['NB_MEDIA_LOCAL'], k); os.makedirs(os.path.dirname(lp), exist_ok=True); open(lp, 'wb').write(b)
            if up and not up(k, b):
                continue
            out.append({'y': y, 'k': k, 'w': bs[0], 'h': bs[1], 'src': ii['src'], 'lic': ii['lic'], 'by': ii['by'], 'file': t}); break
        out.sort(key=lambda x: x['y'])
        if out:
            M['items'][pid] = out; got += 1
        if n % 200 == 0:
            print('  ', n, '/', len(people), '저장', got)
            json.dump(M, open(path, 'w'), ensure_ascii=False, indent=0)
        time.sleep(0.3)
    M['updated'] = NOW.isoformat(timespec='seconds')
    json.dump(M, open(path, 'w'), ensure_ascii=False, indent=0)
    print('연도별 사진 인물', got, '이번 회차 / 합계', len(M['items']))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('data'); ap.add_argument('--upload', action='store_true'); ap.add_argument('--logos', action='store_true'); ap.add_argument('--dated', action='store_true')
    ap.add_argument('--max-people', type=int, default=1200)
    a = ap.parse_args()
    PD = os.path.join(a.data, 'db', 'people')
    W = (load(os.path.join(PD, 'wd_t1.json.gz'), {}) or {}).get('items', {})
    up = None
    if a.upload:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        import media_r2
        up = media_r2.put
    if a.logos:
        logos(PD, W, up)
    if a.dated:
        dated(PD, W, up, a.max_people)


if __name__ == '__main__':
    main()
