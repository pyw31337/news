/* 게임 연출 공용: 화면 흔들림, 불꽃·파편·연기·불길 입자, 빛나는 링, 점수 팝업, 섬광, 큰 문구 */
(function () {
  const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const R = Math.random;
  /* 흔들림: power(px)만큼, 점점 잦아들게 */
  function shake(el, power = 6, ms = 320) {
    if (!el || RM()) return; const t0 = performance.now();
    const f = t => { const k = 1 - (t - t0) / ms; if (k <= 0) { el.style.transform = ''; return }
      const p = power * k * k; el.style.transform = `translate(${(R() - .5) * 2 * p}px,${(R() - .5) * 2 * p}px)`; requestAnimationFrame(f) };
    requestAnimationFrame(f);
  }
  /* 입자 묶음(캔버스 게임과 DOM 위 오버레이가 같이 씀) */
  class Particles {
    constructor() { this.P = [] }
    get alive() { return this.P.length > 0 }
    spark(x, y, n, colors, speed = 6, life = 34) { for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, v = speed * (.35 + R()); this.P.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, l: life * (.6 + R() * .6), L: life, c: colors[i % colors.length], g: .14 }) } }
    star(x, y, n, colors, speed = 4) { for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, v = speed * (.4 + R()); this.P.push({ k: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, l: 50 + R() * 30, L: 80, s: 4 + R() * 5, a: R() * 6, va: (R() - .5) * .3, c: colors[i % colors.length], g: .12 }) } }
    debris(x, y, n, colors, speed = 7, size = 8) { for (let i = 0; i < n; i++) { const a = -Math.PI * R(), v = speed * (.3 + R()); this.P.push({ k: 'deb', x, y, vx: Math.cos(a) * v * (R() < .5 ? -1 : 1), vy: Math.sin(a) * v - 2, l: 70 + R() * 50, L: 120, s: size * (.4 + R() * .8), a: R() * 6, va: (R() - .5) * .5, c: colors[i % colors.length], g: .32 }) } }
    smoke(x, y, n, size = 18) { for (let i = 0; i < n; i++) this.P.push({ k: 'smoke', x: x + (R() - .5) * size, y: y + (R() - .5) * size, vx: (R() - .5) * 1.4, vy: -.6 - R() * 1.2, l: 70 + R() * 50, L: 120, s: size * (.6 + R() * .6), g: -.005 }) }
    fire(x, y, n, size = 14) { for (let i = 0; i < n; i++) this.P.push({ k: 'fire', x: x + (R() - .5) * size, y, vx: (R() - .5) * 1, vy: -1.2 - R() * 2.2, l: 26 + R() * 22, L: 48, s: size * (.5 + R() * .7), g: -.02 }) }
    ring(x, y, color, r0 = 10, r1 = 90, life = 26, w = 6) { this.P.push({ k: 'ring', x, y, r0, r1, l: life, L: life, c: color, w }) }
    text(x, y, t, color = '#fff', size = 22) { this.P.push({ k: 'text', x, y, vx: 0, vy: -1.1, l: 60, L: 60, t, c: color, s: size, g: 0 }) }
    step(dt = 1) {
      for (const p of this.P) { p.l -= dt; if (p.k === 'ring') continue; p.vy += p.g * dt; if (p.k === 'spark' || p.k === 'deb') { p.vx *= .985; } p.x += p.vx * dt; p.y += p.vy * dt; if (p.a != null) p.a += p.va * dt }
      this.P = this.P.filter(p => p.l > 0); if (this.P.length > 900) this.P.splice(0, this.P.length - 900);
    }
    draw(x) {
      for (const p of this.P) {
        const t = Math.max(0, p.l / p.L);
        if (p.k === 'spark') { x.globalCompositeOperation = 'lighter'; x.strokeStyle = p.c; x.globalAlpha = Math.min(1, t * 1.5); x.lineWidth = 2.2; x.beginPath(); x.moveTo(p.x - p.vx * 2, p.y - p.vy * 2); x.lineTo(p.x, p.y); x.stroke(); x.globalCompositeOperation = 'source-over' }
        else if (p.k === 'star') { x.globalAlpha = Math.min(1, t * 1.6); x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? p.s * .45 : p.s, a = i * Math.PI / 5; x.lineTo(Math.cos(a) * r, Math.sin(a) * r) } x.closePath(); x.fill(); x.restore() }
        else if (p.k === 'deb') { x.globalAlpha = Math.min(1, t * 2); x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(-p.s / 2, p.s * .1, p.s, p.s * .23); x.restore() }
        else if (p.k === 'smoke') { const s = p.s * (1.8 - t); x.globalAlpha = t * .45; const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, s); g.addColorStop(0, 'rgba(120,120,130,.9)'); g.addColorStop(1, 'rgba(120,120,130,0)'); x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, s, 0, 7); x.fill() }
        else if (p.k === 'fire') { x.globalCompositeOperation = 'lighter'; const s = p.s * (.4 + t); x.globalAlpha = t; const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, s); g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(.4, 'rgba(255,150,40,.85)'); g.addColorStop(1, 'rgba(220,40,20,0)'); x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, s, 0, 7); x.fill(); x.globalCompositeOperation = 'source-over' }
        else if (p.k === 'ring') { const k = 1 - t, r = p.r0 + (p.r1 - p.r0) * (1 - (1 - k) * (1 - k)); x.globalAlpha = t; x.strokeStyle = p.c; x.lineWidth = p.w * t + 1; x.shadowColor = p.c; x.shadowBlur = 16; x.beginPath(); x.arc(p.x, p.y, r, 0, 7); x.stroke(); x.shadowBlur = 0 }
        else if (p.k === 'text') { x.globalAlpha = Math.min(1, t * 2); x.font = `900 ${p.s}px Pretendard Variable,Pretendard,sans-serif`; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = 'rgba(15,22,48,.55)'; x.strokeText(p.t, p.x, p.y); x.fillStyle = p.c; x.fillText(p.t, p.x, p.y) }
      }
      x.globalAlpha = 1;
    }
  }
  /* DOM 위에 덮는 입자 캔버스(2048용): 입자가 있을 때만 그림 */
  function overlay(host) {
    const cv = document.createElement('canvas'); cv.className = 'fx-cv'; host.appendChild(cv);
    const P = new Particles(), x = cv.getContext('2d'); let raf = 0, dpr = Math.min(2, devicePixelRatio || 1);
    const fit = () => { const r = host.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px' };
    fit(); addEventListener('resize', fit);
    const loop = () => { x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, cv.width, cv.height); P.step(); P.draw(x); raf = P.alive && cv.isConnected ? requestAnimationFrame(loop) : 0 };
    return { P, kick() { if (!raf) raf = requestAnimationFrame(loop) }, fit };
  }
  function flash(host, color = '#fff', ms = 380) { if (RM()) return; const d = document.createElement('i'); d.className = 'fx-flash'; d.style.setProperty('--c', color); d.style.setProperty('--d', ms + 'ms'); host.appendChild(d); setTimeout(() => d.remove(), ms + 50) }
  function banner(host, text, sub = '', color = '#ffcf3a') { const d = document.createElement('div'); d.className = 'fx-ban'; d.style.setProperty('--c', color); d.innerHTML = `<b>${text}</b>${sub ? `<small>${sub}</small>` : ''}`; host.appendChild(d); setTimeout(() => d.remove(), 1500) }
  const vibe = p => { try { navigator.vibrate && navigator.vibrate(p) } catch (e) {} };
  window.NBFX = { shake, Particles, overlay, flash, banner, vibe, RM };
})();
