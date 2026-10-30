/* 민심·영상: 이슈 상세 블록 + 허브(/voice) */
(()=>{let V=null;const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BP=(typeof BASEP!=='undefined'?BASEP:'/news/');
const SRC={blog:['네이버 블로그','#03c75a'],cafe:['네이버 카페','#03a94f'],tistory:['티스토리','#ff5a4a'],daumblog:['다음 블로그','#2b6cff'],daumcafe:['다음 카페','#2b6cff']};
/* 플랫폼은 글자 대신 공식 아이콘(assets/platforms), 마우스를 올리면 이름 말풍선 */
const plat=(k,n)=>{const s=SRC[k]||[k||'글'];return`<span class="plat" data-tip="${E(s[0])}${n!=null?' '+n+'개':''}" aria-label="${E(s[0])}">${SRC[k]?`<img src="assets/platforms/${k}.webp" alt="" width="20" height="20">`:E(s[0][0])}${n!=null?`<b>${n}</b>`:''}</span>`};
const PF={youtube:['YouTube'],shorts:['Shorts'],kakaotv:['카카오TV'],naver:['네이버TV'],vimeo:['Vimeo'],etc:['영상']};
const fmtV=n=>n>=1e8?(n/1e8).toFixed(1)+'억':n>=1e4?(n/1e4).toFixed(n>=1e5?0:1)+'만':n>=1e3?(n/1e3).toFixed(1)+'천':String(n||0);
const agoT=t=>{if(!t)return'';const m=(Date.now()-new Date(t))/6e4;return m<60?Math.max(1,m|0)+'분 전':m<1440?(m/60|0)+'시간 전':(m/1440|0)+'일 전'};
const sent=r=>(r.ai&&r.ai.sent)||r.sent;
function gauge(s,big){const tot=s.pos+s.neu+s.neg||1,R=big?70:46,W=big?14:10,cx=R+W,cy=R+W,L=Math.PI*R;let off=0;
  const seg=(v,c,nm)=>{const l=L*v/tot,d=`<path d="M${cx-R} ${cy}A${R} ${R} 0 0 1 ${cx+R} ${cy}" fill="none" stroke="${c}" stroke-width="${W}" stroke-dasharray="${l} ${L}" stroke-dashoffset="${-off}"><title>${nm} 글 ${v}% · 블로그·카페 글의 분위기를 AI·사전으로 판별한 비율</title></path>`;off+=l;return d};
  const lead=s.neg>=s.pos&&s.neg>=s.neu?['부정적','var(--ds-up)',s.neg]:s.pos>=s.neu?['긍정적','var(--ds-green)',s.pos]:['중립적','var(--ds-mute)',s.neu];
  return`<div class="vg ${big?'big':''}"><svg viewBox="0 0 ${2*cx} ${cy+6}">${seg(s.pos,'var(--ds-green)','긍정적')}${seg(s.neu,'var(--ds-line)','중립적')}${seg(s.neg,'var(--ds-up)','부정적')}</svg><div class="vgl"><b style="color:${lead[1]}">${lead[2]}%</b><span>${lead[0]}</span></div></div>`}
function trend(tr){if(!tr||tr.length<2)return'<p class="vfine">분위기 변화는 몇 시간 더 모이면 그래프로 보여드려요.</p>';const w=300,h=70,n=tr.length,x=k=>k/(n-1)*w;
  const ar=(f,c)=>`<path d="M0 ${h} ${tr.map((p,k)=>`L${x(k).toFixed(1)} ${(h-f(p)/100*h).toFixed(1)}`).join(' ')} L${w} ${h}Z" fill="${c}"/>`;
  const tips=tr.map(p=>`${String(p[0]).replace('-','/')}시 · 긍정 ${p[1]}% · 중립 ${p[2]}% · 부정 ${p[3]}%`);
  return`<svg class="vtr" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" data-series="${tr.map(p=>p[1]+p[2]+p[3]).join(',')}" data-tips='${E(JSON.stringify(tips))}'>${ar(p=>p[1]+p[2]+p[3],'var(--ds-up)')}${ar(p=>p[1]+p[2],'var(--ds-line)')}${ar(p=>p[1],'var(--ds-green)')}</svg><div class="vtrx"><span>${E(tr[0][0].replace('-','/'))}시</span><span>지금</span></div>`}
function cloud(ws){if(!ws||!ws.length)return'';const mx=ws[0][1];return`<div class="vcloud">${ws.slice(0,18).map(([w,v],k)=>`<span class="c${k%4}" style="font-size:${(.78+v/mx*.85).toFixed(2)}rem">${E(w)}</span>`).join('')}</div>`}
function quotes(r,n){const P=r.posts||[];const pick=((r.ai&&r.ai.quotes)||[]).map(q=>P[q]).filter(Boolean);const L=pick.concat(P.filter(p=>p.s!==0),P).filter((p,k,a)=>a.indexOf(p)===k).slice(0,n);
  return`<div class="vq">${L.map(p=>{return`<a class="vqc ${p.s>0?'pos':p.s<0?'neg':''}" href="${E(p.url)}" target="_blank" rel="noopener">${plat(p.src)}<q>${E(p.q)}</q><small>원문 보기 ${NBI('external-link')}</small></a>`}).join('')}</div>`}
function vcards(vs){if(!vs||!vs.length)return'<p class="vfine keep">아직 이 사건을 다룬 영상을 찾지 못했어요.</p>';
  return`<div class="vvg">${vs.map(v=>{const p=PF[v.pf]||PF.etc;return`<a class="vv" href="${E(v.url)}" target="_blank" rel="noopener"><div class="vvt" style="background-image:url('${E(v.thumb||'')}')"><span class="vpf">${NBI(v.pf==='youtube'||v.pf==='shorts'?'brand-youtube':'video')} ${p[0]}</span>${v.views?`<span class="vvw">${NBI('chart-bar')} ${fmtV(v.views)}회</span>`:''}</div>
   <div class="vvb"><h5>${E(v.title)}</h5><div class="vch"><b>${E(v.ch)}</b>${v.t?`<span>${agoT(v.t)}</span>`:''}</div>${(v.sum||[]).length?`<ol>${v.sum.map(s=>`<li>${E(s)}</li>`).join('')}</ol>`:''}</div></a>`}).join('')}</div>`}
window.NBVoice={gauge,vcards,quotes};
function block(r){const s=sent(r),a=r.ai||{};const col=['var(--ds-brand)','var(--ds-blue)','var(--ds-green)','var(--ds-violet)'];
  return`<section class="vblk anc ds-sec" id="s-voice"><div class="vh"><h2><small>Voices · 블로그·카페</small>민심</h2><span class="vbadge">글 ${r.n}개 분석</span></div>
  <div class="card vcard"><div class="vtop">${gauge(s,1)}<div class="vtx">${a.mood?`<span class="vmood">지금 분위기 · <b>${E(a.mood)}</b></span>`:''}${a.summary?`<p>${E(a.summary)}</p>`:'<p>블로그·카페 글에 자주 나온 말로 분위기를 짐작했어요.</p>'}
   <div class="vleg"><i style="--c:var(--ds-green)">긍정 ${s.pos}%</i><i style="--c:var(--ds-mute)">중립 ${s.neu}%</i><i style="--c:var(--ds-up)">부정 ${s.neg}%</i></div>
   <div class="vsrc">${Object.entries(r.by||{}).map(([k,n])=>plat(k,n)).join('')}</div></div></div>
   ${(a.stances||[]).length?`<h5>사람들의 입장</h5><div class="vst">${a.stances.map((x,k)=>`<i style="flex:${x.share};background:${col[k%4]}">${x.share}%</i>`).join('')}</div><div class="vstl">${a.stances.map((x,k)=>`<div><b style="--c:${col[k%4]}" class="vdot">${E(x.label)}</b><span>${E(x.desc)}</span></div>`).join('')}</div>`:''}
   ${(a.topics||[]).length?`<h5>많이 이야기하는 주제</h5><div class="vtp">${a.topics.map(t=>`<span>${E(t.label)}<b>${t.n}</b></span>`).join('')}</div>`:''}
   <h5>자주 나온 말</h5>${cloud(r.words)}
   <h5>대표 의견</h5>${quotes(r,4)}
   <h5>분위기 변화</h5>${trend(r.trend)}
   <p class="vfine">공개된 블로그·카페 글 일부를 모아 분석했어요. 일부 의견이라 전체 여론과 다를 수 있고, 작성자 정보는 저장하지 않아요.${r.ai?' 요약·분류는 AI가 했어요.':''}</p></div>
  <div class="vh"><h2><small>Videos · 방송사 공식 채널</small>관련 영상</h2><span class="vbadge">${(r.videos||[]).length}개</span></div>${vcards(r.videos)}
  <p class="vfine">영상은 원래 채널로 연결돼요. 3줄 요약은 채널이 직접 쓴 영상 설명에서 뽑았어요.</p></section>`}
function hub(){if(typeof setMeta==='function')setMeta('민심·영상','이슈별로 사람들이 어떻게 생각하는지, 어떤 영상이 올라오는지');const L=V.issues||[];
  const hot=[...L].sort((a,b)=>sent(b).neg-sent(a).neg);
  app.innerHTML=`<div class="vhub"><div class="vhero"><h1>민심·영상</h1><p>오늘의 이슈마다 사람들이 블로그·카페에 남긴 생각과, 방송사가 올린 영상을 모아 정리했어요.</p>
   <div class="vk"><div><b>${L.length}</b><span>이슈</span></div><div><b>${L.reduce((s,r)=>s+r.n,0)}</b><span>분석한 글</span></div><div><b>${L.reduce((s,r)=>s+(r.videos||[]).length,0)}</b><span>관련 영상</span></div></div></div>
   <div class="vh"><h2><small>Mood board</small>이슈별 분위기</h2></div>
   <div class="vmb">${L.map(r=>{const s=sent(r);return`<a class="card vmi" href="issue/${E(r.id)}#s-voice">${gauge(s)}<div><span class="cat ${E(r.category)}">${E(r.category)}</span><h4>${E(r.title)}</h4>${r.ai&&r.ai.mood?`<span class="vmood">${E(r.ai.mood)}</span>`:''}<div class="vbar"><i style="flex:${s.pos};background:var(--ds-green)"></i><i style="flex:${s.neu};background:var(--ds-line)"></i><i style="flex:${s.neg};background:var(--ds-up)"></i></div><small>글 ${r.n} · 영상 ${(r.videos||[]).length}</small></div></a>`}).join('')}</div>
   <div class="vh"><h2><small>Hot takes</small>가장 뜨거운 반응</h2></div>${hot.slice(0,2).map(r=>`<div class="card vcard"><h4 class="vht"><a href="issue/${E(r.id)}#s-voice">${E(r.title)} ${NBI('arrow-right')}</a></h4>${quotes(r,3)}</div>`).join('')}
   <div class="vh"><h2><small>Videos</small>오늘 많이 본 뉴스 영상</h2></div>${vcards(L.flatMap(r=>r.videos||[]).filter((v,k,a)=>a.findIndex(x=>x.id===v.id)===k).sort((a,b)=>b.views-a.views).slice(0,9))}
   <p class="vfine">공개 글·공식 영상만 모으고, 작성자 정보는 저장하지 않아요.</p></div>`}
function apply(){if(!V||typeof app==='undefined')return;const p=decodeURIComponent(location.pathname.slice(BP.length)).replace(/\/+$/,'');const v=p.split('/')[0],a=p.split('/')[1];
  if(v==='voice'){if(!app.querySelector('.vhub')){hub();document.querySelectorAll('.tabbar [data-v],.topnav [data-v]').forEach(x=>x.classList.toggle('on',x.dataset.v==='menu'))}return}
  if(v==='issue'&&a&&!app.querySelector('.vblk')&&app.querySelector('.dhead')){const t=(typeof D!=='undefined'&&D)?D.issues.find(x=>x.id===a):null;const L=V.issues||[];const r=(t&&L.find(x=>x.title===t.title))||(!t&&L.find(x=>x.id===a));if(!r)return;
    const at=app.querySelector('#comments')||app.querySelector('#s-flow');at&&at.insertAdjacentHTML('afterend',block(r));
    const toc=app.querySelector('.toc');const op=toc&&toc.querySelector('[href="#comments"]');if(op&&!toc.querySelector('[href="#s-voice"]'))op.insertAdjacentHTML('afterend',`<a href="#s-voice">${NBI('users-group')}<span>민심·영상</span></a>`);
    if(location.hash==='#s-voice')setTimeout(()=>{const e=document.getElementById('s-voice');e&&e.scrollIntoView()},60)}}
fetch('data/voice.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(j=>{V=j;if(!V)return;let t;if(typeof app!=='undefined'&&app)new MutationObserver(()=>{clearTimeout(t);t=setTimeout(apply,30)}).observe(app,{childList:true});apply();setTimeout(apply,500)}).catch(()=>{});
})();
