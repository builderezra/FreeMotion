# The "has live moved on?" gate of tools/ship.sh, as a function so it can be tested (#1066).
#
# Sourced by ship.sh and by tools/test-livegate.sh. ship.sh used to hold this inline, where nothing could exercise the three
# ways it answers: on 5 Oct another tool pushed ssh/main while this tree sat on an older version, and a ship spent ~90 minutes
# on two suite passes before the push was rejected; on 6 Oct github.com dropped out twice in a night and a fetch with no limit
# HANGS rather than fails. So: fetch first (15 s to connect), refuse in a second if the remote branch is not in this tree's
# history, refuse if the remote cannot be reached, and let FM_SHIP_OFFLINE=1 say "commit locally anyway, I know".
#
#   live_gate [remote=ssh] [branch=main]   returns 0 to go on, 1 to stop (and says why)
live_gate() {
  local remote="${1:-ssh}" branch="${2:-main}"
  export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -o ConnectTimeout=15 -o ServerAliveInterval=10 -o ServerAliveCountMax=3}"
  if git fetch -q "$remote" 2>/dev/null; then
    if ! git merge-base --is-ancestor "$remote/$branch" HEAD; then
      echo "❌ LIVE HAS MOVED ON: $remote/$branch ($(git rev-parse --short "$remote/$branch")) is not in this tree's history (HEAD $(git rev-parse --short HEAD))."
      echo "   Bring it in first — commit this work to a branch (no stash, no clean), fast-forward main to $remote/$branch, re-apply it"
      echo "   (git cherry-pick --no-commit <branch>), renumber if the versions collide. Shipping now would run the whole suite and then fail at the push."
      return 1
    fi
  elif [ "${FM_SHIP_OFFLINE:-}" = "1" ]; then
    echo "⚠️  could not reach GitHub ($remote) — FM_SHIP_OFFLINE=1, so carrying on; the push at the end will fail and the commit stays local"
  else
    echo "❌ GITHUB CANNOT BE REACHED (git fetch $remote failed or took over 15 s to connect). The push at the end would fail after ~90"
    echo "   minutes of suite passes. Wait until this answers 200, then ship:  curl -s -m 8 -o /dev/null -w '%{http_code}' https://github.com"
    echo "   (FM_SHIP_OFFLINE=1 tools/ship.sh ... commits locally anyway.)"
    return 1
  fi
  return 0
}
