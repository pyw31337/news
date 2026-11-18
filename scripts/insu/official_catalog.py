#!/usr/bin/env python3
"""Discover product/terms links from explicitly approved insurer pages."""
import json, re, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "insu"
MANIFEST = DATA / "source_manifest.json"
OUT = DATA / "product_candidates.json"

def run():
    if not MANIFEST.exists():
        print("no insurer manifest"); return
    rows = []
    items = [x for x in json.loads(MANIFEST.read_text(encoding="utf-8")) if x.get("enabled") and x.get("official")]
    def fetch(item):
        url = item.get("url", "")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NewsBoard insurer catalog"})
            with urllib.request.urlopen(req, timeout=8) as response:
                body = response.read(10_000_000).decode("utf-8", "ignore")
            links = []
            for href, text in re.findall(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', body, re.I | re.S):
                label = re.sub(r"<[^>]+>", " ", text); label = re.sub(r"\s+", " ", label).strip()
                if re.search(r"약관|상품요약서|사업방법서|상품설명서|판매기간|공시", label, re.I):
                    links.append({"url": urljoin(url, href), "label": label[:200], "verified": False})
            # Many insurer disclosure portals render their product table with
            # JavaScript, so no product anchors appear in the HTML response.
            # Keep the official catalog page as an explicit seed instead of
            # silently reporting zero candidates; the next bootstrap pass can
            # still hash and diff the page while a renderer/API adapter is added.
            if not links:
                links.append({"url": url, "label": "공식 상품·약관 공시 페이지(렌더링 후보)", "verified": False, "kind": "catalog_page"})
            return {"provider_id": item.get("id"), "insurer": item.get("insurer"), "source_url": url, "candidate_links": links, "discovered_at": datetime.now(timezone.utc).isoformat()}
        except Exception as exc:
            return {"provider_id": item.get("id"), "insurer": item.get("insurer"), "source_url": url, "error": str(exc)[:200]}
    with ThreadPoolExecutor(max_workers=8) as pool:
        rows = list(pool.map(fetch, items))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"updated_at": datetime.now(timezone.utc).isoformat(), "providers": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"official insurer product candidates: {len(rows)} providers")

if __name__ == "__main__": run()
