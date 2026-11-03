#!/usr/bin/env python3
"""
NewsBoard Project Validation Script
Checks site integrity, asset references, Service Worker sync, and python syntax.
"""
import os
import re
import sys
import py_compile

def check_html_assets():
    print("[1/5] Checking index.html asset references...")
    if not os.path.exists("index.html"):
        print("  ❌ ERROR: index.html not found!")
        return False

    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()

    # Extract href and src
    links = re.findall(r'<link[^>]+href=["\']([^"\']+)["\']', html)
    scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html)

    all_refs = links + scripts
    missing = []
    checked = 0

    for ref in all_refs:
        # Ignore external cdn links
        if ref.startswith("http://") or ref.startswith("https://") or ref.startswith("//"):
            continue
        # Remove query params like ?v=NN
        clean_path = ref.split("?")[0]
        # Skip empty or anchor
        if not clean_path or clean_path == "./":
            continue

        checked += 1
        if not os.path.exists(clean_path):
            missing.append(clean_path)

    if missing:
        print(f"  ❌ Missing assets in index.html ({len(missing)}):")
        for m in missing:
            print(f"     - {m}")
        return False

    print(f"  ✅ All {checked} referenced static assets in index.html verified.")
    return True

def check_sw_sync():
    print("[2/5] Checking Service Worker (sw.js)...")
    if not os.path.exists("sw.js"):
        print("  ❌ ERROR: sw.js not found!")
        return False

    with open("sw.js", "r", encoding="utf-8") as f:
        content = f.read()

    m_v = re.search(r"V=['\"](nb-(?:v\d+|[0-9a-fA-F]{6,40}|\w+))['\"]", content)
    if not m_v:
        print("  ⚠️ WARNING: Could not find valid cache version (nb-vNN or nb-<hash>) in sw.js")
    else:
        print(f"  ✅ Cache version: {m_v.group(1)}")

    m_shell = re.search(r"SHELL=\[([^\]]+)\]", content)
    if not m_shell:
        print("  ❌ ERROR: Could not extract SHELL array from sw.js")
        return False

    raw_items = m_shell.group(1).split(",")
    missing = []
    checked = 0

    for item in raw_items:
        clean = item.strip().strip("'\"").split("?")[0]
        if not clean or clean in ["./", "index.html"]:
            continue
        checked += 1
        if not os.path.exists(clean):
            missing.append(clean)

    if missing:
        print(f"  ❌ Missing assets in sw.js SHELL list ({len(missing)}):")
        for m in missing:
            print(f"     - {m}")
        return False

    print(f"  ✅ All {checked} SHELL assets verified.")
    return True

def check_manifest_and_icons():
    print("[3/5] Checking PWA Manifest and Essential Icons...")
    required = [
        "manifest.webmanifest",
        "favicon.ico",
        "og-image.png",
        "icons/favicon-32.png",
        "icons/favicon-16.png",
        "icons/apple-touch-icon.png",
        "icons/icon-192.png"
    ]
    missing = [f for f in required if not os.path.exists(f)]
    if missing:
        print(f"  ❌ Missing essential PWA files:")
        for m in missing:
            print(f"     - {m}")
        return False

    print(f"  ✅ All {len(required)} essential PWA and icon assets exist.")
    return True

def check_python_syntax():
    print("[4/5] Checking Python syntax in scripts/...")
    errors = []
    count = 0
    for root, _, files in os.walk("scripts"):
        for f in files:
            if f.endswith(".py"):
                path = os.path.join(root, f)
                count += 1
                try:
                    py_compile.compile(path, doraise=True)
                except py_compile.PyCompileError as e:
                    errors.append((path, str(e)))

    if errors:
        print(f"  ❌ Syntax errors found in {len(errors)} script(s):")
        for p, err in errors:
            print(f"     - {p}: {err}")
        return False

    print(f"  ✅ Compiled and validated {count} Python script files without syntax errors.")
    return True

def check_docs_and_structure():
    print("[5/5] Checking project documentation and structure...")
    essential_docs = ["README.md", "HANDOFF.md", "docs/ROADMAP.md", "docs/design-system.md"]
    missing = [d for d in essential_docs if not os.path.exists(d)]
    if missing:
        print(f"  ⚠️ Warning: Some documentation files are missing: {missing}")
    else:
        print(f"  ✅ Core documentation files present.")
    return True

def main():
    print("=" * 60)
    print(" 🚀 NewsBoard Project Integrity & Smoke Test")
    print("=" * 60)

    results = [
        check_html_assets(),
        check_sw_sync(),
        check_manifest_and_icons(),
        check_python_syntax(),
        check_docs_and_structure()
    ]

    print("=" * 60)
    if all(results):
        print(" 🎉 ALL CHECKS PASSED: Project structure is healthy and production-ready!")
        sys.exit(0)
    else:
        print(" ❌ SOME CHECKS FAILED: Please fix the reported issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
