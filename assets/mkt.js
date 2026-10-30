/* 마켓 항목 상세 + 주식 사이트식 차트(2026-10-30)
   구성은 네이버 증권·토스증권을 참고: 가격·등락 → 기간별 차트(축·눈금·십자선) → 기간 수익률 → 시세(시가·고가·저가·52주) →
   투자자별 매매·상승/하락 종목·시총 상위(국내 지수) / 현찰·송금 환율·계산기(환율) → 쉬운 설명·오르면/내리면 → 관련 뉴스 → 다른 지표
   데이터: today.json market(카드), data/market_detail.json(scripts/market_detail.py), 없으면 한국은행 ecos_series.json */
(function(){
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I=n=>typeof NBI==='function'?NBI(n):'';
const UP='#f04452',DN='#3182f6';   // 오르면 빨강, 내리면 파랑(국내 증권 화면 관례)
const num=v=>v==null||v===''?null:+String(v).replace(/[^\d.\-]/g,'');
const fx=(v,dp)=>v==null||isNaN(v)?'-':v.toLocaleString('ko-KR',{minimumFractionDigits:dp,maximumFractionDigits:dp});
const dpOf=v=>Math.abs(v)>=1000?2:Math.abs(v)>=10?2:3;
/* ---------- 차트 ---------- */
function ticks(mn,mx,n){const r=(mx-mn)||Math.abs(mx)*.02||1,raw=r/n,p=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,2.5,5,10].map(k=>k*p).find(k=>k>=raw);
  const a=Math.floor(mn/st)*st,out=[];for(let v=a;v<=mx+st*.001;v+=st)if(v>=mn-st*.001)out.push(+v.toFixed(8));return{t:out,st}}
function chart(el,P,o={}){if(!el)return;if(!P||P.length<2){el.innerHTML='<p class="note">차트 자료를 모으는 중이에요.</p>';return}
  el.classList.add('xch');const H=o.h||260,dp=o.dp??dpOf(P[P.length-1].v);
  const draw=()=>{const W=Math.max(280,el.clientWidth),L=8,R=64,T=14,B=26,iw=W-L-R,ih=H-T-B;
    const vs=P.map(p=>p.v),hi=P.map(p=>p.h??p.v),lo=P.map(p=>p.l??p.v);let mn=Math.min(...lo),mx=Math.max(...hi);const pad=(mx-mn)*.08||mx*.01;mn-=pad;mx+=pad;
    const tk=ticks(mn,mx,5),X=i=>L+i/(P.length-1)*iw,Y=v=>T+(1-(v-mn)/(mx-mn))*ih;
    const first=vs[0],lastV=vs[vs.length-1],col=lastV>=first?UP:DN,id='g'+Math.random().toString(36).slice(2,7);
    const span=(new Date(P[P.length-1].d)-new Date(P[0].d))/864e5,lab=d=>span>200?d.slice(2,7).replace('-','.'):d.slice(5).replace('-','.');
    const xs=[];const nx=W<420?3:5;for(let k=0;k<nx;k++)xs.push(Math.round(k*(P.length-1)/(nx-1)));
    const path=P.map((p,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
    el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${E(o.name||'')} 가격 차트">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
      <g class="gy">${tk.t.map(v=>`<line x1="${L}" x2="${L+iw}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text x="${W-R+8}" y="${(Y(v)+4).toFixed(1)}">${fx(v,tk.st<1?dp:0)}</text>`).join('')}</g>
      <g class="gx">${xs.map(i=>`<line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="${T}" y2="${T+ih}"/><text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="${i===0?'start':i===P.length-1?'end':'middle'}">${lab(P[i].d)}</text>`).join('')}</g>
      <line class="base" x1="${L}" x2="${L+iw}" y1="${Y(first).toFixed(1)}" y2="${Y(first).toFixed(1)}"/>
      <path d="${path}L${X(P.length-1).toFixed(1)},${T+ih}L${L},${T+ih}Z" fill="url(#${id})"/>
      <path d="${path}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>
      <g class="last"><rect x="${W-R+2}" y="${(Y(lastV)-10).toFixed(1)}" width="${R-4}" height="20" rx="4" fill="${col}"/><text x="${W-R+6}" y="${(Y(lastV)+4).toFixed(1)}">${fx(lastV,dp)}</text></g>
      <g class="cross" visibility="hidden"><line class="cx" y1="${T}" y2="${T+ih}"/><line class="cy" x1="${L}" x2="${L+iw}"/><circle r="4.5" fill="${col}" stroke="#fff" stroke-width="2"/>
        <rect class="cyl" x="${W-R+2}" width="${R-4}" height="20" rx="4"/><text class="cyt" x="${W-R+6}"></text></g>
      <rect class="hit" x="${L}" y="${T}" width="${iw}" height="${ih}" fill="transparent"/></svg><div class="xtip" hidden></div>`;
    const svg=el.querySelector('svg'),cr=svg.querySelector('.cross'),tip=el.querySelector('.xtip');
    const show=ev=>{const r=svg.getBoundingClientRect(),x=(ev.clientX-r.left)*W/r.width,i=Math.max(0,Math.min(P.length-1,Math.round((x-L)/iw*(P.length-1)))),p=P[i],cx=X(i),cy=Y(p.v);
      cr.setAttribute('visibility','visible');cr.querySelector('.cx').setAttribute('x1',cx);cr.querySelector('.cx').setAttribute('x2',cx);cr.querySelector('.cy').setAttribute('y1',cy);cr.querySelector('.cy').setAttribute('y2',cy);
      const c=cr.querySelector('circle');c.setAttribute('cx',cx);c.setAttribute('cy',cy);cr.querySelector('.cyl').setAttribute('y',cy-10);const yt=cr.querySelector('.cyt');yt.setAttribute('y',cy+4);yt.textContent=fx(p.v,dp);
      const ch=(p.v/first-1)*100;tip.hidden=false;tip.innerHTML=`<b>${E(p.d.replace(/-/g,'.'))}</b><span>${o.unit?'':'종가 '}<em>${fx(p.v,dp)}</em>${E(o.unit||'')}</span>${p.o!=null?`<small>시 ${fx(p.o,dp)} · 고 ${fx(p.h,dp)} · 저 ${fx(p.l,dp)}</small>`:''}<small class="${ch>=0?'up':'dn'}">기간 시작 대비 ${ch>=0?'+':''}${ch.toFixed(2)}%</small>`;
      const px=cx/W*r.width;tip.style.left=Math.min(r.width-tip.offsetWidth-6,Math.max(6,px+(px>r.width/2?-tip.offsetWidth-14:14)))+'px'};
    const hide=()=>{cr.setAttribute('visibility','hidden');tip.hidden=true};
    const hit=svg.querySelector('.hit');hit.addEventListener('pointermove',show);hit.addEventListener('pointerdown',show);hit.addEventListener('pointerleave',hide);hit.addEventListener('pointercancel',hide)};
  draw();if(el._ro)el._ro.disconnect();let w0=el.clientWidth;el._ro=new ResizeObserver(()=>{if(Math.abs(el.clientWidth-w0)>4){w0=el.clientWidth;draw()}});el._ro.observe(el)}
window.NBChart=chart;
/* ---------- 항목 설명 ---------- */
const INFO={
 'KOSPI':{kind:'국내 주가 지수',q:'코스피|유가증권',es:'kospi',d:'우리나라 대표 기업(유가증권시장)의 주가를 모은 지수예요. 국내 경기와 외국인 투자 흐름을 가장 먼저 보여줘요.',up:'기업 가치가 오르고 투자 심리가 좋아졌다는 신호',dn:'경기 걱정이나 외국인 매도가 커졌다는 신호'},
 'KOSDAQ':{kind:'국내 주가 지수',q:'코스닥',es:'kosdaq',d:'중소·벤처·기술 기업 중심 시장의 지수예요. 바이오·2차전지 같은 성장주의 분위기를 보여줘요.',up:'성장 기업에 돈이 몰리는 중',dn:'위험을 피하려는 심리가 커지는 중'},
 'S&P 500':{kind:'미국 주가 지수',q:'S&P|뉴욕증시|미 증시|미국 증시|월가',d:'미국 대형주 500개로 만든 지수예요. 세계 증시의 기준점이라 다음 날 우리 증시에도 영향을 줘요.',up:'세계 경기 기대가 커짐 → 다음 날 코스피에도 긍정적',dn:'세계 경기 걱정 → 다음 날 국내 증시에 부담'},
 'NASDAQ':{kind:'미국 주가 지수',q:'나스닥|기술주|뉴욕증시',d:'미국 기술주 중심 지수예요. 반도체·AI 기업 흐름이 우리 IT 대형주와 함께 움직이는 경우가 많아요.',up:'반도체·AI 기업에 대한 기대가 큼',dn:'기술주 거품 우려나 금리 부담'},
 '미국 USD':{kind:'환율',q:'환율|달러|원·달러|원/달러|외환',es:'usd',cur:'USD',per:1,d:'1달러를 사는 데 드는 원화예요.',up:'원화 가치 하락 → 수입 물가·해외여행 비용↑, 수출 기업엔 유리',dn:'원화 가치 상승 → 수입 물가↓, 해외 직구·여행 유리'},
 '일본 JPY(100)':{kind:'환율',q:'엔화|엔저|원·엔|엔/원',es:'jpy',cur:'JPY',per:100,d:'100엔을 사는 데 드는 원화예요.',up:'일본 여행 비용↑, 일본과 경쟁하는 수출 기업엔 유리',dn:'엔저 → 일본 여행·직구 유리, 국내 수출 기업엔 부담'},
 '유럽 EUR':{kind:'환율',q:'유로|유럽중앙은행|ECB',es:'eur',cur:'EUR',per:1,d:'1유로를 사는 데 드는 원화예요. 유럽 경기와 유럽중앙은행 금리에 따라 움직여요.',up:'유럽 여행·수입품 비용↑',dn:'유럽 여행·수입품 비용↓'},
 '중국 CNY':{kind:'환율',q:'위안|중국 경기|인민은행',es:'cny',cur:'CNY',per:1,d:'1위안을 사는 데 드는 원화예요. 최대 교역국인 중국 경기와 함께 움직여요.',up:'중국산 수입품 비용↑',dn:'중국 경기 둔화 우려와 함께 나타나는 경우가 많음'},
 '금':{kind:'원자재',q:'금값|금 시세|금 가격|안전자산',d:'대표 안전자산이에요. 세상이 불안하거나 금리가 내려갈 때 오르는 경향이 있어요.',up:'불안 심리·달러 약세',dn:'위험 자산 선호·금리 상승'},
 '은':{kind:'원자재',q:'은값|은 시세',d:'귀금속이면서 태양광·전자 산업 재료라 경기에 따라 금보다 크게 움직여요.',up:'산업 수요 기대',dn:'경기 둔화 우려'},
 '구리':{kind:'원자재',q:'구리|원자재|비철금속',d:'전선·건설·전기차에 두루 쓰여 \'경기를 미리 알려주는 금속\'으로 불려요.',up:'세계 경기 회복 기대',dn:'세계 경기 둔화 신호'},
 'WTI 원유':{kind:'원자재',q:'유가|원유|국제유가|기름값|휘발유',d:'미국 텍사스산 원유 가격이에요. 오르면 휘발유값·항공료·물가가 따라 올라요.',up:'기름값·물가 상승 압력',dn:'물가 부담 완화'},
 '미국 10년물 금리':{kind:'금리',q:'미 국채|국채 금리|국채|금리',d:'미국 정부가 10년 동안 돈을 빌릴 때의 금리예요. 전 세계 대출·주택 금리의 기준이 돼요.',up:'대출 이자 부담↑, 주식(특히 기술주)엔 부담',dn:'이자 부담↓, 주식시장엔 긍정적'},
 '비트코인':{kind:'가상자산',q:'비트코인|가상자산|암호화폐|코인',d:'대표 가상자산이에요. 하루에도 크게 오르내려 투자 위험이 커요.',up:'위험 자산 선호·기관 자금 유입',dn:'규제·위험 회피 심리'}};
let MD=null,ES=null;
const loadMD=()=>MD||(MD=fetch('data/market_detail.json?'+Math.floor(Date.now()/6e5)).then(r=>r.ok?r.json():null).catch(()=>null));
const loadES=()=>ES||(ES=fetch('data/ecos_series.json').then(r=>r.ok?r.json():null).catch(()=>null));
const up_=m=>m.dir==='RISING'?'up':m.dir==='FALLING'?'down':'';
const pct=(a,b)=>a&&b?(b/a-1)*100:null;
/* ---------- 화면 ---------- */
window.nbMkt=async function(m){const app=document.getElementById('app'),inf=INFO[m.name]||{kind:'',q:m.name,d:''},d=up_(m);
  const sign=d==='down'?'-':d==='up'?'+':'',rate=String(m.rate??'').replace(/^[-+]/,''),diff=String(m.diff??'').replace(/^[-+]/,'');
  if(typeof setMeta==='function')setMeta(m.name+' 시세와 흐름',`${m.name} 지금 ${m.price} (${sign}${rate}%) — 기간별 차트, 기간 수익률, 관련 뉴스`);
  const others=(D.market||[]).filter(x=>x.name!==m.name);
  const kw=new RegExp(inf.q.replace(/[.*+?^${}()[\]\\]/g,'\\$&'));
  const news=[...D.issues.map(i=>({title:i.title,url:'issue/'+i.id,press:i.press,in:1})),...Object.values(D.sections||{}).flat()].filter(x=>kw.test(x.title)).filter((x,i,A)=>A.findIndex(y=>y.title===x.title)===i).slice(0,8);
  app.innerHTML=`<div class="mkd ${d}">
   <p class="mkback"><a href="market">${I('arrow-left')}마켓 전체</a></p>
   <header class="mkd-h"><small>${E(inf.kind)}</small><h2>${E(m.name)}${m.unit?` <i>${E(m.unit)}</i>`:''}</h2>
    <div class="mkd-p"><b>${E(m.price)}</b><em>${d==='up'?I('caret-up-f'):d==='down'?I('caret-down-f'):''}${E(diff)} (${sign}${E(rate)}%)</em></div>
    <p class="mkd-at">${m.at?E(String(m.at).replace('T',' ').slice(0,16))+' 기준':''}${typeof ago==='function'&&m.at?' · '+ago(m.at):''}</p></header>
   <section class="mkd-card"><div class="mkd-tabs" role="tablist"></div><div class="mkd-ch"></div><p class="mkd-src fine"></p></section>
   <section class="mkd-card mkd-ret" hidden><h3>기간 수익률</h3><div class="mkd-rg"></div></section>
   <section class="mkd-card mkd-quote" hidden><h3>시세</h3><div class="mkd-qg"></div><div class="mkd-52" hidden></div></section>
   <div class="mkd-ex"></div>
   <section class="mkd-card mkd-learn"><h3>${I('bulb')}이게 뭐예요?</h3><p>${E(inf.d||m.name+' 시세예요.')}</p>${inf.up?`<div class="mkd-ud"><div class="u"><b>${I('caret-up-f')}오르면</b><span>${E(inf.up)}</span></div><div class="dn"><b>${I('caret-down-f')}내리면</b><span>${E(inf.dn)}</span></div></div>`:''}</section>
   <section class="mkd-card"><h3>${I('news')}관련 뉴스 <small>오늘 수집한 기사</small></h3>${news.length?`<ul class="mkd-news">${news.map(x=>`<li><a href="${E(x.url)}"${x.in?'':' target="_blank" rel="noopener"'}><b>${E(x.title)}</b><small>${E(x.press||'')}</small></a></li>`).join('')}</ul>`:'<p class="note">오늘 수집한 기사 중 관련 뉴스가 아직 없어요.</p>'}</section>
   <section class="mkd-card"><h3>다른 지표</h3><div class="mkd-oth">${others.map(x=>{const dd=up_(x);return`<a class="${dd}" href="market/${encodeURIComponent(x.name)}"><span>${E(x.name)}</span><b>${E(x.price)}</b><em>${dd==='down'?'-':dd==='up'?'+':''}${E(String(x.rate??'').replace(/^[-+]/,''))}%</em></a>`}).join('')}</div></section>
   <p class="fine">시세는 네이버 증권·야후 파이낸스·한국은행 자료이며 지연될 수 있어요. 투자 권유가 아닙니다.</p></div>`;
  const [md,es]=await Promise.all([loadMD(),inf.es?loadES():null]);if(!app.querySelector('.mkd'))return;
  const it=(md&&md.items&&md.items[m.name])||{};
  /* 기간별 자료: 최근 60일(시·고·저 포함) + 장기 2년(야후) → 없으면 한국은행 → 없으면 카드의 20일 */
  const day=it.day&&it.day.c&&it.day.c.length>1?it.day.d.map((x,i)=>({d:x,v:it.day.c[i],o:it.day.o?.[i],h:it.day.h?.[i],l:it.day.l?.[i]})).filter(p=>p.v!=null):[];
  let long=it.long&&it.long.c?.length>20?it.long.d.map((x,i)=>({d:x,v:it.long.c[i]})):[],src=long.length?'야후 파이낸스(일별 종가)':'';
  const sr=es&&es.series&&es.series[inf.es];if(!long.length&&sr?.data?.length){long=sr.data.map(([x,v])=>({d:x.length===7?x+'-01':x,v}));src='한국은행 경제통계'}
  if(!day.length&&!long.length&&m.series?.length>1){const n=m.series.length;long=m.series.map((v,i)=>{const t=new Date(Date.now()-(n-1-i)*864e5);return{d:t.toISOString().slice(0,10),v}})}
  const P=[['1개월',22,'day'],['3개월',63,'day'],['6개월',126,'long'],['1년',252,'long'],['2년',600,'long']].filter(p=>(p[2]==='day'?(day.length>=Math.min(p[1],20)||long.length>=p[1]*.6):long.length>=p[1]*.6));
  let cur=P.findIndex(p=>p[0]==='3개월');if(cur<0)cur=0;
  const pick=k=>{const p=P[k];if(!p)return day.length?day:long;const base=p[2]==='day'&&day.length>=Math.min(p[1],20)?day:long;return base.slice(-p[1])};
  const tabs=app.querySelector('.mkd-tabs'),ch=app.querySelector('.mkd-ch');
  const draw=()=>{tabs.innerHTML=P.map((p,k)=>`<button type="button" role="tab" aria-selected="${k===cur}" class="${k===cur?'on':''}" data-k="${k}">${p[0]}</button>`).join('');
    const L=pick(cur);chart(ch,L,{name:m.name,unit:m.kind==='commodity'?'':''});
    app.querySelector('.mkd-src').textContent=L.length?`${L[0].d.replace(/-/g,'.')} ~ ${L[L.length-1].d.replace(/-/g,'.')} · ${L===day||L[0]?.o!=null?'네이버 증권(일별)':src} · 그래프 위를 움직이면 날짜별 값이 보여요`:''};
  tabs.onclick=e=>{const b=e.target.closest('[data-k]');if(b){cur=+b.dataset.k;draw()}};draw();
  /* 기간 수익률 */
  const all=long.length?long:day,lastV=num(m.price)||all[all.length-1]?.v;
  const R=[['1주',5],['1개월',22],['3개월',63],['6개월',126],['1년',252]].map(([n,k])=>[n,all.length>k?pct(all[all.length-1-k].v,lastV):null]).filter(x=>x[1]!=null);
  if(R.length){const b=app.querySelector('.mkd-ret');b.hidden=false;b.querySelector('.mkd-rg').innerHTML=R.map(([n,v])=>`<div class="${v>=0?'up':'dn'}"><small>${n}</small><b>${v>=0?'+':''}${v.toFixed(2)}%</b></div>`).join('')}
  /* 시세 + 52주 범위 */
  const info=it.info||[];const yr=all.slice(-252);
  const h52=num((info.find(x=>/52주 최고/.test(x[0]))||[])[1])??(yr.length>100?Math.max(...yr.map(p=>p.v)):null),l52=num((info.find(x=>/52주 최저/.test(x[0]))||[])[1])??(yr.length>100?Math.min(...yr.map(p=>p.v)):null);
  const q=info.filter(x=>!/52주/.test(x[0]));
  if(q.length||h52){const b=app.querySelector('.mkd-quote');b.hidden=false;b.querySelector('.mkd-qg').innerHTML=q.map(([k,v])=>`<div><small>${E(k==='대금'?'거래대금':k)}</small><b>${E(v)}</b></div>`).join('');
    if(h52&&l52&&lastV){const w=b.querySelector('.mkd-52');w.hidden=false;const pos=Math.max(0,Math.min(100,(lastV-l52)/(h52-l52)*100));
      w.innerHTML=`<div class="r52h"><small>52주 최저</small><small>지금</small><small>52주 최고</small></div><div class="r52"><i style="left:${pos.toFixed(1)}%"></i></div><div class="r52h"><b>${fx(l52,dpOf(l52))}</b><b>${pos.toFixed(0)}% 위치</b><b>${fx(h52,dpOf(h52))}</b></div>`}}
  /* 항목별 추가 정보 */
  const ex=app.querySelector('.mkd-ex');let h='';
  if(it.deal){const D_=it.deal,ks=['개인','외국인','기관'],mx=Math.max(1,...ks.map(k=>Math.abs(D_[k]||0)));
    h+=`<section class="mkd-card"><h3>투자자별 매매 <small>${E(String(D_.date||'').replace(/(\d{4})(\d{2})(\d{2})/,'$2.$3'))} · 억 원 · 순매수(+)/순매도(-)</small></h3><div class="mkd-deal">${ks.map(k=>{const v=D_[k]||0;return`<div><span>${k}</span><div class="bar2"><i class="${v>=0?'up':'dn'}" style="width:${(Math.abs(v)/mx*50).toFixed(1)}%"></i></div><b class="${v>=0?'up':'dn'}">${v>=0?'+':''}${fx(v,0)}</b></div>`}).join('')}</div><p class="fine">외국인이 많이 팔면(순매도) 지수가 내려가는 경우가 많아요.</p></section>`}
  if(it.updown){const u=it.updown,t=Object.values(u).reduce((a,b)=>a+b,0)||1;
    h+=`<section class="mkd-card"><h3>오른 종목·내린 종목 <small>${t.toLocaleString()}개 중</small></h3><div class="mkd-ud2">${[['상한','uu'],['상승','u'],['보합','z'],['하락','d'],['하한','dd']].filter(([k])=>u[k]).map(([k,c])=>`<i class="${c}" style="flex:${u[k]}" title="${k} ${u[k]}"></i>`).join('')}</div><div class="mkd-udl"><span class="up">상승 ${(u['상승']||0)+(u['상한']||0)}</span><span>보합 ${u['보합']||0}</span><span class="dn">하락 ${(u['하락']||0)+(u['하한']||0)}</span></div></section>`}
  if(it.members?.length)h+=`<section class="mkd-card"><h3>시가총액 상위 종목</h3><ol class="mkd-mem">${it.members.map((s,k)=>`<li><a href="${E(s.url||'#')}" target="_blank" rel="noopener"><span class="k">${k+1}</span><b>${E(s.name)}</b><span class="pr">${E(s.price)}원</span><em class="${s.rate>=0?'up':'dn'}">${s.rate>=0?'+':''}${fx(s.rate,2)}%</em></a></li>`).join('')}</ol></section>`;
  if(inf.cur){const c=it.cash||{},rate_=num(m.price)/(inf.per||1);
    h+=`<section class="mkd-card"><h3>${I('coin')}환전·송금 할 때 <small>하나은행 고시 기준${inf.per>1?` · ${inf.per}${inf.cur}당`:''}</small></h3>${c.buy?`<div class="mkd-qg">${[['현찰 살 때',c.buy],['현찰 팔 때',c.sell],['송금 보낼 때',c.send],['송금 받을 때',c.receive]].map(([k,v])=>`<div><small>${k}</small><b>${E(v||'-')}원</b></div>`).join('')}</div>`:''}
     <div class="mkd-calc"><label><input type="number" inputmode="decimal" value="${inf.per>1?10000:100}" min="0" data-c="f"><span>${inf.cur}</span></label><span class="eq">=</span><label><input type="number" inputmode="decimal" data-c="k"><span>원</span></label></div><p class="fine">매매기준율로 계산한 값이에요. 실제 환전 금액은 수수료에 따라 달라요.</p></section>`;
    ex.innerHTML=h;const f=ex.querySelector('[data-c=f]'),k=ex.querySelector('[data-c=k]');const sf=()=>{k.value=Math.round((+f.value||0)*rate_)},sk=()=>{f.value=((+k.value||0)/rate_).toFixed(2)};f.oninput=sf;k.oninput=sk;sf()}
  else ex.innerHTML=h};
})();
