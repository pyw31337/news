#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build a machine-readable handoff inventory from the data checkout.

This is deliberately an inventory, not a claim that a target is complete.
Every row includes the actual file evidence, cadence, and the next blocker so
another agent can resume without starting a duplicate collector.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
OUT = DATA / "db" / "system" / "collection_inventory.json"


def count(path, pattern="*.json"):
    return len([p for p in path.rglob(pattern) if p.is_file()]) if path.exists() else 0


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def build():
    legal = load(DATA / "db" / "system" / "legal_coverage.json")
    if not legal:
        legal = load(DATA / "legal" / "v1" / "coverage.json")
    corps = load(DATA / "db" / "corps" / "index.json")
    insu = load(DATA / "insu" / "policy_terms_db.json")
    providers = load(DATA / "insu" / "provider_catalog.json")
    product_candidates = load(DATA / "insu" / "product_candidates.json")
    bootstrap = load(DATA / "insu" / "bootstrap_checkpoint.json")
    documents = load(DATA / "insu" / "document_index.json")
    law = load(DATA / "lawtech" / "precedents_db.json")
    sec = load(DATA / "market" / "sec_tickers_index.json")
    rows = [
        {"id": "legal-lawoc", "domain": "법률 원문", "cadence": "3시간", "workflow": "legal.yml", "evidence": legal.get("local_counts", {}), "status": "ACTIVE", "blocker": "legal 브랜치 원장을 data 분석층과 연결"},
        {"id": "precedents", "domain": "판례·헌재·법령해석", "cadence": "일 1회 분석 + 원문 증분", "workflow": "ontology.yml + legal.yml", "evidence": {"records": len(law.get("precedents", [])), "source_backed": sum(1 for x in law.get("precedents", []) if x.get("source_url") or x.get("source"))}, "status": "SEED_AND_INCREMENTAL", "blocker": "공식 원문 URL가 있는 레코드 확대"},
        {"id": "insurance", "domain": "보험 약관·분쟁례", "cadence": "약관 변경 감지 + 주 1회 큐", "workflow": "ontology.yml", "evidence": {"directory_reported_providers": providers.get("directory_reported_count"), "provider_links": providers.get("count", 0), "approved_providers": sum(1 for x in product_candidates.get("providers", []) if not x.get("error")), "candidate_links": sum(len(x.get("candidate_links", [])) for x in product_candidates.get("providers", [])), "candidate_errors": sum(1 for x in product_candidates.get("providers", []) if x.get("error")), "bootstrap_seen": len(bootstrap.get("seen", {})), "raw_documents": count(DATA / "insu" / "raw_documents", "*.bin"), "text_extracted": documents.get("counts", {}).get("text_extracted", 0), "pdfs": documents.get("counts", {}).get("pdfs", 0), "ocr_documents": documents.get("counts", {}).get("ocr_documents", 0), "classified_documents": documents.get("counts", {}).get("classified", 0), "structured_policy_records": len(insu.get("policies", [])), "source_backed": sum(1 for x in insu.get("policies", []) if x.get("source_url") or x.get("effective_date"))}, "status": "BOOTSTRAP_AND_NORMALIZE", "blocker": "JS/API 공시표에서 상품명·판매기간·약관 원문을 구조화해 정책 레코드로 매핑"},
        {"id": "dart", "domain": "DART 기업·임원·감사의견", "cadence": "매일 + 장중 공시", "workflow": "corporate.yml + collect.yml", "evidence": {"corp_files": count(DATA / "db" / "corps"), "indexed_corps": corps.get("total_corps", 0), "filings": corps.get("total_filings", 0)}, "status": "ACTIVE", "blocker": "기업별 감사의견·임원·재무 필드 결측 보강"},
        {"id": "sec", "domain": "미국 SEC 기업·임원·공시", "cadence": "일 100개사 배치 + 실시간 8-K", "workflow": "sec-market.yml", "evidence": {"indexed": bool(sec), "companies": sec.get("total_sec_listed_companies", 0), "crawled": sec.get("crawled", 0), "detail_files": count(DATA / "market" / "sec_companies")}, "status": "INCREMENTAL", "blocker": "10-K·10-Q·8-K 문서 본문 파싱"},
        {"id": "community", "domain": "커뮤니티 버즈·민심", "cadence": "1시간", "workflow": "community crawler", "evidence": {"post_files": count(DATA / "community" / "posts", "*.jsonl")}, "status": "SOURCE_SEPARATED", "blocker": "샘플 seed와 실제 원천 게시물 분리"},
        {"id": "people-media", "domain": "인물 사진·로고·관계", "cadence": "매일 증분 / 대표 사실 일요일", "workflow": "people-photos.yml", "evidence": {"people_files": count(DATA / "db" / "people", "*.json*"), "media_files": count(DATA / "media", "*.*")}, "status": "ACTIVE_R2", "blocker": "동명이인·사진 매칭 검증률 향상"},
    ]
    result = {"schema": 1, "measured_at": datetime.now(timezone.utc).isoformat(), "rows": rows,
              "rules": ["계획값을 수집 완료로 표시하지 않음", "출처·수집시각·원문 URL 보존", "중복 수집기는 동일 id/workflow를 재사용"]}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    build()
