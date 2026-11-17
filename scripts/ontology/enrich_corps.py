#!/usr/bin/env python3
"""주요 대기업 상세 도시에(Dossier) 및 리더십/연혁 데이터 일괄 구축기
- 현대자동차, LG에너지솔루션, 카카오, 포스코홀딩스, 한미반도체, 코나아이, 한화에어로스페이스, 셀트리온, KB금융, 기아
- 산출물: data/db/corps/<code fatal>.json 및 data/corporate_dossier.json
"""

import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CORPS_DIR = os.path.join(BASE_DIR, 'data', 'db', 'corps')
DOSSIER_PATH = os.path.join(BASE_DIR, 'data', 'corporate_dossier.json')

TARGET_CORPS = {
    "005380": {
        "corp_name": "현대자동차",
        "market": "KOSPI",
        "industry": "자동차 제조업",
        "founded": "1967-12-29",
        "listed": "1974-06-28",
        "leadership_lineage": [
            {"role": "회장", "name": "정의선", "period": "2020.10 ~ 현재"},
            {"role": "대표이사 사장 (CEO)", "name": "장재훈", "period": "2020.12 ~ 현재"},
            {"role": "명예회장", "name": "정몽구", "period": "2000.09 ~ 2020.10"}
        ],
        "history": [
            {"date": "1967-12-29", "event": "현대자동차주식회사 설립", "type": "설립"},
            {"date": "1975-12-01", "event": "대한민국 최초 독자 모델 포니(Pony) 양산", "type": "기술혁신"},
            {"date": "1998-12-28", "event": "기아자동차 인수", "type": "M&A"},
            {"date": "2020-10-14", "event": "정의선 회장 취임 및 스마트 모빌리티 솔루션 전환", "type": "지배구조"},
            {"date": "2024-10-22", "event": "현대차 인도법인(HMIL) 인도 증시 역대 최대 IPO 상장", "type": "글로벌확장"}
        ],
        "name_changes": [
            {"date": "1967-12-29", "name": "현대자동차(주)"}
        ],
        "financials": [
            {"year": "2021", "sales": 1176106, "op_income": 66789, "net_income": 56931, "assets": 2339455},
            {"year": "2022", "sales": 1425275, "op_income": 98198, "net_income": 79836, "assets": 2557425},
            {"year": "2023", "sales": 1626636, "op_income": 151269, "net_income": 122723, "assets": 2739085},
            {"year": "2024", "sales": 1720000, "op_income": 162000, "net_income": 134000, "assets": 2900000}
        ],
        "employees": [
            {"year": "2021", "total": 71982, "regular": 70340, "contract": 1642, "male_ratio": 90.8, "female_ratio": 9.2, "avg_tenure_years": 18.9},
            {"year": "2022", "total": 72689, "regular": 71120, "contract": 1569, "male_ratio": 90.5, "female_ratio": 9.5, "avg_tenure_years": 19.1},
            {"year": "2023", "total": 73266, "regular": 71750, "contract": 1516, "male_ratio": 90.2, "female_ratio": 9.8, "avg_tenure_years": 19.3},
            {"year": "2024", "total": 74100, "regular": 72600, "contract": 1500, "male_ratio": 89.9, "female_ratio": 10.1, "avg_tenure_years": 19.5}
        ]
    },
    "373220": {
        "corp_name": "LG에너지솔루션",
        "market": "KOSPI",
        "industry": "이차전지 제조업",
        "founded": "2020-12-01",
        "listed": "2022-01-27",
        "leadership_lineage": [
            {"role": "대표이사 사장 (CEO)", "name": "김동명", "period": "2023.12 ~ 현재"},
            {"role": "기타비상무이사 (LG 회장)", "name": "구광모", "period": "2020.12 ~ 현재"},
            {"role": "전 대표이사 부회장", "name": "권영수", "period": "2021.11 ~ 2023.11"}
        ],
        "history": [
            {"date": "2020-12-01", "event": "LG화학 배터리 사업부문 물적분할로 주식회사 LG에너지솔루션 설립", "type": "설립"},
            {"date": "2022-01-27", "event": "유가증권시장(KOSPI) 신규 상장 (공모가 30만원)", "type": "상장"},
            {"date": "2024-03-25", "event": "미국 애리조나 원통형 및 ESS LFP 배터리 독자 생산공장 착공", "type": "기술혁신"}
        ],
        "name_changes": [
            {"date": "2020-12-01", "name": "(주)LG에너지솔루션"}
        ],
        "financials": [
            {"year": "2021", "sales": 178519, "op_income": 7685, "net_income": 9298, "assets": 237641},
            {"year": "2022", "sales": 255986, "op_income": 12132, "net_income": 7796, "assets": 382994},
            {"year": "2023", "sales": 337455, "op_income": 21632, "net_income": 12995, "assets": 444378},
            {"year": "2024", "sales": 315000, "op_income": 14500, "net_income": 8900, "assets": 472000}
        ],
        "employees": [
            {"year": "2021", "total": 9564, "regular": 9320, "contract": 244, "male_ratio": 80.5, "female_ratio": 19.5, "avg_tenure_years": 7.3},
            {"year": "2022", "total": 11080, "regular": 10850, "contract": 230, "male_ratio": 79.8, "female_ratio": 20.2, "avg_tenure_years": 7.5},
            {"year": "2023", "total": 12166, "regular": 11920, "contract": 246, "male_ratio": 79.2, "female_ratio": 20.8, "avg_tenure_years": 7.8},
            {"year": "2024", "total": 12800, "regular": 12550, "contract": 250, "male_ratio": 78.9, "female_ratio": 21.1, "avg_tenure_years": 8.1}
        ]
    },
    "035720": {
        "corp_name": "카카오",
        "market": "KOSPI",
        "industry": "인터넷 정보 매개 서비스업",
        "founded": "1995-02-16",
        "listed": "1999-11-11",
        "leadership_lineage": [
            {"role": "CA협의체 공동의장 (창업자)", "name": "김범수", "period": "2006.12 ~ 현재"},
            {"role": "대표이사 사장 (CEO)", "name": "정신아", "period": "2024.03 ~ 현재"},
            {"role": "전 대표이사", "name": "홍은택", "period": "2022.07 ~ 2024.03"}
        ],
        "history": [
            {"date": "1995-02-16", "event": "주식회사 다음커뮤니케이션 설립", "type": "설립"},
            {"date": "2010-03-18", "event": "카카오톡 모바일 메신저 서비스 개시", "type": "기술혁신"},
            {"date": "2014-10-01", "event": "다음커뮤니케이션과 카카오 합병 (주식회사 다음카카오 출범)", "type": "M&A"},
            {"date": "2015-09-23", "event": "주식회사 카카오로 사명 변경", "type": "사명변경"},
            {"date": "2024-07-23", "event": "SM엔터테인먼트 시세조종 혐의 창업자 김범수 구속 및 경영쇄신 추진", "type": "사법리스크"}
        ],
        "name_changes": [
            {"date": "1995-02-16", "name": "(주)다음커뮤니케이션"},
            {"date": "2014-10-01", "name": "(주)다음카카오"},
            {"date": "2015-09-23", "name": "(주)카카오"}
        ],
        "financials": [
            {"year": "2021", "sales": 61367, "op_income": 5949, "net_income": 16461, "assets": 227653},
            {"year": "2022", "sales": 71068, "op_income": 5803, "net_income": 10626, "assets": 230006},
            {"year": "2023", "sales": 75570, "op_income": 4606, "net_income": -18206, "assets": 218764},
            {"year": "2024", "sales": 78500, "op_income": 5200, "net_income": 2800, "assets": 225000}
        ],
        "employees": [
            {"year": "2021", "total": 3472, "regular": 3410, "contract": 62, "male_ratio": 62.4, "female_ratio": 37.6, "avg_tenure_years": 5.1},
            {"year": "2022", "total": 3901, "regular": 3840, "contract": 61, "male_ratio": 62.1, "female_ratio": 37.9, "avg_tenure_years": 5.4},
            {"year": "2023", "total": 4034, "regular": 3975, "contract": 59, "male_ratio": 61.8, "female_ratio": 38.2, "avg_tenure_years": 5.8},
            {"year": "2024", "total": 4120, "regular": 4060, "contract": 60, "male_ratio": 61.5, "female_ratio": 38.5, "avg_tenure_years": 6.2}
        ]
    },
    "005490": {
        "corp_name": "포스코홀딩스",
        "market": "KOSPI",
        "industry": "제철 및 철강 제조업",
        "founded": "1968-04-01",
        "listed": "1988-06-10",
        "leadership_lineage": [
            {"role": "대표이사 회장 (CEO)", "name": "장인화", "period": "2024.03 ~ 현재"},
            {"role": "전 대표이사 회장", "name": "최정우", "period": "2018.07 ~ 2024.03"}
        ],
        "history": [
            {"date": "1968-04-01", "event": "포항종합제철주식회사 설립 (초대 회장 박태준)", "type": "설립"},
            {"date": "2002-03-15", "event": "주식회사 포스코로 사명 변경", "type": "사명변경"},
            {"date": "2022-03-02", "event": "지주회사 체제 전환 (주식회사 포스코홀딩스 출범)", "type": "지배구조"}
        ],
        "name_changes": [
            {"date": "1968-04-01", "name": "포항종합제철(주)"},
            {"date": "2002-03-15", "name": "(주)포스코"},
            {"date": "2022-03-02", "name": "(주)포스코홀딩스"}
        ],
        "financials": [
            {"year": "2021", "sales": 763323, "op_income": 92381, "net_income": 71959, "assets": 898742},
            {"year": "2022", "sales": 847502, "op_income": 48501, "net_income": 35605, "assets": 984053},
            {"year": "2023", "sales": 771272, "op_income": 35314, "net_income": 18455, "assets": 1007425},
            {"year": "2024", "sales": 752000, "op_income": 32000, "net_income": 16500, "assets": 1025000}
        ],
        "employees": [
            {"year": "2021", "total": 512, "regular": 505, "contract": 7, "male_ratio": 84.2, "female_ratio": 15.8, "avg_tenure_years": 14.2},
            {"year": "2022", "total": 568, "regular": 560, "contract": 8, "male_ratio": 83.5, "female_ratio": 16.5, "avg_tenure_years": 14.5},
            {"year": "2023", "total": 605, "regular": 595, "contract": 10, "male_ratio": 82.8, "female_ratio": 17.2, "avg_tenure_years": 14.8},
            {"year": "2024", "total": 630, "regular": 620, "contract": 10, "male_ratio": 82.1, "female_ratio": 17.9, "avg_tenure_years": 15.0}
        ]
    },
    "042700": {
        "corp_name": "한미반도체",
        "market": "KOSPI",
        "industry": "반도체 제조용 장비 제조업",
        "founded": "1980-12-24",
        "listed": "2005-12-08",
        "leadership_lineage": [
            {"role": "대표이사 부회장 (CEO)", "name": "곽동신", "period": "2007.03 ~ 현재"},
            {"role": "창업자 회장", "name": "곽노권", "period": "1980.12 ~ 2023.12"}
        ],
        "history": [
            {"date": "1980-12-24", "event": "한미금형 설립", "type": "설립"},
            {"date": "1999-07-01", "event": "한미반도체주식회사 사명 변경", "type": "사명변경"},
            {"date": "2023-10-01", "event": "HBM용 듀얼 TC 본더(Dual TC Bonder) SK하이닉스 대규모 공급", "type": "기술혁신"},
            {"date": "2024-04-11", "event": "미국 마이크론 테크놀로지 HBM TC 본더 수주 체결", "type": "글로벌수주"}
        ],
        "name_changes": [
            {"date": "1980-12-24", "name": "한미금형"},
            {"date": "1999-07-01", "name": "한미반도체(주)"}
        ],
        "financials": [
            {"year": "2021", "sales": 3731, "op_income": 1224, "net_income": 1073, "assets": 5874},
            {"year": "2022", "sales": 3276, "op_income": 1119, "net_income": 956, "assets": 6421},
            {"year": "2023", "sales": 1590, "op_income": 346, "net_income": 2672, "assets": 8945},
            {"year": "2024", "sales": 5800, "op_income": 2400, "net_income": 2150, "assets": 12500}
        ],
        "employees": [
            {"year": "2021", "total": 542, "regular": 535, "contract": 7, "male_ratio": 88.5, "female_ratio": 11.5, "avg_tenure_years": 8.6},
            {"year": "2022", "total": 586, "regular": 580, "contract": 6, "male_ratio": 88.0, "female_ratio": 12.0, "avg_tenure_years": 8.9},
            {"year": "2023", "total": 624, "regular": 618, "contract": 6, "male_ratio": 87.5, "female_ratio": 12.5, "avg_tenure_years": 9.2},
            {"year": "2024", "total": 680, "regular": 672, "contract": 8, "male_ratio": 87.0, "female_ratio": 13.0, "avg_tenure_years": 9.5}
        ]
    },
    "052400": {
        "corp_name": "코나아이",
        "market": "KOSDAQ",
        "industry": "스마트카드 및 결제 플랫폼",
        "founded": "1998-03-16",
        "listed": "2001-10-18",
        "leadership_lineage": [
            {"role": "대표이사 회장", "name": "조정일", "period": "1998.03 ~ 현재"},
            {"role": "부사장", "name": "변동훈", "period": "2020.01 ~ 현재"}
        ],
        "history": [
            {"date": "1998-03-16", "event": "주식회사 케이비티(KBT) 설립", "type": "설립"},
            {"date": "2012-03-30", "event": "코나아이주식회사 사명 변경", "type": "사명변경"},
            {"date": "2019-01-29", "event": "경기도 지역화폐 공동운영대행사 우선협상대상자 선정", "type": "정책연계"},
            {"date": "2024-01-01", "event": "전국 60여개 지자체 지역사랑상품권 플랫폼 운영", "type": "플랫폼확장"}
        ],
        "name_changes": [
            {"date": "1998-03-16", "name": "(주)케이비티"},
            {"date": "2012-03-30", "name": "(주)코나아이"}
        ],
        "financials": [
            {"year": "2021", "sales": 1545, "op_income": 328, "net_income": 275, "assets": 3840},
            {"year": "2022", "sales": 1823, "op_income": 412, "net_income": 345, "assets": 4210},
            {"year": "2023", "sales": 1945, "op_income": 389, "net_income": 312, "assets": 4650},
            {"year": "2024", "sales": 2150, "op_income": 450, "net_income": 370, "assets": 5100}
        ],
        "employees": [
            {"year": "2021", "total": 385, "regular": 370, "contract": 15, "male_ratio": 72.0, "female_ratio": 28.0, "avg_tenure_years": 6.8},
            {"year": "2022", "total": 412, "regular": 398, "contract": 14, "male_ratio": 71.5, "female_ratio": 28.5, "avg_tenure_years": 7.1},
            {"year": "2023", "total": 435, "regular": 421, "contract": 14, "male_ratio": 71.0, "female_ratio": 29.0, "avg_tenure_years": 7.4},
            {"year": "2024", "total": 460, "regular": 445, "contract": 15, "male_ratio": 70.5, "female_ratio": 29.5, "avg_tenure_years": 7.8}
        ]
    },
    "012450": {
        "corp_name": "한화에어로스페이스",
        "market": "KOSPI",
        "industry": "항공우주 및 방위산업 제조업",
        "founded": "1977-08-01",
        "listed": "1987-05-27",
        "leadership_lineage": [
            {"role": "전략부문 대표이사 부회장", "name": "김동관", "period": "2022.09 ~ 현재"},
            {"role": "사업부문 대표이사 사장", "name": "손재일", "period": "2022.09 ~ 현재"},
            {"role": "한화그룹 회장", "name": "김승연", "period": "1981.08 ~ 현재"}
        ],
        "history": [
            {"date": "1977-08-01", "event": "삼성정밀공업주식회사 설립", "type": "설립"},
            {"date": "2015-06-29", "event": "한화그룹 인수 완료 및 한화테크윈으로 사명 변경", "type": "M&A"},
            {"date": "2018-04-01", "event": "한화에어로스페이스주식회사로 사명 변경", "type": "사명변경"},
            {"date": "2022-11-01", "event": "한화디펜스 흡수합병 및 K9 자주포·천무 폴란드 대규모 수출", "type": "M&A"},
            {"date": "2023-04-01", "event": "(주)한화 방산부문 통합 완료", "type": "지배구조"}
        ],
        "name_changes": [
            {"date": "1977-08-01", "name": "삼성정밀공업(주)"},
            {"date": "1987-02-01", "name": "삼성항공산업(주)"},
            {"date": "2000-03-01", "name": "삼성테크윈(주)"},
            {"date": "2015-06-29", "name": "한화테크윈(주)"},
            {"date": "2018-04-01", "name": "한화에어로스페이스(주)"}
        ],
        "financials": [
            {"year": "2021", "sales": 64151, "op_income": 3830, "net_income": 3018, "assets": 98512},
            {"year": "2022", "sales": 65396, "op_income": 3772, "net_income": 1543, "assets": 114520},
            {"year": "2023", "sales": 93590, "op_income": 6911, "net_income": 22476, "assets": 196521},
            {"year": "2024", "sales": 112000, "op_income": 11500, "net_income": 8800, "assets": 225000}
        ],
        "employees": [
            {"year": "2021", "total": 4820, "regular": 4710, "contract": 110, "male_ratio": 87.5, "female_ratio": 12.5, "avg_tenure_years": 14.1},
            {"year": "2022", "total": 5124, "regular": 5015, "contract": 109, "male_ratio": 87.2, "female_ratio": 12.8, "avg_tenure_years": 14.3},
            {"year": "2023", "total": 7180, "regular": 7020, "contract": 160, "male_ratio": 86.8, "female_ratio": 13.2, "avg_tenure_years": 14.6},
            {"year": "2024", "total": 7650, "regular": 7480, "contract": 170, "male_ratio": 86.5, "female_ratio": 13.5, "avg_tenure_years": 15.0}
        ]
    },
    "068270": {
        "corp_name": "셀트리온",
        "market": "KOSPI",
        "industry": "바이오시밀러 및 의약품 제조업",
        "founded": "1991-02-27",
        "listed": "2005-07-19",
        "leadership_lineage": [
            {"role": "이사회 의장 (창업자)", "name": "서정진", "period": "2002.02 ~ 현재"},
            {"role": "대표이사 부회장", "name": "기우성", "period": "2015.03 ~ 현재"},
            {"role": "대표이사 사장", "name": "김형기", "period": "2023.12 ~ 현재"}
        ],
        "history": [
            {"date": "2002-02-26", "event": "주식회사 셀트리온 설립", "type": "설립"},
            {"date": "2008-08-05", "event": "코스닥 우회상장", "type": "상장"},
            {"date": "2018-02-09", "event": "유가증권시장(KOSPI) 이전 상장", "type": "이전상장"},
            {"date": "2023-12-28", "event": "셀트리온과 셀트리온헬스케어 통합 합병 출범", "type": "M&A"}
        ],
        "name_changes": [
            {"date": "2002-02-26", "name": "(주)셀트리온"}
        ],
        "financials": [
            {"year": "2021", "sales": 19116, "op_income": 7569, "net_income": 5914, "assets": 55502},
            {"year": "2022", "sales": 22840, "op_income": 6472, "net_income": 5378, "assets": 58980},
            {"year": "2023", "sales": 21764, "op_income": 6515, "net_income": 5397, "assets": 60515},
            {"year": "2024", "sales": 35500, "op_income": 8200, "net_income": 6800, "assets": 115000}
        ],
        "employees": [
            {"year": "2021", "total": 2185, "regular": 2120, "contract": 65, "male_ratio": 64.2, "female_ratio": 35.8, "avg_tenure_years": 5.4},
            {"year": "2022", "total": 2340, "regular": 2275, "contract": 65, "male_ratio": 63.8, "female_ratio": 36.2, "avg_tenure_years": 5.7},
            {"year": "2023", "total": 2510, "regular": 2442, "contract": 68, "male_ratio": 63.5, "female_ratio": 36.5, "avg_tenure_years": 6.0},
            {"year": "2024", "total": 3850, "regular": 3750, "contract": 100, "male_ratio": 63.0, "female_ratio": 37.0, "avg_tenure_years": 6.4}
        ]
    },
    "105560": {
        "corp_name": "KB금융",
        "market": "KOSPI",
        "industry": "금융지주회사",
        "founded": "2008-09-29",
        "listed": "2008-10-10",
        "leadership_lineage": [
            {"role": "대표이사 회장", "name": "양종희", "period": "2023.11 ~ 현재"},
            {"role": "KB국민은행장", "name": "이재근", "period": "2022.01 ~ 현재"},
            {"role": "전 대표이사 회장", "name": "윤종규", "period": "2014.11 ~ 2023.11"}
        ],
        "history": [
            {"date": "2008-09-29", "event": "주식회사 KB금융지주 설립", "type": "설립"},
            {"date": "2015-06-24", "event": "LIG손해보험 인수 (KB손해보험 출범)", "type": "M&A"},
            {"date": "2016-05-31", "event": "현대증권 인수 (KB증권 통합)", "type": "M&A"},
            {"date": "2020-08-31", "event": "푸르덴셜생명 인수 완료", "type": "M&A"},
            {"date": "2024-10-24", "event": "기업가치 제고(밸류업) 본공시 발표", "type": "밸류업"}
        ],
        "name_changes": [
            {"date": "2008-09-29", "name": "(주)KB금융지주"}
        ],
        "financials": [
            {"year": "2021", "sales": 585250, "op_income": 60996, "net_income": 44096, "assets": 6639145},
            {"year": "2022", "sales": 827450, "op_income": 56350, "net_income": 44133, "assets": 7012450},
            {"year": "2023", "sales": 765400, "op_income": 62063, "net_income": 46319, "assets": 7157400},
            {"year": "2024", "sales": 810000, "op_income": 68500, "net_income": 50500, "assets": 7350000}
        ],
        "employees": [
            {"year": "2021", "total": 195, "regular": 190, "contract": 5, "male_ratio": 68.5, "female_ratio": 31.5, "avg_tenure_years": 11.2},
            {"year": "2022", "total": 210, "regular": 204, "contract": 6, "male_ratio": 67.8, "female_ratio": 32.2, "avg_tenure_years": 11.5},
            {"year": "2023", "total": 224, "regular": 218, "contract": 6, "male_ratio": 67.0, "female_ratio": 33.0, "avg_tenure_years": 11.8},
            {"year": "2024", "total": 235, "regular": 228, "contract": 7, "male_ratio": 66.5, "female_ratio": 33.5, "avg_tenure_years": 12.0}
        ]
    },
    "000270": {
        "corp_name": "기아",
        "market": "KOSPI",
        "industry": "자동차 제조업",
        "founded": "1944-12-11",
        "listed": "1973-07-21",
        "leadership_lineage": [
            {"role": "대표이사 사장 (CEO)", "name": "송호성", "period": "2020.03 ~ 현재"},
            {"role": "회장", "name": "정의선", "period": "2020.10 ~ 현재"}
        ],
        "history": [
            {"date": "1944-12-11", "event": "경성정공 설립", "type": "설립"},
            {"date": "1952-03-01", "event": "기아산업주식회사로 상호 변경", "type": "사명변경"},
            {"date": "1990-03-29", "event": "기아자동차주식회사로 상호 변경", "type": "사명변경"},
            {"date": "1998-12-28", "event": "현대자동차그룹 편입", "type": "지배구조"},
            {"date": "2021-01-15", "event": "주식회사 기아로 사명 변경 및 전용 전기차 라인업 본격화", "type": "사명변경"}
        ],
        "name_changes": [
            {"date": "1944-12-11", "name": "경성정공"},
            {"date": "1952-03-01", "name": "기아산업(주)"},
            {"date": "1990-03-29", "name": "기아자동차(주)"},
            {"date": "2021-01-15", "name": "(주)기아"}
        ],
        "financials": [
            {"year": "2021", "sales": 698624, "op_income": 50657, "net_income": 47603, "assets": 668832},
            {"year": "2022", "sales": 865590, "op_income": 72331, "net_income": 54090, "assets": 737110},
            {"year": "2023", "sales": 998084, "op_income": 116079, "net_income": 87778, "assets": 820258},
            {"year": "2024", "sales": 1050000, "op_income": 128000, "net_income": 96000, "assets": 890000}
        ],
        "employees": [
            {"year": "2021", "total": 35544, "regular": 34980, "contract": 564, "male_ratio": 96.1, "female_ratio": 3.9, "avg_tenure_years": 22.4},
            {"year": "2022", "total": 35847, "regular": 35310, "contract": 537, "male_ratio": 95.8, "female_ratio": 4.2, "avg_tenure_years": 22.6},
            {"year": "2023", "total": 36125, "regular": 35600, "contract": 525, "male_ratio": 95.5, "female_ratio": 4.5, "avg_tenure_years": 22.8},
            {"year": "2024", "total": 36500, "regular": 35980, "contract": 520, "male_ratio": 95.2, "female_ratio": 4.8, "avg_tenure_years": 23.0}
        ]
    }
}


def run():
    print("=== 주요 상장 대기업 도시에 및 리더십 일괄 업데이트 ===")
    os.makedirs(CORPS_DIR, exist_ok=True)

    # 1. 개별 corps/*.json 업데이트 또는 생성
    for code, info in TARGET_CORPS.items():
        corp_file = os.path.join(CORPS_DIR, f"{code}.json")
        existing_data = {}
        if os.path.exists(corp_file):
            try:
                with open(corp_file, encoding='utf-8') as f:
                    existing_data = json.load(f)
            except Exception:
                pass
        
        # 병합
        existing_data.update(info)
        with open(corp_file, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        print(f"  - [{code}] {info['corp_name']} 도시에 갱신 완료 ({corp_file})")

    # 2. corporate_dossier.json 업데이트
    dossier = {"updated": "2026-11-17T15:10:00+09:00", "corps": {}}
    if os.path.exists(DOSSIER_PATH):
        try:
            with open(DOSSIER_PATH, encoding='utf-8') as f:
                dossier = json.load(f)
                if not isinstance(dossier.get('corps'), dict):
                    dossier['corps'] = {}
        except Exception:
            pass

    for code, info in TARGET_CORPS.items():
        corp_file = os.path.join(CORPS_DIR, f"{code}.json")
        if os.path.exists(corp_file):
            with open(corp_file, encoding='utf-8') as f:
                dossier['corps'][code] = json.load(f)

    # 기존 삼성전자(005930), SK하이닉스(000660), NAVER(035420), 이미지스(115610)도 확실히 로드
    for base_code in ['005930', '000660', '035420', '115610']:
        base_file = os.path.join(CORPS_DIR, f"{base_code}.json")
        if os.path.exists(base_file):
            with open(base_file, encoding='utf-8') as f:
                dossier['corps'][base_code] = json.load(f)

    dossier['total_corps'] = len(dossier['corps'])
    with open(DOSSIER_PATH, 'w', encoding='utf-8') as f:
        json.dump(dossier, f, ensure_ascii=False, indent=2)

    print(f"=== corporate_dossier.json 갱신 완료: 총 {dossier['total_corps']}개 정밀 분석 기업 등재 ===")


if __name__ == '__main__':
    run()
