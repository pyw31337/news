# newsboard-sync (Cloudflare Worker + D1)

- 주소: https://newsboard-sync.pyw213.workers.dev (상태 확인: /health)
- D1: newsboard-sync · R2: newsboard-backup (매일 04:10 KST `d1/YYYY-MM-DD.json.gz`, 30일 보관)
- 백업 2중: ① D1 Time Travel(무료 7일 되돌리기: `wrangler d1 time-travel restore newsboard-sync --timestamp=...`) ② R2 일일 내보내기
- 저장하는 것: 불투명 ID(HMAC), 제공자 연결표, 세션 해시, 내 서재 JSON. 이메일·이름·프로필 사진은 받지 않음.
- 배포: `npx wrangler deploy` (이 폴더), 스키마: `npx wrangler d1 execute newsboard-sync --remote --file schema.sql`

## Google 로그인 켜기
1. https://console.cloud.google.com 접속 → 위쪽 프로젝트 선택 → **새 프로젝트** → 이름 `NewsBoard` → 만들기
2. 왼쪽 메뉴 **API 및 서비스 → OAuth 동의 화면**(Google 인증 플랫폼) → 시작하기
   - 앱 이름 `NewsBoard`, 사용자 지원 이메일 선택 → 대상 **외부** → 연락처 이메일 입력 → 만들기
   - **데이터 액세스**: 범위 추가 없이 그대로(openid만 사용)
   - **대상 → 앱 게시** 눌러 '프로덕션'으로(테스트 상태면 등록한 계정만 로그인 가능)
3. **클라이언트 → 클라이언트 만들기** → 유형 **웹 애플리케이션**, 이름 `NewsBoard Web`
   - 승인된 JavaScript 원본: `https://pyw31337.github.io`
   - 승인된 리디렉션 URI: `https://newsboard-sync.pyw213.workers.dev/auth/google/callback`
   - 만들기 → **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 복사
4. 두 값을 전달(또는 직접 `npx wrangler secret put GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`)

## 카카오 로그인 켜기
1. https://developers.kakao.com 로그인 → **내 애플리케이션 → 애플리케이션 추가하기** → 앱 이름 `NewsBoard`, 회사명(개인 이름 가능), 카테고리 '뉴스' → 저장
2. **앱 설정 → 플랫폼 → Web 플랫폼 등록** → 사이트 도메인 `https://pyw31337.github.io`
3. **제품 설정 → 카카오 로그인** → 활성화 설정 **ON**
   - **Redirect URI 등록**: `https://newsboard-sync.pyw213.workers.dev/auth/kakao/callback`
4. **제품 설정 → 카카오 로그인 → 동의항목**: 아무것도 켜지 않아도 됨(회원번호만 사용, 닉네임·이메일 불필요)
5. **앱 설정 → 앱 키**에서 **REST API 키** 복사
6. (권장) **제품 설정 → 카카오 로그인 → 보안 → Client Secret** 코드 생성 후 활성화 **사용함** → 코드 복사
7. 값 전달(또는 `npx wrangler secret put KAKAO_REST_KEY` / `KAKAO_CLIENT_SECRET`)

값이 들어가면 사이트 '내 서재'에 로그인 버튼이 자동으로 나타납니다(코드 수정·재배포 불필요).

## 네이버 로그인 켜기
네이버 Developers의 로그인 API에서 콜백 URL을 `https://newsboard-sync.pyw213.workers.dev/auth/naver/callback`으로 등록하고, Worker 비밀값 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 넣습니다. 연결된 구글·카카오 계정이 있는 사용자는 내 서재의 **연결하기**에서 네이버 로그인을 추가할 수 있으며, 제공자 고유번호는 HMAC으로 가린 값만 저장됩니다.
