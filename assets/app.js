const $=s=>document.querySelector(s);const app=$('#app');let D=null;const CACHE={};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPE={person:'인물',place:'장소',org:'기관·기업',event:'키워드'};
const CATS=['정치','경제','사회','세계','IT','연예','스포츠'];
const CATC={정치:'#2f6bff',경제:'#11a683',사회:'#ff4d2e',세계:'#7a4dff',IT:'#0aa5c8',연예:'#e2448e',스포츠:'#f08a00'};
/* 아이콘 */
const IC={정치:'<path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M2 10l10-6 10 6"/>',경제:'<path d="M3 17l5-5 4 4 8-8M15 8h5v5"/>',사회:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c1-4 11-4 12 0M14 20c.5-3 6-3 7 0"/>',세계:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',IT:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',연예:'<path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16l-5.4 3.2 1.3-6L3.4 9.2l6-.6z"/>',스포츠:'<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/>',
fire:'<path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-6 1-9z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',chat:'<path d="M4 5h16v11H9l-5 4z"/>',link:'<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',book:'<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-5a3 3 0 0 0-3 3"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',spark:'<path d="M12 2l2 7 7 3-7 3-2 7-2-7-7-3 7-3z"/>',news:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 15-5 16 0"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',coin:'<circle cx="12" cy="12" r="9"/><path d="M9 9h4a2 2 0 0 1 0 4H9h5a2 2 0 0 1 0 4H9M11 7v12"/>',alert:'<path d="M12 3l10 18H2zM12 10v5M12 18v.5"/>'};
const ic=(n,c='')=>`<svg class="ico ${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]||IC.news}</svg>`;
const ago=t=>{if(!t)return'';const m=(Date.now()-new Date(t))/6e4;if(m<60)return Math.max(1,m|0)+'분 전';if(m<1440)return(m/60|0)+'시간 전';if(m<43200)return(m/1440|0)+'일 전';return fmtD(t)};
const fmtD=t=>{const d=new Date(t);return`${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`};
const fmtDay=d=>{const t=new Date(d+'T12:00:00+09:00');return`${t.getFullYear()}년 ${t.getMonth()+1}월 ${t.getDate()}일 (${'일월화수목금토'[t.getDay()]})`};
const bg=u=>u?`style="background-image:url('${esc(u)}')"`:'';
const ent=n=>D.entities.find(e=>e.name===n);
const eh=n=>'#/entity/'+encodeURIComponent(n);const kh=n=>'#/kw/'+encodeURIComponent(n);
const AIB='<span class="aib">'+'<svg viewBox="0 0 24 24"><path d="M12 2l2 7 7 3-7 3-2 7-2-7-7-3 7-3z"/></svg>AI 요약</span>';
function chipE(n,nolink){const e=ent(n);if(e&&nolink)return`<span class="chip ${e.type}">${esc(n)}</span>`;return e?`<a class="chip ${e.type}" href="${eh(n)}">${esc(n)}</a>`:`<span class="chip event">#${esc(n)}</span>`}
function spark(daily,w=120,h=28,col='#ff4d2e'){const now=new Date();const bins=Array(24).fill(0);
  daily.forEach(([d,c])=>{const t=new Date(d);const k=(now.getFullYear()-t.getFullYear())*12+now.getMonth()-t.getMonth();if(k>=0&&k<24)bins[23-k]+=c});
  return line(bins,w,h,col)}
function line(v,w=120,h=28,col='#ff4d2e'){if(!v||v.length<2)return'';const mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1;
  const pts=v.map((x,i)=>`${(i/(v.length-1)*w).toFixed(1)},${(h-2-(x-mn)/r*(h-4)).toFixed(1)}`).join(' ');
  return`<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="0,${h} ${pts} ${w},${h}" fill="${col}22" stroke="none"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`}
function sec(t,sub,more='',icon=''){return`<div class="sec"><h2><small>${sub}</small>${icon?ic(icon,'h'):''}${t}</h2>${more}</div>`}
function av(e,cls='av'){const t=e.wiki&&e.wiki.thumb;return`<div class="${cls}" ${bg(t)}>${t?'':esc(e.name[0])}</div>`}
function th(u,cls='th',fb='news'){return u?`<div class="${cls}" ${bg(u)}></div>`:`<div class="${cls} noimg">${ic(fb)}</div>`}
/* ---------- 설정 ---------- */
const S=Object.assign({hide:[],fs:100},JSON.parse(localStorage.getItem('nb-settings')||'{}'));
const saveS=()=>{localStorage.setItem('nb-settings',JSON.stringify(S));applyS()};
const applyS=()=>{document.documentElement.style.fontSize=(16*S.fs/100)+'px'};applyS();
const vis=i=>!S.hide.includes(i.category);

async function load(){
  D=await (await fetch('data/today.json?'+Date.now())).json();
  $('#updated').innerHTML=`${fmtD(D.updated)} ${new Date(D.updated).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} 업데이트<br>기사 ${(D.stats.naver+D.stats.google).toLocaleString()}건 · 언론사 ${D.stats.presses}곳`;
  const tk=D.trends.map((t,i)=>`<a href="${kh(t.keyword)}"><b>${i+1}</b>${esc(t.keyword)} <small>${esc(t.traffic)}</small></a>`).join('');
  $('#ticker').innerHTML=`<div class="lab">${ic('fire')}실시간</div><div class="tw"><div class="run">${tk}${tk}</div></div>`;
  route();
}
window.addEventListener('hashchange',route);
function route(){
  if(!D)return;const h=decodeURIComponent(location.hash.slice(2));const v=h.split('/')[0],a=h.split('/').slice(1).join('/');
  const tab={'':'today',issue:'today',kw:'today',entity:'people'}[v]??v;
  document.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x.dataset.v===tab));
  window.scrollTo(0,0);
  ({'':today,issue:()=>issue(a),entity:()=>entity(a),kw:()=>kw(a),market,timeline,people,map,archive,settings}[v]||today)();
}

/* ---------- 마켓 위젯 ---------- */
const up=m=>m.dir==='RISING'?'up':m.dir==='FALLING'?'down':'';
function mcard(m,big){const d=up(m),s=d==='up'?'▲':d==='down'?'▼':'';
  return`<div class="mk ${d} ${big?'big':''}"><span class="n">${esc(m.name)}${m.unit?`<i>${esc(m.unit)}</i>`:''}</span><b>${esc(m.price)}</b><em>${s} ${esc(m.diff)} (${d==='down'?'-':d==='up'?'+':''}${esc(m.rate)}%)</em>${line(m.series,120,big?44:28,d==='down'?'#2f6bff':'#ff4d2e')}</div>`}
function marketStrip(){const M=D.market||[];if(!M.length)return'';
  return`${sec('주요 증시·환율','Stock & Currency',`<a class="more" href="#/market">마켓 전체 →</a>`,'chart')}<div class="mkrow">${M.slice(0,8).map(m=>mcard(m)).join('')}</div>`}

/* ---------- 오늘 ---------- */
function today(){
  const I=D.issues.filter(vis);if(!I.length){app.innerHTML='<div class="note">설정에서 모든 카테고리를 껐어요. <a href="#/settings">설정</a></div>';return}
  const L=I[0],mx=Math.max(...I.map(i=>i.score));
  const side=I.slice(1,5).map(i=>`<a class="card mini" href="#/issue/${i.id}"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><h3>${esc(i.title)}</h3><div class="m">${ic('news')}${esc(i.press)} 외 ${i.presses-1}곳 ${i.opinion?`· ${ic('chat')}${i.opinion.total.toLocaleString()}`:''}</div></div></a>`).join('');
  const cats={};I.forEach(i=>cats[i.category]=(cats[i.category]||0)+1);
  const grid=I.map((i,k)=>{const wide=k===0||k===5;const txt=!i.image;
    return`<a class="card ic ${wide?'wide':''} ${txt?'text':''}" href="#/issue/${i.id}">
    ${txt?'':`<div class="img" ${bg(i.image)}><div class="rk">${i.rank}</div>${i.opinion?`<span class="cm">${ic('chat')}${i.opinion.total.toLocaleString()}</span>`:''}</div>`}
    <div class="bd">${txt?`<div class="rkt">${String(i.rank).padStart(2,'0')}</div>`:''}<div class="row"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span>${i.trend.length?`<span class="chip event">${ic('fire')}검색 급상승</span>`:''}</div>
    <h3>${esc(i.title)}</h3>${i.summary.length?`<ul>${i.summary.slice(0,wide?3:2).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}
    ${(i.flow||[]).some(f=>f.items.some(x=>x.img))?`<div class="strip">${i.flow.flatMap(f=>f.items.filter(x=>x.img).slice(0,1)).slice(0,4).map(x=>`<span ${bg(x.img)}></span>`).join('')}<small>${ic('clock')}흐름 ${i.flow.length}일</small></div>`:''}
    <div class="chips">${i.entities.slice(0,3).map(n=>chipE(n,1)).join('')}</div>
    <div class="bar"><i style="width:${(i.score/mx*100).toFixed(0)}%"></i></div>
    <div class="ft"><span>화제도 ${Math.round(i.score)} · 언론사 ${i.presses}곳</span><span>자세히 →</span></div></div></a>`}).join('');
  const P=D.entities.filter(e=>e.type==='person').slice(0,12);
  const pcs=P.map(e=>`<a class="card pc" href="${eh(e.name)}">${av(e)}<b>${esc(e.name)}</b><small>${esc(e.wiki?.desc||'')}</small>${spark(e.daily)}<span class="last">${e.timeline[0]?esc(e.timeline[0].title):''}</span></a>`).join('');
  const tr=D.trends.slice(0,10).map((t,i)=>`<a class="tr" href="${kh(t.keyword)}">${th(t.image,'tt','search')}<span class="n">${i+1}</span><b>${esc(t.keyword)}</b><span class="tv">${esc(t.traffic)}</span></a>`).join('');
  const W=(D.words||[]).slice(0,6);
  app.innerHTML=`
  <section class="hero">
    <a class="lead" href="#/issue/${L.id}" ${bg(L.image)}><div class="in"><div class="no">01</div><span class="cat ${L.category}">${ic(L.category)}${L.category}</span>
      <h1>${esc(L.title)}</h1><p>${esc(L.summary.join(' '))}</p>
      <div class="meter"><div>${ic('news')}<b>${L.mentions}</b><span>관련 기사</span></div><div>${ic('user')}<b>${L.presses}</b><span>보도 언론사</span></div><div>${ic('chat')}<b>${L.opinion?L.opinion.total.toLocaleString():'-'}</b><span>댓글</span></div></div></div></a>
    <div class="side">${side}</div>
  </section>
  ${marketStrip()}
  ${sec('오늘의 이슈 TOP 10','Today’s Top 10',`<a class="more" href="#/settings">${ic('gear')}카테고리 설정</a>`,'fire')}
  <div class="catbar">${Object.entries(cats).map(([c,n])=>`<i style="flex:${n};background:${CATC[c]}"></i>`).join('')}</div>
  <div class="legend">${Object.entries(cats).map(([c,n])=>`<span style="--c:${CATC[c]}">${c} ${n}</span>`).join('')}</div>
  <div class="grid10">${grid}</div>
  ${sec('실시간 검색어','Google Trends KR','<span class="more">눌러서 오늘·과거 흐름 보기</span>','search')}
  <div class="trends">${tr}</div>
  ${W.length?sec('오늘의 단어','Words of the day',`<span class="more">문해력 한 스푼</span>`,'book')+`<div class="words">${W.map(wordCard).join('')}</div>`:''}
  ${sec('화제의 인물','People in the news',`<a class="more" href="#/people">전체 →</a>`,'user')}
  <div class="hs">${pcs}</div>
  ${sec('관계로 보는 오늘','Relation map',`<a class="more" href="#/map">크게 보기 →</a>`,'link')}
  <div class="card mapwrap mini" id="mapmini"></div>`;
  graph($('#mapmini'),true);
}
function wordCard(w){return`<div class="card term word"><div class="wt">${w.wiki.thumb?`<span class="wi" ${bg(w.wiki.thumb)}></span>`:`<span class="wi noimg">${ic('book')}</span>`}<div><h4>${esc(w.word)}</h4><em>${esc(w.wiki.desc||'오늘 기사 '+w.count+'회 등장')}</em></div></div>
  <p class="easy">${w.ai?AIB:''}${esc(w.easy)}</p>
  <div class="ex">${w.examples.slice(0,2).map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">“${esc(x.title)}” <small>${esc(x.press)}</small></a>`).join('')}</div>
  <a class="src1" href="${esc(w.wiki.url)}" target="_blank" rel="noopener">${ic('book')}출처: 위키백과</a></div>`}

/* ---------- 이슈 상세 ---------- */
function biasB(s){if(!s.bias)return'';return`<span class="bias ${s.bias.lean}" title="${esc(s.bias.reason)}">${ic('alert')}${s.bias.lean==='left'?'좌편향 주의':'우편향 주의'}</span>`}
function issue(id){
  const i=D.issues.find(x=>x.id===id);if(!i)return today();
  const ai=i.ai||{},op=i.opinion,aop=ai.opinion||{};
  const ents=i.entities.map(ent).filter(Boolean);
  const flow=(i.flow||[]).map((f,k)=>`<div class="fg"><div class="fd"><b>${fmtDay(f.date)}</b><span>${k===0?'최신':ago(f.date+'T12:00:00+09:00')}</span></div>
    ${f.meaning?`<div class="mean">${AIB}<p>${esc(f.meaning)}</p></div>`:''}
    ${f.items.map((x,j)=>`<a class="fe ${j===0?'first':''}" href="${esc(x.url)}" target="_blank" rel="noopener">${th(x.img,'fi')}<div><h5>${esc(x.title)}</h5>${x.body&&j===0?`<p>${esc(x.body.slice(0,110))}…</p>`:''}<small>${esc(x.press)}</small></div></a>`).join('')}</div>`).join('');
  const st=(aop.stances||[]),col=['#ff4d2e','#2f6bff','#11a683','#f08a00'];
  const opin=op?`<div class="card opin">
    <div class="ostat"><div>${ic('chat')}<b>${op.total.toLocaleString()}</b><span>댓글 (${op.articles}개 기사)</span></div><div><b>👍 ${op.like.toLocaleString()}</b><span>상위 댓글 공감</span></div><div><b>👎 ${op.dislike.toLocaleString()}</b><span>비공감</span></div></div>
    ${aop.summary?`<div class="mean">${AIB}<p>${esc(aop.summary)}</p></div>`:''}
    ${st.length?`<h5>입장 분포 <small>(공감순 상위 댓글 기준 AI 분류)</small></h5><div class="stbar">${st.map((s,k)=>`<i style="flex:${s.share};background:${col[k%4]}">${s.share}%</i>`).join('')}</div><div class="stl">${st.map((s,k)=>`<div><b style="color:${col[k%4]}">● ${esc(s.label)} ${s.share}%</b><span>${esc(s.desc)}</span></div>`).join('')}</div>`:''}
    <div class="demo">${op.gender?`<div><h5>성별</h5><div class="gbar"><i style="flex:${op.gender.male}">남 ${op.gender.male}%</i><i style="flex:${op.gender.female}" class="f">여 ${op.gender.female}%</i></div></div>`:''}
    ${op.ages?`<div><h5>연령대</h5><div class="ages">${Object.entries(op.ages).map(([a,v])=>`<span><i style="height:${v*1.6+2}px"></i>${a}${a==='70'?'+':''}</span>`).join('')}</div></div>`:''}</div>
    <h5>많이 나온 말</h5><div class="cloud">${op.words.map(([w,v],k)=>`<span style="font-size:${(0.8+Math.min(1,v/op.words[0][1])*0.9).toFixed(2)}rem;opacity:${(.55+Math.min(1,v/op.words[0][1])*.45).toFixed(2)}">${esc(w)}</span>`).join('')}</div>
    <h5>공감 많은 댓글</h5><div class="cmts">${((aop.quotes||[]).length?op.top.filter(c=>aop.quotes.some(q=>c.text.includes(q.slice(0,20)))):op.top).slice(0,4).concat(op.top).filter((c,k,a)=>a.indexOf(c)===k).slice(0,5).map(c=>`<a href="${esc(c.src)}" target="_blank" rel="noopener">“${esc(c.text)}”<small>👍 ${c.like} · 👎 ${c.dislike}</small></a>`).join('')}</div>
    <p class="fine">네이버 뉴스 댓글(공감순 상위)을 수집·집계했습니다. 일부 이용자의 의견으로, 전체 여론을 대표하지 않습니다.</p></div>`:'<div class="note">이 이슈는 댓글을 수집할 수 있는 네이버 기사가 없어요.</div>';
  const past=(i.past||[]).length?`${sec('과거와 연결된 사건','Linked from archive','','link')}<div class="past">${i.past.map(p=>`<a class="card mini" href="${esc(p.url)}" target="_blank" rel="noopener">${th(p.image)}<div class="tx"><span class="chip">${fmtD(p.date)} · ${p.rank}위</span><h3>${esc(p.title)}</h3><div class="m">공통: ${p.shared.map(esc).join(', ')}</div></div></a>`).join('')}</div>`:'';
  app.innerHTML=`<a class="back" href="#/">← 오늘의 TOP 10</a>
  <article class="dhead card"><div class="img" ${bg(i.image)}><div class="ov"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><b>오늘의 이슈 ${i.rank}위</b></div></div>
   <div class="bd"><h1>${esc(i.title)}</h1>
    <div class="kpis"><div>${ic('news')}<b>${i.mentions}</b><span>관련 기사</span></div><div>${ic('user')}<b>${i.presses}</b><span>언론사</span></div><div>${ic('chat')}<b>${op?op.total.toLocaleString():'-'}</b><span>댓글</span></div><div>${ic('fire')}<b>${Math.round(i.score)}</b><span>화제도</span></div></div>
    <div class="chips">${i.entities.map(n=>chipE(n)).join('')}${i.keywords.filter(k=>!i.entities.includes(k)).slice(0,4).map(k=>`<span class="chip">#${esc(k)}</span>`).join('')}</div></div></article>
  <nav class="toc"><a href="#s-sum">${ic('news')}요약</a><a href="#s-deep">${ic('book')}깊게 보기</a><a href="#s-flow">${ic('clock')}흐름</a><a href="#s-op">${ic('chat')}여론</a><a href="#s-src">${ic('link')}출처</a></nav>
  <div class="two"><div>
   <section id="s-sum">${sec('한눈에 보기','Summary · 기사 리드문','','news')}<div class="summary">${i.summary.map((s,k)=>`<div class="sl"><b>${k+1}</b><p>${esc(s)}</p></div>`).join('')||'<p>요약을 가져오지 못했어요.</p>'}</div></section>
   <section id="s-deep">${sec('깊게 보기','Deep dive','','book')}
    ${ai.deep?`<div class="card deep">${AIB}<p>${esc(ai.deep)}</p><small>여러 언론사 리드문·보도 흐름을 바탕으로 자동 작성된 요약입니다. 사실관계는 아래 원문으로 확인하세요.</small></div>`:`<div class="card deep">${(i.leads||[]).slice(0,4).map(l=>`<p>${esc(l)}</p>`).join('')}<small>AI 요약이 아직 생성되지 않아 여러 언론사의 리드문을 모아 보여드려요. (하루 1회 심층 분석 시 갱신)</small></div>`}
   </section>
   <section id="s-flow">${sec('이 사건의 흐름','Issue flow · 오늘부터 과거로','','clock')}<div class="flow">${flow||'<div class="note">흐름 데이터가 없어요.</div>'}</div></section>
   ${past}
  </div><aside>
   <section id="s-op">${sec('사람들의 반응','Public opinion','','chat')}${opin}</section>
   ${ents.length?sec('등장 인물·키워드','Who’s who','','user')+`<div class="who">${ents.map(e=>`<a class="card whoc" href="${eh(e.name)}">${av(e,'av s')}<div><b>${esc(e.name)}</b><small>${esc(e.wiki?.desc||TYPE[e.type])}</small></div></a>`).join('')}</div>`:''}
  </aside></div>
  <section id="s-src">${sec('출처','Sources','','link')}
   <ol class="srcl">${i.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> <span>${esc(s.press)} · ${s.portal}${s.kind?' '+esc(s.kind):''}</span>${biasB(s)}${s.bias?`<div class="br">판단 근거: ${esc(s.bias.reason)}</div>`:''}</li>`).join('')}</ol>
   <p class="fine">편향 뱃지는 AI가 기사 제목의 표현·프레이밍만 보고 자동 판단한 것으로, 확신이 높은 경우에만 표시합니다. 언론사 성향으로 단정하지 않으며 틀릴 수 있습니다.</p></section>`;
}

/* ---------- 실시간 키워드 ---------- */
function kw(k){
  const t=D.trends.find(x=>x.keyword===k);if(!t)return today();
  const ai=t.ai||{};const g={};(t.past||[]).forEach(x=>{const y=x.t.slice(0,4);(g[y]=g[y]||[]).push(x)});
  const now=new Date().getFullYear()+'';
  app.innerHTML=`<a class="back" href="#/">← 오늘</a>
  <section class="kwh card" ${bg(t.image||(t.today[0]||{}).img)}><div class="in"><span class="chip event">${ic('fire')}실시간 검색 ${D.trends.indexOf(t)+1}위 · ${esc(t.traffic)}</span><h1>${esc(t.keyword)}</h1></div></section>
  ${sec('오늘 무슨 일이?','Today','','clock')}
  ${ai.today?`<div class="mean big">${AIB}<p>${esc(ai.today)}</p></div>`:''}
  <div class="tgrid">${(t.today||[]).map((x,j)=>`<a class="card tn ${j===0?'first':''}" href="${esc(x.url)}" target="_blank" rel="noopener">${th(x.img,'img')}<div class="bd"><h3>${esc(x.title)}</h3>${x.body?`<p>${esc(x.body.slice(0,90))}…</p>`:''}<small>${esc(x.press)} · ${ago(x.t)}</small></div></a>`).join('')||'<div class="note">오늘 기사를 찾지 못했어요.</div>'}</div>
  ${sec('과거에는 무슨 일이?','Past timeline','','book')}
  ${ai.context?`<div class="mean">${AIB}<p>${esc(ai.context)}</p></div>`:''}
  <div class="flow">${Object.entries(g).sort((a,b)=>b[0]-a[0]).map(([y,a])=>`<div class="fg"><div class="fd"><b>${y===now?'올해':y+'년'}</b><span>기사 ${a.length}건</span></div>${a.slice(0,6).map((x,j)=>`<a class="fe ${j===0?'first':''}" href="${esc(x.url)}" target="_blank" rel="noopener">${th(x.img,'fi')}<div><h5>${esc(x.title)}</h5>${x.body&&j===0?`<p>${esc(x.body.slice(0,100))}…</p>`:''}<small>${esc(x.press)} · ${fmtD(x.t)}</small></div></a>`).join('')}</div>`).join('')}</div>
  <p class="fine">네이버 뉴스 검색(기간별 관련도순)에서 수집했습니다.</p>`;
}

/* ---------- 마켓·정책 섹터 ---------- */
const POLW=/(금리|부동산|아파트|주택|전세|대출|증시|코스피|코스닥|주가|주식|환율|세금|과세|정책|규제|기준금리|한은|한국은행|금통위|공급|청약|재건축|배당|주주|밸류업|연준|Fed)/;
function market(){
  const M=D.market||[],ST=D.stocks||[];
  const idx=M.filter(m=>m.kind==='index'),fx=M.filter(m=>m.kind==='fx'),cm=M.filter(m=>m.kind==='commodity');
  const rel=D.issues.filter(i=>i.category==='경제'||POLW.test(i.title+i.keywords.join(' ')));
  const news=Object.entries(D.sections).flatMap(([k,a])=>a).filter(x=>POLW.test(x.title)).filter((x,i,a)=>a.findIndex(y=>y.title===x.title)===i).slice(0,12);
  const heat=ST.slice().sort((a,b)=>b.cap-a.cap).slice(0,40);const tot=heat.reduce((s,x)=>s+Math.sqrt(x.cap),0);
  const hc=r=>r>=3?'#d93025':r>=1?'#ef6c5a':r>0?'#f5aaa0':r===0?'#c9cede':r>-1?'#a9c1f5':r>-3?'#5d8ef0':'#1f5fd6';
  const low=ST.filter(x=>x.pbr&&x.pbr>0).sort((a,b)=>a.pbr-b.pbr).slice(0,12);
  const at=idx[0]?.at;
  app.innerHTML=`${sec('마켓·정책','Market & Policy',`<span class="more">${at?ago(at)+' 기준':''}</span>`,'chart')}
  <p class="lede">주식·부동산·금리, 그리고 이를 움직이는 정치·정책 뉴스를 한곳에 모았어요.</p>
  <h3 class="sub">${ic('chart')}주요 지수</h3><div class="mkrow wide">${idx.map(m=>mcard(m,1)).join('')}</div>
  <h3 class="sub">${ic('coin')}환율</h3><div class="mkrow">${fx.map(m=>mcard(m)).join('')}</div>
  ${cm.length?`<h3 class="sub">${ic('spark')}원자재·금리·코인 <small>3개월</small></h3><div class="mkrow">${cm.map(m=>mcard(m)).join('')}</div>`:''}
  ${heat.length?`<h3 class="sub">${ic('fire')}코스피 시가총액 상위 40 등락 히트맵</h3><div class="heat">${heat.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener" style="flex:${(Math.sqrt(x.cap)/tot*100).toFixed(2)} 1 0;background:${hc(x.rate)}"><b>${esc(x.name)}</b><span>${x.rate>0?'+':''}${x.rate.toFixed(2)}%</span></a>`).join('')}</div>
  <div class="legend"><span style="--c:#d93025">+3%↑</span><span style="--c:#f5aaa0">상승</span><span style="--c:#a9c1f5">하락</span><span style="--c:#1f5fd6">-3%↓</span></div>`:''}
  ${low.length?`<h3 class="sub">${ic('coin')}PBR 낮은 종목 <small>코스피 시총 상위 60 중 · 저평가 지표 참고용</small></h3>
  <div class="tbl card"><table><thead><tr><th>종목</th><th>현재가</th><th>등락</th><th>PBR</th><th>PER</th><th>배당</th></tr></thead><tbody>${low.map(x=>`<tr><td><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a></td><td>${esc(x.price)}</td><td class="${x.rate>0?'up':x.rate<0?'down':''}">${x.rate>0?'+':''}${x.rate.toFixed(2)}%</td><td><b>${x.pbr.toFixed(2)}</b></td><td>${x.per!=null?x.per.toFixed(1):'-'}</td><td>${x.div!=null?x.div.toFixed(2)+'%':'-'}</td></tr>`).join('')}</tbody></table></div>
  <p class="fine">PBR·PER·배당수익률은 네이버 증권 표시값이며 투자 권유가 아닙니다.</p>`:''}
  ${rel.length?sec('오늘의 경제·정책 이슈','Policy issues','','fire')+`<div class="side">${rel.map(i=>`<a class="card mini" href="#/issue/${i.id}"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><h3>${esc(i.title)}</h3></div></a>`).join('')}</div>`:''}
  ${news.length?sec('금리·부동산·증시 헤드라인','Headlines','','news')+`<div class="srcl2">${news.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}<small>${esc(x.press)} · ${ago(x.time)}</small></a>`).join('')}</div>`:''}
  <p class="fine">지수·환율: 네이버 증권, 원자재·미국채·비트코인: Yahoo Finance. 지연 시세일 수 있습니다. 한국은행 기준금리 등 ECOS 통계는 API 키 등록 후 추가 가능합니다.</p>`;
}

/* ---------- 세로 타임라인 (줌) ---------- */
const ZK={hour:t=>{const d=new Date(t);return`${d.getMonth()+1}월 ${d.getDate()}일 ${d.getHours()}시`},day:t=>{const d=new Date(t);return`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`},month:t=>{const d=new Date(t);return`${d.getFullYear()}년 ${d.getMonth()+1}월`},year:t=>new Date(t).getFullYear()+'년'};
function vtl(el,items,z,limit=4){
  const g=[];items.forEach(x=>{const k=ZK[z](x.t);if(!g.length||g[g.length-1].k!==k)g.push({k,a:[]});g[g.length-1].a.push(x)});
  if(!g.length){el.innerHTML='<div class="note">아직 쌓인 기록이 없어요.</div>';return}
  let shown=Math.min(g.length,z==='year'?20:12);
  const draw=()=>{el.innerHTML=g.slice(0,shown).map(({k,a})=>{const s=a.slice().sort((p,q)=>(q.related||0)-(p.related||0));
    return`<div class="vg"><h4>${k}<span>기사 ${a.length}건</span></h4>${s.slice(0,limit).map((x,j)=>`<a class="ve ${j===0&&x.related>2?'big':''}" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}<small>${esc(x.press)} · ${fmtD(x.t)}${x.related>1?` · 묶음 기사 ${x.related}건`:''}</small></a>`).join('')}</div>`}).join('')+(shown<g.length?`<div class="ve moreb">이전 기록 더 보기 (${g.length-shown}개 구간)</div>`:'');
    const m=el.querySelector('.moreb');if(m)m.onclick=()=>{shown+=12;draw()}};draw();
}
function eraChart(items,z){const fmt=z==='year'?(t=>t.slice(0,4)):(t=>t.slice(0,7));const c={};items.forEach(x=>{const k=fmt(x.t);c[k]=(c[k]||0)+1});
  const ks=Object.keys(c).sort();if(!ks.length)return'';const all=[];let [y,m]=ks[0].split('-').map(Number);const [ey,em]=ks[ks.length-1].split('-').map(Number);
  if(z==='year'){for(let k=y;k<=ey;k++)all.push(String(k))}else{while(y<ey||(y===ey&&m<=em)){all.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){m=1;y++}}}
  const bw=z==='year'?44:16,H=130,mx=Math.max(...Object.values(c));const W=Math.max(all.length*bw+20,300);
  return`<div class="era"><svg width="${W}" height="${H+24}">${all.map((k,i)=>{const v=c[k]||0,h=v/mx*(H-10);return`<rect x="${i*bw+10}" y="${H-h}" width="${bw-4}" height="${h}" rx="3" fill="${v===mx?'#ff4d2e':'#2f6bff'}" opacity="${v?1:.15}"><title>${k}: ${v}건</title></rect>${(z==='year'||k.endsWith('-01'))?`<text x="${i*bw+10}" y="${H+16}">${z==='year'?k:k.slice(0,4)}</text>`:''}`}).join('')}</svg></div>`}

/* ---------- 인물 상세 ---------- */
function entity(n){
  const e=ent(n);if(!e)return people();
  const tl=e.timeline,first=tl.length?tl[tl.length-1].t:null;
  const iss=e.issues.map(id=>D.issues.find(x=>x.id===id)).filter(Boolean);
  app.innerHTML=`<a class="back" href="#/people">← 화제의 인물</a>
  <div class="two"><div>
   <section class="card prof"><div class="row">${av(e)}<div><span class="chip ${e.type}">${TYPE[e.type]}</span><h1>${esc(e.name)}</h1><p>${esc(e.wiki?.desc||'')}</p></div></div>
    ${e.wiki?.extract?`<p>${esc(e.wiki.extract)} ${e.wiki.url?`<a href="${esc(e.wiki.url)}" target="_blank" style="color:var(--blue)">위키백과 ↗</a>`:''}</p>`:''}
    <div class="kpis"><div><b>${e.score}</b><span>오늘 화제도</span></div><div><b>${tl.length}</b><span>수집된 기록</span></div><div><b>${first?new Date(first).getFullYear():'-'}</b><span>가장 오래된 기록</span></div></div></section>
   ${sec('시대별 보도량','Coverage by era','<div class="zoom" id="ez"><button data-z="month" class="on">월</button><button data-z="year">연</button></div>','chart')}
   <div class="card" style="padding:10px 14px" id="era"></div>
   ${sec(esc(e.name)+' 타임라인','Timeline','<div class="zoom" id="tz"><button data-z="hour">시간</button><button data-z="day" class="on">일</button><button data-z="month">월</button><button data-z="year">시대</button></div>','clock')}
   <div class="vt" id="etl"></div>
  </div><aside>
   ${iss.length?sec('오늘 관련 이슈','Today','','fire')+`<div class="side">${iss.map(i=>`<a class="card mini" href="#/issue/${i.id}"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><h3>${esc(i.title)}</h3></div></a>`).join('')}</div>`:''}
   ${e.related.length?sec('함께 언급된','Related','','link')+`<div class="chips">${e.related.map(r=>chipE(r.name)).join('')}</div>`:''}
   ${e.history.length>1?sec('NewsBoard 누적 화제도','Daily score','','chart')+`<div class="card" style="padding:12px">${line(e.history.map(x=>x[1]),300,60,'#2f6bff')}</div>`:'<div class="note">매시간 수집이 누적되면 일자별 화제도 그래프가 이곳에 쌓입니다.</div>'}
  </aside></div>`;
  const drawE=z=>{$('#era').innerHTML=eraChart(tl,z);const x=$('#era .era');if(x)x.scrollLeft=1e5};drawE('month');
  $('#ez').onclick=ev=>{const z=ev.target.dataset.z;if(!z)return;$('#ez').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));drawE(z)};
  const drawT=z=>vtl($('#etl'),z==='hour'?tl.filter(x=>Date.now()-new Date(x.t)<3*864e5):tl,z,z==='year'?6:4);drawT('day');
  $('#tz').onclick=ev=>{const z=ev.target.dataset.z;if(!z)return;$('#tz').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));drawT(z)};
}

/* ---------- 타임라인 비교 ---------- */
function timeline(){
  let sel=D.entities.slice(0,5).map(e=>e.name),z='month';
  app.innerHTML=`${sec('타임라인 비교','Swimlane','','clock')}
  <p class="lede">인물·장소·기관을 골라 같은 시간축 위에 겹쳐 보세요. 원이 클수록 그 시기에 기사가 많았습니다.</p>
  <div class="chips" id="pick" style="margin:14px 0"></div>
  <div class="zoom" id="lz"><button data-z="day">최근 60일</button><button data-z="month" class="on">월(2년)</button><button data-z="year">시대(연)</button></div>
  <div class="card era" id="lanes" style="margin-top:12px;padding:16px"></div>
  ${sec('최신 기록 흐름','Latest','','news')}<div class="vt" id="mix"></div>`;
  const pick=()=>{$('#pick').innerHTML=D.entities.map(e=>`<button class="chip ${sel.includes(e.name)?e.type:'off'}" data-n="${esc(e.name)}">${esc(e.name)}</button>`).join('')};
  const draw=()=>{pick();const now=new Date();let keys,kf;
    if(z==='day'){keys=[...Array(60)].map((_,i)=>new Date(now-(59-i)*864e5).toISOString().slice(0,10));kf=t=>new Date(new Date(t).getTime()+9*36e5).toISOString().slice(0,10)}
    else if(z==='month'){keys=[...Array(24)].map((_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-23+i,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`});kf=t=>t.slice(0,7)}
    else{const y0=Math.min(...D.entities.filter(e=>sel.includes(e.name)).map(e=>e.timeline.length?+e.timeline[e.timeline.length-1].t.slice(0,4):now.getFullYear()));keys=[];for(let y=y0;y<=now.getFullYear();y++)keys.push(String(y));kf=t=>t.slice(0,4)}
    const cw=z==='day'?14:z==='month'?30:48,lw=96,rh=46,W=lw+keys.length*cw+10,es=D.entities.filter(e=>sel.includes(e.name));
    let mx=1;const M=es.map(e=>{const c={};e.timeline.forEach(x=>{const k=kf(x.t);c[k]=(c[k]||0)+1});Object.values(c).forEach(v=>mx=Math.max(mx,v));return c});
    const cols=['#ff4d2e','#2f6bff','#11a683','#7a4dff','#f08a00','#e2448e','#0aa5c8'];
    $('#lanes').innerHTML=`<svg width="${W}" height="${es.length*rh+30}">${keys.map((k,i)=>(z!=='month'||k.endsWith('-01')||i===0)&&(z!=='day'||i%7===0)?`<text x="${lw+i*cw}" y="${es.length*rh+20}">${z==='day'?k.slice(5):z==='month'?k.slice(0,4)+'.'+k.slice(5):k}</text><line x1="${lw+i*cw+cw/2}" x2="${lw+i*cw+cw/2}" y1="0" y2="${es.length*rh}" stroke="#eef0f6"/>`:'').join('')}
    ${es.map((e,r)=>`<a href="${eh(e.name)}"><text x="0" y="${r*rh+rh/2+4}" style="font-size:13px;font-weight:800;fill:#0f1630">${esc(e.name)}</text></a><line x1="${lw}" x2="${W}" y1="${r*rh+rh/2}" y2="${r*rh+rh/2}" stroke="#e6e8ef"/>${keys.map((k,i)=>{const v=M[r][k]||0;return v?`<circle cx="${lw+i*cw+cw/2}" cy="${r*rh+rh/2}" r="${(3+Math.sqrt(v/mx)*(Math.min(cw,rh)/2-3)).toFixed(1)}" fill="${cols[r%7]}" opacity=".8"><title>${esc(e.name)} ${k}: ${v}건</title></circle>`:''}).join('')}`).join('')}</svg>`;
    $('#lanes').scrollLeft=1e5;
    vtl($('#mix'),es.flatMap(e=>e.timeline.slice(0,40).map(x=>({...x,title:`[${e.name}] `+x.title}))).sort((a,b)=>b.t<a.t?-1:1),'day',5)};
  $('#pick').onclick=ev=>{const n=ev.target.dataset.n;if(!n)return;sel=sel.includes(n)?sel.filter(x=>x!==n):[...sel,n].slice(-7);draw()};
  $('#lz').onclick=ev=>{if(!ev.target.dataset.z)return;z=ev.target.dataset.z;$('#lz').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));draw()};
  draw();
}

/* ---------- 화제의 인물 ---------- */
function people(){
  let f='person';
  app.innerHTML=`${sec('화제의 인물·장소','People & Places','','user')}<p class="lede">요즘 뉴스에 많이 오르내리는 대상과 그 히스토리.</p><div class="filters" id="f">${[['person','인물'],['place','장소'],['org','기관·기업'],['all','전체']].map(([k,v])=>`<button data-f="${k}" class="${k===f?'on':''}">${v}</button>`).join('')}</div><div class="plist" id="pg"></div>`;
  const draw=()=>$('#pg').innerHTML=D.entities.filter(e=>f==='all'||e.type===f).map(e=>{const yrs={};e.timeline.forEach(x=>{const y=x.t.slice(0,4);if(!yrs[y])yrs[y]=x});
    return`<a class="card pcard" href="${eh(e.name)}"><div class="ph">${av(e)}<div><span class="chip ${e.type}">${TYPE[e.type]}</span><b>${esc(e.name)}</b><small>${esc(e.wiki?.desc||'')}</small></div></div>${spark(e.daily,300,36)}
    <ol class="mtl">${Object.entries(yrs).sort((a,b)=>b[0]-a[0]).slice(0,4).map(([y,x])=>`<li><b>${y}</b><span>${esc(x.title)}</span></li>`).join('')}</ol><span class="ft">기록 ${e.timeline.length}건 · 타임라인 보기 →</span></a>`}).join('')||'<div class="note">해당 유형이 오늘은 없어요.</div>';
  $('#f').onclick=ev=>{if(!ev.target.dataset.f)return;f=ev.target.dataset.f;$('#f').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));draw()};draw();
}

/* ---------- 관계맵 ---------- */
function map(){
  app.innerHTML=`${sec('키워드 관계맵','Relation map','','link')}<p class="lede">오늘의 이슈(사각형)와 인물·장소·기관(원)이 같은 기사에 함께 등장하면 선으로 이어집니다. 노드를 끌어보고, 눌러서 상세로 이동하세요.</p>
  <div class="legend"><span style="--c:#ff4d2e">인물</span><span style="--c:#11a683">장소</span><span style="--c:#7a4dff">기관·기업</span><span style="--c:#ffb020">키워드</span><span style="--c:#0f1630">이슈</span></div>
  <div class="card mapwrap" id="mapbig"></div>`;graph($('#mapbig'),false);
}
function graph(el,mini){
  const W=el.clientWidth,H=el.clientHeight,col={person:'#ff4d2e',place:'#11a683',org:'#7a4dff',event:'#ffb020'};
  const N=[],idx={},E=[];
  D.entities.forEach(e=>{idx[e.name]=N.length;N.push({id:e.name,t:e.type,r:8+Math.sqrt(e.score)/1.6,href:eh(e.name),img:e.wiki&&e.wiki.thumb})});
  D.issues.filter(vis).forEach(i=>{idx[i.id]=N.length;N.push({id:i.id,label:i.rank+'위 '+i.keywords.slice(0,2).join('·'),t:'issue',r:14,href:'#/issue/'+i.id});i.entities.forEach(n=>{if(n in idx)E.push([idx[i.id],idx[n],3])})});
  D.links.forEach(l=>{if(l.a in idx&&l.b in idx)E.push([idx[l.a],idx[l.b],l.n])});
  N.forEach((n,i)=>{const a=i/N.length*6.283;n.x=W/2+Math.cos(a)*W/3;n.y=H/2+Math.sin(a)*H/3;n.vx=n.vy=0});
  const NS='http://www.w3.org/2000/svg';el.innerHTML=`<svg viewBox="0 0 ${W} ${H}"><defs>${N.map((n,i)=>n.img?`<pattern id="p${i}" width="1" height="1" patternContentUnits="objectBoundingBox"><image href="${esc(n.img)}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern>`:'').join('')}</defs><g class="ed"></g><g class="nd"></g></svg>`;
  const svg=el.querySelector('svg'),ge=svg.querySelector('.ed'),gn=svg.querySelector('.nd');
  const lines=E.map(([a,b,w])=>{const l=document.createElementNS(NS,'line');l.setAttribute('stroke','#c9cede');l.setAttribute('stroke-width',Math.min(4,.6+w*.4));ge.appendChild(l);return l});
  const nodes=N.map((n,i)=>{const g=document.createElementNS(NS,'g');g.setAttribute('class','node');g.style.cursor='pointer';
    g.innerHTML=n.t==='issue'?`<rect x="${-n.r}" y="${-n.r*.7}" width="${n.r*2}" height="${n.r*1.4}" rx="5" fill="#0f1630"/><text y="${n.r+12}" text-anchor="middle" style="fill:#3b4361;font-size:${mini?10:11}px">${esc(n.label)}</text>`:`<circle r="${n.r}" fill="${n.img?`url(#p${i})`:col[n.t]}" stroke="${col[n.t]}" stroke-width="3"/><text y="${n.r+13}" text-anchor="middle">${esc(n.id)}</text>`;
    gn.appendChild(g);return g});
  let drag=null,moved=false,alpha=1;
  const tick=()=>{for(let i=0;i<N.length;i++){const a=N[i];for(let j=i+1;j<N.length;j++){const b=N[j];let dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy+.01;const f=(mini?1400:2600)/d2;a.vx+=dx*f/40;a.vy+=dy*f/40;b.vx-=dx*f/40;b.vy-=dy*f/40}}
    E.forEach(([i,j])=>{const a=N[i],b=N[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1,f=(d-(mini?70:110))*.012;a.vx+=dx/d*f*d/10;a.vy+=dy/d*f*d/10;b.vx-=dx/d*f*d/10;b.vy-=dy/d*f*d/10});
    N.forEach(n=>{if(n===drag)return;n.vx+=(W/2-n.x)*.004;n.vy+=(H/2-n.y)*.004;n.x+=n.vx*alpha;n.y+=n.vy*alpha;n.vx*=.55;n.vy*=.55;n.x=Math.max(n.r+4,Math.min(W-n.r-4,n.x));n.y=Math.max(n.r+4,Math.min(H-n.r-18,n.y))});
    E.forEach(([i,j],k)=>{lines[k].setAttribute('x1',N[i].x);lines[k].setAttribute('y1',N[i].y);lines[k].setAttribute('x2',N[j].x);lines[k].setAttribute('y2',N[j].y)});
    nodes.forEach((g,i)=>g.setAttribute('transform',`translate(${N[i].x.toFixed(1)},${N[i].y.toFixed(1)})`));
    alpha*=.985;if(alpha>.02&&document.body.contains(el))requestAnimationFrame(tick)};tick();
  const pt=ev=>{const r=svg.getBoundingClientRect();return[(ev.clientX-r.left)*W/r.width,(ev.clientY-r.top)*H/r.height]};
  nodes.forEach((g,i)=>{g.addEventListener('pointerdown',ev=>{drag=N[i];moved=false;svg.setPointerCapture(ev.pointerId)})});
  svg.addEventListener('pointermove',ev=>{if(!drag)return;moved=true;[drag.x,drag.y]=pt(ev);if(alpha<.3){alpha=.3;tick()}});
  svg.addEventListener('pointerup',()=>{if(drag&&!moved)location.hash=drag.href;drag=null});
}

/* ---------- 아카이브 ---------- */
async function archive(){
  app.innerHTML=`${sec('날짜별 아카이브','Archive','','clock')}<div class="days" id="days"></div><div class="alist" id="al"></div><div class="note">매시간 수집·분석 결과가 날짜별로 영구 저장되고, 새 이슈가 들어오면 같은 인물·키워드의 과거 사건과 자동으로 연결됩니다.</div>`;
  let idx=[];try{idx=await (await fetch('data/archive/index.json?'+Date.now())).json()}catch(e){}
  const show=async d=>{document.querySelectorAll('#days button').forEach(b=>b.classList.toggle('on',b.dataset.d===d));
    const a=CACHE[d]||(CACHE[d]=await (await fetch(`data/archive/${d}.json`)).json());
    $('#al').innerHTML=a.issues.map(i=>`<a class="card mini" href="${esc(i.url)}" target="_blank" rel="noopener"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><h3>${esc(i.title)}</h3><div class="m">${esc(i.press)} · 언론사 ${i.presses}곳${i.comment_total?' · 댓글 '+i.comment_total.toLocaleString():''}</div></div></a>`).join('')};
  $('#days').innerHTML=idx.map(d=>{const t=new Date(d+'T12:00:00+09:00');return`<button data-d="${d}"><span>${t.getFullYear()}.${t.getMonth()+1}</span><b>${t.getDate()}</b><span>${'일월화수목금토'[t.getDay()]}</span></button>`}).join('');
  $('#days').onclick=ev=>{const b=ev.target.closest('button');if(b)show(b.dataset.d)};if(idx[0])show(idx[0]);
}

/* ---------- 설정 ---------- */
function settings(){
  const draw=()=>{app.innerHTML=`${sec('설정','Settings','','gear')}
  <div class="card setc"><h3>보고 싶은 카테고리</h3><p class="fine">끈 카테고리는 TOP10·관계맵에서 숨겨요. 이 기기에만 저장됩니다.</p>
   <div class="toggles">${CATS.map(c=>`<label class="tg"><input type="checkbox" data-c="${c}" ${S.hide.includes(c)?'':'checked'}><span style="--c:${CATC[c]}">${ic(c)}${c}</span></label>`).join('')}</div></div>
  <div class="card setc"><h3>글자 크기</h3><div class="fsr"><button data-fs="-">가−</button><b>${S.fs}%</b><button data-fs="+">가+</button><button data-fs="0" class="ghost">기본</button></div><p class="fsprev">가나다 미리보기 — 오늘의 이슈를 따라가는 가장 쉬운 방법.</p></div>
  <div class="card setc"><h3>AI 분석 상태</h3><p class="fine">${D.llm&&D.llm.enabled?`모델 ${esc(D.llm.model)} (${esc(D.llm.endpoint||'')}) · 이번 수집 호출 ${D.llm.calls}회${D.llm.errors.length?' · 오류: '+esc(D.llm.errors[0]):''}`:'AI 분석이 꺼져 있어요(API 키 미설정). 지금 보이는 요약·흐름은 기사 원문에서 그대로 추출한 내용입니다.'}</p></div>`;
  app.querySelectorAll('[data-c]').forEach(x=>x.onchange=()=>{const c=x.dataset.c;S.hide=x.checked?S.hide.filter(y=>y!==c):[...S.hide,c];saveS()});
  app.querySelectorAll('[data-fs]').forEach(x=>x.onclick=()=>{const v=x.dataset.fs;S.fs=v==='0'?100:Math.max(85,Math.min(130,S.fs+(v==='+'?5:-5)));saveS();draw()})};draw();
}
load().catch(e=>app.innerHTML=`<div class="loading">데이터를 불러오지 못했어요 (${esc(e.message)})</div>`);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
