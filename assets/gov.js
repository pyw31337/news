/* NewsBoard · 공공데이터포털 연동(맥미니 수집): 서울 아파트 실거래 추이, 주요 종목 시세, 지진·기상특보 신호 */
(function(){
const J=u=>fetch(u+'?'+Date.now()).then(r=>r.ok?r.json():null).catch(()=>null);
let APT=null,STK=null,AL=null,P=null;
const load=()=>P||(P=Promise.all([J('data/gov/apt.json'),J('data/gov/stocks.json'),J('data/gov/alerts.json')]).then(([a,s,l])=>{APT=a;STK=s;AL=l}));
const e_=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Math.round(n).toLocaleString();
const eok=v=>v>=10000?(v/10000).toFixed(2).replace(/\.?0+$/,'')+'억':fmt(v)+'만';
/* 작은 SVG 선 차트(축·라벨 포함) */
function chart(pts,{w=640,h=260,col='#ff4d2e',fmtY=fmt,bars=null}={}){if(!pts||pts.length<2)return'';
  const ys=pts.map(p=>p[1]),mn=Math.min(...ys),mx=Math.max(...ys),r=mx-mn||1,L=96,B=34,T=14,W=w-L-8,H=h-T-B;
  const X=i=>L+i/(pts.length-1)*W,Y=v=>T+H-(v-mn)/r*H;
  const d=pts.map((p,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('');
  const bm=bars?Math.max(...bars,1):1,bw=Math.max(2,W/pts.length*0.6);
  const lab=pts.map((p,i)=>i%Math.ceil(pts.length/6)===0||i===pts.length-1?`<text x="${X(i)}" y="${h-8}" text-anchor="middle">${e_(p[0])}</text>`:'').join('');
  return`<svg class="gchart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img">
  ${bars?bars.map((b,i)=>`<rect x="${(X(i)-bw/2).toFixed(1)}" y="${(T+H-b/bm*H*0.35).toFixed(1)}" width="${bw.toFixed(1)}" height="${(b/bm*H*0.35).toFixed(1)}" fill="#c9cfdc" opacity=".55"/>`).join(''):''}
  ${[mn,(mn+mx)/2,mx].map(v=>`<line x1="${L}" x2="${w-8}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e6e8ee"/><text x="${L-6}" y="${Y(v)+7}" text-anchor="end">${e_(fmtY(v))}</text>`).join('')}
  <path d="${d}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="${X(pts.length-1)}" cy="${Y(ys[ys.length-1])}" r="4" fill="${col}"/>${lab}</svg>`}
const ym=k=>k.slice(2,4)+'.'+k.slice(4);
/* ---------- 서울 아파트 ---------- */
let GU='서울 전체';
function aptSeries(kind,gu){const M=(APT&&APT[kind])||{},ks=Object.keys(M).sort();const out=[],vol=[];
  for(const k of ks){const g=M[k];let n=0,v=0;
    if(gu==='서울 전체'){if(Object.keys(g).length<25)continue;for(const x of Object.values(g)){if(x[1]){n+=x[0];v+=x[0]*x[1]}}v=n?v/n:0}else if(g[gu]){n=g[gu][0];v=g[gu][1]}
    if(v)out.push([ym(k),v]),vol.push(n)}
  // 이번 달은 신고가 다 안 들어와서(30일 신고 기한) 표시만 하고 추세 해석에서 제외
  return{pts:out,vol}}
function aptHTML(){if(!APT||!APT.trade)return'';const t=aptSeries('trade',GU),r=aptSeries('rent',GU);if(t.pts.length<3)return'';
  const last=t.pts[t.pts.length-2]||t.pts[t.pts.length-1],yr=t.pts[t.pts.length-14],chg=yr?(last[1]/yr[1]-1)*100:null;
  const rl=r.pts[r.pts.length-2],ratio=rl&&last?rl[1]/last[1]*100:null;
  const gus=['서울 전체',...Object.keys(Object.values(APT.trade).pop()||{})];
  return`<section class="govapt">${sec('서울 아파트 실거래 흐름','Seoul apartment deals','<span class="more">국토교통부 실거래가</span>','chart')}
  <p class="lede sm">실제로 계약된 아파트 거래를 모아 <b>3.3㎡(1평)당 중간 가격</b>으로 보여줘요. 호가가 아니라 진짜 거래 가격이라 시장 분위기를 가장 정직하게 보여주는 숫자예요.</p>
  <div class="gsel"><select id="aptgu" aria-label="지역">${gus.map(g=>`<option${g===GU?' selected':''}>${e_(g)}</option>`).join('')}</select></div>
  <div class="gkpi"><div><small>매매 평당 중간값</small><b>${eok(last[1])}원</b><em>${e_(last[0])} 기준</em></div>${chg!=null?`<div class="${chg>0?'up':'down'}"><small>1년 전보다</small><b>${chg>0?'+':''}${chg.toFixed(1)}%</b><em>${chg>3?'오르는 중':chg<-3?'내리는 중':'제자리 수준'}</em></div>`:''}${ratio?`<div><small>전세가율</small><b>${ratio.toFixed(0)}%</b><em>매매가 대비 전세가</em></div>`:''}</div>
  <div class="card pad"><h4 class="gt">매매 · 평당 가격(선)과 거래량(막대)</h4>${chart(t.pts,{bars:t.vol,fmtY:eok})}
  ${r.pts.length>2?`<h4 class="gt">전세 · 평당 보증금</h4>${chart(r.pts,{col:'#2f6bff',fmtY:eok})}`:''}</div>
  <div class="gexp card pad"><b>📘 이렇게 읽어요</b><ul><li><b>거래량</b>이 먼저 늘고 가격이 따라 오르는 경우가 많아요. 거래가 줄면서 가격만 오르면 힘이 약한 상승일 수 있어요.</li><li><b>전세가율</b>이 높으면(70% 이상) 적은 돈으로 집을 사는 ‘갭투자’가 쉬워지고, 집값이 떨어질 때 전세금을 못 돌려받는 위험도 커져요.</li><li>최근 1~2달은 신고 기한(30일)이 남아 거래량이 적게 보여요. 추세는 그 전 달까지로 판단하세요.</li></ul></div>
  <p class="fine">출처: 국토교통부 아파트 매매·전월세 실거래가(공공데이터포털). 해제된 거래는 뺐고, 전세는 월세가 없는 계약만 셌어요.</p></section>`}
/* ---------- 주요 종목 ---------- */
function stockSeries(code){const D=(STK&&STK.days)||{};return Object.keys(D).sort().filter(d=>D[d][code]).map(d=>[d.slice(4,6)+'.'+d.slice(6),D[d][code][0]])}
function stocksHTML(){const D=(STK&&STK.days)||{},ds=Object.keys(D).sort();if(ds.length<2)return'';const last=D[ds[ds.length-1]];
  const top=Object.entries(last).sort((a,b)=>b[1][2]-a[1][2]).slice(0,12);
  return`<section class="govstk">${sec('시가총액 상위 종목','Top KRX stocks','<span class="more">금융위원회 주식시세</span>','coin')}
  <p class="lede sm">시가총액(회사 전체 몸값)이 큰 순서예요. 큰 회사 주가는 지수 전체를 끌고 가서, 이 종목들의 흐름이 곧 ‘한국 증시의 날씨’예요.</p>
  <div class="stkg">${top.map(([c,v])=>{const s=stockSeries(c).map(x=>x[1]),n=(STK.names[c]||[c])[0];return`<a class="card stk" href="entity/${encodeURIComponent(n)}"><b>${e_(n)}</b><span>${fmt(v[0])}원</span><em class="${v[1]>0?'up':v[1]<0?'down':''}">${v[1]>0?'+':''}${v[1].toFixed(2)}%</em>${typeof line==='function'?line(s.slice(-60),120,30,v[1]<0?'#2f6bff':'#ff4d2e'):''}<small>시총 ${fmt(v[2]/10000)}조</small></a>`}).join('')}</div>
  <p class="fine">${ds[ds.length-1].slice(4,6)}.${ds[ds.length-1].slice(6)} 종가 기준(하루 늦게 반영돼요). 투자 권유가 아닙니다.</p></section>`}
function entStock(n){if(!STK||!STK.names)return'';const k=String(n||'').replace(/\s/g,'');const c=Object.keys(STK.names).find(c=>STK.names[c][0]===k||STK.names[c][0]===k.replace(/㈜|\(주\)/g,''));if(!c)return'';
  const s=stockSeries(c);if(s.length<2)return'';const a=s[0][1],b=s[s.length-1][1],ch=(b/a-1)*100;
  return`<section class="govstk">${sec('주가 흐름','Stock price','<span class="more">금융위원회 주식시세</span>','coin')}<div class="card pad"><div class="gkpi"><div><small>최근 종가</small><b>${fmt(b)}원</b><em>${e_(s[s.length-1][0])}</em></div><div class="${ch>0?'up':'down'}"><small>${s.length}거래일 동안</small><b>${ch>0?'+':''}${ch.toFixed(1)}%</b></div></div>${chart(s,{col:ch<0?'#2f6bff':'#ff4d2e'})}<p class="fine">기사가 많이 나온 날과 주가가 크게 움직인 날을 비교해 보면 뉴스의 영향력을 가늠할 수 있어요. 투자 권유가 아닙니다.</p></div></section>`}
/* ---------- 지진·기상특보 신호(오늘 화면 위쪽, 최근 것만) ---------- */
function alertHTML(){if(!AL)return'';const now=Date.now(),age=t=>(now-new Date(t.replace(' ','T')+':00+09:00'))/36e5;
  const q=(AL.quakes||[]).filter(x=>age(x.t)<48&&(x.domestic||x.mag>=6));
  const w=[],seen=new Set();for(const x of (AL.warnings||[]).filter(x=>age(x.t)<24)){const k=x.title.replace(/\s*(발표|해제|변경)\b.*/,'');if(seen.has(k))continue;seen.add(k);if(!x.lift)w.push(x)}
  if(!q.length&&!w.length)return'';
  return`<div class="galert card">${q.map(x=>`<div class="gq"><span class="gbad">지진</span><b>규모 ${e_(x.mag)}</b> ${e_(x.loc)}<time>${e_(x.t.slice(5))}</time>${x.domestic?'':'<em>국내 영향 없음</em>'}</div>`).join('')}${w.slice(0,3).map(x=>`<div class="gw"><span class="gbad w">기상특보</span>${e_(x.title)}<time>${e_(x.t.slice(5))}</time></div>`).join('')}<small>기상청 발표 · 최근 것만 보여요</small></div>`}
/* ---------- 끼워넣기 ---------- */
const path=()=>location.pathname.slice((typeof BASEP==='string'?BASEP:'/news/').length).replace(/\/+$/,'');
function putMarket(){if(path()!=='market')return;const app=document.getElementById('app');if(!app)return;app.querySelectorAll('.govapt,.govstk').forEach(x=>x.remove());
  app.insertAdjacentHTML('beforeend',stocksHTML()+aptHTML());const s=document.getElementById('aptgu');if(s)s.onchange=()=>{GU=s.value;putMarket();document.querySelector('.govapt')?.scrollIntoView()}}
function putToday(){if(path()!=='')return;const app=document.getElementById('app');if(!app||app.querySelector('.galert'))return;const h=alertHTML();if(h)app.insertAdjacentHTML('afterbegin',h)}
function putEnt(n){const app=document.getElementById('app');if(!app)return;app.querySelectorAll('.govstk').forEach(x=>x.remove());const h=entStock(n);if(h)app.insertAdjacentHTML('beforeend',h)}
const wrap=(name,fn)=>{const o=window[name];if(typeof o!=='function')return;window[name]=function(){const r=o.apply(this,arguments),a=arguments;load().then(()=>{try{fn.apply(null,a)}catch(e){}});return r}};
wrap('market',putMarket);wrap('today',putToday);wrap('entity',putEnt);
load().then(()=>{try{putMarket();putToday()}catch(e){}});
})();
