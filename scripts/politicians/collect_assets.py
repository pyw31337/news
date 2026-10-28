#!/usr/bin/env python3
"""국회의원 재산공개 수집(원출처: 국회공보 PDF, 국회공직자윤리위원회 공고). 한국 IP 필요(맥미니).
국회공보 목록(assembly.go.kr)에서 3월 하순(정기재산변동신고)·8~9월(신규 재산등록) 호를 찾아 PDF를 받고,
'성명 …' 블록마다 '▶ 항목(소계)'와 '총 계'(종전·증가·감소·현재, 천원)를 읽어 people/<코드>.json 의 assets 에 연도별 저장.
결과: PDATA/assets_index.json(호 목록·건수), people/*.json assets. PDF 캐시: PDATA/../gongbo/ (저장소에 넣지 않음)
환경: ASSET_FROM(기본 2016)"""
import json, os, re, sys, time, datetime, urllib.request, html
P = sys.argv[1]; C = os.path.join(os.path.dirname(os.path.abspath(P)), 'gongbo'); os.makedirs(C, exist_ok=True)
FROM = int(os.environ.get('ASSET_FROM') or 2016)
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
BASE = 'https://www.assembly.go.kr'
LIST = BASE + '/portal/cnts/cntsNamgzn/gongbo.do?cntsDivCd=NAMGZN&menuNo=601019&pdfClsCd=CPR&pageIndex=%d'
TODAY = datetime.date.today().isoformat()
def get(u, t=120):
    for i in range(3):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=t).read()
        except Exception as e: err = e; time.sleep(3)
    raise err
# 1) 목록에서 후보 호 찾기
cat_path = os.path.join(C, 'catalog.json')
cat = json.load(open(cat_path)) if os.path.exists(cat_path) else {}
for pg in range(1, 400):
    h = html.unescape(get(LIST % pg).decode('utf-8', 'ignore'))
    rows = re.findall(r'<tr>(.*?)</tr>', h, re.S)
    items = []
    for r in rows:
        t = re.search(r'title="국회공보 제(\d{4}-\d+)호([^"]*)"', r); f = re.search(r'atchFileId=([^&"]+)', r); d = re.search(r'<td title="(\d{4}-\d{2}-\d{2})"', r)
        if t and f: items.append((t.group(1), {'fid': f.group(1), 'title': t.group(2).strip(), 'date': d.group(1) if d else ''}))
    if not items: break
    new = sum(1 for no, _ in items if no not in cat)
    for no, v in items:
        if no not in cat or cat[no].get('fid') != v['fid']: cat[no] = v
    if min(v['date'] for _, v in items if v['date']) < f'{FROM}-01-01': break
    if not new and cat.get('_full'): break
cat['_full'] = True
json.dump(cat, open(cat_path, 'w'), ensure_ascii=False)
def cand(no, v):
    d = v.get('date') or ''
    if not d or d < f'{FROM}-01-01' or v.get('asset') is False: return False
    return '재산' in v.get('title', '') or '03-20' <= d[5:] <= '04-05' or '08-20' <= d[5:] <= '09-05'
import pdfplumber
NUM = r'(-?[\d,]+|-)'
def n(s): return None if s in ('-', '') else int(s.replace(',', ''))
def parse(path):
    pdf = pdfplumber.open(path)
    first = pdf.pages[0].extract_text() or ''
    if '재산' not in first: return None, None
    kind = '정기재산변동신고' if '정기재산변동' in first else ('재산등록사항' if '재산등록' in first else '재산공개')
    out = []; cur = None; buf = ''
    for p in pdf.pages:
        for ln in (p.extract_text() or '').split('\n'):
            m = re.search(r'소속\s+(\S+)\s+직위\s+(.+?)\s+성명\s+(\S+)', ln)
            if m:
                cur = {'org': m.group(1), 'title': m.group(2).strip(), 'name': m.group(3), 'cats': {}}; out.append(cur); buf = ''; continue
            if not cur: continue
            if ln.startswith('▶') or buf:
                buf = (buf + ' ' + ln).strip() if buf else ln
                m = re.match(r'▶\s*(.+?)\(소계\)\s+' + NUM + r'\s+' + NUM + r'\s+' + NUM + r'\s+' + NUM, buf)
                if m: cur['cats'][m.group(1).replace(' ', '')] = [n(m.group(i)) for i in range(2, 6)]; buf = ''
                elif '고지거부' in buf or len(buf) > 200 or not buf.startswith('▶'): buf = ''
                continue
            m = re.match(r'총\s*계\s+' + NUM + r'\s+' + NUM + r'\s+' + NUM + r'\s+' + NUM, ln)
            if m: cur['total'] = [n(m.group(i)) for i in range(1, 5)]
    return kind, [o for o in out if 'total' in o]
# 2) 사람 매칭 준비
idx = json.load(open(f'{P}/index.json', encoding='utf-8'))
byname = {}
for e in idx['people']: byname.setdefault(e['name'], []).append(e)
def age_at(d):
    y, md = int(d[:4]), d[5:]
    for a, s in ((22, '2024-05-30'), (21, '2020-05-30'), (20, '2016-05-30'), (19, '2012-05-30')):
        if d >= s: return a
    return 18
recs = {}; issues = []
for no, v in sorted((k, v) for k, v in cat.items() if k != '_full'):
    if not cand(no, v): continue
    f = os.path.join(C, no + '.pdf')
    if not os.path.exists(f):
        try: b = get(f'{BASE}/portal/cmmn/file/fileDown.do?atchFileId={v["fid"]}&fileSn=1', 300)
        except Exception as e: print('down fail', no, e); continue
        open(f, 'wb').write(b)
    try: kind, rows = parse(f)
    except Exception as e: print('parse fail', no, e); continue
    if not rows:
        v['asset'] = False; os.remove(f); continue
    members = [r for r in rows if '국회의원' in r['title'] or r['title'] in ('국회의장', '국회부의장')]
    a = age_at(v['date']); matched = 0
    url = f'{BASE}/portal/cmmn/file/fileDown.do?atchFileId={v["fid"]}&fileSn=1'
    for r in members:
        c = [e for e in byname.get(r['name'], []) if a in (e.get('ages') or []) or (a - 1) in (e.get('ages') or [])]
        if len(c) > 1: c = [e for e in c if a in e.get('ages', [])]
        if len(c) != 1: continue
        k = r['cats']; g = lambda *names: sum((k[x][3] or 0) for x in k if any(nm in x for nm in names)) if any(any(nm in x for nm in names) for x in k) else 0
        t = r['total']
        recs.setdefault(c[0]['id'], []).append({
            'date': v['date'], 'year': int(v['date'][:4]), 'kind': kind, 'issue': f'국회공보 제{no}호',
            'prev': t[0], 'inc': t[1], 'dec': t[2], 'total': t[3], 'change': (t[3] - t[0]) if t[0] is not None and t[3] is not None else None,
            'land': g('토지'), 'building': g('건물'), 'securities': g('증권'), 'deposits': g('예금', '현금') - g('정치자금'), 'polfund': g('정치자금'), 'debt': g('채무'),
            'cats': {x: k[x][3] for x in k}, 'url': url})
        matched += 1
    issues.append({'issue': no, 'date': v['date'], 'kind': kind, 'rows': len(rows), 'members': len(members), 'matched': matched, 'url': url})
    print(no, v['date'], kind, 'rows', len(rows), 'members', len(members), 'matched', matched, flush=True)
# 3) 저장
SRC = {'name': '국회공보(국회공직자윤리위원회 재산공개 공고)', 'unit': '천원', 'fetched': TODAY,
       'note': '공보 PDF 원문에서 항목 소계·총계를 기계적으로 읽은 값. 부동산은 공시가격 등 신고가액 기준이며 시가와 다를 수 있음.'}
n_people = 0
for pid, L in recs.items():
    path = f'{P}/people/{pid}.json'
    if not os.path.exists(path): continue
    d = json.load(open(path, encoding='utf-8'))
    L.sort(key=lambda x: x['date'])
    d['assets'] = {'records': L, 'latest': L[-1]['total'], 'latest_date': L[-1]['date'], 'source': SRC}
    json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); n_people += 1
for e in idx['people']:
    if e['id'] in recs: e['asset'] = sorted(recs[e['id']], key=lambda x: x['date'])[-1]['total']
idx['assets_people'] = n_people; idx['assets_rows'] = sum(len(v) for v in recs.values())
json.dump(idx, open(f'{P}/index.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({'updated': TODAY, 'issues': issues, 'people': n_people, 'rows': idx['assets_rows'], 'source': SRC}, open(f'{P}/assets_index.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(cat, open(cat_path, 'w'), ensure_ascii=False)
print('assets people', n_people, 'rows', idx['assets_rows'], 'issues', len(issues))
