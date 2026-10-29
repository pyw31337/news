# legal/v1 스키마 (독립 서비스로 분리 가능한 형태)
`legal` 브랜치 `legal/v1/` 아래에만 저장. 뉴스보드 다른 데이터와 섞지 않음. D1 사용 안 함.
- `index.json` 현황 숫자 · `runs.json` 회차별 출처 접속/추가 로그(최근 500) · `state.json` 증분 상태
- `news/cases/YYYY-MM.json.gz` 보도 기반 판결 사건: {id, src:'news', date, court, dept, judge, counsel[], charge, instance, sentenceMonths, suspended, acquitted, fine, change, guideType, guide[min,max 개월], reports, sources[]} — **기사 제목·당사자 이름 없음**. 성범죄는 날짜·법원·심급·출처만.
- `people/judges_from_news.json` {"이름|법원": {name, court, cases[url]}} (같은 이름+같은 법원만 동일인 취급) · `people/justices_wikidata.json` 대법관·헌법재판관 경력(CC0)
- `lawgo/{prec|detc|expc}/YYYY.json.gz` 국가법령정보센터 판례·헌재결정례·법령해석례: {id, meta(목록 행), summary(판시사항·요지 등), justices[], judges[], counsel[]} — 공식 비실명 처리본에서만 추출
- `datagokr/<서비스>/YYYY-MM-DD.json.gz` 공공데이터포털 원응답(승인된 서비스만, `state.json`의 `dgk_endpoints`로 등록)
- `press/<기관>.json` 대법원·헌재 보도자료 제목·링크 · `guide/sentencing.json` 양형기준 기본 영역
