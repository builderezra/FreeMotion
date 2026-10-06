# ---------------------------------------------------------------------------------------------------
# WHO IS SHIPPING, READ ONE WAY. Sourced by tools/ship.sh, tools/ship-bg.sh, tools/tick.sh, tools/mutate.sh
# and tools/test-ship-bg.sh — one copy, because two readers of one lock is how they end up disagreeing.
#
# WHY (6 Oct, RULES-AUDIT B1). On 5 Oct a ship was launched the way the docs said (run_in_background), was
# KILLED at the harness's 10-minute limit, and left nothing behind that said so: `.ship-in-progress` was an
# empty `touch`, so "is a ship running?" could only be answered by guessing. A KILL skips every trap, so the
# lock and the verdict file are the only witnesses, and they have to say WHICH process they belong to.
#
#   .ship-in-progress   pid=<n> phase=<gates|prove|desktop|phone|push> since=<epoch the phase began>
#   .last-ship          RUNNING <pid> <version> <epoch>   while a ship runs (written once, after the trap)
#                       PUSHED <short hash>                when the push verified
#                       REFUSED rc=<n> [why]               on every other way out that runs the trap
# A KILLED ship (SIGKILL, a harness limit, a reboot) leaves the lock and RUNNING behind with a pid that is
# gone. That is the one state nothing else can produce, so it is read as KILLED, never as "still running".
# ---------------------------------------------------------------------------------------------------

# The pid a lock file names, or nothing (a lock from before 6 Oct was an empty `touch`).
ship_lock_pid() { [ -f "${1:-.ship-in-progress}" ] && sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' "${1:-.ship-in-progress}" 2>/dev/null | head -1; return 0; }
ship_lock_field() { [ -f "${2:-.ship-in-progress}" ] && sed -n "s/.*$1=\\([^ ]*\\).*/\\1/p" "${2:-.ship-in-progress}" 2>/dev/null | head -1; return 0; }

# Is <pid> a LIVE ship.sh? kill -0 alone is not enough over a 90-minute run: a dead ship's pid can be handed
# to an unrelated process, and a lock that then reads "alive" would refuse every ship until someone noticed.
ship_pid_alive() {
  [ -n "${1:-}" ] || return 1
  kill -0 "$1" 2>/dev/null || return 1
  ps -p "$1" -o command= 2>/dev/null | grep -q 'ship\.sh'
}

# An old-format lock carries no pid. Is SOME other ship.sh alive? The process list goes to a file first: in a
# pipeline, the forked side can be sampled before it execs and would show THIS script's own command line.
_ship_other_alive() {
  local snap; snap="$(mktemp "${TMPDIR:-/tmp}/fm-ps-XXXXXX")" || return 1
  ps -Ao pid=,command= > "$snap" 2>/dev/null
  awk -v me="$$" -v pp="${PPID:-0}" '$1 != me && $1 != pp && $0 ~ /ship[.]sh/ && $0 !~ /ship-bg[.]sh|test-ship-bg/ { f = 1 } END { exit(f ? 0 : 1) }' "$snap"
  local rc=$?; rm -f "$snap"; return $rc
}

# none | live <pid> <phase> <since> | dead <pid> <phase> <since>
ship_lock_state() {
  local f="${1:-.ship-in-progress}" pid phase since
  [ -f "$f" ] || { echo none; return 0; }
  pid="$(ship_lock_pid "$f")"; phase="$(ship_lock_field phase "$f")"; since="$(ship_lock_field since "$f")"
  if [ -z "$pid" ]; then
    if _ship_other_alive; then echo "live ? ${phase:-unknown} ${since:-0}"; else echo "dead ? ${phase:-unknown} ${since:-0}"; fi
    return 0
  fi
  if ship_pid_alive "$pid"; then echo "live $pid ${phase:-unknown} ${since:-0}"; else echo "dead $pid ${phase:-unknown} ${since:-0}"; fi
}

# ship.sh calls this BEFORE its trap, so a refusal here cannot delete the running ship's lock or overwrite its
# .last-ship (the trap's cleanup would do both). Refuses with exit 1 while a ship's pid is alive; a dead one is
# reported as KILLED and the caller carries on (it will overwrite the lock with its own).
ship_guard() {
  local st; st="$(ship_lock_state .ship-in-progress)"
  case "$st" in
    live*) set -- $st
           echo "❌ a ship is already running (pid $2, phase $3) — not starting a second one beside it."
           echo "   Watch it instead: .claude/ship/ship.log ends with \"SHIP EXIT\"; .last-ship says PUSHED or REFUSED."
           return 1 ;;
    dead*) set -- $st
           echo "⚠️  previous ship was KILLED (pid $2 is gone; it died in phase $3) — its lock was left behind. Carrying on."
           return 0 ;;
  esac
  return 0
}

# ship.sh writes this at every phase change. Written to a temp file and moved, so a reader never sees it empty.
ship_phase() {
  printf 'pid=%s phase=%s since=%s\n' "$$" "$1" "$(date +%s)" > .ship-in-progress.tmp && mv -f .ship-in-progress.tmp .ship-in-progress
}

_ship_ago() { local s="${1:-0}"; [ "$s" -gt 0 ] 2>/dev/null || { echo "?"; return; }; echo "$(( ( $(date +%s) - s ) / 60 ))m"; }

# What tick.sh prints about the ship: the lock, then the verdict file. Every line is a fact, not advice.
ship_status_lines() {
  local st; st="$(ship_lock_state .ship-in-progress)"
  case "$st" in
    live*) set -- $st; echo "🚢 SHIP RUNNING — pid $2, phase $3 for $(_ship_ago "$4"). Do not re-ship; watch .claude/ship/ship.log for \"SHIP EXIT\"." ;;
    dead*) set -- $st; echo "🚨 SHIP KILLED — .ship-in-progress names pid $2 (phase $3) and it is gone. Nothing after that phase happened: the release did NOT land. Re-ship it (tools/ship-bg.sh)." ;;
  esac
  [ -f .last-ship ] || return 0
  local v; v="$(cat .last-ship 2>/dev/null)"
  case "$v" in
    RUNNING*)
      set -- $v
      if ship_pid_alive "${2:-}"; then echo "last ship: RUNNING — pid $2 shipping ${3:-?}, started $(_ship_ago "${4:-0}") ago"
      else echo "🚨 THE LAST SHIP WAS KILLED — .last-ship says RUNNING ${3:-?} but pid ${2:-?} is gone (no trap ran, so no verdict was written). Nothing landed: re-ship it (tools/ship-bg.sh)."; fi ;;
    # A refusal is not automatically a problem — the docs-only batch gate refuses ON PURPOSE and says so.
    # Shouting at that one would teach the next session to scroll past the banner, which costs the real
    # refusals this line exists to surface. So the alarm is reserved for a refusal with no stated reason.
    *batched*)    echo "last ship: held back on purpose ($v) — carry on; the notes ride out with the next real change" ;;
    *overloaded*) echo "⏸ last ship: the MAC was overloaded, not the code ($v) — the tree is a finished release; ship it again once \`sysctl -n vm.loadavg\` is under ~10 (ship.sh refuses in a second otherwise, so trying costs nothing)" ;;
    "REFUSED rc=130"*|"REFUSED rc=143"*) echo "⚠️ last ship: INTERRUPTED by a signal ($v) — no gate refused it; nothing landed. Re-ship it." ;;
    REFUSED*)     echo "🚨 THE LAST SHIP REFUSED ($v) — the tree is an UNSHIPPED release, not work in progress. Read .claude/ship/ship.log, fix the gate it tripped, ship again." ;;
    *)            echo "last ship: $v" ;;
  esac
}

