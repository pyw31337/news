"""카드뉴스·만화 공유 이미지(1200x630 PNG) 생성: python scripts/fun_og.py _site"""
import json, os, sys, urllib.request
from PIL import Image, ImageDraw, ImageFont
SITE = sys.argv[1]; F = json.load(open(os.path.join(SITE, 'data', 'fun.json'), encoding='utf-8'))
def font():
    # 디자인 규칙: Pretendard 우선. 받을 수 없을 때만 시스템 한글 글꼴
    if os.path.exists('/tmp/Pretendard-Bold.otf'): return '/tmp/Pretendard-Bold.otf'
    for u in ('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf',
              'https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf'):
        try: urllib.request.urlretrieve(u, '/tmp/Pretendard-Bold.otf'); return '/tmp/Pretendard-Bold.otf'
        except Exception: pass
    for p in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/System/Library/Fonts/AppleSDGothicNeo.ttc'):
        if os.path.exists(p): return p
    raise SystemExit('no Korean font')
FP = font(); Fn = lambda s: ImageFont.truetype(FP, s)
NAVY, OR, Y = (15, 22, 48), (255, 77, 46), (255, 176, 32)
def wrap(d, t, f, w):
    out, cur = [], ''
    for ch in t:
        if d.textlength(cur + ch, font=f) > w: out.append(cur); cur = ch.lstrip()
        else: cur += ch
    return out + [cur] if cur else out
def mascots(d, x, y, s=1.0):
    r = int(70 * s)
    d.pieslice((x - r, y - r, x + r, y + r + 40), 180, 360, fill=(255, 138, 61)); d.rectangle((x - r, y + 20 - 1, x + r, y + 60), fill=(255, 138, 61))
    for dx in (-24, 24): d.ellipse((x + dx * s - 9, y + 5 - 9, x + dx * s + 9, y + 5 + 9), fill=NAVY)
    d.arc((x - 20, y + 15, x + 20, y + 45), 0, 180, fill=(122, 31, 18), width=6)
    x2 = x + int(170 * s)
    d.rounded_rectangle((x2 - r, y - r + 10, x2 + r, y + 60), 50, fill=(47, 79, 158))
    for dx in (-24, 24):
        d.ellipse((x2 + dx - 18, y - 13, x2 + dx + 18, y + 23), outline='white', width=5); d.ellipse((x2 + dx - 7, y - 2, x2 + dx + 7, y + 12), fill='white')
    d.arc((x2 - 20, y + 20, x2 + 20, y + 48), 0, 180, fill='white', width=6)
def og(path, tag, title, sub):
    im = Image.new('RGB', (1200, 630), NAVY); d = ImageDraw.Draw(im)
    d.rectangle((0, 560, 1200, 630), fill=(10, 15, 34))
    f1 = Fn(40); tw = d.textlength(tag, font=Fn(30))
    d.rounded_rectangle((70, 70, 70 + tw + 40, 124), 27, fill=OR); d.text((90, 97), tag, font=Fn(30), fill='white', anchor='lm')
    y = 175
    for ln in wrap(d, title, Fn(68), 700)[:3]: d.text((70, y), ln, font=Fn(68), fill='white'); y += 88
    for ln in wrap(d, sub, Fn(32), 700)[:2]: d.text((70, y + 10), ln, font=Fn(32), fill=(190, 200, 230)); y += 44
    mascots(d, 880, 340)
    d.text((70, 595), 'NewsBoard', font=Fn(32), fill='white', anchor='lm'); d.text((270, 595), '뉴스를 타임라인으로', font=Fn(28), fill=OR, anchor='lm')
    os.makedirs(os.path.dirname(path), exist_ok=True); im.save(path, optimize=True)
n = 0
for x in F.get('decks', []):
    og(os.path.join(SITE, 'og', 'cards', x['id'] + '.png'), '카드뉴스 · ' + x['tag'].split('·')[0].strip(), x['title'], x['cards'][0].get('text', '')); n += 1
for c in F.get('comics', []):
    og(os.path.join(SITE, 'og', 'comic', c['id'] + '.png'), '4컷 설명 만화', c['title'], c['headline']); n += 1
og(os.path.join(SITE, 'og', 'learn.png'), '놀면서 배우기', '오늘의 단어 퀴즈 · 4컷 만화 · 카드뉴스', '하루 3분, 뉴스 속 어려운 말을 게임처럼'); n += 1
print('fun og', n)
