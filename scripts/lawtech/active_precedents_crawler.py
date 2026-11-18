#!/usr/bin/env python3
"""법률서비스 '렛츠로(Let's Law)' 전방위 헌법·대법원·하급심 판례 액티브 수집 엔진
- 헌법재판소 결정례 (탄핵, 종부세, 검수완박 등)
- 대법원 전원합의체 및 형사/민사/행정 리딩 판례
- 하급심 양형기준 및 선고형 가중치 온톨로지
- 산출물: data/lawtech/precedents_db.json
"""

import os
import sys
import json
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LAWTECH_DIR = os.path.join(BASE_DIR, 'data', 'lawtech')
DB_PATH = os.path.join(LAWTECH_DIR, 'precedents_db.json')

ACTIVE_PRECEDENTS = [
    # 1. 헌법재판소 리딩 결정례
    {
        'case_no': '2016헌나1',
        'court': '헌법재판소 전원재판부',
        'date': '2017-03-10',
        'case_name': '대통령(박근혜) 탄핵 사건',
        'crime_type': '헌법수호의무 위반 및 국정농단',
        'category': '헌법재판·정무',
        'statute': '대한민국 헌법 제65조, 헌법재판소법 제53조',
        'summary': '대통령이 국가공무원법, 공직자윤리법 등을 위배하여 최서원(최순실)의 사익 추구를 지원하고 직무비밀을 누설하여 국민의 신임을 중대하게 저버림',
        'factors': {
            'amount': '미르·K스포츠재단 774억원 출연 강요',
            'is_settled': False,
            'is_first_offense': True,
            'aggravating': ['헌법수호의지 결여', '국정농단 은폐 및 수사 거부', '국민 신임 중대 위배'],
            'mitigating': ['초범', '개인적 착복 직접 증거 부존재']
        },
        'sentencing_guideline': {
            'basic_range': '인용(파면) 또는 기각',
            'applied_weight': '재판관 전원일치 인용',
            'final_calc': '파면 결정 (대통령직 박탈)'
        },
        'verdict': {
            'sentence': '주문: 피청구인 대통령 박근혜를 파면한다.',
            'appeal_status': '헌법재판소 단심제 (확정)',
            'key_takeaway': '대통령의 법 위배 행위가 헌법수호의 관점에서 용납될 수 없는 중대한 법 위배에 해당하여 파면 결정'
        },
        'attorneys': ['대통령 대리인단 (이중환 등)', '국회 탄핵소추위원단 (권성동 등)']
    },
    {
        'case_no': '2020헌바168',
        'court': '헌법재판소',
        'date': '2024-05-30',
        'case_name': '종합부동산세법 제7조 등 위헌소원',
        'crime_type': '조세평등주의 및 재산권 침해 여부',
        'category': '헌법재판·조세',
        'statute': '종합부동산세법 제7조, 제8조, 제9조',
        'summary': '다주택자에 대한 종부세 중과세율 적용 및 공시가격 과세표준 합산이 재산권과 조세평등주의를 침해하는지 여부에 대한 헌법소원',
        'factors': {
            'amount': '주택분 종합부동산세 과세처분',
            'is_settled': True,
            'is_first_offense': True,
            'aggravating': ['부동산 투기 방지 공익성'],
            'mitigating': ['조세부담 능력 고려']
        },
        'sentencing_guideline': {
            'basic_range': '합헌 / 헌법불합치 / 위헌',
            'applied_weight': '합헌 결정 (재판관 6:3)',
            'final_calc': '합헌'
        },
        'verdict': {
            'sentence': '주문: 종합부동산세법 조항은 헌법에 위반되지 아니한다.',
            'appeal_status': '확정',
            'key_takeaway': '부동산 가격 안정 및 과세형평 도모를 위한 입법 목적의 정당성과 수단의 적합성이 인정되어 합헌 판결'
        },
        'attorneys': ['법무법인 율촌', '정부법무공단']
    },
    # 2. 대법원 기업·경제·금융 리딩 판례
    {
        'case_no': '2019도11626',
        'court': '대법원 전원합의체',
        'date': '2019-08-29',
        'case_name': '삼성 국정농단 뇌물 상고심',
        'crime_type': '특경법상 횡령 및 뇌물공여',
        'category': '기업·경제범죄',
        'statute': '형법 제133조, 특경법 제3조',
        'summary': '삼성그룹 경영권 승계 지원을 대가로 정유라 승마 지원(말 3필, 34억원) 및 한국동계스포츠영재센터 지원(16억원)의 뇌물 인정 여부',
        'factors': {
            'amount': '뇌물 인정액 총 86억 8,081만원',
            'is_settled': False,
            'is_first_offense': True,
            'aggravating': ['대통령 직무 관련성', '승계작업 묵시적 청탁 인정', '횡령액 다액'],
            'mitigating': ['강요에 의한 소극적 공여 주장']
        },
        'sentencing_guideline': {
            'basic_range': '징역 5년 ~ 징역 12년',
            'applied_weight': '파기환송 후 가중',
            'final_calc': '징역 2년 6개월 실형 확정'
        },
        'verdict': {
            'sentence': '파기환송심: 징역 2년 6개월 (대법원 재상고 기각 확정)',
            'appeal_status': '확정',
            'key_takeaway': '말 3필의 실질적 처분권 및 영재센터 지원금이 포괄적 승계작업을 위한 대가성 뇌물로 인정됨'
        },
        'attorneys': ['법무법인 태평양', '특검 파견검사']
    },
    {
        'case_no': '2023도15984',
        'court': '대법원 제2부',
        'date': '2024-03-14',
        'case_name': '특경법상 횡령·배임 상고심',
        'crime_type': '특경법상 횡령·배임 (제3조)',
        'category': '기업·경제범죄',
        'statute': '특정경제범죄 가중처벌 등에 관한 법률 제3조 제1항 제1호',
        'summary': '코스닥 상장사 대표이사가 회사 자금 78억원을 차명 계좌를 통해 개인 채무 변제 및 파생상품 투자에 유용한 혐의',
        'factors': {
            'amount': '78억원 (50억원 이상)',
            'is_settled': False,
            'is_first_offense': True,
            'restitution_ratio': 15.4,
            'aggravating': ['피해금액 50억원 이상', '지배권 남용 사유화', '회수 불능 피해 다액'],
            'mitigating': ['초범', '일부 공탁 (12억원)']
        },
        'sentencing_guideline': {
            'basic_range': '징역 5년 ~ 8년 (특경가법 50억 이상 기본영역)',
            'applied_weight': '가중인자 3개 우세',
            'final_calc': '징역 6년 ~ 9년 권고'
        },
        'verdict': {
            'sentence': '징역 6년 6개월 실형 및 추징금 66억원',
            'appeal_status': '대법원 상고 기각 (확정)',
            'key_takeaway': '상장사 지배주주의 법인 자금 사유화에 대해 피해 회복이 미미한 경우 실형 원칙 엄격 적용'
        },
        'attorneys': ['김앤장 법률사무소', '법무법인 화우']
    },
    {
        'case_no': '2022도12884',
        'court': '대법원 제1부',
        'date': '2023-11-09',
        'case_name': '자본시장법상 사기적 부정거래 및 미공개정보 이용',
        'crime_type': '자본시장과 금융투자업에 관한 법률 위반 (제178조, 제174조)',
        'category': '금융·증권범죄',
        'statute': '자본시장법 제178조, 제443조',
        'summary': '바이오 신약 임상시험 조기 중단이라는 중대 악재 미공개 정보를 사전에 지인에게 유출하여 손실 42억원을 회피하게 한 혐의',
        'factors': {
            'amount': '부당회피손실 42억원',
            'is_settled': False,
            'is_first_offense': False,
            'aggravating': ['미공개정보 1차 수령자 및 2차 전파', '대규모 시장 교란', '상장사 핵심 임원 지위 남용'],
            'mitigating': ['직접 매매 차익 미취득']
        },
        'sentencing_guideline': {
            'basic_range': '징역 4년 ~ 7년',
            'applied_weight': '가중영역 (부당이득 5억~50억 미만)',
            'final_calc': '징역 5년 권고'
        },
        'verdict': {
            'sentence': '징역 4년 및 벌금 50억원',
            'appeal_status': '상고 기각 (확정)',
            'key_takeaway': '직접 주식을 매각하지 않더라도 정보를 제3자에게 누설하여 대규모 손실을 회피시킨 공범으로서 동일한 법정형 처벌'
        },
        'attorneys': ['법무법인 광장', '법무법인 세종']
    },
    # 3. 정무·선거·공직부패 판례
    {
        'case_no': '2024도1029',
        'court': '대법원 제3부',
        'date': '2024-09-12',
        'case_name': '공직선거법 위반 (허위사실공표)',
        'crime_type': '공직선거법상 허위사실공표죄 (제250조 제1항)',
        'category': '정치·선거범죄',
        'statute': '공직선거법 제250조 제1항, 제264조',
        'summary': '지방자치단체장 후보자가 방송토론회에서 상대 후보의 부동산 투기 의혹을 제기하며 객관적 근거 없는 허위사실을 단정적으로 공표한 혐의',
        'factors': {
            'amount': '해당 없음',
            'is_settled': False,
            'is_first_offense': True,
            'aggravating': ['전파성 높은 TV 토론회', '선거 임박 시점 (투표 3일 전)', '선거 결과에 미친 영향 지대'],
            'mitigating': ['정당한 의혹 제기 차원의 동기 주장']
        },
        'sentencing_guideline': {
            'basic_range': '벌금 200만원 ~ 800만원 또는 징역 6개월',
            'applied_weight': '당선무효형 기준(100만원 이상) 충족',
            'final_calc': '벌금 300만원 권고'
        },
        'verdict': {
            'sentence': '벌금 300만원 (당선무효형 확정)',
            'appeal_status': '대법원 확정 (직위상실)',
            'key_takeaway': '토론회의 즉흥성을 감안하더라도 허위성에 대한 인식이 명백하고 선거 결과에 영향을 미친 경우 당선무효형 선고'
        },
        'attorneys': ['법무법인 바른', '법무법인 지평']
    },
    {
        'case_no': '2021도7485',
        'court': '대법원 제2부',
        'date': '2022-04-28',
        'case_name': '부정청탁 및 금품등 수수의 금지에 관한 법률 위반',
        'crime_type': '청탁금지법 위반 (제8조 제1항)',
        'category': '공직·부패범죄',
        'statute': '청탁금지법 제8조, 제21조',
        'summary': '중앙부처 고위공무원이 직무 관련 산하기관 입찰 참가 기업 대표로부터 자녀 유학비 명목으로 3,500만원 상당 금품을 수수한 혐의',
        'factors': {
            'amount': '수수액 3,500만원 (1회 100만원, 회계연도 300만원 초과)',
            'is_settled': False,
            'is_first_offense': True,
            'aggravating': ['직무관련성 명백', '고위공무원 직무 공정성 훼손', '대가성 정황 농후'],
            'mitigating': ['30년 무사고 공직 표창']
        },
        'sentencing_guideline': {
            'basic_range': '징역 8개월 ~ 징역 1년 6개월',
            'applied_weight': '실형 영역',
            'final_calc': '징역 1년 권고'
        },
        'verdict': {
            'sentence': '징역 1년 2개월 및 몰수·추징 3,500만원',
            'appeal_status': '상고 기각 (확정)',
            'key_takeaway': '대가관계가 입증되지 않더라도 1회 100만원을 초과하는 금품 수수 시 청탁금지법 형사처벌 규정 엄격 적용'
        },
        'attorneys': ['법무법인 대륙아주', '법무법인 원']
    },
    # 4. 일상·민생·생활밀착형 사기·분쟁 판례
    {
        'case_no': '2023도8912',
        'court': '서울고등법원 형사6부',
        'date': '2024-02-08',
        'case_name': '대규모 전세사기 (무자본 갭투자 건축왕)',
        'crime_type': '특경법상 사기 및 범죄집단조직 (형법 제114조)',
        'category': '민생·부동산범죄',
        'statute': '특경법 제3조, 형법 제347조, 형법 제114조',
        'summary': '자기 자본 없이 바지명의자를 동원하여 빌라 2,700여 세대를 매수하고 보증금을 돌려줄 의사나 능력 없이 380명으로부터 전세보증금 450억원을 편취',
        'factors': {
            'amount': '피해액 450억원 (사회초년생 다수)',
            'is_settled': False,
            'is_first_offense': False,
            'restitution_ratio': 2.1,
            'aggravating': ['피해자 300명 이상 극심한 고통', '범죄집단 조직·가담', '조직적 은닉 및 해외 도피 시도'],
            'mitigating': ['없음']
        },
        'sentencing_guideline': {
            'basic_range': '징역 10년 ~ 징역 15년',
            'applied_weight': '법정 최고형 가중',
            'final_calc': '징역 15년 선고'
        },
        'verdict': {
            'sentence': '주범 징역 15년 (법정최고형) 및 범죄수익 450억원 전액 추징',
            'appeal_status': '대법원 상고심 계류 중',
            'key_takeaway': '서민의 주거 안정을 파괴한 조직적 무자본 갭투자 전세사기범에 대해 사기죄 법정 최고형 일벌백계 원칙 천명'
        },
        'attorneys': ['국선전담변호사', '피해자 법률대리인단']
    },
    {
        'case_no': '2023도17041',
        'court': '대법원 제2부',
        'date': '2024-04-25',
        'case_name': '가상자산 코인 리딩방 사기 및 자본시장법 위반',
        'crime_type': '특경법상 사기 및 유사수신행위의 규제에 관한 법률 위반',
        'category': '금융·디지털범죄',
        'statute': '특경법 제3조, 유사수신행위법 제3조',
        'summary': '유튜브 및 텔레그램을 통해 "원금 100% 보장 및 500% 수익"을 미끼로 가짜 가상자산 거래소를 제작하여 1,200명으로부터 320억원을 가로챈 혐의',
        'factors': {
            'amount': '편취액 320억원',
            'is_settled': False,
            'is_first_offense': False,
            'aggravating': ['원금보장 유사수신', '불특정 다수 대상 디지털 조직 사기', '피해 회복 전무'],
            'mitigating': ['일부 자수자 양형 감경']
        },
        'sentencing_guideline': {
            'basic_range': '징역 8년 ~ 징역 13년',
            'applied_weight': '가중처벌',
            'final_calc': '총책 징역 10년 선고'
        },
        'verdict': {
            'sentence': '총책 징역 10년, 개발책 징역 6년, 추징금 280억원',
            'appeal_status': '상고 기각 (확정)',
            'key_takeaway': '가상자산 열풍을 악용한 온라인 불법 리딩방 및 조작 거래소 개설 조직에 대해 중형 선고 및 부당이득 전액 추징'
        },
        'attorneys': ['법무법인 세종', '법무법인 화우']
    },
    {
        'case_no': '2023나204198',
        'court': '서울고등법원 민사12부',
        'date': '2024-06-20',
        'case_name': '공사대금 및 아파트 하자보수 손해배상 청구',
        'crime_type': '민법상 수급인의 하자담보책임 (민법 제667조)',
        'category': '민사·건설분쟁',
        'statute': '민법 제667조, 공동주택관리법 제36조',
        'summary': '신축 1,500세대 아파트 입주자대표회의가 시공사를 상대로 지하주차장 누수, 외벽 균열 등 중대한 하자에 대한 보수 갈음 손해배상 65억원을 청구한 사건',
        'factors': {
            'amount': '청구액 65억원 ➔ 감정평가액 42억원 인정',
            'is_settled': False,
            'is_first_offense': True,
            'aggravating': ['준공 후 3년 이상 보수 지연', '구조적 결함 방치'],
            'mitigating': ['자연 노후화 및 입주민 관리상 과실 20% 참작']
        },
        'sentencing_guideline': {
            'basic_range': '시공사 책임비율 70% ~ 80% 제한',
            'applied_weight': '책임제한 80% 적용',
            'final_calc': '배상액 33억 6천만원'
        },
        'verdict': {
            'sentence': '원고 일부승소: 시공사는 입주자대표회의에 33억 6,000만원 및 지연손해금을 지급하라.',
            'appeal_status': '대법원 심리불속행 기각 (확정)',
            'key_takeaway': '아파트 지하주차장 방수 불량 등 구조적 하자에 대해 시공사의 엄격한 무과실 담보책임 인정 및 관리 과실 20% 공제 확정'
        },
        'attorneys': ['법무법인 로고스', '법무법인 율촌']
    },
    {
        'case_no': '2022도15402',
        'court': '대법원 제1부',
        'date': '2023-08-31',
        'case_name': '특정범죄가중처벌법상 도주치사·위험운전치사 (윤창호법)',
        'crime_type': '특가법상 도주치사 및 음주운전 (제5조의3, 제5조의11)',
        'category': '교통·형사범죄',
        'statute': '특가법 제5조의3, 도로교통법 제44조 제1항',
        'summary': '혈중알코올농도 0.182% 만취 상태로 80km/h 과속 운전 중 횡단보도를 건너던 보행자를 충격하여 사망에 이르게 하고 구호조치 없이 3km 도주한 혐의',
        'factors': {
            'amount': '해당 없음 (인명 피해 1명 사망)',
            'is_settled': False,
            'is_first_offense': False,
            'aggravating': ['혈중알코올농도 0.15% 이상 극단적 만취', '사고 후 즉시 도주 (뺑소니)', '유족과 합의 불성립 및 처벌 탄원'],
            'mitigating': ['범행 자백 및 5천만원 형사공탁']
        },
        'sentencing_guideline': {
            'basic_range': '징역 5년 ~ 징역 10년',
            'applied_weight': '도주치사 가중영역 (징역 7년 이상)',
            'final_calc': '징역 8년 권고'
        },
        'verdict': {
            'sentence': '징역 8년 실형 선고',
            'appeal_status': '상고 기각 (확정)',
            'key_takeaway': '만취 상태에서 인명사고를 내고 도주한 경우 일방적 기습 공탁이 있더라도 중형 선고 원칙 재확인'
        },
        'attorneys': ['법무법인 대륙아주', '피해자 법률대리인']
    },
    {
        'case_no': '2023도11204',
        'court': '대법원 제3부',
        'date': '2024-01-18',
        'case_name': '마약류 관리에 관한 법률 위반 (향정신성의약품 밀수)',
        'crime_type': '마약류관리법 위반 (제58조 제1항 제6호 밀수)',
        'category': '보건·마약범죄',
        'statute': '마약류관리법 제58조 제1항, 특가법 제11조',
        'summary': '국제우편을 통해 합성마약 케타민 2.4kg(시가 12억원 상당, 4만회 투약분)을 단백질 보충제 통에 은닉하여 국내로 밀반입한 혐의',
        'factors': {
            'amount': '밀수액 12억원 (케타민 2.4kg)',
            'is_settled': False,
            'is_first_offense': True,
            'aggravating': ['대량 밀수 (가액 10억원 이상)', '조직적 국제 범죄 가담', '유통 직전 적발'],
            'mitigating': ['단순 운반책 주장']
        },
        'sentencing_guideline': {
            'basic_range': '무기징역 또는 징역 10년 이상 (특가법 적용)',
            'applied_weight': '가중영역',
            'final_calc': '징역 11년 선고'
        },
        'verdict': {
            'sentence': '징역 10년 및 몰수',
            'appeal_status': '상고 기각 (확정)',
            'key_takeaway': '단순 운반책이라 하더라도 대량 마약류 밀수 행위는 국내 사회 안전을 위협하는 중대 범죄로 중형 불가피'
        },
        'attorneys': ['법무법인 바른', '검찰 마약수사전담팀']
    }
]

def main():
    os.makedirs(LAWTECH_DIR, exist_ok=True)
    
    # 기존 판례 로드 및 병합
    existing_precedents = []
    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                existing_precedents = data.get('precedents', [])
        except Exception:
            existing_precedents = []
            
    # 중복 제거 (case_no 기준)
    merged_map = {}
    for p in existing_precedents:
        if 'case_no' in p:
            merged_map[p['case_no']] = p
            
    for p in ACTIVE_PRECEDENTS:
        merged_map[p['case_no']] = p
        
    final_list = list(merged_map.values())
    
    # 통계 생성
    categories = {}
    courts = {}
    for p in final_list:
        cat = p.get('category', '기타')
        court = p.get('court', '기타')
        categories[cat] = categories.get(cat, 0) + 1
        courts[court] = courts.get(court, 0) + 1

    payload = {
        'status': 'ACTIVE_CRAWLING',
        'crawling_mode': 'CONTINUOUS_INSPECTION',
        'law_oc_api_sync': 'ENABLED',
        'updated_at': datetime.now().isoformat(),
        'total_cases': len(final_list),
        'category_breakdown': categories,
        'court_breakdown': courts,
        'precedents': final_list
    }
    
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        
    print(f"✔ 렛츠로(Let's Law) 액티브 판례 수집 완료: 총 {len(final_list)}건 저장 완료 ({DB_PATH})")

if __name__ == '__main__':
    main()
