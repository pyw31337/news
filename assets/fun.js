/* NewsBoard · 놀면서 배우기: 오늘의 단어 퀴즈(게임) · 4컷 설명 만화 · 카드뉴스 */
(function(){
let F=null,fP=null,F0=null,IX=null,PAST='';
/* 해외 탭에서는 해외 기사로 만든 학습판(fun.json world: 영어 원문 단어·카드뉴스·만화)을 씀. 기본 한국어, '영어 원문 보기'(body.en)면 영어 원문 */
const ENM=()=>document.body.classList.contains('en'),T=(ko,en)=>ENM()?en:ko;
const WORLDM=()=>{try{return JSON.parse(localStorage.getItem('nb-settings')||'{}').region==='en'}catch(e){return false}};
const pick=j=>{if(!j||!WORLDM()||!j.world)return j;const w=j.world[ENM()?'en':'ko']||{};
  // 해외 탭에서는 국내 콘텐츠로 대신 채우지 않음(없으면 그 칸을 숨김)
  return Object.assign({},j,{quiz:w.quiz||{date:j.date,words:[],questions:[]},comics:w.comics||[],decks:w.decks||[]})};
const loadF=()=>fP||(fP=fetch('data/fun.json?'+Date.now()).then(r=>r.ok?r.json():null).catch(()=>null).then(j=>{F0=j;return F=pick(j)}));
addEventListener('nb:region-changed',()=>{if(F0)F=pick(F0)});
/* 지난 기록: data/fun/index.json(날짜 목록) · data/fun/YYYY-MM-DD.json(그날 퀴즈·만화·카드뉴스) */
const loadIX=()=>IX?Promise.resolve(IX):fetch('data/fun/index.json?'+Math.floor(Date.now()/6e5)).then(r=>r.ok?r.json():{days:{}}).catch(()=>({days:{}})).then(j=>IX=j);
const loadDay=d=>fetch('data/fun/'+d+'.json').then(r=>r.ok?r.json():null).catch(()=>null);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const app=document.getElementById('app');
const AB=u=>{try{return new URL(u,document.baseURI).href}catch(e){return u}};
const todayK=()=>new Date(Date.now()+9*36e5).toISOString().slice(0,10);
const dateLabel=d=>window.NBDate?.date?.(d)||String(d||'').slice(0,10).replaceAll('-','.');
/* 사람이 선별한 기사별 작화만 여기서 우선한다. 데이터 갱신 전에도 당일 완성본이 즉시 보이고,
   없을 때는 기사 원문 사진으로 물러난다. AI 작화를 실제 보도 사진처럼 보이게 하지 않는다. */
const EDITORIAL_ART={comics:{c101bdbe8:'assets/comics/2026-11-04-coupang-loss-comic.webp',c72f07d09:'assets/comics/2026-11-04-coupang-loss-comic.webp',ce042c57d:'assets/comics/2026-11-04-coupang-loss-comic.webp',cd1194f83:'assets/comics/2026-11-04-genesis-line-comic.webp',ca02c5ce8:'assets/comics/2026-11-04-ulsan-line-comic.webp'},decks:{d101bdbe8:'assets/cards/2026-11-04-coupang-loss-card.webp'}};
/* 자산과 함께 편집한 장면명. 수집 데이터가 다음 배치에서 갱신되기 전에도
   “무슨 일?” 같은 범용 라벨로 되돌아가지 않게 한다. */
const EDITORIAL_META={
  c101bdbe8:{captions:['현장에서 시작된 변화','돈의 흐름은','핵심 수치와 쟁점','다음 공시·보도 확인']},
  c72f07d09:{captions:['누적 적자, 왜 커졌나','이번 분기를 키운 비용','일회성·본업을 나눠 보기','다음 실적에서 볼 점']},
  ce042c57d:{captions:['누적 적자, 왜 커졌나','이번 분기를 키운 비용','매출과 비용을 나눠 보기','다음 실적에서 볼 점']},
  cd1194f83:{captions:['멈춘 라인, 다시 열리다','공장 안에서 확인한 상황','아직 남아 있는 인력 협의','다음 교섭을 지켜보기']},
  ca02c5ce8:{captions:['울산 현장, 멈춘 이유','시험 차량을 둘러싼 쟁점','정상화 합의의 순간','다시 움직이는 생산라인']}
};
/* 사람 편집자가 재검토한 대본은 기사 ID별로 고정한다. 특히 '원문을 보세요'로
   끝나는 자동 대본 대신, 원인 → 비용 → 구분해서 볼 점 → 다음 지표를 완결한다. */
const EDITORIAL_STORY={
  c72f07d09:[
    [['보리','쿠팡 적자가 올해 누적 2조 원에 가깝다던데?'],['누리','3분기 손실까지 더해지며 누적 적자가 커졌다는 보도야.']],
    [['보리','이번 분기에 특별히 커진 이유가 있어?'],['누리','인천 물류센터 화재 관련 비용 3,540억 원이 반영됐어.']],
    [['보리','그럼 화재 비용만 보면 되는 거야?'],['누리','회사는 이를 일회성 비용으로 설명했지만, 본업 수익 흐름은 따로 봐야 해.']],
    [['보리','그다음에는 무엇을 확인하면 돼?'],['누리','화재 비용을 뺀 뒤에도 적자가 줄어드는지가 다음 실적의 핵심이야.']]
  ],
  ce042c57d:[
    [['보리','쿠팡의 올해 누적 적자가 2조 원에 가깝다던데?'],['누리','3분기 손실 6,423억 원까지 더해 누적 손실이 1조 8,318억 원이 됐어.']],
    [['보리','이번 적자가 커진 이유는 뭐야?'],['누리','인천 화재 비용 약 3,540억 원과 고객 회복 마케팅·대만 투자 부담이 겹쳤어.']],
    [['보리','매출이 늘었다는데도 왜 적자야?'],['누리','매출 증가보다 화재 같은 일시 비용과 신규 투자 부담이 더 크게 반영된 거야.']],
    [['보리','회복 여부는 어떻게 알 수 있어?'],['누리','화재·마케팅 비용이 줄고 본업 수익성이 회복되는지가 다음 실적의 핵심이야.']]
  ]
};
/* 수집 중 같은 날 군집 ID가 바뀌어도, 공유된 선별 만화 URL은 빈 첫 카드로
   떨어뜨리지 않는다. 다음 수집본의 해당 이슈 페이지로 연결하고 작화·대본은 보존한다. */
const LEGACY_EDITORIAL_COMICS={
  c72f07d09:{id:'c72f07d09',issue:'ib0a51b0a',category:'경제',date:'2026-11-04',title:'쿠팡 올해 누적 적자 2조…, 4컷으로 보기',headline:'쿠팡 올해 누적 적자 2조 원 육박…인천 화재 비용만 3,540억 원',panels:[
    {caption:'누적 적자, 왜 커졌나',mood:'curious',lines:[{who:'보리',text:'쿠팡 적자가 올해 누적 2조 원에 가깝다던데?'},{who:'누리',text:'3분기 손실까지 더해 누적 적자가 커졌다는 보도야.'}]},
    {caption:'이번 분기를 키운 비용',mood:'explain',lines:[{who:'보리',text:'이번 분기에 특별히 커진 이유가 있어?'},{who:'누리',text:'인천 물류센터 화재 관련 비용 약 3,540억 원이 반영됐어.'}]},
    {caption:'일회성·본업을 나눠 보기',mood:'think',lines:[{who:'보리',text:'그럼 화재 비용만 보면 되는 거야?'},{who:'누리',text:'회사는 일시적 비용으로 설명하지만, 본업 수익 흐름은 따로 봐야 해.'}]},
    {caption:'다음 실적에서 볼 점',mood:'think',lines:[{who:'보리',text:'그다음에는 무엇을 확인하면 돼?'},{who:'누리',text:'화재 비용을 뺀 뒤에도 적자가 줄어드는지가 다음 실적의 핵심이야.'}]}
  ],sources:[
    {press:'연합뉴스TV',title:'쿠팡, 3분기 연속 적자…누적 영업손실 2조 육박',url:'https://n.news.naver.com/mnews/article/422/0000922777?sid=101'},
    {press:'전자신문',title:'쿠팡, 분기 매출 14조 돌파…영업손실 6423억에 빛바래',url:'https://n.news.naver.com/mnews/article/030/0003482080?sid=101'}
  ]}
};
const coupangLossStory=c=>c?.date==='2026-11-04'&&/쿠팡/.test(c?.headline||c?.title||'')&&/적자|손실|수익성/.test(c?.headline||c?.title||'')?EDITORIAL_STORY.ce042c57d:null;
const comicArt=c=>c?.art||EDITORIAL_ART.comics[c?.id]||'';
const comicPanels=c=>(c?.panels||[]).map((p,k)=>{const source=EDITORIAL_STORY[c?.id]?.[k]||coupangLossStory(c)?.[k]||p.lines||[];const meta=EDITORIAL_META[c?.id]||(coupangLossStory(c)?EDITORIAL_META.ce042c57d:null);return Object.assign({},p,{caption:meta?.captions?.[k]||p.caption,lines:source.map(line=>Array.isArray(line)?{who:line[0],text:line[1]}:{who:line.who,text:line.text})})});
const comicImage=c=>comicArt(c)||c?.image||c?.img||'';
const deckArt=d=>d?.art||(d?.cards||[]).find(x=>x.art)?.art||EDITORIAL_ART.decks[d?.id]||'';
const deckImage=d=>deckArt(d)||(d?.cards||[])[0]?.img||d?.image||'';
const mediaTag=(ai,raw)=>ai?'AI 시각화':raw?'원문 기사 사진':'';
/* 편집 일러스트에서도 대사는 장면 위 말풍선에 둔다. 독립 리더선 대신 말풍선 테두리
   바깥의 카툰 꼭지를 써서 선이 중간에서 끊겨 보이지 않게 하고, 필요하면 옮길 수 있다. */
const BUBBLE_LAYOUTS={
  wide:[
    [3,2,42,24,12,28,27],[55,13,42,72,25,40,25],
    [2,33,42,22,43,27,62],[4,46,42,35,56,45,62],
    [56,33,42,76,43,62,63],[54,47,42,70,56,88,54],
    [2,70,42,23,78,36,88],[55,79,42,70,87,47,88]
  ],
  quad:[
    [2,3,42,23,16,29,31],[3,17,42,28,30,38,42],
    [56,3,42,77,16,71,31],[55,17,42,67,30,82,42],
    [2,52,42,23,65,29,81],[3,67,42,29,80,39,92],
    [56,52,42,77,65,71,81],[55,67,42,67,80,82,92]
  ]
};
function comicDialogue(c,panels){const layout=c?.id==='cd1194f83'?'quad':'wide';const lines=panels.flatMap((p,k)=>(p.lines||[]).map((l,n)=>Object.assign({k,n},l)));
  return`<div class="comic-dialogue ${layout}" aria-label="만화 대사">${lines.map((l,i)=>{const a=BUBBLE_LAYOUTS[layout][i]||BUBBLE_LAYOUTS.wide[i];return`<p class="art-bubble ${l.who==='보리'?'bori':'nuri'}" data-bubble="${i}" style="--x:${a[0]}%;--y:${a[1]}%;--w:${a[2]}%" title="드래그해서 말풍선을 옮기고, 두 번 누르면 원래 위치로 돌아갑니다"><b>${E(l.who)}</b>${E(l.text)}</p>`}).join('')}</div>`}
function bindComicBubbleDrag(c){const art=app.querySelector('.comic-art'),dialogue=art?.querySelector('.comic-dialogue');if(!art||!dialogue)return;
  const key='nb-comic-bubbles:'+String(c.id||'');let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
  const place=(bubble,offset,save)=>{const id=bubble.dataset.bubble;const x=Number(offset?.x||0),y=Number(offset?.y||0);bubble.style.setProperty('--dx',x+'px');bubble.style.setProperty('--dy',y+'px');
    const r=art.getBoundingClientRect();if(save){saved[id]={x:Math.round(x/r.width*1000)/10,y:Math.round(y/r.height*1000)/10};localStorage.setItem(key,JSON.stringify(saved))}
  };
  dialogue.querySelectorAll('.art-bubble').forEach(b=>{const old=saved[b.dataset.bubble];if(old){const r=art.getBoundingClientRect();place(b,{x:old.x*r.width/100,y:old.y*r.height/100})}
    let drag=null;b.addEventListener('pointerdown',e=>{if(e.button&&e.pointerType==='mouse')return;drag={x:e.clientX,y:e.clientY,ox:parseFloat(b.style.getPropertyValue('--dx'))||0,oy:parseFloat(b.style.getPropertyValue('--dy'))||0};b.setPointerCapture?.(e.pointerId);b.classList.add('dragging');e.preventDefault()});
    b.addEventListener('pointermove',e=>{if(!drag)return;const r=art.getBoundingClientRect(),nx=Math.max(-r.width*.36,Math.min(r.width*.36,drag.ox+e.clientX-drag.x)),ny=Math.max(-r.height*.18,Math.min(r.height*.18,drag.oy+e.clientY-drag.y));place(b,{x:nx,y:ny})});
    const end=()=>{if(!drag)return;const x=parseFloat(b.style.getPropertyValue('--dx'))||0,y=parseFloat(b.style.getPropertyValue('--dy'))||0;place(b,{x,y},true);drag=null;b.classList.remove('dragging')};b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);
    b.addEventListener('dblclick',()=>{delete saved[b.dataset.bubble];localStorage.setItem(key,JSON.stringify(saved));place(b,{x:0,y:0});});
  });
}
/* ---------- 학습 기록(localStorage, 로그인 없음) ---------- */
const LK='nb-learn';
const L=Object.assign({xp:0,streak:0,best:0,last:'',days:{},review:{},sound:false,haptic:true},JSON.parse(localStorage.getItem(LK)||'{}'));
const saveL=()=>localStorage.setItem(LK,JSON.stringify(L));
const lvl=x=>Math.floor(Math.sqrt(x/40))+1, lvXP=n=>40*(n-1)*(n-1);
function lvBar(){const n=lvl(L.xp),a=lvXP(n),b=lvXP(n+1);return{n,pct:Math.round((L.xp-a)/(b-a)*100),left:b-L.xp}}
function streakNow(){const t=todayK(),y=new Date(Date.now()+9*36e5-864e5).toISOString().slice(0,10);return L.last===t||L.last===y?L.streak:0}
function markDay(){const t=todayK();if(L.last===t)return;const y=new Date(Date.now()+9*36e5-864e5).toISOString().slice(0,10);L.streak=L.last===y?L.streak+1:1;L.best=Math.max(L.best,L.streak);L.last=t}
/* 효과: 소리(기본 꺼짐)·진동 */
let AC=null;function beep(ok){if(!L.sound)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);const t=AC.currentTime;
  (ok?[660,880]:[300,220]).forEach((f,i)=>o.frequency.setValueAtTime(f,t+i*.09));g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.start(t);o.stop(t+.32)}catch(e){}}
const buzz=p=>{if(L.haptic&&navigator.vibrate)try{navigator.vibrate(p)}catch(e){}};
/* ---------- 마스코트(SVG): 보리=호기심 많은 학생, 누리=차분한 해설가 ---------- */
function face(m){const e={curious:'<circle cx="-9" cy="-4" r="4"/><circle cx="9" cy="-4" r="4"/>',surprised:'<circle cx="-9" cy="-4" r="5"/><circle cx="9" cy="-4" r="5"/>',think:'<path d="M-13 -4h8M5 -4h8" stroke="#0f1630" stroke-width="3" stroke-linecap="round"/>',smile:'<path d="M-13 -3q4-5 8 0M5 -3q4-5 8 0" stroke="#0f1630" stroke-width="3" fill="none" stroke-linecap="round"/>',explain:'<circle cx="-9" cy="-4" r="3.5"/><circle cx="9" cy="-4" r="3.5"/>'}[m]||'<circle cx="-9" cy="-4" r="3.5"/><circle cx="9" cy="-4" r="3.5"/>';
  const mo={surprised:'<ellipse cx="0" cy="11" rx="5" ry="6" fill="#7a1f12"/>',smile:'<path d="M-9 8q9 10 18 0" fill="#7a1f12"/>',think:'<path d="M-5 11h9" stroke="#7a1f12" stroke-width="3" stroke-linecap="round"/>',curious:'<path d="M-6 10q6 5 12 0" stroke="#7a1f12" stroke-width="3" fill="none" stroke-linecap="round"/>'}[m]||'<path d="M-7 9q7 7 14 0" stroke="#7a1f12" stroke-width="3" fill="none" stroke-linecap="round"/>';
  return`<g fill="#0f1630">${e}</g>${mo}`}
function bori(m){return`<g class="mb bori"><ellipse cx="0" cy="44" rx="30" ry="6" fill="#0002"/><path d="M-32 40q0-62 32-62t32 62z" fill="#ff8a3d"/><path d="M-22 -14q22-22 44 0" fill="#ffb020"/><path d="M-6 -30l6-10 6 10" fill="#ff4d2e"/>
  <circle cx="-20" cy="12" r="5" fill="#ffb4a0"/><circle cx="20" cy="12" r="5" fill="#ffb4a0"/><g transform="translate(0,8)">${face(m)}</g>${m==='curious'?'<text x="26" y="-18" font-size="22" font-weight="900" fill="#ff4d2e">?</text>':m==='surprised'?'<text x="24" y="-16" font-size="22" font-weight="900" fill="#ff4d2e">!</text>':''}</g>`}
function nuri(m){return`<g class="mb nuri"><ellipse cx="0" cy="44" rx="30" ry="6" fill="#0002"/><rect x="-30" y="-26" width="60" height="68" rx="26" fill="#2f4f9e"/><rect x="-22" y="-36" width="44" height="14" rx="4" fill="#fff"/><path d="M-18 -31h36M-18 -27h24" stroke="#8189a3" stroke-width="2"/>
  <g transform="translate(0,6)">${face(m)}<circle cx="-9" cy="-4" r="8" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="9" cy="-4" r="8" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M-1 -4h2" stroke="#fff" stroke-width="2.5"/></g>${m==='explain'?'<path d="M30 6l14-10" stroke="#2f4f9e" stroke-width="7" stroke-linecap="round"/>':''}</g>`}
const BG=['#fff3e8','#eef3ff','#fff8dc','#eafaf3'];
function panel(p,k){const mood=p.mood||'explain';const who=new Set(p.lines.map(l=>l.who));
  return`<div class="cpan" style="--pb:${BG[k%4]}"><span class="cno">${k+1}</span>${p.caption?`<div class="ccap">${E(p.caption)}</div>`:''}
  <div class="cbub">${p.lines.map(l=>`<p class="bub ${l.who==='보리'?'l':'r'}"><b>${E(l.who)}</b>${E(l.text)}</p>`).join('')}</div>
  <svg class="cchar" viewBox="-160 -50 320 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><g transform="translate(-80,0)" opacity="${who.has('보리')?1:.55}">${bori(who.has('보리')?mood:'smile')}</g><g transform="translate(80,0)" opacity="${who.has('누리')?1:.55}">${nuri(who.has('누리')?(mood==='curious'?'explain':mood):'smile')}</g></svg></div>`}
const srcList=S=>`<div class="fsrc"><h4>출처</h4>${S.map(s=>`<a href="${E(s.url)}" target="_blank" rel="noopener">${typeof pp==='function'?pp(s.press,s.url):E(s.press)}<span>${E(s.title)}</span></a>`).join('')}</div>`;
function comicTile(c){const ai=comicArt(c),im=ai||comicImage(c),label=mediaTag(ai,im);
  return`<a class="cl" href="comic/${c.id}"><div class="clp ${im?'visual':''}" style="--pb:${BG[0]}">${im?`<img src="${E(AB(im))}" alt="${E(label?label+': ':'')}${E(c.title)}" loading="lazy"><span class="cmedia-tag">${label}</span>`:`<svg viewBox="-160 -50 320 100"><g transform="translate(-80,0)">${bori(c.panels[0].mood)}</g><g transform="translate(80,0)">${nuri('explain')}</g></svg><span class="clb">${E(c.panels[0].lines[0].text)}</span>`}</div><div class="clt"><span class="cat ${c.category}">${c.category}</span><b>${E(c.title)}</b><small>${dateLabel(c.date)}</small></div></a>`}
/* ---------- 허브 ---------- */
function stats(){const s=streakNow(),b=lvBar(),rv=Object.keys(L.review).length;
  return`<div class="lstat"><div class="ls fire"><i>${NBI('flame-f')}</i><b>${s}</b><span>일 연속</span></div><div class="ls xp"><i>${NBI('bolt')}</i><b>${L.xp}</b><span>XP</span></div><div class="ls lv"><i>${NBI('medal')}</i><b>Lv.${b.n}</b><span>다음까지 ${b.left}XP</span></div><div class="ls rv"><i>🔁</i><b>${rv}</b><span>복습 단어</span></div></div>
  <div class="lvbar"><i style="width:${b.pct}%"></i></div>`}
function hub(){setMeta('놀면서 배우기 — 퀴즈·만화·카드뉴스','오늘 뉴스의 어려운 말을 OX 퀴즈로, 핫이슈를 4컷 만화로, 이어지는 사건을 카드뉴스로');
  const q=F.quiz,done=!PAST&&(L.days[todayK()]||{}).done;
  app.innerHTML=`${PAST?`<div class="lpast-on"><b>${dateLabel(PAST)} 기록</b>을 보고 있어요 <a href="learn">오늘로 돌아가기 ${NBI('arrow-right')}</a></div>`:''}<section class="lhero"><div><small>LEARN WITH NEWS</small><h1>${T('놀면서 배우는 뉴스','Learn the news, playfully')}</h1><p>하루 3분, 오늘 기사에 나온 말을 퀴즈로 익히고 어려운 이슈는 만화와 카드로 쉽게 봐요.</p></div><div class="lmasc"><svg viewBox="-160 -50 320 100">${'<g transform="translate(-70,0)">'+bori('smile')+'</g><g transform="translate(70,0)">'+nuri('explain')+'</g>'}</svg></div></section>
  ${stats()}
  <div class="ltiles">
   <a class="lt quiz" href="quiz"><span class="lti">${NBI('help-hexagon',1,'on')}</span><b>${T('오늘의 단어 퀴즈','Today’s word quiz')}</b><small>${q.questions.length}${T('문제 · OX·객관식·빈칸',' questions · true/false, choice, fill-in')}</small><em>${done?T('오늘 완료! 다시 풀기','Done today! Play again'):T('시작하기 →','Start →')}</em></a>
   <a class="lt review ${Object.keys(L.review).length?'':'off'}" href="quiz/review"><span class="lti">🔁</span><b>틀린 단어 복습</b><small>${Object.keys(L.review).length?Object.keys(L.review).length+'개가 기다려요':'아직 없어요'}</small><em>복습하기 ${NBI('arrow-right')}</em></a>
  </div>
  ${sec(T('4컷으로 보는 뉴스','News in 4 panels'),'Explainer comics',`<a class="more" href="learn/all">${T('전체 보기','All')} ${NBI('arrow-right')}</a>`,'comic')}
  <div class="clist">${F.comics.slice(0,6).map(comicTile).join('')}</div>
  ${sec(T('카드뉴스','Card news'),'Card news',`<a class="more" href="learn/all">${T('전체 보기','All')} ${NBI('arrow-right')}</a>`,'cards')}
  <div class="dlist">${F.decks.slice(0,8).map(deckTile).join('')}</div>
  <div id="lpast"></div>`;
  loadIX().then(ix=>{const el=document.getElementById('lpast');const ds=Object.keys(ix.days||{}).sort().reverse().slice(0,30);if(!el||ds.length<2)return;
    el.innerHTML=sec('지난 기록','Past days','<span class="more">그날의 퀴즈·만화·카드뉴스</span>','clock')+`<div class="lpast">${ds.map(d=>{const x=ix.days[d];const cur=PAST?d===PAST:d===todayK();return`<a class="lpd ${cur?'on':''}" href="learn/${d}"><b>${dateLabel(d)}</b><small>${E((x.w||[]).slice(0,2).join(' · '))}</small><em>퀴즈 ${x.q} · 만화 ${x.c} · 카드 ${x.d}</em></a>`}).join('')}</div>`;
    window.NBT?.bindHorizontalCarousels?.(el)})}
function allContent(){setMeta('놀면서 배우기 — 전체 콘텐츠','날짜별로 누적된 4컷 만화와 카드뉴스를 모아 봅니다.');
  app.innerHTML=`<div class="bkrow"><a class="back" href="learn">${NBI('chevron-left')} 배우기</a></div><section class="lhero"><div><small>NEWS LIBRARY</small><h1>${T('누적 콘텐츠','All content')}</h1><p>${T('하루 최대 만화 3개, 카드뉴스 3개만 새로 만들고 검토를 통과한 콘텐츠를 날짜별로 쌓습니다.','Up to three comics and three card-news items are added each day after review.')}</p></div></section><section id="all-comics">${sec(T('4컷으로 보는 뉴스','News in 4 panels'),'Explainer comics','','comic')}<div class="clist">${F.comics.map(comicTile).join('')}</div></section><section id="all-decks">${sec(T('카드뉴스','Card news'),'Card news','','cards')}<div class="dlist">${F.decks.map(deckTile).join('')}</div></section><div class="loading" id="all-loading">지난 기록을 불러오는 중…</div>`;
  const seenC=new Set(F.comics.map(x=>x.id)),seenD=new Set(F.decks.map(x=>x.id));
  loadIX().then(ix=>Promise.all(Object.keys(ix.days||{}).sort().reverse().slice(0,90).map(loadDay))).then(days=>{const cs=[],ds=[];days.filter(Boolean).forEach(day=>{(day.comics||[]).forEach(x=>{if(!seenC.has(x.id)){seenC.add(x.id);cs.push(x)}});(day.decks||[]).forEach(x=>{if(!seenD.has(x.id)){seenD.add(x.id);ds.push(x)}})});cs.sort((a,b)=>String(b.date).localeCompare(String(a.date)));ds.sort((a,b)=>String(b.date).localeCompare(String(a.date)));const c=document.querySelector('#all-comics .clist'),d=document.querySelector('#all-decks .dlist');if(c)c.insertAdjacentHTML('beforeend',cs.map(comicTile).join(''));if(d)d.insertAdjacentHTML('beforeend',ds.map(deckTile).join(''));document.getElementById('all-loading')?.remove()}).catch(()=>{const l=document.getElementById('all-loading');if(l)l.textContent='지난 기록을 불러오지 못했어요. 오늘 콘텐츠는 계속 볼 수 있어요.'})
}
/* 카드뉴스 표지·구성 변주: 같은 날 카드뉴스가 서로 다른 모양이 되도록 순서대로 6가지 표지 × 3가지 구성.
   0 사진 꽉 · 1 큰 숫자 · 2 위 사진/아래 글 · 3 글자만(종이) · 4 동그란 사진 · 5 색 입힌 사진+스티커 */
const SKC=['#ff4d2e','#2f6bff','#11a683','#7a4dff','#f08a00','#e2448e'];
const skI=d=>{const k=(F&&F.decks||[]).indexOf(d);return(k<0?0:k)%6};
const numOf=t=>{const m=/([+-]?\d[\d.,]*)\s?(%|조\s?원|억\s?원|만\s?원|조|억|만|원|달러|명|건|곳|일|배|년|개월|bp)?/.exec(t||'');return m&&!/^(19|20)\d\d$/.test(m[1])?{v:m[1],u:(m[2]||'').replace(/\s/g,'')}:null};
const skEmo=d=>(d.cards[0]||{}).icon||{정치:'🏛️',경제:'💹',사회:'🧭',세계:'🌍',IT:'💡',과학:'🔭',건강:'🩺',환경:'🌱',문화:'🎭',연예:'🎬',스포츠:'🏅'}[(String(d.tag||'').split('·').pop()||'').trim()]||'🗂️';
function skin(d){const k=skI(d),h=d.cards[0]||{},im=deckImage(d)?AB(deckImage(d)):'',n=numOf(h.big)||numOf(d.title),c=SKC[k];
  const st=`style="--skc:${c};${im?`--im:url('${E(im)}')`:''}"`;
  const top=k===1?`<span class="skn">${n?`${E(n.v)}<small>${E(n.u)}</small>`:skEmo(d)}</span>${im?`<span class="skph"></span>`:''}`
    :k===2?`<span class="skph"></span>`:k===3?`<span class="skq">“</span>`:k===4?`<span class="skph"></span>`:k===5?`<span class="ske">${skEmo(d)}</span>`:'';
  return{k,st,top,cls:`sk sk${k}${im?'':' noim'}`}}
function deckTile(d){const K=skin(d);return`<a class="dt ${d.kind} ${K.cls}" href="cards/${d.id}" ${K.st}>${K.top}<span class="dtag">${E(d.tag)}</span><b>${E(d.title)}</b><span class="dn">${d.cards.length}${T('장',' cards')} ${NBI('chevron-right')}</span></a>`}
/* ---------- 퀴즈 ---------- */
let QS=null;
function buildReview(){const W=Object.values(L.review);const all=W.concat(F.quiz.words.filter(w=>!L.review[w.word]));const r=[];
  W.slice(0,8).forEach((w,k)=>{const o=all.filter(x=>x.word!==w.word);if(k%2||o.length<3){const t=Math.random()<.5||!o.length;r.push({kind:'ox',word:w.word,q:`‘${w.word}’의 뜻은 “${t?w.mean:o[Math.random()*o.length|0].mean}”이다.`,answer:t})}
   else{const ch=[w.mean,...o.sort(()=>Math.random()-.5).slice(0,3).map(x=>x.mean)].sort(()=>Math.random()-.5);r.push({kind:'mc',word:w.word,q:`‘${w.word}’의 뜻으로 알맞은 것은?`,choices:ch,answer:ch.indexOf(w.mean)})}});return r}
function quiz(review){const Q=review?buildReview():F.quiz.questions;setMeta(review?'틀린 단어 복습':'오늘의 단어 퀴즈','오늘 뉴스에 나온 어려운 말, OX로 맞혀 보세요');
  if(!Q.length){app.innerHTML=`<div class="qdone"><div class="big">🎉</div><h2>복습할 단어가 없어요</h2><p>틀린 단어가 생기면 여기에 모여요.</p><a class="qbtn" href="quiz">오늘의 퀴즈 풀기</a></div>`;return}
  QS={Q,i:0,ok:0,xp:0,review,combo:0,miss:[]};drawQ()}
const wordOf=w=>F.quiz.words.find(x=>x.word===w)||L.review[w]||{word:w,mean:''};
function drawQ(){const s=QS,q=s.Q[s.i];const pct=Math.round(s.i/s.Q.length*100);
  app.innerHTML=`<div class="qwrap"><div class="qtop"><a class="qx" href="learn" aria-label="그만하기">${NBI('x')}</a><div class="qprog"><i style="width:${pct}%"></i></div><span class="qcombo ${s.combo>=2?'on':''}">${NBI('flame-f')}${s.combo}</span></div>
  <div class="qcard" id="qcard"><span class="qkind ${q.kind}">${{ox:'OX 퀴즈',mc:'뜻 고르기',blank:'빈칸 채우기'}[q.kind]}</span>
   <h2 class="qq">${E(q.q).replace(/‘([^’]{1,30})’/g,'<em class="ox-k">‘$1’</em>').replace(/“([^”]{1,80})”/g,'<em class="ox-d">“$1”</em>')}</h2>${q.quote?`<blockquote class="qquote">${E(q.quote)}</blockquote>`:''}
   ${q.kind==='ox'?`<div class="oxb"><button class="ox o" data-a="1"><span>O</span>맞아요</button><button class="ox x" data-a="0"><span>X</span>아니에요</button></div>`
   :`<div class="mcb">${q.choices.map((c,k)=>`<button class="mc" data-a="${k}"><i>${'ABCD'[k]}</i>${E(c)}</button>`).join('')}</div>`}</div>
   <div class="qsheet" id="qsheet" hidden></div><div class="qfoot">${s.i+1} / ${s.Q.length}</div></div>`;
  app.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>answer(b))}
function answer(b){const s=QS,q=s.Q[s.i];const a=+b.dataset.a;const ok=q.kind==='ox'?(a===1)===q.answer:a===q.answer;
  app.querySelectorAll('[data-a]').forEach(x=>{x.disabled=true;const v=+x.dataset.a;if(q.kind==='ox'?((v===1)===q.answer):v===q.answer)x.classList.add('right');});if(!ok)b.classList.add('wrong');
  try{dispatchEvent(new CustomEvent('nb:quiz',{detail:{ok,word:q.word,kind:q.kind,perfect:ok&&s.i===s.Q.length-1&&s.ok+1===s.Q.length}}))}catch(e){}/* 게이미피케이션(game.js) */
  const w=wordOf(q.word);beep(ok);buzz(ok?18:[40,60,40]);
  if(ok){s.ok++;s.combo++;const g=10+(s.combo>=3?5:0);s.xp+=g;if(s.review&&L.review[q.word]){L.review[q.word].hit=(L.review[q.word].hit||0)+1;if(L.review[q.word].hit>=2)delete L.review[q.word]}}
  else{s.combo=0;s.miss.push(q.word);L.review[q.word]={word:w.word,mean:w.mean,related:w.related||[],ex:(w.examples||[])[0]||w.ex||null,hit:0,at:todayK()}}
  saveL();
  const card=document.getElementById('qcard');card.classList.add(ok?'pop':'shake');
  const ex=(w.examples||[])[0]||w.ex;
  const sh=document.getElementById('qsheet');sh.hidden=false;sh.className='qsheet '+(ok?'ok':'no');
  sh.innerHTML=ok?`<div class="qres"><span class="qic">🎉</span><div><b>정답이에요!</b><small>+${10+(s.combo>=3?5:0)} XP${s.combo>=3?' · 콤보 보너스':''}</small></div></div><p class="qmean"><b>${E(w.word)}</b> ${E(w.mean)}</p><button class="qbtn" id="qn">계속</button>`
  :`<div class="qres"><span class="qic">💡</span><div><b>아쉬워요! 같이 알아봐요</b><small>복습 목록에 담았어요</small></div></div>
   <div class="qexp"><div class="qe mean"><span>뜻</span><p><b>${E(w.word)}</b> — ${E(w.mean)}</p></div>
   ${w.context?`<div class="qe ctx"><span>오늘 뉴스에서</span><p>${E(w.context)}</p></div>`:''}
   ${ex?`<a class="qe exa" href="${E(ex.url)}" target="_blank" rel="noopener"><span>예문</span><p>“${E(ex.title).replace(E(w.word),'<mark>'+E(w.word)+'</mark>')}”<small>${E(ex.press||'')} ${NBI('chevron-right')}</small></p></a>`:''}
   ${w.tip?`<div class="qe tip"><span>헷갈림 주의</span><p>${E(w.tip)}</p></div>`:''}
   ${(w.related||[]).length?`<div class="qe rel"><span>같이 알면 좋은 말</span><p>${w.related.map(r=>`<i class="rchip">${E(r)}</i>`).join('')}</p></div>`:''}</div>
   <button class="qbtn" id="qn">알겠어요, 계속</button>`;
  if(ok)burst(card);
  sh.querySelector('#qn').onclick=()=>{s.i++;if(s.i<s.Q.length)drawQ();else finish()};}
function burst(el){const r=el.getBoundingClientRect();for(let k=0;k<18;k++){const p=document.createElement('i');p.className='cf';p.style.left=(r.left+r.width/2)+'px';p.style.top=(r.top+r.height/2+window.scrollY)+'px';p.style.setProperty('--dx',(Math.random()*240-120)+'px');p.style.setProperty('--dy',(-Math.random()*180-40)+'px');p.style.background=['#ff4d2e','#ffb020','#11a683','#2f6bff'][k%4];document.body.appendChild(p);setTimeout(()=>p.remove(),900)}}
function finish(){const s=QS;const lv0=lvl(L.xp);L.xp+=s.xp+(s.ok===s.Q.length?20:0);markDay();if(!s.review)L.days[todayK()]={done:1,ok:s.ok,n:s.Q.length};saveL();const up=lvl(L.xp)>lv0;
  const acc=Math.round(s.ok/s.Q.length*100);
  app.innerHTML=`<div class="qdone"><div class="big">${acc>=80?'🏆':acc>=50?'👏':'💪'}</div><h2>${acc>=80?'훌륭해요!':acc>=50?'잘했어요!':'내일은 더 잘할 수 있어요!'}</h2>
  <div class="qsum"><div><b>${s.ok}/${s.Q.length}</b><span>정답</span></div><div><b>+${s.xp+(s.ok===s.Q.length?20:0)}</b><span>XP${s.ok===s.Q.length?' (만점 +20)':''}</span></div><div><b>${NBI('flame-f')}${L.streak}</b><span>일 연속</span></div></div>
  ${up?`<p class="lvup">🎊 레벨 업! Lv.${lvl(L.xp)}</p>`:''}${stats()}
  ${s.miss.length?`<div class="qmiss"><h4>복습 목록에 담은 단어</h4>${s.miss.map(w=>`<span class="rchip">${E(w)}</span>`).join('')}</div>`:''}
  <div class="qacts">${s.miss.length?'<a class="qbtn" href="quiz/review">바로 복습하기</a>':''}<a class="qbtn ghost" href="learn">배우기 홈</a></div></div>`;
  if(acc>=80)burst(app.querySelector('.big'))}
/* ---------- 만화 ---------- */
function comic(id){const c=F.comics.find(x=>x.id===id)||LEGACY_EDITORIAL_COMICS[id]||F.comics[0];if(!c)return hub();setMeta(c.title+' — 4컷 해설',c.headline);
  const panels=comicPanels(c),art=comicArt(c),comicBody=art?`<figure class="comic-art"><img src="${E(AB(art))}" alt="AI 시각화 4컷 만화: ${E(c.title)}">${comicDialogue(c,panels)}<figcaption><b>AI 시각화</b> · 기사에 나온 사실을 이해하도록 만든 장면이며, 실제 현장 사진이나 인물 묘사가 아닙니다.</figcaption></figure>`
    :`<div class="comic${window.NBC?' c2 '+E(c.visual?.layout||'reportage'):''}">${panels.map((p,k)=>window.NBC?NBC.panel(p,k,c):panel(p,k)).join('')}</div>`;
  app.innerHTML=`<div class="cwrap"><a class="back" href="learn">${NBI('chevron-left')} 배우기</a><div class="chead"><span class="cat ${c.category}">${c.category}</span><h1>${E(c.title)}</h1><p>${E(c.headline)}</p></div>
  ${comicBody}
  ${art?'<p class="bubble-help">↔ 말풍선을 드래그해 장면을 가리지 않게 옮길 수 있어요 · 두 번 누르면 원래 자리로 돌아가요.</p>':''}
  <p class="cnote">이 만화는 원문 기사에서 확인된 사실을 쉽게 풀어 쓴 <b>설명용 콘텐츠</b>입니다. 마지막 컷은 사실을 읽는 데 필요한 다음 확인 지점을 제안합니다.</p>
  <div class="cact"><a class="qbtn" href="issue/${c.issue}">이 이슈 자세히 보기</a>${typeof shareBtn==='function'?shareBtn():''}</div>${srcList(c.sources||[])}</div>`;
  if(art)bindComicBubbleDrag(c)
}
/* ---------- 카드뉴스 ---------- */
function lineSvg(S,unit){const v=S.map(x=>x[1]),mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1,W=300,H=150;const pts=v.map((y,i)=>[(i/(v.length-1||1)*W),(H-12-(y-mn)/r*(H-36))]);
  return`<svg class="dchart" viewBox="0 0 ${W} ${H+18}"><polyline points="0,${H} ${pts.map(p=>p.join(',')).join(' ')} ${W},${H}" fill="#ff4d2e22"/><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#ff4d2e" stroke-width="3" stroke-linejoin="round"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="5" fill="#ff4d2e"/>
  <text x="0" y="${H+16}" font-size="11" fill="#8189a3">${E(S[0][0])}</text><text x="${W}" y="${H+16}" font-size="11" fill="#8189a3" text-anchor="end">${E(S.at(-1)[0])}</text><text x="${W-4}" y="${pts.at(-1)[1]-10}" font-size="14" font-weight="800" fill="#0f1630" text-anchor="end">${v.at(-1)}${unit}</text><text x="2" y="14" font-size="11" fill="#8189a3">최고 ${mx}${unit}</text></svg>`}
function barSvg(S,unit){const mx=Math.max(...S.map(x=>x[1]))||1,W=300,H=140,bw=W/S.length;
  return`<svg class="dchart" viewBox="0 0 ${W} ${H+20}">${S.map((x,i)=>{const h=Math.max(4,x[1]/mx*(H-24));return`<rect x="${i*bw+bw*.18}" y="${H-h}" width="${bw*.64}" height="${h}" rx="5" fill="${x[1]===mx?'#ff4d2e':'#ffc2b4'}"/><text x="${i*bw+bw/2}" y="${H-h-5}" font-size="11" font-weight="800" text-anchor="middle" fill="#0f1630">${x[1]}</text><text x="${i*bw+bw/2}" y="${H+15}" font-size="10" text-anchor="middle" fill="#8189a3">${E(String(x[0]).slice(5).replace('-','.'))}</text>`}).join('')}</svg>`}
function cardMedia(d,c,compact=false){const own=c.img||'',im=own||deckImage(d),ai=!own&&!!deckArt(d);if(!im)return'';
  return`<figure class="dmedia ${compact?'compact':''}" style="--dm:url('${E(AB(im))}')"><figcaption>${mediaTag(ai,im)}</figcaption></figure>`}
function card(c,k,n,d){let b='',media=cardMedia(d,c,c.t==='timeline'||c.t==='word');
  if(c.t==='hook'){const K=skin(d),ai=!!deckArt(d);b=`<div class="dk hook ${K.cls}" ${K.st}>${K.top}<span class="dtag">${E(d.tag)}</span>${ai?'<span class="d-ai">AI 시각화</span>':''}${c.icon&&K.k!==1&&K.k!==5?`<span class="dico">${c.icon}</span>`:''}<h2>${E(c.big)}</h2><p>${E(c.text)}</p><span class="swh">옆으로 넘겨 보세요 ${NBI('chevron-right')}</span></div>`}
  else if(c.t==='bg'&&skI(d)%3===0)b=`<div class="dk bg qa has-media">${media}<span class="dlab">Q</span><h3>${E(c.title)}</h3><p class="dbody dhid">${E(c.text)}</p><button type="button" class="drev">사실 설명 보기</button></div>`;
  else if(c.t==='bg'&&skI(d)%3===2)b=`<div class="dk bg dq has-media">${media}<span class="dlab">한 줄로</span><blockquote>${E(c.text)}</blockquote><h3>${E(c.title)}</h3></div>`;
  else if(c.t==='bg'||c.t==='next')b=`<div class="dk ${c.t} has-media">${media}<span class="dlab">${c.t==='bg'?'배경':'앞으로'}</span><h3>${E(c.title)}</h3><p class="dbody">${E(c.text)}</p></div>`;
  else if(c.t==='fact')b=`<div class="dk fact has-media">${media}<span class="dlab">${E(c.label||'근거')}</span><h3>${E(c.title)}</h3><p class="dbody">${E(c.text)}</p></div>`;
  else if(c.t==='word')b=`<div class="dk word has-media">${media}<span class="dlab">용어</span><h3>${E(c.title)}</h3><div class="dword"><b>${E(c.word)}</b><p>${E(c.text)}</p></div><a class="qbtn sm" href="quiz">퀴즈로 익히기</a></div>`;
  else if(c.t==='timeline')b=`<div class="dk tl has-media">${media}<span class="dlab">흐름</span><h3>${E(c.title)}</h3><ol class="dtl">${c.items.map(x=>`<li class="${x.dir||''}"><time>${E(x.d.slice(2).replace(/-/g,'.'))}</time><b>${E(x.text)}</b>${x.note?`<small>${E(x.note)}</small>`:''}</li>`).join('')}</ol></div>`;
  else if(c.t==='chart')b=`<div class="dk ch"><span class="dlab">추이</span><h3>${E(c.title)}</h3>${lineSvg(c.series,c.unit)}<p class="dnote">${E(c.note||'')}</p></div>`;
  else if(c.t==='bars')b=`<div class="dk ch"><span class="dlab">숫자</span><h3>${E(c.title)}</h3>${barSvg(c.series,c.unit)}<p class="dnote">${E(c.note||'')}</p></div>`;
  else if(c.t==='numbers')b=`<div class="dk num"><span class="dlab">숫자</span><h3>${E(c.title)}</h3><div class="dnums">${c.nums.map((x,i)=>`<div class="${i?'':'main'}"><b>${E(x.v)}</b><span>${E(x.l)}</span></div>`).join('')}</div></div>`;
  else if(c.t==='src')b=`<div class="dk src"><span class="dlab">출처</span><h3>원문 출처</h3>${srcList(c.sources).replace('<h4>출처</h4>','')}<p class="dnote">각 카드의 사실과 세부 맥락은 원문 기사에서 확인하세요.</p></div>`;
  return`<section class="dcard sk${skI(d)}" style="--skc:${SKC[skI(d)]}" aria-label="${k+1}/${n}"><span class="dpg">${k+1}/${n}</span>${b}</section>`}
// 회차마다 순서도 다르게: 1 흐름(타임라인·추이) 먼저, 2 숫자(숫자·막대) 먼저. 표지는 맨 앞, 출처는 맨 끝 고정
function order(d){const C=d.cards.slice(),v=skI(d)%3;if(v===0||C.length<4)return C;const head=C[0],tail=C.filter((c,i)=>i&&c.t==='src'),mid=C.filter((c,i)=>i&&c.t!=='src');
  const first=v===1?['timeline','chart']:['numbers','bars','chart'];mid.sort((a,b)=>(first.includes(b.t)?1:0)-(first.includes(a.t)?1:0));return[head,...mid,...tail]}
function deck(id){const d=F.decks.find(x=>x.id===id)||F.decks[0];if(!d)return hub();setMeta(d.title+' — 카드뉴스',d.cards[0].text||'');
  app.innerHTML=`<div class="dwrap"><a class="back" href="learn">${NBI('chevron-left')} 배우기</a><div class="dhead"><span class="dtag2">${E(d.tag)}</span><h1>${E(d.title)}</h1></div>
  <div class="deck" id="deck">${order(d).map((c,k,A)=>card(c,k,A.length,d)).join('')}</div>
  <div class="dnav"><button class="dbtn" data-d="-1" aria-label="이전">${NBI('chevron-left')}</button><div class="dots">${order(d).map((_,k)=>`<i class="${k?'':'on'}"></i>`).join('')}</div><button class="dbtn" data-d="1" aria-label="다음">${NBI('chevron-right')}</button></div>
  <div class="cact">${typeof shareBtn==='function'?shareBtn():''}${d.issue?`<a class="qbtn ghost" href="issue/${d.issue}">이슈 페이지</a>`:''}</div>
  <h3 class="dmore">다른 카드뉴스</h3><div class="dlist">${F.decks.filter(x=>x.id!==d.id).slice(0,4).map(deckTile).join('')}</div></div>`;
  const el=document.getElementById('deck'),dots=app.querySelectorAll('.dots i');
  el.addEventListener('click',e=>{const r=e.target.closest('.drev');if(r){const p=r.parentNode.querySelector('.dhid');p&&p.classList.remove('dhid');r.remove();try{navigator.vibrate&&navigator.vibrate(10)}catch(x){}}});
  const cur=()=>Math.round(el.scrollLeft/el.clientWidth);
  el.addEventListener('scroll',()=>{const c=cur();dots.forEach((x,i)=>x.classList.toggle('on',i===c))},{passive:true});
  app.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>el.scrollTo({left:(cur()+ +b.dataset.d)*el.clientWidth,behavior:'smooth'}));
  window.NBT?.enableElasticCarousel?.(el)}
/* ---------- 홈 진입점 ---------- */
function homeBlock(){if(!F)return'';const c=F.comics[0],d=F.decks[0],done=(L.days[todayK()]||{}).done;
  return`${sec(T('놀면서 배우기','Learn with news'),'Learn with news',`<a class="more" href="learn/all">${T('전체','All')} ${NBI('arrow-right')}</a>`,'book')}
  <div class="lhome"><a class="lh quiz" href="quiz"><span class="lhi">${NBI('help-hexagon-f')}</span><b>${T('오늘의 단어 퀴즈','Today’s word quiz')}</b><small>${F.quiz.questions.length}${T('문제',' questions')} · ${NBI('flame-f')}${streakNow()}${T('일 연속','-day streak')} · Lv.${lvl(L.xp)}</small><em>${done?T('완료! 다시 풀기','Done! Again'):T('3분 도전 →','3-minute challenge →')}</em></a>
  ${c?`<a class="lh comic ${comicImage(c)?'has-art':''}" href="comic/${c.id}" ${comicImage(c)?`style="--im:url('${E(AB(comicImage(c)))}')"`:''}>${comicImage(c)?'<span class="lhi art">AI 시각화</span>':`<svg viewBox="-160 -50 320 100"><g transform="translate(-70,0)">${bori('curious')}</g><g transform="translate(70,0)">${nuri('explain')}</g></svg>`}<b>${E(c.title)}</b><small>${T('4컷 설명 만화','4-panel explainer')}</small></a>`:''}
  ${d?`<a class="lh deck" href="cards/${d.id}" ${deckImage(d)?`style="--im:url('${E(AB(deckImage(d)))}')"`:''}><span class="lhi">🗂️</span><b>${E(d.title)}</b><small>${T(`카드뉴스 ${d.cards.length}장`,`Card news · ${d.cards.length} cards`)}</small></a>`:''}</div>`}
/* 메인 화면 '카드뉴스': 동일 규격 카드 통합 및 고품질 썸네일 지원 */
function mainLearn(){if(!F||!document.getElementById('app'))return;const ap=document.getElementById('app');if(ap.querySelector('.ml'))return;
  const hero=ap.querySelector('.hero');if(!hero)return;
  const items=[...(F.comics||[]).map(c=>({k:'c',c})),...(F.decks||[]).map(d=>({k:'d',d}))];if(!items.length)return;
  const s=document.createElement('section');s.className='ml';
  const cover=x=>{
    if(x.k==='c'){
      const copy=x.c.desc||((x.c.panels[0]||{}).lines||[{}])[0].text||'', comicImg=comicImage(x.c);
      return`<a class="mld comic card" href="comic/${x.c.id}"><div class="mld-thumb"${comicImg?` style="background-image:url('${E(AB(comicImg))}')"`:''}><span class="mlt">${T('4컷 만화','4-panel comic')}</span>${!comicImg?`<svg viewBox="-160 -50 320 100" aria-hidden="true"><g transform="translate(-70,0)">${bori((x.c.panels[0]||{}).mood||'curious')}</g><g transform="translate(70,0)">${nuri('explain')}</g></svg>`:''}</div><div class="mld-body"><span class="mld-kicker">${E(x.c.category||T('오늘의 이슈','Today'))} · ${T('4장으로 읽기','4 panels')}</span><b>${E(x.c.title)}</b><small>${E(copy)}</small><span class="mld-go">${T('만화로 보기','Open comic')} ${NBI('arrow-right')}</span></div></a>`;
    }
    const thumb=deckImage(x.d);
    const intro=(x.d.cards||[])[0]?.text||x.d.tag||'';
    return`<a class="mld deck card" href="cards/${x.d.id}"><div class="mld-thumb"${thumb?` style="background-image:url('${E(thumb)}')"`:''}><span class="mlt">${T('카드뉴스','Card news')} · ${x.d.cards.length}${T('장',' cards')}</span>${!thumb?`<span class="mld-monogram">${E(skEmo(x.d))}</span>`:''}</div><div class="mld-body"><span class="mld-kicker">${E(x.d.tag||T('뉴스 흐름','News brief'))}</span><b>${E(x.d.title)}</b><small>${E(intro)}</small><span class="mld-go">${T('카드 넘겨보기','Open cards')} ${NBI('arrow-right')}</span></div></a>`;
  };
  s.innerHTML=`${sec(T('카드뉴스','Card News'),'Card News',`<a class="more" href="learn/all">${T('전체 보기','See all')} ${NBI('arrow-right')}</a>`,'boom')}
   <div class="mldk"><div class="mlrow">${items.map(cover).join('')}</div></div>`;
  hero.insertAdjacentElement('afterend',s);
  const row=s.querySelector('.mlrow'); if(row&&window.NBT?.enableElasticCarousel) NBT.enableElasticCarousel(row)}
window.nbLearnMain=()=>{if(F)mainLearn();else loadF().then(mainLearn)};
addEventListener('nb:region-changed',()=>{const m=document.querySelector('.ml');if(m)m.remove()});
const FR=['learn','quiz','comic','cards'];
const _today=window.today;
window.today=function(){const h=decodeURIComponent(location.pathname.slice(BASEP.length)).replace(/\/+$/,'');const v=h.split('/')[0],a=h.split('/').slice(1).join('/');
  if(FR.includes(v)){document.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x.dataset.v==='learn'));
    const run=()=>{if(!F){app.innerHTML='<div class="note">준비 중이에요. 잠시 후 다시 열어 주세요.</div>';return}
      v==='learn'?(a==='all'?allContent():hub()):v==='quiz'?quiz(a==='review'):v==='comic'?(a?comic(a):hub()):(a?deck(a):hub())};
    const pd=v==='learn'&&/^\d{4}-\d{2}-\d{2}$/.test(a)?a:'';
    if(v==='learn'&&!pd&&PAST){PAST='';F=F0}
    if(pd&&pd!==PAST){app.innerHTML='<div class="loading">불러오는 중…</div>';loadF().then(()=>loadDay(pd)).then(j=>{if(j&&j.quiz){F=Object.assign({},F0,j);PAST=pd}else{F=F0;PAST=''}run()});return}
    if(F)run();else{app.innerHTML='<div class="loading">불러오는 중…</div>';loadF().then(run)}return}
  const r=_today.apply(this,arguments);
  const put=()=>mainLearn();
  if(F)put();else loadF().then(put);return r};
/* 설정에 소리·진동 토글 */
const _set=window.settings;
if(_set)window.settings=function(){const r=_set.apply(this,arguments);app.insertAdjacentHTML('beforeend',`<div class="card lset"><h3>퀴즈 효과</h3><label><input type="checkbox" id="lsnd" ${L.sound?'checked':''}> 정답·오답 소리</label><label><input type="checkbox" id="lhap" ${L.haptic?'checked':''}> 진동(지원하는 휴대폰)</label><button class="chip" id="lrst">학습 기록 초기화</button></div>`);
  document.getElementById('lsnd').onchange=e=>{L.sound=e.target.checked;saveL();beep(true)};document.getElementById('lhap').onchange=e=>{L.haptic=e.target.checked;saveL();buzz(20)};
  document.getElementById('lrst').onclick=()=>{if(confirm('XP·연속 기록·복습 목록을 지울까요?')){localStorage.removeItem(LK);location.reload()}};return r};
loadF();
})();
