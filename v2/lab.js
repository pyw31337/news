/* NewsBoard v2 실험실 — 고르고 합치기 위한 콘텐츠 후보 모음(번호별)
   원칙: 손으로 만지면 반응하고, 강조할 것 하나만 크게(나머지는 힘 빼거나 눌러야 펼침). 데이터는 today_v2.json 하나.
   A 크기·흐름  B 반응·여론  C 놀이  D 사진·읽기  E 시장·검색어. 각 모듈 ♥로 고르면 아래에 '고른 번호'가 모임 */
(function(){
const N=window.NB2;if(!N)return;
const {E,cc,bg,short,nf,RM,V}=N,I=V.issues||[];
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const im=i=>i.imgs[0]||i.img;
const tag=(i,n=8)=>short((i.faces[0]||{}).n||i.kw[0]||i.cat,n);
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const OPS=I.filter(i=>i.op&&i.op.total);
const sid=i=>I.indexOf(i);
const inview=(el,f)=>{if(RM||!('IntersectionObserver'in window))return f();const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){io.disconnect();f()}},{threshold:.25});io.observe(el)};
const shuffle=a=>{a=a.slice();for(let k=a.length-1;k>0;k--){const j=Math.random()*(k+1)|0;[a[k],a[j]]=[a[j],a[k]]}return a};
const M=[];const mod=(code,title,idea,html,init)=>{if(html)M.push({code,title,idea,html,init})};

/* ===== A. 크기·흐름 ===== */
// A1 사진 모자이크: 화제도만큼 면적을 차지(버블과 달리 사각 타일·빈틈 없음)
(function(){const it=I.map(i=>({i,v:Math.max(1,i.score||1)})),out=[];
  (function tm(a,x,y,w,h){if(a.length===1){out.push({...a[0],x,y,w,h});return}
    const tot=a.reduce((s,b)=>s+b.v,0);let acc=0,k=0;while(k<a.length-1&&acc+a[k].v<=tot/2){acc+=a[k].v;k++}if(!k){acc=a[0].v;k=1}
    const f=acc/tot;if(w>=h){tm(a.slice(0,k),x,y,w*f,h);tm(a.slice(k),x+w*f,y,w*(1-f),h)}else{tm(a.slice(0,k),x,y,w,h*f);tm(a.slice(k),x,y+h*f,w,h*(1-f))}})(it,0,0,100,120);
  mod('A1','사진 모자이크','화제가 클수록 넓게. 눌러서 바로 스토리',`<div class="lb-tm">${out.map((t,k)=>`<button type="button" data-s="${sid(t.i)}" style="left:${t.x}%;top:${t.y/1.2}%;width:${t.w}%;height:${t.h/1.2}%;--c:${cc(t.i.cat)};--d:${k*50}ms"><span ${bg(im(t.i))}></span><b>${t.i.rank}</b><em>${E(t.w*t.h>1500?short(t.i.title,34):tag(t.i,7))}</em></button>`).join('')}</div>`)})();

// A2 화제도 레이스: 화면에 들어오면 막대가 순서대로 달려 나감
(function(){const mx=Math.max(...I.map(i=>i.score||1));
  mod('A2','화제도 레이스','막대가 달려 나가며 순위를 보여 줘요',`<div class="lb-race">${I.map((i,k)=>`<button type="button" data-s="${k}" style="--w:${(i.score||1)/mx*100}%;--c:${cc(i.cat)};--d:${k*90}ms"><span ${bg(im(i))}></span><div><i></i><b>${E(tag(i,9))}</b></div><em>${i.presses||0}곳</em></button>`).join('')}</div>`,
  el=>inview(el,()=>el.classList.add('go')))})();

// A3 이야기의 나이: 언제부터 이어진 뉴스인지 한 줄로
(function(){const today=new Date(V.date+'T00:00:00+09:00'),age=i=>i.first?Math.max(1,Math.round((today-new Date(i.first+'T00:00:00+09:00'))/864e5)+1):1;
  const L=I.map(i=>({i,a:age(i)})).sort((a,b)=>b.a-a.a),mx=Math.max(...L.map(x=>x.a));
  mod('A3','이야기의 나이','오늘 처음 나온 뉴스 vs 몇 달째 이어지는 뉴스',`<div class="lb-age">${L.map(({i,a})=>`<button type="button" data-s="${sid(i)}" style="--w:${Math.max(4,Math.sqrt(a/mx)*100)}%;--c:${cc(i.cat)}"><span ${bg(im(i))}></span><div><i></i><b>${E(tag(i,10))}</b></div><em>${a<=1?'<u>오늘 처음</u>':a+'일째'}</em></button>`).join('')}</div>`,
  el=>inview(el,()=>el.classList.add('go')))})();

/* ===== B. 반응·여론 ===== */
// B1 나라면? 먼저 내 생각을 누르면 다른 사람들 반응이 열림
(function(){if(!OPS.length)return;const VT=LS('nb-v2-vote',{});
  const res=(i,v)=>{const o=i.op,t=(o.like||0)+(o.dislike||0)||1,p=Math.round((v?o.like:o.dislike)/t*100);
    return`<div class="lb-vr"><b>${p}%</b><span>가 나와 같은 생각이에요</span><div class="lb-vb"><i style="--w:${(o.like||0)/t*100}%"></i></div><small><em>공감 ${Math.round((o.like||0)/t*100)}%</em><em>비공감 ${Math.round((o.dislike||0)/t*100)}%</em></small></div>`};
  mod('B1','나라면?','내 생각을 먼저 누르면, 다른 사람들 반응이 열려요',`<div class="lb-row">${OPS.map(i=>`<div class="lb-vote" data-id="${i.id}"><span class="ph" ${bg(im(i))}></span><b>${E(short(i.title,44))}</b>
    <div class="lb-vq">${VT[i.id]!=null?res(i,VT[i.id]):`<p>이 소식, 어떻게 느껴요?</p><div class="lb-vbt"><button type="button" data-v="1">👍 공감</button><button type="button" data-v="0">👎 글쎄</button></div>`}</div></div>`).join('')}</div>`,
  el=>el.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;const c=b.closest('.lb-vote'),i=I.find(x=>x.id===c.dataset.id),v=+b.dataset.v;
    VT[i.id]=v;SS('nb-v2-vote',VT);const q=$('.lb-vq',c);q.innerHTML=res(i,v);requestAnimationFrame(()=>q.classList.add('go'))}))})();

// B2 한눈 온도: 숫자 하나만 크게, 나머지는 눌러야 펼침(여론 온도계 단순화)
(function(){if(!OPS.length)return;const L=OPS.slice().sort((a,b)=>b.op.total-a.op.total).slice(0,5);
  mod('B2','한눈 온도','숫자 하나만 크게. 자세한 건 눌러서',`<div class="lb-heat">${L.map(i=>{const o=i.op,t=(o.like||0)+(o.dislike||0)||1,p=Math.round((o.like||0)/t*100),A=o.ages||{},am=Math.max(1,...Object.values(A));
    return`<details><summary><span class="ph" ${bg(im(i))}></span><div><b>${E(short(i.title,30))}</b><i class="bar"><i style="width:${p}%"></i></i></div><strong class="${p>=60?'w':p<=45?'c':''}">${p}<small>%</small></strong></summary>
    <div class="lb-hd">${(o.stances||[]).map(x=>`<p><span>${E(x.l)}</span><b>${x.s}%</b></p>`).join('')}
    ${Object.keys(A).length?`<div class="ag">${Object.entries(A).map(([k,v])=>`<span><i style="height:${v/am*100}%"></i><small>${k}대</small></span>`).join('')}</div>`:''}
    ${o.top?`<q>${E(o.top)}</q>`:''}<small class="lb-n">댓글 ${nf(o.total)}개 · 공감 비율</small></div></details>`}).join('')}</div>`)})();

// B3 내 또래는? 연령을 고르면 그 나이대가 가장 많이 댓글 단 뉴스 순
(function(){const ages=['20','30','40','50','60'].filter(a=>OPS.some(i=>(i.op.ages||{})[a]>0));if(!ages.length)return;
  const S=N.S||{},my=String(S.age||'').replace(/\D/g,'').slice(0,2),def=ages.includes(my)?my:'40';
  const list=a=>OPS.filter(i=>(i.op.ages||{})[a]>0).sort((x,y)=>y.op.ages[a]-x.op.ages[a]).slice(0,5).map(i=>`<button type="button" data-s="${sid(i)}"><span class="ph" ${bg(im(i))}></span><b>${E(short(i.title,32))}</b><i style="--w:${i.op.ages[a]}%"></i><em>${i.op.ages[a]}%</em></button>`).join('');
  mod('B3','내 또래는?','나이대를 고르면, 그 또래가 가장 많이 반응한 뉴스',`<div class="lb-chips">${ages.map(a=>`<button type="button" data-a="${a}" class="${a===def?'on':''}">${a}대</button>`).join('')}</div><div class="lb-gen">${list(def)}</div>`,
  el=>el.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;$$('[data-a]',el).forEach(x=>x.classList.toggle('on',x===b));const g=$('.lb-gen',el);g.innerHTML=list(b.dataset.a);g.classList.remove('in');void g.offsetWidth;g.classList.add('in')}))})();

// B4 오늘의 뉴스 날씨: 전체 댓글 분위기를 날씨 하나로
(function(){if(!OPS.length)return;const lk=OPS.reduce((a,i)=>a+(i.op.like||0),0),dl=OPS.reduce((a,i)=>a+(i.op.dislike||0),0),r=dl/((lk+dl)||1);
  const W=r<.2?['☀️','맑음','대체로 고개를 끄덕이는 하루예요']:r<.3?['🌤️','구름 조금','공감이 많지만 반대 목소리도 있어요']:r<.4?['☁️','흐림','의견이 꽤 갈리는 하루예요']:['⛈️','천둥번개','논쟁이 뜨거운 하루예요'];
  const sp=OPS.filter(i=>i.op.total>=30).map(i=>({i,r:(i.op.dislike||0)/(((i.op.like||0)+(i.op.dislike||0))||1)})).sort((a,b)=>b.r-a.r)[0];
  mod('B4','오늘의 뉴스 날씨','댓글 분위기를 날씨 하나로',`<div class="lb-wx"><span class="ic">${W[0]}</span><div><small>오늘 댓글 분위기</small><b>${W[1]}</b><p>${W[2]}</p></div></div>
    ${sp?`<button type="button" class="lb-wxs" data-s="${sid(sp.i)}"><span>⚡</span><div><small>가장 의견이 갈린 뉴스</small><b>${E(short(sp.i.title,38))}</b></div></button>`:''}`)})();

// B5 댓글 수다방: 이슈별 대표 댓글이 채팅처럼 하나씩 올라옴
(function(){const L=OPS.filter(i=>i.op.top).slice(0,6);if(!L.length)return;
  mod('B5','댓글 수다방','이슈별 대표 댓글이 채팅처럼 올라와요',`<div class="lb-chat">${L.map((i,k)=>`<button type="button" data-s="${sid(i)}" style="--d:${k*700}ms"><span class="av" ${bg(im(i))}></span><div><small>${i.rank}위 · ${E(tag(i,10))}</small><p>${E(short(i.op.top,80))}</p></div></button>`).join('')}</div>`,
  el=>inview(el,()=>el.classList.add('go')))})();

/* ===== C. 놀이 ===== */
// C1 OX 스와이프: 오른쪽으로 밀면 O, 왼쪽은 X
(function(){const Q=I.filter(i=>i.q);if(!Q.length)return;
  mod('C1','OX 스와이프','오른쪽으로 밀면 O, 왼쪽으로 밀면 X',`<div class="lb-sw"><div class="lb-stk"></div><p class="lb-sc"></p></div>`,el=>{let n=0,ok=0;const st=$('.lb-stk',el),sc=$('.lb-sc',el);
    const card=()=>{if(n>=Q.length){st.innerHTML=`<div class="lb-done"><b>${ok} / ${Q.length}</b><span>${ok===Q.length?'완벽해요! 🎉':ok>=Q.length/2?'잘했어요 👏':'내일 다시 도전해요'}</span><button type="button" class="lb-again">다시 하기</button></div>`;sc.textContent='';return}
      const i=Q[n];sc.textContent=`${n+1} / ${Q.length} · 맞힌 개수 ${ok}`;
      st.innerHTML=`<div class="lb-cd" style="--c:${cc(i.cat)}"><span class="ph" ${bg(im(i))}></span><p>${E(i.q.t)}</p><i class="o">O</i><i class="x">X</i><div class="lb-hint"><span>← X</span><span>O →</span></div></div>`;drag($('.lb-cd',st),i)};
    const drag=(c,i)=>{let x0=null,dx=0;c.onpointerdown=e=>{x0=e.clientX;c.setPointerCapture(e.pointerId);c.style.transition='none'};
      c.onpointermove=e=>{if(x0==null)return;dx=e.clientX-x0;c.style.transform=`translateX(${dx}px) rotate(${dx/18}deg)`;c.style.setProperty('--o',Math.max(0,dx/120));c.style.setProperty('--x',Math.max(0,-dx/120))};
      c.onpointerup=()=>{if(x0==null)return;x0=null;c.style.transition='';if(Math.abs(dx)<90){c.style.transform='';c.style.setProperty('--o',0);c.style.setProperty('--x',0);dx=0;return}
        const a=dx>0,right=a===i.q.a;if(right)ok++;sc.textContent=`${n+1} / ${Q.length} · 맞힌 개수 ${ok}`;c.style.transform=`translateX(${dx>0?600:-600}px) rotate(${dx/6}deg)`;
        setTimeout(()=>{st.innerHTML=`<div class="lb-ans ${right?'ok':'no'}"><b>${right?'정답! ⭕':'아쉬워요 ❌'}</b><span>정답은 ${i.q.a?'O':'X'}</span><p>${E(short(i.q.e,120))}</p><button type="button" class="lb-nx">다음 ›</button></div>`},220);n++;dx=0}};
    el.addEventListener('click',e=>{if(e.target.closest('.lb-nx'))card();if(e.target.closest('.lb-again')){n=ok=0;card()}});card()})})();

// C2 댓글 많은 쪽?: 두 뉴스 중 사람들이 더 많이 떠든 쪽 고르기(연속 기록)
(function(){if(OPS.length<3)return;
  mod('C2','어느 쪽이 더 뜨거웠을까?','두 뉴스 중 댓글이 더 많은 쪽을 골라요',`<div class="lb-vs"></div>`,el=>{let st=0,best=LS('nb-v2-vs',0);
    const round=()=>{let [a,b]=shuffle(OPS);while(a.op.total===b.op.total)[a,b]=shuffle(OPS);
      el.innerHTML=`<div class="lb-vsp">${[a,b].map(i=>`<button type="button" data-id="${i.id}"><span class="ph" ${bg(im(i))}></span><b>${E(short(i.title,30))}</b><em data-n="${i.op.total}">?</em></button>`).join('')}<i class="vs">VS</i></div><p class="lb-sc">연속 ${st} · 최고 ${best}</p>`};
    el.addEventListener('click',e=>{const b=e.target.closest('.lb-vsp button');if(b&&!el.dataset.lock){el.dataset.lock=1;const bs=$$('.lb-vsp button',el),ns=bs.map(x=>+$('em',x).dataset.n),w=ns[0]>ns[1]?0:1,ok=bs.indexOf(b)===w;
      bs.forEach((x,k)=>{x.classList.add(k===w?'win':'lose');$('em',x).textContent='댓글 '+nf(ns[k])});st=ok?st+1:0;if(st>best){best=st;SS('nb-v2-vs',best)}
      $('.lb-sc',el).innerHTML=`${ok?'맞혔어요! 🔥':'아쉬워요'} · 연속 ${st} · 최고 ${best} <button type="button" class="lb-nx">다음 대결 ›</button>`}
      if(e.target.closest('.lb-nx')){delete el.dataset.lock;round()}});round()})})();

// C3 흐린 사진 맞히기: 사진만 보고 무슨 뉴스인지
(function(){const P=I.filter(i=>im(i));if(P.length<3)return;
  mod('C3','흐린 사진 맞히기','흐릿한 사진만 보고 어떤 뉴스인지 골라요',`<div class="lb-blur"></div>`,el=>{let n=0;const Q=shuffle(P).slice(0,5);
    const round=()=>{if(n>=Q.length)n=0;const i=Q[n],ch=shuffle([i,...shuffle(P.filter(x=>x!==i)).slice(0,2)]);
      el.innerHTML=`<div class="lb-bp"><span ${bg(im(i))}></span></div><div class="lb-bc">${ch.map(x=>`<button type="button" data-ok="${x===i?1:0}">${E(short(x.title,36))}</button>`).join('')}</div>`};
    el.addEventListener('click',e=>{const b=e.target.closest('[data-ok]');if(b&&!b.disabled){$$('[data-ok]',el).forEach(x=>{x.disabled=true;x.classList.add(x.dataset.ok==='1'?'right':x===b?'wrong':'dim')});$('.lb-bp',el).classList.add('clear');
      el.insertAdjacentHTML('beforeend',`<button type="button" class="lb-nx">${b.dataset.ok==='1'?'정답! ':''}다음 사진 ›</button>`)}
      if(e.target.closest('.lb-nx')){n++;round()}});round()})})();

// C4 긁어서 보기: 오늘의 1위를 손가락으로 긁어 확인
(function(){const i=I[0];if(!i)return;
  mod('C4','긁어서 보는 1위','손가락으로 긁으면 오늘의 1위가 나타나요',`<div class="lb-scr"><button type="button" data-s="0" class="lb-scu"><span ${bg(im(i))}></span><b>오늘의 1위</b><p>${E(i.title)}</p></button><canvas></canvas></div>`,el=>{
    const cv=$('canvas',el),w=cv.parentNode.clientWidth,h=cv.parentNode.clientHeight,dp=devicePixelRatio||1,x=cv.getContext('2d');cv.width=w*dp;cv.height=h*dp;x.scale(dp,dp);
    const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#c9ced9');g.addColorStop(.5,'#eef0f5');g.addColorStop(1,'#b4bac8');x.fillStyle=g;x.fillRect(0,0,w,h);
    x.fillStyle='#7a8197';x.font='800 18px Pretendard Variable,system-ui';x.textAlign='center';x.fillText('여기를 손가락으로 긁어 보세요 👆',w/2,h/2);
    x.globalCompositeOperation='destination-out';let dn=false,cnt=0;
    const at=e=>{const r=cv.getBoundingClientRect();x.beginPath();x.arc(e.clientX-r.left,e.clientY-r.top,24,0,7);x.fill();
      if(++cnt%12===0){const d=x.getImageData(0,0,cv.width,cv.height).data;let c=0;for(let k=3;k<d.length;k+=160)if(!d[k])c++;if(c/(d.length/160)>.45){cv.classList.add('gone');setTimeout(()=>cv.remove(),600)}}};
    cv.onpointerdown=e=>{dn=true;cv.setPointerCapture(e.pointerId);at(e)};cv.onpointermove=e=>dn&&at(e);cv.onpointerup=()=>dn=false})})();

// C5 숫자 카드 뒤집기: 제목 속 숫자만 크게, 뒤집으면 무슨 숫자인지
(function(){const re=/(\d[\d,.]*)\s?(%|％|조\s?원|억\s?원|만\s?원|조|억|만|원|달러|명|배|곳|개월|년|건)/;
  const C=[];I.forEach(i=>{for(const t of[i.title,i.today]){const m=re.exec(t||'');if(m&&!/^(19|20)\d\d$/.test(m[1])){C.push({i,n:m[1],u:m[2].replace(/\s/g,''),t});break}}});
  if(C.length<2)return;
  mod('C5','숫자 카드','큰 숫자만 보고 맞혀 보세요. 누르면 뒤집혀요',`<div class="lb-flips">${C.slice(0,6).map(c=>`<button type="button" class="lb-fl" style="--c:${cc(c.i.cat)}"><div class="f"><b>${E(c.n)}<small>${E(c.u)}</small></b><span>무슨 숫자일까요?</span></div><div class="k"><p>${E(short(c.t,56))}</p><span data-s="${sid(c.i)}">스토리 보기 ›</span></div></button>`).join('')}</div>`,
  el=>el.addEventListener('click',e=>{if(e.target.closest('[data-s]'))return;const b=e.target.closest('.lb-fl');if(b){e.stopPropagation();b.classList.toggle('on')}},true))})();

// C6 오늘의 용어 카드: 단어 앞면, 뒤집으면 쉬운 뜻
(function(){const G={};I.forEach(i=>Object.entries(i.gloss||{}).forEach(([w,m])=>{if(!G[w])G[w]={m,i}}));const L=Object.entries(G).slice(0,8);if(L.length<2)return;
  mod('C6','오늘의 용어 카드','오늘 뉴스 속 어려운 말, 뒤집으면 쉬운 뜻',`<div class="lb-flips">${L.map(([w,g])=>`<button type="button" class="lb-fl tm" style="--c:${cc(g.i.cat)}"><div class="f"><b class="w">${E(w)}</b><span>${E(tag(g.i,10))} 뉴스에 나왔어요</span></div><div class="k"><p>${E(g.m)}</p></div></button>`).join('')}</div>`,
  el=>el.addEventListener('click',e=>{const b=e.target.closest('.lb-fl');if(b){e.stopPropagation();b.classList.toggle('on')}},true))})();

/* ===== D. 사진·읽기 ===== */
// D1 오늘의 한 장: 큰 사진을 넘겨 보고, 두 번 톡 하면 하트
(function(){const P=I.filter(i=>i.imgs.length);if(!P.length)return;const H=LS('nb-v2-heart',{});
  mod('D1','오늘의 한 장','큰 사진을 넘겨 보고, 두 번 톡 하면 ♥',`<div class="lb-ph">${P.map(i=>`<figure data-id="${i.id}"><span ${bg(i.imgs[1]||im(i))}></span><figcaption><b>${E(tag(i,10))}</b>${E(short(i.title,40))}</figcaption><i class="ht ${H[i.id]?'on':''}">♥</i></figure>`).join('')}</div>`,
  el=>{let t=0;el.addEventListener('click',e=>{const f=e.target.closest('figure');if(!f)return;const now=Date.now();
    if(now-t<320){const id=f.dataset.id;H[id]=!H[id];SS('nb-v2-heart',H);$('.ht',f).classList.toggle('on',!!H[id]);if(H[id]){const b=document.createElement('b');b.className='burst';b.textContent='♥';b.style.left=e.offsetX+'px';b.style.top=e.offsetY+'px';f.appendChild(b);setTimeout(()=>b.remove(),800)}t=0}
    else{t=now;const i=I.find(x=>x.id===f.dataset.id);clearTimeout(f._t);f._t=setTimeout(()=>{if(t===now)N.story(sid(i),0)},340)}})})})();

// D2 쉬운 말 스위치: 같은 뉴스를 '원래 말 ↔ 쉬운 말'로 바로 바꿔 봄
(function(){const P=I.filter(i=>i.easy&&i.easy.length&&i.summary&&i.summary.length);if(!P.length)return;
  mod('D2','쉬운 말 스위치','스위치 하나로 어려운 기사 ↔ 쉬운 말',`<label class="lb-tg"><input type="checkbox" checked><i></i><span>쉬운 말로 보기</span></label><div class="lb-row">${P.map(i=>`<div class="lb-ez" data-s="${sid(i)}"><span class="ph" ${bg(im(i))}></span><b>${E(short(i.title,40))}</b><ul class="e">${i.easy.map(t=>`<li>${E(t)}</li>`).join('')}</ul><ul class="o">${i.summary.map(t=>`<li>${E(short(t,140))}</li>`).join('')}</ul></div>`).join('')}</div>`,
  el=>{const c=$('input',el);c.onchange=()=>el.classList.toggle('orig',!c.checked)})})();

/* ===== E. 시장·검색어 ===== */
// E1 시장 온도판: 오르면 빨강, 내리면 파랑. 많이 움직일수록 진하게
(function(){const L=V.market||[];if(!L.length)return;const mx=Math.max(1,...L.map(m=>Math.abs(parseFloat(m.rate)||0)));
  mod('E1','시장 온도판','오르면 빨강, 내리면 파랑. 많이 움직일수록 진하게',`<div class="lb-hm">${L.map(m=>{const r=parseFloat(m.rate)||0,a=.18+Math.abs(r)/mx*.82;return`<a href="market/${encodeURIComponent(m.name)}" style="background:${r>0?`rgba(240,68,82,${a})`:r<0?`rgba(49,130,246,${a})`:'#e4e7ee'};color:${a>.55?'#fff':'var(--ink)'}"><small>${E(m.name)}</small><b>${r>0?'+':''}${r.toFixed(2)}%</b><em>${E(m.price)}</em></a>`}).join('')}</div>`)})();

// E2 검색어 톡: 누르면 왜 뜨는지 말풍선
(function(){const L=(V.trends||[]).filter(t=>t.k).slice(0,9);if(!L.length)return;
  mod('E2','검색어, 왜 떴지?','검색어를 누르면 이유가 말풍선으로',`<div class="lb-tr">${L.map((t,k)=>`<button type="button" data-k="${k}"><i>${k+1}</i>${E(t.k)}</button>`).join('')}</div><div class="lb-why" hidden></div>`,
  el=>el.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;const t=L[+b.dataset.k],w=$('.lb-why',el),on=b.classList.contains('on');
    $$('[data-k]',el).forEach(x=>x.classList.remove('on'));if(on){w.hidden=true;return}b.classList.add('on');w.hidden=false;
    w.innerHTML=`<b>${E(t.k)}</b>${E(t.why||'이유를 찾는 중이에요')}<a href="kw/${encodeURIComponent(t.k)}">관련 뉴스 ›</a>`;w.classList.remove('in');void w.offsetWidth;w.classList.add('in')}))})();

/* ---------- 그리기 + 고르기 ---------- */
const host=document.getElementById('lab');if(!host||!M.length)return;
const PK=new Set(LS('nb-v2-pick',[]));
const GN={A:'크기·흐름',B:'반응·여론',C:'놀이',D:'사진·읽기',E:'시장·검색어'};let last='';
host.innerHTML=`<div class="lb-intro"><b>🧪 실험실</b><p>여러 방식으로 만들어 봤어요. 마음에 드는 것에 <em>♥</em>를 눌러 주세요. 고른 것끼리 합쳐서 다듬을게요.</p></div>`+
  M.map(m=>{const g=m.code[0],h=g!==last?`<h3 class="lb-g">${g} · ${GN[g]}</h3>`:'';last=g;
    return h+`<section class="lb" data-code="${m.code}"><header><span class="cd">${m.code}</span><div><b>${E(m.title)}</b><small>${E(m.idea)}</small></div><button type="button" class="pk ${PK.has(m.code)?'on':''}" aria-label="${m.code} 고르기">♥</button></header><div class="lb-b">${m.html}</div></section>`}).join('')+
  `<div class="lb-pick" hidden><span></span><button type="button">번호 복사</button></div>`;
M.forEach(m=>{if(m.init)try{m.init($(`.lb[data-code="${m.code}"] .lb-b`,host))}catch(e){console.warn(m.code,e)}});
const bar=$('.lb-pick',host),upd=()=>{const a=[...PK].sort();bar.hidden=!a.length;$('span',bar).textContent='고른 번호 '+a.join(', ');SS('nb-v2-pick',a)};upd();
host.addEventListener('click',e=>{const p=e.target.closest('.pk');if(p){const c=p.closest('.lb').dataset.code;PK.has(c)?PK.delete(c):PK.add(c);p.classList.toggle('on',PK.has(c));upd();return}
  if(e.target.closest('.lb-pick button')){const t='v2 실험실에서 고른 번호: '+[...PK].sort().join(', ');(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>{e.target.textContent='복사했어요 ✓';setTimeout(()=>e.target.textContent='번호 복사',1500)},()=>prompt('복사해 주세요',t))}});
})();
