#!/usr/bin/env python3
"""사건 단위 흐름·수집 품질 자동화.

수집된 기사와 날짜별 archive를 하나의 episode로 연결하되, 직업명만 겹치는
주변 기사는 제외한다. 결과는 today.json의 continuity와 data/event_quality.json에
저장된다. 원문 URL과 confidence를 함께 남겨 후속 에이전트·편집자가 검수할 수 있다.
"""
import datetime as dt
import glob
import hashlib
import json
import os
import re
import sys

P = sys.argv[1] if len(sys.argv) > 1 else 'data/today.json'
ROOT = os.path.dirname(P)
GENERIC = {'ai', '뉴스', '기사', '논란', '관련', '오늘', '현재', '정부', '한국', '사람', '이슈', '사건', '보도'}
STRONG = {'수석', '합격자', '커닝', 'ai커닝', '안경', '부정행위', '자수', '경찰', '출석', '변호사', '법적', '의혹', '만점', '한원석'}
EVENT_WORDS = ('자수', '인정', '실토', '시인', '경찰', '출석', '수사', '피의자', '변호사', '법적 대응', '부정행위', '커닝', '의혹', '만점', '안경', '반납', '경위서', '소환', '구속', '공소', '시험무효')

def load(path, default):
    try:
        with open(path, encoding='utf-8') as f: return json.load(f)
    except Exception: return default

def terms(issue):
    raw = list(issue.get('keywords') or []) + list(issue.get('entities') or []) + re.split(r'[\s·“”‘’\'"…,:!?()[\]{}]+', issue.get('title', ''))
    return {str(x).strip().lower() for x in raw if len(str(x).strip()) >= 2 and str(x).strip().lower() not in GENERIC}

def stage(title):
    t = title or ''
    if re.search(r'반납|경위서|처분|시험무효', t): return '후속 조치', 3
    if re.search(r'자수|인정|실토|시인', t): return '인정·자수', 5
    if re.search(r'경찰|출석|수사|피의자|구속|기소|공소', t): return '수사·출석', 4
    if re.search(r'변호사|법적 대응|말도 안|부인|아니다', t): return '부인·법적 대응', 3
    if re.search(r'의혹|만점|고득점|99\.38|안경', t): return '만점·의혹', 2
    if re.search(r'합격|수석|발표', t): return '합격 발표', 1
    return '후속 보도', 0

def relevant(text, ts):
    t = (text or '').lower()
    title = t.split(' || ', 1)[0]
    title_event = any(w in title for w in EVENT_WORDS)
    anchor = any(w in t for w in ('세무사', '수석 합격', '수석합격', '세무냥이', '한원석'))
    hits = {x for x in ts if x in t}
    strong = {x for x in hits if x in STRONG or any(x in y for y in STRONG)}
    return (title_event and anchor) or (len(strong) >= 2 and anchor)

def score(text, ts):
    t = (text or '').lower()
    return sum(2 if len(x) >= 3 else 1 for x in ts if x in t)

def key(title):
    return re.sub(r'[^가-힣a-z0-9]', '', (title or '').lower())[:32]

def archive_files():
    return sorted(glob.glob(os.path.join(ROOT, 'archive', '20*.json')))

def build(issue, today):
    ts = terms(issue); by_date = {}; duplicate = 0
    def add(e, origin):
        nonlocal duplicate
        text = f"{e.get('title','')} || {e.get('body','')}"
        if not relevant(text, ts): return
        st, rank = stage(e.get('title', ''))
        e.update(stage=st, stage_rank=rank, confidence=round(min(0.99, 0.48 + score(text, ts) * .07 + (0.12 if e.get('url') else 0)), 2), origin=origin)
        date = e.get('date') or ''
        if not date: return
        old = by_date.get(date)
        if old:
            duplicate += 1
            if (e['stage_rank'], e['confidence']) <= (old['stage_rank'], old['confidence']): return
        by_date[date] = e
    for group in issue.get('flow') or []:
        for item in group.get('items') or []:
            add(dict(date=group.get('date'), title=item.get('title'), body=item.get('body',''), url=item.get('url') or item.get('ourl'), press=item.get('press'), img=item.get('img')), 'today.flow')
    for path in archive_files():
        date = os.path.basename(path)[:10]
        if date >= (today or '9999-99-99'): continue
        archive = load(path, {})
        for old_issue in archive.get('issues') or []:
            old_terms = terms(old_issue)
            overlap = len(ts & old_terms)
            if overlap < 2 or not relevant(old_issue.get('title',''), ts): continue
            sources = old_issue.get('sources') or []
            if not sources: continue
            source = max(sources, key=lambda s: (stage(s.get('title',''))[1], score(s.get('title',''), ts)))
            add(dict(date=date, title=source.get('title') or old_issue.get('title'), body=(old_issue.get('summary') or [''])[0], url=source.get('url') or source.get('ourl'), press=source.get('press'), img=source.get('img')), 'archive')
    events = [by_date[d] for d in sorted(by_date)]
    direct = [e for e in events if re.search(r'세무사|수석|AI ?커닝|AI ?안경|한원석|세무냥이', e.get('title',''), re.I)]
    if len(direct) >= 3: events = direct
    stages = [e['stage'] for e in events]
    expected = ['합격 발표', '만점·의혹', '부인·법적 대응', '인정·자수', '수사·출석']
    gaps = [s for s in expected if s not in stages]
    first = events[0]['stage'] if events else ''
    if events and first != '합격 발표' and '합격 발표' not in stages: gaps.insert(0, '최초 합격 발표')
    quality = round(max(0, min(1, (len(events) / 5) * .45 + (1 - len(gaps) / len(expected)) * .4 + min(1, sum(bool(e.get('url')) for e in events) / max(1, len(events))) * .15)), 2)
    episode = 'episode:' + hashlib.sha1((issue.get('id','') + '|' + '|'.join(sorted(ts))).encode()).hexdigest()[:14]
    return episode, events[-8:], dict(episode=episode, quality=quality, stages=stages, gaps=gaps, duplicate_candidates=duplicate, event_count=len(events), evidence_rate=round(sum(bool(e.get('url')) for e in events) / max(1, len(events)), 2))

def main():
    data = load(P, {}); today = data.get('date') or dt.date.today().isoformat(); summary = []
    for issue in data.get('issues') or []:
        episode, events, meta = build(issue, today)
        issue['episode_id'] = episode; issue['continuity'] = events; issue['continuity_quality'] = meta
        summary.append(dict(id=issue.get('id'), title=issue.get('title'), **meta))
    data['event_quality_at'] = dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    json.dump(data, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(dict(schema='newsboard.event-quality.v1', date=today, issues=summary), open(os.path.join(ROOT, 'event_quality.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('event quality:', len(summary), 'issues; gaps:', sum(bool(x['gaps']) for x in summary))

if __name__ == '__main__': main()
