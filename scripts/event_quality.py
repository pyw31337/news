#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사건 단위 흐름·수집 품질 자동화 (Universal Event Continuity & Quality Engine v2)

- 뉴스보드 수집된 기사와 날짜별 archive를 단일 episode로 유기적 연결
- 특정 사건에 국한되지 않고 정치, 경제, 사회, 법률, 글로벌 테크 전 이슈에 보편적으로 적용
- 엔티티(인물·기업·기관) 및 사건 단계(발단 ➔ 입장 ➔ 수사/대응 ➔ 사법/처분 ➔ 파장) 생애주기 추적
- 산출물: data/today.json (continuity 보강) 및 data/event_quality.json (품질 감사 리포트)
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
GENERIC = {'ai', '뉴스', '기사', '논란', '관련', '오늘', '현재', '정부', '한국', '사람', '이슈', '사건', '보도', '속보', '종합', '단독'}

STAGE_PATTERNS = [
    ('파장·후속', 5, re.compile(r'파장|후속|여파|영향|재발|개선|개혁|전망|대책')),
    ('사법·처분', 4, re.compile(r'구속|기소|선고|패소|승소|판결|처분|취소|합의|마감|벌금|형량|송치|검거|체포')),
    ('수사·대응', 3, re.compile(r'수사|경찰|검찰|압수수색|출석|소환|공판|조사|감찰|대응|긴급|감시|CCTV')),
    ('입장·공방', 2, re.compile(r'입장|해명|반박|부인|맞불|비판|호소|주장|눈물|설명|사과|시인|자수')),
    ('발단·의혹', 1, re.compile(r'의혹|논란|발단|파문|제기|발생|최초|추락|붕괴|급변|폭로|고소|피소|혐의'))
]

EXPECTED_STAGES = ['발단·의혹', '입장·공방', '수사·대응', '사법·처분', '파장·후속']

def load(path, default):
    try:
        with open(path, encoding='utf-8') as f: return json.load(f)
    except Exception: return default

def terms(issue):
    raw = list(issue.get('keywords') or []) + list(issue.get('entities') or []) + re.split(r'[\s·“”‘’\'"…,:!?()[\]{}]+', issue.get('title', ''))
    return {str(x).strip().lower() for x in raw if len(str(x).strip()) >= 2 and str(x).strip().lower() not in GENERIC}

def stage(title):
    t = title or ''
    for st_name, rank, pat in STAGE_PATTERNS:
        if pat.search(t):
            return st_name, rank
    return '일반 보도', 1

def relevant(text, ts, entities):
    t = (text or '').lower()
    
    # 1. 이슈 고유 엔티티(인물명, 기업명)가 포함되어 있으면 높은 관련성
    for ent in entities:
        ent_clean = str(ent).strip().lower()
        if len(ent_clean) >= 2 and ent_clean in t:
            # 엔티티 + 키워드 1개 이상이면 확실한 관련 기사
            if any(k in t for k in ts if k != ent_clean):
                return True
                
    # 2. 키워드 교집합이 2개 이상이면 관련 기사
    hits = {x for x in ts if x in t}
    if len(hits) >= 2:
        return True
        
    return False

def score(text, ts):
    t = (text or '').lower()
    return sum(2 if len(x) >= 3 else 1 for x in ts if x in t)

def archive_files():
    return sorted(glob.glob(os.path.join(ROOT, 'archive', '20*.json')))

def build(issue, today):
    ts = terms(issue)
    entities = issue.get('entities') or []
    by_date = {}
    duplicate = 0
    
    def add(e, origin):
        nonlocal duplicate
        text = f"{e.get('title','')} || {e.get('body','')}"
        if not relevant(text, ts, entities):
            return
            
        st, rank = stage(e.get('title', ''))
        e.update(
            stage=st,
            stage_rank=rank,
            confidence=round(min(0.99, 0.52 + score(text, ts) * .06 + (0.12 if e.get('url') else 0)), 2),
            origin=origin
        )
        date = e.get('date') or ''
        if not date: return
        old = by_date.get(date)
        if old:
            duplicate += 1
            if (e['stage_rank'], e['confidence']) <= (old['stage_rank'], old['confidence']):
                return
        by_date[date] = e

    # 1. 이슈 자체 flow 항목 반영
    for group in issue.get('flow') or []:
        for item in group.get('items') or []:
            add(dict(
                date=group.get('date'),
                title=item.get('title'),
                body=item.get('body',''),
                url=item.get('url') or item.get('ourl'),
                press=item.get('press'),
                img=item.get('img')
            ), 'today.flow')

    # 2. 이슈 소스 기사들 반영
    for src in issue.get('sources') or []:
        src_date = src.get('t', today)[:10] if src.get('t') else today
        add(dict(
            date=src_date,
            title=src.get('title'),
            body=src.get('desc',''),
            url=src.get('url') or src.get('ourl'),
            press=src.get('press'),
            img=src.get('img')
        ), 'today.sources')

    # 3. 아카이브 시계열 대조
    for path in archive_files():
        date = os.path.basename(path)[:10]
        if date >= (today or '9999-99-99'): continue
        archive = load(path, {})
        for old_issue in archive.get('issues') or []:
            old_terms = terms(old_issue)
            overlap = len(ts & old_terms)
            if overlap < 2: continue
            sources = old_issue.get('sources') or []
            if not sources: continue
            source = max(sources, key=lambda s: (stage(s.get('title',''))[1], score(s.get('title',''), ts)))
            add(dict(
                date=date,
                title=source.get('title') or old_issue.get('title'),
                body=(old_issue.get('summary') or [''])[0],
                url=source.get('url') or source.get('ourl'),
                press=source.get('press'),
                img=source.get('img')
            ), 'archive')

    events = [by_date[d] for d in sorted(by_date)]
    stages = [e['stage'] for e in events]
    unique_stages = list(dict.fromkeys(stages))
    gaps = [s for s in EXPECTED_STAGES if s not in unique_stages]
    
    # 품질 점수 연산 (이벤트 풍부도, 단계 완성도, 근거 URL 비율)
    event_score = min(1.0, len(events) / 4) * 0.40
    stage_score = (len(unique_stages) / len(EXPECTED_STAGES)) * 0.40
    evidence_score = (sum(bool(e.get('url')) for e in events) / max(1, len(events))) * 0.20
    quality = round(max(0.1, min(1.0, event_score + stage_score + evidence_score)), 2)
    
    episode = 'episode:' + hashlib.sha1((issue.get('id','') + '|' + '|'.join(sorted(ts))).encode()).hexdigest()[:14]
    
    return episode, events[-8:], dict(
        episode=episode,
        quality=quality,
        stages=unique_stages,
        gaps=gaps[:3],
        duplicate_candidates=duplicate,
        event_count=len(events),
        evidence_rate=round(sum(bool(e.get('url')) for e in events) / max(1, len(events)), 2)
    )

def main():
    data = load(P, {})
    today = data.get('date') or dt.date.today().isoformat()
    summary = []
    
    for issue in data.get('issues') or []:
        episode, events, meta = build(issue, today)
        issue['episode_id'] = episode
        issue['continuity'] = events
        issue['continuity_quality'] = meta
        summary.append(dict(id=issue.get('id'), title=issue.get('title'), **meta))
        
    data['event_quality_at'] = dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    
    with open(P, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    quality_report = dict(
        schema='newsboard.event-quality.v2',
        updated_at=dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        date=today,
        total_issues=len(summary),
        average_quality=round(sum(x['quality'] for x in summary) / max(1, len(summary)), 2),
        issues=summary
    )
    
    with open(os.path.join(ROOT, 'event_quality.json'), 'w', encoding='utf-8') as f:
        json.dump(quality_report, f, ensure_ascii=False, indent=2)
        
    print(f"✔ Universal Event Quality Engine v2 실행 완료: {len(summary)}개 이슈 분석 (평균 품질: {quality_report['average_quality']})")

if __name__ == '__main__':
    main()
