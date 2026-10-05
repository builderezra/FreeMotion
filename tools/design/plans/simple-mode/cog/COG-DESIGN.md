# The editor switch: a third block in the settings cog

Planning only. Nothing here is built. Written 1 Oct 2026 for #980, step 7a.

## 0. His words, and what they settle

> "okay so with this new editing layout i just want to make clear that i dont want the original editor changing in design
> and function. some of the tests you showed me mean changing stuff i dont want changed with the original editor. dont do
> that. the option to switch between the two editors should be in the settings cog, making a third section in there. it
> can be a small button that just switches between editors and should have a button that you press that says "What should
> you use?" pressing makes that pannel open up like how the other two pannels currently function, the canvas settings and
> the friends one. so this will just be a 3rd section but it stays small unless you want the explanation. allowing quick
> swapping in editors. also if swapping the editors changes anything that cant be un done make sure theres a warning."

His clauses, and where this file answers each:

1. The original (Full) editor keeps its design and function → §1 (the block only exists while the Simple editor setting
   is on) and §8 (what the rest of the plan must drop).
2. The switch lives in the settings cog, as a third section beside Canvas settings and Friends → §2.
3. It is a small button that just switches → §3.
4. A "What should you use?" button opens the block big, the way Canvas settings and Friends open → §4.
5. It stays small unless he wants the explanation, so swapping is quick → §3 (one tap switches), §5 (the remembered block).
6. If a swap would change something that can't be undone, a warning comes first → §7.

**Measured result (real app v17.21, prototype injected, no app file edited):** with the Editor block small, Canvas settings
and Friends sit on the **same pixels** as today at 440×956 and 1280×800 with either open, and at 380×800 with Canvas open
(largest colour difference 3 of 255, from the blurred video behind). At 380×800 with **Friends** open, and on every phone
shorter than that, they move (§6.4, which DESIGN §21 extended on 1 Oct: 375×553 and 320×568 cost more, and sideways the
Editor tile itself is off screen). *Corrected 1 Oct (DESIGN §21): this paragraph used to say "same pixels … with Friends
open" at 380×800, which §6.4's own table contradicts.*

Pictures (all real-app renders, in this folder):

| File | Shows |
|---|---|
| `1-phone-380-small.jpg` | today beside the cog with the Editor block small, 380×800 |
| `2-phone-380-open-and-switch.jpg` | the Editor block open with the explanation; the moment just after tapping the switch |
| `3-phone-440.jpg` | his phone, 440×956: Editor small, Editor open |
| `4-pc-1280-small.jpg` | today beside the Editor tile, 1280×800 |
| `5-pc-1280-three-states.jpg` | Editor open; Friends open with the Editor tile small |
| `6-pc-1280-warning.jpg` | a crop drawn but not applied, then the switch: the warning; and a switch with nothing to lose (no warning) |
| `7-short-phones.jpg` | the honest cost: 380×667, and Friends open at 380×800 |

---

## 1. When the block exists

**Superseded 1 Oct (DESIGN §6.1, §21): under D22 A (recommended) there is no Settings row, `FM.editor.enabled()` is always
true, and the block is built every time the cog opens; "today's cog exactly" then holds only for Canvas and Friends while the
block is small (§6.4 gives where even that has a cost).** What follows is the D22 B form. **Only while Settings → "Simple
editor" is on** (the Phase 1–2 preview row, BUILD-PLAN §2.1, `state.simpleEditor`). Off is the default and off means today's
cog exactly:

- No `#cv-editor` element at all. It is built by `js/app.js` the first time the dialog opens with the setting on, and
  removed when the setting goes off (the `cvRoleNote` pattern at `js/app.js:8609`, which builds `#cv-ro` only when needed).
- No new CSS rule matches. Every new rule is keyed on `#canvas-dialog.cv-ed-on` (or on `#cv-editor`, which then does not
  exist). `cv-ed-on` is set by `openCanvasDialog` only when `FM.editor.enabled()`.
- `fm.cvPair` keeps answering `canvas | friends`; a stored `editor` reads as `canvas` (§5).

Turning the setting on is his choice to see Simple at all, so the cog gaining a block then is the change he asked for. It is
the only change to anything visible in Full (§8).

---

## 2. Three blocks, one big

The pair becomes a trio. The rule is the pair's rule, unchanged: **one block is big, the others are small, and the one
you open becomes big while the big one shrinks.** Same FLIP flight (`cvPairSwap`, 460 ms, `cubic-bezier(.2,.85,.25,1.06)`).

| State | Big | Small |
|---|---|---|
| S1 (default, and what the cog opens on the first time) | Canvas settings | Editor, Friends |
| S2 | Friends | Editor, Canvas |
| S3 | Editor | Friends, Canvas |

- **Which is big by default:** Canvas, as today. The cog reopens on the last of Canvas and Friends (§5, revised 1 Oct), so
  the Editor block is big only while he is reading the explanation.
- **Small blocks keep one order everywhere:** Editor, Friends, Canvas. With Editor small, Friends and Canvas therefore keep
  exactly today's arrangement relative to each other (Friends above Canvas when Canvas is big; Canvas above Friends when
  Friends is big). The Editor sits away from them, on top.
- Every door keeps its block: the cog opens `last`; the phone's person+, the faces chip and Home's *Share live…* open
  Friends big (`js/collab-ui.js:1498`); the oversize warning opens Canvas big. **Nothing opens the Editor block except the
  cog's own "What should you use?"** (and a tap on its bar away from the switch).

---

## 3. The small Editor block

### 3.1 What it shows

**Phone (a 64 px bar, the same height as the other two bars):**
`[editor icon] [ Simple ⇄ Full ]  ·····  [What should / you use?]`

**PC (a 176 px tile, the same width as the Friends tile):**
`[editor icon] Editor` / `[ Simple ⇄ Full ]` / `[What should you use?]`

The phone bar has no "Editor" title: at 380 px the icon (38) + switch (146) + button (≈92) + paddings already use 332 of
356 px, and the switch's own two words name it. The PC tile has room, so it says *Editor*.

### 3.2 The switch: one button, both words, the current one lit

- One `<button>`, not two segments: it shows **Simple ⇄ Full**, and a filled accent knob sits behind the editor you are
  **in**. The other word is dim. Tapping anywhere on it switches (his "small button that just switches").
- `aria-label` and `title` name the action: *"Switch to Simple editor"* / *"Switch to Full editor"*. A polite live region
  says *"Simple editor"* / *"Full editor"* after a switch.
- Size: 36 px tall (44 in the big block), 7 px invisible catch above and below (50 px to hit, the `.cv-mini-exp::before`
  pattern). Knob slides 220 ms `cubic-bezier(.2,.8,.2,1)`; with reduced motion it jumps.
- **Tapping the switch never opens or swaps the block** (it stops propagation, as `#cv-mini-app` does at `js/app.js:7138`).
  A tap anywhere else on the bar opens the block big, like the Friends and Canvas bars.

### 3.3 What a tap does

1. `FM.editor.request(to, { from: 'cog' })` (§7) works out what the switch would change.
2. Nothing to lose (almost always): the knob slides, the editor behind changes at once (`FM.editor.set`, BUILD-PLAN §5.3:
   no document write, no undo step, no autosave, no collab op).
3. **~260 ms later the cog closes itself** (through `cvClose`, the one close), so he lands looking at the new editor. Two
   taps total: cog, switch.
   - **Except** when the Canvas block holds picks he has not applied, or Friends is the big block: then the cog stays open,
     so Apply or Cancel stays his and nothing is thrown away. "Picks he has not applied" is a fingerprint of every pending
     value (aspect, size, custom W/H, fps, **background**) taken when the cog opened and compared on the tap, **not**
     `cvSummary()`: the summary leaves the background out (`js/app.js:8372-8377`), so a background pick would have been
     thrown away by the auto-close (DESIGN §21 F3). This is not a warning: the project is unchanged either way.
4. The first time per device that he lands **in Simple** only, a non-interactive toast (`FM.toast(msg, 2600)`, no `onTap`):
   *"Simple editor. Switch back any time from the ⚙ cog."* Landing in Full shows nothing (DESIGN §0.4 V4; *corrected 1 Oct,
   §21: this item used to toast in both directions, which put a new toast into Full*).

**Refused** (the switch shakes once and the line under it says why, inside the block, not as a toast behind the dialog,
the #921 S7 lesson at `js/app.js:8605`): an export running (*"Wait for the export to finish"*), the voice recorder open
(*"Close the recorder first"*, DESIGN §21 F2), a Simple command in flight (*"One moment…"*), a timeline or canvas drag live (shake only).

---

## 4. "What should you use?" opens it big

Pressing it (or the bar away from the switch) runs the same swap the other two use, with a third case: the Editor block
grows, the big block shrinks to its bar (phone) or tile (PC), and the third small block moves to its small place. The block
it lands on stays until he opens another.

### 4.1 The words (D1's recommended names; change both together if he picks other names)

**What should you use?**

`[ Simple ⇄ Full ]` (the same switch, larger) · *You're in Full*

**Simple** — Clips one after another, with text, captions and music. Gaps close up by themselves. Best for a quick video,
or if you've never edited.

**Full** — Everything FreeMotion does: layers anywhere, keyframes, masks, 3D and every effect. For animation, and anything
Simple can't do.

*Same project in both. Nothing is converted, and you can switch back any time.*

- Each option is a card with a 64×34 picture (a row of clips under a title pill; staggered layer bars). The current one
  has an accent edge and a *You're here* tag. The cards are not buttons: the switch is the one control, so there is one
  thing to learn.
- Measured: no scrolling at 380×800 (445 px block) or 440×956 (427 px) or on PC (360×427).
- "Nothing is converted" is the plan's own promise (DESIGN §5.1: a view, not a conversion). It stays true only while §7's
  guard holds.

---

## 5. Reopening on the last block

**Revised 1 Oct (DESIGN §21 F7): the Editor block is never remembered.** His words are *"it stays small unless you want the
explanation"*, so the cog reopens on the last of **Canvas and Friends**, exactly as today: `cvPairApply('editor')` does not
write `fm.cvPair`, and `cvPairLast()` (`:8368`) is **not changed at all**. So the cog opens the way it opens today for
everyone, whatever he looked at last time, and the explanation is one tap away. (The earlier form stored `editor` and reopened
on the explanation; an older build would have read it as Canvas, but nothing now writes it.)

---

## 6. Layouts

### 6.1 Phone (≤ 700 px), stacked

```
 S1 (Canvas big)        S2 (Friends big)       S3 (Editor big)
 ┌ Editor bar ─────┐    ┌ Editor bar ─────┐    ┌ Friends bar ────┐
 ┌ Friends bar ────┐    ┌ Canvas bar ─────┐    ┌ Canvas bar ─────┐
 ┌ Canvas card ────┐    ┌ Friends block ──┐    ┌ Editor block ───┐
 │                 │    │                 │    │ What should you │
 └─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **Order:** Editor `order: -2` while small, `1` while big; Friends and Canvas keep their rules (`styles.css:3655`).
- **Canvas and Friends keep their exact place.** The column is centred today (`styles.css:3575-3578`), so a plain third
  bar would push the pair 38 px down. Instead, with `cv-ed-on` the column is centred in a box one bar (76 px) shorter at the
  bottom, and where it does not fit it starts at the 96 px top reserve: a **safe centre**, made with two growing spacers
  (`::before`/`::after`, `flex: 1 1 0`, `order: ±10`, each with a `-10px` margin to cancel the column gap) rather than
  `justify-content: safe center`, whose Safari support is not something to bet his phone on. Measured: Friends bar at y 224
  and Canvas card at y 300 at 380×800, with the block off and on.
- **The big block's cap** (`styles.css:3715-3720`, today `100svh - 182px`) becomes `100svh - 260px` with `cv-ed-on`: the
  top reserve 96, two bars 2×(66 + 10), the bottom 12. Apply is never pushed off.
- The top reserve (96 px: the top bar and the people chip stay backdrop, `styles.css:3705-3708`) is untouched.

### 6.2 PC, side by side (the cog's right edge ≥ 562 px, today's `CV_SIDE_NEED`, `js/app.js:8355`)

Today: Friends left, Canvas right by the cog; the big one 360 wide, the small one a 176 tile at the foot. Three blocks keep
that and add **the small column**: the 176 px column holds both small tiles, stacked, the one by the cog's row where today's
tile is, the Editor tile above it.

```
 S1                         S2                          S3
 ┌Editor┐ ┌──────────────┐  ┌──────────────┐ ┌Editor┐   ┌──────────────┐ ┌Friends┐
 └──────┘ │ Canvas       │  │ Friends      │ └──────┘   │ Editor       │ └───────┘
 ┌Friend┐ │ settings     │  │              │ ┌Canvas┐   │ What should  │ ┌Canvas┐
 └──────┘ └──────────────┘  └──────────────┘ └──────┘   └──────────────┘ └──────┘
                     ⚙ cog                       ⚙ cog                          ⚙ cog
```

CSS grid, two columns, two rows (`1fr auto` opening upward; `auto 1fr` opening downward, so the tile by the cog's row is
always the one in today's place):

| State | columns | areas (opening up) | areas (opening down) |
|---|---|---|---|
| S1 | `176px 360px` | `"ed cv" "fr cv"` | `"fr cv" "ed cv"` |
| S2 | `360px 176px` | `"fr ed" "fr cv"` | `"fr cv" "fr ed"` |
| S3 | `360px 176px` | `"ed fr" "ed cv"` | `"ed cv" "ed fr"` |

- **No extra width.** Side by side starts at the same window size as today, so no window that shows the pair side by side
  today shows it stacked tomorrow. (A three-column row was considered: no tile ever crosses, but it needs 748 px left of the
  cog, so windows between ~744 and ~930 px would fall back to stacked and change how Canvas and Friends look there.)
- Canvas stays in the right column in every state, so the comic tail keeps hanging from `cvCard` (`cvAnchorBlock`,
  `js/app.js:8358`, unchanged for side by side).
- Measured at 1280×800: Canvas `780,195 360×361` and the Friends tile `594,389 176×167` with the block off and on (S1);
  Friends `594,16 360×540` and the Canvas tile `964,340 176×216` off and on (S2). The Editor tile is 176×159.
- The swap's flight: in S1→S2 and S1→S3 one small tile changes column (it flies across the shrinking block). The FLIP
  already animates `left`/`width`/`top`/`height` (`js/app.js:8450-8454`), so this is the same code with a third rect; a
  tile that stays small keeps its bar visible all the way (no cross-fade).

### 6.3 PC, stacked fall-back (cog right edge < 562 px)

As today's fall-back (`styles.css:8480-8488`): the small blocks sit away from the cog, the big one next to it. Editor small
is `order: -2` opening upward, `order: 2` opening downward; Editor big is `order: 1` upward, `order: -3` downward. Each
big-block cap there loses another 76 px (`- 76px` becomes `- 152px`).

### 6.4 Where the third bar costs room (picture 7)

| Screen | Canvas open | Friends open |
|---|---|---|
| 440×956 (his phone) | same pixels | same pixels |
| 380×800 | same pixels | Friends block 573 → 540 px tall, scrolls 33 px; bars move down 54 px |
| 380×667 | same size, 15 px lower | (shorter again) |
| 1280×800 | same pixels | same pixels |
| 375×553, 320×568 (DESIGN §21) | Canvas 72 px lower and 68 px shorter (361 → 293 at 375): Background and Size scroll, Apply stays | Friends 72 px lower, 371 → 293 |
| sideways: 956×440 (his phone), 932×430, 844×390, 1024×600 (Friends open) (DESIGN §21) | Canvas and Friends: same rects | same rects; **but the Editor tile is off screen** (top −109 at 956×440; bottom past the window at 844×390), so the switch cannot be reached. D24 |
| 1366×650, 1440×900, 768×1024, 720×800 (DESIGN §21) | same rects, Editor on screen | same rects, Editor on screen |
| PC, the Canvas ↔ Friends swap itself | rest states the same | the Editor tile **changes column during the flight** (S1 ↔ S2), so today's swap gains a third moving tile (§6.2). D24 |

There is no layout that adds a 66 px bar to a full screen for free. The alternatives cost more: a shorter Editor bar breaks
the three bars' matching look, and sharing a row with the Friends bar changes the Friends bar.

---

## 7. The swap writes nothing; the warning when it would

### 7.1 What a switch does change

| Change | Undone by | Warning? |
|---|---|---|
| `body.ed-simple`, the timeline and inspector redrawn | switching back | no |
| This device's card remembers the editor for this project, and `fm.editor.last` (BUILD-PLAN §5.3 `remember`) | switching back | no |
| Presence `ed` sent in a live session (not an op) | switching back | no |
| `fm.cvPair`: **never** for the Editor block (§5, revised) | — | no |
| Adoption (`FM.spine.adopt`, DESIGN §5.3) | **never written by a switch**: only the first arranging edit adopts | no (T1 proves no `sm` key moves) |

### 7.2 What closing things on the way could change (DESIGN §6.2's "closed first", read against the code)

| Open when he switches | What closing it does today | Undoable? | Warning? |
|---|---|---|---|
| Crop box moved, not Done | `FM.cropTool.stop()` = `cancel()` (`js/crop-tool.js:221`): **the box is thrown away** | no | **yes** |
| Touch-up box, not Done | `FM.touchupTool.close()` = `cancel()` (`js/touchup-tool.js:186`): **thrown away** | no | **yes** |
| Pen (vector) drawing, not Done | the draw tool's `stop()` clears `points` (`js/draw-tool.js:698`): **thrown away** | no | **yes** |
| The voice recorder open (any state) | **a switch does not close it** (no code path in `apply()` does), and `#vr-overlay` is `position: fixed; inset: 0; z-index: 190` (`styles.css:7530`), over the cog; so a switch is **refused** while it is open (*"Close the recorder first"*), never warned (DESIGN §21 F2) | — | refused |
| Sketching (freehand draw) | strokes are committed one by one; the session's own ↷ (`histFuture`, `js/draw-tool.js:562`) would die with the tool, so a switch **leaves the tool open** (it is in no close list) | — | no (nothing closes) |
| Text editor with typing | `FM.textEdit.stop()` commits (`js/text-edit.js:990`) | yes (one step) | only if Redo has steps (below) |
| Mask points changed | `stop()` flushes and commits if dirty (`js/mask-tool.js:415-420`) | yes | only if Redo has steps |
| Edit Points | `stop()` commits (`js/point-edit.js:458-470`) | yes | only if Redo has steps |
| A camera wheel-zoom still settling | `FM.flushPendingCommit` commits (`js/canvas-edit.js:743`) | yes | only if Redo has steps |
| Motion path, graph editor, tracker pick | nothing written (edits already committed live; a graph drag is "taken away", `js/graph-editor.js:424`) | — | no |
| Anything, while Redo (↷) has steps | any commit above drops the redo tail (`js/history.js:291`, `stack.splice(index + 1)`) | **no** | **yes** |

**Reachability, measured** (`probe-tools.js` in the QA scratch): on the **phone** the cog (`#m-settings`) is hidden while a
layer is selected and while crop, touch-up, mask or the text editor is open, and the recorder covers it, so from the cog
the warning is practically a **PC** event. On **PC** the cog stays reachable with crop, touch-up, mask and the text editor
open. The guard still covers every door (the Settings flip, any future one), because it lives in `FM.editor`, not the cog.

### 7.3 The guard (structural: the swap computes whether it writes anything; if it would lose something, it asks first)

```js
// js/editor-mode.js — replaces BUILD-PLAN §5.3 apply()'s blind stop()/close() loop
const HOLDS = [   // every tool that can hold work that is NOT in history yet; closing it would lose that work
  { id: 'crop',    live: () => FM.cropTool && FM.cropTool.isActive() && FM.cropTool.changed(),   keep: '#crop-bar .cb-done',  name: 'crop' },
  { id: 'touchup', live: () => FM.touchupTool && FM.touchupTool.isOpen() && FM.touchupTool.changed(), keep: '#touchup-bar .cb-done', name: 'touch-up' },
  { id: 'pen',     live: () => FM.drawTool && FM.drawTool.active && FM.drawTool.mode === 'vector' && FM.drawTool.points.length > 0, keep: '<draw bar Done>', name: 'drawing' },
];   // 1 Oct (DESIGN §21 F1, F2): the pen's Done is '#draw-bar .db-done' (js/draw-tool.js:788), and a pen under 3 points is
     // discarded by FM.drawTools.stop() on "Switch anyway" (its Done does not close it); the voice take is not here: the
     // recorder is a full-screen overlay a switch never closes, so busyReason() refuses while FM.voiceRec.isOpen()
const COMMITS = [ /* text editor dirty, mask dirty, points open, wheel pending: closing them makes one undo step */ ];

FM.editor.plan = function (to) {
  const p = { to, refuse: busyReason(), lose: [], steps: 0, writes: ['card.editor'] };
  HOLDS.forEach(h => { if (h.live()) p.lose.push(h); });
  p.steps = COMMITS.filter(c => c.live()).length + p.lose.length;   // applying a held thing is a step too
  if (p.steps && canRedoNow()) p.lose.push({ id: 'redo' });  // a step now would drop ↷ for good. canRedoNow() mirrors
                                                              // js/history.js:208: FM.collab.canRedo() in a session
  return p;
};
FM.editor.request = async function (to, o) {
  const p = FM.editor.plan(to);
  if (p.refuse) { say(p.refuse); return false; }
  if (p.lose.length) {
    const ok = await FM.ask(warning(p));               // §7.4; Stay / Escape / the scrim answer null
    if (!ok) return false;                             // nothing touched
    for (const h of p.lose) if (h.keep) press(h.keep); // the tool's OWN Done: exactly what Full does, one undo step each
  }
  return FM.editor.set(to);
};
// …and apply() itself, which every path reaches (set, the Settings flip, a project opening):
//   if (HOLDS.some(h => h.live())) return refuse('unsettled');   // NEVER stop()/close() a tool that holds work
```

Why this is structural, not remembered:
- **`apply()` can no longer throw work away.** It only closes tools whose `live()` is false; a held tool makes it refuse.
  So no door, today's or a future one, can discard a crop silently: it either went through `request()` (and asked), or
  it is refused.
- **Pressing the tool's own Done** means the switch adds no new way to apply anything: Full's Done buttons, unchanged.
- **The tool list is checked against the app's own list of canvas tools** (T2): every tool in collab-presence's `LEASED`
  table (`js/collab-presence.js:193-203`) must be classified by the switch as *holds*, *commits* or *writes nothing*. A new
  tool added to the app without a classification fails the suite.
- **The "writes nothing" claim is measured on every switch in the suite** (T1): history depth, autosave calls, collab ops
  and storage keys before and after; only `card.editor` may change.

Two read-only getters are needed: `FM.cropTool.changed()` and `FM.touchupTool.changed()` (the box differs from where it
started). They change nothing Full does; without them an untouched crop box would warn for nothing.

### 7.4 The warning's words (through `FM.ask`, `js/ask.js:117`: the app's own pop-up, z 3200, above the cog)

| Case | Title | Message | OK | Cancel |
|---|---|---|---|---|
| crop | Switch to Simple? *(or Full)* | Your crop isn't applied yet. Switching closes the crop tool, and Undo can't bring the box back. | Apply crop and switch | Stay |
| touch-up | Switch to Simple? | Your touch-up isn't applied yet. Switching closes it, and Undo can't bring the box back. | Apply touch-up and switch | Stay |
| pen, ≥ 3 points | Switch to Simple? | Your drawing isn't finished. Switching closes the pen, and Undo can't bring the points back. | Finish drawing and switch | Stay |
| pen, < 3 points | Switch to Simple? | Your drawing has only 2 points, so it can't be kept. Switching throws it away. | Switch anyway | Stay |
| ~~voice take~~ | — | refused instead (§7.2): *"Close the recorder first"* inside the block | — | — |
| redo | Switch to Simple? | Switching saves what you just did as a step, so Redo can't bring back the 3 steps you undid. | Switch anyway | Stay |
| several | Switch to Simple? | one line per case above | Apply them and switch | Stay |

Stay, Escape and a tap on the dim area leave everything exactly as it was (the tool still open, the box where it was).

---

## 8. What this means for the rest of the plan (for the DESIGN / BUILD-PLAN patch, not done here)

His rule 1 plus "the option to switch … should be in the settings cog":

- **D2 is settled: the cog.** Drop D2-A/B/C/D. Full's play bar, Full's ⋯ strip (`#opt-bar`) and the stage get nothing:
  no ⇄, no ⋯ item, no back-to-Simple button in slot 3, no hop toast (DESIGN §6.1). The V12 measurements of `#opt-bar`
  stop mattering.
- **The E key in Full is a new function in Full.** Recommended: no E (BUILD-PLAN §5.3 `onKey`); the cog is the switch.
- **"Open in Full" from an item in Simple (the hop)** can stay as a Simple-side button, but the way back is the cog; the
  `ed-back` class and slot-3 button go.
- **BUILD-PLAN §5.3 `apply()`** loses its `['cropTool', …].forEach(stop/close)` loop for §7.3's guard, and
  `onPreviewFlip()` goes through the same guard.
- **Simple's play bar ⇄ (D18).** His words put the switch in the cog. Recommended: the cog in both editors, so there is one
  place to learn, and Simple's slot 3 is free. (Question C2 below.)
- **Home ⋯ "Open in Simple / Open in Full"** is on Home, not in the editor; it can stay (behind the same setting).

---

## 9. Code plan (anchors are v17.21; re-find by the quoted text if the tree moved)

### 9.1 `index.html`
Nothing in the markup. The block is built in JS (§1), so with the setting off the DOM is today's. Bump `app.js`,
`styles.css` and `editor-mode.js`'s `?v=`.

### 9.2 `js/app.js` — the pair's functions each get a third case

| Anchor | Today | Change |
|---|---|---|
| `:8347-8351` `const cvCard … cvFrBar` | the two blocks | `let cvEd = null, cvEdBar = null, cvEdBody = null;` and `cvEdBuild()` / `cvEdDrop()` (§1), building the bar (§3.1) and body (§4.1) with `textContent` and fixed SVG strings only |
| `:8358` `cvAnchorBlock` | side → card; stacked → big | stacked → `{canvas: cvCard, friends: cvFr, editor: cvEd}[cvPairBig()]` |
| `:8368` `cvPairLast` | `friends` or `canvas` | **unchanged** (§5, revised 1 Oct: the Editor block is never remembered) |
| `:8369` `cvPairBig` | reads `cv-fr-big` | reads `cv-ed-big` first |
| `:8381` `cvPairApply(big)` | toggles `cv-fr-big`, `aria-expanded` on two ⤢ | toggles `cv-ed-big` too; `aria-expanded` on `#cv-ed-what`; paints the switch state; **does not write `fm.cvPair` when `big === 'editor'`** |
| `:8397` `cvPairSettle` | clears inline styles on two blocks | three (`[cvCard, cvFr, cvEd].filter(Boolean)`) |
| `:8409` `cvPairSwap(to)` | FLIP of two blocks; grow / shrink | FLIP of the blocks present; a third role, **stays small**: rect flies, its bar stays opaque, no content fade |
| `:8463-8464` bar listeners | two | `cvEdBar` click → `cvPairSwap('editor')`; the switch stops propagation and calls `FM.editor.request` |
| `:8552` `openCanvasDialog(o)` | `o.block` friends / last / canvas | `cv-ed-on` toggled from `FM.editor.enabled()`; `cvEdBuild()` when on; `o.block === 'editor'` accepted |
| `:8582` `cvClose` | one close | unchanged (settle covers the third block); the switch's auto-close calls it |
| `FM.settings.onChange` `:8600` | re-hangs the pair | also `cvEdDrop()` when the setting went off while the dialog is open, landing on Canvas |

`cvPlace`, `cvOnWidth`, `CV_SIDE_NEED` need **no change** (the small column fits today's width).

### 9.3 `styles.css` — new rules only, every one keyed on `.cv-ed-on` or `#cv-editor`
- After `:3698` (the width-free pair block): show/order/state rules, the switch, the "What should you use?" button, the
  explanation cards (prototype `proto.js` has them verbatim).
- Inside the phone block `:3705-3721`: the Editor's width, the safe centre (§6.1), the `260px` cap.
- Inside the PC block after `:8516`: the small-column grid (§6.2), the tile's insides, the stacked fall-back orders and caps.
- `prefers-reduced-motion` block `:8524`: the knob without transition; the tile without `cv-grow`.

### 9.4 `js/editor-mode.js` (new in BUILD-PLAN step 1.3)
`plan()`, `request()`, `HOLDS`, `COMMITS`, the guarded `apply()`, the warning words (in `js/spine-words.js` with the others).

### 9.5 Read-only getters
`js/crop-tool.js:183` `FM.cropTool.changed()`; `js/touchup-tool.js` `FM.touchupTool.changed()`. Nothing else in Full's
tools changes.

---

## 10. Tests (each fails with its source reverted; run at 1280 and 380)

| # | Name (`980 cog …`) | Catches |
|---|---|---|
| T1 | the switch writes nothing: 10 switches both ways leave history depth, autosave calls, collab ops and every storage key unchanged except this device's card `editor` and `fm.editor.last`; no `sm` key moves; `fm.cvPair` unchanged | any commit, save, op or adoption sneaking into a switch |
| T2 | every canvas tool in collab-presence's LEASED list is classified by the switch (holds / commits / nothing) | a new tool the guard has never heard of |
| T3 | a changed crop box + switch → the warning with the §7.4 words; Stay leaves the crop open with the same box and the editor unchanged; "Apply crop and switch" commits exactly one undo step, ↶ restores the old crop, and the editor switched | the silent discard (BUILD-PLAN §5.3's loop) |
| T4 | an untouched crop box + switch → no warning, the crop closes, no step | over-warning |
| T5 | Redo has steps + typing in the text editor → the redo warning; Redo has steps and nothing open → no warning, and ↷ still works after switching there and back | the redo tail lost silently; a switch that eats ↷ by itself |
| T6 | the Settings flip off with a crop box changed → asks too (same guard), or is refused; never discards | the second door |
| T7 | setting off: no `#cv-editor`, no `cv-ed-on`, and every element in `#canvas-dialog` has today's computed style (snapshot) | a rule leaking into Full's cog |
| T8 | Editor small: the Canvas card and Friends block have the same rects as HEAD, Canvas open and Friends open, at 440×956, 1280×800, 1366×650, 1440×900, 768×1024, 956×440, 932×430, 844×390, 1024×600; at 380×800 (Friends open), 380×667, 375×553 and 320×568 they equal §6.4's measured numbers ±1 px; **and the Editor tile's switch is fully on screen and `elementFromPoint` finds it at every one of those sizes** (red today at 956×440, 932×430, 844×390: D24) | the pair moving; an unreachable switch |
| T9 | all six swaps S1↔S2↔S3 land the right big block, `aria-expanded` right, the flight lands; `fm.cvPair` is remembered for Canvas and Friends and **never** for the Editor; after closing on the Editor block the cog reopens on the last of Canvas / Friends | the third case missing from one function; the explanation coming back by itself |
| T10 | tapping the switch does not open the block; the bar elsewhere and "What should you use?" do | a switch tap opening the explanation |
| T11 | after a switch the cog closes; with an unapplied aspect pick, **or an unapplied background pick alone**, or with Friends big, it stays open and the pick (or the Friends block) is still there | a quick switch throwing away canvas picks (the background is the case `cvSummary()` misses) |
| T12 | every block on screen, Apply reachable, no sideways scroll, every control ≥ 44 px to hit, at 380×667, 380×800, 440×956 | phone fit |
| T13 | export running → the switch refuses with the line inside the block (`elementFromPoint` finds it, not a toast under z 100) | an invisible refusal |
| T14 | a Viewer in a live session can switch; no op is sent | switching treated as an edit |
| T15 | reduced motion: knob and swap instant | motion for someone who asked for none |

---

## 11. Questions for Ezra (each has a recommendation; "do recommended" answers both)

*Both answered in DESIGN.md (1 Oct): C1 became D23; C2 is settled by his words (the cog only), DESIGN §6.1.*

- **C1 After a switch, the cog:** **A closes, so you see the new editor (recommended)**; it stays open only when Canvas
  settings has picks you have not applied · B stays open until you close it.
- **C2 Other ways to switch:** **A the cog only, in both editors (recommended)**: nothing is added to Full, one place to
  learn · B Simple's play bar keeps a ⇄ too (Full still gets nothing).

## 12. How the pictures were made

`tools/shot.py` against `tools/serve.sh 8790` (v17.21), with a throwaway `proto.js` injected (it builds `#cv-editor`, adds
the CSS above, and opens the cog the real way: `#m-settings` / `#btn-settings`). No app file was edited. The crop warning
used a real `FM.cropTool` box on an in-memory picture layer. Off/on pixel comparisons were made on the same crops of the
two screenshots. Scratch files (frames, `proto.js`, `compose.py`, `probe-tools.js`) are in the session scratchpad under
`simple-mode-qa/cog/`, not in the repo. The server and every Chrome were stopped afterwards.
