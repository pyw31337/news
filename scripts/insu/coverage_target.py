#!/usr/bin/env python3
"""Measure Letsinsu's public-term collection target without claiming completion."""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "insu"
OUT = DATA / "coverage_target.json"

def load(name):
    try: return json.loads((DATA / name).read_text(encoding="utf-8"))
    except (OSError, ValueError): return {}

def run():
    provider = load("provider_catalog.json"); candidates = load("product_candidates.json")
    docs = load("document_index.json"); terms = load("policy_terms_db.json")
    # Public benchmark used for the initial scale target; it is a discovery
    # benchmark, not a claim that every row is officially verified.
    target_periods = 65670
    target_products = 23605
    extracted_providers = provider.get("count", 0)
    candidate_links = sum(len(x.get("candidate_links", [])) for x in candidates.get("providers", []))
    result = {
        "schema": 1,
        "service": "Letsinsu",
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "benchmark": {"name": "Sonsain public search benchmark", "product_rows": target_products, "sales_period_rows": target_periods, "note": "benchmark only; official-source verification remains required"},
        "current": {"directory_reported_providers": provider.get("directory_reported_count"), "official_provider_links": extracted_providers, "candidate_links": candidate_links, "raw_documents": docs.get("counts", {}).get("raw_documents", 0), "text_extracted": docs.get("counts", {}).get("text_extracted", 0), "structured_policy_groups": len(terms.get("policies", []))},
        "progress": {"provider_link_rate": round(extracted_providers / provider.get("directory_reported_count"), 4) if provider.get("directory_reported_count") else 0, "candidate_to_benchmark_product_rate": round(candidate_links / target_products, 4), "raw_doc_to_benchmark_period_rate": round(docs.get("counts", {}).get("raw_documents", 0) / target_periods, 4)},
        "next_stage": "보험사별 JS/API 공시표에서 상품명·판매기간·약관 파일 URL을 추출한 뒤 공식 원문 검증",
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__": run()
