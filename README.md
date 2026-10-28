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
