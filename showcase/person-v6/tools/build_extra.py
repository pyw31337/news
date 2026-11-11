"""감사(누락 실데이터) 복구분을 data.json에 덧붙이고, 기사 전체 색인을 articles.json으로 분리.
원천: /workspace/pv6data 의 pol.json(열린국회정보), bio_ljm.json(people_bio), ent.json(db/entities). 실행: cd /workspace/pv6data && python3 build_extra.py"""
import json, re
J=lambda f: json.load(open(f))
OUT='/workspace/wt-pv6/showcase/person-v6/shared/'
D=J(OUT+'data.json'); po=J('pol.json'); bio=J('bio_ljm.json'); ent=J('ent.json')
# 1) 생애 이벤트 출처(people_bio의 src/url)
src={e['title']:(e.get('src'),e.get('url')) for e in bio['events']}
for e in D['events']:
  s,u=src.get(e['title'],(None,None)); e['src']=s; e['url']=u
# 2) 국회 등록 경력 12개 → 같은 경력의 생애 이벤트 날짜를 그대로 붙임(없으면 날짜 없음)
MATCH={'더불어민주당 대표':'당대표','제35대 경기도 도지사':'제35대 경기도지사','민선 5, 6기 성남시장':'성남시장',
  '성남시립병원설립추진위원회 공동대표':'성남시립병원','제28회 사법시험 합격':'사법시험','중앙대학교 법과대학 법학과 졸업':'중앙대학교',
  '중·고교 검정고시':'검정고시','삼계초등학교 졸업':'삼계국민학교'}
GRP={'성남시립병원설립추진위원회 공동대표':'시민사회','성남참여자치연대 집행위원장':'시민사회','민주사회를위한변호사모임 국제연대위원':'시민사회',
  '중앙대학교 법과대학 법학과 졸업':'학업','중·고교 검정고시':'학업','삼계초등학교 졸업':'학업'}
reg=[]
for h in po['history']:
  k=MATCH.get(h); ds=[e['d'] for e in D['events'] if k and k in e['title'] and '후보' not in e['title']]
  d=(ds[0].split('~')[0]+'~'+ds[-1].split('~')[-1]) if len(ds)>1 else (ds[0] if ds else '')
  if k=='검정고시': d=' · '.join(ds)
  reg.append(dict(title=h,d=d,grp=GRP.get(h,'공직·법조')))
D['career_reg']=reg
D['career_reg_src']=po['sources'][0]
# 3) 국회 기본 정보
D['profile'].update(party_switches=len(po['party_switches']),kind=po['terms'][0]['kind'],homepage=po.get('homepage'))
D['bills']['portal']='https://likms.assembly.go.kr/bill/main.do'
# 4) 출처: 위키백과, 국회, people_bio
D['sources']=dict(wiki=ent['wiki'],pol=po['sources'][0],bills=po['bills']['source'],votes=po['votes']['source'],assets=po['assets']['source'])
# 5) NewsBoard 오늘의 이슈 연결
D['issues']=[dict(d=e['d'],title=e['title'],url=e['url'],src=e['src']) for e in bio['events'] if e['typ']=='article']
# 6) 기사 전체(2,703) → articles.json (첫 60건은 data.json에 그대로)
HOM=re.compile(r'내과클리닉|의풍당당|내과의원|클리닉\s*원장|내과\s*원장')
arts=[a for a in ent['timeline'] if '이재명' in a['title'] and not HOM.search(a['title'])]
seen=set(); A=[]
for a in sorted(arts,key=lambda a:a['t'],reverse=True):
  k=re.sub(r'\s+','',a['title'])[:40]
  if k in seen: continue
  seen.add(k); A.append([a['t'][:16],re.sub(r'\s+-\s+[^-]+$','',a['title']),a['url'],a.get('press','')])
assert len(A)==D['articles_total'],(len(A),D['articles_total'])
json.dump(A,open(OUT+'articles.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(D,open(OUT+'data.json','w'),ensure_ascii=False)
print(len(A), reg, D['issues'], D['profile'])
