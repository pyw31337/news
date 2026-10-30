/* 관리자 현황판 메뉴별 화면 — data/stats_detail.json(scripts/stats_detail.py) + data/stats.json + 독자 반응(Worker /ev/stats)
   뉴스 기사 · 인물 · 장소·기업·사건 · 카드뉴스·놀이·민심 · AI·봇 · 수집 일정 · 독자 반응 */
(function(){
const B=()=>window.NBD;const EVS='https://newsboard-sync.pyw213.workers.dev/ev/stats';
let SD=null,ST=null;
const get=async()=>{if(!SD)SD=await (await fetch('../data/stats_detail.json',{cache:'no-store'})).json();if(!ST)try{ST=await (await fetch('../data/stats.json',{cache:'no-store'})).json()}catch(e){ST={}}return SD};
// 가로 막대 순위 목록
function hl(rows,o={}){const{E,N}=B();if(!rows||!rows.length)return'<p class="mute">기록 없음</p>';const mx=Math.max(1,...rows.map(r=>+r[1]||0));
  return`<ol class="hl">${rows.slice(0,o.n||15).map((r,i)=>`<li><span class="r">${i+1}</span><span class="t" title="${E(r[0])}">${o.link&&r[2]?`<a href="${E(r[2])}" target="_blank" rel="noopener">${E(r[0])}</a>`:E(r[0])}${o.sub&&r[3]?`<small>${E(r[3])}</small>`:''}</span><i style="width:${(+r[1]||0)/mx*100}%;${o.col?`background:${o.col}`:''}"></i><b>${N(r[1])}</b></li>`).join('')}</ol>`}
// 단계 깔때기
function funnel(F){const{E,N}=B();const mx=Math.max(1,...F.map(x=>+x[1]||0));
  return`<div class="fn">${F.map(([l,v,s],i)=>`<div class="fr"><span class="fl">${E(l)}<small>${E(s||'')}</small></span><div class="fb"><i style="width:${v==null?0:Math.max(2,Math.sqrt((+v)/mx)*100)}%;background:hsl(${222-i*14} 80% ${52+i*3}%)"></i><b>${N(v)}</b></div></div>`).join('')}</div>`}
// 날짜×시간 칸 그림
function heat(rows){const{E,md}=B();const mx=Math.max(1,...rows.flatMap(r=>r[1]));
  return`<div class="hm"><div class="hmh"><span></span>${Array.from({length:24},(_,h)=>`<span>${h%3?'':h}</span>`).join('')}</div>${rows.map(([d,a])=>`<div class="hmr"><span>${E(md(d))}</span>${a.map((v,h)=>`<i style="opacity:${v?0.18+v/mx*.82:1};${v?'':'background:#f1f3f8'}" data-t="${E(md(d))} ${h}시 · 실행 ${v}회"></i>`).join('')}</div>`).join('')}</div>`}
const kpi=(l,v,s='')=>`<div class="card kpi"><span class="l">${l}</span><b>${v}</b><small>${s}</small></div>`;
const sec=(t,s='')=>`<h2>${t}${s?` <small>${s}</small>`:''}</h2>`;
const ck=v=>v?'<span class="ck y">●</span>':'<span class="ck">○</span>';
const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
const R={
async news(el){const{E,N,K,bars,stackBars,stack,tog}=B();const S=await get(),n=S.news,kr=n.kr,g=n.glob,sm=n.summary,L=n.links,T=(ST&&ST.categories)||{};
  const kt=kr.daily.at(-1)[1],gt=g.daily.at(-1)[1],pn=kr.press_n.at(-1)[1];
  return`${sec('뉴스 기사 현황',`${E(String(S.updated).replace('T',' '))} 기준`)}
  <div class="kpis">${kpi('오늘 국내 수집',N(kt)+'건',`언론사 ${N(pn)}곳 · 수집 ${N(kr.files_today)}회`)}${kpi('오늘 해외 수집',N(gt)+'건',`번역된 이슈 ${N(g.translated)}/${N(g.issues)}`)}
   ${kpi('중복 빼고 고유 기사',N(sm.unique),`같은 내용 ${N(sm.dupe_in)}건 → ${N(sm.dupe_groups)}묶음`)}${kpi('오늘의 이슈',N(sm.issues)+'개',`출처 기사 ${N(sm.sources)}건으로 요약`)}
   ${kpi('AI 분석',N(n.issues.filter(i=>i.ai).length)+'/'+N(n.issues.length),`깊게 보기 ${N(n.issues.filter(i=>i.deep).length)} · 여론 ${N(n.issues.filter(i=>i.opinion).length)}`)}
   ${kpi('최근 30일 국내 누적',K(kr.daily.reduce((s,x)=>s+x[1],0))+'건',`해외 ${K(g.daily.reduce((s,x)=>s+x[1],0))}건`)}</div>
  ${sec('오늘 처리 단계','수집 → 같은 내용 묶기 → 이슈 후보 → TOP 10 → 분석')}<section class="card">${funnel(n.funnel)}</section>
  <div class="grid2"><section class="card"><h3>요약 — 몇 건을 몇 개로</h3><ul class="sumL">
    <li><b>${N(sm.kr_today)}</b>건 수집 → 같은 내용 <b>${N(sm.dupe_in)}</b>건을 <b>${N(sm.dupe_groups)}</b>개 묶음으로 합쳐 고유 <b>${N(sm.unique)}</b>건</li>
    <li>출처 기사 <b>${N(sm.sources)}</b>건 + 날짜별 보도 <b>${N(sm.timeline)}</b>건 → 오늘의 이슈 <b>${N(sm.issues)}</b>개 요약(리드 문장 ${N(sm.leads)}개 사용)</li>
    <li>요약률: 기사 <b>${sm.kr_today&&sm.issues?Math.round(sm.kr_today/sm.issues):'—'}</b>건당 이슈 1개</li></ul></section>
   <section class="card"><h3>연계 — 무엇과 이어 붙였나 <small>오늘의 이슈 10개 합계</small></h3><div class="lkg">
    ${[['화제 대상(인물·기업·장소)',L.entities],['핵심 키워드',L.keywords],['과거 사건 연결',L.past],['사진',L.gallery],['사건 흐름(날짜)',L.flow_days],['댓글 여론 분석',L.opinion],['관련 링크',L.related],['검색어와 연결',L.trends_linked]].map(([l,v])=>`<div><b>${N(v)}</b><small>${l}</small></div>`).join('')}</div></section></div>
  ${sec('국내 기사 추이',`${tog()} 출처별 · 섹션별`)}
  <div class="grid2"><section class="card"><h3>날짜별 수집량</h3>${bars(kr.daily,{h:110,unit:'건'})}</section>
   <section class="card"><h3>출처별 <small>네이버 많이 본·댓글 많은·구글뉴스</small></h3>${stackBars(kr.kinds,{h:110})}</section>
   <section class="card"><h3>섹션별</h3>${stackBars(T.daily_sections,{h:110})}</section>
   <section class="card"><h3>날짜별 기사를 낸 언론사 수</h3>${bars(kr.press_n,{h:110,unit:'곳',col:'#0f1630'})}</section></div>
  <section class="card"><h3>오늘 수집 회차별 새 기사 <small>30분마다</small></h3>${bars(kr.hours_today.map(([t,v])=>[t,v]),{h:80,unit:'건',today:false,lab:t=>t.slice(0,2)+':'+t.slice(2)})}</section>
  <div class="grid2"><section class="card"><h3>오늘 기사 많은 언론사</h3>${hl(kr.press_today)}</section><section class="card"><h3>최근 7일 기사 많은 언론사</h3>${hl(kr.press_7d,{col:'#11a683'})}</section></div>
  ${sec('해외 기사',tog())}
  <div class="grid2"><section class="card"><h3>날짜별 수집량</h3>${bars(g.daily,{h:110,unit:'건',col:'#7a4dff'})}</section><section class="card"><h3>분류별</h3>${stackBars(g.kinds,{h:110})}</section>
   <section class="card"><h3>오늘 매체별</h3>${hl(g.press_today,{col:'#7a4dff'})}</section><section class="card"><h3>오늘 분류</h3>${stack(g.cat_today)}<p class="fine">해외 이슈 ${N(g.issues)}개 · 번역 ${N(g.translated)}개 · 해외 검색어 ${N(g.trends)}개</p></section></div>
  ${sec('오늘의 이슈별 처리 내역','● 완료 ○ 아직')}
  <section class="card scroll"><table class="tbl iss"><thead><tr><th>#</th><th>이슈</th><th>분류</th><th class="n">언론사</th><th class="n">출처</th><th class="n">날짜별 보도</th><th class="n">언급</th><th class="n">사진</th><th class="n">흐름</th><th class="n">연결</th><th>요약</th><th>AI</th><th>깊게</th><th>여론</th><th>출처 구성</th></tr></thead><tbody>
   ${n.issues.map(i=>`<tr><td class="n">${i.rank}</td><td class="w"><a href="../issue/${E(i.id)}" target="_blank" rel="noopener">${E(i.title)}</a></td><td>${E(i.cat)}<small class="mute">${i.conf!=null?Math.round(i.conf*100)+'%':''}</small></td><td class="n">${N(i.presses)}</td><td class="n">${N(i.sources)}</td><td class="n">${N(i.timeline)}</td><td class="n">${N(i.mentions)}</td><td class="n">${N(i.gallery)}</td><td class="n">${N(i.flow)}</td><td class="n">${N(i.ents+i.past)}</td><td>${ck(i.summary)}</td><td>${ck(i.ai)}</td><td>${ck(i.deep)}</td><td>${ck(i.opinion)}</td><td style="min-width:110px">${stack(i.kinds,8).replace(/<div class="lg">[\s\S]*$/,'')}</td></tr>`).join('')}</tbody></table></section>
  ${sec('지난 30일 TOP 10 처리',tog())}<section class="card"><h3>날짜별 AI가 분석한 이슈 수 <small>회색 = 과거 복원 날짜(실시간 수집 전)</small></h3>${bars(n.archive.map(([d,,a])=>[d,a]),{h:90,unit:'개',col:'#ff4d2e',avg:false})}
   <h3 style="margin-top:12px">날짜별 이슈에 붙인 출처 기사 수</h3>${bars(n.archive.map(([d,,,s])=>[d,s]),{h:90,unit:'건',avg:false})}</section>`},
async people(el){const{E,N,K,bars,stack,tog}=B();const S=await get(),P=S.people;
  return`${sec('인물 현황',`${E(String(S.updated).replace('T',' '))} 기준`)}
  <div class="kpis">${kpi('타임라인이 생긴 인물',N(P.total)+'명',`명부 ${N(P.registry)}명 중 ${pct(P.total,P.registry)}`)}${kpi('기사↔인물 연결',N(P.mentions)+'회','누적 언급')}
   ${kpi('오늘 언급된 인물',N(P.active_daily.at(-1)[1])+'명',`처음 등장 ${N(P.new_daily.at(-1)[1])}명`)}${kpi('뉴스에서 새로 찾은 인물',N(P.discovered)+'명',`후보 ${N(P.candidates)}명 검토`)}
   ${P.politicians?kpi('정치인 DB',N(P.politicians.count)+'명',`현직 ${N(P.politicians.current)} · 법안 ${K(P.politicians.bills)}`):''}${kpi('오늘 기자 프로필',N(P.reporters.length)+'명','')}</div>
  <div class="grid2"><section class="card"><h3>인물 명부 구성 <small>분야별</small></h3>${stack(P.by_kind)}</section><section class="card"><h3>타임라인 인물 분야</h3>${stack(P.by_field)}</section></div>
  ${sec('날짜별 추이',tog())}<div class="grid2"><section class="card"><h3>날짜별 언급된 인물 수</h3>${bars(P.active_daily,{h:100,unit:'명'})}</section><section class="card"><h3>날짜별 처음 등장한 인물</h3>${bars(P.new_daily,{h:100,unit:'명',col:'#11a683'})}</section></div>
  <div class="grid2"><section class="card"><h3>가장 많이 언급된 인물 <small>누적</small></h3>${hl(P.top.map(x=>[x[0],x[1],null,[x[2],x[3]].filter(Boolean).join(' · ')]),{n:25,sub:1})}</section>
   <section class="card scroll"><h3>최근 언급된 인물</h3><table class="tbl"><thead><tr><th>이름</th><th>분야</th><th class="n">누적</th><th>마지막</th></tr></thead><tbody>${P.recent.map(x=>`<tr><td>${E(x[0])}</td><td>${E(x[2]||'')}</td><td class="n">${N(x[1])}</td><td>${E(x[3]||'')}</td></tr>`).join('')}</tbody></table></section></div>
  ${P.reporters.length?`<section class="card"><h3>오늘 기자</h3>${hl(P.reporters.map(r=>[r[0],r[2]||1,null,r[1]]),{sub:1,n:30})}</section>`:''}`},
async ents(el){const{E,N,bars,stack,tog}=B();const S=await get(),X=S.entities;
  return`${sec('장소·기업·사건 현황','오늘 화제 대상과 누적 DB')}
  <div class="kpis">${kpi('화제 대상 DB',N(X.total)+'개',`연결 기사 ${N(X.articles)}건`)}${Object.entries(X.by_type).map(([k,v])=>kpi(E(k),N(v)+'개','')).join('')}${kpi('오늘 화제 대상',N(X.today.length)+'개',`사진·로고 ${N(X.today.filter(x=>x[3]).length)}개 확보`)}${kpi('과거 기사로 채운 대상',N(X.backfilled)+'개','')}</div>
  <section class="card"><h3>종류별 구성</h3>${stack(X.by_type)}</section>
  ${sec('날짜별 추이',tog())}<div class="grid2"><section class="card"><h3>날짜별 마지막으로 화제가 된 대상</h3>${bars(X.seen_daily,{h:100,unit:'개'})}</section><section class="card"><h3>날짜별 처음 기록된 대상</h3>${bars(X.new_daily,{h:100,unit:'개',col:'#11a683'})}</section></div>
  <div class="grid2"><section class="card"><h3>연결 기사가 가장 많은 대상</h3>${hl(X.top.map(x=>[x[0],x[2],null,`${x[1]} · ${x[3]||''}부터`]),{n:25,sub:1})}</section>
   <section class="card scroll"><h3>오늘의 화제 대상</h3><table class="tbl"><thead><tr><th>이름</th><th>종류</th><th class="n">화제 점수</th><th>사진</th><th>설명</th></tr></thead><tbody>${X.today.map(x=>`<tr><td><b>${E(x[0])}</b></td><td>${E(x[1])}</td><td class="n">${N(x[2])}</td><td>${ck(x[3])}</td><td class="w"><small>${E(x[4]||'')}</small></td></tr>`).join('')}</tbody></table></section></div>`},
async content(el){const{E,N,stackBars,stack,tog}=B();const S=await get(),C=S.content,F=C.fun_today,V=C.voice;
  return`${sec('카드뉴스·놀이·민심 현황')}
  <div class="kpis">${kpi('오늘 카드뉴스',N(F.decks)+'묶음',`카드 ${N(F.cards)}장`)}${kpi('오늘 만평',N(F.comics)+'편','')}${kpi('오늘 퀴즈',N(F.quiz)+'개','')}${kpi('놀이 콘텐츠 누적',N(C.fun_days)+'일','날짜별 보관')}
   ${kpi('민심 글',N(V.posts)+'개',`이슈 ${N(V.issues)}개 · AI 분석 ${N(V.ai)}개`)}${kpi('관련 영상',N(V.videos)+'개','')}${kpi('오늘의 단어',N(C.words)+'개',`검색어 ${N(C.trends)} · 해외 ${N(C.trends_foreign)}`)}</div>
  ${C.quiz?`${sec('오늘의 OX 문제 누적','레벨별 · 국내/해외 · AI/규칙')}<div class="kpis">${kpi('누적 문제',N(C.quiz.total)+'개',`${N(C.quiz.days)}일 동안`)}${kpi('오늘 문제',N(C.quiz.today)+'개',`국내 ${N(C.quiz.by_scope.kr)} · 해외 ${N(C.quiz.by_scope.global)}`)}${kpi('레벨별(오늘)',`${N(C.quiz.by_level['1'])}·${N(C.quiz.by_level['2'])}·${N(C.quiz.by_level['3'])}`,'기초·중급·고급')}${kpi('썸네일 있는 문제',N(C.quiz.with_img)+'개','근거 이슈 사진')}</div>
   <div class="grid2"><section class="card"><h3>날짜별 만든 문제</h3>${B().bars(C.quiz.daily,{h:90,unit:'개'})}</section><section class="card"><h3>그중 AI가 만든 문제</h3>${B().bars(C.quiz.ai_daily,{h:90,unit:'개',col:'#ff4d2e'})}</section></div>`:''}
  ${C.social?`${sec('해외 SNS 수집','트루스소셜 아카이브 · 블루스카이 공개 API')}<div class="kpis">${kpi('지금 보여 주는 글',N(C.social.posts)+'개',`트루스소셜 ${N(C.social.by_net.truth)} · 블루스카이 ${N(C.social.by_net.bluesky)}`)}${kpi('계정',N(C.social.accounts.length)+'개',E(C.social.accounts.slice(0,4).join(', ')))}</div>`:''}
  ${sec('날짜별 만든 콘텐츠',tog())}<section class="card">${stackBars(C.fun_daily.map(([d,x])=>[d,{카드뉴스:x.cards||0,만평:x.comics||0,퀴즈:x.quiz||0}]),{h:110})}</section>
  <div class="grid2"><section class="card"><h3>오늘의 카드뉴스</h3>${hl(C.decks.map(d=>[d[0]||'카드뉴스',d[1]]),{col:'#e2448e'})}</section>
   <section class="card"><h3>민심 — 플랫폼별 글 <small>${E(String(V.updated||'').slice(0,16).replace('T',' '))}</small></h3>${stack(Object.fromEntries(Object.entries(V.by_platform).map(([k,v])=>[{blog:'네이버 블로그',cafe:'네이버 카페',tistory:'티스토리',daumblog:'다음 블로그',daumcafe:'다음 카페'}[k]||k,v])))}</section></div>
  <section class="card scroll"><h3>이슈별 민심 수집</h3><table class="tbl"><thead><tr><th>이슈</th><th class="n">글</th><th class="n">영상</th><th>AI 분석</th><th>플랫폼</th></tr></thead><tbody>${V.rows.map(r=>`<tr><td class="w">${E(r[0])}</td><td class="n">${N(r[1])}</td><td class="n">${N(r[2])}</td><td>${ck(r[3])}</td><td style="min-width:120px">${stack(r[4],8).replace(/<div class="lg">[\s\S]*$/,'')}</td></tr>`).join('')}</tbody></table></section>`},
async ai(el){const{E,N,AGO,bars,stackBars,tog,aik}=B();const S=await get(),A=(ST&&ST.ai)||{},Lc=S.local;
  const live=b=>b.live?`<span class="mute">7일 ${N(b.live.runs)}회 · 성공 ${N(b.live.ok)} · 실패 <b class="${b.live.fail?'bad':''}">${N(b.live.fail)}</b>${b.live.cancel?` · 취소 ${N(b.live.cancel)}`:''}${b.live.avg_min?` · 평균 ${b.live.avg_min}분`:''}</span>`:'';
  const lv=b=>{const l=b.live&&b.live.last;if(l)return l.status!=='completed'?['run','실행 중']:l.conclusion==='success'?['ok','정상']:['bad','실패'];if(b.age_h==null)return['','—'];return b.age_h<30?['ok','정상']:b.age_h<72?['warn','늦음']:['bad','멈춤 의심']};
  return`${sec('AI 분석',`${tog()} 실행처·엔진별`)}
  <div class="kpis">${kpi('오늘 AI 분석',N(A.today)+'회','')}${kpi('최근 7일',N(A.d7)+'회',`실패 ${N(A.fail7)} · 다시 씀 ${N(A.reused7)}`)}${kpi('누적',N(A.total)+'회','')}${kpi('보관 중인 분석 결과',N(A.stored_total)+'건','')}
   ${kpi('로컬 AI(맥미니)',Lc.overlay.updated?AGO(((Date.now()-new Date(Lc.overlay.updated))/36e5))+' 분석':'기록 없음',`이슈 ${N(Lc.overlay.issues)} · 검색어 ${N(Lc.overlay.trends)} · 용어 ${N(Lc.overlay.words)} · 사이트 반영 ${N(Lc.overlay.matched)}`)}</div>
  <div class="grid2"><section class="card"><h3>날짜별 AI 분석 <small>모든 AI</small></h3>${bars(A.daily||[],{h:100,unit:'회',col:'#ff4d2e'})}</section>
   <section class="card"><h3>로컬 AI(맥미니) 날짜별 업무 <small>Apple 온디바이스 모델 · 매일 03:30</small></h3>${stackBars(Lc.overlay.daily.map(([d,x])=>[d,{'이슈 분석':x.issues||0,'검색어':x.trends||0,'용어':x.words||0}]),{h:100})}</section></div>
  ${(A.engines||[]).map(e=>`<section class="card"><h3>${E(e.name)} <small>${E(e.engine)} · 오늘 ${N(e.today)} · 7일 ${N(e.d7)} · 누적 ${N(e.total)}</small></h3>
    <div class="grid2"><div>${bars(e.daily,{h:70,unit:'회',col:'#ff4d2e'})}</div><div>${Object.keys(e.kinds7||{}).length?hl(Object.entries(e.kinds7).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[aik(k),v]),{col:'#ff4d2e'}):'<p class="fine">작업별 기록이 쌓이는 중이에요</p>'}</div></div></section>`).join('')}
  ${sec('봇·자동 작업','누가 · 어디서 · 언제 · 무엇을 · 어디에 저장 · 최근 실행')}
  <section class="card scroll"><table class="tbl bots"><thead><tr><th>작업</th><th>어디서</th><th>언제</th><th>하는 일</th><th>저장</th><th>상태</th></tr></thead><tbody>${S.bots.map(b=>{const l=lv(b);return`<tr><td><b>${E(b.name)}</b></td><td>${E(b.where)}</td><td><small>${E(b.when)}</small></td><td class="w"><small>${E(b.what)}</small></td><td><small class="mute">${E(b.out)}</small></td><td><span class="dot ${l[0]}"></span>${l[1]}<br><small class="mute">${b.age_h!=null?'갱신 '+AGO(b.age_h):''}</small>${live(b)}</td></tr>`}).join('')}</tbody></table></section>
  <div class="grid2"><section class="card"><h3>맥미니가 하는 일 — 최근 결과</h3><table class="tbl">
   <tr><th>로컬 AI 분석</th><td>${E(String(Lc.overlay.updated||'—').slice(0,16).replace('T',' '))} · 이슈 ${N(Lc.overlay.issues)} · 흐름 ${N(Lc.overlay.flows)} · 검색어 ${N(Lc.overlay.trends)} · 용어 ${N(Lc.overlay.words)}</td></tr>
   <tr><th>보도자료</th><td>${E(Lc.briefs.source||'—')} · ${N(Lc.briefs.items)}건 · ${E(String(Lc.briefs.updated||'').slice(0,16).replace('T',' '))}</td></tr>
   <tr><th>아파트 실거래</th><td>${N(Lc.apt.rows)}건 · ${E(String(Lc.apt.updated||'—').slice(0,16).replace('T',' '))}</td></tr>
   <tr><th>지진·특보</th><td>지진 ${N(Lc.alerts.quakes)} · 특보 ${N(Lc.alerts.warnings)} · ${E(String(Lc.alerts.updated||'—').slice(0,16).replace('T',' '))}</td></tr>
   ${Object.entries(Lc.ai||{}).map(([k,v])=>`<tr><th>${E(k)}</th><td>오늘 ${N(v.today)}회 · 누적 ${N(v.calls)}회</td></tr>`).join('')}</table></section>
   <section class="card"><h3>클라우드 봇(GitHub Actions) 최근 7일 실행</h3>${hl(S.schedule.workflows.filter(w=>w.live&&w.live.runs).map(w=>[w.name,w.live.runs,null,`성공 ${w.live.ok} · 실패 ${w.live.fail}${w.live.cancel?` · 취소 ${w.live.cancel}`:''}${w.live.avg_min?` · 평균 ${w.live.avg_min}분`:''}`]),{sub:1,col:'#0f1630'})}</section></div>`},
async sched(el){const{E,N,bars,tog,md}=B();const S=await get(),C=S.schedule,R=C.runs,last=R.at(-1)||{};
  const r24=R.filter(r=>Date.now()-new Date(r.at)<864e5),art=r=>(r.naver||0)+(r.google||0);
  const t=s=>new Date(s).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
  const cr=c=>{const m=c.split(' ');return m.length>=5?`${m[0]}분 ${m[1]}시 ${m[4]!=='*'?'요일 '+m[4]:''}`:c};
  return`${sec('수집 일정과 회차별 수집량','회차마다 언제 돌아서 몇 건을 모았나')}
  <div class="kpis">${kpi('최근 24시간 수집',N(r24.length)+'회','목표 48회')}${kpi('마지막 회차',last.at?t(last.at):'—',`네이버 ${N(last.naver)} · 구글 ${N(last.google)} · 해외 ${N(last.glob)}`)}
   ${kpi('24시간 모은 기사',N(r24.reduce((s,r)=>s+art(r),0))+'건','회차별 수집 기사 합(중복 포함)')}${kpi('실패한 소스(24시간)',N(r24.reduce((s,r)=>s+(r.fail||0),0))+'건',`성공 ${N(r24.reduce((s,r)=>s+(r.ok||0),0))}건`)}</div>
  <section class="card"><h3>최근 회차별 수집 기사 <small>네이버+구글 · 마지막 96회</small></h3>${bars(R.slice(-96).map(r=>[r.at,art(r)]),{h:110,unit:'건',today:false,lab:t})}</section>
  <section class="card"><h3>날짜×시간 수집 실행 <small>최근 14일 · 진할수록 많이 실행</small></h3>${heat(C.heat)}</section>
  <section class="card scroll"><h3>회차별 기록 <small>최근 48회</small></h3><table class="tbl"><thead><tr><th>시각</th><th>방식</th><th class="n">네이버</th><th class="n">구글</th><th class="n">이슈 후보</th><th class="n">언론사</th><th class="n">해외</th><th class="n">이슈</th><th class="n">화제 대상</th><th class="n">AI</th><th class="n">성공</th><th class="n">실패</th></tr></thead><tbody>
   ${R.slice(-48).reverse().map(r=>`<tr><td class="n">${t(r.at)}</td><td><small>${E({schedule:'정기',workflow_dispatch:'수동'}[r.ev]||r.ev||'')}</small></td><td class="n">${N(r.naver)}</td><td class="n">${N(r.google)}</td><td class="n">${N(r.clusters)}</td><td class="n">${N(r.presses)}</td><td class="n">${N(r.glob)}</td><td class="n">${N(r.issues)}</td><td class="n">${N(r.entities)}</td><td class="n">${N(r.ai)}</td><td class="n">${N(r.ok)}</td><td class="n ${r.fail?'bad':''}">${N(r.fail)}</td></tr>`).join('')}</tbody></table></section>
  ${sec('자동 작업 일정','GitHub Actions · 시각은 UTC 기준 설정(한국 = +9시간)')}
  <div class="mul">${C.workflows.map(w=>`<div class="card mc"><div class="mh"><b>${E(w.name)}</b><span class="mute">${E(w.file)}</span></div>
   <p class="fine">${w.crons.length?w.crons.map(([c,n])=>`${E(n||cr(c))}`).join(' · '):'수동·다른 작업 뒤 실행'}</p>
   ${w.live?`<div class="mn"><b>${N(w.live.runs)}</b><small>회/7일</small><small>성공 ${N(w.live.ok)}</small><small class="${w.live.fail?'bad':''}">실패 ${N(w.live.fail)}</small>${w.live.cancel?`<small class="mute">취소 ${N(w.live.cancel)}</small>`:''}${w.live.avg_min?`<small>평균 ${w.live.avg_min}분</small>`:''}</div>${bars(w.live.daily,{h:36,unit:'회',col:'#0f1630',avg:false})}
   <div class="dots">${w.live.recent.map(([s,c,m])=>`<i class="${c==='success'?'ok':c==='failure'||c==='timed_out'?'bad':c==='cancelled'||c==='skipped'?'':'run'}" data-t="${E(t(s))} · ${E(c||'')}${m?' · '+m+'분':''}"></i>`).join('')}</div>`:'<p class="fine">최근 7일 실행 기록 없음</p>'}
   <p class="fine">${E((w.desc||'').slice(0,140))}</p></div>`).join('')}</div>`},
async reader(el){const{E,N,K,stackBars}=B();let X;try{X=await (await fetch(EVS,{cache:'no-store'})).json()}catch(e){return`<p class="err">독자 반응 서버에 연결하지 못했어요. 잠시 뒤 다시 열어 주세요.</p>`}
  if(X.wait)return'<p class="mute">독자 반응 집계표를 준비하는 중이에요. 잠시 뒤 다시 열어 주세요.</p>';
  const KN={view:'화면 조회',click:'원문 기사 읽기',like:'좋아요',scrap:'스크랩',share:'공유'},KC={view:'#2f6bff',click:'#11a683',like:'#ff4d2e',scrap:'#f08a00',share:'#7a4dff'};
  const day={};(X.daily||[]).forEach(r=>{(day[r.day]=day[r.day]||{})[KN[r.k]]=r.n});
  const days=[];for(let i=29;i>=0;i--){const d=new Date(Date.now()+9*36e5-i*864e5).toISOString().slice(0,10);days.push([d,day[d]||{}])}
  const sum=(k,n)=>days.slice(-n).reduce((s,[,m])=>s+(m[KN[k]]||0),0);
  const used=((X.budget||[]).find(b=>b.day===X.day)||{}).rows||0;
  let W=sessionStorage.getItem('nb-rw')||'d7';
  const PT={issue:'이슈',home:'첫 화면',market:'마켓',article:'원문 기사',person:'인물',word:'단어',archive:'아카이브',fun:'놀이',my:'내 서재',chart:'차트'};
  const lst=k=>{const L=((X.top||{})[W]||{})[k]||[];return L.length?hl(L.map(r=>[r.t||r.id,r.n,r.u||(r.id&&!r.id.startsWith('u:')?'../'+r.id:null),[PT[r.p]||r.p,r.c].filter(Boolean).join(' · ')]),{link:1,sub:1,col:KC[k]}):'<p class="mute">아직 기록이 없어요</p>'};
  const draw=()=>`<div class="rg wsel">${[['d1','오늘'],['d7','7일'],['d30','30일']].map(([k,l])=>`<button type="button" data-w="${k}" class="${W===k?'on':''}">${l}</button>`).join('')}</div>
   <div class="grid2">${['view','click','like','scrap','share'].map(k=>`<section class="card"><h3>${{view:'많이 본 화면',click:'많이 읽힌 원문 기사',like:'좋아요 많은',scrap:'스크랩 많은',share:'많이 공유된'}[k]}</h3>${lst(k)}</section>`).join('')}</div>`;
  const by={};(X.by_type||[]).forEach(r=>{const p=PT[r.p]||r.p||'기타';by[p]=(by[p]||0)+(r.k==='view'?r.n:0)});
  setTimeout(()=>{const box=el.querySelector('#rtop');box.onclick=e=>{const b=e.target.closest('[data-w]');if(!b)return;W=b.dataset.w;sessionStorage.setItem('nb-rw',W);box.innerHTML=draw()}},0);
  return`${sec('독자 반응','익명 집계 · 누가 했는지는 저장하지 않아요 · 2분마다 갱신')}
  <div class="kpis">${['view','click','like','scrap','share'].map(k=>kpi(KN[k],N(sum(k,1)),`7일 ${N(sum(k,7))} · 30일 ${N(sum(k,30))}`)).join('')}${kpi('오늘 집계 사용량',N(used)+'행',`하루 ${N(X.cap)}행까지(무료 한도 보호)`)}</div>
  <section class="card"><h3>날짜별 반응 <small>최근 30일</small></h3>${stackBars(days,{h:120})}</section>
  <section class="card"><h3>최근 7일 화면 종류별 조회</h3>${B().stack(by)}</section>
  <div id="rtop">${draw()}</div>
  <p class="fine">조회는 같은 화면을 30분에 한 번, 원문 기사는 같은 기사를 하루 한 번만 세요. 좋아요·스크랩은 취소하면 빠져요. 이 집계는 2026-10-30부터 쌓여요.</p>`}
};
window.renderTab=async function(t,el){if(!R[t])return;el.innerHTML='<p class="mute">불러오는 중…</p>';
  try{el.innerHTML=await R[t](el)}catch(e){el.innerHTML=`<p class="err">현황 파일을 아직 만들지 못했어요(다음 수집 뒤 채워져요). <small>${B().E(e.message)}</small></p>`;return}
  el.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>{B().setRange(+b.dataset.range);const y=scrollY;renderTab(t,el);scrollTo(0,y)});
  B().tipper(el)};
})();
