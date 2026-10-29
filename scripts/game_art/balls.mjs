// 머지 게임 공 그림(256px). 몸통 반지름 R=118 기준, 고리·광채가 있는 천체는 몸통을 줄여 그림 안에 맞춤(BODY 비율을 게임이 사용)
const C = 128;
let uid = 0; const id = p => p + (++uid);
const svg = (inner, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs>${defs}</defs>${inner}</svg>`;
// 공통 입체감: 위 왼쪽 하이라이트 + 아래 오른쪽 그늘
function shade(r, k = 1) {
  const a = id('hl'), b = id('dk'), cl = id('cl');
  return {
    defs: `<radialGradient id="${a}" cx=".36" cy=".3" r=".55"><stop offset="0" stop-color="#fff" stop-opacity="${.75 * k}"/><stop offset=".35" stop-color="#fff" stop-opacity="${.18 * k}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="${b}" cx=".5" cy=".5" r=".5"><stop offset=".68" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${.38 * k}"/></radialGradient>
      <clipPath id="${cl}"><circle cx="${C}" cy="${C}" r="${r}"/></clipPath>`,
    over: `<circle cx="${C}" cy="${C}" r="${r}" fill="url(#${b})"/><circle cx="${C}" cy="${C}" r="${r}" fill="url(#${a})"/>`,
    clip: cl
  };
}
const ball = (r, base, inner = '', extraDefs = '', k = 1) => { const s = shade(r, k); return svg(`<circle cx="${C}" cy="${C}" r="${r}" fill="${base}"/><g clip-path="url(#${s.clip})">${inner}</g>${s.over}`, s.defs + extraDefs) };
const rg = (gid, stops, cx = .4, cy = .35, r = .7) => `<radialGradient id="${gid}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
const craters = (list, col = '#000', op = .18) => list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${op}"/><circle cx="${x - r * .18}" cy="${y - r * .2}" r="${r * .8}" fill="#fff" opacity="${op * .45}"/>`).join('');
const face = (y = 150, s = 1, eye = '#2a1a12') => `<g transform="translate(${C} ${y}) scale(${s})">
  <ellipse cx="-30" cy="0" rx="9" ry="12" fill="${eye}"/><ellipse cx="30" cy="0" rx="9" ry="12" fill="${eye}"/>
  <circle cx="-27" cy="-4" r="3.6" fill="#fff"/><circle cx="33" cy="-4" r="3.6" fill="#fff"/>
  <path d="M-12 16 Q0 28 12 16" fill="none" stroke="${eye}" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="-50" cy="16" rx="13" ry="7" fill="#ff6f7d" opacity=".45"/><ellipse cx="50" cy="16" rx="13" ry="7" fill="#ff6f7d" opacity=".45"/></g>`;

/* ---------- 태양계 ---------- */
export const SPACE = [
  () => { const g = id('g'); return svg(`<path d="M40 120 C30 70 80 34 128 38 C180 30 228 70 220 118 C232 168 196 214 140 220 C84 228 30 186 40 120Z" fill="url(#${g})"/>${craters([[95, 95, 18], [160, 140, 24], [120, 175, 12], [175, 85, 10], [80, 160, 9]], '#2a2118', .28)}
    <path d="M60 90 C80 60 120 50 150 52" stroke="#fff" stroke-opacity=".35" stroke-width="8" fill="none" stroke-linecap="round"/>`, rg(g, [[0, '#a99b8a'], [.6, '#7a6c5c'], [1, '#4e4337']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<path d="M150 130 C150 112 172 108 178 124 C184 108 206 112 204 130 C202 152 178 166 178 166 C178 166 152 152 150 130Z" fill="#fff4e0" opacity=".85"/>${craters([[80, 90, 14], [100, 170, 10], [70, 140, 8]], '#5a4030', .22)}`, rg(g, [[0, '#e9d3b4'], [1, '#a98563']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<path d="M40 110 C70 90 100 120 90 150 C80 180 40 170 30 150Z" fill="#8f949c" opacity=".55"/><path d="M150 60 C180 50 210 80 190 100 C170 120 140 90 150 60Z" fill="#8f949c" opacity=".5"/>${craters([[160, 150, 20], [110, 80, 14], [190, 120, 10], [100, 190, 12], [150, 200, 8]], '#3a3d44', .25)}`, rg(g, [[0, '#f4f5f7'], [1, '#a9adb5']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, craters([[90, 80, 16], [150, 110, 22], [110, 160, 14], [180, 170, 12], [70, 140, 10], [140, 60, 8], [190, 80, 9]], '#2b2420', .3), rg(g, [[0, '#c9b8a6'], [1, '#6f625a']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<path d="M20 120 C60 100 90 140 130 120 C170 100 200 140 240 120 L240 170 C200 160 160 190 120 170 C80 150 50 180 20 165Z" fill="#7a2d16" opacity=".45"/>
    <path d="M60 70 C90 60 110 85 95 100 C80 112 55 95 60 70Z" fill="#7a2d16" opacity=".4"/><ellipse cx="128" cy="16" rx="56" ry="22" fill="#fff" opacity=".85"/>`, rg(g, [[0, '#f29a6b'], [.6, '#cf5a2c'], [1, '#8a3216']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<path d="M0 90 C60 70 120 110 256 80" stroke="#fff3c9" stroke-width="22" fill="none" opacity=".45"/><path d="M0 150 C80 130 150 175 256 140" stroke="#c98a2e" stroke-width="18" fill="none" opacity=".35"/><path d="M0 190 C70 175 160 210 256 185" stroke="#fff3c9" stroke-width="14" fill="none" opacity=".35"/>`, rg(g, [[0, '#fff0c2'], [.6, '#e9bf6a'], [1, '#b07a2a']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<path d="M60 70 C90 50 130 70 120 100 C110 125 140 140 120 165 C100 185 70 160 60 130 C50 105 40 85 60 70Z" fill="#3fae4f"/>
    <path d="M160 60 C190 55 215 80 205 110 C195 130 170 120 165 100 C160 85 145 70 160 60Z" fill="#3fae4f"/><path d="M150 160 C175 150 205 165 195 195 C185 215 155 210 145 190 C140 178 140 166 150 160Z" fill="#58c060"/>
    <path d="M30 105 C80 95 120 110 170 95" stroke="#fff" stroke-width="10" fill="none" opacity=".7" stroke-linecap="round"/><path d="M90 200 C130 190 170 205 220 190" stroke="#fff" stroke-width="9" fill="none" opacity=".65" stroke-linecap="round"/>`, rg(g, [[0, '#7fd0ff'], [.6, '#2f7fe0'], [1, '#174a9c']])) },
  () => { const g = id('g'), s = shade(92); return svg(`<circle cx="128" cy="128" r="92" fill="url(#${g})"/><g clip-path="url(#${s.clip})"><path d="M0 120 L256 112 L256 140 L0 148Z" fill="#fff" opacity=".18"/></g>${s.over}
    <ellipse cx="128" cy="128" rx="20" ry="112" fill="none" stroke="#e6fbff" stroke-width="4" opacity=".55" transform="rotate(14 128 128)"/>`, s.defs + rg(g, [[0, '#d9fbff'], [.6, '#8fdfe8'], [1, '#4aa8b8']])) },
  () => { const g = id('g'), s = shade(80), rr = id('r'), fr = id('f'); const ring = `<ellipse cx="128" cy="128" rx="122" ry="34" fill="none" stroke="url(#${rr})" stroke-width="16" transform="rotate(-14 128 128)"/>`;
    return svg(`${ring}<circle cx="128" cy="128" r="80" fill="url(#${g})"/><g clip-path="url(#${s.clip})"><path d="M0 100 L256 92 L256 110 L0 118Z" fill="#fff6dc" opacity=".45"/><path d="M0 140 L256 132 L256 150 L0 158Z" fill="#b38a4a" opacity=".35"/><path d="M0 170 L256 162 L256 175 L0 183Z" fill="#fff6dc" opacity=".35"/></g>${s.over}
    <g clip-path="url(#${fr})">${ring}</g>`, s.defs + rg(g, [[0, '#ffeac0'], [.6, '#e3bf7c'], [1, '#a67c3a']]) + `<linearGradient id="${rr}" x1="0" x2="1"><stop offset="0" stop-color="#c9a76a"/><stop offset=".5" stop-color="#fff0c8"/><stop offset="1" stop-color="#b8945a"/></linearGradient><clipPath id="${fr}"><rect x="0" y="128" width="256" height="128" transform="rotate(-14 128 128)"/></clipPath>`) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, [[50, '#fff2dc', 16], [80, '#c27a45', 14], [105, '#f3dcbc', 12], [130, '#b46a3a', 16], [158, '#f6e2c4', 12], [182, '#c78a5a', 14], [208, '#f1d9b8', 12]].map(([y, c, w]) => `<path d="M0 ${y} C80 ${y - 6} 170 ${y + 6} 256 ${y - 2}" stroke="${c}" stroke-width="${w}" fill="none" opacity=".75"/>`).join('') + `<ellipse cx="165" cy="160" rx="24" ry="14" fill="#c8452a" opacity=".85"/>`, rg(g, [[0, '#f7e3c8'], [1, '#b98454']])) },
  () => { const g = id('g'), gl = id('gl'), s = shade(96, .6); return svg(`<circle cx="128" cy="128" r="126" fill="url(#${gl})"/><circle cx="128" cy="128" r="96" fill="url(#${g})"/>
    <g clip-path="url(#${s.clip})">${[[90, 90, 10], [150, 120, 14], [110, 160, 9], [170, 80, 7], [80, 140, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ff7a00" opacity=".35"/>`).join('')}</g>${s.over}`,
    s.defs + rg(g, [[0, '#fffbd0'], [.45, '#ffd23a'], [1, '#ff8a00']]) + rg(gl, [[.7, '#ffcf3a'], [.78, 'rgba(255,170,0,.45)'], [1, 'rgba(255,140,0,0)']], .5, .5, .5)) }
];
export const SPACE_BODY = [1, 1, 1, 1, 1, 1, 1, 92 / 118, 80 / 118, 1, 96 / 118];

/* ---------- 스포츠 공 ---------- */
const seam = (d, col, w = 5) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
const stitches = (d, col) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="9" stroke-dasharray="3 9" stroke-linecap="round"/>`;
export const BALL = [
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<path d="M60 170 C80 110 140 150 160 90 C170 60 200 70 210 100" stroke="#ff5a7a" stroke-width="22" fill="none" opacity=".85" stroke-linecap="round"/><path d="M50 120 C80 90 110 130 140 110" stroke="#ffd23a" stroke-width="12" fill="none" opacity=".8" stroke-linecap="round"/>`, rg(g, [[0, '#d8f4ff'], [.7, '#5fb6f0'], [1, '#2a6fb8']]), 1.2) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<path d="M20 128 C70 100 186 156 236 128" stroke="#ffffff" stroke-width="4" fill="none" opacity=".5"/><text x="128" y="170" font-family="Arial Black,Arial" font-weight="900" font-size="40" fill="#c94a00" opacity=".55" text-anchor="middle">★★★</text>`, rg(g, [[0, '#ffd2a6'], [.7, '#ff8a2a'], [1, '#d35a00']])) },
  () => { const g = id('g'); let d = ''; for (let y = 22; y < 240; y += 22) for (let x = 22 + (y / 22 % 2) * 11; x < 240; x += 22) d += `<circle cx="${x}" cy="${y}" r="7" fill="#9aa3b5" opacity=".28"/>`; return ball(118, `url(#${g})`, d, rg(g, [[0, '#ffffff'], [.7, '#eef1f6'], [1, '#b8bfcc']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<circle cx="128" cy="112" r="50" fill="#fff"/><text x="128" y="136" font-family="Arial Black,Arial" font-weight="900" font-size="64" fill="#111" text-anchor="middle">8</text>`, rg(g, [[0, '#5a5f6e'], [.6, '#1b1e26'], [1, '#000']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, seam('M30 60 C110 110 110 150 30 200', '#fff', 10) + seam('M226 60 C146 110 146 150 226 200', '#fff', 10), rg(g, [[0, '#f4ff8a'], [.7, '#c6e021'], [1, '#86a00e']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, seam('M40 50 C110 100 110 160 40 210', '#d33a3a', 4) + stitches('M50 50 C118 100 118 160 50 210', '#d33a3a') + seam('M216 50 C146 100 146 160 216 210', '#d33a3a', 4) + stitches('M206 50 C138 100 138 160 206 210', '#d33a3a'), rg(g, [[0, '#ffffff'], [.7, '#f1ede4'], [1, '#c7bfae']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, seam('M40 50 C110 100 110 160 40 210', '#c8231e', 4) + stitches('M50 50 C118 100 118 160 50 210', '#c8231e') + seam('M216 50 C146 100 146 160 216 210', '#c8231e', 4) + stitches('M206 50 C138 100 138 160 206 210', '#c8231e'), rg(g, [[0, '#fbff9a'], [.7, '#e9f02a'], [1, '#a8ad10']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<path d="M128 10 L180 60 L160 128 L96 128 L76 60Z" fill="#2459d6"/><path d="M160 128 L230 150 L210 220 L150 200Z" fill="#e33a3a"/><path d="M96 128 L26 150 L46 220 L106 200Z" fill="#e33a3a"/><path d="M106 200 L150 200 L170 256 L86 256Z" fill="#2459d6"/>`
    + seam('M128 10 L180 60 L160 128 L96 128 L76 60Z M160 128 L230 150 M96 128 L26 150 M106 200 L150 200', '#1a1f33', 3), rg(g, [[0, '#ffffff'], [1, '#d8dde8']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<path d="M128 10 C60 60 40 140 70 236 L110 240 C80 150 100 70 160 18Z" fill="#1d5fd1"/><path d="M246 110 C180 90 110 120 60 210 L90 236 C130 160 190 140 250 150Z" fill="#ffcf1a"/>`
    + seam('M128 10 C60 60 40 140 70 236 M160 18 C100 70 80 150 110 240 M246 110 C180 90 110 120 60 210 M250 150 C190 140 130 160 90 236', '#1a2240', 3), rg(g, [[0, '#ffffff'], [1, '#d9dde6']])) },
  () => { const g = id('g'); const pent = (x, y, r) => `<path d="${[0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return (i ? 'L' : 'M') + (x + r * Math.cos(a)).toFixed(1) + ' ' + (y + r * Math.sin(a)).toFixed(1) }).join(' ')}Z" fill="#14161c"/>`;
    return ball(118, `url(#${g})`, pent(128, 128, 34) + pent(128, 30, 26) + pent(40, 96, 26) + pent(216, 96, 26) + pent(70, 205, 26) + pent(186, 205, 26)
      + seam('M128 94 L128 56 M96 118 L62 104 M160 118 L194 104 M108 156 L84 186 M148 156 L172 186', '#2a2d36', 3), rg(g, [[0, '#ffffff'], [.7, '#eceef3'], [1, '#b8bdc9']])) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, seam('M128 8 L128 248 M8 128 L248 128', '#2a1206', 7) + seam('M48 30 C100 90 100 166 48 226 M208 30 C156 90 156 166 208 226', '#2a1206', 7), rg(g, [[0, '#ffb57a'], [.6, '#f2731c'], [1, '#b04a08']])) }
];

/* ---------- 과일 (얼굴) ---------- */
const leaf = (x, y, rot = -30, s = 1, col = '#3fae4f') => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 C20 -26 56 -24 70 0 C56 22 20 24 0 0Z" fill="${col}"/><path d="M4 0 L62 0" stroke="#2a7d36" stroke-width="3"/></g>`;
const stem = (x, y, h = 30) => `<path d="M${x} ${y} C${x + 4} ${y - h * .5} ${x + 12} ${y - h} ${x + 18} ${y - h}" stroke="#6b4423" stroke-width="9" fill="none" stroke-linecap="round"/>`;
export const FRUIT = [
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<path d="M104 26 L116 48 L128 22 L140 48 L152 26 L148 56 L108 56Z" fill="#1d2a5c" opacity=".8"/>` + face(150, .9, '#0f1630'), rg(g, [[0, '#8fa6ff'], [.6, '#3f5ad6'], [1, '#1d2a7a']])) },
  () => { const g = id('g'); return svg(`<circle cx="128" cy="140" r="108" fill="url(#${g})"/>${stem(124, 40, 40)}${leaf(140, 12, -10, .8)}${shade(108).over.replace(/cy="128"/g, 'cy="140"')}${face(160, .85)}`, shade(108).defs + rg(g, [[0, '#ff8a8a'], [.6, '#e3202f'], [1, '#8f0a17']])) },
  () => { const g = id('g'); let seeds = ''; for (let i = 0; i < 26; i++) { const x = 50 + (i * 37) % 160, y = 70 + Math.floor(i / 5) * 32 + (i % 2) * 8; seeds += `<ellipse cx="${x}" cy="${y}" rx="4" ry="6" fill="#ffe08a"/>` }
    const sp = id('sp'); return svg(`<path d="M128 240 C60 210 20 150 26 100 C32 60 70 48 128 54 C186 48 224 60 230 100 C236 150 196 210 128 240Z" fill="url(#${g})"/><g clip-path="url(#${sp})">${seeds}</g><path d="M70 58 C90 30 110 50 128 30 C146 50 166 30 186 58 C160 70 96 70 70 58Z" fill="#3fae4f"/>${face(130, .85)}`, rg(g, [[0, '#ff8f8f'], [.6, '#f02a3a'], [1, '#a50f1c']]) + `<clipPath id="${sp}"><path d="M128 232 C64 204 30 150 34 104 C40 70 74 60 128 64 C182 60 216 70 222 104 C226 150 192 204 128 232Z"/></clipPath>`) },
  () => { const g = id('g'); return ball(118, `url(#${g})`, `<path d="M128 14 C110 80 112 170 128 242" stroke="#5a1340" stroke-width="5" fill="none" opacity=".35"/><circle cx="128" cy="128" r="118" fill="#fff" opacity=".08"/>` + face(150, .95, '#2a0a1e'), rg(g, [[0, '#d68ad9'], [.6, '#8f2d8a'], [1, '#4f0f4c']])) },
  () => { const g = id('g'); let dots = ''; for (let i = 0; i < 70; i++) dots += `<circle cx="${(i * 53) % 236 + 10}" cy="${(i * 31) % 236 + 10}" r="2.2" fill="#b85a00" opacity=".25"/>`;
    return ball(118, `url(#${g})`, dots + leaf(128, 14, -20, .7) + face(150), rg(g, [[0, '#ffd08a'], [.6, '#ff9418'], [1, '#d06200']])) },
  () => { const g = id('g'); return svg(`<path d="M128 46 C80 20 20 50 20 120 C20 190 70 240 128 236 C186 240 236 190 236 120 C236 50 176 20 128 46Z" fill="url(#${g})"/>${stem(124, 50, 34)}${leaf(140, 30, -20, .7)}<path d="M60 90 C70 70 90 62 104 64" stroke="#fff" stroke-width="10" fill="none" opacity=".45" stroke-linecap="round"/>${face(145)}`, rg(g, [[0, '#ff8a7a'], [.6, '#e3242b'], [1, '#9a0f16']])) },
  () => { const g = id('g'); let dots = ''; for (let i = 0; i < 80; i++) dots += `<circle cx="${(i * 47) % 236 + 10}" cy="${(i * 29) % 236 + 10}" r="2.4" fill="#c8402a" opacity=".2"/>`;
    return ball(118, `url(#${g})`, dots + face(150), rg(g, [[0, '#ffd0a8'], [.6, '#ff8a5a'], [1, '#d04a2a']])) },
  () => { const g = id('g'); let fib = ''; for (let i = 0; i < 60; i++) { const x = (i * 41) % 230 + 12, y = (i * 23) % 230 + 12; fib += `<path d="M${x} ${y} l${8 - (i % 5) * 3} ${6}" stroke="#3a2210" stroke-width="3" opacity=".35"/>` }
    return ball(118, `url(#${g})`, fib + `<circle cx="104" cy="70" r="9" fill="#2a1608"/><circle cx="128" cy="58" r="9" fill="#2a1608"/><circle cx="152" cy="70" r="9" fill="#2a1608"/>` + face(160, 1, '#f7e7d0'), rg(g, [[0, '#b98a5e'], [.6, '#7a4f2a'], [1, '#3f2410']])) },
  () => { const g = id('g'); let net = ''; for (let i = -6; i < 7; i++) net += seam(`M${128 + i * 30} 0 C${128 + i * 30 + 40} 80 ${128 + i * 30 - 30} 170 ${128 + i * 30 + 20} 256`, '#f2f7d0', 3) + seam(`M0 ${128 + i * 30} C80 ${128 + i * 30 + 30} 170 ${128 + i * 30 - 30} 256 ${128 + i * 30 + 10}`, '#f2f7d0', 3);
    return ball(118, `url(#${g})`, `<g opacity=".65">${net}</g>` + face(150), rg(g, [[0, '#d9f29a'], [.6, '#8cc63f'], [1, '#4d8a1c']])) },
  () => { const g = id('g'); let st = ''; for (let i = -4; i <= 4; i++) st += `<path d="M${128 + i * 30} 0 C${128 + i * 36 + 14} 70 ${128 + i * 36 - 14} 180 ${128 + i * 30} 256" stroke="#1f5a1c" stroke-width="16" fill="none" stroke-linejoin="round"/>`;
    return ball(118, `url(#${g})`, st + face(150, 1.05, '#10260e'), rg(g, [[0, '#a6e36a'], [.6, '#3f9a32'], [1, '#1d5a17']])) }
];
