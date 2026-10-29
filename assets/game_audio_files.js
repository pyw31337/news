/* NewsBoard Game Audio - file-based SFX with Web Audio fallback
   2026-10-30
*/
(function(){
const BASE='assets/sfx/';
const FILES={
  click:'click.mp3',
  merge:'merge.mp3',
  explode:'explode.mp3',
  win:'win.mp3',
  fail:'fail.mp3',
  place:'place.mp3'
};
const cache={};
function load(name){
  return new Promise(res=>{
    if(cache[name])return res(cache[name]);
    const a=new Audio(BASE+FILES[name]);
    a.preload='auto';
    a.oncanplaythrough=()=>{cache[name]=a;res(a)};
    a.onerror=()=>res(null);
  });
}
async function playFile(name){
  if(window.NBGameFX&&!window.NBGameFX.SND.on)return;
  const a=await load(name);
  if(a){a.currentTime=0;a.play().catch(()=>{});return true;}
  return false;
}
window.NBAudioFile={
  async play(name){
    const ok=await playFile(name);
    if(!ok&&window.NBAudio)window.NBAudio.play(name);
  },
  preload(){Object.keys(FILES).forEach(load)}
};
document.addEventListener('pointerdown',()=>NBAudioFile.preload(),{once:true});
console.log('NBAudioFile ready');
})();
