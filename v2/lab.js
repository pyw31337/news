/* NewsBoard v2 실험실 — 고르고 합치기 위한 콘텐츠 후보 모음(번호별)
   원칙: 손으로 만지면 반응하고, 강조할 것 하나만 크게(나머지는 힘 빼거나 눌러야 펼침). 데이터는 today_v2.json 하나.
   A 크기·흐름  B 반응·여론  C 놀이  D 사진·읽기  E 시장·검색어  F 새 후보. 각 모듈 ♥로 고르면 아래에 '고른 번호'가 모임
   시안 4(사용자 피드백): B4·C3 뺌, A1은 분야 모자이크+비주기 두근두근, A2·A3 가는 막대+큰 숫자, C6 형광펜 단어장, D2 꾹 눌러 쉬운 말, E1 진짜 온도계, F 새 후보 4개, 손끝 진동(지원 기기) */
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
const M=[];const mod=(code,title,idea,html,init,st)=>{if(html)M.push({code,title,idea,html,init,st})};
// 손끝 진동: 안드로이드 등 지원 기기만(아이폰 사파리는 미지원이라 조용히 넘어감)
const hz=(p=10)=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};

/* ===== A. 크기·흐름 ===== */
// A1 분야 모자이크: 분야별 화제 총량만큼 면적, 사진은 그 분야 1위 기사. 칸마다 불규칙하게 두근두근
(function(){const G={};I.forEach(i=>{const g=G[i.cat]||(G[i.cat]={c:i.cat,v:0,n:0,top:i});g.v+=Math.max(1,i.score||1);g.n++});
  const it=Object.values(G).sort((a,b)=>b.v-a.v).map(g=>({g,v:g.v})),out=[];if(it.length<2)return;
  (function tm(a,x,y,w,h){if(a.length===1){out.push({...a[0],x,y,w,h});return}
    const tot=a.reduce((s,b)=>s+b.v,0);let acc=0,k=0;while(k<a.length-1&&acc+a[k].v<=tot/2){acc+=a[k].v;k++}if(!k){acc=a[0].v;k=1}
    const f=acc/tot;if(w>=h){tm(a.slice(0,k),x,y,w*f,h);tm(a.slice(k),x+w*f,y,w*(1-f),h)}else{tm(a.slice(0,k),x,y,w,h*f);tm(a.slice(k),x,y+h*f,w,h*(1-f))}})(it,0,0,100,110);
  mod('A1','분야 모자이크','분야별 화제만큼 넓게. 칸이 가끔 두근두근해요',`<div class="lb-tm">${out.map((t,k)=>`<button type="button" data-s="${sid(t.g.top)}" style="left:${t.x}%;top:${t.y/1.1}%;width:${t.w}%;height:${t.h/1.1}%;--c:${cc(t.g.c)};--d:${k*60}ms"><span ${bg(im(t.g.top))}></span><b>${E(t.g.c)}<small>${t.g.n}건</small></b><em>${E(t.w*t.h>1800?short(t.g.top.title,30):tag(t.g.top,7))}</em></button>`).join('')}</div>`,
  el=>{if(RM)return;const T=$$('.lb-tm button',el);let on=false;
    // 한 번에 한두 칸만, 1.2~4초 사이 무작위 간격으로 '두-근' 두 번 뛰기. 화면 밖이거나 탭이 숨으면 멈춤
    const beat=()=>{if(!on||document.hidden)return;const b=T[Math.random()*T.length|0];b.classList.remove('beat');void b.offsetWidth;b.classList.add('beat');
      if(Math.random()<.3){const c=T[Math.random()*T.length|0];setTimeout(()=>{c.classList.remove('beat');void c.offsetWidth;c.classList.add('beat')},260)}
      setTimeout(beat,1200+Math.random()*2800)};
    new IntersectionObserver(es=>{const v=es[0].isIntersecting;if(v&&!on){on=true;setTimeout(beat,600)}on=v}).observe(el);
    el.addEventListener('pointerdown',e=>{if(e.target.closest('.lb-tm button'))hz(8)})},'fix')})();

// A2 화제도 레이스: 화면에 들어오면 막대가 순서대로 달려 나감
(function(){const mx=Math.max(...I.map(i=>i.score||1));
  mod('A2','화제도 레이스','막대가 달려 나가며 순위를 보여 줘요',`<div class="lb-race">${I.map((i,k)=>`<button type="button" data-s="${k}" style="--w:${(i.score||1)/mx*100}%;--c:${cc(i.cat)};--d:${k*90}ms"><span ${bg(im(i))}></span><div><b>${E(tag(i,9))}</b><i></i></div><em>${i.presses||0}<small>곳</small></em></button>`).join('')}</div>`,
  el=>inview(el,()=>el.classList.add('go')),'fix')})();

// A3 이야기의 나이: 언제부터 이어진 뉴스인지 한 줄로
(function(){const today=new Date(V.date+'T00:00:00+09:00'),age=i=>i.first?Math.max(1,Math.round((today-new Date(i.first+'T00:00:00+09:00'))/864e5)+1):1;
  const L=I.map(i=>({i,a:age(i)})).sort((a,b)=>b.a-a.a),mx=Math.max(...L.map(x=>x.a));
  mod('A3','이야기의 나이','오늘 처음 나온 뉴스 vs 몇 달째 이어지는 뉴스',`<div class="lb-age">${L.map(({i,a})=>`<button type="button" data-s="${sid(i)}" style="--w:${Math.max(4,Math.sqrt(a/mx)*100)}%;--c:${cc(i.cat)}"><span ${bg(im(i))}></span><div><b>${E(tag(i,10))}</b><i></i></div><em>${a<=1?'<u>NEW</u>':a+'<small>일째</small>'}</em></button>`).join('')}</div>`,
  el=>inview(el,()=>el.classList.add('go')),'fix')})();

/* ===== B. 반응·여론 ===== */
// B1 나라면? 먼저 내 생각을 누르면 다른 사람들 반응이 열림
(function(){if(!OPS.length)return;const VT=LS('nb-v2-vote',{});
  const res=(i,v)=>{const o=i.op,t=(o.like||0)+(o.dislike||0)||1,p=Math.round((v?o.like:o.dislike)/t*100);
    return`<div class="lb-vr"><b>${p}%</b><span>가 나와 같은 생각이에요</span><div class="lb-vb"><i style="--w:${(o.like||0)/t*100}%"></i></div><small><em>공감 ${Math.round((o.like||0)/t*100)}%</em><em>비공감 ${Math.round((o.dislike||0)/t*100)}%</em></small></div>`};
  mod('B1','나라면?','내 생각을 먼저 누르면, 다른 사람들 반응이 열려요',`<div class="lb-row">${OPS.map(i=>`<div class="lb-vote" data-id="${i.id}"><span class="ph" ${bg(im(i))}></span><b>${E(short(i.title,44))}</b>
    <div class="lb-vq">${VT[i.id]!=null?res(i,VT[i.id]):`<p>이 소식, 어떻게 느껴요?</p><div class="lb-vbt"><button type="button" data-v="1">👍 공감</button><button type="button" data-v="0">👎 글쎄</button></div>`}</div></div>`).join('')}</div>`,
  el=>el.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;const c=b.closest('.lb-vote'),i=I.find(x=>x.id===c.dataset.id),v=+b.dataset.v;
    VT[i.id]=v;SS('nb-v2-vote',VT);hz(12);const q=$('.lb-vq',c);q.innerHTML=res(i,v);requestAnimationFrame(()=>q.classList.add('go'))}))})();

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
      c.onpointermove=e=>{if(x0==null)return;dx=e.clientX-x0;c.style.transform=`translateX(${dx}px) rotate(${dx/18}deg)`;c.style.setProperty('--o',Math.max(0,dx/120));c.style.setProperty('--x',Math.max(0,-dx/120));const over=Math.abs(dx)>=90;if(over!==c._over){c._over=over;over&&hz(8)}};
      c.onpointerup=()=>{if(x0==null)return;x0=null;c.style.transition='';if(Math.abs(dx)<90){c.style.transform='';c.style.setProperty('--o',0);c.style.setProperty('--x',0);dx=0;return}
        const a=dx>0,right=a===i.q.a;if(right)ok++;hz(right?15:[30,40,30]);sc.textContent=`${n+1} / ${Q.length} · 맞힌 개수 ${ok}`;c.style.transform=`translateX(${dx>0?600:-600}px) rotate(${dx/6}deg)`;
        setTimeout(()=>{st.innerHTML=`<div class="lb-ans ${right?'ok':'no'}"><b>${right?'정답! ⭕':'아쉬워요 ❌'}</b><span>정답은 ${i.q.a?'O':'X'}</span><p>${E(short(i.q.e,120))}</p><button type="button" class="lb-nx">다음 ›</button></div>`},220);n++;dx=0}};
    el.addEventListener('click',e=>{if(e.target.closest('.lb-nx'))card();if(e.target.closest('.lb-again')){n=ok=0;card()}});card()})})();

// C2 댓글 많은 쪽?: 두 뉴스 중 사람들이 더 많이 떠든 쪽 고르기(연속 기록)
(function(){if(OPS.length<3)return;
  mod('C2','어느 쪽이 더 뜨거웠을까?','두 뉴스 중 댓글이 더 많은 쪽을 골라요',`<div class="lb-vs"></div>`,el=>{let st=0,best=LS('nb-v2-vs',0);
    const round=()=>{let [a,b]=shuffle(OPS);while(a.op.total===b.op.total)[a,b]=shuffle(OPS);
      el.innerHTML=`<div class="lb-vsp">${[a,b].map(i=>`<button type="button" data-id="${i.id}"><span class="ph" ${bg(im(i))}></span><b>${E(short(i.title,30))}</b><em data-n="${i.op.total}">?</em></button>`).join('')}<i class="vs">VS</i></div><p class="lb-sc">연속 ${st} · 최고 ${best}</p>`};
    el.addEventListener('click',e=>{const b=e.target.closest('.lb-vsp button');if(b&&!el.dataset.lock){el.dataset.lock=1;const bs=$$('.lb-vsp button',el),ns=bs.map(x=>+$('em',x).dataset.n),w=ns[0]>ns[1]?0:1,ok=bs.indexOf(b)===w;
      bs.forEach((x,k)=>{x.classList.add(k===w?'win':'lose');$('em',x).textContent='댓글 '+nf(ns[k])});hz(ok?15:[30,40,30]);st=ok?st+1:0;if(st>best){best=st;SS('nb-v2-vs',best)}
      $('.lb-sc',el).innerHTML=`${ok?'맞혔어요! 🔥':'아쉬워요'} · 연속 ${st} · 최고 ${best} <button type="button" class="lb-nx">다음 대결 ›</button>`}
      if(e.target.closest('.lb-nx')){delete el.dataset.lock;round()}});round()})})();

// C4 긁어서 보기: 오늘의 1위를 손가락으로 긁어 확인
(function(){const i=I[0];if(!i)return;
  mod('C4','긁어서 보는 1위','손가락으로 긁으면 오늘의 1위가 나타나요',`<div class="lb-scr"><button type="button" data-s="0" class="lb-scu"><span ${bg(im(i))}></span><b>오늘의 1위</b><p>${E(i.title)}</p></button><canvas></canvas></div>`,el=>{
    const cv=$('canvas',el),w=cv.parentNode.clientWidth,h=cv.parentNode.clientHeight,dp=devicePixelRatio||1,x=cv.getContext('2d');cv.width=w*dp;cv.height=h*dp;x.scale(dp,dp);
    const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#c9ced9');g.addColorStop(.5,'#eef0f5');g.addColorStop(1,'#b4bac8');x.fillStyle=g;x.fillRect(0,0,w,h);
    x.fillStyle='#7a8197';x.font='800 18px Pretendard Variable,system-ui';x.textAlign='center';x.fillText('여기를 손가락으로 긁어 보세요 👆',w/2,h/2);
    x.globalCompositeOperation='destination-out';let dn=false,cnt=0;
    const at=e=>{const r=cv.getBoundingClientRect();if(cnt%6===0)hz(4);x.beginPath();x.arc(e.clientX-r.left,e.clientY-r.top,24,0,7);x.fill();
      if(++cnt%12===0){const d=x.getImageData(0,0,cv.width,cv.height).data;let c=0;for(let k=3;k<d.length;k+=160)if(!d[k])c++;if(c/(d.length/160)>.45&&!cv._g){cv._g=1;hz([20,40,60]);cv.classList.add('gone');setTimeout(()=>cv.remove(),600)}}};
    cv.onpointerdown=e=>{dn=true;cv.setPointerCapture(e.pointerId);at(e)};cv.onpointermove=e=>dn&&at(e);cv.onpointerup=()=>dn=false})})();

// C5 숫자 카드 뒤집기: 제목 속 숫자만 크게, 뒤집으면 무슨 숫자인지
(function(){const re=/(\d[\d,.]*)\s?(%|％|조\s?원|억\s?원|만\s?원|조|억|만|원|달러|명|배|곳|개월|년|건)/;
  const C=[];I.forEach(i=>{for(const t of[i.title,i.today]){const m=re.exec(t||'');if(m&&!/^(19|20)\d\d$/.test(m[1])){C.push({i,n:m[1],u:m[2].replace(/\s/g,''),t});break}}});
  if(C.length<2)return;
  mod('C5','숫자 카드','큰 숫자만 보고 맞혀 보세요. 누르면 뒤집혀요',`<div class="lb-flips">${C.slice(0,6).map(c=>`<button type="button" class="lb-fl" style="--c:${cc(c.i.cat)}"><div class="f"><b>${E(c.n)}<small>${E(c.u)}</small></b><span>무슨 숫자일까요?</span></div><div class="k"><p>${E(short(c.t,56))}</p><span data-s="${sid(c.i)}">스토리 보기 ›</span></div></button>`).join('')}</div>`,
  el=>el.addEventListener('click',e=>{if(e.target.closest('[data-s]'))return;const b=e.target.closest('.lb-fl');if(b){e.stopPropagation();hz(10);b.classList.toggle('on')}},true))})();

// C6 형광펜 단어장: 단어를 누르면 기사 제목 속 그 단어에 형광펜이 쓱 칠해지고, 아래에 쉬운 뜻
(function(){const G={};I.forEach(i=>Object.entries(i.gloss||{}).forEach(([w,m])=>{if(!G[w])G[w]={m,i}}));const L=Object.entries(G).slice(0,8);if(L.length<2)return;
  const hl=(t,w)=>{const k=t.indexOf(w);return k<0?E(t)+` <mark>${E(w)}</mark>`:E(t.slice(0,k))+`<mark>${E(w)}</mark>`+E(t.slice(k+w.length))};
  const show=k=>{const [w,g]=L[k],t=[g.i.title,...(g.i.summary||[])].find(x=>x.includes(w))||g.i.title;
    return`<div class="lb-dic" style="--c:${cc(g.i.cat)}"><p class="src">${hl(short(t,90),w)}</p><div class="mean"><b>${E(w)}</b><span>${E(g.m)}</span></div><button type="button" data-s="${sid(g.i)}">이 뉴스 스토리 보기 ›</button></div>`};
  mod('C6','형광펜 단어장','어려운 말을 누르면 기사 속 그 단어에 형광펜이 칠해져요',`<div class="lb-wds">${L.map(([w],k)=>`<button type="button" data-w="${k}" class="${k?'':'on'}">${E(w)}</button>`).join('')}</div><div class="lb-dw">${show(0)}</div>`,
  el=>{const go=()=>{const m=$('mark',el);m&&requestAnimationFrame(()=>m.classList.add('go'))};inview(el,go);
    el.addEventListener('click',e=>{const b=e.target.closest('[data-w]');if(!b)return;hz(8);$$('[data-w]',el).forEach(x=>x.classList.toggle('on',x===b));$('.lb-dw',el).innerHTML=show(+b.dataset.w);setTimeout(go,30)})},'fix')})();

/* ===== D. 사진·읽기 ===== */
// D1 오늘의 한 장: 큰 사진을 넘겨 보고, 두 번 톡 하면 하트
(function(){const P=I.filter(i=>i.imgs.length);if(!P.length)return;const H=LS('nb-v2-heart',{});
  mod('D1','오늘의 한 장','큰 사진을 넘겨 보고, 두 번 톡 하면 ♥',`<div class="lb-ph">${P.map(i=>`<figure data-id="${i.id}"><span ${bg(i.imgs[1]||im(i))}></span><figcaption><b>${E(tag(i,10))}</b>${E(short(i.title,40))}</figcaption><i class="ht ${H[i.id]?'on':''}">♥</i></figure>`).join('')}</div>`,
  el=>{let t=0;el.addEventListener('click',e=>{const f=e.target.closest('figure');if(!f)return;const now=Date.now();
    if(now-t<320){const id=f.dataset.id;H[id]=!H[id];SS('nb-v2-heart',H);$('.ht',f).classList.toggle('on',!!H[id]);if(H[id]){hz([10,30,15]);const b=document.createElement('b');b.className='burst';b.textContent='♥';b.style.left=e.offsetX+'px';b.style.top=e.offsetY+'px';f.appendChild(b);setTimeout(()=>b.remove(),800)}t=0}
    else{t=now;const i=I.find(x=>x.id===f.dataset.id);clearTimeout(f._t);f._t=setTimeout(()=>{if(t===now)N.story(sid(i),0)},340)}})})})();

// D2 꾹 눌러 쉬운 말: 원래 요약 위를 꾹 누르고 있는 동안만 쉬운 말. 두 글을 같은 칸에 겹쳐 높이가 변하지 않음
(function(){const P=I.filter(i=>i.easy&&i.easy.length&&i.summary&&i.summary.length);if(!P.length)return;
  mod('D2','꾹 눌러 쉬운 말','어려운 요약을 꾹 누르고 있으면 쉬운 말로 바뀌어요',`<div class="lb-row">${P.map(i=>`<div class="lb-ez"><span class="ph" ${bg(im(i))}></span><b>${E(short(i.title,40))}</b><div class="lb-ezt"><p class="o">${E(short(i.summary.join(' '),130))}</p><p class="e">${E(i.easy.join(' '))}</p></div><div class="lb-ezh"><i></i><span>꾹 누르면 쉬운 말</span></div></div>`).join('')}</div>`,
  el=>{let c=null,t=0;const off=()=>{clearTimeout(t);if(c){c.classList.remove('easy','hold');c=null}};
    el.addEventListener('pointerdown',e=>{const x=e.target.closest('.lb-ez');if(!x)return;off();c=x;x.classList.add('hold');t=setTimeout(()=>{x.classList.add('easy');hz(12)},280)});
    ['pointerup','pointercancel','pointerleave'].forEach(k=>el.addEventListener(k,off));el.addEventListener('contextmenu',e=>e.target.closest('.lb-ez')&&e.preventDefault())},'fix')})();

/* ===== E. 시장·검색어 ===== */
// E1 시장 온도계: 유리관 속 수은이 0(가운데 눈금)에서 오르면 빨강·내리면 파랑으로 차오름
(function(){const L=(V.market||[]).slice(0,8);if(!L.length)return;const mx=Math.max(1,...L.map(m=>Math.abs(parseFloat(m.rate)||0)));
  mod('E1','시장 온도계','가운데가 0℃. 오르면 빨갛게 차오르고, 내리면 파랗게 내려가요',`<div class="lb-th">${L.map(m=>{const r=parseFloat(m.rate)||0,lv=50+r/mx*42;
    return`<a href="market/${encodeURIComponent(m.name)}" class="${r>0?'u':r<0?'d':''}" style="--lv:${lv}%"><div class="tube"><i class="z"></i><i class="hg"></i></div><span class="bulb"></span><b>${r>0?'+':''}${r.toFixed(2)}<small>%</small></b><small>${E(m.name.replace(/\s.*$/,''))}</small></a>`}).join('')}</div>`,
  el=>inview(el,()=>el.classList.add('go')),'fix')})();

// E2 검색어 톡: 누르면 왜 뜨는지 말풍선
(function(){const L=(V.trends||[]).filter(t=>t.k).slice(0,9);if(!L.length)return;
  mod('E2','검색어, 왜 떴지?','검색어를 누르면 이유가 말풍선으로',`<div class="lb-tr">${L.map((t,k)=>`<button type="button" data-k="${k}"><i>${k+1}</i>${E(t.k)}</button>`).join('')}</div><div class="lb-why" hidden></div>`,
  el=>el.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;const t=L[+b.dataset.k],w=$('.lb-why',el),on=b.classList.contains('on');
    hz(8);$$('[data-k]',el).forEach(x=>x.classList.remove('on'));if(on){w.hidden=true;return}b.classList.add('on');w.hidden=false;
    w.innerHTML=`<b>${E(t.k)}</b>${E(t.why||'이유를 찾는 중이에요')}<a href="kw/${encodeURIComponent(t.k)}">관련 뉴스 ›</a>`;w.classList.remove('in');void w.offsetWidth;w.classList.add('in')}))})();

/* ===== F. 새 후보(시안 4) ===== */
// F1 짝꿍 찾기: 왼쪽 얼굴과 오른쪽 뉴스 제목 중 서로 맞는 것끼리 짝지음
(function(){const pf=i=>(i.faces||[]).find(f=>f.img&&f.t==='person'),seen=new Set(),Q=[];
  I.forEach(i=>{const f=pf(i);if(f&&!seen.has(f.n)){seen.add(f.n);Q.push({i,f})}});if(Q.length<3)return;
  mod('F1','짝꿍 찾기','얼굴과 뉴스 제목을 짝지어 보세요',`<div class="lb-mt"></div><p class="lb-sc"></p>`,el=>{const box=$('.lb-mt',el),sc=$('.lb-sc',el);
    const deal=()=>{const P=shuffle(Q).slice(0,3),R=shuffle(P);let pick=null,done=0;
      box.innerHTML=`<div>${P.map((x,k)=>`<button type="button" class="fc" data-k="${x.i.id}"><span ${bg(x.f.img)}></span><b>${E(x.f.n)}</b></button>`).join('')}</div><div>${R.map(x=>`<button type="button" class="tt" data-k="${x.i.id}">${E(short(x.i.title,34))}</button>`).join('')}</div>`;
      sc.textContent='얼굴 하나, 제목 하나를 눌러 짝을 지어요';
      box.onclick=e=>{const b=e.target.closest('button');if(!b||b.classList.contains('ok'))return;hz(6);
        if(!pick||pick.className.split(' ')[0]===b.className.split(' ')[0]){pick&&pick.classList.remove('sel');pick=b;b.classList.add('sel');return}
        if(pick.dataset.k===b.dataset.k){const i=I.find(x=>x.id===b.dataset.k);[pick,b].forEach(x=>{x.classList.remove('sel');x.classList.add('ok')});hz([12,30,12]);done++;
          sc.innerHTML=`<b>짝꿍!</b> <button type="button" class="lb-nx" data-s="${sid(i)}">스토리 보기</button>`;
          if(done===3)setTimeout(()=>{sc.innerHTML='모두 찾았어요 🎉 <button type="button" class="lb-nx lb-re">다른 얼굴로</button>'},1400)}
        else{const a=pick;[a,b].forEach(x=>x.classList.add('no'));hz([30,40,30]);setTimeout(()=>[a,b].forEach(x=>x.classList.remove('no','sel')),450)}pick=null}};
    el.addEventListener('click',e=>{if(e.target.closest('.lb-re'))deal()});deal()},'new')})();

// F2 공감률 맞히기: 손가락으로 끌어서 '몇 %가 공감했을까' 예상 → 실제와 비교
(function(){const P=shuffle(OPS.filter(i=>(i.op.like||0)+(i.op.dislike||0)>20));if(!P.length)return;
  mod('F2','공감률 맞히기','몇 %가 공감했을지 끌어서 맞혀 보세요',`<div class="lb-gs"></div>`,el=>{let n=0,sum=0,cnt=0;
    const round=()=>{const i=P[n%P.length],o=i.op,real=Math.round((o.like||0)/(((o.like||0)+(o.dislike||0))||1)*100);
      el.innerHTML=`<div class="lb-gq"><span class="ph" ${bg(im(i))}></span><b>${E(short(i.title,48))}</b></div><div class="lb-gv"><b>50</b><small>%가 공감했을 것 같아요</small></div>
        <div class="lb-sl"><input type="range" min="0" max="100" value="50" aria-label="예상 공감률"><i class="real" style="left:${real}%" hidden></i></div><button type="button" class="lb-nx lb-ok">확인</button>`;
      const r=$('input',el),v=$('.lb-gv b',el);let last=50;r.oninput=()=>{v.textContent=r.value;if(Math.abs(r.value-last)>=5){last=+r.value;hz(3)}};
      $('.lb-ok',el).onclick=()=>{const g=+r.value,d=Math.abs(g-real);sum+=d;cnt++;r.disabled=true;$('.real',el).hidden=false;hz(d<=10?[12,30,12]:20);
        $('.lb-gv',el).innerHTML=`<b>${real}</b><small>% 실제 공감 · 내 예상 ${g}% · 오차 ${d}%p</small>`;
        $('.lb-ok',el).outerHTML=`<p class="lb-sc">${d<=5?'눈치 백단! 🎯':d<=15?'꽤 비슷해요 👍':'생각과 달랐네요 🤔'} · 평균 오차 ${Math.round(sum/cnt)}%p <button type="button" class="lb-nx lb-nn">다음 ›</button></p>`;$('.lb-nn',el).onclick=()=>{n++;round()}}};
    round()},'new')})();

// F3 뉴스 뽑기: 버튼을 꾹 눌러 힘을 모으고 놓으면 캡슐이 열리며 오늘 뉴스 한 장
(function(){if(I.length<3)return;
  mod('F3','뉴스 뽑기','꾹 눌러 힘을 모았다가 놓으면 캡슐이 톡! 열려요',`<div class="lb-gc"><div class="cap"><i></i><i></i></div><button type="button" class="lb-pull"><span></span><b>꾹 눌러 뽑기</b></button><div class="lb-gr"></div></div>`,el=>{
    const b=$('.lb-pull',el),cap=$('.cap',el),out=$('.lb-gr',el);let t0=0,raf=0,bag=[];
    const tick=()=>{const p=Math.min(1,(performance.now()-t0)/900);b.style.setProperty('--p',p);cap.style.setProperty('--sh',p);if(p<1)raf=requestAnimationFrame(tick);else hz(15)};
    b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);t0=performance.now();cap.classList.add('shake');out.innerHTML='';hz(6);raf=requestAnimationFrame(tick)};
    b.onpointerup=b.onpointercancel=()=>{if(!t0)return;cancelAnimationFrame(raf);const p=Math.min(1,(performance.now()-t0)/900);t0=0;cap.classList.remove('shake');b.style.setProperty('--p',0);
      if(p<.35){b.querySelector('b').textContent='조금 더 길게 꾹!';return}
      if(!bag.length)bag=shuffle(I);const i=bag.pop();cap.classList.add('pop');hz([10,40,25]);setTimeout(()=>cap.classList.remove('pop'),600);
      b.querySelector('b').textContent='한 번 더 뽑기';
      out.innerHTML=`<button type="button" data-s="${sid(i)}" class="lb-gcard" style="--c:${cc(i.cat)}"><span class="ph" ${bg(im(i))}></span><div><small>${E(i.cat)} · ${i.rank}위</small><b>${E(short(i.title,46))}</b></div></button>`}},'new')})();

// F4 순서대로 톡톡: 댓글이 많은 순서대로 세 뉴스를 눌러 보세요
(function(){if(OPS.length<3)return;
  mod('F4','순서대로 톡톡','댓글이 많았던 순서대로 1·2·3 눌러 보세요',`<div class="lb-od"></div>`,el=>{
    const round=()=>{delete el.dataset.end;const P=shuffle(OPS).slice(0,3),ans=P.slice().sort((a,b)=>b.op.total-a.op.total);let seq=[];
      el.innerHTML=`<div class="lb-ol">${P.map(i=>`<button type="button" data-id="${i.id}"><span class="ph" ${bg(im(i))}></span><b>${E(short(i.title,40))}</b><i></i></button>`).join('')}</div><p class="lb-sc">많은 순서대로 눌러요 (다시 누르면 취소)</p>`;
      el.onclick=e=>{const b=e.target.closest('.lb-ol button');if(e.target.closest('.lb-nn'))return round();if(!b||el.dataset.end)return;hz(6);const k=seq.indexOf(b.dataset.id);
        if(k>=0)seq.splice(k,1);else seq.push(b.dataset.id);$$('.lb-ol button',el).forEach(x=>{const q=seq.indexOf(x.dataset.id);$('i',x).textContent=q<0?'':q+1;x.classList.toggle('on',q>=0)});
        if(seq.length===3){el.dataset.end=1;const ok=seq.every((id,q)=>id===ans[q].id);hz(ok?[12,30,12]:[30,40,30]);
          $$('.lb-ol button',el).forEach(x=>{const i=OPS.find(o=>o.id===x.dataset.id),q=ans.indexOf(i);x.classList.add(seq.indexOf(x.dataset.id)===q?'right':'wrong');x.insertAdjacentHTML('beforeend',`<em>${q+1}위 · 댓글 ${nf(i.op.total)}</em>`)});
          $('.lb-sc',el).innerHTML=`${ok?'완벽해요! 🎉':'순서가 조금 달라요'} <button type="button" class="lb-nx lb-nn">다음 문제 ›</button>`}}};
    round()},'new')})();

/* ---------- 그리기 + 고르기 ---------- */
const host=document.getElementById('lab');if(!host||!M.length)return;
const PK=new Set(LS('nb-v2-pick',[]));
const GN={A:'크기·흐름',B:'반응·여론',C:'놀이',D:'사진·읽기',E:'시장·검색어',F:'새 후보'};let last='';
host.innerHTML=`<div class="lb-intro"><b>🧪 실험실</b><p>마음에 드는 것에 <em>♥</em>를 눌러 주세요. <u>고침</u>은 의견대로 다시 만든 것, <u class="n">새로</u>는 이번에 더한 것이에요. 확정된 것부터 지금 버전(v1)에 옮겨요.</p></div>`+
  M.map(m=>{const g=m.code[0],h=g!==last?`<h3 class="lb-g">${g} · ${GN[g]}</h3>`:'';last=g;
    return h+`<section class="lb" data-code="${m.code}"><header><span class="cd">${m.code}</span><div><b>${E(m.title)}${m.st?`<u class="${m.st==="new"?"n":""}">${m.st==="new"?"새로":"고침"}</u>`:""}</b><small>${E(m.idea)}</small></div><button type="button" class="pk ${PK.has(m.code)?'on':''}" aria-label="${m.code} 고르기">♥</button></header><div class="lb-b">${m.html}</div></section>`}).join('')+
  `<div class="lb-pick" hidden><span></span><button type="button">번호 복사</button></div>`;
M.forEach(m=>{if(m.init)try{m.init($(`.lb[data-code="${m.code}"] .lb-b`,host))}catch(e){console.warn(m.code,e)}});
const bar=$('.lb-pick',host),upd=()=>{const a=[...PK].sort();bar.hidden=!a.length;$('span',bar).textContent='고른 번호 '+a.join(', ');SS('nb-v2-pick',a)};upd();
host.addEventListener('click',e=>{const p=e.target.closest('.pk');if(p){hz(10);const c=p.closest('.lb').dataset.code;PK.has(c)?PK.delete(c):PK.add(c);p.classList.toggle('on',PK.has(c));upd();return}
  if(e.target.closest('.lb-pick button')){const t='v2 실험실에서 고른 번호: '+[...PK].sort().join(', ');(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>{e.target.textContent='복사했어요 ✓';setTimeout(()=>e.target.textContent='번호 복사',1500)},()=>prompt('복사해 주세요',t))}});
})();
