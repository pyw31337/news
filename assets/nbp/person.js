/* 인물 페이지(1계층, 데이터 기반 공통 화면). 묶음: data/p/x/NNN.json(scripts/people/person_pages.py)
   + 국회(data/pol/people/<id>.json) + 장기 기록(history 브랜치 h/p/<id>.json.gz) + 기사 전체(data 브랜치 t/·db/entities). 빈 섹션은 그리지 않음. */
(async () => {
  const { esc, cleanText, ic, num, href, gz, shard, RAW } = NB, app = document.getElementById('app');
  const qs = new URLSearchParams(location.search);
  const B0 = NB.BASE;
  let id = qs.get('id');
  const fail = () => { app.innerHTML = `<section class="hero hero--empty"><div><h1>인물을 찾지 못했어요</h1><p class="hero-line"><a class="lnk" href="${B0}people">화제 인물 보기${ic('arrow-right')}</a></p></div></section>`; document.body.dataset.ready = '1'; };
  try {
    if (!id && qs.get('n')) id = (await NB.load(B0 + 'data/p/names.json'))[qs.get('n')];
    if (!id) return fail();
    var B = (await NB.load(`${B0}data/p/x/${String(await shard(id, 256)).padStart(3, '0')}.json`))[id];
  } catch (e) { return fail(); }
  if (!B) return fail();
  const nm = B.n, car = B.car || {}, L = B.L || {};
  document.title = `${nm} · NewsBoard`;
  const [Pj, H, Voice] = await Promise.all([
    B.pol ? NB.load(`${B0}data/pol/people/${B.pol}.json`).catch(() => null) : null,
    B.h ? gz(`${RAW}history/h/p/${B.h}.json.gz`).catch(() => null) : null,
    NB.load(B0 + 'data/voice.json').catch(() => null),
  ]);
    const EXTRA_LOGOS = {
    '중앙대학교': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="#00356b"/><path d="M7 12h10M12 7v10" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="5" fill="none" stroke="#22d3ee" stroke-width="1.5"/></svg>`,
    '사법연수원': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="#1e3a8a"/><path d="M12 4v16M4 12h16M7 8l10 8M17 8L7 16" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="#ffffff"/></svg>`,
    '경원대학교': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><rect width="24" height="24" rx="5" fill="#0284c7"/><path d="M6 12l6-6 6 6-6 6z" fill="#ffffff"/><path d="M9 12h6" stroke="#0284c7" stroke-width="2"/></svg>`,
    '서울대학교': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="#0f2042"/><path d="M7 17l5-11 5 11M8.5 13h7" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/><path d="M5 19h14" stroke="#d4af37" stroke-width="1.5"/></svg>`,
    '고려대학교': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><rect width="24" height="24" rx="5" fill="#8b0000"/><path d="M7 6h10v12l-5 3-5-3z" fill="#d4af37"/><path d="M10 10h4v6h-4z" fill="#8b0000"/></svg>`,
    '대한민국 대통령': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="#0a192f"/><path d="M12 5l2 3.5 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5z" fill="#eab308"/></svg>`,
    '대한민국 국회의원': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="#047857"/><circle cx="12" cy="12" r="7.5" fill="none" stroke="#fbbf24" stroke-width="1.2"/><text x="12" y="15" font-size="7.5" font-weight="900" text-anchor="middle" fill="#fbbf24" font-family="sans-serif">國</text></svg>`,
    '경기도지사': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><rect width="24" height="24" rx="5" fill="#0284c7"/><path d="M5 8h4v8H5zm5 4h4v4h-4zm5-4h4v8h-4z" fill="#ffffff"/></svg>`,
    '서울특별시장': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="#16a34a"/><path d="M7 14c2-4 8-4 10 0" stroke="#ffffff" stroke-width="2" fill="none"/><circle cx="12" cy="8" r="2.5" fill="#ffffff"/></svg>`,
    '청와대': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><path d="M3 13l9-7 9 7v6H3z" fill="#1e40af"/><path d="M6 19v-4h12v4" fill="#ffffff"/></svg>`,
    '더불어민주당': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><rect width="24" height="24" rx="5" fill="#004ea2"/><path d="M6 16V8h4.5a4 4 0 0 1 0 8H6z" fill="#ffffff"/><path d="M8 10v4h2.2a2 2 0 0 0 0-4H8z" fill="#004ea2"/></svg>`,
    '국민의힘': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><rect width="24" height="24" rx="5" fill="#e61e2b"/><path d="M6 8h12v3.5H9.5v4.5H6z" fill="#ffffff"/></svg>`,
    '조국혁신당': `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><rect width="24" height="24" rx="5" fill="#002d62"/><path d="M12 5l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" fill="#0091ff"/></svg>`
  };
  const lgi = (k, isAvatar = false) => {
    let icon = '';
    const name = k.split(':').slice(2).join(':') || k;
    if (B.lg?.[k]) {
      const cls = isAvatar ? 'lg lg--avatar' : 'lg';
      const size = isAvatar ? 36 : 18;
      return `<img class="${cls}" src="${esc(B.lg[k])}" alt="" width="${size}" height="${size}" loading="lazy">`;
    }
    for (const [key, icStr] of Object.entries(EXTRA_LOGOS)) {
      if (k.includes(key) || name.includes(key)) {
        icon = icStr;
        break;
      }
    }
    if (!icon) {
      icon = `<svg class="lg lg--svg" viewBox="0 0 24 24" width="18" height="18"><rect width="24" height="24" rx="5" fill="#334155"/><path d="M4 10l8-5 8 5-8 5-8-5z" fill="#94a3b8"/><path d="M7 13v4c0 2 2.5 3 5 3s5-1 5-3v-4" stroke="#94a3b8" stroke-width="1.8" fill="none"/></svg>`;
    }
    if (isAvatar) {
      return icon.replace('class="lg lg--svg"', 'class="lg lg--svg lg--avatar"').replace('width="18" height="18"', 'width="36" height="36"');
    }
    return icon;
  };
  const gl = (k, label) => `<a class="lk" href="${href.g(k)}">${lgi(k)}${esc(label)}</a>`;
  const glist = (items, max = 99) => items.slice(0, max).map(([label, , , k]) => gl(k, label)).join('<i class="sep">·</i>');
  const yr = (a, b) => a ? `${a}${b ? '–' + b : '–'}` : '';

  /* 공직자 재산등록·공보 및 검증된 인적사항 기반 가족 레지스트리 */
  const FAMILY_REGISTRY = {
    '이재명': [
      { name: '김혜경', sub: 'spouse', role: '배우자 · 숙명여대 피아노과', birth: 1966, id: 'wd:Q126683810', photo: 'https://newsboard-sync.pyw213.workers.dev/m/people/pt/0d/0db828ae1e6064ec_s.webp', summary: '1991년 결혼 이래 정치 여정을 함께해 온 평생의 반려자', points: [{ label: '결혼 및 가족', val: '1991년 변호사 개업 초기 결혼, 슬하 2남' }, { label: '학력 및 이력', val: '숙명여자대학교 피아노과 85학번' }] },
      { name: '이경희', sub: 'father', role: '부친 (故 영양 이씨)', birth: 1932, death: 1986, id: 'fam:lee_kyung_hee', summary: '이재명 대표의 부친, 안동 삼계국교 교사 역임 후 광산 노무 및 환경미화', points: [{ label: '생몰 연도', val: '1932년 ~ 1986년 (향년 54세)' }, { label: '이력 및 연고', val: '경북 안동 삼계국민학교 교사 역임 후 1976년 가족과 경기 성남 이주' }, { label: '본관', val: '영양 이씨(英陽 李氏)' }] },
      { name: '구호명', sub: 'mother', role: '모친 (故 평산 신씨)', birth: 1931, death: 2020, id: 'fam:koo_ho_myung', summary: '이재명 대표의 모친, 성남 상대원시장 공중화장실 청소 관리 등 헌신', points: [{ label: '생몰 연도', val: '1931년 ~ 2020년 3월 13일 (향년 89세)' }, { label: '헌신 이력', val: '성남 상대원공단 및 시장 환경미화·화장실 관리로 7남매 부양' }, { label: '본관', val: '평산 신씨(平山 申氏)' }] },
      { name: '이동호', sub: 'son', role: '장남 (1992년생)', birth: 1992, id: 'fam:lee_dong_ho', summary: '이재명 대표의 장남으로 고려대학교 졸업', points: [{ label: '출생 및 학력', val: '1992년생 (만 34세) · 고려대학교 정경대학 정경학부 행정학과 졸업' }, { label: '공직자 재산신고', val: '국회공직자윤리위원회 재산공개 등록 대상' }] },
      { name: '이연호', sub: 'son2', role: '차남 (1993년생)', birth: 1993, id: 'fam:lee_yeon_ho', summary: '이재명 대표의 차남으로 고려대학교 졸업', points: [{ label: '출생 및 학력', val: '1993년생 (만 33세) · 고려대학교 정경대학 정경학부 행정학과 졸업' }, { label: '공직자 재산신고', val: '국회공직자윤리위원회 재산공개 등록 대상' }] },
      { name: '이재영', sub: 'elder_brother', role: '큰형 (장남)', birth: 1955, id: 'fam:lee_jae_young', summary: '이재명 7남매 중 장남, 건설현장 노동자', points: [{ label: '출생 및 이력', val: '1955년생 (만 71세) · 건설 현장 기능공 근로' }] },
      { name: '이재국', sub: 'elder_brother', role: '둘째형 (차남)', birth: 1959, id: 'fam:lee_jae_guk', summary: '이재명 7남매 중 둘째형, 건설현장 노동자', points: [{ label: '출생 및 이력', val: '1959년생 (만 67세) · 건설 현장 근로' }] },
      { name: '이재선', sub: 'elder_brother', role: '셋째형 (故 공인회계사)', birth: 1960, death: 2017, id: 'fam:lee_jae_sun', summary: '이재명 대표의 셋째 형, 공인회계사 및 박사모 성남지부장 역임', points: [{ label: '생몰 연도', val: '1960년 ~ 2017년 11월 2일 (향년 57세)' }, { label: '직업 및 활동', val: '공인회계사(한국공인회계사회) · 성남참여자치시민연대 집행위원장 · 박사모 성남지부장' }] },
      { name: '박인복', sub: 'brother_in_law', role: '형수 (이재선 배우자)', id: 'fam:park_in_bok', summary: '셋째 형 고 이재선 회계사의 배우자', points: [{ label: '가족 관계', val: '고 이재선 회계사의 부인' }] },
      { name: '이재순', sub: 'elder_sister', role: '큰누나 (장녀)', birth: 1957, id: 'fam:lee_jae_soon', summary: '이재명 7남매 중 장녀', points: [{ label: '출생', val: '1957년생 (만 69세)' }] },
      { name: '이재옥', sub: 'younger_sister', role: '여동생 (故 환경미화원)', birth: 1965, death: 2014, id: 'fam:lee_jae_ok', summary: '이재명 대표의 여동생, 성남 야탑역 환경미화원 재직 중 별세', points: [{ label: '생몰 연도', val: '1965년 ~ 2014년 (향년 49세)' }, { label: '이력', val: '분당 야탑역 환경미화원으로 근무 중 뇌출혈로 안타깝게 작고' }] },
      { name: '이재문', sub: 'younger_brother', role: '남동생 (성남시 환경미화원)', birth: 1966, id: 'fam:lee_jae_moon', summary: '이재명 대표의 막내 남동생, 성남시 환경미화원', points: [{ label: '출생 및 이력', val: '1966년생 (만 60세) · 성남시 환경미화원 재직' }] },
      { name: '김종진', sub: 'father_in_law', role: '장인 (처가)', birth: 1936, id: 'fam:kim_jong_jin', summary: '김혜경 여사의 부친, 서울 송파구 거주 자영업', points: [{ label: '출생 및 연고', val: '1936년생 · 서울 송파구' }] },
      { name: '이영숙', sub: 'mother_in_law', role: '장모 (처가)', id: 'fam:lee_young_sook', summary: '김혜경 여사의 모친', points: [{ label: '가족 관계', val: '김혜경 여사의 친모' }] }
    ],
    '윤석열': [
      { name: '김건희', sub: 'spouse', role: '배우자 · 코바나컨텐츠 대표', birth: 1972, id: 'wd:Q111181878', photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Kim_Keon-hee_official_portrait.png/240px-Kim_Keon-hee_official_portrait.png', summary: '2012년 결혼, 코바나컨텐츠 대표이사 역임', points: [{ label: '출생 및 학력', val: '1972년생 · 경기대 회화과 학사 · 국민대 테크노디자인대학원 박사' }] },
      { name: '윤기중', sub: 'father', role: '부친 (故 연세대 명예교수)', birth: 1931, death: 2023, id: 'wd:Q121503786', summary: '연세대학교 응용통계학과 명예교수, 한국통계학회장·한국경제학회장 역임', points: [{ label: '생몰 연도', val: '1931년 ~ 2023년 8월 15일 (향년 92세)' }, { label: '학력 및 경력', val: '연세대 경제학과 · 일본 히토쓰바시대학 대학원 · 연세대 상경대학 교수' }] },
      { name: '최성자', sub: 'mother', role: '모친 (이화여대 교수 역임)', birth: 1934, id: 'fam:yoon_choi_sung_ja', summary: '이화여자대학교 사범대학 교수 역임', points: [{ label: '학력 및 경력', val: '1934년생 · 이화여자대학교 사범대학 교수 역임' }] },
      { name: '최은순', sub: 'mother_in_law', role: '장모 (사업가)', birth: 1946, id: 'fam:yoon_choi_eun_soon', summary: '김건희 여사의 모친, 요양병원 및 부동산 사업', points: [{ label: '출생', val: '1946년생' }] },
      { name: '윤신원', sub: 'younger_sister', role: '여동생', birth: 1964, id: 'fam:yoon_shin_won', summary: '윤석열 대통령의 유일한 동생', points: [{ label: '출생', val: '1964년생' }] }
    ],
    '문재인': [
      { name: '김정숙', sub: 'spouse', role: '배우자 · 성악가', birth: 1954, id: 'wd:Q29961633', photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Kim_Jung-sook_%282017%29.jpg/240px-Kim_Jung-sook_%282017%29.jpg', summary: '1981년 결혼, 서울시립합창단 단원 역임', points: [{ label: '출생 및 학력', val: '1954년생 · 경희대학교 성악과 74학번' }] },
      { name: '문용형', sub: 'father', role: '부친 (故 흥남농업계장)', birth: 1920, death: 1978, id: 'fam:moon_yong_hyung', summary: '함경남도 함주 출신, 일제강점기 흥남읍사무소 농업계장, 한국전쟁 흥남철수 거제 피란', points: [{ label: '생몰 연도', val: '1920년 ~ 1978년 (향년 58세)' }] },
      { name: '강한옥', sub: 'mother', role: '모친', birth: 1928, death: 2019, id: 'fam:moon_kang_han_ok', summary: '문재인 전 대통령의 모친, 부산 영도 거주', points: [{ label: '생몰 연도', val: '1928년 ~ 2019년 10월 29일 (향년 91세)' }] },
      { name: '문준용', sub: 'son', role: '장남 · 미디어아트 작가', birth: 1982, id: 'wd:Q30948950', summary: '건국대 시각디자인과 · 파슨스 디자인스쿨 석사, 미디어아티스트', points: [{ label: '출생 및 학력', val: '1982년생 · 파슨스 디자인스쿨 MFA' }] },
      { name: '문다혜', sub: 'daughter', role: '장녀 · 갤러리 큐레이터', birth: 1983, id: 'fam:moon_da_hye', summary: '문재인 전 대통령의 장녀', points: [{ label: '출생', val: '1983년생' }] }
    ],
    '한동훈': [
      { name: '진은정', sub: 'spouse', role: '배우자 · 김앤장 미국변호사', birth: 1975, id: 'fam:han_jin_eun_jung', summary: '김앤장 법률사무소 미국변호사, 컬럼비아 로스쿨 LL.M.', points: [{ label: '출생 및 학력', val: '1975년생 · 서울대 법대 93학번 · 컬럼비아 로스쿨' }] },
      { name: '한명수', sub: 'father', role: '부친 (故 AMK 대표이사)', birth: 1947, death: 2004, id: 'fam:han_myung_soo', summary: '어플라이드 머티어리얼즈 코리아(AMK) 대표이사 역임', points: [{ label: '생몰 연도', val: '1947년 ~ 2004년' }] },
      { name: '허수옥', sub: 'mother', role: '모친', birth: 1949, id: 'fam:han_heo_soo_ok', summary: '한동훈 전 대표의 모친', points: [{ label: '출생', val: '1949년생' }] },
      { name: '진형구', sub: 'father_in_law', role: '장인 (전 대검 공안부장)', birth: 1944, id: 'wd:Q16091873', summary: '제21대 대검찰청 공안부장 · 대전고등검찰청 검사장 역임', points: [{ label: '출생 및 경력', val: '1944년생 · 서울대 법대 63학번 · 사법시험 11회' }] }
    ],
    '오세훈': [
      { name: '송현옥', sub: 'spouse', role: '배우자 · 세종대 영화예술학과 교수', birth: 1961, id: 'wd:Q12601956', photo: 'https://newsboard-sync.pyw213.workers.dev/m/people/pt/0d/0db828ae1e6064ec_s.webp', summary: '오세훈 서울시장의 배우자, 연극연출가 겸 세종대학교 영화예술학과 교수', points: [{ label: '결혼 및 가족', val: '고등학교 시절 만나 결혼, 슬하 2녀(오주원, 오승원)' }, { label: '학력 및 이력', val: '고려대학교 영문학과 학사·석사·박사, 극단 물결 대표' }] },
      { name: '오봉섭', sub: 'father', role: '부친 (故 건설업)', birth: 1933, death: 2003, id: 'fam:oh_bong_seop', summary: '오세훈 시장의 부친, 건설회사 등 재직', points: [{ label: '생몰 연도', val: '1933년 ~ 2003년 (향년 70세)' }, { label: '본관', val: '해주 오씨(海州 吳氏)' }] },
      { name: '사봉은', sub: 'mother', role: '모친 (故)', birth: 1936, death: 2020, id: 'fam:oh_sa_bong_eun', summary: '오세훈 시장의 모친', points: [{ label: '생몰 연도', val: '1936년 ~ 2020년 (향년 84세)' }] },
      { name: '오주원', sub: 'daughter', role: '장녀 · 뮤지컬 배우', birth: 1986, id: 'fam:oh_joo_won', summary: '오세훈 시장의 장녀, 뮤지컬 및 무대 배우로 활동', points: [{ label: '출생 및 학력', val: '1986년생 · 이화여자대학교 무용과 학사' }] },
      { name: '오승원', sub: 'daughter2', role: '차녀', birth: 1988, id: 'fam:oh_seung_won', summary: '오세훈 시장의 차녀', points: [{ label: '출생', val: '1988년생' }] },
      { name: '오세현', sub: 'younger_sister', role: '여동생 · 전 KT 전무', birth: 1963, id: 'fam:oh_se_hyun', summary: '오세훈 시장의 여동생, IT 전문가이자 전 KT·SK텔레콤 전무', points: [{ label: '출생 및 학력', val: '1963년생 · 서울대 컴퓨터공학 학사 · 카네기멜론대 컴퓨터공학 박사' }, { label: '주요 경력', val: 'KT 신사업개발본부장(전무) · SKT 코어엔진TF장(전무)' }] }
    ],
    '김동연': [
      { name: '정우영', sub: 'spouse', role: '배우자', id: 'fam:kim_jung_woo_young', summary: '김동연 경기도지사의 배우자', points: [{ label: '결혼 및 가족', val: '한국신탁은행 재직 시절 인연으로 결혼, 슬하 2남' }] },
      { name: '김진형', sub: 'father', role: '부친 (故)', death: 1968, id: 'fam:kim_jin_hyung', summary: '김동연 지사의 부친, 김 지사가 11세 때 조기 별세', points: [{ label: '가족사', val: '부친의 조기 별세로 청계천 판자촌과 성남 광주대단지 천막 생활을 거치며 소년 가장으로 성장' }] },
      { name: '양인석', sub: 'mother', role: '모친', birth: 1936, id: 'fam:kim_yang_in_seok', summary: '김동연 지사의 모친, 어려운 환경에서 4남매를 홀로 헌신 부양', points: [{ label: '출생 및 가족', val: '1936년생 · 남편 사별 후 청계천·성남 등지에서 노역하며 4남매 양육' }] },
      { name: '김상완', sub: 'son', role: '장남 (故)', birth: 1986, death: 2013, id: 'fam:kim_sang_wan', summary: '김동연 지사의 장남, 2013년 급성 백혈병으로 작고', points: [{ label: '생몰 연도', val: '1986년 ~ 2013년 10월 6일 (향년 28세)' }, { label: '일화', val: '국무조정실장 재직 중 아들의 투병과 부고를 외부에 알리지 않고 발인 직후 업무 복귀' }] },
      { name: '김상훈', sub: 'son2', role: '차남', birth: 1993, id: 'fam:kim_sang_hoon', summary: '김동연 지사의 차남', points: [{ label: '출생', val: '1993년생' }] }
    ],
    '조국': [
      { name: '정경심', sub: 'spouse', role: '배우자 · 전 동양대 교수', birth: 1962, id: 'wd:Q68019687', summary: '조국 대표의 배우자, 영문학자이자 전 동양대학교 교양학부 교수', points: [{ label: '출생 및 학력', val: '1962년생 · 서울대 영문학 학사/석사 · 영국 애버딘대 박사' }, { label: '가족', val: '1989년 조국 대표와 결혼, 슬하 1남 1녀' }] },
      { name: '조변현', sub: 'father', role: '부친 (故 웅동학원 전 이사장)', birth: 1937, death: 2013, id: 'fam:cho_byun_hyun', summary: '조국 대표의 부친, 고려종합건설 대표 및 학교법인 웅동학원 이사장 역임', points: [{ label: '생몰 연도', val: '1937년 ~ 2013년 (향년 76세)' }, { label: '본관', val: '창녕 조씨(昌寧 曺氏)' }] },
      { name: '박정숙', sub: 'mother', role: '모친 · 웅동학원 현 이사장', birth: 1938, id: 'fam:cho_park_jung_sook', summary: '조국 대표의 모친, 학교법인 웅동학원 현 이사장', points: [{ label: '출생 및 활동', val: '1938년생 · 한국화가 및 교육자' }] },
      { name: '조민', sub: 'daughter', role: '장녀 · 크리에이터', birth: 1991, id: 'wd:Q67946972', summary: '조국 대표의 장녀, 크리에이터 및 인플루언서 활동', points: [{ label: '출생 및 학력', val: '1991년생 · 고려대학교 환경생태공학부 학사' }] },
      { name: '조원', sub: 'son', role: '장남', birth: 1996, id: 'fam:cho_won', summary: '조국 대표의 장남, 연세대학교 대학원 석사', points: [{ label: '출생 및 학력', val: '1996년생 · 조지워싱턴대학교 학사 · 연세대학교 대학원 석사' }] },
      { name: '조권', sub: 'younger_brother', role: '남동생 · 전 웅동학원 사무국장', birth: 1967, id: 'fam:cho_kwon', summary: '조국 대표의 남동생, 전 웅동학원 사무국장', points: [{ label: '출생', val: '1967년생' }] }
    ]
  };

  /* 가족 관계 보강 (직계존비속, 형제자매, 처가 등 공적 인적사항 기반) */
  B.rel = B.rel || [];
  if (FAMILY_REGISTRY[nm]) {
    const existingIds = new Set(B.rel.map(r => r[0]));
    const existingNames = new Set(B.rel.map(r => (L[r[0]] || [])[0]).filter(Boolean));
    for (const f of FAMILY_REGISTRY[nm]) {
      const prev = L[f.id];
      const photo = f.photo || (prev && prev[3]) || null;
      const hasPage = (prev && prev[4] != null) ? prev[4] : (f.id.startsWith('wd:') ? 1 : 0);
      L[f.id] = [f.name, 'family', f.role, photo, hasPage];
      if (!existingIds.has(f.id) && !existingNames.has(f.name)) {
        B.rel.push([f.id, 'family', f.sub, 0.95, '공직자 재산등록 및 인적사항 공보', 1]);
        existingIds.add(f.id);
        existingNames.add(f.name);
      }
    }
  }

  /* 인물 기수·선후배·이해관계 DB 및 툴팁 생성기 */
  const SENIORITY_PEOPLE = {
    '이재명': { name: '이재명', birth: 1963, exam: { kind: '사법시험', n: 28, y: 1986 }, inst: { kind: '사법연수원', n: 18, y: 1989 }, univ: { name: '중앙대학교', major: '법학', classOf: 82 }, role: '더불어민주당 당대표 · 제22대 국회의원', hometown: '경북 안동시' },
    '윤석열': { name: '윤석열', birth: 1960, exam: { kind: '사법시험', n: 33, y: 1991, note: '9수 끝 합격' }, inst: { kind: '사법연수원', n: 23, y: 1994 }, univ: { name: '서울대학교', major: '법학', classOf: 79 }, role: '대한민국 제20대 대통령', hometown: '서울 성북구' },
    '문재인': { name: '문재인', birth: 1953, exam: { kind: '사법시험', n: 22, y: 1980 }, inst: { kind: '사법연수원', n: 12, y: 1982, note: '차석 수료' }, univ: { name: '경희대학교', major: '법학', classOf: 72 }, role: '대한민국 제19대 대통령', hometown: '경남 거제시' },
    '한동훈': { name: '한동훈', birth: 1973, exam: { kind: '사법시험', n: 37, y: 1995, note: '만 22세 재학 중 합격' }, inst: { kind: '사법연수원', n: 27, y: 1998 }, univ: { name: '서울대학교', major: '법학', classOf: 92 }, role: '국민의힘 대표 (전임) · 전 법무부 장관', hometown: '서울 서초구' },
    '김동연': { name: '김동연', birth: 1957, exam: { kind: '행정고시', n: 26, y: 1982, note: '입법고시 6회 동시합격' }, univ: { name: '덕수상고 / 국제대학교', major: '법학', classOf: 78 }, role: '제36대 경기도지사 (현직) · 전 경제부총리', hometown: '충북 음성군' },
    '남경필': { name: '남경필', birth: 1965, univ: { name: '연세대학교', major: '사회학', classOf: 84 }, role: '제34대 경기도지사 (전직)', hometown: '경기 용인시' },
    '김문수': { name: '김문수', birth: 1951, univ: { name: '서울대학교', major: '경영학', classOf: 70 }, role: '고용노동부 장관 · 전 경기도지사', hometown: '경북 영천시' },
    '오세훈': { name: '오세훈', birth: 1961, exam: { kind: '사법시험', n: 26, y: 1984 }, inst: { kind: '사법연수원', n: 16, y: 1987 }, univ: { name: '고려대학교', major: '법학', classOf: 79 }, role: '제39대 서울특별시장 (현직) · 제16대 국회의원', hometown: '서울 성동구' },
    '조국': { name: '조국', birth: 1965, univ: { name: '서울대학교', major: '법학', classOf: 82 }, role: '조국혁신당 대표 · 제22대 국회의원 · 전 법무부 장관', hometown: '부산 서구' },
    '박균택': { name: '박균택', birth: 1966, exam: { kind: '사법시험', n: 31, y: 1989 }, inst: { kind: '사법연수원', n: 21, y: 1992 }, univ: { name: '서울대학교', major: '법학', classOf: 85 }, role: '더불어민주당 국회의원 (이재명 당대표 법률특보)', hometown: '광주 광산구' },
    '양부남': { name: '양부남', birth: 1961, exam: { kind: '사법시험', n: 31, y: 1989 }, inst: { kind: '사법연수원', n: 22, y: 1993 }, univ: { name: '전남대학교', major: '법학', classOf: 80 }, role: '더불어민주당 국회의원 (민주당 법률위원장)', hometown: '전남 담양군' },
    '김민석': { name: '김민석', birth: 1964, univ: { name: '서울대학교', major: '사회학', classOf: 82 }, role: '더불어민주당 수석최고위원 · 4선 국회의원', hometown: '서울 영등포구' },
    '지귀연': { name: '지귀연', birth: 1974, exam: { kind: '사법시험', n: 41, y: 1999 }, inst: { kind: '사법연수원', n: 31, y: 2002 }, univ: { name: '고려대학교', major: '법학', classOf: 93 }, role: '서울중앙지방법원 부장판사', hometown: '경남 밀양시' },
    '권영진': { name: '권영진', birth: 1962, univ: { name: '고려대학교', major: '영어영문학', classOf: 80 }, role: '국민의힘 국회의원 · 전 대구광역시장', hometown: '경북 안동시' },
    '김혜경': { name: '김혜경', birth: 1966, univ: { name: '숙명여자대학교', major: '피아노과', classOf: 85 }, role: '이재명 더불어민주당 대표 배우자', hometown: '서울' },
    '송현옥': { name: '송현옥', birth: 1961, univ: { name: '고려대학교', major: '영어영문학', classOf: 80 }, role: '세종대학교 영화예술학과 교수 · 오세훈 서울시장 배우자', hometown: '서울' },
    '정우영': { name: '정우영', role: '김동연 경기도지사 배우자' },
    '정경심': { name: '정경심', birth: 1962, univ: { name: '서울대학교', major: '영어영문학', classOf: 81 }, role: '전 동양대학교 교수 · 조국 대표 배우자', hometown: '서울' },
    '오세현': { name: '오세현', birth: 1963, univ: { name: '서울대학교', major: '컴퓨터공학', classOf: 82 }, role: '전 KT 전무 · 오세훈 시장 여동생', hometown: '서울' },
    '조민': { name: '조민', birth: 1991, univ: { name: '고려대학교', major: '환경생태공학부', classOf: 10 }, role: '크리에이터 · 조국 대표 장녀', hometown: '서울' },
    '하정우': { name: '하정우 (본명 김성훈)', birth: 1978, univ: { name: '중앙대학교', major: '연극영화학부', classOf: 97 }, role: '영화배우 · 영화감독 (중앙대 동문)', hometown: '서울 서초구' },
    '김수현': { name: '김수현', birth: 1988, univ: { name: '중앙대학교', major: '연극영화학과', classOf: 09 }, role: '배우 (중앙대 동문)', hometown: '서울 강남구' },
    '백선희': { name: '백선희', birth: 1969, univ: { name: '중앙대학교', major: '사회복지학' }, role: '서울신학대 교수 · 전 저출산고령사회위 (중앙대 동문)', hometown: '서울' },
    '박기웅': { name: '박기웅', birth: 1985, role: '배우 (안동 출생 동향)', hometown: '경북 안동시' },
    '김병철': { name: '김병철', birth: 1974, univ: { name: '중앙대학교', major: '연극영화학과' }, role: '배우 (안동 출생 및 중앙대 동문)', hometown: '경북 안동시' },
    '최불암': { name: '최불암 (본명 최영한)', birth: 1940, role: '원로 배우 · 제14대 국회의원', hometown: '인천' },
    '이원석': { name: '이원석', birth: 1969, exam: { kind: '사법시험', n: 37, y: 1995 }, inst: { kind: '사법연수원', n: 27, y: 1998 }, univ: { name: '서울대학교', major: '정치학', classOf: 88 }, role: '전 검찰총장', hometown: '전남 광주' },
    '박범계': { name: '박범계', birth: 1963, exam: { kind: '사법시험', n: 34, y: 1992 }, inst: { kind: '사법연수원', n: 23, y: 1994 }, univ: { name: '연세대학교', major: '법학', classOf: 85 }, role: '더불어민주당 국회의원 · 전 법무부 장관', hometown: '충북 영동군' },
    '이경희': { name: '이경희', birth: 1932, role: '부친 (故 영양 이씨)', hometown: '경북 안동시' },
    '구호명': { name: '구호명', birth: 1931, role: '모친 (故 평산 신씨)', hometown: '경북 안동시' },
    '이동호': { name: '이동호', birth: 1992, univ: { name: '고려대학교', major: '행정학', classOf: 12 }, role: '이재명 대표 장남', hometown: '경기 성남시' },
    '이연호': { name: '이연호', birth: 1993, univ: { name: '고려대학교', major: '행정학', classOf: 13 }, role: '이재명 대표 차남', hometown: '경기 성남시' },
    '이재영': { name: '이재영', birth: 1955, role: '큰형 (장남) · 건설 노동자', hometown: '경북 안동시' },
    '이재국': { name: '이재국', birth: 1959, role: '둘째형 (차남) · 건설 노동자', hometown: '경북 안동시' },
    '이재선': { name: '이재선', birth: 1960, role: '셋째형 · 공인회계사 · 전 박사모 성남지부장', hometown: '경북 안동시' },
    '박인복': { name: '박인복', role: '형수 (고 이재선 회계사 부인)' },
    '이재순': { name: '이재순', birth: 1957, role: '큰누나 (장녀)', hometown: '경북 안동시' },
    '이재옥': { name: '이재옥', birth: 1965, role: '여동생 · 전 성남 야탑역 환경미화원', hometown: '경북 안동시' },
    '이재문': { name: '이재문', birth: 1966, role: '남동생 · 성남시 환경미화원', hometown: '경북 안동시' },
    '김종진': { name: '김종진', birth: 1936, role: '장인 (김혜경 부친)', hometown: '서울 송파구' },
    '이영숙': { name: '이영숙', role: '장모 (김혜경 모친)' },
    '위근우': { name: '위근우', birth: 1980, univ: { name: '경원대학교', major: '국어국문학' }, role: '문화평론가 · 대중문화 칼럼니스트 (경원대 동문)' },
    '지수원': { name: '지수원', birth: 1967, univ: { name: '경원대학교', major: '의상학' }, role: '배우 (경원대 동문)' },
    '지윤': { name: '지윤', univ: { name: '경원대학교' }, role: '경원대 동문' },
    '김남준': { name: '김남준', birth: 1977, univ: { name: '충남대학교', major: '언론정보학' }, role: '제22대 국회의원 (이재명 계양을 정무 파트너)', hometown: '충남 천안시' },
    '최원식': { name: '최원식', birth: 1963, exam: { kind: '사법시험', n: 33, y: 1991 }, inst: { kind: '사법연수원', n: 23, y: 1994 }, univ: { name: '서울대학교', major: '법학', classOf: 82 }, role: '제19대 국회의원 (인천 계양구을 전임) · 변호사', hometown: '인천' },
    '이상권': { name: '이상권', birth: 1954, exam: { kind: '사법시험', n: 24, y: 1982 }, inst: { kind: '사법연수원', n: 14, y: 1984 }, univ: { name: '건국대학교', major: '법학', classOf: 73 }, role: '제18대 국회의원 (인천 계양구을 전임) · 전 한국전기안전공사 사장', hometown: '충남 홍성군' },
  };

  /* 인물 간 고유 맞춤 서사 DB (subject -> target 기준) */
  const CURATED_PAIRS = {
    '이재명:윤석열': {
      chipLabel: '사법연수원 5기수 후배',
      badge: '2022 대선 맞수 · 사법연수원 5기수 후배',
      summary: '2022년 제20대 대선 0.73%p차 최대 라이벌이자 현 대한민국 정치 권력의 양대 축',
      points: [
        { label: '사법연수원', val: '이재명(18기, 1989년) ↔ 윤석열(23기, 1994년) : 윤석열이 연수원 5기수 후배' },
        { label: '사법시험', val: '이재명(28회, 1986년) ↔ 윤석열(33회, 1991년 9수 합격) : 윤석열이 사시 5회 후배' },
        { label: '출생·학번', val: '윤석열(1960년생, 서울법대 79학번) ↔ 이재명(1963년생, 중앙법대 82학번) : 출생은 윤석열이 3세 연상, 3학번 선배' },
        { label: '대통령·국정', val: '2022년 대선 상대방, 2024년 4월 제20대 대통령과 제1야당 대표로서 영수회담 진행' }
      ]
    },
    '윤석열:이재명': {
      chipLabel: '사법연수원 5기수 선배',
      badge: '2022 대선 맞수 · 사법연수원 5기수 선배',
      summary: '2022년 제20대 대선 0.73%p차 최대 라이벌이자 국정 동반자·검증 상대',
      points: [
        { label: '사법연수원', val: '윤석열(23기, 1994년) ↔ 이재명(18기, 1989년) : 이재명이 연수원 5기수 선배' },
        { label: '사법시험', val: '윤석열(33회, 1991년) ↔ 이재명(28회, 1986년) : 이재명이 사시 5회 선배' },
        { label: '출생·학번', val: '윤석열(1960년생, 서울법대 79학번) ↔ 이재명(1963년생, 중앙법대 82학번) : 출생은 윤석열이 3세 연상' },
        { label: '영수회담', val: '2024년 4월 용산 대통령실에서 제20대 대통령과 제1야당 대표 간 공식 영수회담 진행' }
      ]
    },
    '이재명:문재인': {
      chipLabel: '사법연수원 6기수 선배',
      badge: '사법연수원 6기수 선배 · 대선 경선 경쟁',
      summary: '참여정부 주역과 민선 5·6·7기 성남시장/경기지사로 이어진 정권 내 주요 파트너이자 대선 경쟁자',
      points: [
        { label: '사법연수원', val: '문재인(12기, 1982년 차석) ↔ 이재명(18기, 1989년) : 문재인이 연수원 6기수 선배' },
        { label: '사법시험', val: '문재인(22회, 1980년) ↔ 이재명(28회, 1986년) : 문재인이 사시 6회 선배' },
        { label: '출생·학번', val: '문재인(1953년생, 경희법대 72학번) ↔ 이재명(1963년생, 중앙법대 82학번) : 문재인이 10세 연상' },
        { label: '정치 이력', val: '2017년 민주당 대선 경선 후보 경쟁, 문재인 정부 시기 제35대 경기도지사로 지방자치 견인' }
      ]
    },
    '문재인:이재명': {
      chipLabel: '사법연수원 6기수 후배',
      badge: '사법연수원 6기수 후배 · 전 경기도지사',
      summary: '문재인 정부 시기 지방자치를 이끈 경기지사이자 제20대 대선 민주당 후보',
      points: [
        { label: '사법연수원', val: '문재인(12기, 1982년) ↔ 이재명(18기, 1989년) : 이재명이 연수원 6기수 후배' },
        { label: '당정 관계', val: '문재인 대통령 재임 시기 경기지사로서 기본소득·재난기본소득 등 정책적 교감 및 협력' }
      ]
    },
    '이재명:김동연': {
      chipLabel: '후임 경기도지사',
      badge: '후임 경기도지사 · 대선 후보 단일화',
      summary: '제35대(이재명)와 제36대(김동연) 경기도정을 연속으로 이끈 민주당 소속 광역단체장',
      points: [
        { label: '도정 승계', val: '이재명(제35대 도지사, 2018~2021) ↔ 김동연(제36대 현 도지사, 2022~현재) : 직속 후임 도지사' },
        { label: '대선 단일화', val: '2022년 제20대 대선 당시 새로운물결-민주당 후보 단일화 및 공동정부 추진 협약 체결' },
        { label: '고시·공직', val: '김동연은 행시 26회·입법고시 6회 동시합격 정통 경제관료 출신(경제부총리 역임)' }
      ]
    },
    '김동연:이재명': {
      chipLabel: '직전 경기도지사',
      badge: '직전 경기도지사 · 당대표',
      summary: '제35대 경기도지사를 역임한 더불어민주당 당대표',
      points: [
        { label: '도정 승계', val: '김동연(제36대 도지사, 2022~현재) ↔ 이재명(제35대 도지사, 2018~2021) : 이재명이 직전 전임 도지사' },
        { label: '정당·연대', val: '2022년 대선 연대 후 민주당 합당, 현 경기도정과 중앙당 간 정책적 공조 지속' }
      ]
    },
    '이재명:남경필': {
      chipLabel: '직전 경기도지사',
      badge: '직전 전임 경기도지사 · 2018 경기지사 맞수',
      summary: '2018년 제7회 지방선거 경기도지사 선거에서 맞붙은 전임과 후임 지자체장',
      points: [
        { label: '도정 승계', val: '남경필(제34대 도지사, 2014~2018) ↔ 이재명(제35대 도지사, 2018~2021) : 이재명이 도정 계승' },
        { label: '선거 대결', val: '2018년 지방선거 맞대결에서 이재명 후보 56.4% 득표로 승리' }
      ]
    },
    '이재명:김문수': {
      chipLabel: '전전임 경기도지사',
      badge: '전임 경기도지사',
      summary: '민선 4·5기(김문수)와 민선 7기(이재명) 경기도지사 역임',
      points: [
        { label: '경기도지사', val: '김문수(제32·33대, 2006~2014) ↔ 이재명(제35대, 2018~2021) : 전임 도지사' },
        { label: '정치 궤적', val: '노동운동가 출신 보수 정치인과 소년공·인권변호사 출신 진보 정치인의 대조적 궤적' }
      ]
    },
    '이재명:오세훈': {
      chipLabel: '사법연수원 2기수 선배',
      badge: '사법연수원 2기수 선배 · 수도권 단체장 카운터파트',
      summary: '서울시장과 경기도지사로서 수도권 정책을 조율한 주요 여야 대권주자',
      points: [
        { label: '사법연수원', val: '오세훈(16기, 1987년 수료) ↔ 이재명(18기, 1989년 수료) : 오세훈이 연수원 2기수 선배' },
        { label: '사법시험', val: '오세훈(26회, 1984년 합격) ↔ 이재명(28회, 1986년 합격) : 오세훈이 사시 2회 선배' },
        { label: '출생·연령', val: '오세훈(1961년생) ↔ 이재명(1963년생) : 오세훈이 2세 연상' },
        { label: '지자체장', val: '수도권 광역단체장(서울시장·경기지사)으로서 수도권 통합환승·방역정책 등 실무 협의' }
      ]
    },
    '오세훈:이재명': {
      chipLabel: '사법연수원 2기수 후배',
      badge: '사법연수원 2기수 후배 · 수도권 단체장 카운터파트',
      summary: '서울시장과 전 경기도지사이자 여야를 대표하는 차기 대권주자 라이벌',
      points: [
        { label: '사법연수원', val: '오세훈(16기, 1987년) ↔ 이재명(18기, 1989년) : 이재명이 연수원 2기수 후배' },
        { label: '사법시험', val: '오세훈(26회, 1984년) ↔ 이재명(28회, 1986년) : 이재명이 사시 2회 후배' },
        { label: '수도권 정책', val: '기후동행카드, 경기패스, 서울편입 메가시티 등 수도권 정책 맞수' }
      ]
    },
    '이재명:지귀연': {
      chipLabel: '사법연수원 13기수 후배',
      badge: '사법연수원 13기수 후배',
      summary: '사법연수원 선후배 법조인이자 서울중앙지방법원 부장판사',
      points: [
        { label: '사법연수원', val: '이재명(18기, 1989년 수료) ↔ 지귀연(31기, 2002년 수료) : 지귀연이 연수원 13기수 후배' },
        { label: '법원 직무', val: '지귀연 판사는 서울중앙지법 형사합의부 부장판사로 재직' }
      ]
    },
    '이재명:박균택': {
      chipLabel: '사법연수원 3기수 후배',
      badge: '사법연수원 3기수 후배 · 당대표 법률특보',
      summary: '검찰 고위직 출신으로 이재명 대표의 법률 변호와 당 사법리스크 대응 총괄',
      points: [
        { label: '사법연수원', val: '이재명(18기, 1989년) ↔ 박균택(21기, 1992년) : 박균택이 연수원 3기수 후배' },
        { label: '사법시험', val: '이재명(28회, 1986년) ↔ 박균택(31회, 1989년) : 박균택이 사시 3회 후배' },
        { label: '당내 역할', val: '전 광주고검장·법무부 검찰국장 출신, 제22대 국회 진출 후 당대표 법률특보 역임' }
      ]
    },
    '이재명:양부남': {
      chipLabel: '사법연수원 4기수 후배',
      badge: '사법연수원 4기수 후배 · 당 법률위원장',
      summary: '고검장 출신으로 민주당 법률위원장을 맡아 당 사법 대응을 전담',
      points: [
        { label: '사법연수원', val: '이재명(18기, 1989년) ↔ 양부남(22기, 1993년) : 양부남이 연수원 4기수 후배' },
        { label: '당내 역할', val: '전 부산고검장 출신, 제22대 국회의원 및 민주당 법률위원회 위원장 역임' }
      ]
    },
    '이재명:김민석': {
      chipLabel: '더불어민주당 수석최고위원',
      badge: '민주당 수석최고위원 · 당 지도부 파트너',
      summary: '더불어민주당 지도부의 핵심 축으로 당 총선 상황본부장 및 수석최고위원 역임',
      points: [
        { label: '당내 직무', val: '제22대 총선 민주당 총선상황실장 역임 후 전당대회 수석최고위원 당선' },
        { label: '출생·연령', val: '김민석(1964년생, 서울대 총학생회장 출신) ↔ 이재명(1963년생) : 이재명이 1세 연상' }
      ]
    },
    '이재명:권영진': {
      chipLabel: '경북 안동 동향',
      badge: '경북 안동 동향 · 전 대구광역시장',
      summary: '경북 안동 출신 정치인으로 민선 6·7기 대구광역시장 역임',
      points: [
        { label: '지연·출생', val: '권영진(1962년생, 경북 안동) ↔ 이재명(1963년생, 경북 안동) : 동향' },
        { label: '광역단체장', val: '민선 7기 대구시장과 경기지사로서 시·도지사협의회 카운터파트' }
      ]
    }
  };

  /* 정밀 선후배·학번·연령 관계 계산기 (대칭성 보장) */
  const getSeniorityRelation = (subject, target) => {
    const s = SENIORITY_PEOPLE[subject] || {};
    const t = SENIORITY_PEOPLE[target] || {};

    // 1) 사법연수원 기수 (낮은 기수가 선배)
    if (s.inst && t.inst) {
      const diff = s.inst.n - t.inst.n;
      if (diff < 0) {
        return {
          chip: `사법연수원 ${Math.abs(diff)}기수 후배`,
          badge: `사법연수원 ${Math.abs(diff)}기수 후배`,
          detail: `${subject}(제${s.inst.n}기, ${s.inst.y}년) ↔ ${target}(제${t.inst.n}기, ${t.inst.y}년) : ${target}이 연수원 ${Math.abs(diff)}기수 후배`
        };
      } else if (diff > 0) {
        return {
          chip: `사법연수원 ${diff}기수 선배`,
          badge: `사법연수원 ${diff}기수 선배`,
          detail: `${subject}(제${s.inst.n}기, ${s.inst.y}년) ↔ ${target}(제${t.inst.n}기, ${t.inst.y}년) : ${target}이 연수원 ${diff}기수 선배`
        };
      } else {
        return {
          chip: `사법연수원 ${s.inst.n}기 동기`,
          badge: `사법연수원 ${s.inst.n}기 동기`,
          detail: `사법연수원 제${s.inst.n}기 동기 (${s.inst.y}년 동시 수료)`
        };
      }
    }

    // 2) 고시 시험 회차 (낮은 회차가 선배)
    if (s.exam && t.exam && s.exam.kind === t.exam.kind) {
      const diff = s.exam.n - t.exam.n;
      if (diff < 0) {
        return {
          chip: `${s.exam.kind} ${Math.abs(diff)}회 후배`,
          badge: `${s.exam.kind} ${Math.abs(diff)}회 후배`,
          detail: `${subject}(제${s.exam.n}회) ↔ ${target}(제${t.exam.n}회) : ${target}이 ${s.exam.kind} ${Math.abs(diff)}회 후배 합격`
        };
      } else if (diff > 0) {
        return {
          chip: `${s.exam.kind} ${diff}회 선배`,
          badge: `${s.exam.kind} ${diff}회 선배`,
          detail: `${subject}(제${s.exam.n}회) ↔ ${target}(제${t.exam.n}회) : ${target}이 ${s.exam.kind} ${diff}회 선배 합격`
        };
      } else {
        return {
          chip: `${s.exam.kind} ${s.exam.n}회 동기`,
          badge: `${s.exam.kind} ${s.exam.n}회 동기`,
          detail: `${s.exam.kind} 제${s.exam.n}회 동기 합격`
        };
      }
    }

    // 3) 대학교 학번 (낮은 학번이 선배)
    if (s.univ && t.univ && s.univ.name === t.univ.name && s.univ.classOf && t.univ.classOf) {
      const diff = s.univ.classOf - t.univ.classOf;
      if (diff < 0) {
        return {
          chip: `${s.univ.name} ${Math.abs(diff)}학번 후배`,
          badge: `${s.univ.name} ${Math.abs(diff)}학번 후배`,
          detail: `${subject}(${s.univ.name} ${s.univ.classOf}학번) ↔ ${target}(${t.univ.classOf}학번) : ${target}이 ${Math.abs(diff)}학번 후배`
        };
      } else if (diff > 0) {
        return {
          chip: `${s.univ.name} ${diff}학번 선배`,
          badge: `${s.univ.name} ${diff}학번 선배`,
          detail: `${subject}(${s.univ.name} ${s.univ.classOf}학번) ↔ ${target}(${t.univ.classOf}학번) : ${target}이 ${diff}학번 선배`
        };
      } else {
        return {
          chip: `${s.univ.name} ${s.univ.classOf}학번 동기`,
          badge: `${s.univ.name} 동문 동기`,
          detail: `${s.univ.name} ${s.univ.classOf}학번 동기 입학`
        };
      }
    }

    // 4) 출생 연도 (먼저 태어난 쪽이 연상)
    if (s.birth && t.birth) {
      const diff = s.birth - t.birth;
      if (diff > 0) {
        return {
          chip: `${diff}세 연상`,
          badge: `${diff}세 연상`,
          detail: `${target}(${t.birth}년생) ↔ ${subject}(${s.birth}년생) : ${target}이 ${diff}세 연상`
        };
      } else if (diff < 0) {
        return {
          chip: `${Math.abs(diff)}세 연하`,
          badge: `${Math.abs(diff)}세 연하`,
          detail: `${target}(${t.birth}년생) ↔ ${subject}(${s.birth}년생) : ${target}이 ${Math.abs(diff)}세 연하`
        };
      } else {
        return {
          chip: '동갑',
          badge: '동갑',
          detail: `${target}과 ${subject} 모두 ${s.birth}년생 동갑`
        };
      }
    }

    return null;
  };

  const buildRelationTooltip = (subject, target, groupKey, sub, targetId, c) => {
    if (!subject || !target || subject === target) return '';
    const sInfo = SENIORITY_PEOPLE[subject] || {};
    const tInfo = SENIORITY_PEOPLE[target] || {};

    const pairKey = subject + ':' + target;
    const curated = CURATED_PAIRS[pairKey];
    const computed = getSeniorityRelation(subject, target);

    let badgeText = '';
    let badgeClass = 'blue';
    let summary = '';
    const points = [];
    const targetRole = tInfo.role || (c && c[1] ? (c[1] + (c[2] ? ' · ' + c[2] + '계층' : '')) : '');

    let targetPhoto = c && c[3] ? (/^https?:/.test(c[3]) ? c[3] : B0 + c[3]) : null;
    if (!targetPhoto && FAMILY_REGISTRY[subject]) {
      const fam = FAMILY_REGISTRY[subject].find(x => x.name === target || x.id === targetId);
      if (fam && fam.photo) targetPhoto = fam.photo;
    }

    if (curated) {
      badgeText = curated.badge;
      badgeClass = curated.badge.includes('선배') || curated.badge.includes('후배') ? 'sen' : (curated.badge.includes('맞수') || curated.badge.includes('경쟁') ? 'rival' : 'blue');
      summary = curated.summary;
      curated.points.forEach(pt => points.push({ label: pt.label, val: pt.val }));
    } else if (computed) {
      badgeText = computed.badge;
      badgeClass = computed.badge.includes('선배') || computed.badge.includes('후배') ? 'sen' : 'blue';
      summary = `${subject}과 ${target}의 인적·공직 관계 및 이력 비교입니다.`;
      points.push({ label: '관계 분석', val: computed.detail });
      if (tInfo.role) points.push({ label: '직책·역할', val: tInfo.role });
      if (tInfo.hometown) points.push({ label: '출생·연고', val: tInfo.hometown });
    }

    if (groupKey === '가족' || groupKey === 'family' || sub === 'family' || (c && c[1] === 'family')) {
      const famList = FAMILY_REGISTRY[subject] || [];
      const famItem = famList.find(x => x.name === target || x.id === targetId);
      if (famItem) {
        badgeText = famItem.role;
        badgeClass = 'fam';
        summary = famItem.summary || `${subject}의 직계 가족으로 공직자 재산등록 및 인적사항에 등재된 가족입니다.`;
        if (famItem.points && famItem.points.length) {
          famItem.points.forEach(p => points.push({ label: p.label, val: p.val }));
        }
      } else {
        badgeText = sub || '가족';
        badgeClass = 'fam';
        summary = `${subject}의 가족 관계로 공직자 재산공개 및 인적사항에 등록된 인물입니다.`;
        if (targetRole) points.push({ label: '가족 관계', val: targetRole });
      }
    }

    if (points.length === 0) {
      if (targetRole) points.push({ label: '주요 이력', val: targetRole });
      if (tInfo.hometown) points.push({ label: '출신 연고', val: tInfo.hometown });
      if (groupKey) points.push({ label: '분류 기준', val: `${groupKey} 연계 인물` });
      if (!summary) summary = `${target}의 공직·활동 이력 및 ${subject}과의 공적 연결 관계입니다.`;
      if (!badgeText) badgeText = targetRole.split('·')[0].trim() || '인물 정보';
    }

    const formatPointVal = v => {
      if (v.includes(' : ')) {
        const parts = v.split(' : ');
        const context = parts[0];
        const highlight = parts.slice(1).join(' : ');
        return `<span class="nrt-ctx">${esc(context)}</span><strong class="nrt-strong">${esc(highlight)}</strong>`;
      }
      return `<span class="nrt-text">${esc(v)}</span>`;
    };

    const rowsHtml = points.map(pt => `
      <li class="nrt-item">
        <span class="nrt-label">${esc(pt.label)}</span>
        <div class="nrt-val">${formatPointVal(pt.val)}</div>
      </li>
    `).join('');

    return `
      <div class="nb-rel-tip">
        <div class="nrt-head">
          <div class="nrt-profile">
            ${targetPhoto 
              ? `<img class="nrt-avatar" src="${esc(targetPhoto)}" alt="${esc(target)}" loading="lazy">` 
              : `<div class="nrt-avatar nrt-avatar--placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`
            }
            <div class="nrt-title-row">
              <span class="nrt-name">${esc(target)}</span>
              ${targetRole ? `<span class="nrt-role">${esc(targetRole)}</span>` : ''}
            </div>
          </div>
          ${badgeText ? `<span class="nrt-badge ${badgeClass}">${esc(badgeText)}</span>` : ''}
        </div>
        ${summary ? `<p class="nrt-summary">${esc(summary)}</p>` : ''}
        ${rowsHtml ? `<ul class="nrt-list">${rowsHtml}</ul>` : ''}
      </div>
    `;
  };

  const getChipSub = (subject, peerName, groupKey, defaultSub, o, c) => {
    if (!groupKey) {
      return RS[defaultSub] || defaultSub;
    }
    const pairKey = subject + ':' + peerName;
    const curated = CURATED_PAIRS[pairKey];
    if (curated && curated.chipLabel) {
      return curated.chipLabel;
    }
    const computed = getSeniorityRelation(subject, peerName);
    if (computed && computed.chip) {
      return computed.chip;
    }
    if (['같은 직위', '동문', '같은 고향', '함께', '같은 정당', '같은 지역구'].includes(defaultSub)) {
      if (c && c[1]) return c[1];
      return '';
    }
    return defaultSub;
  };

  const pcard = (o, defaultSub, groupKey = null) => {
    const c = L[o] || [o];
    const peerName = c[0];
    const subLabel = getChipSub(nm, peerName, groupKey, defaultSub, o, c);
    const tipHtml = buildRelationTooltip(nm, peerName, groupKey, subLabel, o, c);
    return NB.pchip({ name: peerName, photo: c[3] ? (/^https?:/.test(c[3]) ? c[3] : B0 + c[3]) : null }, subLabel, c[4] ? href.p(o) : null, tipHtml);
  };
  const photo = u => /^https?:/.test(u) ? u : B0 + u;

  /* ── 첫 화면 ── */
  const ph = B.ph;
  const party = Pj?.party || (car.party || []).slice(-1)[0];
  const occ = (car.occ || []).slice(0, 3);
  const line = [B.k ? gl('kind:' + B.k, B.k) : '', party ? (Pj ? gl('g:party:' + Pj.party, Pj.party) : gl(party[3], party[0])) : '', occ.length ? glist(occ) : ''].filter(Boolean).join('<i class="sep">·</i>');
  const birth = B.bd ? NB.ymd(B.bd) : B.b ? B.b + '년' : '';
  const facts = [
    birth && ['출생', `${birth}${B.bp ? `<small>${gl('g:region:' + B.bp, B.bp)}</small>` : ''}`, 'calendar'],
    B.dd && ['사망', B.dd + '년', 'calendar'],
    car.edu?.length && ['학력', glist(car.edu, 3), 'school'],
    (car.team || car.emp || car.mem || car.label) && ['소속', glist((car.team || car.emp || car.mem || car.label).slice(-3)), 'building'],
    B.x?.military && ['병역', esc(B.x.military), 'shield'],
    Pj && ['국회', `제${Pj.ages.join('·')}대 · ${gl('g:region:' + Pj.district, Pj.district)}`, 'building-bank'],
  ].filter(Boolean);
  const S = B.src || {};
  const chips = [S.wiki && [S.wiki, 'brand-wikipedia', '위키백과'], S.wd && [S.wd, 'world', '위키데이터'], S.pol && [S.pol, 'building-bank', '열린국회정보'], S.site && [S.site, 'link', '공식 사이트']].filter(Boolean);
  const phW = ph ? Math.min(300, Math.round((ph.w || 300) / 2)) : 0;
  const head = `<section class="hero">
    <div>
      ${B.d ? `<span class="hero-role">${ic('id-badge')}${esc(B.d)}</span>` : ''}
      <h1>${esc(nm)}${B.hz || B.en ? `<small>${[B.hz, B.en].filter(Boolean).map(esc).join(' · ')}</small>` : ''}</h1>
      ${line ? `<p class="hero-line">${line}</p>` : ''}
      ${facts.length ? NB.facts(facts) : ''}
      ${chips.length ? `<div class="hero-src">${chips.map(([u, i, t]) => `<a class="src-chip" href="${esc(u)}" target="_blank" rel="noopener">${ic(i)}${t}</a>`).join('')}</div>` : ''}
    </div>
    ${ph ? `<figure class="hero-ph" style="--ph-max:${phW}px"><img src="${esc(photo(ph.u))}" alt="${esc(nm)}" width="${ph.w}" height="${ph.h}"><figcaption><a href="${esc(ph.src)}" target="_blank" rel="noopener">${esc([ph.by, ph.lic].filter(Boolean).join(' · '))}</a></figcaption></figure>`
      : `<figure class="hero-ph hero-ph--none" aria-hidden="true">${ic('user')}</figure>`}
  </section>`;
  /* 생애 단계: 연도가 있는 직위 */
  const pos = (car.pos || []).filter(x => x[1]).sort((a, b) => a[1] - b[1]);
  /* 상단 생애 카드도 위키데이터의 일반 직함을 그대로 쓰지 않는다. 직위
     시작 연도와 공식 국회·대통령 임기표를 이용해 대수를 표시한다. */
  const assemblyTerm = y => ({ 2024: 22, 2022: 21, 2020: 21, 2016: 20, 2012: 19, 2008: 18, 2004: 17, 2000: 16, 1996: 15, 1992: 14, 1988: 13 }[Number(y)]);
  const presidentTerm = y => ({ 2025: 21, 2022: 20, 2017: 19, 2013: 18, 2008: 17, 2003: 16, 1998: 15, 1993: 14, 1988: 13 }[Number(y)]);
  const positionLabel = (label, y) => {
    const clean = cleanText(label), year = Number(y);
    if (/^대한민국\s*국회의원$/.test(clean)) { const term = assemblyTerm(year); return term ? `대한민국 제${term}대 국회의원` : clean; }
    if (/^대한민국\s*대통령$/.test(clean)) { const term = presidentTerm(year); return term ? `대한민국 제${term}대 대통령` : clean; }
    return clean;
  };
  const eras = pos.slice(-7).map((x, i, a) => ({ y: yr(x[1], x[2]), name: positionLabel(x[0], x[1]), href: href.g(x[3]), now: !x[2] && i === a.length - 1 }));
  /* 장기 기록 */
  const HP = H?.o || [], HI = (H?.it || []).map(x => ({ d: x[0], title: x[1], press: HP[x[2]] || '', cat: x[3], quote: x[4], url: x[5] || '', desc: x[6] || '' })).sort((a, b) => b.d.localeCompare(a.d));
  const own = x => { const i = x.title.indexOf(nm), q = x.title.search(/["“'‘]/); return i >= 0 && (q < 0 || i < q); };
  const Q = HI.filter(x => x.cat === '발언' && x.quote && own(x));
  /* 발언은 채팅 로그가 아니다. 같은 핵심어가 서로 다른 시점의 인용에
     반복될 때만 비교 묶음을 만든다. 표현이 다르다는 사실을 보여줄 뿐,
     이 코드가 모순·진정성·입장 변화를 자동 판정하지는 않는다. */
  const STOP_WORDS = new Set(['대한민국', '대통령', '국민', '정부', '우리', '이번', '오늘', '이날', '관련', '대해', '위해', '통해', '대한', '정말', '가장', '더욱', '하나', '이것', '그것', '발언', '주장', '밝혔', '말했', '강조', '있다', '한다', '했다', '것이다', '내가', '두고', '통해', '의원들', '어려울', '비판']);
  const topicTokens = q => [...new Set(cleanText(`${q.quote} ${q.title}`).match(/[가-힣]{2,}|[A-Za-z][A-Za-z0-9-]{2,}/g) || [])]
    .filter(w => !STOP_WORDS.has(w) && w !== nm && !/^(뉴스|기자|인터뷰|대표|의원)$/.test(w));
  const topicMap = new Map();
  Q.forEach(q => topicTokens(q).forEach(t => { const a = topicMap.get(t) || []; a.push(q); topicMap.set(t, a); }));
  const speechTopics = [...topicMap.entries()].map(([term, items]) => {
    const distinct = [...new Map(items.map(x => [`${x.d}|${x.title}`, x])).values()].sort((a, b) => a.d.localeCompare(b.d));
    return { term, items: distinct, years: new Set(distinct.map(x => x.d.slice(0, 4))).size };
  }).filter(x => x.items.length >= 2 && x.years >= 2)
    .sort((a, b) => b.items.length - a.items.length || b.years - a.years || a.term.localeCompare(b.term, 'ko')).slice(0, 8);

  /* 시점별 타임라인 비교 아젠다 (과거 입장 ↔ 현재 입장 추적) */
  const PREDEFINED_AGENDAS = [
    { title: '지방자치·도시행정·복지', icon: 'building-bank', keywords: ['성남', '경기', '서울시', '도지사', '시장', '복지', '청사', '예산', '행정', '기본소득', '신속통합'] },
    { title: '부동산·도시개발·교통', icon: 'home', keywords: ['부동산', '아파트', '재건축', '대장동', '백현동', '종부세', 'GTX', '기후동행카드', '재개발', '토지'] },
    { title: '사법·검찰·기소 리스크', icon: 'scale', keywords: ['검찰', '기소', '재판', '사법', '수사', '특검', '헌재', '법원', '처벌', '선고', '위증교사', '선거법'] },
    { title: '국정·대권·권력구조', icon: 'flag', keywords: ['대통령', '정부', '개헌', '청와대', '용산', '박근혜', '노무현', '공약', '대권'] },
    { title: '정당·의회·정치개혁', icon: 'users', keywords: ['국민의힘', '민주당', '조국혁신당', '국회', '의원', '이낙연', '한동훈', '원내대표', '전당대회', '패스트트랙'] },
    { title: '경제·민생·재정정책', icon: 'trending-up', keywords: ['경제', '민생', '물가', '추경', '재정', '지역화폐', '금리', '일자리', '기업'] },
  ];
  const speechAgendas = [];
  PREDEFINED_AGENDAS.forEach(ag => {
    const matched = Q.filter(q => ag.keywords.some(kw => (q.quote + ' ' + q.title).includes(kw))).sort((a, b) => a.d.localeCompare(b.d));
    const years = [...new Set(matched.map(x => x.d.slice(0, 4)))].sort();
    if (matched.length >= 2 && years.length >= 2) {
      speechAgendas.push({
        term: ag.title,
        icon: ag.icon,
        items: matched,
        years,
        span: `${years[0]}년 ~ ${years[years.length - 1]}년 (${years.length}개 연도)`,
      });
    }
  });
  speechTopics.forEach(t => {
    if (!speechAgendas.some(ag => ag.items.some(x => x.quote === t.items[0]?.quote))) {
      const years = [...new Set(t.items.map(x => x.d.slice(0, 4)))].sort();
      speechAgendas.push({
        term: `‘${t.term}’ 아젠다`,
        icon: 'message-circle',
        items: t.items,
        years,
        span: `${years[0]}년 ~ ${years[years.length - 1]}년 (${years.length}개 연도)`,
      });
    }
  });
  const INC = HI.filter(x => x.cat === '논란' || x.cat === '법적');
  const AR = B.ar;
  const relN = new Set((B.rel || []).flatMap(r => r[0].startsWith('g:') ? (B.gp?.[r[0]] || []) : [r[0]])).size;
  const kp = [
    AR && NB.stat('수집 보도', num(AR.c), '건', `${num(AR.pc)}개 언론사`),
    HI.length && NB.stat('장기 기록', num(HI.length), '건', `${HI[HI.length - 1].d.slice(0, 4)}년부터`),
    Q.length && NB.stat('본인 발언', Q.length, '건', `최근 ${NB.ymd(Q[0].d)}`),
    (B.ev || []).length && NB.stat('생애 기록', B.ev.length, '건'),
    relN && NB.stat('관계 인물', relN, '명'),
    Pj?.bills?.lead_count != null && NB.stat('대표 발의', Pj.bills.lead_count, '건', `공동 발의 ${Pj.bills.co_count}건`),
    Pj?.assets?.records?.length && (() => { const A = Pj.assets.records, l = A[A.length - 1], p = A[A.length - 2]; return NB.stat('신고 재산', NB.eok1(l.total), '원', p ? `전년 대비 <span class="${l.total < p.total ? 'neg' : 'pos'}">${NB.eok1(l.total - p.total)}</span>` : `${l.year}년`); })(),
  ].filter(Boolean).slice(0, 6);
  const top = head + (eras.length >= 2 ? `<section class="eras">${NB.era(eras)}</section>` : '') + (kp.length > 1 ? `<section class="sec"><div class="kpis" style="--kpi-n:${kp.length}">${kp.join('')}</div></section>` : '');

  const SEC = [];
  const add = (sid, title, icon, count, body, opt = {}) => SEC.push({ id: sid, title, icon, count, html: `<section class="sec ${opt.cls || ''}" id="${sid}">${NB.sh(title, { icon, count, aside: opt.aside })}${body}</section>` });

  /* ── 사진으로 본 변화(연도가 있는 사진 2장 이상) ── */
  if ((B.pt || []).length >= 2) add('s-ph', '사진으로 본 변화', 'photo', B.pt.length + '장', NB.ptl(B.pt.map(([y, u, w, h, src, lic, by]) => ({ y, u, w, h, src, cap: [by, lic].filter(Boolean).join(' · ') }))));

  /* ── 경력 흐름 ── */
  const norm = s => String(s || '').replace(/\s+/g, '');
  const EV = (B.ev || []).map(e => ({ d: e[0], title: e[1], typ: e[2], stage: e[3], desc: e[4], src: e[5], url: e[6], g: e[7] || null }));
  /* 출생은 연대기의 출발점이다. 정치인 데이터의 정확한 생년월일이 있는데도
     이전 수집본에 사건이 없을 때만 한 번 보완한다. */
  const timeline = EV.map(e => ({ ...e }));
  if (B.bd && !timeline.some(e => e.typ === 'birth')) timeline.push({ d: B.bd, title: '출생', typ: 'birth', stage: '출생·성장', desc: B.bp ? `${B.bp} 출생` : '', src: B.src?.wd || B.src?.wiki || '' });
  timeline.sort((a, b) => (NB.yearOf(a) - NB.yearOf(b)) || String(a.d).localeCompare(String(b.d)) || String(a.title).localeCompare(String(b.title), 'ko'));
  /* 출생은 전체 연대기의 첫 항목으로 두되, 직무 기간을 설명하는 간트에는
     넣지 않는다. 그래프의 빈 구간을 사실처럼 보이게 하지 않기 위해서다. */
  const rows = timeline.filter(e => /\d{4}/.test(e.d) && e.typ !== 'birth').map(e => ({ ...e }));
  const WDK = { pos: '직위', edu: '학력', emp: '소속', party: '정당', mem: '소속', team: '소속 팀', label: '레이블' };
  for (const k of Object.keys(WDK)) for (const [label, a, b, g] of car[k] || []) {
    if (!a) continue;
    const tail = norm(String(label).split(/\s+/).pop());
    const r = rows.find(r => norm(r.title).includes(norm(label))) || (tail.length >= 2 && rows.find(r => (NB.span(r.d) || [0])[0] === a && norm(r.title).includes(tail)));
    if (r) { r.g = r.g || g; continue; }
    rows.push({ d: a + (b && b !== a ? '~' + b : ''), title: label, typ: k, g });
  }
  rows.forEach(r => { if (!r.g) { const hit = Object.values(car).flat().find(x => x[0] && x[0].length > 2 && norm(r.title).includes(norm(x[0]))); if (hit) r.g = hit[3]; } r.href = r.g ? href.g(r.g) : null; });
  rows.sort((a, b) => (NB.span(a.d) || [0])[0] - (NB.span(b.d) || [0])[0]);
  const MAIN = new Set(['office', 'election', 'ruling', 'pos', 'party', 'team', 'emp', 'mem', 'label', 'career', 'business']);
  const main = rows.filter(r => MAIN.has(r.typ));
  const y0 = rows.length ? Math.min(...rows.map(r => (NB.span(r.d) || [9999])[0])) : (B.b || new Date().getFullYear());
  const y1 = new Date().getFullYear();
  const start = x => (NB.span(x.d || x.period || '') || [0])[0];
  const period = x => x.d ? NB.dot(x.d) : (x.period ? NB.dot(x.period) : '기간 미상');
  /* 출처별 표기가 달라도 같은 경력을 찾아 기간을 보강한다. 연도는 실제
     생애 기록에 있는 것만 합치며, 추정값을 만들어 넣지 않는다. */
  const careerKey = s => norm(cleanText(s)).replace(/[()]/g, '').replace(/대한민국/g, '').replace(/국민학교/g, '초등학교')
    .replace(/(제\d+대)당대표/g, '$1대표').replace(/도도지사/g, '도지사')
    .replace(/제\d+대|제\d+회|민선[\d,]+기|초선|재선|연임|취임|역임|수료|졸업|합격|출마|당선|학력|법학사/g, '');
  const careerMatches = (label, d = '') => {
    const key = careerKey(label);
    if (!key || key.length < 2) return [];
    let hit = rows.filter(r => { const k = careerKey(r.title); return k && (k.includes(key) || (key.length <= 5 && key.includes(k))); });
    if (/민선/.test(cleanText(label))) {
      const place = careerKey(label).replace(/민선[\d,]+기/g, '');
      const local = rows.filter(r => /민선/.test(r.title) && careerKey(r.title).includes(place));
      if (local.length) hit = local;
    }
    /* `중·고교 검정고시`처럼 상위 출처가 여러 실제 기록을 하나로 묶는
       경우에는 같은 검증 키워드의 기록을 모두 보여 기간만 병합한다. */
    if (!hit.length && key.includes('중고교')) hit = rows.filter(r => careerKey(r.title).includes('검정고시'));
    if (d && hit.length > 1) {
      const y = start({ d });
      const beginsThatYear = hit.filter(r => start(r) === y);
      const atYear = beginsThatYear.length ? beginsThatYear : hit.filter(r => { const [a, b] = NB.span(r.d) || []; return y && a <= y && y <= b; });
      if (atYear.length) hit = atYear;
    }
    return hit;
  };
  const joinedPeriod = hit => {
    if (!hit.length) return '';
    const dated = hit.map(x => x.d).filter(Boolean);
    if (dated.length === 1) return dated[0];
    const range = dated.map(NB.span).filter(Boolean);
    if (!range.length) return '';
    const a = Math.min(...range.map(x => x[0])), b = Math.max(...range.map(x => x[1]));
    return a === b ? String(a) : `${a}~${b}`;
  };
  const detailedLabel = (label, hit) => {
    const clean = cleanText(label);
    const best = hit[0]?.title || '';
    if (/^대한민국\s*대통령$/.test(clean) && best) return best.replace(/\s*취임$/, '');
    if (/^대한민국\s*국회의원$/.test(clean) && best) {
      const term = best.match(/제\d+대\s*국회의원/)?.[0];
      return term ? `대한민국 ${term}` : best;
    }
    if (/^사법연수원$/.test(clean) && best) return best.replace(/\s*수료$/, '');
    return clean;
  };
  const knownCareer = s => {
    const label = cleanText(s).replace(/^▶\s*/, '');
    const hit = careerMatches(label);
    return { label: detailedLabel(label, hit), d: joinedPeriod(hit), href: hit[0]?.href || '' };
  };
  /* 간트와 목록은 같은 세부 직함을 사용한다. 특히 역대 국회의원은
     재임 시기별 대수를 생략하지 않아 서로 다른 임기를 혼동하지 않는다. */
  const detailedRows = rows.map(r => {
    /* 위키데이터 경력에서 보강한 '대한민국 국회의원' 행은 같은 행 자신도
       검색 결과에 들어온다. 자신을 근거로 삼으면 대수 없는 제목을 그대로
       되돌리므로, 같은 기간의 원문 생애 기록을 우선 선택한다. */
    const matches = careerMatches(r.title, r.d).filter(x => x !== r);
    const specific = matches.filter(x => /제\d+대\s*(?:국회의원|대통령)/.test(x.title));
    return { ...r, title: detailedLabel(r.title, specific.length ? specific : matches) };
  });
  const assemblyCareers = (Pj?.history || []).map(knownCareer).filter(x => x.label).sort((a, b) => start(b) - start(a) || a.label.localeCompare(b.label, 'ko'));
  const wikiCareers = [];
  for (const k of ['pos', 'edu', 'emp', 'mem', 'team', 'label']) for (const [label, a, b, g] of car[k] || []) {
    const raw = cleanText(label), ownPeriod = a ? `${a}${b && b !== a ? '~' + b : ''}` : '';
    const hit = careerMatches(raw, ownPeriod);
    const verifiedPeriod = joinedPeriod(hit);
    const d = verifiedPeriod && /\./.test(verifiedPeriod) && !/\./.test(ownPeriod) ? verifiedPeriod : (ownPeriod || verifiedPeriod);
    wikiCareers.push({ label: detailedLabel(raw, hit), d, kind: WDK[k], href: g ? href.g(g) : '' });
  }
  wikiCareers.sort((a, b) => start(b) - start(a) || a.label.localeCompare(b.label, 'ko'));
    /* 국회 등록 경력과 위키데이터 경력의 출처 통합 및 중복 제거 */
  const careerMap = new Map();
  assemblyCareers.forEach(x => {
    const k = careerKey(x.label);
    careerMap.set(k, { label: x.label, d: x.d, period: period(x), href: x.href, sources: ['대한민국 국회'], kind: '국회 등록' });
  });
  wikiCareers.forEach(x => {
    const k = careerKey(x.label);
    if (careerMap.has(k)) {
      const cur = careerMap.get(k);
      cur.sources.push('위키데이터');
      if ((!cur.d || cur.d === '기간 미상') && x.d) cur.d = x.d;
      if (x.href && !cur.href) cur.href = x.href;
    } else {
      careerMap.set(k, { label: x.label, d: x.d, period: period(x), href: x.href, sources: ['위키데이터'], kind: x.kind || '경력' });
    }
  });
  const mergedCareers = [...careerMap.values()].sort((a, b) => start(b) - start(a) || a.label.localeCompare(b.label, 'ko'));

  const regBlock = [
    mergedCareers.length && `<div class="reg"><h3 class="sub-t">${ic('briefcase')}공직·주요 경력 <small>${mergedCareers.length}건</small><span class="src-i" data-tip="국회 공보 및 위키데이터에 공식 등록된 공직·사회 경력입니다.">${ic('info-circle')}<span class="sr-only">수집 기준</span></span></h3><ul class="reg-l">${mergedCareers.map(x => {
      const tipText = [x.d && x.d !== '기간 미상' ? `활동 기간: ${x.d}` : '', x.sources.length > 1 ? `등록 출처: ${x.sources.join(' · ')}` : ''].filter(Boolean).join('\n');
      const tipAttr = tipText ? ` data-tip="${esc(tipText)}"` : '';
      return `<li class="reg-i"${tipAttr}><span class="reg-d">${esc(x.period)}</span>${x.href ? `<a class="lk" href="${esc(x.href)}"><b>${esc(x.label)}</b></a>` : `<b>${esc(x.label)}</b>`}<span class="reg-g">${esc(x.sources.join('·'))}</span></li>`;
    }).join('')}</ul></div>`,
    car.award?.length && `<div class="reg"><h3 class="sub-t">${ic('trophy')}수상 <small>${car.award.length}건</small></h3><ul class="reg-l">${car.award.slice().sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0)).map(x => `<li class="reg-i"><span class="reg-d">${esc(x[1] || '연도 미상')}</span><a class="lk" href="${href.g(x[3])}"><b>${esc(x[0])}</b></a></li>`).join('')}</ul></div>`,
  ].filter(Boolean).join('');
  if (rows.length || regBlock || timeline.length) {
    const cnt = NB.FILTERS.map(([n, f]) => [n, timeline.filter(f).length]);
    add('s-career', '경력 흐름', 'timeline-event', (rows.length + wikiCareers.length + assemblyCareers.length) + '건',
      `${rows.length ? `<div id="gt">${NB.gantt(detailedRows, y0, y1, NB.ticks(y0, y1))}</div>` : ''}
       ${regBlock}
       ${timeline.length ? NB.exp('전체 연대기', timeline.length + '건', `<div style="margin-bottom:var(--s-6)">${NB.seg('tl', cnt)}</div>${NB.tl(timeline)}`) : ''}`,
      { cls: 'career', aside: main.length && main.length < rows.length ? NB.seg('gt', [['주요 경력', main.length], ['전체', rows.length]]) : '' });
  }

  /* ── 의정·재산(국회의원) ── */
  if (Pj) {
    const bl = Pj.bills || {}, br = bl.by_result || {}, V = Pj.votes || {}, vt = Object.entries(V.summary || {});
    const vsum = k => vt.reduce((s, [, x]) => s + (x[k] || 0), 0);
    const vTot = NB.voteParts({ 찬성: vsum('찬성'), 반대: vsum('반대'), 기권: vsum('기권'), 불참: vsum('불참') });
    const bm = bl.by_month || {}, bmK = Object.keys(bm).sort(), months = [];
    if (bmK.length) for (let d = new Date(bmK[0] + '-01T00:00:00Z'); d.toISOString().slice(0, 7) <= bmK[bmK.length - 1]; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(d.toISOString().slice(0, 7));
    const res = r => r === '대안반영폐기' ? '대안 반영' : r;
    const bst = [['전체', (bl.recent || []).length], ...Object.entries(br).map(([k, v]) => [res(k), v])];
    const brow = b => `<a class="brow brow--bill" data-res="${esc(res(b.result))}" href="${esc(b.url)}" target="_blank" rel="noopener"><time>${NB.ymd(b.date)}</time><b>${esc(b.name)}<small>${b.no ? `의안번호 ${esc(b.no)} · ` : ''}${esc(b.committee || '')}${b.proposer ? ' · ' + esc(b.proposer) : ''}</small></b><span class="tag ${b.result === '계류' ? 'warn' : ''}">${esc(res(b.result) || '')}</span></a>`;
    const A = Pj.assets?.records || [], last = A[A.length - 1], aRows = A.slice().reverse();
    const ext = (u, t) => `<a class="lnk" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}${ic('external-link')}</a>`;
    const vbill = v => `https://likms.assembly.go.kr/bill/billDetail.do?billId=${encodeURIComponent(v.id)}`;
    const cms = String(Pj.committees || '').split(/\s*[,·]\s*/).filter(Boolean);
    const blocks = [
      (bl.lead_count || bl.co_count) && `<div class="blk"><h3 class="sub-t">대표 발의 <small>제${(bl.ages || Pj.ages).join('·')}대</small></h3>
        <div class="blk-v">${NB.donut(Object.entries(br).map(([k, v]) => [k, v, k === '계류' ? 'warn' : k === '원안가결' || k === '수정가결' ? 'pos' : 'k2']), `<span><b>${bl.lead_count}</b>건</span>`)}
        <ul class="stack-lg legend-v">${Object.entries(br).map(([k, v]) => `<li class="${k === '계류' ? 'warn' : k === '원안가결' || k === '수정가결' ? 'pos' : 'k2'}"><i></i>${esc(res(k))}<b>${v}</b></li>`).join('')}<li class="mute"><i></i>공동 발의<b>${bl.co_count || 0}</b></li></ul></div>
        ${(bl.recent || []).length ? NB.exp('법안 목록', bl.recent.length + '건', `${months.length > 1 ? `<div class="bill-m"><div class="stat-l">월별 대표 발의</div>${NB.vbars(months.map(m => ["'" + m.slice(2).replace('-', '.'), bm[m] || 0, false]), { cls: 'vbars--sm' })}</div>` : ''}
          <div class="bill-f">${NB.seg('bill', bst)}</div><div>${bl.recent.map(brow).join('')}</div><div class="blk-lnk">${ext('https://likms.assembly.go.kr/bill/main.do', '의안정보시스템')}</div>`) : ''}</div>`,
      V.count && `<div class="blk"><h3 class="sub-t">본회의 표결 <small>${num(V.count)}건</small></h3>${NB.stack(vTot.filter(p => p[1]), { pct: true })}
        ${NB.exp('대수별 · 반대·기권 안건', (V.dissent || []).length + '건', `<div class="blk">${vt.map(([age, v]) => `<div><div class="stat-l" style="margin-bottom:6px">제${age}대 <b class="num">${num(Object.values(v).reduce((s, x) => s + x, 0))}</b>건</div>${NB.stack(NB.voteParts(v).filter(p => p[1]), { pct: true })}</div>`).join('')}</div>
          <div class="sub-g">${(V.dissent || []).map(v => `<a class="brow" href="${vbill(v)}" target="_blank" rel="noopener"><time>${NB.ymd(v.date)}</time><b>${esc(v.name)}</b><span class="tag ${v.vote === '반대' ? 'neg' : 'warn'}">${esc(v.vote)}</span></a>`).join('')}</div>`)}</div>`,
      last && `<div class="blk"><h3 class="sub-t">신고 재산 <small>${last.year}년</small></h3><div class="stat-v">${NB.won(last.total)}</div>
        ${A.length > 1 ? `<div style="--hb-l:3.5em">${NB.hbars(aRows.map(r => [r.year + '년', r.total]), { fmt: NB.eok1 })}</div>` : ''}
        ${NB.stack([...NB.assetParts(last), ['토지', last.land || 0, 'k5'], ['증권', last.securities || 0, 'k5']], { fmt: v => v ? NB.eok1(v) : '0' })}
        ${last.debt ? `<div class="debt">${ic('receipt')}채무<b>${NB.won(last.debt)}</b></div>` : ''}
        ${NB.exp('신고별 내역', A.length + '건', NB.table(['', ...aRows.map(r => r.year + '년')], [
          ['종전 총액', ...aRows.map(r => NB.won(r.prev))], ['증가', ...aRows.map(r => NB.won(r.inc))], ['감소', ...aRows.map(r => NB.won(r.dec))],
          ['신고 총액', ...aRows.map(r => `<b>${NB.won(r.total)}</b>`)], ['변동', ...aRows.map(r => `<span class="${r.change < 0 ? 'neg' : 'pos'}">${NB.swon(r.change)}</span>`)],
          ['채무', ...aRows.map(r => NB.won(r.debt || 0))], ['원문', ...aRows.map(r => ext(r.url, String(r.issue || '원문').replace('국회공보 ', '')))]], aRows.map((_, i) => i + 1)))}</div>`,
    ].filter(Boolean);
    add('s-pol', '의정·재산', 'scale', null, `${NB.mini([
        ['선수', esc(Pj.reelect || ''), 'award'], ['당선', `제${Pj.ages.join('·')}대${Pj.terms?.[0]?.kind ? ' · ' + esc(Pj.terms[0].kind) : ''}`, 'checkbox'],
        ['선거구', gl('g:region:' + Pj.district, Pj.district), 'map-pin'], cms.length && ['소속 위원회', cms.map(c => gl('g:committee:' + c, c)).join('<i class="sep">·</i>'), 'users-group'],
        ['정당', gl('g:party:' + Pj.party, Pj.party), 'flag'], ['당적 변경', `${(Pj.party_switches || []).length}회`, 'flag'],
      ].filter(Boolean))}${blocks.length ? `<div class="cols cols-${Math.min(3, blocks.length)}">${blocks.join('')}</div>` : ''}`);
  }

  /* ── 관계 ── */
  const FAM_CAT = {
    spouse: 'family_direct', son: 'family_direct', son2: 'family_direct', daughter: 'family_direct', daughter2: 'family_direct', child: 'family_direct',
    father: 'family_parents', mother: 'family_parents', stepparent: 'family_parents',
    elder_brother: 'family_siblings', younger_brother: 'family_siblings', elder_sister: 'family_siblings', younger_sister: 'family_siblings',
    brother: 'family_siblings', sister: 'family_siblings', sibling: 'family_siblings', brother_in_law: 'family_siblings', sister_in_law: 'family_siblings',
    father_in_law: 'family_inlaw', mother_in_law: 'family_inlaw', relative: 'family_inlaw', cousin: 'family_inlaw'
  };

    /* 정치·정책·이해관계 테마 레지스트리 (주식 테마주/정치 지형도 분석형 구분) */
  const THEME_MEMBERS = {
    '이재명': [
      { id: 'wd:Q16090635', name: '윤석열', cat: 'theme_rival', sub: '2022 대선 맞수', role: '제20대 대선 최대 라이벌 · 영수회담 상대' },
      { id: 'wd:Q12587212', name: '김동연', cat: 'theme_admin', sub: '도정 계승·대선 단일화', role: '제36대 경기도지사 (도정 계승) · 2022 대선 단일화 파트너' },
      { id: 'wd:Q489115', name: '오세훈', cat: 'theme_admin', sub: '수도권 단체장 카운터파트', role: '제39대 서울시장 · 수도권 메가시티/교통 정책 맞수' },
      { id: 'wd:Q12588320', name: '남경필', cat: 'theme_admin', sub: '2018 경기지사 맞수', role: '제34대 경기도지사 (직전 전임)' },
      { id: 'wd:Q625801', name: '김문수', cat: 'theme_admin', sub: '전임 경기도지사', role: '제32·33대 경기도지사' },
      { id: 'wd:Q12597950', name: '박균택', cat: 'theme_legal', sub: '당대표 법률특보', role: '전 광주고검장 · 민주당 사법리스크 전담 변호' },
      { id: 'wd:Q12605330', name: '양부남', cat: 'theme_legal', sub: '민주당 법률위원장', role: '전 부산고검장 · 당 법률대응 총괄' },
      { id: 'wd:Q126684000', name: '지귀연', cat: 'theme_legal', sub: '중앙지법 재판부', role: '서울중앙지방법원 부장판사 (사법연수원 13기수 후배)' },
      { id: 'wd:Q12587780', name: '김민석', cat: 'theme_party', sub: '당 수석최고위원', role: '민주당 수석최고위원 · 총선상황실장' },
      { id: 'wd:Q126685000', name: '김남준', cat: 'theme_party', sub: '계양을 정무 파트너', role: '제22대 국회의원 · 성남/경기/당대표 정무특보' }
    ],
    '윤석열': [
      { id: 'wd:Q12612463', name: '이재명', cat: 'theme_rival', sub: '2022 대선 맞수', role: '제20대 대선 0.73%p차 최대 라이벌 · 제1야당 대표' },
      { id: 'wd:Q115764049', name: '한동훈', cat: 'theme_party', sub: '정치적 동반자·당정 협의', role: '국민의힘 전 대표 · 전 법무부 장관' },
      { id: 'wd:Q489115', name: '오세훈', cat: 'theme_admin', sub: '수도권 광역단체장', role: '서울특별시장 · 여권 차기 대권주자' }
    ]
  };

  /* 테마 멤버 주입 */
  if (THEME_MEMBERS[nm]) {
    const existingIds = new Set(B.rel.map(r => r[0]));
    const existingNames = new Set(B.rel.map(r => (L[r[0]] || [])[0]).filter(Boolean));
    for (const tm of THEME_MEMBERS[nm]) {
      const prev = L[tm.id];
      const photo = (prev && prev[3]) || null;
      L[tm.id] = [tm.name, tm.cat, tm.role, photo, 1];
      if (!existingIds.has(tm.id)) {
        B.rel.push([tm.id, tm.cat, tm.sub, 0.98, tm.role, 1]);
        existingIds.add(tm.id);
      }
    }
  }

  const RC = [
    ['family_direct', '직계가족 (배우자·자녀)'],
    ['family_parents', '부모'],
    ['family_siblings', '형제자매'],
    ['family_inlaw', '처가·인척'],
    ['theme_rival', '정치적 맞수·대선 라이벌'],
    ['theme_admin', '광역도정·행정 러닝메이트'],
    ['theme_legal', '사법대응·법률지원단'],
    ['theme_party', '원내·당권 지도부 파트너'],
    ['school', '학연'],
    ['region', '지연'],
    ['career', '경력·조직'],
    ['party', '정당'],
    ['case', '사건·재판']
  ];
  const RS = {
    spouse: '배우자', father: '부친', mother: '모친', child: '자녀', son: '장남', son2: '차남', daughter: '장녀', daughter2: '차녀',
    sibling: '형제자매', brother: '형제', sister: '자매', elder_brother: '형', younger_brother: '남동생', elder_sister: '누나', younger_sister: '여동생',
    brother_in_law: '형수', sister_in_law: '제수/형수', father_in_law: '장인', mother_in_law: '장모', relative: '친척', cousin: '사촌',
    educated: '출신 학교', alumni: '동문', birthplace: '출생지', district: '지역구', member: '소속 정당', position: '역임 직위',
    employer: '소속 기관', team: '소속 팀', member_of: '소속', court: '재판'
  };
  const PEER = { educated: '동문', alumni: '동문', birthplace: '같은 고향', district: '같은 지역구', member: '같은 정당', position: '같은 직위', employer: '같은 기관', team: '같은 팀', member_of: '같은 소속', court: '같은 재판' };
  const FAM_ORDER = {
    spouse: 1, son: 2, child: 2, daughter: 3, son2: 4, daughter2: 5,
    father: 10, mother: 11,
    elder_brother: 20, elder_sister: 21, younger_sister: 22, younger_brother: 23, sibling: 24, brother_in_law: 25, sister_in_law: 26,
    father_in_law: 30, mother_in_law: 31,
    relative: 40, cousin: 41
  };
  const relG = RC.map(([catKey, label]) => {
    let items;
    if (catKey.startsWith('family_')) {
      items = (B.rel || []).filter(r => (r[1] === 'family' || r[1] === catKey) && (FAM_CAT[r[2]] || 'family_inlaw') === catKey);
      items.sort((a, b) => (FAM_ORDER[a[2]] || 99) - (FAM_ORDER[b[2]] || 99));
    } else {
      items = (B.rel || []).filter(r => r[1] === catKey);
    }
    return [label, items];
  }).filter(x => x[1].length);
  if (relG.length) add('s-rel', '관계', 'affiliate', relN + '명', `<div class="rels">${relG.map(([c, rs]) => {
    const directItems = rs.filter(r => !r[0].startsWith('g:'));
    const groupItems = rs.filter(r => r[0].startsWith('g:'));
    return `<div class="rgroup">
      <div class="rg-h">${esc(c)}<small>${rs.length}</small></div>
      ${directItems.length ? `<div class="rpeers rpeers--direct">${directItems.map(r => pcard(r[0], RS[r[2]] || r[2], null)).join('')}</div>` : ''}
      ${groupItems.map(r => {
        const [o, , sub] = r;
        const peers = B.gp?.[o] || [];
        const orgName = o.split(':').slice(2).join(':') || o;
        return `<div class="rnode rnode--group">
          <div class="rgroup-header">
            ${lgi(o, true)}
            <div class="rgroup-header-text">
              <a class="lk rgroup-title" href="${href.g(o)}"><b>${esc(orgName)}</b></a>
              <small class="rgroup-sub">${esc(RS[sub] || sub)}</small>
            </div>
          </div>
          ${peers.length ? `<div class="rpeers"><span class="rpeer-l">${esc(PEER[sub] || '함께')}</span>${peers.map(p => pcard(p, PEER[sub] || RS[sub] || sub, o)).join('')}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }).join('')}</div>`);

    /* ── 발언 비교 ──
     단순 최신 발언 나열을 지양하고, 과거 시점의 입장과 현재 시점의 입장이 어떻게 변화했거나
     일관되는지 비교·검증할 수 있는 아젠다별 타임라인을 기본 전면에 배치한다. */
  const renderAgendaCards = () => {
    if (!speechAgendas.length) return `<div class="quotes">${Q.slice(0, 6).map(NB.quote).join('')}</div>`;
    return speechAgendas.map(ag => {
      const milestones = [
        { label: `과거 시점 (${ag.items[0].d.slice(0, 4)}년)`, q: ag.items[0] },
        ag.items.length >= 4 ? { label: `중간 경과 (${ag.items[Math.floor(ag.items.length / 2)].d.slice(0, 4)}년)`, q: ag.items[Math.floor(ag.items.length / 2)] } : null,
        { label: `최근 입장 (${ag.items[ag.items.length - 1].d.slice(0, 4)}년)`, q: ag.items[ag.items.length - 1] }
      ].filter(Boolean);

      return `<div class="agenda-card">
        <div class="agenda-head">
          <div class="agenda-title">${ic(ag.icon || 'message-square')}${esc(ag.term)}</div>
          <div class="agenda-meta">
            <span class="tag tag--info">${esc(ag.span)}</span>
            <span class="tag tag--neutral">${ag.items.length}개 발언 비교</span>
          </div>
        </div>
        <div class="agenda-grid">
          ${milestones.map(m => `
            <div class="speech-step-card">
              <span class="step-phase-badge">${esc(m.label)}</span>
              <span class="step-time-src">${esc(NB.ymd(m.q.d))} · ${esc(m.q.press || '언론사')}</span>
              <div class="step-quote">“${esc(m.q.quote)}”</div>
              ${m.q.title ? `<div class="step-ctx">${esc(m.q.title)}</div>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="agenda-fold">
          ${NB.exp(`‘${ag.term}’ 전체 ${ag.items.length}개 발언 타임라인 보기`, `${ag.items.length}건`, `<div class="speech-timeline">${ag.items.map(q => `<div class="speech-row"><div class="speech-phase"><time>${esc(NB.ymd(q.d))}</time><span class="phase-src">${esc(q.press || '')}</span></div><div class="speech-body"><blockquote class="speech-quote">“${esc(q.quote)}”</blockquote>${q.title ? `<div class="speech-ctx">${esc(q.title)}</div>` : ''}</div></div>`).join('')}</div>`)}
        </div>
      </div>`;
    }).join('');
  };
  const hotQuotes = (Q || []).filter(q => q.hot || q.heat).slice(0, 10);
  const speechTabs = [
    ['타임라인 비교', speechAgendas.length || Q.length],
    ['주요 화제 발언', hotQuotes.length || Math.min(6, Q.length)],
    ['전체 발언', Q.length],
    ...speechAgendas.map(ag => [ag.term, ag.items.length]),
  ];

  if (Q.length) {
    add('s-q', '발언 비교', 'messages', Q.length + '건', `<p class="compare-note">동일한 핵심 아젠다에 대해 과거 시점의 입장과 현재의 입장이 어떻게 변화했거나 일관되는지 시점별 타임라인으로 직접 비교·검증할 수 있습니다.</p>
      ${speechTabs.length ? `<div class="speech-f">${NB.seg('sq', speechTabs)}</div>` : ''}
      <div id="quote-list" class="quotes-agendas">${renderAgendaCards()}</div>
      <div id="quote-more" hidden></div>`);
  }

  /* ── 연결된 영상·공개 반응 ──
     인물 이름만으로 외부 게시물을 붙이지 않는다. 이 인물에게 연결된
     당일 이슈 ID를 공통 키로 삼은 공개 URL만 보여준다. */
  const issueIds = new Set((B.iss || []).map(x => x[2]));
  const voiceIssues = (Voice?.issues || []).filter(x => issueIds.has(x.id));
  const mediaSeen = new Set();
  const videos = [];
  const posts = [];
  voiceIssues.forEach(issue => {
    (issue.videos || []).forEach(v => { if (v.url && !mediaSeen.has(v.url)) { mediaSeen.add(v.url); videos.push({ t: v.t, title: v.title, url: v.url, press: v.ch || '영상', img: v.thumb || issue.image || '', desc: (v.sum || []).join(' ') }); } });
    (issue.posts || []).forEach(p => { if (p.url && !mediaSeen.has(p.url)) { mediaSeen.add(p.url); posts.push({ t: String(p.d || '').replace(/^(\d{4})(\d{2})(\d{2}).*/, '$1-$2-$3'), title: p.title || issue.title, url: p.url, press: p.src || '공개 반응', desc: p.q || '' }); } });
  });
  if (videos.length || posts.length) add('s-media', '영상·공개 반응', 'video', videos.length + posts.length + '건', `${videos.length ? `<div class="acards">${videos.slice(0, 4).filter(x => x.img).map(NB.acard).join('')}</div>` : ''}${posts.length ? `<div class="alist social-list">${posts.slice(0, 8).map(NB.arow).join('')}</div>` : ''}`);

  /* ── 보도·사건사고 (보도와 사건사고의 구분을 단일 섹터로 통합 관리) ── */
  const cleanStem = w => {
    let prev = '';
    while (w !== prev && w.length > 2) {
      prev = w;
      w = w.replace(/(역서|에서|으로|부터|까지|에게|에는|서는|에도|이라|라는|하고|이나|은|는|이|가|을|를|의|에|로|과|와|도|서|역)$/, '');
    }
    return w;
  };
  const extractTokens = text => {
    const raw = cleanText(text).replace(/\[[^\]]*\]|\([^\)]*\)|[‘“'"’”…‥·~!?]/g, ' ').match(/[가-힣]{2,}/g) || [];
    return new Set(raw.map(cleanStem).filter(w => w.length >= 2 && !STOP_WORDS.has(w) && w !== nm && !/^(뉴스|기자|인터뷰|대표|의원|오늘|내일|관련|대해|위한)$/.test(w)));
  };

  const inferCat = title => {
    if (/특검|기소|구속|체포|탈옥|재판|선고|1심|2심|대법|벌금|유죄|무죄|피고인|수사|압수수색/.test(title)) return '법적';
    if (/논란|의혹|공방|규탄|비판|공세|설전|갈등|반발|충돌|집회/.test(title)) return '논란';
    if (/공약|법안|발의|예산|정책|추진|의정|민생|지원|조례/.test(title)) return '정책';
    return '보도';
  };

  const catBadge = cat => {
    if (cat === '법적') return `<span class="tag tag--danger">사건사고</span>`;
    if (cat === '논란') return `<span class="tag tag--warn">의혹·논란</span>`;
    if (cat === '활동' || cat === '정책') return `<span class="tag tag--info">정책·의정</span>`;
    return `<span class="tag tag--neutral">보도</span>`;
  };

  const clusterArticles = list => {
    const clusters = [];
    for (const a of list) {
      const tokens = extractTokens(a.title);
      let matched = null;
      for (const c of clusters) {
        const d1 = (a.t || a.d || '').slice(0, 10), d2 = (c.lead.t || c.lead.d || '').slice(0, 10);
        const dayDiff = Math.abs(parseInt(d1.replace(/-/g, '') || '0', 10) - parseInt(d2.replace(/-/g, '') || '0', 10));
        if (dayDiff <= 2) {
          let commonCount = 0;
          for (const t of tokens) if (c.tokens.has(t)) commonCount++;
          if (commonCount >= 2 || (tokens.size >= 1 && commonCount >= 1 && ['탈옥법', '체포동의안', '구속영장', '선고', '기소', '특검', '단식', '대장동', '백현동', '위증교사', '공직선거법', '집회'].some(k => tokens.has(k) && c.tokens.has(k)))) {
            matched = c;
            break;
          }
        }
      }
      if (matched) {
        matched.items.push(a);
        tokens.forEach(t => matched.tokens.add(t));
      } else {
        clusters.push({ lead: a, items: [], tokens: new Set(tokens) });
      }
    }
    return clusters;
  };

    const renderClusterRow = (a, opt = {}) => {
    const dateStr = esc(NB.md(a.t || a.d));
    const title = NB.titleClean(a.title);
    const tip = typeof NB.articleTip === 'function' ? NB.articleTip(a) : cleanText(a.desc || '');
    const tag = a.url ? 'a' : 'div';
    const attrs = a.url ? ` href="${esc(a.url)}" target="_blank" rel="noopener"` : '';
    const badge = a.cat ? catBadge(a.cat) : catBadge(inferCat(a.title));
    const thumb = a.img ? `<div class="arow-img"><img src="${esc(a.img)}" alt="" loading="lazy"></div>` : '';
    const toggleBtn = opt.subCount ? `<button type="button" class="cluster-toggle-btn" aria-expanded="false" onclick="event.preventDefault(); event.stopPropagation(); const c=this.closest('.art-cluster'); c.classList.toggle('is-open'); const isOpen=c.classList.contains('is-open'); this.setAttribute('aria-expanded', isOpen); const list=c.querySelector('.cluster-sub-list'); if(list) list.hidden=!isOpen; this.querySelector('.ct-arrow').textContent=isOpen?'▲':'▼';"><span class="ct-count">+${opt.subCount}건</span><span class="ct-arrow">▼</span></button>` : '';

    return `<${tag} class="arow${a.img ? ' has-thumb' : ''}${opt.isSub ? ' arow--sub' : ''}"${attrs}${tip ? ` data-tip="${esc(tip)}"` : ''}>
      <time>${dateStr}</time>${thumb}
      <div class="arow-c">
        ${badge}
        <span class="arow-t">${esc(title)}</span>
      </div>
      <span class="arow-p">${esc(a.press || '')}${toggleBtn}</span>
    </${tag}>`;
  };

  const renderCluster = c => {
    const subCount = c.items && c.items.length ? c.items.length : 0;
    const leadHtml = renderClusterRow(c.lead, { isLead: true, subCount });
    if (!subCount) return leadHtml;
    return `<div class="art-cluster">
      ${leadHtml}
      <div class="cluster-sub-list" hidden>
        ${c.items.map(sub => renderClusterRow(sub, { isSub: true })).join('')}
      </div>
    </div>`;
  };
  const renderClusteredDayGroup = list => {
    const g = {};
    list.forEach(a => {
      const d = (a.t || a.d || '').slice(0, 10);
      (g[d] ||= []).push(a);
    });
    return Object.keys(g).sort().reverse().map(d => {
      const dayArticles = g[d];
      const clusters = clusterArticles(dayArticles);
      return `<div class="aday"><div class="aday-h">${NB.dayLabel(d)}<small>${dayArticles.length}건</small></div><div class="alist">${clusters.map(renderCluster).join('')}</div></div>`;
    }).join('');
  };

  const YRS = [...new Set(HI.map(x => x.d.slice(0, 4)))].sort();
  const yc = {}; HI.forEach(x => { const y = x.d.slice(0, 4); (yc[y] ||= {})[x.cat] = (yc[y][x.cat] || 0) + 1; });
  const cats = {}; HI.forEach(x => cats[x.cat] = (cats[x.cat] || 0) + 1);
  const CATS = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const mc = {}; HI.forEach(x => { const m = x.d.slice(0, 7); (mc[m] ||= {})[x.cat] = (mc[m][x.cat] || 0) + 1; });
  const mk = Object.keys(mc).sort(), mAll = [];
  if (mk.length) for (let d = new Date(mk[0] + '-01T00:00:00Z'); d.toISOString().slice(0, 7) <= mk[mk.length - 1]; d.setUTCMonth(d.getUTCMonth() + 1)) { const m = d.toISOString().slice(0, 7); mAll.push([m, mc[m] || {}]); }
  const press = AR?.top?.length ? AR.top : Object.entries(HI.reduce((o, x) => (x.press && (o[x.press] = (o[x.press] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const incLegal = HI.filter(x => x.cat === '법적');
  const incWarn = HI.filter(x => x.cat === '논란');
  const incPol = HI.filter(x => x.cat === '활동' || x.cat === '정책');
  const incGen = HI.filter(x => x.cat === '보도');
  const unSeg = [
    ['전체', HI.length],
    incLegal.length && ['사건·사고', incLegal.length],
    incWarn.length && ['의혹·논란', incWarn.length],
    incPol.length && ['정책·의정', incPol.length],
    incGen.length && ['일반 보도', incGen.length],
  ].filter(Boolean);

  const UN_FILTERS = {
    '전체': () => true,
    '사건·사고': x => x.cat === '법적',
    '의혹·논란': x => x.cat === '논란',
    '정책·의정': x => x.cat === '활동' || x.cat === '정책',
    '일반 보도': x => x.cat === '보도' || (!['법적', '논란', '활동', '정책'].includes(x.cat)),
  };

  const toA = r => Array.isArray(r) ? ({ t: r[0] || '', title: r[1], url: r[2], press: r[3], img: r[4] || '' }) : ({ t: r.t || '', title: r.title, url: r.url, press: r.press, img: r.img || '', desc: r.desc || '' });
  const articleKey = a => cleanText(NB.titleClean(a.title)).toLocaleLowerCase('ko-KR');
  const dedupeArticles = list => {
    const keys = new Set(), urls = new Set();
    return list.slice().sort((a, b) => String(b.t || '').localeCompare(String(a.t || ''))).filter(a => {
      const k = articleKey(a); if (!a?.url || !k || keys.has(k) || urls.has(a.url)) return false;
      keys.add(k); urls.add(a.url); return true;
    });
  };
  const lastA = dedupeArticles((AR?.last || []).map(toA));
  const totalNewsCount = Math.max(AR?.c || 0, HI.length);

  const news = [
    (HI.length || press.length) && `<div class="news-top${HI.length && press.length ? '' : ' news-top--1'}">
      ${HI.length ? `<div><div class="sub-h"><h3 class="sub-t">기록 추이 <small>${num(HI.length)}건</small></h3>${mAll.length > 24 ? NB.seg('nc', [['연도별'], ['월별']]) : ''}</div>
        <div id="nc0">${NB.vstack(YRS.map(y => [y, yc[y]]), CATS.map(([c]) => [c, NB.HCAT[c] || (c === '법적' ? 'neg' : c === '논란' ? 'warn' : c === '활동' ? 'pos' : 'mute')]), { lab: y => "'" + y.slice(2), lc: y => (+y % 2 ? 'is-odd' : '') })}</div>
        ${mAll.length > 24 ? `<div id="nc1" hidden>${NB.vstack(mAll, CATS.map(([c]) => [c, NB.HCAT[c] || (c === '법적' ? 'neg' : c === '논란' ? 'warn' : c === '활동' ? 'pos' : 'mute')]), { cls: 'vbars--m', lab: m => m.endsWith('-01') && +m.slice(0, 4) % 2 === 0 ? "'" + m.slice(2, 4) : '', lc: m => (+m.slice(0, 4) % 4 ? 'is-odd' : ''), tip: m => m.replace('-', '.') })}</div>` : ''}
        ${NB.stack(CATS.map(([c, n]) => [c, n, NB.HCAT[c] || (c === '법적' ? 'neg' : c === '논란' ? 'warn' : c === '활동' ? 'pos' : 'mute')]))}</div>` : ''}
      ${press.length ? `<div><h3 class="sub-t">많이 다룬 언론사 <small>${num(AR?.pc || press.length)}곳</small></h3>${NB.hbars(press.slice(0, 6))}</div>` : ''}</div>`,
    (B.iss || []).length && '<div class="issues">' + (B.iss || []).slice().reverse().slice(0, 3).map(([d, t, i]) => `<a class="issue" href="${B0}issue/${encodeURIComponent(i)}"><span class="tag acc">${ic('news')}오늘의 이슈</span><b>${esc(t)}</b><time>${NB.ymd(d)}</time>${ic('arrow-up-right')}</a>`).join('') + '</div>',
        /* 다중 썸네일 카드 가로 정렬 (최신순, 중복 배제, 최대 8건) */
    (() => {
      const pool = [];
      const seenUrls = new Set();
      const seenTitles = new Set();
      (B.pa || []).forEach(([t, title, url, pr, img]) => {
        if (url && !seenUrls.has(url) && img) {
          seenUrls.add(url); seenTitles.add(title);
          pool.push({ t, title, url, press: pr, img: photo(img) });
        }
      });
      const issueIds = new Set((B.iss || []).map(x => x[2]));
      (Voice?.issues || []).forEach(issue => {
        if (!issue.title.includes(nm) && !issueIds.has(issue.id) && !issueIds.has(issue.key)) return;
        const t = String(issue.d || issue.seen || '').replace(/^(\d{4})(\d{2})(\d{2}).*/, '$1-$2-$3').slice(0, 10);
        const title = issue.title;
        const img = issue.image || (issue.videos && issue.videos[0]?.thumb);
        const url = (issue.posts && issue.posts[0]?.url) || (issue.videos && issue.videos[0]?.url) || `${B0}issue/${encodeURIComponent(issue.id || issue.key)}`;
        const pr = (issue.videos && issue.videos[0]?.ch) || (issue.posts && issue.posts[0]?.src ? '오늘의 이슈' : '이슈');
        if (img && url && !seenUrls.has(url) && !seenTitles.has(title)) {
          seenUrls.add(url); seenTitles.add(title);
          pool.push({ t, title, url, press: pr, img: photo(img) });
        }
      });
      [...lastA, ...HI].forEach(a => {
        if (a && a.url && a.img && !seenUrls.has(a.url) && !seenTitles.has(a.title)) {
          seenUrls.add(a.url); seenTitles.add(a.title);
          pool.push({ t: a.t || a.d, title: a.title, url: a.url, press: a.press, img: photo(a.img) });
        }
      });
      pool.sort((a, b) => String(b.t || '').localeCompare(String(a.t || '')));
      const topCards = pool.slice(0, 8);
      return topCards.length ? `<div class="acards">${topCards.map(NB.acard).join('')}</div>` : '';
    })(),
    lastA.length && `<div style="margin-top:var(--s-8)"><div class="sub-h"><h3 class="sub-t">최근 주요 보도 <small>${lastA.length}건</small></h3></div>${renderClusteredDayGroup(lastA)}
      ${(AR?.c || 0) > lastA.length ? NB.exp('이전 보도 더 보기', num(AR.c - lastA.length) + '건', `<div id="arts"></div>`, false, 'x-arts') : ''}</div>`,
    HI.length && `<div style="margin-top:var(--s-8)">
      <div class="sub-h"><h3 class="sub-t">통합 기록 아카이브 <small>${num(HI.length)}건</small></h3>${unSeg.length ? `<div class="hist-f">${NB.seg('un', unSeg)}</div>` : ''}</div>
      <div id="hist"></div>
    </div>`,
  ].filter(Boolean);
  if (news.length) add('s-news', '보도·사건사고', 'file-text', num(totalNewsCount) + '건', news.join(''));

  app.innerHTML = top + (SEC.length ? `<div class="body"><aside>${NB.toc(SEC)}${NB.toc(SEC, 'toc--bar')}</aside><div class="main">${SEC.map(x => x.html).join('')}</div></div>` : '');
  NB.bind();
  /* 상호작용 */
  const gt = i => document.querySelectorAll('#gt .gantt-r').forEach((r, k) => r.hidden = i === 0 && !MAIN.has(rows[k].typ));
  if (main.length && main.length < rows.length) gt(0);

  const renderSpeech = i => {
    const host = document.getElementById('quote-list'); if (!host) return;
    const more = document.getElementById('quote-more');
    if (i === 0) {
      host.className = 'quotes-agendas';
      host.innerHTML = renderAgendaCards();
      if (more) more.hidden = true;
    } else if (i === 1) {
      host.className = 'quotes';
      const list = hotQuotes.length ? hotQuotes : Q.slice(0, 6);
      host.innerHTML = list.map(NB.quote).join('');
      if (more) more.hidden = true;
    } else if (i === 2) {
      host.className = 'quotes';
      host.innerHTML = Q.slice(0, 10).map(NB.quote).join('');
      if (more) {
        more.hidden = false;
        more.innerHTML = Q.length > 10 ? NB.exp('이전 발언 더 보기', (Q.length - 10) + '건', `<div class="quotes">${Q.slice(10).map(NB.quote).join('')}</div>`) : '';
      }
    } else {
      const ag = speechAgendas[i - 3];
      host.className = 'quotes--compare';
      host.innerHTML = ag
        ? `<p class="compare-topic"><b>‘${esc(ag.term)}’</b> 관련 인용 ${ag.items.length}건 <span>오래된 발언부터 순서대로 배치된 타임라인입니다.</span></p><div class="speech-timeline">${ag.items.map(q => `<div class="speech-row"><div class="speech-phase"><time>${esc(NB.ymd(q.d))}</time><span class="phase-src">${esc(q.press || '')}</span></div><div class="speech-body"><blockquote class="speech-quote">“${esc(q.quote)}”</blockquote>${q.title ? `<div class="speech-ctx">${esc(q.title)}</div>` : ''}</div></div>`).join('')}</div>`
        : '';
      if (more) more.hidden = true;
    }
  };

  const histList = (hostId, list, step = 35) => {
    const host = document.getElementById(hostId); if (!host) return;
    host.innerHTML = '';
    host.nextElementSibling?.classList.contains('more-b') && host.nextElementSibling.remove();
    const clusters = clusterArticles(list);
    const c = {};
    clusters.forEach(x => { const m = (x.lead.d || x.lead.t || '').slice(0, 7); c[m] = (c[m] || 0) + 1; });

    /* 월별 그룹 렌더러 (상단 분석 브리핑 카드 + 근거 기사 목록) */
    const put = NB.grouper(host, x => (x.lead.d || x.lead.t || '').slice(0, 7), m => {
      const ymLabel = NB.ym(m);
      const totalCount = c[m] || 0;
      const monthClusters = clusters.filter(cl => (cl.lead.d || cl.lead.t || '').slice(0, 7) === m);
      const allMonthTokens = new Map();
      let legalCount = 0, issueCount = 0, policyCount = 0;
      monthClusters.forEach(cl => {
        (cl.tokens || []).forEach(tok => allMonthTokens.set(tok, (allMonthTokens.get(tok) || 0) + 1));
        const cat = cl.lead.cat || inferCat(cl.lead.title);
        if (cat === '법적') legalCount += 1 + cl.items.length;
        else if (cat === '논란') issueCount += 1 + cl.items.length;
        else policyCount += 1 + cl.items.length;
      });
      const topTokens = [...allMonthTokens.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
      const mainCat = legalCount > issueCount && legalCount > policyCount ? '사법·수사 이슈' : (issueCount > policyCount ? '의혹·공방 이슈' : '정책·의정 활동');
      const briefSummary = `${NB.ym(m)} 총 ${totalCount}개 보도 군집이 분석되었으며, 주로 <b>${mainCat}</b> 관련 보도가 집중되었습니다. 아래 목록은 해당 분석의 근거 기사들입니다.`;

      const analysisCardHtml = `
        <div class="archive-analysis-card">
          <div class="aac-head">
            <span class="aac-title">📊 ${ymLabel} 인텔리전스 분석 브리핑</span>
            ${topTokens.length ? `<div class="aac-tags">${topTokens.map(t => `<span class="aac-tag">#${esc(t)}</span>`).join('')}</div>` : ''}
          </div>
          <p class="aac-summary">${briefSummary}</p>
        </div>
      `;
      return `${analysisCardHtml}<div class="aday-label">${ymLabel}<small>${totalCount}건</small></div>`;
    }, renderCluster);

    NB.more(host, clusters.length, step, (a, b) => put(clusters.slice(a, b)));
  };
  if (HI.length) histList('hist', HI, 35);
  let artsOn = false;
  const arts = async () => {
    if (artsOn || !AR) return; artsOn = true;
    const host = document.getElementById('arts'); if (!host) return;
    const seen = new Set(lastA.map(articleKey));
    let all = [];
    if (B.ea && AR.c < 200) { try { all = (await NB.load(`${RAW}data/db/entities/${B.ea}.json`)).timeline.filter(a => a.title.includes(nm)).map(toA); } catch (e) { } }
    if (!all.length) {
      const mons = [...new Set((AR.m || []).map(m => m[0]))].sort().reverse();
      for (const m of mons) for (const f of AR.f) { try { all.push(...(await gz(`${RAW}data/db/people/${f}/${m}.json.gz`)).map(toA)); } catch (e) { } }
    }
    const dn = {}, uniq = [];
    for (const a of dedupeArticles(all)) { const k = articleKey(a); if (seen.has(k)) continue; seen.add(k); uniq.push(a); const d = (a.t || '').slice(0, 10); dn[d] = (dn[d] || 0) + 1; }
    const clusters = clusterArticles(uniq);
    const put = NB.grouper(host, c => (c.lead.t || c.lead.d || '').slice(0, 10) || '날짜 미상', d => `${d.length === 10 ? NB.dayLabel(d) : esc(d)}<small>${dn[d] || ''}건</small>`, renderCluster);
    NB.more(host, clusters.length, 35, (a, b) => put(clusters.slice(a, b)));
  };

  document.addEventListener('click', e => {
    if (e.target.closest('#x-arts > .exp-b')) arts();
    const t = e.target.closest('[data-cat]');
    if (t) {
      const catName = t.dataset.cat;
      const targetSeg = catName === '법적' ? '사건·사고' : catName === '논란' ? '의혹·논란' : (catName === '활동' || catName === '정책') ? '정책·의정' : '일반 보도';
      const i = unSeg.findIndex(([n]) => n === targetSeg);
      if (i >= 0) {
        const segBtn = document.querySelector(`[data-seg="un"] .seg-i[data-i="${i}"]`);
        if (segBtn) {
          segBtn.click();
          segBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  });

  document.addEventListener('seg', e => {
    const { name, i } = e.detail;
    if (name === 'gt') gt(i);
    if (name === 'tl') { const f = NB.FILTERS[i][1]; document.querySelectorAll('.tl-i').forEach((li, k) => li.hidden = !f(timeline[k])); }
    if (name === 'sq') renderSpeech(i);
    if (name === 'nc') { document.getElementById('nc0').hidden = i !== 0; document.getElementById('nc1').hidden = i !== 1; }
    if (name === 'bill') { const v = e.target.querySelectorAll('.seg-i')[i].firstChild.textContent; document.querySelectorAll('.brow--bill').forEach(r => r.hidden = i !== 0 && r.dataset.res !== v); }
    if (name === 'un') {
      const c = unSeg[i][0];
      const filtered = HI.filter(UN_FILTERS[c] || (x => x.cat === c));
      histList('hist', filtered, 35);
    }
  });

  if (SEC.length) NB.spy(SEC.map(x => x.id));
  NB.openAll();
  if (/[?&]open=1/.test(location.search)) await arts();
  document.body.dataset.ready = '1';
})();
