"""네이버 공개 기자 프로필에서 오늘의 기자 데스크 데이터를 만든다.

기사에 표시된 기자 카드와 각 기자의 공개 프로필만 사용한다. 동명이인끼리
합치거나, 소속이 바뀌었다고 추정하지 않는다. 소속 변화는 같은 공개 프로필에서
확인된 사실만 누적하기 때문에 '이적'으로 단정하는 잘못된 표기를 막는다.
"""
import datetime as dt
import html
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor


def clean(value):
    return html.unescape(re.sub(r'<[^>]+>', '', value or '')).strip()


def attr(value):
    return html.unescape((value or '').replace('&#x3D;', '='))


def _article_reporter(page, source):
    """기사 머리말의 공개 기자 카드에서 프로필 식별자를 읽는다."""
    found = []
    pattern = re.compile(
        r'href="(https?://media\.naver\.com/journalist/(\d+)/(\d+))"[^>]*>.*?'
        r'<em class="media_end_head_journalist_name">(.*?)</em>', re.S)
    for profile, office_id, journalist_id, name in pattern.findall(page):
        name = re.sub(r'\s*기자\s*$', '', clean(name))
        if not name:
            continue
        found.append(dict(
            id='naver:%s:%s' % (office_id, journalist_id), name=name,
            press=source.get('press', ''), profile=attr(profile),
            office_id=office_id, journalist_id=journalist_id,
            seed_report=dict(title=source.get('title', ''), url=source.get('url', ''),
                             when='오늘의 주요 기사'),
        ))
    return found


def _profile(page, base):
    """공개 프로필의 사진·최근 한 달 통계·최근 보도 목록을 보수적으로 파싱한다."""
    head = re.search(r'<div class="media_reporter_profile_basic">(.*?)</div>\s*</div>', page, re.S)
    head = head.group(1) if head else page[:18000]
    photo = re.search(r'media_reporter_basic_photo.*?<img[^>]+src=[\'\"]([^\'\"]+)', head, re.S)
    press = re.search(r'media_reporter_basic_press_txt">(.*?)</span>', head, re.S)
    name = re.search(r'media_reporter_basic_name">(.*?)</h2>', head, re.S)
    intro = re.search(r'media_reporter_profile_introduce">(.*?)</p>', page, re.S)
    monthly = re.search(r'최근 한 달.*?<em>\s*총\s*([\d,]+)</em>\s*건의 기사를 작성', page, re.S)
    focus = re.search(r'<em>([^<]+)</em>\s*섹션 기사가 가장 많', page, re.S)
    base.update({
        'name': clean(name.group(1)) or base.get('name', ''),
        'press': clean(press.group(1)) or base.get('press', ''),
        'photo': attr(photo.group(1)) if photo else '',
        'bio': clean(intro.group(1)) if intro else '',
        'stats': dict(last30=int(monthly.group(1).replace(',', '')) if monthly else 0,
                      focus=clean(focus.group(1)) if focus else ''),
    })
    activity = []
    for day, count in re.findall(r'data-content-date="([^"]+)"[\s\S]{0,800}?data-content-count="(\d+)"', page):
        if not any(x['day'] == day for x in activity):
            activity.append(dict(day=day, n=int(count)))
    base['activity'] = activity[-30:]
    reports = []
    for block in re.findall(r'<li class="press_edit_news_item[\s\S]*?</li>', page):
        link = re.search(r'href="([^"]+)"', block)
        title = re.search(r'press_edit_news_title">(.*?)</span>', block, re.S)
        image = re.search(r'data-src="([^"]+)"', block) or re.search(r'<img[^>]+src="([^"]+)"', block)
        when = re.search(r'<b>([^<]+)</b>', block)
        if not (link and title):
            continue
        url = attr(link.group(1))
        if url.startswith('/'):
            url = 'https://n.news.naver.com' + url
        reports.append(dict(title=clean(title.group(1)), url=url,
                            image=attr(image.group(1)) if image else '',
                            when=clean(when.group(1)) if when else ''))
    if reports:
        base['reports'] = reports[:10]
    return base


def collect(issues, root, now, fetch, limit=8):
    """상위 이슈별 대표 네이버 기사에서 최대 ``limit``명의 기자를 수집한다.

    fetch는 수집 파이프라인의 재시도·진단 기능을 그대로 쓴다. 실패는 해당 기자만
    건너뛰며 뉴스 수집 전체를 실패시키지 않는다.
    """
    seeds, seen_urls = [], set()
    for issue in issues:
        for source in issue.get('sources') or []:
            url = source.get('url') or ''
            if 'n.news.naver.com/article/' not in url or url in seen_urls:
                continue
            seen_urls.add(url)
            seeds.append((issue.get('id', ''), source))
            break
        if len(seeds) >= limit:
            break

    def article_page(seed):
        issue_id, source = seed
        return issue_id, source, fetch(source['url'], 'utf-8', 5)

    raw = []
    # 외부 프로필 서버가 늦어도 전체 수집을 지연시키지 않도록 소수만 병렬로 읽는다.
    with ThreadPoolExecutor(max_workers=4) as pool:
        pages = list(pool.map(article_page, seeds))
    for issue_id, source, page in pages:
        for reporter in _article_reporter(page, source):
            reporter.setdefault('issues', []).append(issue_id)
            raw.append(reporter)

    grouped = {}
    for reporter in raw:
        current = grouped.setdefault(reporter['id'], reporter)
        if current is not reporter:
            current['issues'] = list(dict.fromkeys(current.get('issues', []) + reporter.get('issues', [])))
    reporters = list(grouped.values())[:limit]
    def profile_page(reporter):
        try:
            page = fetch(reporter['profile'], 'utf-8', 5)
            if page:
                _profile(page, reporter)
        except Exception:
            pass
        return reporter

    with ThreadPoolExecutor(max_workers=4) as pool:
        reporters = list(pool.map(profile_page, reporters))
    for reporter in reporters:
        # 프로필 목록을 받지 못해도 오늘 기사 1건은 남긴다.
        if not reporter.get('reports'):
            reporter['reports'] = [reporter.pop('seed_report')]
        else:
            reporter.pop('seed_report', None)
        reporter['issues'] = list(dict.fromkeys(reporter.get('issues', [])))

    path = os.path.join(root, 'reporter_history.json')
    try:
        history = json.load(open(path, encoding='utf-8'))
    except Exception:
        history = {}
    today = now.astimezone(dt.timezone(dt.timedelta(hours=9))).strftime('%Y-%m-%d')
    for reporter in reporters:
        h = history.setdefault(reporter['id'], dict(name=reporter['name'], affiliations=[]))
        h['name'] = reporter['name']
        profile = reporter.get('profile', '')
        row = next((x for x in h['affiliations'] if x.get('profile') == profile), None)
        if row is None:
            row = dict(press=reporter.get('press', ''), profile=profile, first=today, last=today)
            h['affiliations'].append(row)
        else:
            row['last'] = today
            if reporter.get('press'):
                row['press'] = reporter['press']
        # 같은 이름의 다른 프로필을 합치지 않는다. 잘못된 이직 이력보다 빈 이력이 낫다.
        reporter['affiliations'] = h['affiliations'][-6:]
        reporter['observed'] = today
    os.makedirs(root, exist_ok=True)
    json.dump(history, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

    for reporter in reporters:
        reporter.pop('seed_report', None)
    # GitHub Actions에서는 일부 포털 기사가 시간 초과될 수 있다. 마지막으로 검증된
    # 공개 프로필 묶음을 보관해 두면, 기사 수집은 계속하면서 기자 데스크만 비는 일을 막는다.
    cache_path = os.path.join(root, 'reporters.json')
    if reporters:
        json.dump(reporters, open(cache_path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        return reporters
    try:
        cached = json.load(open(cache_path, encoding='utf-8'))
        if isinstance(cached, list):
            return [r for r in cached if r.get('id') and r.get('name') and r.get('reports')][:limit]
    except Exception:
        pass
    return []
