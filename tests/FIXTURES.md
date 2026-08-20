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
- `_vidoutline.html` — the Outline & Shadows card on a VIDEO layer (queue 386).
- `_shadowstyle.html` — the shadow Soft/Drop row.
- `_emptyplus.html` — the empty-project timeline, used for the one-surface work (queue 424).

Older probes (`_boltshot`, `_fxbshot`, `_setshot`, `_sheetshot`, `_swdrag`, `_rowgaps`, `_tabico`,
`_insphdr`, `_presetup`, `_blendshot`, `_dragfar`, `_fxnoop`, `_leavecost`, `_grouphdr`, `_sheeth`)
predate this index; each is named for the screen it measures and is quoted from the REQUESTS.md entry
that produced it — search the entry number if you need one.
