/* NewsBoard v2 section pages share the canonical Lets family primitives. */
document.querySelectorAll('.main-nav').forEach(nav=>{if(nav.querySelectorAll('a').length<5){nav.innerHTML='<a href="../">오늘</a><a href="../live/">흐름</a><a href="../persons/">인물</a><a href="../market/">마켓</a><a href="../archive/">아카이브</a>'}});
(() => { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '../title.css?v=1'; document.head.appendChild(link); })();
(() => { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '../gutters.css?v=2'; document.head.appendChild(link); })();
(() => { const main = document.querySelector('main.page'); if (main) { main.style.setProperty('padding-left', 'clamp(20px,4.4vw,64px)', 'important'); main.style.setProperty('padding-right', 'clamp(20px,4.4vw,64px)', 'important'); } })();
(() => {
  const cssHref = 'https://pyw31337.github.io/lets/css/lets-design-system.css?v=1.1.0';
  if (!document.querySelector(`link[href^="${cssHref.split('?')[0]}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    document.head.appendChild(link);
  }
  const scriptSrc = 'https://pyw31337.github.io/lets/js/lets-design-system.js?v=1.1.0';
  const ready = window.LDS ? Promise.resolve(window.LDS) : new Promise(resolve => {
    const script = document.createElement('script');
    script.src = scriptSrc;
    script.defer = true;
    script.onload = () => resolve(window.LDS);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  ready.then(lds => {
    lds?.init?.();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('../sw.js').catch(() => {});
  });
})();

(() => {
  const $ = (s,r=document) => r.querySelector(s), esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day = s => { if(!s)return ''; const d=new Date(s); return Number.isNaN(d.getTime())?String(s).slice(0,10).replaceAll('-','.'):d.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replaceAll(' ',''); };
  const root='../../', dataRoot=location.protocol==='file:'?'https://pyw31337.github.io/news/data/':'../../data/';
  let DATA=null, MODE='';
  const img = (u, section, press) => { if (u) return ` style="background-image:url('${esc(u)}')"`; const label = String(section || 'NEWS').slice(0,8); const source = String(press || 'NewsBoard').slice(0,10); const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="#e9edf7"/><path d="M0 160L92 92l54 42 54-66 120 92v40H0z" fill="#c8d4f2"/><circle cx="244" cy="54" r="24" fill="#fff" opacity=".75"/><text x="20" y="34" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#2450e0">${label}</text><text x="20" y="181" font-family="Arial,sans-serif" font-size="11" fill="#3d424c">${source}</text></svg>`; return ` style="background-image:url('data:image/svg+xml,${encodeURIComponent(svg)}')"`; };
  const link = x => x.url || x.ourl || '#';
  function header(){document.querySelectorAll('[data-region]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-region]').forEach(x=>x.classList.toggle('is-on',x===b));if(DATA){const d=b.dataset.region==='kr'?DATA.kr:DATA.global;MODE==='live'?live(d):reports(d);}}));}
  function live(D){
    const sections=Object.entries(D.sections||{}).filter(([k])=>k!=='주요');
    $('#app').innerHTML=`<div class="title"><div><div class="eyebrow">LIVE NEWS</div><h1>라이브</h1></div><p>지금 각 분야에서 가장 빠르게 움직이는 주요 기사입니다. 분야별 10건씩 제공합니다.</p></div><div class="filters"><button class="is-on" data-filter="all">전체</button>${sections.map(([k])=>`<button data-filter="${esc(k)}">${esc(k)}</button>`).join('')}</div>${sections.map(([name,list])=>`<section class="sector" data-sector="${esc(name)}"><div class="sector-head"><h2>${esc(name)}</h2><small>상위 ${Math.min(10,list.length)}건 · ${esc(day(D.updated||D.date))}</small></div><div class="article-grid">${(list||[]).slice(0,10).map(x=>`<a class="article" href="${esc(link(x))}" target="_blank" rel="noopener"><span class="thumb"${img(x.img||x.image,name,x.press)}></span><span><b>${esc(x.title)}</b><small>${esc(x.press||'')} · ${esc(day(x.time||x.t))}</small></span></a>`).join('')}</div></section>`).join('')}`;
    document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('is-on',x===b)); const f=b.dataset.filter; document.querySelectorAll('[data-sector]').forEach(s=>s.hidden=f!=='all'&&s.dataset.sector!==f);}));
  }
  function months(a,b){if(!a||!b)return 0;const x=new Date(a),y=new Date(b);return Math.max(0,(y.getFullYear()-x.getFullYear())*12+y.getMonth()-x.getMonth());}
  function reports(D){
    const themes=(D.issues||[]).map(i=>{const flow=(i.flow||[]).filter(x=>x.date&&x.items?.length).sort((a,b)=>String(a.date).localeCompare(String(b.date)));const first=flow[0]?.date||i.first,last=flow.at(-1)?.date||D.date;return {...i,flow,first,last,span:months(first,last)}}).filter(i=>i.flow.length>=2).sort((a,b)=>b.span-a.span||b.flow.length-a.flow.length);
    $('#app').innerHTML=`<div class="title"><div><div class="eyebrow">LONG-RUN REPORTS</div><h1>보도</h1></div><p>단발성 기사보다, 정책·사건·논쟁이 시간에 따라 이어지는 주제를 흐름으로 보여줍니다.</p></div><div class="filters"><button class="is-on" data-min="0">전체</button><button data-min="6">6개월 이상</button><button data-min="12">1년 이상</button><button data-min="36">3년 이상</button></div><div class="report-themes">${themes.slice(0,24).map(i=>`<article class="theme" data-span="${i.span}"><div class="theme-head"><h2>${esc(i.title)}</h2><span class="period">${esc(day(i.first))}–${esc(day(i.last))}</span></div><p>${esc((i.lead||i.summary?.[0]||'시간순으로 이어지는 보도와 쟁점을 묶어 보여드립니다.').slice(0,180))}</p><div class="theme-flow">${i.flow.slice(-4).map(x=>{const it=x.items?.[0]||{};return `<a class="theme-step" href="${esc(link(it))}" target="_blank" rel="noopener"><i></i><b>${esc(day(x.date))}</b><small>${esc((it.title||'관련 보도').slice(0,42))}</small></a>`}).join('')}</div><a class="more" href="${root}issue/${esc(i.id)}">전체 흐름과 원문 보기 →</a></article>`).join('')}</div>`;
    document.querySelectorAll('[data-min]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-min]').forEach(x=>x.classList.toggle('is-on',x===b));const n=Number(b.dataset.min);document.querySelectorAll('.theme').forEach(x=>x.hidden=Number(x.dataset.span)<n);}));
  }
  header();
  Promise.all([fetch(`${dataRoot}today.json`,{cache:'no-cache'}).then(r=>r.json()),fetch(`${dataRoot}global.json`,{cache:'no-cache'}).then(r=>r.json()).catch(()=>({}))]).then(([D,G])=>{DATA={kr:D,global:G};MODE=location.pathname.includes('/live/')?'live':'reports';MODE==='live'?live(D):reports(D);}).catch(()=>{$('#app').innerHTML='<div class="empty">데이터를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</div>';});
})();
