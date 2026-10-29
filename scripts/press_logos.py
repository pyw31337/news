"""언론사 로고 수집: 각 언론사 공식 홈페이지가 공개한 아이콘(apple-touch-icon·고해상도 favicon)만 사용.
96px 이상만 채택 → 128px WebP로 assets/press/에 저장. 없으면 화면에서 이니셜 칩으로 대체.
python scripts/press_logos.py  (새 언론사가 생기면 아래 표에 도메인만 추가)"""
import re, io, os, json, urllib.request, urllib.parse
from PIL import Image
P = {'SBS':'news.sbs.co.kr','주간조선':'weekly.chosun.com','디지털타임스':'dt.co.kr','연합뉴스':'yna.co.kr','중앙일보':'joongang.co.kr','MBC':'imnews.imbc.com',
'kbc광주방송':'ikbc.co.kr','뉴스1':'news1.kr','서울경제':'sedaily.com','부산일보':'busan.com','국제신문':'kookje.co.kr','MBN':'mbn.co.kr','JTBC':'news.jtbc.co.kr',
'경향신문':'khan.co.kr','KBS':'news.kbs.co.kr','디지털데일리':'ddaily.co.kr','한겨레':'hani.co.kr','TV조선':'tvchosun.com','연합뉴스TV':'yonhapnewstv.co.kr',
'동행미디어 시대':'sidae.com','한국일보':'hankookilbo.com','채널A':'ichannela.com','대전일보':'daejonilbo.com','주간경향':'weekly.khan.co.kr','시사저널':'sisajournal.com',
'노컷뉴스':'nocutnews.co.kr','세계일보':'segye.com','경기일보':'kyeonggi.com','파이낸셜뉴스':'fnnews.com','더팩트':'tf.co.kr','한국경제':'hankyung.com',
'한국경제TV':'wowtv.co.kr','매경이코노미':'mk.co.kr','매일신문':'imaeil.com','문화일보':'munhwa.com','뉴시스':'newsis.com','YTN':'ytn.co.kr','SBS Biz':'biz.sbs.co.kr',
'조선비즈':'biz.chosun.com','동아일보':'donga.com','데일리안':'dailian.co.kr','이데일리':'edaily.co.kr','MBC 뉴스':'imnews.imbc.com','헤럴드경제':'biz.heraldcorp.com',
'머니투데이':'mt.co.kr','강원일보':'kwnews.co.kr','아이뉴스24':'inews24.com','강원도민일보':'kado.net','매일경제':'mk.co.kr','프레시안':'pressian.com','CJB청주방송':'cjb.co.kr',
'조선일보':'chosun.com','여성신문':'womennews.co.kr','동아사이언스':'dongascience.com','코메디닷컴':'kormedi.com','미디어오늘':'mediatoday.co.kr','이코노미스트':'economist.co.kr',
'JIBS':'jibs.co.kr','KBS 뉴스':'news.kbs.co.kr','국민일보':'kmib.co.kr','대구MBC':'dgmbc.com','오마이뉴스':'ohmynews.com','서울신문':'seoul.co.kr','비즈워치':'bizwatch.co.kr',
'지디넷코리아':'zdnet.co.kr','조세일보':'joseilbo.com','블로터':'bloter.net','한경비즈니스':'magazine.hankyung.com','아주경제':'ajunews.com','전남일보':'jnilbo.com',
'MBN뉴스':'mbn.co.kr','일요신문':'ilyo.co.kr','헬스조선':'health.chosun.com','전자신문':'etnews.com','에너지경제':'ekn.kr','아시아경제':'asiae.co.kr','뉴스핌':'newspim.com','비즈니스포스트':'businesspost.co.kr','이투데이':'etoday.co.kr'}
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'press')
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh) NewsBoard logo fetch'}
def get(u, t=12):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t).read()
def candidates(dom):
    out = []
    for base in ('https://' + dom, 'https://www.' + dom.removeprefix('news.')):
        try:
            h = get(base).decode('utf-8', 'replace')
            for m in re.finditer(r'<link[^>]+>', h, re.I):
                tag = m.group(0)
                if re.search(r'rel=["\'][^"\']*(apple-touch-icon|icon)', tag, re.I):
                    hr = re.search(r'href=["\']([^"\']+)', tag)
                    if hr: out.append(urllib.parse.urljoin(base + '/', hr.group(1)))
            out += [base + '/apple-touch-icon.png']
            break
        except Exception: continue
    out.append('https://www.google.com/s2/favicons?domain=%s&sz=128' % dom)
    return out
def best(dom):
    top = None
    for u in candidates(dom):
        try:
            b = get(u)
            if u.endswith('.svg') or b[:5] in (b'<?xml', b'<svg '): continue
            im = Image.open(io.BytesIO(b)); im.load()
            if getattr(im, 'n_frames', 1) > 1 or im.format == 'ICO':
                im = max((im.copy() for _ in [0]), key=lambda x: x.size[0])
            w = min(im.size)
            if w >= 96 and (not top or w > top[0]): top = (w, im.convert('RGBA'))
        except Exception: continue
    return top
os.makedirs(OUT, exist_ok=True)
idx_p = os.path.join(OUT, 'index.json')
idx = json.load(open(idx_p)) if os.path.exists(idx_p) else {}
done = {}
for name, dom in P.items():
    if dom in done: idx[name] = done[dom]; continue
    f = dom.replace('.', '_') + '.webp'
    if not os.path.exists(os.path.join(OUT, f)):
        r = best(dom)
        if not r: print('skip', name, dom); done[dom] = None; idx.pop(name, None); continue
        im = r[1]; s = min(im.size); im = im.crop(((im.width - s)//2, (im.height - s)//2, (im.width + s)//2, (im.height + s)//2)).resize((128, 128), Image.LANCZOS)
        im.save(os.path.join(OUT, f), 'WEBP', quality=90); print('ok', name, dom, r[0])
    done[dom] = f; idx[name] = f
for name, dom in P.items():   # 구글뉴스는 언론사 이름 대신 도메인으로 오므로 도메인 키도 등록
    if done.get(dom):
        for k in {dom, dom.removeprefix('news.'), dom.removeprefix('www.')}: idx.setdefault(k, done[dom])
json.dump({k: v for k, v in idx.items() if v}, open(idx_p, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
