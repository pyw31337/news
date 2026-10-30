const $=s=>document.querySelector(s);const app=$('#app');let D=null;const CACHE={};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPE={person:'인물',place:'장소',org:'기관·기업',event:'키워드'};
const CATS=['정치','경제','사회','세계','IT','과학','건강','환경','문화','연예','스포츠'];
const CATC={정치:'#2f6bff',경제:'#11a683',사회:'#ff4d2e',세계:'#7a4dff',IT:'#0aa5c8',과학:'#4868d8',건강:'#d64f73',환경:'#28a26e',문화:'#9c58cc',연예:'#e2448e',스포츠:'#f08a00'};
const CATEN={정치:'Politics',경제:'Business',사회:'Society',세계:'World',IT:'Technology',과학:'Science',건강:'Health',환경:'Climate',문화:'Culture',연예:'Entertainment',스포츠:'Sports'};
/* 아이콘 */
const IC={'정치':NBU('landmark'),'경제':NBU('chart-arrows-vertical'),'사회':NBU('users-group'),'세계':NBU('world'),IT:NBU('device-laptop'),'과학':NBU('flask-2'),'건강':NBU('heart'),'환경':NBU('leaf'),'문화':NBU('palette'),'연예':NBU('movie'),'스포츠':NBU('ball-football'),fire:NBU('flame',1),clock:NBU('clock'),chat:NBU('message-2',1),link:NBU('link'),book:NBU('book'),chart:NBU('chart-line'),spark:NBU('sparkles',1),news:NBU('file-text',1),press:NBU('news'),user:NBU('user'),gear:NBU('settings'),search:NBU('search'),coin:NBU('coin'),alert:NBU('alert-triangle',1),bell:NBU('bell',1),bm:NBU('bookmark',1),heart:NBU('heart',1),place:NBU('map-pin'),org:NBU('building-bank'),graph:NBU('affiliate'),photo:NBU('photo'),note:NBU('notes'),folder:NBU('folder',1),video:NBU('video',1),mood:NBU('mood-smile'),ai:NBU('sparkles'),aitext:NBU('file-text-ai'),aiimg:NBU('photo-ai'),history:NBU('history'),up:NBU('trending-up'),down:NBU('trending-down'),share:NBU('share'),apt:NBU('building-community'),home:NBU('building-community'),quiz:NBU('help-hexagon',1),comic:NBU('boom',1),cards:NBU('cards',1),streak:NBU('arrow-autofit-content'),login:NBU('lock',1),sync:NBU('cloud-data-connection',1),globe:NBU('world',1),info:NBU('info-circle',1),x:NBU('x'),flame:NBU('flame',1),timeline:NBU('timeline-event',1),market:NBU('chart-candle',1)};
const ic=(n,c='')=>`<svg class="ico ${/u1/.test(IC[n]||'')?'tg ':''}${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]||IC.news}</svg>`;
const ago=t=>{if(!t)return'';const m=(Date.now()-new Date(t))/6e4,en=S?.region==='en'&&S?.orig;if(m<60)return en?`${Math.max(1,m|0)}m ago`:Math.max(1,m|0)+'분 전';if(m<1440)return en?`${m/60|0}h ago`:(m/60|0)+'시간 전';if(m<43200)return en?`${m/1440|0}d ago`:(m/1440|0)+'일 전';return fmtD(t)};
const moodOf=(l,d)=>{const r=(l||0)/((l||0)+(d||0)||1);return r>=.7?['mood-happy','반가워요']:r>=.55?['mood-smile','좋아요']:r>=.45?['mood-empty','반반이에요']:r>=.3?['mood-sad','아쉬워요']:['mood-angry','화나요']};
const moodBox=(l,d)=>{if(!(l+d))return'';const[m,t]=moodOf(l,d);return`<div class="mood"><b>${NBI(m,1,'on')}${t}</b><span>민심</span></div>`};
const agoI=t=>{if(!t)return'';const h=new Date(t).getHours()%12||12;return NBI('clock-hour-'+h)+ago(t)};
const fmtD=t=>{const d=new Date(t);return`${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`};
const fmtDay=d=>{const t=new Date(d+'T12:00:00+09:00');return`${t.getFullYear()}년 ${t.getMonth()+1}월 ${t.getDate()}일 (${'일월화수목금토'[t.getDay()]})`};
const bg=u=>u?`style="background-image:url('${esc(u)}')"`:'';
const ent=n=>D.entities.find(e=>e.name===n);
const eh=n=>'entity/'+encodeURIComponent(n);const kh=n=>'kw/'+encodeURIComponent(n);
const AIB='';
/* 경량 데이터는 작은 원본을 자체 WebP로 바꾸지 못했을 때 thumb를 비우고 thumb_src만 남긴다.
   작은 카드에서는 그 원본도 충분히 선명하므로, 대표 미디어 → 고화질 thumb → 원본 순서로 쓴다. */
const COUNTRY_FLAG={대한민국:'kr',한국:'kr',남한:'kr',북한:'kp',미국:'us',중국:'cn',일본:'jp',독일:'de',프랑스:'fr',영국:'gb',러시아:'ru',우크라이나:'ua',이스라엘:'il',이란:'ir',대만:'tw',인도:'in',캐나다:'ca',호주:'au',이탈리아:'it',스페인:'es',브라질:'br',멕시코:'mx',튀르키예:'tr',사우디아라비아:'sa',베트남:'vn',태국:'th',필리핀:'ph',싱가포르:'sg',인도네시아:'id'};
function entityMedia(e){
  const flag=COUNTRY_FLAG[e.name];if(flag)return{url:`https://flagcdn.com/w320/${flag}.png`,kind:'flag'};
  const v=e.visual||{},w=e.wiki||{},url=v.url||w.thumb||w.thumb_src||'';
  return{url,kind:v.kind||(e.type==='person'?'portrait':e.type==='place'?'place':e.type==='org'?'photo':'')};
}
function av(e,cls='av'){const v=entityMedia(e),fallback=e.type==='person'?'user':e.type==='place'?'place':e.type==='org'?'org':'news';return`<div class="${cls} media-${esc(v.kind||'fallback')}" ${bg(v.url)}>${v.url?'':ic(fallback)}</div>`}
function chipE(n,nolink){const e=ent(n);if(e&&nolink)return`<span class="chip ${e.type}">${esc(n)}</span>`;return e?`<a class="chip ${e.type}" href="${eh(n)}">${esc(n)}</a>`:`<span class="chip event">#${esc(n)}</span>`}
function spark(daily,w=120,h=28,col='#ff4d2e'){const now=new Date();const bins=Array(24).fill(0);
  daily.forEach(([d,c])=>{const t=new Date(d);const k=(now.getFullYear()-t.getFullYear())*12+now.getMonth()-t.getMonth();if(k>=0&&k<24)bins[23-k]+=c});
  return line(bins,w,h,col)}
function line(v,w=120,h=28,col='#ff4d2e'){if(!v||v.length<2)return'';const mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1;
  const pts=v.map((x,i)=>`${(i/(v.length-1)*w).toFixed(1)},${(h-2-(x-mn)/r*(h-4)).toFixed(1)}`).join(' ');
  return`<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="0,${h} ${pts} ${w},${h}" fill="${col}22" stroke="none"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`}
function sec(t,sub,more='',icon=''){return`<div class="sec"><h2><small>${sub}</small>${icon?ic(icon,'h'):''}${t}</h2>${more}</div>`}
/* ---------- 타입별 UI 컴포넌트 ---------- */
const host=u=>{try{return new URL(u).hostname}catch(x){return''}};
const plogo=(name,url,cls='pl')=>{const f=PL[name]||PL[host(url).replace(/^www\./,'')];return f?`<img class="${cls}" src="assets/press/${f}" alt="" loading="lazy" width="14" height="14">`:`<i class="${cls} mono" style="--h:${[...String(name)].reduce((a,c)=>a+c.charCodeAt(0),0)%360}" aria-hidden="true">${esc(String(name||'?').replace(/^[\s\[(\'"“‘]+/,'')[0]||'?')}</i>`};
const pp=(name,url)=>name?`<span class="pp">${plogo(name,url)}${esc(name)}</span>`:'';
const ts=(t,rel)=>t?`<time class="ts">${rel?ago(t):fmtD(t)}</time>`:'';
const cnt=(n,icn,tip)=>`<span class="cnt" title="${tip||''}">${icn?ic(icn):''}${n}</span>`;
const ETY={person:['인물','user'],place:['장소','spark'],org:['기관','news'],company:['기업','coin'],inst:['기관','news'],event:['키워드','fire'],issue:['이슈','fire']};
const entc=(name,t,href)=>`<${href?`a href="${href}"`:'span'} class="ent ${t}">${ic((ETY[t]||ETY.event)[1])}${esc(name)}</${href?'a':'span'}>`;
const meta=(x,rel)=>`<span class="meta">${pp(x.press,x.url)}${ts(x.t||x.time,rel)}</span>`;
function th(u,cls='th',fb='news'){return u?`<div class="${cls}" ${bg(u)}></div>`:`<div class="${cls} noimg">${ic(fb)}</div>`}
/* ---------- 설정 ---------- */
const S=Object.assign({hide:[],fs:100,region:'kr',orig:false},JSON.parse(localStorage.getItem('nb-settings')||'{}'));
/* v2: 해외 기본 언어를 한국어로 전환. 기존의 자동 영문 기본값도 한 번만 안전하게 이관한다. */
if(S.regionDefaultV!==2){S.orig=false;S.regionDefaultV=2;localStorage.setItem('nb-settings',JSON.stringify(S));}
const saveS=()=>{localStorage.setItem('nb-settings',JSON.stringify(S));applyS()};
const applyS=()=>{document.documentElement.style.fontSize=(16*S.fs/100)+'px'};applyS();
const vis=i=>!S.hide.includes(i.category);

const ourl=o=>{if(Array.isArray(o))o.forEach(ourl);else if(o&&typeof o==='object'){if(o.ourl)o.url=o.ourl;for(const k in o)if(o[k]&&typeof o[k]==='object')ourl(o[k])}};
/* 첫 화면은 가벼운 today_lite.json(인물 타임라인 최신 12건)으로 그리고, 전체 today.json은 뒤에서 받아 인물 타임라인만 채움 */
let FULL=null;
function fullData(){return FULL||(FULL=fetch('data/today.json?'+Date.now()).then(r=>r.json()).then(F=>{ourl(F);const m={};(F.entities||[]).forEach(e=>m[e.name]=e.timeline);D.entities.forEach(e=>{if(m[e.name])e.timeline=m[e.name]});D.lite=0}).catch(()=>{D.lite=0}))}
async function load(){
  let r=null;try{r=await fetch('data/today_lite.json?'+Date.now())}catch(e){}
  if(!r||!r.ok)r=await fetch('data/today.json?'+Date.now());
  D=await r.json();ourl(D);
  try{G=await (await fetch('data/global.json?'+Date.now())).json()}catch(e){G=null}
  try{O=await (await fetch('data/official.json?'+Date.now())).json()}catch(e){O=null}
  try{BR=await (await fetch('data/briefs.json?'+Date.now())).json()}catch(e){BR=null}
  try{PL=await (await fetch('assets/press/index.json?v=1')).json()}catch(e){PL={}}
  header();route();
  if(D.lite)(window.requestIdleCallback||setTimeout)(fullData,{timeout:2500});
}
let G=null,PL={};
/* 검색량 표기: Google 트렌드 '오늘 검색 횟수(대략)' 구간 */
const kfmt=n=>n>=10000?(n/10000)+'만':n>=1000?(n/1000)+'천':String(n);
const TTIP='Google 트렌드 기준 오늘 대략적인 검색 횟수(구간값)입니다. 순위는 검색량 → 관련 기사 수 순으로 매겼어요.';
const tlab=t=>t.traffic_n?(S.region==='en'&&S.orig?`Search ${kfmt(t.traffic_n)}+`:`검색 ${kfmt(t.traffic_n)}+`):'';
function header(){
  $('#updated').outerHTML=`<div class="regionctl" id="rsw"><div class="rsw" role="radiogroup" aria-label="국내·해외 보기"><button role="radio" data-m="kr" title="국내 뉴스">국내</button><button role="radio" data-m="en" title="해외 뉴스">해외</button></div></div>`;
  $('#rsw').onclick=ev=>{const b=ev.target.closest('[data-m]');if(!b)return;const m=b.dataset.m;S.region=m;if(m==='en')S.orig=false;saveS();const cp=location.pathname.slice(BASEP.length);go(m==='en'&&/^gt?\//.test(cp)?cp:'');header2()};
  header2();
}
function header2(){
  const R=!!(S.region==='en'&&G),EN=R&&S.orig,MD=R?'en':'kr';
  document.querySelectorAll('#rsw [data-m]').forEach(b=>{const on=b.dataset.m===MD;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});
  document.body.classList.toggle('en',EN);document.documentElement.lang=EN?'en':'ko';window.dispatchEvent(new CustomEvent('nb:region-changed'));
  const top=EN?['Today','Timeline','Markets','Library']:['오늘','타임라인','마켓','내 서재'];
  document.querySelectorAll('.topnav a').forEach((a,i)=>a.textContent=top[i]||a.textContent);
  // 하단 탭 이름은 my.js nav()가 nb:region-changed에서 다시 그림(여기서 덮어쓰면 가운데 '오늘' 시계가 사라짐)
  const T=R?G.trends:D.trends;
  const tk=T.map((t,i)=>`<a href="${R?'gt/'+i:kh(t.keyword)}" title="${TTIP}"><b>${i+1}</b>${esc(R&&!S.orig?(t.keyword_ko||t.keyword):t.keyword)}<small>${tlab(t)}</small></a>`).join('');
  const tr=R?`<button type="button" class="translate ${S.orig?'':'on'}" id="translate" title="${S.orig?'해외 뉴스를 한국어로 번역해 보기':'영어 원문으로 보기'}">${S.orig?'번역 보기':'원문 보기'}</button>`:'';
  $('#ticker').innerHTML=`<div class="lab">${ic('fire')}${R?(EN?'Global trends':'해외 트렌드'):'실시간'}</div><div class="tw" id="tw"><div class="run">${tk}<i class="sp"></i>${tk}</div></div>${tr}`;
  tickerDrag($('#tw'));
  const tb=$('#translate');if(tb)tb.onclick=()=>{S.orig=!S.orig;saveS();header2();route()};
}
/* 티커: 자동 흐름 + 마우스 드래그·터치 스와이프 */
function tickerDrag(el){if(!el)return;el.addEventListener('pointerdown',()=>el.classList.add('drag'));['pointerup','pointercancel','pointerleave'].forEach(n=>el.addEventListener(n,()=>el.classList.remove('drag')))}
const BASEP=new URL(document.baseURI).pathname;
function go(p){p=String(p||'');const u=p.startsWith('/')?p:BASEP+p.replace(/^\.\//,'');if(u!==location.pathname+location.hash)history.pushState(null,'',u);route()}
window.addEventListener('popstate',route);
const legacy=()=>{if(location.hash.startsWith('#/')){history.replaceState(null,'',BASEP+location.hash.slice(2));return true}};legacy();window.addEventListener('hashchange',()=>{if(legacy())route()});
document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download'))return;
  const h=a.getAttribute('href');if(h.startsWith('#')){e.preventDefault();window.nbAnchor?nbAnchor(h.slice(1)):document.getElementById(h.slice(1))?.scrollIntoView();return}
  const u=new URL(a.href);if(u.origin!==location.origin||!u.pathname.startsWith(BASEP)||/\.[a-z0-9]+$/i.test(u.pathname)||u.pathname.startsWith(BASEP+'admin')||u.pathname.startsWith(BASEP+'politicians')||u.pathname.startsWith(BASEP+'persons')||u.pathname.startsWith(BASEP+'history/')||/^(games|login|privacy|terms)\//.test(u.pathname.slice(BASEP.length)))return;e.preventDefault();go(u.pathname+u.hash)});
const DTITLE=document.title,DDESC=document.querySelector('meta[name=description]').content;
function setMeta(t,d){document.title=t?t+' · NewsBoard':DTITLE;document.querySelector('meta[name=description]').content=d||DDESC}
function shareBtn(){return`<button class="share" type="button" data-share>${ic('link')}${S.region==='en'&&S.orig?'Share':'공유'}</button>`}
function toast(m){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),2200)}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-share]');if(!b)return;const url=location.href.split('#')[0],title=document.title,text=document.querySelector('meta[name=description]').content;
  if(navigator.share){try{await navigator.share({title,text,url});return}catch(x){if(x.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(url);toast('링크를 복사했어요')}catch(x){prompt('링크를 복사하세요',url)}});
function route(){
  if(!D)return;setMeta();const h=decodeURIComponent(location.pathname.slice(BASEP.length)).replace(/\/+$/,'');const v=h.split('/')[0],a=h.split('/').slice(1).join('/');
  if(D.lite&&['entity','timeline','people','map'].includes(v)){const p=location.pathname;app.innerHTML='<div class="loading">기록을 불러오고 있어요…</div>';fullData().then(()=>{if(location.pathname===p)route()});return}
  const tab={'':'today',issue:'today',kw:'today',g:'today',gt:'today',entity:'people'}[v]??v;
  if(S.region==='en'&&G&&(v===''||v==='g'||v==='gt')){document.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x.dataset.v==='today'));window.scrollTo(0,0);return v==='g'?gissue(a):v==='gt'?gtrend(+a):gtoday()}
  document.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x.dataset.v===tab));
  window.scrollTo(0,0);
  ({'':today,issue:()=>issue(a),entity:()=>entity(a),kw:()=>kw(a),market:()=>a?mdetail(a):market(),timeline,people,map,archive,settings}[v]||today)();
  if(location.hash.length>1&&!location.hash.startsWith('#/')){const id=location.hash.slice(1);setTimeout(()=>window.nbAnchor&&nbAnchor(id),120)}
}

/* ---------- 마켓 위젯 ---------- */
const up=m=>m.dir==='RISING'?'up':m.dir==='FALLING'?'down':'';
const mrate=(m,d)=>`${d==='down'?'-':d==='up'?'+':''}${esc(String(m.rate??'').replace(/^[-+]/,''))}%`;/* 원자료에 부호가 이미 있어 '--5.12%'로 겹치던 문제 */
function mcard(m,big){const d=up(m),s=d==='up'?NBI('caret-up-f'):d==='down'?NBI('caret-down-f'):'';
  return`<a class="mk ${d} ${big?'big':''}" href="market/${encodeURIComponent(m.name)}" aria-label="${esc(m.name)} 자세히 보기"><span class="n">${esc(m.name)}${m.unit?`<i>${esc(m.unit)}</i>`:''}</span><b>${esc(m.price)}</b><em>${s} ${esc(String(m.diff??'').replace(/^[-+]/,''))} (${mrate(m,d)})</em>${line(m.series,120,big?44:28,d==='down'?'#2f6bff':'#ff4d2e')}</a>`}
/* ---------- 마켓 항목 상세(카드를 누르면) ---------- */
const MKI={'KOSPI':['kospi','코스피','우리나라 대표 기업(유가증권시장)의 주가를 모은 지수예요. 국내 경기와 외국인 투자 흐름을 가장 먼저 보여줘요.'],
  'KOSDAQ':['kosdaq','코스닥','중소·벤처·기술 기업 중심 시장의 지수예요. 바이오·2차전지 등 성장주의 분위기를 보여줘요.'],
  'S&P 500':[null,'S&P|뉴욕증시|미 증시|미국 증시','미국 대형주 500개로 만든 지수예요. 세계 증시의 기준점이라 우리 증시에도 영향을 줘요.'],
  'NASDAQ':[null,'나스닥|뉴욕증시|미 증시|기술주','미국 기술주 중심 지수예요. 반도체·AI 기업 흐름이 우리 IT 대형주와 함께 움직이는 경우가 많아요.'],
  '미국 USD':['usd','환율|달러|원·달러|원/달러','1달러를 사는 데 드는 원화예요. 오르면(원화 약세) 수입 물가가 오르고 수출 기업엔 유리해요.'],
  '일본 JPY(100)':['jpy','엔화|엔저|원·엔','100엔을 사는 데 드는 원화예요. 일본 여행 경비와 일본과 경쟁하는 수출 기업에 영향을 줘요.'],
  '유럽 EUR':['eur','유로','1유로를 사는 데 드는 원화예요. 유럽 경기와 유럽중앙은행 금리 결정에 따라 움직여요.'],
  '중국 CNY':['cny','위안','1위안을 사는 데 드는 원화예요. 최대 교역국인 중국 경기와 함께 움직여요.'],
  '금':[null,'금값|금 시세|안전자산','대표적인 안전자산이에요. 불안할 때·금리가 내릴 때 오르는 경향이 있어요.'],
  '은':[null,'은값|은 시세','귀금속이면서 태양광·전자 산업 재료로도 쓰여 경기에 따라 크게 움직여요.'],
  '구리':[null,'구리|원자재','전선·건설·전기차에 두루 쓰여 \'경기를 미리 알려주는 금속\'으로 불려요.'],
  'WTI 원유':[null,'유가|원유|국제유가|기름값','미국 텍사스산 원유 가격이에요. 오르면 휘발유값·물가가 따라 올라요.'],
  '미국 10년물 금리':[null,'미 국채|국채 금리|금리','미국 정부가 10년 동안 돈을 빌릴 때의 금리예요. 전 세계 대출·주택 금리의 기준이 돼요.'],
  '비트코인':[null,'비트코인|가상자산|암호화폐|코인','대표 가상자산이에요. 하루에도 크게 오르내려 투자 위험이 커요.']};
let mkES=null;const mkLoadES=()=>mkES||(mkES=fetch('data/ecos_series.json').then(r=>r.ok?r.json():null).catch(()=>null));
function mdetail(a){const m=(D.market||[]).find(x=>x.name===a);if(!m)return market();
  const info=MKI[m.name]||[null,m.name,''],d=up(m),col=d==='down'?'#2f6bff':'#ff4d2e',kw=new RegExp(info[1].replace(/[.*+?^${}()[\]\\]/g,'\\$&'));
  const news=[...D.issues.map(i=>({title:i.title,url:'issue/'+i.id,press:i.press,in:1})),...Object.values(D.sections||{}).flat()].filter(x=>kw.test(x.title)).filter((x,i,A)=>A.findIndex(y=>y.title===x.title)===i).slice(0,10);
  app.innerHTML=`<p class="mkback"><a href="market">${NBI('arrow-left')}마켓 전체</a></p>
  <section class="mkd ${d}"><small>${m.kind==='index'?'주가 지수':m.kind==='fx'?'환율':'원자재·금리·가상자산'}</small><h2>${esc(m.name)}${m.unit?` <i>${esc(m.unit)}</i>`:''}</h2>
   <div class="mkd-p"><b>${esc(m.price)}</b><em>${d==='up'?NBI('caret-up-f'):d==='down'?NBI('caret-down-f'):''} ${esc(String(m.diff??'').replace(/^[-+]/,''))} (${mrate(m,d)})</em></div>
   <p class="mkd-at">${m.at?ago(m.at)+' 기준':''}</p>
   <div class="mkd-ch card"><h3 class="sub">최근 ${m.series?.length||0}${m.kind==='commodity'?'개 시점':'거래일'}</h3>${line(m.series,640,180,col)}</div>
   <div class="mkd-long card" hidden><h3 class="sub">장기 흐름 <small>한국은행 경제통계</small></h3><div class="mkd-tabs" role="tablist"></div><div class="mkd-lc"></div><p class="fine"></p></div>
   ${info[2]?`<div class="mkd-info card">${ic('bulb')}<p>${esc(info[2])}</p></div>`:''}
   <h3 class="sub">${ic('news')}관련 뉴스</h3>${news.length?`<ul class="mkd-news">${news.map(x=>`<li><a href="${esc(x.url)}"${x.in?'':' target="_blank" rel="noopener"'}>${esc(x.title)}</a><small>${esc(x.press||'')}</small></li>`).join('')}</ul>`:'<p class="note">오늘 수집한 기사 중 관련 뉴스가 아직 없어요.</p>'}
   <p class="fine">시세는 지연될 수 있어요. 투자 권유가 아닙니다.</p></section>`;
  if(info[0])mkLoadES().then(j=>{const sr=j&&j.series&&j.series[info[0]];const box=app.querySelector('.mkd-long');if(!sr||!box||!sr.data?.length)return;box.hidden=false;
    const P=[['1개월',22],['6개월',130],['1년',260],['전체',1e9]];let cur=2;
    const draw=()=>{const L=sr.data.slice(-P[cur][1]);box.querySelector('.mkd-tabs').innerHTML=P.map((p,k)=>`<button type="button" class="${k===cur?'on':''}" data-k="${k}">${p[0]}</button>`).join('');
      const v=L.map(x=>x[1]),a0=v[0],b0=v[v.length-1],ch=(b0/a0-1)*100;box.querySelector('.mkd-lc').innerHTML=line(v,640,180,ch<0?'#2f6bff':'#ff4d2e');
      box.querySelector('.fine').textContent=`${L[0][0]} ~ ${L[L.length-1][0]} · ${ch>=0?'+':''}${ch.toFixed(1)}% · ${sr.unit||''}`};
    box.querySelector('.mkd-tabs').onclick=e=>{const b=e.target.closest('[data-k]');if(b){cur=+b.dataset.k;draw()}};draw()})}
function marketStrip(){const M=D.market||[];if(!M.length)return'';
  return`${sec('주요 증시·환율','Stock & Currency',`<a class="more" href="market">마켓 전체 ${NBI('arrow-right')}</a>`,'up')}<div class="mkrow">${M.slice(0,8).map(m=>mcard(m)).join('')}</div>`}

/* ---------- 오늘 ---------- */
function today(){
  const I=D.issues.filter(vis);if(!I.length){app.innerHTML='<div class="note">설정에서 모든 카테고리를 껐어요. <a href="settings">설정</a></div>';return}
  const L=I[0],mx=Math.max(...I.map(i=>i.score));
  const side=I.slice(0,10).map(i=>`<div class="srow" data-id="${i.id}"><div><a class="card mini" href="issue/${i.id}"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><h3>${esc(i.title)}</h3><div class="m">${ic('news')}${esc(i.press)} 외 ${i.presses-1}곳 ${i.opinion?`· ${ic('chat')}${i.opinion.total.toLocaleString()}`:''}</div></div></a></div></div>`).join('');
  const cats={};I.forEach(i=>cats[i.category]=(cats[i.category]||0)+1);
  const grid=I.map((i,k)=>{const wide=k===0||k===5;const txt=!i.image;
    return`<a class="card ic ${wide?'wide':''} ${txt?'text':''}" href="issue/${i.id}">
    ${txt?'':`<div class="img" ${bg(i.image)}><div class="rk">${i.rank}</div>${i.opinion?`<span class="cm">${ic('chat')}${i.opinion.total.toLocaleString()}</span>`:''}</div>`}
    <div class="bd">${txt?`<div class="rkt">${String(i.rank).padStart(2,'0')}</div>`:''}<div class="row"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span>${i.trend.length?`<span class="chip event">${ic('fire')}검색 급상승</span>`:''}</div>
    <h3>${esc(i.title)}</h3>${i.summary.length?`<ul>${i.summary.slice(0,wide?3:2).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}
    ${(i.flow||[]).some(f=>f.items.some(x=>x.img))?`<div class="strip">${i.flow.flatMap(f=>f.items.filter(x=>x.img).slice(0,1)).slice(0,4).map(x=>`<span ${bg(x.img)}></span>`).join('')}<small>${ic('clock')}흐름 ${i.flow.length}일</small></div>`:''}
    <div class="chips">${i.entities.slice(0,3).map(n=>chipE(n,1)).join('')}</div>
    <div class="bar"><i style="width:${(i.score/mx*100).toFixed(0)}%"></i></div>
    <div class="ft"><span>화제도 ${Math.round(i.score)} · 언론사 ${i.presses}곳</span><span>자세히 ${NBI('arrow-right')}</span></div></div></a>`}).join('');
  const P=D.entities.filter(e=>e.type==='person').slice(0,12);
  const pcs=P.map(e=>`<a class="card pc" href="${eh(e.name)}">${av(e)}<b>${esc(e.name)}</b><small>${esc(e.wiki?.desc||'')}</small>${spark(e.daily)}<span class="last">${e.timeline[0]?esc(e.timeline[0].title):''}</span></a>`).join('');
  const tr=D.trends.slice(0,10).map((t,i)=>`<a class="tr" href="${kh(t.keyword)}">${th(t.image,'tt','search')}<span class="n">${i+1}</span><b>${esc(t.keyword)}</b><span class="tv" title="${TTIP}">${tlab(t)}${t.articles?` · 기사 ${t.articles}`:''}</span></a>`).join('');
  const W=(D.words||[]).slice(0,6);
  app.innerHTML=`
  <section class="hero">
    <div class="rdeck" tabindex="0" aria-roledescription="카드 덱" aria-label="오늘의 이슈 카드. 좌우로 넘겨 보세요">
     <div class="rstage">${I.slice(0,10).map((i,k)=>`<article class="lead rcard" data-i="${k}" data-id="${i.id}" data-img="${esc([i.image,...(i.gallery||[]).map(g=>g.img)].filter(Boolean).filter((u,k,A)=>A.indexOf(u)===k).slice(0,6).join('|'))}"><div class="rimg"></div><a class="rlink" draggable="false" href="issue/${i.id}" aria-label="${esc(i.title)}"></a><button type="button" class="rlater" data-later="${i.id}" aria-label="나중에 읽기" aria-pressed="false">${window.GI?GI('bookmark-plus'):''}<span>나중에 읽기</span></button><div class="in"><div class="no">${String(i.rank).padStart(2,'0')}</div><span class="cat ${i.category}">${ic(i.category)}${i.category}</span>
      <h1>${esc(i.title)}</h1><p>${esc(i.summary.join(' '))}</p>
      <div class="schips">${schips(i,'issue/'+i.id)}</div></div></article>`).join('')}</div>
     <div class="rctl"><button type="button" class="rbtn" data-d="-1" aria-label="이전 이슈" disabled>${NBI('chevron-left')}</button><span class="rpos"><b>01</b> / ${String(Math.min(10,I.length)).padStart(2,'0')}</span><span class="rbar"><i style="width:${100/Math.min(10,I.length)}%"></i></span><span class="rhint">옆으로 넘겨 보세요</span><button type="button" class="rbtn" data-d="1" aria-label="다음 이슈">${NBI('chevron-right')}</button></div>
    </div>
    <div class="side">${side}</div>
  </section>
  ${marketStrip()}
  ${sec('오늘의 이슈 TOP 10','Today’s Top 10',`<a class="more" href="settings">${ic('gear')}카테고리 설정</a>`,'fire')}
  <div class="catbar">${Object.entries(cats).map(([c,n])=>`<i style="flex:${n};background:${CATC[c]}"></i>`).join('')}</div>
  <div class="legend">${Object.entries(cats).map(([c,n])=>`<span style="--c:${CATC[c]}">${c} ${n}</span>`).join('')}</div>
  <div class="grid10">${grid}</div>
  ${sec('실시간 검색어','Google Trends KR','<span class="more">눌러서 오늘·과거 흐름 보기</span>','search')}
  <div class="trends">${tr}</div>
  ${W.length?sec('오늘의 단어','Words of the day',`<span class="more">문해력 한 스푼</span>`,'quiz')+`<div class="words">${W.map(wordCard).join('')}</div>`:''}
  ${sec('화제의 인물','People in the news',`<a class="more" href="people">전체 ${NBI('arrow-right')}</a>`,'user')}
  <div class="hs">${pcs}</div>
  ${sec('관계로 보는 오늘','Relation map',`<a class="more" href="map">크게 보기 ${NBI('arrow-right')}</a>`,'graph')}
  <div class="card mapwrap mini scan" id="mapmini"></div>`;
  {const mm=$('#mapmini');if(window.IntersectionObserver){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();if(mm.isConnected)graph(mm,true)}},{rootMargin:'600px 0px'});io.observe(mm)}else graph(mm,true)}
  window.nbDeck&&nbDeck($('.rdeck'));
}
function wordCard(w){return`<div class="card term word"><div class="wt">${w.wiki.thumb?`<span class="wi" ${bg(w.wiki.thumb)}></span>`:`<span class="wi noimg">${ic('book')}</span>`}<div><h4>${esc(w.word)}</h4><em>${esc(w.wiki.desc||'오늘 기사 '+w.count+'회 등장')}</em></div></div>
  <p class="easy">${w.ai?AIB:''}${esc(w.easy)}</p>
  <div class="ex">${w.examples.slice(0,2).map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><q>${esc(x.title)}</q>${pp(x.press,x.url)}</a>`).join('')}</div>
  <a class="src1" href="${esc(w.wiki.url)}" target="_blank" rel="noopener">${ic('book')}출처: 위키백과</a></div>`}

/* ---------- 이슈 상세 ---------- */
function biasB(s){if(!s.bias)return'';return`<span class="bias ${s.bias.lean}" title="${esc(s.bias.reason)}">${ic('alert')}${s.bias.lean==='left'?'좌편향 주의':'우편향 주의'}</span>`}
function issue(id){
  const i=D.issues.find(x=>x.id===id);if(!i){today();app.insertAdjacentHTML('afterbegin','<div class="note">공유된 이슈가 지금 TOP 10에서 내려갔어요. 지난 이슈는 <a href="archive">아카이브</a>에서 볼 수 있어요.</div>');return}
  setMeta(i.title,Array.isArray(i.summary)?i.summary.join(' '):i.summary);
  const ents=i.entities.map(ent).filter(Boolean),terms=[...i.entities,...i.keywords];
  app.innerHTML=`<div class="bkrow"><a class="back" href="./">${NBI('arrow-left')} 오늘의 TOP 10</a>${shareBtn()}</div>
  <section class="dgal" aria-label="이 사건 사진"></section>
  <article class="dhead card ds-head"><div class="bd"><div class="ov"><span class="ds-badge cat c-${i.category}">${ic(i.category)}${i.category}</span><span class="ds-badge rank">오늘의 이슈 <b>${i.rank}</b>위</span></div><h1 class="ds-title">${esc(i.title)}</h1>
    <div class="schips light">${schips(i,'')}</div>
    <div class="chips">${i.entities.map(n=>chipE(n)).join('')}${i.keywords.filter(k=>!i.entities.includes(k)).slice(0,4).map(k=>`<span class="ds-tag">#${esc(k)}</span>`).join('')}</div></div></article>
  <nav class="toc ds-tabs"><a href="#s-sum">${ic('news')}<span>요약</span></a><a href="#s-flow">${ic('clock')}<span>흐름</span></a><a href="#related">${ic('news')}<span>관련 기사</span></a><a href="#press">${ic('press')}<span>언론사</span></a><a href="#comments">${ic('chat')}<span>댓글</span></a></nav>
  <div class="two"><div>
   <section id="s-sum" class="ds-sec">${sec('한눈에 보기','Summary','','news')}<div class="summary ds-sum">${i.summary.map((s,k)=>`<div class="sl"><b>${k+1}</b><p class="${k===0?'ds-lead':''}">${DS.emph(s,terms)}</p></div>`).join('')||'<p>요약을 가져오지 못했어요.</p>'}</div></section>
   ${DS.deep(i)}
   ${DS.flow(i)}
   ${DS.past(i)}
  </div><aside>
   <section id="comments" class="anc ds-sec">${sec('댓글 · 사람들의 반응','Comments','','chat')}${DS.opinion(i)}</section>
   ${ents.length?sec('등장 인물·키워드','Who’s who','','user')+`<div class="who">${ents.map(e=>`<a class="card whoc" href="${eh(e.name)}">${av(e,'av s')}<div><b>${esc(e.name)}</b><small>${esc(e.wiki?.desc||TYPE[e.type])}</small></div></a>`).join('')}</div>`:''}
  </aside></div>
  ${DS.press(i)}${DS.related(i)}`;
  DS.bind(app);
  const tabs=app.querySelector('.ds-tabs');if(tabs&&'IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)tabs.querySelectorAll('a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id))}),{rootMargin:'-45% 0px -50% 0px'});['s-sum','s-flow','related','press','comments'].forEach(k=>{const el=document.getElementById(k);el&&io.observe(el)})}
  const gl=(i.gallery||[]).length?i.gallery:(i.image?[{img:i.image,press:i.press,url:i.url}]:[]);window.nbGallery?nbGallery($('.dgal'),gl):$('.dgal').remove();
}
/* 슬림 지표 칩: 누르면 상세 해당 섹션으로 */
function schips(i,base){const op=i.opinion;return`<a class="schip" href="${base}#related">${ic('news')}관련 기사 <b>${i.mentions}</b></a><a class="schip" href="${base}#press">${ic('press')}언론사 <b>${i.presses}</b></a><a class="schip" href="${base}#comments">${ic('chat')}댓글 <b>${op?op.total.toLocaleString():'–'}</b></a><span class="schip hot" title="여러 포털·언론사 노출을 합친 점수">${ic('fire')}화제도 <b>${Math.round(i.score)}</b></span>`}
/* 보도 언론사: 어느 곳이 몇 건 다뤘는지 */
function pressSec(i){const m=new Map();(i.sources||[]).forEach(s=>{const k=s.press||'';if(!k)return;const o=m.get(k)||{n:0,s};o.n++;m.set(k,o)});
  const L=[...m.entries()].sort((a,b)=>b[1].n-a[1].n);
  return`<section id="press" class="anc">${sec('보도 언론사','Who covered it',`<span class="more">${L.length}곳</span>`,'press')}<div class="plg">${L.map(([n,o])=>`<a class="plc" href="${esc(o.s.url)}" target="_blank" rel="noopener">${plogo(n,o.s.url,'plo')}<span><b>${esc(n)}</b><small>${o.n}건 · ${esc(o.s.title)}</small></span></a>`).join('')}</div></section>`}

/* ---------- 실시간 키워드 ---------- */
function kw(k){
  const t=D.trends.find(x=>x.keyword===k);if(!t)return today();
  setMeta(t.keyword+' — 검색어 흐름',(t.ai&&t.ai.summary)||'');
  const ai=t.ai||{};const g={};(t.past||[]).forEach(x=>{const y=x.t.slice(0,4);(g[y]=g[y]||[]).push(x)});
  const now=new Date().getFullYear()+'';
  app.innerHTML=`<div class="bkrow"><a class="back" href="./">${NBI('arrow-left')} 오늘</a>${shareBtn()}</div>
  <section class="kwh card" ${bg(t.image||(t.today[0]||{}).img)}><div class="in"><span class="chip event">${ic('fire')}실시간 검색 ${D.trends.indexOf(t)+1}위 · <span title="${TTIP}">${tlab(t)}</span></span><h1>${esc(t.keyword)}</h1></div></section>
  ${sec('오늘 무슨 일이?','Today','','clock')}
  ${ai.today?`<div class="mean big">${AIB}<p>${esc(ai.today)}</p></div>`:''}
  <div class="tgrid">${(t.today||[]).map((x,j)=>`<a class="card tn ${j===0?'first':''}" href="${esc(x.url)}" target="_blank" rel="noopener">${th(x.img,'img')}<div class="bd"><h3>${esc(x.title)}</h3>${x.body?`<p>${esc(x.body.slice(0,90))}…</p>`:''}${meta(x,1)}</div></a>`).join('')||'<div class="note">오늘 기사를 찾지 못했어요.</div>'}</div>
  ${sec('과거에는 무슨 일이?','Past timeline','','history')}
  ${ai.context?`<div class="mean">${AIB}<p>${esc(ai.context)}</p></div>`:''}
  <div class="flow">${Object.entries(g).sort((a,b)=>b[0]-a[0]).map(([y,a])=>`<div class="fg"><div class="fd"><b>${y===now?'올해':y+'년'}</b>${cnt(a.length,'news','기사 수')}</div>${a.slice(0,6).map((x,j)=>`<a class="fe ${j===0?'first':''}" href="${esc(x.url)}" target="_blank" rel="noopener">${th(x.img,'fi')}<div><h5>${esc(x.title)}</h5>${x.body&&j===0?`<p>${esc(x.body.slice(0,100))}…</p>`:''}${meta(x)}</div></a>`).join('')}</div>`).join('')}</div>
  <p class="fine">네이버 뉴스 검색(기간별 관련도순)에서 수집했습니다.</p>`;
}

/* ---------- 마켓·정책 섹터 ---------- */
const POLW=/(금리|부동산|아파트|주택|전세|대출|증시|코스피|코스닥|주가|주식|환율|세금|과세|정책|규제|기준금리|한은|한국은행|금통위|공급|청약|재건축|배당|주주|밸류업|연준|Fed)/;
function market(){
  const M=D.market||[],ST=D.stocks||[];
  const idx=M.filter(m=>m.kind==='index'),fx=M.filter(m=>m.kind==='fx'),cm=M.filter(m=>m.kind==='commodity');
  const rel=D.issues.filter(i=>i.category==='경제'||POLW.test(i.title+i.keywords.join(' ')));
  const news=Object.entries(D.sections).flatMap(([k,a])=>a).filter(x=>POLW.test(x.title)).filter((x,i,a)=>a.findIndex(y=>y.title===x.title)===i).slice(0,12);
  const heat=ST.slice().sort((a,b)=>b.cap-a.cap).slice(0,40);const tot=heat.reduce((s,x)=>s+Math.sqrt(x.cap),0);
  const hc=r=>r>=3?'#d93025':r>=1?'#ef6c5a':r>0?'#f5aaa0':r===0?'#c9cede':r>-1?'#a9c1f5':r>-3?'#5d8ef0':'#1f5fd6';
  const low=ST.filter(x=>x.pbr&&x.pbr>0).sort((a,b)=>a.pbr-b.pbr).slice(0,12);
  const at=idx[0]?.at;
  app.innerHTML=`${sec('마켓·정책','Market & Policy',`<span class="more">${at?ago(at)+' 기준':''}</span>`,'chart')}
  <p class="lede">주식·부동산·금리, 그리고 이를 움직이는 정치·정책 뉴스를 한곳에 모았어요.</p>
  <h3 class="sub">${ic('chart')}주요 지수</h3><div class="mkrow wide">${idx.map(m=>mcard(m,1)).join('')}</div>
  <h3 class="sub">${ic('coin')}환율</h3><div class="mkrow">${fx.map(m=>mcard(m)).join('')}</div>
  ${cm.length?`<h3 class="sub">${ic('spark')}원자재·금리·코인 <small>3개월</small></h3><div class="mkrow">${cm.map(m=>mcard(m)).join('')}</div>`:''}
  ${heat.length?`<h3 class="sub">${ic('fire')}코스피 시가총액 상위 40 등락 히트맵</h3><div class="heat">${heat.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener" style="flex:${(Math.sqrt(x.cap)/tot*100).toFixed(2)} 1 0;background:${hc(x.rate)}"><b>${esc(x.name)}</b><span>${x.rate>0?'+':''}${x.rate.toFixed(2)}%</span></a>`).join('')}</div>
  <div class="legend"><span style="--c:#d93025">+3%↑</span><span style="--c:#f5aaa0">상승</span><span style="--c:#a9c1f5">하락</span><span style="--c:#1f5fd6">-3%↓</span></div>`:''}
  ${low.length?`<h3 class="sub">${ic('coin')}PBR 낮은 종목 <small>코스피 시총 상위 60 중 · 저평가 지표 참고용</small></h3>
  <p class="lede sm">PBR이 1보다 낮으면 회사가 가진 순자산보다 주가가 싸게 거래된다는 뜻이에요. 막대가 짧을수록 더 ‘싸게’ 평가받는 중이에요.</p><div class="pbrb card">${low.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><span class="nm">${esc(x.name)}</span><span class="bar"><i style="width:${Math.min(100,x.pbr/1.5*100).toFixed(0)}%"></i><em style="left:${(1/1.5*100).toFixed(1)}%"></em></span><b>${x.pbr.toFixed(2)}</b><span class="dchg ${x.rate>0?'up':x.rate<0?'down':'flat'}">${x.rate>0?'+':''}${x.rate.toFixed(2)}%</span></a>`).join('')}<div class="pbrl"><span>0</span><span style="left:${(1/1.5*100).toFixed(1)}%">PBR 1</span></div></div>
  <p class="fine">PBR·PER·배당수익률은 네이버 증권 표시값이며 투자 권유가 아닙니다.</p>`:''}
  ${rel.length?sec('오늘의 경제·정책 이슈','Policy issues','','fire')+`<div class="side">${rel.map(i=>`<a class="card mini" href="issue/${i.id}"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><h3>${esc(i.title)}</h3></div></a>`).join('')}</div>`:''}
  ${news.length?sec('금리·부동산·증시 헤드라인','Headlines','','news')+`<div class="srcl2">${news.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}<span class="meta">${pp(x.press,x.url)}${ts(x.time,1)}</span></a>`).join('')}</div>`:''}
  <p class="fine">지수·환율: 네이버 증권, 원자재·미국채·비트코인: Yahoo Finance. 지연 시세일 수 있습니다.</p>`;
}

/* ---------- 세로 타임라인 (줌) ---------- */
const ZK={hour:t=>{const d=new Date(t);return`${d.getMonth()+1}월 ${d.getDate()}일 ${d.getHours()}시`},day:t=>{const d=new Date(t);return`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`},month:t=>{const d=new Date(t);return`${d.getFullYear()}년 ${d.getMonth()+1}월`},year:t=>new Date(t).getFullYear()+'년'};
function vtl(el,items,z,limit=4){
  const g=[];items.forEach(x=>{const k=ZK[z](x.t);if(!g.length||g[g.length-1].k!==k)g.push({k,a:[]});g[g.length-1].a.push(x)});
  if(!g.length){el.innerHTML='<div class="note">아직 쌓인 기록이 없어요.</div>';return}
  let shown=Math.min(g.length,z==='year'?20:12);
  const draw=()=>{el.innerHTML=g.slice(0,shown).map(({k,a})=>{const s=a.slice().sort((p,q)=>(q.related||0)-(p.related||0));
    return`<div class="vg"><h4>${k}${cnt(a.length,'news','기사 수')}</h4>${s.slice(0,limit).map((x,j)=>`<a class="ve ${j===0&&x.related>2?'big':''}" href="${esc(x.url)}" target="_blank" rel="noopener">${x.img&&j<2?`<span class="vth" ${bg(x.img)}></span>`:''}${esc(x.title)}<span class="meta">${pp(x.press,x.url)}${ts(x.t)}${x.related>1?cnt('+'+x.related,'','묶음 기사'):''}</span></a>`).join('')}</div>`}).join('')+(shown<g.length?`<div class="ve moreb">이전 기록 더 보기 (${g.length-shown}개 구간)</div>`:'');
    const m=el.querySelector('.moreb');if(m)m.onclick=()=>{shown+=12;draw()}};draw();
}
function eraChart(items,z){const fmt=z==='year'?(t=>t.slice(0,4)):(t=>t.slice(0,7));const c={};items.forEach(x=>{const k=fmt(x.t);c[k]=(c[k]||0)+1});
  const ks=Object.keys(c).sort();if(!ks.length)return'';const all=[];let [y,m]=ks[0].split('-').map(Number);const [ey,em]=ks[ks.length-1].split('-').map(Number);
  if(z==='year'){for(let k=y;k<=ey;k++)all.push(String(k))}else{while(y<ey||(y===ey&&m<=em)){all.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){m=1;y++}}}
  const bw=z==='year'?44:16,H=130,mx=Math.max(...Object.values(c));const W=Math.max(all.length*bw+20,300);
  return`<div class="era"><svg width="${W}" height="${H+24}">${all.map((k,i)=>{const v=c[k]||0,h=v/mx*(H-10);return`<rect x="${i*bw+10}" y="${H-h}" width="${bw-4}" height="${h}" rx="3" fill="${v===mx?'#ff4d2e':'#2f6bff'}" opacity="${v?1:.15}"><title>${k}: ${v}건</title></rect>${(z==='year'||k.endsWith('-01'))?`<text x="${i*bw+10}" y="${H+16}">${z==='year'?k:k.slice(0,4)}</text>`:''}`}).join('')}</svg></div>`}

/* ---------- 인물 상세 ---------- */
function entity(n){
  const e=ent(n);if(!e)return people();
  setMeta(e.name+' — 타임라인',(e.wiki&&e.wiki.desc)||'');
  const tl=e.timeline,first=tl.length?tl[tl.length-1].t:null;
  const iss=e.issues.map(id=>D.issues.find(x=>x.id===id)).filter(Boolean);
  const w=why(e),wi=w.issue;
  app.innerHTML=`<div class="bkrow"><a class="back" href="people">${NBI('arrow-left')} 화제</a>${shareBtn()}</div>
  <section class="ehero card" ${bg(wi&&wi.image||e.wiki?.thumb)}><div class="in"><span class="chip ${e.type}">${esc(SUB.find(x=>x[0]===subtype(e))?.[1]||TYPE[e.type])}</span><h1>${esc(e.name)}</h1>
   <p class="big">${wi?`지금 화제인 이유 — ${esc(wi.title)}`:esc(e.timeline[0]?.title||e.wiki?.desc||'')}</p>${wi?`<a class="go" href="issue/${wi.id}">이슈 자세히 보기 ${NBI('arrow-right')}</a>`:''}</div></section>
  <div class="two"><div>
   <section class="card prof"><div class="row">${av(e)}<div><span class="chip ${e.type}">${TYPE[e.type]}</span><h1>${esc(e.name)}</h1><p>${esc(e.wiki?.desc||'')}</p></div></div>
    ${e.wiki?.extract?`<p>${esc(e.wiki.extract)} ${e.wiki.url?`<a href="${esc(e.wiki.url)}" target="_blank" style="color:var(--blue)">위키백과 ${NBI('arrow-up-right')}</a>`:''}</p>`:''}
    <div class="kpis"><div><b>${e.score}</b><span>오늘 화제도</span></div><div><b>${tl.length}</b><span>수집된 기록</span></div><div><b>${first?new Date(first).getFullYear():'-'}</b><span>가장 오래된 기록</span></div></div></section>
   ${sec('시대별 보도량','Coverage by era','<div class="zoom" id="ez"><button data-z="month" class="on">월</button><button data-z="year">연</button></div>','chart')}
   <div class="card" style="padding:10px 14px" id="era"></div>
   ${sec(esc(e.name)+' 타임라인','Timeline','<div class="zoom" id="tz"><button data-z="hour">시간</button><button data-z="day" class="on">일</button><button data-z="month">월</button><button data-z="year">시대</button></div>','clock')}
   <div class="vt" id="etl"></div>
  </div><aside>
   ${iss.length?sec('오늘 관련 이슈','Today','','fire')+`<div class="side">${iss.map(i=>`<a class="card mini" href="issue/${i.id}"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><h3>${esc(i.title)}</h3></div></a>`).join('')}</div>`:''}
   ${e.related.length?sec('함께 언급된','Related','','graph')+`<div class="chips">${e.related.map(r=>chipE(r.name)).join('')}</div>`:''}
   ${e.history.length>1?sec('NewsBoard 누적 화제도','Daily score','','chart')+`<div class="card" style="padding:12px">${line(e.history.map(x=>x[1]),300,60,'#2f6bff')}</div>`:'<div class="note">매시간 수집이 누적되면 일자별 화제도 그래프가 이곳에 쌓입니다.</div>'}
  </aside></div>`;
  const drawE=z=>{$('#era').innerHTML=eraChart(tl,z);const x=$('#era .era');if(x)x.scrollLeft=1e5};drawE('month');
  $('#ez').onclick=ev=>{const z=ev.target.dataset.z;if(!z)return;$('#ez').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));drawE(z)};
  const drawT=z=>vtl($('#etl'),z==='hour'?tl.filter(x=>Date.now()-new Date(x.t)<3*864e5):tl,z,z==='year'?6:4);drawT('day');
  $('#tz').onclick=ev=>{const z=ev.target.dataset.z;if(!z)return;$('#tz').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));drawT(z)};
}

/* ---------- 타임라인 비교 ---------- */
// 선택한 대상 전체 기록에서 날짜별·대상별 최대 2건씩 골고루 섞어 한 이슈가 과거 흐름을 독점하지 않게 함
function mixFeed(es){const seen=new Set(),out=[];
  es.forEach(e=>{const per={};e.timeline.forEach(x=>{const k=ZK.day(x.t);if(seen.has(x.url)||(per[k]||0)>=2)return;per[k]=(per[k]||0)+1;seen.add(x.url);out.push({...x,title:`[${e.name}] `+x.title})})});
  return out.sort((a,b)=>b.t<a.t?-1:1)}
function timeline(){
  let sel=D.entities.slice(0,5).map(e=>e.name),z='month';
  app.innerHTML=`${sec('타임라인 비교','Swimlane','','clock')}
  <p class="lede">인물·장소·기관을 골라 같은 시간축 위에 겹쳐 보세요. 원이 클수록 그 시기에 기사가 많았습니다.</p>
  <div class="chips" id="pick" style="margin:14px 0"></div>
  <div class="zoom" id="lz"><button data-z="day">최근 60일</button><button data-z="month" class="on">월(2년)</button><button data-z="year">시대(연)</button></div>
  <div class="card era" id="lanes" style="margin-top:12px;padding:16px"></div>
  ${sec('최신 기록 흐름','Latest','','news')}<div class="vt" id="mix"></div>`;
  const pick=()=>{$('#pick').innerHTML=D.entities.map(e=>`<button class="chip ${sel.includes(e.name)?e.type:'off'}" data-n="${esc(e.name)}">${esc(e.name)}</button>`).join('')};
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
    vtl($('#mix'),mixFeed(es),'day',6)};
  $('#pick').onclick=ev=>{const n=ev.target.dataset.n;if(!n)return;sel=sel.includes(n)?sel.filter(x=>x!==n):[...sel,n].slice(-7);draw()};
  $('#lz').onclick=ev=>{if(!ev.target.dataset.z)return;z=ev.target.dataset.z;$('#lz').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));draw()};
  draw();
}

/* ---------- 화제의 인물 ---------- */
const SUB=[['person','인물','user'],['company','기업','coin'],['place','장소','spark'],['inst','기관·단체','news'],['issue','사건·정책','fire']];
const subtype=e=>e.type==='org'?(/기업|회사|주식회사|그룹|은행|증권|전자|자동차|브랜드|제조|통신사|게임/.test((e.wiki?.desc||'')+(e.wiki?.extract||'').slice(0,60))?'company':'inst'):e.type;
function why(e){const i=e.issues.map(id=>D.issues.find(x=>x.id===id)).filter(Boolean)[0];const td=e.timeline.filter(x=>Date.now()-new Date(x.t)<864e5).length;
  return{issue:i,text:i?`‘${i.title}’ 관련`:(e.timeline[0]?`최근: ${e.timeline[0].title}`:''),n:td||e.timeline.length}}
function people(){
  let f=sessionStorage.getItem('nb-sub')||'person';
  app.innerHTML=`${sec('화제','Trending people · companies · places','','fire')}<p class="lede">지금 뉴스에 오르내리는 대상들을 분류별로 모았어요. 카드마다 연도별 히스토리를 보여줍니다.</p><div class="filters subt" id="f">${SUB.map(([k,v,icn])=>`<button data-f="${k}" class="${k===f?'on':''}">${ic(icn)}${v}</button>`).join('')}</div><div id="pg"></div>`;
  const draw=()=>{sessionStorage.setItem('nb-sub',f);
    if(f==='issue'){$('#pg').innerHTML=`<div class="plist">${D.issues.filter(vis).map(i=>`<a class="card pcard" href="issue/${i.id}"><div class="ph">${th(i.image,'av')}<div><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><b>${esc(i.title)}</b><span class="meta">${cnt(i.presses,'press','언론사')}${cnt(i.mentions,'news','기사')}</span></div></div>
      <ol class="mtl">${(i.flow||[]).slice(0,5).map(fl=>`<li><time class="ts">${fl.date.slice(5).replace('-','.')}</time><span>${esc(fl.items[0]?.title||'')}</span></li>`).join('')}</ol><span class="ft">사건의 흐름 보기 ${NBI('arrow-right')}</span></a>`).join('')}</div>`;return}
    const L=D.entities.filter(e=>subtype(e)===f);
    $('#pg').innerHTML=L.length?`<div class="plist">${L.map(e=>{const yrs={};e.timeline.forEach(x=>{const y=x.t.slice(0,4);if(!yrs[y])yrs[y]=x});const w=why(e);
    return`<a class="card pcard" href="${eh(e.name)}"><div class="ph">${av(e)}<div><b>${esc(e.name)}</b><small>${esc(e.wiki?.desc||'')}</small></div></div>${w.text?`<p class="why">${esc(w.text)}</p>`:''}${spark(e.daily,300,36)}
    <ol class="mtl">${Object.entries(yrs).sort((a,b)=>b[0]-a[0]).slice(0,4).map(([y,x])=>`<li><time class="ts">${y}</time><span>${esc(x.title)}</span></li>`).join('')}</ol><span class="ft">${cnt(e.timeline.length,'clock','기록')}타임라인 보기 ${NBI('arrow-right')}</span></a>`}).join('')}</div>`:'<div class="note">오늘은 이 분류에 해당하는 대상이 없어요.</div>'};
  $('#f').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;f=b.dataset.f;$('#f').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()};draw();
}

/* ---------- 관계맵 ---------- */
function map(){
  app.innerHTML=`${sec('키워드 관계맵','Relation map','','graph')}<p class="lede">오늘의 이슈(사각형)와 인물·장소·기관(원)이 같은 기사에 함께 등장하면 선으로 이어집니다. 노드를 끌어보고, 눌러서 상세로 이동하세요.</p>
  <div class="legend"><span style="--c:#ff4d2e">인물</span><span style="--c:#11a683">장소</span><span style="--c:#7a4dff">기관·기업</span><span style="--c:#ffb020">키워드</span><span style="--c:#0f1630">이슈</span></div>
  <div class="card mapwrap scan" id="mapbig"></div>
  ${sec('노드는 왜 여기에?','Why each node','','search')}
  <ul class="whyl">${D.entities.map(e=>{const w=why(e),st=subtype(e);return`<li><a href="${eh(e.name)}">${entc(e.name,e.type)}<span class="wt"><span class="tag">${esc(SUB.find(x=>x[0]===st)?.[1]||'')}</span>${w.issue?`<span class="why">${esc(w.text)}</span>`:''}</span>${cnt(w.n,'news','관련 기사')}</a></li>`}).join('')}
  ${D.issues.filter(vis).map(i=>`<li><a href="issue/${i.id}"><span class="ent issue"><b class="rkn">${i.rank}</b>이슈</span><span class="wt"><span class="why strong">${esc(i.title)}</span></span>${cnt(i.presses,'press','보도 언론사')}</a></li>`).join('')}</ul>`;graph($('#mapbig'),false);
}
function graph(el,mini){
  /* 결정적(시드) 레이아웃: 화면에 그리기 전에 시뮬레이션을 끝내고 고정 → 튐 없음 */
  const W=el.clientWidth||360,H=el.clientHeight||460,col={person:'#ff4d2e',place:'#11a683',org:'#7a4dff',event:'#ffb020'};
  const small=W<500,fs=mini||small?10.5:12;
  const N=[],idx={},E=[];
  const cut=(s,m)=>s.length>m?s.slice(0,m-1)+'…':s;
  D.entities.forEach(e=>{const media=entityMedia(e);idx[e.name]=N.length;N.push({id:e.name,lab:cut(e.name,small?7:10),t:e.type,r:Math.min(small?17:22,(small?7:8)+Math.sqrt(e.score)/(small?2.2:1.6)),href:eh(e.name),img:media.url,kind:media.kind})});
  D.issues.filter(vis).forEach(i=>{idx[i.id]=N.length;N.push({id:i.id,lab:cut(i.rank+'위 '+i.keywords.slice(0,2).join('·'),small?8:12),t:'issue',r:small?11:14,href:'issue/'+i.id});i.entities.forEach(n=>{if(n in idx)E.push([idx[i.id],idx[n],3])})});
  D.links.forEach(l=>{if(l.a in idx&&l.b in idx)E.push([idx[l.a],idx[l.b],l.n])});
  // 라벨 폭까지 포함한 충돌 반경
  N.forEach(n=>{n.lw=n.lab.length*fs*.92;n.cr=Math.max(n.r,n.lw/2)+4;n.ch=n.r+fs+6});
  let seed=0;for(const n of N)for(const c of n.id)seed=(seed*31+c.charCodeAt(0))>>>0;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const pad=small?14:24,cx=W/2,cy=H/2;
  N.forEach((n,i)=>{const a=i*2.39996+rnd()*.3,rr=Math.sqrt((i+.5)/N.length);n.x=cx+Math.cos(a)*rr*(W/2-pad-n.cr);n.y=cy+Math.sin(a)*rr*(H/2-pad-n.ch);n.vx=n.vy=0});
  const area=(W-2*pad)*(H-2*pad),k=Math.sqrt(area/Math.max(N.length,1)),L=k*.9;
  const clamp=n=>{n.x=Math.max(pad+n.cr,Math.min(W-pad-n.cr,n.x));n.y=Math.max(pad+n.r,Math.min(H-pad-n.ch,n.y))};
  for(let it=0,T=k*.5;it<420;it++,T*=.988){
    N.forEach(n=>{n.fx=0;n.fy=0});
    for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){const a=N[i],b=N[j];let dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy)||.01;if(d>k*1.6)continue;const f=k*k/d/d*.35;a.fx+=dx*f;a.fy+=dy*f;b.fx-=dx*f;b.fy-=dy*f}
    E.forEach(([i,j])=>{const a=N[i],b=N[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01,f=(d-L)/d*.08;a.fx+=dx*f;a.fy+=dy*f;b.fx-=dx*f;b.fy-=dy*f});
    N.forEach(n=>{n.fx+=(cx-n.x)*.05*Math.min(1,H/W);n.fy+=(cy-n.y)*.05*Math.min(1,W/H);const m=Math.hypot(n.fx,n.fy)||1,s=Math.min(m,Math.max(T,1));n.x+=n.fx/m*s;n.y+=n.fy/m*s;clamp(n)});
    // 충돌(사각형 근사: 라벨 폭 × 원+라벨 높이)
    for(let p=0;p<(it>380?6:2);p++)for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){const a=N[i],b=N[j],ox=a.cr+b.cr-Math.abs(a.x-b.x),oy=(a.ch+b.ch)/1.6-Math.abs(a.y-b.y);if(ox>0&&oy>0){if(ox<oy){const s=(a.x<b.x?-1:1)*ox/2;a.x+=s;b.x-=s}else{const s=(a.y<b.y?-1:1)*oy/2;a.y+=s;b.y-=s}clamp(a);clamp(b)}}
  }
  N.forEach(n=>{n.homeX=n.x;n.homeY=n.y;n.vx=0;n.vy=0});
  const NS='http://www.w3.org/2000/svg';el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="키워드 관계맵"><defs>${N.map((n,i)=>n.img?`<pattern id="p${i}" width="1" height="1" patternContentUnits="objectBoundingBox"><image href="${esc(n.img)}" width="1" height="1" preserveAspectRatio="${n.kind==='logo'||n.kind==='flag'?'xMidYMid meet':'xMidYMid slice'}"/></pattern>`:'').join('')}</defs><g class="vp"><g class="ed"></g><g class="nd"></g></g></svg>${mini?'':`<div class="mapfield" aria-hidden="true"><b>LIVE RELATION FIELD</b><span>인물 · 장소 · 기관</span></div><div class="mapzoom"><button type="button" data-z="1.25" aria-label="확대">+</button><button type="button" data-z="0.8" aria-label="축소">−</button><button type="button" data-z="0" aria-label="원래대로">⟲</button></div>`}`;
  const svg=el.querySelector('svg'),vp=svg.querySelector('.vp'),ge=svg.querySelector('.ed'),gn=svg.querySelector('.nd');
  const near=N.map(()=>new Set());E.forEach(([a,b])=>{near[a].add(b);near[b].add(a)});
  const lines=E.map(([a,b,w])=>{const l=document.createElementNS(NS,'line');l.setAttribute('stroke','#9ca9c6');l.setAttribute('stroke-opacity','0.52');l.setAttribute('stroke-width',Math.min(1.45,.36+w*.13));l.setAttribute('vector-effect','non-scaling-stroke');ge.appendChild(l);return l});
  const nodes=N.map((n,i)=>{const g=document.createElementNS(NS,'g');g.setAttribute('class','node '+n.t);
    g.innerHTML=(n.t==='issue'?`<rect x="${-n.r}" y="${-n.r*.7}" width="${n.r*2}" height="${n.r*1.4}" rx="5" fill="#0f1630"/>`:`<circle r="${n.r}" fill="${n.img?`url(#p${i})`:col[n.t]}" stroke="${col[n.t]}" stroke-width="${n.img?'2':'3'}"/>`)+`<text y="${n.r+fs+2}" text-anchor="middle" style="font-size:${fs}px">${esc(n.lab)}</text><title>${esc(n.t==='issue'?n.lab:n.id)}</title>`;
    gn.appendChild(g);return g});
  const draw=()=>{E.forEach(([i,j],k)=>{const l=lines[k];l.setAttribute('x1',N[i].x);l.setAttribute('y1',N[i].y);l.setAttribute('x2',N[j].x);l.setAttribute('y2',N[j].y)});nodes.forEach((g,i)=>g.setAttribute('transform',`translate(${N[i].x.toFixed(1)},${N[i].y.toFixed(1)})`))};draw();
  // 보기 변환(확대·이동) — 노드 배치는 그대로
  let s=1,tx=0,ty=0;const setV=()=>{s=Math.max(1,Math.min(3,s));tx=Math.min(0,Math.max(W-W*s,tx));ty=Math.min(0,Math.max(H-H*s,ty));vp.setAttribute('transform',`translate(${tx},${ty}) scale(${s})`);svg.style.touchAction=s>1?'none':'pan-y'};setV();
  const pt=ev=>{const r=svg.getBoundingClientRect();return[(ev.clientX-r.left)*W/r.width,(ev.clientY-r.top)*H/r.height]};
  const P=new Map();let drag=null,moved=false,start=null,pinch=null,pan=null,hover=null,hoverPoint=null,raf=0;
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nodeAt=p=>{let hit=null,dist=Infinity;N.forEach(n=>{const d=Math.hypot(n.x-p[0],n.y-p[1]);if(d<Math.max(n.r+44,62)&&d<dist){hit=n;dist=d}});return hit};
  /* 상시 시뮬레이션은 하지 않는다. 포인터가 가까울 때만 이웃 노드를 살짝 끌고,
     손을 놓으면 각 노드의 계산된 원래 자리로 스프링처럼 돌아간다. */
  const wake=()=>{if(reduced||raf)return;raf=requestAnimationFrame(function tick(){if(!el.isConnected){raf=0;return}let active=!!hover||!!drag;
    N.forEach((n,i)=>{if(n===drag)return;let fx=(n.homeX-n.x)*.09,fy=(n.homeY-n.y)*.09;
      if(hover&&hoverPoint){if(n===hover){fx+=(hoverPoint[0]-n.x)*.065;fy+=(hoverPoint[1]-n.y)*.065}
        else if(near[N.indexOf(hover)]?.has(i)){fx+=(hover.x-n.x)*.012;fy+=(hover.y-n.y)*.012}}
      n.vx=(n.vx+fx)*.76;n.vy=(n.vy+fy)*.76;n.x+=n.vx;n.y+=n.vy;clamp(n);
      if(Math.abs(n.vx)+Math.abs(n.vy)+Math.abs(n.homeX-n.x)+Math.abs(n.homeY-n.y)>.22)active=true});
    draw();if(active)raf=requestAnimationFrame(tick);else raf=0});};
  svg.addEventListener('pointerdown',ev=>{const p=pt(ev);P.set(ev.pointerId,p);const g=ev.target.closest('.node');
    if(P.size===2){drag=null;const [a,b]=[...P.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),s,tx,ty,m:[(a[0]+b[0])/2,(a[1]+b[1])/2]};return}
    if(g){drag=N[nodes.indexOf(g)];hover=null;hoverPoint=null;moved=false;start=p;try{svg.setPointerCapture(ev.pointerId)}catch(x){}}
    else if(s>1){pan={p,tx,ty};try{svg.setPointerCapture(ev.pointerId)}catch(x){}}});
  svg.addEventListener('pointermove',ev=>{const p=pt(ev);if(!P.has(ev.pointerId)){if(ev.pointerType==='mouse'&&!drag&&!pan){const g=ev.target.closest('.node');hover=g?N[nodes.indexOf(g)]:nodeAt([(p[0]-tx)/s,(p[1]-ty)/s]);hoverPoint=hover?[(p[0]-tx)/s,(p[1]-ty)/s]:null;wake()}return}P.set(ev.pointerId,p);
    if(pinch&&P.size===2){const [a,b]=[...P.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);const ns=Math.max(1,Math.min(3,pinch.s*d/pinch.d));tx=pinch.m[0]-(pinch.m[0]-pinch.tx)*ns/pinch.s;ty=pinch.m[1]-(pinch.m[1]-pinch.ty)*ns/pinch.s;s=ns;setV();ev.preventDefault();return}
    if(drag){if(!moved&&Math.hypot(p[0]-start[0],p[1]-start[1])<6)return;moved=true;drag.x=(p[0]-tx)/s;drag.y=(p[1]-ty)/s;clamp(drag);draw();ev.preventDefault()}
    else if(pan){tx=pan.tx+p[0]-pan.p[0];ty=pan.ty+p[1]-pan.p[1];setV()}});
  const end=ev=>{P.delete(ev.pointerId);if(P.size<2)pinch=null;if(ev.type==='pointerup'&&drag&&!moved)go(drag.href);drag=null;pan=null;wake()};
  svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
  svg.addEventListener('pointerleave',ev=>{if(ev.pointerType==='mouse'){hover=null;hoverPoint=null;wake()}});
  nodes.forEach(g=>g.style.touchAction='none');
  el.querySelector('.mapzoom')?.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;const z=+b.dataset.z;if(!z){s=1;tx=ty=0}else{const ns=Math.max(1,Math.min(3,s*z));tx=W/2-(W/2-tx)*ns/s;ty=H/2-(H/2-ty)*ns/s;s=ns}setV()});
}

/* ---------- 아카이브 ---------- */
async function archive(){
  app.innerHTML=`${sec('날짜별 아카이브','Archive','','history')}<div class="days" id="days"></div><div class="alist" id="al"></div><div class="note">매시간 수집·분석 결과가 날짜별로 영구 저장되고, 새 이슈가 들어오면 같은 인물·키워드의 과거 사건과 자동으로 연결됩니다.</div>`;
  let idx=[];try{idx=await (await fetch('data/archive/index.json?'+Date.now())).json()}catch(e){}
  const show=async d=>{document.querySelectorAll('#days button').forEach(b=>b.classList.toggle('on',b.dataset.d===d));
    const a=CACHE[d]||(CACHE[d]=await (await fetch(`data/archive/${d}.json`)).json());
    $('#al').innerHTML=(a.restored?`<p class="note rst">${ic('search')}<span>이날은 실시간 수집 전이라, 그날 보도된 기사를 검색해 <b>여러 언론사가 다룬 순서</b>로 다시 정리했어요. 실제 많이 본 순위와는 다를 수 있어요.</span></p>`:'')+a.issues.map(i=>`<a class="card mini" href="${esc(i.url)}" target="_blank" rel="noopener"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><h3>${esc(i.title)}</h3><div class="m">${esc(i.press)} · 언론사 ${i.presses}곳${i.comment_total?' · 댓글 '+i.comment_total.toLocaleString():''}</div></div></a>`).join('')};
  $('#days').innerHTML=idx.map(d=>{const t=new Date(d+'T12:00:00+09:00');return`<button data-d="${d}"><span>${t.getFullYear()}.${t.getMonth()+1}</span><b>${t.getDate()}</b><span>${'일월화수목금토'[t.getDay()]}</span></button>`}).join('');
  $('#days').onclick=ev=>{const b=ev.target.closest('button');if(b)show(b.dataset.d)};if(idx[0])show(idx[0]);
}


/* ---------- 해외 모드 ---------- */
const T_=(o,k)=>S.orig?o[k]:(o[k+'_ko']||o[k]);
const gcat=c=>S.orig?(CATEN[c]||c):c;
const gt=(en,ko)=>S.orig?en:ko;
function origBtn(){return''}
function bindOrig(re){}
function gtoday(){
  const I=G.issues,L=I[0];
  app.innerHTML=`<div class="gbar"><span>${ic('세계')}${gt('Global briefing · original reporting','해외 주요 뉴스 · 한국어 자동 번역')}</span>${origBtn()}</div>
  <section class="hero"><a class="lead card" href="g/${L.id}" ${bg(L.image)}><div class="in"><div class="no">01</div><span class="cat 세계">${ic('세계')}${esc(gcat(L.category))}</span><h1>${esc(T_(L,'title'))}</h1>${L.summary?`<p class="ld">${esc(T_(L,'summary'))}</p>`:''}
   <div class="meter"><div>${ic('news')}<b>${L.mentions}</b><span>${gt('stories','관련 기사')}</span></div><div>${ic('user')}<b>${L.presses}</b><span>${gt('publishers','매체')}</span></div><div>${ic('spark')}<b>${L.gdelt||0}</b><span>${gt('extra coverage','해외 보도')}</span></div></div></div></a>
   <div class="side">${I.slice(1,5).map(i=>`<a class="card mini" href="g/${i.id}"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><span class="cat 세계">${esc(gcat(i.category))}</span><h3>${esc(T_(i,'title'))}</h3><div class="m">${esc(i.press)} · ${gt(`${i.presses} publishers`,`외 ${Math.max(0,i.presses-1)}곳`)}</div></div></a>`).join('')}</div></section>
  ${sec(gt('Global top stories','해외 이슈 TOP'),'Global top stories','','세계')}
  <div class="grid">${I.slice(5).map(i=>`<a class="card ic" href="g/${i.id}"><div class="img" ${bg(i.image)}>${i.image?'':`<div class="noimg" style="height:100%">${ic('news')}</div>`}<span class="rk">${i.rank}</span></div><div class="bd"><h3>${esc(T_(i,'title'))}</h3><div class="ft"><span>${esc(i.press)} · ${gt(`${i.presses} publishers`,`매체 ${i.presses}곳`)}</span></div></div></a>`).join('')}</div>
  ${sec(gt('Live searches','해외 실시간 검색어'),'Google Trends','','fire')}
  <div class="trends">${G.trends.slice(0,10).map((t,k)=>`<a class="tr" href="gt/${k}">${th(t.image,'tt','search')}<span class="n">${k+1}</span><b>${esc(T_(t,'keyword'))}</b><span class="tv" title="${TTIP}">${tlab(t)}</span></a>`).join('')}</div>
  <p class="fine">${gt('This page shows original English reporting. Use “번역 보기” in the header when you want a Korean machine translation.','번역은 자동 생성되어 어색하거나 틀릴 수 있어요. 상단의 원문 보기를 이용해 확인하세요.')}</p>`;
  bindOrig(gtoday);
}
function gissue(id){const i=G.issues.find(x=>x.id===id);if(!i)return gtoday();setMeta(T_(i,'title'),T_(i,'summary'));
  app.innerHTML=`<div class="bkrow"><a class="back" href="./">${NBI('arrow-left')} ${gt('Global top stories','해외 TOP')}</a>${shareBtn()}</div><div class="gbar"><span>${ic('세계')}${gt('Global reporting','해외 · 자동 번역')}</span>${origBtn()}</div>
  <article class="dhead card"><div class="img" ${bg(i.image)}><div class="ov"><span class="cat 세계">${esc(gcat(i.category))}</span><b>${gt(`Global issue #${i.rank}`,`해외 이슈 ${i.rank}위`)}</b></div></div>
   <div class="bd"><h1>${esc(T_(i,'title'))}</h1>${S.orig?'':`<p class="otit">${esc(i.title)}</p>`}
   <div class="kpis"><div>${ic('news')}<b>${i.mentions}</b><span>${gt('stories','관련 기사')}</span></div><div>${ic('user')}<b>${i.presses}</b><span>${gt('publishers','매체')}</span></div><div>${ic('spark')}<b>${i.gdelt||0}</b><span>${gt('extra coverage','해외 보도')}</span></div><div>${i.sources[0]?.t?NBI('clock-hour-'+(new Date(i.sources[0].t).getHours()%12||12)):ic('clock')}<b>${ago(i.sources[0]?.t)}</b><span>${gt('latest coverage','최근 보도')}</span></div></div>
   <div class="chips">${i.keywords.map(k=>`<span class="chip">#${esc(k)}</span>`).join('')}</div></div></article>
  ${i.summary?`<div class="card deep"><p>${esc(T_(i,'summary'))}</p><small>${gt('Automated article summary','기사 요약문 자동 번역')}</small></div>`:''}
  ${sec(gt('Coverage','보도 흐름'),'Coverage','','clock')}<div class="flow">${i.sources.map(x=>`<a class="fe" href="${esc(x.url)}" target="_blank" rel="noopener">${th(x.img,'fi')}<div><h5>${esc(T_(x,'title'))}</h5>${S.orig?'':`<p>${esc(x.title)}</p>`}${meta(x,1)}</div></a>`).join('')}</div>`;
  bindOrig(()=>gissue(id));
}
function gtrend(k){const t=G.trends[k];if(!t)return gtoday();setMeta(T_(t,'keyword'),'');
  app.innerHTML=`<div class="bkrow"><a class="back" href="./">${NBI('arrow-left')} ${gt('Global','해외')}</a>${shareBtn()}</div><div class="gbar"><span>${ic('fire')}${gt('Global searches','해외 검색어')}</span>${origBtn()}</div>
  <section class="kwh card" ${bg(t.image)}><div class="in"><span class="chip event">${ic('fire')}${gt(`Search trend #${k+1}`,`검색 ${k+1}위`)} · ${tlab(t)}</span><h1>${esc(T_(t,'keyword'))}</h1>${S.orig?'':`<p class="otit">${esc(t.keyword)}</p>`}</div></section>
  <div class="srcl2">${t.news.map(n=>`<a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(T_(n,'title'))}${S.orig?'':`<small>${esc(n.title)}</small>`}</a>`).join('')}</div>`;bindOrig(()=>gtrend(k));
}

/* ---------- 설정 ---------- */
function settings(){
  const draw=()=>{app.innerHTML=`${sec('설정','Settings','','gear')}
  <div class="card setc"><h3>보고 싶은 카테고리</h3><p class="fine">끈 카테고리는 TOP10·관계맵에서 숨겨요. 이 기기에만 저장됩니다.</p>
   <div class="toggles">${CATS.map(c=>`<label class="tg"><input type="checkbox" data-c="${c}" ${S.hide.includes(c)?'':'checked'}><span style="--c:${CATC[c]}">${ic(c)}${c}</span></label>`).join('')}</div></div>
  <div class="card setc"><h3>글자 크기</h3><div class="fsr"><button data-fs="-">가−</button><b>${S.fs}%</b><button data-fs="+">가+</button><button data-fs="0" class="ghost">기본</button></div><p class="fsprev">가나다 미리보기 — 오늘의 이슈를 따라가는 가장 쉬운 방법.</p></div>
`;
  app.querySelectorAll('[data-c]').forEach(x=>x.onchange=()=>{const c=x.dataset.c;S.hide=x.checked?S.hide.filter(y=>y!==c):[...S.hide,c];saveS()});
  app.querySelectorAll('[data-fs]').forEach(x=>x.onclick=()=>{const v=x.dataset.fs;S.fs=v==='0'?100:Math.max(85,Math.min(130,S.fs+(v==='+'?5:-5)));saveS();draw()})};draw();
}
load().catch(()=>app.innerHTML='<div class="loading">잠시 후 다시 시도해 주세요. 소식을 불러오는 중 문제가 생겼어요.</div>');
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

/* v6 공식 데이터: 한국은행 ECOS 지표·재정경제부 보도자료(마켓), OpenDART 공시(기업 타임라인) */
var O=null,BR=null;
function officialHTML(){let h='';
  const E=(O&&O.ecos)||[];
  if(E.length)h+=`${sec('공식 경제지표','Bank of Korea ECOS','<span class="more">한국은행 100대 통계</span>','chart')}<div class="ecos">${E.map(x=>`<div class="ec"><small>${esc(x.group||'')}</small><b>${esc(x.name)}</b><span>${esc(x.value)}<i>${esc(x.unit||'')}</i></span><em>${esc(x.cycle||'')}</em></div>`).join('')}</div>`;
  const B=(BR&&BR.items)||[];
  if(B.length)h+=`${sec('재정경제부 보도자료','Press Releases','<span class="more">공공데이터포털</span>','book')}<div class="srcl2">${B.slice(0,10).map(x=>`<a href="${esc(x.url||'#')}" target="_blank" rel="noopener">${esc(x.title)}<span class="meta">${x.dept?`<span class="tag">${esc(x.dept)}</span>`:''}${x.date?`<time class="ts">${esc(x.date.slice(0,10))}</time>`:''}</span></a>`).join('')}</div>`;
  return h}
function dartHTML(n){const L=(O&&O.dart_by_entity&&O.dart_by_entity[n])||[];if(!L.length)return'';
  return`${sec('오늘의 공시','OpenDART','<span class="more">금융감독원 전자공시</span>','book')}<div class="srcl2">${L.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}<span class="meta">${entc(x.corp,'company')}<time class="ts">${x.date.slice(0,4)}.${x.date.slice(4,6)}.${x.date.slice(6)}</time></span></a>`).join('')}</div>`}
{const _mk=market;market=function(){const r=_mk.apply(this,arguments);try{app.insertAdjacentHTML('beforeend',officialHTML())}catch(e){}return r}}
{const _en=entity;entity=function(n){const r=_en.apply(this,arguments);try{app.insertAdjacentHTML('beforeend',dartHTML(n))}catch(e){}return r}}
