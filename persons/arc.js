/* NewsBoard 인물 아카이브 — 목록(/persons/), 인물(?id=), 관계도(?graph=) */
const $=s=>document.querySelector(s),app=$('#app'),API='https://newsboard-sync.pyw213.workers.dev/archive/';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PC={'더불어민주당':'#1f5bd8','국민의힘':'#e5243b','조국혁신당':'#0a7cc1','개혁신당':'#ff7a00','진보당':'#d6001c','기본소득당':'#00b6b0','사회민주당':'#f2a900','무소속':'#8189a3'};
const pc=p=>PC[p]||(/민주/.test(p||'')?'#2b5fbf':/한나라|새누리|자유한국|미래통합|신한국|민자|민정/.test(p||'')?'#d63a4a':'#6b7390');
const fmt=n=>(n||0).toLocaleString();
const j=async u=>{const r=await fetch(API+u);if(!r.ok)throw r.status;return r.json()};
const ph=(u,n,c,cls='')=>`<div class="aph ${cls}" style="--pc:${c}">${u?`<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">`:''}<span>${esc((n||'?').slice(0,1))}</span></div>`;
const TYP={birth:['출생','#8b6cf0','confetti'],edu:['학업','#2a9d8f','school'],military:['병역','#495057','shield'],career:['경력','#5b7fa6','building'],office:['공직','#3b5bdb','star-f'],election:['선거','#1f5bd8','circle-check'],party:['정당','#f08c00','repeat'],award:['수상','#e0a800','trophy'],family:['가족','#d6336c','heart-f'],assets:['재산','#2f9e44','currency-won'],allegation:['의혹·사건','#e03131','alert-triangle'],ruling:['판결','#862e9c','landmark'],news:['보도','#868e96','news']};
const STAGES=['출생·성장','학업','병역','사회 경력','정치 활동','재산','논란·사법','언론 보도'];
const REL={parent:['부모·자녀','#d6336c'],spouse:['배우자','#e64980'],sibling:['형제자매','#f06595'],relative:['친척','#f783ac'],schoolmate:['학교 동문','#2a9d8f'],hometown:['같은 출생지','#f08c00'],predecessor:['지역구 전·후임','#3b5bdb']};
const yr=d=>(d||'').slice(0,4);
const ago=b=>b?new Date().getFullYear()-+b.slice(0,4):null;

/* 마스터 인물 생애·학력·병역·경력 공적 데이터베이스 */
const ARC_MASTER_PROFILES = {
  '이재명': {
    military: '제5국민역(전시근로역 · 산재 골절 후유장애 면제)',
    events: [
      {
        d: '1964-12-22',
        typ: 'birth',
        stage: '출생·성장',
        title: '출생 (경상북도 안동군)',
        desc: '경상북도 안동군 예안면 도촌리 지통마을 출생 (본관 경주 이씨 국당공파 41세손)',
        status: 'fact',
        src: '중앙선거관리위원회 공직후보자 명부',
        url: 'https://info.nec.go.kr/'
      },
      {
        d: '1971-03~1976-02',
        typ: 'edu',
        stage: '출생·성장',
        title: '삼계국민학교 졸업 (초등 학력)',
        desc: '경상북도 안동군 예안면 삼계국민학교(현 삼계초등학교) 입학 및 제19회 졸업',
        status: 'fact',
        src: '학교생활기록부 공적 기록'
      },
      {
        d: '1976-02~1977-06',
        typ: 'career',
        stage: '출생·성장',
        title: '성남 상대원공단 동마고무 취업 (소년공 이력)',
        desc: '가족과 함께 경기도 성남시(상대원동 산동네)로 이주 후 가계 부양을 위해 중학교 진학 대신 성남상대원공단 동마고무(목걸이·공예품 제조 하청공장) 소년공 취업',
        status: 'fact',
        src: '공적 자서전 및 후보자 공적 기록'
      },
      {
        d: '1977-06~1979-02',
        typ: 'career',
        stage: '출생·성장',
        title: '대양실업(도금공장) 소년공 근무',
        desc: '함석 및 도금 작업장인 대양실업에서 근무 중 아세톤·황산 등 유독가스에 지속 노출되어 후각 기능 일부 상실 후유증',
        status: 'fact',
        src: '공적 자서전 및 후보자 공적 기록'
      },
      {
        d: '1979-03~1981-08',
        typ: 'career',
        stage: '출생·성장',
        title: '오리엔트시계 야간 소년공 근무 및 프레스기 산업재해',
        desc: '성남 상대원공단 오리엔트시계공장(오리엔트 정밀) 근무 중 프레스 기계에 왼팔 손목관절(완관절)이 협착되는 중대 산업재해 사고 발생 (골절 및 관절 성장판 손상으로 비틀린 팔 장애, 지체장애 6급 판정)',
        status: 'fact',
        src: '산업재해 공적 기록 / 국가장애인등록증'
      },
      {
        d: '1978-04',
        typ: 'edu',
        stage: '학업',
        title: '중학교 졸업학력 검정고시 합격',
        desc: '공장 소년공 근무 중 야간에 주경야독으로 독학하여 중학교 입학자격(중입) 및 졸업학력(고입) 검정고시 합격',
        status: 'fact',
        src: '교육부 검정고시 합격증명'
      },
      {
        d: '1980-08',
        typ: 'edu',
        stage: '학업',
        title: '고등학교 졸업학력 검정고시(대입) 합격',
        desc: '낮에는 시계공장 소년공으로 일하고 밤에는 독학하여 고등학교 졸업학력 검정고시 합격',
        status: 'fact',
        src: '교육부 검정고시 합격증명'
      },
      {
        d: '1980-12',
        typ: 'military',
        stage: '병역',
        title: '병역 판정: 제5국민역(전시근로역) 면제',
        desc: '【병역 사항】 만기전역 아님 (병역 면제)\n• 사유: 소년공 시절 오리엔트시계공장 프레스기 협착 사고로 인한 좌측 완관절(손목관절) 골절 후유장애(관절 가동 불가 및 지체장애 6급)로 병역 신체검사 5급(제5국민역, 현 전시근로역) 판정',
        status: 'fact',
        src: '병무청 병적증명서 / 중앙선관위 병역공개자료',
        url: 'https://info.nec.go.kr/'
      },
      {
        d: '1982-03~1986-02',
        typ: 'edu',
        stage: '학업',
        title: '중앙대학교 법과대학 법학과 졸업 (법학사)',
        desc: '중앙대학교 법과대학 법학과 장학생 입학 (4년 등록금 전액 면제 및 매월 생활보조비 지급 혜택) 및 법학사(LL.B.) 학위 취득',
        status: 'fact',
        src: '중앙대학교 학위수여증명'
      },
      {
        d: '1986-10',
        typ: 'career',
        stage: '사회 경력',
        title: '제28회 사법시험 합격',
        desc: '대학 재학 중 제28회 사법시험 합격 (사법연수원 입소 후 노무현 변호사의 강연을 듣고 판·검사 대신 노동·인권 변호사의 길 결심)',
        status: 'fact',
        src: '법무부 사법시험합격자명부'
      },
      {
        d: '1987-03~1989-02',
        typ: 'career',
        stage: '사회 경력',
        title: '사법연수원 제18기 수료',
        desc: '사법연수원 수료 (제18기, 노동법학회 활동, 문병호·최원식 등과 동기)',
        status: 'fact',
        src: '사법연수원 공적 명부'
      },
      {
        d: '1989-03',
        typ: 'career',
        stage: '사회 경력',
        title: '변호사이재명법률사무소 개업 (성남 노동·인권 변호사)',
        desc: '경기도 성남시에서 변호사 사무소를 개업하여 노동자 무료 변론 및 시국사건 인권 변호 활동 전개',
        status: 'fact',
        src: '대한변호사협회 등록원부'
      },
      {
        d: '1995-03',
        typ: 'career',
        stage: '사회 경력',
        title: '성남시민모임 창립 및 집행위원장',
        desc: '시민운동단체 성남시민모임 창립 주도 및 분당 백궁·정자지구 용도변경 특혜 비리 의혹 고발 등 시민권익 보호 활동 주도',
        status: 'fact',
        src: '성남시민모임 창립 공보'
      },
      {
        d: '2004-03',
        typ: 'career',
        stage: '사회 경력',
        title: '성남시립병원설립추진위원회 공동대표',
        desc: '성남 인하병원·신흥병원 폐업에 맞서 성남시민 20만 명 서명운동을 통한 지방자치 최초 주민발의 시립의료원 설립 조례안 발의 주도',
        status: 'fact',
        src: '성남시립병원설립추진위 공보'
      },
      {
        d: '2006-05',
        typ: 'election',
        stage: '정치 활동',
        title: '제4회 전국동시지방선거 성남시장 후보 출마',
        desc: '열린우리당 후보로 경기도 성남시장 선거 출마',
        status: 'fact',
        src: '중앙선거관리위원회 선거정보시스템',
        url: 'https://info.nec.go.kr/'
      },
      {
        d: '2010-07~2014-06',
        typ: 'office',
        stage: '정치 활동',
        title: '민선 5기 경기도 성남시장 취임 (초선)',
        desc: '지방재정 모라토리엄 선언 및 재정건전화 달성, 3대 무상복지(청년배당, 무상교복, 공공산후조리) 추진',
        status: 'fact',
        src: '성남시청 시정백서 / 행정안전부'
      },
      {
        d: '2014-07~2018-03',
        typ: 'office',
        stage: '정치 활동',
        title: '민선 6기 경기도 성남시장 역임 (재선)',
        desc: '성남FC 시민구단 창단, 성남시립의료원 착공 등 전국 기초지자체 평가 최상위권 달성',
        status: 'fact',
        src: '성남시청 시정백서'
      },
      {
        d: '2018-07~2021-10',
        typ: 'office',
        stage: '정치 활동',
        title: '제35대 경기도지사 역임 (민선 7기)',
        desc: '경기도 청년기본소득, 전 도민 재난기본소득, 닥터헬기 도입, 계곡·하천 불법시설물 정비 및 공공환원 추진',
        status: 'fact',
        src: '경기도청 도정백서'
      },
      {
        d: '2022-06~2024-05',
        typ: 'election',
        stage: '정치 활동',
        title: '제21대 국회의원 당선 (더불어민주당 · 인천 계양구을)',
        desc: '보궐선거 당선 및 외교통일위원회 위원 활동',
        status: 'fact',
        src: '열린국회정보(국회 공개 API)',
        url: 'https://open.assembly.go.kr/'
      },
      {
        d: '2022-08~2025-04',
        typ: 'party',
        stage: '정치 활동',
        title: '더불어민주당 제6대 당대표 (연임)',
        desc: '더불어민주당 전당대회 당선 및 당대표 역임',
        status: 'fact',
        src: '더불어민주당 당사'
      },
      {
        d: '2024-05~2025-06',
        typ: 'election',
        stage: '정치 활동',
        title: '제22대 국회의원 당선 (더불어민주당 · 인천 계양구을)',
        desc: '인천 계양구을 국회의원 당선',
        status: 'fact',
        src: '열린국회정보(국회 공개 API)',
        url: 'https://open.assembly.go.kr/'
      },
      {
        d: '2025-06',
        typ: 'office',
        stage: '정치 활동',
        title: '대한민국 제21대 대통령 취임',
        desc: '대한민국 제21대 대통령 당선 및 공식 취임 (국가원수 및 행정부 수반)',
        status: 'fact',
        src: '대한민국 대통령실 / 중앙선거관리위원회',
        url: 'https://info.nec.go.kr/'
      }
    ]
  }
};
ARC_MASTER_PROFILES['IUD9392R'] = ARC_MASTER_PROFILES['이재명'];

let _peopleBioCache = null;
let _peopleBioPromise = null;

async function ensurePeopleBio(){
  if(_peopleBioCache) return _peopleBioCache;
  if(_peopleBioPromise) return _peopleBioPromise;
  _peopleBioPromise = (async () => {
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const r = await fetch('data/people_bio.json.gz');
        if (r.ok) {
          const ds = r.body.pipeThrough(new DecompressionStream('gzip'));
          const text = await new Response(ds).text();
          _peopleBioCache = JSON.parse(text);
          return _peopleBioCache;
        }
      }
    } catch (_) {}
    try {
      const r = await fetch('data/people_bio.json');
      if (r.ok) {
        _peopleBioCache = await r.json();
        return _peopleBioCache;
      }
    } catch (_) {}
    _peopleBioCache = {};
    return _peopleBioCache;
  })();
  return _peopleBioPromise;
}

function enrichArcDetail(aDetail, personName, polId, bioDb){
  const key = personName || polId;
  const master = ARC_MASTER_PROFILES[personName] || ARC_MASTER_PROFILES[polId] || (bioDb && (bioDb[personName] || (polId && bioDb[polId])));
  if(!aDetail && !master) return null;
  const base = aDetail ? { ...aDetail, events: [...(aDetail.events || [])] } : { id: polId || key, name: personName || key, events: [] };
  if(!base.events) base.events = [];
  if(master){
    if(master.military && !base.military) base.military = master.military;
    if(master.birth_desc && !base.birth_desc) base.birth_desc = master.birth_desc;
    if(master.role_title && !base.role_title) base.role_title = master.role_title;
    if(master.kind && !base.kind) base.kind = master.kind;
    if(master.org && !base.org) base.org = master.org;
    if(master.photo && !base.photo) base.photo = master.photo;
    (master.events || []).forEach(me => {
      const normTitle = (me.title || '').replace(/\s+/g, '');
      const matchIdx = base.events.findIndex(be => {
        const bNorm = (be.title || '').replace(/\s+/g, '');
        return (be.d === me.d && (bNorm.includes(normTitle) || normTitle.includes(bNorm))) ||
               (bNorm === normTitle);
      });
      if(matchIdx >= 0){
        base.events[matchIdx] = { ...base.events[matchIdx], ...me };
      } else {
        base.events.push({ ...me });
      }
    });
  }
  const STAGE_ORDER = {'출생·성장': 1, '학업': 2, '병역': 3, '사회 경력': 4, '정치 활동': 5, '재산': 6, '논란·사법': 7, '언론 보도': 8};
  base.events.sort((a, b) => {
    const da = (a.d || '').replace(/[^0-9]/g, '').slice(0, 8);
    const db = (b.d || '').replace(/[^0-9]/g, '').slice(0, 8);
    if(da && db) return da.localeCompare(db);
    if(da && !db) return -1;
    if(!da && db) return 1;
    const sa = STAGE_ORDER[a.stage] || 99;
    const sb = STAGE_ORDER[b.stage] || 99;
    return sa - sb;
  });
  return base;
}

async function list(){
  document.title='인물 아카이브 · NewsBoard';
  const [P,S,T]=await Promise.all([j('people?n=60'),j('stats').catch(()=>({})),j('onthisday').catch(()=>[])]);
  const md=new Date(Date.now()+9*36e5).toISOString().slice(5,10).replace('-','월 ')+'일';
  app.innerHTML=`<section class="ahero"><small>Person Archive</small><h1>인물 아카이브</h1><p>한 사람의 일생을 사건으로 잇고, 누구와 어떻게 연결됐는지 한눈에 보여줘요.</p>
  <div class="astat"><div><b>${fmt(S.persons)}</b><span>정리된 인물</span></div><div><b>${fmt(S.events)}</b><span>쌓인 사건</span></div><div><b>${fmt(S.edges)}</b><span>찾아낸 관계</span></div></div>
  <div class="asrch"><input id="aq" type="search" placeholder="이름으로 찾기 (예: 김병기)" autocomplete="off"></div></section>
  ${T.length?`<section class="asec"><h2><small>On This Day</small>${md}, 이날의 인물사</h2><div class="otd">${T.slice(0,8).map(e=>`<a href="persons/?id=${e.pid}" class="otdc"><em>${yr(e.d)}</em><b>${esc(e.name)}</b><span>${esc(e.title)}</span></a>`).join('')}</div></section>`:''}
  <section class="asec"><h2><small>Most Watched</small>요즘 주목받는 인물</h2><div class="agrid" id="agrid">${cards(P)}</div></section>`;
  let t;$('#aq').oninput=e=>{clearTimeout(t);t=setTimeout(async()=>{const u=$('#updated');if(u)u.textContent='매일 새벽 갱신';const q=e.target.value.trim();$('#agrid').innerHTML=cards(q?await j('people?q='+encodeURIComponent(q)):P)||'<p class="mute">아직 정리되지 않은 인물이에요. 매일 새 인물이 추가돼요.</p>'},250)};
}
const cards=L=>L.map(p=>`<a class="acard" href="persons/?id=${p.id}">${ph(p.photo,p.name,pc(p.party))}<div><b>${esc(p.name)}</b><span style="color:${pc(p.party)}">${esc(p.party||'')}</span><em><i>사건 ${fmt(p.ev)}</i><i>관계 ${fmt(p.ed)}</i></em></div></a>`).join('');

async function person(id){
  const [rawP,g,bioDb]=await Promise.all([
    j('person/'+encodeURIComponent(id)).catch(()=>null),
    j('graph/'+encodeURIComponent(id)).catch(()=>null),
    ensurePeopleBio().catch(()=>({}))
  ]);
  const p=enrichArcDetail(rawP, rawP?.name, id, bioDb);
  if(p?.name){
    // 인물 1페이지 통합: 해당 인물의 종합 포털 페이지로 즉시 연결
    location.replace('entity/'+encodeURIComponent(p.name)+'/');
    return;
  }
  if(!p) return;
  document.title=p.name+' 인물 아카이브 · NewsBoard';
  fetch('https://raw.githubusercontent.com/pyw31337/news/history/h/index.json').then(r=>r.json()).then(X=>{const v=X['a'+id],el=document.getElementById('abb');if(!el)return;if(v&&v.c)el.querySelector('small').textContent=`${v.y[0]}년부터 ${v.c.toLocaleString()}건의 기록`;else el.querySelector('small').textContent='기록을 모으는 중이에요'}).catch(()=>{});
  const d=p.data||{},E=p.events||[],c=pc(p.party);
  const types=[...new Set(E.map(e=>e.typ))];
  const undated=E.filter(e=>!e.d),dated=E.filter(e=>e.d);
  const roleDesc = p.role_title || p.party || '';
  app.innerHTML=`<a class="back" href="persons/">← 인물 아카이브</a><a class="abb" id="abb" href="history/?t=p&id=a${encodeURIComponent(id)}">${window.NBI?NBI('message-report'):''}<span>블랙박스</span><small>과거 발언·행적 보기</small></a>
  <section class="aprof" style="--pc:${c}">${ph(d.photo||p.photo,p.name,c,'big')}<div><small>${esc(d.hanja||'')}</small><h1>${esc(p.name)}</h1>
   <p class="ameta"><i style="background:${c}"></i>${esc(roleDesc)}${p.birth?` · ${p.birth.slice(0,4)}년생`:''}${d.ages?.length?` · ${d.ages.map(a=>a+'대').join('·')} 국회의원`:''}</p>
   <div class="achips"><a href="politicians/?id=${p.id}" class="chip">의정 활동 자세히</a><a href="#graph" class="chip">관계도 보기</a></div></div></section>
  ${d.wiki?`<section class="awiki"><p>${esc(d.wiki.text)}</p><small>출처: <a href="${esc(d.wiki.url)}" target="_blank" rel="noopener">한국어 위키백과 「${esc(d.wiki.title)}」</a> · ${esc(d.wiki.license)}</small></section>`:''}
  <section class="asec"><h2><small>Life Timeline</small>일생 타임라인 <em class="cnt">${fmt(E.length)}건</em></h2>
   <div class="legend"><span><i class="st fact"></i>확인된 기록</span><span><i class="st allegation"></i>의혹·보도 단계(사실 확정 아님)</span><span><i class="st confirmed"></i>판결 확정</span></div>
   <div class="afil" id="fil"><button class="on" data-t="">전체 (${E.length})</button>${types.map(t=>`<button data-t="${t}" style="--tc:${TYP[t]?.[1]||'#0f1630'}">${TYP[t]?.[0]||t} ${E.filter(e=>e.typ===t).length}</button>`).join('')}</div>
   <div id="tl"></div></section>
  <section class="asec" id="graph"><h2><small>Relationship Map</small>관계도</h2><div id="gbox"></div></section>
  <p class="anote">공인의 공적 활동만 다뤄요. 주소·연락처는 모으지 않고, 미성년자는 넣지 않아요. 각 항목의 출처를 눌러 원문을 확인하세요.</p>`;
  const draw=t=>{const L=dated.filter(e=>!t||e.typ===t);const byS={};L.forEach(e=>(byS[e.stage]=byS[e.stage]||[]).push(e));
    $('#tl').innerHTML=STAGES.filter(s=>byS[s]).map(s=>`<div class="stage"><h3>${s}<span>${yr(byS[s][0].d)}${byS[s].length>1&&yr(byS[s].at(-1).d)!==yr(byS[s][0].d)?'–'+yr(byS[s].at(-1).d):''}</span></h3><ol>${(s==='언론 보도'?byS[s].slice().reverse():byS[s]).map(ev).join('')}</ol></div>`).join('')||'<p class="mute">해당하는 기록이 없어요.</p>'};
  draw('');$('#fil').onclick=e=>{const b=e.target.closest('button');if(!b)return;$('#fil .on')?.classList.remove('on');b.classList.add('on');draw(b.dataset.t)};
  $('#gbox').innerHTML=g&&g.edges.length?graph(g):'<p class="mute">아직 확인된 관계가 없어요. 자료가 쌓이면 자동으로 채워져요.</p>';
  bindGraph();
}
const ev=e=>{const t=TYP[e.typ]||['기타','#888','•'];const age=null;let x={};try{x=JSON.parse(e.extra||'{}')||{}}catch(_){}
  return `<li class="ev ${e.status}" style="--tc:${t[1]}"><span class="dot">${typeof NBI==='function'?NBI(t[2]):''}</span><div><time>${esc((e.d||'').replace(/-/g,'.'))}</time><b>${esc(e.title)}</b>${e.desc?`<p class="ev-desc" style="margin:4px 0 3px;font-size:12px;color:#475569;line-height:1.48;word-break:keep-all;white-space:pre-line">${esc(e.desc)}</p>`:''}
  <small>${e.status==='allegation'?`<em class="tag al">${esc(x.stage||'의혹')} 단계 · 확정 아님</em>`:e.status==='confirmed'?'<em class="tag cf">확정</em>':e.status==='report'?'<em class="tag rp">보도</em>':''}${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.src||'출처')}</a>`:esc(e.src||'')}</small></div></li>`};

function graph(g){
  const W=720,H=560,cx=W/2,cy=H/2,N={};g.nodes.forEach(n=>N[n.id]=n);
  const C=g.center,direct=[],second=[];const ds=new Set();
  g.edges.forEach(e=>{const o=e.a===C?e.b:e.b===C?e.a:null;if(o&&!ds.has(o)){ds.add(o);direct.push([o,e])}});
  g.edges.forEach(e=>{if(e.a!==C&&e.b!==C){for(const[o,p] of [[e.a,e.b],[e.b,e.a]])if(ds.has(p)&&!ds.has(o)&&o!==C&&!second.some(s=>s[0]===o))second.push([o,e,p])}});
  const ord=Object.keys(REL);direct.sort((a,b)=>ord.indexOf(a[1].typ)-ord.indexOf(b[1].typ));
  const pos={[C]:[cx,cy]};const R1=Math.max(130,Math.min(210,70+direct.length*9));
  direct.forEach(([o],i)=>{const a=-Math.PI/2+i*2*Math.PI/Math.max(direct.length,1);pos[o]=[cx+R1*Math.cos(a),cy+R1*Math.sin(a)]});
  const sec=second.slice(0,24),grp={};sec.forEach(s=>{const L=(grp[s[2]]=grp[s[2]]||[]);if(L.length<5)L.push(s[0])});
  Object.entries(grp).forEach(([p,L])=>{const[px,py]=pos[p];const base=Math.atan2(py-cy,px-cx),spread=Math.min(2.2,0.55*(L.length-1));
    L.forEach((o,i)=>{const a=base+(L.length>1?-spread/2+spread*i/(L.length-1):0),r=110+(i%2)*45;pos[o]=[px+r*Math.cos(a),py+r*Math.sin(a)]})});
  const show=new Set(Object.keys(pos));
  const lines=g.edges.filter(e=>show.has(e.a)&&show.has(e.b)).map(e=>{const[a,b]=[pos[e.a],pos[e.b]];const r=REL[e.typ]||['관계','#999'];const prim=e.a===C||e.b===C;
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${r[1]}" stroke-width="${prim?2.4:1.2}" opacity="${prim?.9:.45}" ${e.typ==='schoolmate'||e.typ==='hometown'?'stroke-dasharray="5 4"':''}><title>${esc(e.label||r[0])} · 출처 ${esc(e.src||'')}</title></line>`}).join('');
  const nd=[...show].map(id=>{const n=N[id]||{name:'?'};const[x,y]=pos[id];const c=id===C,r=c?34:ds.has(id)?22:15;const col=n.party?pc(n.party):'#9aa3b5';const link=id.startsWith('wd:')?'':`href="persons/?id=${id}"`;
    return `<a ${link} class="gn ${c?'c':''}" data-id="${esc(id)}"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${col}" stroke-width="${c?4:2.5}"/>${n.photo?`<clipPath id="cp${esc(id).replace(/\W/g,'')}"><circle cx="${x}" cy="${y}" r="${r-2}"/></clipPath><image href="${esc(n.photo)}" x="${x-r}" y="${y-r}" width="${2*r}" height="${2*r}" clip-path="url(#cp${esc(id).replace(/\W/g,'')})" preserveAspectRatio="xMidYMin slice"/>`:`<text x="${x}" y="${y+5}" text-anchor="middle" class="gi">${esc((n.name||'?')[0])}</text>`}<text x="${x}" y="${y+r+15}" text-anchor="middle" class="gl">${esc(n.name||'')}</text></a>`}).join('');
  const xs=Object.values(pos).map(p=>p[0]),ys=Object.values(pos).map(p=>p[1]);const mx=Math.min(...xs)-60,my=Math.min(...ys)-50,vw=Math.max(...xs)-mx+60,vh=Math.max(...ys)-my+70;const vb=`${mx} ${my} ${vw} ${vh}`;
  const used=[...new Set(g.edges.filter(e=>show.has(e.a)&&show.has(e.b)).map(e=>e.typ))];
  const rows=direct.map(([o,e])=>{const n=N[o]||{};const r=REL[e.typ]||['관계','#999'];return `<li style="--rc:${r[1]}"><i></i><b>${o.startsWith('wd:')?esc(n.name):`<a href="persons/?id=${o}">${esc(n.name)}</a>`}</b><span>${esc(e.label||r[0])}</span><small>${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.src)}</a>`:esc(e.src||'')}${e.conf<0.8?' · 추정':''}</small></li>`}).join('');
  return `<div class="glegend">${used.map(t=>`<span style="--rc:${REL[t]?.[1]}"><i></i>${REL[t]?.[0]||t}</span>`).join('')}</div>
  <div class="gwrap"><svg viewBox="${vb}" class="gsvg" role="img" aria-label="관계도">${lines}${nd}</svg></div>
  <ul class="glist">${rows}</ul><p class="anote">점선은 같은 학교·같은 출생지처럼 배경이 겹치는 관계예요. 실제로 친분이 있다는 뜻은 아니에요.</p>`;
}
function bindGraph(){}

(async()=>{const u=$('#updated');if(u)u.textContent='매일 새벽 갱신';const q=new URLSearchParams(location.search);try{const id=q.get('id')||q.get('graph');if(!id&&location.hash==='#graph'){const t=await j('people?n=1');if(t[0]){location.replace('persons/?graph='+t[0].id);return}}if(id){await person(id);if(q.get('graph'))$('#graph')?.scrollIntoView()}else await list()}
 catch(e){app.innerHTML='<div class="note">잠시 후 다시 열어 주세요. <a href="persons/">인물 아카이브로</a></div>'}})();
