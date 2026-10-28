# 정치인 DB (politicians)

공인(역대 국회의원 → 이후 지자체장·지방의원) 데이터베이스. 원본은 **사람별 JSON**, 분석용 SQLite는 언제든 재생성.

| 단계 | 어디서 | 언제 | 무엇 |
|---|---|---|---|
| `collect_assembly.py` | 회사 맥미니(`local/politicians/run_pol.sh`, launchd 02:50 KST) — 국회 API가 해외 IP 차단 | 매일 | 역대 의원 명단·사진·대수별 정당/지역구·경력, (키 있으면) 발의 법안 |
| `link_news.py` | GitHub Actions `politicians.yml` | 6시간마다 | NewsBoard 누적 뉴스 + 구글 뉴스 RSS를 인물에 연결, 사건 단계 자동 분류, 헤드라인 발언·단어 통계 |
| `build_sqlite.py` | 같은 워크플로 | 6시간마다 | `politicians.sqlite` 아티팩트(30일 보관) |
| 배포 | `collect.yml` 사이트 묶기 | 30분마다 | `politicians` 브랜치 → `/news/data/pol/`, 화면 `/news/politicians/` |

## 저장 구조 (`politicians` 브랜치)
```
index.json            목록(이름·정당·지역구·대수·사진·기사 수…)
people/<국회코드>.json  사람별 전체: terms(대수별 정당·지역구), party_switches(kind: switch|rename),
                      history(경력), bills(발의 통계·최근 법안), news(연결 기사), incidents(자동 분류), media(발언·단어), sources(출처·수집일)
bills_<대수>.json      법안 전체(키 필요)
feed.json             최근 새로 연결된 기사
```
## 원칙
- 모든 사실에 출처 URL·수집일. 사건 단계(의혹/수사/기소·재판/판결)는 **기사 제목 키워드 자동 분류**이며 유무죄 판단이 아님.
- 일반인·연예인은 수집하지 않음.

## 다른 PC에서 이어받기
`ASSEMBLY_KEY=… python scripts/politicians/collect_assembly.py pdata` (한국 IP) → `politicians` 브랜치에 push.
키 없이 돌리면 `seed_names.txt`(위키백과 역대 의원 목록에서 뽑은 이름)로 한 명씩 조회.
