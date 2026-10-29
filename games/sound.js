/* 게임 사운드: Web Audio로 배경음(이음새 없이 반복)·효과음(재생 속도로 음높이 조절). 배경음·효과음 각각 끄고 켜기(nb-snd) */
(function () {
  const BASE = 'games/assets/audio/';
  const K = 'nb-snd';
  let P = { bgm: 1, sfx: 1, vol: .8 };
  try { Object.assign(P, JSON.parse(localStorage.getItem(K) || '{}')) } catch (e) {}
  const save = () => { try { localStorage.setItem(K, JSON.stringify(P)) } catch (e) {} };
  let ctx = null, master, bgmGain, sfxGain;
  const buf = {}, loading = {};
  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ctx = new C(); master = ctx.createGain(); master.gain.value = P.vol; master.connect(ctx.destination);
      bgmGain = ctx.createGain(); bgmGain.gain.value = .45; bgmGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = .9; sfxGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function load(name) {
    if (buf[name]) return Promise.resolve(buf[name]);
    if (loading[name]) return loading[name];
    const c = ac(); if (!c) return Promise.resolve(null);
    return loading[name] = fetch(BASE + name + '.mp3').then(r => r.arrayBuffer()).then(a => new Promise((ok, no) => c.decodeAudioData(a, ok, no)))
      .then(b => buf[name] = b).catch(() => null);
  }
  /* 효과음: rate로 음높이(합치기 단계가 높을수록 높은 음), vol 0~1 */
  function sfx(name, rate = 1, vol = 1) {
    if (!P.sfx) return; const c = ac(); if (!c) return;
    const b = buf['sfx_' + name];
    if (!b) { load('sfx_' + name); return; }
    const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
    const g = c.createGain(); g.gain.value = vol; s.connect(g); g.connect(sfxGain); s.start();
  }
  let cur = null, curName = '';
  function bgm(name) {
    curName = name || '';
    if (cur) { const o = cur; try { o.g.gain.setTargetAtTime(0, ctx.currentTime, .25); setTimeout(() => { try { o.s.stop() } catch (e) {} }, 900) } catch (e) {} cur = null; }
    if (!name || !P.bgm) return;
    load(name).then(b => {
      if (!b || curName !== name || !P.bgm || cur) return;
      const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
      // MP3 앞뒤 무음(인코더 패딩)을 건너뛰어 이음새 없이 반복
      s.loopStart = .05; s.loopEnd = Math.max(.1, b.duration - .06);
      const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(1, ctx.currentTime, .4);
      s.connect(g); g.connect(bgmGain); s.start(0, .05); cur = { s, g };
    });
  }
  function preload(list) { if (ac()) list.forEach(n => load(n.startsWith('bgm_') ? n : 'sfx_' + n)) }
  /* 화면에 붙이는 토글 버튼 2개 */
  function toggles() {
    const I = n => window.GI ? GI(n) : '';
    return `<div class="sn-tg" role="group" aria-label="소리"><button type="button" class="sn-b ${P.bgm ? 'on' : ''}" data-snd="bgm" aria-pressed="${!!P.bgm}" aria-label="배경음">${I(P.bgm ? 'music' : 'music-off')}<span>배경음</span></button><button type="button" class="sn-b ${P.sfx ? 'on' : ''}" data-snd="sfx" aria-pressed="${!!P.sfx}" aria-label="효과음">${I(P.sfx ? 'volume' : 'volume-off')}<span>효과음</span></button></div>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-snd]'); if (!b) return;
    const k = b.dataset.snd, v = !P[k]; ac();
    if (k === 'bgm') { P.bgm = v ? 1 : 0; save(); bgm(curName) } else { P.sfx = v ? 1 : 0; save(); if (v) sfx('click') }
    document.querySelectorAll(`[data-snd="${k}"]`).forEach(x => { x.classList.toggle('on', v); x.setAttribute('aria-pressed', v); x.innerHTML = (window.GI ? GI(k === 'bgm' ? (v ? 'music' : 'music-off') : (v ? 'volume' : 'volume-off')) : '') + `<span>${k === 'bgm' ? '배경음' : '효과음'}</span>` });
  });
  // 브라우저는 첫 터치 뒤에만 소리를 허용: 그때 대기 중인 배경음 시작
  document.addEventListener('pointerdown', () => { ac(); if (curName && !cur && P.bgm) bgm(curName) }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : ctx.resume() });
  window.NBSound = { sfx, bgm, preload, toggles, get on() { return P } };
})();
