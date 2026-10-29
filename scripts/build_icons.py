"""아이콘 라이브러리 빌드: assets/icons.svg(스프라이트) + assets/icons.json(목록) + assets/icons.js(주입·헬퍼).
원본 SVG는 Tabler Icons(MIT, @tabler/icons) / Lucide(ISC, 국회 1개). 사용법: docs/icons.md
python3 scripts/build_icons.py /path/to/@tabler/icons /path/to/lucide-static
"""
import json, re, sys, os, hashlib
TB, LU = sys.argv[1], sys.argv[2]
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# (한국어 이름, tabler 이름, 변형 o/f, 용도, 출처 user=사용자가 보낸 것 / tabler=부족해서 Tabler에서 보충)
L = []
def add(src, use, *items):
    for k, n, v in items: L.append(dict(ko=k, tabler=n, variant=v, use=use, src=src))
U, T = 'user', 'tabler'
# --- 하단 메뉴·상단 (t46u~t47u, 요약만 전달돼 Tabler 원본으로 복원) ---
add(T, '하단 메뉴·상단 내비', ('타임라인 오프','timeline-event','o'),('타임라인 온','timeline-event','f'),('마켓 오프','chart-candle','o'),('마켓 온','chart-candle','f'),
    ('오늘 오프','news','o'),('오늘 온','file-text','f'),('내 서재 오프','bookmarks','o'),('내 서재 온','bookmarks','f'),('메뉴 오프','menu-2','o'),('메뉴 온','menu-2','f'),
    ('홈 오프','home','o'),('홈 온','home','f'),('배우기 오프','school','o'),('배우기 온','school','f'),('정치인 오프','building-bank','o'),('라이브','broadcast','o'))
add(T, '알림', ('알림 오프','bell','o'),('알림 온','bell','f'),('알림 울림 오프','bell-ringing','o'),('알림 울림 온','bell-ringing','f'),('알림 추가 오프','bell-plus','o'),('알림 추가 온','bell-plus','f'),('알림 끄기 오프','bell-x','o'),('알림 끄기 온','bell-x','f'))
add(T, '설정·검색·공유', ('설정 오프','settings','o'),('설정 온','settings','f'),('검색','search','o'),('사람 검색','user-search','o'),('공유','share','o'),('링크 오프','link','o'),('닫기','x','o'),('추가','plus','o'),('위','chevron-up','o'),('아래','chevron-down','o'),('왼쪽','chevron-left','o'),('오른쪽','chevron-right','o'),('편집','pencil','o'),('삭제','trash','o'),('바깥 링크','external-link','o'))
add(T, '카테고리 뱃지', ('IT','device-laptop','o'),('스포츠','ball-football','o'),('연예','movie','o'),('사회','users-group','o'),('경제','chart-arrows-vertical','o'),('세계 날씨·특보','cloud-storm','o'),('트로피','trophy','o'),('체크','circle-check','o'),('엑스','circle-x','o'),('반복','repeat','o'),('번개','bolt','o'),('메달','medal','o'),('공장 일반','building-factory','o'),('물','droplet','o'),('전구','bulb','o'),('배','ship','o'),('로켓','rocket','o'),('장보기','shopping-cart','o'),('일하는 사람','user-cog','o'),('달러','currency-dollar','o'),('엔','currency-yen','o'),('유로','currency-euro','o'),('원화','currency-won','o'),('핀','pin','o'),('문서','file-description','o'),('파티','confetti','o'),('엄지 위 오프','thumb-up','o'),('엄지 위 온','thumb-up','f'),('엄지 아래 오프','thumb-down','o'),('엄지 아래 온','thumb-down','f'),('유튜브','brand-youtube','o'),('은행','building-bank','o'))
# --- t48u ---
add(U, '검색 종류', ('문서 검색','report-search','o'),('위치 검색','map-pin-search','o'),('날짜 검색','calendar-search','o'))
add(U, '기사·언론사·댓글', ('기사 오프','file-text','o'),('기사 온','file-text','f'),('언론사','news','o'),('댓글 오프','message-2','o'),('댓글 온','message-2','f'))
add(T, '화제·시간·북마크·차트 (t48u 가운데, 복원)', ('화제 오프','flame','o'),('화제 온','flame','f'),('시간 오프','clock','o'),('시간 온','clock','f'),('북마크 오프','bookmark','o'),('북마크 온','bookmark','f'),
    ('좋아요 오프','heart','o'),('좋아요 온','heart','f'),('즐겨찾기 오프','star','o'),('즐겨찾기 온','star','f'),('그래프','chart-line','o'),('막대 차트','chart-bar','o'),('원 차트 오프','chart-pie','o'),('원 차트 온','chart-pie','f'),
    ('상승','trending-up','o'),('하락','trending-down','o'),('상승 화살표','caret-up','f'),('하락 화살표','caret-down','f'),('돈','cash','o'),('코인','coin','o'),('배우기 책 오프','book','o'),('배우기 책 온','book','f'))
add(T, '상대 시간(N시 방향)', *[(f'{h}시','clock-hour-%d'%h,'o') for h in range(1,13)])
add(U, '돈·카드·기업', ('돈 추가','cash-banknote-plus','o'),('돈2','cash-coin','o'),('카드 오프','credit-card','o'),('카드 온','credit-card','f'),('기업','building','o'),('기업 추가','building-plus','o'),('기업 제거','building-minus','o'))
# --- t49u ---
add(U, '기업·장소', ('기업 삭제','building-off','o'),('기업 설정','building-cog','o'),('아파트 집','building-community','o'),('부동산','building-skyscraper','o'),('공항','building-airport','o'),('놀이공원','building-carousel','o'),('공장','building-factory-2','o'))
add(T, '장소·관계·AI·주의·사진·화살표·확대·메모 (t49u 가운데, 복원)', ('장소 오프','map-pin','o'),('장소 온','map-pin','f'),('인물 오프','user','o'),('인물 온','user','f'),('사람들','users','o'),('기관','building-bank','o'),
    ('관계 오프','affiliate','o'),('관계 온','affiliate','f'),('관계도','hierarchy-3','o'),('관계망','topology-star-3','o'),('AI 오프','sparkles','o'),('AI 온','sparkles','f'),('AI 생성 이미지','photo-ai','o'),('AI 작성 텍스트','file-text-ai','o'),('AI','ai','o'),
    ('주의 오프','alert-triangle','o'),('주의 온','alert-triangle','f'),('정보 오프','info-circle','o'),('정보 온','info-circle','f'),('사진 오프','photo','o'),('사진 온','photo','f'),
    ('이전','arrow-left','o'),('다음','arrow-right','o'),('오른쪽 위','arrow-up-right','o'),('확대','zoom-in','o'),('축소','zoom-out','o'),('메모','notes','o'),('그룹 오프','folder','o'),('그룹 온','folder','f'),('그룹 추가','folder-plus','o'))
add(U, '폴더(컬렉션)', ('그룹 열기 오프','folder-open','o'),('그룹 열기 온','folder-open','f'),('그룹 복사 오프','folders','o'),('그룹 복사 온','folders','f'),('그룹 설정','folder-cog','o'),('그룹 내려받기','folder-down','o'),('그룹 좋아요','folder-heart','o'))
# --- t50u (전체 전달됨) ---
add(U, '폴더(컬렉션)', ('그룹 위치','folder-pin','o'),('그룹 검색','folder-search','o'),('그룹 즐겨찾기','folder-star','o'),('그룹 업로드','folder-up','o'))
add(U, '배우기', ('퀴즈 오프','help-hexagon','o'),('퀴즈 온','help-hexagon','f'),('만화 오프','boom','o'),('만화 온','boom','f'),('연속','arrow-autofit-content','o'),('카드뉴스 오프','cards','o'),('카드뉴스 온','cards','f'))
add(U, '아카이브·국회', ('지난','history','o'),('국회','lucide:landmark','o'))
add(U, '민심(댓글 여론)', ('민심 좋아요 오프','mood-smile','o'),('민심 좋아요 온','mood-smile','f'),('민심 행복 오프','mood-happy','o'),('민심 행복 온','mood-happy','f'),('민심 화나요 오프','mood-angry','o'),('민심 화나요 온','mood-angry','f'),
    ('민심 중간 오프','mood-empty','o'),('민심 중간 온','mood-empty','f'),('민심 슬퍼요 오프','mood-sad','o'),('민심 슬퍼요 온','mood-sad','f'))
add(U, '영상', ('영상 오프','video','o'),('영상 온','video','f'),('영상 차단','video-off','o'),('영상 삭제 오프','video-minus','o'),('영상 삭제 온','video-minus','f'),('영상 추가 오프','video-plus','o'),('영상 추가 온','video-plus','f'),('미디어','photo-video','o'))
add(U, '계정', ('로그인 오프','lock','o'),('로그인 온','lock','f'),('로그인 차단','lock-cancel','o'),('계정찾기','lock-search','o'),('로그아웃','lock-open-2','o'),('로그인 설정','lock-cog','o'))
add(U, '동기화·국가', ('동기화 오프','cloud-data-connection','o'),('동기화 온','cloud-data-connection','f'),('국가전환','world-cog','o'),('국가 추가','world-plus','o'),('국가 검색','world-search','o'),('국가 제거','world-minus','o'),
    ('국가 좋아요','world-heart','o'),('국가 즐겨찾기','world-star','o'),('국가 온','world','f'),('국가 오프','world','o'))

def body(name, v):
    if name.startswith('lucide:'):
        p = f'{LU}/icons/{name[7:]}.svg'
    else:
        p = f'{TB}/icons/{"outline" if v=="o" else "filled"}/{name}.svg'
    s = open(p).read()
    return re.sub(r'\s+', ' ', re.search(r'>\s*(.*)</svg>', s, re.S).group(1)).replace('> <', '><').strip()

sym, seen, out = [], {}, []
for e in L:
    sid = ('i-' + e['tabler'].replace('lucide:', '')) + ('-f' if e['variant'] == 'f' else '')
    b = body(e['tabler'], e['variant'])
    e['id'] = sid; e['style'] = 'filled' if e['variant'] == 'f' else 'outline'
    base = re.sub(r' ?(오프|온)$', '', e['ko'])
    if re.search(r'(오프|온)$', e['ko']):
        e['pair'] = base; e['state'] = 'off' if e['ko'].endswith('오프') else 'on'
    if sid not in seen:
        seen[sid] = e
        a = 'fill="currentColor" stroke="none"' if e['variant'] == 'f' else 'fill="none" stroke-linecap="round" stroke-linejoin="round"'
        sym.append(f'<symbol id="{sid}" viewBox="0 0 24 24" {a}>{b}</symbol>')
    else:
        seen[sid].setdefault('aliases', []).append(e['ko']); continue
    out.append({k: e[k] for k in ('id','ko','tabler','style','pair','state','use','src','aliases') if k in e})
for o in out:
    if 'aliases' not in seen[o['id']]: continue
    o['aliases'] = seen[o['id']]['aliases']
sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n<!-- Tabler Icons (MIT, tabler.io) · lucide landmark (ISC) -->\n' + '\n'.join(sym) + '\n</svg>\n'
open(f'{R}/assets/icons.svg', 'w').write(sprite)
json.dump({'version': 1, 'license': 'Tabler Icons MIT © Paweł Kuna · Lucide ISC (landmark)', 'count': len(out), 'icons': out}, open(f'{R}/assets/icons.json', 'w'), ensure_ascii=False, indent=1)
js = open(f'{R}/assets/icons.src.js').read().replace('__SPRITE__', json.dumps(sprite.replace('\n', '')))
open(f'{R}/assets/icons.js', 'w').write(js)
print(len(out), 'icons', len(sprite)//1024, 'KB')
