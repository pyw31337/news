#!/usr/bin/env python3
"""고정 Wikidata ID가 있는 공인의 기본 이력을 소량·출처와 함께 보강한다.

이름 검색이나 생성형 요약을 쓰지 않고, 보강 큐의 ``wd:Q…`` ID에서 직접 읽는다.
저장하는 값은 공직·직업·소속·수상·공식 사이트 등 공개 프로필의 최소 필드이며,
각 레코드에 해당 Wikidata 항목 URL과 수집 시각을 함께 남긴다. 화면은 별도의
검토 단계를 거친 뒤에만 이 원장을 사용한다.

    python scripts/people/wikidata_backfill.py data --limit 18
"""

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.dirname(HERE)
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)
from people.pcommon import load, now_iso, save  # noqa: E402


UA = "NewsBoardPeople/1.0 (+https://github.com/pyw31337/news)"
ENTITY_URL = "https://www.wikidata.org/wiki/Special:EntityData/%s.json"
API_URL = "https://www.wikidata.org/w/api.php"
REFRESH_DAYS = 30
FIELDS = {
    "birth_year": "P569",
    "birth_place": "P19",
    "occupations": "P106",
    "positions": "P39",
    "employers": "P108",
    "awards": "P166",
    "official_sites": "P856",
}


def get_json(url, timeout=18):
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def recent(value):
    try:
        then = dt.date.fromisoformat(str(value)[:10])
    except ValueError:
        return False
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
    return (today - then).days < REFRESH_DAYS


def entity(qid):
    payload = get_json(ENTITY_URL % urllib.parse.quote(qid))
    value = (payload.get("entities") or {}).get(qid)
    if not isinstance(value, dict):
        raise ValueError("wikidata_entity_missing")
    return value


def data_values(item, prop):
    values = []
    for claim in (item.get("claims") or {}).get(prop, []):
        try:
            value = claim["mainsnak"]["datavalue"]["value"]
        except (KeyError, TypeError):
            continue
        if isinstance(value, dict) and value.get("id"):
            values.append(value["id"])
        elif isinstance(value, dict) and value.get("time"):
            # 생일의 일·월까지 다시 저장하지 않고 공개 프로필에 필요한 연도만 쓴다.
            match = re.match(r"[+-](\d{4,})", value["time"])
            if match:
                values.append(match.group(1))
        elif isinstance(value, str) and value:
            values.append(value)
    return list(dict.fromkeys(values))


def labels(qids):
    if not qids:
        return {}
    query = urllib.parse.urlencode({
        "action": "wbgetentities", "format": "json", "props": "labels",
        "languages": "ko|en", "ids": "|".join(sorted(qids)),
    })
    payload = get_json(API_URL + "?" + query)
    out = {}
    for qid, value in (payload.get("entities") or {}).items():
        label = (value.get("labels") or {}).get("ko") or (value.get("labels") or {}).get("en") or {}
        if label.get("value"):
            out[qid] = label["value"]
    return out


def candidates(data_dir, manifest, limit):
    queue = load(os.path.join(data_dir, "db", "people", "enrichment_queue.json"), {}) or {}
    selected = []
    for candidate in queue.get("items", []) if isinstance(queue, dict) else []:
        pid = candidate.get("id", "")
        if not re.fullmatch(r"wd:Q\d+", pid):
            continue
        if recent((manifest["items"].get(pid) or {}).get("retrieved")):
            continue
        if recent((manifest["skipped"].get(pid) or {}).get("checked")):
            continue
        selected.append(candidate)
        if len(selected) >= limit:
            break
    return selected


def record_for(candidate):
    qid = candidate["id"].removeprefix("wd:")
    item = entity(qid)
    raw = {field: data_values(item, prop) for field, prop in FIELDS.items()}
    ids = {value for field, values in raw.items() if field != "birth_year" for value in values if re.fullmatch(r"Q\d+", value)}
    named = labels(ids)
    fields = {}
    for field, values in raw.items():
        if field == "birth_year":
            fields[field] = values[0] if values else ""
        elif field == "official_sites":
            fields[field] = values[:3]
        else:
            fields[field] = [{"id": value, "label": named.get(value, value)} for value in values[:8]]
    return {
        "name": candidate.get("name", ""),
        "kind": candidate.get("kind", ""),
        "wikidata": "https://www.wikidata.org/wiki/" + qid,
        "retrieved": now_iso(),
        "license": "CC0 1.0 (Wikidata structured data)",
        "fields": fields,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data", nargs="?", default="data")
    parser.add_argument("--limit", type=int, default=int(os.environ.get("PEOPLE_WIKIDATA_LIMIT", "18")))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    path = os.path.join(args.data, "db", "people", "wikidata_facts.json")
    manifest = load(path, {}) or {}
    manifest.setdefault("schema", 1)
    manifest.setdefault("items", {})
    manifest.setdefault("skipped", {})
    batch = candidates(args.data, manifest, max(0, args.limit))
    if args.dry_run:
        print("wikidata_backfill dry-run:", ", ".join("%s(%s)" % (item.get("name"), item.get("id")) for item in batch) or "no candidates")
        return

    saved = skipped = 0
    for candidate in batch:
        pid = candidate["id"]
        try:
            manifest["items"][pid] = record_for(candidate)
            manifest["skipped"].pop(pid, None)
            saved += 1
        except Exception as exc:  # 한 항목의 네트워크 실패가 나머지 보강을 막지 않는다.
            manifest["skipped"][pid] = {"name": candidate.get("name", ""), "checked": now_iso(), "reason": str(exc)[:120]}
            skipped += 1
        time.sleep(0.25)
    manifest["updated"] = now_iso()
    manifest["policy"] = "Tier-1 public figures with stable Wikidata IDs only; raw facts remain source-linked until page-level review."
    save(path, manifest, compact=False)
    print("wikidata_backfill: candidates=%d saved=%d skipped=%d total=%d" % (len(batch), saved, skipped, len(manifest["items"])))


if __name__ == "__main__":
    main()
