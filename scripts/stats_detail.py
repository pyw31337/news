#!/usr/bin/env python3
"""관리자 현황판 메뉴별 상세 데이터(30분마다, collect 끝부분): data/stats_detail.json
뉴스 기사(국내·해외: 출처·언론사·섹션별 수집, 처리 단계별 깔때기, 오늘의 이슈별 분석·연계·요약),
인물, 장소·기업·사건, 카드뉴스·놀이·민심, AI·봇(실행처별 업무, 워크플로 실행 기록, 맥미니), 수집 일정(회차별 수집량).
공개 데이터만 담는다(키·토큰·내부 경로 없음). GitHub 실행 기록은 Actions 안에서 GITHUB_TOKEN으로만 읽는다."""
import os, re, json, gzip, glob, collections, datetime as dt, urllib.request
ROOT = 'data'; KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST); TODAY = NOW.strftime('%Y-%m-%d')
REPO = 'pyw31337/news'
def load(p, d=None):
    try:
        if p.endswith('.gz'): return json.load(gzip.open(p))
        return json.load(open(p))
    except Exception: return d
def J(p, d=None): return load(os.path.join(ROOT, p), d)
def days(n): return [(NOW - dt.timedelta(days=k)).strftime('%Y-%m-%d') for k in range(n - 1, -1, -1)]
dd = days(30); D7 = set(dd[-7:])
C = collections.Counter
def top(c, n=30): return [[k, v] for k, v in c.most_common(n) if k]
D = J('today.json', {}) or {}; I = D.get('issues', []) or []; G = J('global.json', {}) or {}
RL = J('runlog.json', []) or []
# ---------- 국내 기사 ----------
KIND = {'naver_popularDay': '네이버 많이 본', 'naver_popularMemo': '네이버 댓글 많은', 'naver_commentDay': '네이버 댓글 많은', 'google': '구글뉴스', 'naver_search': '네이버 검색'}
def kind(s): s = s or '기타'; return KIND.get(s) or ('구글뉴스' if s.startswith('google') else '네이버 ' + s.split('_', 1)[-1] if s.startswith('naver') else s)
def scan(sub, glob_=False):
    o = dict(daily=[], kinds=[], presses=[], press_n=[], hours_today=[], press_today=C(), press_7d=C(), cat_today=C(), files_today=0)
    for d in dd:
        n, k, pr = 0, C(), set()
        for f in sorted(glob.glob(os.path.join(ROOT, 'db', sub, d, '*.json.gz'))):
            L = load(f, []) or []; n += len(L)
            if d == TODAY: o['hours_today'].append([os.path.basename(f)[:4], len(L)]); o['files_today'] += 1
            for a in L:
                p = a.get('press') or ''; pr.add(p)
                k[(a.get('cat') or '기타') if glob_ else kind(a.get('src'))] += 1
                if d == TODAY: o['press_today'][p] += 1; o['cat_today'][a.get('cat') or a.get('sec') or '기타'] += 1
                if d in D7: o['press_7d'][p] += 1
        o['daily'].append([d, n]); o['kinds'].append([d, dict(k)]); o['press_n'].append([d, len(pr - {''})])
    o['press_today'] = top(o['press_today'], 40); o['press_7d'] = top(o['press_7d'], 40); o['cat_today'] = dict(o['cat_today'])
    return o
KR = scan('articles'); GL = scan('articles_global', True)
GL['translated'] = sum(1 for i in G.get('issues', []) if i.get('title_ko')); GL['issues'] = len(G.get('issues', [])); GL['trends'] = len(G.get('trends', []))
# ---------- 처리 단계(오늘): 수집 → 중복 묶기 → 이슈 후보 → TOP 10 → 분석·연계·요약 ----------
DU = J(f'db/dupes/{TODAY}.json', {}) or {}
last = RL[-1] if RL else {}
srcs = [s for i in I for s in (i.get('sources') or [])]
funnel = [
    ['오늘 수집한 국내 기사', KR['daily'][-1][1], '네이버 많이 본·댓글 많은 기사, 구글뉴스 섹션(30분마다)'],
    ['같은 내용을 묶은 뒤 고유 기사', DU.get('unique_after'), f"같은 내용 {DU.get('dup_articles', 0):,}건을 {DU.get('groups', 0):,}개 묶음으로 요약"],
    ['이슈 후보(비슷한 기사 무리)', (last.get('stats') or {}).get('clusters'), '마지막 수집 회차 기준'],
    ['오늘의 TOP 10 이슈', len(I), '많이 본·댓글·언론사 수·검색 화제도로 점수'],
    ['이슈에 붙인 출처 기사', len(srcs), f"이슈당 평균 {len(srcs) / max(1, len(I)):.0f}건"],
    ['AI가 분석한 이슈', sum(1 for i in I if i.get('ai')), '요약·쟁점'],
    ['깊게 보기까지 만든 이슈', sum(1 for i in I if (i.get('ai') or {}).get('deep')), '배경·전망 해설'],
]
summ = dict(sources=len(srcs), timeline=sum(len(i.get('timeline') or []) for i in I), issues=len(I),
            leads=sum(len(i.get('leads') or []) for i in I), dupe_in=DU.get('dup_articles'), dupe_groups=DU.get('groups'),
            kr_today=KR['daily'][-1][1], unique=DU.get('unique_after'))
links = dict(entities=sum(len(i.get('entities') or []) for i in I), keywords=sum(len(i.get('keywords') or []) for i in I),
             past=sum(len(i.get('past') or []) for i in I), gallery=sum(len(i.get('gallery') or []) for i in I),
             flow_days=sum(len(i.get('flow') or []) for i in I), opinion=sum(1 for i in I if i.get('opinion')),
             related=len(D.get('links') or []) if isinstance(D.get('links'), list) else len(D.get('links') or {}),
             reporters=len(D.get('reporters') or []), trends_linked=sum(1 for i in I if i.get('trend')))
issues = [dict(rank=i.get('rank'), id=i.get('id'), title=i.get('title'), cat=i.get('category'), conf=i.get('cat_conf'), presses=i.get('presses'),
               sources=len(i.get('sources') or []), timeline=len(i.get('timeline') or []), mentions=i.get('mentions'), naver=i.get('naver'),
               score=round(i.get('score') or 0, 1), q=i.get('q'), gallery=len(i.get('gallery') or []), flow=len(i.get('flow') or []),
               ents=len(i.get('entities') or []), past=len(i.get('past') or []),
               ai=bool(i.get('ai')), deep=bool((i.get('ai') or {}).get('deep')), opinion=bool(i.get('opinion')), summary=bool(i.get('summary')),
               portals=dict(C(s.get('portal') or '기타' for s in i.get('sources') or [])), kinds=dict(C(s.get('kind') or '기타' for s in i.get('sources') or [])))
          for i in I]
# 지난 30일 TOP 10 처리 결과(아카이브)
arch = []
for d in dd:
    x = J(f'archive/{d}.json', {}) or {}; L = x.get('issues', []) if d != TODAY else I
    arch.append([d, len(L), sum(1 for i in L if i.get('ai')), sum(len(i.get('sources') or []) for i in L), bool(x.get('restored'))])
# ---------- 인물 ----------
PI = J('db/people/index.json', {}) or {}; PR = J('db/people/registry_stats.json', {}) or {}; DISC = J('db/people/discovered.json', {}) or {}
first = C((v.get('first') or '')[:10] for v in PI.values()); lastd = C((v.get('last') or '')[:10] for v in PI.values())
people = dict(total=len(PI), mentions=sum(v.get('c', 0) for v in PI.values()), registry=PR.get('total'), by_kind=PR.get('by_kind') or {},
              by_field=dict(C(v.get('k') or '기타' for v in PI.values())),
              top=[[v.get('n'), v.get('c', 0), v.get('k'), v.get('d'), v.get('last')] for v in sorted(PI.values(), key=lambda v: -v.get('c', 0))[:40]],
              recent=[[v.get('n'), v.get('c', 0), v.get('k'), v.get('last')] for v in sorted(PI.values(), key=lambda v: v.get('last') or '', reverse=True)[:30]],
              new_daily=[[d, first.get(d, 0)] for d in dd], active_daily=[[d, lastd.get(d, 0)] for d in dd],
              discovered=sum(1 for v in DISC.values() if v.get('ok')), candidates=len(DISC),
              reporters=[[r.get('name'), r.get('press'), r.get('n') or len(r.get('articles') or [])] for r in (D.get('reporters') or [])[:30]])
POLI = None
try: POLI = json.load(urllib.request.urlopen(f'https://raw.githubusercontent.com/{REPO}/politicians/index.json', timeout=10))
except Exception: pass
if POLI: people['politicians'] = {k: POLI.get(k) for k in ('count', 'current', 'bills', 'votes_rows', 'updated')}
# ---------- 장소·기업·사건(화제 대상) ----------
EI = J('db/entities/index.json', {}) or {}
TYPE = {'person': '인물', 'org': '기업·기관', 'place': '장소', 'event': '사건', 'country': '나라', 'product': '제품', 'work': '작품'}
efirst = C((v.get('first') or '')[:10] for v in EI.values()); eseen = C((v.get('last_seen') or '')[:10] for v in EI.values())
ents = dict(total=len(EI), articles=sum(v.get('n', 0) for v in EI.values()), by_type={TYPE.get(k, k): v for k, v in C(v.get('type') or '기타' for v in EI.values()).items()},
            top=[[k, TYPE.get(v.get('type'), v.get('type')), v.get('n', 0), v.get('first'), v.get('last_seen')] for k, v in sorted(EI.items(), key=lambda x: -x[1].get('n', 0))[:40]],
            today=[[e.get('name'), TYPE.get(e.get('type'), e.get('type')), round(e.get('score') or 0), bool((e.get('visual') or {}).get('url') or (e.get('wiki') or {}).get('thumb')), (e.get('wiki') or {}).get('desc')] for e in D.get('entities', [])],
            new_daily=[[d, efirst.get(d, 0)] for d in dd], seen_daily=[[d, eseen.get(d, 0)] for d in dd],
            backfilled=sum(1 for v in EI.values() if v.get('backfill')))
# ---------- 카드뉴스·놀이·민심 ----------
FJ = J('fun.json', {}) or {}; FI = J('fun/index.json', {}) or {}
fdays = FI.get('days') if isinstance(FI, dict) else FI
fdays = sorted(fdays or [], key=lambda x: x if isinstance(x, str) else x.get('date', ''))
fun_daily = []
for d in dd:
    x = J(f'fun/{d}.json', None)
    fun_daily.append([d, dict(quiz=len(x.get('quiz') or []), comics=len(x.get('comics') or []), decks=len(x.get('decks') or []),
                              cards=sum(len(k.get('cards') or k.get('slides') or []) for k in (x.get('decks') or []) if isinstance(k, dict))) if x else {}])
V = J('voice.json', {}) or {}
by_plat = C()
for r in V.get('issues', []): by_plat.update(r.get('by') or {})
content = dict(fun_days=len(fdays), fun_today=dict(quiz=len(FJ.get('quiz') or []), comics=len(FJ.get('comics') or []), decks=len(FJ.get('decks') or []),
                    cards=sum(len(k.get('cards') or k.get('slides') or []) for k in (FJ.get('decks') or []) if isinstance(k, dict)), updated=FJ.get('updated')),
               fun_daily=fun_daily, decks=[[k.get('title') or k.get('name'), len(k.get('cards') or k.get('slides') or [])] for k in (FJ.get('decks') or []) if isinstance(k, dict)],
               voice=dict(issues=len(V.get('issues', [])), posts=sum(r.get('n', 0) for r in V.get('issues', [])), videos=sum(len(r.get('videos') or []) for r in V.get('issues', [])),
                          ai=sum(1 for r in V.get('issues', []) if r.get('ai')), by_platform=dict(by_plat), updated=V.get('updated'),
                          rows=[[r.get('title'), r.get('n', 0), len(r.get('videos') or []), bool(r.get('ai')), r.get('by') or {}] for r in V.get('issues', [])]),
               words=len(D.get('words') or []), trends=len(D.get('trends') or []), trends_foreign=len(D.get('trends_foreign') or []))
# ---------- 수집 일정(회차별) ----------
runs = [dict(at=r.get('at'), ev=r.get('event'), naver=(r.get('stats') or {}).get('naver'), google=(r.get('stats') or {}).get('google'),
             clusters=(r.get('stats') or {}).get('clusters'), presses=(r.get('stats') or {}).get('presses'), naver_search=(r.get('stats') or {}).get('naver_search'),
             issues=r.get('issues'), entities=r.get('entities'), glob=r.get('global_articles'), ok=r.get('ok'), fail=r.get('fail'), ai=r.get('ai')) for r in RL[-200:]]
heat = {}  # 날짜×시간 수집 실행 수
for r in RL:
    try: t = dt.datetime.fromisoformat(r['at']).astimezone(KST)
    except Exception: continue
    k = t.strftime('%Y-%m-%d')
    if k in dd: heat.setdefault(k, [0] * 24)[t.hour] += 1
# 워크플로(봇) 목록과 일정: 저장소의 .github/workflows/*.yml
WF = []
for f in sorted(glob.glob('.github/workflows/*.yml')):
    s = open(f, encoding='utf-8').read()
    name = (re.search(r'^name:\s*(.+)$', s, re.M) or [None, os.path.basename(f)])[1].strip()
    crons = re.findall(r"cron:\s*'([^']+)'\s*(?:#\s*(.*))?", s)
    desc = ' '.join(x.strip('# ').strip() for x in re.findall(r'^#.*$', s, re.M)[:2])
    WF.append(dict(file=os.path.basename(f), name=name, crons=[[c, (n or '').strip()] for c, n in crons], desc=desc))
def gh(path):
    tok = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
    h = {'Accept': 'application/vnd.github+json', 'User-Agent': 'newsboard-stats'}
    if tok: h['Authorization'] = 'Bearer ' + tok
    return json.load(urllib.request.urlopen(urllib.request.Request('https://api.github.com/repos/' + REPO + path, headers=h), timeout=15))
wf_runs = {}
try:
    since = (NOW - dt.timedelta(days=7)).strftime('%Y-%m-%d')
    R = []
    for w in WF:  # 워크플로마다 따로(시간마다 도는 봇이 많아 전체 목록으로는 일부만 보임)
        for pg in (1, 2, 3, 4):
            x = gh(f"/actions/workflows/{w['file']}/runs?per_page=100&page={pg}&created=%3E%3D{since}").get('workflow_runs', []); R += x
            if len(x) < 100: break
    for r in R:
        k = os.path.basename(r.get('path') or '') or r.get('name')
        w = wf_runs.setdefault(k, dict(runs=0, ok=0, fail=0, cancel=0, mins=[], last=None, last_ok=None, daily=C(), recent=[]))
        st = r.get('run_started_at') or r.get('created_at'); end = r.get('updated_at')
        w['runs'] += 1; w['daily'][dt.datetime.fromisoformat(st.replace('Z', '+00:00')).astimezone(KST).strftime('%Y-%m-%d')] += 1
        if r.get('conclusion') == 'success': w['ok'] += 1
        elif r.get('conclusion') in ('failure', 'timed_out', 'startup_failure'): w['fail'] += 1
        elif r.get('conclusion') in ('cancelled', 'skipped'): w['cancel'] += 1  # 다음 실행과 겹쳐 취소·건너뜀(실패 아님)
        try: w['mins'].append((dt.datetime.fromisoformat(end.replace('Z', '+00:00')) - dt.datetime.fromisoformat(st.replace('Z', '+00:00'))).total_seconds() / 60)
        except Exception: pass
        if not w['last'] or st > w['last']['at']: w['last'] = dict(at=st, status=r.get('status'), conclusion=r.get('conclusion'), event=r.get('event'))
        if len(w['recent']) < 12: w['recent'].append([st, r.get('conclusion') or r.get('status'), round(w['mins'][-1], 1) if w['mins'] else None])
    for w in wf_runs.values():
        m = w.pop('mins'); w['avg_min'] = round(sum(m) / len(m), 1) if m else None; w['daily'] = [[d, w['daily'].get(d, 0)] for d in dd[-7:]]
except Exception as e:
    wf_runs = {'_error': str(e)[:120]}
for w in WF: w['live'] = wf_runs.get(w['file'])
# ---------- 맥미니(로컬)와 그 밖의 봇 ----------
OV = J('overlay/latest.json', {}) or {}
ov_days = []
for d in dd:
    x = J(f'overlay/{d}.json', None)
    ov_days.append([d, dict(issues=len(x.get('issues') or []), trends=len(x.get('trends') or []), words=len(x.get('words') or [])) if x else {}])
BR = J('briefs.json', {}) or {}; AP = J('gov/apt.json', {}) or {}; AL = J('gov/alerts.json', {}) or {}; ST = J('gov/stocks.json', {}) or {}; OF = J('official.json', {}) or {}
AIL = {os.path.basename(f)[:-5]: load(f, {}) or {} for f in glob.glob(os.path.join(ROOT, 'db', 'ai_usage', '*.json'))}
local = dict(overlay=dict(updated=OV.get('updated'), issues=len(OV.get('issues') or []), trends=len(OV.get('trends') or []), words=len(OV.get('words') or []),
                          flows=sum(1 for i in OV.get('issues') or [] if i.get('flow')), daily=ov_days, matched=((D.get('llm') or {}).get('overlay') or {}).get('matched')),
             briefs=dict(source=BR.get('source'), updated=BR.get('updated'), items=len(BR.get('items') or [])),
             apt=dict(updated=AP.get('updated'), rows=sum(len(v) for v in (AP.get('trade') or {}).values()) if isinstance(AP.get('trade'), dict) else None),
             alerts=dict(updated=AL.get('updated'), quakes=len(AL.get('quakes') or []), warnings=len(AL.get('warnings') or [])),
             ai={k: dict(days=len(v), calls=sum(x.get('calls', 0) for x in v.values()), today=(v.get(TODAY) or {}).get('calls', 0)) for k, v in AIL.items() if k.startswith('macmini')})
# 하는 일 목록(누가·어디서·언제·무엇을·어디에 저장). live 값은 위 기록에서 채움
def age(t):
    try: return round((NOW - dt.datetime.fromisoformat(str(t).replace('Z', '+00:00'))).total_seconds() / 3600, 1)
    except Exception: return None
BOTS = [
    dict(name='뉴스 수집·분석', where='GitHub Actions', when='30분마다(매시 7·37분) + 매일 06:40 심층', what='네이버·구글뉴스 수집 → 같은 내용 묶기 → TOP 10 선정 → 사진·인물·흐름·여론 → AI 요약·깊게 보기 → 사이트 배포', out='data 브랜치 db/·archive/, 사이트', updated=D.get('updated'), wf='collect.yml'),
    dict(name='해외 뉴스', where='GitHub Actions(수집과 함께)', when='30분마다', what='BBC·Guardian·NYT 등 RSS 수집 → 한국어 번역 → 해외 이슈·검색어', out='global.json, db/articles_global/', updated=G.get('updated'), wf='collect.yml'),
    dict(name='인물 타임라인', where='GitHub Actions', when='30분마다 새 기사 + 매주 일요일 03:23 전체 재정리', what='인물 명부(국회의원·위키데이터·뉴스에서 찾은 인물)와 모든 기사를 맞춰 인물별 월별 기록', out='db/people/', updated=(J('db/people/state.json', {}) or {}).get('updated'), wf='people.yml'),
    dict(name='과거 연표 백필', where='GitHub Actions', when='매시 15분(회당 약 42분)', what='인물·반복 이슈의 연도별 과거 기사 수집', out='history 브랜치', wf='history.yml'),
    dict(name='과거 TOP 10 복원', where='GitHub Actions', when='매시 52분', what='실시간 수집 전 날짜의 주요 이슈 10개 복원(최근 1년)', out='archive/', wf='archive-backfill.yml'),
    dict(name='인물 아카이브', where='GitHub Actions → Cloudflare D1', when='매일 02:40', what='우선순위 순 400명씩 타임라인·관계 갱신', out='Cloudflare D1(newsboard-archive)', wf='archive.yml'),
    dict(name='법률 자료', where='GitHub Actions', when='3시간마다', what='판례·법령·입법예고 수집', out='legal 브랜치', wf='legal.yml'),
    dict(name='정치인 ↔ 뉴스 연결', where='GitHub Actions', when='6시간마다', what='정치인 DB와 뉴스 자동 연결', out='politicians 브랜치', wf='politicians.yml'),
    dict(name='전체 백업', where='GitHub Actions → Cloudflare R2', when='매주 월요일 04:41', what='모든 데이터 브랜치를 통째로 보관', out='R2 newsboard-backup', wf='backup.yml'),
    dict(name='무료 한도 점검', where='GitHub Actions', when='매일 08:17', what='저장소·D1·R2 사용량 80% 넘으면 알림', out='GitHub 이슈', wf='quota.yml'),
    dict(name='자체 점검', where='GitHub Actions', when='매주 월요일 09:00', what='사이트·데이터 기본 점검', out='—', wf='selfcheck.yml'),
    dict(name='로컬 AI 분석', where='맥미니(Apple 온디바이스 모델)', when='매일 03:30', what='TOP 10 깊은 분석·흐름(네이버 검색)·검색어·용어를 로컬 AI로 만들어 사이트에 덧입힘', out='overlay/', updated=OV.get('updated')),
    dict(name='보도자료', where='맥미니', when='수집 때마다', what='재정경제부 보도자료(공공데이터포털)', out='briefs.json', updated=BR.get('updated')),
    dict(name='아파트 실거래', where='맥미니', when='하루 1회', what='국토교통부 서울 아파트 실거래', out='gov/apt.json', updated=AP.get('updated')),
    dict(name='지진·기상특보', where='맥미니', when='수시', what='기상청 지진·특보(국내 긴급만 화면에)', out='gov/alerts.json', updated=AL.get('updated')),
    dict(name='국회 정치인 수집', where='맥미니(한국 IP 필요)', when='하루 1회', what='열린국회정보: 역대 의원·법안·표결', out='politicians 브랜치', updated=(POLI or {}).get('updated')),
    dict(name='종목 시세', where='GitHub Actions', when='6시간마다', what='시가총액 상위 종목 일별 시세(네이버 금융)', out='gov/stocks.json', updated=ST.get('updated')),
    dict(name='공시', where='GitHub Actions', when='수집 때마다', what='DART 공시·지표 요약', out='official.json', updated=OF.get('updated')),
    dict(name='로그인·동기화·백업 서버', where='Cloudflare Worker', when='항상 + 매일 04:10 백업', what='로그인, 내 서재 기기 간 동기화, 순위표, 독자 반응 집계, 인물 아카이브 API', out='Cloudflare D1·R2'),
]
for b in BOTS:
    b['age_h'] = age(b.get('updated')) if b.get('updated') else None
    if b.get('wf') and isinstance(wf_runs.get(b['wf']), dict): b['live'] = {k: wf_runs[b['wf']][k] for k in ('runs', 'ok', 'fail', 'cancel', 'avg_min', 'last')}
out = dict(updated=NOW.isoformat(timespec='minutes'),
           news=dict(kr=KR, glob=GL, funnel=funnel, summary=summ, links=links, issues=issues, archive=arch),
           people=people, entities=ents, content=content,
           schedule=dict(runs=runs, heat=[[d, heat.get(d, [0] * 24)] for d in dd[-14:]], workflows=WF),
           bots=BOTS, local=local)
json.dump(out, open(os.path.join(ROOT, 'stats_detail.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('stats_detail: issues', len(issues), 'people', people['total'], 'entities', ents['total'], 'workflows', len(WF), 'gh', 'ok' if '_error' not in wf_runs else wf_runs['_error'])
