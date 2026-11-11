#!/usr/bin/env python3
"""인물 데이터 충족도와 다음 보강 대상을 만든다.

명부 숫자를 "완성된 인물 페이지 수"로 오해하지 않기 위해, 이 스크립트는
명부·계층·구조화 이력·출처 URL이 있는 이력·사진 원장을 분리해 집계한다.  큐에는 Wikidata의
고정 ID가 있고 1계층으로 공개 가능한 인물만 넣는다. 이름만 같은 사람이나
민간인 가족은 사진·상세 보강 대상으로 삼지 않는다.

    python scripts/people/coverage.py data --pol-dir pol_db
"""

import argparse
import datetime as dt
import json
import os
import re
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys_path = os.path.dirname(HERE)
import sys
if sys_path not in sys.path:
    sys.path.insert(0, sys_path)
from people.pcommon import load, now_iso, norm_name, save  # noqa: E402


# 이 수치는 제품 운영 목표다. 직군끼리는 겹칠 수 있으므로 합산하지 않는다.
GOALS = {
    "tier_1_complete_profiles": int(os.environ.get("PEOPLE_TIER1_GOAL", "30000")),
    "tier_2_verified_profiles": int(os.environ.get("PEOPLE_TIER2_GOAL", "150000")),
    "politicians": int(os.environ.get("PEOPLE_POLITICIAN_GOAL", "3296")),
    "journalists_and_anchors": int(os.environ.get("PEOPLE_PRESS_GOAL", "5000")),
    "public_culture": int(os.environ.get("PEOPLE_CULTURE_GOAL", "10000")),
    "creators": int(os.environ.get("PEOPLE_CREATOR_GOAL", "3000")),
}

ROLE_RULES = {
    "presidents": re.compile(r"대통령|\bpresident\b", re.I),
    "reporters": re.compile(r"기자|저널리스트|언론인|\bjournalist\b", re.I),
    "anchors": re.compile(r"앵커|\banchor\b", re.I),
    "broadcasters": re.compile(r"방송인|방송 진행자|텔레비전 진행자|\bbroadcaster\b|\btelevision presenter\b", re.I),
    "producers_pd": re.compile(r"프로듀서|\bproducer\b|\bPD\b", re.I),
    "directors_fd": re.compile(r"연출|\bdirector\b|\bFD\b", re.I),
    "writers": re.compile(r"작가|소설가|시인|\bwriter\b|\bscreenwriter\b", re.I),
    "youtubers": re.compile(r"유튜버|\byoutuber\b", re.I),
}

PRESS_PHOTO = re.compile(
    r"^https://(?:m?imgnews)\.pstatic\.net/image/upload/(?:spubs/[^/]+/profile|journalist/)",
    re.I,
)


def read_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def registry(data_dir):
    return load(os.path.join(data_dir, "db", "people", "registry.json.gz"), []) or []


def bio_index(data_dir):
    """동명이인 덮어쓰기를 피하려고 ID 우선, 이름은 하나일 때만 쓴다."""
    raw = load(os.path.join(data_dir, "people_bio.json.gz"), {}) or {}
    by_id, by_name = {}, defaultdict(list)
    for key, value in raw.items() if isinstance(raw, dict) else []:
        if not isinstance(value, dict):
            continue
        if re.fullmatch(r"(?:wd:)?Q\d+", str(key)):
            by_id["wd:" + str(key).removeprefix("wd:")] = value
        elif re.fullmatch(r"(?:pol:)?[0-9A-Z]{8}", str(key)):
            by_id["pol:" + str(key).removeprefix("pol:")] = value
        else:
            by_name[norm_name(key)].append(value)
    return by_id, by_name


def has_structured_profile(value):
    if not isinstance(value, dict):
        return False
    events = value.get("events") or []
    return bool(value.get("role_title") or value.get("org") or events)


def has_cited_events(value):
    return any(bool((event or {}).get("url")) for event in (value or {}).get("events", []))


def load_pol_people(path):
    raw = read_json(os.path.join(path, "index.json"), {}) if path else {}
    return raw.get("people", []) if isinstance(raw, dict) else []


def choose_bio(row, by_id, by_name):
    value = by_id.get(row.get("id"))
    if value:
        return value
    candidates = by_name.get(norm_name(row.get("n")), [])
    return candidates[0] if len(candidates) == 1 else None


def tier_records(data_dir):
    raw = load(os.path.join(data_dir, "db", "people", "tiers", "current.json.gz"), {}) or {}
    return raw.get("people", {}) if isinstance(raw, dict) else {}


def category(row):
    return row.get("k") or "기타"


def portrait_retry_pending(checked):
    """Return True only while the controlled retry window is still open."""
    try:
        last = dt.date.fromisoformat(str(checked)[:10])
    except ValueError:
        return False
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
    return (today - last).days < 14


def queue_candidates(rows, tiers, portraits, by_id, by_name, limit):
    # 정치·언론·연예·인플루언서·문화 순서로, 분야 확장과 뉴스 효용을 같이 고려한다.
    kind_rank = {"정치": 0, "언론": 1, "연예": 2, "인플루언서": 3, "문화": 4, "경제": 5, "법조": 6}
    items = []
    for row in rows:
        pid = row.get("id", "")
        state = tiers.get(pid, {})
        if state.get("t") != 1 or state.get("minor") or not re.fullmatch(r"wd:Q\d+", pid):
            continue
        if pid in portraits.get("items", {}):
            continue
        skipped = (portraits.get("skipped", {}).get(pid) or {}).get("checked", "")
        # 실패한 원본은 14일 뒤에만 재시도한다. 매 수집마다 같은 URL을 두드리지 않는다.
        if portrait_retry_pending(skipped):
            continue
        bio = choose_bio(row, by_id, by_name)
        needs = ["verified_portrait"]
        if not has_structured_profile(bio):
            needs.append("structured_profile")
        elif not has_cited_events(bio):
            needs.append("cited_timeline")
        items.append({
            "id": pid,
            "name": row.get("n", ""),
            "kind": category(row),
            "wikidata": "https://www.wikidata.org/wiki/" + pid.removeprefix("wd:"),
            "needs": needs,
            "priority": [kind_rank.get(category(row), 9), -int(row.get("sl") or 0), row.get("n", "")],
        })
    items.sort(key=lambda item: tuple(item["priority"]))
    for item in items:
        item.pop("priority", None)
    return items[:limit]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data", nargs="?", default="data")
    parser.add_argument("--pol-dir", default="data/pol")
    parser.add_argument("--queue-limit", type=int, default=300)
    parser.add_argument("--output")
    parser.add_argument("--queue-output")
    args = parser.parse_args()

    data_dir = args.data
    people_dir = os.path.join(data_dir, "db", "people")
    output = args.output or os.path.join(people_dir, "coverage.json")
    queue_output = args.queue_output or os.path.join(people_dir, "enrichment_queue.json")
    rows = registry(data_dir)
    tiers = tier_records(data_dir)
    by_id, by_name = bio_index(data_dir)
    portraits = read_json(os.path.join(people_dir, "portraits.json"), {"items": {}, "skipped": {}})
    portraits.setdefault("items", {})
    portraits.setdefault("skipped", {})

    kind_totals = Counter(category(row) for row in rows)
    kind_profiles = Counter()
    kind_cited = Counter()
    role_totals = Counter()
    role_profiles = Counter()
    role_cited = Counter()
    for row in rows:
        bio = choose_bio(row, by_id, by_name)
        kind = category(row)
        text = "%s %s" % (row.get("n", ""), row.get("d", ""))
        if has_structured_profile(bio):
            kind_profiles[kind] += 1
        if has_cited_events(bio):
            kind_cited[kind] += 1
        for name, rule in ROLE_RULES.items():
            if rule.search(text):
                role_totals[name] += 1
                if has_structured_profile(bio):
                    role_profiles[name] += 1
                if has_cited_events(bio):
                    role_cited[name] += 1

    tier_counts = Counter(str(item.get("t")) for item in tiers.values())
    pol_people = load_pol_people(args.pol_dir)
    pol_photo_count = sum(
        1 for person in pol_people
        if person.get("photo_local") == "data/pol/photos/%s.webp" % person.get("id")
    )
    reporters = read_json(os.path.join(data_dir, "reporters.json"), [])
    reporters = reporters if isinstance(reporters, list) else []
    history = read_json(os.path.join(data_dir, "reporter_history.json"), {})
    queue = queue_candidates(rows, tiers, portraits, by_id, by_name, args.queue_limit)

    report = {
        "schema": 1,
        "updated": now_iso(),
        "policy": "Counts distinguish roster entries, structured profiles, source-URL-backed timelines, and verified portraits. Portraits require a stable Wikidata or official ID plus a recorded source and license.",
        "goals": GOALS,
        "tiers": {
            "total": len(tiers),
            "tier_1": tier_counts["1"],
            "tier_2": tier_counts["2"],
            "tier_3": tier_counts["3"],
        },
        "registry": {"people": len(rows), "unique_names": len({row.get("n") for row in rows if row.get("n")})},
        "by_kind": {
            kind: {
                "roster": kind_totals[kind],
                "structured_profile": kind_profiles[kind],
                "source_url_timeline": kind_cited[kind],
            }
            for kind in sorted(kind_totals)
        },
        "role_matches": {
            role: {
                "roster": role_totals[role],
                "structured_profile": role_profiles[role],
                "source_url_timeline": role_cited[role],
            }
            for role in ROLE_RULES
        },
        "politicians": {
            "roster": len(pol_people),
            "official_photo_paths": pol_photo_count,
            "photo_gap": max(0, len(pol_people) - pol_photo_count),
        },
        "journalists": {
            "today_profiles": len(reporters),
            "today_verified_profile_photos": sum(1 for reporter in reporters if PRESS_PHOTO.match(reporter.get("photo", ""))),
            "cumulative_affiliation_records": len(history) if isinstance(history, dict) else 0,
        },
        "portraits": {
            "verified_wikimedia_or_official": len(portraits["items"]),
            "pending_or_not_available": len(portraits["skipped"]),
        },
        "next_queue": {"count": len(queue), "policy": "Tier-1, non-minor, stable Wikidata ID only"},
    }
    save(output, report, compact=False)
    save(queue_output, {"schema": 1, "updated": now_iso(), "policy": report["next_queue"]["policy"], "items": queue}, compact=False)
    print(
        "people_coverage: "
        f"registry={len(rows)} tier1={tier_counts['1']} portraits={len(portraits['items'])} "
        f"queue={len(queue)} reporters={len(reporters)}"
    )


if __name__ == "__main__":
    main()
