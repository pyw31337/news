/* NewsBoard Game Audio - Web Audio API procedural SFX
   2026-10-30
*/
(function(){
const Ctx = window.AudioContext || window.webkitAudioContext;
let ctx = null;
const getCtx = () => {
  if (!ctx) ctx = new Ctx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

function tone(freq, dur, type='sine', vol=0.15) {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + dur);
}

function noise(dur, vol=0.08) {
  const c = getCtx();
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random()*2-1) * Math.exp(-i/data.length*3);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(g); g.connect(c.destination);
  src.start();
}

const SFX = {
  click() { tone(800, 0.06, 'square', 0.08); },
  merge() {
    tone(320, 0.12, 'sine', 0.12);
    setTimeout(() => tone(480, 0.1, 'triangle', 0.08), 40);
  },
  explode() {
    noise(0.25, 0.18);
    tone(120, 0.3, 'sawtooth', 0.1);
  },
  win() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.1), i*80));
  },
  fail() {
    tone(200, 0.25, 'sawtooth', 0.1);
  },
  place() {
    tone(440, 0.05, 'square', 0.06);
  }
};

window.NBAudio = {
  play(name) {
    if (window.NBGameFX && !window.NBGameFX.SND.on) return;
    const fn = SFX[name];
    if (fn) fn();
  },
  toggle() {
    if (window.NBGameFX) {
      window.NBGameFX.SND.on = !window.NBGameFX.SND.on;
      localStorage.setItem('nb-snd', JSON.stringify(window.NBGameFX.SND));
      return window.NBGameFX.SND.on;
    }
    return true;
  }
};

document.addEventListener('pointerdown', () => getCtx(), {once:true});
console.log('NBAudio ready');
})();
