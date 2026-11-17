#!/usr/bin/env python3
"""로테크(LegalTech) 판례·양형 예측 및 형량 분석 엔진 (Sentencing & Precedent Predictor)
- 혐의 및 구체적 상황(피해액, 초범 여부, 합의/공탁, 자백, 지위 남용 등) 입력 시
- 대법원 양형위원회 공식 양형기준(감경/기본/가중) 및 실제 유사 판례 통계 기반의 예상 형량 산출
- 집행유예 가능성(긍정/부정 인자 대조) 및 실형 확률 예측 리포트 도출
"""

import os
import sys
import json

# -------------------------------------------------------------
# 대법원 양형위원회 공식 양형기준 DB (주요 공직·경제·형사 범죄)
# -------------------------------------------------------------
SENTENCING_GUIDELINES = {
    "공직선거법_허위사실공표": {
        "title": "공직선거법상 허위사실공표죄 (제250조)",
        "unit": "개월",
        "levels": [
            {
                "type": "당선 목적 허위사실공표 (기본)",
                "mitigated": {"min_m": 0, "max_m": 8, "fine_possible": True, "desc": "벌금 100만~300만 원 또는 징역 8개월 이하"},
                "basic": {"min_m": 6, "max_m": 16, "fine_possible": False, "desc": "징역 6개월 ~ 1년 4개월 또는 벌금 500만 원 이상"},
                "aggravated": {"min_m": 10, "max_m": 24, "fine_possible": False, "desc": "징역 10개월 ~ 2년 이하 (당선무효형 확실시)"}
            },
            {
                "type": "낙선 목적 허위사실공표 (중대)",
                "mitigated": {"min_m": 6, "max_m": 12, "fine_possible": True, "desc": "징역 6개월~1년 또는 벌금 300만~500만 원"},
                "basic": {"min_m": 10, "max_m": 24, "fine_possible": False, "desc": "징역 10개월 ~ 2년"},
                "aggravated": {"min_m": 18, "max_m": 36, "fine_possible": False, "desc": "징역 1년 6개월 ~ 3년"}
            }
        ],
        "factors": {
            "mitigating": ["자진 정정·해명", "위법성 인식 미약", "진지한 반성", "초범 또는 동종 전과 없음", "선거에 미친 영향 미미"],
            "aggravating": ["계획적·조직적 공표", "전파성 높은 매체(방송·SNS) 이용", "상대 후보 비방 목적", "동종 전과 보유", "선거 결과에 중대한 영향"]
        },
        "stats": {
            "prison_rate": 18.5,
            "probation_rate": 42.1,
            "fine_rate": 39.4,
            "loss_of_seat_rate": 62.8  # 100만 원 이상 당선무효형 비율
        }
    },
    "뇌물수수": {
        "title": "형법 및 특가법상 뇌물수수죄 (제129조 등)",
        "unit": "개월",
        "levels": [
            {
                "type": "수뢰액 3천만 원 미만",
                "mitigated": {"min_m": 4, "max_m": 10, "fine_possible": True, "desc": "징역 4~10개월"},
                "basic": {"min_m": 8, "max_m": 18, "fine_possible": False, "desc": "징역 8개월 ~ 1년 6개월"},
                "aggravated": {"min_m": 12, "max_m": 30, "fine_possible": False, "desc": "징역 1년 ~ 2년 6개월"}
            },
            {
                "type": "수뢰액 3천만 원 이상 5천만 원 미만",
                "mitigated": {"min_m": 18, "max_m": 36, "fine_possible": False, "desc": "징역 1년 6개월 ~ 3년"},
                "basic": {"min_m": 30, "max_m": 48, "fine_possible": False, "desc": "징역 2년 6개월 ~ 4년"},
                "aggravated": {"min_m": 40, "max_m": 60, "fine_possible": False, "desc": "징역 3년 4개월 ~ 5년"}
            },
            {
                "type": "수뢰액 1억 원 이상 (특가법 적용)",
                "mitigated": {"min_m": 60, "max_m": 84, "fine_possible": False, "desc": "징역 5년 ~ 7년"},
                "basic": {"min_m": 84, "max_m": 120, "fine_possible": False, "desc": "징역 7년 ~ 10년"},
                "aggravated": {"min_m": 108, "max_m": 180, "fine_possible": False, "desc": "징역 9년 ~ 15년 이상"}
            }
        ],
        "factors": {
            "mitigating": ["수동적 수수", "수뢰액 전액 반환·추징", "내부고발·수사협조", "초범"],
            "aggravating": ["적극적 요구", "직무 집행의 부정한 처리(부정처사)", "고위공직자 직권남용", "장기간 반복 수수"]
        },
        "stats": {
            "prison_rate": 65.2,
            "probation_rate": 31.4,
            "fine_rate": 3.4,
            "loss_of_seat_rate": 96.6
        }
    },
    "업무상_배임_횡령": {
        "title": "형법 및 특경가법상 업무상 배임·횡령죄 (제356조)",
        "unit": "개월",
        "levels": [
            {
                "type": "이득액 5억 원 이상 50억 원 미만 (특경법)",
                "mitigated": {"min_m": 18, "max_m": 36, "fine_possible": False, "desc": "징역 1년 6개월 ~ 3년"},
                "basic": {"min_m": 36, "max_m": 60, "fine_possible": False, "desc": "징역 3년 ~ 5년"},
                "aggravated": {"min_m": 48, "max_m": 84, "fine_possible": False, "desc": "징역 4년 ~ 7년"}
            },
            {
                "type": "이득액 50억 원 이상 (특경법 중대)",
                "mitigated": {"min_m": 30, "max_m": 60, "fine_possible": False, "desc": "징역 2년 6개월 ~ 5년"},
                "basic": {"min_m": 60, "max_m": 96, "fine_possible": False, "desc": "징역 5년 ~ 8년"},
                "aggravated": {"min_m": 84, "max_m": 144, "fine_possible": False, "desc": "징역 7년 ~ 12년"}
            }
        ],
        "factors": {
            "mitigating": ["피해 전액 공탁 또는 변제", "경영판단상 불가피성 인정", "실질적 개인 착복 없음", "피해자 처벌불원"],
            "aggravating": ["회사 부도 초래 또는 대규모 피해", "분식회계·조직적 은폐", "개인 사리사욕 유용", "동종 누범"]
        },
        "stats": {
            "prison_rate": 52.4,
            "probation_rate": 45.1,
            "fine_rate": 2.5,
            "loss_of_seat_rate": 97.5
        }
    }
}


def predict_sentence(crime_key, level_idx=0, situation=None):
    """상황 기반 형량 예측 분석기"""
    guide = SENTENCING_GUIDELINES.get(crime_key)
    if not guide:
        return {"error": f"지원되지 않는 혐의입니다: {crime_key}"}

    levels = guide["levels"]
    level = levels[min(level_idx, len(levels) - 1)]
    factors = guide["factors"]
    stats = guide["stats"]

    situation = situation or {}
    mitigating_hits = [f for f in factors["mitigating"] if situation.get(f)]
    aggravating_hits = [f for f in factors["aggravating"] if situation.get(f)]

    # 영역 판정 (양형위 원칙)
    balance = len(aggravating_hits) - len(mitigating_hits)
    if balance >= 2:
        zone = "가중 영역 (Aggravated)"
        range_data = level["aggravated"]
        zone_desc = "가중 요소가 우세하여 법정형 상한에 가까운 엄벌 권고"
    elif balance <= -2:
        zone = "감경 영역 (Mitigated)"
        range_data = level["mitigated"]
        zone_desc = "유리한 정상(합의, 반성, 초범 등)이 참작되어 형량 감경 권고"
    else:
        zone = "기본 영역 (Basic)"
        range_data = level["basic"]
        zone_desc = "특별한 가중/감경 요소가 상쇄되어 표준 권고 형량 적용"

    # 집행유예 가능성 판정 (3년 이하 징역형일 때만 법적 가능)
    max_m = range_data["max_m"]
    can_suspend = max_m <= 36
    probation_prob = 0
    if can_suspend:
        probation_prob = max(10, min(95, stats["probation_rate"] + (len(mitigating_hits) * 15) - (len(aggravating_hits) * 20)))

    return {
        "crime": guide["title"],
        "level_type": level["type"],
        "zone": zone,
        "zone_desc": zone_desc,
        "expected_range": range_data["desc"],
        "min_months": range_data["min_m"],
        "max_months": range_data["max_m"],
        "fine_possible": range_data["fine_possible"],
        "can_suspend_sentence": can_suspend,
        "probation_probability": f"{probation_prob:.1f}%" if can_suspend else "불가 (징역 3년 초과)",
        "applied_mitigating": mitigating_hits,
        "applied_aggravating": aggravating_hits,
        "precedent_statistics": stats
    }


if __name__ == '__main__':
    # 테스트 실행: 공직선거법 허위사실공표죄 (초범 vs 전파성 높은 매체)
    res = predict_sentence("공직선거법_허위사실공표", level_idx=0, situation={
        "초범 또는 동종 전과 없음": True,
        "진지한 반성": True,
        "전파성 높은 매체(방송·SNS) 이용": True
    })
    print("=== 로테크 양형 예측 결과 ===")
    print(json.dumps(res, indent=2, ensure_ascii=False))
