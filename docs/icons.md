# NewsBoard 아이콘 사용 안내 (icons v1)

## 무엇이 있나
- `assets/icons.svg` — 모든 아이콘을 `<symbol id="i-…">`로 담은 스프라이트 (207개, 중복 제거)
- `assets/icons.json` — 목록: `id`, 한국어 이름(`ko`), Tabler 원래 이름, `style`(outline/filled), 켜짐/꺼짐 짝(`pair`, `state`), 쓰는 곳(`use`), 출처(`src`: user=직접 보내준 것, tabler=부족해서 Tabler에서 보충)
- `assets/icons.js` — 스프라이트를 페이지에 한 번 넣고 `NBI()`/`NBU()` 함수를 제공 (모든 페이지에서 다른 스크립트보다 먼저 로드)
- `assets/icons.html` — 아이콘 모음(검색 가능한 갤러리)
- 다시 만들기: `npm pack @tabler/icons lucide-static` 후 `python3 scripts/build_icons.py <tabler>/package <lucide>/package`
- 라이선스: Tabler Icons MIT (© Paweł Kuna), 국회 아이콘만 Lucide `landmark` (ISC). 소개 화면(메뉴 → NewsBoard 소개)에 표기.

## 규칙
1. **외곽선 = 꺼짐/기본, 채움 = 켜짐/선택됨.** 채움 아이콘은 id 끝에 `-f`.
2. 한 쌍은 `NBI('bell',1)`처럼 쓰면 두 모양이 같이 들어가고, 부모 요소(또는 svg)에 `.on` 클래스나 `aria-pressed="true"`가 붙으면 자동으로 채움으로 바뀜. 하단 메뉴·좋아요·스크랩·컬렉션 탭이 이렇게 동작.
3. 색은 `currentColor` — 글자색을 따라감. 크기는 `.ico`(1em). 굵기는 기본 2, CSS `stroke-width`로 조절.
4. 이모지·글자 기호(▲▼✕→👍 등)는 쓰지 않고 아이콘으로 씀. 문장 속 설명용 화살표(툴팁 텍스트)만 예외.

## 코드
```js
NBI('search')            // 외곽선 하나
NBI('heart',1)           // 꺼짐/켜짐 쌍 (부모 .on 이면 채움)
NBI('flame',1,'on')      // 항상 켜진 모양
ic('fire')               // app.js 기존 별칭(IC 표) — 내부적으로 스프라이트 사용
```
HTML에서 바로: `<svg class="ico" viewBox="0 0 24 24"><use href="#i-world"/></svg>`

## 어디에 무엇을
| 자리 | 아이콘 |
|---|---|
| 하단 메뉴 타임라인·마켓·오늘·내 서재·메뉴 | timeline-event · chart-candle · file-text · bookmarks · menu-2 (모두 쌍, 선택 탭은 채움) |
| 상단 알림 | bell (쌍), 새 알림 bell-ringing, 키워드 알림 추가/끄기 bell-plus / bell-x |
| 설정·검색 | settings, search / 문서·위치·날짜·사람·그룹·국가 검색: report-search, map-pin-search, calendar-search, user-search, folder-search, world-search |
| 카테고리 | 정치 landmark(국회), 경제 chart-arrows-vertical, 사회 users-group, 세계 world, IT device-laptop, 연예 movie, 스포츠 ball-football |
| 기사·언론사·댓글 | file-text(쌍) · news · message-2(쌍) |
| 화제도·급상승 | flame (쌍, 화제도 칩·연속 기록은 채움) |
| 시간 | 상대 시간("3시간 전")은 **그 보도 시각의 시침 방향** clock-hour-1…12, 일반 시간 clock |
| 지난 이슈·아카이브·인물사 | history |
| 증시 등락 | caret-up-f / caret-down-f (숫자 옆), 설명엔 trending-up / trending-down, 그래프 chart-line·chart-bar·chart-pie |
| 돈·기업·부동산 | cash, cash-coin, cash-banknote-plus, coin, credit-card(쌍), building(+plus/minus/off/cog), building-community(아파트), building-skyscraper(부동산), building-factory-2, building-bank(기관·은행), 통화 currency-dollar/yen/euro/won |
| 장소·인물·기관 | map-pin(쌍), user(쌍), users, building-bank, building-airport, building-carousel |
| 관계맵·관계도 | affiliate(쌍, 메뉴·섹션 제목), hierarchy-3(가계·조직), topology-star-3(관계망) |
| AI 표시 | AI 요약/해석 글 = **file-text-ai** ("AI 요약" 뱃지), AI가 만든 그림 = **photo-ai**, AI 기능 일반 = sparkles / ai |
| 민심(댓글 여론) | 공감/비공감 비율로 mood-happy(≥70%) · mood-smile(≥55%) · mood-empty(45~55%) · mood-sad(≥30%) · mood-angry(<30%) 채움 아이콘 + "민심" 라벨, 공감 수 thumb-up / thumb-down |
| 주의·정보 | alert-triangle(쌍, 편향·특보), info-circle(쌍, "이렇게 읽어요") |
| 사진·영상 | photo(쌍, 사진 +N장), photo-video(미디어), video(쌍)·video-plus/minus(쌍)·video-off |
| 라이트박스·카드 덱 | x(닫기), chevron-left/right(이전/다음), arrow-left/right(뒤로·"자세히"), zoom-in / zoom-out |
| 내 서재 | heart(쌍 좋아요), bookmark(쌍 스크랩), notes(메모), star(쌍 즐겨찾기), folder / folder-open / folders(쌍 컬렉션), folder-plus·cog·down·up·heart·pin·search·star |
| 배우기 | help-hexagon(쌍 퀴즈), boom(쌍 4컷 만화), cards(쌍 카드뉴스), arrow-autofit-content(연속), school, bolt(XP), medal(레벨) |
| 계정·동기화 | lock(쌍 로그인), lock-open-2(로그아웃), lock-cancel, lock-search(계정 찾기), lock-cog, cloud-data-connection(쌍 동기화) |
| 국내/해외 전환 | world(쌍), world-cog(전환 설정), world-plus/minus/heart/star |
| 인물 아카이브 타임라인 점 | 출생 confetti, 학업 school, 경력 building, 선거 circle-check, 공직 star-f, 정당 repeat, 수상 trophy, 가족 heart-f, 재산 currency-won, 의혹 alert-triangle, 판결 landmark, 보도 news |

## 아직 안 쓰는 아이콘 (다음에 붙일 곳)
- video 계열 → 영상 섹터가 생기면 탭/필터(켜짐=선택), 차단은 "영상 숨기기"
- lock 계열·cloud-data-connection → 로그인/기기 연결 화면 (지금은 계정 기능이 없음)
- world-plus/heart/star → 해외 관심 국가 팔로우
- folder-down/up → 컬렉션 내보내기/가져오기
- building-plus/minus → 관심 기업 추가/삭제 (마켓 즐겨찾기)
- calendar-search → 날짜 아카이브 날짜 고르기 버튼
