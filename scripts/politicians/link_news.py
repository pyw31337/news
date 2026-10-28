#!/usr/bin/env python3
"""정치인 DB ↔ 뉴스 자동 연결 (GitHub Actions에서 매일 실행; 해외 IP여도 동작)
1) NewsBoard 누적 뉴스(data/archive/*.json)에서 현역·전직 의원 이름을 찾아 인물 타임라인에 연결
2) 구글 뉴스 RSS로 인물별 최근 기사 백필(실행당 ROTATE_N명씩 돌아가며)
3) 기사 제목 키워드로 사건 단계(의혹→수사→기소·재판→판결) '자동 분류' — 단정 금지, 원문 링크 필수
4) 헤드라인 키워드 통계(미디어 노출 경향)
사용: python link_news.py PDATA_DIR NEWS_DATA_DIR"""
import json, os, sys, re, glob, time, html, hashlib, urllib.request, urllib.parse, datetime as dt, email.utils
from collections import Counter
P, N = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'data'
KST = dt.timezone(dt.timedelta(hours=9)); TODAY = dt.datetime.now(KST).strftime('%Y-%m-%d')
ROT = int(os.environ.get('ROTATE_N', '60'))
UA = {'User-Agent': 'Mozilla/5.0 (NewsBoard politicians; +https://pyw31337.github.io/news/)'}
IDX = json.load(open(f'{P}/index.json', encoding='utf-8'))
CTX = re.compile(r'의원|국회|대표|원내|최고위|장관|후보|당선|공천|정당|민주당|국민의힘|혁신당|개혁신당|진보당|시장|지사|총리|대통령|청와대|대통령실|비대위|정치')
STAGES = [  # (단계, 정규식) — 뒤로 갈수록 진행된 단계
    ('의혹', r'의혹|폭로'),
    ('수사', r'수사|압수수색|소환|고발|고소|입건|영장|피의자|내사|조사받'),
    ('기소·재판', r'기소|공판|재판|구형|첫 재판|공소'),
    ('판결', r'선고|징역|집행유예|벌금형|무죄|유죄|실형|확정판결|당선무효|파기환송|항소심|상고심|대법'),
]
NOT_INCIDENT = re.compile(r'촉구|규탄|비판|요구|지적')  # 남을 비판하는 기사는 본인 사건이 아님
STOP = set('의원 국회 대표 위원장 오늘 기자 관련 대해 위해 정부 국민 우리 이번 지난 있다 했다 한다 것 등 및 더 첫 속보 단독 종합 포토 영상 사진 인터뷰'.split())
def h(s): return hashlib.sha1(s.encode()).hexdigest()[:12]
def load(p, d=None):
    try: return json.load(open(p, encoding='utf-8'))
    except Exception: return d
by_name = {}
for e in IDX['people']: by_name.setdefault(e['name'], []).append(e)
names = sorted([n for n in by_name if len(n) >= 2], key=len, reverse=True)
NAME_RE = re.compile('|'.join(map(re.escape, names)))

def resolve(name, text):
    """동명이인 처리: 현역 우선, 여러 명이면 제목에 정당명이 맞는 사람, 그래도 모호하면 포기"""
    c = by_name[name]
    cur = [e for e in c if e['current']]
    if len(cur) == 1: return cur[0]
    pool = cur or c
    m = [e for e in pool if e.get('party') and e['party'][:2] in text]
    if len(m) == 1: return m[0]
    if len(pool) == 1 and not cur and CTX.search(text): return pool[0]  # 전직은 정치 맥락어가 있을 때만
    return None

QUOTE = re.compile(r'"[^"]*"|“[^”]*”|‘[^’]*’|\'[^\']*\'|\[[^\]]*\]')
def stage(t, name=''):
    t = QUOTE.sub(' ', t)  # 따옴표 안 발언(남의 사건 언급)은 제외
    if name and name not in t: return None
    st = None
    for name, rx in STAGES:
        if re.search(rx, t): st = name
    return st

items = {}  # person id -> {url: item}
def add(pid, it): items.setdefault(pid, {})[it['url']] = it

# 1) NewsBoard 누적 뉴스
for f in sorted(glob.glob(f'{N}/archive/20*.json'))[-120:]:
    d = load(f, {}); day = os.path.basename(f)[:10]
    for i in d.get('issues', []):
        arts = [{'title': i['title'], 'url': i['url'], 'press': i.get('press'), 'img': i.get('image')}] + (i.get('sources') or [])
        for a in arts:
            t = a.get('title') or ''
            if not CTX.search(t): continue
            for m in set(NAME_RE.findall(t)):
                e = resolve(m, t)
                if e: add(e['id'], {'date': day, 'title': t, 'url': a['url'], 'press': a.get('press'), 'img': a.get('img') or '', 'via': 'NewsBoard 수집', 'issue': i.get('id')})

# 2) 구글 뉴스 RSS 백필 (현역 우선 순환)
state = load(f'{P}/_rotate.json', {'pos': 0})
cur = [e for e in IDX['people'] if e['current']]
pick = [cur[(state['pos'] + k) % len(cur)] for k in range(min(ROT, len(cur)))] if cur else []
state['pos'] = (state['pos'] + len(pick)) % max(1, len(cur))
def rss(e):
    q = f'"{e["name"]}" {(e.get("party") or "")[:5]} 의원'
    u = 'https://news.google.com/rss/search?' + urllib.parse.urlencode({'q': q, 'hl': 'ko', 'gl': 'KR', 'ceid': 'KR:ko'})
    try: x = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20).read().decode('utf-8', 'replace')
    except Exception: return []
    out = []
    for it in re.findall(r'<item>(.*?)</item>', x, re.S)[:60]:
        g = lambda tag: html.unescape((re.search(f'<{tag}[^>]*>(.*?)</{tag}>', it, re.S) or [None, ''])[1]).strip()
        t, link, pd, src = g('title'), g('link'), g('pubDate'), g('source')
        if e['name'] not in t: continue
        t = re.sub(r'\s+-\s+[^-]+$', '', t)
        try: day = email.utils.parsedate_to_datetime(pd).astimezone(KST).strftime('%Y-%m-%d')
        except Exception: day = TODAY
        out.append({'date': day, 'title': t, 'url': link, 'press': src, 'img': '', 'via': '구글 뉴스 검색'})
    return out
for e in pick:
    for it in rss(e): add(e['id'], it)
    time.sleep(1.2)
json.dump(state, open(f'{P}/_rotate.json', 'w'))

# 3) 사람별 파일에 병합
touched = 0; feed = []
for pid, new in items.items():
    path = f'{P}/people/{pid}.json'; Pp = load(path)
    if not Pp: continue
    old = {x['url']: x for x in Pp.get('news', [])}
    for u, it in new.items():
        if u not in old: old[u] = it | {'linked': TODAY}; feed.append({'id': pid, 'name': Pp['name'], 'party': Pp.get('party')} | it)
    news = sorted(old.values(), key=lambda x: x['date'], reverse=True)[:1500]
    Pp['news'] = news
    inc = []
    for x in news:
        s = stage(x['title'], Pp['name'])
        if s and not NOT_INCIDENT.search(x['title']):
            inc.append({'date': x['date'], 'stage': s, 'title': x['title'], 'url': x['url'], 'press': x.get('press')})
    Pp['incidents'] = {'method': '자동 분류(기사 제목 키워드) — 사실 확인 전 단계 포함, 유무죄를 뜻하지 않음', 'updated': TODAY, 'items': inc[:300]}
    words = Counter()
    for x in news:
        for w in re.findall(r'[가-힣A-Za-z]{2,}', re.sub(r'\[[^\]]*\]', '', x['title'])):
            if w not in STOP and w != Pp['name'] and not w.startswith(Pp['name']): words[w] += 1
    quotes = []
    for x in news:
        t = x['title']; i = t.find(Pp['name'])
        if i < 0: continue
        for q in re.findall(r'"([^"]{6,80})"|“([^”]{6,80})”', t[i:]):
            q = q[0] or q[1]
            quotes.append({'date': x['date'], 'quote': q, 'url': x['url'], 'press': x.get('press')}); break
    months = Counter(x['date'][:7] for x in news)
    Pp['media'] = {'method': '통계(연결된 기사 헤드라인 단어 빈도)', 'updated': TODAY, 'top_words': words.most_common(30), 'quotes': quotes[:60],
                   'by_month': dict(sorted(months.items())), 'presses': Counter(x.get('press') or '' for x in news).most_common(10)}
    json.dump(Pp, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); touched += 1
# 인덱스에 뉴스 수 반영 + 최근 연결 피드
cnt = {}
for f in glob.glob(f'{P}/people/*.json'):
    d = load(f, {}); cnt[d.get('id')] = (len(d.get('news', [])), len((d.get('incidents') or {}).get('items', [])))
for e in IDX['people']: e['news'], e['inc'] = cnt.get(e['id'], (0, 0))
IDX['linked'] = TODAY
json.dump(IDX, open(f'{P}/index.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
fp = f'{P}/feed.json'; F = load(fp, []) or []
F = sorted(feed + F, key=lambda x: x['date'], reverse=True)[:400]
json.dump(F, open(fp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('linked people', touched, 'new items', len(feed), 'rss', len(pick))
