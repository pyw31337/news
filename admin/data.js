/* 관리자 '데이터 수집 현황판' — data/stats.json(scripts/stats.py)을 그림
   문제 목록 → 핵심 숫자 → 수집처별(오늘·누적·14일 추이·목표 진행·마지막 갱신) → 수집 속도 → 품질(정합성·가치) → 분류별 분포 */
(function(){
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=n=>n==null?'—':Number(n).toLocaleString('ko-KR');
const AGO=h=>h==null?'—':h<1?Math.round(h*60)+'분 전':h<48?h.toFixed(1)+'시간 전':Math.round(h/24)+'일 전';
const LV={ok:['ok','정상'],warn:['warn','주의'],bad:['bad','문제']};
const CC={정치:'#2f6bff',경제:'#11a683',사회:'#ff4d2e',세계:'#7a4dff',IT:'#0aa5c8',과학:'#4868d8',건강:'#d64f73',환경:'#28a26e',문화:'#9c58cc',연예:'#e2448e',스포츠:'#f08a00'};
const spark=(d,h=34)=>{if(!d||!d.length)return'<span class="mute">—</span>';const mx=Math.max(1,...d.map(x=>x[1]));return`<div class="sp" style="height:${h}px">${d.map(([k,v])=>`<i style="height:${Math.max(v?4:1,v/mx*100)}%" title="${E(k)} ${N(v)}"></i>`).join('')}</div>`};
const prog=(v,t)=>{if(v==null||!t)return'';const p=Math.min(100,v/t*100);return`<div class="pg"><i style="width:${p.toFixed(1)}%" class="${p>=100?'ok':p>=70?'mid':'low'}"></i></div><small>${p.toFixed(0)}%</small>`};
const stack=(o,h=18)=>{const e=Object.entries(o||{}).filter(([k])=>k&&k!=='null').sort((a,b)=>b[1]-a[1]),t=e.reduce((s,x)=>s+x[1],0)||1;
  return`<div class="stk" style="height:${h}px">${e.map(([k,v])=>`<i style="flex:${v};background:${CC[k]||'#8189a3'}" title="${E(k)} ${N(v)} (${(v/t*100).toFixed(0)}%)"></i>`).join('')}</div><div class="lg">${e.map(([k,v])=>`<span><i style="background:${CC[k]||'#8189a3'}"></i>${E(k)} <b>${N(v)}</b></span>`).join('')}</div>`};
window.renderDash=async function(el){if(!el)return;el.innerHTML='<p class="mute">수집 현황을 불러오는 중…</p>';
  let S;try{S=await (await fetch('../data/stats.json',{cache:'no-store'})).json()}catch(e){el.innerHTML='<p class="err">stats.json이 아직 없어요. 다음 수집 뒤에 채워져요.</p>';return}
  const src=S.sources||[],T=S.totals||{},sp=S.speed||{},P=S.problems||[];
  const groups=[...new Set(src.map(s=>s.group))];
  const bad=P.filter(p=>p.level==='bad').length,warn=P.filter(p=>p.level==='warn').length;
  el.innerHTML=`<h2>데이터 수집 현황판 <small>${E(String(S.updated||'').replace('T',' '))} 기준 · 30분마다 갱신</small></h2>
  <section class="card dprob"><h3><span class="dot ${bad?'bad':warn?'warn':'ok'}"></span>${bad||warn?`확인이 필요한 곳 ${bad+warn}건 <small>문제 ${bad} · 주의 ${warn}</small>`:'모든 수집처 정상'}</h3>
   ${P.length?`<ul>${P.map(p=>`<li class="${p.level}"><b>${E(p.what)}</b><span>${E(p.why)}</span></li>`).join('')}</ul>`:''}</section>
  <div class="kpis">
   <div class="card kpi"><span class="l">국내 기사 누적</span><b>${N(T.articles_kr)}</b><small>오늘 ${N((src.find(s=>s.key==='news_kr')||{}).today)} · 7일 평균 ${N(sp.avg_daily_7)}/일</small></div>
   <div class="card kpi"><span class="l">해외 기사 누적</span><b>${N(T.articles_global)}</b><small>오늘 ${N((src.find(s=>s.key==='news_global')||{}).today)}</small></div>
   <div class="card kpi"><span class="l">TOP 10 아카이브</span><b>${N(T.archive_days)}일</b><small>목표 365일</small></div>
   <div class="card kpi"><span class="l">타임라인이 생긴 인물</span><b>${N(T.people)}명</b><small>명부 ${N(T.registry)}명 중</small></div>
   <div class="card kpi"><span class="l">화제 대상 DB</span><b>${N(T.entities)}</b><small>인물·기업·장소</small></div>
   <div class="card kpi"><span class="l">최근 24시간 수집</span><b>${N(sp.runs_24h)}회</b><small>목표 48회 · 회당 새 기사 ${N(sp.avg_new_per_run)}건</small></div>
  </div>
  <h2>수집처별 현황 <small>오늘 · 누적 · 최근 14일 · 목표 대비 · 마지막 갱신</small></h2>
  ${groups.map(g=>`<section class="card scroll"><h3 class="gh">${E(g)}</h3><table class="tbl dsrc"><thead><tr><th>수집처</th><th class="n">오늘</th><th class="n">누적</th><th>최근 14일</th><th>목표 대비</th><th>마지막 갱신</th></tr></thead><tbody>
   ${src.filter(s=>s.group===g).map(s=>{const lv=LV[s.level]||LV.ok;const ex=Object.entries(s.extra||{}).filter(([k,v])=>v!=null&&typeof v!=='object').map(([k,v])=>`${E(k)} ${E(typeof v==='number'?N(v):v)}`).join(' · ');
    const tv=s.key==='people'?(s.extra||{}).people:s.key==='archive'?s.total:s.key==='history'?(s.extra||{}).targets_full:s.key==='naver_api'?s.total:s.key==='news_kr'||s.key==='news_global'?s.today:s.today;
    return`<tr><td><span class="dot ${lv[0]}" title="${lv[1]}"></span><b>${E(s.name)}</b>${s.note?`<small class="mute">${E(s.note)}</small>`:''}${ex?`<small class="ex">${ex}</small>`:''}</td>
     <td class="n">${N(s.today)}<small>${E(s.unit)}</small></td><td class="n">${N(s.total)}</td><td>${spark(s.daily)}</td>
     <td>${s.target?`<div class="pgw">${prog(tv,s.target)}</div><small class="mute">${E(s.target_label)}</small>`:'<span class="mute">—</span>'}</td>
     <td>${AGO(s.age_h)}${s.max_age_h?`<small class="mute">기준 ${s.max_age_h}시간</small>`:''}</td></tr>`}).join('')}</tbody></table></section>`).join('')}
  <h2>수집 속도</h2>
  <div class="grid2"><section class="card"><h3>오늘 시간대별 새 기사 <small>국내</small></h3>${spark((sp.per_hour_today||[]).map(([h,v])=>[h+'시',v]),90)}<div class="axis">${(sp.per_hour_today||[]).map(([h])=>`<span>${E(h)}</span>`).join('')}</div></section>
   <section class="card"><h3>일별 수집 실행 횟수 <small>목표 하루 48회 · 빨간 줄은 실패한 소스 수</small></h3>${spark((sp.runs_daily||[]).map(([d,r])=>[d,r]),90)}<div class="axis">${(sp.runs_daily||[]).map(([d,r,f])=>`<span title="${E(d)} 실행 ${r} · 실패 ${f}">${E(d.slice(5))}${f?`<em>${f}</em>`:''}</span>`).join('')}</div></section></div>
  <h2>품질 · 정합성 · 가치 <small>목표 대비</small></h2>
  <section class="card"><table class="tbl dq">${(S.quality||[]).map(q=>{const lv=LV[q.level]||LV.ok;const u=q.unit||'%';return`<tr><td><span class="dot ${lv[0]}"></span><b>${E(q.name)}</b>${q.note?`<small class="mute">${E(q.note)}</small>`:''}</td><td class="n"><b>${q.value==null?'—':N(q.value)+u}</b></td><td style="width:38%">${q.target?`<div class="pgw">${prog(q.value,q.target)}</div><small class="mute">목표 ${N(q.target)}${u}</small>`:'<span class="mute">참고 지표</span>'}</td></tr>`}).join('')}</table></section>
  <h2>분류별 분포</h2>
  <div class="grid2"><section class="card"><h3>오늘 TOP 10</h3>${stack(S.categories?.today)}<h3 style="margin-top:14px">최근 7일 TOP 10</h3>${stack(S.categories?.week)}<h3 style="margin-top:14px">최근 1년 아카이브</h3>${stack(S.categories?.year)}</section>
   <section class="card"><h3>오늘 국내 기사 수집 섹션</h3>${stack(S.categories?.sections_today)}<h3 style="margin-top:14px">오늘 해외 기사 분류</h3>${stack(S.categories?.global_today)}</section></div>`};
})();
