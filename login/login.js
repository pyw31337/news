(function(){
const SYNC='https://newsboard-sync.pyw213.workers.dev',BASE='/news/',$=id=>document.getElementById(id),LS=localStorage;
const USERF='<svg viewBox="0 0 24 24"><path d="M12 2a5 5 0 1 1 -5 5l.005 -.217a5 5 0 0 1 4.995 -4.783z"/><path d="M14 14a5 5 0 0 1 5 5v1a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-1a5 5 0 0 1 5 -5h4z"/></svg>';
const PN={kakao:'카카오',google:'구글',naver:'네이버'},PC={kakao:'#FEE500',naver:'#03C75A',google:'conic-gradient(#EA4335 0 25%,#FBBC05 0 50%,#34A853 0 75%,#4285F4 0)'};
const clean=r=>(r&&!/^\/|\/\/|\.\./.test(r)&&!/^login/.test(r))?r:'';
const q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.slice(1));
let ret=clean(q.get('ret')||'');
if(!ret&&document.referrer){try{const u=new URL(document.referrer);if(u.origin===location.origin&&u.pathname.startsWith(BASE))ret=clean(u.pathname.slice(BASE.length)+u.search+u.hash)}catch(e){}}
/* 로그인 결과 받기 */
if(h.get('nbt')){
  LS.setItem('nb-tok',h.get('nbt'));LS.setItem('nb-prov',h.get('nbp')||'');LS.setItem('nb-lastp',h.get('nbp')||'');LS.setItem('nb-migrate','1');
  if(h.get('keep')==='0'){LS.setItem('nb-sess','1');document.cookie='nb_alive=1;path=/;SameSite=Lax;Secure'}else LS.removeItem('nb-sess');
  location.replace(BASE+clean(h.get('ret')||''));return}
if(h.get('nbe')){history.replaceState(null,'',location.pathname+location.search);const e=$('err');e.hidden=false;e.textContent=h.get('nbe')==='busy'?'잠시 뒤에 다시 시도해 주세요':'로그인하지 못했어요. 다시 시도해 주세요'}
$('lgback').href=BASE+ret;
/* 이미 로그인 */
const tok=LS.getItem('nb-tok');
if(tok){const p=LS.getItem('nb-prov');$('lgc').hidden=true;$('lgd').hidden=false;$('lgav').innerHTML=USERF+'<b style="background:'+(PC[p]||PC.google)+'"></b>';$('lgdt').textContent=(PN[p]||'구글')+' 계정으로 로그인됨';
  $('lgout').onclick=async()=>{try{await fetch(SYNC+'/logout',{method:'POST',headers:{Authorization:'Bearer '+tok}})}catch(e){}['nb-tok','nb-rev','nb-prov','nb-syncat','nb-sess'].forEach(k=>LS.removeItem(k));location.reload()}}
/* 자동 로그인 */
const kb=$('keep');let keep=LS.getItem('nb-keep')!=='0';
const setK=()=>{kb.classList.toggle('on',keep);kb.setAttribute('aria-checked',keep)};setK();
kb.onclick=()=>{keep=!keep;LS.setItem('nb-keep',keep?'1':'0');setK();upd()};
/* 최근 사용 */
const last=LS.getItem('nb-lastp'),box=document.querySelector('.lg-btns');
document.querySelectorAll('.lg-b[data-p]').forEach(a=>{if(a.dataset.p===last){a.classList.add('recent');box.prepend(a)}});
function upd(){document.querySelectorAll('.lg-b[data-p]').forEach(a=>a.href=SYNC+'/auth/'+a.dataset.p+'/start?'+new URLSearchParams({keep:keep?'1':'0',ret}))}upd();
/* 서버에 설정된 로그인 수단만 누를 수 있게(설정 안 된 것은 '준비 중') */
fetch(SYNC+'/health').then(r=>r.json()).then(j=>{const L=j.login||{};document.querySelectorAll('.lg-b[data-p]').forEach(a=>{if(L[a.dataset.p]===false)a.classList.add('off')})}).catch(()=>{});
/* 계정 찾기 */
const f=$('find');f.onclick=()=>{const o=$('help').hidden;$('help').hidden=!o;f.setAttribute('aria-expanded',o)};
})();
