/* v2 홈: 인물 페이지 디자인 시스템 + 실제 공개 데이터 조합 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = (name, filled = false) => `<svg class="icon"><use href="#i-${name}${filled ? '-f' : ''}"></use></svg>`;
  const nf = n => Number(n || 0).toLocaleString('ko-KR');
  const catColor = {정치:'#2450e0',경제:'#138a52',사회:'#d33a3a',세계:'#7654e8','IT·과학':'#1686a8',과학:'#4868d8',건강:'#c24d6a',환경:'#2b9b68',문화:'#9257b7',연예:'#cc4a8b',스포츠:'#c87810'};
  const color = c => catColor[c] || '#6c717b';
  const imgStyle = u => u ? ` style="background-image:url('${esc(u)}')"` : '';
  const day = s => { if (!s) return ''; const d = new Date(s); return Number.isNaN(d.getTime()) ? String(s).slice(0,10).replaceAll('-','.') : d.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replaceAll(' ',''); };
  const short = (s, n = 100) => { const t = String(s || ''); return t.length > n ? `${t.slice(0,n-1)}…` : t; };
  const uniq = a => [...new Set((a || []).filter(Boolean))];
  const root = '../';
  const dataRoot = location.protocol === 'file:' ? 'https://pyw31337.github.io/news/data/' : '../data/';
  let V = null;

  function dataIssue(v, full) { const base = {id:v.id, title:v.title, category:v.cat, image:v.img, summary:v.summary || [], gallery:(v.imgs || []).map(img => ({img})), sources:[], flow:[], opinion:v.op, entities:v.ents || [], keywords:v.kw || [], past:[]}; const out = {...base, ...(full || {})}; if (v.flow?.length) out.flow = v.flow; out.flow_gap = v.flow_gap || ''; return out; }
  function heroImage(i) { return i.image || (i.gallery || [])[0]?.img || ''; }
  const genericTerms = new Set(['ai','뉴스','기사','논란','관련','오늘','현재','정부','한국','사람','이슈','사건','보도']);
  function issueTerms(i) {
    return uniq([...(i.keywords || []), ...(i.entities || []), ...String(i.title || '').split(/[\s·“”‘’'"…,:!?()[\]{}]+/)]).map(x => String(x).trim()).filter(x => x.length >= 2 && !genericTerms.has(x.toLowerCase()));
  }
  function relevance(item, terms) {
    const text = `${item.title || ''} ${item.body || ''} ${item.press || ''}`.toLowerCase();
    return terms.reduce((score, term) => score + (text.includes(term.toLowerCase()) ? (term.length >= 3 ? 2 : 1) : 0), 0);
  }
  function buildFlow(i) {
    if (Array.isArray(i.flow) && i.flow.length && !i.flow[0].items) return i.flow.slice().sort((a,b) => String(a.date).localeCompare(String(b.date))).slice(-8);
    const terms = issueTerms(i);
    const candidates = (i.flow || []).flatMap(x => (x.items || []).map(it => ({date:x.date, title:it.title, body:it.body, url:it.url || it.ourl, img:it.img, press:it.press})))
      .map(e => ({...e, score: relevance(e, terms)})).filter(e => e.score > 0);
    const bestByDate = new Map();
    candidates.forEach(e => { const prior = bestByDate.get(e.date) || null; if (!prior || e.score > prior.score) bestByDate.set(e.date, e); });
    const events = [...bestByDate.values()].sort((a,b) => String(a.date).localeCompare(String(b.date))).slice(-6);
    if (events.length >= 3) return events;
    const sources = (i.sources || []).map(s => ({date:s.time || s.t || '', title:s.title, body:s.body || s.press, url:s.url || s.ourl, img:s.img, press:s.press, score:relevance(s, terms)})).sort((a,b) => b.score - a.score || String(b.date).localeCompare(String(a.date)));
    return [...events, ...sources.filter(s => !events.some(e => e.title === s.title)).slice(0, 6 - events.length)].sort((a,b) => String(a.date).localeCompare(String(b.date)));
  }
  function reports(i) {
    const terms = issueTerms(i);
    const seen = new Set();
    return (i.sources || []).map(s => ({...s, _score: relevance(s, terms)})).sort((a,b) => b._score - a._score || String(b.time || b.t || '').localeCompare(String(a.time || a.t || ''))).filter(s => {
      const key = String(s.title || '').replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase();
      if (!key || seen.has(key)) return false; seen.add(key); return true;
    }).slice(0, 8);
  }
  function personFor(name, v) { return (v.people || []).find(p => p.n === name) || {}; }

  function render(V) {
    const vm = V.v2, full = V.full, issues = vm.issues || [];
    if (!issues.length) { $('#app').innerHTML = '<p class="empty">오늘 공개된 이슈 데이터가 아직 없습니다.</p>'; return; }
    const v = issues[0], i = dataIssue(v, (full.issues || []).find(x => x.id === v.id));
    const flow = buildFlow(i), reps = reports(i), currentSummary = (i.summary || v.summary || []).filter(Boolean).slice(0,3);
    const entities = uniq(i.entities || v.ents || []).slice(0,8);
    const sectors = Object.entries(full.sections || {}).filter(([k]) => k !== '주요').slice(0,5);
    const social = (V.social.posts || []).filter(p => p.cat === i.category || !i.category).slice(0,3);
    const people = (v.faces || []).slice(0,4);
    const past = (i.past || []).slice(0,2);
    const opinion = i.opinion || v.op || {};
    const topComment = Array.isArray(opinion.top) ? (opinion.top[0]?.text || opinion.top[0]?.body || '') : (opinion.top || '');
    const media = [...(i.gallery || []).map(g => ({img:g.img, url:g.url, title:g.press || '관련 이미지'})), ...(i.sources || []).filter(s => /영상|유튜브|youtube|클립/i.test(`${s.title || ''} ${s.kind || ''}`)).map(s => ({img:s.img, url:s.url, title:s.title}))].filter(x => x.img || x.url).slice(0,6);
    const currentRecord = {title:i.title, url:i.url || `${root}issue/${i.id}`, date:full.date};
    document.title = `NewsBoard v2 · ${short(i.title, 32)}`;
    $('#app').innerHTML = `
      <section class="section hero" id="issue">
        <div class="hero-media" style="--hero-cat:${color(i.category)}">${heroImage(i) ? `<img src="${esc(heroImage(i))}" alt="">` : ''}<span class="media-caption">${esc(i.category || '오늘의 이슈')} · ${day(full.updated || full.date)}</span></div>
        <div class="hero-copy"><span class="badge">${icon('trending-up', true)} ${esc(i.category || '핫이슈')}</span><h1>${esc(i.title)}</h1><p class="hero-lead">${esc((i.lead || currentSummary[0] || '오늘 가장 많이 주목받은 이슈의 핵심 흐름을 한 화면에 정리했습니다.'))}</p>
          <div class="meta"><span>${day(full.updated || full.date)}</span><span>${icon('news')} 보도 ${nf(i.presses || v.presses)}곳</span><span>${icon('message-circle')} ${nf((i.opinion || v.op || {}).total || v.comments)} 반응</span><span>화제도 ${nf(Math.round(v.score || i.score || 0))}</span></div>
          <div class="entity-strip">${entities.map(e => `<a class="entity-chip" href="${root}e/?k=${encodeURIComponent(e)}">${icon('bookmark')} ${esc(e)}</a>`).join('')}</div>
          ${currentSummary.length ? `<ul class="hero-summary">${currentSummary.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        </div>
      </section>
      <section class="section" id="flow"><div class="section-head"><div><div class="eyebrow">ISSUE CONTINUITY</div><h2>어떻게 이어졌나</h2></div><p>사건 단계별로 관련도가 검증된 원문만 시간순으로 연결했습니다.${i.flow_gap ? ` · ${esc(i.flow_gap)}` : ''}</p></div><div class="band"><div class="timeline-grid">${flow.map(e => `<article class="timeline-node"><i></i><time>${esc(day(e.date) || '날짜 미상')}</time><small class="timeline-stage">${esc(e.stage || '관련 보도')}</small><a href="${esc(e.url || '#')}" target="_blank" rel="noopener">${esc(e.title || '관련 보도')}</a><p>${esc(short(e.body || e.press || '', 110))}</p></article>`).join('')}</div></div></section>
      <section class="section" id="reports"><div class="section-head"><div><div class="eyebrow">PRIMARY REPORTS</div><h2>주요 보도</h2></div><p>같은 이슈를 원문·썸네일과 함께 비교합니다.</p><a class="more" href="${root}issue/${esc(i.id)}">전체 보도 보기 →</a></div>${reps.length ? `<div class="report-grid"><div class="report-list">${reps.slice(0,4).map(report).join('')}</div><div class="report-list">${reps.slice(4,8).map(report).join('')}</div></div>` : '<div class="empty">이 이슈의 세부 출처 목록을 준비 중입니다.</div>'}</section>
      ${past.length ? `<section class="section" id="quotes"><div class="section-head"><div><div class="eyebrow">PAST & CURRENT</div><h2>과거와 현재의 발언·기록</h2></div><p>같은 주제의 과거 기록과 현재 이슈를 나란히 확인합니다.</p></div><div class="quote-list">${past.map(p => `<div class="quote-row"><div class="person"><span class="avatar"${imgStyle((v.faces || [])[0]?.img)}></span><div><b>${esc((v.faces || [])[0]?.n || (i.entities || [])[0] || '관련 인물')}</b><small>관련 기록</small></div></div><a class="quote" href="${esc(p.url || '#')}" target="_blank" rel="noopener"><span class="tag">과거 · ${esc(day(p.date))}</span><p>“${esc(p.title)}”</p><small>원문 기록 보기 ↗</small></a><div class="quote-arrow">→</div><a class="quote" href="${esc(currentRecord.url || '#')}" target="_blank" rel="noopener"><span class="tag">현재 · ${esc(day(full.date))}</span><p>“${esc(i.title)}”</p><small>현재 이슈 보기 ↗</small></a></div>`).join('')}</div></section>` : ''}
      <section class="section dual" id="relations"><div><div class="section-head"><div><div class="eyebrow">RELATED PEOPLE & ORGS</div><h2>관련 인물·기관</h2></div></div><div class="relation"><div class="rel-col">${entities.slice(0,3).map(e => `<a class="rel-node" href="${root}e/?k=${encodeURIComponent(e)}"><b>${esc(e)}</b><small>이슈 엔티티 · 상세 보기</small></a>`).join('')}</div><div class="rel-center">${icon('hierarchy-2', true)}<br>${esc(short(i.title, 20))}</div><div class="rel-col">${(i.keywords || v.kw || []).slice(0,3).map(e => `<a class="rel-node" href="${root}e/?k=${encodeURIComponent(e)}"><b>${esc(e)}</b><small>핵심 키워드 · 관련 기사</small></a>`).join('')}</div></div></div><div id="social"><div class="section-head"><div><div class="eyebrow">LIVE REACTION</div><h2>지금 SNS에서</h2></div></div>${social.length ? `<div class="social-list">${social.map(p => `<article class="social"><span class="avatar"${imgStyle(p.avatar)}></span><div><b>${esc(p.name || p.handle || '공개 계정')}</b><small> ${esc(p.handle || '')} · ${esc(day(p.t))}</small><p>${esc(short(p.text_ko || p.text || '', 180))}</p><div class="social-actions"><span>${esc(p.net || 'SNS')}</span><a href="${esc(p.url || '#')}" target="_blank" rel="noopener">원문 참여 ↗</a></div></div></article>`).join('')}</div>` : `<div class="empty">현재 수집된 공개 SNS 반응이 없습니다.</div>`}</div></section>
      <section class="section reaction" id="sentiment"><div class="section-head"><div><div class="eyebrow">PUBLIC SENTIMENT</div><h2>민심과 댓글</h2></div><p>원문 댓글·반응에서 집계된 이슈별 여론을 요약합니다.</p></div><div class="sentiment-grid"><div class="sentiment-main"><div class="sentiment-bars"><div><span>공감·긍정</span><b>${nf(opinion.like || 0)}</b></div><i style="--w:${Math.min(100, Number(opinion.total) ? Math.round((Number(opinion.like || 0) / Number(opinion.total)) * 100) : 0)}%"></i><div><span>우려·비판</span><b>${nf(opinion.dislike || 0)}</b></div></div><p class="comment-top">“${esc(topComment || '대표 댓글이 아직 집계되지 않았습니다.') }”</p></div><div class="word-cloud">${(opinion.words || []).slice(0,8).map(w => `<span>${esc(Array.isArray(w) ? w[0] : w)}</span>`).join('') || '<span>댓글 키워드 수집 중</span>'}</div></div></section>
      ${media.length ? `<section class="section" id="media"><div class="section-head"><div><div class="eyebrow">MEDIA & VIDEO</div><h2>영상·현장 자료</h2></div><p>이슈를 다룬 대표 이미지와 영상 링크를 한곳에 모았습니다.</p></div><div class="media-grid">${media.map(m => `<a class="media-card" href="${esc(m.url || '#')}" target="_blank" rel="noopener"><span${imgStyle(m.img)}></span><b>${esc(m.title || '관련 자료')}</b></a>`).join('')}</div></section>` : ''}
      <section class="section" id="data"><div class="section-head"><div><div class="eyebrow">LATEST BY SECTOR</div><h2>분야별 주요 헤드라인</h2></div><p>메인 이슈와 독립적인 최신 분야 흐름입니다.</p></div><div class="sector-grid">${sectors.map(([name, list]) => `<article class="sector"><h3>${esc(name)} <small>${list.length}건</small></h3><p class="sector-note">오늘 수집된 대표 흐름</p>${(list || []).slice(0,2).map(x => `<a href="${esc(x.url || '#')}" target="_blank" rel="noopener">${esc(x.title)}<small>${esc(x.press || '')} · ${esc(day(x.time))}</small></a>`).join('')}</article>`).join('')}</div></section>
      <section class="section"><div class="section-head"><div><div class="eyebrow">TODAY IN NUMBERS</div><h2>오늘의 데이터</h2></div><p>수집 시점 ${esc(day(full.updated || full.date))}</p></div><div class="kpi-row"><div class="kpi"><small>오늘의 이슈</small><b>${nf(issues.length)}<em>건</em></b></div><div class="kpi"><small>수집 기사</small><b>${nf((full.stats || {}).naver || (vm.nums || {}).arts)}<em>건</em></b></div><div class="kpi"><small>언론사</small><b>${nf(i.presses || (vm.nums || {}).presses || 0)}<em>곳</em></b></div><div class="kpi"><small>누적 반응</small><b>${nf((i.opinion || {}).total || (vm.nums || {}).comments || 0)}<em>건</em></b></div></div></section>`;
  }
  function report(x) { return `<a class="report" href="${esc(x.url || '#')}" target="_blank" rel="noopener"><span class="report-thumb"${imgStyle(x.img)}></span><span><b>${esc(x.title || '')}</b><small>${esc(x.press || '')} · ${esc(x.kind || '원문')} · ${esc(day(x.time || x.t))}</small></span><span class="arrow">↗</span></a>`; }
  function setRegion(btn) { document.querySelectorAll('[data-region]').forEach(x => x.classList.toggle('is-on', x === btn)); try { const s=JSON.parse(localStorage.getItem('nb-settings')||'{}'); s.region=btn.dataset.region; localStorage.setItem('nb-settings',JSON.stringify(s)); } catch {} }
  function bind() { document.querySelectorAll('[data-region]').forEach(b => b.addEventListener('click', () => setRegion(b))); document.querySelectorAll('.main-nav a').forEach(a => a.addEventListener('click', e => { document.querySelectorAll('.main-nav a').forEach(x => x.classList.remove('is-on')); a.classList.add('is-on'); })); }
  function search() { const q = prompt('이슈·인물·키워드를 입력하세요'); if (!q) return; const hit = (V.v2.issues || []).find(i => `${i.title} ${(i.ents||[]).join(' ')} ${(i.kw||[]).join(' ')}`.includes(q)); if (hit) location.href = `${root}issue/${hit.id}`; else location.href = `${root}kw/${encodeURIComponent(q)}`; }
  Promise.all([fetch(`${dataRoot}today_v2.json`,{cache:'no-cache'}).then(r=>r.json()), fetch(`${dataRoot}today.json`,{cache:'no-cache'}).then(r=>r.json()), fetch(`${dataRoot}social.json`,{cache:'no-cache'}).then(r=>r.json()).catch(() => ({posts:[]}))]).then(([v2, full, social]) => { V = {v2, full, social}; render(V); bind(); $('#searchBtn')?.addEventListener('click', search); }).catch(() => { $('#app').innerHTML = '<p class="empty">데이터를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>'; });
})();
