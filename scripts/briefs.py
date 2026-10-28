#!/usr/bin/env python3
"""재정경제부 보도자료(공공데이터포털 1053000/brief/list) → data/briefs.json + data/db/briefs/YYYY-MM.json 누적
환경변수 DATA_GO_KR_KEY(없으면 건너뜀). 키는 로그·파일에 남기지 않음."""
import os, json, re, html, datetime as dt, urllib.request, urllib.parse, xml.etree.ElementTree as ET
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
KEY = os.environ.get('DATA_GO_KR_KEY', '').strip()
KST = dt.timezone(dt.timedelta(hours=9)); NOW = dt.datetime.now(KST)
diag = dict(step='briefs', at=NOW.isoformat(), ok={}, fail={}, errors=[])
def mask(s): return s.replace(KEY, '***').replace(urllib.parse.quote(KEY, safe=''), '***') if KEY else s
def fetch():
    q = dict(pageNo=1, numOfRows=50, type='json', resultType='json')
    for base in ('https://apis.data.go.kr/1053000/brief/list', 'http://apis.data.go.kr/1053000/brief/list'):
        # 키는 이미 인코딩된 값일 수도 있어 둘 다 시도
        for k in (KEY, urllib.parse.unquote(KEY)):
            u = base + '?serviceKey=' + urllib.parse.quote(k, safe='') + '&' + urllib.parse.urlencode(q)
            try:
                b = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'NewsBoard'}), timeout=25).read().decode('utf-8', 'replace')
                if 'SERVICE_KEY' in b or 'resultCode>3' in b: diag['errors'].append(dict(t=NOW.isoformat(), msg=mask(b[:200]))); continue
                return b
            except Exception as e: diag['errors'].append(dict(t=NOW.isoformat(), msg=mask('%s %s' % (base.split(':')[0], e))[:200]))
    return ''
def items(b):
    out = []
    try:
        j = json.loads(b); body = j.get('response', j).get('body', j)
        it = (body.get('items') or {}); it = it.get('item', it) if isinstance(it, dict) else it
        rows = it if isinstance(it, list) else [it]
    except Exception:
        try: rows = [{c.tag: (c.text or '') for c in e} for e in ET.fromstring(b).iter('item')]
        except Exception: rows = []
    for r in rows:
        if not isinstance(r, dict): continue
        g = lambda *ks: next((str(r[k]) for k in r for kk in ks if k.lower() == kk.lower() and r[k]), '')
        t = html.unescape(re.sub(r'<[^>]+>', '', g('title', 'subject', 'sj', 'nttSj'))).strip()
        if not t: continue
        out.append(dict(title=t, date=g('regDate', 'pubDate', 'date', 'regDt', 'writeDate', 'approveDate')[:19], dept=g('dept', 'deptName', 'department', 'writer', 'chargeDept'),
                        url=g('url', 'link', 'detailUrl', 'originUrl', 'fileUrl'), raw_keys=sorted(r.keys())[:20]))
    return out
if not KEY: print('briefs: no key'); raise SystemExit(0)
b = fetch(); L = items(b) if b else []
diag['ok']['brief'] = len(L)
if not L: diag['fail']['brief'] = 1; diag['sample'] = mask(b[:300]) if b else ''
else:
    keys = L[0].pop('raw_keys'); [x.pop('raw_keys', None) for x in L]; diag['fields'] = keys
    json.dump(dict(updated=NOW.isoformat(), source='재정경제부 보도자료(공공데이터포털)', items=L), open(os.path.join(ROOT, 'briefs.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    p = os.path.join(ROOT, 'db', 'briefs', NOW.strftime('%Y-%m') + '.json'); os.makedirs(os.path.dirname(p), exist_ok=True)
    try: old = json.load(open(p))
    except Exception: old = []
    have = {(x['title'], x['date']) for x in old}; old += [x for x in L if (x['title'], x['date']) not in have]
    json.dump(old, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(diag, open(os.path.join(ROOT, 'diag_briefs.json'), 'w'), ensure_ascii=False)
print('briefs', len(L), diag.get('fields'), [e['msg'][:80] for e in diag['errors']][:3])
