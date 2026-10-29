// 시안용 예시 범위(개월). 기본영역 근사치. 양형위원회 원문 대조 전 사용 금지.
const GUIDE={'사기':[6,18],'횡령·배임':[24,60],'뇌물':[24,48],'살인':[120,192],'폭력':[4,12],'교통(음주·사망)':[12,36],'마약':[18,42],'절도':[6,18],'공무집행방해':[6,18],'성범죄':[24,60]};
const fmt=m=>m>=12?(Math.floor(m/12)+'년'+(m%12?' '+m%12+'개월':'')):m+'개월';
fetch('rulings.json').then(r=>r.json()).then(({rulings:R})=>{
  const judges=[...new Set(R.filter(r=>r.judge).map(r=>r.judge))];
  const k=[['판결 보도',R.length],['판사 확인',R.filter(r=>r.judge).length],['징역형',R.filter(r=>r.sentenceMonths).length],['무죄',R.filter(r=>r.acquitted).length]];
  kpis.innerHTML=k.map(([a,b])=>`<div class="card kpi"><b>${b}</b><span>${a}</span></div>`).join('');
  const show=j=>{document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c.dataset.j===j));
    tl.innerHTML=R.filter(r=>r.judge===j).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(r=>`<div class="ev"><div class="d">${r.date||''} · ${r.court||'법원 미상'} ${r.dept||''}</div><div class="m">${r.acquitted?'무죄':r.fine?'벌금형':'징역 '+fmt(r.sentenceMonths)+(r.suspended?' (집행유예)':'')}${r.change?' · '+r.change:''}</div><span class="tag">${r.charge}</span><span class="tag">${r.instance}</span> <a href="${r.url}" target="_blank" rel="noopener" class="muted">보도 보기</a></div>`).join('')+'<p class="note">같은 범죄 유형 판결이 3건 미만이라 기준과 비교하지 않아요.</p>';};
  document.getElementById("judges").innerHTML=judges.map(j=>`<button class="chip" data-j="${j}">${j} 판사</button>`).join(''); document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>show(c.dataset.j)); if(judges[0])show(judges[0]);
  const MAX=240;const pct=m=>Math.min(100,m/MAX*100);
  chart.innerHTML=Object.entries(GUIDE).map(([c,[lo,hi]])=>{const xs=R.filter(r=>r.charge===c&&r.sentenceMonths);
    const dots=xs.map(r=>{const col=r.suspended?'#aab':r.sentenceMonths<lo?'var(--lo)':r.sentenceMonths>hi?'var(--hi)':'var(--in)';return `<span class="dot" title="${fmt(r.sentenceMonths)}${r.suspended?' 집유':''}" style="left:${pct(r.sentenceMonths)}%;background:${col}"></span>`}).join('');
    return `<div class="row"><b>${c}</b><div class="bar"><span class="band" style="left:${pct(lo)}%;width:${pct(hi)-pct(lo)}%;background:#dfe7ff"></span>${dots}</div><span class="muted">${xs.length}건</span></div>`}).join('')+'<div class="row"><span></span><div class="muted" style="display:flex;justify-content:space-between"><span>0</span><span>5년</span><span>10년</span><span>15년</span><span>20년</span></div><span></span></div>';
});
