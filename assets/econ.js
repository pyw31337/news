/* NewsBoard · 마켓 경제지표(추이 차트·초보자 설명·경기선행지수) */
(function(){
let ES=null,esP=null;
const loadES=()=>esP||(esP=fetch('data/ecos_series.json?'+Date.now()).then(r=>r.ok?r.json():null).catch(()=>null).then(j=>ES=j));
const e_=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* 지표별 설명: 무엇·왜 중요·오르면/내리면·생활과 투자 · good: 오르는 게 대체로 좋은 방향이면 1, 나쁘면 -1, 상황따라 0 */
const INFO={
 base:{t:'기준금리',g:'금리',u:'%',dp:2,good:0,ic:'🏦',what:'한국은행이 정하는 ‘돈의 기본 가격’이에요. 모든 대출·예금 금리의 출발점이 됩니다.',why:'경제가 과열되면 올려서 식히고, 침체되면 내려서 돈이 돌게 해요.',up:'오르면 대출 이자가 늘고 예금 이자도 올라요. 집값·주가에는 보통 부담이에요.',down:'내리면 대출 부담이 줄고 돈이 풀려 자산 가격이 오르기 쉬워요.',life:'변동금리 대출이 있다면 가장 먼저 챙겨볼 숫자예요.'},
 cd91:{t:'CD 금리(91일)',g:'금리',u:'%',dp:2,good:0,ic:'📄',what:'은행이 3개월짜리로 돈을 빌릴 때의 금리예요.',why:'주택담보대출 같은 변동금리 대출의 기준으로 많이 쓰여요.',up:'오르면 몇 달 뒤 변동금리 대출 이자가 따라 올라요.',down:'내리면 대출 이자 부담이 줄어들 신호예요.',life:'기준금리보다 시장 분위기를 빨리 반영해요.'},
 ktb3:{t:'국고채 3년',g:'금리',u:'%',dp:2,good:0,ic:'🏛️',what:'나라가 3년 동안 돈을 빌릴 때 내는 이자예요.',why:'시장이 앞으로의 기준금리를 어떻게 보는지 가장 잘 보여줘요.',up:'오르면 시장이 ‘금리가 더 오르거나 오래 높을 것’이라고 보는 거예요.',down:'내리면 ‘금리 인하’를 미리 반영하고 있다는 뜻이에요.',life:'채권 투자·적금 금리의 방향을 가늠할 때 써요.'},
 ktb10:{t:'국고채 10년',g:'금리',u:'%',dp:2,good:0,ic:'🏛️',what:'나라가 10년 동안 돈을 빌릴 때 내는 이자예요.',why:'장기 성장과 물가에 대한 시장의 기대가 담겨 있어요.',up:'오르면 장기 대출(주담대 고정금리)이 비싸져요.',down:'내리면 경기가 둔해질 거란 걱정이 커졌다는 뜻일 때가 많아요.',life:'3년물보다 낮아지면(장단기 금리 역전) 경기 둔화 신호로 봐요.'},
 corp3:{t:'회사채 3년(AA-)',g:'금리',u:'%',dp:2,good:0,ic:'🏢',what:'신용이 좋은 기업이 3년 동안 돈을 빌릴 때의 금리예요.',why:'국고채와의 차이가 벌어지면 시장이 기업을 불안하게 본다는 뜻이에요.',up:'오르면 기업의 자금 조달이 어려워져요.',down:'내리면 기업이 돈 빌리기 쉬워져요.',life:'국고채보다 얼마나 높은지(신용 스프레드)를 함께 보면 좋아요.'},
 usd:{t:'원/달러 환율',g:'환율',u:'원',dp:1,good:0,ic:'💵',what:'1달러를 사는 데 필요한 원화예요.',why:'수출·수입 물가와 외국인 투자 흐름에 바로 영향을 줘요.',up:'오르면(원화 약세) 수입품·해외여행·유가 부담이 커지고, 수출 기업에는 유리해요.',down:'내리면(원화 강세) 해외 직구·여행이 싸지고 수입 물가가 안정돼요.',life:'해외 결제나 달러 자산이 있다면 꼭 보는 숫자예요.'},
 jpy:{t:'원/엔 환율(100엔)',g:'환율',u:'원',dp:1,good:0,ic:'💴',what:'100엔을 사는 데 필요한 원화예요.',why:'일본과 경쟁하는 수출 산업과 일본 여행 비용에 영향을 줘요.',up:'오르면 일본 여행이 비싸지고 한국 수출품의 가격 경쟁력이 좋아져요.',down:'내리면(엔저) 일본 여행이 싸지지만 경쟁 업종엔 부담이에요.',life:'일본 여행·직구 전에 확인해 보세요.'},
 eur:{t:'원/유로 환율',g:'환율',u:'원',dp:1,good:0,ic:'💶',what:'1유로를 사는 데 필요한 원화예요.',why:'유럽과의 교역·여행 비용에 영향을 줘요.',up:'오르면 유럽 여행·명품 가격 부담이 커져요.',down:'내리면 유럽 관련 지출이 줄어요.',life:'유럽 여행 계획이 있다면 참고하세요.'},
 cny:{t:'원/위안 환율',g:'환율',u:'원',dp:2,good:0,ic:'🪙',what:'1위안을 사는 데 필요한 원화예요.',why:'최대 교역국 중국과의 거래 비용을 보여줘요.',up:'오르면 중국산 수입품 가격이 올라요.',down:'내리면 중국산 물가가 싸져요.',life:'생활용품·원자재 물가와 연결돼요.'},
 cpi:{t:'소비자물가 상승률',g:'물가',u:'%',dp:1,good:-1,target:2,ic:'🛒',what:'우리가 사는 물건·서비스 값이 1년 전보다 얼마나 올랐는지예요.',why:'한국은행은 2%를 목표로 금리를 조절해요.',up:'2%를 크게 넘으면 월급의 실제 가치가 줄고 금리 인상 압력이 커져요.',down:'2% 근처로 내려오면 금리를 내릴 여유가 생겨요.',life:'장바구니 체감 물가의 공식 숫자예요.'},
 ppi:{t:'생산자물가 상승률',g:'물가',u:'%',dp:1,good:-1,ic:'🏭',what:'기업끼리 거래하는 원재료·제품 값이 1년 전보다 얼마나 올랐는지예요.',why:'몇 달 뒤 소비자물가로 옮겨오는 경우가 많아 ‘물가 예고편’이라고 불러요.',up:'오르면 곧 소비자 가격도 오를 가능성이 커요.',down:'내리면 물가가 안정될 신호예요.',life:'소비자물가보다 먼저 움직이는지 함께 보세요.'},
 unemp:{t:'실업률',g:'고용',u:'%',dp:1,good:-1,ic:'👷',what:'일하고 싶은 사람 중 일자리를 찾지 못한 사람의 비율이에요.',why:'경기가 얼마나 튼튼한지 보여주는 대표 지표예요.',up:'오르면 경기가 식고 있다는 신호예요.',down:'내리면 고용이 탄탄하다는 뜻이에요.',life:'취업·이직 시장 분위기와 직결돼요.'},
 cab:{t:'경상수지',g:'대외',u:'백만$',dp:0,good:1,ic:'🚢',what:'수출입과 해외 투자소득 등으로 한 달 동안 나라에 들어온 돈과 나간 돈의 차이예요.',why:'흑자가 꾸준하면 원화 가치와 대외 신뢰에 도움이 돼요.',up:'흑자가 커지면 원화 강세 요인이에요.',down:'적자로 돌아서면 환율이 오르기 쉬워요.',life:'0보다 크면 흑자, 작으면 적자예요.'},
 gdp:{t:'경제성장률(전기 대비)',g:'성장',u:'%',dp:1,good:1,ic:'📈',what:'나라 경제가 직전 분기보다 얼마나 커졌는지예요.',why:'경제 전체의 ‘성적표’예요.',up:'높아지면 경기가 살아나는 중이에요.',down:'두 분기 연속 마이너스면 흔히 ‘경기 침체’라고 불러요.',life:'분기마다 발표돼 흐름이 느리지만 가장 큰 그림을 보여줘요.'},
 kospi:{t:'코스피',g:'증시',u:'pt',dp:2,good:1,ic:'📊',what:'우리나라 대표 기업들 주가를 묶은 지수예요.',why:'경기 기대와 외국인 투자 심리가 함께 반영돼요.',up:'오르면 기업 실적·경기에 대한 기대가 커졌다는 뜻이에요.',down:'내리면 경기·실적 걱정이 커졌다는 신호예요.',life:'연금·펀드 수익률과 직결돼요.'},
 kosdaq:{t:'코스닥',g:'증시',u:'pt',dp:2,good:1,ic:'🚀',what:'중소·기술 기업 중심의 주가 지수예요.',why:'성장주·개인 투자자 심리를 잘 보여줘요.',up:'오르면 위험을 감수하려는 분위기예요.',down:'내리면 투자 심리가 움츠러들었어요.',life:'변동이 커서 코스피와 함께 보세요.'},
 m2:{t:'시중 통화량(M2) 증가율',g:'유동성',u:'%',dp:1,good:0,ic:'💧',what:'시중에 풀린 돈이 1년 전보다 얼마나 늘었는지예요.',why:'돈이 많이 풀리면 자산 가격과 물가가 오르기 쉬워요.',up:'빨라지면 유동성이 풍부해진다는 뜻이에요.',down:'느려지면 돈줄이 마르고 있다는 뜻이에요.',life:'집값·주가 흐름의 배경이 돼요.'}};
const ORDER=[['금리',['base','cd91','ktb3','ktb10','corp3']],['환율',['usd','jpy','eur','cny']],['물가·고용',['cpi','ppi','unemp']],['성장·대외',['gdp','cab','m2']],['증시',['kospi','kosdaq']]];
const fmt=(v,dp)=>v==null?'-':Number(v).toLocaleString('ko-KR',{minimumFractionDigits:dp,maximumFractionDigits:dp});
const lab=(k,c)=>c==='D'?k.slice(2,4)+'.'+k.slice(5,7)+'.'+k.slice(8):c==='Q'?k.slice(2,4)+'.'+k.slice(5):k.slice(2,4)+'.'+k.slice(5,7);
/* 기간 자르기 */
function cutP(d,c,p){if(p==='all'||!d.length)return d;const m={'3m':3,'1y':12,'3y':36,'5y':60}[p]||12;const t=new Date();t.setMonth(t.getMonth()-m);const k=t.toISOString().slice(0,c==='D'?10:7);return d.filter(x=>c==='Q'?(+x[0].slice(0,4)+(+x[0].slice(6)-1)/4)>=t.getFullYear()+t.getMonth()/12:x[0]>=k)}
/* 변화 계산 */
function stat(s){const d=s.data,n=d.length;if(!n)return null;const L=d[n-1][1],P=n>1?d[n-2][1]:L;
  const back=k=>{const c=s.cycle;if(c==='M')return d[Math.max(0,n-1-k)][1];if(c==='Q')return d[Math.max(0,n-1-Math.round(k/3))][1];const t=new Date(d[n-1][0]+'T00:00:00');t.setMonth(t.getMonth()-k);const key=t.toISOString().slice(0,10);let r=d[0];for(const x of d){if(x[0]<=key)r=x;else break}return r[1]};
  const vs=d.map(x=>x[1]),mn=Math.min(...vs),mx=Math.max(...vs);return{L,P,d1:L-P,m3:L-back(3),y1:L-back(12),mn,mx,pos:(L-mn)/((mx-mn)||1),date:d[n-1][0]}}
const isRate=s=>s.unit==='%';
const chg=(st,s,inf)=>{const v=isRate(s)?st.d1:(st.P?st.d1/Math.abs(st.P)*100:0);const t=isRate(s)?`${st.d1>0?'+':''}${fmt(st.d1,2)}%p`:`${v>0?'+':''}${fmt(v,2)}%`;const dir=Math.abs(v)<1e-9?'flat':v>0?'up':'down';return{t,dir}};
/* 지금 상황(규칙 기반) */
function now(id,s,st){const inf=INFO[id]||{};const dp=inf.dp??2,u=s.unit==='%'?'%':inf.u||'';
  const big=isRate(s)?.25:5,y=isRate(s)?st.y1:(st.L/(st.L-st.y1||1)-1)*100,m=isRate(s)?st.m3:(st.L/(st.L-st.m3||1)-1)*100;
  const tr=Math.abs(m)<(isRate(s)?.05:1)?'최근 3개월은 큰 변화 없이 옆걸음':m>0?'최근 3개월 오름세':'최근 3개월 내림세';
  const lvl=st.pos>.85?'기간 중 높은 편':st.pos<.15?'기간 중 낮은 편':'기간 중 중간 수준';
  let tail='';
  if(id==='cpi')tail=st.L>3?'목표(2%)보다 꽤 높아 물가 부담이 큰 편이에요.':st.L>2.3?'목표(2%)를 조금 웃돌아요.':st.L>=1.5?'목표(2%) 근처라 비교적 안정적이에요.':'목표(2%)보다 낮아 수요가 약하다는 해석도 있어요.';
  else if(id==='usd')tail=st.L>=1400?'1,400원 이상은 역사적으로 높은 구간이라 수입 물가 부담이 커요.':st.L>=1300?'1,300원대는 최근 몇 년의 평균보다 높은 편이에요.':'비교적 원화 가치가 안정된 구간이에요.';
  else if(id==='cab')tail=st.L>0?'흑자예요. 나라에 들어온 돈이 더 많았어요.':'적자예요. 나간 돈이 더 많았어요.';
  else if(id==='gdp')tail=st.L<0?'직전 분기보다 경제가 줄었어요.':st.L<.5?'성장은 했지만 속도가 느려요.':'비교적 괜찮은 성장 속도예요.';
  else if(id==='ktb10'&&ES.series.ktb3?.data?.length){const g=st.L-ES.series.ktb3.data.at(-1)[1];tail=g<0?'10년물이 3년물보다 낮은 ‘장단기 금리 역전’ 상태예요. 경기 둔화 경고로 자주 해석돼요.':`3년물보다 ${fmt(g,2)}%p 높아 정상적인 모양이에요.`}
  else if(id==='corp3'&&ES.series.ktb3?.data?.length){const g=st.L-ES.series.ktb3.data.at(-1)[1];tail=`국고채보다 ${fmt(g,2)}%p 높아요. 이 차이가 커지면 기업 자금 사정이 빡빡하다는 뜻이에요.`}
  return`${tr}이고, 1년 전보다 ${isRate(s)?`${fmt(Math.abs(st.y1),2)}%p`:`${fmt(Math.abs(y),1)}%`} ${st.y1>=0?'높아요':'낮아요'}. 지금 값은 ${lvl}이에요. ${tail}`}
/* SVG 차트 */
function chart(d,{w=320,h=120,col='#ff4d2e',axis=false,c='M',ref=null,shade=null,d2=null,col2='#2f6bff'}={}){
  if(!d||d.length<2)return'';const all=d2?d.concat(d2):d,vs=all.map(x=>x[1]).concat(ref!=null?[ref]:[]);let mn=Math.min(...vs),mx=Math.max(...vs);const pad=(mx-mn)*.08||1;mn-=pad;mx+=pad;
  const L=axis?38:2,R=axis?8:2,T=axis?10:4,B=axis?22:4,W=w-L-R,H=h-T-B,X=i=>L+i/(d.length-1)*W,Y=v=>T+(1-(v-mn)/(mx-mn))*H;
  const keys=d.map(x=>x[0]),xi=k=>{const i=keys.indexOf(k);return i<0?null:X(i)};
  const p=d.map((x,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(x[1]).toFixed(1)}`).join('');
  const p2=d2?d2.filter(x=>keys.includes(x[0])).map((x,i)=>`${i?'L':'M'}${xi(x[0]).toFixed(1)},${Y(x[1]).toFixed(1)}`).join(''):'';
  let sh='';if(shade)sh=shade.filter(z=>keys.includes(z[0])).map(z=>{const a=xi(z[0]),b=xi(z[1])??X(d.length-1);return`<rect x="${a.toFixed(1)}" y="${T}" width="${Math.max(1,b-a).toFixed(1)}" height="${H}" fill="${z[2]==='up'?'rgba(17,166,131,.12)':'rgba(255,77,46,.10)'}"/>`}).join('');
  const ax=axis?[mx-pad,(mx+mn)/2,mn+pad].map(v=>`<text x="${L-4}" y="${(Y(v)+3).toFixed(1)}" text-anchor="end">${fmt(v,Math.abs(v)>=100?0:Math.abs(v)>=10?1:2)}</text><line x1="${L}" x2="${w-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="gl"/>`).join('')+[0,Math.floor((d.length-1)/2),d.length-1].map((i,j)=>`<text x="${X(i).toFixed(1)}" y="${h-6}" text-anchor="${['start','middle','end'][j]}">${lab(d[i][0],c)}</text>`).join(''):'';
  const rf=ref!=null&&ref>mn&&ref<mx?`<line x1="${L}" x2="${w-R}" y1="${Y(ref).toFixed(1)}" y2="${Y(ref).toFixed(1)}" stroke="#8189a3" stroke-dasharray="3 3"/>${axis?`<text x="${w-R}" y="${(Y(ref)-4).toFixed(1)}" text-anchor="end" class="rf">${ref===100?'기준선 100':'목표 '+ref+'%'}</text>`:''}`:'';
  const lx=X(d.length-1),ly=Y(d.at(-1)[1]);
  return`<svg class="ech" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img">${sh}${ax}${rf}<path d="${p}L${lx.toFixed(1)},${T+H}L${L},${T+H}Z" fill="${col}" opacity=".08"/>${p2?`<path d="${p2}" fill="none" stroke="${col2}" stroke-width="${axis?1.8:1.4}" stroke-dasharray="${axis?'':'0'}" vector-effect="non-scaling-stroke"/>`:''}<path d="${p}" fill="none" stroke="${col}" stroke-width="${axis?2.2:1.8}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>${axis?`<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="${col}" stroke="#fff" stroke-width="2"/>`:''}</svg>`}
const colOf=(dir,inf)=>dir==='flat'?'#8189a3':((dir==='up')===(inf.good!==-1))?(inf.good===0?(dir==='up'?'#e2321b':'#2f6bff'):'#11a683'):'#e2321b';
function card(id){const s=ES.series[id];if(!s||!s.data||s.data.length<3)return'';const inf=INFO[id]||{t:s.name,dp:2};const st=stat(s),c=chg(st,s,inf);
  const col=inf.good===0?(c.dir==='up'?'#e2321b':c.dir==='down'?'#2f6bff':'#8189a3'):colOf(c.dir,inf);
  return`<button type="button" class="ecard" data-ec="${id}"><span class="eh"><i>${inf.ic||'📌'}</i>${e_(inf.t)}</span><b class="ev">${fmt(st.L,inf.dp??2)}<small>${e_(s.unit==='%'?'%':inf.u||s.unit||'')}</small></b><span class="dchg ${c.dir}" style="--c:${col}">${c.dir==='up'?'▲':c.dir==='down'?'▼':'–'} ${c.t}</span>${chart(cutP(s.data,s.cycle,s.cycle==='D'?'1y':'3y'),{w:160,h:44,col,c:s.cycle,ref:inf.target})}<span class="ets">${lab(st.date,s.cycle)} 기준</span></button>`}
/* 상세 시트 */
function sheet(id){const s=ES.series[id];if(!s)return;const inf=INFO[id]||{t:s.name};const st=stat(s),c=chg(st,s,inf);
  const per=s.cycle==='D'?[['3m','3개월'],['1y','1년'],['3y','3년']]:[['1y','1년'],['3y','3년'],['5y','5년'],['all','전체']];let cur=s.cycle==='D'?'1y':'3y';
  let el=document.getElementById('esheet');if(!el){el=document.createElement('div');el.id='esheet';document.body.appendChild(el);el.addEventListener('click',ev=>{if(ev.target===el||ev.target.closest('[data-close]'))close()})}
  const close=()=>{el.classList.remove('on');document.documentElement.classList.remove('noscroll')};
  const draw=()=>{const d=cutP(s.data,s.cycle,cur);const w=Math.min(680,window.innerWidth-32);el.querySelector('.ebig').innerHTML=chart(d,{w,h:Math.round(w*.55),axis:true,col:'#ff4d2e',c:s.cycle,ref:inf.target});
    const f=d[0][1],l=d.at(-1)[1],mn=Math.min(...d.map(x=>x[1])),mx=Math.max(...d.map(x=>x[1]));el.querySelector('.estats').innerHTML=`<div><span>기간 최고</span><b>${fmt(mx,inf.dp??2)}</b></div><div><span>기간 최저</span><b>${fmt(mn,inf.dp??2)}</b></div><div><span>기간 변화</span><b class="${l>f?'up':l<f?'down':''}">${l>f?'+':''}${isRate(s)?fmt(l-f,2)+'%p':fmt((l/f-1)*100,1)+'%'}</b></div>`;
    el.querySelectorAll('[data-p]').forEach(b=>b.classList.toggle('on',b.dataset.p===cur))};
  el.innerHTML=`<div class="esh" role="dialog" aria-modal="true" aria-label="${e_(inf.t)}"><div class="grab"></div><button type="button" class="x" data-close aria-label="닫기">✕</button>
   <div class="eh"><i>${inf.ic||'📌'}</i><span class="tag">${e_(inf.g||'')}</span></div><h3>${e_(inf.t)}</h3>
   <div class="eval"><b>${fmt(st.L,inf.dp??2)}<small>${e_(s.unit==='%'?'%':inf.u||s.unit||'')}</small></b><span class="dchg ${c.dir}">${c.dir==='up'?'▲':c.dir==='down'?'▼':'–'} ${c.t} <em>직전 대비</em></span><time class="ts">${lab(st.date,s.cycle)} 기준</time></div>
   <div class="now"><b>지금 상황</b><p>${e_(now(id,s,st))}</p></div>
   <div class="ptog">${per.map(([k,t])=>`<button type="button" data-p="${k}">${t}</button>`).join('')}</div><div class="ebig"></div><div class="estats"></div>
   ${inf.what?`<div class="learn"><div class="lq"><span>무엇인가요?</span><p>${e_(inf.what)}</p></div><div class="lq"><span>왜 중요해요?</span><p>${e_(inf.why)}</p></div><div class="lud"><div class="u"><span>▲ 오르면</span><p>${e_(inf.up)}</p></div><div class="d"><span>▼ 내리면</span><p>${e_(inf.down)}</p></div></div><div class="life">💡 ${e_(inf.life)}</div></div>`:''}
   <p class="fine">출처: 한국은행 경제통계시스템. 투자 권유가 아닌 이해를 돕기 위한 설명이에요.</p></div>`;
  el.querySelector('.ptog').onclick=ev=>{const b=ev.target.closest('[data-p]');if(b){cur=b.dataset.p;draw()}};
  el.classList.add('on');document.documentElement.classList.add('noscroll');draw()}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-ec]');if(b&&ES)sheet(b.dataset.ec)});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){const el=document.getElementById('esheet');el&&el.classList.remove('on');document.documentElement.classList.remove('noscroll')}});
/* 경기선행지수 */
function phase(d){const n=d.length;if(n<4)return null;const L=d[n-1][1],sl=L-d[n-4][1];return L>=100?(sl>=0?['확장','경기가 평균보다 좋고 더 좋아지는 중','up']:['둔화','평균보다는 좋지만 기세가 꺾이는 중','down']):(sl<0?['수축','평균보다 약하고 더 약해지는 중','down']:['회복','평균보다 약하지만 나아지기 시작','up'])}
function shades(d){const out=[];let st=null,dir=null;for(let i=3;i<d.length;i++){const r=d[i][1]-d[i-3][1]>=0?'up':'down';if(r!==dir){if(st)out.push([st,d[i][0],dir]);st=d[i][0];dir=r}}if(st)out.push([st,d.at(-1)[0],dir]);return out}
function leadHTML(){const S=ES.series,lc=S.cli_cyc,cc=S.cci_cyc;if(!lc||!lc.data||lc.data.length<12)return'';
  const d=lc.data,ph=phase(d),cph=cc?phase(cc.data):null,L=d.at(-1),six=d[Math.max(0,d.length-7)];
  let streak=0;for(let i=d.length-1;i>0&&(d[i][1]-d[i-1][1])*(L[1]-d[d.length-2][1])>0;i--)streak++;
  const w=Math.min(720,(document.getElementById('app')?.clientWidth||360)-28);
  const comps=(ES.components||[]).slice(0,6);
  return`<section class="lead-ix">${window.sec?sec('경기선행지수','Leading indicators','','spark'):''}
  <div class="phase ${ph[2]}"><div class="pq">${['회복','확장','둔화','수축'].map(p=>`<span class="${p===ph[0]?'on':''}">${p}</span>`).join('')}</div><div class="pt"><small>지금 경기 국면(선행지수 기준)</small><b>${ph[0]}</b><p>${ph[1]}이에요.</p></div></div>
  <div class="card lchart"><div class="lh"><span class="lg"><i style="--c:#ff4d2e"></i>선행지수 순환변동치</span>${cc?`<span class="lg"><i style="--c:#2f6bff"></i>동행지수 순환변동치</span>`:''}<span class="lg sh"><i class="u"></i>오름 구간</span><span class="lg sh"><i class="d"></i>내림 구간</span></div>
   ${chart(d.slice(-120),{w,h:Math.round(Math.max(180,w*.42)),axis:true,c:'M',ref:100,shade:shades(d.slice(-120)),d2:cc?cc.data.slice(-120):null})}</div>
  <div class="lstats"><div><span>선행지수 순환변동치</span><b>${fmt(L[1],1)}</b><time class="ts">${lab(L[0],'M')}</time></div><div><span>6개월 전보다</span><b class="${L[1]>six[1]?'up':'down'}">${L[1]>six[1]?'+':''}${fmt(L[1]-six[1],1)}</b></div><div><span>연속 ${L[1]>=d[d.length-2][1]?'상승':'하락'}</span><b>${streak}<small>개월</small></b></div>${cph?`<div><span>동행지수 국면</span><b>${cph[0]}</b></div>`:''}</div>
  <div class="now"><b>지금 상황</b><p>선행지수 순환변동치는 ${fmt(L[1],1)}로 기준선(100)${L[1]>=100?'보다 높아':'보다 낮아'} ${ph[1]}이에요. ${streak>=3?`${streak}개월 연속 ${L[1]>=d[d.length-2][1]?'올라':'내려'} 방향성이 분명한 편이에요. `:'최근 방향이 자주 바뀌어 아직 뚜렷한 흐름은 아니에요. '}${cph?`지금의 경기를 보여주는 동행지수는 ‘${cph[0]}’ 국면이라, ${cph[0]===ph[0]?'현재와 앞으로의 신호가 같은 방향이에요.':'지금 경기와 앞으로의 신호가 엇갈리고 있어요.'}`:''}</p></div>
  ${comps.length?`<h3 class="sub">${window.ic?ic('chart'):''}선행지수를 이루는 지표</h3><div class="ecards sm">${comps.map(x=>{const n=x.data.length,l=x.data[n-1][1],p=x.data[n-2][1],dir=l>p?'up':l<p?'down':'flat';return`<div class="ecard"><span class="eh">${e_(x.name)}</span><b class="ev">${fmt(l,1)}</b><span class="dchg ${dir}">${dir==='up'?'▲':dir==='down'?'▼':'–'} ${fmt(Math.abs(l-p),1)}</span>${chart(x.data.slice(-36),{w:160,h:40,col:dir==='down'?'#2f6bff':'#e2321b'})}</div>`}).join('')}</div>`:''}
  <div class="learn"><div class="lq"><span>선행지수가 뭔가요?</span><p>몇 달 뒤 경기 흐름을 미리 보여주는 지표들(재고, 건설 수주, 경제심리, 주가, 금리 차이 등)을 하나로 묶은 숫자예요. 통계청이 매달 발표해요.</p></div>
   <div class="lq"><span>순환변동치는 왜 봐요?</span><p>장기적으로 커지는 추세를 걷어내 ‘평균보다 좋은지 나쁜지’만 남긴 값이에요. 100보다 크면 평균 이상, 작으면 평균 이하예요.</p></div>
   <div class="lq"><span>얼마나 앞서 움직여요?</span><p>보통 실제 경기(동행지수)보다 3~6개월쯤 먼저 방향을 바꾸는 경향이 있어요. 빨간 선이 파란 선을 앞서 움직이는지 보세요.</p></div>
   <div class="lq"><span>국면 읽는 법</span><p>100 위에서 오르면 확장, 100 위에서 꺾이면 둔화, 100 아래에서 내리면 수축, 100 아래에서 오르기 시작하면 회복이에요.</p></div>
   <div class="life warn">⚠️ 예측이 아니라 ‘방향을 알려주는 신호’예요. 한두 달 움직임은 자주 뒤집히니 3개월 이상 같은 방향인지 확인하세요. 투자 판단의 근거로만 쓰지 마세요.</div></div></section>`}
function econHTML(){if(!ES||!ES.series)return'';const has=ORDER.some(([g,ids])=>ids.some(i=>ES.series[i]?.data?.length));if(!has)return'';
  return`<section class="econ">${sec('경제 체온계','Economic indicators','<span class="more">카드를 누르면 자세히</span>','chart')}<p class="lede">숫자 하나보다 ‘흐름’이 중요해요. 카드를 누르면 기간별 차트와 쉬운 설명을 볼 수 있어요.</p>
  ${ORDER.map(([g,ids])=>{const h=ids.map(card).join('');return h?`<h3 class="sub">${g}</h3><div class="ecards">${h}</div>`:''}).join('')}</section>${leadHTML()}`}
/* 마켓 페이지에 끼워넣기: 지수 아래, 기존 단순 목록 대신 */
function put(){try{put_()}catch(e){}}
function put_(){if(!/^market\/?$/.test(location.pathname.slice(BASEP.length)))return;const app=document.getElementById('app');if(!app||!app.querySelector('.mkrow,.lede'))return;
  app.querySelectorAll('.econ,.lead-ix').forEach(x=>x.remove());const h=econHTML();if(!h)return;
  [...app.querySelectorAll('.ecos')].forEach(x=>{const s=x.previousElementSibling;if(s&&s.classList.contains('sec'))s.remove();x.remove()});
  (app.querySelector('.mkrow.wide')||app.querySelector('.lede')).insertAdjacentHTML('afterend',h)}
const _mk=window.market;
window.market=function(){const r=_mk.apply(this,arguments);if(ES)put();else loadES().then(put);return r};
loadES().then(()=>setTimeout(put,0));
})();
