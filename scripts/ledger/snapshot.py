"""원본 스냅샷(불변, 덮어쓰기 없음): 매 수집 실행 끝에 바뀐 파일만 묶어 R2에 올리고 ledger 브랜치 목록(manifest)에 한 줄 추가.
사용: python scripts/ledger/snapshot.py <data폴더> <ledger폴더> [source=collect]
- today.json 전체는 3시간에 1번(용량 절약), 대신 이슈 요약(slim)은 매번.
- 작은 결과 파일(기자·민심·시장·통계 등)은 내용이 바뀌었을 때만.
- db/articles 등 날짜 폴더의 새 파일은 처음 보일 때 1번.
"""
import gzip, hashlib, json, os, sys, time
from datetime import datetime, timezone, timedelta
sys.path.insert(0, os.path.dirname(__file__))
import r2

KST = timezone(timedelta(hours=9))
DATA, LED = sys.argv[1], sys.argv[2]
SRC = sys.argv[3] if len(sys.argv) > 3 else 'collect'
SMALL = ['reporters.json', 'reporters_local.json', 'reporter_history.json', 'voice.json', 'social.json', 'fun.json', 'quiz.json',
         'market_detail.json', 'ecos_series.json', 'official.json', 'stats.json', 'stats_detail.json', 'quality.json', 'briefs.json',
         'global.json', 'status.json', 'entity_history.json', 'entity_media.json', 'runlog.json', 'index/entities.json', 'index/keywords.json']
DATED = ['db/articles', 'db/articles_global', 'db/dupes', 'db/briefs', 'db/dart', 'archive']
SLIM = ['rank', 'id', 'title', 'url', 'press', 'image', 'keywords', 'entities', 'category', 'trend', 'score', 'mentions', 'presses', 'q']


def h(b): return hashlib.sha256(b).hexdigest()


def rawkey(name):
    """raw.<출처>.<YYYYMMDDtHHMM>.<해시>.jsonl.gz → raw/<출처>/YYYY/MM/DD/<이름> (날짜별 추가 전용 칸)"""
    p = name.split('.'); d = p[2]
    return f'raw/{p[1]}/{d[:4]}/{d[4:6]}/{d[6:8]}/{name}'


def main():
    now = datetime.now(KST)
    st_p = os.path.join(LED, 'state', f'snapshot-{SRC}.json')
    st = json.load(open(st_p)) if os.path.exists(st_p) else {'files': {}, 'today_at': 0}
    os.makedirs(os.path.dirname(st_p), exist_ok=True)
    recs, meta = [], []

    def add(name, raw, kind):
        sh = h(raw)
        if st['files'].get(name) == sh:
            return
        try:
            body = json.loads(gzip.decompress(raw) if name.endswith('.gz') else raw)
        except Exception:
            return
        recs.append(json.dumps({'f': name, 'kind': kind, 'sha': sh, 'data': body}, ensure_ascii=False, separators=(',', ':')))
        meta.append({'f': name, 'sha': sh[:16], 'bytes': len(raw)})
        st['files'][name] = sh

    tp = os.path.join(DATA, 'today.json')
    if os.path.exists(tp):
        raw = open(tp, 'rb').read()
        t = json.loads(raw)
        slim = {'updated': t.get('updated'), 'date': t.get('date'), 'stats': t.get('stats'), 'trends': t.get('trends'),
                'issues': [{k: i.get(k) for k in SLIM} for i in t.get('issues') or []]}
        add('today.slim.json', json.dumps(slim, ensure_ascii=False).encode(), 'slim')
        if time.time() - st.get('today_at', 0) > 170 * 60:
            add('today.json', raw, 'full'); st['today_at'] = time.time()
    for f in SMALL:
        p = os.path.join(DATA, f)
        if os.path.exists(p):
            add(f, open(p, 'rb').read(), 'small')
    # 날짜 폴더: 최근 3일치만 훑음(그 전 것은 이미 기록됨)
    days = {(now - timedelta(days=d)).strftime('%Y-%m-%d') for d in range(3)}
    for d in DATED:
        base = os.path.join(DATA, d)
        if not os.path.isdir(base):
            continue
        for root, _, fs in os.walk(base):
            for fn in fs:
                p = os.path.join(root, fn); rel = os.path.relpath(p, DATA)
                if any(x in rel for x in days) and fn.endswith(('.json', '.json.gz')):
                    add(rel, open(p, 'rb').read(), 'dated')
    if not recs:
        print('snapshot: 바뀐 것 없음'); json.dump(st, open(st_p, 'w')); return
    blob = gzip.compress(('\n'.join(recs) + '\n').encode(), 9)
    sh = h(blob)
    name = f"raw.{SRC}.{now:%Y%m%dt%H%M}.{sh[:12]}.jsonl.gz"
    ok, res = r2.put(rawkey(name), blob, legacy=f"{now:%Y-%m}/{name}")
    line = {'at': now.isoformat(timespec='seconds'), 'src': SRC, 'r2': res if ok else None, 'sha256': sh, 'bytes': len(blob),
            'n': len(recs), 'ok': ok, 'files': meta}
    if not ok:
        # R2가 막혀도 잃지 않게: 업로드 대기 폴더(ledger 브랜치)에 보관 → 다음 실행이 다시 올림
        os.makedirs(os.path.join(LED, 'pending', SRC), exist_ok=True)
        open(os.path.join(LED, 'pending', SRC, name), 'wb').write(blob)
        line['err'] = str(res)[:80]
    os.makedirs(os.path.join(LED, 'manifest', 'raw', SRC), exist_ok=True)
    open(os.path.join(LED, 'manifest', 'raw', SRC, f'{now:%Y-%m}.jsonl'), 'a').write(json.dumps(line, ensure_ascii=False) + '\n')
    # 예전에 실패한 것 다시 올리기
    pd = os.path.join(LED, 'pending', SRC)
    for fn in sorted(os.listdir(pd)) if os.path.isdir(pd) else []:
        if fn == name:
            continue
        b = open(os.path.join(pd, fn), 'rb').read()
        ym = f'{fn.split(".")[2][:4]}-{fn.split(".")[2][4:6]}'
        ok2, res2 = r2.put(rawkey(fn), b, legacy=f'{ym}/{fn}')
        if ok2:
            os.remove(os.path.join(pd, fn))
            open(os.path.join(LED, 'manifest', 'raw', SRC, f'{now:%Y-%m}.jsonl'), 'a').write(json.dumps({'at': now.isoformat(timespec='seconds'), 'retry': fn, 'r2': res2, 'sha256': h(b), 'bytes': len(b), 'ok': True}) + '\n')
    os.makedirs(os.path.dirname(st_p), exist_ok=True)
    json.dump(st, open(st_p, 'w'))
    print(f'snapshot: {len(recs)}개 파일, {len(blob)//1024}KB → {"R2" if ok else "대기열"}')


if __name__ == '__main__':
    main()
