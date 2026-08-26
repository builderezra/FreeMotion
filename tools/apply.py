#!/usr/bin/env python3
"""Apply anchored edits ALL-OR-NOTHING, and leave a marker that blocks the next ship on failure.

Why this exists (v13.25, and it cost a false claim to Ezra).  A release is normally several edits
followed by ship.sh, chained on one command line.  Chained with `;`, a failed edit is INVISIBLE:
the traceback scrolls past, every later step runs anyway, the suite is green because the code was
never the problem, ship.sh pushes, and the commit message confidently describes a change that is not
in the tree.  That is exactly what happened — a measurement table announced in the summary, in the
commit and to his face never reached the entry it belonged to, because one anchor string had a line
break in a different place.

Being careful with `&&` is remembering, and remembering is what this repo has decided not to rely on.
So: a failed edit writes `.edit-failed`, and **ship.sh refuses while that file exists**.  A silent
half-application becomes a locked door.

  python3 tools/apply.py FILE <<'JSON'
  [{"old": "...", "new": "..."}, ...]
  JSON

Every `old` must appear EXACTLY ONCE.  Nothing is written unless all of them do.
"""
import io, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKER = os.path.join(ROOT, ".edit-failed")


def fail(msg):
    with io.open(MARKER, "w", encoding="utf-8") as f:
        f.write(msg + "\n")
    sys.stderr.write("\n❌ EDIT NOT APPLIED\n" + msg +
                     "\n→ .edit-failed written; ship.sh will refuse until this is resolved.\n")
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        fail("usage: apply.py FILE  (edits as JSON on stdin)")
    path = sys.argv[1] if os.path.isabs(sys.argv[1]) else os.path.join(ROOT, sys.argv[1])
    try:
        edits = json.load(sys.stdin)
    except Exception as e:
        fail("stdin is not valid JSON: %s" % e)
    if not isinstance(edits, list) or not edits:
        fail("expected a non-empty JSON list of {old, new}")
    try:
        src = io.open(path, encoding="utf-8").read()
    except Exception as e:
        fail("cannot read %s: %s" % (path, e))

    out = src
    problems = []
    for i, e in enumerate(edits):
        old, new = e.get("old"), e.get("new")
        if old is None or new is None:
            problems.append("edit %d: needs both 'old' and 'new'" % i)
            continue
        n = out.count(old)
        if n != 1:
            head = old.strip().split("\n")[0][:90]
            problems.append("edit %d: anchor found %d times (need exactly 1): %r" % (i, n, head))
            continue
        if old == new:
            problems.append("edit %d: 'old' and 'new' are identical - this edit does nothing" % i)
            continue
        out = out.replace(old, new, 1)
    if problems:
        fail("%s\n  " % path + "\n  ".join(problems))

    io.open(path, "w", encoding="utf-8").write(out)
    if os.path.exists(MARKER):
        os.remove(MARKER)
    print("✅ %s: %d edit(s) applied" % (os.path.relpath(path, ROOT), len(edits)))


if __name__ == "__main__":
    main()
