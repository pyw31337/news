/* 이슈 2048 v3: 포함 관계 사다리 4종(시간·우주·데이터·뉴스), 타일 왼쪽 위 01~11, 미끄러짐·합치기 연출, 콤보, 효과음 */
(function () {
  const D = window.NBG_DATA, E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = n => window.GI ? GI(n) : '', N = 4, A = 'games/assets/2048/';
  const pad = n => String(n).padStart(2, '0');
  function game(el, ladderId) {
    const G = window.NBGame, SND = window.NBSound, FX = window.NBFX;
    const L = D.L2048.find(l => l.id === ladderId) || D.L2048[0], board = '2048-' + L.id;
    let T = [], uid = 0, score = 0, over = false, maxL = 0, moves = 0, bestCombo = 0, done11 = false, lock = false;
    el.innerHTML = `<div class="gx-gh"><div><h2>이슈 2048 <small>${E(L.name)}</small></h2><p>같은 단계끼리 밀어 합치면 다음 단계가 돼요. <b>${E(L.steps[0][0])} → ${E(L.steps[1][0])} → … → ${E(L.steps[10][0])}</b></p></div>
      <div class="gx-sc"><span>점수<b class="g2-s">0</b></span><span>최고<b class="g2-bs">${NBBoard.best(board).toLocaleString()}</b></span></div></div>
      <div class="gx-opt"><div class="gx-chips" role="tablist" aria-label="사다리 고르기">${D.L2048.map(l => `<button type="button" role="tab" aria-selected="${l.id === L.id}" class="${l.id === L.id ? 'on' : ''}" data-lad="${l.id}">${E(l.name)}</button>`).join('')}</div>${SND.toggles()}</div>
      <div class="g3-wrap"><div class="g3-b">${Array.from({ length: N * N }, (_, k) => `<i style="--x:${k % N};--y:${k / N | 0}"></i>`).join('')}</div><div class="g3-t"></div><div class="g2-over"></div></div>
      <div class="g3-lad" aria-label="단계 사다리">${L.steps.map((s, k) => `<span data-k="${k + 1}" style="--c:${D.STAGE[k]}" title="${E(s[2])}"><em>${pad(k + 1)}</em><img src="${A}${L.id}-${k + 1}.webp" alt="" width="28" height="28" loading="lazy"><b>${E(s[0])}</b></span>`).join('')}</div>
      <div class="gx-ctl"><button type="button" class="gm-btn ghost" data-re>${I('refresh')}새 게임</button><button type="button" class="gm-btn ghost" data-end>여기서 끝내고 XP 받기</button></div>`;
    const wrap = el.querySelector('.g3-wrap'), layer = el.querySelector('.g3-t'), ov = FX.overlay(wrap);
    SND.preload(['move', 'merge', 'combo', 'big', 'over', 'click']); SND.bgm(['bgm_2048_a', 'bgm_2048_b'][Math.random() * 2 | 0]);
    const at = (x, y) => T.find(t => !t.gone && t.x === x && t.y === y);
    const cell = () => { const r = layer.getBoundingClientRect(); return r.width / N };
    function tileEl(t) {
      const d = document.createElement('div'); d.className = 'g3-tile new'; d.dataset.id = t.id; layer.appendChild(d); t.el = d; paint(t); place(t);
      requestAnimationFrame(() => d.classList.remove('new')); return d;
    }
    function paint(t) { const s = L.steps[t.v - 1];
      t.el.style.setProperty('--c', D.STAGE[t.v - 1]); t.el.classList.toggle('hi', t.v >= 6); t.el.classList.toggle('max', t.v >= 11);
      t.el.innerHTML = `<em>${pad(t.v)}</em><img src="${A}${L.id}-${t.v}.webp" alt="" draggable="false"><b>${E(s[0])}</b>` }
    const place = t => { t.el.style.setProperty('--x', t.x); t.el.style.setProperty('--y', t.y) };
    function spawn() { const e = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!at(x, y)) e.push([x, y]); if (!e.length) return;
      const [x, y] = e[Math.random() * e.length | 0]; const t = { id: ++uid, x, y, v: Math.random() < .9 ? 1 : 2 }; T.push(t); tileEl(t) }
    function reset() { layer.innerHTML = ''; T = []; score = 0; over = false; maxL = 0; moves = 0; bestCombo = 0; done11 = false; el.querySelector('.g2-over').classList.remove('on'); spawn(); spawn(); hud(); ladder() }
    const hud = () => { el.querySelector('.g2-s').textContent = score.toLocaleString(); el.querySelector('.g2-bs').textContent = Math.max(score, NBBoard.best(board)).toLocaleString() };
    const ladder = () => el.querySelectorAll('.g3-lad span').forEach(s => s.classList.toggle('on', +s.dataset.k <= Math.max(maxL, 1)));
    function move(dir) {
      if (over || lock) return; const vx = { L: -1, R: 1, U: 0, D: 0 }[dir], vy = { L: 0, R: 0, U: -1, D: 1 }[dir];
      const xs = [...Array(N).keys()], ys = [...Array(N).keys()]; if (vx === 1) xs.reverse(); if (vy === 1) ys.reverse();
      let moved = false; const merges = []; T.forEach(t => t.mg = false);
      for (const y of ys) for (const x of xs) {
        const t = at(x, y); if (!t) continue; let nx = x, ny = y;
        while (true) { const px = nx + vx, py = ny + vy; if (px < 0 || py < 0 || px >= N || py >= N) break; const o = at(px, py);
          if (!o) { nx = px; ny = py; continue }
          if (o.v === t.v && !o.mg && t.v < 11) { t.gone = 1; o.mg = true; o.v++; merges.push([o, t, px, py]); nx = px; ny = py; moved = true }
          break }
        if (!t.gone && (nx !== x || ny !== y)) { t.x = nx; t.y = ny; moved = true }
        if (t.gone) { t.x = nx; t.y = ny }
        place(t);
      }
      if (!moved) return; moves++; lock = true; SND.sfx('move', 1, .5);
      setTimeout(() => {
        T.filter(t => t.gone).forEach(t => t.el.remove()); T = T.filter(t => !t.gone);
        let top = 0;
        for (const [o] of merges) { paint(o); o.el.classList.remove('pop'); void o.el.offsetWidth; o.el.classList.add('pop'); score += 2 ** o.v; top = Math.max(top, o.v); fxMerge(o) }
        if (merges.length >= 2) combo(merges.length, top);
        if (top > maxL) { maxL = top; ladder(); if (top >= 5) milestone(top) }
        spawn(); hud(); lock = false;
        if (!canMove()) { over = true; setTimeout(end, 500) }
      }, 120);
    }
    function fxMerge(o) {
      const c = cell(), x = (o.x + .5) * c + 10, y = (o.y + .5) * c + 10, col = D.STAGE[o.v - 1];
      SND.sfx('merge', .62 + o.v * .09, .8);
      ov.P.ring(x, y, col, c * .2, c * (.55 + o.v * .06), 22, 5);
      ov.P.spark(x, y, 6 + o.v * 3, [col, '#fff', '#ffe08a'], 3 + o.v * .5, 26);
      if (o.v >= 6) { FX.shake(el.querySelector('.g3-wrap'), Math.min(10, o.v - 3), 260 + o.v * 20); FX.vibe(o.v >= 9 ? [25, 30, 40] : 15) }
      if (o.v >= 8) ov.P.star(x, y, 10 + o.v, [col, '#ffe08a', '#fff'], 5);
      ov.kick();
    }
    function combo(n, top) {
      const bonus = Math.round((n - 1) * 2 ** top * .5); score += bonus; bestCombo = Math.max(bestCombo, n);
      SND.sfx('combo', 1 + (n - 2) * .12); FX.banner(wrap, `${n} 콤보!`, `+${bonus.toLocaleString()}`, '#ffb020');
    }
    function milestone(v) {
      const s = L.steps[v - 1];
      if (v >= 9) { FX.flash(wrap, D.STAGE[v - 1]); SND.sfx('big') }
      if (v === 11 && !done11) { done11 = true; FX.banner(wrap, `완성! ${s[0]}`, `${L.name} 사다리를 끝까지 올랐어요`, '#ffd23a'); const r = layer.getBoundingClientRect(); for (let i = 0; i < 4; i++) setTimeout(() => { ov.P.star(r.width * (.2 + Math.random() * .6), r.height * (.2 + Math.random() * .5), 26, ['#ffd23a', '#ff5a3c', '#4f83ff', '#16b99a', '#fff'], 7); ov.kick() }, i * 220) }
      else FX.banner(wrap, `${pad(v)} ${s[0]}`, s[2], D.STAGE[v - 1]);
    }
    const canMove = () => T.length < N * N || T.some(t => [[1, 0], [0, 1]].some(([dx, dy]) => { const o = at(t.x + dx, t.y + dy); return o && o.v === t.v && t.v < 11 }));
    function end() {
      over = true; SND.sfx('over'); const up = NBBoard.record(board, score, { max: maxL });
      const st = G.state().ev; st.lad = st.lad || {}; st.lad[L.id] = Math.max(st.lad[L.id] || 0, maxL);
      if (bestCombo >= 2) G.ev('combo', bestCombo, { max: 1 });
      const xp = G.play('2048', score / 80, ['g2048', maxL, 1]);
      const o = el.querySelector('.g2-over'); o.innerHTML = `<div><h3>${up ? '최고 기록!' : '게임 끝!'}</h3><p>최고 단계 <b>${pad(maxL)} ${E((L.steps[maxL - 1] || [''])[0])}</b> · 점수 <b>${score.toLocaleString()}</b></p>${bestCombo >= 2 ? `<p>최대 ${bestCombo} 콤보</p>` : ''}<p class="xp">+${xp} XP</p><div class="gx-ctl"><button type="button" class="gm-btn" data-re>다시 하기</button><a class="gm-btn ghost" href="games/#rank-2048-${L.id}">순위 보기</a></div></div>`; o.classList.add('on');
    }
    el.addEventListener('click', e => {
      const lad = e.target.closest('[data-lad]'); if (lad && lad.dataset.lad !== L.id) { SND.sfx('click'); location.hash = '2048-' + lad.dataset.lad; return }
      if (e.target.closest('[data-re]')) { SND.sfx('click'); reset() }
      if (e.target.closest('[data-end]') && !over && moves) end();
    });
    const kb = e => { if (!el.isConnected) return removeEventListener('keydown', kb); const m = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' }[e.key]; if (m && !e.target.closest('input,textarea')) { e.preventDefault(); move(m) } };
    addEventListener('keydown', kb);
    let sx = 0, sy = 0, dn = false;
    wrap.addEventListener('pointerdown', e => { dn = true; sx = e.clientX; sy = e.clientY });
    wrap.addEventListener('pointerup', e => { if (!dn) return; dn = false; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')) });
    wrap.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    reset();
  }
  window.NBG2048 = game;
})();
