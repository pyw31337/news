/* 시안 C · 컴팩트 프로필 + 고정 목차: 각 섹션은 요약 한 줄(수치·그래프) → 펼치면 전체 */
(async () => {
  const D = await NB.load(), X = NB.derive(D), P = D.profile, { esc, ic, num } = NB;
  const last = X.last, prev = X.prev, chg = last.total - prev.total;
  const SEC = [];
  const add = (id, title, icon, count, body) => SEC.push({ id, title, icon, count, html: `<section class="sec" id="${id}">${NB.sh(title, { icon, count })}${body}</section>` });
  /* 한눈에 */
  add('s-sum', '한눈에', 'layout-grid', null, `<div class="lead">
      ${NB.stat('생애 기록', D.events.length, '건', '1964년부터')}
      ${NB.stat('수집 보도', num(D.articles_total), '건', `${num(D.press_count)}개 언론사`)}
      ${NB.stat('관계', D.relations_people, '명', `${X.relCats.length}개 분류`)}
      ${NB.stat('신고 재산', NB.eok1(last.total), '원', `전년 대비 <span class="neg">${NB.eok1(chg)}</span>`)}
    </div>${NB.era(D, 'list')}`);
  /* 연대기 */
  const cnt = NB.FILTERS.map(([n, f]) => [n, D.events.filter(f).length]);
  const ev = D.events.slice().reverse();
  add('s-tl', '생애 연대기', 'timeline-event', D.events.length + '건', `<div style="margin-bottom:var(--s-6)">${NB.seg('tl', cnt)}</div>
    <div id="tlv">${NB.tl(ev.slice(0, 6))}</div>${NB.exp('이전 기록', (ev.length - 6) + '건', `<div id="tlr">${NB.tl(ev.slice(6))}</div>`, false, 'tlx')}`);
  /* 의정 */
  const br = D.bills.by_result, vt = Object.entries(D.votes.summary);
  const vsum = Object.values(D.votes.summary).reduce((a, v) => { for (const k in v) a[k] = (a[k] || 0) + v[k]; return a; }, {});
  add('s-pol', '의정 활동', 'building-bank', `제${P.ages.join('·')}대`, `<div class="lead">
      ${NB.stat('대표 발의', D.bills.lead_count, '건', `대안 반영 ${br['대안반영폐기'] || 0} · 계류 ${br['계류'] || 0}`)}
      ${NB.stat('공동 발의', D.bills.co_count, '건', '제22대')}
      ${NB.stat('본회의 표결', num(D.votes.count), '건', `찬성 ${Math.round(vsum['찬성'] / D.votes.count * 100)}%`)}
      ${NB.stat('반대·기권', D.votes.dissent.length, '건', '소신 표결')}
    </div>
    <div class="two">${vt.map(([age, v]) => `<div><h3 class="sub-t">제${age}대 표결 <small>${num(Object.values(v).reduce((a, b) => a + b, 0))}건</small></h3>${NB.stack(NB.voteParts(v).filter(p => p[1]))}</div>`).join('')}</div>
    ${NB.exp('법안·안건 전체', (D.bills.recent.length + D.votes.dissent.length) + '건', `<div class="two"><div><h3 class="sub-t">대표 발의 법안</h3>${D.bills.recent.map(b => `<a class="brow" href="${esc(b.url)}" target="_blank" rel="noopener"><time>${NB.ymd(b.date)}</time><b>${esc(b.name)}<small>${esc(b.committee)}</small></b><span class="tag ${b.result === '계류' ? 'warn' : ''}">${esc(b.result === '대안반영폐기' ? '대안 반영' : b.result)}</span></a>`).join('')}</div>
      <div><h3 class="sub-t">반대·기권한 안건</h3>${D.votes.dissent.map(v => `<div class="brow"><time>${NB.ymd(v.date)}</time><b>${esc(v.name)}</b><span class="tag ${v.vote === '반대' ? 'neg' : 'warn'}">${esc(v.vote)}</span></div>`).join('')}</div></div>`)}`);
  /* 재산 */
  add('s-asset', '재산', 'coin', `${last.year}년`, `<div class="two"><div><div class="stat-v" style="margin-bottom:var(--s-4)">${NB.won(last.total)}</div>
      <div style="--hb-l:3.5em">${NB.hbars(D.assets.records.map(r => [r.year + '년', r.total]).reverse(), { fmt: NB.eok1 })}</div></div>
      <div><h3 class="sub-t">구성</h3>${NB.stack(NB.assetParts(last), { fmt: NB.eok1 })}</div></div>
    ${NB.exp('신고 원문', D.assets.records.length + '건', D.assets.records.map(r => `<a class="brow" href="${esc(r.url)}" target="_blank" rel="noopener"><time>${NB.ymd(r.date)}</time><b>${esc(r.kind)}<small>${esc(r.issue)} · 전년 대비 ${NB.eok1(r.change)}</small></b><span class="lnk">${ic('external-link')}</span></a>`).join(''))}`);
  /* 관계 */
  add('s-rel', '관계', 'affiliate', D.relations_people + '명', `<div class="rrows">${X.relCats.map(([c, rs]) => `<div class="rrow"><div class="rg-h">${esc(c)}<small>${rs.length}</small></div><div class="rrow-n">${rs.map(r => r.kind === 'person' ? NB.pchip(r.people[0], r.role) : `<span class="rnode"><b>${esc(r.name)}</b><small>${esc(r.role)}</small></span>`).join('')}</div></div>`).join('')}</div>
    ${NB.exp('같은 학교·고향·직위 인물', D.relations.filter(r => r.kind === 'group').reduce((m, r) => m + r.people.length, 0) + '명', `<div class="rrows">${D.relations.filter(r => r.kind === 'group' && r.people.length).map(r => `<div class="rrow" style="grid-template-columns:9em 1fr"><div class="rg-h">${esc(r.name)}<small>${esc(r.peer)}</small></div><div class="rpeers" style="margin:0">${r.people.map(p => NB.pchip(p)).join('')}</div></div>`).join('')}</div>`)}`);
  /* 발언 */
  if (D.quotes.length) add('s-q', '발언', 'quote', D.quotes.length + '건', `<div class="quotes">${D.quotes.slice(0, 4).map(NB.quote).join('')}</div>${NB.exp('발언 전체', (D.quotes.length - 4) + '건', `<div class="quotes">${D.quotes.slice(4).map(NB.quote).join('')}</div>`)}`);
  /* 보도 */
  const yrs = D.hist_years.map(([y, n]) => ["'" + y.slice(2), n, n === Math.max(...D.hist_years.map(x => x[1]))]);
  add('s-news', '보도', 'news', num(D.articles_total) + '건', `<div class="daily"><div><h3 class="sub-t">최근 30일 <small>${num(X.daily.reduce((a, b) => a + b[1], 0))}건</small></h3>${NB.spark(X.daily.map(x => x[1]))}</div>
      <div><h3 class="sub-t">연도별 <small>${num(D.hist_total)}건</small></h3>${NB.vbars(yrs).replace('class="vbars"', 'class="vbars" style="--vb-h:72px;--n:' + yrs.length + '"')}</div></div>
    <div class="acards">${D.photo_articles.slice(0, 3).map(NB.acard).join('')}</div>
    <div style="margin-top:var(--s-7)">${NB.agroup(D.articles.slice(0, 6), X.dc)}${NB.exp('이전 보도', (D.articles.length - 6) + '건', NB.agroup(D.articles.slice(6), X.dc))}</div>`);
  const idx = cls => `<nav class="idx ${cls}">${SEC.map((x, i) => `<a href="#${x.id}" class="${i ? '' : 'is-on'}"><svg class="ic" aria-hidden="true"><use class="u0" href="#i-${x.icon}"/><use class="u1" href="#i-${x.icon}-f"/></svg>${esc(x.title)}${x.count ? `<small>${esc(x.count)}</small>` : ''}</a>`).join('')}</nav>`;
  document.getElementById('app').innerHTML = `<div class="layout">
    <aside class="side"><img class="side-ph" src="${esc(P.portrait)}" alt="${esc(P.name)}" width="720" height="926">
      <div><div class="side-role">${esc(P.role)}</div><h1>${esc(P.name)}<small>${esc(P.hanja)} · ${esc(P.en)}</small></h1></div>
      ${NB.facts([['정당', esc(P.party)], ['출생', `${NB.ymd(P.birth_official)}<small>${esc(P.birth_place)}</small>`], ['학력', esc(P.education)], ['법조', '제28회 사법시험'], ['국회', `제${P.ages.join('·')}대 · ${esc(P.district)}`]])}
      ${idx('')}</aside>
    ${idx('idx--m')}
    <main class="main">${SEC.map(x => x.html).join('')}<footer class="foot"><a class="brand" href="../../../"><b>News</b>Board<i>.</i></a><a href="../../../terms/">이용약관</a><a href="../../../privacy/">개인정보처리방침</a></footer></main></div>`;
  NB.bind();
  /* 연대기 필터: 보이는 6건 + 펼침 영역 모두에 적용 */
  document.addEventListener('seg', e => { if (e.detail.name !== 'tl') return; const f = NB.FILTERS[e.detail.i][1]; const list = ev.filter(f); document.getElementById('tlv').innerHTML = NB.tl(list.slice(0, 6)); document.getElementById('tlr').innerHTML = NB.tl(list.slice(6)); const x = document.getElementById('tlx'); x.hidden = list.length <= 6; x.querySelector('.exp-n').textContent = (list.length - 6) + '건'; });
  /* 목차: 현재 섹션은 채운 아이콘 */
  const links = [...document.querySelectorAll('.idx a')];
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + en.target.id)); }), { rootMargin: '-20% 0px -70% 0px' });
  SEC.forEach(x => io.observe(document.getElementById(x.id)));
  NB.openAll();
  document.body.dataset.ready = '1';
})();
