# 법률 데이터 지속 수집 (admin 전용, 공개 링크 없음). 저장: 'legal' 브랜치의 legal/v1/ (D1 사용 안 함)
# 나중에 독립 서비스로 떼어낼 수 있도록 뉴스보드 코드와 분리된 스키마·폴더를 씀. 스키마: legal/v1/SCHEMA.md
# 안전장치(docs/LEGAL_ARCHIVE.md): 사건 당사자 이름·기사 제목 저장 안 함, 판사·변호사 순위/승소율 없음, 성범죄 피해 관련 상세 제외.
import json, os, sys, re, gzip, time, html, subprocess, urllib.request as ur, urllib.parse as up, xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
ROOT = sys.argv[1]; OUT = os.path.join(ROOT, 'legal', 'v1'); os.makedirs(OUT, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__)); SCR = os.path.dirname(HERE)
UA = {'User-Agent': 'Mozilla/5.0 (NewsBoard legal archive; +https://pyw31337.github.io/news/)'}
KST = timezone(timedelta(hours=9)); NOW = datetime.now(KST)
def get(u, t=20): return ur.urlopen(ur.Request(u, headers=UA), timeout=t).read()
def jload(p, d):
    try:
        with (gzip.open(p, 'rt') if p.endswith('.gz') else open(p)) as f: return json.load(f)
    except Exception: return d
def jsave(p, o):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with (gzip.open(p, 'wt') if p.endswith('.gz') else open(p, 'w')) as f: json.dump(o, f, ensure_ascii=False, separators=(',', ':'))
STATE = jload(f'{OUT}/state.json', {}); LOG = {'at': NOW.isoformat(timespec='minutes'), 'sources': {}}
SEX = re.compile(r'(성폭|강간|강제추행|성착취|불법촬영|성매매|아동.?성|디지털\s?성범죄)')
NAME_RX = '([가-힣]{2,4})'

def probe(name, url):
    try: get(url, 15); ok = True
    except Exception as e: ok = f'{type(e).__name__}'
    LOG['sources'].setdefault(name, {})['reachable'] = ok; return ok is True

# 1) 뉴스·미디어 판결 보도: 구글뉴스 검색(최근 2일) + 뉴스보드 data 브랜치 기사 → 원문 본문 → 구조화(legal_extract.mjs 재사용)
NEWS_Q = ['징역 선고', '집행유예 선고', '무죄 선고', '대법원 확정 판결', '항소심 선고', '벌금형 선고', '파기환송', '헌법재판소 결정', '헌법불합치', '위헌 결정', '법정구속', '재판장 부장판사']
RULE = re.compile(r'(선고|판결|무죄|유죄|확정|기각|감형|법정구속|집행유예|실형|징역\s*\d|헌법불합치|위헌|합헌|각하)')
def news(datadir):
    cand = {}
    for q in NEWS_Q:
        try:
            x = get('https://news.google.com/rss/search?' + up.urlencode({'q': f'{q} when:2d', 'hl': 'ko', 'gl': 'KR', 'ceid': 'KR:ko'}))
            for it in ET.fromstring(x).iter('item'):
                t = it.findtext('title') or ''; u = it.findtext('link') or ''
                d = it.findtext('pubDate') or ''
                try: d = datetime.strptime(d[:25], '%a, %d %b %Y %H:%M:%S').strftime('%Y-%m-%d')
                except Exception: d = NOW.strftime('%Y-%m-%d')
                if RULE.search(t): cand[u] = {'u': u, 't': re.sub(r'\s+-\s+[^-]+$', '', t), 'd': d}
        except Exception: pass
        time.sleep(1)
    if datadir and os.path.isdir(datadir):
        for day in sorted(os.listdir(datadir))[-2:]:
            for fn in os.listdir(os.path.join(datadir, day)):
                for a in jload(os.path.join(datadir, day, fn), []):
                    if RULE.search(a.get('title', '')): cand[a['url']] = {'u': a['url'], 't': a['title'], 'd': (a.get('t') or '')[:10]}
    seen = set(STATE.get('news_seen', [])); new = [c for c in cand.values() if c['u'] not in seen]
    LOG['sources']['news'] = {'candidates': len(cand), 'new': len(new)}
    if not new: return
    tmp = '/tmp/legal'; os.makedirs(tmp, exist_ok=True)
    json.dump(new, open(f'{tmp}/cand.json', 'w'), ensure_ascii=False)
    subprocess.run([sys.executable, f'{SCR}/legal_resolve.py', f'{tmp}/cand.json', f'{tmp}/body.json'], timeout=1500)
    subprocess.run(['node', f'{SCR}/legal_extract.mjs', f'{tmp}/cand.json', f'{tmp}/body.json', f'{tmp}/out.json'], timeout=300, check=True)
    got = jload(f'{tmp}/out.json', {}).get('cases', [])
    month = NOW.strftime('%Y-%m'); p = f'{OUT}/news/cases/{month}.json.gz'; cur = jload(p, [])
    have = {s for c in cur for s in c.get('sources', [])}; add = 0
    for c in got:
        if set(c.get('sources', [])) & have: continue
        if c.get('charge') == '성범죄': c = {k: v for k, v in c.items() if k in ('date', 'court', 'instance', 'charge', 'sources', 'reports')}  # 피해 관련 상세 제외
        c['id'] = 'n' + __import__('hashlib').sha1(c['sources'][0].encode()).hexdigest()[:12]; c['src'] = 'news'; cur.append(c); add += 1
    jsave(p, cur); LOG['sources']['news']['cases_added'] = add
    STATE['news_seen'] = (list(seen) + [c['u'] for c in new])[-20000:]
    # 판사 색인(보도 기반, 같은 이름+같은 법원일 때만 같은 사람으로 봄)
    idx = jload(f'{OUT}/people/judges_from_news.json', {})
    for c in got:
        if c.get('judge') and c.get('court'):
            k = f"{c['judge']}|{c['court']}"; e = idx.setdefault(k, {'name': c['judge'], 'court': c['court'], 'cases': []})
            if c['sources'][0] not in e['cases']: e['cases'].append(c['sources'][0])
    jsave(f'{OUT}/people/judges_from_news.json', idx)

# 2) 국가법령정보센터 Open API (OC 필요): 판례(prec)·헌재결정례(detc)·법령해석례(expc) 증분 수집
def lawgo(oc):
    LOG['sources']['law.go.kr'] = {'key': bool(oc)}
    if not oc or not probe('law.go.kr', 'https://www.law.go.kr/'): return
    for target, idkey in (('prec', '판례일련번호'), ('detc', '헌재결정례일련번호'), ('expc', '법령해석례일련번호')):
        st = STATE.setdefault('law_' + target, {'page': 1, 'ids': []}); ids = set(st['ids']); added = 0; t0 = time.time()
        for _ in range(30):
            if time.time() - t0 > 600: break
            try: r = json.loads(get(f'https://www.law.go.kr/DRF/lawSearch.do?OC={oc}&target={target}&type=JSON&display=100&page={st["page"]}&sort=ddes'))
            except Exception as e: LOG['sources']['law.go.kr'][target] = f'err {type(e).__name__}'; break
            body = next(iter(r.values())) if isinstance(r, dict) and r else {}
            if not isinstance(body, dict):   # 오류 응답(키·IP 미등록 등): 내용 일부만 기록(키 값은 가림)
                LOG['sources']['law.go.kr'][target] = 'resp ' + json.dumps(r, ensure_ascii=False)[:300].replace(oc, '***'); break
            rows = body.get(target) or []
            if isinstance(rows, dict): rows = [rows]
            if not rows: st['page'] = 1; break
            for row in rows:
                i = str(row.get(idkey) or row.get('id') or '')
                if not i or i in ids: continue
                try: det = json.loads(get(f'https://www.law.go.kr/DRF/lawService.do?OC={oc}&target={target}&ID={i}&type=JSON'))
                except Exception: continue
                d = next(iter(det.values())) if isinstance(det, dict) and det else {}
                if not isinstance(d, dict): continue
                txt = re.sub(r'<[^>]+>', ' ', html.unescape(str(d.get('판례내용') or d.get('전문') or d.get('회답') or '')))
                rec = {'id': f'{target}:{i}', 'meta': row, 'summary': {k: d.get(k) for k in ('판시사항', '판결요지', '참조조문', '참조판례', '결정요지', '질의요지', '회답') if d.get(k)}}
                tail = txt[-1500:]
                rec['justices'] = re.findall(NAME_RX + r'\s*\(?(?:재판장|주심)?\)?\s*(?=대법관|재판관)', tail)[:14] or re.findall(r'(?:대법관|재판관)\s+' + NAME_RX, tail)[:14]
                rec['judges'] = re.findall(r'(?:재판장\s*)?판사\s+' + NAME_RX, tail)[:5]
                rec['counsel'] = list(dict.fromkeys(re.findall(r'(?:소송대리인|변호인)\s*(?:법무법인[^\s]*\s*(?:담당\s*)?)?변호사\s+' + NAME_RX, txt[:4000])))[:6]
                y = str(row.get('선고일자') or row.get('종국일자') or '0000')[:4]
                p = f'{OUT}/lawgo/{target}/{y}.json.gz'; cur = jload(p, []); cur.append(rec); jsave(p, cur)
                ids.add(i); added += 1; time.sleep(.3)
            st['page'] += 1
        st['ids'] = sorted(ids); LOG['sources']['law.go.kr'][target + '_added'] = added

# 3) 공공데이터포털(data.go.kr) — 서비스별 활용신청 승인된 것만 동작. 엔드포인트는 state의 dgk_endpoints로 관리
def datagokr(key):
    eps = STATE.get('dgk_endpoints', [])  # [{'name':..,'url':'https://apis.data.go.kr/...?serviceKey={key}&...'}]
    LOG['sources']['data.go.kr'] = {'key': bool(key), 'endpoints': len(eps)}
    if not key: return
    probe('data.go.kr', 'https://apis.data.go.kr/')
    for e in eps:
        try:
            raw = get(e['url'].replace('{key}', up.quote(key, safe='')), 30)
            jsave(f"{OUT}/datagokr/{e['name']}/{NOW:%Y-%m-%d}.json.gz", {'raw': raw.decode('utf8', 'ignore')}); LOG['sources']['data.go.kr'][e['name']] = 'ok'
        except Exception as ex: LOG['sources']['data.go.kr'][e['name']] = type(ex).__name__

# 4) 법원·헌재 공식 보도자료 목록(제목·날짜·링크만), 5) 대법관·헌법재판관 경력(Wikidata, CC0)
PRESS = {'대법원 보도자료': 'https://www.scourt.go.kr/portal/news/NewsListAction.work?gubun=4', '헌법재판소 보도자료': 'https://www.ccourt.go.kr/site/kor/ex/bbs/List.do?cbIdx=1118'}
def press():
    for name, url in PRESS.items():
        if not probe(name, url): continue
        try:
            raw = get(url); cs = re.search(rb'charset=["\']?([\w-]+)', raw[:3000]); rows = []
            try: t = raw.decode((cs.group(1).decode() if cs else 'utf8'), 'strict')
            except Exception:
                try: t = raw.decode('utf8')
                except Exception: t = raw.decode('cp949', 'ignore')
            tit = re.findall(r'<td class="tit">\s*<a[^>]+href=[\'"]([^\'"]+)[\'"][^>]*>(.*?)</a>', t, re.S)  # 대법원 표 형식
            pairs = tit or re.findall(r'<a[^>]+href=[\'"]([^\'"]+)[\'"][^>]*>([^<]{15,300})</a>', t)
            for h, title in pairs:
                title = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', title))).strip().rstrip('.').strip()
                if not 15 <= len(title) <= 140 or SEX.search(title): continue
                if tit or re.search(r'(선고|판결|결정|보도|사건|재판|헌법)', title): rows.append({'title': title, 'url': up.urljoin(url, html.unescape(h))})
            p = f'{OUT}/press/{name}.json'; cur = jload(p, []); have = {r['url'] for r in cur}
            new = [dict(r, seen=NOW.strftime('%Y-%m-%d')) for r in rows if r['url'] not in have]; jsave(p, cur + new)
            LOG['sources'][name]['added'] = len(new)
        except Exception as e: LOG['sources'][name]['err'] = type(e).__name__
def wikidata():
    if STATE.get('wd_at', '') > (NOW - timedelta(days=7)).isoformat(): return
    q = '''SELECT ?p ?pLabel ?posLabel ?start ?end WHERE { ?p p:P39 ?st. ?st ps:P39 ?pos. ?pos wdt:P1001|wdt:P17 wd:Q884.
      ?pos rdfs:label ?pl FILTER(lang(?pl)='ko' && (CONTAINS(?pl,'대법관') || CONTAINS(?pl,'헌법재판') || CONTAINS(?pl,'대법원장')))
      OPTIONAL{?st pq:P580 ?start} OPTIONAL{?st pq:P582 ?end} SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". } }'''
    try:
        r = json.loads(get('https://query.wikidata.org/sparql?format=json&query=' + up.quote(q), 90))['results']['bindings']
        ppl = {}
        for b in r:
            k = b['p']['value'].rsplit('/', 1)[1]; e = ppl.setdefault(k, {'qid': k, 'name': b['pLabel']['value'], 'posts': []})
            e['posts'].append({'pos': b.get('posLabel', {}).get('value'), 'start': b.get('start', {}).get('value', '')[:10], 'end': b.get('end', {}).get('value', '')[:10]})
        jsave(f'{OUT}/people/justices_wikidata.json', list(ppl.values())); STATE['wd_at'] = NOW.isoformat(); LOG['sources']['wikidata'] = {'people': len(ppl)}
    except Exception as e: LOG['sources']['wikidata'] = {'err': type(e).__name__}

def guide():
    if os.path.exists(f'{OUT}/guide/sentencing.json'): return
    m = re.search(r'export const GUIDE = (\{.*?\n\});', open(f'{SCR}/legal_extract.mjs').read(), re.S)
    if m: jsave(f'{OUT}/guide/sentencing.json', {'note': '양형위원회 기본 영역(개월). 권고 기준.', 'raw_js': m.group(1)})

for f, a in ((news, (sys.argv[2] if len(sys.argv) > 2 else None,)), (lawgo, (os.environ.get('LAW_OC', ''),)), (datagokr, (os.environ.get('DATA_GO_KR_KEY', ''),)), (press, ()), (wikidata, ()), (guide, ())):
    try: f(*a)
    except Exception as e: LOG['sources'][f.__name__ + '_fatal'] = repr(e)[:200]
jsave(f'{OUT}/state.json', STATE)
runs = jload(f'{OUT}/runs.json', []); runs.append(LOG); jsave(f'{OUT}/runs.json', runs[-500:])
cnt = lambda d: sum(len(jload(os.path.join(dp, fn), [])) for dp, _, fs in os.walk(d) for fn in fs if fn.endswith('.json.gz')) if os.path.isdir(d) else 0
jsave(f'{OUT}/index.json', {'updated': NOW.isoformat(timespec='minutes'), 'news_cases': cnt(f'{OUT}/news'), 'lawgo': {t: cnt(f'{OUT}/lawgo/{t}') for t in ('prec', 'detc', 'expc')},
     'judges_from_news': len(jload(f'{OUT}/people/judges_from_news.json', {})), 'justices': len(jload(f'{OUT}/people/justices_wikidata.json', [])), 'last': LOG})
print(json.dumps(LOG, ensure_ascii=False, indent=1))
