#!/usr/bin/env python3
"""뉴스보드 마이크로서비스 연합 데이터 브리지 (Federated Data Bridge SDK)
- 렛츠로(Let's Law): 법률·판례 데이터 분산 호출
- 렛츠인슈(Let's Insu): 전 보험사 시기별 약관 및 지급 방어 데이터 분산 호출
- 렛츠에셋(Let's Asset): DART 15년 재무/임원 및 글로벌 상장사 데이터 분산 호출
- 렛츠피플(Let's People, 가칭): 다차원 인물망 연계
- 컬처플로우 ➔ 렛츠캠핑과 동일한 Single Source of Truth(SSOT) 분산 원장 소비 구조
"""

import os
import sys
import json
import urllib.request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEVELOPER_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))

# 원격 프로덕션 엔드포인트 및 로컬 폴백 매핑
ENDPOINTS = {
    "law": {
        "remote": "https://pyw31337.github.io/law/data/precedents_db.json",
        "local": os.path.join(DEVELOPER_ROOT, "law", "data", "precedents_db.json")
    },
    "insu": {
        "remote": "https://pyw31337.github.io/insu/data/policy_terms_db.json",
        "local": os.path.join(DEVELOPER_ROOT, "insu", "data", "policy_terms_db.json")
    },
    "asset": {
        "remote": "https://pyw31337.github.io/asset/data/all_dimensions_dossier.json",
        "local": os.path.join(DEVELOPER_ROOT, "asset", "data", "all_dimensions_dossier.json")
    }
}

class FederatedDataMeshClient:
    """패밀리 서비스 간 온톨로지 원장 조회 클라이언트"""
    
    @staticmethod
    def _fetch_ledger(service_name):
        cfg = ENDPOINTS.get(service_name)
        if not cfg:
            raise ValueError(f"Unknown service: {service_name}")
            
        # 1. 로컬 형제 디렉토리 우선 검사 (개발/로컬 테스트 속도 최적화)
        if os.path.exists(cfg["local"]):
            try:
                with open(cfg["local"], "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                pass
                
        # 2. 원격 배포 엔드포인트 폴백
        try:
            req = urllib.request.Request(cfg["remote"], headers={"User-Agent": "NewsBoard-Federation/1.0"})
            with urllib.request.urlopen(req, timeout=5) as res:
                return json.loads(res.read().decode("utf-8"))
        except Exception as e:
            return None

    @classmethod
    def get_law_precedent(cls, case_no):
        """렛츠로에서 특정 판례 조회 (URN: urn:law:precedent:{case_no})"""
        data = cls._fetch_ledger("law")
        if not data:
            return None
        for p in data.get("precedents", []):
            if p.get("case_no") == case_no:
                return p
        return None

    @classmethod
    def get_insu_policy(cls, category_or_keyword):
        """렛츠인슈에서 특정 보험 약관 조회 (URN: urn:insu:policy:...)"""
        data = cls._fetch_ledger("insu")
        if not data:
            return None
        for p in data.get("policies", []):
            if category_or_keyword in p.get("category", ""):
                return p
        return None

    @classmethod
    def get_asset_corp(cls, stock_code):
        """렛츠에셋에서 기업 전방위 공시·재무 조회 (URN: urn:asset:corp:kr:{code})"""
        data = cls._fetch_ledger("asset")
        if not data:
            return None
        return data.get("companies", {}).get(stock_code)

def main():
    print("=== 뉴스보드 마이크로서비스 연합 데이터 브리지 테스트 ===")
    client = FederatedDataMeshClient()
    
    # 1. 렛츠로 연동 테스트
    law_case = client.get_law_precedent("2016헌나1")
    if law_case:
        print(f"✔ [렛츠로 연동 성공] {law_case.get('case_name')} -> {law_case.get('court')} ({law_case.get('date')})")
    else:
        print("✘ [렛츠로 연동 실패]")

    # 2. 렛츠인슈 연동 테스트
    insu_policy = client.get_insu_policy("1세대 구실손")
    if insu_policy:
        print(f"✔ [렛츠인슈 연동 성공] {insu_policy.get('category')} -> {insu_policy.get('key_coverage')[:40]}...")
    else:
        print("✘ [렛츠인슈 연동 실패]")

    # 3. 렛츠에셋 연동 테스트
    corp = client.get_asset_corp("005930")
    if corp:
        print(f"✔ [렛츠에셋 연동 성공] {corp.get('corp_name')} -> 감사의견 {corp.get('audit_opinion', {}).get('opinion')} / 회장 {corp.get('executives', {}).get('key_leaders', [{}])[0].get('name')}")
    else:
        print("✘ [렛츠에셋 연동 실패]")

if __name__ == '__main__':
    main()
