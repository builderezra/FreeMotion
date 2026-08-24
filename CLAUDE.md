# FreeMotion — project notes for Claude

Vanilla HTML/CSS/JS, no build step, no framework. Local-only (localStorage + IndexedDB).
Mobile-first — verify at ~380px. `index.html`'s version label is the source of truth; bump it
plus the `?v=` cache-busters and add a POLISH-LOG.md entry per release. Commit locally, then PUSH —
Ezra authorised this on 2026-08-13 (*"if you can do that then do it every time"*), replacing the old
GitHub-Desktop-by-hand arrangement. Use `git push ssh main`: the branch's upstream `origin` is the
HTTPS URL with no stored credentials and fails with "could not read Username", while the `ssh` remote
points at the same repo and authenticates with his on-disk key. Verify by comparing `git rev-parse HEAD`
against `git rev-parse ssh/main` — do not trust the push output alone.

**The app is live at <https://builderezra.github.io/FreeMotion/>** — GitHub Pages off `main`, which is
why pushing matters: that URL is what his phone loads and what the installed PWA updates from. Nothing in
the repo recorded it until 22 Aug, so every session had to guess or ask. To confirm a release actually
reached him (the push landing is not the same as the deploy landing):

```bash
curl -s https://builderezra.github.io/FreeMotion/index.html | grep -o '>v[0-9][0-9.]*<'
```

Pages takes a minute or so after a push, so a check straight after `ship.sh` can show the previous
version — that is normal, not a failure.

## ⚠️ SAFEGUARDS MUST BE STRUCTURAL, NOT REMEMBERED

His words, after watching me write myself a note about a mistake I had just made twice:
*"every safe guard needs to be structural, in fact anything that is important even slightly that could
be forgotten needs to be structural."*

So: **when something important goes wrong, do not write a reminder — remove the possibility.** A note
in a file is a hope that the next session reads it. A script that refuses to do the wrong thing is a
guarantee. Two exist already and both encode a failure that had ALREADY happened:

```bash
tools/ship.sh "commit message"
```
Runs the suite and **refuses to commit or push if it is red** (a red suite got pushed once, by running
the tests and the commit in the same command and not reading the output). Also checks the version label
matches the newest POLISH-LOG entry, refuses while a mutation is in progress, and confirms the push
landed by comparing `HEAD` to `ssh/main` rather than trusting the push output.

Two more gates live in it now, both added on 22 Aug and both locks on doors that were only ever held shut
by remembering:
- **A changed `js/*.js` or `styles.css` must have its `?v=` bumped in `index.html`, or ship.sh refuses.**
  This file has warned about it for months — *"a missed buster reads as 'the fix does not work' — it
  has"* — and nothing enforced it. The failure is the worst kind of silent: the code is right, the suite
  is green, the push lands, and the phone serves the OLD file, so a perfectly good fix reads as broken.
  New files are exempt (no previous `?v=` to differ from).
- **The summary at the top of REQUESTS.md must carry the version being shipped, or ship.sh refuses.**
  That block is written for Ezra and is the first thing he opens. One sat there for four days quoting
  v9.94, "659 tests green", "70 items open" and a next-actionable item that had long since shipped, while
  the app was on v11.50 with 816 tests. Nothing noticed because prose has no test. The stamp is now
  checked against `index.html`'s version.
- **`python3 tools/_classify.py` self-tests the queue classifier, and ship.sh refuses if any rule fails.**
  Every rule in it cures a real bug — an answered item gone unreachable, a hold that would not lift, five
  real items hidden by a phrase in a note about them — and nothing else in the repo would notice if one
  stopped working. The symptom is silence, which is why it needs a test rather than a reader.

```bash
tools/mutate.sh <file> "<old>" "<new>" ["expected failing test"]
```
Restores the file **on a trap**, so the tree cannot be left mutated by a timeout, a Ctrl-C or a kill —
which happened. **Refuses if the old string was not found**, because a mutation that silently did not
apply produces a green run that looks like proof and is not. Holds `.mutation-in-progress` so nothing
takes a browser measurement against a mutated tree — that produced one confidently wrong reading.

```bash
tools/mutate.sh   # …now also REFUSES when the tree is already red
```
Third one, added 19 Aug after it cost three false proofs in a row on queue 366. **A mutation result is
meaningless unless the suite was green before it**: if the test is already failing for its own reason —
an anchored regex against text that carries a prefix, a container selector that matches nothing — the run
reports `✅ CAUGHT` and proves exactly nothing. It happened three times before anyone thought to check.
The gate proves the tree green BEFORE applying the mutation, and caches that by a hash of the sources, so
it costs one extra suite run per EDIT rather than per mutation.

**Add to this pattern rather than adding notes.** If a mistake could recur, the fix is a script, a test,
or a gate — not a paragraph.

## ⚠️ RUN THE SUITE IN THE FOREGROUND WITH A LONG TIMEOUT — never background-and-poll

**`python3 tests/_cdp.py --port 8777` takes 3–4 minutes. The Bash tool's default timeout is 2 minutes.**
So a plain foreground call ALWAYS times out, and the reflex after that — background it, then poll for
the result — is slower than the run itself and has repeatedly ended in waiting on nothing.

⚠️ **`timeout: 900000` DOES NOT WORK — the Bash tool caps at 600000 and silently clamps.** Asking for 900s
gets 600s, and at 911 tests a double suite run plus the push now exceeds that, so ship.sh gets backgrounded
mid-flight (24 Aug, v12.28). It still finishes and still pushes — the notification arrives and the output
file has the result — but that is exactly the background-and-poll this section exists to stop.
**So: pass `timeout: 600000` (the real maximum) and expect ship.sh to sometimes land in the background.
When it does, do NOT re-run it.** Read the output file, then verify with `git rev-parse HEAD` against
`ssh/main` — re-running would re-run two four-minute suites for nothing.

**Always pass an explicit timeout instead:** `timeout: 500000` for a bare suite run — but **`timeout:
600000` (the cap) for `tools/ship.sh`, which runs the suite TWICE** (desktop, then again at 380px) whenever a
`js/*.js`, `styles.css` or `index.html` change is being shipped. 500s is not enough for that and the
ship gets backgrounded mid-push, which is exactly the background-and-poll this section exists to stop.
Measured at v11.83: two green passes plus the push took just over eight minutes. One call, one result,
no polling. Ezra has raised this more than once — *"i tried to get you to avoid this. it happens so
often, you need to stop this issue"* — so treat it as a hard rule, not a preference.

Two things that made it worse, both worth avoiding:
- A run that times out mid-way **leaves the file mutated** if it was a mutation check. Restore from the
  backup before doing anything else, and check with `grep -c mutated <file>`.
- **Never run a browser/preview check while a mutation job is running.** The browser loads whatever is
  on disk, so a measurement taken then describes the MUTATION, not the code. That has already produced
  one confidently wrong reading.

## ⚠️ THE LOOP LIVES IN [LOOP.md](LOOP.md) — he should not be pasting it

He said it himself on 20 Aug: *"the following loop thing doesnt seem to be working properly"*. It was
being re-pasted every turn, it told me never to report (which a turn cannot obey), and it kept firing
with nothing to do. The rules are in `LOOP.md` now, with two changes that matter: a blocker gets SAID as
well as recorded, and an empty queue ends the turn in one line instead of manufacturing work.

## ⚠️ WORK THE LIST OLDEST FIRST — not whatever he just said

**The next thing to work on is the LOWEST-NUMBERED open item in [REQUESTS.md](REQUESTS.md), always.**
New requests get written down at the bottom and then WAIT their turn. His words, after catching me
doing the opposite: *"Remember I want the oldest things in the list done first, not what I just told
you, make sure you figure out a way to remember if you keep forgetting."*

This is easy to get wrong, because a request he has just typed feels urgent and an item from three
weeks ago does not. It is still wrong. The whole point of the list is that nothing rots at the bottom
while newer, shinier things jump ahead of it — which is exactly what had been happening.

To find the next item, don't eyeball the file and **don't grep it either**:

```bash
./tools/next.sh
```

**The grep that used to live here was wrong, and wrong in the exact way this file warns about.** It
matched `^- \[ \] \*\*[0-9]`, and that `[0-9]` is a silent filter: **ten open items have no number**
(they predate the numbering) and so were invisible to every session that used it — not deprioritised,
unreachable. One is a measured phone bug where six effects' option rows run off screen and the last
options cannot be tapped. Nothing rots at the bottom was the whole point of the list, and the tool
meant to enforce it was the thing causing it.
`tools/next.sh` lists unnumbered items FIRST (they are the oldest), then numbered ones in order, and
prints a total so a shrinking list is visible. It also parses letter-suffixed numbers like `31b` —
the first version of the script mis-sorted that one to the bottom, which is the same bug again.

The only things that jump the queue are what HE explicitly says to do now ("do this asap", "right now
you need to…"), and a genuine emergency like a broken build. If an old item is blocked on a decision
from him, say so and move to the next-oldest — do not treat blocked as done.

## ⚠️ QUOTE HIM VERBATIM, AND CHECK OFF EVERY CLAUSE BEFORE TICKING

His words, after finding two halves of one request missing from something I had marked DONE:
*"maybe start logging my requests by copying exactly what i said because how do you leave all this
out"*.

So, structurally:
1. **Paste his message into the entry verbatim, in full**, before paraphrasing anything. A summary is
   where clauses go to die — #241 said three things (a turn animation on the cog, the panel opening
   beside the button, the button not being blurred) and shipped one and a half.
2. **Split a multi-part request into a numbered checklist of HIS clauses**, and tick them one at a
   time. An entry cannot be marked DONE while any clause is unticked.
3. **Verify in the layout HE uses.** Both misses here passed their tests and passed my own check,
   because I verified in a layout where the cog is a different element. This is the v7.79 lesson
   repeating verbatim: *measure the layout you ship to, not the one you have open.* For a PC report
   that means a desktop width AND the Studio layout, not Classic.

## ⚠️ DRAIN [INBOX.md](INBOX.md) BEFORE EVERY LOOP ITEM

He asked for a way to log requests himself while Claude keeps working: *"I feel like that 20 seconds of
not working adds up as I spam requests, I need a way for you to work and log at the same time."*
His own idea was moving the repo into iCloud Drive. **Do not do that** — iCloud syncs `.git` internals
non-atomically and leaves conflict-duplicate files inside them, which is a known way to corrupt a repo.
The repo is already on GitHub, which solves the same problem properly.

So: **he appends to `INBOX.md` from his phone; Claude is the only thing that empties it.** One writer
each way means a conflict is impossible. `git pull` first, move anything found into REQUESTS.md with a
number, clear the file, and carry on. Check it at the START of each loop item, not only when he speaks —
the whole point is that he can add things without interrupting.

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
