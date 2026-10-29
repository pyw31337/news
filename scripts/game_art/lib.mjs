// 게임·배지 그림 공용 도구: Tabler 아이콘 받기, 3D 광택 엠블럼 SVG, Chromium으로 PNG 렌더
// 사용: node scripts/game_art/build.mjs  (Playwright 필요. 결과는 games/assets/ 와 scratch 폴더)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');

const CACHE = process.env.TABLER_CACHE || '/tmp/tabler-cache';
const TABLER = 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/';
export async function tabler(name) {
  const filled = name.startsWith('f-'), n = filled ? name.slice(2) : name;
  const f = path.join(CACHE, name + '.svg');
  if (!fs.existsSync(f)) {
    fs.mkdirSync(CACHE, { recursive: true });
    const r = await fetch(TABLER + (filled ? 'filled/' : 'outline/') + n + '.svg');
    if (!r.ok) throw new Error('tabler ' + name);
    fs.writeFileSync(f, await r.text());
  }
  return fs.readFileSync(f, 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, '');
}
export const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

// 3D 광택 아이콘: 뒤로 밀린 두께(압출) + 위가 밝은 앞면 + 반투명 몸통 + 하이라이트 + 그림자
export function emblem(inner, c, { filled = false, ext, size = 512, sw = 3.1, body = true } = {}) {
  const light = mix(c, '#ffffff', .55), dark = ext || mix(c, '#000000', .45), deep = mix(dark, '#000000', .4);
  const paint = (stroke, fill, w, bodyFill) => filled
    ? `fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"`
    : `fill="${bodyFill || 'none'}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const w = filled ? .6 : sw;
  let ext3 = ''; for (let i = 7; i >= 1; i--) ext3 += `<g transform="translate(${i * .03} ${i * .11})" ${paint(i > 4 ? deep : dark, i > 4 ? deep : dark, w)}>${inner}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.5 -1.5 27 27" width="${size}" height="${size}">
  <defs>
   <linearGradient id="g" x1="0" y1="2" x2="0" y2="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${light}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, '#000000', .25)}"/></linearGradient>
   <radialGradient id="sp" cx="8" cy="5" r="12" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
   <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation=".55"/><feOffset dy="1.1" result="b"/><feFlood flood-color="#000" flood-opacity=".5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   <mask id="m"><g ${paint('#fff', '#fff', filled ? .01 : sw)}>${inner}</g></mask>
  </defs>
  <g filter="url(#sh)">
   ${ext3}
   ${filled || !body ? '' : `<g fill="${mix(c, '#ffffff', .2)}" fill-opacity=".38" stroke="none">${inner}</g>`}
   <g ${paint('url(#g)', 'url(#g)', filled ? .01 : sw)}>${inner}</g>
   <rect x="-2" y="-2" width="28" height="28" fill="url(#sp)" mask="url(#m)" opacity=".75"/>
   <g transform="translate(-.18 -.26)" mask="url(#m)" ${paint('#ffffff', 'none', filled ? .5 : .55)} opacity=".55">${inner}</g>
  </g></svg>`;
}

// SVG 문자열 목록을 PNG로 렌더(투명 배경). items: [{file, svg, w, h}]
export async function render(items) {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const it of items) {
    const w = it.w || 512, h = it.h || w;
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><body style="margin:0;background:transparent">${it.svg}</body></html>`);
    fs.mkdirSync(path.dirname(it.file), { recursive: true });
    await p.screenshot({ path: it.file, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  }
  await b.close();
}
