# PC: the cog opens Canvas settings AND Friends, and the two swap cleanly

Planned 28 Sep 2026 by the planning chat. **Nothing in the app was edited.** Every picture is the real app (dev server,
`tools/shot.py`) with the throwaway `proto.js` injected. It uses the real pair code in `js/app.js` and the real Friends
block from `js/collab-ui.js`. The only change is the CSS below, plus the phone gate answered "phone" for one cog click.

Item: the INBOX entry "28 Sep 2026, ~13:59 AWST — PC: bring the phone's Friends + Canvas settings pair to PC". Below it is
called **#NNN**; use the number the loop gives it.

## His words (verbatim)

> "on pc there isnt a way to access the friends invite menu like there is on mobile. - Settings cog then swap between them in a really clean way."

1. [ ] On PC there is no way into the friends invite menu the way there is on mobile.
2. [ ] Make it like mobile: the Settings cog opens them, and he can swap between them (Friends and Canvas settings) in a really clean way.
3. [ ] (his standing design rule, #545) options drawn and shown to him before it ships. **These pictures are that.**

Clause 1 is literally true with the feature off: a PC has **no** door at all (measured, below). With the feature on, a PC has
the Share button. That button **starts sharing the moment it is pressed**, which the phone never does.

---

## 1. How the phone pair works today (v17.11, #945)

**DOM** (`index.html` ~957–1041). Everything lives in `#canvas-dialog`:
- `.export-card` is Canvas settings. Its **last** child is `#cv-mini`, the Canvas bar: icon, "Canvas", an `App settings…`
  pill (#967), the summary line `#cv-mini-sub`, and the ⤢ `#cv-mini-exp`.
- `#cv-friends` comes **after** the card, so "the dialog's first card or button" lookups still find Canvas. It holds:
  - `#cv-fr-bar`: icon, "Friends", `#cv-fr-sub`, `#cv-fr-faces`, and the ⤢ `#cv-fr-exp`.
  - `#cv-fr-body`: collab-ui.js draws the real sharing content here (`U.renderFriends`).

**States** are classes on `#canvas-dialog`:

| state | classes | what shows |
|---|---|---|
| Canvas big (default) | `cv-pair` | the Friends bar on top (`order:-1`), the whole canvas card below it, and `#cv-fr-body` empty |
| Friends big | `cv-pair cv-fr-big` | the canvas card shrunk to its `#cv-mini` bar (the rest of the card is `display:none`, kept, not destroyed) on top, with the Friends body drawn below it |
| mid-swap | `+ cv-flying` | both halves of both blocks are drawn, so they can cross-fade |

**The swap** is `cvPairSwap` (app.js ~8240), a FLIP:
- It finishes the entrance, then measures both blocks (`first`), applies the new state and measures again (`last`).
- It pins both blocks `position:fixed` at `last`. This works because the dialog is `inset:0`, so its box is the viewport.
- It animates `top` and `height` from `first` to `last` over **460 ms** with `cubic-bezier(.2,.85,.25,1.06)`.
- Each bar leaves early (opacity 0 by 18%) and each content arrives late (15% to 60%). The arriving block flies above
  the leaving one.
- When the flight settles (`cvPairSettle`), the inline styles come off and the Friends content is unmounted if Friends shrank.
- Reduced motion swaps instantly.

**Last-block memory**: `localStorage['fm.cvPair']` is `'canvas'` or `'friends'`. It is per device and never written into
the project, and every swap writes it. The cog opens with `{block:'last'}`, the person+ and faces chip with
`{block:'friends'}`, and a bare `FM.openCanvasDialog()` (the oversize warning) always opens Canvas.

**One close**: `cvClose` (~8393) handles the backdrop, Cancel, Apply, App settings…, the cog's second tap and Escape (both
go through `#cv-cancel`). It settles any flight, unmounts Friends, stops the width watch and takes off the PC anchor.

**Opening never arms.** Only the block's **Start sharing** (`armShare`, one arm however many taps) starts sharing.

**What gates it to the phone.** There are four gates, and all four have to move:
1. `openCanvasDialog` (~8380):
   `const phone = cvPhoneMq.matches; cvDialog.classList.toggle('cv-pair', phone); if (phone) cvPairApply(...) else remove('cv-fr-big')`.
   `cvPhoneMq` is `matchMedia('(max-width: 700px)')`, captured once at ~8196.
2. `styles.css` ~3461–3538: every rule that shows, styles or moves the pair sits inside `@media (max-width: 700px)`. The
   base rules outside it hide `#cv-friends` and the card's `.cv-mini`. Its header says it outright:
   *"⚠️ NOTHING HERE MAY REACH A PC."*
3. `cvOnWidth` (~8296): crossing the breakpoint while the dialog is open **tears the pair down** above 700 px.
4. `U.openPeople` (collab-ui.js ~1488): `if (isPhoneNow()) { …openCanvasDialog({block:'friends'}) } return U.share();`.
   On a PC the people doors (Share button, faces chip, LIVE pill, Home's "Share live…") go to `U.share()`, which
   **arms**.

## 2. PC today (measured, v17.11, real app, `probe-today.js`)

| | 900×760 (suite frame) | 1280×800 | 1920×1080 |
|---|---|---|---|
| cog (feature off) x..right, y | 726..760, 532 | 1106..1140, 564 | 1746..1780, 728 |
| Canvas card | 330×360 at (430,164) | 330×360 at (810,196) | 330×360 at (1450,360) |
| card scrolls? | no (358/358) | no | no |
| opens | upward (`cv-up`), right edge = the cog's | same | same |
| room above the cog | 516 | 548 | 712 |
| comic tail | under the card, aimed at the cog | same | same |

- **Feature off**: `#btn-share` is the phone's `.cs-door` on the stage, which is `display:none` above 700 px
  (`styles.css` ~10690). **A PC has no door to Friends at all.**
- **Feature on** (1280): the Share button sits beside Export at 1106..1140. The cog moves 42 px left, to 1064..1098.
  Pressing Share with no name set opens a centred "What should others see?" card (380×262 at 450,269), and then
  **arms a live room** (`U.share` → `armShare`). It is a different card from the phone's Friends block, and it starts
  sharing on the first press.
- The narrowest PC layout (701 px, feature on) puts the cog's right edge at 519. At 800 it is at 618.

## 3. The options (pictures)

All pictures are phone-readable (1200 wide, at most 1.6× as tall):
- `comparison.jpg`: today closed and today's cog, then A and B on Canvas and on Friends, at 1280×800.
- `A-swap.jpg`: closed, then the cog opens Canvas, then the ⤢ flight frozen at 20%, 45% and 70%, then landed on Friends.
- `B-swap.jpg`: the same six frames for B.
- `fit.jpg`: A and B on Canvas and on Friends at 900×760 and at 1920×1080.

**A · stacked, like the phone.** The cog's card becomes the pair. A 360-wide Friends bar sits above the canvas card. ⤢ runs
the phone's own flight: Friends becomes the big block hanging off the cog, and Canvas becomes the bar on top. The small
one sits away from the button, which is on top in his layout.

**B · side by side (recommended).** The pair still hangs off the cog, but uses the PC's width:
- Canvas is always on the right, next to the cog, so the tail never moves.
- Friends is always on the left.
- The big one is 360 wide and the small one is a 176-wide tile at the foot, level with the cog.
- ⤢ slides the line between them: one widens as the other narrows, and nothing crosses.

**Measured, same app, feature on, not sharing:**

| | A (stacked) | B (side by side) |
|---|---|---|
| width of the pair | 360 | 546 (360 + 10 + 176) |
| Friends block, big, at 1280×800 | 360×466; its list shows **168 of 291 px** | 360×540; shows **242 of 291 px** |
| Friends block, big, at 900×760 | 360×434; shows **136 of 291 px** | 360×508; shows **210 of 291 px** |
| during the swap (1280×800; resting line y=556) | the pair **lifts off the cog**: its lowest edge is at y=363 at 10%, 442 at 20%, 500 at 30% (up to **193 px** off the button) | every block's bottom stays **within 3 px of 556** (553–556) at 0, 10, 20, 30, 45 and 70%, and when landed |
| canvas card on Canvas | 360×361, does not scroll (both widths) | 360×361, does not scroll |
| fits at 900 and 1920 | yes | yes; at 900 the pair runs x=172..718 |
| narrowest window it fits | any | needs the cog's right edge at ≥ 562 px. With the feature on that is a window ≥ ~744 px (at 701 it is 519). Below that B **stacks exactly as A** |
| console errors (proto, both widths) | none | none |

**Recommendation: B.**
- The PC pair **hangs from a button**. A's flight is the phone's, and the phone pair is centred, so it hides the problem
  there. On a PC the same flight tears the pair off the cog for about a third of the swap, 193 px at worst.
- B's divider slide keeps both blocks standing on the cog's row the whole way. That is the "really clean way" he asked for.
- B gives the Friends block the full height: 83% of its list on screen at 1280×800, against 58% for A.
- The costs are real but small:
  - B is 546 px wide instead of 360. The editor behind it is blurred under the scrim either way.
  - The small block becomes a tile. That is a new look, and it is what he sees here.
  - The flight flies `left` and `width` too, which is harmless where they do not change: A and the phone.
  - B needs A's stacked layout as its narrow-window fallback. So **B is A plus one side-by-side rule**, and the build is
    the same either way until the last CSS block.

C, one card with a Canvas/Friends segmented tab, was considered and not drawn. It is a different interaction from the
phone's, and he asked for it "like mobile".

## 4. Decided without asking

- **The cog reopens on the last block**, as on the phone. It uses the same `fm.cvPair` key, which is per device, so a PC
  remembers its own. A bare `FM.openCanvasDialog()` (the oversize warning) still always opens Canvas.
- **Opening never starts sharing** on a PC either. Only the block's Start sharing does. This is the phone's rule, and the
  test in §7 pins it.
- **With the feature off**, the PC pair shows the Friends bar ("Share live with friends"). Opened, it shows the phone's
  explanation and the one switch (`drawLabsOff`). It adds no DOM, listener or network: the cog is the door, so `doors23`
  is unchanged.
- **The Share button beside Export keeps working exactly as today** until he answers the ask below. Part 2 is built only
  on his yes.

## ❓ Asks (for the logging chat to put to him)

- ❓ASK 1: **A or B?** B is recommended (see `comparison.jpg`, `A-swap.jpg`, `B-swap.jpg`, `fit.jpg`). A matches the phone
  exactly. B uses the PC's width and slides instead of crossing, so the pair never leaves the cog.
- ❓ASK 2: **The Share button beside Export: should it open this same pair with Friends big?** Recommended: yes. The faces
  chip, the LIVE pill and Home's "Share live…" would follow, since they are the same door (`U.openPeople`). That also
  means pressing Share on a PC **stops starting sharing by itself**, and Start sharing does it, as on the phone. The
  alternative is for Share to stay its own card, which arms on the first press.

BUILT OUT UNTIL HE picks A or B (#545: no visual ships unseen). Part 1 can be built in full meanwhile:
- If he says A, delete the `cv-side` pieces marked **[B]**.
- Part 2 waits on ASK 2.

---

## 5. The exact changes

Line numbers are from v17.11 and drift. Re-grep the quoted anchors before editing.

### Part 1: the cog opens the pair on a PC (build now; ship after ASK 1)

#### `js/app.js`, inside the FRIENDS BESIDE CANVAS SETTINGS block (~8183)

**(a)** Retitle the header comment "the phone pair" to "the pair, phone and PC (queue 945, #NNN)", and say that PC is no
longer untouched. Add these after `cvFlight` (~8197):

```js
const CV_SIDE_NEED = 546 + 16;   // [B] side by side needs Friends 360 + gap 10 + tile 176 left of the button's right edge, and 16 of margin
let cvSrc = null;                // the control the pair hangs from on a PC (the cog; the Share button after Part 2)
/* The block next to the button: side by side it is always Canvas; stacked it is the big one (the small one sits away). */
const cvAnchorBlock = () => (cvDialog.classList.contains('cv-side') || !cvDialog.classList.contains('cv-fr-big')) ? cvCard : cvFr;
/* THE COMIC TAIL FOLLOWS THAT BLOCK (queue 548: decorate, never move). Unpop and pop in one task, so the opener's
   `.pop-src` lift never drops for a frame. No-op when not anchored (a phone). */
const cvAim = () => {
  if (FM._cvPop) { FM._cvPop(); FM._cvPop = null; }
  if (!document.body.classList.contains('cv-anchored') || !cvSrc || !FM.popFrom) return;
  const b = cvAnchorBlock();
  if (b) FM._cvPop = FM.popFrom(b, cvSrc, { placed: true });
};
```

**(b) Move the anchor out of `openCanvasDialog` into `cvPlace(src)`**, so a breakpoint crossing can re-run it. Cut the
whole anchor block out of `openCanvasDialog` (from the comment `/* ANCHOR IT TO THE COG on desktop (queue 241 b/c)` down to
the closing `}` of its `else` branch, ~8336–8379, which ends `document.body.classList.remove('cv-anchored', 'cv-up'));`).
Define `cvPlace` **immediately above the `cvOnWidth` comment** ("A window that crosses the phone breakpoint…", ~8293), so
it exists before anything that calls it. Keep the two long comments (241 b/c and "WHICHEVER SIDE HAS ROOM (queue 252)") as
they are, above and inside it. The code, in full:

```js
const cvPlace = (src) => {
  cvSrc = src || null;
  const sr = src && src.getBoundingClientRect();
  if (sr && sr.width > 0 && window.matchMedia('(min-width: 701px)').matches) {
    cvDialog.style.setProperty('--cv-anchor-right', Math.max(8, Math.round(window.innerWidth - sr.right)) + 'px');
    /* WHICHEVER SIDE HAS ROOM (queue 252) … (the existing comment, unchanged) */
    const roomAbove = sr.top - 16, roomBelow = window.innerHeight - sr.bottom - 16;
    const up = roomAbove >= roomBelow;
    document.body.classList.toggle('cv-up', up);
    cvDialog.style.setProperty('--cv-anchor-top', Math.round(sr.bottom + 8) + 'px');
    cvDialog.style.setProperty('--cv-anchor-bottom', Math.max(8, Math.round(window.innerHeight - sr.top + 8)) + 'px');
    document.body.classList.add('cv-anchored');
    cvDialog.classList.toggle('cv-side', sr.right >= CV_SIDE_NEED);                    // [B] room for side by side, else stacked (A)
    document.body.classList.toggle('cv-share-src', !!src && src.id === 'btn-share');   // Part 2 (harmless before it)
  } else {
    cvDialog.style.removeProperty('--cv-anchor-right');
    cvDialog.style.removeProperty('--cv-anchor-top');
    cvDialog.style.removeProperty('--cv-anchor-bottom');
    document.body.classList.remove('cv-anchored', 'cv-up', 'cv-share-src');
    cvDialog.classList.remove('cv-side');
  }
  cvAim();   // unpops first, so the old `FM._cvPop && (FM._cvPop(), …)` of the else branch is covered; a no-op when not anchored
};
```

The old block's inner `const cvCard = cvDialog.querySelector('.export-card')` (a shadow of the outer `cvCard`) goes with it.

**(c) `openCanvasDialog`** (~8319): add `from` to the opts comment (`opts.from`: the control to hang the pair off; else
`FM.settings.lastCanvasOpener`, else the cog). Where the anchor block was cut out in (b), and in place of the old
phone-gated pair lines (`/* queue 945: the phone pair. Decided at open… */` through
`if (!cvDialog.classList.contains('cv-fr-big')) friendsUnmount();`, ~8380–8385), put the lines below, straight after
`cvUpdate();`. Keep everything else (the form sync above, then `cvWatchWidth(true)`, `cvRoleNote()`, removing `hidden`):

```js
/* queue 945 / #NNN: THE PAIR AT EVERY WIDTH, decided before the placement, because the tail is aimed at the block next to the button. */
cvDialog.classList.add('cv-pair');
cvPairApply(o.block === 'friends' ? 'friends' : o.block === 'last' ? cvPairLast() : 'canvas');
if (!cvDialog.classList.contains('cv-fr-big')) friendsUnmount();
cvPlace(o.from || (FM.settings && FM.settings.lastCanvasOpener) || document.getElementById('btn-settings'));
```

`popFrom` already retries for a few frames while the dialog is still `hidden`. Today's code relies on that too.

**(d) `cvPairSwap`** (~8240): three edits.
- The block keyframes also fly `left` and `width` **[B]**. Where they do not change, as on the phone and in A, they are
  inert:
  ```js
  anim(b, [{ left: first[i].left + 'px', width: first[i].width + 'px', top: first[i].top + 'px', height: first[i].height + 'px' },
           { left: last[i].left + 'px',  width: last[i].width + 'px',  top: last[i].top + 'px',  height: last[i].height + 'px' }], { easing: EASE });
  ```
- The settle re-aims the tail:
  `.then(() => { if (cvFlight.length && cvFlight[0] === mine[0]) { cvPairSettle(); cvAim(); } }, () => {})`.
- The reduced-motion early return becomes `{ cvPairApply(to); cvPairSettle(); cvAim(); refocus(); return; }`.

(While stacked, the tail is hidden for the flight by CSS, below. Side by side it stays: Canvas's bottom-right corner never
moves.)

**(e) `cvOnWidth`** (~8296): the pair lives at both widths now, so a crossing only re-places it. Delete the teardown
(`toggle('cv-pair'…)`, `remove('cv-fr-big')`, `friendsUnmount()`, `cvPairApply('canvas', false)`) and use:

```js
const cvOnWidth = () => {
  if (cvDialog.classList.contains('hidden')) return;
  cvPairSettle();
  setTimeout(() => { if (!cvDialog.classList.contains('hidden')) cvPlace(cvSrc); }, 0);   // once the new width's layout has moved the cog
};
```

`setTimeout`, not `requestAnimationFrame`: popfrom.js already documents (its RETRY note, LOOP.md rule 11) that rAF fires
zero frames in a tab that is not fronted, and the suite's frame is resized from a runner that may not be. Rewrite its
comment. The old reason, "the Friends block vanishes above 700px", is gone; the new one is "the pair lives at both widths,
so a crossing only re-hangs it — off the button on a PC, centred on a phone — and keeps whichever block was big".

**(f) `cvClose`** (~8393): add `cvSrc = null; cvDialog.classList.remove('cv-side');`, and add `'cv-share-src'` to the
`classList.remove('cv-anchored', 'cv-up')` call.

The cog handler, `#cv-cancel`, the backdrop and Escape need **no change**. The cog's second click goes to `#cv-cancel`,
and Escape does too (~8786). `.click()` fires on a `display:none` Cancel, which the phone already relies on while
Friends is big.

#### `js/collab-ui.js` (Part 1: comments only, but it still counts as changed, so bump it)
- Header ~19: "the Friends block in Canvas settings on a phone" becomes "…on a phone and a PC".
- ~821: "THE FRIENDS BLOCK (Canvas settings on a phone)" becomes "(Canvas settings, every width)".
- ~834, the `friendsVisible` comment: drop "above 700px it is display:none whatever the classes say". The
  `getClientRects` check stays, because a bare-hidden dialog still has none.

#### `index.html`
- The comments on `#cv-mini` (~1017) and `#cv-friends` (~1028) say "only on a phone" and "Display:none on a PC". Change
  them to "the pair, every width (#NNN)".
- The markup is unchanged.
- Bump: `styles.css?v=734` → 735, `js/app.js?v=461` → 462, `js/collab-ui.js?v=15` → 16. Use current +1 if these have
  moved; ship.sh refuses otherwise.

#### `styles.css`

**(g) Move out of the phone query.** The block at ~3461–3538 splits in two:
- **Width-free (moved above the `@media (max-width: 700px)`)**, unchanged except where noted:
  - `#canvas-dialog.cv-pair > #cv-friends { display:flex; flex-direction:column; overflow:hidden; position:relative; }`
  - `#canvas-dialog.cv-pair:not(.cv-fr-big) > #cv-friends { order: -1; }`
  - the bar shape `#canvas-dialog.cv-pair .cv-mini {…}`
  - every look rule: `.cv-mini-ico` (+svg), `.cv-mini-txt`, `.cv-mini-t`, `.cv-mini-s`, `.cv-fr-live`, `.cv-fr-faces`
    (+`:empty`), `.cv-fr-face` (+`.away`), `.cv-fr-more`, `.cv-mini-exp` (+`::before`, svg), `.cv-mini-trow`,
    `.cv-mini-app` (+`::before`)
  - the three STATE blocks, `#cv-fr-body`, the three FLIGHT rules, and `#cv-fr-body .cs-start` / `.cs-start:disabled` /
    `.cs-fr-hint`

  Each is keyed on `.cv-pair` or on elements that only show inside it, and the base `display:none` rules stay. The
  prototype's Start sharing was 46 px / 15 px; the build keeps the phone's 50 px / 16 px. **Rewrite the "⚠️ NOTHING
  HERE MAY REACH A PC" header**: the pair reaches a PC now, and what may not reach it is the phone's *layout*.
- **Stays in `@media (max-width: 700px)`**: `#canvas-dialog.cv-pair { flex-direction; gap; padding (the 96 px reserve) }`,
  the widths `min(420px, calc(100vw - 24px)); flex:none`, and the two `max-height` caps.

**(h) The PC layout**, inside the existing `@media (min-width: 701px)` block after
`body.cv-anchored #btn-settings { … }` (~8198):

```css
  /* ---- #NNN: THE PAIR ON A PC — hung off the button exactly as the card alone was. The dialog's padding does the anchoring
     the card's margin did, so the pair's corner lands on the same pixel. */
  #canvas-dialog.cv-pair { flex-direction: column; gap: 10px; }        /* un-anchored (no opener box): centred, like the phone */
  #canvas-dialog.cv-pair > .export-card, #canvas-dialog.cv-pair > #cv-friends { width: 360px; flex: none; }
  body.cv-anchored #canvas-dialog.cv-pair { align-items: flex-end; justify-content: flex-end;
    padding: 16px var(--cv-anchor-right, 16px) var(--cv-anchor-bottom, 80px) 16px; }
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair { justify-content: flex-start;
    padding: var(--cv-anchor-top, 80px) var(--cv-anchor-right, 16px) 16px 16px; }
  body.cv-anchored #canvas-dialog.cv-pair > .export-card,
  body.cv-anchored.cv-up #canvas-dialog.cv-pair > .export-card { margin: 0; }          /* beats the (1,3,1) cv-up margin */
  body.cv-anchored #canvas-dialog.cv-pair > #cv-friends { animation: cv-grow 160ms cubic-bezier(.2, .8, .3, 1); transform-origin: top right; }
  /* STACKED (A — and B's fallback when there is no room beside the button): the small block sits AWAY from the button, so on
     top when it opens upward (the phone's picture) and underneath when it opens downward. The big one gets what is left. */
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair:not(.cv-side):not(.cv-fr-big) > #cv-friends,
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair.cv-fr-big:not(.cv-side) > .export-card { order: 1; }
  body.cv-anchored.cv-up #canvas-dialog.cv-pair:not(.cv-side) > .export-card,
  body.cv-anchored.cv-up #canvas-dialog.cv-pair.cv-fr-big:not(.cv-side) > #cv-friends { max-height: calc(100vh - var(--cv-anchor-bottom, 80px) - 16px - 76px); }
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair:not(.cv-side) > .export-card,
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair.cv-fr-big:not(.cv-side) > #cv-friends { max-height: calc(100vh - var(--cv-anchor-top, 80px) - 16px - 76px); }
  /* The tail points from a block that is flying — it goes for the 460 ms and cvAim puts it back on the new big block. */
  body:has(> #canvas-dialog.cv-flying:not(.cv-side)) > .pop-tail { visibility: hidden; }
  /* [B] SIDE BY SIDE: Friends always left, Canvas always right by the button (the tail never moves); the big one 360, the
     small one a 176 tile at the foot, level with the button. ⤢ slides the line between them. */
  body.cv-anchored #canvas-dialog.cv-pair.cv-side { display: grid; grid-auto-flow: column; align-content: end; justify-content: end; align-items: end; column-gap: 10px; }
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair.cv-side { align-content: start; align-items: start; }
  #canvas-dialog.cv-pair.cv-side > #cv-friends { order: -1; }
  #canvas-dialog.cv-pair.cv-side:not(.cv-fr-big) > #cv-friends, #canvas-dialog.cv-pair.cv-side.cv-fr-big > .export-card { width: 176px; }
  body.cv-anchored.cv-up #canvas-dialog.cv-pair.cv-side > .export-card,
  body.cv-anchored.cv-up #canvas-dialog.cv-pair.cv-side > #cv-friends { max-height: calc(100vh - var(--cv-anchor-bottom, 80px) - 16px); }
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair.cv-side > .export-card,
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair.cv-side > #cv-friends { max-height: calc(100vh - var(--cv-anchor-top, 80px) - 16px); }
  #canvas-dialog.cv-pair.cv-side .cv-mini { flex-direction: column; align-items: flex-start; height: auto; padding: 16px 14px 14px; gap: 10px; }
  #canvas-dialog.cv-pair.cv-side .cv-mini-txt { flex: none; width: 100%; }
  #canvas-dialog.cv-pair.cv-side .cv-mini-s { white-space: normal; line-height: 1.35; margin-top: 4px; text-wrap: balance; }
  #canvas-dialog.cv-pair.cv-side .cv-mini-trow { flex-wrap: wrap; row-gap: 8px; }
  #canvas-dialog.cv-pair.cv-side .cv-mini-exp { margin-top: auto; align-self: flex-end; }
  #canvas-dialog.cv-pair.cv-side.cv-flying > .export-card > .cv-mini,
  #canvas-dialog.cv-pair.cv-side.cv-flying > #cv-friends > #cv-fr-bar { bottom: 0; height: auto; right: auto; width: 176px; }
  /* in flight the contents keep their BIG width and are clipped, so nothing reflows while its block narrows (measured: without
     this the canvas chips squeezed mid-swap, and the Friends list jumped when it landed). The numbers are the big block's own
     insides at rest — 360 border-box less the 1 px borders (and the card's 24 px padding): content 310, the actions bar that
     bleeds into the padding 358, the Friends body 358. Wider than that and the content jumps 2 px as the flight starts. */
  #canvas-dialog.cv-pair.cv-side.cv-flying > .export-card > :not(.cv-mini):not(.dialog-actions) { width: 310px; }
  #canvas-dialog.cv-pair.cv-side.cv-flying > .export-card > .dialog-actions { width: 358px; }
  #canvas-dialog.cv-pair.cv-side.cv-flying > #cv-friends > #cv-fr-body { width: 358px; }
  /* Part 2: when the Share button opened it, the pair hangs from Share (popFrom's .pop-src lifts it); the cog goes back under the blur */
  body.cv-anchored.cv-share-src #btn-settings { z-index: auto; }
```

The last line is Part 2, harmless before it. In the reduced-motion block at ~8204 (it comes AFTER the block above, which
matters), add `body.cv-anchored #canvas-dialog.cv-pair > #cv-friends { animation: none; }`. It must be this exact selector:
the grow rule above is (2,2,1), and the shorter `body.cv-anchored #canvas-dialog #cv-friends` is only (2,1,1), so it would
lose and the Friends block would still grow for someone who asked for no motion.

Before building, check that the (1280-wide) measurements still hold: in the prototype (`proto.js`) the in-flight widths were
312 / 312 / 360 and the flight's `left`/`width` were a second animation. Neither changes what the pictures show, but render
`B-swap` again after the build (§7 step 3) and compare.

**Where 76 comes from**: the Friends or Canvas bar block measured **66** (64 + 2 border), plus the **10** gap.
`theme-glass.css` needs nothing, because `#cv-friends` is already the card's twin there (~81, ~512).

### Part 2: the Share button opens the pair (only after "yes" to ASK 2)

`js/collab-ui.js`:
- `U.openPeople` (~1488) loses the phone gate and takes the button as the anchor:
  ```js
  /* The people door — the Share button, the person+ and faces chip, the LIVE pill, Home's "Share live…": Canvas settings with
     Friends big, at every width (#NNN, his yes). A second press closes it (944); it NEVER arms — only Start sharing does. */
  U.openPeople = function (from) {
    const homeUp = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (homeUp || !FM.openCanvasDialog) return Promise.resolve(null);
    const d = friendsDlg();
    if (d && !d.classList.contains('hidden')) { if (FM.closeCanvasDialog) FM.closeCanvasDialog(); return Promise.resolve(null); }
    FM.openCanvasDialog({ block: 'friends', from: (from && from.nodeType === 1) ? from : null });
    return Promise.resolve(null);
  };
  ```
- The Share button's click (~5185) becomes `… U.openPeople(b); });`. Only the bar button anchors: a person+ on the stage
  un-anchors at phone width anyway, and the faces chip and LIVE pill pass nothing, so they hang from the cog, not from a
  chip at the top-left.
- Update the comments that call U.share "the Share button's" (`armShare` ~1235, the ~825 note). `U.share()` stays, since
  about 100 tests call it, but no door reaches it any more. `redrawShare` keeps its `collab-share` branch for them.

The Share button is lifted and sharp because popFrom adds `.pop-src` (styles.css ~9380, z 3101). A second press lands on
it and closes (#944). Bump `js/collab-ui.js?v=` again, plus `styles.css` if the last rule of (h) was held back.

## 6. The tests

Conventions: `test(name, { item: 'NNN', budgetMs }, …)`, with `editorWithShape`, `with945`, `atWideWidth(fn, w)` (the
runner frame is 900×760), `atPhoneWidth`, `entranceDone`, `land945`, `open945`, and the 921 helpers for collab. Every
new test below **fails on HEAD**: there is no pair on a PC, so it fails at its first assertion, which names his clause.

**T1: the cog opens both (at 1280 and 900), with a phone CONTROL**

`'NNN on a PC the cog opens Canvas settings WITH Friends — hung off the cog, both on screen, nothing scrolls, the cog sharp — and the phone keeps its own pair'`

```js
await editorWithShape(async function () { await with945(async function () {
  const dlg = document.getElementById('canvas-dialog'), card = dlg.querySelector('.export-card'), fr = document.getElementById('cv-friends');
  for (const w of [1280, 900]) await atWideWidth(async function () {
    const cog = document.getElementById('btn-settings'), kr = cog.getBoundingClientRect();
    if (!(kr.width > 0)) throw new Error('setup: no PC cog at ' + w);
    cog.click(); await entranceDone(dlg); await sleep(60);
    if (!open945(dlg)) throw new Error('the cog did not open Canvas settings at ' + w);
    if (!dlg.classList.contains('cv-pair') || !fr.getClientRects().length) throw new Error('at ' + w + ' the cog opened Canvas settings alone — no Friends (his words: "on pc there isnt a way to access the friends invite menu like there is on mobile")');
    if (!document.body.classList.contains('cv-anchored')) throw new Error('the pair is not hung off the cog');
    if (dlg.classList.contains('cv-fr-big')) throw new Error('with nothing remembered it opened on Friends');
    const cr = card.getBoundingClientRect(), frr = fr.getBoundingClientRect();
    if (dlg.classList.contains('cv-side')) {                                   // [B]
      if (frr.right > cr.left + 0.5) throw new Error('side by side, Friends is not left of Canvas');
      if (Math.abs(frr.bottom - cr.bottom) > 4) throw new Error('side by side, Friends (' + frr.bottom + ') and Canvas (' + cr.bottom + ') do not stand on one line');
    } else if (frr.bottom > cr.top + 0.5) throw new Error('stacked, the Friends bar is not above the canvas card');
    if (Math.abs(cr.right - kr.right) > 12) throw new Error('the canvas card is not lined up with the cog (' + cr.right + ' vs ' + kr.right + ')');
    if (document.body.classList.contains('cv-up') && cr.bottom > kr.top + 4) throw new Error('the pair is not hanging above the cog');
    [cr, frr].forEach(function (r) { if (r.top < -1 || r.left < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) throw new Error('part of the pair is off screen at ' + w); });
    if (card.scrollHeight > card.clientHeight + 1) throw new Error('the canvas card scrolls: it needs ' + card.scrollHeight + ' and has ' + card.clientHeight + ' (queue 252)');
    const at = document.elementFromPoint(kr.left + kr.width / 2, kr.top + kr.height / 2);
    if (!(at && (at === cog || cog.contains(at)))) throw new Error('the cog is under the blur (queue 241)');
    if (document.getElementById('cv-fr-body').children.length) throw new Error('the Friends content is drawn while Friends is the small block');
    document.getElementById('cv-cancel').click(); await sleep(60);
    if (open945(dlg) || document.body.classList.contains('cv-anchored') || dlg.classList.contains('cv-side')) throw new Error('Cancel left the pair or its anchor behind');
  }, w);
  /* CONTROL — the phone's pair is the phone's: a centred column, not hung off anything, not side by side. */
  await atPhoneWidth(async function () {
    document.getElementById('m-settings').click(); await entranceDone(dlg); await sleep(60);
    if (!dlg.classList.contains('cv-pair')) throw new Error('CONTROL: the phone lost its pair');
    if (dlg.classList.contains('cv-side') || document.body.classList.contains('cv-anchored')) throw new Error('the PC layout leaked onto the phone');
    const cr = card.getBoundingClientRect(), frr = fr.getBoundingClientRect();
    if (frr.bottom > cr.top + 0.5) throw new Error('CONTROL: on the phone the Friends bar is not above the card');
    if (Math.abs(cr.width - Math.min(420, innerWidth - 24)) > 1) throw new Error('the phone card is ' + cr.width + ' wide, not min(420, 100vw − 24)');
    document.getElementById('cv-cancel').click(); await sleep(60);
  }, 380);
}); });
```

**T2: the flight, and it stays standing** (1280; B-specific lines marked)

`'NNN on a PC ⤢ swaps them with the flight — the pair stays standing on the cog the whole way — lands Friends big, remembers it, and the tail hangs from the block next to the cog'`

Wrap it as `editorWithShape` → `withFakeNet921(async function (net) { … })` → `with945` → `atWideWidth(…, 1280)`, and
record `const c0 = net.constructed` first: this test draws the real Friends block, so it also asserts
`net.constructed === c0` once landed (the loopback `relayGate()` refuses a real socket anyway; this makes it measured).

1. Open with the cog, then record `line = card bottom` and the Friends width `wf0`.
2. Click `#cv-fr-exp`. Assert `cv-flying` and at least 2 non-CSS animations (the 945 `flying` filter).
3. Freeze them at p = 0.1, 0.3 and 0.5 (`a.pause(); a.currentTime = p*460`). **[B]** at each point:
   - both blocks' `bottom` are within 4 px of `line`, else throw "the pair has left the cog's line". (Tolerance from
     measurement: the prototype read 553–556 against 556, a 3 px spread; A's fault is 193 px.)
   - `wf0+1 < fr.width < 359`, else throw "Friends' width jumps instead of flying". This catches the `left`/`width`
     keyframes going missing.
4. `play()`, then `land945()`.
5. Assert, once landed:
   - `cv-fr-big`, not `cv-flying`;
   - **[B]** Friends is left of Canvas and Canvas is ≤ 200 wide. Stacked: Canvas's bottom ≤ Friends' top and its
     height ≤ 80;
   - `#cv-mini-sub` is `'9:16 · 1080 × 1920 · 30 fps'` (set `P.width/height/fps` first, restore in `finally`);
   - no inline `position`/`width` left on either block;
   - `fm.cvPair === 'friends'`;
   - **the block next to the cog** (side: the card; stacked: `#cv-friends`) owns the tail — `next._popTail` exists — and
     that tail's top is within 2 px of `next`'s bottom (this is `cv-up`, which 1280×760 is; assert `cv-up` as setup).
     Read `next._popTail`, not `document.querySelector('.pop-tail')`: a tail leaked by an earlier test would answer the
     query. This catches a missing `cvAim()`.
6. `#cv-mini-exp` swaps back: assert not `cv-fr-big`, `fm.cvPair === 'canvas'` and `#cv-fr-body` empty.
7. The reduced-motion CONTROL is the same as 945's: override `matchMedia` for `prefers-reduced-motion`. The swap lands
   at once with no flight, and the tail is still re-aimed.

**T3: closing and reopening, PC style**

`'NNN on a PC the second click on the cog closes the pair, Escape closes it, a click outside closes it without applying, the cog reopens on the block open last, and crossing the phone width while it is open keeps the pair and re-hangs it'`

1. Use the 944 test's real-order `press(x, y)` (pointerdown and pointerup on `elementFromPoint`, then click on whatever
   is there after).
2. Open with the cog, swap to Friends, then `land945`. Press the cog: the pair is closed (#762).
3. Press the cog again: it opens **with `cv-fr-big`**. This fails on HEAD.
4. Dispatch
   `window.dispatchEvent(new KeyboardEvent('keydown', { bubbles:true, cancelable:true, key:'Escape', code:'Escape' }))`.
   Assert it closed, `#cv-fr-body` is empty and `cv-anchored` is gone.
5. Reopen: it is on Friends. Swap back to Canvas, click the 16:9 chip, then press the backdrop at (5, 5). Assert it
   closed **and the project size is unchanged**.
6. Reopen: it is on Canvas.
7. A bare `FM.openCanvasDialog()` with `fm.cvPair='friends'` opens Canvas (the oversize door).
8. **The breakpoint crossing (pins edit (e))**: with it open on Friends at 1280, run `atPhoneWidth(…, 380)` without
   closing. After its 80 ms settle plus `await sleep(60)`: still open, still `cv-pair` and `cv-fr-big`, `#cv-fr-body` still
   has children, and `cv-anchored` / `cv-side` are gone (centred like the phone). When `atPhoneWidth` returns to 1280 and
   after `await sleep(60)`: `cv-anchored` and `cv-side` are back, it is still on Friends, and `card.getBoundingClientRect()
   .right` is within 12 px of the cog's. The old `cvOnWidth` fails both halves: narrowing returns early and leaves it hung
   off a cog the phone does not show, and widening tears the pair down. Close with the cog.

Wrap T3 like T2 (`editorWithShape` → `withFakeNet921` → `with945` → `atWideWidth(…, 1280)`), closing Home first.

**T4: opening never arms on a PC**, a copy of 945's second test at `atWideWidth(…, 1280)`
- Wrap it in `withFakeNet921`, then `withCollab921([layer921('A')])` with `C.end()`, then `withLabs921`, then `with945`.
- Close Home first: the cog on Home opens App settings, the trap the cv-upward test documents.
- Cog, then ⤢: the same `quiet(door)` checks (no session, relay, wake lock, socket, host record or host lock), and
  `#cv-fr-body .cs-start` is there.
- CONTROL: Start sharing arms (`until921S6` on `C.session.isOwner`), then Stop sharing leaves Start sharing and nothing
  re-arms.

**T5: feature off**

`'NNN with the feature off the PC pair shows Friends and its one switch — no DOM, listener or socket added'`
- Copy the shape of `945 with Labs off the Friends bar still shows…` (~101143): `need921S7`, `const was =
  FM.settings.get('collabLabs')`, `withFakeNet921` → `editorWithShape` → `with945`, then `atWideWidth(…, 1280)` in place of
  `atPhoneWidth`, and inside it `try { FM.settings.set('collabLabs', false); C.ui.syncLabs(); … } finally {
  FM.settings.set('collabLabs', !!was); C.ui.syncLabs(); }`.
- Open with `#btn-settings` (not `#m-settings`). `#cv-fr-sub`'s text is exactly "Share live with friends"
  (collab-ui.js `U.friendsBar`). ⤢, `land945()`: Friends big shows exactly one `[role=switch][aria-checked=false]`, the
  text "Share this project live and edit it together", and no `.cs-start`.
- `net.constructed` is unchanged, `C.ui.isInstalled()` is false, and `doors23('a PC with the pair open, feature off')`
  passes. Close with the cog.

**T6 [B only]: no room means it stacks, both ways up**

`'NNN with no room beside its button the pair stacks like the phone — the big block next to the button, above it or below it'`
- Wrap it as `editorWithShape` → `with945` → `atWideWidth(…, 1280)` (the frame is then 1280×760). Without
  `atWideWidth` the suite's 380 pass runs it at a phone width, where nothing is anchored.
- Make two temporary 30×30 `<button>`s appended to `<body>`, placed by INLINE style (`b.style.cssText =
  'position:fixed;left:400px;top:600px;width:30px;height:30px'`, and `top:60px` for the other) — inline, because popFrom
  adds `.pop-src { position: relative }` to the button it hangs from, and a class rule would un-fix it (right edge 430: under the 562 side-by-side needs, and far enough right that a 360-wide stack
  hanging off it still starts at x=70 — at `left:300` the stack would run 30 px off the left edge). Open each with
  `FM.openCanvasDialog({ block: 'canvas', from: tmp })`, `await entranceDone(dlg)`, `await sleep(60)`.
  - First, for both: `cv-pair`, `cv-anchored`, and `#cv-friends` has a box. (On HEAD this is where it fails, naming the
    clause: "the pair is not on the PC".)
  - For the low button: no `cv-side`, `cv-up`, the Friends bar above the card, the card's bottom ≤ button top + 4, its right
    edge within 12 px of the button's, and both blocks inside the viewport (left ≥ −1).
  - For the high button: not `cv-up`. The card's top ≥ button bottom − 4. The Friends bar is **below** the card (the small
    one sits away from the button). Swap (`#cv-fr-exp`, `land945`): Friends big is now next to the button (its top ≥
    button bottom − 4), with the Canvas bar below it, and `#cv-friends._popTail` exists (the tail moved with it).
  - Close each with `FM.closeCanvasDialog()` before the next.
- CONTROL: `FM.openCanvasDialog({ from: document.getElementById('btn-settings') })` at 1280 is `cv-side`.
- In `finally`: `FM.closeCanvasDialog()`, THEN remove the buttons (a lifted `.pop-src` button removed while its tail is up
  would leave the tail for the 120 ms poll to find).

**T7 (Part 2, after the yes)**

`'NNN on a PC the Share button opens the pair with Friends big, hung off it, starting nothing — and a second click closes it'`
- `withFakeNet921`, then `withLabs921`, then `with945`, at `atWideWidth(…, 1280)`, closing Home first (the 944 test's
  `wasHome` pattern, ~100677). Press `#btn-share` in real order (the 944 test's `press`, ~100690).
- Assert the pair is open with `cv-fr-big`, there is no `#collab-share` and no `collab-profile` card, and the `quiet()`
  checks pass.
- `elementFromPoint` at the Share button returns the button (lifted). The pair's right edge is within 12 px of its
  right edge. `body.cv-share-src` is set.
- A second press closes it without reopening (#944).
- CONTROL: the cog still opens with `lastCanvasOpener`, without `cv-share-src`.

### Tests that change (grep `945`, `944`, `cv-anchored`, `cv-upward`, `PC: canvas`)

Each retune below asserts the NEW behaviour, so it too fails on HEAD. That is what prove.sh needs from a changed test.
- **`945 on a phone the cog opens Canvas settings … — and a PC sees none of it`** (tests.js ~100930): its "CONTROL: a PC
  opens the same dialog exactly as before" asserts no `cv-pair`, no Friends box and no Canvas bar at 1280. **Replace** it
  with a PC assertion: `cv-pair` and `cv-anchored`, the Friends block has a box, and the pair hangs off the cog, not the
  phone's centred column — `Math.abs(card.getBoundingClientRect().right - cog.getBoundingClientRect().right) <= 12`
  with `cog = #btn-settings` (a centred 360 card at 1280 has its right edge at 820; the cog's is at 1140). Do NOT test
  "the pair's top is below 96": on a PC the pair legitimately starts well below 96 (≈155 at 1280×760), so that check
  would fail a correct build. Do not assume Canvas is big here: the phone half of this test may have left `fm.cvPair` on
  Friends. Keep `card.parentNode === dlg`, and rename it to
  `'945 on a phone the cog opens Canvas settings with a Friends bar above the card — both on screen, Apply reachable, the cog spot still backdrop — and a PC hangs the same pair off its cog'`.
- **Part 2 only** (not before the yes):
  - `945 with people in … and on a PC the person+ opens its own card` (~101179). Its PC CONTROL
    (`ui.openPeople()` gives `#collab-share`) becomes: the pair opens with Friends big and no `#collab-share`. Rename it.
  - `944 on PC a second click on the Share button closes the Share panel` (~100675). Its `open` predicate
    (`.collab-scrim .collab-card`) becomes "the pair is up": `!#canvas-dialog.hidden && cv-fr-big`. The rest stands; the
    second press now reaches the lifted Share button itself.
- **Expected to hold unchanged (re-run them):**
  - `PC: canvas settings opens UPWARD and fits without scrolling`. Stacked, the card's cap at 900×760 is 508 − 76 = 432
    against the 361 it needs. Side by side, 508.
  - `PC: tapping outside the canvas settings closes it WITHOUT applying`. The point (5, 5) is still the dialog's own
    padding.
  - `PC: canvas settings hangs off the cog…`. The card's right edge is the cog's in both layouts, it is attached above
    the cog, and it is not centred.
  - The `548` / `762` / `490` / `498` / `912` / `917` / `944` slices.
  - `967 B2 2 … a PC gets no door` (~104148). No new DOM: the cog is the door.
  - `921 S3 … the only collab DOM is the two doors`.
  - Every `ui.share()` caller, such as the 921 S3 desktop placement test ~32820 (`U.share` stays).
  - All the phone `945` / `967` / `921 S7` tests, since the phone code path is the same.
- Risk to watch: the stacked canvas card's cap at the shortest desktop frames. Tests that only close with a bare
  `dlg.classList.add('hidden')` (~16496, 38602, 39605, 42877, 47029) now leave `cv-side` on the dialog. The next open
  re-toggles it, and the MutationObserver still unmounts Friends.
- A NEW way for tests to leak into each other: from Part 1 on, **a PC honours `fm.cvPair`**, and `cvPairApply` writes it
  on every open as well as every swap (`FM.openCanvasDialog({ block: 'friends' })` writes `'friends'`). A test that leaves
  it on `'friends'` would make every later PC test that opens the cog get the Canvas card as a tile, with its chips and
  Apply `display:none`. Checked at v17.11: all 26 tests that open Friends (`block: 'friends'`, `#cv-fr-exp`,
  `ui.openPeople()`) run inside `with945` or restore the key themselves (~39065), so nothing leaks today. **Every new test
  in this plan must run inside `with945` too.** If a PC canvas test goes red on the full suite but green alone, read
  `localStorage['fm.cvPair']` first.

## 7. Verification (the builder's)

1. **Before editing**, render the phone pair with `tools/shot.py` at 390×844 (the 945 view: the cog, then the pair, then
   ⤢ landed). After the build, render it again and pixel-compare. **It must be identical**, since the CSS move may not
   change a phone pixel.
   - Do not `git stash` (per memory, the stash is shared across worktrees).
2. Suite slices in the foreground with `timeout: 600000`, at the desktop width and at `--width 380`:
   `?only=NNN`, `?only=945`, `?only=944`, `?only=PC:%20canvas`, `?only=PC:%20tapping`, `?only=762`, `?only=548`,
   `?only=921%20S7`, `?only=967%20B2`. Then the full suite through ship.sh.
3. Real-app pictures at 900×760, 1280×800 and 1920×1080 with the feature off and on:
   - open with the cog, swap, the second click, Escape, then reopen on the last block;
   - check there are no console errors: add `proto.js`'s `errors` capture to a probe, or read them through
     `tests/_cdp.py`.
   - At 1280, render the swap mid-flight too, and check it matches `B-swap.jpg` (or `A-swap.jpg` if he picks A).
4. `/security-review`. There is no new `innerHTML`: the bars already write peer names as `textContent` through the palette
   check.
5. Send him the 1280 pictures, one at 900, and the unchanged phone at 390. Tick clause 1 (the door), clause 2 (the swap)
   and clause 3 (his pick).

## Files here

- `plan.md`: this file.
- `comparison.jpg`, `A-swap.jpg`, `B-swap.jpg`, `fit.jpg`: the pictures for him.
- `probe-today.js`: the PC-today measurement. Run it with
  `tools/shot.py --width W --height H --setup '' --js-file …/probe-today.js`. Prepend `const PHASE='share';` to measure the
  Share button too; it uses no network.
- `proto.js`: the throwaway prototype (both options). It uses no network: loopback makes `relayGate()` refuse, and
  `WebSocket` and `RTCPeerConnection` are stubbed to throw.
- `render.sh OUT A|B strip|sizes|measure|flight W H [frames]`: one `shot.py` run. It waits for no ship, mutation or
  spotcheck and a load under 8.
- `compose.py FRAMEDIR OUT`: builds the four JPEGs from render.sh's frames. Both strips use A's "closed" frame, because B's own 300 ms frame caught Home still fading. The closed state is the same app for both, since the hidden dialog has no option CSS.

## Review (28 Sep, skeptical pass against the v17.11 tree)

Every file:line anchor and quote was re-checked against the current tree: app.js (8183 header, 8196 `cvPhoneMq`, 8240
`cvPairSwap`, 8296 `cvOnWidth`, 8319 `openCanvasDialog`, 8347–8378 anchor block, 8393 `cvClose`, 8426 cog toggle, 8789
Escape → `#cv-cancel`), styles.css (3461–3538 phone pair, 8179–8206 anchored card and reduced motion, 9330–9407 popFrom,
10690 `.cs-door`), index.html (1017, 1029 comments; `?v=` 734 / 461 / 15), collab-ui.js (19–21, 821–836, 1209 `U.share`,
1238 `armShare`, 1488 `U.openPeople`, 5185 the Share click), theme-glass.css (81, 512), and every test helper named
(`with945`, `land945`, `open945`, `atWideWidth`, `atPhoneWidth`, `entranceDone`, `editorWithShape`, `withFakeNet921`,
`withCollab921`, `layer921`, `withLabs921`, `until921S6`, `doors23`, `need921S7`, `hostRec921`, `askOk921`). All exist. The
four pictures open, are 1200 wide and at most 1.6× tall, and show what their captions claim. The verbatim quote matches
INBOX.md line 119.

Changed in this plan:
1. **(b) `cvPlace` is written out in full** and told where to live (above `cvOnWidth`), instead of "move the block and
   change three things". The builder no longer has to reassemble it.
2. **(e) `cvOnWidth` defers with `setTimeout`, not `requestAnimationFrame`.** popfrom.js documents that rAF fires zero
   frames in a tab that is not fronted.
3. **Reduced motion: the selector was too weak.** `body.cv-anchored #canvas-dialog #cv-friends` is (2,1,1) and loses to
   the grow rule's (2,2,1). It is now `body.cv-anchored #canvas-dialog.cv-pair > #cv-friends`, placed after it, so the
   Friends block really stops growing when motion is reduced.
4. **The in-flight content widths are 310 / 358 / 358, not 312 / 360 / 360.** A 360 border-box block with 1 px borders
   (and the card's 24 px padding) holds 310 of content and 358 for the bleed bar and the Friends body. The old numbers would
   make the content jump 2 px as the flight starts, which is the reflow those rules exist to prevent. This is reasoned from
   the CSS, not measured, so the build must re-render `B-swap`.
5. **T1 and T2 "stand on one line" tolerance goes from 2 to 4 px.** The planner measured a 3 px spread (553–556), so 2 px
   would have failed a correct build. The fault it guards against is 193 px.
6. **T2 reads the tail as `next._popTail`**, not `querySelector('.pop-tail')`, which a leaked tail from another test could
   answer. It asserts `cv-up` as setup, and it now runs under `withFakeNet921` with `net.constructed` unchanged, because it
   draws the real Friends block.
7. **T3 gained step 8, the breakpoint crossing**, so edit (e) is pinned. The old `cvOnWidth` fails it both ways. Before
   this, nothing tested (e).
8. **T5 is specified from the existing Labs-off 945 test** (wrappers, restoring `collabLabs`, the exact bar text from
   `U.friendsBar`), not left as three bullets.
9. **T6 moved the fake buttons from x=300 to x=400, placed them by inline style, and wrapped the test in `atWideWidth`.**
   At x=300 a 360-wide stack hanging off a button whose right edge is at 330 runs 30 px off the left edge. A class rule
   would lose its `position:fixed` to popFrom's `.pop-src { position: relative }`. And without `atWideWidth`, the suite's
   380 pass would run T6 at a phone width. T6 also asserts the pair exists first, because on HEAD the old "Friends above
   the card" check passed on an all-zero rect.
10. **The 945 retune no longer asserts "the pair's top is below 96".** On a PC the pair legitimately starts around 155 px
    at 1280×760, so that check would fail a correct build. It now asserts the card's right edge is on the cog's. It does
    not assume Canvas is big, and it gets an exact new name.
11. **A new cross-test risk is written down.** A PC now honours `fm.cvPair`, and every open writes it. All 26 existing
    tests that open Friends were checked: they run inside `with945` or restore the key. Every new test must too.
12. T7 gets `with945` and points at the 944 test's `wasHome` and `press`.

Checked and left alone:
- **The phone.** Only width-free rules move out of the phone query, and none of them overlaps a property with a rule that
  stays in it. `cvPlace` takes the phone's `else` path exactly as the old block did, and `cvAim` is a no-op there. So the
  "identical phone pixels" check in §7 is a fair gate.
- **One close.** Every close still goes through `cvClose`: the cog's second press (the lifted cog → `#cv-cancel`), Escape
  (app.js ~8789 → `#cv-cancel`), the backdrop and Apply.
- **The 944 toggle.** It holds for the cog. For Part 2, `cv-share-src` puts the cog back under the scrim, so a cog press
  lands on the backdrop and closes. It does not reopen.
- **The upward PC anchor.** It is unchanged. The pair's padding reproduces the card's old margin. The existing
  `PC: canvas settings …` tests' geometry holds for B at 900×760 (a max height of 508 against the 361 it needs).
- **Collaboration with no network.** T4, T5 and T7 run under `withFakeNet921`, and T2 and T3 now do too. The loopback
  `relayGate()` refuses a real socket in any case.
- **Tests fail on HEAD.** On HEAD, T1–T6 and the 945 retune all fail at their first pair assertion, because no PC ever
  gets `cv-pair`. T1 carries the phone control.
- **The Friends block's grow origin.** It is `top right` in the plan and was `bottom right` in the prototype. The plan's
  value matches the card's own `cv-grow`, and it lasts 160 ms, so it was left alone.
