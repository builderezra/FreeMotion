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
- **ship.sh REFUSES to close an item while a lower-numbered workable one is open.** Added 26 Aug, and it
  is a lock on the door this very file has been asking sessions to hold shut by hand for weeks. The
  section below quotes him — *"I want the oldest things in the list done first, not what I just told
  you, make sure you figure out a way to remember if you keep forgetting"* — and remembering was the
  entire mechanism. It failed twice in one day: v12.69 shipped #556/#557/#558 with six lower items
  workable, and v12.70 jumped #474 while I was writing the gate that catches it. **`tools/next.sh` was
  right both times**; nothing was broken except the obeying. Two reasons it keeps happening and neither
  goes away: an item parked on a decision FEELS blocked even when the tool says READY, and something he
  typed yesterday feels more urgent than something from three weeks ago. The escape hatch is a
  declaration, not a flag — write **`JUMPED: <reason>`** in the skipped entry and it stops holding the
  queue, which turns a silent reordering into a line he can read.
- **`python3 tools/_classify.py` self-tests the queue classifier, and ship.sh refuses if any rule fails.**
  Every rule in it cures a real bug — an answered item gone unreachable, a hold that would not lift, five
  real items hidden by a phrase in a note about them — and nothing else in the repo would notice if one
  stopped working. The symptom is silence, which is why it needs a test rather than a reader.
- **`tools/next.sh` shouts `!! STALE ASKS` when an entry records his answer and still carries an open
  `❓ASK:` line.** Added 2 Sep after #98 sat in "blocked on Ezra" for a day with his answer written in full
  two lines above the question it answered; on its first run it found #560 the same way, answered on 1 Sep.
  Striking the ask is a thing a session has to remember, so the tool names the contradiction instead. It
  does NOT reclassify — an unrelated answer must not promote an entry (#250) — and the classifier now also
  credits an uppercase **`HE ANSWERED`** as an answer, which is how both entries had recorded it. When the
  banner fires: strike the ask (`~~…~~` or a ✅ prefix) or say plainly the answer was to something else.

```bash
tools/mutate.sh <file> "<old>" "<new>" ["expected failing test"]
```

⚠️ **AND DO NOT WRITE A `pgrep` WAIT-LOOP FOR IT.** `until ... ! pgrep -f "tools/mutate.sh" ...` matches
**its own command line** — the string is right there in the argv being evaluated — so the condition never
goes false. Six of these were found still spinning hours after their jobs had finished (1 Sep; Ezra
spotted them, not me). Nothing was corrupted, because every result had been read from the job's own
output file, but they burned CPU and buried what was genuinely in flight.
**Wait on the lock file, which cannot match itself:** `until [ ! -f .mutation-in-progress ]; do sleep 15; done`
— or better, do not write a waiter at all: `run_in_background: true` already notifies on completion.
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

```bash
tools/mutate.sh   # …and now REFUSES when the mutation changed nothing at all
```
Fourth one, added 24 Aug. The three gates above are all about the SEARCH string — is it there, is it
unique, is the tree green. This is about the RESULT, and it closes the case they all miss: a mutation
that is found, is unique, applies cleanly **and changes nothing**, because `old` and `new` are the same
text. The suite then passes for the honest reason that the code is untouched, and mutate.sh announces
**"❌ SURVIVED — the assertion is DEAD"**, which is a false accusation against a perfectly good test —
the exact inverse of the failure the other gates prevent, and it costs you a rewrite of working code.
The cause is worth naming because nothing looks wrong at the call site: `js/compositor.js` builds a
cache key with **NUL separators**, the strings were passed as `"$(cat file)"`, and **command
substitution truncates at the first NUL byte**. Both arguments became the same harmless prefix. The gate
compares the file with its own backup, so it catches that and every other silent no-op. It runs before
the suite, so a mistake costs a second rather than four minutes.

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

**And since 26 Aug you cannot get this wrong quietly: `ship.sh` refuses a release that closes an item
while a lower-numbered workable one is still open** (`next_up` in `tools/_classify.py`, self-tested).
Reading `next.sh` was never the failing step — obeying it was.

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

## ⚠️ USE CLAUDE DESIGN FOR EVERY DESIGN REQUEST — his standing instruction

His words, 24 Aug: *"Can you use claude design for every future design request? and make sure this
request isnt forgotten?"*

The second half is the operative one, and by his own rule the answer is never a note — so it is written
in the three places that actually get read: here, `REQUESTS.md` #545, and the cross-session memory.

**What this means in practice, and the honest catch.** The `DesignSync` tool syncs a **component
library** to a design-system project on claude.ai. FreeMotion has no component library — vanilla
HTML/CSS/JS, no build step — so until a design-system project exists there is nothing to sync, and
invoking it would be ceremony rather than work. **The part he actually got value from on #543 is:
DRAW OPTIONS AND SHOW HIM A PICTURE BEFORE ANYTHING SHIPS.** Never ship an icon or a visual change
he has not seen.

So, for any design request:
1. **Draw real options and render them** — big AND at the size they ship at (24px for icons; a 24px
   icon that only reads at 64px is the trap #432 hit twice). Send him the picture.
2. **Let him pick.** He has said it plainly: *"I just want options. Yu can just say recommended next
   to the best option."*
3. **Push the result to the design-system project once one exists** — see #545, which holds the one
   decision needed to make that real.

## ⚠️ Standing reminder — raise this before ANY public release

**The UI is modelled on Alight Motion and must be made visually our own before publishing.**
See [BEFORE-PUBLISHING.md](BEFORE-PUBLISHING.md) for what was copied and what "done" means.

Trigger it whenever Ezra talks about publishing, launching, releasing, the App Store, a public
link, a demo video, or a tutorial series. Don't silently start the re-design — say the note
exists, what's outstanding, and let him decide when. It's deliberately not done yet: copying AM
was the fast way to build, and the app should be worth publishing before we spend time on identity.

Also: when adding a NEW screen or panel that's based on an Alight Motion screenshot, add it to the
list in BEFORE-PUBLISHING.md as you go, so the list stays honest.
