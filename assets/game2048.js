/* NewsBoard 2048 with file-based SFX + Web Audio fallback
   2026-10-30
*/
(function(){
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
const STEPS=['제보','단신','기사','심층','이슈','논쟁','담론','역사'];
let grid=Array(4).fill().map(()=>Array(4).fill(0));
let score=0, best=0;
const play=n=>window.NBAudioFile?NBAudioFile.play(n):(window.NBAudio&&NBAudio.play(n));

function init(){
  grid=Array(4).fill().map(()=>Array(4).fill(0));
  score=0;
  spawn();spawn();
  draw();
}
function spawn(){
  const empty=[];
  for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(!grid[r][c])empty.push([r,c]);
  if(!empty.length)return;
  const [r,c]=empty[Math.floor(Math.random()*empty.length)];
  grid[r][c]=Math.random()<0.9?2:4;
  play('place');
}
function slide(row){
  let a=row.filter(x=>x),m=0;
  for(let i=0;i<a.length-1;i++){
    if(a[i]===a[i+1]){a[i]*=2;score+=a[i];a[i+1]=0;m++;i++;}
  }
  a=a.filter(x=>x);
  while(a.length<4)a.push(0);
  if(m)play('merge');
  return a;
}
function move(dir){
  let moved=false,old=JSON.stringify(grid);
  if(dir==='l')for(let r=0;r<4;r++)grid[r]=slide(grid[r]);
  if(dir==='r')for(let r=0;r<4;r++)grid[r]=slide(grid[r].slice().reverse()).reverse();
  if(dir==='u')for(let c=0;c<4;c++){
    const col=slide([grid[0][c],grid[1][c],grid[2][c],grid[3][c]]);
    for(let r=0;r<4;r++)grid[r][c]=col[r];
  }
  if(dir==='d')for(let c=0;c<4;c++){
    const col=slide([grid[3][c],grid[2][c],grid[1][c],grid[0][c]]).reverse();
    for(let r=0;r<4;r++)grid[r][c]=col[3-r];
  }
  if(JSON.stringify(grid)!==old){moved=true;spawn();draw();}
  return moved;
}
function draw(){
  const el=document.getElementById('g2048');
  if(!el)return;
  el.innerHTML=`<div class="g2048-score">점수 ${score} · 최고 ${best}</div>
  <div class="g2048-grid">${grid.flat().map((v,i)=>{
    const lv=v?Math.log2(v):0;
    return `<div class="g2048-tile t${lv}" data-v="${v}">
      ${v?`<span class="sn">${String(lv).padStart(2,'0')}</span><b>${STEPS[lv-1]||v}</b>`:''}
    </div>`;
  }).join('')}</div>
  <div class="g2048-btns">
    <button onclick="NB2048.move('l')">←</button>
    <button onclick="NB2048.move('u')">↑</button>
    <button onclick="NB2048.move('d')">↓</button>
    <button onclick="NB2048.move('r')">→</button>
    <button onclick="NB2048.init()">다시</button>
    <button onclick="NBAudio&&NBAudio.toggle()">소리</button>
  </div>`;
  if(score>best)best=score;
  if(window.NBGameFX)NBGameFX.saveScore('2048',score);
}
document.addEventListener('keydown',e=>{
  const m={ArrowLeft:'l',ArrowRight:'r',ArrowUp:'u',ArrowDown:'d'}[e.key];
  if(m){e.preventDefault();move(m);}
});
window.NB2048={init,move,score:()=>score};
console.log('NB2048 ready');
})();
