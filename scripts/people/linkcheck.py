#!/usr/bin/env python3
"""외부 링크 건강 점검(매일 조금씩 돌아가며): python scripts/people/linkcheck.py <data> [legal]

무엇을: 2·3계층 인물이 우리 서버 대신 외부 주소로만 가진 자료(위키데이터 문서, 인물사전 출처 기사, 뉴스에서 찾은 인물의 기사,
        판사 판결 보도, 프로필 사진 원본 주소)가 아직 살아 있는지, 옮겨지거나 내용이 바뀌지 않았는지.
주기: 주소마다 정해진 날에만(주소 해시로 분산) — 1·2계층이 참조하는 주소는 14일, 3계층만 참조하면 30일마다 한 번.
      일시 오류는 다음 날 다시. 위키데이터는 API로 50개씩 묶어 확인(삭제·병합 감지).
방법: 호스트마다 2초 간격·동시 1건(예의 있는 속도), HEAD(이미지) 또는 앞 64KB만 GET, 리디렉트는 직접 따라가며 기록.
      301·308 영구 이동 → 새 주소로 자동 교체(원래 주소는 o에 보관). 404·410 → 2회 연속이면 dead(410은 즉시).
      제목 해시가 바뀌면 changed. 죽은 주소는 같은 출처 안에서 다시 찾기(https/www/amp 변형, 위키백과 넘겨주기, 위키데이터 병합).
      해외 IP를 막는 국내 공공 사이트(*.go.kr 등)는 차단으로 보이면 geo(미확인)로만 표시하고 죽음 판정에서 뺌(맥미니에서 LINK_REGION=kr로 확인 가능).
저장: db/links/state/c<주기>-b<칸>.json.gz(현재 상태, 그날 칸만 다시 씀) · db/links/log/YYYY-MM/*.jsonl.gz(모든 점검 결과, 추가 전용) ·
      db/links/summary.json
"""
import os, sys, re, json, time, gzip, hashlib, collections, datetime, threading, urllib.request, urllib.parse, urllib.error, socket, ssl, html
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pcommon import load, save, append_log, today, now_iso, h, is_url, UA

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'data'
LEGAL = sys.argv[2] if len(sys.argv) > 2 else 'legal'
PD = os.path.join(ROOT, 'db', 'people')
LD = os.path.join(ROOT, 'db', 'links')
TODAY = today()
DAYN = (datetime.date.fromisoformat(TODAY) - datetime.date(2026, 1, 1)).days
LINK_MAX = int(os.environ.get('LINK_MAX', 2500))
LINK_SEC = int(os.environ.get('LINK_SEC', 1500))
HOST_GAP = float(os.environ.get('LINK_HOST_GAP', 2.0))
REGION = os.environ.get('LINK_REGION', 'global')      # 'kr'이면 국내 공공 사이트도 판정
CYCLE = {1: 14, 2: 14, 3: 30}
GEO_HOSTS = re.compile(r'(naver\.com|daum\.net|\.go\.kr|\.or\.kr|assembly\.go\.kr|nec\.go\.kr|scourt\.go\.kr|ccourt\.go\.kr)$')
SKIP = re.compile(r'^https?://(?:[^/]*\.)?github\.io/|^https?://news\.google\.com/rss/|^https?://[^/]+/?$')   # 우리 사이트·구글 중계·홈페이지 자체
socket.setdefaulttimeout(15)

tiers = (load(os.path.join(PD, 'tiers', 'current.json.gz'), {}) or {}).get('people', {})
tier_of = lambda pid: (tiers.get(pid) or {}).get('t', 3)

# ---- 1) 점검 대상 모으기: 주소 → 참조하는 인물들의 가장 높은(작은) 계층 ----
REF = {}
def ref(u, pid, kind):
    if not is_url(u) or SKIP.search(u):
        return
    u = u.strip()
    t = tier_of(pid) if pid else 3
    cur = REF.get(u)
    if cur is None:
        REF[u] = [t, kind, 1]
    else:
        cur[0] = min(cur[0], t); cur[2] += 1

bio = load(os.path.join(ROOT, 'people_bio.json'), None) or load(os.path.join(ROOT, 'people_bio.json.gz'), {}) or {}
name_ids = collections.defaultdict(set)
for pid, r in tiers.items():
    if r.get('n'):
        name_ids[r['n']].add(pid)
def pid_of(key):
    if str(key).startswith(('wd:', 'pol:')):
        return key
    ids = name_ids.get(key) or ()
    return next(iter(ids)) if len(ids) == 1 else None
for key, v in bio.items():
    pid = pid_of(key)
    for e in v.get('events', []):
        if e.get('url') and 'wikidata.org' not in e['url']:
            ref(e['url'], pid, 'bio')
    if v.get('photo'):
        ref(v['photo'], pid, 'photo')
for name, v in (load(os.path.join(PD, 'discovered.json'), {}) or {}).items():
    pid = pid_of(name)
    for u in (v.get('u') or [])[:5]:
        ref(u, pid, 'news')
for key, j in (load(os.path.join(LEGAL, 'legal', 'v1', 'people', 'judges_from_news.json'), {}) or {}).items():
    for u in (j.get('cases') or [])[:5]:
        ref(u, None, 'case')
        if u in REF:
            REF[u][0] = 1                       # 판사는 1계층(판결 보도 출처는 14일마다)
WDQ = sorted(pid[3:] for pid, r in tiers.items() if pid.startswith('wd:Q'))

# ---- 2) 오늘 칸 고르기 ----
def bucket(u, cyc):
    return int(hashlib.sha1(u.encode()).hexdigest()[:8], 16) % cyc

def shard_path(cyc, b):
    return os.path.join(LD, 'state', 'c%d-b%02d.json.gz' % (cyc, b))

retry = load(os.path.join(LD, 'retry.json'), []) or []
due_shards = {(c, DAYN % c) for c in set(CYCLE.values())}
SH = {k: load(shard_path(*k), {}) or {} for k in due_shards}
due = []
for u, (t, kind, n) in REF.items():
    c = CYCLE[t]
    if (c, bucket(u, c)) in due_shards:
        due.append((t, u, kind, (c, bucket(u, c))))
due_set = {x[1] for x in due}
for u in retry:
    if u in REF and u not in due_set:
        t, kind, n = REF[u]; c = CYCLE[t]
        k = (c, bucket(u, c))
        if k not in SH:
            SH[k] = load(shard_path(*k), {}) or {}
        due.append((t, u, kind, k))
due.sort(key=lambda x: x[0])
due = due[:LINK_MAX]
print('대상 주소', len(REF), '오늘 점검', len(due), '(재시도 %d)' % len(retry))

# ---- 3) HTTP 점검 ----
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None
CTX = ssl.create_default_context()
OPENER = urllib.request.build_opener(NoRedirect, urllib.request.HTTPSHandler(context=CTX))
host_lock = collections.defaultdict(threading.Lock)
host_last = collections.defaultdict(float)

def fetch(u, method):
    host = urllib.parse.urlsplit(u).netloc.lower()
    with host_lock[host]:
        wait = host_last[host] + HOST_GAP - time.time()
        if wait > 0:
            time.sleep(wait)
        hdr = {'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,*/*;q=0.5', 'Accept-Language': 'ko,en;q=0.7'}
        if method == 'GET':
            hdr['Range'] = 'bytes=0-65535'
        req = urllib.request.Request(u, headers=hdr, method=method)
        try:
            with OPENER.open(req, timeout=15) as r:
                body = r.read(65536) if method == 'GET' else b''
                return r.status, dict(r.headers), body, None
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers or {}), b'', None
        except Exception as e:
            return None, {}, b'', type(e).__name__ + ':' + str(e)[:60]
        finally:
            host_last[host] = time.time()

TITLE = re.compile(rb'<title[^>]*>(.*?)</title>', re.I | re.S)
OGT = re.compile(rb'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)', re.I)
def title_of(body):
    m = OGT.search(body) or TITLE.search(body)
    if not m:
        return ''
    t = m.group(1).decode('utf-8', 'ignore')
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()[:200]

def is_image(u):
    return re.search(r'\.(jpe?g|png|webp|gif)(\?|$)|imgnews\.pstatic|upload\.wikimedia', u, re.I) is not None

def walk(u):
    """리디렉트를 직접 따라감 → (최종 코드, 최종 주소, [(코드, 주소)…], 제목, 본문 해시, 오류)"""
    chain, cur = [], u
    method = 'HEAD' if is_image(u) else 'GET'
    for _ in range(6):
        code, hd, body, err = fetch(cur, method)
        if code in (405, 501) and method == 'HEAD':
            method = 'GET'; continue
        chain.append((code, cur))
        if code in (301, 302, 303, 307, 308) and hd.get('Location') or hd.get('location'):
            cur = urllib.parse.urljoin(cur, hd.get('Location') or hd.get('location')); continue
        t = title_of(body) if body else ''
        bh = hashlib.sha1(re.sub(rb'\s+', b' ', body[:65536])).hexdigest()[:12] if body else ''
        return code, cur, chain, t, bh, err
    return None, cur, chain, '', '', 'too_many_redirects'

def variants(u):
    p = urllib.parse.urlsplit(u)
    out = []
    host = p.netloc
    out.append(p._replace(scheme='https' if p.scheme == 'http' else 'http').geturl())
    out.append(p._replace(netloc=host[4:] if host.startswith('www.') else 'www.' + host).geturl())
    if 'amp' in p.path.lower() or 'amp' in p.query.lower():
        out.append(p._replace(path=re.sub(r'(?i)amp(?=\.|/|$)|/amp/', lambda m: '/' if m.group(0).startswith('/') else '', p.path), query=re.sub(r'(?i)(^|&)(amp|outputType=amp)[^&]*', '', p.query)).geturl())
    if host.startswith('m.'):
        out.append(p._replace(netloc=host[2:]).geturl())
    return [x for x in dict.fromkeys(out) if x != u]

def wiki_refind(u):
    m = re.match(r'^https?://([a-z\-]+)\.wikipedia\.org/wiki/(.+)$', u)
    if not m:
        return None
    api = 'https://%s.wikipedia.org/w/api.php?action=query&redirects=1&format=json&titles=%s' % (m.group(1), m.group(2))
    try:
        d = json.loads(urllib.request.urlopen(urllib.request.Request(api, headers={'User-Agent': UA}), timeout=15).read())
        pages = d.get('query', {}).get('pages', {})
        for pg in pages.values():
            if 'missing' not in pg:
                return 'https://%s.wikipedia.org/wiki/%s' % (m.group(1), urllib.parse.quote(pg['title'].replace(' ', '_')))
    except Exception:
        return None

def is_home(u):
    p = urllib.parse.urlsplit(u)
    return p.path in ('', '/', '/index.html', '/main.html') and not p.query

def check(item):
    t, u, kind, sk = item
    rec = dict(SH[sk].get(u) or dict(first=TODAY, fails=0))
    cur = rec.get('u', u)
    code, final, chain, title, bh, err = walk(cur)
    host = urllib.parse.urlsplit(cur).netloc.lower()
    st = 'ok'
    note = ''
    perm = any(c in (301, 308) for c, _ in chain[:-1])
    if code is None or code in (401, 403, 429, 451) or (code and code >= 500):
        if REGION != 'kr' and GEO_HOSTS.search(host):
            st = 'geo'
        else:
            st = 'error'; rec['fails'] = rec.get('fails', 0) + 1
    elif code in (404, 410) or (len(chain) > 1 and is_home(final) and not is_home(cur)):
        rec['fails'] = rec.get('fails', 0) + (2 if code == 410 else 1)
        st = 'dead' if rec['fails'] >= 2 else 'missing'
    elif 200 <= code < 300:
        rec['fails'] = 0
        if len(chain) > 1:
            if perm and final != cur:
                rec.setdefault('o', u); rec['u'] = final; st = 'repaired'; note = 'permanent redirect'
            else:
                st = 'redirect'
        if title:
            th = h(title, 10)
            if rec.get('th') and rec['th'] != th:
                st = 'changed' if st == 'ok' else st; rec['changed'] = TODAY; note = (note + ' title changed').strip()
            rec['th'] = th; rec['title'] = title[:120]
        if bh:
            rec['bh'] = bh
    if st in ('dead', 'missing'):
        cand = wiki_refind(cur) or None
        if not cand:
            for v in variants(cur):
                c2, f2, ch2, t2, b2, e2 = walk(v)
                if c2 and 200 <= c2 < 300 and not (is_home(f2) and not is_home(cur)):
                    if not rec.get('th') or not t2 or h(t2, 10) == rec['th'] or rec.get('title', '')[:20] in t2:
                        cand = f2; break
        if cand:
            rec.setdefault('o', u); rec['u'] = cand; rec['fails'] = 0; st = 'refound'; note = 'same-source variant'
    rec.update(st=st, code=code, last=TODAY, k=kind, t=t)
    if st not in ('geo',):
        rec['last_real'] = TODAY
    if err:
        rec['err'] = err
    else:
        rec.pop('err', None)
    SH[sk][u] = rec
    return dict(d=TODAY, u=u, now=rec.get('u', u) if rec.get('u', u) != u else None, st=st, code=code, hops=len(chain) - 1, th=rec.get('th'), note=note or None)

t0 = time.time()
logs = []
new_retry = []
by_host = collections.defaultdict(list)
for it in due:
    by_host[urllib.parse.urlsplit(it[1]).netloc.lower()].append(it)
order = []
while any(by_host.values()):                    # 호스트를 번갈아 섞어서 한 곳에 몰리지 않게
    for hst in list(by_host):
        if by_host[hst]:
            order.append(by_host[hst].pop(0))
with ThreadPoolExecutor(max_workers=8) as ex:
    futs = []
    for it in order:
        futs.append(ex.submit(lambda x: None if time.time() - t0 > LINK_SEC else check(x), it))
    for f, it in zip(futs, order):
        try:
            r = f.result()
        except Exception as e:
            r = dict(d=TODAY, u=it[1], st='crash', note=str(e)[:80])
        if r is None:
            new_retry.append(it[1]); continue
        logs.append({k: v for k, v in r.items() if v is not None})
        if r['st'] in ('error', 'missing'):
            new_retry.append(it[1])

# ---- 4) 위키데이터 문서(삭제·병합·이름 변경) ----
wst = load(os.path.join(LD, 'wikidata_state.json.gz'), {}) or {}
wdue = [q for q in WDQ if int(q[1:]) % 30 == DAYN % 30 and time.time() - t0 < LINK_SEC + 600]
wlog = []
for i in range(0, len(wdue), 50):
    chunk = wdue[i:i + 50]
    api = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=info|sitelinks&sitefilter=kowiki|enwiki&ids=' + '|'.join(chunk)
    try:
        d = json.loads(urllib.request.urlopen(urllib.request.Request(api, headers={'User-Agent': UA}), timeout=30).read())
    except Exception as e:
        print('  위키데이터 API 오류', str(e)[:80]); time.sleep(5); continue
    ents = d.get('entities', {})
    for q in chunk:
        e = ents.get(q) or {}
        prev = wst.get(q) or {}
        if 'missing' in e:
            st = 'dead'
        elif e.get('redirects') or (e.get('id') and e.get('id') != q):
            st = 'repaired'; prev['to'] = e.get('id') or e['redirects'].get('to')
        else:
            st = 'ok'
        # 병합된 경우 응답 키는 원래 id로 오지만 내용은 새 id
        if not e and any(v.get('redirects', {}).get('from') == q for v in ents.values()):
            to = next(v['id'] for v in ents.values() if v.get('redirects', {}).get('from') == q)
            st, prev['to'] = 'repaired', to
        kt = ((e.get('sitelinks') or {}).get('kowiki') or {}).get('title')
        rev = e.get('lastrevid')
        if st == 'ok' and prev.get('kt') and kt != prev.get('kt'):
            st = 'changed'
        prev.update(st=st, last=TODAY, rev=rev, kt=kt)
        wst[q] = prev
        if st != 'ok':
            wlog.append(dict(d=TODAY, u='https://www.wikidata.org/wiki/' + q, st=st, to=prev.get('to'), kt=kt))
    time.sleep(1)
save(os.path.join(LD, 'wikidata_state.json.gz'), wst)

# ---- 5) 저장 ----
for k, v in SH.items():
    save(shard_path(*k), v)
save(os.path.join(LD, 'retry.json'), sorted(set(new_retry))[:5000])
append_log(os.path.join(LD, 'log'), logs + wlog + [dict(d=TODAY, summary=1, checked=len(logs), wikidata=len(wdue))])
# 전체 현황(모든 칸을 읽어 집계: 가벼움)
allst = collections.Counter(); kinds = collections.Counter(); n_state = 0
sd = os.path.join(LD, 'state')
for f in os.listdir(sd) if os.path.isdir(sd) else []:
    for u, r in (load(os.path.join(sd, f), {}) or {}).items():
        allst[r.get('st')] += 1; kinds[r.get('k')] += 1; n_state += 1
summary = dict(updated=now_iso(), urls_known=len(REF), urls_checked_ever=n_state, status=dict(allst), by_kind=dict(kinds),
               today=dict(checked=len(logs), status=dict(collections.Counter(r['st'] for r in logs)), wikidata_checked=len(wdue),
                          wikidata_status=dict(collections.Counter((wst.get(q) or {}).get('st') for q in wdue))),
               wikidata_known=len(WDQ), wikidata_status=dict(collections.Counter(v.get('st') for v in wst.values())),
               schedule=dict(tier12_days=CYCLE[2], tier3_days=CYCLE[3], wikidata_days=30, host_gap_sec=HOST_GAP, max_per_day=LINK_MAX),
               full_cycle_days=max(CYCLE.values()), seconds=round(time.time() - t0))
save(os.path.join(LD, 'summary.json'), summary, compact=False)
print(json.dumps(summary, ensure_ascii=False))
