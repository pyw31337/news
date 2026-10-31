/* NewsBoard '만지는 뉴스' 모듈 (v2 실험실에서 확정된 것을 v1에 옮김)
   app.js의 today()·issue()가 부름. app.js 전역 도우미(sec·esc·bg·ic·NBI·CATC·eh·kh·entityMedia)를 씀.
   ① 오늘의 이슈 TOP 10 = 사진 모자이크(화제도만큼 넓게, 칸마다 비주기 두근두근)
   ② 나라면?(공감/글쎄 먼저 → 다른 사람들)  ③ 찬반 한 판(한 사안 · 내 선택 → 사람들 생각 그래프)
   ④ 내 또래는?(연령 칩)  ⑤ 댓글 수다방(부적절 표현·부고 기사 제외)  ⑥ 얼굴로 보는 오늘
   ⑦ 오늘의 단어 스크래치(빈칸 문제 → 긁으면 정답)  ⑧ 실시간 검색어 톡(누르면 이유 말풍선)
   ⑨ 꾹 눌러 쉬운 말(이슈 상세 요약)  · 손끝 진동은 지원 기기만(아이폰 사파리 미지원) */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const hz=(p=10)=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const short=(t,n)=>{t=String(t||'');return t.length>n?t.slice(0,n-1)+'…':t};
const nf=n=>Number(n||0).toLocaleString('ko-KR');
const shuffle=a=>{a=a.slice();for(let k=a.length-1;k>0;k--){const j=Math.random()*(k+1)|0;[a[k],a[j]]=[a[j],a[k]]}return a};
const cc=c=>(typeof CATC!=='undefined'?CATC:{})[c]||'#8189a3';
const pic=i=>[...(i.gallery||[]).slice(0,1).map(g=>g.img),i.image].filter(Boolean)[0]||'';
const inview=(el,f,th=.2)=>{if(RM()||!('IntersectionObserver'in window))return f();const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){io.disconnect();f()}},{threshold:th});io.observe(el)};
const OP=i=>i.opinion||{};
const lk=i=>OP(i).like||0,dl=i=>OP(i).dislike||0;

/* ---------- ① TOP 10 모자이크 ---------- */
function mosaicHTML(I){return`<div class="tmo" id="tmo" aria-label="오늘의 이슈 TOP 10"></div>`}
function mosaic(I){if(location.hash==='#search'){history.replaceState(null,'',location.pathname);setTimeout(search,300)}const el=$('#tmo');if(!el)return;
  const draw=()=>{const W=el.clientWidth||360,H=Math.round(W>=720?W*.62:W*1.38),out=[];el.style.height=H+'px';
    const it=I.slice(0,10).map(i=>({i,v:Math.pow(Math.max(1,i.score||1),.7)}));   // 0.7제곱: 1위가 판을 다 먹지 않게
    (function tm(a,x,y,w,h){if(a.length===1){out.push({...a[0],x,y,w,h});return}
      const tot=a.reduce((s,b)=>s+b.v,0);let acc=0,k=0;while(k<a.length-1&&acc+a[k].v<=tot/2){acc+=a[k].v;k++}if(!k){acc=a[0].v;k=1}
      const f=acc/tot;if(w>=h){tm(a.slice(0,k),x,y,w*f,h);tm(a.slice(k),x+w*f,y,w*(1-f),h)}else{tm(a.slice(0,k),x,y,w,h*f);tm(a.slice(k),x,y+h*f,w,h*(1-f))}})(it,0,0,W,H);
    el.innerHTML=out.map((t,k)=>{const i=t.i,a=t.w*t.h,big=a>W*H*.16,mid=a>W*H*.07,sm=t.w<110||t.h<96,o=OP(i);
      return`<a class="tmc ${big?'big':mid?'mid':sm?'sm':''}" href="issue/${i.id}" style="left:${t.x/W*100}%;top:${t.y/H*100}%;width:${t.w/W*100}%;height:${t.h/H*100}%;--c:${cc(i.category)};--d:${k*55}ms">
       <span class="tmi" ${pic(i)?bg(pic(i)):''}></span><span class="tmk"><b>${i.rank}</b>${sm?'':esc(i.category)}</span>${o.total&&!sm?`<span class="tmn">${ic('chat')}${nf(o.total)}</span>`:''}
       <span class="tmt"><b>${esc(big?i.title:short(i.title,mid?40:sm?18:26))}</b>${big&&(i.summary||[])[0]?`<small>${esc(short(i.summary[0],80))}</small>`:''}</span></a>`}).join('')};
  draw();let rw=el.clientWidth;addEventListener('resize',()=>{if(el.isConnected&&Math.abs(el.clientWidth-rw)>40){rw=el.clientWidth;draw()}});
  if(RM())return;let on=false;
  // 한두 칸이 1.2~4초 사이 무작위 간격으로 '두-근'. 화면 밖·탭 숨김이면 쉼
  const beat=()=>{if(!on||!el.isConnected||document.hidden)return;const T=$$('.tmc',el),b=T[Math.random()*T.length|0];if(b){b.classList.remove('beat');void b.offsetWidth;b.classList.add('beat')}
    if(Math.random()<.3){const c=T[Math.random()*T.length|0];setTimeout(()=>{if(c){c.classList.remove('beat');void c.offsetWidth;c.classList.add('beat')}},260)}
    setTimeout(beat,1200+Math.random()*2800)};
  if('IntersectionObserver'in window)new IntersectionObserver(es=>{const v=es[0].isIntersecting;if(v&&!on){on=true;setTimeout(beat,500)}on=v}).observe(el);
  el.addEventListener('pointerdown',e=>{if(e.target.closest('.tmc'))hz(8)})}

/* ---------- ② 나라면? ---------- */
function voteHTML(I){const P=I.filter(i=>lk(i)+dl(i)>10);if(!P.length)return'';const VT=LS('nb-v2-vote',{});
  return sec('나라면?','What would you say?','<span class="more">먼저 누르면 결과가 열려요</span>','chat')+`<div class="tvrow" id="tvote">${P.map(i=>`<div class="tvc" data-id="${i.id}"><a class="tvp" href="issue/${i.id}" ${pic(i)?bg(pic(i)):''}></a><b>${esc(short(i.title,46))}</b><div class="tvq">${VT[i.id]!=null?voteRes(i,VT[i.id]):voteAsk()}</div></div>`).join('')}</div>`}
const voteAsk=()=>`<p>이 소식, 어떻게 느껴요?</p><div class="tvb"><button type="button" data-v="1">👍 공감</button><button type="button" data-v="0">👎 글쎄</button></div>`;
function voteRes(i,v){const t=lk(i)+dl(i)||1,p=Math.round((v?lk(i):dl(i))/t*100),a=Math.round(lk(i)/t*100);
  return`<div class="tvr"><b>${p}%</b><span>가 나와 같은 생각이에요</span><div class="tvbar"><i style="--w:${a}%"></i></div><small><em>공감 ${a}%</em><em>글쎄 ${100-a}%</em></small></div>`}
function vote(I){const el=$('#tvote');if(!el)return;const VT=LS('nb-v2-vote',{});
  el.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;const c=b.closest('.tvc'),i=I.find(x=>x.id===c.dataset.id),v=+b.dataset.v;
    VT[i.id]=v;SS('nb-v2-vote',VT);hz(12);$('.tvq',c).innerHTML=voteRes(i,v)})}

/* ---------- ③ 찬반 한 판: 한 사안을 두 입장으로, 고르면 사람들 생각을 그래프로 ---------- */
function debateHTML(I){const P=I.filter(i=>(((i.ai||{}).opinion||{}).stances||[]).length>=2);if(!P.length)return'';
  return sec('찬반 한 판','Pick a side','<span class="more">고르면 사람들 생각이 보여요</span>','chat')+`<div class="tdb card" id="tdb"></div>`}
function debate(I){const el=$('#tdb');if(!el)return;const P=I.filter(i=>(((i.ai||{}).opinion||{}).stances||[]).length>=2),MY=LS('nb-debate',{});let n=0;
  const res=(i,k)=>{const S=i.ai.opinion.stances.slice(0,2),tot=S.reduce((a,x)=>a+(x.share||0),0)||1,A=OP(i).ages,G=OP(i).gender,am=A?Math.max(1,...Object.values(A)):1;
    return`<div class="tdr"><div class="tdm"><b>${Math.round(S[k].share/tot*100)}%</b><span>가 나와 같은 편이에요</span></div>
      <div class="tdsplit">${S.map((x,j)=>`<i class="s${j} ${j===k?'me':''}" style="--w:${x.share/tot*100}%"><em>${Math.round(x.share/tot*100)}%</em></i>`).join('')}</div>
      <div class="tdl">${S.map((x,j)=>`<div class="s${j} ${j===k?'me':''}"><b>${esc(x.label)}${j===k?' · 나':''}</b>${x.desc?`<p>${esc(short(x.desc,90))}</p>`:''}</div>`).join('')}</div>
      ${A&&Object.keys(A).length?`<div class="tdage"><small>누가 말하고 있나 · 댓글 연령</small><div>${Object.entries(A).map(([a,v])=>`<span><i style="--h:${v/am*100}%"></i><b>${v}%</b><small>${a}대</small></span>`).join('')}</div>${G?`<p class="tdg"><i style="--w:${G.male||0}%"></i><span>남 ${G.male||0}%</span><span>여 ${G.female||0}%</span></p>`:''}</div>`:''}
      <p class="tdn">댓글 ${nf(OP(i).total)}개를 AI가 입장별로 나눈 비율이에요</p></div>`};
  const draw=()=>{const i=P[n%P.length],S=i.ai.opinion.stances.slice(0,2),m=MY[i.id];
    el.innerHTML=`<div class="tdh"><a href="issue/${i.id}" class="tdp" ${pic(i)?bg(pic(i)):''}></a><div><span class="cat ${i.category}">${esc(i.category)}</span><b>${esc(i.title)}</b></div></div>
      <p class="tdq">이 사안, 어느 쪽에 더 가까워요?</p><div class="tdbt">${S.map((x,j)=>`<button type="button" data-k="${j}" class="s${j} ${m===j?'on':''}" ${m!=null?'disabled':''}>${esc(short(x.label,22))}</button>`).join('')}</div>
      ${m!=null?res(i,m):''}<div class="tdnav"><span>${n%P.length+1} / ${P.length}</span><button type="button" class="tdnx">다른 사안 ›</button></div>`;
    if(m!=null)requestAnimationFrame(()=>el.classList.add('go'))};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b&&!b.disabled){const i=P[n%P.length];MY[i.id]=+b.dataset.k;SS('nb-debate',MY);hz([10,30,15]);el.classList.remove('go');draw()}
    if(e.target.closest('.tdnx')){n++;hz(6);el.classList.remove('go');draw()}});draw()}

/* ---------- ④ 내 또래는? ---------- */
function agesHTML(I){const P=I.filter(i=>OP(i).ages),ages=['20','30','40','50','60'].filter(a=>P.some(i=>OP(i).ages[a]>0));if(!ages.length)return'';
  const my=String((typeof S!=='undefined'?S:{}).age||'').slice(0,2),def=ages.includes(my)?my:ages.includes('40')?'40':ages[0];
  return sec('내 또래는?','By age','<span class="more">댓글 단 사람들의 나이로 봤어요</span>','user')+`<div class="tag card" id="tage" data-def="${def}"><div class="tagc">${ages.map(a=>`<button type="button" data-a="${a}" class="${a===def?'on':''}">${a}대</button>`).join('')}</div><div class="tagl"></div></div>`}
function ages(I){const el=$('#tage');if(!el)return;const P=I.filter(i=>OP(i).ages);
  const list=a=>{$('.tagl',el).innerHTML=P.filter(i=>OP(i).ages[a]>0).sort((x,y)=>OP(y).ages[a]-OP(x).ages[a]).slice(0,5).map(i=>`<a href="issue/${i.id}"><span class="tagp" ${pic(i)?bg(pic(i)):''}></span><b>${esc(short(i.title,40))}</b><i style="--w:${OP(i).ages[a]}%"></i><em>${OP(i).ages[a]}%</em></a>`).join('');const l=$('.tagl',el);l.classList.remove('in');void l.offsetWidth;l.classList.add('in')};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;hz(6);$$('[data-a]',el).forEach(x=>x.classList.toggle('on',x===b));list(b.dataset.a)});list(el.dataset.def)}

/* ---------- ⑤ 댓글 수다방 ---------- */
// 공개 화면에 올리는 대표 댓글: 욕설·혐오 표현이 있거나 부고·참사 기사면 쓰지 않음
const BAD=/공산당|잡것|개돼지|대깨|문빠|윤빠|짱깨|쪽바리|홍어|씨발|시발|ㅅㅂ|ㅆㅂ|개새|병신|ㅂㅅ|좆|존나|졸라|죽어라|죽여|뒤져|꺼져|미친놈|미친년|또라이|닥쳐|쓰레기|버러지|벌레|틀딱|한남|김치녀|빨갱|좌빨|토착왜구|수꼴|대가리|새끼|ㅅㄲ|놈들|년들|창녀|매국노/;
const SAD=/별세|빈소|추모|사망|숨져|숨진|故|부고|참사|희생|유족|영면|애도/;
function chatHTML(I){const L=chatList(I);if(!L.length)return'';
  return sec('댓글 수다방','Comment room','<span class="more">이슈마다 공감 1위 댓글</span>','chat')+`<div class="tch card" id="tch">${L.map(([i,t],k)=>`<a href="issue/${i.id}#comments" style="--d:${k*650}ms" class="${k%2?'r':''}"><span class="tca" ${pic(i)?bg(pic(i)):''}></span><div><small>${i.rank}위 · ${esc(short(i.title,22))}</small><p>${esc(short(t,90))}</p></div></a>`).join('')}</div>`}
function chatList(I){return I.filter(i=>!SAD.test(i.title)).map(i=>{const c=(OP(i).top||[]).map(x=>x.text||'').find(t=>t.length>=6&&!BAD.test(t.replace(/\s/g,'')));return c?[i,c]:null}).filter(Boolean).slice(0,6)}
function chat(){const el=$('#tch');if(el)inview(el,()=>el.classList.add('go'))}

/* ---------- ⑥ 얼굴로 보는 오늘 ---------- */
function facesHTML(E){const P=E.filter(e=>e.type==='person'&&!/나스닥|코스피|코스닥|다우|S&P|증시|거래소/.test(e.name)).map(e=>({e,u:(typeof entityMedia==='function'?entityMedia(e).url:'')||((e.visual||{}).url)||((e.wiki||{}).thumb)})).filter(x=>x.u).slice(0,14);if(!P.length)return'';
  return sec('얼굴로 보는 오늘','Faces of today',`<a class="more" href="people">전체 ${NBI('arrow-right')}</a>`,'user')+`<div class="tfa">${P.map(({e,u})=>{const n=(e.issues||[]).length;return`<a href="${eh(e.name)}"><span ${bg(u)}></span><b>${esc(e.name)}</b><small>${esc(short((e.wiki||{}).desc||'',22))}</small>${n>1?`<i>${n}</i>`:''}</a>`}).join('')}</div>`}

/* ---------- ⑦ 오늘의 단어 스크래치 ---------- */
function wordsHTML(W){if(!W.length)return'';
  return sec('오늘의 단어','Words of the day','<span class="more">긁으면 정답이 나와요</span>','quiz')+`<div class="tws">${W.map((w,k)=>{const ex=(w.examples||[]).find(x=>(x.title||'').includes(w.word))||(w.examples||[])[0]||{},t=ex.title||'',has=t.includes(w.word);
    const blank=has?esc(t).split(esc(w.word)).join('<u>□□</u>'):'';const mean=(w.easy||w.mean||(w.wiki||{}).desc||'').split(w.word).join('□□');   // 힌트에 정답이 보이지 않게
    return`<div class="twc"><small class="twn">Q${k+1}${w.field?` · ${esc(w.field)}`:''}</small><p class="twq">${has?`빈칸에 들어갈 말은?<q>${blank}</q>`:'이 뜻을 가진 말은?'}</p>${mean?`<p class="twh">${has?'힌트 · ':''}${esc(short(mean,70))}</p>`:''}
      <div class="twa"><div class="twr"><b>${esc(w.word)}</b><small>${esc(short((w.wiki||{}).desc||mean,40))}</small>${ex.url?`<a href="${esc(ex.url)}" target="_blank" rel="noopener">기사 보기 ${NBI('arrow-up-right')}</a>`:''}</div><canvas aria-label="긁어서 정답 보기"></canvas></div></div>`}).join('')}</div>`}
function words(){$$('.twa canvas').forEach(cv=>inview(cv,()=>scratch(cv),.01))}
function scratch(cv){const w=cv.parentNode.clientWidth,h=cv.parentNode.clientHeight;if(!w||!h)return;const dp=devicePixelRatio||1,x=cv.getContext('2d');cv.width=w*dp;cv.height=h*dp;x.scale(dp,dp);
  const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#c9ced9');g.addColorStop(.5,'#eef0f5');g.addColorStop(1,'#b4bac8');x.fillStyle=g;x.fillRect(0,0,w,h);
  x.fillStyle='rgba(255,255,255,.35)';for(let k=0;k<40;k++){x.fillRect(Math.random()*w,Math.random()*h,2,2)}
  x.fillStyle='#6f778e';x.font='800 14px Pretendard Variable,Pretendard,system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText('여기를 긁어 정답 확인 👆',w/2,h/2);
  x.globalCompositeOperation='destination-out';let dn=false,cnt=0,lx=0,ly=0;
  const at=e=>{const r=cv.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;x.lineWidth=36;x.lineCap='round';x.beginPath();x.moveTo(lx,ly);x.lineTo(px,py);x.stroke();lx=px;ly=py;if(cnt%6===0)hz(4);
    if(++cnt%10===0){const d=x.getImageData(0,0,cv.width,cv.height).data;let c=0,t=0;for(let k=3;k<d.length;k+=120){t++;if(!d[k])c++}if(c/t>.5&&!cv._g){cv._g=1;hz([15,40,25]);cv.classList.add('gone');cv.closest('.twc').classList.add('done');setTimeout(()=>cv.remove(),600)}}};
  cv.onpointerdown=e=>{dn=true;cv.setPointerCapture(e.pointerId);const r=cv.getBoundingClientRect();lx=e.clientX-r.left;ly=e.clientY-r.top;at(e)};cv.onpointermove=e=>dn&&at(e);cv.onpointerup=cv.onpointercancel=()=>dn=false}

/* ---------- ⑧ 실시간 검색어 톡 ---------- */
function trendsHTML(T){if(!T.length)return'';
  return sec('실시간 검색어','Google Trends KR','<span class="more">누르면 왜 떴는지 알려 줘요</span>','search')+`<div class="ttr card" id="ttr"><div class="ttc">${T.map((t,k)=>`<button type="button" data-k="${k}"><i>${k+1}</i>${esc(t.keyword)}</button>`).join('')}</div><div class="ttw" hidden></div></div>`}
function trends(T){const el=$('#ttr');if(!el)return;
  el.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;const t=T[+b.dataset.k],w=$('.ttw',el),on=b.classList.contains('on');hz(8);
    $$('[data-k]',el).forEach(x=>x.classList.remove('on'));if(on){w.hidden=true;return}b.classList.add('on');w.hidden=false;
    const n=(t.news||t.today||[])[0]||{},im=t.image||t.img||n.img;w.style.setProperty('--x',(b.offsetLeft+b.offsetWidth/2)+'px');
    w.innerHTML=`${im?`<span class="ttp" ${bg(im)}></span>`:''}<div><b>${esc(t.keyword)}${t.traffic?` <small>검색 ${esc(t.traffic)}</small>`:''}</b><p>${esc(n.title||'관련 기사를 찾는 중이에요')}</p><a href="${kh(t.keyword)}">오늘·과거 흐름 보기 ${NBI('arrow-right')}</a></div>`;
    w.classList.remove('in');void w.offsetWidth;w.classList.add('in')})}

/* ---------- ⑨ 꾹 눌러 쉬운 말(이슈 상세 요약) ---------- */
// 원래 요약과 쉬운 말을 같은 칸에 겹쳐 높이가 변하지 않게. 꾹 누르는 동안만 쉬운 말, 아래 단추를 톡 누르면 계속 쉬운 말
function easyHold(i,root){const box=$('#s-sum .summary',root);if(!box||!(i.easy||[]).length||box.closest('.ezw'))return;
  const w=document.createElement('div');w.className='ezw';box.replaceWith(w);
  w.innerHTML=`<div class="ezs"><div class="ezo"></div><div class="eze summary ds-sum">${i.easy.map((s,k)=>`<div class="sl"><b>${k+1}</b><p>${esc(s)}</p></div>`).join('')}</div></div><button type="button" class="ezb" aria-pressed="false"><i></i><span>꾹 누르면 쉬운 말 · 톡 누르면 계속</span></button>`;
  $('.ezo',w).appendChild(box);let t=0,held=false;const S=$('.ezs',w),B=$('.ezb',w);
  const set=v=>{w.classList.toggle('easy',v);B.setAttribute('aria-pressed',v)};
  S.addEventListener('pointerdown',e=>{if(e.target.closest('a,button'))return;held=false;w.classList.add('hold');t=setTimeout(()=>{held=true;set(true);hz(12)},300)});
  const up=()=>{clearTimeout(t);w.classList.remove('hold');if(held&&!w._lock)set(false);held=false};['pointerup','pointercancel','pointerleave'].forEach(k=>S.addEventListener(k,up));
  S.addEventListener('contextmenu',e=>e.preventDefault());
  B.onclick=()=>{w._lock=!w._lock;set(w._lock);hz(8);$('span',B).textContent=w._lock?'쉬운 말로 보는 중 · 톡 누르면 원래대로':'꾹 누르면 쉬운 말 · 톡 누르면 계속'}}


/* ---------- ⑩ 지난 방문 이후 브리핑 ---------- */
// 지난번에 본 TOP 10과 비교해 새로 오른 이슈만 칩으로. 같은 세션에서 다시 그려도 같은 결과(세션 저장)
function sinceHTML(I){let prev=null;try{prev=JSON.parse(sessionStorage.getItem('nb-visit-prev')||'null')}catch(e){}
  if(!prev){prev=LS('nb-visit',null);try{sessionStorage.setItem('nb-visit-prev',JSON.stringify(prev||{}))}catch(e){}}
  SS('nb-visit',{t:Date.now(),ids:I.slice(0,10).map(i=>i.id)});
  if(!prev||!prev.t||Date.now()-prev.t<20*60e3)return'';const N=I.slice(0,10).filter(i=>!(prev.ids||[]).includes(i.id));if(!N.length)return'';
  const h=Math.round((Date.now()-prev.t)/36e5),ago=h<1?'조금 전':h<24?h+'시간 전':Math.round(h/24)+'일 전';
  return`<section class="tsn card"><div class="tsnh"><b>${ago} 다녀가신 뒤</b><span>새로 오른 이슈 <em>${N.length}</em>개</span></div><div class="tsnl">${N.map(i=>`<a href="issue/${i.id}"><span ${pic(i)?bg(pic(i)):''}></span><b>${esc(short(i.title,30))}</b><i>${i.rank}위</i></a>`).join('')}</div></section>`}

/* ---------- ⑪ 한눈 온도(실험실 B2): 숫자 하나만 크게, 눌러야 자세히 ---------- */
function heatHTML(I){const L=I.filter(i=>lk(i)+dl(i)>10).sort((a,b)=>(OP(b).total||0)-(OP(a).total||0)).slice(0,5);if(!L.length)return'';
  return sec('한눈 온도','Mood meter','<span class="more">댓글 공감 비율 · 눌러서 자세히</span>','chat')+`<div class="tht">${L.map(i=>{const o=OP(i),t=lk(i)+dl(i)||1,p=Math.round(lk(i)/t*100),A=o.ages||{},am=Math.max(1,...Object.values(A)),S=((i.ai||{}).opinion||{}).stances||[],q=(o.top||[]).map(x=>x.text||'').find(x=>x.length>=6&&!BAD.test(x.replace(/\s/g,'')));
    return`<details class="card"><summary><span class="thp" ${pic(i)?bg(pic(i)):''}></span><div><b>${esc(short(i.title,34))}</b><i class="thb"><i style="width:${p}%"></i></i></div><strong class="${p>=60?'w':p<=45?'c':''}">${p}<small>%</small></strong></summary>
     <div class="thd">${S.map(x=>`<p><span>${esc(x.label)}</span><b>${x.share}%</b></p>`).join('')}${Object.keys(A).length?`<div class="tha">${Object.entries(A).map(([k,v])=>`<span><i style="height:${v/am*100}%"></i><small>${k}대</small></span>`).join('')}</div>`:''}${q&&!SAD.test(i.title)?`<q>${esc(short(q,90))}</q>`:''}<a href="issue/${i.id}#comments">댓글 ${nf(o.total)}개 보기 ${NBI('arrow-right')}</a></div></details>`}).join('')}</div>`}

/* ---------- ⑫ 숫자 카드(실험실 C5): 큰 숫자만 보고 맞혀 보기, 누르면 뒤집힘 ---------- */
function numsHTML(I){const re=/(\d[\d,.]*)\s?(%|％|조\s?원|억\s?원|만\s?원|조|억|만|원|달러|명|배|곳|개월|건)/,C=[];
  I.forEach(i=>{for(const t of[i.title,...(i.summary||[])]){const m=re.exec(t||'');if(m&&!/^(19|20)\d\d$/.test(m[1])){C.push({i,n:m[1],u:m[2].replace(/\s/g,''),t});break}}});if(C.length<2)return'';
  return sec('숫자 카드','Guess the number','<span class="more">무슨 숫자일까요? 눌러서 뒤집기</span>','chart')+`<div class="tnc">${C.slice(0,6).map(c=>`<button type="button" class="tfl" style="--c:${cc(c.i.category)}"><div class="f"><b>${esc(c.n)}<small>${esc(c.u)}</small></b><span>무슨 숫자일까요?</span></div><div class="k"><p>${esc(short(c.t,64))}</p><a href="issue/${c.i.id}">기사 보기 ›</a></div></button>`).join('')}</div>`}
function nums(){$$('.tnc').forEach(el=>el.addEventListener('click',e=>{if(e.target.closest('a'))return;const b=e.target.closest('.tfl');if(b){hz(10);b.classList.toggle('on')}}))}

/* ---------- ⑬ 형광펜 단어장(실험실 C6): 어려운 말을 누르면 기사 속 그 말에 형광펜 + 쉬운 뜻 ---------- */
function hiliteHTML(I){const G={};I.forEach(i=>Object.entries(i.gloss||{}).forEach(([w,m])=>{if(!G[w])G[w]={m,i}}));const L=Object.entries(G).slice(0,10);if(L.length<2)return'';
  window._nbHL=L;return sec('어려운 말 형광펜','Highlighter','<span class="more">눌러서 뜻 보기</span>','book')+`<div class="thl card" id="thl"><div class="thw">${L.map(([w],k)=>`<button type="button" data-w="${k}" class="${k?'':'on'}">${esc(w)}</button>`).join('')}</div><div class="thx"></div></div>`}
function hilite(){const el=$('#thl');if(!el)return;const L=window._nbHL||[];
  const show=k=>{const [w,g]=L[k],t=[g.i.title,...(g.i.summary||[])].find(x=>(x||'').includes(w))||g.i.title,j=t.indexOf(w);
    $('.thx',el).innerHTML=`<div class="thdc"><p>${j<0?esc(t)+` <mark>${esc(w)}</mark>`:esc(t.slice(0,j))+`<mark>${esc(w)}</mark>`+esc(t.slice(j+w.length))}</p><div class="thm"><b>${esc(w)}</b><span>${esc(g.m)}</span></div><a href="issue/${g.i.id}">이 기사 보기 ›</a></div>`;
    const m=$('mark',el);requestAnimationFrame(()=>requestAnimationFrame(()=>m&&m.classList.add('go')))};
  inview(el,()=>show(0));el.addEventListener('click',e=>{const b=e.target.closest('[data-w]');if(!b)return;hz(8);$$('[data-w]',el).forEach(x=>x.classList.toggle('on',x===b));show(+b.dataset.w)})}

/* ---------- ⑭ 검색(상단 돋보기) ---------- */
// 오늘 이슈·인물·기관·단어·해외 이슈·메뉴를 한 번에. 엔터는 첫 결과, 없으면 키워드 페이지(지난 기사까지)
const MENU2=[['오늘','./','이슈 TOP 10·참여'],['타임라인','timeline','사건이 이어지는 흐름'],['관계도','map','인물·기업·장소 관계'],['화제','people','인물·기업·장소별'],['아카이브','archive','지난 날의 이슈'],['마켓','market','증시·환율·정책'],['정치인','politicians/','법안·표결·재산'],['인물 아카이브','persons/','정치인 일생 기록'],['배우기','learn','퀴즈·카드뉴스·만화'],['단어 퀴즈','quiz','OX로 어려운 말'],['게임·배지','games/','뉴스 게임과 배지'],['마이페이지','my','내 서재·팔로우·기록'],['알림','alerts','키워드·팔로우 알림'],['설정','settings','연령대·읽기 수준·카테고리']];
function search(){let o=$('.nbs');if(o){$('input',o).focus();return}
  const DD=typeof D!=='undefined'?D:null,GG=typeof G!=='undefined'?G:null,R=LS('nb-recent',[]);
  o=document.createElement('div');o.className='nbs';o.setAttribute('role','dialog');o.setAttribute('aria-label','검색');
  o.innerHTML=`<div class="nbsh"><span class="nbsi">${NBI('search')}</span><input type="search" placeholder="이슈·인물·단어·메뉴 검색" autocomplete="off" enterkeyhint="search"><button type="button" class="nbsx">닫기</button></div><div class="nbsb"></div>`;
  document.body.appendChild(o);document.body.classList.add('nbs-on');const q=$('input',o),body=$('.nbsb',o);
  const close=()=>{o.remove();document.body.classList.remove('nbs-on');removeEventListener('keydown',key)};
  const key=e=>{if(e.key==='Escape')close()};addEventListener('keydown',key);
  const rec=t=>{t=t.trim();if(!t)return;const a=[t,...LS('nb-recent',[]).filter(x=>x!==t)].slice(0,8);SS('nb-recent',a)};
  const empty=()=>{const T=DD?(DD.trends||[]).slice(0,10):[];body.innerHTML=`${R.length?`<h4>최근 검색 <button type="button" class="nbsc">지우기</button></h4><div class="nbsk">${R.map(t=>`<button type="button" data-q="${esc(t)}">${esc(t)}</button>`).join('')}</div>`:''}
    ${T.length?`<h4>지금 많이 찾는 말</h4><div class="nbsk">${T.map((t,k)=>`<button type="button" data-q="${esc(t.keyword)}"><i>${k+1}</i>${esc(t.keyword)}</button>`).join('')}</div>`:''}
    <h4>바로가기</h4><div class="nbsm">${MENU2.slice(0,9).map(m=>`<a href="${m[1]}">${esc(m[0])}</a>`).join('')}</div>`};
  const hl=(t,s)=>{const k=t.toLowerCase().indexOf(s.toLowerCase());return k<0?esc(t):esc(t.slice(0,k))+'<mark>'+esc(t.slice(k,k+s.length))+'</mark>'+esc(t.slice(k+s.length))};
  const run=()=>{const s=q.value.trim();if(!s)return empty();const has=t=>(t||'').toLowerCase().includes(s.toLowerCase()),g=(t,a)=>a.length?`<h4>${t}</h4>${a.join('')}`:'';
    const iss=DD?DD.issues.filter(i=>has(i.title)||has((i.summary||[]).join(' '))||(i.keywords||[]).some(has)||(i.entities||[]).some(has)).slice(0,8).map(i=>`<a class="nbsr" href="issue/${i.id}"><span class="sq-ok" ${pic(i)?bg(pic(i)):''}></span><div><b>${hl(i.title,s)}</b><small>${esc(i.category)} · ${i.rank}위</small></div></a>`):[];
    const ent=DD?DD.entities.filter(e=>has(e.name)).slice(0,8).map(e=>`<a class="nbsr" href="${eh(e.name)}"><span class="ro sq-ok" ${((e.visual||{}).url||(e.wiki||{}).thumb)?bg((e.visual||{}).url||(e.wiki||{}).thumb):''}></span><div><b>${hl(e.name,s)}</b><small>${esc(short((e.wiki||{}).desc||'',30))}</small></div></a>`):[];
    const wd=DD?(DD.words||[]).filter(w=>has(w.word)).slice(0,4).map(w=>`<a class="nbsr t" href="quiz"><div><b>${hl(w.word,s)}</b><small>${esc(short(w.easy||w.mean||'',50))}</small></div></a>`):[];
    const gl=GG&&GG.issues?GG.issues.filter(i=>has(i.title)||has(i.title_ko)).slice(0,5).map(i=>`<a class="nbsr t" href="g/${i.id}"><div><b>${hl(i.title_ko||i.title,s)}</b><small>해외 · ${esc(short(i.title,40))}</small></div></a>`):[];
    const mn=MENU2.filter(m=>has(m[0])||has(m[2])).map(m=>`<a class="nbsr t" href="${m[1]}"><div><b>${hl(m[0],s)}</b><small>${esc(m[2])}</small></div></a>`);
    body.innerHTML=g('이슈',iss)+g('인물·기관·장소',ent)+g('오늘의 단어',wd)+g('해외',gl)+g('메뉴',mn)+`<a class="nbsall" href="${kh(s)}">'${esc(s)}' 지난 기사까지 모두 찾기 ${NBI('arrow-right')}</a>`};
  q.oninput=run;q.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();rec(q.value);const a=$('.nbsr',body)||$('.nbsall',body);if(a)a.click()}};
  o.addEventListener('click',e=>{if(e.target.closest('.nbsx'))return close();const c=e.target.closest('.nbsc');if(c){SS('nb-recent',[]);R.length=0;return empty()}
    const b=e.target.closest('[data-q]');if(b){q.value=b.dataset.q;rec(b.dataset.q);run();return}
    const a=e.target.closest('a');if(a){rec(q.value);setTimeout(close,0)}});
  empty();setTimeout(()=>q.focus(),30)}
document.addEventListener('keydown',e=>{if((e.key==='k'&&(e.metaKey||e.ctrlKey))&&!/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||'')){e.preventDefault();search()}});

window.NBT={sinceHTML,heatHTML,numsHTML,nums,hiliteHTML,hilite,search,mosaicHTML,mosaic,voteHTML,vote,debateHTML,debate,agesHTML,ages,chatHTML,chat,facesHTML,wordsHTML,words,trendsHTML,trends,easyHold,hz};
})();
