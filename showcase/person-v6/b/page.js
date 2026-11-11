/* 시안 B · 요약 대시보드: 수치 띠 + 관계 나무 + 재임 기간 간트 */
(async () => {
  const D = await NB.load(), X = NB.derive(D), P = D.profile, { esc, ic, num } = NB;
  const last = X.last, prev = X.prev, chg = last.total - prev.total;
  const s = [];
  s.push(`<section class="ph"><img class="ph-av" src="${esc(P.portrait)}" alt="${esc(P.name)}" width="720" height="926">
    <div class="ph-t"><span class="ph-role">${ic('star', true)}${esc(P.role)}</span>
    <h1>${esc(P.name)}<small>${esc(P.hanja)} · ${esc(P.en)}</small></h1>
    <p class="ph-line">${esc(P.party)} · ${NB.ymd(P.birth_official)} 출생 · ${esc(P.education)}</p></div></section>`);
  /* 수치 띠 */
  const vsum = Object.values(D.votes.summary).reduce((a, v) => { for (const k in v) a[k] = (a[k] || 0) + v[k]; return a; }, {});
  const yrsMax = Math.max(...D.hist_years.map(x => x[1]));
  s.push(`<section class="strip">
    ${NB.stat('수집 보도', num(D.articles_total), '건', '최근 30일', `<div class="kv">${NB.spark(X.daily.map(x => x[1]))}</div>`)}
    ${NB.stat('생애 기록', D.events.length, '건', '1964년부터', `<div class="kv"><span class="kv-dots">${D.events.map(e => `<i class="${['office', 'election'].includes(e.typ) ? 'on' : ''}"></i>`).join('')}</span></div>`)}
    ${NB.stat('관계', D.relations_people, '명', `${X.relCats.length}개 분류`, `<div class="kv">${NB.stack(X.relCats.map(([c, rs], i) => [c, rs.reduce((n, r) => n + r.people.length, 0), 'k' + (i + 1)]), { legend: false })}</div>`)}
    ${NB.stat('본회의 표결', num(D.votes.count), '건', `찬성 ${Math.round(vsum['찬성'] / D.votes.count * 100)}%`, `<div class="kv">${NB.stack(NB.voteParts(vsum), { legend: false })}</div>`)}
    ${NB.stat('대표 발의', D.bills.lead_count, '건', `공동 발의 ${D.bills.co_count}건`, `<div class="kv"><span class="kv-dots">${D.bills.recent.map(b => `<i class="${b.result === '계류' ? '' : 'on'}"></i>`).join('')}</span></div>`)}
    ${NB.stat('신고 재산', NB.eok1(last.total), '원', `전년 대비 <span class="neg">${NB.eok1(chg)}</span>`, `<div class="kv">${NB.stack(NB.assetParts(last), { legend: false })}</div>`)}
  </section>`);
  /* 관계 + 핵심 정보 */
  const center = `<img src="${esc(P.portrait)}" alt="" width="720" height="926"><b>${esc(P.name)}</b>`;
  s.push(`<section class="sec g" style="border-top:0">
    <div class="g-8">${NB.sh('관계', { icon: 'affiliate', count: D.relations_people + '명' })}${NB.rtree(center, X.relCats)}
      ${NB.exp('같은 학교·고향·직위 인물', X.relCats.reduce((n, [, rs]) => n + rs.filter(r => r.kind === 'group').reduce((m, r) => m + r.people.length, 0), 0) + '명', `<div class="cols3">${D.relations.filter(r => r.kind === 'group' && r.people.length).map(r => `<div class="rgroup"><div class="rg-h">${esc(r.name)}<small>${esc(r.peer)}</small></div><div class="rpeers">${r.people.map(p => NB.pchip(p)).join('')}</div></div>`).join('')}</div>`)}
    </div>
    <div class="g-4">${NB.sh('핵심 정보', { icon: 'id-badge-2' })}${NB.facts([
      ['현직', esc(P.role)],
      ['정당', esc(P.party)],
      ['출생', `${NB.ymd(P.birth_official)}<small>${esc(P.birth_place)}</small>`],
      ['학력', `${esc(P.education)}<small>중·고교 검정고시</small>`],
      ['법조', '제28회 사법시험<small>사법연수원 제18기</small>'],
      ['국회', `제${P.ages.join('·')}대 · ${esc(P.district)}<small>${esc(P.reelect)} · ${esc(P.committee)}</small>`],
      ['병역', `제5국민역<small>${esc(P.military.match(/\(([^)]*)\)/)?.[1] || '')}</small>`],
    ])}</div>
  </section>`);
  /* 재임 기간 */
  const pol = D.events.filter(e => ['office', 'election'].includes(e.typ) || (e.typ === 'career' && e.stage === '정치 활동') || e.typ === 'ruling');
  const rows = D.events.map(e => ({ ...e, now: /대통령 취임/.test(e.title) }));
  const ticks = [1964, 1980, 1990, 2000, 2010, 2020, 2026];
  s.push(`<section class="sec">${NB.sh('경력 흐름', { icon: 'timeline-event', count: D.events.length + '건', aside: NB.seg('gt', [['공직·법조', pol.length], ['전체', D.events.length]]) })}
    <div id="gt">${NB.gantt(rows, 1964, 2026, ticks)}</div></section>`);
  /* 보도 */
  const keys = [['보도', 'k3'], ['활동', 'k2'], ['발언', 'k1'], ['논란', 'warn'], ['법적', 'neg']];
  const yc = Object.entries(D.hist_year_cats).map(([y, c]) => ["'" + y.slice(2), c]);
  s.push(`<section class="sec g">
    <div class="g-8">${NB.sh('보도 흐름', { icon: 'chart-bar', count: num(D.hist_total) + '건' })}
      ${NB.vstack(yc, keys)}
      <ul class="stack-lg">${keys.map(([k, c]) => `<li class="${c}"><i></i>${k}<b>${num(D.hist_cats.find(x => x[0] === k)?.[1] || 0)}</b></li>`).join('')}</ul>
    </div>
    <div class="g-4">${NB.sh('많이 다룬 언론사', { icon: 'news', count: num(D.press_count) + '곳' })}${NB.hbars(D.press_top.slice(0, 8))}</div>
  </section>`);
  s.push(`<section class="sec">${NB.sh('최근 보도', { icon: 'news', count: num(D.articles_total) + '건' })}
    <div class="g"><div class="g-6"><div class="acards">${D.photo_articles.slice(0, 3).map(NB.acard).join('')}</div></div>
    <div class="g-6">${NB.agroup(D.articles.slice(0, 7), X.dc)}${NB.exp('이전 보도', (D.articles.length - 7) + '건', NB.agroup(D.articles.slice(7), X.dc))}</div></div></section>`);
  /* 의정·재산 */
  const br = D.bills.by_result, vt = Object.entries(D.votes.summary);
  s.push(`<section class="sec">${NB.sh('의정·재산', { icon: 'building-bank' })}<div class="cols3">
    <div class="blk"><h3 class="sub-t">대표 발의 <small>제22대</small></h3>
      <div class="blk-v">${NB.donut([['대안반영폐기', br['대안반영폐기'] || 0, 'k2'], ['계류', br['계류'] || 0, 'warn']], `<span><b>${D.bills.lead_count}</b>건</span>`)}
      <ul class="stack-lg legend-v"><li class="k2"><i></i>대안 반영<b>${br['대안반영폐기'] || 0}</b></li><li class="warn"><i></i>계류<b>${br['계류'] || 0}</b></li></ul></div>
      ${NB.exp('법안 목록', D.bills.recent.length + '건', D.bills.recent.map(b => `<a class="brow" href="${esc(b.url)}" target="_blank" rel="noopener"><time>${NB.ymd(b.date)}</time><b>${esc(b.name)}<small>${esc(b.committee)}</small></b><span class="tag ${b.result === '계류' ? 'warn' : ''}">${esc(b.result === '대안반영폐기' ? '대안 반영' : b.result)}</span></a>`).join(''))}</div>
    <div class="blk"><h3 class="sub-t">본회의 표결 <small>${num(D.votes.count)}건</small></h3>
      ${vt.map(([age, v]) => `<div><div class="stat-l" style="margin-bottom:6px">제${age}대</div>${NB.stack(NB.voteParts(v).filter(p => p[1]))}</div>`).join('')}
      ${NB.exp('반대·기권한 안건', D.votes.dissent.length + '건', D.votes.dissent.map(v => `<div class="brow"><time>${NB.ymd(v.date)}</time><b>${esc(v.name)}</b><span class="tag ${v.vote === '반대' ? 'neg' : 'warn'}">${esc(v.vote)}</span></div>`).join(''))}</div>
    <div class="blk"><h3 class="sub-t">신고 재산 <small>${last.year}년</small></h3>
      <div class="stat-v">${NB.won(last.total)}</div>
      <div style="--hb-l:3.5em">${NB.hbars(D.assets.records.map(r => [r.year + '년', r.total]).reverse(), { fmt: NB.eok1 })}</div>
      ${NB.stack(NB.assetParts(last), { fmt: NB.eok1 })}</div>
  </div></section>`);
  if (D.quotes.length) s.push(`<section class="sec">${NB.sh('발언', { icon: 'quote', count: D.quotes.length + '건' })}
    <div class="quotes">${D.quotes.slice(0, 6).map(NB.quote).join('')}</div>${NB.exp('발언 전체', D.quotes.length + '건', `<div class="quotes">${D.quotes.slice(6).map(NB.quote).join('')}</div>`)}</section>`);
  s.push(`<footer class="foot"><a class="brand" href="../../../"><b>News</b>Board<i>.</i></a><a href="../../../terms/">이용약관</a><a href="../../../privacy/">개인정보처리방침</a></footer>`);
  document.getElementById('app').innerHTML = s.join('');
  NB.bind();
  const gt = i => { const show = i === 0 ? new Set(pol) : null; document.querySelectorAll('#gt .gantt-r').forEach((r, k) => r.hidden = show ? !show.has(D.events[k]) : false); };
  gt(0);
  document.addEventListener('seg', e => { if (e.detail.name === 'gt') gt(e.detail.i); });
  NB.openAll();
  document.body.dataset.ready = '1';
})();
