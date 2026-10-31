#!/usr/bin/env python3
"""오늘의 OX·퀴즈(레벨별 · 한국어/영어): data/quiz.json + 날짜별 누적 data/fun/quiz/YYYY-MM-DD.json, data/fun/quiz/index.json
- 레벨 1 기초(사실 확인·뉴스 용어) · 2 중급(원인·맥락·숫자 비교) · 3 고급(배경 지식·의미 해석).
- AI(하루 오전·오후 2번, 캐시): 오늘 국내·해외 이슈의 '주어진 사실'만으로 문제를 만들고, 자료에 없는 숫자가 들어간 문제는 버림.
- 규칙 문제(항상): 시세(오른/내린 지수), 기준금리, 검수 사전 용어(같은 분야 뜻으로만 오답 구성) — AI가 없어도 매일 새 문제.
- 하루 동안 새로 만든 문제는 그날 파일에 쌓아 두고(중복 제외), 날짜별로 계속 누적."""
import json, os, re, sys, random, hashlib, datetime as dt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glossary import G as GL
ROOT = os.environ.get('FUN_DATA') or os.path.join(os.path.dirname(__file__), '..', 'data')
P = lambda n: os.path.join(ROOT, n)
def J(n, d=None):
    try: return json.load(open(P(n), encoding='utf-8'))
    except Exception: return d
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST)
D = J('today.json', {}) or {}; G = J('global.json', {}) or {}; ES = J('ecos_series.json', {}) or {}
if not D.get('issues'): print('quiz: no today.json'); sys.exit(0)
DATE = D.get('date') or NOW.strftime('%Y-%m-%d'); HALF = 'am' if NOW.hour < 13 else 'pm'
rnd = random.Random(DATE + HALF)
hk = lambda *a: hashlib.md5('|'.join(map(str, a)).encode()).hexdigest()[:10]
# fun.py의 AI 호출(쿼터 관리·장부 포함)을 그대로 씀
os.environ.setdefault('FUN_AI_SEC', '150')
import importlib.util
def load_llm():
    """fun.py 전체를 다시 돌리지 않도록 llm() 부분만 가져옴"""
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fun.py'), encoding='utf-8').read()
    a = src.index('# ---------- AI(선택)'); b = src.index('def bat(w):')
    g = {'__file__': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fun.py')}
    exec(compile('import json, os, re, sys, random, hashlib, subprocess, urllib.request, urllib.error, time, datetime\n'
                 'sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import ai_usage, llm_quota\n'
                 'ROOT=%r\nai_usage.setup(ROOT); llm_quota.setup(ROOT)\nOLD={}\n' % ROOT + src[a:b], 'fun_llm', 'exec'), g)
    g['SYS'] = ('너는 뉴스 퀴즈 출제자다. 주어진 자료의 사실만으로 문제를 만들고, 자료에 없는 숫자·인용·사실은 절대 쓰지 마라. '
                '특정인을 조롱하거나 정치적으로 한쪽에 치우치지 말고 중립적으로 써라. 출력은 지정한 JSON만.')
    g['CACHE'] = (J('quiz.json', {}) or {}).get('_cache', {})
    return g
# ---------- 자료 ----------
def sents(t): return [s.strip() for s in re.split(r'(?<=[.!?다요])\s+', t or '') if 12 < len(s.strip()) < 220]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sensitive import ok_issue   # 부고·범죄·재난 기사는 퀴즈로 내지 않음
facts = []
for i in [x for x in D['issues'][:12] if ok_issue(x)][:10]:
    ai = i.get('ai') or {}
    txt = sents(ai.get('deep'))[:3] or (i.get('leads') or [])[:3] or (i.get('summary') or [])[:2]
    facts.append(dict(id=i['id'], scope='kr', cat=i.get('category', ''), title=i['title'], facts=[re.sub(r'\s+', ' ', x)[:220] for x in txt]))
for i in [x for x in (G.get('issues') or [])[:8] if ok_issue(x)][:6]:
    facts.append(dict(id=i['id'], scope='global', cat=i.get('category', '세계'), title=i.get('title_ko') or i['title'], title_en=i['title'],
                      facts=[x for x in [i.get('summary_ko', '')[:240]] if x], facts_en=[i.get('summary', '')[:240]]))
ALL = ' '.join(f['title'] + ' ' + ' '.join(f['facts']) + ' ' + f.get('title_en', '') + ' ' + ' '.join(f.get('facts_en', [])) for f in facts)
nums = lambda s: set(re.findall(r'\d+(?:[.,]\d+)?', s or ''))
# 한국어 받침에 맞는 조사
def bat(w): c = w[-1]; return '가' <= c <= '힣' and (ord(c) - 0xAC00) % 28 != 0
eun = lambda w: w + ('은' if bat(w) else '는'); ira = lambda w: w + ('이라는' if bat(w) else '라는')
# 영어 문장 속 한국어(사전 뜻 등)는 무료 번역으로 채움(캐시: data/tr_en_cache.json)
import urllib.request, urllib.parse
TE_P = P('tr_en_cache.json'); TE = J('tr_en_cache.json', {}) or {}
def tr_en(texts):
    miss = [t for t in dict.fromkeys(texts) if t and t not in TE]
    for k in range(0, len(miss), 20):
        grp = miss[k:k + 20]; marked = '\n\n'.join(('<<<S%03d>>>\n%s' % (n, t)) if n else t for n, t in enumerate(grp))
        try:
            raw = urllib.request.urlopen(urllib.request.Request('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t', urllib.parse.urlencode({'q': marked}).encode(),  # 긴 한국어는 GET 주소 길이 초과(400) → POST
                                         headers={'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'}), timeout=15).read().decode('utf-8', 'replace')
            parts = re.split(r'<<<S\d{3}>>>\s*', ''.join(x[0] for x in json.loads(raw)[0] if x[0]))
            if len(parts) == len(grp):
                for t, v in zip(grp, parts): TE[t] = v.strip()
        except Exception as e: print('tr_en', str(e)[:80])
    return {t: TE.get(t, '') for t in texts}
IMG = {i['id']: i.get('image') for i in (D.get('issues') or []) + (G.get('issues') or []) if i.get('image')}
Q = []
def add(level, kind, ko, en, answer, exp_ko, exp_en, choices_ko=None, choices_en=None, ref=None, cat='', src='rule', scope='kr'):
    """scope: kr=국내 탭(한국어), global=해외 탭(기본 한국어 · '영어 원문 보기'면 영어 원문 문장)"""
    q = dict(id='q' + hk(ko, en, answer), level=level, kind=kind, cat=cat, q=dict(ko=ko, en=en), answer=answer,
             exp=dict(ko=exp_ko, en=exp_en), ref=ref, src=src, date=DATE, scope=scope)
    if kind == 'mc': q['choices'] = dict(ko=choices_ko, en=choices_en)
    if ref and IMG.get(ref): q['img'] = IMG[ref]   # 카드 위 썸네일(근거 이슈 사진)
    # 영어 문장에 번역 안 된 한국어가 남았으면 영어 모드에서는 내지 않음(“용어” 따옴표 속 짧은 한국어는 허용)
    en_all = re.sub(r'“[가-힣 ]{1,10}”', '', en + ' ' + exp_en + ' ' + ' '.join(choices_en or []))
    q['en_ok'] = not re.search(r'[가-힣]', en_all)
    Q.append(q)
# ---------- 1) AI 문제(레벨별) ----------
g = load_llm()
KF = [f for f in facts if f['scope'] == 'kr']
prompt = ('아래는 오늘의 국내 뉴스 이슈와 각 이슈에서 확인된 사실이다. 이것만 근거로 퀴즈 18문제를 만들어라.\n'
          '- 레벨 1(기초) 6문제: 무슨 일이 있었는지 사실 확인, 뉴스에 나온 용어의 뜻.\n'
          '- 레벨 2(중급) 6문제: 왜 그런 일이 생겼는지, 관련 주체·숫자 비교, 맥락.\n'
          '- 레벨 3(고급) 6문제: 배경 제도·개념, 이 일이 갖는 의미(자료가 뒷받침하는 범위에서).\n'
          '- 각 레벨에서 OX 4문제(answer: true/false, 참·거짓을 섞어라) + 4지선다 2문제(answer: 0~3 정답 번호).\n'
          '- 거짓 문장은 그럴듯하게 바꾸되 자료와 분명히 다르게. 너무 쉬운(뻔한) 문제·말장난 금지.\n'
          '- 모든 문장은 한국어(ko)와 자연스러운 영어(en)를 함께. 해설(exp)은 왜 정답인지 1~2문장.\n'
          '- ref: 근거 이슈 id.\n'
          'JSON: {"q":[{"level":1,"kind":"ox","ko":"...","en":"...","answer":true,"exp_ko":"...","exp_en":"...","ref":"id"},'
          '{"level":2,"kind":"mc","ko":"...","en":"...","choices_ko":["","","",""],"choices_en":["","","",""],"answer":2,"exp_ko":"...","exp_en":"...","ref":"id"}]}\n\n'
          + '\n'.join('[%s · %s] %s\n  사실: %s' % (f['id'], f['cat'], f['title'], ' / '.join(f['facts'])) for f in KF))
res = g['llm']('qz:' + hk(DATE, HALF, *[f['id'] for f in KF]), prompt, 7000) or {}
ids = {f['id']: f for f in facts}; bad = 0
for x in res.get('q', []) if isinstance(res, dict) else []:
    try:
        lv, kind = int(x.get('level')), x.get('kind'); ko, en = str(x.get('ko', '')).strip(), str(x.get('en', '')).strip()
        if lv not in (1, 2, 3) or kind not in ('ox', 'mc') or not (8 < len(ko) < 200) or not (8 < len(en) < 260): raise ValueError('shape')
        text = ko + ' ' + ' '.join(x.get('choices_ko') or [])
        if nums(text) - nums(ALL): raise ValueError('num')          # 자료에 없는 숫자 → 버림
        if kind == 'ox':
            if not isinstance(x.get('answer'), bool): raise ValueError('ans')
            add(lv, 'ox', ko, en, x['answer'], str(x.get('exp_ko', ''))[:200], str(x.get('exp_en', ''))[:260], ref=x.get('ref'), cat=(ids.get(x.get('ref')) or {}).get('cat', ''), src='ai')
        else:
            ck, ce, a = x.get('choices_ko'), x.get('choices_en'), x.get('answer')
            if not (isinstance(ck, list) and isinstance(ce, list) and len(ck) == 4 == len(ce) and isinstance(a, int) and 0 <= a < 4 and len(set(ck)) == 4): raise ValueError('mc')
            add(lv, 'mc', ko, en, a, str(x.get('exp_ko', ''))[:200], str(x.get('exp_en', ''))[:260], [str(c)[:80] for c in ck], [str(c)[:100] for c in ce], ref=x.get('ref'), cat=(ids.get(x.get('ref')) or {}).get('cat', ''), src='ai')
    except Exception: bad += 1
# 해외: 영어 원문 기사로 영어 문제를 쓰고 한국어 번역을 함께(영어 학습용 · 뉴욕타임스형)
GFX = [dict(id=i['id'], cat=i.get('category', '세계'), title=i['title'], summary=i.get('summary', '')[:500], heads=[x['title'] for x in (i.get('sources') or [])[:5]]) for i in (G.get('issues') or [])[:8]]
GALL = ' '.join(f['title'] + ' ' + f['summary'] + ' ' + ' '.join(f['heads']) for f in GFX)
gp = ('You write a daily English news quiz for Korean adults learning English, like a New York Times learning quiz. Use ONLY the facts below (real English headlines and summaries). '
      'Write 18 questions in natural, newspaper-style English:\n'
      '- level 1 (Basic) 6: what happened; meaning of a word as used in a headline.\n'
      '- level 2 (Intermediate) 6: why/how, who is involved, comparisons, context.\n'
      '- level 3 (Advanced) 6: background concepts, implications supported by the facts, nuance of wording.\n'
      '- per level: 4 true/false (answer true/false, mix both) + 2 multiple choice (4 options, answer 0-3).\n'
      '- Never invent numbers, quotes or facts. False statements must be plausible but clearly contradicted by the facts.\n'
      '- Give a faithful Korean translation of every question/choice (ko, choices_ko) and a 1–2 sentence explanation in both languages. ref = story id.\n'
      'JSON: {"q":[{"level":1,"kind":"ox","en":"","ko":"","answer":true,"exp_en":"","exp_ko":"","ref":"id"},{"level":2,"kind":"mc","en":"","ko":"","choices_en":["","","",""],"choices_ko":["","","",""],"answer":1,"exp_en":"","exp_ko":"","ref":"id"}]}\n\n'
      + '\n'.join('[%s · %s] %s\n  Summary: %s\n  Other headlines: %s' % (f['id'], f['cat'], f['title'], f['summary'], ' | '.join(f['heads'])) for f in GFX))
gres = g['llm']('gq:' + hk(DATE, HALF, *[f['id'] for f in GFX]), gp, 7000) if GFX else {}
gids = {f['id']: f for f in GFX}
for x in (gres or {}).get('q', []) if isinstance(gres, dict) else []:
    try:
        lv, kind = int(x.get('level')), x.get('kind'); ko, en = str(x.get('ko', '')).strip(), str(x.get('en', '')).strip()
        if lv not in (1, 2, 3) or kind not in ('ox', 'mc') or not (8 < len(en) < 260) or not re.search(r'[가-힣]', ko): raise ValueError('shape')
        if nums(en + ' ' + ' '.join(x.get('choices_en') or [])) - nums(GALL): raise ValueError('num')
        cat = (gids.get(x.get('ref')) or {}).get('cat', '세계')
        if kind == 'ox':
            if not isinstance(x.get('answer'), bool): raise ValueError('ans')
            add(lv, 'ox', ko, en, x['answer'], str(x.get('exp_ko', ''))[:220], str(x.get('exp_en', ''))[:280], ref=x.get('ref'), cat=cat, src='ai', scope='global')
        else:
            ck, ce, a = x.get('choices_ko'), x.get('choices_en'), x.get('answer')
            if not (isinstance(ck, list) and isinstance(ce, list) and len(ck) == 4 == len(ce) and isinstance(a, int) and 0 <= a < 4 and len(set(ce)) == 4): raise ValueError('mc')
            add(lv, 'mc', ko, en, a, str(x.get('exp_ko', ''))[:220], str(x.get('exp_en', ''))[:280], [str(c)[:90] for c in ck], [str(c)[:110] for c in ce], ref=x.get('ref'), cat=cat, src='ai', scope='global')
    except Exception: bad += 1
# ---------- 2) 규칙 문제(항상 맞음) ----------
M = {m['name']: m for m in D.get('market') or []}
NAME_EN = {'KOSPI': 'KOSPI', 'KOSDAQ': 'KOSDAQ', 'S&P 500': 'S&P 500', 'NASDAQ': 'Nasdaq', '미국 USD': 'USD/KRW', '금': 'gold', 'WTI 원유': 'WTI crude', '비트코인': 'Bitcoin'}
mk = [m for m in M.values() if m['name'] in NAME_EN and m.get('dir') in ('RISING', 'FALLING')]
rnd.shuffle(mk)
for m in mk[:2]:
    up = m['dir'] == 'RISING'; claim_up = rnd.random() < .5; n = m['name']
    rd = {'KOSPI': '코스피', 'KOSDAQ': '코스닥', 'S&P 500': 'S&P 500(오백)', 'NASDAQ': '나스닥', '미국 USD': '달러 환율', '금': '금', 'WTI 원유': 'WTI 원유', '비트코인': '비트코인'}[n]
    add(1, 'ox', '가장 최근 거래일에 %s 전날보다 %s.' % (eun(rd).replace(rd, n) if not rd.endswith(')') else n + ('은' if bat('백') else '는'), '올랐다' if claim_up else '내렸다'),
        'On the latest trading day, %s %s from the previous day.' % (NAME_EN[n], 'rose' if claim_up else 'fell'), up == claim_up,
        '%s %s (%s%%)였어요.' % (n, m['price'], m['rate']), '%s closed at %s (%s%%).' % (NAME_EN[n], m['price'], m['rate']), cat='경제', scope='kr' if n in ('KOSPI', 'KOSDAQ', '미국 USD') else 'global')
# 해외 탭: 미국·세계 지수(영어 원문 그대로 · 한국어 번역)
GM = [m for m in (G.get('markets') or []) if m.get('group') in ('us', 'world') and m.get('dir') in ('RISING', 'FALLING')]
rnd.shuffle(GM)
for m in GM[:3]:
    up = m['dir'] == 'RISING'; claim = rnd.random() < .5
    add(1, 'ox', '가장 최근 거래일에 %s 지수는 전날보다 %s.' % (m['name_ko'], '올랐다' if claim else '내렸다'), 'The %s %s on its latest trading day.' % (m['name'], 'rose' if claim else 'fell'), up == claim,
        '%s %s (%+.2f%%)로 마감했어요.' % (m['name_ko'], m['price'], m['rate']), 'It closed at %s (%+.2f%%).' % (m['price'], m['rate']), cat='경제', scope='global')
s = (ES.get('series') or {}).get('base')
if s and s.get('data'):
    cur = s['data'][-1][1]; opts = sorted({cur, cur + .25, cur - .25, cur + .5}); rnd.shuffle(opts)
    add(2, 'mc', '지금 한국은행 기준금리는 연 몇 %일까요?', 'What is the Bank of Korea’s current base rate?', opts.index(cur),
        '한국은행 경제통계(ECOS) 기준 연 %.2f%%예요.' % cur, 'It is %.2f%% a year, according to the Bank of Korea (ECOS).' % cur,
        ['%.2f%%' % o for o in opts], ['%.2f%%' % o for o in opts], cat='경제')
# 검수 사전 용어: 오늘 기사에 나온 말 → 같은 분야 다른 용어 뜻으로만 오답(엉뚱한 뜻이 섞이지 않게)
titles = ' '.join(i['title'] for i in D['issues']) + ' ' + ' '.join(x.get('title', '') for L in (D.get('sections') or {}).values() for x in L if isinstance(x, dict))
terms = [w for w in GL if w in titles][:6]
TW = tr_en([GL[w][0] for w in terms] + [v[0] for t, v in GL.items() if v[1] in {GL[w][1] for w in terms}] + terms)
en_ = lambda k: TW.get(k) or k
for k, w in enumerate(terms):
    mean, field, _ = GL[w]
    pool = [v[0] for t, v in GL.items() if t != w and v[1] == field] or [v[0] for t, v in GL.items() if t != w]
    rnd.shuffle(pool)
    if k % 2 == 0:
        ch = [mean] + pool[:3]; rnd.shuffle(ch)
        add(1 if k < 2 else 2, 'mc', '오늘 뉴스에 나온 ‘%s’의 뜻으로 알맞은 것은?' % w, 'Which is the correct meaning of the Korean news term “%s” (%s)?' % (w, en_(w)), ch.index(mean),
            '‘%s’%s “%s”%s 뜻이에요.' % (w, eun(w)[len(w):], mean, ira(mean)[len(mean):]), '“%s” (%s) means: %s.' % (w, en_(w), en_(mean)), ch, [en_(c) for c in ch], cat=field)
    else:
        truth = rnd.random() < .5; m = mean if truth else pool[0]
        add(2, 'ox', '‘%s’%s “%s”%s 뜻이다.' % (w, eun(w)[len(w):], m, ira(m)[len(m):]), 'The Korean term “%s” (%s) means: “%s”.' % (w, en_(w), en_(m)), truth,
            '‘%s’의 뜻은 “%s”예요.' % (w, mean), '“%s” (%s) means “%s”.' % (w, en_(w), en_(mean)), cat=field)
# ---------- 3) 하루 누적 + 날짜별 보관 ----------
os.makedirs(P('fun/quiz'), exist_ok=True)
day = J('fun/quiz/%s.json' % DATE, {}) or {}
have = {q['id'] for q in day.get('questions', [])}
merged = day.get('questions', []) + [q for q in Q if q['id'] not in have]
for k, q in enumerate(merged): q['n'] = k + 1
lv = {str(l): sum(1 for q in merged if q['level'] == l) for l in (1, 2, 3)}
day = dict(date=DATE, updated=NOW.isoformat(timespec='minutes'), levels=lv, questions=merged)
json.dump(day, open(P('fun/quiz/%s.json' % DATE), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
IX = J('fun/quiz/index.json', {}) or {}; IX.setdefault('days', {})
IX['days'][DATE] = dict(n=len(merged), levels=lv, ai=sum(1 for q in merged if q['src'] == 'ai'))
IX['days'] = dict(sorted(IX['days'].items())[-800:]); IX['total'] = sum(v['n'] for v in IX['days'].values()); IX['updated'] = day['updated']
json.dump(IX, open(P('fun/quiz/index.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(dict(list(TE.items())[-3000:]), open(TE_P, 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(dict(day, total=IX['total'], days=len(IX['days']), _cache=g['CACHE'] if len(g['CACHE']) < 8 else {}),
          open(P('quiz.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('quiz: new %d (ai %d, rule %d, dropped %d) · today %d %s · all days %d' % (len(Q), sum(1 for q in Q if q['src'] == 'ai'), sum(1 for q in Q if q['src'] == 'rule'), bad, len(merged), lv, IX['total']))
