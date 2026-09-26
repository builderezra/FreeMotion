# Plan: on a phone, the SMALL Help menu is actually small

**His words (verbatim, INBOX.md 26 Sep ~22:41, not yet numbered):**
> "Also on mobile make it so that the small version for the Help menu is actually small because right now it's like there is no difference"

Clauses: (1) on mobile, small Help (the ? Shortcuts/tips panel) must be clearly small; (2) right now small and big look the same.
Number it when the inbox is drained. It is a follow-on to #927 (the two-size panels). Below, `NNN` stands for that number.

## Why there is no difference (measured, not computed)

Small is `.shortcuts-card` (`styles.css` ~3656). It is `width: min(440px, calc(100vw - 24px))` with
`min-width: min(360px, calc(100vw - 24px))` and `max-height: min(86vh, 86dvh)`. The list is ~1040px of rows, so it always
fills the 86% cap. Big is `.pb-card.pb-big` with the phone `--pb-w/--pb-h` (~10736): `100vw − 20px` × `100dvh − 20px − insets`.

Measured with `tools/shot.py` (headless phone, touch + hover:none), card opened inside a project. From Home (Settings ›
Keyboard shortcuts) the box is **identical** at both widths.

| screen | NOW small | NOW big | small as % of big (h) | narrower by | rows readable small / big |
|---|---|---|---|---|---|
| 380×800 | 356 × 688 @12,56 | 360 × 780 @10,10 | 88% | 4 px | 15 / 20 |
| 440×956 | 416 × 822 @12,67 | 420 × 936 @10,10 | 88% | 4 px | 23 / 27 |

For reference, small Notes (its sibling panel) is 344 × 243 at 380 and 404 × 227 at 440. It only looks small because its
content is short.

## Options (prototyped by injecting CSS into the running app)

All options are phone only (`@media (max-width: 700px)`) and small only (`:not(.pb-big)`). PC is untouched.

| option | 380×800 | 440×956 | rows readable | list scrolls inside | Tutorials + Close whole & pressable | grip pressable | grip tap → big → small returns to same box |
|---|---|---|---|---|---|---|---|
| **A — about half (recommended)** | 324 × 416 (52% h, 85% w) | 384 × 460 (48% h) | 7 / 10 | yes | yes (132×38 each / 162×38) | yes, top-right | yes (big 360×780 / 420×936) |
| B — smaller still | 324 × 320 (40% h) | 384 × 360 (38% h) | 4 / 7 | yes | yes | yes | yes |
| A hung under the ? (placement variant) | 324 × 416 @28,**55** | 384 × 460 @28,55 | 7 / 10 | yes | yes | yes | yes |

Pictures (2×2 each: NOW small | NOW big / A | B), phone-readable, 1200 wide, under 2.4× tall:
- `help-small-380.png`
- `help-small-440.png`

The raw frames are `w380-*.png` and `w440-*.png`. The `-7000` frames are the hung-under-the-? variant.

**Recommend A, centred.**
- It is visibly a different thing from big: half the height, a 28px margin each side, and the editor shows around it. It
  still shows 7–10 shortcuts at once.
- B shows only 4 at 380 (the key column plus a 276px text column wraps most rows to two lines), which is a peephole.
- Centred matches every other phone card: Notes, Canvas settings, Export and Before-you-export are all centred on a phone.
  `popFrom` is desktop-only by design, so this needs no JS.
- The hung-under-the-? variant also works (it sits at y 55, under the top bar, and leaves the bin and ? tappable). It is a
  taste call, so offer it only if he asks for it "out of the button".

## ⚠️ `min-width: 0` is load-bearing

The logger's sketch in INBOX.md leaves it out. Without it, **the width does not change at all**: the base rule's
`min-width: min(360px, calc(100vw - 24px))` is 356px at 380, and a min-width larger than the width wins. The probe
confirms this (see Verification: `NO_MINW` keeps small 336 wide at 360, i.e. 4px off big). Put it in the rule.

## The CSS to add (recommended = A)

Put it in `styles.css`, in the queue 927 block, **directly after** the line

`.pb-card.pb-big { flex: none; width: var(--pb-w); height: var(--pb-h); max-width: none; max-height: none; min-width: 0; }`

(~10743 in the current tree):

```css
/* A phone's SMALL Help is really small (queue NNN). Ezra: "Also on mobile make it so that the small version for the Help menu
   is actually small because right now it's like there is no difference". Measured at 380×800 before this: small 356×688,
   big 360×780 — 4px narrower and 12% shorter, because the list is long enough to fill small's 86% cap. Small is now about
   half the screen with a 28px margin each side (324×416 at 380×800, 384×460 at 440×956), centred like every other phone
   card, and the list scrolls inside it. min-width: 0 is load-bearing: the base rule's min-width (min(360px, 100vw − 24px)
   = 356px at 380) beats a smaller width, and without it the card stays exactly as wide as before.
   The floor (300px, or 86% of a shorter screen) keeps a landscape phone from getting a sliver.
   :not(.pb-big) so big keeps --pb-w/--pb-h; .pb-morph's !important caps still win while it animates between the two. */
@media (max-width: 700px) {
  .shortcuts-card:not(.pb-big) {
    width: calc(100vw - 56px);
    min-width: 0;
    max-height: clamp(min(300px, 86vh), 52vh, 460px);     /* where dvh is missing */
    max-height: clamp(min(300px, 86dvh), 52dvh, 460px);
  }
}
```

**Option B** is the same block with the height line changed:
`max-height: clamp(min(240px, 86vh), 40vh, 360px); max-height: clamp(min(240px, 86dvh), 40dvh, 360px);`

Specificity is (0,2,0), which beats `.shortcuts-card` (0,1,0) wherever it sits.
- `theme-glass.css` sets no sizes on this card.
- `.pb-card.pb-morph` (!important) still frees the box during the grow/shrink animation. That is what we want.

**Nothing in JS changes.**
- `js/popfrom.js` returns early below 701px.
- `js/panelsize.js` measures the live CSS box for the morph, the drag-preview outline and the fold.
- The fold's first beat now shrinks to about 0.53 of big before folding into the ?. It used to be capped at 0.8, so the
  close reads better too.

**Cache-buster:** bump `styles.css?v=` in `index.html`.
- v17.05 has since shipped (acae12a5) with `styles.css?v=727`, so bump it to `v=728`.
- If something else ships first, use whatever is there +1. ship.sh refuses otherwise.
- The anchor line is still `styles.css:10743`.

## The proving test (tests/tests.js)

Insert it after the last 927 test ("927 the grip is a button a keyboard can use…", ending ~line 100475). It must go before
the `QUEUE 942` comment, in the same scope as `tidy927`, `sleep927`, `rect927`, `near927`, `fmt927`, `grip927` and
`hitIs927`.

It fails on HEAD twice over: small is 88% of big's height and only 4px narrower.
- The positive control is that big still fills the phone. Without it, "small ≤ 60% of big" could pass by breaking big.
- A second control proves the rule stayed off PC.

```js
  /* ═══ QUEUE NNN — ON A PHONE, SMALL HELP IS ACTUALLY SMALL ═══════════════════════════════════════════════════════════════════
     Ezra, 26 Sep: *"Also on mobile make it so that the small version for the Help menu is actually small because right now it's
     like there is no difference"*. Measured before the fix at 380×800: small 356×688, big 360×780 — 4px narrower, 12% shorter,
     because the list fills small's 86% cap. Asserted as RATIOS against big at the same width, so the test says what he said
     ("no difference") rather than pinning pixels; and against a big that is proven to still fill the screen, so the ratio cannot
     pass by shrinking big. Opened in a project and over Home (Settings › Keyboard shortcuts), which are the two ways in. */
  test('NNN phone — the small Help (Shortcuts/tips) is clearly smaller than big: at most 60% of its height and 30px narrower, still usable small, big still fills the screen, and PC is unchanged', { item: 'NNN' }, async function () {
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    tidy927();
    function sheet() { const o = document.getElementById('shortcuts-overlay'); return o && !o.classList.contains('hidden') ? o.querySelector('.shortcuts-card') : null; }
    async function openSmall(where) {
      FM.shortcuts.show(); await sleep927(650);
      const card = sheet();
      if (!card || !card._panelSize) throw new Error(where + ': setup: the Help sheet did not open with its size grip');
      if (card.classList.contains('pb-big')) throw new Error(where + ': setup: it opened BIG — the remembered size was not cleared, so this would measure big twice');
      return card;
    }
    async function phone(where) {
      const card = await openSmall(where);
      const small = rect927(card);
      /* still USABLE small: the list scrolls inside, the foot is whole and both its buttons take a press, the grip is reachable,
         and enough rows show to be worth opening */
      const sc = card.querySelector('.shortcuts-scroll'), foot = card.querySelector('.shortcuts-foot');
      if (!(sc.scrollHeight > sc.clientHeight + 4)) throw new Error(where + ': small, the list does not scroll inside the card (' + sc.scrollHeight + ' in ' + sc.clientHeight + ') — the rest of the shortcuts are unreachable');
      const f = rect927(foot);
      if (f.t < small.t - 0.5 || f.b > small.b + 0.5 || f.b > innerHeight) throw new Error(where + ': small, Tutorials/Close are cut off (' + fmt927(f) + ' in a card at ' + fmt927(small) + ')');
      [].forEach.call(foot.querySelectorAll('.btn'), b => { const q = rect927(b); hitIs927(q.cx, q.cy, b, where + ': ' + (b.textContent || '').trim()); });
      const grip = grip927(card), g = rect927(grip);
      hitIs927(g.cx, g.cy, grip, where + ': the grip on small');
      const sb = rect927(sc);
      const rows = [].filter.call(card.querySelectorAll('.shortcut-row'), r => { const q = r.getBoundingClientRect(); return q.height > 0 && q.top >= sb.t - 1 && q.bottom <= sb.b + 1; }).length;
      if (rows < 4) throw new Error(where + ': small shows only ' + rows + ' shortcuts without scrolling — too small to be worth opening');
      card._panelSize.setBig(true, false); await sleep927(200);
      if (!card.classList.contains('pb-big')) throw new Error(where + ': setup: setBig(true) did not make it big');
      const big = rect927(card);
      /* THE CONTROL: big still fills the phone. Without it, "small is 60% of big" could pass by breaking big. */
      if (!(big.w >= innerWidth * 0.9 && big.h >= innerHeight * 0.85)) throw new Error(where + ': control: big is ' + fmt927(big) + ' in a ' + innerWidth + '×' + innerHeight + ' screen — it should fill it');
      if (!(small.h <= big.h * 0.6)) throw new Error(where + ': small is ' + fmt927(small) + ' and big ' + fmt927(big) + ' — small is ' + Math.round(small.h / big.h * 100) + '% of big’s height. He said "there is no difference"; on a phone small must be 60% of big or less');
      if (!(small.w <= big.w - 30)) throw new Error(where + ': small is only ' + Math.round(big.w - small.w) + 'px narrower than big (' + Math.round(small.w) + ' against ' + Math.round(big.w) + ') — it should sit clear of the screen edges, 30px narrower or more');
      if (small.h < innerHeight * 0.3 || small.w < innerWidth * 0.7) throw new Error(where + ': small went too far — ' + fmt927(small) + ' in a ' + innerWidth + '×' + innerHeight + ' screen');
      card._panelSize.setBig(false, false); await sleep927(150);
      if (!near927(rect927(card), small, 1)) throw new Error(where + ': back to small at ' + fmt927(rect927(card)) + ', not where it was (' + fmt927(small) + ')');
      FM.shortcuts.hide({ now: true }); await sleep927(150);
    }
    try {
      await atPhoneWidth(async function () {
        if (FM.home.isOpen()) { FM.home.close(); await sleep927(300); }
        await phone('phone, in a project');
        FM.home.open(); await sleep927(400);
        await phone('phone, over Home');
        FM.home.close(); await sleep927(300);
      }, 360);
      /* PC is not what he asked about: small there keeps its 440px card */
      await atWideWidth(async function () {
        const card = await openSmall('PC');
        const w = card.getBoundingClientRect().width;
        if (!(w >= 420)) throw new Error('PC: small Help is ' + Math.round(w) + 'px wide — the phone rule leaked onto PC (it is 440 there)');
        FM.shortcuts.hide({ now: true }); await sleep927(150);
      }, 1280);
    } finally {
      tidy927();
      try { if (hadHome && !FM.home.isOpen()) FM.home.open(); else if (!hadHome && FM.home.isOpen()) FM.home.close(); } catch (e) {}
      await sleep927(120);
    }
  });
```

Notes on the test:
- It uses the size controller (`card._panelSize.setBig(…, false)`), not `localStorage` `fm.panelBig`. The inbox item just
  above this one moves the remembered size to per-project storage, and this test must not care where it is kept.
  `tidy927()` does the clearing whatever it becomes.
- Real finger input on the grip at the new size is already covered by `927 phone — a finger has no cursor…`, which
  drags and taps the Shortcuts grip at 360. That test's "BIG shows MORE rows than small" gets easier (7 against 20). Its
  "back to small where it was" (`near927` ±2) was checked by hand here: the tap goes big and back, and the box is the same.
- Width 360 × the runner's 760 height: A gives small 304 × 395 against big 340 × 740 (53%, 36px narrower). HEAD gives
  336 × 654 against 340 × 740 (88%, 4px). See Verification.

## Verification (done here, by hand)

I ran the test's own assertions in `probe2.js` through `tools/shot.py` at the test's size, 360×760. I ran them against
HEAD's CSS and against each candidate, injected:

| CSS | small | big | small h / big h | narrower by | big fills (control) | scrolls / foot whole / buttons + grip pressable | rows | result |
|---|---|---|---|---|---|---|---|---|
| HEAD (in a project) | 336 × 654 | 340 × 740 | 88% | 4 px | yes | yes / yes / yes | 13 | **FAIL** (as it must) |
| HEAD (over Home) | 336 × 654 | 340 × 740 | 88% | 4 px | yes | yes | 13 | **FAIL** |
| **recommended A, clamp form above** (project) | 304 × 395 | 340 × 740 | 53% | 36 px | yes | yes / yes / yes | 5 | **PASS** |
| recommended A (over Home) | 304 × 395 | 340 × 740 | 53% | 36 px | yes | yes | 5 | **PASS** |
| B | 304 × 304 | 340 × 740 | 41% | 36 px | yes | yes | **3** | FAIL on `rows < 4` |
| A without `min-width: 0` | **336** × 395 | 340 × 740 | 53% | **4 px** | yes | yes | 7 | FAIL (width unchanged) |

- **If he picks B**, lower the test's guard to `rows < 3`. At 360 B shows only 3 shortcuts, which is also the best argument
  against it.
- The PC half of the test (`atWideWidth` 1280, small ≥ 420 wide) was **not** run here, because shot.py has no runner frame.
  It holds by construction: the rule is inside `@media (max-width: 700px)`. The suite run will prove it.
- The landscape-phone floor was **computed, not measured**. At 667×375 small would be 440 × 300 against big 647 × 355.
  Without the floor it would be 440 × 195, about 2 rows. Check it once with
  `tools/shot.py --width 667 --height 375` if landscape matters to him.

## Tests to re-run (both passes, desktop and `--width 380`)

```bash
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=927'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=927'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=NNN'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=only%20the%20list%20scrolls'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=690%20on%20the%20phone%20a%20tap%20outside'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=912%20the%20shortcuts%20sheet'
```

What each one covers:
- `only the list scrolls` is the pinned footer at the new height.
- `690 on the phone a tap outside` needs a tap over the bin to still land on the backdrop. It does: the card starts at
  y 192, well below the top bar.
- `912` is the Home look, and there are no size asserts in it.
- `?only=927` catches the new test too if it is numbered as a 927 clause.

Then verify it by eye at 380 and 440 with `tools/shot.py`: open ? in a project, tap the grip, and tap it back.
