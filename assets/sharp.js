/* 사진 선명도 지킴이: 사진의 실제 픽셀 크기가 '칸 크기 × 화면 배율(최소 2배)'보다 작으면 쓰지 않고 디자인 카드로 대신 보여줌.
   (수집 단계 scripts/db.py가 가장 큰 원본을 찾아 WebP로 보존하고, 너무 작은 사진은 미리 걸러냄)
   요구 크기 상한: 가로 1600px·세로 1000px(보존본 최대 크기). 칸이 화면에 보일 때 검사하고, 크기가 바뀌면 다시 검사. */
(function(){
const F=()=>Math.max(2,window.devicePixelRatio||1),CAPW=1600,CAPH=1000;
const C=new Map();
const dims=u=>{if(!C.has(u))C.set(u,new Promise(r=>{const i=new Image();i.decoding='async';i.onload=()=>r([i.naturalWidth,i.naturalHeight]);i.onerror=()=>r([0,0]);i.src=u}));return C.get(u)};
const urlOf=el=>{if(el.tagName==='IMG')return el.currentSrc||el.src;const m=(el.getAttribute('style')||'').match(/(?:background-image|--im)\s*:\s*url\((['"]?)(.*?)\1\)/);return m?m[2]:''};
/* 배지·게임 그림은 사진이 아님(연출 중 확대 크기로 재면 숨겨지던 문제) */
const skip=el=>el.closest('.pp,.ds-logo,svg,.tabbar,.gm-medal,.gm-slot,.gm-cele,.sb-st')||/favicons|data:image\/svg|\/badges\/|games\/assets\//.test(urlOf(el));
async function check(el){const u=urlOf(el);if(!u){el.classList.add('sq-ok');return}
  const [w,h]=await dims(u);const r=el.getBoundingClientRect();if(!r.width||!r.height){el.classList.add('sq-ok');return}
  const f=F(),nw=Math.min(CAPW,r.width*f),nh=Math.min(CAPH,r.height*f);
  /* background-size:cover 기준: 가로·세로 모두 요구 크기 이상이어야 또렷 */
  const ok=w>0&&w>=nw&&h>=nh*(el.tagName==='IMG'?0:1);
  el.classList.toggle('sq-ok',ok);el.classList.toggle('sq-low',!ok);el.dataset.sq=u;
  if(!ok){if(el.tagName==='IMG'){el.style.display='none';return}
    const empty=!el.textContent.trim()&&!el.querySelector('*:not(.rk):not(.n)');
    if(empty&&!el.querySelector('.sqf')){el.classList.add('sq-soft');el.insertAdjacentHTML('afterbegin',`<span class="sqf" aria-hidden="true">${typeof ic==='function'?ic('news'):''}</span>`)}
    else el.classList.add('sq-deep')}}
const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);check(e.target)}}),{rootMargin:'300px'}):null;
function scan(root){(root.querySelectorAll?root:document).querySelectorAll('[style*="background-image"],[style*="--im"],img').forEach(el=>{
  if(el.dataset.sq===urlOf(el)||el.classList.contains('sq-wait'))return;if(skip(el)){el.classList.add('sq-ok');return}
  el.classList.remove('sq-ok','sq-low','sq-soft','sq-deep');el.classList.add('sq-wait');const go=()=>{el.classList.remove('sq-wait');check(el)};
  if(io){io.observe(el);el.classList.remove('sq-wait')}else go()})}
new MutationObserver(ms=>{for(const m of ms){if(m.type==='attributes')scan(m.target.parentNode||document);else m.addedNodes.forEach(n=>n.nodeType===1&&scan(n.parentNode||n))}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','src']});
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>document.querySelectorAll('.sq-ok[data-sq],.sq-low[data-sq]').forEach(el=>{if(!el.classList.contains('sq-low'))check(el)}),400)});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>scan(document)):scan(document);
})();
