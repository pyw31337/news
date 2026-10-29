/* NewsBoard 만화 v2 · 컷마다 다른 장면·카메라·포즈·소품
   1컷 와이드(배경 소개) → 2컷 클로즈업(반응) → 3컷 설명(보드·화면) → 4컷 로우앵글(앞으로) */
(function(){
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const INK='#0f1630';
/* 카테고리별 배경 팔레트·장소 */
const PAL={정치:['#dfe8ff','#b9c9f5','#2f4f9e'],경제:['#e4f7ef','#bfe9d6','#11a683'],사회:['#fff0e6','#ffd3b8','#ff6a3d'],세계:['#ece6ff','#d2c6ff','#7a4dff'],'IT·과학':['#e2f6fb','#b5e6f2','#0aa5c8'],IT:['#e2f6fb','#b5e6f2','#0aa5c8'],연예:['#ffe8f2','#ffc4dd','#e2448e'],스포츠:['#fff3dc','#ffdca0','#f08a00']};
const pal=c=>PAL[c]||PAL.사회;
/* ---------- 얼굴 ---------- */
function eyes(m,blink){if(blink)return'<path d="M-13 -4h8M5 -4h8" stroke="'+INK+'" stroke-width="3" stroke-linecap="round"/>';
  return({surprised:`<circle cx="-9" cy="-4" r="5.5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="9" cy="-4" r="5.5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="-9" cy="-4" r="2.4" fill="${INK}"/><circle cx="9" cy="-4" r="2.4" fill="${INK}"/>`,
   think:`<path d="M-13 -3q4 3 8 0M5 -3q4 3 8 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
   smile:`<path d="M-13 -2q4-6 8 0M5 -2q4-6 8 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
   curious:`<circle cx="-9" cy="-4" r="4" fill="${INK}"/><circle cx="9" cy="-5" r="4.6" fill="${INK}"/><circle cx="-7.6" cy="-5.6" r="1.3" fill="#fff"/><circle cx="10.6" cy="-6.6" r="1.4" fill="#fff"/><path d="M3 -14l12 -3" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`
  }[m])||`<circle cx="-9" cy="-4" r="3.6" fill="${INK}"/><circle cx="9" cy="-4" r="3.6" fill="${INK}"/><circle cx="-7.8" cy="-5.2" r="1.1" fill="#fff"/><circle cx="10.2" cy="-5.2" r="1.1" fill="#fff"/>`}
function mouth(m){return({surprised:'<ellipse cx="0" cy="11" rx="5" ry="6.5" fill="#7a1f12"/><ellipse cx="0" cy="14" rx="3" ry="2" fill="#ff8f8f"/>',smile:'<path d="M-10 7q10 12 20 0z" fill="#7a1f12"/><path d="M-6 11q6 4 12 0" fill="#ff8f8f"/>',think:'<path d="M-4 11q5-3 9 1" stroke="#7a1f12" stroke-width="3" fill="none" stroke-linecap="round"/>',curious:'<ellipse cx="2" cy="11" rx="3.5" ry="3" fill="#7a1f12"/>'}[m])||'<path d="M-7 8q7 8 14 0" stroke="#7a1f12" stroke-width="3" fill="none" stroke-linecap="round"/>'}
/* 팔: 몸 중심 기준 어깨(±26,14)에서 각도로 뻗음 */
const arm=(x,y,ang,len,col,hand)=>{const r=ang*Math.PI/180,ex=x+Math.cos(r)*len,ey=y+Math.sin(r)*len;return`<path d="M${x} ${y}L${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${col}" stroke-width="8" stroke-linecap="round"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5.5" fill="${hand}" stroke="${INK}" stroke-width="1.5"/>`};
const POSE={idle:[120,60],wave:[130,-60],point:[130,-15],cheer:[-120,-60],think:[110,-100],hold:[60,120],shrug:[-160,-20],run:[150,20],look:[100,-150]};
/* 보리: 호기심 많은 학생 (주황, 노란 머리띠) */
function bori(m,pose,o={}){const[l,r]=POSE[pose]||POSE.idle;const B='#ff8a3d',D='#e5671f';
  return`<g class="cb">${o.noShadow?'':'<ellipse cx="0" cy="45" rx="30" ry="6" fill="#0f163022"/>'}
  ${pose==='run'?`<path d="M-10 40l-10 8M10 40l14 4" stroke="${D}" stroke-width="8" stroke-linecap="round"/>`:`<path d="M-10 38v8M10 38v8" stroke="${D}" stroke-width="8" stroke-linecap="round"/>`}
  ${arm(-24,16,l+(l>90?0:0),22,B,'#ffc9a8')}
  <path d="M-32 40q0-62 32-62t32 62z" fill="${B}" stroke="${INK}" stroke-width="2"/><path d="M-22 -14q22-22 44 0" fill="#ffb020" stroke="${INK}" stroke-width="2"/><path d="M-6 -30l6-10 6 10z" fill="#ff4d2e" stroke="${INK}" stroke-width="2"/>
  ${o.back?'':`<circle cx="-20" cy="13" r="5" fill="#ffb4a0"/><circle cx="20" cy="13" r="5" fill="#ffb4a0"/><g transform="translate(0,8)">${eyes(m)}${mouth(m)}</g>`}
  ${arm(24,16,r,22,B,"#ffc9a8")}
  ${o.prop||''}
  ${!o.back&&m==='surprised'?`<path d="M30 -18q4 8 0 12q-4-4 0-12z" fill="#7fd0ff" stroke="${INK}" stroke-width="1.5"/>`:''}</g>`}
/* 누리: 차분한 해설가 (남색, 안경, 서류 모자) */
function nuri(m,pose,o={}){const[l,r]=POSE[pose]||POSE.idle;const B='#2f4f9e';
  return`<g class="cn">${o.noShadow?'':'<ellipse cx="0" cy="45" rx="30" ry="6" fill="#0f163022"/>'}
  <path d="M-10 38v8M10 38v8" stroke="#1d3577" stroke-width="8" stroke-linecap="round"/>
  ${arm(-26,14,l,22,B,'#ffd8bf')}
  <rect x="-30" y="-26" width="60" height="68" rx="26" fill="${B}" stroke="${INK}" stroke-width="2"/><path d="M-8 18l8 10 8-10" fill="#ffd84d" stroke="${INK}" stroke-width="1.5"/>
  <rect x="-22" y="-37" width="44" height="14" rx="4" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M-16 -32h32M-16 -28h20" stroke="#8189a3" stroke-width="2"/>
  ${o.back?'':`<g transform="translate(0,6)">${eyes(m)}<circle cx="-9" cy="-4" r="8.5" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="9" cy="-4" r="8.5" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M-1 -4h2" stroke="#fff" stroke-width="2.5"/><g transform="translate(0,2)">${mouth(m==='curious'?'explain':m)}</g></g>`}
  ${arm(26,14,r,22,B,"#ffd8bf")}${o.prop||''}</g>`}
/* ---------- 소품 ---------- */
const P={
 paper:`<g transform="translate(30,-2) rotate(-12)"><rect x="-4" y="-16" width="30" height="24" rx="2" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M1 -10h20M1 -5h20M1 0h12" stroke="#8189a3" stroke-width="2"/><rect x="14" y="-1" width="8" height="6" fill="#ff4d2e"/></g>`,
 phone:`<g transform="translate(36,-14) rotate(14)"><rect x="-8" y="-14" width="16" height="28" rx="3" fill="${INK}"/><rect x="-6" y="-11" width="12" height="20" rx="1.5" fill="#7fd0ff"/><path d="M-4 -6h8M-4 -2h6" stroke="#fff" stroke-width="1.5"/></g>`,
 mag:`<g transform="translate(38,-26)"><circle r="11" fill="#dff3ff" stroke="${INK}" stroke-width="3"/><path d="M8 8l10 10" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></g>`,
 pointer:`<path d="M42 -36L74 -64" stroke="#8a5a2b" stroke-width="3.5" stroke-linecap="round"/><circle cx="74" cy="-64" r="3.5" fill="#ff4d2e"/>`,
 bino:`<g transform="translate(0,-12)"><rect x="-17" y="-8" width="14" height="16" rx="5" fill="${INK}"/><rect x="3" y="-8" width="14" height="16" rx="5" fill="${INK}"/><rect x="-3" y="-4" width="6" height="6" fill="#3b4361"/><circle cx="-10" cy="-8" r="5" fill="#7fd0ff" stroke="${INK}" stroke-width="2"/><circle cx="10" cy="-8" r="5" fill="#7fd0ff" stroke="${INK}" stroke-width="2"/></g>`,
 mug:`<g transform="translate(-38,8)"><rect x="-8" y="-10" width="16" height="18" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M8 -5q7 0 7 5t-7 5" fill="none" stroke="${INK}" stroke-width="2"/><path d="M-3 -16q2-4 0-7M3 -16q2-4 0-7" stroke="#8189a3" stroke-width="1.5" fill="none"/></g>`,
 bulb:`<g transform="translate(0,-60)"><circle r="11" fill="#ffd84d" stroke="${INK}" stroke-width="2"/><rect x="-5" y="9" width="10" height="7" fill="#8189a3" stroke="${INK}" stroke-width="1.5"/><path d="M-20 -8l-7-3M20 -8l7-3M0 -18v-8M-15 -18l-5-6M15 -18l5-6" stroke="#ffb020" stroke-width="3" stroke-linecap="round"/></g>`,
 q:`<text x="30" y="-30" font-size="26" font-weight="900" fill="#ff4d2e" stroke="${INK}" stroke-width="1.2">?</text>`,
 ex:`<text x="28" y="-28" font-size="28" font-weight="900" fill="#ff4d2e" stroke="${INK}" stroke-width="1.2">!</text>`
};
/* ---------- 배경 ---------- */
const cloud=(x,y,s)=>`<g transform="translate(${x},${y}) scale(${s})" fill="#fff" opacity=".9"><circle r="12"/><circle cx="14" cy="3" r="10"/><circle cx="-13" cy="4" r="9"/><rect x="-22" y="4" width="46" height="9" rx="4.5"/></g>`;
function skyline(W,H,c){const[a,b,k]=pal(c);let s='',x=-10,i=0;while(x<W){const w=26+(i*37%22),h=40+(i*53%70);s+=`<rect x="${x}" y="${H-h-40}" width="${w}" height="${h+40}" fill="${i%2?b:'#fff'}" stroke="${INK}" stroke-width="1.5" opacity=".95"/>`;for(let yy=H-h-30;yy<H-50;yy+=12)for(let xx=x+5;xx<x+w-6;xx+=9)s+=`<rect x="${xx}" y="${yy}" width="4" height="6" fill="${(xx+yy)%3?'#cfd6ea':'#ffd84d'}"/>`;x+=w+4;i++}return s}
/* 장소 소품: 카테고리 아이콘 건물 */
function landmark(c,x,y){const[a,b,k]=pal(c);
  if(c==='정치')return`<g transform="translate(${x},${y})"><path d="M-60 0h120v-8h-120z" fill="#fff" stroke="${INK}" stroke-width="2"/>${[-48,-28,-8,12,32,52].map(px=>`<rect x="${px-4}" y="-48" width="8" height="40" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`).join('')}<path d="M-60 -48h120l-10-10h-100z" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M-36 -58q36-52 72 0z" fill="${b}" stroke="${INK}" stroke-width="2"/><path d="M0 -84v-14l12 4-12 4" fill="#ff4d2e" stroke="${INK}" stroke-width="1.5"/></g>`;
  if(c==='경제')return`<g transform="translate(${x},${y})"><rect x="-56" y="-70" width="112" height="62" rx="6" fill="${INK}"/><rect x="-50" y="-64" width="100" height="50" rx="3" fill="#13203f"/><polyline points="-44,-24 -28,-34 -14,-28 0,-46 14,-40 28,-56 44,-50" fill="none" stroke="#3ee0a8" stroke-width="3" stroke-linejoin="round"/><circle cx="44" cy="-50" r="3.5" fill="#3ee0a8"/><path d="M-4 -8v8M4 -8v8" stroke="${INK}" stroke-width="4"/></g>`;
  if(c==='세계')return`<g transform="translate(${x},${y-40})"><circle r="38" fill="#7fd0ff" stroke="${INK}" stroke-width="2"/><path d="M-26 -18q12-8 20 2t18-4 14 10M-30 10q14 6 22-2t20 8 16-6" fill="none" stroke="#11a683" stroke-width="6" stroke-linecap="round"/><ellipse rx="48" ry="12" fill="none" stroke="${k}" stroke-width="2" stroke-dasharray="4 4" transform="rotate(-18)"/><path d="M0 38v10M-14 48h28" stroke="${INK}" stroke-width="3"/></g>`;
  if(c==='IT·과학'||c==='IT')return`<g transform="translate(${x},${y})">${[-40,0,40].map(px=>`<rect x="${px-16}" y="-78" width="32" height="78" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/>${[0,1,2,3,4].map(r=>`<rect x="${px-10}" y="${-70+r*14}" width="20" height="6" rx="2" fill="#cfd6ea"/><circle cx="${px+8}" cy="${-67+r*14}" r="1.8" fill="${r%2?'#3ee0a8':k}"/>`).join('')}`).join('')}</g>`;
  if(c==='연예')return`<g transform="translate(${x},${y})"><path d="M-70 0h140l-10-14h-120z" fill="#7a1f3d" stroke="${INK}" stroke-width="2"/><path d="M-40 -100l-30 86h60zM40 -100l30 86h-60z" fill="#fff6b0" opacity=".55"/><circle cx="-40" cy="-100" r="7" fill="${INK}"/><circle cx="40" cy="-100" r="7" fill="${INK}"/>${[-30,-10,10,30].map((px,i)=>`<path d="M${px} -30l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffd84d" transform="translate(0,${-i%2*16})"/>`).join('')}</g>`;
  if(c==='스포츠')return`<g transform="translate(${x},${y})"><path d="M-80 0q80-40 160 0" fill="#3ec46d" stroke="${INK}" stroke-width="2"/><path d="M-80 0v-40q80-30 160 0v40" fill="none" stroke="${INK}" stroke-width="2"/>${[-60,-30,0,30,60].map(px=>`<path d="M${px} -46v-20" stroke="${INK}" stroke-width="2"/><circle cx="${px}" cy="-70" r="5" fill="#fff6b0" stroke="${INK}" stroke-width="1.5"/>`).join('')}<circle cx="20" cy="-12" r="7" fill="#fff" stroke="${INK}" stroke-width="2"/></g>`;
  return`<g transform="translate(${x},${y})"><rect x="-6" y="-80" width="6" height="80" fill="${INK}"/><rect x="-14" y="-96" width="22" height="16" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="-3" cy="-88" r="3" fill="#ff4d2e"/><rect x="18" y="-46" width="54" height="46" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M14 -46l31-20 31 20z" fill="${b}" stroke="${INK}" stroke-width="2"/><rect x="38" y="-24" width="14" height="24" fill="${a}" stroke="${INK}" stroke-width="1.5"/></g>`}
const speed=(cx,cy,n,col)=>{let s='';for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r1=70+(i*13%30),r2=260;s+=`<path d="M${(cx+Math.cos(a)*r1).toFixed(0)} ${(cy+Math.sin(a)*r1).toFixed(0)}L${(cx+Math.cos(a)*r2).toFixed(0)} ${(cy+Math.sin(a)*r2).toFixed(0)}" stroke="${col}" stroke-width="${2+i%3}"/>`}return s};
const halftone=(W,H,col)=>`<pattern id="ht" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="${col}"/></pattern><rect width="${W}" height="${H}" fill="url(#ht)" opacity=".35"/>`;
/* ---------- 컷 4종 ---------- */
function shot(k,p,c){const m=p.mood||['curious','surprised','explain','smile'][k];const[a,b,col]=pal(c.category);const word=E((c.word||c.title||'').slice(0,8));const uid='c'+k;
  if(k===0){const W=640,H=260;/* 와이드: 동네·도시 전경, 보리가 소식 들고 달려옴 */
    return[W,H,`<defs><linearGradient id="${uid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${uid}s)"/>${cloud(90,70,1.1)}${cloud(470,50,.8)}${cloud(330,90,.6)}
    <g opacity=".55">${skyline(W,H,c.category)}</g><rect y="${H-44}" width="${W}" height="44" fill="${b}" stroke="${INK}" stroke-width="2"/><path d="M0 ${H-22}h${W}" stroke="#fff" stroke-width="4" stroke-dasharray="22 16"/>
    ${landmark(c.category,470,H-44)}
    <g transform="translate(150,${H-74}) scale(1.05)"><path d="M-70 10h-30M-66 24h-22M-74 -4h-18" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".5"/>${bori(m,'run',{prop:P.paper})}</g>
    <g transform="translate(300,${H-70}) scale(.85)">${nuri('smile','wave',{prop:P.mug})}</g>`]}
  if(k===1){const W=320,H=300;/* 클로즈업: 보리 얼굴 크게 + 집중선 */
    return[W,H,`<rect width="${W}" height="${H}" fill="${m==='surprised'?'#fff6c9':a}"/><g opacity=".5">${speed(160,200,44,m==='surprised'?'#ffb020':col)}</g>${halftone(W,H,col)}
    <g transform="translate(150,214) scale(2.3)">${bori(m,m==='surprised'?'cheer':'think',{noShadow:1,prop:m==='surprised'?P.ex:P.q})}</g>
    <g transform="translate(276,268) scale(.7)">${nuri('explain','point',{})}</g>`]}
  if(k===2){const W=320,H=300;/* 설명: 누리가 보드 앞에서 짚고, 보리는 뒤통수(어깨 너머 구도) */
    return[W,H,`<rect width="${W}" height="${H}" fill="#f6f1e7"/><rect y="${H-60}" width="${W}" height="60" fill="#e7dcc6"/><path d="M0 ${H-60}h${W}" stroke="${INK}" stroke-width="2"/>
    <g transform="translate(176,96)"><rect x="-104" y="-64" width="208" height="118" rx="8" fill="#1f3b2f" stroke="#8a5a2b" stroke-width="7"/>
     <text x="0" y="-26" text-anchor="middle" font-size="22" font-weight="900" fill="#fff" font-family="Pretendard Variable,Pretendard,sans-serif">${word}</text>
     <polyline points="-80,34 -50,20 -24,26 2,0 30,8 62,-14 84,-10" fill="none" stroke="#ffd84d" stroke-width="3.5" stroke-linejoin="round"/>
     <path d="M-84 42h168" stroke="#ffffff55" stroke-width="2"/><circle cx="62" cy="-14" r="5" fill="none" stroke="#ff8f8f" stroke-width="2.5"/></g>
    <g transform="translate(232,${H-72}) scale(1.05)">${nuri(m==='surprised'?'explain':m,'point',{prop:P.pointer})}</g>
    <g transform="translate(64,${H-14}) scale(1.6)">${bori('explain','idle',{back:1,noShadow:1})}</g>`]}
  const W=640,H=260;/* 로우앵글 엔딩: 노을 언덕 위 두 캐릭터, 표지판 '앞으로' */
  return[W,H,`<defs><linearGradient id="${uid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb37a"/><stop offset=".6" stop-color="#ffe2b8"/><stop offset="1" stop-color="#fff4e2"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${uid}s)"/>
   <circle cx="470" cy="150" r="58" fill="#ffd84d" opacity=".9"/>${[0,1,2,3,4,5,6,7].map(i=>`<path d="M470 150L${(470+Math.cos(i*.8-3)*400).toFixed(0)} ${(150+Math.sin(i*.8-3)*400).toFixed(0)}" stroke="#fff" stroke-width="16" opacity=".14"/>`).join('')}
   <path d="M0 ${H-50}q180-70 360-30t280-10V${H}H0z" fill="${b}" stroke="${INK}" stroke-width="2"/><path d="M0 ${H}q200-30 320-80" stroke="#fff" stroke-width="10" fill="none" opacity=".6"/>
   <g transform="translate(560,${H-74})"><rect x="-3" y="-60" width="6" height="64" fill="#8a5a2b" stroke="${INK}" stroke-width="1.5"/><path d="M-40 -64h62l12 11-12 11h-62z" fill="#fff" stroke="${INK}" stroke-width="2"/><text x="-10" y="-47" text-anchor="middle" font-size="13" font-weight="900" fill="${INK}" font-family="Pretendard Variable,Pretendard,sans-serif">앞으로 →</text></g>
   <g transform="translate(200,${H-86}) scale(1.35)">${bori(m,'look',{prop:P.bino})}</g>
   <g transform="translate(330,${H-96}) scale(1.35)">${nuri('smile','point',{prop:m==='smile'?P.bulb:''})}</g>`]}
function panel(p,k,c){const[W,H,svg]=shot(k%4,p,c);const wide=W>400;
  return`<div class="cpan2 ${wide?'w':''} k${k%4}"><svg class="cart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${svg}</svg>
   <span class="cno">${k+1}</span>${p.caption?`<div class="ccap">${E(p.caption)}</div>`:''}
   <div class="cbub2">${p.lines.map(l=>`<p class="bub ${l.who==='보리'?'l':'r'}"><b>${E(l.who)}</b>${E(l.text)}</p>`).join('')}</div></div>`}
window.NBC={panel};
})();
