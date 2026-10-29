/* NewsBoard 게이미피케이션 v1 — XP·레벨(커리어)·연속 기록·배지(메달)·오늘의 도전 (기획: docs/GAMIFICATION.md)
   로컬 우선: localStorage 'nb-game'. 로그인 시 내 서재 동기화(M.game, 한 줄)로 배지·레벨이 바뀔 때만 저장 → D1 쓰기 최소. */
(function(){
const K='nb-game',E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const G_=n=>window.GI?GI(n):'';
const dayK=(t)=>new Date((t||Date.now())+9*36e5).toISOString().slice(0,10);
const DEF={v:1,xp:0,ev:{},badges:{},daily:{},streak:0,best:0,last:'',at:0};
let S=Object.assign(JSON.parse(JSON.stringify(DEF)),JSON.parse(localStorage.getItem(K)||'{}'));
const learn=()=>{try{return JSON.parse(localStorage.getItem('nb-learn')||'{}')}catch(e){return{}}};
/* ---------- 커리어(레벨) ---------- */
const lvXP=n=>Math.round(40*n*(n-1)+ (n>1?20*(n-1):0));      // 1→0, 2→100, 3→280, 5→880, 10→3780, 20→15580
const totalXP=()=>S.xp+(learn().xp||0);
const level=x=>{let n=1;while(lvXP(n+1)<=x)n++;return n};
const CAREER=[[1,'인턴 기자','신문을 처음 펼친 새내기'],[3,'수습 기자','매일 뉴스를 따라가는 중'],[6,'기자','사건의 흐름을 읽는 사람'],[10,'차장','맥락까지 꿰뚫는 독자'],[15,'부장','이슈를 한눈에 정리하는 눈'],[20,'논설위원','관점을 비교할 줄 아는 사람'],[30,'편집국장','오늘의 뉴스를 고르는 사람'],[40,'발행인','뉴스 세계의 주인공']];
const career=n=>CAREER.filter(c=>n>=c[0]).pop();
/* ---------- 메달 등급 ---------- */
const TIERS=[['브론즈','#c98a4b','#8a5426','#f3c79a'],['실버','#c7ced8','#7d8796','#f4f7fb'],['골드','#ffcc3d','#c88a00','#fff1b0'],['플래티넘','#7fe0d4','#2a9d93','#e4fffb'],['다이아','#8fb6ff','#3b5bff','#eaf1ff'],['마스터','#c18bff','#7a2fe0','#f4e8ff'],['레전드','#ff7a59','#d6203b','#ffe0d6']];
/* ---------- 배지 정의: id, 이름, 설명, 아이콘, 모양, 측정값, 등급별 기준 ---------- */
const B=[
 ['hello','계정 개설 축하','NewsBoard에 첫 발을 내디뎠어요','user-plus','star','signup',[1],2],
 ['read','열독가','기사(이슈)를 읽은 수','news','circle','read',[1,10,30,50,100,300,1000]],
 ['streak','연속 출석','며칠 연속으로 뉴스를 봤는지','flame','shield','streak',[3,7,14,30,100,365]],
 ['quiz','OX 마스터','퀴즈를 맞힌 수','checks','hex','quiz_ok',[10,50,100,300,1000]],
 ['perfect','만점왕','하루 퀴즈를 모두 맞힌 날','crown','star','perfect',[1,5,20,50]],
 ['words','단어 수집가','퀴즈로 익힌 단어 수','book-2','hex','words',[10,50,100,300,1000]],
 ['balance','균형 잡힌 독자','읽은 분야 수(정치·경제·사회…)','chart-bubble','circle','cats',[3,5,7,9]],
 ['history','기록 탐험가','기록 보관소에서 과거를 찾아본 횟수','timeline-event','shield','hist',[1,10,50]],
 ['deck','카드 넘기기','오늘의 카드 덱을 넘긴 수','sparkles','circle','deck',[10,100,500,2000]],
 ['save','스크랩북','내 서재에 저장한 기사 수','bookmarks','shield','saves',[1,10,50,200]],
 ['follow','인물 추적자','팔로우한 인물·키워드 수','eye','hex','follows',[1,5,20]],
 ['gamer','게임 기자단','뉴스 게임을 한 판 수','device-gamepad-2','star','plays',[1,10,50,200]],
 ['g2048','이슈 2048','이슈 2048에서 만든 가장 큰 블록 단계','grid-4x4','hex','g2048',[6,8,10,11]],
 ['merge','뉴스 머지','뉴스 머지 최고 점수','circles','circle','merge',[300,1500,5000,12000]],
 ['sling','팩트 새총','팩트 새총에서 깨뜨린 루머 블록 수','target-arrow','shield','sling',[5,30,100,400]],
 ['owl','올빼미 독자','밤 11시 이후에 읽은 날','moon','circle','night',[1,7,30]],
 ['bird','아침형 독자','오전 7시 전에 읽은 날','sun-high','circle','morning',[1,7,30]],
 ['deckall','완주 스캐너','오늘의 카드 10장을 끝까지 넘겨 훑어본 날','cards','star','deckall',[1,7,30,100]],
 ['later','나중에 읽기','나중에 읽기로 담아 둔 기사 수','bookmark-plus','shield','later',[1,10,50,200]],
 ['taste','나를 아는 독자','나의 성향 분석을 열어 본 날','user-search','hex','taste',[1,7,30]],
 ['level','커리어 성장','도달한 레벨','rocket','star','level',[5,10,20,30,40]]
];
const myRO=()=>{try{return JSON.parse(localStorage.getItem('nb-my')||'null')}catch(e){return null}};
const metric=m=>{const ev=S.ev||{},My=window.NBMy&&NBMy.get?NBMy.get():myRO(),L=learn();
  switch(m){case 'signup':return localStorage.getItem('nb-tok')?1:0;
   case 'read':return My?Object.values(My.reads||{}).reduce((a,d)=>a+Object.keys(d).length,0):ev.read||0;
   case 'streak':return Math.max(S.best||0,L.best||0);
   case 'cats':{if(!My)return ev.cats||0;const c=new Set();Object.values(My.reads||{}).forEach(d=>Object.values(d).forEach(r=>r.c&&c.add(r.c)));return c.size}
   case 'later':return My?Object.values(My.saves||{}).filter(x=>x.later||x.col==='c0').length:ev.later||0;
   case 'saves':return My?Object.keys(My.saves||{}).length:ev.saves||0;
   case 'follows':return My?Object.keys(My.follows||{}).length+(My.keywords||[]).length:ev.follows||0;
   case 'words':return Math.max(ev.words||0,Object.keys(ev.wordset||{}).length);
   case 'level':return level(totalXP());
   default:return ev[m]||0}};
const tierOf=(b)=>{const v=metric(b[5]);let t=-1;b[6].forEach((x,k)=>{if(v>=x)t=k});return{t,v,next:b[6][t+1]}};
const tierColor=(b,t)=>TIERS[b[7]!=null?b[7]:Math.min(t,TIERS.length-1)];
/* ---------- 메달 SVG (등급색 그라데이션 + 리본 + 모양 + Tabler 아이콘) ---------- */
let uid=0;
/* 등급별 금속 팔레트: 하이라이트, 밝은 면, 기본, 그림자, 가장자리(두께) */
const METAL=[['#ffe2c2','#e9a46a','#b8743d','#7a4520','#4e2a12'],['#ffffff','#e8edf3','#b9c2cf','#7d8796','#4c5563'],['#fff6c9','#ffd54a','#e0a400','#9a6a00','#5e3f00'],['#ffffff','#dff7f3','#a8d8d2','#5f9e98','#335f5b'],['#ffffff','#d9ecff','#8fc3ff','#3f6fe0','#1d3480'],['#fbefff','#d9b0ff','#a66bf0','#6a2fc0','#3b1677'],['#fff1d8','#ff9c6b','#e2453b','#9c1630','#5a0a1c']];
const SH={circle:'<circle cx="50" cy="52" r="33"/>',hex:'<path d="M50 17l31 17.5v35L50 87 19 69.5v-35z"/>',shield:'<path d="M50 17l30 10v23c0 21-13 32-30 38-17-6-30-17-30-38V27z"/>',star:'<path d="M50 15l9 11 14-3 1 14 12 7-7 12 7 12-12 7-1 14-14-3-9 11-9-11-14 3-1-14-12-7 7-12-7-12 12-7 1-14 14 3z"/>'};
function medal(b,t,size=88){const on=t>=0,ti=on?(b[7]!=null?b[7]:Math.min(t,6)):(b[7]!=null?b[7]:0),
  src=`assets/badges/${b[0]}-${ti}${size<=64?'-s':''}.webp`;
  return`<span class="gm-medal ${on?'on':'off'} gm-t${ti}" style="width:${size}px;height:${size}px;--mk:url(${src})" aria-hidden="true"><img src="${src}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async" draggable="false"><i class="gm-glint"></i></span>`}
/* ---------- 상태 저장·동기화(변경 시에만) ---------- */
let pushT=null;
const save=(important)=>{S.at=Date.now();localStorage.setItem(K,JSON.stringify(S));if(important)push()};
function push(){clearTimeout(pushT);pushT=setTimeout(()=>{const My=window.NBMy&&NBMy.get&&NBMy.get();if(!My)return;
  const c={xp:S.xp,streak:S.streak,best:S.best,last:S.last,badges:S.badges,ev:Object.fromEntries(Object.entries(S.ev).filter(([k])=>k!=='wordset')),at:S.at};
  if(JSON.stringify(My.game)===JSON.stringify(c))return;My.game=c;NBMy.save()},3000)}
function mergeG(a,b){if(!a)return b;if(!b)return a;const o=Object.assign({},a);o.xp=Math.max(a.xp||0,b.xp||0);o.best=Math.max(a.best||0,b.best||0);
  const n=(a.at||0)>=(b.at||0)?a:b;o.streak=n.streak;o.last=n.last;o.ev=Object.assign({},b.ev);Object.entries(a.ev||{}).forEach(([k,v])=>{o.ev[k]=typeof v==='number'?Math.max(v,(b.ev||{})[k]||0):v});
  o.badges=Object.assign({},b.badges);Object.entries(a.badges||{}).forEach(([k,v])=>{if(!o.badges[k]||v.t>o.badges[k].t)o.badges[k]=v});o.at=Math.max(a.at||0,b.at||0);return o}
window.NBGameMerge=mergeG;
/* ---------- 이벤트 → XP·배지 ---------- */
const DCAP=400; // 하루 게임·활동 XP 상한(퀴즈 XP는 배우기 쪽에서 따로)
function touchDay(){const t=dayK();if(S.last===t)return;const y=dayK(Date.now()-864e5);S.streak=S.last===y?S.streak+1:1;S.best=Math.max(S.best,S.streak);S.last=t;
  const h=new Date(Date.now()+9*36e5).getUTCHours();if(h>=23)S.ev.night=(S.ev.night||0)+1;if(h<7)S.ev.morning=(S.ev.morning||0)+1}
function addXP(n,why){const t=dayK();const d=S.daily[t]||(S.daily[t]={xp:0,g:0,q:0,r:0});const can=Math.max(0,Math.min(n,DCAP-d.xp));d.xp+=can;S.xp+=can;
  Object.keys(S.daily).sort().slice(0,-14).forEach(k=>delete S.daily[k]);if(can&&why)pop(`+${can} XP`,why);return can}
function ev(name,val,opt={}){touchDay();const lv0=level(totalXP());
  if(opt.max)S.ev[name]=Math.max(S.ev[name]||0,val);else S.ev[name]=(S.ev[name]||0)+(val==null?1:val);
  const d=S.daily[dayK()]||(S.daily[dayK()]={xp:0,g:0,q:0,r:0});if(opt.day)d[opt.day]=(d[opt.day]||0)+1;
  if(opt.xp)addXP(opt.xp,opt.why);check(lv0);save(true)}
function check(lv0){const got=[];B.forEach(b=>{const{t}=tierOf(b);const had=(S.badges[b[0]]||{t:-1}).t;if(t>had){S.badges[b[0]]={t,at:Date.now()};got.push([b,t])}});
  const lv=level(totalXP());if(lv0&&lv>lv0)setTimeout(()=>celebrate({lv}),got.length?2600:200);
  got.slice(-2).forEach(([b,t],k)=>setTimeout(()=>celebrate({b,t}),k*2400));if(got.length)save(true)}
/* ---------- 연출: XP 알림 · 배지 획득 ---------- */
function pop(t,s){const e=document.createElement('div');e.className='gm-pop';e.innerHTML=`<b>${E(t)}</b><span>${E(s||'')}</span>`;document.body.appendChild(e);setTimeout(()=>e.remove(),1900)}
function celebrate(o){const w=document.createElement('div');w.className='gm-cele';
  const conf=Array.from({length:26},(_,k)=>`<i style="--x:${(Math.random()*2-1)*160}px;--y:${-60-Math.random()*160}px;--r:${Math.random()*720}deg;--c:${['#ff4d2e','#ffb020','#2f6bff','#11a683','#7a4dff','#e2448e'][k%6]};--d:${Math.random()*.25}s"></i>`).join('');
  if(o.b){const T=tierColor(o.b,o.t);w.innerHTML=`<div class="gm-cc" role="dialog" aria-label="배지 획득"><div class="gm-burst">${conf}</div>${medal(o.b,o.t,140)}<small>새 배지 · ${o.b[7]!=null?'스페셜':T[0]}</small><h3>${E(o.b[1])}</h3><p>${E(o.b[2])}${o.b[6].length>1?` · <b>${o.b[6][o.t].toLocaleString()}</b> 달성`:''}</p><div class="gm-ccb"><a href="games/#badges" class="gm-btn">배지 모음 보기</a><button type="button" class="gm-btn ghost">닫기</button></div></div>`}
  else{const c=career(o.lv);w.innerHTML=`<div class="gm-cc" role="dialog"><div class="gm-burst">${conf}</div><div class="gm-lvbig"><span>Lv.</span>${o.lv}</div><small>레벨 업</small><h3>${E(c[1])}</h3><p>${E(c[2])}</p><div class="gm-ccb"><button type="button" class="gm-btn">계속하기</button></div></div>`}
  document.body.appendChild(w);requestAnimationFrame(()=>w.classList.add('on'));w.addEventListener('click',e=>{if(e.target===w||e.target.closest('button'))w.remove()});try{navigator.vibrate&&navigator.vibrate([20,40,20])}catch(e){}}
/* ---------- 공용 위젯 ---------- */
function lvCard(compact){const x=totalXP(),n=level(x),a=lvXP(n),b=lvXP(n+1),c=career(n),pct=Math.round((x-a)/(b-a)*100),nx=CAREER.find(k=>k[0]>n);
  const st=Math.max(S.last===dayK()||S.last===dayK(Date.now()-864e5)?S.streak:0,0);const nb=Object.keys(S.badges).length;
  return`<div class="gm-lv${compact?' sm':''}"><div class="gm-lvn"><span>Lv.</span>${n}</div><div class="gm-lvt"><small>나의 커리어</small><b>${E(c[1])}</b><div class="gm-bar"><i style="width:${pct}%"></i></div><span class="gm-lvs">${x.toLocaleString()} XP · 다음 레벨까지 <b>${(b-x).toLocaleString()}</b>${nx?` · ${nx[0]}레벨에 ‘${nx[1]}’`:''}</span></div>
   <div class="gm-kpis"><div class="gm-k fire">${G_('flame')}<b>${st}</b><span>일 연속</span></div><div class="gm-k">${G_('award')}<b>${nb}</b><span>배지</span></div></div></div>`}
function goals(){const d=S.daily[dayK()]||{},My=window.NBMy&&NBMy.get?NBMy.get():null,r=My?Object.keys((My.reads||{})[new Date().toISOString().slice(0,10)]||{}).length:(d.r||0);
  const G=[['기사 3개 읽기',Math.min(3,r),3,'news'],['OX 퀴즈 풀기',Math.min(1,d.q||0),1,'checks'],['뉴스 게임 1판',Math.min(1,d.g||0),1,'device-gamepad-2']];const done=G.filter(g=>g[1]>=g[2]).length;
  const R=26,Cc=2*Math.PI*R;
  return`<div class="gm-goal"><svg viewBox="0 0 64 64" class="gm-ring"><circle cx="32" cy="32" r="${R}"/><circle cx="32" cy="32" r="${R}" class="p" style="stroke-dasharray:${Cc};stroke-dashoffset:${Cc*(1-done/3)}"/><text x="32" y="37" text-anchor="middle">${done}/3</text></svg>
   <ul>${G.map(g=>`<li class="${g[1]>=g[2]?'ok':''}">${G_(g[1]>=g[2]?'checks':g[3])}<span>${g[0]}</span><em>${g[1]}/${g[2]}</em></li>`).join('')}</ul></div>`}
const GAMES=[['2048','이슈 2048','같은 단계의 뉴스를 합쳐 헤드라인까지','grid-4x4','#ff4d2e'],['merge','뉴스 머지','떨어뜨려 합치면 단신이 특종으로','circles','#7a4dff'],['sling','팩트 새총','루머 블록을 사실 확인 새총으로','target-arrow','#11a683']];
function gameTiles(){return GAMES.map(g=>`<a class="gm-gt" href="games/#${g[0]}" style="--c:${g[4]}"><span class="gm-gi">${G_(g[3])}</span><b>${g[1]}</b><small>${g[2]}</small></a>`).join('')}
/* ---------- 오늘 화면: '오늘의 도전' (OX 한 문제 + 목표 링 + 게임) ---------- */
let F=null;const loadF=()=>F?Promise.resolve(F):fetch('data/fun.json?'+Math.floor(Date.now()/6e5)).then(r=>r.ok?r.json():null).then(j=>F=j).catch(()=>null);
function oxBox(){const Q=(F&&F.quiz&&F.quiz.questions||[]).filter(q=>q.kind==='ox');if(!Q.length)return'';const k=(S.ev.oxi||0)%Q.length,q=Q[k];
  return`<div class="gm-ox" data-k="${k}"><small>${G_('bulb')}오늘의 OX</small><p>${E(q.q)}</p><div class="gm-oxb"><button type="button" data-a="1" class="o">O</button><button type="button" data-a="0" class="x">X</button></div><span class="gm-oxr" aria-live="polite"></span></div>`}
function todayBlock(){const app=document.getElementById('app');const h=app&&app.querySelector('.hero');if(!h||app.querySelector('.gm-today'))return;
  loadF().then(()=>{if(app.querySelector('.gm-today'))return;const s=document.createElement('section');s.className='gm-today';
    s.innerHTML=`<div class="gm-th"><h2><small>Daily challenge</small>오늘의 도전</h2><a class="more" href="games/#badges">배지 모음 ${G_('arrow-right')}</a></div>
     <div class="gm-tgrid"><div class="gm-tl">${lvCard(1)}${goals()}</div><div class="gm-oxd"></div><div class="gm-games">${gameTiles()}</div></div>`;
    h.insertAdjacentElement('afterend',s);window.NBOX&&NBOX(s.querySelector('.gm-oxd'),F);
    s.addEventListener('click',e=>{const b=e.target.closest('.gm-ox [data-a]');if(!b)return;const box=b.closest('.gm-ox'),Q=F.quiz.questions.filter(q=>q.kind==='ox'),q=Q[+box.dataset.k];const ok=(+b.dataset.a===1)===q.answer;
      box.querySelectorAll('button').forEach(x=>{x.disabled=true;if((+x.dataset.a===1)===q.answer)x.classList.add('right')});if(!ok)b.classList.add('wrong');
      box.querySelector('.gm-oxr').innerHTML=ok?`<b>정답!</b> ${E(q.word)} 단어를 익혔어요`:`<b>아쉬워요.</b> 정답은 ${q.answer?'O':'X'}예요`;
      S.ev.oxi=(S.ev.oxi||0)+1;ev('quiz_n',1,{day:'q'});if(ok){S.ev.wordset=S.ev.wordset||{};S.ev.wordset[q.word]=1;ev('quiz_ok',1,{xp:10,why:'오늘의 OX 정답'});ev('words',Object.keys(S.ev.wordset).length,{max:1})}
      setTimeout(()=>{const n=s.querySelector('.gm-tl');n&&(n.innerHTML=lvCard(1)+goals())},600)})})}
/* ---------- 내 서재: 커리어·배지 진열장 ---------- */
function libBlock(){const app=document.getElementById('app');if(!app||app.querySelector('.gm-lib'))return;const h=[...app.querySelectorAll('.sec h2')].find(x=>/내 서재/.test(x.textContent));if(!h)return;
  const s=document.createElement('section');s.className='gm-lib';const got=B.map(b=>[b,(S.badges[b[0]]||{t:-1}).t]).sort((a,b)=>b[1]-a[1]);
  s.innerHTML=`${lvCard()}<div class="gm-shelf">${got.slice(0,8).map(([b,t])=>`<a href="games/#badges" class="gm-sb ${t<0?'lock':''}" title="${E(b[1])}">${medal(b,t,64)}<span>${E(b[1])}</span></a>`).join('')}</div><a class="gm-btn wide" href="games/#badges">배지 ${Object.keys(S.badges).length}/${B.length}종 모두 보기</a>`;
  h.closest('.sec').insertAdjacentElement('afterend',s)}
/* ---------- 읽기·카드 덱·기록 보관소 등 자동 기록 ---------- */
let lastRead=-1;
function tick(){const My=window.NBMy&&NBMy.get?NBMy.get():null;if(My){if(My.game&&(My.game.at||0)>(S.at||0)){S=Object.assign(S,mergeG(S,My.game));save()}
  const r=metric('read');if(lastRead>=0&&r>lastRead){touchDay();addXP(5*(r-lastRead),'기사 읽기');check(level(totalXP()-5));save(true)}else if(lastRead<0)check(0);lastRead=r}
  todayBlock();libBlock()}
document.addEventListener('click',e=>{if(e.target.closest('[data-save],[data-like]'))setTimeout(()=>check(0),300)},true);
addEventListener('nb:decktop',()=>ev('deck',1));
addEventListener('nb:deckall',()=>{const t=dayK();if(S.ev.deckallDay===t)return;S.ev.deckallDay=t;ev('deckall',1,{xp:20,why:'카드 10장 완주'})});
addEventListener('nb:quiz',e=>{const d=e.detail||{};ev('quiz_n',1,{day:'q'});if(d.ok){S.ev.wordset=S.ev.wordset||{};if(d.word)S.ev.wordset[d.word]=1;ev('quiz_ok',1);ev('words',Object.keys(S.ev.wordset).length,{max:1})}if(d.perfect)ev('perfect',1)});
if(/\/history\//.test(location.pathname))ev('hist',1);
window.NBGame={B,TIERS,CAREER,medal,lvCard,goals,gameTiles,tierOf,metric,level,totalXP,career,lvXP,
  play(game,score,stat){const d=S.daily[dayK()]||(S.daily[dayK()]={xp:0,g:0,q:0,r:0});ev('plays',1,{day:'g'});if(stat)ev(stat[0],stat[1],{max:stat[2]});return addXP(Math.min(60,Math.max(5,Math.round(score))),'게임 보상')||0},
  state:()=>S,ev,check,celebrate};
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(tick,120)});
const start=()=>{const a=document.getElementById('app');if(a)mo.observe(a,{childList:true});tick();setInterval(()=>{if(window.NBMy)tick()},4000)};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
