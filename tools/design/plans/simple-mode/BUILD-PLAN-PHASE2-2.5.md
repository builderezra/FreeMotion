# Simple mode: release 2.5 written in full ("drags")

**For the BUILDER chat, after 2.4 has shipped.** This is the code `BUILD-PLAN-PHASE2.md` §7 described in one paragraph and did not write.
Written and run on top of **2.4 (`hunt/simple-2.4`)**. Code and tests: branch **`hunt/simple-2.5`** (a stack on `hunt/simple-2.4`). This file:
`plans/simple-2.5`. Nothing is merged and nothing touches `main`. The hunks are `scripts-2.5/2.5-code.patch` (408 lines) and
`scripts-2.5/2.5-tests.patch` (262 lines); both apply with `git apply` on the 2.4 tip. Not bumped: `index.html`'s version, the `?v=` busters
(`js/app.js`, `js/simple-timeline.js`, `js/spine-edit.js`, `js/spine-words.js`, `styles.css`) and POLISH-LOG are the builder's.
POLISH-LOG template: `- vX.YY — queue 980 (partial) — Simple: hold and drag a clip to reorder it, drag it up to make it an overlay, drag an overlay down
into the clip row, drag an overlay, text or sound in time; the selected clip has two trim grips with a length readout; pinch to zoom. Full is unchanged.`

## 1. What he sees and holds

- **A mouse** drags at once (more than 4 px), as in Full. **A finger or pen** must HOLD 350 ms; a swipe before that scrolls as before.
- **Reorder:** the held clip follows the finger, the neighbours part live, a label says *"B moved to 2 of 3"*; nothing is written until he lets go, then one step
  (`FM.spine.cmd.moveTo`, which is `planReorder` with a target index). A drag that ends in its own slot writes nothing.
- **Lift:** finger 24 px or more above the clip row's top edge for 150 ms: the clips after it close up in the preview and the label says *Make overlay*;
  release = `cmd.lift`. **Drop:** an overlay dragged down onto the row for 150 ms says *Put in the clip row*; release = `cmd.intoRow`.
- **In time:** a text, overlay or sound dragged sideways moves (`cmd.moveItem`), snapping within 7 px to the playhead, 0, markers, clip edges and other items' edges
  (its start or its end), a label shows the start.
- **Grips:** the selected main clip gets a grip at each edge (13 px cap outside, 24 px hit). Dragging one shows the new length (*"3.0 s"*) and the clip box
  stretches live; release = `cmd.trimHead / trimTail`, which ripple. Not drawn when the gate is shut, and not on a clip narrower than 24 px (use the tray's Length).
- **Edge auto-scroll** while any drag is held near the strip's edge (a copy of Full's loop with its four brakes); the playhead follows only on release.
- **Pinch:** two fingers zoom the timeline exactly as ⌘/Ctrl-wheel does (`FM.timeline.zoomBy`).
- **The gate:** a Viewer, a room with a friend who can edit, a newer project, a held clip or a missing clip arms nothing and the one-line reason shows (the same words as the
  buttons). A locked clip does NOT stop the drag: the runner asks at the release with its own **Do it anyway** (one step).
- **A friend deleting the held clip** ends the drag (boxes glide back, nothing written) through `FM.cancelGesturesOn`.

## 2. The pieces (all in the patch)

| file | what |
|---|---|
| `js/spine-edit.js` (before the 2.3 `Object.assign(S.cmd, …)`) | `S.canArrange(id)` (null or `view` / `comment` / `outbox` / `newer` / `offline` / `live` / `gone` / `locked` / `busy`), `S.explain(kind, id)`, `S.moveTargetFor(R, id, tc)` (pure: the index `planReorder` takes, from the dragged clip's centre), `S.planMoveItem`, `S.cmd.moveTo`, `S.cmd.moveItem` |
| `js/simple-timeline.js` | the gesture engine: `onItemDown` / `arm` / `onMove` / `render` / `tick` (the edge loop) / `onUp` / `commit` / `abort`, `onGripDown` / `renderTrim`, `drawGrips`, the pinch tracker, `snapStart`, the label; the `rebuild()` guard (no redraw under a live drag, a long-stale one recovers); the scroll handler ignores a drag's scrolls; `FM.simpleTimeline.gesture()`, `abortGestures`, and the seams `_g`, `_tick` |
| `js/app.js` | one line in `FM.cancelGesturesOn`, after Full's `abortGestures` (inert in Full: no gesture is ever live there) |
| `js/spine-words.js` | `itemMoved` |
| `styles.css` | `.sm-grip` (+ caps), `.sm-ghost`, `.sm-dragtip`, `.sm-gliding`, `body.sm-dragging` |

## 3. Tests (11, `simple P2.5 · S3 …`, all `{ item: '980' }`)

**They use REAL input**: `realInput924` turns a step list into trusted `Input.dispatchMouseEvent` calls through `tests/_cdp.py` (capture, hit-testing and the browser's own click
logic included), and `smDragEnv` narrows run.html's 900 px frame to the viewport at `--width 380` (a mouse at x > 380 never reaches a page otherwise).

| test | runs here? | proves |
|---|---|---|
| real mouse reorder | yes | live gesture, neighbour parted (`translateX(-…)`), doc and history untouched until release, ABC → BAC in ONE step, no selection, Undo |
| wobble in the slot + plain click | yes | writes nothing; the click after a drag does not select; a click still selects |
| lift, then drop | yes | after 150 ms above the row: mode `lift`, label names the command, the clips after it close up, one step; the overlay back down: mode `drop`, one step |
| text in time + snap | yes | raw start 3.05 s lands on the playhead at 3; one step; no clip moved |
| the arm gate | yes | a Viewer's drag never starts and a line says why; a gate that shuts mid-drag: the release does not even call the command; `cancelGesturesOn` ends the drag with no write |
| grips | yes | two grips, ≥ 24 px hit, 13 px cap outside the edges; tail drag −1 s shows *"1.0 s"*, writes nothing before release, then B is 1 s, C slides, one step; a Viewer sees none |
| edge scroll | yes | holding at the right edge scrolls, brake 2 stops it past the frame cap, the strip never grows past its limit, the clip lands far away in one step, the playhead adopts the time on release |
| Full is untouched | yes | no gesture live, hooks return false, no drag chrome in Full |
| pure parts | yes | `moveTargetFor` 1,1,2,3,3; `canArrange` names the reason |
| **FINGER: 350 ms hold, swipe before it, no selection after** | **NOT RUN HERE** | reports `NOT RUN HERE: needs real touch emulation` (never a pass); runs on the laptop's finger pass |
| **FINGER: two-finger pinch** | **NOT RUN HERE** | same |

## 4. What was run (Measured, Chromium 141, this container)

| run | result |
|---|---|
| the 11 on the 2.4 tip (red before), 1280 | 7 red by what they SEE (no live gesture; the neighbour did not part; 0 grips; no scroll; …); **2 pass on the old tree because they are controls** (the in-slot wobble / click, and Full-is-untouched); 2 NOT RUN HERE |
| the 11 on 2.5, 1280 and 380 | **9/9 pass, 2 NOT RUN HERE** at both |
| `?only=simple` (123 tests, all releases), 1280 | **121/123 + 2 NOT RUN HERE**, no red |
| `?only=simple`, 380 | **121/123 + 2 NOT RUN HERE**, no red |
| mutations (`scripts-2.5/s3_mut.sh`) | **7 of 8 caught**: N1 snap off, N2 arm gate off, N3 release gate off (caught only after I added "the release does not call the command": the first version survived because the runner refuses the same way), N4 brake 2 off, N5 grips drawn for a Viewer, N7 abort hook off, N8 target rule. **N6 (swallow the click after a drag) SURVIVES on a mouse**: Chromium sends a captured mouse drag's click to the row, not the clip, so nothing is selected with or without the swallow. Only a finger proves it, so the finger test asserts it (NOT RUN here) |

## 5. NOT RUN here, and not built

- **Not run (laptop's finger pass):** the 350 ms hold with a real finger, a swipe before it, `touchmove` `preventDefault` while armed (iOS needs it non-passive: it is registered that way, unproven), two-finger pinch, the click a finger's release makes. Also Safari, an iPhone, 375×553 and 440×956, and the **Full-unchanged lock** (not runnable in this container).
- **Brakes 3 and 4 of the edge copy** are not proven by a test (brake 3 needs a drag past the project's far limit; brake 4 a reorder pinned at the last slot while the finger stays right): they are a line-for-line copy of Full's, whose own tests cover Full's. Brake 1 and 2 are proven.
- **Grips on overlays, texts and sounds are not built.** No Simple trim command exists for a non-main item in 2.2 to 2.4 (`planTrimTail` is main-clip only), and the plan says grips reuse Full's selected-clip pattern. The grip readout does not clamp to the media's length; the commit's planner refuses with its own line.
- **Presence:** `FM.simpleTimeline.gesture()` is the local feed only; `act: 'arrange'` is Phase 4.
- **The compact reorder view** (every clip a thumbnail while a hold is armed) is drawn as an option in the plan, not built.

## 6. Ambiguous points (decide before building, or accept my call)

1. **Locked clips arm.** DESIGN §3.8 says a hold on a locked clip shows the reason with Do it anyway. I let the drag run and the runner asks at the release (its existing Do it anyway re-runs the same command, one step). Otherwise the hold would fire with the finger still down and "Do it anyway" would have nothing to continue.
2. **Stale recovery at 4 s.** A rebuild that arrives while a drag has had no event for 4 s puts the boxes back; sooner it waits. Full's number is not in the plan; I did not copy it.
3. **Lift is measured from the clip row's top edge** (24 px above, 150 ms), and **drop** from 6 px inside the row (150 ms). The plan gives only the lift side.
4. **Reorder label:** *"B moved to 2 of 3"* reuses the command's own line; there is no separate drag wording.
5. **Mouse on a PC arms at 4 px, a finger's slop is 8 px**; Full's values are not in the plan.
6. **A drag selects nothing.** A tap still selects (Guess: Full may select on drag-start; I did not check, and selecting would rebuild the strip under the drag).
7. **`touch-action`:** `#sm-scroll` keeps `pan-x` (already there) so a swipe scrolls; the armed drag blocks the page with a non-passive `touchmove`. A hold that begins after the browser has started panning cannot be captured: the finger test is the check.
