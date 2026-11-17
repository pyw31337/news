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
      G = (await NB.load(`${B0}data/p/g/${String(await shard(k, 64)).padStart(2, '0')}.json`).catch(() => null))?.[k];
    }
  } catch (e) { G = null; }
  if (!G) {
    let cd = null, cidx = null, og = null;
    try { cd = await NB.load(B0 + 'data/corporate_dossier.json').catch(() => null); } catch(e){}
    try { cidx = await NB.load(B0 + 'data/db/corps/index.json').catch(() => null); } catch(e){}
    try { og = await NB.load(B0 + 'data/ontology_graph.json').catch(() => null); } catch(e){}
    let cname = k, code = null;
    if (cd?.corps) {
      const match = Object.entries(cd.corps).find(([c, val]) => val.corp_name === k || k.includes(val.corp_name) || val.corp_name.includes(k));
      if (match) { code = match[0]; cname = match[1].corp_name; }
    }
    if (!code && cidx?.corps) {
      const cm = cidx.corps.find(c => c.name === k || k.includes(c.name) || c.name.includes(k));
      if (cm) { code = cm.code; cname = cm.name; }
    }
    const matchedNode = og?.nodes?.find(n => n.name === k || (code && n.props?.code === code));
    if (code || matchedNode) {
      const typ = matchedNode?.type || (code ? 'org' : 'career');
      G = { n: cname || k, t: typ === 'corporation' ? 'org' : (TY[typ] ? typ : 'org'), c: 0, m: [] };
    }
  }
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
  let corpData = null, corpCode = null, corpFilings = null;
  try {
    const cd = await NB.load(B0 + 'data/corporate_dossier.json').catch(() => null);
    if (cd?.corps) {
      const match = Object.entries(cd.corps).find(([code, c]) => c.corp_name === G.n || G.n.includes(c.corp_name) || c.corp_name.includes(G.n));
      if (match) { corpCode = match[0]; corpData = match[1]; }
    }
  } catch(e){}
  try {
    const cidx = await NB.load(B0 + 'data/db/corps/index.json').catch(() => null);
    if (cidx?.corps) {
      const cm = cidx.corps.find(c => c.name === G.n || G.n.includes(c.name) || c.name.includes(G.n));
      if (cm) {
        corpCode = corpCode || cm.code;
        corpFilings = cm;
      }
    }
  } catch(e){}
  let ontoGraph = null, ontoNode = null, ontoLinks = [];
  try {
    ontoGraph = await NB.load(B0 + 'data/ontology_graph.json').catch(() => null);
    if (ontoGraph?.nodes) {
      ontoNode = ontoGraph.nodes.find(n => n.name === G.n || (corpCode && n.props?.code === corpCode) || (n.name && (G.n === n.name || (G.n.length >= 3 && n.name.includes(G.n)))));
      if (ontoNode && ontoGraph.edges) {
        ontoLinks = ontoGraph.edges.filter(e => e.src === ontoNode.id || e.tgt === ontoNode.id);
      }
    }
  } catch(e){}
  const head = `<section class="hero">
    <div>
      <span class="hero-role">${ic(ti)}${esc(tl)}</span>
      <h1>${esc(G.n)}</h1>
      ${W?.desc ? `<p class="hero-line">${esc(W.desc)}</p>` : ''}
      ${NB.facts([
        ['인물', `${num(G.c)}명`, 'users'],
        corpData && ['상장시장', `${corpData.market} (${corpCode})`, 'chart-bar'],
        corpFilings && !corpData && ['상장시장', `${corpFilings.market} (${corpCode})`, 'chart-bar'],
        corpFilings && ['DART 공시', `${num(corpFilings.filings_count)}건`, 'file-text'],
        ontoLinks.length && ['온톨로지 관계', `${num(ontoLinks.length)}개 연결`, 'topology-star-3'],
        corpData && ['업종', corpData.industry, 'building'],
        corpData && ['설립일', corpData.founded, 'calendar'],
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
    corpData && (corpData.employees?.length) && NB.stat('임직원', num(corpData.employees.at(-1).total), '명', `정규직 ${((corpData.employees.at(-1).regular/corpData.employees.at(-1).total)*100).toFixed(1)}%`),
    corpData && (corpData.financials?.length) && NB.stat('최근 매출', `${(corpData.financials.at(-1).sales/10000).toFixed(1)}`, '조원', `${corpData.financials.at(-1).year}년 기준`),
  ].filter(Boolean);
  const kinds_nav = kinds ? `<div class="ent-k">${Object.entries(kinds).map(([n, v]) => `<a class="src-chip${n === G.n ? ' is-on' : ''}" href="${href.g('kind:' + n)}">${esc(n)}<small>${num(v.c)}</small></a>`).join('')}</div>` : '';
  if (corpData) {
    const cf = corpData.financials || [], cemp = (corpData.employees || []).at(-1) || {}, cexec = corpData.executives_history || [], chis = corpData.history || [];
    const maxSales = Math.max(1, ...cf.map(x => x.sales || 0));
    const finHtml = `<div class="card" style="padding:var(--s-4, 16px);background:var(--paper-soft, #f8f9fc);border-radius:var(--r-md, 12px);border:1px solid var(--line, #e2e8f0);margin-bottom:var(--s-4, 16px)">
      <div style="font-size:13px;color:var(--ink-muted, #64748b);margin-bottom:12px;display:flex;justify-content:space-between">
        <span>최근 5개년 매출·영업이익·자산 시계열 추이 (단위: 억원)</span>
        <span class="src-chip" style="font-size:11px">금융감독원 OpenDART 공시 기반</span>
      </div>
      <div style="display:grid;gap:8px">
        ${cf.map(r => `
          <div style="display:grid;grid-template-columns:55px 1fr 110px;align-items:center;gap:10px;font-size:13px">
            <span style="font-weight:700">${r.year}년</span>
            <div style="height:14px;background:#e2e8f0;border-radius:7px;overflow:hidden;display:flex">
              <i style="height:100%;width:${(r.sales/maxSales*100).toFixed(0)}%;background:#1d4ed8;border-radius:7px"></i>
            </div>
            <div style="text-align:right">매출 <b>${(r.sales/10000).toFixed(1)}조</b></div>
          </div>
          <div style="display:grid;grid-template-columns:55px 1fr 110px;font-size:11px;color:var(--ink-muted, #64748b);padding-bottom:6px;border-bottom:1px dashed #e2e8f0">
            <span></span>
            <span>영업이익 ${(r.op_income/10000).toFixed(2)}조 · 순이익 ${(r.net_income/10000).toFixed(2)}조</span>
            <span style="text-align:right">자산 ${(r.assets/10000).toFixed(1)}조</span>
          </div>
        `).join('')}
      </div>
    </div>`;
    add('s-corp-fin', '기업 재무 시계열 성장 추이', 'chart-bar', `${cf.length}개년`, finHtml);

    const empHtml = `<div class="card" style="padding:var(--s-4, 16px);background:var(--paper-soft, #f8f9fc);border-radius:var(--r-md, 12px);border:1px solid var(--line, #e2e8f0);margin-bottom:var(--s-4, 16px)">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;font-size:13px">
        <div>총 임직원: <b>${num(cemp.total)}명</b> (정규직 ${((cemp.regular/cemp.total)*100).toFixed(1)}%)</div>
        <div>평균 근속: <b>${cemp.avg_tenure_years}년</b></div>
        <div>성비: 남성 <b>${cemp.male_ratio}%</b> · 여성 <b>${cemp.female_ratio}%</b></div>
      </div>
      <div style="height:12px;border-radius:6px;background:#e2e8f0;overflow:hidden;display:flex;margin-bottom:14px">
        <i style="height:100%;width:${cemp.male_ratio}%;background:#2563eb" title="남성 ${cemp.male_ratio}%"></i>
        <i style="height:100%;width:${cemp.female_ratio}%;background:#ea580c" title="여성 ${cemp.female_ratio}%"></i>
      </div>
      <h4 style="font-size:13px;margin:12px 0 6px">사명 변천사 및 기업 주요 연혁</h4>
      <ul style="margin:0;padding-left:18px;font-size:12.5px;line-height:1.7;color:var(--ink-sub, #334155)">
        ${chis.map(h => `<li><span style="color:var(--ink-muted, #64748b)">${esc(h.date)}</span> <b>[${esc(h.type)}]</b> ${esc(h.event)}</li>`).join('')}
      </ul>
    </div>`;
    add('s-corp-emp', '고용 구조 & 사명 변천사', 'users', `${num(cemp.total)}명`, empHtml);

    if (cexec.length) {
      const execHtml = `<div style="overflow-x:auto">
        <table class="tbl" style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr><th style="text-align:left;padding:8px">성명</th><th style="text-align:left;padding:8px">직위/역할</th><th style="text-align:right;padding:8px">재직 기간</th><th style="text-align:right;padding:8px">출생</th><th style="text-align:left;padding:8px">주요 이력</th></tr></thead>
          <tbody>
            ${cexec.map(x => `<tr style="border-bottom:1px solid var(--line, #e2e8f0)"><td style="padding:8px"><b>${esc(x.name)}</b></td><td style="padding:8px"><span class="src-chip" style="font-size:11px">${esc(x.role)}</span></td><td style="text-align:right;padding:8px">${esc(x.period)}</td><td style="text-align:right;padding:8px">${esc(x.birth_year || '—')}</td><td style="padding:8px;font-size:12px;color:var(--ink-muted, #64748b)">${esc(x.note)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`;
      add('s-corp-exec', '역대 대표이사 및 주요 경영진', 'id-badge', `${cexec.length}명`, execHtml);
    }
  }
  if (corpFilings) {
    const dartHtml = `<div class="card" style="padding:var(--s-4, 16px);background:var(--paper-soft, #f8f9fc);border-radius:var(--r-md, 12px);border:1px solid var(--line, #e2e8f0);margin-bottom:var(--s-4, 16px)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;font-size:13px">
        <span><b>${esc(corpFilings.name)}</b> DART 전자공시 및 사건사고 타임라인 (총 ${corpFilings.filings_count}건 · 사건사고/소송 ${corpFilings.incidents_count}건)</span>
        <span class="src-chip" style="font-size:11px">DART 전자공시</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${Object.entries(corpFilings.categories || {}).map(([cat, cnt]) => `<span class="src-chip" style="font-size:11px">${esc(cat)} <b>${cnt}</b></span>`).join('')}
      </div>
      <div style="display:grid;gap:6px">
        ${(corpFilings.recent_filings || []).map(f => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #edf2f7;font-size:12.5px">
            <div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px">
              <span class="src-chip" style="font-size:10px;padding:2px 6px;margin-right:6px">${esc(f.category)}</span>
              <a href="${esc(f.url)}" target="_blank" rel="noopener" style="font-weight:600;color:inherit">${esc(f.title)}</a>
            </div>
            <time style="font-size:11px;color:var(--ink-muted, #64748b);flex:none">${esc(f.date)}</time>
          </div>
        `).join('')}
      </div>
    </div>`;
    add('s-corp-dart', 'DART 공시 & 사건사고 이력', 'file-text', `${corpFilings.filings_count}건`, dartHtml);
  }
  if (ontoNode && ontoLinks.length) {
    const directNeighbors = ontoLinks.map(e => {
      const isSrc = e.src === ontoNode.id;
      const targetId = isSrc ? e.tgt : e.src;
      const targetNode = ontoGraph.nodes.find(n => n.id === targetId) || { name: targetId, type: 'entity' };
      const rel = isSrc ? e.rel : `REV_${e.rel}`;
      return { node: targetNode, rel, weight: e.weight, meta: e.meta || {} };
    });

    const schools = directNeighbors.filter(d => d.rel === 'ALUMNI_OF' || d.node.type === 'school');
    const exams = directNeighbors.filter(d => d.rel === 'EXAM_COHORT' || d.node.type === 'exam_cohort');
    const execs = directNeighbors.filter(d => d.rel.includes('EXECUTIVE') || d.rel.includes('MEMBER'));
    let crimes = directNeighbors.filter(d => d.node.type === 'legal_guideline' || d.rel.includes('GUIDELINE'));
    const themes = directNeighbors.filter(d => d.node.type === 'theme' || d.node.type === 'incident' || d.node.type === 'current_issue');

    if (!crimes.length) {
      // 2-Hop 로테크 양형기준 추적 (연루 사건·이슈 경유)
      for (const t of themes) {
        const tEdges = (ontoGraph.edges || []).filter(e => (e.src === t.node.id || e.tgt === t.node.id) && (e.rel.includes('GUIDELINE') || e.rel.includes('APPLIES')));
        for (const te of tEdges) {
          const gId = te.src === t.node.id ? te.tgt : te.src;
          const gNode = (ontoGraph.nodes || []).find(n => n.id === gId && n.type === 'legal_guideline');
          if (gNode && !crimes.some(c => c.node.id === gNode.id)) {
            crimes.push({ node: gNode, rel: 'APPLIES_GUIDELINE', meta: { via: t.node.name } });
          }
        }
      }
    }

    let ontoBody = `<div class="card" style="padding:var(--s-4, 16px);background:var(--paper-soft, #f8f9fc);border-radius:var(--r-md, 12px);border:1px solid var(--line, #e2e8f0);margin-bottom:var(--s-4, 16px)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <span style="font-size:13px;font-weight:700">다차원 온톨로지 지식망 (총 ${ontoLinks.length}개 교차 관계망)</span>
        <span class="src-chip" style="font-size:11px">정재계·법조·공시·여론 온톨로지</span>
      </div>
      <p style="font-size:12px;color:var(--ink-muted, #64748b);margin:0 0 12px">
        인물·기업·학연·지연·사법연수원·DART 공시·대법원 양형기준이 상호 유기적으로 결합된 온톨로지 연결 체계입니다.
      </p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px">
        ${schools.length ? `
          <div style="background:#fff;border:1px solid var(--line, #e2e8f0);border-radius:8px;padding:10px">
            <div style="font-size:12px;font-weight:700;color:var(--ink, #0f172a);margin-bottom:6px">🎓 학연 네트워크 (${schools.length}개)</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${schools.map(s => `<span class="src-chip" style="font-size:11.5px">${esc(s.node.name)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${exams.length ? `
          <div style="background:#fff;border:1px solid var(--line, #e2e8f0);border-radius:8px;padding:10px">
            <div style="font-size:12px;font-weight:700;color:var(--ink, #0f172a);margin-bottom:6px">⚖️ 사법시험·연수원 기수 동기</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${exams.map(x => `<span class="src-chip is-on" style="font-size:11.5px">${esc(x.node.name)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${execs.length ? `
          <div style="background:#fff;border:1px solid var(--line, #e2e8f0);border-radius:8px;padding:10px">
            <div style="font-size:12px;font-weight:700;color:var(--ink, #0f172a);margin-bottom:6px">🏛️ 소속·재직 및 지배구조 관계망 (${execs.length}건)</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${execs.slice(0, 8).map(x => `<a href="${href.p(x.node.name)}" class="src-chip" style="font-size:11.5px">${esc(x.node.name)} <small>${esc(x.meta?.role || x.rel)}</small></a>`).join('')}
            </div>
          </div>
        ` : ''}
        ${themes.length ? `
          <div style="background:#fff;border:1px solid var(--line, #e2e8f0);border-radius:8px;padding:10px">
            <div style="font-size:12px;font-weight:700;color:var(--ink, #0f172a);margin-bottom:6px">📌 연관 테마·사건사고 타임라인 (${themes.length}건)</div>
            <div style="display:flex;flex-direction:column;gap:4px">
              ${themes.slice(0, 4).map(t => `<div style="font-size:12px;line-height:1.4"><span class="src-chip" style="font-size:10px;padding:1px 5px">${esc(t.node.type)}</span> <b>${esc(t.node.name)}</b></div>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      ${crimes.length ? `
        <div style="margin-top:12px;background:#fff5f5;border:1px solid #fed7d7;border-radius:8px;padding:10px 12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:12.5px;font-weight:700;color:#c53030">⚖️ 로테크(LegalTech) 대법원 양형기준 통계 연동</span>
            <span class="src-chip" style="font-size:10px;background:#fff;color:#c53030;border-color:#feb2b2">양형위원회 공식</span>
          </div>
          ${crimes.map(c => {
            const cp = c.node.props || {};
            return `
              <div style="font-size:12px;color:#2d3748;line-height:1.6">
                <div><b>적용 혐의:</b> ${esc(c.node.name)}</div>
                <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:4px">
                  <span>기본 권고형량: <b>${esc(cp.base_range || '—')}</b></span>
                  ${cp.loss_of_seat_rate ? `<span>당선무효(벌금 100만↑) 확률: <b style="color:#e53e3e">${cp.loss_of_seat_rate}%</b></span>` : ''}
                  ${cp.disqualification_rate ? `<span>임원 결격사유 확률: <b style="color:#e53e3e">${cp.disqualification_rate}%</b></span>` : ''}
                  <span>집행유예 확률: <b>${cp.probation_rate || 0}%</b></span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>`;
    add('s-onto', '다차원 온톨로지 지식망', 'topology-star-3', `${ontoLinks.length}개 관계`, ontoBody);
  }
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
