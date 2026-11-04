# 4컷 만화 및 카드뉴스 AI 제작·품질 관리 프로토콜
(AI Content Creation & Quality Protocol)

> **목적:** Claude, Codex, Gemini, Grok, Grok-bot 등 여러 AI 에이전트가 협업하는 환경에서, **중복 생성 방지, 토큰 비용 최적화, 일관된 시각 품질(디자인 시스템)**을 보장하기 위한 공식 지침입니다. 실제 교대·재개 절차는 [EDITORIAL_RUNBOOK.md](EDITORIAL_RUNBOOK.md)를 따른다.

---

## 1. 현재 운영 구조 이해 (시스템 분리 원칙)

NewsBoard의 콘텐츠 제작은 **2단계 분리 구조**로 운영됩니다:

| 구분 | 무인 자동화 파이프라인 (GitHub Actions) | 대화형 AI 에이전트 (Claude/Gemini/Grok 등) |
|---|---|---|
| **실행 주체** | `scripts/fun.py` + `scripts/editorial_queue.py` (수집 뒤 실행) | 사용자 페어 프로그래밍 또는 일일 배치 세션 |
| **담당 영역** | 오늘의 기사 수집 $\rightarrow$ 퀴즈/만화 대본 텍스트 JSON 생성 | **고품질 비주얼 일러스트 이미지 생성** (`.jpg`/`.webp`) |
| **토큰 만료 시** | 무료 Gemini 한도 초과 시 내장 규칙(`rule`) 텍스트·큐로 자동 Fallback | `data/editorial/queue.json`을 읽은 다른 에이전트가 근거부터 이어받고, SVG 마스코트 모드는 계속 유지 |
| **비용** | 0원 (GitHub Free Runner + Gemini Free Tier) | 도구 사용 시에만 1일 1회 최소 호출 |

---

## 2. 중복 생성 방지 및 실행 시점 (Idempotency Rule)

어느 에이전트가 투입되더라도 **당일 이미 제작된 콘텐츠가 있다면 중복 생성하지 않습니다.**

### ① 1일 1회 생성 원칙 (00:00 ~ 24:00 KST)
- 하루에 생성하는 콘텐츠는 **4컷 만화 1건**, **카드뉴스 1건**으로 엄격히 제한합니다.

### ② 작업 전 사전 검사 (Idempotency Check)
에이전트는 이미지 생성 도구를 호출하기 전 반드시 아래를 확인합니다:
```python
today = "YYYY-MM-DD" # 한국 시간(KST) 기준 당일 날짜
# 1. assets/comics/today-*.jpg 존재 여부 확인
# 2. assets/cards/today-*.jpg 존재 여부 확인
# 3. data/fun.json 내 당일 date의 만화/카드뉴스가 이미 고화질 이미지(img)를 갖고 있는지 확인
```
- **이미 당일 이미지가 등록되어 있다면:** 신규 이미지 생성을 즉시 건너뛰고 기존 콘텐츠를 유지합니다.

---

## 3. 에이전트별 역할 및 Fallback 계층 (Tiered Fallback)

| 순위 | 에이전트 유형 | 담당 역할 |
|---|---|---|
| **Tier 1** | **이미지 도구 보유 에이전트**<br>(Antigravity Gemini, Grok 등) | • 당일 TOP 1 기사 선정<br>• 아래 표준 프롬프트로 고화질 일러스트 생성<br>• `assets/comics/`, `assets/cards/` 저장 및 `data/fun.json` 등록 |
| **Tier 2** | **텍스트 전용 에이전트**<br>(Claude, Codex 등) | • 이미지 생성 불가/토큰 만료 시 억지로 저화질 코드를 짜지 않음<br>• `data/fun.json`의 대본 문장 교정, 팩트 검증, 퀴즈 출제 고도화에 집중<br>• 이미지가 없는 항목은 프론트엔드가 내장 SVG 벡터 마스코트(보리·누리)로 자동 렌더링 |

---

## 4. 시각 스타일 표준 규격 (Unified Style Specification)

에이전트가 바뀌어도 화풍이 튀거나 이질감이 생기지 않도록 아래 프롬프트 표준을 엄격히 준수합니다.

### ① 4컷 만화 (4-Panel Webtoon Comic)
- **저장 위치:** `assets/comics/YYYY-MM-DD-<slug>.jpg` (또는 `.webp`)
- **화풍:** 현대 한국 웹툰 스타일 (Modern Korean Webtoon / Manhwa), 깔끔한 선화(Clean line art), 따뜻하고 세련된 배색.
- **포맷:** 세로형 4분할 컷 (1열 4행), 종횡비 약 1:2.
- **내러티브 4단계 구조:**
  1. **1컷 (발단/의문):** 이슈의 시작 또는 호기심을 유발하는 상황 (캐릭터가 놀라거나 질문).
  2. **2컷 (전개/배경):** 문제의 원인 또는 현황 설명 (연구실, 관제실, 도표 등 배경).
  3. **3컷 (핵심/반전):** 핵심 기술이나 사건의 핵심 팩트 시각화.
  4. **4컷 (결론/전망):** 긍정적인 해결책, 응원, 또는 미래 전망.
- **텍스트 주의사항:** AI 이미지 내부의 한글은 글자가 뭉개지기 쉬우므로, **이미지 내부에는 읽을 텍스트·말풍선을 넣지 않습니다.** 실제 대사는 `fun.json`의 `lines` 데이터로 관리하고 웹 오버레이 말풍선으로 렌더링합니다.

### ② 카드뉴스 (Card News)
- **저장 위치:** `assets/cards/YYYY-MM-DD-<slug>.jpg` (또는 `.webp`)
- **화풍:** 프리미엄 IT/시사 테크 매거진 커버 (Ultra-modern Tech Editorial / Infographic).
- **포맷:** 정사각형(1:1) 또는 4:3 비율의 고해상도 그래픽.
- **색상 팔레트:** 다크 네이비 (`#0f1630`) 베이스 + 일렉트릭 시안 (`#0aa5c8`) / 오렌지 포인트.
- **구성:** 복잡한 잡음 배제, 사건의 핵심 오브젝트(예: 슈퍼컴퓨터 서버, 우주 헬스케어 링, 반도체 웨이퍼) 중심의 시네마틱 렌더링.

---

## 5. 데이터 등록 규칙 (`data/fun.json`)

이미지를 생성한 후에는 반드시 `data/fun.json`에 아래와 같이 등록하여 '전체보기' 및 과거 기록 보관이 가능하도록 합니다:

```json
{
  "id": "c-space-health",
  "category": "과학",
  "headline": "보령, 우주 헬스케어 협력 확대…스카이랩스와 업무협약",
  "title": "우주에서 건강검진? 우주 헬스케어의 미래!",
  "img": "assets/comics/2026-11-03-space-healthcare.jpg",
  "date": "2026-11-03",
  "panels": [ ... ],
  "sources": [ ... ]
}
```

- 과거 콘텐츠는 삭제하지 않고 `comics` 및 `decks` 배열의 뒤쪽에 계속 누적 보존합니다.
- 프론트엔드(`assets/fun.js`)는 `img` 프로퍼티가 있으면 고화질 일러스트 썸네일을 표시하고, 없으면 SVG 마스코트로 자동 폴백합니다.
