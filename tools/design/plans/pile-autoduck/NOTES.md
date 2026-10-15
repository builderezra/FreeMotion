# #966 B25 Auto-duck music under voice — ported from the ChatGPT pile (refers to #545)

Branch `hunt/pile-autoduck`, built on `hunt/fxnew-drums` **85b71929**. Written 15 Oct while a release ship was running, so
**nothing was run**: not node, not Chrome, not `node --check`. The proof is `scratchpad/agents/pile-autoduck/prove.sh` (written,
not run); after it, the ten tests in Chrome at 900 and 380.

**The pile commit this replaces: `3b65fae1` "Generate music ducking keyframes from speech" (T05, the second of its two; its
report `outside/chatgpt/fixes/690-auto-duck.md` lives only in the pile). DROP `3b65fae1` when this lands.** T05's first commit
(Reduce Noise, `d59b8cfd`) is ported separately on `hunt/pile-reducenoise`.

## Where it came from, and his part in it

- The backlog (tools/design/plans/2026-09-29-idle-backlog/backlog.md, B25): a key layer or "any speech"; amount 0–30 dB (12);
  attack 0.05–1 s (0.2); release 0.1–2 s (0.6); padding 0–0.5 s (0.15); a Generate / Update keyframes button. How:
  `FM.detectSpeech` writes volume keyframes, confirmed first and undoable.
- LAND-LIST §3 Q6: *"Audio clean-up tools in the Volume panel: Reduce Noise and Auto-duck music under speech. Recommended: yes
  to Reduce Noise first … Auto-duck after it."* LAND-LIST §2: *"T05's twins need the karaoke hardening."*
- **His answer is not recorded.** `git show ssh/main:REQUESTS.md | grep -i "duck|music under|lower the music|voice over music"`
  finds nothing; POLISH-LOG's only "duck" is v11.15's de-click. So this is built ahead of his yes, like the rest of §B.
- **Twin check:** nothing on 85b71929 ducks or sidechains (`git grep -i "duck|sidechain"` on js/ finds only comments and Trance
  Gate's search word); `FM.detectSpeech` is used only by captions.

## What was ported

The tool as the backlog and the pile have it: in the Volume card, **Auto-duck music…** opens **Duck under** (Any speech, or one
clip under the music), **Amount (dB)**, **Attack (s)**, **Release (s)**, **Padding (s)** and **Generate keyframes** (then
**Update keyframes** and **Remove ducking**). Speech is found on the device from a low-rate decode (8 kHz, as captions do),
mapped through the voice clip's trim, speed (a ramp exactly, by bisecting the app's own `FM.layerSourceAdvance`) and reverse to
where it is heard, and written as ordinary volume keyframes on the music — which the preview and the exporter already read.
Kept from the pile: the inverse source→project map, the merge rule (two phrases whose ramps would meet are one duck), the
5,000-key guard, the project-switch and deleted-clip guards, one history commit per operation.

Files: `js/auto-duck.js` (new), `js/inspector.js` (the card), `styles.css` (six rules), `index.html` (busters + the new tag),
`tests/tests.js` (ten tests).

## What was wrong in 3b65fae1, and what it is now

1. **His volume keyframes were held hostage by a snapshot.** It replaced the whole volume with product keys and kept the old
   volume as a frozen copy (`autoDuck.base`). Update and Restore wrote that copy back — so **every edit he made after Generate
   was thrown away**, and because the copy is not a keyframe track, moving, splitting or re-timing the clip moved the duck but
   not the copy: Update after a move put his fade back **where it used to be**. **Now** the duck is marked key by key (`ad` the
   value written, `adg` the gain applied, `adv` on his own keys a duck covered: what they read before; `adBase` on a plain
   level). Update and Remove take away exactly what the tool did; his keys are ordinary keys and travel with the clip. A key he
   changes after Generate is his: it stays, with the duck divided out (so a level he sets inside a duck reads the same after
   Update). A key with no mark that sits between the tool's keys inside a duck (one he added there with ◆) is read the same way.
   A split's seam inside a duck on a plain level is dropped by Remove/Update, so the half does not come back ducked.
2. **No confirm.** The backlog says "confirmed first"; it wrote straight away. **Now** it finds the speech, then asks
   (`FM.ask`: how many places, which clips, how many dB, how many keyframes, that his own are kept, that Undo takes it back),
   and lays the keys again from the volume as it is after his yes.
3. **"Any speech" listened to the wrong clips.** It filtered `!layer.hidden` — this app has no `hidden`; a hidden clip is
   `visible === false` — so hidden clips were listened to, and **the music's own Remove vocals copy** (an unmuted clip that is
   the same song) was too: leftover singing in the instrumental ducked the music under itself. Clips inside a hidden group or
   silenced by a solo were also heard. **Now** "any" listens only to clips that sound (`sounds()`: not muted, not hidden, not
   in a hidden group, not silenced by another's solo), never to the music or any copy of it. A key clip he picks by hand is
   used even if muted or hidden — he chose it.
4. **The karaoke hardening.** With Remove vocals on, the original is muted and the instrumental copy plays — the pile ducked
   only the clip selected, so ducking the original did nothing audible. **Now** the music and every `karaokeOf` copy of it
   (Remove vocals', and Reduce Noise's when that lands) are ducked together in the same step, from either.
5. **No cache.** Every Generate and every Update decoded and searched every file again.
   **Now** the answer is kept per File (a WeakMap, so every clip cut from one file shares it) and **only a real answer is
   kept** (the Loudness Match rule): a file that would not decode, a detector that threw, was missing or answered nothing
   usable leaves nothing, and the next press asks again. "No speech" is a real answer. Two presses at once share one search.
6. **No speech → an exception string in a toast.** **Now** every outcome is a plain sentence and nothing is written: no speech
   (naming the clips), speech only where the trim cut it away, a voice that cannot be read, no clip under the music,
   Amount 0, Cancel. `generate` resolves `{status}` and never throws for anything he can cause.
7. **Easing and loops.** It kept his eases only on segments the duck did not cross, and ignored a looping volume track (the
   new keys would have changed the loop span). **Now** his keys keep their own fields and eases (only the value of one a duck
   covers changes); a looping volume track is refused with a message.
8. **Inline styles and an `<input type=range>`** in a card where every other number is a scrub ruler. **Now** the card uses
   the inspector's own `rangeRow`, a `prop-row` select, and CSS classes on the app's tokens. Clip names go in through
   `textContent` (the select, `FM.ask`, `FM.toast`).
9. **Settings moved on the layer as he dragged** (each slider was a project change). **Now** they live in auto-duck.js for the
   session (seeded from the clip's last Generate) and become the project's only when he says yes; a slider is not an undo step.

## Time and fades

Keyframe times are absolute project time (`FM.shiftLayerKeyframes`: "keyframes are absolute time"; the exporter and
audio-play.js read `FM.layerVolume(layer, sceneT)`), so the voice's source seconds are mapped to project seconds and the music's
own trim and speed play no part (tested with both). The music's fades are not touched: everywhere volume is read it is
multiplied by `FM.fadeMul` (tested on the export's own product). The export samples an animated volume at 30 Hz with linear
ramps (exporter.js:622 — existing behaviour for every volume key), so an Attack under ~0.1 s is drawn to the nearest 33 ms in
the file.

## Shape

Linear in amplitude between keys, as every volume key in the app is: four keys a duck on a plain level (ramp start, floor
start, floor end, ramp end). On a keyframed level the ramps get a key every 0.1 s (a moving duck times a moving level is a curve).
Where one of his eased segments is crossed by a duck, the piece next to the duck becomes straight lines.

## Old projects

Unchanged. Nothing reads `ad`, `adg`, `adv`, `adBase` or `autoDuck` unless the tool runs; no sanitiser or schema change. The
import sanitiser keeps the marks and the settings (tested: a JSON round trip through `FM.storage._sanitizeLayers`, which every
undo runs too), so a reloaded project's Update still finds its own keys.

## Tests — 10, appended after `// ── end 966 B22 ──` (`'966 B25 Auto-duck - …'`, `{ item: '966' }`)

Each test's first line is `ad966b25()`, which on 85b71929 throws **"there is no Auto-duck: FM.autoDuck is missing (#966 B25)"**.
The fixture stands in for `FM.autoDuck.fileOf`, `FM.decodeAudio` and `FM.detectSpeech` (each clip's "file" says where its speech
is, in the file's seconds, exactly as the detector answers), and for `FM.ask` / `FM.toast`. The detector is not under test.

| Test | What it pins | Statistic, and why |
|---|---|---|
| the tool and its settings | ranges and defaults; junk settles; card settings per clip; an untouched clip untouched; marks survive a save/load | exact values |
| speech is ducked where it is HEARD | trim, 2x, reverse, a 1x→3x ramp; trimmed-away speech dropped | the app's own `FM.layerLocalTime` at the mapped time gives back the source second (1e-6; 1e-4 on the ramp), and the ramp's closed form t + t²/6 |
| Generate asks first, then … | asked once, before anything changed; ducks at 2.65/2.85/6.15/6.75 and 9.65/…/11.75; half-way ratio (1+F)/2; no bounce in the 0.9 s gap; 0 dB between; Update with Attack 0.5 / Release 1.5 re-lays it; one search for both | the ratio music/his-level through `FM.layerVolume`, scanned every 1 ms: where it leaves 1, reaches the floor, leaves it, is back at 1 (2 ms) |
| his own volume keyframes are kept | his keys exact; his key under speech turned down once; −12 dB on his slope; a key he changed is his after Update; Update does not stack; Remove gives his four keys back; a split's seam | the same scan against his curve; key values |
| one undo step | Generate = 1 step; same Update = 0 steps, same JSON; 6 dB after 12 is 6 not 18; undo/redo; Remove = 1 step | history `_steps()`; the ratio at 4 s |
| the voice's trim and speed, the music's do not move it, fades | ducks at 4.65/…/7.75 and 14.85/…/16.55; export gain = volume × fade at 2.5, 6, 15.5, 10 s | the scan; the export's own product |
| nothing to duck | no speech, trimmed-away speech, a detector that throws, no sound track, no clip under, Amount 0, Cancel: nothing written, no step, the right words | status, volume, steps, toasts |
| the speech found in a file is kept | a throw and an empty answer are not kept; a real answer is; another file searches; two presses share; an undecodable file is retried; "no speech" is kept | counts of detector / decode calls |
| any speech … the copy that plays | "any" = the heard voice only (not the Remove vocals copy, not hidden, not muted); a key clip alone; the copy and the original ducked together, from either | ids; the scan on both |
| in the Volume card (browser) | the rows and defaults, a hostile clip name as text, ≥ 32 px controls, nothing wider than the card, stays open on redraw, Generate asks and the card then offers Update and Remove | DOM; run at 380 too |

Nine run in node (prove.sh); the card test needs the inspector and fails in node on the harness (`setup: the inspector is not
loaded`) — it is owed a Chrome run at 900 and 380.

## Questions for Ezra (each with a recommendation)

1. **Do you want it?** LAND-LIST §3 Q6 is unanswered. *Recommended: yes, after Reduce Noise* — it saves hand-keying the music
   down under every sentence of a voice-over.
2. **Hear it on one of your own videos first** (#545): music under a voice-over at the defaults (12 dB, 0.2 s down, 0.6 s back
   up, 0.15 s padding). *Recommended:* one before / after sent as audio before it ships.
3. **The ramps are straight lines in volume** (a keyframe ramp), which drops fastest at the end of the attack. A curve that is
   straight in dB sounds smoother but needs a few more keys per duck. *Recommended: keep straight* (four keys a duck, easy to
   drag by hand); change it if the listen in Q2 sounds abrupt.
4. **A level you set inside a duck is kept relative to the duck**: Update keeps it exactly as you set it; Remove ducking takes
   the duck back out of it too (set 0.3 under a 12 dB duck → 1.19 after Remove). The other way (keep 0.3) would make Update
   duck your 0.3 again. *Recommended: relative*, as built.
5. **The card** (a picture at 380 is owed before it lands, per #545): the button sits under Remove vocals (and Reduce noise).
   *Recommended:* as built; no new icon.

## Merge notes

- **Busters** (this tree's +1, never the pile's 412 / v=1-of-its-own): `inspector.js` 422 → 423, `styles.css` 763 → 764, new
  `<script src="js/auto-duck.js?v=1">` right after `audio-tools.js`. **`hunt/pile-reducenoise` takes the same two busters
  (inspector 422 → 423, styles 763 → 764) and adds `noise-reduction.js?v=1` after `audio-tools.js` too**; pile-loudness also
  takes inspector 423. On merging, take the base's line and +1 per release, never either side's number; keep both new tags
  (neither file needs the other).
- **js/inspector.js `volumePanel`**: reducenoise inserts its Reduce noise block in the same place (after Remove vocals' listener,
  before `afxBtn`) and changes the same `tools.append` line. Keep both blocks, and append as
  `tools.append(wavBtn, karBtn, ...nrParts, ...adParts, afxBtn, arBtn);`.
- **styles.css**: both add rules after `.vol-tool-btn.on` (`.vol-noise*` there, `.vol-duck*` here). Keep both.
- **tests/tests.js**: this block sits between `// ── end 966 B22 ──` and `// ── end 966 B25 ──`; reducenoise's ends `// ── end
  966 B24 ──` after the same B22 line. Rebuild by blocks (B22 → B24 → B25), never a union merge.
- **The speech cache**: Reduce Noise keeps its own on the media record (`rec._nrSpeech`); this one is a WeakMap by File. Both
  keep only real answers. A later tidy could make Reduce Noise call `FM.autoDuck.speechOf` (one search per file for both
  tools); not needed to land.
- **Karaoke twins**: a Reduce Noise copy also rides on `karaokeOf` (`twinKind: 'denoise'`), so `familyOf` ducks it with the
  music, and "any speech" hears a voice's cleaned copy rather than its muted original. No `twinKind` special case is needed.
- **sw.js**: nothing (it caches scripts as fetched). No POLISH-LOG line, no version label: a branch, not a release.
- The prove script: `scratchpad/agents/pile-autoduck/prove.sh` (hv.js widened to lift the `…966b25` helpers and load
  `js/auto-duck.js`); its stage 4 puts back two of the pile's faults (Update throwing away what he changed since Generate; "any
  speech" hearing the music's own copy and hidden clips) and expects their tests to fail.

## Unsure

- Nothing was run. Every bound is reasoned (each test says how); if one misses, measure and set it from the measurement,
  writing both numbers in.
- **A split inside a ramp on a keyframed level, then Update**: the seam keeps a little of the old duck right at the cut (its
  gain is read from the one tool key left beside it). Exact on a plain level and inside a floor. Making it exact everywhere
  needs `splitAnimated` (js/app.js) to carry `adg` onto the seam it writes: three lines, left out to keep this off app.js.
- The browser tests swap `FM.scene` for one of their own, as the #966 B1 tests do, and reset the history after.
- `FM.toast(…, 0)` is assumed sticky until `FM.hideToast`, as Remove vocals uses it.
- The card was never seen at 380. The select is a `prop-row` (flex, min-width 0), so a long clip name should ellipsize; the
  test checks nothing is wider than the card.
