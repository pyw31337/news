# 자동 품질·수집·분석 파이프라인

`scripts/event_quality.py`는 `today.json`과 날짜별 `archive/*.json`을 함께 읽어 사건 단위(`episode_id`)의 흐름을 만든다.

## 자동 처리

- 제목·본문·키워드·엔티티를 함께 비교해 공통 직업명만 겹치는 기사를 제외한다.
- 날짜별 대표 기사 하나만 남기고, 중복 후보 수를 기록한다.
- `합격 발표 → 만점·의혹 → 부인·법적 대응 → 인정·자수 → 수사·출석 → 후속 조치` 단계로 분류한다.
- 각 노드에 원문 URL, 매체, 수집 출처(`today.flow`/`archive`), confidence를 남긴다.
- 누락 단계, 근거 URL 비율, 중복 후보, 전체 품질 점수를 `continuity_quality`와 `data/event_quality.json`에 기록한다.
- 최초 단계가 확인되지 않으면 추정해서 채우지 않고 gap으로 표시한다.

## 실행 위치

- `collect.yml`: 수집·sanitize 직후 실행해 누적 데이터에 저장한다.
- `pages.yml`: 배포 직전에 다시 실행해 최신 공개 데이터가 같은 규칙으로 재구성되도록 한다.
- `editorial_queue.py`: continuity 품질이 낮거나 누락 단계가 많으면 제작 후보를 `needs_fact_review`로 낮춘다.

## 운영 지표

- 수집 완전성: 핵심 단계 수와 gap 수
- 분석 정밀도: 직접 관련 노드 비율
- 근거성: 원문 URL이 있는 노드 비율
- 중복률: 날짜별 중복 후보 수
- 게시 적합도: continuity quality와 editorial quality gate 통과율

이 구조는 원본 기사를 삭제하지 않는다. 문제가 있는 연결만 화면용 사건 흐름에서 제외하고, 원문과 archive는 계속 누적한다.
