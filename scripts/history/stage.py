#!/usr/bin/env python3
"""단계형 타임라인 수집기 (사용자 요청 t57u) — '지금 회자되는 주제'부터 시작해 성숙하면 기간을 넓힘.
  1) 최근 7일·30일 일별 TOP10(data 브랜치 archive/)에서 화제 주제를 뽑음(대표 인물·키워드로 묶음)
  2) 주제마다 단계별로 구글뉴스 기간 검색:  S0 최근 7일 → S1 30일 → S2 1년 → S3 3년 → S4 5년
  3) '성숙' 기준을 넘으면 다음 단계로 확장(아래 MATURE). 기준 미달이면 그 단계에서 머물고,
     다시 TOP10에 오르면 재시도. 2번 시도해도 미달이면 '휴면'(다시 화제가 될 때 깨어남).
저장: history 브랜치  h/i/t_<id>.json.gz (hist.py 와 같은 압축 형식 → /history/ 이슈 연표 탭에 그대로 보임)
      h/topics.json (주제·단계·성숙도), h/index.json 에 k='i', stage 필드 추가
news-history 워크플로에서 hist.py run 보다 먼저, 회차 시간 중 앞 STAGE_MIN 분만 사용 → 기존 인물·이슈 백필은 남은 시간에 이어서 진행.
사용: python stage.py <history 폴더> <분>
"""
import sys, os, json, time, re, datetime, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
OUT = sys.argv[1]; MIN = float(sys.argv[2]) if len(sys.argv) > 2 else 12
sys.argv = [sys.argv[0], OUT, 'lib']  # hist.py 를 라이브러리로만 불러옴(명령 실행 없음)
import hist  # noqa: E402
RAW = 'https://raw.githubusercontent.com/pyw31337/news/data/archive/'
TODAY = datetime.date.today()
STAGES = [('7일', 7), ('30일', 30), ('1년', 365), ('3년', 365 * 3), ('5년', 365 * 5)]
# 성숙 기준: (기사 수, 기사가 있는 서로 다른 날짜 수) — 둘 다 넘어야 다음 단계로 확장
MATURE = [(12, 3), (30, 8), (60, 20), (120, 40), (200, 60)]
MAX_TOPICS = 60
STOP = set('필요 대통령 정부 오늘 관련 이번 지난 사람 우리 경우 문제 상황 결과 발표 진행 가능 예정 사실 기자 뉴스 단독 속보 영상 사진 논란 확인'.split())

def fetch(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': hist.UA}), timeout=30) as f: return json.loads(f.read())
    except Exception: return None

def topics_from_archive():
    """최근 30일 TOP10 → 주제(대표 인물 또는 핵심 키워드 2개)별 등장 일수·최고 순위·최근 7일 여부"""
    T = {}
    for k in range(30):
        d = (TODAY - datetime.timedelta(days=k)).isoformat()
        j = fetch(RAW + d + '.json')
        if not j: continue
        for i in j.get('issues', []):
            ents = [e for e in (i.get('entities') or []) if len(e) >= 2][:2]
            kws = [w for w in (i.get('keywords') or []) if len(w) >= 2 and w not in ents and w not in STOP and not any(w in e or e in w for e in ents)][:2]
            if not (ents or kws): continue
            head = ents[0] if ents else kws[0]
            rest = [w for w in ents[1:] + kws if w != head]
            q = f'"{head}" {rest[0]}' if rest else f'"{head}"'
            tid = 't_' + hist.H(head)
            t = T.setdefault(tid, {'id': tid, 'n': head, 'q': q, 'title': i.get('title', ''), 'cat': i.get('category', ''), 'days': [], 'best': 99, 'heat': 0})
            if d not in t['days']: t['days'].append(d)
            t['best'] = min(t['best'], i.get('rank', 10)); t['heat'] += (11 - i.get('rank', 10)) * (2 if k < 7 else 1)
            t['hot7'] = t.get('hot7') or k < 7
    return T

def windows_for(stage, done_days):
    """해당 단계 기간을 아직 안 받은 구간만 (분기 단위, 최근 30일 이하는 주 단위) 반환"""
    span = STAGES[stage][1]; prev = STAGES[stage - 1][1] if stage else 0
    a = TODAY - datetime.timedelta(days=span); b = TODAY - datetime.timedelta(days=prev) + datetime.timedelta(days=1)
    step = 7 if span <= 30 else 91
    out = []; x = a
    while x < b:
        y = min(b, x + datetime.timedelta(days=step)); out.append((x.isoformat(), y.isoformat())); x = y
    return [w for w in out if w[0] not in done_days or stage <= 1]

def run():
    os.makedirs(f'{OUT}/h/i', exist_ok=True)
    S = hist.jl(f'{OUT}/h/topics.json', {}); IX = hist.jl(f'{OUT}/h/index.json', {})
    fresh = topics_from_archive()
    for tid, t in fresh.items():
        s = S.setdefault(tid, {'stage': 0, 'tries': 0, 'win': [], 'state': 'new'})
        s.update({k: t[k] for k in ('n', 'q', 'title', 'cat', 'best', 'heat')}); s['days'] = sorted(set(s.get('days', []) + t['days']))[-60:]
        s['hot7'] = bool(t.get('hot7')); s['seen'] = TODAY.isoformat()
        if s['state'] == 'dormant' and s['hot7']: s['state'] = 'active'; s['tries'] = 0  # 다시 화제 → 깨어남
    # 우선순위: ① 최근 7일 화제 ② 낮은 단계(아직 타임라인이 얇은 것) ③ 화제 열기
    act = [s for s in S.values() if s.get('state') != 'dormant' and s.get('stage', 0) < len(STAGES)]
    act.sort(key=lambda s: (not s.get('hot7'), s.get('stage', 0) > 1, -s.get('heat', 0)))
    act = act[:MAX_TOPICS]
    end = time.time() + MIN * 60; req = [0]; done = 0; fails = 0
    for s in act:
        if time.time() > end: break
        tid = [k for k, v in S.items() if v is s][0]; st = s['stage']
        path = f'{OUT}/h/i/{tid}.json.gz'
        items = {hist.nt(x['t']): x for x in hist.unpack(hist.gzr(path))}
        try:
            for a, b in windows_for(st, s['win']):
                if time.time() > end: break
                r = hist.gnews(s['q'], a, b); req[0] += 1; time.sleep(0.6)
                for it in r:
                    k = hist.nt(it['t'])
                    if k and k not in items: items[k] = it
                if a not in s['win']: s['win'].append(a)
        except Exception as e:
            print('실패', s['n'], e); fails += 1; time.sleep(20)
            if fails >= 4: print('연속 실패 → 단계 수집 중단'); break
            continue
        fails = 0
        L = sorted(items.values(), key=lambda x: x['d'])
        span = STAGES[st][1]; since = (TODAY - datetime.timedelta(days=span)).isoformat()
        inwin = [x for x in L if x['d'] >= since]; nd = len({x['d'] for x in inwin})
        need_n, need_d = MATURE[st]; s['n_items'] = len(L); s['n_days'] = len({x['d'] for x in L})
        s['maturity'] = round(min(1, len(inwin) / need_n) * 50 + min(1, nd / need_d) * 50)
        if len(inwin) >= need_n and nd >= need_d:
            s['stage'] = st + 1; s['tries'] = 0; s['state'] = 'active' if st + 1 < len(STAGES) else 'complete'
        else:
            s['tries'] = s.get('tries', 0) + 1; s['state'] = 'active'
            if s['tries'] >= 2 and not s.get('hot7'): s['state'] = 'dormant'
        doc = hist.pack({'k': 'i', 'n': s['n'], 'occ': ''}, L); doc['stage'] = s['stage']; doc['q'] = s['q']; hist.gzw(path, doc)
        ys = sorted({x['d'][:4] for x in L})
        IX[tid] = {'k': 'i', 'n': s['n'], 'occ': '', 'c': len(L), 'y': [ys[0], ys[-1]] if ys else None, 'cc': {}, 'stage': s['stage'], 'src': 'trend', 'mat': s['maturity']}
        done += 1
    hist.jw(f'{OUT}/h/topics.json', S); hist.jw(f'{OUT}/h/index.json', IX)
    by = {}
    for s in S.values(): by[s.get('stage', 0)] = by.get(s.get('stage', 0), 0) + 1
    m = {'at': datetime.datetime.now().isoformat(timespec='minutes'), 'kind': 'stage', 'topics': len(S), 'done_run': done, 'requests': req[0], 'by_stage': by}
    log = hist.jl(f'{OUT}/h/runs.json', []); log.append(m); hist.jw(f'{OUT}/h/runs.json', log[-200:]); print(json.dumps(m, ensure_ascii=False))

if __name__ == '__main__': run()
