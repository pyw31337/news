#!/usr/bin/env python3
"""실사 마스터(icons/source/s3_photo_master.jpg, 1024 네이비 배경) 기준 아이콘 생성.
앱아이콘=사진 그대로 축소, 파비콘 48+ = 둥근사각 알파마스크 누끼, OG = 누끼 오브젝트 배치. 16/24/32는 make_small_favicons.py."""
import os, runpy
from PIL import Image, ImageDraw, ImageFilter, ImageFont
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'); I=os.path.join(R,'icons')
src=Image.open(os.path.join(I,'source/s3_photo_master.jpg')).convert('RGB')
BOX=(211,187,816,811); RAD=76
# 앱 아이콘(배경 유지): 오브젝트 중심을 화면 중앙으로 살짝 보정
cx=(BOX[0]+BOX[2])/2; cy=(BOX[1]+BOX[3])/2
canvas=src.resize((1024,1024)); pad=Image.new('RGB',(1100,1100),src.getpixel((512,1010)))
pad.paste(src,(38,38)); full=pad.crop((int(38+cx-512),int(38+cy-512),int(38+cx+512),int(38+cy+512)))
for n,f in ((512,'icon-512.png'),(192,'icon-192.png'),(180,'apple-touch-icon.png')): full.resize((n,n),Image.LANCZOS).save(os.path.join(I,f))
# 누끼
S=4; m=Image.new('L',(1024*S,1024*S),0); ImageDraw.Draw(m).rounded_rectangle([v*S for v in BOX],RAD*S,fill=255)
m=m.resize((1024,1024),Image.LANCZOS); obj=src.convert('RGBA'); obj.putalpha(m); obj=obj.crop(BOX)
def withshadow(o,n):
    w=int(n*.86); h=int(w*o.height/o.width); o=o.resize((w,h),Image.LANCZOS)
    c=Image.new('RGBA',(n,n),(0,0,0,0)); x=(n-w)//2; y=(n-h)//2-int(n*.02)
    sh=Image.new('L',(n,n),0); sh.paste(o.split()[3].point(lambda v:v*110//255),(x,y+int(n*.03)))
    c.paste((0,0,0,255),(0,0),sh.filter(ImageFilter.GaussianBlur(n*.025))); c.alpha_composite(o,(x,y)); return c
withshadow(obj,512).save(os.path.join(I,'favicon-512.png')); withshadow(obj,192).save(os.path.join(I,'favicon-192.png'))
f48=obj.resize((48,48),Image.LANCZOS); f48.save(os.path.join(I,'favicon-48.png'))
# maskable: 오브젝트 50%
bg=Image.new('RGB',(1024,1024),src.getpixel((512,1010))); bg=full.resize((32,32)).resize((1024,1024),Image.BICUBIC); bg.paste(src.getpixel((60,60)),(0,0,1024,1024))
o=obj.resize((512,int(512*obj.height/obj.width)),Image.LANCZOS)
sh=Image.new('L',(1024,1024),0); sh.paste(o.split()[3].point(lambda v:v*150//255),(256,256+24)); bg.paste((0,0,0),(0,0),sh.filter(ImageFilter.GaussianBlur(28)))
bg.paste(o,(256,256),o); bg.resize((512,512),Image.LANCZOS).save(os.path.join(I,'maskable-512.png'))
# 소형(픽셀) + ico
small=runpy.run_path(os.path.join(R,'scripts/make_small_favicons.py'))
for n in (16,24,32): small['draw'](n).save(os.path.join(I,f'favicon-{n}.png'))
f48.save(os.path.join(R,'favicon.ico'),sizes=[(16,16),(32,32),(48,48)],append_images=[small['draw'](16),small['draw'](32)])
# OG
NAVY=(1,30,69); og=Image.new('RGB',(1200,630),NAVY)
glow=Image.new('L',og.size,0); ImageDraw.Draw(glow).ellipse((700,70,1180,550),fill=70); og.paste((40,80,140),(0,0),glow.filter(ImageFilter.GaussianBlur(90)))
w=370; o=obj.resize((w,int(w*obj.height/obj.width)),Image.LANCZOS); x,y=950-w//2,315-o.height//2
sh=Image.new('L',og.size,0); sh.paste(o.split()[3].point(lambda v:v*170//255),(x,y+20)); og.paste((0,0,0),(0,0),sh.filter(ImageFilter.GaussianBlur(20)))
og.paste(o,(x,y),o); d=ImageDraw.Draw(og)
F=lambda s:ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',s,index=1)
OR=(255,77,46); d.rounded_rectangle((96,168,156,176),4,fill=OR)
d.text((92,300),'NewsBoard',font=F(100),fill='white',anchor='ls'); d.text((96,385),'뉴스를 타임라인으로',font=F(50),fill=OR,anchor='ls')
d.text((96,470),'pyw31337.github.io/news',font=F(24),fill=(150,165,200),anchor='ls')
og.save(os.path.join(R,'og-image.png')); print('ok')
