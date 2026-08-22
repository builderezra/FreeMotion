#!/bin/bash
# Ship a release, structurally — every gate is checked here so none can be skipped.
#
#   tools/ship.sh "<commit message>"
#
# Refuses to push unless: the tree is not mid-mutation, the suite is fully green, the version label
# and the newest POLISH-LOG entry agree, and the push actually landed. That last one matters —
# `origin` is an HTTPS URL with no stored credentials and fails with "could not read Username", so
# success is confirmed by comparing HEAD to ssh/main rather than by trusting the push output.
# A red suite was pushed once by running the tests and the commit in the same breath; not possible now.
set -uo pipefail
MSG="${1:-}"
[ -n "$MSG" ] || { echo "ship: needs a commit message"; exit 2; }
# Backticks in a double-quoted shell argument are COMMAND SUBSTITUTION, not code quotes. A message
# written with `void ic.offsetWidth` in it silently executed that and committed the gap where the
# code should have been — the explanation was gone from the log and nobody would have noticed.
case "$MSG" in
  *'`'*) echo "❌ the commit message contains a backtick, which the shell will execute and delete."
         echo "   Use plain quotes for code, or pass the message via: git commit -F -"; exit 2;;
esac
[ -f .mutation-in-progress ] && { echo "❌ a mutation check is still in progress — refusing to ship a mutated tree"; exit 1; }

# Anchored to the LABEL element, not the first version-shaped string in the file — a bare grep
# matched "v5.49" in a comment on line 5 and would have blocked every release.
VER="$(grep -o 'class="ver"[^>]*>v[0-9]\+\.[0-9]\+' index.html | grep -o 'v[0-9]\+\.[0-9]\+' | head -1)"
LOG="$(grep -o '^- v[0-9]\+\.[0-9]\+' POLISH-LOG.md | tail -1 | sed 's/^- //')"
[ -n "$VER" ] || { echo "❌ could not read the version label out of index.html — fix this gate before shipping"; exit 1; }
[ "$VER" = "$LOG" ] || { echo "❌ index.html says $VER but the newest POLISH-LOG entry is $LOG — write the log entry first"; exit 1; }

# The newest POLISH-LOG entry names the queue items it closes, e.g. "(queue 209)". If any of them is
# still an OPEN checkbox in REQUESTS.md, the release is about to go out with the item untick — which
# is the exact failure REQUESTS.md exists to prevent, and it happened on v8.19 when a tick script
# threw before writing and the push went ahead anyway.
LOGLINE="$(grep -n '^- v[0-9]' POLISH-LOG.md | tail -1 | cut -d: -f2-)"
# A release often ADVANCES an entry without closing it. That is legitimate and must not be silently
# waved through either, so it has to be declared: write "queue 202 (partial)" and the gate skips that
# number. Anything written as a plain "queue N" is a claim that N is finished, and is checked.
# tr, because the membership test below is ` $PARTIALS ` against `*" $q "*` — a SPACE-separated
# match. sort -u emits NEWLINES, so " 125\n202\n95 " contained " 95 " and nothing else: every declared
# partial except the last one in sort order was ignored and the gate blocked a correctly-declared
# release. Found by it refusing v9.26 three times over an entry that had declared all three properly.
PARTIALS="$(printf '%s' "$LOGLINE" | grep -o 'queue [0-9]\+ (partial)' | grep -o '[0-9]\+' | sort -u | tr '\n' ' ')"
for q in $(printf '%s' "$LOGLINE" | grep -o 'queue [0-9]\+' | grep -o '[0-9]\+' | sort -u); do
  case " $PARTIALS " in *" $q "*) continue;; esac
  if grep -q "^- \[ \] \*\*$q " REQUESTS.md || grep -q "^- \[ \] \*\*$q —" REQUESTS.md; then
    echo "❌ POLISH-LOG says this release closes queue $q, but #$q is still OPEN in REQUESTS.md."
    echo "   Tick it before shipping, or drop it from the log entry if it is not actually done."
    exit 1
  fi
done
# ---- A CHANGED FILE MUST HAVE ITS CACHE-BUSTER BUMPED (22 Aug) ----------------------------------
# WHY. CLAUDE.md has carried this warning for a long time — "a missed buster reads as 'the fix does not
# work' — it has" — and the only thing enforcing it was remembering. That is exactly what this project
# treats as no safeguard at all. The failure is silent and it is the WORST kind of silent: the code is
# correct, the tests are green, the push lands, and Ezra opens the app on his phone and sees the old
# build. Every symptom points at the fix being wrong when the fix is fine.
# Forty commits were scanned when this gate was written and none had missed one — so this is not a fix
# for a present mess, it is a lock on a door that has been left open the whole time.
# NEW files are exempt: they have no previous ?v= to differ from, and being referenced at all is enough.
BUSTER_MISS="$(python3 - <<'PYEOF'
import subprocess, re, sys
def sh(c): return subprocess.run(c, shell=True, capture_output=True, text=True).stdout
changed = set()
for line in sh("git status --porcelain").splitlines():
    parts = line[3:].split(" -> ")
    changed.add(parts[-1].strip())
watched = [f for f in changed if re.match(r'^(js/.*\.js|styles\.css)$', f)]
if not watched: sys.exit(0)
now = open('index.html', encoding='utf-8').read()
was = sh("git show HEAD:index.html")
def buster(txt, f):
    m = re.search(re.escape(f) + r'\?v=([0-9.]+)', txt)
    return m.group(1) if m else None
for f in sorted(watched):
    b_now = buster(now, f)
    if b_now is None: continue          # not referenced by index.html (a tool, a test helper) — not cached
    b_was = buster(was, f)
    if b_was is None: continue          # brand new reference — nothing to bump
    if b_now == b_was:
        print("%s (still ?v=%s)" % (f, b_now))
PYEOF
)"
if [ -n "$BUSTER_MISS" ]; then
  echo "❌ A FILE CHANGED BUT ITS CACHE-BUSTER DID NOT — not committing, not pushing."
  echo "$BUSTER_MISS" | sed 's/^/   /'
  echo "   Bump the ?v= for each of those in index.html. Without it the phone keeps serving the OLD file,"
  echo "   the app looks unchanged, and the fix reads as broken when it is fine."
  exit 1
fi

# ---- THE SUMMARY EZRA READS MUST NOT BE STALE (22 Aug) -------------------------------------------
# WHY. The block at the top of REQUESTS.md is the first thing he sees, and it is written for HIM. One sat
# there from 18 Aug for four days quoting v9.94, "659 tests green", "70 items open" and a "next actionable
# item" that had long since shipped — while the app was on v11.50 with 816 tests. Nothing noticed, because
# nothing was watching: it is prose, and prose has no test.
# So the stamp is checked against the version being shipped. It costs one line to update and it stops the
# one file he actually opens from lying to him about where things stand.
# `class="ver"` contains a literal v, so a loose grep matches that too — anchor on the delimiters.
REQ_VER="$(grep -o 'at v[0-9][0-9.]*' REQUESTS.md | head -1 | sed 's/^at //')"
APP_VER="$(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')"
if [ -n "$REQ_VER" ] && [ "$REQ_VER" != "$APP_VER" ]; then
  echo "❌ THE SUMMARY AT THE TOP OF REQUESTS.md IS STALE — not committing, not pushing."
  echo "   It says $REQ_VER; this build is $APP_VER."
  echo "   That block is the first thing Ezra reads. Update its state line (version, test count, what is"
  echo "   waiting on him) and the stamp, then ship again. A previous one misled him for four days."
  exit 1
fi

# THE CLASSIFIER MUST PROVE ITSELF BEFORE IT LABELS ANYTHING (22 Aug). tools/_classify.py decides what
# the loop picks up next AND what STATUS Ezra reads in REQUESTS.md, and every rule in it was written to
# cure a real bug — an answered item that had become unreachable, a hold that would not lift, five real
# items hidden by a phrase in a note about them. Nothing else in this repo would notice if one of those
# rules stopped working; the symptom is silence, which is the worst kind. So it self-tests, here, before
# it is allowed to write a label or hand out work.
if ! python3 tools/_classify.py; then
  echo "❌ THE QUEUE CLASSIFIER IS BROKEN — not committing, not pushing."
  echo "   Each failing case above is a bug that already happened once. Fix tools/_classify.py first."
  exit 1
fi
# Refresh REQUESTS.md's STATUS labels first, so they can never be stale in a commit (queue 352).
# A label written by hand is true the day it is written and misleading a week later.
./tools/status.sh >/dev/null 2>&1 || true

echo "→ running the suite (3-4 minutes)…"
OUT="$(python3 tests/_cdp.py --port 8777 2>&1)"
SUM="$(printf '%s' "$OUT" | grep -o '"summary": "[^"]*"' | head -1)"
if ! printf '%s' "$OUT" | grep -q '"ok": true'; then
  echo "❌ SUITE IS RED — not committing, not pushing."
  printf '%s' "$OUT" | grep -o 'FAIL[^"]*' | head -6
  exit 1
fi
# …and that it actually RAN. `"ok": true` is only "nothing failed", which a suite of zero tests also is.
. tools/_testfloor.sh
test_floor_check "$OUT" || { echo "   Not committing, not pushing."; exit 1; }
echo "✅ $SUM"

# ── THE PHONE PASS (queue 353 clause 3, added 22 Aug) ────────────────────────────────────────────
# "make sure everything is quality tested as good as possible" — and this app is MOBILE-FIRST, while
# every gate here had only ever run the suite at 1280px. `tests/_cdp.py --width 380` has been in the
# runner's own usage header for months and NOTHING has ever called it.
# That is not theoretical: queue 431 (the Media/Audio library crushing the tab row and clipping its
# labels) is a phone-layout bug that shipped, survived THREE passes that each measured a healthy row at
# desktop width, and was only found when he sent a screenshot and said "nothings happened".
# Skipped when no shipped source changed — a tests-only or docs-only commit cannot move a layout, and
# paying five minutes to prove that on every one of them is how a gate gets switched off. Deliberately
# NOT an allowlist of "UI files": such a list is right the day it is written and stale by the next
# module, which is the failure mode this file exists to remove.
PHONE_RELEVANT="$(git diff --cached --name-only; git diff --name-only)"
if printf '%s' "$PHONE_RELEVANT" | grep -qE '^(styles\.css|index\.html|js/)'; then
  echo "→ running the suite again at PHONE width (380px)…"
  POUT="$(python3 tests/_cdp.py --port 8777 --width 380 2>&1)"
  PSUM="$(printf '%s' "$POUT" | grep -o '"summary": "[^"]*"' | head -1)"
  if ! printf '%s' "$POUT" | grep -q '"ok": true'; then
    echo "❌ SUITE IS RED AT PHONE WIDTH — not committing, not pushing."
    echo "   It is GREEN at 1280px, so this is a layout that only breaks on a phone — which is the"
    echo "   one shape of bug this app can least afford, and exactly how queue 431 shipped."
    printf '%s' "$POUT" | grep -o 'FAIL[^"]*' | head -6
    exit 1
  fi
  test_floor_check "$POUT" || { echo "   Not committing, not pushing."; exit 1; }
  echo "✅ phone $PSUM"
else
  echo "· no shipped source changed — skipping the phone pass"
fi

git add -A
git commit -q -m "$MSG" || { echo "ship: nothing to commit"; exit 1; }
git push -q ssh main 2>&1 | tail -2
H="$(git rev-parse HEAD)"; R="$(git rev-parse ssh/main 2>/dev/null || echo none)"
if [ "$H" != "$R" ]; then echo "❌ PUSH DID NOT LAND — HEAD $H vs ssh/main $R"; exit 1; fi
echo "✅ pushed and verified: HEAD == ssh/main ($H)"
