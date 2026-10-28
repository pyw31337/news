#!/usr/bin/env python3
"""아이콘 생성: python scripts/make_icons.py [오브젝트 PNG(투명 배경 RGBA)]
기본 오브젝트는 icons/candidates/s3_cork_object.png (scripts/render_icon_s3.py로 다시 그릴 수 있음).
오브젝트 폭 = 아이콘 폭의 56%(렛츠뷰 비율), 배경 단색 #011E45로 PWA 아이콘·파비콘·OG 이미지를 만듭니다."""
import sys, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NAVY = (1, 30, 69)
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(R, 'icons/candidates/s3_cork_object.png')
obj = Image.open(src).convert('RGBA'); obj = obj.crop(obj.getbbox())
def place(img, c, w):
    h = w * obj.height / obj.width; o = obj.resize((int(w), int(h)), Image.LANCZOS)
    x, y = int(c[0] - w / 2), int(c[1] - h / 2)
    sh = Image.new('L', img.size, 0); sh.paste(o.split()[3].point(lambda v: v * 160 // 255), (x, y + int(w * .05)))
    img.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(max(1, w * .05))))
    img.paste(o, (x, y), o); return img
def icon(n, ratio=.56): return place(Image.new('RGB', (n, n), NAVY), (n / 2, n / 2), n * ratio)
I = os.path.join(R, 'icons'); os.makedirs(I, exist_ok=True)
icon(512).save(os.path.join(I, 'icon-512.png')); icon(192).save(os.path.join(I, 'icon-192.png'))
icon(512, .50).save(os.path.join(I, 'maskable-512.png'))  # 마스킹 안전영역
icon(180).save(os.path.join(I, 'apple-touch-icon.png'))
# 파비콘: 네이비 배경 없이 오브젝트만(투명 배경)
from PIL import ImageEnhance
def fav(n):
    w = n; h = int(n * obj.height / obj.width); o = obj.resize((w, h), Image.LANCZOS)
    if n <= 48: o = ImageEnhance.Sharpness(o).enhance(1.6)
    c = Image.new('RGBA', (n, n), (0, 0, 0, 0)); c.paste(o, (0, (n - h) // 2), o); return c
fav(512).save(os.path.join(I, 'favicon-512.png'))
import runpy; runpy.run_path(os.path.join(R, 'scripts/make_small_favicons.py'), run_name='__main__')  # 16/24/32 픽셀 힌팅
def F(s, w='Black'):
    for p in (f'/usr/share/fonts/opentype/noto/NotoSansCJK-{w}.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/System/Library/Fonts/AppleSDGothicNeo.ttc'):
        try: return ImageFont.truetype(p, s, index=1 if 'Noto' in p else 0)
        except Exception: pass
    return ImageFont.load_default()
# OG: 좌측 타이틀 + 주황 태그라인, 우측 아이콘
og = Image.new('RGB', (1200, 630), NAVY)
glow = Image.new('L', og.size, 0); ImageDraw.Draw(glow).ellipse((700, 70, 1180, 550), fill=70)
og.paste((40, 80, 140), (0, 0), glow.filter(ImageFilter.GaussianBlur(90)))
place(og, (950, 315), 370); d = ImageDraw.Draw(og)
OR = (255, 77, 46)
d.rounded_rectangle((96, 168, 156, 176), 4, fill=OR)
d.text((92, 300), 'NewsBoard', font=F(100), fill='white', anchor='ls')
d.text((96, 385), '뉴스를 타임라인으로', font=F(50, 'Bold'), fill=OR, anchor='ls')
d.text((96, 470), 'pyw31337.github.io/news', font=F(24, 'Medium'), fill=(150, 165, 200), anchor='ls')
og.save(os.path.join(R, 'og-image.png')); print('ok')
