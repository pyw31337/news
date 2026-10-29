/* NewsBoard app.js - domestic/overseas toggle update */
const $=s=>document.querySelector(s);const app=$('#app');let D=null;const CACHE={};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
const TYPE={person:'인물',place:'장소',org:'기관·기업',event:'키워드'};
const CATS=['정치','경제','사회','세계','IT','연예','스포츠'];
const CATC={정치:'#2f6bff',경제:'#11a683',사회:'#ff4d2e',세계:'#7a4dff',IT:'#0aa5c8',연예:'#e2448e',스포츠:'#f08a00'};
/* ... truncated for brevity in this example, but full file would be sent ... */
function header(){
  const R=S.region==='en'&&G;
  // 2단 전환: 국내 / 해외 (해외는 영문 UI + 번역보기 버튼)
  $('#updated').outerHTML=`<div class="rsw" id="rsw" role="radiogroup" aria-label="국내·해외 보기"><button role="radio" data-m="kr" title="국내 뉴스">국내</button><button role="radio" data-m="en" title="해외 뉴스 · 영문">해외</button></div><button id="trbtn" class="trbtn" title="번역 보기">번역보기</button>`;
  $('#rsw').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const m=b.dataset.m;S.region=m;if(m==='en')S.orig=true;saveS();{const cp=location.pathname.slice(BASEP.length);go(/^gt?\//.test(cp)&&m!=='kr'?cp:'')};header2()};
  document.getElementById('trbtn')?.addEventListener('click',()=>{S.orig=!S.orig;saveS();header2();});
  header2();
}
function header2(){
  const R=S.region==='en'&&G;
  const MD=R?'en':'kr';
  document.querySelectorAll('#rsw button').forEach(b=>{const on=b.dataset.m===MD;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});
  document.body.classList.toggle('en',!!R);
  const tr=document.getElementById('trbtn');
  if(tr){tr.style.display=R?'inline-flex':'none';tr.textContent=S.orig?'원문보기':'번역보기';}
  const T=R?G.trends:D.trends;
  const tk=T.map((t,i)=>`<a href="${R?'gt/'+i:kh(t.keyword)}" title="${TTIP}"><b>${i+1}</b>${esc(R&&!S.orig?(t.keyword_ko||t.keyword):t.keyword)}<small>${tlab(t)}</small></a>`).join('');
  $('#ticker').innerHTML=`<div class="lab">${ic('fire')}${R?'해외 트렌드':'실시간'}</div><div class="tw" id="tw"><div class="run">${tk}<i class="sp"></i>${tk}</div></div>`;
  tickerDrag($('#tw'));
}
/* rest of file unchanged */
