"""person-v6 시안용 실제 데이터 묶음(이재명). 원천: 열린국회정보(pol/people), 아카이브 D1(person, graph),
위키데이터 고정 관계(graph/e), 데이터 브랜치 people_bio(진천군 동명이인 3건 제외), db/entities 기사 색인, history 브랜치 연표, today.json 썸네일."""
import json, collections, re
J=lambda f: json.load(open(f))
po=J('pol.json'); ar=J('person.json'); ag=J('graph.json'); se=J('edges_ljm.json'); bio=J('bio_ljm.json')
ent=J('ent.json'); hist=J('hist.json'); today=J('today.json')
HOM=re.compile(r'내과클리닉|의풍당당|내과의원|클리닉\s*원장|내과\s*원장')
out={}
out['profile']=dict(id=po['id'],name=po['name'],hanja=po['hanja'],en='Lee Jae-myung',role='대한민국 제21대 대통령',
  role_src='위키백과', party=po['party'], district=po['district'], reelect=po['reelect'], ages=po['ages'], committee=po['committees'],
  birth_official=po['birth'], birth_place=bio['birth_desc'].replace(' 출생',''), military=bio['military'],
  education='중앙대학교 법과대학 법학과 졸업', portrait='../../entity-profile/full/lee-jae-myung-official.webp',
  portrait_credit='Wikimedia Commons', wiki=ent['wiki']['url'])
# 생애 이벤트: 진천군(동명이인) 3건, 기사 1건 제외 → 공적 이벤트
ev=[]
for e in bio['events']:
  if '진천군' in e['title'] or e['typ']=='article': continue
  d=e['d'] or '1963'
  ev.append(dict(d=e['d'] or '', title=e['title'], desc=e['desc'].replace('【병역 사항】 ','').replace('\n• ',' · '), typ=e['typ'], stage=e['stage'], url=e.get('url')))
def key(e):
  m=re.match(r'(\d{4})',e['d']); return int(m.group(1)) if m else 1963
ev.sort(key=key)
out['events']=ev
out['history']=po['history']
out['terms']=po['terms']
out['bills']=po['bills']; out['assets']=po['assets']; out['votes']=po['votes']
out['archive_events']=ar['events']
# 관계: 위키데이터 고정 관계 + 국회 지역구 전·후임
L=se['L']; G=se['g']
def node(i):
  l=L.get(i) or [i,'',0]
  ph=('../../../data/pol/photos/'+i[4:]+'.webp') if i.startswith('pol:') else None
  return dict(id=i,name=l[0],field=l[1],photo=ph)
SUB={'member':'소속 정당','district':'지역구','spouse':'배우자','position':'역임 직위','employer':'소속 기관','birthplace':'출생지','educated':'출신 학교'}
PEER={'member':'같은 정당','district':'같은 지역구','position':'같은 직위','employer':'같은 기관','birthplace':'같은 고향','educated':'동문'}
CAT={'party':'정당','region':'지연','family':'가족','career':'공직','school':'학연'}
rel=[]
for o,t,sub,conf,src,dr in se['e']:
  if o.startswith('g:'):
    label=o.split(':',2)[2]
    rel.append(dict(cat=CAT[t],kind='group',name=label,role=SUB.get(sub,sub),peer=PEER.get(sub,''),src='국회 의원 정보' if src=='na' else '위키데이터',
      people=[node(x) for x in G.get(o,[])]))
  else:
    n=node(o); rel.append(dict(cat=CAT[t],kind='person',name=n['name'],role=SUB.get(sub,sub),src='위키데이터',people=[n]))
# 아카이브 전·후임(국회)
for e in ag['edges']:
  if e['b']==po['id'] and e['typ']=='predecessor':
    a=[n for n in ag['nodes'] if n['id']==e['a']][0]
    rel.append(dict(cat='지연',kind='person',name=a['name'],role='지역구 전임 (20대→21대)',src='열린국회정보',people=[dict(id='pol:'+a['id'],name=a['name'],field='정치',photo='../../../data/pol/photos/'+a['id']+'.webp',party=a['party'])]))
out['relations']=rel
ppl=set()
for r in rel:
  for p in r['people']: ppl.add(p['name'])
out['relations_people']=len(ppl)
# 기사 색인
arts=[a for a in ent['timeline'] if '이재명' in a['title'] and not HOM.search(a['title'])]
seen=set(); A=[]
for a in sorted(arts,key=lambda a:a['t'],reverse=True):
  k=re.sub(r'\s+','',a['title'])[:40]
  if k in seen: continue
  seen.add(k); A.append(dict(t=a['t'],title=re.sub(r'\s+-\s+[^-]+$','',a['title']),url=a['url'],press=a.get('press','')))
out['articles_total']=len(A)
out['articles']=A[:60]
daily=collections.Counter(a['t'][:10] for a in A)
out['articles_daily']=sorted(daily.items())
pc=collections.Counter(a['press'] for a in A if a['press'])
out['press_top']=pc.most_common(10); out['press_count']=len(pc)
# 썸네일 기사
th={}
def walk(o):
  if isinstance(o,dict):
    if 'title' in o and 'url' in o and '이재명' in str(o.get('title')):
      im=o.get('img') or o.get('image') or ''
      if 'workers.dev/m/img' in im: th.setdefault(im,dict(t=(o.get('t') or o.get('date') or '')[:16],title=o['title'],url=o['url'],press=o.get('press') or '',img=im))
    for v in o.values(): walk(v)
  elif isinstance(o,list):
    for v in o: walk(v)
walk(today)
out['photo_articles']=sorted(th.values(),key=lambda a:a['t'],reverse=True)
# 장기 연표(history 브랜치)
P=hist['o']; it=hist['it']
out['hist_total']=len(it)
yc=collections.Counter(x[0][:4] for x in it)
out['hist_years']=sorted(yc.items())
out['hist_cats']=collections.Counter(x[3] for x in it).most_common()
yc2=collections.defaultdict(collections.Counter)
for x in it: yc2[x[0][:4]][x[3]]+=1
out['hist_year_cats']={y:dict(c) for y,c in sorted(yc2.items())}
q=[dict(d=x[0],title=x[1],press=P[x[2]] if x[2]<len(P) else '',quote=x[4]) for x in it if len(x)>4 and x[3]=='발언']
out['quotes']=q[::-1][:12]
out['hist_items']=[dict(d=x[0],title=x[1],press=P[x[2]] if x[2]<len(P) else '',cat=x[3]) for x in it][::-1]
out['updated']='2026-11-11'
json.dump(out,open('/workspace/wt-pv6/showcase/person-v6/shared/data.json','w'),ensure_ascii=False)
print({k:(len(v) if isinstance(v,(list,dict)) else v) for k,v in out.items()})
print(out['press_top'][:5], out['hist_cats'])
for q_ in out['quotes'][:5]: print(q_)
