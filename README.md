# FreeMotion

A video / motion editor that runs in the browser. Vanilla HTML + CSS + JavaScript — no build step, no
framework, no npm. Everything is stored on the device (localStorage + IndexedDB); nothing leaves it.

**Live:** <https://builderezra.github.io/FreeMotion/> — GitHub Pages, served off `main`.

---

## 🚨 If something is broken and you want it put back

```bash
tools/rollback.sh
```

Lists the recent releases, newest first, plus the version the app is on right now. **It changes nothing** —
safe to run any time. Then:

```bash
tools/rollback.sh v16.12
```

Puts the whole app back to that release and publishes it. It asks before it publishes; the live site
updates about a minute later.

- **Your projects cannot be lost this way.** They live on your device, not in this repo. A rollback
  changes the app's code only.
- **It never deletes history and never force-pushes.** It makes a *new* commit that restores the old
  files, so the rollback itself can be rolled back the same way.
- **Uncommitted work is parked, not destroyed** — it goes into a named `git stash` and the script prints
  how to get it back.
- **Your request list does not travel backwards.** `REQUESTS.md`, `POLISH-LOG.md` and `INBOX.md` stay at
  their current state, so nothing you have logged is rewound with the code.

---

## Where things are

| File | What it is |
|---|---|
| `index.html` | the app; its version label is the source of truth |
| `js/`, `styles.css`, `theme-glass.css` | the app's code and looks |
| `REQUESTS.md` | **everything Ezra has asked for**, oldest first. Opens with a `START HERE` block for a session with no memory |
| `INBOX.md` | where he writes requests from his phone; a session drains it into REQUESTS.md |
| `CLAUDE.md` | the standing rules for anyone (or anything) working on this |
| `POLISH-LOG.md` | one line per shipped release, what changed and why |
| `tools/` | the scripts below |
| `tests/` | the regression suite (`tests/run.html`, driven by `tests/_cdp.py`) |

## The commands that matter

```bash
tools/tick.sh                     # what's in flight, the queue oldest-first, what's unpushed — computed, not remembered
tools/next.sh                     # the single next thing to work on
tools/ship.sh "v16.xx — …"        # the ONLY way to release: runs the suite twice, proves the fix, then pushes
tools/rollback.sh                 # undo a release (above)
```

`ship.sh` refuses rather than shipping something wrong — a red suite, a stale version label, a missing
cache-buster, a queue jumped out of order, or a fix whose test still passes when the fix is removed.

## Working on it

Mobile is the priority; check the phone layout at ~380px on anything visual. Never commit or push by
hand — `tools/ship.sh` is the door. The full rules, and the reason behind each one, are in
[CLAUDE.md](CLAUDE.md).
