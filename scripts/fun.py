"""놀면서 배우기 데이터: 오늘의 단어 퀴즈 · 설명 만화(4컷) · 카드뉴스 → data/fun.json
- 퀴즈: 정답은 검수된 사전(glossary.py)·위키 뜻에서 규칙으로 만들어 항상 맞음. AI는 해설 문장만 보탬.
- 만화: 이슈 사실(AI 요약·리드)에서 대본 생성. AI 대본은 숫자·길이·화자 검증을 통과할 때만 사용, 아니면 규칙 대본.
  그림은 브라우저에서 SVG(마스코트 누리·보리)로 그려 이미지 생성 비용 0.
- 카드뉴스: 기준금리(ECOS 시계열) + 여러 날 이어진 이슈(흐름 DB)로 5~8장 덱."""
import json, os, re, sys, random, hashlib, subprocess, urllib.request, urllib.error, time, datetime
sys.path.insert(0, os.path.dirname(__file__))
from glossary import G as GL
ROOT = os.environ.get('FUN_DATA') or os.path.join(os.path.dirname(__file__), '..', 'data')
P = lambda n: os.path.join(ROOT, n)
def J(n, d=None):
    try: return json.load(open(P(n), encoding='utf-8'))
    except Exception: return d
D = J('today.json', {}); ES = J('ecos_series.json', {}) or {}
OLD = J('fun.json', {}) or {}
if not D.get('issues'): print('fun: no today.json'); sys.exit(0)
DATE = D.get('date') or datetime.date.today().isoformat()
rnd = random.Random(DATE)
# ---------- AI(선택): Gemini 무료 등급 또는 맥미니 nbai. 하루 1~2회, 결과 캐시 ----------
ENDPOINT = os.environ.get('LLM_ENDPOINT') or 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
TOKEN = os.environ.get('LLM_API_KEY') or ''
MODELS = [m for m in dict.fromkeys([os.environ.get('LLM_MODEL') or 'gemini-3.8-flash'] + (os.environ.get('LLM_FALLBACKS') or 'gemini-3.5-flash-lite,gemini-flash-lite-latest').split(',')) if m]
APPLE = os.environ.get('LLM_BACKEND') == 'apple'
NBAI = os.environ.get('NBAI', os.path.expanduser('~/Developer/newsboard-local/bin/nbai'))
SYS = '너는 친절한 한국어 뉴스 해설가다. 주어진 자료의 사실만 쓰고, 자료에 없는 숫자·인용·사실은 절대 만들지 마라. 특정인을 조롱하거나 단정하지 말고 중립적으로 써라. 출력은 지정한 JSON만.'
CACHE = OLD.get('_cache', {})
def jparse(c):
    c = re.sub(r'^```(?:json)?|```$', '', c.strip()).strip(); a, b = c.find('{'), c.rfind('}')
    return json.loads(c[a:b + 1])
def llm(key, prompt, maxtok=1500):
    if key in CACHE: return CACHE[key]
    out = None
    try:
        if APPLE and os.path.exists(NBAI):
            r = subprocess.run([NBAI, SYS, str(maxtok)], input=prompt, capture_output=True, text=True, timeout=240)
            if not r.returncode: out = jparse(r.stdout)
        elif TOKEN:
            for m in MODELS:
                body = json.dumps({'model': m, 'temperature': 0.3, 'max_tokens': maxtok, 'response_format': {'type': 'json_object'},
                                   'messages': [{'role': 'system', 'content': SYS}, {'role': 'user', 'content': prompt}]}).encode()
                for a in range(2):
                    try:
                        r = urllib.request.urlopen(urllib.request.Request(ENDPOINT, body, {'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'}), timeout=60)
                        out = jparse(json.loads(r.read())['choices'][0]['message']['content']); break
                    except urllib.error.HTTPError as e:
                        if e.code in (429, 500, 502, 503, 504) and a == 0: time.sleep(8); continue
                        break
                    except Exception: break
                if out: break
    except Exception as e: print('fun llm:', str(e)[:120])
    if out: CACHE[key] = out
    return out
def bat(w):
    c = w[-1]
    return '가' <= c <= '힣' and (ord(c) - 0xAC00) % 28 != 0
eun = lambda w: w + ('은' if bat(w) else '는')
ira = lambda w: w + ('이라는' if bat(w) else '라는')
hk = lambda *a: hashlib.md5('|'.join(map(str, a)).encode()).hexdigest()[:12]

# ---------- 기사 제목 풀 ----------
ARTS = []
for i in D['issues']:
    for s in (i.get('sources') or []) + (i.get('timeline') or []): ARTS.append(dict(title=s.get('title', ''), url=s.get('url', ''), press=s.get('press', ''), issue=i['id']))
    for f in i.get('flow') or []:
        for x in f.get('items', []): ARTS.append(dict(title=x.get('title', ''), url=x.get('url', ''), press=x.get('press', ''), issue=i['id']))
for sec in (D.get('sections') or {}).values():
    for x in sec: ARTS.append(dict(title=x.get('title', ''), url=x.get('url', ''), press=x.get('press', ''), issue=''))
def examples(w, n=2):
    seen, out = set(), []
    for a in ARTS:
        t = re.sub(r'\s+', ' ', a['title']).strip()
        if w in t and t not in seen: seen.add(t); out.append(a)
        if len(out) >= n: break
    return out
iss_of = {i['id']: i for i in D['issues']}

# ---------- 1) 오늘의 단어 퀴즈 ----------
WORDS = []
for w, (mean, field, rel) in GL.items():
    ex = examples(w, 3)
    if ex: WORDS.append(dict(word=w, mean=mean, field=field, related=rel, examples=ex, src='사전', hits=sum(w in a['title'] for a in ARTS)))
have = {w['word'] for w in WORDS}
# 위키 단어는 AI가 '어려운 말'로 고른 것만(뜻이 기사 맥락과 다를 수 있는 일상어는 제외)
for w in D.get('words') or []:
    if w['word'] in have or not w.get('ai'): continue
    ex = examples(w['word'], 3)
    if ex and w.get('easy'): WORDS.append(dict(word=w['word'], mean=w['easy'].rstrip('.'), field='오늘의 말', related=[], examples=ex, src='위키백과', hits=w.get('count', 1), url=(w.get('wiki') or {}).get('url', '')))
WORDS.sort(key=lambda x: -x['hits'])
WORDS = WORDS[:8]
if len(WORDS) < 5:  # 오늘 기사에 사전 단어가 적으면 기본 뉴스 용어로 채움(예문 없음)
    for w in ['기소', '기준금리', '탄핵', '공시', '환율', '영장', '고발', '추경']:
        if len(WORDS) >= 6: break
        if w not in {x['word'] for x in WORDS}: m, f, r = GL[w]; WORDS.append(dict(word=w, mean=m, field=f, related=r, examples=[], src='사전', hits=0))
# AI 해설(선택): 왜 오늘 나왔는지 한 문장. 뜻 자체는 검수 사전을 따름
ai = llm('wx:' + hk(DATE, *[w['word'] for w in WORDS]),
         '아래 단어마다 오늘 기사 제목을 근거로 "오늘 뉴스에서는 ~" 형식의 한 문장(40자 안팎) 맥락 설명과, 헷갈리기 쉬운 점 한 문장을 써라. 뜻은 주어진 뜻을 바꾸지 마라.\n' +
         '\n'.join('- %s (뜻: %s) 기사: %s' % (w['word'], w['mean'], ' / '.join(e['title'] for e in w['examples'][:2])) for w in WORDS) +
         '\nJSON: {"words":[{"word":"단어","context":"...","tip":"..."}]}', 1200)
am = {x.get('word'): x for x in (ai or {}).get('words', []) if isinstance(x, dict)}
for w in WORDS:
    a = am.get(w['word']) or {}
    ok = lambda s: isinstance(s, str) and 5 < len(s) < 120 and not (set(re.findall(r'\d+', s)) - set(re.findall(r'\d+', ' '.join(e['title'] for e in w['examples']) + w['mean'])))
    w['context'] = a.get('context') if ok(a.get('context')) else (('오늘 “%s” 같은 기사에 나왔어요.' % w['examples'][0]['title'][:40]) if w['examples'] else '뉴스에 자주 나오는 말이에요.')
    w['tip'] = a.get('tip') if ok(a.get('tip')) else ''
    w['ai'] = bool(a)
Q = []
def other(w, k=3):
    pool = [x for x in WORDS if x['word'] != w['word']] or []
    extra = [dict(word=k_, mean=v[0]) for k_, v in GL.items() if k_ != w['word'] and k_ not in {x['word'] for x in pool}]
    rnd.shuffle(extra); return (rnd.sample(pool, min(k, len(pool))) + extra)[:k]
for n, w in enumerate(WORDS):
    kind = ['ox', 'mc', 'ox', 'blank'][n % 4]
    if kind == 'blank' and not w['examples']: kind = 'mc'
    if kind == 'ox':
        truth = rnd.random() < .5
        m = w['mean'] if truth else other(w, 1)[0]['mean']
        Q.append(dict(kind='ox', word=w['word'], q='‘%s’%s “%s”%s 뜻이다.' % (w['word'], eun(w['word'])[len(w['word']):], m, ira(m)[len(m):]), answer=truth))
    elif kind == 'mc':
        ch = [w['mean']] + [o['mean'] for o in other(w, 3)]; rnd.shuffle(ch)
        Q.append(dict(kind='mc', word=w['word'], q='‘%s’의 뜻으로 알맞은 것은?' % w['word'], choices=ch, answer=ch.index(w['mean'])))
    else:
        t = w['examples'][0]['title']; ch = [w['word']] + [o['word'] for o in other(w, 3)]; rnd.shuffle(ch)
        Q.append(dict(kind='blank', word=w['word'], q='오늘 기사 제목의 빈칸에 들어갈 말은?', quote=t.replace(w['word'], '〔　　〕', 1), choices=ch, answer=ch.index(w['word'])))
# 검증: 정답이 사전 뜻과 일치하는지 다시 확인
mean_of = {w['word']: w['mean'] for w in WORDS}
for q in Q:
    if q['kind'] == 'ox': assert (q['q'].split('“')[1].rsplit('”', 1)[0] == mean_of[q['word']]) == q['answer']
    elif q['kind'] == 'mc': assert q['choices'][q['answer']] == mean_of[q['word']] and len(set(q['choices'])) == len(q['choices'])
    else: assert q['choices'][q['answer']] == q['word']
quiz = dict(date=DATE, words=WORDS, questions=Q)

# ---------- 2) 설명 만화(4컷) ----------
def sents(t):
    return [s.strip() for s in re.split(r'(?<=[다요]\.)\s+', re.sub(r'\s+', ' ', t or '')) if len(s.strip()) > 8]
def short(s, n=78):
    s = re.sub(r'\([^)]*\)', '', s).strip()
    if len(s) <= n: return s
    c = s[:n]; k = max(c.rfind(' '), n - 12); return c[:k].rstrip(',·') + '…'
def topic(i):
    t = re.sub(r'^\[[^\]]*\]\s*', '', i['title']); t = re.sub(r'[“”"\'‘’]', '', t)
    return short(t, 16)
def word_in(i):
    t = i['title'] + ' ' + ' '.join(i.get('summary') or [])
    return next((w for w in WORDS if w['word'] in t), None)
PRI = {'경제': 0, '세계': 1, '사회': 2, 'IT': 3, '정치': 5}
cands = [i for i in D['issues'] if i.get('category') not in ('연예', '스포츠') and ((i.get('ai') or {}).get('deep') or i.get('lead'))]
# 개인 발언 공방(따옴표 제목)보다 사건·제도 이슈를 우선 — 실존 인물 풍자 위험을 줄임
cands.sort(key=lambda i: (PRI.get(i.get('category'), 4) + (3 if re.search(r'[“"]', i['title'][:30]) else 0), i['rank']))
COMICS = []
for i in cands[:2]:
    facts = sents((i.get('ai') or {}).get('deep')) or sents(i.get('lead')) or i.get('summary') or [i['title']]
    flow = [f.get('meaning', '') for f in (i.get('ai') or {}).get('flow') or [] if f.get('meaning')]
    w = word_in(i); tp = topic(i)
    numsrc = ' '.join(facts + flow + [i['title']] + (i.get('summary') or []))
    script = llm('cx:' + hk(i['id'], i['title']),
        '아래 사실만 써서 초보자에게 이 뉴스를 설명하는 4컷 만화 대본을 만들어라. 등장인물은 마스코트 둘뿐: "보리"(궁금한 게 많은 학생), "누리"(차분한 해설가). 실존 인물은 등장시키지 말고 이름만 언급 가능. 각 칸은 대사 1~2개(각 45자 이내)와 칸 위 설명 캡션(20자 이내). 1칸 무슨 일, 2칸 왜/어떻게, 3칸 핵심 숫자나 어려운 말, 4칸 앞으로 볼 점. mood는 curious, explain, surprised, think, smile 중 하나.\n'
        '제목: %s\n사실: %s\n흐름: %s\nJSON: {"title":"만화 제목(18자 이내)","panels":[{"caption":"","mood":"curious","lines":[{"who":"보리","text":""}]}]}' % (i['title'], ' '.join(facts[:6]), ' '.join(flow[:2])), 1400)
    def valid(s):
        try:
            ps = s['panels']; assert len(ps) == 4 and 2 <= len(s.get('title', '')) <= 24
            for p in ps:
                assert 1 <= len(p['lines']) <= 2 and len(p.get('caption', '')) <= 24
                for l in p['lines']:
                    assert l['who'] in ('보리', '누리') and 2 <= len(l['text']) <= 60
                    assert not (set(re.findall(r'\d+', l['text'])) - set(re.findall(r'\d+', numsrc)))
            return True
        except Exception: return False
    if script and valid(script):
        panels, title, gen = script['panels'], script['title'], 'ai'
        for p in panels: p['caption'] = re.sub(r'^\s*\d\s*칸\s*[:：.]?\s*', '', p.get('caption', ''))
    else:
        f = facts + [''] * 4
        num = next((s for s in facts[1:] if re.search(r'\d', s)), f[2] or f[1])
        p3 = ([dict(who='보리', text='‘%s’? 그게 무슨 말이야?' % w['word']), dict(who='누리', text=short(w['mean'] + '이라는 뜻이야.', 60))] if w else
              [dict(who='보리', text='숫자로 보면 어느 정도야?'), dict(who='누리', text=short(num, 60))])
        nxt = short(flow[-1], 60) if flow else '원문 기사를 보면서 새 소식을 같이 확인해 보자.'
        panels = [dict(caption='무슨 일?', mood='curious', lines=[dict(who='보리', text='누리야, 오늘 ‘%s’ 뉴스가 많던데?' % tp), dict(who='누리', text=short(f[0], 60))]),
                  dict(caption='어떻게 된 거야?', mood='explain', lines=[dict(who='보리', text='어쩌다 그렇게 된 거야?'), dict(who='누리', text=short(f[1] or f[0], 60))]),
                  dict(caption='핵심 짚기', mood='surprised' if not w else 'think', lines=p3),
                  dict(caption='앞으로 볼 점', mood='smile', lines=[dict(who='누리', text=nxt), dict(who='보리', text='흐름으로 보니까 이해가 쏙 돼!')])]
        title, gen = short(tp + ', 4컷으로 보기', 22), 'rule'
    src = [dict(title=s['title'], url=s['url'], press=s['press']) for s in (i.get('sources') or [])[:4]]
    COMICS.append(dict(id='c' + i['id'][1:9], issue=i['id'], category=i.get('category'), headline=i['title'], title=title, panels=panels, gen=gen, word=w['word'] if w else '', sources=src, date=DATE, image=i.get('image', '')))
# 지난 만화 보관(최근 14개)
past = [c for c in OLD.get('comics', []) if c.get('date') != DATE and c['id'] not in {x['id'] for x in COMICS}]
COMICS = COMICS + past[:12]

# ---------- 3) 카드뉴스 ----------
DECKS = []
s = (ES.get('series') or {}).get('base')
if s and len(s.get('data', [])) > 6:
    d = s['data']; cur = d[-1][1]
    ch = [(d[k][0], d[k - 1][1], d[k][1]) for k in range(1, len(d)) if d[k][1] != d[k - 1][1]]
    last = ch[-1] if ch else None
    hook = '지금 기준금리는 연 %.2f%%' % cur
    since = ('%s에 %.2f%% → %.2f%%로 %s 뒤 그대로예요' % (last[0].replace('-', '년 ') + '월', last[1], last[2], '올린' if last[2] > last[1] else '내린')) if last else '최근 변동이 없어요'
    up = sum(1 for c in ch if c[2] > c[1]); dn = len(ch) - up
    DECKS.append(dict(id='base-rate', kind='recurring', title='기준금리, 한눈에 보기', tag='정기 발표 · 한국은행', date=DATE, cards=[
        dict(t='hook', big=hook, text=since, icon='🏦'),
        dict(t='bg', title='기준금리가 뭐예요?', text=GL['기준금리'][0] + '. 오르면 대출 이자가 늘고, 내리면 돈 빌리기가 쉬워져요.'),
        dict(t='timeline', title='언제 바뀌었나', items=[dict(d=c[0], text='%.2f%% → %.2f%%' % (c[1], c[2]), dir='up' if c[2] > c[1] else 'down') for c in ch[-6:]]),
        dict(t='chart', title='%s 이후 추이' % d[0][0][:4], unit='%', series=[[k, v] for k, v in d], note='최근 %d년 동안 %d번 올리고 %d번 내렸어요.' % (round(len(d) / 12), up, dn)),
        dict(t='numbers', title='숫자로 보면', nums=[dict(v='%.2f%%' % cur, l='현재'), dict(v='%.2f%%' % max(v for _, v in d), l='기간 최고'), dict(v='%.2f%%' % min(v for _, v in d), l='기간 최저')]),
        dict(t='next', title='다음에 볼 점', text='한국은행 금융통화위원회는 1년에 8번 기준금리를 정해요. 물가와 환율, 가계대출 흐름이 결정의 주요 근거가 돼요.'),
        dict(t='src', sources=[dict(title='한국은행 경제통계시스템(ECOS) 기준금리', url='https://ecos.bok.or.kr/', press='한국은행')])]))
def span(i):
    ds = sorted({f['date'] for f in i.get('flow') or []}); return ds, (datetime.date.fromisoformat(ds[-1]) - datetime.date.fromisoformat(ds[0])).days if len(ds) > 1 else 0
flowing = [i for i in D['issues'] if i.get('category') not in ('연예', '스포츠') and not re.search(r'[“"]', i['title'][:30]) and len(span(i)[0]) >= 3 and span(i)[1] >= 3]
flowing.sort(key=lambda i: (-len(span(i)[0]), i['rank']))
for i in flowing[:3]:
    ds, sp = span(i); ai_ = i.get('ai') or {}
    mean = {f['date']: f.get('meaning', '') for f in ai_.get('flow') or []}
    fl = sorted(i['flow'], key=lambda f: f['date'])
    tl = [dict(d=f['date'], text=short((f['items'][0]['title'] if f['items'] else ''), 46), note=short(mean.get(f['date'], ''), 70)) for f in fl][-6:]
    cnt = {}
    for t in i.get('timeline') or []: k = (t.get('t') or '')[:10]; cnt[k] = cnt.get(k, 0) + 1
    for f in fl: cnt[f['date']] = max(cnt.get(f['date'], 0), len(f['items']))
    bg_ = sents(ai_.get('deep')) or sents(i.get('lead')) or i.get('summary') or [i['title']]
    w = word_in(i)
    cards = [dict(t='hook', big=short(i['title'], 46), text='%d일에 걸쳐 이어진 이야기 · 언론사 %d곳' % (sp + 1, i.get('presses', 0)), img=i.get('image', '')),
             dict(t='bg', title='무슨 일이에요?', text=' '.join(short(s_, 90) for s_ in bg_[:2]))]
    if w: cards.append(dict(t='word', title='알아두면 좋은 말', word=w['word'], text=w['mean']))
    cards += [dict(t='timeline', title='흐름 따라가기', items=tl),
              dict(t='bars', title='날짜별 보도량', unit='건', series=sorted(cnt.items())[-10:], note='보도가 몰린 날에 큰 변화가 있었어요.'),
              dict(t='next', title='앞으로 볼 점', text=short(mean.get(ds[-1], '') or '새 보도가 나오면 이 흐름에 자동으로 이어 붙여요.', 140)),
              dict(t='src', sources=[dict(title=s_['title'], url=s_['url'], press=s_['press']) for s_ in (i.get('sources') or [])[:5]])]
    DECKS.append(dict(id='d' + i['id'][1:9], kind='flow', issue=i['id'], title=short(re.sub(r'^\[[^\]]*\]\s*', '', i['title']), 26), tag='이어지는 사건 · ' + i.get('category', ''), date=DATE, cards=cards[:8]))
oldd = [x for x in OLD.get('decks', []) if x.get('date') != DATE and x['id'] not in {y['id'] for y in DECKS}]
DECKS += oldd[:10]
out = dict(date=DATE, updated=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat(timespec='minutes'), quiz=quiz, comics=COMICS, decks=DECKS,
           _cache={k: v for k, v in CACHE.items()} if len(CACHE) < 60 else {})
json.dump(out, open(P('fun.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
# 날짜별 보관: fun/YYYY-MM-DD.json(그날 만든 것만) + fun/index.json(날짜 목록). 배우기 화면 '지난 기록'에서 다시 봄
os.makedirs(P('fun'), exist_ok=True)
day = dict(date=DATE, updated=out['updated'], quiz=quiz, comics=[c for c in COMICS if c.get('date') == DATE], decks=[d for d in DECKS if d.get('date') == DATE])
json.dump(day, open(P('fun/%s.json' % DATE), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
IX = J('fun/index.json', {}) or {}; IX.setdefault('days', {})
IX['days'][DATE] = dict(q=len(Q), c=len(day['comics']), d=len(day['decks']), w=[w['word'] for w in WORDS[:3]])
IX['days'] = dict(sorted(IX['days'].items())[-400:]); IX['updated'] = out['updated']
json.dump(IX, open(P('fun/index.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('fun: words %d, questions %d, comics %d (%s), decks %d' % (len(WORDS), len(Q), len(COMICS), ','.join(c['gen'] for c in COMICS), len(DECKS)))
