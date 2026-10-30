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
/* ---------- 허브 ---------- */
function stats(){const s=streakNow(),b=lvBar(),rv=Object.keys(L.review).length;
  return`<div class="lstat"><div class="ls fire"><i>${NBI('flame-f')}</i><b>${s}</b><span>일 연속</span></div><div class="ls xp"><i>${NBI('bolt')}</i><b>${L.xp}</b><span>XP</span></div><div class="ls lv"><i>${NBI('medal')}</i><b>Lv.${b.n}</b><span>다음까지 ${b.left}XP</span></div><div class="ls rv"><i>🔁</i><b>${rv}</b><span>복습 단어</span></div></div>
  <div class="lvbar"><i style="width:${b.pct}%"></i></div>`}
function hub(){setMeta('놀면서 배우기 — 퀴즈·만화·카드뉴스','오늘 뉴스의 어려운 말을 OX 퀴즈로, 핫이슈를 4컷 만화로, 이어지는 사건을 카드뉴스로');
  const q=F.quiz,done=!PAST&&(L.days[todayK()]||{}).done;
  app.innerHTML=`${PAST?`<div class="lpast-on"><b>${PAST.slice(5).replace('-','.')} 기록</b>을 보고 있어요 <a href="learn">오늘로 돌아가기 ${NBI('arrow-right')}</a></div>`:''}<section class="lhero"><div><small>LEARN WITH NEWS</small><h1>${T('놀면서 배우는 뉴스','Learn the news, playfully')}</h1><p>하루 3분, 오늘 기사에 나온 말을 퀴즈로 익히고 어려운 이슈는 만화와 카드로 쉽게 봐요.</p></div><div class="lmasc"><svg viewBox="-160 -50 320 100">${'<g transform="translate(-70,0)">'+bori('smile')+'</g><g transform="translate(70,0)">'+nuri('explain')+'</g>'}</svg></div></section>
  ${stats()}
  <div class="ltiles">
   <a class="lt quiz" href="quiz"><span class="lti">${NBI('help-hexagon',1,'on')}</span><b>${T('오늘의 단어 퀴즈','Today’s word quiz')}</b><small>${q.questions.length}${T('문제 · OX·객관식·빈칸',' questions · true/false, choice, fill-in')}</small><em>${done?T('오늘 완료! 다시 풀기','Done today! Play again'):T('시작하기 →','Start →')}</em></a>
   <a class="lt review ${Object.keys(L.review).length?'':'off'}" href="quiz/review"><span class="lti">🔁</span><b>틀린 단어 복습</b><small>${Object.keys(L.review).length?Object.keys(L.review).length+'개가 기다려요':'아직 없어요'}</small><em>복습하기 ${NBI('arrow-right')}</em></a>
  </div>
  ${sec(T('4컷으로 보는 뉴스','News in 4 panels'),'Explainer comics',`<span class="more">${T('AI 해설 만화 · 실존 인물 풍자 아님','AI explainer comics · not satire of real people')}</span>`,'comic')}
  <div class="clist">${F.comics.slice(0,6).map(c=>`<a class="cl" href="comic/${c.id}"><div class="clp" style="--pb:${BG[0]}">${'<svg viewBox="-160 -50 320 100"><g transform="translate(-80,0)">'+bori(c.panels[0].mood)+'</g><g transform="translate(80,0)">'+nuri('explain')+'</g></svg>'}<span class="clb">${E(c.panels[0].lines[0].text)}</span></div><div class="clt"><span class="cat ${c.category}">${c.category}</span><b>${E(c.title)}</b><small>${c.date.slice(5).replace('-','.')}</small></div></a>`).join('')}</div>
  ${sec(T('카드뉴스','Card news'),'Card news',`<span class="more">${T('넘겨 보는 흐름 정리','Swipe through the story')}</span>`,'cards')}
  <div class="dlist">${F.decks.slice(0,8).map(deckTile).join('')}</div>
  <div id="lpast"></div>`;
  loadIX().then(ix=>{const el=document.getElementById('lpast');const ds=Object.keys(ix.days||{}).sort().reverse().slice(0,30);if(!el||ds.length<2)return;
    el.innerHTML=sec('지난 기록','Past days','<span class="more">그날의 퀴즈·만화·카드뉴스</span>','clock')+`<div class="lpast">${ds.map(d=>{const x=ix.days[d];const cur=PAST?d===PAST:d===todayK();return`<a class="lpd ${cur?'on':''}" href="learn/${d}"><b>${d.slice(5).replace('-','.')}</b><small>${E((x.w||[]).slice(0,2).join(' · '))}</small><em>퀴즈 ${x.q} · 만화 ${x.c} · 카드 ${x.d}</em></a>`}).join('')}</div>`})}
function deckTile(d){const h=d.cards[0];return`<a class="dt ${d.kind}" href="cards/${d.id}" ${h.img?`style="--im:url('${E(AB(h.img))}')"`:''}><span class="dtag">${E(d.tag)}</span><b>${E(d.title)}</b><span class="dn">${d.cards.length}${T('장',' cards')} ${NBI('chevron-right')}</span></a>`}
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
function comic(id){const c=F.comics.find(x=>x.id===id)||F.comics[0];if(!c)return hub();setMeta(c.title+' — 4컷 해설',c.headline);
  app.innerHTML=`<div class="cwrap"><a class="back" href="learn">${NBI('chevron-left')} 배우기</a><div class="chead"><span class="cat ${c.category}">${c.category}</span><h1>${E(c.title)}</h1><p>${E(c.headline)}</p></div>
  <div class="comic${window.NBC?' c2':''}">${c.panels.map((p,k)=>window.NBC?NBC.panel(p,k,c):panel(p,k)).join('')}</div>
  <p class="cnote">이 만화는 기사 내용을 쉽게 풀어 쓴 <b>설명용 만화</b>예요. 등장하는 보리·누리는 NewsBoard 마스코트이고, 실존 인물을 묘사하거나 풍자하지 않아요. 정확한 내용은 아래 원문으로 확인하세요.</p>
  <div class="cact"><a class="qbtn" href="issue/${c.issue}">이 이슈 자세히 보기</a>${typeof shareBtn==='function'?shareBtn():''}</div>${srcList(c.sources)}</div>`}
/* ---------- 카드뉴스 ---------- */
function lineSvg(S,unit){const v=S.map(x=>x[1]),mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1,W=300,H=150;const pts=v.map((y,i)=>[(i/(v.length-1||1)*W),(H-12-(y-mn)/r*(H-36))]);
  return`<svg class="dchart" viewBox="0 0 ${W} ${H+18}"><polyline points="0,${H} ${pts.map(p=>p.join(',')).join(' ')} ${W},${H}" fill="#ff4d2e22"/><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#ff4d2e" stroke-width="3" stroke-linejoin="round"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="5" fill="#ff4d2e"/>
  <text x="0" y="${H+16}" font-size="11" fill="#8189a3">${E(S[0][0])}</text><text x="${W}" y="${H+16}" font-size="11" fill="#8189a3" text-anchor="end">${E(S.at(-1)[0])}</text><text x="${W-4}" y="${pts.at(-1)[1]-10}" font-size="14" font-weight="800" fill="#0f1630" text-anchor="end">${v.at(-1)}${unit}</text><text x="2" y="14" font-size="11" fill="#8189a3">최고 ${mx}${unit}</text></svg>`}
function barSvg(S,unit){const mx=Math.max(...S.map(x=>x[1]))||1,W=300,H=140,bw=W/S.length;
  return`<svg class="dchart" viewBox="0 0 ${W} ${H+20}">${S.map((x,i)=>{const h=Math.max(4,x[1]/mx*(H-24));return`<rect x="${i*bw+bw*.18}" y="${H-h}" width="${bw*.64}" height="${h}" rx="5" fill="${x[1]===mx?'#ff4d2e':'#ffc2b4'}"/><text x="${i*bw+bw/2}" y="${H-h-5}" font-size="11" font-weight="800" text-anchor="middle" fill="#0f1630">${x[1]}</text><text x="${i*bw+bw/2}" y="${H+15}" font-size="10" text-anchor="middle" fill="#8189a3">${E(String(x[0]).slice(5).replace('-','.'))}</text>`}).join('')}</svg>`}
function card(c,k,n,d){let b='';
  if(c.t==='hook')b=`<div class="dk hook" ${c.img?`style="--im:url('${E(AB(c.img))}')"`:''}><span class="dtag">${E(d.tag)}</span>${c.icon?`<span class="dico">${c.icon}</span>`:''}<h2>${E(c.big)}</h2><p>${E(c.text)}</p><span class="swh">옆으로 넘겨 보세요 ${NBI('chevron-right')}</span></div>`;
  else if(c.t==='bg'||c.t==='next')b=`<div class="dk ${c.t}"><span class="dlab">${c.t==='bg'?'배경':'앞으로'}</span><h3>${E(c.title)}</h3><p class="dbody">${E(c.text)}</p></div>`;
  else if(c.t==='word')b=`<div class="dk word"><span class="dlab">용어</span><h3>${E(c.title)}</h3><div class="dword"><b>${E(c.word)}</b><p>${E(c.text)}</p></div><a class="qbtn sm" href="quiz">퀴즈로 익히기</a></div>`;
  else if(c.t==='timeline')b=`<div class="dk tl"><span class="dlab">흐름</span><h3>${E(c.title)}</h3><ol class="dtl">${c.items.map(x=>`<li class="${x.dir||''}"><time>${E(x.d.slice(2).replace(/-/g,'.'))}</time><b>${E(x.text)}</b>${x.note?`<small>${E(x.note)}</small>`:''}</li>`).join('')}</ol></div>`;
  else if(c.t==='chart')b=`<div class="dk ch"><span class="dlab">추이</span><h3>${E(c.title)}</h3>${lineSvg(c.series,c.unit)}<p class="dnote">${E(c.note||'')}</p></div>`;
  else if(c.t==='bars')b=`<div class="dk ch"><span class="dlab">숫자</span><h3>${E(c.title)}</h3>${barSvg(c.series,c.unit)}<p class="dnote">${E(c.note||'')}</p></div>`;
  else if(c.t==='numbers')b=`<div class="dk num"><span class="dlab">숫자</span><h3>${E(c.title)}</h3><div class="dnums">${c.nums.map((x,i)=>`<div class="${i?'':'main'}"><b>${E(x.v)}</b><span>${E(x.l)}</span></div>`).join('')}</div></div>`;
  else if(c.t==='src')b=`<div class="dk src"><span class="dlab">출처</span><h3>자료 출처</h3>${srcList(c.sources).replace('<h4>출처</h4>','')}<p class="dnote">카드뉴스는 NewsBoard 타임라인 DB에서 자동으로 만들어요.</p></div>`;
  return`<section class="dcard" aria-label="${k+1}/${n}"><span class="dpg">${k+1}/${n}</span>${b}</section>`}
function deck(id){const d=F.decks.find(x=>x.id===id)||F.decks[0];if(!d)return hub();setMeta(d.title+' — 카드뉴스',d.cards[0].text||'');
  app.innerHTML=`<div class="dwrap"><a class="back" href="learn">${NBI('chevron-left')} 배우기</a><div class="dhead"><span class="dtag2">${E(d.tag)}</span><h1>${E(d.title)}</h1></div>
  <div class="deck" id="deck">${d.cards.map((c,k)=>card(c,k,d.cards.length,d)).join('')}</div>
  <div class="dnav"><button class="dbtn" data-d="-1" aria-label="이전">${NBI('chevron-left')}</button><div class="dots">${d.cards.map((_,k)=>`<i class="${k?'':'on'}"></i>`).join('')}</div><button class="dbtn" data-d="1" aria-label="다음">${NBI('chevron-right')}</button></div>
  <div class="cact">${typeof shareBtn==='function'?shareBtn():''}${d.issue?`<a class="qbtn ghost" href="issue/${d.issue}">이슈 페이지</a>`:''}</div>
  <h3 class="dmore">다른 카드뉴스</h3><div class="dlist">${F.decks.filter(x=>x.id!==d.id).slice(0,4).map(deckTile).join('')}</div></div>`;
  const el=document.getElementById('deck'),dots=app.querySelectorAll('.dots i');
  const cur=()=>Math.round(el.scrollLeft/el.clientWidth);
  el.addEventListener('scroll',()=>{const c=cur();dots.forEach((x,i)=>x.classList.toggle('on',i===c))},{passive:true});
  app.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>el.scrollTo({left:(cur()+ +b.dataset.d)*el.clientWidth,behavior:'smooth'}))}
/* ---------- 홈 진입점 ---------- */
function homeBlock(){if(!F)return'';const c=F.comics[0],d=F.decks[0],done=(L.days[todayK()]||{}).done;
  return`${sec(T('놀면서 배우기','Learn with news'),'Learn with news',`<a class="more" href="learn">${T('전체','All')} ${NBI('arrow-right')}</a>`,'book')}
  <div class="lhome"><a class="lh quiz" href="quiz"><span class="lhi">${NBI('help-hexagon-f')}</span><b>${T('오늘의 단어 퀴즈','Today’s word quiz')}</b><small>${F.quiz.questions.length}${T('문제',' questions')} · ${NBI('flame-f')}${streakNow()}${T('일 연속','-day streak')} · Lv.${lvl(L.xp)}</small><em>${done?T('완료! 다시 풀기','Done! Again'):T('3분 도전 →','3-minute challenge →')}</em></a>
  ${c?`<a class="lh comic" href="comic/${c.id}"><svg viewBox="-160 -50 320 100"><g transform="translate(-70,0)">${bori('curious')}</g><g transform="translate(70,0)">${nuri('explain')}</g></svg><b>${E(c.title)}</b><small>${T('4컷 설명 만화','4-panel explainer')}</small></a>`:''}
  ${d?`<a class="lh deck" href="cards/${d.id}" ${d.cards[0].img?`style="--im:url('${E(AB(d.cards[0].img))}')"`:''}><span class="lhi">🗂️</span><b>${E(d.title)}</b><small>${T(`카드뉴스 ${d.cards.length}장`,`Card news · ${d.cards.length} cards`)}</small></a>`:''}</div>`}
/* 메인 화면 '놀면서 배우기': 단어 퀴즈 덱(국내=오늘의 시사 단어, 해외=오늘의 영어 표현) + 카드뉴스·4컷 만화 카드 덱.
   국내·해외 탭 모두 같은 구성(해외는 fun.json world). 오늘의 도전(game.js) 아래에 들어감 */
function mainLearn(){if(!F||!document.getElementById('app'))return;const ap=document.getElementById('app');if(ap.querySelector('.ml'))return;
  const hero=ap.querySelector('.hero');if(!hero)return;const W=WORLDM(),Q=(F.quiz&&F.quiz.questions||[]).filter(q=>q.choices||q.kind==='ox');
  const items=[...(F.comics||[]).slice(0,4).map(c=>({k:'c',c})),...(F.decks||[]).slice(0,6).map(d=>({k:'d',d}))];if(!Q.length&&!items.length)return;
  const dk='nb-wq',day=(F.quiz&&F.quiz.date)||todayK();let A={};try{const o=JSON.parse(localStorage.getItem(dk)||'{}');A=o.d===day+(W?'w':'k')?o.a:{}}catch(e){}
  let cur=Q.findIndex((q,i)=>A[i]==null);if(cur<0)cur=0;
  const s=document.createElement('section');s.className='ml';
  const title=W?T('오늘의 영어 표현 퀴즈','Today’s English word quiz'):'오늘의 시사 단어 퀴즈';
  const card=i=>{const q=Q[i],a=A[i],done=a!=null,ok=done&&(q.kind==='ox'?(a===1)===q.answer:a===q.answer),w=(F.quiz.words||[]).find(x=>x.word===q.word)||{};
    const ch=q.kind==='ox'?['O','X']:q.choices;
    return`<div class="mlq ${done?(ok?'ok':'no'):''}"><div class="mlw"><b ${W?'lang="en"':''}>${E(q.word||'')}</b>${w.field?`<i>${E(w.field)}</i>`:''}</div><p class="mlqq">${E(q.q)}</p>${q.quote?`<q ${W?'lang="en"':''}>${E(q.quote)}</q>`:''}
     <div class="mlc ${q.kind==='ox'?'ox':''}">${ch.map((c,k)=>{const v=q.kind==='ox'?(k?0:1):k,right=q.kind==='ox'?(v===1)===q.answer:v===q.answer;return`<button type="button" data-v="${v}" class="${done&&right?'right':''} ${done&&a===v&&!right?'wrong':''}" ${done?'disabled':''}>${E(c)}</button>`}).join('')}</div>
     ${done?`<div class="mlx"><b>${ok?T('정답!','Correct!'):T('아쉬워요','Not quite')}</b> ${w.mean?E(w.word+' — '+w.mean):''}${w.tip?`<small>${E(w.tip)}</small>`:''}</div>`:''}</div>`};
  const draw=()=>{const qa=s.querySelector('.mlqa');if(!qa||!Q.length)return;qa.innerHTML=card(cur)+`<div class="mlnav"><button type="button" data-d="-1" ${cur?'':'disabled'} aria-label="${T('이전','Previous')}">${NBI('chevron-left')}</button><span>${Q.map((_,i)=>`<i class="${i===cur?'on':''} ${A[i]!=null?'done':''}"></i>`).join('')}</span><button type="button" data-d="1" ${cur<Q.length-1?'':'disabled'} aria-label="${T('다음','Next')}">${NBI('chevron-right')}</button></div>`};
  const cover=x=>x.k==='c'?`<a class="mld comic" href="comic/${x.c.id}"><span class="mlt">${T('4컷 만화','4-panel comic')}</span><svg viewBox="-160 -50 320 100" aria-hidden="true"><g transform="translate(-70,0)">${bori((x.c.panels[0]||{}).mood||'curious')}</g><g transform="translate(70,0)">${nuri('explain')}</g></svg><b>${E(x.c.title)}</b><small>${E(((x.c.panels[0]||{}).lines||[{}])[0].text||'')}</small></a>`
    :`<a class="mld deck" href="cards/${x.d.id}" ${x.d.cards[0].img?`style="--im:url('${E(AB(x.d.cards[0].img))}')"`:''}><span class="mlt">${T('카드뉴스','Card news')} · ${x.d.cards.length}${T('장',' cards')}</span><b>${E(x.d.title)}</b><small>${E(x.d.tag||'')}</small></a>`;
  s.innerHTML=`${sec(W?T('뉴스로 배우는 영어','Learn English with the news'):'놀면서 배우기','Learn with news',`<a class="more" href="learn">${T('전체 보기','See all')} ${NBI('arrow-right')}</a>`,'book')}
   <div class="mlg">${Q.length?`<div class="mlqa-w card"><h3>${NBI('help-hexagon')}${title}<small>${Q.length}${T('문제',' questions')}</small></h3><div class="mlqa"></div></div>`:''}
   ${items.length?`<div class="mldk"><h3>${T('카드뉴스 · 4컷 만화','Card news · comics')}<small>${T('옆으로 넘겨 보세요','Swipe')}</small></h3><div class="mlrow">${items.map(cover).join('')}</div></div>`:''}</div>`;
  const anchor=ap.querySelector('.gm-today')||hero;anchor.insertAdjacentElement('afterend',s);draw();
  s.addEventListener('click',e=>{const b=e.target.closest('.mlc [data-v]');if(b){const v=+b.dataset.v,q=Q[cur];A[cur]=v;localStorage.setItem(dk,JSON.stringify({d:day+(W?'w':'k'),a:A}));
      const ok=q.kind==='ox'?(v===1)===q.answer:v===q.answer;try{L.xp+=ok?10:2;saveL()}catch(x){}window.NBGame&&ok&&NBGame.ev('quiz_x',1,{xp:10,why:T('단어 퀴즈 정답','Word quiz correct')});draw();
      if(ok&&cur<Q.length-1)setTimeout(()=>{cur++;draw()},1400);return}
    const d=e.target.closest('.mlnav [data-d]');if(d){cur=Math.max(0,Math.min(Q.length-1,cur+(+d.dataset.d)));draw()}})}
window.nbLearnMain=()=>{if(F)mainLearn();else loadF().then(mainLearn)};
// 오늘의 도전(game.js)이 나중에 들어오면 그 아래로 옮김
new MutationObserver(()=>{const ap=document.getElementById('app'),m=ap&&ap.querySelector('.ml'),g=ap&&ap.querySelector('.gm-today');if(m&&g&&g.nextElementSibling!==m)g.insertAdjacentElement('afterend',m)}).observe(document.getElementById('app')||document.body,{childList:true});
addEventListener('nb:region-changed',()=>{const m=document.querySelector('.ml');if(m)m.remove()});
const FR=['learn','quiz','comic','cards'];
const _today=window.today;
window.today=function(){const h=decodeURIComponent(location.pathname.slice(BASEP.length)).replace(/\/+$/,'');const v=h.split('/')[0],a=h.split('/').slice(1).join('/');
  if(FR.includes(v)){document.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x.dataset.v==='learn'));
    const run=()=>{if(!F){app.innerHTML='<div class="note">준비 중이에요. 잠시 후 다시 열어 주세요.</div>';return}
      v==='learn'?hub():v==='quiz'?quiz(a==='review'):v==='comic'?(a?comic(a):hub()):(a?deck(a):hub())};
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
