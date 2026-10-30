#!/usr/bin/env python3
"""해외 이슈 AI 해설(영어 원문 + 한국어): data/global.json의 각 이슈에 ai 붙이기
- 세 줄 요약 · 배경 · 왜 중요한가 · 앞으로 볼 점 · 핵심 용어(영어 표현 + 한국어 뜻)
- 근거는 원문 제목·요약·기사 첫 문단(leads)만. 원문에 없는 숫자가 들어간 문장은 버림.
- 이슈별로 캐시(data/gai_cache.json, 이슈 id+제목). 실행마다 새 이슈만 최대 6개를 한 번에 요청 → 무료 한도 안."""
import json, os, re, sys, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.environ.get('FUN_DATA') or os.path.join(os.path.dirname(__file__), '..', 'data')
P = lambda n: os.path.join(ROOT, n)
def J(n, d=None):
    try: return json.load(open(P(n), encoding='utf-8'))
    except Exception: return d
G = J('global.json', {}) or {}
if not G.get('issues'): print('global_ai: no global.json'); sys.exit(0)
hk = lambda *a: hashlib.md5('|'.join(map(str, a)).encode()).hexdigest()[:12]
def load_llm():
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fun.py'), encoding='utf-8').read()
    a = src.index('# ---------- AI(선택)'); b = src.index('def bat(w):')
    g = {'__file__': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fun.py')}
    exec(compile('import json, os, re, sys, random, hashlib, subprocess, urllib.request, urllib.error, time, datetime\n'
                 'sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import ai_usage, llm_quota\n'
                 'ROOT=%r\nai_usage.setup(ROOT); llm_quota.setup(ROOT)\nOLD={}\n' % ROOT + src[a:b], 'fun_llm', 'exec'), g)
    g['SYS'] = ('You are a careful international news editor writing for Korean readers who also learn English. Use only the given facts; never invent numbers, quotes or facts. '
                'Be neutral. Output only the requested JSON.')
    g['CACHE'] = {}
    return g
CP = P('gai_cache.json'); C = J('gai_cache.json', {}) or {}
key = lambda i: hk(i['id'], i['title'])
todo = [i for i in G['issues'] if key(i) not in C][:6]
nums = lambda s: set(re.findall(r'\d+(?:[.,]\d+)?', s or ''))
if todo:
    g = load_llm()
    def src_text(i): return ' '.join([i['title'], i.get('summary', '')] + [l['text'] for l in i.get('leads') or []] + [x['title'] for x in (i.get('sources') or [])[:8]])
    prompt = ('For each story below, write in natural English AND a faithful Korean version: '
              '"bullets" (3 one-sentence key points), "background" (2 sentences of context), "why" (why it matters, 1–2 sentences), "watch" (what to watch next, 1 sentence), '
              'and "terms": 3 useful English words/phrases that appear in the text with a short English definition and Korean meaning. Only use the facts given.\n'
              'JSON: {"items":[{"id":"","bullets_en":["","",""],"bullets_ko":["","",""],"background_en":"","background_ko":"","why_en":"","why_ko":"","watch_en":"","watch_ko":"",'
              '"terms":[{"en":"","def_en":"","ko":""}]}]}\n\n'
              + '\n\n'.join('[%s] %s\nSummary: %s\nArticle text: %s\nOther headlines: %s' % (i['id'], i['title'], i.get('summary', '')[:500],
                            ' '.join(l['text'] for l in (i.get('leads') or [])[:3])[:1600], ' | '.join(x['title'] for x in (i.get('sources') or [])[1:6])) for i in todo))
    r = g['llm']('gai:' + hk(*[key(i) for i in todo]), prompt, 6500) or {}
    by = {i['id']: i for i in todo}; ok = bad = 0
    for x in r.get('items', []) if isinstance(r, dict) else []:
        i = by.get(x.get('id'))
        if not i: continue
        try:
            en_all = ' '.join((x.get('bullets_en') or []) + [x.get('background_en', ''), x.get('why_en', ''), x.get('watch_en', '')])
            assert len(x.get('bullets_en') or []) >= 2 and len(x.get('bullets_ko') or []) >= 2 and re.search(r'[가-힣]', ' '.join(x['bullets_ko']))
            assert not (nums(en_all) - nums(src_text(i)))
            terms = [t for t in (x.get('terms') or []) if isinstance(t, dict) and t.get('en') and t['en'].lower() in src_text(i).lower() and re.search(r'[가-힣]', t.get('ko', ''))][:4]
            C[key(i)] = dict(bullets=dict(en=x['bullets_en'][:3], ko=x['bullets_ko'][:3]), background=dict(en=x.get('background_en', ''), ko=x.get('background_ko', '')),
                             why=dict(en=x.get('why_en', ''), ko=x.get('why_ko', '')), watch=dict(en=x.get('watch_en', ''), ko=x.get('watch_ko', '')),
                             terms=[dict(en=t['en'], def_en=t.get('def_en', '')[:120], ko=t['ko'][:60]) for t in terms])
            ok += 1
        except Exception: bad += 1
    print('global_ai: new %d, dropped %d' % (ok, bad))
for i in G['issues']:
    if key(i) in C: i['ai'] = C[key(i)]
json.dump(dict(list(C.items())[-300:]), open(CP, 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(G, open(P('global.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('global_ai: issues with ai %d/%d' % (sum(1 for i in G['issues'] if i.get('ai')), len(G['issues'])))
