#!/usr/bin/env python3
"""DART(전자공시시스템) 상장·중소기업 대표 및 주요 임원 전수 추출·분석 엔진
- 분기보고서/사업보고서 내 'VIII. 임원 및 직원 등에 관한 사항' 파싱
- 임원·주요주주 소유상황보고서 내 보고자 정보 파싱
- 대표이사, 등기/비등기 임원의 성명, 출생년월, 학력(학연), 주요 경력, 거주지(지연) 추출
- elite_network.json (corporate_leaders, sme_business_leaders, academic_clusters) 및 people_bio.json 연계
"""

import os
import sys
import re
import json
import time
import urllib.request
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DART_DIR = os.path.join(DATA_DIR, 'db', 'dart')
ELITE_PATH = os.path.join(DATA_DIR, 'elite_network.json')
POL_ELITE_PATH = os.path.join(os.path.dirname(BASE_DIR), 'pol', 'pdata', 'elite_network.json')
BIO_PATH = os.path.join(DATA_DIR, 'people_bio.json')

HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) NewsBoardBot/1.0'}


class SimpleTableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.cur_row = []
        self.cur_cell = []
        self.in_cell = False

    def handle_starttag(self, tag, attrs):
        if tag in ('td', 'th'):
            self.in_cell = True
            self.cur_cell = []
        elif tag == 'tr':
            self.cur_row = []

    def handle_endtag(self, tag):
        if tag in ('td', 'th'):
            self.in_cell = False
            self.cur_row.append(' '.join(self.cur_cell).strip())
        elif tag == 'tr':
            if any(self.cur_row):
                self.rows.append(self.cur_row)

    def handle_data(self, data):
        if self.in_cell:
            t = data.strip()
            if t:
                self.cur_cell.append(t)


def fetch_url(url, timeout=12):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except Exception:
        return None


def extract_executives_from_quarter_report(rcp_no, corp_name, stock_code, corp_cls):
    """분기/사업보고서 내 임원 현황 테이블 추출"""
    viewer_url = f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcp_no}"
    html = fetch_url(viewer_url)
    if not html:
        return []

    # 'VIII. 임원 및 직원 등에 관한 사항' 또는 '임원' 노드 찾기
    m = re.search(r"node1\['text'\]\s*=\s*['\"](?:VIII\.\s*)?임원\s*(?:및\s*직원)?[^'\"]*['\"];[\s\S]*?node1\['dcmNo'\]\s*=\s*['\"](\d+)['\"];[\s\S]*?node1\['eleId'\]\s*=\s*['\"](\d+)['\"];[\s\S]*?node1\['offset'\]\s*=\s*['\"](\d+)['\"];[\s\S]*?node1\['length'\]\s*=\s*['\"](\d+)['\"];", html)
    if not m:
        # 광범위 매칭
        pos = html.find('임원 및 직원')
        if pos == -1:
            pos = html.find('임원의 현황')
        if pos != -1:
            sub = html[max(0, pos-150):pos+350]
            m_dcm = re.search(r"node1\['dcmNo'\]\s*=\s*['\"](\d+)['\"]", sub)
            m_ele = re.search(r"node1\['eleId'\]\s*=\s*['\"](\d+)['\"]", sub)
            m_off = re.search(r"node1\['offset'\]\s*=\s*['\"](\d+)['\"]", sub)
            m_len = re.search(r"node1\['length'\]\s*=\s*['\"](\d+)['\"]", sub)
            if m_dcm and m_ele and m_off and m_len:
                dcm_no, ele_id, offset, length = m_dcm.group(1), m_ele.group(1), m_off.group(1), m_len.group(1)
            else:
                return []
        else:
            return []
    else:
        dcm_no, ele_id, offset, length = m.groups()

    doc_url = f"https://dart.fss.or.kr/report/viewer.do?rcpNo={rcp_no}&dcmNo={dcm_no}&eleId={ele_id}&offset={offset}&length={length}&dtd=dart4.xsd"
    doc_html = fetch_url(doc_url)
    if not doc_html:
        return []

    parser = SimpleTableParser()
    parser.feed(doc_html)

    executives = []
    header_idx = -1
    for i, row in enumerate(parser.rows):
        row_str = ' '.join(row)
        if '성명' in row_str and ('직위' in row_str or '출생년월' in row_str or '주요경력' in row_str):
            header_idx = i
            break

    if header_idx == -1:
        return []

    headers = parser.rows[header_idx]
    # 열 위치 파악
    name_col = next((i for i, h in enumerate(headers) if '성명' in h), -1)
    birth_col = next((i for i, h in enumerate(headers) if '출생' in h or '연령' in h), -1)
    title_col = next((i for i, h in enumerate(headers) if '직위' in h), -1)
    career_col = next((i for i, h in enumerate(headers) if '경력' in h or '약력' in h or '담당' in h), -1)

    if name_col == -1 or title_col == -1:
        return []

    for row in parser.rows[header_idx+1:]:
        if len(row) <= max(name_col, title_col):
            continue
        raw_name = row[name_col].strip()
        # 공백이나 특수문자 제거
        clean_name = re.sub(r'[\s\d\(\)\[\]\*\-\.\,]', '', raw_name)
        if not (2 <= len(clean_name) <= 6 and re.match(r'^[가-힣]+$', clean_name)):
            continue
        if clean_name in ('성명', '계', '총계', '합계', '소계', '남', '여', '평균'):
            continue

        title = row[title_col].strip() if title_col < len(row) else ''
        birth = row[birth_col].strip() if birth_col != -1 and birth_col < len(row) else ''
        career_raw = row[career_col].strip() if career_col != -1 and career_col < len(row) else ''

        # 학력 및 경력 분리
        schools = []
        for sm in re.finditer(r'([가-힣]+(?:대학교|대학원|고등학교))', career_raw):
            sch = sm.group(1)
            if sch not in schools:
                schools.append(sch)

        executives.append({
            'name': clean_name,
            'corp': corp_name,
            'code': stock_code,
            'cls': corp_cls,
            'role': title or '임원',
            'birth': birth,
            'career': career_raw,
            'schools': schools,
            'rcp_no': rcp_no
        })

    return executives


def run_dart_extraction(limit_reports=60):
    print("=== DART 공시 기업 대표 및 주요 임원 수집·분석 시작 ===")
    filings = []
    for fn in ('2026-11.json', '2026-10.json'):
        fp = os.path.join(DART_DIR, fn)
        if os.path.exists(fp):
            with open(fp, encoding='utf-8') as f:
                filings.extend(json.load(f))

    # 분기보고서 / 사업보고서 우선 선택 (중복 회사 제거)
    seen_corps = set()
    target_reports = []
    for f in filings:
        if ('분기보고서' in f.get('title', '') or '사업보고서' in f.get('title', '')) and f.get('corp') not in seen_corps:
            seen_corps.add(f.get('corp'))
            target_reports.append(f)
            if len(target_reports) >= limit_reports:
                break

    print(f"1. 대상 공시 보고서: {len(target_reports)}개 기업 선정")

    extracted_execs = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(
                extract_executives_from_quarter_report,
                r.get('url', '').split('rcpNo=')[-1],
                r.get('corp'),
                r.get('code'),
                r.get('cls')
            ): r for r in target_reports
        }
        for fut in as_completed(futures):
            res = fut.result()
            if res:
                extracted_execs.extend(res)

    print(f"2. DART 임원 추출 완료: 총 {len(extracted_execs)}명 추출")

    # elite_network.json 업데이트
    if not os.path.exists(ELITE_PATH):
        print(f"Error: {ELITE_PATH} not found")
        return

    with open(ELITE_PATH, encoding='utf-8') as f:
        net = json.load(f)

    corp_leaders = net.get('corporate_leaders', {})
    sme_leaders = net.get('sme_business_leaders', [])
    if isinstance(sme_leaders, dict):
        sme_leaders = list(sme_leaders.values())

    sme_names = set(x.get('name') for x in sme_leaders)
    acad_clusters = net.get('academic_clusters', {})

    added_sme = 0
    added_corp = 0

    for ex in extracted_execs:
        name = ex['name']
        corp = ex['corp']
        role = ex['role']
        is_ceo = '대표' in role or '회장' in role or '사장' in role

        entry = {
            'name': name,
            'kind': 'corporate',
            'role': f"{corp} {role}",
            'org': corp,
            'birth': ex['birth'],
            'schools': ex['schools'],
            'career': ex['career'],
            'dart_rcp': ex['rcp_no']
        }

        # 대표이사급은 corporate_leaders 및 sme_business_leaders 둘 다 등록
        if is_ceo:
            if name not in corp_leaders:
                corp_leaders[name] = entry
                added_corp += 1
            if name not in sme_names:
                sme_names.add(name)
                sme_leaders.append({
                    'name': name,
                    'company': corp,
                    'role': role,
                    'category': 'DART 공시 기업' if ex.get('cls') == 'Y' else '코스닥/혁신중소기업',
                    'education': ', '.join(ex['schools']) if ex['schools'] else '',
                    'summary': f"{corp} {role}. 출생년월: {ex['birth']}. {ex['career'][:120]}"
                })
                added_sme += 1
        else:
            # 주요 등기임원 / 사내이사도 corporate_leaders에 등재
            if name not in corp_leaders:
                corp_leaders[name] = entry
                added_corp += 1

        # 학연 클러스터 연결
        for sch in ex['schools']:
            if sch not in acad_clusters:
                acad_clusters[sch] = []
            if name not in acad_clusters[sch]:
                acad_clusters[sch].append(name)

    net['corporate_leaders'] = corp_leaders
    net['sme_business_leaders'] = sme_leaders
    net['academic_clusters'] = acad_clusters
    net['counts']['corporate'] = len(corp_leaders)
    net['counts']['sme'] = len(sme_leaders)
    net['counts']['school_clusters'] = len(acad_clusters)
    net['updated'] = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat()

    # 저장
    with open(ELITE_PATH, 'w', encoding='utf-8') as f:
        json.dump(net, f, ensure_ascii=False, indent=2)
    print(f"3. {ELITE_PATH} 갱신 완료 (대표이사 신규: {added_sme}명, 기업 임원 신규: {added_corp}명, 총 기업인 {len(corp_leaders)}명)")

    if os.path.exists(POL_ELITE_PATH):
        with open(POL_ELITE_PATH, 'w', encoding='utf-8') as f:
            json.dump(net, f, ensure_ascii=False, indent=2)
        print(f"4. {POL_ELITE_PATH} 동기화 완료")

    # people_bio.json 업데이트
    if os.path.exists(BIO_PATH):
        with open(BIO_PATH, encoding='utf-8') as f:
            bio = json.load(f)
        for ex in extracted_execs:
            name = ex['name']
            if name not in bio:
                bio[name] = {
                    'kind': 'corporate',
                    'role_title': f"{ex['corp']} {ex['role']}",
                    'org': ex['corp'],
                    'birth_desc': f"출생년월: {ex['birth']}" if ex['birth'] else '',
                    'military': '',
                    'events': [{'date': ex['birth'][:4] if ex['birth'] else '', 'title': sch} for sch in ex['schools']]
                }
        with open(BIO_PATH, 'w', encoding='utf-8') as f:
            json.dump(bio, f, ensure_ascii=False)
        print(f"5. {BIO_PATH} 기업인 바이오 인덱스 동기화 완료 (총 인물: {len(bio)}명)")


if __name__ == '__main__':
    import datetime
    run_dart_extraction(limit_reports=70)
