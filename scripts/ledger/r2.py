"""R2 원장 업로드(GitHub Actions OIDC 전용). 키 값은 절대 출력하지 않는다.
1순위: Worker /ledger/put (추가 전용: 같은 키 덮어쓰기 거부, sha256 검증) → R2 ledger/<key>
2순위(새 Worker 배포 전): /backup/put → R2 branches/YYYY-MM/<이름> (이름에 내용 해시가 있어 같은 키 = 같은 내용)
"""
import hashlib, json, os, time, urllib.request, urllib.error, urllib.parse

W = os.environ.get('NB_WORKER', 'https://newsboard-sync.pyw213.workers.dev')


def oidc():
    u, t = os.environ.get('ACTIONS_ID_TOKEN_REQUEST_URL'), os.environ.get('ACTIONS_ID_TOKEN_REQUEST_TOKEN')
    if not (u and t):
        return None
    r = urllib.request.Request(u + '&audience=newsboard-sync', headers={'Authorization': 'bearer ' + t, 'User-Agent': 'curl/8 newsboard-ledger'})
    return json.load(urllib.request.urlopen(r, timeout=20))['value']


def _req(method, path, tok, body=None, headers=None):
    h = {'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/octet-stream', 'User-Agent': 'curl/8 newsboard-ledger', **(headers or {})}
    r = urllib.request.Request(W + path, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=180) as x:
            return x.status, json.loads(x.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b'{}')
        except Exception:
            return e.code, {}


def put(key, body, legacy=None):
    """key: 'raw/<출처>/YYYY/MM/DD/<이름>' 등(ledger/ 아래). legacy: 'YYYY-MM/<이름>'(예전 경로). 반환 (성공, 저장 위치 또는 오류)"""
    sha = hashlib.sha256(body).hexdigest()
    last = None
    for n in range(3):
        try:
            tok = oidc()
            if not tok:
                return False, 'no-oidc'
            st, res = _req('PUT', '/ledger/put?k=' + urllib.parse.quote(key, safe='/'), tok, body, {'X-Sha256': sha})
            if st == 200:
                return True, 'ledger/' + key
            if st == 409:
                return False, 'conflict'          # 같은 키에 다른 내용: 덮어쓰지 않음
            if st in (401, 404, 405) and legacy:  # 새 Worker 배포 전(옛 Worker는 모르는 경로를 401로 답함)
                st, res = _req('PUT', '/backup/put?k=' + legacy, tok, body)
                if st == 200:
                    return True, 'branches/' + legacy
            last = '%s %s' % (st, str(res)[:80])
        except Exception as e:
            last = str(e)[:120]
        time.sleep(10 * (n + 1))
    return False, last


def listing(prefix):
    """R2 ledger/<prefix> 목록 [[키, 크기, sha256]]. 새 Worker 배포 전이면 None"""
    tok = oidc()
    if not tok:
        return None
    out, cur = [], None
    while True:
        q = '/ledger/list?prefix=' + urllib.parse.quote(prefix, safe='/') + ('&cursor=' + urllib.parse.quote(cur) if cur else '')
        st, res = _req('GET', q, tok)
        if st != 200:
            return None
        out += res.get('objects', [])
        cur = res.get('cursor')
        if not cur:
            return out


def usage():
    tok = oidc()
    if not tok:
        return None
    st, res = _req('GET', '/usage', tok)
    return res if st == 200 else None
