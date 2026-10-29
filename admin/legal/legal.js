const fmt=m=>m>=12?(Math.floor(m/12)+'년'+(m%12?' '+m%12+'개월':'')):m+'개월';
const $=id=>document.getElementById(id);
fetch('rulings.json?v=3').then(r=>r.json()).then(({meta,guide,cases:R})=>{
  const k=[['사건 (보도 '+meta.articles.rulings+'건 묶음)',R.length],['재판장 확인',R.filter(r=>r.judge).length],['징역형',R.filter(r=>r.sentenceMonths).length],['무죄',R.filter(r=>r.acquitted).length]];
  $('kpis').innerHTML=k.map(([a,b])=>`<div class="card kpi"><b>${b}</b><span>${a}</span></div>`).join('');
  const cnt={};R.forEach(r=>r.judge&&(cnt[r.judge]=(cnt[r.judge]||0)+1));
  const judges=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
  const out=r=>r.acquitted?'무죄':r.fine?'벌금형':'징역 '+fmt(r.sentenceMonths)+(r.suspended?' (집행유예)':'');
  const show=j=>{document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c.dataset.j===j));
    const xs=R.filter(r=>r.judge===j).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    $('tl').innerHTML=xs.map(r=>`<div class="ev"><div class="d">${r.date||''} · ${r.court||'법원 미상'} ${r.dept||''}</div><div class="m">${out(r)}${r.change?' · '+r.change:''}</div><span class="tag">${r.charge}</span><span class="tag">${r.instance}</span>${r.guide?`<span class="tag">기준 ${r.guideType}: ${fmt(r.guide[0])}~${fmt(r.guide[1])}</span>`:''} <a href="${r.url}" target="_blank" rel="noopener" class="muted">보도 ${r.reports}건 중 1건 보기</a>${r.counsel.length?`<div class="muted">변호인: ${r.counsel.join(', ')}</div>`:''}</div>`).join('')+(xs.length<3?'<p class="note">판결이 3건 미만이라 기준과 비교하지 않아요.</p>':'');};
  $('judges').innerHTML=judges.map(j=>`<button class="chip" data-j="${j}">${j} <small>${cnt[j]}</small></button>`).join('');
  document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>show(c.dataset.j)); if(judges[0])show(judges[0]);
  const MAX=240,pct=m=>Math.min(100,m/MAX*100);
  const rows=[];Object.entries(guide).forEach(([c,g])=>Object.entries(g.types).forEach(([t,b])=>rows.push([c,t,b,g.src])));
  $('chart').innerHTML=rows.map(([c,t,[lo,hi],src])=>{const xs=R.filter(r=>r.charge===c&&r.guideType===t&&r.sentenceMonths);
    const dots=xs.map(r=>{const col=r.suspended?'#aab':r.sentenceMonths<lo?'var(--lo)':r.sentenceMonths>hi?'var(--hi)':'var(--in)';return `<span class="dot" title="${fmt(r.sentenceMonths)}${r.suspended?' 집유':''}${r.judge?' · '+r.judge:''}" style="left:${pct(r.sentenceMonths)}%;background:${col}"></span>`}).join('');
    return `<div class="row"><b>${c}<br><span class="muted" style="font-weight:500">${t}</span></b><div class="bar"><span class="band" style="left:${pct(lo)}%;width:${pct(hi)-pct(lo)}%;background:#dfe7ff"></span>${dots}</div><a class="muted" href="${src}" target="_blank" rel="noopener">${xs.length}건</a></div>`}).join('')+'<div class="row"><span></span><div class="muted" style="display:flex;justify-content:space-between"><span>0</span><span>5년</span><span>10년</span><span>15년</span><span>20년</span></div><span></span></div>';
});
