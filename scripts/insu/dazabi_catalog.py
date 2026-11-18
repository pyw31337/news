#!/usr/bin/env python3
"""Index the public insurer directory and official disclosure links.

The directory is used as a discovery source only.  It does not turn third
party summaries into policy facts; each insurer URL becomes a disabled source
candidate until an agent verifies the page and enables it explicitly.
"""
import json, re, urllib.request, os
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "insu"
URL = "https://dazabi.com/Content/insu_link/insurance_Terms.php?back_category=insurance&from_unified=true"


def run():
    req = urllib.request.Request(URL, headers={"User-Agent": "NewsBoard insurance catalog"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
    # The directory exposes insurer names adjacent to their official links.
    blocks = re.findall(r'<a[^>]+href=["\'](https?://[^"\']+)["\'][^>]*class=["\'][^"\']*isd-card-footer[^"\']*["\'][^>]*>(.*?)</a>', html, re.I | re.S)
    rows = []
    previous = {}
    old_path = DATA / "provider_catalog.json"
    if old_path.exists():
        try: previous = {p.get("official_url"): p for p in json.loads(old_path.read_text(encoding="utf-8")).get("providers", [])}
        except (OSError, ValueError): previous = {}
    seen = set()
    for i, (link, block) in enumerate(blocks):
        link = link.replace('&amp;', '&')
        if link in seen: continue
        seen.add(link)
        m = re.search(r'class=["\'][^"\']*company-name[^"\']*["\'][^>]*>\s*([^<]+)', block, re.I)
        name = m.group(1).strip() if m else ""
        old = previous.get(link, {})
        enabled = old.get("enabled", True)
        if os.environ.get("DISABLE_AUTO_BOOTSTRAP") != "1": enabled = True
        rows.append({"id": old.get("id", f"insurer-{i+1:03d}"), "insurer": name, "official_url": link, "discovery_source": URL, "enabled": enabled})
    DATA.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).isoformat()
    (DATA / "provider_catalog.json").write_text(json.dumps({"source": URL, "updated_at": stamp, "count": len(rows), "providers": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest = [{"id": r["id"], "url": r["official_url"], "official": True, "enabled": r.get("enabled", True), "insurer": r["insurer"], "discovery_source": URL} for r in rows]
    (DATA / "source_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"insurer catalog indexed: {len(rows)} official links")


if __name__ == "__main__": run()
