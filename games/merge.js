/* 뉴스 머지 v3(수박 게임 방식): 태양계·스포츠 공·과일 세트, 스프라이트, 연쇄 콤보, 단계별 섬광·흔들림, 최고 단계끼리 합치면 '완성' */
(function () {
  const D = window.NBG_DATA, E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = n => window.GI ? GI(n) : '', A = 'games/assets/merge/', pad = n => String(n).padStart(2, '0');
  // 스프라이트 안에서 몸통이 차지하는 비율(고리·광채가 있는 천체), 기본 118/128
  const BODY = { space: [1, 1, 1, 1, 1, 1, 1, 92 / 118, 80 / 118, 1, 96 / 118] };
  const PTS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66].map(x => x * 10);
  const COL = { space: ['#bfc6d6', '#e9d3b4', '#e6e8ee', '#a8998a', '#e86a3a', '#f2cf7a', '#3f8ff0', '#8fdfe8', '#e9c88a', '#d9a26a', '#ffcf3a'],
    ball: ['#5fb6f0', '#ff8a2a', '#e8ecf3', '#333', '#d6f03a', '#f1ede4', '#e9f02a', '#2459d6', '#ffcf1a', '#fff', '#f2731c'],
    fruit: ['#3f5ad6', '#e3202f', '#f02a3a', '#8f2d8a', '#ff9418', '#e3242b', '#ff8a5a', '#7a4f2a', '#8cc63f', '#3f9a32'] };
  const imgs = {};
  const img = src => imgs[src] || (imgs[src] = Object.assign(new Image(), { src, decoding: 'async' }));
  function game(el, setId) {
    const G = window.NBGame, SND = window.NBSound, FX = window.NBFX;
    const SET = D.MERGE.find(m => m.id === setId) || D.MERGE[0], LV = SET.steps.length, board = 'merge-' + SET.id;
    const IM = SET.steps.map((_, k) => img(`${A}${SET.id}-${k + 1}.webp`));
    el.innerHTML = `<div class="gx-gh"><div><h2>뉴스 머지 <small>${E(SET.name)}</small></h2><p>탭한 자리로 떨어뜨려요. <b>같은 것끼리 닿으면 한 단계 큰 것</b>이 돼요. 위쪽 선을 넘으면 끝!</p></div>
      <div class="gx-sc"><span>점수<b class="mg-s">0</b></span><span>최고<b class="mg-bs">${NBBoard.best(board).toLocaleString()}</b></span></div></div>
      <div class="gx-opt"><div class="gx-chips" role="tablist" aria-label="세트 고르기">${D.MERGE.map(m => `<button type="button" role="tab" aria-selected="${m.id === SET.id}" class="${m.id === SET.id ? 'on' : ''}" data-set="${m.id}">${E(m.name)}</button>`).join('')}</div>${SND.toggles()}</div>
      <div class="mg-top"><div class="mg-next"><small>다음</small><img alt="" width="34" height="34"><b></b></div><div class="mg-chain" aria-live="polite"></div></div>
      <div class="mg-wrap"><canvas class="mg-c" aria-label="머지 게임 판"></canvas><div class="g2-over mg-over"></div></div>
      <div class="g3-lad mg-lad">${SET.steps.map((s, k) => `<span data-k="${k + 1}"><em>${pad(k + 1)}</em><img src="${A}${SET.id}-${k + 1}.webp" alt="" width="28" height="28" loading="lazy"><b>${E(s)}</b></span>`).join('')}</div>`;
    SND.preload(['drop', 'merge', 'combo', 'big', 'over', 'click', 'pop']); SND.bgm(SET.id === 'space' ? 'bgm_merge_a' : 'bgm_merge_b');
    const wrapEl = el.querySelector('.mg-wrap'), cv = el.querySelector('canvas'), x = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.min(420, (el.clientWidth || 360) - 2), H = Math.round(W * 1.38); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const R = k => W * .04 * Math.pow(1.19, k), LINE = H * .17, P = new FX.Particles();
    let O = [], score = 0, next = 0, aim = W / 2, cool = 0, over = false, danger = 0, raf = 0, maxL = 0, chain = 0, chainT = 0, bestChain = 0, uid = 0, t0 = performance.now(), held = null;
    const pick = () => { const r = Math.random(); return r < .35 ? 0 : r < .62 ? 1 : r < .82 ? 2 : r < .95 ? 3 : 4 };
    const setNext = () => { held = next; next = pick(); const n = el.querySelector('.mg-next'); n.querySelector('img').src = IM[next].src; n.querySelector('b').textContent = SET.steps[next] };
    next = pick(); setNext();
    const ladder = () => el.querySelectorAll('.mg-lad span').forEach(s => s.classList.toggle('on', +s.dataset.k <= maxL + 1));
    const pos = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) * (W / r.width) };
    cv.addEventListener('pointermove', e => { aim = pos(e) });
    cv.addEventListener('pointerdown', e => { aim = pos(e); cv.setPointerCapture(e.pointerId) });
    cv.addEventListener('pointerup', e => { aim = pos(e); drop() });
    cv.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    function drop() {
      if (over || cool > 0) return; const k = held, r = R(k), xx = Math.max(r, Math.min(W - r, aim));
      O.push({ id: ++uid, x: xx, y: LINE - r - 6, px: xx, py: LINE - r - 8, k, r, a: 0, born: performance.now() }); SND.sfx('drop', 1.2 - k * .06, .7); cool = 20; setNext();
    }
    function merge(a, b) {
      a.dead = b.dead = 1; const k = a.k + 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, col = COL[SET.id][Math.min(k, LV - 1)];
      const now = performance.now(); chain = now - chainT < 900 ? chain + 1 : 1; chainT = now; bestChain = Math.max(bestChain, chain);
      let pts = PTS[Math.min(k, 10)] * (1 + (chain - 1) * .5);
      if (k >= LV) { // 최고 단계 둘이 만남: 완성 → 사라지며 큰 보너스
        pts += 3000; P.star(mx, my, 50, ['#ffd23a', '#ff5a3c', '#4f83ff', '#16b99a', '#fff'], 8); P.ring(mx, my, '#ffd23a', 10, W * .7, 40, 10);
        FX.banner(wrapEl, '완성!', `${SET.steps[LV - 1]} 둘이 만났어요 +3,000`, '#ffd23a'); FX.flash(wrapEl, '#fff3c0', 500); FX.shake(wrapEl, 14, 600); SND.sfx('big'); FX.vibe([30, 40, 60]);
      } else {
        const n = { id: ++uid, x: mx, y: my, px: mx, py: my, k, r: R(k), a: (a.a + b.a) / 2, born: now, pop: now }; O.push(n);
        P.ring(mx, my, col, n.r * .6, n.r * 1.9, 22, 5); P.spark(mx, my, 8 + k * 3, [col, '#fff', '#ffe08a'], 3 + k * .45, 28);
        if (k >= 5) { FX.shake(wrapEl, Math.min(12, k - 2), 220 + k * 30); FX.vibe(k >= 8 ? [20, 30, 30] : 12) }
        if (k >= 7) { P.star(mx, my, 10 + k, [col, '#fff'], 5); FX.flash(wrapEl, col, 260) }
        if (k > maxL) { maxL = k; ladder(); if (k >= 4) FX.banner(wrapEl, `${pad(k + 1)} ${SET.steps[k]}`, k >= 8 ? '거의 다 왔어요!' : '', col) }
        SND.sfx('merge', .55 + k * .08, .9);
      }
      if (chain >= 2) { SND.sfx('combo', 1 + (chain - 2) * .1, .8); const c = el.querySelector('.mg-chain'); c.textContent = `${chain} 연쇄!`; c.classList.remove('on'); void c.offsetWidth; c.classList.add('on') }
      pts = Math.round(pts); score += pts; P.text(mx, my - 10, '+' + pts.toLocaleString(), '#fff', 16 + Math.min(10, k));
    }
    function step() {
      const g = .3 * (W / 360);
      for (const o of O) { const vx = (o.x - o.px) * .992, vy = (o.y - o.py) * .992; o.px = o.x; o.py = o.y; o.x += vx; o.y += vy + g; o.a += vx / o.r }
      for (let it = 0; it < 6; it++) {
        for (let i = 0; i < O.length; i++) { const a = O[i]; if (a.dead) continue;
          if (a.y > H - a.r) { a.y = H - a.r; a.px += (a.x - a.px) * .08 } if (a.x < a.r) a.x = a.r; if (a.x > W - a.r) a.x = W - a.r;
          for (let j = i + 1; j < O.length; j++) { const b = O[j]; if (b.dead) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, m = a.r + b.r;
            if (d < m) {
              if (a.k === b.k && !over) { merge(a, b); break }
              const p = (m - d) / d, ma = a.r * a.r, mb = b.r * b.r, wa = mb / (ma + mb), wb = ma / (ma + mb);
              a.x -= dx * p * wa; a.y -= dy * p * wa; b.x += dx * p * wb; b.y += dy * p * wb } } }
        O = O.filter(o => !o.dead);
      }
      if (cool > 0) cool--;
      const now = performance.now(), hot = O.some(o => now - o.born > 1400 && o.y - o.r < LINE && Math.abs(o.y - o.py) < 1.2);
      danger = hot ? danger + 1 : Math.max(0, danger - 2); if (danger > 150 && !over) end();
      P.step();
    }
    function draw() {
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, SET.bg[0]); gr.addColorStop(1, SET.bg[1]); x.fillStyle = gr; x.fillRect(0, 0, W, H);
      if (SET.id === 'space') { x.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { x.globalAlpha = .25 + (i % 5) * .12 * (.6 + .4 * Math.sin(performance.now() / 700 + i)); x.fillRect((i * 97 + i * i * 13) % W, (i * 53 + i * i * 7) % H, 1.6, 1.6) } x.globalAlpha = 1 }
      // 경고선
      const warn = danger > 0; x.strokeStyle = warn ? `rgba(255,77,46,${.5 + .5 * Math.sin(performance.now() / 90)})` : (SET.id === 'space' ? 'rgba(255,255,255,.35)' : 'rgba(15,22,48,.22)');
      x.setLineDash([7, 7]); x.lineWidth = 2; x.beginPath(); x.moveTo(0, LINE); x.lineTo(W, LINE); x.stroke(); x.setLineDash([]);
      // 조준선과 대기 중인 공
      if (!over && held != null) { const r = R(held), ax = Math.max(r, Math.min(W - r, aim)); x.strokeStyle = SET.id === 'space' ? 'rgba(255,255,255,.25)' : 'rgba(15,22,48,.15)'; x.lineWidth = 2; x.beginPath(); x.moveTo(ax, LINE); x.lineTo(ax, H); x.stroke(); x.globalAlpha = cool > 0 ? .4 : 1; sprite(held, ax, LINE - r - 6, r, 0); x.globalAlpha = 1 }
      const now = performance.now();
      for (const o of O) { const s = o.pop ? Math.min(1, .55 + (now - o.pop) / 220 * .45) * (1 + .12 * Math.max(0, 1 - (now - o.pop) / 260)) : 1; sprite(o.k, o.x, o.y, o.r * s, o.a) }
      P.draw(x);
      el.querySelector('.mg-s').textContent = score.toLocaleString();
    }
    function sprite(k, cx, cy, r, a) {
      const im = IM[k], f = (BODY[SET.id] || [])[k] || 1, s = (r / (118 * f)) * 256;
      if (im.complete && im.naturalWidth) { x.save(); x.translate(cx, cy); x.rotate(a); x.drawImage(im, -s / 2, -s / 2, s, s); x.restore() }
      else { x.fillStyle = COL[SET.id][k]; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill() }
    }
    function loop() { if (!el.isConnected) { cancelAnimationFrame(raf); return } if (!over) step(); else P.step(); draw(); raf = requestAnimationFrame(loop) }
    loop();
    function end() {
      over = true; SND.sfx('over'); FX.shake(wrapEl, 8, 400);
      O.forEach((o, i) => setTimeout(() => { P.smoke(o.x, o.y, 3, o.r * .6) }, i * 30));
      const up = NBBoard.record(board, score, { max: maxL + 1 });
      if (bestChain >= 2) G.ev('combo', bestChain, { max: 1 }); G.ev('merge_lv', maxL + 1, { max: 1 });
      const xp = G.play('merge', score / 60, ['merge', score, 1]);
      const ov = el.querySelector('.mg-over'); ov.innerHTML = `<div><h3>${up ? '최고 기록!' : '가득 찼어요!'}</h3><p>점수 <b>${score.toLocaleString()}</b> · 최고 단계 <b>${pad(maxL + 1)} ${E(SET.steps[maxL])}</b></p>${bestChain >= 2 ? `<p>최대 ${bestChain} 연쇄</p>` : ''}<p class="xp">+${xp} XP</p><div class="gx-ctl"><button type="button" class="gm-btn" data-re>다시 하기</button><a class="gm-btn ghost" href="games/#rank-merge-${SET.id}">순위 보기</a></div></div>`; ov.classList.add('on');
    }
    el.addEventListener('click', e => {
      const st = e.target.closest('[data-set]'); if (st && st.dataset.set !== SET.id) { SND.sfx('click'); location.hash = 'merge-' + st.dataset.set; return }
      if (e.target.closest('[data-re]')) { SND.sfx('click'); cancelAnimationFrame(raf); const n = el.cloneNode(false); el.replaceWith(n); game(n, SET.id) }
    });
  }
  window.NBMerge = game;
})();
