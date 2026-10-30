#!/usr/bin/env python3
"""같은 내용 기사 묶기(30분마다, collect): data/db/dupes/YYYY-MM-DD.json
수집한 기사(db/articles, db/articles_global)에서 제목이 사실상 같은 기사(통신사 기사를 여러 매체가 그대로 실은 경우,
'[속보]'·'(종합)' 같은 꼬리만 다른 경우)를 한 묶음으로 만들고, 2건 이상인 묶음마다 무엇을 말하는 기사인지 요약을 함께 보관한다.
- 같은 기사 판단: 괄호·기호를 뺀 제목의 두 글자 조각이 60% 이상 겹침(화면의 관련 기사 묶기와 같은 기준, assets/ds.js dedupe)
- 요약: 묶음 안에서 가장 정보가 많은(다른 제목과 가장 많이 겹치고 너무 짧지 않은) 제목을 대표로, 공통 핵심어와 함께
- 오늘·어제 두 날짜만 매번 다시 계산(기록은 날짜별 파일로 계속 쌓임)"""
import os, re, json, gzip, glob, collections, datetime as dt
ROOT = 'data'; OUT = os.path.join(ROOT, 'db', 'dupes'); os.makedirs(OUT, exist_ok=True)
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST)
TAIL = re.compile(r'\[[^\]]*\]|\([^)]*\)|【[^】]*】|<[^>]*>')
norm = lambda t: re.sub(r'[^가-힣A-Za-z0-9]', '', TAIL.sub('', t or ''))
def bi(t):
    n = norm(t); return {n[k:k + 2] for k in range(len(n) - 1)}
def sim(a, b): return len(a & b) / max(1, min(len(a), len(b)))
STOP = set('속보 단독 종합 기자 뉴스 영상 사진 오늘 이번 관련'.split())
def toks(t): return [w for w in re.findall(r'[가-힣A-Za-z0-9]{2,}', TAIL.sub(' ', t or '')) if w not in STOP]
def day_files(d):
    return sorted(glob.glob(os.path.join(ROOT, 'db', 'articles', d, '*.json.gz')) + glob.glob(os.path.join(ROOT, 'db', 'articles_global', d, '*.json.gz')))
def run(d):
    arts, seen = [], set()
    for f in day_files(d):
        try: L = json.load(gzip.open(f, 'rt', encoding='utf-8'))
        except Exception: continue
        for a in L:
            if a.get('url') and a['url'] not in seen and a.get('title'): seen.add(a['url']); arts.append(a)
    if not arts: return None
    G = []   # [대표 bigram, 기사들]
    idx = collections.defaultdict(list)   # 첫 bigram 몇 개로 후보만 비교(빠르게)
    for a in arts:
        b = bi(a['title'])
        if len(b) < 4: continue
        cand = {gi for x in list(b)[:12] for gi in idx[x]}
        g = next((G[gi] for gi in cand if sim(G[gi][0], b) >= .6), None)
        if g: g[1].append(a)
        else:
            G.append([b, [a]]); gi = len(G) - 1
            for x in b: idx[x].append(gi)
    out = []
    for b, L in G:
        if len(L) < 2: continue
        presses = sorted({a.get('press') or '' for a in L} - {''})
        rep = max(L, key=lambda a: (sum(sim(bi(a['title']), bi(o['title'])) for o in L), min(len(norm(a['title'])), 40)))
        cnt = collections.Counter(w for a in L for w in set(toks(a['title'])))
        kw = [w for w, n in cnt.most_common(8) if n >= max(2, len(L) // 2)][:5]
        out.append(dict(title=TAIL.sub('', rep['title']).strip(), n=len(L), presses=presses, keywords=kw,
                        summary=f"{len(presses) or len(L)}개 매체가 같은 내용으로 보도: {TAIL.sub('', rep['title']).strip()}" + (f" (핵심어: {', '.join(kw)})" if kw else ''),
                        first=min((a.get('t') or '') for a in L), items=[dict(url=a['url'], press=a.get('press') or '', title=a['title'], t=a.get('t') or '') for a in L][:30]))
    out.sort(key=lambda g: -g['n'])
    res = dict(date=d, articles=len(arts), groups=len(out), dup_articles=sum(g['n'] for g in out), unique_after=len(arts) - sum(g['n'] - 1 for g in out), items=out)
    json.dump(res, open(os.path.join(OUT, d + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    return res
for d in [(NOW - dt.timedelta(days=k)).strftime('%Y-%m-%d') for k in (1, 0)]:
    r = run(d)
    if r: print(f"dedupe {d}: 기사 {r['articles']} → 같은 내용 묶음 {r['groups']}개({r['dup_articles']}건), 고유 {r['unique_after']}건")
