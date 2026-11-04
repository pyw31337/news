# ledger — 누적 원장(덮어쓰기·압축·삭제 금지)
- `manifest/raw/<source>/YYYY-MM.jsonl` R2에 올린 원본 스냅샷 목록(키, sha256, 크기, 파일별 해시)
- `manifest/analysis/YYYY-MM.jsonl` 맥미니 분석 결과 업로드 목록
- `analysis/` 맥미니 분석 결과(엔티티 표·일별 요약), 안정 ID로 병합·버전 표시
- `state/` 증분 처리용 체크포인트, `pending/` R2 업로드 실패분(다음 실행에서 재시도)
자세한 구조와 복구 방법: main 브랜치 `docs/DATA.md`
