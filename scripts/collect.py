#!/usr/bin/env python3
"""NewsBoard 수집·분석 파이프라인 (GitHub Actions에서 1시간마다 실행)
소스: 네이버 뉴스 언론사별 랭킹(많이 본/댓글 많은), Google 뉴스 RSS(주요·섹션), Google 트렌드 KR RSS,
엔티티 타임라인: Google 뉴스 검색 RSS + 누적 아카이브, 프로필: 한국어 위키백과 REST 요약"""
import re, json, html, os, datetime as dt, urllib.request, urllib.parse, email.utils, collections, math, time
from concurrent.futures import ThreadPoolExecutor
from kiwipiepy import Kiwi
from entity_media import enrich as enrich_entity_media
from reporters import collect as collect_reporters

KST = dt.timezone(dt.timedelta(hours=9))
NOW = dt.datetime.now(KST)
ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')
UA = {'User-Agent': 'Mozilla/5.0 (NewsBoard; +https://pyw31337.github.io/news/)'}
kiwi = Kiwi()


import atexit as _ax, collections as _co, urllib.parse as _up
DIAG = {'ok': _co.Counter(), 'fail': _co.Counter(), 'errors': []}
def _dhost(u): return _up.urlsplit(u).netloc
_DDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
def _dsave():
    try:
        os.makedirs(_DDIR, exist_ok=True)
        json.dump(dict(step='collect', at=dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).isoformat(), ok=DIAG['ok'], fail=DIAG['fail'], errors=DIAG['errors'][-40:]),
                  open(os.path.join(_DDIR, 'diag_collect.json'), 'w'), ensure_ascii=False)
    except Exception as e: print('diag', e)
_ax.register(_dsave)

def get(url, enc=None, timeout=20):
    for i in range(3):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout)
            b = r.read()
            if not enc:
                m = re.search(rb'charset=["\']?([\w-]+)', b[:3000]); enc = m.group(1).decode() if m else 'utf-8'
            DIAG['ok'][_dhost(url)] += 1; return b.decode(enc, 'replace')
        except Exception as e:
            err = e
            if getattr(e, 'code', 0) == 404: break
            time.sleep(4 * (i + 1) if getattr(e, 'code', 0) == 429 else 1)
    DIAG['fail'][_dhost(url)] += 1; DIAG['errors'].append(dict(t=time.strftime('%H:%M:%S', time.gmtime(time.time() + 32400)), host=_dhost(url), path=_up.urlsplit(url).path[:60], err=str(err)[:120])); print('fail', url[:120], err); return ''

# 기자 프로필은 보조 정보다. 포털 응답이 늦어도 메인 뉴스 수집을 기다리게 하지 않는다.
def reporter_get(url, enc='utf-8', timeout=5):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout)
        b = r.read()
        DIAG['ok'][_dhost(url)] += 1
        return b.decode(enc or 'utf-8', 'replace')
    except Exception as e:
        DIAG['fail'][_dhost(url)] += 1
        DIAG['errors'].append(dict(t=time.strftime('%H:%M:%S', time.gmtime(time.time() + 32400)), host=_dhost(url), path=_up.urlsplit(url).path[:60], err=('reporter: ' + str(e))[:120]))
        print('reporter fail', url[:100], str(e)[:80])
        return ''

def un(s): return html.unescape(re.sub(r'<[^>]+>', '', html.unescape(s or ''))).strip()

STOP = set('속보 단독 종합 영상 사진 포토 오늘 내일 어제 이번 지난 올해 내년 관련 논란 가능 정부 기자 뉴스 대한 위해 이후 결과 상황 공개 발표 확인 사실 문제 우리 국내 최근 전망 이유 계획 진행 예정 경우 모습 시간 직접 첫 가운데 뒤 전 후 중 등 것 수 명 개 년 월 일 원 억 조 만 위 씨 측 곳 말 때 번 건 날 분 회 차 앞 속 간 내 외 대 이 그 저 더 또 왜 다 한 두 세 글 화 독자 종목 인터뷰 칼럼 사설 시론 기고'.split())

def nouns(text):
    toks = kiwi.tokenize(text)
    out, i = [], 0
    while i < len(toks):
        t = toks[i]
        if t.tag in ('NNP', 'NNG', 'SL', 'SH'):
            form, end, tags = t.form, t.start + t.len, {t.tag}
            j = i + 1
            while j < len(toks) and toks[j].start == end and toks[j].tag in ('NNP', 'NNG', 'SL', 'SN', 'XSN'):
                form += toks[j].form; end += toks[j].len; tags.add(toks[j].tag); j += 1
            if len(form) >= 2 and form not in STOP and not form.isdigit():
                out.append((form, 'NNP' in tags or 'SL' in tags))
            i = j
        else:
            i += 1
    return out

# ---------- 1. 수집 ----------
def naver_ranking(kind):
    url = 'https://news.naver.com/main/ranking/%s.naver' % kind
    t = get(url, 'euc-kr')
    arts = []
    for box in re.findall(r'<div class="rankingnews_box">(.*?)</ul>', t, re.S):
        press = un((re.search(r'rankingnews_name">(.*?)<', box) or [None, ''])[1])
        for li in re.findall(r'<li>(.*?)</li>', box, re.S):
            m = re.search(r'href="(https://n\.news\.naver\.com/article/[^"?]+)[^"]*" class="list_title[^>]*>(.*?)</a>', li, re.S)
            if not m: continue
            rk = int((re.search(r'list_ranking_num">(\d+)', li) or [0, 5])[1])
            img = re.search(r'<img src="([^"]+)"', li)
            arts.append(dict(src='naver_' + kind, title=un(m.group(2)), url=m.group(1), press=press, rank=rk,
                             img=img.group(1) if img else ''))
    return arts

def gnews(url, label):
    t = get(url, 'utf-8'); arts = []
    for it in re.findall(r'<item>(.*?)</item>', t, re.S):
        title = un((re.search(r'<title>(.*?)</title>', it, re.S) or [0, ''])[1])
        press = un((re.search(r'<source[^>]*>(.*?)</source>', it) or [0, ''])[1])
        if press and title.endswith(' - ' + press): title = title[: -len(press) - 3]
        link = un((re.search(r'<link>(.*?)</link>', it) or [0, ''])[1])
        pd = (re.search(r'<pubDate>(.*?)</pubDate>', it) or [0, ''])[1]
        desc = html.unescape((re.search(r'<description>(.*?)</description>', it, re.S) or [0, ''])[1])
        related = len(re.findall(r'<li>', desc)) or 1
        try: ts = email.utils.parsedate_to_datetime(pd).astimezone(KST).isoformat()
        except Exception: ts = ''
        arts.append(dict(src='google', section=label, title=title, url=link, press=press, time=ts, related=related))
    return arts

GN = 'https://news.google.com/rss%s?hl=ko&gl=KR&ceid=KR:ko'
def gquery(q): return 'https://news.google.com/rss/search?q=' + urllib.parse.quote(q) + '&hl=ko&gl=KR&ceid=KR:ko'
def section_url(path): return path if path.startswith('http') else GN % path
SECTIONS = {'주요': '', '정치': '/headlines/section/topic/NATION', '경제': '/headlines/section/topic/BUSINESS',
            '세계': '/headlines/section/topic/WORLD', 'IT·과학': '/headlines/section/topic/TECHNOLOGY',
            '과학': gquery('과학 연구 OR 우주 OR 연구개발'), '건강': gquery('건강 OR 의료 OR 질병'),
            '환경': gquery('기후 OR 환경 OR 탄소'), '문화': gquery('문화 OR 전시 OR 공연 OR 출판'),
            '연예': '/headlines/section/topic/ENTERTAINMENT', '스포츠': '/headlines/section/topic/SPORTS'}

def trends():
    t = get('https://trends.google.com/trending/rss?geo=KR', 'utf-8'); out = []
    for it in re.findall(r'<item>(.*?)</item>', t, re.S):
        kw = un(re.search(r'<title>(.*?)</title>', it).group(1))
        tr = un((re.search(r'approx_traffic>(.*?)<', it) or [0, ''])[1])
        news = [dict(title=un(a), url=un(b)) for a, b in re.findall(r'news_item_title>(.*?)</ht:news_item_title>.*?news_item_url>(.*?)</ht:news_item_url>', it, re.S)]
        pic = un((re.search(r'<ht:picture>(.*?)</ht:picture>', it) or [0, ''])[1])
        out.append(dict(keyword=kw, traffic=tr, traffic_n=int(re.sub(r'\D', '', tr) or 0), news=news, img=pic))
    return out

with ThreadPoolExecutor(10) as ex:
    fr = [ex.submit(naver_ranking, 'popularDay'), ex.submit(naver_ranking, 'popularMemo'), ex.submit(trends)] + \
         [ex.submit(gnews, section_url(p), k) for k, p in SECTIONS.items()]
    nv_pop, nv_memo, tr = fr[0].result(), fr[1].result(), fr[2].result()
    gn = [a for f in fr[3:] for a in f.result()]
print('naver', len(nv_pop), len(nv_memo), 'google', len(gn), 'trends', len(tr))

# ---------- 2. 분석: 명사/개체 추출 + 이슈 클러스터링 ----------
arts = nv_pop + nv_memo + gn
for a in arts:
    ns = nouns(a['title']); a['nouns'] = list(dict.fromkeys(n for n, _ in ns)); a['proper'] = list(dict.fromkeys(n for n, p in ns if p))
    if a['src'] == 'naver_popularDay': a['w'] = 6 - min(a['rank'], 5) + 1
    elif a['src'] == 'naver_popularMemo': a['w'] = (6 - min(a['rank'], 5)) * 0.8 + 1
    else: a['w'] = 1.5 + math.log1p(a['related']) * 1.5

df = collections.Counter(n for a in arts for n in set(a['nouns']))
N = len(arts)
def vec(a): return {n: math.log(N / df[n]) * (1.6 if n in a['proper'] else 1) for n in a['nouns'] if df[n] < N * 0.2}
for a in arts: a['v'] = vec(a)
def sim(u, v):
    k = set(u) & set(v)
    if not k: return 0
    return sum(u[x] * v[x] for x in k) / (math.sqrt(sum(x * x for x in u.values())) * math.sqrt(sum(x * x for x in v.values())) + 1e-9)

clusters = []
for a in sorted(arts, key=lambda a: -a['w']):
    best, bs = None, 0
    for c in clusters:
        s = max(sim(a['v'], b['v']) for b in c['arts'][:8])
        if s > bs: best, bs = c, s
    if best and bs >= 0.34: best['arts'].append(a)
    else: clusters.append({'arts': [a]})

trend_kw = {t['keyword']: t for t in tr}
for c in clusters:
    A = c['arts']; presses = set(a['press'] for a in A)
    c['score'] = sum(a['w'] for a in A) * (1 + 0.15 * (len(presses) - 1))
    kc = collections.Counter(n for a in A for n in a['nouns'])
    c['keywords'] = [k for k, _ in kc.most_common(8) if df[k] < N * 0.2][:6]
    c['proper'] = [k for k, _ in collections.Counter(n for a in A for n in a['proper']).most_common(5)]
    c['trend'] = [k for k in trend_kw if any(k.replace(' ', '') in a['title'].replace(' ', '') for a in A)]
    if c['trend']: c['score'] *= 1.25
    srcs = set(a['src'].split('_')[0] for a in A)
    c['portals'] = sorted(srcs)
clusters.sort(key=lambda c: -c['score'])

def og(url):
    t = get(url, 'utf-8', 12)
    d = re.search(r'<meta property="og:description" content="([^"]*)"', t)
    i = re.search(r'<meta property="og:image" content="([^"]*)"', t)
    return (html.unescape(d.group(1)) if d else ''), (html.unescape(i.group(1)) if i else '')

CAT_WORDS = {'정치': '대통령 국회 의원 여당 야당 민주당 국민의힘 장관 특검 총리 정당 선거 탄핵 검찰 대법원 정치 개혁 보수 진보 혁신당 개혁신당',
 '경제': '코스피 코스닥 주가 증시 매출 영업이익 증권 반도체 금리 환율 부동산 아파트 주주 배당 투자 기업 실적 수출 은행 HBM 메모리 코인 비트코인',
 '사회': '경찰 사건 사고 시신 피의자 법원 재판 병원 교수 의대 학교 화재 사망 체포 구속 응급',
 '세계': '미국 중국 일본 트럼프 이스라엘 러시아 우크라이나 유럽 총선 정상회담',
 'IT': 'AI 인공지능 해킹 앱 플랫폼 반도체 스마트폰 애플 구글 네이버 카카오 오픈AI 보안',
 '연예': '배우 가수 아이돌 드라마 영화 방송 예능 결혼 열애 임신 컴백 앨범',
 '스포츠': '야구 축구 농구 배구 골프 감독 선수 리그 월드컵 올림픽 KBO 손흥민 대표팀'}
import sys as _sys; _sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from classify import categorize as _cat2
def categorize(A, sect):
    c, conf, why = _cat2([a['title'] for a in A], sect)
    categorize.last = (conf, why)
    return c
CAT_HINT = {'정치': '정치', '경제': '경제', '세계': '세계', 'IT·과학': 'IT', '연예': '연예', '스포츠': '스포츠'}
choices = []
for c in clusters[:40]:
    A = c['arts']
    nv = [a for a in A if a['src'].startswith('naver')]
    rep = min(nv, key=lambda a: a['rank']) if nv else A[0]
    sect = collections.Counter(a.get('section') for a in A if a.get('section') not in (None, '주요'))
    c.update(rep=rep, category=categorize(A, sect), cat_conf=categorize.last[0], cat_why=categorize.last[1])
    choices.append(c)
# 첫 화면은 한 카테고리가 독점하지 않도록 2개→3개 상한으로 채운다.
top = []; picked = set(); bycat = collections.Counter()
for cap in (2, 3, 10):
    for c in choices:
        if id(c) in picked or bycat[c['category']] >= cap: continue
        top.append(c); picked.add(id(c)); bycat[c['category']] += 1
        if len(top) >= 10: break
    if len(top) >= 10: break
with ThreadPoolExecutor(10) as ex:
    reps = [c['rep'] for c in top]
    # 요약(og 설명)은 네이버 기사에서만 받을 수 있어, 대표 기사가 네이버가 아니면 같은 묶음의 네이버 기사에서 받음(사진은 대표 기사 것만)
    def og_of(c):
        r = c['rep']
        if 'naver' in r['url']: return og(r['url'])
        alt = next((a['url'] for a in c['arts'] if 'naver' in a['url']), None)
        return (og(alt)[0], '') if alt else ('', '')
    ogs = list(ex.map(og_of, top))
def summarize(text):
    s = [x.strip() for x in re.split(r'(?<=다\.)\s+', text.strip()) if x.strip()]
    full = [x for x in s if x.endswith('다.')]
    return full[:3] if full else ([text.strip() + '…'] if text.strip() else [])

issues = []
for i, (c, (d, im)) in enumerate(zip(top, ogs)):
    rep = c['rep']; seen = set(); sources = []
    for a in sorted(c['arts'], key=lambda a: -a['w']):
        if a['url'] in seen: continue
        seen.add(a['url']); sources.append(dict(title=a['title'], url=a['url'], press=a['press'],
                                                portal='네이버' if a['src'].startswith('naver') else '구글뉴스',
                                                kind={'naver_popularDay': '많이 본', 'naver_popularMemo': '댓글 많은'}.get(a['src'], a.get('section', ''))))
    issues.append(dict(rank=i + 1, id='i' + __import__('hashlib').md5(rep['url'].encode()).hexdigest()[:8], title=rep['title'], url=rep['url'], press=rep['press'],
                       image=im or rep.get('img', ''), summary=summarize(d) if d else [], lead=d,
                       keywords=c['keywords'], entities=c['proper'], category=c['category'], cat_conf=c['cat_conf'], cat_why=c['cat_why'], trend=c['trend'],
                       score=round(c['score'], 1), mentions=len(c['arts']), presses=len(set(a['press'] for a in c['arts'])),
                       sources=sources[:12]))

# 기자는 기사 본문에 공개된 네이버 기자 카드와 기자 프로필을 기준으로만 수집한다.
# 같은 이름이라는 이유만으로 이직·소속 이력을 합치지 않으며, 한 회차 최대 8명으로 제한한다.
try:
    reporters = collect_reporters(issues, ROOT, NOW, reporter_get, limit=8)
except Exception as ex:
    reporters = []
    print('reporters', ex)

# ---------- 3. 엔티티(인물·장소·사건) + 관계망 ----------
ent_score = collections.Counter(); ent_issue = collections.defaultdict(set)
for c in clusters[:60]:
    for e in c['proper'][:4]:
        ent_score[e] += c['score']
for iss in issues:
    for e in iss['entities']: ent_issue[e].add(iss['id'])
for t in tr: ent_score[t['keyword']] += t['traffic_n'] / 200
cand = [e for e, _ in ent_score.most_common(70) if len(e) >= 2 and e not in ('한국', '대한민국', '서울', '정부') and not re.fullmatch(r'[a-z]{1,3}', e)]
cand = [e for e in cand if not any(e != o and e in o and ent_score[o] >= ent_score[e] * 0.6 for o in cand)]

def wiki(name):
    t = get('https://ko.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(name.replace(' ', '_')), 'utf-8', 10)
    try: j = json.loads(t)
    except Exception: return None
    if j.get('type') != 'standard': return None
    return dict(title=j.get('title'), desc=j.get('description', ''), extract=j.get('extract', ''),
                thumb=(j.get('thumbnail') or {}).get('source', ''), url=(j.get('content_urls') or {}).get('desktop', {}).get('page', ''))

def etype(w):
    s = ((w or {}).get('desc', '') + ' ' + (w or {}).get('extract', '')[:60])
    d = (w or {}).get('desc', '')
    if re.search(r'(회사|기업|업체|기관|정당|단체|위원회|부처|대학|은행|협회|거래소|방송사|구단|그룹$)', d): return 'org'
    if re.search(r'(증권|운용|은행|조사소|연구소)', (w or {}).get('title', '')): return 'org'
    # 주가지수·거래소가 '사람'으로 잘못 분류되던 문제(예: 나스닥) — 지수·시장 이름은 기관으로
    if re.search(r'(지수|거래소|증시|주식시장|나스닥|코스피|코스닥|다우|S&P|NASDAQ)', (w or {}).get('title', '') + ' ' + d): return 'org'
    if re.search(r'(정치인|장관|청장|대법원장|시장|국회의원|배우|가수|선수|기업인|감독|대통령|총리|의원|방송인|작가|학자|아이돌|태어|출생)', s): return 'person'
    if re.search(r'(자치구|도시|국가|나라|섬|지역|광역시|특별시|공화국|마을)', d): return 'place'
    if re.search(r'(정치인|배우|가수|선수|기업인|감독|대통령|총리|의원|인물|방송인|작가|학자|그룹|아이돌|태어|출생|\(\d{4}년)', s): return 'person'
    if re.search(r'(도시|국가|나라|섬|지역|광역시|특별시|도\b|군\b|구\b|시\b|공화국|주\b|산\b|강\b)', s): return 'place'
    if re.search(r'(회사|기업|기관|정당|단체|위원회|부처|법원|대학|은행|협회)', s): return 'org'
    return 'event'

def timeline(name):
    q = urllib.parse.quote('"%s"' % name)
    items = gnews('https://news.google.com/rss/search?q=%s&hl=ko&gl=KR&ceid=KR:ko' % q, 'search')
    items += gnews('https://news.google.com/rss/search?q=%s+before:%s&hl=ko&gl=KR&ceid=KR:ko' % (q, (NOW - dt.timedelta(days=60)).strftime('%Y-%m-%d')), 'search')
    for yrs in (1, 3):
        items += gnews('https://news.google.com/rss/search?q=%s+before:%s&hl=ko&gl=KR&ceid=KR:ko' % (q, (NOW - dt.timedelta(days=365 * yrs)).strftime('%Y-%m-%d')), 'search')
    seen, out = set(), []
    for a in items:
        k = re.sub(r'\W', '', a['title'])[:24]
        if k in seen or not a['time']: continue
        seen.add(k); out.append(dict(t=a['time'], title=a['title'], url=a['url'], press=a['press'], related=a['related']))
    return sorted(out, key=lambda x: x['t'], reverse=True)

with ThreadPoolExecutor(8) as ex:
    W = dict(zip(cand, ex.map(wiki, cand)))
tkw = set(trend_kw)
ents = [e for e in cand if (W[e] and etype(W[e]) != 'event') or e in tkw][:22]
with ThreadPoolExecutor(8) as ex:
    TL = dict(zip(ents, ex.map(timeline, ents)))

def issue_tl(iss):
    kw = [k for k in iss['keywords'] if len(k) >= 2][:2]
    if not kw: return []
    q = urllib.parse.quote(' '.join(kw))
    items = gnews('https://news.google.com/rss/search?q=%s+when:30d&hl=ko&gl=KR&ceid=KR:ko' % q, 'search')
    seen, out = set(), []
    for a in sorted(items, key=lambda a: a['time']):
        k = re.sub(r'\W', '', a['title'])[:20]
        if k in seen or not a['time']: continue
        seen.add(k); out.append(dict(t=a['time'], title=a['title'], url=a['url'], press=a['press'], related=a['related']))
    return out[-40:]
with ThreadPoolExecutor(8) as ex:
    for iss, tl in zip(issues, ex.map(issue_tl, issues)): iss['timeline'] = tl
# 관계: 같은 기사 제목에 함께 등장한 횟수
co = collections.Counter()
for a in arts:
    p = [e for e in ents if e in a['title']]
    for x in range(len(p)):
        for y in range(x + 1, len(p)): co[tuple(sorted((p[x], p[y])))] += 1
for c in clusters[:60]:
    p = [e for e in ents if any(e in a['title'] for a in c['arts'])]
    for x in range(len(p)):
        for y in range(x + 1, len(p)): co[tuple(sorted((p[x], p[y])))] += 1

# 누적 아카이브 기반 언급 추이
os.makedirs(os.path.join(ROOT, 'archive'), exist_ok=True)
hist_path = os.path.join(ROOT, 'entity_history.json')
hist = json.load(open(hist_path)) if os.path.exists(hist_path) else {}
today = NOW.strftime('%Y-%m-%d')
for e in ents:
    h = hist.setdefault(e, {}); h[today] = round(ent_score[e], 1)
json.dump(hist, open(hist_path, 'w'), ensure_ascii=False)

entities = []
for e in ents:
    w = W[e]; tl = TL[e]
    days = collections.Counter(x['t'][:10] for x in tl)
    h = hist.get(e, {}); prev = [v for d, v in sorted(h.items()) if d < today]
    entities.append(dict(name=e, type=etype(w), score=round(ent_score[e], 1), wiki=w, issues=sorted(ent_issue[e]),
                         timeline=tl[:400], daily=sorted(days.items()), history=sorted(h.items())[-30:],
                         delta=(round(ent_score[e] - prev[-1], 1) if prev else None),
                         related=[dict(name=(b if a == e else a), n=n) for (a, b), n in co.most_common() if e in (a, b)][:8]))

# 인물은 사진, 기업·기관은 로고, 나라·장소는 국기·대표 사진을 우선한다.
# 실패해도 기존 위키 미리보기로 렌더링할 수 있으므로 수집 전체를 멈추지 않는다.
try:
    enrich_entity_media(entities)
except Exception as ex:
    print('entity media', ex)

data = dict(updated=NOW.isoformat(), date=today,
            stats=dict(naver=len(nv_pop) + len(nv_memo), google=len(gn), trends=len(tr), clusters=len(clusters), reporters=len(reporters),
                       presses=len(set(a['press'] for a in arts))),
            issues=issues, entities=entities, reporters=reporters, trends=tr[:20],
            links=[dict(a=a, b=b, n=n) for (a, b), n in co.most_common(60)],
            sections={k: [dict(title=a['title'], url=a['url'], press=a['press'], time=a['time'], related=a['related'])
                          for a in gn if a['section'] == k][:12] for k in SECTIONS})
# TOP 10 밖 상위 이슈(11~40위)도 아카이브용으로 가볍게 남김
top_ids = {id(c) for c in top}; more = []
for c in clusters[:60]:
    if id(c) in top_ids or len(more) >= 30: continue
    A = c['arts']; nv = [a for a in A if a['src'].startswith('naver')]; rep = min(nv, key=lambda a: a['rank']) if nv else A[0]
    more.append(dict(id='i' + __import__('hashlib').md5(rep['url'].encode()).hexdigest()[:8], title=rep['title'], url=rep['url'], press=rep['press'],
                     presses=len({a['press'] for a in A}), mentions=len(A), score=round(c.get('score', 0), 1), keywords=c.get('keywords', [])[:5]))
data['more'] = more
json.dump([dict(title=a['title'], url=a['url'], press=a['press'], t=a.get('time') or '', src=a['src'], sec=a.get('section') or '') for a in arts],
          open(os.path.join(ROOT, '_arts.json'), 'w'), ensure_ascii=False)
json.dump(data, open(os.path.join(ROOT, 'today.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(dict(updated=data['updated'], date=today, issues=issues, trends=tr[:20]),
          open(os.path.join(ROOT, 'archive', today + '.json'), 'w'), ensure_ascii=False)
idx = sorted({f[:-5] for f in os.listdir(os.path.join(ROOT, 'archive')) if f.endswith('.json') and f != 'index.json'}, reverse=True)
json.dump(idx, open(os.path.join(ROOT, 'archive', 'index.json'), 'w'))
print('issues', len(issues), 'entities', len(entities))
