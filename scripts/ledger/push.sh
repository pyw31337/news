#!/usr/bin/env bash
# ledger 브랜치(덮어쓰기·압축 금지, 추가만) 커밋+푸시. 사용: push.sh <ledger폴더> "<메시지>"
set -u
cd "$1" || exit 1
git config user.name >/dev/null || git config user.name "newsboard-bot"
git config user.email >/dev/null || git config user.email "actions@users.noreply.github.com"
git add -A && { git diff --cached --quiet || git commit -qm "$2"; }
for n in 1 2 3 4 5 6; do
  git push -q origin HEAD:ledger && exit 0
  sleep $((n * 7 + RANDOM % 7))
  git pull -q --rebase -X theirs origin ledger || { git rebase --abort 2>/dev/null; git merge -q -X ours --no-edit origin/ledger; }
done
exit 1
