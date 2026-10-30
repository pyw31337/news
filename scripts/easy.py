#!/usr/bin/env python3
"""읽기 수준 맞춤(내 서재 설정 '연령대·읽기 수준'): data/today.json 이슈마다
- easy: 청소년·처음 보는 분도 이해할 '쉬운 말' 요약 3문장(AI, 이슈별 캐시 data/easy_cache.json, 실행당 새 이슈만 한 번에)
- gloss: 제목·요약에 나온 어려운 시사 용어 → 검수 사전 뜻(AI 아님, 항상 정확)
사람마다 따로 만들지 않고 이슈당 한 번만 만들어 모두가 함께 씀 → 무료 한도 안. 원문에 없는 숫자가 든 요약은 버림."""
import json, os, re, sys, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glossary import G as GL
ROOT = os.environ.get('FUN_DATA') or os.path.join(os.path.dirname(__file__), '..', 'data')
P = lambda n: os.path.join(ROOT, n)
def J(n, d=None):
    try: return json.load(open(P(n), encoding='utf-8'))
    except Exception: return d
D = J('today.json', {}) or {}
if not D.get('issues'): print('easy: no today.json'); sys.exit(0)
hk = lambda *a: hashlib.md5('|'.join(map(str, a)).encode()).hexdigest()[:12]
key = lambda i: hk(i['id'], i['title'])
summ = lambda i: ' '.join(i.get('summary') or []) if isinstance(i.get('summary'), list) else (i.get('summary') or '')
def src_text(i): return ' '.join([i['title'], summ(i), (i.get('ai') or {}).get('deep') or '', ' '.join(i.get('leads') or [])])
# 1) 용어 풀이(사전)
for i in D['issues']:
    t = i['title'] + ' ' + summ(i) + ' ' + ' '.join((i.get('ai') or {}).get('summary') or [] if isinstance((i.get('ai') or {}).get('summary'), list) else [])
    i['gloss'] = {w: GL[w][0] for w in sorted(GL, key=len, reverse=True) if len(w) >= 2 and w in t}
    if len(i['gloss']) > 6: i['gloss'] = dict(list(i['gloss'].items())[:6])
# 2) 쉬운 말 요약(AI)
CP = P('easy_cache.json'); C = J('easy_cache.json', {}) or {}
todo = [i for i in D['issues'] if key(i) not in C][:10]
nums = lambda s: set(re.findall(r'\d+(?:[.,]\d+)?', s or ''))
if todo:
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fun.py'), encoding='utf-8').read()
    a = src.index('# ---------- AI(선택)'); b = src.index('def bat(w):')
    g = {'__file__': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fun.py')}
    exec(compile('import json, os, re, sys, random, hashlib, subprocess, urllib.request, urllib.error, time, datetime\n'
                 'sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import ai_usage, llm_quota\n'
                 'ROOT=%r\nai_usage.setup(ROOT); llm_quota.setup(ROOT)\nOLD={}\n' % ROOT + src[a:b], 'fun_llm', 'exec'), g)
    g['SYS'] = '너는 어린이·청소년·어르신도 이해하도록 뉴스를 쉬운 우리말로 풀어 주는 해설가다. 주어진 사실만 쓰고, 없는 숫자·사실을 만들지 마라. 출력은 지정한 JSON만.'
    g['CACHE'] = {}
    prompt = ('아래 뉴스 이슈마다, 처음 보는 사람도 바로 이해하도록 쉬운 말 요약 3문장을 써라.\n'
              '- 한 문장 40자 안팎, 어려운 한자어·법률·경제 용어는 쉬운 말로 바꾸거나 괄호로 풀어라.\n'
              '- 1문장: 무슨 일이 있었나, 2문장: 왜/누가, 3문장: 그래서 우리에게 어떤 의미인가.\n'
              '- 주어진 사실만. 단정·조롱 금지. 존댓말(~어요/~예요).\n'
              'JSON: {"items":[{"id":"","easy":["","",""]}]}\n\n'
              + '\n\n'.join('[%s] %s\n사실: %s' % (i['id'], i['title'], src_text(i)[:900]) for i in todo))
    r = g['llm']('easy:' + hk(*[key(i) for i in todo]), prompt, 3500) or {}
    by = {i['id']: i for i in todo}; ok = bad = 0
    for x in r.get('items', []) if isinstance(r, dict) else []:
        i = by.get(x.get('id'))
        try:
            L = [str(s).strip() for s in x.get('easy') or [] if 6 < len(str(s).strip()) < 120][:3]
            assert i and len(L) >= 2 and not (nums(' '.join(L)) - nums(src_text(i)))
            C[key(i)] = L; ok += 1
        except Exception: bad += 1
    print('easy: new %d, dropped %d' % (ok, bad))
for i in D['issues']:
    if key(i) in C: i['easy'] = C[key(i)]
json.dump(dict(list(C.items())[-400:]), open(CP, 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(D, open(P('today.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('easy: with easy %d/%d, gloss %d' % (sum(1 for i in D['issues'] if i.get('easy')), len(D['issues']), sum(len(i.get('gloss') or {}) for i in D['issues'])))
