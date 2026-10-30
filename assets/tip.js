/* 모든 그래프 공용 말풍선: 마우스를 올리거나 손가락으로 누른 지점에 '무엇이 · 얼마인지'를 띄움
   1) data-tip="설명"이 있는 요소(막대·도넛 조각·구간·칸): 그 요소 위에 말풍선
   2) SVG 안 <title>이 붙은 요소: 제목 문장을 말풍선으로(브라우저 기본 툴팁 대신)
   3) data-series="1,2,3"인 선 그래프: 손가락·마우스가 가리키는 x 위치의 값 + 점 표시
      data-name(무엇), data-unit(단위), data-labels(JSON 배열: 각 점 이름), data-tips(JSON 배열: 점마다 문장)
   CSS 기본 말풍선([data-tip]::after)은 이 모듈이 켜지면 숨김(html.nbtip) */
(function(){
if(window.NBTip)return;
const D=document,R=D.documentElement;R.classList.add('nbtip');
let box,dot,cur=null,hideT=0;
const mk=()=>{if(box)return;box=D.createElement('div');box.className='nbt';box.setAttribute('role','tooltip');box.hidden=true;
  dot=D.createElement('i');dot.className='nbt-dot';dot.hidden=true;D.body.append(box,dot)};
const fmt=v=>{const n=+v;return isFinite(n)?(Math.abs(n)>=1000?n.toLocaleString('ko-KR',{maximumFractionDigits:2}):String(Math.round(n*100)/100)):String(v)};
const parse=(s,d)=>{try{return JSON.parse(s)}catch(e){return d}};
function place(x,y,anchorTop){box.hidden=false;const w=box.offsetWidth,h=box.offsetHeight,vw=innerWidth;
  let l=Math.min(vw-w-8,Math.max(8,x-w/2)),t=(anchorTop??y)-h-12,below=false;if(t<6){t=(anchorTop??y)+18;below=true}
  box.style.transform=`translate(${l|0}px,${t|0}px)`;box.style.setProperty('--ax',(Math.max(10,Math.min(w-10,x-l))|0)+'px');box.classList.toggle('below',below)}
function show(html,x,y,top){mk();clearTimeout(hideT);box.innerHTML=html;place(x,y,top)}
function hide(){clearTimeout(hideT);hideT=setTimeout(()=>{if(box){box.hidden=true;dot.hidden=true}cur=null},60)}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 선 그래프: 가리킨 x 위치의 점
function series(el,e){mk();const v=String(el.dataset.series).split(',').map(Number).filter(x=>!isNaN(x));if(v.length<2)return false;
  // data-box="왼쪽,위,그림폭,그림높이,전체폭,전체높이,최소,최대": 축이 있는 그래프의 그림 영역(viewBox 단위)
  const r=el.getBoundingClientRect(),bx=el.dataset.box?el.dataset.box.split(',').map(Number):null;
  const sx=bx?r.width/bx[4]:1,sy=bx?r.height/bx[5]:1,X0=bx?r.left+bx[0]*sx:r.left,W=bx?bx[2]*sx:r.width,Y0=bx?r.top+bx[1]*sy:r.top,H=bx?bx[3]*sy:r.height;
  const k=Math.max(0,Math.min(v.length-1,Math.round((e.clientX-X0)/W*(v.length-1))));
  const mn=bx?bx[6]:Math.min(...v),mx=bx?bx[7]:Math.max(...v),rg=mx-mn||1,pad=bx?0:(+el.dataset.pad||2)/(+el.dataset.h||r.height)*r.height;
  const px=X0+k/(v.length-1)*W,py=Y0+pad+(1-(v[k]-mn)/rg)*(H-pad*2);
  const L=el._lab||(el._lab=parse(el.dataset.labels,null)),T=el._tips||(el._tips=parse(el.dataset.tips,null));
  const lab=L&&L[k]!=null?L[k]:(k===v.length-1?'가장 최근':`${v.length-1-k}${el.dataset.step||'번째 전 기록'}`);
  const first=v[0],chg=first?((v[k]-first)/Math.abs(first)*100):0;
  const html=T&&T[k]?esc(T[k]):`${el.dataset.name?`<b>${esc(el.dataset.name)}</b>`:''}<span>${esc(lab)}</span><em>${fmt(v[k])}${esc(el.dataset.unit||'')}</em>${k?`<small>처음 대비 ${chg>=0?'+':''}${chg.toFixed(1)}%</small>`:''}`;
  dot.hidden=false;dot.style.transform=`translate(${px-4|0}px,${py-4|0}px)`;dot.style.setProperty('--c',el.dataset.col||'#ff4d2e');
  show(html,px,py,py);return true}
function find(t){if(!t||!t.closest)return null;
  const s=t.closest('[data-series]');if(s)return{el:s,kind:'s'};
  const d=t.closest('[data-tip]');if(d&&!d.closest('.nbt'))return{el:d,kind:'t'};
  if(t.closest('svg')){let n=t;while(n&&n.tagName&&n.tagName.toLowerCase()!=='svg'){const ti=n.querySelector&&[...n.children].find(c=>c.tagName&&c.tagName.toLowerCase()==='title');if(ti&&ti.textContent.trim())return{el:n,kind:'svgt',txt:ti.textContent.trim()};n=n.parentNode}}
  return null}
function onMove(e){mk();const f=find(e.target);if(!f){if(cur)hide();return}
  if(f.kind==='s'){cur=f.el;series(f.el,e);return}
  if(cur===f.el&&f.kind!=='s')return;cur=f.el;dot.hidden=true;
  const r=f.el.getBoundingClientRect(),txt=f.kind==='t'?f.el.dataset.tip:f.txt;if(!txt)return;
  const x=e.pointerType==='mouse'&&r.width>160?e.clientX:r.left+r.width/2;
  show(esc(txt).replace(/ · /g,'<br>'),x,r.top,r.top)}
D.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')onMove(e)},{passive:true});
D.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){const f=find(e.target);if(f)onMove(e);else hide()}},{passive:true});
D.addEventListener('touchmove',e=>{if(!cur||!cur.dataset||!cur.dataset.series)return;const t=e.touches[0];series(cur,{clientX:t.clientX,clientY:t.clientY})},{passive:true});
D.addEventListener('pointerleave',hide);addEventListener('scroll',()=>{if(cur&&!(cur.dataset&&cur.dataset.series))hide()},{passive:true});
D.addEventListener('focusin',e=>{const f=find(e.target);if(f&&f.kind==='t'){const r=f.el.getBoundingClientRect();cur=f.el;show(esc(f.el.dataset.tip),r.left+r.width/2,r.top,r.top)}});
D.addEventListener('focusout',hide);
window.NBTip={show,hide};
})();
