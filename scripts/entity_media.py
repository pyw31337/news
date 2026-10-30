#!/usr/bin/env python3
"""엔티티를 대표하는 공개 미디어(인물 사진·로고·국기·장소 사진)를 보강한다.

이미지를 생성하거나 복제하지 않는다. 위키미디어/Wikidata가 제공하는 원본 주소만
`visual` 필드에 기록하며, 수집 과정의 작은 미리보기 품질 판정과도 분리해 둔다.
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CACHE_PATH = os.path.join(BASE, 'data', 'entity_media.json')
UA = {'User-Agent': 'NewsBoard/1.0 (https://pyw31337.github.io/news/)'}

# 뉴스에서 자주 등장하는 국가. 국기는 사진보다 정확한 국가 식별 수단이라 우선한다.
COUNTRIES = {
    '대한민국': 'kr', '한국': 'kr', '남한': 'kr', '북한': 'kp', '미국': 'us', '중국': 'cn',
    '일본': 'jp', '독일': 'de', '프랑스': 'fr', '영국': 'gb', '러시아': 'ru', '우크라이나': 'ua',
    '이스라엘': 'il', '이란': 'ir', '대만': 'tw', '인도': 'in', '캐나다': 'ca', '호주': 'au',
    '이탈리아': 'it', '스페인': 'es', '브라질': 'br', '멕시코': 'mx', '튀르키예': 'tr',
    '사우디아라비아': 'sa', '아랍에미리트': 'ae', '베트남': 'vn', '태국': 'th', '필리핀': 'ph',
    '싱가포르': 'sg', '인도네시아': 'id', '파키스탄': 'pk', '폴란드': 'pl', '스웨덴': 'se',
    '노르웨이': 'no', '핀란드': 'fi', '네덜란드': 'nl', '벨기에': 'be', '스위스': 'ch',
    '오스트리아': 'at', '체코': 'cz', '헝가리': 'hu', '그리스': 'gr', '포르투갈': 'pt',
    '뉴질랜드': 'nz', '남아프리카공화국': 'za', '이집트': 'eg', '나이지리아': 'ng',
}
ORG_WORDS = re.compile(r'센터|연구원|연구소|재단|공단|협회|위원회|대학|병원|은행|증권|공사|청|부$|그룹|전자|항공|자동차|통신|기업|회사|당|당국|기구')
PLACE_WORDS = re.compile(r'관$|궁$|청사|공항|역$|동$|구$|시$|군$|도$|광장|공원|타워|빌딩|산$|강$')

def load_cache():
    try:
        return json.load(open(CACHE_PATH, encoding='utf-8'))
    except Exception:
        return {}

def save_cache(cache):
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, separators=(',', ':'))

def get_json(url, timeout=8):
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception:
        return {}

def commons_file(name):
    # Special:FilePath는 SVG와 일반 사진 모두 브라우저에 맞는 리디렉션을 제공한다.
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/%s?width=360' % urllib.parse.quote(name, safe='')

def normalize_type(entity):
    name = entity.get('name', '')
    wiki = entity.get('wiki') or {}
    text = ' '.join((name, wiki.get('title', ''), wiki.get('desc', ''), wiki.get('extract', '')[:160]))
    if name in COUNTRIES:
        return 'place'
    # 백악관·청와대처럼 조직 설명에 대통령이라는 말이 들어가도 건물은 장소로 다룬다.
    if PLACE_WORDS.search(name) and not ORG_WORDS.search(name):
        return 'place'
    if ORG_WORDS.search(name) or re.search(r'연구|aerospace|space center', text, re.I):
        return 'org'
    return entity.get('type') or 'event'

def wikidata_files(title):
    """위키백과 문서에서 QID를 찾은 뒤 로고(P154), 대표사진(P18)을 얻는다."""
    if not title:
        return '', ''
    api = 'https://ko.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&titles=' + urllib.parse.quote(title)
    pages = (get_json(api).get('query', {}).get('pages', {}) or {}).values()
    page = next(iter(pages), {})
    qid = (page.get('pageprops') or {}).get('wikibase_item')
    if not qid:
        return '', ''
    item = get_json('https://www.wikidata.org/wiki/Special:EntityData/%s.json' % qid).get('entities', {}).get(qid, {})
    claims = item.get('claims') or {}
    def value(prop):
        for claim in claims.get(prop, []):
            try:
                v = claim['mainsnak']['datavalue']['value']
                if isinstance(v, str):
                    return v
            except Exception:
                pass
        return ''
    return value('P154'), value('P18')

def resolve(entity, cache):
    name = entity.get('name', '')
    typ = normalize_type(entity)
    entity['type'] = typ
    if name in COUNTRIES:
        return {'url': 'https://flagcdn.com/w320/%s.png' % COUNTRIES[name], 'kind': 'flag'}
    key = '%s:%s' % (typ, name)
    cached = cache.get(key)
    if isinstance(cached, dict) and cached.get('url'):
        return cached
    wiki = entity.get('wiki') or {}
    logo, photo = wikidata_files(wiki.get('title') or name)
    if typ == 'org' and logo:
        visual = {'url': commons_file(logo), 'kind': 'logo'}
    elif photo:
        visual = {'url': commons_file(photo), 'kind': 'portrait' if typ == 'person' else 'place'}
    else:
        # db.py가 저해상도 미리보기를 비워도 원본 주소(thumb_src)는 남긴다.
        source = wiki.get('thumb') or wiki.get('thumb_src')
        visual = {'url': source, 'kind': 'portrait' if typ == 'person' else ('place' if typ == 'place' else 'photo')} if source else {}
    if visual.get('url'):
        cache[key] = dict(visual, updated=int(time.time()))
    return visual

def enrich(entities, workers=6):
    """entities를 제자리에서 보강하고, 성공한 결과만 영속 캐시에 남긴다."""
    cache = load_cache()
    def one(entity):
        try:
            return entity, resolve(entity, cache)
        except Exception:
            return entity, {}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for entity, visual in ex.map(one, entities):
            if visual.get('url'):
                entity['visual'] = visual
    save_cache(cache)
    return entities
