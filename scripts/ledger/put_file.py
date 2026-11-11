"""큰 파일 하나를 R2 원장에 보관(바뀌었을 때만, 추가 전용): python scripts/ledger/put_file.py <파일> <ledger폴더> <출처이름>
R2 키: raw/<출처>/YYYY/MM/DD/<파일이름>.<해시12>.gz (비공개, 공개 경로 pub/ 아님). 목록: manifest/raw/<출처>/YYYY-MM.jsonl
예: people_bio.json(제미나이 인물사전 73MB)은 git에는 압축본만 두고 판본마다 여기 보관."""
import gzip, hashlib, json, os, sys
from datetime import datetime, timezone, timedelta
sys.path.insert(0, os.path.dirname(__file__))
import r2

KST = timezone(timedelta(hours=9))
path, LED, SRC = sys.argv[1], sys.argv[2], sys.argv[3]
if not os.path.exists(path):
    print('put_file: 없음', path); sys.exit(0)
raw = open(path, 'rb').read()
if not path.endswith('.gz'):
    raw = gzip.compress(raw, 9, mtime=0)
content = hashlib.sha256(gzip.decompress(raw)).hexdigest()
stp = os.path.join(LED, 'state', f'file-{SRC}.json')
st = json.load(open(stp)) if os.path.exists(stp) else {}
if st.get('content') == content:
    print('put_file: 바뀐 것 없음', SRC); sys.exit(0)
now = datetime.now(KST)
sha = hashlib.sha256(raw).hexdigest()
base = os.path.basename(path).replace('.gz', '')
name = f'{base}.{now:%Y%m%dt%H%M}.{sha[:12]}.gz'
ok, res = r2.put(f'raw/{SRC}/{now:%Y/%m/%d}/{name}', raw, legacy=f'{now:%Y-%m}/{SRC}.{name}'.lower()[:80])
os.makedirs(os.path.join(LED, 'manifest', 'raw', SRC), exist_ok=True)
open(os.path.join(LED, 'manifest', 'raw', SRC, f'{now:%Y-%m}.jsonl'), 'a').write(json.dumps(
    {'at': now.isoformat(timespec='seconds'), 'src': SRC, 'r2': res if ok else None, 'sha256': sha, 'bytes': len(raw), 'ok': ok, 'f': os.path.basename(path)}) + '\n')
if ok:
    st.update(content=content, at=now.isoformat(timespec='seconds'), r2=res)
    os.makedirs(os.path.dirname(stp), exist_ok=True); json.dump(st, open(stp, 'w'), indent=1)
print(f'put_file: {SRC} {len(raw) // 1024}KB → {res}')
