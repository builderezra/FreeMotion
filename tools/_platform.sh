# ---------------------------------------------------------------------------------------------------
# WHAT DIFFERS BETWEEN THE MAC AND A LINUX/WSL MACHINE — one sourced file, so every tool asks the same question the same way.
#
#   . tools/_platform.sh        # (from the repo root; the tools do this themselves)
#
# WHY (6 Oct, the WSL port). Every tool here was written on the Mac, and several gates quietly stopped working on Linux
# instead of refusing: `sysctl -n vm.loadavg` errors there (hidden by 2>/dev/null), so the overload gate SKIPPED itself on
# every ship; `sysctl -n hw.ncpu || echo 4` invented a core count; the jsc parse gate was wrapped in `if [ -x jsc ]` and so
# vanished. A gate that switches itself off is worse than none, because it still reads like protection.
# THE RULE FOR EVERY FUNCTION HERE: answer, or say why not on stderr and return non-zero. NEVER echo a made-up fallback —
# the CALLER decides whether a missing answer is a refusal (a gate) or a shrug (a diagnostic), and says which.
#
# Sourced by bash 3.2 (the Mac's /bin/bash), bash 5 and dash (Linux's /bin/sh), under `set -u` and `set -e` callers, so:
# plain POSIX sh, no `local`, no arrays, no [[ ]], no `case` inside $( ) (bash 3.2 mis-parses its `)`), every variable
# read as ${x:-}, nothing run at the top level but exports, and no `exit`.
# The Chrome lookup order and the reap pattern are the same text as tests/_platform.py; keep them identical.

# Python: no __pycache__ in the repo (Linux has no global gitignore for it — tick.sh read the litter as uncommitted work and
# ship.sh's `git add -A` would commit it), and UTF-8 text I/O whatever the locale (macOS Python already is).
export PYTHONDONTWRITEBYTECODE=1 PYTHONUTF8=1

# fm_os — the kernel name: Darwin on the Mac, Linux under WSL.
fm_os() { uname -s; }

# fm_is_wsl — true when this Linux is WSL (its load and memory pressure are partly on the Windows host, invisible from here).
# (_FM_OSRELEASE is a test seam: tools/test-port.sh points it at a fake osrelease file to be "WSL" on any machine.)
fm_is_wsl() { [ "$(uname -s)" = Linux ] && grep -qi microsoft "${_FM_OSRELEASE:-/proc/sys/kernel/osrelease}" 2>/dev/null; }

# fm_mem_available_mb — memory the kernel says a new process could have (Linux MemAvailable), in MB; returns 1 elsewhere.
fm_mem_available_mb() {
  [ -r "${_FM_MEMINFO:-/proc/meminfo}" ] || { echo "fm_mem_available_mb: no /proc/meminfo on this platform" >&2; return 1; }
  awk '/^MemAvailable:/{ printf "%d\n", $2 / 1024; f = 1 } END { exit !f }' "${_FM_MEMINFO:-/proc/meminfo}"
}

# fm_load_blind_note — one line when a load gate PASSED on a machine whose load it cannot fully see (6 Oct, the PM's review).
# Under WSL the 1-minute load is the VM's: Defender scanning the repo, the Search indexer and Vmmem short of memory are on
# the Windows side and never appear in it, so a pass there is a pass on what could be measured — said, not implied. Says
# what the VM has free, which a floor could later be set from (not set here: 1.6x the cores is itself unmeasured on WSL).
fm_load_blind_note() {
  if fm_is_wsl; then
    echo "⚠️  load gate passed on the WSL VM's own load only — Windows-side load (Defender, the indexer, Vmmem) is not measured;" \
         "the VM has $(fm_mem_available_mb 2>/dev/null || echo '?') MB available."
  fi
  return 0
}

# fm_machine_noun — what to call this machine in a message: Mac, WSL machine or Linux machine.
fm_machine_noun() {
  if [ "$(uname -s)" = Darwin ]; then echo Mac
  elif fm_is_wsl; then echo "WSL machine"
  elif [ "$(uname -s)" = Linux ]; then echo "Linux machine"
  else echo machine; fi
}

# fm_ncpu — the online core count. Linux: getconf, NOT nproc (GNU nproc obeys OMP_NUM_THREADS: measured 2 on 16 cores).
fm_ncpu() {
  if [ "$(uname -s)" = Darwin ]; then _fm_v="$(sysctl -n hw.ncpu 2>/dev/null)"
  else _fm_v="$(getconf _NPROCESSORS_ONLN 2>/dev/null)"; fi
  case "${_fm_v:-}" in
    ''|*[!0-9]*|0) echo "fm_ncpu: could not read this machine's core count (got '${_fm_v:-}')" >&2; return 1 ;;
  esac
  echo "$_fm_v"
}

# fm_load1 — the 1-minute load average. Mac: `{ 1.23 1.45 1.67 }`, field 2. Linux: /proc/loadavg FIELD 1 — field 2 there
# is the 5-minute figure, the trap in the obvious port. (Under WSL it is the VM's load; the Windows host's is not in it.)
fm_load1() {
  _fm_v=""
  if [ "$(uname -s)" = Darwin ]; then _fm_v="$(sysctl -n vm.loadavg 2>/dev/null | awk '{print $2}')"
  elif [ -r /proc/loadavg ]; then _fm_v="$(awk '{print $1}' /proc/loadavg)"; fi
  case "${_fm_v:-}" in
    ''|.*|*.|*.*.*|*[!0-9.]*) echo "fm_load1: could not read the 1-minute load average (got '${_fm_v:-}')" >&2; return 1 ;;
  esac
  echo "$_fm_v"
}

# fm_load_bar — the 1-minute load above which ship.sh will not start a suite: 1.6 x the cores. MEASURED on the 6-core Mac
# (21 Sep — see ship.sh); UNMEASURED on WSL's vCPUs, where it is 25.6 on 16. tick.sh quotes the same number.
fm_load_bar() {
  _fm_n="$(fm_ncpu)" || return 1
  LC_ALL=C awk -v n="$_fm_n" 'BEGIN { printf "%.1f\n", 1.6 * n }'   # C locale: "9.6", never "9,6"
}

# fm_swap_summary — one line about swap, for a refusal message only (it decides nothing). Prints "unknown" and returns 1
# when it cannot tell.
fm_swap_summary() {
  _fm_v=""
  if [ "$(uname -s)" = Darwin ]; then _fm_v="$(sysctl -n vm.swapusage 2>/dev/null | sed 's/  */ /g')"
  elif [ -r /proc/meminfo ]; then
    _fm_v="$(awk '/^SwapTotal:/{t=$2} /^SwapFree:/{f=$2} END{ if (t != "") printf "total %dM used %dM free %dM", t/1024, (t-f)/1024, f/1024 }' /proc/meminfo)"
  fi
  if [ -z "$_fm_v" ]; then echo "fm_swap_summary: no swap figures on this platform" >&2; echo unknown; return 1; fi
  echo "$_fm_v"
}

# fm_top_cpu N — the N busiest processes, indented for _whyslow. Diagnostic only: says so when it cannot tell.
fm_top_cpu() {
  _fm_out=""
  if [ "$(uname -s)" = Darwin ]; then
    _fm_out="$(top -l 2 -o cpu -n 6 -s 2 2>/dev/null | awk '/^PID/{c++; next} c==2 && NF>3 {print "      " substr($0,1,58)}' | head -"${1:-6}")"
  else
    # procps: -b batch, 2 samples 2 s apart (the first is since boot), header line starts with spaces; print pid, %cpu, command
    _fm_out="$(top -b -n 2 -d 2 -o %CPU -w 512 2>/dev/null | awk '/^ *PID /{c++; next} c==2 && NF>11 {printf "      %-8s %6s%%  %s\n", $1, $9, $12}' | head -"${1:-6}")"
  fi
  if [ -n "$_fm_out" ]; then printf '%s\n' "$_fm_out"; else echo "      (per-process CPU is not available on this platform)"; fi
}

# fm_slow_hint — what usually makes THIS kind of machine too slow for the suite, and the cure. Message text only.
fm_slow_hint() {
  if [ "$(uname -s)" = Darwin ]; then
    echo "macOS daemons (duetexpertd, photolibraryd, corespotlightd, mediaanalysisd, suggestd) or a high"
    echo "kernel_task mean the Mac is indexing or thermally throttling. Wait for it to settle, then ship"
    echo "again — and confirm it is load by checking whether the last test above MOVES between runs."
  elif fm_is_wsl; then
    echo "This is WSL: the usual culprits run on the WINDOWS side and are invisible to top and the load average here —"
    echo "Windows Defender scanning the repo (MsMpEng), the Search indexer, or 'Vmmem'/'VmmemWSL' short of memory. Check"
    echo "Windows Task Manager. 'wsl --shutdown' (from Windows) frees the VM's memory but stops EVERY WSL process."
    echo "Confirm it is load by checking whether the last test above MOVES between runs."
  else
    echo "Check top for what is using the CPU and free -h for memory, then try again — and confirm it is load by"
    echo "checking whether the last test above MOVES between runs."
  fi
}

# fm_js_parser — which parser fm_js_parse will use (jsc | node); returns 127 and says so on stderr when there is none.
fm_js_parser() {
  if [ -x /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc ]; then echo jsc
  elif command -v node >/dev/null 2>&1; then echo node
  else
    echo "fm_js_parser: no JavaScript parser — neither macOS's jsc nor node is installed (Linux: sudo apt install nodejs)" >&2
    return 127
  fi
}

# fm_js_parse FILE — prints "ok", or "ERR <message>", for FILE parsed as a CLASSIC SCRIPT body: `new Function(source)`,
# the same question on both machines. NOT `node --check`: Node 22 passes `export` and top-level `await` (measured), and
# the app loads every file as a classic <script>, where both are syntax errors. Returns 127 when there is no parser.
fm_js_parse() {
  _fm_p="$(fm_js_parser)" || return 127
  if [ "$_fm_p" = jsc ]; then
    /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc \
      -e "try { new Function(read('$1')); print('ok') } catch (e) { print('ERR ' + e) }" 2>&1
  else
    # the file is an ARGUMENT, not spliced into the source, so a quote in its name cannot break the check
    node -e 'try { new Function(require("fs").readFileSync(process.argv[1], "utf8")); console.log("ok") } catch (e) { console.log("ERR " + e) }' "$1" 2>&1
  fi
}

# fm_chrome — the Chrome binary the test tooling launches: $FM_CHROME, else the Mac app, else google-chrome or
# google-chrome-stable on PATH (Chromium only when FM_CHROME names it — 6 Oct, the PM's review). Refuses (stderr, return 1)
# when there is none — and when FM_CHROME is set but wrong, rather than quietly using another browser.
fm_chrome() {
  if [ -n "${FM_CHROME:-}" ]; then
    if [ -f "$FM_CHROME" ] && [ -x "$FM_CHROME" ]; then echo "$FM_CHROME"; return 0; fi
    echo "fm_chrome: FM_CHROME is set to '$FM_CHROME', which is not an executable file — fix it or unset it" >&2
    return 1
  fi
  # _FM_MAC_APP is a TEST SEAM only (tools/test-port.sh points it at nothing, to reach the PATH half on a Mac)
  _fm_app="${_FM_MAC_APP:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
  if [ -x "$_fm_app" ]; then
    echo "$_fm_app"; return 0
  fi
  # GOOGLE CHROME ONLY, unless FM_CHROME names another (6 Oct, the PM's port review) — tests/_platform.py says why
  for _fm_n in google-chrome google-chrome-stable; do
    if command -v "$_fm_n" >/dev/null 2>&1; then command -v "$_fm_n"; return 0; fi
  done
  echo "fm_chrome: no Chrome found — tried \$FM_CHROME (unset), /Applications/Google Chrome.app, google-chrome and google-chrome-stable on PATH. Install google-chrome or set FM_CHROME." >&2
  for _fm_n in chromium chromium-browser; do
    if command -v "$_fm_n" >/dev/null 2>&1; then
      echo "   $(command -v "$_fm_n") is on PATH but is NOT used unless FM_CHROME names it (a Chromium build may lack what the app probes: H.264, AAC)." >&2
      break
    fi
  done
  return 1
}

# fm_chrome_extra_flags — the flags that make THIS OS's headless Chrome answer like the Mac's, one a line; nothing on the
# Mac. The twin of tests/_platform.py chrome_extra_flags() — same flags, same order, and that file says what each fixes
# (a mouse, 0-width scrollbars, no 8 GB renderer cap). For the shell tools that launch Chrome themselves (tests/_shot.sh):
# without them a Linux PC-width picture is the FINGER layout, (hover: none) and (pointer: none) — the PM's review.
fm_chrome_extra_flags() {
  if [ "$(uname -s)" = Linux ]; then
    printf '%s\n' --hide-scrollbars \
      --blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2 \
      --no-sandbox
  fi
  return 0
}

# fm_chrome_reap_pattern — the `pgrep -f` pattern for a test Chrome on an fm-cdp- profile, anchored to the CHROME BINARY
# (ship.sh says why a bare 'fm-cdp-' is dangerous). Linux: every process of one headless Chrome shows argv[0]
# /opt/google/chrome/chrome, even launched through the google-chrome wrapper (measured 14/14, and 0 decoy shells).
# ⚠️ …AND THE CHROME FM_CHROME NAMES (6 Oct, the PM's port review). The list was fixed per OS, while FM_CHROME may name any
# binary (chrome-headless-shell, a renamed Chrome for Testing, Chromium.app): its processes matched nothing and their orphans
# were never reaped, silently. Its basename (regex-escaped) is added to the list. Same text as tests/_platform.py.
fm_chrome_reap_pattern() {
  _fm_extra=""
  if [ -n "${FM_CHROME:-}" ]; then
    _fm_extra="$(basename "$FM_CHROME" | sed 's/[][\.*^$+?(){}|/]/\\&/g')"
  fi
  case "$(uname -s)" in
    Darwin) if [ -n "$_fm_extra" ] && [ "$_fm_extra" != "Google Chrome" ]; then echo "(Google Chrome|$_fm_extra).*fm-cdp-"
            else echo 'Google Chrome.*fm-cdp-'; fi ;;
    Linux)  case "|chrome|chromium|chromium-browser|" in
              *"|$_fm_extra|"*) _fm_extra="" ;;
            esac
            echo "^([^ ]*/)?(chrome|chromium|chromium-browser${_fm_extra:+|$_fm_extra})( |\$).*fm-cdp-" ;;
    *)      echo "fm_chrome_reap_pattern: no pattern for $(uname -s) — orphaned test Chromes are NOT reaped here" >&2; return 1 ;;
  esac
}

# fm_driver_pattern — the `pgrep -f` pattern for a RUNNING test driver: a PYTHON process whose arguments name _cdp.py.
# (6 Oct, the PM's port review.) The liveness check was `pgrep -f _cdp.py`, which also matches a shell that is merely
# running or waiting on one (the Bash tool's wrapper, `timeout … python3 tests/_cdp.py`, an until-loop), and a ship.sh whose
# commit message names _cdp.py — so the reaper stood down, silently, on exactly the runs most likely to leave orphans.
# Anchored to the interpreter (argv[0] ends in python/Python, with a version or not); a path with spaces still matches.
# Same text as tests/_platform.py driver_pattern().
fm_driver_pattern() { echo '^[^ ]*[Pp]ython[0-9.]* .*_cdp\.py( |$)'; }

# fm_pgrep_args PATTERN — "PID full command line", one per process whose command line matches PATTERN. The Mac's BSD
# `pgrep -fl` prints exactly that; procps `pgrep -fl` prints only "PID name" (measured: "127179 bash" for a shell running
# `pgrep -f tests/_cdp.py`), so a caller filtering the text — tick.sh's `grep -v pgrep` — had nothing to filter and counted
# a waiting shell as a live suite. procps' full-line flag is -a (BSD's -a means something else, hence the split).
# pgrep's own status is kept (1 = none matched); no pgrep at all is said on stderr with 127.
fm_pgrep_args() {
  if ! command -v pgrep >/dev/null 2>&1; then echo "fm_pgrep_args: no pgrep on this machine — cannot list processes" >&2; return 127; fi
  if [ "$(uname -s)" = Darwin ]; then pgrep -fl "$1"; else pgrep -af "$1"; fi
}

# fm_sha1 — SHA-1 of stdin, the hash only (shasum on the Mac, sha1sum where shasum is missing; same digest either way).
fm_sha1() {
  if command -v shasum >/dev/null 2>&1; then shasum | cut -d' ' -f1
  elif command -v sha1sum >/dev/null 2>&1; then sha1sum | cut -d' ' -f1
  else echo "fm_sha1: no SHA-1 tool (shasum or sha1sum) on this machine" >&2; return 1; fi
}

# fm_require TOOL... — every TOOL is on PATH, or say which are missing (stderr) and return 1.
fm_require() {
  _fm_miss=""
  for _fm_t in "$@"; do command -v "$_fm_t" >/dev/null 2>&1 || _fm_miss="$_fm_miss $_fm_t"; done
  [ -z "$_fm_miss" ] && return 0
  echo "❌ missing on this machine:$_fm_miss — install it (Linux: sudo apt install <name>), then run this again" >&2
  return 1
}

# fm_icloud_drive — the iCloud Drive folder his phone's notes land in. Mac: ~/Library/Mobile Documents/com~apple~CloudDocs
# (as before — whether it exists is the caller's question). Elsewhere: $FM_ICLOUD_DRIVE, which must be a folder; with
# neither, say so and return 1 — this machine cannot SEE the channel, which is not the same as the channel being empty.
fm_icloud_drive() {
  if [ "$(uname -s)" = Darwin ]; then echo "$HOME/Library/Mobile Documents/com~apple~CloudDocs"; return 0; fi
  if [ -n "${FM_ICLOUD_DRIVE:-}" ]; then
    if [ -d "$FM_ICLOUD_DRIVE" ]; then echo "$FM_ICLOUD_DRIVE"; return 0; fi
    echo "fm_icloud_drive: FM_ICLOUD_DRIVE is set to '$FM_ICLOUD_DRIVE', which is not a folder" >&2; return 1
  fi
  echo "fm_icloud_drive: there is no iCloud Drive on this $(fm_machine_noun) (set FM_ICLOUD_DRIVE to a synced copy of it)" >&2
  return 1
}

# fm_shortcuts_docs — the Shortcuts app's own iCloud container, where a mis-aimed phone note lands (see inbox.sh).
# Mac: under ~/Library/Mobile Documents; elsewhere $FM_SHORTCUTS_DOCS (a folder), or return 1.
fm_shortcuts_docs() {
  if [ "$(uname -s)" = Darwin ]; then echo "$HOME/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents"; return 0; fi
  if [ -n "${FM_SHORTCUTS_DOCS:-}" ]; then
    if [ -d "$FM_SHORTCUTS_DOCS" ]; then echo "$FM_SHORTCUTS_DOCS"; return 0; fi
    echo "fm_shortcuts_docs: FM_SHORTCUTS_DOCS is set to '$FM_SHORTCUTS_DOCS', which is not a folder" >&2; return 1
  fi
  echo "fm_shortcuts_docs: no Shortcuts iCloud folder on this $(fm_machine_noun) (set FM_SHORTCUTS_DOCS to a synced copy of it)" >&2
  return 1
}
