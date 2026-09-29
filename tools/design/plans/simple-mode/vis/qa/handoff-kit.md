# Handoff from the kit fix (29 Sep)

The QA defects filed against `kit.js` / `kit.css` are fixed there. A few need a line changed in a page file, which
the kit fix was not allowed to touch. Each is small; none blocks the kit fix.

## What changed in the kit (so a page owner knows what moved under them)

- **Project tools:** the kit's `look` tool now reads **Look for all** (DESIGN §8.5, §8.9). A long name wraps onto a
  second line under its own icon (the rule V2 had locally now lives in `kit.css`).
- **Main-clip tray (`VIS.CLIP_TRAY`)** is the whole §8.5 row: Speed · Volume · Lift off · Look · Crop · Length ·
  Move earlier · Move later · Effects · Replace · Duplicate · Reverse · Take sound out · Delete. The tray scrolls
  sideways (touch, and the mouse wheel) and 🗑 stays pinned at the right end with a fade before it.
  New tool ids: `length`, `earlier`, `later`, `effects`, `replace`, `duplicateClip`, `reverse`, `soundout`.
  The clip's copy is `duplicateClip`, not `duplicate`, on purpose (see V4 below).
- **The switch icon** shows the editor you are in: `VIS.icon('quick')` (a row of clips), `VIS.icon('full')` (stacked
  bars), `VIS.icon('backQuick')` (‹ plus the clips). The paths are V1's. `VIS.icon('editor')` is now the Full mark
  (stacked bars) everywhere a page means Full (Open in Full, the Full card on New project).
- **Phone frames draw at the page's width** down to 340 px and only scale below that, so a 380 px screen shows the
  tool names at their real 10 px instead of 8.4 px. The play bar uses the app's 31 / 28 px tiers when narrower.
  `f.scale` is still the scale; pages that convert coordinates with it are unaffected.
- A hidden frame no longer resizes itself (the V1 "three side by side" overlap).
- **Notes hides** (visibility) while a clip or item is picked in a Quick timeline. The kit reads it from the drawing
  (`.fm-quick .sel`), so no page call is needed.
- **Gap and overlap chips** sit in the middle of their gap or overlap, in the band between the tiles' lengths and names,
  so they cover no words. They are 21 px tall now, but you can still tap anywhere in a ~44 px area.
- **Short chips in Quick's sections** let their name run past the chip's end, up to the next thing in that lane. A
  caption line with room for fewer than three letters shows no words (they are in its title, and on the picture),
  never "H…". At a page's 'fit' zoom Beach day's first captions are still blank. Only a bigger `pxPerSec` fixes that.
- **Phone frames refit on the next frame**, not inside the ResizeObserver, which removes the "ResizeObserver loop
  completed with undelivered notifications" console warnings.
- **Hub:** pages are listed in number order (V1 … V12); V10, V11 and V12 share one group, **Next steps**; V12 is named
  **Buttons on the video** (the hub's name wins over the page's registered one).
- **Engine:** Insert (and Append, Put in the clip row, a lengthening trim) now keeps a caption that ends at the seam
  before the new clip. V9's "So cold!" case now shows its words before and after Ice cream, never over it.

## Page files that need a line changed

1. **`v9.js`** (the engine is fixed, so this is now dead text): remove the apology in the check at ~line 418
   (*"This is a slip in the maths these pages run on, not in the design, and it has been reported."*) and the
   `slip` branch in the insert step text at ~line 526-530 (*"the maths on this page gets the first half wrong"*).
   Neither shows any more (the check passes), but the words should not stay in the file.
2. **`engine-tests.js`**: add the missing case, so this cannot come back silently. In the SAMPLE checks:
   ```js
   { const d = VIS.sample('beach'); d.layers.find(l => l.id === 'cap').captions.find(x => x.text === 'So cold!').end = 7.4;
     const ed = E.editor(d); const r = ed.run('insert', { clips: [{ name: 'Ice cream', duration: 2, srcDur: 7.5 }], at: 2 });
     const cap = ed.doc.layers.find(l => l.id === 'cap');
     const over = cap.captions.filter(q => Math.min(cap.start + q.end, 9.1) - Math.max(cap.start + q.start, 7.1) > 1e-6);
     ok(r.ok && over.length === 0, 'insert at a cut a caption runs across: no words over the new clip (Q20)');
     ok(cap.captions.filter(q => q.text === 'So cold!').length === 2, 'the caption splits into a part before and a part after'); }
   ```
   Also worth one case where the cue ends exactly on the seam (`end = 7.1`) and one lengthening `trimTail`
   (`{ id: 'c2', dur: 5.7 }`): the first half must stay at 5.6–7.1. All three failed before the fix and pass now
   (checked with a throwaway JXA script against the old and new kit).
3. **`v4.js`**
   - line ~67 `ACT.switch`: icon `'editor'` → `'quick'` (V4's phone is in Quick, and the switch shows the editor you
     are in; `'editor'` is now the Full mark).
   - `TRAY_WHAT` (~line 57): add words for the new tray tools, e.g. `length: 'Set the exact length'`,
     `earlier: 'Moves it one place earlier'`, `later: 'Moves it one place later'`, `effects: 'An effect on just this
     clip'`, `replace: 'Swap the footage, keep its place'`, `duplicateClip: 'A copy right after it'`,
     `reverse: 'Plays it backwards'`, `soundout: 'Puts its sound in the sound row'`.
   - `onTray`: the new ids do nothing but light their twin, which is fine for this page. Do not map
     `duplicateClip` onto the existing `duplicate` branch: that branch copies an item and deletes `sm`, which would
     turn a clip into an overlay. Use `run('duplicate', { id: S.sel })` if it should act.
   - The "N of N tools match" line now counts 14 tray tools (it was 6).
4. **`v2.js`**: `PROJECT_TOOLS` (line ~151) no longer needs to relabel Look; `VIS.QUICK_TOOLS` says "Look for all".
   Its `.fm.v2-root .fm-tools` wrap rules (~line 211) now duplicate `kit.css` and can go. `CLIP_TOOLS` can become
   `VIS.CLIP_TRAY` (same order; the kit's Duplicate id is `duplicateClip`).
5. **`v3.js`** (~line 548): its main-clip tray is its own list (Speed · Move earlier · Move later · Duplicate ·
   Lift off, plus the bin), so V3 still differs from V1, V2 and V4. Use `VIS.CLIP_TRAY`'s order and names, keeping
   V3's working actions on `speed`, `earlier`, `later`, `lift` and `delete` (and its Close gap / Fix extra).
   Its Move earlier / later use the back arrow icon; the kit now has `earlier` / `later` icons.
6. **`v11.js`**
   - line ~811 *"Tap ⇄"*: the switch shows the clips icon, not ⇄ (§6.1 says no "⇄" in the words). Say *"Tap the
     switch"*, or draw the icon inline with `VIS.icon('quick')`.
   - `v11.css` line 71 `.v11-mock .fm-fit-outer { aspect-ratio: 394 / 585; contain: size; }` fixes the phone's
     shape, so the kit keeps those phones at the old scaled size (a narrower phone would be cut off at the bottom).
     To get true-size text in V11's phones, drop the fixed aspect and let the frame set its own height.
7. **`v12.js`** lines 171-172: registered `title: 'The chrome check'`, `group: 'Chrome check'`. The hub already shows
   **Buttons on the video** in group **Next steps**; change the registration (and the file's header comment) to match,
   and the `hub: true` override in `kit.js` PLAN.v12 can then go.
8. **`v6.js`** line 29: `PPS` is fixed for a 380 px phone. Phones now draw at the page's width (down to 340), so on a
   380 screen the timeline is ~40 px wider than its view and scrolls a little. Compute it from
   `f.timeline.clientWidth` if it should fit exactly.
9. **`index.html` / `preview.html`** (optional, from handoff-index.md): `initHub` now starts the page list folded on a
   phone itself (`details.open = wide.matches`), so the `foldList()` workaround in index.html can go.
10. **`v1.js`** (optional): its own `GL` glyphs are the kit's `quick` / `full` / `backQuick` now; `VIS.icon(...)`
   would keep the two from drifting.

## For the design, not a file

- **Effects is in both rows.** DESIGN §8.5's main-clip tray lists Effects, and the project tools list Effects too
  (§8.5c says the two differ: segments vs. an effect on the clip). With a clip picked, both are on screen with the
  same face word, which §8.5's own one-home rule and T20 forbid. The kit follows the §8.5 table as written; the
  word (or the tray entry) is a design call.
- **D16's recommended switch glyph is the filled set** (V10: `qA` / `fA`), while V1, V12's screenshots and now the kit
  draw the outlined clips. Whichever he picks, the kit's `quick` / `full` / `backQuick` paths are the one place to
  change.
