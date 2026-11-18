/**
 * NewsBoard Deep Timeline & Folded Source Component (10년~30년 장기 사건 타임라인 및 'i' 접이식 컴포넌트)
 * - Level 1: 핵심 쟁점 및 단계 1순위 노출
 * - Level 2: 출처, 법조문, 판결문 사건번호는 'i' 아이콘 및 접이식(Accordion) 처리
 */

(function() {
  let deepData = null;

  async function loadDeepTimelines() {
    try {
      const res = await fetch('data/event_deep_timeline.json');
      if (!res.ok) return;
      deepData = await res.json();
      injectDeepTimelineBanner();
    } catch (e) {
      console.warn('[DeepTimeline] Failed to load deep timeline data', e);
    }
  }

  function injectDeepTimelineBanner() {
    if (!deepData || !deepData.cases || !deepData.cases.length) return;
    
    // 메인 헤더 아래 또는 카드 상단에 10년~30년 심층 타임라인 배너 삽입
    const target = document.querySelector('#feed') || document.querySelector('.stream') || document.querySelector('main');
    if (!target) return;

    const wrap = document.createElement('div');
    wrap.className = 'deep-timeline-banner-container';
    wrap.style.cssText = 'margin: 16px 0; padding: 18px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; backdrop-filter: blur(8px);';

    wrap.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="background:#ff4d2e; color:#fff; font-size:11px; font-weight:800; padding:3px 8px; border-radius:4px;">화제성 1순위 심층 추적</span>
          <span style="font-size:15px; font-weight:700; color:#f8fafc;">⏳ 10년~30년 장기 사건 전주기 타임라인</span>
        </div>
        <span style="font-size:12px; color:#94a3b8;">핵심 팩트 우선 ⇄ 출처·법조문 접이식(i)</span>
      </div>
      
      <div style="display:flex; flex-direction:column; gap:14px;">
        ${deepData.cases.map((c, idx) => `
          <div style="background:rgba(15, 23, 42, 0.6); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:14px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px; color:#38bdf8; font-weight:600;">
              <span>${c.span_years}</span>
              <span style="background:rgba(56,189,248,0.15); padding:2px 6px; border-radius:4px;">${c.core_summary.immediate_display.current_stage}</span>
            </div>
            
            <h4 style="font-size:15px; font-weight:700; color:#f1f5f9; margin-bottom:6px;">${c.title}</h4>
            <p style="font-size:13px; color:#cbd5e1; margin-bottom:8px;">${c.core_summary.immediate_display.headline}</p>

            <!-- 10년 시계열 요약 바 -->
            <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:10px;">
              ${c.decade_timeline.map(t => `
                <div style="flex:0 0 auto; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px 10px; font-size:11px; text-align:center;">
                  <div style="color:#38bdf8; font-weight:700;">${t.year}</div>
                  <div style="color:#94a3b8; font-size:10px;">${t.stage}</div>
                </div>
              `).join('')}
            </div>

            <!-- 접이식 상세 출처 & 법조문 (Level 2: Accordion) -->
            <details style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 12px; font-size:12px;">
              <summary style="cursor:pointer; color:#38bdf8; font-weight:600; display:flex; align-items:center; gap:6px;">
                <span>ℹ️ ${c.core_summary.folded_details.toggle_label || '상세 출처 및 법조문 보기'}</span>
              </summary>
              <div style="margin-top:10px; padding-top:8px; border-top:1px dashed rgba(255,255,255,0.1); color:#94a3b8; line-height:1.7;">
                ${c.core_summary.folded_details.case_numbers ? `<div><strong>사건번호:</strong> ${c.core_summary.folded_details.case_numbers.join(', ')}</div>` : ''}
                ${c.core_summary.folded_details.statutes ? `<div><strong>관련 법조문:</strong> ${c.core_summary.folded_details.statutes.join(', ')}</div>` : ''}
                ${c.core_summary.folded_details.chips ? `<div><strong>핵심 칩:</strong> ${c.core_summary.folded_details.chips.join(', ')}</div>` : ''}
                <div><strong>검증 언론사:</strong> ${Array.isArray(c.core_summary.folded_details.source_press_list) ? c.core_summary.folded_details.source_press_list.join(', ') : c.core_summary.folded_details.source_press_list}</div>
                ${c.core_summary.folded_details.audited_amounts ? `<div><strong>심층 내역:</strong> ${c.core_summary.folded_details.audited_amounts}</div>` : ''}
              </div>
            </details>
          </div>
        `).join('')}
      </div>
    `;

    target.insertBefore(wrap, target.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDeepTimelines);
  } else {
    loadDeepTimelines();
  }
})();
