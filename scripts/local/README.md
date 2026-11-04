# 로컬(Mac mini) 수집

## 기자(바이라인) — `journalists.py`
네이버는 10.30부터 GitHub 러너(해외 IP)에 기자 영역을 뺀 기사를 준다. 그래서 영우 님 Mac mini(한국 IP)가 매시 20분에 대신 수집한다.
- 흐름: 라이브 `data/today.json`의 이슈 → 네이버 기사 기자 카드 → 오늘 기사 수·이슈 수 순 최대 20명 → `gh api`로 `data` 브랜치 `reporters_local.json`(내용 바뀔 때만 커밋).
- GitHub 수집기(`scripts/collect.py`)는 이 파일이 6시간 안이고 자기 결과보다 새로우면 이것을 쓴다.
- 설치 위치: `~/Developer/newsboard-local/journalists/journalists.py`(실행 때마다 최신 `scripts/reporters.py`를 받아 씀)
- LaunchAgent: `~/Library/LaunchAgents/com.pyw31337.newsboard-journalists.plist` (매시 :20, 로그인 시). 로그: `~/Library/Logs/newsboard-journalists.log`. 오프라인이면 조용히 건너뜀.
- 수동 실행: `/opt/homebrew/bin/python3 ~/Developer/newsboard-local/journalists/journalists.py`
- 멈추기: `launchctl bootout gui/$(id -u)/com.pyw31337.newsboard-journalists && rm ~/Library/LaunchAgents/com.pyw31337.newsboard-journalists.plist`
