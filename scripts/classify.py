"""이슈 카테고리 분류 v2
점수 = 언론사 섹션(가장 믿을 만함) + 주체(정당·정치인·기관) + 주제어.
- 정치 주체(정당·현직/전직 의원·대통령·영부인 등)가 제목 다수에 나오면 '골프·올림픽' 같은 주제어보다 우선.
- '올림픽공원'처럼 장소 이름 속 주제어는 지운 뒤 센다.
- 결과: (카테고리, 신뢰도 0~1, 근거 목록). 신뢰도가 낮으면 enrich.py에서 AI가 한 번 더 판정.
"""
import re, json, os, collections, urllib.request

CATS = ['정치', '경제', '사회', '세계', 'IT', '과학', '건강', '환경', '문화', '연예', '스포츠']
SECT = {'정치': '정치', '경제': '경제', '사회': '사회', '세계': '세계', 'IT·과학': 'IT', 'IT': 'IT', '과학': '과학', '건강': '건강', '환경': '환경', '문화': '문화', '연예': '연예', '스포츠': '스포츠', '생활·문화': '문화'}
# 장소·고유명사 안의 주제어 (센다면 오분류)
MASK = r'올림픽공원|올림픽대로|올림픽선수촌|올림픽로|월드컵경기장|월드컵공원|월드컵대교|골프장 ?인허가|야구장 ?부지|축구장 ?부지|방송통신위|영화진흥위|가수원동'
PARTY = r'민주당|더불어민주|국민의힘|국힘|조국혁신당|혁신당|개혁신당|진보당|정의당|기본소득당|여당|야당|여야|민주,|민주 |與|野'
TITLE = r'대통령|李|尹|金여사|김건희|여사|대통령실|국회|의원|장관|총리|당대표|원내대표|최고위|당권|위원장|비대위|특검|탄핵|선관위|투표지|투표함|개표|선거|공천|지선|총선|대선|청와대|용산'
INST = {'경제': r'한국은행|금통위|기재부|재정경제부|금융위|금감원|공정위|코스피|코스닥',
        '사회': r'경찰|검찰|법원|소방|교육청|질병청|복지부',
        '세계': r'백악관|美 |中 |日 |트럼프|시진핑|푸틴|유엔|NATO|나토',
        '과학': r'과기정통부|천문연|연구원|우주청|NASA|노벨상',
        '건강': r'질병청|식약처|보건복지부|병원|의대|백신',
        '환경': r'기상청|환경부|탄소|미세먼지|기후',
        '문화': r'문체부|국립|박물관|미술관|공연|전시'}
WORDS = {'정치': '대통령 국회 의원 여당 야당 장관 특검 총리 정당 선거 탄핵 정치 보수 진보 고발 고소 공천 당권 투표 개표',
 '경제': '주가 증시 매출 영업이익 증권 반도체 금리 환율 부동산 아파트 주주 배당 투자 기업 실적 수출 은행 HBM 메모리 코인 비트코인',
 '사회': '사건 사고 시신 피의자 재판 병원 교수 의대 학교 화재 사망 체포 구속 응급 살해 유기',
 '세계': '미국 중국 일본 이스라엘 러시아 우크라이나 유럽 정상회담 스페인 영국 프랑스',
 'IT': 'AI 인공지능 해킹 앱 플랫폼 스마트폰 애플 구글 네이버 카카오 오픈AI 보안',
 '과학': '우주 과학 연구 논문 실험 로켓 천문 물리 화학 생명 노벨 연구진 기술원',
 '건강': '건강 의료 질병 백신 치료 환자 병원 의사 감염 암 비만 식품 식약처',
 '환경': '기후 환경 탄소 폭염 한파 태풍 산불 미세먼지 재생에너지 생태 해양',
 '문화': '문화 전시 공연 미술 책 출판 여행 축제 유산 박물관 예술 문학',
 '연예': '배우 가수 아이돌 드라마 영화 예능 열애 임신 컴백 앨범 데뷔',
 '스포츠': '야구 축구 농구 배구 골프 감독 선수 리그 월드컵 올림픽 KBO 손흥민 대표팀 우승 경기'}
# 의원이 아닌 주요 정치인 (DB 보강)
EXTRA_POL = '이재명 윤석열 김건희 한동훈 오세훈 이준석 유시민 조국 홍준표 안철수 김문수 정청래 장동혁 김민석 우원식 추미애 박지원 진성준 주진우'.split()

_POL = None
def politicians():
    """정치인 DB(politicians 브랜치 → 사이트 사본) 이름 + 기본 명단. 실패해도 기본 명단으로 동작."""
    global _POL
    if _POL is not None: return _POL
    names = set(EXTRA_POL)
    for p in ('pol_db/index.json', 'data/pol/index.json'):
        if os.path.exists(p):
            try: names |= {x['name'] for x in json.load(open(p))['people'] if x.get('current') or x.get('inc')}
            except Exception: pass
    if len(names) < 50:
        try:
            r = urllib.request.urlopen('https://pyw31337.github.io/news/data/pol/index.json', timeout=15)
            names |= {x['name'] for x in json.loads(r.read())['people'] if x.get('current')}
        except Exception: pass
    _POL = {n for n in names if len(n) >= 3}
    return _POL

def political_hits(t):
    t2 = re.sub(MASK, ' ', t)
    hits = re.findall(PARTY, t2) + re.findall(TITLE, t2)
    hits += [n for n in politicians() if n in t2]
    return hits

def categorize(titles, sect=None):
    sect = sect or {}
    sc = collections.Counter(); why = collections.defaultdict(list)
    n = max(1, len(titles))
    total_sect = sum(sect.values()) or 1
    for k, v in sect.items():
        c = SECT.get(k)
        if c: sc[c] += 2.5 * min(1, v / n) + 0.3; why[c].append('섹션 %s %d' % (k, v))
    pol_titles = 0
    for t in titles:
        t2 = re.sub(MASK, ' ', t)
        h = political_hits(t)
        if h: pol_titles += 1
        for cat, ws in WORDS.items():
            m = sum(1 for w in ws.split() if w in t2)
            if m: sc[cat] += min(m, 2) / n
        for cat, rx in INST.items():
            if re.search(rx, t2): sc[cat] += 0.8 / n
    share = pol_titles / n
    if share: sc['정치'] += 2.0 * share; why['정치'].append('정치 주체 %d/%d건' % (pol_titles, n))
    if not sc: return '사회', 0.3, ['근거 부족']
    best = sc.most_common(1)[0][0]
    # 정치 주체 우선 규칙: 스포츠·연예 주제어가 정치 주체를 이기지 못하게
    if best in ('스포츠', '연예') and share >= 0.3:
        why['정치'].append('정치 주체 우선(%s→정치)' % best); best = '정치'
    vals = sorted(sc.values(), reverse=True)
    conf = round(vals[0] / (vals[0] + (vals[1] if len(vals) > 1 else 0) + 0.5), 2) if best == sc.most_common(1)[0][0] else 0.6
    return best, conf, why[best][:3]
