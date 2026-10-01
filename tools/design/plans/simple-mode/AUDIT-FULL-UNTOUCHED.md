# Audit: every change the Simple-mode plan makes to the original ("Full") editor

Step 7a of `STATUS.md`, 1 Oct 2026. Planning only; nothing here is built.

**His rules, 1 Oct, verbatim:** *"okay so with this new editing layout i just want to make clear that i dont want the original
editor changing in design and function. some of the tests you showed me mean changing stuff i dont want changed with the
original editor. dont do that. the option to switch between the two editors should be in the settings cog, making a third
section in there. it can be a small button that just switches between editors and should have a button that you press that
says "What should you use?" pressing makes that pannel open up like how the other two pannels currently function, the canvas
settings and the friends one. so this will just be a 3rd section but it stays small unless you want the explanation. allowing
quick swapping in editors. also if swapping the editors changes anything that cant be un done make sure theres a warning."*

**What was read:** `DESIGN.md` §0–§19 in full and §20 by search (it is history; §0–§19 win where they differ), `BUILD-PLAN.md`
in full (code hunks for steps 1.1–1.3, the step 1.4 plan, §8–§13), `SUMMARY.md`, `STATUS.md`, `vis/KIT.md`, `vis/kit.js` (the
frames and `drawFull`), and every visualizer (`v1`, `v4`, `v6`, `v10`, `v11`, `v12` read for their Full screens; `v2`, `v3`, `v5`,
`v7`, `v8`, `v9` searched for every Full screen or claim). Four claims were checked against today's app (v17.20 tree):
the cog dialog is `openCanvasDialog` with a canvas block and a friends block (`js/app.js:8552-8628`); and how the tools that
the switch closes behave when closed (`js/crop-tool.js:221`, `js/touchup-tool.js:186`, `js/text-edit.js:990`,
`js/mask-tool.js:415-420`, `js/point-edit.js:458-466`).

## The yardstick

- **A change to Full** = anything a person using only Full would see, hear or feel differently: its screens, buttons, words,
  toasts, keys, what its edits do, what its undo does, what its preview and export draw, how it behaves in a live session.
- **Not a change to Full:** what a Simple edit puts in the document (a ripple, a Stay-put flag, a trimmed song) and Full then
  shows and edits as it would any project. Full rendering a moved clip is Full working as it does today.
- **The one sanctioned change:** the third section in the ⚙ cog (his rule 2). Every other door to the swap is a Full change.

Classes, as the task set them:
**(V)** visible change to Full → remove. **(B)** behaviour change to Full → remove, or contain so it runs only in Simple.
**(I)** invisible plumbing; Full looks and behaves the same (the reason is given for each). **(N)** needed by Simple and cannot
be contained.

## Result

| Class | In DESIGN / BUILD-PLAN | In the visualizers |
|---|---|---|
| **V**, remove | **15** (+ 1 sanctioned: the cog section) | **9** (VZ1-VZ9; VZ10 is listed but is not a Full change) |
| **B**, remove or contain | **38** (all 38 can be removed or contained; 9 of them are Phase 4–5 and contain cleanly only by not shipping live arranging, a decision for him) | 1, inside VZ7 (Ezra's playhead moving in Full) |
| **I**, invisible | **20** | — |
| **N**, needed | **4** | — |

The plan's own words show the problem: BUILD-PLAN step 1.1 is titled **"four Full fixes"** and its checklist says *"1.1 and 1.2
change Full"*; DESIGN §10.4 says clip time on the wire is *"Worth shipping on its own even if Simple never did"*. Every one of
those is now off the table unless he asks for it as its own item.

**Swap and irreversibility (his rule 3):** the swap writes nothing to the project, and that can be proven with a test. **One
real hole was found:** the swap closes the crop and touch-up tools by **cancelling** them, so an unfinished crop box is lost and
↶ cannot bring it back. Fix: finish (commit) it first, as the swap already does for text. Details in §5.

---

## 1. Visible changes to Full (V): remove

| # | Where | What the plan says (quoted) | Action |
|---|---|---|---|
| **V1** | DESIGN §6.1 (l.1834-1852), §0.3 row 13, §14.2 `#transport` row, §17 **D2**; BUILD-PLAN 1.3.1 (`#vb-editor`), CSS l.2779 | *"In Full (phone), D2 picks between: D2-A ⇄ in slot 3 … D2-B (recommended) … ⇄ as the first item inside Full's ⋯ … D2-C … every play-bar button at 31 px"*; *"⋯'s first row reads **Simple editor**"*; *"Long-press or right-click opens a two-line menu"* | Remove every D2 option. Full's play bar and Full's ⋯ strip stay exactly as today. **D2 is retired**: his cog rule answers it. |
| **V2** | DESIGN §6.1 (l.1859-1866), §6.2 (l.1891-1893), §9.2 (l.2686-2688), §17 D16 row 6; BUILD-PLAN CSS l.2780-2781, `editor-mode.js` `set()` (`ed-back`) | *"slot 3 shows an icon-only back button in place of ◐"*; CSS `body.sm-on.ed-back:not(.ed-simple) #btn-addside { display: none; }` | Remove. ◐ never leaves Full's row. The way back from Full is the cog section (one tap on ⚙, one on the swap). "Open in Full" from Simple lands in plain Full; the cog brings him back. |
| **V3** | DESIGN §6.1 (l.1867-1869), §14.2 `pcTransportLayout` row; BUILD-PLAN CSS l.2777 | *"On PC it sits in `#t-home` after ‹"*; `body.sm-on:not(.ed-simple) #btn-editor { display: inline-flex; }` | Remove from Full's PC row. |
| **V4** | DESIGN §6.1 (l.1854-1858), §3.12 rule 6, §6.1 (l.1881-1883) | *"the first arrival in Full from Simple … shows a non-interactive `FM.toast(msg, 3000)` … "Full editor · the ‹ button on the play bar takes you back""* | Remove. No toast in Full on arrival. (The cog section can say where the way back is, inside its own explanation.) |
| **V5** | DESIGN §7.4 (l.2095-2102), §6.1 (l.1875), §14.2 `home.js` row, §17 D1/D16 row 1 | *"The card's first meta chip shows the editor … `▭▭▭ Simple · 9:16 …`"*; *"The card's ⋯ menu gets **Open in Simple** and **Open in Full**"* | Remove both. Home is shared chrome a Full-only user sees every day. |
| **V6** | DESIGN §7.1 (l.1965-1997), §17 **D3**, §14.2 `#hm-dialog` row, §15 Phase 3; BUILD-PLAN §10 Phase 3 | *"the two editor cards; the folded `More ·` row"*; *"a one-time migration writes **Full** as the default"* | Remove. New project stays today's dialog. A new project opens in whichever editor this device last used (one per-device setting); the cog swaps it. **D3 needs re-asking** in that form, or dropping. |
| **V7** | DESIGN §15 (l.3661), §15.1 (l.3703-3708), §17 D15; BUILD-PLAN §2.1, 1.3.7-1.3.9 (l.2069-2127) | *"Behind a "Simple editor" switch row in Settings … its own untitled group directly above "Work with friends""* | A new row in Settings is a Full-side change, and a second home for the swap. **Decision for him:** either (a) no Settings row at all: the cog section is the only door, and the builds that are not ready simply do not ship it; or (b) keep a Settings row only as a "show the cog section" gate during testing. Recommended: (a). |
| **V8** | DESIGN §4.4 (l.1428-1442), §8.9 word table (l.2589-2590), §14.2 `layerMenuItems` row, §15 Phase 3 | *"**Full, layer menu** … Phase 3: **Make overlay / Put in the clip row** … **Stay put** (on/off)"*; *"Full's layer menu uses the same two words"* | Remove. Full's ⋯ layer menu keeps today's items and words. Membership is changed in Simple only. |
| **V9** | DESIGN §4.4 (l.1443) | *"**Full timeline** (Phase 3, optional): a thin stripe along the bottom of a main clip's bar"* | Remove. |
| **V10** | DESIGN §10.3 (l.2753-2755), §10.7 (l.3190-3191); BUILD-PLAN §6 (presence `ed` row) | *"The people chip shows a tiny editor glyph on each face; the chip reads "Sam · Simple""*; *"The friend sees the glyph flip"* | Remove from Full's people chip and people list. The `ed` presence field may still travel (I7) and be drawn **in Simple only**. |
| **V11** | DESIGN §10.3 (l.2770-2775), §8.9 (l.2588) | *"**In Full**, a main clip a Simple user is arranging is outlined with "Sam · clip row""* | Remove. Full draws today's remote-selection ring only. (Simple's drag can send its held clip ids as an ordinary selection, which Full already draws, if wanted: no new look.) |
| **V12** | DESIGN §10.4 4d (l.3077-3084), §3.12 rule 1(a) (l.1260) and rule 6 (l.1285-1288) | *"`FM.spine.say` routes to `FM.toast` when the editor is Full … "Sam moved 4 clips" (3.2 s) … "Sam deleted a clip — your title ‘Hello’ was kept (now Stay put)", and a tap selects the title … the moved clip boxes … get the mover-colour outline for 1 s"* | Remove all three from Full. In Full the clips simply move, as when a Full friend moves them today. (The kept title is still kept; Full just doesn't announce it.) |
| **V13** | DESIGN §10.4 4c item 4 (l.3054-3064), §14.2 `collab-ui` member rows; V6/V12 | *"The owner can mark a member row in the Share panel as **"This is me (my other device)"**"* | The Share / Friends panel is shared chrome. Remove, or show the mark only when Simple is the editor on screen. Simple loses nothing if shown in Simple only. |
| **V14** | DESIGN §12.1 (l.3303-3305), §2.2 (l.151) | *"Full draws a ◇ on the join"*; *"Phase 6 looks: ordinary layer fields … because the renderer and the Full inspector honour them too"* | Remove the ◇ and any Full inspector row for `trIn` / `clipAnim`. (The picture itself is N2.) |
| **V15** | DESIGN §12.1 (l.3326-3328) | *"From Phase 1, `applyScene`, template use-as-new and the export sheet show one non-blocking line when `project.sm.v > SM_V`"* | Remove from Full's import, template and export sheet; show it in Simple only. Full on an older build keeps today's behaviour. |
| *(sanctioned)* | DESIGN §6.1 (l.1875), §14.2 `openCanvasDialog` row | *"the cog's canvas dialog ("Editor: Simple · Full")"* | **Replaced by his third section**: a small swap button plus **What should you use?**, which opens like the canvas and friends blocks do (`cvPairApply` with a third block). This is the one Full-visible addition he asked for. Not counted as V. |

**Words (§8.9).** The word table says it gives *"every string shown on screen in either editor"*. After V1–V15 the only words
Full shows from this project are the cog section's. Every other row in that table becomes Simple-only.

---

## 2. Behaviour changes to Full (B): remove or contain

For each: the change, the containment, and **what Simple loses**.

### 2a. Step 1.1, "four Full fixes" (all four are Full changes by the plan's own title)

| # | Where | Quote | Containment | Simple loses |
|---|---|---|---|---|
| **B1** | DESIGN §3.6 Split row (l.618), §13 #20, Q28; BUILD-PLAN 1.1.5 | *"Phase 1 also raises Full's guard … from 0.02 s to 0.1 s"* | Drop. Simple's ✂ enforces `MIN_LEN` in its own plan builder (it already does: *"Refuse if `t − c.start < MIN_LEN − 1e-6`…"*). | Nothing new: Full-made slivers are already covered by §3.1's "clips already under `MIN_LEN`" rules. |
| **B2** | DESIGN §10.4 (l.2861-2867), §14.2 `scene.js:377, :405`; BUILD-PLAN 1.1.1-1.1.3 | *"`shiftLayerKeyframes` and `scaleLayerKeyframes` … read `timedLists` … it also fixes the Full bug where moving or re-speeding a caption track leaves animated cue effects behind (a deliberate Full behaviour change…)"* | Keep `FM.timedLists` as a new function, but leave `shiftLayerKeyframes` / `scaleLayerKeyframes` on `animatedProps`. Simple's `shiftUnit`, its speed plan and the wire conversion call a Simple-owned pair (`FM.spine.shiftKeys` / `scaleKeys`) that read `timedLists`. | Nothing. (Simple's invariant 3 still holds because only Simple's paths need it.) |
| **B3** | DESIGN §8.5a (l.2479), §10.4 (l.2919-2921), §14.2 `ai-ops.js:116`; BUILD-PLAN 1.1.4 | *"The keyframe half of `js/ai-ops.js:116` … is fixed in **Phase 1**"* | Shift keys only when `applyOps` runs with `{simple: true}`. Full's Assistant keeps today's raw `start` write. | Nothing: in Simple a main clip's `start` is an intent anyway (§8.5a). |
| **B4** | DESIGN §3.10 rule 1 (l.1081-1090), §12.1 (l.3267-3269), §14.2 `behaviors.js:240`, `compositor.js:8449…`; BUILD-PLAN 1.1.6-1.1.12 | *"after a split, past the cut a Follow freezes … and a matted layer disappears: a Full bug today … **Phase 1 fixes it** as a Full change"* (a render change in Full's preview and export) | Drop. The plan already specifies the fallback: *"until it ships, `R.linkOf` and rule 4's referenced end use the stored id for Follow and effect sources (what actually renders)"*. Keep that permanently. | In a split-then-reorder case with a Follow or matte, Simple asks once (*"1 matte will slip"*) instead of trusting the split lineage. |

### 2b. Rendering and audio

| # | Where | Quote | Containment | Simple loses |
|---|---|---|---|---|
| **B5** | DESIGN §3.10 rule 3 (l.1152-1157), §12.1, §14.2 `bounceDelta` row | *"`bounceDelta` … also filters `k.split` keys in its non-lineage path … a Full change logged in POLISH-LOG"* | Mark the boundary keys Simple's `riderKeys` inserts with a mark Full never writes (e.g. `sb: 1`, kept by the sanitiser), and have Bounce skip only those. Every Full-made document then renders bit for bit as today (becomes I). Simpler alternative: `riderKeys` adds no boundary keys on a layer that carries Bounce and the runner asks instead. | With the mark: nothing. With the alternative: one extra ask on a bouncing camera. |
| **B6** | DESIGN §12.1 (l.3271-3276), §14.2 `seamAt` row | *"`seamAt` now also requires continuity … One change in app.js"* (preview and export audio ramps change at touching split halves) | Apply the continuity test only to pairs where Simple wrote a mark when its command made split siblings touch with a footage jump (a plain `sm.cut: true` on the later half, set by the runner). A pair with no mark keeps today's rule, so a Full-made project sounds exactly as today. | Nothing. |

### 2c. Shared editing code that Full also runs

| # | Where | Quote | Containment | Simple loses |
|---|---|---|---|---|
| **B7** | DESIGN §3.6 (l.594-606), §13 #3, §14.2 `timeline.js:3881-3960` row and `extendClipTo` row | *"The grip, the A and D keys …, `FM.extendClipTo` … and both Simple trims call it, and "apply r" always writes `fxShift` … on every branch"*; *"`FM.trimLayerHead` becomes a wrapper that also re-bases cues"* | `FM.trimClipEdge` is new and used by Simple only. Full's grip, `clipTrimStart` / `clipTrimEnd`, `extendClipTo` and `trimLayerHead` are not rewired. | One shared copy of the trim maths; T2 compares Simple's numbers against the grip's instead. |
| **B8** | DESIGN §2.2 (l.156-164), §14.2 `addMediaLayer` and `replaceMedia` rows; BUILD-PLAN §11 (moved to Phase 2) | *"`audioOnly: true` is now written at add time on every sound-only route … Every route that installs a new media record … also sets `audioOnly`"* (Full's timeline and inspector treat `audioOnly` as final: a song replaced with a video gets a filmstrip; on a guest with no media a song draws as sound, not a picture) | Store Simple's fact where Full never looks: `sm.snd: true` (or a `srcA: 1` beside `srcW`), written at add and on Replace, read by the classifier and kept by the sanitiser. Never write `layer.audioOnly` on a new route. | Nothing. It also closes BUILD-PLAN §12's gap (a guest's song read as "undecided"). |
| **B9** | DESIGN §3.6 Reverse row (l.636), §14.2 `app.js:1648, :2566; storage.js:494` | *"Twins never get a frame cache (`&& !l.audioOnly` in the `ensureReverseCache` guard … and both warmers)"* | Leave the shared guard alone; Simple's runner simply doesn't call `ensureReverseCache` for a twin. | Nothing. |
| **B10** | DESIGN §7.3 (l.2067-2085), §14.2 `addMediaLayer` row, `FM.isoBoxes` row | *"The capture date is stored as the plain layer field `taken` … written at add and at Replace"* (Full's import would now read each video's `moov` box and each JPEG's Exif: extra file reads on his iPhone) | Read and write `taken` only for files picked from Simple (its `+`, the Clips tool, New project's picked clips). | Sort by date taken ignores clips imported in Full (the ⋯ entry hides below two dated clips). |
| **B11** | DESIGN §10.7 (l.3192-3197) | *"The guest keeps a meta-only record … that `fillsFrame` and `FM.maxDurForSource` read, so … extend-trims clamp to the real source length"* (Full's grip on a guest clamps differently) | Simple's `trimClipEdge` and classifier read `FM.media.meta`; `FM.maxDurForSource` is untouched. | Nothing. |
| **B12** | DESIGN §8.1 (l.2117-2118) | *"Both timelines share one bound (40 today; the Simple rebuild may raise it … about 60)"* | Raise the bound only while Simple is on screen; back to 40 in Full. | Nothing. |
| **B13** | DESIGN §4.6 (l.1541-1544) | *"`onCopy` does the same [repoint `karaokeOf`] for any other route that copies a clip and its twin in separate calls"* (Full's duplicate / paste) | Only Simple's Duplicate repoints `karaokeOf`. `onCopy` on Full's routes strips Simple's keys and nothing else (I4). | Nothing. |
| **B14** | DESIGN §6.1 (l.1876-1877), §8.3 keys, §0.3 row 14, §14.2 keys row; BUILD-PLAN `editor-mode.js` `onKey` (l.2432), 1.3.14 | *"**E** on a keyboard"* switches, in both editors | In Full, E does nothing new (today's handler). The cog is the door. E may stay as a Simple-only key, if wanted. | Keyboard swap from Full (the cog is two taps). |

### 2d. Undo and history (Full's ⌘Z)

| # | Where | Quote | Containment | Simple loses |
|---|---|---|---|---|
| **B15** | DESIGN §3.7 (l.817-842), §11 (l.3231), §14.2 `history.js` rows | *"`FM.history.undo()` / `redo()` … when `isMuted() \|\| jobDepth() > 0` … push 'undo' / 'redo' onto the queue … This also closes today's hole in Full's own split"*; *"Undo skipped — something else changed first"* | Queue undo / redo only while `FM.spine.running` (Simple's runner or `compose`). While a Full job runs, ⌘Z behaves as today. `drain()` is then a no-op in Full. | Nothing: Simple's own commands still queue. |
| **B16** | DESIGN §3.7 (l.839-842) | *"`S.undo` / `S.redo` … when `busy()`, queue the press … and `runStep` returns early when `busy()`"* | Same trigger: only while `FM.spine.running`. | Nothing. |
| **B17** | DESIGN §3.7 (l.848-850) | *"`C.share` itself returns early when `C.bridge.busy()`"* | Return early only while `FM.spine.running`. | Nothing. |
| **B18** | DESIGN §11 (l.3226-3229) | *"when `soft` is set, `runStep` does not toast; the caller builds one `#sm-say` line"* | Keep today's toast whenever Full is on screen; build the `#sm-say` line only in Simple. | Nothing. |
| **B19** | DESIGN §11 (l.3238-3249), §14.2 `collab-diff.js:462` row | *"an `li` rec is compared with its ownership and placement fields masked out … `start`, `kb`, `by` and the `sm` membership keys"*; new line *"Undid (Sam had moved it)"* | Mask only fields Full never writes (`sm` keys, `by`, `kb`); keep `start` compared. A Full person's undo of an add after a friend moved it fails exactly as today. | After a Simple ripple, a friend's undo of their own add can fail with today's *"Can't undo"*; it no longer soft-succeeds. |
| **B20** | DESIGN §11 (l.3250-3258), §14.2 `collab-diff.js:469…` row | *"Undo restores only its own layers' order"* (changes `invertStep` for every step) | Apply only to steps whose `ed` is `'s'`. | Nothing for Simple's steps. |

### 2e. Collaboration from Phase 2 (seen by a Full person in a session)

| # | Where | Quote | Containment | Simple loses |
|---|---|---|---|---|
| **B21** | DESIGN §10.1 Q29 (l.2701-2710), §14.2 `collab-session.js:926-930…` row | *"A guest's whole-tx refusal is no longer silent (Q29, a collab change that covers Full too)"*: resync, a line *"That change couldn't be sent to your friends, so it was put back."*, undo steps dropped by cid, `'limit'` refusals counted with *"Part of that change was too big to share…"* | Apply only to txs from Simple-tagged steps (`ed: 's'`). A Full tx keeps today's handling. (If he wants the Full fix, it is its own queue item.) | Nothing for Simple's own oversized edits (they are refused before sending anyway, §3.7 `tooBig`). |
| **B22** | DESIGN §10.2 door 2(a) (l.2732-2740), (l.2745-2747) | *"From Phase 2, for every undo and redo step while `S.active`, arranging or not … Because the check lives in `runStep`, it also covers Full's own split undo"*; *"The owner branch … now handles `r.rej` with `refuseLocal`"* | Run the lease half and the `r.rej` handling only for steps with `ed: 's'`. | Nothing for Simple's steps; Full's split undo vs a lease stays as today. |
| **B23** | DESIGN §19 Q16 (l.3838) | *"the lease half of the pre-flight runs … split included, and in Full's split too"* | Only Simple's ✂ / S. | Nothing. |
| **B24** | DESIGN §10.3 (l.2777-2782), §14.2 `collab-ui.js:526-529` row; BUILD-PLAN §6 | *"Starting Watch along first closes open exclusive tools … and flushes the text editor"* | Drop. Simple's pre-flight names the follower who holds the lease (*"Sam is editing ‘Clip 3’"*). | A friend watching along with a tool open blocks arranging that one clip until they close it. |

### 2f. Comments, benchmarks, opening a project

| # | Where | Quote | Containment | Simple loses |
|---|---|---|---|---|
| **B25** | DESIGN §13 #24 (l.3432), §0.3 row 5, §12.2 (l.3354-3358), §14.2 comment rows | *"Comment pins stay on their footage. At `CM.add` … with one anchor rule shared by both editors"*; Full's *"card label, tap and layer name …, the ruler marks … all use it"*; *"`FM.remapCommentPins` runs in all three"* | Write `ls` / `lo` / `cu` anchors only for comments made while Simple is on screen. Full-made comments stay absolute (the resolver returns `c.t` for them, so Full's marks are where they are today). Remap only anchored pins. | Comments made in Full stay at their time through Simple ripples, like benchmarks. |
| **B26** | DESIGN §13 #24 option B, §17 **D19** | *"Option B … every reader of `m.t` calls it: Simple's ruler, Full's ruler, `snapMove` / `snapEdge` …"* | Keep D19 A (the recommendation): benchmarks stay absolute; Full untouched. | Nothing (A is recommended). |
| **B27** | DESIGN §7.2 (l.2000-2008), §7.3 (l.2091-2092), §10.7 (l.3188-3189) | *"`FM.editor.homeFor(card, project) = … card.editor \|\| project.sm.home"*; *"`FM.editor.chooseFor(project)` runs once more at the end of `_adopt` and `applyScene`"* (a Full person who imports a friend's file or uses a Simple template is put in Simple) | Which editor opens is **this device's choice only** (its last swap, or the card's `editor`). `project.sm.home` never moves a device into Simple. | A Simple-made template or file does not open in Simple for someone who has never swapped; one tap in the cog does it. |
| **B28** | DESIGN §3.6 Replace row (l.623), §14.2 `template-fill.js` row | *"Template fill … routes each slot through this command … in an adopted or `home: 'simple'` project"* (from Full too) | Route through Simple's Replace only while Simple is on screen. | Filling a template from Full leaves gaps, as today. |

### 2g. Phases 4 and 5: "together" (live arranging)

Every item here changes what a Full person sees in a session. They are tied together (the wire form, the lease rule and the
compare rules depend on each other), so they cannot be scoped to one editor one by one. **Clean containment = don't ship
Phase 4–5's live arranging:** keep Phases 2–3's gate for good, so arranging in Simple waits while a friend who can edit is in
the project (looks, text, captions and sound stay live). **What Simple loses:** moving clips while a friend who can edit is
connected (the *"clips stay put while you both edit"* line stays, with Options › Make Sam a Viewer). **Decision for him**
(it is D14's "clips next" half): recommended, drop it.

| # | Where | Quote | What Full would feel |
|---|---|---|---|
| **B29** | DESIGN §10.4 4a (l.2801-2951), §0.3 row 22, §14.2 `timeline.js:4138-4146` and `:2694…` rows | *"the Full clip drag writes `start` per move and shifted keyframes only on release … T14 … Moves the animation: the Full clip drag (per hot tick)"*; kfDrag *"records `origRel = k.t − base`"* | Full's clip drag would move the animation with the clip during the drag (today only on release); keyframes travel relative to `kb` on the wire, so race outcomes between friends change. |
| **B30** | DESIGN 4a (l.2823-2846) | *"a tx that rewrites relative lists (a speed change …) … refuse the whole tx 'stale' … "Sam just changed this clip's animation, so your change was undone""*; *"Every tx that writes a `kf` list (inspector key add …) … refuse the whole tx 'stale' when `kr` differs … "your keyframe was undone""* | Full's speed changes and keyframe edits could be undone by the system, with a line. |
| **B31** | DESIGN 4a (l.2847-2860) | *"Every commit that changes the main track's structure bumps `mrev` … Split …"* (Split includes Full's) | Full's split could be undone by the system: *"your split was undone"*. If Phase 4 shipped anyway: only Simple's commands bump and compare `mrev`. |
| **B32** | DESIGN 4a (l.2940-2948), §3.8 (l.996-1004) | *"inspector keyframe add / delete / value edits … and the timeline diamond drag publish presence `act: 'kf'` … `FM.spine.blockers` and the Full speed paths refuse … and the keyframe surfaces make the reverse check"* | Full's speed control and keyframe surfaces would refuse with *"Sam is animating this clip."* (Publishing `act: 'kf'` alone is invisible; the refusals in Full are the change.) |
| **B33** | DESIGN 4a′ (l.2953-2966) | *"Move `captions` from `ATOMIC` to `KEYED` … keep-my-frame moves `FM.time` by `dt` when the bound cue's start moves"* | Two people's caption edits merge differently; a Full typist's playhead moves. |
| **B34** | DESIGN 4b (l.2968-2993) | *"lets through, from anyone, on a layer someone else has leased: `s L/<id>/start` … any `{o: 'mv'}` … This also lets a Full layer-panel reorder and the undo order-restore … move a leased layer"*; leased tools *"re-read the layer's base after a remote batch"* | A layer a Full person holds can be moved under them; their motion path, graph, points and mask tools behave differently. |
| **B35** | DESIGN 4c (l.3007-3019) | *"Keep my frame … snapshot the watched layer … Write `FM.time`"* in `afterApply`, on every device | A Full watcher's playhead moves when a friend's batch moves their clip. If kept at all: only while Simple is on screen. |
| **B36** | DESIGN 4c (l.3020-3053) | *"`L.by = {mid, name, color}` … the host sets `v.by` … refuses as `bad` any guest `s` or `d` whose path is `L/*/by`"* | The stamp itself is invisible; its consequence for Full is B19's undo masking and B35. Goes with Phase 4. |
| **B37** | DESIGN §10.5 Phase 5 (l.3116-3120) | *"`S.undo` / `S.redo` return false … while the newest undo entry (or any `all:1` entry) is unacked"* | Full's undo would wait on any unacked step. If Phase 5 shipped anyway: wait only on `all:1` entries. |

### 2h. Outside this plan, logged separately

| # | Where | Quote | Action |
|---|---|---|---|
| **B38** | DESIGN §8.5 (l.2417-2418) | *"A Full-side follow-up, logged separately: the inspector's `SPD_MAX` 1000 exceeds the storage clamp of 100"* | A Full change. It must not ride with Simple; if it is in REQUESTS.md it waits for his own yes. |

---

## 3. Invisible plumbing (I): Full looks and behaves the same

Each is invisible for the reason given. A refactor is "same output" only if a test proves Full byte-identical before and after;
where a copy is cheap, giving Simple its own copy keeps Full's code literally untouched (marked **copy**).

| # | What (where) | Why Full is identical |
|---|---|---|
| **I1** | The sanitiser learns `sm`, `project.sm`, `srcW/srcH/srcRev`, `pick`, `taken`, `by`, `kb`, `kr`, an effect's `sm: 1`, later `trIn` / `clipAnim` (DESIGN §2.3, §14.2 storage rows; BUILD-PLAN 1.2.1-1.2.3) | No Full-made document carries any of these keys, so the sanitiser's output is byte for byte the same (BUILD-PLAN §9: T7's control proves it). |
| **I2** | `srcW/srcH/srcRev` written at add, Replace, duplicate, paste; stamped on export / template / element copies (DESIGN §2.2, §12.2; BUILD-PLAN 1.2.15) | Plain fields Full never reads. A file gains three numbers per media layer. |
| **I3** | `pick: {b, i}` on every layer of a multi-file import, including Full's (BUILD-PLAN 1.2.18) | Never read by Full; stripped on copy. Placement is unchanged without `{at}`. |
| **I4** | `FM.spine.onCopy` on Full's duplicate, paste, AI clone, extract audio, template and element insert: strips `sm.main`, `sm.tail`, `tailEnd`, `trIn`, `pick`, `by`, `sm.muteByMode` (DESIGN §12.2; BUILD-PLAN 1.2.19-1.2.21) | Removes only keys Full never reads. (A copied `trIn` could never draw anyway: `transitionAt` needs `sm.main`, which is stripped.) |
| **I5** | `extractAudio` writes `sm.twin` (DESIGN §4.6) | One invisible key on the new layer. |
| **I6** | Full writes that drop an effect's `sm` marker: Paste Style, look presets, a Full keyframe on that effect (DESIGN §8.5c, l.2516-2519) | The marker is invisible to Full; removing it changes only how Simple badges the effect. |
| **I7** | Presence and wire fields: `ed`, `ar`, `act: 'arrange'`, `act: 'kf'` publishing, `cu`, hello `ob`, roster `ok` / `ab`, manifest `w/h/dur` (DESIGN §10.3, §10.4, §3.7, §10.7) | Wire only; once V10, V11 and B32's refusals are removed, Full draws none of them. (Most are Phase 4 and go with B29-B37.) |
| **I8** | Refactors Full runs, output unchanged: `FM.setClipSpeed` (same code), `FM.seamKey` / `FM.divideSegment` and `FM.captions.splitAt` from `splitLayer`, `FM.renderStill` from `snapshotPNG`, `layerAABB(…, size)` → `FM.worldBox`, `FM.groupNeedsUnit` export, the optional index on `applyParentChain` / `FM.clipAt`, `FM.pickReplacement` + `FM.swapInMedia` (Full's ⋯ Replace = the same two), `addMediaLayer` returning its layer and taking `opts`, `{noSave}`, `deleteLayer`'s `silent`, `splitLayer`'s optional `t`, `FM.storage.hydrating`, `FM.docRev` counters, `U.setMemberRole` / `U.leaveKeep` (the People menu calls the same helper) | Each keeps Full's default path; prove each with a before/after test on a Full fixture. |
| **I9** | `FM.timeline.edgeScroll` factored from `clipEdgeScroll` / `trimEdgeScroll`; `FM.timeline.stripFor` over the shared cache; `FM.timeline.host()` for presence heads, taps, pointer time, follow scroll, comment marks and media bars (DESIGN §3.8, §8.1, §10.3; BUILD-PLAN §6) | Full answers `host()` with its own elements and maths. **copy** recommended for `edgeScroll` (Simple's own driver), so Full's auto-scroll code is not touched at all. |
| **I10** | Dispatch seams that do nothing unless Simple is on screen: `rebuild` / `updatePlayhead` / `abortGestures`, `syncSelectionChrome`, `dockSheet`, the key rail, `cancelGesturesOn`, the inspector's no-selection branch, the ? list, the export sheet's two hidden items, the `body.ed-simple` CSS, Full's `#timeline` kept laid out under Simple (BUILD-PLAN 1.3.10-1.3.17, CSS) | Each is guarded by `isSimple()` or `body.ed-simple`. |
| **I11** | `FM.editor.syncProject()` at the top of every Full rebuild (BUILD-PLAN 1.3.10, review change 3) | Runs `apply` only when the editor on screen must change; the "off means off" test proves a Full rebuild never flushes or closes a tool. |
| **I12** | The keydown hook (BUILD-PLAN 1.3.14) | Returns false before reading the key unless the swap is enabled; in Full it answers nothing once E is removed (B14). |
| **I13** | `FM.spine.insertAt` saves and restores `FM.addAt` (DESIGN §3.6.1, l.733-738) | Built so Full's Add row stays above the same layer it was above. |
| **I14** | Mute-clip-sound: *"A change to `muted` anywhere else (the inspector, Full, a friend) clears that clip's `muteByMode`"* (DESIGN §3.6, l.635) | Full's mute works as today; one invisible key goes. Better still: no hook in Full; Simple ignores a `muteByMode` whose clip is not muted when the mode turns off. |
| **I15** | `touchCurrent` writes `clips` on this device's index card when adopted or in Simple (DESIGN §7.4) | Per-device index; nothing in Full reads it once V5 is gone. |
| **I16** | `project.sm` written by `FM.projects.create(opts.editor)` and stamped on template / export copies (DESIGN §7.1, §12.2) | Invisible keys. (If V6 goes, `create` writes nothing at all.) |
| **I17** | The host clamps `project.sm.v` in a live room; a newer `sm.v` makes Simple read-only, *"Full stays editable"* (DESIGN §2.3) | Field Full never reads. |
| **I18** | Undo bookkeeping: `{label, ed, arr, adopt}` on steps, `lastStep`, the boolean return, `S.othersSeq` / `st.adopt` (DESIGN §11, §5.3) | Labels are not shown in Full; `st.adopt` exists only on steps Simple makes (once V8 removes Full's Make overlay / Put in the clip row). |
| **I19** | Phase 5's `all: 1` on both host paths; the outbox partition (DESIGN §10.5) | Only txs the Simple runner flags; Full's txs carry no flag and go per op as today. (Goes with Phase 5.) |
| **I20** | The swap itself: the crossfade / morph, the stage height change, the docked sheet closing (DESIGN §6.2-§6.3) | Happens only during the swap, which is the new control. Full after the swap is today's Full. |

---

## 4. Needed by Simple, cannot be contained (N)

| # | Where | Why it cannot be contained | Cost to Full, and the option |
|---|---|---|---|
| **N1** | `SCHEMA_REV` bumps (DESIGN §10.1, §14.2; BUILD-PLAN 1.2.8-1.2.12) | Any sanitiser change needs it, or two builds would normalise one project two ways. | A phone and a Mac on different builds see today's "update to join" until both update. Routine: v17.19 and v17.20 each did the same. |
| **N2** | Phase 6 transitions and clip animations (DESIGN §12.1 l.3277-3328, §17 **D13**) | One document, and preview = export: a Simple-made transition must draw in Full's preview and export too. | A Full person sees transitions a friend added in Simple (no new control in Full: V14). **Options for him:** (a) build Phase 6 as designed; (b) skip renderer transitions; (c) make Simple's transitions out of what Full already draws (overlap + opacity keys), which shortens the video (D13 B). Recommended: decide when Phase 6 comes up. |
| **N3** | `onSplit` inside `FM.splitLayer` (DESIGN §3.6 Split row, §13 #17) | Full's split must not copy a Simple transition onto the second half (it would draw a transition mid-clip) or leave two "ends with the video" songs. | Touches only Simple-made fields; Full-made projects split exactly as today. |
| **N4** | `runStep`'s `st.arr` gate (DESIGN §10.2 door 2, l.2724-2731) | ⌘Z on a Simple-made arranging step while a friend can edit would send the ripple the gate forbids, whichever editor ⌘Z is pressed in. | Full-made steps never carry `arr`. Use Full's existing undo-refusal toast wording in Full, not a new line. |

Not counted: what Simple's edits leave in the document (ripples, Stay-put flags, music fitted with a fade, camera rider keys,
a moved loop region, effect segments as adjustment layers). Full shows and edits those as it does any project.

---

## 5. Can a swap change something that cannot be undone? (his rule 3)

The swap (`FM.editor.set`, DESIGN §6.2; BUILD-PLAN `editor-mode.js`) is stated as *"No document write, no commit, no autosave, no
collab op."* Each candidate, checked:

| # | Candidate | Verdict | Warning? |
|---|---|---|---|
| **S1** | The swap remembers the editor on **this device's** project card (`editor`), plus a per-tab hop flag | Not the document, never synced; swapping back restores it. | No. |
| **S2** | **Adoption** (`project.sm.adopted` + `sm` flags) | Never on a swap: *"The first such command (not the switch, not a tap, not a look edit) runs `FM.spine.adopt`"* (§5.3); Phase 1 writes no flag at all (BUILD-PLAN §13). It rides the first arranging edit's own undo step. In a session, once someone else has edited, ⌘Z no longer removes adoption (§5.3), but adoption moves nothing and Full ignores it. | No warning on the swap. One sentence in "What should you use?" is enough: *"Simple remembers which clips make up the row the first time you move clips."* |
| **S3** | **Gaps** | D8 A (recommended): Simple never closes a gap by itself; the swap writes nothing. Only **D8 B** (*"Simple closes every gap when you switch (this rewrites the project)"*) would make a swap change the project. | None under D8 A. If he ever picks D8 B: *"Switching closes 3 gaps · Switch / Cancel"*. Recommended: keep D8 A, which makes the case impossible. |
| **S4** | **Collab** | The swap sends presence only. It flushes the text editor (an ordinary, undoable step that the friend receives as normal) and closes tools, which releases their leases. Nothing is lost. | No. |
| **S5** | **Settings** | A preview switch (if kept, V7) puts the project in Full and writes nothing. The D3 migration (if kept) runs at first boot, not on a swap. | No. |
| **S6** | **Unfinished tool work closed by the swap** | **REAL.** BUILD-PLAN `apply()` (l.2364) calls `stop()` / `close()` on `cropTool`, `maskTool`, `motionPath`, `touchupTool`. In today's app the crop tool's `stop()` is `cancel()` (`js/crop-tool.js:221`) and touch-up's `close()` is `cancel()` (`js/touchup-tool.js:186`): an unfinished crop box or touch-up box is thrown away, and since it was never committed, **↶ cannot bring it back**. Text (`js/text-edit.js:990`, commit), mask (`js/mask-tool.js:415-420`, commits if changed), points (`js/point-edit.js:458-466`, commits) and motion path (live edits) are safe. | **Fix instead of warn (recommended):** the swap presses Done for an open crop or touch-up first, exactly as it already commits typing, so the result is one undoable step. If he would rather choose: *"Your crop isn't finished · Finish and switch / Stay"*. Add a test: swap with a crop box open, then ↶ restores the uncropped clip and ↷ the crop. |
| **S7** | `project.sm.home`, `sm.v`, any document key | The swap never writes them (§6.2); `homeFor` only reads. With B27 contained, nothing about opening moves either. | No. |
| **S8** | A drag or a slider in Simple still under the finger | The swap is refused (shakes) while a timeline or canvas drag is live (§6.2 a). A Speed slider's live preview is DOM-only until release (§3.8), so dropping it writes nothing. | No. |
| **S9** | One-shot offers in Simple's line (*Keep on the music*, *Do it anyway*, *Arrange anyway*) | They write nothing until tapped; the step they follow stays on ↶. | No. |
| **S10** | A Simple command running, or an export | The swap is refused (§6.2 b, c); the queue is not dropped. | No. |
| **S11** | Undo | *"Switching editors is not a step and does not clear the stack"* (§11): every edit from either editor stays on ↶ after a swap. | No. |

**Make it structural (his rule):** one test asserts that a swap leaves the project JSON, the undo stack length and the collab
outbox byte-identical, in solo and in a live session, at 380 and 1280, with the text editor, crop, mask and touch-up each open in
turn. The crop and touch-up cases fail on BUILD-PLAN's `apply()` as written; that is the S6 fix's proof.

---

## 6. The visualizers

The page is published at the STATUS.md link. These screens show Full changed and must be redrawn. (The pages also call the new
editor **Quick** while DESIGN calls it **Simple**; worth aligning when they are redrawn.)

| # | File | What it shows in Full | Fix |
|---|---|---|---|
| **VZ1** | `vis/kit.js` `playbarHTML` (l.1193-1199) | Every phone frame drawn with `editor: 'full'` gets **⋯ · ✂ · ⇄ · \|◀**: ✂ in ⧉'s slot and the switch in ◐'s slot. Used by V5, V6 and V11's Full screens. | Full frames draw today's **⋯ · ⧉ · ◐ · \|◀**. |
| **VZ2** | `vis/kit.js` `pcFrame` (l.1296-1297) | Full's PC row drawn as ‹ ✂ [switch] \|◀ … | Draw today's PC row. |
| **VZ3** | `v1.js` (l.79, 243-251, 470-476, 520-525) | The switch in Full's slot 3 becomes a back button; the arrival toast *"Full editor · the ‹ button on the play bar takes you back"*; Full's ⋯ opens with *"Quick editor"* first; a long-press editor menu; PC *"‹ Quick"* | Show the swap as the cog's third section; Full's bar untouched. |
| **VZ4** | `v10.js` D2 (l.253-259), D3 (l.260-263), D16 rows 1 and 6, the word table | All four D2 pictures change Full (D only by moving it to ⚙ and Home's ⋯); New project cards; the glyph on cards and Home chips; the back button; Full's layer menu words | Retire D2 (his cog rule answers it); re-ask D3 in its per-device form or drop it; drop D16 row 6; word table Simple-only. |
| **VZ5** | `v11.js` (Phase 1: l.218-251, 482, 718; Phase 3: l.563-582, 689) | Phase 1 Full with the switch / back button and the Settings row; Phase 3 *"New project lets you pick Quick or Full, and the Settings switch goes"* | Redraw Phase 1 with the cog section; drop the cards and the Home chip. |
| **VZ6** | `v12.js` (whole page) | Full's play bar options A / B / C / D, Full on PC with the switch after Back, the back button, the way-back note, the slot-by-slot table | Retire, or rebuild as "the cog's third section at 380, 440 and 1280, solo and with a friend in". |
| **VZ7** | `v6.js` (l.1141-1146, 1171, 284, 321-336, 366, 505, 541-546, 584-585) | Ezra in Full sees *"Sam · Quick"* faces, the *"Sam · clip row"* outline, the toasts *"Sam deleted a clip — your title … was kept (now Stay put)"*, the moved-clip outline, **his playhead moving** (*"your playhead moved with it"*, a B in Full), and the "This is me" mark | Full side shows today's presence only; if Phase 4 is dropped (2g), the before/after-Phase-4 toggle goes too. |
| **VZ8** | `v5.js` (l.249, 309) | Full frame via the kit (VZ1); *"flip the switch on the play bar"* | Kit fix plus copy: *"swap in the ⚙ cog"*. |
| **VZ9** | `v2.js` (l.151-154, 539-540) | New project cards; *"a small Quick or Full label on each project card"* on Home | Follows V5 / V6's outcome. |
| **VZ10** | `v4.js` (l.82) | The switch's tooltip on the play bar (*"Opens this project in Full"*) | Not a Full change (it is Simple's bar), but see the note below. |

`v3`, `v7`, `v8`, `v9` draw no Full change: V7 even says *"Full's edits write those numbers directly, as today"*.

**Not a Full change, but it conflicts with rule 2:** the plan gives the swap other homes too: ⇄ on **Simple's** play bar (D18,
slot 3), E, Home ⋯, the Settings row, and the cog's old "Editor" row. None of the Simple-side ones touch Full, but his words put
the swap *"in the settings cog"*. Whether Simple's own bar keeps a ⇄ is for the cog-section design to settle with him.

---

## 7. What changes in the decision list

- **D2:** retired; his cog rule answers it.
- **D3:** New project cards change Home; re-ask as "a new project opens in the editor this device last used", or drop.
- **D15:** reword without "behind a Settings switch" (V7).
- **D16:** row 1 only for the cog section and Simple; row 6 (back button) goes.
- **D8:** keep A (it is what makes S3 impossible).
- **D14:** "clips next" (Phase 4) = B29-B37; recommended to drop live arranging.
- **D13:** Phase 6 is N2; options above.
- **D19:** keep A (B26).
- **New, for him:** the S6 fix (finish the crop when swapping, or ask).

## 8. What Simple gives up in total, if every containment above is taken

- Moving clips while a friend who can edit is connected (Phase 4–5 dropped). Looks, text, captions and sound stay live.
- Comments made in Full stay at their time through Simple ripples.
- A Simple template or friend's file opens in Full until this device has swapped once.
- Sort by date taken covers only clips added from Simple.
- A Follow or matte through a split clip: one extra ask before a reorder.
- Filling a template from Full leaves gaps, as today.
- No keyboard swap from Full (two taps in the cog).

Nothing Simple shows or edits by itself is lost: every containment keeps Simple's own behaviour and only stops it leaking into
Full.
