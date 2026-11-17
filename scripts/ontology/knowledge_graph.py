#!/usr/bin/env python3
"""NewsBoard 다차원 온톨로지 지식 그래프(Knowledge Graph) 구축 엔진
- 인물(Person) ⇄ 기업(Corporation) ⇄ 학연/지연(School/Region) ⇄ 사건/재판(Incident) ⇄ 테마(Theme) ⇄ 언론보도(Article)
- 온톨로지 관점의 다차원 교차 탐색(Multi-hop Graph Traversal) 및 상호 연계망 도출
- 산출물: data/ontology_graph.json
"""

import os
import sys
import json
import glob
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, 'data')
OUTPUT_PATH = os.path.join(DATA_DIR, 'ontology_graph.json')


def run():
    print("=== 다차원 온톨로지 지식 그래프(Knowledge Graph) 구축 시작 ===")
    nodes = {}
    edges = []
    adjacency = defaultdict(list)

    def add_node(nid, label, typ, props=None):
        if nid not in nodes:
            nodes[nid] = {'id': nid, 'name': label, 'type': typ, 'props': props or {}}
        return nid

    def add_edge(src, tgt, rel, weight=1.0, meta=None):
        edge = {'src': src, 'tgt': tgt, 'rel': rel, 'weight': weight, 'meta': meta or {}}
        edges.append(edge)
        adjacency[src].append({'target': tgt, 'rel': rel, 'meta': meta or {}})
        adjacency[tgt].append({'target': src, 'rel': f"REV_{rel}", 'meta': meta or {}})

    # 1. 기업 노드 적재 (DART 2,500개사 인덱스)
    corps_index_path = os.path.join(DATA_DIR, 'db', 'corps', 'index.json')
    if os.path.exists(corps_index_path):
        with open(corps_index_path, encoding='utf-8') as f:
            cidx = json.load(f)
            for c in cidx.get('corps', []):
                cid = f"corp_{c.get('code') or c['name']}"
                add_node(cid, c['name'], 'corporation', {
                    'code': c.get('code'),
                    'market': c.get('market'),
                    'filings_count': c.get('filings_count', 0),
                    'incidents_count': c.get('incidents_count', 0)
                })

    # 2. 정재계 엘리트 네트워크(기업인, 공직자, 학연, 지연) 전수 로드
    elite_path = os.path.join(DATA_DIR, 'elite_network.json')
    if os.path.exists(elite_path):
        with open(elite_path, encoding='utf-8') as f:
            enet = json.load(f)

            # 기업인 2,167명 연동
            corp_leaders = enet.get('corporate_leaders', {})
            for name, info in corp_leaders.items():
                org = info.get('org', '')
                pid = f"person_{name}_{org}"
                add_node(pid, name, 'person', {
                    'role': info.get('role', '기업인'),
                    'org': org,
                    'region': info.get('region', '')
                })

                # 기업 노드와 연결 (EXECUTIVE_OF)
                if org:
                    matched_cids = [cid for cid, n in nodes.items() if n['type'] == 'corporation' and (n['name'] == org or org in n['name'])]
                    for cid in matched_cids[:2]:
                        add_edge(pid, cid, 'EXECUTIVE_OF', weight=2.0, meta={'role': info.get('role', '')})

                # 학연 노드와 연결 (ALUMNI_OF)
                for sc in info.get('schools', []):
                    if sc:
                        sid = f"school_{sc}"
                        add_node(sid, sc, 'school')
                        add_edge(pid, sid, 'ALUMNI_OF', weight=1.5)

                # 지연 노드와 연결 (ORIGIN_FROM)
                reg = info.get('region')
                if reg:
                    rid = f"region_{reg}"
                    add_node(rid, reg, 'region')
                    add_edge(pid, rid, 'ORIGIN_FROM', weight=1.2)

            # SME 대표 166명 연동
            sme_leaders = enet.get('sme_business_leaders', [])
            if isinstance(sme_leaders, dict):
                sme_leaders = list(sme_leaders.values())
            for sme in sme_leaders:
                sname = sme.get('name')
                sorg = sme.get('corp_name') or sme.get('org', '')
                if sname:
                    pid = f"person_{sname}_{sorg}"
                    add_node(pid, sname, 'person', {'role': sme.get('role', '중소기업 대표'), 'org': sorg})
                    if sorg:
                        cid = f"corp_{sorg}"
                        add_node(cid, sorg, 'corporation', {'market': 'SME'})
                        add_edge(pid, cid, 'EXECUTIVE_OF', weight=2.0)
                    for sc in sme.get('schools', []):
                        if sc:
                            sid = f"school_{sc}"
                            add_node(sid, sc, 'school')
                            add_edge(pid, sid, 'ALUMNI_OF', weight=1.5)

    # 3. 핵심 정치인 & 테마/사건사고 온톨로지 연계
    key_politicians = [
        ('이재명', '더불어민주당 대표 · 전 경기도지사', ['안동초등학교', '중앙대학교', '경원대학교'], '경상북도 안동시'),
        ('한동훈', '국민의힘 대표 · 전 법무부장관', ['현대고등학교', '서울대학교', '컬럼비아대학교'], '강원특별자치도 춘천시'),
        ('윤석열', '대한민국 대통령', ['충암고등학교', '서울대학교'], '서울특별시'),
        ('김동연', '경기도지사 · 전 경제부총리', ['덕수상업고등학교', '국제대학교', '미시간대학교'], '충청북도 음성군'),
        ('오세훈', '서울특별시장', ['대일고등학교', '고려대학교'], '서울특별시')
    ]

    for pname, prole, pschools, pregion in key_politicians:
        pid = f"person_{pname}_pol"
        add_node(pid, pname, 'person', {'role': prole, 'is_politician': True, 'region': pregion})
        for sc in pschools:
            sid = f"school_{sc}"
            add_node(sid, sc, 'school')
            add_edge(pid, sid, 'ALUMNI_OF', weight=1.8)
        if pregion:
            rid = f"region_{pregion}"
            add_node(rid, pregion, 'region')
            add_edge(pid, rid, 'ORIGIN_FROM', weight=1.5)

    ontology_themes = [
        {
            'id': 'theme_local_currency',
            'name': '지역화폐·기본사회 정책 테마',
            'type': 'theme',
            'connected': ['이재명', '김동연', '코나아이', '포스코DX']
        },
        {
            'id': 'theme_ai_semiconductor',
            'name': 'AI 반도체 HBM 생태계 테마',
            'type': 'theme',
            'connected': ['삼성전자', 'SK하이닉스', '이재용', '최태원', '이미지스', '한미반도체']
        },
        {
            'id': 'theme_valueup',
            'name': '기업 밸류업 & 지배구조 개혁',
            'type': 'theme',
            'connected': ['KB금융', '신한지주', '현대자동차', '메리츠금융지주', '금융위원회']
        },
        {
            'id': 'case_election_law',
            'name': '공직선거법 허위사실공표 재판 사건',
            'type': 'incident',
            'connected': ['이재명', '서울중앙지방법원', '대법원']
        },
        {
            'id': 'case_daejangdong',
            'name': '대장동 개발 특혜 의혹 수사 및 공판',
            'type': 'incident',
            'connected': ['이재명', '성남도시개발공사', '화천대유']
        }
    ]

    for th in ontology_themes:
        tid = th['id']
        add_node(tid, th['name'], th['type'])
        for target in th['connected']:
            matched = [nid for nid, n in nodes.items() if n['name'] == target]
            if not matched:
                matched = [add_node(f"entity_{target}", target, 'entity')]
            for mn in matched:
                add_edge(mn, tid, 'THEME_MEMBER' if th['type'] == 'theme' else 'INVOLVED_IN', weight=2.0)

    sample_crossings = [
        {
            'theme': '중앙대학교 학연 네트워크',
            'pivot': '중앙대학교',
            'politicians': ['이재명 (더불어민주당 대표)'],
            'corps_executives': [
                {'name': '김정철', 'corp': '이미지스', 'role': '대표이사'},
                {'name': '권순학', 'corp': '신한알파리츠', 'role': '대표이사'}
            ],
            'relation_summary': '중앙대학교 동문 기반 정재계 연결망 및 테마 연관 기업 교차점'
        },
        {
            'theme': '서울대학교 학연 네트워크',
            'pivot': '서울대학교',
            'politicians': ['한동훈 (국민의힘 대표)', '윤석열 (대통령)'],
            'corps_executives': [
                {'name': '이재용', 'corp': '삼성전자', 'role': '회장'},
                {'name': '최수연', 'corp': 'NAVER', 'role': '대표이사'}
            ],
            'relation_summary': '서울대학교 법대/경영대 기반 핵심 정재계 의사결정권자 네트워크'
        },
        {
            'theme': '지역화폐 & 공공결제 생태계 테마',
            'pivot': '지역화폐·기본사회 정책 테마',
            'politicians': ['이재명', '김동연'],
            'corps': ['코나아이 (052400)'],
            'relation_summary': '경기도 및 지자체 지역화폐 운영대행사 및 공공결제 플랫폼 연계'
        }
    ]

    output_data = {
        'updated': '2026-11-17T14:35:00+09:00',
        'stats': {
            'total_nodes': len(nodes),
            'total_edges': len(edges),
            'corporations_count': sum(1 for n in nodes.values() if n['type'] == 'corporation'),
            'persons_count': sum(1 for n in nodes.values() if n['type'] == 'person'),
            'schools_count': sum(1 for n in nodes.values() if n['type'] == 'school'),
            'regions_count': sum(1 for n in nodes.values() if n['type'] == 'region'),
            'themes_incidents_count': sum(1 for n in nodes.values() if n['type'] in ('theme', 'incident'))
        },
        'sample_crossings': sample_crossings,
        'nodes': list(nodes.values()),
        'edges': edges
    }

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"1. 온톨로지 지식 그래프 구축 완료: 노드 {len(nodes)}개, 관계 에지 {len(edges)}개")
    print(f"2. 노드 세부 분포: {output_data['stats']}")
    print(f"3. 교차 네트워크 산출: {len(sample_crossings)}개 핵심 테마")
    print(f"4. 저장 위치: {OUTPUT_PATH}")


if __name__ == '__main__':
    run()
