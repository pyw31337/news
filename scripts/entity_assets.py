#!/usr/bin/env python3
"""인물 사진·기업 로고·국기·장소 사진(entity_media.py가 찾은 공개 이미지)을 우리 저장소에 WebP로 보관.
collect.py 바로 다음에 실행해, 다른 수집보다 먼저 확보한다(여러 화면에서 반복해 쓰는 그래픽이라 우선).
- 저장: media/ent/<앞 2자리>/<원본 주소 해시>.webp (최대 400px, 로고·국기는 투명 배경 유지)
- today.json 엔티티의 visual.url을 우리 주소로 바꾸고 원본은 visual.src에 남김
- 한 번 받은 이미지는 media/ent/index.json에 기록해 다시 받지 않음(실패는 3일 뒤 재시도)"""
import os, io, json, time, hashlib, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
ROOT = 'data'; MEDIA = 'media'; ED = os.path.join(MEDIA, 'ent'); os.makedirs(ED, exist_ok=True)
IP = os.path.join(ED, 'index.json'); UA = {'User-Agent': 'NewsBoard/1.0 (https://pyw31337.github.io/news/)'}
try: IDX = json.load(open(IP))
except Exception: IDX = {}
def fetch(u):
    try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=12).read()
    except Exception: return None
def store(u, kind):
    h = hashlib.sha1(u.encode()).hexdigest()[:16]; rel = os.path.join('ent', h[:2], h + '.webp'); fp = os.path.join(MEDIA, rel)
    x = IDX.get(u)
    if x and x.get('f') and os.path.exists(os.path.join(MEDIA, x['f'])): return x['f']
    if x and not x.get('f') and time.time() - x.get('at', 0) < 3 * 86400: return None
    b = fetch(u)
    try:
        im = Image.open(io.BytesIO(b)); im.load()
        keep = kind in ('logo', 'flag') or im.mode in ('RGBA', 'LA', 'P')
        im = im.convert('RGBA' if keep else 'RGB'); im.thumbnail((400, 400), Image.LANCZOS)
        if (max(im.size) < 120) if kind in ('logo', 'flag') else (min(im.size) < 48): raise ValueError('too small')   # 로고는 가로로 긴 글자 로고도 허용
        os.makedirs(os.path.dirname(fp), exist_ok=True); im.save(fp, 'WEBP', quality=84, method=5)
        IDX[u] = dict(f=rel, w=im.size[0], h=im.size[1], at=int(time.time())); return rel
    except Exception:
        IDX[u] = dict(f=None, at=int(time.time())); return None
P = os.path.join(ROOT, 'today.json')
try: D = json.load(open(P))
except Exception: raise SystemExit('entity_assets: no today.json')
todo = []
for e in D.get('entities', []):
    v = e.get('visual') or {}; src = v.get('src') or v.get('url')
    if src and src.startswith('http'): todo.append((e, src, v.get('kind', '')))
def one(t):
    e, src, kind = t; return e, src, store(src, kind)
ok = 0
with ThreadPoolExecutor(6) as ex:
    for e, src, rel in ex.map(one, todo):
        if rel: e['visual'] = dict(e.get('visual') or {}, url='media/' + rel, src=src); ok += 1
json.dump(D, open(P, 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(IDX, open(IP, 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'entity_assets: {ok}/{len(todo)} local WebP, cache {sum(1 for x in IDX.values() if x.get("f"))} files')
