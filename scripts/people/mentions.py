#!/usr/bin/env python3
"""기사 → 인물 타임라인: python scripts/people/mentions.py <data 폴더>
수집해 둔 모든 기사(db/articles, db/articles_global)를 인물 명부(registry.json.gz)와 맞춰, 등장한 인물마다 월별 파일에 차곡차곡 쌓는다.
- 처리한 기사 파일은 state.json에 적어 두고, 아직 안 본 파일만 읽음(빠뜨린 회차도 다음에 이어서 처리)
- 기록은 지우지 않음: db/people/t/<앞 2자리>/<인물>/<YYYY-MM>.json.gz (같은 기사는 한 번만)
- 동명이인: 제목의 직함·분야 단서(의원·배우·선수…)로 고르고, 단서가 없으면 더 유명한 사람에게. amb에 후보 수를 남겨 나중에 바로잡을 수 있게
- 명부에 없는 새 인물: '배우 ○○○', '○○○ 의원' 같은 표현이 서로 다른 기사 3건 이상이면 discovered.json에 올려 다음 명부에 넣음"""
import os, re, sys, json, gzip, glob, hashlib, collections, time
ROOT = sys.argv[1] if len(sys.argv) > 1 else 'data'
PD = os.path.join(ROOT, 'db', 'people'); TD = os.path.join(PD, 't'); os.makedirs(TD, exist_ok=True)
DEADLINE = time.time() + float(os.environ.get('PEOPLE_SEC', '240'))
def jl(p, d):
    try: return json.load(gzip.open(p, 'rt', encoding='utf-8') if p.endswith('.gz') else open(p))
    except Exception: return d
def jw(p, o, gz=False):
    os.makedirs(os.path.dirname(p), exist_ok=True); tmp = p + '.tmp'
    with (gzip.open(tmp, 'wt', encoding='utf-8', compresslevel=9) if gz else open(tmp, 'w')) as f: json.dump(o, f, ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, p)
REG = jl(os.path.join(PD, 'registry.json.gz'), [])
DISC = jl(os.path.join(PD, 'discovered.json'), {})
for n, v in DISC.items():
    if v.get('ok'): REG.append(dict(id='nw:' + n, n=n, d=v.get('role', ''), k=v.get('k', ''), sl=1, src='news'))
if not REG: print('people: 명부 없음(people.yml 먼저)'); raise SystemExit(0)
JOSA = set('은 는 이 가 을 를 의 에 와 과 도 만 께 랑 이랑 에게 한테 에서 으로 로 과의 와의 이다 였다 이었다 측 씨 등 측은 씨는 씨가 씨의 부부 일가 母 父'.split())
ROLE = ('의원', '대표', '장관', '대통령', '총리', '위원장', '후보', '시장', '지사', '군수', '구청장', '판사', '검사', '변호사', '대법관', '감독', '선수', '코치', '회장', '부회장', '사장',
        '교수', '작가', '기자', '앵커', '배우', '가수', '전', '前', '측', '씨', '대변인', '원내대표', '비서실장', '실장', '청장', '총장', '이사장', '주연')
HINT = [('정치', r'의원|국회|당 |여당|야당|장관|대통령|총리|선거|공천|원내|지사|시장|구청장'), ('법조', r'판사|검사|변호사|재판|판결|기소|선고|검찰|법원|대법'),
        ('연예', r'배우|가수|드라마|영화|컴백|앨범|예능|아이돌|콘서트|팬|열애|결혼|방송'), ('스포츠', r'선수|감독|골|홈런|경기|우승|리그|시즌|올림픽|국가대표|이적'),
        ('경제', r'회장|사장|그룹|기업|주가|CEO|대표이사|인수|투자|삼성|현대|SK|LG'), ('정치', r'북한|北|평양|노동당|미사일|위원장'), ('인플루언서', r'유튜버|유튜브|스트리머|BJ|인플루언서|구독자|틱톡')]
# 이름 → 후보
IDX = collections.defaultdict(list)
for p in REG:
    sl = p.get('sl', 0)
    for nm in [p['n']] + (p.get('al') or []):
        nm = nm.strip()
        if re.fullmatch(r'[가-힣]+', nm):
            if len(nm) < 2 or (len(nm) == 2 and sl < 40): continue
        elif re.fullmatch(r'[A-Za-z][A-Za-z0-9.\-]*', nm):
            if len(nm) < 2 or sl < 40: continue
        elif not re.fullmatch(r'[가-힣A-Za-z.\-]+(?: [가-힣A-Za-z.\-]+){1,3}', nm): continue
        IDX[nm].append(p)
MAXLEN = 5
# 사람 이름이면서 장소·흔한 말인 것(이태원 참사, 노조 강성은…)
STOP = set('이태원 한남동 명동 남산 한강 동해 서해 남해 독도 광화문 여의도 용산 강남 서초 마포 종로 성수 판교 세종 대구 부산 인천 광주 대전 울산 제주 경주 전주 수원 성남 고양 용인 화성 평택 안산 강성 한국인 국민 정부 대통령 신기록 신세계 대한민국 조선 고려 백제 신라'.split())
JEND = set('은는이가을를의도만와과로')
def hints(title): return {k for k, rx in HINT if re.search(rx, title)}
def pick(C, title):
    if len(C) == 1: return C[0]
    h = hints(title); m = [c for c in C if c.get('k') in h]
    return max(m or C, key=lambda c: (c.get('k') == '정치' and '현직' in c.get('d', ''), c.get('sl', 0)))
def find(title):
    out = {}
    runs = list(re.finditer(r'[가-힣]+|[A-Za-z][A-Za-z0-9.\-]*', title))
    for i, m in enumerate(runs):
        w = m.group()
        if re.match(r'[가-힣]', w):
            for L in range(min(MAXLEN, len(w)), 1, -1):
                nm, rest = w[:L], w[L:]
                if nm in IDX and nm not in STOP and (not rest or rest in JOSA or rest.startswith(ROLE)):
                    # '강성은'처럼 끝 글자가 조사와 같은 이름: 아주 유명하거나 제목에 분야 단서가 맞을 때만
                    if not rest and nm[-1] in JEND and max(c.get('sl', 0) for c in IDX[nm]) < 40 and not ({c.get('k') for c in IDX[nm]} & hints(title)): break
                    # 두 글자 이름(공유·지수·수지)은 흔한 말과 겹쳐서, 직함이 붙거나 분야 단서가 맞을 때만
                    if len(nm) == 2 and not rest.startswith(ROLE) and not ({c.get('k') for c in IDX[nm]} & hints(title)): break
                    out[nm] = IDX[nm]; break
        elif w in IDX: out[w] = IDX[w]
        # 띄어 쓴 이름(해외 인물 '일론 머스크', '도널드 트럼프')
        for k in (2, 3):
            if i + k <= len(runs) and all(runs[j + 1].start() - runs[j].end() == 1 for j in range(i, i + k - 1)):
                full = ' '.join(r.group() for r in runs[i:i + k]); last = runs[i + k - 1].group()
                for L in range(len(last), 0, -1):
                    nm = full[:len(full) - len(last) + L]; rest = last[L:]
                    if nm in IDX and (not rest or rest in JOSA): out[nm] = IDX[nm]; break
    return out
SUR = set('김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경')
DROLE = r'(배우|가수|유튜버|크리에이터|스트리머|인플루언서|모델|방송인|판사|검사|변호사|의원|감독|선수|작가|교수|앵커|아나운서|래퍼|BJ)'
DK = {'배우': '연예', '가수': '연예', '모델': '연예', '방송인': '연예', '래퍼': '연예', '아나운서': '연예', '유튜버': '인플루언서', '크리에이터': '인플루언서', '스트리머': '인플루언서',
      '인플루언서': '인플루언서', 'BJ': '인플루언서', '판사': '법조', '검사': '법조', '변호사': '법조', '의원': '정치', '감독': '스포츠', '선수': '스포츠', '작가': '문화', '교수': '학계', '앵커': '언론'}
def discover(title, url):
    for m in re.finditer(DROLE + r'\s+([가-힣]{3})(?![가-힣])', title):
        yield m.group(2), m.group(1)
    for m in re.finditer(r'(?<![가-힣])([가-힣]{3})\s?' + DROLE + r'(?![가-힣])', title):
        yield m.group(1), m.group(2)
ST = jl(os.path.join(PD, 'state.json'), {}); done = set(ST.get('files', []))
files = sorted(glob.glob(os.path.join(ROOT, 'db', 'articles', '*', '*.json.gz')) + glob.glob(os.path.join(ROOT, 'db', 'articles_global', '*', '*.json.gz')))
todo = [f for f in files if os.path.relpath(f, ROOT) not in done]
INDEX = jl(os.path.join(PD, 'index.json'), {}); buf = collections.defaultdict(list); nart = nm_ = 0
def key(pid): return re.sub(r'[^A-Za-z0-9가-힣_-]', '_', pid.replace(':', '_'))
for f in todo:
    if time.time() > DEADLINE: break
    gl = '/articles_global/' in f
    for a in jl(f, []):
        title = a.get('title') or ''; t = a.get('t') or ''
        if not title or not a.get('url'): continue
        nart += 1
        for nm, C in find(title).items():
            p = pick(C, title); nm_ += 1
            it = [t[:16], title, a['url'], a.get('press') or '', 'g' if gl else 'k'] + ([len(C)] if len(C) > 1 else [])
            buf[(p['id'], (t[:7] or f.split(os.sep)[-2][:7]))].append(it)
            x = INDEX.setdefault(p['id'], dict(n=p['n'], k=p.get('k', ''), d=(p.get('d') or '')[:60], c=0))
            x['last'] = max(x.get('last', ''), t[:10]); x['first'] = min(x.get('first') or '9', t[:10] or '9')
        if not gl:
            for n, role in discover(title, a['url']):
                if n[0] not in SUR or n in IDX: continue
                v = DISC.setdefault(n, dict(role=role, k=DK.get(role, ''), u=[]))
                if a['url'] not in v['u'] and len(v['u']) < 5: v['u'].append(a['url'])
                if len(v['u']) >= 3: v['ok'] = 1
    done.add(os.path.relpath(f, ROOT))
for (pid, mon), items in buf.items():
    p = os.path.join(TD, hashlib.md5(pid.encode()).hexdigest()[:2], key(pid), mon + '.json.gz')
    old = jl(p, []); have = {x[2] for x in old}
    new = [x for x in items if x[2] not in have and not have.add(x[2])]
    if new: jw(p, sorted(old + new, key=lambda x: x[0], reverse=True), gz=True); INDEX[pid]['c'] += len(new)
    INDEX[pid]['f'] = os.path.relpath(os.path.dirname(p), PD)
jw(os.path.join(PD, 'index.json'), INDEX); jw(os.path.join(PD, 'discovered.json'), DISC)
jw(os.path.join(PD, 'state.json'), dict(files=sorted(done), updated=time.strftime('%Y-%m-%dT%H:%M'), people=len(INDEX), registry=len(REG)))
print(f'people: 파일 {len(todo)}개 중 처리, 기사 {nart}, 인물 언급 {nm_}, 기록된 인물 {len(INDEX)}, 새 인물 후보 {sum(1 for v in DISC.values() if v.get("ok"))}')
