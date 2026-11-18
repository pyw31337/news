#!/usr/bin/env python3
"""Detect official-document changes by content hash, without interpreting text."""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "insu"
LOG = DATA / "source_fetch_log.json"
OUT = DATA / "policy_change_log.json"

def run():
    current = json.loads(LOG.read_text(encoding="utf-8")) if LOG.exists() else {"items": []}
    previous = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"latest": {}}
    latest = previous.get("latest", {})
    changes = []
    for row in current.get("items", []):
        key, digest = row.get("id"), row.get("sha256")
        if not key or not digest: continue
        kind = "NEW" if key not in latest else ("CHANGED" if latest[key] != digest else "UNCHANGED")
        if kind != "UNCHANGED": changes.append({"id": key, "kind": kind, "old_sha256": latest.get(key), "new_sha256": digest, "detected_at": datetime.now(timezone.utc).isoformat(), "source_url": row.get("url")})
        latest[key] = digest
    OUT.write_text(json.dumps({"updated_at": datetime.now(timezone.utc).isoformat(), "latest": latest, "changes": changes}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"insurance version changes: {len(changes)}")

if __name__ == "__main__": run()
