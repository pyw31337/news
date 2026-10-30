#!/usr/bin/env python3
"""해외 유명 인물·기관 SNS 최신 글: data/social.json (30분마다, 무료 공개 경로만)
- 트럼프 트루스소셜: trumpstruth.org 공개 아카이브 RSS(트루스소셜 자체는 외부 접속 차단)
- 블루스카이 공개 API: 오바마·AOC·뉴섬·스티븐 킹·주요 언론 등
- X(트위터, 일론 머스크 등)는 공식 API가 유료(월 200달러~)이고 무료 미러가 모두 막혀 수집하지 않음
글은 원문 그대로 + 한국어 번역(해외 탭 기본 한국어, '영어 원문 보기'면 원문)."""
import json, os, re, html, time, urllib.request, urllib.parse, datetime as dt
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST)
UA = {'User-Agent': 'Mozilla/5.0 (NewsBoard; +https://pyw31337.github.io/news/)'}
def get(u, t=15):
    try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t).read().decode('utf-8', 'replace')
    except Exception as e: print('social fail', u[:80], str(e)[:80]); return ''
un = lambda s: html.unescape(re.sub(r'<[^>]+>', ' ', html.unescape(s or ''))).strip()
BSKY = [('barackobama.bsky.social', '정치'), ('aoc.bsky.social', '정치'), ('gavinnewsom.bsky.social', '정치'), ('stephenking.bsky.social', '문화'),
        ('jay.bsky.team', 'IT'), ('reuters.com', '언론'), ('apnews.com', '언론'), ('theguardian.com', '언론'), ('washingtonpost.com', '언론')]
posts = []
# 1) 트럼프(트루스소셜 아카이브 RSS)
t = get('https://www.trumpstruth.org/feed')
for it in re.findall(r'<item>(.*?)</item>', t, re.S)[:15]:
    g = lambda tag: (re.search(r'<%s[^>]*>(.*?)</%s>' % (tag, tag), it, re.S) or [None, ''])[1]
    text = un(re.sub(r'<!\[CDATA\[|\]\]>', '', g('description')))
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) < 8 or text.startswith('RT @'): continue
    try: ts = dt.datetime.strptime(g('pubDate').strip()[:25], '%a, %d %b %Y %H:%M:%S').replace(tzinfo=dt.timezone.utc).astimezone(KST).isoformat()
    except Exception: ts = None
    img = (re.search(r'<media:content[^>]*url="([^"]+)"', it) or [None, ''])[1]
    link = un(g('link'))
    posts.append(dict(id='t' + str(abs(hash(link)))[:10], net='truth', name='Donald Trump', handle='@realDonaldTrump', avatar='', cat='정치',
                      text=text[:600], t=ts, url=link, img=html.unescape(img) if img and re.search(r'\.(jpe?g|png|webp)', img, re.I) else ''))
# 2) 블루스카이 공개 API
def bsky(a):
    h, cat = a
    try: d = json.loads(get('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?filter=posts_no_replies&limit=6&actor=' + urllib.parse.quote(h)))
    except Exception: return []
    out = []
    for f in d.get('feed', []):
        p = f.get('post') or {}; r = p.get('record') or {}; au = p.get('author') or {}
        if f.get('reason') or not r.get('text') or au.get('handle') != h: continue   # 재게시 제외
        emb = p.get('embed') or {}; img = ''
        if emb.get('images'): img = emb['images'][0].get('thumb', '')
        elif (emb.get('external') or {}).get('thumb'): img = emb['external']['thumb']
        rk = p.get('uri', '').rsplit('/', 1)[-1]
        out.append(dict(id='b' + rk, net='bluesky', name=au.get('displayName') or h, handle='@' + h, avatar=au.get('avatar', ''), cat=cat, text=r['text'][:600],
                        t=r.get('createdAt'), url='https://bsky.app/profile/%s/post/%s' % (h, rk), img=img,
                        likes=p.get('likeCount', 0), reposts=p.get('repostCount', 0), replies=p.get('replyCount', 0)))
    return out[:4]
with ThreadPoolExecutor(6) as ex:
    for L in ex.map(bsky, BSKY): posts += L
# 시간순 · 한국어 번역(캐시 공유: tr_cache.json)
def k(p):
    try: return dt.datetime.fromisoformat(str(p['t']).replace('Z', '+00:00'))
    except Exception: return dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc)
posts = [p for p in posts if (NOW - k(p)).days < 7]
posts.sort(key=k, reverse=True)
# 언론 계정은 글이 많아 인물 글을 덮으므로 계정당 2개, 인물은 4개(트럼프 6개)까지
cnt = {}; keep = []
for p in posts:
    cap = 6 if p['net'] == 'truth' else 2 if p['cat'] == '언론' else 4
    if cnt.get(p['handle'], 0) < cap: cnt[p['handle']] = cnt.get(p['handle'], 0) + 1; keep.append(p)
posts = (sorted([p for p in keep if p['cat'] != '언론'], key=k, reverse=True) + [p for p in keep if p['cat'] == '언론'])[:36]   # 인물 글 먼저, 언론은 뒤
TC_P = os.path.join(ROOT, 'tr_cache.json')
try: TC = json.load(open(TC_P))
except Exception: TC = {}
miss = [p['text'] for p in posts if p['text'] not in TC]
for i in range(0, len(miss), 12):
    grp = miss[i:i + 12]; marked = '\n\n'.join(('<<<S%03d>>>\n%s' % (n, x)) if n else x for n, x in enumerate(grp))
    try:
        raw = urllib.request.urlopen(urllib.request.Request('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t', urllib.parse.urlencode({'q': marked}).encode(),
                                     {**UA, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'}), timeout=15).read().decode('utf-8', 'replace')
        parts = re.split(r'<<<S\d{3}>>>\s*', ''.join(x[0] for x in json.loads(raw)[0] if x[0]))
        if len(parts) == len(grp):
            for a, b in zip(grp, parts): TC[a] = b.strip()
    except Exception as e: print('social tr', str(e)[:80])
    time.sleep(.5)
for p in posts: p['text_ko'] = TC.get(p['text'], '')
json.dump(dict(list(TC.items())[-4000:]), open(TC_P, 'w'), ensure_ascii=False)
json.dump(dict(updated=NOW.isoformat(timespec='minutes'), posts=posts,
               sources=dict(truth='trumpstruth.org 공개 아카이브', bluesky='Bluesky 공개 API', x='수집 안 함(유료 API)')),
          open(os.path.join(ROOT, 'social.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('social: posts', len(posts), {n: sum(1 for p in posts if p['net'] == n) for n in ('truth', 'bluesky')})
