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
icon(180).save(os.path.join(I, 'apple-touch-icon.png')); icon(32, .9).save(os.path.join(I, 'favicon-32.png'))
og = place(Image.new('RGB', (1200, 630), NAVY), (600, 290), 300); d = ImageDraw.Draw(og)
def F(s):
    for p in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/System/Library/Fonts/AppleSDGothicNeo.ttc'):
        try: return ImageFont.truetype(p, s, index=1 if 'Noto' in p else 0)
        except Exception: pass
    return ImageFont.load_default()
d.text((240, 270), '오늘의 이슈', font=F(46), fill='white', anchor='mm'); d.text((240, 330), 'TOP 10 · 요약', font=F(26), fill=(255, 120, 95), anchor='mm')
d.text((960, 270), '사건의 흐름', font=F(46), fill='white', anchor='mm'); d.text((960, 330), '인물 · 타임라인', font=F(26), fill=(255, 120, 95), anchor='mm')
d.text((600, 510), 'NewsBoard.', font=F(56), fill='white', anchor='mm'); d.text((600, 572), 'pyw31337.github.io/news', font=F(24), fill=(150, 165, 200), anchor='mm')
og.save(os.path.join(R, 'og-image.png')); print('ok')
