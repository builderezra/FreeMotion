# Where things stand — written before a chat compaction (14 Aug 2026)

**Live: v7.37. Working tree clean, HEAD == ssh/main (d931994). Nothing half-finished, suite 279/279.**

[REQUESTS.md](REQUESTS.md) is the real list and is fully up to date. This file is the short version
plus the things that are easy to get wrong.

---

## The rules that are in force (he has had to repeat these)

1. **OLDEST FIRST.** *"Remember I want the oldest things in the list done first, not what I just told
   you, make sure you figure out a way to remember if you keep forgetting."* Only an explicit "do this
   now" or a broken build jumps the queue.
2. **Every request goes into REQUESTS.md immediately**, at the bottom, before starting work on it.
   Never deleted, never quietly dropped. Anything not being done stays Open with a **Held** note.
3. **If an old item is blocked on a decision from him, say so and move to the next-oldest.** Blocked
   is not done.
4. *"dont stop to ask me questions, ask but keep going and re ask next time i say something."*
5. *"Slow the fuck down and make sure everything you're doing is good."*
6. Multi-agent is allowed, **read-only agents for investigation, one writer (me) for edits**, suite
   green between each. And: never sit waiting on an agent that may never finish — bounded polls only.
7. Not allowed, unchanged: accepting a pasted personal access token or any credential from him.

---

## Next, in queue order

1. **#113 — the Filters section.** Big. Already planned in [FILTERS-DESIGN.md](FILTERS-DESIGN.md);
   read that before touching code. The two decisions already made: a filter is **ONE normal effect
   that renders its children into its own plate** (not a nested list that gets flattened — flattening
   sends 24 compositor kernels into infinite recursion and hangs the tab), and strength is a
   **cross-fade between the filtered and unfiltered plate**, never a scaling of child parameters.
2. **#114 — music note shape.** *Blocked.* Doesn't reproduce plain; needs one line from him about
   whether it was rotated, scaled, or had an effect on it.
3. **#115 — drag a clip to the edge auto-scrolls the timeline.** Backed out once; the diagnosis from
   that attempt is written into its REQUESTS.md entry.

Then #125/#128/#129/#130 (lag and open-jank, partly blocked), #141 parts 3–4, then #147 onward.

## Waiting on him, so don't re-open them cold

- **#206 shape edit points — HELD.** *"I know if you just go and do that urself ur gonna ruin every
  shape and make it look shit. So wait for me."* Do not start it.
- #31b (does he want a camera motion-blur toggle), #93(a) (what he was doing when wiggle "stopped"),
  #98(a)(b) (needs a photo from his device), #195 (how far the gain stage should go), #114 as above.

## The one I'd jump the queue for if he says go

**#215 — an export came out with NO AUDIO.** I've told him I rate it the most serious open item and
offered to take it out of order. He hasn't said yes yet, so it is still sitting at its place in the
queue with #216 (audio-only export) next to it.

---

## Things that cost hours before, so they're written down

- **The test suite runs on port 8777 and only 8777.** `tests/_cdp.py --port` picks the SERVER, and
  there is only one. Passing 8779/8781/8783 looks exactly like a hang.
- **Assert every replacement actually applied.** A silent no-op edit once cost an hour of debugging
  code that was never in the file.
- **Mutation-check every test.** Five tests have passed against their own mutations in this project.
  If breaking the fix doesn't turn the test red, the test is measuring the wrong thing.
- **Version bumps fail silently** — the label is a find-and-replace. The suite now guards it by
  comparing `index.html`'s label to POLISH-LOG's newest entry.
- **Screenshots must be taken below 700px** or the phone rules don't apply.
- Push with `git push ssh main`, then verify `git rev-parse HEAD` == `git rev-parse ssh/main`.
  The `origin` remote is HTTPS with no stored credentials and fails.

## Housekeeping

`.claude/worktrees/` still holds ~110 leftover repo copies (~1.1 GB) from old workflow runs. They
each report a few changed files, so I haven't deleted them unilaterally. Worth clearing when he says.
