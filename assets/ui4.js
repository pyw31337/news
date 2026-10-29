/* 헤더 계정 버튼 · 세션 전용 로그인 처리 */
(function(){
const LS=localStorage,SYNC='https://newsboard-sync.pyw213.workers.dev',B='/news/';
if(LS.getItem('nb-sess')&&!/(^|;\s*)nb_alive=1/.test(document.cookie)){['nb-tok','nb-rev','nb-prov','nb-syncat','nb-sess'].forEach(k=>LS.removeItem(k))}
const U='<svg viewBox="0 0 24 24" class="ua0"><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/></svg>';
const UF='<svg viewBox="0 0 24 24" class="ua1"><path d="M12 2a5 5 0 1 1 -5 5l.005 -.217a5 5 0 0 1 4.995 -4.783z"/><path d="M14 14a5 5 0 0 1 5 5v1a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-1a5 5 0 0 1 5 -5h4z"/></svg>';
let el=null,st=null;
const ret=()=>{const p=location.pathname.startsWith(B)?location.pathname.slice(B.length):'';return p.startsWith('login')?'':p+location.search+location.hash};
function draw(){const top=document.querySelector('header.top');if(!top)return;
  if(!el){el=document.createElement('div');el.className='acct';const bell=document.getElementById('bell');if(bell)bell.after(el);else top.appendChild(el)}
  else{const bell=document.getElementById('bell');if(bell&&el.previousElementSibling!==bell)bell.after(el)}
  const t=LS.getItem('nb-tok'),p=LS.getItem('nb-prov')||'google',k=t?p:'';if(k===st)return;st=k;
  if(!t){el.classList.remove('in');el.innerHTML=`<a class="acb" href="login/?ret=${encodeURIComponent(ret())}" aria-label="로그인">${U}</a>`;
    el.querySelector('a').onclick=e=>{e.preventDefault();e.stopPropagation();location.href=B+'login/?ret='+encodeURIComponent(ret())};return}
  el.classList.add('in');el.innerHTML=`<button type="button" class="acb" aria-label="내 계정" aria-haspopup="true" aria-expanded="false">${UF}<i class="acd ${p}"></i></button><div class="acm" role="menu"><div class="ach">${UF}<b>${p==='kakao'?'카카오':'구글'} 계정</b><small>로그인됨</small></div><a href="my" role="menuitem">내 서재</a><button type="button" role="menuitem" class="aco">로그아웃</button></div>`;
  const b=el.querySelector('.acb');b.onclick=e=>{e.stopPropagation();const o=!el.classList.contains('open');el.classList.toggle('open',o);b.setAttribute('aria-expanded',o)};
  el.querySelector('.acm a').addEventListener('click',()=>el.classList.remove('open'));
  el.querySelector('.aco').onclick=async()=>{const tk=LS.getItem('nb-tok');try{await fetch(SYNC+'/logout',{method:'POST',headers:{Authorization:'Bearer '+tk}})}catch(e){}['nb-tok','nb-rev','nb-prov','nb-syncat','nb-sess'].forEach(k=>LS.removeItem(k));location.reload()}}
document.addEventListener('click',e=>{if(el&&!el.contains(e.target))el.classList.remove('open')});
addEventListener('storage',()=>{st=null;draw()});
const go=()=>{draw();setTimeout(draw,600)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
setInterval(draw,1200);
})();
