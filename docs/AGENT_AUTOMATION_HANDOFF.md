# NewsBoard 자동화 공동 인수인계 계약

> 이 문서는 Codex, Claude, Gemini, Grok, 로컬 에이전트가 수집·분석·품질 자동화를 이어서 운영하기 위한 **단일 실행 계약**이다.
> 새 에이전트는 작업 전에 이 문서와 [`docs/DATA_CATALOG.md`](DATA_CATALOG.md), [`docs/AGENT_HANDOFF.md`](AGENT_HANDOFF.md)를 읽고, 작업 후 이 문서의 상태·로그·미해결 항목을 갱신한다.

## 1. 정본과 변경 원칙

- 코드 정본: `main` 브랜치
- 누적 원장 정본: `data` 브랜치 (`archive/`, `db/`, `runlog.json`, `status.json`, `stats*.json`)
- 미디어 정본: `media` 브랜치와 Cloudflare R2. 원본은 append-only이며 기존 파일을 덮어쓰지 않는다.
- 국회 원장: `politicians` 브랜치
- 과거 백필: `history` 브랜치
- 배포: `.github/workflows/pages.yml` → GitHub Pages
- 수집·분석: `.github/workflows/collect.yml` → 결과를 `data`/`media`에 커밋한 뒤 Pages를 호출한다.

같은 데이터를 여러 에이전트가 각자 재생성하지 않는다. 화면용 파일을 고칠 때 원장과 생성 스크립트의 관계를 먼저 확인하고, 수동 JSON을 정본처럼 커밋하지 않는다. 원문·사진·관계·경력은 출처가 없으면 비워 두며 추정으로 채우지 않는다.

## 2. 자동화 실행 순서 및 모듈 구성

### 2.1 정기 회차(`collect-news`) 실행 순서
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

### 2.2 심층 수집 및 지능 분석 모듈 (신규 통합)

다른 에이전트가 중복 구현하거나 덮어쓰지 않도록 신규 구축된 수집·분석 장비 명세를 명시한다.

| 모듈/엔진 | 스크립트 경로 | 정본 데이터 위치 | 주요 기능 및 산출물 | 화면 노출 위치 |
|---|---|---|---|---|
| **DART 기업 풀 히스토리 & 재무** | `scripts/corporate_dossier.py` | `data/corporate_dossier.json`, `data/db/corps/*.json` | 사명 변천사, 5개년 재무(매출/영업익/자산 시계열), 고용 구조(총원/성비/근속연수), 역대 대표이사 재직 라인업 | `/e/?k=<기업명>` (`assets/nbp/entity.js`) |
| **DART 임원 수집 & 정재계 교차분석** | `scripts/dart_executives.py`, `scripts/analyze/dart_network_analyzer.py` | `data/elite_network.json`, `data/people_bio.json` | 70개 상장사 임원 2,988명 추출, 대표이사 161명 등재, 기업인 ↔ 정치·공직 학연(서울대/금오공대 등)·지연 교차망 도출 | `/person/?id=<id>` 관계 섹터, `/admin/#pipeline` |
| **로테크 양형 예측 시뮬레이터** | `scripts/legal/sentencing_predictor.py` | 모듈 내 대법원 양형기준표 & 판례 1,200건 모델 | 선거법(허위사실), 특가법(뇌물), 특경법(횡령·배임) 감경/기본/가중 판정, 집행유예 확률 및 의원직 상실 가능성 산출 | `/admin/#pipeline` 실시간 인터랙티브 시뮬레이터 |
| **5대 커뮤니티 민심 여론 수집기** | `scripts/community_sentiment.py` | `data/community_sentiment.json` | 디시인사이드, 에펨코리아, 뽐뿌, 오늘의유머, 클리앙 여론 온도(-100~+100), 추천수, 댓글 반응 요약 | `/admin/#pipeline` 실시간 커뮤니티 모니터 |
| **발언 스탠스 변화 판별기** | `scripts/analyze/stance_analyzer.py` | 발언 타임라인 연동 | 시점별(과거/중간/현재) 입장 일관성/선회/강화 판별 및 인텔리전스 해설줄 생성 | `/person/?id=<id>` 발언비교 뱃지 (`assets/nbp/person.js`) |
| **월별 메타 브리핑 엔진** | 타임라인 클러스터링 | `data/archive/*.json` | 단순 기사 나열을 넘어선 월별 국면 전환 분석문 및 투명한 근거 기사 역추적 링크 | `/person/?id=<id>` 아카이브 (`assets/nbp/person.js`) |
| **수집·분석 종합 관제 화면** | 프론트엔드 라우터 | `admin/admin.js`, `admin/tabs.js` | 6대 수집 장비 + 6대 분석 엔진 가동 상태, 파이프라인 흐름도, 기업/양형/커뮤니티 인터랙티브 뷰어 | `/admin/#pipeline` (관리자 메뉴) |

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

## 6. 현재 운영 판정 (2026-11-17 14:00 KST)

- `collect.yml`은 30분 주기와 일일 심층 회차가 설정되어 정상 작동 중이다. 2026-11-17 13:42 KST 회차(`44018982176`) 및 `news-history`(`44017937402`)가 가동 중이며, 직전 회차 `44015347974`, `44012037278`, `44008482782`는 모두 성공했다.
- `og-thumbs.yml`은 13:48 KST에 최신 썸네일 검증 및 축적을 성공적으로 완료하여 `data` 브랜치에 커밋(`68072e325d`)되었다.
- `pages.yml`은 13:52 KST에 배포 완료(`44020081297`, HTTP 200)되었으며, `ledger.yml` 역시 13:55 KST 성공(`44020081300`)했다.
- `data` 브랜치는 13:20 KST(기자 63명 수집), 13:21 KST(국회·공공의정), 13:21 KST(인물 사진), 13:23 KST(뉴스 수집), 13:24 KST(DART 기업·양형·커뮤니티 여론 수집), 13:48 KST(OG 썸네일) 등 매 2~10분 간격으로 수집 데이터가 커밋·동기화되고 있다.
- 따라서 **수집·분석·품질 장치는 실시간으로 정상 작동 중**이다.
- 신규 구축된 6대 수집 장비와 6대 분석 엔진, 기업 DART 재무 도표, 양형 시뮬레이터, 커뮤니티 민심 모니터는 관리자 관제 화면(`https://pyw31337.github.io/news/admin/#pipeline`) 및 엔티티 상세 페이지(`/news/e/?k=<기업명>`)에서 실시간 확인 가능하다.
- `event_quality.py`와 `editorial_queue.py`가 매 수집 회차마다 기사의 연결성, 누락 단계, 직접 관련도를 채점하여 `data/event_quality.json`으로 배포한다. 누락 단계가 있는 이슈는 임의로 데이터를 합성하지 않고 `needs_fact_review` 플래그로 보호한다.

## 7. 다음 에이전트 체크리스트

- [ ] 이 문서와 `docs/AGENT_HANDOFF.md`, `AGENTS.md`, `docs/PEOPLE.md`를 읽었는가?
- [ ] 동일 파일을 다른 에이전트가 수정 중인지 확인했는가?
- [ ] 원문·출처·사진 라이선스가 검증된 데이터만 추가했는가?
- [ ] `event_quality`·품질 게이트·중복 후보를 확인했는가?
- [ ] `npm test`와 관련 스크립트 검사를 실행했는가?
- [ ] 커밋·워크플로 URL·남은 누락을 이 문서 또는 작업 로그에 남겼는가?

마지막 갱신 시에는 날짜(KST), 커밋 SHA, 확인한 workflow run ID, 남은 품질 누락을 기록한다. “완료”라는 말은 코드가 커밋됐다는 뜻이 아니라, 원장 보존·분석 산출물·품질 검증·배포 확인까지 끝났다는 뜻으로만 사용한다.
