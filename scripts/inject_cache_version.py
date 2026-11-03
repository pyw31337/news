#!/usr/bin/env python3
"""
NewsBoard Automated Cache Busting & Version Injection
Injects git commit hash into sw.js (cache name V) and asset query strings (?v=)
in index.html and sw.js SHELL array during build/deployment.
"""
import os
import re
import sys
import subprocess
from datetime import datetime, timezone

def get_git_commit_hash(length=8):
    """Retrieves commit hash from GITHUB_SHA environment variable or git CLI."""
    # 1. GitHub Actions environment variable
    env_sha = os.environ.get('GITHUB_SHA', '').strip()
    if env_sha:
        return env_sha[:length]

    # 2. Local git repository
    try:
        res = subprocess.run(
            ['git', 'rev-parse', f'--short={length}', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        h = res.stdout.strip()
        if h:
            return h
    except Exception:
        pass

    # 3. Fallback timestamp
    return datetime.now(timezone.utc).strftime('%Y%m%d%H%M')

def inject_cache_version(site_dir=None, version_tag=None):
    """
    Injects version tag into sw.js and index.html in site_dir.
    site_dir: directory containing index.html and sw.js (defaults to '_site' if exists, else '.')
    """
    if not site_dir:
        site_dir = '_site' if os.path.isdir('_site') else '.'

    if not version_tag:
        version_tag = get_git_commit_hash(8)

    cache_version = f"nb-{version_tag}"
    index_path = os.path.join(site_dir, 'index.html')
    sw_path = os.path.join(site_dir, 'sw.js')

    updated_files = []

    # 1. Update sw.js
    if os.path.exists(sw_path):
        with open(sw_path, 'r', encoding='utf-8') as f:
            sw_content = f.read()

        # Replace const V='...' with const V='nb-{version_tag}'
        new_sw = re.sub(r"const\s+V=['\"][^'\"]+['\"]", f"const V='{cache_version}'", sw_content)
        # Update ?v=NN in SHELL array for local assets
        new_sw = re.sub(r"(\?[vV]=)[a-zA-Z0-9_\-]+", rf"\g<1>{version_tag}", new_sw)

        if new_sw != sw_content:
            with open(sw_path, 'w', encoding='utf-8') as f:
                f.write(new_sw)
            updated_files.append(sw_path)

    # 2. Update index.html
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        # Update ?v=NN for local css/js/icons
        new_html = re.sub(
            r'((?:href|src)=["\'](?:assets/|icons/|favicon\.ico)[^"\'?]+)(\?[vV]=)[a-zA-Z0-9_\-]+(["\'])',
            rf'\g<1>\g<2>{version_tag}\g<3>',
            html_content
        )

        if new_html != html_content:
            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(new_html)
            updated_files.append(index_path)

    print(f"  [cache_burst] Version: {cache_version} ({version_tag}) | Target: {site_dir}")
    if updated_files:
        print(f"  [cache_burst] Injected successfully into: {', '.join(updated_files)}")
    else:
        print(f"  [cache_burst] Files already up-to-date or unchanged.")

    return cache_version, version_tag

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else None
    vtag = sys.argv[2] if len(sys.argv) > 2 else None
    inject_cache_version(target, vtag)
