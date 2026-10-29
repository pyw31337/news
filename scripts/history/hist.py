#!/usr/bin/env python3
"""과거 뉴스 히스토리 수집기 (수년~수십년 타임라인용) — 무료·합법 공개 출처만.
출처: ① 구글뉴스 RSS 기간 검색(after:/before:, 2008년경~) ② 한국어 위키백과 'YYYY년 대한민국' 연표(1948년~)
     ③ Wikidata(CC0) 인물 목록·수상 기록. 기사 본문은 저장하지 않고 제목·언론사·날짜·링크·짧은 요약만 저장(메타데이터).
저장: git 'history' 브랜치(정적 JSON, D1 사용 안 함 → 쓰기 한도와 무관).
  h/index.json               대상별 수집 현황
  h/p/<id>.json              인물별 블랙박스(발언·논란·수상·활동 분류)
  h/i/<slug>.json            반복 이슈별 기사 연표
  h/y/<YYYY>.json            연도별 대한민국 주요 사건(위키백과)
  h/targets.json, h/state.json
사용: python hist.py <history 폴더> seed [politicians 폴더]
      python hist.py <history 폴더> run <분>      (시간 예산 안에서 우선순위 순으로 이어서 수집)
      python hist.py <history 폴더> years <시작년> <끝년>
"""
import json, os, re, sys, time, html, hashlib, datetime, urllib.request, urllib.parse
from email.utils import parsedate_to_datetime
OUT = sys.argv[1]; CMD = sys.argv[2]
UA = 'Mozilla/5.0 (NewsBoardHistory; https://pyw31337.github.io/news/)'
NOW = datetime.date.today(); Y0 = 2005
os.makedirs(f'{OUT}/h/p', exist_ok=True); os.makedirs(f'{OUT}/h/i', exist_ok=True); os.makedirs(f'{OUT}/h/y', exist_ok=True)
def get(u, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=40) as f: return f.read()
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(4 * (i + 1))
def jl(p, d=None):
    try: return json.load(open(p))
    except Exception: return d
def jw(p, o): json.dump(o, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
H = lambda s: hashlib.sha1(s.encode()).hexdigest()[:12]
nt = lambda t: re.sub(r'[\W_]+', '', t)[:40]

# ---------- 분류(블랙박스) ----------
CLS = [('논란', r'논란|의혹|혐의|폭로|사과문|사과했|해명|구설|비난|고소|피소|입건|기소|음주운전|학폭|갑질|탈세|표절|마약|불법|징계'),
       ('법적', r'판결|선고|무죄|유죄|재판|법원|검찰 조사|경찰 조사|소송'),
       ('발언', r'발언|밝혔|말했|소신|입장 밝|인터뷰|고백|언급|일침|저격|심경|반박|주장|강조했|호소'),
       ('수상', r'수상|대상 |신인상|최우수|트로피|시상식'),
       ('활동', r'출연|컴백|발매|개봉|데뷔|캐스팅|공연|콘서트|앨범|드라마|영화|결혼|입대|전역|계약|출마|당선|임명|취임|법안|발의|선출')]
QRX = r'["“]([^"”]{6,80})["”]'
def classify(t, n=''):
    sp = bool(n) and re.search(re.escape(n) + r'[^"“]{0,12}["“]', t) and re.search(QRX, t)
    for k, rx in CLS:
        if re.search(rx, t): return k if not (k in ('활동', '수상') and sp) else '발언'
    return '발언' if sp else '보도'
def quote(t, c):
    if c != '발언': return ''
    m = re.search(QRX, t); return m.group(1) if m else ''
YCAP = 40  # 연도별 '보도' 상한(분류된 발언·논란·수상·법적·활동은 모두 보관)
def pack(t, L):
    """압축 형식: o=언론사 목록, it=[날짜, 제목, 언론사번호, 분류, 인용]"""
    O = {}; it = []; per = {}
    for x in L:
        if t['k'] == 'p':
            c = classify(x['t'], t['n'])
            if c == '보도':
                y = x['d'][:4]; per[y] = per.get(y, 0) + 1
                if per[y] > YCAP: continue
        else: c = ''
        oi = O.setdefault(x.get('o', ''), len(O)); r = [x['d'], x['t'], oi, c]
        q = quote(x['t'], c)
        if q: r.append(q)
        it.append(r)
    return {'n': t['n'], 'occ': t.get('occ', ''), 'k': t['k'], 'upd': NOW.isoformat(), 'o': list(O), 'it': it}
def unpack(d):
    if not d: return []
    return [{'d': r[0], 't': r[1], 'o': d['o'][r[2]]} for r in d.get('it', [])]
import gzip
def gzw(p, o):
    with gzip.open(p, 'wt', encoding='utf-8', compresslevel=9) as f: json.dump(o, f, ensure_ascii=False, separators=(',', ':'))
def gzr(p):
    try:
        with gzip.open(p, 'rt', encoding='utf-8') as f: return json.load(f)
    except Exception: return None

# ---------- 구글뉴스 기간 검색 ----------
def gnews(q, a, b):
    u = 'https://news.google.com/rss/search?' + urllib.parse.urlencode({'q': f'{q} after:{a} before:{b}', 'hl': 'ko', 'gl': 'KR', 'ceid': 'KR:ko'})
    x = get(u).decode('utf-8', 'ignore'); out = []
    for it in re.findall(r'<item>(.*?)</item>', x, re.S):
        g = lambda tag: html.unescape((re.search(f'<{tag}[^>]*>(.*?)</{tag}>', it, re.S) or [None, ''])[1])
        t = g('title'); src = g('source'); link = g('link')
        try: d = parsedate_to_datetime(g('pubDate')).date().isoformat()
        except Exception: continue
        if src and t.endswith(' - ' + src): t = t[:-len(src) - 3]
        desc = re.sub(r'<[^>]+>', ' ', html.unescape(g('description'))); desc = re.sub(r'\s+', ' ', desc).strip()
        s = '' if t[:20] in desc else desc[:140]
        out.append({'t': t.strip(), 'o': src, 'd': d})
    return out
def windows(y0, y1):
    for y in range(y0, y1 + 1): yield f'{y}-01-01', f'{y+1}-01-01', y
def harvest(q, y0, items, seen, req):
    """연 단위로 받고, 결과가 100건(상한)이면 분기 단위로 쪼개 더 받음"""
    for a, b, y in windows(y0, NOW.year):
        if f'{y}' in seen: continue
        r = gnews(q, a, b); req[0] += 1; time.sleep(0.6)
        if len(r) >= 95:
            for qa, qb in [('01-01', '04-01'), ('04-01', '07-01'), ('07-01', '10-01'), ('10-01', None)]:
                rr = gnews(q, f'{y}-{qa}', f'{y}-{qb}' if qb else f'{y+1}-01-01'); req[0] += 1; r += rr; time.sleep(0.6)
        for it in r:
            k = nt(it['t'])
            if k and k not in items: items[k] = it
        if y < NOW.year: seen.append(f'{y}')
    return items

# ---------- 대상 목록 ----------
ISSUES = ['의대 증원','부동산 대책','최저임금','북한 핵실험','저출산','국민연금 개혁','기준금리','전세사기','검찰개혁','대통령 탄핵','세월호','이태원 참사','미세먼지','사드 배치','한일 위안부 합의','강제징용 배상','후쿠시마 오염수','원전 정책','가상화폐 규제','종합부동산세','공매도','반도체 수출','한미 FTA','남북정상회담','코로나19','대학 입시 수시','교권 침해','층간소음','청년 실업','노란봉투법','주 52시간','택시 플랫폼 타다','카카오 먹통','LH 투기','대장동','검수완박','여성가족부 폐지','의료 파업','학교폭력','K팝 표절','아이돌 전속계약 분쟁','마약 연예인','전기요금 인상','가계부채','PF 부실','쌀값','저유가','고환율','조선업 수주','한류']
SP = 'https://query.wikidata.org/sparql?'
OCC = {'Q33999':'배우','Q10800557':'배우','Q10798782':'배우','Q177220':'가수','Q488111':'가수','Q2405480':'방송인','Q947873':'방송인','Q245068':'코미디언','Q639669':'가수','Q753110':'가수','Q15077007':'유튜버','Q17125263':'유튜버','Q4610556':'모델','Q130857':'DJ'}
def seed():
    T = []
    pd = sys.argv[3] if len(sys.argv) > 3 else None
    if pd and os.path.exists(f'{pd}/index.json'):
        ppl = json.load(open(f'{pd}/index.json'))['people']
        ppl.sort(key=lambda p: (p.get('news') or 0) * 3 + (60 if p.get('current') else 0) + len(p.get('ages') or []) * 6, reverse=True)
        for p in ppl: T.append({'k': 'p', 'id': 'a' + str(p['id']), 'n': p['name'], 'q': f'"{p["name"]}" 의원', 'y0': max(Y0, int((p.get('birth') or '1960')[:4]) + 25), 'occ': '정치인', 'pri': 1000 + (p.get('news') or 0)})
    q = '''SELECT ?p ?n ?b ?o ?sl ?t (GROUP_CONCAT(DISTINCT ?al;separator="|") AS ?als) WHERE { ?p wdt:P27 wd:Q884; wdt:P106 ?o. VALUES ?o {%s}
      ?s schema:about ?p; schema:isPartOf <https://ko.wikipedia.org/>; schema:name ?t. ?p rdfs:label ?n FILTER(lang(?n)="ko")
      OPTIONAL{?p wdt:P569 ?b} ?p wikibase:sitelinks ?sl. FILTER NOT EXISTS{?p wdt:P570 ?dd}
      OPTIONAL{?p skos:altLabel ?al FILTER(lang(?al)="ko")} } GROUP BY ?p ?n ?b ?o ?sl ?t''' % ' '.join('wd:' + k for k in OCC)
    rows = []
    for oc in OCC:  # 직업별로 나눠 요청(한 번에 하면 시간 초과)
        qq = q.replace('VALUES ?o {%s}' % ' '.join('wd:' + k for k in OCC), 'VALUES ?o {wd:%s}' % oc)
        for i in range(3):
            try: rows += json.loads(get(SP + urllib.parse.urlencode({'query': qq, 'format': 'json'})))['results']['bindings']; break
            except Exception as e: print('wikidata 재시도', oc, e); time.sleep(10)
        time.sleep(2)
    E = {}
    for r in rows:
        qid = r['p']['value'].rsplit('/', 1)[1]; b = r.get('b', {}).get('value', '')[:4]
        if b and b.isdigit() and int(b) > NOW.year - 19: continue  # 미성년자 제외
        oc = OCC[r['o']['value'].rsplit('/', 1)[1]]
        e = E.setdefault(qid, {'k': 'p', 'id': qid, 'n': re.sub(r'\s*\(.*\)$', '', r['n']['value']).strip(), 'occ': oc, 'sl': int(r['sl']['value']), 'b': b})
        if oc == '가수': e['occ'] = oc  # 가수 겸 배우는 가수로(뷔·아이유 등)
        # 활동명: 위키백과 문서 제목(괄호 앞) — '제니 김' → '제니', '김남준' → 'RM'
        tt = re.sub(r'\s*\(.*\)$', '', r.get('t', {}).get('value', '')).strip()
        al = [a for a in r.get('als', {}).get('value', '').split('|') if a]
        if tt and tt != e['n'] and (tt in al or tt in e['n'] or re.fullmatch(r'[A-Za-z0-9 .\-]{1,12}', tt)):
            lb = re.sub(r'\s*\(.*\)$', '', e['n']).strip(); e['n'] = tt
            if lb != tt: e['al'] = [lb]
    names = {}
    for e in E.values(): names[e['n']] = names.get(e['n'], 0) + 1
    for e in E.values():
        amb = names[e['n']] > 1 or len(e['n']) <= 2
        nm = f'"{e["n"]}"' if not e.get('al') else '(' + ' OR '.join(f'"{x}"' for x in [e['n']] + e['al']) + ')'
        e['q'] = f'{nm} {e["occ"]}' if amb or e['sl'] < 15 or e.get('al') else nm
        e['y0'] = max(Y0, int(e['b']) + 15) if e['b'].isdigit() else Y0
        e['pri'] = e['sl'] * 20; T.append(e)
    for s in ISSUES: T.append({'k': 'i', 'id': H(s), 'n': s, 'q': s, 'y0': Y0, 'pri': 5000})
    T.sort(key=lambda t: -t['pri']); jw(f'{OUT}/h/targets.json', T)
    print('대상', len(T), '정치인', sum(t.get('occ') == '정치인' for t in T), '연예·인플루언서', len(E), '이슈', len(ISSUES))

def run(minutes):
    T = jl(f'{OUT}/h/targets.json', []); S = jl(f'{OUT}/h/state.json', {}); IX = jl(f'{OUT}/h/index.json', {})
    end = time.time() + minutes * 60; req = [0]; done = 0; fails = 0; t0 = time.time()
    # 아직 안 끝난 대상 우선, 그다음 마지막 갱신이 오래된 순(올해 분만 다시)
    for t in T:  # 검색어(활동명)가 바뀐 대상은 처음부터 다시, 맨 앞으로
        st = S.get(t['id'])
        if st and st.get('q') != t['q'] and (st.get('q') or t.get('al') or IX.get(t['id'], {}).get('n') != t['n']): st.update(seen=[], full=0, at=0, q=t['q'])
    order = sorted(T, key=lambda t: (S.get(t['id'], {}).get('full', 0), S.get(t['id'], {}).get('at', 0), -t['pri']))
    for t in order:
        if time.time() > end: break
        st = S.setdefault(t['id'], {'seen': [], 'full': 0, 'at': 0})
        st['q'] = t['q']
        path = f'{OUT}/h/{t["k"]}/{t["id"]}.json.gz'
        items = {nt(x['t']): x for x in unpack(gzr(path))}
        try: harvest(t['q'], t.get('y0', Y0), items, st['seen'], req)
        except Exception as e:
            print('실패', t['n'], e); fails += 1; time.sleep(30)
            if fails >= 5: print('연속 실패 → 이번 회차 중단(속도 제한 보호)'); break
            continue
        fails = 0
        # 인물은 제목에 이름이 들어간 기사만(동명이인·무관 기사 거름)
        L = sorted((x for x in items.values() if t['k'] != 'p' or any(n in x['t'] for n in [t['n']] + t.get('al', []))), key=lambda x: x['d'])
        doc = pack(t, L); gzw(path, doc); L = doc['it']
        st['full'] = 1; st['at'] = int(time.time()); done += 1
        ys = sorted({x[0][:4] for x in L}); cc = {}
        for x in L: cc[x[3]] = cc.get(x[3], 0) + 1
        IX[t['id']] = {'k': t['k'], 'n': t['n'], 'al': t.get('al', []), 'occ': t.get('occ', ''), 'c': len(L), 'y': [ys[0], ys[-1]] if ys else None, 'cc': cc}
    jw(f'{OUT}/h/state.json', S); jw(f'{OUT}/h/index.json', IX)
    el = time.time() - t0; tot = sum(v['c'] for v in IX.values())
    m = {'at': datetime.datetime.now().isoformat(timespec='minutes'), 'targets_done_run': done, 'requests': req[0], 'sec': round(el), 'sec_per_target': round(el / max(done, 1), 1),
         'targets_total': len(T), 'targets_full': sum(1 for v in S.values() if v.get('full')), 'items_total': tot}
    log = jl(f'{OUT}/h/runs.json', []); log.append(m); jw(f'{OUT}/h/runs.json', log[-200:]); print(json.dumps(m, ensure_ascii=False))

KR = r'대한민국|한국|서울|부산|국회|청와대|대통령실|북한|조선민주주의|남북|국군|코스피|한국은행|삼성|현대|K팝|KBS|MBC|SBS|검찰|대법원|헌법재판소'
def wtxt(t):
    t = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', t)
    t = re.sub(r"\{\{[^}]*\}\}|<ref[^>]*/>|<ref.*?</ref>|'{2,3}", '', t)
    return re.sub(r'\s+', ' ', t).strip()
def years(a, b):
    """한국어 위키백과 연도 문서(YYYY년)의 '사건' 절 → 날짜별 사건. 한국 관련은 kr=1"""
    for y in range(a, b + 1):
        try: x = get('https://ko.wikipedia.org/w/index.php?' + urllib.parse.urlencode({'title': f'{y}년', 'action': 'raw'})).decode()
        except Exception: continue
        m = re.search(r'==\s*사건\s*==(.*?)\n==[^=]', x, re.S); body = m.group(1) if m else ''
        ev = []; cur = None
        for ln in body.split('\n'):
            m1 = re.match(r'\*\s*\[\[(\d{1,2})월 (\d{1,2})일\]\](.*)', ln)
            if m1:
                cur = f'{y}-{int(m1.group(1)):02d}-{int(m1.group(2)):02d}'
                rest = re.sub(r'^\s*(~\s*\[\[[^\]]*\]\])?\s*[-–:]\s*', '', m1.group(3))
                if wtxt(rest): ev.append({'d': cur, 't': wtxt(rest)[:220]})
            elif ln.startswith('**') and cur: ev.append({'d': cur, 't': wtxt(ln.lstrip('* '))[:220]})
        for e in ev:
            if re.search(KR, e['t']): e['kr'] = 1
        if ev: jw(f'{OUT}/h/y/{y}.json', {'y': y, 'src': f'https://ko.wikipedia.org/wiki/{y}년', 'lic': 'CC BY-SA 4.0', 'ev': ev})
        print(y, len(ev), sum(1 for e in ev if e.get('kr'))); time.sleep(0.4)

if CMD == 'seed': seed()
elif CMD == 'run': run(float(sys.argv[3]))
elif CMD == 'years': years(int(sys.argv[3]), int(sys.argv[4]))
