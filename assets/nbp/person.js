/* 인물 페이지(1계층, 데이터 기반 공통 화면). 묶음: data/p/x/NNN.json(scripts/people/person_pages.py)
   + 국회(data/pol/people/<id>.json) + 장기 기록(history 브랜치 h/p/<id>.json.gz) + 기사 전체(data 브랜치 t/·db/entities). 빈 섹션은 그리지 않음. */
(async () => {
  const { esc, ic, num, href, gz, shard, RAW } = NB, app = document.getElementById('app');
  const qs = new URLSearchParams(location.search);
  const B0 = NB.BASE;
  let id = qs.get('id');
  const fail = () => { app.innerHTML = `<section class="hero hero--empty"><div><h1>인물을 찾지 못했어요</h1><p class="hero-line"><a class="lnk" href="${B0}people">화제 인물 보기${ic('arrow-right')}</a></p></div></section>`; document.body.dataset.ready = '1'; };
  try {
    if (!id && qs.get('n')) id = (await NB.load(B0 + 'data/p/names.json'))[qs.get('n')];
    if (!id) return fail();
    var B = (await NB.load(`${B0}data/p/x/${String(await shard(id, 256)).padStart(3, '0')}.json`))[id];
  } catch (e) { return fail(); }
  if (!B) return fail();
  const nm = B.n, car = B.car || {}, L = B.L || {};
  document.title = `${nm} · NewsBoard`;
  const [Pj, H] = await Promise.all([
    B.pol ? NB.load(`${B0}data/pol/people/${B.pol}.json`).catch(() => null) : null,
    B.h ? gz(`${RAW}history/h/p/${B.h}.json.gz`).catch(() => null) : null,
  ]);
  const lgi = k => B.lg?.[k] ? `<img class="lg" src="${esc(B.lg[k])}" alt="" width="18" height="18" loading="lazy">` : '';
  const gl = (k, label) => `<a class="lk" href="${href.g(k)}">${lgi(k)}${esc(label)}</a>`;
  const glist = (items, max = 99) => items.slice(0, max).map(([label, , , k]) => gl(k, label)).join('<i class="sep">·</i>');
  const yr = (a, b) => a ? `${a}${b ? '–' + b : '–'}` : '';
  const pcard = (o, sub) => { const c = L[o] || [o]; return NB.pchip({ name: c[0], photo: c[3] ? (/^https?:/.test(c[3]) ? c[3] : B0 + c[3]) : null }, sub, c[4] ? href.p(o) : null); };
  const photo = u => /^https?:/.test(u) ? u : B0 + u;

  /* ── 첫 화면 ── */
  const ph = B.ph;
  const party = Pj?.party || (car.party || []).slice(-1)[0];
  const occ = (car.occ || []).slice(0, 3);
  const line = [B.k ? gl('kind:' + B.k, B.k) : '', party ? (Pj ? gl('g:party:' + Pj.party, Pj.party) : gl(party[3], party[0])) : '', occ.length ? glist(occ) : ''].filter(Boolean).join('<i class="sep">·</i>');
  const birth = B.bd ? NB.ymd(B.bd) : B.b ? B.b + '년' : '';
  const facts = [
    birth && ['출생', `${birth}${B.bp ? `<small>${gl('g:region:' + B.bp, B.bp)}</small>` : ''}`, 'calendar'],
    B.dd && ['사망', B.dd + '년', 'calendar'],
    car.edu?.length && ['학력', glist(car.edu, 3), 'school'],
    (car.team || car.emp || car.mem || car.label) && ['소속', glist((car.team || car.emp || car.mem || car.label).slice(-3)), 'building'],
    B.x?.military && ['병역', esc(B.x.military), 'shield'],
    Pj && ['국회', `제${Pj.ages.join('·')}대 · ${gl('g:region:' + Pj.district, Pj.district)}`, 'building-bank'],
  ].filter(Boolean);
  const S = B.src || {};
  const chips = [S.wiki && [S.wiki, 'brand-wikipedia', '위키백과'], S.wd && [S.wd, 'world', '위키데이터'], S.pol && [S.pol, 'building-bank', '열린국회정보'], S.site && [S.site, 'link', '공식 사이트']].filter(Boolean);
  const phW = ph ? Math.min(300, Math.round((ph.w || 300) / 2)) : 0;
  const head = `<section class="hero">
    <div>
      ${B.d ? `<span class="hero-role">${ic('id-badge')}${esc(B.d)}</span>` : ''}
      <h1>${esc(nm)}${B.hz || B.en ? `<small>${[B.hz, B.en].filter(Boolean).map(esc).join(' · ')}</small>` : ''}</h1>
      ${line ? `<p class="hero-line">${line}</p>` : ''}
      ${facts.length ? NB.facts(facts) : ''}
      ${chips.length ? `<div class="hero-src">${chips.map(([u, i, t]) => `<a class="src-chip" href="${esc(u)}" target="_blank" rel="noopener">${ic(i)}${t}</a>`).join('')}</div>` : ''}
    </div>
    ${ph ? `<figure class="hero-ph" style="--ph-max:${phW}px"><img src="${esc(photo(ph.u))}" alt="${esc(nm)}" width="${ph.w}" height="${ph.h}"><figcaption><a href="${esc(ph.src)}" target="_blank" rel="noopener">${esc([ph.by, ph.lic].filter(Boolean).join(' · '))}</a></figcaption></figure>`
      : `<figure class="hero-ph hero-ph--none" aria-hidden="true">${ic('user')}</figure>`}
  </section>`;
  /* 생애 단계: 연도가 있는 직위 */
  const pos = (car.pos || []).filter(x => x[1]).sort((a, b) => a[1] - b[1]);
  const eras = pos.slice(-7).map((x, i, a) => ({ y: yr(x[1], x[2]), name: x[0], href: href.g(x[3]), now: !x[2] && i === a.length - 1 }));
  /* 장기 기록 */
  const HP = H?.o || [], HI = (H?.it || []).map(x => ({ d: x[0], title: x[1], press: HP[x[2]] || '', cat: x[3], quote: x[4] })).sort((a, b) => b.d.localeCompare(a.d));
  const own = x => { const i = x.title.indexOf(nm), q = x.title.search(/["“'‘]/); return i >= 0 && (q < 0 || i < q); };
  const Q = HI.filter(x => x.cat === '발언' && x.quote && own(x));
  const INC = HI.filter(x => x.cat === '논란' || x.cat === '법적');
  const AR = B.ar;
  const relN = new Set((B.rel || []).flatMap(r => r[0].startsWith('g:') ? (B.gp?.[r[0]] || []) : [r[0]])).size;
  const kp = [
    AR && NB.stat('수집 보도', num(AR.c), '건', `${num(AR.pc)}개 언론사`),
    HI.length && NB.stat('장기 기록', num(HI.length), '건', `${HI[HI.length - 1].d.slice(0, 4)}년부터`),
    Q.length && NB.stat('본인 발언', Q.length, '건', `최근 ${NB.ymd(Q[0].d)}`),
    (B.ev || []).length && NB.stat('생애 기록', B.ev.length, '건'),
    relN && NB.stat('관계 인물', relN, '명'),
    Pj?.bills?.lead_count != null && NB.stat('대표 발의', Pj.bills.lead_count, '건', `공동 발의 ${Pj.bills.co_count}건`),
    Pj?.assets?.records?.length && (() => { const A = Pj.assets.records, l = A[A.length - 1], p = A[A.length - 2]; return NB.stat('신고 재산', NB.eok1(l.total), '원', p ? `전년 대비 <span class="${l.total < p.total ? 'neg' : 'pos'}">${NB.eok1(l.total - p.total)}</span>` : `${l.year}년`); })(),
  ].filter(Boolean).slice(0, 6);
  const top = head + (eras.length >= 2 ? `<section class="eras">${NB.era(eras)}</section>` : '') + (kp.length > 1 ? `<section class="sec"><div class="kpis" style="--kpi-n:${kp.length}">${kp.join('')}</div></section>` : '');

  const SEC = [];
  const add = (sid, title, icon, count, body, opt = {}) => SEC.push({ id: sid, title, icon, count, html: `<section class="sec ${opt.cls || ''}" id="${sid}">${NB.sh(title, { icon, count, aside: opt.aside })}${body}</section>` });

  /* ── 사진으로 본 변화(연도가 있는 사진 2장 이상) ── */
  if ((B.pt || []).length >= 2) add('s-ph', '사진으로 본 변화', 'photo', B.pt.length + '장', NB.ptl(B.pt.map(([y, u, w, h, src, lic, by]) => ({ y, u, w, h, src, cap: [by, lic].filter(Boolean).join(' · ') }))));

  /* ── 경력 흐름 ── */
  const norm = s => String(s || '').replace(/\s+/g, '');
  const EV = (B.ev || []).map(e => ({ d: e[0], title: e[1], typ: e[2], stage: e[3], desc: e[4], src: e[5], url: e[6], g: e[7] || null }));
  const rows = EV.filter(e => /\d{4}/.test(e.d)).map(e => ({ ...e }));
  const WDK = { pos: '직위', edu: '학력', emp: '소속', party: '정당', mem: '소속', team: '소속 팀', label: '레이블' };
  for (const k of Object.keys(WDK)) for (const [label, a, b, g] of car[k] || []) {
    if (!a) continue;
    const tail = norm(String(label).split(/\s+/).pop());
    const r = rows.find(r => norm(r.title).includes(norm(label))) || (tail.length >= 2 && rows.find(r => (NB.span(r.d) || [0])[0] === a && norm(r.title).includes(tail)));
    if (r) { r.g = r.g || g; continue; }
    rows.push({ d: a + (b && b !== a ? '~' + b : ''), title: label, typ: k, g });
  }
  rows.forEach(r => { if (!r.g) { const hit = Object.values(car).flat().find(x => x[0] && x[0].length > 2 && norm(r.title).includes(norm(x[0]))); if (hit) r.g = hit[3]; } r.href = r.g ? href.g(r.g) : null; });
  rows.sort((a, b) => (NB.span(a.d) || [0])[0] - (NB.span(b.d) || [0])[0]);
  const MAIN = new Set(['office', 'election', 'ruling', 'pos', 'party', 'team', 'emp', 'mem', 'label', 'career', 'business']);
  const main = rows.filter(r => MAIN.has(r.typ));
  const y0 = Math.min(...rows.map(r => (NB.span(r.d) || [9999])[0]), B.b || 9999), y1 = new Date().getFullYear();
  const undated = [];
  for (const k of ['pos', 'edu', 'emp', 'mem', 'team', 'label']) for (const x of car[k] || []) if (!x[1]) undated.push([x, WDK[k]]);
  const regBlock = [
    Pj?.history?.length && `<div class="reg"><h3 class="sub-t">${ic('id')}국회 등록 경력 <small>${Pj.history.length}건</small></h3><ul class="reg-l">${Pj.history.map(h => `<li class="reg-i"><b>${esc(h)}</b></li>`).join('')}</ul></div>`,
    undated.length && `<div class="reg"><h3 class="sub-t">${ic('world')}위키데이터 경력 <small>${undated.length}건</small></h3><ul class="reg-l">${undated.map(([x, t]) => `<li class="reg-i"><a class="lk" href="${href.g(x[3])}"><b>${esc(x[0])}</b></a><span class="reg-g">${t}</span></li>`).join('')}</ul></div>`,
    car.award?.length && `<div class="reg"><h3 class="sub-t">${ic('trophy')}수상 <small>${car.award.length}건</small></h3><ul class="reg-l">${car.award.map(x => `<li class="reg-i"><span class="reg-d">${x[1] || ''}</span><a class="lk" href="${href.g(x[3])}"><b>${esc(x[0])}</b></a></li>`).join('')}</ul></div>`,
  ].filter(Boolean).join('');
  if (rows.length || regBlock || EV.length) {
    const cnt = NB.FILTERS.map(([n, f]) => [n, EV.filter(f).length]);
    add('s-career', '경력 흐름', 'timeline-event', (rows.length + undated.length + (Pj?.history?.length || 0)) + '건',
      `${rows.length ? `<div id="gt">${NB.gantt(rows, y0, y1, NB.ticks(y0, y1))}</div>` : ''}
       ${regBlock}
       ${EV.length ? NB.exp('전체 연대기', EV.length + '건', `<div style="margin-bottom:var(--s-6)">${NB.seg('tl', cnt)}</div>${NB.tl(EV)}`) : ''}`,
      { cls: 'career', aside: main.length && main.length < rows.length ? NB.seg('gt', [['주요 경력', main.length], ['전체', rows.length]]) : '' });
  }

  /* ── 의정·재산(국회의원) ── */
  if (Pj) {
    const bl = Pj.bills || {}, br = bl.by_result || {}, V = Pj.votes || {}, vt = Object.entries(V.summary || {});
    const vsum = k => vt.reduce((s, [, x]) => s + (x[k] || 0), 0);
    const vTot = NB.voteParts({ 찬성: vsum('찬성'), 반대: vsum('반대'), 기권: vsum('기권'), 불참: vsum('불참') });
    const bm = bl.by_month || {}, bmK = Object.keys(bm).sort(), months = [];
    if (bmK.length) for (let d = new Date(bmK[0] + '-01T00:00:00Z'); d.toISOString().slice(0, 7) <= bmK[bmK.length - 1]; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(d.toISOString().slice(0, 7));
    const res = r => r === '대안반영폐기' ? '대안 반영' : r;
    const bst = [['전체', (bl.recent || []).length], ...Object.entries(br).map(([k, v]) => [res(k), v])];
    const brow = b => `<a class="brow brow--bill" data-res="${esc(res(b.result))}" href="${esc(b.url)}" target="_blank" rel="noopener"><time>${NB.ymd(b.date)}</time><b>${esc(b.name)}<small>${b.no ? `의안번호 ${esc(b.no)} · ` : ''}${esc(b.committee || '')}${b.proposer ? ' · ' + esc(b.proposer) : ''}</small></b><span class="tag ${b.result === '계류' ? 'warn' : ''}">${esc(res(b.result) || '')}</span></a>`;
    const A = Pj.assets?.records || [], last = A[A.length - 1], aRows = A.slice().reverse();
    const ext = (u, t) => `<a class="lnk" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}${ic('external-link')}</a>`;
    const vbill = v => `https://likms.assembly.go.kr/bill/billDetail.do?billId=${encodeURIComponent(v.id)}`;
    const cms = String(Pj.committees || '').split(/\s*[,·]\s*/).filter(Boolean);
    const blocks = [
      (bl.lead_count || bl.co_count) && `<div class="blk"><h3 class="sub-t">대표 발의 <small>제${(bl.ages || Pj.ages).join('·')}대</small></h3>
        <div class="blk-v">${NB.donut(Object.entries(br).map(([k, v]) => [k, v, k === '계류' ? 'warn' : k === '원안가결' || k === '수정가결' ? 'pos' : 'k2']), `<span><b>${bl.lead_count}</b>건</span>`)}
        <ul class="stack-lg legend-v">${Object.entries(br).map(([k, v]) => `<li class="${k === '계류' ? 'warn' : k === '원안가결' || k === '수정가결' ? 'pos' : 'k2'}"><i></i>${esc(res(k))}<b>${v}</b></li>`).join('')}<li class="mute"><i></i>공동 발의<b>${bl.co_count || 0}</b></li></ul></div>
        ${(bl.recent || []).length ? NB.exp('법안 목록', bl.recent.length + '건', `${months.length > 1 ? `<div class="bill-m"><div class="stat-l">월별 대표 발의</div>${NB.vbars(months.map(m => ["'" + m.slice(2).replace('-', '.'), bm[m] || 0, false]), { cls: 'vbars--sm' })}</div>` : ''}
          <div class="bill-f">${NB.seg('bill', bst)}</div><div>${bl.recent.map(brow).join('')}</div><div class="blk-lnk">${ext('https://likms.assembly.go.kr/bill/main.do', '의안정보시스템')}</div>`) : ''}</div>`,
      V.count && `<div class="blk"><h3 class="sub-t">본회의 표결 <small>${num(V.count)}건</small></h3>${NB.stack(vTot.filter(p => p[1]), { pct: true })}
        ${NB.exp('대수별 · 반대·기권 안건', (V.dissent || []).length + '건', `<div class="blk">${vt.map(([age, v]) => `<div><div class="stat-l" style="margin-bottom:6px">제${age}대 <b class="num">${num(Object.values(v).reduce((s, x) => s + x, 0))}</b>건</div>${NB.stack(NB.voteParts(v).filter(p => p[1]), { pct: true })}</div>`).join('')}</div>
          <div class="sub-g">${(V.dissent || []).map(v => `<a class="brow" href="${vbill(v)}" target="_blank" rel="noopener"><time>${NB.ymd(v.date)}</time><b>${esc(v.name)}</b><span class="tag ${v.vote === '반대' ? 'neg' : 'warn'}">${esc(v.vote)}</span></a>`).join('')}</div>`)}</div>`,
      last && `<div class="blk"><h3 class="sub-t">신고 재산 <small>${last.year}년</small></h3><div class="stat-v">${NB.won(last.total)}</div>
        ${A.length > 1 ? `<div style="--hb-l:3.5em">${NB.hbars(aRows.map(r => [r.year + '년', r.total]), { fmt: NB.eok1 })}</div>` : ''}
        ${NB.stack([...NB.assetParts(last), ['토지', last.land || 0, 'k5'], ['증권', last.securities || 0, 'k5']], { fmt: v => v ? NB.eok1(v) : '0' })}
        ${last.debt ? `<div class="debt">${ic('receipt')}채무<b>${NB.won(last.debt)}</b></div>` : ''}
        ${NB.exp('신고별 내역', A.length + '건', NB.table(['', ...aRows.map(r => r.year + '년')], [
          ['종전 총액', ...aRows.map(r => NB.won(r.prev))], ['증가', ...aRows.map(r => NB.won(r.inc))], ['감소', ...aRows.map(r => NB.won(r.dec))],
          ['신고 총액', ...aRows.map(r => `<b>${NB.won(r.total)}</b>`)], ['변동', ...aRows.map(r => `<span class="${r.change < 0 ? 'neg' : 'pos'}">${NB.swon(r.change)}</span>`)],
          ['채무', ...aRows.map(r => NB.won(r.debt || 0))], ['원문', ...aRows.map(r => ext(r.url, String(r.issue || '원문').replace('국회공보 ', '')))]], aRows.map((_, i) => i + 1)))}</div>`,
    ].filter(Boolean);
    add('s-pol', '의정·재산', 'scale', null, `${NB.mini([
        ['선수', esc(Pj.reelect || ''), 'award'], ['당선', `제${Pj.ages.join('·')}대${Pj.terms?.[0]?.kind ? ' · ' + esc(Pj.terms[0].kind) : ''}`, 'checkbox'],
        ['선거구', gl('g:region:' + Pj.district, Pj.district), 'map-pin'], cms.length && ['소속 위원회', cms.map(c => gl('g:committee:' + c, c)).join('<i class="sep">·</i>'), 'users-group'],
        ['정당', gl('g:party:' + Pj.party, Pj.party), 'flag'], ['당적 변경', `${(Pj.party_switches || []).length}회`, 'flag'],
      ].filter(Boolean))}${blocks.length ? `<div class="cols cols-${Math.min(3, blocks.length)}">${blocks.join('')}</div>` : ''}`);
  }

  /* ── 관계 ── */
  const RC = [['family', '가족'], ['school', '학연'], ['region', '지연'], ['career', '경력·조직'], ['party', '정당'], ['case', '사건·재판']];
  const RS = { spouse: '배우자', father: '부친', mother: '모친', child: '자녀', sibling: '형제자매', relative: '친척', educated: '출신 학교', alumni: '동문', birthplace: '출생지', district: '지역구', member: '소속 정당', position: '역임 직위', employer: '소속 기관', team: '소속 팀', member_of: '소속', court: '재판' };
  const PEER = { educated: '동문', alumni: '동문', birthplace: '같은 고향', district: '같은 지역구', member: '같은 정당', position: '같은 직위', employer: '같은 기관', team: '같은 팀', member_of: '같은 소속', court: '같은 재판' };
  const relG = RC.map(([t, label]) => [label, (B.rel || []).filter(r => r[1] === t)]).filter(x => x[1].length);
  if (relG.length) add('s-rel', '관계', 'affiliate', relN + '명', `<div class="rels">${relG.map(([c, rs]) => `<div class="rgroup"><div class="rg-h">${esc(c)}<small>${rs.length}</small></div>${rs.map(r => {
      const [o, , sub] = r;
      if (!o.startsWith('g:')) return `<div class="rnode">${pcard(o, RS[sub] || sub)}</div>`;
      const peers = B.gp?.[o] || [];
      return `<div class="rnode"><a class="lk" href="${href.g(o)}">${lgi(o)}<b>${esc(o.split(':').slice(2).join(':'))}</b></a><small>${esc(RS[sub] || sub)}</small>${peers.length ? `<div class="rpeers"><span class="rpeer-l">${esc(PEER[sub] || '함께')}</span>${peers.map(p => pcard(p)).join('')}</div>` : ''}</div>`;
    }).join('')}</div>`).join('')}</div>`);

  /* ── 발언 ── */
  if (Q.length) add('s-q', '발언', 'quote', Q.length + '건', `<div class="quotes">${Q.slice(0, 6).map(NB.quote).join('')}</div>
    ${Q.length > 6 ? NB.exp('발언 전체', (Q.length - 6) + '건', `<div class="quotes">${Q.slice(6).map(NB.quote).join('')}</div>`) : ''}`);

  /* ── 사건·사고 ── */
  const YRS = [...new Set(HI.map(x => x.d.slice(0, 4)))].sort();
  const yc = {}; HI.forEach(x => { const y = x.d.slice(0, 4); (yc[y] ||= {})[x.cat] = (yc[y][x.cat] || 0) + 1; });
  if (INC.length) {
    const n = { 논란: INC.filter(x => x.cat === '논란').length, 법적: INC.filter(x => x.cat === '법적').length };
    add('s-inc', '사건·사고', 'alert-triangle', INC.length + '건', `<div class="inc">
      <div><h3 class="sub-t">연도별 <small>${YRS[0]}–${YRS[YRS.length - 1]}</small></h3>${NB.vstack(YRS.map(y => [y, { 논란: yc[y]['논란'] || 0, 법적: yc[y]['법적'] || 0 }]), [['논란', 'warn'], ['법적', 'neg']], { lab: y => "'" + y.slice(2), lc: y => (+y % 2 ? 'is-odd' : '') })}
        ${NB.stack([['논란', n['논란'], 'warn'], ['법적', n['법적'], 'neg']].filter(x => x[1]), { pct: true })}</div>
      <div><h3 class="sub-t">최근 기록</h3><div class="alist">${INC.slice(0, 6).map(NB.hrow).join('')}</div></div></div>
      ${INC.length > 6 ? NB.exp('이전 기록', (INC.length - 6) + '건', `<div id="inc-l"></div>`, false, 'x-inc') : ''}`);
  }

  /* ── 보도 ── */
  const cats = {}; HI.forEach(x => cats[x.cat] = (cats[x.cat] || 0) + 1);
  const CATS = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const mc = {}; HI.forEach(x => { const m = x.d.slice(0, 7); (mc[m] ||= {})[x.cat] = (mc[m][x.cat] || 0) + 1; });
  const mk = Object.keys(mc).sort(), mAll = [];
  if (mk.length) for (let d = new Date(mk[0] + '-01T00:00:00Z'); d.toISOString().slice(0, 7) <= mk[mk.length - 1]; d.setUTCMonth(d.getUTCMonth() + 1)) { const m = d.toISOString().slice(0, 7); mAll.push([m, mc[m] || {}]); }
  const press = AR?.top?.length ? AR.top : Object.entries(HI.reduce((o, x) => (x.press && (o[x.press] = (o[x.press] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const hcSeg = [['전체', HI.length], ...CATS.filter(([c]) => c !== '논란' && c !== '법적')];
  if (INC.length) hcSeg.splice(Math.min(3, hcSeg.length), 0, ['사건·사고', INC.length]);
  const HF = { 전체: () => true, '사건·사고': x => x.cat === '논란' || x.cat === '법적' };
  const toA = r => ({ t: r[0] || '', title: r[1], url: r[2], press: r[3] });
  const lastA = (AR?.last || []).map(toA);
  const dayN = {}; lastA.forEach(a => { const d = a.t.slice(0, 10); dayN[d] = (dayN[d] || 0) + 1; });
  const news = [
    (HI.length || press.length) && `<div class="news-top${HI.length && press.length ? '' : ' news-top--1'}">
      ${HI.length ? `<div><div class="sub-h"><h3 class="sub-t">기록 추이 <small>${num(HI.length)}건</small></h3>${mAll.length > 24 ? NB.seg('nc', [['연도별'], ['월별']]) : ''}</div>
        <div id="nc0">${NB.vstack(YRS.map(y => [y, yc[y]]), CATS.map(([c]) => [c, NB.HCAT[c] || 'mute']), { lab: y => "'" + y.slice(2), lc: y => (+y % 2 ? 'is-odd' : '') })}</div>
        ${mAll.length > 24 ? `<div id="nc1" hidden>${NB.vstack(mAll, CATS.map(([c]) => [c, NB.HCAT[c] || 'mute']), { cls: 'vbars--m', lab: m => m.endsWith('-01') && +m.slice(0, 4) % 2 === 0 ? "'" + m.slice(2, 4) : '', lc: m => (+m.slice(0, 4) % 4 ? 'is-odd' : ''), tip: m => m.replace('-', '.') })}</div>` : ''}
        ${NB.stack(CATS.map(([c, n]) => [c, n, NB.HCAT[c] || 'mute']))}</div>` : ''}
      ${press.length ? `<div><h3 class="sub-t">많이 다룬 언론사 <small>${num(AR?.pc || press.length)}곳</small></h3>${NB.hbars(press.slice(0, 6))}</div>` : ''}</div>`,
    (B.iss || []).length && '<div class="issues">' + (B.iss || []).slice().reverse().slice(0, 3).map(([d, t, i]) => `<a class="issue" href="${B0}issue/${encodeURIComponent(i)}"><span class="tag acc">${ic('news')}오늘의 이슈</span><b>${esc(t)}</b><time>${NB.ymd(d)}</time>${ic('arrow-up-right')}</a>`).join('') + '</div>',
    (B.pa || []).length && `<div class="acards">${B.pa.map(([t, title, url, pr, img]) => NB.acard({ t, title, url, press: pr, img: photo(img) })).join('')}</div>`,
    lastA.length && `<div style="margin-top:var(--s-8)">${NB.agroup(lastA, {})}
      ${AR.c > lastA.length ? NB.exp('이전 보도', num(AR.c - lastA.length) + '건', `<div id="arts"></div>`, false, 'x-arts') : ''}</div>`,
    HI.length && NB.exp('장기 기록', num(HI.length) + '건', `<div class="hist-f">${NB.seg('hc', hcSeg)}</div><div id="hist"></div>`, false, 'x-hist'),
  ].filter(Boolean);
  if (news.length) add('s-news', '보도', 'file-text', AR ? num(AR.c) + '건' : num(HI.length) + '건', news.join(''));

  app.innerHTML = top + (SEC.length ? `<div class="body"><aside>${NB.toc(SEC)}${NB.toc(SEC, 'toc--bar')}</aside><div class="main">${SEC.map(x => x.html).join('')}</div></div>` : '');
  NB.bind();
  /* 상호작용 */
  const gt = i => document.querySelectorAll('#gt .gantt-r').forEach((r, k) => r.hidden = i === 0 && !MAIN.has(rows[k].typ));
  if (main.length && main.length < rows.length) gt(0);
  const histList = (hostId, list, step) => { const host = document.getElementById(hostId); if (!host) return; host.innerHTML = ''; host.nextElementSibling?.classList.contains('more-b') && host.nextElementSibling.remove();
    const c = {}; list.forEach(x => { const m = x.d.slice(0, 7); c[m] = (c[m] || 0) + 1; });
    const put = NB.grouper(host, x => x.d.slice(0, 7), m => `${NB.ym(m)}<small>${c[m]}건</small>`, NB.hrow);
    NB.more(host, list.length, step, (a, b) => put(list.slice(a, b))); };
  histList('hist', HI, 40); histList('inc-l', INC.slice(6), 30);
  let artsOn = false;
  const arts = async () => {
    if (artsOn || !AR) return; artsOn = true;
    const host = document.getElementById('arts'); if (!host) return;
    const seen = new Set(lastA.map(a => a.url));
    let all = [];
    if (B.ea && AR.c < 200) { try { all = (await NB.load(`${RAW}data/db/entities/${B.ea}.json`)).timeline.filter(a => a.title.includes(nm)); } catch (e) { } }
    if (!all.length) {
      const mons = [...new Set((AR.m || []).map(m => m[0]))].sort().reverse();
      for (const m of mons) for (const f of AR.f) { try { all.push(...(await gz(`${RAW}data/db/people/${f}/${m}.json.gz`)).map(toA)); } catch (e) { } }
    }
    const dn = {}, uniq = [];
    for (const a of all.sort((x, y) => (y.t || '').localeCompare(x.t || ''))) { if (seen.has(a.url)) continue; seen.add(a.url); uniq.push(a); const d = (a.t || '').slice(0, 10); dn[d] = (dn[d] || 0) + 1; }
    const put = NB.grouper(host, a => (a.t || '').slice(0, 10) || '날짜 미상', d => `${d.length === 10 ? NB.dayLabel(d) : esc(d)}<small>${dn[d] || ''}건</small>`, NB.arow);
    NB.more(host, uniq.length, 50, (a, b) => put(uniq.slice(a, b)));
  };
  document.addEventListener('click', e => {
    if (e.target.closest('#x-arts > .exp-b')) arts();
    const t = e.target.closest('[data-cat]');
    if (t) { const i = hcSeg.findIndex(([n]) => n === t.dataset.cat || (n === '사건·사고' && ['논란', '법적'].includes(t.dataset.cat))); const x = document.getElementById('x-hist'); if (i >= 0 && x) { if (!x.classList.contains('is-open')) x.querySelector('.exp-b').click(); x.querySelector(`[data-seg=hc] .seg-i[data-i="${i}"]`).click(); x.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
  });
  document.addEventListener('seg', e => {
    const { name, i } = e.detail;
    if (name === 'gt') gt(i);
    if (name === 'tl') { const f = NB.FILTERS[i][1]; document.querySelectorAll('.tl-i').forEach((li, k) => li.hidden = !f(EV[k])); }
    if (name === 'nc') { document.getElementById('nc0').hidden = i !== 0; document.getElementById('nc1').hidden = i !== 1; }
    if (name === 'bill') { const v = e.target.querySelectorAll('.seg-i')[i].firstChild.textContent; document.querySelectorAll('.brow--bill').forEach(r => r.hidden = i !== 0 && r.dataset.res !== v); }
    if (name === 'hc') { const c = hcSeg[i][0]; histList('hist', HI.filter(HF[c] || (x => x.cat === c)), 40); }
  });
  if (SEC.length) NB.spy(SEC.map(x => x.id));
  NB.openAll();
  if (/[?&]open=1/.test(location.search)) await arts();
  document.body.dataset.ready = '1';
})();
