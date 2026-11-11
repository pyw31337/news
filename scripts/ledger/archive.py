"""분석 층 보관: ledger 브랜치 analysis/(맥미니 분석 결과)를 날짜별 묶음으로 R2에 올림(추가 전용, 바뀐 날만).
사용: python scripts/ledger/archive.py <ledger폴더>
R2 키: ana/analysis/YYYY/MM/analysis.YYYYMMDD.<해시12>.tar.gz, 목록: manifest/analysis-r2/YYYY-MM.jsonl"""
import hashlib, io, json, os, sys, tarfile
from datetime import datetime, timezone, timedelta
sys.path.insert(0, os.path.dirname(__file__))
import r2

KST = timezone(timedelta(hours=9))
LED = sys.argv[1]
now = datetime.now(KST)
src = os.path.join(LED, 'analysis')
if not os.path.isdir(src):
    print('archive: analysis/ 없음'); sys.exit(0)
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode='w:gz', compresslevel=9) as t:   # 파일 순서·시각 고정 → 내용이 같으면 해시도 같음
    for root, _, fs in sorted(os.walk(src)):
        for fn in sorted(fs):
            p = os.path.join(root, fn); ti = t.gettarinfo(p, os.path.relpath(p, LED)); ti.mtime = 0; ti.uid = ti.gid = 0; ti.uname = ti.gname = ''
            with open(p, 'rb') as f:
                t.addfile(ti, f)
blob = buf.getvalue()
content = hashlib.sha256(b''.join(open(os.path.join(r, f), 'rb').read() for r, _, fs in sorted(os.walk(src)) for f in sorted(fs))).hexdigest()
stp = os.path.join(LED, 'state', 'archive.json')
st = json.load(open(stp)) if os.path.exists(stp) else {}
if st.get('content') == content:
    print('archive: 바뀐 것 없음'); sys.exit(0)
sha = hashlib.sha256(blob).hexdigest()
name = f'analysis.{now:%Y%m%d}.{sha[:12]}.tar.gz'
ok, res = r2.put(f'ana/analysis/{now:%Y/%m}/{name}', blob, legacy=f'{now:%Y-%m}/ledger-{name}')
os.makedirs(os.path.join(LED, 'manifest', 'analysis-r2'), exist_ok=True)
open(os.path.join(LED, 'manifest', 'analysis-r2', f'{now:%Y-%m}.jsonl'), 'a').write(json.dumps(
    {'at': now.isoformat(timespec='seconds'), 'r2': res if ok else None, 'sha256': sha, 'bytes': len(blob), 'ok': ok, **({} if ok else {'err': str(res)[:80]})}) + '\n')
if ok:
    st.update(content=content, at=now.isoformat(timespec='seconds'), r2=res)
    os.makedirs(os.path.dirname(stp), exist_ok=True); json.dump(st, open(stp, 'w'), indent=1)
print(f'archive: {len(blob)//1024}KB → {res}')
sys.exit(0 if ok else 1)
