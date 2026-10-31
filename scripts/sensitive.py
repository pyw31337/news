"""퀴즈·만화·카드뉴스·OX처럼 '재미'로 소비되는 자체 콘텐츠에서 뺄 민감한 기사(부고·범죄·재난·참사).
사람이 다치거나 숨진 일을 퀴즈로 맞히게 하거나 만화로 그리지 않기 위한 공통 거름망."""
import re
KO = re.compile(r'별세|빈소|추모|사망|숨져|숨진|숨지|故|부고|참사|희생|유족|영면|애도|살해|살인|피살|흉기|성폭행|성추행|성범죄|성착취|폭행|학대|자살|극단적 ?선택|투신|실종|추락사|붕괴|참변|시신|유골|마약|테러|총격|화재로|산불 피해|압사|익사|중상|중태')
EN = re.compile(r'\b(died|dies|dead|death|deaths|killed|killing|murder|shooting|shot dead|rape|sexual assault|suicide|crash|disaster|victims?|funeral|obituary|abuse|massacre|terror|stabbing|overdose)\b', re.I)
def sensitive(*texts):
    t = ' '.join(x for x in texts if isinstance(x, str))
    return bool(KO.search(t) or EN.search(t))
def ok_issue(i):
    return not sensitive(i.get('title', ''), i.get('title_ko', ''), ' '.join(i.get('summary') or []) if isinstance(i.get('summary'), list) else i.get('summary', ''))
