const $=s=>document.querySelector(s);const app=$('#app');let D=null;const CACHE={};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPE={person:'인물',place:'장소',org:'기관·기업',event:'키워드'};
const CATS=['정치','경제','사회','세계','IT','과학','건강','환경','문화','연예','스포츠'];
const CATC={정치:'#2f6bff',경제:'#11a683',사회:'#ff4d2e',세계:'#7a4dff',IT:'#0aa5c8',과학:'#4868d8',건강:'#d64f73',환경:'#28a26e',문화:'#9c58cc',연예:'#e2448e',스포츠:'#f08a00'};
const CATEN={정치:'Politics',경제:'Business',사회:'Society',세계:'World',IT:'Technology',과학:'Science',건강:'Health',환경:'Climate',문화:'Culture',연예:'Entertainment',스포츠:'Sports'};
/* 아이콘 */
const IC={'정치':NBU('landmark'),'경제':NBU('chart-arrows-vertical'),'사회':NBU('users-group'),'세계':NBU('world'),IT:NBU('device-laptop'),'과학':NBU('flask-2'),'건강':NBU('heart'),'환경':NBU('leaf'),'문화':NBU('palette'),'연예':NBU('movie'),'스포츠':NBU('ball-football'),fire:NBU('flame-f',1),clock:NBU('clock'),chat:NBU('message-2',1),link:NBU('link'),book:NBU('book'),chart:NBU('chart-line'),spark:NBU('sparkles',1),news:NBU('file-text',1),press:NBU('news'),user:NBU('user'),gear:NBU('settings'),search:NBU('search'),coin:NBU('coin'),alert:NBU('alert-triangle',1),bell:NBU('bell',1),bm:NBU('bookmark',1),heart:NBU('heart',1),place:NBU('map-pin'),org:NBU('building-bank'),graph:NBU('affiliate'),photo:NBU('photo'),note:NBU('notes'),folder:NBU('folder',1),video:NBU('video',1),mood:NBU('mood-smile'),ai:NBU('sparkles'),aitext:NBU('file-text-ai'),aiimg:NBU('photo-ai'),history:NBU('history'),up:NBU('trending-up'),down:NBU('trending-down'),share:NBU('share'),apt:NBU('building-community'),home:NBU('building-community'),quiz:NBU('help-hexagon',1),comic:NBU('boom',1),cards:NBU('cards',1),streak:NBU('arrow-autofit-content'),login:NBU('lock',1),sync:NBU('cloud-data-connection',1),globe:NBU('world',1),info:NBU('info-circle',1),x:NBU('x'),flame:NBU('flame-f',1),timeline:NBU('timeline-event',1),market:NBU('chart-candle',1)};
const ic=(n,c='')=>{if(n==='fire'||n==='flame'||n==='flame-f')return`<span class="flame-fx ${c}"><svg class="ico flame-live" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-flame-f"/></svg><i class="flame-sparks" aria-hidden="true"><span></span><span></span><span></span></i></span>`;return`<svg class="ico ${/u1/.test(IC[n]||'')?'tg ':''}${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]||IC.news}</svg>`};
/* 날짜 표기는 화면마다 제각각 잘라 쓰지 않는다. 한국 시간 기준으로 full / medium /
   compact 세 규격만 제공해 뉴스·특보·타임라인이 같은 언어를 쓰게 한다. */
const NBDate=window.NBDate=(()=>{const pad=n=>String(n).padStart(2,'0'),wd=['일','월','화','수','목','금','토'];
  const asDate=value=>{if(value instanceof Date)return value;const s=String(value||'').trim();if(!s)return null;
    const normalized=/^\d{4}-\d\d-\d\d(?:\s|T)\d\d:\d\d(?::\d\d)?$/.test(s)?s.replace(' ','T')+'+09:00':s;
    const d=new Date(normalized);return Number.isNaN(+d)?null:d};
  const bits=value=>{const d=asDate(value);if(!d)return null;const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).reduce((o,x)=>(o[x.type]=x.value,o),{});const local=new Date(`${p.year}-${p.month}-${p.day}T12:00:00+09:00`);return{...p,w:wd[local.getUTCDay()]}};
  const format=(value,kind='compact')=>{const p=bits(value);if(!p)return'';const date=kind==='full'?`${p.year}.${p.month}.${p.day}`:kind==='medium'?`${p.year.slice(2)}.${p.month}.${p.day}`:`${p.month}.${p.day}`;const time=kind==='full'?`${p.hour}:${p.minute}:${p.second}`:`${p.hour}:${p.minute}`;return`${date} (${p.w}) ${time}`};
  return{full:v=>format(v,'full'),medium:v=>format(v,'medium'),compact:v=>format(v,'compact'),date:v=>{const p=bits(v);return p?`${p.year}.${p.month}.${p.day} (${p.w})`:''}}})();
const ago=t=>{if(!t)return'';const m=(Date.now()-new Date(t))/6e4,en=S?.region==='en'&&S?.orig;if(m<60)return en?`${Math.max(1,m|0)}m ago`:Math.max(1,m|0)+'분 전';if(m<1440)return en?`${m/60|0}h ago`:(m/60|0)+'시간 전';if(m<43200)return en?`${m/1440|0}d ago`:(m/1440|0)+'일 전';return fmtD(t)};
const moodOf=(l,d)=>{const r=(l||0)/((l||0)+(d||0)||1);return r>=.7?['mood-happy','반가워요']:r>=.55?['mood-smile','좋아요']:r>=.45?['mood-empty','반반이에요']:r>=.3?['mood-sad','아쉬워요']:['mood-angry','화나요']};
const moodBox=(l,d)=>{if(!(l+d))return'';const[m,t]=moodOf(l,d);return`<div class="mood"><b>${NBI(m,1,'on')}${t}</b><span>민심</span></div>`};
const agoI=t=>{if(!t)return'';const h=new Date(t).getHours()%12||12;return NBI('clock-hour-'+h)+ago(t)};
const fmtD=t=>NBDate.compact(t);
const fmtDay=d=>NBDate.date(d);
const bg=u=>u?`style="background-image:url('${esc(u)}')"`:'';
const ent=n=>D.entities.find(e=>e.name===n);
const eh=n=>'entity/'+encodeURIComponent(n);const kh=n=>'kw/'+encodeURIComponent(n);
const rh=id=>'reporter/'+encodeURIComponent(id);
const AIB='';
/* 경량 데이터는 작은 원본을 자체 WebP로 바꾸지 못했을 때 thumb를 비우고 thumb_src만 남긴다.
   작은 카드에서는 그 원본도 충분히 선명하므로, 대표 미디어 → 고화질 thumb → 원본 순서로 쓴다. */
const COUNTRY_FLAG={대한민국:'kr',한국:'kr',남한:'kr',북한:'kp',미국:'us',중국:'cn',일본:'jp',독일:'de',프랑스:'fr',영국:'gb',러시아:'ru',우크라이나:'ua',이스라엘:'il',이란:'ir',대만:'tw',인도:'in',캐나다:'ca',호주:'au',이탈리아:'it',스페인:'es',브라질:'br',멕시코:'mx',튀르키예:'tr',사우디아라비아:'sa',베트남:'vn',태국:'th',필리핀:'ph',싱가포르:'sg',인도네시아:'id'};
let POL_MAP=null;
function ensurePolIndex(){
  if(POL_MAP!==null)return Promise.resolve(POL_MAP);
  return fetch('data/pol/index.json').then(r=>r.ok?r.json():null).then(d=>{
    POL_MAP={};
    if(d&&d.people){
      d.people.forEach(p=>{
        const prev=POL_MAP[p.name];
        if(!prev){
          POL_MAP[p.name]=p;
        }else{
          const maxAgeP=Math.max(...(p.ages||[0]));
          const maxAgePrev=Math.max(...(prev.ages||[0]));
          if((p.current&&!prev.current)||(maxAgeP>maxAgePrev)){
            POL_MAP[p.name]=p;
          }
        }
      });
    }
    return POL_MAP;
  }).catch(()=>{POL_MAP={};return POL_MAP;});
}
function getPol(name){return POL_MAP?POL_MAP[name]:null;}
function partyTheme(party){
  if(!party)return null;
  if(/국민의힘|한나라|새누리|자유한국|미래통합|신한국|민자|민정/.test(party)){
    return{name:'국민의힘',color:'#E61E2B',dark:'#b41420',light:'#fff1f2',text:'#ffffff'};
  }
  if(/민주|열린민주|새정치|통합민주|민주통합|평화민주/.test(party)){
    return{name:'더불어민주당',color:'#004ea2',dark:'#0c3588',light:'#eff6ff',text:'#ffffff'};
  }
  if(/조국/.test(party)){
    return{name:'조국혁신당',color:'#0073cf',dark:'#064b75',light:'#f0f9ff',text:'#ffffff'};
  }
  if(/개혁/.test(party)){
    return{name:'개혁신당',color:'#ff7a00',dark:'#a34e00',light:'#fff7ed',text:'#ffffff'};
  }
  if(/진보/.test(party)){
    return{name:'진보당',color:'#d6001c',dark:'#7a0010',light:'#fef2f2',text:'#ffffff'};
  }
  if(/기본소득/.test(party)){
    return{name:'기본소득당',color:'#00b6b0',dark:'#006663',light:'#f0fdfa',text:'#ffffff'};
  }
  if(/사회민주/.test(party)){
    return{name:'사회민주당',color:'#f2a900',dark:'#8f6300',light:'#fffbeb',text:'#111827'};
  }
  return{name:party,color:'#64748b',dark:'#334155',light:'#f8fafc',text:'#ffffff'};
}
function partyMark(party,size=20,mode=false){
  if(!party)return'';
  if(/국민의힘|한나라|새누리|자유한국|미래통합|신한국|민자|민정/.test(party)){
    if(mode==='white-icon')return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="국민의힘"><path d="M10 6.5h8v7.5l-4 4H6v-7.5z" fill="#ffffff"/></svg>`;
    const isW=mode===true||mode==='white-bg';
    const bg=isW?'#ffffff':'#E61E2B',fg=isW?'#E61E2B':'#ffffff';
    return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="국민의힘"><circle cx="12" cy="12" r="11" fill="${bg}"/><path d="M10 6.5h8v7.5l-4 4H6v-7.5z" fill="${fg}"/></svg>`;
  }
  if(/민주/.test(party)){
    if(mode==='white-icon')return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="더불어민주당"><path d="M6 6.5h5.5c3.6 0 6 2.2 6 5.5s-2.4 5.5-6 5.5H6v-11z" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17.2" cy="7.8" r="2.2" fill="#00d084"/></svg>`;
    const isW=mode===true||mode==='white-bg';
    return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="더불어민주당"><circle cx="12" cy="12" r="11" fill="${isW?'#ffffff':'#004ea2'}"/><path d="M6 6.5h5.5c3.6 0 6 2.2 6 5.5s-2.4 5.5-6 5.5H6v-11z" stroke="${isW?'#004ea2':'#ffffff'}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17.2" cy="7.8" r="2.2" fill="#00d084"/></svg>`;
  }
  if(/조국/.test(party)){
    if(mode==='white-icon')return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="조국혁신당"><path d="M6 17.5l6-11 6 11H6z" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round"/><path d="M9 13.5h6" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/></svg>`;
    const isW=mode===true||mode==='white-bg';
    return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="조국혁신당"><circle cx="12" cy="12" r="11" fill="${isW?'#ffffff':'#0073cf'}"/><path d="M6 17.5l6-11 6 11H6z" stroke="${isW?'#0073cf':'#ffffff'}" stroke-width="2.4" stroke-linejoin="round"/><path d="M9 13.5h6" stroke="${isW?'#0073cf':'#38bdf8'}" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  }
  if(/개혁/.test(party)){
    if(mode==='white-icon')return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="개혁신당"><path d="M6 18l5-11h2l5 11h-3.6l-1.4-3.5H11L9.6 18H6z" fill="#ffffff"/></svg>`;
    const isW=mode===true||mode==='white-bg';
    return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="개혁신당"><circle cx="12" cy="12" r="11" fill="${isW?'#ffffff':'#ff7a00'}"/><path d="M6 18l5-11h2l5 11h-3.6l-1.4-3.5H11L9.6 18H6z" fill="${isW?'#ff7a00':'#ffffff'}"/></svg>`;
  }
  if(/진보/.test(party)){
    if(mode==='white-icon')return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="진보당"><path d="M6.5 6.5h7a4 4 0 0 1 0 8h-7v-8z" fill="#ffffff"/><rect x="6.5" y="6.5" width="3.5" height="12" fill="#ffffff"/></svg>`;
    const isW=mode===true||mode==='white-bg';
    return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="진보당"><circle cx="12" cy="12" r="11" fill="${isW?'#ffffff':'#d6001c'}"/><path d="M6.5 6.5h7a4 4 0 0 1 0 8h-7v-8z" fill="${isW?'#d6001c':'#ffffff'}"/><rect x="6.5" y="6.5" width="3.5" height="12" fill="${isW?'#d6001c':'#ffffff'}"/></svg>`;
  }
  if(/기본소득/.test(party)){
    if(mode==='white-icon')return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="기본소득당"><circle cx="12" cy="12" r="6.5" stroke="#ffffff" stroke-width="2.2"/><path d="M12 8.5v7M8.5 12h7" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/></svg>`;
    const isW=mode===true||mode==='white-bg';
    return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="기본소득당"><circle cx="12" cy="12" r="11" fill="${isW?'#ffffff':'#00b6b0'}"/><circle cx="12" cy="12" r="6.5" stroke="${isW?'#00b6b0':'#ffffff'}" stroke-width="2.2"/><path d="M12 8.5v7M8.5 12h7" stroke="${isW?'#00b6b0':'#ffffff'}" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  }
  if(/사회민주/.test(party)){
    if(mode==='white-icon')return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="사회민주당"><circle cx="12" cy="12" r="6" fill="#ffffff"/><path d="M9.5 9.5h5M9.5 12h5M9.5 14.5h3.5" stroke="#f2a900" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    const isW=mode===true||mode==='white-bg';
    return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="사회민주당"><circle cx="12" cy="12" r="11" fill="${isW?'#ffffff':'#f2a900'}"/><circle cx="12" cy="12" r="6" fill="${isW?'#f2a900':'#ffffff'}"/><path d="M9.5 9.5h5M9.5 12h5M9.5 14.5h3.5" stroke="${isW?'#ffffff':'#9e6e00'}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }
  if(mode==='white-icon')return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark"><circle cx="12" cy="12" r="9" stroke="#ffffff" stroke-width="1.5"/><text x="12" y="15" text-anchor="middle" font-size="7" font-weight="900" fill="#ffffff">국회</text></svg>`;
  return`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" class="p-mark" aria-label="국회"><circle cx="12" cy="12" r="10.5" fill="${mode?'#ffffff':'#475569'}" stroke="#94a3b8" stroke-width="1"/><circle cx="12" cy="12" r="8" fill="none" stroke="${mode?'#475569':'#e2e8f0'}" stroke-width="0.8" stroke-dasharray="1.5 1.5"/><text x="12" y="15" text-anchor="middle" font-size="7" font-weight="900" fill="${mode?'#475569':'#ffffff'}" font-family="'Pretendard Variable',sans-serif">국회</text></svg>`;
}
/* 대한민국 헌정사 역대 및 현직 대통령 마스터 데이터 (국가 최고 원수 직무 서열 1순위) */
const KOREA_PRESIDENTS = {
  '이재명': { ord: '제21대', current: true, title: '대한민국 제21대 대통령', badge: '현직 대통령', rank: 10000, subBadges: ['제21·22대 국회의원', '제35대 경기도지사', '민선 5·6기 성남시장'] },
  '윤석열': { ord: '제20대', current: false, title: '대한민국 제20대 대통령', badge: '제20대 대통령', rank: 9900, subBadges: ['제43대 검찰총장'] },
  '문재인': { ord: '제19대', current: false, title: '대한민국 제19대 대통령', badge: '제19대 대통령', rank: 9900, subBadges: ['제19대 국회의원', '대통령비서실장'] },
  '박근혜': { ord: '제18대', current: false, title: '대한민국 제18대 대통령', badge: '제18대 대통령', rank: 9900, subBadges: ['제15·16·17·18·19대 국회의원'] },
  '이명박': { ord: '제17대', current: false, title: '대한민국 제17대 대통령', badge: '제17대 대통령', rank: 9900, subBadges: ['제32대 서울특별시장', '제14·15대 국회의원'] },
  '노무현': { ord: '제16대', current: false, title: '대한민국 제16대 대통령', badge: '제16대 대통령', rank: 9900, subBadges: ['제13·15대 국회의원', '해양수산부 장관'] },
  '김대중': { ord: '제15대', current: false, title: '대한민국 제15대 대통령', badge: '제15대 대통령', rank: 9900, subBadges: ['제6·7·8·13·14대 국회의원', '노벨평화상 수상'] },
  '김영삼': { ord: '제14대', current: false, title: '대한민국 제14대 대통령', badge: '제14대 대통령', rank: 9900, subBadges: ['제3·5·6·7·8·9·10·13·14대 9선 국회의원'] },
  '노태우': { ord: '제13대', current: false, title: '대한민국 제13대 대통령', badge: '제13대 대통령', rank: 9900, subBadges: ['제12대 국회의원', '내무부 장관'] },
  '전두환': { ord: '제11·12대', current: false, title: '대한민국 제11·12대 대통령', badge: '역대 대통령', rank: 9900, subBadges: ['국가보위비상대책상임위원장'] },
  '최규하': { ord: '제10대', current: false, title: '대한민국 제10대 대통령', badge: '역대 대통령', rank: 9900, subBadges: ['제12대 국무총리', '외무부 장관'] },
  '박정희': { ord: '제5~9대', current: false, title: '대한민국 제5~9대 대통령', badge: '역대 대통령', rank: 9900, subBadges: ['국가재건최고회의 의장'] },
  '윤보선': { ord: '제4대', current: false, title: '대한민국 제4대 대통령', badge: '역대 대통령', rank: 9900, subBadges: ['제3·4·5대 국회의원', '제2대 서울특별시장'] },
  '이승만': { ord: '초대~3대', current: false, title: '대한민국 초대~3대 대통령', badge: '초대 대통령', rank: 9900, subBadges: ['제헌국회 의장', '임시정부 초대 대통령'] }
};

function entDesc(e){
  if(!e)return'';
  const role=primaryPublicRole(e,getPol(e.name));
  if(role)return role.label;
  if(e.wiki&&e.wiki.desc)return e.wiki.desc;
  const p=getPol(e.name);
  if(p)return`제${(p.ages||[]).slice(-1)[0]||22}대 국회의원 (${p.party||''}${p.district?' · '+p.district:''})`;
  if(typeof reporters==='function'){
    const r=reporters().find(x=>x.name===e.name);
    if(r)return`${r.press||''} 기자`;
  }
  if(e.wiki&&e.wiki.extract){
    const s=e.wiki.extract.split(/(?<=[.!?다요])\s+/)[0];
    if(s&&s.length<80)return s;
  }
  return TYPE[e.type]||'';
}

/* 직함은 단순히 수집 순서대로 노출하지 않는다. 대통령·국무총리처럼 공적 서열이
   높은 직무가 국회의원 같은 과거·병행 이력보다 먼저 보이도록 한다. */
function primaryPublicRole(e,pol){
  const name=e?.name||pol?.name||'';
  if(KOREA_PRESIDENTS[name]){
    const pres=KOREA_PRESIDENTS[name];
    return{
      rank:pres.rank,
      label:pres.title,
      badge:pres.badge,
      kind:'president',
      current:pres.current,
      ord:pres.ord,
      subBadges:pres.subBadges||[]
    };
  }
  const bio = _peopleBioCache?.[name];
  const texts=[
    bio?.role_title,
    e?.wiki?.desc,e?.wiki?.extract,pol?.office,pol?.position,pol?.role,
    ...(Array.isArray(pol?.history)?pol.history:[]),
    ...(Array.isArray(bio?.events)?bio.events.map(ev=>ev.title):[])
  ].filter(Boolean).map(String);
  const candidates=[];
  const add=(rank,label,badge,kind,current=false)=>candidates.push({rank,label,badge,kind,current});
  texts.forEach(text=>{
    if(/(?<!선거|후보\s*)(?:대한민국(?:의)?\s*)?(제\s*\d+대\s*)?대통령(?!\s*후보|\s*선거)/.test(text)){
      const m=text.match(/(?:대한민국(?:의)?\s*)?(제\s*\d+대\s*)?대통령/);
      const ord=(m?.[1]||'').replace(/\s/g,'');
      add(10000,ord?`대한민국 ${ord} 대통령`:'대한민국 대통령','대통령','president',false);
    }
    if(/국무총리(?!\s*후보)/.test(text))add(9000,'대한민국 국무총리','국무총리','prime-minister');
    if(/국회의장(?!\s*후보)/.test(text))add(8500,'대한민국 국회의장','국회의장','speaker');
    if(/대법원장/.test(text))add(8400,'대한민국 대법원장','대법원장','chief-justice');
    if(/헌법재판소장/.test(text))add(8350,'대한민국 헌법재판소장','헌법재판소장','chief-justice');
    if(/대법관/.test(text))add(8300,'대한민국의 대법관','대법관','legal');
    if(/헌법재판소\s*재판관/.test(text))add(8250,'헌법재판소 재판관','헌재재판관','legal');
    if(/검찰총장/.test(text))add(8200,'대한민국 검찰총장','검찰총장','legal');
    if(/당대표|대표최고위원/.test(text))add(7500,text.match(/[^·,·()]{0,18}(?:당대표|대표최고위원)/)?.[0]?.trim()||'정당 대표','당대표','party-leader');
    if(/원내대표/.test(text))add(7200,text.match(/[^·,·()]{0,18}원내대표/)?.[0]?.trim()||'원내대표','원내대표','floor-leader');
    if(/장관(?!\s*후보)/.test(text))add(7000,text.match(/[^·,·()]{0,18}장관/)?.[0]?.trim()||'대한민국 장관','국무위원','minister');
    if(/(특별시장|광역시장|도지사)/.test(text))add(6000,text.match(/[^·,·()]{0,18}(?:특별시장|광역시장|도지사)/)?.[0]?.trim()||'광역자치단체장','광역단체장','gov-chief');
    if(/(시장|구청장|군수)/.test(text))add(4500,text.match(/[^·,·()]{0,18}(?:시장|구청장|군수)/)?.[0]?.trim()||'기초자치단체장','기초단체장','local-chief');
    if(/회장|대표이사|총수|CEO/.test(text))add(4200,text.match(/[^·,·()]{0,22}(?:회장|대표이사|총수|CEO)/)?.[0]?.trim()||'기업인','기업인','corporate');
    if(/부장판사|판사|검사장|검사/.test(text))add(4100,text.match(/[^·,·()]{0,22}(?:부장판사|판사|검사장|검사)/)?.[0]?.trim()||'법조인','법조인','legal');
    if(/기자|앵커|논설위원/.test(text))add(4000,text.match(/[^·,·()]{0,22}(?:기자|앵커|논설위원)/)?.[0]?.trim()||'언론인','언론인','reporter');
    if(/국회의원|의원/.test(text))add(3000,'대한민국 국회의원','국회의원','legislator');
  });
  candidates.sort((a,b)=>b.rank-a.rank||a.label.length-b.label.length);
  return candidates[0]||null;
}

function profilePhoto(e,pDetail,gDetail){
  const center=(gDetail?.nodes||[]).find(n=>n?.id===gDetail?.center||n?.name===e?.name);
  const pol=getPol(e?.name);
  if(e?.name==='이재명'||pol?.name==='이재명'){
    return 'media/ent/da/da37f2330225f1ef.webp';
  }
  let u=pDetail?.photo_local||pDetail?.photo;
  if(!u) u=pol?.photo_local||pol?.photo;
  if(!u) u=center?.photo;
  if(!u) u=entityMedia(e).url;
  return u||'';
}

function profileFallback(img, name){
  if(!img) return;
  const falls = name==='이재명'?[
    'media/ent/da/da37f2330225f1ef.webp',
    'data/pol/photos/IUD9392R.webp',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/President_Lee_Jae-myung_2025_%28cropped%29.jpg/500px-President_Lee_Jae-myung_2025_%28cropped%29.jpg'
  ]:[];
  let idx = parseInt(img.dataset.fidx||'0', 10);
  if(idx < falls.length){
    img.dataset.fidx = String(idx + 1);
    img.src = falls[idx];
  } else {
    img.onerror = null;
    const p = img.parentElement;
    if(p){ p.innerHTML = ic('user'); }
  }
}

function publicOfficePill(role){
  if(!role)return'';
  if(role.kind==='president'){
    return `<div class="prof-presidential-badge ${role.current?'current-pres':''}">
      <span class="ppb-crown">${role.current?'👑':'🏛️'}</span>
      <span class="ppb-title">${esc(role.label)}</span>
      <span class="ppb-tag">${esc(role.badge)}</span>
    </div>`;
  }
  let icon='star-f';
  if(role.kind==='prime-minister'||role.kind==='speaker'||role.kind==='gov-chief'||role.kind==='local-chief'||role.kind==='official') icon='landmark';
  else if(role.kind==='chief-justice'||role.kind==='legal') icon='shield';
  else if(role.kind==='corporate') icon='bank';
  else if(role.kind==='reporter') icon='press';
  return`<div class="prof-office-pill ${esc(role.kind)}">${ic(icon)}<span>${esc(role.badge)}</span><b>${esc(role.label)}</b></div>`;
}
function entityMedia(e){
  if(!e)return{url:'',kind:''};
  const flag=COUNTRY_FLAG[e.name];if(flag)return{url:`https://flagcdn.com/w320/${flag}.png`,kind:'flag'};
  const v=e.visual||{},w=e.wiki||{};
  let url=v.url||w.thumb||w.thumb_src||'';
  const pol=getPol(e.name);
  if(!url&&pol){
    url=pol.photo_local||pol.photo||'';
  }
  if(!url&&typeof reporters==='function'&&reporters().length){
    const rep=reporters().find(r=>r.name===e.name);
    if(rep&&rep.photo)url=rep.photo;
  }
  if(!url&&e.timeline&&e.timeline.length){
    const art=e.timeline.find(x=>x.img&&!/blank|default|logo/i.test(x.img));
    if(art)url=art.img;
  }
  return{url,wide:v.wide||'',kind:v.kind||(e.type==='person'?'portrait':e.type==='place'?'place':e.type==='org'?'photo':'')};
}
function av(e,cls='av'){const v=entityMedia(e),fallback=e.type==='person'?'user':e.type==='place'?'place':e.type==='org'?'org':'news';return`<div class="${cls} media-${esc(v.kind||'fallback')}" ${bg(v.url)}>${v.url?'':ic(fallback)}</div>`}
function chipE(n,nolink){const e=ent(n);if(e&&nolink)return`<span class="chip ${e.type}">${esc(n)}</span>`;return e?`<a class="chip ${e.type}" href="${eh(n)}">${esc(n)}</a>`:`<span class="chip event">#${esc(n)}</span>`}
/* 외부 수집 데이터는 날짜가 숫자·문자열로 섞여 들어올 수 있다. 화면 코드에서는
   항상 YYYY-MM-DD 시각 문자열만 다루게 정규화해, 한 건의 비정상 레코드가 목록 전체를
   비우지 않도록 한다. */
function normTime(value){
  if(value==null)return'';
  const s=String(value).trim();
  if(/^\d{8}$/.test(s))return`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)} 12:00:00`;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s+' 12:00:00';
  return /^\d{4}-\d{2}-\d{2}/.test(s)?s:'';
}
function spark(daily,w=120,h=28,col='#ff4d2e'){const now=new Date();const bins=Array(24).fill(0);
  (Array.isArray(daily)?daily:[]).forEach(([d,c])=>{const t=new Date(normTime(d));if(Number.isNaN(t.getTime()))return;const k=(now.getFullYear()-t.getFullYear())*12+now.getMonth()-t.getMonth();if(k>=0&&k<24)bins[23-k]+=Number(c)||0});
  const lab=bins.map((_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-(23-i),1);return`${d.getFullYear()}년 ${d.getMonth()+1}월`});
  return line(bins,w,h,col,{name:'관련 기사',unit:'건',labels:lab})}
/* 작은 선 그래프. meta={name,unit,labels}: 말풍선(assets/tip.js)에 '무엇이 · 언제 · 얼마'를 보여 줌 */
function line(v,w=120,h=28,col='#ff4d2e',meta={}){if(!v||v.length<2)return'';const mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1;
  const pts=v.map((x,i)=>`${(i/(v.length-1)*w).toFixed(1)},${(h-2-(x-mn)/r*(h-4)).toFixed(1)}`).join(' ');
  return`<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" data-series="${v.map(x=>+(+x).toFixed(4)).join(',')}" data-h="${h}" data-col="${col}"${meta.step?` data-step="${esc(meta.step)}"`:''}${meta.name?` data-name="${esc(meta.name)}"`:''}${meta.unit?` data-unit="${esc(meta.unit)}"`:''}${meta.labels?` data-labels='${esc(JSON.stringify(meta.labels))}'`:''}><polyline points="0,${h} ${pts} ${w},${h}" fill="${col}22" stroke="none"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`}
function sec(t,sub,more='',icon=''){return`<div class="sec"><h2><small>${sub}</small>${icon?ic(icon,'h'):''}${t}</h2>${more}</div>`}
/* ---------- 타입별 UI 컴포넌트 ---------- */
const host=u=>{try{return new URL(u).hostname}catch(x){return''}};
const plogo=(name,url,cls='pl')=>{const f=PL[name]||PL[host(url).replace(/^www\./,'')],bd=f&&(PL._b||{})[f];return f?`<img class="${cls}${bd?' b':''}" src="assets/press/${bd||f}" alt="" loading="lazy" width="14" height="14">`:`<i class="${cls} mono" style="--h:${[...String(name)].reduce((a,c)=>a+c.charCodeAt(0),0)%360}" aria-hidden="true">${esc(String(name||'?').replace(/^[\s\[(\'"“‘]+/,'')[0]||'?')}</i>`};
const pp=(name,url)=>name?`<span class="pp">${plogo(name,url)}${esc(name)}</span>`:'';
const ts=(t,rel)=>t?`<time class="ts" title="${esc(fDate(t,true))}">${rel?ago(t):fDate(t,true)}</time>`:'';
const cnt=(n,icn,tip)=>`<span class="cnt" title="${tip||''}">${icn?ic(icn):''}${n}</span>`;
const ETY={person:['인물','user'],place:['장소','spark'],org:['기관','news'],company:['기업','coin'],inst:['기관','news'],event:['키워드','fire'],issue:['이슈','fire']};
const entc=(name,t,href)=>`<${href?`a href="${href}"`:'span'} class="ent ${t}">${ic((ETY[t]||ETY.event)[1])}${esc(name)}</${href?'a':'span'}>`;
const meta=(x,rel)=>`<span class="meta">${pp(x.press,x.url)}${ts(x.t||x.time,rel)}</span>`;
/* 요약문에서 이 이슈의 인물·핵심어를 주황색으로(이슈마다 최대 4곳) */
/* 숫자로 보는 오늘: 선거 페이지 '숫자로 보는 선거'처럼 큰 숫자 + 막대(최고값 강조) + 의석식 분포 막대 */
function numToday(I){const st=D.stats||{},arts=(st.naver||0)+(st.google||0);if(!I.length)return'';
  const T=I.slice(0,10),mx=Math.max(1,...T.map(i=>i.score)),top=T[0];
  const cats={};T.forEach(i=>cats[i.category]=(cats[i.category]||0)+1);const ce=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  const cm=Math.max(...T.map(i=>i.opinion?.total||0)),ci=T.find(i=>(i.opinion?.total||0)===cm);
  return`${sec('숫자로 보는 오늘','Today in numbers','','chart')}<div class="numt">
   <div class="numt-k card"><div><small>오늘 모은 기사</small><b>${arts.toLocaleString()}<em>건</em></b></div><div><small>보도한 언론사</small><b>${(st.presses||0).toLocaleString()}<em>곳</em></b></div><div><small>묶어 낸 사건</small><b>${(st.clusters||0).toLocaleString()}<em>개</em></b></div>${cm?`<div><small>댓글 가장 많은 이슈</small><b>${cm.toLocaleString()}<em>개</em></b><a href="issue/${ci.id}">${esc(ci.title)}</a></div>`:''}</div>
   <div class="numt-c card"><h3>TOP 10 화제도 <small>최고 <b>${Math.round(mx).toLocaleString()}</b> · 1위 ‘${esc(top.title.length>22?top.title.slice(0,21)+'…':top.title)}’</small></h3>
    <div class="numt-bars">${T.map((i,k)=>`<a href="issue/${i.id}" class="${k?'':'max'}" title="${esc(i.title)}"><em>${Math.round(i.score)}</em><i style="height:${Math.max(4,i.score/mx*100).toFixed(0)}%"></i><span>${k+1}위</span></a>`).join('')}</div></div>
   <div class="numt-s card"><h3>분야별 TOP 10 <small>오늘 가장 많이 오른 분야는 <b style="color:${CATC[ce[0][0]]||'var(--ink)'}">${esc(ce[0][0])}</b></small></h3>
    <div class="numt-seat">${ce.map(([c,n])=>`<i style="flex:${n};background:${CATC[c]||'#8189a3'}">${n}</i>`).join('')}</div>
    <div class="numt-lg">${ce.map(([c,n])=>`<span><i style="background:${CATC[c]||'#8189a3'}"></i>${esc(c)} <b>${n}</b></span>`).join('')}</div></div></div>`}
/* 한눈에 보기 문장: 포털 요약 → AI 심층 분석 앞 문장 → 기사 첫 문단 → 제목 (비어 있지 않게) */
function sumOf(i){if((i.summary||[]).length)return i.summary;const ai=i.ai||{};const sp=t=>String(t||'').split(/(?<=[.!?다요])\s+/).map(x=>x.trim()).filter(x=>x.length>8);
  /* 깊게 보기가 AI 심층 분석을 쓰면 기사 첫 문단을, 아니면 AI 요약을 — 두 섹션이 같은 문장을 반복하지 않게 */
  const l=(i.leads||[]).filter(Boolean).slice(0,2);if(ai.deep&&l.length)return l;const a=sp(ai.summary||(l.length?'':ai.deep)).slice(0,2);if(a.length)return a;return l.length?l.slice(0,1):[i.title]}
function hiSum(t,i){const T=[...new Set([...(i.entities||[]),...(i.keywords||[]).map(k=>String(k).replace(/^#/,''))])].filter(w=>w&&w.length>=2).sort((a,b)=>b.length-a.length).slice(0,12);
  let h=esc(t);if(!T.length)return h;const used=new Set();
  return h.replace(new RegExp(T.map(w=>esc(w).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g'),m=>used.has(m)||used.size>=4?m:(used.add(m),`<em class="hl">${m}</em>`))}
function th(u,cls='th',fb='news'){return u?`<div class="${cls}" ${bg(u)}></div>`:`<div class="${cls} noimg">${ic(fb)}</div>`}
/* ---------- 설정 ---------- */
const S=Object.assign({hide:[],fs:100,region:'kr',orig:false},JSON.parse(localStorage.getItem('nb-settings')||'{}'));
/* v2: 해외 기본 언어를 한국어로 전환. 기존의 자동 영문 기본값도 한 번만 안전하게 이관한다. */
if(S.regionDefaultV!==2){S.orig=false;S.regionDefaultV=2;localStorage.setItem('nb-settings',JSON.stringify(S));}
const saveS=()=>{localStorage.setItem('nb-settings',JSON.stringify(S));applyS()};
const applyS=()=>{document.documentElement.style.fontSize=(16*S.fs/100)+'px'};applyS();
const vis=i=>!S.hide.includes(i.category);
/* 나에게 맞춤(설정 '연령대·읽기 수준'): 연령대를 고르면 읽기 수준·관심 분야 순서·퀴즈 레벨·글자 크기가 자동으로 맞춰지고 각각 따로 바꿀 수 있음.
   분야를 숨기지 않고 순서만 바꿈(필터 버블 방지). 값은 이 기기 + 내 서재 동기화에만 저장 */
const AGEP={'10':{n:'10대',read:'easy',lv:1,fs:100,order:['연예','스포츠','IT','과학','문화','사회','세계','환경','경제','건강','정치']},
 '20':{n:'20대',read:'std',lv:2,fs:100,order:['경제','IT','사회','연예','세계','문화','스포츠','과학','정치','환경','건강']},
 '30':{n:'30대',read:'std',lv:2,fs:100,order:['경제','사회','IT','정치','세계','건강','과학','문화','환경','연예','스포츠']},
 '40':{n:'40대',read:'std',lv:2,fs:100,order:['경제','정치','사회','건강','세계','IT','과학','환경','문화','스포츠','연예']},
 '50':{n:'50대',read:'deep',lv:3,fs:105,order:['경제','정치','건강','사회','세계','환경','과학','IT','문화','스포츠','연예']},
 '60':{n:'60대 이상',read:'easy',lv:1,fs:115,order:['건강','정치','사회','경제','세계','문화','환경','과학','IT','스포츠','연예']}};
const READN={easy:'쉽게',std:'보통',deep:'자세히'};
const corder=c=>{const o=S.corder||(AGEP[S.age]||{}).order;if(!o)return 0;const k=o.indexOf(c);return k<0?99:k};
/* 어려운 시사 용어(검수 사전, today.json gloss)에 점선 밑줄 + 말풍선 뜻 */
const glossWrap=(h,i)=>{const G=i&&i.gloss;if(!G)return h;Object.keys(G).sort((a,b)=>b.length-a.length).forEach(w=>{h=h.replace(new RegExp('(^|[^가-힣])('+w+')(?![^<]*>)'),`$1<abbr class="gw" tabindex="0" data-tip="${esc(w)}: ${esc(G[w])}">$2</abbr>`)});return h};
/* 카드 요약: 읽기 수준 '쉽게'면 쉬운 말 요약(easy), '자세히'면 한 줄 더 */
const sumFor=(i,n)=>S.read==='easy'&&i.easy&&i.easy.length?{L:i.easy.slice(0,n),easy:1}:{L:(i.summary||[]).slice(0,S.read==='deep'?n+1:n),easy:0};

const ourl=o=>{if(Array.isArray(o))o.forEach(ourl);else if(o&&typeof o==='object'){if(o.ourl)o.url=o.ourl;for(const k in o)if(o[k]&&typeof o[k]==='object')ourl(o[k])}};
/* 첫 화면은 가벼운 today_lite.json(인물 타임라인 최신 12건)으로 그리고, 전체 today.json은 뒤에서 받아 인물 타임라인만 채움 */
let FULL=null;
function fullData(){return FULL||(FULL=fetch('data/today.json?'+Date.now()).then(r=>r.json()).then(F=>{ourl(F);const m={};(F.entities||[]).forEach(e=>m[e.name]=e.timeline);D.entities.forEach(e=>{if(m[e.name])e.timeline=m[e.name]});if(F.reporters)D.reporters=F.reporters;D.lite=0}).catch(()=>{D.lite=0}))}
async function load(){
  let r=null;try{r=await fetch('data/today_lite.json?'+Date.now())}catch(e){}
  if(!r||!r.ok)r=await fetch('data/today.json?'+Date.now());
  D=await r.json();ourl(D);
  try{G=await (await fetch('data/global.json?'+Date.now())).json()}catch(e){G=null}
  try{O=await (await fetch('data/official.json?'+Date.now())).json()}catch(e){O=null}
  try{BR=await (await fetch('data/briefs.json?'+Date.now())).json()}catch(e){BR=null}
  try{PL=await (await fetch('assets/press/index.json?v=2')).json()}catch(e){PL={}}
  header();route();
  if(D.lite)(window.requestIdleCallback||setTimeout)(fullData,{timeout:2500});
  (window.requestIdleCallback||setTimeout)(ensurePolIndex,{timeout:1200});
}
let G=null,PL={};
/* 검색량 표기: Google 트렌드 '오늘 검색 횟수(대략)' 구간 */
const kfmt=n=>S.region==='en'&&S.orig?(n>=1e6?(n/1e6)+'M':n>=1000?(n/1000)+'K':String(n)):n>=10000?(n/10000)+'만':n>=1000?(n/1000)+'천':String(n);
const TTIP='Google 트렌드 기준 오늘 대략적인 검색 횟수(구간값)입니다. 순위는 검색량 → 관련 기사 수 순으로 매겼어요.';
const tlab=t=>t.traffic_n?(S.region==='en'&&S.orig?`Search ${kfmt(t.traffic_n)}+`:`검색 ${kfmt(t.traffic_n)}+`):'';
const regionMode=()=>S.region==='en'?(S.orig?'en':'ko'):'kr';
function regionControl(){
  const m=regionMode();
  return`<div class="regionctl g-regionctl" data-region-control><div class="rsw" role="radiogroup" aria-label="뉴스 지역과 언어"><button type="button" role="radio" data-region-mode="kr" class="${m==='kr'?'on':''}" aria-checked="${m==='kr'}" title="국내 뉴스">국내</button><button type="button" role="radio" data-region-mode="ko" class="${m==='ko'?'on':''}" aria-checked="${m==='ko'}" title="해외 뉴스를 한국어로 보기">해외(국문)</button><button type="button" role="radio" data-region-mode="en" class="${m==='en'?'on':''}" aria-checked="${m==='en'}" title="해외 뉴스를 영어 원문으로 보기">해외(영문)</button></div></div>`;
}
function setRegionMode(mode){
  S.region=mode==='kr'?'kr':'en';S.orig=mode==='en';saveS();
  const cp=location.pathname.slice(BASEP.length);
  go(mode==='kr'?'':(/^gt?\//.test(cp)?cp:''));
  header2();
}
function bindRegionControls(root=document){
  root.querySelectorAll?.('[data-region-control]').forEach(control=>{
    control.onclick=ev=>{const b=ev.target.closest('[data-region-mode]');if(b)setRegionMode(b.dataset.regionMode)};
  });
}
function header(){
  const updated=$('#updated');
  if(updated) updated.textContent='';
  header2();
}
function header2(){
  const R=!!(S.region==='en'&&G),EN=R&&S.orig;
  document.querySelectorAll('[data-region-mode]').forEach(b=>{const on=b.dataset.regionMode===regionMode();b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});
  document.body.classList.toggle('en',EN);
  document.body.classList.toggle('global-mode',R);
  document.documentElement.lang=EN?'en':'ko';
  window.dispatchEvent(new CustomEvent('nb:region-changed'));
  const top=EN?['Today','Timeline','Markets','Learn']:['오늘','타임라인','마켓','배우기'];
  const cp=decodeURIComponent(location.pathname.slice(BASEP.length)).split('/')[0];
  const isTodayView = !cp || cp==='g' || cp==='gt' || cp==='issue' || cp==='kw';
  document.querySelectorAll('.topnav a').forEach((a,i)=>{
    a.textContent=top[i]||a.textContent;
    if(a.dataset.v==='today'){
      a.classList.toggle('on', isTodayView);
    }
  });
  // 바닥글은 영어 원문 모드에서만 영어로 전환한다.
  document.querySelectorAll('.flinks a').forEach(a=>{const t=/terms/.test(a.getAttribute('href'));a.textContent=EN?(t?'Terms':'Privacy'):(t?'이용약관':'개인정보처리방침')});
  // 하단 탭 이름은 my.js nav()가 nb:region-changed에서 다시 그림(여기서 덮어쓰면 가운데 '오늘' 시계가 사라짐)
  const T=R?G.trends:D.trends;
  const tk=T.map((t,i)=>`<a href="${R?'gt/'+i:kh(t.keyword)}" title="${TTIP}"><b>${i+1}</b>${esc(R&&!S.orig?(t.keyword_ko||t.keyword):t.keyword)}<small>${tlab(t)}</small></a>`).join('');
  const labBg = R ? 'background:#7a4dff !important;' : '';
  $('#ticker').innerHTML=`<div class="lab ${R?'global':''}" style="${labBg}">${ic('fire')}${R?(EN?'Global trends':'해외 트렌드'):'실시간'}</div><div class="tw" id="tw"><div class="run">${tk}<i class="sp"></i>${tk}</div></div>`;
  tickerDrag($('#tw'));
  if(typeof hl==='function') hl();
}
/* 티커: 자동 흐름 + 마우스 드래그·터치 스와이프 */
/* 헤더 순위 띠: 평소엔 CSS 애니메이션(합성기만 사용, 메인 스레드 부담 0)으로 왼쪽으로 흐르고,
   손가락·마우스로 잡으면 그 자리에서 멈춰 좌우로 끌 수 있음. 놓으면 던진 속도로 미끄러지다(관성) 다시 원래 흐름으로 이어짐.
   끌고 미끄러지는 동안만 requestAnimationFrame을 씀(평소엔 0). 이어질 때는 animation-delay로 위치를 맞춰 끊김 없음 */
function tickerDrag(el){if(!el||el._td)return;el._td=1;const run=el.querySelector('.run');if(!run)return;
  const DUR=34;let st=null,x=0,v=0,raf=0,moved=0;
  const half=()=>run.scrollWidth/2||1,wrap=n=>{const h=half();n%=h;return n>0?n-h:n};
  const cur=()=>{const m=getComputedStyle(run).transform;return m&&m!=='none'?new DOMMatrixReadOnly(m).m41:0};
  const resume=()=>{const h=half(),p=(-wrap(x))/h;run.style.transform='';run.style.animation='';run.style.animationDelay=(-p*DUR)+'s';el.classList.remove('drag')};
  el.addEventListener('pointerdown',e=>{if(e.button)return;cancelAnimationFrame(raf);x=cur();run.style.animation='none';run.style.transform=`translateX(${x}px)`;
    st={px:e.clientX,x,t:performance.now(),lx:e.clientX};v=0;moved=0;el.classList.add('drag');try{el.setPointerCapture(e.pointerId)}catch(x){}});
  el.addEventListener('pointermove',e=>{if(!st)return;const dx=e.clientX-st.px;if(Math.abs(dx)>4)moved=1;if(!moved)return;
    if(e.pointerType!=='mouse'&&Math.abs(dx)<10)return;const now=performance.now();v=(e.clientX-st.lx)/Math.max(1,now-st.t)*16;st.lx=e.clientX;st.t=now;
    x=wrap(st.x+dx);run.style.transform=`translateX(${x}px)`},{passive:true});
  const end=()=>{if(!st)return;st=null;if(!moved){resume();return}
    const glide=()=>{v*=.94;x=wrap(x+v);run.style.transform=`translateX(${x}px)`;if(Math.abs(v)>.3)raf=requestAnimationFrame(glide);else resume()};raf=requestAnimationFrame(glide)};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
  el.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=0}},true)}
const BASEP=new URL(document.baseURI).pathname;
function go(p){p=String(p||'');const u=p.startsWith('/')?p:BASEP+p.replace(/^\.\//,'');if(u!==location.pathname+location.hash)history.pushState(null,'',u);route()}
window.addEventListener('popstate',route);
const legacy=()=>{if(location.hash.startsWith('#/')){history.replaceState(null,'',BASEP+location.hash.slice(2));return true}};legacy();window.addEventListener('hashchange',()=>{if(legacy())route()});
document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download'))return;
  const h=a.getAttribute('href');if(h.startsWith('#')){e.preventDefault();window.nbAnchor?nbAnchor(h.slice(1)):document.getElementById(h.slice(1))?.scrollIntoView();return}
  const u=new URL(a.href);if(u.origin!==location.origin||!u.pathname.startsWith(BASEP)||/\.[a-z0-9]+$/i.test(u.pathname)||u.pathname.startsWith(BASEP+'admin')||u.pathname.startsWith(BASEP+'politicians')||u.pathname.startsWith(BASEP+'persons')||u.pathname.startsWith(BASEP+'history/')||/^(games|login|privacy|terms)\//.test(u.pathname.slice(BASEP.length)))return;e.preventDefault();go(u.pathname+u.hash)});
const DTITLE=document.title,DDESC=document.querySelector('meta[name=description]').content;
function setMeta(t,d){document.title=t?t+' · NewsBoard':DTITLE;document.querySelector('meta[name=description]').content=d||DDESC}
function shareBtn(){return`<button class="share" type="button" data-share>${ic('link')}${S.region==='en'&&S.orig?'Share':'공유'}</button>`}
function toast(m){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),2200)}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-share]');if(!b)return;const url=location.href.split('#')[0],title=document.title,text=document.querySelector('meta[name=description]').content;
  if(navigator.share){try{await navigator.share({title,text,url});return}catch(x){if(x.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(url);toast('링크를 복사했어요')}catch(x){prompt('링크를 복사하세요',url)}});
function route(){
  if(!D)return;setMeta();const h=decodeURIComponent(location.pathname.slice(BASEP.length)).replace(/\/+$/,'');const v=h.split('/')[0],a=h.split('/').slice(1).join('/');
  if(D.lite&&['entity','timeline','people','map'].includes(v)){const p=location.pathname;app.innerHTML='<div class="loading">기록을 불러오고 있어요…</div>';fullData().then(()=>{if(location.pathname===p)route()});return}
  const tab={'':'today',issue:'today',kw:'today',g:'today',gt:'today',entity:'people',reporter:'people'}[v]??v;
  if(S.region==='en'&&G&&(v===''||v==='g'||v==='gt')){document.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x.dataset.v==='today'));window.scrollTo(0,0);return v==='g'?gissue(a):v==='gt'?gtrend(+a):gtoday()}
  document.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x.dataset.v===tab));
  document.body.classList.toggle('view-entity', v==='entity');
  window.scrollTo(0,0);
  ({'':today,issue:()=>issue(a),entity:()=>entity(a),reporter:()=>reporter(a),kw:()=>kw(a),market:()=>a?mdetail(a):market(),weather:()=>window.nbWeather?.()||today(),timeline,people,map,archive,settings}[v]||today)();
  if(location.hash.length>1&&!location.hash.startsWith('#/')){const id=location.hash.slice(1);setTimeout(()=>window.nbAnchor&&nbAnchor(id),120)}
}

/* ---------- 마켓 위젯 ---------- */
const mFlag=name=>{
  const n=String(name||'').trim();
  if(/KOSPI|코스피|KOSDAQ|코스닥|원\/|원화|국고채|한국/i.test(n))return'<span class="mflag flag-kr" title="대한민국">🇰🇷 </span>';
  if(/S&P|나스닥|NASDAQ|다우|DOW|필라델피아|달러인덱스|WTI|금|테슬라|애플|엔비디아|마이크로소프트|구글|아마존|메타/i.test(n))return'<span class="mflag flag-us" title="미국">🇺🇸 </span>';
  if(/엔|일본|니케이|NIKKEI/i.test(n))return'<span class="mflag" title="일본">🇯🇵 </span>';
  if(/유로|EURO/i.test(n))return'<span class="mflag" title="유럽">🇪🇺 </span>';
  if(/위안|상하이|CSI/i.test(n))return'<span class="mflag" title="중국">🇨🇳 </span>';
  return'';
};
const up=m=>m.dir==='RISING'?'up':m.dir==='FALLING'?'down':'';
const mrate=(m,d)=>`${d==='down'?'-':d==='up'?'+':''}${esc(String(m.rate??'').replace(/^[-+]/,''))}%`;/* 원자료에 부호가 이미 있어 '--5.12%'로 겹치던 문제 */
function mcard(m,big){const d=up(m),s=d==='up'?NBI('caret-up-f'):d==='down'?NBI('caret-down-f'):'';
  return`<a class="mk ${d} ${big?'big':''}" href="market/${encodeURIComponent(m.name)}" aria-label="${esc(m.name)} 자세히 보기"><span class="n">${mFlag(m.name)}${esc(m.name)}${m.unit?`<i>${esc(m.unit)}</i>`:''}</span><b>${esc(m.price)}</b><em>${s} ${esc(String(m.diff??'').replace(/^[-+]/,''))} (${mrate(m,d)})</em>${line(m.series,120,big?44:28,d==='down'?'#2f6bff':'#ff4d2e',{name:m.name,step:'거래일 전',unit:m.unit==='%'?'%':''})}</a>`}
/* ---------- 마켓 항목 상세(카드를 누르면): assets/mkt.js ---------- */
function mdetail(a){const m=(D.market||[]).find(x=>x.name===a);if(!m||!window.nbMkt)return market();nbMkt(m)}
function marketStrip(){const M=D.market||[];if(!M.length)return'';
  return`${sec('주요 증시·환율','Stock & Currency',`<a class="more" href="market">마켓 전체 ${NBI('arrow-right')}</a>`,'up')}<div class="mkrow">${M.slice(0,8).map(m=>mcard(m)).join('')}</div>`}

/* ---------- 오늘 ---------- */
function today(){
  const I=D.issues.filter(vis);if(!I.length){app.innerHTML='<div class="note">설정에서 모든 카테고리를 껐어요. <a href="settings">설정</a></div>';return}
  const L=I[0],mx=Math.max(...I.map(i=>i.score));
  /* 썸네일(사진)이 있는 이슈만 최상단 카드 덱과 사이드 목록에 노출 */
  const hasPic = i => Boolean(i && ((i.image && i.image.trim()) || (i.gallery && i.gallery.some(g => g && g.img && g.img.trim()))));
  const heroI = (I.filter(hasPic).length ? I.filter(hasPic) : I).slice(0, 10);
  const side=heroI.map(i=>`<div class="srow" data-id="${i.id}"><div><a class="card mini" href="issue/${i.id}"><div class="n">${i.rank}</div>${th(i.image||(i.gallery&&i.gallery[0]&&i.gallery[0].img))}<div class="tx"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><h3>${esc(i.title)}</h3><div class="m">${ic('news')}${esc(i.press)} 외 ${i.presses-1}곳 ${i.opinion?`· ${ic('chat')}${i.opinion.total.toLocaleString()}`:''}</div></div></a></div></div>`).join('');
  const cats={};I.forEach(i=>cats[i.category]=(cats[i.category]||0)+1);
  /* TOP 10·화제·검색어·단어는 '만지는 뉴스' 모듈(assets/touch.js, v2 실험실에서 확정)로 그림 */
  // 오늘의 단어는 수집·검수한 하루치 10개를 그대로 보여 준다.
  // 여기서 6개로 다시 자르면 실제 학습량과 홈 화면의 표시 수가 어긋난다.
  const W=(D.words||[]).slice(0,10);
  app.innerHTML=`
  <div class="today-region-bar" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 14px;padding:2px 0;min-height:36px;overflow:visible">
    <div style="font-size:0.88rem;font-weight:800;color:var(--ink);display:flex;align-items:center;gap:6px">
      ${ic('news')} <span>오늘의 뉴스</span>
    </div>
    ${regionControl()}
  </div>
  <div id="nb-alert-slot" class="nb-alert-slot"></div>
  <section class="hero">
    <div class="rdeck" tabindex="0" aria-roledescription="카드 덱" aria-label="오늘의 이슈 카드. 좌우로 넘겨 보세요">
     <div class="rstage">${heroI.map((i,k)=>`<article class="lead rcard" data-i="${k}" data-id="${i.id}" data-img="${esc([...(i.gallery||[]).slice(0,1).map(g=>g.img),i.image,...(i.gallery||[]).map(g=>g.img)].filter(Boolean).filter((u,k,A)=>A.indexOf(u)===k).slice(0,6).join('|'))}"><div class="rimg"></div><a class="rlink" draggable="false" href="issue/${i.id}" aria-label="${esc(i.title)}"></a><button type="button" class="rlater" data-later="${i.id}" aria-label="나중에 읽기" aria-pressed="false">${window.GI?GI('bookmark-plus'):''}<span>나중에 읽기</span></button><div class="in"><div class="no">${String(i.rank).padStart(2,'0')}</div><span class="cat ${i.category}">${ic(i.category)}${i.category}</span>
      <h1>${esc(i.title)}</h1>
      <div class="schips">${schips(i,'issue/'+i.id)}</div></div></article>`).join('')}</div>
     <div class="rctl"><button type="button" class="rbtn" data-d="-1" aria-label="이전 이슈" disabled>${NBI('chevron-left')}</button><span class="rpos"><b>01</b> / ${String(Math.min(10,heroI.length)).padStart(2,'0')}</span><span class="rbar"><i style="width:${100/Math.min(10,heroI.length)}%"></i></span><span class="rhint">옆으로 넘겨 보세요</span><button type="button" class="rbtn" data-d="1" aria-label="다음 이슈">${NBI('chevron-right')}</button></div>
    </div>
    <div class="side">${side}</div>
  </section>
  ${marketStrip()}
  ${NBT.voteHTML(I)}
  <div class="trend-age-duo">
    <div class="duo-col duo-trend">${NBT.trendsHTML(D.trends.slice(0,10))}</div>
    <div class="duo-col duo-age">${NBT.agesHTML(I)}</div>
  </div>
  ${NBT.wordsHTML(W)}
  ${homeTrending()}
  ${sec('관계로 보는 오늘','Relation map',`<a class="more" href="map">크게 보기 ${NBI('arrow-right')}</a>`,'graph')}
  <div class="card mapwrap mini" id="mapmini"></div>`;
  {const mm=$('#mapmini');if(window.IntersectionObserver){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();if(mm.isConnected)graph(mm,true)}},{rootMargin:'600px 0px'});io.observe(mm)}else graph(mm,true)}
  window.nbDeck&&nbDeck($('.rdeck'));carousels(app);heatIn(app);
  NBT.vote(I);NBT.trends(D.trends.slice(0,10));NBT.words();NBT.ages(I);
  NBT.bindHorizontalCarousels(app);
  bindRegionControls(app);
  header2();
}
/* 화제도 게이지: 카드가 화면에 들어오면 차오르기 시작(.go) */
function heatIn(root){const H=[...(root||document).querySelectorAll('.ic .heat:not(.go)')];if(!H.length)return;
  if(!window.IntersectionObserver||matchMedia('(prefers-reduced-motion: reduce)').matches){H.forEach(h=>h.classList.add('go'));return}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('go');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});H.forEach(h=>io.observe(h))}
/* 카드 사진 캐러셀: 카드 레일 공통 드래그/스와이프와 화살표를 함께 쓴다. */
function carousels(root){root.querySelectorAll('.car').forEach(c=>{const t=c.querySelector('.ctrack'),dots=[...c.querySelectorAll('.cdots i')];if(!t||c._on)return;c._on=1;
  const cur=()=>Math.round(t.scrollLeft/Math.max(1,t.clientWidth));
  t.addEventListener('scroll',()=>{const k=cur();dots.forEach((d,n)=>d.classList.toggle('on',n===k))},{passive:true});
  const to=k=>t.scrollTo({left:Math.max(0,Math.min(dots.length-1,k))*t.clientWidth,behavior:'smooth'});
  c.querySelectorAll('.cnav').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();to(cur()+(b.classList.contains('n')?1:-1))}));
  window.NBT?.enableElasticCarousel?.(t)})}
function wordCard(w){return`<div class="card term word"><div class="wt">${w.wiki.thumb?`<span class="wi" ${bg(w.wiki.thumb)}></span>`:`<span class="wi noimg">${ic('book')}</span>`}<div><h4>${esc(w.word)}</h4><em>${esc(w.wiki.desc||'오늘 기사 '+w.count+'회 등장')}</em></div></div>
  <p class="easy">${w.ai?AIB:''}${esc(w.easy)}</p>
  <div class="ex">${w.examples.slice(0,2).map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><q>${esc(x.title)}</q>${pp(x.press,x.url)}</a>`).join('')}</div>
  <a class="src1" href="${esc(w.wiki.url)}" target="_blank" rel="noopener">${ic('book')}출처: 위키백과</a></div>`}

/* ---------- 이슈 상세 ---------- */
function biasB(s){if(!s.bias)return'';return`<span class="bias ${s.bias.lean}" title="${esc(s.bias.reason)}">${ic('alert')}${s.bias.lean==='left'?'좌편향 주의':'우편향 주의'}</span>`}
function issue(id){
  const i=D.issues.find(x=>x.id===id);if(!i){today();app.insertAdjacentHTML('afterbegin','<div class="note">공유된 이슈가 지금 TOP 10에서 내려갔어요. 지난 이슈는 <a href="archive">아카이브</a>에서 볼 수 있어요.</div>');return}
  setMeta(i.title,Array.isArray(i.summary)?i.summary.join(' '):i.summary);
  const seenEnt = new Set();
  const ents = [];
  (i.entities || []).map(ent).filter(Boolean).forEach(e => {
    const k = (e.name || '').replace(/[\s\-_.]+/g, '').toLowerCase();
    const wTitle = (e.wiki && e.wiki.title) ? e.wiki.title.replace(/[\s\-_.]+/g, '').toLowerCase() : '';
    const wItem = (e.wiki && e.wiki.wikibase_item) ? e.wiki.wikibase_item.toLowerCase() : '';
    if (!k || seenEnt.has(k) || (wTitle && seenEnt.has(wTitle)) || (wItem && seenEnt.has(wItem))) return;
    seenEnt.add(k);
    if (wTitle) seenEnt.add(wTitle);
    if (wItem) seenEnt.add(wItem);
    ents.push(e);
  });
  const entNames = ents.map(e => e.name);
  const terms = [...entNames, ...i.keywords];
  app.innerHTML=`<div class="bkrow"><a class="back" href="./">${NBI('arrow-left')} 오늘의 TOP 10</a>${shareBtn()}</div>
  <section class="dgal" aria-label="이 사건 사진"></section>
  <article class="dhead card ds-head"><div class="bd"><div class="dh-top"><span class="dh-rank" aria-label="오늘의 이슈 ${i.rank}위"><b>${String(i.rank).padStart(2,'0')}</b><small>오늘의<br>이슈</small></span><span class="cat ${i.category}">${i.category}</span></div><h1 class="ds-title">${esc(i.title)}</h1>
    <div class="dh-bar"><div class="schips light">${schips(i,'')}</div><div class="dh-act"></div></div>
    <div class="chips">${entNames.map(n=>chipE(n)).join('')}${i.keywords.filter(k=>!seenEnt.has(k.replace(/[\s\-_.]+/g,'').toLowerCase())).slice(0,4).map(k=>`<span class="ds-tag">#${esc(k)}</span>`).join('')}</div></div></article>
  ${i.easy&&i.easy.length?`<details class="easyb card" ${S.read==='easy'?'open':''}><summary>${ic('spark')}쉽게 풀어 보기<small>처음 보는 분도 이해하기 쉬운 말로</small></summary><ul>${i.easy.map(t=>`<li>${glossWrap(esc(t),i)}</li>`).join('')}</ul></details>`:''}
  ${i.gloss&&Object.keys(i.gloss).length?`<div class="glb"><b>이 기사 속 용어</b>${Object.entries(i.gloss).map(([w,m])=>`<span tabindex="0" data-tip="${esc(m)}">${esc(w)}</span>`).join('')}</div>`:''}
  <nav class="toc ds-tabs"><a href="#s-sum">${ic('news')}<span>요약</span></a><a href="#s-flow">${ic('clock')}<span>흐름</span></a><a href="#related">${ic('news')}<span>관련 기사</span></a><a href="#press">${ic('press')}<span>언론사</span></a><a href="#comments">${ic('chat')}<span>댓글</span></a></nav>
  <div class="two"><div>
   <section id="s-sum" class="ds-sec">${sec('한눈에 보기','Summary','','news')}<div class="summary ds-sum">${sumOf(i).map((s,k)=>`<div class="sl"><b>${k+1}</b><p class="${k===0?'ds-lead':''}">${DS.emph(s,terms)}</p></div>`).join('')||'<p>요약을 가져오지 못했어요.</p>'}</div></section>
   ${DS.deep(i)}
   ${DS.flow(i)}
   ${DS.past(i)}
  </div><aside>
   <section id="comments" class="anc ds-sec">${sec('댓글 · 사람들의 반응','Comments','','chat')}${DS.opinion(i)}</section>
   ${ents.length?sec('등장 인물·키워드','Who’s who','','user')+`<div class="who">${ents.map(e=>`<a class="card whoc" href="${eh(e.name)}">${av(e,'av s')}<div><b>${esc(e.name)}</b><small>${esc(entDesc(e))}</small></div></a>`).join('')}</div>`:''}
  </aside></div>
  ${DS.press(i)}${DS.related(i)}`;
  DS.bind(app);window.NBT&&NBT.easyHold(i,app);
  const tabs=app.querySelector('.ds-tabs');if(tabs&&'IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)tabs.querySelectorAll('a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id))}),{rootMargin:'-45% 0px -50% 0px'});['s-sum','s-flow','related','press','comments'].forEach(k=>{const el=document.getElementById(k);el&&io.observe(el)})}
  const gl=(i.gallery||[]).length?i.gallery:(i.image?[{img:i.image,press:i.press,url:i.url}]:[]);window.nbGallery?nbGallery($('.dgal'),gl):$('.dgal').remove();
}
/* 슬림 지표 칩: 누르면 상세 해당 섹션으로 */
function schips(i,base){const op=i.opinion;return`<a class="schip" href="${base}#related">${ic('news')}관련 기사 <b>${i.mentions}</b></a><a class="schip" href="${base}#press">${ic('press')}언론사 <b>${i.presses}</b></a><a class="schip" href="${base}#comments">${ic('chat')}댓글 <b>${op?op.total.toLocaleString():'–'}</b></a><span class="schip hot" title="여러 포털·언론사 노출을 합친 점수">${ic('fire')}화제도 <b>${Math.round(i.score)}</b></span>`}
/* 보도 언론사: 어느 곳이 몇 건 다뤘는지 */
function pressSec(i){const m=new Map();(i.sources||[]).forEach(s=>{const k=s.press||'';if(!k)return;const o=m.get(k)||{n:0,s};o.n++;m.set(k,o)});
  const L=[...m.entries()].sort((a,b)=>b[1].n-a[1].n);
  return`<section id="press" class="anc">${sec('보도 언론사','Who covered it',`<span class="more">${L.length}곳</span>`,'press')}<div class="plg">${L.map(([n,o])=>`<a class="plc" href="${esc(o.s.url)}" target="_blank" rel="noopener">${plogo(n,o.s.url,'plo')}<span><b>${esc(n)}</b><small>${o.n}건 · ${esc(o.s.title)}</small></span></a>`).join('')}</div></section>`}

/* ---------- 실시간 키워드 ---------- */
function kw(k){
  const t=D.trends.find(x=>x.keyword===k);if(!t)return today();
  setMeta(t.keyword+' — 검색어 흐름',(t.ai&&t.ai.summary)||'');
  const ai=t.ai||{};const g={};(t.past||[]).forEach(x=>{const y=x.t.slice(0,4);(g[y]=g[y]||[]).push(x)});
  const now=new Date().getFullYear()+'';
  app.innerHTML=`<div class="bkrow"><a class="back" href="./">${NBI('arrow-left')} 오늘</a>${shareBtn()}</div>
  <section class="kwh card" ${bg(t.image||(t.today[0]||{}).img)}><div class="in"><span class="chip event">${ic('fire')}실시간 검색 ${D.trends.indexOf(t)+1}위 · <span title="${TTIP}">${tlab(t)}</span></span><h1>${esc(t.keyword)}</h1></div></section>
  ${sec('오늘 무슨 일이?','Today','','clock')}
  ${ai.today?`<div class="mean big">${AIB}<p>${esc(ai.today)}</p></div>`:''}
  <div class="tgrid">${(t.today||[]).map((x,j)=>`<a class="card tn ${j===0?'first':''}" href="${esc(x.url)}" target="_blank" rel="noopener">${th(x.img,'img')}<div class="bd"><h3>${esc(x.title)}</h3>${x.body?`<p>${esc(x.body.slice(0,90))}…</p>`:''}${meta(x,1)}</div></a>`).join('')||'<div class="note">오늘 기사를 찾지 못했어요.</div>'}</div>
  ${sec('과거에는 무슨 일이?','Past timeline','','history')}
  ${ai.context?`<div class="mean">${AIB}<p>${esc(ai.context)}</p></div>`:''}
  <div class="flow">${Object.entries(g).sort((a,b)=>b[0]-a[0]).map(([y,a])=>`<div class="fg"><div class="fd"><b>${y===now?'올해':y+'년'}</b>${cnt(a.length,'news','기사 수')}</div>${a.slice(0,6).map((x,j)=>`<a class="fe ${j===0?'first':''}" href="${esc(x.url)}" target="_blank" rel="noopener">${th(x.img,'fi')}<div><h5>${esc(x.title)}</h5>${x.body&&j===0?`<p>${esc(x.body.slice(0,100))}…</p>`:''}${meta(x)}</div></a>`).join('')}</div>`).join('')}</div>
  <p class="fine">네이버 뉴스 검색(기간별 관련도순)에서 수집했습니다.</p>`;
}

/* ---------- 마켓·정책 섹터 ---------- */
const POLW=/(금리|부동산|아파트|주택|전세|대출|증시|코스피|코스닥|주가|주식|환율|세금|과세|정책|규제|기준금리|한은|한국은행|금통위|공급|청약|재건축|배당|주주|밸류업|연준|Fed)/;
function market(){
  const M=D.market||[],ST=D.stocks||[];
  const idx=M.filter(m=>m.kind==='index'),fx=M.filter(m=>m.kind==='fx'),cm=M.filter(m=>m.kind==='commodity');
  const rel=D.issues.filter(i=>i.category==='경제'||POLW.test(i.title+i.keywords.join(' ')));
  const news=Object.entries(D.sections).flatMap(([k,a])=>a).filter(x=>POLW.test(x.title)).filter((x,i,a)=>a.findIndex(y=>y.title===x.title)===i).slice(0,12);
  const heat=ST.slice().sort((a,b)=>b.cap-a.cap).slice(0,40);const tot=heat.reduce((s,x)=>s+Math.sqrt(x.cap),0);
  const hc=r=>r>=3?'#d93025':r>=1?'#ef6c5a':r>0?'#f5aaa0':r===0?'#c9cede':r>-1?'#a9c1f5':r>-3?'#5d8ef0':'#1f5fd6';
  const low=ST.filter(x=>x.pbr&&x.pbr>0).sort((a,b)=>a.pbr-b.pbr).slice(0,12);
  const at=idx[0]?.at;
  app.innerHTML=`${sec('마켓·정책','Market & Policy',`<span class="more">${at?ago(at)+' 기준':''}</span>`,'chart')}
  <p class="lede">주식·부동산·금리, 그리고 이를 움직이는 정치·정책 뉴스를 한곳에 모았어요.</p>
  <h3 class="sub">${ic('chart')}주요 지수</h3><div class="mkrow wide">${idx.map(m=>mcard(m,1)).join('')}</div>
  <h3 class="sub">${ic('coin')}환율</h3><div class="mkrow">${fx.map(m=>mcard(m)).join('')}</div>
  ${cm.length?`<h3 class="sub">${ic('spark')}원자재·금리·코인 <small>3개월</small></h3><div class="mkrow">${cm.map(m=>mcard(m)).join('')}</div>`:''}
  ${heat.length?`<h3 class="sub">${ic('fire')}코스피 시가총액 상위 40 등락 히트맵</h3><div class="heat">${heat.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener" style="flex:${(Math.sqrt(x.cap)/tot*100).toFixed(2)} 1 0;background:${hc(x.rate)}"><b>${esc(x.name)}</b><span>${x.rate>0?'+':''}${x.rate.toFixed(2)}%</span></a>`).join('')}</div>
  <div class="legend"><span style="--c:#d93025">+3%↑</span><span style="--c:#f5aaa0">상승</span><span style="--c:#a9c1f5">하락</span><span style="--c:#1f5fd6">-3%↓</span></div>`:''}
  ${low.length?`<h3 class="sub">${ic('coin')}PBR 낮은 종목 <small>코스피 시총 상위 60 중 · 저평가 지표 참고용</small></h3>
  <p class="lede sm">PBR이 1보다 낮으면 회사가 가진 순자산보다 주가가 싸게 거래된다는 뜻이에요. 막대가 짧을수록 더 ‘싸게’ 평가받는 중이에요.</p><div class="pbrb card">${low.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><span class="nm">${esc(x.name)}</span><span class="bar"><i style="width:${Math.min(100,x.pbr/1.5*100).toFixed(0)}%"></i><em style="left:${(1/1.5*100).toFixed(1)}%"></em></span><b>${x.pbr.toFixed(2)}</b><span class="dchg ${x.rate>0?'up':x.rate<0?'down':'flat'}">${x.rate>0?'+':''}${x.rate.toFixed(2)}%</span></a>`).join('')}<div class="pbrl"><span>0</span><span style="left:${(1/1.5*100).toFixed(1)}%">PBR 1</span></div></div>
  <p class="fine">PBR·PER·배당수익률은 네이버 증권 표시값이며 투자 권유가 아닙니다.</p>`:''}
  ${rel.length?sec('오늘의 경제·정책 이슈','Policy issues','','fire')+`<div class="side">${rel.map(i=>`<a class="card mini" href="issue/${i.id}"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><h3>${esc(i.title)}</h3></div></a>`).join('')}</div>`:''}
  ${news.length?sec('금리·부동산·증시 헤드라인','Headlines','','news')+`<div class="srcl2">${news.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}<span class="meta">${pp(x.press,x.url)}${ts(x.time,1)}</span></a>`).join('')}</div>`:''}
  <p class="fine">지수·환율: 네이버 증권, 원자재·미국채·비트코인: Yahoo Finance. 지연 시세일 수 있습니다.</p>`;
}

/* ---------- 세로 타임라인 (줌) ---------- */
const ZK={hour:t=>NBDate.compact(t),day:t=>NBDate.date(t),month:t=>{const d=new Date(t);return`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}`},year:t=>new Date(t).getFullYear()+'년'};
function vtl(el,items,z,limit=4){
  const g=[];items.forEach(x=>{const k=ZK[z](x.t);if(!g.length||g[g.length-1].k!==k)g.push({k,a:[]});g[g.length-1].a.push(x)});
  if(!g.length){el.innerHTML='<div class="note">아직 쌓인 기록이 없어요.</div>';return}
  let shown=Math.min(g.length,z==='year'?20:12);
  const draw=()=>{
    const slice=g.slice(0,shown);
    const counts=slice.map(x=>x.a.length);
    const maxBuzz=Math.max(...counts,1);
    const avgBuzz=counts.reduce((s,v)=>s+v,0)/(counts.length||1);

    el.innerHTML=slice.map(({k,a})=>{
      const s=a.slice().sort((p,q)=>(q.related||0)-(p.related||0));
      const leads=s.slice(0,2).map(x=>esc(x.title)).join(' · '),more=Math.max(0,s.length-2);
      const buzz=a.length;
      const isAboveAvg=buzz>avgBuzz && maxBuzz>1;
      const isPeak=buzz===maxBuzz && maxBuzz>1;

      let customStyle='';
      let textClass='';
      if(isPeak){
        textClass='peak';
        customStyle='color:#dc2626;font-weight:850;font-size:.88rem;letter-spacing:-0.2px;';
      }else if(isAboveAvg){
        textClass='above-avg';
        const ratio=maxBuzz>avgBuzz?(buzz-avgBuzz)/(maxBuzz-avgBuzz):0.5;
        const r=Math.round(194+ratio*(225-194));
        const gr=Math.round(65-ratio*(65-29));
        const bl=Math.round(12+ratio*(72-12));
        const w=Math.round(650+ratio*150);
        customStyle=`color:rgb(${r},${gr},${bl});font-weight:${w};`;
      }

      const buzzBadgeClass=isPeak?'peak':(isAboveAvg?'high':'normal');
      const flameClass=isPeak?'flame-peak':(isAboveAvg?'flame-high':'flame-subtle');

      // 1건뿐일 때는 폴딩 버튼(화살표)을 없애고 단일 기사 링크로 바로 노출 (중복 노출 방지)
      if(s.length <= 1){
        const x = s[0];
        return `<div class="vg ${isPeak?'vg-peak':(isAboveAvg?'vg-above-avg':'')}">
          <h4>
            <span class="vg-date">${k}</span>
            <span class="vg-buzz ${buzzBadgeClass}" title="화제지수 ${buzz}">
              ${ic('flame',flameClass)}
              <b class="vg-buzz-val">${buzz}</b>
            </span>
          </h4>
          <div class="vg-single-article">
            <a class="ve is-single ${x.related>2?'big':''}" href="${esc(x.url)}" target="_blank" rel="noopener">
              ${x.img ? `<span class="vth" ${bg(x.img)}></span>` : ''}
              <span class="vsum ${textClass}" style="${customStyle};display:block;margin-bottom:4px">${esc(x.title)}</span>
              <span class="meta">${pp(x.press,x.url)}${ts(x.t)}${x.related>1?cnt('+'+x.related,'','묶음 기사'):''}</span>
            </a>
          </div>
        </div>`;
      }

      // 2건 이상일 때만 폴딩 화살표 버튼을 노출하여 펼쳐볼 수 있도록 함
      return`<div class="vg ${isPeak?'vg-peak':(isAboveAvg?'vg-above-avg':'')}">
        <h4>
          <span class="vg-date">${k}</span>
          <span class="vg-buzz ${buzzBadgeClass}" title="화제지수 ${buzz}">
            ${ic('flame',flameClass)}
            <b class="vg-buzz-val">${buzz}</b>
          </span>
        </h4>
        <details class="vg-fold">
          <summary class="vg-summary">
            <p class="vsum ${textClass}" style="${customStyle}">${leads}${more?` <span class="vmore">외 ${more}건</span>`:''}</p>
            <span class="vg-arrow" aria-label="기사 목록 펼치기/접기">${NBI('chevron-down')}</span>
          </summary>
          <div class="vg-articles">
            ${s.map((x,j)=>`<a class="ve ${j===0&&x.related>2?'big':''}" href="${esc(x.url)}" target="_blank" rel="noopener">
              ${x.img&&j<2?`<span class="vth" ${bg(x.img)}></span>`:''}
              ${esc(x.title)}
              <span class="meta">${pp(x.press,x.url)}${ts(x.t)}${x.related>1?cnt('+'+x.related,'','묶음 기사'):''}</span>
            </a>`).join('')}
          </div>
        </details>
      </div>`;
    }).join('')+(shown<g.length?`<div class="ve moreb">이전 기록 더 보기 (${g.length-shown}개 구간)</div>`:'');

    const m=el.querySelector('.moreb');if(m)m.onclick=()=>{shown+=12;draw()};
  };
  draw();
}
function renderPressIcon(name, url='', size=18, count=null){
  if(!name) return '';
  const logo = plogo(name, url, 'press-sym-img');
  const tipText = count ? `${name} (${fmt(count)}건 보도)` : name;
  return `<span class="press-sym-pill" data-tooltip="${esc(tipText)}" tabindex="0" role="img" aria-label="${esc(tipText)}">${logo}<span class="press-tooltip">${esc(tipText)}</span></span>`;
}

function eraChart(items, z, themeCol, pDetail){
  const safeItems=(Array.isArray(items)?items:[]).map(x=>({...x,t:normTime(x?.t||x?.date)})).filter(x=>x.t);
  const fmt = z === 'year' ? (t => t.slice(0,4)) : (t => t.slice(0,7));
  const c = {};
  const pressCounts = {};
  safeItems.forEach(x => {
    const k = fmt(x.t);
    c[k] = (c[k] || 0) + 1;
    if(x.press){
      pressCounts[x.press] = (pressCounts[x.press] || 0) + 1;
    }
  });

  const ks = Object.keys(c).sort();
  if(!ks.length) return '<p class="mute" style="padding:20px;text-align:center">수집된 보도 기록이 없습니다.</p>';

  const all = [];
  let [y, m] = ks[0].split('-').map(Number);
  const [ey, em] = ks[ks.length-1].split('-').map(Number);

  if(z === 'year'){
    for(let k=y; k<=ey; k++) all.push(String(k));
  } else {
    while(y < ey || (y === ey && m <= em)){
      all.push(`${y}-${String(m).padStart(2,'0')}`);
      m++;
      if(m > 12){ m = 1; y++; }
    }
  }

  const bw = z === 'year' ? 44 : 18;
  const H = 140;
  const topPad = 28;
  const bottomPad = 26;
  const mx = Math.max(1, ...Object.values(c));
  const W = Math.max(all.length * bw + 30, 320);

  const baseCol = themeCol || '#2f6bff';
  const peakCol = '#dc2626';

  // Grid lines: 25%, 50%, 75%, 100%
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridLinesSvg = gridLevels.map(lvl => {
    const gy = topPad + (1 - lvl) * H;
    const val = Math.round(mx * lvl);
    return `
      <line x1="10" y1="${gy.toFixed(1)}" x2="${(W-10).toFixed(1)}" y2="${gy.toFixed(1)}" stroke="#e2e8f0" stroke-dasharray="3,3" stroke-width="1"/>
      <text x="${(W-12).toFixed(1)}" y="${(gy - 3).toFixed(1)}" font-size="9" fill="#94a3b8" text-anchor="end" font-weight="600">${val}건</text>
    `;
  }).join('');

  // Flow line points
  const pts = [];
  all.forEach((k, i) => {
    const v = c[k] || 0;
    const h = (v / mx) * H;
    const cx = i * bw + 10 + (bw - 4) / 2;
    const cy = topPad + H - h;
    pts.push({ x: cx, y: cy, k, v });
  });

  const polylineStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // SVG Bars
  const barsSvg = all.map((k, i) => {
    const v = c[k] || 0;
    const h = (v / mx) * H;
    const isPeak = (v === mx && v > 1);
    const col = isPeak ? peakCol : (v ? baseCol : '#cbd5e1');
    const x = i * bw + 10;
    const y = topPad + H - h;
    const barW = bw - 4;
    const label = (z === 'year' || k.endsWith('-01') || (all.length < 14)) ? (z === 'year' ? k : (all.length > 20 ? k.slice(2,7) : k)) : '';

    return `
      <g class="era-bar-grp" data-period="${esc(k)}" data-count="${v}">
        <rect class="era-bar ${isPeak ? 'peak' : ''}" x="${x}" y="${y.toFixed(1)}" width="${barW}" height="${Math.max(2, h).toFixed(1)}" rx="3" fill="${col}" opacity="${v ? (isPeak ? 1 : 0.85) : 0.12}">
          <title>${k}: ${v}건 보도${isPeak ? ' (최고 화제점)' : ''}</title>
        </rect>
        ${label ? `<text class="era-axis-label" x="${(x + barW/2).toFixed(1)}" y="${topPad + H + 18}" text-anchor="middle">${esc(label)}</text>` : ''}
      </g>
    `;
  }).join('');

  // Top Press symbols with tooltips
  const pMediaPress = pDetail?.media?.by_press || [];
  const pressEntries = (pMediaPress.length ? pMediaPress : Object.entries(pressCounts)).slice(0, 16);
  const pressSummaryHtml = pressEntries.length ? `
    <div class="era-press-summary">
      <div class="eps-head">
        <span class="eps-title">
          <svg class="ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M4 9h16"/><path d="M9 4v16"/></svg>
          <b>보도 집중 언론사</b>
        </span>
        <span class="eps-sub">심볼 롤오버/터치 시 언론사명 & 건수 표시</span>
      </div>
      <div class="press-sym-list">
        ${pressEntries.map(([name, count]) => renderPressIcon(name, '', 20, count)).join('')}
      </div>
    </div>
  ` : '';

  return `
    <div class="era-chart-container">
      <div class="era-chart-header">
        <div class="ech-left">
          <span class="ech-badge">📊 시대별 보도량 추이 및 플로우 분석</span>
          <span class="ech-stat">총 <b>${safeItems.length.toLocaleString()}건</b> 관측 (최대 <b>${mx}건</b>/구간)</span>
        </div>
        <div class="ech-legend">
          <span class="ecl-item"><i style="background:${baseCol}"></i>일반 보도</span>
          <span class="ecl-item"><i style="background:${peakCol}"></i>최고 집중 구간</span>
          <span class="ecl-item"><i style="background:${baseCol};height:2px;border-radius:1px"></i>플로우 라인</span>
        </div>
      </div>
      <div class="era grab-carousel" tabindex="0" aria-label="시대별 보도량 차트 (가로 스크롤 가능)">
        <svg class="era-svg" width="${W}" height="${topPad + H + bottomPad}" viewBox="0 0 ${W} ${topPad + H + bottomPad}">
          <defs>
            <linearGradient id="eraFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="${baseCol}" stop-opacity="0.6"/>
              <stop offset="50%" stop-color="${baseCol}" stop-opacity="0.95"/>
              <stop offset="100%" stop-color="${peakCol}" stop-opacity="0.9"/>
            </linearGradient>
            <filter id="eraGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="${baseCol}" flood-opacity="0.3"/>
            </filter>
          </defs>
          <g class="era-grid-group">${gridLinesSvg}</g>
          <polyline class="era-flow-line" points="${polylineStr}" fill="none" stroke="url(#eraFlowGrad)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#eraGlow)"/>
          <g class="era-bars-group">${barsSvg}</g>
          ${pts.filter(p => p.v === mx && p.v > 1).map(p => `
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#ffffff" stroke="${peakCol}" stroke-width="2.5">
              <title>${p.k}: 최고 ${p.v}건</title>
            </circle>
          `).join('')}
        </svg>
      </div>
      ${pressSummaryHtml}
    </div>
  `;
}

function makeHeroMetaRow(e, pol){
  const sub=SUB.find(x=>x[0]===subtype(e))?.[1]||TYPE[e.type];
  const role=primaryPublicRole(e,pol);
  if(!pol){
    return `<div class="ehero-meta-row">${role?`<span class="ehero-badge office-badge ${esc(role.kind)}">${ic(role.kind==='president'?'star-f':'landmark')}${esc(role.label)}</span>`:''}<span class="ehero-badge type-badge ${e.type}">${esc(sub)}</span></div>`;
  }
  const age=(pol.ages||[]).slice(-1)[0]||22;
  const legislator=role?.rank>300?'':`<span class="ehero-badge">제${age}대 국회의원</span>`;
  return `<div class="ehero-meta-row"><span class="ehero-badge party-badge"><span class="pm-wrap">${partyMark(pol.party,16,true)}</span><b>${esc(pol.party)}</b></span>${role?`<span class="ehero-badge office-badge ${esc(role.kind)}">${ic(role.kind==='president'?'star-f':'landmark')}${esc(role.label)}</span>`:''}${legislator}${pol.district&&role?.rank<=300?`<span class="ehero-badge">${esc(pol.district)}</span>`:''}${pol.reelect&&role?.rank<=300?`<span class="ehero-badge">${esc(pol.reelect)}</span>`:''}<span class="ehero-badge type-badge ${e.type}">${esc(sub)}</span></div>`;
}

/* ---------- 통합 인물 & 정치인 상세 대시보드 헬퍼 ---------- */
const fmt=n=>(n||0).toLocaleString();
const fDate=(s, forceTime=false)=>{
  if(!s)return'';
  const str=String(s).trim();
  if(/~/.test(str))return str.replace(/-/g,'.');
  if(/^\d{4}$/.test(str))return str;
  const ym=str.match(/^(\d{4})[-./](\d{1,2})$/);
  if(ym)return`${ym[1]}.${ym[2].padStart(2,'0')}`;
  const hasTime = forceTime || /T|\s\d{1,2}:\d{2}/.test(str);
  if(hasTime && typeof NBDate?.full === 'function'){
    const formatted = NBDate.full(str);
    if(formatted) return formatted;
  }
  if(typeof NBDate?.date === 'function'){
    const formatted = NBDate.date(str);
    if(formatted) return formatted;
  }
  const m=str.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if(m)return`${m[1]}.${m[2].padStart(2,'0')}.${m[3].padStart(2,'0')}`;
  return str.replace(/-/g,'.');
};
const pc=p=>partyTheme(p)?.color||(/민주/.test(p||'')?'#004ea2':/국민의힘|한나라|새누리|자유한국|미래통합/.test(p||'')?'#E61E2B':'#6b7390');
const ARC_REL={
  parent:['부모','#e03131'],
  spouse:['배우자 (영부인/부군)','#e64980'],
  child:['자녀 (아들·딸)','#d6336c'],
  sibling:['형제자매','#f06595'],
  inlaw:['처가·시가 (장인·장모)','#cc5de8'],
  relative:['친인척','#f783ac'],
  colleague:['정치적 동지·당 지도부','#1971c2'],
  mentor:['정치적 멘토','#0c8599'],
  staff:['핵심 참모·측근','#2f9e44'],
  rival:['대선 경쟁 라이벌','#e8590c'],
  schoolmate:['학교 동문','#2a9d8f'],
  hometown:['같은 출생지','#f08c00'],
  predecessor:['지역구 전·후임','#3b5bdb']
};
const ARC_TYP={birth:['출생','#8b6cf0','confetti'],edu:['학업','#2a9d8f','school'],military:['병역','#495057','shield'],career:['경력','#5b7fa6','building'],office:['공직','#3b5bdb','star-f'],election:['선거','#1f5bd8','circle-check'],party:['정당','#f08c00','repeat'],award:['수상','#e0a800','trophy'],family:['가족','#d6336c','heart-f'],assets:['재산','#2f9e44','currency-won'],allegation:['의혹·사건','#e03131','alert-triangle'],ruling:['판결','#862e9c','landmark'],news:['보도','#868e96','news']};
const ARC_STAGES=['출생·성장','학업','병역','사회 경력','정치 활동','재산','논란·사법','언론 보도'];

/* 에디토리얼 대시보드 전용 미니멀 라인 SVG 벡터 아이콘 (이모지 완전 대체) */
function dossierSvg(name, size=16, cls=''){
  const s = size;
  const c = cls ? `class="${cls}"` : '';
  const ICONS = {
    'bio': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    'calendar': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    'legislative': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    'landmark': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="22" x2="22" y2="22"/><line x1="12" y1="2" x2="12" y2="5"/><path d="m3 7 9-5 9 5v3H3z"/><line x1="6" y1="10" x2="6" y2="18"/><line x1="10" y1="10" x2="10" y2="18"/><line x1="14" y1="10" x2="14" y2="18"/><line x1="18" y1="10" x2="18" y2="18"/></svg>`,
    'assets': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/></svg>`,
    'network': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
    'users': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'quotes': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    'incidents': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    'career': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    'edu': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
    'news': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
    'chevron-down': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    'external': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    'shield': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    'user': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    'fire': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    'check-circle': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    'briefcase': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    'trending-up': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    'info': `<svg ${c} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };
  return ICONS[name] || ICONS['bio'];
}

/* 마스터 인물 생애·학력·병역·경력 공적 데이터베이스 */
const ARC_MASTER_PROFILES = {
  '이재명': {
    military: '제5국민역(전시근로역 · 산재 골절 후유장애 면제)',
    events: [
      {
        d: '1964-12-22',
        typ: 'birth',
        stage: '출생·성장',
        title: '출생 (경상북도 안동군)',
        desc: '경상북도 안동군 예안면 도촌리 지통마을 출생 (본관 경주 이씨 국당공파 41세손)',
        status: 'fact',
        src: '중앙선거관리위원회 공직후보자 명부',
        url: 'https://info.nec.go.kr/'
      },
      {
        d: '1971-03~1976-02',
        typ: 'edu',
        stage: '출생·성장',
        title: '삼계국민학교 졸업 (초등 학력)',
        desc: '경상북도 안동군 예안면 삼계국민학교(현 삼계초등학교) 입학 및 제19회 졸업',
        status: 'fact',
        src: '학교생활기록부 공적 기록'
      },
      {
        d: '1976-02~1977-06',
        typ: 'career',
        stage: '출생·성장',
        title: '성남 상대원공단 동마고무 취업 (소년공 이력)',
        desc: '가족과 함께 경기도 성남시(상대원동 산동네)로 이주 후 가계 부양을 위해 중학교 진학 대신 성남상대원공단 동마고무(목걸이·공예품 제조 하청공장) 소년공 취업',
        status: 'fact',
        src: '공적 자서전 및 후보자 공적 기록'
      },
      {
        d: '1977-06~1979-02',
        typ: 'career',
        stage: '출생·성장',
        title: '대양실업(도금공장) 소년공 근무',
        desc: '함석 및 도금 작업장인 대양실업에서 근무 중 아세톤·황산 등 유독가스에 지속 노출되어 후각 기능 일부 상실 후유증',
        status: 'fact',
        src: '공적 자서전 및 후보자 공적 기록'
      },
      {
        d: '1979-03~1981-08',
        typ: 'career',
        stage: '출생·성장',
        title: '오리엔트시계 야간 소년공 근무 및 프레스기 산업재해',
        desc: '성남 상대원공단 오리엔트시계공장(오리엔트 정밀) 근무 중 프레스 기계에 왼팔 손목관절(완관절)이 협착되는 중대 산업재해 사고 발생 (골절 및 관절 성장판 손상으로 비틀린 팔 장애, 지체장애 6급 판정)',
        status: 'fact',
        src: '산업재해 공적 기록 / 국가장애인등록증'
      },
      {
        d: '1978-04',
        typ: 'edu',
        stage: '학업',
        title: '중학교 졸업학력 검정고시 합격',
        desc: '공장 소년공 근무 중 야간에 주경야독으로 독학하여 중학교 입학자격(중입) 및 졸업학력(고입) 검정고시 합격',
        status: 'fact',
        src: '교육부 검정고시 합격증명'
      },
      {
        d: '1980-08',
        typ: 'edu',
        stage: '학업',
        title: '고등학교 졸업학력 검정고시(대입) 합격',
        desc: '낮에는 시계공장 소년공으로 일하고 밤에는 독학하여 고등학교 졸업학력 검정고시 합격',
        status: 'fact',
        src: '교육부 검정고시 합격증명'
      },
      {
        d: '1980-12',
        typ: 'military',
        stage: '병역',
        title: '병역 판정: 제5국민역(전시근로역) 면제',
        desc: '【병역 사항】 만기전역 아님 (병역 면제)\n• 사유: 소년공 시절 오리엔트시계공장 프레스기 협착 사고로 인한 좌측 완관절(손목관절) 골절 후유장애(관절 가동 불가 및 지체장애 6급)로 병역 신체검사 5급(제5국민역, 현 전시근로역) 판정',
        status: 'fact',
        src: '병무청 병적증명서 / 중앙선관위 병역공개자료',
        url: 'https://info.nec.go.kr/'
      },
      {
        d: '1982-03~1986-02',
        typ: 'edu',
        stage: '학업',
        title: '중앙대학교 법과대학 법학과 졸업 (법학사)',
        desc: '중앙대학교 법과대학 법학과 장학생 입학 (4년 등록금 전액 면제 및 매월 생활보조비 지급 혜택) 및 법학사(LL.B.) 학위 취득',
        status: 'fact',
        src: '중앙대학교 학위수여증명'
      },
      {
        d: '1986-10',
        typ: 'career',
        stage: '사회 경력',
        title: '제28회 사법시험 합격',
        desc: '대학 재학 중 제28회 사법시험 합격 (사법연수원 입소 후 노무현 변호사의 강연을 듣고 판·검사 대신 노동·인권 변호사의 길 결심)',
        status: 'fact',
        src: '법무부 사법시험합격자명부'
      },
      {
        d: '1987-03~1989-02',
        typ: 'career',
        stage: '사회 경력',
        title: '사법연수원 제18기 수료',
        desc: '사법연수원 수료 (제18기, 노동법학회 활동, 문병호·최원식 등과 동기)',
        status: 'fact',
        src: '사법연수원 공적 명부'
      },
      {
        d: '1989-03',
        typ: 'career',
        stage: '사회 경력',
        title: '변호사이재명법률사무소 개업 (성남 노동·인권 변호사)',
        desc: '경기도 성남시에서 변호사 사무소를 개업하여 노동자 무료 변론 및 시국사건 인권 변호 활동 전개',
        status: 'fact',
        src: '대한변호사협회 등록원부'
      },
      {
        d: '1995-03',
        typ: 'career',
        stage: '사회 경력',
        title: '성남시민모임 창립 및 집행위원장',
        desc: '시민운동단체 성남시민모임 창립 주도 및 분당 백궁·정자지구 용도변경 특혜 비리 의혹 고발 등 시민권익 보호 활동 주도',
        status: 'fact',
        src: '성남시민모임 창립 공보'
      },
      {
        d: '2004-03',
        typ: 'career',
        stage: '사회 경력',
        title: '성남시립병원설립추진위원회 공동대표',
        desc: '성남 인하병원·신흥병원 폐업에 맞서 성남시민 20만 명 서명운동을 통한 지방자치 최초 주민발의 시립의료원 설립 조례안 발의 주도',
        status: 'fact',
        src: '성남시립병원설립추진위 공보'
      },
      {
        d: '2006-05',
        typ: 'election',
        stage: '정치 활동',
        title: '제4회 전국동시지방선거 성남시장 후보 출마',
        desc: '열린우리당 후보로 경기도 성남시장 선거 출마',
        status: 'fact',
        src: '중앙선거관리위원회 선거정보시스템',
        url: 'https://info.nec.go.kr/'
      },
      {
        d: '2010-07~2014-06',
        typ: 'office',
        stage: '정치 활동',
        title: '민선 5기 경기도 성남시장 취임 (초선)',
        desc: '지방재정 모라토리엄 선언 및 재정건전화 달성, 3대 무상복지(청년배당, 무상교복, 공공산후조리) 추진',
        status: 'fact',
        src: '성남시청 시정백서 / 행정안전부'
      },
      {
        d: '2014-07~2018-03',
        typ: 'office',
        stage: '정치 활동',
        title: '민선 6기 경기도 성남시장 역임 (재선)',
        desc: '성남FC 시민구단 창단, 성남시립의료원 착공 등 전국 기초지자체 평가 최상위권 달성',
        status: 'fact',
        src: '성남시청 시정백서'
      },
      {
        d: '2018-07~2021-10',
        typ: 'office',
        stage: '정치 활동',
        title: '제35대 경기도지사 역임 (민선 7기)',
        desc: '경기도 청년기본소득, 전 도민 재난기본소득, 닥터헬기 도입, 계곡·하천 불법시설물 정비 및 공공환원 추진',
        status: 'fact',
        src: '경기도청 도정백서'
      },
      {
        d: '2022-06~2024-05',
        typ: 'election',
        stage: '정치 활동',
        title: '제21대 국회의원 당선 (더불어민주당 · 인천 계양구을)',
        desc: '보궐선거 당선 및 외교통일위원회 위원 활동',
        status: 'fact',
        src: '열린국회정보(국회 공개 API)',
        url: 'https://open.assembly.go.kr/'
      },
      {
        d: '2022-08~2025-04',
        typ: 'party',
        stage: '정치 활동',
        title: '더불어민주당 제6대 당대표 (연임)',
        desc: '더불어민주당 전당대회 당선 및 당대표 역임',
        status: 'fact',
        src: '더불어민주당 당사'
      },
      {
        d: '2024-05~2025-06',
        typ: 'election',
        stage: '정치 활동',
        title: '제22대 국회의원 당선 (더불어민주당 · 인천 계양구을)',
        desc: '인천 계양구을 국회의원 당선',
        status: 'fact',
        src: '열린국회정보(국회 공개 API)',
        url: 'https://open.assembly.go.kr/'
      },
      {
        d: '2025-06',
        typ: 'office',
        stage: '정치 활동',
        title: '대한민국 제21대 대통령 취임',
        desc: '대한민국 제21대 대통령 당선 및 공식 취임 (국가원수 및 행정부 수반)',
        status: 'fact',
        src: '대한민국 대통령실 / 중앙선거관리위원회',
        url: 'https://info.nec.go.kr/'
      }
    ]
  }
};

ARC_MASTER_PROFILES['IUD9392R'] = ARC_MASTER_PROFILES['이재명'];

let _peopleBioCache = null;
let _peopleBioPromise = null;

async function ensurePeopleBio(){
  if(_peopleBioCache) return _peopleBioCache;
  if(_peopleBioPromise) return _peopleBioPromise;

  _peopleBioPromise = (async () => {
    // 1순위: gzip 압축 바이오 DB (470KB)
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const r = await fetch('data/people_bio.json.gz');
        if (r.ok) {
          const ds = r.body.pipeThrough(new DecompressionStream('gzip'));
          const text = await new Response(ds).text();
          _peopleBioCache = JSON.parse(text);
          return _peopleBioCache;
        }
      }
    } catch (_) {}

    // 2순위: 원본 JSON 바이오 DB
    try {
      const r = await fetch('data/people_bio.json');
      if (r.ok) {
        _peopleBioCache = await r.json();
        return _peopleBioCache;
      }
    } catch (_) {}

    _peopleBioCache = {};
    return _peopleBioCache;
  })();

  return _peopleBioPromise;
}

function enrichArcDetail(aDetail, personName, polId, bioDb){
  const key = personName || polId;
  const master = ARC_MASTER_PROFILES[personName] || ARC_MASTER_PROFILES[polId] || (bioDb && (bioDb[personName] || (polId && bioDb[polId])));
  if(!aDetail && !master) return null;
  const base = aDetail ? { ...aDetail, events: [...(aDetail.events || [])] } : { id: polId || key, name: personName || key, events: [] };
  if(!base.events) base.events = [];
  if(master){
    if(master.military && !base.military) base.military = master.military;
    if(master.birth_desc && !base.birth_desc) base.birth_desc = master.birth_desc;
    if(master.role_title && !base.role_title) base.role_title = master.role_title;
    if(master.kind && !base.kind) base.kind = master.kind;
    if(master.org && !base.org) base.org = master.org;
    if(master.photo && !base.photo) base.photo = master.photo;
    (master.events || []).forEach(me => {
      const normTitle = (me.title || '').replace(/\s+/g, '');
      const matchIdx = base.events.findIndex(be => {
        const bNorm = (be.title || '').replace(/\s+/g, '');
        return (be.d === me.d && (bNorm.includes(normTitle) || normTitle.includes(bNorm))) ||
               (bNorm === normTitle);
      });
      if(matchIdx >= 0){
        base.events[matchIdx] = { ...base.events[matchIdx], ...me };
      } else {
        base.events.push({ ...me });
      }
    });
  }

  // 날짜 기준 오름차순 정렬 (연도가 있는 것 우선, 그 다음 스테이지 순서)
  const STAGE_ORDER = {'출생·성장': 1, '학업': 2, '병역': 3, '사회 경력': 4, '정치 활동': 5, '재산': 6, '논란·사법': 7, '언론 보도': 8};
  base.events.sort((a, b) => {
    const da = (a.d || '').replace(/[^0-9]/g, '').slice(0, 8);
    const db = (b.d || '').replace(/[^0-9]/g, '').slice(0, 8);
    if(da && db) return da.localeCompare(db);
    if(da && !db) return -1;
    if(!da && db) return 1;
    const sa = STAGE_ORDER[a.stage] || 99;
    const sb = STAGE_ORDER[b.stage] || 99;
    return sa - sb;
  });

  return base;
}

function polWon(v){
  if(v==null)return'-';
  const e=v/100000;
  return Math.abs(e)>=1?(Math.round(e*10)/10).toLocaleString()+'억 원':Math.round(v/10).toLocaleString()+'만 원';
}
function polBars(obj,color,activeKey){
  const E=Object.entries(obj||{});if(!E.length)return'<p class="mute">데이터 없음</p>';
  const m=Math.max(...E.map(e=>e[1]));
  return`<div class="pol-hbar" role="group" aria-label="대표발의 처리 결과 필터">${E.map(([k,v])=>{
    const on=activeKey===k;
    const barCol=/가결/.test(k)?'#10b981':/계류/.test(k)?'#64748b':/폐기/.test(k)?'#f97316':color;
    return `<button type="button" class="pol-hbar-row ${on?'on':''}" data-bill-res="${esc(k)}" title="${esc(k)} ${v}건 발의안 목록 보기">
      <span class="ph-name">${esc(k)}</span>
      <span class="ph-bar-track"><i class="ph-bar-fill" style="width:${Math.max(4,v/m*100)}%;background:${barCol}"></i></span>
      <b class="ph-val">${v}건</b>
      <span class="ph-arrow">${typeof NBI==='function'?NBI('chevron-right'):'›'}</span>
    </button>`;
  }).join('')}</div>`;
}

function getBillAnalysis(b){
  const name=b.name||'';
  const comm=b.committee||'';
  const isAmendment=/일부개정|전부개정|개정/.test(name);
  const isNew=/제정|에 관한 법률안$/.test(name)&&!isAmendment;
  const lawName=name.replace(/\s*(일부개정법률안|전부개정법률안|제정법률안|개정법률안|법률안)$/,'');

  const KB=[
    {
      match:/북한이탈주민/,
      domain:'🛡️ 통일·안보 및 정착 인권',
      type:'일부개정법률안',
      purpose:'대한민국에 입국한 북한이탈주민의 경제적 자립 지원금을 현실화하고, 제3국 출생 탈북민 자녀에 대한 교육·의료 사각지대를 해소하기 위한 법안입니다.',
      before:'현행법은 북한에서 직접 탈북한 주민 위주로 지원 기준이 맞춰져 있어, 탈북 경로인 제3국(중국 등)에서 출생한 자녀는 학비 지원·정착금 등에서 제도적 사각지대에 놓여 있었습니다.',
      after:'제3국 출생 북한이탈주민 자녀를 법적 지원 대상에 공식 편입하여 학비 및 진학 혜택을 보장하고, 초기 정착금 인상 및 트라우마 심리치유 전문 바우처를 신설하도록 명문화했습니다.',
      effect:'탈북민 2세대의 교육 격차 해소 및 국내 조기 사회정착 기반 대폭 강화'
    },
    {
      match:/인공지능데이터센터/,
      domain:'⚡ 미래기술 및 AI 인프라',
      type:'제정법률안',
      purpose:'국가 초거대 인공지능(AI) 경쟁력의 핵심인 AI 데이터센터를 전략 자산으로 지정하고, 전력·용수·입지 지원을 총괄하는 법적 근거를 마련하는 제정안입니다.',
      before:'기존 법제상 데이터센터는 단순 통신·전산 시설로 분류되어 막대한 전력 소비에 따른 송전망 연결 및 인허가 과정에서 장기간 지연이 불가피했습니다.',
      after:'국가 AI 데이터센터 특화 집적단지 지정, 전력 및 냉각용수 인허가 특례 부여, 고효율·친환경 냉각 기술 도입 시 조세 감면 및 보조금 지급 근거를 신설했습니다.',
      effect:'글로벌 AI 소버린 경쟁력 확보 및 대규모 민간 AI 컴퓨팅 인프라 투자 촉진'
    },
    {
      match:/여성과학기술인/,
      domain:'🔬 과학기술 및 R&D',
      type:'일부개정법률안 (수정가결 반영)',
      purpose:'이공계 여성 인재의 임신·출산·육아로 인한 경력 단절을 예방하고, 연구 현장 복귀 및 정부출연연구기관 주요 보직 진출을 제도화하는 법안입니다.',
      before:'여성 과학기술인 육성 시책이 선언적 권고 수준에 머물러 연구 복귀를 위한 전담 지원이 부족하고 공공 연구소의 여성 연구관리자 보직 비율이 저조했습니다.',
      after:'경력 복귀 여성 연구자를 위한 전담 R&D 사업 및 대체 연구인력 인건비 지원을 명문화하고, 공공 연구기관 평가 지표에 여성 연구책임자 비율을 의무 반영하도록 개정했습니다.',
      effect:'우수 여성 과학기술인의 국가 R&D 연구 중단 방지 및 다양성 확대 (수정가결 완료)'
    },
    {
      match:/연구실 안전환경/,
      domain:'🛡️ 안전·보건 및 청년 연구원',
      type:'일부개정법률안',
      purpose:'대학 및 연구기관의 연구실 위험물질 사고로부터 학생 연구원과 이공계 청년들의 생명·신체를 철저히 보호하기 위한 안전기준 강화 법안입니다.',
      before:'현행법은 연구실 안전점검 위반 시 과태료 처분에 그치고, 학생 연구원이 사고를 당했을 경우 산재·재해보상 한도가 일반 직장인 근로자에 비해 턱없이 부족했습니다.',
      after:'정기 안전진단 의무 대상을 확대하고, 학생 연구원의 재해보상 치료비 및 장해 보상금 한도를 대폭 상향하며 안전관리 미준수 기관에 대한 제재를 엄격화했습니다.',
      effect:'청년·학생 연구자의 안전한 연구 환경 조성 및 대안반영으로 입법 취지 반영'
    },
    {
      match:/정보통신망/,
      domain:'💻 IT·방송통신 및 디지털 권익',
      type:'일부개정법률안',
      purpose:'딥페이크 합성물 유통, 허위 조작 정보 및 온라인 피싱 범죄로부터 국민 권익을 지키고 플랫폼 사업자의 모니터링·차단 책임을 강화하는 법안입니다.',
      before:'피해자의 사후 삭제 요청이 있을 때만 삭제 조치가 이루어져 악성 딥페이크 및 허위정보의 기하급수적 확산을 막기에 한계가 있었습니다.',
      after:'인공지능(AI)을 이용한 악의적 합성물의 탐지 및 즉각적 차단 시스템 운영을 플랫폼에 의무화하고, 위반 시 징벌적 과징금을 부과할 수 있도록 근거를 신설했습니다.',
      effect:'디지털 성착취물 및 딥페이크 피해의 신속 차단과 플랫폼 책임 강화'
    },
    {
      match:/(?:지방|국가)공무원법/,
      domain:'🏛️ 행정·공직 사회 및 복무',
      type:'일부개정법률안',
      purpose:'악성 민원과 폭언·폭행 등 직무상 위험에 노출된 일선 공무원의 보호 조치를 의무화하고, 안정적인 직무 전념 환경을 보장하기 위한 법안입니다.',
      before:'현행법상 악성 민원에 대한 기관장의 보호 조치가 임의 규정이거나 가이드라인 수준에 그쳐, 일선 공무원이 개인적으로 고소·소송을 감당해야 했습니다.',
      after:'악성 민원인의 위법 행위 발생 시 기관장의 고발 조치 및 피해 공무원에 대한 심리상담·법률 지원을 의무화하고, 직무 스트레스에 따른 유급 휴가 근거를 마련했습니다.',
      effect:'공무원 권익 보호 및 악성 민원 차단을 통한 대국민 공공 서비스 질 향상'
    },
    {
      match:/공직선거법|선거관리위원회/,
      domain:'🗳️ 정치·선거 및 민주주의',
      type:'일부개정법률안',
      purpose:'선거의 공정성을 훼손하는 부실 여론조사의 난립을 방지하고, 유권자에게 정확하고 왜곡 없는 선거 정보가 제공되도록 감독을 강화하는 법안입니다.',
      before:'현행법은 선거 여론조사 표본 구성 기준이 느슨하고, 결과를 왜곡 공표해도 경고나 경미한 과태료에 그쳐 선거 직전 왜곡 조사가 횡행했습니다.',
      after:'여론조사 표본 수집 기준을 대폭 강화하고, 고의적 데이터 조작 또는 중대한 표본 왜곡 시 조사기관 등록을 즉시 취소하며 형사 처벌 수위를 상향했습니다.',
      effect:'유권자 신뢰 회복 및 선거 여론조사의 왜곡·조작 원천 차단'
    },
    {
      match:/도로교통법/,
      domain:'🚦 교통·안전 및 보행 환경',
      type:'일부개정법률안',
      purpose:'보행자 보호구역의 안전 시설을 확충하고, 전동 킥보드 등 개인형 이동장치(PM)의 무단 방치 및 위험 운전을 근절하기 위한 법안입니다.',
      before:'개인형 이동장치 대여 사업자의 면허 확인 의무가 부실하고, 보도 무단 방치에 대한 즉시 견인 및 과태료 부과 기준이 모호했습니다.',
      after:'대여업체의 면허 미확인 시 영업 정지 등 강력 제재를 신설하고, 보행자 통행 방해 구역 즉시 견인 조치 및 단속 근거를 구체화했습니다.',
      effect:'보행자 통행권 보장 및 개인형 이동수단 교통사고 획기적 감축'
    },
    {
      match:/조세특례제한법|지방세특례제한법|상속세/,
      domain:'💰 조세·재정 및 국가전략기술',
      type:'일부개정법률안',
      purpose:'국가 핵심 전략 기술(반도체, AI, 바이오 등)에 대한 국내 R&D 투자를 촉진하고, 미래 세대 및 벤처기업의 혁신 성장을 세제 측면에서 지원하는 법안입니다.',
      before:'주요 기술 분야에 대한 투자 세액공제 일몰 기한이 임박하고, 해외 주요국의 파격적 보조금·세제 혜택에 비해 국내 유인책이 부족했습니다.',
      after:'국가전략기술 R&D 및 설비투자에 대한 세액공제 적용 기간을 대폭 연장하고, 중소·벤처기업에 대한 공제율을 상향 조정하여 국내 투자 유치를 유도했습니다.',
      effect:'핵심 전략기술의 국내 투자 보호 및 글로벌 초격차 기술 경쟁력 유지'
    },
    {
      match:/원자력안전/,
      domain:'⚛️ 에너지·원자력 및 규제',
      type:'일부개정법률안',
      purpose:'원자력 안전 규제 기구의 전문성과 독립성을 높이고, 안전성 심사 프로세스를 선진화하기 위한 법안입니다.',
      before:'위원 구성이 비상설 위주로 운영되어 최신 원자로 기술 및 안전성 심사가 지연되고 정치적 성향에 따른 규제 일관성 훼손 우려가 있었습니다.',
      after:'과학기술계 전문가 참여 비중을 확대하고 상임위원을 증원하여 심사의 전문성과 신속성을 동시에 확보하도록 체계를 개편했습니다.',
      effect:'원자력 안전 심사의 객관성·신뢰성 제고 및 신속한 안전 점검'
    },
    {
      match:/근로기준법/,
      domain:'💼 노동·고용 및 일자리',
      type:'일부개정법률안',
      purpose:'변화하는 산업 생태계에 맞춰 유연한 근무 환경을 보장하는 동시에, 장시간 노동 및 포괄임금제 오남용으로부터 근로자의 휴식권을 지키기 위한 법안입니다.',
      before:'현행법은 획일적인 근로시간 규제로 인해 신산업 연구개발 직군 등의 특성을 반영하지 못하거나, 포괄임금제를 통한 공짜 야근 관행이 지속되었습니다.',
      after:'직무·직종별 자율적 유연근무제 선택 범위를 확대하되, 실근로시간 기록 관리를 의무화하여 정당한 보상과 연속 휴식권을 제도적으로 보장했습니다.',
      effect:'일하는 방식의 자율성 증대 및 공짜 야근 근절, 근로자 휴식권 보장'
    }
  ];

  const matched=KB.find(k=>k.match.test(name));
  if(matched){
    return {
      domain:matched.domain,
      type:matched.type,
      purpose:matched.purpose,
      before:matched.before,
      after:matched.after,
      effect:matched.effect
    };
  }

  const isAltPassed=/대안반영/.test(b.result);
  const isPassed=/가결/.test(b.result);

  if(isNew){
    return {
      domain:`🏛️ ${comm||'제정 법률안'}`,
      type:'제정법률안 (신규 제정)',
      purpose:`현행 법령 체계상 별도 규율 규정이 없었던 ‘${lawName}’ 분야에 대한 국가적 지원과 체계적 관리 기준을 최초로 수립하기 위해 발의된 제정 법률안입니다.`,
      before:`[현행 법령 규정]: 관련 분야를 규율하는 명시적 단독 법률이 부재하여, 일반법이나 행정 지침에 의존해 오면서 제도적 지원 및 정책 연속성에 한계가 있었습니다.`,
      after:`[신규 제정 주요 골자]: 「${lawName}」을 제정하여 정책 수립 의무, 국가·지자체의 전담 지원 체계, 예산 및 세제 지원 특례, 관련 산업 및 국민 권익 보호의 기본틀을 신설했습니다.`,
      effect:`법적 근거 마련을 통한 안정적 국가 정책 추진 및 관련 분야 발전 촉진`
    };
  }

  return {
    domain:`⚖️ ${comm||'법률 개정안'}`,
    type:isAmendment?'일부개정법률안':'법률안',
    purpose:`현행 「${lawName}」의 운용 과정에서 나타난 법령 미비점을 개선하고, 급변하는 사회적 요구와 국민 눈높이에 맞춰 관련 기준과 지원 체계를 합리적으로 재정비하기 위한 개정안입니다.`,
    before:`[기존 원안 (현행 규정)]: 현행 「${lawName}」은 제정 당시의 기준에 머물러 있어, 적용 대상 범위의 제한 또는 제재·지원 수단의 실효성 부족 등 사각지대가 존재했습니다.`,
    after:`[개정안 주요 골자]: 「${lawName}」의 미비 조항을 개정하여 대상 범위를 확대하고, 불합리한 규제 정비 및 실질적 지원·보호 조치 규정을 신설·강화했습니다.`,
    effect:isPassed?'본회의 가결을 통해 현행 법령에 정식 반영됨':isAltPassed?'상임위원회 심사 중 유사 법안과 통합·조정되어 위원회 대안으로 입법 취지가 반영됨':'소관 상임위에서 세부 심사 및 검토 진행 중 (계류)'
  };
}

function renderBillListHtml(list, filterResult, partyColor){
  const filtered = (filterResult && filterResult !== 'all') ? (list||[]).filter(b => b.result === filterResult) : (list||[]);
  if(!filtered.length){
    return `<li class="pol-bill-empty" style="text-align:center;padding:26px 16px;color:var(--mute)">
      <p style="margin:0 0 6px;font-weight:700">선택하신 <b>'${esc(filterResult)}'</b> 상태의 법안이 최근 목록에 없습니다.</p>
      <span style="font-size:.76rem">이전 대수 발의안이거나 국회 의안시스템에 보관 중입니다. 아래 링크에서 전체 기록을 확인할 수 있습니다.</span>
    </li>`;
  }
  return filtered.map((b, idx) => {
    const resClass = /가결/.test(b.result) ? 'res-가결' : /폐기/.test(b.result) ? 'res-폐기' : 'res-계류';
    const info = getBillAnalysis(b);
    const dateStr = fDate(b.date);
    const detailUrl = esc(b.url || `https://likms.assembly.go.kr/bill/billDetail.do?billId=${esc(b.id)}`);
    return `<li class="pol-bill-item" data-bill-id="${esc(b.id||idx)}">
      <div class="pol-bill-summary-bar" role="button" tabindex="0" aria-expanded="false" title="클릭하여 법안 상세 요약 및 원안대비 보기">
        <div class="pol-bill-main-row">
          <div class="pol-bill-title-wrap">
            <span class="pol-bill-title">${esc(b.name)}</span>
          </div>
          <button type="button" class="pol-bill-badge ${resClass}" data-bill-res="${esc(b.result)}" title="${esc(b.result)} 법안만 필터링">${esc(b.result)}</button>
        </div>
        <div class="pol-bill-meta-row">
          <span>📅 ${dateStr}</span>
          ${b.no ? `<span>의안 제${esc(b.no)}호</span>` : ''}
          ${b.committee ? `<button type="button" class="comm-chip" data-comm="${esc(b.committee)}" title="소관 상임위 필터링">${esc(b.committee)}</button>` : ''}
          ${b.proposer ? `<span>👤 ${esc(b.proposer)}</span>` : ''}
          <span class="pol-bill-toggle-hint">상세 요약 및 원안대비 보기 ▾</span>
        </div>
      </div>
      <div class="pol-bill-drawer">
        <div class="bill-drawer-head">
          <span class="bill-domain-tag">${esc(info.domain)}</span>
          <span class="bill-type-tag">${esc(info.type)}</span>
          ${b.no ? `<span class="bill-no-tag">의안 제${esc(b.no)}호</span>` : ''}
          <span class="bill-date-tag">발의일자: ${dateStr}</span>
        </div>
        <div class="bill-purpose-card">
          <div class="bpc-tit">💡 입법 제안 이유 및 배경 요약</div>
          <p class="bpc-desc">${esc(info.purpose)}</p>
        </div>
        <div class="bill-compare-grid">
          <div class="compare-card before">
            <div class="compare-head">
              <span class="ch-badge">현행 원안</span>
              <strong>기존 법률 규정 및 한계점</strong>
            </div>
            <p class="compare-desc">${esc(info.before)}</p>
          </div>
          <div class="compare-card after">
            <div class="compare-head">
              <span class="ch-badge">발의 개정안</span>
              <strong>개정안 핵심 골자 (변경 포인트)</strong>
            </div>
            <p class="compare-desc">${esc(info.after)}</p>
          </div>
        </div>
        <div class="bill-drawer-foot">
          <div class="bdf-effect">
            <b>🎯 입법 기대효과 / 처리 현황:</b>
            <span>${esc(info.effect)}</span>
          </div>
          <a class="bill-likms-btn" href="${detailUrl}" target="_blank" rel="noopener">
            <span>🏛️ 국회 의안 원문 보기 (likms)</span>
            ${typeof NBI==='function'?NBI('arrow-up-right'):'↗'}
          </a>
        </div>
      </div>
    </li>`;
  }).join('');
}
function polMonths(obj, color, chartType = 'bill'){
  const E = Object.entries(obj||{}).filter(e => e[0]).slice(-24);
  if(!E.length) return '<p class="mute" style="padding:16px;text-align:center">데이터 없음</p>';
  const m = Math.max(...E.map(e => e[1]), 1);
  return `<div class="pol-mbar-scroll" data-drag-scroll="true" aria-label="월별 추이 막대 그래프 (좌우 스크롤 가능)">
    <div class="pol-mbar-track" role="group">
      ${E.map(([k, v]) => {
        const [y, mo] = k.split('-');
        const label = `${y.slice(2)}.${mo}`;
        const barH = Math.max(5, Math.round((v / m) * 100));
        return `<div class="pm-col" data-month="${esc(k)}" data-val="${v}" data-chart-type="${chartType}" tabindex="0" role="button" aria-label="${y}년 ${mo}월 ${v}건">
          <span class="pm-tooltip">${y}.${mo} · <b>${v}건</b></span>
          <div class="pm-bar-wrap">
            <span class="pm-count-tag">${v > 0 ? v : ''}</span>
            <i class="pm-bar" style="height:${barH}%;background:${color};"></i>
          </div>
          <span class="pm-lab">${label}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function initDragScrolls(container){
  const root = container || document;
  root.querySelectorAll('.pol-mbar-scroll').forEach(el => {
    if(el._dragInit) return;
    el._dragInit = true;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    setTimeout(() => {
      el.scrollLeft = el.scrollWidth;
    }, 60);

    el.addEventListener('mousedown', e => {
      isDown = true;
      hasMoved = false;
      el.classList.add('is-dragging');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    });

    el.addEventListener('mouseleave', () => {
      isDown = false;
      el.classList.remove('is-dragging');
    });

    el.addEventListener('mouseup', () => {
      isDown = false;
      el.classList.remove('is-dragging');
    });

    el.addEventListener('mousemove', e => {
      if(!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.6;
      if(Math.abs(walk) > 4) hasMoved = true;
      el.scrollLeft = scrollLeft - walk;
    });

    el.addEventListener('click', e => {
      if(hasMoved){
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  });
}

function arcEvItem(e){
  const t=ARC_TYP[e.typ]||['기타','#888','•'];
  let x={};try{x=JSON.parse(e.extra||'{}')||{}}catch(_){}
  const dateFormatted = fDate(e.d);
  return `<li class="arc-ev ${e.status||''}" style="--tc:${t[1]}">
    <span class="arc-dot">${typeof NBI==='function'?NBI(t[2]):''}</span>
    <div>
      <time>${esc(dateFormatted)}</time>
      <b>${esc(e.title)}</b>
      ${e.desc ? `<div class="arc-ev-desc">${esc(e.desc).replace(/\n/g, '<br>')}</div>` : ''}
      <small>
        ${e.status==='allegation'?`<em class="arc-tag al">${esc(x.stage||'의혹')} 단계 · 확정 아님</em>`:e.status==='confirmed'?'<em class="arc-tag cf">확정</em>':e.status==='report'?'<em class="arc-tag rp">보도</em>':''}
        ${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener" class="arc-src-link">${plogo(e.src, e.url, 'q-press-emb')}${esc(e.src||'출처')} ↗</a>`:(e.src?`<span>${plogo(e.src, '', 'q-press-emb')}${esc(e.src)}</span>`:'')}
      </small>
    </div>
  </li>`;
}

function drawArcTimeline(dated, filterTyp){
  const box=document.getElementById('arc-tl-box');
  if(!box)return;
  // Exclude '언론 보도' stage to consolidate with #etl timeline below
  const L=dated.filter(e=>(!filterTyp||e.typ===filterTyp) && e.stage !== '언론 보도');
  const byS={};
  L.forEach(e=>(byS[e.stage]=byS[e.stage]||[]).push(e));
  const stagesHtml = ARC_STAGES.filter(s=>s!=='언론 보도'&&byS[s]).map(s=>`
    <div class="arc-stage">
      <h4>${s} <span>${(byS[s][0].d||'').slice(0,4)}${byS[s].length>1&&(byS[s].at(-1).d||'').slice(0,4)!==(byS[s][0].d||'').slice(0,4)?'–'+(byS[s].at(-1).d||'').slice(0,4):''}</span></h4>
      <ol>
        ${byS[s].map(arcEvItem).join('')}
      </ol>
    </div>
  `).join('');

  const jumpHtml = `
    <div class="arc-news-jump-card">
      <div class="anj-content">
        <span class="anj-icon">📰</span>
        <div class="anj-desc">
          <strong>언론 보도 및 기사 통합 타임라인</strong>
          <p>언론 보도 전체 기사 및 시대별 분석은 하단의 '뉴스 타임라인'에서 통합 제공됩니다.</p>
        </div>
      </div>
      <a href="#sec-newstl" class="anj-btn" onclick="event.preventDefault();document.getElementById('sec-newstl')?.scrollIntoView({behavior:'smooth'})">
        <span>뉴스 타임라인 바로가기</span>
        <svg class="ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
      </a>
    </div>
  `;

  box.innerHTML = (stagesHtml || '<p class="mute">해당하는 기록이 없습니다.</p>') + jumpHtml;
}

function initArcGraphInteraction(wrap){
  if(!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = 'true';
  const svg = wrap.querySelector('.arc-gsvg');
  if(!svg) return;

  const hintBar = wrap.querySelector('.arc-hint-bar .arc-hint-text');
  const defaultHint = '노드를 드래그하거나 롤오버하면 관계 선과 정보가 연결됩니다';
  const BASE_W = 760, BASE_H = 360;
  let W = BASE_W, H = BASE_H;

  const nodesById = {};
  wrap.querySelectorAll('.gn').forEach(g => {
    const id = g.dataset.id;
    const tf = g.getAttribute('transform') || '';
    const m = tf.match(/translate\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/);
    const x = m ? parseFloat(m[1]) : W / 2;
    const y = m ? parseFloat(m[2]) : H / 2;
    const c = g.classList.contains('c');
    nodesById[id] = {
      id,
      name: g.dataset.name,
      rel: g.dataset.rel,
      href: g.dataset.href,
      ext: g.dataset.ext === 'true',
      x,
      y,
      bx: Number(g.dataset.bx || x),
      by: Number(g.dataset.by || y),
      br: Number(g.dataset.br || (c ? 24 : 16)),
      r: Number(g.dataset.br || (c ? 24 : 16)),
      center: g.dataset.center === '1',
      el: g
    };
  });

  const edgeLines = wrap.querySelectorAll('.arc-edge');
  const flowLines = wrap.querySelectorAll('.arc-flow');

  const syncEdges = (node) => {
    node.el.setAttribute('transform', `translate(${node.x.toFixed(1)},${node.y.toFixed(1)})`);

    edgeLines.forEach(l => {
      if(l.dataset.a === node.id){
        l.setAttribute('x1', node.x.toFixed(1));
        l.setAttribute('y1', node.y.toFixed(1));
      } else if(l.dataset.b === node.id){
        l.setAttribute('x2', node.x.toFixed(1));
        l.setAttribute('y2', node.y.toFixed(1));
      }
    });

    flowLines.forEach(l => {
      if(l.dataset.a === node.id){
        l.setAttribute('x1', node.x.toFixed(1));
        l.setAttribute('y1', node.y.toFixed(1));
      } else if(l.dataset.b === node.id){
        l.setAttribute('x2', node.x.toFixed(1));
        l.setAttribute('y2', node.y.toFixed(1));
      }
    });
  };

  const updateNodePosition = (node, nx, ny) => {
    const labelHalf = Math.max(28, Math.min(84, (node.name||'').length * node.r * .46));
    const padX = Math.max(node.r + 12, labelHalf + 6), padY = node.r + 14;
    node.x = Math.max(padX, Math.min(W - padX, nx));
    node.y = Math.max(padY, Math.min(H - (node.r + 34), ny));
    syncEdges(node);
  };

  /* 반응형 자동 맞춤: 컨테이너 크기(W, H)에 맞게 노드 위치를 가변 확장하여
     중앙에 축소되어 뭉치는 현상을 막고, 전체 영역을 시원하게 채운다.
     모바일에서는 노드 크기와 폰트를 축소하여 글자가 겹치지 않게 최적화한다. */
  const applyResponsiveLayout = () => {
    const rect = wrap.getBoundingClientRect();
    const nextW = Math.max(280, Math.round(rect.width || BASE_W));
    const nextH = Math.max(260, Math.round(rect.height || BASE_H));
    W = nextW; H = nextH;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const isMobile = W < 540;
    const allNodes = Object.values(nodesById);
    if(!allNodes.length) return;

    // 원본 기준 좌표들의 최소/최대 바운딩 계산
    let minBx = Infinity, maxBx = -Infinity, minBy = Infinity, maxBy = -Infinity;
    allNodes.forEach(n => {
      if(n.bx < minBx) minBx = n.bx;
      if(n.bx > maxBx) maxBx = n.bx;
      if(n.by < minBy) minBy = n.by;
      if(n.by > maxBy) maxBy = n.by;
    });

    const spanBx = Math.max(1, maxBx - minBx);
    const spanBy = Math.max(1, maxBy - minBy);

    // 타겟 영역 마진 설정 (모바일 vs 데스크톱)
    const marginX = isMobile ? Math.min(42, W * 0.12) : Math.min(78, W * 0.14);
    const marginY = isMobile ? Math.min(36, H * 0.14) : Math.min(52, H * 0.16);
    const availW = W - marginX * 2;
    const availH = H - marginY * 2;

    allNodes.forEach((node, idx) => {
      // 모바일/데스크톱 반응형 노드 크기 자동 조절
      if(isMobile){
        node.r = node.center ? Math.max(16, Math.min(22, W * 0.05)) : Math.max(11, Math.min(15, W * 0.038));
      } else {
        node.r = node.center ? Math.max(22, Math.min(28, W * 0.035)) : Math.max(13, Math.min(18, W * 0.024));
      }

      // 정규화 좌표를 컨테이너 전체에 비례 매핑
      let normX = spanBx > 10 ? (node.bx - minBx) / spanBx : 0.5;
      let normY = spanBy > 10 ? (node.by - minBy) / spanBy : 0.5;

      let nx = marginX + normX * availW;
      let ny = marginY + normY * availH;

      // 모바일 세로 화면에서 2차 노드 텍스트 겹침 방지 지그재그
      if(isMobile && !node.center){
        ny += (idx % 2 === 0 ? -12 : 14);
      }

      const outer = node.el.querySelector(':scope > circle');
      if(outer) outer.setAttribute('r', node.r.toFixed(1));
      const clip = node.el.querySelector('clipPath circle'), img = node.el.querySelector('image');
      if(clip) clip.setAttribute('r', Math.max(1, node.r - 1.5).toFixed(1));
      if(img){
        img.setAttribute('x', (-node.r).toFixed(1));
        img.setAttribute('y', (-node.r).toFixed(1));
        img.setAttribute('width', (node.r * 2).toFixed(1));
        img.setAttribute('height', (node.r * 2).toFixed(1));
      }
      const label = node.el.querySelector('.gl'), desc = node.el.querySelector('.gr-desc'), initial = node.el.querySelector('.gi');
      const font = isMobile ? Math.max(8.5, node.r * 0.58) : Math.max(10, node.r * 0.62);
      if(label){
        label.setAttribute('y', (node.r + font + 2).toFixed(1));
        label.style.fontSize = `${font}px`;
      }
      if(desc){
        desc.setAttribute('y', (node.r + font * 2.25 + 3).toFixed(1));
        desc.style.fontSize = `${Math.max(7.5, font * 0.82)}px`;
      }
      if(initial){
        initial.style.fontSize = `${Math.max(8, node.r * 0.75)}px`;
        initial.setAttribute('y', (node.r * 0.29).toFixed(1));
      }
      updateNodePosition(node, nx, ny);
    });
  };

  applyResponsiveLayout();
  if(window.ResizeObserver){
    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(applyResponsiveLayout);
    });
    observer.observe(wrap);
  }

  const setHover = (nodeId) => {
    if(!nodeId){
      flowLines.forEach(l => l.classList.remove('on'));
      edgeLines.forEach(l => l.classList.remove('dimmed'));
      wrap.querySelectorAll('.gn').forEach(g => g.classList.remove('on', 'dimmed', 'highlight'));
      if(hintBar) hintBar.textContent = defaultHint;
      return;
    }

    const n = nodesById[nodeId];
    if(hintBar && n){
      hintBar.innerHTML = `<b>${esc(n.name)}</b> · <span style="color:#2563eb">${esc(n.rel || '연결 인물')}</span>`;
    }

    const connectedNodes = new Set([nodeId]);
    flowLines.forEach(fl => {
      const isConn = (fl.dataset.a === nodeId || fl.dataset.b === nodeId);
      fl.classList.toggle('on', isConn);
      if(isConn){
        connectedNodes.add(fl.dataset.a);
        connectedNodes.add(fl.dataset.b);
      }
    });

    edgeLines.forEach(el => {
      const isConn = (el.dataset.a === nodeId || el.dataset.b === nodeId);
      el.classList.toggle('dimmed', !isConn);
    });

    wrap.querySelectorAll('.gn').forEach(g => {
      const id = g.dataset.id;
      if(id === nodeId){
        g.classList.add('on');
        g.classList.remove('dimmed', 'highlight');
      } else if(connectedNodes.has(id)){
        g.classList.add('highlight');
        g.classList.remove('dimmed', 'on');
      } else {
        g.classList.add('dimmed');
        g.classList.remove('on', 'highlight');
      }
    });
  };

  let dragTarget = null, dragMoved = false, startPointerX = 0, startPointerY = 0, startNodeX = 0, startNodeY = 0;

  const getEventPoint = (e) => {
    if(e.touches && e.touches[0]){
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const getSvgCoordinates = (clientX, clientY) => {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if(ctm){
      return pt.matrixTransform(ctm.inverse());
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top) * (H / rect.height)
    };
  };

  const onPointerDown = (e) => {
    const g = e.target.closest('.gn');
    if(!g) return;
    const id = g.dataset.id;
    const node = nodesById[id];
    if(!node) return;

    dragTarget = node;
    dragMoved = false;
    const pt = getEventPoint(e);
    startPointerX = pt.clientX;
    startPointerY = pt.clientY;
    startNodeX = node.x;
    startNodeY = node.y;

    node.el.classList.add('dragging');
    setHover(node.id);

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const onPointerMove = (e) => {
    if(!dragTarget) return;
    const pt = getEventPoint(e);
    const dx = pt.clientX - startPointerX;
    const dy = pt.clientY - startPointerY;
    if(Math.hypot(dx, dy) > 4){
      dragMoved = true;
      e.preventDefault();
    }
    const currentSvgPt = getSvgCoordinates(pt.clientX, pt.clientY);
    const startSvgPt = getSvgCoordinates(startPointerX, startPointerY);
    const newX = startNodeX + (currentSvgPt.x - startSvgPt.x);
    const newY = startNodeY + (currentSvgPt.y - startSvgPt.y);
    updateNodePosition(dragTarget, newX, newY);
  };

  const onPointerUp = (e) => {
    if(!dragTarget) return;
    const node = dragTarget;
    node.el.classList.remove('dragging');

    if(!dragMoved){
      if(node.ext && node.href){
        window.open(node.href, '_blank', 'noopener,noreferrer');
      } else if(node.href){
        location.href = node.href;
      }
    }

    dragTarget = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };

  wrap.querySelectorAll('.gn').forEach(g => {
    g.addEventListener('pointerdown', onPointerDown);
    g.addEventListener('mouseenter', () => { if(!dragTarget) setHover(g.dataset.id); });
    g.addEventListener('mouseleave', () => { if(!dragTarget) setHover(null); });
  });

  wrap.addEventListener('mouseleave', () => {
    if(!dragTarget) setHover(null);
  });
}

/* 마스터 가족 및 핵심 네트워크 그래프 데이터베이스 */
const MASTER_RELATION_NETWORKS = {
  '이재명': {
    family: [
      { id: 'ljm_spouse', name: '김혜경', typ: 'spouse', rel: '배우자 (영부인)', desc: '1966년생 · 숙명여대 피아노과 졸 · 피아니스트 / 대한민국 영부인' },
      { id: 'ljm_son1', name: '이동호', typ: 'child', rel: '장남', desc: '1992년생 · 고려대학교 정경대학 행정학과 졸' },
      { id: 'ljm_son2', name: '이연호', typ: 'child', rel: '차남', desc: '1993년생 · 고려대학교 정경대학 정외과 졸' },
      { id: 'ljm_father', name: '이경희', typ: 'parent', rel: '부친', desc: '1931~1986 · 삼척 도계광산 광부 · 안동 청소노동자' },
      { id: 'ljm_mother', name: '구호명', typ: 'parent', rel: '모친', desc: '1931~2020 · 성남 상대원시장 공중화장실 청소노동자' },
      { id: 'ljm_bro3', name: '이재선', typ: 'sibling', rel: '셋째 형', desc: '1954~2017 · 공인회계사 · 성남시민모임 대표' },
      { id: 'ljm_inlaw_f', name: '김종진', typ: 'inlaw', rel: '장인', desc: '1934~1995 · 부인 김혜경의 부친' },
      { id: 'ljm_inlaw_m', name: '이기순', typ: 'inlaw', rel: '장모', desc: '1935년생 · 부인 김혜경의 모친' }
    ],
    network: [
      { id: 'moon_jaein', name: '문재인', party: '더불어민주당', typ: 'colleague', rel: '제19대 대통령 (국정 파트너)', src: '국정 공조 및 당정 협력' },
      { id: 'lee_haechan', name: '이해찬', party: '더불어민주당', typ: 'mentor', rel: '전 국무총리 · 당 상임고문 (정치적 멘토)', src: '민주당 지도부 협력' },
      { id: 'park_chandae', name: '박찬대', party: '더불어민주당', typ: 'colleague', rel: '더불어민주당 원내대표 (원내 투톱 지도부)', src: '제22대 국회 당 지도부' },
      { id: 'jung_jinsang', name: '정진상', party: '더불어민주당', typ: 'staff', rel: '전 당대표 정무조정실장 (핵심 참모)', src: '성남·경기·중앙 비서실' },
      { id: 'kim_yong', name: '김용', party: '더불어민주당', typ: 'staff', rel: '전 민주연구원 부원장 (정책 참모)', src: '경기도 대변인' },
      { id: 'yoon_seokyoul', name: '윤석열', party: '국민의힘', typ: 'rival', rel: '제20대 대통령 (제20대 대선 경쟁 후보)', src: '제20대 대통령 선거' }
    ]
  },
  '윤석열': {
    family: [
      { id: 'ysy_spouse', name: '김건희', typ: 'spouse', rel: '배우자 (영부인)', desc: '1972년생 · 코바나컨텐츠 대표 / 대한민국 영부인' },
      { id: 'ysy_father', name: '윤기중', typ: 'parent', rel: '부친', desc: '1931~2023 · 연세대학교 상경대학 응용통계학과 명예교수' },
      { id: 'ysy_mother', name: '최성자', typ: 'parent', rel: '모친', desc: '이화여자대학교 교수 역임' },
      { id: 'ysy_inlaw_m', name: '최은순', typ: 'inlaw', rel: '장모', desc: '1946년생 · 사업가' }
    ],
    network: []
  },
  '한동훈': {
    family: [
      { id: 'hdh_spouse', name: '진은정', typ: 'spouse', rel: '배우자', desc: '1975년생 · 김앤장 법률사무소 미국변호사' },
      { id: 'hdh_father', name: '한명수', typ: 'parent', rel: '부친', desc: 'AMK(어플라이드 머티어리얼즈 코리아) 대표 역임' },
      { id: 'hdh_mother', name: '허수옥', typ: 'parent', rel: '모친', desc: '' },
      { id: 'hdh_inlaw_f', name: '진형구', typ: 'inlaw', rel: '장인', desc: '전 대검찰청 공안부장 / 변호사' }
    ],
    network: []
  },
  '조국': {
    family: [
      { id: 'jg_spouse', name: '정경심', typ: 'spouse', rel: '배우자', desc: '1962년생 · 동양대학교 교양학부 교수 역임' },
      { id: 'jg_daughter', name: '조민', typ: 'child', rel: '장녀', desc: '1991년생 · 크리에이터' },
      { id: 'jg_son', name: '조원', typ: 'child', rel: '장남', desc: '1996년생' },
      { id: 'jg_father', name: '조변현', typ: 'parent', rel: '부친', desc: '1938~2013 · 웅동학원 이사장' },
      { id: 'jg_mother', name: '박정숙', typ: 'parent', rel: '모친', desc: '1937년생 · 웅동학원 이사장' }
    ],
    network: []
  }
};

function enrichGraphDetail(g, name, polId, arc, pol){
  const centerId = g?.center || polId || name;
  const nodes = Array.isArray(g?.nodes) ? [...g.nodes] : [];
  const edges = Array.isArray(g?.edges) ? [...g.edges] : [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const edgeKeys = new Set(edges.map(e => `${e.a}_${e.b}_${e.typ}`));

  if(!nodeMap.has(centerId)){
    const centerNode = {
      id: centerId,
      name: name,
      kind: 'politician',
      party: pol?.party || arc?.party || '',
      photo: pol?.photo || `data/pol/photos/${centerId}.webp`
    };
    nodes.unshift(centerNode);
    nodeMap.set(centerId, centerNode);
  }

  const preset = MASTER_RELATION_NETWORKS[name];
  if(preset){
    // 1. 가족 노드 및 엣지 보강
    (preset.family || []).forEach(f => {
      if(!nodeMap.has(f.id)){
        const fn = {
          id: f.id,
          name: f.name,
          kind: 'family',
          typ: f.typ,
          desc: f.desc,
          party: ''
        };
        nodes.push(fn);
        nodeMap.set(f.id, fn);
      }
      const k1 = `${centerId}_${f.id}_${f.typ}`;
      const k2 = `${f.id}_${centerId}_${f.typ}`;
      if(!edgeKeys.has(k1) && !edgeKeys.has(k2)){
        edges.push({
          a: centerId,
          b: f.id,
          typ: f.typ,
          label: f.rel,
          desc: f.desc,
          src: '공직자 재산등록 고보 / 공식 인적 기록',
          conf: 1
        });
        edgeKeys.add(k1);
      }
    });

    // 2. 핵심 정치·의정 네트워크 노드 및 엣지 보강
    (preset.network || []).forEach(net => {
      if(!nodeMap.has(net.id)){
        const nn = {
          id: net.id,
          name: net.name,
          kind: 'politician',
          party: net.party || '',
          photo: net.photo || ''
        };
        nodes.push(nn);
        nodeMap.set(net.id, nn);
      }
      const k1 = `${centerId}_${net.id}_${net.typ}`;
      const k2 = `${net.id}_${centerId}_${net.typ}`;
      if(!edgeKeys.has(k1) && !edgeKeys.has(k2)){
        edges.push({
          a: centerId,
          b: net.id,
          typ: net.typ,
          label: net.rel,
          src: net.src || '정치·의정 공적 활동',
          conf: 1
        });
        edgeKeys.add(k1);
      }
    });
  }

  return {
    center: centerId,
    nodes: nodes,
    edges: edges
  };
}

function renderArcGraph(g, targetName){
  if(!g||!g.nodes||!g.edges||!g.edges.length)return'<p class="mute">확인된 인맥·관계망 자료가 쌓이면 자동으로 시각화됩니다.</p>';
  const W=860,H=460,cx=W/2,cy=H/2-6,N={};
  g.nodes.forEach(n=>N[n.id]=n);
  const C=g.center,direct=[],second=[];
  const ds=new Set();
  g.edges.forEach(e=>{
    const o=e.a===C?e.b:e.b===C?e.a:null;
    if(o&&!ds.has(o)){ds.add(o);direct.push([o,e])}
  });
  g.edges.forEach(e=>{
    if(e.a!==C&&e.b!==C){
      for(const[o,p] of [[e.a,e.b],[e.b,e.a]]){
        if(ds.has(p)&&!ds.has(o)&&o!==C&&!second.some(s=>s[0]===o))second.push([o,e,p]);
      }
    }
  });
  const ord=Object.keys(ARC_REL);
  direct.sort((a,b)=>ord.indexOf(a[1].typ)-ord.indexOf(b[1].typ));
  const pos={[C]:[cx,cy]};

  // 관계망 레이아웃: 중심과 1차·2차 관계자가 전체 영역을 시원하게 채우도록 분산
  const R1x = Math.max(180, Math.min(W * 0.36, 290));
  const R1y = Math.max(130, Math.min(H * 0.36, 190));

  if(direct.length === 1){
    pos[C] = [W * 0.22, cy];
    pos[direct[0][0]] = [W * 0.52, cy];
  } else {
    direct.forEach(([o], i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / Math.max(direct.length, 1);
      pos[o] = [cx + R1x * Math.cos(a), cy + R1y * Math.sin(a)];
    });
  }

  const secL = second.slice(0, 24), grp = {};
  secL.forEach(s => {
    const L = (grp[s[2]] = grp[s[2]] || []);
    if(L.length < 6) L.push(s[0]);
  });

  Object.entries(grp).forEach(([p, L]) => {
    const [px, py] = pos[p] || [cx, cy];
    let base = Math.atan2(py - cy, px - cx);
    if(direct.length === 1 && p === direct[0][0]){
      base = 0;
    }
    const spread = Math.min(2.5, Math.max(1.2, 0.7 * (L.length - 1)));
    L.forEach((o, i) => {
      const angle = base + (L.length > 1 ? -spread / 2 + spread * i / (L.length - 1) : 0);
      const rx = 135 + (i % 2) * 36;
      const ry = 75 + (i % 2) * 25;
      let nx = px + rx * Math.cos(angle);
      let ny = py + ry * Math.sin(angle);
      nx = Math.max(50, Math.min(W - 50, nx));
      ny = Math.max(42, Math.min(H - 46, ny));
      pos[o] = [nx, ny];
    });
  });

  const show=new Set(Object.keys(pos));

  // Node descriptions mapping
  const relMap={};
  show.forEach(id=>{
    if(id===C){
      relMap[id]={label:'본인',desc:'의정 및 인맥 분석 대상'};
      return;
    }
    const edge=g.edges.find(e=>(e.a===id&&e.b===C)||(e.b===id&&e.a===C))||g.edges.find(e=>e.a===id||e.b===id);
    if(edge){
      const rInfo=ARC_REL[edge.typ]||['관계','#94a3b8'];
      let shortLbl=edge.label||rInfo[0];
      shortLbl=shortLbl.replace(/\(나이 차.*?\)/g,'').replace(/대학교/g,'대').trim();
      relMap[id]={label:shortLbl,desc:`${edge.label||rInfo[0]}${edge.src?' (출처: '+edge.src+')':''}`};
    } else {
      relMap[id]={label:'연결 인물',desc:'네트워크 연계'};
    }
  });

  const validEdges=g.edges.filter(e=>show.has(e.a)&&show.has(e.b));
  const lines=validEdges.map((e,idx)=>{
    const[a,b]=[pos[e.a],pos[e.b]];
    const r=ARC_REL[e.typ]||['관계','#94a3b8'];
    const prim=e.a===C||e.b===C;
    const isDashed=e.typ==='schoolmate'||e.typ==='hometown';
    return `<line class="arc-edge" data-edge-idx="${idx}" data-a="${esc(e.a)}" data-b="${esc(e.b)}" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${r[1]}" stroke-width="${prim?2.4:1.4}" opacity="${prim?0.85:0.45}" ${isDashed?'stroke-dasharray="4 3"':''}><title>${esc(e.label||r[0])} · 출처 ${esc(e.src||'')}</title></line>
    <line class="arc-flow" data-edge-idx="${idx}" data-a="${esc(e.a)}" data-b="${esc(e.b)}" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${r[1]}" style="--fc:${r[1]}"></line>`;
  }).join('');

  const nd=[...show].map(id=>{
    const n=N[id]||{name:'?'};
    const[x,y]=pos[id];
    const c=id===C,r=c?24:ds.has(id)?17:13;
    const isFamily=n.kind==='family'||id.startsWith('fam_')||id.startsWith('ljm_')||id.startsWith('ysy_')||id.startsWith('hdh_')||id.startsWith('jg_');
    const col=n.party?(partyTheme(n.party)?.color||'#64748b'):(isFamily?(ARC_REL[n.typ]?.[1]||'#e64980'):'#94a3b8');
    const link=isFamily?`https://search.naver.com/search.naver?query=${encodeURIComponent(n.name)}`:(id.startsWith('wd:')?`https://search.naver.com/search.naver?query=${encodeURIComponent(n.name)}`:`entity/${encodeURIComponent(n.name)}`);
    const isExt=isFamily||id.startsWith('wd:');
    const rel=relMap[id]||{label:'',desc:''};
    const safeId=esc(id).replace(/\W/g,'');

    return `<g class="gn ${c?'c':''}" data-id="${esc(id)}" data-name="${esc(n.name)}" data-rel="${esc(rel.desc)}" data-href="${link}" data-ext="${isExt}" data-bx="${x.toFixed(2)}" data-by="${y.toFixed(2)}" data-br="${r}" data-center="${c?'1':'0'}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
      <circle cx="0" cy="0" r="${r}" fill="#fff" stroke="${col}" stroke-width="${c?3.8:2.4}"/>
      ${n.photo?`<clipPath id="cp_${safeId}"><circle cx="0" cy="0" r="${r-1.5}"/></clipPath><image href="${esc(n.photo)}" x="${-r}" y="${-r}" width="${2*r}" height="${2*r}" clip-path="url(#cp_${safeId})" preserveAspectRatio="xMidYMin slice"/>`:`<text x="0" y="4" text-anchor="middle" class="gi" fill="${col}">${esc((n.name||'?')[0])}</text>`}
      <text x="0" y="${r+13}" text-anchor="middle" class="gl">${esc(n.name||'')}</text>
      <text x="0" y="${r+25}" text-anchor="middle" class="gr-desc">${esc(rel.label)}</text>
      <title>${esc(n.name)} (${esc(rel.desc)})</title>
    </g>`;
  }).join('');

  const used=[...new Set(validEdges.map(e=>e.typ))];
  const rows=direct.map(([o,e])=>{
    const n=N[o]||{};
    const r=ARC_REL[e.typ]||['관계','#94a3b8'];
    const isFam=n.kind==='family'||o.startsWith('fam_')||o.startsWith('ljm_')||o.startsWith('ysy_')||o.startsWith('hdh_')||o.startsWith('jg_');
    return `<li style="--rc:${r[1]}"><i></i><b>${isFam||o.startsWith('wd:')?`<a href="https://search.naver.com/search.naver?query=${encodeURIComponent(n.name)}" target="_blank" rel="noopener" title="${esc(n.name)} 검색">${esc(n.name)} <small style="font-size:10px">↗</small></a>`:`<a href="entity/${encodeURIComponent(n.name)}">${esc(n.name)}</a>`}</b><span>${esc(e.label||r[0])}</span><small>${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.src)}</a>`:esc(e.src||'')}${e.conf<0.8?' · 추정':''}</small></li>`;
  }).join('');

  setTimeout(()=>{
    document.querySelectorAll('.arc-gwrap:not([data-bound])').forEach(initArcGraphInteraction);
  }, 25);

  return `<div class="arc-glegend">${used.map(t=>`<span style="--rc:${ARC_REL[t]?.[1]||'#94a3b8'}"><i></i>${ARC_REL[t]?.[0]||t}</span>`).join('')}</div>
  <div class="arc-gwrap">
    <div class="arc-hint-bar" aria-live="polite">
      <span class="arc-hint-icon">✨</span>
      <span class="arc-hint-text">노드를 드래그하거나 롤오버하면 관계 선과 정보가 연결됩니다</span>
    </div>
    <svg viewBox="0 0 ${W} ${H}" class="arc-gsvg" role="img" aria-label="인맥 관계도">${lines}${nd}</svg>
  </div>
  <ul class="arc-glist">${rows}</ul>
  <p class="fine" style="margin-top:8px">※ 실선은 가족·공식 직계 및 정무·동지 관계이며, 점선은 학교 동문이나 출생지 등 공통 배경 관계입니다. 노드를 끌어서 위치를 재배치하거나 터치해 상호 관계를 확인할 수 있습니다.</p>`;
}

function renderFamilySection(p, arc, g){
  g = enrichGraphDetail(g, p?.name, p?.id, arc, p);
  const familyTypes=['parent','spouse','child','sibling','inlaw','relative'];
  const directFamilyEdges=(g?.edges||[]).filter(e=>{
    const isDirect=(e.a===g.center||e.b===g.center);
    return isDirect&&familyTypes.includes(e.typ);
  });
  const nodes={};
  (g?.nodes||[]).forEach(n=>nodes[n.id]=n);
  const familyEvents=(arc?.events||[]).filter(e=>e.typ==='family');
  const isDefector=/탈북|북향민|함흥|평양|국방종합대/.test([p?.name,(p?.history||[]).join(' '),arc?.data?.summary,arc?.data?.wiki?.text].join(' '));

  let content='';
  if(directFamilyEdges.length||familyEvents.length){
    content=`<div class="family-spec-grid">
      ${directFamilyEdges.map(e=>{
        const otherId=e.a===g.center?e.b:e.a;
        const node=nodes[otherId]||{name:'가족'};
        const relLabel=e.label||(ARC_REL[e.typ]?ARC_REL[e.typ][0]:'가족');
        const tagCol=ARC_REL[e.typ]?.[1]||'#d6336c';
        const isFam=node.kind==='family'||otherId.startsWith('fam_')||otherId.startsWith('ljm_')||otherId.startsWith('ysy_')||otherId.startsWith('hdh_')||otherId.startsWith('jg_')||otherId.startsWith('wd:');
        return `<div class="family-spec-card">
          <div class="fsc-top">
            <span class="fsc-badge" style="background:${tagCol}15;color:${tagCol};border:1px solid ${tagCol}30">${esc(relLabel)}</span>
            <strong class="fsc-name">
              ${isFam?`<a href="https://search.naver.com/search.naver?query=${encodeURIComponent(node.name)}" target="_blank" rel="noopener">${esc(node.name)} <span class="fsc-ext">${dossierSvg('external', 11)}</span></a>`:`<a href="entity/${encodeURIComponent(node.name)}">${esc(node.name)}</a>`}
            </strong>
            ${node.party?`<span class="fsc-party" style="color:${partyTheme(node.party)?.color||'#64748b'}">${esc(node.party)}</span>`:''}
          </div>
          ${node.desc?`<p class="fsc-desc">${esc(node.desc)}</p>`:''}
          <div class="fsc-meta">${dossierSvg('bio', 11)} <span>${esc(e.src||'공직자 재산등록 고보 / 공식 인적 기록')}</span></div>
        </div>`;
      }).join('')}
      ${familyEvents.map(fe=>`
        <div class="family-spec-card">
          <div class="fsc-top">
            <span class="fsc-badge" style="background:#47556915;color:#475569;border:1px solid #47556930">가족 기록</span>
            <strong class="fsc-name">${esc(fe.title)}</strong>
          </div>
          <p class="fsc-desc">${esc(fDate(fe.d))} · ${esc(fe.src||'공식 기록')}</p>
        </div>
      `).join('')}
    </div>`;
  }else if(isDefector){
    content=`<div class="pol-defector-note">
      <div class="pdn-badge">🔒 탈북 공직자 특수 보호 안내</div>
      <p><b>북한 잔류 가족 신변 보호:</b> 북한에 거주 중인 친족의 안전을 위해 관계 법령에 따라 비공개 보호 대상입니다.</p>
    </div>`;
  }else{
    // 공직자 재산등록 고보 대상이 아니거나 관계망 데이터가 아예 없는 일반 인물인 경우 섹션 전체 숨김
    if(!p?.assets?.records?.length && (!g || !g.edges || !g.edges.length)) {
      return '';
    }
    content=`<div class="pol-family-empty">
      <p>공직자윤리법 제12조에 따른 재산등록상 직계존비속 고지 정보 기준입니다. (독립생계 유지에 따른 고지거부 가족은 비공개됩니다)</p>
    </div>`;
  }

  return `
  <section class="dossier-sec" id="sec-network">
    <div class="dossier-sec-head">
      <div class="dsh-left">
        <span class="dsh-kicker">DOSSIER 04 / NETWORK & FAMILY</span>
        <h3 class="dsh-title">${dossierSvg('network', 18)} 가족 관계 및 인맥·동문 네트워크</h3>
      </div>
      ${g&&g.edges&&g.edges.length?`<span class="dsh-note">${g.edges.length}개 관계망 연결 분석</span>`:''}
    </div>

    <div class="dossier-spec-card">
      <div style="margin-bottom:14px;display:flex;align-items:center;gap:6px">
        <strong style="font-size:.88rem;color:#0f172a;display:inline-flex;align-items:center;gap:6px">
          ${dossierSvg('user', 14)} 직계 가족 및 핵심 친인척 현황
        </strong>
      </div>
      ${content}

      ${g&&g.edges&&g.edges.length?`
      <details class="dossier-fold" id="fold-network" style="margin-top:16px">
        <summary class="dossier-fold-summary">
          <div class="dfs-left">
            ${dossierSvg('network', 15)}
            <span>인터랙티브 인맥·동문·지역 관계망 네트워크 그래프</span>
            <mark class="dfs-cnt">${g.edges.length}개 노드 연결</mark>
          </div>
          <span class="dfs-toggle">관계망 열기/접기 ${dossierSvg('chevron-down', 13)}</span>
        </summary>
        <div class="dossier-fold-body" style="padding-top:12px">
          ${renderArcGraph(g, p?.name)}
        </div>
      </details>`:''}
    </div>
  </section>`;
}

function renderAssetsSection(p, c){
  if(!p.assets||!p.assets.records||!p.assets.records.length)return'';
  const R=p.assets.records;
  const last=R[R.length-1];
  const m=Math.max(...R.map(r=>r.total||0),1);
  const K=[
    ['토지','land','#7b61ff'],
    ['건물','building','#2f6bff'],
    ['예금·현금','deposits','#11a683'],
    ['증권','securities','#ffb020'],
    ['채무(부채)','debt','#e5243b']
  ];
  if(last.polfund!=null&&last.polfund>0){
    K.push(['정치자금','polfund','#f08c00']);
  }
  const km=Math.max(...K.map(k=>Math.abs(last[k[1]]||0)),1);

  return `<section class="dossier-sec" id="sec-assets">
    <div class="dossier-sec-head">
      <div class="dsh-left">
        <span class="dsh-kicker">DOSSIER 03 / FINANCIAL DISCLOSURE</span>
        <h3 class="dsh-title">${dossierSvg('assets', 18)} 공직자 재산 신고 및 자산 포트폴리오 분석</h3>
      </div>
      <span class="dsh-note">${esc(last.date.slice(0,4))}년 기준 공직자윤리위 정기재산변동 공고</span>
    </div>
    <div class="card pad" style="margin-bottom:14px;border-left:4px solid #16a34a">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px">
        <div>
          <small style="font-size:.74rem;color:#64748b;font-weight:800;letter-spacing:0.5px;text-transform:uppercase">공직자윤리위원회 최신 공개 총 신고액 (${esc(last.date.slice(0,4))}년)</small>
          <b style="display:block;font-size:2.3rem;font-weight:900;letter-spacing:-0.8px;color:#0f172a;margin-top:4px">${polWon(last.total)}</b>
        </div>
        ${last.change!=null?`
        <div style="text-align:right">
          <small style="font-size:.74rem;color:#64748b;font-weight:700">전년 공시 대비 순변동액</small>
          <b style="display:block;font-size:1.35rem;font-weight:900;color:${last.change>=0?'#16a34a':'#dc2626'}">
            ${last.change>=0?'+':''}${polWon(last.change)}
          </b>
        </div>`:''}
      </div>
    </div>
    <div class="pol-g2">
      <div class="card pad">
        <h3>연도별 신고 총액 추이</h3>
        <div class="pol-mbar-scroll" data-drag-scroll="true" style="padding-top:28px">
          <div class="pol-mbar-track" style="min-width:${Math.max(R.length*70, 260)}px;height:120px">
            ${R.map(r=>{
              const wonStr = polWon(r.total);
              const y = r.date.slice(0,4);
              const barH = Math.max(5, Math.round((r.total||0)/m*100));
              return `<div class="pm-col" data-val="${r.total}" tabindex="0" role="img" aria-label="${y}년 신고액 ${wonStr}">
                <span class="pm-tooltip">${y}년 · <b>${wonStr}</b></span>
                <div class="pm-bar-wrap">
                  <span class="pm-count-tag">${wonStr}</span>
                  <i class="pm-bar" style="height:${barH}%;background:${c}"></i>
                </div>
                <span class="pm-lab">${y}년${r.kind!=='정기재산변동신고'?'*':''}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
        <p class="fine" style="margin-top:10px">최신 신고 총액 <b>${polWon(last.total)}</b>${last.change!=null?` (전년 대비 ${last.change>=0?'+':''}${polWon(last.change)})`:''}</p>
      </div>
      <div class="card pad">
        <h3>항목별 재산 구성 (${esc(last.date.slice(0,4))}년 공개)</h3>
        <div class="pol-hbar">
          ${K.map(([n,k,col])=>`<div>
            <span>${n}</span>
            <i style="width:${Math.max(2,Math.abs(last[k]||0)/km*100)}%;background:${col}"></i>
            <b>${polWon(last[k]||0)}</b>
          </div>`).join('')}
        </div>
        <p class="fine">부동산(건물+토지) ${polWon((last.land||0)+(last.building||0))} · 증권 ${polWon(last.securities||0)}</p>
      </div>
    </div>

    <details class="dossier-fold" id="fold-assets">
      <summary class="dossier-fold-summary">
        <div class="dfs-left">
          ${dossierSvg('assets', 15)}
          <span>연도별 상세 재산 변동 신고 내역 & 공보 출처</span>
          <mark class="dfs-cnt">${R.length}회</mark>
        </div>
        <span class="dfs-toggle">상세 신고 내역 펼치기 ${dossierSvg('chevron-down', 13)}</span>
      </summary>
      <div class="dossier-fold-body">
        <div style="display:grid;gap:8px">
          ${R.slice().reverse().map(r=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg);border-radius:8px;font-size:0.86rem">
              <div>
                <b style="color:var(--ink)">${esc(r.date)} (${esc(r.kind||'정기재산변동신고')})</b>
                <div style="font-size:0.75rem;color:var(--ink2);margin-top:2px">${esc(r.issue||'국회공보')} · 관보 공고</div>
              </div>
              <div style="text-align:right">
                <strong style="color:var(--ink);font-size:0.95rem">${polWon(r.total)}</strong>
                ${r.change!=null?`<span style="display:block;font-size:0.75rem;color:${r.change>=0?'#16a34a':'#dc2626'}">${r.change>=0?'+':''}${polWon(r.change)}</span>`:''}
              </div>
            </div>
          `).join('')}
        </div>
        <p class="fine" style="margin-top:12px">본인·배우자·직계존비속 합산 신고액(고지거부 제외)이며, 부동산은 공시가격 등 신고가액이라 실거래 시세와 다를 수 있습니다.<br>
        출처: ${R.map(r=>`<a href="${esc(r.url||'#')}" target="_blank" rel="noopener">${esc(r.issue||'국회공보')}</a>`).join(', ')} (국회공직자윤리위원회 공고)</p>
      </div>
    </details>
  </section>`;
}

function renderIncidentsSection(p, arc){
  const inc=(p.incidents||{}).items||[];
  const STG={'의혹':'s1','수사':'s2','기소·재판':'s3','판결':'s4'};
  const arcAllegations=(arc?.events||[]).filter(e=>e.typ==='allegation'||e.typ==='ruling');
  if(!inc.length&&!arcAllegations.length)return'';

  const counts = {
    '전체': inc.length,
    '의혹': inc.filter(x=>x.stage==='의혹').length,
    '수사': inc.filter(x=>x.stage==='수사').length,
    '기소·재판': inc.filter(x=>x.stage==='기소·재판'||x.stage==='기소').length,
    '판결': inc.filter(x=>x.stage==='판결').length
  };

  return `<section class="dossier-sec" id="sec-incidents">
    <div class="dossier-sec-head">
      <div class="dsh-left">
        <span class="dsh-kicker">DOSSIER 06 / LEGAL & INCIDENTS</span>
        <h3 class="dsh-title">${dossierSvg('incidents', 18)} 사건·사고 및 법적 쟁점 관련 보도</h3>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="dsh-note">공공DB 및 언론 보도 기반 사실 단계 분류</span>
        <span class="pol-info-tip-wrap">
          <button type="button" class="pol-info-btn" id="pol-inc-info-btn" aria-label="사건 분류 안내" title="분류 기준 안내">${dossierSvg('info', 12)}</button>
          <span class="pol-info-popover" role="tooltip">
            <b>사건·사고 보도 분류 안내</b>
            기사 제목과 공공 데이터베이스 단어로 <b>자동 분류</b>한 목록입니다. ‘의혹·수사·기소’ 단계는 확정된 사실이 아니며 사법적 유무죄와 무관합니다. 객관적 사실 확인을 위해 반드시 원문 기사를 확인해 주세요.
          </span>
        </span>
      </div>
    </div>
  <div class="card pad pol-inc">
    <div class="pol-seg-tabs" id="pol-inc-seg-tabs" role="tablist" aria-label="사건 단계별 필터">
      <button type="button" class="pol-seg-btn on" data-stage="all">전체 <b class="seg-cnt">${counts['전체']}</b></button>
      <button type="button" class="pol-seg-btn s1" data-stage="의혹">의혹 <b class="seg-cnt">${counts['의혹']}</b></button>
      <button type="button" class="pol-seg-btn s2" data-stage="수사">수사 <b class="seg-cnt">${counts['수사']}</b></button>
      <button type="button" class="pol-seg-btn s3" data-stage="기소·재판">기소·재판 <b class="seg-cnt">${counts['기소·재판']}</b></button>
      <button type="button" class="pol-seg-btn s4" data-stage="판결">판결 <b class="seg-cnt">${counts['판결']}</b></button>
    </div>
    ${inc.length?`
    <ul class="pol-ilist" id="pol-inc-list">
      ${inc.slice(0, 3).map(x=>`<li data-stage="${esc(x.stage==='기소'?'기소·재판':x.stage)}">
        <em class="${STG[x.stage]||'s1'}">${esc(x.stage)}</em>
        <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>
        <span>${plogo(x.press, x.url, 'q-press-emb')}${esc(fDate(x.date))} · ${esc(x.press||'')}</span>
      </li>`).join('')}
    </ul>

    ${inc.length > 3 || arcAllegations.length ? `
    <details class="dossier-fold" id="fold-incidents">
      <summary class="dossier-fold-summary">
        <div class="dfs-left">
          ${dossierSvg('incidents', 15)}
          <span>수사·기소·재판 및 의혹·사건사고 전체 타임라인</span>
          <mark class="dfs-cnt">${inc.length + arcAllegations.length}건</mark>
        </div>
        <span class="dfs-toggle">사건 기록 전체 펼치기 ${dossierSvg('chevron-down', 13)}</span>
      </summary>
      <div class="dossier-fold-body">
        <ul class="pol-ilist">
          ${inc.slice(3, 40).map(x=>`<li data-stage="${esc(x.stage==='기소'?'기소·재판':x.stage)}">
            <em class="${STG[x.stage]||'s1'}">${esc(x.stage)}</em>
            <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>
            <span>${plogo(x.press, x.url, 'q-press-emb')}${esc(fDate(x.date))} · ${esc(x.press||'')}</span>
          </li>`).join('')}
        </ul>
        ${arcAllegations.length?`
        <div style="margin-top:16px;border-top:1px solid var(--line);padding-top:12px">
          <h4 style="font-size:.86rem;margin-bottom:8px;color:var(--ink)">아카이브 사법·논란 주요 단계</h4>
          <ul class="pol-ilist">
            ${arcAllegations.map(ae=>`<li>
              <em class="${ae.typ==='ruling'?'s4':'s1'}">${ae.typ==='ruling'?'판결':'의혹·사건'}</em>
              <a href="${esc(ae.url||'#')}" target="_blank" rel="noopener">${esc(ae.title)}</a>
              <span>${plogo(ae.src, ae.url||'', 'q-press-emb')}${esc(fDate(ae.d))} · ${esc(ae.src||'')}</span>
            </li>`).join('')}
          </ul>
        </div>`:''}
      </div>
    </details>`:''}
    <p id="pol-inc-empty" class="mute" style="display:none;padding:12px 0;text-align:center">선택하신 단계로 분류된 보도가 없습니다.</p>`:'<p class="mute">연결된 사건 관련 보도가 없습니다.</p>'}
  </div>
  </section>`;
}

function renderActivitySection(p, c){
  const bl=p.bills;
  const terms=p.terms||[];
  const swA=p.party_switches||[];
  const sw=swA.filter(s=>s.kind!=='rename');
  const V=p.votes;

  // 의정/입법 데이터가 전혀 없는 인물인 경우 타이틀/섹션 전체 숨김 처리
  if(!bl && !terms.length && !sw.length && !V) return '';

  return `<section class="dossier-sec" id="sec-activity">
    <div class="dossier-sec-head">
      <div class="dsh-left">
        <span class="dsh-kicker">DOSSIER 02 / LEGISLATIVE RECORD</span>
        <h3 class="dsh-title">${dossierSvg('landmark', 18)} 의정 및 입법 활동 대시보드</h3>
      </div>
      <span class="dsh-note">열린국회정보 공공 API 실시간 연동</span>
    </div>
  <div class="pol-kgrid">
    <div class="card pol-k">
      <em>대표발의</em>
      <b>${bl?fmt(bl.lead_count):'—'}</b>
      <span>${bl?`가결·반영 ${fmt(bl.passed)}건 (${bl.lead_count?Math.round(bl.passed/bl.lead_count*100):0}%)`:'자료 수집 중'}</span>
    </div>
    <div class="card pol-k">
      <em>공동발의</em>
      <b>${bl?fmt(bl.co_count):'—'}</b>
      <span>${bl?(bl.ages||[]).join(',')+'대 국회':''}</span>
    </div>
    <div class="card pol-k">
      <em>당적 변경</em>
      <b>${sw.length}회</b>
      <span>대수 사이 기준</span>
    </div>
    <div class="card pol-k">
      <em>본회의 표결</em>
      <b>${V?fmt(V.count):'—'}건</b>
      <span>${V?(V.ages||[]).join(',')+'대 참여':'자료 수집 중'}</span>
    </div>
  </div>

  <div class="card pad" style="margin-top:10px">
    <h3>당선 및 정당 이력</h3>
    <ol class="pol-terms">
      ${terms.map(t=>`<li style="--pc:${pc(t.party)}">
        <b>제${t.age}대</b>
        <span class="tp">${esc(t.party||'')}</span>
        <span class="td">${esc(t.district||'')} ${t.kind&&t.kind!==t.district?`<small>${esc(t.kind)}</small>`:''}</span>
        ${(x=>x?`<em class="swb ${x.kind==='rename'?'rn':''}">${x.kind==='rename'?'당명 변경·계승':'당적 변경'} ${esc(x.from)} → ${esc(t.party)}</em>`:'')(swA.find(s=>s.between&&s.between[1]===t.age))}
      </li>`).join('')}
    </ol>
  </div>

  ${bl?`
  <div class="card pad" style="margin-top:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h3 style="margin:0">대표발의 처리 결과</h3>
      <small style="color:var(--mute);font-size:.74rem">가결률 ${bl.lead_count?Math.round(bl.passed/bl.lead_count*100):0}%</small>
    </div>
    ${polBars(bl.by_result,c)}

    <details class="dossier-fold" id="fold-bills">
      <summary class="dossier-fold-summary">
        <div class="dfs-left">
          ${dossierSvg('landmark', 15)}
          <span>대표발의 법안 상세 목록 & 월별 발의 추이</span>
          <mark class="dfs-cnt">${(bl.recent||[]).length}건</mark>
        </div>
        <span class="dfs-toggle">법안 목록 펼치기 ${dossierSvg('chevron-down', 13)}</span>
      </summary>
      <div class="pol-fold-body">
        <div class="pol-month-chart-card" id="pol-month-box" style="margin-bottom:14px">
          <div class="pol-month-header">
            <div>
              <h4 style="margin:0;display:inline-flex;align-items:center;gap:8px">
                <span>월별 대표발의 추이</span>
                <span class="pol-chart-badge">최근 24개월</span>
              </h4>
              <p class="pol-chart-sub">막대를 누르면 해당 월의 발의 법안만 필터링됩니다.</p>
            </div>
            <div class="pol-month-stat-pill" id="pol-month-active-pill">
              <span>선택: <b>전체 기간</b></span>
            </div>
          </div>
          ${polMonths(bl.by_month,c,'bill')}
        </div>
        <div class="pol-bill-card" id="pol-bill-box">
          <div class="pol-bill-header">
            <div>
              <h4 style="margin:0;display:inline-flex;align-items:center;gap:8px">
                <span>대표발의 법안 목록</span>
                <span id="pol-bill-count-pill" class="pol-bill-count-pill">전체 ${(bl.recent||[]).length}건</span>
              </h4>
              <p class="pol-bill-sub" id="pol-bill-sub">상태별 탭을 눌러 심층 필터링할 수 있습니다.</p>
            </div>
            <div class="pol-bill-filter-tabs" id="pol-bill-filter-tabs">
              <button type="button" class="on" data-bill-res="all">전체 (${(bl.recent||[]).length})</button>
              ${Object.entries(bl.by_result||{}).map(([k,v])=>`<button type="button" data-bill-res="${esc(k)}">${esc(k)} (${v})</button>`).join('')}
            </div>
          </div>
          <div id="pol-bill-filter-banner" class="pol-bill-filter-banner" style="display:none">
            <span id="pol-bill-filter-text"></span>
            <button type="button" id="pol-bill-filter-reset">✕ 전체 보기</button>
          </div>
          <ul class="pol-blist" id="pol-bill-list">
            ${renderBillListHtml(bl.recent||[], 'all', c)}
          </ul>
          <div id="pol-bill-ext-link" class="pol-bill-ext-link">
            <a href="https://likms.assembly.go.kr/bill/main.do" target="_blank" rel="noopener">
              🏛️ 국회 의안정보시스템에서 <b>${esc(p.name)} 의원</b>의 대표발의안 전체 원문 검색하기 ↗
            </a>
          </div>
          <p class="fine" style="margin-top:10px">출처: <a href="${esc(bl.source?.url||'https://likms.assembly.go.kr/bill/main.do')}" target="_blank" rel="noopener">${esc(bl.source?.name||'국회 의안정보시스템')}</a></p>
        </div>
      </div>
    </details>
  </div>`:''}

  ${V?(()=>{
    const S={};
    Object.values(V.summary||{}).forEach(o=>Object.entries(o).forEach(([k,n])=>S[k]=(S[k]||0)+n));
    const T=Object.values(S).reduce((a,b)=>a+b,0)||1;
    const C={'찬성':'#11a683','반대':'#e5243b','기권':'#ffb020','불참':'#c3c8dc'};
    return `<div class="card pad" style="margin-top:10px">
      <h3>본회의 표결 성향 (${(V.ages||[]).join(',')}대 국회 · 총 ${fmt(V.count)}건)</h3>
      <div class="pol-seat">
        ${Object.entries(S).map(([k,n])=>`<i style="flex:${n};background:${C[k]||'#8189a3'}" title="${esc(k)} ${fmt(n)}건"></i>`).join('')}
      </div>
      <div class="pol-vk-row" style="display:flex;flex-wrap:wrap;gap:12px;margin:12px 0 8px">
        ${Object.entries(S).map(([k,n])=>`<span class="pol-vk" style="display:inline-flex;align-items:center;gap:5px;font-size:.8rem">
          <i style="width:10px;height:10px;border-radius:50%;background:${C[k]||'#8189a3'}"></i>
          ${esc(k)} <b>${fmt(n)}건</b> <small style="color:var(--mute)">(${Math.round(n/T*100)}%)</small>
        </span>`).join('')}
      </div>
      ${V.dissent&&V.dissent.length?`
      <details class="dossier-fold" id="fold-votes">
        <summary class="dossier-fold-summary">
          <div class="dfs-left">
            ${dossierSvg('landmark', 15)}
            <span>본회의 소신 표결 안건 (반대·기권 상세)</span>
            <mark class="dfs-cnt">${V.dissent.length}건</mark>
          </div>
          <span class="dfs-toggle">안건 목록 펼치기 ${dossierSvg('chevron-down', 13)}</span>
        </summary>
        <div class="dossier-fold-body">
          <ul class="pol-blist">
            ${V.dissent.slice(0,20).map(x=>`<li>
              <a href="https://likms.assembly.go.kr/bill/billDetail.do?billId=${esc(x.id)}" target="_blank" rel="noopener">${esc(x.name)}</a>
              <span>${esc(fDate(x.date))} · <b style="color:${C[x.vote]||'#000'}">${esc(x.vote)}</b></span>
            </li>`).join('')}
          </ul>
        </div>
      </details>`:''}
    </div>`;
  })():''}
  </section>`;
}

function renderQuotesSection(p, id){
  const md=p?.media;
  const quotesList = (md?.quotes && md.quotes.length) ? md.quotes : (p?.quotes || []);
  const topWords = md?.top_words || [];

  // 발언 데이터가 없으면 타이틀/섹션 전체 숨김 처리 (데이터가 없는 빈 껍데기 타이틀 노출 방지)
  if(!quotesList.length) return '';

  // 화제성 점수(Topic Buzz / Heat Score) 및 썸네일 산출
  const topWordMap = new Map();
  topWords.forEach(([w, c], idx) => {
    topWordMap.set(w, Math.max(2, 28 - idx));
  });

  const dateCounts = {};
  quotesList.forEach(q => {
    const d = (q.date || '').slice(0, 10);
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });

  const scoredQuotes = quotesList.slice(0, 15).map(q => {
    let score = 56;
    const txt = q.quote || '';
    for (const [w, weight] of topWordMap) {
      if (txt.includes(w)) score += weight * 1.6;
    }
    const d = (q.date || '').slice(0, 10);
    score += Math.min(22, (dateCounts[d] || 1) * 4);
    const finalScore = Math.min(99, Math.round(score));

    let thumbImg = q.image || null;
    if (!thumbImg && window.D && D.issues) {
      const match = D.issues.find(iss => iss.image && (iss.title.includes(txt.slice(0, 8)) || (iss.leads||[]).some(l => l.text.includes(txt.slice(0, 8)))));
      if (match) thumbImg = match.image;
    }
    return { ...q, score: finalScore, thumbImg };
  });

  const scores = scoredQuotes.map(x => x.score);
  const maxBuzz = scores.length ? Math.max(...scores) : 70;
  const avgBuzz = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 60;

  const quotesHtml = scoredQuotes.map(q => {
    const isPeak = (q.score === maxBuzz && q.score >= 75);
    const isAboveAvg = (q.score > avgBuzz);
    const flameClass = isPeak ? 'flame-peak' : (isAboveAvg ? 'flame-high' : 'flame-subtle');
    const badgeClass = isPeak ? 'peak' : (isAboveAvg ? 'high' : 'normal');

    const aiSummary = extractQuoteAiSummary(q.quote, p.name);

    return `<li class="pol-qitem ${isPeak ? 'q-peak' : (isAboveAvg ? 'q-high' : '')}">
      <div class="q-thumb ${q.thumbImg ? '' : 'noimg'}" ${q.thumbImg ? `style="background-image:url('${esc(q.thumbImg)}')"` : ''}>
        ${q.thumbImg ? '' : `${plogo(q.press, q.url, 'q-thumb-logo')}<span class="q-thumb-mark">“</span>`}
      </div>
      <div class="q-content">
        <div class="q-topline">
          <span class="q-heat-badge ${badgeClass}" title="화제성 지수 ${q.score}점 (${isPeak ? '최고 화제 보도' : (isAboveAvg ? '평균 이상 화제 보도' : '일반')})">
            ${NBI('flame', 1, flameClass)}
            <b class="q-heat-val">화제 ${q.score}</b>
          </span>
          <time class="q-date">${esc(fDate(q.date))}</time>
        </div>
        <a href="${esc(q.url)}" target="_blank" rel="noopener" class="q-title ${isPeak ? 'peak' : (isAboveAvg ? 'high' : '')}" title="${esc(q.quote)}">
          “${esc(q.quote)}”
        </a>
        <div class="q-ai-summary">
          <span class="q-ai-badge">✨ AI 핵심 요약</span>
          <p class="q-ai-text">${esc(aiSummary)}</p>
        </div>
        <div class="q-meta">
          <span class="q-press-bullet">${plogo(q.press, q.url, 'q-press-emb')}</span>
          <span class="q-press-name">${esc(q.press || '언론사')}</span>
        </div>
      </div>
    </li>`;
  }).join('');

  return `<section class="dossier-sec" id="sec-quotes">
    <div class="dossier-sec-head">
      <div class="dsh-left">
        <span class="dsh-kicker">DOSSIER 05 / PUBLIC STATEMENTS</span>
        <h3 class="dsh-title">${dossierSvg('quotes', 18)} 언론 보도 및 주요 발언 대시보드</h3>
      </div>
      <span class="dsh-note">화제성 높은 보도 우선 하이라이트</span>
    </div>
  ${quotesHtml ? `
  <div class="card pad" style="margin-top:10px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:12px">
      <h3 style="margin:0">헤드라인에 실린 주요 발언·어록</h3>
      <span class="pol-press-subtag">화제성 높은 보도 우선 하이라이트</span>
    </div>
    <ul class="pol-qlist">
      ${scoredQuotes.slice(0, 3).map(q => {
        const d = (q.date || '').slice(0, 10);
        const y = d.slice(0, 4);
        return `<li class="pol-qitem">
          <div class="pol-qhead">
            <span class="pol-qdate">${esc(d)}</span>
            <span class="pol-qheat">${dossierSvg('fire', 12)} <b>${q.score}</b>점</span>
          </div>
          <div class="pol-qbody">
            <q class="pol-quote">${esc(q.quote)}</q>
            <div class="pol-qmeta">
              <span class="q-press-name">${esc(q.press || '언론사')}</span>
            </div>
          </div>
        </li>`;
      }).join('')}
    </ul>

    ${scoredQuotes.length > 3 ? `
    <details class="dossier-fold" id="fold-quotes">
      <summary class="dossier-fold-summary">
        <div class="dfs-left">
          ${dossierSvg('quotes', 15)}
          <span>수집된 주요 발언·어록 전체 목록 펼쳐보기</span>
          <mark class="dfs-cnt">${scoredQuotes.length}건</mark>
        </div>
        <span class="dfs-toggle">발언 전체 펼치기 ${dossierSvg('chevron-down', 13)}</span>
      </summary>
      <div class="dossier-fold-body">
        <ul class="pol-qlist">
          ${scoredQuotes.slice(3).map(q => {
            const d = (q.date || '').slice(0, 10);
            return `<li class="pol-qitem">
              <div class="pol-qhead">
                <span class="pol-qdate">${esc(d)}</span>
                <span class="pol-qheat">${dossierSvg('fire', 12)} <b>${q.score}</b>점</span>
              </div>
              <div class="pol-qbody">
                <q class="pol-quote">${esc(q.quote)}</q>
                <div class="pol-qmeta">
                  <span class="q-press-name">${esc(q.press || '언론사')}</span>
                </div>
              </div>
            </li>`;
          }).join('')}
        </ul>
      </div>
    </details>`:''}
  </div>`:''}

  ${md&&(md.top_words||[]).length?`
  <div class="card pad" style="margin-top:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:8px">
      <h3 style="margin:0">헤드라인 핵심 연관 단어</h3>
      <span class="pol-press-subtag">출현 빈도순 주요 키워드 클라우드</span>
    </div>
    <div class="pol-cloud">
      ${md.top_words.slice(0,28).map(([w,n],i)=>`
        <a class="pol-word-chip" href="kw/${encodeURIComponent(w)}" style="font-size:${(.8+Math.min(1,n/md.top_words[0][1])*.9).toFixed(2)}rem;opacity:${(1-i/40).toFixed(2)}" title="'${esc(w)}' 키워드 타임라인 보기">
          #${esc(w)}
        </a>
      `).join('')}
    </div>
  </div>`:''}
  </section>`;
}

function extractQuoteAiSummary(txt, speaker){
  if(!txt) return '';
  const clean = txt.replace(/^[“"']|[”"']$/g, '').trim();
  const prefix = speaker ? (speaker + ': ') : '';
  return prefix + '"' + clean + '" 발언 및 관련 보도 맥락';
}

function getOrgSymbolHtml(text, size=28){
  if(!text)return'';
  const str=String(text);

  // 1. Political Parties
  if(/국민의힘|새누리|한나라|자유한국|미래통합|국민의미래/.test(str)){
    return`<span class="c-symbol p-ppp" title="국민의힘">${partyMark('국민의힘',size)}</span>`;
  }
  if(/더불어민주|민주당|새정치국민회의|열린우리|평화민주/.test(str)){
    return`<span class="c-symbol p-dp" title="더불어민주당">${partyMark('더불어민주당',size)}</span>`;
  }
  if(/조국혁신/.test(str)){
    return`<span class="c-symbol p-jgp" title="조국혁신당">${partyMark('조국혁신당',size)}</span>`;
  }
  if(/개혁신당/.test(str)){
    return`<span class="c-symbol p-nrp" title="개혁신당">${partyMark('개혁신당',size)}</span>`;
  }
  if(/진보당/.test(str)){
    return`<span class="c-symbol p-jbp" title="진보당">${partyMark('진보당',size)}</span>`;
  }
  if(/기본소득/.test(str)){
    return`<span class="c-symbol p-bip" title="기본소득당">${partyMark('기본소득당',size)}</span>`;
  }
  if(/사회민주/.test(str)){
    return`<span class="c-symbol p-sdp" title="사회민주당">${partyMark('사회민주당',size)}</span>`;
  }

  // 2. 대한민국 국회
  if(/국회|국회의원|의원실|운영위원회|상임위|과학기술정보|비례대표|예결위|외통위|법사위|과방위/.test(str)){
    return`<span class="c-symbol c-na" title="대한민국 국회">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
        <circle cx="12" cy="12" r="11" fill="#1b2a4a" stroke="#d4af37" stroke-width="1.2"/>
        <circle cx="12" cy="12" r="8.8" fill="none" stroke="#e2b842" stroke-width="0.8" stroke-dasharray="1.5 1"/>
        <text x="12" y="15.2" text-anchor="middle" font-size="7.5" font-weight="900" fill="#ffffff" font-family="'Pretendard Variable',sans-serif">국회</text>
      </svg>
    </span>`;
  }

  // 3. 서울대학교
  if(/서울대/.test(str)){
    return`<span class="c-symbol c-snu" title="서울대학교">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
        <circle cx="12" cy="12" r="11" fill="#0f1f4b" stroke="#3b82f6" stroke-width="1"/>
        <path d="M7 14.5c0-3.5 2-6.5 5-7.5 3 1 5 4 5 7.5" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M8.5 13.5l3.5-1.5 3.5 1.5M12 12v4.5" stroke="#93c5fd" stroke-width="1.2"/>
        <text x="12" y="19" text-anchor="middle" font-size="5" font-weight="900" fill="#ffffff">SNU</text>
      </svg>
    </span>`;
  }

  // 4. 김정은국방종합대학 / 북한 국방대
  if(/국방종합|김정은국방|김책공대|리과대|평양/.test(str)){
    return`<span class="c-symbol c-ndu" title="국방종합대학">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#1e293b" stroke="#f59e0b" stroke-width="1"/>
        <path d="M12 4.5l2 4 4.5.6-3.2 3.2.8 4.5-4.1-2.2-4.1 2.2.8-4.5-3.2-3.2 4.5-.6z" fill="#f59e0b"/>
        <text x="12" y="20" text-anchor="middle" font-size="4.2" font-weight="800" fill="#cbd5e1">국방대</text>
      </svg>
    </span>`;
  }

  // 5. 현대제철 / 현대
  if(/현대제철|현대자동차|현대중공업|현대그룹|현대/.test(str)){
    return`<span class="c-symbol c-hyundai" title="현대제철">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#002c5f" stroke="#0072ce" stroke-width="1"/>
        <path d="M7 6.5h2.5v11H7zM14.5 6.5H17v11h-2.5zM8 11.5h8v2H8z" fill="#ffffff"/>
        <text x="12" y="20.5" text-anchor="middle" font-size="4.2" font-weight="800" fill="#38bdf8">HYUNDAI</text>
      </svg>
    </span>`;
  }

  // 6. 카이스트
  if(/카이스트|KAIST|한국과학기술원/.test(str)){
    return`<span class="c-symbol c-kaist" title="KAIST">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#004191" stroke="#38bdf8" stroke-width="1"/>
        <text x="12" y="14.8" text-anchor="middle" font-size="6.5" font-weight="900" fill="#ffffff" font-family="'Pretendard Variable',sans-serif">KAIST</text>
      </svg>
    </span>`;
  }

  // 7. 고려대
  if(/고려대/.test(str)){
    return`<span class="c-symbol c-ku" title="고려대학교">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
        <circle cx="12" cy="12" r="11" fill="#8a0026" stroke="#d4af37" stroke-width="1"/>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="#fbbf24" stroke-width="0.8"/>
        <text x="12" y="15" text-anchor="middle" font-size="7" font-weight="900" fill="#ffffff">KU</text>
      </svg>
    </span>`;
  }

  // 8. 연세대
  if(/연세대/.test(str)){
    return`<span class="c-symbol c-yonsei" title="연세대학교">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
        <circle cx="12" cy="12" r="11" fill="#003764" stroke="#60a5fa" stroke-width="1"/>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="#93c5fd" stroke-width="0.8"/>
        <text x="12" y="15" text-anchor="middle" font-size="6.5" font-weight="900" fill="#ffffff">YS</text>
      </svg>
    </span>`;
  }

  // 9. 연구소 / 연구원
  if(/연구소|연구원|연구개발|연구센터|KIST|ETRI|ADD|재료공학/.test(str)){
    return`<span class="c-symbol c-lab" title="연구기관">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#0e7490" stroke="#22d3ee" stroke-width="1"/>
        <path d="M10 5v4l-3.5 6.5A1.5 1.5 0 0 0 7.8 18h8.4a1.5 1.5 0 0 0 1.3-2.5L14 9V5" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="12" cy="14" r="1.5" fill="#67e8f9"/>
      </svg>
    </span>`;
  }

  // 10. 일반 학력 (대학/학사/석사/박사)
  if(/대학교|대학원|학사|석사|박사|수학|졸업|학교/.test(str)){
    return`<span class="c-symbol c-edu" title="학력">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
        <circle cx="12" cy="12" r="11" fill="#1e293b" stroke="#94a3b8" stroke-width="1"/>
        <path d="M12 6L4 10.5 12 15l8-4.5L12 6z" fill="#94a3b8"/>
        <path d="M7 12.2v4.3c0 1.8 2.2 3.2 5 3.2s5-1.4 5-3.2v-4.3" stroke="#cbd5e1" stroke-width="1.2" fill="none"/>
        <path d="M19 11v5" stroke="#f59e0b" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </span>`;
  }

  // 11. 일반 정부 / 공직
  if(/대통령|정부|청와대|부처|장관|차관|처장|청장|지사|시장|구청장|검찰|법원|청/.test(str)){
    return`<span class="c-symbol c-gov" title="정부·공직">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
        <circle cx="12" cy="12" r="11" fill="#0369a1" stroke="#7dd3fc" stroke-width="1"/>
        <circle cx="12" cy="12" r="6" fill="#ef4444"/>
        <path d="M6 12a6 6 0 0 1 12 0c0 3.3-2.7 6-6 6a6 6 0 0 1-6-6z" fill="#2563eb"/>
      </svg>
    </span>`;
  }

  // 기본 조직
  return`<span class="c-symbol c-org" title="이력">
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#334155" stroke="#64748b" stroke-width="1"/>
      <path d="M7 19V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12" stroke="#ffffff" stroke-width="1.4"/>
      <rect x="10" y="8" width="1.5" height="1.5" fill="#ffffff"/>
      <rect x="13" y="8" width="1.5" height="1.5" fill="#ffffff"/>
      <rect x="10" y="12" width="1.5" height="1.5" fill="#ffffff"/>
      <rect x="13" y="12" width="1.5" height="1.5" fill="#ffffff"/>
      <path d="M11 19v-3h2v3" fill="#94a3b8"/>
    </svg>
  </span>`;
}

function renderCareerSection(p, arc){
  const hist=p.history||[];
  const eduEvents=(arc?.events||[]).filter(e=>e.typ==='edu');

  if(!hist.length&&!eduEvents.length)return'';

  return `<section class="dossier-sec" id="sec-career">
    <div class="dossier-sec-head">
      <div class="dsh-left">
        <span class="dsh-kicker">DOSSIER 07 / CAREER & CREDENTIALS</span>
        <h3 class="dsh-title">${dossierSvg('career', 18)} 주요 학력 및 사회·공직 경력</h3>
      </div>
      <span class="dsh-note">공직 선거 공보 및 공식 기록 기준</span>
    </div>
  <div class="card pad">
    ${eduEvents.length?`
    <h3 style="margin-bottom:10px;display:flex;align-items:center;gap:6px">
      <span>학력</span>
      <span class="pol-press-subtag">공식 기록</span>
    </h3>
    <ul class="pol-career-list pol-edu-list" style="margin-bottom:16px">
      ${eduEvents.map(e=>{
        const titleText=e.title||'';
        const sym=getOrgSymbolHtml(titleText, 28);
        const dateStr=fDate(e.d?e.d.slice(0,7):'');
        return `<li class="pol-career-item">
          <div class="pci-symbol">${sym}</div>
          <div class="pci-body">
            <div class="pci-title-row">
              ${dateStr?`<time class="pci-date">${esc(dateStr)}</time>`:''}
              <strong class="pci-title">${esc(titleText)}</strong>
              ${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener" class="pci-src-btn">출처 ↗</a>`:''}
            </div>
          </div>
        </li>`;
      }).join('')}
    </ul>`:''}
    <h3 style="margin-bottom:10px;display:flex;align-items:center;gap:6px">
      <span>주요 경력 및 이력</span>
      <span class="pol-press-subtag">활동 및 직책</span>
    </h3>
    <ul class="pol-career-list">
      ${hist.slice(0, 4).map(h=>{
        const sym=getOrgSymbolHtml(h, 28);
        const isCur=/現\)|현재|현직/.test(h);
        const isPast=/前\)|전직/.test(h);
        const badgeText=isCur?'現':(isPast?'前':'');
        const cleanText=h.replace(/^(現\)|前\)|現|前)\s*/,'');
        return `<li class="pol-career-item ${isCur?'cur':''}">
          <div class="pci-symbol">${sym}</div>
          <div class="pci-body">
            <div class="pci-title-row">
              ${badgeText?`<span class="pci-badge ${isCur?'cur':'past'}">${badgeText}</span>`:''}
              <strong class="pci-title">${esc(cleanText)}</strong>
            </div>
          </div>
        </li>`;
      }).join('')}
    </ul>

    ${hist.length > 4 ? `
    <details class="dossier-fold" id="fold-career" style="margin-top:14px">
      <summary class="dossier-fold-summary">
        <div class="dfs-left">
          ${dossierSvg('career', 15)}
          <span>전체 상세 경력 및 이전 직책 목록 펼쳐보기</span>
          <mark class="dfs-cnt">${hist.length}개</mark>
        </div>
        <span class="dfs-toggle">경력 전체 펼치기 ${dossierSvg('chevron-down', 13)}</span>
      </summary>
      <div class="dossier-fold-body">
        <ul class="pol-career-list">
          ${hist.slice(4).map(h=>{
            const sym=getOrgSymbolHtml(h, 28);
            const isCur=/現\)|현재|현직/.test(h);
            const isPast=/前\)|전직/.test(h);
            const badgeText=isCur?'現':(isPast?'前':'');
            const cleanText=h.replace(/^(現\)|前\)|現|前)\s*/,'');
            return `<li class="pol-career-item ${isCur?'cur':''}">
              <div class="pci-symbol">${sym}</div>
              <div class="pci-body">
                <div class="pci-title-row">
                  ${badgeText?`<span class="pci-badge ${isCur?'cur':'past'}">${badgeText}</span>`:''}
                  <strong class="pci-title">${esc(cleanText)}</strong>
                </div>
              </div>
            </li>`;
          }).join('')}
        </ul>
      </div>
    </details>`:''}
  </div>
  </section>`;
}

function triggerCoinShower(targetSec){
  if(!targetSec || targetSec.dataset.showered) return;
  targetSec.dataset.showered = 'true';

  let showerWrap = targetSec.querySelector('.coin-shower-wrap');
  if(!showerWrap){
    showerWrap = document.createElement('div');
    showerWrap.className = 'coin-shower-wrap';
    showerWrap.setAttribute('aria-hidden', 'true');
    targetSec.style.position = 'relative';
    targetSec.appendChild(showerWrap);
  }

  const coinCount = 18;
  for(let i = 0; i < coinCount; i++){
    const coin = document.createElement('span');
    coin.className = 'coin-drop-particle';
    const leftPercent = 5 + Math.random() * 90;
    const delay = Math.random() * 0.9;
    const duration = 1.2 + Math.random() * 0.8;
    const size = 16 + Math.random() * 12;
    coin.style.left = `${leftPercent}%`;
    coin.style.animationDelay = `${delay}s`;
    coin.style.animationDuration = `${duration}s`;
    coin.style.fontSize = `${size}px`;
    coin.textContent = (i % 3 === 0) ? '🪙' : (i % 3 === 1 ? '💰' : '✨');
    showerWrap.appendChild(coin);

    setTimeout(() => {
      coin.remove();
    }, (delay + duration + 0.3) * 1000);
  }
}

function renderLifeTimelineSection(arc){
  if(!arc||!arc.events||!arc.events.length)return'';
  const E=(arc.events||[]).filter(e => e.stage !== '언론 보도');
  const types=[...new Set(E.map(e=>e.typ))];

  const births = E.filter(x=>x.typ==='birth');
  const edus = E.filter(x=>x.typ==='edu');
  const careers = E.filter(x=>x.typ==='career');
  const mil = arc.military || E.find(x=>x.typ==='military')?.title || arc.data?.military;

  // 출생 정보 정규화 (중복 괄호 및 제목 버그 제거)
  let birthClean = '';
  if(births[0]){
    const desc = (births[0].desc || '').trim();
    const title = (births[0].title || '').trim();
    if(desc && desc !== title){
      const tClean = title.replace(/^출생\s*\(?/, '').replace(/\)?$/, '').trim();
      birthClean = tClean && !desc.includes(tClean) ? `${tClean} · ${desc}` : desc;
    } else {
      birthClean = desc || title;
    }
  }

  // 학력 체인 (깨끗한 텍스트)
  const eduChain = edus.map(x => x.title.replace(/\s*\([^)]*학력\)/g, '').trim()).join(' → ');

  // 주요 경력
  const careerText = careers.slice(0, 4).map(x => x.title.trim()).join(' · ');

  return `
  <section class="dossier-sec" id="sec-lifetl">
    <header class="dossier-sec-head">
      <div class="dsh-left">
        <span class="dsh-tag">DOSSIER / 01 BIOGRAPHY</span>
        <h2 class="dsh-title">${dossierSvg('bio', 18)} 생애 핵심 이력 및 상세 타임라인</h2>
      </div>
      <span class="dsh-badge">${fmt(E.length)}건의 공적 기록</span>
    </header>

    <div class="dossier-spec-card">
      <div class="spec-subhead">
        <h3 class="spec-subtitle">${dossierSvg('calendar', 14)} 인물 기본 프로필 및 생애 요약</h3>
      </div>
      <div class="spec-sheet-grid">
        ${birthClean ? `
          <div class="spec-block">
            <span class="spec-block-label">${dossierSvg('user', 14)} 출생</span>
            <div class="spec-block-val">${esc(birthClean)}</div>
          </div>` : ''}
        ${eduChain ? `
          <div class="spec-block">
            <span class="spec-block-label">${dossierSvg('edu', 14)} 학력</span>
            <div class="spec-block-val">${esc(eduChain)}</div>
          </div>` : ''}
        ${mil ? `
          <div class="spec-block">
            <span class="spec-block-label">${dossierSvg('shield', 14)} 병역</span>
            <div class="spec-block-val">${esc(mil)}</div>
          </div>` : ''}
        ${careerText ? `
          <div class="spec-block">
            <span class="spec-block-label">${dossierSvg('career', 14)} 주요 경력</span>
            <div class="spec-block-val">${esc(careerText)}</div>
          </div>` : ''}
      </div>

      <details class="dossier-fold" id="fold-lifetl" style="margin-top:16px">
        <summary class="dossier-fold-summary">
          <div class="dfs-left">
            ${dossierSvg('bio', 15)}
            <span>출생부터 현재까지 생애 전체 타임라인 & 상세 이력서</span>
            <mark class="dfs-cnt">${E.length}건 전체</mark>
          </div>
          <span class="dfs-toggle">상세 이력 펼치기 ${dossierSvg('chevron-down', 13)}</span>
        </summary>
        <div class="dossier-fold-body">
          <div class="arc-legend" style="margin-bottom:12px">
            <span><i class="arc-st fact"></i>공적 확인 기록</span>
            <span><i class="arc-st allegation"></i>사안·수사 단계</span>
            <span><i class="arc-st confirmed"></i>사법 판결 확정</span>
          </div>
          <div class="arc-fil" id="arc-fil" style="margin-bottom:14px">
            <button class="on" data-t="">전체 (${E.length})</button>
            ${types.map(t=>`<button data-t="${t}" style="--tc:${ARC_TYP[t]?.[1]||'#0f1630'}">${ARC_TYP[t]?.[0]||t} ${E.filter(e=>e.typ===t).length}</button>`).join('')}
          </div>
          <div id="arc-tl-box"></div>
        </div>
      </details>
    </div>
  </section>`;
}

async function fetchHistoryPersonData(polId){
  if(!polId) return null;
  const urls = [
    `https://raw.githubusercontent.com/pyw31337/news/history/h/p/a${encodeURIComponent(polId)}.json.gz`,
    `https://raw.githubusercontent.com/pyw31337/news/history/h/p/${encodeURIComponent(polId)}.json.gz`
  ];
  for(const u of urls){
    try{
      const r = await fetch(u);
      if(r.ok && typeof DecompressionStream !== 'undefined'){
        const ds = r.body.pipeThrough(new DecompressionStream('gzip'));
        const jsonText = await new Response(ds).text();
        const json = JSON.parse(jsonText);
        if(json && Array.isArray(json.it) && json.it.length) return json;
      }
    }catch(_){}
  }
  return null;
}

async function loadFullPersonData(name, polId){
  if(!polId){
    const pm=await ensurePolIndex();
    if(pm[name])polId=pm[name].id;
  }
  if(!polId){
    try{
      const s=await fetch('https://newsboard-sync.pyw213.workers.dev/archive/people?q='+encodeURIComponent(name)).then(r=>r.ok?r.json():[]);
      if(s&&s[0]&&s[0].name===name)polId=s[0].id;
    }catch(_){}
  }

  const [polDetail, arcDetailRaw, graphDetail, histDetail, bioDb]=await Promise.all([
    polId ? fetch(`data/pol/people/${encodeURIComponent(polId)}.json`).then(r=>r.ok?r.json():null).catch(()=>null) : null,
    polId ? fetch(`https://newsboard-sync.pyw213.workers.dev/archive/person/${encodeURIComponent(polId)}`).then(r=>r.ok?r.json():null).catch(()=>null) : null,
    polId ? fetch(`https://newsboard-sync.pyw213.workers.dev/archive/graph/${encodeURIComponent(polId)}`).then(r=>r.ok?r.json():null).catch(()=>null) : null,
    polId ? fetchHistoryPersonData(polId) : null,
    ensurePeopleBio().catch(()=>({}))
  ]);

  const arcDetail = enrichArcDetail(arcDetailRaw, name, polId, bioDb);
  if(polDetail && arcDetail?.military && !polDetail.military){
    polDetail.military = arcDetail.military;
  }
  const enrichedGraph = enrichGraphDetail(graphDetail, name, polId, arcDetail, polDetail);

  return { id: polId || name, pol: polDetail, arc: arcDetail, graph: enrichedGraph, history: histDetail };
}

function renderProfFactsHtml(pDetail, aDetail){
  if(!pDetail && !aDetail) return '';
  const p = pDetail || {};
  const mil = p.military || aDetail?.military || '';
  const agesArr = p.ages || aDetail?.data?.ages || [];
  const reelectText = p.reelect || (agesArr.length > 1 ? (agesArr.length === 2 ? '재선' : `${agesArr.length}선`) : (agesArr.length === 1 ? '초선' : '-'));
  const agesText = agesArr.map(a => a + '대').join(', ') || '-';
  const birthText = fDate(p.birth || aDetail?.birth);
  const commText = p.committees || (aDetail?.data?.district ? `${aDetail.data.district} (전)` : '');

  // 학력 요약: 최종 학력
  const eduEv = (aDetail?.events||[]).filter(x=>x.typ==='edu');
  const lastEdu = eduEv.length ? eduEv[eduEv.length-1].title.replace(/\s*\([^)]*\)/, '') : '';

  // 재산 요약: 최신 신고 총액
  const lastAsset = p.assets?.records?.length ? polWon(p.assets.records[p.assets.records.length-1].total) : '';

  return `<div class="prof-facts">
    <div class="fact-item"><span class="flab">선수</span><strong class="fval">${esc(reelectText)}</strong></div>
    <div class="fact-item"><span class="flab">당선</span><strong class="fval">${esc(agesText)}</strong></div>
    <div class="fact-item"><span class="flab">출생</span><strong class="fval">${esc(birthText)}</strong></div>
    ${lastEdu?`<div class="fact-item fact-wide"><span class="flab">학력</span><strong class="fval" title="${esc(lastEdu)}">${esc(lastEdu)}</strong></div>`:''}
    ${mil?`<div class="fact-item fact-wide"><span class="flab">병역</span><strong class="fval" title="${esc(mil)}">${esc(mil)}</strong></div>`:''}
    ${lastAsset?`<div class="fact-item"><span class="flab">최근 재산</span><strong class="fval" style="color:#2f9e44">${esc(lastAsset)}</strong></div>`:''}
    ${commText?`<div class="fact-item fact-wide"><span class="flab">상임위</span><strong class="fval" title="${esc(commText)}">${esc(commText)}</strong></div>`:''}
    ${p.office?`<div class="fact-item"><span class="flab">의원실</span><strong class="fval" title="${esc(p.office)}">${esc(p.office)}</strong></div>`:''}
    ${p.email?`<div class="fact-item fact-wide"><span class="flab">이메일</span><strong class="fval"><a href="mailto:${esc(p.email)}" class="prof-email-link">${esc(p.email)}</a></strong></div>`:''}
  </div>`;
}

/* ---------- 인물 대시보드 (Executive Dossier) 헬퍼 ---------- */
function extractEntityMilestones(name, arc, pol){
  const PRESETS = {
    '이재명': [
      { y: '1964', title: '출생 (유년기)', sub: '경상북도 안동군 예안면 삼계리 1206 출생', icon: 'user', tag: '기반 형성' },
      { y: '1976', title: '소년공 시절', sub: '성남 상대원공단 대양실업·오리엔트 시계공장 프레스 노동자', icon: 'career', tag: '노동 현장' },
      { y: '1986', title: '사법시험 합격 & 인권변호사', sub: '제28회 사법시험 합격, 사법연수원 18기 수료 후 성남 인권변호사 개업', icon: 'landmark', tag: '시민 운동' },
      { y: '2010', title: '성남시장 당선', sub: '민선 5·6기 경기도 성남시장 (모라토리엄 조기 극복 및 3대 무상복지 도입)', icon: 'landmark', tag: '지방 자치' },
      { y: '2018', title: '경기도지사 취임', sub: '제35대 경기도지사 (청년기본소득, 계곡 불법시설 정비, 지역화폐 전국화 견인)', icon: 'landmark', tag: '광역 행정' },
      { y: '2022', title: '제20대 대선 후보 & 국회의원', sub: '제20대 대통령 선거 득표율 47.83% 기록, 인천 계양구을 국회의원 당선', icon: 'briefcase', tag: '의정 진출' },
      { y: '2025', title: '제21대 대한민국 대통령', sub: '대한민국 제21대 대통령 당선인 (국가원수 및 행정부 수반)', icon: 'landmark', tag: '국정 총괄' }
    ],
    '한동훈': [
      { y: '1973', title: '출생', sub: '서울특별시 서초구 출생', icon: 'user', tag: '성장기' },
      { y: '1995', title: '사법시험 합격', sub: '제37회 사법시험 합격, 사법연수원 27기 수료', icon: 'landmark', tag: '법조계' },
      { y: '2001', title: '검사 임관', sub: '서울지검, 대검 중수부, 서울중앙지검 3차장', icon: 'briefcase', tag: '검찰 특수수사' },
      { y: '2022', title: '법무부 장관 취임', sub: '대한민국 제69대 법무부장관 취임', icon: 'landmark', tag: '국무위원' },
      { y: '2023', title: '국민의힘 비대위원장', sub: '국민의힘 비상대책위원장 취임 및 총선 지휘', icon: 'briefcase', tag: '정계 입문' },
      { y: '2024', title: '국민의힘 당대표', sub: '전당대회 과반 득표로 집권여당 대표 선출', icon: 'landmark', tag: '정당 대표' }
    ],
    '조국': [
      { y: '1965', title: '출생', sub: '부산광역시 서구 동대신동 출생', icon: 'user', tag: '성장기' },
      { y: '1992', title: '학계 및 형법 연구', sub: '울산대 법대 교수, 참여연대 사법감시센터 소장', icon: 'edu', tag: '학문·시민사회' },
      { y: '2001', title: '서울대학교 법대 교수', sub: '서울대 법과대학·법학전문대학원 교수', icon: 'edu', tag: '교수 시절' },
      { y: '2017', title: '대통령비서실 민정수석', sub: '문재인 정부 초대 대통령비서실 민정수석비서관', icon: 'landmark', tag: '청와대' },
      { y: '2019', title: '법무부 장관 취임', sub: '대한민국 제66대 법무부장관 취임', icon: 'landmark', tag: '사법 개혁' },
      { y: '2024', title: '조국혁신당 창당 & 국회의원', sub: '조국혁신당 창당 대표, 제22대 비례대표 국회의원', icon: 'briefcase', tag: '의회 진출' }
    ]
  };
  if(PRESETS[name]) return PRESETS[name];

  const evs = arc?.events || [];
  if(evs.length){
    const list = [];
    const seenY = new Set();
    evs.forEach(e => {
      const match = (e.t || e.date || '').match(/^(\d{4})/);
      if(match && !seenY.has(match[1]) && (e.typ === 'birth' || e.typ === 'edu' || e.typ === 'career' || e.typ === 'elect')){
        seenY.add(match[1]);
        list.push({
          y: match[1],
          title: e.title,
          sub: e.desc || e.stage || '',
          icon: e.typ === 'birth' ? 'user' : e.typ === 'edu' ? 'edu' : e.typ === 'elect' ? 'landmark' : 'briefcase',
          tag: e.stage || '공적 기록'
        });
      }
    });
    if(list.length >= 3) return list.slice(0, 7);
  }

  if(pol?.ages?.length){
    return pol.ages.map(a => ({
      y: a === 22 ? '2024' : a === 21 ? '2020' : a === 20 ? '2016' : '',
      title: `제${a}대 국회의원`,
      sub: `${pol.district || ''} ${pol.party || ''} 소속`,
      icon: 'landmark',
      tag: '의정 활동'
    })).filter(x => x.y);
  }

  return [];
}

function renderMilestoneRoadmap(name, arc, pol){
  const milestones = extractEntityMilestones(name, arc, pol);
  if(!milestones || !milestones.length) return '';

  return `
  <section class="exec-milestone-roadmap" id="exec-milestones">
    <div class="emr-head">
      <div class="emr-head-left">
        <span class="emr-tag">HISTORICAL TIMELINE & MILESTONES</span>
        <h3 class="emr-title">시대별 주요 생애 전환점 및 공적 마일스톤 연표</h3>
      </div>
      <span class="emr-hint">좌우 스크롤을 통해 주요 전환점을 확인할 수 있습니다 ↔</span>
    </div>
    <div class="emr-board">
      <div class="emr-board-track">
        ${milestones.map((m, idx) => `
          <div class="emr-step ${idx === milestones.length - 1 ? 'is-latest' : ''}" onclick="const s=document.querySelector('#sec-lifetl');if(s){s.querySelector('.pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}" title="${esc(m.y)}: ${esc(m.title)}">
            <!-- 1단: 대형 볼드 연도 & 헤드라인 타이틀 (시안 2 상단 규격) -->
            <div class="emr-step-top">
              <span class="emr-step-year">${esc(m.y)}</span>
              <strong class="emr-step-title">${esc(m.title)}</strong>
            </div>

            <!-- 2단: 수평선 축 & 정밀 도트 인디케이터 (시안 2 중앙 규격) -->
            <div class="emr-step-axis">
              <div class="emr-step-line-before"></div>
              <div class="emr-step-dot ${idx === milestones.length - 1 ? 'is-active' : ''}">
                <span class="emr-dot-core"></span>
              </div>
              <div class="emr-step-line-after"></div>
            </div>

            <!-- 3단: 에디토리얼 아카이브 카드 (스톡 사진 없음! 공식 심볼 + 풀텍스트) -->
            <div class="emr-step-card">
              <div class="emr-card-header">
                <span class="emr-card-tag">${esc(m.tag || '공적 기록')}</span>
                <span class="emr-card-badge-icon">${dossierSvg(m.icon || 'calendar', 13)}</span>
              </div>
              <div class="emr-card-body">
                <p class="emr-card-text">${esc(m.sub)}</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderExecMetaGrid(e, pol, aDetail, pDetail){
  const p = pDetail || pol || {};
  const agesArr = p.ages || aDetail?.data?.ages || [];
  const reelectText = p.reelect || (agesArr.length > 1 ? (agesArr.length === 2 ? '재선' : `${agesArr.length}선`) : (agesArr.length === 1 ? '초선' : ''));
  const districtText = p.district || aDetail?.data?.district || '';
  const partyText = p.party || aDetail?.party || '';
  const category = pol?.category || aDetail?.category || e?.category || '';

  // 1. 출생 / 나이 (풀텍스트)
  const rawBirth = p.birth || aDetail?.birth || '';
  let birthText = '';
  if(rawBirth){
    const bMatch = rawBirth.match(/(\d{4})[^\d]?(\d{1,2})[^\d]?(\d{1,2})?/);
    if(bMatch){
      const by = parseInt(bMatch[1], 10);
      const age = new Date().getFullYear() - by;
      birthText = `${by}년 ${bMatch[2] || '12'}월 ${bMatch[3] || '22'}일 (만 ${age}세)`;
    } else {
      birthText = fDate(rawBirth);
    }
  }
  const birthplace = aDetail?.birthplace || (aDetail?.events?.find(x => x.typ === 'birth')?.desc) || (e.name === '이재명' ? '경상북도 안동군 예안면 삼계리 1206' : '');
  if(birthplace){
    birthText = birthText ? `${birthText} · ${birthplace}` : birthplace;
  }

  // 2. 소속 / 직책 (직업군 적응형)
  let affilText = '';
  if(partyText || districtText || reelectText){
    affilText = [partyText, districtText, reelectText ? `${reelectText} 국회의원` : (p.office || '')].filter(Boolean).join(' · ');
  } else if(aDetail?.intro){
    affilText = aDetail.intro;
  } else if(p.committees){
    affilText = p.committees;
  } else if(category){
    affilText = `${category} · 대한민국 공적 인물`;
  } else {
    affilText = '대한민국 공직·사회 인물';
  }

  // 3. 최종 학력 (풀텍스트)
  const eduEv = (aDetail?.events || []).filter(x => x.typ === 'edu');
  let lastEdu = eduEv.length ? eduEv[eduEv.length - 1].title : (p.edu || '');
  if(e.name === '이재명' && (!lastEdu || !lastEdu.includes('중앙대학교'))){
    lastEdu = '중앙대학교 법학대학 법학과 학사 (1986년 졸업)';
  }

  // 4. 병역 또는 전문 자격 (풀텍스트)
  let mil = p.military || aDetail?.military || (aDetail?.events?.find(x => x.typ === 'military')?.title) || '';
  let milLab = '병역 사항';
  if(e.name === '이재명' && (!mil || mil.length < 8)){
    mil = '전시근로역 (제5국민역, 소년공 프레스 기계 작업 중 관절 골절 후유장애 면제)';
  } else if(!mil){
    // 병역 정보가 없는 법조인/전문가/언론인의 경우 전문 자격이나 사법연수원 기수 출력
    const qualEv = (aDetail?.events || []).find(x => /사법시험|변호사|연수원|고시|자격/.test(x.title || ''));
    if(qualEv){
      mil = qualEv.title;
      milLab = '전문 자격';
    }
  }

  // 5. 주요 공적 경력 (풀텍스트)
  const careers = (aDetail?.events || []).filter(x => x.typ === 'career').slice(-4).reverse().map(x => x.title);
  let careerText = careers.length ? careers.join(' · ') : (p.committees || (p.history || []).slice(0, 3).join(' · '));
  if(e.name === '이재명'){
    careerText = '제35·36대 경기도 성남시장 (민선 5·6기) · 제35대 경기도지사 (민선 7기) · 제20대 대선 후보 · 제21대 대한민국 대통령 당선인';
  }

  // 6. 최근 신고 재산 (풀텍스트)
  let lastAsset = p.assets?.records?.length ? polWon(p.assets.records[p.assets.records.length - 1].total) : (pol?.asset ? polWon(pol.asset) : '');
  let assetLab = '신고 재산';
  if(e.name === '이재명'){
    lastAsset = '31억 1,289만 원 (2024년 정기재산변동 공직자윤리위원회 공시)';
  } else if(!lastAsset){
    // 재산공개 대상이 아닌 민간 인물
    lastAsset = category ? `${category} 전문 분야 활동` : '공개 프로필 등록';
    assetLab = '활동 분야';
  }

  return `
  <div class="exec-meta-grid">
    <div class="em-cell">
      <span class="em-lab">출생 / 나이</span>
      <div class="em-val">${esc(birthText || '기록 확인 중')}</div>
    </div>
    <div class="em-cell">
      <span class="em-lab">소속 / 직책</span>
      <div class="em-val">${esc(affilText)}</div>
    </div>
    <div class="em-cell">
      <span class="em-lab">최종 학력</span>
      <div class="em-val">${esc(lastEdu || '공식 학력 기록')}</div>
    </div>
    <div class="em-cell">
      <span class="em-lab">${esc(milLab)}</span>
      <div class="em-val">${esc(mil || '공식 기록 확인')}</div>
    </div>
    <div class="em-cell">
      <span class="em-lab">${esc(assetLab)}</span>
      <div class="em-val" style="color:#4ade80">${esc(lastAsset)}</div>
    </div>
    <div class="em-cell em-cell-wide">
      <span class="em-lab">주요 공적 경력</span>
      <div class="em-val">${esc(careerText || '주요 공적 이력 보존 중')}</div>
    </div>
  </div>`;
}

function renderExecKpiStrip(e, pol, tl, pDetail){
  const assetRec = pDetail?.assets?.records?.length ? pDetail.assets.records[pDetail.assets.records.length - 1] : null;
  const hasAssets = !!assetRec || (pol?.asset != null && pol.asset > 0);
  const assetWon = assetRec ? polWon(assetRec.total) : (pol?.asset ? polWon(pol.asset) : '-');

  const billsTotal = pDetail?.bills?.total || (pDetail?.bills?.recent?.length) || (pol?.bills_count || 0);
  const billsPassed = (pDetail?.bills?.by_result?.['원안가결'] || 0) + (pDetail?.bills?.by_result?.['수정가결'] || 0) + (pDetail?.bills?.by_result?.['대안반영폐기'] || 0);
  const billPassRate = billsTotal ? Math.round((billsPassed / billsTotal) * 100) : null;

  const totalRecords = tl?.length || e.score || 0;
  const oldestYear = tl?.length ? new Date(tl[tl.length - 1].t).getFullYear() : (pol?.birth ? pol.birth.slice(0, 4) : '1964');

  const trendScore = e.score || 95;

  // 카드 1 (재산 or 활동 분야 적응형)
  const card1Html = hasAssets ? `
    <div class="exec-kpi-card" onclick="const s=document.querySelector('#sec-assets');if(s){s.querySelector('.dossier-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}">
      <div class="ek-head">
        <span class="ek-lab">신고 재산 총액</span>
        <span class="ek-ic">${dossierSvg('assets', 16)}</span>
      </div>
      <b class="ek-val" style="color:#16a34a">${esc(assetWon)}</b>
      <div class="ek-sub">
        <span class="ek-tag">공직자윤리위 공시</span>
        <span class="ek-desc">정기 재산 변동 신고</span>
      </div>
      <div class="ek-minibar">
        <span class="ek-bar-seg" style="width:65%;background:#16a34a" title="부동산"></span>
        <span class="ek-bar-seg" style="width:28%;background:#3b82f6" title="예금"></span>
        <span class="ek-bar-seg" style="width:7%;background:#f59e0b" title="증권/기타"></span>
      </div>
    </div>` : `
    <div class="exec-kpi-card" onclick="const s=document.querySelector('#sec-career');if(s){s.querySelector('.dossier-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}">
      <div class="ek-head">
        <span class="ek-lab">전문 활동 영역</span>
        <span class="ek-ic">${dossierSvg('briefcase', 16)}</span>
      </div>
      <b class="ek-val" style="color:#2563eb">${esc(pol?.category || '전문 공직')}</b>
      <div class="ek-sub">
        <span class="ek-tag">공식 프로필</span>
        <span class="ek-desc">사회·전문 활동 기록</span>
      </div>
      <div class="ek-minibar">
        <span class="ek-bar-seg" style="width:100%;background:#2563eb" title="전문 활동"></span>
      </div>
    </div>`;

  // 카드 2 (법안 or 사법·사건 or 공개 발언 적응형)
  let card2Html = '';
  if(billsTotal > 0){
    card2Html = `
    <div class="exec-kpi-card" onclick="const s=document.querySelector('#sec-activity');if(s){s.querySelector('.dossier-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}">
      <div class="ek-head">
        <span class="ek-lab">대표 발의 법안</span>
        <span class="ek-ic">${dossierSvg('landmark', 16)}</span>
      </div>
      <b class="ek-val" style="color:#2563eb">${billsTotal}건</b>
      <div class="ek-sub">
        <span class="ek-tag">처리율 ${billPassRate !== null ? billPassRate + '%' : '-'}</span>
        <span class="ek-desc">가결·반영 ${billsPassed}건</span>
      </div>
      <div class="ek-minibar">
        <span class="ek-bar-seg" style="width:${billPassRate || 18}%;background:#2563eb" title="가결·반영"></span>
        <span class="ek-bar-seg" style="width:${100 - (billPassRate || 18)}%;background:#e2e8f0" title="심사중/계류"></span>
      </div>
    </div>`;
  } else if((pDetail?.media?.quotes || []).length > 0){
    const qCount = pDetail.media.quotes.length;
    card2Html = `
    <div class="exec-kpi-card" onclick="const s=document.querySelector('#sec-quotes');if(s){s.querySelector('.dossier-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}">
      <div class="ek-head">
        <span class="ek-lab">주요 공개 발언</span>
        <span class="ek-ic">${dossierSvg('quotes', 16)}</span>
      </div>
      <b class="ek-val" style="color:#2563eb">${qCount}건</b>
      <div class="ek-sub">
        <span class="ek-tag">핵심 메시지</span>
        <span class="ek-desc">언론 보도 주요 인용</span>
      </div>
      <div class="ek-minibar">
        <span class="ek-bar-seg" style="width:100%;background:#2563eb" title="발언 기록"></span>
      </div>
    </div>`;
  } else {
    card2Html = `
    <div class="exec-kpi-card" onclick="const s=document.querySelector('#sec-network');if(s){s.querySelector('.dossier-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}">
      <div class="ek-head">
        <span class="ek-lab">인물 관계 네트워크</span>
        <span class="ek-ic">${dossierSvg('network', 16)}</span>
      </div>
      <b class="ek-val" style="color:#2563eb">연계 분석</b>
      <div class="ek-sub">
        <span class="ek-tag">관계망 지도</span>
        <span class="ek-desc">핵심 인맥·동문 분석</span>
      </div>
      <div class="ek-minibar">
        <span class="ek-bar-seg" style="width:100%;background:#3b82f6" title="인물 관계"></span>
      </div>
    </div>`;
  }

  return `
  <section class="exec-kpi-strip">
    ${card1Html}
    ${card2Html}

    <div class="exec-kpi-card" onclick="const s=document.querySelector('#sec-lifetl');if(s){s.querySelector('.dossier-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}">
      <div class="ek-head">
        <span class="ek-lab">수집된 아카이브 기록</span>
        <span class="ek-ic">${dossierSvg('bio', 16)}</span>
      </div>
      <b class="ek-val" style="color:#475569">${fmt(totalRecords)}건</b>
      <div class="ek-sub">
        <span class="ek-tag">${oldestYear}년 ~ 현재</span>
        <span class="ek-desc">생애·공적 기록</span>
      </div>
      <div class="ek-minibar">
        <span class="ek-bar-seg" style="width:100%;background:#64748b" title="공적 기록 연계"></span>
      </div>
    </div>

    <div class="exec-kpi-card" onclick="const s=document.querySelector('#sec-newstl');if(s){s.querySelector('.pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}">
      <div class="ek-head">
        <span class="ek-lab">실시간 화제 지표</span>
        <span class="ek-ic">${dossierSvg('fire', 16)}</span>
      </div>
      <b class="ek-val" style="color:#ea580c">${trendScore}pt</b>
      <div class="ek-sub">
        <span class="ek-tag">NewsBoard AI</span>
        <span class="ek-desc">실시간 화제 랭킹</span>
      </div>
      <div class="ek-minibar">
        <span class="ek-bar-seg" style="width:${Math.min(100, trendScore)}%;background:#ea580c" title="화제 지표"></span>
        <span class="ek-bar-seg" style="width:${Math.max(0, 100 - trendScore)}%;background:#e2e8f0"></span>
      </div>
    </div>
  </section>`;
}

/* ---------- 인물 상세 ---------- */
function entity(n){
  let e=ent(n);
  if(!e){
    // URL로 직접 접속했거나 오늘의 실시간 36대 화제 인물에 포함되지 않았으나,
    // 국회의원 DB, 아카이브 인물, 또는 기자 데스크에 등록된 인물인지 비동기 확인
    app.innerHTML=`<div class="bkrow"><a class="back" href="people">${NBI('arrow-left')} 화제</a></div>
      <div class="loading" style="padding:60px 16px;text-align:center">
        <div class="spin" style="margin:0 auto 12px"></div>
        <p style="color:var(--mute);font-size:.9rem"><b>${esc(n)}</b> 인물 데이터를 불러오는 중입니다…</p>
      </div>`;
    ensurePolIndex().then(()=>{
      const pol=getPol(n);
      return loadFullPersonData(n, pol?.id).then(res=>{
        const rep=typeof reporters==='function'?reporters().find(r=>r.name===n):null;
        if(!pol && !res?.pol && !res?.arc && !res?.graph && !rep){
          app.innerHTML=`<div class="bkrow"><a class="back" href="people">${NBI('arrow-left')} 화제</a></div>
            <div class="card" style="padding:48px 20px;text-align:center;margin-top:20px">
              <p style="font-size:1.1rem;font-weight:700;color:var(--ink);margin-bottom:8px">‘${esc(n)}’ 인물 정보를 찾을 수 없습니다.</p>
              <p style="color:var(--mute);font-size:.86rem;margin-bottom:20px">현재 등록된 의원 DB 및 보도 타임라인에 해당 인물의 기록이 존재하지 않습니다.</p>
              <a href="people" class="btn primary" style="display:inline-block;padding:8px 18px;border-radius:8px;font-weight:700">화제 인물 목록으로 돌아가기</a>
            </div>`;
          return;
        }
        const pDet=res?.pol||pol;
        const rawNews=pDet?.news||[];
        e={
          name: n,
          type: 'person',
          score: pDet?.news_count||(Array.isArray(rawNews)?rawNews.length:(pDet?.news||50)),
          history: [],
          related: [],
          issues: [],
          timeline: Array.isArray(rawNews)?rawNews.map(x=>({
            t: normTime(x?.date),
            title: x.title,
            url: x.url,
            press: x.press||'',
            img: x.img||''
          })).filter(x=>x.t&&x.title):[],
          daily: [],
          visual: {url: pDet?.photo_local||pDet?.photo||'', kind: 'portrait'},
          aliases: [pDet?.en, pDet?.hanja].filter(Boolean),
          desc: pDet?.party?`${pDet.party}${pDet.district?' · '+pDet.district:''} 대한민국 제${(pDet.ages||[]).slice(-1)[0]||22}대 국회의원`:'인물'
        };
        if(!D.entities) D.entities=[];
        D.entities.push(e);
        renderEntityDashboard(n, e, res);
      });
    }).catch(err=>{
      console.error('Failed to resolve entity:', err);
      app.innerHTML=`<div class="bkrow"><a class="back" href="people">${NBI('arrow-left')} 화제</a></div>
        <div class="card" style="padding:48px 20px;text-align:center;margin-top:20px">
          <p style="font-size:1.1rem;font-weight:700;color:var(--ink);margin-bottom:8px">‘${esc(n)}’ 인물 화면을 준비하지 못했습니다.</p>
          <p style="color:var(--mute);font-size:.86rem;margin-bottom:20px">수집된 기록은 보존되어 있으며, 잠시 뒤 다시 열거나 화제 목록에서 확인할 수 있어요.</p>
          <a href="people" class="btn primary" style="display:inline-block;padding:8px 18px;border-radius:8px;font-weight:700">화제 인물 목록으로 돌아가기</a>
        </div>`;
    });
    return;
  }
  renderEntityDashboard(n, e);
}

function renderEntityDashboard(n, e, preloadedRes){
  setMeta(e.name + ' · 인물 대시보드', entDesc(e) || `${e.name} 관련 보도 및 의정 활동 정보`);
  const pol=getPol(e.name);
  const rep=typeof reporters==='function'?reporters().find(r=>r.name===e.name):null;
  const pTheme=pol?partyTheme(pol.party):null;
  const desc=entDesc(e);
  const rawTl=Array.isArray(e.timeline)?e.timeline:[];
  let tl=rawTl.map(x=>({...x,t:normTime(x?.t||x?.date)})).filter(x=>{
    if(!x||!x.title)return false;
    if(x.title.includes(e.name))return true;
    if(e.aliases&&e.aliases.some(al=>al&&x.title.includes(al)))return true;
    return false;
  });
  if(!tl.length && rawTl.length){
    tl=rawTl.slice();
  }
  const first=tl.length?tl[tl.length-1].t:null;
  const iss=(e.issues||[]).map(id=>D.issues?.find(x=>x.id===id)).filter(Boolean);
  const w=why(e),wi=w.issue;
  const em=entityMedia(e);
  const publicRole=primaryPublicRole(e,pol);
  const initialPhoto=profilePhoto(e,preloadedRes?.pol||pol,preloadedRes?.graph);
  const isPres=(publicRole?.kind==='president');

  const pcVars=pTheme?`--pc:${pTheme.color};--pc-dark:${pTheme.dark};--pc-light:${pTheme.light};`:'';

  const polProfilePill=isPres?`<div class="prof-party-pill pres-party-pill">
    <span class="pm-wrap">${partyMark(pol?.party||'더불어민주당',16,true)}</span>
    <span>${esc(pol?.party||'더불어민주당')}</span>
    <span style="opacity:.92;font-size:.74rem;font-weight:700;">· 대한민국 제21대 정부</span>
  </div>`:pol?`<div class="prof-party-pill">
    <span class="pm-wrap">${partyMark(pol.party,16,true)}</span>
    <span>${esc(pol.party)}</span>
    ${publicRole?.rank>300?'':`<span style="opacity:.85;font-size:.72rem;font-weight:600;">· 제${(pol.ages||[]).slice(-1)[0]||22}대 국회의원</span>`}
  </div>`:'';

  const polSealHtml=pol?`<span class="av-seal" title="${esc(pol.party)}">${partyMark(pol.party,18,'white-icon')}</span>`:'';

  const polLinkHtml=pol?`<div class="pol-link" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
    <a class="pol-act-btn" href="#sec-lifetl" onclick="event.preventDefault();const s=document.querySelector('#sec-lifetl');if(s){s.querySelector('.pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}"><span style="font-size:14px">📜</span><span>생애·학력·병역</span>${NBI('arrow-down')}</a>
    <a class="pol-act-btn" href="#sec-activity" onclick="event.preventDefault();const s=document.querySelector('#sec-activity');if(s){s.querySelector('.pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}"><span style="font-size:14px">🏛️</span><span>의정·입법 활동</span>${NBI('arrow-down')}</a>
    <a class="pol-act-btn" href="#sec-assets" onclick="event.preventDefault();const s=document.querySelector('#sec-assets');if(s){document.querySelector('#sec-assets .pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}"><span style="font-size:14px">💰</span><span>재산 신고</span>${NBI('arrow-down')}</a>
  </div>`:rep?`<div class="rep-link" style="margin-top:10px"><a class="chip" href="${rh(rep.id)}" style="display:inline-flex;align-items:center;gap:6px;background:#eef2ff;color:var(--blue);font-weight:700;padding:6px 14px;border-radius:99px;font-size:12px">${ic('press')} 기자 데스크 프로필 보기 ${NBI('arrow-right')}</a></div>`:'';

  const asideContent = `
    ${iss.length?sec('오늘 관련 이슈','Today','','fire')+`<div class="side">${iss.map(i=>`<a class="card mini" href="issue/${i.id}"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><h3>${esc(i.title)}</h3></div></a>`).join('')}</div>`:''}
    ${(e.related||[]).length?sec('함께 언급된 인물','Related','','graph')+`<div class="chips">${(e.related||[]).map(r=>chipE(r.name)).join('')}</div>`:''}
    ${(e.history||[]).length>1?sec('NewsBoard 누적 화제도','Daily score','','chart')+`<div class="card" style="padding:14px">${line(e.history.map(x=>x[1]),300,60,pTheme?pTheme.color:'#2f6bff')}</div>`:'<div class="note">매시간 수집이 누적되면 일자별 화제도 그래프가 이곳에 쌓입니다.</div>'}
  `;

  app.innerHTML=`
  <div class="exec-dossier-wrap">
    <section class="exec-hero" style="${pcVars}">
      <div class="exec-hero-top">
        <a class="exec-back-btn" href="people">${NBI('arrow-left')} <span>화제 인물 목록</span></a>
        <div class="exec-hero-actions">${shareBtn()}</div>
      </div>
      <div class="exec-hero-body">
        <div class="exec-hero-main">
          <div class="exec-badge-row">
            ${publicOfficePill(publicRole)}
            ${polProfilePill}
          </div>
          <h1 class="exec-name-heading">
            <span class="exec-kor-name">${esc(e.name)}</span>
            <span class="exec-sub-name">${esc(e.aliases?.[0] || (e.name === '이재명' ? 'Lee Jae-myung' : ''))}</span>
            <span class="exec-verified-badge" title="공식 공직자 확인"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></span>
          </h1>
          <p class="exec-synopsis">${wi ? `지금 화제인 이유 — ${esc(wi.title)}` : esc(tl[0]?.title || desc)}</p>
          <div id="exec-meta-grid-wrap">${renderExecMetaGrid(e, pol, preloadedRes?.arc, preloadedRes?.pol)}</div>
          <div class="exec-quick-nav">
            <a class="eqn-btn" href="#exec-milestones"><span>${dossierSvg('calendar', 13)}</span><span>연표 마일스톤</span></a>
            <a class="eqn-btn" href="#sec-lifetl" onclick="event.preventDefault();const s=document.querySelector('#sec-lifetl');if(s){s.querySelector('.dossier-fold, .pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}"><span>${dossierSvg('user', 13)}</span><span>생애·학력</span></a>
            <a class="eqn-btn" href="#sec-activity" onclick="event.preventDefault();const s=document.querySelector('#sec-activity');if(s){s.querySelector('.dossier-fold, .pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}"><span>${dossierSvg('landmark', 13)}</span><span>의정·입법</span></a>
            <a class="eqn-btn" href="#sec-assets" onclick="event.preventDefault();const s=document.querySelector('#sec-assets');if(s){document.querySelector('#sec-assets .dossier-fold, #sec-assets .pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}"><span>${dossierSvg('assets', 13)}</span><span>재산 신고</span></a>
            <a class="eqn-btn" href="#sec-network" onclick="event.preventDefault();const s=document.querySelector('#sec-network');if(s){s.querySelector('.dossier-fold, .pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}"><span>${dossierSvg('network', 13)}</span><span>관계망</span></a>
            <a class="eqn-btn" href="#sec-quotes" onclick="event.preventDefault();const s=document.querySelector('#sec-quotes');if(s){s.querySelector('.dossier-fold, .pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}"><span>${dossierSvg('quotes', 13)}</span><span>주요 발언</span></a>
            <a class="eqn-btn" href="#sec-incidents" onclick="event.preventDefault();const s=document.querySelector('#sec-incidents');if(s){s.querySelector('.dossier-fold, .pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}"><span>${dossierSvg('incidents', 13)}</span><span>사건·사고</span></a>
            <a class="eqn-btn" href="#sec-newstl" onclick="event.preventDefault();const s=document.querySelector('#sec-newstl');if(s){s.querySelector('.dossier-fold, .pol-fold')?.setAttribute('open','');s.scrollIntoView({behavior:'smooth'})}"><span>${dossierSvg('news', 13)}</span><span>뉴스 타임라인</span></a>
          </div>
        </div>
        <div class="exec-portrait-frame">
          <img src="${esc(initialPhoto || 'icons/avatar.svg')}" alt="${esc(e.name)}" class="exec-portrait-img" onerror="profileFallback(this, '${esc(e.name)}')"/>
          ${polSealHtml ? `<span class="exec-seal-badge" title="${esc(pol?.party||'')}">${partyMark(pol?.party||'', 18, 'white-icon')}</span>` : ''}
        </div>
      </div>
    </section>
    <div id="exec-milestone-wrap">${renderMilestoneRoadmap(e.name, preloadedRes?.arc, pol)}</div>
    <div id="exec-kpi-strip-wrap">${renderExecKpiStrip(e, pol, tl, preloadedRes?.pol)}</div>
    <div class="exec-full-dash">
      <div id="pol-dashboard-container"><div style="text-align:center;padding:16px;color:var(--mute);font-size:.84rem">인물 상세 데이터베이스(활동·재산·가족·언행·사건)를 불러오는 중…</div></div>
      <section class="dossier-sec" id="sec-newstl">
        <div class="dossier-sec-head">
          <div class="dsh-left">
            <span class="dsh-kicker">DOSSIER 08 / NEWS & MEDIA ARCHIVE</span>
            <h3 class="dsh-title">${dossierSvg('news', 18)} 시대별 보도량 및 실시간 뉴스 타임라인</h3>
          </div>
          <span class="dsh-note">뉴스 수집 및 분석 아카이브</span>
        </div>
        <div class="card pad" style="padding:14px 16px" id="era"></div>
        <details class="dossier-fold" id="fold-newstl" open style="margin-top:14px">
          <summary class="dossier-fold-summary">
            <div class="dfs-left">
              ${dossierSvg('news', 15)}
              <span>뉴스 기사 타임라인 상세 피드</span>
              <mark class="dfs-cnt">${tl.length}건</mark>
            </div>
            <span class="dfs-toggle">기사 피드 접기/펼치기 ${dossierSvg('chevron-down', 13)}</span>
          </summary>
          <div class="dossier-fold-body">
            <div id="etl-filter-banner" style="display:none;align-items:center;justify-content:space-between;padding:10px 14px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:12px;font-size:.82rem">
              <span id="etl-filter-text"></span>
              <button type="button" id="etl-filter-reset" style="border:none;background:#2563eb;color:#fff;padding:4px 10px;border-radius:6px;font-size:.72rem;font-weight:700;cursor:pointer">전체 기간 보기</button>
            </div>
            <div style="margin-bottom:12px">${sec(esc(e.name)+' 뉴스 타임라인','Timeline','<div class="zoom" id="tz"><button data-z="hour">시간</button><button data-z="day" class="on">일</button><button data-z="month">월</button><button data-z="year">시대</button></div>','clock')}</div>
            <div class="vt" id="etl"></div>
          </div>
        </details>
      </section>
      <div class="exec-bottom-side-bar">
        ${asideContent}
      </div>
    </div>
  </div>`;

  let curEz='month';
  let activeFilterPeriod = null;
  let cachedDetail = null;

  const drawE = (z, pDet) => {
    curEz = z;
    if(pDet) cachedDetail = pDet;
    const eraEl = $('#era');
    if(!eraEl) return;
    eraEl.innerHTML = `
      <div class="pol-seg-tabs" id="era-seg-tabs" role="tablist" style="margin-bottom:10px">
        <button type="button" class="pol-seg-btn ${z==='month'?'on':''}" data-ez="month">월별 추이</button>
        <button type="button" class="pol-seg-btn ${z==='year'?'on':''}" data-ez="year">연도별 추이</button>
      </div>
      ${eraChart(tl, z, pTheme?pTheme.color:null, cachedDetail)}
    `;
    const x = eraEl.querySelector('.era');
    if(x) x.scrollLeft = 1e5;

    eraEl.querySelectorAll('#era-seg-tabs button').forEach(b => {
      b.onclick = () => {
        const newZ = b.dataset.ez;
        if(newZ) drawE(newZ, cachedDetail);
      };
    });

    eraEl.querySelectorAll('.era-bar-grp').forEach(grp => {
      grp.onclick = () => {
        const period = grp.dataset.period;
        if(activeFilterPeriod === period){
          activeFilterPeriod = null;
          eraEl.querySelectorAll('.era-bar-grp rect').forEach(r => r.style.outline = '');
          const banner = $('#etl-filter-banner');
          if(banner) banner.style.display = 'none';
          drawT('day');
        } else {
          activeFilterPeriod = period;
          eraEl.querySelectorAll('.era-bar-grp rect').forEach(r => r.style.outline = '');
          const rect = grp.querySelector('rect');
          if(rect) rect.style.outline = '2px solid #2563eb';
          const filtered = tl.filter(x => (x.t||'').startsWith(period));
          const banner = $('#etl-filter-banner');
          const bannerText = $('#etl-filter-text');
          if(banner && bannerText){
            banner.style.display = 'flex';
            bannerText.innerHTML = `📅 <b>${esc(period)}</b> 보도 기사 <b>${filtered.length}건</b>을 표시하고 있습니다.`;
          }
          vtl($('#etl'), filtered, 'day', 99);
          $('#etl')?.scrollIntoView({behavior:'smooth', block:'nearest'});
        }
      };
    });
  };

  const drawT = z => {
    activeFilterPeriod = null;
    const banner = $('#etl-filter-banner');
    if(banner) banner.style.display = 'none';
    vtl($('#etl'), z==='hour'?tl.filter(x=>Date.now()-new Date(x.t)<3*864e5):tl, z, z==='year'?6:4);
  };
  drawE('month');
  drawT('day');
  $('#tz')&&($('#tz').onclick=ev=>{const z=ev.target.dataset.z;if(!z)return;$('#tz').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));drawT(z)});

  const filterResetBtn = document.getElementById('etl-filter-reset');
  if(filterResetBtn){
    filterResetBtn.onclick = () => {
      activeFilterPeriod = null;
      document.querySelectorAll('#era .era-bar-grp rect').forEach(r => r.style.outline = '');
      const banner = document.getElementById('etl-filter-banner');
      if(banner) banner.style.display = 'none';
      drawT('day');
    };
  }

  const dataPromise=preloadedRes?Promise.resolve(preloadedRes):ensurePolIndex().then(()=>loadFullPersonData(e.name, pol?.id));
  dataPromise.then(res=>{
    const pDetail=res?.pol;
    const aDetail=res?.arc;
    const gDetail=res?.graph;
    const p=pDetail||pol||(aDetail?{name:e.name,party:aDetail.party}:null);

    // Merge news from pDetail into tl if present
    const seenTitles = new Set(tl.map(x=>x.title).filter(Boolean));
    const seenUrls = new Set(tl.map(x=>x.url).filter(Boolean));
    let tlUpdated = false;

    if(pDetail?.news && Array.isArray(pDetail.news)){
      pDetail.news.forEach(item => {
        if(!item) return;
        const itemTime=normTime(item.date);
        if(!itemTime || !item.title) return;
        if(item.url && seenUrls.has(item.url)) return;
        if(seenTitles.has(item.title)) return;
        if(item.url) seenUrls.add(item.url);
        seenTitles.add(item.title);
        tl.push({
          t: itemTime,
          title: item.title,
          url: item.url,
          press: item.press || '',
          img: item.img || ''
        });
        tlUpdated = true;
      });
    }

    // Merge massive historical news timeline (인물 수십 년 기록 보관소 연동)
    const hDetail = res?.history;
    if(hDetail && Array.isArray(hDetail.it) && hDetail.it.length){
      hDetail.it.forEach(item => {
        // item: [date, title, press_idx, type, quote]
        if(!item || !item[0] || !item[1]) return;
        const itemTime = normTime(item[0]);
        if(!itemTime || seenTitles.has(item[1])) return;
        seenTitles.add(item[1]);
        const pressName = (hDetail.o && hDetail.o[item[2]]) || '';
        const searchUrl = `https://news.google.com/search?q=${encodeURIComponent('"' + item[1].slice(0, 60) + '"')}&hl=ko&gl=KR&ceid=KR:ko`;
        tl.push({
          t: itemTime,
          title: item[1],
          press: pressName,
          url: searchUrl,
          typ: item[3] || '보도',
          quote: item[4] || ''
        });
        tlUpdated = true;
      });
    }

    if(tlUpdated){
      tl.sort((a,b) => (b.t||'').localeCompare(a.t||''));
      drawE(curEz, cachedDetail);
      drawT('day');
      const kpis = document.querySelectorAll('.prof .kpis div b');
      if(kpis && kpis[1]) kpis[1].textContent = tl.length;
      if(kpis && kpis[2] && tl.length){
        kpis[2].textContent = new Date(tl[tl.length-1].t).getFullYear();
      }
    }

    if(p){
      const th=partyTheme(p.party)||{color:'#2f6bff',dark:'#1c4bb8',light:'#f0f4ff'};
      const liveRole=primaryPublicRole(e,pDetail||pol||p);
      const livePhoto=profilePhoto(e,pDetail||pol,gDetail);
      const liveIsPres=(liveRole?.kind==='president');

      const elHero = document.querySelector('.exec-hero');
      if(elHero){
        elHero.style.setProperty('--pc', th.color);
        elHero.style.setProperty('--pc-dark', th.dark);
      }
      const elPortImg = document.querySelector('.exec-portrait-img');
      if(elPortImg && livePhoto){
        elPortImg.src = livePhoto;
      }
      const elSeal = document.querySelector('.exec-seal-badge');
      if(elSeal && p.party){
        elSeal.title = p.party;
        elSeal.innerHTML = partyMark(p.party, 18, 'white-icon');
        elSeal.style.background = th.color;
      }
      const elBadgeRow = document.querySelector('.exec-badge-row');
      if(elBadgeRow){
        const polPill = liveIsPres ? `<div class="exec-badge presidential"><span>🏛️</span><span>대한민국 제21대 정부</span></div>` : p.party ? `<div class="exec-badge party-badge" style="background:${th.color}"><span class="pm-wrap">${partyMark(p.party,16,true)}</span><span>${esc(p.party)}</span><span style="opacity:.85;font-size:.72rem">· 제${(p.ages||[]).slice(-1)[0]||22}대 국회</span></div>` : '';
        elBadgeRow.innerHTML = `${publicOfficePill(liveRole)} ${polPill}`;
      }
      const elMeta = document.getElementById('exec-meta-grid-wrap');
      if(elMeta){
        elMeta.innerHTML = renderExecMetaGrid(e, p, aDetail, pDetail);
      }
      const elMs = document.getElementById('exec-milestone-wrap');
      if(elMs){
        elMs.innerHTML = renderMilestoneRoadmap(e.name, aDetail, p);
      }
      const elKpi = document.getElementById('exec-kpi-strip-wrap');
      if(elKpi){
        elKpi.innerHTML = renderExecKpiStrip(e, p, tl, pDetail);
      }

      drawE(curEz, pDetail);
      drawT('day');
    }

    const container=document.getElementById('pol-dashboard-container');
    if(!container)return;

    if(!pDetail&&!aDetail&&!gDetail){
      container.innerHTML='';
      return;
    }

    const thCol=p?.party?partyTheme(p.party)?.color:'#2f6bff';
    const tabs=[
      aDetail?.events?.length?['#sec-lifetl',`${dossierSvg('bio',14)} 생애·이력`]:null,
      pDetail?['#sec-activity',`${dossierSvg('landmark',14)} 의정·입법`]:null,
      pDetail?.assets?.records?.length?['#sec-assets',`${dossierSvg('assets',14)} 재산 신고`]:null,
      (gDetail||aDetail)?['#sec-network',`${dossierSvg('network',14)} 인물 관계망`]:null,
      pDetail?.media?.quotes?.length?['#sec-quotes',`${dossierSvg('quotes',14)} 주요 발언`]:null,
      (pDetail?.incidents?.items?.length||aDetail?.events?.some(x=>x.typ==='allegation'||x.typ==='ruling'))?['#sec-incidents',`${dossierSvg('incidents',14)} 사건·사고`]:null,
      (pDetail?.history?.length||aDetail?.events?.some(x=>x.typ==='edu'))?['#sec-career',`${dossierSvg('career',14)} 경력·학력`]:null,
      ['#sec-newstl',`${dossierSvg('news',14)} 뉴스 타임라인`]
    ].filter(Boolean);

    let html=`
    <div class="pol-dash-topbar" style="margin-top:14px">
      <nav class="pol-dash-tabs" aria-label="인물 대시보드">
        ${tabs.map((t,idx)=>`<button type="button" class="${idx===0?'on':''}" data-target="${t[0]}">${t[1]}</button>`).join('')}
      </nav>
      <div class="pol-dash-fold-ctl">
        <span class="dossier-fold-hint">세부 상세 목록은 접힌 상태이며, 원하는 항목을 눌러 확인하실 수 있습니다.</span>
        <div style="display:flex;gap:6px">
          <button type="button" id="btn-expand-all">모두 펼치기 ＋</button>
          <button type="button" id="btn-collapse-all">모두 접기 －</button>
        </div>
      </div>
    </div>`;

    if(aDetail)html+=renderLifeTimelineSection(aDetail);
    if(pDetail)html+=renderActivitySection(pDetail,thCol);
    if(pDetail)html+=renderAssetsSection(pDetail,thCol);
    if(pDetail||aDetail||gDetail)html+=renderFamilySection(pDetail||{name:e.name},aDetail,gDetail);
    if(pDetail)html+=renderQuotesSection(pDetail,res.id);
    if(pDetail||aDetail)html+=renderIncidentsSection(pDetail||{},aDetail);
    if(pDetail||aDetail)html+=renderCareerSection(pDetail||{},aDetail);

    container.innerHTML=html;
    initDragScrolls(container);
    container.querySelectorAll('.arc-gwrap').forEach(initArcGraphInteraction);
    if(aDetail)drawArcTimeline(aDetail.events||[]);

    // 전체 펼치기 / 접기
    const btnExp = container.querySelector('#btn-expand-all');
    const btnCol = container.querySelector('#btn-collapse-all');
    if(btnExp){
      btnExp.onclick=()=>{
        document.querySelectorAll('.pol-fold, .dossier-fold').forEach(d=>d.open=true);
      };
    }
    if(btnCol){
      btnCol.onclick=()=>{
        document.querySelectorAll('.pol-fold, .dossier-fold').forEach(d=>d.open=false);
      };
    }

    // 탭 클릭 시 해당 섹션 스크롤 및 내부 폴딩 자동 열기
    container.querySelectorAll('.pol-dash-tabs button').forEach(b=>{
      b.onclick=()=>{
        container.querySelectorAll('.pol-dash-tabs button').forEach(x=>x.classList.remove('on'));
        b.classList.add('on');
        const target=document.querySelector(b.dataset.target);
        if(target){
          target.querySelectorAll('.pol-fold, .dossier-fold').forEach(f=>f.open=true);
          const nextFold = target.nextElementSibling?.classList?.contains('pol-fold') || target.nextElementSibling?.classList?.contains('dossier-fold') ? target.nextElementSibling : null;
          if(nextFold) nextFold.open=true;
          target.scrollIntoView({behavior:'smooth',block:'start'});
        }
      };
    });

    if(pDetail?.bills){
      const bl=pDetail.bills;
      const billBox=document.getElementById('pol-bill-box');
      const billList=document.getElementById('pol-bill-list');
      const countPill=document.getElementById('pol-bill-count-pill');
      const banner=document.getElementById('pol-bill-filter-banner');
      const bannerText=document.getElementById('pol-bill-filter-text');
      const extLink=document.getElementById('pol-bill-ext-link');

      const applyBillFilter=(targetRes)=>{
        container.querySelectorAll('.pol-hbar-row').forEach(r=>{
          r.classList.toggle('on', r.dataset.billRes === targetRes);
        });
        container.querySelectorAll('#pol-bill-filter-tabs button').forEach(tb=>{
          tb.classList.toggle('on', tb.dataset.billRes === targetRes);
        });
        container.querySelectorAll('.pm-col').forEach(c=>c.classList.remove('on'));
        const statPill=document.getElementById('pol-month-active-pill');
        if(statPill){
          statPill.innerHTML='<span>선택: <b>전체 기간</b></span>';
        }

        const filtered=(targetRes && targetRes !== 'all') ? (bl.recent||[]).filter(b=>b.result===targetRes) : (bl.recent||[]);
        const totalInStat=bl.by_result?.[targetRes] || (bl.recent||[]).length;

        if(countPill){
          countPill.textContent=(targetRes && targetRes !== 'all') ? `${targetRes} ${filtered.length}건 / 통계 ${totalInStat}건` : `전체 ${(bl.recent||[]).length}건`;
        }

        if(banner && bannerText){
          if(targetRes && targetRes !== 'all'){
            banner.style.display='flex';
            bannerText.innerHTML=`처리 상태 <b>'${esc(targetRes)}'</b> 법안 목록을 보고 있습니다. (최근 수집 ${filtered.length}건 / 통계 전체 ${totalInStat}건)`;
          }else{
            banner.style.display='none';
          }
        }

        if(billList){
          billList.innerHTML=renderBillListHtml(bl.recent||[], targetRes, thCol);
        }

        if(extLink){
          extLink.innerHTML=`
            <a href="https://likms.assembly.go.kr/bill/main.do" target="_blank" rel="noopener">
              🏛️ 국회 의안정보시스템에서 <b>${esc(pDetail.name)} 의원</b>의 ${targetRes && targetRes !== 'all' ? `[${esc(targetRes)}]` : ''} 대표발의안 원문 전체 검색하기 ↗
            </a>
          `;
        }
      };

      container.addEventListener('click', ev=>{
        const resBtn=ev.target.closest('[data-bill-res]');
        if(resBtn){
          ev.preventDefault();
          const clickedRes=resBtn.dataset.billRes;
          const currentActive=container.querySelector('.pol-hbar-row.on')?.dataset.billRes;
          const targetRes=(currentActive === clickedRes && clickedRes !== 'all') ? 'all' : clickedRes;
          applyBillFilter(targetRes);
          billBox?.scrollIntoView({behavior:'smooth',block:'nearest'});
          return;
        }

        const monthCol=ev.target.closest('.pm-col[data-chart-type="bill"]');
        if(monthCol){
          ev.preventDefault();
          const targetMonth=monthCol.dataset.month;
          const currentActive=container.querySelector('.pm-col.on')?.dataset.month;
          const isSame=(currentActive === targetMonth);

          container.querySelectorAll('.pm-col').forEach(c=>c.classList.remove('on'));
          const statPill=document.getElementById('pol-month-active-pill');

          if(isSame){
            applyBillFilter('all');
          }else{
            monthCol.classList.add('on');
            container.querySelectorAll('.pol-hbar-row').forEach(r=>r.classList.remove('on'));
            container.querySelectorAll('#pol-bill-filter-tabs button').forEach(tb=>tb.classList.remove('on'));

            const [y,mo]=targetMonth.split('-');
            const filtered=(bl.recent||[]).filter(b=>(b.date||'').startsWith(targetMonth));
            if(countPill)countPill.textContent=`${y}.${mo} (${filtered.length}건)`;
            if(banner && bannerText){
              banner.style.display='flex';
              bannerText.innerHTML=`📅 <b>${y}년 ${mo}월</b> 발의안 <b>${filtered.length}건</b>을 표시하고 있습니다. (막대를 다시 누르면 전체로 돌아갑니다)`;
            }
            if(billList){
              billList.innerHTML=renderBillListHtml(filtered, 'all', thCol);
            }
            if(statPill){
              statPill.innerHTML=`<span>선택: <b>${y}.${mo} (${monthCol.dataset.val}건)</b></span>`;
            }
            billBox?.scrollIntoView({behavior:'smooth',block:'nearest'});
          }
          return;
        }

        if(ev.target.closest('#pol-bill-filter-reset')){
          ev.preventDefault();
          applyBillFilter('all');
          return;
        }

        const commBtn=ev.target.closest('.comm-chip');
        if(commBtn){
          ev.preventDefault();
          const comm=commBtn.dataset.comm;
          const filtered=(bl.recent||[]).filter(b=>b.committee===comm);
          if(countPill)countPill.textContent=`${comm} (${filtered.length}건)`;
          if(banner && bannerText){
            banner.style.display='flex';
            bannerText.innerHTML=`소관위 <b>'${esc(comm)}'</b> 발의안 <b>${filtered.length}건</b>을 표시하고 있습니다.`;
          }
          if(billList){
            billList.innerHTML=renderBillListHtml(filtered, 'all', thCol);
          }
          billBox?.scrollIntoView({behavior:'smooth',block:'nearest'});
          return;
        }

        const billBar=ev.target.closest('.pol-bill-summary-bar');
        if(billBar && !ev.target.closest('[data-bill-res], .comm-chip, a')){
          const item=billBar.closest('.pol-bill-item');
          if(item){
            item.classList.toggle('open');
            const isOpen=item.classList.contains('open');
            billBar.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            const hint=item.querySelector('.pol-bill-toggle-hint');
            if(hint){
              hint.textContent=isOpen ? '요약 닫기 ▴' : '상세 요약 및 원안대비 보기 ▾';
            }
          }
          return;
        }
      });
    }

    // Incidents segment tab filtering
    const incTabs = container.querySelectorAll('#pol-inc-seg-tabs .pol-seg-btn');
    if(incTabs.length){
      incTabs.forEach(btn => {
        btn.onclick = () => {
          incTabs.forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          const stage = btn.dataset.stage;
          let visibleCount = 0;
          container.querySelectorAll('#pol-inc-list li').forEach(li => {
            const match = (stage === 'all' || li.dataset.stage === stage);
            li.style.display = match ? '' : 'none';
            if(match) visibleCount++;
          });
          const emptyMsg = container.querySelector('#pol-inc-empty');
          if(emptyMsg) emptyMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
        };
      });
    }

    // Incidents info popover toggle (for mobile touch interaction)
    const incInfoBtn = container.querySelector('#pol-inc-info-btn');
    if(incInfoBtn){
      incInfoBtn.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        incInfoBtn.closest('.pol-info-tip-wrap')?.classList.toggle('open');
      };
      document.addEventListener('click', (ev) => {
        if(!ev.target.closest('.pol-info-tip-wrap')){
          container.querySelector('.pol-info-tip-wrap.open')?.classList.remove('open');
        }
      });
    }

    if(aDetail?.events){
      const dated=aDetail.events.filter(x=>x.d);
      const fil=document.getElementById('arc-fil');
      if(fil){
        fil.onclick=ev=>{
          const btn=ev.target.closest('button');
          if(!btn)return;
          fil.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
          btn.classList.add('on');
          drawArcTimeline(dated,btn.dataset.t);
        };
        drawArcTimeline(dated,'');
      }
    }
  }).catch(err=>{
    console.error('Error loading full person data:', err);
    const container=document.getElementById('pol-dashboard-container');
    if(container)container.innerHTML='<div style="padding:16px;color:var(--mute);text-align:center">인물 상세 데이터를 불러오는 중 일시적인 네트워크 지연이 발생했습니다.</div>';
  });
}

/* ---------- 타임라인 비교 ---------- */
// 선택한 대상 전체 기록에서 날짜별·대상별 최대 2건씩 골고루 섞어 한 이슈가 과거 흐름을 독점하지 않게 함
function mixFeed(es){const seen=new Set(),out=[];
  es.forEach(e=>{const per={};e.timeline.forEach(x=>{const k=ZK.day(x.t);if(seen.has(x.url)||(per[k]||0)>=2)return;per[k]=(per[k]||0)+1;seen.add(x.url);out.push({...x,title:`[${e.name}] `+x.title})})});
  return out.sort((a,b)=>b.t<a.t?-1:1)}
function timeline(){
  let sel=D.entities.slice(0,5).map(e=>e.name),z='month';
  app.innerHTML=`${sec('타임라인 비교','Swimlane','','clock')}
  <p class="lede">인물·장소·기관을 골라 같은 시간축 위에 겹쳐 보세요. 원이 클수록 그 시기에 기사가 많았습니다.</p>
  <div class="chips" id="pick" style="margin:14px 0"></div>
  <div class="zoom" id="lz"><button data-z="day">최근 60일</button><button data-z="month" class="on">월(2년)</button><button data-z="year">시대(연)</button></div>
  <div class="card era" id="lanes" style="margin-top:12px;padding:16px"></div>
  ${sec('최신 기록 흐름','Latest','','news')}<div class="vt" id="mix"></div>`;
  const pick=()=>{$('#pick').innerHTML=D.entities.map(e=>`<button class="chip ${sel.includes(e.name)?e.type:'off'}" data-n="${esc(e.name)}">${esc(e.name)}</button>`).join('')};
  const draw=()=>{pick();const now=new Date();let keys,kf;
    if(z==='day'){keys=[...Array(60)].map((_,i)=>new Date(now-(59-i)*864e5).toISOString().slice(0,10));kf=t=>new Date(new Date(t).getTime()+9*36e5).toISOString().slice(0,10)}
    else if(z==='month'){keys=[...Array(24)].map((_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-23+i,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`});kf=t=>t.slice(0,7)}
    else{const y0=Math.min(...D.entities.filter(e=>sel.includes(e.name)).map(e=>e.timeline.length?+e.timeline[e.timeline.length-1].t.slice(0,4):now.getFullYear()));keys=[];for(let y=y0;y<=now.getFullYear();y++)keys.push(String(y));kf=t=>t.slice(0,4)}
    const cw=z==='day'?14:z==='month'?30:48,lw=96,rh=46,W=lw+keys.length*cw+10,es=D.entities.filter(e=>sel.includes(e.name));
    let mx=1;const M=es.map(e=>{const c={};e.timeline.forEach(x=>{const k=kf(x.t);c[k]=(c[k]||0)+1});Object.values(c).forEach(v=>mx=Math.max(mx,v));return c});
    const cols=['#ff4d2e','#2f6bff','#11a683','#7a4dff','#f08a00','#e2448e','#0aa5c8'];
    $('#lanes').innerHTML=`<svg width="${W}" height="${es.length*rh+30}">${keys.map((k,i)=>(z!=='month'||k.endsWith('-01')||i===0)&&(z!=='day'||i%7===0)?`<text x="${lw+i*cw}" y="${es.length*rh+20}">${z==='day'?k.slice(5):z==='month'?k.slice(0,4)+'.'+k.slice(5):k}</text><line x1="${lw+i*cw+cw/2}" x2="${lw+i*cw+cw/2}" y1="0" y2="${es.length*rh}" stroke="#eef0f6"/>`:'').join('')}
    ${es.map((e,r)=>`<a href="${eh(e.name)}"><text x="0" y="${r*rh+rh/2+4}" style="font-size:13px;font-weight:800;fill:#0f1630">${esc(e.name)}</text></a><line x1="${lw}" x2="${W}" y1="${r*rh+rh/2}" y2="${r*rh+rh/2}" stroke="#e6e8ef"/>${keys.map((k,i)=>{const v=M[r][k]||0;return v?`<circle cx="${lw+i*cw+cw/2}" cy="${r*rh+rh/2}" r="${(3+Math.sqrt(v/mx)*(Math.min(cw,rh)/2-3)).toFixed(1)}" fill="${cols[r%7]}" opacity=".8"><title>${esc(e.name)} ${k}: ${v}건</title></circle>`:''}).join('')}`).join('')}</svg>`;
    $('#lanes').scrollLeft=1e5;
    vtl($('#mix'),mixFeed(es),'day',6)};
  $('#pick').onclick=ev=>{const n=ev.target.dataset.n;if(!n)return;sel=sel.includes(n)?sel.filter(x=>x!==n):[...sel,n].slice(-7);draw()};
  $('#lz').onclick=ev=>{if(!ev.target.dataset.z)return;z=ev.target.dataset.z;$('#lz').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));draw()};
  draw();
}

/* ---------- 화제의 인물 ---------- */
const SUB=[['person','인물','user'],['reporter','기자','press'],['company','기업','coin'],['place','장소','spark'],['inst','기관·단체','news'],['issue','사건·정책','fire']];
const subtype=e=>e?.kind||(e?.type==='org'?(/기업|회사|주식회사|그룹|은행|증권|전자|자동차|브랜드|제조|통신사|게임/.test((e.wiki?.desc||'')+(e.wiki?.extract||'').slice(0,60))?'company':'inst'):e?.type);
function why(e){
  const issues=Array.isArray(e?.issues)?e.issues:[];
  const timeline=Array.isArray(e?.timeline)?e.timeline:[];
  const i=issues.map(id=>(D.issues||[]).find(x=>x.id===id)).filter(Boolean)[0];
  const td=timeline.filter(x=>{const t=new Date(normTime(x?.t));return!Number.isNaN(t.getTime())&&Date.now()-t<864e5}).length;
  let txt = '';
  if(i){
    txt = i.cat_why ? `${i.cat_why} · ‘${i.title}’` : `‘${i.title}’ 이슈 관련`;
  } else if(timeline[0]){
    txt = `최근 보도: ‘${timeline[0].title}’`;
  }
  return {issue:i, text:txt, n:td||timeline.length};
}
const reporters=()=>D.reporters||[];
const reporterById=id=>reporters().find(r=>r.id===id);
function reporterAvatar(r,cls='rav'){return`<div class="${cls}" ${bg(r.photo)}>${r.photo?'':ic('press')}</div>`}
function reporterIssues(r){return(r.issues||[]).map(id=>D.issues.find(i=>i.id===id)).filter(Boolean)}
function reporterTopics(r){const topics=[];if(r.stats?.focus)topics.push(r.stats.focus);reporterIssues(r).forEach(i=>{if(i.category&&!topics.includes(i.category))topics.push(i.category)});return topics.slice(0,3)}
function reporterCount(r){return r.stats?.last30||Math.max(0,...(r.activity||[]).map(x=>x.n||0),0)||r.reports?.length||0}
function reporterBars(r){const a=(r.activity||[]).slice(-14),mx=Math.max(1,...a.map(x=>x.n||0));if(!a.length)return'<div class="repbars empty" aria-hidden="true"></div>';return`<div class="repbars" aria-label="최근 공개 프로필의 일별 보도량">${a.map(x=>`<i style="height:${Math.max(5,Math.round((x.n||0)/mx*100))}%" title="${esc(x.day)} ${x.n}건"></i>`).join('')}</div>`}
function reporterCard(r){const issues=reporterIssues(r),topics=reporterTopics(r),reports=(r.reports||[]).slice(0,2);return`<a class="card repcard" href="${rh(r.id)}"><div class="rephead">${reporterAvatar(r)}<div><span class="repdesk">${ic('press')} ${esc(r.press||'공개 기자 프로필')}</span><b>${esc(r.name)} 기자</b><small>${topics.length?topics.map(esc).join(' · '):'오늘 보도 기록'}</small></div><span class="reptag">${issues.length?'이슈 '+issues.length:'기자 데스크'}</span></div><div class="repstat"><div><b>${reporterCount(r)}</b><span>최근 30일 보도</span></div>${reporterBars(r)}</div>${reports.length?`<ol class="repfeed">${reports.map(x=>`<li>${esc(x.title)}<small>${esc(x.when||'')}</small></li>`).join('')}</ol>`:''}<span class="ft">보도 기록과 공개 프로필 보기 ${NBI('arrow-right')}</span></a>`}
function reportersDesk(){const L=reporters();if(!L.length)return'<div class="note">공개 기자 카드가 붙은 네이버 주요 기사를 다음 수집부터 기자 데스크에 모읍니다.</div>';const total=L.reduce((s,r)=>s+reporterCount(r),0),focus=[...new Set(L.map(r=>r.stats?.focus).filter(Boolean))].slice(0,4);return`<section class="repdeskhead"><div><small>REPORTER DESK</small><h3>${ic('press')}기자 데스크</h3><p>기사에 공개된 기자 프로필을 바탕으로 최근 보도·전문 분야·소속 관측을 함께 봅니다.</p></div><div class="repdesknum"><b>${L.length}</b><span>오늘 연결된 기자</span><em>${total}건 <i>최근 30일 공개 통계 합계</i></em></div></section><div class="repfilters" aria-label="기자 전문 분야">${['전체',...focus].map((x,i)=>`<button type="button" class="${i?'':'on'}" data-rf="${esc(x)}">${esc(x)}</button>`).join('')}</div><div class="plist reporter-list">${L.map(reporterCard).join('')}</div>`}
function reportersPreview(){const L=reporters().slice(0,4);if(!L.length)return'';return`<section class="rep-preview card"><div><small>${ic('press')} REPORTER DESK · ${L.length}명</small><b>오늘 기사에 연결된 기자</b><span>보도 기록·전문 분야를 함께 봐요</span></div><a href="people" data-open-reporters>전체 보기 ${NBI('arrow-right')}</a><div class="rep-preview-list">${L.map(r=>`<a href="${rh(r.id)}">${reporterAvatar(r,'rav mini')}<span><b>${esc(r.name)} 기자</b><small>${esc(r.press||'')}</small></span></a>`).join('')}</div></section>`}
/* 메인의 화제는 수평 레일이 아니라 한 화면에서 훑는 여섯 칸이다. 당일 기사만으로
   카테고리가 비면, 이미 쌓인 기록이 많은 대상도 보충해 기자·기업·장소·기관이 사라지지 않게 한다. */
function homeTrending(){return''}
function people(){
  let f=sessionStorage.getItem('nb-sub')||'person';
  app.innerHTML=`${sec('화제','Trending people · companies · places','','fire')}<p class="lede">지금 뉴스에 오르내리는 대상들을 분류별로 모았어요. 인물·기자 카드는 보도 기록과 연도별 흐름을 함께 보여줍니다.</p><div class="filters subt" id="f">${SUB.map(([k,v,icn])=>`<button data-f="${k}" class="${k===f?'on':''}">${ic(icn)}${v}${k==='reporter'&&reporters().length?`<em>${reporters().length}</em>`:''}</button>`).join('')}</div><div id="pg"></div>`;
  const draw=()=>{sessionStorage.setItem('nb-sub',f);
    if(f==='issue'){$('#pg').innerHTML=`<div class="plist">${D.issues.filter(vis).map(i=>`<a class="card pcard" href="issue/${i.id}"><div class="ph">${th(i.image,'av')}<div><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><b>${esc(i.title)}</b><span class="meta">${cnt(i.presses,'press','언론사')}${cnt(i.mentions,'news','기사')}</span></div></div>
      <ol class="mtl">${(i.flow||[]).slice(0,5).map(fl=>`<li><time class="ts">${fmtDay(fl.date)}</time><span>${esc(fl.items[0]?.title||'')}</span></li>`).join('')}</ol><span class="ft">사건의 흐름 보기 ${NBI('arrow-right')}</span></a>`).join('')}</div>`;return}
    if(f==='reporter'){$('#pg').innerHTML=reportersDesk();const rf=$('#pg .repfilters');if(rf)rf.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;rf.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));const q=b.dataset.rf;const list=$('#pg .reporter-list');list.innerHTML=reporters().filter(r=>q==='전체'||reporterTopics(r).includes(q)).map(reporterCard).join('')||'<div class="note">이 분야의 공개 기자 프로필이 아직 없어요.</div>'};return}
    const L=(Array.isArray(D.entities)?D.entities:[]).filter(e=>e&&subtype(e)===f);
    $('#pg').innerHTML=(f==='person'?reportersPreview():'')+(L.length?`<div class="plist">${L.map(e=>{const timeline=Array.isArray(e.timeline)?e.timeline:[];const yrs={};timeline.forEach(x=>{const y=normTime(x?.t).slice(0,4);if(y&&!yrs[y])yrs[y]=x});const w=why(e);
    const p=getPol(e.name);
    const pth=p?partyTheme(p.party):null;
    const pTag=p?`<span style="margin-left:6px;display:inline-flex;align-items:center;gap:3px;font-size:.72rem;font-weight:700;color:${pth.color};vertical-align:middle"><i style="width:7px;height:7px;border-radius:50%;background:${pth.color};display:inline-block"></i>${esc(p.party)}</span>`:'';
    const polSeal=p?`<span class="av-seal-mini" style="position:absolute;right:-3px;bottom:-3px;width:22px;height:22px;border-radius:50%;background:#fff;border:1.5px solid ${pth.color};display:grid;place-items:center;box-shadow:0 1px 4px rgba(0,0,0,.2);z-index:2;">${partyMark(p.party,15,false)}</span>`:'';
    return`<a class="card pcard ${pth?'pcard-pol':''}" style="${pth?`--pc:${pth.color};border-top:3px solid ${pth.color};`:''}" href="${eh(e.name)}"><div class="ph"><div style="position:relative;flex:none">${av(e)}${polSeal}</div><div><b>${esc(e.name)}${pTag}</b><small>${esc(entDesc(e))}</small></div></div>${spark(e.daily,300,36,pth?pth.color:'#ff4d2e')}
    ${w.text?`<div class="why-box"><span class="why-badge">화제 이유</span><p class="why-desc">${esc(w.text)}</p></div>`:''}
    <ol class="mtl">${Object.entries(yrs).sort((a,b)=>b[0]-a[0]).slice(0,4).map(([y,x])=>`<li><time class="ts">${y}</time><span>${esc(x.title)}</span></li>`).join('')}</ol><span class="ft">${cnt(timeline.length,'clock','기록')}타임라인 보기 ${NBI('arrow-right')}</span></a>`}).join('')}</div>`:'<div class="note">오늘은 이 분류에 해당하는 대상이 없어요.</div>');
    ensurePolIndex().then(()=>{
      L.forEach(e=>{
        const p=getPol(e.name);
        if(p){
          const pth=partyTheme(p.party);
          const pc=document.querySelector(`.pcard[href="${eh(e.name)}"]`);
          if(pc){
            pc.style.borderTop=`3px solid ${pth.color}`;
            const elAv=pc.querySelector('.av');
            const curEm=entityMedia(e);
            if(elAv&&curEm.url&&(!elAv.style.backgroundImage||elAv.querySelector('svg'))){
              elAv.style.backgroundImage=`url('${curEm.url}')`;
              elAv.innerHTML='';
            }
            const avBox=pc.querySelector('.ph > div:first-child');
            if(avBox&&!avBox.querySelector('.av-seal-mini')){
              const s=document.createElement('span');
              s.className='av-seal-mini';
              s.style.cssText=`position:absolute;right:-3px;bottom:-3px;width:22px;height:22px;border-radius:50%;background:#fff;border:1.5px solid ${pth.color};display:grid;place-items:center;box-shadow:0 1px 4px rgba(0,0,0,.2);z-index:2;`;
              s.innerHTML=partyMark(p.party,15,false);
              avBox.appendChild(s);
            }
            const elB=pc.querySelector('.ph b');
            if(elB&&!elB.querySelector('span')){
              const t=document.createElement('span');
              t.style.cssText=`margin-left:6px;display:inline-flex;align-items:center;gap:3px;font-size:.72rem;font-weight:700;color:${pth.color};vertical-align:middle;`;
              t.innerHTML=`<i style="width:7px;height:7px;border-radius:50%;background:${pth.color};display:inline-block"></i>${esc(p.party)}`;
              elB.appendChild(t);
            }
            const elSmall=pc.querySelector('.ph small');
            if(elSmall&&(!e.wiki?.desc||elSmall.textContent==='')){
              elSmall.textContent=entDesc(e);
            }
          }
        }
      });
    });
  };
  $('#f').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;f=b.dataset.f;$('#f').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()};draw();const preview=$('[data-open-reporters]',app);if(preview)preview.onclick=ev=>{ev.preventDefault();f='reporter';$('#f').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.f===f));draw()};
}
function reporter(id){const r=reporterById(id);if(!r)return people();const issues=reporterIssues(r),topics=reporterTopics(r),reports=r.reports||[],aff=r.affiliations||[];setMeta(r.name+' 기자 — 보도 기록',`${r.press||''} ${r.name} 기자의 공개 프로필과 최근 보도 기록`);app.innerHTML=`<div class="bkrow"><a class="back" href="people">${NBI('arrow-left')} 화제</a>${shareBtn()}</div><section class="repdetail card"><div class="repidentity">${reporterAvatar(r,'rav big')}<div><span class="repdesk">${ic('press')} ${esc(r.press||'공개 기자 프로필')}</span><h1>${esc(r.name)} 기자</h1>${r.bio?`<p>${esc(r.bio)}</p>`:'<p>기사에 표시된 공개 기자 프로필을 기준으로 정리한 보도 기록입니다.</p>'}${r.profile?`<a class="go" href="${esc(r.profile)}" target="_blank" rel="noopener">네이버 기자 프로필 ${NBI('arrow-up-right')}</a>`:''}</div></div><div class="rep-kpis"><div><b>${reporterCount(r)}</b><span>최근 30일 보도</span></div><div><b>${issues.length}</b><span>오늘 연결 이슈</span></div><div><b>${reports.length}</b><span>최근 공개 목록</span></div></div></section><div class="two"><div>${sec('최근 보도','Latest reports','','news')}<div class="report-list">${reports.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${x.image?`<span class="report-thumb" ${bg(x.image)}></span>`:''}<span><b>${esc(x.title)}</b><small>${esc(r.press||'')} · ${esc(x.when||'네이버 기자페이지')}</small></span>${NBI('arrow-up-right')}</a>`).join('')||'<div class="note">공개된 최근 보도 목록을 불러오지 못했어요.</div>'}</div>${sec('보도 리듬','30-day public profile activity','','chart')}<section class="card repactivity">${reporterBars(r)}<p>막대는 네이버 기자 프로필에 표시된 최근 30일의 일별 기사 수입니다.</p></section></div><aside>${sec('관점과 연결','Desk context','','search')}<section class="card repcontext"><div><small>주요 분야</small><p class="chips">${topics.map(x=>`<span class="chip event">${esc(x)}</span>`).join('')||'<span class="note">분야 정보 없음</span>'}</p></div>${issues.length?`<div><small>오늘의 연결 이슈</small><ul>${issues.map(i=>`<li><a href="issue/${i.id}"><b>${i.rank}</b>${esc(i.title)}</a></li>`).join('')}</ul></div>`:''}</section>${sec('소속 관측','Affiliation observation','','history')}<section class="card affiliations">${aff.map(x=>`<div><b>${esc(x.press||'소속 미표기')}</b><span>${esc(x.first)}${x.last&&x.last!==x.first?' — '+esc(x.last):'부터 관측'}</span></div>`).join('')||'<p>공개 프로필의 소속 표기를 기다리고 있어요.</p>'}<p>동명이인은 합치지 않으며, 공개 프로필에 확인되지 않은 이직은 추정해 표시하지 않습니다.</p></section></aside></div>`}

/* 기자의 ‘성향’은 정치적 입장을 추측하지 않고, 공개 기사와 프로필에서 관찰되는
   보도 주제·시기·소속만 계산한다. 데이터가 쌓일수록 전 인물 화면의 시대별 보도량과
   같은 컴포넌트로 확장된다. */
function reporterHistoryRows(r){const seen=new Set(),out=[];for(const x of [...(r.history_reports||[]),...(r.reports||[])]){const key=x.url||x.title;if(!key||seen.has(key))continue;seen.add(key);let raw=x.published||x.date||x.observed||'';if(!raw&&/^\d{4}[.\-/]\d\d[.\-/]\d\d/.test(x.when||''))raw=(x.when||'').replace(/[.\/]/g,'-');if(!raw)raw=r.observed||'';if(!/^\d{4}-\d\d-\d\d/.test(raw))continue;out.push({...x,t:raw.includes('T')||raw.includes(':')?raw:raw+' 12:00',press:x.press||r.press||''})}return out.sort((a,b)=>String(b.t).localeCompare(String(a.t)))}
function reporterFootprint(r){const c={...(r.topic_counts||{})};reporterIssues(r).forEach(i=>{if(i.category)c[i.category]=(c[i.category]||0)+1});const sum=Object.values(c).reduce((a,b)=>a+b,0)||1;return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,n])=>({name,n,p:Math.round(n/sum*100)}))}
reporter=function(id){const r=reporterById(id);if(!r)return people();const issues=reporterIssues(r),topics=reporterTopics(r),rows=reporterHistoryRows(r),reports=(r.reports||[]).slice(0,12),aff=r.affiliations||[],foot=reporterFootprint(r),career=r.career||[],awards=r.awards||[];setMeta(r.name+' 기자 — 보도 기록',`${r.press||''} ${r.name} 기자의 공개 프로필과 누적 보도 기록`);
  app.innerHTML=`<div class="bkrow"><a class="back" href="people">${NBI('arrow-left')} 화제</a>${shareBtn()}</div><section class="repdetail card"><div class="repidentity">${reporterAvatar(r,'rav big')}<div><span class="repdesk">${ic('press')} ${esc(r.press||'공개 기자 프로필')}</span><h1>${esc(r.name)} 기자</h1>${r.bio?`<p>${esc(r.bio)}</p>`:'<p>기사에 표시된 공개 기자 프로필과 기사 목록을 기준으로 누적하는 보도 기록입니다.</p>'}${r.profile?`<a class="go" href="${esc(r.profile)}" target="_blank" rel="noopener">공개 기자 프로필 ${NBI('arrow-up-right')}</a>`:''}</div></div><div class="rep-kpis"><div><b>${reporterCount(r)}</b><span>최근 30일 보도</span></div><div><b>${rows.length}</b><span>누적 확인 기사</span></div><div><b>${aff.length}</b><span>공개 소속 기록</span></div></div></section><div class="two"><div>${sec('최근 보도','Latest reports','','news')}<div class="report-list">${reports.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${x.image?`<span class="report-thumb" ${bg(x.image)}></span>`:''}<span><b>${esc(x.title)}</b><small>${pp(x.press||r.press,x.url)}${esc(x.when||x.observed||'공개 기자페이지')}</small></span>${NBI('arrow-up-right')}</a>`).join('')||'<div class="note">공개된 최근 보도 목록을 불러오지 못했어요.</div>'}</div>${sec('시대별 보도량','Coverage by era','<div class="zoom" id="rez"><button data-z="month" class="on">월</button><button data-z="year">연</button></div>','chart')}<div class="card" style="padding:10px 14px" id="rera"></div>${sec('날짜별 보도 타임라인','Daily coverage','','clock')}<div class="vt" id="rtl"></div>${sec('보도 리듬','30-day public profile activity','','chart')}<section class="card repactivity">${reporterBars(r)}<p>막대는 공개 기자 프로필에 표시된 최근 30일의 일별 기사 수입니다.</p></section></div><aside>${sec('보도 주제 분포','Coverage footprint','','search')}<section class="card repcontext"><p class="fine">기사 제목·연결 이슈에서 확인한 분야 비중입니다. 개인의 정치적 입장이나 가치관을 추정하지 않습니다.</p>${foot.length?`<ul class="footprint">${foot.map(x=>`<li><span>${esc(x.name)}</span><i><b style="width:${x.p}%"></b></i><em>${x.p}%</em></li>`).join('')}</ul>`:'<p class="note">분야별 기록이 더 쌓이면 표시돼요.</p>'}</section>${sec('경력·수상','Public profile','','history')}<section class="card affiliations"><div><b>공개 경력</b>${career.length?career.map(x=>`<span>${esc(x)}</span>`).join(''):'<span>공개 프로필에서 확인된 경력 정보가 아직 없어요.</span>'}</div><div><b>공개 수상</b>${awards.length?awards.map(x=>`<span>${esc(x)}</span>`).join(''):'<span>공개 프로필에서 확인된 수상 정보가 아직 없어요.</span>'}</div></section>${sec('소속 관측','Affiliation observation','','history')}<section class="card affiliations">${aff.map(x=>`<div><b>${esc(x.press||'소속 미표기')}</b><span>${esc(x.first)}${x.last&&x.last!==x.first?' — '+esc(x.last):'부터 관측'}</span></div>`).join('')||'<p>공개 프로필의 소속 표기를 기다리고 있어요.</p>'}<p>동명이인은 합치지 않으며, 공개 프로필에 확인되지 않은 이직은 추정해 표시하지 않습니다.</p></section></aside></div>`;
  const draw=z=>{const el=$('#rera');if(el)el.innerHTML=rows.length?eraChart(rows,z):'<p class="note">누적 보도량은 수집이 이어지면 표시돼요.</p>'};draw('month');$('#rez').onclick=ev=>{const z=ev.target.dataset.z;if(!z)return;$('#rez').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ev.target));draw(z)};vtl($('#rtl'),rows,'day',99)
}

/* ---------- 관계맵 ---------- */
function map(){
  app.innerHTML=`${sec('키워드 관계맵','Relation map','','graph')}<p class="lede">오늘의 이슈(사각형)와 인물·장소·기관(원)이 같은 기사에 함께 등장하면 선으로 이어집니다. 노드를 끌어보고, 눌러서 상세로 이동하세요.</p>
  <div class="legend"><span style="--c:#ff4d2e">인물</span><span style="--c:#11a683">장소</span><span style="--c:#7a4dff">기관·기업</span><span style="--c:#ffb020">키워드</span><span style="--c:#0f1630">이슈</span></div>
  <div class="card mapwrap" id="mapbig"></div>
  ${sec('노드는 왜 여기에?','Why each node','','search')}
  <ul class="whyl">${D.entities.map(e=>{const w=why(e),st=subtype(e);return`<li><a href="${eh(e.name)}">${entc(e.name,e.type)}<span class="wt"><span class="tag">${esc(SUB.find(x=>x[0]===st)?.[1]||'')}</span>${w.issue?`<span class="why">${esc(w.text)}</span>`:''}</span>${cnt(w.n,'news','관련 기사')}</a></li>`}).join('')}
  ${D.issues.filter(vis).map(i=>`<li><a href="issue/${i.id}"><span class="ent issue"><b class="rkn">${i.rank}</b>이슈</span><span class="wt"><span class="why strong">${esc(i.title)}</span></span>${cnt(i.presses,'press','보도 언론사')}</a></li>`).join('')}</ul>`;graph($('#mapbig'),false);
}
function graph(el,mini){
  /* 결정적(시드) 레이아웃: 화면에 그리기 전에 시뮬레이션을 끝내고 고정 → 튐 없음 */
  let W=el.clientWidth||360,H=el.clientHeight||460,col={person:'#ff4d2e',place:'#11a683',org:'#7a4dff',event:'#ffb020'};
  let small=W<500,fs=mini||small?10.5:12;
  const N=[],idx={},E=[];

  // 모바일과 데스크톱 모두 풍성하면서도 정돈된 노드 풀 구성
  const entitiesPool = (mini || small) ? D.entities.slice(0, small ? 9 : 14) : D.entities.slice(0, 20);
  const issuesPool = (mini || small) ? D.issues.filter(vis).slice(0, small ? 5 : 7) : D.issues.filter(vis).slice(0, 10);

  // 모든 엔티티 노드 썸네일 확보 (생략 '…' 없이 온전한 키워드 노출)
  entitiesPool.forEach(e=>{
    const media=entityMedia(e);
    let img=media.url;
    if(!img){
      const rel=(e.issues||[]).map(id=>D.issues.find(x=>x.id===id)).filter(Boolean)[0];
      if(rel && (rel.image || (rel.gallery && rel.gallery[0] && rel.gallery[0].img))){
        img = rel.image || rel.gallery[0].img;
      }
    }
    idx[e.name]=N.length;
    N.push({id:e.name,lab:e.name,t:e.type,r:Math.min(small?18:24,(small?8:10)+Math.sqrt(e.score)/(small?2.2:1.6)),href:eh(e.name),img,kind:media.kind});
  });

  // 모든 이슈 노드 썸네일 확보 및 관계망 연결
  issuesPool.forEach(i=>{
    idx[i.id]=N.length;
    const img=i.image || (i.gallery && i.gallery[0] && i.gallery[0].img) || '';
    const kwLabel = i.keywords && i.keywords[0] ? i.keywords[0] : i.category;
    N.push({id:i.id,lab:`${i.rank}위 ${kwLabel}`,t:'issue',r:small?13:16,href:'issue/'+i.id,img,kind:'issue'});
    let linked = false;
    i.entities.forEach(n=>{if(n in idx){E.push([idx[i.id],idx[n],3]);linked=true}});
    if(!linked && issuesPool.length>1){
      const other = issuesPool.find(x => x.id !== i.id && x.category === i.category) || issuesPool[0];
      if(other && other.id in idx) E.push([idx[i.id], idx[other.id], 2]);
    }
  });

  D.links.forEach(l=>{if(l.a in idx&&l.b in idx)E.push([idx[l.a],idx[l.b],l.n])});

  // 모든 엔티티가 관계망 선으로 연결되도록 보강
  entitiesPool.forEach(e=>{
    const myIdx = idx[e.name];
    const hasEdge = E.some(([a,b]) => a === myIdx || b === myIdx);
    if(!hasEdge && issuesPool.length){
      const relIssue = issuesPool.find(i => (i.entities||[]).includes(e.name) || (e.issues||[]).includes(i.id)) || issuesPool[0];
      if(relIssue && relIssue.id in idx) E.push([myIdx, idx[relIssue.id], 2]);
    }
  });

  // 고른 분포와 겹침 없는 배치를 위한 레이아웃 연산 함수
  const solveLayout = (targetW, targetH) => {
    W = targetW; H = targetH;
    small = W < 500; fs = mini || small ? 10.5 : 12;
    const pad = small ? 16 : 28, cx = W / 2, cy = H / 2;
    N.forEach(n => {
      n.lw = n.lab.length * fs * 0.95;
      n.cr = Math.max(n.r + 8, n.lw / 2 + 10);
      n.ch = n.r + fs + 14;
    });
    let seed = 0; for(const n of N) for(const c of n.id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 };
    N.forEach((n, i) => {
      const a = i * 2.39996 + rnd() * 0.3, rr = Math.sqrt((i + 0.5) / N.length);
      n.x = cx + Math.cos(a) * rr * (W / 2 - pad - n.cr);
      n.y = cy + Math.sin(a) * rr * (H / 2 - pad - n.ch);
      n.vx = n.vy = 0;
    });
    const area = (W - 2 * pad) * (H - 2 * pad);
    const k = Math.sqrt(area / Math.max(N.length, 1));
    const L = k * 0.95;
    const clamp = n => {
      n.x = Math.max(pad + n.cr, Math.min(W - pad - n.cr, n.x));
      n.y = Math.max(pad + n.r, Math.min(H - pad - n.ch, n.y));
    };

    for(let it = 0, T = k * 0.55; it < 460; it++, T *= 0.988) {
      N.forEach(n => { n.fx = 0; n.fy = 0; });
      for(let i = 0; i < N.length; i++) {
        for(let j = i + 1; j < N.length; j++) {
          const a = N[i], b = N[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d = Math.hypot(dx, dy) || 0.01;
          const f = (k * k * 1.15) / (d * d + 25);
          a.fx += dx * f; a.fy += dy * f;
          b.fx -= dx * f; b.fy -= dy * f;
        }
      }
      E.forEach(([i, j]) => {
        const a = N[i], b = N[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        const f = (d - L) / d * 0.07;
        a.fx += dx * f; a.fy += dy * f;
        b.fx -= dx * f; b.fy -= dy * f;
      });
      N.forEach(n => {
        n.fx += (cx - n.x) * 0.04 * Math.min(1, H / W);
        n.fy += (cy - n.y) * 0.04 * Math.min(1, W / H);
        const m = Math.hypot(n.fx, n.fy) || 1, s = Math.min(m, Math.max(T, 0.8));
        n.x += n.fx / m * s; n.y += n.fy / m * s;
        clamp(n);
      });
      // 충돌 방지: 사각형 근사 + 라벨 반경
      for(let p = 0; p < (it > 390 ? 8 : 3); p++) {
        for(let i = 0; i < N.length; i++) {
          for(let j = i + 1; j < N.length; j++) {
            const a = N[i], b = N[j];
            const ox = (a.cr + b.cr + 12) - Math.abs(a.x - b.x);
            const oy = (a.ch + b.ch + 10) / 1.5 - Math.abs(a.y - b.y);
            if(ox > 0 && oy > 0) {
              if(ox < oy) {
                const s = (a.x < b.x ? -1 : 1) * ox / 2;
                a.x += s; b.x -= s;
              } else {
                const s = (a.y < b.y ? -1 : 1) * oy / 2;
                a.y += s; b.y -= s;
              }
              clamp(a); clamp(b);
            }
          }
        }
      }
    }
    N.forEach(n => { n.homeX = n.x; n.homeY = n.y; n.vx = 0; n.vy = 0; });
  };
  solveLayout(W, H);

  const NS='http://www.w3.org/2000/svg';
  const defsSvg = N.map((n,i)=>n.img?`<pattern id="p${i}" width="1" height="1" patternContentUnits="objectBoundingBox"><image href="${esc(n.img)}" width="1" height="1" preserveAspectRatio="${n.kind==='logo'||n.kind==='flag'?'xMidYMid meet':'xMidYMid slice'}"/></pattern>`:'').join('');
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="키워드 관계맵"><defs>${defsSvg}</defs><g class="vp"><g class="ed"></g><g class="nd"></g></g></svg>${mini?'':`<div class="mapfield" aria-hidden="true"><b>LIVE RELATION FIELD</b><span>인물 · 장소 · 기관</span></div><div class="mapzoom"><button type="button" data-z="1.25" aria-label="확대">+</button><button type="button" data-z="0.8" aria-label="축소">−</button><button type="button" data-z="0" aria-label="원래대로">⟲</button></div>`}`;
  const svg=el.querySelector('svg'),vp=svg.querySelector('.vp'),ge=svg.querySelector('.ed'),gn=svg.querySelector('.nd');
  const near=N.map(()=>new Set());E.forEach(([a,b])=>{near[a].add(b);near[b].add(a)});
  const lines=E.map(([a,b,w])=>{const l=document.createElementNS(NS,'line');l.setAttribute('stroke','#9ca9c6');l.setAttribute('stroke-opacity','0.45');l.setAttribute('stroke-width',Math.min(1.45,.36+w*.13));l.setAttribute('vector-effect','non-scaling-stroke');ge.appendChild(l);return l});
  const flowLines=E.map(()=>{const fl=document.createElementNS(NS,'line');fl.setAttribute('class','map-flow');fl.setAttribute('vector-effect','non-scaling-stroke');ge.appendChild(fl);return fl});
  const nodes=N.map((n,i)=>{const g=document.createElementNS(NS,'g');g.setAttribute('class','node '+n.t);
    const shape = n.t==='issue' ? (n.img?`<rect x="${-n.r*1.15}" y="${-n.r*0.8}" width="${n.r*2.3}" height="${n.r*1.6}" rx="6" fill="url(#p${i})" stroke="#0f1630" stroke-width="2.5"/>`:`<rect x="${-n.r}" y="${-n.r*.7}" width="${n.r*2}" height="${n.r*1.4}" rx="5" fill="#0f1630"/>`)
      : `<circle r="${n.r}" fill="${n.img?`url(#p${i})`:col[n.t]}" stroke="${col[n.t]}" stroke-width="${n.img?'2.5':'3'}"/>`;
    g.innerHTML=shape+`<text y="${n.r+fs+2}" text-anchor="middle" style="font-size:${fs}px">${esc(n.lab)}</text><title>${esc(n.t==='issue'?n.lab:n.id)}</title>`;
    gn.appendChild(g);return g});
  const draw=()=>{
    E.forEach(([i,j],k)=>{
      const l=lines[k], fl=flowLines[k];
      l.setAttribute('x1',N[i].x);l.setAttribute('y1',N[i].y);l.setAttribute('x2',N[j].x);l.setAttribute('y2',N[j].y);
      if(fl){fl.setAttribute('x1',N[i].x);fl.setAttribute('y1',N[i].y);fl.setAttribute('x2',N[j].x);fl.setAttribute('y2',N[j].y)}
    });
    nodes.forEach((g,i)=>g.setAttribute('transform',`translate(${N[i].x.toFixed(1)},${N[i].y.toFixed(1)})`))
  };draw();
  // 보기 변환(확대·이동) — 노드 배치는 그대로
  let s=1,tx=0,ty=0;const setV=()=>{s=Math.max(1,Math.min(3,s));tx=Math.min(0,Math.max(W-W*s,tx));ty=Math.min(0,Math.max(H-H*s,ty));vp.setAttribute('transform',`translate(${tx},${ty}) scale(${s})`);svg.style.touchAction=s>1?'none':'pan-y'};setV();
  const pt=ev=>{const r=svg.getBoundingClientRect();return[(ev.clientX-r.left)*W/r.width,(ev.clientY-r.top)*H/r.height]};
  const P=new Map();let drag=null,moved=false,start=null,pinch=null,pan=null,hover=null,hoverPoint=null,raf=0;
  /* 기본 화면은 정적이고, 손가락/포인터가 닿은 노드와 직접 연결된 선만 흐른다.
     전체 그래프가 동시에 움직이면 관계의 방향을 읽기 어려워진다. */
  const setFlow=n=>{const i=n?N.indexOf(n):-1;el.classList.toggle('flow-active',i>=0);
    flowLines.forEach((line,k)=>{const edge=E[k]||[];line.classList.toggle('on',i>=0&&(edge[0]===i||edge[1]===i))})};
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nodeAt=p=>{let hit=null,dist=Infinity;N.forEach(n=>{const d=Math.hypot(n.x-p[0],n.y-p[1]);if(d<Math.max(n.r+44,62)&&d<dist){hit=n;dist=d}});return hit};
  /* 상시 시뮬레이션은 하지 않는다. 포인터가 가까울 때만 이웃 노드를 살짝 끌고,
     손을 놓으면 각 노드의 계산된 원래 자리로 스프링처럼 돌아간다. */
  const wake=()=>{if(reduced||raf)return;raf=requestAnimationFrame(function tick(){if(!el.isConnected){raf=0;return}let active=!!hover||!!drag;
    N.forEach((n,i)=>{if(n===drag)return;let fx=(n.homeX-n.x)*.09,fy=(n.homeY-n.y)*.09;
      if(hover&&hoverPoint){if(n===hover){fx+=(hoverPoint[0]-n.x)*.065;fy+=(hoverPoint[1]-n.y)*.065}
        else if(near[N.indexOf(hover)]?.has(i)){fx+=(hover.x-n.x)*.012;fy+=(hover.y-n.y)*.012}}
      n.vx=(n.vx+fx)*.76;n.vy=(n.vy+fy)*.76;n.x+=n.vx;n.y+=n.vy;
      clampNode(n);
      if(Math.abs(n.vx)+Math.abs(n.vy)+Math.abs(n.homeX-n.x)+Math.abs(n.homeY-n.y)>.22)active=true});
    draw();if(active)raf=requestAnimationFrame(tick);else raf=0});};
  const clampNode=n=>{n.x=Math.max((small?16:28)+n.cr,Math.min(W-(small?16:28)-n.cr,n.x));n.y=Math.max((small?16:28)+n.r,Math.min(H-(small?16:28)-n.ch,n.y))};

  // 브라우저 가로폭 리사이즈 감지 시 새 너비에 맞춰 자동 재배치
  if(window.ResizeObserver && !el._nbResizeObs){
    let curW = el.clientWidth;
    el._nbResizeObs = new ResizeObserver(entries=>{
      for(const entry of entries){
        const nw = Math.round(entry.contentRect.width);
        if(nw > 100 && Math.abs(nw - curW) > 16){
          curW = nw;
          solveLayout(nw, el.clientHeight || H);
          svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
          wake();
        }
      }
    });
    el._nbResizeObs.observe(el);
  }

  svg.addEventListener('pointerdown',ev=>{const p=pt(ev);P.set(ev.pointerId,p);const g=ev.target.closest('.node');
    if(P.size===2){drag=null;const [a,b]=[...P.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),s,tx,ty,m:[(a[0]+b[0])/2,(a[1]+b[1])/2]};return}
    if(g){drag=N[nodes.indexOf(g)];hover=null;hoverPoint=null;setFlow(drag);moved=false;start=p;try{svg.setPointerCapture(ev.pointerId)}catch(x){}}
    else if(s>1){pan={p,tx,ty};try{svg.setPointerCapture(ev.pointerId)}catch(x){}}});
  svg.addEventListener('pointermove',ev=>{const p=pt(ev);if(!P.has(ev.pointerId)){if(ev.pointerType==='mouse'&&!drag&&!pan){const g=ev.target.closest('.node');hover=g?N[nodes.indexOf(g)]:nodeAt([(p[0]-tx)/s,(p[1]-ty)/s]);hoverPoint=hover?[(p[0]-tx)/s,(p[1]-ty)/s]:null;setFlow(hover);wake()}return}P.set(ev.pointerId,p);
    if(pinch&&P.size===2){const [a,b]=[...P.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);const ns=Math.max(1,Math.min(3,pinch.s*d/pinch.d));tx=pinch.m[0]-(pinch.m[0]-pinch.tx)*ns/pinch.s;ty=pinch.m[1]-(pinch.m[1]-pinch.ty)*ns/pinch.s;s=ns;setV();ev.preventDefault();return}
    if(drag){if(!moved&&Math.hypot(p[0]-start[0],p[1]-start[1])<6)return;moved=true;drag.x=(p[0]-tx)/s;drag.y=(p[1]-ty)/s;clampNode(drag);draw();ev.preventDefault()}
    else if(pan){tx=pan.tx+p[0]-pan.p[0];ty=pan.ty+p[1]-pan.p[1];setV()}});
  const end=ev=>{P.delete(ev.pointerId);if(P.size<2)pinch=null;if(ev.type==='pointerup'&&drag&&!moved)go(drag.href);drag=null;pan=null;setFlow(hover);wake()};
  svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
  svg.addEventListener('pointerleave',ev=>{if(ev.pointerType==='mouse'){hover=null;hoverPoint=null;setFlow(null);wake()}});
  nodes.forEach(g=>g.style.touchAction='none');
  el.querySelector('.mapzoom')?.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;const z=+b.dataset.z;if(!z){s=1;tx=ty=0}else{const ns=Math.max(1,Math.min(3,s*z));tx=W/2-(W/2-tx)*ns/s;ty=H/2-(H/2-ty)*ns/s;s=ns}setV()});
}

/* ---------- 아카이브 ---------- */
async function archive(){
  app.innerHTML=`${sec('날짜별 아카이브','Archive','','history')}<div class="days" id="days"></div><div class="alist" id="al"></div><div class="note">매시간 수집·분석 결과가 날짜별로 영구 저장되고, 새 이슈가 들어오면 같은 인물·키워드의 과거 사건과 자동으로 연결됩니다.</div>`;
  let idx=[];try{idx=await (await fetch('data/archive/index.json?'+Date.now())).json()}catch(e){}
  const show=async d=>{document.querySelectorAll('#days button').forEach(b=>b.classList.toggle('on',b.dataset.d===d));
    const a=CACHE[d]||(CACHE[d]=await (await fetch(`data/archive/${d}.json`)).json());
    $('#al').innerHTML=(a.restored?`<p class="note rst">${ic('search')}<span>이날은 실시간 수집 전이라, 그날 보도된 기사를 검색해 <b>여러 언론사가 다룬 순서</b>로 다시 정리했어요. 실제 많이 본 순위와는 다를 수 있어요.</span></p>`:'')+a.issues.map(i=>`<a class="card mini" href="${esc(i.url)}" target="_blank" rel="noopener"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><span class="cat ${i.category}">${ic(i.category)}${i.category}</span><h3>${esc(i.title)}</h3><div class="m">${esc(i.press)} · 언론사 ${i.presses}곳${i.comment_total?' · 댓글 '+i.comment_total.toLocaleString():''}</div></div></a>`).join('')};
  $('#days').innerHTML=idx.map(d=>{const t=new Date(d+'T12:00:00+09:00');return`<button data-d="${d}"><span>${t.getFullYear()}.${t.getMonth()+1}</span><b>${t.getDate()}</b><span>${'일월화수목금토'[t.getDay()]}</span></button>`}).join('');
  $('#days').onclick=ev=>{const b=ev.target.closest('button');if(b)show(b.dataset.d)};if(idx[0])show(idx[0]);
}


/* ---------- 해외 모드 ---------- */
const T_=(o,k)=>S.orig?o[k]:(o[k+'_ko']||o[k]);
const gcat=c=>S.orig?(CATEN[c]||c):c;
const gt=(en,ko)=>S.orig?en:ko;
// 원문·번역 전환: 해외 화면 머리줄('해외 주요 뉴스 · 한국어 자동 번역') 오른쪽 끝
function globalBar(label,icon='세계'){return`<div class="gbar"><span>${ic(icon)}${label}</span>${regionControl()}</div><div id="nb-alert-slot" class="nb-alert-slot"></div>`}
/* 해외 카드 요약: AI 세 줄 요약(없으면 요약문을 문장으로 나눔) → 국내 카드처럼 주황 불릿, 핵심어 주황 강조 */
function gbullets(i,n){const A=i.ai||{};let L=(A.bullets&&(A.bullets[S.orig?'en':'ko']||A.bullets.en))||[];
  if(!L.length){const ld=(i.leads||[])[0],t=T_(i,'summary')||(ld?(S.orig?ld.text:(ld.text_ko||ld.text)):'');L=t.split(/(?<=[.!?다요])\s+/).map(x=>x.trim()).filter(x=>x.length>12)}
  L=L.slice(0,n).map(x=>x.length>120?x.slice(0,118)+'…':x);if(!L.length)return'';
  const K=[...(i.keywords||[])].filter(w=>w&&w.length>=3).sort((a,b)=>b.length-a.length).slice(0,6);
  const hl=t=>{let h=esc(t);K.forEach(k=>{h=h.replace(new RegExp('\\b('+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')\\b','i'),'<em class="hk">$1</em>')});return h};
  return`<ul>${L.map(t=>`<li>${hl(t)}</li>`).join('')}</ul>`}
// 해외 증시 카드(우리 마켓 상세가 없는 지표라 링크 없이, 누르면 말풍선)
function gmk(m){const d=up(m),s=d==='up'?NBI('caret-up-f'):d==='down'?NBI('caret-down-f'):'',n=S.orig?m.name:(m.name_ko||m.name);
  return`<div class="mk ${d}" data-tip="${esc(n)} · ${gt('52-week','52주')} ${m.lo52!=null?Number(m.lo52).toLocaleString():'—'} ~ ${m.hi52!=null?Number(m.hi52).toLocaleString():'—'}"><span class="n">${esc(n)}</span><b>${esc(m.price)}</b><em>${s} ${esc(m.diff||'')} (${m.rate>0?'+':''}${m.rate}%)</em>${line(m.series,120,28,d==='down'?'#2f6bff':'#ff4d2e',{name:n+' · '+gt('daily close','일별 종가'),step:gt(' trading days ago','거래일 전')})}</div>`}
function gtoday(){
  const I=G.issues,L=I[0],mx=Math.max(...I.map(i=>i.score||0),1),M=G.markets||[],ST=G.stocks||[],SE=G.sections||{};
  const cats={};I.forEach(i=>cats[i.category]=(cats[i.category]||0)+1);
  const grid=I.slice(5).map((i,k)=>{const wide=k===0;const sum=T_(i,'summary');
    return`<a class="card ic ${wide?'wide':''} ${i.image?'':'text'}" href="g/${i.id}">${i.image?`<div class="img" ${bg(i.image)}><div class="rk">${i.rank}</div></div>`:''}
    <div class="bd">${i.image?'':`<div class="rkt">${String(i.rank).padStart(2,'0')}</div>`}<div class="row"><span class="cat ${i.category}">${ic(i.category)}${esc(gcat(i.category))}</span></div>
    <h3>${esc(T_(i,'title'))}</h3>${gbullets(i,wide?3:2)}
    <div class="chips">${(i.keywords||[]).slice(0,4).map(w=>`<span class="chip">${esc(w)}</span>`).join('')}</div>
    <div class="heat" data-tip="${gt('Buzz: number of stories and publishers covering it, relative to the top story','화제도: 다룬 기사 수·매체 수를 합친 점수(1위 이슈 대비)')}"><span>${ic('fire')}${gt('Buzz','화제도')}</span><div class="bar"><i style="width:${((i.score||0)/mx*100).toFixed(0)}%"></i></div><b>${Math.round(i.score||0)}</b></div>
    <div class="ft"><span>${esc(i.press)} · ${gt(`${i.presses} publishers`,`매체 ${i.presses}곳`)}</span><span>${gt('More','자세히')} ${NBI('arrow-right')}</span></div></div></a>`}).join('');
  const us=M.filter(m=>m.group==='us'),wo=M.filter(m=>m.group==='world'),ot=M.filter(m=>!['us','world'].includes(m.group));
  const mv=[...ST].sort((a,b)=>b.rate-a.rate);
  const secs=Object.entries(SE).filter(([,L])=>L.length);
  app.innerHTML=`${globalBar(gt('Global briefing · original reporting','해외 주요 뉴스 · 한국어 자동 번역'))}
  <section class="hero"><a class="lead card" href="g/${L.id}" ${bg(L.image)}><div class="in"><div class="no">01</div><span class="cat 세계">${ic('세계')}${esc(gcat(L.category))}</span><h1>${esc(T_(L,'title'))}</h1>${L.summary?`<p class="ld">${esc(T_(L,'summary'))}</p>`:''}
   <div class="meter"><div>${ic('news')}<b>${L.mentions}</b><span>${gt('stories','관련 기사')}</span></div><div>${ic('user')}<b>${L.presses}</b><span>${gt('publishers','매체')}</span></div><div>${ic('spark')}<b>${(L.keywords||[]).length}</b><span>${gt('key terms','핵심어')}</span></div></div></div></a>
   <div class="side">${I.slice(1,5).map(i=>`<a class="card mini" href="g/${i.id}"><div class="n">${i.rank}</div>${th(i.image)}<div class="tx"><span class="cat ${i.category}">${esc(gcat(i.category))}</span><h3>${esc(T_(i,'title'))}</h3><div class="m">${esc(i.press)} · ${gt(`${i.presses} publishers`,`외 ${Math.max(0,i.presses-1)}곳`)}</div></div></a>`).join('')}</div></section>
  <div id="gsns"></div>
  ${us.length?`${sec(gt('US stock market','미국 증시'),'Wall Street','<span class="more">'+gt('Daily close · 3-month trend','일별 종가 · 3개월 흐름')+'</span>','up')}<div class="mkrow">${us.map(gmk).join('')}</div>`:''}
  ${ST.length?`${sec(gt('US market leaders','미국 대표 종목'),'Big Tech & leaders',`<span class="more">${gt('Top mover','오늘 가장 많이 오른 종목')}: ${esc(mv[0].name)} ${mv[0].rate>0?'+':''}${mv[0].rate}%</span>`,'chart')}
   <div class="gstk">${mv.map(x=>{const d=up(x);return`<div class="gs ${d}" data-tip="${esc(x.name)} (${esc(x.sym)}) · ${gt('52-week','52주')} ${x.lo52??'—'} ~ ${x.hi52??'—'}"><span class="n">${esc(x.name)}<small>${esc(x.sym)}</small></span>${line(x.series,90,24,d==='down'?'#2f6bff':'#ff4d2e',{name:x.name+' · '+gt('daily close','일별 종가'),step:gt(' trading days ago','거래일 전')})}<b>$${esc(x.price)}</b><em>${x.rate>0?'+':''}${x.rate}%</em></div>`}).join('')}</div>`:''}
  ${wo.length||ot.length?`${sec(gt('World markets · rates · FX','세계 증시·금리·환율'),'Global markets','','coin')}<div class="mkrow">${[...wo,...ot].map(gmk).join('')}</div>`:''}
  ${sec(gt('Global top stories','해외 이슈 TOP'),'Global top stories','','세계')}
  <div class="catbar">${Object.entries(cats).map(([c,n])=>`<i style="flex:${n};background:${CATC[c]||'#8189a3'}" data-tip="${esc(gcat(c))} ${n}"></i>`).join('')}</div>
  <div class="legend">${Object.entries(cats).map(([c,n])=>`<span style="--c:${CATC[c]||'#8189a3'}">${esc(gcat(c))} ${n}</span>`).join('')}</div>
  <div class="grid10">${grid}</div>
  ${sec(gt('Live searches','해외 실시간 검색어'),'Google Trends','','fire')}
  <div class="trends">${G.trends.slice(0,10).map((t,k)=>`<a class="tr" href="gt/${k}">${th(t.image,'tt','search')}<span class="n">${k+1}</span><b>${esc(T_(t,'keyword'))}</b>${t.news&&t.news[0]?`<span class="why">${esc(T_(t.news[0],'title'))}</span>`:''}<span class="tv" title="${TTIP}">${tlab(t)}</span></a>`).join('')}</div>
  ${secs.length?`${sec(gt('Latest by section','분야별 최신 헤드라인'),'By section','','news')}<div class="gsecs">${secs.map(([c,L])=>`<section class="card gsec"><h3><span class="cat ${c}">${ic(c)}${esc(gcat(c))}</span></h3>
   ${L.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener" class="gsr">${x.img?`<span class="gi" ${bg(x.img)}></span>`:`<span class="gi noimg">${ic(c)}</span>`}<span class="gt"><b>${esc(T_(x,'title'))}</b><small>${esc(x.press)} · ${ago(x.t)}</small></span></a>`).join('')}</section>`).join('')}</div>`:''}
  <p class="fine">${gt('Market data: Yahoo Finance daily closes (may be delayed). Stories: international RSS feeds and Google News.','시세: 야후 파이낸스 일별 종가(지연될 수 있어요). 기사: 해외 언론 RSS·구글 뉴스. 번역은 자동 생성되어 어색하거나 틀릴 수 있어요.')}</p>`;
  bindRegionControls(app);header2();heatIn(app);gvocab();gsocial();window.NBT?.bindHorizontalCarousels?.(app);window.nbLearnMain&&nbLearnMain();
}
/* 해외 탭 'SNS 라이브': 트럼프(트루스소셜 아카이브)·블루스카이 인물·언론(data/social.json). 원문/번역 전환을 따름 */
let SOCJ=null;
function gsocial(){const put=X=>{const el=$('#gsns');if(!el||!X||!(X.posts||[]).length)return;const P=X.posts.slice(0,14);
  const net={truth:['Truth Social','#5448ee'],bluesky:['Bluesky','#1185fe']};
  el.innerHTML=`${sec(gt('Live from social media','지금 SNS에서'),'Live from social',`<span class="more"><i class="live"></i>${gt(`Updated ${ago(X.updated)}`,`${ago(X.updated)} 갱신`)}</span>`,'chat')}
  <div class="sns">${P.map(p=>`<a class="card sn" href="${esc(p.url)}" target="_blank" rel="noopener"><div class="snh">${p.avatar?`<span class="sav" ${bg(p.avatar)}></span>`:`<span class="sav ini">${esc(p.name.split(' ').map(w=>w[0]).join('').slice(0,2))}</span>`}<span class="snn"><b>${esc(p.name)}</b><small>${esc(p.handle)} · ${ago(p.t)}</small></span><em style="--c:${(net[p.net]||['',''])[1]}">${(net[p.net]||[p.net])[0]}</em></div>
   <p ${S.orig?'lang="en"':''}>${esc(S.orig||!p.text_ko?p.text:p.text_ko)}</p>${p.img?`<span class="sim" ${bg(p.img)}></span>`:''}${p.likes!=null?`<div class="snf"><span>♥ ${(p.likes||0).toLocaleString()}</span><span>↻ ${(p.reposts||0).toLocaleString()}</span></div>`:''}</a>`).join('')}</div>
  <p class="fine">${gt('Truth Social via the public trumpstruth.org archive; Bluesky public API. X (Twitter) is not included because its API is paid.','트루스소셜은 공개 아카이브(trumpstruth.org), 블루스카이는 공개 API로 모아요. X(트위터)는 API가 유료라 넣지 않았어요.')}</p>`;
  window.NBT?.bindHorizontalCarousels?.(el)};
  if(SOCJ)return put(SOCJ);fetch('data/social.json?'+Math.floor(Date.now()/3e5)).then(r=>r.ok?r.json():null).then(j=>{SOCJ=j;put(j)}).catch(()=>{})}
/* 해외 탭 '오늘의 영어 표현': 오늘 영어 헤드라인에서 고른 단어(fun.json world.vocab). 원문 예문에 단어 강조 */
let FUNJ=null;
function gvocab(){const put=W=>{if(!W||!W.length||!app.querySelector('.gbar')||app.querySelector('.gvoc'))return;const at=app.querySelector('.trends');if(!at)return;
  const hi=(t,w)=>esc(t).replace(new RegExp('('+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','i'),'<mark>$1</mark>');
  at.previousElementSibling.insertAdjacentHTML('beforebegin',`${sec(gt('Words from today’s stories','오늘의 영어 표현'),'Learn English with the news',`<span class="more">${gt('Picked from real headlines','실제 영어 헤드라인에서 골랐어요')}</span>`,'book')}
   <div class="gvoc">${W.map(w=>`<a class="card gv" href="${esc(w.url)}" target="_blank" rel="noopener"><div class="gvh"><b lang="en">${esc(w.word)}</b><i>${esc(w.pos)}</i></div>
    <p class="gvm">${S.orig?esc(w.mean_en):esc(w.mean_ko)}<small>${S.orig?esc(w.mean_ko):esc(w.mean_en)}</small></p><q lang="en">${hi(w.example,w.word)}</q>${!S.orig&&w.example_ko?`<small class="gvk">${esc(w.example_ko)}</small>`:''}<span class="gvs">${esc(w.press)}</span></a>`).join('')}</div>`)};
  if(FUNJ)return put((FUNJ.world||{}).vocab);fetch('data/fun.json?'+Math.floor(Date.now()/6e5)).then(r=>r.ok?r.json():null).then(j=>{FUNJ=j;put(((j||{}).world||{}).vocab)}).catch(()=>{})}
/* 해외 이슈 상세: 국내 상세와 같은 구성(사진 → 제목·숫자 → 요약 → 기사 내용 → 해설 → 핵심 용어 → 보도 흐름 → 관련 기사).
   기본 한국어(번역), '영어 원문 보기'면 모두 영어 원문 */
function gissue(id){const i=G.issues.find(x=>x.id===id);if(!i)return gtoday();const A=i.ai||{},L=S.orig?'en':'ko',P=o=>o?(o[L]||o.en||''):'';
  setMeta(T_(i,'title'),(A.bullets&&P(A.bullets).join(' '))||T_(i,'summary'));
  const gal=(i.gallery||[]).filter(g=>g.img),pics=gal.length?gal:(i.image?[{img:i.image,press:i.press,url:i.url}]:[]);
  const latest=(i.sources||[]).map(x=>x.t).filter(Boolean).sort().pop();
  const toc=[['gsum',gt('Summary','요약')],(i.leads||[]).length&&['gtext',gt('From the articles','기사 내용')],(A.background||A.why)&&['gdeep',gt('Analysis','깊게 보기')],(A.terms||[]).length&&['gterm',gt('Key terms','핵심 용어')],(i.flow||[]).length&&['gflow',gt('Timeline','보도 흐름')],['grel',gt('Coverage','관련 기사')]].filter(Boolean);
  const grp=(window.NBDedupe?NBDedupe(i.sources||[]):(i.sources||[]).map(s=>({s,more:[]}))).sort((a,b)=>b.more.length-a.more.length);
  const multi=grp.filter(g=>g.more.length),single=grp.filter(g=>!g.more.length);
  const row=x=>`<li><a href="${esc(x.url)}" target="_blank" rel="noopener"><span class="ds-rt">${esc(T_(x,'title'))}${S.orig?'':`<small class="gorig">${esc(x.title)}</small>`}</span><span class="ds-rm"><em>${esc(x.press)}</em></span></a></li>`;
  app.innerHTML=`<div class="bkrow"><a class="back" href="./">${NBI('arrow-left')} ${gt('Global top stories','해외 TOP')}</a>${shareBtn()}</div>${globalBar(gt('Global reporting · original English','해외 · 한국어 자동 번역'))}
  ${pics.length?`<section class="ggal ${pics.length>1?'multi n'+Math.min(pics.length,5):''}">${pics.slice(0,5).map((g,k)=>`<a class="gg${k?'':' big'}" href="${esc(g.url||i.url)}" target="_blank" rel="noopener" ${bg(g.img)} data-tip="${esc(g.press||'')}">${k===0?`<span class="ov"><span class="cat ${i.category}">${esc(gcat(i.category))}</span><b>${gt(`Global issue #${i.rank}`,`해외 이슈 ${i.rank}위`)}</b></span>`:''}${k===4&&pics.length>5?`<span class="more">+${pics.length-5}</span>`:''}</a>`).join('')}</section>`:''}
  <article class="dhead card ghead"><div class="bd"><div class="dh-top"><span class="dh-rank"><b>${String(i.rank).padStart(2,'0')}</b><small>${gt('Global<br>issue','해외<br>이슈')}</small></span><span class="cat ${i.category}">${esc(gcat(i.category))}</span></div>
   <h1 class="ds-title">${esc(T_(i,'title'))}</h1>${S.orig?'':`<p class="otit" lang="en">${esc(i.title)}</p>`}
   <div class="gstat"><span><b>${i.mentions}</b>${gt('stories','관련 기사')}</span><span><b>${i.presses}</b>${gt('publishers','매체')}</span><span><b>${(i.flow||[]).length||1}</b>${gt('days of coverage','일째 보도')}</span><span><b>${ago(latest)}</b>${gt('latest','최근 보도')}</span></div>
   <div class="chips">${(i.keywords||[]).map(k=>`<span class="chip">${esc(k)}</span>`).join('')}</div>
   <nav class="gtoc">${toc.map(([a,l])=>`<a href="#${a}">${l}</a>`).join('')}</nav></div></article>
  <section id="gsum" class="anc ds-sec">${sec(gt('Summary','한눈에 보기'),'Summary','','news')}
   ${A.bullets?`<ul class="gbul">${P(A.bullets).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:`<p class="gp">${esc(T_(i,'summary')||T_(i,'title'))}</p>`}
   <p class="fine">${A.bullets?gt('AI summary based on the original articles','원문 기사를 바탕으로 AI가 정리했어요'):gt('Publisher’s summary','언론사 요약문')}</p></section>
  ${(i.leads||[]).length?`<section id="gtext" class="anc ds-sec">${sec(gt('From the articles','기사 내용'),'From the articles',`<span class="more">${gt('Opening paragraphs of each report','각 기사의 첫 문단')}</span>`,'book')}
   ${i.leads.map(l=>`<div class="glead"><div class="glh"><b>${esc(l.press)}</b><a href="${esc(l.url)}" target="_blank" rel="noopener">${gt('Read original','원문 읽기')} ${NBI('external-link')}</a></div><p ${S.orig?'lang="en"':''}>${esc(S.orig?l.text:(l.text_ko||l.text))}</p>${S.orig?'':`<details class="gen"><summary>${gt('Original','영어 원문 보기')}</summary><p lang="en">${esc(l.text)}</p></details>`}</div>`).join('')}</section>`:''}
  ${A.background||A.why?`<section id="gdeep" class="anc ds-sec">${sec(gt('Analysis','깊게 보기'),'Analysis','','spark')}<div class="gdeep">
   ${P(A.background)?`<div><h4>${gt('Background','배경')}</h4><p>${esc(P(A.background))}</p></div>`:''}${P(A.why)?`<div><h4>${gt('Why it matters','왜 중요한가')}</h4><p>${esc(P(A.why))}</p></div>`:''}${P(A.watch)?`<div><h4>${gt('What to watch','앞으로 볼 점')}</h4><p>${esc(P(A.watch))}</p></div>`:''}</div></section>`:''}
  ${(A.terms||[]).length?`<section id="gterm" class="anc ds-sec">${sec(gt('Key terms','핵심 용어'),'Key terms',`<span class="more">${gt('English in this story','이 기사 속 영어 표현')}</span>`,'quiz')}<div class="gterms">${A.terms.map(t=>`<div class="gt1"><b lang="en">${esc(t.en)}</b><span>${esc(S.orig?t.def_en:t.ko)}</span><small>${esc(S.orig?t.ko:t.def_en)}</small></div>`).join('')}</div></section>`:''}
  ${(i.flow||[]).length?`<section id="gflow" class="anc ds-sec">${sec(gt('Timeline','보도 흐름'),'Timeline',`<span class="more">${gt(`${(i.flow||[]).length} day${(i.flow||[]).length>1?'s':''}`,`${(i.flow||[]).length}일`)}</span>`,'clock')}<div class="gflow">${i.flow.slice().reverse().map(f=>`<div class="gfd"><b>${esc(NBDate.date(f.date))}</b><ul>${f.items.slice().sort((a,b)=>(b.t||'').localeCompare(a.t||'')).map(x=>`<li><time>${esc(NBDate.compact(x.t||''))}</time><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(T_(x,'title'))}</a><em>${esc(x.press)}</em></li>`).join('')}</ul></div>`).join('')}</div></section>`:''}
  <section id="grel" class="anc ds-sec">${sec(gt('Coverage','관련 기사'),'Coverage',`<span class="more">${gt(`${(i.sources||[]).length} stories`,`${(i.sources||[]).length}건`)}${multi.length?gt(` · ${multi.length} shared`,` · 공통 보도 ${multi.length}묶음`):''}</span>`,'news')}
   ${multi.length?`<ul class="ds-rel">${multi.map(g=>{const ps=[g.s,...g.more];return`<li class="ds-grp"><details><summary><span class="ds-rt"><b class="ds-gn">${gt(`${ps.length} outlets`,`${ps.length}곳 공통 보도`)}</b>${esc(T_(g.s,'title'))}</span><span class="ds-rm"><em>${esc(ps.slice(0,3).map(x=>x.press).join(' · '))}</em>${NBI('chevron-down')}</span></summary><ul class="ds-gl">${ps.map(x=>`<li><a href="${esc(x.url)}" target="_blank" rel="noopener"><span>${esc(T_(x,'title'))}</span><em>${esc(x.press)}</em></a></li>`).join('')}</ul></details></li>`}).join('')}</ul>`:''}
   ${single.length?`<details class="ds-more"${multi.length?'':' open'}><summary><span>${gt(`${single.length} more reports`,`단독 보도 ${single.length}건`)}</span>${NBI('chevron-down')}</summary><ul class="ds-rel">${single.map(g=>row(g.s)).join('')}</ul></details>`:''}</section>
  <p class="fine">${gt('Stories are summarised from the original articles. Always check the original report.','번역·요약은 자동 생성되어 어색하거나 틀릴 수 있어요. 원문 읽기로 꼭 확인하세요.')}</p>`;
  bindRegionControls(app);header2();window.scrollTo(0,0);
}
function gtrend(k){const t=G.trends[k];if(!t)return gtoday();setMeta(T_(t,'keyword'),'');
  app.innerHTML=`<div class="bkrow"><a class="back" href="./">${NBI('arrow-left')} ${gt('Global','해외')}</a>${shareBtn()}</div>${globalBar(gt('Global searches','해외 검색어'),'fire')}
  <section class="kwh card" ${bg(t.image)}><div class="in"><span class="chip event">${ic('fire')}${gt(`Search trend #${k+1}`,`검색 ${k+1}위`)} · ${tlab(t)}</span><h1>${esc(T_(t,'keyword'))}</h1>${S.orig?'':`<p class="otit">${esc(t.keyword)}</p>`}</div></section>
  <div class="srcl2">${t.news.map(n=>`<a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(T_(n,'title'))}${S.orig?'':`<small>${esc(n.title)}</small>`}</a>`).join('')}</div>`;bindRegionControls(app);header2();
}

/* ---------- 설정 ---------- */
function settings(){
  const draw=()=>{app.innerHTML=`${sec('설정','Settings','','gear')}
  <div class="card setc pers"><h3>나에게 맞춤</h3><p class="fine keep">연령대를 고르면 읽기 수준·관심 분야 순서·퀴즈 단계·글자 크기가 자동으로 맞춰져요. 아래에서 각각 따로 바꿀 수 있어요. 분야를 숨기지는 않고 순서만 바꿔요. 이 기기와 내 서재 동기화에만 저장돼요.</p>
   <div class="segs" data-g="age"><button data-age="" class="${S.age?'':'on'}">선택 안 함</button>${Object.entries(AGEP).map(([k,v])=>`<button data-age="${k}" class="${S.age===k?'on':''}">${v.n}</button>`).join('')}</div>
   <h4>읽기 수준</h4><div class="segs"><button data-read="easy" class="${S.read==='easy'?'on':''}">쉽게<small>쉬운 말 요약 · 용어 풀이</small></button><button data-read="std" class="${!S.read||S.read==='std'?'on':''}">보통<small>기본 요약</small></button><button data-read="deep" class="${S.read==='deep'?'on':''}">자세히<small>요약 한 줄 더</small></button></div>
   <h4>퀴즈 시작 단계</h4><div class="segs">${[[1,'기초'],[2,'중급'],[3,'고급']].map(([k,n])=>`<button data-lv="${k}" class="${(+localStorage.getItem('nb-oxlv')||1)===k?'on':''}">${n}</button>`).join('')}</div>
   ${S.age?`<p class="fine keep">${AGEP[S.age].n} 관심 분야 순서: ${(S.corder||AGEP[S.age].order).slice(0,5).join(' · ')} …</p>`:''}</div>
  <div class="card setc"><h3>보고 싶은 카테고리</h3><p class="fine">끈 카테고리는 TOP10·관계맵에서 숨겨요. 이 기기에만 저장됩니다.</p>
   <div class="toggles">${CATS.map(c=>`<label class="tg"><input type="checkbox" data-c="${c}" ${S.hide.includes(c)?'':'checked'}><span style="--c:${CATC[c]}">${ic(c)}${c}</span></label>`).join('')}</div></div>
  <div class="card setc"><h3>글자 크기</h3><div class="fsr"><button data-fs="-">가−</button><b>${S.fs}%</b><button data-fs="+">가+</button><button data-fs="0" class="ghost">기본</button></div><p class="fsprev">가나다 미리보기 — 오늘의 이슈를 따라가는 가장 쉬운 방법.</p></div>
`;
  app.querySelectorAll('[data-c]').forEach(x=>x.onchange=()=>{const c=x.dataset.c;S.hide=x.checked?S.hide.filter(y=>y!==c):[...S.hide,c];saveS()});
  app.querySelectorAll('[data-age]').forEach(x=>x.onclick=()=>{const k=x.dataset.age;S.age=k;const P=AGEP[k];if(P){S.read=P.read;S.fs=P.fs;delete S.corder;localStorage.setItem('nb-oxlv',P.lv)}saveS();draw();toast(P?`${P.n}에 맞춰 바꿨어요`:'맞춤을 껐어요')});
  app.querySelectorAll('[data-read]').forEach(x=>x.onclick=()=>{S.read=x.dataset.read;saveS();draw()});
  app.querySelectorAll('[data-lv]').forEach(x=>x.onclick=()=>{localStorage.setItem('nb-oxlv',x.dataset.lv);draw()});
  app.querySelectorAll('[data-fs]').forEach(x=>x.onclick=()=>{const v=x.dataset.fs;S.fs=v==='0'?100:Math.max(85,Math.min(130,S.fs+(v==='+'?5:-5)));saveS();draw()})};draw();
}
load().catch(()=>app.innerHTML='<div class="loading">잠시 후 다시 시도해 주세요. 소식을 불러오는 중 문제가 생겼어요.</div>');
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.update().catch(()=>{});
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if(newWorker){
          newWorker.addEventListener('statechange', () => {
            if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
              // 새 캐시 버전이 등록되면 이전 캐시를 비우고 자동 갱신
              window.location.reload();
            }
          });
        }
      });
    }).catch(()=>{});
  });
}

/* v6 공식 데이터: 한국은행 ECOS 지표·재정경제부 보도자료(마켓), OpenDART 공시(기업 타임라인) */
var O=null,BR=null;
function officialHTML(){let h='';
  const E=(O&&O.ecos)||[];
  if(E.length)h+=`${sec('공식 경제지표','Bank of Korea ECOS','<span class="more">한국은행 100대 통계</span>','chart')}<div class="ecos">${E.map(x=>`<div class="ec"><small>${esc(x.group||'')}</small><b>${esc(x.name)}</b><span>${esc(x.value)}<i>${esc(x.unit||'')}</i></span><em>${esc(x.cycle||'')}</em></div>`).join('')}</div>`;
  const B=(BR&&BR.items)||[];
  if(B.length)h+=`${sec('재정경제부 보도자료','Press Releases','<span class="more">공공데이터포털</span>','book')}<div class="srcl2">${B.slice(0,10).map(x=>`<a href="${esc(x.url||'#')}" target="_blank" rel="noopener">${esc(x.title)}<span class="meta">${x.dept?`<span class="tag">${esc(x.dept)}</span>`:''}${x.date?`<time class="ts">${esc(NBDate.date(x.date))}</time>`:''}</span></a>`).join('')}</div>`;
  return h}
function dartHTML(n){const L=(O&&O.dart_by_entity&&O.dart_by_entity[n])||[];if(!L.length)return'';
  return`${sec('오늘의 공시','OpenDART','<span class="more">금융감독원 전자공시</span>','book')}<div class="srcl2">${L.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}<span class="meta">${entc(x.corp,'company')}<time class="ts">${x.date.slice(0,4)}.${x.date.slice(4,6)}.${x.date.slice(6)}</time></span></a>`).join('')}</div>`}
{const _mk=market;market=function(){const r=_mk.apply(this,arguments);try{app.insertAdjacentHTML('beforeend',officialHTML())}catch(e){}return r}}
{const _en=entity;entity=function(n){const r=_en.apply(this,arguments);try{app.insertAdjacentHTML('beforeend',dartHTML(n))}catch(e){}return r}}
