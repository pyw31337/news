"""그록 금색 메달(검은 배경, 784×1168)을 사이트 배지로 변환.
python3 scripts/game_art/grok_badges.py <원본 폴더(01~26.jpg)> <금색 엠블럼 폴더> <출력 폴더>
- 검은 배경 → 투명(가장자리에서 이어진 어두운 영역만), 정사각 512/128px
- 그록 이미지가 없는 배지: 15번(서류) 메달의 원판을 비우고 금색 엠블럼을 얹음
- 등급 10단계: 금속(금색) 부분만 색을 바꿈(브론즈~이터널), 빨간 리본은 그대로
- 음각 빈 자리(slot) 이미지도 함께"""
import sys, os, json, numpy as np
from collections import deque
from PIL import Image, ImageFilter, ImageDraw
SRC, EMB, OUT = sys.argv[1:4]
os.makedirs(OUT + '/slot', exist_ok=True)
MAP = {'01': 'x_tl', '02': 'f_soc', '03': 'share', '04': 'visit', '05': 'weekend', '06': 'level', '07': 'taste', '08': 'later', '09': 'deckall', '10': 'sling',
       '11': 'merge', '12': 'g2048', '13': 'gamer', '14': 'follow', '15': 'save', '16': 'deck', '17': 'history', '18': 'balance', '19': 'words',
       '20': 'perfect', '21': 'quiz', '22': 'bird', '23': 'owl', '24': 'streak', '25': 'read', '26': 'hello'}
TIERS = json.load(open(os.path.join(os.path.dirname(__file__), 'tiers.json')))  # {id: [등급 수, 스페셜]}

def cutout(im):
    """테두리에서 이어진 어두운 배경만 투명하게(메달 안쪽 검은 원판은 유지)"""
    a = np.asarray(im.convert('RGB')).astype(np.int16); H, W = a.shape[:2]; L = a.max(-1)
    bg = np.zeros((H, W), bool); q = deque()
    for x in range(W):
        for y in (0, H - 1): q.append((x, y))
    for y in range(H):
        for x in (0, W - 1): q.append((x, y))
    while q:
        x, y = q.popleft()
        if bg[y, x] or L[y, x] > 38: continue
        bg[y, x] = True
        if x > 0: q.append((x - 1, y))
        if x < W - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < H - 1: q.append((x, y + 1))
    al = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    # 가운데 원판(상징이 있는 곳): 가운데 영역의 어두운 화소 범위 → 타원. 등급 색은 이 바깥(프레임)에만
    dk = (L < 45) & ~bg; dk[:int(H * .12)] = False; dk[int(H * .68):] = False; dk[:, :int(W * .18)] = False; dk[:, int(W * .82):] = False
    ys, xs = np.nonzero(dk); M = Image.new('L', (W, H), 0)
    if len(xs): x0, x1, y0, y1 = np.percentile(xs, 1), np.percentile(xs, 99), np.percentile(ys, 1), np.percentile(ys, 99); ImageDraw.Draw(M).ellipse((x0 - 4, y0 - 4, x1 + 4, y1 + 4), fill=255)
    out = im.convert('RGBA'); out.putalpha(al)
    bb = out.getbbox(); out = out.crop(bb); M = M.crop(bb); s = max(out.size) + 16
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.paste(out, ((s - out.width) // 2, (s - out.height) // 2), out)
    mq = Image.new('L', (s, s), 0); mq.paste(M, ((s - out.width) // 2, (s - out.height) // 2))
    return sq.resize((512, 512), Image.LANCZOS), np.asarray(mq.resize((512, 512))) > 128

def template(emb):
    """15번 메달의 원판(중심 390,457 / 반지름 246)을 비우고 금색 엠블럼을 얹은 784×1168 이미지"""
    im = Image.open(f'{SRC}/15.jpg').convert('RGB'); cx, cy, r = 390, 457, 247
    n = 2 * r; yy, xx = np.mgrid[0:n, 0:n] - r; d = np.sqrt(xx ** 2 + yy ** 2) / r
    rng = np.random.default_rng(3); g = (np.clip(20 - 10 * d - 6 * (yy / r), 4, 26) + rng.normal(0, 2.2, (n, n)))[..., None]
    disc = Image.fromarray(np.clip(np.repeat(g, 3, -1), 0, 255).astype(np.uint8))
    m = Image.new('L', (n, n), 0); ImageDraw.Draw(m).ellipse((0, 0, n - 1, n - 1), fill=255); m = m.filter(ImageFilter.GaussianBlur(1.5))
    im.paste(disc, (cx - r, cy - r), m)
    e = Image.open(emb).convert('RGBA'); sz = int(r * 1.62); e = e.resize((sz, sz), Image.LANCZOS)
    im = im.convert('RGBA'); im.alpha_composite(e, (cx - sz // 2, cy - sz // 2 + 6)); return im.convert('RGB')

def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; mx = a[..., :3].max(-1); mn = a[..., :3].min(-1); d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    return h, np.where(mx > 0, (mx - mn) / (mx + 1e-6), 0), mx
def rgb(h, s, v):
    i = np.floor(h * 6) % 6; f = h * 6 - np.floor(h * 6); p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    c = [i == k for k in range(6)]
    return np.stack([np.select(c, [v, q, p, p, t, v]), np.select(c, [t, v, v, q, p, p]), np.select(c, [p, p, t, v, v, q])], -1)
def tier(im, t, keep):
    """금색 금속 부분만 등급 색으로. 0 브론즈 1 실버 2 골드 3 플래티넘 4 다이아 5 마스터 6 레전드 7 그랜드마스터 8 신화 9 이터널"""
    if t == 2: return im
    a = np.asarray(im).astype(np.float32) / 255; h, s, v = hsv(a)
    gold = (h > .06) & (h < .19) & (s > .22) & (v > .12) & ~keep
    n = a.shape[0]; yy, xx = np.mgrid[0:n, 0:n] / n
    P = {0: (.055, 1.05, .82), 1: (None, .07, 1.06), 3: (.47, .22, 1.08), 4: (.6, .55, 1.0), 5: (.77, .52, .98), 6: (.985, .62, 1.0), 7: (.08, .5, .45), 8: (.43, .62, .95)}
    if t == 9: nh = (np.arctan2(yy - .5, xx - .5) / (2 * np.pi) + .5 + yy * .4) % 1; ns = s * .62; nv = np.minimum(1, v * 1.08)
    else:
        hh, sk, vk = P[t]; nh = h if hh is None else np.full_like(h, hh); ns = np.minimum(1, s * sk); nv = np.minimum(1, v * vk)
    out = a.copy(); out[..., :3] = np.where(gold[..., None], rgb(nh, ns, nv), a[..., :3])
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGBA')
def slot(im):
    a = np.asarray(im).astype(np.float32) / 255
    L = Image.fromarray((np.dot(a[..., :3], [.3, .59, .11]) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    em = np.asarray(L.filter(ImageFilter.EMBOSS)).astype(np.float32) / 255 - .5
    o = np.dstack([np.clip(np.array([.235, .19, .14]) + em[..., None] * .55, 0, 1), a[..., 3]])
    return Image.fromarray((o * 255).astype(np.uint8), 'RGBA')
base = {}
for k, bid in MAP.items(): base[bid] = cutout(Image.open(f'{SRC}/{k}.jpg'))
for f in sorted(os.listdir(EMB)):
    bid = f[:-4]
    if bid not in base: base[bid] = cutout(template(f'{EMB}/{f}'))
done = 0
for bid, (im, keep) in base.items():
    cnt, sp = TIERS.get(bid, [7, 'null'])
    tiers = [int(sp)] if sp != 'null' else range(min(cnt, 10))
    for t in tiers:
        x = tier(im, t, keep); x.save(f'{OUT}/{bid}-{t}.webp', quality=86, method=4)
        x.resize((128, 128), Image.LANCZOS).save(f'{OUT}/{bid}-{t}-s.webp', quality=86, method=4)
        slot(x).save(f'{OUT}/slot/{bid}-{t}.webp', quality=82, method=4); done += 1
missing = [b for b in TIERS if b not in base]
print('badges', len(base), 'images', done, 'missing', missing)
