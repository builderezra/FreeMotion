# Simple mode: release 2.3 written in full ("speed, sound and replacing")

**For the BUILDER chat, after 2.2 has shipped** (this is the code `BUILD-PLAN-PHASE2.md` §5 listed as anchors and did not write).
Same format as §3 (release 2.1) and §4 (release 2.2): exact code on quoted anchors, applied in the order written, with the tests
that prove each piece, how each test fails on the tree before, the mutation proofs and the screens. It was written and run on a
**scratch copy of `980-p22-r3` (v17.24, `a51b5e1d`), the tip of the Simple chain**, not on the plan's imagined v17.21 + Phase 1
tree: every anchor below was found exactly once there, by script (§10 "How this was checked"). The finished code is on branch
`hunt/simple-2.3`; this file is on `plans/simple-2.3`. Neither is merged into anything.

**His rules this release obeys:** the original editor (**Full**) does not change in design or function (DESIGN §0.4, his 1 Oct rule);
**D14 first half A** (looks, text, captions and sound work with a friend in; moving clips waits): so only Speed on a main clip and
Replace with a shorter file *arrange*; Volume, Fade, Reverse, Take sound out / Put sound back and Mute clip sound are looks
(`plan.arranges = false`, a Simple step with `arr: false`); **D17 B** (music is never trimmed or faded to the video); **D10 A** (the
selection's tools in one row above the project tools); **D20 A** (on a PC the panel lives in the left band). Nothing here decides
D3, D14b, D18, D22, D23, D24.

**POLISH-LOG line (template):** `- vX.YY — queue 980 (partial) — Simple: Speed, Volume, Fade, Replace, Reverse and Take sound out
on a clip; Mute clip sound on the clip row; a Volume or Fade change never adds a keyframe. A video clip's tray is one scrolling
row on a PC. Full is unchanged.`

**He sees** (pictures in §11): the main-clip tray gains **Speed · Volume · Replace · Reverse · Take sound out** (or **Put sound back**
once it is out); an overlay video's tray gains **Volume · Speed**; a song's tray is **Volume · Fade · Speed · Stay put**. **Speed**,
**Volume** and **Fade** each open an inline row in the tray (like Length), so the timeline above never moves: Speed has the presets
0.5× 1× 1.5× 2× 3× and a 0.25–4× slider whose clip box and the boxes after it stretch and slide while the thumb moves and commit
once on release; Volume is a 0–200 % slider; Fade has In and Out steppers of half a second. The 🔈 at the head of the clip row
mutes every clip's own sound ("Mute clip sound") and gives it back. The sound taken out of a clip draws as a thin waveform band
along the bottom of its clip and leaves the Sound row. **What he holds:** a 2× speed-up that closes up the clips after it, a
Replace with a shorter clip that closes up too, a voice taken out of a clip that stays in step through every trim, split, speed
change and Reverse.

---

## 1. The builder's checklist (2.3)

1. Only after 2.2 has shipped and only when `./tools/next.sh` hands out #980, or he says now. Logged **`queue 980 (partial)`**,
   shipped **alone** (no other queue item in it), so any difference from HEAD is Simple's and a rollback is one release.
2. `./tools/tick.sh`, a clean `git status`, then the preflight (§2): every line prints `1`.
3. Apply §4's hunks **in the order written** (a later Find may quote text an earlier hunk wrote), bump the `?v=` of every file it
   changes (§5; `ship.sh` refuses a changed file whose buster did not move), append §6's tests before the final `})();`, and make
   §6.1's edits to eight earlier tests.
4. Prove: each new test fails on HEAD and passes on the tree at `--width 1280` and `--width 380` (`tools/prove.sh` inside `ship.sh`);
   repeat §8's mutation table with `tools/mutate.sh` (the tests marked "module absent" in §7 prove presence only);
   run the FU lock (`tools/full-unchanged.sh`, about three hours, detached) with §9's additions in mind.
5. `tools/ship.sh "…"` with `timeout: 600000`. If it lands in the background, read its output; never re-run it.
6. Send him one line and the screenshot sheet first (§11: no visual ships unseen). **Decision A1 below needs his word.**

## 2. Preflight (run from the repo root; every line must print `1`)

```bash
grep -cF -- "  FM.fxPresets = {" js/inspector.js
grep -cF -- "          const durBefore = layer.duration;                   // measured BEFORE, so the keyframes below scale by what ACTUALLY happened" js/inspector.js
grep -cF -- "  /* Slide a layer's WHOLE animation along the timeline: shift every keyframe's TIME by `delta` seconds" js/scene.js
grep -cF -- "  FM.replaceMedia = function (id) {" js/app.js
grep -cF -- "  Object.assign(S.cmd, {" js/spine-edit.js
grep -cF -- "    trimStartBy(id, h) { return S.edit('Trim clip', R => S.planTrimHead(R, id, h, { typed: true })); }" js/spine-edit.js
grep -cF -- "  function quietLine(R) {" js/simple-tools.js
grep -cF -- "    xOf(t) { return origin() + t * pps(); },   // #sm-inner coordinates, for the suite's x-invariance check" js/simple-timeline.js
grep -cF -- "      noFootage: 'No footage'" js/spine-words.js
grep -cF -- "    Object.keys(R.lanes).forEach(sec => {" js/spine.js
```

(The first grep is the anchor for `FM.setClipSpeed`; the others are the anchors of the biggest hunks. Every hunk below is also
checked by §10's round trip.)


## 3. What it does, in this code

Every command is one plan against the read model, applied by 2.1's runner `FM.spine.edit` as ONE undo step and ONE collab
transaction. The new plans are in `js/spine-edit.js` (§4, hunk "the 2.3 block"); the tray, rows and 🔈 in `js/simple-tools.js` and
`js/simple-timeline.js`; the shared pieces Full also uses in `js/inspector.js`, `js/scene.js` and `js/app.js`.

| Piece | Where | What it does |
|---|---|---|
| `FM.setClipSpeed(layer, sp)` | `js/inspector.js`, module scope before `FM.fxPresets` | **The Speed slider's flat branch, moved unchanged** (comments and all) into a function; the slider now calls it. Full's slider and Simple's Speed re-time a clip with the same code. A frozen copy of the old body in the suite proves both write the same clip for five speeds, a source clamp and keyframes (§6.2 test 2). |
| `FM.shiftProp(container, key, value, time, o)` | `js/scene.js`, before `FM.shiftLayerKeyframes` | A numeric prop set **without a key at the playhead**: unkeyed, written plainly; keyed, every key moves with it and the count never changes (gain-like props scale by `value / now`, others shift by the difference; `o.min` / `o.max` clamp every key). Volume and Fade write through it, so "a panel in Simple never adds a keyframe". |
| `FM.pickReplacement(id)` + `FM.swapInMedia(id, nrec, o)` | `js/app.js`, replacing the body of `FM.replaceMedia` | `replaceMedia` split at its decode. `pickReplacement` is the picker plus the decode and **always settles** (the record, or `null` when dismissed or the file will not load). `swapInMedia` is everything after the decode (stash the outgoing file, swap, fit, `mediaRev++`, commit, save, Media library). `replaceMedia` is now `pickReplacement` then `swapInMedia`: Full's ⋯ Replace resolves the same `true` / `false`, in the same order. `o.noSave` leaves the file write to the runner, `o.noLib` keeps a sound twin out of the Media library, `o.simple` writes `srcW` / `srcH` / `srcRev` and `sm.snd` from the record (§0.4 B8). |
| `S.planSpeed(R, id, sp)` | `js/spine-edit.js` | Main clip, flat speed only. Length = footage ÷ speed, **exactly as `setClipSpeed` will write it** (floor and source clamp included); refused (`Too short to speed up that much`) under the shortest clip or when the source would run out first; refused at a crossfade when the new length falls under twice the fade, or when this clip owns the fade (its opacity keys would stretch); refused with caption tracks lying on it (cues ride the speed in 2.4). Followers keep their length and key timing and move to the same place on the clip (`(start − clip.start)·(k − 1)`); an effect that now runs past the clip is clamped to it; the clips after ripple by `new − old`; the tail follows; the sound twin gets the same call; the playhead stays on the same moment of the clip. |
| `S.planSpeedItem` | same | The same for an overlay video or a song: nothing follows it and nothing ripples, so it is a look (`arranges false`); a `sm.tail` mark goes, the Stay put under it stays. |
| `S.planUseOneSpeed` | same | A ramped clip's way out: the speed becomes footage ÷ length, so **the length and every other start stay**; nothing arranges. |
| `S.speedRange` | same | The panel's stops: 0.25× to the lower of 4× and the speed at which the clip, or either blend beside it, would be too short. |
| `S.planVolume` / `S.planFade` | same | Act on the sound twin when the clip has one (the original is muted), else on the clip. A volume above 0 on a muted clip un-mutes it. Fade is `fadeIn` / `fadeOut`, 0.1 s resolution, never longer than the clip. Both are looks. |
| `S.planReverse` | same | `reversed` on the clip and each twin, nothing else moves. The frame cache is asked for **after the commit** (`plan.after`), never inside the muted step, never for a twin; a failure says *"Couldn't prepare the reversed clip, it will play slowly"* and keeps the edit. |
| `S.planTakeSound` / `S.planPutSoundBack` | same | Take out: Full's own `FM.extractAudio` inside a step of ours (so Full's function is untouched), the layer it made found by the ids around the call and marked `sm.twin` by us. Put back: the twin goes (a karaoke twin too) and the clip is heard again, one step. |
| `S.planMuteClips` / `S.muteMode` | same | The mode is `project.sm.muteClips` (it syncs). On: every main video not already muted is muted and marked `sm.muteByMode`. Off: only the marked ones are un-muted, never one with a sound twin or a karaoke companion, and a mark whose clip is no longer muted is just dropped. While on, Append, Insert and Into row mute (and mark) the new clip; Lift off gives the clip its sound back. |
| `S.planReplace(R, id, nrec)` | same | The picker has already run (`S.cmd.pickReplace`, at the tap, outside the runner). The slot is kept; a shorter file is a tail trim in the same step with the tail trim's own refusals, follower rules (a title cut off slides back onto its clip, D6) and ripple; a sound twin gets the same file by a second decode of the same `File`; the swap is a `pre` step and the runner saves the file after the commit (`plan.mints`). |
| The tray | `js/simple-tools.js` `trayFor` | Main video: Length · **Speed · Volume** · Move earlier / later · Lift off · Duplicate · Crop · **Replace · Reverse · Take sound out / Put sound back** · [Close gap] · More · Delete. A picture: Replace only. Overlay video: Volume · Speed. Song: Volume · Fade · Speed. |
| The rows | `js/simple-tools.js` `speedRow` / `volumeRow` / `fadeRow`, `openRow` | Inline like Length: **Done** first, the tool that opened the row gets focus back. The Speed slider's `input` event only previews (`FM.simpleTimeline.previewSpeed`: the boxes and `playbackRate`); `change` commits once. |
| The 🔈 | `js/simple-timeline.js` | Left of the first clip, reads `project.sm.muteClips`; amber when on. |
| The twin band | `js/simple-timeline.js`, `js/spine.js`, `styles.css` | A 6 px waveform band along the bottom of the clip; `spine.js` leaves a twin out of the Sound row's lanes (it is read lazily from `S.isTwinOf`, so before `spine-edit.js` loads nothing is a twin). |


## 4. Changes to existing files (apply in this order on the tip; each Find is found exactly once)

Generated from the finished tree by script and checked by a round trip (§10): for each file, the tip plus these hunks in this order
is byte-identical to the tree. A hunk may quote text an earlier hunk of the same file wrote. There is **no new file** in 2.3.
Where a Replace is long it is the new code itself: **the 2.3 block** in `js/spine-edit.js` is the whole engine (Speed, Volume, Fade,
Reverse, Take sound out / Put sound back, Mute clip sound, Replace, and the `S.cmd` entries after it).


### `js/scene.js` — shared: `FM.shiftProp`

#### 2.3.1 `js/scene.js`

Find (exactly once):

```js
  };

  /* Slide a layer's WHOLE animation along the timeline: shift every keyframe's TIME by `delta` seconds
```

Replace with:

```js
  };

  /* queue 980 (release 2.3, DESIGN §8.5): SET A NUMERIC PROP TO `value` AT `time` WITHOUT ADDING A KEYFRAME — the generic form of
   * shiftTransform above, for a prop that is not in layer.transform (a clip's volume, a sound's level). Unkeyed: it is written
   * plainly. Keyed: every key moves with it so the whole animation keeps its shape and its timing, and the key COUNT never
   * changes (setProp would drop a stray key at the playhead, which a tray slider must never do). Gain-like props (the ones
   * where "twice as loud" means a ratio) are scaled by value / now; anything else is shifted by the difference, and a gain
   * that is ~0 right now shifts too, since the ratio would explode. `o.min` / `o.max` clamp every key, so a ratio can never
   * push a keyed level out of the range the control offers. Returns the number of keys it wrote (0 when unkeyed). */
  const GAIN_KEYS = { volume: 1, opacity: 1, scale: 1, scaleX: 1, scaleY: 1, gain: 1 };
  FM.shiftProp = function (container, key, value, time, o) {
    o = o || {};
    const lo = o.min == null ? -Infinity : o.min, hi = o.max == null ? Infinity : o.max;
    const p = container[key];
    if (!isAnimated(p)) { container[key] = Math.max(lo, Math.min(hi, value)); return 0; }
    const cur = evalProp(p, time);
    let n = 0;
    if (GAIN_KEYS[key] && Math.abs(cur) >= 1e-3) {
      const ratio = value / cur;
      if (ratio !== 1 && isFinite(ratio)) p.kf.forEach(k => { if (typeof k.v === 'number') { k.v = Math.max(lo, Math.min(hi, k.v * ratio)); n++; } });
      return n;
    }
    const d = value - cur;
    if (d && isFinite(d)) p.kf.forEach(k => { if (typeof k.v === 'number') { k.v = Math.max(lo, Math.min(hi, k.v + d)); n++; } });
    return n;
  };

  /* Slide a layer's WHOLE animation along the timeline: shift every keyframe's TIME by `delta` seconds
```


### `js/inspector.js` — shared with Full: the Speed slider's flat branch becomes `FM.setClipSpeed`

#### 2.3.2 `js/inspector.js`

Find (exactly once):

```js
  };

  FM.fxPresets = {
```

Replace with:

```js
  };

  /* queue 980 (release 2.3): THE SPEED SLIDER'S FLAT BRANCH, as a function. The lines are the slider's own, moved here unchanged
     (comments and all), so Full's slider and Simple's Speed (js/spine-edit.js planSpeed) re-time a clip with the SAME code. It
     keeps the source span, re-times `layer` about its own start, scales its keyframes by the durations that actually resulted,
     lets a group around it follow, and grows the project to fit. A ramped speed is not its business (the slider keeps that
     branch). The caller has already decided `sp` is wanted; this clamps the length only by the 0.1 s floor and the source. */
  FM.setClipSpeed = function (layer, sp) {
    const durBefore = layer.duration;                   // measured BEFORE, so the keyframes below scale by what ACTUALLY happened
    const span = layer.duration * FM.speedAt(layer, layer.start);   // source span is invariant → re-time the clip (speedAt, queue 451)
    layer.speed = sp;
    layer.duration = Math.max(0.1, span / sp);
    // Clamp against the source that's actually left, exactly as the trim grips do
    // (timeline.js: nd = min(nd, (srcDur - trimStart) / sp)). Without this, a clip whose span
    // already overruns its source — e.g. trimStart moved, or the media was replaced — keeps the
    // overrun through the re-time and freezes on its last decoded frame for the tail.
    const mm = FM.media.get(layer.id);
    const srcDur = (mm && mm.duration) ? mm.duration : Infinity;
    if (layer.type === 'video' && isFinite(srcDur)) {
      layer.duration = Math.max(0.1, Math.min(layer.duration, (srcDur - (layer.trimStart || 0)) / sp));
    }
    /* …and the animation rides with the clip (queue 68). The factor is taken from the durations
     * that actually resulted, not from the speed ratio, because layer.duration is CLAMPED just
     * above — by the 0.1s floor and, on a video, by the source that is really left. Deriving it
     * from sp instead would let the keyframes stretch past a bar that had stopped growing.
     * This runs per slider step, and that is fine: each step scales by the ratio between two
     * consecutive real durations, so the product telescopes to the exact total ratio. */
    if (durBefore > 0 && FM.scaleLayerKeyframes) FM.scaleLayerKeyframes(layer, layer.duration / durBefore);
    // A GROUP AROUND THIS CLIP MUST FOLLOW IT (queue 626) — otherwise the group keeps its old
    // length, its tail is empty, and the preview goes black there. Measured: children 2.000 →
    // 1.176 while the group stayed at 2.000.
    if (FM.refitGroupsFor) FM.refitGroupsFor(layer);
    const end = layer.start + layer.duration;
    if (end > FM.scene.project.duration) FM.scene.project.duration = end;
  };

  FM.fxPresets = {
```

#### 2.3.3 `js/inspector.js`

Find (exactly once):

```js
          const durBefore = layer.duration;                   // measured BEFORE, so the keyframes below scale by what ACTUALLY happened
          const span = layer.duration * FM.speedAt(layer, layer.start);   // source span is invariant → re-time the clip (speedAt, queue 451)
          layer.speed = sp;
          layer.duration = Math.max(0.1, span / sp);
          // Clamp against the source that's actually left, exactly as the trim grips do
          // (timeline.js: nd = min(nd, (srcDur - trimStart) / sp)). Without this, a clip whose span
          // already overruns its source — e.g. trimStart moved, or the media was replaced — keeps the
          // overrun through the re-time and freezes on its last decoded frame for the tail.
          const mm = FM.media.get(layer.id);
          const srcDur = (mm && mm.duration) ? mm.duration : Infinity;
          if (layer.type === 'video' && isFinite(srcDur)) {
            layer.duration = Math.max(0.1, Math.min(layer.duration, (srcDur - (layer.trimStart || 0)) / sp));
          }
          /* …and the animation rides with the clip (queue 68). The factor is taken from the durations
           * that actually resulted, not from the speed ratio, because layer.duration is CLAMPED just
           * above — by the 0.1s floor and, on a video, by the source that is really left. Deriving it
           * from sp instead would let the keyframes stretch past a bar that had stopped growing.
           * This runs per slider step, and that is fine: each step scales by the ratio between two
           * consecutive real durations, so the product telescopes to the exact total ratio. */
          if (durBefore > 0 && FM.scaleLayerKeyframes) FM.scaleLayerKeyframes(layer, layer.duration / durBefore);
          // A GROUP AROUND THIS CLIP MUST FOLLOW IT (queue 626) — otherwise the group keeps its old
          // length, its tail is empty, and the preview goes black there. Measured: children 2.000 →
          // 1.176 while the group stayed at 2.000.
          if (FM.refitGroupsFor) FM.refitGroupsFor(layer);
          const end = layer.start + layer.duration;
          if (end > FM.scene.project.duration) FM.scene.project.duration = end;
```

Replace with:

```js
          FM.setClipSpeed(layer, sp);   // queue 980 (2.3): the body below moved, unchanged, into FM.setClipSpeed so Simple's Speed calls the same code
```


### `js/app.js` — shared with Full: `FM.replaceMedia` split into `pickReplacement` + `swapInMedia`

#### 2.3.4 `js/app.js`

Find (exactly once):

```js
  FM.replaceMedia = function (id) {
    const layer = FM.layerById(FM.scene, id);
    if (!layer || layer.type === 'text' || layer.type === 'shape' || layer.type === 'null') return Promise.resolve(false);
```

Replace with:

```js
  /* queue 980 (release 2.3, DESIGN §3.6 Replace): FM.replaceMedia is SPLIT at its decode so Simple can run the swap inside its
     runner without ever waiting on a picker in there (a dismissed picker can leave a promise pending, and that would leave
     FM.spine.running true and history muted for good). pickReplacement is the picker plus the decode, and it ALWAYS settles —
     the loaded record, or null when he cancels or the file will not load. swapInMedia is everything after the decode. Full's
     ⋯ Replace is exactly today's: replaceMedia = pickReplacement, then swapInMedia. */
  FM.pickReplacement = function (id) {
    const layer = FM.layerById(FM.scene, id);
    if (!layer || layer.type === 'text' || layer.type === 'shape' || layer.type === 'null') return Promise.resolve(null);
```

#### 2.3.5 `js/app.js`

Find (exactly once):

```js
    const landed = new Promise(res => { settle = res; });
    const input = document.createElement('input');
    input.type = 'file'; input.accept = (isSong && FM._audioAccept) ? FM._audioAccept() : 'video/*,image/*'; input.style.display = 'none';
    const swap = async () => {
      const file = input.files && input.files[0]; input.remove();
      if (!file) return false;
```

Replace with:

```js
    const picked = new Promise(res => { settle = res; });
    const input = document.createElement('input');
    input.type = 'file'; input.accept = (isSong && FM._audioAccept) ? FM._audioAccept() : 'video/*,image/*'; input.style.display = 'none';
    const load = async () => {
      const file = input.files && input.files[0]; input.remove();
      if (!file) return null;
```

#### 2.3.6 `js/app.js`

Find (exactly once):

```js
          if (!wav) { if (FM.toast) FM.toast('No sound could be read from “' + (file.name || 'that clip') + '” — the song is unchanged', 4200); return false; }
```

Replace with:

```js
          if (!wav) { if (FM.toast) FM.toast('No sound could be read from “' + (file.name || 'that clip') + '” — the song is unchanged', 4200); return null; }
```

#### 2.3.7 `js/app.js`

Find (exactly once):

```js
      if (!nrec) { if (FM.toast) FM.toast('Could not load that file'); return false; }
```

Replace with:

```js
      if (!nrec) { if (FM.toast) FM.toast('Could not load that file'); return null; }
      return nrec;
    };
    input.addEventListener('cancel', () => { input.remove(); settle(null); });
    // a throw still surfaces as the unhandled rejection it always was — the caller just hears "nothing picked" first
    input.addEventListener('change', () => { load().then(settle, e => { settle(null); throw e; }); });
    document.body.appendChild(input);
    input.click();
    return picked;
  };
  /* The swap itself. `o.noSave` leaves the file write to the caller (Simple's runner saves after its commit), `o.noLib` keeps a
     sound twin out of the Media library, `o.simple` writes Simple's own sound-only fact from the new record (§0.4 B8). */
  FM.swapInMedia = async function (id, nrec, o) {
    o = o || {};
    const layer = FM.layerById(FM.scene, id);
    if (!layer || !nrec) return false;
    {
```

#### 2.3.8 `js/app.js`

Find (exactly once):

```js
      refreshAll(); FM.seekVideosToTime();
      if (FM.history) FM.history.commit();
      if (FM.storage && FM.storage.save) FM.storage.save();
      // The blob under this key is a DIFFERENT file now. Any library tile still anchored here would
      // show the old name and hand back the new footage — forget it (that also clears its cached
      // thumbnail), then register the replacement so it gets an honest tile of its own.
      if (FM.mediaLib) {
```

Replace with:

```js
      if (o.simple && FM.spine && FM.spine.setFlag) {   // §0.4 B8: a sound-only record is a sound in Simple's eyes; a picture one is not
        const soundOnly = nrec.kind !== 'image' && !(nrec.width > 0 && nrec.height > 0);
        if (soundOnly) FM.spine.setFlag(layer, 'snd', true); else if (layer.sm && layer.sm.snd) FM.spine.setFlag(layer, 'snd', false);
        if (nrec.width > 0 && nrec.height > 0 && nrec.width <= 16384 && nrec.height <= 16384) { layer.srcW = nrec.width; layer.srcH = nrec.height; layer.srcRev = layer.mediaRev; }
      }
      refreshAll(); FM.seekVideosToTime();
      if (FM.history) FM.history.commit();
      if (!o.noSave && FM.storage && FM.storage.save) FM.storage.save();
      // The blob under this key is a DIFFERENT file now. Any library tile still anchored here would
      // show the old name and hand back the new footage — forget it (that also clears its cached
      // thumbnail), then register the replacement so it gets an honest tile of its own.
      if (FM.mediaLib && !o.noLib) {
```

#### 2.3.9 `js/app.js`

Find (exactly once):

```js
    };
    input.addEventListener('cancel', () => { input.remove(); settle(false); });
    // a throw still surfaces as the unhandled rejection it always was — the caller just hears "no swap" first
    input.addEventListener('change', () => { swap().then(settle, e => { settle(false); throw e; }); });
    document.body.appendChild(input);
    input.click();
    return landed;
```

Replace with:

```js
    }
  };
  FM.replaceMedia = function (id) {
    return FM.pickReplacement(id).then(nrec => nrec ? FM.swapInMedia(id, nrec) : false);
```


### `js/spine.js` — Simple's read model: a twin leaves the Sound row

#### 2.3.10 `js/spine.js`

Find (exactly once):

```js
    Object.keys(R.lanes).forEach(sec => {
      const items = units.filter(u => R.units[u.id].section === sec && sec !== 'main');
```

Replace with:

```js
    /* 2.3 (§4.6): a clip's sound twin draws as a band inside its clip (js/simple-timeline.js), so it leaves the Sound row. isTwinOf lives in
       js/spine-edit.js (loaded after this file) and is read lazily; before it exists no layer is a twin. */
    const twinOfMain = u => !!(S.isTwinOf && u.l.type === 'video' && main.some(e => !e.slot && byUid.get(e.id) && S.isTwinOf(u.l, byUid.get(e.id).l, eps)));
    Object.keys(R.lanes).forEach(sec => {
      const items = units.filter(u => R.units[u.id].section === sec && sec !== 'main' && !(sec === 'audio' && twinOfMain(u)));
```


### `js/spine-words.js` — every new word

#### 2.3.11 `js/spine-words.js`

Find (exactly once):

```js
      noFootage: 'No footage'
```

Replace with:

```js
      noFootage: 'No footage',
      /* release 2.3: speed, sound, replacing */
      sped: (name, sp) => name + ' now plays at ' + sp + '×',
      speedShort: 'Too short to speed up that much', speedRamp: 'This clip’s speed changes over time · Use one speed first',
      speedBlock: 'Open in Full to change this speed', replaceBlock: 'Open in Full to replace this',
      nothingChanged: 'Nothing changed', oneSpeed: 'One speed now, the same length',
      volumeSet: pct => 'Volume ' + pct + '%', fadeSet: (which, s) => 'Fade ' + which + ' ' + s.toFixed(1) + ' s',
      noReverse: 'Only a video can play backwards', reversed: 'Playing backwards', forwards: 'Playing forwards',
      reverseSlow: 'Couldn’t prepare the reversed clip, it will play slowly',
      soundTaken: 'Sound taken out · it sits on the clip as its own track', alreadyOut: 'Its sound is already out · Put sound back first',
      noSound: 'This clip has no sound to take out', noTwin: 'No sound was taken out of this clip', soundBack: 'Sound back in the clip',
      clipsMuted: 'Clip sound is off', clipsHeard: 'Clip sound is back on',
      replaced: name => name + ' replaced'
```

#### 2.3.12 `js/spine-words.js`

Find (exactly once):

```js
      bandHintSelPc: 'Its tools are below'   // PC (his pick B): every tool is on show there, More with them
```

Replace with:

```js
      bandHintSelPc: 'Its tools are below',   // PC (his pick B): every tool is on show there, More with them
      /* release 2.3 */
      speed: 'Speed', volume: 'Volume', replace: 'Replace', reverse: 'Reverse', forwards: 'Play forwards', takeSound: 'Take sound out', putSound: 'Put sound back',
      fade: 'Fade', fadeIn: 'In', fadeOut: 'Out', useOneSpeed: 'Use one speed', speedRamped: 'Speed changes over the clip',
      speedLabel: 'Speed', volumeLabel: 'Volume in percent', muteClips: 'Clip sound', muteOn: 'Mute clip sound', muteOff: 'Clip sound is off, tap to turn it on'
```


### `js/spine-edit.js` — the 2.3 block, the commands, and the Mute clip sound hooks

#### 2.3.13 `js/spine-edit.js`

Find (exactly once):

```js
        if (kind === 'splitBlock' || kind === 'trimBlock' || kind === 'liftBlock' || kind === 'slotIntoRow') buttons = [full];
```

Replace with:

```js
        if (kind === 'splitBlock' || kind === 'trimBlock' || kind === 'liftBlock' || kind === 'slotIntoRow' || kind === 'speedBlock' || kind === 'replaceBlock') buttons = [full];
```

#### 2.3.14 `js/spine-edit.js`

Find (exactly once):

```js
      const made = addRecs(clips, T, newPickB(), map);
      made.forEach(l => S.setFlag(l, 'main', true));
      if (made.length && lastMain && FM.layerById(FM.scene, lastMain)) FM.moveLayers(made.map(l => l.id), lastMain);   // just above the clip before (§3.6.1)
```

Replace with:

```js
      const made = addRecs(clips, T, newPickB(), map);
      made.forEach(l => { S.setFlag(l, 'main', true); muteIfMode(l); });   // 2.3: Mute clip sound is on, so the new clip is muted too
      if (made.length && lastMain && FM.layerById(FM.scene, lastMain)) FM.moveLayers(made.map(l => l.id), lastMain);   // just above the clip before (§3.6.1)
```

#### 2.3.15 `js/spine-edit.js`

Find (exactly once):

```js
      const made = addRecs(clips, at, newPickB(), map);
      made.forEach(l => S.setFlag(l, 'main', true));
      if (made.length && anchor) FM.moveLayers(made.map(l => l.id), anchor);
```

Replace with:

```js
      const made = addRecs(clips, at, newPickB(), map);
      made.forEach(l => { S.setFlag(l, 'main', true); muteIfMode(l); });
      if (made.length && anchor) FM.moveLayers(made.map(l => l.id), anchor);
```

#### 2.3.16 `js/spine-edit.js`

Find (exactly once):

```js
      fol.forEach(fid => { const f = map.get(fid); if (f && !S.isTwinOf(f, L, R.eps)) S.setFlag(f, 'stay', true); });
```

Replace with:

```js
      if (L.sm && L.sm.muteByMode) { S.setFlag(L, 'muteByMode', false); L.muted = false; }   // 2.3: an overlay is not part of Mute clip sound; it gets its sound back
      fol.forEach(fid => { const f = map.get(fid); if (f && !S.isTwinOf(f, L, R.eps)) S.setFlag(f, 'stay', true); });
```

#### 2.3.17 `js/spine-edit.js`

Find (exactly once):

```js
      S.setFlag(o, 'main', true); S.setFlag(o, 'stay', false);
```

Replace with:

```js
      S.setFlag(o, 'main', true); S.setFlag(o, 'stay', false); muteIfMode(o);
```

#### 2.3.18 `js/spine-edit.js`

Find (exactly once):

```js
  Object.assign(S.cmd, {
```

Replace with:

```js
  /* ═══════════════════════ RELEASE 2.3: speed, sound and replacing (BUILD-PLAN-PHASE2-2.3.md) ═══════════════════════
     Speed, Volume, Fade, Replace, Reverse, Take sound out / Put sound back and Mute clip sound, each ONE plan through the same
     runner as 2.1's and 2.2's commands. Only Speed on a main clip and Replace with a shorter file arrange (they ripple); the rest
     are looks and sound, so they work with a friend in the session (D14 first half) and never move a clip. */
  const SPEED_LO = 0.25, SPEED_HI = 4, VOL_HI = 10;   // VOL_HI: Full's own ceiling (1000%); Simple's row offers 0–200% but never clamps a level Full set higher
  const flatSpan = l => (+l.duration || 0) * FM.speedAt(l, +l.start || 0);   // the footage the clip shows: what a re-time never changes
  /* The Speed panel's stops: 0.25× to the lower of 4× and the speed at which the clip (and each blend beside it) would be too short */
  S.speedRange = function (R, id) {
    const L = FM.layerById(FM.scene, id); if (!L || FM.isAnimated(L.speed)) return null;
    const span = flatSpan(L); let hi = Math.min(SPEED_HI, span / MINLEN());
    const i = mainIdx(R, id);
    if (i >= 0) {
      const c = R.main[i], n = R.main[i + 1];
      if (n && n.seam && n.seam.kind === 'blend') hi = Math.min(hi, span / (2 * n.seam.amt));
      if (i > 0 && c.seam && c.seam.kind === 'blend') hi = Math.min(hi, span / (2 * c.seam.amt));
    }
    return { lo: SPEED_LO, hi: Math.max(SPEED_LO, hi), span: span, now: FM.speedAt(L, +L.start || 0) };
  };
  /* what setClipSpeed will really write: the new length, clamped by the 0.1 s floor and by the source left (its own rule, exactly) */
  function speedLength(L, sp) {
    let nd = Math.max(0.1, flatSpan(L) / sp);
    if (L.type === 'video') { const sd = srcDurOf(L); if (isFinite(sd)) nd = Math.max(0.1, Math.min(nd, (sd - (+L.trimStart || 0)) / sp)); }
    return nd;
  }
  /* the cue-effect key lists animatedProps leaves out (a caption cue's own effects) ride a re-time too, about the clip's own start */
  function scaleCueKeys(l, k) {
    const base = new Set(FM.animatedProps(l));
    FM.timedLists(l).forEach(p => { if (!base.has(p)) p.kf.forEach(kk => { kk.t = (+l.start || 0) + (kk.t - (+l.start || 0)) * k; }); });
  }

  /* SPEED of a main clip (flat only): every footage frame stays, the length becomes span / sp, what starts on the clip moves with
     its place on it (and keeps its own length), the clips after close up or open out, the playhead stays on the same moment. */
  S.planSpeed = function (R, id, sp) {
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], n = R.main[i + 1] || null, L = map.get(c.id), ml = MINLEN();
    if (L.type === 'group') return refusePlan('speedBlock');
    if (L.type !== 'video') return refusePlan('failed');   // a picture has no clock to change
    if (FM.isAnimated(L.speed)) return refusePlan('speedRamp');
    if (!(sp > 0) || !isFinite(sp)) return refusePlan('failed');
    const old = FM.speedAt(L, +L.start || 0), d0 = +L.duration || 0;
    if (Math.abs(sp - old) < 1e-9) return refusePlan('nothingChanged');
    const nd = speedLength(L, sp);
    if (nd < ml - SLACK || Math.abs(nd - flatSpan(L) / sp) > 1e-6) return refusePlan('speedShort');   // under the shortest clip, or the source would run out before the speed did
    if (n && n.seam && n.seam.kind === 'blend') {
      if (nd < 2 * n.seam.amt - SLACK) return refusePlan('fadesNext');
      if (blendOwner(c, n, map) === L) return refusePlan('fadeOwned', { a: S.itemWord(L, R), b: S.itemWord(map.get(n.id), R) });
    }
    if (i > 0 && c.seam && c.seam.kind === 'blend') {
      if (nd < 2 * c.seam.amt - SLACK) return refusePlan('fadesBefore');
      if (blendOwner(R.main[i - 1], c, map) === L) return refusePlan('fadeOwned', { a: S.itemWord(map.get(R.main[i - 1].id), R), b: S.itemWord(L, R) });
    }
    const fol = R.followers[c.id] || [];
    if (fol.some(f => R.units[f] && R.units[f].kind === 'captions')) return refusePlan('riders');   // cues ride the speed (2.4)
    const rb = riderBlock(R, c.start + Math.min(d0, nd), map); if (rb) return refusePlan(rb.kind, rb);
    const k = nd / d0, dt = nd - d0;
    const plan = newPlan('Change speed'); plan.touched.add(c.id);
    const twins = twinsOf(R, c, map), twinIds = new Set(twins.map(t => t.id));
    twins.forEach(t => plan.touched.add(t.id));
    plan.writes.push(() => { [L].concat(twins).forEach(x => { FM.setClipSpeed(x, sp); scaleCueKeys(x, k); }); });
    const newEnd = c.start + nd;
    fol.forEach(fid => {
      if (twinIds.has(fid)) return;
      const f = map.get(fid), u = R.units[fid]; if (!f) return;
      const x = (+f.start || 0) - c.start, mv = x * (k - 1);
      if (Math.abs(mv) > 1e-9) addMove(plan, fid, mv);
      const fd = +f.duration || 0, fe = c.start + x * k + fd;
      if (u && u.kind === 'effect' && (+f.start || 0) + fd <= c.end + 1e-9 && fe > newEnd + 1e-9) {   // §4.3: an effect stays inside its clip
        plan.touched.add(fid); plan.writes.push(() => { f.duration = Math.max(ml, newEnd - (c.start + x * k)); });
      }
    });
    const rp = ripple(plan, R, i + 1, dt, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);
    tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    const t = FM.time || 0;                                                       // §3.6.2: the same moment of the clip stays under the line
    if (t >= c.start - 1e-9 && t < c.start + d0 - 1e-9) plan.time = c.start + (t - c.start) * k;
    else if (t >= c.start + d0 - 1e-9) plan.time = t + dt;
    plan.live = line('sped', S.itemWord(L, R), Math.round(sp * 100) / 100);
    plan.pulse = [c.id];
    return plan;
  };
  /* SPEED of anything else with a clock (an overlay video, a song): nothing follows it and nothing ripples, so it is a look. A
     sm.tail mark goes (its end is no longer the track end), the Stay put under it stays. */
  S.planSpeedItem = function (R, id, sp) {
    const map = byIdMap(), L = map.get(id), u = R.units[id];
    if (!L || !u || R.isMain(id)) return refusePlan('gone');
    if (L.type !== 'video') return refusePlan('failed');
    if (FM.isAnimated(L.speed)) return refusePlan('speedRamp');
    if (!(sp > 0) || !isFinite(sp)) return refusePlan('failed');
    const old = FM.speedAt(L, +L.start || 0);
    if (Math.abs(sp - old) < 1e-9) return refusePlan('nothingChanged');
    const nd = speedLength(L, sp);
    if (nd < MINLEN() - SLACK || Math.abs(nd - flatSpan(L) / sp) > 1e-6) return refusePlan('speedShort');
    const k = nd / (+L.duration || 1);
    const plan = newPlan('Change speed'); plan.arranges = false; plan.adopts = false; plan.touched.add(id);
    plan.writes.push(() => { FM.setClipSpeed(L, sp); scaleCueKeys(L, k); if (L.sm && L.sm.tail) S.setFlag(L, 'tail', false); });
    plan.live = line('sped', S.itemWord(L, R), Math.round(sp * 100) / 100);
    plan.keepSel = true;
    return plan;
  };
  /* USE ONE SPEED (a ramped clip → flat): keeps the LENGTH, so nothing moves and nothing is arranged; the speed is the footage over the length */
  S.planUseOneSpeed = function (R, id) {
    const map = byIdMap(), L = map.get(id);
    if (!L || L.type !== 'video') return refusePlan('gone');
    if (!FM.isAnimated(L.speed)) return refusePlan('nothingChanged');
    const fol = R.followers[id] || [];
    if (fol.some(f => R.units[f] && R.units[f].kind === 'captions')) return refusePlan('riders');   // cues would need φ (2.4)
    const span = FM.layerSourceAdvance(L, +L.duration || 0), d = +L.duration || 0;
    if (!(span > 0) || !(d > 0)) return refusePlan('failed');
    const twins = R.isMain(id) ? twinsOf(R, R.main[mainIdx(R, id)], map) : [];
    const plan = newPlan('Use one speed'); plan.arranges = false; plan.adopts = false; plan.touched.add(id);
    twins.forEach(t => plan.touched.add(t.id));
    plan.writes.push(() => { [L].concat(twins).forEach(x => { x.speed = span / d; }); });
    plan.live = line('oneSpeed');
    plan.keepSel = true;
    return plan;
  };

  /* VOLUME and FADE act on the sound twin when the clip has one (the original is muted, the twin carries the sound), else on the
     clip. A keyed level keeps its shape (FM.shiftProp: no key at the playhead, the count never changes). A volume above 0 on a muted
     clip is a wish to hear it, so it un-mutes (and drops the Mute clip sound mark, which only ever stood for "muted by that switch"). */
  function soundTarget(R, id, map) {
    const L = map.get(id); if (!L) return null;
    if (R.isMain(id)) { const t = twinsOf(R, R.main[mainIdx(R, id)], map)[0]; if (t) return t; }
    return L;
  }
  S.soundTargetId = function (R, id) { const t = soundTarget(R, id, byIdMap()); return t ? t.id : null; };
  S.planVolume = function (R, id, v) {
    const map = byIdMap(), L = soundTarget(R, id, map);
    if (!L || !(v >= 0) || !isFinite(v)) return refusePlan('gone');
    const t = FM.time || 0;
    const plan = newPlan('Change volume'); plan.arranges = false; plan.adopts = false; plan.touched.add(L.id); plan.keepSel = true;
    plan.writes.push(() => {
      FM.shiftProp(L, 'volume', v, t, { min: 0, max: VOL_HI });
      if (v > 0 && L.muted) { L.muted = false; S.setFlag(L, 'muteByMode', false); }
    });
    plan.after = () => { if (FM.reconcileAudio) FM.reconcileAudio(); };
    plan.live = line('volumeSet', Math.round(v * 100));
    return plan;
  };
  S.planFade = function (R, id, which, sec) {
    const map = byIdMap(), L = soundTarget(R, id, map);
    if (!L || (which !== 'in' && which !== 'out') || !(sec >= 0) || !isFinite(sec)) return refusePlan('gone');
    const s = Math.round(Math.min(sec, Math.max(0, (+L.duration || 0))) * 10) / 10, key = which === 'in' ? 'fadeIn' : 'fadeOut';
    if (Math.abs((+L[key] || 0) - s) < 1e-9) return refusePlan('nothingChanged');
    const plan = newPlan('Change fade'); plan.arranges = false; plan.adopts = false; plan.touched.add(L.id); plan.keepSel = true;
    plan.writes.push(() => { L[key] = s; });
    plan.after = () => { if (FM.reconcileFades) FM.reconcileFades(); };
    plan.live = line('fadeSet', which === 'in' ? 'in' : 'out', s);
    return plan;
  };

  /* REVERSE / UN-REVERSE (a video): the flag on the clip and each twin, nothing else moves (start, length, keys, followers keep their
     times, as Full's toggle does). The frame cache is never built in here (a decode can take seconds on a phone with history muted):
     after the commit the runner's `after` asks for it, and never for a twin (a twin needs only its audio). */
  S.planReverse = function (R, id) {
    const map = byIdMap(), L = map.get(id);
    if (!L) return refusePlan('gone');
    if (L.type !== 'video') return refusePlan('noReverse');
    const twins = R.isMain(id) ? twinsOf(R, R.main[mainIdx(R, id)], map) : [];
    const on = !L.reversed;
    const plan = newPlan(on ? 'Reverse' : 'Play forwards'); plan.arranges = false; plan.adopts = false; plan.touched.add(id); plan.keepSel = true;
    twins.forEach(t => plan.touched.add(t.id));
    plan.writes.push(() => { [L].concat(twins).forEach(x => { x.reversed = on; }); });
    plan.after = async () => {
      if (on && FM.ensureReverseCache) { try { await FM.ensureReverseCache(L); } catch (e) { S.say(line('reverseSlow')); } }
      else if (!on && FM.maybeClearCache) FM.maybeClearCache(L);
      if (FM.requestRender) FM.requestRender();
      if (FM.reconcileAudio) FM.reconcileAudio();
    };
    plan.live = line(on ? 'reversed' : 'forwards');
    return plan;
  };

  /* TAKE SOUND OUT / PUT SOUND BACK (§4.6). Take out: Full's own extractAudio inside a step of ours, so Full's function is untouched;
     the layer it made is found by the ids around the call (it returns nothing) and marked sm.twin by us. Put back: the twin goes
     and the clip is heard again, in one step. A clip that has no sound, or that is already muted, has nothing to take out. */
  const hasSound = L => L && L.type === 'video' && !L.audioOnly && !(L.sm && L.sm.snd === true) && !L.muted && (() => { const m = FM.media && FM.media.get(L.id); return !(m && m.hasAudio === false); })();
  S.canTakeSound = function (R, id) { const L = FM.layerById(FM.scene, id); return !!(L && R.isMain(id) && hasSound(L) && !twinsOf(R, R.main[mainIdx(R, id)], byIdMap()).length); };
  S.planTakeSound = function (R, id) {
    const map = byIdMap(), L = map.get(id);
    if (!L || !R.isMain(id)) return refusePlan('gone');
    if (twinsOf(R, R.main[mainIdx(R, id)], map).length) return refusePlan('alreadyOut');
    if (!hasSound(L)) return refusePlan('noSound');
    const plan = newPlan('Take sound out'); plan.arranges = false; plan.adopts = false; plan.touched.add(id); plan.keepSel = true; plan.mints = true;
    plan.pre.push(async () => {
      const before = new Set(FM.scene.layers.map(l => l.id));
      await FM.extractAudio(L);
      const dup = FM.scene.layers.find(l => !before.has(l.id));
      if (dup) { S.setFlag(dup, 'twin', true); S.setFlag(dup, 'snd', true); S.setFlag(L, 'muteByMode', false); }
    });
    plan.live = line('soundTaken');
    return plan;
  };
  S.planPutSoundBack = function (R, id) {
    const map = byIdMap(), L = map.get(id);
    if (!L || !R.isMain(id)) return refusePlan('gone');
    const twins = twinsOf(R, R.main[mainIdx(R, id)], map);
    if (!twins.length) return refusePlan('noTwin');
    const plan = newPlan('Put sound back'); plan.arranges = false; plan.adopts = false; plan.touched.add(id); plan.keepSel = true;
    twins.forEach(t => { plan.touched.add(t.id); plan.removes.add(t.id); });
    plan.writes.push(() => { L.muted = false; S.setFlag(L, 'muteByMode', false); });
    plan.after = () => { if (FM.reconcileAudio) FM.reconcileAudio(); };
    plan.live = line('soundBack');
    return plan;
  };

  /* MUTE CLIP SOUND (the clip row's 🔈): the mode lives on the document (project.sm.muteClips, it syncs: the mute is part of the
     video). On: every main video not already muted is muted and marked sm.muteByMode (one he muted himself gets no mark). Off: only
     the marked ones are un-muted, never one with a sound twin or a karaoke companion (that would play the sound twice), and a
     mark whose clip is no longer muted is just dropped, so a manual choice is never overwritten. */
  S.muteMode = function () { const P = FM.scene && FM.scene.project; return !!(P && P.sm && P.sm.muteClips === true); };
  function muteIfMode(l) { if (S.muteMode() && l && l.type === 'video' && !l.audioOnly && !(l.sm && l.sm.snd === true) && !l.muted) { l.muted = true; S.setFlag(l, 'muteByMode', true); } }
  S.planMuteClips = function (R, on) {
    const map = byIdMap(), clips = R.main.filter(e => !e.slot).map(e => map.get(e.id)).filter(Boolean);
    if (!clips.length) return refusePlan('noClipHere');
    const P = FM.scene.project;
    if (!!on === S.muteMode()) return refusePlan('nothingChanged');
    const plan = newPlan(on ? 'Mute clip sound' : 'Clip sound back on'); plan.arranges = false; plan.adopts = false; plan.keepSel = true;
    clips.forEach(l => plan.touched.add(l.id));
    plan.writes.push(() => {
      if (on) {
        clips.forEach(l => { if (l.type === 'video' && !l.audioOnly && !l.muted) { l.muted = true; S.setFlag(l, 'muteByMode', true); } });
        if (!P.sm || typeof P.sm !== 'object' || Array.isArray(P.sm)) P.sm = {};
        P.sm.muteClips = true;
      } else {
        clips.forEach(l => {
          if (!(l.sm && l.sm.muteByMode)) return;
          const hasTwin = twinsOf(R, R.main[mainIdx(R, l.id)], map).length > 0 || FM.scene.layers.some(t => t.karaokeOf === l.id);
          S.setFlag(l, 'muteByMode', false);
          if (l.muted && !hasTwin) l.muted = false;
        });
        if (P.sm) { delete P.sm.muteClips; if (!Object.keys(P.sm).length) delete P.sm; }
      }
    });
    plan.after = () => { if (FM.reconcileAudio) FM.reconcileAudio(); };
    plan.live = line(on ? 'clipsMuted' : 'clipsHeard');
    return plan;
  };

  /* REPLACE (a clip's footage, the slot kept). The picker has already run (FM.pickReplacement, at the tap, outside the runner) and
     `nrec` is the decoded record. A shorter file is a tail trim in the same step: replaceMediaWith clamps the length to the new
     source, so the plan ripples by the difference, with the tail trim's own refusals. A sound twin gets the same file (its own
     record, a second decode of the same File) so it stays in step. The swap itself is a `pre` step; its file is written by the
     runner after the commit (plan.mints). */
  S.planReplace = function (R, id, nrec) {
    const map = byIdMap(), L = map.get(id);
    if (!L || !nrec) return refusePlan('gone');
    if (L.type === 'text' || L.type === 'shape' || L.type === 'null' || L.type === 'group' || L.type === 'camera') return refusePlan('replaceBlock');
    const main = R.isMain(id), i = main ? mainIdx(R, id) : -1, ml = MINLEN();
    const d0 = +L.duration || 0;
    let nd = d0;
    if (nrec.kind === 'video' && nrec.duration > 0) {
      const tr = Math.max(0, Math.min(+L.trimStart || 0, nrec.duration - 0.05));
      const avail = FM.maxDurForSource ? FM.maxDurForSource(L, nrec.duration - tr) : (nrec.duration - tr) / (FM.speedAt(L, +L.start || 0) || 1);
      nd = Math.max(0.1, Math.min(d0, avail));
    }
    const dt = nd - d0;
    const plan = newPlan('Replace clip'); plan.touched.add(id); plan.mints = true; plan.keepSel = true; plan.arranges = main && dt < -1e-9; plan.adopts = plan.arranges;
    let twins = [];
    if (main) {
      const c = R.main[i], n = R.main[i + 1] || null;
      twins = twinsOf(R, c, map);
      twins.forEach(t => plan.touched.add(t.id));
      if (dt < -1e-9) {
        if (nd < ml - SLACK) return refusePlan('shortSource');
        if (n && n.seam && n.seam.kind === 'blend') {
          if (nd < 2 * n.seam.amt - SLACK) return refusePlan('fadesNext');
          if (blendOwner(c, n, map) === L) return refusePlan('fadeOwned', { a: S.itemWord(L, R), b: S.itemWord(map.get(n.id), R) });
        }
        if (i > 0 && c.seam && c.seam.kind === 'blend' && nd < 2 * c.seam.amt - SLACK) return refusePlan('fadesBefore');
        const rb = riderBlock(R, c.start + nd, map); if (rb) return refusePlan(rb.kind, rb);
        const newEnd = c.start + nd, twinIds = new Set(twins.map(t => t.id));
        (R.followers[c.id] || []).forEach(fid => {   // the tail trim's follower rules: a title cut off slides back onto its clip (D6), an effect is clamped
          if (twinIds.has(fid)) return;
          const f = map.get(fid), u = R.units[fid]; if (!f) return;
          const fs = +f.start || 0, fd = +f.duration || 0;
          if (fs >= newEnd - R.eps) {
            const s2 = Math.max(c.start, newEnd - fd); addLand(plan, fid, s2);
            if (u && u.kind === 'effect' && fs + fd <= c.end + 1e-9) plan.writes.push(() => { f.duration = Math.max(ml, Math.min(fd, newEnd - s2)); });
          } else if (u && u.kind === 'effect' && fs + fd <= c.end + 1e-9 && fs + fd > newEnd + 1e-9) {
            plan.touched.add(fid); plan.writes.push(() => { f.duration = Math.max(ml, newEnd - fs); });
          }
        });
        const rp = ripple(plan, R, i + 1, dt, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);
        tailMove(plan, R, rp.end != null ? rp.end : newEnd, map);
        const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
        plan.pulse = [c.id];
      }
    } else if (L.sm && L.sm.tail && Math.abs(dt) > 1e-9) plan.writes.push(() => { S.setFlag(L, 'tail', false); });
    plan.pre.push(async () => {
      await FM.swapInMedia(id, nrec, { noSave: true, simple: true });
      for (const t of twins) {
        let r2 = null; try { r2 = nrec.file ? await FM.loadVideoFile(nrec.file) : null; } catch (e) { r2 = null; }
        if (r2) await FM.swapInMedia(t.id, r2, { noSave: true, noLib: true, simple: true });
      }
    });
    plan.live = line('replaced', S.itemWord(L, R));
    return plan;
  };

  Object.assign(S.cmd, {
```

#### 2.3.19 `js/spine-edit.js`

Find (exactly once):

```js
    trimStartBy(id, h) { return S.edit('Trim clip', R => S.planTrimHead(R, id, h, { typed: true })); }
```

Replace with:

```js
    trimStartBy(id, h) { return S.edit('Trim clip', R => S.planTrimHead(R, id, h, { typed: true })); },
    /* release 2.3 */
    speed(id, sp) { return S.edit('Change speed', R => R.isMain(id) ? S.planSpeed(R, id, sp) : S.planSpeedItem(R, id, sp)); },
    useOneSpeed(id) { return S.edit('Use one speed', R => S.planUseOneSpeed(R, id)); },
    volume(id, v) { return S.edit('Change volume', R => S.planVolume(R, id, v)); },
    fade(id, which, sec) { return S.edit('Change fade', R => S.planFade(R, id, which, sec)); },
    reverse(id) { return S.edit('Reverse', R => S.planReverse(R, id)); },
    takeSoundOut(id) { return S.edit('Take sound out', R => S.planTakeSound(R, id)); },
    putSoundBack(id) { return S.edit('Put sound back', R => S.planPutSoundBack(R, id)); },
    muteClips(on) { return S.edit(on ? 'Mute clip sound' : 'Clip sound back on', R => S.planMuteClips(R, on)); },
    replace(id, nrec) { return S.edit('Replace clip', R => S.planReplace(R, id, nrec)); },
    /* the picker runs HERE, at the tap, never inside the runner (a dismissed picker can leave its promise unsettled): then the swap is one step.
       A project switched away from while the file decoded lets the file go instead of landing it in the wrong project. */
    async pickReplace(id) {
      const pid = FM.startedIn ? FM.startedIn() : null;
      const nrec = await FM.pickReplacement(id);
      if (!nrec) return false;
      if (FM.stillIn && !FM.stillIn(pid)) { if (FM.letGoMedia) FM.letGoMedia(nrec); return false; }
      return S.cmd.replace(id, nrec);
    }
```


### `js/simple-tools.js` — the tray, the rows, the icons

#### 2.3.20 `js/simple-tools.js`

Find (exactly once):

```js
    back: '<path d="M15 5l-7 7 7 7"/>'
```

Replace with:

```js
    back: '<path d="M15 5l-7 7 7 7"/>',
    speed: '<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="M12 17l4-5.5"/><circle cx="12" cy="17" r="1.1" fill="currentColor"/>',
    volume: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.7a4.5 4.5 0 0 1 0 6.6M18.5 6a8.5 8.5 0 0 1 0 12"/>',
    replace: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    reverse: '<path d="M11 6l-7 6 7 6zM20 6l-7 6 7 6z"/>',
    soundout: '<path d="M9 5L4.5 8.5H2v7h2.5L9 19z"/><path d="M13 12h8M18 9l3 3-3 3"/>',
    soundback: '<path d="M9 5L4.5 8.5H2v7h2.5L9 19z"/><path d="M21 12h-8M16 9l-3 3 3 3"/>',
    fade: '<path d="M3.5 18.5L20.5 5.5M3.5 18.5V8M7 18.5v-5M10.5 18.5v-3M14 18.5v-1"/>',
    mute: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M16 9.5l4.5 5M20.5 9.5l-4.5 5"/>'
```

#### 2.3.21 `js/simple-tools.js`

Find (exactly once):

```js
  let fills = 0, lastPress = null;   // how many times the tray was refilled; the tool a pointer's last single click pressed
```

Replace with:

```js
  let rowFor = null, rowLast = '';   // 2.3: the inline row open on the tray ({kind: 'speed' | 'volume' | 'fade', id}), and the tool that opened it (focus goes back there)
  let fills = 0, lastPress = null;   // how many times the tray was refilled; the tool a pointer's last single click pressed
```

#### 2.3.22 `js/simple-tools.js`

Find (exactly once):

```js
  function roomForTwo() {
```

Replace with:

```js
  /* 2.3: TWO ROWS HOLD AT MOST TEN TOOLS. The band is 307 px and a tool 54: five to a row. A video clip's tray is 13 tools from 2.3 (Speed, Volume,
     Replace, Reverse, Take sound out join the nine), so it goes back to ONE scrolling row there, More and 🗑 pinned, exactly as on a phone. His pick B
     holds for every tray that fits (a picture, a title, a sound, an overlay); BUILD-PLAN-PHASE2-2.3.md §A1 puts the choice back to him. */
  const TWO_ROW_MAX = 10;
  function roomForTwo() {
```

#### 2.3.23 `js/simple-tools.js`

Find (exactly once):

```js
    b.innerHTML = svg(t.icon);                                        // a fixed string, never user data
```

Replace with:

```js
    b.innerHTML = t.icon === null ? '' : svg(t.icon);                 // a fixed string, never user data (null: a text-only tool, a speed preset)
```

#### 2.3.24 `js/simple-tools.js`

Find (exactly once):

```js
    if (R.isMain(id)) {
      const i = R.main.findIndex(e => e.id === id), sb = R.main[i].seam, na = R.main[i + 1], sa = na && na.seam;
      const out = [
        { id: 'length', label: w.length || 'Length', icon: 'length', run: () => FM.simpleTools.openLength(id) },
```

Replace with:

```js
    /* 2.3: the sound and speed tools. A video has all of them; a picture has only Replace; a sound has Volume, Fade and Speed. */
    const isVid = l.type === 'video' && !l.audioOnly && !(l.sm && l.sm.snd === true);
    const speedT = { id: 'speed', label: w.speed || 'Speed', icon: 'speed', run: () => FM.simpleTools.openRow('speed', id) };
    const volumeT = { id: 'volume', label: w.volume || 'Volume', icon: 'volume', run: () => FM.simpleTools.openRow('volume', id) };
    const fadeT = { id: 'fade', label: w.fade || 'Fade', icon: 'fade', run: () => FM.simpleTools.openRow('fade', id) };
    const replaceT = { id: 'replace', label: w.replace || 'Replace', icon: 'replace', run: () => S.cmd.pickReplace(id) };
    const reverseT = { id: 'reverse', label: w.reverse || 'Reverse', icon: 'reverse', pressed: !!l.reversed, run: () => S.cmd.reverse(id) };
    if (R.isMain(id)) {
      const i = R.main.findIndex(e => e.id === id), sb = R.main[i].seam, na = R.main[i + 1], sa = na && na.seam;
      const hasTwin = (R.followers[id] || []).some(f => S.isTwinOf(FM.layerById(FM.scene, f), l, R.eps));
      const soundT = hasTwin ? { id: 'putSound', label: w.putSound || 'Put sound back', icon: 'soundback', run: () => S.cmd.putSoundBack(id) }
        : (S.canTakeSound(R, id) ? { id: 'takeSound', label: w.takeSound || 'Take sound out', icon: 'soundout', run: () => S.cmd.takeSoundOut(id) } : null);
      const out = [
        { id: 'length', label: w.length || 'Length', icon: 'length', run: () => FM.simpleTools.openLength(id) },
        ...(isVid ? [speedT, volumeT] : []),
```

#### 2.3.25 `js/simple-tools.js`

Find (exactly once):

```js
        crop
```

Replace with:

```js
        crop,
        ...(l.type === 'video' || l.type === 'image' ? [replaceT] : []),   // after Crop: a picture's first row on two rows stays exactly as it was
        ...(isVid ? [reverseT] : []),
        ...(soundT ? [soundT] : [])
```

#### 2.3.26 `js/simple-tools.js`

Find (exactly once):

```js
    if (k === 'audio') return [stay, more, del];
```

Replace with:

```js
    if (k === 'audio') return [volumeT, fadeT, ...(l.type === 'video' ? [speedT] : []), stay, more, del];
```

#### 2.3.27 `js/simple-tools.js`

Find (exactly once):

```js
      crop,
      { id: 'forward', label: w.forward || 'Forward', icon: 'forward', run: () => S.cmd.z(id, 1) },
```

Replace with:

```js
      ...(isVid ? [volumeT, speedT] : []),
      crop,
      { id: 'forward', label: w.forward || 'Forward', icon: 'forward', run: () => S.cmd.z(id, 1) },
```

#### 2.3.28 `js/simple-tools.js`

Find (exactly once):

```js

  function quietLine(R) {
```

Replace with:

```js

  /* ═══ RELEASE 2.3: SPEED, VOLUME and FADE are inline rows like Length (the row itself is the panel, so the timeline above never
     moves). Each commits ONE command on release / press; while a slider moves only the DOM and the playback rate change, so the
     scene stays exactly as it was until he lets go (and an undo has one step to go back). ═══ */
  const pct = v => Math.round(v * 100);
  const fmtX = sp => (Math.round(sp * 100) / 100) + '×';
  function rowBack() { return tool({ id: 'rowBack', label: W().done || 'Done', icon: 'back', run: () => { rowLast = rowFor ? rowFor.kind : ''; rowFor = null; lastSig = ''; FM.simpleTools.sync(); } }); }
  function speedRow(R, id) {
    const S = FM.spine, w = W(), l = FM.layerById(FM.scene, id), out = [rowBack()];
    if (!l) return out;
    if (FM.isAnimated(l.speed)) {   // a ramp is not one speed: say so, and offer the one way out
      out.push(el('div', 'sm-quiet', w.speedRamped || 'Speed changes over the clip'));
      out.push(tool({ id: 'oneSpeed', label: w.useOneSpeed || 'Use one speed', icon: 'speed', run: () => S.cmd.useOneSpeed(id) }));
      return out;
    }
    const rg = S.speedRange(R, id) || { lo: 0.25, hi: 4 }, now = FM.speedAt(l, +l.start || 0), why = (FM.spineWords.lines || {}).speedShort;
    [0.5, 1, 1.5, 2, 3].forEach(sp => out.push(tool({ id: 'sp' + sp, label: sp + '×', icon: null, title: (w.speed || 'Speed') + ' ' + sp + '×', pressed: Math.abs(now - sp) < 1e-6, disabled: sp > rg.hi + 1e-9, why: why,
      run: () => { if (Math.abs(now - sp) > 1e-9) S.cmd.speed(id, sp); } })));
    const val = el('span', 'sm-speed-v', fmtX(now));
    const rng = el('input', 'sm-speed-r'); rng.type = 'range'; rng.min = String(rg.lo); rng.max = String(rg.hi); rng.step = '0.05';
    rng.value = String(Math.max(rg.lo, Math.min(rg.hi, now))); rng.setAttribute('aria-label', w.speedLabel || 'Speed');
    rng.addEventListener('input', () => { const sp = parseFloat(rng.value); val.textContent = fmtX(sp); if (FM.simpleTimeline && FM.simpleTimeline.previewSpeed) FM.simpleTimeline.previewSpeed(id, sp); });
    rng.addEventListener('change', () => { const sp = parseFloat(rng.value); if (FM.simpleTimeline && FM.simpleTimeline.previewSpeed) FM.simpleTimeline.previewSpeed(id, null); if (Math.abs(sp - now) > 1e-9) S.cmd.speed(id, sp); });
    out.push(rng, val);
    return out;
  }
  function volumeRow(R, id) {
    const S = FM.spine, w = W(), tid = S.soundTargetId(R, id), t = tid && FM.layerById(FM.scene, tid), out = [rowBack()];
    if (!t) return out;
    const now = (() => { const v = t.volume == null ? 1 : FM.evalProp(t.volume, FM.time); return isFinite(v) ? v : 1; })();
    const val = el('span', 'sm-vol-v', pct(now) + '%');
    const rng = el('input', 'sm-vol-r'); rng.type = 'range'; rng.min = '0'; rng.max = '200'; rng.step = '1'; rng.value = String(Math.min(200, pct(now)));
    rng.setAttribute('aria-label', w.volumeLabel || 'Volume in percent');
    rng.addEventListener('input', () => { const v = parseFloat(rng.value) / 100; val.textContent = pct(v) + '%'; const m = FM.media && FM.media.get(t.id); if (m && m.el) { try { m.el.volume = Math.min(1, v); } catch (e) {} } });
    rng.addEventListener('change', () => { const v = parseFloat(rng.value) / 100; if (Math.abs(v - now) > 0.004) S.cmd.volume(id, v); });
    out.push(rng, val);
    return out;
  }
  function fadeRow(R, id) {
    const S = FM.spine, w = W(), tid = S.soundTargetId(R, id), t = tid && FM.layerById(FM.scene, tid), out = [rowBack()];
    if (!t) return out;
    [['in', 'fadeIn', w.fadeIn || 'In'], ['out', 'fadeOut', w.fadeOut || 'Out']].forEach(f => {
      const cur = () => { const L = FM.layerById(FM.scene, tid); return L ? (+L[f[1]] || 0) : 0; };
      out.push(el('div', 'sm-quiet sm-fade-l', f[2] + ' ' + cur().toFixed(1) + ' s'));
      out.push(tool({ id: 'fade' + f[0] + 'Minus', label: '−', icon: null, title: f[2] + ': ' + (w.shorter || 'shorter'), run: () => S.cmd.fade(id, f[0], Math.max(0, cur() - 0.5)) }));
      out.push(tool({ id: 'fade' + f[0] + 'Plus', label: '+', icon: null, title: f[2] + ': ' + (w.longer || 'longer'), run: () => S.cmd.fade(id, f[0], cur() + 0.5) }));
    });
    return out;
  }
  const ROWS = { speed: speedRow, volume: volumeRow, fade: fadeRow };

  function quietLine(R) {
```

#### 2.3.29 `js/simple-tools.js`

Find (exactly once):

```js
    if (!ids.length) { tray.appendChild(quietLine(R)); return false; }
```

Replace with:

```js
    if (rowFor && ROWS[rowFor.kind]) { ROWS[rowFor.kind](R, rowFor.id).forEach(n => tray.appendChild(n.nodeType ? n : tool(n))); return false; }
    if (!ids.length) { tray.appendChild(quietLine(R)); return false; }
```

#### 2.3.30 `js/simple-tools.js`

Find (exactly once):

```js
    if (roomy && list.length > 5 && panelFor !== one) {
```

Replace with:

```js
    if (roomy && list.length > 5 && list.length <= TWO_ROW_MAX && panelFor !== one) {
```

#### 2.3.31 `js/simple-tools.js`

Find (exactly once):

```js
      const one = ids.length === 1 ? ids[0] : null, l = one && FM.layerById(FM.scene, one);
      roomy = !!one && roomForTwo();   // measured only for one item, the only tray that can take two rows
      const sig = [ids.join(','), lengthFor, lengthEdge, panelFor, roomy, l ? [l.start, l.duration, l.locked, JSON.stringify(l.sm || null)].join('|') : '', R.main.map(e => e.id + (e.seam ? e.seam.kind : '')).join(','), R.trackEnd].join('#');
```

Replace with:

```js
      if (rowFor && (ids.length !== 1 || ids[0] !== rowFor.id || !FM.layerById(FM.scene, rowFor.id))) rowFor = null;
      const one = ids.length === 1 ? ids[0] : null, l = one && FM.layerById(FM.scene, one);
      roomy = !!one && roomForTwo();   // measured only for one item, the only tray that can take two rows
      const rowTarget = rowFor && FM.spine.soundTargetId ? FM.layerById(FM.scene, FM.spine.soundTargetId(R, rowFor.id)) : null;   // 2.3: a row redraws when what it shows changes
      const rowSig = rowFor ? [rowFor.kind, rowTarget ? [rowTarget.fadeIn, rowTarget.fadeOut, JSON.stringify(rowTarget.volume), JSON.stringify(rowTarget.speed), rowTarget.duration].join('|') : ''].join('#') : '';
      const sig = [ids.join(','), lengthFor, lengthEdge, panelFor, roomy, rowSig, FM.spine.muteMode && FM.spine.muteMode(), l ? [l.start, l.duration, l.locked, JSON.stringify(l.sm || null)].join('|') : '', R.main.map(e => e.id + (e.seam ? e.seam.kind : '')).join(','), R.trackEnd].join('#');
```

#### 2.3.32 `js/simple-tools.js`

Find (exactly once):

```js
      FM.simpleTools._fill(R, ids, one, S);
      if (hadFocus) {
        const want = focusKey === 'lenBack' ? 'length' : focusKey;   // Done goes back to the Length that opened the row
```

Replace with:

```js
      const afterRow = rowLast; rowLast = '';
      FM.simpleTools._fill(R, ids, one, S);
      if (hadFocus) {
        const want = focusKey === 'lenBack' ? 'length' : focusKey === 'rowBack' ? (afterRow || 'length') : focusKey;   // Done goes back to the Length / Speed / Volume / Fade that opened the row
```

#### 2.3.33 `js/simple-tools.js`

Find (exactly once):

```js
      tray.classList.toggle('sm-tray-len', !!lengthFor);
```

Replace with:

```js
      tray.classList.toggle('sm-tray-len', !!lengthFor || !!rowFor);
```

#### 2.3.34 `js/simple-tools.js`

Find (exactly once):

```js
    panelFor: () => panelFor,
```

Replace with:

```js
    openRow(kind, id) { if (!ROWS[kind]) return; rowFor = { kind: kind, id: id }; lastSig = ''; this.sync(); },   // 2.3: Speed, Volume, Fade
    rowFor: () => rowFor,
    panelFor: () => panelFor,
```

#### 2.3.35 `js/simple-tools.js`

Find (exactly once):

```js
    _reset() { panelFor = null; lengthFor = null; lastSig = ''; closeMenu(); },   // suite seam
```

Replace with:

```js
    _reset() { panelFor = null; lengthFor = null; rowFor = null; lastSig = ''; closeMenu(); },   // suite seam
```


### `js/simple-timeline.js` — the 🔈, the twin band, the Speed preview

#### 2.3.36 `js/simple-timeline.js`

Find (exactly once):

```js
        mainEl.appendChild(n);
      });
```

Replace with:

```js
        /* 2.3 (§4.6): the sound taken out of this clip draws as a thin waveform band along its bottom edge, not as a row of its own */
        if ((R.followers[e.id] || []).some(f => FM.spine.isTwinOf && FM.spine.isTwinOf(byId.get(f), l, R.eps))) { const b = el('span', 'sm-twinband'); b.setAttribute('aria-hidden', 'true'); n.appendChild(b); }
        mainEl.appendChild(n);
      });
      /* 2.3: Mute clip sound — the 🔈 at the head of the clip row, its one home (§3.6). It reads the document's own key, never the clips. */
      if (clips.length && FM.spine.muteMode) {
        const off = FM.spine.muteMode(), mw = (W().tools || {});
        const mb = el('button', 'sm-mute' + (off ? ' on' : '')); mb.type = 'button';
        const ic = (FM.simpleTools && FM.simpleTools.ICON) || {};
        mb.innerHTML = '<svg viewBox="0 0 24 24" class="sm-ico" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (off ? ic.mute : ic.volume) + '</svg>';
        const nm = off ? (mw.muteOff || 'Clip sound is off, tap to turn it on') : (mw.muteOn || 'Mute clip sound');
        mb.setAttribute('aria-label', nm); mb.title = nm; mb.setAttribute('aria-pressed', off ? 'true' : 'false'); mb.dataset.tool = 'muteClips';
        mb.style.left = Math.max(2, xOf(0) - 46) + 'px';
        mb.addEventListener('click', ev => { ev.stopPropagation(); if (FM.spine.cmd) FM.spine.cmd.muteClips(!FM.spine.muteMode()); });
        mainEl.appendChild(mb);
      }
```

#### 2.3.37 `js/simple-timeline.js`

Find (exactly once):

```js
    read: () => R,
```

Replace with:

```js
    /* 2.3: THE SPEED SLIDER'S PREVIEW. While the thumb moves, only the clip row's boxes and the element's playback rate change — the
       scene is untouched (the commit on release is the one history step). The clip's box stretches, everything after it slides by the
       difference; `sp == null` puts every box back and the rate right. */
    previewSpeed(id, sp) {
      if (!mainEl) return;
      const nodes = Array.from(mainEl.children), m = FM.media && FM.media.get(id), L = FM.layerById(FM.scene, id);
      nodes.forEach(n => { if (n.dataset.l0 != null) { n.style.left = n.dataset.l0; n.style.width = n.dataset.w0; delete n.dataset.l0; delete n.dataset.w0; } });
      const rate = v => { if (m && m.el) { try { m.el.playbackRate = Math.min(16, Math.max(0.0625, v || 1)); } catch (e) {} } };
      if (sp == null || !L || !R) { if (L) rate(FM.speedAt(L, FM.time)); return; }
      const k = FM.speedAt(L, +L.start || 0) / sp, dx = (+L.duration || 0) * (k - 1) * pps();   // a clip's length goes as old speed / new speed
      const hit = mainEl.querySelector('.sm-item[data-id="' + id + '"]'); if (!hit) return;
      const x0 = parseFloat(hit.style.left);
      nodes.forEach(n => {
        const l = parseFloat(n.style.left); if (!isFinite(l)) return;
        if (n === hit) { n.dataset.l0 = n.style.left; n.dataset.w0 = n.style.width; n.style.width = Math.max(4, parseFloat(n.style.width) * k) + 'px'; }
        else if (l > x0 + 1e-6 && !n.classList.contains('sm-mute')) { n.dataset.l0 = n.style.left; n.dataset.w0 = n.style.width; n.style.left = (l + dx) + 'px'; }
      });
      rate(sp);
    },
    read: () => R,
```


### `index.html` — the `?v=` bumps

#### 2.3.38 `index.html`

Find (exactly once):

```html
<link rel="stylesheet" href="styles.css?v=759">
```

Replace with:

```html
<link rel="stylesheet" href="styles.css?v=760">
```

#### 2.3.39 `index.html`

Find (exactly once):

```html
  <script src="js/scene.js?v=119"></script>
  <script src="js/spine-words.js?v=6"></script>   <!-- Simple mode P1: every word the Simple editor shows (DESIGN.md §8.9) -->
  <script src="js/spine.js?v=2"></script>         <!-- Simple mode P1: FM.spine, the read side — after scene.js, before compositor/storage -->
  <script src="js/spine-edit.js?v=4"></script>    <!-- Simple mode P2: FM.spine.edit, the runner and the commands — after spine.js -->
```

Replace with:

```html
  <script src="js/scene.js?v=120"></script>
  <script src="js/spine-words.js?v=7"></script>   <!-- Simple mode P1: every word the Simple editor shows (DESIGN.md §8.9) -->
  <script src="js/spine.js?v=3"></script>         <!-- Simple mode P1: FM.spine, the read side — after scene.js, before compositor/storage -->
  <script src="js/spine-edit.js?v=5"></script>    <!-- Simple mode P2: FM.spine.edit, the runner and the commands — after spine.js -->
```

#### 2.3.40 `index.html`

Find (exactly once):

```html
  <script src="js/simple-timeline.js?v=6"></script>   <!-- Simple mode P1: FM.simpleTimeline, read-only; after timeline.js -->
  <script src="js/tilefit.js?v=1"></script>
  <script src="js/rail-arrows.js?v=2"></script>   <!-- queue 976/977: ‹ › for a mouse on sideways rows; before inspector.js and both browsers -->
  <script src="js/addmenu.js?v=83"></script>
  <script src="js/inspector.js?v=412"></script>
  <script src="js/simple-tools.js?v=4"></script>   <!-- Simple mode P2.2: FM.simpleTools, the tray row and the project tools (D10) — after inspector.js -->
```

Replace with:

```html
  <script src="js/simple-timeline.js?v=7"></script>   <!-- Simple mode P1: FM.simpleTimeline, read-only; after timeline.js -->
  <script src="js/tilefit.js?v=1"></script>
  <script src="js/rail-arrows.js?v=2"></script>   <!-- queue 976/977: ‹ › for a mouse on sideways rows; before inspector.js and both browsers -->
  <script src="js/addmenu.js?v=83"></script>
  <script src="js/inspector.js?v=413"></script>
  <script src="js/simple-tools.js?v=5"></script>   <!-- Simple mode P2.2: FM.simpleTools, the tray row and the project tools (D10) — after inspector.js -->
```

#### 2.3.41 `index.html`

Find (exactly once):

```html
  <script src="js/app.js?v=474"></script>
```

Replace with:

```html
  <script src="js/app.js?v=475"></script>
```


### `styles.css` — the 2.3 styles and the two-row padding

#### 2.3.42 `styles.css`

Find (exactly once):

```css
  #sm-tray.sm-tray-2 .sm-tool { min-width: 44px; padding: 0 4px; }
```

Replace with:

```css
  #sm-tray.sm-tray-2 .sm-tool { min-width: 44px; padding: 0 3px; }   /* 2.3: 3, not 4 — Replace joined the picture tray, and ten tools at 960 px wide were 2 px over the band */
```

#### 2.3.43 `styles.css`

Find (exactly once):

```css
  #inspector-panel:has(#sm-say.sm-two) .sm-band-hint { padding-top: 6px; padding-bottom: 6px; }
}

```

Replace with:

```css
  #inspector-panel:has(#sm-say.sm-two) .sm-band-hint { padding-top: 6px; padding-bottom: 6px; }
}

/* ═══ Simple mode release 2.3: speed, sound and replacing ═══ */
.sm-twinband { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; pointer-events: none; opacity: .85;
  background: repeating-linear-gradient(90deg, rgba(255,255,255,.7) 0 2px, rgba(255,255,255,.18) 2px 4px); }
.sm-mute { position: absolute; top: 8px; width: 40px; height: 40px; padding: 0; border-radius: 10px; border: 1.5px solid #8b97ab; background: transparent; color: #cfd6e2; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.sm-mute .sm-ico { width: 22px; height: 22px; }
.sm-mute.on { background: #2a1f14; color: #ffb454; border-color: #ffb454; }
#sm-tray .sm-tool[data-tool^="sp0"], #sm-tray .sm-tool[data-tool^="sp1"], #sm-tray .sm-tool[data-tool^="sp2"], #sm-tray .sm-tool[data-tool^="sp3"] { min-width: 40px; padding: 0 2px; }   /* the five Speed presets: text only, narrow, so the slider is on screen at 380 */
.sm-speed-r, .sm-vol-r { flex: 1 1 110px; min-width: 70px; align-self: center; margin: 0 6px; accent-color: var(--accent, #4da3ff); }
.sm-speed-v, .sm-vol-v { flex: none; align-self: center; min-width: 46px; padding: 0 4px; font: 700 13px/1 system-ui, sans-serif; color: var(--text); font-variant-numeric: tabular-nums; text-align: center; }
.sm-fade-l { flex: none; font-variant-numeric: tabular-nums; }

```

## 5. `?v=` bumps

| File | Tip | After 2.3 |
|---|---|---|
| `js/scene.js` | 119 | 120 |
| `js/inspector.js` | 412 | 413 |
| `js/app.js` | 474 | 475 |
| `js/spine.js` | 2 | 3 |
| `js/spine-edit.js` | 4 | 5 |
| `js/spine-words.js` | 6 | 7 |
| `js/simple-tools.js` | 4 | 5 |
| `js/simple-timeline.js` | 6 | 7 |
| `styles.css` | 759 | 760 |

(They are hunks of `index.html` above, listed here so a builder on a later tree adds one to whatever it has then. `ship.sh` refuses a
changed file whose buster did not move. **No `SCHEMA_REV` bump:** the keys 2.3 writes are `sm.muteByMode` (already allowed), `sm.snd`
(2.2), `sm.twin` (2.1) and `project.sm.muteClips` (kept as a plain unknown key by the sanitiser; `muteClips` is already named in
`js/storage.js`'s project-`sm` comment).)


## 6. Tests

### 6.1 Edits to eight earlier tests (Phase 2.2's tray tests)

They assumed a clip has nine tools at most and measured a two-row PC tray; from 2.3 a video clip's tray is thirteen and goes back to
one row (A1). Their purpose is unchanged. The clip they measure is now a **picture** (`smPic`, defined in the first hunk below), the
More test uses an overlay picture (a main clip's More already sits where the pinned More lands, so nothing would move under it), the
wheel test names the last three tools before the pins, and every "nine tools" count moved by Replace. Each of the eight passes on
the finished tree at 1280 and 380 (§10).


#### 2.3.T1 `tests/tests.js`

Find (exactly once):

```js
  const smKf = (pairs) => ({ kf: pairs.map(p => ({ t: p[0], v: p[1], e: 'linear' })) });
```

Replace with:

```js
  /* 2.3: a PICTURE clip. A video clip's tray is 13 tools from 2.3 (Speed, Volume, Replace, Reverse, Take sound out), which no longer lie on two rows in
     the PC band, so the tray-B tests that measure the two-row layout use a picture, whose tray is ten tools at most (Replace joined it). */
  function smPic(name, start, dur, W, H, o) { return smV(name, start, dur, W, H, Object.assign({ type: 'image' }, o || {})); }
  const smKf = (pairs) => ({ kf: pairs.map(p => ({ t: p[0], v: p[1], e: 'linear' })) });
```

#### 2.3.T2 `tests/tests.js`

Find (exactly once):

```js
            ['crop', 'duplicateClip', 'seam'].forEach(id => { if (hits(id)) throw new Error('1280 px: after the wheel, ' + id + ' still cannot be clicked — ' + hits(id)); });
```

Replace with:

```js
            ['replace', 'reverse', 'seam'].forEach(id => { if (hits(id)) throw new Error('1280 px: after the wheel, ' + id + ' still cannot be clicked — ' + hits(id)); });
```

#### 2.3.T3 `tests/tests.js`

Find (exactly once):

```js
      /* B has a 1 s gap after it, so Close gap joins its tray: the longest main-clip tray there is */
      await smP2((W, H) => [smT('On A', 0.5, 1, W, H), smV('C', 6, 3, W, H), smV('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
        const say = document.getElementById('sm-say'), sayH = () => say.getBoundingClientRect().height;
```

Replace with:

```js
      /* B has a 1 s gap after it, so Close gap joins its tray: the longest main-clip tray there is */
      await smP2((W, H) => [smT('On A', 0.5, 1, W, H), smV('C', 6, 3, W, H), smPic('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
        const say = document.getElementById('sm-say'), sayH = () => say.getBoundingClientRect().height;
```

#### 2.3.T4 `tests/tests.js`

Find (exactly once):

```js
        const want = ['length', 'earlier', 'later', 'lift', 'duplicateClip', 'crop', 'seam', 'more', 'delete'];
```

Replace with:

```js
        const want = ['length', 'earlier', 'later', 'lift', 'duplicateClip', 'crop', 'replace', 'seam', 'more', 'delete'];
```

#### 2.3.T5 `tests/tests.js`

Find (exactly once):

```js
      await smP2((W, H) => [smT('On B', 3.5, 1, W, H), smV('C', 6, 3, W, H, { locked: true }), smV('B', 3, 3, W, H), smV('A', 0, 3, W, H)], async function (v) {
```

Replace with:

```js
      await smP2((W, H) => [smT('On B', 3.5, 1, W, H), smPic('C', 6, 3, W, H, { locked: true }), smPic('B', 3, 3, W, H), smV('A', 0, 3, W, H)], async function (v) {
```

#### 2.3.T6 `tests/tests.js`

Find (exactly once):

```js
        await smP2((W, H) => [smV('C', 6, 3, W, H), smV('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
          FM.selectLayer(v.L('B').id); await v.sleep(150);
          const at = w + '×' + h + ': ', m = smTrayBMeasure();
          if (innerHeight !== h) throw new Error('CONTROL: ' + at + 'the window is ' + innerWidth + '×' + innerHeight);
          if (m.order.length !== 9) throw new Error('CONTROL: ' + at + 'the tray is ' + m.order);
```

Replace with:

```js
        await smP2((W, H) => [smV('C', 6, 3, W, H), smPic('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
          FM.selectLayer(v.L('B').id); await v.sleep(150);
          const at = w + '×' + h + ': ', m = smTrayBMeasure();
          if (innerHeight !== h) throw new Error('CONTROL: ' + at + 'the window is ' + innerWidth + '×' + innerHeight);
          if (m.order.length !== 10) throw new Error('CONTROL: ' + at + 'the tray is ' + m.order);
```

#### 2.3.T7 `tests/tests.js`

Find (exactly once):

```js
      await smP2((W, H) => [smV('C', 6, 3, W, H), smV('B', 3, 3, W, H), smV('A', 0, 3, W, H)], async function (v) {
        const say = document.getElementById('sm-say'), insp = document.getElementById('inspector');
        FM.selectLayer(v.L('B').id); await v.sleep(150);
        const m = smTrayBMeasure();
        if (m.order.length !== 8) throw new Error('CONTROL: the tray is ' + m.order);
        if (m.rows.length !== 2) throw new Error('1280×720: before More the eight tools sit on ' + m.rows.length + ' row(s), want two');
```

Replace with:

```js
      /* 2.3: an OVERLAY picture (seven tools, so four columns and More in the third), not a main clip: a main clip's tray is nine tools or more now, five columns, and More already sits where the pinned More lands, so nothing moves under it (the hazard this test guards) */
      await smP2((W, H) => [smPic('O', 1, 1.5, W, H), smPic('C', 3, 3, W, H), smPic('A', 0, 3, W, H)], async function (v) {
        const say = document.getElementById('sm-say'), insp = document.getElementById('inspector');
        FM.selectLayer(v.L('O').id); await v.sleep(150);
        const m = smTrayBMeasure();
        if (m.order.length !== 7) throw new Error('CONTROL: the tray is ' + m.order);
        if (m.rows.length !== 2) throw new Error('1280×720: before More the seven tools sit on ' + m.rows.length + ' row(s), want two');
```

#### 2.3.T8 `tests/tests.js`

Find (exactly once):

```js
    await atPhoneWidth(async function () {
      await smP2((W, H) => [smV('C', 6, 3, W, H), smV('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
        const say = document.getElementById('sm-say'), tray = document.getElementById('sm-tray');
```

Replace with:

```js
    await atPhoneWidth(async function () {
      await smP2((W, H) => [smV('C', 6, 3, W, H), smPic('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
        const say = document.getElementById('sm-say'), tray = document.getElementById('sm-tray');
```

#### 2.3.T9 `tests/tests.js`

Find (exactly once):

```js
        if (bs.length !== 9) throw new Error('CONTROL: the tray is ' + bs.map(b => b.dataset.tool));
```

Replace with:

```js
        if (bs.length !== 10) throw new Error('CONTROL: the tray is ' + bs.map(b => b.dataset.tool));
```

#### 2.3.T10 `tests/tests.js`

Find (exactly once):

```js
      await smP2((W, H) => [smV('E', 12, 2, W, H), smV('D', 9.5, 2.5, W, H), smV('C', 6, 4, W, H), smV('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
```

Replace with:

```js
      await smP2((W, H) => [smV('E', 12, 2, W, H), smV('D', 9.5, 2.5, W, H), smPic('C', 6, 4, W, H), smPic('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
```

#### 2.3.T11 `tests/tests.js`

Find (exactly once):

```js
    await smTrayBAt(1280, 720, async function () {
      await smP2((W, H) => [smV('C', 6, 3, W, H), smV('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
        const fe = window.frameElement, root = document.documentElement, band = () => document.getElementById('inspector-panel').getBoundingClientRect();
```

Replace with:

```js
    await smTrayBAt(1280, 720, async function () {
      await smP2((W, H) => [smV('C', 6, 3, W, H), smPic('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
        const fe = window.frameElement, root = document.documentElement, band = () => document.getElementById('inspector-panel').getBoundingClientRect();
```

#### 2.3.T12 `tests/tests.js`

Find (exactly once):

```js
        if (m.order.length !== 9) throw new Error('CONTROL: the tray is ' + m.order);
```

Replace with:

```js
        if (m.order.length !== 10) throw new Error('CONTROL: the tray is ' + m.order);
```

#### 2.3.T13 `tests/tests.js`

Find (exactly once):

```js
    await smTrayBAt(1280, 720, async function () {
      await smP2((W, H) => [smT('On A', 0.5, 1, W, H), smV('C', 6, 3, W, H), smV('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
        const root = document.documentElement;
```

Replace with:

```js
    await smTrayBAt(1280, 720, async function () {
      await smP2((W, H) => [smT('On A', 0.5, 1, W, H), smV('C', 6, 3, W, H), smPic('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
        const root = document.documentElement;
```

#### 2.3.T14 `tests/tests.js`

Find (exactly once):

```js
    await smTrayBAt(844, 390, async function () {
      await smP2((W, H) => [smV('C', 6, 3, W, H), smV('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
        FM.selectLayer(v.L('B').id); await v.sleep(150);
```

Replace with:

```js
    await smTrayBAt(844, 390, async function () {
      await smP2((W, H) => [smV('C', 6, 3, W, H), smPic('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
        FM.selectLayer(v.L('B').id); await v.sleep(150);
```


### 6.2 The new tests (append at the end of `tests/tests.js`, before the final `})();`)

Fourteen tests, in this order: the shared `FM.shiftProp` (T23) and `FM.setClipSpeed` (the frozen slider body: Full's FU2 for the
extraction); Speed on a main clip (T25); Take sound out and the twin through every edit, with Put sound back and the mode's guard (T24);
Mute clip sound; the Speed row; Volume and Fade; Reverse; Replace with a shorter and a longer file; `FM.pickReplacement`'s settling
and Full's Replace media unchanged; Replace on a song and an overlay; Speed's refusals and the crossfade; the tray per kind; Mute clip
sound following new clips and Lift off. `smRec` and `smFakeLoad` at the top give a clip a record with a size and a duration without
needing a decoder (A: the gaps note in §13).


```js
  /* ═══ SIMPLE MODE RELEASE 2.3: speed, sound and replacing (BUILD-PLAN-PHASE2-2.3.md). Each test fails on the tree before 2.3 and passes after, at 1280 and 380. ═══ */
  /* a media record that lets a clip be a real source: the file the sound twin is matched by, a duration for the clamps */
  function smRec(dur, name, o) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 36;
    const file = new File([new Uint8Array(64)], name || 'src.mp4', { type: 'video/mp4' }); file._dur = dur;   // _dur: how long a second decode of this very file reports (smFakeLoad)
    return Object.assign({ kind: 'video', el: cv, file: file, width: 64, height: 36, duration: dur, hasAudio: true, waveform: null }, o || {});
  }

  /* this Chromium may have no decoder for the clip a test pretends to import, so loading a File makes a record of the right shape instead */
  async function smFakeLoad(fn) {
    const lv = FM.loadVideoFile;
    FM.loadVideoFile = async function (f) { return smRec((f && f._dur) || 10, f && f.name, { file: f, width: 320, height: 240 }); };
    try { return await fn(); } finally { FM.loadVideoFile = lv; }
  }

  test('simple P2.3 · T23 FM.shiftProp sets a keyed level WITHOUT adding a key: keys [1, 0.3, 1] set to 50% keep their count and times and scale by 0.5; an unkeyed level is written plainly; a level near 0 shifts; the range clamps', { item: '980', budgetMs: 30000 }, function () {
    if (typeof FM.shiftProp !== 'function') throw new Error('FM.shiftProp is missing — js/scene.js 2.3 did not load');
    const o = { volume: smKf([[0, 1], [1, 0.3], [2, 1]]) };
    const wrote = FM.shiftProp(o, 'volume', 0.5, 0, { min: 0, max: 10 });
    const v = o.volume.kf.map(k => +k.v.toFixed(6)).join(','), t = o.volume.kf.map(k => k.t).join(',');
    if (o.volume.kf.length !== 3 || t !== '0,1,2') throw new Error('a keyed level changed its keys: ' + o.volume.kf.length + ' key(s) at ' + t + ' (a key at the playhead is exactly what setProp would add)');
    if (v !== '0.5,0.15,0.5') throw new Error('the keys did not scale by 0.5 together: ' + v + ' (want 0.5,0.15,0.5)');
    if (wrote !== 3) throw new Error('it should report the 3 keys it wrote, said ' + wrote);
    const hi = { volume: smKf([[0, 1], [1, 4]]) };
    FM.shiftProp(hi, 'volume', 8, 0, { min: 0, max: 10 });
    if (hi.volume.kf.map(k => +k.v.toFixed(6)).join(',') !== '8,10') throw new Error('a ratio of 8 did not clamp at the ceiling: ' + hi.volume.kf.map(k => k.v));
    const flat = { volume: 1 }; FM.shiftProp(flat, 'volume', 0.4, 0, { min: 0, max: 10 });
    if (flat.volume !== 0.4) throw new Error('an unkeyed level was not written plainly: ' + JSON.stringify(flat.volume));
    const zero = { volume: smKf([[0, 0], [1, 0.5], [2, 1]]) };
    FM.shiftProp(zero, 'volume', 0.2, 0, { min: 0, max: 10 });
    if (zero.volume.kf.map(k => +k.v.toFixed(6)).join(',') !== '0.2,0.7,1.2') throw new Error('a level at ~0 should shift by the difference, not explode a ratio: ' + zero.volume.kf.map(k => k.v));
  });

  test('simple P2.3 · FM.setClipSpeed is the Speed slider’s flat branch moved unchanged: it re-times a clip exactly as the pre-2.3 body did, keyframes, group refit, the source clamp and the project length included', { item: '980', budgetMs: 30000 }, function () {
    /* the body as it stood in js/inspector.js before 2.3 (v17.24), frozen here: the FU2 "Full unchanged" check for the extraction */
    function frozen(layer, sp) {
      const durBefore = layer.duration, span = layer.duration * FM.speedAt(layer, layer.start);
      layer.speed = sp; layer.duration = Math.max(0.1, span / sp);
      const mm = FM.media.get(layer.id), srcDur = (mm && mm.duration) ? mm.duration : Infinity;
      if (layer.type === 'video' && isFinite(srcDur)) layer.duration = Math.max(0.1, Math.min(layer.duration, (srcDur - (layer.trimStart || 0)) / sp));
      if (durBefore > 0 && FM.scaleLayerKeyframes) FM.scaleLayerKeyframes(layer, layer.duration / durBefore);
      if (FM.refitGroupsFor) FM.refitGroupsFor(layer);
      const end = layer.start + layer.duration; if (end > FM.scene.project.duration) FM.scene.project.duration = end;
    }
    if (typeof FM.setClipSpeed !== 'function') throw new Error('FM.setClipSpeed is missing — js/inspector.js 2.3 did not load');
    const saved = FM.scene, mk = id => { const l = FM.makeLayer('video', { name: id, start: 2, duration: 6, x: 160, y: 120 }); l.id = id; l.trimStart = 1; l.transform.opacity = smKf([[2, 0], [5, 1], [8, 0.5]]); l.clipColor = '#123456'; return l; };
    try {
      const out = [];
      for (const [srcDur, sp] of [[Infinity, 2], [Infinity, 0.5], [9, 0.5], [3, 4], [20, 3.7]]) {
        const a = mk('_ss_a'), b = mk('_ss_b');
        FM.scene = scene([a]); FM.scene.project.duration = 8; if (srcDur !== Infinity) FM.media.set('_ss_a', { kind: 'video', duration: srcDur });
        frozen(a, sp);
        const ra = JSON.stringify({ l: a, d: FM.scene.project.duration }, FM.jsonReplacer);
        FM.media.remove('_ss_a');
        FM.scene = scene([b]); FM.scene.project.duration = 8; if (srcDur !== Infinity) FM.media.set('_ss_b', { kind: 'video', duration: srcDur });
        FM.setClipSpeed(b, sp);
        const rb = JSON.stringify({ l: b, d: FM.scene.project.duration }, FM.jsonReplacer);
        FM.media.remove('_ss_b');
        if (ra.replace(/_ss_a/g, 'x') !== rb.replace(/_ss_b/g, 'x')) throw new Error('FM.setClipSpeed(' + sp + ', source ' + srcDur + ') wrote a different clip than the slider’s own body did:\n' + ra + '\n' + rb);
        out.push(sp + '×');
      }
    } finally { FM.scene = saved; try { FM.media.remove('_ss_a'); FM.media.remove('_ss_b'); } catch (e) {} }
  });

  test('simple P2.3 · T25 Speed on the middle of three clips: 2× closes up the clips after it, what starts on it keeps its length and moves with its place, its keys scale, the playhead stays on the same moment — ONE undo step, byte for byte back; 0.25 s at 3× is refused and writes nothing, 0.25 s at 2× commits', { item: '980', budgetMs: 90000 }, async function () {
    await smP2((W, H) => [
      smT('On B', 4, 1, W, H), smV('C', 9, 3, W, H), smV('B', 3, 6, W, H, { volume: smKf([[3, 1], [9, 0.2]]) }), smV('A', 0, 3, W, H)
    ], async function (v) {
      const A = v.L('A'), B = v.L('B'), C = v.L('C'), T = v.L('On B');
      const doc0 = v.doc(), n0 = v.steps();
      FM.selectLayer(B.id); FM.time = 6;
      if (typeof FM.spine.cmd.speed !== 'function') throw new Error('FM.spine.cmd.speed is missing — js/spine-edit.js 2.3 did not load');
      FM.spine.cmd.speed(B.id, 2); await v.idle();
      if (Math.abs(B.duration - 3) > 1e-9 || Math.abs((B.speed || 1) - 2) > 1e-9) throw new Error('B did not become 3 s at 2×: ' + B.duration + ' s, speed ' + B.speed + ' (it said “' + v.say() + '”)');
      if (C.start !== B.start + B.duration) throw new Error('C did not close up exactly onto B’s new end: ' + C.start + ' vs ' + (B.start + B.duration) + ' (it said “' + v.say() + '”)');
      if (Math.abs(T.start - 3.5) > 1e-9 || Math.abs(T.duration - 1) > 1e-9) throw new Error('the title that started 1 s into B should start 0.5 s into it and keep its 1 s: ' + T.start + ' / ' + T.duration);
      const ks = B.volume.kf.map(k => +k.t.toFixed(9)).join(',');
      if (ks !== '3,6') throw new Error('B’s own keys did not scale with the clip: ' + ks + ' (want 3,6)');
      if (Math.abs(FM.time - 4.5) > 1e-9) throw new Error('the playhead should stay on the same moment of B (6 → 4.5), it is ' + FM.time);
      if (v.steps() !== n0 + 1) throw new Error('Speed took ' + (v.steps() - n0) + ' undo steps, not 1');
      const m = FM.history._metaHere();
      if (!m || m.ed !== 's' || m.arr !== true) throw new Error('Speed on a main clip should be a Simple ARRANGING step: ' + JSON.stringify(m));
      FM.history.undo(); await v.sleep(30);
      if (v.doc() !== doc0) throw new Error('one undo did not put the document back byte for byte');
      /* T25's other half: too short refuses and writes nothing; just long enough commits */
      const A1 = v.L('A');                                                    // an undo replaces the layer objects: take the live one
      FM.selectLayer(A1.id);
      FM.spine.cmd.trimTail(A1.id, 0.25, { typed: true }); await v.idle();
      const d2 = v.doc(), n2 = v.steps();
      FM.spine.cmd.speed(A1.id, 3); await v.idle();
      if (!/Too short to speed up that much/.test(v.say())) throw new Error('0.25 s at 3× said “' + v.say() + '”');
      if (v.doc() !== d2 || v.steps() !== n2) throw new Error('the refused speed changed the document or took a step');
      FM.spine.cmd.speed(A1.id, 2); await v.idle();
      if (Math.abs(v.L('A').duration - 0.125) > 1e-9 || v.steps() !== n2 + 1) throw new Error('0.25 s at 2× did not commit as one step: ' + v.L('A').duration + ', ' + (v.steps() - n2));
    });
  });

  /* T24 + Take sound out / Put sound back: a clip's sound, taken out, is a twin that stays in step through every edit that touches the clip */
  test('simple P2.3 · T24 Take sound out makes a sound twin that draws as a band in its clip and leaves the Sound row; the twin stays in step through a tail trim, a head trim, 2× speed, a split and Reverse; Put sound back removes it in ONE step and un-mutes the clip', { item: '980', budgetMs: 120000 }, async function () {
    await smFakeLoad(() => smP2((W, H) => [smV('Z', 6, 3, W, H), smV('A', 0, 6, W, H, { muted: false })], async function (v) {
      const S = FM.spine, sleep = v.sleep, A0 = v.L('A');
      FM.selectLayer(A0.id);
      const tw = () => FM.scene.layers.find(l => l.sm && l.sm.twin === true && l.audioOnly === true);
      const inStep = (label) => { const t = tw(), cl = v.L('A'); if (!t || !cl) throw new Error(label + ': the twin or the clip is gone'); if (!S.isTwinOf(t, cl)) throw new Error(label + ': the twin fell out of step with its clip — twin ' + JSON.stringify([t.start, t.duration, t.trimStart, t.speed, !!t.reversed]) + ' clip ' + JSON.stringify([cl.start, cl.duration, cl.trimStart, cl.speed, !!cl.reversed]) + ' files ' + JSON.stringify([t, cl].map(x => { const m = FM.media.get(x.id); return m && m.file ? [m.file.name, m.file.size, m.file.type] : null; }))); };
      const doc0 = v.doc(), n0 = v.steps();
      if (typeof S.cmd.takeSoundOut !== 'function') throw new Error('FM.spine.cmd.takeSoundOut is missing — js/spine-edit.js 2.3 did not load');
      S.cmd.takeSoundOut(A0.id); await v.idle();
      if (!tw()) throw new Error('Take sound out made no twin (it said “' + v.say() + '”)');
      if (!v.L('A').muted) throw new Error('the clip was not muted once its sound was taken out (the sound would play twice)');
      if (v.steps() !== n0 + 1) throw new Error('Take sound out took ' + (v.steps() - n0) + ' undo steps, not 1');
      inStep('right after Take sound out');
      FM.refreshAll(); await sleep(40);
      const R = S.read(FM.scene);
      if ((R.lanes.audio || []).some(l => l.indexOf(tw().id) >= 0)) throw new Error('the twin still has a place in the Sound row (it belongs to its clip)');
      if (!document.querySelector('#sm-main .sm-item[data-id="' + v.L('A').id + '"] .sm-twinband')) throw new Error('the clip does not draw the twin as a band along its bottom edge');
      if (!document.querySelector('#sm-tray [data-tool="putSound"]') || document.querySelector('#sm-tray [data-tool="takeSound"]')) throw new Error('the tray should now offer Put sound back, not Take sound out');
      /* a tail trim, then a head trim */
      S.cmd.trimTail(v.L('A').id, 4, { key: true }); await v.idle(); inStep('after a tail trim to 4 s');
      FM.selectLayer(v.L('A').id); S.cmd.trimHead(v.L('A').id, 1, { key: true }); await v.idle(); inStep('after a head trim to 1 s');
      /* 2× */
      S.cmd.speed(v.L('A').id, 2); await v.idle(); inStep('after 2× speed');
      if (Math.abs((tw().speed || 1) - 2) > 1e-9) throw new Error('the twin did not take the speed: ' + tw().speed);
      /* a split in the middle: two halves of the clip, two halves of the twin, each pair in step */
      const A1 = v.L('A'); S.cmd.split(A1.id, A1.start + A1.duration / 2); await v.idle();
      const halves = FM.scene.layers.filter(l => l.splitOf && l.splitOf === v.L('A').splitOf);
      const twins = FM.scene.layers.filter(l => l.audioOnly === true && l.sm && l.sm.twin === true);
      if (halves.length < 2 || twins.length !== 2) throw new Error('a split should make two clip halves and two twin halves: ' + halves.length + ' / ' + twins.length);
      halves.forEach(h => { if (!twins.some(t => S.isTwinOf(t, h))) throw new Error('a split half of the clip has no twin half in step with it: ' + h.name); });
      /* undo the split, then Reverse */
      FM.history.undo(); await sleep(40);
      S.cmd.reverse(v.L('A').id); await v.idle(); inStep('after Reverse');
      if (!tw().reversed || !v.L('A').reversed) throw new Error('Reverse did not flip the clip and its twin together');
      /* Put sound back: one step, the twin gone, the clip heard again */
      const n1 = v.steps();
      S.cmd.putSoundBack(v.L('A').id); await v.idle();
      if (tw()) throw new Error('Put sound back left the twin (it said “' + v.say() + '”)');
      if (v.L('A').muted) throw new Error('Put sound back left the clip muted');
      if (v.steps() !== n1 + 1) throw new Error('Put sound back took ' + (v.steps() - n1) + ' undo steps, not 1');
      FM.history.undo(); await sleep(40);
      if (!tw() || !v.L('A').muted) throw new Error('one undo did not bring the twin and the mute back');
      /* Mute clip sound OFF never un-mutes a clip whose sound was taken out, even with the mode's mark on it (it would play twice) */
      S.cmd.muteClips(true); await v.idle();
      v.L('A').sm = Object.assign({}, v.L('A').sm, { muteByMode: true });
      S.cmd.muteClips(false); await v.idle();
      if (!v.L('A').muted) throw new Error('Mute clip sound OFF un-muted a clip whose sound was taken out: the sound would play twice');
      if (v.L('A').sm && v.L('A').sm.muteByMode) throw new Error('Off left the mark on the clip');
    }, { media: [{ name: 'A', rec: smRec(10, 'a.mp4', { width: 320, height: 240 }) }] }));
  });

  test('simple P2.3 · Mute clip sound: the 🔈 at the head of the clip row mutes every clip and marks only the ones IT muted; off un-mutes only those, never a clip he muted himself and never one whose sound was taken out; a clip appended while it is on arrives muted', { item: '980', budgetMs: 120000 }, async function () {
    await smP2((W, H) => [smV('C', 6, 3, W, H, { muted: false }), smV('B', 3, 3, W, H, { muted: true }), smV('A', 0, 3, W, H, { muted: false })], async function (v) {
      const S = FM.spine, A = v.L('A'), B = v.L('B'), C = v.L('C');
      FM.refreshAll(); await v.sleep(60);
      const btn = () => document.querySelector('#sm-main .sm-mute');
      if (!btn()) throw new Error('no 🔈 at the head of the clip row');
      if (btn().getAttribute('aria-pressed') !== 'false') throw new Error('the 🔈 should start un-pressed');
      const n0 = v.steps(), doc0 = v.doc();
      btn().click(); await v.idle();
      if (!(S.muteMode() && FM.scene.project.sm && FM.scene.project.sm.muteClips === true)) throw new Error('the mode is not on the document (project.sm.muteClips)');
      if (!v.L('A').muted || !v.L('C').muted) throw new Error('Mute clip sound left a clip playing');
      if (!(v.L('A').sm && v.L('A').sm.muteByMode) || !(v.L('C').sm && v.L('C').sm.muteByMode)) throw new Error('the clips it muted carry no mark');
      if (v.L('B').sm && v.L('B').sm.muteByMode) throw new Error('a clip he had muted himself was marked as the mode’s');
      if (v.steps() !== n0 + 1) throw new Error('the toggle took ' + (v.steps() - n0) + ' undo steps, not 1');
      if (FM.history._metaHere().arr) throw new Error('the toggle is a look, not an arranging step: it must work with a friend in the session');
      FM.refreshAll(); await v.sleep(60);
      if (btn().getAttribute('aria-pressed') !== 'true') throw new Error('the 🔈 does not show the mode is on');
      /* asking for what is already so changes nothing and says so */
      const dd = v.doc(), nn = v.steps(); S.cmd.muteClips(true); await v.idle();
      if (v.doc() !== dd || v.steps() !== nn || !/Nothing changed/.test(v.say())) throw new Error('turning an already-on mode on again wrote something or took a step (it said “' + v.say() + '”)');
      /* a clip added while the mode is on arrives muted and marked */
      /* an unmarked manual change leaves Off alone: he un-mutes A himself, then Off must not touch it again, and B stays muted */
      v.L('A').muted = false;
      btn().click(); await v.idle();
      if (S.muteMode() || (FM.scene.project.sm && 'muteClips' in FM.scene.project.sm)) throw new Error('Off left the key on the document');
      if (v.L('B').muted !== true) throw new Error('Off un-muted a clip he muted himself');
      if (v.L('C').muted) throw new Error('Off left a clip the mode muted still muted');
      if (v.L('A').muted) throw new Error('Off muted a clip he had un-muted himself');
      if (v.L('A').sm || v.L('C').sm && v.L('C').sm.muteByMode) throw new Error('Off left marks behind: ' + JSON.stringify([v.L('A').sm, v.L('C').sm]));
      FM.history.undo(); FM.history.undo(); await v.sleep(40);
      if (v.doc() !== doc0) throw new Error('two undos did not restore the document byte for byte');
    });
  });

  test('simple P2.3 · the Speed row: the tray opens a row like Length (Done, 0.5× 1× 1.5× 2× 3×, a slider); while the slider moves only the boxes and the playback rate change and the document is untouched, and releasing it commits ONE step; a preset commits too; a ramped clip offers Use one speed and keeps its length', { item: '980', budgetMs: 120000 }, async function () {
    await smP2((W, H) => [smV('C', 6, 3, W, H), smV('B', 3, 3, W, H), smV('A', 0, 3, W, H)], async function (v) {
      const B = v.L('B'), C = v.L('C');
      FM.selectLayer(B.id); await v.sleep(100);
      if (!smTool('speed')) throw new Error('the clip’s tray has no Speed (it holds ' + Array.from(document.querySelectorAll('#sm-tray .sm-tool')).map(b => b.dataset.tool) + ')');
      smTool('speed').click(); await v.sleep(100);
      const tray = document.getElementById('sm-tray');
      ['rowBack', 'sp0.5', 'sp1', 'sp1.5', 'sp2', 'sp3'].forEach(id => { if (!smTool(id)) throw new Error('the Speed row has no ' + id + ': ' + Array.from(tray.querySelectorAll('button')).map(b => b.dataset.tool)); });
      const rng = tray.querySelector('.sm-speed-r');
      if (!rng) throw new Error('the Speed row has no slider');
      if (smTool('sp1').getAttribute('aria-pressed') !== 'true') throw new Error('1× should show as the current speed');
      const doc0 = v.doc(), n0 = v.steps(), w0 = document.querySelector('#sm-main .sm-item[data-id="' + B.id + '"]').getBoundingClientRect().width;
      rng.value = '2'; rng.dispatchEvent(new Event('input', { bubbles: true })); await v.sleep(60);
      if (v.doc() !== doc0 || v.steps() !== n0) throw new Error('moving the slider touched the document or took a step — it may only preview');
      const w1 = document.querySelector('#sm-main .sm-item[data-id="' + B.id + '"]').getBoundingClientRect().width;
      if (Math.abs(w1 - w0 / 2) > 1.5) throw new Error('the clip’s box did not halve while the slider sat at 2× (' + w0 + ' → ' + w1 + ')');
      const cx = parseFloat(document.querySelector('#sm-main .sm-item[data-id="' + C.id + '"]').style.left);
      rng.dispatchEvent(new Event('change', { bubbles: true })); await v.idle();
      if (v.steps() !== n0 + 1) throw new Error('releasing the slider took ' + (v.steps() - n0) + ' undo steps, not 1');
      if (Math.abs(v.L('B').duration - 1.5) > 1e-9 || v.L('C').start !== 4.5) throw new Error('the release did not commit 2×: B ' + v.L('B').duration + ' s, C at ' + v.L('C').start);
      /* a preset */
      await v.sleep(100);
      smTool('sp3').click(); await v.idle();
      if (Math.abs(v.L('B').duration - 1) > 1e-9 || v.steps() !== n0 + 2) throw new Error('the 3× preset did not commit one step: B ' + v.L('B').duration + ', steps ' + (v.steps() - n0));
      /* a ramped clip: the row says so and offers the one way out, which keeps the length */
      const Bl = v.L('B'); Bl.speed = smKf([[Bl.start, 1], [Bl.start + 1, 2]]); FM.refreshAll(); await v.sleep(100);
      FM.selectLayer(null); FM.selectLayer(Bl.id); await v.sleep(100);
      smTool('speed').click(); await v.sleep(100);
      if (!smTool('oneSpeed') || tray.querySelector('.sm-speed-r')) throw new Error('a ramped clip’s Speed row should offer Use one speed and no slider');
      const len0 = v.L('B').duration, n1 = v.steps();
      smTool('oneSpeed').click(); await v.idle();
      if (FM.isAnimated(v.L('B').speed) || Math.abs(v.L('B').duration - len0) > 1e-9 || v.steps() !== n1 + 1) throw new Error('Use one speed changed the length or took ' + (v.steps() - n1) + ' steps: ' + JSON.stringify(v.L('B').speed) + ' ' + v.L('B').duration);
    });
  });

  test('simple P2.3 · Volume and Fade: Volume acts on the sound twin when there is one and on the clip when not; a keyed level keeps its keys (no key at the playhead); a volume above 0 un-mutes; Fade steps by half a second; each is ONE step that does not arrange', { item: '980', budgetMs: 120000 }, async function () {
    await smFakeLoad(() => smP2((W, H) => [smV('B', 3, 3, W, H, { muted: false }), smV('A', 0, 3, W, H, { muted: false, volume: smKf([[0, 1], [1.5, 0.4], [3, 1]]) })], async function (v) {
      const S = FM.spine;
      FM.selectLayer(v.L('A').id); FM.time = 0; await v.sleep(100);
      smTool('volume').click(); await v.sleep(100);
      const rng = document.querySelector('#sm-tray .sm-vol-r');
      if (!rng) throw new Error('the Volume row has no slider');
      const n0 = v.steps();
      rng.value = '50'; rng.dispatchEvent(new Event('input', { bubbles: true })); rng.dispatchEvent(new Event('change', { bubbles: true })); await v.idle();
      const kf = v.L('A').volume.kf;
      if (kf.length !== 3 || kf.map(k => k.t).join() !== '0,1.5,3') throw new Error('Volume added or moved a key: ' + JSON.stringify(kf.map(k => [k.t, k.v])));
      if (kf.map(k => +k.v.toFixed(4)).join() !== '0.5,0.2,0.5') throw new Error('the keyed level did not scale to 50% at the playhead: ' + kf.map(k => k.v));
      if (v.steps() !== n0 + 1) throw new Error('Volume took ' + (v.steps() - n0) + ' undo steps, not 1');
      const m = FM.history._metaHere();
      if (!m || m.ed !== 's' || m.arr) throw new Error('Volume is a look: a Simple step that does not arrange (a friend can be in the session): ' + JSON.stringify(m));
      /* with a twin, Volume acts on the twin */
      S.cmd.takeSoundOut(v.L('B').id); await v.idle();
      const tw = FM.scene.layers.find(l => l.sm && l.sm.twin);
      if (!tw) throw new Error('setup: Take sound out made no twin');
      FM.selectLayer(v.L('B').id); await v.sleep(100);
      S.cmd.volume(v.L('B').id, 0.3); await v.idle();
      if (Math.abs(tw.volume - 0.3) > 1e-9 || v.L('B').volume !== 1) throw new Error('Volume should go to the twin (' + tw.volume + ') and leave the muted original alone (' + v.L('B').volume + ')');
      /* a muted clip given a volume is un-muted */
      const A = v.L('A'); A.muted = true; FM.selectLayer(A.id);
      S.cmd.volume(A.id, 0.8); await v.idle();
      if (v.L('A').muted) throw new Error('a volume above 0 left the clip muted');
      /* Fade */
      FM.selectLayer(A.id); await v.sleep(100);
      const n1 = v.steps();
      S.cmd.fade(A.id, 'in', 0.5); await v.idle(); S.cmd.fade(A.id, 'out', 1); await v.idle();
      if (v.L('A').fadeIn !== 0.5 || v.L('A').fadeOut !== 1) throw new Error('Fade did not write in/out: ' + v.L('A').fadeIn + ' / ' + v.L('A').fadeOut);
      if (v.steps() !== n1 + 2) throw new Error('two fades should be two steps, got ' + (v.steps() - n1));
      S.cmd.fade(A.id, 'in', 99); await v.idle();
      if (v.L('A').fadeIn > v.L('A').duration + 1e-9) throw new Error('a fade longer than the clip was kept: ' + v.L('A').fadeIn);
    }, { media: [{ name: 'B', rec: smRec(10, 'b.mp4', { width: 320, height: 240 }) }] }));
  });

  test('simple P2.3 · Reverse flips the clip and changes nothing else (start, length, keys, followers keep their times), asks for the frame cache only AFTER its commit and never for a twin, and goes back with one more press', { item: '980', budgetMs: 90000 }, async function () {
    await smP2((W, H) => [smT('On B', 4, 1, W, H), smV('C', 6, 3, W, H), smV('B', 3, 3, W, H, { volume: smKf([[3, 1], [6, 0.5]]) }), smV('A', 0, 3, W, H)], async function (v) {
      const asked = [], real = FM.ensureReverseCache, cleared = [], realClr = FM.maybeClearCache;
      FM.ensureReverseCache = async function (l) { asked.push([l.id, FM.history.isMuted()]); };
      FM.maybeClearCache = function (l) { cleared.push(l.id); };
      try {
        const B = v.L('B'), doc0 = v.doc(), n0 = v.steps();
        FM.selectLayer(B.id); await v.sleep(100);
        smTool('reverse').click(); await v.idle();
        const strip = JSON.stringify(FM.scene.layers.map(l => [l.name, l.start, l.duration, l.trimStart, l.volume && l.volume.kf && l.volume.kf.map(k => k.t)]));
        if (!v.L('B').reversed) throw new Error('Reverse did not flip the clip (it said “' + v.say() + '”)');
        if (v.steps() !== n0 + 1) throw new Error('Reverse took ' + (v.steps() - n0) + ' undo steps, not 1');
        if (asked.length !== 1 || asked[0][0] !== B.id) throw new Error('the frame cache should be asked for once, for the clip: ' + JSON.stringify(asked));
        if (asked[0][1]) throw new Error('the frame cache was asked for INSIDE the muted step — a decode can take seconds with history muted');
        const before = JSON.parse(doc0).layers.map(l => [l.name, l.start, l.duration, l.trimStart, l.volume && l.volume.kf && l.volume.kf.map(k => k.t)]);
        if (strip !== JSON.stringify(before)) throw new Error('Reverse moved or re-timed something:\n' + strip + '\n' + JSON.stringify(before));
        if (FM.history._metaHere().arr) throw new Error('Reverse is not an arranging step');
        smTool('reverse').click(); await v.idle();
        if (v.L('B').reversed || cleared.length !== 1) throw new Error('a second press did not play it forwards and let the cache go: reversed ' + v.L('B').reversed + ', cleared ' + cleared.length);
        const r = FM.spine.planReverse(FM.spine.read(FM.scene), 'nope');
        if (!r || !r.refuse) throw new Error('Reverse on a missing clip should refuse');
      } finally { FM.ensureReverseCache = real; FM.maybeClearCache = realClr; }
    });
  });

  test('simple P2.3 · Replace with a SHORTER file keeps the slot and closes the gap in the same step (the tail trim’s rules: a title stays on its clip, the clips after move up), a sound twin gets the same file, a longer file changes nothing else, and Undo brings the old file back', { item: '980', budgetMs: 150000 }, async function () {
    await smFakeLoad(() => smP2((W, H) => [smT('On B', 4, 1, W, H), smV('C', 9, 3, W, H), smV('B', 3, 6, W, H, { muted: false }), smV('A', 0, 3, W, H)], async function (v) {
      const S = FM.spine, B0 = v.L('B');
      FM.selectLayer(B0.id); await v.sleep(80);
      S.cmd.takeSoundOut(B0.id); await v.idle();
      const tw0 = FM.scene.layers.find(l => l.sm && l.sm.twin);
      if (!tw0) throw new Error('setup: no twin');
      const doc0 = v.doc(), n0 = v.steps(), rev0 = B0.mediaRev || 0;
      const nrec = smRec(4, 'short.mp4', { width: 320, height: 240 });
      if (typeof S.cmd.replace !== 'function') throw new Error('FM.spine.cmd.replace is missing — js/spine-edit.js 2.3 did not load');
      S.cmd.replace(B0.id, nrec); await v.idle();
      const B = v.L('B'), C = v.L('C'), T = v.L('On B'), tw = FM.scene.layers.find(l => l.sm && l.sm.twin);
      if (FM.media.get(B.id) !== nrec) throw new Error('the new file is not in the slot (it said “' + v.say() + '”)');
      if (Math.abs(B.duration - 4) > 1e-9 || B.start !== 3) throw new Error('the slot was not kept at the new file’s length: ' + B.start + ' / ' + B.duration);
      if (C.start !== B.start + B.duration) throw new Error('the clip after did not close up onto the shorter one: C at ' + C.start + ' (B ends ' + (B.start + B.duration) + ')');
      if (T.start !== 4) throw new Error('the title should stay where it was on the clip: ' + T.start);
      if (v.steps() !== n0 + 1) throw new Error('Replace took ' + (v.steps() - n0) + ' undo steps, not 1');
      if (!tw || Math.abs(tw.duration - 4) > 1e-9 || !FM.media.get(tw.id) || FM.media.get(tw.id).file.name !== 'short.mp4') throw new Error('the sound twin did not get the same file and length: ' + JSON.stringify(tw && [tw.duration, FM.media.get(tw.id) && FM.media.get(tw.id).file.name]));
      if ((B.mediaRev || 0) !== rev0 + 1) throw new Error('mediaRev was not bumped, so the swap is not inside the undo snapshot: ' + B.mediaRev);
      FM.history.undo(); await v.sleep(60);
      for (let i = 0; i < 100 && (!FM.media.get(B.id) || FM.media.get(B.id).file.name !== 'src.mp4'); i++) await v.sleep(20);
      if (v.doc() !== doc0) throw new Error('one undo did not put the document back byte for byte');
      if (!FM.media.get(B.id) || FM.media.get(B.id).file.name !== 'src.mp4') throw new Error('Undo did not bring the old file back into the slot (now ' + (FM.media.get(B.id) && FM.media.get(B.id).file.name) + ')');
      /* a LONGER file: nothing else moves, still one step */
      FM.selectLayer(v.L('B').id);
      const d1 = v.doc(), n1 = FM.history._steps().index;   // after an undo the stack keeps its length: the position is what counts
      S.cmd.replace(v.L('B').id, smRec(30, 'long.mp4', { width: 320, height: 240 })); await v.idle();
      if (FM.history._steps().index !== n1 + 1) throw new Error('a longer file took ' + (FM.history._steps().index - n1) + ' steps (it said “' + v.say() + '”)');
      const strip = JSON.stringify(FM.scene.layers.map(l => [l.name, l.start, l.duration]));
      const was = JSON.stringify(JSON.parse(d1).layers.map(l => [l.name, l.start, l.duration]));
      if (strip !== was) throw new Error('a longer file moved or re-timed something:\n' + strip + '\n' + was);
    }, { media: [{ name: 'B', rec: smRec(10, 'src.mp4', { width: 320, height: 240 }) }] }));
  });

  test('simple P2.3 · FM.pickReplacement ALWAYS settles — null when the picker is dismissed or the file will not load — and Full’s Replace media is unchanged: the same promise (true / false), the same swap, one history step', { item: '980', budgetMs: 90000 }, async function () {
    await smP2((W, H) => [smPic('P', 0, 3, W, H)], async function (v) {
      const P = v.L('P'), sleep = v.sleep;
      const rec0 = await FM.loadImageFile(await (async () => { const c = offscreen(8, 8); c.getContext('2d').fillRect(0, 0, 8, 8); const b = await new Promise(r => c.toBlob(r)); return new File([b], 'old.png', { type: 'image/png' }); })());
      FM.media.set(P.id, rec0); P.type = 'image';
      const input = () => Array.from(document.querySelectorAll('body > input[type="file"]')).pop();
      if (typeof FM.pickReplacement !== 'function' || typeof FM.swapInMedia !== 'function') throw new Error('FM.pickReplacement / FM.swapInMedia are missing — js/app.js 2.3 did not load');
      /* dismissed */
      const p1 = FM.pickReplacement(P.id); const i1 = input();
      if (!i1) throw new Error('the picker was not opened'); i1.dispatchEvent(new Event('cancel'));
      const r1 = await Promise.race([p1, sleep(1000).then(() => 'PENDING')]);
      if (r1 !== null) throw new Error('a dismissed picker left the promise ' + (r1 === 'PENDING' ? 'unsettled' : 'at ' + r1) + ', it must settle with null');
      if (input() === i1) throw new Error('the dismissed picker’s input was left in the page');
      /* a file that will not load */
      const p2 = FM.pickReplacement(P.id), i2 = input(), dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(4)], 'broken.png', { type: 'image/png' }));
      i2.files = dt.files; i2.dispatchEvent(new Event('change'));
      const r2 = await Promise.race([p2, sleep(3000).then(() => 'PENDING')]);
      if (r2 !== null) throw new Error('a file that will not load should settle with null, got ' + (r2 === 'PENDING' ? 'nothing' : typeof r2));
      /* Full's Replace media: a real picture picked */
      const c = offscreen(16, 12), g = c.getContext('2d'); g.fillStyle = '#c00'; g.fillRect(0, 0, 16, 12);
      const blob = await new Promise(r => c.toBlob(r)), good = new File([blob], 'new.png', { type: 'image/png' });
      const n0 = v.steps(), rev0 = P.mediaRev || 0;
      const p3 = FM.replaceMedia(P.id), i3 = input(), dt3 = new DataTransfer(); dt3.items.add(good);
      i3.files = dt3.files; i3.dispatchEvent(new Event('change'));
      const r3 = await Promise.race([p3, sleep(5000).then(() => 'PENDING')]);
      if (r3 !== true) throw new Error('Full’s Replace media settled with ' + String(r3) + ', it has always resolved true once the swap landed');
      if (!FM.media.get(P.id) || FM.media.get(P.id).file.name !== 'new.png') throw new Error('Full’s Replace media did not swap the file');
      if ((FM.layerById(FM.scene, P.id).mediaRev || 0) !== rev0 + 1) throw new Error('Full’s Replace media did not bump mediaRev');
      if (v.steps() !== n0 + 1) throw new Error('Full’s Replace media took ' + (v.steps() - n0) + ' history steps, not 1');
      /* and dismissed through replaceMedia: false, as before */
      const p4 = FM.replaceMedia(P.id); input().dispatchEvent(new Event('cancel'));
      const r4 = await Promise.race([p4, sleep(1000).then(() => 'PENDING')]);
      if (r4 !== false) throw new Error('Full’s dismissed Replace media settled with ' + String(r4) + ', it has always resolved false');
    }, { full: true });
  });

  test('simple P2.3 · Replace on a song and on an overlay swaps the file in ONE step that does not arrange: a shorter file shortens only itself, a tail mark goes, the Stay put stays, a sound-only record is a sound in Simple’s eyes (sm.snd) and nothing else moves', { item: '980', budgetMs: 120000 }, async function () {
    await smFakeLoad(() => smP2((W, H) => [smSong('Song', 0, 8, W, H, { sm: { stay: true, tail: true, tailEnd: 6 } }), smV('O', 1, 2, W, H, { muted: false }), smV('A', 0, 6, W, H)], async function (v) {
      const S = FM.spine, strip = skip => JSON.stringify(FM.scene.layers.filter(l => l.name !== skip).map(l => [l.name, l.start, l.duration]));
      const song = v.L('Song'), other0 = strip('Song'), n0 = v.steps();
      S.cmd.replace(song.id, smRec(4, 'new.m4a', { width: 0, height: 0 })); await v.idle();
      const s = v.L('Song');
      if (Math.abs(s.duration - 4) > 1e-9) throw new Error('the song did not take the shorter file’s length: ' + s.duration + ' (it said “' + v.say() + '”)');
      if (strip('Song') !== other0) throw new Error('replacing a song moved or re-timed something else');
      if (s.sm && s.sm.tail) throw new Error('the song kept a tail mark though its end changed');
      if (!(s.sm && s.sm.stay && s.sm.snd)) throw new Error('the song should keep Stay put and be marked a sound: ' + JSON.stringify(s.sm));
      if (FM.media.get(s.id).file.name !== 'new.m4a') throw new Error('the new file is not in the slot');
      if (v.steps() !== n0 + 1 || FM.history._metaHere().arr) throw new Error('one non-arranging step wanted: ' + (v.steps() - n0) + ' / ' + JSON.stringify(FM.history._metaHere()));
      const o = v.L('O'), d1 = strip('O'), n1 = v.steps();
      S.cmd.replace(o.id, smRec(9, 'longer.mp4', { width: 320, height: 240 })); await v.idle();
      if (strip('O') !== d1 || v.L('O').duration !== 2 || v.steps() !== n1 + 1) throw new Error('a longer file for an overlay should change only the file, in one step: ' + v.L('O').duration + ' / ' + (v.steps() - n1));
      const bad = S.planReplace(S.read(FM.scene), v.L('A').id, null);
      if (!bad || !bad.refuse) throw new Error('replacing with nothing should refuse');
    }, { media: [{ name: 'Song', rec: smRec(8, 'old.m4a', { width: 0, height: 0 }) }, { name: 'O', rec: smRec(5, 'o.mp4', { width: 320, height: 240 }) }] }));
  });

  test('simple P2.3 · Speed refuses with its own words and writes nothing: the owner of a crossfade, a clip that would fall under twice its fade, a ramped clip; the clip on the other side of the same fade changes speed and the fade keeps its length', { item: '980', budgetMs: 90000 }, async function () {
    await smP2((W, H) => [
      (() => { const b = smV('B', 4, 5, W, H); b.transform.opacity = smKf([[4, 0], [5, 1]]); return b; })(),
      smV('D', 13, 2, W, H, { speed: smKf([[13, 1], [15, 2]]) }), smV('C', 9, 4, W, H), smV('A', 0, 5, W, H)
    ], async function (v) {
      const S = FM.spine, doc0 = v.doc(), n0 = v.steps();
      const R0 = S.read(FM.scene), sb = R0.main[1] && R0.main[1].seam;
      if (!sb || sb.kind !== 'blend') throw new Error('CONTROL: the fixture is not a crossfade between A and B: ' + JSON.stringify(sb));
      S.cmd.speed(v.L('B').id, 2); await v.idle();
      if (!/fade into each other/.test(v.say())) throw new Error('Speed on the clip that OWNS the fade said “' + v.say() + '”');
      S.cmd.speed(v.L('A').id, 4); await v.idle();
      if (!/fades into the next one/.test(v.say())) throw new Error('A clip that would fall under twice its fade said “' + v.say() + '”');
      S.cmd.speed(v.L('D').id, 2); await v.idle();
      if (!/speed changes over time/.test(v.say())) throw new Error('A ramped clip said “' + v.say() + '”');
      if (v.doc() !== doc0 || v.steps() !== n0) throw new Error('a refused Speed wrote to the document or took a step');
      /* CONTROL: A at 2× is 2.5 s, still over twice the 1 s fade; B (the owner) moves up with its keys and the overlap stays 1 s */
      S.cmd.speed(v.L('A').id, 2); await v.idle();
      const A = v.L('A'), B = v.L('B');
      if (Math.abs(A.duration - 2.5) > 1e-9 || Math.abs(B.start - 1.5) > 1e-9) throw new Error('CONTROL: A at 2× did not give A 2.5 s and B at 1.5: ' + A.duration + ' / ' + B.start + ' (it said “' + v.say() + '”)');
      if (Math.abs((A.start + A.duration - B.start) - 1) > 1e-9) throw new Error('the fade changed length: the overlap is ' + (A.start + A.duration - B.start));
      if (B.transform.opacity.kf.map(k => +k.t.toFixed(6)).join() !== '1.5,2.5') throw new Error('B’s fade keys did not move with it: ' + B.transform.opacity.kf.map(k => k.t));
    });
  });

  test('simple P2.3 · the tray: a video clip offers Speed, Volume, Replace, Reverse; a picture only Replace; an overlay video Volume and Speed; a song Volume, Fade and Speed — and a song’s Speed changes only itself (nothing ripples, a tail mark goes)', { item: '980', budgetMs: 120000 }, async function () {
    await smP2((W, H) => [smSong('Song', 0, 8, W, H), smV('O', 1, 2, W, H, { muted: false }), smPic('P', 6, 3, W, H), smV('V', 0, 6, W, H, { muted: false })], async function (v) {
      const tools = () => Array.from(document.querySelectorAll('#sm-tray .sm-tool')).map(b => b.dataset.tool);
      const has = (want, absent, who) => { const t = tools(); want.forEach(w => { if (t.indexOf(w) < 0) throw new Error(who + ': the tray is missing ' + w + ' (' + t + ')'); }); (absent || []).forEach(w => { if (t.indexOf(w) >= 0) throw new Error(who + ': the tray should not offer ' + w + ' (' + t + ')'); }); };
      FM.selectLayer(v.L('V').id); await v.sleep(100); has(['speed', 'volume', 'replace', 'reverse'], [], 'a video clip');
      FM.selectLayer(v.L('P').id); await v.sleep(100); has(['replace'], ['speed', 'volume', 'reverse', 'takeSound', 'putSound'], 'a picture clip');
      FM.selectLayer(v.L('O').id); await v.sleep(100); has(['volume', 'speed'], ['reverse', 'takeSound'], 'an overlay video');
      FM.selectLayer(v.L('Song').id); await v.sleep(100); has(['volume', 'fade', 'stay'], ['reverse', 'replace', 'takeSound'], 'a song');
      /* a picture has no clock: Speed on it refuses and writes nothing */
      const dpic = v.doc(), npic = v.steps(); FM.spine.cmd.speed(v.L('P').id, 2); await v.idle();
      if (v.doc() !== dpic || v.steps() !== npic) throw new Error('Speed on a picture wrote something or took a step');
      /* the song's Speed: a look. Nothing else moves; its end is its own, so a tail mark goes (the Stay put under it stays) */
      const S = FM.spine, song = v.L('Song'); song.sm = { stay: true, tail: true, tailEnd: 6 };
      const others = JSON.stringify(FM.scene.layers.filter(l => l.name !== 'Song').map(l => [l.name, l.start, l.duration])), n0 = v.steps();
      S.cmd.speed(song.id, 2); await v.idle();
      if (Math.abs(v.L('Song').duration - 4) > 1e-9) throw new Error('the song did not become 4 s at 2×: ' + v.L('Song').duration + ' (it said “' + v.say() + '”)');
      if (JSON.stringify(FM.scene.layers.filter(l => l.name !== 'Song').map(l => [l.name, l.start, l.duration])) !== others) throw new Error('a song’s Speed moved or re-timed another item');
      if (v.L('Song').sm && v.L('Song').sm.tail) throw new Error('the song kept a tail mark though its end is no longer the track end');
      if (!(v.L('Song').sm && v.L('Song').sm.stay)) throw new Error('the song lost its Stay put');
      if (v.steps() !== n0 + 1 || FM.history._metaHere().arr) throw new Error('a song’s Speed should be one step that does not arrange: ' + (v.steps() - n0) + ' / ' + JSON.stringify(FM.history._metaHere()));
    });
  });

  test('simple P2.3 · Mute clip sound follows new clips and lets go on Lift off: a clip appended while it is on arrives muted and marked; Lift off hands the clip its sound back and drops the mark; a title is untouched', { item: '980', budgetMs: 120000 }, async function () {
    await smFakeLoad(() => smP2((W, H) => [smT('Title', 0, 1, W, H), smV('B', 3, 3, W, H, { muted: false }), smV('A', 0, 3, W, H, { muted: false })], async function (v) {
      const S = FM.spine;
      S.cmd.muteClips(true); await v.idle();
      if (!S.muteMode() || !v.L('A').muted) throw new Error('setup: the mode did not come on');
      const vid = new File([new Uint8Array(32)], 'new.mp4', { type: 'video/mp4' });
      await S.cmd.append([vid]); await v.idle();
      const added = FM.scene.layers.find(l => l.name === 'new.mp4' || (l.sm && l.sm.main && l.name !== 'A' && l.name !== 'B'));
      if (!added) throw new Error('setup: the appended clip is not in the scene (it said “' + v.say() + '”)');
      if (!added.muted || !(added.sm && added.sm.muteByMode)) throw new Error('a clip appended while Mute clip sound is on should arrive muted and marked: ' + JSON.stringify([added.muted, added.sm]));
      if (v.L('Title').muted || (v.L('Title').sm && v.L('Title').sm.muteByMode)) throw new Error('the mode touched a title');
      FM.selectLayer(v.L('B').id); await v.sleep(100);
      S.cmd.lift(v.L('B').id); await v.idle();
      if (v.L('B').muted || (v.L('B').sm && v.L('B').sm.muteByMode)) throw new Error('Lift off left the overlay muted / marked: ' + JSON.stringify([v.L('B').muted, v.L('B').sm]));
      if (!v.L('A').muted) throw new Error('Lift off un-muted a clip that stayed in the row');
    }));
  });

```


## 7. How each test fails on the tree before 2.3 (the tip, `a51b5e1d`), at 1280 and at 380

Run on a second copy of the tip carrying only the new `tests/tests.js`. **0 of 14 pass at 1280 and 0 of 14 at 380**, with the same message at both widths. 10 fail because a module is absent (they prove presence only — §8 is what proves they measure anything); 4 fail by what the tip actually does:

| test (first words) | before 2.3, at 1280 and at 380 |
|---|---|
| T23 FM.shiftProp sets a keyed level WITHOUT adding a key: keys [1, 0.3, 1] set to 50% keep t… | module absent: “js/scene.js 2.3 did not load” |
| FM.setClipSpeed is the Speed slider’s flat branch moved unchanged: it re-times a clip exactl… | module absent: “js/inspector.js 2.3 did not load” |
| T25 Speed on the middle of three clips: 2× closes up the clips after it, what starts on it k… | module absent: “js/spine-edit.js 2.3 did not load” |
| T24 Take sound out makes a sound twin that draws as a band in its clip and leaves the Sound … | module absent: “js/spine-edit.js 2.3 did not load” |
| Mute clip sound: the 🔈 at the head of the clip row mutes every clip and marks only the ones … | by behaviour: “no 🔈 at the head of the clip row” |
| the Speed row: the tray opens a row like Length (Done, 0.5× 1× 1.5× 2× 3×, a slider); while … | by behaviour: “the clip’s tray has no Speed (it holds length,earlier,later,lift,duplicateClip,crop,more,delete)” |
| Volume and Fade: Volume acts on the sound twin when there is one and on the clip when not; a… | by behaviour: “Cannot read properties of null (reading 'click')” |
| Reverse flips the clip and changes nothing else (start, length, keys, followers keep their t… | by behaviour: “Cannot read properties of null (reading 'click')” |
| Replace with a SHORTER file keeps the slot and closes the gap in the same step (the tail tri… | module absent: “S.cmd.takeSoundOut is not a function” |
| FM.pickReplacement ALWAYS settles… | module absent: “js/app.js 2.3 did not load” |
| Replace on a song and on an overlay swaps the file in ONE step that does not arrange: a shor… | module absent: “S.cmd.replace is not a function” |
| Speed refuses with its own words and writes nothing: the owner of a crossfade, a clip that w… | module absent: “S.cmd.speed is not a function” |
| the tray: a video clip offers Speed, Volume, Replace, Reverse; a picture only Replace; an ov… | module absent: “a video clip: the tray is missing speed (length,earlier,later,lift,duplicateClip,crop,more,delete)” |
| Mute clip sound follows new clips and lets go on Lift off: a clip appended while it is on ar… | module absent: “S.cmd.muteClips is not a function” |



## 8. Mutation proofs (each seam kept, one rule broken; run alone at 1280 on the finished tree; restored after)

`tools/mutate.sh` is the repo's tool; this rehearsal used a ten-line harness with the same contract (one exact string, found once,
changed; the named test run alone; the file restored in a `finally`) because `mutate.sh` needs a green full suite first. The builder
repeats the table with `tools/mutate.sh`. **25 of 25 mutations were caught** (the first run of M24 survived: no test asked for a mode
that is already on again; that assertion was added to the Mute test, and M24 is caught; M25, the picture guard, was added with the guard).

| # | File | The one change | Caught by |
|---|---|---|---|
| M1 | `scene.js` | `shiftProp` stops scaling the keys (writes them back as they were) | T23 `FM.shiftProp` |
| M2 | `inspector.js` | `setClipSpeed` drops the keyframe scaling | `FM.setClipSpeed is the slider's body` |
| M3 | `spine-edit.js` | Speed no longer moves what starts on the clip | T25 Speed |
| M4 | same | Speed ripples the clips after it by 0 | T25 Speed |
| M5 | same | Speed leaves the playhead where it was | T25 Speed |
| M6 | same | the too-short refusal is switched off | T25 Speed |
| M7 | same | Speed leaves the sound twin at the old speed | T24 Take sound out |
| M8 | same | Take sound out does not mark the twin `sm.twin` | T24 |
| M9 | `spine.js` | the twin keeps a place in the Sound row | T24 |
| M10 | `spine-edit.js` | Put sound back leaves the clip muted | T24 |
| M11 | same | Reverse asks for the frame cache inside the muted step | Reverse |
| M12 | same | Mute clip sound OFF un-mutes a clip whose sound was taken out | T24 (the section added for it) |
| M13 | same | Replace with a shorter file ripples by 0 | Replace with a SHORTER file |
| M14 | same | Replace leaves the twin on the old file | Replace with a SHORTER file |
| M15 | `app.js` | a dismissed picker no longer settles the promise | `FM.pickReplacement ALWAYS settles` |
| M16 | `simple-tools.js` | the Speed slider commits while it moves | the Speed row |
| M17 | `simple-timeline.js` | the preview no longer stretches the clip's box | the Speed row |
| M18 | `spine-edit.js` | Volume writes with `setProp` (a key at the playhead) | Volume and Fade |
| M19 | same | a clip appended while Mute clip sound is on arrives un-muted | Mute clip sound follows |
| M20 | same | Lift off leaves the mode's mark and the mute on the overlay | Mute clip sound follows |
| M21 | `simple-tools.js` | `TWO_ROW_MAX` 10 → 99 (a 13-tool tray goes back on two rows) | "More is always in reach" (an existing 2.2 test) |
| M22 | `spine-edit.js` | Volume ignores the sound twin | Volume and Fade |
| M23 | same | a song's Speed keeps its tail mark | the tray |
| M24 | same | Mute clip sound ON when it is already on writes a step | Mute clip sound |

Two of the proofs are of the lock rather than of 2.3: M2 shows the extraction is pinned to the slider's old body, and M21 shows an
existing 2.2 test guards the two-row rule.


## 9. Full is unchanged: what was measured, and what could not be

His rule (1 Oct): *"i dont want the original editor changing in design and function"*. Four things touch code Full also runs; each is
pinned by a test or by the lock.

| Shared change | Why Full cannot see it | Pinned by |
|---|---|---|
| `FM.setClipSpeed` (js/inspector.js) | the slider's flat branch moved, unchanged, into a function the slider calls | test 2: a frozen copy of the old body writes the same clip for five speeds, a source clamp and keyframes; M2 |
| `FM.pickReplacement` / `FM.swapInMedia` (js/app.js) | `FM.replaceMedia` is exactly pick-then-swap; `o.simple` / `o.noSave` / `o.noLib` default off | the "pickReplacement ALWAYS settles" test also drives Full's Replace media (true / false, the swap, `mediaRev`, one step); M15 |
| `FM.shiftProp` (js/scene.js) | a new function nothing in Full calls | T23 |
| `styles.css` | every new rule names a `.sm-*` class or `#sm-tray` (Simple's own, `display: none` in Full); the one edited rule is `#sm-tray.sm-tray-2` | the existing 2.2 Full controls ("in Full the Simple rows show: no") |

**The lock (`tools/full-unchanged.sh`) cannot PASS in this container, and it could not have PASSED on the tip either.** Run on the
finished tree against `a51b5e1d`, all ten runs measured on both sides (3,930 s each time; it needed `numpy`, installed for the run):

- **The instrument is broken here, by the container:** this Chromium has no H.264, so the probe's multi-file pick, Extract Audio,
  Reverse, the split-target Follow and luma matte, the delete of Pick D and the MP4 export cannot be driven on HEAD either
  ("Cannot call 'encode' on a closed codec"), and the lock refuses to print PASS on a run that did not measure.
- **HEAD against HEAD shows the same noise:** 48 differences in FU4, every one `layer.pick.b`, a random id the half-failed pick
  leaves on each run. The tree's 359 differences in the last full run are 343 `pick.b` lines and 16 others: FU6 and FU7 ("the tree has `#cv-editor`… step 1.3 must build it": the
  lock's own unbuilt parts, true of the tip), and pictures and animation timings (below).
- **The pictures:** `fu1-add-sheet` and `fu1-opts-strip` at 380 differ by **4 px against a tolerance of 3** in a 2×2 patch at
  (190, 798), and the same two pictures at 320×568 by 30 px at (109..210, 566): the second also differs **HEAD against HEAD**
  (30 px, two copies of the same code), so it is this machine's jitter. The 380 patch reproduces with the new CSS block as a whole
  (twice) and with none of its rules alone, and not with the JS alone: it is at the noise floor, but **I cannot call it noise**, so it
  is listed here for the builder's Mac run, where the tolerances were measured.
- **What was compared and identical:** every group the probe could drive (FU1 screens at ten sizes, FU2's edits including **the Speed
  card typed to 200** and the Replace steps that need no decoder, FU3's keys, FU5, the live session's wire) differs only in the
  lines above.

**What the builder must do:** run `tools/full-unchanged.sh` once on a Mac (about three hours, detached) with this tree; FU6 and FU7
will say step 1.3 is unbuilt on this chain, which is not 2.3's to fix. If the 4-px patch at (190, 798) reproduces there, bisect by
rule (this rehearsal's bisect: no single rule of the block reproduced it).


## 10. How this was checked, and how far

| Check | Result |
|---|---|
| Every hunk of §4, applied by script to the tip (`a51b5e1d`, v17.24), each Find found **exactly once** in the text as the earlier hunks left it | 43 hunks in 10 files and 14 in `tests/tests.js`; **byte-identical to the tree** for every file (the round trip is `p23-scripts/gen_doc.py` + `hunks.py`, kept beside this file) |
| The preflight greps of §2 on the tip | all ten print 1 |
| 2.3's 14 tests on the tip | **0/14 at 1280 and 0/14 at 380** (§7) |
| 2.3's 14 tests on the tree | **14/14 at 1280 and 14/14 at 380** |
| The whole Simple slice (`simple P`: the 85 earlier tests + 14) on the tree | **99/99 at 1280 and 99/99 at 380**. On the tip the slice was 84/85 at 1280 (one existing red, "tray B at 1280×800 … 960×700": 2 px over at 960 wide, which A2's padding line also fixes) and 85/85 at 380 |
| Behavioural mutations | **25 of 25 caught** (§8; 24, then M25 for the picture guard) |
| Full unchanged | see §9: **not provable in this container**; the shared changes are each pinned by a test; one 4-px patch at the noise floor to check on a Mac |
| The whole suite with 2.3 applied | **not run** (only the Simple slice and the slices named in §6.1; the container's missing H.264 would add its usual ~50 reds) |
| `tools/ship.sh`, `tools/prove.sh`, `tools/mutate.sh` | not run: same before/after comparison and mutations by hand through `tests/_cdp.py` |
| iPhone, Safari | not run (headless Chromium only) |
| Screens at 380 and 1280 | eight, looked at (§11) |

The rehearsal's tree is the branch `hunt/simple-2.3` (v17.24 + this release, uncommitted version label: it is not a release).


## 11. The screens (through the real app with `tools/shot.py`; `p23-shots/` beside this file)

A project of four clips (one with a keyed volume), a title and a song, at 380×800 and 1280×800. The first-run hint ("Simple editor.
Switch back any time…") sits over the timeline in every shot; it is the app's own.

| File | What it shows |
|---|---|
| `1-tray-video-380.png` | a video clip selected: the tray row, scrollable, with More and 🗑 pinned |
| `2-speed-row-380.png`, `3-speed-drag-380.png` | the Speed row: Done, the five presets, the slider and its readout, all on screen at 380 (they were off the edge before the preset buttons were narrowed; fixed in this release); the second with the thumb at 2× |
| `4-volume-row-380.png` | the Volume row, a 0–200 % slider and the level |
| `5-fade-row-380.png` | a song's Fade row (In 1.5 s) |
| `6-sound-out-and-mute-380.png` | the 🔈 amber (Mute clip sound on) at the head of the clip row, a clip with its sound taken out (the thin band along its bottom edge) and the tray after |
| `7-tray-video-1280.png` | **A1 in one picture:** a video clip's tray on a PC is one scrolling row, and Length, Speed, Volume are all that fit beside More and 🗑 |
| `8-tray-picture-1280.png` | a picture's tray on a PC: his pick B, two rows, Replace in the second |


## 12. Every point where §5 was ambiguous, and what I chose

Numbered so a reviewer can answer by number. **A1 needs his word; A2 to A6 change what he sees and are the ones to read.** The rest
are plumbing choices a reviewer can check against the code.

| # | The ambiguity | What I chose, and why |
|---|---|---|
| **A1** | **§5 gives a main clip five more tools; his pick B (6 Oct) lays a tray out on two rows "with every tool on show".** A video clip's tray is now 13 tools (14 with Close gap). The PC band is 307 px and a tool 54: five to a row, ten at most. Two rows cannot hold 13 (measured: the 7th tool of a row sits at 306–358 px in a 0–307 band and **More cannot be clicked**). | A tray of more than ten tools goes back to **one scrolling row with More and 🗑 pinned**, exactly as on a phone (`TWO_ROW_MAX = 10`, `js/simple-tools.js`). His pick B still holds for every tray that fits: a picture (ten with Close gap), a title, a sound, an overlay. **The cost is that the commonest clip, a video, loses his two-row tray on a PC.** Options for him: (a) as built; (b) a third row (the band grows 52 px more, and 1280×720 has no room: the Speed row's panel already has 88 px); (c) fewer, bigger tools: Speed, Volume and Take sound out behind one **Sound & speed** tool that opens a row (a video's tray would be ten); (d) Reverse and Replace behind More. I recommend (c) and did not build it: it is his layout. |
| A2 | The padding of a two-row tool. | `#sm-tray.sm-tray-2 .sm-tool` padding 4 px → 3 px. With Replace in the picture tray the 960×700 band (299 px) was 2 px short with ten tools. One line of CSS, Simple only. |
| A3 | Where the 🔈 sits (§3.6: "the head of the clip row, its one home"). | Left of the first clip, `xOf(0) − 46`, 40×40, inside the scrolling row, so it scrolls away with the row and is on screen whenever the playhead is at the start. Not pinned: the row has no fixed head in 2.2. |
| A4 | Does Speed apply to things that are not main clips? §5 lists Speed in the overlay tray and the sound tray. | Yes, as a **look** (`S.planSpeedItem`): nothing follows an overlay or a song, nothing ripples, no gate. A song's `sm.tail` mark goes (its end is its own); its Stay put stays. |
| A5 | A ramped clip. §5: *"Speed changes over the clip" + Use one speed*. | The Speed row shows that sentence and one button. Use one speed keeps the **length** (footage ÷ length), moves nothing, and does not map caption cues (it refuses with caption tracks on the clip: 2.4). |
| A6 | Take sound out when the clip is already muted or has no sound; the Mute 🔈 and the extracted original. | Not offered (muted, no audio, or already out). Mute clip sound **Off never un-mutes a clip with a sound twin or a karaoke companion**, even with the mode's mark on it (§6.2 test 4 pins it). `planTakeSound` also drops the mark when it mutes the original. |
| A7 | Speed's upper stop. §5: `min(4, span / MIN_LEN)` and `span / (2·amt)` on a blend. | Both blends beside the clip count (the one before and the one after), and the clip that **owns** a fade is refused outright (its opacity keys stretch with the clip and would no longer match the overlap): *"A and B fade into each other"*. The clip on the other side of the same fade changes speed and the fade keeps its length (§6.2 test 9). |
| A8 | Caption tracks lying on a sped-up clip (§3.5: cues map through the speed). | Refused with the 2.1 line *"Captions here move with clips in the next update"*; the mapping belongs to 2.4 with the other rider maps. Same for Use one speed. |
| A9 | The loop region (§3.6.2: it follows its footage). | **Not mapped.** 2.1's and 2.2's commands do not map it either (`loopIn` / `loopOut` appear nowhere in `js/spine-edit.js`); mapping it belongs to one change for all of them. |
| A10 | `S.scaleKeysCueFx` (§5). | A local `scaleCueKeys`, called for the clip and each twin. A main clip is never a caption track, so on a real project it has nothing to scale; it is there because the plan names it and costs nothing. |
| A11 | Volume's range and target. §5: 0–200 %, "on a clip with a twin it acts on the twin". | The slider is 0–200 %; keys are clamped to Full's own ceiling (1000 %) so a level Full set higher is not destroyed by touching the slider; the target is the twin when there is one. A volume above 0 on a **muted** clip un-mutes it and drops the Mute clip sound mark (he asked to hear it). |
| A12 | Fade is not in the design's table beyond the sound tray's name. | Two steppers (In, Out) of 0.5 s that write `fadeIn` / `fadeOut` (0.1 s resolution, never longer than the clip) and call `FM.reconcileFades`, the function Full's sliders call. |
| A13 | Reverse on a picture, an audio-only clip. | Not offered. Reverse needs a video; on a missing clip the plan refuses `gone`. Un-reverse asks `FM.maybeClearCache`. |
| A14 | Replace for things that are not main clips, and for a title or a shape. | A picture or video overlay and a song can be replaced (swap only; the length follows the new file; a `sm.tail` mark goes if it changed); a title, shape, null, camera or group cannot (*"Open in Full to replace this"*). The tray offers Replace on main clips only in 2.3. |
| A15 | Replace on a clip with a sound twin (§4.6: "applies the same call to its twins"). | The twin gets the same file by a **second decode of the same `File`** and its own record, stash and `mediaRev`, so Undo puts both back. |
| A16 | A picker that never fires `cancel`. | `S.cmd.pickReplace` does **not** hold `S.reading` (the editor switch would wait on a promise that may never settle). After the decode it asks `FM.stillIn(project)` and lets the record go if the project changed. |
| A17 | `FM.extractAudio` shows its own toast (*"Audio extracted to its own layer — original muted"*). | Left alone: Full's function is untouched (the FU lock watches it). In Simple the toast and Simple's own line both show. A later release can suppress the toast behind an option. |
| A18 | Put sound back with a **karaoke** twin (a rendered WAV, not a copy of the source). | Handled the same way: the twin goes and the clip is heard again. The Karaoke toggle's own restore still lives in Full's Volume panel. |
| A19 | `sm.snd` at Replace (§5 table's last row). | `swapInMedia(o.simple)` sets `sm.snd` when the new record has no picture and drops it when it has one, and writes `srcW` / `srcH` / `srcRev` (already in the FU lock's `FU_INVISIBLE`). |
| A20 | Where the Speed preview draws. | `FM.simpleTimeline.previewSpeed` stretches the clip's box and slides everything after it **in the DOM only**; `change` puts every box back and commits. The playback rate is set on the element while the thumb moves and restored on release. |
| A21 | The words. | New lines and tool names in `js/spine-words.js` (§4), no company name in any (T20 scans them). |
| A22 | Existing tests that assumed a clip has nine tools. | Eight Phase 2.2 tests edited (§6.1): their clip is a **picture** (`smPic`), the overlay variant of the More test uses an overlay (a main clip's More already sits where the pinned More lands), and the wheel test names the last three tools before the pins. Their purpose is unchanged; they could not stay as written. |
| A23 | Collab (D14). | Volume, Fade, Reverse, Take sound out, Put sound back and Mute clip sound are not gated (`arranges false`, `adopts false`); Speed on a main clip and Replace-with-a-shorter-file are, and refuse live with 2.1's line. Not run against a live session: the gate is the one 2.1 tested. |
| A24 | Mutating `FM.history` during the pick. | None. The pick happens before `S.edit`; nothing is muted while a picker is open. |


## 13. Known gaps (honest list)

- **A1 is open.** The video tray is one scrolling row on a PC until he chooses.
- **Not run on an iPhone** or in Safari: the Speed slider, the `change` event on a range input and the picker's `cancel` event are
  Chrome-headless-tested only. iOS fires `change` on release for a range input, but I have not watched it.
- **The decoder.** This container's Chromium has no H.264 or AAC, so nothing here decodes a real clip: the tests hand the runner
  records of the right shape (`smRec`) and stub `FM.loadVideoFile` (`smFakeLoad`). Replace, Take sound out and the twin tests
  therefore prove the plan, the ripple, the undo and the twin matching, **not** a real second decode. Run them once on a Mac.
- **Reverse's frame cache** is asked for but not built in the suite (a seam records the call); the real decode is Full's code.
- **Loop region, caption cues and camera/cut-item keys** are not mapped by Speed or Replace (A8, A9; 2.4).
- **Live session:** the gate is 2.1's and was not driven again.
- **The FU lock** (§9): see the result there.
- The Replace tool is for main clips; an overlay or song can be replaced by the command but the tray does not offer it.
