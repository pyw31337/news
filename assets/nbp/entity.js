/* 분류·모임 페이지(학교·경력·정당·소속·수상·직업·지역·위원회, 분야 kind:<분야>). 묶음: data/p/g/NN.json, data/p/kinds.json
   사람은 1계층만 인물 페이지로 연결, 2계층은 이름만, 3계층은 묶음에 들어오지 않음. 빈 섹션은 그리지 않음. */
(async () => {
  const { esc, ic, num, href, shard, RAW } = NB, app = document.getElementById('app'), B0 = NB.BASE;
  const k = new URLSearchParams(location.search).get('k') || '';
  const TY = { school: ['학교', 'school'], career: ['경력·기관', 'briefcase'], party: ['정당', 'flag'], org: ['소속', 'building'], award: ['수상', 'trophy'], occ: ['직업', 'id-badge'], region: ['지역', 'map-pin'], committee: ['국회 위원회', 'users-group'], case: ['사건·재판', 'gavel'], kind: ['분야', 'category'] };
  const fail = () => { app.innerHTML = `<section class="hero hero--empty"><div><h1>항목을 찾지 못했어요</h1><p class="hero-line"><a class="lnk" href="${B0}persons/">인물 보기${ic('arrow-right')}</a></p></div></section>`; document.body.dataset.ready = '1'; };
  let G, kinds = null;
  try {
    if (k.startsWith('kind:')) {
      kinds = await NB.load(B0 + 'data/p/kinds.json');
      const v = kinds[k.slice(5)]; if (!v) return fail();
      G = { n: k.slice(5), t: 'kind', c: v.c, m: v.m.map(([id, n, kd, t, ph, pg, o]) => [id, n, kd, t, ph, pg, o, null, null]) };
    } else {
      G = (await NB.load(`${B0}data/p/g/${String(await shard(k, 64)).padStart(2, '0')}.json`))[k];
    }
  } catch (e) { return fail(); }
  if (!G) return fail();
  const [tl, ti] = TY[G.t] || ['분류', 'category'];
  document.title = `${G.n} · NewsBoard`;
  const E = G.ea ? await NB.load(`${RAW}data/db/entities/${G.ea}.json`).catch(() => null) : null;
  const photo = u => !u ? null : /^https?:/.test(u) ? u : B0 + u;
  const M = G.m.filter(m => m[3] <= 2);
  const chip = m => NB.pchip({ name: m[1], photo: photo(m[4]) }, [m[6], m[7] ? `${m[7]}–${m[8] || ''}` : ''].filter(Boolean).join(' · '), m[5] ? href.p(m[0]) : null);
  const kc = {}; M.forEach(m => kc[m[2] || '기타'] = (kc[m[2] || '기타'] || 0) + 1);
  const KC = Object.entries(kc).sort((a, b) => b[1] - a[1]);
  const roles = {}; M.forEach(m => m[6] && (roles[m[6]] = (roles[m[6]] || 0) + 1));
  const RL = Object.entries(roles).sort((a, b) => b[1] - a[1]);
  const dated = M.filter(m => m[7]).sort((a, b) => a[7] - b[7]);
  const withPh = M.filter(m => m[4]).length;
  const W = E?.wiki;
  const head = `<section class="hero">
    <div>
      <span class="hero-role">${ic(ti)}${esc(tl)}</span>
      <h1>${esc(G.n)}</h1>
      ${W?.desc ? `<p class="hero-line">${esc(W.desc)}</p>` : ''}
      ${NB.facts([
        ['인물', `${num(G.c)}명`, 'users'],
        KC.length > 1 && ['분야', KC.slice(0, 4).map(([n, c]) => `<a class="lk" href="${href.g('kind:' + n)}">${esc(n)}</a> ${c}`).join('<i class="sep">·</i>'), 'category'],
        dated.length && ['기간', `${dated[0][7]}–${Math.max(...dated.map(m => m[8] || new Date().getFullYear()))}`, 'calendar'],
        E && ['수집 보도', `${num(E.timeline.length)}건`, 'file-text'],
      ].filter(Boolean))}
      ${W?.title ? `<div class="hero-src"><a class="src-chip" href="https://ko.wikipedia.org/wiki/${encodeURIComponent(W.title)}" target="_blank" rel="noopener">${ic('brand-wikipedia')}위키백과</a></div>` : ''}
    </div>
    ${G.lg ? `<figure class="hero-ph hero-ph--logo" style="--ph-max:220px"><img src="${esc(G.lg.u)}" alt="${esc(G.n)}" width="${G.lg.w}" height="${G.lg.h}"><figcaption><a href="${esc(G.lg.src)}" target="_blank" rel="noopener">${esc([G.lg.by, G.lg.lic].filter(Boolean).join(' · '))}</a></figcaption></figure>` : W?.thumb ? `<figure class="hero-ph hero-ph--logo" style="--ph-max:220px"><img src="${esc(W.thumb)}" alt="${esc(G.n)}"></figure>` : ''}
  </section>`;
  const SEC = [];
  const add = (id, title, icon, count, body, aside = '') => SEC.push({ id, title, icon, count, html: `<section class="sec" id="${id}">${NB.sh(title, { icon, count, aside })}${body}</section>` });
  const kp = [
    NB.stat('인물', num(G.c), '명', G.c > M.length ? `상위 ${num(M.length)}명 표시` : ''),
    M.length && NB.stat('사진 있음', Math.round(withPh / M.length * 100), '%', `${num(withPh)}명`),
    RL.length > 1 && !kinds && NB.stat('역할', RL.length, '종', esc(RL[0][0])),
    E && NB.stat('수집 보도', num(E.timeline.length), '건', E.last_seen ? `최근 ${NB.ymd(E.last_seen)}` : ''),
  ].filter(Boolean);
  const kinds_nav = kinds ? `<div class="ent-k">${Object.entries(kinds).map(([n, v]) => `<a class="src-chip${n === G.n ? ' is-on' : ''}" href="${href.g('kind:' + n)}">${esc(n)}<small>${num(v.c)}</small></a>`).join('')}</div>` : '';
  if (M.length) add('s-m', '인물', 'users', num(G.c) + '명', `${KC.length > 1 && !kinds ? `<div style="margin-bottom:var(--s-6)">${NB.stack(KC.map(([n, c], i) => [n, c, 'k' + Math.min(5, i + 1)]), { pct: true })}</div>` : ''}<div class="ent-grid" id="mg"></div>`,
    RL.length > 1 && !kinds ? NB.seg('role', [['전체', M.length], ...RL.slice(0, 5)]) : (kinds ? '' : ''));
  if (dated.length >= 2) {
    const y0 = Math.min(...dated.map(m => m[7])), y1 = new Date().getFullYear(), ticks = NB.ticks(y0, y1);
    add('s-t', '재임·재직 기간', 'timeline-event', dated.length + '명', NB.gantt(dated.slice(-60).map(m => ({ d: `${m[7]}${m[8] && m[8] !== m[7] ? '~' + m[8] : m[8] ? '' : '~' + y1}`, title: m[1], href: m[5] ? href.p(m[0]) : null, now: !m[8], typ: '' })), y0, y1, ticks));
  }
  if (E?.timeline?.length) {
    const A = E.timeline.slice().sort((a, b) => b.t.localeCompare(a.t)), dn = {};
    A.forEach(a => { const d = a.t.slice(0, 10); dn[d] = (dn[d] || 0) + 1; });
    const pc = {}; A.forEach(a => pc[a.press] = (pc[a.press] || 0) + 1);
    const P = Object.entries(pc).sort((a, b) => b[1] - a[1]).slice(0, 6);
    add('s-a', '보도', 'file-text', num(A.length) + '건', `${P.length > 1 ? `<div class="news-top news-top--1"><div><h3 class="sub-t">많이 다룬 언론사</h3>${NB.hbars(P)}</div></div>` : ''}<div id="al"></div>`);
    SEC[SEC.length - 1].A = A; SEC[SEC.length - 1].dn = dn;
  }
  app.innerHTML = head + (kinds_nav ? `<section class="sec">${kinds_nav}</section>` : '') + (kp.length > 1 ? `<section class="sec"><div class="kpis" style="--kpi-n:${kp.length}">${kp.join('')}</div></section>` : '')
    + (SEC.length ? `<div class="body"><aside>${NB.toc(SEC)}${NB.toc(SEC, 'toc--bar')}</aside><div class="main">${SEC.map(x => x.html).join('')}</div></div>` : '');
  NB.bind();
  const mg = document.getElementById('mg');
  let mb = null;
  const grid = list => { if (!mg) return; mg.innerHTML = ''; mb && mb.remove(); mb = NB.more(mg, list.length, 60, (a, b) => mg.insertAdjacentHTML('beforeend', list.slice(a, b).map(chip).join(''))); };
  grid(M);
  document.addEventListener('seg', e => { if (e.detail.name === 'role') grid(e.detail.i ? M.filter(m => m[6] === RL[e.detail.i - 1][0]) : M); });
  const AS = SEC.find(x => x.A);
  if (AS) { const host = document.getElementById('al'); const put = NB.grouper(host, a => a.t.slice(0, 10), d => `${NB.dayLabel(d)}<small>${AS.dn[d]}건</small>`, NB.arow); NB.more(host, AS.A.length, 30, (a, b) => put(AS.A.slice(a, b))); }
  if (SEC.length) NB.spy(SEC.map(x => x.id));
  document.body.dataset.ready = '1';
})();
