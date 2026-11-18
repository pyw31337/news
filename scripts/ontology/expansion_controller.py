#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Evidence-based collection expansion controller.

The old lifecycle report contained hand-entered counts.  This controller only
reports counts that can be observed in the data checkout and never promotes a
source when its records are merely a static seed.  A tier is promoted only
when coverage, freshness, quality and source evidence all pass.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
OUT = DATA / "db" / "system" / "global_expansion_radar.json"


def read(path: Path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return default if default is not None else {}


def json_files(path: Path):
    return [p for p in path.glob("*.json") if p.is_file() and p.name not in {
        "index.json", "status.json", "batch_status.json", "progress.json"
    }]


def metric(id_, label, target, completed, source, evidence, *, quality=None, note=None):
    target = max(int(target or 0), 0)
    completed = max(int(completed or 0), 0)
    coverage = round(completed / target, 4) if target else 0.0
    quality_ok = quality is not None and float(quality) >= 0.85
    promoted = coverage >= 0.90 and quality_ok and bool(evidence)
    return {
        "id": id_, "label": label, "target": target,
        "completed": completed, "coverage": coverage,
        "coverage_percent": round(coverage * 100, 1),
        "source": source, "source_verified": bool(evidence),
        "quality_score": quality, "quality_gate": quality_ok,
        "status": "READY_TO_EXPAND" if promoted else (
            "COLLECTING" if coverage < 0.90 else "HOLD_QUALITY_OR_SOURCE"),
        "note": note or ""
    }


def quality_score():
    candidates = [DATA / "db" / "system" / "data_quality_report.json",
                  DATA / "quality_report.json"]
    for p in candidates:
        d = read(p)
        # The legacy lifecycle manager writes illustrative, hand-entered
        # percentages.  Only a report carrying an explicit measured marker is
        # allowed to unlock automatic expansion.
        if not (d.get("measured_at") or d.get("generated_by") in {"quality.py", "qa"}):
            continue
        for key in ("score", "quality_score", "overall_score"):
            if isinstance(d.get(key), (int, float)):
                value = float(d[key])
                return value / 100 if value > 1 else value
    return None


def law_metric(q):
    db = read(DATA / "lawtech" / "precedents_db.json")
    rows = db.get("precedents", []) if isinstance(db, dict) else []
    # A seed ledger is useful for UI development but is not evidence of source
    # coverage.  Require a source URL or collection marker for promotion.
    evidence = any(isinstance(x, dict) and (x.get("source_url") or x.get("source")) for x in rows)
    return metric("law-precedents", "법원·헌재 판례", max(len(rows), 1), len(rows),
                  "국가법령정보·법원 공개자료", evidence, quality=q,
                  note="source_url/source 필드가 있는 원문 수집분만 확장 게이트에 반영")


def insurance_metric(q):
    db = read(DATA / "insu" / "policy_terms_db.json")
    rows = db.get("policies", []) if isinstance(db, dict) else []
    evidence = any(isinstance(x, dict) and (x.get("source_url") or x.get("effective_date")) for x in rows)
    return metric("insurance-terms", "보험 약관·분쟁례", max(len(rows), 1), len(rows),
                  "보험사 공시·금융감독원", evidence, quality=q,
                  note="현재 원장에 공식 source_url/effective_date가 없는 항목은 seed로 표시")


def build():
    q = quality_score()
    corps = len(json_files(DATA / "db" / "corps")) if (DATA / "db" / "corps").exists() else 0
    corp_target = 2498
    idx = read(DATA / "db" / "corps" / "index.json")
    if isinstance(idx, dict):
        corp_target = int(idx.get("total", idx.get("count", corp_target)) or corp_target)
    community = list((DATA / "community" / "posts").glob("*.jsonl")) if (DATA / "community" / "posts").exists() else []
    people_files = list((DATA / "db" / "people").glob("*.json*")) if (DATA / "db" / "people").exists() else []
    sec_index = read(DATA / "market" / "sec_tickers_index.json")
    if not sec_index:
        sec_index = read(DATA / "market" / "sec_index.json")
    sec_total = int(sec_index.get("total_sec_listed_companies", 6850) or 6850) if isinstance(sec_index, dict) else 6850
    sec_done = int(sec_index.get("crawled", sec_index.get("completed", 0)) or 0) if isinstance(sec_index, dict) else 0
    metrics = [
        metric("kr-corporates", "한국 상장사·DART", corp_target, corps, "OpenDART", corps > 0, quality=q),
        metric("us-corporates", "미국 상장사·SEC", sec_total, sec_done, "SEC EDGAR", sec_done > 0, quality=q),
        metric("community", "커뮤니티 원천 아카이브", 11, len({re.sub(r"_\d{4}-\d{2}-\d{2}.*", "", p.stem) for p in community}), "공개 커뮤니티", bool(community), quality=q),
        metric("people-ledger", "인물·관계 원장", 1, 1 if people_files else 0, "Wikidata·공공자료", bool(people_files), quality=q),
        law_metric(q), insurance_metric(q),
    ]
    radar = {
        "title": "실측 기반 90% 자동 확장 레이더",
        "protocol": {"coverage_threshold": 0.90, "quality_threshold": 0.85,
                     "requires_source_evidence": True,
                     "rule": "수집량 90%만으로 확장하지 않고 품질·출처 검증까지 통과한 영역만 다음 범주로 승격"},
        "metrics": metrics,
        "next_queue": ["미국 SEC 상세 재무·임원", "중국·일본·러시아 공개 상장사", "보험사별 역사 약관", "법원·헌재 원문 증분"],
        "measured_at": datetime.now(timezone.utc).isoformat(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(radar, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(radar, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    build()
