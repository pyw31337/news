"""민심·영상: 이슈별 '사람들의 글'(네이버 블로그·카페 검색 API, 선택: 다음 검색 API)과
'관련 영상'(방송사 공식 유튜브 RSS, 선택: YouTube Data API·다음 동영상 검색) → data/voice.json
- 개인정보: 작성자 이름·아이디·블로그명 저장 안 함. 글은 80자 이내 짧은 인용 + 원문 링크만.
- 영상: 재호스팅 없이 링크·썸네일 주소만. 3줄 요약은 방송사가 직접 쓴 영상 설명문에서 문장 추출(AI 미사용:
  방송사들이 'AI 데이터 활용 금지'를 명시). 자막(스크립트) 내려받기는 YouTube 정책상 영상 주인만 가능 → 수집 안 함.
- 분석: Gemini(무료 등급) 1회/실행으로 상위 이슈 묶어 감성·입장·주제 분류. 실패하면 규칙 기반 감성으로 조용히 대체.
  맥미니에선 LLM_BACKEND=apple 로 로컬 AI 사용.
- 한도: 네이버 호출은 naver.py와 같은 data/db/naver_usage.json 상한을 공유."""
import os, re, json, html, time, hashlib, datetime, subprocess, urllib.request, urllib.parse, urllib.error
import xml.etree.ElementTree as ET
KST = datetime.timezone(datetime.timedelta(hours=9))
now = datetime.datetime.now(KST); M, D = now.strftime('%Y-%m'), now.strftime('%Y-%m-%d')
ROOT = os.environ.get('VOICE_DATA') or 'data'
P = lambda n: os.path.join(ROOT, n)
def J(n, d=None):
    try: return json.load(open(P(n), encoding='utf-8'))
    except Exception: return d
T = J('today.json', {}) or {}
OLD = J('voice.json', {}) or {}
diag = {'naver_calls': 0, 'kakao_calls': 0, 'yt_api_calls': 0, 'rss_ok': 0, 'rss_fail': 0, 'llm': None, 'errors': []}
NTOP = int(os.environ.get('VOICE_TOP') or 8)
# ---------- 네이버(공유 상한) ----------
NID, NSEC = os.environ.get('NAVER_CLIENT_ID', ''), os.environ.get('NAVER_CLIENT_SECRET', '')
MONTH_CAP = min(int(os.environ.get('NAVER_MONTH_CAP') or 280000), 299000); DAY_CAP = int(os.environ.get('NAVER_DAY_CAP') or 9000)
NBUD = int(os.environ.get('VOICE_NAVER_BUDGET') or 16)
U = P('db/naver_usage.json'); os.makedirs(P('db'), exist_ok=True)
use = J('db/naver_usage.json', {}) or {}; use.setdefault('month', {}); use.setdefault('day', {})
clean = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', s or ''))).strip()
PII = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+|01[016789][-. ]?\d{3,4}[-. ]?\d{4}|https?://\S+|@\w+')
def short(s, n=80):
    s = PII.sub('', clean(s)).strip(' -·|'); return s if len(s) <= n else s[:n - 1].rstrip() + '…'
def naver(kind, q, n=20):
    left = min(MONTH_CAP - use['month'].get(M, 0), DAY_CAP - use['day'].get(D, 0), NBUD - diag['naver_calls'])
    if not (NID and NSEC) or left <= 0: return []
    use['month'][M] = use['month'].get(M, 0) + 1; use['day'][D] = use['day'].get(D, 0) + 1; diag['naver_calls'] += 1
    url = 'https://naverapihub.apigw.ntruss.com/search/v1/' + kind + '?' + urllib.parse.urlencode({'query': q, 'display': n, 'sort': 'sim'})
    try:
        r = urllib.request.Request(url, headers={'X-NCP-APIGW-API-KEY-ID': NID, 'X-NCP-APIGW-API-KEY': NSEC})
        return json.load(urllib.request.urlopen(r, timeout=15)).get('items') or []
    except Exception as e:
        diag['errors'].append(f'naver {kind} {getattr(e, "code", type(e).__name__)}'); return []
# ---------- 다음(카카오) 검색: 블로그(티스토리 포함)·카페·동영상(카카오TV·유튜브) — KAKAO_REST_KEY 있을 때만 ----------
KK = os.environ.get('KAKAO_REST_KEY', '')
def kakao(kind, q, n=15):
    if not KK or diag['kakao_calls'] >= int(os.environ.get('VOICE_KAKAO_BUDGET') or 24): return []
    diag['kakao_calls'] += 1
    try:
        r = urllib.request.Request('https://dapi.kakao.com/v2/search/' + kind + '?' + urllib.parse.urlencode({'query': q, 'size': n, 'sort': 'recency'}), headers={'Authorization': 'KakaoAK ' + KK})
        return json.load(urllib.request.urlopen(r, timeout=15)).get('documents') or []
    except Exception as e:
        diag['errors'].append(f'kakao {kind} {getattr(e, "code", type(e).__name__)}'); return []
# ---------- 유튜브: 방송사 공식 채널 RSS(키 불필요) ----------
CH = {'UChlgI3UHCOnwUGzWzbJ3H5w': 'YTN', 'UCTHCOPwqNfZ0uiKOvFyhGwg': '연합뉴스TV', 'UCcQTRi69dsVYHN3exePtZ1A': 'KBS',
      'UCF4Wxdo3inmxP-Y59wXDsFw': 'MBC', 'UCkinYTS9IHqOEwR1Sze2JTw': 'SBS', 'UCsU-I-vHLiaMfV_ceaYz5rQ': 'JTBC',
      'UCfq4V1DAuaojnr2ryvWNysw': '채널A', 'UCG9aFJTZ-lMCHAiO1KJsirg': 'MBN', 'UCWlV3Lz_55UaX4JsMj-z__Q': 'TV조선'}
NS = {'a': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015', 'm': 'http://search.yahoo.com/mrss/'}
def sents(desc):
    d = re.sub(r'ⓒ.*|#\S+|\[.*?기자.*?\]|▶.*|☞.*', '', desc or '')
    out = []
    for s in re.split(r'(?<=[.!?다요])\s+|\n+', d):
        s = PII.sub('', s).strip(' -·•')
        if 12 <= len(s) <= 120 and not re.search(r'구독|제보|카카오톡|홈페이지|무단|채널|링크|후원', s): out.append(s)
        if len(out) == 3: break
    return out
def page(cid, name):
    """RSS가 막힐 때(키 없이): 채널 공개 '동영상' 페이지에서 최근 영상 목록을 읽음."""
    try:
        h = urllib.request.urlopen(urllib.request.Request(f'https://www.youtube.com/channel/{cid}/videos', headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ko-KR'}), timeout=15).read().decode('utf-8', 'ignore')
        out, seen = [], set()
        for m in re.finditer(r'"contentId":"([\w-]{11})","contentType":"LOCKUP_CONTENT_TYPE_VIDEO"', h):
            vid = m.group(1)
            if vid in seen: continue
            w = h[m.end():m.end() + 30000]; tm = re.search(r'"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"', w)
            if not tm: continue
            seen.add(vid); t = json.loads('"' + tm.group(1) + '"')
            vm = re.search(r'"accessibilityLabel":"조회수 ([\d,]+)회', w[tm.end():tm.end() + 800])
            out.append({'id': vid, 'title': t, 'ch': name, 'pf': 'youtube', 'url': f'https://www.youtube.com/watch?v={vid}', 'thumb': f'https://i.ytimg.com/vi/{vid}/mqdefault.jpg',
                        'views': int(vm.group(1).replace(',', '')) if vm else 0, 't': now.isoformat(timespec='seconds'), '_d': ''})
            if len(out) >= 30: break
        diag['page_ok'] = diag.get('page_ok', 0) + (1 if out else 0); return out
    except Exception as e:
        diag['errors'].append(f'page {getattr(e, "code", type(e).__name__)}'); return []
def rss():
    V = []
    for cid, name in CH.items():
        try:
            x = ET.fromstring(urllib.request.urlopen('https://www.youtube.com/feeds/videos.xml?channel_id=' + cid, timeout=15).read())
            diag['rss_ok'] += 1
        except Exception:
            diag['rss_fail'] += 1; V.extend(page(cid, name)); continue
        for e in x.findall('a:entry', NS):
            vid = e.findtext('yt:videoId', '', NS); g = e.find('m:group', NS)
            st = g.find('m:community/m:statistics', NS) if g is not None else None
            t = e.findtext('a:title', '', NS); desc = g.findtext('m:description', '', NS) if g is not None else ''
            V.append({'id': vid, 'title': t, 'ch': name, 'pf': 'shorts' if '#shorts' in (t + desc).lower() else 'youtube',
                      'url': f'https://www.youtube.com/watch?v={vid}', 'thumb': f'https://i.ytimg.com/vi/{vid}/mqdefault.jpg',
                      'views': int(st.get('views', 0)) if st is not None else 0, 't': e.findtext('a:published', '', NS), '_d': desc})
    return V
YK = os.environ.get('YOUTUBE_API_KEY', '')
def ytsearch(q):
    """키가 있을 때만: search.list 100유닛(하루 무료 1만 유닛 → 실행당 최대 2회로 제한)."""
    if not YK or diag['yt_api_calls'] >= int(os.environ.get('VOICE_YT_BUDGET') or 2): return []
    diag['yt_api_calls'] += 1
    try:
        u = 'https://www.googleapis.com/youtube/v3/search?' + urllib.parse.urlencode({'part': 'snippet', 'q': q, 'type': 'video', 'maxResults': 8, 'order': 'relevance', 'regionCode': 'KR', 'relevanceLanguage': 'ko', 'publishedAfter': (now - datetime.timedelta(days=3)).astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'key': YK})
        its = json.load(urllib.request.urlopen(u, timeout=15)).get('items') or []
        ids = ','.join(i['id']['videoId'] for i in its)
        st = {}
        if ids:
            diag['yt_api_calls'] += 0  # videos.list는 1유닛
            s = json.load(urllib.request.urlopen('https://www.googleapis.com/youtube/v3/videos?' + urllib.parse.urlencode({'part': 'statistics', 'id': ids, 'key': YK}), timeout=15))
            st = {v['id']: int(v['statistics'].get('viewCount', 0)) for v in s.get('items', [])}
        return [{'id': i['id']['videoId'], 'title': clean(i['snippet']['title']), 'ch': clean(i['snippet']['channelTitle']), 'pf': 'youtube',
                 'url': 'https://www.youtube.com/watch?v=' + i['id']['videoId'], 'thumb': i['snippet']['thumbnails'].get('medium', {}).get('url'),
                 'views': st.get(i['id']['videoId'], 0), 't': i['snippet']['publishedAt'], '_d': i['snippet'].get('description', '')} for i in its]
    except Exception as e:
        diag['errors'].append(f'youtube {getattr(e, "code", type(e).__name__)}'); return []
# ---------- 규칙 기반 감성(대체용) ----------
POS = '응원 감사 다행 좋 칭찬 기대 환영 지지 훌륭 고맙 존경 힘내 축하 희망 잘했 대단 공감 필요하 맞는 말'.split()
NEG = '분노 화나 어이없 황당 최악 실망 비판 규탄 문제 걱정 우려 불안 무섭 억울 한심 답답 충격 논란 잘못 반대 책임 사퇴 비난 개탄 욕 짜증 슬프 안타깝 참담'.split()
def senti(s):
    p = sum(w in s for w in POS); n = sum(w in s for w in NEG)
    return 1 if p > n else -1 if n > p else 0
STOP = set('있는 없는 하는 대한 관련 오늘 이번 그리고 하지만 정말 너무 진짜 지금 우리 이런 그런 저런 되는 했다 한다 것이 것은 합니다 있다 없다 ㅋㅋ ㅎㅎ 뉴스 기사 블로그 카페 포스팅 사진 영상 이야기 정리 후기 생각 소식 공유 내용 최근 경우 때문 위해'.split())
def words(texts, excl):
    c = {}
    for t in texts:
        for w in re.findall(r'[가-힣A-Za-z]{2,8}', t):
            w = re.sub(r'(은|는|이|가|을|를|의|에|에서|으로|로|과|와|도|만|까지|이라|라고|하고)$', '', w)
            if len(w) >= 2 and w not in STOP and w not in excl: c[w] = c.get(w, 0) + 1
    return sorted(c.items(), key=lambda x: -x[1])[:24]
# ---------- AI ----------
ENDPOINT = os.environ.get('LLM_ENDPOINT') or 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
TOKEN = os.environ.get('LLM_API_KEY') or ''
MODELS = [m for m in dict.fromkeys([os.environ.get('LLM_MODEL') or 'gemini-3.8-flash'] + 'gemini-3.5-flash-lite,gemini-flash-lite-latest'.split(',')) if m]
NBAI = os.environ.get('NBAI', os.path.expanduser('~/Developer/newsboard-local/bin/nbai'))
SYS = ('너는 중립적인 한국어 여론 분석가다. 주어진 글 조각(블로그·카페 제목과 요약)만 근거로 쓴다. 없는 사실·숫자를 만들지 말고, '
       '특정인을 조롱하거나 단정하지 마라. 개인 이름·아이디는 쓰지 마라. 출력은 지정한 JSON만.')
def jparse(c):
    c = re.sub(r'^```(?:json)?|```$', '', c.strip()).strip(); a, b = c.find('{'), c.rfind('}'); return json.loads(c[a:b + 1])
def llm(prompt, maxtok=3500):
    try:
        if os.environ.get('LLM_BACKEND') == 'apple' and os.path.exists(NBAI):
            r = subprocess.run([NBAI, SYS, str(maxtok)], input=prompt, capture_output=True, text=True, timeout=400)
            if not r.returncode: diag['llm'] = 'local'; return jparse(r.stdout)
        if not TOKEN: return None
        for m in MODELS:
            body = json.dumps({'model': m, 'temperature': 0.2, 'max_tokens': maxtok, 'response_format': {'type': 'json_object'},
                               'messages': [{'role': 'system', 'content': SYS}, {'role': 'user', 'content': prompt}]}).encode()
            for a in range(2):
                try:
                    r = urllib.request.urlopen(urllib.request.Request(ENDPOINT, body, {'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'}), timeout=90)
                    diag['llm'] = m; return jparse(json.loads(r.read())['choices'][0]['message']['content'])
                except urllib.error.HTTPError as e:
                    diag['errors'].append(f'llm {m} {e.code}')
                    if e.code in (429, 500, 502, 503, 504) and a == 0: time.sleep(8); continue
                    break
                except Exception as e: diag['errors'].append(f'llm {type(e).__name__}'); break
    except Exception as e: diag['errors'].append('llm ' + str(e)[:60])
    return None
# ---------- 이슈 키 (같은 사건을 여러 날 이어 추적) ----------
def ikey(i):
    k = sorted((i.get('keywords') or [])[:4]) or [i.get('title', '')[:20]]
    return hashlib.md5('|'.join(k).encode()).hexdigest()[:10]
def match(v, kws):
    t = v['title']; return sum(1 for k in kws if len(k) >= 2 and k in t)
# ---------- 실행 ----------
issues = (T.get('issues') or [])[:NTOP]
oldmap = {x['key']: x for x in OLD.get('issues', [])}
VIDS = rss()
out = []
for i in issues:
    kws = [k for k in (i.get('keywords') or []) if len(k) >= 2][:6]
    q = ' '.join(kws[:3]) if kws else i.get('title', '')[:30]
    key = ikey(i); old = oldmap.get(key, {})
    posts, seen = [], set()
    def add(src, title, desc, url, dt=None):
        if not url or url in seen: return
        seen.add(url); txt = clean(title) + ' — ' + clean(desc)
        posts.append({'src': src, 'q': short(clean(title) if len(clean(desc)) < 15 else clean(desc)), 'title': short(title, 60), 'url': url, 'd': dt, '_t': txt})
    for it in naver('blog', q): add('blog', it.get('title'), it.get('description'), it.get('link'), it.get('postdate'))
    for it in naver('cafearticle', q): add('cafe', it.get('title'), it.get('description'), it.get('link'))
    for it in kakao('blog', q): add('tistory' if 'tistory' in it.get('url', '') else 'daumblog', it.get('title'), it.get('contents'), it.get('url'), (it.get('datetime') or '')[:10].replace('-', ''))
    for it in kakao('cafe', q, 10): add('daumcafe', it.get('title'), it.get('contents'), it.get('url'), (it.get('datetime') or '')[:10].replace('-', ''))
    # 뉴스 재게시(기사 복붙) 글은 민심에서 뺌
    posts = [p for p in posts if not re.search(r'news\.naver|기자\s*=|무단\s*전재|\[속보\]|\[단독\]', p['_t'])] or posts
    # 영상
    vs = sorted([dict(v, _m=match(v, kws)) for v in VIDS], key=lambda v: (-v['_m'], -v['views']))
    mk = kws + [e for e in (i.get('entities') or []) if len(e) >= 2 and e not in kws][:4]
    vs = sorted([dict(v, _m=match(v, mk)) for v in VIDS], key=lambda v: (-v['_m'], -v['views']))
    vs = [v for v in vs if v['_m'] >= 2 or (v['_m'] == 1 and any(len(k) >= 3 and k in v['title'] for k in mk))][:6]
    if len(vs) < 3: vs += [v for v in ytsearch(q) if v['id'] not in {x['id'] for x in vs}][:6 - len(vs)]
    if len(vs) < 3:
        for it in kakao('vclip', q, 10):
            u = it.get('url', ''); pf = 'kakaotv' if 'kakao' in u or 'daum' in u else 'youtube' if 'youtu' in u else 'naver' if 'naver' in u else 'vimeo' if 'vimeo' in u else 'etc'
            if u not in {x['url'] for x in vs} and len(vs) < 6:
                vs.append({'id': hashlib.md5(u.encode()).hexdigest()[:11], 'title': clean(it.get('title')), 'ch': clean(it.get('author')), 'pf': pf, 'url': u, 'thumb': it.get('thumbnail'), 'views': 0, 't': it.get('datetime'), '_d': ''})
    videos = [{k: v[k] for k in ('id', 'title', 'ch', 'pf', 'url', 'thumb', 'views', 't')} | {'sum': sents(v.get('_d'))} for v in vs]
    sc = [senti(p['_t']) for p in posts]
    n = len(posts)
    rule = {'pos': round(100 * sc.count(1) / n) if n else 0, 'neg': round(100 * sc.count(-1) / n) if n else 0}
    rule['neu'] = 100 - rule['pos'] - rule['neg'] if n else 0
    for p, s in zip(posts, sc): p['s'] = s
    excl = set(kws) | {w for k in kws for w in [k]}
    trend = (old.get('trend') or [])
    rec = {'key': key, 'id': i.get('id'), 'title': i.get('title'), 'category': i.get('category'), 'image': i.get('image'), 'q': q,
           'n': n, 'by': {s: sum(p['src'] == s for p in posts) for s in {p['src'] for p in posts}}, 'sent': rule, 'ai': None,
           'words': words([p['_t'] for p in posts], excl), 'posts': posts[:24], 'videos': videos, 'trend': trend}
    if old.get('ai') and old.get('n_ai') and abs(old.get('n_ai', 0) - n) < 6 and old.get('ai_t', '') > (now - datetime.timedelta(hours=3)).isoformat():
        rec['ai'], rec['n_ai'], rec['ai_t'] = old['ai'], old['n_ai'], old['ai_t']
    out.append(rec)
# AI: 아직 분석이 없거나 오래된 이슈만 한 번에
need = [r for r in out if not r['ai'] and r['n'] >= 5][:5]
if need:
    blocks = []
    for k, r in enumerate(need):
        lines = '\n'.join(f'{j}. {p["_t"][:150]}' for j, p in enumerate(r['posts'][:22]))
        blocks.append(f'### 이슈{k}: {r["title"]}\n{lines}')
    prompt = ('아래는 뉴스 이슈별로 모은 일반인 블로그·카페 글 조각이다. 뉴스 복사·광고 글은 무시하고 사람들의 생각만 보라. 각 이슈마다:\n'
              '{"issues":[{"k":이슈번호,"pos":긍정%,"neu":중립%,"neg":부정%,"summary":"사람들 반응 2문장(쉬운 말)",'
              '"stances":[{"label":"입장 6자 이내","share":%,"desc":"한 줄"}](2~4개, 합 100),'
              '"topics":[{"label":"주제 8자 이내","n":글수}](3~5개),"quotes":[대표 글 번호 3~4개],"mood":"한 단어 분위기(예: 분노, 걱정, 응원)"}]}\n\n' + '\n\n'.join(blocks))
    res = llm(prompt)
    for a in (res or {}).get('issues', []):
        try:
            r = need[int(a['k'])]; tot = sum(max(0, int(a.get(x, 0))) for x in ('pos', 'neu', 'neg')) or 1
            r['ai'] = {'sent': {x: round(100 * max(0, int(a.get(x, 0))) / tot) for x in ('pos', 'neu', 'neg')}, 'summary': str(a.get('summary', ''))[:220],
                       'stances': [{'label': str(s['label'])[:10], 'share': int(s['share']), 'desc': str(s.get('desc', ''))[:80]} for s in a.get('stances', [])[:4]],
                       'topics': [{'label': str(s['label'])[:12], 'n': int(s.get('n', 0))} for s in a.get('topics', [])[:5]],
                       'quotes': [int(q) for q in a.get('quotes', []) if str(q).isdigit() and int(q) < len(r['posts'])][:4], 'mood': str(a.get('mood', ''))[:8]}
            r['n_ai'], r['ai_t'] = r['n'], now.isoformat(timespec='seconds')
        except Exception: pass
# 추이(시간별 1점, 최근 72점)
for r in out:
    s = (r['ai'] or {}).get('sent') or r['sent']; h = now.strftime('%m-%d %H')
    tr = [x for x in r['trend'] if x[0] != h] + [[h, s['pos'], s['neu'], s['neg'], r['n']]]
    r['trend'] = tr[-72:]
    for p in r['posts']: p.pop('_t', None)
# 지난 이슈도 하루는 허브에 남김(용량 작게: 글·영상 빼고)
keep = [dict(o, posts=[], videos=o.get('videos', [])[:2]) for k, o in oldmap.items() if k not in {r['key'] for r in out} and o.get('seen', '') > (now - datetime.timedelta(days=1)).isoformat()][:12]
for r in out: r['seen'] = now.isoformat(timespec='seconds')
json.dump({'updated': now.isoformat(timespec='seconds'), 'issues': out, 'past': [dict(k, past=1) for k in keep]}, open(P('voice.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
for k in list(use['day'])[:-40]: use['day'].pop(k)
json.dump(use, open(U, 'w'))
diag.update(issues=len(out), posts=sum(r['n'] for r in out), videos=sum(len(r['videos']) for r in out), ai=sum(1 for r in out if r['ai']), t=now.isoformat(timespec='seconds'))
json.dump(diag, open(P('diag_voice.json'), 'w'), ensure_ascii=False)
print('voice', json.dumps(diag, ensure_ascii=False))
