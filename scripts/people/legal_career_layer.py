#!/usr/bin/env python3
"""법조인 경력·전환 원장과 검증 대기열을 별도 계층으로 만든다.

기존 인물 원장/경력 이벤트를 재사용하되, 출처 URL이 없는 이벤트는 사실로 승격하지
않는다. 판사·검사 → 변호사·법무법인 전환은 별도 신호로 보존하고 공식/허용된 출처
확인 대기열에 넣는다. 커뮤니티·이미지 게시물은 이 스크립트의 확정 출처가 아니다.
"""
import argparse
import datetime as dt
import gzip
import json
import re
from pathlib import Path

ROLE_RE = re.compile(r"판사|검사|검찰|법관|대법관|재판관|변호사|법조|사법연수원|변호사시험")
JUDICIAL_RE = re.compile(r"판사|검사|검찰|법관|대법관|재판관")
PRIVATE_RE = re.compile(r"법무법인|법률사무소|로펌|변호사(?:사무소|개업|로 활동|로서)")


def load(path, default):
    try:
        opener = gzip.open if str(path).endswith(".gz") else open
        with opener(path, "rt", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError, TypeError):
        return default


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def text_event(event):
    return " ".join(str(event.get(k, "")) for k in ("title", "desc", "stage", "typ"))


def source_state(event):
    url = str(event.get("url") or "").strip()
    if url.startswith("http://") or url.startswith("https://"):
        return "cited", url
    return "needs_source", ""


def source_kind(url, label):
    raw = f"{url} {label}".lower()
    if "wikidata" in raw or "wikipedia" in raw:
        return "wikidata_or_wikipedia"
    if "law.go.kr" in raw or "scourt" in raw:
        return "official_legal"
    if "court" in raw or "검찰" in raw or "법원" in raw:
        return "official_or_press"
    return "declared_source" if label else "unknown"


def legal_roster(data):
    registry = load(data / "db/people/registry.json.gz", [])
    out = {}
    for row in registry if isinstance(registry, list) else []:
        if row.get("k") == "법조":
            out[str(row.get("n") or "")] = {"name": row.get("n", ""), "person_id": row.get("id"), "kind": "법조", "registry": True}
    elite = load(data / "elite_network.json", {}).get("legal_elites", {})
    for key, row in elite.items() if isinstance(elite, dict) else []:
        if isinstance(row, dict):
            name = str(row.get("name") or key)
            out.setdefault(name, {"name": name, "person_id": key, "kind": "법조", "registry": False})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data", nargs="?", default="data")
    args = ap.parse_args()
    data = Path(args.data)
    bios = load(data / "people_bio.json.gz", {})
    roster = legal_roster(data)
    records, queue = [], []
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")

    for person_key, bio in bios.items() if isinstance(bios, dict) else []:
        if not isinstance(bio, dict):
            continue
        events = bio.get("events") or []
        role_text = " ".join(str(bio.get(k, "")) for k in ("kind", "role_title", "org"))
        legal_events = [e for e in events if isinstance(e, dict) and ROLE_RE.search(text_event(e))]
        is_legal = bool(legal_events) or bool(ROLE_RE.search(role_text)) or bio.get("kind") == "legal"
        if not is_legal:
            continue
        name = str(bio.get("name") or person_key)
        roster.setdefault(name, {"name": name, "person_id": person_key, "kind": "법조", "registry": False})
        judicial_seen = False
        private_seen = False
        cited_count = 0
        for idx, event in enumerate(legal_events):
            state, url = source_state(event)
            ev_text = text_event(event)
            judicial = bool(JUDICIAL_RE.search(ev_text))
            private = bool(PRIVATE_RE.search(ev_text))
            judicial_seen = judicial_seen or judicial
            private_seen = private_seen or private
            cited_count += state == "cited"
            records.append({
                "schema": 1,
                "person_key": str(person_key),
                "name": name,
                "event_index": idx,
                "event_date": event.get("d"),
                "event_type": event.get("typ"),
                "stage": event.get("stage"),
                "title": event.get("title"),
                "description": str(event.get("desc") or "")[:1200],
                "role_signal": "judicial" if judicial else ("private_practice" if private else "legal_training"),
                "source_status": state,
                "source_url": url,
                "source_label": event.get("src"),
                "source_kind": source_kind(url, str(event.get("src") or "")),
                "collected_at": now,
            })
        if judicial_seen and private_seen:
            transition = "judicial_to_private_practice_signal"
        elif private_seen:
            transition = "private_practice_signal"
        elif judicial_seen:
            transition = "judicial_service_signal"
        else:
            transition = "legal_identity_signal"
        needs = []
        if not cited_count:
            needs.append("official_source_url")
        if judicial_seen and private_seen:
            needs.append("verify_transition_dates_and_firm")
        if not any(PRIVATE_RE.search(text_event(e)) for e in legal_events):
            needs.append("search_post_service_law_firm")
        if not legal_events:
            needs.append("build_cited_career_timeline")
        queue.append({
            "person_key": str(person_key),
            "name": name,
            "kind": "법조",
            "transition_signal": transition,
            "event_count": len(legal_events),
            "cited_event_count": cited_count,
            "needs": sorted(set(needs)),
            "discovery_sources": ["existing_people_bio", "legal_registry", "news_case_index"],
        })

    # 이름만 있는 법조 원장도 누락시키지 않고 조사 대기열에 남긴다.
    known = {x["name"] for x in queue}
    for name, row in roster.items():
        if not name or name in known:
            continue
        queue.append({
            "person_key": str(row.get("person_id") or name),
            "name": name,
            "kind": "법조",
            "transition_signal": "roster_only",
            "event_count": 0,
            "cited_event_count": 0,
            "needs": ["build_cited_career_timeline", "search_post_service_law_firm"],
            "discovery_sources": ["legal_registry", "legal_elites"],
        })

    # 같은 사람·같은 이벤트의 중복 키를 제거하되, 출처 상태와 근거는 보존한다.
    dedup = {}
    for row in records:
        key = (row["person_key"], row.get("event_date"), row.get("title"), row.get("source_url"))
        dedup[key] = row
    records = list(dedup.values())
    queue.sort(key=lambda x: (0 if "verify_transition_dates_and_firm" in x["needs"] else 1, x["name"]))
    out = data / "db/people"
    dump(out / "legal_careers.json", {"schema": 1, "updated": now, "records": records, "policy": "출처 URL이 있는 경력만 cited로 공개 후보가 되며, 미확인 전환은 needs_source 상태로 보관"})
    dump(out / "legal_career_queue.json", {"schema": 1, "updated": now, "queue": queue, "counts": {
        "roster": len(roster), "people_with_legal_events": len(queue), "career_records": len(records),
        "cited_records": sum(r["source_status"] == "cited" for r in records),
        "transition_signals": sum(r["transition_signal"] == "judicial_to_private_practice_signal" for r in queue),
        "needs_firm_verification": sum("search_post_service_law_firm" in r["needs"] for r in queue),
    }})
    print(json.dumps({"roster": len(roster), "people": len(queue), "records": len(records), "cited": sum(r["source_status"] == "cited" for r in records)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
