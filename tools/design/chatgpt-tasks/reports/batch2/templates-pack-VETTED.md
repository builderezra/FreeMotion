# Template pack: checked against the current code (1 Oct 2026)

This file checks `templates-pack.md`, which ChatGPT wrote against snapshot 28104a3e (v17.21). It designs 20 templates.
The tree checked is the working tree at v17.22. Line numbers are from that tree, so they can differ by a few lines from HEAD where `js/` is dirty.

**This is a design record, not a build order.** Each template needs his picture-pick (#545) before it is built. Six are named at the end to render first.
Nothing here was run in a browser. Every finding comes from reading the code, and the layout bounds were checked with a small JXA script. Rendering the six options is the first real test.

## Verdict in one paragraph

**None of the 20 is impossible. None can be built exactly as written either**, because four mistakes run through all of them (G1 to G4 below). Once those four are corrected:
- **9 are READY**: 4, 5, 7, 9, 12, 14, 18, 19 and 20.
- **11 need specific fixes**: 1, 2, 3, 6, 8, 10, 11, 13, 15, 16 and 17.
- Two of the fixes are serious:
  - **#16 is laid out for the wrong frame.** It was drawn in 9:16 coordinates on a 4:5 canvas, so the plate and the promo-code line fall off the bottom.
  - **#11's bars sit outside its 1:1 frame.**

There is also one gap outside the recipes. **The app has no way to ship a pack of templates.** Templates exist only once someone saves them on their own device. A `.fmotion.json` template file imports as a *project*, not as a template. So delivering "20 built-in templates" is a feature that still has to be built (§D).

## A. ChatGPT's claims: what held up

Held up:
- Its anchors are right:
  - templateCard is at `js/home.js:1979`, its menu is at 1996–2008, and tap-to-edit is at 2012–2030.
  - `kindOf` is at `js/template-fill.js:46`.
  - The keyframe shape `{kf:[{t,v,e}]}` is at `js/scene.js:24–27`.
  - makeLayer is at `js/scene.js:681` and later.
  - The effect instance shape `{type, enabled, params}` is at `tests/tests.js:243`.
- Every effect it uses exists with the parameter it names, at `js/compositor.js`:
  - `blur.radius` 0–50 px (51)
  - `contrast.amount` 0–3 (53)
  - `saturate.amount` 0–3 (54)
  - `vignette.amount` 0–1 and `size` 0–95 % (67)
- Every value it gives is in range.
- The layer fields exist: `wrapWidth`, `bold`, `align`, `shape` rect/ellipse/line, `shapeW/H`, `fill` and `cornerRadius` (`js/scene.js:722–740`, `js/compositor.js:16343`).
- The eases `easeOut` and `easeInOut` exist (`js/scene.js:31–33`).
- Keyframe times are absolute project seconds, and a clip move shifts them (`js/scene.js:546`).
- Avoiding caption tracks was right, although ChatGPT gave the wrong reason (see G5).

Wrong or missing:
1. **"Positions are offsets from the centre; transform (0,0,1,0,1)" is wrong (G1).**
2. **Media "scale 1 / .72 / 1.04" has no fixed meaning (G2).**
3. **It never says which layer sits on top (G3).**
4. **"Without needing transitions the app does not have" is half true.** There is no transition system, but two clips can overlap with an opacity crossfade. Dispersion (`js/compositor.js:1544`) is also a keyframed reveal. It did not affect any recipe.
5. **The podcast bars: "does not claim audio-reactive behaviour" misses a feature we already have.** Audio Drive (`js/behaviors.js:65`) moves scale, position or opacity from a clip's loudness. Its source is remapped when a template is used (`js/storage.js:2049` reIdLayers). The envelope is cached on the media record (`js/audio-react.js:259`), so after a swap it follows *his* clip. #11 now uses it.
6. **Its reach claims were not checked.** The ranking below is my own and is ordered by how broad the use is, the same way ChatGPT ordered it.

## B. Global fixes: these apply to all 20, and the corrected recipes in §C already include them

- **G1. x/y are absolute project pixels with the origin at the top-left.**
  - New layers are placed at `P.width/2, P.height/2` (`js/app.js:3058`, `3140`, `3210`), and applyLayerTransform reads x/y as they are (`js/compositor.js:15222`).
  - Built literally, ChatGPT's "(0,0)" puts every layer's centre in the top-left corner.
  - Every recipe in §C uses absolute coordinates. The frame centres are:
    - 9:16 1080×1920: (540,960)
    - 4:5 1080×1350: (540,675)
    - 1:1 1080×1080: (540,540)
    - 16:9 1920×1080: (960,540)
- **G2. A media layer's size is the file's pixel size times `scale`.**
  - Import sets `scale` to contain-fit (`js/app.js:3059–3060`). A swap multiplies every scale keyframe so the new file fits *inside* the old box (`fitReplacedMedia`, `js/app.js:4698`). That keeps the Ken Burns ratios.
  - Rule: **make each placeholder a still image exactly the pixel size of its box.** For example, use 1080×1920 for a full 9:16 background and 520×1220 for half of a before/after. Then `scale 1` means "fills the box", and ChatGPT's 1.04→1.10 numbers can be used as written.
  - Consequence, from the code and not tested on a device: **a landscape clip swapped into a portrait slot is letterboxed, not cropped.** Set each template's project background (`js/scene.js:657`, default #000) to its own dark tone so the bars look intentional.
  - The editor's "Fill Composition Area" (`js/app.js:7020`) writes a single scale key at the playhead, which flattens a Ken Burns. A "Fill frame" switch on the swap sheet would be its own request. It is not built.
- **G3. `layers[0]` is the TOP layer** (`js/compositor.js:17776`). Every §C recipe is listed **top to bottom**: text above its plate, plate above the media.
- **G4. Text size is `fontSize`, not "size"** (`js/scene.js:722`). The family is the default `Inter, sans-serif` from the font list (`js/text-edit.js:206`). Inter is not bundled, so a phone draws its system sans. That matches every other text layer.
- **G5. Every visible text, shape, image and video layer becomes a numbered slot** (`js/template-fill.js:46–58`). Slots are sorted by start time, and the chips are 84 px wide (`styles.css:9353`), so about 4 fit across a 380 px phone.
  - Three rules follow:
    - **Keep templates to 6 slots or fewer.**
    - **Dim the footage with an adjustment layer carrying Brightness instead of a full-frame dark rectangle.** An adjustment layer is not a slot, and Brightness is allowed on adjustment layers (`js/fx-registry.js:171`).
    - **Keep Vignette on the media layer.** It is not allowed on adjustment layers (same list).
  - **Never use a caption track.** The "Your words" box writes `layer.text` (`js/template-fill.js:225`), but a caption layer draws `captions[]` instead (`js/compositor.js:17407`). Typing would change nothing.
  - **Use `wrapWidth` for line breaks, never typed newlines.** The box is a single-line `<input>` (`js/template-fill.js:217`), which strips them.
- **G6. A video slot gets shorter when his clip is shorter** (`js/app.js:4677`). A 3 s clip in a 7 s slot leaves 4 s of background under the text. This is acceptable with G2's background colour. Write it on the template card ("best with clips 7 s or longer").
- **G7. Prefer the text entrance presets (`textAnim`) to hand-made opacity and scale keyframes.** They run from the layer's own start (`js/compositor.js:3027`), so they survive retiming. The presets are fade, fade-up, pop, slide, drop, spin, zoom-out, stretch, wave and jitter (3053–3063). Keyframes are kept below where ChatGPT gave exact timings.
- **A line shape is stroked.** Its colour is `fill`, and its thickness is the border width `stroke.width` (default 8), not `shapeH` (`js/compositor.js:16308`, `17539`).

## C. The templates, ranked, with corrected recipes

Shorthand:
- **V** = video slot, **I** = image slot, **T** = text, **S** = shape, **ADJ** = adjustment layer (not a slot).
- Positions are absolute centres.
- `fx` uses the registry names, for example `vignette(amount .28, size 42)`.
- Keyframe times are project seconds.
- A text style is written `fontSize / colour / bold / align / wrapWidth`.

### 1. Scroll Stop (short-form hook): NEEDS FIXES, now fixed
9:16, 7 s, background #101827. **4 slots.**
- Two fixes:
  - The headline faded out over the whole 0.25 → 2.4 s instead of holding. It now holds and then fades.
  - The plate cut off abruptly while its text faded. It now fades with the text.
- The bottom line had no plate and needs a stroke to read over bright footage.

Layers, top to bottom:
1. T "WAIT FOR IT", 0–2.4, (540,540), 92/#fff/bold/center/850. Opacity 0:0 → .25:1 → 2.1:1 → 2.4:0.
2. S rect, 0–2.4, (540,540), 900×170, #101827, radius 28. Opacity 0:0 → .25:.72 → 2.1:.72 → 2.4:0.
3. T "your hook goes here", 2.5–7, (540,1570), 56/#fff/normal/center/900. Stroke on, 6, #000. textAnim fade-up, durIn .3.
4. V, 0–7, (540,960), 1080×1920 placeholder. fx saturate(1.12), vignette(.28, 42).

### 2. Three Frame Story (photo slideshow): NEEDS FIXES, now fixed
9:16, 12 s. **5 slots.**
- Three fixes:
  - Only I1 had the vignette, so it is now on all three.
  - I2 started at scale .98, which shows the background edge. It now starts at 1.00.
  - The placeholders follow G2.
- Optional: overlap each pair by 0.4 s with an opacity crossfade.

Layers, top to bottom:
1. T "A little moment", 0–12, (540,1645), 54/#fff/bold/center/880.
2. S rect, 0–12, (540,1680), 980×300, #07121d, radius 34, opacity .66.
3. I3, 8–12, scale 8:1.06 → 12:1.00 easeInOut.
4. I2, 4–8, scale 4:1.00 → 8:1.06.
5. I1, 0–4, scale 0:1.04 → 4:1.10.

The three images are 1080×1920 placeholders at (540,960), each with vignette(.32, 45).

### 3. New Arrival (product promo): NEEDS FIXES, now fixed
9:16, 10 s. **6 slots, or 4 without the badge.**
- Two fixes:
  - The plate sat half-empty from 0 to 3 s, so both lines now run the whole time.
  - The yellow badge had nothing in it, so it now says NEW. It can also be dropped.

Layers, top to bottom:
1. T "NEW DROP", 0–10, (540,1485), 82/#fff/bold/center/850. textAnim pop, durIn .35.
2. T "Name · price · one reason to care", 0.3–10, (540,1640), 48/#fff/normal/center/860.
3. T "NEW", 0–10, (930,240), 40/#101923/bold/center/0.
4. S ellipse, 0–10, (930,240), 170×170, #ffd166.
5. S rect, 0–10, (540,1585), 940×360, #101923, radius 36, opacity .78.
6. V, 0–10, full-frame placeholder. fx contrast(1.08), vignette(.24, 40).

### 4. Line by Line (lyric or quote lines): READY (one improvement made)
9:16, 15 s. **4 slots.** ChatGPT's full-frame dark rectangle is replaced by an ADJ, which removes one slot.

Layers, top to bottom:
1. T line 3, 10–15, (540,870), 66/#fff/bold/center/900. Opacity 10:0 → 10.25:1.
2. T line 2, 5–10, (540,870), same style. Opacity 5:0 → 5.25:1 → 9.7:1 → 10:0.
3. T line 1, 0–5, (540,870), same style. Opacity 0:0 → .25:1 → 4.7:1 → 5:0.
4. ADJ, 0–15, brightness(.7).
5. V, 0–15, full-frame placeholder. fx blur(3), saturate(.72).

Note: a 3 px blur softens the outer few pixels of the frame. The fringe is about 6 px, so it is negligible, but this is not verified.

### 5. Keep This (quote card, text and shapes only): READY
4:5 (1080×1350), 8 s, background #0d1626. **4 slots.**
This exercises #619's text and colour slots, which is the kind of template he makes himself.

Layers, top to bottom:
1. T quote, 0–8, (540,640), 68/#fff/bold/center/760. Scale 0:.94 → .5:1 easeOut.
2. T "— name / source", 1–8, (540,1085), 34/#a9d6e8/normal/center/720.
3. S ellipse, 0–8, (130,195), 150×150, #71d6c3.
4. S rect, 0–8, (540,675), 930×1120, #182641, radius 48.

### 6. Daily Cut (vlog title): NEEDS FIXES, now fixed
16:9, 6 s. **4 slots.**

The fix: **left-aligned text starts at its x; it is not centred on it.** The compositor draws from x=0 with `textAlign` left (`js/compositor.js:17403`). The text was placed at the plate's centre, so it started halfway along and ran off the plate. Its 130 px x-keyframe slide also began outside the plate. It now starts 40 px inside the plate's left edge and uses the `slide` preset.

Layers, top to bottom:
1. T "A DAY IN [PLACE]", 0–6, (200,800), 58/#fff/bold/**left**/740. textAnim slide, durIn .45, unit line.
2. T "with [creator]", 0–6, (200,880), 32/#9be8dc/normal/left/740. Opacity .3:0 → .6:1.
3. S rect, 0–6, (570,825), 820×210, #101827, radius 20, opacity .88. It spans x 160–980.
4. V, 0–6, 1920×1080 placeholder. fx saturate(1.10).

### 7. The Play (sports score overlay): READY
9:16, 12 s. **5 slots.**

Layers, top to bottom:
1. T "[HOME]  2 : 1  [AWAY]", 0–12, (540,220), 46/#fff/bold/center/850.
2. S rect, 0–12, (540,220), 920×230, #101923, radius 28, opacity .86.
3. T "THE MOMENT", 3–7, (540,1410), 76/#ffe066/bold/center/900. Scale 3:.75 → 3.35:1 easeOut.
4. S rect, 3–7, (540,1520), 700×10, #ffe066.
5. V, 0–12, full frame. fx contrast(1.12), saturate(1.18).

### 8. Two Takes (top and bottom meme): NEEDS FIXES (minor), now fixed
9:16, 8 s. **5 slots.**
- The fix: the bands at ±770 left a 10 px gap at the frame edges. At y 180 and 1740 they now meet the edges.
- A 3-slot variant drops both bands and gives the text stroke on, 10, #000.

Layers, top to bottom:
1. T top, 0–8, (540,180), 54/#fff/bold/center/940.
2. T bottom, 0–8, (540,1740), same style.
3. S rect, 0–8, (540,180), 1080×360, #080b12, opacity .72.
4. S rect, 0–8, (540,1740), same.
5. V, 0–8, full frame. fx saturate(.85).

### 9. Birthday Loop (greeting): READY
9:16, 12 s. **6 slots.**

Layers, top to bottom:
1. T "HAPPY BIRTHDAY", 0–12, (540,1435), 76/#fff/bold/center/900. Scale 0:.86 → .4:1 easeOut.
2. T "[NAME] — your year starts now", 1–12, (540,1610), 42/#ffe7a0/normal/center/850.
3. S rect, 0–12, (540,1530), 960×430, #18213a, radius 42, opacity .84.
4. S ellipse, (170,240), 210×210, #ff6b8a.
5. S ellipse, (910,350), 170×170, #ffd166.
6. I, 0–12, full frame. Scale 0:1.02 → 12:1.08.

### 10. Split Timeline (before and after): NEEDS FIXES, now fixed
9:16, 10 s. **5 slots.**
- Two fixes:
  - "Scale .72" means nothing for media, so each half is now a 520×1220 placeholder at scale 1 (G2).
  - The two label plates took it to 7 slots. They are replaced by text stroke.
- A swapped photo fits inside its half. A 3:4 photo lands at about 520×693 with background above and below it.

Layers, top to bottom:
1. T "BEFORE", 0–10, (270,360), 42/#fff/bold/center/420. Stroke 6, #000.
2. T "AFTER", 0–10, (810,360), same style.
3. S rect divider, 0–10, (540,960), 12×1220, #fff.
4. I after, 0–10, (810,960), 520×1220 placeholder.
5. I before, 0–10, (270,960), 520×1220 placeholder.

### 11. Mic Check (podcast clip): NEEDS FIXES (major), now fixed
1:1, 20 s. **6 slots.**
- **The bars were off-frame.** In ChatGPT's layout they sit at y ≈ 1100 on a 1080-tall frame, they were off-centre on x, and seven of them made 12 slots.
- They are replaced by **one disc that pulses from his clip's own audio** (Audio Drive, see §A.5). That is the real "waveform", using a feature that already exists.
- It needs the V to have sound. A silent clip or a photo leaves the disc still.

Layers, top to bottom:
1. T "[GUEST] on [SHOW]", 0–20, (540,600), 42/#87e8d6/bold/center/850.
2. T quote, 0–20, (540,730), 44/#fff/bold/center/820.
3. S rect, 0–20, (540,690), 940×330, #101827, radius 34, opacity .92.
4. I portrait, 0–20, (540,250), 360×360 placeholder.
5. S ellipse, 0–20, (540,250), 400×400, #75dbc8, opacity .5. Its behaviour is `{type:'audio', prop:'scale', enabled:true, params:{sourceId:<V's id>, band:'overall', gain:1.5, amount:0.25, smooth:0.4}}`. Amount is in scale units, so .25 = +25 % (`js/behaviors.js:89`).
6. V, 0–20, 1080×1080 placeholder. fx blur(1.5), vignette(.4, 45).

Variant: five 24 px bars at x 340–740 with their base at y 1010, each driven on scale by a different band. That gives 10 slots, and a uniform scale widens the bars too, so it is not recommended.

### 12. Postcard Run (travel montage): READY
9:16, 15 s. **6 slots.**

Layers, top to bottom:
1. T "[CITY] / [COUNTRY]", 0–15, (540,1665), 48/#fff/bold/center/900.
2. T "three moments, one place", 0–15, (540,1765), 30/#d3e8ef/normal/center/850.
3. S rect, 0–15, (540,1730), 960×260, #07121d, radius 28, opacity .76.
4. V3, 10–15.
5. V2, 5–10.
6. V1, 0–5.

All three videos are full frame with fx saturate(1.12).

### 13. Doors Open (3-2-1 countdown): NEEDS FIXES, now fixed
9:16, 10 s. **6 slots.**
- Two fixes:
  - "2: same" and "1: same" had no keyframes of their own. Absolute keyframes do not copy across, so each number now uses the `pop` preset, which runs from that layer's own start.
  - The dark full-frame rectangle is replaced by an ADJ, which removes a slot.

Layers, top to bottom:
1. T "[DATE · TIME]", 0–10, (540,1480), 42/#fff/normal/center/900.
2. T "WE'RE LIVE", 7.5–10, (540,880), 112/#77e5d1/bold/center/880. textAnim fade, durIn .3.
3. T "1", 5–7.5.
4. T "2", 2.5–5.
5. T "3", 0–2.5.
6. ADJ, 0–10, brightness(.75).
7. V, full frame. fx contrast(1.12), vignette(.35, 42).

The three numbers all sit at (540,880), 260/#fff/bold/center/800, with textAnim pop, durIn .3.

Alternative: one Number Roll layer (`counter`, `js/compositor.js:920`) with hold-eased progress. That saves 2 slots, but the 3/2/1 then cannot be edited on the swap sheet.

### 14. Three Steps (tutorial tip): READY
9:16, 15 s. **6 slots.**
The text is moved down to 1540 so it sits in the plate's upper middle rather than its top edge. The line's thickness is `stroke.width` (8).

Layers, top to bottom:
1. T "1  [FIRST STEP]", 0–5, (540,1540), 44/#fff/bold/center/900.
2. T "2  [SECOND STEP]", 5–10, same position and style.
3. T "3  [THIRD STEP]", 10–15, same position and style.
4. S line, 0–15, (540,1700), shapeW 700, fill #71d6c3, stroke.width 8.
5. S rect, 0–15, (540,1600), 1000×460, #0b1422, radius 34, opacity .9.
6. V, 0–15, full frame. fx saturate(.82).

### 15. Kitchen Notes (recipe card): NEEDS FIXES, now fixed
9:16, 18 s. **7 slots, one over the guide. Accepted, because each slot is meaningful.**
The fix: the ingredients line ran from 0 to 6 s only, which left the middle of the plate empty for 12 s. It now runs the whole time.

Layers, top to bottom:
1. T "[DISH NAME]", 0–18, (540,1435), 54/#ffe4a3/bold/center/900.
2. T "[3–5 ingredients or one tip]", 0–18, (540,1640), 38/#fff/normal/center/900.
3. T "[time · servings]", 0–18, (540,1805), 30/#c9e9e4/normal/center/850.
4. S rect, 0–18, (540,1620), 1000×500, #111923, radius 32, opacity .88.
5. V3 "serve", 12–18.
6. V2 "cook", 6–12.
7. V1 "prep", 0–6.

All three videos are full frame with fx saturate(1.12).

### 16. Weekend Deal (sale): NEEDS FIXES (major), now fixed
4:5 (1080×1350), 10 s. **6 slots.**
**It was laid out in 9:16 offsets.** Taken from a 4:5 centre, the plate spanned y 925–1545 and the code line sat at y 1465, both below a frame that is 1350 tall. It has been re-laid inside the frame.

Layers, top to bottom:
1. T "[BRAND]", 0–10, (540,795), 40/#8de2d1/bold/center/850.
2. T "SAVE 20%", 0–10, (540,925), 104/#fff/bold/center/850. Scale 0:.82 → .35:1 easeOut.
3. T "until [DATE]", 0–10, (540,1055), 42/#ffe08a/normal/center/850.
4. T "Use code [CODE]", 0–10, (540,1175), 36/#fff/normal/center/850.
5. S rect, 0–10, (540,1005), 940×560, #101827, radius 40, opacity .9. It spans y 725–1285.
6. V, 0–10, 1080×1350 placeholder. fx contrast(1.08).

### 17. Tiny Tour (feature demo): NEEDS FIXES, now fixed
9:16, 12 s. **7 slots.**
The fix: separate "FEATURE n" labels made 10 slots, so the number now goes inside the benefit line.

Layers, top to bottom:
1. T "1 · [one short benefit]", 0–4, (540,1660), 50/#fff/bold/center/850.
2. T "2 · …", 4–8, same position and style.
3. T "3 · …", 8–12, same position and style.
4. S rect, 0–12, (540,1660), 960×360, #101827, radius 30, opacity .9.
5. V3, 8–12.
6. V2, 4–8.
7. V1, 0–4.

All three videos are full frame with fx saturate(.85). Phone screen recordings (about 9:19.5) land with thin side bars, per G2.

### 18. Save the Date (event invite): READY (one improvement made)
9:16, 12 s. **4 slots.** The dark rectangle is replaced by an ADJ.

Layers, top to bottom:
1. T "[EVENT NAME]", 0–12, (540,540), 78/#fff/bold/center/900. Opacity 0:0 → .4:1.
2. T "[DATE] · [VENUE]", 0–12, (540,990), 44/#9ce8d9/normal/center/900.
3. T "[TICKET OR RSVP DETAILS]", 0–12, (540,1540), 36/#fff/normal/center/850.
4. ADJ, 0–12, brightness(.7).
5. I, 0–12, full frame. Scale 0:1.03 → 12:1.08. fx vignette(.36, 42).

### 19. Clutch Moment (gaming highlight): READY
16:9, 8 s. **5 slots.**

Layers, top to bottom:
1. T "ROUND WON", 0–8, (960,890), 70/#fff/bold/center/1350. Scale 0:.8 → .25:1 easeOut.
2. T "[PLAYER] · [SCORE]", 0–8, (960,985), 38/#7de5d2/normal/center/1300.
3. S rect, 0–8, (960,930), 1500×220, #090d18, opacity .8.
4. S ellipse, (1750,130), 110×110, #ff5577.
5. V, 0–8, 1920×1080 placeholder. fx contrast(1.15), saturate(1.12).

### 20. Thanks for Watching (outro): READY (one improvement made)
16:9, 6 s. **4 slots.** The dark rectangle is replaced by an ADJ.

Layers, top to bottom:
1. T "Thanks for watching", 0–6, (960,430), 78/#fff/bold/center/1400. Opacity 0:0 → .45:1.
2. T "Follow for more [TOPIC]", 0–6, (960,580), 44/#a4eadc/normal/center/1300.
3. S rect, 0–6, (960,720), 520×8, #a4eadc.
4. ADJ, 0–6, brightness(.7).
5. V, 0–6, full frame. fx blur(1.2), vignette(.32, 44).

The JXA script confirmed that every plate, dot and image box above sits inside its frame.

## D. Before any of this is built: no way to ship a pack

- A template exists only as `fm.templates` plus a `tpl:<id>` record in IndexedDB on the device that saved it (`js/storage.js:3068`).
- "Save template file…" writes a `.fmotion.json` (`js/storage.js:3113`). Importing that file makes a **project**, so it reaches the Templates tab only after a second "Save as template".
- Shipping the 20 needs a decision from him: a one-time seed of built-in templates on first run, a "Get starter templates" button, or files he imports himself.
- Placeholders should be small stills, under about 300 KB each, because every pack carries its files. Export embeds media only up to 6 MB per file (`js/storage.js:944`).
- The swap sheet appears only through **⋯ → New project from template**. Tapping the card edits the template itself (`js/home.js:2012–2030`).
- #619's sheet is itself still marked *built out — waiting on him* to look at it.

## E. Names

- **No copying found.** Alight Motion has no fixed in-app catalogue of named templates; its templates are shared project links. CapCut's templates are made by users and number in the millions, so an exact check is impossible.
- A search found nothing for Scroll Stop, Clutch Moment, Mic Check or Daily Cut. The nearest was a CapCut user template called "Mic". All 20 names are ordinary English phrases.
- **Clashes inside our own app**, which matter more:
  - "Split Timeline" reads like the timeline's Split action.
  - "The Play" reads like the ▶ Play control.
  - "Daily Cut" reads like the Cut action, and "Cut" is also CapCut's brand word.
  - "Keep This" is vague and sits beside the many "Keep …" toggles.
- Effects-pack precedent was plain labels, so these renames are suggested (his choice):
  - Hook Intro
  - Photo Story
  - Product Drop
  - Lyric Lines
  - Quote Card
  - Vlog Title
  - Score Overlay
  - Top & Bottom Meme
  - Birthday Card
  - Before / After
  - Podcast Clip
  - Travel Postcard
  - Countdown
  - 3-Step Tip
  - Recipe Card
  - Sale
  - Feature Tour
  - Event Invite
  - Game Highlight
  - Outro

## F. Render these 6 first for his pick (#545)

They are chosen to cover all four frame shapes and all three slot kinds:
1. **#1 Scroll Stop / Hook Intro**: 9:16 video. This is the broadest use.
2. **#2 Three Frame Story / Photo Story**: images with Ken Burns. It also shows G2's letterbox case if one landscape photo is used.
3. **#5 Keep This / Quote Card**: 4:5, text and shapes only. This is the kind of template he makes himself, and it exercises #619's text and colour slots.
4. **#10 Before / After**: a two-image split, and the only side-by-side layout.
5. **#13 Countdown**: timed text with presets, and the most motion.
6. **#11 Podcast Clip**: 1:1 with the Audio Drive disc. It is the only one using a feature ChatGPT missed. Render it with a clip that has sound, or the disc stays still.

Render them through the app (`FM.renderScene` in a tests/ probe, as in the memory note *render the sheet through the app*), at 380 px as well. Show the swap sheet's slot row for each, because the slot count is part of what he is judging.
