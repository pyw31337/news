(()=>{document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="../title.css?v=1">');
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),people=[];
let kind='all',entities=[],ids=new Map(),photos=new Map(),portraits=new Map();

const KNOWN_PORTRAITS = {
  '이재명': '../../data/pol/photos/IUD9392R.webp',
  '한동훈': '../../data/pol/photos/5DC8083A.webp',
  '서영교': '../../data/pol/photos/TKJ4800F.webp',
  '정청래': '../../data/pol/photos/2385336L.webp',
  '추미애': '../../data/pol/photos/URV1689Q.webp',
  '조국': '../../data/pol/photos/T3E4932G.webp',
  '나경원': '../../data/pol/photos/SLW27496.webp',
  '안철수': '../../data/pol/photos/YOG1280B.webp',
  '박지원': '../../data/pol/photos/KFX3165F.webp',
  '우원식': '../../data/pol/photos/XBT9550Q.webp',
  '김민석': '../../data/pol/photos/MLH1404S.webp',
  '이준석': '../../data/pol/photos/QWL7778X.webp',
  '오세훈': '../../data/pol/photos/LB24097N.webp',
  '홍준표': '../../data/pol/photos/NAL4555X.webp',
  '유승민': '../../data/pol/photos/PWU27609.webp',
  '천하람': '../../data/pol/photos/YGB8604T.webp',
  '배현진': '../../data/pol/photos/4X525582.webp',
  '장동혁': '../../data/pol/photos/KFM1081G.webp',
  '김기현': '../../data/pol/photos/X7I4680R.webp',
  '박찬대': '../../data/pol/photos/BT62420K.webp',
  '고민정': '../../data/pol/photos/WCD5518S.webp',
  '진성준': '../../data/pol/photos/3C23171A.webp',
  '김용민': '../../data/pol/photos/OFE45081.webp',
  '박주민': '../../data/pol/photos/6AU2417B.webp',
  '용혜인': '../../data/pol/photos/GE71932C.webp',
  '조희대': 'https://upload.wikimedia.org/wikipedia/commons/b/be/Jo_Heede_in_his_17th_Chief_Justice_inauguration_ceremony.png',
  '강금실': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/KumsilKang.JPG/330px-KumsilKang.JPG',
  '이승환': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/LSH_-_2019_No_Enemy_Legend.jpg/330px-LSH_-_2019_No_Enemy_Legend.jpg',
  '트럼프': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Official_Presidential_Portrait_of_President_Donald_J._Trump_%282025%29.jpg/330px-Official_Presidential_Portrait_of_President_Donald_J._Trump_%282025%29.jpg',
  '젠슨 황': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Jensen_Huang_Stanford_2026-04-30_010_%28cropped%29.jpg/330px-Jensen_Huang_Stanford_2026-04-30_010_%28cropped%29.jpg',
  '윤석열': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/South_Korea_President_Yoon_Suk_Yeol_portrait_%28crop%29.jpg/330px-South_Korea_President_Yoon_Suk_Yeol_portrait_%28crop%29.jpg',
  '김건희': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Kim_Keon-hee_2023.jpg/330px-Kim_Keon-hee_2023.jpg',
  '노무현': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Roh_Moo-hyun_presidential_portrait.jpg/330px-Roh_Moo-hyun_presidential_portrait.jpg',
  '권양숙': 'https://upload.wikimedia.org/wikipedia/commons/5/58/Kwon_Yang-sook.jpg',
  '이재용': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Lee_Jae-yong_in_2023.jpg/330px-Lee_Jae-yong_in_2023.jpg',
  '일론 머스크': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Elon_Musk_Colorado_2022_%28cropped2%29.jpg/330px-Elon_Musk_Colorado_2022_%28cropped2%29.jpg'
};

const image = n => {
  if (KNOWN_PORTRAITS[n]) return KNOWN_PORTRAITS[n];
  const id = ids.get(n);
  if (id) {
    const portrait = portraits.get(id);
    if (portrait) return portrait.startsWith('http') ? portrait : `../../${portrait}`;
    if (photos.get(n) && id.startsWith('pol:')) return `https://newsboard-sync.pyw213.workers.dev/m/pol/${id.slice(4)}.webp`;
  }
  const ent = entities.find(x => x.name === n);
  if (ent?.visual?.url) return ent.visual.url;
  if (ent?.wiki?.thumb) return ent.wiki.thumb.split('?')[0];
  return '';
};

function render(){
  const q=($('#q').value||'').toLowerCase(),list=people.filter(p=>(kind==='all'||p.kind===kind)&&(!q||p.name.toLowerCase().includes(q)||(p.role||'').toLowerCase().includes(q))).slice(0,120);
  $('#stats').innerHTML=`<div class="stat"><small>공개 프로필</small><b>${people.length.toLocaleString()}</b></div><div class="stat"><small>오늘 연결된 인물</small><b>${entities.length.toLocaleString()}</b></div><div class="stat"><small>사진 연결</small><b>${portraits.size.toLocaleString()}</b></div>`;
  $('#people').innerHTML=list.map(p=>{
    const photo=image(p.name),href=ids.get(p.name)?`../../person/?id=${encodeURIComponent(ids.get(p.name))}`:'../../persons/';
    return `<a class="person" href="${href}"><span class="avatar">${photo ? `<img class="avatar-img" src="${esc(photo)}" alt="${esc(p.name)}" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML='${esc(p.name.slice(0,1))}';">` : esc(p.name.slice(0,1))}</span><span><b>${esc(p.name)}</b><small>${esc(p.role||p.org||'공개 기록')}</small><em>${p.events||0}개 이력 · 상세 보기 →</em></span></a>`
  }).join('')||'<p class="empty">검색 결과가 없습니다.</p>';
}Promise.all([fetch('../../data/v2_people.json').then(r=>r.json()),fetch('../../data/today.json').then(r=>r.json()),fetch('../../data/v2_person_ids.json').then(r=>r.ok?r.json():{}).catch(()=>({})),fetch('../../data/v2_person_photos.json').then(r=>r.ok?r.json():{}).catch(()=>({})),fetch('https://newsboard-sync.pyw213.workers.dev/archive/people?limit=10000').then(r=>r.ok?r.json():[]).catch(()=>[])]).then(([bio,today,index,portraitIndex,archive])=>{entities=today.entities||[];Object.entries(index||{}).forEach(([name,id])=>ids.set(name,id));Object.entries(portraitIndex||{}).forEach(([id,path])=>portraits.set(id,path));(archive||[]).forEach(x=>{if(x.name&&x.id){if(!ids.has(x.name))ids.set(x.name,'pol:'+x.id);if(x.photo)photos.set(x.name,x.photo)}});Object.entries(bio).forEach(([name,v])=>{if(!name)return;people.push({name,kind:v.k==='politician'?'politician':v.k==='legal'?'legal':'corporate',role:v.r,org:v.o,events:v.e||0})});render()}).catch(()=>$('#people').innerHTML='<p class="empty">인물 데이터를 불러오지 못했습니다.</p>');$('#q').addEventListener('input',render);document.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>{kind=b.dataset.kind;document.querySelectorAll('[data-kind]').forEach(x=>x.classList.toggle('is-on',x===b));render()}))})();
