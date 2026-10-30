/* 뉴스 게임 페이지 v3: 게임 고르기 · 이슈 2048(g2048.js) · 뉴스 머지(merge.js) · 팩트 새총(sling.js) · 배지 우표첩 · 순위(board.js) · 커리어
   주소: #play #2048-time #merge-space #sling #sling-3 #badges #rank-2048-time #career */
(function(){
const $=s=>document.querySelector(s),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const G=window.NBGame,D=window.NBG_DATA,GI_=n=>window.GI?GI(n):'';
function hero(){$('#gxlv').innerHTML=`<small class="gx-eyebrow">PLAY THE NEWS</small><h1>뉴스로 놀고, <span class="ds-key">배지를 모으세요</span></h1>${G.lvCard()}`}
const A='games/assets/';
const PICK=[['2048-time','이슈 2048','초에서 천 년까지, 포함 관계로 커지는 사다리 4종',A+'2048/time-8.webp','#ff4d2e'],['merge-space','뉴스 머지','같은 것끼리 합치면 한 단계 큰 것으로. 태양계·공·과일',A+'merge/space-11.webp','#7a4dff'],['sling','팩트 새총','가짜뉴스 고블린의 성을 무너뜨리는 12단계',A+'sling/bird_red.webp','#11a683']];
function picker(v){v.innerHTML=`<div class="gx-pick3">${PICK.map(p=>`<a class="gx-pc" href="games/#${p[0]}" style="--c:${p[4]}"><span class="gx-pci"><img src="${p[3]}" alt="" width="84" height="84"></span><b>${p[1]}</b><small>${p[2]}</small><em>최고 ${bestOf(p[0]).toLocaleString()}</em></a>`).join('')}</div>
  <div class="gx-bh"><h2>오늘의 목표</h2></div><div class="gx-goal">${G.goals()}</div>`}
const bestOf=k=>k.startsWith('2048')?Math.max(...D.L2048.map(l=>NBBoard.best('2048-'+l.id))):k.startsWith('merge')?Math.max(...D.MERGE.map(m=>NBBoard.best('merge-'+m.id))):NBBoard.best('sling');
/* ================= 배지 우표첩(분류별) ================= */
const tI=(b,k)=>b[7]!=null?b[7]:Math.min(k,G.TIERS.length-1);
function badges(v){const T=window.NBTaste;const L=G.B.map(b=>({b,r:T.req(b)}));const got=L.filter(x=>x.r.t>=0).length,tiers=L.reduce((a,x)=>a+x.r.t+1,0),allT=L.reduce((a,x)=>a+x.b[6].length,0);
  let seen={};try{seen=JSON.parse(localStorage.getItem('nb-stamp')||'{}')}catch(e){}
  const card=({b,r})=>{const on=r.t>=0,fresh=on&&(seen[b[0]]==null||seen[b[0]]<r.t),C=on?G.TIERS[tI(b,r.t)]:null;
    return`<button type="button" class="sb-st ${on?'got':''} ${fresh?'fresh':''}" data-b="${b[0]}" aria-label="${E(b[1])} 배지 자세히">${on?`<span class="sb-tier" style="--c:${C[1]}">${b[7]!=null?'스페셜':C[0]}</span>`:''}
      <span class="sb-slot">${G.slot(b,r.t,112)}</span><h3>${E(b[1])}</h3><span class="sb-req">${r.done?'모든 등급을 모았어요':E(r.label)}${r.done||!G.eta?'':`<em class="sb-eta" title="꾸준히 할 때 걸리는 예상 기간">${G.eta(b,r.t+1)}</em>`}</span>
      <span class="sb-pb" role="progressbar" aria-valuenow="${r.pct}" aria-valuemin="0" aria-valuemax="100"><i style="--p:${r.pct}%"></i></span><span class="sb-num"><b>${r.v.toLocaleString()}</b> / ${r.goal.toLocaleString()}${r.done?'':` · ${r.left.toLocaleString()}${r.unit} 남음`}</span>
      <span class="sb-dots">${b[6].map((_,k)=>`<i class="${k<=r.t?'on':''}" style="--c:${G.TIERS[tI(b,k)][1]}"></i>`).join('')}</span></button>`};
  v.innerHTML=`<div class="gx-bh"><h2>배지 우표첩 <b>${got}</b><span>/ ${L.length}종 · 등급 ${tiers}/${allT}</span></h2><p>등급은 브론즈부터 <b>이터널</b>까지 10단계예요. 처음 두 개는 바로 받을 수 있고, 나머지는 며칠·몇 주·몇 달, 높은 등급은 1년 넘게 꾸준히 해야 받아요(배지마다 예상 기간 표시). 새 등급을 받을 때마다 보너스 XP를 드려요.</p>
    <div class="sb-tiers">${G.TIERS.map((t,k)=>`<span style="--c:${t[1]}"><i></i>${t[0]}<small>+${G.TIER_XP[k]}</small></span>`).join('')}</div></div>
   ${G.GROUPS.map(([g,name])=>{const S=L.filter(x=>(x.b[8]||'start')===g).sort((x,y)=>(y.r.t>=0)-(x.r.t>=0)||y.r.pct-x.r.pct);if(!S.length)return'';
     return`<section class="sb-group"><h3 class="sb-gh">${E(name)}<small>${S.filter(x=>x.r.t>=0).length}/${S.length}</small></h3><div class="sb-page"><div class="sb-grid">${S.map(card).join('')}</div></div></section>`}).join('')}`;
  L.forEach(({b,r})=>{if(r.t>=0)seen[b[0]]=r.t});setTimeout(()=>localStorage.setItem('nb-stamp',JSON.stringify(seen)),1500);
  v.onclick=e=>{const x=e.target.closest('[data-b]');if(x)sheet(G.B.find(b=>b[0]===x.dataset.b))}}
function sheet(b){const T=window.NBTaste,r=T.req(b);const w=document.createElement('div');w.className='sb-sheet';
  w.innerHTML=`<div class="sb-sh" role="dialog" aria-label="${E(b[1])}"><div class="sb-top">${G.medal(b,r.t,84)}<div><h2>${E(b[1])}</h2><p>${E(b[2])}</p></div><button type="button" class="sb-x" aria-label="닫기">${GI('x')}</button></div>
   <div class="sb-goal"><h4>${r.done?'모든 등급 달성':'다음 목표 · '+E(r.label)}</h4><span class="sb-stat">${GI('chart-bar')}필요한 기록: ${E(r.stat)}</span>
    <div class="sb-big"><b>${r.v.toLocaleString()}</b><span>/ ${r.goal.toLocaleString()}${r.unit}</span><em>${r.done?'완료':r.left.toLocaleString()+r.unit+' 남음'}</em></div><span class="sb-pb"><i style="--p:${r.pct}%"></i></span>
    <ul class="sb-lad">${b[6].map((x,k)=>{const C=G.TIERS[tI(b,k)];return`<li class="${k<=r.t?'on':''}" style="--c:${C[1]}"><i></i>${b[7]!=null?'스페셜':C[0]} · ${E((T.REQ[b[5]]||['','{n}'])[1].replace('{n}',x.toLocaleString()))}${G.eta?`<small class="sb-et">${G.eta(b,k)}</small>`:''}<em>+${G.TIER_XP[tI(b,k)]} XP</em>${k<=r.t?GI('check'):''}</li>`}).join('')}</ul></div>
   ${r.src?`<div class="sb-an"><h4>${GI('chart-donut')}${r.src==='save'?'내가 모은 기사 분석':'지금까지 읽은 기사 분석'}</h4>${T.html(r.src,{hours:['night','morning','lunch','commute','read'].includes(b[5])})}</div>`:''}</div>`;
  document.body.appendChild(w);r.src&&T.seen();const close=()=>w.remove();w.onclick=e=>{if(e.target===w||e.target.closest('.sb-x'))close()};addEventListener('keydown',function k(e){if(e.key==='Escape'){close();removeEventListener('keydown',k)}})}
function careerV(v){const n=G.level(G.totalXP());v.innerHTML=`<div class="gx-bh"><h2>나의 커리어</h2><p>XP가 쌓이면 레벨이 오르고, 신문사 직함이 바뀌어요. Lv.100 ‘뉴스의 전설’까지.</p></div>
  <ol class="gx-cr">${G.CAREER.map((c,k)=>{const nx=G.CAREER[k+1],on=n>=c[0]&&(!nx||n<nx[0]),past=nx&&n>=nx[0];return`<li class="${on?'on':past?'past':''}"><span class="lv">Lv.${c[0]}</span><b>${E(c[1])}</b><small>${E(c[2])}</small>${on?'<em>지금 여기</em>':''}</li>`}).join('')}</ol>
  <div class="gx-bh"><h2>XP 얻는 방법</h2></div><div class="gx-xp"><div><b>+5</b><span>이슈 읽기</span></div><div><b>+10</b><span>OX·단어 퀴즈 정답</span></div><div><b>+5~60</b><span>뉴스 게임 한 판</span></div><div><b>+10~800</b><span>배지 새 등급(브론즈~이터널)</span></div><div><b>+5</b><span>기사 공유</span></div><div><b>+20</b><span>카드 10장 완주</span></div></div><p class="gx-fine">게임·활동 XP는 하루 400까지 쌓여요. 배지 보너스와 퀴즈 XP는 따로예요.</p>`}
/* ================= 순위 ================= */
const BOARDS=[...D.L2048.map(l=>['2048-'+l.id,'2048 · '+l.name]),...D.MERGE.map(m=>['merge-'+m.id,'머지 · '+m.name]),['sling','팩트 새총 총점']];
/* ================= 화면 전환 ================= */
let curGame='';
function route(){const h=decodeURIComponent(location.hash.slice(1)||'play'),v=$('#gxv');const top=h.split('-')[0];
  const t=['2048','merge','sling'].includes(top)?'play':top==='rank'?'rank':h;document.querySelectorAll('#gxt a').forEach(a=>a.classList.toggle('on',a.dataset.t===t));hero();
  if(t!=='play'&&curGame){NBSound.bgm('');curGame=''}
  if(['2048','merge','sling'].includes(top)){const arg=h.slice(top.length+1);curGame=h;
    v.innerHTML=`<div class="gx-pick">${PICK.map(p=>`<a class="gx-pt ${p[0].split('-')[0]===top?'on':''}" href="games/#${p[0]}" style="--c:${p[4]}"><img src="${p[3]}" alt="" width="34" height="34"><b>${p[1]}</b></a>`).join('')}</div><div class="gx-game"></div>`;
    const g=v.querySelector('.gx-game');
    if(top==='2048')NBG2048(g,arg||'time');else if(top==='merge')NBMerge(g,arg||'space');else if(arg)NBSling.play(g,+arg);else NBSling.select(g);
    setTimeout(()=>g.scrollIntoView({behavior:'smooth',block:'start'}),60);return}
  if(t==='badges')return badges(v);if(t==='career')return careerV(v);
  if(t==='rank'){v.innerHTML='<div class="gx-bh"><h2>순위</h2><p>게임·사다리별 전체 순위와 내 기록이에요. 로그인하면 최고 기록이 자동으로 전체 순위에 올라가요.</p></div><div class="lb"></div>';NBBoard.view(v.querySelector('.lb'),BOARDS,h.slice(5)||BOARDS[0][0]);return}
  NBSound.bgm('');picker(v)}
addEventListener('hashchange',route);route();
})();
