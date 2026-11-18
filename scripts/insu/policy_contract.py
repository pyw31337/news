#!/usr/bin/env python3
"""Versioned policy-term contract and evidence-only claim matching."""
import json, re, sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "insu"
DB = DATA / "policy_terms_db.json"
OUT = DATA / "policy_version_index.json"

def build_index():
    db = json.loads(DB.read_text(encoding="utf-8")) if DB.exists() else {}
    rows = []
    for p in db.get("policies", []):
        rows.append({"policy_id": p.get("policy_id") or p.get("category"), "insurer": p.get("insurer") or p.get("insurer_coverage"), "effective_period": p.get("effective_period"), "source_url": p.get("source_url"), "source_status": "VERIFIED" if p.get("source_url") else "SEED", "captured_at": db.get("updated_at")})
    result = {"schema": 1, "updated_at": datetime.now(timezone.utc).isoformat(), "versions": rows}
    OUT.parent.mkdir(parents=True, exist_ok=True); OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result

def match_claim(path):
    claim = json.loads(Path(path).read_text(encoding="utf-8"))
    db = json.loads(DB.read_text(encoding="utf-8")) if DB.exists() else {}
    terms = " ".join(str(claim.get(k, "")) for k in ("product", "coverage", "diagnosis", "event"))
    tokens = set(re.findall(r"[가-힣A-Za-z0-9]{2,}", terms.lower()))
    hits = []
    for p in db.get("policies", []):
        text = json.dumps(p, ensure_ascii=False).lower(); overlap = sorted(t for t in tokens if t in text)
        if overlap:
            hits.append({"policy_id": p.get("policy_id") or p.get("category"), "matched_terms": overlap, "source_url": p.get("source_url"), "effective_period": p.get("effective_period"), "evidence_fields": [k for k in ("key_benefits", "exclusion_clauses", "dispute_cases", "court_precedent") if p.get(k)]})
    return {"disclaimer": "참고용 근거 검색이며 보험금 지급 여부나 법률 자문이 아닙니다.", "matched": hits, "generated_at": datetime.now(timezone.utc).isoformat()}

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "match" and len(sys.argv) > 2: print(json.dumps(match_claim(sys.argv[2]), ensure_ascii=False, indent=2))
    else: print(json.dumps(build_index(), ensure_ascii=False, indent=2))
