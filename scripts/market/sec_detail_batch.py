#!/usr/bin/env python3
"""Fetch a bounded batch of SEC company submissions by CIK.

The universe comes from ``sec_tickers_index.json``.  Each run advances to the
next companies with no local evidence, making retries idempotent and keeping
within SEC rate limits.
"""
import json, os, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "market"
INDEX = DATA / "sec_tickers_index.json"
OUT = DATA / "sec_companies"
LIMIT = int(os.environ.get("SEC_BATCH_SIZE", "100"))


def get(url, ua):
    req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def run():
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    companies = index.get("companies", [])
    OUT.mkdir(parents=True, exist_ok=True)
    ua = os.environ.get("SEC_USER_AGENT", "").strip() or "NewsBoard research contact: admin@newsboard.local"
    todo = [c for c in companies if not (OUT / f"{c['cik']}.json").exists()][:LIMIT]
    done = 0
    for c in todo:
        try:
            url = f"https://data.sec.gov/submissions/CIK{c['cik']}.json"
            payload = get(url, ua)
            payload["_newsboard"] = {"ticker": c.get("ticker"), "name": c.get("name"), "source_url": url, "fetched_at": datetime.now(timezone.utc).isoformat()}
            (OUT / f"{c['cik']}.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            done += 1
        except Exception as exc:
            print(f"WARN {c.get('ticker')}: {exc}")
        time.sleep(0.12)
    index["detail_batches"] = index.get("detail_batches", []) + [{"at": datetime.now(timezone.utc).isoformat(), "requested": len(todo), "completed": done}]
    index["crawled"] = len(list(OUT.glob("*.json")))
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"SEC detail batch: requested={len(todo)} completed={done} total={index['crawled']}")


if __name__ == "__main__": run()
