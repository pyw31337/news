#!/usr/bin/env python3
"""수집 회차의 실행·품질 증거를 data 브랜치에 추가 전용으로 기록한다.

화면용 요약 수치와 분리된 운영 원장이다. 데이터가 없거나 단계가 실행되지 않은
경우에도 성공으로 추정하지 않고 unknown/pending으로 남긴다.
"""
import datetime as dt
import hashlib
import json
import os
import platform
import sys
from pathlib import Path

KST = dt.timezone(dt.timedelta(hours=9))
UTC = dt.timezone.utc


def read_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError, TypeError):
        return default


def digest(path):
    if not path.is_file():
        return None
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def diag_summary(data):
    if not isinstance(data, dict):
        return {"status": "unknown", "ok": 0, "fail": 0, "errors": 0}
    ok = sum(int(v or 0) for v in (data.get("ok") or {}).values())
    fail = sum(int(v or 0) for v in (data.get("fail") or {}).values())
    errors = len(data.get("errors") or [])
    # 원본 산출물이 남아 있어도 일부 원천/AI 단계가 실패할 수 있다.
    # 전체 회차를 실패로 뭉개지 않고 degraded로 남겨 수집 성공과 부분 오류를 함께 보존한다.
    return {"status": "degraded" if fail or errors else "success", "ok": ok, "fail": fail, "errors": errors}


def stage(name, diag, artifact):
    s = diag_summary(diag)
    if s["status"] == "unknown" and not artifact:
        s["status"] = "unknown"
    elif s["status"] == "unknown":
        s["status"] = "observed"
    s["artifact"] = artifact
    return s


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "data").resolve()
    publish_complete = "--publish-complete" in sys.argv[2:]
    root.mkdir(parents=True, exist_ok=True)
    now = dt.datetime.now(UTC)
    today = read_json(root / "today.json", {}) or {}
    global_data = read_json(root / "global.json", {}) or {}
    quality = read_json(root / "quality.json", {}) or {}
    event_quality = read_json(root / "event_quality.json", {}) or {}
    status = read_json(root / "status.json", {}) or {}

    run_id = os.environ.get("GITHUB_RUN_ID") or f"local-{now.strftime('%Y%m%dT%H%M%SZ')}"
    if publish_complete:
        latest_path = root / "observability/latest.json"
        latest = read_json(latest_path, {}) or {}
        if latest:
            latest.setdefault("stages", {})["publish"] = {
                "status": "success",
                "published_at": now.isoformat(timespec="seconds"),
                "data_commit": os.environ.get("DATA_COMMIT"),
                "note": "data 브랜치 커밋 이후 게시 확인",
            }
            latest["publish_verified_at"] = now.isoformat(timespec="seconds")
            latest_path.write_text(json.dumps(latest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(json.dumps({"run_id": latest.get("run_id"), "publish": latest["stages"]["publish"]}, ensure_ascii=False))
            return
    issues = today.get("issues") or []
    sources = sum(len(i.get("sources") or []) for i in issues if isinstance(i, dict))
    entities = today.get("entities") or []
    diag = {name: read_json(root / f"diag_{name}.json") for name in ("collect", "enrich", "global", "db", "briefs", "official", "naver")}
    artifacts = {
        "today": digest(root / "today.json"),
        "global": digest(root / "global.json"),
        "quality": digest(root / "quality.json"),
        "status": digest(root / "status.json"),
        "event_quality": digest(root / "event_quality.json"),
    }
    event = {
        "run_id": str(run_id),
        "observed_at": now.isoformat(timespec="seconds"),
        "observed_at_kst": now.astimezone(KST).isoformat(timespec="seconds"),
        "source": "github_actions" if os.environ.get("GITHUB_ACTIONS") else "local_runner",
        "workflow": os.environ.get("GITHUB_WORKFLOW") or "local-newsboard",
        "commit": os.environ.get("GITHUB_SHA"),
        "host": platform.node() if not os.environ.get("GITHUB_ACTIONS") else "github-actions",
        "stages": {
            "collect": stage("collect", diag.get("collect"), bool(today)),
            "analyze": stage("analyze", diag.get("enrich"), bool(today.get("llm") or global_data)),
            "quality": {
                "status": "success" if quality or event_quality else "unknown",
                "quality_issue_count": len(quality.get("issues") or []),
                "event_quality_present": bool(event_quality),
            },
            "publish": {"status": "pending", "note": "기록 시점에는 data 브랜치 커밋 전"},
        },
        "counts": {
            "issues": len(issues),
            "sources": sources,
            "entities": len(entities),
            "global_issues": len(global_data.get("issues") or []),
            "quality_issues": len(quality.get("issues") or []),
        },
        "artifacts": artifacts,
        "status_snapshot": {
            "updated": status.get("updated"),
            "error_count": len(status.get("errors") or []),
        },
    }
    out = root / "observability"
    out.mkdir(exist_ok=True)
    ledger = out / "runs.jsonl"
    with ledger.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n")
    lines = ledger.read_text(encoding="utf-8").splitlines()[-500:]
    ledger.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    (out / "latest.json").write_text(json.dumps(event, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"run_id": run_id, "stages": event["stages"], "counts": event["counts"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
