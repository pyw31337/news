#!/bin/bash
# NewsBoard 로컬 새벽 분석(맥·리눅스 공용): 수집 + AI(애플 온디바이스/Ollama/API) → data 브랜치 overlay/ 업로드
set -u
B="${NB_HOME:-$HOME/Developer/newsboard-local}"; cd "$B" || exit 1
mkdir -p logs; exec >> "$B/logs/run-$(date +%Y%m%d).log" 2>&1
echo "== start $(date)"
mkdir "$B/.lock" 2>/dev/null || { echo "already running"; exit 0; }
trap 'rmdir "$B/.lock"' EXIT
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
[ -f "$B/local.env" ] && set -a && . "$B/local.env" && set +a
R="${NB_REMOTE:-git@github-newsboard:pyw31337/news.git}"
[ -d news ] || git clone -q "$R" news
cd news && git fetch -q origin && git reset -q --hard origin/main
[ -d data/.git ] || { rm -rf data; git clone -q -b data "$R" data; }
git -C data fetch -q origin && git -C data reset -q --hard origin/data
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
"$PY" scripts/collect.py > "$B/logs/collect.last.log" 2>&1 || { echo "collect failed"; exit 1; }
OVERLAY_WRITE=1 LLM_BUDGET=${LLM_BUDGET:-90} "$PY" scripts/enrich.py > "$B/logs/enrich.last.log" 2>&1 || { echo "enrich failed"; tail -5 "$B/logs/enrich.last.log"; exit 1; }
tail -1 "$B/logs/enrich.last.log"
T=$(mktemp -d) && cp data/overlay/*.json "$T"/
cd data
for n in 1 2 3; do
  git fetch -q origin && git reset -q --hard origin/data && mkdir -p overlay && cp "$T"/*.json overlay/
  git add overlay && git -c user.name="newsboard-$(hostname -s)" -c user.email=local@users.noreply.github.com commit -qm "overlay: $(hostname -s) $(date '+%Y-%m-%d %H:%M')" || { echo "nothing to commit"; break; }
  git push -q origin HEAD:data && { echo "pushed"; break; }; sleep 20
done
rm -rf "$T"; find "$B/logs" -name 'run-*.log' -mtime +30 -delete; echo "== end $(date)"
