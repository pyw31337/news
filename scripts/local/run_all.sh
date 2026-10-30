#!/usr/bin/env bash
# GitHub Actions가 멈췄을 때 개인 PC에서 같은 수집을 돌리는 스크립트.
# 필요: git, python3, (선택) Ollama. 환경변수는 scripts/local/.env 에 둡니다(깃에 올리지 마세요).
set -u; cd "$(dirname "$0")/../.."; ROOT=$PWD; W=${WORK:-$HOME/newsboard-work}; QUEUE_SYNC="$ROOT/scripts/local/sync_queue.sh"; mkdir -p "$W"
[ -f scripts/local/.env ] && set -a && . scripts/local/.env && set +a
# LLM: GEMINI_API_KEY 없으면 로컬 Ollama(OpenAI 호환 엔드포인트) 사용
export LLM_BASE_URL=${LLM_BASE_URL:-http://localhost:11434/v1} LLM_MODEL=${LLM_MODEL:-qwen2.5:7b}
clone(){ [ -d "$W/$2" ] || git clone -q --branch "$1" "https://x-access-token:${GH_TOKEN}@github.com/pyw31337/news.git" "$W/$2"; git -C "$W/$2" fetch -q origin "$1" 2>/dev/null || true; }
push(){ git -C "$W/$1" add -A; git -C "$W/$1" diff --cached --quiet || git -C "$W/$1" commit -qm "local: $1 $(date +%F_%H%M)"; "$QUEUE_SYNC" "$W/$1" "$1" || true; }
retry(){ for i in 1 2 3; do "$@" && return 0; sleep $((i*30)); done; echo "FAIL: $*"; }
clone data data; clone media media; clone legal lg; clone politicians pdata; clone history hist
ln -sfn "$W/data" data; ln -sfn "$W/media" media
# 이전 회차에서 원격 한도·네트워크 문제로 밀린 데이터부터 먼저 재전송한다.
"$QUEUE_SYNC" "$W/data" data || true; "$QUEUE_SYNC" "$W/media" media || true
retry python3 scripts/collect.py; retry python3 scripts/enrich.py; retry python3 scripts/naver.py
retry python3 scripts/voice.py; retry python3 scripts/db.py
push data; push media
retry python3 scripts/legal/collect.py "$W/lg" "$W/data/db/articles"; push lg
retry python3 scripts/politicians/collect_assembly.py "$W/pdata"; push pdata
retry python3 scripts/archive/build.py "$W/pdata" 400
echo "완료: $(date)"
