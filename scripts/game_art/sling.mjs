// 팩트 새총 스프라이트: 새 4종, 가짜뉴스 고블린 3종(+다친 모습), 블록 재질 3종×금 간 단계 3, 가짜뉴스 상자, 새총, 월드 배경 3
const S = (w, h, inner, defs = '') => ({ w, h, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${inner}</svg>` });
const rg = (id, stops, cx = .38, cy = .32, r = .75) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
const lg = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const hl = `<ellipse cx="38" cy="30" rx="20" ry="12" fill="#fff" opacity=".35" transform="rotate(-25 38 30)"/>`;
// 새: 공통 눈(결연한 눈썹) + 부리
const eyes = (y = 42, brow = '#1a1a1a') => `<ellipse cx="44" cy="${y}" rx="9" ry="10" fill="#fff"/><ellipse cx="62" cy="${y}" rx="9" ry="10" fill="#fff"/><circle cx="47" cy="${y + 1}" r="4.5" fill="#111"/><circle cx="64" cy="${y + 1}" r="4.5" fill="#111"/>
  <path d="M33 ${y - 14} L54 ${y - 6}" stroke="${brow}" stroke-width="7" stroke-linecap="round"/><path d="M74 ${y - 14} L56 ${y - 6}" stroke="${brow}" stroke-width="7" stroke-linecap="round"/>`;
const beak = (y = 56) => `<path d="M48 ${y} L74 ${y + 4} L50 ${y + 14}Z" fill="#ffb020" stroke="#c77800" stroke-width="2" stroke-linejoin="round"/><path d="M50 ${y + 7} L72 ${y + 5}" stroke="#c77800" stroke-width="2"/>`;
// 돋보기 깃털(팩트체크 특공대 표식)
const lens = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="0" r="9" fill="#bfe8ff" fill-opacity=".7" stroke="#f4f6fb" stroke-width="4"/><path d="M6 6 L15 15" stroke="#6b4423" stroke-width="5" stroke-linecap="round"/></g>`;
function bird(body, belly, extra = '') {
  return S(96, 96, `<circle cx="50" cy="52" r="38" fill="url(#b)"/><ellipse cx="54" cy="72" rx="22" ry="15" fill="${belly}" opacity=".9"/>${hl}${extra}${eyes()}${beak()}${lens(22, 26, .8)}
    <path d="M14 58 C4 56 2 66 10 70 C4 74 10 82 18 76" fill="${body[2]}"/>`, rg('b', [[0, body[0]], [.6, body[1]], [1, body[2]]]));
}
// 고블린(가짜뉴스): 초록 몸, 뾰족 귀, 이마의 물음표
function goblin(r, crown = false, hurt = false) {
  const c = 48, y = 52;
  return S(96, 96, `<path d="M${c - r + 2} ${y - r * .4} L${c - r - 12} ${y - r * .9} L${c - r + 12} ${y - r * .1}Z" fill="#4fae3c"/><path d="M${c + r - 2} ${y - r * .4} L${c + r + 12} ${y - r * .9} L${c + r - 12} ${y - r * .1}Z" fill="#4fae3c"/>
   <circle cx="${c}" cy="${y}" r="${r}" fill="url(#g)"/>${hl}
   <text x="${c}" y="${y - r * .35}" font-family="Arial Black,Arial" font-weight="900" font-size="${r * .55}" fill="#2a6b1f" opacity=".7" text-anchor="middle">?</text>
   ${hurt ? `<path d="M${c - r * .55} ${y - r * .05} l${r * .3} ${r * .2} m0 -${r * .2} l-${r * .3} ${r * .2}" stroke="#14320f" stroke-width="4" stroke-linecap="round"/><ellipse cx="${c + r * .38}" cy="${y + r * .05}" rx="${r * .2}" ry="${r * .17}" fill="#fff"/><circle cx="${c + r * .4}" cy="${y + r * .08}" r="${r * .08}" fill="#111"/><ellipse cx="${c - r * .4}" cy="${y + r * .35}" rx="${r * .16}" ry="${r * .1}" fill="#7a3fa0" opacity=".55"/>`
      : `<ellipse cx="${c - r * .38}" cy="${y + r * .05}" rx="${r * .2}" ry="${r * .17}" fill="#fff"/><ellipse cx="${c + r * .38}" cy="${y + r * .05}" rx="${r * .2}" ry="${r * .17}" fill="#fff"/><circle cx="${c - r * .34}" cy="${y + r * .08}" r="${r * .08}" fill="#111"/><circle cx="${c + r * .42}" cy="${y + r * .08}" r="${r * .08}" fill="#111"/>`}
   <ellipse cx="${c}" cy="${y + r * .38}" rx="${r * .3}" ry="${r * .17}" fill="#3a8a2a"/><circle cx="${c - r * .1}" cy="${y + r * .38}" r="${r * .06}" fill="#173d10"/><circle cx="${c + r * .1}" cy="${y + r * .38}" r="${r * .06}" fill="#173d10"/>
   <path d="M${c - r * .4} ${y + r * .62} Q${c} ${y + r * .8} ${c + r * .4} ${y + r * .62}" stroke="#173d10" stroke-width="3" fill="${hurt ? 'none' : '#fff'}"/>
   ${crown ? `<path d="M${c - 22} ${y - r + 4} L${c - 26} ${y - r - 22} L${c - 11} ${y - r - 8} L${c} ${y - r - 28} L${c + 11} ${y - r - 8} L${c + 26} ${y - r - 22} L${c + 22} ${y - r + 4}Z" fill="url(#cr)" stroke="#a86b00" stroke-width="2" stroke-linejoin="round"/><circle cx="${c}" cy="${y - r - 8}" r="4" fill="#e3242b"/>` : ''}`,
   rg('g', [[0, '#b6f28c'], [.6, '#5fbf45'], [1, '#2f7a22']]) + lg('cr', [[0, '#fff2a0'], [1, '#e0a400']]));
}
// 블록 재질 텍스처(64×64) + 금 간 단계
const cracks = n => ['', '<path d="M20 4 L28 22 L22 34 L34 48" stroke="#000" stroke-opacity=".55" stroke-width="2.5" fill="none"/>',
  '<path d="M20 4 L28 22 L22 34 L34 48 L30 62 M28 22 L46 26 L58 14 M22 34 L8 44" stroke="#000" stroke-opacity=".65" stroke-width="3" fill="none"/>'][n];
function block(mat, n) {
  if (mat === 'wood') return S(64, 64, `<rect width="64" height="64" rx="4" fill="url(#w)"/>${[12, 26, 40, 54].map((y, i) => `<path d="M0 ${y} C20 ${y - 3 + i} 44 ${y + 3} 64 ${y - 1}" stroke="#8a4f1c" stroke-width="2" opacity=".5" fill="none"/>`).join('')}
    <ellipse cx="44" cy="34" rx="5" ry="3" fill="#7a4216" opacity=".6"/><rect x="2" y="2" width="60" height="60" rx="4" fill="none" stroke="#6b3a12" stroke-width="4"/>${cracks(n)}`, lg('w', [[0, '#f0b46a'], [1, '#c77a32']]));
  if (mat === 'glass') return S(64, 64, `<rect width="64" height="64" rx="4" fill="url(#gl)"/><path d="M8 52 L52 8 M18 58 L58 18" stroke="#fff" stroke-width="5" opacity=".55"/><rect x="2" y="2" width="60" height="60" rx="4" fill="none" stroke="#e8fbff" stroke-width="4"/>${cracks(n).replace('#000', '#ffffff').replace('.55', '.9').replace('.65', '.95')}`, lg('gl', [[0, 'rgba(190,240,255,.85)'], [1, 'rgba(110,200,235,.75)']]));
  return S(64, 64, `<rect width="64" height="64" rx="4" fill="url(#st)"/><path d="M0 22 L64 20 M0 44 L64 46 M22 0 L20 22 M44 22 L46 44 M18 44 L20 64" stroke="#5f6675" stroke-width="2.5" opacity=".6"/>
    <circle cx="40" cy="10" r="3" fill="#5f6675" opacity=".4"/><circle cx="12" cy="34" r="2.5" fill="#5f6675" opacity=".4"/><rect x="2" y="2" width="60" height="60" rx="4" fill="none" stroke="#4a505d" stroke-width="4"/>${cracks(n)}`, lg('st', [[0, '#c6ccd8'], [1, '#8a92a3']]));
}
// 월드 배경(1024×576)
const hills = (y, col, amp, seed) => { let d = `M0 576 L0 ${y}`; for (let x = 0; x <= 1024; x += 64) d += ` Q${x + 32} ${y - amp * (0.6 + 0.4 * Math.sin(x * .013 + seed))} ${x + 64} ${y - amp * .2 * Math.cos(x * .02 + seed)}`; return `<path d="${d} L1024 576Z" fill="${col}"/>` };
const cloud = (x, y, s, op = .9) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity="${op}"><circle cx="0" cy="0" r="28"/><circle cx="30" cy="-12" r="34"/><circle cx="66" cy="0" r="26"/><rect x="0" y="0" width="66" height="26"/></g>`;
const skyline = (y, col, seed) => { let d = ''; let x = 0, i = 0; while (x < 1024) { const w = 40 + (i * 37 + seed) % 50, h = 60 + (i * 53 + seed) % 140; d += `<rect x="${x}" y="${y - h}" width="${w}" height="${h + 200}" fill="${col}"/>`; for (let wy = y - h + 14; wy < y - 10; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 16) if ((wx * 7 + wy * 3 + seed) % 5 < 2) d += `<rect x="${wx}" y="${wy}" width="7" height="10" fill="#ffd56a" opacity=".75"/>`; x += w + 6; i++ } return d };
const BG = {
  bg1: S(1024, 576, `<rect width="1024" height="576" fill="url(#sky)"/><circle cx="840" cy="110" r="60" fill="#fff6c4"/><circle cx="840" cy="110" r="90" fill="#fff6c4" opacity=".25"/>${cloud(120, 110, 1)}${cloud(470, 70, .8)}${cloud(700, 170, .6, .7)}
    ${hills(400, '#a7dc8a', 70, 1)}${hills(450, '#7cc463', 50, 3)}<rect y="500" width="1024" height="76" fill="#8a5a2b"/><rect y="496" width="1024" height="10" fill="#5fae3c"/>`, lg('sky', [[0, '#7fc8ff'], [1, '#e0f4ff']])),
  bg2: S(1024, 576, `<rect width="1024" height="576" fill="url(#sky)"/><circle cx="760" cy="300" r="80" fill="#ffd27a" opacity=".9"/>${cloud(80, 120, 1, .5)}${cloud(560, 90, .9, .45)}
    ${skyline(430, '#5a4a7a', 11)}${skyline(470, '#3d3260', 29)}<rect y="500" width="1024" height="76" fill="#4a4060"/><rect y="496" width="1024" height="8" fill="#6a5d8a"/>`, lg('sky', [[0, '#ff9a6a'], [.6, '#ffc58a'], [1, '#ffe3b0']])),
  bg3: S(1024, 576, `<rect width="1024" height="576" fill="url(#sky)"/>${Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 173 + i * i * 7) % 1024}" cy="${(i * 97 + i * i * 13) % 300}" r="${1 + i % 3 * .6}" fill="#fff" opacity="${.4 + (i % 4) * .15}"/>`).join('')}<circle cx="160" cy="100" r="42" fill="#f4f1d8"/>
    ${[[600, 220], [700, 180], [820, 240]].map(([x, h]) => `<rect x="${x}" y="${470 - h}" width="34" height="${h}" fill="#2a2440"/><rect x="${x - 4}" y="${470 - h}" width="42" height="10" fill="#3a3256"/>
      <circle cx="${x + 17}" cy="${450 - h}" r="26" fill="#6a6380" opacity=".55"/><circle cx="${x + 34}" cy="${420 - h}" r="34" fill="#6a6380" opacity=".4"/><circle cx="${x + 56}" cy="${385 - h}" r="40" fill="#6a6380" opacity=".25"/>`).join('')}
    <path d="M420 470 L420 380 L480 410 L480 380 L540 410 L540 380 L600 410 L600 470Z" fill="#2a2440"/>${skyline(470, '#1f1a33', 7)}<rect y="500" width="1024" height="76" fill="#2b2638"/><rect y="496" width="1024" height="8" fill="#4a3f5e"/>`, lg('sky', [[0, '#0f1030'], [1, '#3a2a5e']]))
};
export const SLING = {
  bird_red: bird(['#ff8a7a', '#e3242b', '#8f0a17'], '#ffd9c2'),
  bird_yellow: bird(['#fff3a0', '#ffcc1a', '#b88a00'], '#fff8dc', `<path d="M40 16 L50 2 L58 18" fill="#ffcc1a"/>`),
  bird_black: bird(['#6b7080', '#262a35', '#0b0d12'], '#4a4f5c', `<path d="M58 14 C62 4 72 2 76 8" stroke="#8a6b3a" stroke-width="4" fill="none"/><circle cx="77" cy="8" r="5" fill="#ffb020"/><circle cx="77" cy="8" r="2.5" fill="#fff6c4"/>`),
  bird_blue: bird(['#a8dcff', '#3f9cff', '#1a5ab8'], '#e6f4ff'),
  gob_s: goblin(28), gob_s_hurt: goblin(28, false, true), gob_m: goblin(36), gob_m_hurt: goblin(36, false, true), gob_k: goblin(36, true), gob_k_hurt: goblin(36, true, true),
  tnt: S(64, 64, `<rect width="64" height="64" rx="6" fill="#c8231e"/><rect x="4" y="4" width="56" height="56" rx="4" fill="none" stroke="#7a0e0a" stroke-width="4"/><rect x="0" y="22" width="64" height="20" fill="#ffcf1a"/>
    <text x="32" y="38" font-family="Pretendard,Arial Black,sans-serif" font-weight="900" font-size="15" fill="#7a0e0a" text-anchor="middle">가짜뉴스</text><path d="M4 4 L60 60 M60 4 L4 60" stroke="#7a0e0a" stroke-width="3" opacity=".25"/>`),
  slingshot: S(80, 170, `<path d="M36 170 L36 80 L10 20 M44 80 L70 20 M36 80 L44 80 L44 170" stroke="url(#wd)" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="28" y="96" width="24" height="14" rx="3" fill="#6b3a12"/>`, lg('wd', [[0, '#c98a4b'], [1, '#7a4520']], 1, 0)),
  ...BG
};
for (const m of ['wood', 'glass', 'stone']) for (let n = 0; n < 3; n++) SLING[`${m}_${n}`] = block(m, n);
