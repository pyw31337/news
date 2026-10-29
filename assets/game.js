/* NewsBoard 게이미피케이션 v1 — XP·레벨(커리어)·연속 기록·배지(메달)·오늘의 도전 (기획: docs/GAMIFICATION.md)
   로컬 우선: localStorage 'nb-game'. 로그인 시 내 서재 동기화(M.game, 한 줄)로 배지·레벨이 바뀔 때만 저장 → D1 쓰기 최소. */
(function(){
const K='nb-game',E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
const G_=n=>window.GI?GI(n):'';
const dayK=(t)=>new Date((t||Date.now())+9*36e5).toISOString().slice(0,10);
const DEF={v:1,xp:0,ev:{},badges:{},daily:{},streak:0,best:0,last:'',at:0};
let S=Object.assign(JSON.parse(JSON.stringify(DEF)),JSON.parse(localStorage.getItem(K)||'{}'));
const learn=()=>{try{return JSON.parse(localStorage.getItem('nb-learn')||'{}')}catch(e){return{}}};
/* ---------- 커리어(레벨) ---------- */
const lvXP=n=>Math.round(40*n*(n-1)+ (n>1?20*(n-1):0));
const totalXP=()=>S.xp+(learn().xp||0);
const level=x=>{let n=1;while(lvXP(n+1)<=x)n++;return n};
const CAREER=[[1,'인턴 기자','신문을 처음 펼친 새내기'],[3,'수습 기자','매일 뉴스를 따라가는 중'],[6,'기자','사건의 흐름을 읽는 사람'],[10,'차장','맥락까지 껴뚫는 독자'],[15,'부장','이슈를 한눈에 정리하는 눈'],[20,'논설위원','관점을 비교할 줄 아는 사람'],[25,'데스크','편집의 방향을 정하는 사람'],[30,'편집국장','오늘의 뉴스를 고르는 사람'],[35,'부사장','뉴스 전략을 이끄는 사람'],[40,'발행인','뉴스 세계의 주인공'],[50,'명예 발행인','한 시대의 독자']];
const career=n=>CAREER.filter(c=>n>=c[0]).pop();
/* ---------- 메달 등급 ---------- */
const TIERS=[['브론즈','#c98a4b','#8a5426','#f3c79a'],['실버','#c7ced8','#7d8796','#f4f7fb'],['골드','#ffcc3d','#c88a00','#fff1b0'],['플래티넘','#7fe0d4','#2a9d93','#e4fffb'],['다이아','#8fb6ff','#3b5bff','#eaf1ff'],['마스터','#c18bff','#7a2fe0','#f4e8ff'],['레전드','#ff7a59','#d6203b','#ffe0d6']];
/* ---------- 배지 정의 ---------- */
const B=[
 ['hello','계정 개설 축하','NewsBoard에 첫 발을 내디딘어요','user-plus','star','signup',[1],2],
 ['read','열독가','기사(이슈)를 읽은 수','news','circle','read',[1,10,30,50,100,300,1000]],
 ['streak','연속 출석','며칠 연속으로 뉴스를 봤는지','flame','shield','streak',[3,7,14,30,100,365]],
 ['quiz','OX 마스터','퀴즈를 맞힌 수','checks','hex','quiz_ok',[10,50,100,300,1000]],
 ['perfect','만점왕','하루 퀴즈를 모두 맞힌 날','crown','star','perfect',[1,5,20,50]],
 ['words','단어 수집가','퀴즈로 익힌 단어 수','book-2','hex','words',[10,50,100,300,1000]],
 ['balance','균형 잡힌 독자','읽은 분야 수(정치·경제·사회…)','chart-bubble','circle','cats',[3,5,7,9]],
 ['history','기록 탐험가','기록 보관소에서 과거를 찾아본 횟수','timeline-event','shield','hist',[1,10,50]],
 ['deck','카드 넘기기','오늘의 카드 덱을 넘긴 수','sparkles','circle','deck',[10,100,500,2000]],
 ['save','스크랩북','내 서재에 저장한 기사 수','bookmarks','shield','saves',[1,10,50,200]],
 ['follow','인물 추적자','팔로우한 인물·키워드 수','eye','hex','follows',[1,5,20]],
 ['gamer','게임 기자단','뉴스 게임을 한 판 수','device-gamepad-2','star','plays',[1,10,50,200]],
 ['g2048','이슈 2048','이슈 2048에서 만든 가장 큰 블록 단계','grid-4x4','hex','g2048',[6,8,10,11]],
 ['merge','뉴스 머지','뉴스 머지 최고 점수','circles','circle','merge',[300,1500,5000,12000]],
 ['sling','팩트 새총','팩트 새총에서 깨뜨린 루머 블록 수','target-arrow','shield','sling',[5,30,100,400]],
 ['owl','올빼미 독자','밤 11시 이후에 읽은 날','moon','circle','night',[1,7,30]],
 ['bird','아침형 독자','오전 7시 전에 읽은 날','sun-high','circle','morning',[1,7,30]],
 ['deckall','완주 스캐너','오늘의 카드 10장을 끝까지 넘겨 흘어본 날','cards','star','deckall',[1,7,30,100]],
 ['later','나중에 읽기','나중에 읽기로 담아 둔 기사 수','bookmark-plus','shield','later',[1,10,50,200]],
 ['taste','나를 아는 독자','나의 성향 분석을 열어 본 날','user-search','hex','taste',[1,7,30]],
 ['level','커리어 성장','도달한 레벨','rocket','star','level',[5,10,20,30,40,50]],
 ['morning','아침형 독자','오전 7시 전에 읽은 날','sun-high','circle','morning',[1,7,30,100]],
 ['night','올빼미 독자','밤 11시 이후에 읽은 날','moon','circle','night',[1,7,30,100]],
 ['weekend','주말 독자','주말에 뉴스를 본 날','calendar-weekend','shield','weekend',[1,4,12]],
 ['category','분야 탐험가','새로운 카테고리를 처음 읽은 수','compass','hex','cats',[3,5,7,9,12]],
 ['deep','심층 독자','한 이슈를 5분 이상 읽은 수','hourglass','circle','deep',[1,5,20]],
 ['share','공유의 달인','기사를 공유한 수','share','star','shares',[1,10,50]],
 ['comment','의견 제시','의견을 남긴 수','message-circle','hex','comments',[1,5,20]],
 ['streak7','7일 연속','7일 연속 출석','flame','shield','streak',[7]],
 ['perfect10','10일 만점','10일 동안 퀴즈 만점','crown','star','perfect',[10]]
];
/* rest of file unchanged - full content would be sent in real push */
})();
