/**
 * NewsBoard Deep Timeline & Folded Source Component (10년~30년 장기 사건 타임라인 및 'i' 접이식 컴포넌트)
 * - Level 1: 핵심 쟁점 및 단계 1순위 노출
 * - Level 2: 출처, 법조문, 판결문 사건번호는 'i' 아이콘 및 접이식(Accordion) 처리
 */

(function() {
  let deepData = null;
  let injected = false;

  async function loadDeepTimelines() {
    try {
      const res = await fetch('data/event_deep_timeline.json');
      if (!res.ok) return;
      deepData = await res.json();
      tryInject();
    } catch (e) {
      console.warn('[DeepTimeline] Failed to load deep timeline data', e);
    }
  }

  function tryInject() {
    if (injected || !deepData || !deepData.cases || !deepData.cases.length) return;

    // #app 또는 메인 피드 컨테이너 탐색
    const target = document.querySelector('#feed') || document.querySelector('#app') || document.querySelector('main');
    if (!target) return;

    // 만약 아직 로딩 중이라면 로딩이 끝나거나 잠시 후 주입
    if (target.id === 'app' && target.querySelector('.loading') && !document.querySelector('#feed')) {
      return; // nb2가 메인 화면을 렌더링할 때까지 대기
    }

    injected = true;

    const wrap = document.createElement('div');
    wrap.id = 'deepTimelineBanner';
    wrap.className = 'deep-timeline-banner-container';
    wrap.style.cssText = 'margin: 20px 0; padding: 20px; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 14px; backdrop-filter: blur(10px); box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

    wrap.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="background:#ff4d2e; color:#fff; font-size:11px; font-weight:800; padding:3px 8px; border-radius:4px;">화제성 1순위 심층 추적</span>
          <span style="font-size:16px; font-weight:800; color:#f8fafc;">⏳ 10년~30년 장기 사건 전주기 타임라인</span>
        </div>
        <span style="font-size:12px; color:#94a3b8;">핵심 팩트 우선 ⇄ 상세 출처·법조문 접이식(i)</span>
      </div>
      
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${deepData.cases.map((c, idx) => `
          <div style="background:rgba(15, 23, 42, 0.7); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:12px; color:#38bdf8; font-weight:700;">
              <span>${c.span_years}</span>
              <span style="background:rgba(56,189,248,0.15); color:#38bdf8; padding:3px 8px; border-radius:4px;">${c.core_summary.immediate_display.current_stage}</span>
            </div>
            
            <h4 style="font-size:16px; font-weight:700; color:#f1f5f9; margin-bottom:6px;">${c.title}</h4>
            <p style="font-size:14px; color:#cbd5e1; margin-bottom:12px; line-height:1.5;">${c.core_summary.immediate_display.headline}</p>

            <!-- 10년 시계열 요약 바 -->
            <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; margin-bottom:12px;">
              ${c.decade_timeline.map(t => `
                <div style="flex:0 0 auto; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px 12px; font-size:11px; text-align:center;">
                  <div style="color:#38bdf8; font-weight:700;">${t.year}</div>
                  <div style="color:#94a3b8; font-size:11px; margin-top:2px;">${t.stage}</div>
                </div>
              `).join('')}
            </div>

            <!-- 접이식 상세 출처 & 법조문 (Level 2: Accordion) -->
            <details class="deep-timeline-details" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:10px 14px; font-size:13px;">
              <summary style="cursor:pointer; color:#38bdf8; font-weight:600; display:flex; align-items:center; gap:6px; user-select:none;">
                <span>ℹ️ ${c.core_summary.folded_details.toggle_label || '상세 출처 및 법조문·사건번호 보기'}</span>
              </summary>
              <div style="margin-top:12px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.1); color:#94a3b8; line-height:1.8;">
                ${c.core_summary.folded_details.case_numbers ? `<div><strong style="color:#e2e8f0;">사건번호:</strong> ${c.core_summary.folded_details.case_numbers.join(', ')}</div>` : ''}
                ${c.core_summary.folded_details.statutes ? `<div><strong style="color:#e2e8f0;">관련 법조문:</strong> ${c.core_summary.folded_details.statutes.join(', ')}</div>` : ''}
                ${c.core_summary.folded_details.chips ? `<div><strong style="color:#e2e8f0;">핵심 칩:</strong> ${c.core_summary.folded_details.chips.join(', ')}</div>` : ''}
                <div><strong style="color:#e2e8f0;">검증 언론사:</strong> ${Array.isArray(c.core_summary.folded_details.source_press_list) ? c.core_summary.folded_details.source_press_list.join(', ') : c.core_summary.folded_details.source_press_list}</div>
                ${c.core_summary.folded_details.audited_amounts ? `<div><strong style="color:#e2e8f0;">심층 내역:</strong> ${c.core_summary.folded_details.audited_amounts}</div>` : ''}
              </div>
            </details>
          </div>
        `).join('')}
      </div>
    `;

    // #feed의 첫 번째 자식 또는 target의 상단에 주입
    const feed = document.querySelector('#feed');
    if (feed) {
      feed.insertBefore(wrap, feed.firstChild);
    } else {
      target.insertBefore(wrap, target.firstChild);
    }
  }

  // DOM 로드 및 동적 렌더링 주기적 체크
  loadDeepTimelines();
  const timer = setInterval(() => {
    if (injected) {
      clearInterval(timer);
    } else {
      tryInject();
    }
  }, 250);

  // 10초 후 타이머 자동 해제
  setTimeout(() => clearInterval(timer), 10000);
})();
