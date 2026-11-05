"""Agent-independent editorial production queue for comics and card news.

The collector writes facts; this script turns the strongest explainable issues into a
small, restartable brief. It deliberately does not call a particular image model:
Claude, Gemini, Grok, a local Apple model, or a human editor can all consume the same
contract in data/editorial/queue.json. The site keeps a safe fallback until a reviewed
asset has been registered.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('FUN_DATA') or os.environ.get('EDITORIAL_DATA') or os.path.join(HERE, '..', 'data')
MANIFEST = os.path.normpath(os.path.join(HERE, '..', 'assets', 'editorial-art.json'))
OUT_DIR = os.path.join(ROOT, 'editorial')
OUT = os.path.join(OUT_DIR, 'queue.json')
FILLER = re.compile(r'원문.{0,12}(확인|보|읽)|기사.{0,12}(확인|보|읽)|이해가.{0,8}(쏙|돼)|지켜보')
CAUSE = re.compile(r'때문|원인|배경|비용|영향|여파|반영|투자|화재|갈등|파업|수요|공급|정책|규제|금리|환율|감소|증가|하락|상승|매도|매물|선거|변경|지분|최대주주|이사회|의결권|법안|판결')
NUMBER = re.compile(r'\d')
PRI = {'경제': 0, '세계': 1, '사회': 2, 'IT': 3, '과학': 4, '정치': 5}


def load(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default


def sentences(value):
    text = re.sub(r'\s+', ' ', value or '')
    out = [x.strip() for x in re.split(r'(?<=[다요\.])\s+', text) if len(x.strip()) >= 12]
    return out or ([text] if len(text) >= 8 else [])


def compact(value, limit=100):
    value = re.sub(r'\s+', ' ', str(value or '')).strip()
    if len(value) <= limit:
        return value
    cut = value[:limit]
    return cut[:max(cut.rfind(' '), limit - 14)].rstrip(' ,·') + '…'


def first_matching(items, pattern, fallback=''):
    return next((item for item in items if pattern.search(item)), fallback)


def has_asset(issue, manifest):
    title = re.sub(r'\s+', '', issue.get('title', '')).lower()
    for kind in ('comics', 'decks'):
        for rule in (manifest.get('matches', {}).get(kind, []) or []):
            terms = [re.sub(r'\s+', '', str(x)).lower() for x in rule.get('terms', [])]
            if terms and all(term in title for term in terms):
                return rule.get('asset', '')
    return ''


def visual_direction(issue):
    text = ' '.join([issue.get('title', ''), *issue.get('summary', [])]).lower()
    if re.search(r'적자|손실|매출|금리|주가|투자|쿠팡', text):
        return 'ledger', '장부·물류·그래프를 쓰되 실제 회사 로고·실제 인물은 제외'
    if re.search(r'공장|생산|노사|파업|재가동', text):
        return 'industry', '공장 동선·안전 표지·가동 보드를 이용, 캐릭터 행동을 컷마다 바꿀 것'
    if re.search(r'해킹|보안|유출|사이버', text):
        return 'security', '보안 관제·접속 흔적·차단 절차를 사용, 실제 피해자·공격자 묘사는 제외'
    if re.search(r'연구|과학|우주|반도체|인공지능|ai', text):
        return 'science', '관측·실험·데이터라는 실제 설명 요소를 사용, 범용 칠판은 피할 것'
    return 'reportage', '사건을 설명하는 실제 사물·공간을 쓰고 도시 배경·노을 반복을 피할 것'


def brief(issue, manifest):
    source_facts = []
    for source in (issue.get('sources') or []) + (issue.get('timeline') or []):
        source_facts.extend(sentences(source.get('desc', '') or source.get('title', '')))
    primary = sentences((issue.get('ai') or {}).get('deep')) or sentences(issue.get('lead')) or [compact(x, 140) for x in issue.get('summary') or []]
    facts, seen = [], set()
    for fact in primary[:1] + source_facts + primary[1:]:
        fact = compact(fact, 150)
        key = re.sub(r'\s+', '', fact)
        if fact and key not in seen:
            facts.append(fact); seen.add(key)
    cause = first_matching(facts[1:], CAUSE, '')
    remaining = [fact for fact in facts[1:] if re.sub(r'\s+', '', fact) != re.sub(r'\s+', '', cause)]
    evidence = first_matching(remaining, NUMBER, remaining[0] if remaining else cause)
    flow = [x.get('meaning', '') for x in (issue.get('ai') or {}).get('flow', []) if x.get('meaning') and not FILLER.search(x.get('meaning', ''))]
    scene, direction = visual_direction(issue)
    sources = [dict(press=x.get('press', ''), title=x.get('title', ''), url=x.get('url', '')) for x in issue.get('sources', [])[:4]]
    asset = has_asset(issue, manifest)
    score = (15 if CAUSE.search(cause) else 0) + (10 if NUMBER.search(evidence) else 0) + min(len(sources), 4) * 3 + (8 if flow else 0)
    return dict(
        issue_id=issue.get('id', ''), title=issue.get('title', ''), category=issue.get('category', ''), rank=issue.get('rank'),
        priority_score=score, production_types=['comic', 'card_news'], status='ready_for_editorial_review' if facts and sources else 'needs_fact_review',
        facts=[compact(x, 150) for x in facts[:5]], sources=sources,
        story_beats=[
            dict(panel=1, purpose='무슨 일이 있었나', evidence=compact(facts[0] if facts else issue.get('title', ''), 120)),
            dict(panel=2, purpose='왜 이 일이 생겼나', evidence=compact(cause, 120)),
            dict(panel=3, purpose='핵심 수치·근거', evidence=compact(evidence, 120)),
            dict(panel=4, purpose='다음에 검증할 지표·조건', evidence=compact(flow[-1] if flow else '다음 발표에서 원인이 된 조건과 핵심 수치의 변화를 확인', 120)),
        ],
        visual_brief=dict(
            scene=scene, direction=direction,
            comic='세로 4컷: 상단 가로 와이드 1컷 → 가운데 좌·우 분할 2컷 → 하단 가로 와이드 1컷. 같은 보리·누리 캐릭터의 의상·비율을 유지하되, 네 컷의 카메라·행동·실제 사물은 모두 달리한다. 이미지 안에는 읽을 한글, 말풍선, 회사 로고, 실존 인물 얼굴을 넣지 않는다. 말풍선과 대사는 웹 오버레이로 제공한다.',
            card_news='표지 1장 + 사건·원인·근거·다음 신호를 독립 카드로. 각 카드에는 해당 사실을 설명하는 고유한 도표·물체·공간을 쓰며, 근거 없는 장식 문구와 같은 배경 재사용을 금지한다.'),
        visual_contract=dict(
            layout='comic: 1-wide / 2-split / 1-wide, card: one visual idea per card',
            continuity='Bori is warm orange; Nuri is navy. Keep silhouette and costume consistent across the four panels.',
            composition='Leave clean upper-side negative space for two HTML speech bubbles. Do not place essential evidence behind bubble zones.',
            evidence='Every panel must visibly support its assigned story beat; panel 2 is the cause, panel 3 is the named number or evidence, panel 4 is a concrete next signal.',
            forbid=['read-the-original CTA', 'generic city sunset', 'generic classroom chalkboard', 'copied panel composition', 'invented chart number', 'real-person likeness'],
            acceptance=['four distinct panel scenes', 'no rasterized text or speech bubbles', 'source beats checked', 'asset registered in assets/editorial-art.json']),
        asset=dict(existing=asset, action='reuse_existing' if asset else 'generate_after_human_fact_check'),
        quality_gate=dict(cause_grounded=bool(CAUSE.search(cause)), numeric_or_specific_evidence=bool(NUMBER.search(evidence) or evidence), sources=len(sources), no_generic_closing=True),
    )


def build(max_items):
    today = load(os.path.join(ROOT, 'today.json'), {})
    manifest = load(MANIFEST, {})
    issues = list(today.get('issues') or [])
    candidates = [brief(issue, manifest) for issue in issues if issue.get('title') and issue.get('category') not in ('연예', '스포츠')]
    candidates.sort(key=lambda x: (0 if x['quality_gate']['cause_grounded'] else 1, PRI.get(x['category'], 4), -x['priority_score'], x.get('rank') or 999))
    now = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).isoformat(timespec='seconds')
    return dict(
        schema='newsboard.editorial-queue.v2', date=today.get('date') or dt.date.today().isoformat(), generated_at=now,
        handoff=dict(
            state='brief_ready', owner='unassigned', daily_minimum='Select one highest-priority reviewed candidate for a bespoke visual asset. Other candidates may use the safe fallback.',
            daily_caps=dict(comics=3, card_news=3), providers=['Claude', 'Gemini', 'Grok', 'local Apple model', 'human editor'],
            next_action='Select one item, check every story beat against linked sources, create or reuse an asset that satisfies visual_contract, then register it in assets/editorial-art.json.',
            resume_commands=['python scripts/editorial_queue.py --validate', 'FUN_DATA=data FUN_AI_SEC=0 python scripts/fun.py', 'npm run validate'],
            completion_definition='A comic/card item has four evidence-backed beats, a registered visual asset or safe fallback, and passes the no-filler validator.'
        ),
        candidates=candidates[:max_items],
    )


def validate():
    fun = load(os.path.join(ROOT, 'fun.json'), {})
    problems = []
    # 과거 아카이브는 당시 기준을 보존한다. 이 게이트는 오늘 새로 생산·배포할 항목만
    # 막아, 오래된 기록 하나가 오늘의 무인 배포를 중단시키지 않게 한다.
    current = load(os.path.join(ROOT, 'today.json'), {}).get('date') or fun.get('date', '')
    for comic in [x for x in fun.get('comics', []) if x.get('date') == current]:
        panels = comic.get('panels') or []
        lines = [line.get('text', '') for panel in panels for line in panel.get('lines', [])]
        if len(panels) != 4:
            problems.append('%s: 4 panels required' % comic.get('id'))
        if any(FILLER.search(line) for line in lines):
            problems.append('%s: generic closing/filler detected' % comic.get('id'))
        quality = comic.get('quality') or {}
        if quality and not (quality.get('cause') and quality.get('evidence') and quality.get('next_signal') and quality.get('no_filler')):
            problems.append('%s: story quality gate incomplete' % comic.get('id'))
    for deck in [x for x in fun.get('decks', []) if x.get('date') == current and x.get('kind') == 'explainer']:
        cards = deck.get('cards') or []
        kinds = {card.get('t') for card in cards}
        text = [str(card.get('text', '')) for card in cards]
        if not {'hook', 'bg', 'fact', 'next', 'src'} <= kinds:
            problems.append('%s: explainer deck structure incomplete' % deck.get('id'))
        if any(FILLER.search(line) for line in text):
            problems.append('%s: generic closing/filler detected' % deck.get('id'))
        quality = deck.get('quality') or {}
        if not (quality.get('cause') and quality.get('evidence') and quality.get('next_signal') and quality.get('no_filler') and quality.get('sources')):
            problems.append('%s: deck quality gate incomplete' % deck.get('id'))
    print('editorial queue validation: %s' % ('PASS' if not problems else 'FAIL'))
    for problem in problems:
        print('- ' + problem)
    return not problems


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--max', type=int, default=3)
    parser.add_argument('--validate', action='store_true')
    args = parser.parse_args()
    if args.validate:
        sys.exit(0 if validate() else 1)
    payload = build(max(1, args.max))
    os.makedirs(OUT_DIR, exist_ok=True)
    temp = OUT + '.tmp'
    with open(temp, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write('\n')
    os.replace(temp, OUT)
    print('editorial queue: %d candidates → %s' % (len(payload['candidates']), OUT))


if __name__ == '__main__':
    main()
