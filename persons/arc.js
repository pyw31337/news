/* NewsBoard 인물 아카이브 — 목록(/persons/), 인물(?id=), 관계도(?graph=) */
const $=s=>document.querySelector(s),app=$('#app'),API='https://newsboard-sync.pyw213.workers.dev/archive/';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PC={'더불어민주당':'#1f5bd8','국민의힘':'#e5243b','조국혁신당':'#0a7cc1','개혁신당':'#ff7a00','진보당':'#d6001c','기본소득당':'#00b6b0','사회민주당':'#f2a900','무소속':'#8189a3'};
const pc=p=>PC[p]||(/민주/.test(p||'')?'#2b5fbf':/한나라|새누리|자유한국|미래통합|신한국|민자|민정/.test(p||'')?'#d63a4a':'#6b7390');
const fmt=n=>(n||0).toLocaleString();
const j=async u=>{const r=await fetch(API+u);if(!r.ok)throw r.status;return r.json()};
const ph=(u,n,c,cls='')=>`<div class="aph ${cls}" style="--pc:${c}">${u?`<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">`:''}<span>${esc((n||'?').slice(0,1))}</span></div>`;
const TYP={birth:['출생','#8b6cf0','confetti'],edu:['학업','#2a9d8f','school'],career:['경력','#5b7fa6','building'],election:['선거','#1f5bd8','circle-check'],office:['공직','#3b5bdb','star-f'],party:['정당','#f08c00','repeat'],award:['수상','#e0a800','trophy'],family:['가족','#d6336c','heart-f'],assets:['재산','#2f9e44','currency-won'],allegation:['의혹·사건','#e03131','alert-triangle'],ruling:['판결','#862e9c','landmark'],news:['보도','#868e96','news']};
const STAGES=['출생·성장','학업','사회 경력','정치 활동','재산','논란·사법','언론 보도'];
const REL={parent:['부모·자녀','#d6336c'],spouse:['배우자','#e64980'],sibling:['형제자매','#f06595'],relative:['친척','#f783ac'],schoolmate:['학교 동문','#2a9d8f'],hometown:['같은 출생지','#f08c00'],predecessor:['지역구 전·후임','#3b5bdb']};
const yr=d=>(d||'').slice(0,4);
const ago=b=>b?new Date().getFullYear()-+b.slice(0,4):null;

async function list(){
  document.title='인물 아카이브 · NewsBoard';
  const [P,S,T]=await Promise.all([j('people?n=60'),j('stats').catch(()=>({})),j('onthisday').catch(()=>[])]);
  const md=new Date(Date.now()+9*36e5).toISOString().slice(5,10).replace('-','월 ')+'일';
  app.innerHTML=`<section class="ahero"><small>Person Archive</small><h1>인물 아카이브</h1><p>한 사람의 일생을 사건으로 잇고, 누구와 어떻게 연결됐는지 한눈에 보여줘요.</p>
  <div class="astat"><div><b>${fmt(S.persons)}</b><span>정리된 인물</span></div><div><b>${fmt(S.events)}</b><span>쌓인 사건</span></div><div><b>${fmt(S.edges)}</b><span>찾아낸 관계</span></div></div>
  <div class="asrch"><input id="aq" type="search" placeholder="이름으로 찾기 (예: 김병기)" autocomplete="off"></div></section>
  ${T.length?`<section class="asec"><h2><small>On This Day</small>${md}, 이날의 인물사</h2><div class="otd">${T.slice(0,8).map(e=>`<a href="persons/?id=${e.pid}" class="otdc"><em>${yr(e.d)}</em><b>${esc(e.name)}</b><span>${esc(e.title)}</span></a>`).join('')}</div></section>`:''}
  <section class="asec"><h2><small>Most Watched</small>요즘 주목받는 인물</h2><div class="agrid" id="agrid">${cards(P)}</div></section>`;
  let t;$('#aq').oninput=e=>{clearTimeout(t);t=setTimeout(async()=>{const u=$('#updated');if(u)u.textContent='매일 새벽 갱신';const q=e.target.value.trim();$('#agrid').innerHTML=cards(q?await j('people?q='+encodeURIComponent(q)):P)||'<p class="mute">아직 정리되지 않은 인물이에요. 매일 새 인물이 추가돼요.</p>'},250)};
}
const cards=L=>L.map(p=>`<a class="acard" href="persons/?id=${p.id}">${ph(p.photo,p.name,pc(p.party))}<div><b>${esc(p.name)}</b><span style="color:${pc(p.party)}">${esc(p.party||'')}</span><em><i>사건 ${fmt(p.ev)}</i><i>관계 ${fmt(p.ed)}</i></em></div></a>`).join('');

async function person(id){
  const [p,g]=await Promise.all([j('person/'+encodeURIComponent(id)),j('graph/'+encodeURIComponent(id)).catch(()=>null)]);
  document.title=p.name+' 인물 아카이브 · NewsBoard';
  fetch('https://raw.githubusercontent.com/pyw31337/news/history/h/index.json').then(r=>r.json()).then(X=>{const v=X['a'+id],el=document.getElementById('abb');if(!el)return;if(v&&v.c)el.querySelector('small').textContent=`${v.y[0]}년부터 ${v.c.toLocaleString()}건의 기록`;else el.querySelector('small').textContent='기록을 모으는 중이에요'}).catch(()=>{});
  const d=p.data||{},E=p.events||[],c=pc(p.party);
  const types=[...new Set(E.map(e=>e.typ))];
  const undated=E.filter(e=>!e.d),dated=E.filter(e=>e.d);
  app.innerHTML=`<a class="back" href="persons/">← 인물 아카이브</a><a class="abb" id="abb" href="history/?t=p&id=a${encodeURIComponent(id)}">${window.NBI?NBI('message-report'):''}<span>블랙박스</span><small>과거 발언·행적 보기</small></a>
  <section class="aprof" style="--pc:${c}">${ph(d.photo,p.name,c,'big')}<div><small>${esc(d.hanja||'')}</small><h1>${esc(p.name)}</h1>
   <p class="ameta"><i style="background:${c}"></i>${esc(p.party||'')}${p.birth?` · ${p.birth.slice(0,4)}년생`:''}${d.ages?.length?` · ${d.ages.map(a=>a+'대').join('·')} 국회의원`:''}</p>
   <div class="achips"><a href="politicians/?id=${p.id}" class="chip">의정 활동 자세히</a><a href="#graph" class="chip">관계도 보기</a></div></div></section>
  ${d.wiki?`<section class="awiki"><p>${esc(d.wiki.text)}</p><small>출처: <a href="${esc(d.wiki.url)}" target="_blank" rel="noopener">한국어 위키백과 「${esc(d.wiki.title)}」</a> · ${esc(d.wiki.license)}</small></section>`:''}
  <section class="asec"><h2><small>Life Timeline</small>일생 타임라인 <em class="cnt">${fmt(E.length)}건</em></h2>
   <div class="legend"><span><i class="st fact"></i>확인된 기록</span><span><i class="st allegation"></i>의혹·보도 단계(사실 확정 아님)</span><span><i class="st confirmed"></i>판결 확정</span></div>
   <div class="afil" id="fil"><button class="on" data-t="">전체</button>${types.map(t=>`<button data-t="${t}" style="--tc:${TYP[t]?.[1]}">${TYP[t]?.[0]||t} ${E.filter(e=>e.typ===t).length}</button>`).join('')}</div>
   <div id="tl"></div></section>
  <section class="asec" id="graph"><h2><small>Relationship Map</small>관계도</h2><div id="gbox"></div></section>
  <p class="anote">공인의 공적 활동만 다뤄요. 주소·연락처는 모으지 않고, 미성년자는 넣지 않아요. 각 항목의 출처를 눌러 원문을 확인하세요.</p>`;
  const draw=t=>{const L=dated.filter(e=>!t||e.typ===t);const byS={};L.forEach(e=>(byS[e.stage]=byS[e.stage]||[]).push(e));
    $('#tl').innerHTML=STAGES.filter(s=>byS[s]).map(s=>`<div class="stage"><h3>${s}<span>${yr(byS[s][0].d)}${byS[s].length>1&&yr(byS[s].at(-1).d)!==yr(byS[s][0].d)?'–'+yr(byS[s].at(-1).d):''}</span></h3><ol>${(s==='언론 보도'?byS[s].slice().reverse():byS[s]).map(ev).join('')}</ol></div>`).join('')||'<p class="mute">해당하는 기록이 없어요.</p>'};
  draw('');$('#fil').onclick=e=>{const b=e.target.closest('button');if(!b)return;$('#fil .on')?.classList.remove('on');b.classList.add('on');draw(b.dataset.t)};
  $('#gbox').innerHTML=g&&g.edges.length?graph(g):'<p class="mute">아직 확인된 관계가 없어요. 자료가 쌓이면 자동으로 채워져요.</p>';
  bindGraph();
}
const ev=e=>{const t=TYP[e.typ]||['기타','#888','•'];const age=null;let x={};try{x=JSON.parse(e.extra||'{}')||{}}catch(_){}
  return `<li class="ev ${e.status}" style="--tc:${t[1]}"><span class="dot">${typeof NBI==='function'?NBI(t[2]):''}</span><div><time>${esc((e.d||'').replace(/-/g,'.'))}</time><b>${esc(e.title)}</b>
  <small>${e.status==='allegation'?`<em class="tag al">${esc(x.stage||'의혹')} 단계 · 확정 아님</em>`:e.status==='confirmed'?'<em class="tag cf">확정</em>':e.status==='report'?'<em class="tag rp">보도</em>':''}${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.src||'출처')}</a>`:esc(e.src||'')}</small></div></li>`};

function graph(g){
  const W=720,H=560,cx=W/2,cy=H/2,N={};g.nodes.forEach(n=>N[n.id]=n);
  const C=g.center,direct=[],second=[];const ds=new Set();
  g.edges.forEach(e=>{const o=e.a===C?e.b:e.b===C?e.a:null;if(o&&!ds.has(o)){ds.add(o);direct.push([o,e])}});
  g.edges.forEach(e=>{if(e.a!==C&&e.b!==C){for(const[o,p] of [[e.a,e.b],[e.b,e.a]])if(ds.has(p)&&!ds.has(o)&&o!==C&&!second.some(s=>s[0]===o))second.push([o,e,p])}});
  const ord=Object.keys(REL);direct.sort((a,b)=>ord.indexOf(a[1].typ)-ord.indexOf(b[1].typ));
  const pos={[C]:[cx,cy]};const R1=Math.max(130,Math.min(210,70+direct.length*9));
  direct.forEach(([o],i)=>{const a=-Math.PI/2+i*2*Math.PI/Math.max(direct.length,1);pos[o]=[cx+R1*Math.cos(a),cy+R1*Math.sin(a)]});
  const sec=second.slice(0,24),grp={};sec.forEach(s=>{const L=(grp[s[2]]=grp[s[2]]||[]);if(L.length<5)L.push(s[0])});
  Object.entries(grp).forEach(([p,L])=>{const[px,py]=pos[p];const base=Math.atan2(py-cy,px-cx),spread=Math.min(2.2,0.55*(L.length-1));
    L.forEach((o,i)=>{const a=base+(L.length>1?-spread/2+spread*i/(L.length-1):0),r=110+(i%2)*45;pos[o]=[px+r*Math.cos(a),py+r*Math.sin(a)]})});
  const show=new Set(Object.keys(pos));
  const lines=g.edges.filter(e=>show.has(e.a)&&show.has(e.b)).map(e=>{const[a,b]=[pos[e.a],pos[e.b]];const r=REL[e.typ]||['관계','#999'];const prim=e.a===C||e.b===C;
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${r[1]}" stroke-width="${prim?2.4:1.2}" opacity="${prim?.9:.45}" ${e.typ==='schoolmate'||e.typ==='hometown'?'stroke-dasharray="5 4"':''}><title>${esc(e.label||r[0])} · 출처 ${esc(e.src||'')}</title></line>`}).join('');
  const nd=[...show].map(id=>{const n=N[id]||{name:'?'};const[x,y]=pos[id];const c=id===C,r=c?34:ds.has(id)?22:15;const col=n.party?pc(n.party):'#9aa3b5';const link=id.startsWith('wd:')?'':`href="persons/?id=${id}"`;
    return `<a ${link} class="gn ${c?'c':''}" data-id="${esc(id)}"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${col}" stroke-width="${c?4:2.5}"/>${n.photo?`<clipPath id="cp${esc(id).replace(/\W/g,'')}"><circle cx="${x}" cy="${y}" r="${r-2}"/></clipPath><image href="${esc(n.photo)}" x="${x-r}" y="${y-r}" width="${2*r}" height="${2*r}" clip-path="url(#cp${esc(id).replace(/\W/g,'')})" preserveAspectRatio="xMidYMin slice"/>`:`<text x="${x}" y="${y+5}" text-anchor="middle" class="gi">${esc((n.name||'?')[0])}</text>`}<text x="${x}" y="${y+r+15}" text-anchor="middle" class="gl">${esc(n.name||'')}</text></a>`}).join('');
  const xs=Object.values(pos).map(p=>p[0]),ys=Object.values(pos).map(p=>p[1]);const mx=Math.min(...xs)-60,my=Math.min(...ys)-50,vw=Math.max(...xs)-mx+60,vh=Math.max(...ys)-my+70;const vb=`${mx} ${my} ${vw} ${vh}`;
  const used=[...new Set(g.edges.filter(e=>show.has(e.a)&&show.has(e.b)).map(e=>e.typ))];
  const rows=direct.map(([o,e])=>{const n=N[o]||{};const r=REL[e.typ]||['관계','#999'];return `<li style="--rc:${r[1]}"><i></i><b>${o.startsWith('wd:')?esc(n.name):`<a href="persons/?id=${o}">${esc(n.name)}</a>`}</b><span>${esc(e.label||r[0])}</span><small>${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.src)}</a>`:esc(e.src||'')}${e.conf<0.8?' · 추정':''}</small></li>`}).join('');
  return `<div class="glegend">${used.map(t=>`<span style="--rc:${REL[t]?.[1]}"><i></i>${REL[t]?.[0]||t}</span>`).join('')}</div>
  <div class="gwrap"><svg viewBox="${vb}" class="gsvg" role="img" aria-label="관계도">${lines}${nd}</svg></div>
  <ul class="glist">${rows}</ul><p class="anote">점선은 같은 학교·같은 출생지처럼 배경이 겹치는 관계예요. 실제로 친분이 있다는 뜻은 아니에요.</p>`;
}
function bindGraph(){}

(async()=>{const u=$('#updated');if(u)u.textContent='매일 새벽 갱신';const q=new URLSearchParams(location.search);try{const id=q.get('id')||q.get('graph');if(!id&&location.hash==='#graph'){const t=await j('people?n=1');if(t[0]){location.replace('persons/?graph='+t[0].id);return}}if(id){await person(id);if(q.get('graph'))$('#graph')?.scrollIntoView()}else await list()}
 catch(e){app.innerHTML='<div class="note">잠시 후 다시 열어 주세요. <a href="persons/">인물 아카이브로</a></div>'}})();
