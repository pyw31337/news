/* NewsBoard v2 시안 — 첫 화면은 data/today_v2.json(약 12KB) 하나만 받아서 그림.
   저장 형식(nb-settings·내 서재)은 v1과 같아 기록이 그대로 이어짐. 서비스 워커는 등록하지 않음(미리보기가 v1 캐시와 섞이지 않게).
   상세·배우기·마켓 등은 확정 전까지 v1 화면으로 연결 */
(function(){
const $=s=>document.querySelector(s),app=$('#app');
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATC={정치:'#2f6bff',경제:'#11a683',사회:'#ff4d2e',세계:'#7a4dff',IT:'#0aa5c8',과학:'#4868d8',건강:'#d64f73',환경:'#28a26e',문화:'#9c58cc',연예:'#e2448e',스포츠:'#f08a00'};
let S={};try{S=JSON.parse(localStorage.getItem('nb-settings')||'{}')}catch(e){}
if(S.fs)document.documentElement.style.fontSize=(16*S.fs/100)+'px';
const easy=S.read==='easy';
const sum=i=>(easy&&i.easy&&i.easy[0])||(i.summary||[])[0]||'';
const gl=(t,i)=>{let h=E(t);Object.entries(i.gloss||{}).forEach(([w,m])=>{h=h.replace(w,`<abbr title="${E(m)}">${E(w)}</abbr>`)});return h};
const cat=c=>`<span class="cat" style="--c:${CATC[c]||'#8189a3'}">${E(c||'')}</span>`;
const tag=i=>i.new?'<span class="new">새로 오름</span>':i.days>1?`<span class="cont">${i.days}일째</span>`:'';
const href=i=>`issue/${i.id}`;
const day=d=>{try{return new Date(d+'T00:00:00+09:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'})}catch(e){return d}};
const tm=t=>{try{return new Date(t).toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit'})}catch(e){return''}};
function draw(V){const I=V.issues||[],L=I[0];if(!L){app.innerHTML='<p class="ld">아직 오늘의 뉴스가 없어요.</p>';return}
  const nw=I.filter(i=>i.new),ct=I.filter(i=>!i.new&&i.days>1);
  const M=(V.market||[]).filter(m=>['KOSPI','KOSDAQ','S&P 500','미국 USD'].includes(m.name));
  app.innerHTML=`<div class="dt"><b>${E(day(V.date))}</b><small>${E(tm(V.updated))} 업데이트</small></div>
  <section class="brief"><h2>3분 브리핑<small>오늘 꼭 알아야 할 5가지</small></h2>
   <ol>${I.slice(0,5).map(i=>{const t=sum(i);return`<li><a href="${href(i)}">${t?`<b>${gl(t.length>90?t.slice(0,88)+'…':t,i)}</b><small>${E(i.cat||'')} · ${E(i.title)}</small>`:`<b>${E(i.title)}</b><small>${E(i.cat||'')}</small>`}</a></li>`}).join('')}</ol>
   ${M.length?`<div class="mk">${M.map(m=>{const u=m.dir==='RISING',d=m.dir==='FALLING';return`<span>${E(m.name)}<b>${E(m.price)}</b><em class="${u?'u':d?'d':''}">${u?'▲':d?'▼':''}${E(String(m.rate).replace(/^[-+]/,''))}%</em></span>`}).join('')}</div>`:''}</section>
  <h2>오늘의 이슈 TOP 10<small>많이 본·댓글·보도량 기준</small></h2>
  <a class="lead" href="${href(L)}" style="background-image:url('${E(L.img)}')"><div class="in"><div class="rk">01</div><div class="meta">${cat(L.cat)}${tag(L)}</div><h3>${E(L.title)}</h3><p>${gl(sum(L),L)}</p></div></a>
  <div class="list">${I.slice(1).map(i=>`<a class="row" href="${href(i)}"><span class="n">${i.rank}</span><div><div class="meta">${cat(i.cat)}${tag(i)}${i.comments?`<span>댓글 ${Number(i.comments).toLocaleString()}</span>`:''}</div><h4>${E(i.title)}</h4><p>${gl(sum(i),i)}</p></div><span class="th" style="background-image:url('${E(i.img)}')"></span></a>`).join('')}</div>
  <h2>오늘의 흐름<small>${V.yday?`어제(${E(V.yday.slice(5).replace('-','.'))}) 이후 달라진 것`:'어제와 비교'}</small></h2>
  <div class="flow"><div class="fb"><h3>새로 떠오른 이슈<small>${nw.length}개</small></h3>${nw.length?nw.map(i=>`<a href="${href(i)}"><b>${E(i.title)}</b><small>${E(i.cat||'')} · 언론사 ${i.presses||0}곳</small></a>`).join(''):'<small>어제와 같은 이슈들이 이어지고 있어요.</small>'}</div>
   <div class="fb"><h3>이어지는 이슈<small>${ct.length}개</small></h3>${ct.length?ct.map(i=>`<a href="${href(i)}"><b>${E(i.title)}</b><small><em>${i.days}일째</em>${i.today?` · 오늘: ${E(i.today)}`:''}</small></a>`).join(''):'<small>오늘은 이어지는 이슈가 없어요.</small>'}</div></div>
  ${(V.trends||[]).length?`<h2>지금 많이 찾는 말<small>구글 트렌드</small></h2><div class="tr">${V.trends.slice(0,8).map((t,k)=>`<a href="kw/${encodeURIComponent(t.k)}" title="${E(t.why||'')}"><i>${k+1}</i>${E(t.k)}</a>`).join('')}</div>`:''}
  <h2>더 보기<small>v1 화면으로 연결돼요</small></h2>
  <div class="more"><a href="learn">배우기<small>퀴즈·카드뉴스·만화</small></a><a href="games/">게임<small>배지·레벨</small></a><a href="market">마켓<small>증시·환율</small></a><a href="people">인물<small>화제의 인물</small></a><a href="timeline">타임라인<small>지난 흐름</small></a><a href="./" onclick="try{const s=JSON.parse(localStorage.getItem('nb-settings')||'{}');s.region='en';localStorage.setItem('nb-settings',JSON.stringify(s))}catch(e){}">해외<small>세계 뉴스·영어</small></a></div>
  <p class="foot">v2 시안 · 첫 화면 데이터 ${(window.__v2kb||0)}KB · 확정 전 미리보기</p>`}
const t0=performance.now();
fetch('data/today_v2.json',{cache:'no-cache'}).then(r=>{const n=+r.headers.get('content-length')||0;window.__v2kb=Math.round(n/1024);return r.json()})
 .then(V=>{draw(V);window.__v2ms=Math.round(performance.now()-t0)}).catch(()=>{app.innerHTML='<p class="ld">불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>'});
})();
