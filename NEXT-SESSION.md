# Where things stand — written before a chat compaction (15 Aug 2026)

**Live: v7.45. Working tree clean, HEAD == ssh/main. Suite 322/322. Nothing half-finished.**

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

## #113 (filters) — six releases in, ONE piece left

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

### What is left: step 5, the Filters TAB

He asked for *"a third subsection for filters. It'll work the same as the others"* — i.e. a third pill
next to **Effects | Audio**, browsable, with thumbnails. The picker menu shipped in v7.44 is a
**stopgap**, not that.

**The scouting that matters, so it is not redone:**

- The toggle is `fxModeToggle(layer, current, onPick)` at `js/inspector.js:1952`, exported as
  `FM.fxModeToggle` and built identically by `fx-browser.js` and `audio-fx-browser.js`. A third entry
  goes in the array literal there — it needs its own `ok` gate and its own disabled wording.
- **The thumbnails are the expensive half, and `mountPreset` will NOT take a filter.**
  `FM.fxThumbs.mountPreset(cv, preset, layer)` looks promising but `preset.fx` is a **single effect
  TYPE string** (`js/fx-thumbs.js:908` does `FM.fxRegistry.get(preset.fx)`), not an effect list. The
  whole thumbnail system is built around one effect type — which is also why FILTERS-DESIGN.md warned
  that ~60 per-effect tuner callbacks assume `hero.effects[0]` **is** the effect.
  So a filter needs its **own** recipe branch in `fx-thumbs.js`: key it `f:<filterId>` and have
  `generate()` build `hero.effects = [FM.filters.makeInstance(id)]`. No tuners needed — the authored
  params *are* the look, which is the one way this is easier than an effect thumbnail.
- A filter thumbnail should be **static**, not animated: none of the 16 is time-varying except the
  grain/noise ingredients, and paying an animated tile for 16 looks on a phone is not worth it.

**Do it in this order:** the third pill + a list view (name, description, what is inside) FIRST and
ship it — that is already better than the picker — then thumbnails as a second release.

### Two things he owes an answer on

- **The 16 filters are my taste, not his.** A few lines each in `js/filters.js`. He has been asked
  twice which are wrong / missing / whether 16 is the right number. Do not add 30 more before he says.
- Whether **#215 (an export came out with NO AUDIO)** jumps the queue. I rate it the most serious open
  item and have offered twice; it is still sitting at its queue position.

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
