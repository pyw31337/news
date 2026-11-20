#!/usr/bin/env python3
"""법조인 경력·전환 원장과 검증 대기열을 별도 계층으로 만든다.

기존 인물 원장/경력 이벤트를 재사용하되, 출처 URL이 없는 이벤트는 사실로 승격하지
않는다. 판사·검사 → 변호사·법무법인 전환은 별도 신호로 보존하고 공식/허용된 출처
확인 대기열에 넣는다. 커뮤니티·이미지 게시물은 이 스크립트의 확정 출처가 아니다.
"""
import argparse
import datetime as dt
import gzip
import html
import json
import re
from pathlib import Path

ROLE_RE = re.compile(r"판사|검사|검찰|법관|대법관|재판관|변호사|법조|사법연수원|변호사시험")
JUDICIAL_RE = re.compile(r"판사|검사|검찰|법관|대법관|재판관")
PRIVATE_RE = re.compile(r"법무법인|법률사무소|로펌|변호사(?:사무소|개업|로 활동|로서)")
FIRM_RE = re.compile(r"(?:법무법인(?:\s*\([^)]{1,20}\))?\s*[가-힣A-Za-z·&]{2,30}|[가-힣A-Za-z·&]{2,30}\s*법률사무소|[가-힣A-Za-z·&]{2,30}법률사무소|김앤장|태평양|광장|율촌|세종|화우|바른|대륙아주|지평|동인|한결|민본|해마루|이공|다산|창조|호민|엘플러스|대한중앙)")
EXAM_RE = re.compile(r"사법연수원\s*(?:제\s*)?(\d+)기|제\s*(\d+)회\s*사법시험|변호사시험\s*(\d+)회")
INSTITUTION_RE = re.compile(r"(?:대법원|헌법재판소|[가-힣]{2,10}(?:지방)?검찰청|[가-힣]{2,10}(?:지방)?법원|고등법원|지방법원)")


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


def firm_names(text):
    text = html.unescape(str(text or ""))
    out = []
    for match in FIRM_RE.finditer(text):
        value = re.sub(r"\s+", " ", match.group(0)).strip(" .·,;:()")
        value = re.sub(r"(?:대표)?\s*변호사.*$", "", value).strip()
        if value in {"법률사무소", "법무법인", "법률사무소 개업", "법률사무소 설립"}:
            continue
        if value.endswith(("개업", "설립", "변호사", "등")):
            value = re.sub(r"\s*(개업|설립|변호사|등)$", "", value).strip()
        if len(value) >= 3 and value not in out:
            out.append(value)
    return out


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
    id_names = {}
    all_registry = load(data / "db/people/registry.json.gz", [])
    for registry_row in all_registry if isinstance(all_registry, list) else []:
        if registry_row.get("id") and registry_row.get("n"):
            raw_id = str(registry_row["id"])
            id_names[raw_id] = str(registry_row["n"])
            id_names[raw_id.removeprefix("pol:")] = str(registry_row["n"])
            id_names[raw_id.removeprefix("wd:")] = str(registry_row["n"])
    for roster_name, roster_row in roster.items():
        if roster_row.get("person_id"):
            raw_id = str(roster_row["person_id"])
            id_names[raw_id] = roster_name
            id_names[raw_id.removeprefix("pol:")] = roster_name
            id_names[raw_id.removeprefix("wd:")] = roster_name
    records, queue, firms, profiles = [], [], [], []
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
        name = str(bio.get("name") or id_names.get(str(person_key)) or id_names.get(str(person_key).removeprefix("pol:")) or id_names.get(str(person_key).removeprefix("wd:")) or person_key)
        unresolved_name = bool(re.fullmatch(r"(?:pol:|wd:|wd:a)?[A-Za-z0-9]{6,}", name))
        roster.setdefault(name, {"name": name, "person_id": person_key, "kind": "법조", "registry": False})
        judicial_seen = False
        private_seen = False
        cited_count = 0
        profile = {"person_key": str(person_key), "name": name, "name_status": "unresolved" if unresolved_name else "resolved", "credentials": [], "judicial_institutions": [], "firm_affiliations": [], "appointments": []}
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
                "name_status": "unresolved" if unresolved_name else "resolved",
                "visibility": "review" if unresolved_name else "candidate",
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
            raw_text = html.unescape(ev_text)
            for credential in EXAM_RE.finditer(raw_text):
                value = credential.group(0)
                if value not in profile["credentials"]:
                    profile["credentials"].append(value)
            for institution in INSTITUTION_RE.findall(raw_text):
                if institution not in profile["judicial_institutions"]:
                    profile["judicial_institutions"].append(institution)
            for firm in firm_names(raw_text):
                affiliation = {"firm": firm, "date": event.get("d"), "title": event.get("title"), "source_status": state, "source_url": url}
                profile["firm_affiliations"].append(affiliation)
                firms.append(dict(affiliation, person_key=str(person_key), name=name))
            if re.search(r"임명|취임|선임|위촉|위원|원장|장관|총장", raw_text):
                profile["appointments"].append({"date": event.get("d"), "title": event.get("title"), "source_status": state, "source_url": url})
        if judicial_seen and private_seen:
            transition = "judicial_to_private_practice_signal"
        elif private_seen:
            transition = "private_practice_signal"
        elif judicial_seen:
            transition = "judicial_service_signal"
        else:
            transition = "legal_identity_signal"
        profile["transition_signal"] = transition
        profiles.append(profile)
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
            "name_status": "unresolved" if bool(re.fullmatch(r"(?:pol:|wd:|wd:a)?[A-Za-z0-9]{6,}", name)) else "resolved",
            "kind": "법조",
            "transition_signal": transition,
            "event_count": len(legal_events),
            "cited_event_count": cited_count,
            "needs": sorted(set(needs + (["identity_resolution"] if bool(re.fullmatch(r"(?:pol:|wd:|wd:a)?[A-Za-z0-9]{6,}", name)) else []))),
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
            "name_status": "resolved",
            "kind": "법조",
            "transition_signal": "roster_only",
            "event_count": 0,
            "cited_event_count": 0,
        "needs": ["build_cited_career_timeline", "search_post_service_law_firm"],
            "discovery_sources": ["legal_registry", "legal_elites"],
        })

    # 동일 인물에 연결된 pol:/wd:/내부 키가 함께 존재할 수 있다.
    # 이름만으로 병합하면 동명이인 위험이 있으므로 aliases를 보존하고 검토 플래그를 단다.
    grouped_queue = {}
    for row in queue:
        key = (row["name"], row["transition_signal"])
        current = grouped_queue.setdefault(key, dict(row, person_keys=[]))
        current["person_keys"] = sorted(set(current["person_keys"] + [row["person_key"]]))
        current["event_count"] = max(current["event_count"], row["event_count"])
        current["cited_event_count"] = max(current["cited_event_count"], row["cited_event_count"])
        current["needs"] = sorted(set(current["needs"] + row["needs"]))
        current["discovery_sources"] = sorted(set(current["discovery_sources"] + row["discovery_sources"]))
    queue = list(grouped_queue.values())
    for row in queue:
        if len(row["person_keys"]) > 1:
            row["needs"] = sorted(set(row["needs"] + ["identity_disambiguation"]))

    # 같은 사람·같은 이벤트의 중복 키를 제거하되, 출처 상태와 근거는 보존한다.
    dedup = {}
    for row in records:
        key = (row["name"], row.get("event_date"), row.get("title"), row.get("source_url"))
        if key not in dedup:
            dedup[key] = dict(row, person_keys=[row["person_key"]])
        else:
            dedup[key]["person_keys"] = sorted(set(dedup[key]["person_keys"] + [row["person_key"]]))
    records = list(dedup.values())
    firm_dedup = {}
    for row in firms:
        key = (row["name"], row["firm"], row.get("date"), row.get("title"), row.get("source_url"))
        firm_dedup[key] = row
    firms = list(firm_dedup.values())
    queue.sort(key=lambda x: (0 if "verify_transition_dates_and_firm" in x["needs"] else 1, x["name"]))
    out = data / "db/people"
    dump(out / "legal_careers.json", {"schema": 1, "updated": now, "records": records, "policy": "출처 URL이 있는 경력만 cited로 공개 후보가 되며, 미확인 전환은 needs_source 상태로 보관"})
    dump(out / "legal_firm_affiliations.json", {"schema": 1, "updated": now, "affiliations": firms, "policy": "로펌·법률사무소명은 원문 경력 이벤트에서 추출한 후보이며 공식 출처 확인 전에는 확정 경력으로 표시하지 않음"})
    # 동일 인물의 내부 ID가 여러 개면 profile은 aliases를 보존하고 검토 대상으로 둔다.
    profile_map = {}
    for profile in profiles:
        key = profile["name"]
        if key not in profile_map:
            profile_map[key] = profile
        else:
            current = profile_map[key]
            current["person_keys"] = sorted(set(current.get("person_keys", [current["person_key"]]) + [profile["person_key"]]))
            for field in ("credentials", "judicial_institutions", "firm_affiliations", "appointments"):
                if field == "firm_affiliations":
                    for item in profile[field]:
                        if item not in current[field]:
                            current[field].append(item)
                elif field == "appointments":
                    for item in profile[field]:
                        if item not in current[field]:
                            current[field].append(item)
                else:
                    current[field] = sorted(set(current[field] + profile[field]))
            current["identity_review"] = True
    dump(out / "legal_profile_enrichment.json", {"schema": 1, "updated": now, "profiles": list(profile_map.values()), "policy": "신원 병합이 불확실한 경우 identity_review를 유지하며 공개 확정하지 않음"})
    dump(out / "legal_career_queue.json", {"schema": 1, "updated": now, "queue": queue, "counts": {
        "roster": len(roster), "people_with_legal_events": len(queue), "resolved_people": sum(x.get("name_status") == "resolved" for x in queue), "career_records": len(records),
        "cited_records": sum(r["source_status"] == "cited" for r in records),
        "transition_signals": sum(r["transition_signal"] == "judicial_to_private_practice_signal" for r in queue),
        "needs_firm_verification": sum("search_post_service_law_firm" in r["needs"] for r in queue),
    }})
    print(json.dumps({"roster": len(roster), "people": len(queue), "records": len(records), "cited": sum(r["source_status"] == "cited" for r in records)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
