#!/usr/bin/env python3
"""Publish generated data files to the latest ``data`` branch without rebase.

The data branch is periodically compacted, so a checkout made at the beginning
of a long media job can be hundreds of commits behind when it finishes.  A
normal ``git rebase`` then tries to reconcile unrelated generated JSON and can
lose a useful media index.  This helper snapshots only the files named on its
command line, places them in a fresh clone of the current data branch, and
retries a normal fast-forward push on a fresh clone when another job wins.
"""
import argparse
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time


def run(args, cwd=None, quiet=False):
    result = subprocess.run(args, cwd=cwd, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT)
    if result.returncode and not quiet:
        token = os.environ.get("GITHUB_TOKEN", "")
        output = result.stdout.replace(token, "***") if token else result.stdout
        print(output[-2000:], file=sys.stderr)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir", help="checkout used to generate the files")
    parser.add_argument("paths", nargs="+", help="paths under data_dir to publish")
    parser.add_argument("--message", required=True)
    args = parser.parse_args()
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not token or not repo:
        raise SystemExit("GITHUB_TOKEN and GITHUB_REPOSITORY are required")

    source = pathlib.Path(args.data_dir).resolve()
    snapshot = pathlib.Path(tempfile.mkdtemp(prefix="nb-data-snapshot-"))
    try:
        kept = []
        for raw in args.paths:
            rel = pathlib.PurePosixPath(raw)
            if rel.is_absolute() or ".." in rel.parts:
                raise SystemExit("invalid relative data path: " + raw)
            src = source / rel
            if not src.is_file():
                print("skip missing generated file:", raw)
                continue
            dest = snapshot / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
            kept.append(rel)
        if not kept:
            print("nothing generated to publish")
            return

        remote = "https://x-access-token:%s@github.com/%s.git" % (token, repo)
        for attempt in range(1, 7):
            checkout = pathlib.Path(tempfile.mkdtemp(prefix="nb-data-push-"))
            try:
                clone = run(["git", "clone", "--depth", "1", "--branch", "data", remote, str(checkout)])
                if clone.returncode:
                    raise RuntimeError("could not clone latest data branch")
                for rel in kept:
                    dest = checkout / rel
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(snapshot / rel, dest)
                run(["git", "config", "user.name", "newsboard-bot"], cwd=checkout)
                run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=checkout)
                run(["git", "add", "--", *[str(p) for p in kept]], cwd=checkout)
                if run(["git", "diff", "--cached", "--quiet"], cwd=checkout, quiet=True).returncode == 0:
                    print("latest data branch already has this snapshot")
                    return
                if run(["git", "commit", "-m", args.message], cwd=checkout).returncode:
                    raise RuntimeError("could not commit data snapshot")
                pushed = run(["git", "push", "origin", "HEAD:data"], cwd=checkout, quiet=True)
                if pushed.returncode == 0:
                    print("published data snapshot on attempt", attempt)
                    return
                print("data branch changed during publish; retrying", attempt, file=sys.stderr)
                time.sleep(attempt * 3)
            finally:
                shutil.rmtree(checkout, ignore_errors=True)
        raise SystemExit("could not publish after 6 fresh-clone attempts")
    finally:
        shutil.rmtree(snapshot, ignore_errors=True)


if __name__ == "__main__":
    main()
