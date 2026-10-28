#!/usr/bin/env python3
"""collect.py 결과(today.json)를 보강: 썸네일 타임라인(네이버 뉴스 검색), 실시간 키워드 페이지,
네이버 댓글 여론, 증시·환율, 오늘의 단어, GitHub Models(LLM) 해석 요약(AI 표시)."""
import re, json, html, os, datetime as dt, urllib.request, urllib.parse, collections, hashlib, time
from concurrent.futures import ThreadPoolExecutor
from kiwipiepy import Kiwi
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST)
ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
kiwi = Kiwi()
D = json.load(open(os.path.join(ROOT, 'today.json')))


import atexit as _ax, collections as _co, urllib.parse as _up
DIAG = {'ok': _co.Counter(), 'fail': _co.Counter(), 'errors': []}
def _dhost(u): return _up.urlsplit(u).netloc
_DDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
def _dsave():
    try:
        os.makedirs(_DDIR, exist_ok=True)
        json.dump(dict(step='enrich', at=dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).isoformat(), ok=DIAG['ok'], fail=DIAG['fail'], errors=DIAG['errors'][-40:]),
                  open(os.path.join(_DDIR, 'diag_enrich.json'), 'w'), ensure_ascii=False)
    except Exception as e: print('diag', e)
_ax.register(_dsave)

def get(url, headers=None, enc='utf-8', timeout=15):
    h = {'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.6', 'Accept': 'text/html,application/json,*/*;q=0.8'}; h.update(headers or {})
    for n in range(3):
        try:
            _r = urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout).read().decode(enc, 'replace'); DIAG['ok'][_dhost(url)] += 1; return _r
        except urllib.error.HTTPError as e:
            err = e
            if e.code in (403, 404): break
            time.sleep(3 * (n + 1) if e.code == 429 else 1)
        except Exception as e: err = e; time.sleep(1)
    DIAG['fail'][_dhost(url)] += 1; DIAG['errors'].append(dict(t=time.strftime('%H:%M:%S'), host=_dhost(url), path=_up.urlsplit(url).path[:60], err=str(err)[:120])); print('fail', url[:120], err); return ''
def un(s): return html.unescape(re.sub(r'<[^>]+>', '', s or '')).strip()

# ---------- 네이버 뉴스 검색 (썸네일·스니펫·날짜) ----------
def ndate(txt):
    m = re.search(r'(\d+)(분|시간|일|주) 전', txt)
    if m:
        n, u = int(m.group(1)), m.group(2)
        return (NOW - dt.timedelta(minutes=n * {'분': 1, '시간': 60, '일': 1440, '주': 10080}[u])).isoformat()
    m = re.search(r'(20\d\d)\.(\d{1,2})\.(\d{1,2})\.', txt)
    if m: return dt.datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)), 12, tzinfo=KST).isoformat()
    return ''
NAVER_OK = [True]; NAVER_FAIL = [0]
def gsearch(q, period=None):
    """네이버 검색이 막힌 환경(예: 클라우드 IP)용 대체: Google 뉴스 RSS 기간 검색"""
    qq = q
    if period: qq += ' after:%s before:%s' % ((period[0] - dt.timedelta(days=1)).isoformat(), (period[1] + dt.timedelta(days=1)).isoformat())
    t = get('https://news.google.com/rss/search?hl=ko&gl=KR&ceid=KR:ko&q=' + urllib.parse.quote(qq)); out = []
    for it in re.findall(r'<item>(.*?)</item>', t, re.S)[:15]:
        g = lambda tag: (re.search(r'<%s[^>]*>(.*?)</%s>' % (tag, tag), it, re.S) or [None, ''])[1]
        title = un(g('title')); src = un(g('source'))
        if src and title.endswith(' - ' + src): title = title[:-len(src) - 3]
        try: ts = dt.datetime.strptime(g('pubDate').strip(), '%a, %d %b %Y %H:%M:%S %Z').replace(tzinfo=dt.timezone.utc).astimezone(KST).isoformat()
        except Exception: continue
        out.append(dict(title=title, url=un(g('link')), body='', img='', press=src, t=ts, naver=''))
    return out
def nsearch(q, sort=0, period=None, start=1):
    u = 'https://search.naver.com/search.naver?where=news&query=%s&sort=%d&start=%d' % (urllib.parse.quote(q), sort, start)
    if period:
        a, b = period
        u += '&pd=3&ds=%s&de=%s&nso=%s' % (a.strftime('%Y.%m.%d'), b.strftime('%Y.%m.%d'), urllib.parse.quote('so:%s,p:from%sto%s' % ('dd' if sort == 1 else 'r', a.strftime('%Y%m%d'), b.strftime('%Y%m%d'))))
    if NAVER_OK[0]:
        t = get(u, {'Referer': 'https://search.naver.com/'})
        if not t: NAVER_FAIL[0] += 1
        if NAVER_FAIL[0] >= 4: NAVER_OK[0] = False; print('naver search blocked -> google news fallback')
    else: t = ''
    if not t: return gsearch(q, period)
    out = []
    for ch in t.split('data-sds-comp="Profile"')[1:]:
        m = re.search(r'href="([^"]+)"[^>]*data-heatmap-target="\.tit"><span[^>]*>(.*?)</span>', ch, re.S)
        if not m: continue
        body = re.search(r'data-heatmap-target="\.body"><span[^>]*>(.*?)</span>', ch, re.S)
        img = re.search(r'data-heatmap-target="\.img">.*?<img[^>]*src="([^"]+)"', ch, re.S)
        press = re.search(r'alt="([^"]+?)의 프로필 이미지"', ch)
        head = ch[:m.start()]
        nv = re.search(r'href="(https://n\.news\.naver\.com/mnews/article/[^"]+)"', ch)
        out.append(dict(title=un(m.group(2)), url=html.unescape(m.group(1)), body=un(body.group(1)) if body else '',
                        img=html.unescape(img.group(1)) if img else '', press=press.group(1) if press else '',
                        t=ndate(un(head)) or ndate(un(ch[:3000])), naver=html.unescape(nv.group(1)) if nv else ''))
    return [x for x in out if x['t']]

def dedupe(items):
    seen, out = set(), []
    for x in sorted(items, key=lambda x: x['t'], reverse=True):
        k = re.sub(r'\W', '', x['title'])[:18]
        if k in seen: continue
        seen.add(k); out.append(x)
    return out

def history(q):
    """오늘 → 최근 1주 → 1개월 → 과거 연도별(관련도순) 썸네일 기사"""
    d = NOW.date(); D_ = dt.timedelta
    jobs = [(q, 1, (d, d), 1), (q, 0, (d - D_(7), d - D_(1)), 1), (q, 0, (d - D_(30), d - D_(8)), 1), (q, 0, (d - D_(120), d - D_(31)), 1), (q, 0, (d - D_(365), d - D_(121)), 1)]
    for yy in range(d.year - 1, d.year - 6, -1):
        for a, b in ((dt.date(yy, 1, 1), dt.date(yy, 6, 30)), (dt.date(yy, 7, 1), dt.date(yy, 12, 31))):
            if b < d - D_(365): jobs.append((q, 0, (a, b), 1))
    with ThreadPoolExecutor(5) as ex: res = list(ex.map(lambda a: nsearch(*a), jobs))
    out = []
    for i, r in enumerate(res): out += r[:10 if i < 2 else 5]
    return dedupe(out)

# ---------- 네이버 댓글 ----------
def comments(naver_url, n=20):
    m = re.search(r'article/(\d+)/(\d+)', naver_url)
    if not m: return None
    oid, aid = m.groups()
    t = get('https://apis.naver.com/commentBox/cbox/web_naver_list_jsonp.json?ticket=news&pool=cbox5&lang=ko&country=KR&objectId=news%s%%2C%s&pageSize=%d&page=1&sort=FAVORITE&initialize=true' % (oid, aid, n),
            {'Referer': 'https://n.news.naver.com/article/%s/%s' % (oid, aid)})
    try: r = json.loads(t[t.index('(') + 1:t.rindex(')')])['result']
    except Exception: return None
    return dict(url='https://n.news.naver.com/article/comment/%s/%s' % (oid, aid), count=(r.get('count') or {}).get('comment', 0), graph=r.get('graph'),
                list=[dict(text=c['contents'][:300], like=c['sympathyCount'], dislike=c['antipathyCount']) for c in r.get('commentList', []) if c.get('contents')])

STOPC = set('기사 기자 진짜 정말 그냥 지금 사람 생각 나라 국민 우리 이거 저거 그거 이게 하나 이번 역시 무슨 자기 너무 계속'.split())
def opinion(issue):
    urls = [s['url'] for s in issue['sources'] if 'n.news.naver.com' in s['url']][:4]
    with ThreadPoolExecutor(4) as ex: cs = [c for c in ex.map(comments, urls) if c]
    allc = [dict(c, src=x['url']) for x in cs for c in x['list']]
    if not allc: return None
    allc.sort(key=lambda c: -c['like'])
    words = collections.Counter()
    for c in allc:
        for t in kiwi.tokenize(c['text']):
            if t.tag in ('NNG', 'NNP') and len(t.form) >= 2 and t.form not in STOPC: words[t.form] += 1 + c['like'] / 50
    g = collections.Counter(); ages = collections.Counter(); w = 0
    for x in cs:
        gr = x.get('graph') or {}
        if gr.get('gender'):
            k = x['count'] or 1; w += k
            for a, v in gr['gender'].items(): g[a] += v * k
            for o in gr.get('old', []): ages[o['age']] += o['value'] * k
    return dict(total=sum(x['count'] for x in cs), articles=len(cs), links=[x['url'] for x in cs],
                gender={k: round(v / w) for k, v in g.items()} if w else None,
                ages={k: round(v / w) for k, v in sorted(ages.items())} if w else None,
                words=[[k, round(v, 1)] for k, v in words.most_common(14)],
                like=sum(c['like'] for c in allc), dislike=sum(c['dislike'] for c in allc),
                top=allc[:40])

# ---------- LLM (GitHub Models, Actions GITHUB_TOKEN) ----------
CACHE_P = os.path.join(ROOT, 'llm_cache.json')
CACHE = json.load(open(CACHE_P)) if os.path.exists(CACHE_P) else {}
# 교체 가능: LLM_ENDPOINT(OpenAI 호환 /chat/completions), LLM_MODEL, LLM_API_KEY. 기본=GitHub Models + GITHUB_TOKEN
# GitHub Models는 2026-07-30 종료됨 → OpenAI 호환 API 키가 있어야 AI 분석 동작 (기본: Google Gemini 무료 등급)
ENDPOINT = os.environ.get('LLM_ENDPOINT') or 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
TOKEN = os.environ.get('LLM_API_KEY') or ''
MODEL = os.environ.get('LLM_MODEL') or 'gemini-2.5-flash'
BUDGET = [int(os.environ.get('LLM_BUDGET', '14'))]
BACKEND = os.environ.get('LLM_BACKEND', 'openai')   # 'apple' = 맥미니 Apple 온디바이스 모델(nbai)
NBAI = os.environ.get('NBAI', os.path.expanduser('~/Developer/newsboard-local/bin/nbai'))
APPLE = BACKEND == 'apple'
if APPLE: MODEL = 'Apple Foundation Models (온디바이스)'; ENDPOINT = 'https://macmini.local/'
LLM_STATUS = {'enabled': bool(TOKEN) or APPLE, 'model': MODEL, 'endpoint': ENDPOINT.split('/')[2], 'calls': 0, 'errors': [], 'backend': BACKEND}
import subprocess, threading
ALOCK = threading.Lock()
def jparse(c):
    c = re.sub(r'^```(?:json)?|```$', '', c.strip()).strip()
    a, b = c.find('{'), c.rfind('}')
    return json.loads(c[a:b + 1] if a >= 0 else c)
def apple(prompt, maxtok):
    with ALOCK:  # 온디바이스 모델은 한 번에 하나씩
        r = subprocess.run([NBAI, SYS, str(maxtok)], input=prompt, capture_output=True, text=True, timeout=180)
    if r.returncode: raise ValueError('apple ' + r.stderr.strip()[:160])
    return jparse(r.stdout)
SYS = ('너는 한국어 뉴스 편집자다. 반드시 주어진 자료에 있는 사실만 사용하고, 자료에 없는 사실·수치·인용은 절대 만들지 마라. '
       '해석은 "~로 볼 수 있다", "~라는 해석이 나온다"처럼 해석임을 드러내라. 출력은 지정한 JSON만.')
def llm(key, prompt, maxtok=900):
    if key in CACHE: return CACHE[key]
    if not (TOKEN or APPLE) or BUDGET[0] <= 0: return None
    BUDGET[0] -= 1
    if APPLE:
        try:
            out = apple(prompt, maxtok); LLM_STATUS['calls'] += 1; CACHE[key] = out; return out
        except Exception as e:
            LLM_STATUS['errors'].append(str(e)[:200]); return None
    body = json.dumps({'model': MODEL, 'temperature': 0.2, 'max_tokens': maxtok, 'response_format': {'type': 'json_object'},
                       'messages': [{'role': 'system', 'content': SYS}, {'role': 'user', 'content': prompt}]}).encode()
    try:
        r = urllib.request.urlopen(urllib.request.Request(ENDPOINT, body,
                {'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'Accept': 'application/json'}), timeout=60)
        raw = r.read().decode('utf-8', 'replace')
        try: c = json.loads(raw)['choices'][0]['message']['content']
        except Exception: raise ValueError('bad response %s: %r' % (r.status, raw[:160]))
        c = re.sub(r'^```(?:json)?|```$', '', c.strip()).strip()
        out = json.loads(c)
        LLM_STATUS['calls'] += 1; CACHE[key] = out; return out
    except urllib.error.HTTPError as e:
        LLM_STATUS['errors'].append('%s %s' % (e.code, e.read()[:200].decode('utf-8', 'replace')))
        if e.code == 429: BUDGET[0] = 0
    except Exception as e:
        LLM_STATUS['errors'].append(str(e)[:200])
    return None
def hkey(*a): return hashlib.md5('|'.join(a).encode()).hexdigest()[:16]

def ogimg(url):
    if 'news.google.com' in url: return ''
    t = get(url, timeout=10)
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', t) or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image', t)
    return html.unescape(m.group(1)).replace('&amp;', '&') if m else ''
def imgkey(u):
    # 같은 사진 판별: 경로의 파일명(쿼리·크기 접미사 제거)
    f = urllib.parse.urlparse(u).path.rsplit('/', 1)[-1].lower()
    return re.sub(r'([_-](\d+x\d+|thumb|s|m|l|w\d+))?\.(jpe?g|png|webp|gif)$', '', f) or u
def og(url):
    t = get(url, timeout=10)
    d = re.search(r'<meta property="og:description" content="([^"]*)"', t)
    return html.unescape(d.group(1)) if d else ''

# ---------- 1) 이슈 보강 ----------
def group_days(items):
    g = collections.OrderedDict()
    for x in sorted(items, key=lambda x: x['t'], reverse=True): g.setdefault(x['t'][:10], []).append(x)
    return g

def enrich_issue(iss):
    kw = ' '.join(([e for e in iss['entities'][:1]] + [k for k in iss['keywords'] if k not in iss['entities']])[:3])
    hist = history(kw) if kw else []
    # Google 타임라인(기존)과 합치되 이미지 있는 네이버 결과 우선
    gtl = [dict(title=x['title'], url=x['url'], press=x['press'], t=x['t'], body='', img='') for x in iss.get('timeline', [])]
    flow = dedupe(hist + gtl)
    leads = [d for d in ([iss.get('lead', '')] + [x['body'] for x in hist[:6] if x['t'][:10] == D['date']]) if d]
    nvs = [s['url'] for s in iss['sources'] if 'n.news.naver.com' in s['url'] and s['url'] != iss['url']][:3]
    with ThreadPoolExecutor(3) as ex: leads += [d for d in ex.map(og, nvs) if d]
    for s in iss['sources']:
        if not s.get('img'): s['img'] = ''
    # 갤러리: 여러 매체가 대표 이미지로 쓴 사진(og:image) 모아 중복 제거
    gs = [s_ for s_ in iss['sources'] if 'news.google.com' not in s_['url']][:12]
    with ThreadPoolExecutor(4) as ex: gi = list(ex.map(lambda s_: s_.get('img') or ogimg(s_['url']), gs))
    seen_i, gal = set(), []
    for s_, im in zip(gs, gi):
        if not im or re.search(r'logo|default|noimage|og_?image\.|share', im, re.I): continue
        k = imgkey(im)
        if k in seen_i: continue
        seen_i.add(k); gal.append(dict(img=im, press=s_['press'], url=s_['url'])); s_['img'] = s_.get('img') or im
    if iss.get('image') and imgkey(iss['image']) not in seen_i: gal.insert(0, dict(img=iss['image'], press=iss['press'], url=iss['url']))
    iss['gallery'] = gal[:12]
    op = opinion(iss)
    days = list(group_days(flow).items())[:8]
    iss['flow'] = [dict(date=d, items=a[:5]) for d, a in days]
    iss['opinion'] = op
    iss['leads'] = list(dict.fromkeys(leads))[:8]
    # LLM 1회: 깊게 보기 + 일자별 의미 + 여론 분석
    srcs = iss['sources'][:10]
    mat = '제목: %s\n\n[출처 기사 목록]\n%s\n\n[기사 리드문]\n%s\n\n[일자별 보도]\n%s\n\n[네이버 댓글(공감순)]\n%s' % (
        iss['title'], '\n'.join('%d. [%s] %s' % (k, x['press'], x['title']) for k, x in enumerate(srcs)), '\n'.join('- ' + x for x in iss['leads']),
        '\n'.join('%s: %s' % (d, ' / '.join(x['title'] + (' — ' + x['body'][:80] if x['body'] else '') for x in a[:4])) for d, a in days),
        '\n'.join('- (공감%d/비공감%d) %s' % (c['like'], c['dislike'], c['text'][:150]) for c in (op or {}).get('top', [])[:25]) or '(없음)')
    prompt = mat + '''\n\n다음 JSON을 작성:
{"deep": "자료의 사실만으로 사건 전체를 설명하는 한 문단(4~6문장)",
 "flow": [{"date": "YYYY-MM-DD(위 일자 그대로)", "meaning": "그날 보도가 이전 날짜 흐름과 어떻게 이어지는지, 어떤 의미·해석이 가능한지 1~3문장"}],
 "opinion": {"summary": "댓글에 드러난 여론 2~3문장 요약(댓글이 없으면 빈 문자열)", "stances": [{"label": "입장 이름(짧게)", "share": 0~100 정수, "desc": "한 문장"}], "quotes": [댓글 목록에서 그대로 고른 대표 댓글 원문 최대 3개]}}
stances는 2~4개, share 합은 100. 댓글이 없으면 stances와 quotes는 빈 배열.
추가로 "bias": [{"i": 출처 번호, "lean": "left" 또는 "right", "confidence": "high"/"medium"/"low", "reason": "제목의 어떤 표현·프레이밍 때문인지 한 줄"}] 를 넣어라.
언론사 이름이나 평소 성향으로 판단하지 말고, 오직 그 기사 제목의 단어 선택·프레이밍이 한쪽 정치 진영에 명백히 유리/불리하게 기울었을 때만 넣어라. 애매하면 넣지 마라.'''
    k0 = hkey(iss['url'], str(len(days)), str(len((op or {}).get('top', [])) > 0))
    if not APPLE: ai = llm('issue:' + k0, prompt, 1400)
    else:
        # Apple 모델은 문맥창(약 4천 토큰)이 작아 작업별로 나눠 호출
        cut = lambda t, n: t if len(t) <= n else t[:n] + '…'
        ai = {}
        d1 = llm('a-deep:' + k0, cut('제목: %s\n[기사 리드문]\n%s' % (iss['title'], '\n'.join('- ' + cut(x, 300) for x in iss['leads'][:6])), 2200) +
                 '\n\n위 자료의 사실만으로 사건 전체를 설명하는 한국어 한 문단(4~6문장)을 써라. JSON: {"deep": "..."}', 500)
        if d1: ai['deep'] = d1.get('deep', '')
        if len(days) > 1:
            d2 = llm('a-flow:' + k0, '사건: %s\n[일자별 보도 제목]\n%s\n\n각 날짜의 보도가 이전 날짜 흐름과 어떻게 이어지는지, 어떤 의미·해석이 가능한지 날짜마다 1~2문장으로 써라. 해석임을 드러내라. JSON: {"flow": [{"date": "YYYY-MM-DD", "meaning": "..."}]}' % (
                iss['title'], '\n'.join('%s: %s' % (d, ' / '.join(cut(x['title'], 60) for x in a[:3])) for d, a in days[:7])), 700)
            if d2: ai['flow'] = d2.get('flow', [])
        if op and op.get('top'):
            d3 = llm('a-op:' + k0, '사건: %s\n[네이버 댓글(공감순)]\n%s\n\n댓글 여론을 분석하라. JSON: {"opinion": {"summary": "여론 2~3문장", "stances": [{"label": "입장(짧게)", "share": 정수, "desc": "한 문장"}], "quotes": ["위 댓글 원문 그대로 최대 3개"]}} stances 2~4개, share 합 100.' % (
                iss['title'], '\n'.join('- (공감%d) %s' % (c['like'], cut(c['text'], 110)) for c in op['top'][:15])), 700)
            if d3: ai['opinion'] = d3.get('opinion', {})
        d4 = llm('a-bias:' + k0, '[기사 제목 목록]\n%s\n\n언론사 이름·평소 성향은 무시하고, 제목의 단어 선택·프레이밍이 한쪽 정치 진영에 명백히 유리/불리하게 기울어진 제목만 골라라. 애매하면 고르지 마라(빈 배열 가능). JSON: {"bias": [{"i": 번호, "lean": "left 또는 right", "confidence": "high/medium/low", "reason": "어떤 표현 때문인지 한 줄"}]}' % (
            '\n'.join('%d. %s' % (k, x['title']) for k, x in enumerate(srcs))), 400)
        if d4: ai['bias'] = d4.get('bias', [])
        ai = ai or None
    if ai:
        quotes = [q for q in ai.get('opinion', {}).get('quotes', []) if op and any(q[:20] in c['text'] for c in op['top'])]
        ai.setdefault('opinion', {})['quotes'] = quotes  # 실제 댓글과 일치하는 것만
        st, seen = [], []
        for x in ai['opinion'].get('stances', []) or []:
            lb = str(x.get('label', '')).strip()
            if not lb or any(lb in y or y in lb for y in seen): continue
            seen.append(lb); st.append(x)
        tot = sum(max(0, int(x.get('share', 0) or 0)) for x in st if str(x.get('share', '0')).isdigit()) or 0
        if len(st) >= 2 and tot > 0:
            for x in st: x['share'] = round(100 * max(0, int(x.get('share', 0) or 0)) / tot)
            ai['opinion']['stances'] = st
        else: ai['opinion']['stances'] = []
        mm = {f.get('date'): f.get('meaning') for f in ai.get('flow', [])}
        for f in iss['flow']: f['meaning'] = mm.get(f['date'], '')
    if ai:
        for b in ai.get('bias', []) or []:
            try:
                k = int(b.get('i'))
                if b.get('confidence') == 'high' and b.get('lean') in ('left', 'right') and 0 <= k < len(srcs):
                    srcs[k]['bias'] = dict(lean=b['lean'], reason=b.get('reason', '')[:120])
            except Exception: pass
    iss['ai'] = ai
    if op: op['top'] = op['top'][:12]
    return iss

# ---------- 2) 실시간 키워드 페이지 ----------
def enrich_trend(t):
    h = history(t['keyword'])
    today = [x for x in h if x['t'][:10] == D['date']] or h[:4]
    past = [x for x in h if x not in today]
    t['today'] = today[:8]; t['past'] = past[:60]
    t['image'] = t.get('img') or next((x['img'] for x in h if x['img']), '')
    ai = llm('trend:' + hkey(t['keyword'], D['date'], str(len(today))),
             '키워드: %s\n[오늘 기사]\n%s\n[과거 기사]\n%s\n\nJSON: {"today": "오늘 이 키워드로 무슨 일이 있었는지 2문장", "context": "과거 기사들과 비교해 이 키워드가 어떤 맥락으로 반복되는지 1~2문장(근거 부족하면 빈 문자열)"}' % (
                 t['keyword'], '\n'.join('- %s — %s' % (x['title'], x['body'][:120]) for x in today[:6]),
                 '\n'.join('- %s %s' % (x['t'][:10], x['title']) for x in past[:20])), 400)
    t['ai'] = ai
    return t

# ---------- 3) 증시·환율 ----------
def market():
    out = []
    def idx(code, name, world=False):
        base = 'https://api.stock.naver.com/index/%s' % code if world else 'https://m.stock.naver.com/api/index/%s' % code
        try:
            b = json.loads(get(base + '/basic')); p = json.loads(get(base + '/price?pageSize=20&page=1'))
            return dict(name=name, kind='index', price=b['closePrice'], diff=b['compareToPreviousClosePrice'], rate=b['fluctuationsRatio'],
                        dir=(b.get('compareToPreviousPrice') or {}).get('name', ''), at=b.get('localTradedAt', ''),
                        series=[float(x['closePrice'].replace(',', '')) for x in reversed(p)])
        except Exception as e: print('market', code, e)
    def fx(code, name):
        try:
            b = json.loads(get('https://m.stock.naver.com/front-api/marketIndex/productDetail?category=exchange&reutersCode=' + code))['result']
            p = json.loads(get('https://m.stock.naver.com/front-api/marketIndex/prices?category=exchange&reutersCode=%s&page=1&pageSize=20' % code))
            ser = [float(x['closePrice'].replace(',', '')) for x in reversed(p.get('result', []))] if isinstance(p.get('result'), list) else []
            return dict(name=name, kind='fx', price=b['closePrice'], diff=b['fluctuations'], rate=b['fluctuationsRatio'], dir=b['fluctuationsType']['name'], at=b.get('localTradedAt', ''), series=ser)
        except Exception as e: print('fx', code, e)
    with ThreadPoolExecutor(8) as ex:
        fs = [ex.submit(idx, 'KOSPI', 'KOSPI'), ex.submit(idx, 'KOSDAQ', 'KOSDAQ'), ex.submit(idx, '.INX', 'S&P 500', True), ex.submit(idx, '.IXIC', 'NASDAQ', True),
              ex.submit(fx, 'FX_USDKRW', '미국 USD'), ex.submit(fx, 'FX_JPYKRW', '일본 JPY(100)'), ex.submit(fx, 'FX_EURKRW', '유럽 EUR'), ex.submit(fx, 'FX_CNYKRW', '중국 CNY')]
        base = [f.result() for f in fs if f.result()]
    def yahoo(sym, name, unit):
        try:
            j = json.loads(get('https://query1.finance.yahoo.com/v8/finance/chart/%s?range=3mo&interval=1d' % urllib.parse.quote(sym)))['chart']['result'][0]
            c = [x for x in j['indicators']['quote'][0]['close'] if x is not None]
            p, q = c[-1], c[-2]
            return dict(name=name, kind='commodity', unit=unit, price='{:,.2f}'.format(p), diff='{:,.2f}'.format(abs(p - q)), rate='%.2f' % ((p - q) / q * 100),
                        dir='RISING' if p > q else 'FALLING' if p < q else 'EVEN', at=dt.datetime.fromtimestamp(j['meta']['regularMarketTime'], KST).isoformat(), series=c[-60:])
        except Exception as e: print('yahoo', sym, e)
    with ThreadPoolExecutor(6) as ex:
        com = [r for r in ex.map(lambda a: yahoo(*a), [('GC=F', '금', 'USD/oz'), ('SI=F', '은', 'USD/oz'), ('HG=F', '구리', 'USD/lb'), ('CL=F', 'WTI 원유', 'USD/bbl'), ('^TNX', '미국 10년물 금리', '%'), ('BTC-USD', '비트코인', 'USD')]) if r]
    return base + com

def stocks():
    try: L = json.loads(get('https://m.stock.naver.com/api/stocks/marketValue/KOSPI?page=1&pageSize=60'))['stocks']
    except Exception as e: print('stocks', e); return []
    def info(x):
        try:
            j = json.loads(get('https://m.stock.naver.com/api/stock/%s/integration' % x['itemCode']))
            t = {i['code']: i['value'] for i in j.get('totalInfos', [])}
            num = lambda v: float(re.sub(r'[^\d.\-]', '', v)) if v and re.search(r'\d', v) else None
            return dict(code=x['itemCode'], name=x['stockName'], price=x['closePrice'], rate=float(x['fluctuationsRatio']) * (-1 if x['compareToPreviousPrice']['name'] == 'FALLING' else 1),
                        cap=float(x['marketValue'].replace(',', '')), per=num(t.get('per')), pbr=num(t.get('pbr')), div=num(t.get('dividendYieldRatio')),
                        high52=t.get('highPriceOf52Weeks'), low52=t.get('lowPriceOf52Weeks'), url=x.get('endUrl', ''))
        except Exception as e: print('stock', x.get('itemCode'), e)
    with ThreadPoolExecutor(8) as ex: return [r for r in ex.map(info, L) if r]

# ---------- 4) 오늘의 단어 ----------
WCACHE_P = os.path.join(ROOT, 'wiki_cache.json')
try: WCACHE = json.load(open(WCACHE_P))
except Exception: WCACHE = {}
def wiki(name):
    if name in WCACHE: return WCACHE[name]
    r = wiki_(name)
    if r is False: return None   # 일시 오류는 캐시하지 않음
    WCACHE[name] = r; return r
def wiki_(name):
    t = get('https://ko.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(name), timeout=10)
    if not t: return False
    try: j = json.loads(t)
    except Exception: return None
    if j.get('type') != 'standard' or not j.get('extract'): return None
    return dict(title=j['title'], desc=j.get('description', ''), extract=j['extract'], url=j['content_urls']['desktop']['page'], thumb=(j.get('thumbnail') or {}).get('source', ''))
COMMON = set('대통령 정부 국회 경찰 검찰 기업 시장 경제 정치 사회 문화 사건 사고 회의 발표 조사 지원 대표 위원장 장관 의원 후보 선거 주식 가격 투자 학교 병원 교수 학생 아이 가족 결혼 배우 가수 선수 감독 경기 영화 드라마 방송 사진 영상 기자 뉴스 국민 지역 서울 한국 미국 중국 일본 세계 국가 정책 법안 재판 판결 혐의 의혹 논란 공개 사망 부상 증가 감소 상승 하락 매출 실적 이익 공급 수요 기술 개발 서비스 이용 계획 사업 회사 은행 금리 환율 부동산 아파트 전세 월세'.split())
def words():
    cnt = collections.Counter(); ex_ = collections.defaultdict(list)
    titles = [(x['title'], x['url'], x['press']) for k in D['sections'].values() for x in k] + [(s['title'], s['url'], s['press']) for i in D['issues'] for s in i['sources']]
    for t, u, p in titles:
        toks = kiwi.tokenize(t); forms = []; i = 0
        while i < len(toks):
            if toks[i].tag in ('NNG', 'SL'):
                f, end = toks[i].form, toks[i].start + toks[i].len; j = i + 1
                while j < len(toks) and toks[j].start == end and toks[j].tag in ('NNG', 'SL'): f += toks[j].form; end += toks[j].len; j += 1
                forms.append(f); i = j
            else: i += 1
        for f in set(forms):
            if len(f) >= 2 and f not in COMMON:
                cnt[f] += 1
                if len(ex_[f]) < 3: ex_[f].append(dict(title=t, url=u, press=p))
    cand = [w for w, c in cnt.most_common(120) if c >= 2][:70]
    with ThreadPoolExecutor(3) as ex: W = dict(zip(cand, ex.map(wiki, cand)))
    ents = {e['name'] for e in D['entities']}
    pick = []
    for w in cand:
        x = W[w]
        if not x or w in ents or re.search(r'(정치인|배우|가수|선수|도시|국가|회사|기업|대학|동음이의)', x['desc'] + x['extract'][:40]): continue
        pick.append(dict(word=w, count=cnt[w], wiki=x, examples=ex_[w]))
    # 어려운 단어 선별·쉬운 설명: LLM(근거=위키 요약), 없으면 위키 요약 첫 문장
    ai = llm('words:' + hkey(D['date'], *[p['word'] for p in pick[:30]]),
             '아래는 오늘 기사 제목에 자주 나온 단어와 위키백과 요약이다. 일반 독자(중학생 수준)가 뜻을 헷갈릴 만한 어려운 단어 8개를 골라, 위키백과 요약에 근거해서만 쉬운 말로 설명하라.\n' +
             '\n'.join('- %s: %s' % (p['word'], p['wiki']['extract'][:200]) for p in pick[:(14 if APPLE else 30)]) +
             '\nJSON: {"words": [{"word": "단어(목록 그대로)", "easy": "쉬운 설명 1~2문장", "level": "어려움 1~3"}]}', 1200)
    m = {w['word']: w for w in (ai or {}).get('words', [])}
    if m: pick = [p for p in pick if p['word'] in m]
    else:
        allp = pick
        pick = [p for p in pick if len(p['word']) >= 3 and re.search(r'(용어|개념|제도|정책|지표|현상|기법|체계|방식|권리|절차|행위|원칙|제재|조치|법률|처분)', p['wiki']['extract'][:120])]
        if len(pick) < 4: pick += [p for p in allp if p not in pick and p['word'] not in COMMON and len(p['word']) >= 2][:8 - len(pick)]
    out = []
    for p in pick[:10]:
        a = m.get(p['word'])
        first = re.split(r'(?<=다\.)\s', p['wiki']['extract'])[0]
        out.append(dict(p, easy=(a or {}).get('easy') or first, ai=bool(a), level=(a or {}).get('level', '')))
    return out

with ThreadPoolExecutor(4) as ex:
    D['issues'] = list(ex.map(enrich_issue, D['issues']))
    # 국내 모드: 한글이 없고 관련 기사도 대부분 외국어인 키워드(예: 해외 스포츠 경기)는 제외
    hang = lambda t: bool(re.search('[가-힣]', t or ''))
    def domestic(t):
        if hang(t['keyword']): return True
        ns = [n['title'] for n in t.get('news', [])]
        return bool(ns) and sum(map(hang, ns)) / len(ns) >= 0.5
    D['trends_foreign'] = [t['keyword'] for t in D['trends'] if not domestic(t)]
    D['trends'] = list(ex.map(enrich_trend, [t for t in D['trends'] if domestic(t)][:12]))
# 순위: Google 트렌드 검색량(구간값) → 같은 구간이면 오늘 관련 기사 수
for t in D['trends']: t['articles'] = len(t.get('today', []))
D['trends'].sort(key=lambda t: (-t.get('traffic_n', 0), -t['articles']))
# ---------- 맥미니 새벽 분석 결과(overlay) 반영 / 생성 ----------
OV_DIR = os.path.join(ROOT, 'overlay'); os.makedirs(OV_DIR, exist_ok=True)
OV_P = os.path.join(OV_DIR, 'latest.json')
def toks(i): return set(i.get('entities', [])) | set(i.get('keywords', [])[:6])
def jac(a, b): return len(a & b) / max(1, len(a | b))
if os.environ.get('OVERLAY_WRITE'):
    pass  # 아래에서 저장
elif os.path.exists(OV_P):
    try: OV = json.load(open(OV_P))
    except Exception: OV = {}
    fresh = OV.get('updated') and (NOW - dt.datetime.fromisoformat(OV['updated'])).total_seconds() < 36 * 3600
    if fresh:
        used = 0
        for i in D['issues']:
            best = max(OV.get('issues', []), key=lambda o: (o['url'] == i['url'], jac(toks(i), set(o['toks']))), default=None)
            if not best: continue
            same = best['url'] == i['url'] or jac(toks(i), set(best['toks'])) >= 0.5
            if same or jac(toks(i), set(best['toks'])) >= 0.3:
                if not NAVER_OK[0] and best.get('flow'):
                    # 클라우드에선 네이버 검색이 막힘 → 맥에서 모은 썸네일 흐름 + 지금 Google 기사 합치기
                    cur = [x for f in i.get('flow', []) for x in f['items']]
                    allx = dedupe([x for f in best['flow'] for x in f['items']] + cur)
                    i['flow'] = [dict(date=d, items=a[:5], meaning=next((f.get('meaning', '') for f in best['flow'] if f['date'] == d), '')) for d, a in list(group_days(allx).items())[:8]]
                if same and not i.get('ai') and best.get('ai'):
                    i['ai'] = dict(best['ai'], via='macmini', at=OV['updated'])
                    for b in (best.get('bias') or []):
                        for s_ in i['sources']:
                            if s_['url'] == b['url']: s_['bias'] = b['bias']
                    if not i.get('flow_meaning_done'):
                        mm = {f['date']: f.get('meaning', '') for f in best.get('flow', [])}
                        for f in i['flow']: f['meaning'] = f.get('meaning') or mm.get(f['date'], '')
                used += 1
        for t in D['trends']:
            o = OV.get('trends', {}).get(t['keyword'])
            if o:
                if not NAVER_OK[0]: t['today'], t['past'], t['image'] = o['today'] or t['today'], o['past'] or t['past'], t.get('image') or o.get('image', '')
                if not t.get('ai'): t['ai'] = o.get('ai')
        OV_WORDS = OV.get('words') or []
        LLM_STATUS['overlay'] = dict(updated=OV['updated'], matched=used)
D['market'] = market()
D['stocks'] = stocks()
D['words'] = words()
if globals().get('OV_WORDS') and not any(w.get('ai') for w in D['words']): D['words'] = OV_WORDS
D['llm'] = LLM_STATUS
LLM_STATUS['naver_search'] = NAVER_OK[0]
json.dump(dict(list(WCACHE.items())[-3000:]), open(WCACHE_P, 'w'), ensure_ascii=False)
# ---------- 누적 저장소 연계: 과거 아카이브의 같은 인물·키워드 사건 자동 연결 ----------
AD = os.path.join(ROOT, 'archive'); IX = os.path.join(ROOT, 'index'); os.makedirs(IX, exist_ok=True)
ent_ix, kw_ix = collections.defaultdict(list), collections.defaultdict(list)
for f in sorted(os.listdir(AD)):
    if not re.match(r'\d{4}-\d\d-\d\d\.json$', f) or f[:10] == D['date']: continue
    try: A = json.load(open(os.path.join(AD, f)))
    except Exception: continue
    for i in A.get('issues', []):
        ref = dict(date=A['date'], rank=i['rank'], title=i['title'], url=i['url'], image=i.get('image', ''), entities=i.get('entities', []), keywords=i.get('keywords', []))
        for e in i.get('entities', []): ent_ix[e].append(ref)
        for k in i.get('keywords', [])[:4]: kw_ix[k].append(ref)
for i in D['issues']:
    sc = collections.Counter(); refs = {}
    for e in i['entities']:
        for r in ent_ix.get(e, []): sc[r['url']] += 3; refs[r['url']] = r
    for k in i['keywords'][:4]:
        for r in kw_ix.get(k, []): sc[r['url']] += 1; refs[r['url']] = r
    i['past'] = [dict(refs[u], score=v, shared=[x for x in i['entities'] + i['keywords'] if x in refs[u]['entities'] + refs[u]['keywords']][:4]) for u, v in sc.most_common(6) if v >= 2]
for i in D['issues']:
    ref = dict(date=D['date'], rank=i['rank'], title=i['title'], url=i['url'], image=i.get('image', ''), entities=i['entities'], keywords=i['keywords'])
    for e in i['entities']: ent_ix[e].append(ref)
    for k in i['keywords'][:4]: kw_ix[k].append(ref)
json.dump({k: v[-200:] for k, v in ent_ix.items()}, open(os.path.join(IX, 'entities.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump({k: v[-100:] for k, v in kw_ix.items() if len(v) > 1}, open(os.path.join(IX, 'keywords.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
if os.environ.get('OVERLAY_WRITE'):
    ov = dict(updated=D['updated'], issues=[dict(url=i['url'], toks=sorted(toks(i)), flow=i.get('flow', []), ai=i.get('ai'),
              bias=[dict(url=s_['url'], bias=s_['bias']) for s_ in i['sources'] if s_.get('bias')]) for i in D['issues']],
              trends={t['keyword']: dict(today=t.get('today', []), past=t.get('past', [])[:40], image=t.get('image', ''), ai=t.get('ai')) for t in D['trends']},
              words=D['words'] if any(w.get('ai') for w in D['words']) else [])
    json.dump(ov, open(OV_P, 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump(ov, open(os.path.join(OV_DIR, D['date'] + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
# 캐시 정리(최근 600개)
CACHE = dict(list(CACHE.items())[-600:])
json.dump(CACHE, open(CACHE_P, 'w'), ensure_ascii=False)
json.dump(D, open(os.path.join(ROOT, 'today.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
arch = os.path.join(ROOT, 'archive', D['date'] + '.json')
json.dump(dict(updated=D['updated'], date=D['date'], issues=[dict({k: v for k, v in i.items() if k not in ('flow', 'opinion', 'timeline', 'leads', 'past')}, opinion_summary=((i.get('ai') or {}).get('opinion') or {}).get('summary', ''), comment_total=(i.get('opinion') or {}).get('total', 0)) for i in D['issues']], trends=[{k: t[k] for k in ('keyword', 'traffic')} for t in D['trends']], words=D['words']),
          open(arch, 'w'), ensure_ascii=False)
print('enriched; llm', LLM_STATUS['calls'], LLM_STATUS['errors'][:2], 'market', len(D['market']), 'words', len(D['words']))
