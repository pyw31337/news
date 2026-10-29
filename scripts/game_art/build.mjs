// 게임 스프라이트 빌드: node scripts/game_art/build.mjs → games/assets/{2048,merge,sling}/*.png
// 이후 python3 scripts/game_art/webp.py 로 WebP 변환(용량 절약)
import fs from 'fs';
import vm from 'vm';
import { tabler, emblem, render, mix } from './lib.mjs';
import { SPACE, BALL, FRUIT } from './balls.mjs';
import { SLING } from './sling.mjs';
const ROOT = new URL('../../', import.meta.url).pathname;
const ctx = {}; vm.runInNewContext(fs.readFileSync(ROOT + 'games/data.js', 'utf8'), ctx);
const { STAGE, L2048 } = ctx.NBG_DATA;
const only = process.argv[2];
const items = [];
if (!only || only === '2048') for (const L of L2048) for (let k = 0; k < L.steps.length; k++) {
  const [, icon] = L.steps[k];
  // 타일 위에 놓일 흰색 광택 아이콘, 두께(압출)는 단계 색의 어두운 톤
  items.push({ file: `${ROOT}games/assets/2048/${L.id}-${k + 1}.png`, w: 192, svg: emblem(await tabler(icon), '#ffffff', { ext: mix(STAGE[k], '#000000', .35), size: 192, body: false }) });
}
if (!only || only === 'merge') for (const [set, A] of [['space', SPACE], ['ball', BALL], ['fruit', FRUIT]]) A.forEach((f, k) => items.push({ file: `${ROOT}games/assets/merge/${set}-${k + 1}.png`, w: 256, svg: f() }));
if (!only || only === 'sling') for (const [name, s] of Object.entries(SLING)) items.push({ file: `${ROOT}games/assets/sling/${name}.png`, w: s.w, h: s.h, svg: s.svg });
await render(items);
console.log('rendered', items.length);
