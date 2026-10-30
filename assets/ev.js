/* 독자 반응 집계(익명): 어떤 화면을 봤는지, 원문 기사를 눌렀는지, 좋아요·스크랩·공유를 했는지만 숫자로 더함.
   누가 했는지는 보내지 않음. 같은 화면은 30분에 한 번, 같은 원문은 하루 한 번만 셈. 관리자 현황판 '독자 반응'에 쓰임 */
(function(){
const EP='https://newsboard-sync.pyw213.workers.dev/ev',BP=(document.querySelector('base')||{}).href?new URL(document.querySelector('base').href).pathname:'/news/';
let Q=[],tm=0;
const flush=()=>{clearTimeout(tm);if(!Q.length)return;const b=JSON.stringify({e:Q.splice(0,30)});
  try{if(!(navigator.sendBeacon&&navigator.sendBeacon(EP,new Blob([b],{type:'text/plain'}))))fetch(EP,{method:'POST',body:b,keepalive:true,headers:{'Content-Type':'text/plain'}}).catch(()=>{})}catch(e){}
  if(Q.length)tm=setTimeout(flush,1000)};
const push=x=>{Q.push(x);clearTimeout(tm);tm=setTimeout(flush,4000)};
addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
const once=(store,k,ms)=>{try{const S=store,m=JSON.parse(S.getItem('nb-ev')||'{}'),t=Date.now();for(const x in m)if(t-m[x]>ms)delete m[x];if(m[k])return false;m[k]=t;S.setItem('nb-ev',JSON.stringify(m));return true}catch(e){return true}};
const path=()=>{let p=decodeURIComponent(location.pathname);if(p.startsWith(BP))p=p.slice(BP.length);p=p.replace(/\/+$/,'').replace(/index\.html$/,'');return p||'home'};
const title=()=>document.title.replace(/\s*·\s*NewsBoard.*$/,'').slice(0,140);
const cat=p=>{try{const m=p.match(/^issue\/(.+)$/);if(m&&typeof D!=='undefined'&&D&&D.issues){const i=D.issues.find(x=>x.id===m[1]);return i&&i.category}}catch(e){}return null};
const h=s=>{let a=5381;for(let i=0;i<s.length;i++)a=(a*33^s.charCodeAt(i))>>>0;return a.toString(36)};
// 화면 보기
// 바로 열린 상세 화면은 데이터를 받아 제목이 바뀔 때까지(최대 4초) 기다렸다가 셈
const T0=document.title;let last='';const view=()=>{let n=0;const tick=()=>{const p=path();if(p===last)return;
  if(p!=='home'&&document.title===T0&&n++<12)return setTimeout(tick,330);last=p;if(!once(sessionStorage,'v:'+p,18e5))return;
  push({k:'view',id:p.slice(0,120),t:title(),c:cat(p),p:p.split('/')[0]})};setTimeout(tick,500)};
for(const f of ['pushState','replaceState']){const o=history[f];history[f]=function(){const r=o.apply(this,arguments);view();return r}}
addEventListener('popstate',view);view();
// 원문 기사(새 창) 누르기
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="http"]');if(!a||a.origin===location.origin)return;
  const u=a.href.split('#')[0];if(!once(localStorage,'c:'+u,864e5))return;
  const t=(a.querySelector('q,b,strong,h3,h4')||a).textContent.replace(/\s+/g,' ').trim().slice(0,140);
  push({k:'click',id:'u:'+h(u),t:t||a.hostname,u:u.slice(0,300),p:'article',c:cat(path())})},true);
// 공유
document.addEventListener('click',e=>{if(e.target.closest('[data-share]')){const p=path();push({k:'share',id:p.slice(0,120),t:title(),c:cat(p),p:p.split('/')[0]})}},true);
// 좋아요·스크랩(my.js가 보내는 nb:save 신호: 켜면 +1 끄면 -1)
document.addEventListener('nb:save',e=>{const d=e.detail||{};if(d.kind!=='like'&&d.kind!=='scrap')return;const it=d.item||{};
  const k=(it.href||(d.t+'/'+d.id)).replace(/^\.?\//,'');push({k:d.kind,id:k.slice(0,120),v:d.on?1:-1,t:(it.title||title()).slice(0,140),c:it.cat||cat(k),p:d.t})});
})();
