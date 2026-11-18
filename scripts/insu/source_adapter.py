#!/usr/bin/env python3
"""Fetch only explicitly approved official insurance sources.

Sources are opt-in via ``data/insu/source_manifest.json``.  The adapter stores
raw bytes and metadata; it never invents policy clauses from search results.
"""
import hashlib, json, os, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "insu"
MANIFEST = DATA / "source_manifest.json"
RAW = DATA / "raw_sources"


def run():
    if not MANIFEST.exists():
        print("insurance source manifest absent; no unverified source fetched")
        return
    entries = json.loads(MANIFEST.read_text(encoding="utf-8"))
    RAW.mkdir(parents=True, exist_ok=True)
    ua = os.environ.get("INSU_USER_AGENT", "NewsBoard research")
    def fetch(item):
        url = item.get("url", "")
        if not url.startswith("https://") or not item.get("official") or not item.get("enabled"):
            return {"id": item.get("id"), "status": "REJECTED_UNVERIFIED"}
        try:
            req = urllib.request.Request(url, headers={"User-Agent": ua})
            with urllib.request.urlopen(req, timeout=8) as response:
                body = response.read(20_000_000)
                content_type = response.headers.get("Content-Type", "")
            digest = hashlib.sha256(body).hexdigest()
            target = RAW / f"{item.get('id', digest[:16])}-{digest[:12]}.bin"
            target.write_bytes(body)
            return {"id": item.get("id"), "url": url, "sha256": digest, "bytes": len(body), "content_type": content_type, "fetched_at": datetime.now(timezone.utc).isoformat(), "path": str(target.relative_to(DATA))}
        except Exception as exc:
            return {"id": item.get("id"), "url": url, "status": "ERROR", "error": str(exc)[:200]}
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(fetch, entries))
    (DATA / "source_fetch_log.json").write_text(json.dumps({"updated_at": datetime.now(timezone.utc).isoformat(), "items": results}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"insurance official source adapter: {len(results)} entries")


if __name__ == "__main__": run()
