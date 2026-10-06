"""The git reader tools/ship.sh's Python gates share (6 Oct, the PM's port review, minor).

Each gate had its own `def sh(c): return subprocess.run(c, shell=True, capture_output=True, text=True).stdout`, and the
order gate an `except Exception: diff = ''`. A git that FAILS — "dubious ownership" on a repo another user cloned, a
\\\\wsl.localhost path, a broken index — then printed nothing, which every caller read as "nothing changed": the buster
gate saw no changed file, the order gate saw no closed item. The port fixed the same shape in _srcfiles.py and
_spottests.py; this is ship.sh's copy. A failure is now said on stderr and ends the gate with exit 3, which ship.sh
turns into a refusal.
"""
import subprocess
import sys

GIT_FAILED = 3


def sh(cmd):
    """stdout of a shell command, or exit GIT_FAILED with the command and git's own words on stderr."""
    r = subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write("❌ git could not answer (%s, exit %d): %s\n"
                         % (cmd if isinstance(cmd, str) else ' '.join(cmd), r.returncode, (r.stderr or '').strip()[:300]))
        sys.exit(GIT_FAILED)
    return r.stdout
