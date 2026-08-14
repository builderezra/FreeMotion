# FreeMotion — project notes for Claude

Vanilla HTML/CSS/JS, no build step, no framework. Local-only (localStorage + IndexedDB).
Mobile-first — verify at ~380px. `index.html`'s version label is the source of truth; bump it
plus the `?v=` cache-busters and add a POLISH-LOG.md entry per release. Commit locally, then PUSH —
Ezra authorised this on 2026-08-13 (*"if you can do that then do it every time"*), replacing the old
GitHub-Desktop-by-hand arrangement. Use `git push ssh main`: the branch's upstream `origin` is the
HTTPS URL with no stored credentials and fails with "could not read Username", while the `ssh` remote
points at the same repo and authenticates with his on-disk key. Verify by comparing `git rev-parse HEAD`
against `git rev-parse ssh/main` — do not trust the push output alone.

## ⚠️ WORK THE LIST OLDEST FIRST — not whatever he just said

**The next thing to work on is the LOWEST-NUMBERED open item in [REQUESTS.md](REQUESTS.md), always.**
New requests get written down at the bottom and then WAIT their turn. His words, after catching me
doing the opposite: *"Remember I want the oldest things in the list done first, not what I just told
you, make sure you figure out a way to remember if you keep forgetting."*

This is easy to get wrong, because a request he has just typed feels urgent and an item from three
weeks ago does not. It is still wrong. The whole point of the list is that nothing rots at the bottom
while newer, shinier things jump ahead of it — which is exactly what had been happening.

To find the next item, don't eyeball the file — it is not in numeric order:

```bash
grep -n "^- \[ \] \*\*[0-9]" REQUESTS.md | sed 's/^\([0-9]*\):- \[ \] \*\*\([0-9]*\).*/\2 (line \1)/' | sort -n | head
```

The only things that jump the queue are what HE explicitly says to do now ("do this asap", "right now
you need to…"), and a genuine emergency like a broken build. If an old item is blocked on a decision
from him, say so and move to the next-oldest — do not treat blocked as done.

## ⚠️ Every request Ezra makes goes in REQUESTS.md — immediately

**[REQUESTS.md](REQUESTS.md) is the running list of everything he has asked for.** Read it at the
start of a session and work it in order.

His words: *"honestly just add everything i say to a note in the file that you can go back on and
read and tick stuff off… no matter how small the request, note it and come back to it when it is its
turn, and i want to be able to see this note myself when i go into the file and see ur not missing
shit."*

So: write the request down BEFORE starting work on it, even mid-task, even if it is one sentence
about an arrow. Tick it off with its version when it ships, and never delete it — the history is
half the point. Anything deliberately not being done stays in Open with a **Held** note saying why;
quietly dropping a request is the exact failure this file exists to prevent.

It is written for HIM to read, not just for Claude — plain language, his own phrasing quoted where
it is short enough, and honest about what is outstanding.

## ⚠️ Standing reminder — raise this before ANY public release

**The UI is modelled on Alight Motion and must be made visually our own before publishing.**
See [BEFORE-PUBLISHING.md](BEFORE-PUBLISHING.md) for what was copied and what "done" means.

Trigger it whenever Ezra talks about publishing, launching, releasing, the App Store, a public
link, a demo video, or a tutorial series. Don't silently start the re-design — say the note
exists, what's outstanding, and let him decide when. It's deliberately not done yet: copying AM
was the fast way to build, and the app should be worth publishing before we spend time on identity.

Also: when adding a NEW screen or panel that's based on an Alight Motion screenshot, add it to the
list in BEFORE-PUBLISHING.md as you go, so the list stays honest.
