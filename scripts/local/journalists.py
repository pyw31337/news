#!/usr/bin/env python3
"""Mac mini(한국 IP)에서 오늘 기사 바이라인(기자)을 모아 data 브랜치 reporters_local.json에 올린다.
GitHub 러너는 네이버가 기자 영역을 빼고 응답해서(10.30~) 여기서 대신 수집한다. 표준 라이브러리 + gh CLI만 사용."""
import base64, datetime as dt, hashlib, json, os, subprocess, sys, tempfile, urllib.request
REPO = 'pyw31337/news'; PATH = 'reporters_local.json'; BRANCH = 'data'
HERE = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; NewsBoard local)', 'Accept-Language': 'ko-KR,ko;q=0.9', 'Referer': 'https://news.naver.com/'}
KST = dt.timezone(dt.timedelta(hours=9))
def log(*a): print(dt.datetime.now(KST).strftime('%m-%d %H:%M'), *a, flush=True)
def get(url, enc='utf-8', timeout=8):
    for _ in range(2):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read().decode(enc or 'utf-8', 'replace')
        except Exception as e: err = e
    log('fail', url, err); return None
def load_reporters_module():
    # 저장소의 최신 reporters.py를 쓴다(로컬 클론이 없어도 동작).
    src = get('https://raw.githubusercontent.com/%s/main/scripts/reporters.py' % REPO, timeout=15)
    if not src:
        sys.path.insert(0, os.path.join(HERE, '..')); import reporters; return reporters
    p = os.path.join(tempfile.gettempdir(), 'nb_reporters.py'); open(p, 'w').write(src)
    import importlib.util; s = importlib.util.spec_from_file_location('nb_reporters', p); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m
def gh(*args, data=None):
    r = subprocess.run(['gh', 'api', *args] + (['--input', '-'] if data else []), input=data, capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr
def main():
    try: urllib.request.urlopen('https://n.news.naver.com', timeout=5)
    except Exception: log('offline, skip'); return 0
    page = get('https://pyw31337.github.io/news/data/today.json?t=%d' % dt.datetime.now().timestamp(), timeout=20)
    if not page: return 0
    issues = json.loads(page).get('issues') or []
    R = load_reporters_module()
    rows = R.collect(issues, tempfile.mkdtemp(), dt.datetime.now(dt.timezone.utc), get, limit=20)
    fresh = [r for r in rows if r.get('today')]
    if not fresh: log('no fresh bylines (%d issues), skip' % len(issues)); return 0
    body = json.dumps(dict(updated=dt.datetime.now(KST).isoformat(timespec='seconds'), source='mac-mini', reporters=fresh), ensure_ascii=False, separators=(',', ':'))
    digest = lambda rs: hashlib.sha1(json.dumps([(r['id'], r.get('today'), r.get('issues')) for r in rs], ensure_ascii=False).encode()).hexdigest()
    code, out, _ = gh('repos/%s/contents/%s?ref=%s' % (REPO, PATH, BRANCH))
    sha, old = None, None
    if code == 0:
        j = json.loads(out); sha = j['sha']
        try: old = json.loads(base64.b64decode(j['content']).decode())
        except Exception: pass
    age = None
    if old:
        try: age = (dt.datetime.now(KST) - dt.datetime.fromisoformat(old['updated'])).total_seconds()
        except Exception: pass
    # 내용이 같고 3시간 안이면 커밋하지 않는다(신선도 유지용 최소 커밋만).
    if old and digest(old.get('reporters', [])) == digest(fresh) and age is not None and age < 3 * 3600:
        log('unchanged, %d journalists' % len(fresh)); return 0
    payload = dict(message='data: journalists from mac (%d)' % len(fresh), branch=BRANCH, content=base64.b64encode(body.encode()).decode())
    if sha: payload['sha'] = sha
    code, out, err = gh('-X', 'PUT', 'repos/%s/contents/%s' % (REPO, PATH), data=json.dumps(payload))
    log('pushed' if code == 0 else 'push failed ' + err.strip()[:200], len(fresh), ', '.join(r['name'] for r in fresh[:5]))
    return 0
if __name__ == '__main__': sys.exit(main())
