#!/usr/bin/env python3
"""기사 본문 및 공시 텍스트 기반 자율 관계 추출(Relation Extraction) 엔진
- 수집된 기사(today.json, _arts.json) 및 실시간 공시(official.json, dart/2026-11.json) 텍스트를 실시간 NLP/패턴 파싱
- [인물 - 행동/직책 - 기업/기관 - 사건] 간의 새로운 잠재 관계를 자동으로 추출하여 온톨로지 에지(Edge)를 자율 증식
- 산출물: data/ontology_graph.json 에지 증폭 및 data/extracted_relations.json 기록
"""

import os
import sys
import json
import re
from datetime import datetime
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, 'data')
ONTO_PATH = os.path.join(DATA_DIR, 'ontology_graph.json')
EXTRACTED_LOG_PATH = os.path.join(DATA_DIR, 'extracted_relations.json')


def run():
    print("=== 비정형 텍스트 기반 자율 관계 추출(Relation Extraction) 시작 ===")
    if not os.path.exists(ONTO_PATH):
        print("오류: ontology_graph.json 파일이 존재하지 않습니다.")
        return

    with open(ONTO_PATH, encoding='utf-8') as f:
        graph = json.load(f)

    nodes_by_name = {n['name']: n for n in graph.get('nodes', [])}
    nodes_by_id = {n['id']: n for n in graph.get('nodes', [])}
    existing_edges = set((e['src'], e['tgt'], e['rel']) for e in graph.get('edges', []))

    # 주요 추출 패턴 정규식 정의
    PATTERNS = [
        # 1. 인사·영입 (사외이사, 대표, 고문 선임)
        (re.compile(r'([가-힣]{2,4})\s*(?:전\s*[\w]+|변호사|교수|의원)?(?:을|를)?\s*(?:신임|신규)?\s*(사외이사|대표이사|고문|감사위원|회장|사장)(?:으로|\s*선임|\s*영입|\s*위촉)'), 'APPOINTED_AS'),
        # 2. 상업 계약·수주 (단일판매 공급계약, 납품)
        (re.compile(r'([가-힣A-Za-z0-9]+)(?:이|가)?\s*([가-힣A-Za-z0-9]+)(?:에|과)?\s*(?:HBM|반도체|배터리|엔진|부품|자주포|무기)?\s*(공급계약|수주|납품|계약체결)'), 'COMMERCIAL_SUPPLY'),
        # 3. 사법 리스크·수사 (압수수색, 구속기소, 고발)
        (re.compile(r'([가-힣]{2,4}|[가-힣A-Za-z0-9]+)(?:에\s*대해|을|를)?\s*(압수수색|구속기소|고발|수사착수|재판|선고)'), 'UNDER_INVESTIGATION'),
        # 4. 정책·입법 발의
        (re.compile(r'([가-힣]{2,4})\s*의원(?:이|은)?\s*(?:대표)?발의한\s*([가-힣A-Za-z0-9\s]+(?:법|개정안|법률안))'), 'SPONSORED_BILL'),
        # 5. 자본 제휴·투자·인수합병 (M&A)
        (re.compile(r'([가-힣A-Za-z0-9]+)(?:이|가)?\s*([가-힣A-Za-z0-9]+)(?:의|을)?\s*(지분\s*인수|합병|투자|경영권\s*인수)'), 'INVESTED_OR_ACQUIRED')
    ]

    new_edges = []
    extracted_records = []

    # 1. 기사 데이터 스캔 (today.json 및 _arts.json)
    articles_sources = [os.path.join(DATA_DIR, 'today.json'), os.path.join(DATA_DIR, '_arts.json')]
    for asrc in articles_sources:
        if not os.path.exists(asrc):
            continue
        try:
            with open(asrc, encoding='utf-8') as f:
                content = json.load(f)
                arts = content.get('articles', []) if isinstance(content, dict) else content
                if not isinstance(arts, list):
                    continue
                for a in arts[:300]:  # 최근 주요 기사 스캔
                    title = a.get('title', '')
                    desc = a.get('desc', '') or a.get('summary', '')
                    text = f"{title} {desc}"

                    # 패턴 매칭
                    for pat, rel_type in PATTERNS:
                        m = pat.search(text)
                        if m:
                            ent1 = m.group(1).strip()
                            ent2 = m.group(2).strip()
                            if ent1 in nodes_by_name and ent2 in nodes_by_name:
                                n1 = nodes_by_name[ent1]
                                n2 = nodes_by_name[ent2]
                                ekey = (n1['id'], n2['id'], rel_type)
                                if ekey not in existing_edges:
                                    existing_edges.add(ekey)
                                    edge_dict = {
                                        'src': n1['id'],
                                        'tgt': n2['id'],
                                        'rel': rel_type,
                                        'weight': 2.0,
                                        'meta': {'evidence': title[:50], 'source': 'news_nlp'}
                                    }
                                    new_edges.append(edge_dict)
                                    extracted_records.append({
                                        'src_name': ent1,
                                        'tgt_name': ent2,
                                        'relation': rel_type,
                                        'evidence': title,
                                        'date': datetime.now().strftime('%Y-%m-%d')
                                    })
        except Exception as e:
            print(f"기사 스캔 중 참고: {e}")

    # 2. 공시 데이터 스캔 (data/db/dart/2026-11.json)
    dart_path = os.path.join(DATA_DIR, 'db', 'dart', '2026-11.json')
    if os.path.exists(dart_path):
        try:
            with open(dart_path, encoding='utf-8') as f:
                dlist = json.load(f)
                for item in dlist[:500]:
                    corp = item.get('corp')
                    title = item.get('title', '')
                    if not corp or corp not in nodes_by_name:
                        continue
                    cnode = nodes_by_name[corp]

                    # 특수관계인 출자 및 거래
                    if '특수관계인' in title and ('출자' in title or '거래' in title):
                        theme_id = 'theme_shareholder_change'
                        ekey = (cnode['id'], theme_id, 'RELATED_PARTY_TRANSACTION')
                        if ekey not in existing_edges:
                            existing_edges.add(ekey)
                            new_edges.append({
                                'src': cnode['id'],
                                'tgt': theme_id,
                                'rel': 'RELATED_PARTY_TRANSACTION',
                                'weight': 1.8,
                                'meta': {'title': title, 'date': item.get('date')}
                            })
                            extracted_records.append({
                                'src_name': corp,
                                'tgt_name': '지배구조·특수관계인',
                                'relation': 'RELATED_PARTY_TRANSACTION',
                                'evidence': title,
                                'date': item.get('date')
                            })
        except Exception as e:
            print(f"공시 스캔 중 참고: {e}")

    # 온톨로지 그래프에 신규 에지 병합
    if new_edges:
        graph['edges'].extend(new_edges)
        graph['stats']['total_edges'] = len(graph['edges'])
        graph['updated'] = datetime.now().isoformat()
        with open(ONTO_PATH, 'w', encoding='utf-8') as f:
            json.dump(graph, f, ensure_ascii=False, indent=2)

    # 추출 로그 저장
    log_data = {
        'extracted_at': datetime.now().isoformat(),
        'new_edges_count': len(new_edges),
        'records': extracted_records[:50]
    }
    with open(EXTRACTED_LOG_PATH, 'w', encoding='utf-8') as f:
        json.dump(log_data, f, ensure_ascii=False, indent=2)

    print(f"=== 자율 관계 추출 완료: 신규 에지 {len(new_edges)}건 온톨로지 자동 증폭 ===")
    for rec in extracted_records[:5]:
        print(f"  • {rec['src_name']} ➔ [{rec['relation']}] ➔ {rec['tgt_name']} (근거: {rec['evidence'][:35]}...)")


if __name__ == '__main__':
    run()
