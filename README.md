# NewsBoard — 오늘의 이슈 TOP10 + 인물·사건 타임라인

https://pyw31337.github.io/news/

## 구조
- `index.html`, `assets/` — 정적 프런트엔드 (모바일 우선, 1000px 이상 다단 레이아웃)
- `scripts/collect.py` — 수집·분석 파이프라인 (GitHub Actions가 매시간 실행)
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
- AI: 기본 GitHub Models `openai/gpt-4o-mini`(Actions의 GITHUB_TOKEN, 무료). 교체: 저장소 Variables `LLM_ENDPOINT`·`LLM_MODEL`, Secret `LLM_API_KEY` (OpenAI 호환 API·로컬 서버 모두 가능)
- AI 결과는 화면에 “AI 요약/자동 판단”으로 표시, 수집 자료에 없는 내용은 쓰지 않도록 지시. 편향 배지는 확신도 high일 때만 표시
