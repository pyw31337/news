#!/usr/bin/env python3
"""과거 날짜의 주요 이슈 10개 복원: python scripts/history/backfill_top10.py <data 폴더> [날짜 수(기본 20)] [최대 며칠 전까지(기본 365)]
실시간 수집(collect.py)이 시작되기 전 날짜를 채워 타임라인 1년 보기·과거 연결에 쓴다.
방법: 구글 뉴스 RSS 기간 검색(after:/before:)으로 그날 분야별 기사 → 제목이 겹치는 기사끼리 묶기 →
     '보도한 언론사 수'가 많은 순으로 10개. 실제 그날의 많이 본 순위와 다를 수 있어 파일에 restored=true 표시(화면에도 안내).
이미 있는 날짜(실시간 수집분 포함)는 절대 덮어쓰지 않는다."""
import os, re, sys, json, time, hashlib, datetime as dt, urllib.request, urllib.parse, html, collections
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
try: from classify import categorize
except Exception: categorize = None
ROOT = sys.argv[1] if len(sys.argv) > 1 else 'data'
N = int(sys.argv[2]) if len(sys.argv) > 2 else 20
BACK = int(sys.argv[3]) if len(sys.argv) > 3 else 365
AD = os.path.join(ROOT, 'archive'); os.makedirs(AD, exist_ok=True)
KST = dt.timezone(dt.timedelta(hours=9)); TODAY = dt.datetime.now(KST).date()
UA = {'User-Agent': 'Mozilla/5.0 (NewsBoard archive backfill)'}
# 분야별 검색어(분야 판단에도 참고)
Q = [('속보', None), ('대통령', '정치'), ('국회', '정치'), ('정부 발표', '정치'), ('경제', '경제'), ('증시', '경제'), ('부동산', '경제'), ('사건', '사회'),
     ('사고', '사회'), ('검찰', '사회'), ('법원 판결', '사회'), ('북한', '정치'), ('미국', '세계'), ('중국', '세계'), ('연예', '연예'), ('스포츠', '스포츠')]
PR = set('협력 개최 출시 수상 새단장 취득 체결 MOU 세미나 성과대회 이벤트 프로모션 오픈 론칭 기부 후원 캠페인 선정 할인 특가 업무협약 동정'.split())
HARD = set('사망 사고 구속 기소 선고 탄핵 특검 발사 급락 급등 화재 지진 대통령 국회'.split())
LOCAL = set('국비 현안 시장 군수 구청장 도지사'.split())
CAT7 = {'과학': 'IT', '건강': '사회', '환경': '사회', '문화': '사회'}   # 사이트 분류 7개(정치·경제·사회·세계·IT·연예·스포츠)로
STOP = set('속보 단독 종합 1보 2보 영상 사진 포토 오늘 내일 어제 관련 대한 위해 이번 지난 올해 한국 우리 정부 발표 기자 뉴스 사설 칼럼 오피니언 인터뷰 브리핑'.split())
def get(u):
    for i in range(3):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20).read()
        except Exception: time.sleep(2 + 3 * i)
    return b''
def toks(t):
    t = re.sub(r'\[[^\]]*\]|\([^)]*\)|[“”"\'‘’…·]', ' ', t)
    return {w for w in re.findall(r'[가-힣A-Za-z0-9]{2,}', t) if w not in STOP and not w.isdigit()}
def day(d):
    a, b = d.isoformat(), (d + dt.timedelta(days=1)).isoformat(); items = []; seen = set(); fails = 0
    for q, cat in Q:
        x = get('https://news.google.com/rss/search?' + urllib.parse.urlencode({'q': f'{q} after:{a} before:{b}', 'hl': 'ko', 'gl': 'KR', 'ceid': 'KR:ko'}))
        if not x: fails += 1; continue
        try: root = ET.fromstring(x)
        except Exception: fails += 1; continue
        for it in root.iter('item'):
            t = html.unescape(it.findtext('title') or ''); src = it.find('source'); press = (src.text if src is not None else '') or ''
            if press and t.endswith(' - ' + press): t = t[: -len(' - ' + press)]
            t = re.sub(r'\s+[-|]\s*[^-|]{1,12}\s*\|\s*[^|]{1,12}$', '', t)   # '- 경제 | 기사' 같은 꼬리 제거
            link = it.findtext('link') or ''
            if not t or link in seen: continue
            seen.add(link); items.append(dict(title=t.strip(), url=link, press=press.strip(), q=q, cat=cat, tk=toks(t)))
        time.sleep(1.0)
    if fails > len(Q) // 2: return None   # 검색이 막힘 → 이 날짜는 다음에 다시
    # 같은 사건 묶기: 핵심어 2개 이상 겹치거나 겹침 비율 0.34 이상
    C = []
    for it in items:
        best, bs = None, 0
        for c in C:   # 묶음의 핵심어(자주 나온 말)와만 비교 → 묶음이 끝없이 커지지 않게
            inter = len(it['tk'] & c['core']); s = inter / max(1, min(len(it['tk']), len(c['core'])))
            if inter >= 2 and s >= .4 and inter > bs: best, bs = c, inter
        if best: best['items'].append(it); best['cnt'].update(it['tk']); best['core'] = {w for w, n in best['cnt'].most_common(6)}
        else: C.append(dict(items=[it], cnt=collections.Counter(it['tk']), core=set(it['tk'])))
    # 같은 사건이 둘로 갈라진 묶음 합치기(핵심어 2개 이상 공유)
    C.sort(key=lambda c: -len(c['items'])); M = []
    for c in C:
        tgt = next((m for m in M if len(c['core'] & m['core']) >= 2), None)
        if tgt: tgt['items'] += c['items']; tgt['cnt'].update(c['cnt']); tgt['core'] = {w for w, n in tgt['cnt'].most_common(6)}
        else: M.append(c)
    C = M
    for c in C:
        c['presses'] = len({i['press'] for i in c['items'] if i['press']})
        # 똑같은 제목이 여러 매체에 그대로 실린 묶음은 보도자료일 가능성이 커서 점수를 낮춤
        uniq = len({re.sub(r'\W', '', i['title'])[:30] for i in c['items']}) / max(1, len(c['items']))
        c['score'] = c['presses'] * (.35 + .65 * uniq)
        if c['core'] & PR and not c['core'] & HARD: c['score'] *= .35   # 기업 홍보성 기사
        if c['core'] & LOCAL: c['score'] *= .5   # 지자체장 동정(국회 방문·국비 요청)
    C = [c for c in C if c['presses'] >= 3]
    C.sort(key=lambda c: (-c['score'], -len(c['items'])))
    out = []
    for r, c in enumerate(C[:10], 1):
        core = [w for w, n in c['cnt'].most_common(6) if n >= 2] or [w for w, n in c['cnt'].most_common(4)]
        rep = max(c['items'], key=lambda i: (len(i['tk'] & set(core)), -abs(len(i['title']) - 40)))
        titles = [i['title'] for i in c['items']]
        cc = collections.Counter(i['cat'] for i in c['items'] if i['cat']); qcat = cc.most_common(1)[0][0] if cc else None
        cat = None
        if categorize:
            try:
                k, conf = categorize(titles)[:2]
                if conf >= .5 or not qcat: cat = k
            except Exception: pass
        cat = CAT7.get(cat or qcat or '사회', cat or qcat or '사회')
        out.append(dict(rank=r, id='r' + hashlib.md5((a + rep['title']).encode()).hexdigest()[:8], title=rep['title'], url=rep['url'], press=rep['press'], image='',
                        summary=[], keywords=core[:6], entities=[], category=cat, presses=c['presses'], mentions=len(c['items']),
                        sources=[dict(title=i['title'], url=i['url'], press=i['press']) for i in c['items'][:6]]))
    return out
have = {f[:-5] for f in os.listdir(AD) if f.endswith('.json') and f != 'index.json'}
todo = [TODAY - dt.timedelta(days=k) for k in range(1, BACK + 1)]
todo = [d for d in todo if d.isoformat() not in have][:N]
done = 0
for d in todo:
    I = day(d)
    if I is None: print('blocked', d); break
    if not I: print('empty', d); I = []
    json.dump(dict(date=d.isoformat(), restored=True, method='google-news-search', updated=dt.datetime.now(KST).isoformat(timespec='minutes'), issues=I, trends=[], words=[], more=[]),
              open(os.path.join(AD, d.isoformat() + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    done += 1; print(d, len(I), (I[0]['title'][:40] if I else ''))
idx = sorted({f[:-5] for f in os.listdir(AD) if f.endswith('.json') and f != 'index.json'}, reverse=True)
json.dump(idx, open(os.path.join(AD, 'index.json'), 'w'))
print('backfill: %d days, archive total %d' % (done, len(idx)))
