import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
S=1024; rng=np.random.default_rng(7)
def rr(size,box,r,fill=255):
    m=Image.new('L',size,0); ImageDraw.Draw(m).rounded_rectangle(box,r,fill=fill); return m
def noise(w,h,scale,amp,base):
    n=rng.normal(0,1,(h//scale+1,w//scale+1)); n=np.array(Image.fromarray(((n+3)/6*255).clip(0,255).astype('uint8')).resize((w,h),Image.BICUBIC),float)/255-.5
    return (np.array(base,float)[None,None,:]+n[...,None]*amp).clip(0,255)
obj=Image.new('RGBA',(S,S),(0,0,0,0))
# wood frame with horizontal grain
g=rng.normal(0,1,(S,1)); g=np.repeat(g,S,1); g=np.array(Image.fromarray(((g+3)/6*255).clip(0,255).astype('uint8')).filter(ImageFilter.GaussianBlur(2)),float)/255-.5
wood=(np.array([176,118,70],float)[None,None,:]+g[...,None]*50+noise(S,S,6,18,[0,0,0])).clip(0,255)
yy=np.linspace(1.12,.82,S)[:,None,None]; wood=(wood*yy).clip(0,255)
W=Image.fromarray(wood.astype('uint8')).convert('RGBA')
obj.paste(W,(0,0),rr((S,S),(0,0,S-1,S-1),150))
# bevel highlights
hl=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(hl)
d.rounded_rectangle((6,6,S-7,S-7),145,outline=(255,230,190,110),width=8)
obj=Image.alpha_composite(obj,hl.filter(ImageFilter.GaussianBlur(4)))
# cork inset
ci=(78,78,S-78,S-78)
cork=Image.fromarray(noise(S,S,2,70,[150,104,62]).astype('uint8')).convert('RGBA')
cm=rr((S,S),ci,70); obj.paste(cork,(0,0),cm)
# inner shadow on cork
inner=Image.new('L',(S,S),0); ImageDraw.Draw(inner).rounded_rectangle(ci,70,fill=255)
sh=ImageChops.subtract(inner, rr((S,S),(ci[0]+14,ci[1]+22,ci[2]-6,ci[3]-4),60)).filter(ImageFilter.GaussianBlur(14))
sh=ImageChops.multiply(sh,inner); obj.paste((40,20,5,255),(0,0),sh.point(lambda v:int(v*.8)))
# screws
for x,y in [(140,140),(S-140,140),(140,S-140),(S-140,S-140)]:
    sd=ImageDraw.Draw(obj); sd.ellipse((x-24,y-20,x+28,y+32),fill=(60,35,15,150)); sd.ellipse((x-24,y-24,x+24,y+24),fill=(150,100,60)); sd.ellipse((x-16,y-18,x+12,y+6),fill=(185,135,90))
# card shadow + card
card=(170,180,S-170,S-160)
cs=rr((S,S),(card[0]+6,card[1]+26,card[2]+10,card[3]+34),40,170).filter(ImageFilter.GaussianBlur(22)); obj.paste((20,10,0,255),(0,0),cs)
paper=Image.fromarray(noise(S,S,1,10,[244,239,228]).astype('uint8')).convert('RGBA')
obj.paste(paper,(0,0),rr((S,S),card,40))
cd=ImageDraw.Draw(obj); OR=(255,77,46)
lx=card[0]+130; cd.rounded_rectangle((lx-14,card[1]+90,lx+14,card[3]-70),6,fill=OR)
for y in (card[1]+380,card[1]+470): cd.ellipse((lx-90,y-26,lx-38,y+26),fill=OR)
f=ImageFont.truetype('/usr/share/fonts/truetype/sand-box/google/DM Serif Display/DMSerifDisplay-Regular.ttf',400)
cd.text((card[0]+425,card[1]+290),'N',font=f,fill=(24,22,20),anchor='mm')
for y in (card[3]-150,card[3]-90): cd.rounded_rectangle((card[0]+250,y-12,card[2]-70,y+12),4,fill=(165,162,155))
# pushpin
px,py=S//2,card[1]+10
ps=Image.new('L',(S,S),0); ImageDraw.Draw(ps).ellipse((px-50,py+30,px+70,py+90),fill=140); obj.paste((30,15,0,255),(0,0),ps.filter(ImageFilter.GaussianBlur(12)))
cd.rounded_rectangle((px-50,py+20,px+50,py+70),30,fill=(205,55,30)); cd.rounded_rectangle((px-28,py-60,px+28,py+40),14,fill=(235,66,38))
cd.ellipse((px-48,py-90,px+48,py-30),fill=(255,77,46)); cd.ellipse((px-26,py-82,px+6,py-58),fill=(255,165,140))
obj.save('/workspace/icon/s3_object.png'); print('ok')
