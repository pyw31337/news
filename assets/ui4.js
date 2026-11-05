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
  // 마이페이지 팝업: 레이어 상단 알림 및 나의 커리어/성과 노출
  el.classList.toggle('in', !!t);
  const unreadCount = typeof window.nbUnreadAlerts === 'function' ? window.nbUnreadAlerts() : 0;
  const rawAlerts = typeof window.nbComputeAlerts === 'function' ? window.nbComputeAlerts() : [];
  const topAlerts = rawAlerts.slice(0, 3);
  const alertsHTML = `<div class="acm-alerts">
    <div class="acm-alerts-hd"><span><b>알림</b>${unreadCount ? `<mark class="acm-badge">${unreadCount}</mark>` : ''}</span><a href="alerts">전체 보기 ›</a></div>
    ${topAlerts.length ? `<div class="acm-alerts-list">${topAlerts.map(a=>`<a class="acm-al ${a.tone||''}" href="${a.href}"><span class="acm-al-tag">${a.lab}</span><b>${a.title}</b><p>${a.body}</p></a>`).join('')}</div>` : `<div class="acm-al-empty"><small>새로운 알림이 없어요</small></div>`}
  </div>`;
  const gameW = (window.NBGame && NBGame.lvCard && NBGame.goals) ? `<div class="acm-game">${NBGame.lvCard(true)}${NBGame.goals()}</div>` : '';
  el.innerHTML=`<button type="button" class="acb" aria-label="내 계정" aria-haspopup="true" aria-expanded="false">${t?UF:U}${t?`<i class="acd ${p}"></i>`:''}<i class="acb-unread" style="display:${unreadCount?'':'none'}"></i></button>
  <div class="acm" role="menu">
    ${alertsHTML}
    <div class="ach">${UF}<div><b>${t?(({kakao:'카카오',naver:'네이버'})[p]||'구글')+' 계정':'게스트 독자'}</b><small class="${t?'ok':'guest'}">${t?'로그인됨':'로그인하고 기록 보관하기'}</small></div></div>
    ${gameW}
    <div class="acm-links">
      <a href="my" role="menuitem">마이페이지 · 내 서재</a>
      <a href="alerts" role="menuitem">알림함 전체</a>
      ${t?`<button type="button" role="menuitem" class="aco">로그아웃</button>`:`<a href="login/?ret=my" role="menuitem" class="acl">로그인하기</a>`}
    </div>
  </div>`;
  const b=el.querySelector('.acb');b.onclick=e=>{e.stopPropagation();const o=!el.classList.contains('open');el.classList.toggle('open',o);b.setAttribute('aria-expanded',o);if(o){if(window.NBGame){const gw=el.querySelector('.acm-game');if(gw)gw.innerHTML=NBGame.lvCard(true)+NBGame.goals()}if(typeof window.nbComputeAlerts==='function'){const freshUnread=window.nbUnreadAlerts(),freshAlerts=window.nbComputeAlerts().slice(0,3),alWrap=el.querySelector('.acm-alerts');if(alWrap)alWrap.innerHTML=`<div class="acm-alerts-hd"><span><b>알림</b>${freshUnread?`<mark class="acm-badge">${freshUnread}</mark>`:''}</span><a href="alerts">전체 보기 ›</a></div>${freshAlerts.length?`<div class="acm-alerts-list">${freshAlerts.map(a=>`<a class="acm-al ${a.tone||''}" href="${a.href}"><span class="acm-al-tag">${a.lab}</span><b>${a.title}</b><p>${a.body}</p></a>`).join('')}</div>`:`<div class="acm-al-empty"><small>새로운 알림이 없어요</small></div>`}`}}};
  el.querySelectorAll('.acm a').forEach(a=>a.addEventListener('click',()=>el.classList.remove('open')));
  const lo=el.querySelector('.aco');if(lo)lo.onclick=async()=>{const tk=LS.getItem('nb-tok');try{await fetch(SYNC+'/logout',{method:'POST',headers:{Authorization:'Bearer '+tk}})}catch(e){}['nb-tok','nb-rev','nb-prov','nb-syncat','nb-sess'].forEach(k=>LS.removeItem(k));location.reload()}}
document.addEventListener('click',e=>{if(el&&!el.contains(e.target))el.classList.remove('open')});
addEventListener('storage',()=>{st=null;draw()});
const go=()=>{draw();setTimeout(draw,600)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
setInterval(draw,1200);
})();
