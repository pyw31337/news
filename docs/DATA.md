# 데이터 보관 구조 (무손실 원장·R2 사진)
> 2026-11-11 작성. 코드: `scripts/ledger/{snapshot,archive,verify,put_file,r2}.py`, `scripts/local/analyze/analyze.py`, `scripts/media_r2.py`,
> 작업: `.github/workflows/ledger.yml`, `collect.yml`(사진 업로드), Worker `worker/src/index.js`(`/m/`, `/pub/put`, `/ledger/put`, `/ledger/list`).

## 1. 어디에 무엇이 있나
| 층 | 위치 | 쓰는 쪽 | 규칙 |
|---|---|---|---|
| 원본 스냅샷(raw) | R2 `ledger/raw/<출처>/YYYY/MM/DD/raw.<출처>.<시각>.<해시>.jsonl.gz` | `ledger.yml` snapshot(매시 :50 + 맥미니가 매시 :45 뒤 요청) | **추가 전용**: 같은 키가 있으면 Worker가 덮어쓰기 거부(같은 내용이면 200 dup, 다르면 409), 올릴 때 sha256 검증 |
| 큰 원본 판본 | R2 `ledger/raw/people-bio/…`, `ledger/raw/elite-network/…` | snapshot 단계 `put_file.py`(바뀐 날만) | 비공개(공개 경로 `pub/` 아님) |
| 분석 층(ana) | ledger 브랜치 `analysis/`(표 `tables/*.jsonl`, `daily/*.json`, `meta.json`) → R2 `ledger/ana/analysis/YYYY/MM/analysis.<날짜>.<해시>.tar.gz` | 맥미니 `analyze.py`(매시 :45) → `ledger.yml` archive(매일 03:30) | 표는 안정 id(기자·언론사·이슈·인물·키워드)로 병합, 바뀐 줄만 `v`·`updated` 갱신 |
| 목록·체크포인트 | ledger 브랜치 `manifest/raw/<출처>/YYYY-MM.jsonl`, `manifest/analysis*/`, `state/`, `pending/` | 위 작업들 | 목록은 줄 추가만. R2가 막히면 `pending/`에 보관 → 다음 실행이 먼저 다시 올림 |
| 무결성 점검 | ledger 브랜치 `state/verify.jsonl` | `ledger.yml` verify(매주 월 04:40) | 목록의 모든 R2 파일을 `/ledger/list`로 크기·sha256 대조. 빠짐·다름·48시간 넘은 대기열이 있으면 작업 실패(빨간 X) |
| 사진·썸네일 | R2 `pub/img/…`(기사 썸네일), `pub/ent/…`(인물·로고), `pub/pol/<국회id>.webp`(정치인 공식 사진) | `collect.yml` "사진 → Cloudflare R2"(새 파일만, 회당 7분) | 읽기 `https://newsboard-sync.pyw213.workers.dev/m/<키>` — Cloudflare CDN 1년 캐시(이름에 해시) |
| 사진 목록 | media 브랜치 `r2.json`(올린 파일·크기), `map.json`(원본 주소→파일), `ent/index.json` | 같은 단계 | R2에 올라간 파일은 media 브랜치에서 지움 → 브랜치에는 목록만 남음 |

## 2. 사이트가 사진을 읽는 법
- 수집기는 계속 `media/img/xx/해시.webp` 같은 상대 주소를 기록한다(자료 형식 그대로).
- 사이트를 묶을 때 `scripts/media_r2.py rewrite _site media`가 `_site/data/**/*.json`의 주소 중 `r2.json`에 있는 것만 Worker 주소로 바꾼다. 아직 못 올린 파일은 Pages에 그대로 실림(끊김 없음).
- 사진 출처 검사(`portrait_audit.py`, app.js `LOCAL_ENTITY_PORTRAIT`·`POL_PORTRAIT`)는 두 형식 모두 같은 파일로 인정한다.
- 썸네일 상한: `MEDIA_MAX_MB=4000`(R2 10GB 무료 중 사진 몫). 넘으면 오래 안 쓴 것부터 목록에서 빠짐(R2 파일은 남음).

## 3. 맥미니 (`~/Developer/newsboard-local`)
- LaunchAgent `com.pyw31337.newsboard-analyze`(매시 45분) → `analyze/analyze.py`, 로그 `~/Library/Logs/newsboard-analyze.log`.
- 체크포인트 `analyze/state.json`(처리한 원본 파일 크기 기록) → 꺼졌다 켜져도 이어서. 푸시 실패 시 로컬 커밋이 남아 다음에 같이 올라감.
- 로컬 모델(ollama `qwen2.5:3b`/`llama3.2:3b`)이 있으면 하루 4번 한 줄 요약, 없으면 규칙 결과만.
- 매 회 끝에 `gh workflow run ledger.yml -f task=snapshot`(03시는 `all`)을 요청 → GitHub 예약 실행이 건너뛰어져도 스냅샷이 빠지지 않음.

## 4. 복구
- 원본: `/ledger/list?prefix=raw/`(OIDC)로 목록 → R2 대시보드나 `wrangler r2 object get newsboard-backup/ledger/<키>`로 받음. 각 줄 `{"f": 파일, "kind", "sha", "data"}`.
- 분석: 최신 `ledger/ana/analysis/…tar.gz`를 풀면 ledger 브랜치 `analysis/` 그대로.
- 사진: `pub/` 아래 같은 경로. media 브랜치 `map.json`이 원본 주소 ↔ 파일 대응.
- 데이터 브랜치 전체: `backup.yml`이 매주 R2 `branches/`에 통째로(기존).

## 5. 비용(무료 한도)
- R2 10GB·쓰기 100만 회/월·읽기 1천만 회/월. 사진 첫 이전 약 1만 3천 회 쓰기, 이후 회당 수십 회. 읽기는 CDN 캐시가 대부분 받음.
- Worker 하루 10만 요청: 사진 읽기는 캐시 적중 시에도 Worker를 거치므로 방문이 크게 늘면 `/m/` 대신 R2 공개 도메인(대시보드에서 켜기)으로 바꿀 것.
- `/usage`는 R2 전체 목록을 훑음 → 파일이 5만 개를 넘으면 하위 요청 한도(50)에 걸릴 수 있음(그때 접두어별로 나눠 세기).
