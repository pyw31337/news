// 판결 보도 → 구조화 v2 (admin 시안). 입력: 후보목록 + 원문본문 캐시(legal_resolve.py). 사건 당사자 이름·기사 제목은 결과에 저장하지 않음.
import fs from 'fs';
const [,, candFile, bodyFile, outFile] = process.argv;
const C = JSON.parse(fs.readFileSync(candFile,'utf8')), B = JSON.parse(fs.readFileSync(bodyFile,'utf8'));
// 양형위원회 기본영역(개월). 출처는 GUIDE_SRC. 유형을 기사에서 특정할 수 있을 때만 사용.
export const GUIDE = {
 '공무집행방해':{src:'https://scourt.go.kr/sc/krsc/criterion/criterion_41/execution_disturbance_01.jsp',types:{'공무집행방해/직무강요':[6,18],'위계공무집행방해':[8,18]}},
 '사기':{src:'https://scourt.go.kr/sc/krsc/criterion/criterion_10/fraud_01.jsp',types:{'1억 미만':[6,18],'1억~5억':[12,48],'5억~50억':[36,72],'50억~300억':[60,108],'300억 이상':[72,132]}},
 '횡령·배임':{src:'https://www.scourt.go.kr/sc/krsc/criterion/criterion_05/embezzlement_01.jsp',types:{'1억 미만':[4,16],'1억~5억':[12,36],'5억~50억':[24,60],'50억~300억':[48,84],'300억 이상':[60,96]}},
 '살인':{src:'https://www.scourt.go.kr/sc/krsc/criterion/criterion_01/murder_01.jsp',types:{'참작 동기':[48,72],'보통 동기':[120,192],'비난 동기':[180,240]}},
 '교통(위험운전·사망)':{src:'https://www.scourt.go.kr/sc/krsc/pdf/F19.Crimes_of_Traffic.pdf',types:{'위험운전 치사':[24,60],'위험운전 치상':[10,30],'교통사고 치사':[8,24]}},
 '상해':{src:'https://scourt.go.kr/sc/krsc/criterion/criterion_47/violence_01.jsp',types:{'일반상해':[4,18],'중상해':[12,24],'상해치사':[36,60]}},
};
const CH=[['공무집행방해','공무집행방해'],['체포방해','공무집행방해'],['위계','공무집행방해'],['사기','사기'],['횡령','횡령·배임'],['배임','횡령·배임'],['살인','살인'],['살해','살인'],['음주','교통(위험운전·사망)'],['위험운전','교통(위험운전·사망)'],['교통사고','교통(위험운전·사망)'],['과속','교통(위험운전·사망)'],['상해','상해'],['폭행','상해'],['뇌물','뇌물'],['마약','마약'],['필로폰','마약'],['성폭','성범죄'],['강제추행','성범죄'],['절도','절도'],['선거법','선거·정치자금'],['정치자금','선거·정치자금'],['명예훼손','명예훼손'],['내란','내란'],['스토킹','스토킹'],['아동학대','아동학대']];
const RULING=/(선고|판결|무죄|유죄|확정|기각|감형|법정구속|집행유예|집유|실형|징역\s*\d)/, NOT=/(구형|여론|공감|조사\]|KSOI|고발|청구|영장|기소|송치|檢|검찰,|시민|\?|사설|칼럼|비판|왜\s|특파원|뉴스라운지|라운지|상고(?!.*기각)|재판소원|국정조사|돌아보|남긴)/;
const months=s=>{const m=s.match(/징역\s*(\d+)\s*년(?:\s*(\d+)\s*개?월)?|징역\s*(\d+)\s*개?월/);return m?(m[3]?+m[3]:+m[1]*12+(m[2]?+m[2]:0)):null};
const near=(text,kw,n=900)=>{const i=text.search(kw);return i<0?text.slice(0,4000):text.slice(Math.max(0,i-n),i+n)};
function parse(c){
  const title=c.t, b=B[c.u]||{}, text=(b.text||'');
  if(!RULING.test(title)||NOT.test(title)) return null;
  const ctx=near(text, /(선고|판결)/, 1500), all=title+' '+ctx;
  const sm=months(title)??months(ctx);
  const acq=/무죄/.test(title)&&/(무죄\s*(를|가)?\s*(선고|확정|판결)|무죄\s*판결|2심.*무죄|1심.*무죄|항소심.*무죄|에\s*무죄|[가-힣]+\s무죄$)|무죄…|무죄\s*\[|무죄\s*'|무죄$/.test(title)&&!/(무죄\s*판결\s*'공감'|무죄추정)/.test(title);
  const fine=/벌금/.test(title)&&!sm;
  if(!sm&&!acq&&!fine) return null;
  const r={url:b.orig&&!b.orig.includes('news.google.com')?b.orig:c.u,date:c.d||null,_title:title};
  r.court=(all.match(/(대법원|서울고법|서울고등법원|[가-힣]{2,4}고법|[가-힣]{2,4}고등법원|서울중앙지법|서울중앙지방법원|[가-힣]{2,6}지법(?:\s?[가-힣]{2,4}지원)?|[가-힣]{2,6}지방법원(?:\s?[가-힣]{2,4}지원)?)/)||[])[1]||null;
  const J=all.match(/(형사(?:항소)?\d+(?:-\d+)?부|형사합의\d+부|형사\d+단독)\s*\(\s*(?:재판장\s*)?([가-힣]{2,4})\s*(?:부장)?판사/)||all.match(/재판장\s*(?:인|을 맡은)?\s*([가-힣]{2,4})\s*(?:부장)?판사/)||all.match(/([가-힣]{2,4})\s*(?:부장판사|판사)는\s/)||all.match(/대법원\s*\d?부\s*\(\s*주심\s*([가-힣]{2,4})\s*대법관/)||all.match(/주심\s*([가-힣]{2,4})\s*대법관/);
  if(J){ r.dept=J.length>2?J[1]:null; r.judge=J.length>2?J[2]:J[1]; } else {r.dept=null;r.judge=null;}
  const SUR='김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부황보남궁선우제갈독고';
  if(r.judge&&(/^(재판|부장|단독|형사|법원|대법|이날|해당|당시)/.test(r.judge)||/(법|원|부)$/.test(r.judge)||!SUR.includes(r.judge[0]))) r.judge=null;
  r.counsel=[...new Set([...ctx.matchAll(/(?:변호인|변호를 맡은|측 대리인|법률대리인)(?:단|인|인 측|인단의|인인)?\s*(?:인\s)?([가-힣]{2,4})\s*변호사/g),...ctx.matchAll(/([가-힣]{2,4})\s*변호사는\s/g)].map(m=>m[1]).filter(n=>!/^(담당|소속|대표|해당|한|이|그|측|변호)/.test(n)))].slice(0,3);
  r.charge=(CH.find(([k])=>title.includes(k))||CH.find(([k])=>ctx.includes(k))||[0,'기타'])[1];
  r.instance=/파기환송심/.test(all)?'2심(환송)':/(대법원|대법\s|대법,|대법서|확정)/.test(title)?'3심(확정)':/(2심|항소심|고법|고등법원|항소부|항소\d+부)/.test(title)?'2심':/(1심|첫\s?재판)/.test(title)?'1심':/(고등법원|고법)\s*(형사|민사)/.test(ctx)?'2심':/항소심|2심/.test(ctx)?'2심':'1심';
  r.sentenceMonths=sm; r.suspended=/집행유예|집유/.test(title)||(!!sm&&/집행유예/.test(ctx.slice(0,600))); r.acquitted=!sm&&acq; r.fine=fine;
  r.change=/감형/.test(title)?'감형':/(형량.*늘|가중)/.test(title)?'가중':null;
  // 양형기준 유형 특정
  const amt=(()=>{const m=(title+' '+ctx).match(/(\d[\d,.]*)\s*억\s*(?:원|여 원|원대)/);return m?parseFloat(m[1].replace(/,/g,'')):null})();
  let gt=null; const g=GUIDE[r.charge];
  if(g){ if(r.charge==='공무집행방해') gt=/위계/.test(all)?'위계공무집행방해':'공무집행방해/직무강요';
    else if(r.charge==='사기'||r.charge==='횡령·배임'){ if(amt!=null) gt=amt<1?'1억 미만':amt<5?'1억~5억':amt<50?'5억~50억':amt<300?'50억~300억':'300억 이상'; }
    else if(r.charge==='교통(위험운전·사망)'){ if(/(음주|위험운전)/.test(all)) gt=/(사망|숨지|치사)/.test(all)?'위험운전 치사':'위험운전 치상'; else if(/(사망|숨지)/.test(all)) gt='교통사고 치사'; }
    else if(r.charge==='상해'){ if(/치사|숨지/.test(all)) gt='상해치사'; else if(/중상해/.test(all)) gt='중상해'; }
    // 살인은 동기 유형을 기사로 특정할 수 없어 비교하지 않음. 미수·경합범 언급 시 비교 제외
    if(gt&&/(미수|경합|등\s?혐의|여러 혐의)/.test(title)) gt=null; }
  r.guideType=gt; r.guide=gt?g.types[gt]:null;
  return r;
}
const sim=(a,b)=>{const g=s=>{s=s.replace(/[^가-힣0-9]/g,'');const o=new Set();for(let i=0;i<s.length-1;i++)o.add(s.slice(i,i+2));return o};const A=g(a),Bs=g(b);let n=0;A.forEach(x=>Bs.has(x)&&n++);return n/Math.min(A.size,Bs.size||1)};
const rows=C.map(parse).filter(Boolean);
// 사건 단위 묶기: 같은 결과(형량/무죄/벌금)·같은 심급·3일 이내·제목 유사도 ≥0.45
const clusters=[];
for(const r of rows){ const key=r.acquitted?'A':r.fine?'F':r.sentenceMonths;
  const hit=clusters.find(c=>c.key===key&&c.instance===r.instance&&Math.abs(new Date(c.date||0)-new Date(r.date||0))<=3*864e5&&c.titles.some(t=>sim(t,r._title)>=.45));
  if(hit){ hit.reports++; hit.sources.push(r.url); hit.titles.push(r._title); for(const k of ['court','dept','judge','guideType','guide']) if(!hit[k]&&r[k]) hit[k]=r[k]; hit.counsel=[...new Set([...hit.counsel,...r.counsel])].slice(0,3);}
  else clusters.push({...r,key,reports:1,sources:[r.url],titles:[r._title]}); }
const cases=clusters.map(({_title,titles,key,url,...c})=>({...c,url:c.sources[0]}));
const stat=(a)=>({rulings:a.length,withJudge:a.filter(r=>r.judge).length,withCounsel:a.filter(r=>r.counsel.length).length,acquitted:a.filter(r=>r.acquitted).length,prison:a.filter(r=>r.sentenceMonths).length,inst:a.reduce((o,r)=>(o[r.instance]=(o[r.instance]||0)+1,o),{}),withGuide:a.filter(r=>r.guide).length});
const meta={generated:new Date().toISOString(),candidates:C.length,bodiesRead:C.filter(c=>B[c.u]?.text).length,resolvedFromGoogle:C.filter(c=>c.u.includes('news.google.com')&&B[c.u]?.orig&&!B[c.u].orig.includes('news.google.com')).length,articles:stat(rows),cases:stat(cases)};
fs.writeFileSync(outFile,JSON.stringify({note:'비공개 시안. 사건 당사자 이름·기사 제목 미저장. 보도 기반 자동 추출이라 오류 가능.',meta,guide:Object.fromEntries(Object.entries(GUIDE).map(([k,v])=>[k,v])),cases},null,1));
console.log(JSON.stringify(meta,null,1));
