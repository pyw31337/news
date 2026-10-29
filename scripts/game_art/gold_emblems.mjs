// 그록 금색 메달에 맞춘 금속 엠블럼(그록 이미지가 없는 배지용): node scripts/game_art/gold_emblems.mjs <출력폴더>
import { tabler, emblem, render } from './lib.mjs';
const OUT = process.argv[2];
const ICON = { lunch: 'tools-kitchen-2', commute: 'bus', f_pol: 'building-bank', f_eco: 'pig-money', f_world: 'world', f_it: 'cpu', f_ent: 'microphone-2', f_spo: 'ball-football',
  x_map: 'affiliate', x_ent: 'id-badge-2', x_mkt: 'chart-candle', ladder: 'stairs-up', planet: 'planet', combo: 'f-bolt', stars: 'f-star' };
const items = [];
for (const [id, ic] of Object.entries(ICON)) items.push({ file: `${OUT}/${id}.png`, w: 512, svg: emblem(await tabler(ic), '#e9b949', { filled: ic.startsWith('f-'), ext: '#6b4a10', body: false, sw: 3.4 }) });
await render(items); console.log('gold emblems', items.length);
