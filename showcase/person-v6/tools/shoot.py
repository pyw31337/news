import asyncio,sys,json
from playwright.async_api import async_playwright
BASE='http://127.0.0.1:8765/showcase/person-v6/'
OUT='/workspace/newsboard-shots/person-v6/'
props=sys.argv[1] if len(sys.argv)>1 else 'abc'
shots='--shots' in sys.argv
CHECK=r"""() => {
 const out={hscroll: document.documentElement.scrollWidth - innerWidth, overflow:[], wrapped:[], ellipsis:0};
 const LBL='dt,.stat-l,.stat-v,.era-n,.era-y,.seg-i,.tag,.hbars-l,.hbars-v,.sub-t,.sh-t,.tl-d,.arow time,.arow-p,.pchip-t b,.exp-b,.stack-lg li,.rg-h,.vbars-l,.ms time,.kpi-l,.nav-i,.side-i,.hero-role,.chip';
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
   if(h>lh*1.7 && !el.matches('.exp-b,.seg-i,.stack-lg li,.era--auto .era-y,.era--list .era-y')) out.wrapped.push(el.className+'|'+el.tagName+': '+el.textContent.trim().slice(0,40)+' h='+Math.round(h));
   if(el.matches('.exp-b,.seg-i,.stack-lg li,.tag') && h>lh*1.9+16) out.wrapped.push(el.className+': '+el.textContent.trim().slice(0,40));
 }
 if(out.hscroll>0){ for(const el of document.querySelectorAll('main *')){const r=el.getBoundingClientRect(); if(r.right>innerWidth+1 && r.width>0) {out.overflow.push('HS '+el.tagName+'.'+el.className+' '+Math.round(r.right)); if(out.overflow.length>12) break;}}}
 return out;
}"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for pr in props:
      for w in [1440,1280,1024,768,390]:
        ctx=await b.new_context(viewport={'width':w,'height':900},device_scale_factor=2 if (shots and w in (1440,390)) else 1)
        pg=await ctx.new_page()
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(BASE+pr+'/',wait_until='networkidle',timeout=90000)
        await pg.wait_for_selector('body[data-ready="1"]',timeout=30000)
        await pg.evaluate('document.fonts.ready')
        # 이미지 로드 기다리기(지연 로딩 해제)
        await pg.evaluate("""async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}scrollTo(0,0);await new Promise(r=>setTimeout(r,300));await Promise.all([...document.images].map(i=>i.complete&&i.naturalWidth?1:new Promise(r=>{i.addEventListener('load',r);i.addEventListener('error',r);setTimeout(r,8000)})))}""")
        await pg.wait_for_timeout(600)
        res=await pg.evaluate(CHECK)
        print(pr,w,'hscroll',res['hscroll'],'ellipsis',res['ellipsis'],'errs',errs)
        for x in res['overflow'][:15]: print('   OVER',x)
        for x in res['wrapped'][:25]: print('   WRAP',x)
        if shots and w in (1440,390):
          tag='desktop-1440' if w==1440 else 'mobile-390'
          await pg.screenshot(path=f'{OUT}{pr}-{tag}.png',full_page=True)
          if w==1440:
            await pg.goto(BASE+pr+'/?open=1',wait_until='networkidle'); await pg.wait_for_selector('body[data-ready="1"]'); await pg.evaluate('document.fonts.ready'); await pg.evaluate("""async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}scrollTo(0,0)}"""); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'{OUT}{pr}-desktop-1440-expanded.png',full_page=True)
            if pr=='d':
              await pg.goto(BASE+pr+'/',wait_until='networkidle'); await pg.wait_for_selector('body[data-ready="1"]'); await pg.evaluate('document.fonts.ready')
              await pg.evaluate("document.getElementById('s-pol').scrollIntoView()"); await pg.evaluate("scrollBy(0,-40)"); await pg.wait_for_timeout(1500)
              act=await pg.evaluate("[...document.querySelectorAll('.toc:not(.toc--bar) .toc-i.is-on')].map(a=>a.textContent)")
              print('   active toc:',act)
              await pg.screenshot(path=f'{OUT}{pr}-desktop-1440-scrolled.png')
        await ctx.close()
    await b.close()
asyncio.run(main())
