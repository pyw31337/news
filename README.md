# NewsBoard — 오늘의 이슈 TOP10 + 인물·사건 타임라인

https://pyw31337.github.io/news/

> **작업을 이어받는 에이전트는 먼저 [HANDOFF.md](HANDOFF.md)와 [docs/ROADMAP.md](docs/ROADMAP.md)를 읽으세요.** (목표·사용자 선호·구조·진행 중 작업·백로그·데이터 현황)

## 구조
- `index.html`, `assets/` — 정적 프런트엔드 (모바일 우선, 1000px 이상 다단 레이아웃)
- `scripts/collect.py` — 수집·분석 파이프라인 (GitHub Actions가 30분마다 실행)
- `data/today.json` — 오늘의 결과, `data/archive/YYYY-MM-DD.json` — 날짜별 TOP10, `data/entity_history.json` — 인물별 일자 화제도 누적

## 데이터 소스 (모두 무료·키 불필요)
1. 네이버 뉴스 언론사별 랭킹 (많이 본 뉴스 / 댓글 많은 뉴스) — 약 80개 언론사 × 5위
2. Google 뉴스 RSS — 주요 뉴스 + 정치·경제·세계·IT·연예·스포츠 섹션 (묶음 기사 수 = 보도량)
3. Google 트렌드 KR 일간 급상승 RSS — 검색 관심도
4. Google 뉴스 검색 RSS (`"이름" before:날짜`) — 인물·장소별 과거 기사 → 시대별 타임라인
5. 한국어 위키백과 REST 요약 — 프로필 카드·유형(인물/장소/기관) 판별

## 분석
- Kiwi 형태소 분석으로 제목 명사·고유명사 추출 → TF-IDF 코사인 유사도로 기사 묶기(이슈 클러스터)
- 화제도 = Σ(네이버 순위 가중치) + Σ(구글 묶음 기사 수) × 언론사 다양성 × 검색 급상승 보너스
- 요약 = 대표 기사의 리드문(og:description)에서 문장 단위 추출 (생성형 요약 아님)
- 고유명사 → 위키백과 매칭으로 인물/장소/기관 분류, 같은 기사·이슈 동시 등장으로 관계망 생성

수동 실행: Actions → collect-news → Run workflow

## v2 파이프라인 · 저장 구조
- 매시 7분: `collect.py`(이슈 TOP10·엔티티) → `enrich.py`(일자별 사건 흐름·댓글 여론·증시/원자재·오늘의 단어·과거 연계·AI 해석) → Pages 배포
- 매일 06:40 KST: 같은 과정 + AI 호출 예산 확대(심층 분석)
- **main 브랜치**: 코드·화면만. **data 브랜치**: 영구 누적 데이터
  - `archive/YYYY-MM-DD.json` 날짜별 TOP10 스냅샷(요약·여론 요약 포함), `archive/index.json`
  - `index/entities.json`, `index/keywords.json` 과거 이슈 색인 → 새 이슈와 공통 인물/키워드로 자동 연결(`issue.past`)
  - `entity_history.json` 인물·기관 일별 화제도, `llm_cache.json` AI 결과 캐시(중복 호출 방지)
  - `today.json`(3~4MB)은 커밋하지 않고 배포 산출물에만 포함 → 저장소 비대화 방지
- AI: GitHub Models는 2026-07-30 종료되어 사용 불가. 저장소 Secret `LLM_API_KEY`를 넣으면 기본 Google Gemini(`gemini-2.5-flash`, OpenAI 호환 엔드포인트, 무료 등급)로 동작. 교체: 저장소 Variables `LLM_ENDPOINT`·`LLM_MODEL`, Secret `LLM_API_KEY` (OpenAI 호환 API·로컬 서버 모두 가능)
- AI 결과는 화면에 “AI 요약/자동 판단”으로 표시, 수집 자료에 없는 내용은 쓰지 않도록 지시. 편향 배지는 확신도 high일 때만 표시

## v5 (2026-10-28)
- 주소에서 `#` 제거: `/news/issue/<id>`, `/news/entity/<이름>`, `/news/kw/<검색어>`, `/news/g/<id>`(해외). 예전 `#/…` 링크는 자동으로 바뀜.
- 수집 때 이슈·인물·검색어마다 정적 `index.html`을 만들고 og:title·description·image를 넣음(`scripts/build_pages.py`). 없는 경로는 `404.html`(앱 본체)이 처리.
- 이슈 ID는 대표 기사 URL 해시라서 순위가 바뀌어도 공유 링크가 유지됨. TOP 10에서 빠지면 안내문과 함께 오늘 화면을 보여줌.
- 상세 화면 공유 버튼: Web Share API, 안 되면 링크 복사.
- 앱 아이콘·대표 OG 이미지(1200×630): 렛츠뷰 아이콘과 같은 비율(오브젝트가 배경의 56%).
- `/news/admin/`: 관리자 대시보드(noindex). 브라우저 안에서만 확인하는 해시 잠금이고, 비밀번호 변경은 기기마다 따로 저장됨. 공개 데이터(`data/status.json`, 공개 GitHub API)만 보여줌.
- 맥미니: launchd `com.pyw31337.newsboard-ai`가 매일 03:30에 Apple 온디바이스 분석을 돌리고 결과를 data 브랜치 `overlay/`에 push.
