#!/bin/bash
# NewsBoard 로컬 분석 설치(맥·리눅스). 사용: bash local/install.sh   (저장소 폴더 안에서)
set -e
NB_HOME="${NB_HOME:-$HOME/Developer/newsboard-local}"; SRC="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$NB_HOME/bin" "$NB_HOME/logs"
cp "$SRC/run.sh" "$NB_HOME/run.sh"; chmod +x "$NB_HOME/run.sh"
[ -f "$NB_HOME/local.env" ] || cp "$SRC/local.env.example" "$NB_HOME/local.env"
command -v python3 >/dev/null || { echo "python3 가 필요합니다"; exit 1; }
[ -d "$NB_HOME/venv" ] || python3 -m venv "$NB_HOME/venv"
"$NB_HOME/venv/bin/pip" install -q -r "$SRC/../requirements.txt"
if [ "$(uname)" = Darwin ] && command -v swiftc >/dev/null; then swiftc -O "$SRC/nbai.swift" -o "$NB_HOME/bin/nbai" && echo "nbai 빌드 완료(Apple 온디바이스 AI)" || echo "nbai 빌드 실패 → Ollama/API 사용"; fi
# 배포 키(이 컴퓨터가 저장소에 쓰기 위한 전용 키)
K="$HOME/.ssh/newsboard_deploy"
if [ ! -f "$K" ]; then
  mkdir -p ~/.ssh && ssh-keygen -q -t ed25519 -N '' -f "$K" -C "newsboard-$(hostname -s)"
  printf '\nHost github-newsboard\n  HostName github.com\n  User git\n  IdentityFile %s\n  IdentitiesOnly yes\n' "$K" >> ~/.ssh/config
  echo; echo "▶ 아래 공개키를 GitHub 저장소 → Settings → Deploy keys → Add deploy key 에 붙여넣고 'Allow write access' 체크:"; cat "$K.pub"; echo
fi
if [ "$(uname)" = Darwin ]; then
  P=~/Library/LaunchAgents/com.pyw31337.newsboard-ai.plist
  sed "s#__NB_HOME__#$NB_HOME#g" "$SRC/com.pyw31337.newsboard-ai.plist.template" > "$P"
  launchctl unload "$P" 2>/dev/null || true; launchctl load "$P" && echo "launchd 등록: 매일 03:30"
else
  ( crontab -l 2>/dev/null | grep -v newsboard-local/run.sh; echo "30 3 * * * NB_HOME=$NB_HOME /bin/bash $NB_HOME/run.sh" ) | crontab - && echo "cron 등록: 매일 03:30"
fi
echo "완료. 바로 시험: NB_HOME=$NB_HOME bash $NB_HOME/run.sh && tail -20 $NB_HOME/logs/run-\$(date +%Y%m%d).log"
