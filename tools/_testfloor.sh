# ---------------------------------------------------------------------------------------------------
# THE SUITE MUST HAVE ACTUALLY RUN. Sourced by ship.sh and mutate.sh; one copy, because two copies of a
# safety check is how they end up disagreeing.
#
# WHY THIS EXISTS, measured 20 Aug 2026. Both scripts asked only whether anything FAILED — ship.sh for
# `"ok": true`, mutate.sh for the absence of FAIL lines. Neither asked whether any test had run. So a
# tests/tests.js with a SYNTAX ERROR registers ZERO tests, nothing fails, and both scripts call that
# green: ship.sh would have committed and pushed it while printing a tick, and mutate.sh cached the
# tree as a proven-green baseline. Demonstrated deliberately — an unbalanced brace spliced into the
# file came back "every test still passed".
#
# A count that only ever goes UP is the guarantee: the floor is raised on every green run, so the next
# run has to at least match it. Deleting a test on purpose is the one case that trips it, and the
# message says so — a deliberate removal is one line of maintenance, which is the right price for
# closing a hole that silently pushes a suite that never ran.
test_floor_check() {
  local out="$1" floor_file="tools/.test-floor" n floor
  n="$(printf '%s' "$out" | grep -o '"summary": "Regression [0-9]*/[0-9]*' | head -1 | sed 's|.*/||')"
  if [ -z "$n" ] || [ "$n" -eq 0 ] 2>/dev/null; then
    echo "❌ THE SUITE REGISTERED NO TESTS AT ALL — that is not green, that is a suite that never ran."
    echo "   The usual cause is a syntax error in tests/tests.js, which registers zero tests and so"
    echo "   fails nothing. Check it parses:"
    echo "   /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc -e \"new Function(readFile('tests/tests.js'))\""
    return 1
  fi
  floor="$(cat "$floor_file" 2>/dev/null || echo 0)"
  case "$floor" in ''|*[!0-9]*) floor=0;; esac
  if [ "$n" -lt "$floor" ]; then
    echo "❌ THE SUITE REGISTERED $n TESTS BUT THIS REPO HAS RUN $floor — $((floor - n)) went missing."
    echo "   Tests do not vanish on their own: the usual cause is tests/tests.js failing to parse, or a"
    echo "   test file that returns early, either of which reads as GREEN because nothing failed."
    echo "   If you removed a test on purpose, lower the number yourself:  echo $n > $floor_file"
    return 1
  fi
  printf '%s' "$n" > "$floor_file"
  return 0
}
