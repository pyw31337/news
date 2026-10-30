#!/bin/bash
# NewsBoard 로컬 새벽 분석(맥·리눅스 공용): 수집 + AI(애플 온디바이스/Ollama/API) → data 브랜치 overlay/ 업로드
set -u
B="${NB_HOME:-$HOME/Developer/newsboard-local}"; cd "$B" || exit 1
mkdir -p logs upload-queue; exec >> "$B/logs/run-$(date +%Y%m%d).log" 2>&1
echo "== start $(date)"
mkdir "$B/.lock" 2>/dev/null || { echo "already running"; exit 0; }
trap 'rmdir "$B/.lock"' EXIT
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
[ -f "$B/local.env" ] && set -a && . "$B/local.env" && set +a
R="${NB_REMOTE:-git@github-newsboard:pyw31337/news.git}"
[ -d news ] || git clone -q "$R" news
cd news || exit 1
# 작업 중인 소스나 수집 결과를 초기화하지 않는다. 원격 변경은 fast-forward일 때만 반영한다.
git fetch -q origin && git merge -q --ff-only origin/main || echo "source update deferred; local checkout retained"
# data는 절대 reset하지 않는다. 원격보다 앞선 로컬 커밋이 업로드 대기열이다.
if [ ! -d data ]; then git clone -q -b data "$R" data
elif [ ! -e data/.git ]; then echo "data가 Git 저장소가 아닙니다. 기존 데이터를 보호하기 위해 중단합니다."; exit 1
fi
queue_status(){
  { printf 'checked_at=%s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')"; printf 'head=%s\n' "$(git -C data rev-parse --short HEAD 2>/dev/null || true)"; printf 'pending_commits:\n'; git -C data log --oneline origin/data..HEAD 2>/dev/null || true; } > "$B/upload-queue/data.status"
}
sync_data(){
  git -C data add -A
  git -C data diff --cached --quiet || git -C data -c user.name="newsboard-$(hostname -s)" -c user.email=local@users.noreply.github.com commit -qm "local data: $(date '+%Y-%m-%d %H:%M') KST"
  git -C data fetch -q origin data || { echo "원격 확인 실패: 로컬 큐에 보존"; queue_status; return 1; }
  if ! git -C data merge-base --is-ancestor origin/data HEAD; then
    git -C data rebase -X theirs origin/data || { git -C data rebase --abort 2>/dev/null || true; echo "원격 충돌: 로컬 큐 유지"; queue_status; return 1; }
  fi
  for delay in 0 5 15; do
    [ "$delay" -eq 0 ] || sleep "$delay"
    git -C data push -q origin HEAD:data && { echo "data uploaded"; printf 'uploaded_at=%s\npending_commits=0\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" > "$B/upload-queue/data.status"; return 0; }
  done
  echo "업로드 보류: 다음 회차가 재시도"; queue_status; return 1
}
sync_data || true
PY="$B/venv/bin/python"
# 백엔드 고르기
BK="${LLM_BACKEND:-auto}"
if [ "$BK" = auto ]; then
  if [ -x "$B/bin/nbai" ] && "$B/bin/nbai" "OK라고만 답해" 5 </dev/null >/dev/null 2>&1; then BK=apple
  elif curl -s -m 3 http://127.0.0.1:11434/api/tags >/dev/null; then BK=ollama
  elif [ -n "${LLM_API_KEY:-}" ]; then BK=api; else BK=none; fi
fi
echo "backend: $BK"
case "$BK" in
  apple)  export LLM_BACKEND=apple NBAI="$B/bin/nbai" ;;
  ollama) export LLM_BACKEND=openai LLM_ENDPOINT=http://127.0.0.1:11434/v1/chat/completions LLM_MODEL="${OLLAMA_MODEL:-qwen2.5:3b}" LLM_API_KEY=ollama LLM_SMALL=1 ;;
  api)    export LLM_BACKEND=openai ;;
  *)      export LLM_BACKEND=openai LLM_API_KEY= ;;
esac
"$PY" scripts/collect.py > "$B/logs/collect.last.log" 2>&1 || { echo "collect failed"; sync_data || true; exit 1; }
# 원본 수집을 분석 결과와 분리하여 즉시 보존한다.
sync_data || true
# 번역·해외 데이터는 AI 심층 분석보다 먼저 갱신한다. 분석이 오래 걸려도 독자가 보는 뉴스는 지연되지 않는다.
"$PY" scripts/global_news.py > "$B/logs/global.last.log" 2>&1 || echo "global collect deferred"
sync_data || true
OVERLAY_WRITE=1 LLM_BUDGET=${LLM_BUDGET:-90} "$PY" scripts/enrich.py > "$B/logs/enrich.last.log" 2>&1 || { echo "enrich failed"; tail -5 "$B/logs/enrich.last.log"; sync_data || true; exit 1; }
tail -1 "$B/logs/enrich.last.log"
sync_data || true
find "$B/logs" -name 'run-*.log' -mtime +30 -delete; echo "== end $(date)"
