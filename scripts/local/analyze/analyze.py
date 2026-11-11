"""맥미니 로컬 분석(표준 라이브러리만). 수집 뒤 매시 :45에 LaunchAgent(com.pyw31337.newsboard-analyze)가 실행.
흐름: data 브랜치 거울(얕은 복제) 갱신 + 라이브 today.json → 새 원본만 처리(체크포인트) → 누적 엔티티 표 병합
→ ledger 브랜치 analysis/ 에 기록·커밋·푸시 → GitHub(ledger.yml archive)이 R2 ana/에 날짜별 보관.
끊기거나 꺼져도 다음 실행이 체크포인트부터 이어감. 푸시 실패 시 로컬 커밋이 남아 다음에 같이 올라감."""
import gzip, hashlib, json, os, re, subprocess, sys, time, urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))
HOME = os.path.expanduser('~/Developer/newsboard-local')
REPO = 'https://github.com/pyw31337/news.git'
MIR, LED = os.path.join(HOME, 'mirror-data'), os.path.join(HOME, 'ledger')
STP = os.path.join(HOME, 'analyze', 'state.json')
VER = 'a1'
NOW = datetime.now(KST)
DAY = NOW.strftime('%Y-%m-%d')


def sh(*a, cwd=None, ok=False):
    r = subprocess.run(a, cwd=cwd, capture_output=True, text=True, timeout=900)
    if r.returncode and not ok:
        raise RuntimeError(' '.join(a[:3]) + ': ' + r.stderr[-200:])
    return r.stdout


def git_sync(path, branch, depth=True):
    if not os.path.isdir(os.path.join(path, '.git')):
        sh('git', 'clone', '-q', *(['--depth', '1'] if depth else []), '--branch', branch, REPO, path)
    elif depth:
        sh('git', 'fetch', '-q', '--depth', '1', 'origin', branch, cwd=path)
        sh('git', 'reset', '-q', '--hard', 'origin/' + branch, cwd=path)
    else:
        sh('git', 'pull', '-q', '--rebase', '-X', 'theirs', 'origin', branch, cwd=path, ok=True)


def J(p, d=None):
    try:
        with (gzip.open(p, 'rt') if p.endswith('.gz') else open(p)) as f:
            return json.load(f)
    except Exception:
        return d


def wr(p, obj, lines=False):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    t = p + '.tmp'
    with open(t, 'w') as f:
        if lines:
            for k in sorted(obj):
                f.write(json.dumps(obj[k], ensure_ascii=False, sort_keys=True) + '\n')
        else:
            json.dump(obj, f, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(t, p)


def table(name):
    p = os.path.join(LED, 'analysis', 'tables', name + '.jsonl')
    out = {}
    if os.path.exists(p):
        for ln in open(p):
            try:
                x = json.loads(ln); out[x['id']] = x
            except Exception:
                pass
    return out


def sid(prefix, s): return prefix + hashlib.sha1(s.encode()).hexdigest()[:10]


def upd(row, **kw):
    """바뀐 값이 있으면 버전 표시(v, updated) 갱신"""
    ch = any(row.get(k) != v for k, v in kw.items())
    row.update(kw)
    if ch:
        row['v'] = VER; row['updated'] = NOW.isoformat(timespec='seconds')
    return ch


def llm(prompt):
    """올라마(로컬)가 있으면 짧은 한 줄 요약. 없거나 느리면 None(규칙 결과만 씀)."""
    for m in ('qwen2.5:3b', 'llama3.2:3b'):
        try:
            r = urllib.request.Request('http://127.0.0.1:11434/api/generate', data=json.dumps(
                {'model': m, 'prompt': prompt, 'stream': False, 'options': {'num_predict': 80, 'temperature': 0.2}}).encode(),
                headers={'Content-Type': 'application/json'})
            t = json.load(urllib.request.urlopen(r, timeout=120)).get('response', '').strip()
            if t:
                return {'model': m, 'text': t.split('\n')[0][:160]}
        except Exception:
            continue
    return None


def main():
    os.makedirs(os.path.dirname(STP), exist_ok=True)
    st = J(STP, {}) or {}
    st.setdefault('files', {}); st.setdefault('runs', 0)
    git_sync(MIR, 'data')
    git_sync(LED, 'ledger', depth=False)
    today = None
    try:
        today = json.load(urllib.request.urlopen('https://pyw31337.github.io/news/data/today.json', timeout=60))
    except Exception:
        pass
    T = {n: table(n) for n in ('journalists', 'outlets', 'issues', 'entities', 'keywords')}
    changed = Counter()
    # 1) 기사 원본(db/articles/날짜/*.json.gz) — 처음 보는 파일만
    daily = defaultdict(lambda: {'articles': 0, 'press': Counter(), 'src': Counter()})
    new_files = 0
    for base in ('db/articles', 'db/articles_global'):
        root = os.path.join(MIR, base)
        for d in sorted(os.listdir(root)) if os.path.isdir(root) else []:
            for fn in sorted(os.listdir(os.path.join(root, d))):
                rel = f'{base}/{d}/{fn}'; p = os.path.join(MIR, rel)
                sig = f'{os.path.getsize(p)}'
                if st['files'].get(rel) == sig:
                    continue
                arts = J(p, []) or []
                for a in arts if isinstance(arts, list) else []:
                    pr = (a.get('press') or '').strip()
                    if not pr:
                        continue
                    daily[d]['articles'] += 1; daily[d]['press'][pr] += 1; daily[d]['src'][a.get('src') or ''] += 1
                st['files'][rel] = sig; new_files += 1
    for d, x in daily.items():
        for pr, n in x['press'].items():
            oid = sid('o', pr)
            row = T['outlets'].setdefault(oid, {'id': oid, 'name': pr, 'articles': 0, 'days': {}})
            row['days'][d] = row['days'].get(d, 0) + n
            changed['outlets'] += upd(row, articles=sum(row['days'].values()), first=min(row['days']), last=max(row['days']), active_days=len(row['days']))
        dp = os.path.join(LED, 'analysis', 'daily', d + '.json')
        cur = J(dp, {}) or {}
        cur.setdefault('articles', 0); cur['articles'] += x['articles']
        tp = Counter(cur.get('press_top') or {}); tp.update(x['press'])
        cur['press_top'] = dict(tp.most_common(30)); cur['date'] = d; cur['v'] = VER
        wr(dp, cur)
    # 2) 기자: 기록(reporter_history) + 맥미니 최신(reporters_local)
    hist = J(os.path.join(MIR, 'reporter_history.json'), {}) or {}
    loc = (J(os.path.join(MIR, 'reporters_local.json'), {}) or {}).get('reporters') or []
    for rid, h in hist.items():
        aff = h.get('affiliations') or []
        row = T['journalists'].setdefault(rid, {'id': rid, 'seen': {}})
        changed['journalists'] += upd(row, name=h.get('name'), outlets=sorted({a.get('press') for a in aff if a.get('press')}),
                                      first=min([a.get('first') for a in aff if a.get('first')] or [None]) if aff else None,
                                      last=max([a.get('last') or '' for a in aff] or [''] ) or None,
                                      profile=(aff[0].get('profile') if aff else None))
    for r in loc:
        row = T['journalists'].setdefault(r['id'], {'id': r['id'], 'seen': {}})
        row['seen'][DAY] = max(row['seen'].get(DAY, 0), r.get('today') or 0)
        changed['journalists'] += upd(row, name=r.get('name'), photo=r.get('photo'), articles_seen=sum(row['seen'].values()),
                                      outlets=sorted(set(row.get('outlets') or []) | {r.get('press')} - {None}),
                                      last=max(row.get('last') or '', DAY), first=row.get('first') or DAY)
    # 3) 오늘 이슈: 품질·화제 기록, 엔티티·키워드 언급, 과거 이슈 연결(키워드 2개 이상 겹침)
    kw_day, cat_day = Counter(), Counter()
    for i in (today or {}).get('issues') or []:
        iid = i.get('id')
        if not iid:
            continue
        kws = [k for k in (i.get('keywords') or []) if isinstance(k, str)][:12]
        ents = [e if isinstance(e, str) else (e.get('name') if isinstance(e, dict) else None) for e in (i.get('entities') or [])]
        ents = [e for e in ents if e][:12]
        row = T['issues'].setdefault(iid, {'id': iid, 'first': DAY, 'scores': {}})
        row['scores'][DAY] = max(row['scores'].get(DAY, 0), i.get('score') or 0)
        changed['issues'] += upd(row, title=i.get('title'), url=i.get('url'), category=i.get('category'), keywords=kws, entities=ents,
                                 q=i.get('q'), best_rank=min(row.get('best_rank') or 999, i.get('rank') or 999), last=DAY,
                                 presses=max(row.get('presses') or 0, len(i.get('presses') or []) if isinstance(i.get('presses'), list) else (i.get('presses') or 0)))
        cat_day[i.get('category') or '기타'] += 1
        for k in kws:
            kw_day[k] += 1
            kid = sid('k', k); kr = T['keywords'].setdefault(kid, {'id': kid, 'word': k, 'days': {}})
            kr['days'][DAY] = max(kr['days'].get(DAY, 0), sum(1 for x in (today or {}).get('issues') or [] if k in (x.get('keywords') or [])))
            changed['keywords'] += upd(kr, total_days=len(kr['days']), first=min(kr['days']), last=max(kr['days']))
        for e in ents:
            eid = sid('e', e); er = T['entities'].setdefault(eid, {'id': eid, 'name': e, 'days': {}, 'issues': []})
            if iid not in er['issues']:
                er['issues'] = (er['issues'] + [iid])[-200:]
            er['days'][DAY] = len([x for x in er['issues'] if T['issues'].get(x, {}).get('last') == DAY])
            changed['entities'] += upd(er, issue_count=len(er['issues']), first=min(er['days']), last=max(er['days']))
    # 연결: 오늘 이슈 ↔ 이전 이슈
    idx = defaultdict(set)
    for r in T['issues'].values():
        for k in r.get('keywords') or []:
            idx[k].add(r['id'])
    for i in (today or {}).get('issues') or []:
        r = T['issues'].get(i.get('id'))
        if not r:
            continue
        c = Counter(x for k in r.get('keywords') or [] for x in idx[k] if x != r['id'])
        rel = [x for x, n in c.most_common(8) if n >= 2 and T['issues'][x].get('first', DAY) < r.get('first', DAY)]
        changed['links'] += upd(r, related=rel[:5])
    # 4) 일별 요약 + (가능하면) 로컬 모델 한 줄
    dp = os.path.join(LED, 'analysis', 'daily', DAY + '.json')
    cur = J(dp, {}) or {}
    cur.update({'date': DAY, 'v': VER, 'issues_today': len((today or {}).get('issues') or []), 'categories': dict(cat_day),
                'keywords_top': dict(kw_day.most_common(30)), 'journalists_today': len(loc), 'updated': NOW.isoformat(timespec='seconds')})
    if kw_day and (not cur.get('llm') or NOW.hour in (9, 13, 18, 22)) and cur.get('llm_h') != NOW.hour:
        top = ', '.join(k for k, _ in kw_day.most_common(12))
        o = llm(f'다음은 오늘 한국 뉴스의 주요 키워드야: {top}. 오늘 뉴스 흐름을 한국어 한 문장(40자 이내)으로 써줘. 설명 없이 문장만.')
        if o:
            cur['llm'] = o; cur['llm_h'] = NOW.hour
    wr(dp, cur)
    for n, t in T.items():
        wr(os.path.join(LED, 'analysis', 'tables', n + '.jsonl'), t, lines=True)
    counts = {n: len(t) for n, t in T.items()}
    wr(os.path.join(LED, 'analysis', 'meta.json'), {'v': VER, 'updated': NOW.isoformat(timespec='seconds'), 'counts': counts,
                                                    'source': 'mac-mini', 'model': (cur.get('llm') or {}).get('model')})
    ml = os.path.join(LED, 'manifest', 'analysis', f'{NOW:%Y-%m}.jsonl')
    os.makedirs(os.path.dirname(ml), exist_ok=True)
    open(ml, 'a').write(json.dumps({'at': NOW.isoformat(timespec='seconds'), 'new_article_files': new_files, 'changed': dict(changed), 'counts': counts}, ensure_ascii=False) + '\n')
    sh('git', 'add', '-A', cwd=LED)
    if sh('git', 'status', '--porcelain', cwd=LED).strip():
        sh('git', '-c', 'user.name=newsboard-mac', '-c', 'user.email=actions@users.noreply.github.com', 'commit', '-qm', f'analysis: {NOW:%Y-%m-%d %H:%M} KST', cwd=LED)
    pushed = False
    for n in range(4):
        if subprocess.run(['git', 'push', '-q', 'origin', 'HEAD:ledger'], cwd=LED, capture_output=True).returncode == 0:
            pushed = True; break
        time.sleep(5 * (n + 1)); sh('git', 'pull', '-q', '--rebase', '-X', 'theirs', 'origin', 'ledger', cwd=LED, ok=True)
    st['runs'] += 1; st['last'] = NOW.isoformat(timespec='seconds'); st['pushed'] = pushed
    wr(STP, st)
    # GitHub 예약 실행이 붐비면 건너뛰어지므로(하루 3회만 도는 일 있음) 맥미니가 매 회 원본 스냅샷을, 03시엔 분석 층 보관을 직접 요청
    task = 'all' if (pushed and NOW.hour == 3) else 'snapshot'
    subprocess.run(['gh', 'workflow', 'run', 'ledger.yml', '-R', 'pyw31337/news', '-f', 'task=' + task], capture_output=True)
    print(f"{NOW:%m-%d %H:%M} files+{new_files} {dict(changed)} {counts} pushed={pushed}")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'{NOW:%m-%d %H:%M} 오류(다음 실행에서 이어감): {str(e)[:200]}'); sys.exit(1)
