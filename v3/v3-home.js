/**
 * NewsBoard v3 - Intelligence Info-Desk Main Engine
 * 5-Layer Deep Context & Real-Time Macro Pulse
 */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = n => Number(n || 0).toLocaleString('ko-KR');
  const catColor = {
    '정치': '#2450e0', '경제': '#138a52', '사회': '#d33a3a', '세계': '#7654e8',
    'IT·과학': '#1686a8', '과학': '#4868d8', '건강': '#c24d6a', '환경': '#2b9b68',
    '문화': '#9257b7', '연예': '#cc4a8b', '스포츠': '#c87810'
  };
  const color = c => catColor[c] || '#6c717b';
  const day = s => {
    if (!s) return '';
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? String(s).slice(0, 10).replaceAll('-', '.') : d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll(' ', '');
  };
  const short = (s, n = 90) => { const t = String(s || ''); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

  const root = '../';
  const dataRoot = location.protocol === 'file:' ? 'https://pyw31337.github.io/news/data/' : '../data/';

  const fetchJson = async (name) => {
    try {
      const res = await fetch(`${dataRoot}${name}`, { cache: 'no-cache' });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  };

  /* Render Layer 1: Macro Pulse */
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

  /* Render Layer 2: Lead Hero & 10-Agenda Deck */
  function renderAgenda(today) {
    const container = $('#agendaSection');
    if (!container || !today || !today.issues || !today.issues.length) return;

    const issues = today.issues;
    const lead = issues[0];
    const deck = issues.slice(1, 10);

    const leadSummary = (lead.summary || []).slice(0, 3);
    const leadEntities = (lead.entities || []).slice(0, 6);
    const opinion = lead.opinion || {};
    const likeCount = Number(opinion.like || 0);
    const dislikeCount = Number(opinion.dislike || 0);
    const totalOp = likeCount + dislikeCount || 1;
    const likePct = Math.round((likeCount / totalOp) * 100);

    // Timeline nodes for lead issue
    const leadFlow = (lead.flow || []).slice(-4);

    let heroHtml = `
      <div class="hero-lead-issue">
        <div class="hero-media" style="--cat-c: ${color(lead.category)}">
          ${lead.image ? `<img src="${esc(lead.image)}" alt="">` : `<div class="hero-fallback"><b>${esc(lead.category || '오늘의 핫이슈')}</b></div>`}
          <div class="media-caption">
            <span>${esc(lead.category || '이슈')}</span> · 보도 ${nf(lead.presses || 0)}개 언론사 · 반응 ${nf(opinion.total || 0)}건
          </div>
        </div>
        <div class="hero-copy">
          <span class="badge" style="background:${catColor[lead.category] ? catColor[lead.category]+'18' : 'var(--accent-soft)'}; color:${color(lead.category)}">
            #01 TOP AGENDA · ${esc(lead.category || '종합')}
          </span>
          <h1><a href="${root}issue/${esc(lead.id)}">${esc(lead.title)}</a></h1>
          <p class="hero-lead-text">${esc(lead.lead || leadSummary[0] || '오늘 가장 집중적으로 다뤄진 사건의 맥락과 원인을 조명합니다.')}</p>
          
          <div class="entity-strip">
            ${leadEntities.map(e => `<a class="entity-chip" href="${root}e/?k=${encodeURIComponent(e)}">#${esc(e)}</a>`).join('')}
          </div>

          ${leadSummary.length ? `
            <ul class="hero-summary">
              ${leadSummary.map(s => `<li>${esc(s)}</li>`).join('')}
            </ul>
          ` : ''}

          ${leadFlow.length ? `
            <div style="margin-top:20px; padding:14px 18px; border-radius:10px; background:var(--sunken); font-size:12px;">
              <b style="color:var(--accent); font-size:11px; letter-spacing:0.06em; text-transform:uppercase;">타임라인 전개</b>
              <div style="display:flex; gap:12px; margin-top:8px; overflow-x:auto; scrollbar-width:none;">
                ${leadFlow.map(f => `
                  <div style="min-width:140px; border-left:2px solid var(--accent); padding-left:8px;">
                    <time style="color:var(--muted); font-size:11px;">${day(f.date)}</time>
                    <div style="font-weight:700; color:var(--ink); margin-top:2px;">${esc(short(f.title, 32))}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // 2-10 Issues Deck
    let deckHtml = '<div class="agenda-grid">';
    deck.forEach((iss, idx) => {
      const rank = String(idx + 2).padStart(2, '0');
      const issEntities = (iss.entities || []).slice(0, 3);
      const issSummary = (iss.summary || [])[0] || iss.lead || '사건 개요 및 관련 보도를 확인하세요.';

      deckHtml += `
        <article class="agenda-card" data-issue-id="${esc(iss.id)}">
          <div class="agenda-card-head">
            <span class="agenda-rank">#${rank}</span>
            <span class="badge" style="background:${color(iss.category)}18; color:${color(iss.category)}; padding:2px 8px; font-size:11px;">
              ${esc(iss.category || '종합')}
            </span>
          </div>
          <h3><a href="${root}issue/${esc(iss.id)}">${esc(iss.title)}</a></h3>
          <p class="agenda-summary-preview">${esc(short(issSummary, 110))}</p>
          
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
            ${issEntities.map(e => `<a class="entity-chip" style="font-size:11px; padding:3px 7px;" href="${root}e/?k=${encodeURIComponent(e)}">${esc(e)}</a>`).join('')}
          </div>

          <div class="agenda-card-foot">
            <span>보도 ${nf(iss.presses || (iss.sources||[]).length)}건 · 반응 ${nf(iss.opinion?.total || iss.score || 0)}</span>
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
    deckHtml += '</div>';

    container.innerHTML = `
      <div class="section-head">
        <div>
          <div class="eyebrow">TODAY AGENDA 10</div>
          <h2>오늘의 10대 핵심 어젠다</h2>
        </div>
        <p>오늘 대한민국에서 가장 화제성과 영향력이 높은 10개 사건을 시간순으로 정돈했습니다.</p>
      </div>
      ${heroHtml}
      ${deckHtml}
    `;

    // Bind Expand Context Buttons
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
  }

  /* Render Layer 3: Global View */
  function renderGlobalView(globalData) {
    const container = $('#globalSection');
    if (!container || !globalData || !globalData.issues || !globalData.issues.length) return;

    const items = globalData.issues.slice(0, 4);

    let html = `
      <div class="section-head">
        <div>
          <div class="eyebrow">WORLD PERSPECTIVE</div>
          <h2>글로벌 시각 · 외신 AI 브리핑</h2>
        </div>
        <p>BBC, 블룸버그, NYT, 알자지라 등 글로벌 주요 외신이 집중 보도한 세계 및 한국 이슈 해설입니다.</p>
        <a class="action-link" href="${root}global/">글로벌 뉴스 전체 보기 →</a>
      </div>
      <div class="global-grid">
    `;

    items.forEach(item => {
      const leads = item.leads || [];
      const firstLead = leads[0] || {};
      const pressName = firstLead.press || item.press || 'Global Press';
      const textKo = firstLead.text_ko || item.summary_ko || 'AI 번역 및 심층 해설이 준비 중입니다.';
      const textEn = firstLead.text || item.title || '';

      html += `
        <article class="global-card">
          <span class="global-press-tag">${esc(pressName)}</span>
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

    html += '</div>';
    container.innerHTML = html;

    $$('.lang-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = $(`#${btn.dataset.toggle}`);
        if (!target) return;
        const visible = target.classList.toggle('is-visible');
        btn.innerText = visible ? '영어 원문 접기' : '영어 원문 보기';
      });
    });
  }

  /* Render Layer 4: People 5-Card Radar & Ontology */
  function renderPeopleAndOntology(today, ontology) {
    const container = $('#peopleSection');
    if (!container || !today) return;

    // Extract top 5 persons
    const entities = today.entities || [];
    const persons = entities.filter(e => e.type === 'person' || e.kind === 'person').slice(0, 5);

    let peopleHtml = '';
    if (persons.length) {
      peopleHtml = `
        <div class="section-head">
          <div>
            <div class="eyebrow">NEWSMAKERS RADAR</div>
            <h2>오늘의 핵심 인물 5인</h2>
          </div>
          <p>오늘 보도 빈도와 화제성이 가장 높은 인물의 프로필과 당일 발언입니다.</p>
          <a class="action-link" href="${root}persons/">인물 사전 전체 보기 →</a>
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
                <b><a href="${root}e/?k=${encodeURIComponent(p.name)}">${esc(p.name)}</a></b>
                <span class="role">${esc(desc)}</span>
                <p class="quote-snippet">"${esc(short(recentQuote, 46))}"</p>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // Ontology Hop Chain
    let ontologyHtml = '';
    if (ontology && ontology.nodes && ontology.edges) {
      const nodes = ontology.nodes.slice(0, 8);
      ontologyHtml = `
        <div style="margin-top:40px;">
          <div class="section-head" style="margin-bottom:16px;">
            <div>
              <div class="eyebrow">ONTOLOGY KNOWLEDGE GRAPH</div>
              <h3 style="margin:2px 0 0; font-size:20px;">이슈와 엔티티 지식 관계망</h3>
            </div>
            <p>서로 연관된 기관, 사건, 인물 노드가 어떻게 얽혀 있는지 탐색합니다.</p>
          </div>
          <div class="hop-chain">
            ${nodes.map(n => `
              <a class="hop-chip" href="${root}e/?k=${encodeURIComponent(n.name)}">
                <b>${esc(n.name)}</b>
                <small>${esc(n.type || '엔티티')} · 연결 노드</small>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = peopleHtml + ontologyHtml;
  }

  /* Render Layer 5: Daily Quiz & Serendipity */
  function renderLabAndQuiz(serendipity, quiz) {
    const container = $('#labSection');
    if (!container) return;

    let serendipityHtml = '';
    const insights = (serendipity?.insights || serendipity?.items || []).slice(0, 2);
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
    const questions = quiz?.questions || [];
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

    container.innerHTML = `
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
    `;

    // Bind Quiz Clicks
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

  /* Search Modal */
  function setupSearch(today) {
    const modal = $('#searchModal');
    const input = $('#modalSearchInput');
    const results = $('#modalSearchResults');
    const trigger = $('#searchTrigger');
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

    trigger?.addEventListener('click', openSearch);
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
            <a class="search-result-item" href="${root}e/?k=${encodeURIComponent(e.name)}">
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

  /* Boot Sequence */
  async function init() {
    const [today, market, globalData, serendipity, ontology, quiz, briefs] = await Promise.all([
      fetchJson('today.json'),
      fetchJson('market_detail.json'),
      fetchJson('global.json'),
      fetchJson('serendipity_insights.json'),
      fetchJson('ontology_graph.json'),
      fetchJson('quiz.json'),
      fetchJson('briefs.json')
    ]);

    if (!today) {
      $('#app').innerHTML = '<p style="padding:80px 0; text-align:center; color:var(--muted);">수집된 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
      return;
    }

    renderMacroPulse(market, briefs);
    renderAgenda(today);
    renderGlobalView(globalData);
    renderPeopleAndOntology(today, ontology);
    renderLabAndQuiz(serendipity, quiz);
    setupSearch(today);
  }

  init();
})();
