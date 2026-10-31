/* NewsBoard v2 시안 2 — '보고·넘기고·만지는 뉴스'
   첫 화면 데이터는 data/today_v2.json(약 23KB) 하나. 사진·얼굴·숫자·색으로 먼저 이해되게, 글은 최소.
   ① 오늘의 스토리(인스타그램식): 이슈마다 표지 → 무슨 일 → 왜 중요 → 사람들 반응 → 맞혀 보기, 톡톡 넘김
   ② 얼굴로 보는 오늘 ③ 실험실(lab.js: 번호 붙은 콘텐츠 후보, 골라서 합칠 것) ④ 숫자로 보는 오늘
   저장 형식은 v1과 같아(nb-settings 등) 기록이 이어짐. 서비스 워커 미등록. 상세는 확정 전까지 v1 화면으로 */
(function(){
const $=s=>document.querySelector(s),app=$('#app');
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATC={정치:'#2f6bff',경제:'#11a683',사회:'#ff4d2e',세계:'#7a4dff',IT:'#0aa5c8',과학:'#4868d8',건강:'#d64f73',환경:'#28a26e',문화:'#9c58cc',연예:'#e2448e',스포츠:'#f08a00'};
const cc=c=>CATC[c]||'#8189a3';
let S={};try{S=JSON.parse(localStorage.getItem('nb-settings')||'{}')}catch(e){}
if(S.fs)document.documentElement.style.fontSize=(16*S.fs/100)+'px';
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const lines=i=>((S.read==='easy'&&i.easy&&i.easy.length)?i.easy:(i.summary||[])).filter(Boolean);
const short=(t,n)=>{t=String(t||'');return t.length>n?t.slice(0,n-1)+'…':t};
const bg=u=>u?`style="background-image:url('${E(u)}')"`:'';
const nf=n=>Number(n||0).toLocaleString('ko-KR');
let V=null;

/* ---------- 첫 화면 ---------- */
function draw(){const I=V.issues||[];if(!I.length){app.innerHTML='<p class="ld">아직 오늘의 뉴스가 없어요.</p>';return}
  const day=new Date((V.date||'')+'T00:00:00+09:00');
  app.innerHTML=`
  <section class="hi"><div><small>${E(day.toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'}))}</small><h1>오늘 뉴스, <em>3분</em>이면 충분해요</h1></div></section>
  <section class="rings" aria-label="오늘의 스토리">${I.map((i,k)=>`<button type="button" class="rg" data-s="${k}" style="--c:${cc(i.cat)}"><span class="rgi" ${bg(i.imgs[0]||i.img)}></span><b>${i.rank}</b><small>${E(short((i.faces[0]||{}).n||i.kw[0]||i.cat,6))}</small>${i.new?'<i class="nw">NEW</i>':''}</button>`).join('')}</section>
  <button type="button" class="play" data-s="0"><span>▶</span><b>오늘의 이슈 10개, 스토리로 넘겨 보기</b><small>무슨 일 → 왜 중요 → 사람들 반응 → 맞혀 보기</small></button>

  ${(V.people||[]).length?`<h2>얼굴로 보는 오늘<small>오늘 뉴스에 나온 사람들</small></h2>
  <section class="faces">${V.people.map(p=>`<a href="entity/${encodeURIComponent(p.n)}"><span ${bg(p.img)}></span><b>${E(p.n)}</b><small>${E(p.d)}</small>${p.c>1?`<i>${p.c}</i>`:''}</a>`).join('')}</section>`:''}

  <section id="lab"></section>

  <h2>숫자로 보는 오늘</h2>
  <section class="nums"><div><b data-n="${V.nums.arts||0}">0</b><small>오늘 모은 기사</small></div><div><b data-n="${V.nums.presses||0}">0</b><small>언론사</small></div><div><b data-n="${V.nums.comments||0}">0</b><small>TOP 10 댓글</small></div></section>

  <h2>더 즐기기</h2>
  <section class="more"><a href="learn"><span>🧩</span>배우기</a><a href="games/"><span>🎮</span>게임·배지</a><a href="market"><span>📈</span>마켓</a><a href="people"><span>👤</span>인물</a><a href="timeline"><span>🕰️</span>타임라인</a><a href="./" data-world><span>🌍</span>해외·영어</a></section>
  <p class="foot">v2 시안 4 · 첫 화면 데이터 ${(window.__v2kb||0)}KB · 확정 전 미리보기 · <a href="./">지금 버전(v1)</a></p>`;
  countUp();window.NB2={V,E,cc,bg,short,nf,RM,S,story};const ls=document.createElement('script');ls.src='v2/lab.js?v=2';document.body.appendChild(ls);
  app.onclick=e=>{const s=e.target.closest('[data-s]');if(s){e.preventDefault();story(+s.dataset.s,0);return}
    const w=e.target.closest('[data-world]');if(w){try{const s=JSON.parse(localStorage.getItem('nb-settings')||'{}');s.region='en';localStorage.setItem('nb-settings',JSON.stringify(s))}catch(x){}}}}

function countUp(){document.querySelectorAll('.nums b[data-n]').forEach(b=>{const n=+b.dataset.n;if(RM){b.textContent=nf(n);return}/* ---------- 검색(사이트맵 제안: 위 오른쪽 돋보기) ---------- */
function search(){if(document.querySelector('.v2s'))return;const o=document.createElement('div');o.className='v2s';
  o.innerHTML=`<div class="v2sh"><input type="search" placeholder="이슈·인물·검색어" enterkeyhint="search" autocomplete="off"><button type="button">닫기</button></div><div class="v2sb"></div>`;document.body.appendChild(o);
  const q=o.querySelector('input'),b=o.querySelector('.v2sb'),hl=(t,s)=>{const k=t.indexOf(s);return k<0?E(t):E(t.slice(0,k))+'<mark>'+E(s)+'</mark>'+E(t.slice(k+s.length))};
  const empty=()=>{b.innerHTML=`<h4>지금 많이 찾는 말</h4><div class="v2sk">${(V.trends||[]).map((t,k)=>`<button type="button" data-q="${E(t.k)}"><i>${k+1}</i>${E(t.k)}</button>`).join('')}</div><h4>오늘 뉴스 속 사람</h4><div class="v2sk">${(V.people||[]).map(p=>`<button type="button" data-q="${E(p.n)}">${E(p.n)}</button>`).join('')}</div>`};
  const run=()=>{const s=q.value.trim();if(!s)return empty();
    const I=(V.issues||[]).filter(i=>(i.title+' '+(i.kw||[]).join(' ')+' '+(i.ents||[]).join(' ')).includes(s)).map(i=>`<a class="v2sr" href="issue/${i.id}"><span ${bg(i.imgs[0]||i.img)}></span><div><b>${hl(i.title,s)}</b><small>${E(i.cat)} · ${i.rank}위</small></div></a>`);
    const P=(V.people||[]).filter(p=>p.n.includes(s)).map(p=>`<a class="v2sr p" href="entity/${encodeURIComponent(p.n)}"><span ${bg(p.img)}></span><div><b>${hl(p.n,s)}</b><small>${E(p.d)}</small></div></a>`);
    b.innerHTML=(I.length?'<h4>이슈</h4>'+I.join(''):'')+(P.length?'<h4>사람</h4>'+P.join(''):'')+`<a class="v2sall" href="kw/${encodeURIComponent(s)}">'${E(s)}' 지난 기사까지 찾기 →</a>`};
  const close=()=>{o.remove();if(location.hash==='#search')history.replaceState(null,'',location.pathname)};
  q.oninput=run;q.onkeydown=e=>{if(e.key==='Enter'){const a=b.querySelector('a');a&&a.click()}if(e.key==='Escape')close()};
  o.addEventListener('click',e=>{if(e.target.closest('.v2sh button'))return close();const t=e.target.closest('[data-q]');if(t){q.value=t.dataset.q;run()}});empty();setTimeout(()=>q.focus(),30)}
document.getElementById('v2s')&&document.getElementById('v2s').addEventListener('click',()=>V&&search());

const t0=performance.now();
  const f=t=>{const p=Math.min(1,(t-t0)/1100);b.textContent=nf(Math.round(n*(1-Math.pow(1-p,3))));if(p<1)requestAnimationFrame(f)};
  const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){io.disconnect();requestAnimationFrame(f)}});io.observe(b)})}

/* ---------- 스토리 뷰어 ---------- */
let SV=null;
function slidesOf(i){const L=lines(i),A=[];
  A.push({k:'cover'});
  if(L[0])A.push({k:'what',t:L[0]});
  if(L.length>1)A.push({k:'why',t:L.slice(1,3)});
  if(i.op&&i.op.total)A.push({k:'op'});
  if(i.q)A.push({k:'quiz'});
  return A}
function story(ii,si){const I=V.issues;if(!I[ii])return close();const i=I[ii],SL=slidesOf(i);si=Math.max(0,Math.min(SL.length-1,si));
  if(!SV){SV=document.createElement('div');SV.className='sv';SV.setAttribute('role','dialog');SV.setAttribute('aria-label','오늘의 스토리');document.body.appendChild(SV);document.body.style.overflow='hidden';bindSV()}
  SV.dataset.ii=ii;SV.dataset.si=si;SV._n=SL.length;const s=SL[si],img=i.imgs[si%Math.max(1,i.imgs.length)]||i.img;
  const faces=(i.faces||[]).length?`<div class="sfc">${i.faces.map(f=>`<span><i ${bg(f.img)}></i>${E(f.n)}</span>`).join('')}</div>`:'';
  let body='';
  if(s.k==='cover')body=`<div class="sb cov"><span class="sch" style="--c:${cc(i.cat)}">${E(i.cat)}</span><div class="srk">${String(i.rank).padStart(2,'0')}</div><h2>${E(i.title)}</h2>
    <div class="spill">${i.new?'<span class="hl">오늘 새로 떠올랐어요</span>':i.days>1?`<span class="hl">${i.days}일째 이어지는 이야기</span>`:''}<span>언론사 ${i.presses||0}곳</span>${i.op&&i.op.total?`<span>댓글 ${nf(i.op.total)}</span>`:''}</div></div>`;
  else if(s.k==='what')body=`<div class="sb"><span class="sq">무슨 일이에요?</span><p class="big">${E(s.t)}</p>${faces}</div>`;
  else if(s.k==='why')body=`<div class="sb"><span class="sq">왜 중요해요?</span>${s.t.map(t=>`<p class="mid">${E(t)}</p>`).join('')}${Object.keys(i.gloss||{}).length?`<div class="sgl">${Object.entries(i.gloss).slice(0,3).map(([w,m])=>`<span><b>${E(w)}</b>${E(m)}</span>`).join('')}</div>`:''}</div>`;
  else if(s.k==='op'){const o=i.op,t=(o.like||0)+(o.dislike||0)||1;
    body=`<div class="sb"><span class="sq">사람들은 이렇게 반응해요</span><div class="sop"><b>${nf(o.total)}</b><small>개의 댓글</small></div>
    <div class="thermo big"><i class="h" style="width:${(o.like||0)/t*100}%"></i><i class="c" style="width:${(o.dislike||0)/t*100}%"></i></div><div class="thl"><span>공감 ${Math.round((o.like||0)/t*100)}%</span><span>비공감 ${Math.round((o.dislike||0)/t*100)}%</span></div>
    ${(o.stances||[]).length?`<div class="sst">${o.stances.map(x=>`<div><span>${E(x.l)}</span><i style="width:${x.s}%"></i><b>${x.s}%</b></div>`).join('')}</div>`:''}${o.top?`<q>${E(o.top)}</q>`:''}</div>`}
  else if(s.k==='quiz')body=`<div class="sb"><span class="sq">맞혀 보세요</span><p class="mid">${E(i.q.t)}</p><div class="sox"><button type="button" data-ox="1">O</button><button type="button" data-ox="0">X</button></div><div class="sres"></div></div>`;
  SV.innerHTML=`<div class="sbg" ${bg(img)}></div><div class="ssh"></div>
   <div class="sbar">${SL.map((_,k)=>`<i class="${k<si?'done':k===si?'on':''}"><b></b></i>`).join('')}</div>
   <div class="stop"><span class="sti" ${bg(i.imgs[0]||i.img)}></span><b>${i.rank}위 · ${E(short(i.title,22))}</b><button type="button" class="sx" aria-label="닫기">✕</button></div>
   ${body}
   <a class="sgo" href="issue/${i.id}">기사 자세히 보기 →</a>
   <button type="button" class="snav p" aria-label="이전"></button><button type="button" class="snav n" aria-label="다음"></button>`;
  const bar=SV.querySelector('.sbar .on b');clearTimeout(SV._t);
  if(s.k!=='quiz'&&!RM&&bar){bar.style.animationDuration='6s';SV._t=setTimeout(()=>next(),6000)}else if(bar)bar.style.width='100%'}
function next(){const ii=+SV.dataset.ii,si=+SV.dataset.si;if(si+1<SV._n)story(ii,si+1);else if(ii+1<V.issues.length)story(ii+1,0);else close()}
function prev(){const ii=+SV.dataset.ii,si=+SV.dataset.si;if(si>0)story(ii,si-1);else if(ii>0)story(ii-1,0)}
function close(){if(!SV)return;clearTimeout(SV._t);SV.remove();SV=null;document.body.style.overflow=''}
function bindSV(){let y0=null,x0=null;
  SV.addEventListener('click',e=>{if(SV._sw){SV._sw=0;return}if(e.target.closest('.sx'))return close();if(e.target.closest('.sgo'))return;
    const o=e.target.closest('[data-ox]');if(o){const i=V.issues[+SV.dataset.ii],ok=(+o.dataset.ox===1)===i.q.a;SV.querySelectorAll('[data-ox]').forEach(b=>{b.disabled=true;if((+b.dataset.ox===1)===i.q.a)b.classList.add('right')});if(!ok)o.classList.add('wrong');
      SV.querySelector('.sres').innerHTML=`<b>${ok?'정답이에요! 🎉':'아쉬워요'}</b>${E(i.q.e||'')}`;try{window.NBGame&&ok&&NBGame.ev('quiz_x',1,{xp:10})}catch(x){}clearTimeout(SV._t);SV._t=setTimeout(next,3500);return}
    if(e.target.closest('.snav.n'))next();else if(e.target.closest('.snav.p'))prev()});
  // 스와이프: 아래로 끌면 닫기, 좌우로 넘기기(스와이프 뒤 이어지는 클릭은 무시)
  SV.addEventListener('pointerdown',e=>{y0=e.clientY;x0=e.clientX});
  SV.addEventListener('pointerup',e=>{if(y0==null)return;const dy=e.clientY-y0,dx=e.clientX-x0;y0=x0=null;
    if(dy>90&&Math.abs(dx)<70){SV._sw=1;close()}else if(Math.abs(dx)>60){SV._sw=1;(dx<0?next:prev)()}});
  addEventListener('keydown',function k(e){if(!SV){removeEventListener('keydown',k);return}if(e.key==='Escape')close();if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')prev()})}

/* ---------- 검색(사이트맵 제안: 위 오른쪽 돋보기) ---------- */
function search(){if(document.querySelector('.v2s'))return;const o=document.createElement('div');o.className='v2s';
  o.innerHTML=`<div class="v2sh"><input type="search" placeholder="이슈·인물·검색어" enterkeyhint="search" autocomplete="off"><button type="button">닫기</button></div><div class="v2sb"></div>`;document.body.appendChild(o);
  const q=o.querySelector('input'),b=o.querySelector('.v2sb'),hl=(t,s)=>{const k=t.indexOf(s);return k<0?E(t):E(t.slice(0,k))+'<mark>'+E(s)+'</mark>'+E(t.slice(k+s.length))};
  const empty=()=>{b.innerHTML=`<h4>지금 많이 찾는 말</h4><div class="v2sk">${(V.trends||[]).map((t,k)=>`<button type="button" data-q="${E(t.k)}"><i>${k+1}</i>${E(t.k)}</button>`).join('')}</div><h4>오늘 뉴스 속 사람</h4><div class="v2sk">${(V.people||[]).map(p=>`<button type="button" data-q="${E(p.n)}">${E(p.n)}</button>`).join('')}</div>`};
  const run=()=>{const s=q.value.trim();if(!s)return empty();
    const I=(V.issues||[]).filter(i=>(i.title+' '+(i.kw||[]).join(' ')+' '+(i.ents||[]).join(' ')).includes(s)).map(i=>`<a class="v2sr" href="issue/${i.id}"><span ${bg(i.imgs[0]||i.img)}></span><div><b>${hl(i.title,s)}</b><small>${E(i.cat)} · ${i.rank}위</small></div></a>`);
    const P=(V.people||[]).filter(p=>p.n.includes(s)).map(p=>`<a class="v2sr p" href="entity/${encodeURIComponent(p.n)}"><span ${bg(p.img)}></span><div><b>${hl(p.n,s)}</b><small>${E(p.d)}</small></div></a>`);
    b.innerHTML=(I.length?'<h4>이슈</h4>'+I.join(''):'')+(P.length?'<h4>사람</h4>'+P.join(''):'')+`<a class="v2sall" href="kw/${encodeURIComponent(s)}">'${E(s)}' 지난 기사까지 찾기 →</a>`};
  const close=()=>{o.remove();if(location.hash==='#search')history.replaceState(null,'',location.pathname)};
  q.oninput=run;q.onkeydown=e=>{if(e.key==='Enter'){const a=b.querySelector('a');a&&a.click()}if(e.key==='Escape')close()};
  o.addEventListener('click',e=>{if(e.target.closest('.v2sh button'))return close();const t=e.target.closest('[data-q]');if(t){q.value=t.dataset.q;run()}});empty();setTimeout(()=>q.focus(),30)}
document.getElementById('v2s')&&document.getElementById('v2s').addEventListener('click',()=>V&&search());

const t0=performance.now();
fetch('data/today_v2.json',{cache:'no-cache'}).then(r=>{window.__v2kb=Math.round((+r.headers.get('content-length')||0)/1024);return r.json()})
 .then(j=>{V=j;draw();if(location.hash==='#search')search()}).catch(()=>{app.innerHTML='<p class="ld">불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>'});
})();
