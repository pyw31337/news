#!/usr/bin/env python3
"""콘텐츠 수집 품질 감사.

수집 파일을 수정하지 않고 최근 기사 묶음의 날짜·중복·썸네일 보유율을
수치화한다. 결과는 CI 아티팩트로 남겨 날짜 미상/중복 증가를 조기에 잡는다.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import gzip
import glob
import json
import os
import re
from pathlib import Path

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?$")
TAIL_RE = re.compile(r"\[[^\]]*\]|\([^)]*\)|【[^】]*】|<[^>]*>")
STOP = set("속보 단독 종합 기자 뉴스 영상 사진 오늘 이번 관련".split())


def normalize_title(title: str) -> str:
    title = TAIL_RE.sub("", title or "")
    return re.sub(r"[^가-힣A-Za-z0-9]", "", title).lower()


def load_day(root: Path, day: dt.date) -> list[dict]:
    rows: list[dict] = []
    for pattern in (f"{root}/data/db/articles/{day:%Y-%m-%d}/*.json.gz", f"{root}/data/db/articles_global/{day:%Y-%m-%d}/*.json.gz"):
        for filename in glob.glob(pattern):
            try:
                payload = json.load(gzip.open(filename, "rt", encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if isinstance(payload, list):
                rows.extend(x for x in payload if isinstance(x, dict))
    return rows


def audit(root: Path, days: int) -> dict:
    now = dt.datetime.now(dt.timezone.utc).astimezone(dt.timezone(dt.timedelta(hours=9))).date()
    all_rows: list[dict] = []
    by_day: dict[str, dict] = {}
    for offset in range(max(1, days)):
        day = now - dt.timedelta(days=offset)
        rows = load_day(root, day)
        all_rows.extend(rows)
        by_day[f"{day:%Y-%m-%d}"] = summarize(rows)
    result = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "days": days,
        "summary": summarize(all_rows),
        "by_day": by_day,
    }
    return result


def summarize(rows: list[dict]) -> dict:
    urls = [str(x.get("url") or "") for x in rows]
    titles = [str(x.get("title") or "") for x in rows]
    unique_urls = len(set(u for u in urls if u))
    title_groups: dict[str, list[dict]] = collections.defaultdict(list)
    for row in rows:
        key = normalize_title(str(row.get("title") or ""))
        if key:
            title_groups[key].append(row)
    duplicate_groups = [items for items in title_groups.values() if len(items) > 1]
    duplicate_rows = sum(len(items) for items in duplicate_groups)
    dated = [x for x in rows if DATE_RE.match(str(x.get("t") or ""))]
    with_thumb = [x for x in rows if any(x.get(k) for k in ("thumb", "thumbnail", "image", "image_url", "og_image"))]
    with_summary = [x for x in rows if any(str(x.get(k) or "").strip() for k in ("desc", "summary", "description", "content"))]
    return {
        "articles": len(rows),
        "unique_urls": unique_urls,
        "duplicate_title_groups": len(duplicate_groups),
        "duplicate_title_rows": duplicate_rows,
        "missing_or_invalid_date": len(rows) - len(dated),
        "date_coverage": round(len(dated) / len(rows), 4) if rows else 0,
        "thumbnail_rows": len(with_thumb),
        "thumbnail_coverage": round(len(with_thumb) / len(rows), 4) if rows else 0,
        "summary_rows": len(with_summary),
        "summary_coverage": round(len(with_summary) / len(rows), 4) if rows else 0,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".", help="repository root")
    parser.add_argument("--days", type=int, default=3)
    parser.add_argument("--output", help="optional JSON output path")
    args = parser.parse_args()
    result = audit(Path(args.root), args.days)
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False))
    for day, data in result["by_day"].items():
        print(f"{day}: {json.dumps(data, ensure_ascii=False)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
