/* NewsBoard 카드 덱 · 사진 갤러리 · 라이트박스 · 섹션 앵커 (외부 라이브러리 없음) */
(()=>{
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- 섹션 앵커: 이동 + 강조 펄스 ---------- */
window.nbAnchor=function(id){const t=document.getElementById(id);if(!t)return;
  const y=t.getBoundingClientRect().top+scrollY-72;window.scrollTo({top:y,behavior:RM()?'auto':'smooth'});
  t.classList.remove('pulse');void t.offsetWidth;t.classList.add('pulse');
  if(!t.hasAttribute('tabindex'))t.setAttribute('tabindex','-1');setTimeout(()=>t.focus({preventScroll:true}),RM()?0:450);
  setTimeout(()=>t.classList.remove('pulse'),2200)};

/* ---------- 선명도 검사: 원본 폭 ≥ 화면 폭 × 2 (기기 배율이 1이면 ×1) ---------- */
const NAT={};
function natural(u){return NAT[u]||(NAT[u]=new Promise(r=>{const im=new Image();im.decoding='async';im.onload=()=>r({w:im.naturalWidth,h:im.naturalHeight});im.onerror=()=>r({w:0,h:0});im.src=u;setTimeout(()=>r({w:0,h:0}),8000)}))}
/* 사진이 없는 것보다 조금 덜 선명한 사진이 낫다(2026-10-30): 칸 크기의 60%(최소 160px, 최대 480px) 이상이면 사용 */
const need=w=>Math.min(480,Math.max(160,w*.6));
window.nbSharp=natural;

/* ---------- 카드 덱 (스프링 물리) ---------- */
// 상태: x,y(px) r(deg) s(scale) l(들림 0~1) o(불투명) — 모두 목표값으로 스프링 수렴
function Deck(root,onTop){
  const cards=[...root.querySelectorAll('.rcard')],N=cards.length;if(!N)return;
  let top=0,drag=null,raf=0,last=0,W=root.clientWidth||360;
  const st=cards.map(()=>({x:0,y:0,r:0,ry:0,s:1,l:0,o:1,vx:0,vy:0,vr:0,vry:0,vs:0,vl:0,vo:0}));
  const prevIn={x:0};
  const tilt=k=>(k%2?1:-1)*1.1;
  function target(i){const d=i-top;
    if(d<0)return{x:-W*1.35,y:40,r:-24,ry:0,s:.96,l:0,o:0};
    if(d===0)return{x:0,y:0,r:0,ry:0,s:1,l:0,o:1};
    const dd=Math.min(d,4);return{x:dd*2,y:dd*11,r:tilt(i)*Math.min(d,3),ry:0,s:1-dd*.045,l:0,o:d>3?0:1-dd*.12}}
  // 강성 k, 감쇠 c (질량 1) — 회전은 덜 감쇠해 살짝 흔들림
  const K={x:[170,22],y:[200,24],r:[260,15],ry:[220,18],s:[300,26],l:[240,22],o:[180,26]};
  function step(dt){let busy=false;
    st.forEach((p,i)=>{const t=target(i);
      if(drag&&drag.i===i&&drag.mode==='top'){busy=true;return}
      if(drag&&drag.mode==='prev'&&i===top-1){busy=true;return}
      for(const k in K){const v='v'+k,[kk,cc]=K[k];const a=-kk*(p[k]-t[k])-cc*p[v];p[v]+=a*dt;p[k]+=p[v]*dt;
        if(Math.abs(p[k]-t[k])>.01||Math.abs(p[v])>.01)busy=true;else{p[k]=t[k];p[v]=0}}
    });
    // 드래그 중인 카드의 회전·들림도 스프링으로 따라감(손을 따라 흔들림)
    if(drag){const p=st[drag.i];for(const k of['r','ry','l','s']){const v='v'+k,[kk,cc]=K[k];const a=-kk*(p[k]-drag.t[k])-cc*p[v];p[v]+=a*dt;p[k]+=p[v]*dt}}
    return busy}
  /* 부하 줄이기(2026-10-30): 바뀐 값만 쓰고, 화면 밖으로 사라져 멈춘 카드는 건너뜀. 들림 그림자는 box-shadow를 매번 다시 그리지 않고
     미리 그려 둔 그림자 층(.rlift)의 불투명도만 바꿈(합성 단계에서 처리) */
  cards.forEach(c=>{const l=document.createElement('i');l.className='rlift';l.setAttribute('aria-hidden','true');c.prepend(l);c._lf=l});
  function paint(){const rm=RM();cards.forEach((c,i)=>{const p=rm?Object.assign({},target(i),drag&&drag.i===i?{x:st[i].x}:{}):st[i];const d=i-top;
    const tr=`translate3d(${p.x.toFixed(1)}px,${(p.y-p.l*8).toFixed(1)}px,0) rotate(${p.r.toFixed(2)}deg) rotateY(${(p.ry||0).toFixed(2)}deg) scale(${(p.s+p.l*.035).toFixed(4)})`;
    if(c._t!==tr){c._t=tr;c.style.transform=tr}
    const op=clamp(p.o,0,1).toFixed(2);if(c._o!==op){c._o=op;c.style.opacity=op}
    const lf=clamp(p.l,0,1).toFixed(2);if(c._l!==lf){c._l=lf;c._lf.style.opacity=lf}
    const z=d<0||(drag&&drag.mode==='prev'&&i===top-1)?200+i:100-d,vis=p.o<.01&&d!==0?'hidden':'visible';
    if(c._z!==z){c._z=z;c.style.zIndex=z}if(c._v!==vis){c._v=vis;c.style.visibility=vis}
    const act=vis==='visible'&&d>=-1&&d<=2;if(c._a!==act){c._a=act;c.classList.toggle('act',act)}
    if(c._d!==d){c._d=d;c.setAttribute('aria-hidden',d===0?'false':'true');c.tabIndex=d===0?0:-1;
    c.querySelectorAll('a').forEach(a=>a.tabIndex=d===0?0:-1)}})}
  function loop(ts){const dt0=Math.min(.05,last?(ts-last)/1000:.016);last=ts;let b=false;
    const n=Math.ceil(dt0/.004);for(let k=0;k<n;k++)b=step(dt0/n)||b;paint();
    raf=b||drag?requestAnimationFrame(loop):0;if(!raf)last=0}
  const kick=()=>{if(!raf){last=0;raf=requestAnimationFrame(loop)}};
  function go(t,vx=0,vr=0){t=clamp(t,0,N-1);if(t===top){kick();return}
    const fwd=t>top;if(fwd){const p=st[top];p.vx+=vx;p.vr+=vr}else{const p=st[t];if(!drag){p.x=-W*1.2;p.r=-20;p.o=1}p.vx+=vx}
    top=t;onTop(top);kick();root.querySelector('.rpos b').textContent=String(top+1).padStart(2,'0');
    root.querySelector('.rbar i').style.width=((top+1)/N*100)+'%';
    root.querySelector('[data-d="-1"]').disabled=top===0;root.querySelector('[data-d="1"]').disabled=top===N-1}
  root._go=go;
  /* 포인터: 가로로 움직일 때만 잡음(세로 스크롤은 브라우저에 양보) */
  const stage=root.querySelector('.rstage');
  stage.addEventListener('pointerdown',e=>{if(e.button)return;const c=e.target.closest('.rcard');if(!c||+c.dataset.i!==top)return;
    W=root.clientWidth;const b=c.getBoundingClientRect();
    drag={id:e.pointerId,x0:e.clientX,y0:e.clientY,gy:(e.clientY-b.top)/b.height-.5,gx:(e.clientX-b.left)/b.width-.5,h:b.height,locked:false,dead:false,i:top,mode:'top',hist:[[e.timeStamp,e.clientX,e.clientY]],t:{r:0,ry:0,l:1,s:1}};
    kick()});
  stage.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id||drag.dead)return;
    const dx=e.clientX-drag.x0,dy=e.clientY-drag.y0;
    if(!drag.locked){if(Math.hypot(dx,dy)<7)return;if(Math.abs(dy)>Math.abs(dx)*1.1){drag.dead=true;release(e,true);return}
      drag.locked=true;try{stage.setPointerCapture(e.pointerId)}catch(x){}
      if(dx>0&&top>0){drag.mode='prev';drag.i=top-1;const p=st[top-1];p.x=-W*1.2;p.o=1;p.r=-14}}
    drag.hist.push([e.timeStamp,e.clientX,e.clientY]);if(drag.hist.length>6)drag.hist.shift();
    const v=vel();const p=st[drag.i];
    if(drag.mode==='prev'){p.x=-W*1.15+dx*1.15;p.y=dy*.12;drag.t.r=-14+clamp(dx/W,0,1)*14+v.x*1.5;drag.t.ry=0;drag.t.l=1}
    else{let rx=dx;if((dx>0&&top===0)||(dx<0&&top===N-1))rx=dx*.28/(1+Math.abs(dx)/W);
      p.x=rx;p.y=dy*.18;const lever=drag.gy<0?1:-1,arm=.45+Math.min(.55,Math.abs(drag.gy)*1.1);
      drag.t.r=clamp((rx/W)*16*lever*arm+v.x*2.2*lever,-28,28);drag.t.ry=clamp(-rx/W*10,-10,10);drag.t.l=1+Math.min(.2,Math.abs(rx)/W*.3)}
    kick();e.preventDefault()},{passive:false});
  function vel(){const h=drag.hist,a=h[0],b=h[h.length-1],dt=Math.max(8,b[0]-a[0]);return{x:(b[1]-a[1])/dt,y:(b[2]-a[2])/dt}}
  function release(e,cancel){if(!drag)return;const d=drag;drag=null;
    if(!d.locked||cancel){kick();return}
    root._moved=true;setTimeout(()=>root._moved=false,60);
    const dx=e.clientX-d.x0;
    const vx=(d.hist.at(-1)[1]-d.hist[0][1])/Math.max(8,d.hist.at(-1)[0]-d.hist[0][0]);
    const fast=Math.abs(vx)>.45,far=Math.abs(dx)>W*.32;
    if(d.mode==='prev'){if((fast&&vx>0)||(far&&dx>0&&!(fast&&vx<0)))go(top-1,vx*1000);else{st[d.i].vx=vx*1000;kick()}}
    else if(dx<0&&top<N-1&&((fast&&vx<0)||(far&&!(fast&&vx>0))))go(top+1,vx*1000-300,vx*40);
    else{st[d.i].vx=vx*600;kick()}}
  stage.addEventListener('dragstart',e=>e.preventDefault());
  stage.addEventListener('pointerup',e=>{if(drag&&e.pointerId===drag.id)release(e)});
  stage.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.id)release(e,true)});
  stage.addEventListener('click',e=>{if(root._moved){e.preventDefault();e.stopPropagation();return}
    const c=e.target.closest('.rcard');if(!c)return;if(+c.dataset.i!==top){e.preventDefault();e.stopPropagation();go(+c.dataset.i)}},true);
  root.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();go(top+1,-900,-30)}else if(e.key==='ArrowLeft'){e.preventDefault();go(top-1,700)}});
  root.querySelectorAll('[data-d]').forEach(b=>b.addEventListener('click',()=>go(top+ +b.dataset.d,+b.dataset.d>0?-1100:800,+b.dataset.d>0?-40:0)));
  new ResizeObserver(()=>{W=root.clientWidth;kick()}).observe(root);
  st.forEach((p,i)=>Object.assign(p,target(i)));paint();onTop(0);
}
window.nbDeck=function(root){
  const rows=[...document.querySelectorAll('.side .srow')];
  // 덱을 넘길수록 이미 본 카드(01…현재)는 아래 목록에서 차례로 사라지고, 남은 순위 중 앞의 5개가 채워짐(넓은 화면, 왼쪽 카드와 높이를 맞춤). 이전 카드로 돌아가면 사라졌던 줄이 다시 펼쳐지며 아래로 밀림
  const RC=[...root.querySelectorAll('.rcard')];let far=0;
  /* 목록 갱신은 카드가 거의 자리 잡은 뒤(0.28초)에: 카드 움직임과 목록 접힘(레이아웃 계산)이 같은 프레임에 겹치지 않게 */
  let prevT=0,lt=null;const sync=t=>{const seen=new Set(RC.slice(0,t+1).map(c=>c.dataset.id));let k=0;rows.forEach(r=>{const g=seen.has(r.dataset.id);r.classList.toggle('gone',g);r.classList.toggle('cap',!g&&++k>5)})};
  Deck(root,t=>{if(t!==prevT){prevT=t;dispatchEvent(new CustomEvent('nb:decktop',{detail:{t}}))}far=Math.max(far,t);clearTimeout(lt);if(!lt&&t===0){sync(0);lt=-1}else lt=setTimeout(()=>sync(t),280);
    if(t===RC.length-1&&RC.length>=5)dispatchEvent(new CustomEvent('nb:deckall',{detail:{n:RC.length}}))});
  // 선명하지 않은 대표 사진은 글자 카드로
  root.querySelectorAll('.rcard').forEach(async c=>{const u=c.dataset.img,box=c.querySelector('.rimg');if(!u){c.classList.add('txt');return}
    const bw=box.clientWidth||c.clientWidth||360,bh=box.clientHeight||bw*.56;
    const L=await Promise.all(u.split('|').map(async x=>({x,n:await natural(x)})));const ok=L.filter(o=>o.n.w>=need(bw)&&o.n.h>=need(bh))[0];/* 기사 대표 사진 우선(크기순으로 고르면 묶음 속 다른 기사 사진이 뜸) */
    if(ok){box.style.backgroundImage=`url('${ok.x}')`;box.classList.add('sq-ok');box.dataset.sq=ok.x;c.classList.add('hasimg')}else c.classList.add('txt')})};

/* ---------- 상세 상단 갤러리 (큰 사진 1 + 2×2 + 사진 +N장) ---------- */
window.nbGallery=async function(el,list){if(!el)return;
  const W=el.clientWidth||el.parentElement?.clientWidth||innerWidth,mob=W<640;const bigW=mob?W:W*.5,smW=mob?W:W*.25;
  const chk=await Promise.all(list.map(async g=>({g,n:await natural(g.img)})));
  const ok=chk.filter(x=>x.n.w>=need(smW)).sort((a,b)=>((b.g.q||0)-(a.g.q||0))||(b.n.w-a.n.w));/* 품질 점수순(docs/QUALITY.md), 같으면 큰 사진 */
  const big=ok.findIndex(x=>x.n.w>=need(bigW));
  if(big<0){el.remove();document.querySelector('.dhead')?.classList.add('noimg');return}
  const G=[ok[big],...ok.filter((_,k)=>k!==big)].map(x=>x.g);el._G=G;
  /* 렛츠캠핑식 격자(2026-10-30): 큰 사진 1 + 작은 사진(PC 4, 모바일 3), 마지막 칸에 '+N장'. 누르면 라이트박스(좌우로 끌어 넘김) */
  const tile=(g,k,cls='',more=0)=>`<button type="button" class="gt ${cls}" data-k="${k}" aria-label="사진 ${k+1} 크게 보기"><img src="${g.img}" alt="${(g.press||'')} 사진" loading="${k?'lazy':'eager'}" decoding="async">${more?`<span class="gplus">+${more}</span>`:''}</button>`;
  const ns=mob?3:4,sm=G.slice(1,1+ns),rest=G.length-1-sm.length;
  el.innerHTML=`<div class="gp ${mob?'mob':''} n${Math.min(ns+1,G.length)}">${tile(G[0],0,'big')}${sm.map((g,k)=>tile(g,k+1,'',k===sm.length-1&&rest>0?rest:0)).join('')}</div>${G.length>1?`<button type="button" class="gmore" data-k="0">${ICO.photo}사진 ${G.length}장 모두 보기</button>`:''}`;
  el.classList.add('on');
  const gm=el.querySelector('.gm');if(gm)gm.addEventListener('scroll',()=>{el.querySelector('.gcnt b').textContent=Math.round(gm.scrollLeft/gm.clientWidth)+1},{passive:true});
  el.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b)lightbox(G,+b.dataset.k,b)})};
const ICO={photo:NBI('photo')};

/* ---------- 라이트박스: 스와이프 · 핀치 확대 · 두 번 탭 · 설명 · 출처 ---------- */
function lightbox(G,k,opener){
  const lb=document.createElement('div');lb.className='lbx';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','사진 크게 보기');
  const cap=g=>{const s=((typeof D!=='undefined'&&D)?D.issues:[]).flatMap(i=>i.sources||[]).find(s=>s.url===g.url);return`<p>${esc2(s?.title||'')}</p><small>사진 · ${esc2(g.press||'언론사')} <a href="${esc2(g.url)}" target="_blank" rel="noopener">기사 원문 보기</a></small>`};
  lb.innerHTML=`<div class="lbtop"><span class="lbn"></span><button type="button" class="lbx-x" aria-label="닫기">${NBI('x')}</button></div>
   <div class="lbtrack">${G.map(g=>`<div class="lbs"><img src="${g.img}" alt="" draggable="false"></div>`).join('')}</div>
   <button type="button" class="lbnav p" aria-label="이전 사진">${NBI('chevron-left')}</button><button type="button" class="lbnav n" aria-label="다음 사진">${NBI('chevron-right')}</button><div class="lbcap"></div>`;
  document.body.appendChild(lb);document.body.style.overflow='hidden';
  const tr=lb.querySelector('.lbtrack');let i=k,off=0,z=1,px=0,py=0;const P=new Map();let g0=null,tap=0;
  const img=()=>tr.children[i].querySelector('img');
  function set(anim){tr.style.transition=anim&&!RM()?'transform .38s cubic-bezier(.2,.8,.2,1)':'none';tr.style.transform=`translate3d(${-i*100}%,0,0) translateX(${off}px)`;
    [...tr.children].forEach((s,j)=>{const im=s.firstChild;im.style.transition=anim&&!RM()?'transform .3s':'none';im.style.transform=j===i?`translate(${px}px,${py}px) scale(${z})`:''});
    lb.querySelector('.lbn').textContent=`${i+1} / ${G.length}`;lb.querySelector('.lbcap').innerHTML=cap(G[i])}
  const to=j=>{i=clamp(j,0,G.length-1);off=0;z=1;px=py=0;set(true)};
  set(false);
  tr.addEventListener('pointerdown',e=>{tr.setPointerCapture(e.pointerId);P.set(e.pointerId,[e.clientX,e.clientY]);
    if(P.size===2){const[a,b]=[...P.values()];g0={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z,px,py,mx:(a[0]+b[0])/2,my:(a[1]+b[1])/2}}
    else g0={x:e.clientX,y:e.clientY,px,py,t:e.timeStamp}});
  tr.addEventListener('pointermove',e=>{if(!P.has(e.pointerId))return;P.set(e.pointerId,[e.clientX,e.clientY]);
    if(P.size===2&&g0.d){const[a,b]=[...P.values()];const nz=clamp(g0.z*Math.hypot(a[0]-b[0],a[1]-b[1])/g0.d,1,4);
      const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;px=g0.px+(mx-g0.mx);py=g0.py+(my-g0.my);z=nz;set(false)}
    else if(P.size===1&&g0&&g0.x!=null){const dx=e.clientX-g0.x,dy=e.clientY-g0.y;if(z>1){px=g0.px+dx;py=g0.py+dy}else off=dx*((i===0&&dx>0)||(i===G.length-1&&dx<0)?.3:1);set(false)}});
  const up=e=>{if(!P.has(e.pointerId))return;P.delete(e.pointerId);if(P.size)return;
    if(g0&&g0.x!=null&&z===1){const dx=e.clientX-g0.x,v=dx/Math.max(1,e.timeStamp-g0.t);
      if(Math.abs(dx)<6&&e.timeStamp-g0.t<250){if(e.timeStamp-tap<300){z=2.2;px=py=0;set(true);tap=0;return}tap=e.timeStamp}
      if(dx<-60||v<-.5)to(i+1);else if(dx>60||v>.5)to(i-1);else{off=0;set(true)}}
    else if(z<=1.02){z=1;px=py=0;set(true)}g0=null};
  tr.addEventListener('pointerup',up);tr.addEventListener('pointercancel',up);
  tr.addEventListener('wheel',e=>{e.preventDefault();z=clamp(z*(e.deltaY<0?1.15:.87),1,4);if(z===1)px=py=0;set(false)},{passive:false});
  tr.addEventListener('dblclick',()=>{z=z>1?1:2.2;px=py=0;set(true)});
  const close=()=>{lb.remove();document.body.style.overflow='';removeEventListener('keydown',kd);opener&&opener.focus()};
  const kd=e=>{if(e.key==='Escape')close();else if(e.key==='ArrowRight')to(i+1);else if(e.key==='ArrowLeft')to(i-1);else if(e.key==='Tab'){const f=[...lb.querySelectorAll('button,a')];const a=f.indexOf(document.activeElement);if(e.shiftKey&&a<=0){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&a===f.length-1){e.preventDefault();f[0].focus()}}};
  addEventListener('keydown',kd);
  lb.querySelector('.lbx-x').onclick=close;lb.querySelector('.p').onclick=()=>to(i-1);lb.querySelector('.n').onclick=()=>to(i+1);
  lb.querySelector('.lbx-x').focus()}
const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
})();
