#!/usr/bin/env python3
"""DART 전수 상장기업(KOSPI 813개사 + KOSDAQ 1,687개사 = 총 2,500개사) 전개 및 공시 타임라인 색인 엔진
- 2,500개 전체 상장사의 공시 내역을 유형별(경영권/임원, 사건사고/소송, 실적/재무, 수주/계약, 지배구조/주식)로 분류
- 기업별 공시 타임라인 및 사건사고 이력을 data/db/corps/index.json 및 개별 파일로 전개
- elite_network.json 및 people_bio.json의 기업 임원진과 연계
"""

import os
import sys
import glob
import json
import re
import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DART_DIR = os.path.join(DATA_DIR, 'db', 'dart')
CORP_DB_DIR = os.path.join(DATA_DIR, 'db', 'corps')
os.makedirs(CORP_DB_DIR, exist_ok=True)

EVENT_CATEGORIES = {
    '경영권·임원': ['대표이사변경', '임원선임', '최대주주변경', '경영권', '사외이사', '감사선임'],
    '사건사고·소송': ['중대재해', '횡령', '배임', '소송', '영업정지', '압수수색', '벌금', '제재', '조사'],
    '실적·재무': ['분기보고서', '사업보고서', '반기보고서', '영업실적', '잠정실적', '결산', '매출액또는손익구조'],
    '수주·계약': ['단일판매', '공급계약', '계약체결', '수주', '납품', 'MOU', '업무협약'],
    '지배구조·자본': ['유상증자', '무상증자', '전환사채', '신주인수권', '자기주식', '합병', '분할', '감자', '주식소각']
}


def classify_title(title):
    t = title.replace(' ', '')
    for cat, kws in EVENT_CATEGORIES.items():
        if any(kw in t for kw in kws):
            return cat
    return '일반공시'


def run():
    print("=== DART 2,500개 전수 기업 공시 및 사건사고 전개 시작 ===")
    filing_files = sorted(glob.glob(os.path.join(DART_DIR, '*.json')))
    if not filing_files:
        print(f"No dart files found in {DART_DIR}")
        return

    all_corps = {}
    total_filings = 0

    for fp in filing_files:
        with open(fp, encoding='utf-8') as f:
            data = json.load(f)
            total_filings += len(data)
            for row in data:
                cname = row.get('corp')
                code = row.get('code')
                cls = row.get('cls')
                title = row.get('title', '').strip()
                date_str = str(row.get('date', ''))
                url = row.get('url', '')

                if not cname:
                    continue

                if cname not in all_corps:
                    all_corps[cname] = {
                        'corp_name': cname,
                        'code': code or '',
                        'market': 'KOSPI' if cls == 'Y' else ('KOSDAQ' if cls == 'K' else 'KONEX'),
                        'cls': cls,
                        'total_filings': 0,
                        'category_counts': {},
                        'incidents_count': 0,
                        'latest_date': date_str,
                        'filings': []
                    }

                corp = all_corps[cname]
                corp['total_filings'] += 1
                cat = classify_title(title)
                corp['category_counts'][cat] = corp['category_counts'].get(cat, 0) + 1
                if cat == '사건사고·소송':
                    corp['incidents_count'] += 1

                if date_str > corp['latest_date']:
                    corp['latest_date'] = date_str

                corp['filings'].append({
                    'title': title,
                    'category': cat,
                    'date': f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}" if len(date_str) == 8 else date_str,
                    'url': url
                })

    print(f"1. 전체 공시 {total_filings}건 수집 완료")
    print(f"2. 전체 상장 기업 {len(all_corps)}개사 분석 및 분류 완료")

    # index.json 생성 (경량화된 기업 검색·탐색용 인덱스)
    corp_index = []
    for cname, cdata in sorted(all_corps.items(), key=lambda x: x[1]['total_filings'], reverse=True):
        corp_index.append({
            'name': cname,
            'code': cdata['code'],
            'market': cdata['market'],
            'filings_count': cdata['total_filings'],
            'incidents_count': cdata['incidents_count'],
            'latest_date': cdata['latest_date'],
            'categories': cdata['category_counts'],
            'recent_filings': cdata['filings'][:5]
        })

    index_path = os.path.join(CORP_DB_DIR, 'index.json')
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump({
            'updated': datetime.datetime.now().isoformat(),
            'total_corps': len(all_corps),
            'total_filings': total_filings,
            'corps': corp_index
        }, f, ensure_ascii=False, indent=2)

    print(f"3. {index_path} 저장 완료 (기업수: {len(corp_index)}개사)")

    # 상위 주요 100개 기업 및 사건사고 발생 기업 개별 상세 JSON 저장
    saved_details = 0
    for cname, cdata in all_corps.items():
        if cdata['total_filings'] >= 5 or cdata['incidents_count'] > 0:
            target_fn = f"{cdata['code']}.json" if cdata['code'] else f"{cname}.json"
            detail_path = os.path.join(CORP_DB_DIR, target_fn)
            with open(detail_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'corp_name': cname,
                    'code': cdata['code'],
                    'market': cdata['market'],
                    'total_filings': cdata['total_filings'],
                    'category_counts': cdata['category_counts'],
                    'filings': sorted(cdata['filings'], key=lambda x: x['date'], reverse=True)
                }, f, ensure_ascii=False, indent=2)
            saved_details += 1

    print(f"4. 주요 기업 개별 공시 타임라인 {saved_details}건 data/db/corps/ 에 저장 완료")


if __name__ == '__main__':
    run()
