/* NewsBoard nb2 · ① 디자인시스템 컨트롤(셀렉트·스위치 자동 교체) ② 실시간 티커 카테고리 ③ 메뉴(편집 인덱스) */
(function(){
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gD=()=>typeof D!=='undefined'?D:null,gG=()=>typeof G!=='undefined'?G:null;
const I=(n,f)=>window.NBI?NBI(n,f):'';
/* ============ ① 컨트롤: 기본 시스템 UI 금지 → 우리 컴포넌트로 교체 ============ */
let openPop=null;
function closePop(){if(openPop){openPop.btn.setAttribute('aria-expanded','false');openPop.list.remove();openPop=null}}
document.addEventListener('pointerdown',e=>{if(openPop&&!openPop.list.contains(e.target)&&!openPop.btn.contains(e.target))closePop()},true);
window.addEventListener('resize',closePop);window.addEventListener('scroll',e=>{if(!openPop)return;const t=e.target;if(openPop.list.contains(t))return;if(t===document||t===document.documentElement||(t.contains&&t.contains(openPop.btn)))closePop()},true);
/* 공통 팝오버 리스트: opts=[{v,label,sub,icon}] */
function popList(btn,opts,cur,onPick,o={}){closePop();const list=document.createElement('div');list.className='ds-pop'+(o.cls?' '+o.cls:'');list.setAttribute('role','listbox');
  list.innerHTML=(o.title?`<div class="ds-pop-h">${E(o.title)}</div>`:'')+opts.map((x,i)=>`<button type="button" role="option" class="ds-opt${x.v===cur?' on':''}" data-i="${i}" aria-selected="${x.v===cur}">${x.icon?`<span class="ds-opt-i">${I(x.icon)}</span>`:''}<span class="ds-opt-t"><b>${E(x.label)}</b>${x.sub?`<small>${E(x.sub)}</small>`:''}</span>${x.v===cur?`<span class="ds-opt-c">${I('circle-check')}</span>`:''}</button>`).join('');
  document.body.appendChild(list);const r=btn.getBoundingClientRect(),w=Math.max(r.width,o.w||200);
  let left=Math.min(r.left,innerWidth-w-8);list.style.cssText=`left:${Math.max(8,left)}px;top:${r.bottom+6}px;min-width:${w}px`;
  const lr=list.getBoundingClientRect();if(lr.bottom>innerHeight-8&&r.top>lr.height+8)list.style.top=(r.top-lr.height-6)+'px';
  btn.setAttribute('aria-expanded','true');openPop={btn,list};
  const bs=[...list.querySelectorAll('.ds-opt')];(bs.find(b=>b.classList.contains('on'))||bs[0])?.focus({preventScroll:true});
  list.onclick=e=>{const b=e.target.closest('.ds-opt');if(!b)return;const x=opts[+b.dataset.i];closePop();btn.focus({preventScroll:true});onPick(x)};
  list.onkeydown=e=>{const i=bs.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();bs[(i+1)%bs.length].focus()}else if(e.key==='ArrowUp'){e.preventDefault();bs[(i-1+bs.length)%bs.length].focus()}else if(e.key==='Escape'){closePop();btn.focus()}else if(e.key==='Tab')closePop()}}
window.NBPop=popList;
/* <select> → .ds-select (원래 select는 숨겨 값·change 이벤트 유지) */
function enhanceSelect(s){if(s.dataset.ds)return;s.dataset.ds=1;const btn=document.createElement('button');btn.type='button';btn.className='ds-select';btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');
  const lab=s.getAttribute('aria-label');if(lab)btn.setAttribute('aria-label',lab);
  const sync=()=>{const o=s.options[s.selectedIndex];btn.innerHTML=`<span>${E(o?o.text:'')}</span>${I('chevron-down')}`;btn.disabled=s.disabled};sync();
  s.classList.add('ds-native');s.tabIndex=-1;s.setAttribute('aria-hidden','true');s.after(btn);
  btn.onclick=()=>{if(openPop&&openPop.btn===btn)return closePop();popList(btn,[...s.options].map(o=>({v:o.value,label:o.text})),s.value,x=>{s.value=x.v;sync();s.dispatchEvent(new Event('change',{bubbles:true}));s.dispatchEvent(new Event('input',{bubbles:true}))},{title:lab||''})};
  btn.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();btn.click()}};
  new MutationObserver(sync).observe(s,{attributes:true,childList:true,subtree:true});s.addEventListener('change',sync)}
/* 맨 체크박스 → .ds-switch (이미 .sw/.tg로 꾸민 것은 그대로) */
function enhanceCheck(c){if(c.dataset.ds||c.closest('.sw,.tg,.ds-switch'))return;c.dataset.ds=1;const w=document.createElement('span');w.className='ds-switch';c.before(w);w.appendChild(c);w.insertAdjacentHTML('beforeend','<i></i>')}
function enhance(root){if(!root||!root.querySelectorAll)return;root.querySelectorAll('select:not([data-ds])').forEach(enhanceSelect);root.querySelectorAll('input[type=checkbox]:not([data-ds])').forEach(enhanceCheck)}
window.NBEnhance=enhance;
const mo=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1){if(n.matches&&n.matches('select,input[type=checkbox]'))enhance(n.parentNode);else enhance(n)}});
const boot=()=>{enhance(document.body);mo.observe(document.body,{childList:true,subtree:true})};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();

/* ============ ② 실시간 티커: 카테고리 선택 ============ */
const TK=[
 {v:'live',label:'실시간',sub:'지금 많이 찾는 검색어',icon:'flame'},
 {v:'kw',label:'뉴스 키워드',sub:'오늘 기사에 많이 나온 말',icon:'news'},
 {v:'person',label:'인물',sub:'오늘 기사 속 주목 인물',icon:'user'},
 {v:'stock',label:'증시',sub:'많이 오르고 내린 종목',icon:'chart-candle'},
 {v:'fx',label:'환율·원자재',sub:'크게 움직인 지표',icon:'currency-dollar'},
 {v:'apt',label:'부동산',sub:'서울 아파트 거래 많은 구',icon:'building-community'},
 {v:'world',label:'해외 트렌드',sub:'미국에서 많이 찾는 말',icon:'world'}];
let APT=null,aptP=null;
const loadApt=()=>aptP||(aptP=fetch('data/gov/apt.json?'+Date.now()).then(r=>r.ok?r.json():null).catch(()=>null).then(j=>APT=j));
const tkCur=()=>localStorage.getItem('nb-tk')||'live';
const arrow=r=>{r=+r;return r>0?`<i class="tkd up">${I('caret-up-f')}</i>`:r<0?`<i class="tkd dn">${I('caret-down-f')}</i>`:''};
function tkItems(v){const DD=gD(),GG=gG();if(!DD)return[];const R=S.region==='en'&&GG;
  if(v==='live'){const T=R?GG.trends:DD.trends;return T.map((t,i)=>({h:R?'gt/'+i:kh(t.keyword),t:R&&!S.orig?(t.keyword_ko||t.keyword):t.keyword}))}
  if(v==='world'){if(!GG)return[];return GG.trends.map((t,i)=>({h:'gt/'+i,t:S.orig?t.keyword:(t.keyword_ko||t.keyword)}))}
  if(v==='kw')return(DD.entities||[]).filter(e=>e.type!=='person').sort((a,b)=>b.score-a.score).slice(0,12).map(e=>({h:eh(e.name),t:e.name}));
  if(v==='person')return(DD.entities||[]).filter(e=>e.type==='person').sort((a,b)=>b.score-a.score).slice(0,12).map(e=>({h:eh(e.name),t:e.name}));
  if(v==='stock')return(DD.stocks||[]).slice().sort((a,b)=>Math.abs(b.rate)-Math.abs(a.rate)).slice(0,12).map(s=>({h:'market',t:s.name,x:arrow(s.rate)}));
  if(v==='fx')return(DD.market||[]).slice().sort((a,b)=>Math.abs(+b.rate)-Math.abs(+a.rate)).map(m=>({h:'market',t:m.name,x:arrow(m.rate)}));
  if(v==='apt'){if(!APT){loadApt().then(()=>tkcur==='apt'&&renderTicker());return[{h:'market',t:'불러오는 중'}]}const T=APT.trade||{},ks=Object.keys(T).sort();let k=ks.at(-1);if(k&&Object.keys(T[k]).length<10&&ks.length>1)k=ks.at(-2);const M=T[k]||{};return Object.entries(M).sort((a,b)=>b[1][0]-a[1][0]).slice(0,12).map(([g])=>({h:'market',t:g+'구'}))}
  return[]}
let tkcur='live';
function renderTicker(){const el=document.getElementById('ticker');if(!el||!gD())return;tkcur=tkCur();const o=TK.find(x=>x.v===tkcur)||TK[0];const R=S.region==='en'&&gG(),EN=R&&S.orig;
  let it=tkItems(o.v);if(!it.length){tkcur='live';it=tkItems('live')}const lab=tkcur==='live'&&R?(EN?'Global trends':'해외 트렌드'):(TK.find(x=>x.v===tkcur)||TK[0]).label;
  const tk=it.map((x,i)=>`<a href="${x.h}"><b>${i+1}</b>${E(x.t)}${x.x||''}</a>`).join('');
  const tr=R?`<button type="button" class="translate ${S.orig?'':'on'}" id="translate" title="${S.orig?'해외 뉴스를 한국어로 번역해 보기':'영어 원문으로 보기'}">${S.orig?'번역 보기':'원문 보기'}</button>`:'';
  el.innerHTML=`<button type="button" class="lab tksel" aria-haspopup="listbox" aria-expanded="false" aria-label="실시간 순위 종류 고르기 (지금: ${E(lab)})">${I(o.icon)}<span>${E(lab)}</span>${I('chevron-down')}</button><div class="tw" id="tw"><div class="run">${tk}<i class="sp"></i>${tk}</div></div>${tr}`;
  el.dataset.k=tkcur;typeof tickerDrag==='function'&&tickerDrag(document.getElementById('tw'));
  const tb=el.querySelector('#translate');if(tb)tb.onclick=()=>{S.orig=!S.orig;saveS();typeof header2==='function'&&header2();route()};
  const b=el.querySelector('.tksel');b.onclick=()=>{if(openPop&&openPop.btn===b)return closePop();popList(b,TK.filter(x=>x.v!=='world'||gG()),tkcur,x=>{localStorage.setItem('nb-tk',x.v);if(x.v==='apt')loadApt().then(renderTicker);renderTicker()},{title:'무엇의 순위를 볼까요?',w:240,cls:'tkpop'})}}
window.nbTicker=renderTicker;
const hookH=()=>{if(typeof header2!=='function'||header2._nb)return false;const o=header2;window.header2=function(){const r=o.apply(this,arguments);renderTicker();return r};window.header2._nb=1;return true};
if(!hookH()){const t=setInterval(()=>{if(hookH())clearInterval(t)},50);setTimeout(()=>clearInterval(t),8000)}
const ft=setInterval(()=>{if(gD()&&document.querySelector('#ticker .run')){if(!document.querySelector('#ticker .tksel'))renderTicker();clearInterval(ft)}},120);setTimeout(()=>clearInterval(ft),15000);

/* ============ ③ 메뉴: 편집 인덱스(Editorial Index) ============ */
const PIL=[
 {k:'news',no:'01',name:'뉴스',en:'NEWS',c:'#ff4d2e',d:'오늘 무슨 일이 있었는지',items:[['오늘','./','오늘의 이슈 TOP10과 흐름','file-text'],['타임라인','timeline','사건이 이어지는 순서대로','timeline-event'],['관계도','map','인물·기업·장소가 얽힌 모양','affiliate'],['화제','people','인물·기업·기관별로 모아보기','flame'],['민심·영상','voice','이슈마다 사람들의 생각과 방송사 영상','message-2'],['날짜 아카이브','archive','지난 날의 이슈 다시 보기','history']]},
 {k:'money',no:'02',name:'돈과 정책',en:'MONEY & POLICY',c:'#11a683',d:'내 지갑과 나라 살림',items:[['마켓','market','증시·환율·원자재 한눈에','chart-candle'],['경기선행지수','market#lead','경기가 어디로 가는지','trending-up'],['서울 아파트','market','구별 실거래 흐름','building-community'],['정치인 DB','politicians/','의원들의 법안·표결·재산','landmark']]},
 {k:'people',no:'03',name:'인물 아카이브',en:'PEOPLE',c:'#2f6bff',d:'사람으로 보는 뉴스',items:[['인물 타임라인','persons/','태어나서 오늘까지 일생 기록','timeline-event'],['인물 관계도','persons/#graph','가족·동문·지역구로 이어진 사람들','topology-star-3'],['오늘의 인물사','persons/','몇 년 전 오늘 있었던 일','history'],['인물 블랙박스','history/','정치인·연예인의 지난 발언과 행적','report-search'],['이슈 연표','history/?t=i','반복되는 이슈의 수십 년 흐름','timeline-event'],['연도별 사건','history/?t=y','1948년부터 해마다 있었던 일','calendar-search']]},
 {k:'learn',no:'04',name:'쉽게 배우기',en:'LEARN',c:'#7a4dff',d:'어려운 뉴스를 3분 만에',items:[['오늘의 단어 퀴즈','quiz','OX로 맞히며 어려운 말 익히기','help-hexagon'],['4컷 만화','learn','핫이슈를 만화로 쉽게','boom'],['카드뉴스','learn','반복되는 사건을 카드로','cards'],['뉴스 게임','games/','이슈 2048·뉴스 머지·팩트 새총','sparkles'],['배지 모음','games/#badges','모을수록 빛나는 메달과 순위','trophy']]},
 {k:'me',no:'05',name:'나',en:'MY',c:'#0f1630',d:'내 기록과 알림',items:[['내 서재','my','좋아요·스크랩·메모·팔로우','bookmarks'],['알림','alerts','키워드·팔로우·지표·아파트 알림','bell'],['내 홈 꾸미기','my/home','오늘·마켓 섹션 순서','settings']]}];
function live(k){const DD=gD();if(!DD)return'';try{
  if(k==='news'){const i=DD.issues[0];return i?`<span class="ix-live"><em>1위</em>${E(i.title)}</span>`:''}
  if(k==='money'){const m=(DD.market||[]).find(x=>x.name==='KOSPI');return m?`<span class="ix-live"><em>KOSPI</em><b class="${+m.rate<0?'dn':'up'}">${+m.rate>0?'+':''}${m.rate}%</b></span>`:''}
  if(k==='people'){const p=(DD.entities||[]).filter(e=>e.type==='person').sort((a,b)=>b.score-a.score)[0];return p?`<span class="ix-live"><em>오늘의 인물</em>${E(p.name)}</span>`:''}
  if(k==='learn'){const w=(DD.words||[])[0];return w?`<span class="ix-live"><em>오늘의 단어</em>${E(w.word)}</span>`:''}
  }catch(e){}return''}
function setRegion(m){S.region=m==='kr'?'kr':'en';if(m!=='kr')S.orig=false;saveS();typeof header2==='function'&&header2()}
window.nbMenu=function(){setMeta('메뉴','NewsBoard 전체 메뉴');const app=document.getElementById('app');const DD=gD();
  const now=new Date(),dd=`${now.getMonth()+1}.${now.getDate()} (${'일월화수목금토'[now.getDay()]})`;
  const open=JSON.parse(localStorage.getItem('nb-ix')||'["news"]');const MD=S.region==='kr'?'kr':'ko';
  app.innerHTML=`<div class="ix">
  <header class="ix-top"><div class="ix-date"><b>${dd}</b>${DD?`<span>기사 ${(DD.stats.naver+DD.stats.google).toLocaleString()}건 · 언론사 ${DD.stats.presses}곳에서 모았어요</span>`:''}</div>
   <label class="ix-q">${I('search')}<input id="mq" type="search" placeholder="메뉴·이슈·인물 찾기" autocomplete="off" enterkeyhint="search"><kbd>/</kbd></label><div id="mres" class="ix-res"></div></header>
  <nav class="ix-list" id="mgrp" aria-label="전체 메뉴">${PIL.map(p=>`<section class="ix-p${open.includes(p.k)?' open':''}" style="--pc:${p.c}" data-k="${p.k}">
    <button type="button" class="ix-h" aria-expanded="${open.includes(p.k)}"><span class="ix-no">${p.no}</span><span class="ix-name"><small>${p.en}</small><b>${E(p.name)}</b><span class="ix-d">${E(p.d)}</span></span>${live(p.k)}<span class="ix-tg">${I('chevron-down')}</span></button>
    <div class="ix-items">${p.items.map(([n,h,d,ic])=>`<a class="ix-i" href="${h}"><span class="ix-ic">${I(ic)}</span><span class="ix-t"><b>${E(n)}</b><small>${E(d)}</small></span>${I('arrow-right')}</a>`).join('')}</div></section>`).join('')}</nav>
  <section class="ix-set"><h3><span>환경 설정</span></h3>
   <div class="ix-row"><span class="ix-rl">${I('book')}<b>글자 크기</b></span><div class="ds-stepper"><button type="button" data-fs="-5" aria-label="작게">가<sup>−</sup></button><em>${S.fs}%</em><button type="button" data-fs="5" aria-label="크게">가<sup>+</sup></button></div></div>
   <div class="ix-row"><span class="ix-rl">${I('world')}<b>뉴스 지역</b></span><div class="ds-pill" id="mreg" role="radiogroup">${[['kr','국내'],['ko','해외']].map(([m,l])=>`<button type="button" role="radio" aria-checked="${MD===m}" data-m="${m}" class="${MD===m?'on':''}">${l}</button>`).join('')}<i class="ds-segk"></i></div></div>
   <div class="ix-row"><span class="ix-rl">${I('alert-triangle')}<b>편향 배지 표시</b></span><button type="button" class="ds-toggle${S.nobias?'':' on'}" role="switch" aria-checked="${!S.nobias}" id="mbias"><i></i></button></div>
   <a class="ix-row" href="settings"><span class="ix-rl">${I('settings')}<b>카테고리 고르기</b><small>스포츠·연예 등 숨기기</small></span>${I('chevron-right')}</a>
   <a class="ix-row" href="alerts/settings"><span class="ix-rl">${I('bell')}<b>알림 설정</b></span>${I('chevron-right')}</a>
   <button type="button" class="ix-row ix-about" aria-expanded="false"><span class="ix-rl">${I('info-circle')}<b>NewsBoard 소개</b></span>${I('chevron-down')}</button>
   <div class="ix-aboutp" hidden><p>여러 포털과 언론사 기사를 자동으로 모아 이슈별로 묶고, 사건의 흐름을 타임라인으로 보여주는 서비스예요. 내 서재 기록은 이 기기에만 저장되고, 개인정보는 받지 않아요.</p><p>아이콘: <a href="https://tabler.io/icons" target="_blank" rel="noopener">Tabler Icons</a> (MIT) · 국회 아이콘 <a href="https://lucide.dev" target="_blank" rel="noopener">Lucide</a> (ISC) · <a href="assets/icons.html">아이콘 모음</a></p></div>
  </section></div>`;
  const segK=()=>{const s=document.getElementById('mreg'),b=s.querySelector('.on'),k=s.querySelector('.ds-segk');if(b){k.style.width=b.offsetWidth+'px';k.style.transform=`translateX(${b.offsetLeft-3}px)`}};requestAnimationFrame(segK);
  app.querySelectorAll('.ix-h').forEach(h=>h.onclick=()=>{const p=h.parentNode;p.classList.toggle('open');h.setAttribute('aria-expanded',p.classList.contains('open'));localStorage.setItem('nb-ix',JSON.stringify([...app.querySelectorAll('.ix-p.open')].map(x=>x.dataset.k)))});
  app.querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>{S.fs=Math.max(85,Math.min(130,S.fs+ +b.dataset.fs));saveS();b.parentNode.querySelector('em').textContent=S.fs+'%'});
  document.getElementById('mreg').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;setRegion(b.dataset.m);document.querySelectorAll('#mreg button').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on)});segK();toast(b.dataset.m==='kr'?'국내 뉴스로 바꿨어요':'해외 뉴스로 바꿨어요')};
  const tb=document.getElementById('mbias');tb.onclick=()=>{S.nobias=!S.nobias;saveS();tb.classList.toggle('on',!S.nobias);tb.setAttribute('aria-checked',!S.nobias);document.body.classList.toggle('nobias',S.nobias)};
  const ab=app.querySelector('.ix-about');ab.onclick=()=>{const p=app.querySelector('.ix-aboutp');p.hidden=!p.hidden;ab.setAttribute('aria-expanded',!p.hidden);ab.classList.toggle('open',!p.hidden)};
  const q=document.getElementById('mq'),mres=document.getElementById('mres');
  q.oninput=()=>{const s=q.value.trim();document.getElementById('mgrp').style.display=s?'none':'';app.querySelector('.ix-set').style.display=s?'none':'';if(!s){mres.innerHTML='';return}
    const row=(h,ic,t,k)=>`<a class="ix-r" href="${h}">${I(ic)}<b>${E(t)}</b><small>${k}</small></a>`;
    const mi=PIL.flatMap(p=>p.items).filter(x=>(x[0]+x[2]).includes(s)).map(x=>row(x[1],x[3],x[0],'메뉴'));
    const is=DD?DD.issues.filter(i=>i.title.includes(s)).slice(0,6).map(i=>row('issue/'+i.id,'flame',i.title,'이슈')):[];
    const en=DD?DD.entities.filter(e=>e.name.includes(s)).slice(0,6).map(e=>row(eh(e.name),'user',e.name,TYPE[e.type]||'')):[];
    const g=(t,a)=>a.length?`<div class="ix-rg"><h4>${t}</h4>${a.join('')}</div>`:'';
    mres.innerHTML=(g('메뉴',mi)+g('이슈',is)+g('인물·키워드',en))||`<p class="ix-empty">'${E(s)}'에 맞는 결과가 없어요. <a href="${kh(s)}">키워드로 찾아보기 ${I('arrow-right')}</a></p>`};
  q.onkeydown=e=>{if(e.key==='Enter'){const a=mres.querySelector('a');if(a){e.preventDefault();a.click()}}};
};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){const q=document.getElementById('mq');if(q){e.preventDefault();q.focus()}}});
})();
