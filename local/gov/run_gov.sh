#!/bin/bash
# NewsBoard 공공데이터포털 수집(맥미니, 매시 20분). data.go.kr은 해외 IP를 막아서 GitHub Actions 대신 여기서 돌림.
# 키: ~/Developer/newsboard-local/.env.datagokr (DATA_GO_KR_KEY=...)
set -u
B=~/Developer/newsboard-local; W="$B/gov"; mkdir -p "$W/logs"; cd "$W" || exit 1
exec >> "$W/logs/gov-$(date +%Y%m%d).log" 2>&1
echo "== start $(date)"
mkdir "$W/.lock" 2>/dev/null || { echo "already running"; exit 0; }
trap 'rmdir "$W/.lock"' EXIT
export PATH=/opt/homebrew/bin:/usr/bin:/bin
set -a; . "$B/.env.datagokr"; set +a
[ -d main ] || git clone -q --depth 1 git@github-newsboard:pyw31337/news.git main
git -C main fetch -q --depth 1 origin main && git -C main reset -q --hard origin/main
[ -d main/data/.git ] || { rm -rf main/data; git clone -q --depth 1 -b data git@github-newsboard:pyw31337/news.git main/data; }
git -C main/data fetch -q --depth 1 origin data && git -C main/data reset -q --hard origin/data
python3 main/scripts/kr_gov.py
mkdir -p /tmp/nb-gov && rm -rf /tmp/nb-gov/* && cp -r main/data/gov /tmp/nb-gov/ && cp main/data/briefs.json /tmp/nb-gov/ 2>/dev/null; mkdir -p /tmp/nb-gov/db && cp -r main/data/db/briefs /tmp/nb-gov/db/ 2>/dev/null
cd main/data
for n in 1 2 3 4 5 6; do
  git fetch -q --depth 1 origin data && git reset -q --hard origin/data
  cp -r /tmp/nb-gov/gov . ; [ -f /tmp/nb-gov/briefs.json ] && cp /tmp/nb-gov/briefs.json .; [ -d /tmp/nb-gov/db/briefs ] && mkdir -p db && cp -r /tmp/nb-gov/db/briefs db/
  git add -A gov briefs.json db/briefs 2>/dev/null
  git -c user.name=newsboard-macmini -c user.email=macmini@users.noreply.github.com commit -qm "gov: data.go.kr $(date '+%Y-%m-%d %H:%M') KST" || { echo "nothing to commit"; break; }
  git push -q origin HEAD:data && { echo "pushed"; break; }; sleep $((n * 15 + RANDOM % 10))
done
find "$W/logs" -name 'gov-*.log' -mtime +14 -delete; echo "== end $(date)"
