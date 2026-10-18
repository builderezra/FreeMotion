# bughunt1 — two confirmed defects, fixed red-first (hunt/bughunt1-fix, from 2d1f6067)

Written code-only while a release shipped: nothing was run but `node --check` on the two changed files. The builder runs the tests.

## Defect 1: a decoding Scramble ignored the caption's alignment under Animate by Line or Word

- **Where:** `js/compositor.js`, `drawAnimatedText`, the flat units loop (`runs = planRuns(ctx, u, sub, …)`, about line 4385).
- **Bug:** the animated path called `planRuns(ctx, u, sub)` with no alignment, so every run started at its unit's left (`x = sx`).
  The still path (`planPaint`) passes the alignment and centres a run on its landed span, or ends it at the span's end (the PM's
  rule, 17 Oct). By Line, a scrambled line wider or narrower than the landed line hung off one side of a centred caption and ran past
  the right margin of a right-aligned one.
- **Fix (the PM's decision):** pass `align` (`layer.align || 'center'`, already in scope) for `unit === 'line'` and `unit === 'word'`;
  pass `'left'` for anything else, which is the character unit (and any unknown unit, which also falls to graphemes).
- **Why nothing else moves:**
  - `planRuns` with `'left'` takes the same branch it took with `undefined` (`x = sx`). So character units and every left-aligned
    caption get exactly today's numbers. Test 4 of '966 scramble layout' pins the character origins and is untouched.
  - The change runs only when a line has a plan (a Scramble is decoding) and the unit's paint differs from its layout. Every other text
    takes `runs = null`, as before.
  - By Line the unit is the whole line. The unit sits at `x = -lineW/2` (or `-lineW`), and `planRuns` on that line under the same
    alignment returns the same `r.x` the still path's `planPaint` gets. So the run lands exactly where the still caption paints it
    (when letter spacing is 0; with letter spacing the animated path's existing `- sp` trim still applies, as it does to all text).
  - By Word each word is its own animated unit. Its run is aligned inside its own landed word's span. That is not the still caption's
    place, because a still line with nothing hidden is one run centred on the whole line, and a word unit can only paint inside itself.

## Defect 2: Colour Cycle's keyframed Speed was not integrated

- **Where:** `js/compositor.js`, `PIXEL_FX.huecycle` (about line 23512).
- **Bug:** `deg = phase + speed * tl` with `speed` evaluated now. With Speed keyed from 360 down to 0 over 2 s, the colours turned
  backwards after the peak.
- **Fix:** when `FM.isAnimated(p.speed)` and `tl > 0`, `deg = phase + FM.integrateProp(p.speed, t - tl, t, u => Math.max(0, evalProp))`.
  This is the same clip-clock interval `wClipIntegral` uses, and the same floor of 0 the plain path applies to `speed`. A non-finite
  integral counts as 0. `hueSpread966` (Rainbow across) is handed this `deg`, so it gets the integrated angle too. Stepped is applied
  after, as before.
- **Why nothing else moves:** an unkeyed (or absent) Speed takes the old line, `phase + speed * (tl > 0 ? tl : 0)`, character for
  character. A keyed Speed at `tl <= 0` takes it too (`phase + speed * 0`, which the integral would also give).

## Tests (tests/tests.js, between `// ── bughunt 1 (hunt/bughunt1-fix) ──` and `// ── end bughunt 1 ──`)

All three use `{ item: '966' }`.

1. **`bughunt1 … by Line …`** — the base Scramble (Any) at 0.5 under Fade by line, centre / right / left, at 3.2 s (at rest). It is
   compared call for call (string, L, Y within 1e-3) with the same caption with no Animate preset.
   - **Fails on 2d1f6067:** a centred scrambled line starts half its width difference to the left; a right-aligned one is off by the
     whole difference.
   - **Controls:** some line's paint differs from its layout by more than 1 px (`_slCtx` + `FM._textPaintLines`). Left-aligned matches
     the still caption. By Character, each scrambled glyph keeps its landed glyph's left, while some glyph's width differs by more
     than 1 px.
2. **`bughunt1 … by Word …`** — the same Scramble under Fade by word. Each word is checked against the landed caption (Progress 1)
   under the same preset: its left plus (landed − painted width) / 2 when centred, plus the whole difference when right-aligned, and
   plus 0 when left-aligned.
   - **Fails on 2d1f6067:** every word is painted from its left.
   - **Control:** some word's width differs by more than 1 px.
   - **Adapted from the brief:** the brief asked for a match against the still caption. That place does not exist for a word unit
     (see above), so the test checks against the landed word's span instead.
3. **`bughunt1 Colour Cycle …`** — Speed keyed 360 → 0 over 2 s, on a solid red 8x8 plate, at 1, 1.5 and 1.9 s, with Rainbow across
   0 and 180. Each must be within 1 level (`E1.maxDiff`) of a still Colour Cycle at `phase = 360t − 90t²` (270, 337.5 and 359.1, all
   under 360, so no wrap is involved).
   - **Fails on 2d1f6067:** the old code turns 180°, 135° and 17.1° instead.
   - **Controls:** the old angle's picture is more than 8 levels away from the right one. A Speed keyed constant at 90 equals a plain 90.

## Unsure

- None of this was run. The tolerances (1e-3 px, 1 level) come from the arithmetic: the integral of a linear speed is exact under
  Gauss-Legendre, and the positions are the same float expressions on both sides. They were not measured.
- The Word test assumes one fillText per word with no hidden letters (the base Scramble hides none) and that `_slCtx`'s font matches
  the draw pass's font. The '966 scramble layout' tests already depend on that.
- Word Highlight's animated pieces (`hlAnimPiece`) paint the same `runs`, so a lit unit picks up the alignment by Line and Word too.
  The highlight's boxes are measured on the layout and do not move. No test covers a Word Highlight together with a decoding Scramble
  under Animate. The animated Curve places glyph by glyph and is untouched.
