#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
글로벌 기상 및 이상기후 데이터 수집기
- NOAA NWS: 실시간 북미/글로벌 긴급 이상기후 경보 (허리케인, 토네이도, 홍수, 폭풍, 한파 등)
- USGS: 전 세계 지진 실시간 피드 (규모 4.5 이상)
- Open-Meteo: 전 세계 20대 거점 메트로폴리스 도시 실시간 기상
- 글로벌 외신(data/global.json): 기후/재해 관련 뉴스 매칭
출력: data/global_weather.json
"""

import json
import os
import re
import urllib.request
import datetime

NOW = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_FILE = os.path.join(BASE_DIR, 'data', 'global_weather.json')
GLOBAL_JSON = os.path.join(BASE_DIR, 'data', 'global.json')

MAJOR_CITIES = [
    {"id": "newyork", "name_ko": "뉴욕", "name_en": "New York", "country": "US", "flag": "🇺🇸", "lat": 40.7128, "lon": -74.0060},
    {"id": "losangeles", "name_ko": "로스앤젤레스", "name_en": "Los Angeles", "country": "US", "flag": "🇺🇸", "lat": 34.0522, "lon": -118.2437},
    {"id": "london", "name_ko": "런던", "name_en": "London", "country": "GB", "flag": "🇬🇧", "lat": 51.5074, "lon": -0.1278},
    {"id": "paris", "name_ko": "파리", "name_en": "Paris", "country": "FR", "flag": "🇫🇷", "lat": 48.8566, "lon": 2.3522},
    {"id": "frankfurt", "name_ko": "프랑크푸르트", "name_en": "Frankfurt", "country": "DE", "flag": "🇩🇪", "lat": 50.1109, "lon": 8.6821},
    {"id": "tokyo", "name_ko": "도쿄", "name_en": "Tokyo", "country": "JP", "flag": "🇯🇵", "lat": 35.6895, "lon": 139.6917},
    {"id": "beijing", "name_ko": "베이징", "name_en": "Beijing", "country": "CN", "flag": "🇨🇳", "lat": 39.9042, "lon": 116.4074},
    {"id": "singapore", "name_ko": "싱가포르", "name_en": "Singapore", "country": "SG", "flag": "🇸🇬", "lat": 1.3521, "lon": 103.8198},
    {"id": "sydney", "name_ko": "시드니", "name_en": "Sydney", "country": "AU", "flag": "🇦🇺", "lat": -33.8688, "lon": 151.2093},
    {"id": "toronto", "name_ko": "토론토", "name_en": "Toronto", "country": "CA", "flag": "🇨🇦", "lat": 43.6532, "lon": -79.3832},
    {"id": "dubai", "name_ko": "두바이", "name_en": "Dubai", "country": "AE", "flag": "🇦🇪", "lat": 25.2048, "lon": 55.2708},
    {"id": "saopaulo", "name_ko": "상파울루", "name_en": "São Paulo", "country": "BR", "flag": "🇧🇷", "lat": -23.5505, "lon": -46.6333},
]

EVENT_KO_MAP = {
    'Hurricane': '허리케인',
    'Typhoon': '태풍',
    'Tornado': '토네이도',
    'Flood': '홍수',
    'Flash Flood': '돌발 홍수',
    'Blizzard': '눈보라(블리자드)',
    'Winter Storm': '겨울 폭풍',
    'Ice Storm': '얼음 폭풍',
    'High Wind': '강풍',
    'Severe Thunderstorm': '중증 뇌우',
    'Extreme Cold': '극한 한파',
    'Excessive Heat': '기록적 폭염',
    'Heat Advisory': '폭염 주의보',
    'Wildfire': '대형 산불',
    'Storm Surge': '폭풍해일',
    'Gale': '강풍',
    'Freezing Spray': '해상 결빙',
}

STATE_KO_MAP = {
    'Alaska': '알래스카', 'California': '캘리포니아', 'Florida': '플로리다', 'Texas': '텍사스',
    'New York': '뉴욕', 'Washington': '워싱턴', 'Hawaii': '하와이', 'Oregon': '오리건',
    'Nevada': '네바다', 'Colorado': '콜로라도', 'Illinois': '일리노이', 'Louisiana': '루이지애나'
}

def clean_area(area_desc):
    first = area_desc.split(';')[0].strip()
    # State 탐색
    for en, ko in STATE_KO_MAP.items():
        if en in area_desc:
            return f"{ko} ({first})"
    return first

def translate_event(event_en):
    for k, v in EVENT_KO_MAP.items():
        if k.lower() in event_en.lower():
            return v + ' 경보' if 'Warning' in event_en else v + ' 주의보'
    return event_en

def fetch_noaa_alerts():
    alerts = []
    url = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert&severity=Extreme,Severe'
    req = urllib.request.Request(url, headers={'User-Agent': 'newsboard (contact@newsboard.kr)'})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read())
            features = data.get('features', [])
            for f in features:
                p = f.get('properties', {})
                event_en = p.get('event', '').strip()
                raw_area = p.get('areaDesc', '').strip()
                area_clean = clean_area(raw_area)
                severity = p.get('severity', 'Severe')
                sent = p.get('sent', '')
                t_str = sent[:16].replace('T', ' ') if sent else NOW.strftime('%Y-%m-%d %H:%M')
                event_ko = translate_event(event_en)
                
                # 핵심 키워드 뽑기
                state_match = None
                for en, ko in STATE_KO_MAP.items():
                    if en in raw_area:
                        state_match = (en, ko)
                        break
                
                area_short_ko = state_match[1] if state_match else raw_area.split(';')[0].split(',')[0].strip()
                area_short_en = state_match[0] if state_match else raw_area.split(';')[0].split(',')[0].strip()
                
                alerts.append({
                    'id': p.get('id', ''),
                    't': t_str,
                    'country': 'US',
                    'flag': '🇺🇸',
                    'country_ko': '미국',
                    'country_en': 'United States',
                    'area': area_short_ko,
                    'area_en': area_short_en,
                    'event': event_ko,
                    'event_en': event_en,
                    'severity': severity,
                    'headline_ko': f"{area_short_ko} {event_ko}",
                    'headline_en': f"{area_short_en} {event_en}",
                    'desc': (p.get('description') or '')[:300]
                })
    except Exception as e:
        print(f"NOAA error: {e}")
    return alerts

def fetch_usgs_quakes():
    quakes = []
    url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read())
            for f in data.get('features', []):
                p = f.get('properties', {})
                mag = p.get('mag')
                place = p.get('place', '')
                t_ms = p.get('time', 0)
                dt_obj = datetime.datetime.fromtimestamp(t_ms / 1000, tz=datetime.timezone.utc)
                t_str = dt_obj.strftime('%Y-%m-%d %H:%M')
                coords = f.get('geometry', {}).get('coordinates', [0, 0, 0])
                quakes.append({
                    'id': f.get('id', ''),
                    'mag': mag,
                    'place': place,
                    't': t_str,
                    'depth': coords[2] if len(coords) > 2 else 0,
                    'url': p.get('url', '')
                })
    except Exception as e:
        print(f"USGS error: {e}")
    return quakes

def fetch_major_cities_weather():
    lats = ','.join(str(c['lat']) for c in MAJOR_CITIES)
    lons = ','.join(str(c['lon']) for c in MAJOR_CITIES)
    url = f'https://api.open-meteo.com/v1/forecast?latitude={lats}&longitude={lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto'
    cities_res = []
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'newsboard (contact@newsboard.kr)'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            if not isinstance(data, list):
                data = [data]
            for i, c in enumerate(MAJOR_CITIES):
                if i < len(data):
                    cur = data[i].get('current', {})
                    cities_res.append({
                        **c,
                        'temp': cur.get('temperature_2m'),
                        'apparent_temp': cur.get('apparent_temperature'),
                        'humidity': cur.get('relative_humidity_2m'),
                        'code': cur.get('weather_code'),
                        'wind': cur.get('wind_speed_10m')
                    })
    except Exception as e:
        print(f"Cities weather error: {e}")
    return cities_res

def fetch_climate_news():
    climate_stories = []
    if os.path.exists(GLOBAL_JSON):
        try:
            with open(GLOBAL_JSON, 'r', encoding='utf-8') as f:
                gdata = json.load(f)
                issues = gdata.get('issues', [])
                keywords = ['climate', 'weather', 'storm', 'hurricane', 'flood', 'wildfire', 'heatwave', 'snow', 'earthquake', '기후', '날씨', '폭풍', '허리케인', '홍수', '산불', '폭염', '지진']
                for issue in issues:
                    title = issue.get('title', '')
                    summary = issue.get('summary', '')
                    combined = f"{title} {summary}".lower()
                    if any(k in combined for k in keywords):
                        climate_stories.append({
                            'id': issue.get('id'),
                            'title': title,
                            'press': issue.get('press'),
                            'image': issue.get('image'),
                            'score': issue.get('score'),
                            'url': f"g/{issue.get('id')}"
                        })
        except Exception as e:
            print(f"Climate news error: {e}")
    return climate_stories[:8]

def main():
    print("Collecting global weather & disaster data...")
    alerts = fetch_noaa_alerts()
    quakes = fetch_usgs_quakes()
    cities = fetch_major_cities_weather()
    stories = fetch_climate_news()
    
    result = {
        'updated': NOW.isoformat(),
        'alerts_count': len(alerts),
        'alerts': alerts[:15],
        'quakes': quakes[:10],
        'cities': cities,
        'stories': stories
    }
    
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Successfully saved global weather to {OUT_FILE} (Alerts: {len(alerts)}, Quakes: {len(quakes)}, Cities: {len(cities)})")

if __name__ == '__main__':
    main()
