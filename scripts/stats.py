#!/usr/bin/env python3
"""관리자 '데이터 수집 현황판' 데이터(30분마다, collect 끝부분): data/stats.json
수집처별 누적·일별 수집량, 수집 속도, 목표 대비 진행률, 분류별 분포, 품질(정합성·가치) 지표, 문제 목록을 한 파일로.
공개 데이터만 담는다(키·토큰·내부 경로 없음). 다른 브랜치(politicians·legal·history)는 공개 raw 주소에서 작은 색인만 읽는다."""
import os, re, json, gzip, glob, time, collections, datetime as dt, urllib.request
ROOT = 'data'; KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST); TODAY = NOW.strftime('%Y-%m-%d')
RAW = 'https://raw.githubusercontent.com/pyw31337/news/%s/%s'
def load(p, d=None):
    try: return json.load(gzip.open(p, 'rt', encoding='utf-8') if p.endswith('.gz') else open(p, encoding='utf-8'))
    except Exception: return d
def J(p, d=None): return load(os.path.join(ROOT, p), d)
def raw(branch, path):
    try: return json.loads(urllib.request.urlopen(urllib.request.Request(RAW % (branch, path), headers={'User-Agent': 'NewsBoard stats'}), timeout=12).read())
    except Exception: return None
def age_h(t):
    try: return round((NOW - dt.datetime.fromisoformat(str(t).replace('Z', '+00:00'))).total_seconds() / 3600, 1)
    except Exception: return None
def days(n=14): return [(NOW - dt.timedelta(days=k)).strftime('%Y-%m-%d') for k in range(n - 1, -1, -1)]
D = J('today.json', {}) or {}; G = J('global.json', {}) or {}; I = D.get('issues', [])
# ---------- 기사 DB(국내·해외): 날짜·시간별 ----------
def art_db(sub):
    per_day, per_hour, secs, srcs, last = {}, collections.Counter(), collections.Counter(), collections.Counter(), None
    for d in sorted(os.listdir(os.path.join(ROOT, 'db', sub))) if os.path.isdir(os.path.join(ROOT, 'db', sub)) else []:
        n = 0
        for f in sorted(glob.glob(os.path.join(ROOT, 'db', sub, d, '*.json.gz'))):
            L = load(f, []) or []; n += len(L); hh = os.path.basename(f)[:2]
            if d == TODAY:
                per_hour[hh] += len(L)
                for a in L: secs[a.get('sec') or a.get('cat') or '기타'] += 1; srcs[(a.get('src') or 'global').split('_')[0]] += 1
            last = f'{d}T{os.path.basename(f)[:2]}:{os.path.basename(f)[2:4]}:00+09:00'
        per_day[d] = n
    return per_day, per_hour, secs, srcs, last
kd, kh, ksec, ksrc, klast = art_db('articles'); gd, gh, gsec, _, glast = art_db('articles_global')
# ---------- 실행 이력 ----------
RL = J('runlog.json', []) or []
runs_day = collections.Counter(r['at'][:10] for r in RL)
fails_day = collections.Counter()
for r in RL: fails_day[r['at'][:10]] += r.get('fail', 0) or 0
last24 = [r for r in RL if age_h(r['at']) is not None and age_h(r['at']) <= 24]
# ---------- 각 수집처 ----------
S = []
def src(key, name, group, total=None, today=None, unit='건', updated=None, max_age=None, daily=None, target=None, target_label='', note='', extra=None):
    a = age_h(updated) if updated else None
    lv = 'ok' if a is None or max_age is None or a <= max_age else ('warn' if a <= max_age * 2 else 'bad')
    if total in (0, None) and today in (0, None): lv = 'bad' if max_age else lv
    S.append(dict(key=key, name=name, group=group, total=total, today=today, unit=unit, updated=updated, age_h=a, max_age_h=max_age, level=lv,
                  daily=daily or [], target=target, target_label=target_label, note=note, extra=extra or {}))
dd = days(14)
src('news_kr', '국내 기사(네이버·구글뉴스)', '뉴스', total=sum(kd.values()), today=kd.get(TODAY, 0), updated=klast, max_age=2,
    daily=[[d, kd.get(d, 0)] for d in dd], target=3000, target_label='하루 3,000건', note='30분마다 포털 많이 본·댓글 많은 기사, 구글뉴스 섹션',
    extra=dict(by_source=dict(ksrc), first_day=min(kd) if kd else None))
src('news_global', '해외 기사(번역 포함)', '뉴스', total=sum(gd.values()), today=gd.get(TODAY, 0), updated=G.get('updated') or glast, max_age=3,
    daily=[[d, gd.get(d, 0)] for d in dd], target=300, target_label='하루 300건', note='BBC·Guardian·NYT 등 RSS → 한국어 번역',
    extra=dict(issues=len(G.get('issues', [])), trends=len(G.get('trends', [])), translated=sum(1 for i in G.get('issues', []) if i.get('title_ko'))))
DU = {os.path.basename(f)[:-5]: load(f, {}) for f in sorted(glob.glob(os.path.join(ROOT, 'db', 'dupes', '*.json')))}
dt_ = DU.get(TODAY) or (DU[max(DU)] if DU else {})
src('dupes', '같은 내용 기사 묶음', '뉴스', total=sum((x or {}).get('groups', 0) for x in DU.values()), today=(DU.get(TODAY) or {}).get('groups', 0), unit='묶음',
    updated=NOW.isoformat() if DU else None, daily=[[d, (DU.get(d) or {}).get('groups', 0)] for d in dd], note='제목이 사실상 같은 기사를 묶고 요약 보관',
    extra=dict(dup_ratio=round((dt_.get('dup_articles', 0) - dt_.get('groups', 0)) / max(1, dt_.get('articles', 1)) * 100, 1) if dt_ else None, unique_today=dt_.get('unique_after')))
AR = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(ROOT, 'archive', '20*.json')))
restored = 0
for d in AR[-400:]:
    x = J(f'archive/{d}.json', {}) or {}
    if x.get('restored'): restored += 1
src('archive', '날짜별 TOP 10 아카이브', '뉴스', total=len(AR), today=1 if TODAY in AR else 0, unit='일', updated=D.get('updated'), max_age=2,
    target=365, target_label='최근 1년', note='실시간 수집 + 과거 날짜 복원(구글뉴스 기간 검색)', extra=dict(first=AR[0] if AR else None, restored=restored, live=len(AR) - restored))
src('trends', '실시간 검색어', '뉴스', total=None, today=len(D.get('trends', [])), unit='개', updated=D.get('updated'), max_age=2, note='구글 트렌드 한국')
# 인물
PI = J('db/people/index.json', {}) or {}; PS = J('db/people/state.json', {}) or {}; PR = J('db/people/registry_stats.json', {}) or {}; DISC = J('db/people/discovered.json', {}) or {}
act = collections.Counter((v.get('last') or '')[:10] for v in PI.values())
src('people', '인물 타임라인(기사↔인물 연결)', '인물', total=sum(v.get('c', 0) for v in PI.values()), today=act.get(TODAY, 0), unit='회 언급', updated=PS.get('updated'), max_age=3,
    daily=[[d, act.get(d, 0)] for d in dd], target=5000, target_label='연결된 인물 5,000명',
    note='인물 명부와 모든 기사를 맞춰 인물별 월별 파일에 누적', extra=dict(people=len(PI), registry=PR.get('total') or PS.get('registry'), registry_by_kind=PR.get('by_kind'),
    discovered=sum(1 for v in DISC.values() if v.get('ok')), candidates=len(DISC)))
EI = J('db/entities/index.json', {}) or {}
first_day = collections.Counter((v.get('first') or '')[:10] for v in EI.values())
src('entities', '화제 인물·기업·장소 DB', '인물', total=sum(v.get('n', 0) for v in EI.values()), today=len(D.get('entities', [])), unit='건',
    updated=D.get('updated'), max_age=2, extra=dict(entities=len(EI), with_visual=sum(1 for e in D.get('entities', []) if (e.get('visual') or {}).get('url'))), note='오늘 화제 대상 + 과거 기사 백필')
src('reporters', '기자 프로필', '인물', today=len(D.get('reporters', []) or []), unit='명', updated=D.get('updated'), note='네이버 기사 기자 카드')
POL = raw('politicians', 'index.json') or {}
src('politicians', '정치인 DB(국회의원)', '인물', total=POL.get('count'), today=POL.get('current'), unit='명', updated=(POL.get('updated') or '') + 'T09:00:00+09:00' if POL.get('updated') else None,
    max_age=48, target=POL.get('count'), target_label='역대 전원', extra=dict(bills=POL.get('bills'), votes=POL.get('votes_rows')), note='열린국회정보: 역대 의원·법안·표결')
HS = raw('history', 'h/runs.json'); HST = None
try: HST = HS[-1] if isinstance(HS, list) and HS else (HS or {})
except Exception: HST = None
if HST: src('history', '과거 연표(인물·이슈 연도별 기사)', '인물', total=HST.get('items_total'), today=HST.get('targets_done_run'), unit='건', updated=HST.get('at') and HST['at'] + ('+09:00' if '+' not in HST['at'] else ''),
            max_age=12, target=HST.get('targets_total'), target_label=f"대상 {HST.get('targets_total', 0):,}개 중 완료 {HST.get('targets_full', 0):,}", note='구글뉴스 연도별 검색',
            extra=dict(targets_full=HST.get('targets_full'), targets_total=HST.get('targets_total'), sec_per_target=HST.get('sec_per_target')))
LG = raw('legal', 'v1/index.json') or {}
if LG: src('legal', '법률(판례·법령·입법예고)', '공공', total=sum(v for v in (LG.get('counts') or {}).values() if isinstance(v, int)) or None, unit='건', updated=LG.get('updated'), max_age=36,
            extra={k: v for k, v in (LG.get('counts') or {}).items()}, note='법제처·국회 공개 자료')
# 시장·공공
M = D.get('market') or []
src('market', '증시·환율·원자재 시세', '시장', today=len(M), unit='종목', updated=max((m.get('at') or '' for m in M), default=None) or D.get('updated'), max_age=26, target=14, target_label='14개 지표')
MD = J('market_detail.json', {}) or {}
src('market_detail', '마켓 상세(차트·투자자·환율 고시)', '시장', today=len(MD.get('items', {})), unit='지표', updated=MD.get('updated'), max_age=3,
    extra=dict(with_long=sum(1 for v in MD.get('items', {}).values() if v.get('long')), with_deal=sum(1 for v in MD.get('items', {}).values() if v.get('deal'))))
ES = J('ecos_series.json', {}) or {}
src('ecos', '한국은행 경제지표(ECOS)', '시장', total=sum(len(v.get('data', [])) for v in (ES.get('series') or {}).values()), today=len(ES.get('series') or {}), unit='개 시계열',
    updated=ES.get('updated'), max_age=30, target=21, target_label='21개 지표')
ST = J('gov/stocks.json', {}) or {}
src('stocks', '시가총액 상위 종목 일별 시세', '시장', total=sum(len(v) for v in (ST.get('days') or {}).values()), today=len(ST.get('names') or {}), unit='종목',
    updated=ST.get('updated'), max_age=30, extra=dict(days=len(ST.get('days') or {}), src=ST.get('src')))
AP = J('gov/apt.json', {}) or {}
src('apt', '서울 아파트 실거래', '공공', today=sum(len(v) for v in (AP.get('trade') or {}).values()) if isinstance(AP.get('trade'), dict) else None, unit='건', updated=AP.get('updated'), max_age=72, note='국토교통부(맥미니 수집)')
AL = J('gov/alerts.json', {}) or {}
src('alerts', '지진·기상특보', '공공', today=len(AL.get('quakes', [])) + len(AL.get('warnings', [])), unit='건', updated=AL.get('updated'), max_age=6, note='기상청(맥미니 수집)')
OF = J('official.json', {}) or {}
src('official', '공시(DART)·지표 요약', '공공', today=len(OF.get('dart', []) or []), unit='건', updated=OF.get('updated'), max_age=6)
# 콘텐츠
V = J('voice.json', {}) or {}
src('voice', '민심(블로그·카페)·영상', '콘텐츠', total=sum(r.get('n', 0) for r in V.get('issues', [])), today=len(V.get('issues', [])), unit='개 글', updated=V.get('updated'), max_age=3,
    extra=dict(videos=sum(len(r.get('videos') or []) for r in V.get('issues', [])), by_platform=dict(sum((collections.Counter(r.get('by') or {}) for r in V.get('issues', [])), collections.Counter()))))
FI = J('fun/index.json', []) or []
src('fun', '놀면서 배우기(퀴즈·만평·카드뉴스)', '콘텐츠', total=len(FI) if isinstance(FI, list) else None, today=1 if (J('fun.json', {}) or {}).get('date') == TODAY else 0, unit='일',
    updated=(J('fun.json', {}) or {}).get('updated'), max_age=30)
DB = J('diag_db.json', {}) or {}; R = DB.get('report') or (J('status.json', {}) or {}).get('db') or {}
src('media', '썸네일(WebP 보관)', '콘텐츠', total=R.get('media_files'), today=R.get('media_new'), unit='장', updated=D.get('updated'), max_age=2,
    extra=dict(mb=R.get('media_mb'), hd=R.get('media_hd'), rejected_small=R.get('media_small_rejected'), removed=R.get('media_removed')))
NU = J('db/naver_usage.json', {}) or {}
src('naver_api', '네이버 검색 API 사용', '외부 한도', total=(NU.get('month') or {}).get(NOW.strftime('%Y-%m')), today=(NU.get('day') or {}).get(TODAY), unit='회',
    target=280000, target_label='월 28만 회 한도', daily=[[d, (NU.get('day') or {}).get(d, 0)] for d in dd])
LL = D.get('llm') or {}
src('llm', 'AI 분석(요약·쟁점)', '외부 한도', today=sum(1 for i in I if i.get('ai')), unit='개 이슈', updated=D.get('updated'), target=len(I) or 10, target_label='TOP 10 전부',
    extra=dict(calls=LL.get('calls'), model=LL.get('model'), errors=len(LL.get('errors') or []), overlay=(LL.get('overlay') or {}).get('matched')))
# ---------- 분류 ----------
cat_today = collections.Counter(i.get('category') for i in I)
cat_week = collections.Counter()
for d in AR[-7:]:
    for i in (J(f'archive/{d}.json', {}) or {}).get('issues', []): cat_week[i.get('category')] += 1
cat_year = collections.Counter()
for d in AR[-365:]:
    for i in (J(f'archive/{d}.json', {}) or {}).get('issues', []): cat_year[i.get('category')] += 1
# ---------- 품질(정합성·가치) ----------
PL = load('assets/press/index.json', {}) or {}
srcs = [s for i in I for s in (i.get('sources') or [])]
def pct(a, b): return round(a / b * 100, 1) if b else None
Q = [
    dict(key='thumb', name='이슈 출처 기사 사진 확보율', value=pct(sum(1 for s in srcs if s.get('img')), len(srcs)), target=90, note=f'{len(srcs)}건 중'),
    dict(key='summary', name='TOP 10 요약 채움', value=pct(sum(1 for i in I if i.get('summary')), len(I)), target=100, note='포털 소개글 기준(화면은 대체 문장으로 채움)'),
    dict(key='ai', name='TOP 10 AI 분석', value=pct(sum(1 for i in I if (i.get('ai') or {}).get('deep')), len(I)), target=100),
    dict(key='flow', name='TOP 10 사건 흐름', value=pct(sum(1 for i in I if i.get('flow')), len(I)), target=100),
    dict(key='opinion', name='TOP 10 댓글 여론', value=pct(sum(1 for i in I if i.get('opinion')), len(I)), target=80),
    dict(key='catconf', name='분류 신뢰도(평균)', value=round(sum((i.get('cat_conf') or 0) for i in I) / max(1, len(I)) * 100, 1) if I else None, target=70),
    dict(key='entvis', name='화제 대상 사진·로고 확보', value=pct(sum(1 for e in D.get('entities', []) if (e.get('visual') or {}).get('url') or (e.get('wiki') or {}).get('thumb')), len(D.get('entities', []))), target=90),
    dict(key='presslogo', name='언론사 로고 확보', value=pct(sum(1 for s in srcs if s.get('press') in PL), len(srcs)), target=95),
    dict(key='dedupe', name='중복 기사 비율(낮을수록 좋음)', value=(S[[x['key'] for x in S].index('dupes')]['extra'] or {}).get('dup_ratio'), target=None, note='같은 내용 기사가 전체에서 차지하는 비율'),
    dict(key='translate', name='해외 이슈 번역률', value=pct(sum(1 for i in G.get('issues', []) if i.get('title_ko')), len(G.get('issues', []))), target=100),
    dict(key='registry', name='인물 명부 대비 연결된 인물', value=pct(len(PI), PR.get('total') or 0), target=None, note='뉴스에 실제 등장해 타임라인이 생긴 비율'),
    dict(key='runs', name='최근 24시간 수집 실행', value=len(last24), target=48, unit='회', note='30분마다 = 하루 48회'),
]
for q in Q:
    v, t = q.get('value'), q.get('target')
    q['level'] = 'ok' if v is None or t is None or (v >= t if q['key'] != 'dedupe' else True) else ('warn' if v >= t * .7 else 'bad')
# ---------- 속도 ----------
speed = dict(per_hour_today=sorted(kh.items()), runs_today=runs_day.get(TODAY, 0), runs_24h=len(last24),
             avg_new_per_run=round(sum(kd.get(d, 0) for d in dd[-7:]) / max(1, sum(runs_day.get(d, 0) for d in dd[-7:])), 1),
             avg_daily_7=round(sum(kd.get(d, 0) for d in dd[-7:]) / 7, 1), runs_daily=[[d, runs_day.get(d, 0), fails_day.get(d, 0)] for d in dd])
# ---------- 문제 목록 ----------
P = []
for s in S:
    if s['level'] != 'ok': P.append(dict(level=s['level'], what=s['name'], why=(f"{s['age_h']}시간째 갱신 없음(기준 {s['max_age_h']}시간)" if s['age_h'] is not None else '데이터 없음')))
for q in Q:
    if q['level'] != 'ok': u = q.get('unit', '%'); P.append(dict(level=q['level'], what=q['name'], why=f"{q['value']}{u} — 목표 {q['target']}{u}"))
if LL.get('errors'): P.append(dict(level='warn', what='AI 분석', why='; '.join(str(e)[:80] for e in LL['errors'][:2])))
P.sort(key=lambda p: 0 if p['level'] == 'bad' else 1)
out = dict(updated=NOW.isoformat(timespec='minutes'), problems=P, sources=S, quality=Q, speed=speed,
           categories=dict(today=dict(cat_today), week=dict(cat_week), year=dict(cat_year), sections_today=dict(ksec), global_today=dict(gsec)),
           totals=dict(articles_kr=sum(kd.values()), articles_global=sum(gd.values()), archive_days=len(AR), people=len(PI), registry=PR.get('total'), entities=len(EI)))
json.dump(out, open(os.path.join(ROOT, 'stats.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('stats: sources', len(S), 'problems', len(P), 'quality', [(q['key'], q['value']) for q in Q])
