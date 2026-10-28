#!/usr/bin/env python3
"""작은 파비콘(16/24/32) 픽셀 힌팅: 갈색 테두리 + 크림 카드 + 주황 세로선 + 굵은 N. 목표 크기에서 직접 그림."""
import os
from PIL import Image, ImageDraw
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'); I=os.path.join(R,'icons')
BR=(150,96,52,255); BRD=(110,66,32,255); CR=(246,240,228,255); OR=(255,77,46,255); NK=(24,22,20,255)
def draw(n):
    im=Image.new('RGBA',(n,n),(0,0,0,0)); d=ImageDraw.Draw(im)
    f=1 if n<24 else 2                      # 테두리 두께
    d.rounded_rectangle((0,0,n-1,n-1),max(2,n//6),fill=BR)
    d.rounded_rectangle((0,0,n-1,n-1),max(2,n//6),outline=BRD,width=1)
    c=f+1 if n>=24 else f; d.rectangle((c,c,n-1-c,n-1-c),fill=CR)
    lw=1 if n<24 else 2; lx=c+1+(n>=32)
    d.rectangle((lx,c+1,lx+lw-1,n-2-c),fill=OR)  # 주황 세로선
    # N: 좌/우 기둥 + 대각선
    x0=lx+lw+1+(n>=24); x1=n-2-c; y0=c+2; y1=n-3-c; sw=2 if n<32 else 3
    d.rectangle((x0,y0,x0+sw-1,y1),fill=NK); d.rectangle((x1-sw+1,y0,x1,y1),fill=NK)
    h=y1-y0; w=(x1-sw+1)-(x0+sw)
    for y in range(h+1):
        x=x0+sw+round(y*(w-1)/h) if h else x0
        d.rectangle((x-(sw-2),y0+y,x+1,y0+y),fill=NK)
    return im
if __name__=='__main__':
    for n in (16,24,32): draw(n).save(os.path.join(I,f'favicon-{n}.png'))
    big=Image.open(os.path.join(I,'favicon-512.png')).convert('RGBA')
    b48=big.resize((48,48),Image.LANCZOS)
    b48.save(os.path.join(R,'favicon.ico'),sizes=[(16,16),(32,32),(48,48)],append_images=[draw(16),draw(32)])
    print('ok')
