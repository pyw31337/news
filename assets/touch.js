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
const hasPic = i => Boolean(i && ((i.image && i.image.trim()) || (i.gallery && i.gallery.some(g => g && g.img && g.img.trim()))));
function mosaicHTML(I){return`<div class="tmo" id="tmo" aria-label="오늘의 이슈 TOP 10"></div>`}
function mosaic(I){if(location.hash==='#search'){history.replaceState(null,'',location.pathname);setTimeout(search,300)}const el=$('#tmo');if(!el)return;
  const draw=()=>{const W=el.clientWidth||360;
    const heroIds = new Set((I.filter(hasPic).length ? I.filter(hasPic) : I).slice(0, 10).map(x => x.id));
    const nonHero = I.filter(x => !heroIds.has(x.id));
    const validNonHero = nonHero.filter(hasPic);
    const pool = (validNonHero.length >= 10 ? validNonHero : (nonHero.concat(I.filter(hasPic)))).slice(0, 10);
    if(W < 720){
      el.style.height = 'auto';
      el.className = 'tmo tmo-mobile';
      el.innerHTML = pool.map(i => {
        const o = OP(i), p = pic(i);
        const pl = typeof plogo === 'function' ? plogo(i.press, i.url, 'pl') : ic('news');
        return `<a class="tmo-mcard card" href="issue/${i.id}">
          <div class="tmo-mimg" ${p ? bg(p) : ''}><span class="tmo-mrank"><b>${i.rank}</b>위</span></div>
          <div class="tmo-mbody">
            <span class="cat ${i.category}">${esc(i.category)}</span>
            <h4 class="tmo-mtitle">${esc(i.title)}</h4>
            ${(i.summary&&i.summary[0]) ? `<p class="tmo-msum">${esc(i.summary[0])}</p>` : ''}
            <div class="tmo-mmeta">
              <span class="tmo-mpress">${pl}${esc(i.press||'')}</span>
              ${o.total ? `<span>${ic('chat')}댓글 ${nf(o.total)}개</span>` : ''}
            </div>
          </div>
        </a>`;
      }).join('');
      return;
    }
    el.className = 'tmo';
    const H=Math.round(W*.62),out=[];el.style.height=H+'px';
    const it=pool.map(i=>({i,v:Math.pow(Math.max(1,i.score||1),.7)}));   // 0.7제곱: 1위가 판을 다 먹지 않게
    (function tm(a,x,y,w,h){if(a.length===1){out.push({...a[0],x,y,w,h});return}
      const tot=a.reduce((s,b)=>s+b.v,0);let acc=0,k=0;while(k<a.length-1&&acc+a[k].v<=tot/2){acc+=a[k].v;k++}if(!k){acc=a[0].v;k=1}
      const f=acc/tot;if(w>=h){tm(a.slice(0,k),x,y,w*f,h);tm(a.slice(k),x+w*f,y,w*(1-f),h)}else{tm(a.slice(0,k),x,y,w,h*f);tm(a.slice(k),x,y+h*f,w,h*(1-f))}})(it,0,0,W,H);
    el.innerHTML=out.map((t,k)=>{const i=t.i,a=t.w*t.h,big=a>W*H*.16,mid=a>W*H*.07,sm=t.w<110||t.h<96,o=OP(i);
      return`<a class="tmc ${big?'big':mid?'mid':sm?'sm':''}" href="issue/${i.id}" style="left:${t.x/W*100}%;top:${t.y/H*100}%;width:${t.w/W*100}%;height:${t.h/H*100}%;--c:${cc(i.category)};--d:${k*55}ms">
       <span class="tmi" ${pic(i)?bg(pic(i)):''}></span><span class="tmk"><b>${i.rank}</b>${sm?'':esc(i.category)}</span>${o.total&&!sm?`<span class="tmn">${ic('chat')}${nf(o.total)}</span>`:''}
       <span class="tmt"><b>${esc(i.title)}</b>${big&&(i.summary||[])[0]?`<small>${esc(short(i.summary[0],80))}</small>`:''}</span></a>`}).join('')};
  draw();let rw=el.clientWidth;addEventListener('resize',()=>{if(el.isConnected&&Math.abs(el.clientWidth-rw)>40){rw=el.clientWidth;draw()}});
  if(RM())return;let on=false;
  // 한두 칸이 1.2~4초 사이 무작위 간격으로 '두-근'. 화면 밖·탭 숨김이면 쉼
  const beat=()=>{if(!on||!el.isConnected||document.hidden)return;const T=$$('.tmc',el);if(!T.length)return;const b=T[Math.random()*T.length|0];if(b){b.classList.remove('beat');void b.offsetWidth;b.classList.add('beat')}
    if(Math.random()<.3){const c=T[Math.random()*T.length|0];setTimeout(()=>{if(c){c.classList.remove('beat');void c.offsetWidth;c.classList.add('beat')}},260)}
    setTimeout(beat,1200+Math.random()*2800)};
  if('IntersectionObserver'in window)new IntersectionObserver(es=>{const v=es[0].isIntersecting;if(v&&!on){on=true;setTimeout(beat,500)}on=v}).observe(el);
  el.addEventListener('pointerdown',e=>{if(e.target.closest('.tmc,.tmo-mcard'))hz(8)})}

/* ---------- ② 나라면? (찬반 한판 수준으로 고도화) ---------- */
function getStances(i){
  const S=((i.ai||{}).opinion||{}).stances||[];
  if(S.length>=2) return S.slice(0,2);
  const l=lk(i)||60, d=dl(i)||40, tot=l+d||1;
  return [
    {label:'공감해요', desc:'', share:Math.round(l/tot*100)},
    {label:'우려돼요', desc:'', share:Math.round(d/tot*100)}
  ];
}

function voteCardRes(i, myChoice){
  const S=getStances(i), tot=S.reduce((a,x)=>a+(x.share||0),0)||1;
  const my=S[myChoice]||S[0];
  const pct=Math.round((my.share||0)/tot*100);
  const A=OP(i).ages, G=OP(i).gender, am=A?Math.max(1,...Object.values(A)):1;
  return `<div class="tvr go">
    <div class="tvm"><b>${pct}%</b><span>가 나와 같은 생각이에요</span></div>
    <div class="tdsplit tvsplit">${S.map((x,j)=>`<i class="s${j} ${j===myChoice?'me':''}" style="--w:${Math.max(10,Math.round((x.share||0)/tot*100))}%"><em>${Math.round((x.share||0)/tot*100)}%</em></i>`).join('')}</div>
    <div class="tdl tvl">${S.map((x,j)=>`<div class="s${j} ${j===myChoice?'me':''}"><div class="tvlh"><b>${esc(x.label)}</b></div>${x.desc?`<p>${esc(short(x.desc,72))}</p>`:''}</div>`).join('')}</div>
    ${A&&Object.keys(A).length?`<div class="tdage tvage"><small>댓글 연령별 참여 분포</small><div class="tvag">${Object.entries(A).map(([a,v])=>`<span><i style="--h:${Math.round(v/am*100)}%"></i><b>${v}%</b><small>${a}대</small></span>`).join('')}</div></div>`:''}
    <div class="tvmeta"><span>${ic('chat')}댓글 ${nf(OP(i).total||(lk(i)+dl(i))||120)}개 기반</span><a href="issue/${i.id}#comments">토론 참여 ›</a></div>
  </div>`;
}

function voteCardAsk(i){
  const S=getStances(i);
  return `<div class="tvbt-wrap">
    <button type="button" data-k="0" class="s0"><b>${esc(S[0].label)}</b></button>
    <div class="tv-vs-badge" aria-hidden="true">VS</div>
    <button type="button" data-k="1" class="s1"><b>${esc(S[1].label)}</b></button>
  </div>`;
}

function voteHTML(I){
  const valid = I.filter(hasPic);
  const P = (valid.length ? valid : I).filter(i => (((i.ai||{}).opinion||{}).stances||[]).length >= 2 || lk(i) + dl(i) > 8);
  if(!P.length) return '';
  const VT = LS('nb-v2-vote', {});
  return sec('나라면?','What would you say?','','chat')+
    `<div class="tvrow grab-carousel" id="tvote">${P.map(i=>`<div class="tvc card" data-id="${i.id}">
      <a class="tvp" href="issue/${i.id}" ${pic(i)?bg(pic(i)):''}></a>
      <div class="tv-cat"><span class="cat ${i.category}">${esc(i.category)}</span></div>
      <div class="tvb-title"><a href="issue/${i.id}"><b>${esc(i.title)}</b></a></div>
      ${(i.summary&&i.summary[0]) ? `<div class="tvb-sum">${esc(short(i.summary[0],75))}</div>` : ''}
      <div class="tvq">${VT[i.id]!=null ? voteCardRes(i, VT[i.id]) : voteCardAsk(i)}</div>
    </div>`).join('')}</div>`;
}

function vote(I){
  const el=$('#tvote'); if(!el) return;
  const VT=LS('nb-v2-vote', {});
  el.addEventListener('click', e => {
    if (el._dragged) return;
    const b = e.target.closest('[data-k]'); if(!b) return;
    const c = b.closest('.tvc'); if(!c) return;
    const i = I.find(x => x.id === c.dataset.id); if(!i) return;
    const k = +b.dataset.k;
    VT[i.id] = k; SS('nb-v2-vote', VT); hz([12, 30, 16]);
    $('.tvq', c).innerHTML = voteCardRes(i, k);
  });
  enableElasticCarousel(el);
}

/* ---------- ③ 찬반 한 판 (나라면?으로 통합되어 레거시 호환 스텁 유지) ---------- */
function debateHTML(I){return''}
function debate(I){}

/* ---------- ④ 내 또래는? ---------- */
function agesHTML(I){const P=I.filter(i=>OP(i).ages),ages=['20','30','40','50','60'].filter(a=>P.some(i=>OP(i).ages[a]>0));if(!ages.length)return'';
  const my=String((typeof S!=='undefined'?S:{}).age||'').slice(0,2),def=ages.includes(my)?my:ages.includes('40')?'40':ages[0];
  return sec('내 또래는?','By age','','user')+`<div class="tage-card card" id="tage" data-def="${def}"><div class="tagc">${ages.map(a=>`<button type="button" data-a="${a}" class="${a===def?'on':''}">${a}대</button>`).join('')}</div><div class="tagl"></div></div>`}
function ages(I){const el=$('#tage');if(!el)return;const P=I.filter(i=>OP(i).ages);
  const list=a=>{$('.tagl',el).innerHTML=P.filter(i=>OP(i).ages[a]>0).sort((x,y)=>OP(y).ages[a]-OP(x).ages[a]).slice(0,5).map(i=>`<a href="issue/${i.id}"><span class="tagp" ${pic(i)?bg(pic(i)):''}></span><b>${esc(i.title)}</b><i style="--w:${OP(i).ages[a]}%"></i><em>${OP(i).ages[a]}%</em></a>`).join('');const l=$('.tagl',el);l.classList.remove('in');void l.offsetWidth;l.classList.add('in')};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;hz(6);$$('[data-a]',el).forEach(x=>x.classList.toggle('on',x===b));list(b.dataset.a)});list(el.dataset.def);
  const tagc = $('.tagc', el); if(tagc) enableElasticCarousel(tagc);
}

/* ---------- ⑤ 댓글 수다방 (사용자 요청으로 제거, 호환 스텁) ---------- */
function chatHTML(I){return''}
function chatList(I){return[]}
function chat(){}

/* ---------- ⑥ 얼굴로 보는 오늘 (사용자 요청으로 제거, 호환 스텁) ---------- */
function facesHTML(E){return''}

/* ---------- ⑦ 오늘의 단어 스크래치 ---------- */
function wordsHTML(W){if(!W||!W.length)return'';
  // 중복 주제/기사(예: 동일 회사/헤드라인) 제거
  const seenHeadlines = new Set();
  const diverseW = [];
  for(const w of W){
    if(!w || !w.word) continue;
    const ex = (w.examples||[]).find(x=>(x.title||'').includes(w.word)) || (w.examples||[])[0] || {};
    const key = (ex.title||'').replace(/[^\w가-힣]/g,'').slice(0,10);
    if(key && seenHeadlines.has(key)) continue;
    if(key) seenHeadlines.add(key);
    diverseW.push(w);
    if(diverseW.length >= 10) break;
  }
  // 생성 파이프라인은 정확히 열 문제를 보장한다. 화면에서도 임의로 여섯 개로
  // 잘라 버리지 않아 하루 학습량과 표시 수가 어긋나지 않게 한다.
  const finalW = diverseW.length >= Math.min(10,W.length) ? diverseW : W.slice(0, 10);
  return sec('오늘의 단어','Words of the day','<span class="more">긁으면 정답이 나와요</span>','quiz')+
    `<div class="tws grab-carousel" id="tword-deck">${finalW.map((w,k)=>{
      const ex=(w.examples||[]).find(x=>(x.title||'').includes(w.word))||(w.examples||[])[0]||{}, t=ex.title||'', has=t.includes(w.word);
      const sq = '□'.repeat(w.word ? w.word.length : 2);
      const blank = has ? esc(t).split(esc(w.word)).join(`<u>${sq}</u>`) : '';
      const mean = (w.easy||w.mean||(w.wiki||{}).desc||'').split(w.word).join(sq);
      return `<div class="twc card">
        <div class="tw-head">
          <small class="twn">Q${k+1}${w.field?` · ${esc(w.field)}`:''}</small>
          <div class="twq">${has ? `<p>${blank}</p>` : `<p><b>${sq}</b> · 이 뜻을 가진 시사 단어는?</p>`}</div>
        </div>
        <div class="twa">
          <div class="twr"><b>${esc(w.word)}</b><small>${esc(((w.wiki||{}).desc||mean||'').split(/(?<=[.!?])\s+/)[0] || ((w.wiki||{}).desc||mean||''))}</small>${ex.url?`<a href="${esc(ex.url)}" target="_blank" rel="noopener">기사 보기 ${NBI('arrow-up-right')}</a>`:''}</div>
          <canvas aria-label="긁어서 정답 보기"></canvas>
        </div>
        ${mean ? `<button type="button" class="twh" data-hint="${esc(mean)}" title="${esc(mean)}"><span>힌트</span></button><p class="tw-tip" hidden>${esc(mean)}</p>` : ''}
      </div>`;
    }).join('')}</div>`}

function words(){
  $$('.twa canvas').forEach(cv=>inview(cv,()=>scratch(cv),.01));
  const el=$('#tword-deck'); if(!el)return;enableElasticCarousel(el);
  el.addEventListener('click',e=>{const b=e.target.closest('[data-hint]');if(!b)return;const tip=b.nextElementSibling;if(!tip)return;const open=tip.hidden;tip.hidden=!open;b.classList.toggle('on',open);b.setAttribute('aria-expanded',String(open))});
}

function scratch(cv){const w=cv.parentNode.clientWidth,h=cv.parentNode.clientHeight;if(!w||!h)return;const dp=devicePixelRatio||1,x=cv.getContext('2d');cv.width=w*dp;cv.height=h*dp;x.scale(dp,dp);
  const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#c9ced9');g.addColorStop(.5,'#eef0f5');g.addColorStop(1,'#b4bac8');x.fillStyle=g;x.fillRect(0,0,w,h);
  x.fillStyle='rgba(255,255,255,.35)';for(let k=0;k<40;k++){x.fillRect(Math.random()*w,Math.random()*h,2,2)}
  x.fillStyle='#6f778e';x.font='800 14px Pretendard Variable,Pretendard,system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText('여기를 긁어 정답 확인 👆',w/2,h/2);
  x.globalCompositeOperation='destination-out';let dn=false,cnt=0,lx=0,ly=0;
  const at=e=>{const r=cv.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;x.lineWidth=36;x.lineCap='round';x.beginPath();x.moveTo(lx,ly);x.lineTo(px,py);x.stroke();lx=px;ly=py;if(cnt%6===0)hz(4);
    if(++cnt%10===0){const d=x.getImageData(0,0,cv.width,cv.height).data;let c=0,t=0;for(let k=3;k<d.length;k+=120){t++;if(!d[k])c++}if(c/t>.5&&!cv._g){cv._g=1;hz([15,40,25]);cv.classList.add('gone');cv.closest('.twc').classList.add('done');setTimeout(()=>cv.remove(),600)}}};
  cv.onpointerdown=e=>{dn=true;cv.setPointerCapture(e.pointerId);const r=cv.getBoundingClientRect();lx=e.clientX-r.left;ly=e.clientY-r.top;at(e)};cv.onpointermove=e=>dn&&at(e);cv.onpointerup=cv.onpointercancel=()=>dn=false}

/* ---------- ⑧ 실시간 검색어 톡 ---------- */
function trendImg(t){
  if(t.image && t.image.trim()) return t.image;
  if(t.img && t.img.trim()) return t.img;
  if(t.image_src && t.image_src.trim()) return t.image_src;
  const n = (t.news || t.today || [])[0];
  if(n && (n.img || n.image)) return n.img || n.image;
  if(typeof D !== 'undefined' && D && D.issues){
    const mi = D.issues.find(i => (i.title||'').includes(t.keyword) || (i.keywords||[]).includes(t.keyword));
    if(mi && pic(mi)) return pic(mi);
  }
  return '';
}

function trendBubbleBody(t, k){
  if(!t) return '';
  const n = (t.news || t.today || [])[0] || {};
  const im = trendImg(t);
  return `${im ? `<span class="ttp sq-ok" ${bg(im)}></span>` : `<span class="ttp sq-ok noimg">${ic('search')}</span>`}
  <div class="ttw-txt">
    <b><i>${k+1}위</i> ${esc(t.keyword)}${t.traffic ? ` <small>검색 ${esc(t.traffic)}</small>` : ''}</b>
    <p>${esc(n.title || t.keyword + ' 관련 주요 소식이 화제예요')}</p>
    <a href="${kh(t.keyword)}">오늘·과거 흐름 보기 ${NBI('arrow-right')}</a>
  </div>`;
}

function trendsHTML(T){
  if(!T.length) return '';
  const t0 = T[0];
  return sec('실시간 검색어','Google Trends KR','','search')+
    `<div class="ttr card" id="ttr">
      <div class="ttc">${T.map((t,k)=>`<button type="button" data-k="${k}" class="${k===0?'on':''}"><i>${k+1}</i>${esc(t.keyword)}</button>`).join('')}</div>
      <div class="ttw in">${trendBubbleBody(t0, 0)}</div>
    </div>`;
}

function trends(T){
  const el=$('#ttr'); if(!el) return;
  const w = $('.ttw', el);
  const setTail = b => {
    if(!b || !w) return;
    const badge = b.querySelector('i') || b;
    const rB = badge.getBoundingClientRect();
    const rW = w.getBoundingClientRect();
    const x = (rB.left + rB.width / 2) - rW.left;
    w.style.setProperty('--x', `${Math.round(x)}px`);
  };

  requestAnimationFrame(()=>{
    const b0 = $('[data-k="0"]', el);
    if(b0) setTail(b0);
  });
  window.addEventListener('resize', ()=>{
    const active = $('[data-k].on', el) || $('[data-k="0"]', el);
    if(active && el.isConnected) setTail(active);
  });

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if(!b) return;
    const k = +b.dataset.k, t = T[k];
    hz(8);
    $$('[data-k]', el).forEach(x => x.classList.toggle('on', x === b));
    w.hidden = false;
    w.innerHTML = trendBubbleBody(t, k);
    setTail(b);
    w.classList.remove('in'); void w.offsetWidth; w.classList.add('in');
  });
  const ttc = $('.ttc', el);
  if(ttc) enableElasticCarousel(ttc);
}

/* ---------- Ⓧ 가로 카드 레일: 마우스 끌기 · 터치 스와이프 · 스냅 복귀 ---------- */
const CARD_RAILS='.mlrow,.tvrow,.tws,.hs,.sns,.tsnl,.deck,.ctrack,.galr,.lpast';
function enableElasticCarousel(el){
  if(!el || el._elastic) return;
  el._elastic = true;
  el.classList.add('nb-drag-rail');
  let isDown=false,isDragging=false,startX=0,startY=0,startScroll=0,lastX=0,lastT=0,velX=0,activePointerId=null,blockClicksUntil=0,snapTimer=0,scrollFrame=0,pendingScroll=null,savedSnap=null,savedBehavior=null;

  // CSS scroll-snap은 드래그하는 매 순간에도 가장 가까운 카드로 되돌리려 한다.
  // 손가락/마우스를 잡은 동안에는 완전히 끄고, 놓은 뒤에만 한 번 정렬한다.
  const freeScroll=()=>{
    clearTimeout(snapTimer);
    if(savedSnap===null){
      savedSnap=el.style.scrollSnapType;
      savedBehavior=el.style.scrollBehavior;
    }
    el.style.scrollSnapType='none';
    el.style.scrollBehavior='auto';
  };
  const restoreSnap=()=>{
    if(savedSnap===null)return;
    el.style.scrollSnapType=savedSnap;
    el.style.scrollBehavior=savedBehavior;
    savedSnap=savedBehavior=null;
  };
  const flushScroll=()=>{
    if(!scrollFrame)return;
    cancelAnimationFrame(scrollFrame);scrollFrame=0;
    if(pendingScroll!==null){el.scrollLeft=pendingScroll;pendingScroll=null}
  };
  const queueScroll=left=>{
    pendingScroll=left;
    if(scrollFrame)return;
    scrollFrame=requestAnimationFrame(()=>{
      scrollFrame=0;
      if(pendingScroll!==null){el.scrollLeft=pendingScroll;pendingScroll=null}
    });
  };

  const reset=()=>{
    isDown=false;isDragging=false;activePointerId=null;
    el.classList.remove('grabbing');
  };
  const snapToCard=()=>{
    const max=Math.max(0,el.scrollWidth-el.clientWidth),cur=el.scrollLeft,cards=[...el.children];
    if(!cards.length||!max)return;
    const target=cur+(Math.abs(velX)>.35?(velX<0?Math.min(el.clientWidth*.55,180):-Math.min(el.clientWidth*.55,180)):0);
    let best=0,diff=Infinity;
    cards.forEach(card=>{const next=Math.min(max,Math.max(0,card.offsetLeft));const d=Math.abs(next-target);if(d<diff){diff=d;best=next}});
    // release 직후에도 CSS snap을 잠시 끈 상태로 두면 브라우저의 강제 스냅과
    // 이 부드러운 정렬이 서로 싸우지 않는다.
    freeScroll();
    if(el.scrollTo)el.scrollTo({left:best,behavior:RM()?'auto':'smooth'});else el.scrollLeft=best;
    clearTimeout(snapTimer);
    snapTimer=setTimeout(restoreSnap,RM()?0:520);
  };
  const onPointerDown=e=>{
    if(e.isPrimary===false||(e.button!=null&&e.button!==0)||el.scrollWidth<=el.clientWidth+1)return;
    if(e.target.closest('canvas,input,textarea,select,summary,label,[data-no-drag]'))return;
    clearTimeout(snapTimer);restoreSnap();flushScroll();
    isDown=true;isDragging=false;activePointerId=e.pointerId;
    startX=lastX=e.clientX;startY=e.clientY;startScroll=el.scrollLeft;lastT=performance.now();velX=0;
  };
  const onPointerMove=e=>{
    if(!isDown||e.pointerId!==activePointerId)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    if(!isDragging){
      if(Math.max(Math.abs(dx),Math.abs(dy))<6)return;
      if(Math.abs(dy)>Math.abs(dx)){reset();return}
      isDragging=true;el._dragged=true;el.classList.add('grabbing');
      freeScroll();
      try{el.setPointerCapture(activePointerId)}catch(x){}
    }
    e.preventDefault();
    const now=performance.now();velX=(e.clientX-lastX)/Math.max(1,now-lastT);lastX=e.clientX;lastT=now;
    const max=Math.max(0,el.scrollWidth-el.clientWidth);
    // 포인터 이벤트마다 레이아웃을 강제로 그리지 않고 한 프레임에 한 번만 반영한다.
    // 그래서 빠른 트랙패드·스와이프도 위치를 그대로, 끊김 없이 따른다.
    queueScroll(Math.max(0,Math.min(max,startScroll-dx)));
  };
  const onPointerEnd=e=>{
    if(!isDown||(e.pointerId!=null&&e.pointerId!==activePointerId))return;
    flushScroll();
    const dragged=isDragging,id=activePointerId;
    reset();
    try{el.releasePointerCapture(id)}catch(x){}
    if(!dragged)return;
    blockClicksUntil=performance.now()+420;
    snapToCard();
    setTimeout(()=>{el._dragged=false},430);
  };
  el.addEventListener('pointerdown',onPointerDown);
  el.addEventListener('pointermove',onPointerMove,{passive:false});
  el.addEventListener('pointerup',onPointerEnd);
  el.addEventListener('pointercancel',onPointerEnd);
  el.addEventListener('lostpointercapture',onPointerEnd);
  el.addEventListener('dragstart',e=>e.preventDefault());
  el.addEventListener('click',e=>{
    if(performance.now()<blockClicksUntil){e.preventDefault();e.stopPropagation()}
  },true);
}
function bindHorizontalCarousels(root=document){
  const rails=[];
  if(root.matches?.(CARD_RAILS))rails.push(root);
  rails.push(...(root.querySelectorAll?.(CARD_RAILS)||[]));
  rails.forEach(enableElasticCarousel);
}

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
  return`<section class="tsn card"><div class="tsnh"><b>${ago} 다녀가신 뒤</b><span>새로 오른 이슈 <em>${N.length}</em>개</span></div><div class="tsnl">${N.map(i=>`<a href="issue/${i.id}"><span ${pic(i)?bg(pic(i)):''}></span><b>${esc(i.title)}</b><i>${i.rank}위</i></a>`).join('')}</div></section>`}

/* ---------- ⑪ 한눈 온도(실험실 B2): 숫자 하나만 크게, 눌러야 자세히 ---------- */
function heatHTML(I){const L=I.filter(i=>lk(i)+dl(i)>10).sort((a,b)=>(OP(b).total||0)-(OP(a).total||0)).slice(0,5);if(!L.length)return'';
  return sec('한눈 온도','Mood meter','<span class="more">댓글 공감 비율 · 눌러서 자세히</span>','chat')+`<div class="tht">${L.map(i=>{const o=OP(i),t=lk(i)+dl(i)||1,p=Math.round(lk(i)/t*100),A=o.ages||{},am=Math.max(1,...Object.values(A)),S=((i.ai||{}).opinion||{}).stances||[],q=(o.top||[]).map(x=>x.text||'').find(x=>x.length>=6&&!BAD.test(x.replace(/\s/g,'')));
    return`<details class="card"><summary><span class="thp" ${pic(i)?bg(pic(i)):''}></span><div><b>${esc(i.title)}</b><i class="thb"><i style="width:${p}%"></i></i></div><strong class="${p>=60?'w':p<=45?'c':''}">${p}<small>%</small></strong></summary>
     <div class="thd">${S.map(x=>`<p><span>${esc(x.label)}</span><b>${x.share}%</b></p>`).join('')}${Object.keys(A).length?`<div class="tha">${Object.entries(A).map(([k,v])=>`<span><i style="height:${v/am*100}%"></i><small>${k}대</small></span>`).join('')}</div>`:''}${q&&!SAD.test(i.title)?`<q>${esc(short(q,90))}</q>`:''}<a href="issue/${i.id}#comments">댓글 ${nf(o.total)}개 보기 ${NBI('arrow-right')}</a></div></details>`}).join('')}</div>`}

/* ---------- ⑫ 숫자 카드(실험실 C5): 큰 숫자만 보고 맞혀 보기, 누르면 뒤집힘 ---------- */
function numsHTML(I){const re=/(\d[\d,.]*)\s?(%|％|조\s?원|억\s?원|만\s?원|조|억|만|원|달러|명|배|곳|개월|건)/,C=[];
  I.forEach(i=>{for(const t of[i.title,...(i.summary||[])]){const m=re.exec(t||'');if(m&&!/^(19|20)\d\d$/.test(m[1])){C.push({i,n:m[1],u:m[2].replace(/\s/g,''),t});break}}});if(C.length<2)return'';
  return sec('숫자 카드','Guess the number','<span class="more">무슨 숫자일까요? 눌러서 뒤집기</span>','chart')+`<div class="tnc">${C.slice(0,6).map(c=>`<button type="button" class="tfl" style="--c:${cc(c.i.category)}"><div class="f"><b>${esc(c.n)}<small>${esc(c.u)}</small></b><span>무슨 숫자일까요?</span></div><div class="k"><p>${esc(c.t)}</p><a href="issue/${c.i.id}">기사 보기 ›</a></div></button>`).join('')}</div>`}
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

window.NBT={sinceHTML,heatHTML,numsHTML,nums,hiliteHTML,hilite,search,mosaicHTML,mosaic,voteHTML,vote,debateHTML,debate,agesHTML,ages,chatHTML,chat,facesHTML,wordsHTML,words,trendsHTML,trends,easyHold,hz,enableElasticCarousel,bindHorizontalCarousels};
})();
