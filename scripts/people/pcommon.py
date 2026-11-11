"""인물 계층·관계·링크 점검 공용 도구 (tiers.py, edges.py, linkcheck.py).
저장 규칙: 현재 상태 파일은 덮어쓰고, 변경 기록(log/)은 날짜별 새 파일로만 추가한다(지우지 않음)."""
import gzip, json, os, re, time, hashlib, datetime

KST = datetime.timezone(datetime.timedelta(hours=9))
UA = 'NewsBoardPeople/1.0 (+https://pyw31337.github.io/news/; github.com/pyw31337/news)'


def today():
    return datetime.datetime.now(KST).strftime('%Y-%m-%d')


def now_iso():
    return datetime.datetime.now(KST).strftime('%Y-%m-%dT%H:%M:%S+09:00')


def load(path, default=None):
    try:
        if path.endswith('.gz'):
            with gzip.open(path, 'rt', encoding='utf-8') as f:
                return json.load(f)
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError, EOFError):
        return default


def save(path, obj, compact=True):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    tmp = path + '.tmp'
    kw = dict(ensure_ascii=False, separators=(',', ':')) if compact else dict(ensure_ascii=False, indent=1)
    if path.endswith('.gz'):
        with gzip.open(tmp, 'wt', encoding='utf-8', compresslevel=9) as f:
            json.dump(obj, f, **kw)
    else:
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(obj, f, **kw)
    os.replace(tmp, path)


def append_log(dirpath, rows, stem=None):
    """추가 전용 기록: <dir>/<YYYY-MM>/<YYYY-MM-DD>[-n].jsonl.gz. 같은 날 여러 번 돌아도 기존 파일을 건드리지 않음."""
    if not rows:
        return None
    d = stem or today()
    sub = os.path.join(dirpath, d[:7])
    os.makedirs(sub, exist_ok=True)
    n = 0
    while True:
        p = os.path.join(sub, d + ('' if n == 0 else '-%d' % n) + '.jsonl.gz')
        if not os.path.exists(p):
            break
        n += 1
    with gzip.open(p, 'wt', encoding='utf-8', compresslevel=9) as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False, separators=(',', ':')) + '\n')
    return p


def h(s, n=12):
    return hashlib.sha1(str(s).encode('utf-8')).hexdigest()[:n]


def norm_name(s):
    return re.sub(r'\([^)]*\)|\s|[·ㆍ.\'"‘’“”-]', '', str(s or '')).strip()


def norm_pid(x):
    """명부 id 형식으로 맞춤: wd:Q123, pol:ABCD1234. 엉터리(wd:a…) id는 None."""
    x = str(x or '').strip()
    m = re.fullmatch(r'(?:wd:)?(Q\d+)', x)
    if m:
        return 'wd:' + m.group(1)
    m = re.fullmatch(r'(?:pol:|wd:a|a)?([0-9A-Z]{8})', x)
    if m:
        return 'pol:' + m.group(1)
    return None


def is_url(u):
    return isinstance(u, str) and re.match(r'^https?://[^/\s]+\.[^/\s]+', u) is not None
