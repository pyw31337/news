#!/usr/bin/env python3
"""Fail-closed portrait audit for NewsBoard.

The site must never infer that a file named after a person is that person's
portrait.  This audit records the provenance of every legacy local portrait,
checks current entity portraits against their source and Wikipedia identity,
and can remove a suspect portrait from the publishable data snapshot.  A
missing portrait intentionally falls back to an initials/avatar treatment.
"""

import argparse
import json
import os
import re
from collections import Counter


TRUSTED_REMOTE = re.compile(
    r"^https://(?:commons\.wikimedia\.org/wiki/Special:FilePath/|(?:thumb\.|upload\.)wikimedia\.org/wikipedia/commons/)",
    re.I,
)
POL_PORTRAIT = re.compile(r"^(?:data/pol/photos/|https://newsboard-sync\.pyw213\.workers\.dev/m/pol/)[A-Za-z0-9_-]+\.webp$")
LOCAL_ENTITY = re.compile(r"^(?:media/|https://newsboard-sync\.pyw213\.workers\.dev/m/)ent/[0-9a-f]{2}/[0-9a-f]{16}\.webp$")   # R2로 옮긴 사진(scripts/media_r2.py)도 같은 파일
NOT_A_PORTRAIT = re.compile(r"office_logo|(?:^|[_/\-])logo(?:[_./\-]|$)|(?:^|[_/\-])flag(?:[_./\-]|$)|seal|emblem", re.I)
TITLE_ONLY = re.compile(r"^(?:.+(?:교육감|주지사|도지사|지사|시장|군수|구청장)|(?:과기|경제)?부총리|대통령|국무총리|국회의원|장관|대법원장|검찰총장)$")
NON_PERSON = {"G7", "FOMC", "LG유플러스", "YTN", "Z세대", "나스닥", "동물농장", "라방", "원팀", "필리버스터", "강철비", "현대차"}


def load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return default


def norm(value):
    return re.sub(r"\([^)]*\)|\s|[·ㆍ.'\"‘’“”-]", "", str(value or "")).lower()


def title_matches(name, title):
    name, title = norm(name), norm(title)
    return bool(name and title and (name in title or title in name))


def title_only(name):
    return bool(TITLE_ONLY.fullmatch(str(name or "")) or name in NON_PERSON)


def trusted(url, source=""):
    if not url or NOT_A_PORTRAIT.search(url) or NOT_A_PORTRAIT.search(source or ""):
        return False
    return bool(
        POL_PORTRAIT.fullmatch(url)
        or TRUSTED_REMOTE.match(url)
        or (LOCAL_ENTITY.fullmatch(url) and TRUSTED_REMOTE.match(source or ""))
    )


def reason_for(entity):
    name = entity.get("name", "")
    visual = entity.get("visual") or {}
    wiki = entity.get("wiki") or {}
    url = visual.get("url") or wiki.get("thumb") or wiki.get("thumb_src") or ""
    if entity.get("type") != "person":
        return "not_person"
    if title_only(name):
        return "title_or_nonperson"
    if wiki.get("title") and not title_matches(name, wiki["title"]):
        return "wiki_title_mismatch"
    if not url:
        return "no_portrait"
    if not trusted(url, visual.get("src", "")):
        return "unverified_source"
    return "approved"


def entity_pool_by_name(path):
    raw = load(path, {})
    rows = raw.get("entities", []) if isinstance(raw, dict) else raw
    result = {}
    for row in rows if isinstance(rows, list) else []:
        name = row.get("name") if isinstance(row, dict) else ""
        if not name:
            continue
        if name not in result or row.get("score", 0) > result[name].get("score", 0):
            result[name] = row
    return result


def audit(data, entity_media, asset_dir, sanitize, pool_by_name):
    items, changes = [], []
    for entity in data.get("entities") or []:
        status = reason_for(entity)
        if entity.get("type") == "person":
            items.append({
                "name": entity.get("name", ""),
                "status": status,
                "url": (entity.get("visual") or {}).get("url", ""),
                "source": (entity.get("visual") or {}).get("src", ""),
                "wiki_title": (entity.get("wiki") or {}).get("title", ""),
            })
        if sanitize and status in {"title_or_nonperson", "wiki_title_mismatch", "unverified_source"}:
            old = entity.get("visual") or {}
            if status == "title_or_nonperson":
                entity["type"] = "org"
                entity["visual"] = {"kind": "logo"} if old else {}
            else:
                entity["visual"] = {}
            changes.append({"name": entity.get("name", ""), "reason": status})

    legacy = []
    for filename in sorted(os.listdir(asset_dir)) if os.path.isdir(asset_dir) else []:
        if not filename.endswith(".webp"):
            continue
        name = filename[:-5]
        source = entity_media.get("person:" + name, {})
        # Legacy file bytes do not contain origin/person metadata.  Even if a
        # current entity cache exists, the old file cannot be assumed equal to it.
        legacy.append({
            "name": name,
            "path": os.path.join(asset_dir, filename),
            "status": "retired_unverified_local",
            "replacement_available": bool(source and trusted(source.get("url", ""))),
        })

    cache_issues = []
    for key, value in (entity_media or {}).items():
        if not key.startswith("person:"):
            continue
        name = key.split(":", 1)[1]
        url = value.get("url", "") if isinstance(value, dict) else ""
        entity = pool_by_name.get(name)
        if entity:
            probe = dict(entity, type="person", visual={"url": url})
            reason = reason_for(probe)
            if entity.get("type") != "person":
                reason = "cache_type_mismatch"
        else:
            reason = "title_or_nonperson" if title_only(name) else ("approved" if trusted(url) else "unverified_source")
        if reason != "approved":
            cache_issues.append({"name": name, "reason": reason, "url": url})

    counts = Counter(x["status"] for x in items)
    return {
        "schema": 1,
        "policy": "Only provenance-verified political, Wikimedia, and archived entity portraits may render. Legacy filename-only images are retired.",
        "summary": {
            "current_person_entities": len(items),
            "approved": counts["approved"],
            "withheld": len(items) - counts["approved"],
            "legacy_local_retired": len(legacy),
            "entity_media_cache_issues": len(cache_issues),
            "sanitized": len(changes),
        },
        "current_entities": items,
        "legacy_local_assets": legacy,
        "entity_media_cache_issues": cache_issues,
        "changes": changes,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data", nargs="?", default="data/today.json")
    parser.add_argument("--entity-media", default="data/entity_media.json")
    parser.add_argument("--entity-pool", default="data/entity_pool.json")
    parser.add_argument("--asset-dir", default="assets/people")
    parser.add_argument("--output", default="data/portrait_audit.json")
    parser.add_argument("--sanitize", action="store_true")
    parser.add_argument("--prune-cache", action="store_true")
    args = parser.parse_args()

    data = load(args.data, {})
    entity_media = load(args.entity_media, {})
    report = audit(data, entity_media, args.asset_dir, args.sanitize, entity_pool_by_name(args.entity_pool))
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    if args.sanitize:
        with open(args.data, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    if args.prune_cache:
        for issue in report["entity_media_cache_issues"]:
            entity_media.pop("person:" + issue["name"], None)
        with open(args.entity_media, "w", encoding="utf-8") as f:
            json.dump(entity_media, f, ensure_ascii=False, separators=(",", ":"))
    summary = report["summary"]
    print(
        "portrait_audit: "
        f"approved={summary['approved']}/{summary['current_person_entities']} "
        f"withheld={summary['withheld']} legacy_retired={summary['legacy_local_retired']} "
        f"cache_issues={summary['entity_media_cache_issues']} sanitized={summary['sanitized']}"
    )


if __name__ == "__main__":
    main()
