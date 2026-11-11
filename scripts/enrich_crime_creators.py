#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Expand Elite Network Database with:
1. crime_underworld: Historical and modern underworld/criminal figures (김태촌, 김두한, 조양은, etc.)
2. creators_influencers: Major Korean YouTubers/creators with channel names, real names, handles, subscriber counts, MCNs
3. sme_business_leaders: SME, Kosdaq, and startup leaders
4. career_seniority_graph: Multi-layered career transitions (전직, 전전직) and interpersonal seniority (선후배)
"""

import json, os, sys

ELITE_PATH = "/Users/pyw31337/Developer/newsboard-local/news/data/elite_network.json"
POL_ELITE_PATH = "/Users/pyw31337/Developer/newsboard-local/pol/pdata/elite_network.json"

with open(ELITE_PATH, "r", encoding="utf-8") as f:
    elite = json.load(f)

# 1. 범죄 및 조직폭력/사건사고 핵심 인물 데이터베이스 (Underworld & Crime Figures)
CRIME_UNDERWORLD = [
    {
        "name": "김태촌",
        "hanja": "金泰村",
        "birth": "1948-10-10",
        "death": "2013-01-05",
        "category": "조직폭력/사건",
        "faction": "서방파 (두목)",
        "role": "범서방파 수괴",
        "aliases": ["태촌이", "서방파 두목"],
        "summary": "1970~80년대 대한민국 암흑가를 삼분했던 범서방파의 두목. 조양은의 양은이파, 이동재의 OB파와 치열한 전국 패권 다툼을 벌였으며 신민당 전당대회 각목 난동 사건, 뉴송도호텔 나이트클럽 살인교사 사건 등의 주범.",
        "rivals": ["조양은", "이동재"],
        "allies": ["김두한 (선배 격)", "박종규"],
        "records": [
            "1975년 광주 서방파 두목으로 서울 상경",
            "1976년 신민당 전당대회 각목 사건 배후 지목 및 복역",
            "1986년 뉴송도호텔 나이트클럽 사장 흉기 피습 교사 (징역 5년, 보호감호 7년)",
            "1989년 범서방파 결성 (전국 폭력조직 연합 도모)",
            "1990년 '범죄와의 전쟁' 선포 후 범죄단체 구성 혐의로 징역 10년 복역",
            "2006년 배우 권상우 일본 팬미팅 강요 및 협박 혐의 기소",
            "2013년 1월 5일 서울대병원에서 심장마비로 사망 (향년 64세)"
        ],
        "relationships": [
            {"target": "조양은", "rel": "적대/라이벌", "desc": "양은이파 두목, 70~80년대 강남 패권 쟁탈전"},
            {"target": "이동재", "rel": "적대/라이벌", "desc": "OB파 두목, 서방파 부두목 습격 사건 대립"}
        ]
    },
    {
        "name": "조양은",
        "hanja": "曺洋銀",
        "birth": "1950-01-18",
        "category": "조직폭력/사건",
        "faction": "양은이파 (두목)",
        "role": "양은이파 보스",
        "aliases": ["양은이"],
        "summary": "1975년 서울 명동 사보이호텔 습격 사건을 주도하여 주먹계의 세대교체를 이끌고 1978년 양은이파를 결성한 보스. 출소 후 신앙인으로 귀의를 선언했으나 사기 및 갈취 혐의로 수차례 재수감.",
        "rivals": ["김태촌", "이동재", "신상현"],
        "records": [
            "1975년 명동 사보이호텔 신상사파 신년회 습격 사건 주도 (칼잡이 조폭 시대 개막)",
            "1978년 양은이파 결성 (전국 4대 패밀리 등극)",
            "1980년 범죄단체 조직 혐의로 구속, 15년 만기 출소",
            "1996년 자전적 영화 '보스' 제작 및 본인 직접 출연",
            "2013년 필리핀 도피 중 인터폴·경찰 공조로 검거 및 압송 (사기 혐의)",
            "2021년 웅천왜성 유적지 복원 사업 갈취 혐의 징역형 선고"
        ],
        "relationships": [
            {"target": "김태촌", "rel": "적대/라이벌", "desc": "서방파 두목, 전국 암흑가 주도권 다툼"},
            {"target": "신상현", "rel": "하극상/습격 대상", "desc": "신상사파 보스, 1975 사보이호텔 습격"}
        ]
    },
    {
        "name": "김두한",
        "hanja": "金斗漢",
        "birth": "1918-05-15",
        "death": "1972-11-21",
        "category": "정치/역사/주먹",
        "faction": "우미관파 (오야붕), 대한청년단, 제3·6대 국회의원",
        "role": "종로 우미관 보스 → 제3·6대 국회의원",
        "aliases": ["잇뽕", "종로의 오야붕", "장군의 아들"],
        "summary": "일제강점기 종로 우미관을 중심으로 활동한 조선 주먹계의 전설적 오야붕이자, 해방 후 대한청년단 감찰국장, 반탁운동가, 제3대·제6대 국회의원을 지낸 정치 주먹의 원조. 1966년 국회 오물투척 사건으로 유명.",
        "family": [
            {"name": "김좌진", "rel": "부친 (독립군 총사령관)"},
            {"name": "김을동", "rel": "장녀 (배우, 제18·19대 국회의원)"},
            {"name": "송일국", "rel": "외손자 (배우)"},
            {"name": "송대한", "rel": "증손자 (삼둥이)"},
            {"name": "송민국", "rel": "증손자 (삼둥이)"},
            {"name": "송만세", "rel": "증손자 (삼둥이)"}
        ],
        "rivals": ["하야시(선우영빈)", "이정재"],
        "allies": ["이성순(시라소니)", "김영태", "문영철", "김무옥"],
        "records": [
            "1930년대 종로 우미관 주먹패 장악 및 하야시 야쿠자 세력과 대치",
            "1945년 해방 후 대한민주청년동맹 감찰국장 (좌우합작 반대 및 좌익 테러 주도)",
            "1954년 제3대 민의원의원 당선 (서울 종로을, 무소속)",
            "1965년 제6대 국회의원 보궐선거 당선 (서울 용산구, 한국독립당)",
            "1966년 국회 본회의 사카린 밀수 사건 대정부질문 중 정일권 국무총리 등에게 똥물 투척 (국회 오물투척 사건으로 의원직 사퇴)",
            "1972년 11월 21일 뇌출혈로 별세"
        ],
        "relationships": [
            {"target": "김을동", "rel": "부녀", "desc": "장녀, 제18·19대 국회의원"},
            {"target": "이정재", "rel": "정적/라이벌", "desc": "동대문파 보스, 자유당 정권하 정치 대립"},
            {"target": "이성순", "rel": "형님/의형제", "desc": "시라소니, 낭만파 주먹계의 최고 실력자"}
        ]
    },
    {
        "name": "이정재",
        "hanja": "李丁載",
        "birth": "1917-01-06",
        "death": "1961-10-19",
        "category": "정치주먹/역사",
        "faction": "동대문사범 (동대문파 두목)",
        "role": "동대문상인연합회 회장, 자유당 감찰부장",
        "aliases": ["동대문 오야붕"],
        "summary": "자유당 정권 시절 이기붕의 비호 아래 동대문사범을 이끌며 정계 야당 인사들을 탄압한 대표적 정치 주먹. 5·16 군사정변 후 혁명재판에서 사형 선고를 받고 처형.",
        "rivals": ["김두한", "이성순(시라소니)"],
        "subordinates": ["임화수", "유지광"],
        "records": [
            "전국씨름대회 우승 후 경찰관 임용 (수도경찰청 근무)",
            "1953년 동대문상인연합회 조직 및 동대문파 결성",
            "1954년 단성사 저격 사건 및 충정로 시라소니 린치 사건 배후",
            "1957년 장충단공원 야당 시국강연회 방해 사건 지휘",
            "1961년 5·16 군사정변 직후 체포, 혁명재판부에서 특수범죄처벌에 관한 특별법 위반으로 사형 선고 및 집행"
        ],
        "relationships": [
            {"target": "임화수", "rel": "부하/오른팔", "desc": "한국연예주식회사 사장, 동대문파 2인자"},
            {"target": "유지광", "rel": "행동대장", "desc": "화랑동지회 회장, 동대문파 직속 행동대장"}
        ]
    },
    {
        "name": "이성순",
        "hanja": "李聖淳",
        "birth": "1916-02-29",
        "death": "1983-02-25",
        "category": "주먹/역사",
        "faction": "독행 낭만주먹",
        "role": "시라소니",
        "aliases": ["시라소니"],
        "summary": "일제강점기 만주, 신의주, 상하이, 베이징을 풍미한 당대 최강의 낭만 주먹. 조직을 거느리지 않고 홀로 행동했으며, 해방 후 서북청년단 감찰부장을 맡았다가 동대문파 이정재 세력의 흉기 린치를 당한 뒤 은퇴하여 목회 활동.",
        "rivals": ["이정재"],
        "allies": ["김두한"],
        "records": [
            "1930~40년대 신의주·만주·상하이 등지에서 수많은 주먹 대결 무패 신화",
            "1946년 월남 후 서북청년단 감찰부장 활동",
            "1953년 동대문상인연합회 사무실에서 이정재 부하 30여 명에게 쇠갈퀴·도끼 린치 사건 피해",
            "1960년대 은퇴 후 기독교 신앙에 귀의, 영락교회 집사로 여생 마감"
        ],
        "relationships": [
            {"target": "김두한", "rel": "의형제", "desc": "서로 실력을 인정하고 형님·아우로 예우"},
            {"target": "이정재", "rel": "원한/대립", "desc": "동대문파 린치 사건의 배후"}
        ]
    },
    {
        "name": "권도형",
        "hanja": "權渡衡",
        "en": "Do Kwon",
        "birth": "1991-09-06",
        "category": "경제/가상자산/범죄",
        "faction": "테라폼랩스 (대표)",
        "role": "테라·루나 코인 창시자",
        "summary": "암호화폐 테라USD(UST)와 루나(LUNA) 폭락 사태로 전 세계 수십만 명의 투자자에게 50조 원 이상의 피해를 입힌 테라폼랩스 대표. 싱가포르, 두바이, 세르비아 도피 끝에 몬테네그로 공항에서 위조 여권 사용으로 체포.",
        "records": [
            "2018년 신현성과 함께 테라폼랩스 공동 설립",
            "2022년 5월 테라·루나 알고리즘 붕괴로 시가총액 50조 원 증발 (테라 사태)",
            "2022년 9월 서울남부지검 자본시장법 위반 혐의 체포영장 발부 및 인터폴 적색수배",
            "2023년 3월 몬테네그로 포드고리차 공항에서 코스타리카 위조 여권 소지 체포",
            "2024~2026년 미국 증권거래위원회(SEC) 민사소송 패소 및 한국/미국 범죄인 인도 재판 진행"
        ],
        "relationships": [
            {"target": "신현성", "rel": "동업자", "desc": "테라폼랩스 공동창업자, 티몬 전 의장"}
        ]
    },
    {
        "name": "조희팔",
        "birth": "1957-03-15",
        "death": "2011-12-19 (중국 공안 사망 확인 발표, 의혹 지속)",
        "category": "경제/다단계/사기",
        "faction": "BMC (총괄회장)",
        "role": "단군 이래 최대 다단계 사기범",
        "summary": "의료기기 대여업을 빙자하여 3만여 명의 피해자로부터 약 5조 원을 가로챈 단군 이래 최대 규모 다단계 사기 사건의 주범. 2008년 중국으로 밀항 도피 후 2011년 심근경색 사망설이 발표되었으나 위장 사망 의혹이 지속됨.",
        "records": [
            "2004~2008년 전국에 10여 개 피라미드 법인 설립 후 '연 30~40% 고수익 보장' 미끼로 5조 700억 원 갈취",
            "2008년 12월 충남 태안에서 어선을 타고 중국으로 밀항",
            "2012년 경찰청 지능범죄수사대 '조희팔 2011년 12월 중국 산둥성 유방시에서 심근경색 사망' 발표",
            "검찰 수사 결과 김광준 부장검사 등 정관계 로비 자금 살포 확인"
        ]
    },
    {
        "name": "조주빈",
        "birth": "1995-10-14",
        "category": "디지털성범죄/사건",
        "faction": "텔레그램 박사방 (주범)",
        "role": "박사방 운영자",
        "aliases": ["박사"],
        "summary": "텔레그램에서 여성 및 아동·청소년 성착취물을 제작·유포한 '박사방'의 총책. 징역 42년형을 선고받고 복역 중.",
        "records": [
            "2018~2020년 텔레그램 비밀방을 통해 피해자 수십 명 협박 및 성착취물 제작·판매",
            "2020년 3월 경찰 체포 후 신상공개 결정",
            "2021년 대법원에서 아동·청소년의 성보호에 관한 법률 위반 및 범죄단체조직죄 등으로 징역 42년 확정"
        ]
    }
]

# 2. 유튜버 / 크리에이터 / 인플루언서 실명 및 채널 매핑 데이터베이스
CREATORS_INFLUENCERS = [
    {
        "channel_name": "슈카월드",
        "real_name": "전석재",
        "handle": "@syukaworld",
        "subscribers": "350만명",
        "category": "경제/시사/교양",
        "mcn": "샌드박스네트워크",
        "birth": "1979-01-08",
        "education": "서울대학교 경제학부 학사",
        "career": [
            "이베스트투자증권 채권 프랍트레이더",
            "삼성자산운용 채권운용팀 매니저",
            "슈카월드 유튜브 채널 개설",
            "샌드박스네트워크 소속 크리에이터",
            "금융위원회 위원장 표창 수상",
            "공공기관 및 방송 출연 (삼프로TV, 집사부일체 등)"
        ],
        "relationships": [
            {"target": "이병건", "rel": "동료 크리에이터", "desc": "침착맨, 샌드박스 소속 합동 방송"},
            {"target": "김동환", "rel": "업계 동료", "desc": "삼프로TV 대표, 경제 콘텐츠 협업"}
        ]
    },
    {
        "channel_name": "침착맨",
        "real_name": "이병건",
        "handle": "@chimchakman",
        "subscribers": "260만명",
        "category": "토크/엔터테인먼트/웹툰",
        "mcn": "금병영 (자체 레이블)",
        "birth": "1983-12-05",
        "education": "안산대학교 시각디자인과",
        "career": [
            "네이버 웹툰 작가 (이말년 씨리즈, 이말년 서유기)",
            "트위치 및 유튜브 스트리머 전환",
            "주식회사 금병영 대표이사",
            "배텐(배성재의 텐) 고정 게스트",
            "tvN 유 퀴즈 온 더 블럭 등 방송 다수 출연"
        ],
        "relationships": [
            {"target": "주호민", "rel": "웹툰 동료/단짝", "desc": "신과함께 작가, 펄 침 듀오"},
            {"target": "김풍", "rel": "웹툰 선배", "desc": "냉장고를 부탁해, 초기 웹툰 작가 그룹"},
            {"target": "전석재", "rel": "동료 크리에이터", "desc": "슈카월드와 정기 합동 토크"}
        ]
    },
    {
        "channel_name": "빠니보틀",
        "real_name": "박재한",
        "handle": "@PaniBottle",
        "subscribers": "240만명",
        "category": "여행/다큐",
        "mcn": "샌드박스네트워크",
        "birth": "1987-10-26",
        "education": "서울시립대학교 도예과",
        "career": [
            "세계 여행 유튜버 (인도, 유라시아 등)",
            "웹드라마 '좋소 좋소 좋소기업(좋좋소)' 총감독 및 각본",
            "MBC '태어난 김에 세계일주' 고정 출연 (기안84, 덱스와 협업)"
        ],
        "relationships": [
            {"target": "곽준빈", "rel": "여행 멘토/형제", "desc": "곽튜브를 여행 유튜브로 이끈 스승이자 절친"},
            {"target": "김희민", "rel": "방송 동료", "desc": "기안84, 태계일주 공동 출연"}
        ]
    },
    {
        "channel_name": "곽튜브",
        "real_name": "곽준빈",
        "handle": "@JoonbinKwak",
        "subscribers": "210만명",
        "category": "여행/먹방",
        "mcn": "SM C&C",
        "birth": "1992-02-02",
        "education": "부산외국어대학교 러시아어과",
        "career": [
            "주아제르바이잔 대한민국 대사관 실무관",
            "유튜브 '곽튜브' 개설 후 전업 크리에이터 전향",
            "EBS '곽준빈의 세계기사식당' 단독 MC",
            "tvN '지구마불 세계여행' 출연"
        ],
        "relationships": [
            {"target": "박재한", "rel": "멘토", "desc": "빠니보틀과의 아제르바이잔 만남으로 유튜버 입문"}
        ]
    },
    {
        "channel_name": "쯔양",
        "real_name": "박정원",
        "handle": "@tzuyang6145",
        "subscribers": "1,150만명",
        "category": "먹방/기부/소상공인",
        "mcn": "문래동 문래스튜디오",
        "birth": "1997-04-25",
        "career": [
            "대한민국 최대 구독자 먹방 크리에이터 (1,000만 다이아 버튼)",
            "소상공인 식당 살리기 및 결식아동 10억원 이상 기부",
            "사이버 렉카 연합 공갈·협박 사건 피해자로 용기 있는 폭로 (구제역·카라큘라 구속 기여)"
        ]
    },
    {
        "channel_name": "김어준의 겸손은힘들다 뉴스공장",
        "real_name": "김어준",
        "handle": "@humblefactory",
        "subscribers": "175만명",
        "category": "시사/정치/뉴스",
        "mcn": "딴지그룹",
        "birth": "1968-12-04",
        "education": "홍익대학교 전기공학과",
        "career": [
            "딴지일보 총수 (1998년 창간)",
            "팟캐스트 '나는 꼼수다(나꼼수)' 기획 및 진행",
            "tbs FM '김어준의 뉴스공장' 진행 (수도권 청취율 1위)",
            "유튜브 '겸손은힘들다 뉴스공장' 개설 (전 세계 슈퍼챗 1위 기록)"
        ],
        "relationships": [
            {"target": "주진우", "rel": "나꼼수 동지", "desc": "시사인 기자, 나꼼수 4인방"},
            {"target": "정봉주", "rel": "나꼼수 동지", "desc": "전 17대 국회의원"},
            {"target": "김용민", "rel": "나꼼수 동지", "desc": "평화나무 이사장"}
        ]
    },
    {
        "channel_name": "가로세로연구소",
        "real_name": "김세의",
        "handle": "@garosero",
        "subscribers": "88만명",
        "category": "정치/폭로/우파시사",
        "mcn": "가로세로연구소 (법인)",
        "birth": "1976-06-26",
        "education": "서울대학교 농경제사회학부 학사",
        "career": [
            "MBC 보도국 정치부·사회부 기자",
            "MBC 노동조합(제3노조) 공동위원장",
            "가로세로연구소 대표이사 설립",
            "국민의힘 최고위원 출마"
        ],
        "relationships": [
            {"target": "강용석", "rel": "전 공동대표", "desc": "전 제18대 국회의원, 가세연 공동 창립자"},
            {"target": "김용호", "rel": "전 출연진", "desc": "전 연예부장, 연예계 비하인드 폭로"}
        ]
    },
    {
        "channel_name": "삼프로TV_경제의신과함께",
        "real_name": "김동환, 이진우, 정영진",
        "handle": "@samprotv",
        "subscribers": "250만명",
        "category": "금융/투자/경제",
        "mcn": "이브로드캐스팅",
        "career": [
            "팟캐스트 '경제의 신과 함께' 론칭",
            "주식회사 이브로드캐스팅 설립",
            "대선 후보 특집 심층 인터뷰 (이재명, 윤석열 초청 대담)",
            "코스닥 상장 추진 및 글로벌 경제 미디어 도약"
        ]
    }
]

# 3. 중소·강소기업 및 스타트업 주요 경영진 (SME & Startup Business Leaders)
SME_BUSINESS_LEADERS = [
    {
        "name": "김봉진",
        "company": "우아한형제들 (배달의민족)",
        "role": "창업자 / 전 이사회 의장",
        "category": "스타트업/유니콘",
        "education": "서울예술대학교 실내디자인과",
        "summary": "한국 배달앱 1위 배달의민족 창업자. 2019년 딜리버리히어로(DH)에 4조 7500억 원에 매각하며 유니콘 신화를 완성. 더기빙플레지에 가입해 재산 절반 기부 서약.",
        "relationships": [
            {"target": "이수진", "rel": "스타트업 동료", "desc": "야놀자 총괄대표, 1세대 유니콘 창업자"}
        ]
    },
    {
        "name": "이수진",
        "company": "야놀자 (Yanolja)",
        "role": "총괄대표 / 창업자",
        "category": "스타트업/유니콘",
        "summary": "모텔 청소부에서 시작해 소프트뱅크 비전펀드로부터 2조 원 투자를 유치한 글로벌 여행·여가 테크 기업 야놀자의 신화적 창업자."
    },
    {
        "name": "이승건",
        "company": "비바리퍼블리카 (토스)",
        "role": "대표이사 / 창업자",
        "category": "핀테크/유니콘",
        "education": "서울대학교 치의학과 학사",
        "summary": "치과의사 출신으로 간편송금 서비스 토스(Toss)를 설립, 토스뱅크·토스증권을 아우르는 종합 금융 플랫폼으로 성장시킨 대한민국 대표 핀테크 혁신가."
    },
    {
        "name": "안성우",
        "company": "직방 (Zigbang)",
        "role": "대표이사 / 창업자",
        "category": "프롭테크/유니콘",
        "education": "서울대학교 통계학과 학사",
        "summary": "부동산 중개 모바일 앱 직방을 창업하여 국내 프롭테크 시장을 개척한 벤처기업가."
    },
    {
        "name": "김슬아",
        "company": "컬리 (마켓컬리)",
        "role": "대표이사 / 창업자",
        "category": "이커머스/유니콘",
        "education": "웰즐리 대학교 정치학 학사",
        "summary": "새벽배송 시장을 개척한 마켓컬리 창업자. 맥킨지, 골드만삭스, 베인앤컴퍼니를 거쳐 신선식품 물류 혁신을 이끈 여성 벤처 리더."
    }
]

# 4. 전직, 전전직, 선후배 다층 이해관계 엣지 (Career Transitions & Interpersonal Seniority)
CAREER_SENIORITY_GRAPH = [
    {
        "person": "이재명",
        "current_job": "더불어민주당 당대표 (제22대 국회의원)",
        "prev_job": "제35대 경기도지사 (2018~2021)",
        "prev2_job": "민선 5·6기 성남시장 (2010~2018)",
        "seniority": {
            "judicial_exam": "제28회 사법시험 합격 (1986)",
            "judicial_institute": "사법연수원 18기 (동기: 문병호, 정미화 등 / 선배: 문재인 12기, 노무현 7기)",
            "university": "중앙대학교 법과대학 법학과 82학번 (선배: 김선수 대법관, 후배: 여러 법조인)"
        }
    },
    {
        "person": "윤석열",
        "current_job": "제20대 대한민국 대통령",
        "prev_job": "제43대 검찰총장 (2019~2021)",
        "prev2_job": "제59대 서울중앙지방검찰청 검사장 (2017~2019)",
        "seniority": {
            "judicial_exam": "제33회 사법시험 합격 (1991, 9수)",
            "judicial_institute": "사법연수원 23기 (동기: 한동훈, 박범계, 주광덕, 강용석 등)",
            "university": "서울대학교 법과대학 법학과 79학번 (선배: 조국 82학번보다 학번 선배, 원희룡 82학번)"
        }
    },
    {
        "person": "한동훈",
        "current_job": "국민의힘 당대표",
        "prev_job": "제69대 법무부 장관 (2022~2023)",
        "prev2_job": "사법연수원 부원장 / 부산고등검찰청 차장검사 (2020~2021)",
        "seniority": {
            "judicial_exam": "제37회 사법시험 합격 (1995, 만 22세 재학 중 합격)",
            "judicial_institute": "사법연수원 27기 (윤석열 대통령의 연수원 4기수 후배 및 검찰 직무 후배)",
            "university": "서울대학교 법과대학 법학과 92학번"
        }
    }
]

# Update the master dictionary
elite["crime_underworld"] = CRIME_UNDERWORLD
elite["creators_influencers"] = CREATORS_INFLUENCERS
elite["sme_business_leaders"] = SME_BUSINESS_LEADERS
elite["career_seniority_graph"] = CAREER_SENIORITY_GRAPH

# Save back to elite_network.json in both repositories
with open(ELITE_PATH, "w", encoding="utf-8") as f:
    json.dump(elite, f, ensure_ascii=False, indent=2)

if os.path.exists(os.path.dirname(POL_ELITE_PATH)):
    with open(POL_ELITE_PATH, "w", encoding="utf-8") as f:
        json.dump(elite, f, ensure_ascii=False, indent=2)

print(f"Master elite_network.json enriched successfully!")
print(f"- crime_underworld: {len(CRIME_UNDERWORLD)} figures")
print(f"- creators_influencers: {len(CREATORS_INFLUENCERS)} creators")
print(f"- sme_business_leaders: {len(SME_BUSINESS_LEADERS)} leaders")
print(f"- career_seniority_graph: {len(CAREER_SENIORITY_GRAPH)} nodes")
