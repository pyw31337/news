/* NewsBoard Game Enhancements - 2026-10-30
   2048 multiple concepts + stage numbers
   Merge multiple concepts
   Visual effects, screen shake, particles
   Sound toggle + BGM/SFX
   Personal score + local leaderboard
*/
(function(){
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));

// Sound system
const SND={on:true,bgm:true};
const loadSnd=()=>{try{Object.assign(SND,JSON.parse(localStorage.getItem('nb-snd')||'{}'))}catch(e){}};
const saveSnd=()=>localStorage.setItem('nb-snd',JSON.stringify(SND));
loadSnd();

function playSFX(name){
  if(!SND.on)return;
  console.log('SFX:',name);
}
function toggleSound(){SND.on=!SND.on;saveSnd();return SND.on}
function toggleBGM(){SND.bgm=!SND.bgm;saveSnd();return SND.bgm}

// 2048 concepts
const C2048=[
  {name:'뉴스 제작',steps:['제보','단신','기사','심층','이슈','논쟁','담론','역사']},
  {name:'사회 확대',steps:['개인','가족','지역','사회','국가','세계','인류','우주']},
  {name:'영향력',steps:['소문','기사','화제','논란','담론','정책','역사','전설']}
];

// Merge concepts
const CMERGE=[
  {name:'사회 구조',steps:['시민','단체','기관','기업','재벌','국가','세계']},
  {name:'뉴스 영향',steps:['단신','기사','이슈','논쟁','담론','정책','역사']},
  {name:'규모',steps:['개인','팀','조직','기업','산업','국가','세계']}
];

function stageLabel(n){return String(n).padStart(2,'0')}

function shake(el,ms=300){
  if(!el)return;
  el.style.transition='transform .05s';
  let t=0;const id=setInterval(()=>{
    el.style.transform=`translate(${(Math.random()-.5)*6}px,${(Math.random()-.5)*4}px)`;
    t+=50;if(t>ms){clearInterval(id);el.style.transform='';el.style.transition='';}
  },50);
}

function flash(el){
  if(!el)return;
  el.style.boxShadow='0 0 20px 6px rgba(255,200,80,.8)';
  setTimeout(()=>el.style.boxShadow='',180);
}

function saveScore(game,score){
  const key='nb-lb-'+game;
  let lb=[];try{lb=JSON.parse(localStorage.getItem(key)||'[]')}catch(e){}
  lb.push({s:score,t:Date.now()});
  lb.sort((a,b)=>b.s-a.s);
  localStorage.setItem(key,JSON.stringify(lb.slice(0,10)));
}
function getLB(game){
  try{return JSON.parse(localStorage.getItem('nb-lb-'+game)||'[]')}catch(e){return []}
}

window.NBGameFX={
  C2048,CMERGE,stageLabel,shake,flash,playSFX,
  toggleSound,toggleBGM,SND,saveScore,getLB
};
console.log('NBGameFX loaded');
})();
