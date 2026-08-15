# Where things stand — written before a chat compaction (15 Aug 2026, updated at v7.72)

**Live: v7.72. Suite 355/355. Working tree clean, HEAD == ssh/main. Nothing half-finished.**

**THE KEEP-WORKING CRON IS OFF.** He asked to pause and compact on 15 Aug, so it was deleted rather
than left to fire into a compacted session. **A fresh session has to re-arm it** — see rule 6.

## What shipped since v7.52 (this run)

| ver | what |
|---|---|
| v7.53–v7.55 | **#47 crash-resume.** Encoded chunks to IndexedDB, replayed into a fresh muxer, so an export killed by a crash picks up at the seam. v7.54 fixed the boot sweep eating the saved chunks (it worked in-page and would never once have worked for him). v7.55 streamed the replay so it stops holding the whole render in memory, and warms temporal effects at the seam. |
| v7.56 | **#115** drag a clip to the screen edge and the timeline follows — after three previous back-outs |
| v7.57–v7.59 | **#125** the app could not see its own lag: the quality ladder watched only main-thread JS time, blind to GPU filters and video decode. Plus the seek guard, the `seeked` repaints, and the hold-frame copy (9.2ms → 2.3ms) |
| v7.60–v7.61 | **#128** opening AND leaving a project answer the tap immediately (113ms and 81ms of dead air removed) |
| v7.62 | **#129** a clip that never produces a frame now says why |
| v7.63–v7.64 | **#141** the export dialog tidied, and an "Export ready" card in front of the OS save sheet |
| v7.65 | **#147** the desktop text editor stops taking 169px of canvas |
| v7.66 | **#148** clip edges fade instead of clicking |
| v7.67–v7.68 | **#150** speech detection: choose what it scans, and a Captions tile so it is one tap away |
| v7.69 | **#151** caption effects can belong to one cue |
| v7.70 | **#155** was already built — verified and guarded against drift |
| v7.71 | **#157** the film grain moved off the cards onto the background (an experiment — wants his verdict) |
| v7.72 | **#163** new drawing icons, 3/3 judge sign-off after two rejections |

## THE BOTTLENECK: six things parked on him

This is now most of what is left. None of them need much from him — a word each.

| # | what is needed |
|---|---|
| **215** | **The most serious open item.** An export came out with no audio. Asked FIVE times whether it jumps the queue; never answered. The app's output being silently wrong after a long render. |
| **47** | The remaining half — the exporter off the main thread. Days of compositor work on OffscreenCanvas. His call whether it jumps. |
| **148** | One line: does the audio pop at a CLIP EDGE or through the MIDDLE of one long clip? Edge → v7.66 has it. Mid-clip → it is the browser's decoder under our load, and the answer is #125/#69. |
| **152** | Keep or delete speech detection. The case for keeping got stronger with v7.67's source picker, which fixes the exact case it failed on. |
| **157** | The grain experiment is live: rougher, subtler, or put it back? One number (`--hm-grain-alpha`, currently .05). |
| **160** | The person/woman icons — four options (a)(b)(c)(d) in the entry. Two attempts already rejected by agents. My read is (c). |

Also still owed: which of the 16 filters are wrong/missing (asked twice).

## New tooling built this run — do not rebuild it

- `tests/_fmdiff.py` — capture and DIFF the full pass/fail list between two suite runs. Finds the FIRST
  test that changed rather than guessing from the reds. This is what finally cracked #115.
- `tests/_only.html?items=a,b,c` (or `?from=N&to=M`) — run any subset. Answers "does this fail on its
  own, or only after something earlier ran?" A mutation check drops from 90s to ~5s.
- `tests/_iconsheet.html` + `tests/_shot.sh` — renders icon candidates at 24/48/96 on the real cell
  colour and screenshots them to a PNG that agents can Read and judge. **#160 needs exactly this.**
- Probes: `_xresume.html` (real export killed and resumed), `_popjank.html`, `_boot.html`,
  `_pops.html`, `_q125tier.html`, `_q125hold.html`, `_tedock.html`, `_q115b.html`.

## Two flaky tests — #222 and #224

`key/cold-actually-shrinks` (~1 in 5, pre-existing, diagnostics captured) and the microphone one (seen
once). **Two intermittent tests is where a red run stops meaning anything**, which is worse than not
having them. Worth fixing as a pair.

---

## The rules that are in force (he has had to repeat these)

1. **OLDEST ACTIONABLE FIRST** — and the word *actionable* was learned the hard way on 15 Aug.
   *"Remember I want the oldest things in the list done first, not what I just told you."* I read that
   as strict lowest-number order, so #31/#47/#93/#95/#96/#97/#98 — nearly all **blocked waiting on
   him** — kept absorbing every tick with small slices, while **#168**, fully specified and unblocked
   since 13 Aug, sat untouched. He noticed: *"i swear you arent working through the tasks in order,
   like i askied ages ago for the layout change on pc"* — and he was right. A blocked item does not
   hold the queue. Say plainly that it is parked on him, and move to the next one that can actually
   be finished. Only an explicit "do this now" or a broken build jumps ahead of that.
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

## #113 (filters) — FINISHED

Shipped v7.38 → v7.49; the tile previews (#219) landed in v7.49 and closed the entry. The plan and every
correction to it are in [FILTERS-DESIGN.md](FILTERS-DESIGN.md).

## Where to start on #215 when he gives the word

The export mix is built separately from the preview (`buildAudioMix`, js/exporter.js), so it is not the
same code as #96 though it may be the same class of bug. Establish which of muted / mixed-at-zero /
never-decoded it is by exporting a known clip and inspecting the file, not by reading. Check
`layer.muted` — Extract Audio deliberately mutes the original, and a muted original plus a missing twin
produces exactly this.

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
- **A focused runner turns a mutation check from 90s into 5s.** `tests/_xrunit.html` (export-resume) and
  `tests/_q45_probe.html` are the pattern: filter `FMTests.tests` by `item` prefix and run only those.
  Six mutations were checked against v7.53 in about the time one full suite run would have taken.
- **Snapshot a batch when you hand it off, not when the write runs.** The export recorder queued its
  IndexedDB writes as `chain.then(() => write(buf))`, which reads `buf` at execution time — so several
  batches handed over in one turn of the event loop all collapsed into the first write and the rest
  wrote nothing. Everything still worked; the part size just silently stopped being what was asked for.
  A test's CONTROL line caught it, not its subject.
- **The phone screenshot catches what the DOM cannot.** `.fx-row.fx-open .fx-disc` is a DESCENDANT
  selector, so every closed effect inside an open filter drew the OPEN chevron. `aria-expanded` was
  correct, the bodies were absent, every assertion was green. Only the 380px shot showed it.
- **Run the CONTROL first, every time.** Four separate times this run a measurement was meaningless
  until the control ran: the #115 three-test harness (the "clean" tree failed too, so my repro was an
  artefact), the #125 tier probe (the scene was too light to move the ladder at all), the #130 video
  probe (importing the clip resized the comp, so the canvas column was nonsense), and the #151 cue test.
- **A stale entry is a real category.** THREE turned up this run by working the list in order — #37,
  #147's first half, and #155 were all already built. Verify before ticking, but do not assume open
  means undone.
- **My own notes have been wrong twice, confidently.** #47 said crash-resume needed a segmented
  redesign (it did not — muxing is a byte copy). #151 said ~170 read sites made per-cue effects huge (one
  site changed). Re-check a recorded conclusion before inheriting it.
- **Measure before optimising, then measure the optimisation.** A flat 960px cap on the hold-frame copy
  was SLOWER than not shrinking at all (11.9ms vs 9.2ms) because the browser's fast path is exact
  halving. Only the second measurement caught it.
- Version bumps are a find-and-replace that fails silently; the suite guards the label against
  POLISH-LOG's newest entry.
- Push with `git push ssh main`, then verify `git rev-parse HEAD` == `git rev-parse ssh/main`.

## Housekeeping

`.claude/worktrees/` still holds ~110 leftover repo copies (~1.1 GB) from old workflow runs. They each
report a few changed files, so I have not deleted them unilaterally. Worth clearing when he says.
