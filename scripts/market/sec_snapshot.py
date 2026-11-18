#!/usr/bin/env python3
"""Fetch the SEC's official company ticker/CIK index.

This is the safe first stage of the US collector: it refreshes the universe
from SEC rather than a hard-coded list. Filing/detail workers can then consume
the CIKs in bounded batches and record their own evidence.
"""
import json, os, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "market" / "sec_tickers_index.json"
URL = "https://www.sec.gov/files/company_tickers.json"


def run():
    ua = os.environ.get("SEC_USER_AGENT", "NewsBoard research contact: admin@newsboard.local")
    req = urllib.request.Request(URL, headers={"User-Agent": ua, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = json.load(response)
    rows = list(raw.values()) if isinstance(raw, dict) else raw
    rows = [{"cik": str(r.get("cik_str", "")).zfill(10), "ticker": r.get("ticker", ""), "name": r.get("title", "")} for r in rows]
    rows = [r for r in rows if r["cik"] and r["ticker"]]
    old = {}
    try: old = json.loads(OUT.read_text(encoding="utf-8"))
    except (OSError, ValueError): pass
    payload = {
        "source": URL, "source_verified": True,
        "total_sec_listed_companies": len(rows), "companies": rows,
        "crawled": int(old.get("crawled", 0) or 0),
        "detail_batches": old.get("detail_batches", []),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"SEC universe refreshed: {len(rows)} companies")


if __name__ == "__main__": run()
