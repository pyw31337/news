/* NewsBoard v7 · 5탭 내비 + 메뉴 사이트맵 + 내 서재(게스트·IndexedDB, 나중에 Supabase 동기화) + 알림 센터 */
(function(){
/* 하단 탭 가운데 '오늘' 버튼 스타일
   라이브 시계형(윗줄 날짜 '10.29 (목)', 아랫줄 지금 시각 'HH:MM', 1분마다 갱신):
     'live'(기본: 빨간 라이브 점 + 초침 링) | 'pulse'(맥박처럼 퍼지는 링) | 'badge'(LIVE 빨간 점 배지) | 'flip'(분이 바뀔 때 숫자 넘김) | 'lglass'(리퀴드 글래스 + 갱신 때 반짝임)
   이전 시안: 'fab'(주황 원형+노치) | 'glow'(빛나는 알약) | 'pin'(코르크 핀 배지) | 'date'(네이비 원판+오늘 날짜) | 'glass'(리퀴드 글래스) */
const NAV_STYLE='live';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I=(n)=>typeof ic==='function'?ic(n):'';
const SV=p=>`<svg class="nbi${/u1/.test(p)?' tg':''}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const P={timeline:NBU('timeline-event',1),market:NBU('chart-candle',1),today:NBU('file-text',1),my:NBU('bookmarks',1),menu:NBU('menu-2',1),bell:NBU('bell',1),heart:NBU("thumb-up",1),bm:NBU('bookmark',1),star:NBU('star',1),plus:NBU('plus'),search:NBU('search'),up:NBU('chevron-up'),dn:NBU('chevron-down'),x:NBU('x')};
if(typeof IC!=='undefined'){IC.bell=P.bell;IC.bm=P.bm;IC.heart=P.heart}
const qn=new URLSearchParams(location.search).get('nav');const NS=['fab','glow','pin','date','glass','live','pulse','badge','flip','lglass'].includes(qn)?qn:NAV_STYLE;const CLK=['live','pulse','badge','flip','lglass'].includes(NS);
/* ---------- 저장소: IndexedDB(없으면 localStorage) ---------- */
const DEF={v:1,uid:null,saves:{},cols:[{id:'c0',name:'나중에 읽기'}],follows:{},keywords:[],reads:{},home:{today:null,market:null,hideT:[],hideM:[]},watch:{ind:{},apt:[]},alerts:{on:{kw:1,follow:1,ind:1,apt:1,quiz:1,reply:1},seen:{},lastSeen:0},updated:0};
let M=JSON.parse(JSON.stringify(DEF));let db=null;
const idb=()=>new Promise(r=>{try{const q=indexedDB.open('newsboard',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)}catch(e){r(null)}});
const load=async()=>{db=await idb();let v=null;if(db)v=await new Promise(r=>{const t=db.transaction('kv').objectStore('kv').get('my');t.onsuccess=()=>r(t.result);t.onerror=()=>r(null)});if(!v)try{v=JSON.parse(localStorage.getItem('nb-my')||'null')}catch(e){}if(v)M=Object.assign(JSON.parse(JSON.stringify(DEF)),v);if(!M.uid)M.uid='g-'+Math.random().toString(36).slice(2,10);};
const save=()=>{M.updated=Date.now();const s=JSON.stringify(M);try{localStorage.setItem('nb-my',s)}catch(e){}if(db)try{db.transaction('kv','readwrite').objectStore('kv').put(JSON.parse(s),'my')}catch(e){}badge();syncSoon()};
/* ---------- 여러 기기 동기화: Cloudflare Worker + D1 (로그인 시에만) ---------- */
const SYNC='https://newsboard-sync.pyw213.workers.dev';
{const h=new URLSearchParams(location.hash.slice(1));if(h.get('nbt')){localStorage.setItem('nb-tok',h.get('nbt'));localStorage.setItem('nb-prov',h.get('nbp')||'');localStorage.setItem('nb-migrate','1')}
 if(h.get('nbt')||h.get('nbe'))history.replaceState(null,'',location.pathname+location.search);if(h.get('nbe'))setTimeout(()=>window.toast&&toast('로그인을 마치지 못했어요. 다시 시도해 주세요'),800)}
const tok=()=>localStorage.getItem('nb-tok');
const newer=(a,b)=>((a&&(a.u||a.at))||0)>=((b&&(b.u||b.at))||0)?a:b;
function merge(a,b){if(!b)return a;if(!a)return b;const o=Object.assign({},b,a);
  o.saves={};new Set([...Object.keys(a.saves||{}),...Object.keys(b.saves||{})]).forEach(k=>{const x=newer((a.saves||{})[k],(b.saves||{})[k]);if(x)o.saves[k]=x});
  o.follows=Object.assign({},b.follows,a.follows);o.keywords=[...new Set([...(a.keywords||[]),...(b.keywords||[])])];
  o.cols=[...(a.cols||[])];(b.cols||[]).forEach(c=>{if(!o.cols.find(x=>x.id===c.id))o.cols.push(c)});
  o.reads={};new Set([...Object.keys(a.reads||{}),...Object.keys(b.reads||{})]).forEach(d=>o.reads[d]=Object.assign({},(b.reads||{})[d],(a.reads||{})[d]));
  const n=(a.updated||0)>=(b.updated||0)?a:b;['home','watch','alerts'].forEach(k=>{if(n[k])o[k]=n[k]});
  if(a.uid&&!String(a.uid).startsWith('g-'))o.uid=a.uid;else o.uid=b.uid||a.uid;o.updated=Math.max(a.updated||0,b.updated||0);return o}
let rev=+localStorage.getItem('nb-rev')||0,syncT=null,syncing=false;window._nbSyncAt=+localStorage.getItem('nb-syncat')||0;
async function api(path,opt={}){const r=await fetch(SYNC+path,Object.assign({},opt,{headers:Object.assign({'Content-Type':'application/json',Authorization:'Bearer '+tok()},opt.headers||{})}));
  if(r.status===401){localStorage.removeItem('nb-tok');localStorage.removeItem('nb-rev');throw new Error('auth')}return{st:r.status,j:await r.json().catch(()=>({}))}}
async function sync(){if(!tok()||syncing)return;syncing=true;try{
  const g=await api('/sync');let data=merge(M,g.j.data);rev=g.j.rev||0;
  for(let n=0;n<3;n++){const r=await api('/sync',{method:'PUT',body:JSON.stringify({data,rev})});if(r.st===200){rev=r.j.rev;break}
    if(r.st===409){data=merge(data,r.j.data);rev=r.j.rev}else break}
  M=Object.assign(JSON.parse(JSON.stringify(DEF)),data);M.updated=data.updated;const s=JSON.stringify(M);try{localStorage.setItem('nb-my',s)}catch(e){}if(db)try{db.transaction('kv','readwrite').objectStore('kv').put(JSON.parse(s),'my')}catch(e){}
  localStorage.setItem('nb-rev',rev);window._nbSyncAt=Date.now();localStorage.setItem('nb-syncat',window._nbSyncAt);
  if(localStorage.getItem('nb-migrate')){localStorage.removeItem('nb-migrate');window.toast&&toast('이 기기의 서재를 계정으로 옮겼어요')}
  const st=document.getElementById('syncst');if(st)st.textContent='방금 동기화됨';badge&&badge()}catch(e){}finally{syncing=false}}
const syncSoon=()=>{if(!tok())return;clearTimeout(syncT);syncT=setTimeout(sync,2500)};
const ready=load().then(()=>{if(tok())sync()});
addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&tok())sync()});
window.NBMy={get:()=>M,save,sync};
/* ---------- 내비 ---------- */
const dnum=new Date().getDate();
/* 한국 시간 기준 날짜·시각 */
const kst=()=>{const p={};new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(x=>p[x.type]=x.value);return{d:`${p.month}.${p.day} (${p.weekday})`,h:p.hour,m:p.minute,s:+p.second}};
const clkHTML=()=>{const k=kst();return`<svg class="rg" viewBox="0 0 64 64" aria-hidden="true"><circle class="rt" cx="32" cy="32" r="30"/><circle class="rp" cx="32" cy="32" r="30" pathLength="100" style="animation-delay:-${k.s}s"/></svg><i class="pl" aria-hidden="true"></i><em class="lv" aria-hidden="true"><i></i>LIVE</em><small class="cd"><i class="ld"></i><span>${k.d}</span></small><b class="ct"><span class="hh">${k.h}</span><span class="co">:</span><span class="mm">${k.m}</span></b>`};
let tickT=null;
function tick(){const k=kst();const cb=document.querySelector('.tabbar .ctr .cb.clk');if(cb){
  const set=(sel,v)=>{const e=cb.querySelector(sel);if(e&&e.textContent!==v){e.textContent=v;e.classList.remove('fl');void e.offsetWidth;e.classList.add('fl')}};
  set('.cd span',k.d);set('.hh',k.h);set('.mm',k.m);cb.classList.remove('shim');void cb.offsetWidth;cb.classList.add('shim');
  const a=cb.closest('.ctr');if(a)a.setAttribute('aria-label',`오늘 · ${k.d} ${k.h}시 ${k.m}분`)}
  clearTimeout(tickT);tickT=setTimeout(tick,(60-kst().s)*1000+50)}
function nav(){const tb=document.querySelector('.tabbar');if(!tb)return;
  const T=[['timeline','timeline','타임라인'],['market','market','마켓'],['','today','오늘'],['my','my','내 서재'],['menu','menu','메뉴']];
  tb.className='tabbar v7 nav-'+NS;
  tb.innerHTML=T.map(([h,v,l])=>v==='today'?`<a href="./" data-v="today" class="ctr" aria-label="오늘"><span class="cb${CLK?' clk':''}"><span class="pinh"></span>${CLK?clkHTML():NS==='date'?`<b class="dn">${dnum}</b><small>TODAY</small>`:SV(P.today)}</span><span class="cl">${l}</span></a>`:`<a href="${h}" data-v="${v}">${SV(P[v])}<span>${l}</span></a>`).join('');
  if(CLK){tb.classList.add('clkv');tick()}
  /* PC 상단: 오늘 · 타임라인 · 마켓 · 내 서재, 메뉴는 알림 종 오른쪽 끝 */
  const TP=[['','today','오늘'],['timeline','timeline','타임라인'],['market','market','마켓'],['my','my','내 서재']];
  const tn=document.querySelector('.topnav');if(tn)tn.innerHTML=TP.map(([h,v,l])=>`<a href="${h||'./'}" data-v="${v}">${l}</a>`).join('');
  const top=document.querySelector('header.top');if(top&&!document.getElementById('bell')){const b=document.createElement('a');b.id='bell';b.href='alerts';b.className='bell';b.setAttribute('aria-label','알림');b.innerHTML=SV(P.bell)+'<i id="bellc"></i>';top.appendChild(b);
    const m=document.createElement('a');m.href='menu';m.className='tmenu';m.dataset.v='menu';m.setAttribute('aria-label','메뉴');m.innerHTML=SV(P.menu);top.appendChild(m)}
}
const VMAP={'':'today',issue:'today',kw:'today',g:'today',gt:'today',entity:'today',people:'today',market:'market',timeline:'timeline',my:'my',alerts:'my'};
function hl(){const v=decodeURIComponent(location.pathname.slice(BASEP.length)).split('/')[0];const t=VMAP[v]??'menu';document.querySelectorAll('.tabbar [data-v],.topnav [data-v],.tmenu').forEach(x=>x.classList.toggle('on',x.dataset.v===t))}
const _ps=history.pushState;history.pushState=function(){const r=_ps.apply(this,arguments);setTimeout(()=>{hl();after()},0);return r};
addEventListener('popstate',()=>setTimeout(()=>{hl();after()},0));
/* ---------- 섹션 묶기(내 홈 순서·숨김) ---------- */
function groupSecs(kind){const kids=[...app.children];let g=null,first=null;const out=[];
  kids.forEach(n=>{if(n.classList&&n.classList.contains('sec')){g={title:(n.querySelector('h2')?.childNodes[n.querySelector('h2').childNodes.length-1]?.textContent||'').trim(),nodes:[n]};out.push(g)}else if(g)g.nodes.push(n);else{first=first||[];first.push(n)}});
  if(!out.length)return;const names=out.map(o=>o.title);M.home['k'+kind]=names;
  const ord=M.home[kind]||names,hide=M.home[kind==='today'?'hideT':'hideM'];
  const sorted=out.slice().sort((a,b)=>{const ia=ord.indexOf(a.title),ib=ord.indexOf(b.title);return(ia<0?99:ia)-(ib<0?99:ib)});
  sorted.forEach(o=>{const w=document.createElement('div');w.className='hsec'+(hide.includes(o.title)?' hid':'');o.nodes.forEach(n=>w.appendChild(n));app.appendChild(w)});}
/* ---------- 화제(오늘 안으로) ---------- */
function hotHTML(){if(typeof SUB==='undefined'||typeof subtype!=='function')return'';
  return`<div class="sec"><h2><small>People · Companies · Places</small>${I('fire')}화제</h2><a class="more" href="people">전체 ${NBI('arrow-right')}</a></div><div class="filters subt" id="hotf">${SUB.filter(s=>s[0]!=='issue').map(([k,v,n],i)=>`<button data-f="${k}" class="${i?'':'on'}">${I(n)}${v}</button>`).join('')}</div><div class="hs" id="hotl"></div>`}
function hotDraw(f){const L=D.entities.filter(e=>subtype(e)===f).slice(0,12);const el=document.getElementById('hotl');if(!el)return;
  el.innerHTML=L.length?L.map(e=>`<a class="card pc" href="${eh(e.name)}">${av(e)}<b>${E(e.name)}</b><small>${E(e.wiki?.desc||'')}</small>${spark(e.daily)}<span class="last">${e.timeline[0]?E(e.timeline[0].title):''}</span></a>`).join(''):'<p class="fine">오늘은 이 분류의 화제가 적어요.</p>'}
/* ---------- 저장 버튼 ---------- */
const key=(t,id)=>t+':'+id;
function itemOf(t,id){if(t==='issue'){const i=D.issues.find(x=>x.id===id);return i&&{title:i.title,img:i.image,cat:i.category,href:'issue/'+id}}
  if(t==='entity'){const e=D.entities.find(x=>x.name===id);return{title:id,img:e?.wiki?.thumb,cat:e?.type,href:eh(id)}}
  if(t==='kw')return{title:id,href:kh(id)};if(t==='chart')return{title:id,href:'market'};return{title:id}}
function toggleSave(t,id,kind){const k=key(t,id);const s=M.saves[k]||(M.saves[k]=Object.assign({t,id,at:Date.now(),like:0,scrap:0,tags:[],col:null,note:''},itemOf(t,id)||{}));s[kind]=s[kind]?0:1;s.u=Date.now();if(!s.like&&!s.scrap&&!s.note)delete M.saves[k];save();return M.saves[k]}
const st=(t,id)=>M.saves[key(t,id)]||{};
function actBar(t,id){const s=st(t,id),f=M.follows[key(t,id)];return`<div class="myact" data-t="${t}" data-id="${E(id)}"><button data-a="like" class="${s.like?'on':''}">${SV(P.heart)}좋아요</button><button data-a="scrap" class="${s.scrap?'on':''}">${SV(P.bm)}스크랩</button>${t!=='chart'?`<button data-a="follow" class="${f?'on':''}">${SV(P.bell)}${f?'팔로잉':'팔로우'}</button>`:''}<button data-a="note" class="${s.note?'on':''}">${SV(P.plus)}메모</button></div>`}
document.addEventListener('click',e=>{const b=e.target.closest('.myact button,.mini-heart');if(!b)return;e.preventDefault();e.stopPropagation();
  const w=b.closest('[data-t]'),t=w.dataset.t,id=w.dataset.id,a=b.dataset.a||'like';
  if(a==='follow'){const k=key(t,id);if(M.follows[k])delete M.follows[k];else M.follows[k]={t,id,at:Date.now(),title:(itemOf(t,id)||{}).title||id};save();toast(M.follows[k]?'팔로우했어요. 새 소식이 오면 알려드릴게요':'팔로우를 해제했어요')}
  else if(a==='note'){openNote(t,id);return}
  else{const s=toggleSave(t,id,a);toast(s&&s[a]?(a==='like'?'좋아요 했어요':'내 서재에 스크랩했어요'):'취소했어요')}
  if(w.classList.contains('myact'))w.outerHTML=actBar(t,id);else b.classList.toggle('on',!!st(t,id).like)},true);
function openNote(t,id){const s=st(t,id);const sh=document.createElement('div');sh.className='mysheet';sh.innerHTML=`<div class="msb"><h3>${SV(P.plus)}내 메모</h3><p class="fine">${E((itemOf(t,id)||{}).title||id)}</p><textarea id="mnt" rows="5" placeholder="생각, 기억할 점, 연결하고 싶은 사건을 적어 보세요">${E(s.note||'')}</textarea><label class="fine">태그 (쉼표로 구분)</label><input id="mtg" value="${E((s.tags||[]).join(', '))}" placeholder="예: 부동산, 금리"><label class="fine">컬렉션</label><select id="mcl"><option value="">없음</option>${M.cols.map(c=>`<option value="${c.id}" ${s.col===c.id?'selected':''}>${E(c.name)}</option>`).join('')}</select><div class="mbr"><button class="ghost" data-x>닫기</button><button class="pri" data-ok>저장</button></div></div>`;document.body.appendChild(sh);
  sh.onclick=ev=>{if(ev.target===sh||ev.target.closest('[data-x]'))sh.remove();if(ev.target.closest('[data-ok]')){const k=key(t,id);const o=M.saves[k]||(M.saves[k]=Object.assign({t,id,at:Date.now(),like:0,scrap:1},itemOf(t,id)||{}));o.note=sh.querySelector('#mnt').value.trim();o.tags=sh.querySelector('#mtg').value.split(',').map(x=>x.trim()).filter(Boolean);o.col=sh.querySelector('#mcl').value||null;o.u=Date.now();save();sh.remove();toast('메모를 저장했어요');after()}}}
/* ---------- 화면 후처리 ---------- */
function curV(){const h=decodeURIComponent(location.pathname.slice(BASEP.length)).replace(/\/+$/,'');return[h.split('/')[0],h.split('/').slice(1).join('/')]}
function after(){if(!(typeof D!=='undefined'&&D))return;const[v,a]=curV();document.body.classList.toggle('nobias',!!(S.nobias));
  if(v===''&&!(S.region==='en'&&typeof G!=='undefined'&&G)){if(!document.getElementById('hotl')){const m=document.getElementById('mapmini');const h=hotHTML();if(h){const at=m?m.previousElementSibling:null;at?at.insertAdjacentHTML('beforebegin',h):app.insertAdjacentHTML('beforeend',h);hotDraw('person');document.getElementById('hotf').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;document.querySelectorAll('#hotf button').forEach(x=>x.classList.toggle('on',x===b));hotDraw(b.dataset.f)}}}
    [...app.querySelectorAll('.sec')].forEach(s=>{if(/화제의 인물/.test(s.textContent)){const n=s.nextElementSibling;s.remove();n&&n.remove()}});
    if(!app.querySelector('.hsec'))groupSecs('today');save()}
  if(v==='market'&&!app.querySelector('.hsec')){groupSecs('market');app.querySelectorAll('.mk').forEach(k=>{const n=k.querySelector('.n')?.firstChild?.textContent?.trim();if(n&&!k.querySelector('.mini-heart')){k.style.position='relative';k.insertAdjacentHTML('beforeend',`<span data-t="chart" data-id="${E(n)}" class="mhw"><button class="mini-heart ${st('chart',n).like?'on':''}" aria-label="관심 지표">${SV(P.star)}</button></span>`)}});save()}
  if(['issue','entity','kw'].includes(v)&&a&&!app.querySelector('.myact')){const h=app.querySelector('h1,h2');const t=v;const id=v==='issue'?a:a;(h||app.firstElementChild)?.insertAdjacentHTML('afterend',actBar(t,id));
    if(v==='issue')arcLink(a);
    if(v==='issue'){const i=D.issues.find(x=>x.id===a);if(i){const d=new Date().toISOString().slice(0,10);const r=M.reads[d]||(M.reads[d]={});if(!r[a]){r[a]={c:i.category,l:(i.sources||[]).reduce((o,s)=>{if(s.bias)o[s.bias.lean]=(o[s.bias.lean]||0)+1;else o.n=(o.n||0)+1;return o},{})};save()}}}}
  app.querySelectorAll('a.card[href^="issue/"]').forEach(c=>{if(c.querySelector('.mhw'))return;const id=c.getAttribute('href').slice(6);c.style.position='relative';c.insertAdjacentHTML('beforeend',`<span class="mhw" data-t="issue" data-id="${E(id)}"><button class="mini-heart ${st('issue',id).like?'on':''}" aria-label="좋아요">${SV(P.heart)}</button></span>`)});
  hl();badge();}
/* ---------- 메뉴(전체 사이트맵) ---------- */
const MENU=[
 ['뉴스 보기','today',[['오늘','./','오늘의 이슈 TOP10·화제·관계','news'],['타임라인','timeline','사건이 시간순으로 이어지는 흐름','timeline'],['관계도','map','인물·기업·장소가 어떻게 얽혔는지','graph'],['화제','people','인물·기업·장소·기관별로 모아보기','fire'],['날짜 아카이브','archive','지난 날의 이슈 다시 보기','history']]],
 ['돈과 정책','market',[['마켓','market','증시·환율·원자재 한눈에','market'],['경기선행지수','market#lead','경기가 어디로 가는지 미리 보기','spark'],['정치인 DB','politicians/','의원 3,296명의 법안·표결·재산','정치']]],
 ['인물 아카이브','persons',[['인물 타임라인','persons/','정치인의 출생부터 오늘까지 일생 기록','timeline'],['인물 관계도','persons/#graph','가족·동문·지역구로 이어진 사람들','graph'],['오늘의 인물사','persons/','몇 년 전 오늘, 이 사람에게 있었던 일','history']]],
 ['쉽게 배우기','learn',[['오늘의 단어 퀴즈','quiz','OX로 맞히며 어려운 말 익히기','quiz'],['4컷 만평','learn','핫이슈를 만화로 쉽게','comic'],['카드뉴스','learn','반복되는 사건을 카드로 정리','cards']]],
 ['나','my',[['내 서재','my','좋아요·스크랩·메모·팔로우','bm'],['알림','alerts','키워드·팔로우·지표·아파트 알림','bell'],['내 홈 꾸미기','my/home','오늘·마켓 섹션 순서와 관심 항목','gear']]]];
function fsV(d){S.fs=d===0?100:Math.max(85,Math.min(130,S.fs+d));saveS()}
function menu(){setMeta('메뉴','NewsBoard 전체 메뉴');
  app.innerHTML=`<div class="menu7"><div class="msrch">${SV(P.search)}<input id="mq" type="search" placeholder="메뉴·이슈·인물 검색" autocomplete="off"></div><div id="mres"></div>
  <div id="mgrp">${MENU.map(([g,c,L])=>`<section class="mg mg-${c}"><h3>${E(g)}</h3><div class="mgl">${L.map(([n,h,d,i])=>`<a class="mi" href="${h}" data-n="${E(n+' '+d)}"><span class="mic">${I(i)}</span><b>${E(n)}</b><small>${E(d)}</small></a>`).join('')}</div></section>`).join('')}
  <section class="mg mg-set" id="settings7"><h3>설정</h3>
   <div class="srow"><span>${I('book')}<b>글자 크기</b></span><div class="seg"><button data-fs="-5">가−</button><em>${S.fs}%</em><button data-fs="5">가+</button></div></div>
   <div class="srow"><span>${I('news')}<b>국내 / 해외</b></span><div class="seg" id="mreg">${[['kr','국내'],['ko','해외 KR'],['en','해외 EN']].map(([m,l])=>`<button data-m="${m}" class="${(S.region==='kr'?'kr':S.orig?'en':'ko')===m?'on':''}">${l}</button>`).join('')}</div></div>
   <div class="srow"><span>${I('alert')}<b>편향 배지 표시</b></span><label class="sw"><input type="checkbox" id="mbias" ${S.nobias?'':'checked'}><i></i></label></div>
   <a class="srow" href="settings"><span>${I('gear')}<b>카테고리 고르기</b><small>스포츠·연예 등 숨기기</small></span><em>${NBI('chevron-right')}</em></a>
   <a class="srow" href="alerts/settings"><span>${I('alert')}<b>알림 설정</b></span><em>${NBI('chevron-right')}</em></a>
   <details class="srow ab"><summary><span>${I('spark')}<b>NewsBoard 소개</b></span></summary><p class="fine">여러 포털과 언론사 기사를 자동으로 모아 이슈별로 묶고, 사건의 흐름을 타임라인으로 보여주는 서비스예요. 내 서재 기록은 이 기기에만 저장되고, 개인정보는 받지 않아요.</p><p class="fine">아이콘: <a href="https://tabler.io/icons" target="_blank" rel="noopener">Tabler Icons</a> (MIT 라이선스, © Paweł Kuna) · 국회 아이콘 <a href="https://lucide.dev" target="_blank" rel="noopener">Lucide</a> (ISC). <a href="assets/icons.html">아이콘 모음 보기</a></p></details>
  </section></div></div>`;
  const q=document.getElementById('mq');q.oninput=()=>{const s=q.value.trim();document.getElementById('mgrp').style.display=s?'none':'';if(!s){mres.innerHTML='';return}
    const mi=MENU.flatMap(g=>g[2]).filter(x=>(x[0]+x[2]).includes(s)).map(x=>`<a class="sr" href="${x[1]}">${I(x[3])}<b>${E(x[0])}</b><small>메뉴</small></a>`);
    const is=D.issues.filter(i=>i.title.includes(s)).slice(0,6).map(i=>`<a class="sr" href="issue/${i.id}">${I('fire')}<b>${E(i.title)}</b><small>이슈</small></a>`);
    const en=D.entities.filter(e=>e.name.includes(s)).slice(0,6).map(e=>`<a class="sr" href="${eh(e.name)}">${I('user')}<b>${E(e.name)}</b><small>${E(TYPE[e.type]||'')}</small></a>`);
    mres.innerHTML=[...mi,...is,...en].join('')||`<p class="fine">'${E(s)}'에 맞는 결과가 없어요. <a href="${kh(s)}">키워드로 찾아보기 ${NBI('arrow-right')}</a></p>`};
  const mres=document.getElementById('mres');
  app.querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>{fsV(+b.dataset.fs);menu()});
  document.getElementById('mreg').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const m=b.dataset.m;S.region=m==='kr'?'kr':'en';if(m!=='kr')S.orig=m==='en';saveS();typeof header2==='function'&&header2();menu();toast(m==='kr'?'국내 뉴스로 바꿨어요':'해외 뉴스로 바꿨어요')};
  document.getElementById('mbias').onchange=ev=>{S.nobias=!ev.target.checked;saveS();document.body.classList.toggle('nobias',S.nobias)};}
/* ---------- 알림 계산 ---------- */
function computeAlerts(){const out=[],ls=M.alerts.lastSeen||0,on=M.alerts.on;if(!(typeof D!=='undefined'&&D))return out;
  if(on.kw)M.keywords.forEach(k=>{D.issues.filter(i=>(i.title+' '+(i.keywords||[]).join(' ')).includes(k)).slice(0,3).forEach(i=>out.push({id:'kw-'+k+i.id,ty:'kw',ic:'search',lab:'키워드',title:`'${k}' 새 기사`,body:i.title,href:'issue/'+i.id,t:D.updated}))});
  if(on.follow)Object.values(M.follows).forEach(f=>{if(f.t==='entity'){const e=D.entities.find(x=>x.name===f.id);(e?.timeline||[]).filter(x=>new Date(x.t)>f.at-864e5).slice(0,2).forEach(x=>out.push({id:'f-'+f.id+x.t,ty:'follow',ic:'user',lab:'팔로우',title:`${f.id} 새 소식`,body:x.title,href:eh(f.id),t:x.t}))}
    else if(f.t==='issue'){const i=D.issues.find(x=>x.id===f.id);if(i)out.push({id:'fi-'+f.id+D.updated,ty:'follow',ic:'fire',lab:'팔로우',title:'따라가는 이슈 업데이트',body:`${i.title} · 기사 ${i.mentions}건`,href:'issue/'+i.id,t:D.updated})}
    else if(f.t==='kw'){const t=D.trends.find(x=>x.keyword===f.id);if(t)out.push({id:'fk-'+f.id+D.date,ty:'follow',ic:'search',lab:'팔로우',title:`'${f.id}' 오늘도 화제`,body:`기사 ${t.articles||0}건`,href:kh(f.id),t:D.updated})}});
  if(on.ind)Object.entries(M.watch.ind).forEach(([n,th])=>{const m=(D.market||[]).find(x=>x.name===n);if(m&&Math.abs(+m.rate)>=th)out.push({id:'i-'+n+m.at,ty:'ind',ic:'chart',lab:'지표',title:`${n} ${m.dir==='FALLING'?'하락':'상승'} ${m.rate}%`,body:`기준 ${th}%를 넘었어요 · 현재 ${m.price}`,href:'market',t:m.at,tone:m.dir==='FALLING'?'down':'up'})});
  if(on.apt&&window._APT&&M.watch.apt.length){const tr=_APT.trade||{};const ms=Object.keys(tr).sort();const a=ms[ms.length-1],b=ms[ms.length-2];M.watch.apt.forEach(g=>{const x=tr[a]?.[g],y=tr[b]?.[g];if(x)out.push({id:'a-'+g+a,ty:'apt',ic:'spark',lab:'아파트',title:`${g}구 ${a.slice(4)}월 거래 ${x[0]}건`,body:`평균 ${(x[1]/10000).toFixed(1)}억${y?` · 전월 대비 ${x[0]-y[0]>=0?'+':''}${x[0]-y[0]}건`:''}`,href:'market',t:D.updated})})}
  if(on.quiz){let L={};try{L=JSON.parse(localStorage.getItem('nb-learn')||'{}')}catch(e){}const d=new Date();const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(!(L.days&&L.days[k]&&L.days[k].done))out.push({id:'q-'+k,ty:'quiz',ic:'book',lab:'퀴즈',title:'오늘의 단어 퀴즈가 기다려요',body:'3분이면 끝나요. 연속 기록을 이어가세요!',href:'quiz',t:D.updated})}
  return out}
function unread(){return computeAlerts().filter(a=>!M.alerts.seen[a.id]).length}
function badge(){const c=document.getElementById('bellc');if(!c)return;const n=unread();c.textContent=n>9?'9+':n||'';c.style.display=n?'':'none'}
const TYP=[['kw','키워드 알림','내 키워드가 들어간 새 기사','search'],['follow','팔로우 업데이트','따라가는 이슈·인물·키워드의 새 소식','bell'],['ind','지표 변동','관심 지표가 기준보다 크게 움직일 때','chart'],['apt','아파트 실거래','관심 지역에 새 거래가 잡힐 때','apt'],['quiz','퀴즈 리마인더','오늘 퀴즈를 아직 안 풀었을 때','quiz'],['reply','댓글·답글','내 댓글에 답글이 달릴 때','chat']];
function alerts(sub){setMeta('알림','');if(sub==='settings')return alertSet();
  const A=computeAlerts();app.innerHTML=`<div class="sec"><h2><small>Notifications</small>${I('bell')}알림</h2><a class="more" href="alerts/settings">설정 ${NBI('arrow-right')}</a></div>
  <div class="afil" id="afil"><button data-f="" class="on">전체</button>${TYP.slice(0,5).map(t=>`<button data-f="${t[0]}">${t[1].split(' ')[0]}</button>`).join('')}</div>
  <div class="alist" id="alist">${A.length?A.map(a=>`<a class="al ty-${a.ty} ${M.alerts.seen[a.id]?'':'new'} ${a.tone||''}" href="${a.href}" data-ty="${a.ty}"><span class="ali">${I(a.ic)}</span><div><em>${a.lab}</em><b>${E(a.title)}</b><p>${E(a.body)}</p></div><time class="ts">${typeof ago==='function'?ago(a.t):''}</time></a>`).join(''):`<div class="aempty">${SV(P.bell)}<b>아직 알림이 없어요</b><p>키워드를 등록하거나 이슈·인물을 팔로우하면 새 소식을 모아 드려요.</p><a class="pri" href="alerts/settings">알림 키워드 추가하기</a></div>`}</div>
  <div class="al ty-reply soon"><span class="ali">${I('chat')}</span><div><em>댓글·답글</em><b>내 댓글의 답글 알림</b><p>댓글 기능과 로그인이 생기면 여기로 와요.</p></div><span class="soonb">로그인 이후</span></div>`;
  A.forEach(a=>M.alerts.seen[a.id]=1);M.alerts.lastSeen=Date.now();save();
  document.getElementById('afil').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;document.querySelectorAll('#afil button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('#alist .al').forEach(x=>x.style.display=!b.dataset.f||x.dataset.ty===b.dataset.f?'':'none')}}
function alertSet(){const D2=()=>{app.innerHTML=`<div class="sec"><h2><small>Alert settings</small>${I('bell')}알림 설정</h2><a class="more" href="alerts">알림함 ${NBI('arrow-right')}</a></div>
  <div class="card setc"><h3>알림 키워드</h3><p class="fine">이 단어가 들어간 새 기사가 오면 알려드려요.</p><div class="kwin"><input id="kwi" placeholder="예: 금리, 반도체"><button class="pri" id="kwa">추가</button></div><div class="kwl">${M.keywords.map(k=>`<button data-k="${E(k)}">#${E(k)} ${SV(P.x)}</button>`).join('')}</div></div>
  <div class="card setc"><h3>받을 알림</h3>${TYP.map(([k,n,d,i])=>`<div class="srow"><span>${I(i)}<b>${n}</b><small>${d}</small></span>${k==='reply'?'<span class="soonb">로그인 이후</span>':`<label class="sw"><input type="checkbox" data-on="${k}" ${M.alerts.on[k]?'checked':''}><i></i></label>`}</div>`).join('')}</div>
  <div class="card setc"><h3>휴대폰 푸시 알림</h3><p class="fine">지금은 사이트를 열 때 새 소식을 모아 보여드려요. 앱을 닫아도 오는 푸시 알림은 로그인 기능과 함께 준비 중이에요. 아이폰은 홈 화면에 NewsBoard를 추가해야 받을 수 있어요.</p><span class="soonb">준비 중</span></div>`;
  document.getElementById('kwa').onclick=()=>{const v=document.getElementById('kwi').value.trim();if(v&&!M.keywords.includes(v)){M.keywords.push(v);save()}D2()};
  document.getElementById('kwi').onkeydown=e=>{if(e.key==='Enter')document.getElementById('kwa').click()};
  app.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{M.keywords=M.keywords.filter(x=>x!==b.dataset.k);save();D2()});
  app.querySelectorAll('[data-on]').forEach(x=>x.onchange=()=>{M.alerts.on[x.dataset.on]=x.checked?1:0;save()})};D2()}
/* ---------- 내 서재 ---------- */
function lvl(x){return 1+Math.floor((x||0)/100)}
function myView(sub){setMeta('내 서재','');if(sub==='home')return homeSet();
  const SA=Object.values(M.saves);let L={};try{L=JSON.parse(localStorage.getItem('nb-learn')||'{}')}catch(e){}
  const days=Object.keys(M.reads).sort();let streak=0;{const d=new Date();for(;;){const k=d.toISOString().slice(0,10);if(M.reads[k]){streak++;d.setDate(d.getDate()-1)}else break}}
  const cat={},lean={left:0,right:0,n:0};let nRead=0;days.forEach(d=>Object.values(M.reads[d]).forEach(r=>{nRead++;cat[r.c]=(cat[r.c]||0)+1;Object.entries(r.l||{}).forEach(([k,v])=>lean[k]=(lean[k]||0)+v)}));
  const tot=Object.values(cat).reduce((a,b)=>a+b,0)||1,lt=lean.left+lean.right+lean.n||1;
  const tags=[...new Set(SA.flatMap(s=>s.tags||[]))];
  let tab=sessionStorage.getItem('nb-mytab')||'all';
  const TY={issue:['이슈','fire'],entity:['인물·기업','user'],kw:['키워드','search'],chart:['지표','chart']};
  const card=s=>`<a class="myi ty-${s.t}" href="${s.href||'#'}">${s.img?`<span class="myth" style="background-image:url('${E(s.img)}')"></span>`:`<span class="myth noimg">${I(TY[s.t]?.[1])}</span>`}<div><em>${TY[s.t]?.[0]||''}${s.col?` · ${E((M.cols.find(c=>c.id===s.col)||{}).name||'')}`:''}</em><b>${E(s.title)}</b>${s.note?`<p class="mnote">${E(s.note)}</p>`:''}<span class="mtags">${(s.tags||[]).map(t=>`<i>#${E(t)}</i>`).join('')}${s.like?`<i class="lk">${SV(P.heart)}</i>`:''}</span></div><span class="mhw" data-t="${s.t}" data-id="${E(s.id)}"><button class="myact-n" data-a="note" aria-label="메모">${SV(P.plus)}</button></span></a>`;
  const rel=SA.filter(s=>s.t==='entity'||s.t==='kw').map(s=>{const i=D.issues.find(x=>(x.entities||[]).includes(s.id)||x.title.includes(s.id));return i&&{s,i}}).filter(Boolean).slice(0,4);
  app.innerHTML=`<div class="myhead"><div class="myav">${SV(P.my||P.bm)}</div><div>${tok()?`<b>내 계정</b><small id="syncst">${localStorage.getItem('nb-prov')==='kakao'?'카카오':'Google'} 로그인 · 모든 기기에서 이어져요</small>`:`<b>게스트</b><small>이 기기에 저장 중 · 로그인 없이 사용</small>`}</div><a class="ghost sm" href="my/home">${I('gear')}내 홈 꾸미기</a></div>
  <div class="mystat"><div class="xp"><span>${NBI('flame',1,'on')}${streak}일</span><small>연속 읽기</small></div><div class="xp"><span>Lv.${lvl(L.xp)}</span><small>퀴즈 XP ${L.xp||0}</small><i style="--p:${(L.xp||0)%100}%"></i></div><div class="xp"><span>${SA.length}</span><small>저장한 것</small></div><div class="xp"><span>${Object.keys(M.follows).length}</span><small>팔로우</small></div></div>
  ${rel.length?`<div class="sec"><h2><small>Connected</small>${I('link')}내 스크랩과 이어진 새 소식</h2></div><div class="myrel">${rel.map(({s,i})=>`<a href="issue/${i.id}"><em>${E(s.title)}</em><b>${E(i.title)}</b></a>`).join('')}</div>`:''}
  <div class="sec"><h2><small>Library</small>${I('book')}내 서재</h2><button class="more" id="newcol">+ 컬렉션</button></div>
  <div class="afil" id="mytab">${[['all','전체'],['like','좋아요'],['scrap','스크랩'],['note','메모'],...M.cols.map(c=>['c:'+c.id,c.name]),...tags.map(t=>['t:'+t,'#'+t])].map(([k,l])=>`<button data-k="${E(k)}" class="${k===tab?'on':''}">${k.startsWith('c:')?NBI('folder',1):''}${E(l)}</button>`).join('')}</div>
  <div class="mylist" id="mylist"></div>
  <div class="sec"><h2><small>Following</small>${I('bell')}팔로우 중</h2><a class="more" href="alerts/settings">키워드 추가 ${NBI('arrow-right')}</a></div>
  <div class="kwl">${Object.values(M.follows).map(f=>`<a href="${f.t==='issue'?'issue/'+f.id:f.t==='kw'?kh(f.id):eh(f.id)}">${I(TY[f.t]?.[1])}${E(f.title)}</a>`).join('')}${M.keywords.map(k=>`<a href="${kh(k)}">#${E(k)}</a>`).join('')}${!Object.keys(M.follows).length&&!M.keywords.length?'<p class="fine">이슈나 인물 화면에서 팔로우를 누르면 여기에 모여요.</p>':''}</div>
  <div class="sec"><h2><small>My analysis</small>${I('chart')}나의 읽기 분석</h2></div>
  ${nRead?`<div class="myan"><div class="card"><h4>무엇을 읽었나 <small>${nRead}건</small></h4><div class="catbar">${Object.entries(cat).map(([c,n])=>`<i style="flex:${n};background:${CATC[c]||'#999'}"></i>`).join('')}</div><div class="legend">${Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<span style="--c:${CATC[c]||'#999'}">${c} ${Math.round(n/tot*100)}%</span>`).join('')}</div></div>
   <div class="card"><h4>읽은 기사의 균형</h4><div class="lean"><i class="l" style="flex:${lean.left}"></i><i class="n" style="flex:${lean.n}"></i><i class="r" style="flex:${lean.right}"></i></div><div class="legend"><span style="--c:#2f6bff">좌편향 주의 ${Math.round(lean.left/lt*100)}%</span><span style="--c:#aab">중립 ${Math.round(lean.n/lt*100)}%</span><span style="--c:#ff4d2e">우편향 주의 ${Math.round(lean.right/lt*100)}%</span></div></div>
   <div class="card"><h4>최근 14일</h4><div class="days">${Array.from({length:14},(_,k)=>{const d=new Date(Date.now()-(13-k)*864e5).toISOString().slice(0,10);const n=Object.keys(M.reads[d]||{}).length;return`<i style="--o:${Math.min(1,n/5)}" title="${d} ${n}건"></i>`}).join('')}</div></div></div>`:'<p class="fine">이슈를 읽으면 주제 비율과 균형을 여기서 보여드려요.</p>'}
  <div class="sec"><h2><small>Backup</small>${I('link')}다른 기기로 옮기기</h2></div>
  <div class="card setc"><p class="fine">로그인 전에는 이 기기에만 저장돼요. 백업 파일이나 코드로 다른 기기에 옮길 수 있어요.</p><div class="mbr"><button class="pri" id="exf">백업 파일 받기</button><button id="imf">파일 불러오기</button><button id="exc">코드 복사</button><button id="imc">코드 붙여넣기</button></div><input type="file" id="imfi" accept=".json,application/json" hidden></div>
  <div class="card setc login" id="loginc">${tok()?`<h3>${I('user')}모든 기기에서 이어지는 중</h3><p class="fine">좋아요·스크랩·메모·팔로우가 로그인한 모든 기기에 자동으로 맞춰져요.</p><div class="mbr"><button id="syncnow">지금 맞추기</button><button id="logout">로그아웃</button></div>`:`<h3>${I('user')}로그인하면 모든 기기에서 자동으로 이어져요</h3><p class="fine">지금 이 기기에 모은 것도 그대로 옮겨져요. 이메일이나 이름은 받지 않아요.</p><div class="mbr" id="loginb"><span class="soonb">준비 중</span></div>`}</div>`;
  if(tok()){document.getElementById('syncnow').onclick=()=>{sync().then(()=>toast('맞췄어요'))};document.getElementById('logout').onclick=async()=>{try{await api('/logout',{method:'POST'})}catch(e){}['nb-tok','nb-rev','nb-prov','nb-syncat'].forEach(k=>localStorage.removeItem(k));toast('로그아웃했어요. 이 기기의 서재는 그대로 남아요');myView()}}
  else fetch(SYNC+'/health').then(r=>r.json()).then(h=>{const L=h.login||{},b=document.getElementById('loginb');if(!b||!(L.google||L.kakao))return;
    b.innerHTML=(L.google?`<a class="lgb g" href="${SYNC}/auth/google/start">Google로 계속하기</a>`:'')+(L.kakao?`<a class="lgb k" href="${SYNC}/auth/kakao/start">카카오로 계속하기</a>`:'')}).catch(()=>{});
  const draw=()=>{sessionStorage.setItem('nb-mytab',tab);const f=SA.filter(s=>tab==='all'||(tab==='like'&&s.like)||(tab==='scrap'&&s.scrap)||(tab==='note'&&s.note)||(tab.startsWith('c:')&&s.col===tab.slice(2))||(tab.startsWith('t:')&&(s.tags||[]).includes(tab.slice(2)))).sort((a,b)=>(b.u||b.at)-(a.u||a.at));
    document.getElementById('mylist').innerHTML=f.length?f.map(card).join(''):`<div class="aempty">${SV(P.bm)}<b>아직 비어 있어요</b><p>이슈·인물·지표 카드의 하트나 스크랩을 눌러 모아 보세요.</p></div>`};draw();
  document.getElementById('mytab').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;tab=b.dataset.k;document.querySelectorAll('#mytab button').forEach(x=>x.classList.toggle('on',x===b));draw()};
  document.getElementById('newcol').onclick=()=>{const n=prompt('새 컬렉션 이름');if(n&&n.trim()){M.cols.push({id:'c'+Date.now().toString(36),name:n.trim()});save();myView()}};
  const dump=()=>JSON.stringify({app:'newsboard',v:1,at:new Date().toISOString(),data:Object.assign({},M,{learn:L})});
  const restore=s=>{try{const o=JSON.parse(s);if(o.app!=='newsboard')throw 0;const d=o.data;if(d.learn)localStorage.setItem('nb-learn',JSON.stringify(d.learn));delete d.learn;M=Object.assign(JSON.parse(JSON.stringify(DEF)),d);save();toast('불러왔어요');myView()}catch(e){toast('백업 내용을 읽지 못했어요')}};
  document.getElementById('exf').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([dump()],{type:'application/json'}));a.download='newsboard-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click()};
  document.getElementById('imf').onclick=()=>document.getElementById('imfi').click();
  document.getElementById('imfi').onchange=ev=>{const f=ev.target.files[0];if(f)f.text().then(restore)};
  document.getElementById('exc').onclick=async()=>{const c='NB1.'+btoa(unescape(encodeURIComponent(dump())));try{await navigator.clipboard.writeText(c);toast('백업 코드를 복사했어요')}catch(e){prompt('이 코드를 복사하세요',c)}};
  document.getElementById('imc').onclick=()=>{const c=prompt('백업 코드를 붙여넣으세요');if(c)try{restore(decodeURIComponent(escape(atob(c.trim().replace(/^NB1\./,'')))))}catch(e){toast('백업 코드를 읽지 못했어요')}};}
function homeSet(){const draw=()=>{const sl=k=>{const names=M.home[k]||M.home['k'+k]||[];const hide=M.home[k==='today'?'hideT':'hideM'];return names.map((n,i)=>`<div class="ord"><label class="sw sm"><input type="checkbox" data-h="${k}" data-n="${E(n)}" ${hide.includes(n)?'':'checked'}><i></i></label><b>${E(n)}</b><button data-mv="${k}" data-i="${i}" data-d="-1" aria-label="위로">${SV(P.up)}</button><button data-mv="${k}" data-i="${i}" data-d="1" aria-label="아래로">${SV(P.dn)}</button></div>`).join('')||'<p class="fine">오늘·마켓 화면을 한 번 열면 섹션 목록이 생겨요.</p>'};
  const mk=(D.market||[]);const dist=window._APT?Object.keys(Object.values(_APT.trade||{}).slice(-1)[0]||{}):[];
  app.innerHTML=`<div class="sec"><h2><small>My home</small>${I('gear')}내 홈 꾸미기</h2><a class="more" href="my">내 서재 ${NBI('arrow-right')}</a></div>
  <div class="card setc"><h3>오늘 화면 섹션</h3><p class="fine">켜고 끄고, 화살표로 순서를 바꿔요.</p>${sl('today')}</div>
  <div class="card setc"><h3>마켓 화면 섹션</h3>${sl('market')}</div>
  <div class="card setc"><h3>관심 지표</h3><p class="fine">고른 지표가 기준(%)보다 크게 움직이면 알림에 떠요.</p><div class="indl">${mk.map(m=>{const w=M.watch.ind[m.name];return`<div class="ord"><label class="sw sm"><input type="checkbox" data-ind="${E(m.name)}" ${w!=null?'checked':''}><i></i></label><b>${E(m.name)}</b><select data-th="${E(m.name)}" ${w==null?'disabled':''}>${[0.5,1,2,3,5].map(t=>`<option ${w==t?'selected':''}>${t}</option>`).join('')}</select><small>%</small></div>`}).join('')}</div></div>
  <div class="card setc"><h3>관심 아파트 지역 (서울)</h3><div class="kwl pick">${dist.map(g=>`<button data-apt="${E(g)}" class="${M.watch.apt.includes(g)?'on':''}">${E(g)}</button>`).join('')||'<p class="fine">지역 목록을 불러오는 중이에요.</p>'}</div></div>
  <div class="card setc"><h3>구독 카테고리</h3><div class="kwl pick">${CATS.map(c=>`<button data-cat="${c}" class="${S.hide.includes(c)?'':'on'}">${I(c)}${c}</button>`).join('')}</div></div>`;
  app.querySelectorAll('[data-h]').forEach(x=>x.onchange=()=>{const k=x.dataset.h==='today'?'hideT':'hideM',n=x.dataset.n;M.home[k]=x.checked?M.home[k].filter(y=>y!==n):[...M.home[k],n];save()});
  app.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const k=b.dataset.mv,i=+b.dataset.i,d=+b.dataset.d;const a=(M.home[k]||M.home['k'+k]).slice();const j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];M.home[k]=a;save();draw()});
  app.querySelectorAll('[data-ind]').forEach(x=>x.onchange=()=>{const n=x.dataset.ind;if(x.checked)M.watch.ind[n]=1;else delete M.watch.ind[n];save();draw()});
  app.querySelectorAll('[data-th]').forEach(x=>x.onchange=()=>{M.watch.ind[x.dataset.th]=+x.value;save()});
  app.querySelectorAll('[data-apt]').forEach(b=>b.onclick=()=>{const g=b.dataset.apt;M.watch.apt=M.watch.apt.includes(g)?M.watch.apt.filter(x=>x!==g):[...M.watch.apt,g];save();draw()});
  app.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{const c=b.dataset.cat;S.hide=S.hide.includes(c)?S.hide.filter(x=>x!==c):[...S.hide,c];saveS();draw()})};draw()}
/* ---------- 라우팅 연결: 알 수 없는 경로는 today()로 오므로 감싸서 분기 ---------- */
const prevToday=window.today;
window.today=function(){const[v,a]=curV();if(v==='my')return myView(a);if(v==='menu')return menu();if(v==='alerts')return alerts(a);const r=(window._todayInner||prevToday).apply(this,arguments);setTimeout(after,0);return r};
Object.defineProperty(window,'_wrapToday',{value:1});
/* fun.js 등이 나중에 today를 덮어써도 내 분기가 먼저 오게 */
let _t=window.today;setTimeout(()=>{if(window.today!==_t){window._todayInner=window.today;window.today=_t;}},0);
['market','issue','entity','kw'].forEach(n=>{const f=window[n];if(typeof f==='function')window[n]=function(){const r=f.apply(this,arguments);setTimeout(after,0);return r}});
fetch('data/gov/apt.json').then(r=>r.ok?r.json():null).then(j=>{window._APT=j;badge()}).catch(()=>{});
ready.then(()=>{nav();if(typeof BASEP==='undefined'){document.querySelectorAll('.tabbar [data-v=menu]').forEach(x=>x.classList.add('on'));return}const go_=()=>{if((typeof D!=='undefined'&&D)){hl();after();const[v]=curV();if(['my','menu','alerts'].includes(v))route()}else setTimeout(go_,150)};go_()});
})();

/* 이슈 상세 → 인물 아카이브 연결(이슈 본문에 등장하는 아카이브 인물) */
let ARCN=null;async function arcLink(id){try{ARCN=ARCN||await (await fetch('https://newsboard-sync.pyw213.workers.dev/archive/people?n=200')).json();
 const tx=(document.querySelector('#app')?.innerText||'').slice(0,20000);const hit=ARCN.filter(p=>p.name.length>1&&tx.includes(p.name)).slice(0,6);
 if(!hit.length||document.querySelector('.arcrow'))return;const h=document.querySelector('#app .myact')||document.querySelector('#app h1,#app h2');
 h&&h.insertAdjacentHTML('afterend',`<div class="arcrow" style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0"><span style="font-size:12px;color:#888;align-self:center">이 이슈의 인물 일생 보기</span>${hit.map(p=>`<a href="persons/?id=${p.id}" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;border-radius:999px;background:#fff;box-shadow:0 1px 5px #0f163020;text-decoration:none;color:#1b2140;font-size:13px;font-weight:700">${p.photo?`<img src="${p.photo}" alt="" style="width:24px;height:24px;border-radius:50%;object-fit:cover;object-position:top">`:''}${E(p.name)}</a>`).join('')}</div>`)}catch(e){}}
