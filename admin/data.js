/* 관리자 '데이터 수집 현황판' — data/stats.json(scripts/stats.py)을 그림
   문제 목록 → 핵심 숫자 → 일자별 추이(7일·30일) → 수집처별 추이 → 분류별 추이 → AI 분석 → 수집처별 표 → 품질 → 분포
   막대: 빨간색 = 평소(그 전 7일 중앙값)의 절반 아래로 떨어진 날, 연한 색 = 아직 진행 중인 오늘, 점선 = 기간 평균 */
(function(){
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=n=>n==null?'—':Number(n).toLocaleString('ko-KR');
const K=n=>n==null?'—':n>=1e4?(n/1e4).toFixed(n>=1e5?0:1).replace(/\.0$/,'')+'만':N(Math.round(n));
const AGO=h=>h==null?'—':h<1?Math.round(h*60)+'분 전':h<48?h.toFixed(1)+'시간 전':Math.round(h/24)+'일 전';
const LV={ok:['ok','정상'],warn:['warn','주의'],bad:['bad','문제']};
const CC={정치:'#2f6bff',경제:'#11a683',사회:'#ff4d2e',세계:'#7a4dff',IT:'#0aa5c8','IT·과학':'#0aa5c8',과학:'#4868d8',건강:'#d64f73',환경:'#28a26e',문화:'#9c58cc',연예:'#e2448e',스포츠:'#f08a00',주요:'#0f1630',기타:'#b4bacb',naver:'#03c75a',google:'#4285f4',global:'#7a4dff'};
const PAL=['#2f6bff','#11a683','#ff4d2e','#7a4dff','#0aa5c8','#f08a00','#e2448e','#28a26e','#9c58cc','#4868d8','#d64f73','#8189a3'];
const col=(k,i)=>CC[k]||PAL[i%PAL.length];
const AIK={issue:'이슈 요약',  'a-deep':'깊게 보기','a-op':'댓글 여론','a-flow':'사건 흐름',cat:'분류 판정',trend:'검색어 해설',words:'오늘의 단어',opinion:'민심 분석',quiz:'퀴즈',toon:'만평',card:'카드뉴스'};
const aik=k=>{const [t,x]=String(k).split(':');return AIK[x??t]||x||t};
const SRCN={naver:'네이버',google:'구글뉴스',global:'해외'};
let RANGE=30;try{RANGE=+localStorage.getItem('nb-dash-range')||30}catch(e){}
const med=a=>{a=a.filter(v=>v!=null).sort((x,y)=>x-y);return a.length?a[a.length>>1]:null};
const avg=a=>{a=a.filter(v=>v!=null);return a.length?a.reduce((s,v)=>s+v,0)/a.length:null};
const md=d=>{const [,m,dd]=String(d).split('-');return `${+m}/${+dd}`};
// 이상일 판정: 그날 값이 그 전 7일 중앙값의 절반 아래(0 포함). 오늘(진행 중)은 판정하지 않음
function flags(vals,today){return vals.map((v,i)=>{if(v==null||i===vals.length-1&&today)return false;const m=med(vals.slice(Math.max(0,i-7),i));return m!=null&&m>=3&&v<m*.5})}
// 막대 차트(HTML) — o:{h,today,unit,avg,col,fmt}
function bars(series,o={}){
  const S=(series||[]).slice(-RANGE);if(!S.length)return'<p class="mute">기록 없음</p>';
  const vals=S.map(x=>x[1]==null?null:+x[1]),mx=Math.max(1,...vals.filter(v=>v!=null)),fl=flags(vals,o.today!==false);
  // 첫 기록 전 날짜는 '수집 시작 전'으로 비워 두고 평균·이상일 판정에서도 뺌
  let st=vals.findIndex(v=>v!=null&&v>0);if(st<0)st=vals.length-1;
  const av=o.avg===false?null:avg(vals.slice(st,o.today!==false?-1:undefined));const h=o.h||70,u=o.unit||'';
  const xs=[0,Math.floor((S.length-1)/2),S.length-1],L=o.lab||md;
  return`<div class="ch" style="--h:${h}px"><div class="ch-y"><span>${K(mx)}</span><span>0</span></div><div class="ch-p">
   ${av?`<div class="ch-avg" style="bottom:${av/mx*100}%"><em>평균 ${K(av)}</em></div>`:''}
   <div class="ch-b">${S.map(([d],i)=>{const v=vals[i],last=i===S.length-1&&o.today!==false;
     if(i<st)return`<i class="pre" data-t="${E(L(d))} · 기록 시작 전"></i>`;
     return`<i class="${v==null?'na':''}${fl[i]?' fl':''}${last?' td':''}" style="height:${v==null?100:Math.max(v?2:0,v/mx*100)}%;${o.col&&!fl[i]?`background:${o.col}`:''}" data-t="${E(L(d))}${last?'(오늘, 진행 중)':''} · ${v==null?'기록 없음':N(v)+u}${fl[i]?' · 평소의 절반 아래':''}"></i>`}).join('')}</div></div>
   <div class="ch-x">${xs.map(i=>`<span>${E(L(S[i][0]))}</span>`).join('')}</div></div>`}
// 누적 막대(날짜별 분류) — daily:[[d,{k:n}]]
function stackBars(daily,o={}){
  const S=(daily||[]).slice(-RANGE);if(!S.length)return'<p class="mute">기록 없음</p>';
  const tot={};S.forEach(([,m])=>Object.entries(m||{}).forEach(([k,v])=>{if(k&&k!=='null')tot[k]=(tot[k]||0)+v}));
  const keys=Object.keys(tot).sort((a,b)=>tot[b]-tot[a]),mx=Math.max(1,...S.map(([,m])=>keys.reduce((s,k)=>s+((m||{})[k]||0),0))),h=o.h||110;
  const xs=[0,Math.floor((S.length-1)/2),S.length-1],nm=o.name||(k=>k);
  return`<div class="ch" style="--h:${h}px"><div class="ch-y"><span>${K(mx)}</span><span>0</span></div><div class="ch-p"><div class="ch-b st">${S.map(([d,m])=>{const t=keys.reduce((s,k)=>s+((m||{})[k]||0),0);
     return`<i style="height:${t/mx*100}%" data-t="${E(md(d))} · 합계 ${N(t)}${keys.filter(k=>(m||{})[k]).slice(0,6).map(k=>` · ${E(nm(k))} ${N(m[k])}`).join('')}">${keys.map((k,j)=>(m||{})[k]?`<b style="flex:${m[k]};background:${col(k,j)}"></b>`:'').join('')}</i>`}).join('')}</div></div>
   <div class="ch-x">${xs.map(i=>`<span>${E(md(S[i][0]))}</span>`).join('')}</div></div>
   <div class="lg">${keys.map((k,j)=>`<span><i style="background:${col(k,j)}"></i>${E(nm(k))} <b>${N(tot[k])}</b></span>`).join('')}</div>`}
// 평소 대비: 끝난 날 중 최근 7일 평균 vs 그 전 7일 평균
function trend(series){const v=(series||[]).map(x=>x[1]).slice(0,-1),a=avg(v.slice(-7)),b=avg(v.slice(-14,-7));
  if(a==null||!b)return'';const p=(a/b-1)*100;return`<em class="dl ${p>=5?'up':p<=-5?'dn':''}" title="최근 7일 평균 ${N(Math.round(a))} · 그 전 7일 ${N(Math.round(b))}">${p>=0?'▲':'▼'} ${Math.abs(p).toFixed(0)}%</em>`}
// 분류별 작은 차트 묶음
function multiples(daily,o={}){const S=(daily||[]);const tot={};S.slice(-RANGE).forEach(([,m])=>Object.entries(m||{}).forEach(([k,v])=>{if(k&&k!=='null')tot[k]=(tot[k]||0)+v}));
  const nm=o.name||(k=>k);
  return`<div class="mul">${Object.keys(tot).sort((a,b)=>tot[b]-tot[a]).map((k,j)=>{const ser=S.map(([d,m])=>[d,(m||{})[k]||0]);
    return`<div class="mc"><div class="mh"><b><i style="background:${col(k,j)}"></i>${E(nm(k))}</b><span>${N(tot[k])}${trend(ser)}</span></div>${bars(ser,{h:44,col:col(k,j),avg:false})}</div>`}).join('')}</div>`}
const stack=(o,h=18)=>{const e=Object.entries(o||{}).filter(([k])=>k&&k!=='null').sort((a,b)=>b[1]-a[1]),t=e.reduce((s,x)=>s+x[1],0)||1;
  return`<div class="stk" style="height:${h}px">${e.map(([k,v],j)=>`<i style="flex:${v};background:${col(k,j)}" data-t="${E(k)} ${N(v)} (${(v/t*100).toFixed(0)}%)"></i>`).join('')}</div><div class="lg">${e.map(([k,v],j)=>`<span><i style="background:${col(k,j)}"></i>${E(k)} <b>${N(v)}</b></span>`).join('')}</div>`};
const prog=(v,t)=>{if(v==null||!t)return'';const p=Math.min(100,v/t*100);return`<div class="pg"><i style="width:${p.toFixed(1)}%" class="${p>=100?'ok':p>=70?'mid':'low'}"></i></div><small>${p.toFixed(0)}%</small>`};
const spark=(d,h=30)=>{d=(d||[]).slice(-RANGE);if(!d.length||d.every(x=>x[1]==null))return'<span class="mute">—</span>';const mx=Math.max(1,...d.map(x=>x[1]||0));return`<div class="sp" style="height:${h}px">${d.map(([k,v])=>`<i style="height:${v==null?0:Math.max(v?4:1,v/mx*100)}%" data-t="${E(md(k))} ${N(v)}"></i>`).join('')}</div>`};
// 막대 위 손가락·마우스 → 말풍선
function tipper(el){let t=el.querySelector('.dtip');if(!t){t=document.createElement('div');t.className='dtip';t.hidden=true;el.appendChild(t)}
  const show=e=>{const x=e.target.closest('[data-t]');if(!x||!el.contains(x)){t.hidden=true;return}t.textContent=x.dataset.t;t.hidden=false;
    const r=el.getBoundingClientRect(),b=x.getBoundingClientRect();t.style.left=Math.min(r.width-t.offsetWidth-4,Math.max(4,b.left-r.left+b.width/2-t.offsetWidth/2))+'px';t.style.top=(b.top-r.top-t.offsetHeight-6)+'px'};
  el.onpointerover=show;el.onclick=show;el.onpointerleave=()=>t.hidden=true}
// 다른 메뉴(admin/tabs.js)에서 같은 그래프 부품을 씀
window.NBD={E,N,K,AGO,LV,bars,stackBars,multiples,stack,prog,spark,trend,tipper,col,md,aik,flags,
  get range(){return RANGE},setRange(n){RANGE=n;try{localStorage.setItem('nb-dash-range',n)}catch(e){}},
  tog:()=>`<span class="rg">${[7,30].map(n=>`<button type="button" data-range="${n}" class="${RANGE===n?'on':''}">${n}일</button>`).join('')}</span>`};
let S0=null;
window.renderDash=async function(el){if(!el)return;
  if(!S0){el.innerHTML='<p class="mute">수집 현황을 불러오는 중…</p>';
    try{S0=await (await fetch('../data/stats.json',{cache:'no-store'})).json()}catch(e){el.innerHTML='<p class="err">수집 현황 파일이 아직 없어요. 다음 수집(30분 안) 뒤에 채워져요.</p>';return}}
  const S=S0,src=S.sources||[],T=S.totals||{},sp=S.speed||{},P=S.problems||[],A=S.ai||{},C=S.categories||{};
  const groups=[...new Set(src.map(s=>s.group))];
  const bad=P.filter(p=>p.level==='bad').length,warn=P.filter(p=>p.level==='warn').length;
  const sk=k=>src.find(s=>s.key===k)||{};
  const tog=`<span class="rg">${[7,30].map(n=>`<button type="button" data-range="${n}" class="${RANGE===n?'on':''}">${n}일</button>`).join('')}</span>`;
  el.innerHTML=`<h2>데이터 수집 현황판 <small>${E(String(S.updated||'').replace('T',' '))} 기준 · 30분마다 갱신</small></h2>
  <section class="card dprob"><h3><span class="dot ${bad?'bad':warn?'warn':'ok'}"></span>${bad||warn?`확인이 필요한 곳 ${bad+warn}건 <small>문제 ${bad} · 주의 ${warn}</small>`:'모든 수집처 정상'}</h3>
   ${P.length?`<ul>${P.map(p=>`<li class="${p.level}"><b>${E(p.what)}</b><span>${E(p.why)}</span></li>`).join('')}</ul>`:''}</section>
  <div class="kpis">
   <div class="card kpi"><span class="l">국내 기사 누적</span><b>${N(T.articles_kr)}</b><small>오늘 ${N(sk('news_kr').today)} · 7일 평균 ${N(sp.avg_daily_7)}/일</small></div>
   <div class="card kpi"><span class="l">해외 기사 누적</span><b>${N(T.articles_global)}</b><small>오늘 ${N(sk('news_global').today)}</small></div>
   <div class="card kpi"><span class="l">AI 분석 누적</span><b>${N(A.total)}회</b><small>오늘 ${N(A.today)} · 최근 7일 ${N(A.d7)}</small></div>
   <div class="card kpi"><span class="l">TOP 10 아카이브</span><b>${N(T.archive_days)}일</b><small>목표 365일</small></div>
   <div class="card kpi"><span class="l">타임라인이 생긴 인물</span><b>${N(T.people)}명</b><small>명부 ${N(T.registry)}명 중</small></div>
   <div class="card kpi"><span class="l">최근 24시간 수집</span><b>${N(sp.runs_24h)}회</b><small>목표 48회 · 회당 새 기사 ${N(sp.avg_new_per_run)}건</small></div>
  </div>
  <h2>일자별 수집 추이 ${tog}<small>빨간 막대 = 평소의 절반 아래 · 연한 막대 = 진행 중인 오늘 · 점선 = 평균</small></h2>
  <div class="grid3">
   <section class="card"><h3>국내 기사 ${trend(sk('news_kr').daily)}<small>하루 목표 ${N(sk('news_kr').target)}건</small></h3>${bars(sk('news_kr').daily,{h:110,unit:'건'})}</section>
   <section class="card"><h3>해외 기사 ${trend(sp.global_daily)}<small>하루 목표 ${N(sk('news_global').target)}건</small></h3>${bars(sp.global_daily,{h:110,unit:'건',col:'#7a4dff'})}</section>
   <section class="card"><h3>수집 실행 횟수 <small>목표 하루 48회</small></h3>${bars((sp.runs_daily||[]).map(([d,r])=>[d,r]),{h:110,unit:'회',col:'#0f1630'})}
    ${(sp.runs_daily||[]).slice(-RANGE).some(x=>x[2])?`<p class="fine">실패한 소스 수: ${(sp.runs_daily||[]).slice(-RANGE).filter(x=>x[2]).slice(-6).map(([d,,f])=>`${md(d)} ${N(f)}`).join(' · ')}</p>`:''}</section>
  </div>
  <h2>수집처별 추이 ${tog}<small>하루치 기록이 없는 곳은 그날 마지막 값으로 그림</small></h2>
  ${groups.map(g=>`<h3 class="gh">${E(g)}</h3><div class="mul">${src.filter(s=>s.group===g).map(s=>{const lv=LV[s.level]||LV.ok;
    return`<div class="card mc ${s.drop?'dr':''}"><div class="mh"><b><span class="dot ${lv[0]}" title="${lv[1]}"></span>${E(s.name)}</b><span>${trend(s.daily)}</span></div>
     <div class="mn"><b>${N(s.today)}</b><small>${E(s.unit)} 오늘</small>${s.total!=null?`<small>누적 ${K(s.total)}</small>`:''}<small class="mute">${AGO(s.age_h)}</small></div>
     ${bars(s.daily,{h:50,unit:s.unit,col:s.hist?'#8189a3':undefined})}${s.drop?`<p class="fine bad">어제 ${N(s.drop.yday)} — 평소 ${N(s.drop.median)}</p>`:''}</div>`}).join('')}</div>`).join('')}
  <h2>분류별 수집 추이 ${tog}</h2>
  <div class="grid2">
   <section class="card"><h3>국내 기사 — 섹션별 <small>날짜별 수집량</small></h3>${stackBars(C.daily_sections,{h:120})}</section>
   <section class="card"><h3>국내 기사 — 출처별 <small>네이버·구글뉴스</small></h3>${stackBars(C.daily_kr_source,{h:120,name:k=>SRCN[k]||k})}</section>
   <section class="card"><h3>오늘의 TOP 10 — 분류별 <small>날짜별 10개 이슈의 분류</small></h3>${stackBars(C.daily_top10,{h:120})}</section>
   <section class="card"><h3>해외 기사 — 분류별</h3>${stackBars(C.daily_global,{h:120})}</section>
  </div>
  <section class="card"><h3>섹션별로 나눠 보기 <small>▲▼ = 최근 7일 평균이 그 전 7일보다 늘었는지·줄었는지</small></h3>${multiples(C.daily_sections)}</section>
  <h2>AI 분석 ${tog}<small>새로 분석한 횟수(이전 분석을 다시 쓴 것은 제외)</small></h2>
  <div class="kpis">
   <div class="card kpi"><span class="l">오늘</span><b>${N(A.today)}회</b><small>${(A.engines||[]).map(e=>`${E(e.name)} ${N(e.today)}`).join(' · ')||'—'}</small></div>
   <div class="card kpi"><span class="l">최근 7일</span><b>${N(A.d7)}회</b><small>실패 ${N(A.fail7)} · 다시 씀 ${N(A.reused7)}</small></div>
   <div class="card kpi"><span class="l">누적</span><b>${N(A.total)}회</b><small>${(A.engines||[]).map(e=>e.first).filter(Boolean).sort()[0]||'—'}부터</small></div>
   <div class="card kpi"><span class="l">AI가 분석한 TOP 10 이슈</span><b>${N(A.issues_total)}건</b><small>아카이브 누적</small></div>
   <div class="card kpi"><span class="l">보관 중인 분석 결과</span><b>${N(A.stored_total)}건</b><small>${Object.entries(A.stored||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${E(aik(k))} ${N(v)}`).join(' · ')}</small></div>
   <div class="card kpi"><span class="l">로컬 AI(맥미니)</span><b>${A.local_connected?'연결됨':'연결 전'}</b><small>${A.local_connected?'온디바이스 분석 기록 있음':'아직 클라우드 AI만 분석 중'}</small></div>
  </div>
  <div class="grid2">
   <section class="card"><h3>날짜별 AI 분석 횟수 ${trend(A.daily)}<small>모든 AI 합계</small></h3>${bars(A.daily,{h:110,unit:'회',col:'#ff4d2e'})}</section>
   <section class="card"><h3>날짜별 AI가 분석한 TOP 10 이슈 <small>깊게 보기까지 만든 이슈 수 · 하루 10개</small></h3>${bars((A.issues_daily||[]).map(([d,n])=>[d,n]),{h:110,unit:'건',col:'#11a683',avg:false})}</section>
  </div>
  ${A.quota&&Object.keys(A.quota.models||{}).length?`<section class="card scroll"><h3>모델별 오늘 사용량 <small>Gemini 무료 등급 · 하루 한도는 미국 서부 자정(한국 오후 4~5시)에 초기화 · ${E(A.quota.day)}</small></h3>
   <table class="tbl"><thead><tr><th>모델</th><th class="n">성공</th><th>하루 한도(지난 기록)</th><th class="n">분당 한도 대기</th><th>상태</th></tr></thead><tbody>${Object.entries(A.quota.models).map(([m,v])=>{const cap=(A.quota.cap||{})[m];
    return`<tr><td><b>${E(m)}</b></td><td class="n">${N(v.ok)}</td><td>${cap?`<div class="pgw">${prog(v.ok,cap)}</div><small class="mute">약 ${N(cap)}회</small>`:'<span class="mute">아직 한도에 닿은 적 없음</span>'}</td><td class="n">${N(v.minute)}</td><td>${v.out?'<span class="dot warn"></span>오늘 한도 소진 → 보조 모델 사용':'<span class="dot ok"></span>사용 가능'}</td></tr>`}).join('')}</tbody></table></section>`:''}
  ${(A.engines||[]).length?`<div class="mul">${A.engines.map(e=>`<div class="card mc"><div class="mh"><b>${E(e.name)}</b><span class="mute">${E(e.engine)}</span></div>
    <div class="mn"><b>${N(e.today)}</b><small>회 오늘</small><small>7일 ${N(e.d7)}</small><small>누적 ${N(e.total)}</small>${e.fail7?`<small class="bad">7일 실패 ${N(e.fail7)}</small>`:''}</div>
    ${bars(e.daily,{h:50,unit:'회',col:'#ff4d2e'})}
    ${Object.keys(e.kinds7||{}).length?`<h4>최근 7일 작업별</h4>${stack(Object.fromEntries(Object.entries(e.kinds7).map(([k,v])=>[aik(k),v])),12)}`:'<p class="fine">작업별 기록은 다음 수집부터 쌓여요</p>'}
    ${Object.keys(e.models||{}).length?`<p class="fine">모델: ${Object.entries(e.models).map(([k,v])=>`${E(k)} ${N(v)}`).join(' · ')}</p>`:''}</div>`).join('')}</div>`:'<p class="mute">AI 분석 기록이 아직 없어요.</p>'}
  <h2>수집처별 현황 <small>오늘 · 누적 · 추이 · 목표 대비 · 마지막 갱신</small></h2>
  ${groups.map(g=>`<section class="card scroll"><h3 class="gh">${E(g)}</h3><table class="tbl dsrc"><thead><tr><th>수집처</th><th class="n">오늘</th><th class="n">누적</th><th>최근 ${RANGE}일</th><th>목표 대비</th><th>마지막 갱신</th></tr></thead><tbody>
   ${src.filter(s=>s.group===g).map(s=>{const lv=LV[s.level]||LV.ok;const ex=Object.entries(s.extra||{}).filter(([k,v])=>v!=null&&typeof v!=='object').map(([k,v])=>`${E(k)} ${E(typeof v==='number'?N(v):v)}`).join(' · ');
    const tv=s.key==='people'?(s.extra||{}).people:s.key==='archive'||s.key==='naver_api'?s.total:s.key==='history'?(s.extra||{}).targets_full:s.today;
    return`<tr><td><span class="dot ${lv[0]}" title="${lv[1]}"></span><b>${E(s.name)}</b>${s.note?`<small class="mute">${E(s.note)}</small>`:''}${ex?`<small class="ex">${ex}</small>`:''}</td>
     <td class="n">${N(s.today)}<small>${E(s.unit)}</small></td><td class="n">${N(s.total)}</td><td>${spark(s.daily)}</td>
     <td>${s.target?`<div class="pgw">${prog(tv,s.target)}</div><small class="mute">${E(s.target_label)}</small>`:'<span class="mute">—</span>'}</td>
     <td>${AGO(s.age_h)}${s.max_age_h?`<small class="mute">기준 ${s.max_age_h}시간</small>`:''}</td></tr>`}).join('')}</tbody></table></section>`).join('')}
  <h2>수집 속도</h2>
  <section class="card"><h3>오늘 시간대별 새 기사 <small>국내</small></h3>${bars((sp.per_hour_today||[]).map(([h,v])=>[h,v]),{h:90,unit:'건',today:false,avg:false,lab:h=>+h+'시'})}</section>
  <h2>품질 · 정합성 · 가치 <small>목표 대비 · 추이는 날마다 마지막 값</small></h2>
  <section class="card scroll"><table class="tbl dq">${(S.quality||[]).map(q=>{const lv=LV[q.level]||LV.ok;const u=q.unit||'%';return`<tr><td><span class="dot ${lv[0]}"></span><b>${E(q.name)}</b>${q.note?`<small class="mute">${E(q.note)}</small>`:''}</td><td class="n"><b>${q.value==null?'—':N(q.value)+u}</b></td><td>${spark(q.daily,24)}</td><td style="width:32%">${q.target?`<div class="pgw">${prog(q.value,q.target)}</div><small class="mute">목표 ${N(q.target)}${u}</small>`:'<span class="mute">참고 지표</span>'}</td></tr>`}).join('')}</table></section>
  <h2>분류별 분포</h2>
  <div class="grid2"><section class="card"><h3>오늘 TOP 10</h3>${stack(C.today)}<h3 style="margin-top:14px">최근 7일 TOP 10</h3>${stack(C.week)}<h3 style="margin-top:14px">최근 1년 아카이브</h3>${stack(C.year)}</section>
   <section class="card"><h3>오늘 국내 기사 수집 섹션</h3>${stack(C.sections_today)}<h3 style="margin-top:14px">오늘 해외 기사 분류</h3>${stack(C.global_today)}</section></div>`;
  el.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>{RANGE=+b.dataset.range;try{localStorage.setItem('nb-dash-range',RANGE)}catch(e){}const y=scrollY;renderDash(el);scrollTo(0,y)});
  tipper(el)};
})();
