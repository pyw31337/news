// 판결 보도 → 구조화 (프로토타입, /admin 전용). 사건 당사자 이름은 저장하지 않음.
import fs from 'fs';
const [,, inFile, outFile] = process.argv;
const cands = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const CHARGES = [['사기','사기'],['횡령','횡령·배임'],['배임','횡령·배임'],['뇌물','뇌물'],['살인','살인'],['상해','폭력'],['폭행','폭력'],['음주','교통(음주·사망)'],['과속','교통(음주·사망)'],['교통사고','교통(음주·사망)'],['마약','마약'],['필로폰','마약'],['성폭','성범죄'],['강제추행','성범죄'],['절도','절도'],['공무집행방해','공무집행방해'],['체포방해','공무집행방해'],['선거법','선거'],['정치자금','선거'],['명예훼손','명예훼손'],['내란','내란'],['스토킹','스토킹'],['아동학대','아동학대']];
const UA = {'User-Agent':'Mozilla/5.0 (compatible; NewsBoardBot/1.0)'};
const strip = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/g,' ').replace(/\s+/g,' ');
function months(s){ // "징역 3년 6개월" → 42
  const m = s.match(/징역\s*(\d+)\s*년(?:\s*(\d+)\s*개?월)?|징역\s*(\d+)\s*개?월/); if(!m) return null;
  return m[3] ? +m[3] : (+m[1])*12 + (m[2]?+m[2]:0);
}
function parse(text, title, url, t){
  const all = title+' '+text;
  if (/구형/.test(title) && !/선고/.test(title)) return null;            // 구형은 판결 아님
  const r = {url, date:t||null};
  const court = all.match(/(서울중앙지법|서울고법|대법원|[가-힣]{2,6}(?:지방법원|지법|고등법원|고법)(?:\s?[가-힣]{2,4}지원)?)/); r.court = court?court[1]:null;
  const dept = all.match(/((?:형사|민사)?\s?(?:항소)?\d+-?\d*부)\(재판장\s?([가-힣]{2,4})\s?(?:부장)?판사\)/) || all.match(/(형사\d+-?\d*부)\s?\(?재판장\s([가-힣]{2,4})/);
  const judge = dept?dept[2]:(all.match(/재판장\s?(?:인|을 맡은)?\s?([가-힣]{2,4})\s?(?:부장판사|판사)/)||all.match(/([가-힣]{2,4})\s부장판사는/)||[])[1];
  r.dept = dept?dept[1].replace(/\s/g,''):null; r.judge = judge||null;
  const counsel = [...new Set([...all.matchAll(/변호인(?:인|단)?\s?(?:측)?\s?([가-힣]{2,4})\s?변호사/g)].map(m=>m[1]))];
  r.counsel = counsel.slice(0,3);
  r.charge = (CHARGES.find(([k])=>title.includes(k))||CHARGES.find(([k])=>text.slice(0,1500).includes(k))||[null,'기타'])[1];
  r.instance = /대법|상고/.test(title)?'3심':/2심|항소심|고법/.test(title)?'2심':'1심';
  const ttl = title;
  r.sentenceMonths = months(ttl);
  r.suspended = /집행유예|집유/.test(ttl);
  r.acquitted = /무죄/.test(ttl) && !r.sentenceMonths;
  r.fine = /벌금/.test(ttl) && !r.sentenceMonths;
  r.change = /감형/.test(ttl)?'감형':/가중|늘어/.test(ttl)?'가중':null;
  if (!r.sentenceMonths && !r.acquitted && !r.fine) return null;
  return r; // 제목·피고인 이름은 저장하지 않음
}
async function resolve(u){
  const res = await fetch(u,{headers:UA,redirect:'follow',signal:AbortSignal.timeout(12000)});
  return [res.url, await res.text()];
}
const out=[]; let i=0;
async function worker(){ while(i<cands.length){ const c=cands[i++];
  let text=''; try{ const [,h]=await resolve(c.u); text=strip(h).slice(0,20000);}catch{}
  const r=parse(text,c.t,c.u,c.d); if(r) out.push(r);} }
await Promise.all(Array.from({length:8},worker));
fs.writeFileSync(outFile, JSON.stringify({generated:new Date().toISOString(), note:'프로토타입. 사건 당사자 이름 미저장. 보도 기반 추출이라 오류 가능.', rulings:out},null,1));
console.log('candidates',cands.length,'rulings',out.length,'withJudge',out.filter(r=>r.judge).length,'withCounsel',out.filter(r=>r.counsel.length).length);
