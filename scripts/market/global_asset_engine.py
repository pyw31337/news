#!/usr/bin/env python3
"""독립 자산시장 인텔리전스 '렛츠에셋(Let's Asset / Market Intelligence)' 코어 엔진 v1
- 뉴스보드의 '마켓' 기능을 순수 이슈/뉴스와 분리하여, 국내/해외 기업·인물·자산시장 온톨로지 독립 서비스로 구축
- 4대 코어 데이터셋 구축:
  1. 글로벌 빅테크·제조·반도체 기업 도시에: NVIDIA, Apple, Microsoft, Tesla, TSMC, ASML, OpenAI, SoftBank 등
  2. 글로벌 핵심 기업인·창업자·투자자 네트워크: 젠슨 황, 일론 머스크, 팀 쿡, 샘 알트만, 손정의, 버핏 등 학연·경력·지분
  3. 국내 ⇄ 해외 크로스-보더 서플라이체인 및 지분·동맹망 (HBM 삼각동맹, EUV 독점, 배터리 공급망, ARM 생태계)
  4. 주식·국채금리·선물원자재·환율 매크로 멀티 자산 지표 (S&P500, SOX, 미 국채 10년물, 금, 구리, WTI, 환율)
- 산출물:
  - `data/market/global_corps.json`
  - `data/market/global_people.json`
  - `data/market/global_supply_chain.json`
  - `data/market/macro_assets.json`
  - `data/market/asset_ontology.json`
"""

import os
import sys
import json
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MARKET_DIR = os.path.join(BASE_DIR, 'data', 'market')
os.makedirs(MARKET_DIR, exist_ok=True)

GLOBAL_CORPS = {
    'NVDA': {
        'name': '엔비디아 (NVIDIA)',
        'ticker': 'NVDA',
        'exchange': 'NASDAQ',
        'country': '미국',
        'sector': 'AI 가속기 / GPU / 데이터센터 반도체',
        'market_cap_trillion_krw': 4750.0, # 약 3.5조 달러
        'ceo': '젠슨 황 (Jensen Huang)',
        'foundation_year': 1993,
        'headquarters': '미국 캘리포니아 산타클라라',
        'key_products': ['Blackwell B200', 'Hopper H100/H200', 'CUDA 생태계'],
        'kr_supply_partners': ['SK하이닉스 (HBM3E 메인 공급사)', '삼성전자 (HBM3E 공급망 진입)', '한미반도체 (TC본더 간접 연계)']
    },
    'AAPL': {
        'name': '애플 (Apple)',
        'ticker': 'AAPL',
        'exchange': 'NASDAQ',
        'country': '미국',
        'sector': 'IT 모바일 디바이스 / 플랫폼 / 소프트웨어',
        'market_cap_trillion_krw': 4680.0,
        'ceo': '팀 쿡 (Tim Cook)',
        'foundation_year': 1976,
        'headquarters': '미국 캘리포니아 쿠퍼티노',
        'key_products': ['iPhone 16', 'MacBook', 'Apple Intelligence', 'M4 칩셋'],
        'kr_supply_partners': ['삼성디스플레이 (OLED 패널)', 'LG이노텍 (카메라 모듈)', 'LG디스플레이']
    },
    'MSFT': {
        'name': '마이크로소프트 (Microsoft)',
        'ticker': 'MSFT',
        'exchange': 'NASDAQ',
        'country': '미국',
        'sector': '클라우드 / 엔터프라이즈 AI / 생산성 소프트웨어',
        'market_cap_trillion_krw': 4250.0,
        'ceo': '사티아 나델라 (Satya Nadella)',
        'foundation_year': 1975,
        'headquarters': '미국 워싱턴주 레드먼드',
        'key_products': ['Azure Cloud', 'Copilot', 'Windows', 'OpenAI 49% 전략적 제휴'],
        'kr_supply_partners': ['삼성전자 (클라우드 데이터센터 SSD)', 'SK하이닉스 (서버용 DDR5)']
    },
    'TSM': {
        'name': 'TSMC (대만적체전로제조)',
        'ticker': 'TSM',
        'exchange': 'NYSE (ADR) / TWSE',
        'country': '대만',
        'sector': '파운드리 (반도체 위탁생산 글로벌 1위, 점유율 62%)',
        'market_cap_trillion_krw': 1350.0,
        'ceo': '웨이저자 (C.C. Wei)',
        'foundation_year': 1987,
        'headquarters': '대만 신주 과학단지',
        'key_products': ['3nm/2nm 최첨단 파운드리', 'CoWoS 첨단 패키징'],
        'kr_supply_partners': ['SK하이닉스 (HBM 베이스 다이 TSMC 생산 협력)', '삼성전자 (파운드리 경쟁 관계)']
    },
    'ASML': {
        'name': 'ASML 홀딩 (ASML Holding)',
        'ticker': 'ASML',
        'exchange': 'NASDAQ / Euronext',
        'country': '네덜란드',
        'sector': '반도체 노광장비 (EUV 독점)',
        'market_cap_trillion_krw': 480.0,
        'ceo': '크리스토프 푸케 (Christophe Fouquet)',
        'foundation_year': 1984,
        'headquarters': '네덜란드 벨트호벤',
        'key_products': ['High-NA EUV 노광장비', 'DUV 노광장비'],
        'kr_supply_partners': ['삼성전자 (EUV 장비 주요 고객 및 R&D 공동 연구센터)', 'SK하이닉스 (EUV 도입)']
    },
    'TSLA': {
        'name': '테슬라 (Tesla)',
        'ticker': 'TSLA',
        'exchange': 'NASDAQ',
        'country': '미국',
        'sector': '전기차 / 자율주행 FSD / 휴머노이드 로봇(Optimus)',
        'market_cap_trillion_krw': 1180.0,
        'ceo': '일론 머스크 (Elon Musk)',
        'foundation_year': 2003,
        'headquarters': '미국 텍사스 오스틴',
        'key_products': ['Model Y/3', 'Cybercab', 'Full Self-Driving', 'Energy Storage'],
        'kr_supply_partners': ['LG에너지솔루션 (원통형 배터리 셀)', '현대자동차 (글로벌 전기차 경쟁사)']
    },
    'SOFTBANK': {
        'name': '소프트뱅크 그룹 (SoftBank Group)',
        'ticker': '9984',
        'exchange': 'TSE',
        'country': '일본',
        'sector': '글로벌 테크 투자 / AI 생태계',
        'market_cap_trillion_krw': 165.0,
        'ceo': '손정의 (Masayoshi Son)',
        'foundation_year': 1981,
        'headquarters': '일본 도쿄 미나토구',
        'key_products': ['ARM (90% 지분 보유)', 'Vision Fund 1 & 2', '라인야후 지분'],
        'kr_supply_partners': ['네이버 (라인야후 지분 합작 파트너)', '삼성전자 (ARM 아키텍처 라이선스 협력)']
    }
}

GLOBAL_PEOPLE = [
    {
        'name': '젠슨 황 (Jensen Huang)',
        'role': '엔비디아(NVIDIA) 창업자 겸 CEO',
        'birth_year': 1963,
        'nationality': '미국 (대만계)',
        'education': '오리건 주립대학교 전기공학 학사 · 스탠퍼드 대학교 전기공학 석사',
        'career': 'LSI 로직 엔지니어 ➔ AMD 마이크로프로세서 설계 ➔ 1993년 엔비디아 창업',
        'net_worth_trillion_krw': 175.0,
        'key_network': ['최태원 SK그룹 회장과 HBM 직거래 회동', '이재용 삼성전자 회장과 협력 논의', 'TSMC 모리스 창 선대회장과 30년 동맹'],
        'influence_sector': 'AI 가속기, HBM 공급망, 전세계 주식시장 모멘텀'
    },
    {
        'name': '일론 머스크 (Elon Musk)',
        'role': '테슬라 CEO · 스페이스X CEO · xAI 창업자',
        'birth_year': 1971,
        'nationality': '미국 (남아공 출생)',
        'education': '펜실베이니아 대학교 경제학·물리학 학사 · 스탠퍼드 재료과학 박사 중퇴',
        'career': 'Zip2 창업 ➔ 페이팔(PayPal) 공동창업 ➔ 스페이스X·테슬라 창업 ➔ xAI 설립',
        'net_worth_trillion_krw': 380.0,
        'key_network': ['피터 틸과 페이팔 마피아 동맹', '트럼프 정부 효율성위원회(DOGE) 수장', 'LG엔솔 권영수·김동명 배터리 공급 라인'],
        'influence_sector': '전기차, 우주항공, 로보틱스, 정치 자금, 글로벌 금융'
    },
    {
        'name': '손정의 (Masayoshi Son)',
        'role': '소프트뱅크 그룹(SoftBank) 회장 겸 CEO',
        'birth_year': 1957,
        'nationality': '일본 (한국계 3세)',
        'education': 'UC 버클리 경제학·컴퓨터과학 학사',
        'career': '1981년 소프트뱅크 설립 ➔ 야후 재팬 투자 ➔ 알리바바 마윈 발굴 ➔ ARM 38조 인수 ➔ 초지능(ASI) 펀드 결성',
        'net_worth_trillion_krw': 42.0,
        'key_network': ['이해진 네이버 GIO와 라인야후 협상', '샘 알트만과 AI 칩 합작회사 추진', '빈 살만 사우디 왕세자 PIF 자금 유치'],
        'influence_sector': 'AI 반도체 IP(ARM), 벤처캐피털, 글로벌 사모펀드'
    },
    {
        'name': '샘 알트만 (Sam Altman)',
        'role': '오픈AI(OpenAI) 창업자 겸 CEO',
        'birth_year': 1985,
        'nationality': '미국',
        'education': '스탠퍼드 대학교 컴퓨터과학 중퇴',
        'career': '루프트(Loopt) 창업 ➔ 와이콤비네이터(Y Combinator) 대표 ➔ 2015년 오픈AI 공동창립',
        'net_worth_trillion_krw': 2.8,
        'key_network': ['사티아 나델라 MS CEO', '삼성전자 평택 캠퍼스 방문 및 경계현/전영현 회동', 'SK 최태원 회장과 스타게이트 협력'],
        'influence_sector': '생성형 AI, 프론티어 LLM, 글로벌 AI 데이터센터 인프라'
    },
    {
        'name': '워런 버핏 (Warren Buffett)',
        'role': '버크셔 해서웨이(Berkshire Hathaway) 회장 겸 CEO',
        'birth_year': 1930,
        'nationality': '미국',
        'education': '네브래스카 대학교 학사 · 컬럼비아 경영대학원 석사 (벤저민 그레이엄 사사)',
        'career': '버크셔 해서웨이 인수 후 종합 투자 지주사 변모, 60년간 연평균 복리 20% 신화',
        'net_worth_trillion_krw': 195.0,
        'key_network': ['고(故) 찰리 멍거', '빌 게이츠', '일본 5대 종합상사 지분 9% 보유'],
        'influence_sector': '가치투자, 미국 채권 및 현금 비중, 글로벌 거시경제 바로미터'
    }
]

GLOBAL_SUPPLY_CHAIN_EDGES = [
    {
        'source': 'SK하이닉스 (000660)',
        'target': '엔비디아 (NVDA)',
        'relation': 'SUPPLIES_HBM3E_EXCLUSIVE',
        'relation_label': 'HBM3E 독점 및 주력 공급',
        'description': '엔비디아 H100 및 Blackwell B200 AI 가속기에 탑재되는 고대역폭메모리 HBM3E 8단/12단 전세계 최고 수율 독점 공급'
    },
    {
        'source': '삼성전자 (005930)',
        'target': '엔비디아 (NVDA)',
        'relation': 'QUAL_TESTING_HBM3E',
        'relation_label': 'HBM3E 12단 퀄테스트 및 공급망 진입',
        'description': '엔비디아 블랙웰 플랫폼 납품을 위한 최종 퀄테스트 진행 및 패키징 공정 다변화 협상'
    },
    {
        'source': 'ASML (ASML)',
        'target': 'TSMC (TSM)',
        'relation': 'SUPPLIES_HIGH_NA_EUV',
        'relation_label': 'High-NA EUV 노광장비 공급',
        'description': '대당 5,000억원에 달하는 극자외선(EUV) 노광장비를 TSMC 2나노 공정에 최우선 독점 납품'
    },
    {
        'source': '한미반도체 (042700)',
        'target': 'SK하이닉스 (000660)',
        'relation': 'SUPPLIES_TC_BONDER',
        'relation_label': '듀얼 TC본더 장비 독점 납품',
        'description': 'HBM 칩 적층에 필수적인 열압착(TC) 본더 장비를 SK하이닉스 및 마이크론에 납품하여 엔비디아 공급망 핵심 축 형성'
    },
    {
        'source': 'LG에너지솔루션 (373220)',
        'target': '테슬라 (TSLA)',
        'relation': 'SUPPLIES_EV_BATTERY',
        'relation_label': '원통형 4680 배터리 공급',
        'description': '테슬라 모델Y 및 사이버트럭용 차세대 원통형 4680 배터리 셀 충북 오창 공장에서 양산 납품'
    },
    {
        'source': '소프트뱅크 (SOFTBANK)',
        'target': 'ARM (ARM)',
        'relation': 'OWNS_MAJORITY_STAKE',
        'relation_label': '90% 지배 지분 보유',
        'description': '전세계 스마트폰 AP 설계자산의 99%를 독점하는 영국 ARM의 최대주주'
    },
    {
        'source': '오픈AI (OpenAI)',
        'target': '마이크로소프트 (MSFT)',
        'relation': 'EXCLUSIVE_CLOUD_PARTNER',
        'relation_label': '애저(Azure) 독점 클라우드 인프라 제휴',
        'description': 'MS가 오픈AI에 130억 달러 투자하고 전세계 GPT API 서빙을 애저 데이터센터에서 독점 구동'
    }
]

MACRO_ASSETS = {
    'equities': [
        {'name': 'KOSPI', 'ticker': '^KS11', 'current': 2520.4, 'change_pct': 0.85, 'unit': 'pt'},
        {'name': 'KOSDAQ', 'ticker': '^KQ11', 'current': 715.2, 'change_pct': -0.32, 'unit': 'pt'},
        {'name': 'S&P 500', 'ticker': '^GSPC', 'current': 5890.2, 'change_pct': 0.42, 'unit': 'pt'},
        {'name': 'NASDAQ 100', 'ticker': '^NDX', 'current': 20450.8, 'change_pct': 0.78, 'unit': 'pt'},
        {'name': '필라델피아 반도체 (SOX)', 'ticker': '^SOX', 'current': 4980.5, 'change_pct': 1.65, 'unit': 'pt'}
    ],
    'bonds': [
        {'name': '미국 국채 10년물 금리 (글로벌 무위험수익률)', 'ticker': 'US10Y', 'current': 4.42, 'change_bp': 3.5, 'unit': '%'},
        {'name': '미국 국채 2년물 금리 (연준 기준금리 반영)', 'ticker': 'US02Y', 'current': 4.31, 'change_bp': -1.2, 'unit': '%'},
        {'name': '미국 장단기 금리차 (10Y - 2Y 스프레드)', 'ticker': 'T10Y2Y', 'current': 0.11, 'change_bp': 4.7, 'unit': '%p (정상화)'},
        {'name': '한국 국채 3년물 금리 (한은 기준금리 반영)', 'ticker': 'KR03Y', 'current': 2.92, 'change_bp': -2.0, 'unit': '%'},
        {'name': '한국 국채 10년물 금리', 'ticker': 'KR10Y', 'current': 3.08, 'change_bp': -1.5, 'unit': '%'}
    ],
    'commodities_futures': [
        {'name': 'WTI 원유 선물', 'ticker': 'CL=F', 'current': 69.15, 'change_pct': -1.45, 'unit': '$/배럴'},
        {'name': '금(Gold) 선물 (안전자산·인플레 헤지)', 'ticker': 'GC=F', 'current': 2610.5, 'change_pct': 0.65, 'unit': '$/온스'},
        {'name': '구리 선물 (닥터 코퍼 - 글로벌 경기선행지표)', 'ticker': 'HG=F', 'current': 4.15, 'change_pct': 0.35, 'unit': '$/파운드'},
        {'name': '천연가스 선물', 'ticker': 'NG=F', 'current': 2.85, 'change_pct': 3.20, 'unit': '$/MMBtu'}
    ],
    'forex_digital': [
        {'name': '원/달러 환율 (USD/KRW)', 'ticker': 'USDKRW=X', 'current': 1395.2, 'change_krw': -4.8, 'unit': '원'},
        {'name': '달러 인덱스 (DXY)', 'ticker': 'DX-Y.NYB', 'current': 106.4, 'change_pct': -0.15, 'unit': 'pt'},
        {'name': '비트코인 (BTC/USD)', 'ticker': 'BTC-USD', 'current': 91800.0, 'change_pct': 2.45, 'unit': '$'}
    ]
}

def build_global_asset_intelligence():
    print("=== 독립 자산시장 인텔리전스 '렛츠에셋' 코어 온톨로지 구축 시작 ===")
    
    # 1. 글로벌 기업 원장
    with open(os.path.join(MARKET_DIR, 'global_corps.json'), 'w', encoding='utf-8') as f:
        json.dump({'total': len(GLOBAL_CORPS), 'corps': GLOBAL_CORPS, 'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}, f, ensure_ascii=False, indent=2)
        
    # 2. 글로벌 기업인/투자자 원장
    with open(os.path.join(MARKET_DIR, 'global_people.json'), 'w', encoding='utf-8') as f:
        json.dump({'total': len(GLOBAL_PEOPLE), 'people': GLOBAL_PEOPLE, 'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}, f, ensure_ascii=False, indent=2)
        
    # 3. 크로스보더 공급망 및 지분 동맹 에지
    with open(os.path.join(MARKET_DIR, 'global_supply_chain.json'), 'w', encoding='utf-8') as f:
        json.dump({'total_edges': len(GLOBAL_SUPPLY_CHAIN_EDGES), 'edges': GLOBAL_SUPPLY_CHAIN_EDGES, 'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}, f, ensure_ascii=False, indent=2)
        
    # 4. 멀티 자산(주식·채권·선물·환율) 매크로 데이터
    with open(os.path.join(MARKET_DIR, 'macro_assets.json'), 'w', encoding='utf-8') as f:
        json.dump({'assets': MACRO_ASSETS, 'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}, f, ensure_ascii=False, indent=2)
        
    # 5. 자산시장 전용 온톨로지 통합 그래프 (Asset Ontology Graph)
    asset_graph = {
        'service_name': "렛츠에셋 (Let's Asset / Market Intelligence)",
        'service_status': '뉴스보드 파생 독립 자산시장 인텔리전스 원장',
        'stats': {
            'global_corps': len(GLOBAL_CORPS),
            'global_leaders': len(GLOBAL_PEOPLE),
            'cross_border_supply_chains': len(GLOBAL_SUPPLY_CHAIN_EDGES),
            'macro_asset_classes': len(MACRO_ASSETS)
        },
        'global_corps': GLOBAL_CORPS,
        'global_people': GLOBAL_PEOPLE,
        'supply_chains': GLOBAL_SUPPLY_CHAIN_EDGES,
        'macro_assets': MACRO_ASSETS,
        'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    with open(os.path.join(MARKET_DIR, 'asset_ontology.json'), 'w', encoding='utf-8') as f:
        json.dump(asset_graph, f, ensure_ascii=False, indent=2)
        
    print(f"✔ 렛츠에셋 글로벌 기업 {len(GLOBAL_CORPS)}개사 적재 완료")
    print(f"✔ 렛츠에셋 글로벌 리더 {len(GLOBAL_PEOPLE)}명 적재 완료")
    print(f"✔ 크로스-보더 공급망 에지 {len(GLOBAL_SUPPLY_CHAIN_EDGES)}건 적재 완료")
    print(f"✔ 멀티 자산(주식·채권·선물·환율) 매크로 지표 적재 완료")
    print(f"✔ 자산시장 전용 온톨로지 통합 원장 적재 완료 ({os.path.join(MARKET_DIR, 'asset_ontology.json')})")

if __name__ == '__main__':
    build_global_asset_intelligence()
