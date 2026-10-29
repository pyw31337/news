/* 팩트 새총 v3 — 팩트체크 특공대 vs 가짜뉴스 고블린. matter.js 강체 물리, 새 4종 능력, 재질별 내구도, 가짜뉴스 상자 폭발,
   불꽃·파편·연기·불길·충격파·화면 흔들림·슬로모션, 3월드 × 4레벨(별 3개). 기획: docs/GAME_DESIGN.md */
(function () {
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = n => window.GI ? GI(n) : '', STAR = '<svg class="sl-sv" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.6l-6 3.3 1.3-6.7-5-4.7 6.8-.8z"/></svg>', A = 'games/assets/sling/', W = 1024, H = 576, GY = 498, SX = 170, SY = GY - 130;
  const IMG = {}; const img = n => IMG[n] || (IMG[n] = Object.assign(new Image(), { src: A + n + '.webp', decoding: 'async' }));
  const MAT = { wood: { d: .0018, hp: 120, pts: 500, deb: ['#e9a45a', '#b8702c', '#8a4f1c'], snd: 'hit_wood' },
    glass: { d: .0012, hp: 55, pts: 300, deb: ['#d8f6ff', '#9fe0f5', '#ffffff'], snd: 'hit_glass' },
    stone: { d: .0042, hp: 260, pts: 800, deb: ['#c6ccd8', '#8a92a3', '#5f6675'], snd: 'hit_stone' } };
  const BIRD = { red: { r: 17, name: '팩트', tip: '기본 새' }, yellow: { r: 16, name: '속보', tip: '날아가는 중 화면을 탭하면 돌진' },
    black: { r: 19, name: '폭로', tip: '날아가는 중 탭하면 폭발' }, blue: { r: 12, name: '교차검증', tip: '날아가는 중 탭하면 세 갈래로 분열' } };
  const GOB = { s: { r: 20, hp: 45, img: 'gob_s' }, m: { r: 26, hp: 90, img: 'gob_m' }, k: { r: 26, hp: 180, img: 'gob_k' } };
  /* ---------- 레벨 도구: 집(기둥 2 + 지붕), 탑, 벽 ---------- */
  const T = 16; // 기둥·판 두께
  function house(out, x, base, w, h, mat, roof = mat) { out.push(['b', x - w / 2 + T / 2, base - h / 2, T, h, mat], ['b', x + w / 2 - T / 2, base - h / 2, T, h, mat], ['b', x, base - h - T / 2, w + 8, T, roof]); return base - h - T }
  function tower(out, x, base, floors) { let b = base; for (const [w, h, m, gob] of floors) { const top = house(out, x, b, w, h, m); if (gob) out.push(['g', x, b - GOB[gob].r - 1, gob]); b = top } return b }
  const L = [
    { w: 1, birds: ['red', 'red', 'red'], build: o => { tower(o, 720, GY, [[110, 80, 'wood', 's']]) } },
    { w: 1, birds: ['red', 'red', 'yellow'], build: o => { tower(o, 650, GY, [[100, 80, 'wood', 's']]); tower(o, 830, GY, [[110, 90, 'wood', 's']]) } },
    { w: 1, birds: ['red', 'yellow', 'yellow'], build: o => { tower(o, 760, GY, [[120, 80, 'wood', 's'], [100, 70, 'wood', 's'], [80, 60, 'wood']]) } },
    { w: 1, birds: ['red', 'yellow', 'red', 'yellow'], build: o => { tower(o, 620, GY, [[90, 90, 'wood', 's'], [70, 60, 'wood']]); o.push(['b', 720, GY - 60, 24, 120, 'wood']); tower(o, 820, GY, [[120, 90, 'wood', 'm'], [100, 70, 'wood', 's']]); o.push(['b', 930, GY - 50, 24, 100, 'wood']) } },
    { w: 2, birds: ['blue', 'red', 'blue'], build: o => { tower(o, 700, GY, [[110, 80, 'glass', 's']]); o.push(['t', 800, GY - 22]); tower(o, 890, GY, [[100, 80, 'glass', 's']]) } },
    { w: 2, birds: ['blue', 'yellow', 'red'], build: o => { o.push(['s', 780, GY - 40, 260, 80]); tower(o, 720, GY - 80, [[100, 70, 'glass', 's']]); tower(o, 850, GY - 80, [[100, 70, 'wood', 's'], [80, 60, 'glass', 's']]) } },
    { w: 2, birds: ['red', 'blue', 'yellow'], build: o => { tower(o, 620, GY, [[90, 80, 'wood', 's']]); o.push(['t', 700, GY - 22], ['t', 744, GY - 22]); tower(o, 830, GY, [[110, 90, 'glass', 'm'], [90, 70, 'glass', 's']]); o.push(['t', 930, GY - 22]) } },
    { w: 2, birds: ['blue', 'blue', 'yellow', 'red'], build: o => { tower(o, 780, GY, [[130, 70, 'glass', 's'], [110, 70, 'wood', 's'], [90, 60, 'glass', 's'], [70, 50, 'glass']]) } },
    { w: 3, birds: ['black', 'red', 'yellow'], build: o => { const t = tower(o, 760, GY, [[140, 90, 'stone', 'm']]); o.push(['t', 760, t - 22]); tower(o, 900, GY, [[80, 70, 'wood', 's']]) } },
    { w: 3, birds: ['black', 'blue', 'yellow', 'red'], build: o => { o.push(['b', 640, GY - 70, 26, 140, 'stone'], ['b', 940, GY - 70, 26, 140, 'stone']); tower(o, 790, GY, [[150, 90, 'stone', 's'], [120, 70, 'glass', 'm'], [90, 60, 'stone', 'k']]) } },
    { w: 3, birds: ['black', 'black', 'yellow', 'blue'], build: o => { const a = tower(o, 650, GY, [[90, 100, 'stone', 's'], [80, 70, 'glass', 's']]); const b = tower(o, 900, GY, [[90, 100, 'stone', 'm'], [80, 70, 'glass', 'k']]); o.push(['b', 775, Math.min(a, b) - T / 2, 330, T, 'wood'], ['t', 775, Math.min(a, b) - T - 22]) } },
    { w: 3, birds: ['black', 'yellow', 'blue', 'black', 'red'], build: o => { o.push(['s', 820, GY - 30, 340, 60]); tower(o, 700, GY - 60, [[100, 80, 'stone', 's'], [80, 60, 'glass', 's']]); tower(o, 830, GY - 60, [[110, 90, 'stone', 'm'], [90, 70, 'stone', 'k']]); tower(o, 950, GY - 60, [[80, 80, 'glass', 's']]); o.push(['t', 765, GY - 82], ['t', 895, GY - 82], ['t', 620, GY - 22]) } }
  ];
  const WORLD = [null, { name: '동네 소문', bg: 'bg1', bgm: 'bgm_sling_a' }, { name: '온라인 커뮤니티', bg: 'bg2', bgm: 'bgm_sling_a' }, { name: '가짜뉴스 공장', bg: 'bg3', bgm: 'bgm_sling_b' }];
  const PK = 'nb-sling';
  const prog = () => { try { return JSON.parse(localStorage.getItem(PK) || '{}') } catch (e) { return {} } };
  const setProg = (lv, stars, score) => { const p = prog(), c = p[lv] || { s: 0, sc: 0 }; p[lv] = { s: Math.max(c.s, stars), sc: Math.max(c.sc, score) }; localStorage.setItem(PK, JSON.stringify(p)); return p };
  const total = () => Object.values(prog()).reduce((a, v) => a + v.sc, 0);
  /* ---------- 레벨 고르기 ---------- */
  function select(el) {
    const p = prog(), SND = window.NBSound; SND.bgm('bgm_sling_a');
    el.innerHTML = `<div class="gx-gh"><div><h2>팩트 새총</h2><p>팩트체크 특공대가 <b>가짜뉴스 고블린</b>의 성을 무너뜨려요. 새를 뒤로 당겼다 놓고, 날아가는 동안 화면을 탭하면 <b>특수 능력</b>!</p></div>
      <div class="gx-sc"><span>모은 별<b>${Object.values(p).reduce((a, v) => a + v.s, 0)}/36</b></span><span>총점<b>${total().toLocaleString()}</b></span></div></div>
      <div class="gx-opt"><div class="sl-birds">${Object.entries(BIRD).map(([k, b]) => `<span><img src="${A}bird_${k}.webp" alt="" width="30" height="30">${E(b.name)}<small>${E(b.tip)}</small></span>`).join('')}</div>${SND.toggles()}</div>
      ${[1, 2, 3].map(w => `<section class="sl-world"><h3>월드 ${w} · ${E(WORLD[w].name)}</h3><div class="sl-lvs">${L.map((l, i) => [l, i]).filter(([l]) => l.w === w).map(([l, i]) => {
        const st = (p[i + 1] || {}).s || 0, open = i === 0 || ((p[i] || {}).s || 0) > 0;
        return `<button type="button" class="sl-lv ${open ? '' : 'lock'}" ${open ? `data-lv="${i + 1}"` : 'disabled'} style="background-image:url(${A}${WORLD[w].bg}.webp)"><b>${i + 1}</b><span class="sl-st">${[0, 1, 2].map(k => `<i class="${k < st ? 'on' : ''}">${STAR}</i>`).join('')}</span>${open ? '' : I('lock')}</button>` }).join('')}</div></section>`).join('')}
      <div class="gx-ctl"><a class="gm-btn ghost" href="games/#rank-sling">${I('trophy')}순위 보기</a></div>`;
    el.onclick = e => { const b = e.target.closest('[data-lv]'); if (b) { SND.sfx('click'); location.hash = 'sling-' + b.dataset.lv } };
  }
  /* ---------- 한 레벨 ---------- */
  function play(el, lv) {
    const M = window.Matter, G = window.NBGame, SND = window.NBSound, FX = window.NBFX; const LD = L[lv - 1]; if (!LD || !M) return select(el);
    const WD = WORLD[LD.w];
    el.innerHTML = `<div class="gx-gh"><div><h2>팩트 새총 <small>${lv}단계 · ${E(WD.name)}</small></h2><p class="sl-hint">새를 뒤로 당겼다 놓으세요. 날아가는 중 탭 = 특수 능력</p></div>
      <div class="gx-sc"><span>점수<b class="sl-s">0</b></span><span>최고<b>${((prog()[lv] || {}).sc || 0).toLocaleString()}</b></span></div></div>
      <div class="gx-opt"><div class="sl-q"></div>${SND.toggles()}<button type="button" class="gm-btn ghost sl-fs" aria-label="크게 보기">${I('arrow-right')}크게</button></div>
      <div class="sl-wrap"><canvas class="sl-c" aria-label="팩트 새총 판"></canvas><div class="g2-over sl-over"></div></div>
      <div class="gx-ctl"><button type="button" class="gm-btn ghost" data-sel>${I('arrow-left')}레벨 고르기</button><button type="button" class="gm-btn ghost" data-re>${I('refresh')}다시</button></div>`;
    SND.preload(['stretch', 'launch', 'hit_wood', 'hit_glass', 'hit_stone', 'boom', 'squish', 'ability', 'star', 'win', 'over', 'click']); SND.bgm(WD.bgm);
    const wrap = el.querySelector('.sl-wrap'), cv = el.querySelector('canvas'), x = cv.getContext('2d');
    const fit = () => { const w = wrap.clientWidth || 360, dpr = Math.min(2, devicePixelRatio || 1); cv.width = w * dpr; cv.height = w * H / W * dpr; cv.style.width = w + 'px'; cv.style.height = w * H / W + 'px' };
    fit(); addEventListener('resize', fit);
    const eng = M.Engine.create({ enableSleeping: true }); eng.positionIterations = 10; eng.velocityIterations = 8; eng.gravity.y = 1;
    const Wd = eng.world, B = M.Bodies, Bd = M.Body, V = M.Vector;
    M.Composite.add(Wd, [B.rectangle(W / 2, GY + 40, W * 3, 80, { isStatic: true, label: 'ground', friction: .9 }), B.rectangle(-60, H / 2, 40, H * 3, { isStatic: true }), B.rectangle(W + 400, H / 2, 40, H * 3, { isStatic: true })]);
    const items = []; LD.build(items); let gobs = 0, blocks = 0;
    for (const it of items) {
      if (it[0] === 'b') { const [, cx, cy, w, h, m] = it; const b = B.rectangle(cx, cy, w, h, { density: MAT[m].d, friction: .7, restitution: .05, label: 'block' }); b.nb = { t: 'block', m, hp: MAT[m].hp, max: MAT[m].hp, w, h }; M.Composite.add(Wd, b); blocks++ }
      else if (it[0] === 's') { const [, cx, cy, w, h] = it; const b = B.rectangle(cx, cy, w, h, { isStatic: true, label: 'base' }); b.nb = { t: 'base', w, h }; M.Composite.add(Wd, b) }
      else if (it[0] === 't') { const b = B.rectangle(it[1], it[2], 44, 44, { density: .0016, friction: .7, label: 'tnt' }); b.nb = { t: 'tnt', hp: 30, max: 30, w: 44, h: 44 }; M.Composite.add(Wd, b) }
      else if (it[0] === 'g') { const g = GOB[it[3]]; const b = B.circle(it[1], it[2], g.r, { density: .0016, friction: .6, restitution: .1, label: 'gob' }); b.nb = { t: 'gob', k: it[3], hp: g.hp, max: g.hp, r: g.r }; M.Composite.add(Wd, b); gobs++ }
    }
    const queue = LD.birds.slice(); let bird = null, flying = null, drag = null, score = 0, killed = 0, frames = 0, done = false, slow = 0, shotT = 0, ability = false, extra = [];
    const P = new FX.Particles(); let shakeP = 0, flashA = 0, flashC = '#fff';
    const hudQ = () => { el.querySelector('.sl-q').innerHTML = queue.map(k => `<img src="${A}bird_${k}.webp" alt="${E(BIRD[k].name)}" width="26" height="26">`).join('') };
    const addScore = (n, x0, y0, col = '#fff') => { score += n; el.querySelector('.sl-s').textContent = score.toLocaleString(); if (x0 != null) P.text(x0, y0, '+' + n.toLocaleString(), col, 20) };
    const shake = p => { shakeP = Math.max(shakeP, p) };
    function load() { if (!queue.length) return; const k = queue.shift(); hudQ(); bird = { k, r: BIRD[k].r }; ability = false }
    load();
    /* 피해: 부딪힌 속도 × 상대 질량. 시작 1초는 자리 잡기라 무시 */
    function hurt(b, dmg, by) {
      if (!b.nb || b.nb.dead || dmg <= 2 || frames < 70) return;
      b.nb.hp -= dmg; const p = b.position;
      if (b.nb.t === 'block') { if (dmg > 14) SND.sfx(MAT[b.nb.m].snd, .9 + Math.random() * .3, Math.min(1, dmg / 120)); if (b.nb.m === 'stone' && dmg > 30) P.spark(p.x, p.y, 6, ['#fff', '#ffd27a'], 4, 18) }
      if (b.nb.hp <= 0) destroy(b);
    }
    function destroy(b) {
      const n = b.nb; if (n.dead) return; n.dead = true; const p = b.position; M.Composite.remove(Wd, b);
      if (n.t === 'block') { const m = MAT[n.m]; P.debris(p.x, p.y, 10 + Math.round((n.w * n.h) / 400), m.deb, 6, n.m === 'glass' ? 7 : 10); P.smoke(p.x, p.y, 2, 14); SND.sfx(m.snd, .8, 1); if (n.m === 'stone') shake(5); addScore(m.pts, p.x, p.y - 10, '#ffe08a') }
      else if (n.t === 'gob') { killed++; P.smoke(p.x, p.y, 6, n.r); P.star(p.x, p.y, 10, ['#b6f28c', '#fff', '#ffe08a'], 4); P.ring(p.x, p.y, '#9ff07a', 6, 60, 22, 5); SND.sfx('squish', n.k === 'k' ? .7 : 1); FX.vibe(20); addScore(n.k === 'k' ? 10000 : 5000, p.x, p.y - 30, '#b6f28c');
        if (--gobs === 0) { slow = 70; FX.banner(wrap, '가짜뉴스 소탕!', '', '#b6f28c') } }
      else if (n.t === 'tnt') explode(p.x, p.y, 175, 1);
    }
    function explode(ex, ey, rad, power) {
      SND.sfx('boom', .9 + Math.random() * .15); shake(16 * power); flashA = .55 * power; flashC = '#fff1c0'; FX.vibe([40, 30, 60]);
      P.spark(ex, ey, 60, ['#fff6c4', '#ffb020', '#ff5a3c'], 11, 34); P.fire(ex, ey, 40, 26); P.smoke(ex, ey, 18, 34); P.debris(ex, ey, 18, ['#3a2a1a', '#c8231e', '#ffcf1a'], 9, 9); P.ring(ex, ey, '#ffd27a', 10, rad * 1.1, 26, 10); P.ring(ex, ey, '#ff7a3a', 6, rad * .7, 18, 6);
      let n = 0; const lin = setInterval(() => { P.fire(ex + (Math.random() - .5) * 40, ey + 10, 3, 16); if (++n > 30) clearInterval(lin) }, 50);
      for (const b of M.Composite.allBodies(Wd)) { if (b.isStatic) continue; const d = V.sub(b.position, { x: ex, y: ey }), dist = V.magnitude(d); if (dist > rad || dist < 1) continue;
        const f = (1 - dist / rad) * .055 * b.mass * power; Bd.applyForce(b, b.position, V.mult(V.normalise(d), f)); hurt(b, (1 - dist / rad) * 260 * power) }
    }
    M.Events.on(eng, 'collisionStart', e => { for (const pr of e.pairs) { const a = pr.bodyA, b = pr.bodyB, sp = V.magnitude(V.sub(a.velocity, b.velocity));
      if (sp < 2.2) continue; const ma = a.isStatic ? b.mass : a.mass, mb = b.isStatic ? a.mass : b.mass;
      hurt(a, (sp - 2) * mb * 5, b); hurt(b, (sp - 2) * ma * 5, a);
      if (a.label === 'bird' || b.label === 'bird') { const bb = a.label === 'bird' ? a : b; if (sp > 6) { shake(Math.min(6, sp / 3)); const c = pr.collision.supports[0] || bb.position; P.spark(c.x, c.y, 8, ['#fff', '#ffd27a'], 4, 16) } } } });
    /* 입력: 새총 근처에서 끌기, 비행 중 탭 = 능력 */
    const wpos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height } };
    cv.addEventListener('pointerdown', e => {
      const p = wpos(e);
      if (flying && !ability && flying.k !== 'red') { useAbility(); return }
      if (bird && !flying && !done && Math.hypot(p.x - SX, p.y - SY) < 110) { drag = p; cv.setPointerCapture(e.pointerId); SND.sfx('stretch', 1, .6) }
    });
    cv.addEventListener('pointermove', e => { if (!drag) return; const p = wpos(e), d = V.sub(p, { x: SX, y: SY }), m = V.magnitude(d), MX = 115; drag = m > MX ? V.add({ x: SX, y: SY }, V.mult(d, MX / m)) : p });
    cv.addEventListener('pointerup', () => { if (!drag) return; const d = V.sub({ x: SX, y: SY }, drag); drag = null; if (V.magnitude(d) < 18) return; launch(V.mult(d, .165)) });
    cv.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    function launch(v) {
      const b = B.circle(SX, SY, bird.r, { density: bird.k === 'black' ? .006 : .004, friction: .5, restitution: .3, label: 'bird' }); b.nb = { t: 'bird' };
      Bd.setVelocity(b, v); M.Composite.add(Wd, b); flying = { body: b, k: bird.k, t: 0, still: 0 }; bird = null; shotT = 0; SND.sfx('launch'); P.smoke(SX, SY, 4, 10);
    }
    function useAbility() {
      ability = true; const b = flying.body, p = b.position; SND.sfx('ability');
      if (flying.k === 'yellow') { const v = V.mult(V.normalise(b.velocity), Math.max(22, V.magnitude(b.velocity) * 2.2)); Bd.setVelocity(b, v); P.spark(p.x, p.y, 16, ['#fff3a0', '#ffcc1a'], 5, 20); P.ring(p.x, p.y, '#ffcc1a', 6, 50, 16, 4) }
      else if (flying.k === 'black') { M.Composite.remove(Wd, b); explode(p.x, p.y, 150, 1.1); flying.gone = true }
      else if (flying.k === 'blue') { const v = b.velocity; for (const a of [-.22, .22]) { const c = B.circle(p.x, p.y, 12, { density: .004, friction: .5, restitution: .3, label: 'bird' }); c.nb = { t: 'bird' }; Bd.setVelocity(c, V.rotate(v, a)); M.Composite.add(Wd, c); extra.push({ body: c, k: 'blue', t: 0 }) } P.star(p.x, p.y, 8, ['#a8dcff', '#fff'], 3) }
    }
    function step() {
      frames++; const ts = slow > 0 ? .35 : 1; if (slow > 0) slow--;
      M.Engine.update(eng, 1000 / 60 * ts);
      for (const b of M.Composite.allBodies(Wd)) if (!b.isStatic && (b.position.y > H + 200 || b.position.x < -200 || b.position.x > W + 300)) { if (b.nb && b.nb.t === 'gob') destroy(b); else if (b.label !== 'bird') M.Composite.remove(Wd, b) }
      if (flying) { flying.t++; const b = flying.body, sp = V.magnitude(b.velocity); flying.still = sp < .25 ? flying.still + 1 : 0;
        if (frames % 3 === 0 && sp > 4 && !flying.gone) P.smoke(b.position.x, b.position.y, 1, 4);
        if (flying.gone || flying.still > 70 || flying.t > 540 || b.position.x > W + 100 || b.position.y > H + 100) { if (!flying.gone) { P.smoke(b.position.x, b.position.y, 6, 10); M.Composite.remove(Wd, b) } extra.forEach(e => M.Composite.remove(Wd, e.body)); extra = []; flying = null; shotT = 1 } }
      if (shotT && !done) { shotT++; if (shotT > 50) { shotT = 0; if (gobs <= 0) win(); else if (queue.length) load(); else lose() } }
      if (!done && gobs <= 0 && !flying && !shotT && frames > 80) win();
      P.step(ts);
    }
    function draw() {
      const s = cv.width / W; x.setTransform(s, 0, 0, s, 0, 0);
      if (shakeP > .2) { x.translate((Math.random() - .5) * shakeP, (Math.random() - .5) * shakeP); shakeP *= .88 } else shakeP = 0;
      const bg = img(WD.bg); if (bg.complete && bg.naturalWidth) x.drawImage(bg, 0, 0, W, H); else { x.fillStyle = '#bfe3ff'; x.fillRect(0, 0, W, H) }
      const sl = img('slingshot'); x.drawImage(sl, SX - 40, GY - 168, 80, 170);
      const pouch = drag || (bird && !flying ? { x: SX, y: SY } : null);
      if (pouch) { x.strokeStyle = '#4a2a10'; x.lineWidth = 5; x.beginPath(); x.moveTo(SX - 28, GY - 152); x.lineTo(pouch.x, pouch.y); x.stroke(); }
      if (bird && !flying) spr('bird_' + bird.k, pouch.x, pouch.y, bird.r * 2.8, 0);
      if (pouch) { x.strokeStyle = '#5b3a1a'; x.lineWidth = 5; x.beginPath(); x.moveTo(SX + 28, GY - 152); x.lineTo(pouch.x, pouch.y); x.stroke() }
      if (drag) { let px = drag.x, py = drag.y, vx = (SX - drag.x) * .165, vy = (SY - drag.y) * .165; x.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 40; i++) { vy += (1000 / 60) ** 2 * .001; vx *= .99; vy *= .99; px += vx; py += vy; if (i % 3) continue; x.beginPath(); x.arc(px, py, Math.max(1.5, 4 - i * .07), 0, 7); x.fill() } }
      for (const b of M.Composite.allBodies(Wd)) {
        const n = b.nb; if (!n) continue; const p = b.position;
        x.save(); x.translate(p.x, p.y); x.rotate(b.angle);
        if (n.t === 'block') { const st = n.hp > n.max * .66 ? 0 : n.hp > n.max * .33 ? 1 : 2; const im = img(`${n.m}_${st}`); if (im.complete) x.drawImage(im, -n.w / 2, -n.h / 2, n.w, n.h) }
        else if (n.t === 'base') { x.fillStyle = '#6a6f7e'; x.fillRect(-n.w / 2, -n.h / 2, n.w, n.h); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(-n.w / 2, -n.h / 2, n.w, 6) }
        else if (n.t === 'tnt') { const im = img('tnt'); if (im.complete) x.drawImage(im, -22, -22, 44, 44) }
        else if (n.t === 'gob') { const g = GOB[n.k], hurtI = n.hp < n.max * .6; const im = img(g.img + (hurtI ? '_hurt' : '')); const sz = n.r * 96 / (n.k === 's' ? 28 : 36); if (im.complete) x.drawImage(im, -sz / 2, -sz / 2 - (n.k === 'k' ? 2 : 0), sz, sz) }
        else if (n.t === 'bird') { const k = flying && (flying.body === b || extra.some(e => e.body === b)) ? (flying.body === b ? flying.k : 'blue') : 'red', r = b.circleRadius; const im = img('bird_' + k); if (im.complete) x.drawImage(im, -r * 1.4, -r * 1.4, r * 2.8, r * 2.8) }
        x.restore();
      }
      P.draw(x);
      if (flashA > .01) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = flashA; x.fillStyle = flashC; x.fillRect(0, 0, cv.width, cv.height); x.globalAlpha = 1; flashA *= .85 }
    }
    const spr = (n, cx, cy, sz, a) => { const im = img(n); if (!im.complete) return; x.save(); x.translate(cx, cy); x.rotate(a); x.drawImage(im, -sz / 2, -sz / 2, sz, sz); x.restore() };
    let raf = 0; const loop = () => { if (!el.isConnected) { cancelAnimationFrame(raf); M.Engine.clear(eng); return } step(); draw(); raf = requestAnimationFrame(loop) }; loop();
    const target = () => { const s2 = items.filter(i => i[0] === 'g').length * 5000 + blocks * 250 + 10000; return [s2, s2 + 18000] };
    function win() {
      if (done) return; done = true; let bonus = queue.length * 10000 + (bird ? 10000 : 0); if (bonus) addScore(bonus);
      const [s2, s3] = target(), st = score >= s3 ? 3 : score >= s2 ? 2 : 1;
      finish(true, st);
    }
    function lose() { if (done) return; done = true; finish(false, 0) }
    function finish(ok, st) {
      setProg(lv, st, ok ? score : 0); const p = prog();
      const ev = G.state().ev; ev.slv = ev.slv || {}; ev.slv[lv] = Math.max(ev.slv[lv] || 0, st);
      const up = ok && NBBoard.record('sling', total(), { lv });
      const xp = G.play('sling', killed * 4 + st * 8, ['sling', killed]);
      SND.sfx(ok ? 'win' : 'over'); setTimeout(() => SND.bgm(''), 200);
      const ov = el.querySelector('.sl-over');
      ov.innerHTML = `<div><div class="sl-stars">${[0, 1, 2].map(i => `<span class="${i < st ? 'on' : ''}" style="--d:${.25 + i * .35}s">${STAR}</span>`).join('')}</div><h3>${ok ? (st === 3 ? '완벽한 팩트체크!' : '가짜뉴스 소탕!') : '고블린이 남았어요'}</h3>
        <p>점수 <b>${score.toLocaleString()}</b> · 물리친 고블린 <b>${killed}</b></p>${up ? '<p>총점 최고 기록!</p>' : ''}<p class="xp">+${xp} XP</p>
        <div class="gx-ctl">${ok && lv < L.length ? `<button type="button" class="gm-btn" data-nx>다음 단계</button>` : ''}<button type="button" class="gm-btn ${ok ? 'ghost' : ''}" data-re>다시 하기</button><button type="button" class="gm-btn ghost" data-sel>레벨 고르기</button></div></div>`;
      ov.classList.add('on'); if (ok) for (let i = 0; i < st; i++) setTimeout(() => SND.sfx('star', 1 + i * .12), 250 + i * 350);
    }
    el.onclick = e => {
      if (e.target.closest('[data-nx]')) { SND.sfx('click'); location.hash = 'sling-' + (lv + 1) }
      else if (e.target.closest('[data-re]')) { SND.sfx('click'); const n = el.cloneNode(false); el.replaceWith(n); play(n, lv) }
      else if (e.target.closest('[data-sel]')) { SND.sfx('click'); location.hash = 'sling' }
      else if (e.target.closest('.sl-fs')) { const f = wrap.requestFullscreen || wrap.webkitRequestFullscreen; if (f) { Promise.resolve(f.call(wrap)).then(() => { try { screen.orientation.lock('landscape').catch(() => {}) } catch (er) {} setTimeout(fit, 300) }).catch(() => {}) } }
    };
    document.addEventListener('fullscreenchange', () => setTimeout(fit, 200));
  }
  window.NBSling = { select, play, LEVELS: L.length };
})();
