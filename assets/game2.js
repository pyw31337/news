/* NewsBoard game-v2 — OX 덱 · 나중에 읽기 · 나의 성향 분석 · 배지 요구치/분석 (docs/GAMIFICATION.md)
   로컬 우선: 나중에 읽기·스크랩은 내 서재(NBMy) 한 줄 동기화에 실려 바뀔 때만 저장 */
(function(){
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I=n=>window.GI?GI(n):'';
const CATC={정치:'#2f6bff',경제:'#11a683',사회:'#ff4d2e',세계:'#7a4dff',IT:'#0aa5c8',연예:'#e2448e',스포츠:'#f08a00'};
const My=()=>window.NBMy&&NBMy.get?NBMy.get():(()=>{try{return JSON.parse(localStorage.getItem('nb-my')||'null')}catch(e){return null}})();
const toast=t=>{const e=document.createElement('div');e.className='g2-toast';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2200)};
let TD=null;const today=()=>TD?Promise.resolve(TD):fetch('data/today.json',{cache:'no-cache'}).then(r=>r.json()).then(j=>TD=j).catch(()=>({issues:[]}));
const leanOf=i=>(i.sources||[]).reduce((o,s)=>{if(s.bias)o[s.bias.lean]=(o[s.bias.lean]||0)+1;else o.n=(o.n||0)+1;return o},{});

/* ================= 1. 요구치 문구 ================= */
const REQ={signup:['계정','로그인해서 계정 만들기',''],read:['읽은 기사 수','기사 {n}개 읽기','개'],streak:['연속 출석 일수','{n}일 연속 출석','일'],quiz_ok:['OX 정답 수','퀴즈 {n}개 맞히기','개'],perfect:['만점 받은 날','만점 {n}번 받기','번'],words:['익힌 단어 수','단어 {n}개 익히기','개'],cats:['읽은 분야 수','{n}개 분야 골고루 읽기','개'],hist:['기록 보관소 탐험','기록 보관소 {n}번 찾아보기','번'],deck:['카드 넘긴 수','카드 {n}장 넘기기','장'],saves:['저장한 기사 수','기사 {n}개 저장하기','개'],follows:['팔로우 수','인물·키워드 {n}개 팔로우','개'],plays:['게임 판 수','뉴스 게임 {n}판','판'],g2048:['가장 큰 블록 단계','{n}단계 블록 만들기','단계'],merge:['뉴스 머지 최고 점수','{n}점 달성','점'],sling:['깨뜨린 루머 블록','루머 블록 {n}개 격파','개'],night:['밤 11시 이후 읽은 날','늦은 밤 {n}일 읽기','일'],morning:['오전 7시 전 읽은 날','이른 아침 {n}일 읽기','일'],level:['커리어 레벨','레벨 {n} 달성',''],deckall:['카드 10장 완주한 날','{n}일 완주하기','일'],later:['나중에 읽기 담은 수','{n}개 담아 두기','개'],taste:['성향 분석 본 날','{n}일 열어 보기','일']};
const SRC={read:'read',cats:'read',streak:'read',night:'read',morning:'read',deck:'read',deckall:'read',level:'read',saves:'save',later:'save',taste:'save'};
function req(b){const G=NBGame,{t,v,next}=G.tierOf(b),R=REQ[b[5]]||['진행도','{n} 달성',''],goal=next!=null?next:b[6][b[6].length-1],prev=t>=0?b[6][t]:0;
  return{t,v,goal,done:next==null,stat:R[0],label:R[1].replace('{n}',goal.toLocaleString()),unit:R[2],left:Math.max(0,goal-v),pct:Math.min(100,Math.round(v/goal*100)),src:SRC[b[5]]}}

/* ================= 2. 나의 성향 분석 ================= */
function analyse(src){const M=My()||{};let L=[];
  if(src==='save')L=Object.values(M.saves||{}).filter(s=>s.t==='issue'||s.k).map(s=>({c:s.cat,k:s.k||[],e:s.e||[],l:s.l||{},h:new Date(s.at||0).getHours()}));
  else Object.values(M.reads||{}).forEach(d=>Object.values(d).forEach(r=>L.push(r)));
  const cnt=(arr)=>{const o={};arr.forEach(x=>{if(x)o[x]=(o[x]||0)+1});return Object.entries(o).sort((a,b)=>b[1]-a[1])};
  const lean={left:0,center:0,right:0,n:0};L.forEach(r=>Object.entries(r.l||{}).forEach(([k,v])=>lean[k in lean?k:'n']+=v));
  const hours=Array(24).fill(0);L.forEach(r=>{if(r.h!=null)hours[r.h]++});
  return{n:L.length,cat:cnt(L.map(r=>r.c)),topic:cnt(L.flatMap(r=>r.k||[])).slice(0,8),tag:cnt(L.flatMap(r=>r.e||[])).slice(0,14),lean,hours}}
function donut(cat,n){let a=0;const R=40,C=2*Math.PI*R;
  return`<div class="tz-donut"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" class="bg"/>${cat.map(([c,v])=>{const f=v/n,s=`<circle cx="50" cy="50" r="${R}" style="stroke:${CATC[c]||'#9aa3b5'};stroke-dasharray:${f*C} ${C};stroke-dashoffset:${-a*C}"/>`;a+=f;return s}).join('')}</svg><div class="tz-dc"><b>${n.toLocaleString()}</b><span>건</span></div></div>
   <ul class="tz-leg">${cat.slice(0,7).map(([c,v])=>`<li style="--c:${CATC[c]||'#9aa3b5'}"><i></i>${E(c)}<b>${Math.round(v/n*100)}%</b></li>`).join('')}</ul>`}
function leanBar(l){const T=l.left+l.center+l.right+l.n||1,P=k=>Math.round(l[k]/T*1000)/10;const side=l.left+l.right?(l.left>l.right*1.5?'진보 성향 매체 기사를 더 많이 봤어요':l.right>l.left*1.5?'보수 성향 매체 기사를 더 많이 봤어요':'진보·보수 기사를 고르게 봤어요'):'아직 성향이 표시된 기사가 적어요';
  return`<div class="tz-lean"><div class="tz-lb"><i class="l" style="flex:${l.left||0}"></i><i class="c" style="flex:${(l.center||0)+(l.n||0)}"></i><i class="r" style="flex:${l.right||0}"></i></div>
   <div class="tz-ll"><span class="l">진보 ${P('left')}%</span><span class="c">중립·판단 보류 ${Math.round((P('center')+P('n'))*10)/10}%</span><span class="r">보수 ${P('right')}%</span></div><p>${side}</p></div>`}
function bars(list){const m=list[0]?list[0][1]:1;return`<ol class="tz-bars">${list.map(([k,v],i)=>`<li><span>${E(k)}</span><i style="--w:${v/m*100}%;--d:${i*.05}s"></i><b>${v}</b></li>`).join('')}</ol>`}
function tags(list){const m=list[0]?list[0][1]:1;return`<div class="tz-tags">${list.map(([k,v])=>`<span style="--s:${.78+v/m*.5}">${I('tag')}${E(k)}<em>${v}</em></span>`).join('')}</div>`}
function hours(h){const m=Math.max(1,...h);return`<div class="tz-hrs">${h.map((v,i)=>`<i style="--h:${v/m*100}%" title="${i}시 ${v}건"></i>`).join('')}</div><div class="tz-hx"><span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>24시</span></div>`}
function tasteHTML(src,opt={}){const A=analyse(src);const who=src==='save'?'스크랩·나중에 읽기':'읽은 기사';
  if(!A.n)return`<div class="tz-empty">${I('chart-donut')}<p>${src==='save'?'카드의 ‘나중에 읽기’나 스크랩으로 기사를 모으면':'기사를 읽으면'} 여기서 나의 성향을 분석해 드려요.</p></div>`;
  const top=A.cat[0];
  return`<div class="tz">${opt.head===false?'':`<p class="tz-sum">${who} <b>${A.n.toLocaleString()}건</b> 중 <b style="color:${CATC[top[0]]||'inherit'}">${E(top[0])}</b> 분야가 ${Math.round(top[1]/A.n*100)}%로 가장 많아요${A.topic[0]?`. 자주 본 주제는 <b>${E(A.topic[0][0])}</b>`:''}.</p>`}
   <div class="tz-grid"><section class="tz-c"><h4>${I('chart-pie')}카테고리 비중</h4>${donut(A.cat,A.n)}</section>
   <section class="tz-c"><h4>${I('scale')}매체 성향 분포</h4>${leanBar(A.lean)}</section>
   <section class="tz-c"><h4>${I('chart-bar')}많이 본 주제</h4>${A.topic.length?bars(A.topic):'<p class="tz-none">주제 정보가 쌓이는 중이에요</p>'}</section>
   <section class="tz-c"><h4>${I('tags')}태그(인물·기관)</h4>${A.tag.length?tags(A.tag):'<p class="tz-none">태그 정보가 쌓이는 중이에요</p>'}</section>
   ${opt.hours===false?'':`<section class="tz-c wide"><h4>${I('clock-hour-4')}주로 읽는 시간</h4>${hours(A.hours)}</section>`}</div></div>`}
window.NBTaste={analyse,html:tasteHTML,req,REQ};

/* ================= 3. OX 덱 (맞히면 자동으로 다음, 이전 카드로 돌아가 해설 다시 보기) ================= */
function buildQ(F){const W=(F&&F.quiz&&F.quiz.words)||[],Q=((F&&F.quiz&&F.quiz.questions)||[]).filter(q=>q.kind==='ox').map(q=>Object.assign({},q));
  const seen=new Set(Q.map(q=>q.word+'|'+q.answer));
  W.forEach((w,k)=>{if(!w.mean)return;if(!seen.has(w.word+'|true'))Q.push({kind:'ox',word:w.word,q:`‘${w.word}’은(는) “${w.mean}”라는 뜻이다.`,answer:true});
    const o=W[(k+1+(k%3))%W.length];if(o&&o.word!==w.word&&o.mean&&!seen.has(w.word+'|false'))Q.push({kind:'ox',word:w.word,q:`‘${w.word}’은(는) “${o.mean}”라는 뜻이다.`,answer:false})});
  const M={};W.forEach(w=>M[w.word]=w);Q.forEach(q=>{const w=M[q.word]||{};q.mean=w.mean;q.tip=w.tip;q.ctx=w.context;q.field=w.field});
  // 하루 안에서는 순서 고정, 날마다 섞기
  const seed=(F.quiz.date||'').split('-').join('')|0;return Q.map((q,i)=>[q,Math.sin(seed+i*97)]).sort((a,b)=>a[1]-b[1]).map(x=>x[0])}
window.NBOX=function(el,F){if(!el||!F)return;const Q=buildQ(F);if(!Q.length){el.remove();return}
  const dk='nb-oxd',day=F.quiz.date||'';let A={};try{const o=JSON.parse(localStorage.getItem(dk)||'{}');A=o.d===day?o.a:{}}catch(e){}
  let cur=Q.findIndex((q,i)=>A[i]==null);if(cur<0)cur=Q.length-1;
  el.className='gm-oxd';
  el.innerHTML=`<div class="ox-h"><small>${I('bulb')}오늘의 OX 덱</small><span class="ox-sc"></span></div><div class="ox-stage" tabindex="0" aria-roledescription="퀴즈 카드 덱"></div>
   <div class="ox-nav"><button type="button" class="ox-pv" aria-label="이전 문제">${I('chevron-left')}</button><div class="ox-dots"></div><button type="button" class="ox-nx" aria-label="다음 문제">${I('chevron-right')}</button></div>`;
  const stage=el.querySelector('.ox-stage');
  const card=(q,i)=>{const a=A[i],done=a!=null,ok=done&&((a===1)===q.answer);
    return`<article class="ox-card ${done?(ok?'ok':'no'):''}" data-i="${i}"><div class="ox-no">Q${String(i+1).padStart(2,'0')}<span>${E(q.field||'오늘의 단어')}</span></div><p class="ox-q">${E(q.q)}</p>
     <div class="ox-btns"><button type="button" data-o="1" class="o ${done&&q.answer?'right':''} ${done&&a===1&&!ok?'wrong':''}" ${done?'disabled':''}>O</button><button type="button" data-o="0" class="x ${done&&!q.answer?'right':''} ${done&&a===0&&!ok?'wrong':''}" ${done?'disabled':''}>X</button></div>
     <div class="ox-exp">${done?`<b>${ok?'정답이에요':'아쉬워요'}</b> 정답은 <em>${q.answer?'O':'X'}</em>. ${q.mean?`‘${E(q.word)}’은(는) ${E(q.mean)}.`:''}${q.tip?`<small>${E(q.tip)}</small>`:''}`:''}</div></article>`};
  function draw(dir){const n=Object.keys(A).length,ok=Object.entries(A).filter(([i,a])=>(a===1)===Q[i].answer).length;
    el.querySelector('.ox-sc').innerHTML=`<b>${ok}</b> / ${n} 정답 · ${cur+1}/${Q.length}`;
    stage.innerHTML=[cur+2,cur+1].filter(i=>i<Q.length).map(i=>`<div class="ox-under u${i-cur}"></div>`).join('')+card(Q[cur],cur);
    const c=stage.querySelector('.ox-card');if(dir)c.classList.add(dir>0?'in-r':'in-l');
    el.querySelector('.ox-dots').innerHTML=Q.map((q,i)=>`<i class="${i===cur?'on':''} ${A[i]!=null?((A[i]===1)===q.answer?'ok':'no'):''}"></i>`).join('');
    el.querySelector('.ox-pv').disabled=cur===0;el.querySelector('.ox-nx').disabled=cur===Q.length-1;
    if(cur===Q.length-1&&n===Q.length&&!el.querySelector('.ox-end'))stage.insertAdjacentHTML('beforeend','')}
  const go=(t)=>{t=Math.max(0,Math.min(Q.length-1,t));if(t===cur)return;const d=t>cur?1:-1;const c=stage.querySelector('.ox-card');c&&c.classList.add(d>0?'out-l':'out-r');setTimeout(()=>{cur=t;draw(d)},180)};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-o]');if(b){const i=cur,q=Q[i];if(A[i]!=null)return;const a=+b.dataset.o;A[i]=a;localStorage.setItem(dk,JSON.stringify({d:day,a:A}));
      const ok=(a===1)===q.answer;const all=Object.keys(A).length===Q.length&&Object.entries(A).every(([k,v])=>(v===1)===Q[k].answer);
      dispatchEvent(new CustomEvent('nb:quiz',{detail:{ok,word:q.word,kind:'ox',perfect:all}}));if(ok&&window.NBGame)NBGame.ev('quiz_x',1,{xp:10,why:'OX 정답'});
      draw();const c=stage.querySelector('.ox-card');c.classList.add(ok?'pop':'shake');
      if(ok&&i<Q.length-1)setTimeout(()=>{if(cur===i)go(i+1)},1300);return}
    if(e.target.closest('.ox-pv'))go(cur-1);if(e.target.closest('.ox-nx'))go(cur+1)});
  let sx=null;stage.addEventListener('pointerdown',e=>{sx=e.clientX});stage.addEventListener('pointerup',e=>{if(sx==null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>50)go(cur+(dx<0?1:-1))});
  stage.addEventListener('keydown',e=>{if(e.key==='ArrowRight')go(cur+1);if(e.key==='ArrowLeft')go(cur-1)});
  draw()};

/* ================= 4. 카드의 ‘나중에 읽기’ ================= */
function isLater(id){const M=My();const s=M&&M.saves['issue:'+id];return!!(s&&(s.later||s.col==='c0'))}
function paintLater(){document.querySelectorAll('[data-later]').forEach(b=>{const on=isLater(b.dataset.later);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);const s=b.querySelector('span');if(s)s.textContent=on?'담아 뒀어요':'나중에 읽기'})}
document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-later]'))e.stopPropagation()},true);
document.addEventListener('click',async e=>{const b=e.target.closest('[data-later]');if(!b)return;e.preventDefault();e.stopPropagation();const M=My();if(!M)return;
  const id=b.dataset.later,k='issue:'+id;
  if(isLater(id)){const s=M.saves[k];s.later=0;if(s.col==='c0')s.col=null;s.scrap=0;s.u=Date.now();if(!s.like&&!s.note)delete M.saves[k];NBMy.save();paintLater();toast('나중에 읽기에서 뺐어요');return}
  const D=await today(),i=(D.issues||[]).find(x=>x.id===id)||{};
  const s=M.saves[k]||(M.saves[k]={t:'issue',id,at:Date.now(),like:0,scrap:0,tags:[],col:null,note:''});
  Object.assign(s,{later:1,scrap:1,col:s.col||'c0',title:i.title||s.title,img:i.image||s.img,cat:i.category||s.cat,href:'issue/'+id,k:(i.keywords||[]).slice(0,4),e:(i.entities||[]).slice(0,3),l:leanOf(i),u:Date.now()});
  NBMy.save();paintLater();b.classList.add('bump');setTimeout(()=>b.classList.remove('bump'),500);toast('나중에 읽기에 담았어요. 내 서재에서 다시 볼 수 있어요');
  window.NBGame&&NBGame.ev('later_n',1,{xp:3,why:'나중에 읽기'})},true);

/* ================= 5. 내 서재: 나중에 읽기 · 컬렉션 · 나의 성향 ================= */
function libExtra(){const app=document.getElementById('app');const lib=app&&app.querySelector('.gm-lib');if(!lib||app.querySelector('.g2-lib'))return;const M=My();if(!M)return;
  const S=Object.values(M.saves);const later=S.filter(s=>s.later||s.col==='c0').sort((a,b)=>(b.at||0)-(a.at||0));
  const cols=(M.cols||[]).map(c=>[c,S.filter(s=>s.col===c.id).length]);
  const sec=document.createElement('section');sec.className='g2-lib';
  sec.innerHTML=`<div class="g2-h"><h3>${I('bookmark')}나중에 읽기 <b>${later.length}</b></h3><span>시간 날 때 다시 읽을 기사</span></div>
   ${later.length?`<div class="g2-later">${later.slice(0,12).map(s=>`<a class="g2-li" href="${E(s.href||'issue/'+s.id)}">${s.img?`<span class="g2-th" style="background-image:url('${E(s.img)}')"></span>`:`<span class="g2-th none">${I('news')}</span>`}<span class="g2-tx"><em style="--c:${CATC[s.cat]||'#8a93a6'}">${E(s.cat||'이슈')}</em><b>${E(s.title||s.id)}</b><small>${new Date(s.at).toLocaleDateString('ko-KR',{month:'long',day:'numeric'})} 담음</small></span></a>`).join('')}</div>`:`<div class="tz-empty">${I('bookmark-plus')}<p>오늘 화면 카드의 ‘나중에 읽기’를 누르면 여기에 모여요.</p></div>`}
   <div class="g2-h"><h3>${I('folders')}스크랩 컬렉션</h3><span>주제별로 모아 둔 기사</span></div>
   <div class="g2-cols">${cols.map(([c,n])=>`<div class="g2-col"><span>${I('stack-2')}</span><b>${E(c.name)}</b><small>${n}개</small></div>`).join('')}</div>
   <div class="g2-h"><h3>${I('user-search')}나의 성향</h3><div class="g2-seg" role="tablist"><button type="button" data-src="read" class="on">읽은 기사</button><button type="button" data-src="save">스크랩</button></div></div>
   <div class="g2-taste">${tasteHTML('read')}</div>`;
  lib.insertAdjacentElement('afterend',sec);
  sec.querySelector('.g2-seg').onclick=e=>{const b=e.target.closest('[data-src]');if(!b)return;sec.querySelectorAll('.g2-seg button').forEach(x=>x.classList.toggle('on',x===b));sec.querySelector('.g2-taste').innerHTML=tasteHTML(b.dataset.src)};
  tasteSeen()}
function tasteSeen(){if(!window.NBGame)return;const S=NBGame.state(),t=new Date(Date.now()+9*36e5).toISOString().slice(0,10);if(S.ev.tasteDay===t)return;S.ev.tasteDay=t;NBGame.ev('taste',1)}
window.NBTaste.seen=tasteSeen;
const tick=()=>{paintLater();libExtra()};
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(tick,200)});
const start=()=>{const a=document.getElementById('app');if(a)mo.observe(a,{childList:true,subtree:false});tick();setTimeout(tick,1500)};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
