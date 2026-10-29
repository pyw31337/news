# 판결 후보 기사: 구글뉴스 링크 → 원문 주소, 본문 텍스트 저장 (admin 시안용)
import json,sys,re,os,html,concurrent.futures as cf,urllib.request as ur
sys.path.insert(0,os.path.dirname(__file__))
from db import gdecode,UA
src,dst=sys.argv[1],sys.argv[2]
C=json.load(open(src)); cache=json.load(open(dst)) if os.path.exists(dst) else {}
def body(u):
    t=ur.urlopen(ur.Request(u,headers=UA),timeout=12).read()
    for enc in ('utf8','cp949'):
        try: t=t.decode(enc); break
        except: pass
    else: t=t.decode('utf8','ignore')
    t=re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>',' ',t); t=html.unescape(re.sub(r'<[^>]+>',' ',t))
    return re.sub(r'\s+',' ',t)[:30000]
def job(c):
    u=c['u']
    if u in cache and cache[u].get('text'): return u,cache[u]
    r={'orig':u}
    try:
        if 'news.google.com' in u: r['orig']=gdecode(u) or u
    except Exception as e: r['err']='decode'
    try: r['text']=body(r['orig']) if 'news.google.com' not in r['orig'] else ''
    except Exception: r['text']=''
    return u,r
with cf.ThreadPoolExecutor(6) as ex:
    for u,r in ex.map(job,C): cache[u]=r
json.dump(cache,open(dst,'w'),ensure_ascii=False)
print('total',len(C),'resolved',sum('news.google.com' not in v['orig'] for v in cache.values()),'withText',sum(bool(v.get('text')) for v in cache.values()))
