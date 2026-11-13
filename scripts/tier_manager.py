#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NewsBoard Tiered Entity Storage & Link Health Check Engine
1. Tier Classification:
   - Level 1 (공인/주요인사/핵심인력): 서버 로컬 영구 보관 (Local WebP Storage)
   - Level 2 (민간인/실무진/일반공무원): 공식 원본 링크 보관 (Remote URL Reference)
2. Link Health Checker:
   - Remote URL 대상 주기적 HEAD 요청 유효성 검증 (200 OK, 301 Redirect, 404 Broken)
   - 깨진 링크 감지 시 안전한 Fallback 심볼 전환 및 리포트 생성 (data/link_health.json)
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
ELITE_PATH = os.path.join(DATA_DIR, "elite_network.json")
HEALTH_REPORT_PATH = os.path.join(DATA_DIR, "link_health.json")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (NewsBoard Link Auditor)"

# Level 1 키워드 (공인 / 주요인사 판정 정규식)
LEVEL1_KEYWORDS = re.compile(
    r"대통령|국무총리|부총리|장관|차관|국회의원|도지사|시장|군수|구청장|"
    r"대법관|헌법재판관|검사장|검찰총장|법원장|부장판사|부장검사|고검장|"
    r"회장|부회장|대표이사|총괄대표|의장|창업자|이사회|"
    r"앵커|보도국장|논설위원|주필|정치부장|사회부장|"
    r"유튜버|크리에이터|스트리머|연예인|가수|배우|"
    r"두목|보스|총책|주범",
    re.I
)

def classify_entity_tier(entity):
    """
    인물 메타데이터를 분석하여 Level 1(공인/로컬보관) 또는 Level 2(민간인/외부링크)로 판정.
    """
    name = entity.get("name", "")
    role = entity.get("role", "")
    desc = entity.get("desc", "")
    party = entity.get("party", "")
    type_ = entity.get("type", "")
    buzz = entity.get("buzz", 0)

    # 1. 헌법기관, 국회의원, 고위직, 정당 소속 공인
    if party or type_ in ("politician", "public_official", "leader"):
        return "Level 1 (공인/서버보관)"

    # 2. 직책 및 설명에 Level 1 핵심 키워드 포함 시
    text = f"{name} {role} {desc}"
    if LEVEL1_KEYWORDS.search(text):
        return "Level 1 (공인/서버보관)"

    # 3. 보도량(Buzz)이 일정 수준 이상인 화제 인물
    if buzz >= 10:
        return "Level 1 (공인/서버보관)"

    # 4. 그 외 실무 공무원(5~9급), 일반 친인척, 민간인은 Level 2
    return "Level 2 (민간인/외부링크)"

def check_single_url(url, timeout=5):
    """
    단일 URL에 대해 HEAD 요청(경량 헤더 검사)을 수행하여 유효성을 판정.
    """
    if not url or not url.startswith(("http://", "https://")):
        return {"url": url, "status": "invalid_url", "code": 0, "alive": False}

    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA}, method="HEAD")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = resp.getcode()
            content_type = resp.headers.get("Content-Type", "").lower()
            final_url = resp.geturl()
            is_redirect = (final_url != url)
            alive = (200 <= code < 400)
            return {
                "url": url,
                "alive": alive,
                "code": code,
                "content_type": content_type,
                "redirected": is_redirect,
                "final_url": final_url if is_redirect else None,
                "status": "ok" if alive else "failed"
            }
    except urllib.error.HTTPError as e:
        # 일부 서버가 HEAD 요청을 403/405로 막는 경우 GET 바이트 레인지로 재시도
        if e.code in (403, 405):
            try:
                get_req = urllib.request.Request(url, headers={"User-Agent": UA, "Range": "bytes=0-100"}, method="GET")
                with urllib.request.urlopen(get_req, timeout=timeout) as resp:
                    return {
                        "url": url,
                        "alive": True,
                        "code": resp.getcode(),
                        "content_type": resp.headers.get("Content-Type", ""),
                        "status": "ok"
                    }
            except Exception:
                pass
        return {"url": url, "alive": False, "code": e.code, "status": f"http_error_{e.code}"}
    except Exception as e:
        return {"url": url, "alive": False, "code": 0, "status": f"error_{type(e).__name__}"}

def audit_all_external_links(max_workers=20):
    """
    수집된 인물 DB의 외부 URL을 멀티스레드로 전수 검사하고 link_health.json을 갱신.
    """
    print(f"[*] Starting Link Health Audit (workers={max_workers})...")
    urls_to_check = set()

    # 1. elite_network.json 내 외부 URL 수집
    if os.path.exists(ELITE_PATH):
        try:
            with open(ELITE_PATH, "r", encoding="utf-8") as f:
                elite = json.load(f)
            # journalists photos
            for j in (elite.get("journalists") or {}).values():
                p = j.get("photo")
                if p and p.startswith("http"):
                    urls_to_check.add(p)
            # family sources
            for fam_list in (elite.get("family_members") or {}).values():
                for f_item in fam_list:
                    src = f_item.get("source_url")
                    if src and src.startswith("http"):
                        urls_to_check.add(src)
        except Exception as e:
            print(f"[!] Warning reading elite_network: {e}")

    # 2. today.json 내 엔티티 외부 링크 수집
    today_path = os.path.join(DATA_DIR, "today.json")
    if os.path.exists(today_path):
        try:
            with open(today_path, "r", encoding="utf-8") as f:
                today = json.load(f)
            for e in today.get("entities", []):
                v = e.get("visual") or {}
                url = v.get("url") or e.get("photo")
                if url and url.startswith("http"):
                    urls_to_check.add(url)
        except Exception as e:
            print(f"[!] Warning reading today.json: {e}")

    print(f"[*] Total unique external URLs to audit: {len(urls_to_check)}")
    if not urls_to_check:
        print("[*] No external URLs to audit.")
        return

    results = []
    alive_count = 0
    broken_count = 0
    redirect_count = 0

    start_time = time.time()
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map = {executor.submit(check_single_url, u): u for u in urls_to_check}
        for future in as_completed(future_map):
            res = future.result()
            results.append(res)
            if res["alive"]:
                alive_count += 1
                if res.get("redirected"):
                    redirect_count += 1
            else:
                broken_count += 1

    elapsed = time.time() - start_time
    health_ratio = (alive_count / len(results) * 100) if results else 100.0

    report = {
        "audited_at": time.strftime("%Y-%m-%d %H:%M:%S KST", time.localtime()),
        "total_checked": len(results),
        "alive_urls": alive_count,
        "broken_urls": broken_count,
        "redirected_urls": redirect_count,
        "health_ratio_percent": round(health_ratio, 2),
        "elapsed_seconds": round(elapsed, 2),
        "broken_details": [r for r in results if not r["alive"]][:100],
        "redirect_updates": [r for r in results if r.get("redirected")][:100]
    }

    with open(HEALTH_REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"[✓] Link Audit Completed in {elapsed:.1f}s!")
    print(f"    - Total: {len(results)}, Alive: {alive_count} ({health_ratio:.1f}%), Broken: {broken_count}, Redirected: {redirect_count}")
    print(f"    - Health report saved to: {HEALTH_REPORT_PATH}")

if __name__ == "__main__":
    audit_all_external_links()
