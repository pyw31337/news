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
- 법률·기업 보강: `.github/workflows/legal.yml`(3시간)와 `.github/workflows/corporate.yml`(매일 04:30 KST)이 뉴스 배포와 분리된 후처리를 담당한다.
- 섹터별 현재량·속도·ETA: [`docs/COVERAGE_SIMULATION.md`](COVERAGE_SIMULATION.md)를 기준으로 보고한다.
- 법률 API 발급·연결: [`docs/LEGAL_API_SETUP.md`](LEGAL_API_SETUP.md)를 따른다. 키는 `LAW_OC`, `DATA_GO_KR_KEY` GitHub Secret으로만 관리한다.

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

보강 장치 신선도는 별도 `.github/workflows/macmini-watch.yml`가 매시 `reporters_local.json`과 `overlay/latest.json`의 heartbeat를 검사한다. 6시간부터 경고, 36시간부터 실패로 표시하며 원본은 삭제하지 않는다.

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
- 번역·이미지 누락은 `status.json`의 `global_translate`와 `global.json.images`를 원인과 함께 본다. 429/403/401/timeout은 재시도·백필 대상으로 남기며, 원문이 없거나 robots가 거부한 이미지는 성공으로 위장하지 않는다.
- 공개된 사건 품질 산출물은 사건별 품질 점수와 누락 단계를 표시한다. 예를 들어 세무사 에피소드의 `gaps`에 최초 합격 발표가 남아 있으면, 시스템은 이를 감추거나 임의 기사로 채우지 않고 편집 검토 대상으로 보낸다.

## 7. 다음 에이전트 체크리스트

- [ ] 이 문서와 `docs/AGENT_HANDOFF.md`, `AGENTS.md`, `docs/PEOPLE.md`를 읽었는가?
- [ ] 동일 파일을 다른 에이전트가 수정 중인지 확인했는가?
- [ ] 원문·출처·사진 라이선스가 검증된 데이터만 추가했는가?
- [ ] `event_quality`·품질 게이트·중복 후보를 확인했는가?
- [ ] `npm test`와 관련 스크립트 검사를 실행했는가?
- [ ] 커밋·워크플로 URL·남은 누락을 이 문서 또는 작업 로그에 남겼는가?

## 8. 다차원 온톨로지 지식망(v3) & 로테크 & 세렌디피티 & 파생 서비스(렛츠로·렛츠인슈) 인수인계 (2026-11-17)

### 8.1. 지식 자산 및 원장 데이터 명세
- `data/ontology_graph.json`:
  - **규모**: 총 노드 22,804개, 총 관계 에지 6,736개
  - **구성**: 기업 2,498개사, 인물 19,812명, 정재계 혈연·혼맥 852쌍, 학연 309개교, 사법연수원 6개 기수, 법조기관 43곳, 로테크 양형기준 6대 범죄군, 11대 커뮤니티, 14대 심층 멀티홉 크로싱
- `data/corporate_dossier.json` 및 `data/db/corps/*.json`:
  - KOSPI 813사 + KOSDAQ 1,687사 전수 색인 및 498개사 상세 공시 요약
  - 15대 핵심 대기업 15개년(2010~2024년) 재무 시계열(매출, 영업익, 순익, 자산, 부채, 마진, 부채비율), 임직원 고용 구조(정규직 비율, 평균 근속), 기업 일대기 중대 사건 블랙박스(창립, 상장, 사명 변천사, M&A, 분할합병), 역대 대표이사/CEO 일대기 계보
- `data/serendipity_insights.json`:
  - 2~3-hop 이상 떨어진 의외의 교차 관계망을 AI 그래프 탐색으로 전수 발굴한 23건의 인사이트 (HBM 반도체 공급망, 재벌 총수 일가 혼맥, 지역화폐 정책-기업 등)
- `data/lawtech/precedents_db.json`:
  - 독립 법률서비스 '렛츠로(Let’s Law)' 코어: 횡령·배임, 선거법, 자본시장법 시세조종, 중대재해처벌법, 뇌물수수, 위험운전치사상, 전세사기, 사이버명예훼손 등 15대 리딩 판례 전문 및 양형 이유
- `data/insu/policy_terms_db.json`:
  - 독립 보험상담 '렛츠인슈(Let’s Insu)' 코어: 4세대 실손의료비, 3대 질병(암·뇌·심장), 가족일상생활배상책임, 백내장, 운전자보험 등 7대 핵심 표준약관 및 KCD 질병코드 매핑, 대법원 판례·금감원 분쟁조정례 기반 부지급 방어 가이드
- `data/community/`:
  - 독립 커뮤니티 버즈 트래커 코어: 대한민국 11대 활성화 커뮤니티(블라인드, 보배드림, 더쿠, 인벤, SLR클럽, 디시인사이드, 에펨코리아, 뽐뿌, 오늘의유머, 클리앙, 루리웹) 전수 수집
  - `data/community/buzz_index.json`: 실시간 핫토픽 및 뉴스·기업 연계 버즈 색인
  - `data/community/sentiment_matrix.json`: 11대 채널별 여론 온도(-100~+100) 및 감성 상태
  - `data/community/posts/{community}_{date}.jsonl`: 일자별 원천 게시글 누적 보존 아카이브

### 8.2. 자동화 파이프라인 스크립트 체계
1. `scripts/ontology/knowledge_graph.py`: 전수 온톨로지 지식 그래프 v3 생성 및 연결망 빌더
2. `scripts/ontology/enrich_corps_15y.py`: 상장 대기업 15개년(2010~2024) 일대기 블랙박스(재무, 사건, 사명변천, CEO) 일괄 구축 엔진
3. `scripts/ontology/batch_corps_daemon.py`: DART 상장사 전수(2,498개사) 백그라운드 순차 수집 데몬
4. `scripts/ontology/relation_extractor.py`: 기사 및 공시 비정형 텍스트 기반 자율 관계 추출(NLP) 엔진
5. `scripts/ontology/serendipity_radar.py`: 오늘의 숨은 연결고리 레이더 탐색 엔진
6. `scripts/community/crawler_engine.py`: 11대 커뮤니티 전수 버즈 수집 및 감성 분석 엔진
7. `scripts/lawtech/expand_precedents.py`: 렛츠로 15대 리딩 판례 수집 및 상황 입력형 형량·집행유예 시뮬레이터
8. `scripts/insu/expand_insurance.py`: 렛츠인슈 7대 약관 수집 및 보험사 거절 논리 반박 가이드 엔진

### 8.3. 프론트엔드 연동 및 UI 개발 규칙
- **엔티티 링크 통일**: `assets/nbp/lib.js`의 `href.e(k)` 및 `href.g(k)`를 사용하여 모든 인물, 기업, 학교, 기수 칩이 상호 이동 가능하도록 구현 (`/e/?k=...`).
- **2-Hop 멀티홉 횡단 경로 표출**: `/e/?k=...` 진입 시 `[현재 엔티티] ➔ [1-Hop 노드] ➔ [2-Hop 노드]` 형태의 시각적 체인을 제공하여 데이터 간 자유로운 점프를 보장.
- **15개년 기업 일대기 블랙박스 타임라인**: 기업 상세 페이지 조회 시 15개년(2010~2024) 재무 시계열 바 차트, 창립~현재까지의 중대 사건 변곡점 타임라인, 사명 변천사, 역대 대표이사 계보를 시각화 도표로 표출.
- **11대 커뮤니티 민심 여론 모니터**: `admin/#pipeline`에서 11대 커뮤니티의 여론 온도 매트릭스와 실시간 뉴스 연계 버즈를 한눈에 관제.
- **로테크 양형기준 카드**: 형사/선거/기업 리스크 엔티티의 경우 대법원 양형위원회의 기본 권고형량, 가중/감경 영역, 집행유예율, 당선무효/임원결격 위험도를 배지와 게이지로 표출.

### 8.4. 독립 서비스 분화 아키텍처 원칙 (Separation of Concerns)
- **원칙**: 렛츠로(Let's Law), 렛츠인슈(Let's Insu), 커뮤니티 버즈 트래커는 **뉴스보드의 주된 컨텐츠가 아니며**, 추후 개별적으로 독립 분화될 예정임.
- **데이터 저장소 격리 원칙**:
  1. `data/lawtech/`: 뉴스보드 코어와 완전 분리된 독립 법률서비스 원장. 판례, 양형기준, 법조인 인맥망만 독자적으로 보존.
  2. `data/insu/`: 뉴스보드 코어와 완전 분리된 독립 보험상담서비스 원장. 전 보험사 표준약관, KCD 질병코드, 분쟁조정례만 독자적으로 보존.
  3. `data/community/`: 뉴스보드 코어와 완전 분리된 독립 커뮤니티 여론 원장. 11대 커뮤니티의 일자별 원천 글(`posts/*.jsonl`) 및 버즈 색인 보존.
  4. 뉴스보드 메인(`today.json`, `ontology_graph.json`)에는 이들 독립 서비스를 연결하는 가벼운 링크/참조(Reference)만 유지하여, 향후 독립 도메인/별도 앱으로 분리 배포 시 즉각 1초 분리가 가능하도록 설계됨.

마지막 갱신 시에는 날짜(KST), 커밋 SHA, 확인한 workflow run ID, 남은 품질 누락을 기록한다. “완료”라는 말은 코드가 커밋됐다는 뜻이 아니라, 원장 보존·분석 산출물·품질 검증·배포 확인까지 끝났다는 뜻으로만 사용한다.

### 8.5. v2 배포·공공데이터 엔드포인트 주의사항 (2026-11-17)
- v2 Pages 배포는 `corporate_dossier.json`, `db/corps/*.json`, `ontology_graph.json`, `serendipity_insights.json`, `lawtech/precedents_db.json`, `insu/policy_terms_db.json`을 **존재할 때만** `_site/data`로 복사한다. 원장이 아직 생성되지 않은 회차에는 해당 UI 모듈을 숨기며 합성 데이터를 만들지 않는다.
- `.github/workflows/ontology.yml`이 data 브랜치의 기업·인물 원장을 바탕으로 온톨로지 그래프 → 증거 기반 관계 추출 → 세렌디피티 레이더 → 렛츠로·렛츠인슈 파생 원장을 순서대로 생성한다.
- `DATA_GO_KR_KEY`는 국가법령정보 공동활용(법제처 `LAW_OC`)을 대체하는 필수 키가 아니다. 법령·판례·헌재·법령해석·행정심판 핵심 수집은 `LAW_OC`로 동작하며, data.go.kr 화면의 “제공처 바로가기” 항목은 별도 신청 엔드포인트가 없는 공개 안내/미러인 경우가 많다. 따라서 현재 추가 등록할 필요가 없고, 실제 사용할 보조 API URL·서비스가 확인될 때만 `legal/v1/state.json`의 `dgk_endpoints`에 등록한다.
