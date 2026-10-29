#!/usr/bin/env bash
# 로컬 수집 결과를 잃지 않는 업로드 큐. 원격이 막히면 로컬 Git 커밋을 그대로 보존하고 다음 실행에서 재시도한다.
set -u

if [ "$#" -ne 2 ]; then
  echo "사용: $0 <로컬-브랜치-폴더> <원격-브랜치>" >&2
  exit 2
fi

REPO=$1
BRANCH=$2
WORK_ROOT=${WORK:-"${HOME}/newsboard-work"}
QUEUE_ROOT="$WORK_ROOT/upload-queue"
STATUS="$QUEUE_ROOT/${BRANCH}.status"
mkdir -p "$QUEUE_ROOT"

write_status(){
  {
    printf 'checked_at=%s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')"
    printf 'branch=%s\n' "$BRANCH"
    printf 'head=%s\n' "$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || true)"
    printf 'pending_commits:\n'
    git -C "$REPO" log --oneline "origin/$BRANCH..HEAD" 2>/dev/null || true
  } > "$STATUS"
}

if [ ! -e "$REPO/.git" ]; then
  echo "큐 대상이 Git 저장소가 아닙니다: $REPO" >&2
  exit 2
fi
if ! git -C "$REPO" diff --quiet || ! git -C "$REPO" diff --cached --quiet; then
  echo "커밋되지 않은 결과가 있어 업로드하지 않았습니다: $REPO" >&2
  write_status
  exit 1
fi

# 최신 원격과 충돌하면 원격을 바탕으로 로컬 수집 커밋을 다시 얹는다. 실패 시 abort만 하고 로컬 커밋은 보존한다.
git -C "$REPO" fetch -q origin "$BRANCH" 2>/dev/null || true
if git -C "$REPO" rev-parse -q --verify "origin/$BRANCH" >/dev/null && ! git -C "$REPO" merge-base --is-ancestor "origin/$BRANCH" HEAD; then
  if ! git -C "$REPO" rebase -X theirs "origin/$BRANCH"; then
    git -C "$REPO" rebase --abort 2>/dev/null || true
    echo "원격 변경과 충돌했습니다. 로컬 큐를 보존하고 다음 회차에 다시 시도합니다." >&2
    write_status
    exit 1
  fi
fi

for WAIT in 0 5 15; do
  [ "$WAIT" -eq 0 ] || sleep "$WAIT"
  if git -C "$REPO" push -q origin "HEAD:$BRANCH"; then
    printf 'uploaded_at=%s\nbranch=%s\nhead=%s\npending_commits=0\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$BRANCH" "$(git -C "$REPO" rev-parse --short HEAD)" > "$STATUS"
    echo "업로드 완료: $BRANCH"
    exit 0
  fi
done

echo "원격 업로드를 미뤘습니다. 수집 결과는 로컬 커밋 큐에 보존됩니다: $STATUS" >&2
write_status
exit 1
