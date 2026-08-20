# Fixtures — what each probe measures, and which harness it needs

`tests/` holds two kinds of file. `tests.js` is the SUITE (`python3 tests/_cdp.py --port 8777`, 3–4
minutes, gates every commit). Everything named `_*.html` is a **dev probe**: a one-page measurement you
run by hand when you need a number rather than a pass/fail. Probes are not run by the suite and nothing
breaks if one rots — but a probe you cannot identify is a probe nobody re-uses, which is why this exists.

## ⚠️ Pick the right harness first — this has cost real hours

| you want | use | why |
|---|---|---|
| a picture of a STATIC screen | `tests/_shot.sh out.png /tests/_x.html W H` | fast, dpr 2, and `--virtual-time-budget` lets the home intro finish |
| a picture of anything that SLIDES, fades or flings | `python3 tests/_shotlive.py /tests/_x.html out.png W H` | virtual time never completes a CSS transition — `_shot.sh` photographs the Add sheet still parked off-screen, every time |
| a NUMBER out of the page | drive `tests/_cdp.py`'s launcher and `cdp.eval(...)` | real clock, real rAF; see `_shotlive.py` for the pattern |

Timing measurements must use the real-clock path. Under `--virtual-time-budget` rAF is throttled and
`performance.now()` does not advance the way the app expects, so anything about playback, momentum or a
transition is meaningless there.

## Probes added 19–20 Aug, by what they answer

**Playback and media**
- `_playcost.html` — per-frame DOM cost of PLAY vs SCRUB, with frame-gap percentiles. Run it through the
  real-clock path with `Emulation.setCPUThrottlingRate` to get phone-like numbers (queue 387).
- `_vidplay.html` — **makes a real video** (canvas → captureStream → MediaRecorder), imports it through
  `FM.loadVideoFile`/`FM.addMediaLayer`, plays it, and reports gaps, drops and whether the element's own
  clock stalls or jumps. Every earlier round of the phone-lag investigation had no video to play.
- `_phopen.html` — is `#tl-centerline` in the DOM and correctly placed across create / open / switch?
  (Answered the oldest open item's own diagnostic question: yes, always; only the empty state hides it.)
- `_phhead.html` — the follow-on, and the one that found it: does the playhead come BACK when the first
  clip arrives? Walks empty → add → deselect → re-select and names the state each time. It read
  `layers 1 / .tl-empty-start true / display none` at step 2, which is the whole of v10.70.
  `_phheadshot.html` leaves the app in that same post-add state for a picture.

- `_leavecost.html` — what going home releases. Answered queue 385's own question with "nothing", but it
  uses SHAPE layers, which have no media, so it can measure the before and never the after.
- `_leaverelease.html` — the after, with a REAL imported video: records resident → on the home screen →
  back again, plus the card thumbnail's ink and whether a project file saved from home still carries its
  media. The three numbers that matter are on three lines.

- `_expfmt.html` — the export dialog at 380px with a format pre-chosen. Built for queue 395's M4A option;
  it caught the first label ("Audio only (M4A — smaller)") truncating in the select at that width.

**Document integrity** — these back the suite's invariant sweeps
- `_roundtrip.html` — a feature-rich project through save → load, diffed field by field.
- `_dupsweep.html` / `_pastesweep.html` — duplicate and copy→paste fidelity, plus deep-copy independence.
- `_undosweep.html` — twelve kinds of edit, each undone and compared as a whole document.
- `_kfland.html` — does every ease land exactly on its keyframe value?
- `_zerohunt.html` — sweeps every effect parameter where 0 is legal, looking for a swallowed zero.

**Layout and UI**
- `_grouptwo.html` — the multi-select sheet with four layers selected (queue 376's two buttons).
- `_multihdr.html` / `_groupgap.html` — the multi-select header's real spare width, and whether the old
  group drop-down had the "dreadful gap" (it measured 0px unexplained).
- `_tabshot.html` / `_tabcheck.html` / `_tabtap.html` — the phone Add sheet: shoot one tab, dump what
  every tab renders, or tap each tile and see what happens. **Scope every query to `#add-sheet`**: there
  are TWO add-menu instances in the DOM and a document-wide selector drives the parked PC one.
- `_plusstiff.html` — does the add-row `+` hold still while the timeline scrolls? (queue 429)
- `_scrubstart.html` — a drag that starts ON a clip against the identical drag on bare lane: how far the
  playhead travels, which pixel it first answers at, whether it glides, and what each move costs (queue
  387 clause 1). **Read its header before writing any gesture probe** — it lists the three ways this
  measurement lied first: a stale element ref across a rebuild, coordinates that move when the timeline
  scrolls, and the home overlay swallowing the press. Each produced a confident wrong answer.
- `_soloroom.html` — the phone solo view: the gap between the clip's row and its docked options, and
  whether a grab latches that sheet shut (queue 433). `_soloshot.html` is the same state, for a picture.
- `_shapehues.html` — what the shape grid's colours actually DO: how many cards, how many distinct
  tints, how often one repeats, and the saturation/lightness spread across the palette (queue 434). It is
  the probe that turned "ugly and repetitive" into two numbers — 67 cards off 16 tints, and 85%–85%
  saturation. `_shapeshot.html` is the same tab, for a picture.
- `_people.html` — the person/woman pictograms rendered at 24/32/51/96/220px plus an outline, which is
  the ONLY way the shoulder notch in queue 435 was visible; row widths cannot see it.
  `_pictolegible.html` is the numeric half: neck gap, leg gap, open armpits and where each figure is
  widest, at every size — it is what found the pair measuring identically at 24px.
- `_switchlive.html` — does `#btn-addside` move while you drag, for BOTH drags (queue 438)? **Read its
  header before writing any drag probe:** the layer reorder binds its pointermove to the drag HANDLE and
  relies on pointer capture, the add row's grip binds to WINDOW, and dispatching at the wrong one makes
  the gesture silently not happen.
- `_cuegrip.html` / `_cuegripshot.html` — the caption cue's trim grips: whether the live cue's arrows are
  actually painted, and whether a short cue keeps a middle to grab (queue 441). Note that
  `FM.addCaptionLayer()` jumps straight into the TEXT EDITOR — a fixture about the timeline chip has to
  call `FM.textEdit.stop()` first, or it photographs the wrong screen.
- `_headgap.html` — the track head measured WITH a group in the project and without, so the chevron
  column's cost can be told apart from plain padding (queue 442).
- `_adddrop.html` — drags one layer to every slot around the add row and reports, for each, where the
  gap OPENED against where the layer LANDED (queue 443). The landing order alone cannot see that bug: the
  collapse of two slots onto one target is unavoidable, and what was wrong was the preview.
- `_vidoutline.html` — the Outline & Shadows card on a VIDEO layer (queue 386).
- `_shadowstyle.html` — the shadow Soft/Drop row.
- `_emptyplus.html` — the empty-project timeline, used for the one-surface work (queue 424).

Older probes (`_boltshot`, `_fxbshot`, `_setshot`, `_sheetshot`, `_swdrag`, `_rowgaps`, `_tabico`,
`_insphdr`, `_presetup`, `_blendshot`, `_dragfar`, `_fxnoop`, `_leavecost`, `_grouphdr`, `_sheeth`)
predate this index; each is named for the screen it measures and is quoted from the REQUESTS.md entry
that produced it — search the entry number if you need one.
