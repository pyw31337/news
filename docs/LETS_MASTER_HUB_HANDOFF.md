# Lets Master Control Hub 관제 연계

뉴스보드는 수집·분석 원장을 소유하지만, 서비스 전체의 자동화 장치 관제는 `pyw31337/lets`가 담당한다.

- 관제 기획/데이터 계약: [`MASTER_HUB_OBSERVABILITY_PLAN.md`](https://github.com/pyw31337/lets/blob/main/docs/MASTER_HUB_OBSERVABILITY_PLAN.md)
- 현재 스냅샷: `lets/data/master_ecosystem_pulse.json`
- 원장 수집과 관제 집계는 분리한다. 뉴스보드의 실행 결과는 계획량이 아니라 실제 run event, 원장 행 수, 검증 수, 공개 수로 보고해야 한다.
- 새 수집기를 추가할 때는 뉴스보드 원장을 직접 통계로 덮지 말고 `device_id`, `run_id`, `observed`, `verified`, `published`를 남긴다.
- 장치·서비스 수, 수집량, 분석량이 문서와 스냅샷에서 다르면 `lets/scripts/audit_master_pulse.py`로 먼저 진단한다.

InSu·Law·People·Asset·Art의 개별 화면 디자인은 원장 수집이 우선이며, 통합 관제에서는 서비스별 실행 상태와 품질 지표만 노출한다.
