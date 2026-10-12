# fx-c — backlog §C ("BROKEN / WEAK") audited on the effects tree

Tree: `hunt/fx-c-bugs`, branched from `6f1d90b1` (hunt/fx-polish-all: land-b3 + E1 + #966 polish batches 7, 8, 10–15).
List: `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §C (line ~1273). Worked by an agent on 13 Oct, node only (no browser).

## The headline

**Every §C item on the list was already fixed — by #986, in v17.14 (`1924ade0`) and v17.16 (`b99f2723`), both ancestors of
`6f1d90b1`.** REQUESTS.md #986 (hunt HIGH, 29 Sep) is the §C list item for item, and it ticks all 26 with their versions
(`git show ssh/main:REQUESTS.md`, the #986 entry). backlog.md §C was written before that and was never annotated, which is
why it still reads as open. The batches built since (6 on main; 7, 8, 10–15 here) were checked for undoing those fixes or
growing the same bug in new code: none found, except one new instance of the C4 shape (Pixelate, below), which is fixed.

## Audit (each checked in the code on this tree, not by its label)

| Item | Status | Fixed by | Evidence on this tree |
|---|---|---|---|
| C1 filter on an adjustment layer renders nothing | FIXED | v17.14 | `applyAdjustment` opens live containers (`adjFlatten` / `adjFilterPlate`, cross-fade by Strength). Batch 15 kept it: range / skin / Over-drive mix per pixel there too (`fcPixelOpts`), Warmth and Fade run (`fcFinish(…, adj)`), Grain / Vignette / Sharpen rows say they do nothing there. Node: `986 C1 …` PASS. |
| C3 Chroma Key Pro despill always green | FIXED | v17.14 | despill channel = the key's strongest (`kc`); 12.1's Despill from defaults to 0 = Key colour. Node: `986 C3 …` PASS. |
| C4 only the first Chroma / Luma Key runs | FIXED | v17.14 | drawLayer loops `cks` / `lks` (`.filter`), a canvas + memo per slot; 12.2's Similar / Dissimilar tolerance is in the luma memo. Node: `986 C4 …` PASS. |
| C6 Night Vision scanlines per plate pixel | FIXED | v17.14 | kernel takes `ps`, scanline coverage per project row (`nvCov`). Grain stays one plate px on purpose (the floor every grain has). Node: `986 C6 …` PASS. |
| C7 Clouds / Starfield per plate pixel | FIXED | v17.16 | Clouds samples project space per plate pixel; 11.4's Octaves / Boil / Contrast / Vertical drift sit on that. Starfield: `starfieldReduced`, and 11.3's Fly-through / Drift / Glint / Pattern go through `starfieldMoving` in project px. Node: `986 C7 …` and `986 C7 review …` PASS. |
| C8 two vignette renderers | FIXED | v17.14 | the media-layer inline gradient is gone (`CANVAS_FX.vignette` only); batch 6's controls on top. Node: 2 of the 3 `986 C8` tests PASS; `… not its Glow or its own shadow` needs the drop-shadow filter → browser. |
| C17 Phaser feedback delay in a cycle | FIXED | v17.16 | feedback loop unrolled (`PHASE_PASSES` copies, no DelayNode cycle); 7.6's Stages / Centre / Mix / Stereo phase are built on the unrolled lane. `986 C17` needs an OfflineAudioContext → browser. |
| C22 Drop Shadow skips partly transparent pixels | FIXED | v17.14 | `if(dsa>=255) continue;` and the shadow is composited behind a partly covered pixel; 6.3's Spread / Smoothness / Shadow only on top. `986 C22` needs fillText → browser; node probe below. |
| C24 blurs lost where ctx.filter is dead | FIXED | v17.14 (5 sites) + v17.16 (the rest) | every `filter = 'blur…'` in compositor.js asks `ctxFilterOK()` first and otherwise takes `drawBlurredNoFilter` / `drawBlurredDrawNoFilter`: mask feather, Luma Matte feather, Compound Blur, Halation, Temporal Denoise, Light Wrap, Motion Blur (Footage), Liquid Glass, Backfill, 3D shading, camera focus, adjustment CSS. 15.7's Gaussian Blur plate is a CPU kernel (no filter). The six `986 C24` tests need WebGL → browser; node probe below. |
| C27 movers without the expand plate | FIXED | v17.14 | `moverSource` in Shake, Swing, Spin, Pulse, Trail, Scatter Array; 14.5's Copy size / turn and Scatter Drift / Spin pass their matrices to it, a timed Trail copy renders from `expand.at`. Node (with a 2D DOMMatrix in the harness): both `986 C27` tests PASS. |
| C39 Mirror sized from the project | FIXED | v17.14 | plate from `nestedPlate`; 10.6's Reflection angle / Repeat folds kept it. Node: `986 C39 …` PASS. |
| C40 Chroma Key Pro matte view alpha 255 | FIXED | v17.16 | Matte keeps the layer's own alpha; 12.1's View: On grey keeps it too. Node: `986 C40 …` PASS. |
| C41 Sharpen leaves an r-px border | FIXED | v17.14 | 15.2's finish Sharpen is the same kernel. Node: `986 C41 …` PASS. |
| C60 Find Edges / Emboss in plate px | FIXED | v17.16 | both take `ps`; 12.6 Line width and 12.7 Height are project px. Node: `986 C60 …` and `986 C60 review …` PASS. |

The rest of §C (C2, C5, C9–C16, C18, C52) is ticked in the same #986 entry; not re-audited here (audio and inspector).

### Node probes (fx-c scratch, not committed) — C22 and C24 measured on this tree, with a control

Soft canvas from fx-b15, plus a switch that makes `ctx.filter` silently ignored (his phone's class) and no WebGL.

- **C22**, a 50 % see-through square with Drop Shadow over grey: inside the square over its own shadow **160** (no shadow:
  192), the part with no shadow behind it unchanged (192), the shadow itself 64 on a 128 background. With the v17.14 fix
  reverted (`if(dsa>0) continue`) the same pixel reads 192 — the probe goes red.
- **C24**, error against the working filter as a share of the effect's own size: Halation 0.03, Compound Blur 0.01,
  Backfill 0.02, Liquid Glass 0.01 (CPU fallback). Control — the same dead filter with the site NOT asking: 0.50 / 1.00 /
  0.48 / 0.69, so the probe sees the bug. With Halation's `ctxFilterOK()` branch reverted it reads 0.50 and goes red.
  Motion Blur (Footage) was read, not probed (it needs frame history).

## The one fix: a second Pixelate on an adjustment layer (`3b69a52c`)

Not a §C item — found while checking the C4 shape across the file. `applyAdjustment` took the first enabled Pixelate
(`effs.find`), so a second Pixelate on an adjustment layer did nothing while its slider moved; on a clip each Pixelate is
its own pass. Now every enabled Pixelate runs, in stack order among themselves, where the first always ran.

- Test: `966 fx-c every Pixelate on an adjustment layer runs, as on a clip …` (tests.js, end of file, `{ item: '966' }`).
- **Red first** (node): on 6f1d90b1's js — *"the export: a second Pixelate (16) after Pixelate 4 on an adjustment layer
  changes 0 of 6144 px — it does nothing · a half-size preview: … 0 of 1536 px · zoomed in: … 0 of 6144 px"*. With the fix:
  PASS (6144 / 1536 / 6112 px change).
- One Pixelate on an adjustment layer hashes the same on both trees at scale 1, 0.5 and zoomed (`db441bc5` / `3fc2ddc5` /
  `a33a29c5`). The 28 nearby adjustment-layer / Pixelate tests print the same output in node on both trees, word for word
  and hash for hash (11 pass, incl. `690 zooming into the preview leaves an adjustment layer Pixelate …`; 17 cannot pass in
  node — audio, WebGL, DOM seams, or picture hashes pinned from Chrome on the Mac).
- compositor.js `?v=219`. No registry param changed, so the collab SCHEMA_FP does not move.

## Still needs a browser

- The new `966 fx-c` test in the real suite, desktop and `WIDTH=380`.
- C24's GPU half: the six `986 C24 …` tests need WebGL (FM.glColor). Node covered only the CPU fallback.
- `986 C22` (the text seam: fillText), `986 C8 … not its Glow or its own shadow` (drop-shadow filter), `986 C17` and the
  other audio tests: not runnable in node. Nothing in this branch touches their code.

## Questions (not done — each is a look or a scope call)

1. **backlog.md §C reads as open but is closed.** One line under its header — "all 26 closed by #986 (v17.14 / v17.16);
   audited on the effects tree in plans/fx-c/NOTES.md" — would stop the next agent re-auditing it. Left alone: plans/ is
   the logging chat's.
2. **Pixelate on an adjustment layer always runs after the colour grades**, whatever its row; on a clip it runs in row
   order. Kept as it was, because moving it changes how saved projects look. Change it?
3. **Night Vision's grain re-rolls at a fixed 30 a second** (C6's second half). Film Grain got a Speed control in polish
   1.1; Night Vision could get the same. A look, so not done.
4. **Magnify (background): only the first one on a layer counts** (`copyBgZoom` uses `.find`). Probably right — two
   magnifiers on one layer have no obvious meaning — but it is the same shape as C4.
