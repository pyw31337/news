#!/bin/bash
# 정치인 DB 수집(맥미니, 매일 02:50 KST): 열린국회정보 API는 해외 IP를 막아 한국 IP에서 실행
# 결과는 politicians 브랜치에 push → GitHub Actions(politicians.yml)가 뉴스 연결, collect.yml이 사이트에 배포
# 열린국회정보 인증키가 있으면 ~/Developer/newsboard-local/pol/.env 에 ASSEMBLY_KEY=... (법안·전체 명단 대량 수집)
set -u
B=~/Developer/newsboard-local; P=$B/pol; mkdir -p "$P/logs"; cd "$P" || exit 1
exec >> "$P/logs/pol-$(date +%Y%m%d).log" 2>&1
echo "== start $(date)"
mkdir "$P/.lock" 2>/dev/null || { echo "already running"; exit 0; }
trap 'rmdir "$P/.lock"' EXIT
export PATH=/opt/homebrew/bin:/usr/bin:/bin
[ -f "$P/.env" ] && set -a && . "$P/.env" && set +a
R=git@github-newsboard:pyw31337/news.git
[ -d src/.git ] || git clone -q --depth 1 $R src
git -C src fetch -q --depth 1 origin main && git -C src reset -q --hard origin/main
if [ ! -d pdata/.git ]; then
  git clone -q -b politicians $R pdata 2>/dev/null || { mkdir -p pdata && cd pdata && git init -q -b politicians && git remote add origin $R && cd ..; }
fi
git -C pdata fetch -q origin politicians 2>/dev/null && git -C pdata reset -q --hard origin/politicians
PY=$B/venv/bin/python
BILL_AGES=${BILL_AGES:-22} "$PY" src/scripts/politicians/collect_assembly.py pdata || { echo "collect failed"; exit 1; }
"$PY" src/scripts/politicians/mirror_photos.py pdata || echo "photos failed"
# 첫 실행 전 뉴스 연결이 없으면 Actions가 채움
cd pdata
for n in 1 2 3; do
  git add -A && git -c user.name=newsboard-macmini -c user.email=macmini@users.noreply.github.com commit -qm "politicians: assembly $(date '+%Y-%m-%d %H:%M') KST" || { echo "nothing to commit"; break; }
  git push -q origin HEAD:politicians && { echo pushed; break; }
  git fetch -q origin politicians && git rebase -q -X theirs origin/politicians || git rebase --abort; sleep 15
done
echo "== end $(date)"
