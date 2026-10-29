/* NewsBoard 기록 보관소: 인물 블랙박스 · 이슈 연표 · 연도별 사건 (데이터: history 브랜치 정적 파일) */
(function(){
const B='https://raw.githubusercontent.com/pyw31337/news/history/h/';
const $=s=>document.querySelector(s),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I=(n,p)=>window.NBI?NBI(n,p):'';
const nf=n=>Number(n||0).toLocaleString('ko-KR');
const C={발언:['발언','message-2','#7a4dff'],논란:['논란·의혹','alert-triangle','#e2321b'],법적:['법적 판단','landmark','#0f1630'],수상:['수상','trophy','#d99a00'],활동:['활동','bolt','#2f6bff'],보도:['보도','news','#8189a3']};
const ORD=['발언','논란','법적','수상','활동','보도'];
async function gz(u){const r=await fetch(B+u);if(!r.ok)throw 0;const s=r.body.pipeThrough(new DecompressionStream('gzip'));return JSON.parse(await new Response(s).text())}
const js=u=>fetch(B+u).then(r=>r.ok?r.json():null).catch(()=>null);
const gsearch=t=>'https://news.google.com/search?q='+encodeURIComponent('"'+t.slice(0,60)+'"')+'&hl=ko&gl=KR&ceid=KR:ko';
let IX={},tab='p',cur=null;
const q=new URLSearchParams(location.search);
/* ---------- 공통: 연도 막대(누적) ---------- */
function yearBars(rows,y0,y1,keyOf,sel){ // rows: [[date,...]]
  const Y={};rows.forEach(r=>{const y=+r[0].slice(0,4),k=keyOf(r);(Y[y]=Y[y]||{})[k]=(Y[y][k]||0)+1});
  const ys=[];for(let y=y0;y<=y1;y++)ys.push(y);const mx=Math.max(1,...ys.map(y=>Object.values(Y[y]||{}).reduce((a,b)=>a+b,0)));
  const w=Math.max(320,Math.min(760,(document.getElementById('hxv').clientWidth||360))),h=150,bw=(w-8)/ys.length;
  let s='';ys.forEach((y,i)=>{let acc=0;ORD.concat(['']).forEach(k=>{const v=(Y[y]||{})[k]||0;if(!v)return;const hh=v/mx*(h-26);acc+=hh;
    s+=`<rect x="${(4+i*bw+1).toFixed(1)}" y="${(h-18-acc).toFixed(1)}" width="${Math.max(1,bw-2).toFixed(1)}" height="${hh.toFixed(1)}" rx="1.5" fill="${(C[k]||['','','#ff4d2e'])[2]}" opacity="${sel&&sel!==k?.18:.92}"><title>${y}년 ${(C[k]||[k||'기사'])[0]} ${v}건</title></rect>`});
    if(i%Math.ceil(ys.length/8)===0||i===ys.length-1)s+=`<text x="${(4+i*bw+bw/2).toFixed(1)}" y="${h-4}" text-anchor="middle">${String(y).slice(2)}</text>`});
  return`<svg class="hx-bars" viewBox="0 0 ${w} ${h}" role="img" aria-label="연도별 기록 수">${s}</svg>`}
/* ---------- 인물 블랙박스 ---------- */
function plist(f){const L=Object.entries(IX).filter(([k,v])=>v.k==='p'&&v.c>0&&(!f||v.n.includes(f)||v.occ.includes(f))).sort((a,b)=>b[1].c-a[1].c).slice(0,60);
  return L.length?L.map(([id,v])=>{const cc=v.cc||{},tot=v.c;return`<button class="hx-pc" data-p="${id}"><span class="av">${E(v.n.slice(0,1))}</span><span class="nm"><b>${E(v.n)}</b><small>${E(v.occ)} · ${v.y?v.y[0]+'–'+v.y[1]:''}</small></span><span class="mix">${ORD.map(k=>cc[k]?`<i style="--c:${C[k][2]};flex:${cc[k]}" title="${C[k][0]} ${cc[k]}"></i>`:'').join('')}</span><em>${nf(tot)}</em></button>`}).join(''):`<p class="hx-empty">아직 모으는 중이에요. 매시간 새 인물이 채워져요.</p>`}
function pView(){$('#hxv').innerHTML=`<div class="hx-search">${I('search')}<input id="hxq" placeholder="이름이나 직업으로 찾기 (예: 배우, 가수, 의원)" autocomplete="off"></div>
  <div class="hx-legend">${ORD.map(k=>`<span><i style="--c:${C[k][2]}"></i>${C[k][0]}</span>`).join('')}</div><div class="hx-plist" id="hxpl">${plist('')}</div>`;
  $('#hxq').oninput=e=>$('#hxpl').innerHTML=plist(e.target.value.trim())}
async function person(id){const v=IX[id];$('#hxv').innerHTML=`<div class="hx-load">불러오는 중…</div>`;let d;try{d=await gz(`p/${id}.json.gz`)}catch(e){$('#hxv').innerHTML='<p class="hx-empty">기록을 불러오지 못했어요.</p>';return}
  const it=d.it,cc={};it.forEach(r=>cc[r[3]]=(cc[r[3]]||0)+1);let sel='';const y0=+it[0][0].slice(0,4),y1=+it.at(-1)[0].slice(0,4);
  const quotes=it.filter(r=>r[4]).slice(-3).reverse();
  const draw=()=>{const L=it.filter(r=>!sel||r[3]===sel).slice().reverse();let html='',py='';
    L.slice(0,400).forEach(r=>{const y=r[0].slice(0,4),c=C[r[3]]||C.보도;if(y!==py){html+=`<li class="yr"><b>${y}</b><span>${L.filter(x=>x[0].startsWith(y)).length}건</span></li>`;py=y}
      html+=`<li class="ev c-${r[3]}" style="--c:${c[2]}"><span class="dot">${I(c[1])}</span><div class="bd"><div class="mt"><span class="ds-tag">${c[0]}</span><time>${r[0].slice(5).replace('-','.')}</time><span class="src">${E(d.o[r[2]])}</span></div>${r[4]?`<q class="ds-say">${E(r[4])}</q>`:''}<a href="${gsearch(r[1])}" target="_blank" rel="noopener">${E(r[1])}</a>${r[3]==='논란'?'<p class="warn">보도된 의혹·논란이에요. 사실로 확정된 내용이 아닐 수 있어요.</p>':''}</div></li>`});
    $('#hxtl').innerHTML=html+(L.length>400?`<li class="more">가장 최근 400건을 보여드려요</li>`:'');
    $('#hxbars').innerHTML=yearBars(it,y0,y1,r=>r[3],sel);document.querySelectorAll('#hxf button').forEach(b=>b.classList.toggle('on',b.dataset.c===sel))};
  $('#hxv').innerHTML=`<button class="hx-back" id="hxb">${I('chevron-left')}목록</button>
   <section class="hx-ph"><span class="av lg">${E(d.n.slice(0,1))}</span><div><small>${E(d.occ)}</small><h2>${E(d.n)}</h2><p><span class="ds-num">${y1-y0+1}년</span> 동안의 기록 <span class="ds-num">${nf(it.length)}건</span> · 언론사 ${nf(d.o.length)}곳</p></div></section>
   <div class="hx-kpi">${ORD.filter(k=>cc[k]).map(k=>`<div style="--c:${C[k][2]}">${I(C[k][1])}<b>${nf(cc[k])}</b><span>${C[k][0]}</span></div>`).join('')}</div>
   ${quotes.length?`<section class="hx-quotes"><h3>${I('message-2')}최근 남긴 말</h3>${quotes.map(r=>`<blockquote><q class="ds-say">${E(r[4])}</q><cite>${r[0].replace(/-/g,'.')} · ${E(d.o[r[2]])}</cite></blockquote>`).join('')}</section>`:''}
   <section class="hx-card"><h3>${I('chart-bar')}해마다 남은 기록</h3><div id="hxbars"></div></section>
   <nav class="hx-filter" id="hxf"><button data-c="" class="on">전체</button>${ORD.filter(k=>cc[k]).map(k=>`<button data-c="${k}">${C[k][0]}</button>`).join('')}</nav>
   <ol class="hx-tl" id="hxtl"></ol><p class="hx-fine">제목·날짜·언론사만 모은 기록이에요. 제목을 누르면 원문 기사를 찾아볼 수 있어요. 의혹·논란은 보도 시점의 내용이에요.</p>`;
  $('#hxb').onclick=()=>{history.pushState(0,'','history/');route()};$('#hxf').onclick=e=>{const b=e.target.closest('button');if(b){sel=b.dataset.c;draw()}};draw();scrollTo(0,0)}
/* ---------- 이슈 연표: 기간 필터 + 노드 연결 ---------- */
function iView(){const L=Object.entries(IX).filter(([k,v])=>v.k==='i'&&v.c).sort((a,b)=>b[1].c-a[1].c);
  $('#hxv').innerHTML=`<div class="hx-chips">${L.map(([id,v])=>`<button data-i="${id}"><b>${E(v.n)}</b><small>${v.y?v.y[0]+'–'+v.y[1]:''} · ${nf(v.c)}건</small></button>`).join('')||'<p class="hx-empty">아직 모으는 중이에요.</p>'}</div>`}
async function issue(id){const v=IX[id];$('#hxv').innerHTML=`<div class="hx-load">불러오는 중…</div>`;const d=await gz(`i/${id}.json.gz`).catch(()=>null);if(!d)return;
  const it=d.it;let per='all';
  const draw=()=>{const now=new Date(),cut={'1m':1,'6m':6,'1y':12,'5y':60,'all':9999}[per];const lim=new Date(now.getFullYear(),now.getMonth()-cut,now.getDate()).toISOString().slice(0,10);
    const L=it.filter(r=>r[0]>=lim);const byM={};L.forEach(r=>{const k=per==='all'||per==='5y'?r[0].slice(0,4):r[0].slice(0,7);(byM[k]=byM[k]||[]).push(r)});
    const keys=Object.keys(byM).sort(),mx=Math.max(1,...keys.map(k=>byM[k].length));
    // 노드: 기간 묶음마다 하나, 크기 = 기사량, 가장 많이 보도된 날의 대표 제목
    $('#hxnodes').innerHTML=`<svg class="hx-spine" preserveAspectRatio="none" viewBox="0 0 10 100"><path d="M5 0V100" pathLength="1"/></svg>`+keys.slice().reverse().map((k,i)=>{const g=byM[k],dd={};g.forEach(r=>dd[r[0]]=(dd[r[0]]||0)+1);const top=Object.entries(dd).sort((a,b)=>b[1]-a[1])[0][0];const rep=g.filter(r=>r[0]===top).slice(0,2);const s=10+g.length/mx*26;
      return`<li style="--d:${i*60}ms;--s:${s.toFixed(0)}px"><span class="nd"><i></i></span><div class="bd"><div class="mt"><b>${k.replace('-','.')}</b><span class="ds-num">${nf(g.length)}건</span><span class="bar"><i style="width:${(g.length/mx*100).toFixed(0)}%"></i></span></div>${rep.map(r=>`<a href="${gsearch(r[1])}" target="_blank" rel="noopener"><time>${r[0].slice(5).replace('-','.')}</time>${E(r[1])}<small>${E(d.o[r[2]])}</small></a>`).join('')}</div></li>`}).join('');
    document.querySelectorAll('#hxper button').forEach(b=>b.classList.toggle('on',b.dataset.p===per));const ys=+it[0][0].slice(0,4);$('#hxibars').innerHTML=yearBars(it,ys,new Date().getFullYear(),()=>'',null)};
  $('#hxv').innerHTML=`<button class="hx-back" id="hxb">${I('chevron-left')}이슈 목록</button><section class="hx-ph"><span class="av lg">${I('timeline-event')}</span><div><small>반복되는 이슈</small><h2>${E(d.n)}</h2><p><span class="ds-num">${it[0][0].slice(0,4)}년</span>부터 기사 <span class="ds-num">${nf(it.length)}건</span>의 흐름</p></div></section>
   <section class="hx-card"><h3>${I('chart-bar')}해마다 얼마나 보도됐나</h3><div id="hxibars"></div></section>
   <nav class="hx-filter" id="hxper">${[['1m','1개월'],['6m','6개월'],['1y','1년'],['5y','5년'],['all','전체']].map(([k,t])=>`<button data-p="${k}">${t}</button>`).join('')}</nav><ol class="hx-nodes" id="hxnodes"></ol>`;
  $('#hxb').onclick=()=>{history.pushState(0,'','history/?t=i');route()};$('#hxper').onclick=e=>{const b=e.target.closest('button');if(b){per=b.dataset.p;draw()}};draw();scrollTo(0,0)}
/* ---------- 연도별 사건(1948~) ---------- */
let YI=null;async function yView(sel){$('#hxv').innerHTML=`<div class="hx-load">불러오는 중…</div>`;const y1=new Date().getFullYear();
  if(!YI){const ys=[];for(let y=1948;y<=y1;y++)ys.push(y);YI={};await Promise.all(ys.map(y=>js(`y/${y}.json`).then(d=>{if(d)YI[y]=d})))}
  const ks=Object.keys(YI).map(Number).sort();sel=sel||ks.at(-2);const mx=Math.max(1,...ks.map(y=>YI[y].ev.filter(e=>e.kr).length));
  const dec={};ks.forEach(y=>(dec[Math.floor(y/10)*10]=dec[Math.floor(y/10)*10]||[]).push(y));
  const d=YI[sel],kr=d?d.ev.filter(e=>e.kr):[];
  $('#hxv').innerHTML=`<section class="hx-card"><h3>${I('calendar-search')}해마다 기록된 우리나라 사건</h3><div class="hx-heat">${Object.keys(dec).map(k=>`<div class="row"><b>${k}년대</b><div>${Array.from({length:10},(_,i)=>{const y=+k+i,n=YI[y]?YI[y].ev.filter(e=>e.kr).length:0;return`<button data-y="${y}" class="${y===sel?'on':''}" style="--a:${(n/mx).toFixed(2)}" title="${y}년 ${n}건" ${YI[y]?'':'disabled'}>${String(y).slice(2)}</button>`}).join('')}</div></div>`).join('')}</div></section>
   <section class="hx-ph sm"><div><small>${sel}년</small><h2>${sel}년 대한민국</h2><p>우리나라 관련 <span class="ds-num">${kr.length}건</span> · 세계 ${d?d.ev.length-kr.length:0}건</p></div></section>
   <ol class="hx-nodes yr">${kr.map((e,i)=>`<li style="--d:${Math.min(i,20)*40}ms;--s:12px"><span class="nd"><i></i></span><div class="bd"><div class="mt"><b>${e.d.slice(5).replace('-','.')}</b></div><p>${E(e.t)}</p></div></li>`).join('')}</ol>
   <p class="hx-fine">출처: 한국어 위키백과 ‘${sel}년’ 문서 (CC BY-SA 4.0)</p>`;
  document.querySelector('.hx-heat').onclick=e=>{const b=e.target.closest('[data-y]');if(b)yView(+b.dataset.y)}}
/* ---------- 라우팅 ---------- */
function route(){const p=new URLSearchParams(location.search);tab=p.get('t')||'p';document.querySelectorAll('#hxt button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
  if(p.get('id')&&tab==='p')return person(p.get('id'));if(p.get('id')&&tab==='i')return issue(p.get('id'));tab==='i'?iView():tab==='y'?yView(+p.get('y')||0):pView()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-p],[data-i],#hxt button');if(!b)return;
  if(b.dataset.t){history.pushState(0,'','history/?t='+b.dataset.t);return route()}
  if(b.dataset.p&&b.classList.contains('hx-pc')){history.pushState(0,'','history/?t=p&id='+b.dataset.p);return route()}
  if(b.dataset.i){history.pushState(0,'','history/?t=i&id='+b.dataset.i);return route()}});
addEventListener('popstate',route);
js('index.json').then(j=>{IX=j||{};const P=Object.values(IX).filter(v=>v.k==='p'&&v.c),Is=Object.values(IX).filter(v=>v.k==='i'&&v.c);const tot=Object.values(IX).reduce((a,v)=>a+v.c,0);
  $('#hxs').innerHTML=`<div><b>${nf(P.length)}</b><span>기록된 인물</span></div><div><b>${nf(Is.length)}</b><span>이슈 연표</span></div><div><b>${nf(tot)}</b><span>모은 기록</span></div><div><b>1948</b><span>부터 연도별 사건</span></div>`;route()});
})();
