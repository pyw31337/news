# NewsBoard 자동화 공동 인수인계 계약

> 이 문서는 Codex, Claude, Gemini, Grok, 로컬 에이전트가 수집·분석·품질 자동화를 이어서 운영하기 위한 **단일 실행 계약**이다.
> 새 에이전트는 작업 전에 이 문서와 [`docs/AGENT_HANDOFF.md`](AGENT_HANDOFF.md)를 읽고, 작업 후 이 문서의 상태·로그·미해결 항목을 갱신한다.

## 1. 정본과 변경 원칙

- 코드 정본: `main` 브랜치
- 누적 원장 정본: `data` 브랜치 (`archive/`, `db/`, `runlog.json`, `status.json`, `stats*.json`)
- 미디어 정본: `media` 브랜치와 Cloudflare R2. 원본은 append-only이며 기존 파일을 덮어쓰지 않는다.
- 국회 원장: `politicians` 브랜치
- 과거 백필: `history` 브랜치
- 배포: `.github/workflows/pages.yml` → GitHub Pages
- 수집·분석: `.github/workflows/collect.yml` → 결과를 `data`/`media`에 커밋한 뒤 Pages를 호출한다.

같은 데이터를 여러 에이전트가 각자 재생성하지 않는다. 화면용 파일을 고칠 때 원장과 생성 스크립트의 관계를 먼저 확인하고, 수동 JSON을 정본처럼 커밋하지 않는다. 원문·사진·관계·경력은 출처가 없으면 비워 두며 추정으로 채우지 않는다.

## 2. 자동화 실행 순서

`collect-news` 한 회차는 다음 순서를 따른다.

1. 원문 수집: `scripts/collect.py`, 해외·SNS·날씨·시장·공식통계 수집기
2. 엔티티·미디어: `entity_assets.py`, `portrait_audit.py`, `og_backfill.py`, `media_r2.py`
3. 분석·보강: `enrich.py`, `global_news.py`, `global_ai.py`, `people/mentions.py`, `people/collect_bio.py`
4. 누적 원장: `db.py`, `archive_extra.py`, `dedupe.py`, `people/*`
5. 정합성: `sanitize_today.py`
6. 사건 흐름: `event_quality.py` → `data/event_quality.json`
7. 품질 게이트: `quality.py`, `editorial_queue.py`
8. 운영 지표: `status.py`, `stats.py`, `stats_detail.py`
9. `data`·`media` 커밋 → Pages 빌드·배포

`event_quality.py`는 원본 기사를 삭제하지 않는다. 이슈별로 `continuity`, `continuity_quality`, 단계 누락, 직접 관련도, 중복 후보를 별도 산출한다. 품질 점수가 낮거나 시작 단계가 비면 `editorial_queue`가 `needs_fact_review`로 표시한다. 이 표시는 실패가 아니라 검토가 필요한 사실을 숨기지 않는 안전장치다.

## 3. 에이전트별 작업 경계

| 작업 | 허용 정본 | 금지 사항 |
|---|---|---|
| UI/접근성 | `index.html`, `assets/`, `v2/`, `docs/design-system.md` | 수집 JSON을 화면에서 임의 보정하지 않기 |
| 수집/분석 | `scripts/`, `.github/workflows/`, `data` 산출물 | 기존 원장 삭제·날조·출처 없는 합성 |
| 인물/관계 | `scripts/people/`, `docs/PEOPLE.md`, `politicians` | 이름만으로 동명이인 병합, 사생활 추정 |
| 사진/로고 | `portrait_*`, `wd_media.py`, R2/media | AI 얼굴·임의 로고·라이선스 없는 저장 |
| 품질 | `event_quality.py`, `quality.py`, `editorial_queue.py`, `docs/QUALITY.md` | 점수만 올리기 위해 근거·누락을 제거 |

작업을 시작할 때 `git fetch origin --prune`, `git status --short`, 최근 `git log --oneline -10`을 확인한다. 커밋 메시지에는 영역과 결과를 쓴다(예: `fix(quality): mark missing episode stages`). 동시 작업이 의심되면 먼저 최신 `main`을 fast-forward하고, 충돌을 수동 해결한 뒤 검증한다.

## 4. 상태 확인 명령

```bash
# 코드·워크플로
git fetch origin --prune
git status --short
gh run list --workflow collect.yml --limit 5
gh run list --workflow pages.yml --limit 3

# 공개 산출물
curl -fsSL https://pyw31337.github.io/news/data/status.json
curl -fsSL https://pyw31337.github.io/news/data/stats.json
curl -fsSL https://pyw31337.github.io/news/data/stats_detail.json
curl -fsSL https://pyw31337.github.io/news/data/event_quality.json

# 로컬 정적 검증
npm test
python3 -m py_compile scripts/event_quality.py scripts/quality.py scripts/editorial_queue.py
```

운영 판단은 화면이 아니라 `runlog.json`, `status.json`, 워크플로 로그, `event_quality.json`을 함께 본다. `today.json`은 최신 배포 스냅샷이고 누적량 판단은 `archive/`와 `db/`를 기준으로 한다.

## 5. 장애·재시작 절차

1. 실패한 회차의 `gh run view <id> --log-failed`를 저장하고, 실패 단계와 외부 API 응답을 기록한다.
2. 원장·미디어 브랜치에 이미 커밋된 산출물은 되돌리지 않는다. 다음 회차가 재시도하도록 원인만 수정한다.
3. 네트워크·무료 티어 한도 문제면 수집 속도를 낮추거나 로컬 큐/R2에 보관하고, 누락을 성공으로 표시하지 않는다.
4. 분석 단계가 실패해도 원문 수집과 원장 보존은 계속한다. `event_quality`의 `gaps`, `evidence_rate`, `duplicate_candidates`를 남긴다.
5. 복구 후 `npm test`, 해당 스크립트 문법 검사, 수동 workflow 1회, Pages HTTP 200을 확인한다.

## 6. 현재 운영 판정 (2026-11-17 KST)

- `collect.yml`은 30분 주기와 일일 심층 회차가 설정되어 있다. 2026-11-17 13:42 KST 수동 회차(`44018982176`)가 확인 시점에 `enrich` 단계로 실행 중이며, 직전 회차 `44015347974`, `44012037278`, `44008482782`, `44004906997`은 모두 성공했다.
- `pages.yml` 최근 성공 배포는 `44017094802`이며, `https://pyw31337.github.io/news/data/event_quality.json`이 HTTP 200으로 공개되고 있다.
- 따라서 **수집·분석·품질 장치는 작동 중**이다. 단, 실행 중인 회차는 완료 전까지 최종 성공으로 간주하지 않는다.
- 공개 운영 지표(13:22 KST 스냅샷)는 최근 24시간 수집 49회, TOP10 요약 100%, AI 분석 100%, 사건 흐름 100%, 분류 신뢰도 84.3%, 썸네일 80.9%, 언론사 로고 89.1%, 해외 번역 41.7%다. 낮은 번역·미디어 지표는 자동화가 멈춘 것이 아니라 외부 원문/이미지·번역 한도 또는 근거 부족으로 보류한 값이다.
- `status.json`의 Mac mini 보강 산출물은 마지막 갱신이 2026-11-13 17:01 KST(약 92시간 경과)다. 본 수집 파이프라인과 분리된 로컬 기자·인물 보강 장치이므로, 다음 점검에서 LaunchAgent 로그와 `reporters_local.json` 갱신 여부를 별도로 확인한다.
- 공개된 사건 품질 산출물은 사건별 품질 점수와 누락 단계를 표시한다. 예를 들어 세무사 에피소드의 `gaps`에 최초 합격 발표가 남아 있으면, 시스템은 이를 감추거나 임의 기사로 채우지 않고 편집 검토 대상으로 보낸다.

## 7. 다음 에이전트 체크리스트

- [ ] 이 문서와 `docs/AGENT_HANDOFF.md`, `AGENTS.md`, `docs/PEOPLE.md`를 읽었는가?
- [ ] 동일 파일을 다른 에이전트가 수정 중인지 확인했는가?
- [ ] 원문·출처·사진 라이선스가 검증된 데이터만 추가했는가?
- [ ] `event_quality`·품질 게이트·중복 후보를 확인했는가?
- [ ] `npm test`와 관련 스크립트 검사를 실행했는가?
- [ ] 커밋·워크플로 URL·남은 누락을 이 문서 또는 작업 로그에 남겼는가?

마지막 갱신 시에는 날짜(KST), 커밋 SHA, 확인한 workflow run ID, 남은 품질 누락을 기록한다. “완료”라는 말은 코드가 커밋됐다는 뜻이 아니라, 원장 보존·분석 산출물·품질 검증·배포 확인까지 끝났다는 뜻으로만 사용한다.
