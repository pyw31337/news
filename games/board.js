/* 개인 점수(기기 저장) + 전체 리더보드(로그인 사용자만 등록, Worker /lb) */
(function () {
  const SYNC = 'https://newsboard-sync.pyw213.workers.dev', K = 'nb-scores', E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = n => window.GI ? GI(n) : '';
  let S = {}; try { S = JSON.parse(localStorage.getItem(K) || '{}') } catch (e) {}
  const save = () => { try { localStorage.setItem(K, JSON.stringify(S)) } catch (e) {} };
  const tok = () => localStorage.getItem('nb-tok');
  const nick = () => localStorage.getItem('nb-nick') || '';
  /* 한 판 기록: 최고 점수가 오르면 true. 로그인 상태면 전체 리더보드에도 등록 */
  function record(board, score, extra) {
    score = Math.floor(score || 0); if (score <= 0) return false;
    const b = S[board] || (S[board] = { best: 0, hist: [] });
    b.hist.unshift({ s: score, t: Date.now(), x: extra || null }); b.hist = b.hist.slice(0, 10);
    const up = score > b.best; if (up) { b.best = score; b.at = Date.now() } save();
    if (up && tok()) submit(board, score);
    return up;
  }
  function submit(board, score) {
    return fetch(SYNC + '/lb', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() }, body: JSON.stringify({ b: board, score, name: nick() }) })
      .then(r => r.json()).catch(() => null);
  }
  const best = board => (S[board] || {}).best || 0;
  const hist = board => (S[board] || {}).hist || [];
  const fmtT = t => { const d = new Date(t); return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` };
  /* 리더보드 화면: 보드 목록(이름) 중 선택, 전체 순위 + 내 기록 */
  function view(el, boards, pick) {
    let cur = pick || boards[0][0];
    const draw = () => {
      el.innerHTML = `<div class="lb-tabs">${boards.map(([id, name]) => `<button type="button" class="${id === cur ? 'on' : ''}" data-lb="${id}">${E(name)}</button>`).join('')}</div>
      <div class="lb-grid"><section class="lb-card"><h3>${I('trophy')}전체 순위</h3><ol class="lb-list" aria-live="polite"><li class="lb-wait">순위를 불러오는 중…</li></ol>
        <div class="lb-me">${tok() ? `<label>순위에 보일 이름 <input id="lbnick" maxlength="12" placeholder="독자 0000" value="${E(nick())}"></label><button type="button" class="gm-btn ghost" id="lbsave">저장</button>` : `<a class="gm-btn" href="login/?ret=${encodeURIComponent('games/' + location.hash)}">로그인하고 순위에 오르기</a>`}</div></section>
       <section class="lb-card"><h3>${I('list-numbers')}내 기록</h3><div class="lb-best"><small>최고 점수</small><b>${best(cur).toLocaleString()}</b></div>
        <ol class="lb-hist">${hist(cur).map(h => `<li><span>${fmtT(h.t)}</span><b>${h.s.toLocaleString()}</b></li>`).join('') || '<li class="lb-wait">아직 기록이 없어요. 한 판 해 보세요!</li>'}</ol></section></div>`;
      fetch(SYNC + '/lb?b=' + encodeURIComponent(cur) + '&n=20', { headers: tok() ? { Authorization: 'Bearer ' + tok() } : {} }).then(r => r.ok ? r.json() : null).then(j => {
        const L = el.querySelector('.lb-list'); if (!L) return;
        if (!j || j.wait) { L.innerHTML = '<li class="lb-wait">순위판을 준비하고 있어요. 잠시 후 다시 열어 주세요.</li>'; return }
        L.innerHTML = j.rows.length ? j.rows.map((r, k) => `<li class="${r.me ? 'me' : ''} ${k < 3 ? 'top t' + k : ''}"><span class="rk">${k + 1}</span><span class="nm">${E(r.name)}</span><b>${r.score.toLocaleString()}</b></li>`).join('')
          + (j.me && j.me.rank > j.rows.length ? `<li class="me"><span class="rk">${j.me.rank}</span><span class="nm">나</span><b>${j.me.score.toLocaleString()}</b></li>` : '')
          : '<li class="lb-wait">아직 아무도 없어요. 첫 기록의 주인공이 되어 보세요!</li>';
      });
    };
    el.onclick = e => {
      const t = e.target.closest('[data-lb]'); if (t) { cur = t.dataset.lb; draw(); return }
      if (e.target.closest('#lbsave')) { const v = el.querySelector('#lbnick').value.trim(); if (v && !/^[0-9A-Za-z가-힣 _.\-]{2,12}$/.test(v)) { alert('이름은 2~12자의 한글·영문·숫자로 정해 주세요'); return }
        localStorage.setItem('nb-nick', v); if (best(cur)) submit(cur, best(cur)).then(draw); else draw() }
    };
    draw();
  }
  window.NBBoard = { record, best, hist, view, submit };
})();
