"""인물·분류 페이지 배치 점검: python scripts/qa/layout_check.py <base_url> <out_dir> name=path ... [--shots] [--open]
폭 1440·1280·1024·768·390에서 가로 넘침·말줄임·불필요한 줄바꿈·스크립트 오류를 출력. --shots: 1440·390 전체 화면 캡처."""
import asyncio,sys,json,os
from playwright.async_api import async_playwright
BASE=sys.argv[1]; OUT=sys.argv[2].rstrip('/')+'/'; os.makedirs(OUT,exist_ok=True)
PAGES=[a.split('=',1) for a in sys.argv[3:] if '=' in a]
shots='--shots' in sys.argv
OPEN='--open' in sys.argv
CHECK=r"""() => {
 const out={hscroll: document.documentElement.scrollWidth - innerWidth, overflow:[], wrapped:[], ellipsis:0};
 const LBL='dt,.stat-l,.stat-v,.era-n,.era-y,.seg-i,.tag,.hbars-l,.hbars-v,.sub-t,.sh-t,.tl-d,.arow time,.arow-p,.pchip-t b,.exp-b,.stack-lg li,.rg-h,.vbars-l,.ms time,.kpi-l,.nav-i,.side-i,.hero-role,.chip,.reg-d,.mini dt,.mini dd,.tbl td,.tbl th,.src-chip,.issue time,.more-b,.tl-s,.gantt-l,.gantt-d';
 for(const el of document.querySelectorAll('body *')){
   const cs=getComputedStyle(el);
   if(cs.textOverflow==='ellipsis') out.ellipsis++;
   if(el.offsetParent===null && cs.position!=='fixed') continue;
   if(el.children.length===0 && el.textContent.trim() && el.scrollWidth>el.clientWidth+1 && cs.overflow!=='visible') out.overflow.push(el.className+': '+el.textContent.trim().slice(0,30));
   const r=el.getBoundingClientRect();
   if(el.textContent.trim() && r.width>0 && el.closest('main,aside,header') ){
     let pe=el.parentElement; while(pe && getComputedStyle(pe).display==='contents') pe=pe.parentElement; const p=pe.getBoundingClientRect();
     if(cs.whiteSpace==='nowrap' && (r.right>p.right+1 && getComputedStyle(pe).overflow==='visible') && !el.closest('.vbars,.rail,.idx')) out.overflow.push('nowrap-out '+el.className+': '+el.textContent.trim().slice(0,30));
   }
 }
 for(const el of document.querySelectorAll(LBL)){
   if(el.offsetParent===null) continue;
   const cs=getComputedStyle(el); const lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.3;
   const rs=[...el.getClientRects()]; const range=document.createRange(); range.selectNodeContents(el);
   const lines=new Set([...range.getClientRects()].filter(x=>x.width>1).map(x=>Math.round(x.top/ (lh*0.6)))).size;
   const h=el.getBoundingClientRect().height;
   if(h>lh*1.7 && !el.matches('.exp-b,.seg-i,.stack-lg li,.more-b,.era--auto .era-y,.era--list .era-y') && !(el.matches('.gantt-l') && innerWidth<1024)) out.wrapped.push(el.className+'|'+el.tagName+': '+el.textContent.trim().slice(0,40)+' h='+Math.round(h));
   if(el.matches('.exp-b,.seg-i,.stack-lg li,.tag') && h>lh*1.9+16) out.wrapped.push(el.className+': '+el.textContent.trim().slice(0,40));
 }
 if(out.hscroll>0){ for(const el of document.querySelectorAll('main *')){const r=el.getBoundingClientRect(); if(r.right>innerWidth+1 && r.width>0) {out.overflow.push('HS '+el.tagName+'.'+el.className+' '+Math.round(r.right)); if(out.overflow.length>12) break;}}}
 return out;
}"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for name,path in PAGES:
      url=BASE+path+(('&' if '?' in path else '?')+'open=1' if OPEN else '')
      for w in [1440,1280,1024,768,390]:
        ctx=await b.new_context(viewport={'width':w,'height':900},device_scale_factor=2 if (shots and w in (1440,390)) else 1)
        pg=await ctx.new_page()
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        bad=[]; pg.on('response',lambda r: r.status>=400 and bad.append(str(r.status)+' '+r.url[-80:]))
        await pg.goto(url,wait_until='networkidle',timeout=90000)
        await pg.wait_for_selector('body[data-ready="1"]',timeout=60000)
        await pg.evaluate('document.fonts.ready')
        await pg.evaluate("""async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,50))}scrollTo(0,0);await new Promise(r=>setTimeout(r,300));await Promise.all([...document.images].map(i=>i.complete?1:new Promise(r=>{i.addEventListener('load',r);i.addEventListener('error',r);setTimeout(r,8000)})))}""")
        await pg.wait_for_timeout(500)
        res=await pg.evaluate(CHECK)
        broken=await pg.evaluate("[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src.slice(-60))")
        print(name,w,'hscroll',res['hscroll'],'ellipsis',res['ellipsis'],'errs',errs,'badimg',len(broken),'4xx',len(bad))
        for x in (bad+broken)[:4]: print('   BAD',x)
        for x in res['overflow'][:15]: print('   OVER',x)
        for x in res['wrapped'][:25]: print('   WRAP',x)
        if shots and w in (1440,390):
          await pg.screenshot(path=f'{OUT}{name}-{w}.png',full_page=True)
        await ctx.close()
    await b.close()
asyncio.run(main())
