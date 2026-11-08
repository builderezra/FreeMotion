# Simple Phase 3 · Effect segments — a whole-frame effect over a stretch of a clip (queue 980, refers to #545)

Branch `hunt/sm3-segments`, built ON `ssh/hunt/sm3-look` (7da21cf2, Look on the v17.50 tree) so the two stack. **Nothing was
run**: a release ship was running in the main checkout, so no node, no python, no browser, not even a parse check. Every line
here is from reading; the suite has not seen it.

## What the design asks (and where in tools/design/plans/simple-mode/DESIGN.md)

- §15 Phase 3 row (line 4032): "… Effects segments …". Gate decisions D16 A (icons), D20 A, D14 A, Q5 — all answered.
  **Nothing about segments waits on an open decision** (D3 / D14b / D18 / D22–24 do not touch it; §17 has no segment row).
- What a segment IS: §8.5c (2820–2846) — an adjustment layer holding ONE `ADJ_OK` effect (whole-frame grades only,
  `js/fx-registry.js` ADJ_OK), built by a new `FM.addEffectSegment(effectInst, start, len)` with `effects: [inst]` only
  (`FM.addAdjustmentLayer`'s seeded brightness/saturate grade is never used); item 1 **pick first, create on pick, one history
  step, Cancel writes nothing**; item 2 the project row's Effects makes segments only, at the playhead; item 4 `inst.sm = 1`.
- Where and how long: §4.3 (1599–1606) — at the playhead, `length = min(3 s, host.end − start)`, under `MIN_LEN` it starts on the
  next clip; it is an effect-kind follower of its clip, clamped by every command that shortens the host (tail trim, head trim,
  speed-up, shorter Replace — all already in Phase 2's planners); one dragged past a cut is left alone with a "runs over the next
  clip" hint (Q5, 4219). §3.9 invariant 8 (1232). The kinds table (1875): kind `effect`, tray "Effect segment", follows its clip
  clamped, deleted with its host.
- Where in the stack: §3.6.1 (861–863) "effect → directly above the top-most main clip it overlaps … below every member of F(x)".
- The tray: §8.5 (2703) **Effect segment: Change effect · Strength · Stay put · 🗑 (length by dragging its edges)**; the project
  row (2689) Effects; the D16 A icons `effects`, `change`, `strength` (vis/kit.js 994, 1036–1037, 1119–1122).
- §8.9 naming (1379–1382): a segment is *"the effect"* in lines (FM.spine.itemWord, unchanged).
- The brief's question "cue effects relative to their cue?": no — cue effects are the caption track's (Phase 1 `FM.timedLists`
  plumbing, Phase 4a wire format). A segment is an ordinary layer over a clip stretch and rides its clip like any follower.

## What was built

- **Data and commands** (`js/spine-edit.js`, block `PHASE 3 · EFFECT SEGMENTS` at the end, after Look's):
  `FM.spine.segmentEffects()` (the ADJ_OK effects in the effects browser's category order), `segmentWhere(R, t)` (§4.3: at the
  playhead, min(3 s, rest of the clip); a gap, a card or < MIN_LEN left → the next clip's start; the playhead at the end → the
  last clip's last stretch), `FM.addEffectSegment(inst, start, len, slot)` (Full's plain `Adjustment` layer from `FM.makeLayer`,
  `effects: [inst]`, put at `slot` through `S.insertAt`; no commit, no selection), the effect band slot (directly above the
  top-most main clip it overlaps), `segmentEffect(L)` (its one plain effect, or null), `segmentStrength` / `segmentKeyed` /
  `segmentStrengthApply` (Strength = the layer's own opacity via `FM.shiftProp`: never adds a keyframe).
  Commands, each ONE runner step, never arranging, never adopting (so they work with a friend in, D14 A):
  `cmd.addEffect(type, t)` **Add effect** (t read at the tap; selects the new segment), `cmd.changeEffect(id, type)` **Change
  effect** (a fresh `sm: 1` instance where the old one stood), `cmd.effectStrength(id, pct)` **Effect strength**,
  `cmd.deleteEffect(id)` **Delete effect**. The effect instance carries `sm: 1`; the layer gets no new key.
- **The picker** (`js/simple-tools.js`, block `PHASE 3 · EFFECT SEGMENTS`): the project row gains **Effects** after Overlay
  (DESIGN's order); it opens the picker IN THE TRAY ROW, like Length / Speed / Volume: **Done**, then one tile per ADJ_OK effect,
  each the effects browser's own live picture (`FM.fxThumbs.mount`) over its name, in the tray's own scrolling strip with its fades
  (the wheel scrolls it; a redraw keeps its scroll). Nothing is written until a tile is tapped. From the project row a tap makes the
  segment at the playhead and selects it (its tray replaces the picker); Effects shows pressed while open and closes it when pressed
  again. Any other selection, Done or leaving Simple closes it.
- **The segment's tray** (replaces Phase 2's `[stay, more, del]` for kind `effect`): **Change effect** (the same picker, the
  current tile pressed; a tap swaps the effect and the picker stays) · **Strength** (an inline row like Volume: 0–100 % slider,
  previews on the canvas while it moves, ONE step on release, the preview taken back to the byte first, as Look's sliders) ·
  **Stay put** · **More** · **🗑** (Simple's own one-step Delete effect). Change effect is left out for a Full-made layer holding
  several effects or a filter box (More opens Full's panel for those). Length by dragging its edges is 2.5's item drag, unchanged.
- **Words** (`js/spine-words.js`, ends of `lines` and `tools`): *"Invert over Clip 2"*, *"Changed to Grayscale"*, *"Deleted the
  effect"*, Strength reuses Look's *"Strength 40%"*; refusals *"Add a clip first, then an effect over it"*, *"This one goes on a
  clip — tap a clip first"* (§8.5c's words), *"That effect was just deleted"*, *"This holds several effects · More opens them"*;
  tools Effects, Change effect, Strength. Effect names in the tiles are the registry's own labels (Full's names), put in as text.
- **CSS** (`styles.css`, one block after Look's): `.sm-fx-tile`, `.sm-fx-th`, `#sm-tray[data-row="effects"]` only.
- **Busters** (one above Look's tree): styles.css 770, spine-words 15, spine-edit 14, simple-tools 12.

### Deviations from the letter of DESIGN (each a call made while building; his to overrule)

1. **The picker is Simple's own, in the tray row — not `FM.fxBrowser` in a new `simple` target mode** (§8.5 2689, §14.1 3887).
   `js/fx-browser.js` is Full's 2,000-line browser: `open()` needs a layer and loops a preview of it isolated, picks are numbered
   and committed by its own bar, and every exit commits. A no-layer mode threads through all of that, in a file the Full-unchanged
   lock must prove byte-equal in behaviour. And on a phone the docked sheet only rises for a selected item (`js/mobile.js`
   syncSheet closes it with nothing selected), so a panel-style picker for "nothing selected yet" had nowhere to dock without a
   Full-file change. The tray row needs no selection and touches no Full file. Its cost: ~45 tiles in one scrolling row, no
   categories, no search, no presets (§8.5c "a tile or preset row").
2. **Tiles that cannot be a segment are left out**, not shown with *"Pick a clip first"* (§8.5c item 2): the clip trays' Effects
   (item 3) is not built, so that line would send him to a tool that does not exist yet. The words are in spine-words.js for when it is.
3. `FM.addEffectSegment` lives in `js/spine-edit.js` (a Simple file), not `js/app.js`, and takes an optional 4th `slot`.
4. **Strength = the segment layer's opacity** (the adjustment layer blends its grade by it), not each effect's own amount — one
   meaning for every effect. DESIGN names the control but not what it writes.
5. **🗑 on a segment is Simple's own Delete effect step** (label `Delete effect`); other non-main items still go through
   `FM.deleteLayer` as Phase 2 left them. **More stays** in the segment tray (Phase 2 put More in every tray; DESIGN's row omits it).

## ❓ Needs his eyes / his pick before it ships (#545: nothing visual new to him ships unseen)

1. **The picker row** at 380 (under the timeline) and 1280×800 (the band's tray row): Done + tiles, the 40×24 live pictures, names
   cut at 60 px with an ellipsis. Never drawn on any V-sheet. Option to put to him: (a) as built, one long scrolling row;
   (b) a panel like Look's (sheet / band) with categories — needs the mobile.js sheet to rise with nothing selected (a Full-file
   hook) or "Effects" to select something first.
2. **The project row with five tools** (Clips · Text · Sound · Overlay · Effects): 76 px each at 380. Captions (in flight on its own
   branch) makes six; DESIGN's eight need Look's decision 2(b) (the wider band) on PC.
3. **The segment's tray** (Change effect · Strength · Stay put · More · 🗑) and the Strength row (Volume's slider look).
4. **Words**: "Invert over Clip 2", "Changed to Grayscale", "Deleted the effect", "Add a clip first, then an effect over it".
5. **Strength = opacity** (deviation 4) and **3 s** as the new segment's length (§4.3's number, his to change).

## Open / not done (said plainly)

- **Effects in the Main clip, Overlay and Text trays** (§8.5c item 3, clip effects through `addEffect`, filtered by `supportsLayer`)
  — not built; not part of "segments", and it is what would make the "Pick a clip first" tiles meaningful.
- **Ask's `addEffect` routing** (§8.5c item 5) — belongs with Ask (D12); `cmd.addEffect` is ready for it.
- **The "runs over the next clip" hint** (§4.3 / Q5) for a segment dragged past a cut or a Full-made one crossing one — not drawn.
- A **one-clip project** where the new segment covers the whole clip reads as a whole-video item (`isLong`), so it has no host and
  the next arranging edit pins it (`sm.stay` + `sm.tail`, the tail fit keeps it to the end). Harmless, but not "rides its clip".
- A Full-side keyframe edit should drop `inst.sm` (§8.5c item 4) — Full-side plumbing, not touched (Look's note says the same).
- A refresh from elsewhere mid-drag of the Strength slider takes the preview back and the finger has to start again (Look's limit too).

## Tests (tests/tests.js, before the final `})();`, `{ item: '980' }`)

Each new test fails on 7da21cf2 (Look's tree) at `smSegOpen`'s own sentence — **"the project row has no Effects tool (it holds
clips,text,sound,overlay)"** — never a TypeError. Clips are pictures stacked A over B over C (A on top), so a segment that ran too
long or was not clamped WOULD grade the clip after it: the pixel checks can tell.
1. `simple P3 · Effects segments at 380 the project row’s Effects opens a picker …` — Done, ADJ_OK tiles only, no layer on open,
   Effects pressed; Invert at 2.5 s → one adjustment layer `[invert sm 1]` at 2.5 for 1.5 s directly above Clip 2, one step,
   selected, tray `change,strength,stay,more,delete`; FM.renderScene red at 2.2 / 3 / 4.5 / 1 s (CONTROL first: all red, then
   only 3 s inverted); Undo labelled `Add effect` from Simple, picture back.
2. `… a segment rides its clip …` — Delete Clip 1 → segment [0.5, 1.5]; trim Clip 2 to 1 s → segment 0.5 to 1 (clamped); 0.75 s
   inverted, 1.5 s (Clip 3, under the segment in the stack) not.
3. `… the segment’s own tools are each ONE step …` — Change effect (Invert pressed, Grayscale swaps in place, picker stays), Strength
   40 → opacity the plain number 0.4 (no keyframe), partly grey picture, Delete → gone; four Undos read `Delete effect | Effect
   strength | Change effect | Add effect`.
4. `… at 1280×800 the picker lies in the tray row inside the left band …` — Done and the first tile pressable inside the band,
   ≥ 44×32, tiles scroll in their own strip with the end fade; a pick makes the segment.
5. `… switched to Full …` — the segment has no field Full's own adjustment layer lacks; its effect has only type/enabled/params/sm
   (uid allowed); Full's Effects lists Invert; the picker left open across the switch is closed and not on screen.
6. `… leave Full alone …` — CONTROL in Simple first; in Full openEffects opens/draws/writes nothing, and `FM.addAdjustmentLayer`
   still makes Full's own Brightness + Saturation layer over the whole project with no `sm` marker.

Changed (the project row grew): `smTrayCheck` (380 and 1280) now wants clips, text, sound, overlay, effects present **in that
order with anything between** (so Captions / Look for all / Ask can join without editing it again); the More-in-reach test's
CONTROL `btns.length !== 4` → `< 4` (its real check — every project tool in reach with the panel up — now covers five).

## Merge notes

Shared files this branch touches, all on top of Look's commit:
- **`index.html`** — four busters: styles.css 769→770, spine-words 14→15, spine-edit 13→14, simple-tools 11→12. On merge with
  Captions (also built on Look): take the base, then bump each once above the higher of the two (CLAUDE.md index.html rule).
- **`js/simple-tools.js`** — own block after Look's panel block (`PHASE 3 · EFFECT SEGMENTS`); plus one-line hooks in shared code,
  each tagged "Phase 3 · Effect segments": three ICONs after `none`, `let fxPick, segDrag` after Look's state line, the `effects`
  entry at the END of `buildTools`' list (Captions will add its own between Text and Sound: keep both, DESIGN order Clips · Text ·
  Captions · Sound · Overlay · Look for all · Effects · Ask), trayFor's `effect` line, fillTray's first line, sync's early-return
  and fxPick-clear lines and the `segSig(l)` term at the END of the sig array, _fill's `segUndrag()`, the stripKey term and
  `fxMark()` in the finally, mount's onChange line, and openEffects / closeEffects / fxPick / `_reset` in FM.simpleTools.
- **`js/spine-edit.js`** — one block at the very end, after Look's. Captions appending at the end too: keep both blocks.
- **`js/spine-words.js`** — new keys at the end of `lines` and of `tools`, after Look's (a comma added after Look's last entry in each).
- **`styles.css`** — one block right after Look's block.
- **`tests/tests.js`** — the block after `// ── end simple P3 · Look ──` (ends `// ── end simple P3 · Effects segments ──`), plus the
  two project-row lines above. **If Captions also edits `smTrayCheck`'s project-tools line or the `btns.length` CONTROL, take this
  branch's form (it already tolerates a Captions tool between Text and Sound).** Rebuild appends by blocks, never union-merge.
- **vs morph** (`hunt/sm3-morph`, on 4af4e420, not Look): it touches `js/editor-mode.js`, the new `js/editor-morph.js`, `styles.css`
  and tests only — no overlap with this branch's JS. styles.css: different blocks; buster as above.
- Not touched: `js/inspector.js`, `js/mobile.js`, `js/app.js`, `js/fx-browser.js`, `js/fx-registry.js`, `js/spine.js`,
  `js/simple-timeline.js`, `js/editor-mode.js` — no Full file.

## What the lock run (Full unchanged, FU1–FU7) must cover

No Full file changed. `styles.css` gained only `.sm-fx-…` rules and one `#sm-tray[data-row="effects"]` rule (elements only Simple
builds). `FM.addEffectSegment` is new and only Simple's runner calls it; Full's `FM.addAdjustmentLayer`, the effects browser and
the Add menu are untouched (test 6 is the in-suite guard). The mount's onChange line runs on every editor switch but only nulls
Simple's picker state (and takes back a Strength preview that can only exist mid-drag in Simple). A segment made in Simple must
show in Full as an ordinary adjustment layer — its row, its Effects card, export — exactly as one made from Full's Add menu with
one effect: the lock run should include a project with a Simple-made segment opened in Full at 380 and 1280, and exported.
