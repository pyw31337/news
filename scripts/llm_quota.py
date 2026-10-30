"""Gemini 무료 등급 한도 관리(enrich·voice·fun 공용): data/db/llm_quota.json
- 하루 한도(429 PerDay)를 맞은 모델은 한도가 초기화되는 미국 서부 자정까지 다시 부르지 않는다(헛된 대기·오류 반복 방지).
- 가벼운 작업(분류·검색어 해설·단어·흐름·성향·퀴즈 단어)은 가벼운 모델부터 써서 주력 모델 한도를 요약·깊게 보기·여론에 아낀다.
- 지난날 한도에 닿았던 호출 수를 기억해, 주력 모델은 하루 시간 흐름만큼만 나눠 쓴다(오전에 몰아 써서 바닥나지 않게).
- 분당 한도(429 PerMinute)는 잠시 뒤 재시도로 충분하므로 기록만 한다."""
import os, json, atexit, datetime as dt
try:
    from zoneinfo import ZoneInfo; PT = ZoneInfo('America/Los_Angeles')
except Exception:
    PT = dt.timezone(dt.timedelta(hours=-8))
LIGHT = {'cat', 'trend', 'words', 'a-flow', 'a-bias', 'wx'}
_P = [None]; S = {'days': {}, 'cap': {}}
def setup(root):
    _P[0] = os.path.join(root, 'db', 'llm_quota.json')
    try: S.update(json.load(open(_P[0])))
    except Exception: pass
    atexit.register(save)
def _day(): return dt.datetime.now(PT).strftime('%Y-%m-%d')
def _m(model):
    d = S['days'].setdefault(_day(), {}); return d.setdefault(model, dict(ok=0, minute=0, daily=0, out=False))
def _frac():
    n = dt.datetime.now(PT); return (n.hour * 60 + n.minute) / 1440
def order(models, kind=None):
    """이번 호출에 쓸 모델 순서. 하루 한도가 찬 모델은 빼고, 가벼운 작업·속도 조절 대상은 가벼운 모델을 앞으로."""
    live = [m for m in models if not _m(m)['out']]
    def late(m):  # 학습한 하루 한도 대비 시간 흐름보다 앞서 쓰고 있으면 뒤로
        cap = S['cap'].get(m)
        return bool(cap) and _m(m)['ok'] >= cap * min(1, _frac() + .08) + 2
    if kind in LIGHT: return sorted(live, key=lambda m: 0 if 'lite' in m else 1)
    return sorted(live, key=lambda m: 1 if late(m) else 0)
def is_daily(code, msg):
    t = (msg or '').lower()
    return code == 429 and ('perday' in t.replace('_', '').replace(' ', '') or 'per day' in t or 'daily' in t)
def ok(model): _m(model)['ok'] += 1
def limited(model, code, msg):
    """429를 받았을 때. 하루 한도면 그 모델을 오늘(미국 서부 기준) 남은 시간 동안 끔. 끈 경우 True."""
    m = _m(model)
    if is_daily(code, msg):
        m['daily'] += 1; m['out'] = True
        if m['ok'] >= 5: S['cap'][model] = max(5, round(m['ok'] * .95))  # 다음 날 속도 조절 기준
        return True
    m['minute'] += 1; return False
def today(): return S['days'].get(_day(), {})
def save():
    if not _P[0]: return
    S['days'] = {k: S['days'][k] for k in sorted(S['days'])[-14:]}
    try:
        os.makedirs(os.path.dirname(_P[0]), exist_ok=True); json.dump(S, open(_P[0], 'w'), ensure_ascii=False, separators=(',', ':'))
    except Exception: pass
