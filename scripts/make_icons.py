#!/usr/bin/env python3
"""아이콘 교체: python scripts/make_icons.py <원본이미지> [cx cy r]
원본에서 원형 오브젝트(중심 cx,cy 반지름 r, 원본 대비 비율 0~1. 기본 0.5 0.485 0.28)를 잘라
렛츠뷰 아이콘 비율(오브젝트 지름 = 아이콘 폭의 56%)로 남색 배경에 얹어 PWA 아이콘·파비콘·OG 이미지를 다시 만듭니다."""
import sys, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = Image.open(sys.argv[1]).convert('RGB'); W, H = src.size
cx, cy, r = [float(x) for x in sys.argv[2:5]] if len(sys.argv) >= 5 else (0.5, 0.485, 0.28)
box = (int((cx - r) * W), int((cy - r) * H), int((cx + r) * W), int((cy + r) * H)); obj = src.crop(box).resize((1024, 1024), Image.LANCZOS)
mask = Image.new('L', (1024, 1024), 0); ImageDraw.Draw(mask).ellipse((6, 6, 1018, 1018), fill=255); mask = mask.filter(ImageFilter.GaussianBlur(2))
def bg(w, h):
    g = Image.new('RGB', (w, h)); d = ImageDraw.Draw(g)
    for y in range(h): t = y / h; d.line([(0, y), (w, y)], fill=(int(14 + 10 * (1 - t)), int(28 + 14 * (1 - t)), int(70 + 30 * (1 - t))))
    return g
def place(img, c, d):
    sh = Image.new('L', img.size, 0); ImageDraw.Draw(sh).ellipse((c[0] - d / 2, c[1] - d / 2 + d * .05, c[0] + d / 2, c[1] + d / 2 + d * .05), fill=150)
    img.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(d * .06)))
    o = obj.resize((int(d), int(d)), Image.LANCZOS); m = mask.resize((int(d), int(d)), Image.LANCZOS)
    img.paste(o, (int(c[0] - d / 2), int(c[1] - d / 2)), m); return img
def icon(n, ratio=.56):
    return place(bg(n, n), (n / 2, n / 2), n * ratio)
I = os.path.join(R, 'icons'); os.makedirs(I, exist_ok=True)
icon(512).save(os.path.join(I, 'icon-512.png')); icon(192).save(os.path.join(I, 'icon-192.png'))
icon(512, .50).save(os.path.join(I, 'maskable-512.png'))  # 마스킹 안전영역 고려
icon(180).save(os.path.join(I, 'apple-touch-icon.png')); icon(32, .8).save(os.path.join(I, 'favicon-32.png'))
og = place(bg(1200, 630), (600, 300), 330)
d = ImageDraw.Draw(og)
def F(s, b=True):
    for p in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/System/Library/Fonts/AppleSDGothicNeo.ttc', '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'):
        try: return ImageFont.truetype(p, s, index=1 if 'Sans' in p else 0)
        except Exception: pass
    return ImageFont.load_default()
d.text((215, 300), '오늘의 이슈', font=F(44), fill='white', anchor='mm'); d.text((985, 300), '사건의 흐름', font=F(44), fill='white', anchor='mm')
d.text((600, 525), 'NewsBoard.', font=F(56), fill='white', anchor='mm'); d.text((600, 585), 'pyw31337.github.io/news', font=F(24), fill=(170, 180, 210), anchor='mm')
og.save(os.path.join(R, 'og-image.png')); print('ok')
