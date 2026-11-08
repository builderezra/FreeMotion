# Simple Phase 3 · Captions — with riders, and Find speech (queue 980, refers to #545)

Branch `hunt/sm3-captions`, built **on Look** (`ssh/hunt/sm3-look`, 7da21cf2), so the two stack: Look's panel plumbing
(`panelKind`, `drawPanel`, the `_toggle` swap) is what Edit lines hangs on. **Nothing was run**: a release ship was running in the
main checkout, so no node, no python, no browser, not even a parse check. Every line here is from reading; the suite has not seen it.

## What the design asks (and where)

- §15 Phase 3 row (DESIGN.md line 4032): "Captions with riders and Find speech (stays with its sound)". Its open decision is D3
  (the Create picker) only; D14b / D18 / D22–D24 do not touch captions. **Nothing in Captions waits on an open decision.**
  Applied: D14 A (captions work live: every step here is non-arranging, non-adopting), D20 A (the panel docks in the band on a PC,
  the sheet on a phone), D16 A (the kit's icons, `vis/kit.js` ICONS and `VIS.ITEM_TRAYS.captions`).
- §8.5 project tools (2685): **Captions → Type captions · Find speech · Style**; caption-track tray (2701): **Edit lines · Style ·
  Find speech · Follows the clips / Stays with the sound · 🗑**; §8.9 word table (2917) for the switch's words.
- §3.5 (656–768): the rider maps (built in release 2.4 — `riderPlan` / `captionRider` in `js/spine-edit.js`); "a caption track that
  lies on one clip follows it" (746–751); **"A caption track stays with the sound it was timed from"** (758–767): when Find speech
  succeeds, look at the layer that really produced the lines; if it is not a main clip and stays put, the track gets `sm.stay` in the
  same undo step, line *"12 cues from ‘Voice 1’ · they stay with the voice-over"*. Line 724–725: in Simple a NEW track is sized
  `R.trackEnd − R.main[0].start`, never `P.duration`.
- §12.3 (3750–3758): one track = one style; Find speech "finds *when* someone speaks and makes empty cues to type into", the sheet
  says so in one line; words are Later (#152). §8.7 (2868): honest label "it finds *when* people speak; you type the words".
- §3.12 (1425–1470): Simple never calls `FM.toast`; a refusal / result needing his eyes takes `#sm-say`, a no-button result goes to
  `#sm-live`.

## What was built

- **`js/spine-edit.js`, block PHASE 3 · CAPTIONS** (appended after Look's block):
  - `S.captionTrackAt(t)`, `S.planCaptionAdd(R, t, o)` — **Type captions**: one line at the playhead, in the track whose window holds
    it or (none) a **new track over the clip row** (`R.main[0].start` … `R.trackEnd`, made exactly like `FM.addCaptionLayer`'s:
    name Captions, y 82 %, fontSize H/22, plate on, `giveWrap`), inserted at the top of the stack (§3.6.1). The line is clamped to
    end with the clip under the playhead, so a later move of that clip never has to split it. Then (`plan.after`) the playhead goes
    into the line and **the real text editor opens on it** — the one text-entry surface `js/captions.js` insists on. A track over two
    or more clips is a **rider** (2.4 carries it cue by cue); over one clip it **follows** that clip. Label `Add caption`.
  - `S.planCaptionRemove` (✕ in Edit lines; the line found by its own object, not its index — the editor's flush can drop a blank
    line first). Label `Remove caption`.
  - `S.planCaptionStay` — **Follows the clips / Stays with the sound** = the track's `sm.stay`. Labels `Captions stay with the sound` /
    `Captions follow the clips`.
  - **Find speech**: `S.speechSources` (the selected clip/sound with sound → that one only; a selected caption track or the tray's
    Find speech → the sounds under its window; otherwise every main clip with sound, all listened to, and only if none has talking
    the other sounds one at a time), `S.findSpeech` (listens **before** the runner, `S.reading` holding the switch shut, progress
    *"Listening to 2 of 4… 40%"* in `#sm-say`, 8 kHz decode as Full's), `S.speechSpans` (source seconds → project time through
    `FM.captions.segmentToLocal`, so trim / speed / reverse map exactly as Full's Detect speech; mapped from the layers at plan time),
    `S.planFindSpeech` (ONE step `Find speech`): a new track lies on the one clip that spoke (a follower), over the clip row when
    several did (a rider), or over the sound's span; **`sm.stay` in the same step when the only source that spoke is not a main clip
    and stays put** (pinned, or no host). Re-listening on an existing track keeps its window and carries each typed line's words to
    the new line that overlaps it most (FM.captions.detect's rule), read after the runner flushed an open editor. **Nothing found → a
    line (*"No speech found in Clip 2"*, or *"No talking in … · it sounds like music"* from the detector's own `clipDbStd`), nothing
    written, no step.** A file that will not open → *"Couldn’t listen to Clip 2 · its sound didn’t open"* + `FM.reportError`.
- **`js/simple-tools.js`**: the **Captions project tool** (between Text and Sound, the design's order) opening a list like Sound's:
  Type captions · Find speech · Style (Style only once a caption track exists: selects it and opens today's panel). The **caption
  track tray**: Edit lines · Style · Find speech · Follows the clips · Stays with the sound (a pressed pair) · 🗑. **Edit lines** is a
  third `panelKind` (`'lines'`) drawn through Look's `drawPanel` hook where More's/Look's panels dock: each line's time and words
  (`textContent` / an attribute, never markup), a tap = playhead into the line + the text editor, ✕ = one step, "Add a line here" =
  Type captions on this track. The list keeps its scroll across the redraw after each step.
- **`js/spine-words.js`**: every new word, at the end of `lines` and `tools`. **`styles.css`**: one block after Look's, `.sm-cap…` only.
- Busters: styles.css 770, spine-words 15, spine-edit 14, simple-tools 12 (each one above Look's tree). `js/inspector.js`,
  `js/captions.js`, `js/text-edit.js`, `js/spine.js`, `js/simple-timeline.js` are **not touched**.

## Decisions taken here (say so if wrong)

1. **The Find speech result is a visible `#sm-say` line** (*"2 captions from Clip 2 · type their words"*), not `#sm-live` only: it
   answers seconds of listening and says what is left to do; the tray shown under it is a new one (the track's), so no tool under the
   thumb is displaced. Type captions / ✕ / the switch speak to `#sm-live` (rule 1a).
2. **DESIGN line 1421 says Find speech's no-result "reuse[s] their existing toasts"; §3.12 rule 1 says Simple never calls
   `FM.toast`.** Followed §3.12 (and the brief): a line in the tray row.
3. Line words say **captions**, not "cues" (the design's §3.5 example says "12 cues"): "cue" is not a word Simple shows anywhere else.
   The source is named by `itemWord` (*Clip 2*, *the sound*, *the song*), never `layer.name` (§8.9).
4. Find speech with nothing selected listens to **every clip** (auto-captions for the whole video), not just the one under the
   playhead; then the other sounds one at a time. Selected clip → that clip only (his pick respected, as Full's "One audio clip…").
5. **Style** in the tray is today's panel for the track (font, colour, plate) — the job More did on this tray before. There is no More.

## ❓ Needs his eyes before it ships (#545: nothing visual new to him ships unseen)

1. **The Edit lines panel** at 380 (sheet) and 1280×800 (band): rows of time + words + ✕, "Add a line here", the empty-line
   wording *"Empty · tap to type"*. Never drawn on any sheet (V4 drew a read-only cue list; this one has ✕ and the add button).
2. **The caption tray at 380**: six tools, two of them wide labels (*Follows the clips* ~97 px, *Stays with the sound* ~112 px), so
   the row scrolls with the fade at 380 (Stays with the sound starts off-screen right); on a PC the six lie on two rows (3 + 3).
   Option: shorter faces (*Follows* / *Stays*) with the full words as the title — his word table (§8.9) has the long ones.
3. **The Captions list** (Type captions · Find speech · Style) — drawn as a sheet with three rows in V4; built as Sound's small list.
4. **The project row now holds five tools** (Clips · Text · Captions · Sound · Overlay); at 380 each is ~70 px, in the 1280 band ~61 px.
5. The line wordings in `spine-words.js` (Phase 3 · Captions block).

## Open / not done (said plainly)

- **No word timing / words** — Later (#152), as the design says.
- **Find speech's "Just this caption clip" / "One audio clip…" scope picker** (Full's `detectRow`) is not offered in Simple; the
  source is the selection (or every clip). Full's own picker is untouched.
- **The adoption exception of §3.5** (a track over no audible main clip and exactly one non-music stay-put sound becomes Stay put at
  adoption) is classifier/adoption work, not this tool — not built here; the Find speech route (the one the brief names) is.
- **Overlap of lines from two sources** (e.g. a clip and a voice-over both talking) is kept stacked (#574), not merged.
- The 844×390 sideways sheet for the lines panel docks where More's does today (shared with Look and More, unchanged).
- A caption track inside a **caption block** (§2.5) gets the plain caption tray; its block line (*"Captions in this group…"*) is not
  added here.
- Ask's `addCaptionTrack` (§8.5a) still goes through Ask's own path (Ask in Simple is its own Phase 3 part).

## Tests (tests/tests.js, before the final `})();`, `{ item: '980' }`, all but two at 380)

New — each fails on 7da21cf2 at its own sentence ("the project tools have no Captions …" / "… tray has no Edit lines …"):
1. `simple P3 · Captions at 380 the project row is Clips · Text · Captions · Sound · Overlay, … tray is Edit lines · Style · Find speech
   · Follows the clips · Stays with the sound · Delete — the last two one two-way choice, ONE step each …` (labels checked through
   `FM.history._metaHere()`; pressing the pressed half is a no-op).
2. `… Type captions with the playhead on Clip 2 adds ONE line there … rides with Clip 2: a shorter Clip 1 and Move later each carry it`
   — new track [0, 6], line [3, 4] (ends with Clip 2), one step `Add caption` (`ed: 's'`), the editor open on it, closing it with
   nothing typed adds no step, the track is a rider; Clip 1 → 1.5 s puts the line at [2.5, 3.5], Move later at [4.5, 5.5] — always
   1 s into Clip 2. CONTROLs: Clip 2 really moved each time.
3. `… the words typed into a line are kept as words …` — Edit lines lists both lines; a tap opens the text editor; `<img … onerror>Hi &
   <b>bye</b>` typed through `#te-input` is stored and listed word for word, no `img`/`b` in the panel, no `#smcpx` anywhere; ✕ on
   Hello is one step `Remove caption`.
4. `… Find speech on a selected clip …` (stubbed `FM.decodeAudio` at 8 kHz + `FM.detectSpeech`) — source 0.2–0.8 / 1.1–1.7 s of
   Clip 2 → lines at [2.2, 2.8] and [3.1, 3.7], empty words, track = Clip 2's [2, 4] and its host is Clip 2, one step `Find speech`,
   one listen, line *"2 captions from Clip 2 …"*; Move later → [4.2, 4.8], [5.1, 5.7].
5. `… Find speech on a voice-over that stays put marks the new track Stays with the sound in the same ONE step …` — line [1.5, 2.5],
   `sm.stay`, *"… they stay with it"*, Move later of Clip 1 leaves the line at [1.5, 2.5] (CONTROL: Clip 1 moved, the voice did not).
6. `… Find speech that hears nothing says so … and writes nothing …` — *"No speech found in Clip 2"*, no step, no track, document
   byte for byte (CONTROL: the detector was asked).
7. `simple P3 · Captions switched to Full: … an ordinary caption track there …` (default width) — `FM.captions.isTrack`, Full's
   Captions card lists 1 `.cap-row`, no key a Full text layer lacks, no `sm`, no Captions tool in Full.
8. `simple P3 · Captions leaves Full’s own panel alone …` (380 and 1280) — CONTROL: Simple draws the lines panel; Full draws its own
   editor, never `.sm-cap`; `drawPanel` false in Full.

Changed (the project row grew a tool; intent kept):
- `smTrayCheck` (380 / 1280 trays): project tools `clips,text,sound,overlay` → `clips,text,captions,sound,overlay`.
- `simple P2.2 · review More’s panel leaves Clips, Text, Sound and Overlay in reach …`: its CONTROL count 4 → 5 (all five are then
  checked to be pressable with More's panel up). Title unchanged.

## Merge notes (vs hunt/sm3-morph; this branch already contains Look)

Shared files: **`index.html`** (four busters: styles.css 770, spine-words 15, spine-edit 14, simple-tools 12), **`styles.css`** (one
block after Look's `.sm-look…` block), **`js/spine-words.js`** (keys appended after Look's at the end of `lines` and `tools`),
**`js/spine-edit.js`** (one block after Look's, before the closing `})(window.FM);`), **`js/simple-tools.js`** (ICON entries after
Look's `none`; two `let`s after Look's; `captionsTool` before `buildTools`; one project-tool row; the `k === 'captions'` tray line
replaced; the Edit lines block after `lookPanel`; **two one-token edits inside Look's code**: `_toggle` dispatches `'lines'` to
`openLines`, and `drawPanel` gets one line before Look's guard; `toggleLines` / `openLines` / `_drawLines` after `lookTab`; `_reset`
clears `linesSeen` / `linesTop`), **`tests/tests.js`** (the block at the end + the two count edits). The morph touches
`index.html`, `js/editor-mode.js`, `styles.css`, `tests/tests.js`: take the base for each buster and bump once above the higher
(CLAUDE.md index.html rule); tests — rebuild by blocks, never union-merge.

## What the lock run (Full unchanged, FU1–FU7) must cover

No Full file changed (`js/inspector.js`, `js/captions.js`, `js/text-edit.js`, `js/app.js` untouched). In Full: `drawPanel`'s new first
line is false outside Simple; the lines panel adds one passive `scroll` listener on `#inspector` the first time it draws (returns at
once outside Simple); `.sm-cap…` rules match nothing Full makes. A caption track made in Simple must look and edit in Full exactly
like one made by Full's Add → Captions (test 7 is the in-suite guard): its Captions card, its Aa sheet, Detect speech, export burn-in.
Also run the 2.4 rider tests (`simple P2.4 · T4 …`) — Captions leans on them for "moves with the clip".
