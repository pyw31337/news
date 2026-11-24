/* v2 홈: 인물 페이지 디자인 시스템 + v3 인텔리전스 인포데스크 융합 */
(() => {
  'use strict';

  const page = document.querySelector('main.page');
  if (page) {
    page.style.setProperty('padding-left', 'clamp(20px,4.4vw,64px)', 'important');
    page.style.setProperty('padding-right', 'clamp(20px,4.4vw,64px)', 'important');
  }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, filled = false) => `<svg class="icon"><use href="#i-${name}${filled ? '-f' : ''}"></use></svg>`;
  const nf = n => Number(n || 0).toLocaleString('ko-KR');
  const catColor = {
    '정치': '#2450e0', '경제': '#138a52', '사회': '#d33a3a', '세계': '#7654e8',
    'IT·과학': '#1686a8', '과학': '#4868d8', '건강': '#c24d6a', '환경': '#2b9b68',
    '문화': '#9257b7', '연예': '#cc4a8b', '스포츠': '#c87810'
  };
  const color = c => catColor[c] || '#6c717b';
  const imgStyle = u => u ? ` style="background-image:url('${esc(u)}')"` : '';
  const day = s => {
    if (!s) return '';
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? String(s).slice(0, 10).replaceAll('-', '.') : d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll(' ', '');
  };
  const short = (s, n = 100) => { const t = String(s || ''); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
  const uniq = a => [...new Set((a || []).filter(Boolean))];
  const root = '../';
  const dataRoot = location.protocol === 'file:' ? 'https://pyw31337.github.io/news/data/' : '../data/';
  let V = null;

  function dataIssue(v, full) {
    const base = {
      id: v.id, title: v.title, category: v.cat, image: v.img,
      summary: v.summary || [], gallery: (v.imgs || []).map(img => ({ img })),
      sources: [], flow: [], opinion: v.op, entities: v.ents || [],
      keywords: v.kw || [], past: []
    };
    const out = { ...base, ...(full || {}) };
    if (v.flow?.length) out.flow = v.flow;
    out.flow_gap = v.flow_gap || '';
    return out;
  }

  function heroImage(i) {
    return i.image || (i.gallery || []).find(g => g.img)?.img || (i.sources || []).find(s => s.img)?.img || '';
  }

  function heroFallback(i) {
    return `<div class="hero-fallback"><span>${icon('trending-up', true)}</span><b>${esc(i.category || '오늘의 이슈')}</b><small>대표 이미지 준비 중 · 원문과 흐름을 먼저 확인하세요</small></div>`;
  }

  const genericTerms = new Set(['ai', '뉴스', '기사', '논란', '관련', '오늘', '현재', '정부', '한국', '사람', '이슈', '사건', '보도']);
  function issueTerms(i) {
    return uniq([...(i.keywords || []), ...(i.entities || []), ...String(i.title || '').split(/[\s·“”‘’'"…,:!?()[\]{}]+/)]).map(x => String(x).trim()).filter(x => x.length >= 2 && !genericTerms.has(x.toLowerCase()));
  }

  function relevance(item, terms) {
    const text = `${item.title || ''} ${item.body || ''} ${item.press || ''}`.toLowerCase();
    return terms.reduce((score, term) => score + (text.includes(term.toLowerCase()) ? (term.length >= 3 ? 2 : 1) : 0), 0);
  }

  function buildFlow(i) {
    if (Array.isArray(i.flow) && i.flow.length && !i.flow[0].items) {
      const all = i.flow.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const direct = all.filter(e => /세무사|수석|AI ?커닝|AI ?안경|한원석|세무냥이/i.test(e.title || ''));
      return (direct.length >= 4 ? direct : all).slice(-8);
    }
    const terms = issueTerms(i);
    const candidates = (i.flow || []).flatMap(x => (x.items || []).map(it => ({ date: x.date, title: it.title, body: it.body, url: it.url || it.ourl, img: it.img, press: it.press })))
      .map(e => ({ ...e, score: relevance(e, terms) })).filter(e => e.score > 0);
    const bestByDate = new Map();
    candidates.forEach(e => { const prior = bestByDate.get(e.date) || null; if (!prior || e.score > prior.score) bestByDate.set(e.date, e); });
    const events = [...bestByDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-6);
    if (events.length >= 3) return events;
    const sources = (i.sources || []).map(s => ({ date: s.time || s.t || '', title: s.title, body: s.body || s.press, url: s.url || s.ourl, img: s.img, press: s.press, score: relevance(s, terms) })).sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)));
    return [...events, ...sources.filter(s => !events.some(e => e.title === s.title)).slice(0, 6 - events.length)].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function reports(i) {
    const terms = issueTerms(i);
    const seen = new Set();
    return (i.sources || []).map(s => ({ ...s, _score: relevance(s, terms) })).sort((a, b) => b._score - a._score || String(b.time || b.t || '').localeCompare(String(a.time || a.t || ''))).filter(s => {
      const key = String(s.title || '').replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase();
      if (!key || seen.has(key)) return false; seen.add(key); return true;
    }).slice(0, 12);
  }

  function flowThumb(e, i, index) {
    if (e.img && typeof e.img === 'string' && e.img.trim()) return e.img.trim();
    if (Array.isArray(i.sources) && i.sources.length) {
      const match = i.sources.find(s => s.img && (s.url === e.url || s.title === e.title));
      if (match && match.img) return match.img;
      const partial = i.sources.find(s => s.img && e.title && s.title && (s.title.includes(e.title.slice(0, 8)) || e.title.includes(s.title.slice(0, 8))));
      if (partial && partial.img) return partial.img;
      const imgs = i.sources.map(s => s.img).filter(Boolean);
      if (imgs.length) return imgs[index % imgs.length];
    }
    if (Array.isArray(i.gallery) && i.gallery.length) {
      const g = i.gallery[index % i.gallery.length];
      if (g && g.img) return g.img;
    }
    return i.image || '';
  }

  const hrefEntity = k => {
    try { if (window.NB?.href?.e) return window.NB.href.e(k); } catch {}
    return `${root}e/?k=${encodeURIComponent(k)}`;
  };

  /* Layer 1: Macro Pulse & Briefing Bar (Fused from v3) */
  function renderMacroPulse(market, briefs) {
    const bar = $('#macroTicker');
    if (!bar) return;

    let itemsHtml = '';
    if (market && market.items) {
      const targets = [
        { key: 'KOSPI', label: '코스피' },
        { key: 'KOSDAQ', label: '코스닥' },
        { key: '미국 USD', label: '원/달러' },
        { key: 'S&P 500', label: 'S&P500' },
        { key: 'NASDAQ', label: '나스닥' }
      ];

      targets.forEach(t => {
        const item = market.items[t.key];
        if (item && item.day && item.day.c && item.day.c.length >= 2) {
          const closes = item.day.c;
          const cur = closes[closes.length - 1];
          const prev = closes[closes.length - 2];
          const diff = cur - prev;
          const diffPct = ((diff / prev) * 100).toFixed(2);
          const isPos = diff >= 0;
          itemsHtml += `
            <div class="ticker-item ${isPos ? 'pos' : 'neg'}">
              <span class="t-name">${t.label}</span>
              <span class="t-val">${nf(cur)}</span>
              <span class="t-diff">${isPos ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)} (${isPos ? '+' : ''}${diffPct}%)</span>
            </div>
          `;
        }
      });
    }

    if (!itemsHtml) {
      itemsHtml = '<span class="t-name">실시간 시장 지표 수신 중…</span>';
    }

    let briefText = '오늘의 주요 속보와 정책 변화가 실시간 반영되었습니다.';
    if (briefs && briefs.items && briefs.items.length) {
      briefText = briefs.items[0].title || briefText;
    }

    bar.innerHTML = `
      <div class="macro-in">
        <span class="macro-label">MACRO PULSE</span>
        <div class="ticker-items">${itemsHtml}</div>
        <div class="brief-bullet">
          <b>속보</b>
          <span>${esc(short(briefText, 60))}</span>
        </div>
      </div>
    `;
  }

  /* Layer 2 (Deck): 2-10 Issues Grid & Inline Expandable Drawer (Fused from v3) */
  function agendaDeckView(issues) {
    const deck = (issues || []).slice(1, 10);
    if (!deck.length) return '';

    let html = `
      <section class="section" id="agendaDeck">
        <div class="section-head">
          <div>
            <div class="eyebrow">TODAY AGENDA 2~10</div>
            <h2>오늘의 주요 어젠다 덱</h2>
          </div>
          <p>1위 메인 이슈 외 오늘 주목받은 9개 핵심 사건의 개요와 심층 맥락입니다.</p>
        </div>
        <div class="agenda-grid">
    `;

    deck.forEach((iss, idx) => {
      const rank = String(idx + 2).padStart(2, '0');
      const issEntities = (iss.entities || iss.ents || []).slice(0, 3);
      const issSummary = (iss.summary || [])[0] || iss.lead || '사건 개요 및 관련 보도를 확인하세요.';
      const issThumb = iss.image || (iss.sources || [])[0]?.img || (iss.gallery || [])[0]?.img || '';

      html += `
        <article class="agenda-card" data-issue-id="${esc(iss.id)}">
          ${issThumb ? `
            <a href="${root}issue/${esc(iss.id)}" class="agenda-card-thumb">
              <img src="${esc(issThumb)}" alt="${esc(iss.title)}" loading="lazy">
              <span class="agenda-rank-badge">#${rank}</span>
            </a>
            <div class="agenda-card-head" style="margin-top:2px; margin-bottom:8px;">
              <span class="badge" style="background:${color(iss.category || iss.cat)}18; color:${color(iss.category || iss.cat)}; padding:2px 8px; font-size:11px;">
                ${esc(iss.category || iss.cat || '종합')}
              </span>
              <span style="font-size:11px; color:var(--muted); font-weight:700;">${esc(iss.press || '주요 언론')}</span>
            </div>
          ` : `
            <div class="agenda-card-head">
              <span class="agenda-rank">#${rank}</span>
              <span class="badge" style="background:${color(iss.category || iss.cat)}18; color:${color(iss.category || iss.cat)}; padding:2px 8px; font-size:11px;">
                ${esc(iss.category || iss.cat || '종합')}
              </span>
            </div>
          `}
          <h3><a href="${root}issue/${esc(iss.id)}">${esc(iss.title)}</a></h3>
          <p class="agenda-summary-preview">${esc(short(issSummary, 110))}</p>
          
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
            ${issEntities.map(e => `<a class="entity-chip" style="font-size:11px; padding:3px 7px;" href="${hrefEntity(e)}">${esc(e)}</a>`).join('')}
          </div>

          <div class="agenda-card-foot">
            <span>보도 ${nf(iss.presses || (iss.sources || []).length)}건 · 반응 ${nf(iss.opinion?.total || iss.score || 0)}</span>
            <button class="expand-context-btn" data-target="${esc(iss.id)}">
              <span>맥락 펼치기</span> ↓
            </button>
          </div>
        </article>

        <!-- Inline Expandable Drawer for this Issue -->
        <div class="inline-context" id="context-${esc(iss.id)}">
          <div class="context-header">
            <b>🔍 ${esc(iss.title)} — 심층 전개 맥락</b>
            <button class="close-context-btn" data-close="${esc(iss.id)}">접기 ✕</button>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">
            <div>
              <small style="color:var(--muted); font-weight:800; text-transform:uppercase;">핵심 요약 포인트</small>
              <ul style="margin:6px 0 0; padding-left:16px; font-size:13px; color:var(--ink2);">
                ${(iss.summary || [issSummary]).slice(0, 3).map(s => `<li>${esc(s)}</li>`).join('')}
              </ul>
            </div>
            <div>
              <small style="color:var(--muted); font-weight:800; text-transform:uppercase;">대표 출처 보도</small>
              <div style="margin-top:6px; display:grid; gap:6px;">
                ${(iss.sources || []).slice(0, 3).map(s => `
                  <a href="${esc(s.url || '#')}" target="_blank" rel="noopener" style="font-size:12px; display:flex; justify-content:space-between; gap:8px;">
                    <span style="font-weight:600; color:var(--ink);">${esc(short(s.title, 36))}</span>
                    <span style="color:var(--muted);">${esc(s.press || '')}</span>
                  </a>
                `).join('') || '<span style="font-size:12px; color:var(--muted);">상세 출처 기사 연동 중</span>'}
              </div>
            </div>
          </div>
          <div style="margin-top:14px; text-align:right;">
            <a href="${root}issue/${esc(iss.id)}" style="font-size:12px; font-weight:700; color:var(--accent);">
              이슈 전체 히스토리 및 댓글 반응 보기 →
            </a>
          </div>
        </div>
      `;
    });

    html += '</div></section>';
    return html;
  }

  /* Layer 3: Global View (Fused from v3) */
  function globalView(globalData) {
    const items = (globalData?.issues || []).slice(0, 4);
    if (!items.length) return '';

    let html = `
      <section class="section" id="globalBriefing">
        <div class="section-head">
          <div>
            <div class="eyebrow">WORLD PERSPECTIVE</div>
            <h2>글로벌 시각 · 외신 AI 브리핑</h2>
          </div>
          <p>BBC, 블룸버그, NYT, 알자지라 등 글로벌 주요 외신이 집중 보도한 세계 및 한국 이슈 해설입니다.</p>
          <a class="more" href="${root}global/">글로벌 뉴스 전체 보기 →</a>
        </div>
        <div class="global-grid">
    `;

    items.forEach(item => {
      const leads = item.leads || [];
      const firstLead = leads[0] || {};
      const pressName = firstLead.press || item.press || 'Global Press';
      const textKo = firstLead.text_ko || item.summary_ko || 'AI 번역 및 심층 해설이 준비 중입니다.';
      const textEn = firstLead.text || item.title || '';
      const itemImage = item.image || (item.gallery || [])[0]?.img || '';

      html += `
        <article class="global-card">
          ${itemImage ? `
            <div class="global-thumb">
              <img src="${esc(itemImage)}" alt="${esc(item.title_ko || item.title)}" loading="lazy">
              <span class="global-press-badge">${esc(pressName)}</span>
            </div>
          ` : `<span class="global-press-tag">${esc(pressName)}</span>`}
          <h3 class="global-title-ko">${esc(item.title_ko || item.title)}</h3>
          <div class="global-title-en">${esc(item.title)}</div>
          <p class="global-lead-ko">${esc(short(textKo, 180))}</p>
          <p class="global-lead-en" id="en-${esc(item.id || item.title)}">${esc(textEn)}</p>
          <div class="global-actions">
            <button class="lang-toggle-btn" data-toggle="en-${esc(item.id || item.title)}">영어 원문 보기</button>
            <a href="${esc(firstLead.url || item.url || '#')}" target="_blank" rel="noopener" style="color:var(--muted); font-size:12px;">원문 외신 ↗</a>
          </div>
        </article>
      `;
    });

    html += '</div></section>';
    return html;
  }

  /* Layer 4: People 5-Card Radar (Fused from v3) */
  function peopleRadarView(today) {
    const entities = today.entities || [];
    const persons = entities.filter(e => e.type === 'person' || e.kind === 'person').slice(0, 5);
    if (!persons.length) return '';

    return `
      <section class="section" id="peopleRadar">
        <div class="section-head">
          <div>
            <div class="eyebrow">NEWSMAKERS RADAR</div>
            <h2>오늘의 핵심 인물 5인</h2>
          </div>
          <p>오늘 보도 빈도와 화제성이 가장 높은 인물의 프로필과 당일 발언입니다.</p>
          <a class="more" href="${root}persons/">인물 사전 전체 보기 →</a>
        </div>
        <div class="people-strip">
          ${persons.map(p => {
            const wiki = p.wiki || {};
            const thumb = wiki.thumb || '';
            const desc = wiki.desc || p.role || '주요 관련 인물';
            const recentQuote = (p.timeline || [])[0]?.title || '오늘의 주요 사건에 핵심 인물로 등장했습니다.';
            return `
              <div class="person-card">
                <div class="person-avatar" style="${thumb ? `background-image:url('${esc(thumb)}')` : ''}"></div>
                <b><a href="${hrefEntity(p.name)}">${esc(p.name)}</a></b>
                <span class="role">${esc(desc)}</span>
                <p class="quote-snippet">"${esc(short(recentQuote, 46))}"</p>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  /* Ontology Explorer */
  function ontologyView(graph, i) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return '';
    const byName = new Map(graph.nodes.map(n => [String(n.name || '').trim(), n]));
    const seed = issueTerms(i).map(t => byName.get(t)).find(Boolean);
    if (!seed) return '';
    const relation = (a, b) => graph.edges.find(e => (e.src === a && e.tgt === b) || (e.src === b && e.tgt === a))?.rel || '연결';
    const directIds = new Set(graph.edges.filter(e => e.src === seed.id || e.tgt === seed.id).flatMap(e => [e.src, e.tgt]).filter(x => x !== seed.id));
    const secondIds = new Set(graph.edges.filter(e => directIds.has(e.src) || directIds.has(e.tgt)).flatMap(e => [e.src, e.tgt]).filter(x => x !== seed.id && !directIds.has(x)));
    const node = id => graph.nodes.find(n => n.id === id);
    const displayable = n => n && !/^wd:/i.test(String(n.name || '').trim()) && !/^Q\d+$/.test(String(n.name || '').trim());
    const chips = [...directIds].map(id => node(id)).filter(displayable).slice(0, 6);
    const second = [...secondIds].map(id => node(id)).filter(displayable).slice(0, 8);
    if (!chips.length) return '';
    return `
      <section class="section intelligence-section" id="ontology">
        <div class="section-head">
          <div><div class="eyebrow">ONTOLOGY EXPLORER</div><h2>연결망에서 더 멀리</h2></div>
          <p>현재 이슈에서 1단계, 2단계로 이어지는 관계를 탐색합니다.</p>
        </div>
        <div class="hop-chain">
          <span class="hop-seed">${icon('sparkles', true)} ${esc(seed.name)}<small>${esc(seed.type || '핵심 엔티티')}</small></span>
          <span class="hop-arrow">→</span>
          ${chips.map(n => `<a class="hop-chip" href="${hrefEntity(n.name)}"><b>${esc(n.name)}</b><small>${esc(relation(seed.id, n.id))} · ${esc(n.props?.role || n.type || '연결 노드')}</small></a>`).join('')}
        </div>
        <div class="hop-second">
          <span class="hop-label">2-hop</span>
          ${second.map(n => `<a href="${hrefEntity(n.name)}" class="hop-chip is-light"><b>${esc(n.name)}</b><small>${esc(n.props?.role || n.type || '원거리 노드')}</small></a>`).join('')}
        </div>
      </section>
    `;
  }

  /* Layer 5: Serendipity & Interactive Quiz Lab (Fused from v3) */
  function labAndQuizView(serendipity, quiz) {
    const insights = (serendipity?.insights || serendipity?.items || []).slice(0, 2);
    const questions = quiz?.questions || [];

    if (!insights.length && !questions.length) return '';

    let serendipityHtml = '';
    if (insights.length) {
      serendipityHtml = `
        <div class="serendipity-box">
          <span class="eyebrow">SERENDIPITY RADAR</span>
          <h3 style="margin:6px 0 16px; font-size:18px;">오늘의 세렌디피티 (숨은 연결고리)</h3>
          ${insights.map(item => `
            <div class="serendipity-card">
              <b>✦ ${esc(item.title || item.headline || '분야 간 숨은 상관관계')}</b>
              <p>${esc(short(item.summary || item.description || '', 120))}</p>
              <span class="path">${esc((item.path || item.entities || []).join?.(' → ') || '')}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    let quizHtml = '';
    if (questions.length) {
      const q = questions[0];
      const qText = q.q?.ko || q.question || '오늘의 시사 퀴즈';
      const choices = q.choices?.ko || q.options || [];
      const answerIdx = q.answer;
      const expText = q.exp?.ko || q.explanation || '한국은행 및 정부 공식 통계 기반 검증 정답입니다.';

      quizHtml = `
        <div class="quiz-widget">
          <span class="quiz-badge">TODAY'S QUIZ · ${esc(q.cat || '시사 상식')}</span>
          <h3 class="quiz-question">Q. ${esc(qText)}</h3>
          <div class="quiz-options">
            ${choices.map((c, idx) => `
              <button class="quiz-opt-btn" data-idx="${idx}" data-answer="${answerIdx}">
                ${idx + 1}. ${esc(c)}
              </button>
            `).join('')}
          </div>
          <div class="quiz-explanation" id="quizExp">
            <b>💡 정답 해설:</b> ${esc(expText)}
          </div>
        </div>
      `;
    }

    return `
      <section class="section" id="labSection">
        <div class="section-head">
          <div>
            <div class="eyebrow">INTELLIGENCE LAB & INSIGHT</div>
            <h2>시사 랩 · 지적 상식과 발견</h2>
          </div>
          <p>데이터 간의 뜻밖의 연결점과 오늘의 시사 상식을 가볍게 테스트합니다.</p>
        </div>
        <div class="lab-dual">
          ${serendipityHtml}
          ${quizHtml}
        </div>
      </section>
    `;
  }

  function report(x) {
    return `<a class="report" href="${esc(x.url || '#')}" target="_blank" rel="noopener"><span class="report-thumb"${imgStyle(x.img)}></span><span><b>${esc(x.title || '')}</b><small>${esc(x.press || '')} · ${esc(x.kind || '원문')} · ${esc(day(x.time || x.t))}</small></span><span class="arrow">↗</span></a>`;
  }

  /* Full Render Pipeline */
  function render(V) {
    const vm = V.v2, full = V.full, issues = vm.issues || [];
    if (!issues.length) {
      $('#app').innerHTML = '<p class="empty">오늘 공개된 이슈 데이터가 아직 없습니다.</p>';
      return;
    }

    // Render Macro Pulse into header
    renderMacroPulse(V.market, V.briefs);

    const v = issues[0];
    const i = dataIssue(v, (full.issues || []).find(x => x.id === v.id));
    const flow = buildFlow(i);
    const reps = reports(i);
    const currentSummary = (i.summary || v.summary || []).filter(Boolean).slice(0, 4);
    const entities = uniq(i.entities || v.ents || []).slice(0, 8);
    const sectors = Object.entries(full.sections || {}).filter(([k]) => k !== '주요').slice(0, 5);
    const social = (V.social.posts || []).filter(p => p.cat === i.category || !i.category).slice(0, 5);
    const past = (i.past || []).slice(0, 4);
    const opinion = i.opinion || v.op || {};
    const topComment = Array.isArray(opinion.top) ? (opinion.top[0]?.text || opinion.top[0]?.body || '') : (opinion.top || '');
    const media = [...(i.gallery || []).map(g => ({ img: g.img, url: g.url, title: g.press || '관련 이미지' })), ...(i.sources || []).filter(s => /영상|유튜브|youtube|클립/i.test(`${s.title || ''} ${s.kind || ''}`)).map(s => ({ img: s.img, url: s.url, title: s.title }))].filter(x => x.img || x.url).slice(0, 9);
    const currentRecord = { title: i.title, url: i.url || `${root}issue/${i.id}`, date: full.date };

    document.title = `NewsBoard v2 · ${short(i.title, 32)}`;

    $('#app').innerHTML = `
      <!-- Lead Hero Issue (Issue #01) -->
      <section class="section hero" id="issue">
        <div class="hero-media" style="--hero-cat:${color(i.category)}">
          ${heroImage(i) ? `<img src="${esc(heroImage(i))}" alt="">` : heroFallback(i)}
          <span class="media-caption">${esc(i.category || '오늘의 이슈')} · ${day(full.updated || full.date)}</span>
        </div>
        <div class="hero-copy">
          <span class="badge">${icon('trending-up', true)} ${esc(i.category || '핫이슈')}</span>
          <h1><a href="${root}issue/${esc(i.id)}">${esc(i.title)}</a></h1>
          <p class="hero-lead">${esc((i.lead || currentSummary[0] || '오늘 가장 많이 주목받은 이슈의 핵심 흐름을 한 화면에 정리했습니다.'))}</p>
          <div class="meta">
            <span>${day(full.updated || full.date)}</span>
            <span>${icon('news')} 보도 ${nf(i.presses || v.presses)}곳</span>
            <span>${icon('message-circle')} ${nf((i.opinion || v.op || {}).total || v.comments)} 반응</span>
            <span>화제도 ${nf(Math.round(v.score || i.score || 0))}</span>
          </div>
          <div class="entity-strip">
            ${entities.map(e => `<a class="entity-chip" href="${hrefEntity(e)}">${icon('bookmark')} ${esc(e)}</a>`).join('')}
          </div>
          ${currentSummary.length ? `<ul class="hero-summary">${currentSummary.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        </div>
      </section>

      <!-- Fused: 10-Agenda Deck (Issues 02~10 with Inline Accordion Drawer) -->
      ${agendaDeckView(full.issues || issues)}

      <!-- Fused: People 5-Card Radar -->
      ${peopleRadarView(full)}

      <!-- Knowledge Graph Ontology Explorer -->
      ${ontologyView(V.ontology, i)}

      <!-- Lead Issue Timeline Flow -->
      <section class="section" id="flow">
        <div class="section-head">
          <div><div class="eyebrow">ISSUE CONTINUITY</div><h2>어떻게 이어졌나</h2></div>
          <p>사건 단계별로 관련도가 검증된 원문과 보도사진을 시간순으로 연결했습니다.${i.flow_gap ? ` · ${esc(i.flow_gap)}` : ''}</p>
        </div>
        <div class="band">
          <div class="timeline-grid">
            ${flow.map((e, eIdx) => {
              const thumb = flowThumb(e, i, eIdx);
              return `
                <article class="timeline-node">
                  ${thumb ? `
                    <a class="timeline-thumb-link" href="${esc(e.url || '#')}" target="_blank" rel="noopener">
                      <div class="timeline-thumb">
                        <img src="${esc(thumb)}" alt="${esc(e.title || '')}" loading="lazy" onerror="this.onerror=null;this.src='${esc(i.image || '')}'">
                        ${e.press ? `<span class="timeline-press-tag">${esc(e.press)}</span>` : ''}
                      </div>
                    </a>
                  ` : ''}
                  <div class="timeline-track-node">
                    <i class="timeline-dot"></i>
                  </div>
                  <div class="timeline-content">
                    <div class="timeline-meta">
                      <time>${esc(day(e.date) || '날짜 미상')}</time>
                      <small class="timeline-stage">${esc(e.stage || '관련 보도')}</small>
                    </div>
                    <a class="timeline-title" href="${esc(e.url || '#')}" target="_blank" rel="noopener">${esc(e.title || '관련 보도')}</a>
                    <p class="timeline-summary">${esc(short(e.body || e.press || '', 110))}</p>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </div>
      </section>

      <!-- Primary Reports Comparison (12 Sources) -->
      <section class="section" id="reports">
        <div class="section-head">
          <div><div class="eyebrow">PRIMARY REPORTS</div><h2>주요 보도 비교</h2></div>
          <p>같은 이슈를 원문·썸네일과 함께 비교합니다.</p>
          <a class="more" href="${root}issue/${esc(i.id)}">전체 보도 보기 →</a>
        </div>
        ${reps.length ? `<div class="report-grid"><div class="report-list">${reps.slice(0, 6).map(report).join('')}</div><div class="report-list">${reps.slice(6, 12).map(report).join('')}</div></div>` : '<div class="empty">이 이슈의 세부 출처 목록을 준비 중입니다.</div>'}
      </section>

      <!-- Past & Current Quotes -->
      ${past.length ? `
        <section class="section" id="quotes">
          <div class="section-head">
            <div><div class="eyebrow">PAST & CURRENT</div><h2>과거와 현재의 발언·기록</h2></div>
            <p>같은 주제의 과거 기록과 현재 이슈를 나란히 확인합니다.</p>
          </div>
          <div class="quote-list">
            ${past.slice(0, 4).map(p => `
              <div class="quote-row">
                <div class="person">
                  <span class="avatar"${imgStyle((v.faces || [])[0]?.img)}></span>
                  <div><b>${esc((v.faces || [])[0]?.n || (i.entities || [])[0] || '관련 인물')}</b><small>관련 기록</small></div>
                </div>
                <a class="quote" href="${esc(p.url || '#')}" target="_blank" rel="noopener">
                  <span class="tag">과거 · ${esc(day(p.date))}</span>
                  <p>“${esc(p.title)}”</p>
                  <small>원문 기록 보기 ↗</small>
                </a>
                <div class="quote-arrow">→</div>
                <a class="quote" href="${esc(currentRecord.url || '#')}" target="_blank" rel="noopener">
                  <span class="tag">현재 · ${esc(day(full.date))}</span>
                  <p>“${esc(i.title)}”</p>
                  <small>현재 이슈 보기 ↗</small>
                </a>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Fused: World Perspective Global View -->
      ${globalView(V.globalData)}

      <!-- Relations & Social Reactions -->
      <section class="section dual" id="relations">
        <div>
          <div class="section-head">
            <div><div class="eyebrow">RELATED PEOPLE & ORGS</div><h2>관련 인물·기관</h2></div>
          </div>
          <div class="relation">
            <div class="rel-col">
              ${entities.slice(0, 3).map(e => `<a class="rel-node" href="${hrefEntity(e)}"><b>${esc(e)}</b><small>이슈 엔티티 · 상세 보기</small></a>`).join('')}
            </div>
            <div class="rel-center">${icon('hierarchy-2', true)}<br>${esc(short(i.title, 20))}</div>
            <div class="rel-col">
              ${(i.keywords || v.kw || []).slice(0, 3).map(e => `<a class="rel-node" href="${hrefEntity(e)}"><b>${esc(e)}</b><small>핵심 키워드 · 관련 기사</small></a>`).join('')}
            </div>
          </div>
        </div>
        <div id="social">
          <div class="section-head">
            <div><div class="eyebrow">LIVE REACTION</div><h2>지금 SNS에서</h2></div>
          </div>
          ${social.length ? `<div class="social-list">${social.map(p => `<article class="social"><span class="avatar"${imgStyle(p.avatar)}></span><div><b>${esc(p.name || p.handle || '공개 계정')}</b><small> ${esc(p.handle || '')} · ${esc(day(p.t))}</small><p>${esc(short(p.text_ko || p.text || '', 180))}</p><div class="social-actions"><span>${esc(p.net || 'SNS')}</span><a href="${esc(p.url || '#')}" target="_blank" rel="noopener">원문 참여 ↗</a></div></div></article>`).join('')}</div>` : `<div class="empty">현재 수집된 공개 SNS 반응이 없습니다.</div>`}
        </div>
      </section>

      <!-- Public Sentiment & Word Cloud -->
      <section class="section reaction" id="sentiment">
        <div class="section-head">
          <div><div class="eyebrow">PUBLIC SENTIMENT</div><h2>민심과 댓글</h2></div>
          <p>원문 댓글·반응에서 집계된 이슈별 여론을 요약합니다.</p>
        </div>
        <div class="sentiment-grid">
          <div class="sentiment-main">
            <div class="sentiment-bars">
              <div><span>공감·긍정</span><b>${nf(opinion.like || 0)}</b></div>
              <i style="--w:${Math.min(100, Number(opinion.total) ? Math.round((Number(opinion.like || 0) / Number(opinion.total)) * 100) : 0)}%"></i>
              <div><span>우려·비판</span><b>${nf(opinion.dislike || 0)}</b></div>
            </div>
            <p class="comment-top">“${esc(topComment || '대표 댓글이 아직 집계되지 않았습니다.')}”</p>
          </div>
          <div class="word-cloud">
            ${(opinion.words || []).slice(0, 8).map(w => `<span>${esc(Array.isArray(w) ? w[0] : w)}</span>`).join('') || '<span>댓글 키워드 수집 중</span>'}
          </div>
        </div>
      </section>

      <!-- Media & Video Clips -->
      ${media.length ? `
        <section class="section" id="media">
          <div class="section-head">
            <div><div class="eyebrow">MEDIA & VIDEO</div><h2>영상·현장 자료</h2></div>
            <p>이슈를 다룬 대표 이미지와 영상 링크를 한곳에 모았습니다.</p>
          </div>
          <div class="media-grid">
            ${media.map(m => `<a class="media-card" href="${esc(m.url || '#')}" target="_blank" rel="noopener"><span${imgStyle(m.img)}></span><b>${esc(m.title || '관련 자료')}</b></a>`).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Fused: Intelligence Lab & Daily Quiz -->
      ${labAndQuizView(V.serendipity, V.quiz)}

      <!-- Sector Headlines -->
      <section class="section" id="data">
        <div class="section-head">
          <div><div class="eyebrow">LATEST BY SECTOR</div><h2>분야별 주요 헤드라인</h2></div>
          <p>메인 이슈와 독립적인 최신 분야 흐름입니다.</p>
        </div>
        <div class="sector-grid">
          ${sectors.map(([name, list]) => `<article class="sector"><h3>${esc(name)} <small>${list.length}건</small></h3><p class="sector-note">오늘 수집된 대표 흐름</p>${(list || []).slice(0, 3).map(x => `<a href="${esc(x.url || '#')}" target="_blank" rel="noopener">${esc(x.title)}<small>${esc(x.press || '')} · ${esc(day(x.time))}</small></a>`).join('')}</article>`).join('')}
        </div>
      </section>

      <!-- KPI Numbers -->
      <section class="section">
        <div class="section-head">
          <div><div class="eyebrow">TODAY IN NUMBERS</div><h2>오늘의 데이터</h2></div>
          <p>수집 시점 ${esc(day(full.updated || full.date))}</p>
        </div>
        <div class="kpi-row">
          <div class="kpi"><small>오늘의 이슈</small><b>${nf(issues.length)}<em>건</em></b></div>
          <div class="kpi"><small>수집 기사</small><b>${nf((full.stats || {}).naver || (vm.nums || {}).arts)}<em>건</em></b></div>
          <div class="kpi"><small>언론사</small><b>${nf(i.presses || (vm.nums || {}).presses || 0)}<em>곳</em></b></div>
          <div class="kpi"><small>누적 반응</small><b>${nf((i.opinion || {}).total || (vm.nums || {}).comments || 0)}<em>건</em></b></div>
        </div>
      </section>
    `;
  }

  function setRegion(btn) {
    document.querySelectorAll('[data-region]').forEach(x => x.classList.toggle('is-on', x === btn));
    try {
      const s = JSON.parse(localStorage.getItem('nb-settings') || '{}');
      s.region = btn.dataset.region;
      localStorage.setItem('nb-settings', JSON.stringify(s));
    } catch {}

    const region = btn.dataset.region;
    const globalSection = $('#globalBriefing');
    if (globalSection) {
      if (region === 'kr') {
        globalSection.scrollIntoView({ behavior: 'smooth' });
      } else if (region === 'global-ko' || region === 'global-en') {
        globalSection.scrollIntoView({ behavior: 'smooth' });
        $$('.lang-toggle-btn').forEach(b => {
          const target = $(`#${b.dataset.toggle}`);
          if (target) {
            const showEn = region === 'global-en';
            target.classList.toggle('is-visible', showEn);
            b.innerText = showEn ? '영어 원문 접기' : '영어 원문 보기';
          }
        });
      }
    }
  }

  function bind() {
    document.querySelectorAll('[data-region]').forEach(b => b.addEventListener('click', () => setRegion(b)));
    document.querySelectorAll('.main-nav a').forEach(a => a.addEventListener('click', () => {
      document.querySelectorAll('.main-nav a').forEach(x => x.classList.remove('is-on'));
      a.classList.add('is-on');
    }));

    // Bind Expand Context Buttons for Agenda Deck
    $$('.expand-context-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.target;
        const drawer = $(`#context-${id}`);
        if (!drawer) return;
        const isOpen = drawer.classList.contains('is-open');
        $$('.inline-context').forEach(el => el.classList.remove('is-open'));
        if (!isOpen) {
          drawer.classList.add('is-open');
          btn.innerHTML = '맥락 접기 ↑';
        } else {
          btn.innerHTML = '맥락 펼치기 ↓';
        }
      });
    });

    $$('.close-context-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.close;
        $(`#context-${id}`)?.classList.remove('is-open');
        const trigger = $(`[data-target="${id}"]`);
        if (trigger) trigger.innerHTML = '맥락 펼치기 ↓';
      });
    });

    // Bind Global English Toggles
    $$('.lang-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = $(`#${btn.dataset.toggle}`);
        if (!target) return;
        const visible = target.classList.toggle('is-visible');
        btn.innerText = visible ? '영어 원문 접기' : '영어 원문 보기';
      });
    });

    // Bind Quiz Option Clicks
    $$('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const chosen = Number(btn.dataset.idx);
        const correct = Number(btn.dataset.answer);
        $$('.quiz-opt-btn').forEach(b => {
          b.disabled = true;
          if (Number(b.dataset.idx) === correct) b.classList.add('correct');
        });
        if (chosen !== correct) {
          btn.classList.add('wrong');
        }
        $('#quizExp')?.classList.add('is-visible');
      });
    });
  }

  /* Search Palette Modal (Fused from v3, replacing prompt) */
  function setupSearchModal(today) {
    const modal = $('#searchModal');
    const input = $('#modalSearchInput');
    const results = $('#modalSearchResults');
    const trigger = $('#searchBtn');
    const closeBtn = $('#closeSearchBtn');

    if (!modal || !input || !results) return;

    const openSearch = () => {
      modal.classList.add('is-open');
      input.value = '';
      input.focus();
      renderSearchResults('');
    };

    const closeSearch = () => {
      modal.classList.remove('is-open');
    };

    trigger?.addEventListener('click', e => {
      e.preventDefault();
      openSearch();
    });
    closeBtn?.addEventListener('click', closeSearch);
    modal.addEventListener('click', e => { if (e.target === modal) closeSearch(); });

    window.addEventListener('keydown', e => {
      if ((e.key === '/' || (e.metaKey && e.key === 'k')) && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeSearch();
      }
    });

    const issues = today?.issues || [];
    const entities = today?.entities || [];

    function renderSearchResults(query) {
      const q = query.trim().toLowerCase();
      if (!q) {
        results.innerHTML = `
          <div style="padding:16px 20px; font-size:12px; color:var(--muted);">
            <b>추천 검색어:</b>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
              ${entities.slice(0, 6).map(e => `<button class="entity-chip search-rec-chip">${esc(e.name)}</button>`).join('')}
            </div>
          </div>
        `;
        $$('.search-rec-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            input.value = chip.innerText;
            renderSearchResults(chip.innerText);
          });
        });
        return;
      }

      const matchIssues = issues.filter(i => (i.title + (i.category || '')).toLowerCase().includes(q)).slice(0, 4);
      const matchEntities = entities.filter(e => e.name.toLowerCase().includes(q)).slice(0, 4);

      if (!matchIssues.length && !matchEntities.length) {
        results.innerHTML = `<div style="padding:24px; text-align:center; color:var(--muted); font-size:13px;">"${esc(query)}" 관련 검색 결과가 없습니다.</div>`;
        return;
      }

      let html = '';
      if (matchIssues.length) {
        html += '<div style="padding:6px 20px; font-size:11px; font-weight:800; color:var(--accent);">이슈 목록</div>';
        matchIssues.forEach(i => {
          html += `
            <a class="search-result-item" href="${root}issue/${esc(i.id)}">
              <b>${esc(i.title)}</b>
              <small>${esc(i.category || '종합')} · 보도 ${nf(i.presses || 0)}곳</small>
            </a>
          `;
        });
      }
      if (matchEntities.length) {
        html += '<div style="padding:8px 20px 4px; font-size:11px; font-weight:800; color:var(--accent);">인물 및 기관</div>';
        matchEntities.forEach(e => {
          html += `
            <a class="search-result-item" href="${hrefEntity(e.name)}">
              <b># ${esc(e.name)}</b>
              <small>${esc(e.type || '엔티티')} · 관련 기사 탐색</small>
            </a>
          `;
        });
      }

      results.innerHTML = html;
    }

    input.addEventListener('input', () => renderSearchResults(input.value));
  }

  const optional = name => fetch(`${dataRoot}${name}`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);

  function fallbackV2(full) {
    const issues = (full.issues || []).map(i => ({
      id: i.id, title: i.title, cat: i.category, img: i.image, summary: i.summary,
      lead: i.lead, ents: i.entities || [], kw: i.keywords || [], score: i.score,
      presses: i.presses, comments: i.opinion?.total, op: i.opinion, flow: i.flow, faces: i.faces || []
    }));
    return {
      issues, sections: full.sections || {},
      nums: {
        arts: full.stats?.naver || 0,
        presses: issues.reduce((n, i) => n + (Number(i.presses) || 0), 0),
        comments: issues.reduce((n, i) => n + (Number(i.comments) || 0), 0)
      }
    };
  }

  const fullRequest = fetch(`${dataRoot}today.json`, { cache: 'no-cache' }).then(r => r.json());

  Promise.all([
    fullRequest.then(fallbackV2),
    fullRequest,
    fetch(`${dataRoot}social.json`, { cache: 'no-cache' }).then(r => r.json()).catch(() => ({ posts: [] })),
    optional('ontology_graph.json'),
    optional('serendipity_insights.json'),
    optional('market_detail.json'),
    optional('global.json'),
    optional('quiz.json'),
    optional('briefs.json')
  ]).then(([v2, full, social, ontology, serendipity, market, globalData, quiz, briefs]) => {
    V = { v2, full, social, ontology, serendipity, market, globalData, quiz, briefs };
    render(V);
    bind();
    setupSearchModal(full);
  }).catch((err) => {
    console.error('v2 boot error:', err);
    $('#app').innerHTML = '<p class="empty">데이터를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>';
  });
})();
