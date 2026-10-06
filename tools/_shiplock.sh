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

# ---- A LOCK IS TAKEN IN ONE STEP, NOT CHECKED AND THEN WRITTEN (6 Oct, the B1 check) --------------------------------
# ship_guard used to READ the lock and ship_phase to WRITE it, a moment later. Two ships started together both read
# "none" in that moment and both went on: 10 of 10 simultaneous pairs of the real ship.sh passed the guard, and two
# ship-bg.sh launches both exited 3 naming the SAME pid, while two full ships shared one tree, one port and one log
# (and one .ship-in-progress.tmp: "mv: rename .ship-in-progress.tmp to .ship-in-progress: No such file or directory").
# Now the lock file is CREATED with noclobber (O_EXCL): of any number of takers, exactly one creates it. A lock whose
# holder is dead (a KILL runs no trap) has to be removed first, and that is the delicate part: several takers can judge
# it dead at once, and a remover that is a moment late deletes the lock the first one has just taken. (Moving it aside
# and putting it back with ln was tried first; with four takers over one dead lock, two ended up holding it.) So a dead
# lock is removed only inside a short mkdir mutex, and only if it is still exactly what was judged dead: nothing else
# can replace an existing lock (noclobber needs it gone, and only a LIVE owner rewrites its own), so a check made inside
# the mutex still holds at the rm. The mutex is held for milliseconds; one left by a kill inside them is cleared after 5 s.
# _take_lockfile <file> <content> <is-alive function, called with the file>. 0 = it holds <content> (_TOOK_OVER=1 when
# it cleared a dead holder's lock first, whose content is in _OLD); 1 = _HELD=1 a live process holds it (content in
# _OLD), or _HELD=0 it could not be taken at all.
_take_lockfile() {
  local f="$1" line="$2" alive="$3" cur try i
  _TOOK_OVER=0; _HELD=0; _OLD=""
  for try in 1 2 3 4 5 6 7 8; do
    if ( set -o noclobber; printf '%s\n' "$line" > "$f" ) 2>/dev/null; then return 0; fi
    [ -f "$f" ] || continue                        # gone between the two looks: try again
    cur="$(cat "$f" 2>/dev/null)"
    if "$alive" "$f"; then _HELD=1; _OLD="$cur"; return 1; fi
    for i in $(seq 1 50); do mkdir "$f.takeover" 2>/dev/null && break; [ "$i" = 50 ] && { rmdir "$f.takeover" 2>/dev/null; mkdir "$f.takeover" 2>/dev/null; }; sleep 0.1; done
    if [ -f "$f" ] && [ "$(cat "$f" 2>/dev/null)" = "$cur" ]; then rm -f "$f"; _TOOK_OVER=1; _OLD="$cur"; fi
    rmdir "$f.takeover" 2>/dev/null
  done
  return 1
}
# A lock naming THIS process's own pid was left by an earlier process that had the same pid (a KILL, then pid reuse):
# it is not a live ship, or this ship would refuse itself for ever.
_ship_lock_alive() { [ "$(ship_lock_pid "$1")" != "$$" ] || return 1; case "$(ship_lock_state "$1")" in live*) return 0 ;; esac; return 1; }

# ship.sh calls this BEFORE its trap, so a refusal here cannot delete the running ship's lock or overwrite its
# .last-ship (the trap's cleanup would do both). It TAKES the lock (phase=gates) or refuses with exit 1 while a live
# ship holds it; a dead holder is reported as KILLED and its lock taken over.
ship_guard() {
  local opid ophase ok=0
  _take_lockfile .ship-in-progress "pid=$$ phase=gates since=$(date +%s)" _ship_lock_alive && ok=1
  opid="$(printf '%s' "$_OLD" | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | head -1)"
  ophase="$(printf '%s' "$_OLD" | sed -n 's/.*phase=\([^ ]*\).*/\1/p' | head -1)"
  if [ "$ok" = 1 ]; then
    [ "$_TOOK_OVER" = 1 ] && echo "⚠️  previous ship was KILLED (pid ${opid:-?} is gone; it died in phase ${ophase:-unknown}) — its lock was left behind. Carrying on."
    return 0
  fi
  if [ "$_HELD" = 1 ]; then
    echo "❌ a ship is already running (pid ${opid:-?}, phase ${ophase:-unknown}) — not starting a second one beside it."
    echo "   Watch it instead: .last-ship says PUSHED <hash> or REFUSED when it ends; tools/tick.sh says what it is doing."
  else
    echo "❌ could not take .ship-in-progress (it kept changing under five attempts) — not starting; run tools/tick.sh."
  fi
  return 1
}

# ship.sh writes this at every phase change. Written to a temp file and moved, so a reader never sees it empty — and
# the temp file is this process's own, so two writers can never move each other's (or find it gone).
ship_phase() {
  printf 'pid=%s phase=%s since=%s\n' "$$" "$1" "$(date +%s)" > ".ship-in-progress.$$.tmp" && mv -f ".ship-in-progress.$$.tmp" .ship-in-progress
}

_ship_ago() { local s="${1:-0}"; [ "$s" -gt 0 ] 2>/dev/null || { echo "?"; return; }; echo "$(( ( $(date +%s) - s ) / 60 ))m"; }

# What tick.sh prints about the ship: the lock, then the verdict file. Every line is a fact, not advice.
ship_status_lines() {
  local st; st="$(ship_lock_state .ship-in-progress)"
  case "$st" in
    live*) set -- $st; echo "🚢 SHIP RUNNING — pid $2, phase $3 for $(_ship_ago "$4"). Do not re-ship; watch .claude/ship/ship.log for a line starting \"SHIP EXIT\"." ;;
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

# 17.23 > 17.9 numerically, part by part.
_ver_newer() { awk -v a="$1" -v b="$2" 'BEGIN { na = split(a, x, "."); nb = split(b, y, "."); n = na > nb ? na : nb
  for (i = 1; i <= n; i++) { if (x[i] + 0 > y[i] + 0) exit 0; if (x[i] + 0 < y[i] + 0) exit 1 } exit 1 }'; }

# UNSHIPPED RELEASE (RULES-AUDIT B5). YES when index.html's version label is newer than live's (ssh/main), when a
# ship's lock names a dead pid, or when main has commits ssh/main does not (committed, never pushed: push them).
# Otherwise NO, whatever .last-ship says — .last-ship only explains why. A dirty tree on
# its own is NOT an unshipped release: INBOX.md, tools/design/pm/ and tools/design/plans/ belong to the logging chat,
# and code with no version bump is the batch in progress.
unshipped_release_line() {
  local here live st
  here="$(grep -o '>v[0-9][0-9.]*<' index.html 2>/dev/null | head -1 | tr -d '><v')"
  live="$(git show ssh/main:index.html 2>/dev/null | grep -o '>v[0-9][0-9.]*<' | head -1 | tr -d '><v')"
  st="$(ship_lock_state .ship-in-progress)"
  case "$st" in
    dead*) set -- $st; echo "UNSHIPPED RELEASE: YES — a ship was KILLED mid-flight (pid $2, phase $3; index.html v${here:-?}, live v${live:-?}). Re-ship it before anything new."; return 0 ;;
  esac
  if [ -z "$here" ] || [ -z "$live" ]; then echo "UNSHIPPED RELEASE: UNKNOWN — could not read the version label (here v${here:-?}, ssh/main v${live:-?}; did \`git fetch ssh\` fail?)"; return 0; fi
  # COMMITTED BUT NEVER PUSHED (6 Oct, the B5 check). ship.sh commits, then pushes, and GitHub dropped out twice that
  # night. A release with no version bump ("proof debt: …", "REQUESTS: …", a tools-only ship) left that way has labels
  # equal to live's and read "NO — vX is live" — a release that never reached his phone, reported as live. On main, any
  # commit ssh/main does not have is exactly that. Re-shipping it stops at "nothing to commit", so the line says push.
  local ahead behind newest why=""
  if [ "$(git symbolic-ref --short -q HEAD 2>/dev/null)" = main ]; then
    ahead="$(git rev-list --count ssh/main..HEAD 2>/dev/null)"; behind="$(git rev-list --count HEAD..ssh/main 2>/dev/null)"
    if [ "${ahead:-0}" -gt 0 ] 2>/dev/null; then
      case "$st" in
        live*) set -- $st; echo "UNSHIPPED RELEASE: IN FLIGHT — a ship is running (pid $2, phase $3) with $ahead commit(s) live does not have yet. Do not re-ship; watch .claude/ship/ship.log."; return 0 ;;
      esac
      newest="$(git log -1 --format=%s 2>/dev/null | cut -c1-80)"
      [ -f .last-ship ] && why=" (.last-ship: $(head -c 120 .last-ship | tr -d '\n'))"
      if [ "${behind:-0}" -gt 0 ] 2>/dev/null; then
        echo "UNSHIPPED RELEASE: YES — HEAD has $ahead commit(s) live (ssh/main) does not, newest \"$newest\", and live has $behind this tree does not$why. Bring live in first (ship.sh refuses until you do), then push: git push ssh main."
      else
        echo "UNSHIPPED RELEASE: YES — HEAD has $ahead commit(s) live (ssh/main) does not, newest \"$newest\" — committed, never pushed$why. If ship.sh made them (its gates passed, the push did not land), push: git push ssh main, then check HEAD == ssh/main. Re-shipping stops at \"nothing to commit\"."
      fi
      return 0
    fi
  fi
  if _ver_newer "$here" "$live"; then
    case "$st" in
      live*) set -- $st; echo "UNSHIPPED RELEASE: IN FLIGHT — v$here is being shipped now (pid $2, phase $3). Do not re-ship; watch .claude/ship/ship.log." ;;
      *) local why=""; [ -f .last-ship ] && why=" (.last-ship: $(head -c 120 .last-ship | tr -d '\n'))"
         echo "UNSHIPPED RELEASE: YES — index.html says v$here, live (ssh/main) is v$live$why. Ship it first." ;;
    esac
  elif _ver_newer "$live" "$here"; then
    echo "UNSHIPPED RELEASE: NO — and live is AHEAD of this tree (ssh/main v$live, index.html v$here): bring it in before any ship (ship.sh refuses until you do)."
  else
    echo "UNSHIPPED RELEASE: NO — v$here is live. A dirty tree is the batch in progress (or the logging chat's files): continue it."
  fi
}
