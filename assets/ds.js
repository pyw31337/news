/* NewsBoard 디자인 시스템 v1 — 이슈 상세 화면 블록들. 규칙: docs/design-system.md · 스타일: assets/ds.css */
(function(){
const PN=n=>(((typeof PL!=='undefined'?PL:{})._n)||{})[n]||n;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I=(n,pair)=>window.NBI?NBI(n,pair,'ds-i'):'';
const day=d=>{const t=new Date(String(d).length<=10?d+'T12:00:00+09:00':d);return isNaN(t)?null:t};
const md=t=>`${t.getMonth()+1}.${String(t.getDate()).padStart(2,'0')}`;
const ymd=t=>`${t.getFullYear()}.${String(t.getMonth()+1).padStart(2,'0')}.${String(t.getDate()).padStart(2,'0')}`;
const dago=t=>{const d=Math.round((Date.now()-t)/864e5);return d<=0?'오늘':d===1?'어제':d<31?d+'일 전':d<365?Math.round(d/30)+'개월 전':Math.round(d/365)+'년 전'};

/* 강조 하이라이트: 핵심어는 굵게+색, 숫자·비율은 크게, 따옴표 인용은 세리프 */
function emph(text,terms){let s=E(text);
  const T=[...new Set((terms||[]).filter(x=>x&&x.length>1))].sort((a,b)=>b.length-a.length).slice(0,14);
  s=s.replace(/(&quot;|“|‘)([^“”‘’&]{2,60}?)(&quot;|”|’)/g,'<q class="ds-say">$2</q>');
  s=s.replace(/(\d[\d,.]*\s?(%|퍼센트|명|건|억|조|만|원|개|곳|배|위|일|년|시간))/g,'<strong class="ds-num">$1</strong>');
  T.forEach(t=>{const r=new RegExp('(^|[^가-힣A-Za-z>])('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?![^<]*>)','g');s=s.replace(r,'$1<mark class="ds-key">$2</mark>')});
  return s}
function sents(t){return String(t||'').split(/(?<=[.!?다요])\s+(?=\S)/).map(x=>x.trim()).filter(x=>x.length>4)}
/* 문단 → 첫 문장은 리드(크고 굵게), 나머지는 핵심어 강조 */
function rich(text,terms,cls=''){const S=sents(text);if(!S.length)return'';return`<div class="ds-rich ${cls}"><p class="ds-lead">${emph(S[0],terms)}</p>${S.slice(1).map(x=>`<p>${emph(x,terms)}</p>`).join('')}</div>`}

/* 언론사 원형 로고 (캡슐 안 원) */
function logo(name,url,size){const f=(typeof PL!=='undefined'?PL:{})[name];const h=(()=>{try{return new URL(url).hostname.replace(/^www\./,'')}catch(e){return''}})();const g=f||(typeof PL!=='undefined'?PL:{})[h];
  const ch=E(String(name||'?').replace(/^(주간|월간|일간)/,'')[0]||'?');
  /* 원형 배지용으로 가공한 로고(scripts/press_badges.py: 테두리 제거·로고 바탕색으로 원 채움)가 있으면 그것을 */
  const bd=g&&((typeof PL!=='undefined'?PL:{})._b||{})[g];
  return g?`<span class="ds-logo ${size||''}${bd?' b':''}"><img src="assets/press/${bd||g}" alt="" loading="lazy"></span>`:`<span class="ds-logo ${size||''} t" style="--h:${[...String(name)].reduce((a,c)=>a+c.charCodeAt(0),0)%360}">${ch}</span>`}

/* 보도 언론사: 로고 썸네일 격자 → 누르면 그 언론사의 기사 제목 펼침 */
function press(i){const m=new Map();(i.sources||[]).forEach(s=>{const k=s.press||'';if(!k)return;(m.get(k)||m.set(k,[]).get(k)).push(s)});
  const L=[...m.entries()].sort((a,b)=>b[1].length-a[1].length);if(!L.length)return'';
  return`<section id="press" class="anc ds-sec">${window.sec?sec('보도 언론사','Who covered it',`<span class="more">${L.length}곳</span>`,'press'):''}
  <div class="ds-pgrid" role="list">${L.map(([n,a],k)=>`<button class="ds-pt" data-k="${k}" aria-expanded="false" role="listitem" aria-label="${E(PN(n))} ${a.length}건" data-tip="${E(PN(n))}${a.length>1?' · '+a.length+'건':''}">${logo(n,a[0].url,'lg')}${a.length>1?`<span class="ds-cnt">${a.length}</span>`:''}</button>`).join('')}</div>
  <div class="ds-ppanel" hidden></div>
  <template class="ds-pdata">${L.map(([n,a],k)=>`<div data-k="${k}"><div class="ds-phd">${logo(n,a[0].url)}<b>${E(PN(n))}</b><span>${a.length}건 보도</span></div><ul>${a.map(s=>`<li><a href="${E(s.url)}" target="_blank" rel="noopener">${E(s.title)}${I('arrow-up-right')}</a></li>`).join('')}</ul></div>`).join('')}</template></section>`}
function bindPress(root){const g=root.querySelector('.ds-pgrid');if(!g)return;const p=root.querySelector('.ds-ppanel'),tp=root.querySelector('.ds-pdata');
  g.onclick=e=>{const b=e.target.closest('.ds-pt');if(!b)return;const on=b.getAttribute('aria-expanded')==='true';g.querySelectorAll('.ds-pt').forEach(x=>x.setAttribute('aria-expanded','false'));
    if(on){p.hidden=true;return}b.setAttribute('aria-expanded','true');p.innerHTML=tp.content.querySelector(`[data-k="${b.dataset.k}"]`).outerHTML;p.hidden=false;p.classList.remove('in');void p.offsetWidth;p.classList.add('in')}}

/* 같은 내용 기사 묶기: 괄호·기호를 뺀 제목의 두 글자 조각이 60% 이상 겹치면 같은 기사로 봄(통신사 기사를 여러 매체가 그대로 실은 경우 등) */
const normT=t=>String(t||'').replace(/\[[^\]]*\]|\([^)]*\)|【[^】]*】|<[^>]*>/g,'').replace(/[^가-힣A-Za-z0-9]/g,'');
const bi=t=>{const n=normT(t),o=new Set();for(let k=0;k<n.length-1;k++)o.add(n.slice(k,k+2));return o};
const sim=(a,b)=>{let c=0;a.forEach(x=>{if(b.has(x))c++});return c/Math.max(1,Math.min(a.size,b.size))};
function dedupe(S){const G=[];S.forEach(s=>{const b=bi(s.title);const g=G.find(g=>sim(g.b,b)>=.6);if(g)g.more.push(s);else G.push({s,b,more:[]})});return G}
window.NBDedupe=dedupe;
/* 관련 기사: 배경 없는 한 줄(왼쪽 제목, 오른쪽 언론사 로고), 같은 내용은 한 줄로 묶고 '외 N곳' */
function related(i){const S=i.sources||[],G=dedupe(S);
  const row=g=>{const s=g.s,ps=[s,...g.more];return`<li><a href="${E(s.url)}" target="_blank" rel="noopener"><span class="ds-rt">${E(s.title)}${s.bias?`<span class="ds-warn">${s.bias.lean==='left'?'좌편향 주의':'우편향 주의'}</span>`:''}</span><span class="ds-rm">${ps.slice(0,3).map(x=>`<span data-tip="${E(PN(x.press||''))}">${logo(x.press,x.url,'sm')}</span>`).join('')}${g.more.length?`<em>외 ${g.more.length}곳</em>`:`<em>${E(PN(s.press||''))}</em>`}</span></a></li>`};
  return`<section id="related" class="anc ds-sec">${window.sec?sec('관련 기사','Related articles',`<span class="more">${S.length}건${G.length<S.length?` · 같은 내용 묶어 ${G.length}개`:''}</span>`,'news'):''}
  <ul class="ds-rel">${G.slice(0,6).map(row).join('')}</ul>${G.length>6?`<details class="ds-more"><summary><span>나머지 ${G.length-6}개 더 보기</span>${I('chevron-down')}</summary><ul class="ds-rel">${G.slice(6).map(row).join('')}</ul></details>`:''}
  ${S.some(s=>s.bias)?'<p class="fine">편향 표시는 기사 제목의 표현만 보고 자동으로 판단한 참고 정보예요. 틀릴 수 있어요.</p>':''}</section>`}

/* 과거와 연결된 사건: 건별 한 줄 연관 설명 */
function why(p,i){const sh=(p.shared||[]).slice(0,3);const t=day(p.date);const ents=(typeof D!=='undefined'&&D&&D.entities)||[];
  const ty=n=>(ents.find(e=>e.name===n)||{}).type;const pe=sh.filter(n=>ty(n)==='person'),ot=sh.filter(n=>ty(n)!=='person');
  const w=t?dago(t):'예전';
  if(pe.length&&ot.length)return`<b>${E(pe[0])}</b>이(가) <b>${E(ot[0])}</b> 문제로 ${w}에도 크게 다뤄졌던 일 — 이번 사건의 앞선 장면이에요.`;
  if(pe.length)return`<b>${E(pe.join('·'))}</b>이(가) 같은 중심에 섰던 ${w}의 사건이에요.`;
  if(sh.length>=2)return`<b>${E(sh[0])}</b>·<b>${E(sh[1])}</b>가 함께 등장한 ${w}의 사건 — 같은 흐름의 연장선이에요.`;
  if(sh.length)return`<b>${E(sh[0])}</b>를 둘러싸고 ${w}에 먼저 불거진 일이에요.`;
  return`비슷한 주제로 ${w}에 화제가 됐던 사건이에요.`}
function past(i){const P=i.past||[];if(!P.length)return'';
  /* 과거와 연결된 사건: 날짜(연도·월일) | 제목·연관 설명·공통 키워드 — 한 줄씩, 박스 없이 */
  return`<section class="ds-sec">${window.sec?sec('과거와 연결된 사건','Linked from archive','','history'):''}<div class="ds-past">${P.map(p=>{const t=day(p.date);return`<a class="ds-pc" href="${E(p.url)}" target="_blank" rel="noopener"><span class="ds-pd">${t?`<small>${t.getFullYear()}</small><b>${md(t)}</b><em>${dago(t)}</em>`:''}</span><div class="ds-pb"><h4>${E(p.title)}</h4><p class="ds-why">${why(p,i)}</p><span class="ds-pk">${(p.shared||[]).map(n=>`<span>#${E(n)}</span>`).join('')}${p.rank?`<span class="r">그날 ${p.rank}위</span>`:''}</span></div>${I('arrow-up-right')}</a>`}).join('')}</div></section>`}

/* 이 사건의 흐름: 기간 필터 + 살아 움직이는 노드 타임라인 */
function flow(i){const F=(i.flow||[]).map(f=>({...f,t:day(f.date)})).filter(f=>f.t);const P=(i.past||[]).map(p=>({...p,t:day(p.date)})).filter(p=>p.t);
  if(!F.length)return`<section id="s-flow" class="ds-sec">${window.sec?sec('이 사건의 흐름','Issue flow','','clock'):''}<div class="note">흐름 데이터가 없어요.</div></section>`;
  window.__dsFlow={F,P,terms:[...(i.entities||[]),...(i.keywords||[])]};
  return`<section id="s-flow" class="ds-sec">${window.sec?sec('이 사건의 흐름','Issue flow','','clock'):''}
  <div class="ds-seg" role="tablist" aria-label="기간">${[['1m','1개월'],['6m','6개월'],['1y','1년'],['all','전체']].map(([v,l],k)=>`<button role="tab" data-r="${v}" aria-selected="${k===3}">${l}</button>`).join('')}</div>
  <div class="ds-river"><svg class="ds-rsv" preserveAspectRatio="none"></svg><div class="ds-nodes"></div></div>
  <div class="ds-fsum"></div><div class="ds-flist"></div></section>`}
function bindFlow(root){const sv=root.querySelector('.ds-rsv'),box=root.querySelector('.ds-river'),nd=root.querySelector('.ds-nodes'),ls=root.querySelector('.ds-flist'),sm=root.querySelector('.ds-fsum'),sg=root.querySelector('.ds-seg');if(!sv||!window.__dsFlow)return;
  const {F,P,terms}=window.__dsFlow;const now=Date.now();const RG={'1m':31,'6m':183,'1y':366,all:1e5};let cur='all',sel=0;
  const th=(u)=>u?`<span class="ds-fth" style="background-image:url('${E(u)}')"></span>`:'';
  /* 날짜별 한 줄 요약(접힘) → 펼치면 매체별 헤드라인(같은 내용은 한 줄로), 누르면 새 창 */
  function card(f,k){const G=dedupe(f.items),sum=f.meaning?sents(f.meaning)[0]||f.meaning:(G[0]?.s.title||'');
    return`<details class="ds-fg ${k===sel?'on':''}" data-k="${k}"${k===sel?' open':''}><summary><span class="ds-dot"></span><span class="ds-fd"><b>${md(f.t)}</b><small>${dago(f.t)}</small></span><span class="ds-fs">${emph(sum,terms)}</span><span class="ds-fn">${f.items.length}건</span>${I('chevron-down')}</summary>
    <ul>${G.map(g=>`<li><a href="${E(g.s.url)}" target="_blank" rel="noopener"><span>${E(g.s.title)}</span><small>${[g.s,...g.more].slice(0,3).map(x=>`<span data-tip="${E(PN(x.press||''))}">${logo(x.press,x.url,'sm')}</span>`).join('')}${g.more.length?`외 ${g.more.length}곳`:E(g.s.press||'')}</small></a></li>`).join('')}</ul></details>`}
  function draw(){const lim=now-RG[cur]*864e5;const f=F.filter(x=>+x.t>=lim),p=P.filter(x=>+x.t>=lim);
    const all=[...f.map((x,k)=>({x,k,kind:'f'})),...p.map(x=>({x,kind:'p'}))].sort((a,b)=>a.x.t-b.x.t);
    const W=box.clientWidth||320,H=box.clientHeight||170,pad=44;
    const n0=all.length,gap=(W-2*pad)/Math.max(1,n0-1);const mx=Math.max(1,...f.map(x=>x.items.length));
    all.forEach((a,j)=>{a.cx=n0===1?W/2:pad+gap*j;a.r=a.kind==='p'?6:7+8*Math.sqrt(a.x.items.length/mx);a.cy=a.kind==='p'?H*.64:H*.36+Math.sin(j*1.3)*H*.13});
    const ff=all.filter(a=>a.kind==='f');let path='';ff.forEach((a,j)=>{if(!j){path=`M${a.cx},${a.cy}`;return}const b=ff[j-1],m=(a.cx+b.cx)/2;path+=` C${m},${b.cy} ${m},${a.cy} ${a.cx},${a.cy}`});
    const links=all.filter(a=>a.kind==='p').map(a=>{const n=ff.reduce((q,b)=>Math.abs(b.cx-a.cx)<Math.abs(q.cx-a.cx)?b:q,ff[0]||a);return`<path class="ds-lk" d="M${a.cx},${a.cy} Q${(a.cx+n.cx)/2},${a.cy+24} ${n.cx},${n.cy}"/>`}).join('');
    const yrs=[];all.forEach((a,j)=>{const y=a.x.t.getFullYear();if(!j||all[j-1].x.t.getFullYear()!==y)yrs.push([a.cx,y])});
    const tk=yrs;const step='y';const sx=x=>x;
    sv.setAttribute('viewBox',`0 0 ${W} ${H}`);
    sv.innerHTML=`<defs><linearGradient id="dsg" x1="0" x2="1"><stop offset="0" stop-color="var(--ds-brand-2)" stop-opacity=".25"/><stop offset="1" stop-color="var(--ds-brand)"/></linearGradient></defs>
      <line class="ds-ax" x1="${pad}" x2="${W-pad}" y1="${H-26}" y2="${H-26}"/>${yrs.map(([x,y])=>`<g class="ds-tk"><text x="${Math.max(pad,x)}" y="${H-10}">${y}</text></g>`).join('')}
      ${links}<path class="ds-line" d="${path}" stroke="url(#dsg)"/><path class="ds-flowd" d="${path}"/>`;
    const pl=sv.querySelector('.ds-line');if(pl&&pl.getTotalLength){const L=pl.getTotalLength();pl.style.strokeDasharray=L;pl.style.strokeDashoffset=L;requestAnimationFrame(()=>{pl.style.transition='stroke-dashoffset 1s cubic-bezier(.3,.7,.2,1)';pl.style.strokeDashoffset=0})}
    nd.innerHTML=all.map((a,j)=>a.kind==='f'?`<button class="ds-n ${a.k===sel?'on':''} ${a.k===0?'now':''}" data-k="${a.k}" style="--x:${a.cx}px;--y:${a.cy}px;--r:${a.r}px;--d:${j*60}ms" aria-label="${ymd(a.x.t)} ${a.x.items.length}건"><i>${a.x.items.length}</i><span>${md(a.x.t)}</span></button>`
      :`<a class="ds-n past" href="${E(a.x.url)}" target="_blank" rel="noopener" style="--x:${a.cx}px;--y:${a.cy}px;--r:${a.r}px;--d:${j*60}ms" title="${E(a.x.title)}"><i></i><span>${md(a.x.t)}</span></a>`).join('');
    const n=f.reduce((s,x)=>s+x.items.length,0),first=f.length?f[f.length-1].t:null;
    sm.innerHTML=f.length?`<span><b class="ds-num">${f.length}</b>번의 고비</span><span><b class="ds-num">${n}</b>건 보도</span>${first?`<span><b class="ds-num">${Math.max(1,Math.round((now-first)/864e5))}</b>일째 이어지는 이야기</span>`:''}${p.length?`<span class="past"><b class="ds-num">${p.length}</b>개 과거 사건과 연결</span>`:''}`:'<span>이 기간에는 새 흐름이 없어요. 기간을 넓혀 보세요.</span>';
    if(!f.some(x=>F.indexOf(x)===sel))sel=f.length?F.indexOf(f[0]):-1;
    ls.innerHTML=f.map(x=>card(x,F.indexOf(x))).join('');
    nd.querySelectorAll('.ds-n').forEach(b=>b.classList.toggle('on',+b.dataset.k===sel&&!b.classList.contains('past')))}
  sg.onclick=e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.r;sg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected',x===b));draw()};
  nd.onclick=e=>{const b=e.target.closest('button.ds-n');if(!b)return;sel=+b.dataset.k;nd.querySelectorAll('.ds-n').forEach(x=>x.classList.toggle('on',x===b));ls.querySelectorAll('.ds-fg').forEach(x=>x.classList.toggle('on',+x.dataset.k===sel));const c=ls.querySelector(`.ds-fg[data-k="${sel}"]`);if(c){c.open=true;c.scrollIntoView({behavior:'smooth',block:'nearest'})}};
  draw();let rt;new ResizeObserver(()=>{clearTimeout(rt);rt=setTimeout(draw,150)}).observe(box);
  hist();
  /* 수십 년 기록(history 브랜치) 이어붙이기: 이슈 인물·반복 이슈의 과거 기사 → 과거 노드 + 연도별 목록 */
  async function hist(){try{const HB='https://raw.githubusercontent.com/pyw31337/news/history/h/';
    const IX=window.__nbHX||(window.__nbHX=await fetch(HB+'index.json').then(r=>r.json()));
    const tt=(terms||[]).map(String).filter(x=>x.length>=2),blob=tt.join(' ');
    const hit=Object.entries(IX).filter(([id,v])=>v.c&&(v.k==='p'?tt.includes(v.n)||(v.al||[]).some(a=>tt.includes(a)):(blob.includes(v.n)||tt.some(t=>t.length>=2&&v.n.includes(t)&&t.length>=v.n.length*.75)))).slice(0,4);
    if(!hit.length)return;
    const gz=async u=>{const r=await fetch(HB+u);return JSON.parse(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text())};
    const docs=await Promise.all(hit.map(([id,v])=>gz(`${v.k}/${id}.json.gz`).then(d=>[id,v,d]).catch(()=>null)));
    const gs=t=>'https://news.google.com/search?q='+encodeURIComponent('"'+t.slice(0,60)+'"')+'&hl=ko&gl=KR&ceid=KR:ko';
    const cut=Date.now()-14*864e5,out=[];
    docs.filter(Boolean).forEach(([id,v,d])=>{const by={};d.it.forEach(r=>{const t=new Date(r[0]+'T00:00:00+09:00');if(+t>cut)return;
      const sc=(r[3]&&r[3]!=='보도'?2:0)+tt.filter(w=>r[1].includes(w)).length*3;(by[r[0].slice(0,4)]=by[r[0].slice(0,4)]||[]).push({sc,r,t})});
      Object.values(by).forEach(L=>L.sort((a,b)=>b.sc-a.sc).slice(0,2).forEach(x=>out.push({title:x.r[1],url:gs(x.r[1]),date:x.r[0],t:x.t,press:d.o[x.r[2]],who:v.n,c:x.r[3],hist:1,href:`history/?t=${v.k}&id=${id}`})))});
    if(!out.length)return;out.sort((a,b)=>a.t-b.t);
    const step=Math.max(1,Math.ceil(out.length/24));out.filter((x,j)=>j%step===0).forEach(x=>P.push(x));draw();
    const yrs={};out.forEach(x=>(yrs[x.date.slice(0,4)]=yrs[x.date.slice(0,4)]||[]).push(x));const Y=Object.keys(yrs).sort().reverse();
    const el=document.createElement('div');el.className='ds-hist';
    el.innerHTML=`<h4>${I('history')}수년 전부터 이어진 기록 <small>${Y.at(-1)}년부터 ${out.length}건 · ${hit.map(h=>`<a href="${hit.length&&h[1].k==='p'?`history/?t=p&id=${h[0]}`:`history/?t=i&id=${h[0]}`}">${E(h[1].n)}</a>`).join(' · ')}</small></h4>
      <ol>${Y.map(y=>`<li><b>${y}</b><div>${yrs[y].slice(0,3).map(x=>`<a href="${E(x.url)}" target="_blank" rel="noopener"><span class="ds-who">${E(x.who)}</span><span class="ds-ht">${E(x.title)}</span><small>${E(x.press||'')} · ${x.date.slice(5).replace('-','.')}</small></a>`).join('')}</div></li>`).join('')}</ol>`;
    (box.closest('.ds-sec')||root).appendChild(el)}catch(e){}}
}

/* 댓글·민심: 지표 상자 + 도넛 + 성별 픽토그램 + 연령 막대 + 워드 클라우드 */
function donut(st,col){let a=-90;const R=42,C=2*Math.PI*R;let off=0;
  return`<svg class="ds-donut" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${R}" class="bg"/>${st.map((s,k)=>{const L=C*s.share/100,el=`<circle cx="50" cy="50" r="${R}" stroke="${col[k%col.length]}" stroke-dasharray="${L} ${C-L}" stroke-dashoffset="${-off}" style="--d:${k*150}ms"/>`;off+=L;return el}).join('')}<text x="50" y="47">${st[0].share}<tspan>%</tspan></text><text x="50" y="62" class="s">가장 많은 입장</text></svg>`}
function opinion(i){const op=i.opinion,aop=(i.ai||{}).opinion||{};if(!op)return'<div class="note">이 이슈는 댓글을 모을 수 있는 기사가 없어요.</div>';
  const terms=[...(i.entities||[]),...(op.words||[]).slice(0,6).map(w=>w[0])];
  const col=['#ff4d2e','#2f6bff','#11a683','#f0a000'],st=aop.stances||[];const lr=Math.round(100*op.like/((op.like+op.dislike)||1));
  const ages=Object.entries(op.ages||{}),amx=Math.max(1,...ages.map(a=>a[1])),ag=ages.reduce((q,a)=>a[1]>q[1]?a:q,['',0]);
  const g=op.gender;const ppl=(n,c)=>Array.from({length:10},(_,k)=>`<i class="${k<n?c:''}">${I('user')}</i>`).join('');
  const W=op.words||[],wm=(W[0]||[0,1])[1];
  return`<div class="ds-op">
   <div class="ds-kpi"><div class="big"><span class="lab">${I('message-2')}모인 댓글</span><b>${op.total.toLocaleString()}</b><small>기사 ${op.articles}개에서</small></div>
    <div class="ld"><span class="lab">공감 vs 비공감</span><div class="ds-vs" aria-label="공감 ${lr}% 비공감 ${100-lr}%"><div class="l" style="flex:${Math.max(lr,8)}"><b>${lr}%</b></div><div class="r" style="flex:${Math.max(100-lr,8)}"><b>${100-lr}%</b></div></div><div class="ds-ldn"><span class="up">${I('thumb-up')}공감 <b>${op.like.toLocaleString()}</b></span><span class="dn">비공감 <b>${op.dislike.toLocaleString()}</b>${I('thumb-down')}</span></div><small>상위 댓글 공감 비율 <b>${lr}%</b></small></div></div>
   ${aop.summary?`<div class="ds-aisum">${rich(aop.summary,terms)}</div>`:''}
   ${st.length?`<h5 class="ds-h5">입장 분포 <small>공감 많은 댓글 기준</small></h5><div class="ds-stance">${donut(st,col)}<ul>${st.map((s,k)=>`<li style="--c:${col[k%4]}"><div class="h"><b>${E(s.label)}</b><em>${s.share}%</em></div><div class="bar"><i style="width:${s.share}%"></i></div><p>${E(s.desc)}</p></li>`).join('')}</ul></div>`:''}
   ${g||ages.length?`<div class="ds-demo">${g?`<div class="ds-gen"><h5 class="ds-h5">성별</h5><div class="row m"><span class="lb">남성</span><span class="pg">${ppl(Math.round(g.male/10),'m')}</span><b>${g.male}%</b></div><div class="row f"><span class="lb">여성</span><span class="pg">${ppl(Math.round(g.female/10),'f')}</span><b>${g.female}%</b></div></div>`:''}
    ${ages.length?`<div class="ds-age"><h5 class="ds-h5">연령대 <small>${ag[0]}대가 가장 많아요</small></h5><div class="cols">${ages.map(([a,v])=>`<div class="${a===ag[0]?'max':''}"><em>${v}%</em><i style="--h:${Math.max(3,v/amx*100)}%"></i><span>${a}${a==='70'?'+':''}</span></div>`).join('')}</div></div>`:''}</div>`:''}
   ${W.length?`<h5 class="ds-h5">많이 나온 말</h5><div class="ds-cloud">${W.slice(0,16).map(([w,v],k)=>{const r=Math.min(1,v/wm);return`<span class="t${k<3?k+1:r>.4?4:5}" style="--s:${(.82+r*1.1).toFixed(2)}rem">${k<3?`<small>${k+1}</small>`:''}${E(w)}</span>`}).join('')}</div>`:''}
   ${(op.top||[]).length?`<h5 class="ds-h5">공감 많은 댓글</h5><div class="ds-cmts">${op.top.slice(0,5).map(c=>`<a href="${E(c.src)}" target="_blank" rel="noopener"><q class="ds-say">${E(c.text)}</q><span class="ds-cm">${I('thumb-up')}${c.like} <span class="dn">${I('thumb-down')}${c.dislike}</span></span></a>`).join('')}</div>`:''}
   <p class="fine">네이버 뉴스에서 공감을 많이 받은 댓글을 모아 본 것으로, 전체 여론을 대표하지는 않아요.</p></div>`}

/* 깊게 보기: 문장을 단계 카드로 + 핵심 숫자 */
function deep(i){const ai=i.ai||{},terms=[...(i.entities||[]),...(i.keywords||[])];const S=ai.deep?sents(ai.deep):(i.leads||[]).slice(0,4);
  const F=(i.flow||[]).map(f=>day(f.date)).filter(Boolean);const span=F.length?Math.max(1,Math.round((Date.now()-Math.min(...F))/864e5)):0;
  const lab=['배경','전개','쟁점','파장','앞으로','더 보기'];
  return`<section id="s-deep" class="ds-sec">${window.sec?sec('깊게 보기','Deep dive','','book'):''}
   <div class="ds-facts"><div><b>${i.mentions||0}</b><span>관련 기사</span></div><div><b>${i.presses||0}</b><span>언론사</span></div><div><b>${span||'–'}</b><span>일째 이어짐</span></div><div><b>${i.opinion?i.opinion.total.toLocaleString():'–'}</b><span>댓글</span></div></div>
   ${(i.entities||[]).length?`<div class="ds-who">${i.entities.slice(0,6).map(n=>`<span class="ds-tag k">${E(n)}</span>`).join('')}</div>`:''}
   <ol class="ds-steps">${S.map((s,k)=>`<li><span class="no">${k+1}</span><div><em>${lab[Math.min(k,5)]}</em><p>${emph(s,terms)}</p></div></li>`).join('')}</ol>
   </section>`}

window.DS={emph,rich,logo,press,related,past,flow,opinion,deep,bind(root){bindPress(root);bindFlow(root)}};
})();
