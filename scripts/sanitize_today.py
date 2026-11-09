#!/usr/bin/env python3
"""
오늘의 이슈 데이터 정합성 검증 및 소독(Sanitization) 스크립트.
- 인물 중심 이슈에 엉뚱한 증시/코스피 기사 및 딜링룸 이미지가 섞여 들어가지 않도록 분리.
- 네이버 기본 ogtag 등 기본 placeholder 이미지를 갤러리 및 기사 썸네일에서 제거.
"""
import sys
import json
import os

def sanitize_today(path):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    
    issues = d.get('issues', [])
    iss_kospi = next((i for i in issues if '코스피' in i.get('title', '') or '증시' in i.get('title', '')), None)
    
    for iss in issues:
        title = iss.get('title', '')
        # 1. 젠슨 황 등 인물 이슈에 코스피/증시 기사 및 차트 사진이 혼입된 경우 정합성 분리
        if '젠슨' in title or '엔비디아' in title:
            new_sources = []
            for s in iss.get('sources', []):
                stitle = s.get('title', '')
                simg = s.get('img', '')
                if ('코스피' in stitle or '증시' in stitle or '5000선' in stitle) and iss_kospi:
                    if not any(x['url'] == s['url'] for x in iss_kospi.get('sources', [])):
                        iss_kospi['sources'].append(s)
                    if iss_kospi.get('gallery') and simg and not any(g['img'] == simg for g in iss_kospi['gallery']):
                        iss_kospi['gallery'].append({'img': simg, 'press': s['press'], 'url': s['url']})
                else:
                    new_sources.append(s)
            iss['sources'] = new_sources
            if iss.get('gallery'):
                iss['gallery'] = [g for g in iss['gallery'] if '0002247696' not in g.get('img', '') and 'ogtag' not in g.get('img', '')]
        
        # 2. 범용: 기본 noimage / ogtag placeholder 제거
        for s in iss.get('sources', []):
            if 'ogtag/navernews' in s.get('img', ''):
                s['img'] = ''
        if iss.get('gallery'):
            iss['gallery'] = [g for g in iss['gallery'] if 'ogtag/navernews' not in g.get('img', '')]

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print(f'Sanitized {path} successfully.')

if __name__ == '__main__':
    p = sys.argv[1] if len(sys.argv) > 1 else 'data/today.json'
    sanitize_today(p)
