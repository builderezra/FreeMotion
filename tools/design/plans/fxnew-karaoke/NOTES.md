# #966 B9 — Word Highlight (karaoke captions) — hunt/fxnew-karaoke

Backlog: `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B9 ("Karaoke captions (Word Highlight). Text, L").
Branch `hunt/fxnew-karaoke`, off `8004fa16` (hunt/fx-land-on-fb2). **Nothing was run** while this was written — no node, no
python, no browser (the API builder was shipping). Every claim below about behaviour is from reading the code; the proof is
`prove.sh` (scratchpad, see the end) plus the two browser-only tests and the render probe.

## What was built

A new **text effect, Word Highlight** (`wordhighlight`, Effects → Text, text layers only). The word being said lights up.

| Control | Key | Values | Default |
|---|---|---|---|
| Timing | `follow` | Progress / Spoken | **Spoken** |
| Progress | `progress` | 0–1, keyframable (live only under Progress) | 0.5 |
| Lights up | `unit` | Word / Letter / Line | Word |
| Style | `style` | Colour / Box behind / Underline / Scale up | Colour |
| Active colour | `color` | colour, keyframable (Colour, Underline, Scale up) | #ffd23f |
| Box colour | `boxcolor` | colour, keyframable (Box behind) | #7c3aed |
| Padding | `padding` | 0–60 px (Box, Underline) | 12 |
| Corner radius | `radius` | 0–60 px (Box, Underline) | 14 |
| Grow | `grow` | 100–200 % (Scale up) — not in the spec; added for choice | 120 |
| Said words | `past` | Return / Keep highlight | Return |

- **Spoken** on a caption track: each word lights while it is being said, from its cue's timing. On a plain text layer the
  words light in turn across the clip (the clip is one long cue) — so it plays with nothing keyframed.
- **Progress**: the units in reading order; 0 lights none, 1 is past them all (Return: none lit; Keep: all lit).
- **Keep highlight**: every unit already said stays lit; neighbouring lit units merge into one run (one box, one underline).
- Works on the still path and on every Animate preset (the box rides each unit in). The **curved** paths (Text Curve, the
  layer's own Curve) ignore it — a question below.
- Search finds it by karaoke, karaoke captions, word by word, active word, lyrics, tiktok captions, subtitle highlight,
  highlight words. ("karaoke" elsewhere is the audio Vocal Remove; that lives in the Sound browser, so they do not meet.
  "Word Highlight" is not in the #954 names list and collides with no label.)

### How static text stays byte-identical (the backlog's named risk)

1. `TEXT_FX.wordhighlight` **never changes the string or spacing** — it only sets `st.highlight`. Wrapping, measuring, the
   layer's box (`FM.layerSize`, `fillBoxOf`, the Copy Background footprint) see exactly what they always did.
2. The render site computes `_hl` **only when an enabled Word Highlight is on the layer**, and the new painters run **only
   when something is lit at t** (`_hlLit`). Otherwise the still path takes the very `lines.forEach` it always did, and
   `drawAnimatedText` gets `null` as a new 9th argument and runs its old two lines per unit (they are textually unchanged,
   inside an `else`).
3. A lit unit is painted by **clipping**, not by cutting the line: the line is drawn by the plain path's own two lines
   (stroke, `fillTextA`) once outside the lit runs in its fill and once inside them in the active colour. So kerning, the
   Type-On caret (ghostLine), the gradient and the outline land where they always do, even on a lit layer.

Held by the test `966 B9 text WITHOUT a lit Word Highlight draws the very same bytes` (no effect = switched off = nothing lit =
past the last word, on nine kinds of text) and, **against 8004fa16's own renderer**, by the probe's pins (below) and the
existing text suite in prove.sh stage 3.

### Word times — how they are made and stored

- `captions-vad.js` returns only `{start, end}` per stretch of speech, and the words are typed AFTER Detect speech, so there
  is **no per-word timing to keep from it**. It was not changed.
- **Derived**: a cue's words share its length by weight — syllables (vowel groups, a silent final e dropped, each digit a
  beat, a non-Latin character a beat), **+1 beat after . ! ? …** and **+0.5 after , ; : – —** (the pause belongs to the word
  before it). `FM.captionWordTimes(cue, words, dur)` in js/compositor.js (there so the renderer needs nothing from
  captions.js); each word starts where the one before ended, the last ends with the cue.
- **Stored, editable**: `cue.words` = each word's start in seconds from the cue's real start (`[0, 0.42, 0.9, …]`). Used
  instead of the derived times when its count matches the cue's words and it never goes backwards; otherwise ignored, never
  misapplied (a caption that gains or loses a word falls back to the shared-out times). `FM.captions.bakeWords(layer, force)`
  writes today's shared-out times onto every caption — the hook a word-timing editor (or the AI) would start from.
  **Nothing calls bakeWords automatically yet** (deliberately: without an editor, baking only freezes stale times when the
  text changes; derived times re-spread by themselves). Question 4.
- **Split-aware**: the span is the cue's REAL start/end — `animFrom` on a Split's tail half, `animTo` on its head half (the
  `FM.captions.animSpan` rule, without its clamp to the clip) — so a split does not re-spread the words over each half.
- **Which lists name caption-cue fields** (the whitelist-drift lesson), checked one by one:
  - `js/storage.js` `sanitizeEffects` caption loop — the only cue sanitiser; it only touched `c.effects`. **Added**: a
    malformed `c.words` (not an array of finite seconds 0–3600, ≤ 5000 long) is dropped whole; a valid one is kept untouched.
  - `js/collab-path.js` `ATOMIC` — `captions` is atomic, the whole cue array moves as one value: `words` rides along. No change.
  - `js/app.js` FM.splitLayer — deep-copies each cue (`own(c)` + spread): `words` kept. No change.
  - `js/timeline.js` shiftCues / FM.shiftLayerCues (trim) — spreads each cue: `words` kept, and relative to the cue's start it
    travels with it. No change.
  - `js/captions.js` normalize / addCue / detect — normalize keeps unknown fields; addCue and detect build NEW cues (detect's
    new timing must not inherit old word times). No change.
  - `js/ai-manifest.js` cue schema (`additionalProperties: false`, start/end/text) — the AI cannot write `words`; AI cues
    use the derived times. Left alone (a choice; opening it is a one-line change if wanted).
  - `FM.jsonReplacer` drops only `_` keys: `words` saves.

## Files

- `js/compositor.js` — TEXT_FX.wordhighlight; the highlight block after drawAnimatedText (hlUnits, FM.captionWordTimes,
  FM.captionWordStarts, the painters, drawHighlightLines, the animated-unit pieces); drawAnimatedText's 9th argument; the
  render site; the catalogue row — **pushed straight after the main EFFECTS table, before E1's six**, so
  `FM.fxRegistry.all()`'s first 205 (frozen by the 921 kitchen fixture) and E1's newest-six are untouched. Seams:
  `FM._hlUnits`, `FM._hlWeight`.
- `js/fx-registry.js` — CATEGORY_OF (batch 42, text), TEXT_ONLY, SEARCH_ALIASES.
- `js/captions.js` — `FM.captions.wordTimes`, `FM.captions.bakeWords`.
- `js/storage.js` — the `cue.words` guard.
- `js/fx-thumbs.js` — the browser tile lights "Abc" letter by letter (one word would be lit for the whole clip).
- `index.html` — busters: compositor 219→220, fx-registry 27.32→27.33, fx-thumbs 55→56, storage 62→63, captions 62→63.
- `tests/tests.js` — eleven `966 B9 …` tests, appended before the final `})();`.

## The tests (every one fails on 8004fa16 by name: "there is no Word Highlight in the effects catalogue …")

1. catalogue — controls, types, defaults, options; found by karaoke; never changes the string; not in the NEW row; not
   inside the 921 fixture's 205.
2. byte identity — no effect / switched off / nothing lit / past the last word agree on plain, outlined, gradient, curved,
   wrapped, right-aligned, Type-On (dark caret), caption and Pop-in text; CONTROL: a lit box changes the picture.
3. Progress — Word / Letter / Line, Return / Keep, 0, 1, keyframed; the box lands on the lit word (measured).
4. Spoken — syllable weights; a cue shared out 3:1:1:1; stored words that fit / have the wrong count / go backwards; a Split
   tail (animFrom); two stacked captions each lighting their own word; plain text over the clip; the box at 2.6 s.
5. Box behind (Padding 4 and 14 edges, Corner radius corner pixel with a square-box CONTROL) and Underline (x and y), measured.
6. Said words — Keep = one run (no gap columns), Return = the word being said; the units read said/said/being said/to come.
7. preview plates — Box and Underline at 0.5 and 0.28 within 1.5 px of the export area-shrunk; CONTROL: the next word lit is
   > 3 px away; the same instant after a scrub is the same bytes.
8. save/reload — `words` survives JSON + `_sanitizeLayers` (load, import, undo) twice; a string and a NaN list are dropped;
   the lit word follows the stored times after the round trip; captionWordStarts / bakeWords.
9. Animate presets — Fade by letter, word and line: settled box = the still box; Pop mid-entrance (opaque, 10% over size):
   the box is wider and centred — it rides its word.
10. **Colour (browser-only)** — red only on the lit word / letter / line, no white left in it.
11. **Scale up (browser-only)** — the lit word 1.5× about its own centre; "one", far away, pixel-identical.

10 and 11 say NOT RUN HERE on a canvas that draws no glyphs (the node harness's soft canvas) — they must be run in a
browser slot. Tests 1–9 run in node (the soft canvas draws boxes and underlines; text is invisible there, so test 2's
identity is only meaningful in the browser — prove.sh stage 3 and the probe pins cover the old renderer).

## The sheet (render-probe.js) — for the next browser slot

`tools/design/plans/fxnew-karaoke/render-probe.js`, run in the app page with `window.__recv` = the receiver's port:
- **pins**: hashes of nine kinds of text WITHOUT a Word Highlight at two times. Run on this branch AND on 8004fa16 in the
  same browser — they must be identical.
- **sheets** (380 px phone-width frames over fx-art/clouds.jpg, cropped to the caption, all under 2:1 tall):
  `wh-colour-word/letter/line`, `wh-boxbehind-…`, `wh-underline-…`, `wh-scaleup-…` (12 sheets: Return left, Keep right,
  at 0.9 / 2.0 / 3.2 s), `wh-options` (no highlight, then colour / box / underline / grow variants), `wh-animated` (Box on
  Fade up by word, six moments). Show him the sheets and let him pick before it ships (#545).

## Questions for Ezra

1. **Default look** — Colour (yellow word) or Box behind (violet box, white word)? Word, Return? (Recommended: Colour, Word,
   Return — the TikTok/CapCut default. The sheets show all of them.)
2. **Default colours** — active #ffd23f yellow, box #7c3aed violet? Pick from wh-options or name your own.
3. **Spoken as the default Timing** — recommended: it plays with nothing keyframed, on captions and plain text alike.
4. **A word-timing editor?** Today a caption's words share its length by syllables. Do you want to drag each word's start in
   the caption list (it would store `words` on the caption — the storage is already there)? Or have the AI do it?
5. **Curved text** — the highlight is ignored on curved text (Text Curve / Curve). Worth building?
6. **Box behind has no shadow or glow** (like the caption plate) — or should the box take the text's shadow too?
7. The name: "Word Highlight" (karaoke already means Vocal Remove in the sound tools). OK?

## Merge notes (hunt/fxnew-all integrates the §B branches)

- **NEW row**: Word Highlight is TEXT_ONLY, so FX_FEATURED skips it: the three NEW-row tests (E1 newest-six, 745, 913.8)
  are **untouched by this branch**. Its catalogue row sits before E1's six, so E1's `types.slice(-6)` is unchanged — but any
  §B branch that appends a visible effect AFTER E1 changes E1 newest-six / 745 / 913.8 regardless of this one.
- **Textual conflicts to expect**: fx-registry.js CATEGORY_OF (a `// batch 42` line after batch 41 — other branches add theirs
  there too), SEARCH_ALIASES (appended last), index.html busters (take the highest and re-bump every chain step — the
  index.html-conflicts lesson), tests/tests.js (appended before `})();` — rebuild by blocks, never union-merge).
- **Collab**: new registry params move `FM.collab.schemaFingerprint()`; **C.SCHEMA_FP was left alone** — set it once at
  landing from fp.js on the merged tree.
- **/security-review is owed at landing**: this renders user text and stores user data on captions. What to look at: no
  `innerHTML` is used anywhere in it (all canvas drawing); colours from a project file are only handed to the canvas when
  they look like `#hex` / `rgb()` / `hsl()` (else the default); `cue.words` from a file is type-checked in storage.js and
  again by the renderer before use.

## Unsure / not proven

- Nothing was run. In particular I could not see a single picture — the sheets are owed to Ezra before shipping.
- With letter spacing set, the clip boundaries assume Chrome's `fillText` centres a line on the width `measureText` gives
  (trailing gap included). If it does not, a letter-spaced line's lit boxes sit half a gap off — invisible for words (the
  boundary is mid-space), possibly a sliver for Letter. The tests use spacing 0.
- Test 6 reads the box's row just above the glyphs (2 px inside its top edge); in a browser that assumes a 32 px
  Inter/sans ascender lower than ~0.72 em above the baseline. In node there are no glyphs, so it cannot fail there for this.
- Tests 3–7 and 9 put tolerances of 1.5–3 px on measured edges; they are reasoned, not measured. If one is red in the
  browser slot, measure before widening it (the tolerance-from-measurement lesson).
- Type-On + Spoken on plain text: as Type-On reveals words, the clip is re-spread over the words shown so far, so the lit word
  can move back as the next word appears. Captions are unaffected (their timing is the cue's).
