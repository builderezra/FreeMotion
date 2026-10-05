# Twenty ready-made FreeMotion templates

Design only; no app files were changed. I searched the template feature in `REQUESTS.md` and `audits/*.json`. This proposal avoids duplicating a recorded defect or existing built-in starter collection: it adds a curated pack concept using the current layer model and controls only.

## What the current template system can express

- Home shows template cards with name, duration and aspect, and the card menu offers **New project from template** (`js/home.js:1979-1991`, `js/home.js:1996-2004`). Packs can be edited in place or used to make a new project (`js/home.js:2012-2030`, `js/storage.js:3220-3244`).
- A fillable template can expose visible `video`/`image` media, `text` copy and `shape` colours (`js/template-fill.js:46-57`: `if (l.type === 'video' || l.type === 'image') return 'media';`, `if (l.type === 'text') return 'text';`, `if (l.type === 'shape') return 'shape';`). Media replacement retains transform, keyframes, timing, effects and masks (`js/template-fill.js:8-10`).
- Base layer types and styling fields are already supported (`js/scene.js:24-27`, `js/scene.js:681-748`). Keyframes use `{kf:[{t, v, e}]}` in project seconds; only fields already evaluated by the compositor are used below. Effects must be existing registry entries from `js/compositor.js:51-...`, and effect instances use `{type, enabled, params}` (also shown in `tests/tests.js:243`, `11489`).
- Recipe shorthand: `V` = replaceable video layer, `I` = replaceable image, `T` = editable text layer, `S` = editable shape layer. All positions `(x,y)` are pixel offsets from the composition centre; `start/duration` are seconds. Unless keyframes are specified, transform is static `(0,0,1,0,1)` = x, y, scale, rotation, opacity. Text style is `size / colour / bold / align / wrapWidth`; font family is `Inter, sans-serif`. “No FX” means an empty `effects` array. Shapes use existing `rect`, `ellipse` or `line` shapes and set `fill`, `shapeW`, `shapeH`, `cornerRadius`. Effects shorthand below maps arguments by the current registry: `vignette(a,s)` means `{type:"vignette", enabled:true, params:{amount:a,size:s}}`; `saturate(a)`, `contrast(a)` and `blur(r)` mean their existing `amount` or `radius` parameter. Arrow pairs on a scale/opacity/x describe two endpoint keyframes in `transform.<property>.kf`, at the listed project seconds, with `easeInOut` unless another easing is named. These are recipes for pack authors, not new engine features.

## Ranked by expected everyday use

### 1. Scroll Stop — short-form hook

**Purpose:** A fast opening card that lets a creator put the first sentence over their own footage. **Ratio/length:** 9:16 (1080×1920), 7 s. **Recipe:** `V 0–7, (0,0), scale 1, fx saturate(amount 1.12) + vignette(amount .28,size 42); T “WAIT FOR IT” 0–2.4, (0,-420), 92/#fff/bold/center/850, opacity kf 0s:0 → .25s:1 → 2.4s:0 easeOut; S rect 0–2.4, (0,-420), 900×170, #101827, cornerRadius 28, opacity .72; T “your hook goes here” 2.5–7, (0,610), 56/#fff/normal/center/900, opacity kf 2.5s:0 → 2.8s:1.` Swap the video and both lines; set the accent plate colour. The immediate headline earns attention while the lower prompt leaves the subject visible.

### 2. Three Frame Story — photo slideshow

**Purpose:** Turn three favorite images into a compact story with captions. **Ratio/length:** 9:16, 12 s. **Recipe:** `I1 0–4, (0,0), scale 1.04→1.10 over 0–4 easeInOut, fx vignette(.32,45); I2 4–8, (0,0), scale .98→1.06 over 4–8; I3 8–12, (0,0), scale 1.06→1 over 8–12; S rect 0–12, (0,720), 980×300, #07121d, radius 34, opacity .66; T “A little moment” 0–12, (0,685), 54/#fff/bold/center/880.` Swap three images and the caption. The slow scale drift makes still photos feel intentional without needing transitions the app does not have.

### 3. New Arrival — product promo

**Purpose:** A clean first-look product clip for a shop or creator brand. **Ratio/length:** 9:16, 10 s. **Recipe:** `V 0–10, (0,0), fx contrast(amount 1.08) + vignette(.24,40); S rect 0–10, (0,625), 940×360, #101923, radius 36, opacity .78; T “NEW DROP” 0–3, (0,525), 82/#ffffff/bold/center/850, scale kf 0s:.86 → .35s:1 easeOut; T “Name · price · one reason to care” 3–10, (0,680), 48/#fff/normal/center/860; S ellipse 0–10, (390,-720), 170×170, #ffd166, no FX.` Replace footage, heading, offer and badge colour. The product stays central and copy remains inside a high-contrast plate.

### 4. Line by Line — lyric video

**Purpose:** Present a short lyric excerpt or spoken quote with readable beat-by-beat lines. **Ratio/length:** 9:16, 15 s. **Recipe:** `V 0–15, (0,0), fx blur(radius 3) + saturate(.72); S rect 0–15, (0,0), 1080×1920, #07111c, opacity .30; T line 1 0–5, (0,-90), 66/#fff/bold/center/900, opacity 0s:0→.25s:1→4.7s:1→5s:0; T line 2 5–10, (0,-90), same style, opacity 5s:0→5.25s:1→9.7s:1→10s:0; T line 3 10–15, same position/style, opacity 10s:0→10.25s:1→14.8s:1.` Swap the three text layers and background clip. Separate timed layers are simple to edit and do not depend on an unlisted auto-caption feature.

### 5. Keep This — quote card

**Purpose:** Share a memorable thought in a polished vertical card. **Ratio/length:** 4:5 (1080×1350), 8 s. **Recipe:** `S rect 0–8, (0,0), 930×1120, #182641, radius 48; T “A good sentence belongs here.” 0–8, (0,-35), 68/#fff/bold/center/760, scale 0s:.94→.5s:1 easeOut; T “— name / source” 1–8, (0,410), 34/#a9d6e8/normal/center/720; S ellipse 0–8, (-410,-480), 150×150, #71d6c3.` Replace quote, source and two colours. Strong hierarchy and generous margins keep it legible in a feed.

### 6. Daily Cut — vlog title

**Purpose:** A reusable creator nameplate for the start of a vlog. **Ratio/length:** 16:9 (1920×1080), 6 s. **Recipe:** `V 0–6, (0,0), fx saturate(1.10); S rect 0–6, (-390,285), 820×210, #101827, radius 20, opacity .88; T “A DAY IN [PLACE]” 0–6, (-390,260), 58/#fff/bold/left/740, x kf 0s:-520→.45s:-390 easeOut; T “with [creator]” 0–6, (-390,340), 32/#9be8dc/normal/left/740, opacity .3s:0→.6s:1.` Replace footage/place/name. The lower-left card leaves faces and landscape unobstructed.

### 7. The Play — sports highlight

**Purpose:** Frame a goal, dunk, race finish or personal best with a scoreboard-style overlay. **Ratio/length:** 9:16, 12 s. **Recipe:** `V 0–12, (0,0), fx contrast(1.12) + saturate(1.18); S rect 0–12, (0,-740), 920×230, #101923, radius 28, opacity .86; T “[HOME]  2 : 1  [AWAY]” 0–12, (0,-740), 46/#fff/bold/center/850; T “THE MOMENT” 3–7, (0,450), 76/#ffe066/bold/center/900, scale 3s:.75→3.35s:1 easeOut; S rect 3–7, (0,560), 700×10, #ffe066.` Swap clip, teams, score and accent. One bold score plus a timed callout gives context without covering the key action.

### 8. Two Takes — meme layout

**Purpose:** Make a simple reaction meme with editable top and bottom lines. **Ratio/length:** 9:16, 8 s. **Recipe:** `V 0–8, (0,0), fx saturate(.85); S rect 0–8, (0,-770), 1080×360, #080b12, opacity .72; S rect 0–8, (0,770), 1080×360, #080b12, opacity .72; T “WHEN YOU EXPECT…” 0–8, (0,-770), 54/#fff/bold/center/940; T “…AND GET THIS” 0–8, (0,770), 54/#fff/bold/center/940.` Swap clip and both captions. Fixed top/bottom bands make the format readable over bright footage.

### 9. Birthday Loop — personal greeting

**Purpose:** A warm animated greeting that is easy to personalize. **Ratio/length:** 9:16, 12 s. **Recipe:** `I 0–12, (0,0), scale 1.02→1.08; S ellipse 0–12, (-370,-720), 210×210, #ff6b8a; S ellipse 0–12, (370,-610), 170×170, #ffd166; S rect 0–12, (0,570), 960×430, #18213a, radius 42, opacity .84; T “HAPPY BIRTHDAY” 0–12, (0,475), 76/#fff/bold/center/900, scale 0s:.86→.4s:1 easeOut; T “[NAME] — your year starts now” 1–12, (0,650), 42/#ffe7a0/normal/center/850.` Replace image, name and balloon colours. The photo remains the emotional focus; the two simple shapes add celebration without relying on particle effects.

### 10. Split Timeline — before and after

**Purpose:** Show a transformation or progress comparison. **Ratio/length:** 9:16, 10 s. **Recipe:** `I “before” 0–10, (-270,0), scale .72; I “after” 0–10, (270,0), scale .72; S rect divider 0–10, (0,0), 12×1220, #fff; S rect 0–10, (-270,-600), 460×100, #121a28, radius 18, opacity .8; T “BEFORE” 0–10, (-270,-600), 42/#fff/bold/center/420; S rect + T duplicate at x=270 labelled “AFTER”.` Replace images, labels and divider colour. Matching image sizes and clear labels make the change understandable at a glance.

### 11. Mic Check — podcast clip card

**Purpose:** Give a square podcast excerpt a recognizable, caption-ready frame. **Ratio/length:** 1:1 (1080×1080), 20 s. **Recipe:** `V 0–20, (0,0), fx blur(1.5) + vignette(.4,45); I 0–20, (0,-250), scale .52; S rect 0–20, (0,290), 940×420, #101827, radius 34, opacity .92; T “[GUEST] on [SHOW]” 0–20, (0,175), 42/#87e8d6/bold/center/850; T “Add the best quote as a short caption.” 0–20, (0,320), 44/#fff/bold/center/820; S1–S7 bars 0–20 at `(x,y)` = `(-350,560),(-250,560),(-150,560),(-50,560),(50,560),(150,560),(250,560)`, each 24px wide, heights `84,142,180,110,166,96,152`, fill `#75dbc8`, no FX. Replace portrait/logo/photo and words; optionally hand-key a few bar heights. The bars are decorative only: this design does **not** claim audio-reactive waveform behavior.

### 12. Postcard Run — travel montage

**Purpose:** Label a destination and stitch a few travel clips into a mini-postcard. **Ratio/length:** 9:16, 15 s. **Recipe:** `V1 0–5, (0,0), fx saturate(1.12); V2 5–10, (0,0), same; V3 10–15, (0,0), same; S rect 0–15, (0,770), 960×260, #07121d, radius 28, opacity .76; T “[CITY] / [COUNTRY]” 0–15, (0,705), 48/#fff/bold/center/900; T “three moments, one place” 0–15, (0,805), 30/#d3e8ef/normal/center/850.` Swap clips, city and subtitle. A continuous location bar ties otherwise different scenes together.

### 13. Doors Open — event countdown

**Purpose:** Announce a stream, launch or ticket drop with a simple 3–2–1 rhythm. **Ratio/length:** 9:16, 10 s. **Recipe:** `V 0–10, (0,0), fx contrast(1.12) + vignette(.35,42); S rect 0–10, (0,0), 1080×1920, #07111c, opacity .26; T “3” 0–2.5, (0,-80), 260/#fff/bold/center/800, scale 0s:.65→.2s:1 easeOut; T “2” 2.5–5, same; T “1” 5–7.5, same; T “WE’RE LIVE” 7.5–10, (0,-80), 112/#77e5d1/bold/center/880, opacity 7.5s:0→7.8s:1; T “[DATE · TIME]” 0–10, (0,520), 42/#fff/normal/center/900.` Replace background/date/announcement. The deliberate blocks are reliable in the current text/layer model and easy to retime.

### 14. Three Steps — tutorial tip

**Purpose:** Explain one small task in three quick steps. **Ratio/length:** 9:16, 15 s. **Recipe:** `V 0–15, (0,0), fx saturate(.82); S rect 0–15, (0,640), 1000×460, #0b1422, radius 34, opacity .9; T “1  [FIRST STEP]” 0–5, (0,500), 44/#fff/bold/center/900; T “2  [SECOND STEP]” 5–10, same; T “3  [THIRD STEP]” 10–15, same; S line 0–15, (0,740), 700×8, #71d6c3.` Replace clip and three instructions. A fixed text area preserves contrast and keeps the visual demonstration behind it.

### 15. Kitchen Notes — recipe card

**Purpose:** Put ingredients and a finished dish into one short vertical recipe. **Ratio/length:** 9:16, 18 s. **Recipe:** `V1 “prep” 0–6, (0,0); V2 “cook” 6–12, (0,0); V3 “serve” 12–18, (0,0); all video layers fx saturate(1.12); S rect 0–18, (0,660), 1000×500, #111923, radius 32, opacity .88; T “[DISH NAME]” 0–18, (0,475), 54/#ffe4a3/bold/center/900; T “[3–5 ingredients or one tip]” 0–6, (0,680), 38/#fff/normal/center/900; T “[time · servings]” 0–18, (0,845), 30/#c9e9e4/normal/center/850.` Swap footage, dish and ingredient text. The short line count avoids tiny type on phones.

### 16. Weekend Deal — sale announcement

**Purpose:** Give a product or service a clear, time-limited offer. **Ratio/length:** 4:5, 10 s. **Recipe:** `V 0–10, (0,0), fx contrast(1.08); S rect 0–10, (0,560), 940×620, #101827, radius 40, opacity .9; T “[BRAND]” 0–10, (0,320), 40/#8de2d1/bold/center/850; T “SAVE 20%” 0–10, (0,500), 104/#fff/bold/center/850, scale 0s:.82→.35s:1 easeOut; T “until [DATE]” 0–10, (0,640), 42/#ffe08a/normal/center/850; T “Use code [CODE]” 0–10, (0,790), 36/#fff/normal/center/850.` Replace footage, offer, date, code and brand. Offer, deadline and code have separate editable text slots.

### 17. Tiny Tour — app or product feature demo

**Purpose:** Show three features of an app, gadget or service. **Ratio/length:** 9:16, 12 s. **Recipe:** `V1 0–4, (0,0), fx saturate(.85); V2 4–8, (0,0), same; V3 8–12, (0,0), same; S rect 0–12, (0,700), 960×360, #101827, radius 30, opacity .9; T “FEATURE 1 / 2 / 3” 0–4 / 4–8 / 8–12, (0,590), 36/#7fe6d4/bold/center/850; T “[one short benefit]” same timing, (0,720), 50/#fff/bold/center/850.` Replace screen recordings, feature numbers and benefits. Three self-contained beats are easy to update when the product changes.

### 18. Save the Date — event invitation

**Purpose:** Make a shareable vertical invite for a party, show or community event. **Ratio/length:** 9:16, 12 s. **Recipe:** `I 0–12, (0,0), scale 1.03→1.08, fx vignette(.36,42); S rect 0–12, (0,0), 1080×1920, #07111c, opacity .34; T “[EVENT NAME]” 0–12, (0,-420), 78/#fff/bold/center/900, opacity 0s:0→.4s:1; T “[DATE] · [VENUE]” 0–12, (0,30), 44/#9ce8d9/normal/center/900; T “[TICKET OR RSVP DETAILS]” 0–12, (0,580), 36/#fff/normal/center/850.` Swap photo, title, date and details. Clear text blocks preserve the invitation details while the photo provides atmosphere.

### 19. Clutch Moment — gaming highlight

**Purpose:** Package a win, combo or record as a landscape gaming clip. **Ratio/length:** 16:9, 8 s. **Recipe:** `V 0–8, (0,0), fx contrast(1.15) + saturate(1.12); S rect 0–8, (0,390), 1500×220, #090d18, opacity .8; T “ROUND WON” 0–8, (0,350), 70/#fff/bold/center/1350, scale 0s:.8→.25s:1 easeOut; T “[PLAYER] · [SCORE]” 0–8, (0,445), 38/#7de5d2/normal/center/1300; S ellipse 0–8, (790,-410), 110×110, #ff5577.` Swap gameplay, player and score. A bold lower-third lets the action remain the star.

### 20. Thanks for Watching — clean outro

**Purpose:** End a tutorial or creator video with a consistent follow/subscription prompt. **Ratio/length:** 16:9, 6 s. **Recipe:** `V 0–6, (0,0), fx blur(1.2) + vignette(.32,44); S rect 0–6, (0,0), 1920×1080, #08111e, opacity .34; T “Thanks for watching” 0–6, (0,-110), 78/#fff/bold/center/1400, opacity 0s:0→.45s:1; T “Follow for more [TOPIC]” 0–6, (0,40), 44/#a4eadc/normal/center/1300; S rect 0–6, (0,180), 520×8, #a4eadc.` Swap topic and optional background. The quiet ending gives the viewer a clear next action without a busy call-to-action screen.

