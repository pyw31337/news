/* NewsBoard 관리자 — 브라우저 안에서만 확인하는 해시 잠금(공개 데이터만 표시) */
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DEF='1f3652dbb1e942b775ebd4c0a643352194ace7c82879b4e61402329fad281d89'; // sha256('nb-admin:'+초기값)
const REPO='pyw31337/news';
async function h(p){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('nb-admin:'+p));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const cur=()=>localStorage.getItem('nb-admin-hash')||DEF;
const kst=t=>t?new Date(t).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})+' KST':'—';
const ago=t=>{if(!t)return'—';const m=(Date.now()-new Date(t))/6e4;return m<60?(m|0)+'분 전':m<1440?(m/60|0)+'시간 전':(m/1440|0)+'일 전'};
const bytes=n=>n==null?'—':n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB';
const num=n=>n==null?'—':Number(n).toLocaleString('ko-KR');
async function j(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error(r.status);return r.json()}
$('#lf').onsubmit=async e=>{e.preventDefault();if(await h($('#pw').value)===cur()){sessionStorage.setItem('nb-admin-ok',cur());boot()}else{$('#lerr').textContent='비밀번호가 달라요.';$('#pw').select()}};
$('#lockbtn').onclick=()=>{sessionStorage.removeItem('nb-admin-ok');location.reload()};
if(sessionStorage.getItem('nb-admin-ok')===cur())boot();

async function boot(){
  $('#lockbtn').hidden=false;app.innerHTML='<p class="mute">불러오는 중…</p>';
  let S={};try{S=await j('../data/status.json')}catch(e){S={missing:true}}
  const c=S.counts||{},mm=S.macmini||{},L=S.llm||{},sz=S.sizes||{};
  const mmState=mm.age_h==null?['bad','기록 없음']:mm.age_h<30?['ok','정상']:mm.age_h<54?['warn','하루 넘게 갱신 없음']:['bad','멈춤 의심'];
  const tot=Object.values(sz).reduce((a,b)=>a+(b||0),0);
  app.innerHTML=`<div id="dash"></div>
  ${S.missing?'<p class="err">status.json이 아직 없어요. 다음 수집(매시 7분 UTC) 뒤에 채워져요.</p>':''}
  <h2>요약 <small>공개 데이터 기준 · 상태 생성 ${kst(S.updated)}</small></h2>
  <div class="kpis">
    <div class="card kpi"><span class="l">마지막 수집</span><b>${ago(S.data_updated)}</b><small>${kst(S.data_updated)}</small></div>
    <div class="card kpi"><span class="l">이번 수집 기사</span><b>${num((S.stats?.naver||0)+(S.stats?.google||0))}</b><small>네이버 ${num(S.stats?.naver)} · 구글 ${num(S.stats?.google)} · 언론사 ${num(S.stats?.presses)}</small></div>
    <div class="card kpi"><span class="l">엔티티</span><b>${num(c.entities)}</b><small>누적 이력 ${num(c.entity_history)}개</small></div>
    <div class="card kpi"><span class="l">아카이브</span><b>${num(c.archive_days)}일</b><small>${esc(c.archive_first||'')} ~ ${esc(c.archive_last||'')}</small></div>
    <div class="card kpi"><span class="l">해외</span><b>${num(c.global_issues)}</b><small>이슈 · 검색어 ${num(c.global_trends)} · 번역 ${esc(JSON.stringify(S.global_translate||{}).replace(/[{}"]/g,''))}</small></div>
    <div class="card kpi"><span class="l">저장 용량</span><b>${bytes(tot)}</b><small>data 브랜치 + 배포본</small></div>
  </div>
  <div class="grid2" style="margin-top:.8rem">
    <section class="card"><h2 style="margin-top:0"><span class="dot ${mmState[0]}"></span>맥미니 AI <small>${mmState[1]}</small></h2>
      <table class="tbl"><tr><th>마지막 분석</th><td>${kst(mm.updated)} (${ago(mm.updated)})</td></tr><tr><th>AI 분석 이슈</th><td>${num(mm.ai)} / ${num(mm.issues)}</td></tr><tr><th>흐름(네이버 검색)</th><td>${num(mm.flow)}개 이슈</td></tr><tr><th>검색어 분석</th><td>${num(mm.trends)}개</td></tr><tr><th>용어</th><td>${num(mm.words)}개</td></tr>
      <tr><th>사이트 반영</th><td>${L.overlay?`${num(L.overlay.matched)}개 매칭 (${kst(L.overlay.updated)})`:'—'}</td></tr></table>
      <p class="fine">매일 03:30 KST 실행(Apple 온디바이스 모델). 30시간 넘게 갱신이 없으면 경고로 바뀌어요.</p></section>
    <section class="card"><h2 style="margin-top:0">AI·검색 상태</h2>
      <table class="tbl"><tr><th>백엔드</th><td>${esc(L.backend||'—')} ${L.enabled?'<span class="pill ok">켜짐</span>':'<span class="pill">꺼짐</span>'}</td></tr><tr><th>모델</th><td>${esc(L.model||'—')} <span class="mute">${esc(L.endpoint||'')}</span></td></tr>
      <tr><th>이번 호출</th><td>${num(L.calls)}회${L.retries?` <span class="mute">(재시도 ${num(L.retries)}회)</span>`:''}</td></tr>${(L.errors||[]).length?`<tr><th>AI 오류</th><td>${esc(hum(L.errors[0]))}${L.errors.length>1?` <span class="mute">외 ${L.errors.length-1}건</span>`:''}</td></tr>`:''}<tr><th>네이버 검색(Actions)</th><td>${L.naver_search?'<span class="pill ok">가능</span>':'<span class="pill bad">차단 → 구글 뉴스 대체</span>'}</td></tr></table></section>
  </div>
  <h2>일별 수집량 <small>최근 60일 · 실행마다 모인 기사 합</small></h2><div class="card">${chart(S.daily||[])}</div>
  <h2>GitHub Actions 실행 <small>공개 API · 시간당 60회 제한</small></h2><div class="card scroll" id="runs"><p class="mute">불러오는 중…</p></div>
  <h2>소스별 성공·실패 <small>이번 실행</small></h2><div class="card scroll">${srcTable(S.sources||{})}</div>
  <h2>오류 로그 <small>최근 60건</small></h2><div class="card scroll">${errTable(S.errors||[])}</div>
  <h2>저장소 용량</h2><div class="card scroll"><table class="tbl">${Object.entries(sz).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td class="n">${bytes(v)}</td><td style="width:40%"><div class="bar"><i style="width:${tot?Math.max(1,v/tot*100):0}%;background:#2f6bff"></i></div></td></tr>`).join('')}</table></div>
  <h2>데이터 탐색</h2><div class="card"><div class="row" style="margin-bottom:.6rem"><select id="dsel" aria-label="데이터 파일"><option value="data/today.json">today.json (오늘)</option><option value="data/global.json">global.json (해외)</option><option value="data/status.json">status.json (상태)</option><option value="data/archive/index.json">archive/index.json</option></select><input id="dq" placeholder="검색어(키·값)" aria-label="검색"></div><div class="json" id="dv"></div></div>
  <h2>설정</h2><div class="card"><form id="pf" style="flex-wrap:wrap"><input type="password" id="p0" placeholder="현재 비밀번호" autocomplete="current-password" aria-label="현재 비밀번호"><input type="password" id="p1" placeholder="새 비밀번호(4자 이상)" autocomplete="new-password" aria-label="새 비밀번호"><input type="password" id="p2" placeholder="새 비밀번호 확인" autocomplete="new-password" aria-label="새 비밀번호 확인"><button>변경</button></form><p class="err" id="perr" role="status"></p>
  <p class="fine">비밀번호는 이 기기 브라우저에만 저장돼요(다른 기기는 초기 비밀번호 그대로). 브라우저 데이터를 지우면 초기값으로 돌아가요.</p></div>`;
  runs();explorer();window.renderDash&&renderDash(document.getElementById('dash'));
  $('#pf').onsubmit=async e=>{e.preventDefault();const p=$('#perr');if(await h($('#p0').value)!==cur())return p.textContent='현재 비밀번호가 달라요.';if($('#p1').value.length<4)return p.textContent='4자 이상으로 정해주세요.';if($('#p1').value!==$('#p2').value)return p.textContent='새 비밀번호가 서로 달라요.';
    const n=await h($('#p1').value);localStorage.setItem('nb-admin-hash',n);sessionStorage.setItem('nb-admin-ok',n);p.style.color='var(--ok)';p.textContent='바꿨어요. 이 기기에서만 적용돼요.';e.target.reset()};
}
function chart(d){if(!d.length)return'<p class="mute">아직 기록이 없어요. 실행이 쌓이면 그려져요.</p>';
  const W=Math.max(320,d.length*22),H=150,mx=Math.max(...d.map(x=>x.articles),1),bw=Math.min(W/d.length,48);
  return`<div class="scroll"><svg class="chart" viewBox="0 0 ${W} ${H}" style="min-width:${Math.min(W,600)}px" role="img" aria-label="일별 수집 기사 수">${d.map((x,i)=>{const bh=(H-30)*x.articles/mx;return`<g><title>${x.date} · 기사 ${num(x.articles)} · 실행 ${x.runs}회 · 실패 ${x.fail}</title><rect x="${i*bw+3}" y="${H-18-bh}" width="${bw-6}" height="${bh}" rx="3" fill="${x.fail>x.ok*.2?'#f08a00':'#0f1630'}"/>${d.length<=14||i%Math.ceil(d.length/10)===0?`<text x="${i*bw+bw/2}" y="${H-5}" text-anchor="middle">${x.date.slice(5)}</text>`:''}</g>`}).join('')}</svg></div>`}
function srcTable(s){const e=Object.entries(s).sort((a,b)=>(b[1].ok+b[1].fail)-(a[1].ok+a[1].fail));if(!e.length)return'<p class="mute">기록 없음</p>';
  return`<table class="tbl"><tr><th>소스(호스트)</th><th>단계</th><th class="n">성공</th><th class="n">실패</th><th>성공률</th></tr>${e.map(([k,v])=>{const r=v.ok/(v.ok+v.fail||1)*100;return`<tr><td class="w">${esc(k)}</td><td>${v.steps.map(esc).join(', ')}</td><td class="n">${num(v.ok)}</td><td class="n">${num(v.fail)}</td><td><div class="bar"><i style="width:${r}%;background:${r<50?'var(--bad)':r<90?'var(--warn)':'var(--ok)'}"></i></div><small>${r.toFixed(0)}%</small></td></tr>`}).join('')}</table>`}
function errTable(e){if(!e.length)return'<p class="mute">오류 없음 🎉</p>';return`<table class="tbl"><tr><th>시각</th><th>단계</th><th>호스트</th><th>내용</th></tr>${e.slice().reverse().map(x=>`<tr><td class="n">${esc(x.t)}</td><td>${esc(x.step)}</td><td class="w">${esc(x.host)}<br><small class="mute">${esc(x.path)}</small></td><td class="w">${esc(hum(x.err))}</td></tr>`).join('')}</table>`}
async function runs(){const el=$('#runs');try{const [a,c]=await Promise.all([j(`https://api.github.com/repos/${REPO}/actions/runs?per_page=20`),j(`https://api.github.com/repos/${REPO}/commits?sha=data&per_page=8`).catch(()=>[])]);
  const R=a.workflow_runs||[];const okn=R.filter(r=>r.conclusion==='success').length;
  el.innerHTML=`<p class="mute" style="margin-top:0">최근 ${R.length}회 중 성공 ${okn}회</p><table class="tbl"><tr><th>시작</th><th>워크플로</th><th>트리거</th><th>결과</th><th class="n">소요</th></tr>${R.map(r=>{const d=(new Date(r.updated_at)-new Date(r.run_started_at||r.created_at))/1e3;const cl=r.status!=='completed'?'run':r.conclusion==='success'?'ok':'bad';
    return`<tr><td class="n">${kst(r.run_started_at||r.created_at)}</td><td>${esc(r.name)}</td><td>${esc(r.event)}</td><td><a href="${esc(r.html_url)}" target="_blank" rel="noopener"><span class="pill ${cl}">${esc(r.status!=='completed'?r.status:r.conclusion)}</span></a></td><td class="n">${d>0?Math.round(d/60)+'분':'—'}</td></tr>`}).join('')}</table>
    <h3 style="font-size:.85rem;margin:1rem 0 .3rem">data 브랜치 최근 커밋 <small class="mute">(맥미니 반영 확인용)</small></h3><table class="tbl">${(c||[]).map(x=>`<tr><td class="n">${kst(x.commit.author.date)}</td><td>${esc(x.commit.author.name)}</td><td class="w">${esc(x.commit.message.split('\n')[0])}</td></tr>`).join('')}</table>`}
  catch(e){el.innerHTML=`<p class="err">GitHub API를 불러오지 못했어요(${esc(e.message)}). 공개 API는 IP당 시간당 60회라 잠시 뒤 다시 열어보세요.</p><p><a href="https://github.com/${REPO}/actions" target="_blank" rel="noopener">Actions 페이지 열기 →</a></p>`}}
async function explorer(){const sel=$('#dsel'),q=$('#dq'),v=$('#dv');
  try{const ix=await j('../data/archive/index.json');const days=(Array.isArray(ix)?ix:(ix.days||Object.keys(ix))).map(x=>typeof x==='string'?x:x.date).filter(Boolean).slice(-60).reverse();days.forEach(d=>sel.insertAdjacentHTML('beforeend',`<option value="data/archive/${esc(d)}.json">archive/${esc(d)}.json</option>`))}catch(e){}
  let data=null;const load=async()=>{v.textContent='불러오는 중…';try{data=await j('../'+sel.value);draw()}catch(e){v.textContent='불러오지 못했어요: '+e.message}};
  const draw=()=>{const k=q.value.trim().toLowerCase();v.innerHTML=tree(data,k,0,'')};
  sel.onchange=load;let t;q.oninput=()=>{clearTimeout(t);t=setTimeout(draw,200)};load()}
function hit(o,k){if(!k)return true;try{return JSON.stringify(o).toLowerCase().includes(k)}catch(e){return false}}
function tree(o,k,d,name){const lab=name?`<span class="k">${esc(name)}</span>: `:'';
  if(o===null||typeof o!=='object'){const s=typeof o==='string'?`<span class="s">"${esc(o.length>300?o.slice(0,300)+'…':o)}"</span>`:`<span class="num">${esc(o)}</span>`;const m=k&&String(o).toLowerCase().includes(k);return`<div class="${m?'hit':''}">${lab}${s}</div>`}
  const en=Array.isArray(o)?o.map((x,i)=>[i,x]):Object.entries(o);const sh=en.filter(([a,b])=>!k||String(a).toLowerCase().includes(k)||hit(b,k));
  const head=`${lab}${Array.isArray(o)?`[${o.length}]`:`{${en.length}}`}`;if(d>7)return`<div>${head} …</div>`;
  const lim=sh.slice(0,200);return`<details ${d<1||(k&&d<4)?'open':''}><summary>${head}${k?` <small class="mute">${sh.length}개 일치</small>`:''}</summary>${lim.map(([a,b])=>tree(b,k,d+1,String(a))).join('')}${sh.length>200?`<div class="mute">… ${sh.length-200}개 더</div>`:''}</details>`}

function hum(e){e=String(e||'');const c=(e.match(/^\s*(\d{3})\b/)||e.match(/"code":\s*(\d{3})/)||e.match(/HTTP Error (\d{3})/)||[])[1];
 const g=/gemini|generativelanguage|model/i.test(e)?'Gemini ':'';
 if(c==='503'||/UNAVAILABLE|high demand/i.test(e))return g+'일시 과부하 · 다음 수집에서 재시도';
 if(c==='429'||/RESOURCE_EXHAUSTED|quota/i.test(e))return g+'호출 한도 초과 · 한도 초기화 후 재개';
 if(c==='404')return g+'대상을 찾을 수 없음(모델·주소 변경 확인 필요)';
 if(c==='401'||c==='403')return '인증 거부(키 승인·권한 확인 필요)';
 if(/timed? ?out/i.test(e))return '응답 시간 초과 · 다음 수집에서 재시도';
 if(c&&+c>=500)return '서버 일시 오류('+c+') · 다음 수집에서 재시도';
 const m=e.match(/"message":\s*"([^"]{1,120})/);return m?m[1]:e.slice(0,140)}
