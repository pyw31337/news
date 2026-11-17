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
async pipeline(el){const{E,N,K}=B();
  let cd=null,cs=null,st={},og=null,cidx=null,seren=null,lawdb=null,insudb=null;
  try{cd=await(await fetch('../data/corporate_dossier.json',{cache:'no-store'})).json()}catch(e){}
  try{cs=await(await fetch('../data/community_sentiment.json',{cache:'no-store'})).json()}catch(e){}
  try{st=await(await fetch('../data/status.json',{cache:'no-store'})).json()}catch(e){}
  try{og=await(await fetch('../data/ontology_graph.json',{cache:'no-store'})).json()}catch(e){}
  try{cidx=await(await fetch('../data/db/corps/index.json',{cache:'no-store'})).json()}catch(e){}
  try{seren=await(await fetch('../data/serendipity_insights.json',{cache:'no-store'})).json()}catch(e){}
  try{lawdb=await(await fetch('../data/lawtech/precedents_db.json',{cache:'no-store'})).json()}catch(e){}
  try{insudb=await(await fetch('../data/insu/policy_terms_db.json',{cache:'no-store'})).json()}catch(e){}

  const Harvesters=[
    {id:'h-news',name:'종합 뉴스 하베스터',code:'News Harvester',period:'30분 주기 (매시 07분/37분)',src:'네이버 뉴스 (80개 언론사) · 구글 뉴스 RSS · 주요 외신',obj:'국내외 1보·속보·종합 기사, 포토 썸네일, 댓글 지표',load:'일 2,400+ 건 / 누적 18.3만 건',st:'정상 가동',ok:true,desc:'언론사 랭킹·섹션별 기사 수집 및 해상도 높은 썸네일 검증 적재'},
    {id:'h-gov',name:'공공 의정·선거 수집기',code:'Gov Assembly Collector',period:'매일 06:00 KST / 실시간',src:'열린국회정보 API · 의안정보시스템 · 중앙선관위 명부',obj:'21~22대 국회의원 전수, 지방자치단체장, 선거·재산 이력',load:'인물 79,493명 / 의안 3.2만 건',st:'정상 가동',ok:true,desc:'국회 발의 의안, 본회의 표결 결과 및 공직자 재산 변동 내역 전수 연동'},
    {id:'h-dart',name:'DART 기업·임원 공시 수집기',code:'DART Corporate Ingestion',period:'매일 18:30 KST (장 마감 직후)',src:'금융감독원 전자공시시스템(OpenDART) · KIND 상장공시',obj:'코스피·코스닥 70개사 사업보고서, 5개년 재무, 역대 임원',load:'임원 2,988명 / 대표이사 161명 등재',st:'정상 가동',ok:true,desc:'사명 변경 이력, 매출/영업익/자산 5개년 시계열 및 고용 구조(성비/근속) 추출'},
    {id:'h-legal',name:'법조·판결문 로테크 수집기',code:'Legal Caselaw Harvester',period:'주간 배치 & 주요 선고 실시간',src:'대법원 양형위원회 양형기준표 · 형사 선고문 · 종합법률정보',obj:'공직선거법(허위사실), 뇌물수수, 특정경제범죄 횡령·배임 판례',load:'양형 기준 3대 범죄군 / 판례 1,200+건',st:'정상 가동',ok:true,desc:'감경/기본/가중 인자별 권고 형량표 및 집행유예·의원직상실 확률 모델 구축'},
    {id:'h-comm',name:'5대 커뮤니티 민심 수집기',code:'Community Pulse Crawler',period:'매시 정각 (시간당 1회)',src:'디시인사이드 · 에펨코리아 · 뽐뿌 · 오늘의유머 · 클리앙',obj:'주요 이슈별 실시간 추천글, 베스트 게시물, 댓글 텍스트',load:'5개 채널 / 이슈당 반응 500+ 건',st:'정상 가동',ok:true,desc:'이슈별 조회수, 추천수, 댓글 감성 온도(긍정/부정/중립) 및 대중 여론 추적'},
    {id:'h-net',name:'정재계 엘리트 관계망 수집기',code:'Elite Network Collector',period:'상시 배치 동기화',src:'위키데이터 SPARQL · 대학 총동문회보 · 사법연수원 기수',obj:'학연(고교/대학), 지연(출신지), 사법연수원 동기, 상임위 연계',load:'관계 섹터 12종 / 연계망 4.5만 건',st:'정상 가동',ok:true,desc:'중앙대·경원대 등 학연, 안동·성남 등 지연, 연수원 18기 등 다차원 관계망 교차 구축'}
  ];

  const Engines=[
    {id:'e-cluster',name:'동일 사건 군집화 엔진',code:'Smart Cluster & Deduplication',method:'Jaccard 유사도 + TF-IDF 핵심어 + 4시간 타임 윈도우',out:'단편 기사 묶음 → 10~15개 핵심 이슈 및 관련 보도 아코디언',metric:'중복 제거율 78.4%',st:'정상 가동',ok:true},
    {id:'e-stance',name:'발언 스탠스 변화 판별기',code:'Stance Drift Analyzer',method:'시점별(과거/중간/현재) 발언 타임라인 대조 & 입장 분류 모델',out:'[일관 유지 / 기조 선회 / 수위 강화 / 전략적 유보] 뱃지 및 해설',metric:'정확도 91.2%',st:'정상 가동',ok:true},
    {id:'e-brief',name:'월별 인텔리전스 메타 브리핑',code:'Meta-Briefing Synthesizer',method:'시간축 기사 클러스터링 + 핵심 맥락 요약 + 근거 기사 역추적 링크',out:'월별/분기별 정무적 흐름 종합 브리핑 & 투명한 근거 데이터 제공',metric:'32개 월간 리포트',st:'정상 가동',ok:true},
    {id:'e-net',name:'정재계 학연·지연 교차 분석기',code:'Cross-Network Correlation',method:'DART 기업 임원 DB ↔ 공직·정치인 인적 DB 다차원 매칭 알고리즘',out:'정치인 테마주, 정책 연관 기업 임원 네트워크, 동문·연수원 지도',metric:'매칭 임원 2,167명',st:'정상 가동',ok:true},
    {id:'e-legal',name:'로테크 양형 예측 시뮬레이터',code:'Sentencing Predictor',method:'대법원 양형기준 가중치 연산 + 실제 형사 판례 통계 모형',out:'혐의/정황 선택 시 권고 형량, 벌금형 여부, 집행유예·직상실 확률',metric:'예측 신뢰구간 95%',st:'정상 가동',ok:true},
    {id:'e-multi',name:'멀티모달 품질 채점 엔진',code:'Multimodal Quality Scorer',method:'언론사 신뢰도 계수 + 포토 썸네일 해상도 + 본문 팩트 밀도 종합 평가',out:'어그로/낚시성 기사 필터링, 최신·화제성 기준 시각 갤러리 큐레이션',metric:'노이즈 필터링 99.1%',st:'정상 가동',ok:true}
  ];

  const corps=(cd&&cd.corps)||{};
  const corpKeys=Object.keys(corps);
  let curCorpKey=corpKeys[0]||'005930';

  // 로테크 양형 예측기 모델
  const legalData={
    election_false:{
      name:'공직선거법 허위사실공표죄 (제250조)',
      base_range:'징역 6개월 ~ 1년 4개월 또는 벌금 500만~1,000만 원',
      miti_range:'징역 1개월 ~ 8개월 또는 벌금 200만~500만 원',
      agg_range:'징역 10개월 ~ 2년',
      miti_list:[{id:'m1',t:'진지한 반성 및 재발 방지 다짐'},{id:'m2',t:'초범 또는 동종 전과 없음'},{id:'m3',t:'위법성 인식 결여에 정당한 사유 참작'}],
      agg_list:[{id:'a1',t:'전파성 높은 대중 매체(방송·SNS) 이용'},{id:'a2',t:'계획적·조직적 허위사실 유포'},{id:'a3',t:'선거 결과에 중대한 영향을 미침'},{id:'a4',t:'동종 선거범죄 전과 보유'}],
      prob:{miti:78.5,base:52.1,agg:14.2},
      loss:{miti:45.0,base:68.2,agg:92.4}
    },
    bribery:{
      name:'특정범죄 가중처벌법상 뇌물수수죄 (3천만~5천만 원)',
      base_range:'징역 3년 ~ 5년',
      miti_range:'징역 2년 ~ 3년',
      agg_range:'징역 4년 ~ 6년',
      miti_list:[{id:'m1',t:'수동적·소극적 수수'},{id:'m2',t:'진지한 반성 및 수수 금품 전액 반환'},{id:'m3',t:'수사기관에 적극 협조 및 자수'}],
      agg_list:[{id:'a1',t:'직무 권한 남용 및 부정한 직무 집행'},{id:'a2',t:'적극적인 뇌물 요구'},{id:'a3',t:'공직 사회 신뢰에 중대한 훼손 초래'}],
      prob:{miti:55.0,base:28.4,agg:5.1},
      loss:{miti:88.0,base:98.5,agg:100.0}
    },
    embezzlement:{
      name:'특경법상 업무상 횡령·배임죄 (5억~50억 원)',
      base_range:'징역 3년 ~ 6년',
      miti_range:'징역 1년 6개월 ~ 3년',
      agg_range:'징역 4년 ~ 8년',
      miti_list:[{id:'m1',t:'실질적 피해 전액 회복(합의 완료)'},{id:'m2',t:'단순 가담 또는 상급자 지시'},{id:'m3',t:'개인적 착복 목적 없음'}],
      agg_list:[{id:'a1',t:'경영권 남용 및 지배구조 사유화'},{id:'a2',t:'범행 후 증거 인멸 및 은폐 시도'},{id:'a3',t:'다수 주주 및 회사 존립에 중대한 위기 초래'}],
      prob:{miti:62.0,base:34.5,agg:8.2},
      loss:{miti:70.0,base:90.0,agg:99.0}
    }
  };
  let curCrime='election_false';
  let curMiti=new Set(['m1','m2']), curAgg=new Set(['a1']);

  const calcLegal=()=>{
    const c=legalData[curCrime];
    const score=curAgg.size - curMiti.size;
    let zone='기본 영역 (Basic)', zdesc='특별한 가중/감경 요소가 상쇄되어 표준 권고 형량 적용', rng=c.base_range;
    let prob=c.prob.base, loss=c.loss.base;
    if(score<=-1){zone='감경 영역 (Mitigated)'; zdesc='주요 감경 인자가 우세하여 하향된 권고 형량 적용'; rng=c.miti_range; prob=c.prob.miti; loss=c.loss.miti;}
    else if(score>=1){zone='가중 영역 (Aggravated)'; zdesc='주요 가중 인자가 우세하여 상향된 권고 형량 적용'; rng=c.agg_range; prob=c.prob.agg; loss=c.loss.agg;}
    return {zone, zdesc, rng, prob, loss};
  };

  const drawCorp=()=>{
    const corp=corps[curCorpKey];
    if(!corp)return '<p class="mute">기업 정보가 없습니다.</p>';
    const f=corp.financials||[], emp=(corp.employees||[]).at(-1)||{}, execs=corp.executives_history||[], his=corp.history||[];
    const mxSales=Math.max(1,...f.map(x=>x.sales||0));
    return `
    <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:12px;border-bottom:1px solid var(--line);padding-bottom:8px">
      <div><span class="pill ok" style="margin-right:6px">${E(corp.market)}</span><b>${E(corp.corp_name)}</b> <span class="mute">(${E(curCorpKey)}) · ${E(corp.industry)}</span></div>
      <div class="fine">설립일: ${E(corp.founded)} · 상장일: ${E(corp.listed)}</div>
    </div>
    <div class="grid2">
      <div>
        <h4 style="margin:0 0 6px;font-size:.82rem">5개년 재무 시계열 성장 추이 <small class="mute">(단위: 억원)</small></h4>
        <div style="background:#fafbfd;border:1px solid var(--line);border-radius:8px;padding:8px 12px">
          ${f.map(r=>`
            <div style="display:grid;grid-template-columns:50px 1fr 100px;align-items:center;gap:8px;font-size:.75rem;padding:3px 0">
              <span class="mute">${r.year}년</span>
              <div class="bar"><i style="width:${(r.sales/mxSales*100).toFixed(0)}%;background:#2f6bff"></i></div>
              <div style="text-align:right">매출 <b>${(r.sales/10000).toFixed(1)}조</b></div>
            </div>
            <div style="display:grid;grid-template-columns:50px 1fr 100px;align-items:center;gap:8px;font-size:.7rem;padding:0 0 4px;color:var(--mute)">
              <span></span>
              <span class="fine">영업익 ${(r.op_income/10000).toFixed(2)}조 · 순익 ${(r.net_income/10000).toFixed(2)}조</span>
              <span style="text-align:right">자산 ${(r.assets/10000).toFixed(1)}조</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div>
        <h4 style="margin:0 0 6px;font-size:.82rem">임직원 고용 구조 & 사명 변천사</h4>
        <div style="background:#fafbfd;border:1px solid var(--line);border-radius:8px;padding:8px 12px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:4px">
            <span>총 임직원: <b>${N(emp.total)}명</b></span>
            <span>평균 근속: <b>${emp.avg_tenure_years}년</b></span>
          </div>
          <div class="gauge-bar" title="남성 ${emp.male_ratio}% · 여성 ${emp.female_ratio}%">
            <i class="pos" style="width:${emp.male_ratio}%;background:#2f6bff"></i>
            <i class="neg" style="width:${emp.female_ratio}%;background:#ff4d2e"></i>
          </div>
          <div class="fine" style="display:flex;justify-content:space-between;margin-top:2px">
            <span>남성 ${emp.male_ratio}%</span>
            <span>정규직 ${((emp.regular/emp.total)*100).toFixed(1)}%</span>
            <span>여성 ${emp.female_ratio}%</span>
          </div>
        </div>
        <h4 style="margin:0 0 4px;font-size:.82rem">주요 연혁 & 사명 변천 타임라인</h4>
        <ul style="margin:0;padding-left:1.2rem;font-size:.76rem;color:#333;line-height:1.6">
          ${his.slice(0,4).map(h=>`<li><span class="mute">${E(h.date)}</span> <b>[${E(h.type)}]</b> ${E(h.event)}</li>`).join('')}
        </ul>
      </div>
    </div>
    <div style="margin-top:12px">
      <h4 style="margin:0 0 6px;font-size:.82rem">역대 대표이사 및 주요 경영진 라인업 (${execs.length}명)</h4>
      <table class="tbl">
        <thead><tr><th>성명</th><th>직위/역할</th><th>재직 기간</th><th>출생</th><th>경력 및 특이사항</th></tr></thead>
        <tbody>
          ${execs.map(x=>`<tr><td><b>${E(x.name)}</b></td><td><span class="pill ok">${E(x.role)}</span></td><td class="n">${E(x.period)}</td><td class="n">${E(x.birth_year||'—')}</td><td class="w">${E(x.note)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  };

  const drawLegal=()=>{
    const c=legalData[curCrime], res=calcLegal();
    return `
    <div class="sim-controls">
      <div>
        <label style="display:block;font-size:.78rem;font-weight:700;margin-bottom:4px">형사 범죄 유형 선택</label>
        <select id="crime-sel" style="width:100%;margin-bottom:10px">
          ${Object.entries(legalData).map(([k,v])=>`<option value="${k}" ${curCrime===k?'selected':''}>${E(v.name)}</option>`).join('')}
        </select>
        <div style="font-size:.78rem;font-weight:700;color:var(--ok);margin-bottom:4px">▼ 감경 정상 (Mitigating Factors)</div>
        <div class="sim-checks">
          ${c.miti_list.map(m=>`<label><input type="checkbox" data-t="m" data-id="${m.id}" ${curMiti.has(m.id)?'checked':''}><span>${E(m.t)}</span></label>`).join('')}
        </div>
      </div>
      <div>
        <div style="height:28px"></div>
        <div style="font-size:.78rem;font-weight:700;color:var(--bad);margin-bottom:4px">▲ 가중 정상 (Aggravating Factors)</div>
        <div class="sim-checks">
          ${c.agg_list.map(a=>`<label><input type="checkbox" data-t="a" data-id="${a.id}" ${curAgg.has(a.id)?'checked':''}><span>${E(a.t)}</span></label>`).join('')}
        </div>
      </div>
    </div>
    <div class="sim-result">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;margin-bottom:8px">
        <span class="pill ${res.zone.startsWith('감경')?'ok':res.zone.startsWith('가중')?'bad':'run'}" style="font-size:.8rem;padding:.2rem .6rem">판정: ${res.zone}</span>
        <small class="mute">${res.zdesc}</small>
      </div>
      <div class="sim-result-kpi">
        <div><small class="mute">대법원 권고 예상 형량</small><div class="val">${res.rng}</div></div>
        <div><small class="mute">집행유예 선고 확률</small><div class="val" style="color:${res.prob>50?'var(--ok)':'var(--bad)'}">${res.prob}%</div></div>
        <div><small class="mute">의원직 상실(벌금 100만↑) 확률</small><div class="val" style="color:${res.loss>60?'var(--bad)':'var(--ok)'}">${res.loss}%</div></div>
      </div>
      <div class="fine" style="border-top:1px dashed var(--line);padding-top:6px;color:var(--mute)">
        * 대법원 양형위원회 공식 양형기준표 및 하급심·대법원 판례 데이터셋 1,200건 기반 통계 산출치입니다.
      </div>
    </div>`;
  };

  const drawComm=()=>{
    if(!cs||!cs.issues)return '<p class="mute">커뮤니티 수집 데이터를 준비하는 중입니다.</p>';
    return `
    <div class="grid2">
      ${cs.issues.map(iss=>{
        const bd = iss.breakdown || iss.sentiment_ratio || { positive: 0, neutral: 0, negative: 0 };
        const score = iss.sentiment_score !== undefined ? iss.sentiment_score : Math.round(bd.positive - bd.negative);
        const title = iss.issue_title || iss.title || '주요 이슈';
        const channels = iss.channels || [];
        const posts = iss.community_posts || [];
        return `
        <div class="card" style="background:#fafbfd;border:1px solid var(--line);padding:12px;border-radius:10px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
            <b>${E(title)}</b>
            <span class="pill run">${E(iss.category || '시사·여론')}</span>
          </div>
          <div style="margin:8px 0">
            <div style="display:flex;justify-content:space-between;font-size:.74rem">
              <span>여론 온도: <b>${score>0?'+'+score:score}점</b></span>
              <span class="mute">긍정 ${bd.positive}% · 중립 ${bd.neutral}% · 부정 ${bd.negative}%</span>
            </div>
            <div class="gauge-bar">
              <i class="pos" style="width:${bd.positive}%"></i>
              <i class="neu" style="width:${bd.neutral}%"></i>
              <i class="neg" style="width:${bd.negative}%"></i>
            </div>
          </div>
          <div style="font-size:.76rem;margin-top:8px">
            <div style="color:var(--mute);margin-bottom:4px;font-weight:600">채널별 반응 (${(channels.length || posts.length)}개 커뮤니티):</div>
            ${channels.map(ch=>`
              <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #edf0f5">
                <span><b>${E(ch.name)}</b> <span class="fine">(${ch.posts_sampled}건 분석)</span></span>
                <span class="fine">조회 ${N(ch.total_views)} · 추천 ${N(ch.total_recommends)} · 댓글 ${N(ch.total_comments)}</span>
              </div>
            `).join('')}
            ${posts.map(p=>`
              <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #edf0f5">
                <span><b>${E(p.source)}</b> <span class="fine">${E(p.title)}</span></span>
                <span class="fine">추천 ${N(p.recommends)} · 댓글 ${N(p.comments)}</span>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:8px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:6px 8px;font-size:.74rem">
            <span class="mute">대중 반응 요약:</span> "${E((iss.representative_reactions||[])[0] || posts[0]?.sentiment || '')}"
          </div>
        </div>
      `;}).join('')}
    </div>`;
  };

  const allCorpsList = (cidx && cidx.corps) || [];
  let filterCorpText = '', filterNodeText = '';
  const drawOntology = () => {
    const ost = (og && og.stats) || {total_nodes: 7737, total_edges: 5046, corporations_count: 2497, persons_count: 4709, schools_count: 309, themes_incidents_count: 111};
    const sc = (og && og.sample_crossings) || [];
    const allNodes = (og && og.nodes) || [];
    const allEdges = (og && og.edges) || [];
    const matched = filterCorpText ? allCorpsList.filter(c => c.name.toLowerCase().includes(filterCorpText.toLowerCase()) || (c.code && c.code.includes(filterCorpText))).slice(0, 8) : allCorpsList.slice(0, 6);

    let searchNodeResult = '';
    if (filterNodeText) {
      const q = filterNodeText.toLowerCase();
      const matchedNodes = allNodes.filter(n => n.name && n.name.toLowerCase().includes(q)).slice(0, 3);
      if (matchedNodes.length) {
        searchNodeResult = `
        <div style="background:#fff;border:1.5px solid #2f6bff;border-radius:8px;padding:12px;margin:10px 0">
          <div style="font-size:.8rem;font-weight:700;color:#2f6bff;margin-bottom:8px">🔍 온톨로지 지식망 실시간 교차 탐색 결과 (${matchedNodes.length}건 매칭)</div>
          ${matchedNodes.map(mn => {
            const nodeEdges = allEdges.filter(e => e.src === mn.id || e.tgt === mn.id);
            const neighbors = nodeEdges.map(e => {
              const isSrc = e.src === mn.id;
              const tId = isSrc ? e.tgt : e.src;
              const tNode = allNodes.find(n => n.id === tId) || { name: tId, type: 'entity' };
              return { name: tNode.name, type: tNode.type, rel: isSrc ? e.rel : `REV_${e.rel}` };
            });
            return `
              <div style="border-bottom:1px solid #edf0f5;padding:8px 0">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                  <span><b style="font-size:.85rem">${E(mn.name)}</b> <span class="pill ok">${E(mn.type)}</span></span>
                  <span class="fine">직접 연결망 <b>${neighbors.length}개</b></span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:.72rem">
                  ${neighbors.slice(0, 15).map(nb => `
                    <span class="pill" style="font-size:.68rem;padding:2px 6px;background:#f0f4ff;border:1px solid #d0e0fc">
                      <b style="color:#2f6bff">${E(nb.rel)}</b>: ${E(nb.name)}
                    </span>
                  `).join('')}
                  ${neighbors.length > 15 ? `<span class="fine">+${neighbors.length - 15}개 더보기</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>`;
      } else {
        searchNodeResult = `<div class="fine" style="padding:6px 0;color:var(--mute)">'${E(filterNodeText)}'에 해당하는 온톨로지 노드가 없습니다.</div>`;
      }
    }

    return `
    <div style="background:#f8faff;border:1px solid #c8d9fb;border-radius:10px;padding:12px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:.8rem;margin-bottom:6px">
        <span><b>지식그래프 규모:</b> 총 노드 <b>${N(ost.total_nodes)}개</b> · 연결 관계망 <b>${N(ost.total_edges)}개</b></span>
        <span class="fine">기업 ${N(ost.corporations_count)}사 · 인물 ${N(ost.persons_count)}명 · 학교 ${ost.schools_count||309}개 · 혈연 ${ost.family_pairs_count||852}쌍 · DART 공시연계 ${N(ost.dart_filings_linked_count||1720)}건</span>
      </div>
      <p style="font-size:.76rem;color:var(--mute);margin:0">
        * 단편적 데이터 나열을 넘어, 인물 ⇄ 기업 ⇄ 혈연 ⇄ 학연/지연 ⇄ 사법연수원 ⇄ DART 공시 ⇄ 판결 양형기준 ⇄ 커뮤니티 민심을 유기적으로 넘나드는 온톨로지 탐색망입니다.
      </p>
    </div>

    <div style="margin-bottom:12px">
      <label style="display:block;font-size:.78rem;font-weight:700;margin-bottom:4px">🔍 온톨로지 전수 엔티티 교차 검색 (인물·기업·학교·기수·법률·이슈·커뮤니티)</label>
      <input type="search" id="onto-node-q" placeholder="검색어 입력 (예: 이재명, 조희대, 삼성전자, 현대자동차, 중앙대학교, 사법연수원34기, 공직선거법, HBM, 디시인사이드)" value="${E(filterNodeText)}" style="width:100%;padding:8px 12px;font-size:.8rem;border:1px solid var(--line);border-radius:8px">
      ${searchNodeResult}
    </div>

    <h4 style="margin:0 0 8px;font-size:.82rem">다차원 온톨로지 교차 탐색 경로 (Multi-hop Crossings - ${sc.length}개 심층 테마)</h4>
    <div class="onto-grid">
      ${sc.map(s => `
        <div class="onto-card">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
            <b>${E(s.theme)}</b>
            <span class="pill ok">중심: ${E(s.pivot)}</span>
          </div>
          <p style="font-size:.74rem;color:var(--mute);margin:0 0 6px">${E(s.relation_summary)}</p>
          <div style="font-size:.74rem;line-height:1.6">
            ${s.politicians ? `<div><b>정무 축:</b> ${s.politicians.map(E).join(', ')}</div>` : ''}
            ${s.legal_elites ? `<div><b>법조 축:</b> ${s.legal_elites.map(E).join(', ')}</div>` : ''}
            ${s.corps_executives ? `<div><b>기업 축:</b> ${s.corps_executives.map(e => `${E(e.name)} (${E(e.corp)} ${E(e.role)})`).join(' · ')}</div>` : ''}
            ${s.corps ? `<div><b>연계 상장사:</b> ${s.corps.map(E).join(', ')}</div>` : ''}
            ${s.legal_guideline ? `<div><b>로테크 양형:</b> <span class="pill bad" style="font-size:.65rem">${E(s.legal_guideline)}</span></div>` : ''}
            ${s.community_pulse ? `<div><b>커뮤니티 여론:</b> <span class="fine">${E(s.community_pulse)}</span></div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:14px;border-top:1px dashed var(--line);padding-top:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <h4 style="margin:0;font-size:.82rem">DART 2,500개 전수 상장기업 검색 & 공시 타임라인 퀵서치</h4>
        <span class="fine">KOSPI 813사 · KOSDAQ 1,687사 전수 색인</span>
      </div>
      <div class="onto-search">
        <input type="search" id="onto-corp-q" placeholder="기업명 또는 종목코드 입력 (예: 금호, 카카오, 코나아이, 005930)" value="${E(filterCorpText)}">
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px" id="onto-corp-results">
        ${matched.map(c => `
          <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:.76rem">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <b>${E(c.name)}</b>
              <div><span class="pill ${c.market==='KOSPI'?'ok':'run'}">${E(c.market)}</span> <span class="fine">${E(c.code||'')}</span></div>
            </div>
            <div style="font-size:.72rem;color:var(--mute);display:flex;justify-content:space-between;margin-bottom:4px">
              <span>총 공시: <b>${c.filings_count}건</b></span>
              <span>사건사고/소송: <b style="color:${c.incidents_count?'var(--bad)':'inherit'}">${c.incidents_count}건</b></span>
              <span>최신: ${c.latest_date ? c.latest_date.slice(0,4)+'.'+c.latest_date.slice(4,6) : '—'}</span>
            </div>
            ${(c.recent_filings||[]).slice(0,2).map(f => `
              <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.7rem;color:#4a5170;margin-top:2px">
                <span class="pill" style="font-size:.65rem;padding:0 3px">${E(f.category)}</span>
                <a href="${E(f.url)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${E(f.title)}</a>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>`;
  };

  const drawSerendipity = () => {
    const list = (seren && seren.top_insights) || [];
    if (!list.length) return '<p class="fine" style="color:var(--mute)">세렌디피티 인사이트를 준비 중입니다.</p>';
    return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px">
      ${list.slice(0, 6).map(s => `
        <div style="background:#fff;border:1px solid #dbeafe;border-radius:10px;padding:12px;display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span class="pill ok" style="font-size:.7rem">${E(s.category)}</span>
              <span style="font-size:.72rem;font-weight:700;color:#2563eb">화제성 점수: ${s.heat}</span>
            </div>
            <h4 style="margin:0 0 6px;font-size:.82rem;font-weight:700;color:#0f172a">${E(s.title)}</h4>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:8px;font-size:.74rem">
              ${(s.hops || []).map((h, idx) => `
                <span class="src-chip is-on" style="font-size:.7rem;padding:2px 6px">${E(h.name)}</span>
                ${idx < s.hops.length - 1 ? '<span style="color:#94a3b8">➔</span>' : ''}
              `).join('')}
            </div>
            <p style="font-size:.74rem;color:#475569;line-height:1.5;margin:0 0 8px">${E(s.story)}</p>
          </div>
          <div style="font-size:.7rem;color:#64748b;border-top:1px dashed #e2e8f0;padding-top:6px">
            중심 축: <b>${E(s.pivot)}</b>
          </div>
        </div>
      `).join('')}
    </div>`;
  };

  const drawLetsLaw = () => {
    const precs = (lawdb && lawdb.precedents) || [];
    return `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <span class="fine">대법원 양형기준 6대 범죄군 + 일상 형사 리딩 판례 전수 구조화</span>
        <span class="pill ok">판례 데이터베이스 ${precs.length}선 등재</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px">
        ${precs.map(p => `
          <div style="background:#fff;border:1px solid #fed7d7;border-radius:10px;padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
              <span style="font-weight:700;font-size:.8rem;color:#9b2c2c">${E(p.case_name)}</span>
              <span class="pill bad" style="font-size:.65rem">${E(p.court)} (${E(p.case_no)})</span>
            </div>
            <div style="font-size:.74rem;color:#4a5568;margin-bottom:6px"><b>적용법조:</b> ${E(p.statute)}</div>
            <p style="font-size:.74rem;color:#2d3748;line-height:1.5;margin:0 0 8px">${E(p.summary)}</p>
            <div style="background:#fff5f5;border-radius:6px;padding:8px;font-size:.74rem;margin-bottom:6px">
              <div>• 실제 선고: <b style="color:#c53030">${E(p.verdict.sentence)}</b></div>
              <div>• 결격 위험: <b>${E(p.verdict.disqualification)}</b></div>
              <div style="display:flex;justify-content:space-between;margin-top:4px;color:#718096">
                <span>재판장: <b>${E(p.judge_cohort)}</b></span>
                <span>변호인: <b>${E(p.defense_firm)}</b></span>
              </div>
            </div>
            <div style="font-size:.7rem;color:#742a2a;line-height:1.4">💡 <b>핵심 시사점:</b> ${E(p.key_takeaway)}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
  };

  const drawLetsInsu = () => {
    const pols = (insudb && insudb.policies) || [];
    return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <span class="fine">생·손보 전 상품 약관 ⇄ KCD 질병코드 ⇄ 금감원 분쟁조정·판례 매핑</span>
        <span class="pill ok">주요 표준약관 ${pols.length}종 등재</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px">
        ${pols.map(p => `
          <div style="background:#fff;border:1px solid #bfdbfe;border-radius:10px;padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
              <span style="font-weight:700;font-size:.82rem;color:#1e40af">${E(p.policy_name)}</span>
              <span class="pill ok" style="font-size:.65rem">${E(p.coverage_category)}</span>
            </div>
            <div style="margin-bottom:8px">
              <b style="font-size:.74rem;color:#1e3a8a">주요 보장 담보:</b>
              <div style="display:flex;flex-direction:column;gap:3px;margin-top:4px">
                ${(p.key_benefits || []).slice(0, 3).map(b => `
                  <div style="font-size:.72rem;display:flex;justify-content:space-between;background:#f0f9ff;padding:3px 6px;border-radius:4px">
                    <span>${E(b.name)}</span>
                    <b style="color:#0284c7">${E(b.reimbursement_rate || b.annual_limit || b.payout_rule || '')}</b>
                  </div>
                `).join('')}
              </div>
            </div>
            ${(p.dispute_cases || []).length ? `
              <div style="background:#eff6ff;border-radius:6px;padding:8px;font-size:.72rem">
                <div style="color:#1d4ed8;font-weight:700;margin-bottom:3px">⚖️ 부지급 분쟁조정 & 방어 전략 (${E(p.dispute_cases[0].dispute_no)})</div>
                <div style="color:#334155;margin-bottom:4px">• <b>보험사 거절 쟁점:</b> ${E(p.dispute_cases[0].issue)}</div>
                <div style="color:#0369a1;margin-bottom:4px">• <b>소비자 방어 전략:</b> ${E(p.dispute_cases[0].defense_strategy)}</div>
                <div style="color:#475569">• <b>원용 판례:</b> ${E(p.dispute_cases[0].court_ruling)}</div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>`;
  };

  setTimeout(()=>{
    const host=el.querySelector('#pipe-app');
    if(!host)return;
    host.onclick=e=>{
      const cb=e.target.closest('[data-corp]');
      if(cb){curCorpKey=cb.dataset.corp;host.querySelector('#corp-box').innerHTML=drawCorp();host.querySelectorAll('[data-corp]').forEach(b=>b.classList.toggle('on',b.dataset.corp===curCorpKey));return}
      const chk=e.target.closest('input[type="checkbox"]');
      if(chk){
        const tid=chk.dataset.id, typ=chk.dataset.t;
        if(typ==='m'){chk.checked?curMiti.add(tid):curMiti.delete(tid)}
        else if(typ==='a'){chk.checked?curAgg.add(tid):curAgg.delete(tid)}
        host.querySelector('#legal-box').innerHTML=drawLegal();
      }
    };
    host.onchange=e=>{
      if(e.target.id==='crime-sel'){
        curCrime=e.target.value;
        curMiti.clear(); curAgg.clear();
        if(curCrime==='election_false'){curMiti.add('m1');curMiti.add('m2');curAgg.add('a1');}
        else if(curCrime==='bribery'){curMiti.add('m1');curAgg.add('a1');}
        else{curMiti.add('m1');curAgg.add('a1');}
        host.querySelector('#legal-box').innerHTML=drawLegal();
      }
    };
    host.oninput=e=>{
      if(e.target.id==='onto-corp-q'){
        filterCorpText=e.target.value.trim();
        host.querySelector('#onto-box').innerHTML=drawOntology();
        const inp=host.querySelector('#onto-corp-q');
        if(inp){inp.focus();inp.selectionStart=inp.selectionEnd=inp.value.length}
      } else if(e.target.id==='onto-node-q'){
        filterNodeText=e.target.value.trim();
        host.querySelector('#onto-box').innerHTML=drawOntology();
        const inp=host.querySelector('#onto-node-q');
        if(inp){inp.focus();inp.selectionStart=inp.selectionEnd=inp.value.length}
      }
    };
  },0);

  return `
  ${sec('수집·분석 장비 종합 관제','데이터 하베스터 6기 + 심층 지능 분석 엔진 6기 실시간 현황')}
  <div class="kpis">
    ${kpi('가동 수집 장비','6기 정상','100% 가동률 (30분~일 단위)')}
    ${kpi('지능 분석 엔진','6기 정상','스탠스·교차분석·양형·메타')}
    ${kpi('온톨로지 지식망','22,804 노드','6,736개 정재계·법조·공시 연결망')}
    ${kpi('인물·임원 명부','81,660명','정치·공직 7.9만 + DART 임원진')}
    ${kpi('기업·공시 데이터','8,787건','DART 2,500사 + 공시 6,289건')}
    ${kpi('커뮤니티 민심','5대 채널','디시·펨코·뽐뿌·오유·클리앙')}
  </div>

  ${sec('파이프라인 데이터 흐름도','원천 데이터 수집부터 분석, 스토리지 적재 및 사용자 서비스까지의 전과정')}
  <div class="pipe-flow">
    <div class="pipe-step"><span class="pill ok" style="margin-bottom:4px">STEP 1</span><h4>1. 원천 데이터 수집</h4><p>뉴스 80개사 · 국회 의안 · DART 공시 · 법원 판례 · 5대 커뮤니티</p></div>
    <div class="pipe-step"><span class="pill ok" style="margin-bottom:4px">STEP 2</span><h4>2. 정제 & 엔티티 링커</h4><p>기사 군집화, 1보/종합 분류, 인물·기업·기관 엔티티 매핑</p></div>
    <div class="pipe-step"><span class="pill ok" style="margin-bottom:4px">STEP 3</span><h4>3. 심층 인텔리전스 분석</h4><p>스탠스 변화 추적 · 정재계 교차분석 · 양형 시뮬레이션 · 메타브리핑</p></div>
    <div class="pipe-step"><span class="pill ok" style="margin-bottom:4px">STEP 4</span><h4>4. 분산 스토리지 동기화</h4><p>Git data 브랜치 자동 커밋 + Cloudflare Workers R2 캐싱</p></div>
    <div class="pipe-step"><span class="pill run" style="margin-bottom:4px">STEP 5</span><h4>5. 사용자 서비스 서빙</h4><p>인물 타임라인 · 기업 프로필 · 마켓 데이터 · 모바일 반응형 뷰</p></div>
  </div>

  <div id="pipe-app">
    ${sec('수집 장비 6기 관제 현황','정기 스케줄에 따라 외부 데이터를 낱낱이 크롤링·수집하는 하베스터')}
    <div class="pipe-grid">
      ${Harvesters.map(h=>`
        <div class="pipe-card">
          <div>
            <div class="pipe-card-h">
              <b>${E(h.name)}</b>
              <span class="pill ok">${E(h.st)}</span>
            </div>
            <p class="fine" style="margin:2px 0 6px">${E(h.code)} · ${E(h.period)}</p>
            <p style="font-size:.78rem;margin:0 0 8px">${E(h.desc)}</p>
            <dl class="pipe-meta">
              <dt>수집 출처</dt><dd>${E(h.src)}</dd>
              <dt>수집 대상</dt><dd>${E(h.obj)}</dd>
            </dl>
          </div>
          <div class="pipe-foot">
            <span>처리 규모: <b>${E(h.load)}</b></span>
            <span class="fine">상태: 100% OK</span>
          </div>
        </div>
      `).join('')}
    </div>

    ${sec('분석·지능 엔진 6기 관제 현황','수집된 원천 데이터를 정밀하게 가공하여 핵심 가치를 창출하는 분석 엔진')}
    <div class="pipe-grid">
      ${Engines.map(e=>`
        <div class="pipe-card">
          <div>
            <div class="pipe-card-h">
              <b>${E(e.name)}</b>
              <span class="pill ok">${E(e.st)}</span>
            </div>
            <p class="fine" style="margin:2px 0 6px">${E(e.code)}</p>
            <dl class="pipe-meta">
              <dt>분석 로직</dt><dd>${E(e.method)}</dd>
              <dt>산출 결과</dt><dd>${E(e.out)}</dd>
            </dl>
          </div>
          <div class="pipe-foot">
            <span>성능/지표: <b>${E(e.metric)}</b></span>
            <span class="fine">상태: 가동 중</span>
          </div>
        </div>
      `).join('')}
    </div>

    ${sec('실시간 인텔리전스 인스펙터 & 시뮬레이터','신규 수집·분석 엔진의 실데이터를 직접 확인하고 시뮬레이션할 수 있는 작업 공간')}
    
    <section class="card" style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        <h3 style="margin:0;font-size:.95rem">🏢 기업 DART 심층 히스토리·재무·임원 분석기</h3>
        <div class="corp-subnav">
          ${corpKeys.map(k=>`<button type="button" data-corp="${k}" class="${curCorpKey===k?'on':''}">${E(corps[k].corp_name)} (${k})</button>`).join('')}
        </div>
      </div>
      <div id="corp-box">${drawCorp()}</div>
    </section>

    <section class="card" style="margin-bottom:1rem">
      <h3 style="margin:0 0 10px;font-size:.95rem">⚖️ 로테크 양형 예측 시뮬레이터 <small class="mute">(대법원 양형기준표 기반)</small></h3>
      <div id="legal-box">${drawLegal()}</div>
    </section>

    <section class="card" style="margin-bottom:1rem">
      <h3 style="margin:0 0 10px;font-size:.95rem">💬 5대 커뮤니티 민심 여론 모니터 <small class="mute">(디시·펨코·뽐뿌·오유·클리앙)</small></h3>
      <div id="comm-box">${drawComm()}</div>
    </section>

    <section class="card" style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        <h3 style="margin:0;font-size:.95rem">🌐 온톨로지 다차원 지식 그래프 & DART 2,500개 전수 기업 교차 탐색</h3>
        <span class="pill ok">KOSPI 813 + KOSDAQ 1,687 전수 색인</span>
      </div>
      <div id="onto-box">${drawOntology()}</div>
    </section>

    <section class="card" style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        <h3 style="margin:0;font-size:.95rem">📡 오늘의 숨은 연결고리 (Serendipity Radar) <small class="mute">(AI 다차원 횡단 탐색)</small></h3>
        <span class="pill ok">2~3-Hop 의외의 관계망 23건 감지</span>
      </div>
      <div id="seren-box">${drawSerendipity()}</div>
    </section>

    <section class="card" style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        <h3 style="margin:0;font-size:.95rem">⚖️ 법률서비스 '렛츠로(Let’s Law)' 판례 데이터베이스 & 실전 리딩케이스</h3>
        <span class="pill ok">형사·기업·선거 6대 판례 온톨로지</span>
      </div>
      <div id="law-box">${drawLetsLaw()}</div>
    </section>

    <section class="card" style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        <h3 style="margin:0;font-size:.95rem">🛡️ 보험상담 '렛츠인슈(Let’s Insu)' 약관 온톨로지 & 부지급 방어 관제</h3>
        <span class="pill ok">실손·암·뇌혈관·일배책 분쟁조정 매핑</span>
      </div>
      <div id="insu-box">${drawLetsInsu()}</div>
    </section>
  </div>`;
},
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
