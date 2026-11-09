/* NewsBoard · 공공데이터포털 연동(맥미니 수집): 서울 아파트 실거래 추이, 주요 종목 시세, 지진·기상특보 신호 + 글로벌 이상기후 */
(function(){
const J=u=>fetch(u+'?'+Date.now()).then(r=>r.ok?r.json():null).catch(()=>null);
let APT=null,STK=null,AL=null,WX=null,GW=null,P=null;
const load=()=>P||(P=Promise.all([J('data/gov/apt.json'),J('data/gov/stocks.json'),J('data/gov/alerts.json'),J('data/gov/weather.json'),J('data/global_weather.json')]).then(([a,s,l,w,gw])=>{APT=a;STK=s;AL=l;WX=w;GW=gw}));
const e_=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Math.round(n).toLocaleString();
const eok=v=>v>=10000?(v/10000).toFixed(2).replace(/\.?0+$/,'')+'억':fmt(v)+'만';
const when=(t,style='compact')=>window.NBDate?.[style]?.(t)||String(t||'');
const areaOf=x=>{const a=x?.areas||x?.area||x?.region||x?.regions||'';return Array.isArray(a)?a.filter(Boolean).join(' · '):String(a||'').trim()};

/* 작은 SVG 선 차트(축·라벨 포함) */
window.__gch=window.__gch||{};let gchN=0;
function chart(pts,{h=260,col='#ff4d2e',fmtY=fmt,bars=null}={}){if(!pts||pts.length<2)return'';const id='g'+(++gchN);window.__gch[id]={pts,col,fmtY,bars,h};return`<div class="gch" data-gch="${id}" style="min-height:${h}px"></div>`}
function drawCharts(root){if(!window.NBChart)return;(root||document).querySelectorAll('[data-gch]:not([data-done])').forEach(el=>{const c=window.__gch[el.dataset.gch];if(!c)return;el.dataset.done=1;
  NBChart(el,c.pts.map((p,k)=>({d:String(p[0]),v:p[1],x:c.bars?c.bars[k]:null})),{raw:1,fmt:c.fmtY,bars:c.bars,col:c.col,h:c.h})})}
new MutationObserver(()=>drawCharts(document.getElementById('app'))).observe(document.documentElement,{childList:true,subtree:true});
const ym=k=>k.slice(2,4)+'.'+k.slice(4);

/* ---------- 서울 아파트 ---------- */
let GU='서울 전체';
function aptSeries(kind,gu){const M=(APT&&APT[kind])||{},ks=Object.keys(M).sort();const out=[],vol=[];
  for(const k of ks){const g=M[k];let n=0,v=0;
    if(gu==='서울 전체'){if(Object.keys(g).length<25)continue;for(const x of Object.values(g)){if(x[1]){n+=x[0];v+=x[0]*x[1]}}v=n?v/n:0}else if(g[gu]){n=g[gu][0];v=g[gu][1]}
    if(v)out.push([ym(k),v]),vol.push(n)}
  return{pts:out,vol}}
function aptHTML(){if(!APT||!APT.trade)return'';const t=aptSeries('trade',GU),r=aptSeries('rent',GU);if(t.pts.length<3)return'';
  const last=t.pts[t.pts.length-2]||t.pts[t.pts.length-1],yr=t.pts[t.pts.length-14],chg=yr?(last[1]/yr[1]-1)*100:null;
  const rl=r.pts[r.pts.length-2],ratio=rl&&last?rl[1]/last[1]*100:null;
  const gus=['서울 전체',...Object.keys(Object.values(APT.trade).pop()||{})];
  return`<section class="govapt">${sec('서울 아파트 실거래 흐름','Seoul apartment deals','<span class="more">국토교통부 실거래가</span>','apt')}
  <p class="lede sm">실제로 계약된 아파트 거래를 모아 <b>3.3㎡(1평)당 중간 가격</b>으로 보여줘요. 호가가 아니라 진짜 거래 가격이라 시장 분위기를 가장 정직하게 보여주는 숫자예요.</p>
  <div class="gsel"><select id="aptgu" aria-label="지역">${gus.map(g=>`<option${g===GU?' selected':''}>${e_(g)}</option>`).join('')}</select></div>
  <div class="gkpi"><div><small>매매 평당 중간값</small><b>${eok(last[1])}원</b><em>${e_(last[0])} 기준</em></div>${chg!=null?`<div class="${chg>0?'up':'down'}"><small>1년 전보다</small><b>${chg>0?'+':''}${chg.toFixed(1)}%</b><em>${chg>3?'오르는 중':chg<-3?'내리는 중':'제자리 수준'}</em></div>`:''}${ratio?`<div><small>전세가율</small><b>${ratio.toFixed(0)}%</b><em>매매가 대비 전세가</em></div>`:''}</div>
  <div class="card pad"><h4 class="gt">매매 · 평당 가격(선)과 거래량(막대)</h4>${chart(t.pts,{bars:t.vol,fmtY:eok})}
  ${r.pts.length>2?`<h4 class="gt">전세 · 평당 보증금</h4>${chart(r.pts,{col:'#2f6bff',fmtY:eok})}`:''}</div>
  <div class="gexp card pad"><b>${NBI('info-circle')}이렇게 읽어요</b><ul><li><b>거래량</b>이 먼저 늘고 가격이 따라 오르는 경우가 많아요. 거래가 줄면서 가격만 오르면 힘이 약한 상승일 수 있어요.</li><li><b>전세가율</b>이 높으면(70% 이상) 적은 돈으로 집을 사는 ‘갭투자’가 쉬워지고, 집값이 떨어질 때 전세금을 못 돌려받는 위험도 커져요.</li><li>최근 1~2달은 신고 기한(30일)이 남아 거래량이 적게 보여요. 추세는 그 전 달까지로 판단하세요.</li></ul></div>
  <p class="fine">출처: 국토교통부 아파트 매매·전월세 실거래가(공공데이터포털). 해제된 거래는 뺐고, 전세는 월세가 없는 계약만 셌어요.</p></section>`}

/* ---------- 주요 종목 ---------- */
function stockSeries(code){const D=(STK&&STK.days)||{};return Object.keys(D).sort().filter(d=>D[d][code]).map(d=>[d.slice(4,6)+'.'+d.slice(6),D[d][code][0]])}
function stocksHTML(){const D=(STK&&STK.days)||{},ds=Object.keys(D).sort();if(ds.length<2)return'';const last=D[ds[ds.length-1]];
  const top=Object.entries(last).sort((a,b)=>b[1][2]-a[1][2]).slice(0,12);
  return`<section class="govstk">${sec('시가총액 상위 종목','Top KRX stocks','<span class="more">'+(STK.src==='naver'?'네이버 금융':'금융위원회')+' 시세</span>','coin')}
  <p class="lede sm">시가총액(회사 전체 몸값)이 큰 순서예요. 큰 회사 주가는 지수 전체를 끌고 가서, 이 종목들의 흐름이 곧 ‘한국 증시의 날씨’예요.</p>
  <div class="stkg">${top.map(([c,v])=>{const s=stockSeries(c).map(x=>x[1]),n=(STK.names[c]||[c])[0];return`<a class="card stk" href="entity/${encodeURIComponent(n)}"><b>${e_(n)}</b><span>${fmt(v[0])}원</span><em class="${v[1]>0?'up':v[1]<0?'down':''}">${v[1]>0?'+':''}${v[1].toFixed(2)}%</em>${typeof line==='function'?line(s.slice(-60),120,30,v[1]<0?'#2f6bff':'#ff4d2e'):''}<small>시총 ${fmt(v[2]/10000)}조</small></a>`}).join('')}</div>
  <p class="fine">${ds[ds.length-1].slice(4,6)}.${ds[ds.length-1].slice(6)} 종가 기준(하루 늦게 반영돼요). 투자 권유가 아닙니다.</p></section>`}
function entStock(n){if(!STK||!STK.names)return'';const k=String(n||'').replace(/\s/g,'');const c=Object.keys(STK.names).find(c=>STK.names[c][0]===k||STK.names[c][0]===k.replace(/㈜|\(주\)/g,''));if(!c)return'';
  const s=stockSeries(c);if(s.length<2)return'';const a=s[0][1],b=s[s.length-1][1],ch=(b/a-1)*100;
  return`<section class="govstk">${sec('주가 흐름','Stock price','<span class="more">'+(STK.src==='naver'?'네이버 금융':'금융위원회')+' 시세</span>','coin')}<div class="card pad"><div class="gkpi"><div><small>최근 종가</small><b>${fmt(b)}원</b><em>${e_(s[s.length-1][0])}</em></div><div class="${ch>0?'up':'down'}"><small>${s.length}거래일 동안</small><b>${ch>0?'+':''}${ch.toFixed(1)}%</b></div></div>${chart(s,{col:ch<0?'#2f6bff':'#ff4d2e'})}<p class="fine">기사가 많이 나온 날과 주가가 크게 움직인 날을 비교해 보면 뉴스의 영향력을 가늠할 수 있어요. 투자 권유가 아닙니다.</p></div></section>`}

/* ---------- 지진·기상특보 신호 (국내 & 글로벌) ---------- */
const isTodayKST=t=>{if(!t)return false;const s=String(t).trim().replace(' ','T'),now=new Date();const k=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);return s.startsWith(k)};
const timeOnly=t=>String(t||'').trim().match(/(\d\d:\d\d)(?::\d\d)?$/)?.[1]||'';
function findWarnStation(w,stations){if(!w||!stations||!stations.length)return null;const txt=((w.title||'')+' '+(areaOf(w)||'')+' '+(w.areas||'')).trim();
  for(const s of stations){if(txt.includes(s.name))return s}
  const aliasMap={'호남':'gwangju','전라':'jeonbuk','전남':'jeonnam','전북':'jeonbuk','경상':'gyeongnam','영남':'busan','경남':'gyeongnam','경북':'gyeongbuk','충청':'daejeon','충남':'chungnam','충북':'chungbuk','수도권':'seoul','경기':'gyeonggi','강원':'gangwon','제주':'jeju','서울':'seoul','부산':'busan','대구':'daegu','인천':'incheon','광주':'gwangju','대전':'daejeon','울산':'ulsan','세종':'sejong'};
  for(const[k,id] of Object.entries(aliasMap)){if(txt.includes(k)){const f=stations.find(s=>s.id===id);if(f)return f}}
  const sorted=[...stations].sort((a,b)=>((b.current?.precip||0)+(b.days?.[0]?.precip||0))-((a.current?.precip||0)+(a.days?.[0]?.precip||0)));
  return sorted[0]||null}

function alertHTML(){
  const isGlobal = window.S?.region === 'en';
  const isOrig = isGlobal && window.S?.orig;
  
  // 국내 특보 체크 (당일 KST 지진 규모 3 이상, 경보급 특보)
  const qDom = (AL?.quakes||[]).filter(x=>isTodayKST(x.t)&&x.domestic&&x.mag>=3);
  const wDom = [];
  const seenDom = new Set();
  for(const x of(AL?.warnings||[]).filter(x=>isTodayKST(x.t))){
    const k=x.title.replace(/\s*(발표|해제|변경)\b.*/,'');
    if(seenDom.has(k))continue;
    seenDom.add(k);
    if(!x.lift&&/경보/.test(k)&&!/주의보/.test(k)) wDom.push(x);
  }
  
  const hasDomesticAlert = qDom.length > 0 || wDom.length > 0;
  // 사용자의 핵심 요구: 국내/해외국문/해외영문 탭 전환 시 나올려면 전부 나오고, 안나올려면 전부 안 나와야 함!
  if(!hasDomesticAlert) return '';

  const rainSvg=`<span class="galert-ico-rain" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="#ffffff" fill="rgba(255,255,255,0.2)"/><line class="rain-drop d1" x1="8" y1="16" x2="8" y2="20" stroke="#ffffff"/><line class="rain-drop d2" x1="12" y1="16" x2="12" y2="20" stroke="#ffffff"/><line class="rain-drop d3" x1="16" y1="16" x2="16" y2="20" stroke="#ffffff"/></svg></span>`;
  const warnSvg=`<span class="galert-ico-warn" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#ffffff"/><line x1="12" y1="9" x2="12" y2="13" stroke="#ffffff"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#ffffff"/></svg></span>`;

  // 1) 해외 모드 (국문 / 영문): 글로벌 기상 및 이상기후 배너
  if(isGlobal){
    const gAlerts = (GW?.alerts || []).slice(0, 3);
    const gQuakes = (GW?.quakes || []).filter(x => x.mag >= 5.0).slice(0, 1);
    const items = [];
    
    gQuakes.forEach(x => {
      const qTitle = isOrig ? `M ${x.mag} Earthquake` : `규모 ${x.mag} 지진`;
      const qBadge = isOrig ? 'Global Quake' : '글로벌 지진';
      items.push(`<a class="gw" href="weather?mode=global" aria-label="${e_(qTitle)}"><div class="galert-left">${warnSvg}<span class="gbad w">${qBadge}</span><b class="galert-title">${e_(qTitle)}</b><em class="galert-area">${e_(x.place)}</em></div><time class="galert-time">${e_(timeOnly(x.t))}</time></a>`);
    });
    
    gAlerts.forEach(x => {
      const isRain = /Flood|Rain|Storm/i.test(x.event_en || '');
      const badge = isOrig ? 'Extreme Weather' : '글로벌 기상';
      const title = isOrig ? (x.headline_en || x.event_en) : (x.headline_ko || x.event);
      const flagArea = `${x.flag || ''} ${isOrig ? (x.country_en || 'Global') : (x.country_ko || '글로벌')}`;
      items.push(`<a class="gw" href="weather?mode=global" aria-label="${e_(title)} 글로벌 기상특보 보기"><div class="galert-left">${isRain ? rainSvg : warnSvg}<span class="gbad w">${badge}</span><b class="galert-title">${e_(title)}</b><em class="galert-area">${e_(flagArea)}</em></div><time class="galert-time">${e_(timeOnly(x.t))}</time></a>`);
    });
    
    if(!items.length){
      // 글로벌 자료 대기 중일 때의 포백
      const badge = isOrig ? 'Global Weather' : '글로벌 기상';
      const title = isOrig ? 'Extreme Weather Monitoring' : '전 세계 이상기후 실시간 모니터링';
      return `<div class="galert card"><a class="gw" href="weather?mode=global"><div class="galert-left">${warnSvg}<span class="gbad w">${badge}</span><b class="galert-title">${title}</b></div><time class="galert-time">Live</time></a></div>`;
    }
    return `<div class="galert card">${items.slice(0, 3).join('')}</div>`;
  }

  // 2) 국내 모드: 대한민국 기상청 특보 및 국내 지진
  return `<div class="galert card">${qDom.map(x=>`<div class="gq"><div class="galert-left">${warnSvg}<span class="gbad">지진</span><b class="galert-title">규모 ${e_(x.mag)}</b> <span class="galert-area">${e_(x.loc)}</span></div><time class="galert-time">${e_(timeOnly(x.t))}</time></div>`).join('')}${wDom.slice(0,3).map(x=>{const isRain=/호우|비|강수|폭우/.test(x.title);const wst=findWarnStation(x,WX?.stations||[]);const warnLink=wst?`weather?warn=${encodeURIComponent(wst.id)}`:'weather';return`<a class="gw" href="${warnLink}" aria-label="${e_(x.title)} 전국 기상특보 상세 보기"><div class="galert-left">${isRain?rainSvg:warnSvg}<span class="gbad w">기상특보</span><b class="galert-title">${e_(x.title)}</b>${areaOf(x)?`<em class="galert-area">${e_(areaOf(x))}</em>`:''}</div><time class="galert-time">${e_(timeOnly(x.t))}</time></a>`}).join('')}</div>`;
}

/* ---------- 전국 날씨 & 글로벌 이상기후 대시보드 ---------- */
let WXSEL=localStorage.getItem('nb-weather-region')||'seoul';
const WXPOS={seoul:[40,24],incheon:[22,31],gyeonggi:[51,32],gangwon:[76,18],sejong:[47,43],daejeon:[40,51],chungbuk:[58,46],chungnam:[29,51],jeonbuk:[37,63],gwangju:[22,73],jeonnam:[18,84],daegu:[63,66],gyeongbuk:[73,55],busan:[78,81],ulsan:[86,72],gyeongnam:[58,80],jeju:[26,96]};
const WXDAY=['일','월','화','수','목','금','토'];
const wxNum=(n,d=0)=>Number.isFinite(+n)?(+n).toFixed(d):'—';
const wxTemp=n=>Number.isFinite(+n)?`${Math.round(+n)}°`:'—';
const wxDate=d=>{const x=new Date(`${d}T12:00:00+09:00`);return Number.isNaN(+x)?String(d||''):`${String(x.getUTCMonth()+1).padStart(2,'0')}.${String(x.getUTCDate()).padStart(2,'0')} (${WXDAY[x.getUTCDay()]})`};
const wxHour=t=>String(t||'').slice(11,16);
const wxInfo=(code,day=1)=>{const c=+code;if(c===0)return[day===0?'☾':'☀','맑음','sun'];if(c<=2)return[day===0?'☾':'⛅','구름 조금','part'];if(c===3)return['☁','흐림','cloud'];if(c===45||c===48)return['≋','안개','fog'];if(c>=51&&c<=57)return['☂','이슬비','rain'];if(c>=61&&c<=67)return['☔','비','rain'];if(c>=71&&c<=77)return['❄','눈','snow'];if(c>=80&&c<=82)return['☔','소나기','rain'];if(c>=85&&c<=86)return['❄','눈 소나기','snow'];if(c>=95)return['ϟ','뇌우','storm'];return['◌','관측 중','part']};
const wxIcon=(code,day=1,small=false)=>{const [symbol,label,kind]=wxInfo(code,day);return`<span class="wx-icon ${kind}${small?' sm':''}" role="img" aria-label="${label}">${symbol}</span>`};
const wxWind=d=>{if(!Number.isFinite(+d))return'—';const a=['북','북동','동','남동','남','남서','서','북서'];return a[Math.round((+d%360)/45)%8]};
const wxSeverity=x=>/경보/.test(x.title||'')?'warn':'note';

function weatherChart(station){const H=(station.hours||[]).slice(0,24).filter(x=>x&&x.temp!=null);if(H.length<2)return'<p class="note">시간대 예보 자료를 모으는 중이에요.</p>';
  const W=760,HH=250,L=38,R=30,T=26,B=38,iw=W-L-R,ih=HH-T-B,temps=H.map(x=>+x.temp),pops=H.map(x=>+x.pop||0),mn=Math.floor(Math.min(...temps)-2),mx=Math.ceil(Math.max(...temps)+2),range=Math.max(1,mx-mn),X=i=>L+i/(H.length-1)*iw,Y=v=>T+(mx-v)/range*ih,pts=temps.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' '),area=`${L},${T+ih} ${pts} ${L+iw},${T+ih}`;
  const levels=Array.from({length:4},(_,i)=>mn+(range*i/3));const labels=H.map((x,i)=>i%3===0||i===H.length-1?`<text x="${X(i).toFixed(1)}" y="${HH-13}" text-anchor="middle">${e_(wxHour(x.t))}</text>`:'').join('');
  return`<svg class="wx-chart" viewBox="0 0 ${W} ${HH}" role="img" aria-label="${e_(station.name)} 다음 24시간 기온과 강수확률 그래프"><defs><linearGradient id="wxfill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ff6a3d" stop-opacity=".32"/><stop offset="1" stop-color="#ff6a3d" stop-opacity="0"/></linearGradient></defs><g class="wx-chart-grid">${levels.map(v=>`<line x1="${L}" x2="${L+iw}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text x="8" y="${(Y(v)+4).toFixed(1)}">${Math.round(v)}°</text>`).join('')}</g><g class="wx-pop">${pops.map((p,i)=>p?`<rect x="${(X(i)-Math.max(3,iw/H.length*.22)).toFixed(1)}" y="${(T+ih-p/100*ih*.36).toFixed(1)}" width="${Math.max(5,iw/H.length*.44).toFixed(1)}" height="${(p/100*ih*.36).toFixed(1)}" rx="2"><title>${wxHour(H[i].t)} 강수확률 ${p}%</title></rect>`:'').join('')}</g><polygon points="${area}" fill="url(#wxfill)"/><polyline points="${pts}"/><g class="wx-chart-dots">${H.map((x,i)=>i%3===0||i===H.length-1?`<circle cx="${X(i).toFixed(1)}" cy="${Y(+x.temp).toFixed(1)}" r="3.4"><title>${wxHour(x.t)} · ${wxTemp(x.temp)} · 강수확률 ${wxNum(x.pop)}%</title></circle>`:'').join('')}</g><g class="wx-chart-labels">${labels}</g></svg><div class="wx-chart-key"><span><i class="temp"></i>기온</span><span><i class="pop"></i>강수확률</span><span>그래프의 점을 누르면 시간별 수치를 볼 수 있어요.</span></div>`}

function weatherPage(){
  const app=document.getElementById('app');if(!app)return;
  const params=new URLSearchParams(location.search);
  const isGlobalTab = params.get('mode') === 'global' || window.S?.region === 'en';
  const isOrig = isGlobalTab && window.S?.orig;

  // 상단 서브 탭 헤더
  const subnav = `
  <div class="wx-subnav" style="display:flex;gap:8px;margin:8px 0 16px;padding:4px;background:var(--card-sub);border-radius:12px;width:fit-content">
    <button type="button" class="wx-tab ${!isGlobalTab?'on':''}" data-mode="kr" style="padding:6px 14px;border-radius:8px;font-size:0.84rem;font-weight:800;border:none;cursor:pointer;background:${!isGlobalTab?'#fff':'transparent'};color:${!isGlobalTab?'var(--ink)':'var(--ink2)'};box-shadow:${!isGlobalTab?'0 1px 3px rgba(0,0,0,0.1)':'none'}">🇰🇷 전국 날씨 (국내)</button>
    <button type="button" class="wx-tab ${isGlobalTab?'on':''}" data-mode="global" style="padding:6px 14px;border-radius:8px;font-size:0.84rem;font-weight:800;border:none;cursor:pointer;background:${isGlobalTab?'#7a4dff':'transparent'};color:${isGlobalTab?'#fff':'var(--ink2)'};box-shadow:${isGlobalTab?'0 1px 3px rgba(122,77,255,0.3)':'none'}">🌐 글로벌 날씨 & 이상기후</button>
  </div>`;

  // 1) 글로벌 날씨 & 이상기후 대시보드 뷰
  if(isGlobalTab){
    const alerts = GW?.alerts || [];
    const quakes = GW?.quakes || [];
    const cities = GW?.cities || [];
    const stories = GW?.stories || [];

    const alertCards = alerts.length ? alerts.map(x=>`
      <div class="card pad" style="border-left:4px solid #dc2626;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:0.75rem;font-weight:900;background:#dc2626;color:#fff;padding:2px 8px;border-radius:6px">${e_(x.severity)} 경보</span>
          <time style="font-size:0.78rem;color:var(--ink2)">${e_(x.t)}</time>
        </div>
        <h3 style="font-size:1.05rem;font-weight:850;margin:4px 0 8px;color:var(--ink)">${e_(x.flag||'')} ${e_(isOrig ? x.headline_en : x.headline_ko)}</h3>
        <p style="font-size:0.84rem;color:var(--ink2);line-height:1.5;margin:0 0 8px">${e_(x.desc)}</p>
        <div style="font-size:0.76rem;color:var(--ink3)">제공: 미국 국립해양대기청(NOAA NWS) 실시간 이상기후 경보</div>
      </div>
    `).join('') : '<p class="note">현재 발효 중인 글로벌 긴급 이상기후 경보가 없습니다.</p>';

    const quakeRows = quakes.length ? quakes.slice(0, 6).map(q=>`
      <li style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <b style="color:#dc2626;font-size:0.95rem;margin-right:8px">M ${q.mag}</b>
          <span style="font-size:0.88rem;color:var(--ink)">${e_(q.place)}</span>
        </div>
        <time style="font-size:0.78rem;color:var(--ink2)">${e_(q.t)}</time>
      </li>
    `).join('') : '<li>최근 24시간 내 규모 4.5 이상 주요 지진이 없습니다.</li>';

    const cityCards = cities.map(c=>`
      <div class="card pad" style="text-align:center;padding:16px 12px">
        <div style="font-size:1.4rem;margin-bottom:4px">${c.flag||''}</div>
        <b style="font-size:0.92rem;color:var(--ink);display:block">${e_(isOrig ? c.name_en : c.name_ko)}</b>
        <div style="font-size:1.6rem;font-weight:900;margin:6px 0;color:var(--ink)">${wxTemp(c.temp)}</div>
        <p style="font-size:0.76rem;color:var(--ink2);margin:0">체감 ${wxTemp(c.apparent_temp)} · 습도 ${c.humidity}%</p>
      </div>
    `).join('');

    const storyCards = stories.length ? `
      <section style="margin-top:24px">
        <div class="weather-sec-head"><div><small>CLIMATE STORIES</small><h2>외신이 전하는 기후 현장</h2></div></div>
        <div class="grid10" style="margin-top:12px">
          ${stories.map(s=>`
            <a class="card ic" href="${s.url}" style="padding:12px;text-decoration:none">
              <span style="font-size:0.76rem;color:#7a4dff;font-weight:800">${e_(s.press)}</span>
              <h4 style="font-size:0.92rem;font-weight:800;color:var(--ink);margin:6px 0 0">${e_(s.title)}</h4>
            </a>
          `).join('')}
        </div>
      </section>
    ` : '';

    app.innerHTML = `
      <div class="bkrow"><a class="back" href="./">${typeof NBI==='function'?NBI('arrow-left'):''} 오늘</a></div>
      <div class="weather-page weather-dash">
        ${subnav}
        <header class="weather-intro">
          <div>
            <span class="gbad w" style="background:#7a4dff!important">Global Climate & Weather</span>
            <h1>글로벌 이상기후 & 세계 주요 도시 날씨</h1>
            <p>전 세계 실시간 이상기후 경보(NOAA NWS)와 주요 거점 도시 기상, 글로벌 지진 현황을 실시간으로 확인합니다.</p>
          </div>
          <aside><b>이상기후 경보 ${alerts.length}건</b><small>마지막 수집 · ${e_(when(GW?.updated,'full'))}</small></aside>
        </header>
        
        <section style="margin:20px 0">
          <div class="weather-sec-head"><div><small>EXTREME WEATHER</small><h2>실시간 글로벌 이상기후 경보</h2></div></div>
          ${alertCards}
        </section>

        <section style="margin:28px 0">
          <div class="weather-sec-head"><div><small>GLOBAL METROPOLIS</small><h2>세계 주요 거점 도시 날씨</h2></div></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:10px;margin-top:12px">
            ${cityCards}
          </div>
        </section>

        <section style="margin:28px 0">
          <div class="weather-sec-head"><div><small>EARTHQUAKE HAZARDS</small><h2>전 세계 주요 지진 (M 4.5 이상)</h2></div></div>
          <div class="card pad"><ul style="list-style:none;padding:0;margin:0">${quakeRows}</ul></div>
        </section>

        ${storyCards}
        <p class="weather-source fine">출처: 미국 국립해양대기청(NOAA NWS), 미국 지질조사소(USGS), Open-Meteo Global Weather Model API.</p>
      </div>
    `;

    app.querySelectorAll('.wx-tab').forEach(b => {
      b.onclick = () => {
        const m = b.dataset.mode;
        history.replaceState(null, '', m === 'global' ? 'weather?mode=global' : 'weather');
        weatherPage();
      };
    });
    return;
  }

  // 2) 국내 날씨 대시보드 뷰
  const all=[...(AL?.warnings||[])].sort((a,b)=>String(b.t).localeCompare(String(a.t))),active=all.filter(x=>!x.lift),ended=all.filter(x=>x.lift);
  const stations=WX?.stations||[];if(!stations.length){const card=(title,rows,empty)=>`<section class="weather-card card"><h3>${title}</h3>${rows.length?`<ul>${rows.map(x=>`<li><b>${e_(x.title)}</b><small>${areaOf(x)?`발표 지역 · ${e_(areaOf(x))}<br>`:''}${e_(when(x.t,'full'))}${x.lift?' · 해제':' · 발효 중'}</small></li>`).join('')}</ul>`:`<p class="note">${empty}</p>`}</section>`;app.innerHTML=`<div class="bkrow"><a class="back" href="./">${typeof NBI==='function'?NBI('arrow-left'):''} 오늘</a></div><div class="weather-page">${subnav}<section class="card" style="padding:20px"><span class="gbad w">기상청 특보</span><h1>전국 기상특보</h1><p class="lede">전국 관측·예보 데이터를 준비하고 있어요. 특보는 먼저 기상청 발표 그대로 보여 드립니다.</p></section><div class="weather-grid">${card('현재 발효 중',active,'현재 발효 중인 특보가 없어요.')}${card('최근 변경·해제',ended.slice(0,24),'최근 변경 내역이 없어요.')}</div></div>`;return}
  const qWarn=params.get('warn');
  const rainWarn=active.find(x=>/호우.*경보|경보.*호우/.test(x.title||''));
  const warnSt=(qWarn&&stations.find(x=>x.id===qWarn))||(rainWarn?findWarnStation(rainWarn,stations):null);
  let st=warnSt||stations.find(x=>x.id===WXSEL)||stations[0];
  if(warnSt&&qWarn) WXSEL=warnSt.id;
  const c=st.current||{},today=(st.days||[])[0]||{},activeShort=active.slice(0,4),feel=c.feel==null?'—':wxTemp(c.feel),alertText=active.length?`특보 ${active.length}건 발효 중`:'발효 중인 특보 없음';
  const metric=(label,value,unit,desc,ico)=>`<div class="wx-metric"><span>${ico||''}${label}</span><b>${value}<small>${unit||''}</small></b><em>${desc||''}</em></div>`;
  const isWarnTarget=x=>warnSt&&x.id===warnSt.id;
  const stationCards=stations.map(x=>{const cc=x.current||{},d=(x.days||[])[0]||{},sel=x.id===st.id,isW=isWarnTarget(x);return`<button type="button" class="wx-station ${sel?'on':''} ${isW?'warn-focus':''}" data-wx="${e_(x.id)}" aria-pressed="${sel}">${wxIcon(cc.code,cc.day,true)}<span><b>${e_(x.name)}</b>${isW?'<span class="wx-warn-tag">호우경보</span>':`<small>${wxInfo(cc.code,cc.day)[1]}</small>`}</span><strong>${wxTemp(cc.temp)}</strong><em><i>${wxTemp(d.low)}</i> / ${wxTemp(d.high)}</em></button>`}).join('');
  const mapDots=stations.map(x=>{const pos=WXPOS[x.id]||[50,50],cc=x.current||{},sel=x.id===st.id,isW=isWarnTarget(x);return`<button type="button" class="wx-map-dot ${sel?'on':''} ${isW?'warn-focus':''}" data-wx="${e_(x.id)}" style="--x:${pos[0]}%;--y:${pos[1]}%" aria-label="${e_(x.name)} ${wxTemp(cc.temp)}, ${wxInfo(cc.code,cc.day)[1]}">${wxIcon(cc.code,cc.day,true)}<b>${e_(x.name)}</b><i>${wxTemp(cc.temp)}</i></button>`}).join('');
  const weekly=(st.days||[]).map((d,i)=>`<div class="wx-day ${i===0?'today':''}"><b>${i===0?'오늘':wxDate(d.date)}</b>${wxIcon(d.code,1,true)}<span class="wx-day-temp"><i>${wxTemp(d.low)}</i><em></em><strong>${wxTemp(d.high)}</strong></span><small><span class="drop">☂</span> ${wxNum(d.pop)}%${(+d.precip||0)>0?` · ${wxNum(d.precip,1)}mm`:''}</small><mark>UV ${wxNum(d.uv,1)}</mark></div>`).join('');
  const alertRows=activeShort.length?activeShort.map(x=>`<li class="${wxSeverity(x)}"><span>${/호우/.test(x.title||'')?'☔':/강풍/.test(x.title||'')?'≋':/풍랑/.test(x.title||'')?'≋':'⚠'}</span><div><b>${e_(x.title)}</b><small>${areaOf(x)?`발표 지역 · ${e_(areaOf(x))} · `:''}${e_(when(x.t,'medium'))}</small></div></li>`).join(''):`<li class="clear"><span>✓</span><div><b>현재 발효 중인 기상특보가 없어요</b><small>특보가 발표되면 이곳과 메인 화면에 함께 알려 드려요.</small></div></li>`;
  app.innerHTML=`<div class="bkrow"><a class="back" href="./">${typeof NBI==='function'?NBI('arrow-left'):''} 오늘</a></div><div class="weather-page weather-dash">${subnav}<header class="weather-intro"><div><span class="gbad w">전국 날씨</span><h1>전국 날씨, 한눈에 보기</h1><p>전국 17개 시·도 생활권의 현재 수치와 시간대·주간 예보를 함께 봐요. 지역을 누르면 상세 그래프가 바뀝니다.</p></div><aside><b>${e_(alertText)}</b><small>마지막 수집 · ${e_(when(WX.updated,'full'))}</small></aside></header><section class="weather-hero"><div class="wx-hero-main"><div><span>${e_(st.name)} 현재 날씨</span><h2>${wxTemp(c.temp)}</h2><p>${wxIcon(c.code,c.day)} ${wxInfo(c.code,c.day)[1]} <i>체감 ${feel}</i></p></div><div class="wx-hero-range"><b>오늘</b><strong><i>${wxTemp(today.low)}</i> / ${wxTemp(today.high)}</strong><small>강수확률 ${wxNum(today.pop)}%</small></div></div><div class="wx-hero-meta"><span>일출 <b>${wxHour(today.sunrise)}</b></span><span>일몰 <b>${wxHour(today.sunset)}</b></span><span>풍속 <b>${wxNum(c.wind,1)} km/h</b></span><span>습도 <b>${wxNum(c.humidity)}%</b></span></div></section><section class="weather-section"><div class="weather-sec-head"><div><small>REGIONAL SNAPSHOT</small><h2>전국 지금 날씨</h2></div><p>기온이 아닌 실제 예보 기준으로, 같은 시각의 지역 차이를 비교해요.</p></div><div class="wx-stations" aria-label="전국 지역 선택">${stationCards}</div></section><section class="weather-overview"><div class="wx-map-card"><div class="weather-sec-head"><div><small>WEATHER MAP</small><h2>생활권 날씨 지도</h2></div><p>지역을 누르면 상세 보기</p></div><div class="wx-map" aria-label="전국 생활권 날씨 지도">${mapDots}</div><p class="fine">지역 중심 생활권 좌표로 배치한 안내 지도예요. 실제 행정 경계·관측 지점과는 다를 수 있습니다.</p></div><section class="wx-alerts"><div class="weather-sec-head"><div><small>OFFICIAL ALERTS</small><h2>기상청 특보</h2></div><a href="weather#alerts">전체 내역</a></div><ul>${alertRows}</ul></section></section><section class="weather-detail" aria-live="polite"><div class="weather-sec-head"><div><small>DETAIL · ${e_(st.name.toUpperCase())}</small><h2>${e_(st.name)} 상세 날씨</h2></div><p>${e_(wxInfo(c.code,c.day)[1])} · 관측 ${e_(wxHour(c.time))} KST</p></div><div class="wx-metrics">${metric('체감온도',feel,'','온도와 바람을 반영',wxIcon(c.code,c.day,true))}${metric('습도',wxNum(c.humidity),'%','공기 중 수증기', '◒')}${metric('바람',wxNum(c.wind,1),'km/h',`${wxWind(c.wind_dir)}풍 · 순간 ${wxNum(c.gust,1)} km/h`, '≋')}${metric('강수',wxNum(c.precip,1),'mm','현재 관측 구간', '☔')}${metric('기압',wxNum(c.pressure,1),'hPa','해면기압', '◌')}${metric('구름량',wxNum(c.cloud),'%','하늘을 덮은 구름', '☁')}</div><section class="wx-detail-card"><div class="wx-card-title"><div><small>HOURLY OUTLOOK</small><h3>앞으로 24시간</h3></div><p>기온 곡선과 시간별 강수확률</p></div>${weatherChart(st)}</section><section class="wx-detail-card"><div class="wx-card-title"><div><small>7-DAY OUTLOOK</small><h3>주간 예보</h3></div><p>최저·최고기온, 강수확률, 자외선</p></div><div class="wx-days">${weekly}</div></section></section><section class="wx-alert-history" id="alerts"><div class="weather-sec-head"><div><small>RECENT UPDATES</small><h2>최근 특보 변경·해제</h2></div><p>기상청 발표 시각 기준</p></div>${ended.length?`<ol>${ended.slice(0,12).map(x=>`<li><b>${e_(x.title)}</b><span>${areaOf(x)?`${e_(areaOf(x))} · `:''}${e_(when(x.t,'medium'))}</span></li>`).join('')}</ol>`:'<p class="note">최근 변경·해제된 특보가 없어요.</p>'}</section><p class="weather-source fine">예보 자료: Open-Meteo Weather Forecast API의 모델 예보 · 특보: 기상청(공공데이터포털). 예보는 모델 갱신 시점에 따라 달라질 수 있으며, 재난 대응은 기상청 공식 발표를 우선해 주세요.</p></div>`;
  app.querySelectorAll('[data-wx]').forEach(b=>b.addEventListener('click',()=>{const next=b.dataset.wx;if(!next||next===WXSEL)return;WXSEL=next;localStorage.setItem('nb-weather-region',next);weatherPage();requestAnimationFrame(()=>app.querySelector('.weather-detail')?.scrollIntoView({behavior:'smooth',block:'start'}))}));
  app.querySelectorAll('.wx-tab').forEach(b => {
    b.onclick = () => {
      const m = b.dataset.mode;
      history.replaceState(null, '', m === 'global' ? 'weather?mode=global' : 'weather');
      weatherPage();
    };
  });
}
window.nbWeather=function(){load().then(weatherPage)};

/* ---------- 끼워넣기 ---------- */
const path=()=>location.pathname.slice((typeof BASEP==='string'?BASEP:'/news/').length).replace(/\/+$/,'');
function putMarket(){if(path()!=='market')return;const app=document.getElementById('app');if(!app)return;app.querySelectorAll('.govapt,.govstk').forEach(x=>x.remove());
  app.insertAdjacentHTML('beforeend',stocksHTML()+aptHTML());const s=document.getElementById('aptgu');if(s)s.onchange=()=>{GU=s.value;putMarket();document.querySelector('.govapt')?.scrollIntoView()}}

function putToday(){
  if(path()!=='')return;
  const h=alertHTML();
  const slot=document.getElementById('nb-alert-slot');
  if(slot){
    slot.innerHTML=h;
    return;
  }
  const app=document.getElementById('app');
  if(!app||app.querySelector('.galert'))return;
  const targetBar=app.querySelector('.today-region-bar')||app.querySelector('.gbar');
  if(targetBar){
    targetBar.insertAdjacentHTML('afterend',h);
  } else {
    app.insertAdjacentHTML('afterbegin',h);
  }
}

function putEnt(n){const app=document.getElementById('app');if(!app)return;app.querySelectorAll('.govstk').forEach(x=>x.remove());const h=entStock(n);if(h)app.insertAdjacentHTML('beforeend',h)}
const wrap=(name,fn)=>{const o=window[name];if(typeof o!=='function')return;window[name]=function(){const r=o.apply(this,arguments),a=arguments;load().then(()=>{try{fn.apply(null,a)}catch(e){}});return r}};
wrap('market',putMarket);wrap('today',putToday);wrap('entity',putEnt);
wrap('gtoday',putToday);
window.addEventListener('nb:region-changed',putToday);
load().then(()=>{try{putMarket();putToday()}catch(e){}});
})();
