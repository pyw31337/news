"""게임 배경음·효과음 합성(저작권 걱정 없는 직접 합성): python3 scripts/game_art/audio.py → games/assets/audio/*.mp3
배경음 6곡(게임별 2곡, 8마디 반복), 효과음 18종. numpy로 파형을 만들고 ffmpeg로 MP3(모노) 인코딩."""
import numpy as np, subprocess, os, wave
SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'games', 'assets', 'audio')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
def hz(n):  # 'A4' → 440
    name, oc = n[:-1], int(n[-1]); return 440 * 2 ** ((NOTE[name] + 12 * (oc - 4) - 9) / 12)
def t_(d): return np.arange(int(SR * d)) / SR
def env(n, a=.005, d=.2, s=.0, r=.05, dur=None):
    L = n; e = np.zeros(L); A = int(a * SR); D = int(d * SR); R = int(r * SR)
    e[:A] = np.linspace(0, 1, max(A, 1))[:len(e[:A])]
    dd = np.exp(-np.arange(L - A) / max(D, 1)) * (1 - s) + s; e[A:] = dd
    if R and L > R: e[-R:] *= np.linspace(1, 0, R)
    return e
def lowpass(x, a=.15):
    y = np.zeros_like(x); acc = 0.
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def lp(x, cut):  # 빠른 근사: 이동 평균 2회
    k = max(1, int(SR / cut / 2)); w = np.ones(k) / k; return np.convolve(np.convolve(x, w, 'same'), w, 'same')
# ---- 악기 ----
def sine(f, d): return np.sin(2 * np.pi * f * t_(d))
def square(f, d, duty=.5): return np.where((f * t_(d)) % 1 < duty, 1., -1.)
def saw(f, d): return 2 * ((f * t_(d)) % 1) - 1
def tri(f, d): return 2 * np.abs(2 * ((f * t_(d)) % 1) - 1) - 1
def epiano(f, d): x = t_(d); m = np.sin(2 * np.pi * f * 2 * x) * 1.2 * np.exp(-x * 6); return np.sin(2 * np.pi * f * x + m) * env(len(x), .004, .6, .05, .08)
def marimba(f, d): x = t_(d); return (np.sin(2 * np.pi * f * x) + .35 * np.sin(2 * np.pi * f * 4 * x) * np.exp(-x * 30)) * env(len(x), .002, .18, 0, .02)
def pluck(f, d): return (square(f, d, .25) * .5 + tri(f, d) * .5) * env(int(SR * d), .002, .12, .0, .02)
def pad(f, d): x = saw(f * 1.003, d) + saw(f * .997, d) + .5 * saw(f / 2, d); return lp(x, 1400) * env(len(x), .35, 2, .7, .4) * .35
def bass(f, d): return lp(saw(f, d), 600) * env(int(SR * d), .005, .3, .4, .05)
def chip(f, d): return square(f, d, .5) * env(int(SR * d), .002, .15, .35, .03) * .6
def bell(f, d): x = t_(d); return (np.sin(2 * np.pi * f * x) + .5 * np.sin(2 * np.pi * f * 2.76 * x) + .25 * np.sin(2 * np.pi * f * 5.4 * x)) * np.exp(-x * 4) * env(len(x), .002, 9, 1, .05)
def noise(d): return rng.uniform(-1, 1, int(SR * d))
def kick(d=.3): x = t_(d); f = 120 * np.exp(-x * 25) + 45; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9)
def snare(d=.2): x = t_(d); return (lp(noise(d), 5000) * .7 + np.sin(2 * np.pi * 190 * x) * .4) * np.exp(-x * 22)
def hat(d=.05): n = noise(d); return (n - lp(n, 3000)) * np.exp(-t_(d) * 70) * .6
def place(buf, x, at):
    i = int(at * SR); j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i]
def reverb(x, mix=.22):
    y = x.copy()
    for dl, g in ((.031, .5), (.047, .42), (.071, .35), (.113, .28)):
        k = int(dl * SR); z = np.zeros_like(x); z[k:] = x[:-k] * g; y += z * mix * 2
    return y
def norm(x, peak=.85): return x / (np.max(np.abs(x)) + 1e-9) * peak
def save(name, x, br='64k'):
    x = norm(x); pcm = (x * 32767).astype(np.int16); tmp = f'/tmp/{name}.wav'
    with wave.open(tmp, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-b:a', br, os.path.join(OUT, name + '.mp3')], check=True); os.remove(tmp)
# ---- 곡 ----
def song(bpm, chords, melody, lead, comp, bassline=True, drums='pop', bars=8, swing=0):
    beat = 60 / bpm; L = bars * 4 * beat; buf = np.zeros(int(SR * (L + 2)))
    for b in range(bars):
        ch = chords[b % len(chords)]; t0 = b * 4 * beat
        if comp == 'pad': place(buf, sum(pad(hz(n), 4 * beat) for n in ch), t0)
        elif comp == 'epiano':
            for k in (0, 1.5, 2.5): place(buf, sum(epiano(hz(n), 1.4 * beat) for n in ch) * .28, t0 + k * beat)
        elif comp == 'arp':
            for k in range(8): place(buf, pluck(hz(ch[k % len(ch)]) * (2 if k >= 4 else 1), .5 * beat) * .35, t0 + k * .5 * beat)
        if bassline:
            root = ch[0][:-1] + str(int(ch[0][-1]) - 1)
            for k in (0, 2) if drums != 'march' else (0, 1, 2, 3): place(buf, bass(hz(root), beat * (1.6 if drums != 'march' else .9)) * .55, t0 + k * beat)
        for k in range(4):
            tt = t0 + k * beat
            if drums == 'pop':
                if k in (0, 2): place(buf, kick() * .8, tt)
                if k in (1, 3): place(buf, snare() * .45, tt)
                place(buf, hat() * .5, tt); place(buf, hat() * .35, tt + beat / 2 + swing)
            elif drums == 'soft':
                if k == 0: place(buf, kick() * .5, tt)
                place(buf, hat() * .25, tt + beat / 2)
            elif drums == 'march':
                place(buf, kick() * .7, tt) if k % 2 == 0 else place(buf, snare() * .5, tt)
                place(buf, snare() * .18, tt + beat * .75)
    # 멜로디: [(박 위치, 음, 길이(박))]
    for b in range(bars):
        for at, n, d in melody[b % len(melody)]:
            if n: place(buf, lead(hz(n), d * beat) * .5, (b * 4 + at) * beat)
    out = reverb(buf[:int(SR * L)] + 0)
    tail = buf[int(SR * L):int(SR * (L + 1))]; out[:len(tail)] += tail * .7  # 반복 이음새 자연스럽게
    return out
M = lambda s: [(float(a), n if n != '-' else None, float(d)) for a, n, d in (x.split(':') for x in s.split())]
BGM = {
 'bgm_2048_a': song(88, [['C4', 'E4', 'G4', 'B4'], ['A3', 'C4', 'E4', 'G4'], ['F3', 'A3', 'C4', 'E4'], ['G3', 'B3', 'D4', 'F4']],
   [M('0:E5:1 1:G5:1 2:B5:1.5 3.5:A5:.5'), M('0:G5:2 2:E5:1 3:C5:1'), M('0:A5:1 1:C6:1 2:A5:1 3:G5:1'), M('0:F5:1.5 1.5:G5:.5 2:D5:2')], marimba, 'epiano', drums='soft'),
 'bgm_2048_b': song(112, [['D4', 'F#4', 'A4'], ['B3', 'D4', 'F#4'], ['G3', 'B3', 'D4'], ['A3', 'C#4', 'E4']],
   [M('0:F#5:.5 .5:A5:.5 1:D6:1 2:C#6:.5 2.5:A5:.5 3:F#5:1'), M('0:B5:1 1:A5:.5 1.5:F#5:.5 2:D5:2'), M('0:G5:.5 .5:B5:.5 1:D6:1 2:B5:1 3:G5:1'), M('0:A5:1.5 1.5:C#6:.5 2:E6:2')], pluck, 'arp', drums='pop'),
 'bgm_merge_a': song(76, [['C4', 'G4', 'D5'], ['A3', 'E4', 'B4'], ['F3', 'C4', 'G4'], ['G3', 'D4', 'A4']],
   [M('0:G5:2 2:D6:2'), M('0:E5:3 3:B5:1'), M('0:C6:2 2:G5:2'), M('0:A5:4')], bell, 'pad', bassline=True, drums='none'),
 'bgm_merge_b': song(120, [['F4', 'A4', 'C5'], ['D4', 'F4', 'A4'], ['A#3', 'D4', 'F4'], ['C4', 'E4', 'G4']],
   [M('0:C6:.5 .5:A5:.5 1:F5:.5 1.5:A5:.5 2:C6:1 3:D6:1'), M('0:A5:1 1:F5:1 2:D5:2'), M('0:A#5:.5 .5:D6:.5 1:F6:1 2:D6:1 3:A#5:1'), M('0:G5:1 1:E5:1 2:C5:2')], marimba, 'arp', drums='pop', swing=.04),
 'bgm_sling_a': song(126, [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'], ['C4', 'E4', 'G4']],
   [M('0:G5:.5 .5:G5:.5 1:C6:1 2:G5:.5 2.5:E5:.5 3:G5:1'), M('0:A5:.5 .5:A5:.5 1:C6:1 2:A5:1 3:F5:1'), M('0:B5:.5 .5:D6:.5 1:G6:1 2:F6:.5 2.5:D6:.5 3:B5:1'), M('0:C6:2 2:G5:1 3:C6:1')], chip, 'none', drums='march'),
 'bgm_sling_b': song(118, [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['D3', 'F3', 'A3'], ['E3', 'G#3', 'B3']],
   [M('0:E5:.5 .5:E5:.5 1:A5:1 2:G5:.5 2.5:F5:.5 3:E5:1'), M('0:F5:1 1:E5:.5 1.5:D5:.5 2:C5:2'), M('0:D5:.5 .5:F5:.5 1:A5:1 2:G#5:1 3:F5:1'), M('0:E5:2 2:B4:1 3:G#4:1')], chip, 'pad', drums='march'),
}
for k, v in BGM.items(): save(k, v * .9, '56k')
# ---- 효과음 ----
def sweep(f0, f1, d, wave=np.sin):
    x = t_(d); f = f0 * (f1 / f0) ** (x / d); return wave(2 * np.pi * np.cumsum(f) / SR)
def boom(d=1.2):
    x = t_(d); return lp(noise(d), 900) * np.exp(-x * 4) * 1.2 + np.sin(2 * np.pi * np.cumsum(70 * np.exp(-x * 3) + 30) / SR) * np.exp(-x * 5)
SFX = {
 'move': lp(noise(.12), 2500) * env(int(SR * .12), .01, .05, 0, .03) * .5,
 'merge': (sine(523, .25) + .5 * sine(1046, .25)) * env(int(SR * .25), .003, .09, 0, .03),   # 단계별 음높이는 재생 속도로 조절
 'combo': sum(bell(hz(n), .5) * .5 for n in ('C6', 'E6', 'G6')) ,
 'big': np.concatenate([sum(bell(hz(n), .3) for n in ch) * .4 for ch in (('C5', 'E5'), ('E5', 'G5'), ('G5', 'C6'))] + [sum(bell(hz(n), 1.2) for n in ('C6', 'E6', 'G6', 'C7')) * .45]),
 'drop': sweep(500, 260, .12) * env(int(SR * .12), .002, .05, 0, .02),
 'pop': sweep(300, 900, .09) * env(int(SR * .09), .002, .04, 0, .01),
 'over': np.concatenate([marimba(hz(n), .32) for n in ('G4', 'E4', 'C4')] + [marimba(hz('C3'), .8)]),
 'win': np.concatenate([chip(hz(n), .14) for n in ('C5', 'E5', 'G5', 'C6')] + [chip(hz('C6'), .1), chip(hz('G5'), .1), sum(chip(hz(n), .7) for n in ('C6', 'E6', 'G6')) * .5]),
 'stretch': sweep(180, 260, .35, lambda p: np.sign(np.sin(p)) * .3 + np.sin(p) * .4) * env(int(SR * .35), .05, .3, .3, .05) * .5,
 'launch': lp(noise(.4), 3000) * np.linspace(1, 0, int(SR * .4)) * .6 + sweep(600, 200, .4) * env(int(SR * .4), .005, .15, 0, .05) * .4,
 'hit_wood': (lp(noise(.18), 1200) + sine(180, .18) * .6) * env(int(SR * .18), .001, .05, 0, .02),
 'hit_glass': sum(bell(f, .5) * .25 for f in (2100, 2830, 3350, 4100)) + (noise(.5) - lp(noise(.5), 4000)) * np.exp(-t_(.5) * 9) * .6,
 'hit_stone': (lp(noise(.25), 600) * 1.2 + sine(90, .25) * .7) * env(int(SR * .25), .001, .07, 0, .03),
 'boom': boom(),
 'squish': sweep(420, 140, .25, lambda p: np.sin(p) + .3 * np.sin(3 * p)) * env(int(SR * .25), .005, .1, .2, .05) * .8,
 'ability': sweep(400, 1600, .22, lambda p: np.sign(np.sin(p))) * env(int(SR * .22), .005, .12, .2, .03) * .3,
 'star': bell(hz('E6'), .9) * .7,
 'click': sine(1200, .04) * env(int(SR * .04), .001, .01, 0, .005) * .6,
 'level': np.concatenate([marimba(hz(n), .12) for n in ('C5', 'E5', 'G5', 'C6', 'E6')] + [bell(hz('G6'), 1)]),
}
for k, v in SFX.items(): save('sfx_' + k, v, '48k')
print('audio:', len(BGM), 'bgm,', len(SFX), 'sfx')
