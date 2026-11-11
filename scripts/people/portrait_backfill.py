#!/usr/bin/env python3
"""출처와 라이선스가 확인된 Wikidata 인물 초상만 소량 보강한다.

이름 검색 결과나 기사 대표사진은 사용하지 않는다. 1계층의 고정 Wikidata QID →
P18(대표 이미지) → Wikimedia Commons의 라이선스 메타데이터 순서가 모두 확인된
경우에만 720px WebP를 만들고, 원본 파일·라이선스·출처 URL을 함께 보관한다.

    python scripts/people/portrait_backfill.py data media --limit 12
"""

import argparse
import datetime as dt
import hashlib
import html
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.dirname(HERE)
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)
from people.pcommon import load, now_iso, save  # noqa: E402


UA = "NewsBoardPeople/1.0 (+https://github.com/pyw31337/news)"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
WIKIDATA = "https://www.wikidata.org/wiki/Special:EntityData/%s.json"
COOLDOWN_DAYS = 14


def clean_text(value):
    value = html.unescape(str(value or ""))
    return re.sub(r"<[^>]+>", "", value).strip()


def get_json(url, timeout=18):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def p18_file(qid):
    payload = get_json(WIKIDATA % urllib.parse.quote(qid))
    entity = (payload.get("entities") or {}).get(qid, {})
    for claim in (entity.get("claims") or {}).get("P18", []):
        try:
            value = claim["mainsnak"]["datavalue"]["value"]
        except (KeyError, TypeError):
            continue
        if isinstance(value, str) and value:
            return value
    return ""


def commons_image_info(filename):
    query = urllib.parse.urlencode({
        "action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|extmetadata",
        "iiurlwidth": "720", "titles": "File:" + filename,
    })
    payload = get_json(COMMONS_API + "?" + query)
    pages = ((payload.get("query") or {}).get("pages") or {}).values()
    page = next(iter(pages), {})
    info = (page.get("imageinfo") or [{}])[0]
    metadata = info.get("extmetadata") or {}
    field = lambda key: clean_text((metadata.get(key) or {}).get("value", ""))
    license_name = field("LicenseShortName") or field("UsageTerms")
    license_url = field("LicenseUrl")
    url = info.get("thumburl") or info.get("url") or ""
    if not (url and license_name):
        return None
    return {
        "url": url,
        "source": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(filename.replace(" ", "_")),
        "file": filename,
        "license": license_name,
        "license_url": license_url,
        "author": field("Artist"),
    }


def download_webp(url, destination):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*"})
    with urllib.request.urlopen(req, timeout=30) as response:
        length = int(response.headers.get("Content-Length") or 0)
        if length > 6 * 1024 * 1024:
            raise ValueError("image_too_large")
        blob = response.read(6 * 1024 * 1024 + 1)
    if len(blob) > 6 * 1024 * 1024:
        raise ValueError("image_too_large")
    with Image.open(io.BytesIO(blob)) as source:
        source.load()
        image = source.convert("RGB")
    if min(image.size) < 80:
        raise ValueError("image_too_small")
    image.thumbnail((720, 720), Image.Resampling.LANCZOS)
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    image.save(destination, "WEBP", quality=82, method=6)


def recent(value):
    try:
        checked = dt.date.fromisoformat(str(value)[:10])
    except ValueError:
        return False
    return (dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date() - checked).days < COOLDOWN_DAYS


def candidates(data_dir, manifest, limit):
    queue = load(os.path.join(data_dir, "db", "people", "enrichment_queue.json"), {}) or {}
    items = queue.get("items", []) if isinstance(queue, dict) else []
    selected = []
    for item in items:
        pid = item.get("id", "")
        if not re.fullmatch(r"wd:Q\d+", pid) or pid in manifest["items"]:
            continue
        if recent((manifest["skipped"].get(pid) or {}).get("checked")):
            continue
        if "verified_portrait" not in (item.get("needs") or []):
            continue
        selected.append(item)
        if len(selected) >= limit:
            break
    return selected


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data", nargs="?", default="data")
    parser.add_argument("media", nargs="?", default="media")
    parser.add_argument("--limit", type=int, default=int(os.environ.get("PEOPLE_PORTRAIT_LIMIT", "12")))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    out = os.path.join(args.data, "db", "people", "portraits.json")
    manifest = load(out, {}) or {}
    manifest.setdefault("schema", 1)
    manifest.setdefault("items", {})
    manifest.setdefault("skipped", {})
    batch = candidates(args.data, manifest, max(0, args.limit))
    if args.dry_run:
        print("portrait_backfill dry-run:", ", ".join("%s(%s)" % (item.get("name"), item.get("id")) for item in batch) or "no candidates")
        return

    saved = skipped = 0
    for item in batch:
        pid = item["id"]
        try:
            # 고정 QID가 이름을 대신해 식별한다. 사람 이름으로 검색하지 않는다.
            filename = p18_file(pid.removeprefix("wd:"))
            if not filename:
                raise ValueError("wikidata_p18_missing")
            info = commons_image_info(filename)
            if not info:
                raise ValueError("commons_license_or_file_missing")
            digest = hashlib.sha256((pid + "\0" + filename).encode("utf-8")).hexdigest()[:16]
            relative = "media/ent/%s/%s.webp" % (digest[:2], digest)
            destination = os.path.join(args.media, relative.removeprefix("media/"))
            if not os.path.exists(destination):
                download_webp(info["url"], destination)
            manifest["items"][pid] = {
                "name": item.get("name", ""),
                "kind": item.get("kind", ""),
                "file": relative,
                "wikidata": item.get("wikidata", ""),
                "source": info["source"],
                "license": info["license"],
                "license_url": info["license_url"],
                "author": info["author"],
                "file_name": filename,
                "updated": now_iso(),
            }
            manifest["skipped"].pop(pid, None)
            saved += 1
        except Exception as exc:  # 한 인물 실패가 다음 검증 대상까지 막지 않는다.
            manifest["skipped"][pid] = {"name": item.get("name", ""), "checked": now_iso(), "reason": str(exc)[:120]}
            skipped += 1
        time.sleep(0.35)
    manifest["updated"] = now_iso()
    save(out, manifest, compact=False)
    print("portrait_backfill: candidates=%d saved=%d skipped=%d total=%d" % (len(batch), saved, skipped, len(manifest["items"])))


if __name__ == "__main__":
    main()
