#!/usr/bin/env python3
"""Bounded initial bulk fetch for public insurer documents.

Only HTTPS links discovered from an insurer's own official page are accepted.
No login, captcha, paywall, robots restriction, or access control is bypassed.
The checkpoint makes the bootstrap resumable; later runs fetch only unseen or
changed URLs.
"""
import hashlib, json, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "insu"
CANDIDATES = DATA / "product_candidates.json"
RAW = DATA / "raw_documents"
STATE = DATA / "bootstrap_checkpoint.json"
LIMIT = int(os.environ.get("INSU_BOOTSTRAP_BATCH", "200"))
MAX_BYTES = 25_000_000

def run():
    if not CANDIDATES.exists():
        print("no product candidates"); return
    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {"seen": {}, "batches": []}
    RAW.mkdir(parents=True, exist_ok=True)
    queue = []
    for provider in json.loads(CANDIDATES.read_text(encoding="utf-8")).get("providers", []):
        base = urlparse(provider.get("source_url", "")).netloc
        for link in provider.get("candidate_links", []):
            url = link.get("url", "")
            if url.startswith("https://") and urlparse(url).netloc == base and url not in state["seen"]:
                queue.append({"url": url, "insurer": provider.get("insurer"), "label": link.get("label", "")})
    queue = queue[:LIMIT]
    def fetch(item):
        url = item["url"]
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NewsBoard public-document bootstrap"})
            with urllib.request.urlopen(req, timeout=12) as response:
                body = response.read(MAX_BYTES + 1); ctype = response.headers.get("Content-Type", "")
            if len(body) > MAX_BYTES: raise ValueError("document exceeds 25MB safety limit")
            sha = hashlib.sha256(body).hexdigest(); path = RAW / f"{sha}.bin"; path.write_bytes(body)
            state["seen"][url] = sha
            return {**item, "sha256": sha, "bytes": len(body), "content_type": ctype, "fetched_at": datetime.now(timezone.utc).isoformat(), "path": str(path.relative_to(DATA))}
        except Exception as exc:
            return {**item, "status": "ERROR", "error": str(exc)[:180]}
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(fetch, queue))
    for item in results:
        if item.get("sha256"): state["seen"][item["url"]] = item["sha256"]
        else: state["seen"][item["url"]] = {"error": item.get("error", "unknown"), "at": datetime.now(timezone.utc).isoformat()}
    state["batches"].append({"at": datetime.now(timezone.utc).isoformat(), "requested": len(queue), "results": len(results)})
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (DATA / "bootstrap_fetch_log.json").write_text(json.dumps({"updated_at": datetime.now(timezone.utc).isoformat(), "items": results}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"insurance bootstrap: requested={len(queue)} total_seen={len(state['seen'])}")

if __name__ == "__main__": run()
