#!/usr/bin/env python3
"""오늘 아카이브(archive/YYYY-MM-DD.json)에 해외 뉴스·시장 지표를 덧붙여 날짜별로 남김.
collect.py가 국내 이슈만 적으므로, enrich·global_news·official 뒤에 실행. 다음 수집에서 collect.py가 파일을 새로 써도 여기서 다시 채움."""
import os, json
ROOT = 'data'
def load(p, d=None):
    try: return json.load(open(os.path.join(ROOT, p)))
    except Exception: return d
T = load('today.json', {}); day = T.get('date')
if not day: raise SystemExit('archive_extra: no today')
P = os.path.join(ROOT, 'archive', day + '.json'); A = load('archive/%s.json' % day)
if A is None: raise SystemExit('archive_extra: no archive file')
G = load('global.json', {}) or {}
if G.get('issues'):
    A['global'] = [dict(rank=i.get('rank'), id=i.get('id'), title=i.get('title'), title_ko=i.get('title_ko') or '', url=i.get('url'), press=i.get('press'),
                        image=i.get('image') or '', category=i.get('category'), presses=i.get('presses'), keywords=(i.get('keywords') or [])[:6]) for i in G['issues'][:12]]
if T.get('market'):
    A['market'] = [{k: m.get(k) for k in ('name', 'kind', 'price', 'diff', 'rate', 'dir', 'at')} for m in T['market']]
O = load('official.json', {}) or {}
if O.get('ecos'):
    A['ecos'] = [{k: e.get(k) for k in ('name', 'group', 'value', 'unit', 'cycle')} for e in O['ecos']]
json.dump(A, open(P, 'w'), ensure_ascii=False)
# 해외 기사 원문 목록도 국내 기사 DB처럼 날짜별로 쌓음(인물 타임라인 재료, 같은 기사는 한 번만)
import glob, gzip, datetime as dt
gd = os.path.join(ROOT, 'db', 'articles_global', day); os.makedirs(gd, exist_ok=True); seen = set()
for f in glob.glob(os.path.join(gd, '*.json.gz')):
    try: seen.update(x['url'] for x in json.load(gzip.open(f, 'rt', encoding='utf-8')))
    except Exception: pass
new = []
for i in G.get('issues', []):
    for s in [i] + (i.get('sources') or []):
        u = s.get('ourl') or s.get('url')
        if not u or u in seen: continue
        seen.add(u); new.append(dict(title=s.get('title_ko') or s.get('title') or '', title_en=s.get('title') or '', url=u, press=s.get('press') or '', t=s.get('t') or G.get('updated', '')[:16], cat=i.get('category') or ''))
if new:
    with gzip.open(os.path.join(gd, dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).strftime('%H%M') + '.json.gz'), 'wt', encoding='utf-8', compresslevel=9) as g:
        json.dump(new, g, ensure_ascii=False, separators=(',', ':'))
print('archive_extra: global articles new', len(new))
print('archive_extra:', day, 'global', len(A.get('global', [])), 'market', len(A.get('market', [])), 'ecos', len(A.get('ecos', [])))
