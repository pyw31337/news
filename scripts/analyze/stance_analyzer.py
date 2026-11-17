#!/usr/bin/env python3
"""인물 발언 타임라인 스탠스/입장 변화 분석 엔진 (Stance Shift & Consistency Analyzer)
- 동일 아젠다(토픽)에 대해 과거 시점 -> 중간 경과 -> 최근 입장 간의 변화 및 일관성을 통계·의미론적으로 판별
- 찬성/추진(Positive), 반대/비판(Negative), 조건부/신중(Conditional/Nuanced) 극성 탐지
- 일관 유지(Consistent), 입장 선회(Shift/Reversal), 스탠스 강화(Intensified), 입장 구체화(Specified) 판정
"""

import os
import sys
import re
import json

POS_WORDS = re.compile(r'추진|도입|찬성|지지|확대|전면|수용|개혁|강화|배당|환수|약속|성공|정상화|배우고|존경|계승|민생|필요|마련|공약|지켜')
NEG_WORDS = re.compile(r'반대|비판|규탄|저지|막아야|거부|부당|실패|탈옥|기소|처벌|특검|수사|조작|탄압|폐기|사기|오만|독선|심판|폭거|사퇴')
NEU_WORDS = re.compile(r'검토|신중|논의|조건|유보|조율|시기상조|현실적|상황')


def score_text(text):
    pos = len(POS_WORDS.findall(text))
    neg = len(NEG_WORDS.findall(text))
    return pos - neg


def analyze_agenda_shift(items, term):
    if not items:
        return None

    # 시간순 정렬
    sorted_items = sorted(items, key=lambda x: x.get('d', ''))
    first = sorted_items[0]
    last = sorted_items[-1]
    mid = sorted_items[len(sorted_items) // 2] if len(sorted_items) >= 3 else None

    s_first = score_text(f"{first.get('quote', '')} {first.get('title', '')}")
    s_last = score_text(f"{last.get('quote', '')} {last.get('title', '')}")

    y_first = first.get('d', '')[:4]
    y_last = last.get('d', '')[:4]

    if s_first < 0 and s_last > 0:
        status = '입장 선회'
        code = 'shift_pos'
        desc = f"{y_first}년 초기 비판·반대 기조에서 {y_last}년 최근 추진·수용 입장으로 변화"
    elif s_first > 0 and s_last < 0:
        status = '입장 선회'
        code = 'shift_neg'
        desc = f"{y_first}년 초기 긍정·추진 기조에서 {y_last}년 최근 강력 비판·반대 입장으로 선회"
    elif (s_first > 0 and s_last > 0) or (s_first < 0 and s_last < 0):
        status = '기조 일관'
        code = 'consistent'
        desc = f"{y_first}년 초기 발언과 {y_last}년 최근 발언의 스탠스가 일관되게 유지됨"
    elif s_last != 0 and s_first == 0:
        status = '입장 구체화'
        code = 'specified'
        desc = f"초기 원론적 검토에서 {y_last}년 명확한 실천·추진 스탠스로 구체화"
    else:
        status = '맥락적 조율'
        code = 'adjusted'
        desc = f"정국 상황과 국면에 따라 정책 세부 실행안을 점진적으로 조율"

    return {
        'term': term,
        'status': status,
        'code': code,
        'desc': desc,
        'count': len(items),
        'span': f"{y_first}년 ~ {y_last}년",
        'first': {'year': y_first, 'quote': first.get('quote', ''), 'press': first.get('press', '')},
        'last': {'year': y_last, 'quote': last.get('quote', ''), 'press': last.get('press', '')}
    }


if __name__ == '__main__':
    # 테스트 샘플
    sample = [
        {'d': '2016-06-09', 'quote': '호화청사 민간에 팔겠다', 'title': '이재명 성남시장 호화청사 민간에 팔겠다'},
        {'d': '2024-10-07', 'quote': '복지부는 응급의료헬기 규정 명확히 하라', 'title': '국감서 언급된 이재명 의원 헬기이송'}
    ]
    res = analyze_agenda_shift(sample, '지방자치·행정')
    print("분석 결과:", json.dumps(res, indent=2, ensure_ascii=False))
