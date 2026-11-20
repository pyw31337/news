#!/usr/bin/env python3
"""법률 아카이브의 범주별 현황·누락·분류 큐를 생성한다.

수집 원문을 임의로 채우지 않고, 현재 보유량과 공식 공개 범주의 기준량을
분리해 기록한다. 법률 학습/개인 검토용이며 법률 판단을 생성하지 않는다.
"""
import datetime as dt
import gzip
import json
import os
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', '..', 'data')
BASE = os.path.join(ROOT, 'legal', 'v1')
NOW = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).isoformat(timespec='minutes')

def load(path, default):
    try:
        with (gzip.open(path, 'rt', encoding='utf-8') if path.endswith('.gz') else open(path, encoding='utf-8')) as f:
            return json.load(f)
    except Exception:
        return default

def count_dir(path):
    total = 0
    if not os.path.isdir(path):
        return 0
    for dp, _, fs in os.walk(path):
        for fn in fs:
            if fn.endswith('.json') or fn.endswith('.json.gz'):
                val = load(os.path.join(dp, fn), [])
                total += len(val) if isinstance(val, list) else (len(val.get('items', [])) if isinstance(val, dict) else 0)
    return total

idx = load(os.path.join(BASE, 'index.json'), {})
lawgo = idx.get('lawgo', {})
categories = {
    'court_precedent': {'label': '법원 판례', 'current': int(lawgo.get('prec', 0)), 'official_catalog': 90000, 'status': 'collecting'},
    'constitutional': {'label': '헌재 결정례', 'current': int(lawgo.get('detc', 0)), 'official_catalog': 34000, 'status': 'collecting'},
    'interpretation': {'label': '법령해석례', 'current': int(lawgo.get('expc', 0)), 'official_catalog': 8300, 'status': 'collecting'},
    'administrative_appeal': {'label': '행정심판례', 'current': int(lawgo.get('decc', 0)), 'official_catalog': 550000, 'status': 'new_target'},
    'news_cases': {'label': '판결 보도 구조화', 'current': int(idx.get('news_cases', 0)), 'official_catalog': None, 'status': 'supplemental'},
    'judges_from_news': {'label': '판사·재판관 색인', 'current': int(idx.get('judges_from_news', 0)), 'official_catalog': None, 'status': 'supplemental'},
}
for key, item in categories.items():
    target = item['official_catalog']
    item['coverage_pct'] = round(item['current'] / target * 100, 2) if target else None
    item['remaining'] = max(0, target - item['current']) if target else None

planned = [
    {'key': 'law', 'label': '현행법령·시행령·시행규칙·연혁', 'priority': 'P0', 'reason': '시행일과 당시 조문을 재현'},
    {'key': 'admrul', 'label': '행정규칙·고시·훈령·예규', 'priority': 'P1', 'reason': '행정처분과 내부 기준 연결'},
    {'key': 'ordin', 'label': '자치법규·조례', 'priority': 'P1', 'reason': '지역별 생활·부동산·영업 규정'},
    {'key': 'byl', 'label': '별표·별지·법정 서식', 'priority': 'P1', 'reason': '개인 문서 초안의 근거와 제출 형식'},
    {'key': 'term', 'label': '법령용어·일상용어·관련법령 그래프', 'priority': 'P1', 'reason': '일반어 질문을 법률어로 연결'},
    {'key': 'committee', 'label': '위원회 결정문·전문 행정심판', 'priority': 'P2', 'reason': '노동·조세·개인정보·공정거래 확장'},
]
out = {
    'schema': 1,
    'updated': NOW,
    'purpose': '개인 학습·검토용 법률정보 아카이브',
    'categories': categories,
    'planned_sources': planned,
    'local_counts': {
        'lawgo_files': count_dir(os.path.join(BASE, 'lawgo')),
        'news_case_files': count_dir(os.path.join(BASE, 'news')),
        'press_items': count_dir(os.path.join(BASE, 'press')),
    },
    'quality_rules': [
        '공식 원문 URL·조회 시각·시행일을 보존',
        '법령 개정 전후를 별도 버전으로 저장',
        '판례는 사실관계·쟁점·판단·결과·참조조문을 분리',
        '개인정보·민감 사건은 공식 비실명화 범위만 저장',
        '출처 없는 요약이나 법률 결론을 생성하지 않음',
    ],
}
os.makedirs(BASE, exist_ok=True)
with open(os.path.join(BASE, 'coverage.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
# legal.yml의 '법률 수집 현황을 분석 원장에 게시' 단계는 아카이브 루트(lg/coverage.json)를
# 복사하므로, 정식 경로(legal/v1/coverage.json)와 같은 내용을 루트에도 함께 기록한다.
with open(os.path.join(ROOT, 'coverage.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(json.dumps(out, ensure_ascii=False, indent=2))
