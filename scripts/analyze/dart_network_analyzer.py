#!/usr/bin/env python3
"""DART 기업 임원 - 정치인 - 고위공직자 학연·지연·기수 교차 분석 엔진 (Corporate-Elite Cross Analyzer)
- 기업 임원과 정·관계 인사 간의 학연(동문), 지연(동향), 사법연수원 기수 접점 도출
- 인물 상세 화면 '관계' 섹터 및 기업 네트워크에 테마별 관계망으로 제공
"""

import os
import sys
import json
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NEWS_DATA = os.path.join(BASE_DIR, 'data')
ELITE_PATH = os.path.join(NEWS_DATA, 'elite_network.json')


def analyze_cross_network():
    if not os.path.exists(ELITE_PATH):
        print(f"Error: {ELITE_PATH} not found")
        return

    with open(ELITE_PATH, encoding='utf-8') as f:
        net = json.load(f)

    corps = net.get('corporate_leaders', {})
    officials = net.get('high_officials', {})
    legals = net.get('legal_elites', {})
    schools = net.get('academic_clusters', {})

    print(f"=== 교차 네트워크 분석 시작 ===")
    print(f"분석 대상: 기업 임원 {len(corps)}명, 공직자 {len(officials)}명, 법조인 {len(legals)}명")

    # 주요 대학별 기업인-공직자 매칭
    school_cross = {}
    for sch, people in schools.items():
        if len(people) < 2:
            continue
        c_list = [p for p in people if p in corps]
        o_list = [p for p in people if p in officials or p in legals]
        if c_list and o_list:
            school_cross[sch] = {
                'corporate_count': len(c_list),
                'official_count': len(o_list),
                'top_corporate': c_list[:5],
                'top_officials': o_list[:5]
            }

    print(f"주요 학연 교차 접점: {len(school_cross)}개 대학 클러스터 도출")
    for sch, info in sorted(school_cross.items(), key=lambda x: x[1]['corporate_count'] + x[1]['official_count'], reverse=True)[:5]:
        print(f"  [{sch}] 기업인 {info['corporate_count']}명 ↔ 공직/법조 {info['official_count']}명 접점")

    return school_cross


if __name__ == '__main__':
    analyze_cross_network()
