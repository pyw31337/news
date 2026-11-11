/* 시안 D · A 기반 + B의 경력 흐름(간트) + C의 섹션 목차 */
(async () => {
  const D = await NB.load(), X = NB.derive(D), P = D.profile, { esc, ic, num } = NB;
  const last = X.last, prev = X.prev, chg = last.total - prev.total;
  /* 첫 화면(A 그대로) */
  const head = `<section class="hero">
    <div>
      <span class="hero-role">${ic('star', true)}${esc(P.role)}</span>
      <h1>${esc(P.name)}<small>${esc(P.hanja)} · ${esc(P.en)}</small></h1>
      <p class="hero-line">${esc(P.party)} · 제${P.ages.join('·')}대 국회의원(${esc(P.district)}) · 제35대 경기도지사 · 민선 5·6기 성남시장</p>
      ${NB.facts([
        ['출생', `${NB.ymd(P.birth_official)}<small>${esc(P.birth_place)}</small>`, 'calendar'],
        ['학력', `${esc(P.education)}<small>중·고교 검정고시</small>`, 'school'],
        ['법조', `제28회 사법시험<small>사법연수원 제18기</small>`, 'gavel'],
        ['병역', `${esc(P.military.split('(')[0].trim())}<small>${esc(P.military.match(/\(([^)]*)\)/)?.[1] || '')}</small>`, 'shield'],
      ])}
    </div>
    <figure class="hero-ph"><img src="${esc(P.portrait)}" alt="${esc(P.name)}" width="720" height="926"><figcaption>${esc(P.portrait_credit)}</figcaption></figure>
  </section>
  <section class="eras">${NB.era(D, 'auto')}</section>
  <section class="sec"><div class="kpis">
    ${NB.stat('생애 기록', D.events.length, '건', '출생부터 대통령 취임까지')}
    ${NB.stat('수집 보도', num(D.articles_total), '건', `${num(D.press_count)}개 언론사`)}
    ${NB.stat('장기 연표', num(D.hist_total), '건', `${D.hist_years[0][0]}년부터`)}
    ${NB.stat('본인 발언', D.quotes.length, '건', `최근 ${NB.ymd(D.quotes[0].d)}`)}
    ${NB.stat('대표 발의', D.bills.lead_count, '건', `공동 발의 ${D.bills.co_count}건`)}
    ${NB.stat('신고 재산', NB.eok1(last.total), '원', `전년 대비 <span class="neg">${NB.eok1(chg)}</span>`)}
  </div></section>`;
  const SEC = [];
  const add = (id, title, icon, count, body, opt = {}) => SEC.push({ id, title, icon, count, html: `<section class="sec ${opt.cls || ''}" id="${id}">${NB.sh(title, { icon, count, aside: opt.aside })}${body}</section>` });
  /* 경력 흐름(B) + 전체 연대기 펼치기 */
  const pol = D.events.filter(e => ['office', 'election'].includes(e.typ) || (e.typ === 'career' && e.stage === '정치 활동') || e.typ === 'ruling');
  const rows = D.events.map(e => ({ ...e, now: /대통령 취임/.test(e.title) }));
  const cnt = NB.FILTERS.map(([n, f]) => [n, D.events.filter(f).length]);
  add('s-career', '경력 흐름', 'timeline-event', D.events.length + '건',
    `<div id="gt">${NB.gantt(rows, 1964, 2026, [1964, 1980, 1990, 2000, 2010, 2020, 2026])}</div>
     ${NB.exp('전체 연대기', D.events.length + '건', `<div style="margin-bottom:var(--s-6)">${NB.seg('tl', cnt)}</div>${NB.tl(D.events)}`)}`,
    { cls: 'career', aside: NB.seg('gt', [['공직·법조', pol.length], ['전체', D.events.length]]) });
  /* 의정·재산(A) */
  const br = D.bills.by_result, vt = Object.entries(D.votes.summary);
  add('s-pol', '의정·재산', 'scale', null, `<div class="cols cols-3">
      <div class="blk"><h3 class="sub-t">대표 발의 <small>제22대</small></h3>
        <div class="blk-v">${NB.donut([['대안반영폐기', br['대안반영폐기'] || 0, 'k2'], ['계류', br['계류'] || 0, 'warn']], `<span><b>${D.bills.lead_count}</b>건</span>`)}
        <ul class="stack-lg legend-v"><li class="k2"><i></i>대안 반영<b>${br['대안반영폐기'] || 0}</b></li><li class="warn"><i></i>계류<b>${br['계류'] || 0}</b></li></ul></div>
        ${NB.exp('법안 목록', D.bills.recent.length + '건', D.bills.recent.map(b => `<a class="brow" href="${esc(b.url)}" target="_blank" rel="noopener"><time>${NB.ymd(b.date)}</time><b>${esc(b.name)}<small>${esc(b.committee)}</small></b><span class="tag ${b.result === '계류' ? 'warn' : ''}">${esc(b.result === '대안반영폐기' ? '대안 반영' : b.result)}</span></a>`).join(''))}
      </div>
      <div class="blk"><h3 class="sub-t">본회의 표결 <small>${num(D.votes.count)}건</small></h3>
        ${vt.map(([age, v]) => `<div><div class="stat-l" style="margin-bottom:6px">제${age}대</div>${NB.stack(NB.voteParts(v).filter(p => p[1]))}</div>`).join('')}
        ${NB.exp('반대·기권한 안건', D.votes.dissent.length + '건', D.votes.dissent.map(v => `<div class="brow"><time>${NB.ymd(v.date)}</time><b>${esc(v.name)}</b><span class="tag ${v.vote === '반대' ? 'neg' : 'warn'}">${esc(v.vote)}</span></div>`).join(''))}
      </div>
      <div class="blk"><h3 class="sub-t">신고 재산 <small>${last.year}년</small></h3>
        <div class="stat-v">${NB.won(last.total)}</div>
        <div style="--hb-l:3.5em">${NB.hbars(D.assets.records.map(r => [r.year + '년', r.total]).reverse(), { fmt: NB.eok1 })}</div>
        ${NB.stack(NB.assetParts(last), { fmt: NB.eok1 })}
        ${NB.exp('신고 원문', D.assets.records.length + '건', D.assets.records.map(r => `<a class="brow" href="${esc(r.url)}" target="_blank" rel="noopener"><time>${NB.ymd(r.date)}</time><b>${esc(r.kind)}<small>${esc(r.issue)}</small></b><span class="lnk">${ic('external-link')}</span></a>`).join(''))}
      </div></div>`);
  /* 관계(A) */
  add('s-rel', '관계', 'affiliate', D.relations_people + '명', `<div class="rels">${X.relCats.map(([c, rs]) => `<div class="rgroup"><div class="rg-h">${esc(c)}<small>${rs.length}</small></div>${rs.map(r => r.kind === 'person'
      ? `<div class="rnode">${NB.pchip(r.people[0], r.role)}</div>`
      : `<div class="rnode"><b>${esc(r.name)}</b><small>${esc(r.role)}</small>${r.people.length ? `<p class="rpeer-line">${esc(r.peer)} <b>${r.people.map(p => esc(p.name)).join(', ')}</b></p>` : ''}</div>`).join('')}</div>`).join('')}</div>`);
  /* 발언(A) */
  if (D.quotes.length) add('s-q', '발언', 'quote', D.quotes.length + '건', `<div class="quotes">${D.quotes.slice(0, 6).map(NB.quote).join('')}</div>
    ${NB.exp('발언 전체', (D.quotes.length - 6) + '건', `<div class="quotes">${D.quotes.slice(6).map(NB.quote).join('')}</div>`)}`);
  /* 보도(A) */
  const yrs = D.hist_years.map(([y, n]) => ["'" + y.slice(2), n, n === Math.max(...D.hist_years.map(x => x[1]))]);
  add('s-news', '보도', 'file-text', num(D.articles_total) + '건', `<div class="news-top">
        <div><h3 class="sub-t">연도별 기록 <small>${num(D.hist_total)}건</small></h3>${NB.vbars(yrs)}</div>
        <div><h3 class="sub-t">많이 다룬 언론사</h3>${NB.hbars(D.press_top.slice(0, 6))}</div>
      </div>
      <div class="acards">${D.photo_articles.slice(0, 4).map(NB.acard).join('')}</div>
      <div style="margin-top:var(--s-8)">${NB.agroup(D.articles.slice(0, 8), X.dc)}
      ${NB.exp('이전 보도', (D.articles.length - 8) + '건', NB.agroup(D.articles.slice(8), X.dc))}</div>`);
  document.getElementById('app').innerHTML = head + `<div class="body"><aside>${NB.toc(SEC)}${NB.toc(SEC, 'toc--bar')}</aside><div class="main">${SEC.map(x => x.html).join('')}</div></div>
    <footer class="foot"><a class="brand" href="../../../"><b>News</b>Board<i>.</i></a><a href="../../../terms/">이용약관</a><a href="../../../privacy/">개인정보처리방침</a></footer>`;
  NB.bind();
  const gt = i => { const show = i === 0 ? new Set(pol) : null; document.querySelectorAll('#gt .gantt-r').forEach((r, k) => r.hidden = show ? !show.has(D.events[k]) : false); };
  gt(0);
  document.addEventListener('seg', e => {
    if (e.detail.name === 'gt') gt(e.detail.i);
    if (e.detail.name === 'tl') { const f = NB.FILTERS[e.detail.i][1]; document.querySelectorAll('.tl-i').forEach((li, i) => li.hidden = !f(D.events[i])); }
  });
  NB.spy(SEC.map(x => x.id));
  NB.openAll();
  document.body.dataset.ready = '1';
})();
