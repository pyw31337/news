/* 뉴스 게임 3종 + 배지 모음 + 커리어 (assets/game.js 의 NBGame 사용). 오늘 데이터(data/today.json)의 키워드·인물이 게임 속 블록이 됨 */
(function(){
const $=s=>document.querySelector(s),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const G=window.NBGame,GI_=n=>window.GI?GI(n):'';
let D=null;const data=()=>D?Promise.resolve(D):fetch('data/today.json?'+Math.floor(Date.now()/6e5)).then(r=>r.json()).then(j=>D=j).catch(()=>D={issues:[],entities:[]});
const KW=()=>{const s=[];(D.issues||[]).forEach(i=>(i.keywords||[]).slice(0,3).forEach(k=>{if(k.length>=2&&!s.includes(k))s.push(k)}));return s};
const PPL=()=>(D.entities||[]).filter(e=>e.type==='person').map(e=>e.name).slice(0,12);
const best=(k)=>+(localStorage.getItem('nb-gbest-'+k)||0),setBest=(k,v)=>{if(v>best(k))localStorage.setItem('nb-gbest-'+k,v)};
function hero(){$('#gxlv').innerHTML=`<small class="gx-eyebrow">PLAY THE NEWS</small><h1>뉴스로 놀고, <span class="ds-key">배지를 모으세요</span></h1>${G.lvCard()}`}
/* ================= 1) 이슈 2048 ================= */
const LAD=['제보','단신','기사','심층','단독','특종','1면','헤드라인','호외','세계 뉴스','퓰리처'];
const COL=['#eef1f7','#e3e8ff','#cfe0ff','#b6f0e0','#ffe6a8','#ffc978','#ff9d6b','#ff6b4a','#e2448e','#7a4dff','#0f1630'];
function g2048(el){const N=4;let B,score=0,over=false,maxL=0;const K=KW();
  const empty=()=>{const a=[];B.forEach((r,y)=>r.forEach((v,x)=>{if(!v)a.push([y,x])}));return a};
  const add=()=>{const e=empty();if(!e.length)return;const[y,x]=e[Math.random()*e.length|0];B[y][x]=Math.random()<.88?1:2};
  const reset=()=>{B=Array.from({length:N},()=>Array(N).fill(0));score=0;over=false;maxL=0;add();add();draw()};
  function slide(row){const a=row.filter(v=>v),o=[];for(let i=0;i<a.length;i++){if(a[i]===a[i+1]){const n=a[i]+1;o.push(n);score+=Math.pow(2,n);if(n>maxL){maxL=n;if(n>=5)toastIssue(n)}i++}else o.push(a[i])}while(o.length<N)o.push(0);return o}
  function move(d){if(over)return;const old=JSON.stringify(B);
    for(let i=0;i<N;i++){let line=d==='L'||d==='R'?B[i].slice():B.map(r=>r[i]);if(d==='R'||d==='D')line.reverse();line=slide(line);if(d==='R'||d==='D')line.reverse();
      if(d==='L'||d==='R')B[i]=line;else line.forEach((v,y)=>B[y][i]=v)}
    if(JSON.stringify(B)!==old){add();draw();if(!canMove()){over=true;end()}}}
  const canMove=()=>empty().length||B.some((r,y)=>r.some((v,x)=>(x<N-1&&v===r[x+1])||(y<N-1&&v===B[y+1][x])));
  function toastIssue(n){const i=(D.issues||[])[(n-5)%Math.max(1,(D.issues||[]).length)];const t=el.querySelector('.g2-news');if(i&&t){t.innerHTML=`${GI_('sparkles')}<b>${LAD[n-1]} 달성!</b> 오늘의 이슈 <a href="issue/${i.id}">${E(i.title)}</a>`;t.classList.remove('on');void t.offsetWidth;t.classList.add('on')}}
  function draw(){el.querySelector('.g2-b').innerHTML=B.flat().map(v=>v?`<div class="g2-t l${v}" style="--bg:${COL[v-1]};--fg:${v>=6?'#fff':'#0f1630'}"><b>${LAD[v-1]}</b><small>${E(K[(v-1)%Math.max(1,K.length)]||'')}</small></div>`:'<div class="g2-t e"></div>').join('');
    el.querySelector('.g2-s').textContent=score.toLocaleString();setBest('2048',score);el.querySelector('.g2-bs').textContent=best('2048').toLocaleString()}
  function end(){const xp=G.play('2048',score/80,['g2048',maxL,1]);el.querySelector('.g2-over').innerHTML=`<div><h3>게임 끝!</h3><p>최고 단계 <b>${LAD[maxL-1]||'-'}</b> · 점수 <b>${score.toLocaleString()}</b></p><p class="xp">+${xp} XP</p><button type="button" class="gm-btn" data-re>다시 하기</button></div>`;el.querySelector('.g2-over').classList.add('on')}
  el.innerHTML=`<div class="gx-gh"><div><h2>이슈 2048</h2><p>같은 단계끼리 밀어 합치면 <b>제보 → 단신 → … → 퓰리처</b>. 블록 아래 작은 글씨는 오늘의 키워드예요.</p></div><div class="gx-sc"><span>점수<b class="g2-s">0</b></span><span>최고<b class="g2-bs">0</b></span></div></div>
   <div class="g2-wrap"><div class="g2-b"></div><div class="g2-over"></div></div><div class="g2-news" aria-live="polite"></div>
   <div class="gx-ctl"><button type="button" class="gm-btn ghost" data-re>${GI_('refresh')}새 게임</button><button type="button" class="gm-btn ghost" data-end>여기서 끝내고 XP 받기</button></div>`;
  el.addEventListener('click',e=>{if(e.target.closest('[data-re]')){el.querySelector('.g2-over').classList.remove('on');reset()}if(e.target.closest('[data-end]')&&!over){over=true;end()}});
  const kb=e=>{const m={ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D'}[e.key];if(m&&el.isConnected){e.preventDefault();move(m)}};addEventListener('keydown',kb);
  let sx,sy;const w=el.querySelector('.g2-wrap');w.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});
  w.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
  w.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;move(Math.abs(dx)>Math.abs(dy)?(dx>0?'R':'L'):(dy>0?'D':'U'))});
  reset()}
/* ================= 2) 뉴스 머지(과일 머지 방식) ================= */
const MC=['#ffb020','#ff7a59','#e2448e','#7a4dff','#2f6bff','#11a683','#00a3c4','#ff4d2e','#0f1630'];
function merge(el){const P=PPL(),K=KW(),labels=(P.length>=6?P:P.concat(K)).slice(0,9);while(labels.length<9)labels.push(['단신','기사','심층','단독','특종','1면','헤드라인','호외','퓰리처'][labels.length]);
  el.innerHTML=`<div class="gx-gh"><div><h2>뉴스 머지</h2><p>탭한 자리로 공을 떨어뜨려요. <b>같은 인물끼리 닿으면 합쳐져</b> 더 큰 화제가 돼요. 선을 넘으면 끝!</p></div><div class="gx-sc"><span>점수<b class="mg-s">0</b></span><span>최고<b class="mg-bs">${best('merge').toLocaleString()}</b></span></div></div>
   <div class="mg-wrap"><canvas class="mg-c"></canvas><div class="g2-over mg-over"></div></div><div class="mg-next"></div>`;
  const cv=el.querySelector('canvas'),ctx=cv.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1);const W=Math.min(420,cw(el.querySelector('.mg-wrap').parentElement)||360),H=Math.round(W*1.35);cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';ctx.scale(dpr,dpr);
  const R=l=>W*(.045+l*.028);let O=[],score=0,next=0,cool=0,over=false,dangerT=0,raf;const LINE=H*.16;
  const pick=()=>Math.random()*4|0;next=pick();
  const drawNext=()=>el.querySelector('.mg-next').innerHTML=`다음 <i style="background:${MC[next]}"></i><b>${E(labels[next])}</b>`;drawNext();
  cv.addEventListener('pointerdown',e=>{if(over||cool>0)return;const r=cv.getBoundingClientRect();const x=Math.max(R(next),Math.min(W-R(next),e.clientX-r.left));O.push({x,y:LINE-R(next)-4,px:x,py:LINE-R(next)-4,l:next,born:performance.now()});next=pick();drawNext();cool=22});
  function step(){const g=.32;for(const o of O){const vx=(o.x-o.px)*.99,vy=(o.y-o.py)*.99;o.px=o.x;o.py=o.y;o.x+=vx;o.y+=vy+g}
    for(let it=0;it<4;it++){for(let i=0;i<O.length;i++){const a=O[i],ra=R(a.l);if(a.y>H-ra)a.y=H-ra;if(a.x<ra)a.x=ra;if(a.x>W-ra)a.x=W-ra;
      for(let j=i+1;j<O.length;j++){const b=O[j],rb=R(b.l),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01,m=ra+rb;if(d<m){
        if(a.l===b.l&&a.l<8&&!a.dead&&!b.dead){a.dead=b.dead=1;const n={x:(a.x+b.x)/2,y:(a.y+b.y)/2,l:a.l+1,born:performance.now(),pop:1};n.px=n.x;n.py=n.y;O.push(n);score+=(a.l+1)*(a.l+2)*5;try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}continue}
        const p=(m-d)/2,nx=dx/d,ny=dy/d;a.x-=nx*p;a.y-=ny*p;b.x+=nx*p;b.y+=ny*p}}}O=O.filter(o=>!o.dead)}
    if(cool>0)cool--;const now=performance.now();const danger=O.some(o=>now-o.born>1500&&o.y-R(o.l)<LINE);dangerT=danger?dangerT+1:0;if(dangerT>110&&!over){over=true;fin()}}
  function draw(){ctx.clearRect(0,0,W,H);const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#f7f8fc');gr.addColorStop(1,'#e9ecf6');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=dangerT>0?'#ff4d2e':'#c9cfdd';ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(0,LINE);ctx.lineTo(W,LINE);ctx.stroke();ctx.setLineDash([]);
    for(const o of O){const r=R(o.l)*(o.pop?Math.min(1,.6+(performance.now()-o.born)/250):1);const g2=ctx.createRadialGradient(o.x-r*.35,o.y-r*.4,r*.1,o.x,o.y,r);g2.addColorStop(0,'#ffffffaa');g2.addColorStop(.25,MC[o.l]);g2.addColorStop(1,MC[o.l]);
      ctx.fillStyle=g2;ctx.beginPath();ctx.arc(o.x,o.y,r,0,7);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#ffffffb0';ctx.stroke();
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';const t=labels[o.l];ctx.font=`800 ${Math.max(10,Math.min(r*.55,r*1.6/Math.max(2,t.length)))}px Pretendard Variable,Pretendard,sans-serif`;ctx.fillText(t,o.x,o.y)}
    el.querySelector('.mg-s').textContent=score.toLocaleString()}
  function loop(){if(!el.isConnected)return cancelAnimationFrame(raf);if(!over)step();draw();raf=requestAnimationFrame(loop)}loop();
  function fin(){setBest('merge',score);const xp=G.play('merge',score/60,['merge',score,1]);const ov=el.querySelector('.mg-over');ov.innerHTML=`<div><h3>화제가 넘쳤어요!</h3><p>점수 <b>${score.toLocaleString()}</b></p><p class="xp">+${xp} XP</p><button type="button" class="gm-btn" data-re>다시 하기</button></div>`;ov.classList.add('on');
    ov.querySelector('[data-re]').onclick=()=>{cancelAnimationFrame(raf);merge(el)}}}
/* ================= 3) 팩트 새총(앵그리버드 방식) ================= */
function sling(el,lv=1){const K=KW();const RUM=['루머','카더라','조작','가짜','짜깁기','허위','과장'];
  el.innerHTML=`<div class="gx-gh"><div><h2>팩트 새총 <small>${lv}단계</small></h2><p>공을 뒤로 당겼다 놓아 <b>루머 블록</b>을 깨뜨리세요. 파란 <b>사실 블록</b>은 지켜야 해요. 기회는 3번!</p></div><div class="gx-sc"><span>깬 루머<b class="sl-s">0</b></span><span>남은 공<b class="sl-n">3</b></span></div></div>
   <div class="mg-wrap"><canvas class="sl-c"></canvas><div class="g2-over sl-over"></div></div>`;
  const cv=el.querySelector('canvas'),ctx=cv.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1);const W=Math.min(640,cw(el.querySelector('.mg-wrap').parentElement)||360),H=Math.round(W*.68);cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';ctx.scale(dpr,dpr);
  const GY=H-26,S0={x:W*.16,y:GY-H*.28},br=W*.028;let ball=null,drag=null,shots=3,broken=0,parts=[],raf,done=false;
  const bw=W*.085,bh=H*.1;const B=[];const cols=2+Math.min(3,lv);const x0=W*.58;
  for(let c=0;c<cols;c++){const hgt=2+((c+lv)%3);for(let r=0;r<hgt;r++){const fact=(r+c+lv)%4===0;B.push({x:x0+c*(bw+6),y:GY-(r+1)*bh,w:bw,h:bh,vy:0,fact,t:fact?(K[(r*3+c)%Math.max(1,K.length)]||'사실'):RUM[(r+c*2+lv)%RUM.length]})}}
  const total=B.filter(b=>!b.fact).length;
  const pos=e=>{const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
  cv.addEventListener('pointerdown',e=>{if(ball||!shots||done)return;const p=pos(e);if(Math.hypot(p.x-S0.x,p.y-S0.y)<W*.15){drag=p;cv.setPointerCapture(e.pointerId)}});
  cv.addEventListener('pointermove',e=>{if(drag){const p=pos(e),dx=p.x-S0.x,dy=p.y-S0.y,d=Math.hypot(dx,dy),m=W*.13;drag=d>m?{x:S0.x+dx/d*m,y:S0.y+dy/d*m}:p}});
  cv.addEventListener('pointerup',()=>{if(!drag)return;const k=.2;ball={x:drag.x,y:drag.y,vx:(S0.x-drag.x)*k,vy:(S0.y-drag.y)*k,life:0};drag=null;shots--;el.querySelector('.sl-n').textContent=shots});
  function burst(b){for(let i=0;i<14;i++)parts.push({x:b.x+b.w/2,y:b.y+b.h/2,vx:(Math.random()-.5)*7,vy:-Math.random()*6,c:b.fact?'#2f6bff':'#ff4d2e',l:40})}
  function step(){if(ball){ball.vy+=.25;ball.x+=ball.vx;ball.y+=ball.vy;ball.life++;if(ball.y>GY-br){ball.y=GY-br;ball.vy*=-.35;ball.vx*=.8}
      for(const b of B){if(b.gone)continue;const cx=Math.max(b.x,Math.min(ball.x,b.x+b.w)),cy=Math.max(b.y,Math.min(ball.y,b.y+b.h));if(Math.hypot(ball.x-cx,ball.y-cy)<br){const sp=Math.hypot(ball.vx,ball.vy);
        if(sp>3.2){b.gone=1;burst(b);if(!b.fact){broken++;el.querySelector('.sl-s').textContent=broken}else shake=10;ball.vx*=.6;ball.vy*=.6}else{ball.vx*=-.3}}}
      if(ball.x>W+40||ball.x<-40||ball.life>320||(Math.abs(ball.vx)<.15&&ball.y>=GY-br-1))ball=null}
    for(const b of B){if(b.gone)continue;const below=B.filter(o=>!o.gone&&o!==b&&o.x<b.x+b.w-2&&o.x+o.w>b.x+2&&o.y>=b.y+b.h-1);const floor=Math.min(GY,...below.map(o=>o.y));
      if(b.y+b.h<floor-.5){b.vy+=.4;b.y=Math.min(floor-b.h,b.y+b.vy);if(b.y+b.h>=floor-.5){if(b.vy>7&&!b.fact){b.gone=1;burst(b);broken++;el.querySelector('.sl-s').textContent=broken}b.vy=0}}}
    parts.forEach(p=>{p.vy+=.25;p.x+=p.vx;p.y+=p.vy;p.l--});parts=parts.filter(p=>p.l>0);
    if(!done&&!ball&&(broken>=total||!shots)&&!parts.length){done=true;setTimeout(fin,400)}}
  let shake=0;
  function draw(){ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,0);shake--}const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#dff0ff');g.addColorStop(1,'#fff6e6');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#c7e8b5';ctx.fillRect(0,GY,W,H-GY);ctx.fillStyle='#9fd18a';ctx.fillRect(0,GY,W,4);
    ctx.strokeStyle='#8a5426';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(S0.x,GY);ctx.lineTo(S0.x,S0.y+16);ctx.moveTo(S0.x,S0.y+16);ctx.lineTo(S0.x-12,S0.y-8);ctx.moveTo(S0.x,S0.y+16);ctx.lineTo(S0.x+12,S0.y-8);ctx.stroke();
    const bp=drag||(!ball&&shots?S0:null);if(bp){ctx.strokeStyle='#5b3a1a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(S0.x-12,S0.y-8);ctx.lineTo(bp.x,bp.y);ctx.lineTo(S0.x+12,S0.y-8);ctx.stroke();ball0(bp.x,bp.y);
      if(drag){ctx.fillStyle='#0f163055';let x=drag.x,y=drag.y,vx=(S0.x-drag.x)*.2,vy=(S0.y-drag.y)*.2;for(let i=0;i<26;i++){vy+=.25*3;x+=vx*3;y+=vy*3;if(i%2)continue;ctx.beginPath();ctx.arc(x,y,2.5,0,7);ctx.fill()}}}
    if(ball)ball0(ball.x,ball.y);
    for(const b of B){if(b.gone)continue;ctx.fillStyle=b.fact?'#2f6bff':'#ff4d2e';ctx.strokeStyle='#ffffffcc';ctx.lineWidth=2;rr(b.x,b.y,b.w,b.h,6);ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';ctx.font=`800 ${Math.min(13,b.w/Math.max(2,b.t.length)*1.2)}px Pretendard Variable,Pretendard,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.t,b.x+b.w/2,b.y+b.h/2)}
    parts.forEach(p=>{ctx.fillStyle=p.c;ctx.globalAlpha=p.l/40;ctx.fillRect(p.x,p.y,4,4)});ctx.globalAlpha=1;ctx.restore()}
  function ball0(x,y){const g=ctx.createRadialGradient(x-3,y-3,1,x,y,br);g.addColorStop(0,'#fff');g.addColorStop(.3,'#ffb020');g.addColorStop(1,'#e07a00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,br,0,7);ctx.fill()}
  function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function loop(){if(!el.isConnected)return;step();draw();raf=requestAnimationFrame(loop)}loop();
  function fin(){const st=broken>=total?3:broken>=total*.6?2:broken?1:0;const xp=G.play('sling',broken*4+st*6,['sling',broken]);const ov=el.querySelector('.sl-over');
    ov.innerHTML=`<div><div class="sl-stars">${[0,1,2].map(i=>`<span class="${i<st?'on':''}">${GI_('star')}</span>`).join('')}</div><h3>${st===3?'루머 완전 정복!':st?'잘했어요!':'다시 도전!'}</h3><p>루머 <b>${broken}/${total}</b>개를 깼어요</p><p class="xp">+${xp} XP</p><button type="button" class="gm-btn" data-nx>${st?'다음 단계':'다시 하기'}</button></div>`;ov.classList.add('on');
    ov.querySelector('[data-nx]').onclick=()=>{cancelAnimationFrame(raf);sling(el,st?lv+1:lv)}}}
const cw=n=>{const c=getComputedStyle(n);return n.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight)};
/* ================= 배지 모음 · 커리어 ================= */
function badges(v){const T=window.NBTaste;const L=G.B.map(b=>({b,r:T.req(b)}));const got=L.filter(x=>x.r.t>=0).length;
  let seen={};try{seen=JSON.parse(localStorage.getItem('nb-stamp')||'{}')}catch(e){}
  // 모은 것 먼저, 그다음 거의 다 모은 순
  L.sort((x,y)=>(y.r.t>=0)-(x.r.t>=0)||y.r.pct-x.r.pct);
  v.innerHTML=`<div class="gx-bh"><h2>배지 우표첩 <b>${got}</b><span>/ ${L.length}</span></h2><p>빈 자리는 아직 모으지 못한 배지예요. 조건을 채우면 그 자리에 메달이 찍혀요. 배지를 누르면 남은 목표와 내 기록 분석을 볼 수 있어요.</p></div>
   <div class="sb-page"><div class="sb-grid">${L.map(({b,r})=>{const on=r.t>=0,fresh=on&&(seen[b[0]]==null||seen[b[0]]<r.t),C=on?G.TIERS[b[7]!=null?b[7]:Math.min(r.t,6)]:null;
     return`<button type="button" class="sb-st ${on?'got':''} ${fresh?'fresh':''}" data-b="${b[0]}" aria-label="${E(b[1])} 배지 자세히">${on?`<span class="sb-tier" style="--c:${C[1]}">${b[7]!=null?'스페셜':C[0]}</span>`:''}
      <span class="sb-slot"><span class="sb-m">${G.medal(b,r.t,92)}</span></span><h3>${E(b[1])}</h3><span class="sb-req">${r.done?'모든 등급을 모았어요':E(r.label)}</span>
      <span class="sb-pb" role="progressbar" aria-valuenow="${r.pct}" aria-valuemin="0" aria-valuemax="100"><i style="--p:${r.pct}%"></i></span><span class="sb-num"><b>${r.v.toLocaleString()}</b> / ${r.goal.toLocaleString()}${r.done?'':` · ${r.left.toLocaleString()}${r.unit} 남음`}</span></button>`}).join('')}</div></div>`;
  L.forEach(({b,r})=>{if(r.t>=0)seen[b[0]]=r.t});setTimeout(()=>localStorage.setItem('nb-stamp',JSON.stringify(seen)),1500);
  v.querySelector('.sb-grid').onclick=e=>{const x=e.target.closest('[data-b]');if(x)sheet(G.B.find(b=>b[0]===x.dataset.b))}}
function sheet(b){const T=window.NBTaste,r=T.req(b);const w=document.createElement('div');w.className='sb-sheet';
  w.innerHTML=`<div class="sb-sh" role="dialog" aria-label="${E(b[1])}"><div class="sb-top">${G.medal(b,r.t,84)}<div><h2>${E(b[1])}</h2><p>${E(b[2])}</p></div><button type="button" class="sb-x" aria-label="닫기">${GI('x')}</button></div>
   <div class="sb-goal"><h4>${r.done?'모든 등급 달성':'다음 목표 · '+E(r.label)}</h4><span class="sb-stat">${GI('chart-bar')}필요한 기록: ${E(r.stat)}</span>
    <div class="sb-big"><b>${r.v.toLocaleString()}</b><span>/ ${r.goal.toLocaleString()}${r.unit}</span><em>${r.done?'완료':r.left.toLocaleString()+r.unit+' 남음'}</em></div><span class="sb-pb"><i style="--p:${r.pct}%"></i></span>
    <ul class="sb-lad">${b[6].map((x,k)=>{const C=G.TIERS[b[7]!=null?b[7]:Math.min(k,6)];return`<li class="${k<=r.t?'on':''}" style="--c:${C[1]}"><i></i>${b[7]!=null?'스페셜':C[0]} · ${E((T.REQ[b[5]]||['','{n}'])[1].replace('{n}',x.toLocaleString()))}${k<=r.t?GI('check'):''}</li>`}).join('')}</ul></div>
   ${r.src?`<div class="sb-an"><h4>${GI('chart-donut')}${r.src==='save'?'내가 모은 기사 분석':'지금까지 읽은 기사 분석'}</h4>${T.html(r.src,{hours:b[5]==='night'||b[5]==='morning'||b[5]==='read'})}</div>`:''}</div>`;
  document.body.appendChild(w);r.src&&T.seen();const close=()=>w.remove();w.onclick=e=>{if(e.target===w||e.target.closest('.sb-x'))close()};addEventListener('keydown',function k(e){if(e.key==='Escape'){close();removeEventListener('keydown',k)}})}
function careerV(v){const n=G.level(G.totalXP());v.innerHTML=`<div class="gx-bh"><h2>나의 커리어</h2><p>XP가 쌓이면 레벨이 오르고, 신문사 직함이 바뀌어요.</p></div>
  <ol class="gx-cr">${G.CAREER.map((c,k)=>{const nx=G.CAREER[k+1],on=n>=c[0]&&(!nx||n<nx[0]),past=nx&&n>=nx[0];return`<li class="${on?'on':past?'past':''}"><span class="lv">Lv.${c[0]}</span><b>${E(c[1])}</b><small>${E(c[2])}</small>${on?'<em>지금 여기</em>':''}</li>`}).join('')}</ol>
  <div class="gx-bh"><h2>XP 얻는 방법</h2></div><div class="gx-xp"><div><b>+5</b><span>이슈 읽기</span></div><div><b>+10</b><span>OX·단어 퀴즈 정답 (3연속 +5)</span></div><div><b>+5~60</b><span>뉴스 게임 한 판</span></div><div><b>+20</b><span>하루 퀴즈 만점</span></div></div><p class="gx-fine">게임·활동 XP는 하루 400까지 쌓여요. 퀴즈 XP는 따로예요.</p>`}
/* ================= 화면 전환 ================= */
const GM={'2048':g2048,merge,sling};
function route(){const h=(location.hash.slice(1)||'play');const t=GM[h]?'play':h;document.querySelectorAll('#gxt a').forEach(a=>a.classList.toggle('on',a.dataset.t===t));hero();const v=$('#gxv');
  if(GM[h]){v.innerHTML=`<div class="gx-pick">${G.gameTiles().replace(/gm-gt/g,'gm-gt lt')}</div><div class="gx-game"></div>`;v.querySelectorAll('.gx-pick a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='games/#'+h));data().then(()=>GM[h](v.querySelector('.gx-game')));setTimeout(()=>v.querySelector('.gx-game').scrollIntoView({behavior:'smooth',block:'start'}),60);return}
  if(t==='badges')return badges(v);if(t==='career')return careerV(v);
  v.innerHTML=`<div class="gx-pick big">${G.gameTiles().replace(/gm-gt/g,'gm-gt lt')}</div><div class="gx-bh"><h2>오늘의 목표</h2></div><div class="gx-goal">${G.goals()}</div>`}
addEventListener('hashchange',route);route();
})();
