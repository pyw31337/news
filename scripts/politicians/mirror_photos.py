#!/usr/bin/env python3
"""국회 공개 사진 → 자체 WebP(세로 320px, q75) 보관: PDATA/photos/<코드>.webp
국회 사이트가 해외 접속·핫링크를 막거나 사진 주소가 바뀌어도 유지되도록. 한국 IP(맥미니)에서 실행.
이미 있는 파일은 건너뜀(원본 주소가 바뀌면 photo_src로 비교해 다시 받음)."""
import json, os, sys, io, urllib.request, concurrent.futures as cf
from PIL import Image
P = sys.argv[1]; D = f'{P}/photos'; os.makedirs(D, exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130 Safari/537.36', 'Referer': 'https://www.assembly.go.kr/'}
IDX = json.load(open(f'{P}/index.json', encoding='utf-8'))
MAP = json.load(open(f'{D}/_src.json')) if os.path.exists(f'{D}/_src.json') else {}
def one(e):
    u, f = e.get('photo'), f'{D}/{e["id"]}.webp'
    if not u: return None
    if os.path.exists(f) and MAP.get(e['id']) == u: return e['id']
    try:
        b = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20).read()
        im = Image.open(io.BytesIO(b)).convert('RGB'); im.thumbnail((256, 320))
        im.save(f, 'WEBP', quality=75, method=6); MAP[e['id']] = u; return e['id']
    except Exception: return None
with cf.ThreadPoolExecutor(6) as ex: ok = {x for x in ex.map(one, IDX['people']) if x}
json.dump(MAP, open(f'{D}/_src.json', 'w'))
for e in IDX['people']:
    if e['id'] in ok: e['photo_local'] = f'data/pol/photos/{e["id"]}.webp'
json.dump(IDX, open(f'{P}/index.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('photos', len(ok), '/', len(IDX['people']))
