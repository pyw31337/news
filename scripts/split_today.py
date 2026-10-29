"""첫 화면용 가벼운 today_lite.json 생성: python scripts/split_today.py _site
인물별 과거 기사 타임라인(entities[].timeline)이 today.json 용량의 약 80%라서, 최신 LITE_N건만 남기고
전체 건수는 tn 에 기록. 원본 today.json 은 그대로 두며, 앱이 화면을 그린 뒤 뒤에서 받아 합침(assets/app.js load)."""
import json, os, sys
SITE = sys.argv[1] if len(sys.argv) > 1 else '_site'
LITE_N = 12
P = os.path.join(SITE, 'data', 'today.json')
D = json.load(open(P, encoding='utf-8'))
for e in D.get('entities', []):
    tl = e.get('timeline') or []
    e['tn'] = len(tl)
    e['timeline'] = tl[:LITE_N]  # 최신순 정렬이라 앞쪽이 최근 기사
D['lite'] = 1
out = os.path.join(SITE, 'data', 'today_lite.json')
json.dump(D, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('today_lite: %dKB → %dKB' % (os.path.getsize(P) // 1024, os.path.getsize(out) // 1024))
