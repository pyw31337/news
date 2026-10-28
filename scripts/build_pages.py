#!/usr/bin/env python3
"""정적 페이지 생성: 이슈·인물·검색어별 index.html에 og 메타를 박아 공유 미리보기를 만든다.
GitHub Pages는 해시(#) 없는 경로(/news/issue/xxx)를 이 파일로 바로 서빙하고, 없는 경로는 404.html(SPA 폴백)."""
import json, os, re, sys, html
SITE = sys.argv[1] if len(sys.argv) > 1 else '_site'
ORIGIN = 'https://pyw31337.github.io/news/'
T = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
DEF_IMG = ORIGIN + 'og-image.png'
def load(p):
    try: return json.load(open(p, encoding='utf-8'))
    except Exception: return {}
D = load(os.path.join(SITE, 'data', 'today.json')); G = load(os.path.join(SITE, 'data', 'global.json'))
esc = lambda s: html.escape(re.sub(r'\s+', ' ', str(s or '')).strip(), quote=True)
cut = lambda s, n: (s if len(s) <= n else s[:n - 1] + '…')
def page(path, title, desc, img=None):
    from urllib.parse import quote
    url = ORIGIN + quote(path, safe='/') + ('/' if path else '')
    t, d = esc(cut(title, 90)), esc(cut(desc or '포털에서 가장 많이 회자된 오늘의 이슈와, 인물·장소·사건의 흐름', 160))
    im = esc(img if img and img.startswith('http') else DEF_IMG)
    og = f'''<!--OG-->
<meta property="og:type" content="{'article' if path else 'website'}">
<meta property="og:site_name" content="NewsBoard">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:image" content="{im}">{'<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' if im == DEF_IMG else ''}
<meta property="og:url" content="{esc(url)}">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{esc(url)}">
<!--/OG-->'''
    h = re.sub(r'<!--OG-->.*?<!--/OG-->', og, T, flags=re.S)
    h = re.sub(r'<title>.*?</title>', '<title>%s</title>' % (t + (' · NewsBoard' if path else '')), h, flags=re.S)
    h = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + d, h)
    if path is None: return h
    out = os.path.join(SITE, path); os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(h)
    return 1
safe = lambda s: s and '/' not in s and '\\' not in s and not s.startswith('.') and len(s.encode()) < 200
n = 0
for v, t in (('market', '마켓·정책'), ('people', '화제 — 인물·기업·장소'), ('timeline', '타임라인 비교'), ('map', '관계로 보는 오늘'), ('archive', '날짜 아카이브'), ('settings', '설정')):
    n += page(v, t, '')
for i in D.get('issues', []):
    n += page('issue/' + i['id'], i['title'], i.get('summary') or ((i.get('ai') or {}).get('deep') or ''), i.get('image'))
for e in D.get('entities', []):
    if safe(e['name']): n += page('entity/' + e['name'], e['name'] + ' — 타임라인', (e.get('wiki') or {}).get('desc') or (e.get('timeline') or [{}])[0].get('title', ''), (e.get('wiki') or {}).get('thumb'))
for t in D.get('trends', []):
    if safe(t['keyword']): n += page('kw/' + t['keyword'], t['keyword'] + ' — 검색어 흐름', ((t.get('ai') or {}).get('summary')) or ('검색 ' + str(t.get('traffic', ''))), t.get('image'))
for i in G.get('issues', []):
    n += page('g/' + i['id'], i.get('title_ko') or i['title'], i.get('summary_ko') or i.get('summary', ''), i.get('image'))
for k, t in enumerate(G.get('trends', [])):
    n += page('gt/%d' % k, (t.get('keyword_ko') or t['keyword']) + ' — 해외 검색어', '', t.get('image'))
open(os.path.join(SITE, '404.html'), 'w', encoding='utf-8').write(T)
print('static pages', n)
