# 로컬 실행 (비상용)
GitHub Actions가 멈췄을 때만 사용합니다. 평소에는 Actions cron이 모두 자동으로 돌립니다.
1. `scripts/local/.env` 작성: `GH_TOKEN`, `GEMINI_API_KEY`, `LAW_OC`, `KAKAO_REST_KEY`, `YOUTUBE_API_KEY`, `CF_API_TOKEN` 등 (Actions secrets와 같은 이름).
2. (선택) Ollama 설치 후 `ollama pull qwen2.5:7b` — Gemini 키가 없거나 한도 초과 시 대체.
3. `bash scripts/local/run_all.sh` — 한 번 실행. 매시 돌리려면 crontab: `15 * * * * bash /path/news/scripts/local/run_all.sh >> ~/newsboard.log 2>&1`
모든 수집기는 state 파일 체크포인트로 이어서 수집하며, 같은 항목을 두 번 넣지 않습니다.
