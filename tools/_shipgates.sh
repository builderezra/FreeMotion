# ---------------------------------------------------------------------------------------------------
# SMALL PIECES OF tools/ship.sh's GATES, PULLED OUT SO tools/test-port.sh CAN RUN THEM (6 Oct, the PM's port review).
# Sourced by ship.sh. Each one was a one-liner inside ship.sh that could only be tested by shipping, and each had a way
# of answering wrong silently: a regex that matched the wrong line, a failed `git` that read as "nothing changed".
# POSIX-ish bash (ship.sh is bash), no top-level side effects.
# ---------------------------------------------------------------------------------------------------

# dq_titles FILE — the first three lines of FILE that DECLARE a test whose title holds a double quote (the suite's own
# hygiene rule: the FAIL line would be cut short in ship.sh and mutate.sh).
# ANCHORED to a declaration (6 Oct, review minor): the unanchored `test\('…"…'` also matched `.test('…` inside a regex
# test, `latest('`, `contest('` — so a line like  /re/.test('<b class="x">')  would make EVERY ship refuse in one second
# for a title that does not exist. The vanished-tests gate anchors the same way (`^  test('`). `[^']`, not `[^'\n]`:
# inside brackets `\n` is a backslash and the letter n (measured on GNU grep), and grep matches one line at a time anyway.
dq_titles() { grep -nE "^[[:space:]]*test\('[^']*\"[^']*'" "$1" | head -3; }


# on_main — true when the checkout is on main. ship.sh commits on the checked-out branch and pushes `main`, so anywhere
# else it would commit on that branch after ~90 minutes of suites and push whatever local main holds (review minor).
on_main() { [ "$(git symbolic-ref --short -q HEAD 2>/dev/null)" = main ]; }

# changed_js_files — the js/ and tests/ .js files changed against HEAD, or new and untracked, one a line. RETURNS 1 when git
# cannot answer (git's own words reach stderr) — 6 Oct, review minor: the parse gate read a failed `git diff` ("dubious
# ownership", a \\wsl.localhost path, a broken index) as "no script changed" and skipped itself without a word, the same
# failure the port had already fixed in _srcfiles.py and _spottests.py.
changed_js_files() {
  local a b
  a="$(git diff --name-only HEAD)" || { echo "changed_js_files: git diff failed (above)" >&2; return 1; }
  b="$(git ls-files --others --exclude-standard)" || { echo "changed_js_files: git ls-files failed (above)" >&2; return 1; }
  printf '%s\n%s\n' "$a" "$b" | grep -E '^(js|tests)/.*\.js$' | sort -u
  return 0
}

