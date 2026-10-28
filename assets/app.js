const $=s=>document.querySelector(s);const app=$('#app');let D=null;const CACHE={};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPE={person:'인물',place:'장소',org:'기관·기업',event:'키워드'};
const CATC={정치:'#2f6bff',경제:'#11a683',사회:'#ff4d2e',세계:'#7a4dff',IT:'#0aa5c8',연예:'#e2448e',스포츠:'#f08a00'};
const ago=t=>{if(!t)return'';const m=(Date.now()-new Date(t))/6e4;if(m<60)return Math.max(1,m|0)+'분 전';if(m<1440)return(m/60|0)+'시간 전';if(m<43200)return(m/1440|0)+'일 전';return fmtD(t)};
const fmtD=t=>{const d=new Date(t);return`${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`};
const bg=u=>u?`style="background-image:url('${esc(u)}')"`:'';
const ent=n=>D.entities.find(e=>e.name===n);
const eh=n=>'#/entity/'+encodeURIComponent(n);
function chipE(n,nolink){const e=ent(n);if(e&&nolink)return`<span class="chip ${e.type}">${esc(n)}</span>`;return e?`<a class="chip ${e.type}" href="${eh(n)}">${esc(n)}</a>`:`<span class="chip event">#${esc(n)}</span>`}
function spark(daily,w=120,h=28,col='#ff4d2e'){ // monthly counts for the last 24 months
  const now=new Date();const bins=Array(24).fill(0);
  daily.forEach(([d,c])=>{const t=new Date(d);const k=(now.getFullYear()-t.getFullYear())*12+now.getMonth()-t.getMonth();if(k>=0&&k<24)bins[23-k]+=c});
  const mx=Math.max(1,...bins);const pts=bins.map((v,i)=>`${(i/23*w).toFixed(1)},${(h-2-v/mx*(h-4)).toFixed(1)}`).join(' ');
  return`<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="0,${h} ${pts} ${w},${h}" fill="${col}22" stroke="none"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6"/></svg>`}
function sec(t,sub,more=''){return`<div class="sec"><h2><small>${sub}</small>${t}</h2>${more}</div>`}
function av(e,cls='av'){const t=e.wiki&&e.wiki.thumb;return`<div class="${cls}" ${bg(t)}>${t?'':esc(e.name[0])}</div>`}

async function load(){
  D=await (await fetch('data/today.json?'+Date.now())).json();
  $('#updated').innerHTML=`${fmtD(D.updated)} ${new Date(D.updated).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} 업데이트<br>기사 ${D.stats.naver+D.stats.google}건 · 언론사 ${D.stats.presses}곳 분석`;
  const tk=D.trends.map((t,i)=>`<span><b>${i+1}</b>${esc(t.keyword)} <small style="color:#7d86a8">${esc(t.traffic)}</small></span>`).join('');
  $('#ticker').innerHTML=`<div class="lab">실시간 검색</div><div class="run">${tk}${tk}</div>`;
  route();
}
window.addEventListener('hashchange',route);
function route(){
  if(!D)return;const h=decodeURIComponent(location.hash.slice(2));const [v,a]=[h.split('/')[0],h.split('/').slice(1).join('/')];
  document.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x.dataset.v===(v||'today')||(v==='entity'&&x.dataset.v==='people')||(v==='issue'&&x.dataset.v==='today')));
  window.scrollTo(0,0);
  ({'':today,issue:()=>issue(a),entity:()=>entity(a),timeline,people,map,archive}[v]||today)();
}

/* ---------- 오늘 ---------- */
function today(){
  const I=D.issues,L=I[0],mx=I[0].score;
  const side=I.slice(1,5).map(i=>`<a class="card mini" href="#/issue/${i.id}"><div class="n">${i.rank}</div><div class="th" ${bg(i.image)}></div><div><span class="cat ${i.category}">${i.category}</span><h3>${esc(i.title)}</h3><div class="m">${esc(i.press)} 외 ${i.presses-1}곳 · 관련 ${i.mentions}건</div></div></a>`).join('');
  const cats={};I.forEach(i=>cats[i.category]=(cats[i.category]||0)+1);
  const grid=I.map((i,k)=>{const wide=k===0||k===5;const txt=!i.image||k===3||k===8;
    return`<a class="card ic ${wide?'wide':''} ${txt&&!wide?'text':''}" href="#/issue/${i.id}">
    <div class="img" ${bg(i.image)}><div class="rk">${i.rank}</div></div>
    <div class="bd">${txt&&!wide?`<div class="rkt">${String(i.rank).padStart(2,'0')}</div>`:''}<div style="display:flex;gap:6px;align-items:center"><span class="cat ${i.category}">${i.category}</span>${i.trend.length?'<span class="chip event">검색 급상승</span>':''}</div>
    <h3>${esc(i.title)}</h3>${i.summary.length?`<ul>${i.summary.slice(0,wide?3:2).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}
    <div class="chips">${i.entities.slice(0,3).map(n=>chipE(n,1)).join('')}</div>
    <div><div class="bar"><i style="width:${(i.score/mx*100).toFixed(0)}%"></i></div></div>
    <div class="ft"><span>화제도 ${i.score} · 언론사 ${i.presses}곳</span><span>원문 ${i.sources.length}건 →</span></div></div></a>`}).join('');
  const P=D.entities.slice(0,14);
  const pcs=P.map(e=>`<a class="card pc" href="${eh(e.name)}">${av(e)}<span class="chip ${e.type}">${TYPE[e.type]}</span><b style="margin-top:6px">${esc(e.name)}</b><small>${esc(e.wiki?.desc||'')}</small>${spark(e.daily)}</a>`).join('');
  const tr=D.trends.slice(0,10).map((t,i)=>`<div class="tr"><span class="n">${i+1}</span><b>${esc(t.keyword)}</b><span>${esc(t.traffic)}</span></div>`).join('');
  const gl=P.filter(e=>e.wiki&&e.wiki.extract).slice(0,4).map(e=>`<a class="card term" href="${eh(e.name)}" style="border-color:${{person:'#ff4d2e',place:'#11a683',org:'#7a4dff'}[e.type]||'#ffb020'}"><h4>${esc(e.name)}<em>${esc(e.wiki.desc||TYPE[e.type])}</em></h4><p>${esc(e.wiki.extract.slice(0,120))}…</p></a>`).join('');
  app.innerHTML=`
  <section class="hero">
    <a class="lead" href="#/issue/${L.id}" ${bg(L.image)}><div class="in"><div class="no">01</div><span class="cat ${L.category}">${L.category}</span>
      <h1>${esc(L.title)}</h1><p>${esc(L.summary.join(' '))}</p>
      <div class="meter"><div><b>${L.mentions}</b><span>관련 기사</span></div><div><b>${L.presses}</b><span>보도 언론사</span></div><div><b>${L.score}</b><span>화제도</span></div></div>
      <div class="meta">${L.entities.slice(0,4).map(n=>chipE(n,1)).join('')}</div></div></a>
    <div class="side">${side}</div>
  </section>
  <div class="stats">
    <div class="stat"><b>${D.stats.naver.toLocaleString()}</b><span>네이버 랭킹 기사</span></div>
    <div class="stat"><b>${D.stats.google.toLocaleString()}</b><span>구글 뉴스 헤드라인</span></div>
    <div class="stat"><b>${D.stats.clusters.toLocaleString()}</b><span>자동으로 묶인 이슈</span></div>
    <div class="stat"><b>${D.entities.length}</b><span>추적 중인 인물·장소·기관</span></div>
  </div>
  ${sec('오늘의 이슈 TOP 10','Today’s Top 10',`<span class="more">포털 랭킹 × 보도량 × 검색량</span>`)}
  <div class="catbar">${Object.entries(cats).map(([c,n])=>`<i style="flex:${n};background:${CATC[c]}"></i>`).join('')}</div>
  <div class="legend" style="margin-bottom:14px">${Object.entries(cats).map(([c,n])=>`<span style="--c:${CATC[c]}">${c} ${n}</span>`).join('')}</div>
  <div class="grid10">${grid}</div>
  ${sec('지금 뉴스의 중심에 선 사람·곳','Who & Where',`<a class="more" href="#/people">전체 보기 →</a>`)}
  <div class="hs">${pcs}</div>
  <div class="two" style="margin-top:8px"><div>
    ${sec('알아두면 좋은 키워드','Glossary','')}<div class="gloss">${gl}</div></div>
    <aside>${sec('검색 급상승','Google Trends KR','')}<div class="trends" style="grid-template-columns:1fr 1fr">${tr}</div></aside>
  </div>
  ${sec('관계로 보는 오늘','Relation map',`<a class="more" href="#/map">크게 보기 →</a>`)}
  <div class="card mapwrap" style="height:380px;min-height:0" id="mapmini"></div>`;
  graph($('#mapmini'),true);
}

/* ---------- 이슈 상세 ---------- */
function issue(id){
  const i=D.issues.find(x=>x.id===id);if(!i)return today();
  const gl=i.entities.map(ent).filter(e=>e&&e.wiki).map(e=>`<a class="card term" href="${eh(e.name)}"><h4>${esc(e.name)}<em>${esc(e.wiki.desc||'')}</em></h4><p>${esc((e.wiki.extract||'').slice(0,140))}…</p></a>`).join('');
  app.innerHTML=`<a class="back" href="#/">← 오늘의 TOP 10</a>
  <div class="two"><div>
   <article class="card dhead"><div class="img" ${bg(i.image)}></div><div class="bd">
    <div style="display:flex;gap:8px;align-items:center"><span class="cat ${i.category}">${i.category}</span><b style="color:var(--acc)">오늘의 이슈 ${i.rank}위</b></div>
    <h1>${esc(i.title)}</h1>
    <div class="summary"><h5>3줄 요약 · 기사 리드문 추출</h5>${i.summary.map(s=>`<div>• ${esc(s)}</div>`).join('')||'<div>요약을 가져오지 못했어요. 아래 원문을 확인하세요.</div>'}</div>
    <div class="kpis" style="margin-top:14px"><div><b>${i.mentions}</b><span>관련 기사</span></div><div><b>${i.presses}</b><span>언론사</span></div><div><b>${i.score}</b><span>화제도</span></div></div>
    <div class="chips" style="margin-top:14px">${i.entities.map(chipE).join('')}${i.keywords.filter(k=>!i.entities.includes(k)).map(k=>`<span class="chip">#${esc(k)}</span>`).join('')}</div>
    <a class="chip" style="margin-top:14px;background:var(--ink);color:#fff;padding:10px 16px" href="${esc(i.url)}" target="_blank" rel="noopener">대표 원문 읽기 (${esc(i.press)}) ↗</a>
   </div></article>
   ${sec('이 사건의 흐름','Issue timeline · 최근 30일','')}
   <div class="vt" id="itl"></div>
  </div><aside>
   ${sec('원문 모아보기','Sources','')}
   <div class="src">${i.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener"><span class="p ${s.portal==='네이버'?'':'g'}">${s.portal==='네이버'?'N '+esc(s.kind):'G'}</span><span class="t">${esc(s.title)}</span><small>${esc(s.press)}</small></a>`).join('')}</div>
   ${gl?sec('등장 인물·키워드','Glossary','')+`<div class="gloss" style="grid-template-columns:1fr">${gl}</div>`:''}
  </aside></div>`;
  vtl($('#itl'),i.timeline.slice().reverse(),'day');
}

/* ---------- 세로 타임라인 (줌) ---------- */
const ZK={hour:t=>{const d=new Date(t);return`${d.getMonth()+1}월 ${d.getDate()}일 ${d.getHours()}시`},day:t=>{const d=new Date(t);return`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`},month:t=>{const d=new Date(t);return`${d.getFullYear()}년 ${d.getMonth()+1}월`},year:t=>new Date(t).getFullYear()+'년'};
function vtl(el,items,z,limit=4){
  const g=[];items.forEach(x=>{const k=ZK[z](x.t);if(!g.length||g[g.length-1].k!==k)g.push({k,a:[]});g[g.length-1].a.push(x)});
  if(!g.length){el.innerHTML='<div class="note">아직 쌓인 기록이 없어요.</div>';return}
  let shown=Math.min(g.length,z==='year'?20:12);
  const draw=()=>{el.innerHTML=g.slice(0,shown).map(({k,a})=>{const s=a.slice().sort((p,q)=>q.related-p.related);
    return`<div class="vg"><h4>${k}<span>기사 ${a.length}건</span></h4>${s.slice(0,limit).map((x,j)=>`<a class="ve ${j===0&&x.related>2?'big':''}" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}<small>${esc(x.press)} · ${fmtD(x.t)}${x.related>1?` · 묶음 기사 ${x.related}건`:''}</small></a>`).join('')}</div>`}).join('')+(shown<g.length?`<div class="ve moreb">이전 기록 더 보기 (${g.length-shown}개 구간)</div>`:'');
    const m=el.querySelector('.moreb');if(m)m.onclick=()=>{shown+=12;draw()}};draw();
}
function eraChart(items,z){ // horizontal bar chart (scroll) by month or year
  const fmt=z==='year'?(t=>t.slice(0,4)):(t=>t.slice(0,7));const c={};items.forEach(x=>{const k=fmt(x.t);c[k]=(c[k]||0)+1});
  const ks=Object.keys(c).sort();if(!ks.length)return'';
  // fill gaps
  const all=[];let [y,m]=ks[0].split('-').map(Number);const [ey,em]=ks[ks.length-1].split('-').map(Number);
  if(z==='year'){for(let k=y;k<=ey;k++)all.push(String(k))}else{while(y<ey||(y===ey&&m<=em)){all.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){m=1;y++}}}
  const bw=z==='year'?44:16,H=130,mx=Math.max(...Object.values(c));const W=Math.max(all.length*bw+20,300);
  return`<div class="era"><svg width="${W}" height="${H+24}">${all.map((k,i)=>{const v=c[k]||0,h=v/mx*(H-10);return`<rect x="${i*bw+10}" y="${H-h}" width="${bw-4}" height="${h}" rx="3" fill="${v===mx?'#ff4d2e':'#2f6bff'}" opacity="${v?1:.15}"><title>${k}: ${v}건</title></rect>${(z==='year'||k.endsWith('-01'))?`<text x="${i*bw+10}" y="${H+16}">${z==='year'?k:k.slice(0,4)}</text>`:''}`}).join('')}</svg></div>`;
}

/* ---------- 인물/장소 상세 ---------- */
function entity(n){
  const e=ent(n);if(!e)return people();
  const tl=e.timeline,first=tl.length?tl[tl.length-1].t:null;
  const rel=e.related.map(r=>chipE(r.name)).join('');
  const iss=e.issues.map(id=>D.issues.find(x=>x.id===id)).filter(Boolean);
  app.innerHTML=`<a class="back" href="#/people">← 인물·장소</a>
  <div class="two"><div>
   <section class="card prof"><div class="row">${av(e)}<div><span class="chip ${e.type}">${TYPE[e.type]}</span><h1>${esc(e.name)}</h1><p>${esc(e.wiki?.desc||'')}</p></div></div>
    ${e.wiki?.extract?`<p>${esc(e.wiki.extract)} ${e.wiki.url?`<a href="${esc(e.wiki.url)}" target="_blank" style="color:var(--blue)">위키백과 ↗</a>`:''}</p>`:''}
    <div class="kpis"><div><b>${e.score}</b><span>오늘 화제도</span></div><div><b>${tl.length}</b><span>수집된 기록</span></div><div><b>${first?new Date(first).getFullYear():'-'}</b><span>가장 오래된 기록</span></div></div>
   </section>
   ${sec('시대별 보도량','Coverage by era','<div class="zoom" id="ez"><button data-z="month" class="on">월</button><button data-z="year">연</button></div>')}
   <div class="card" style="padding:10px 14px" id="era"></div>
   ${sec(esc(e.name)+' 타임라인','Timeline','<div class="zoom" id="tz"><button data-z="hour">시간</button><button data-z="day" class="on">일</button><button data-z="month">월</button><button data-z="year">시대</button></div>')}
   <div class="vt" id="etl"></div>
  </div><aside>
   ${iss.length?sec('오늘 관련 이슈','Today','')+`<div class="src">${iss.map(i=>`<a href="#/issue/${i.id}"><span class="p">${i.rank}위</span><span class="t">${esc(i.title)}</span></a>`).join('')}</div>`:''}
   ${rel?sec('함께 언급된','Related','')+`<div class="chips">${rel}</div>`:''}
   ${e.history.length>1?sec('NewsBoard 누적 화제도','Daily score','')+`<div class="card" style="padding:12px">${spark(e.history.map(([d,v])=>[d,v]),300,60,'#2f6bff')}</div>`:'<div class="note" style="margin-top:20px">매시간 수집이 누적되면 일자별 화제도 그래프가 이곳에 쌓입니다.</div>'}
  </aside></div>`;
  const drawE=z=>{$('#era').innerHTML=eraChart(tl,z);const x=$('#era .era');if(x)x.scrollLeft=1e5};drawE('month');
  $('#ez').onclick=ev=>{const z=ev.target.dataset.z;if(!z)return;$('#ez').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));drawE(z)};
  const drawT=z=>vtl($('#etl'),z==='hour'?tl.filter(x=>Date.now()-new Date(x.t)<3*864e5):tl,z,z==='year'?6:4);drawT('day');
  $('#tz').onclick=ev=>{const z=ev.target.dataset.z;if(!z)return;$('#tz').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));drawT(z)};
}

/* ---------- 타임라인 (멀티 레인) ---------- */
function timeline(){
  let sel=D.entities.slice(0,5).map(e=>e.name),z='month';
  app.innerHTML=`${sec('타임라인 비교','Swimlane','')}
  <p style="color:var(--ink2);font-size:14px">인물·장소·기관을 골라 같은 시간축 위에 겹쳐 보세요. 원이 클수록 그 시기에 기사가 많았습니다.</p>
  <div class="chips" id="pick" style="margin:14px 0"></div>
  <div class="zoom" id="lz"><button data-z="day">최근 60일</button><button data-z="month" class="on">월(2년)</button><button data-z="year">시대(연)</button></div>
  <div class="card era" id="lanes" style="margin-top:12px;padding:16px"></div>
  ${sec('최신 기록 흐름','Latest','')}<div class="vt" id="mix"></div>`;
  const pick=()=>{$('#pick').innerHTML=D.entities.map(e=>`<button class="chip ${sel.includes(e.name)?e.type:''}" style="border:0;cursor:pointer;font:inherit;font-size:12px;font-weight:700;${sel.includes(e.name)?'':'background:#e9ebf3;color:#8189a3'}" data-n="${esc(e.name)}">${esc(e.name)}</button>`).join('')};
  const draw=()=>{pick();const now=new Date();let keys,kf;
    if(z==='day'){keys=[...Array(60)].map((_,i)=>new Date(now-(59-i)*864e5).toISOString().slice(0,10));kf=t=>new Date(new Date(t).getTime()+9*36e5).toISOString().slice(0,10)}
    else if(z==='month'){keys=[...Array(24)].map((_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-23+i,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`});kf=t=>t.slice(0,7)}
    else{const y0=Math.min(...D.entities.filter(e=>sel.includes(e.name)).map(e=>e.timeline.length?+e.timeline[e.timeline.length-1].t.slice(0,4):now.getFullYear()));keys=[];for(let y=y0;y<=now.getFullYear();y++)keys.push(String(y));kf=t=>t.slice(0,4)}
    const cw=z==='day'?14:z==='month'?30:48,lw=96,rh=46,W=lw+keys.length*cw+10,es=D.entities.filter(e=>sel.includes(e.name));
    let mx=1;const M=es.map(e=>{const c={};e.timeline.forEach(x=>{const k=kf(x.t);c[k]=(c[k]||0)+1});Object.values(c).forEach(v=>mx=Math.max(mx,v));return c});
    const cols=['#ff4d2e','#2f6bff','#11a683','#7a4dff','#f08a00','#e2448e','#0aa5c8'];
    $('#lanes').innerHTML=`<svg width="${W}" height="${es.length*rh+30}">${keys.map((k,i)=>(z!=='month'||k.endsWith('-01')||i===0)&&(z!=='day'||i%7===0)?`<text x="${lw+i*cw}" y="${es.length*rh+20}">${z==='day'?k.slice(5):z==='month'?k.slice(0,4)+'.'+k.slice(5):k}</text><line x1="${lw+i*cw+cw/2}" x2="${lw+i*cw+cw/2}" y1="0" y2="${es.length*rh}" stroke="#eef0f6"/>`:'').join('')}
    ${es.map((e,r)=>`<a href="${eh(e.name)}"><text x="0" y="${r*rh+rh/2+4}" style="font-size:13px;font-weight:800;fill:#0f1630">${esc(e.name)}</text></a><line x1="${lw}" x2="${W}" y1="${r*rh+rh/2}" y2="${r*rh+rh/2}" stroke="#e6e8ef"/>${keys.map((k,i)=>{const v=M[r][k]||0;return v?`<circle cx="${lw+i*cw+cw/2}" cy="${r*rh+rh/2}" r="${(3+Math.sqrt(v/mx)*(Math.min(cw,rh)/2-3)).toFixed(1)}" fill="${cols[r%7]}" opacity=".8"><title>${esc(e.name)} ${k}: ${v}건</title></circle>`:''}).join('')}`).join('')}</svg>`;
    $('#lanes').scrollLeft=1e5;
    const mixed=es.flatMap(e=>e.timeline.slice(0,40).map(x=>({...x,title:`[${e.name}] `+x.title}))).sort((a,b)=>b.t<a.t?-1:1);
    vtl($('#mix'),mixed,'day',5)};
  $('#pick').onclick=ev=>{const n=ev.target.dataset.n;if(!n)return;sel=sel.includes(n)?sel.filter(x=>x!==n):[...sel,n].slice(-7);draw()};
  $('#lz').onclick=ev=>{if(!ev.target.dataset.z)return;z=ev.target.dataset.z;$('#lz').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));draw()};
  draw();
}

/* ---------- 인물·장소 ---------- */
function people(){
  let f='all';
  app.innerHTML=`${sec('인물·장소·기관','Entities','')}<div class="filters" id="f">${[['all','전체'],['person','인물'],['place','장소'],['org','기관·기업'],['event','키워드']].map(([k,v])=>`<button data-f="${k}" class="${k==='all'?'on':''}">${v}</button>`).join('')}</div><div class="pgrid" id="pg"></div>`;
  const draw=()=>$('#pg').innerHTML=D.entities.filter(e=>f==='all'||e.type===f).map(e=>`<a class="card pc" href="${eh(e.name)}">${av(e)}<span class="chip ${e.type}">${TYPE[e.type]}</span><b style="margin-top:6px">${esc(e.name)}</b><small>${esc(e.wiki?.desc||'')}</small>${spark(e.daily)}<small style="height:auto;margin:6px 0 0">기록 ${e.timeline.length}건 · 화제도 ${e.score}</small></a>`).join('')||'<div class="note">해당 유형이 오늘은 없어요.</div>';
  $('#f').onclick=ev=>{if(!ev.target.dataset.f)return;f=ev.target.dataset.f;$('#f').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));draw()};draw();
}

/* ---------- 관계맵 (force graph) ---------- */
function map(){
  app.innerHTML=`${sec('키워드 관계맵','Relation map','')}<p style="color:var(--ink2);font-size:14px">오늘의 이슈(사각형)와 인물·장소·기관(원)이 같은 기사에 함께 등장하면 선으로 이어집니다. 노드를 끌어보고, 눌러서 상세로 이동하세요.</p>
  <div class="legend" style="margin:10px 0"><span style="--c:#ff4d2e">인물</span><span style="--c:#11a683">장소</span><span style="--c:#7a4dff">기관·기업</span><span style="--c:#ffb020">키워드</span><span style="--c:#0f1630">이슈</span></div>
  <div class="card mapwrap" id="mapbig"></div>`;graph($('#mapbig'),false);
}
function graph(el,mini){
  const W=el.clientWidth,H=el.clientHeight,col={person:'#ff4d2e',place:'#11a683',org:'#7a4dff',event:'#ffb020'};
  const N=[],idx={},E=[];
  D.entities.forEach(e=>{idx[e.name]=N.length;N.push({id:e.name,t:e.type,r:8+Math.sqrt(e.score)/1.6,href:eh(e.name)})});
  D.issues.forEach(i=>{idx[i.id]=N.length;N.push({id:i.id,label:i.rank+'위 '+i.keywords.slice(0,2).join('·'),t:'issue',r:14,href:'#/issue/'+i.id});i.entities.forEach(n=>{if(n in idx)E.push([idx[i.id],idx[n],3])})});
  D.links.forEach(l=>{if(l.a in idx&&l.b in idx)E.push([idx[l.a],idx[l.b],l.n])});
  N.forEach((n,i)=>{const a=i/N.length*6.283;n.x=W/2+Math.cos(a)*W/3;n.y=H/2+Math.sin(a)*H/3;n.vx=n.vy=0});
  const NS='http://www.w3.org/2000/svg';el.innerHTML=`<svg viewBox="0 0 ${W} ${H}"><g class="ed"></g><g class="nd"></g></svg>`;
  const svg=el.querySelector('svg'),ge=svg.querySelector('.ed'),gn=svg.querySelector('.nd');
  const lines=E.map(([a,b,w])=>{const l=document.createElementNS(NS,'line');l.setAttribute('stroke','#c9cede');l.setAttribute('stroke-width',Math.min(4,.6+w*.4));ge.appendChild(l);return l});
  const nodes=N.map(n=>{const g=document.createElementNS(NS,'g');g.setAttribute('class','node');g.style.cursor='pointer';
    g.innerHTML=n.t==='issue'?`<rect x="${-n.r}" y="${-n.r*.7}" width="${n.r*2}" height="${n.r*1.4}" rx="5" fill="#0f1630"/><text y="${n.r+12}" text-anchor="middle" style="fill:#3b4361;font-size:${mini?10:11}px">${esc(n.label)}</text>`:`<circle r="${n.r}" fill="${col[n.t]}" fill-opacity=".9" stroke="#fff" stroke-width="2"/><text y="${n.r+13}" text-anchor="middle">${esc(n.id)}</text>`;
    gn.appendChild(g);return g});
  let drag=null,moved=false,alpha=1;
  const tick=()=>{for(let i=0;i<N.length;i++){const a=N[i];for(let j=i+1;j<N.length;j++){const b=N[j];let dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy+.01;const f=(mini?1400:2600)/d2;a.vx+=dx*f/40;a.vy+=dy*f/40;b.vx-=dx*f/40;b.vy-=dy*f/40}}
    E.forEach(([i,j])=>{const a=N[i],b=N[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1,f=(d-(mini?70:110))*.012;a.vx+=dx/d*f*d/10;a.vy+=dy/d*f*d/10;b.vx-=dx/d*f*d/10;b.vy-=dy/d*f*d/10});
    N.forEach(n=>{if(n===drag)return;n.vx+=(W/2-n.x)*.004;n.vy+=(H/2-n.y)*.004;n.x+=n.vx*alpha;n.y+=n.vy*alpha;n.vx*=.55;n.vy*=.55;n.x=Math.max(n.r+4,Math.min(W-n.r-4,n.x));n.y=Math.max(n.r+4,Math.min(H-n.r-18,n.y))});
    E.forEach(([i,j],k)=>{lines[k].setAttribute('x1',N[i].x);lines[k].setAttribute('y1',N[i].y);lines[k].setAttribute('x2',N[j].x);lines[k].setAttribute('y2',N[j].y)});
    nodes.forEach((g,i)=>g.setAttribute('transform',`translate(${N[i].x.toFixed(1)},${N[i].y.toFixed(1)})`));
    alpha*=.985;if(alpha>.02&&document.body.contains(el))requestAnimationFrame(tick)};tick();
  const pt=ev=>{const r=svg.getBoundingClientRect();return[(ev.clientX-r.left)*W/r.width,(ev.clientY-r.top)*H/r.height]};
  nodes.forEach((g,i)=>{g.addEventListener('pointerdown',ev=>{drag=N[i];moved=false;svg.setPointerCapture(ev.pointerId)})});
  svg.addEventListener('pointermove',ev=>{if(!drag)return;moved=true;[drag.x,drag.y]=pt(ev);if(alpha<.3){alpha=.3;tick()}});
  svg.addEventListener('pointerup',()=>{if(drag&&!moved)location.hash=drag.href;drag=null});
}

/* ---------- 아카이브 ---------- */
async function archive(){
  app.innerHTML=`${sec('날짜별 아카이브','Archive','')}<div class="days" id="days"></div><div class="alist" id="al"></div><div class="note">NewsBoard는 매시간 수집 결과를 날짜별로 저장합니다. 운영 기간이 길어질수록 날짜 아카이브와 인물별 누적 화제도가 쌓입니다.</div>`;
  let idx=[];try{idx=await (await fetch('data/archive/index.json?'+Date.now())).json()}catch(e){}
  const show=async d=>{document.querySelectorAll('#days button').forEach(b=>b.classList.toggle('on',b.dataset.d===d));
    const a=CACHE[d]||(CACHE[d]=await (await fetch(`data/archive/${d}.json`)).json());
    $('#al').innerHTML=a.issues.map(i=>`<a class="card mini" href="${esc(i.url)}" target="_blank" rel="noopener"><div class="n">${i.rank}</div><div class="th" ${bg(i.image)}></div><div><span class="cat ${i.category}">${i.category}</span><h3>${esc(i.title)}</h3><div class="m">${esc(i.press)} · 언론사 ${i.presses}곳 · ${(i.keywords||[]).slice(0,3).map(k=>'#'+esc(k)).join(' ')}</div></div></a>`).join('')};
  $('#days').innerHTML=idx.map(d=>{const t=new Date(d);return`<button data-d="${d}"><span>${t.getFullYear()}.${t.getMonth()+1}</span><b>${t.getDate()}</b><span>${'일월화수목금토'[t.getDay()]}</span></button>`}).join('');
  $('#days').onclick=ev=>{const b=ev.target.closest('button');if(b)show(b.dataset.d)};if(idx[0])show(idx[0]);
}
load().catch(e=>app.innerHTML=`<div class="loading">데이터를 불러오지 못했어요 (${esc(e.message)})</div>`);
