/* 시안 D · A 기반 + B의 경력 흐름(간트) + C의 섹션 목차 + 감사 누락분 복구(국회 등록 경력·의정 기본·법안 상세·재산 상세·장기 기록·사건·사고·출처) */
(async () => {
  const D = await NB.load(), X = NB.derive(D), P = D.profile, { esc, ic, num } = NB;
  const last = X.last, prev = X.prev, chg = last.total - prev.total;
  const ext = (href, label, icon = 'external-link') => `<a class="lnk" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}${ic(icon)}</a>`;
  /* 첫 화면 */
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
      <div class="hero-src">
        <a class="src-chip" href="${esc(D.sources.wiki.url)}" target="_blank" rel="noopener">${ic('brand-wikipedia')}위키백과<small>${esc(D.sources.wiki.desc)}</small></a>
        <a class="src-chip" href="${esc(D.sources.pol.url)}" target="_blank" rel="noopener">${ic('building-bank')}열린국회정보<small>국회의원 정보</small></a>
      </div>
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

  /* 경력 흐름: 간트 + 국회 등록 경력(열린국회정보) + 전체 연대기 */
  const pol = D.events.filter(e => ['office', 'election'].includes(e.typ) || (e.typ === 'career' && e.stage === '정치 활동') || e.typ === 'ruling');
  const rows = D.events.map(e => ({ ...e, now: /대통령 취임/.test(e.title) }));
  const REG = D.career_reg, regPol = REG.filter(r => r.grp === '공직·법조');
  const cnt = NB.FILTERS.map(([n, f]) => [n, D.events.filter(f).length]);
  add('s-career', '경력 흐름', 'timeline-event', (D.events.length + REG.length) + '건',
    `<div id="gt">${NB.gantt(rows, 1964, 2026, [1964, 1980, 1990, 2000, 2010, 2020, 2026])}</div>
     <div class="reg"><h3 class="sub-t">${ic('id')}국회 등록 경력 <small>${REG.length}건</small></h3>
       <ul class="reg-l">${REG.map(r => `<li class="reg-i" data-grp="${esc(r.grp)}"><span class="reg-d">${esc(NB.dot(r.d))}</span><b>${esc(r.title)}</b><span class="reg-g">${esc(r.grp)}</span></li>`).join('')}</ul></div>
     ${NB.exp('전체 연대기', D.events.length + '건', `<div style="margin-bottom:var(--s-6)">${NB.seg('tl', cnt)}</div>${NB.tl(D.events)}`)}`,
    { cls: 'career', aside: NB.seg('gt', [['공직·법조', pol.length + regPol.length], ['전체', D.events.length + REG.length]]) });

  /* 의정·재산 */
  const br = D.bills.by_result, vt = Object.entries(D.votes.summary);
  const vTot = NB.voteParts(Object.fromEntries(['찬성', '반대', '기권', '불참'].map(k => [k, X.vt(k)])));
  const bm = D.bills.by_month, bmK = Object.keys(bm).sort();
  const months = []; for (let d = new Date(bmK[0] + '-01T00:00:00Z'); d.toISOString().slice(0, 7) <= bmK[bmK.length - 1]; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(d.toISOString().slice(0, 7));
  const bst = [['전체', D.bills.recent.length], ...Object.entries(br).map(([k, v]) => [k === '대안반영폐기' ? '대안 반영' : k, v])];
  const brow = b => `<a class="brow brow--bill" data-res="${esc(b.result)}" href="${esc(b.url)}" target="_blank" rel="noopener"><time>${NB.ymd(b.date)}</time><b>${esc(b.name)}<small>의안번호 ${esc(b.no)} · ${esc(b.committee)} · ${esc(b.proposer)}</small></b><span class="tag ${b.result === '계류' ? 'warn' : ''}">${esc(b.result === '대안반영폐기' ? '대안 반영' : b.result)}</span></a>`;
  const A = D.assets.records, aRows = A.slice().reverse();
  const assetLg = [...NB.assetParts(last), ['토지', last.land, 'k5'], ['증권', last.securities, 'k5']];
  add('s-pol', '의정·재산', 'scale', null, `${NB.mini([
      ['선수', esc(P.reelect), 'award'],
      ['당선', `제${P.ages.join('·')}대 · ${esc(P.kind)}`, 'checkbox'],
      ['선거구', esc(P.district), 'map-pin'],
      ['소속 위원회', esc(P.committee), 'users-group'],
      ['당적 변경', `${P.party_switches}회`, 'flag'],
    ])}
    <div class="cols cols-3">
      <div class="blk"><h3 class="sub-t">대표 발의 <small>제22대</small></h3>
        <div class="blk-v">${NB.donut([['대안반영폐기', br['대안반영폐기'] || 0, 'k2'], ['계류', br['계류'] || 0, 'warn']], `<span><b>${D.bills.lead_count}</b>건</span>`)}
        <ul class="stack-lg legend-v"><li class="k2"><i></i>대안 반영<b>${br['대안반영폐기'] || 0}</b></li><li class="warn"><i></i>계류<b>${br['계류'] || 0}</b></li><li class="mute"><i></i>공동 발의<b>${D.bills.co_count}</b></li></ul></div>
        ${NB.exp('법안 목록', D.bills.recent.length + '건', `<div class="bill-m"><div class="stat-l">월별 대표 발의</div>${NB.vbars(months.map(m => ["'" + m.slice(2).replace('-', '.'), bm[m] || 0, false]), { cls: 'vbars--sm' })}</div>
          <div class="bill-f">${NB.seg('bill', bst)}</div><div id="bills">${D.bills.recent.map(brow).join('')}</div>
          <div class="blk-lnk">${ext(D.bills.portal, '의안정보시스템')}</div>`)}
      </div>
      <div class="blk"><h3 class="sub-t">본회의 표결 <small>${num(D.votes.count)}건</small></h3>
        ${NB.stack(vTot.filter(p => p[1]), { pct: true })}
        ${NB.exp('대수별 · 반대·기권 안건', D.votes.dissent.length + '건', `<div class="blk">${vt.map(([age, v]) => `<div><div class="stat-l" style="margin-bottom:6px">제${age}대 <b class="num">${num(Object.values(v).reduce((s, x) => s + x, 0))}</b>건</div>${NB.stack(NB.voteParts(v).filter(p => p[1]), { pct: true })}</div>`).join('')}</div>
          <div class="sub-g">${D.votes.dissent.map(v => `<div class="brow"><time>${NB.ymd(v.date)}</time><b>${esc(v.name)}</b><span class="tag ${v.vote === '반대' ? 'neg' : 'warn'}">${esc(v.vote)}</span></div>`).join('')}</div>`)}
      </div>
      <div class="blk"><h3 class="sub-t">신고 재산 <small>${last.year}년</small></h3>
        <div class="stat-v">${NB.won(last.total)}</div>
        <div style="--hb-l:3.5em">${NB.hbars(A.map(r => [r.year + '년', r.total]).reverse(), { fmt: NB.eok1 })}</div>
        ${NB.stack(assetLg, { fmt: v => v ? NB.eok1(v) : '0' })}
        <div class="debt">${ic('receipt')}채무<b>${NB.won(last.debt)}</b></div>
        ${NB.exp('신고별 내역', A.length + '건', NB.table(['', ...aRows.map(r => `${r.year}년`)], [
            ['종전 총액', ...aRows.map(r => NB.won(r.prev))],
            ['증가', ...aRows.map(r => NB.won(r.inc))],
            ['감소', ...aRows.map(r => NB.won(r.dec))],
            ['신고 총액', ...aRows.map(r => `<b>${NB.won(r.total)}</b>`)],
            ['변동', ...aRows.map(r => `<span class="${r.change < 0 ? 'neg' : 'pos'}">${NB.swon(r.change)}</span>`)],
            ['채무', ...aRows.map(r => NB.won(r.debt))],
            ['원문', ...aRows.map(r => ext(r.url, r.issue.replace('국회공보 ', '')))],
          ], aRows.map((_, i) => i + 1)))}
      </div></div>`);

  /* 관계 */
  add('s-rel', '관계', 'affiliate', D.relations_people + '명', `<div class="rels">${X.relCats.map(([c, rs]) => `<div class="rgroup"><div class="rg-h">${esc(c)}<small>${rs.length}</small></div>${rs.map(r => r.kind === 'person'
      ? `<div class="rnode">${NB.pchip(r.people[0], r.role)}</div>`
      : `<div class="rnode"><b>${esc(r.name)}</b><small>${esc(r.role)}</small>${r.people.length ? `<p class="rpeer-line">${esc(r.peer)} <b>${r.people.map(p => esc(p.name)).join(', ')}</b></p>` : ''}</div>`).join('')}</div>`).join('')}</div>`);
  /* 발언 */
  if (D.quotes.length) add('s-q', '발언', 'quote', D.quotes.length + '건', `<div class="quotes">${D.quotes.slice(0, 6).map(NB.quote).join('')}</div>
    ${NB.exp('발언 전체', (D.quotes.length - 6) + '건', `<div class="quotes">${D.quotes.slice(6).map(NB.quote).join('')}</div>`)}`);

  /* 사건·사고: 장기 기록의 논란·법적 */
  const H = D.hist_items, INC = H.filter(x => x.cat === '논란' || x.cat === '법적');
  const yrsAll = D.hist_years.map(x => x[0]);
  const incY = yrsAll.map(y => [y, { 논란: D.hist_year_cats[y]['논란'] || 0, 법적: D.hist_year_cats[y]['법적'] || 0 }]);
  const incN = { 논란: INC.filter(x => x.cat === '논란').length, 법적: INC.filter(x => x.cat === '법적').length };
  if (INC.length) add('s-inc', '사건·사고', 'alert-triangle', INC.length + '건', `<div class="inc">
      <div><h3 class="sub-t">연도별 <small>${yrsAll[0]}–${yrsAll[yrsAll.length - 1]}</small></h3>${NB.vstack(incY, [['논란', 'warn'], ['법적', 'neg']], { lab: y => "'" + y.slice(2), lc: y => (+y % 2 ? 'is-odd' : '') })}
        ${NB.stack([['논란', incN['논란'], 'warn'], ['법적', incN['법적'], 'neg']], { pct: true })}</div>
      <div><h3 class="sub-t">최근 기록</h3><div class="alist">${INC.slice(0, 6).map(NB.hrow).join('')}</div></div>
    </div>
    ${NB.exp('이전 기록', (INC.length - 6) + '건', `<div id="inc-l"></div>`, false, 'x-inc')}`);

  /* 보도: 분류 건수 + 연도/월 추이 + 언론사 + 오늘의 이슈 + 기사(전체 점진) + 장기 기록(전체 점진) */
  const CATS = D.hist_cats.map(([c]) => [c, NB.HCAT[c]]);
  const yrs = D.hist_years.map(([y]) => [y, D.hist_year_cats[y]]);
  const mc = {}; H.forEach(x => { const m = x.d.slice(0, 7); (mc[m] ||= {})[x.cat] = (mc[m][x.cat] || 0) + 1; });
  const mk = Object.keys(mc).sort(), mAll = [];
  for (let d = new Date(mk[0] + '-01T00:00:00Z'); d.toISOString().slice(0, 7) <= mk[mk.length - 1]; d.setUTCMonth(d.getUTCMonth() + 1)) { const m = d.toISOString().slice(0, 7); mAll.push([m, mc[m] || {}]); }
  const hcSeg = [['전체', H.length], ...D.hist_cats.filter(([c]) => c !== '논란' && c !== '법적').map(([c, n]) => [c, n])];
  hcSeg.splice(3, 0, ['사건·사고', INC.length]);
  add('s-news', '보도', 'file-text', num(D.articles_total) + '건', `<div class="news-top">
        <div><div class="sub-h"><h3 class="sub-t">기록 추이 <small>${num(D.hist_total)}건</small></h3>${NB.seg('nc', [['연도별'], ['월별']])}</div>
          <div id="nc0">${NB.vstack(yrs, CATS, { lab: y => "'" + y.slice(2), lc: y => (+y % 2 ? 'is-odd' : '') })}</div>
          <div id="nc1" hidden>${NB.vstack(mAll, CATS, { cls: 'vbars--m', lab: m => m.endsWith('-01') && +m.slice(0, 4) % 2 === 0 ? "'" + m.slice(2, 4) : '', lc: m => (+m.slice(0, 4) % 4 ? 'is-odd' : ''), tip: m => m.replace('-', '.') })}</div>
          ${NB.stack(D.hist_cats.map(([c, n]) => [c, n, NB.HCAT[c]]))}</div>
        <div><h3 class="sub-t">많이 다룬 언론사 <small>${num(D.press_count)}곳</small></h3>${NB.hbars(D.press_top.slice(0, 6))}</div>
      </div>
      ${D.issues.map(i => `<a class="issue" href="${esc(i.url)}" target="_blank" rel="noopener"><span class="tag acc">${ic('news')}오늘의 이슈</span><b>${esc(i.title.replace(/^\[오늘의 이슈\]\s*/, ''))}</b><time>${NB.ymd(i.d)}</time>${ic('arrow-up-right')}</a>`).join('')}
      <div class="acards">${D.photo_articles.slice(0, 4).map(NB.acard).join('')}</div>
      <div style="margin-top:var(--s-8)">${NB.agroup(D.articles.slice(0, 8), X.dc)}
      ${NB.exp('이전 보도', num(D.articles_total - 8) + '건', `<div id="arts"></div>`, false, 'x-arts')}
      ${NB.exp('장기 기록', num(H.length) + '건', `<div class="hist-f">${NB.seg('hc', hcSeg)}</div><div id="hist"></div>`, false, 'x-hist')}</div>`);

  document.getElementById('app').innerHTML = head + `<div class="body"><aside>${NB.toc(SEC)}${NB.toc(SEC, 'toc--bar')}</aside><div class="main">${SEC.map(x => x.html).join('')}</div></div>
    <footer class="foot"><a class="brand" href="../../../"><b>News</b>Board<i>.</i></a><a href="../../../terms/">이용약관</a><a href="../../../privacy/">개인정보처리방침</a></footer>`;
  NB.bind();

  /* 경력 흐름 필터: 간트 + 등록 경력 */
  const gt = i => { const show = i === 0 ? new Set(pol) : null; document.querySelectorAll('#gt .gantt-r').forEach((r, k) => r.hidden = show ? !show.has(D.events[k]) : false); document.querySelectorAll('.reg-i').forEach(li => li.hidden = i === 0 && li.dataset.grp !== '공직·법조'); };
  gt(0);
  /* 점진 목록 */
  const histMonthN = list => { const c = {}; list.forEach(x => { const m = x.d.slice(0, 7); c[m] = (c[m] || 0) + 1; }); return c; };
  const histList = (hostId, list, step) => { const host = document.getElementById(hostId); host.innerHTML = ''; host.nextElementSibling?.classList.contains('more-b') && host.nextElementSibling.remove();
    const mn = histMonthN(list); const put = NB.grouper(host, x => x.d.slice(0, 7), m => `${NB.ym(m)}<small>${mn[m]}건</small>`, NB.hrow);
    NB.more(host, list.length, step, (a, b) => put(list.slice(a, b))); };
  const HF = [() => true, x => x.cat === '보도', x => x.cat === '발언', x => x.cat === '논란' || x.cat === '법적', x => x.cat === '활동', x => x.cat === '수상'];
  const HFI = hcSeg.map(([n]) => ({ '전체': HF[0], '보도': HF[1], '발언': HF[2], '사건·사고': HF[3], '활동': HF[4], '수상': HF[5] }[n]));
  histList('hist', H, 40);
  histList('inc-l', INC.slice(6), 30);
  let artsOn = false;
  const arts = async () => { if (artsOn) return; artsOn = true; const all = (await fetch('../shared/articles.json').then(r => r.json())).map(([t, title, url, press]) => ({ t, title, url, press }));
    const host = document.getElementById('arts'), list = all.slice(8);
    const put = NB.grouper(host, a => a.t.slice(0, 10), d => `${NB.dayLabel(d)}<small>${X.dc[d] ?? ''}건</small>`, NB.arow);
    NB.more(host, list.length, 50, (a, b) => put(list.slice(a, b))); };
  document.addEventListener('click', e => { if (e.target.closest('#x-arts > .exp-b')) arts(); });
  document.addEventListener('seg', e => {
    const { name, i } = e.detail;
    if (name === 'gt') gt(i);
    if (name === 'tl') { const f = NB.FILTERS[i][1]; document.querySelectorAll('.tl-i').forEach((li, k) => li.hidden = !f(D.events[k])); }
    if (name === 'nc') { document.getElementById('nc0').hidden = i !== 0; document.getElementById('nc1').hidden = i !== 1; }
    if (name === 'bill') { const v = bst[i][0]; document.querySelectorAll('.brow--bill').forEach(r => r.hidden = i !== 0 && (r.dataset.res === '대안반영폐기' ? '대안 반영' : r.dataset.res) !== v); }
    if (name === 'hc') histList('hist', H.filter(HFI[i]), 40);
  });
  NB.spy(SEC.map(x => x.id));
  NB.openAll();
  if (/[?&]open=1/.test(location.search)) await arts();
  document.body.dataset.ready = '1';
})();
