# 영우 님이 직접 신청할 API 안내 (2026-10-29 확인)

> 모두 **무료**예요. 위에서부터 순서대로 하시면 돼요. 받은 값은 채팅에 그대로 붙여 넣지 마시고, 제가 띄워 드리는 **비밀값 입력 카드**에 넣어 주세요. (값은 GitHub·Cloudflare 비밀 저장소에만 들어가요.)
> 우리 서비스 주소: 사이트 `https://pyw31337.github.io` · 로그인 서버 `https://newsboard-sync.pyw213.workers.dev`

| 순서 | 플랫폼 | 어디에 쓰나 | 승인 | 돌려줄 값 |
|---|---|---|---|---|
| 1 | 국가법령정보 공동활용 (법제처) | 판례·헌재결정·법령해석 전문, 대법관·변호사 이름 | **자동 승인(즉시)** | API인증키(OC) |
| 2 | 공공데이터포털 | 헌법재판소 판례·사건 정보 | 개발계정 **자동 승인** | 없음 (키는 이미 등록됨, 신청만) |
| 3 | 카카오 디벨로퍼스 | 카카오 로그인 + 다음 검색(민심 보강) | 즉시 | REST API 키, 클라이언트 시크릿 |
| 4 | Google Cloud (로그인) | 구글 로그인 | 즉시(테스트 모드) | 클라이언트 ID, 클라이언트 보안 비밀번호 |
| 5 | Google Cloud (YouTube) | 이슈별 관련 영상 | 즉시 | API 키 |
| 6 | 빅카인즈 (한국언론진흥재단) | 1990년~ 과거 기사 | **심사(며칠~)**, 개인은 거절될 수 있음 | 이메일로 받은 API 키 |
| – | 네이버 개발자센터 | 뉴스 검색 | **이미 등록됨** | 할 일 없음 |
| – | 국회·DART·한국은행(ECOS)·공공데이터 키 | 정치인·공시·경제 지표 | **이미 등록됨** | 할 일 없음 |

---

## 1. 국가법령정보 공동활용 — OC 받기 (5분, 바로 사용)
1. https://open.law.go.kr 접속 → 오른쪽 위 **회원가입** (https://open.law.go.kr/LSO/usrJoin.do).
2. 약관 두 개 **동의** → 성명, 이메일(아이디), 비밀번호, 전화번호 입력, 사용자구분은 **개인**.
3. 같은 화면 아래 **OPEN API 신청정보**:
   - **API인증키(OC):** 영어 소문자+숫자로 직접 정해요. 예: `newsboardpyw`. (이게 돌려줄 값이에요)
   - **도메인주소:** `도메인 있음` → `pyw31337.github.io`
   - **서버 IP:** 비워 두세요. (수집 서버 IP가 매번 바뀌어요)
   - **활용 목적:** 꼭 문장으로 적어 주세요(비어 있거나 "ㅇㅇ"이면 승인이 취소돼요). 예시:
     `뉴스 이슈와 관련된 판례·헌법재판소 결정·법령을 함께 보여주는 비영리 뉴스 요약 서비스(NewsBoard)에서 판례 검색과 출처 표시에 활용합니다.`
   - **공동활용 법령종류:** **전체선택** 체크 (적어도 *판례, 헌재결정례, 법령해석례, 법령* 은 꼭).
4. 주의사항 두 개 **동의** → 신청. 화면에 "자동승인"이라고 나오면 끝이에요.
5. 확인: 로그인 → **마이페이지 → API인증키관리**에서 OC 값 확인.
- 돌려줄 값: **OC** → 제가 GitHub 비밀값 `LAW_OC`로 넣으면, 3시간마다 도는 법률 수집이 바로 판례를 받기 시작해요.
- 문의: 044-200-6797 (승인), 02-2109-6446 (기술)

## 2. 공공데이터포털 — 헌법재판소 API 활용신청 (각 2분)
이미 공공데이터포털 키(`DATA_GO_KR_KEY`)가 있어서 **새 키는 필요 없고, 서비스별 "활용신청"만** 누르면 돼요.
1. https://www.data.go.kr 로그인 (기존 계정).
2. 아래 두 페이지에서 각각 파란 **활용신청** 버튼:
   - 헌법재판소_판례정보 조회 서비스: https://www.data.go.kr/data/15141085/openapi.do
   - 헌법재판소_사건정보 조회 서비스: https://www.data.go.kr/data/15141079/openapi.do
3. 신청서: **활용목적** = `웹 사이트 개발` 선택, 내용에 `뉴스 이슈와 관련된 헌법재판소 결정 정보를 출처와 함께 보여주는 비영리 뉴스 서비스` → 라이선스 동의 → **활용신청**.
4. 개발계정은 **자동 승인**(하루 1,000건). **마이페이지 → 데이터활용 → Open API → 활용신청 현황**에서 '승인'이면 끝.
- 돌려줄 값: 없음. "신청했어요"라고만 알려 주세요.

## 3. 카카오 디벨로퍼스 — 카카오 로그인 + 다음 검색 (10분)
> 2025.12 개편 후 메뉴 기준이에요. 리다이렉트 URI는 이제 **[앱] → [플랫폼 키] → [REST API 키]** 안에 있어요.
1. https://developers.kakao.com → 카카오 계정으로 로그인 → 처음이면 개발자 등록 동의.
2. 위쪽 **앱** → **앱 생성**: 앱 이름 `NewsBoard`, 회사명 `개인` (아이콘은 선택) → 저장.
3. 왼쪽 **[앱] → [플랫폼 키] → [REST API 키]** 클릭:
   - **리다이렉트 URI** 추가: `https://newsboard-sync.pyw213.workers.dev/auth/kakao/callback` (글자 하나도 다르면 안 돼요)
   - 같은 화면 **클라이언트 시크릿** 값을 복사 (기본으로 켜져 있어요).
   - 이 화면 맨 위 **REST API 키** 값도 복사.
4. 왼쪽 **[카카오 로그인] → [일반]**(또는 [사용 설정]) → 상태 **ON**.
5. **[카카오 로그인] → [동의항목]**: 아무것도 필수로 켜지 않아도 돼요(우리는 이름·이메일을 저장하지 않아요). 닉네임만 '선택 동의'로 두면 충분해요.
6. **[앱] → [멤버]**: 출시 전 테스트 단계에선 영우 님만 로그인돼요. 일반 공개하려면 [앱] → [일반]에서 앱을 '운영(라이브)'으로 전환하라는 안내가 나오면 따르면 돼요(비즈 앱 전환은 필요 없어요).
- 돌려줄 값: **REST API 키**, **클라이언트 시크릿** (→ Worker 비밀값 `KAKAO_REST_KEY`, `KAKAO_CLIENT_SECRET`. REST 키는 다음 검색 민심 보강에도 같이 써요)

## 4. Google 로그인 — OAuth 클라이언트 (15분)
1. https://console.cloud.google.com → 위쪽 프로젝트 선택 → **새 프로젝트** `NewsBoard` → 만들기.
2. 왼쪽 메뉴 **Google Auth Platform**(검색창에 "OAuth 동의" 입력해도 나와요) → **시작하기**:
   - 앱 이름 `NewsBoard`, 사용자 지원 이메일 = 본인 메일
   - 대상(User type): **외부**
   - 연락처 이메일 = 본인 메일 → 정책 동의 → 만들기
3. **브랜딩(Branding)** 탭: 승인된 도메인에 `pyw31337.github.io` 와 `newsboard-sync.pyw213.workers.dev` 추가, 홈페이지 `https://pyw31337.github.io/news/` → 저장.
4. **데이터 액세스(Data Access)**: 범위는 추가하지 않아도 돼요(기본 `openid`만 써요).
5. **대상(Audience)** 탭: 지금은 '테스트' 상태 → **테스트 사용자**에 본인 Gmail 추가. 모두에게 열 때 **앱 게시(Publish app)** 를 누르면 돼요(기본 범위만 써서 심사 없이 게시돼요).
6. **클라이언트(Clients)** 탭 → **클라이언트 만들기** → 애플리케이션 유형 **웹 애플리케이션**:
   - 승인된 JavaScript 원본: `https://pyw31337.github.io`
   - **승인된 리디렉션 URI:** `https://newsboard-sync.pyw213.workers.dev/auth/google/callback` (끝에 `/` 없이 정확히)
   - 만들기 → 뜨는 창의 **클라이언트 ID**, **클라이언트 보안 비밀번호** 복사 (비밀번호는 이때만 보여요. JSON 다운로드 버튼으로 저장해 두면 안전해요).
- 돌려줄 값: **클라이언트 ID**, **클라이언트 보안 비밀번호** (→ `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

## 5. YouTube Data API v3 — API 키 (5분, 4번과 같은 프로젝트)
1. https://console.cloud.google.com/apis/library 에서 `YouTube Data API v3` 검색 → **사용**.
2. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키**.
3. 만든 키 옆 **수정(키 제한)** → *API 제한사항*에서 **키 제한** → `YouTube Data API v3`만 체크 → 저장. (애플리케이션 제한은 '없음'. 수집 서버에서 쓰기 때문)
- 무료 한도: 하루 10,000단위, 그중 검색은 하루 100회(태평양 시간 자정 = 한국 오후 4~5시 초기화). 이슈 10개 × 하루 몇 번이면 충분해요.
- 돌려줄 값: **API 키** (→ `YOUTUBE_API_KEY`)

## 6. 빅카인즈 OPEN API — 심사 필요 (선택)
1. https://www.bigkinds.or.kr → **회원가입 → 일반 회원(14세 이상)** → 이메일 인증.
2. 로그인 → 메뉴 **빅카인즈 활용 → OPEN API 서비스** (https://www.bigkinds.or.kr/v4/openApi/index.do) → **신청하기**.
3. 신청서(양식 다운로드 후 작성 또는 온라인 입력):
   - 신청인 정보: 이름, 소속은 `개인(NewsBoard 운영)`, 연락처
   - 사용 목적: `반복되는 사회 이슈의 과거 보도 흐름(1990년~)을 타임라인으로 보여주는 비영리 뉴스 서비스`
   - 활용 계획: `기사 제목·날짜·언론사·키워드만 사용하고 본문은 저장·재배포하지 않으며 원문 링크로 연결`
   - 보안·관리: `API 키는 암호화된 비밀 저장소에만 보관, 수집 데이터는 서비스 내부 통계용`
4. 승인되면 이메일로 키와 매뉴얼이 와요. 개인 신청은 제한될 수 있어서, 거절되면 지금처럼 구글뉴스 기간 검색으로 계속 가요.
- 돌려줄 값: **API 키** (→ `BIGKINDS_KEY`)

---
### 이미 끝난 것 (할 일 없음)
네이버 개발자센터(`NAVER_CLIENT_ID/SECRET`), 공공데이터포털 키(`DATA_GO_KR_KEY`), 열린국회정보(`ASSEMBLY_KEY`), DART(`DART_API_KEY`), 한국은행 ECOS(`ECOS_API_KEY`), AI 요약(`LLM_API_KEY`), Cloudflare(박스에 로그인됨).

### 확인한 출처
- 법제처: https://open.law.go.kr/LSO/usrJoin.do (신청 시 자동승인, OC 직접 지정, 활용목적 필수), https://open.law.go.kr/LSO/usr/usrOcInfoMod.do
- 공공데이터포털: https://www.data.go.kr/data/15141085/openapi.do (개발 자동승인, 개발계정 1,000건)
- 카카오: https://developers.kakao.com/docs/ko/getting-started/app-key-migration , https://developers.kakao.com/docs/ko/kakaologin/prerequisite
- Google: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid , https://developers.google.com/identity/protocols/oauth2/web-server
- YouTube: https://developers.google.com/youtube/v3/getting-started , https://developers.google.com/youtube/v3/determine_quota_cost
- 빅카인즈: https://www.bigkinds.or.kr/v4/openApi/index.do
