/* NewsBoard 정치인 DB · 지방 선출직(중앙선거관리위원회 당선인 정보) — 시·도지사, 구·시·군의 장, 지방의원, 교육감 */
(function(){
const EL=[['20260603','제9회 지방선거 (2026.6.3)'],['20220601','제8회 지방선거 (2022.6.1)'],['20180613','제7회 지방선거 (2018.6.13)']];
const C={};let SG='20260603',TY='3',QQ='';
const e_=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const get=sg=>C[sg]||(C[sg]=fetch('data/gov/winners_'+sg+'.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null));
const TYS=[['3','시·도지사'],['4','구·시·군의 장'],['11','교육감'],['5','시·도의원'],['6','구·시·군의원'],['8','광역의원(비례)'],['9','기초의원(비례)']];
const pcol=p=>(typeof pc==='function'?pc(p):'#6b7390');
async function draw(){const box=document.getElementById('localdb');if(!box)return;const W=await get(SG);if(!W){box.remove();return}
  const R=W.rows.map(r=>({name:r[0],party:r[1],type:r[2],sd:r[3],sgg:r[4],wiw:r[5],birth:r[6],gender:r[7],rate:r[8],career:r[9]}));
  const tn=TYS.find(t=>t[0]===TY)[1],L=R.filter(r=>r.type===tn);
  const byP={};L.forEach(r=>byP[r.party||'무소속']=(byP[r.party||'무소속']||0)+1);const pe=Object.entries(byP).sort((a,b)=>b[1]-a[1]);
  const q=QQ.trim(),F=q?R.filter(r=>[r.name,r.party,r.sd,r.sgg,r.wiw,r.type].join(' ').includes(q)):L;
  const cnt={};R.forEach(r=>cnt[r.type]=(cnt[r.type]||0)+1);
  const age=b=>b&&b.length===8?(+SG.slice(0,4)-+b.slice(0,4)):'';
  box.innerHTML=`<div class="sec"><h2><small>Local Officials</small>지방 선출직 당선인</h2></div>
  <p class="fine" style="margin:-4px 0 10px">지방선거는 4년마다 우리 동네의 시장·도지사, 구청장·군수, 지방의원, 교육감을 함께 뽑는 선거예요. 국회의원이 나라의 법을 만든다면, 이분들은 <b>우리 지역의 예산과 생활 행정</b>을 맡아요.</p>
  <div class="filters"><select id="lsg" aria-label="선거">${EL.map(([k,t])=>`<option value="${k}"${k===SG?' selected':''}>${t}</option>`).join('')}</select>
   <input id="lq" type="search" placeholder="이름·지역·정당으로 전체 검색" value="${e_(QQ)}" aria-label="지방 선출직 검색"></div>
  <div class="seg lseg">${TYS.map(([k,t])=>`<button data-lt="${k}" class="${k===TY?'on':''}">${t} <b>${(cnt[t]||0).toLocaleString()}</b></button>`).join('')}</div>
  ${q?'':`<div class="card pad"><div class="seat">${pe.map(([k,v])=>`<i style="flex:${v};background:${pcol(k)}" title="${e_(k)} ${v}"></i>`).join('')}</div><div class="legend">${pe.map(([k,v])=>`<span><i style="background:${pcol(k)}"></i>${e_(k)} <b>${v}</b></span>`).join('')}</div></div>`}
  <div class="plist">${F.slice(0,200).map(r=>`<div class="prow"><div class="pph" style="--pc:${pcol(r.party)}"><span>${e_(r.name.slice(0,1))}</span></div><div><b>${e_(r.name)}<small>${e_(r.type)}</small></b><span><i style="background:${pcol(r.party)}"></i>${e_(r.party||'무소속')} · ${e_([r.sd,r.wiw&&r.wiw!==r.sgg?r.wiw:'',r.sgg!==r.sd?r.sgg:''].filter(Boolean).join(' '))}</span><em>${age(r.birth)?age(r.birth)+'세 · ':''}${r.rate?'득표율 '+e_(r.rate)+'%':''}${r.career?' · '+e_(r.career):''}</em></div></div>`).join('')||'<div class="note">찾는 당선인이 없어요.</div>'}</div>
  ${F.length>200?`<p class="fine">${F.length.toLocaleString()}명 중 200명만 보여요. 검색으로 좁혀 보세요.</p>`:''}
  <p class="fine">출처: 중앙선거관리위원회 당선인 정보(공공데이터포털). 나이는 선거일 기준, 비례대표는 득표율이 비어 있어요.</p>`;
  box.querySelector('#lsg').onchange=e=>{SG=e.target.value;draw()};
  let t;box.querySelector('#lq').oninput=e=>{QQ=e.target.value;clearTimeout(t);t=setTimeout(()=>{draw().then(()=>{const i=document.getElementById('lq');i.focus();i.setSelectionRange(QQ.length,QQ.length)})},250)};
  box.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>{TY=b.dataset.lt;QQ='';draw()})}
const o=window.list;if(typeof o==='function')window.list=function(){const r=o.apply(this,arguments);const app=document.getElementById('app');if(app&&!document.getElementById('localdb')){app.insertAdjacentHTML('beforeend','<section id="localdb"></section>');draw()}return r};
if(!new URLSearchParams(location.search).get('id')){const t=setInterval(()=>{if(document.getElementById('plist')&&!document.getElementById('localdb')){document.getElementById('app').insertAdjacentHTML('beforeend','<section id="localdb"></section>');draw()}if(document.getElementById('localdb'))clearInterval(t)},300);setTimeout(()=>clearInterval(t),15000)}
})();
