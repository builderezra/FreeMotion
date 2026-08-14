# Where things stand — written before a chat compaction (15 Aug 2026, updated at v7.47)

**Live: v7.47. Working tree clean, HEAD == ssh/main. Suite 327/327. Nothing half-finished.**

[REQUESTS.md](REQUESTS.md) is the real list and is up to date. This file is the short version plus
the things that are easy to get wrong.

---

## The rules that are in force (he has had to repeat these)

1. **OLDEST FIRST.** *"Remember I want the oldest things in the list done first, not what I just told
   you."* Only an explicit "do this now" or a broken build jumps the queue.
2. **Every request goes into REQUESTS.md immediately**, at the bottom, before starting work on it.
   Never deleted. Anything not being done stays Open with a **Held** note.
3. **If an old item is blocked on a decision from him, say so and move to the next-oldest.**
4. *"dont stop to ask me questions, ask but keep going and re ask next time i say something."*
5. *"Slow the fuck down and make sure everything you're doing is good."*
6. **Keep-working loops must be driven by a recurring `CronCreate` job**, never `ScheduleWakeup`
   alone — a one-shot chain died silently for 1h48m on 14 Aug and he noticed before I did. The cron
   is session-only and expires after 7 days, so **a fresh session has to re-arm it**.
7. Not allowed, unchanged: accepting a pasted personal access token or any credential from him.

---

## #113 (filters) — DONE except the tile previews

Shipped v7.38 → v7.45. The plan and every correction to it are in [FILTERS-DESIGN.md](FILTERS-DESIGN.md).

| ver | what |
|---|---|
| v7.38 | ten type-keyed render tables cut off from Object.prototype; `sanitizeEffects` on import **and** the autosave load; keyframe tangents/eases stopped being dropped on reload |
| v7.39 | `FM.eachFx` — one walker, seven sites routed through it, three address grammars sharing one parser |
| v7.40 | the container renders; Strength is a true cross-fade (`lighter`, not source-over) with exact ends |
| v7.41 | the expandable row, children scoped to their own stack descriptor |
| v7.42 | `supportsFilter` / `fitToLayer` — a filter is judged by what is inside it |
| v7.43 | "always first" on the nine effects whose position cannot matter |
| v7.44 | the library: 16 looks in 4 sections, `js/filters.js`, picker on "+ Add Filter" |
| v7.45 | the Colouring shortcut |
| v7.46 | **step 5** — Filters is a third subsection beside Effects and Audio, a sectioned browse list |
| v7.47 | (queue 96) the last two "pressed play, nothing happened" paths |

### What is left of #113: the tile previews only (REQUESTS #219)

The subsection itself shipped in v7.46 — three pills, a sectioned list, each row naming the effects the
look is built from. What is missing is a PICTURE on each row, and for choosing a look a picture beats a
sentence, so expect him to want it.

**The scouting that matters, so it is not redone:**

- **`mountPreset` will NOT take a filter.**
  `FM.fxThumbs.mountPreset(cv, preset, layer)` looks promising but `preset.fx` is a **single effect
  TYPE string** (`js/fx-thumbs.js:908` does `FM.fxRegistry.get(preset.fx)`), not an effect list. The
  whole thumbnail system is built around one effect type — which is also why FILTERS-DESIGN.md warned
  that ~60 per-effect tuner callbacks assume `hero.effects[0]` **is** the effect.
  So a filter needs its **own** recipe branch in `fx-thumbs.js`: key it `f:<filterId>` and have
  `generate()` build `hero.effects = [FM.filters.makeInstance(id)]`. No tuners needed — the authored
  params *are* the look, which is the one way this is easier than an effect thumbnail.
- A filter thumbnail should be **static**, not animated: none of the 16 is time-varying except the
  grain/noise ingredients, and paying an animated tile for 16 looks on a phone is not worth it.

**When you build it:** `filtersSection()` in `js/inspector.js` is the list to convert to tiles. Keep the
"what it is made of" line — it is the thing a picture cannot tell you, and the whole promise of a filter
here is that it is not a black box.

## The next item up: #47

**Export must not lose the render on a crash, and should get off the main thread.** Not blocked on him —
just big, which is why it was not started at the tail of a long session. Its two halves are very
different sizes:

- **crash-resume** — and REQUESTS' "chunk-replay resume is proven" is WRONG, corrected there on 15 Aug:
  there is no such code anywhere in the repo, the staged diffs or the history. Do not go looking.
  The real obstacle is that `createMp4Sink` assembles the file in PAGE MEMORY and mp4-muxer keeps its
  track/sample tables in memory with no way to rehydrate them — so a half-written file cannot be
  reopened and muxed into, and a VideoEncoder cannot resume mid-GOP. The achievable shape is
  **segmented export**: N-second segments, each finalised into IDB as it completes, joined at the end.
  A crash then costs one segment. That is a bigger design than the old line promised — agree it with
  him before building.
- **off the main thread** — a worker, which means the whole compositor (9,600 lines, DOM-canvas
  throughout) on OffscreenCanvas. Much larger.

**Do the first half on its own.** It sits right next to **#215 (an export came out with NO AUDIO)**,
which he has been asked twice about jumping the queue.

### Two things he owes an answer on

- **The 16 filters are my taste, not his.** A few lines each in `js/filters.js`. He has been asked
  twice which are wrong / missing / whether 16 is the right number. Do not add 30 more before he says.
- Whether **#215 (an export came out with NO AUDIO)** jumps the queue. I rate it the most serious open
  item and have offered twice; it is still sitting at its queue position.

Everything else in the oldest-first queue ahead of #47 is genuinely blocked on him: #31b (does he want a
camera motion-blur toggle), #93(a) (what he was doing when wiggle "stopped"), #95's timeline half (needs
the numbers from HIS device), #98 (needs a photo), #114 (was the music note rotated/scaled), #206 (HELD,
he is doing it with me). Verified, not assumed — #95 and #96 both still have real open halves, so do not
tick them.

---

## Things that cost hours, so they are written down

- **The suite runs on port 8777 and only 8777.** `tests/_cdp.py --port` picks the SERVER and there is
  only one. `.claude/launch.json` says 8791 — `preview_start` by name will fail with port-in-use;
  use `preview_start {url: "http://localhost:8777/index.html"}`.
- **Mutation-check every fix.** Six tests in this project have passed against their own mutations.
  Two more were caught this session: a duplicate-remap test that left the referenced layer out of the
  duplicate (no-op either way), and an ordering test whose subject was a solid rectangle (too uniform
  to reveal ordering at all — the *control* is what caught it). **Always assert the control first.**
- **Not every green mutant is a dead test.** Two came back green this session and were *equivalent*
  mutants — the code was genuinely redundant. Check which it is before "fixing" the test.
- **Never move code with a script that walks the source to find its own boundaries.** One did that
  here, matched the wrong block, deleted three lines of row-building and turned five tests red. Revert
  the file to HEAD and redo it as one targeted edit.
- **The phone screenshot catches what the DOM cannot.** `.fx-row.fx-open .fx-disc` is a DESCENDANT
  selector, so every closed effect inside an open filter drew the OPEN chevron. `aria-expanded` was
  correct, the bodies were absent, every assertion was green. Only the 380px shot showed it.
- Version bumps are a find-and-replace that fails silently; the suite guards the label against
  POLISH-LOG's newest entry.
- Push with `git push ssh main`, then verify `git rev-parse HEAD` == `git rev-parse ssh/main`.

## Housekeeping

`.claude/worktrees/` still holds ~110 leftover repo copies (~1.1 GB) from old workflow runs. They each
report a few changed files, so I have not deleted them unilaterally. Worth clearing when he says.
