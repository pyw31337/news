# 로컬 실행 · 보존 우선 수집

GitHub Actions의 무료 실행량, API 무료 한도, 네트워크가 막혀도 수집 결과를 잃지 않기 위한 보조 수집기입니다. 각 회차는 먼저 로컬 `WORK` 폴더의 `data`·`media` Git 커밋 큐에 저장합니다. 원격 업로드가 실패해도 커밋을 지우거나 되돌리지 않으며, 다음 회차와 `sync_queue.sh` 실행 때 오래된 미전송분부터 재시도합니다.
1. `scripts/local/.env` 작성: `GH_TOKEN`, `GEMINI_API_KEY`, `LAW_OC`, `KAKAO_REST_KEY`, `YOUTUBE_API_KEY`, `CF_API_TOKEN` 등 (Actions secrets와 같은 이름).
2. (선택) Ollama 설치 후 `ollama pull qwen2.5:7b` — Gemini 키가 없거나 한도 초과 시 대체.
3. `bash scripts/local/run_all.sh` — 한 번 실행. 30분마다 돌리려면 crontab: `5,35 * * * * bash /path/news/scripts/local/run_all.sh >> ~/newsboard.log 2>&1`
4. 업로드만 재시도하려면 `bash scripts/local/sync_queue.sh "$WORK/data" data`를 실행합니다. 상태는 `$WORK/upload-queue/data.status`에 남습니다.

모든 수집기는 state 파일 체크포인트로 이어서 수집하며, 같은 항목을 두 번 넣지 않습니다. `WORK`를 삭제하지 않는 한 미전송 수집 결과도 보존됩니다.
