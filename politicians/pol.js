/* NewsBoard 정치인 DB — 목록(/politicians/)과 상세(/politicians/?id=코드) */
const $=s=>document.querySelector(s),app=$('#app'),DATA='data/pol/';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PC={'더불어민주당':'#1f5bd8','국민의힘':'#e5243b','조국혁신당':'#0a7cc1','개혁신당':'#ff7a00','진보당':'#d6001c','기본소득당':'#00b6b0','사회민주당':'#f2a900','무소속':'#8189a3'};
const pc=p=>PC[p]||(/민주/.test(p||'')?'#2b5fbf':/한나라|새누리|자유한국|미래통합|신한국|민자|민정/.test(p||'')?'#d63a4a':'#6b7390');
const fmt=n=>(n||0).toLocaleString();
const ph=(u,n,c)=>`<div class="pph" style="--pc:${c}">${u?`<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}<span>${esc((n||'?').slice(0,1))}</span></div>`;
let IDX=null,Q={q:'',f:'cur',party:'',sort:'name'};
async function j(u){const r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw new Error(r.status);return r.json()}
async function boot(){
  try{IDX=await j(DATA+'index.json')}catch(e){app.innerHTML='<div class="note">정치인 데이터가 아직 배포되지 않았어요. 첫 수집이 끝나면 여기에 보여요.</div>';return}
  $('#updated')&&($('#updated').textContent=`${IDX.updated} 기준 · ${fmt(IDX.count)}명`);
  const id=new URLSearchParams(location.search).get('id');id?detail(id):list();
}
window.addEventListener('popstate',boot);
document.addEventListener('click',e=>{const a=e.target.closest('a[data-pid]');if(!a||e.metaKey||e.ctrlKey)return;e.preventDefault();history.pushState(null,'',a.href);window.scrollTo(0,0);boot()});

/* ---------- 목록 ---------- */
function list(){
  document.title='정치인 DB · NewsBoard';
  const P=IDX.people,cur=P.filter(p=>p.current);
  const parties={};cur.forEach(p=>parties[p.party||'무소속']=(parties[p.party||'무소속']||0)+1);
  const pe=Object.entries(parties).sort((a,b)=>b[1]-a[1]);
  const bar=pe.map(([k,v])=>`<i style="flex:${v};background:${pc(k)}" title="${esc(k)} ${v}"></i>`).join('');
  const sw=P.filter(p=>p.switches>0).length,lead=cur.reduce((s,p)=>s+(p.lead||0),0);
  const hot=P.filter(p=>p.news).sort((a,b)=>b.news-a.news).slice(0,8);
  const ageDist={};P.forEach(p=>(p.ages||[]).forEach(a=>ageDist[a]=(ageDist[a]||0)+1));
  const amax=Math.max(1,...Object.values(ageDist));
  app.innerHTML=`
  <section class="phero card"><div><small>PUBLIC FIGURES DB</small><h1>정치인 데이터베이스</h1><p>역대 국회의원 전원의 당선·정당 이력과 의정 활동, 뉴스 타임라인을 출처와 함께 쌓아가요. 앞으로 생기는 기사도 자동으로 각 인물에 연결돼요.</p></div>
   <div class="kpis"><b>${fmt(IDX.count)}<em>역대 의원</em></b><b>${fmt(IDX.current)}<em>현역 22대</em></b><b>${IDX.bills?fmt(IDX.bills):'준비 중'}<em>법안(${(IDX.bill_ages||[]).join(',')||'-'}대)</em></b>${IDX.votes_rows?`<b>${fmt(IDX.votes_rows)}<em>표결 기록(${IDX.vote_ages.join(',')}대)</em></b>`:''}<b>${fmt(sw)}<em>당적 변경 경험</em></b></div></section>
  <div class="sec"><h2><small>22nd Assembly</small>현역 의석 분포</h2></div>
  <div class="card pad"><div class="seat">${bar}</div><div class="legend">${pe.map(([k,v])=>`<button data-party="${esc(k)}" class="${Q.party===k?'on':''}"><i style="background:${pc(k)}"></i>${esc(k)} <b>${v}</b></button>`).join('')}</div></div>
  ${hot.length?`<div class="sec"><h2><small>In the News</small>요즘 기사에 많이 나온 정치인</h2></div><div class="hotrow">${hot.map(p=>`<a class="hot card" data-pid href="politicians/?id=${p.id}">${ph(p.photo_local||p.photo,p.name,pc(p.party))}<b>${esc(p.name)}</b><span style="color:${pc(p.party)}">${esc(p.party||'')}</span><em>기사 ${fmt(p.news)}건${p.inc?` · 사건 키워드 ${p.inc}`:''}</em></a>`).join('')}</div>`:''}
  <div class="sec"><h2><small>By Term</small>대수별 의원 수</h2></div>
  <div class="card pad"><div class="agebar">${Object.entries(ageDist).sort((a,b)=>a[0]-b[0]).map(([a,v])=>`<div><i style="height:${Math.round(v/amax*100)}%"></i><span>${a}</span></div>`).join('')}</div></div>
  <div class="sec"><h2><small>Directory</small>의원 찾기</h2></div>
  <div class="filters"><input id="q" type="search" placeholder="이름·정당·지역구 검색" value="${esc(Q.q)}" aria-label="검색">
   <div class="seg">${[['cur','현역'],['all','역대 전체'],['sw','당적 변경']].map(([k,t])=>`<button data-f="${k}" class="${Q.f===k?'on':''}">${t}</button>`).join('')}</div>
   <select id="sort" aria-label="정렬"><option value="name">이름순</option><option value="news">기사 많은 순</option><option value="lead">대표발의 많은 순</option><option value="terms">선수 높은 순</option></select></div>
  <div id="plist" class="plist"></div><p class="fine">사진·이력: 대한민국 국회 열린국회정보 공개 데이터. 기사 연결과 사건 분류는 자동 처리라 틀릴 수 있어요.</p>`;
  $('#sort').value=Q.sort;
  const draw=()=>{let L=IDX.people;const q=Q.q.trim();
    if(Q.f==='cur')L=L.filter(p=>p.current);if(Q.f==='sw')L=L.filter(p=>p.switches>0);
    if(Q.party)L=L.filter(p=>(p.party||'무소속')===Q.party);
    if(q)L=L.filter(p=>[p.name,p.hanja,p.party,p.district].join(' ').includes(q));
    const k={news:p=>-(p.news||0),lead:p=>-(p.lead||0),terms:p=>-(p.ages||[]).length}[Q.sort];
    L=[...L].sort((a,b)=>k?k(a)-k(b)||a.name.localeCompare(b.name):a.name.localeCompare(b.name));
    $('#plist').innerHTML=(L.length?'':`<div class="note">찾는 의원이 없어요.</div>`)+L.slice(0,240).map(p=>`<a class="prow" data-pid href="politicians/?id=${p.id}">${ph(p.photo_local||p.photo,p.name,pc(p.party))}<div><b>${esc(p.name)}<small>${esc(p.hanja||'')}</small></b><span><i style="background:${pc(p.party)}"></i>${esc(p.party||'정당 정보 없음')} · ${esc(p.district||'')}</span><em>${(p.ages||[]).map(a=>a+'대').join(' ')}${p.switches?` · 당적 변경 ${p.switches}회`:''}${p.news?` · 기사 ${p.news}`:''}</em></div></a>`).join('')+(L.length>240?`<div class="note">${fmt(L.length)}명 중 240명만 보여요. 검색으로 좁혀 보세요.</div>`:'');
  };draw();
  $('#q').oninput=e=>{Q.q=e.target.value;draw()};$('#sort').onchange=e=>{Q.sort=e.target.value;draw()};
  app.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{Q.f=b.dataset.f;app.querySelectorAll('[data-f]').forEach(x=>x.classList.toggle('on',x===b));draw()});
  app.querySelectorAll('[data-party]').forEach(b=>b.onclick=()=>{Q.party=Q.party===b.dataset.party?'':b.dataset.party;Q.f='cur';list();$('#plist').scrollIntoView()});
}

/* ---------- 상세 ---------- */
const STG={'의혹':'s1','수사':'s2','기소·재판':'s3','판결':'s4'};
function bars(obj,color){const E=Object.entries(obj||{});if(!E.length)return'<p class="mute">데이터 없음</p>';const m=Math.max(...E.map(e=>e[1]));
  return`<div class="hbar">${E.map(([k,v])=>`<div><span>${esc(k)}</span><i style="width:${Math.max(4,v/m*100)}%;background:${color}"></i><b>${v}</b></div>`).join('')}</div>`}
function months(obj,color){const E=Object.entries(obj||{}).filter(e=>e[0]).slice(-24);if(!E.length)return'';const m=Math.max(...E.map(e=>e[1]));
  return`<div class="mbar">${E.map(([k,v])=>`<div title="${k} ${v}"><i style="height:${Math.max(3,v/m*100)}%;background:${color}"></i><span>${k.slice(2).replace('-','.')}</span></div>`).join('')}</div>`}
async function detail(id){
  let p;try{p=await j(DATA+'people/'+encodeURIComponent(id)+'.json')}catch(e){app.innerHTML='<div class="note">인물을 찾을 수 없어요. <a href="politicians/" data-pid>목록으로</a></div>';return}
  document.title=p.name+' — 정치인 DB · NewsBoard';const ie=IDX.people.find(x=>x.id===p.id);if(ie&&!p.photo_local)p.photo_local=ie.photo_local;const c=pc(p.party);
  const terms=p.terms||[],swA=p.party_switches||[],sw=swA.filter(s=>s.kind!=='rename'),bl=p.bills,inc=(p.incidents||{}).items||[],md=p.media,news=p.news||[];
  const tl=[...terms.map(t=>({d:'',k:'term',t})),...news.slice(0,80).map(n=>({d:n.date,k:'news',n}))];
  app.innerHTML=`
  <a class="back" href="politicians/" data-pid>← 정치인 목록</a>
  <section class="pdhero card" style="--pc:${c}">${ph(p.photo_local||p.photo,p.name,c)}<div class="pdt">
    <span class="pbadge">${p.current?'현역 22대 국회의원':'전직 국회의원'}</span>
    <h1>${esc(p.name)} <small>${esc(p.hanja||'')} ${esc(p.en||'')}</small></h1>
    <p class="pty"><i></i>${esc(p.party||'')}${p.district?' · '+esc(p.district):''}</p>
    <div class="facts"><span><em>선수</em>${esc(p.reelect||'-')}</span><span><em>당선</em>${(p.ages||[]).map(a=>a+'대').join(', ')||'-'}</span><span><em>출생</em>${esc(p.birth||'-')}</span>${p.committees?`<span class="w"><em>위원회</em>${esc(p.committees)}</span>`:''}</div>
    <div class="acts">${p.homepage?`<a href="${esc(p.homepage)}" target="_blank" rel="noopener">홈페이지</a>`:''}<button type="button" id="shr">공유</button></div></div></section>
  <div class="kgrid">
   <div class="card k"><em>대표발의</em><b>${bl?fmt(bl.lead_count):'—'}</b><span>${bl?`가결·반영 ${fmt(bl.passed)}`:'법안 API 키 연결 후 표시'}</span></div>
   <div class="card k"><em>공동발의</em><b>${bl?fmt(bl.co_count):'—'}</b><span>${bl?(bl.ages||[]).join(',')+'대 기준':''}</span></div>
   <div class="card k"><em>당적 변경</em><b>${sw.length}</b><span>대수 사이 기준</span></div>
   <div class="card k"><em>연결된 기사</em><b>${fmt(news.length)}</b><span>${inc.length?`사건 키워드 ${inc.length}건`:'자동 연결'}</span></div></div>

  <div class="sec"><h2><small>Party & Election</small>당선·정당 이력</h2></div>
  <div class="card pad"><ol class="terms">${terms.map((t,i)=>`<li style="--pc:${pc(t.party)}"><b>제${t.age}대</b><span class="tp">${esc(t.party||'')}</span><span class="td">${esc(t.district||'')} ${t.kind&&t.kind!==t.district?`<small>${esc(t.kind)}</small>`:''}</span>${(x=>x?`<em class="swb ${x.kind==='rename'?'rn':''}">${x.kind==='rename'?'당명 변경·계승':'당적 변경'} ${esc(x.from)} → ${esc(t.party)}</em>`:'')(swA.find(s=>s.between[1]===t.age))}</li>`).join('')}</ol>
   <p class="fine">대수별 소속은 당선(재임) 당시 기준이에요. 임기 중 탈당·합당 등 세부 이동은 공식 데이터에 없어서 기사 타임라인으로 확인해 주세요.</p></div>

  ${bl?`<div class="sec"><h2><small>Legislation</small>입법 활동</h2></div>
  <div class="g2"><div class="card pad"><h3>대표발의 처리 결과</h3>${bars(bl.by_result,c)}</div><div class="card pad"><h3>월별 대표발의</h3>${months(bl.by_month,c)}</div></div>
  <div class="card pad"><h3>최근 대표발의 법안</h3><ul class="blist">${(bl.recent||[]).slice(0,12).map(b=>`<li><a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.name)}</a><span>${esc(b.date||'')} · <b class="${/가결|반영/.test(b.result)?'ok':''}">${esc(b.result)}</b></span></li>`).join('')}</ul><p class="fine">출처: <a href="${esc(bl.source.url)}" target="_blank" rel="noopener">${esc(bl.source.name)}</a> · ${esc(bl.source.fetched)} 수집</p></div>`:''}

  ${p.votes?(()=>{const V=p.votes,S={};Object.values(V.summary).forEach(o=>Object.entries(o).forEach(([k,n])=>S[k]=(S[k]||0)+n));const T=Object.values(S).reduce((a,b)=>a+b,0)||1;const C={'찬성':'#11a683','반대':'#e5243b','기권':'#ffb020','불참':'#c3c8dc'};
  return`<div class="sec"><h2><small>Votes</small>본회의 표결</h2><span class="more">${(V.ages||[]).join(',')}대 · ${fmt(V.count)}건</span></div>
  <div class="card pad"><div class="seat">${Object.entries(S).map(([k,n])=>`<i style="flex:${n};background:${C[k]||'#8189a3'}"></i>`).join('')}</div>
  <div class="legend">${Object.entries(S).map(([k,n])=>`<span class="vk"><i style="background:${C[k]||'#8189a3'}"></i>${esc(k)} <b>${fmt(n)}</b> <small>${Math.round(n/T*100)}%</small></span>`).join('')}</div>
  ${V.dissent.length?`<h3 style="margin-top:14px">반대·기권한 안건</h3><ul class="blist">${V.dissent.slice(0,10).map(x=>`<li><a href="https://likms.assembly.go.kr/bill/billDetail.do?billId=${esc(x.id)}" target="_blank" rel="noopener">${esc(x.name)}</a><span>${esc(x.date||'')} · <b style="color:${C[x.vote]}">${esc(x.vote)}</b></span></li>`).join('')}</ul>`:''}
  <p class="fine">출처: ${esc(V.source.name)} · ${esc(V.source.fetched)} 수집</p></div>`})():''}
  ${p.assets&&p.assets.records.length?(()=>{const R=p.assets.records,last=R[R.length-1],won=v=>{if(v==null)return'-';const e=v/100000;return Math.abs(e)>=1?(Math.round(e*10)/10).toLocaleString()+'억':Math.round(v/10).toLocaleString()+'만'};const reg=R.filter(r=>r.kind!=='재산등록사항'||R.length===1);const m=Math.max(...R.map(r=>r.total||0),1);
  const K=[['토지','land','#7b61ff'],['건물','building','#2f6bff'],['예금·현금','deposits','#11a683'],['증권','securities','#ffb020'],['채무','debt','#e5243b']];const km=Math.max(...K.map(k=>last[k[1]]||0),1);
  return`<div class="sec"><h2><small>Assets</small>재산 신고</h2><span class="more">${esc(last.date.slice(0,4))}년 공개 · ${R.length}회 기록</span></div>
  <div class="g2"><div class="card pad"><h3>연도별 신고 총액</h3><div class="mbar">${R.map(r=>`<div title="${esc(r.date)} ${won(r.total)}원"><i style="height:${Math.max(3,(r.total||0)/m*100)}%;background:${c}"></i><span>${esc(r.date.slice(2,4))}${r.kind!=='정기재산변동신고'?'*':''}</span></div>`).join('')}</div>
   <p class="fine">최근 총액 <b>${won(last.total)}원</b>${last.change!=null?` · 전년 대비 <b class="${last.change>=0?'ok':''}">${last.change>=0?'+':''}${won(last.change)}원</b>`:''}${R.some(r=>r.kind!=='정기재산변동신고')?' · * 신규 등록·퇴직 등 수시 공개':''}</p></div>
  <div class="card pad"><h3>항목별 (${esc(last.date.slice(0,4))}년 공개)</h3><div class="hbar">${K.map(([n,k,col])=>`<div><span>${n}</span><i style="width:${Math.max(2,(last[k]||0)/km*100)}%;background:${col}"></i><b>${won(last[k]||0)}</b></div>`).join('')}</div>
   <p class="fine">부동산 ${won((last.land||0)+(last.building||0))}원 · 증권 ${won(last.securities||0)}원</p></div></div>
  <div class="card pad"><p class="fine">본인·배우자·직계존비속 합산 신고액(고지거부분 제외)이며, 부동산은 공시가격 등 신고가액이라 시세와 다를 수 있어요. 공보 PDF를 자동으로 읽은 값이라 원문 확인을 권해요.<br>출처: ${R.map(r=>`<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.issue)}</a>`).join(', ')} (국회공직자윤리위원회 공고) · ${esc(p.assets.source.fetched)} 수집</p></div>`})():''}
  <div class="sec"><h2><small>Incidents</small>사건·사고 관련 보도</h2></div>
  <div class="card pad inc"><p class="warn">기사 제목의 단어로 <b>자동 분류</b>한 목록이에요. ‘의혹·수사·기소’ 단계는 확정된 사실이 아니며 유무죄와 관계없어요. 반드시 원문을 확인해 주세요.</p>
   <div class="stg">${Object.keys(STG).map(s=>`<span class="${STG[s]}">${s} <b>${inc.filter(x=>x.stage===s).length}</b></span>`).join('')}</div>
   ${inc.length?`<ul class="ilist">${inc.slice(0,30).map(x=>`<li><em class="${STG[x.stage]}">${x.stage}</em><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a><span>${esc(x.date)} · ${esc(x.press||'')}</span></li>`).join('')}</ul>`:'<p class="mute">아직 연결된 사건 관련 보도가 없어요.</p>'}</div>

  ${md&&(md.top_words||[]).length?`<div class="sec"><h2><small>Media</small>미디어 노출 경향</h2></div>
  <div class="g2"><div class="card pad"><h3>헤드라인에 함께 나온 단어</h3><div class="cloud">${md.top_words.slice(0,24).map(([w,n],i)=>`<span style="font-size:${(.8+Math.min(1,n/md.top_words[0][1])*.9).toFixed(2)}rem;opacity:${(1-i/40).toFixed(2)}">${esc(w)}</span>`).join('')}</div><p class="fine">${esc(md.method)}</p></div>
   ${(md.quotes||[]).length?`<div class="card pad"><h3>헤드라인에 실린 발언</h3><ul class="qlist">${md.quotes.slice(0,10).map(q=>`<li><a href="${esc(q.url)}" target="_blank" rel="noopener">“${esc(q.quote)}”</a><span>${esc(q.date)} · ${esc(q.press||'')}</span></li>`).join('')}</ul></div>`:''}<div class="card pad"><h3>월별 보도량</h3>${months(md.by_month,'#ff4d2e')}<h3 style="margin-top:14px">많이 다룬 언론사</h3><p class="mute">${md.presses.filter(x=>x[0]).map(x=>esc(x[0])+' '+x[1]).join(' · ')}</p></div></div>`:''}

  <div class="sec"><h2><small>Timeline</small>뉴스 타임라인</h2><span class="more">${fmt(news.length)}건</span></div>
  ${news.length?`<ol class="ntl">${news.slice(0,60).map(n=>`<li><time>${esc(n.date)}</time><a href="${esc(n.url)}" target="_blank" rel="noopener" class="card">${n.img?`<img src="${esc(n.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}<div><b>${esc(n.title)}</b><span>${esc(n.press||'')} · ${esc(n.via||'')}</span></div></a></li>`).join('')}</ol>`:'<div class="note">아직 연결된 기사가 없어요. 매일 자동으로 채워져요.</div>'}

  ${(p.history||[]).length?`<div class="sec"><h2><small>Career</small>주요 경력</h2></div><div class="card pad"><ul class="hist">${p.history.map(h=>`<li>${esc(h)}</li>`).join('')}</ul></div>`:''}
  <div class="card pad src"><h3>출처</h3><ul>${(p.sources||[]).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a> · ${esc(s.fetched)} 수집</li>`).join('')}</ul><p class="fine">사진: ${esc(p.photo_credit||'')}</p></div>`;
  $('#shr').onclick=async()=>{const u=location.href;if(navigator.share){try{await navigator.share({title:document.title,url:u})}catch(e){}}else{try{await navigator.clipboard.writeText(u);alert('링크를 복사했어요')}catch(e){prompt('링크',u)}}};
}
boot();
