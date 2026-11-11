#!/usr/bin/env python3
"""
대한민국 엘리트·공공 인물 종합 관계망 추출 파이프라인 (초고속 pypdfium2 엔진)
1. 국회공보 재산등록 PDF(2016~2026 전수) -> 국회의원 직계 가족망 전수 추출
2. 고위공직자(장·차관), 대기업 총수/임원, 법조인(판검사·변호사), 언론인(기자·앵커) 통합 (people_bio.json 78,868명 연계)
3. 학연(대학·사법연수원 기수), 지연(고향), 가족(직계·친인척), 직무(부처·기관·기업·언론사) 상호 교차망(Cross-Link) 구축
결과물: news/data/elite_network.json, pol/pdata/elite_network.json
"""
import os, sys, re, json, time, glob, datetime

BASE_DIR = '/Users/pyw31337/Developer/newsboard-local'
NEWS_DATA = os.path.join(BASE_DIR, 'news/data')
POL_DATA = os.path.join(BASE_DIR, 'pol/pdata')
GONGBO_DIR = os.path.join(BASE_DIR, 'pol/gongbo')

try:
    import pypdfium2 as pdfium
except ImportError:
    print("pypdfium2 required")
    sys.exit(1)

t0 = time.time()
print("=== 대한민국 엘리트 종합 관계망 구축 시작 ===")

# 1. 국회의원 색인 로드
pol_index_file = os.path.join(POL_DATA, 'index.json')
pol_map = {}
if os.path.exists(pol_index_file):
    with open(pol_index_file, encoding='utf-8') as f:
        pdata = json.load(f)
        for p in pdata.get('people', []):
            name = p.get('name')
            if name not in pol_map or p.get('current'):
                pol_map[name] = p

print(f"1. 국회의원 색인 로드: {len(pol_map)}명")

# 2. 공공 인물 바이오 DB 로드
bio_file = os.path.join(NEWS_DATA, 'people_bio.json')
bio_db = {}
if os.path.exists(bio_file):
    with open(bio_file, encoding='utf-8') as f:
        bio_db = json.load(f)
elif os.path.exists(bio_file + '.gz'):   # 2026-11-11부터 git에는 압축본만(원본 판본은 R2 ledger/raw/people-bio)
    import gzip
    with gzip.open(bio_file + '.gz', 'rt', encoding='utf-8') as f:
        bio_db = json.load(f)
print(f"2. 공공 인물 바이오 DB 로드: {len(bio_db)}명")

# 3. 국회공보 PDF 전수 파싱 (pypdfium2 고속 엔진)
member_pattern = re.compile(r'소속\s*국회\s*직위\s*(\S+)\s*성명\s*([가-힣]{2,5})')
rel_pattern = re.compile(r'^(본인|배우자|부|모|장남|차남|삼남|사남|장녀|차녀|삼녀|사녀|손자\d*|손녀\d*|외손자\d*|외손녀\d*|시부|시모|장인|장모|조부|조모|외조부|외조모)')

pdf_files = sorted(glob.glob(os.path.join(GONGBO_DIR, '*.pdf')), reverse=True)
print(f"3. 국회공보 PDF {len(pdf_files)}개 파일 전수 파싱 시작...")

family_records = {} # member_name -> { role, party, district, id, families: {} }
parsed_pdf_count = 0
total_pages_parsed = 0

for gpath in pdf_files:
    fname = os.path.basename(gpath)
    try:
        pdf = pdfium.PdfDocument(gpath)
        pcount = len(pdf)
        total_pages_parsed += pcount
        parsed_pdf_count += 1
        cur_member = None
        
        for i in range(pcount):
            page = pdf[i]
            text = page.get_textpage().get_text_range()
            if not text:
                continue
                
            for line in text.split('\n'):
                line = line.strip()
                m = member_pattern.search(line)
                if m:
                    cur_member = m.group(2)
                    if cur_member not in family_records:
                        pol_info = pol_map.get(cur_member, {})
                        family_records[cur_member] = {
                            'name': cur_member,
                            'role': m.group(1),
                            'party': pol_info.get('party', ''),
                            'district': pol_info.get('district', ''),
                            'id': pol_info.get('id', ''),
                            'families': {}
                        }
                elif cur_member and cur_member in family_records:
                    rm = rel_pattern.match(line)
                    if rm:
                        rel = rm.group(1)
                        if rel != '본인':
                            if rel not in family_records[cur_member]['families']:
                                family_records[cur_member]['families'][rel] = {
                                    'rel': rel,
                                    'assets_summary': [],
                                    'refused': False,
                                    'refuse_reason': '',
                                    'gongbo_year': fname[:4]
                                }
                            fam_obj = family_records[cur_member]['families'][rel]
                            if '고지거부' in line:
                                fam_obj['refused'] = True
                                if '독립생계' in line: fam_obj['refuse_reason'] = '독립생계유지'
                                elif '타인부양' in line: fam_obj['refuse_reason'] = '타인부양'
                            elif len(fam_obj['assets_summary']) < 4 and len(line) > 10:
                                fam_obj['assets_summary'].append(line[:80])
    except Exception as e:
        print(f"Error parsing {fname}: {e}")

total_fam_members = sum(len(d['families']) for d in family_records.values())
print(f"   -> {parsed_pdf_count}개 PDF, 총 {total_pages_parsed}페이지 파싱 완료!")
print(f"   -> 국회의원 {len(family_records)}명 대상, 공보 기재 가족 관계 총 {total_fam_members}명 추출 완료!")

# 4. 공공 엘리트 범주화 (기업인, 법조인, 고위공직자, 언론인)
groups = {
    'corporate': {},
    'legal': {},
    'official': {},
    'reporter': {}
}

school_network = {} # school_name -> [names]
exam_network = {}   # '사법연수원18기' -> [names]
region_network = {} # region_name -> [names]

for name, data in bio_db.items():
    if not isinstance(name, str) or name.isdigit():
        continue
    kind = data.get('kind')
    role = data.get('role_title', '')
    org = data.get('org', '')
    
    entry = {
        'name': name,
        'kind': kind,
        'role': role,
        'org': org,
        'birth': data.get('birth_desc', ''),
        'military': data.get('military', ''),
        'schools': [],
        'exams': []
    }
    
    for ev in data.get('events', []):
        t = ev.get('title', '')
        sm = re.search(r'([가-힣]+(대학교|대학원|고등학교))', t)
        if sm:
            sch = sm.group(1)
            entry['schools'].append(sch)
            if sch not in school_network: school_network[sch] = []
            school_network[sch].append(name)
        em = re.search(r'(사법시험\s*\d+회|사법연수원\s*\d+기)', t)
        if em:
            exam = em.group(1).replace(' ', '')
            entry['exams'].append(exam)
            if exam not in exam_network: exam_network[exam] = []
            exam_network[exam].append(name)

    b = data.get('birth_desc', '')
    rm = re.search(r'([가-힣]+(시|군|구|도))', b)
    if rm:
        reg = rm.group(1)
        entry['region'] = reg
        if reg not in region_network: region_network[reg] = []
        region_network[reg].append(name)

    if kind in groups:
        groups[kind][name] = entry

# 언론사 기자 명단(reporters.json) 추가 병합
reporters_file = os.path.join(NEWS_DATA, 'reporters.json')
if os.path.exists(reporters_file):
    with open(reporters_file, encoding='utf-8') as f:
        reps = json.load(f)
        for r in reps:
            rname = r.get('name')
            if rname and rname not in groups['reporter']:
                groups['reporter'][rname] = {
                    'name': rname,
                    'kind': 'reporter',
                    'role': f"{r.get('press', '언론사')} 출입 기자",
                    'org': r.get('press', ''),
                    'photo': r.get('photo', ''),
                    'schools': [],
                    'exams': []
                }

print(f"4. 공공 엘리트 인덱스 완성:")
print(f"   - 기업인 및 대기업 주요 임원: {len(groups['corporate'])}명")
print(f"   - 법조인 (판사·검사·변호사·변리사): {len(groups['legal'])}명")
print(f"   - 고위공직자 (장관·차관·청장·지자체장): {len(groups['official'])}명")
print(f"   - 언론인 (방송 앵커·보도국장·기자): {len(groups['reporter'])}명")
print(f"   - 학연(대학) 클러스터: {len(school_network)}개 학교")
print(f"   - 사법시험/연수원 동기 클러스터: {len(exam_network)}개 기수")

# 5. Master Elite Network 통합 DB 조립
elite_network = {
    'updated': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    'counts': {
        'assembly_members': len(family_records),
        'assembly_families': total_fam_members,
        'corporate': len(groups['corporate']),
        'legal': len(groups['legal']),
        'official': len(groups['official']),
        'reporter': len(groups['reporter']),
        'school_clusters': len([k for k, v in school_network.items() if len(v) >= 5]),
        'exam_clusters': len(exam_network)
    },
    'assembly_families': family_records,
    'corporate_leaders': groups['corporate'],
    'legal_elites': groups['legal'],
    'high_officials': groups['official'],
    'journalists': groups['reporter'],
    'academic_clusters': {k: list(set(v)) for k, v in school_network.items() if len(v) >= 5},
    'judicial_exam_clusters': {k: list(set(v)) for k, v in exam_network.items()},
    'regional_clusters': {k: list(set(v)) for k, v in region_network.items() if len(v) >= 3}
}

out_news = os.path.join(NEWS_DATA, 'elite_network.json')
out_pol = os.path.join(POL_DATA, 'elite_network.json')

with open(out_news, 'w', encoding='utf-8') as f:
    json.dump(elite_network, f, ensure_ascii=False, indent=2)

with open(out_pol, 'w', encoding='utf-8') as f:
    json.dump(elite_network, f, ensure_ascii=False, indent=2)

size_mb = os.path.getsize(out_news) / 1024 / 1024
print(f"5. 엘리트 종합 데이터베이스 저장 완료: {out_news} ({size_mb:.2f} MB)")
print(f"=== 전 과정 성공 완료 (총 소요 시간: {time.time()-t0:.2f}초) ===")
