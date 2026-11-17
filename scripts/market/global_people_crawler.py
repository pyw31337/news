#!/usr/bin/env python3
"""글로벌 다국적 엘리트(미·중·유럽 정재계·언론·인플루언서) 인물 온톨로지 엔진 v1
- 수집 대상 영역:
  1. 정치·정책: 백악관, 연준(Fed), 미 의회, 중국 공산당 정치국, EU 집행위, 유럽중앙은행(ECB)
  2. 기업·투자: 빅테크 창업자, 매그니피센트7 CEO, 탑티어 VC(a16z, 피터틸), 국부펀드·월가 헤지펀드
  3. 언론·미디어: 블룸버그, CNBC, 로이터, WSJ, FT 주요 앵커·편집국장·미디어 오너
  4. 인플루언서·씽크탱크: 렉스 프리드먼, 조 로건, 올인 팟캐스트, 레이 달리오, 탈레브, 비탈릭 등 빅마우스
- 산출물: `data/market/global_people_roster.json`
"""

import os
import sys
import json
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MARKET_DIR = os.path.join(BASE_DIR, 'data', 'market')
os.makedirs(MARKET_DIR, exist_ok=True)

GLOBAL_PEOPLE_ROSTER = [
    # 1. 정치·거시정책 (Global Politics & Macro Policy)
    {
        'id': 'gp-trump',
        'name': '도널드 트럼프 (Donald J. Trump)',
        'region': '미국',
        'category': '정치·거시정책',
        'role': '제47대 미국 대통령 당선인',
        'organization': '미국 행정부 (백악관)',
        'education': '펜실베이니아 대학교 와튼스쿨 경제학 학사',
        'influence_rating': 'MAXIMUM (글로벌 증시·통상·관세 절대적 영향)',
        'core_agenda': ['보편적 관세 10~20% 및 대중 관세 60%', '법인세 15% 인하', '화석연료 증산', '정부 효율성 위원회(DOGE) 출범'],
        'key_network': ['일론 머스크 (DOGE 수장)', 'J.D. 밴스 (부통령)', '피터 틸 (초기 정치자금 후원)']
    },
    {
        'id': 'gp-powell',
        'name': '제롬 파월 (Jerome H. Powell)',
        'region': '미국',
        'category': '정치·거시정책',
        'role': '미국 연방준비제도(Fed) 의장',
        'organization': '미국 연방준비제도 (Federal Reserve)',
        'education': '프린스턴 대학교 정치학 학사 · 조지타운 대학교 법학 박사(J.D.)',
        'influence_rating': 'MAXIMUM (전세계 금리 및 자산 유동성 결정권자)',
        'core_agenda': ['물가상승률 2% 목표', '기준금리 인하 속도 조절(Data-Dependent)', '연준 독립성 수호'],
        'key_network': ['재닛 옐런 (재무장관)', '크리스틴 라가르드 (ECB 총재)', '이창용 (한국은행 총재)']
    },
    {
        'id': 'gp-xijinping',
        'name': '시진핑 (Xi Jinping)',
        'region': '중국',
        'category': '정치·거시정책',
        'role': '중국 공산당 총서기 겸 국가주석',
        'organization': '중국 공산당 중앙위원회 / 국무원',
        'education': '칭화 대학교 화학공학 학사 · 법학 박사',
        'influence_rating': 'MAXIMUM (중국 경기부양책, 대만 해협 리스크, 희토류 통제)',
        'core_agenda': ['신품질 생산력(AI·반도체·전기차 자립)', '10조 위안 지방정부 부채 해결', '공동부유'],
        'key_network': ['리창 (국무원 총리)', '허리펑 (경제부총리)', '왕이 (외교부장)']
    },
    {
        'id': 'gp-vonderleyen',
        'name': '우르줄라 폰데어라이엔 (Ursula von der Leyen)',
        'region': '유럽',
        'category': '정치·거시정책',
        'role': '유럽연합(EU) 집행위원장',
        'organization': '유럽연합 집행위원회 (European Commission)',
        'education': '런던정경대(LSE) 경제학 · 하노버 의과대학 의학 박사',
        'influence_rating': 'HIGH (EU AI 법(AI Act), 탄소국경조정세(CBAM), 반독점 규제)',
        'core_agenda': ['빅테크 DMA/DSA 독점 규제', '유럽 반도체법 및 친환경 전환', '대중국 디리스킹'],
        'key_network': ['에마뉘엘 마크롱 프랑스 대통령', '올라프 숄츠 독일 총리']
    },

    # 2. 기업 & 벤처투자 (Global Business & VCs)
    {
        'id': 'gp-jensen',
        'name': '젠슨 황 (Jensen Huang)',
        'region': '미국 (대만계)',
        'category': '기업·빅테크',
        'role': '엔비디아(NVIDIA) 창업자 겸 CEO',
        'organization': 'NVIDIA Corp.',
        'education': '오리건 주립대 전기공학 학사 · 스탠퍼드 대학교 전기공학 석사',
        'influence_rating': 'MAXIMUM (AI 시대 하드웨어 패권 장악)',
        'core_agenda': ['Blackwell B200 양산', 'HBM3E 전세계 공급망 장악', '피지컬 AI 및 휴머노이드'],
        'key_network': ['최태원 SK 회장 (HBM 직납)', '이재용 삼성전자 회장', '웨이저자 TSMC CEO']
    },
    {
        'id': 'gp-musk',
        'name': '일론 머스크 (Elon Musk)',
        'region': '미국',
        'category': '기업·빅테크',
        'role': '테슬라 CEO · xAI 설립자 · DOGE 수장',
        'organization': 'Tesla / SpaceX / xAI / X(구 트위터)',
        'education': '펜실베이니아 대학교 물리학·경제학 학사',
        'influence_rating': 'MAXIMUM (글로벌 테크·미국 정치·암호화폐 영향력 1위)',
        'core_agenda': ['FSD 자율주행 로보택시', 'Grok 3 및 Colossus 슈퍼컴퓨터', '화성 유인 탐사'],
        'key_network': ['도널드 트럼프 미국 대통령', '피터 틸 (페이팔 마피아 동맹)', '사티아 나델라 MS CEO']
    },
    {
        'id': 'gp-larryfink',
        'name': '래리 핑크 (Larry Fink)',
        'region': '미국',
        'category': '기업·투자금융',
        'role': '블랙록(BlackRock) 회장 겸 CEO',
        'organization': 'BlackRock (운용자산 10.5조 달러 세계 최대 자산운용사)',
        'education': 'UCLA 정치학 학사 · UCLA 앤더슨 경영대학원 MBA',
        'influence_rating': 'VERY HIGH (전세계 상장사 의결권 및 비트코인 현물 ETF 선도)',
        'core_agenda': ['비트코인 IBIT 현물 ETF 대중화', '글로벌 AI 데이터센터 인프라 펀드', '에너지 전환'],
        'key_network': ['전세계 50개국 정상', '워런 버핏', '제롬 파월']
    },
    {
        'id': 'gp-peterthiel',
        'name': '피터 틸 (Peter Thiel)',
        'region': '미국',
        'category': '벤처투자·사상가',
        'role': '파운더스 펀드 파트너 · 팰런티어 회장',
        'organization': 'Founders Fund / Palantir Technologies',
        'education': '스탠퍼드 대학교 철학 학사 · 스탠퍼드 로스쿨 법학 박사(J.D.)',
        'influence_rating': 'VERY HIGH (실리콘밸리 우파의 대부, 페이팔 마피아 수장)',
        'core_agenda': ['국방 AI 및 감시정찰 체계(Palantir AIP)', '트럼프 행정부 테크 각료 배출', '역노화·생명연장'],
        'key_network': ['J.D. 밴스 부통령 (벤처 제자)', '일론 머스크', '알렉스 카프 (팰런티어 CEO)', '샘 알트만']
    },
    {
        'id': 'gp-andreessen',
        'name': '마크 앤드리슨 (Marc Andreessen)',
        'region': '미국',
        'category': '벤처투자·테크사상가',
        'role': '앤드리슨 호로위츠(a16z) 공동창업자',
        'organization': 'Andreessen Horowitz (a16z)',
        'education': '일리노이 대학교 어배너-샴페인 컴퓨터과학 학사',
        'influence_rating': 'HIGH (실리콘밸리 벤처캐피털 1위, 테크 낙관주의 선언문 저자)',
        'core_agenda': ['테크노-낙관주의(Techno-Optimist Manifesto)', '오픈소스 AI 육성', '크립토 웹3 규제 완화'],
        'key_network': ['벤 호로위츠', '마크 저커버그', '일론 머스크', '브라이언 암스트롱 (코인베이스 CEO)']
    },

    # 3. 언론 & 미디어 (Global Press & Media)
    {
        'id': 'gp-mikebloomberg',
        'name': '마이클 블룸버그 (Michael Bloomberg)',
        'region': '미국',
        'category': '언론·미디어',
        'role': '블룸버그 LP 창립자 겸 대주주 (전 뉴욕시장)',
        'organization': 'Bloomberg LP',
        'education': '존스 홉킨스 대학교 전기공학 학사 · 하버드 경영대학원(HBS) MBA',
        'influence_rating': 'VERY HIGH (글로벌 35만 금융 터미널 및 속보 장악)',
        'core_agenda': ['글로벌 금융 정보 독점', '기후변화 도시 연합', '자선 사업 및 민주당 온건파 후원'],
        'key_network': ['월가 금융사 CEO 전원', '존 미클스웨이트 블룸버그 편집국장', '빌 게이츠']
    },
    {
        'id': 'gp-murdoch',
        'name': '루퍼트 머독 (Rupert Murdoch)',
        'region': '미국 / 호주',
        'category': '언론·미디어',
        'role': '뉴스 코퍼레이션(News Corp) 명예회장',
        'organization': 'News Corp (Wall Street Journal / Fox News)',
        'education': '옥스퍼드 대학교 우스터 칼리지 석사',
        'influence_rating': 'VERY HIGH (미국 보수 언론 및 월스트리트 저널 저널리즘 총괄)',
        'core_agenda': ['월가 오피니언 리더십', '미국 보수 진영 여론 형성', '디지털 유료 구독제 강화'],
        'key_network': ['라클란 머독 (후계자)', '도널드 트럼프', '월가 정재계 유력 인사']
    },
    {
        'id': 'gp-joekernen',
        'name': '조 케넌 (Joe Kernen)',
        'region': '미국',
        'category': '언론·미디어',
        'role': 'CNBC Squawk Box 수석 앵커',
        'organization': 'CNBC / NBCUniversal',
        'education': '콜로라도 대학교 분자생물학 학사 · MIT 석사',
        'influence_rating': 'HIGH (미국 증시 개장 전 월가 최고 영향력 생방송 진행)',
        'core_agenda': ['월가 CEO 및 정재계 거물 직격 인터뷰', '비트코인 제도권화 지지', '자유시장 자본주의'],
        'key_network': ['제이미 다이먼 (JP모건)', '켄 그리핀 (시타델)', '앤드루 로스 소킨 (CNBC/NYT)']
    },

    # 4. 인플루언서 & 씽크탱크 (Global Influencers & Thought Leaders)
    {
        'id': 'gp-lexfridman',
        'name': '렉스 프리드먼 (Lex Fridman)',
        'region': '미국 (러시아계)',
        'category': '인플루언서·미디어',
        'role': 'MIT AI 연구원 · 렉스 프리드먼 팟캐스트 진행자',
        'organization': 'Lex Fridman Podcast (구독자 450만명, 글로벌 지식인 대화 1위)',
        'education': '드렉셀 대학교 컴퓨터과학 학사·석사·박사',
        'influence_rating': 'VERY HIGH (일론 머스크, 샘 알트만, 베냐민 네타냐후 3시간 심층 대담)',
        'core_agenda': ['인간 중심 인공지능(AGI)', '오픈 토론 및 이념 극단주의 치유', '우주 생명체 탐구'],
        'key_network': ['일론 머스크 (최다 출연)', '샘 알트만', '마크 저커버그', '조 로건']
    },
    {
        'id': 'gp-allin',
        'name': '올인 팟캐스트 4인방 (All-In Podcast Team)',
        'region': '미국',
        'category': '인플루언서·빅마우스',
        'role': '실리콘밸리 억만장자 4인의 경제·정치 담론 쇼',
        'organization': 'All-In Podcast (차마스, 제이슨, 삭스, 프리드버그)',
        'education': '스탠퍼드·워털루·UC버클리 연합',
        'influence_rating': 'VERY HIGH (2024 대선 트럼프 테크 자금 유치 및 정책 형성 주도)',
        'core_agenda': ['실리콘밸리 자본의 정치 참여', 'AI 규제 철폐', '매크로 부채 위기 진단'],
        'key_network': ['데이비드 삭스 (트럼프 백악관 AI·암호화폐 차르 내정)', '일론 머스크', '도널드 트럼프']
    },
    {
        'id': 'gp-raydalio',
        'name': '레이 달리오 (Ray Dalio)',
        'region': '미국',
        'category': '사상가·헤지펀드',
        'role': '브리지워터 어소시에이츠(Bridgewater) 창립자',
        'organization': 'Bridgewater Associates / 원칙(Principles) 저자',
        'education': '롱아일랜드 대학교 금융학 학사 · 하버드 경영대학원(HBS) MBA',
        'influence_rating': 'VERY HIGH (글로벌 부채 주기, 미·중 패권 충돌 분석가)',
        'core_agenda': ['거대한 부채 사이클(Big Debt Crisis)', '미·중 신냉전 패권 주기', '올웨더(All-Weather) 자산배분'],
        'key_network': ['중국 고위 경제관료', '전세계 중앙은행 총재', '월가 기관투자가']
    },
    {
        'id': 'gp-vitalik',
        'name': '비탈릭 부테린 (Vitalik Buterin)',
        'region': '캐나다 (러시아계)',
        'category': '기술사상가·크립토',
        'role': '이더리움(Ethereum) 공동 창시자',
        'organization': 'Ethereum Foundation',
        'education': '워털루 대학교 중퇴 (피터 틸 펠로우십)',
        'influence_rating': 'HIGH (글로벌 500조 스마트 컨트랙트 및 웹3 생태계 설계자)',
        'core_agenda': ['탈중앙화 및 검열 저항성', '지분증명(PoS) 친환경 전환', '영지식증명(ZK-Rollups) 확장'],
        'key_network': ['피터 틸', '아서 헤이즈', '글로벌 오픈소스 암호학계']
    }
]

def build_global_people_registry():
    print("=== 글로벌 다국적 엘리트(정치·기업·언론·인플루언서) 인물 온톨로지 구축 시작 ===")
    
    registry = {
        'total_global_leaders': len(GLOBAL_PEOPLE_ROSTER),
        'categories': ['정치·거시정책', '기업·빅테크', '언론·미디어', '인플루언서·미디어', '벤처투자·사상가'],
        'regions': ['미국', '중국', '유럽', '글로벌'],
        'leaders': GLOBAL_PEOPLE_ROSTER,
        'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    output_path = os.path.join(MARKET_DIR, 'global_people_roster.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
        
    print(f"✔ 글로벌 다국적 엘리트 {len(GLOBAL_PEOPLE_ROSTER)}명 온톨로지 명부 적재 완료 ({output_path})")

if __name__ == '__main__':
    build_global_people_registry()
