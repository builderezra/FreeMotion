# FreeMotion accessibility review

Reviewed snapshot: branch `chatgpt/accessibility`, commit `28104a3e` (`v17.21`, 1 Oct 2026). The review covered the committed HTML, CSS, and JavaScript for Home, editor, dialogs, inspector, timeline and dynamic controls, with phone and PC breakpoints in view. I first searched `REQUESTS.md` and `audits/*.json`; previously recorded issues (including the #98 touch-target sweep, #809 Escape-through-overlay defect, #575 caption grip size, and already-fixed Home contrast issues) are excluded below. No app files were changed.

This is a source review, not a run with a screen reader or real keyboard/touch device. Ratios below are computed from the literal foreground/background hex colours using WCAG relative luminance; translucent overlays and video-dependent ink are excluded unless stated. For the light Home, ratios use its declared `#f4f6fa` ground; translucent card backdrops can shift them slightly. Findings about source markup/declared dimensions have high confidence; results that depend on actual browser focus rendering or zoom are marked **UNVERIFIED**.

## Findings, ranked by estimated reach

### 1. Timeline layer rows, clips and editing gestures cannot be operated from the keyboard

**Severity: high. Confidence: high.**

**Evidence:** `index.html:594` is only `<div id="tl-tracks"></div>`. Generated layer headers are plain divs with click selection (`js/timeline.js:1344-1347`, `1424-1428`):

> `const head = document.createElement('div');`
>
> `head.addEventListener('click', (e) => { ... FM.selectLayer(layer.id); });`

Generated clips are also divs and their editor gesture starts on pointer input (`js/timeline.js:2184-2193`):

> `clip.addEventListener('pointerdown', (e) => {`

There is no focusability, role, keyboard equivalent, or accessible representation of the row/clip in those builders. A keyboard-only user cannot Tab to a layer or clip to select/move/trim it; a screen reader cannot discover the generated timeline objects as controls. **Trigger:** open any project with a layer and navigate with Tab, or inspect the accessibility tree with a screen reader.

### 2. Keyframe diamonds have pointer-only interaction and no exposed value/state

**Severity: high. Confidence: high.**

**Evidence:** `js/timeline.js:2663-2675` creates each diamond as a `div`, sets only a hover title, and binds `pointerdown`:

> `dot.className = 'kf-dot ' + easeClass + ...;`
>
> `dot.title = entry.live ? 'Drag to retime · double-click to delete' : ...;`
>
> `dot.addEventListener('pointerdown', (e) => {`

The timeline keyframe position and time are not keyboard reachable or represented as a slider/grid item. **Trigger:** create a keyframe and try to focus, read, retime, or delete its diamond without a pointer. This blocks keyboard and screen-reader users from keyframe editing even when the rest of the inspector controls are usable.

### 3. Timeline scrubbing has no keyboard-operable playhead control

**Severity: high. Confidence: high.**

**Evidence:** the ruler, tracks and playhead are generic divs (`index.html:591-595`):

> `<div id="tl-rulerrow">...<div id="tl-ruler"></div></div>`
>
> `<div id="tl-tracks"></div>`
>
> `<div id="tl-playhead"></div>`

The scroller starts scrubbing from `pointerdown` (`js/timeline.js:5093-5098`):

> `timelineEl.addEventListener('pointerdown', (e) => {`

The time pill is keyboard-focusable, but its button action is play/pause, not a way to move the playhead. **Trigger:** try to seek to an arbitrary frame with keyboard only. Users who cannot drag or tap cannot navigate a clip frame by frame or to a chosen time through the timeline.

### 4. Full-screen dialogs are not announced as dialogs or marked modal

**Severity: high. Confidence: high.**

**Evidence:** the new-project, export, and canvas dialog roots are ordinary hidden divs with no dialog role, accessible name, or `aria-modal` (`index.html:711`, `837`, `957`):

> `<div id="hm-dialog" class="hidden">`
>
> `<div id="export-dialog" class="hidden">`
>
> `<div id="canvas-dialog" class="hidden">`

The export progress overlay is similarly a generic `div` (`index.html:792-795`). **Trigger:** open each surface using a screen reader. Focus may move into its controls, but assistive technology is not told that a named modal context opened, so users may not know what opened or that the background is unavailable. Static inspection confirms absent semantics; whether focus is trapped/restored in every route is **UNVERIFIED**.

### 5. Home’s navigation tabs do not expose which tab is selected

**Severity: medium. Confidence: high.**

**Evidence:** Home tabs are buttons without tablist/tab roles or selected-state attributes (`index.html:696-703`):

> `<div class="hm-tabs">`
>
> `<button class="hm-tab active" data-tab="projects">Projects</button>`

Selection changes only the CSS class (`js/home.js:2540`):

> `root.querySelectorAll('.hm-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));`

**Trigger:** Tab to Templates, Elements, or Tutorials and listen with a screen reader. The controls are reachable as buttons, but the active/current tab is not exposed as selected; users must infer it from subsequent content or visual styling.

### 6. Export progress and completion are not announced as live updates

**Severity: medium. Confidence: high.**

**Evidence:** the progress text has no live/status role (`index.html:792-795`):

> `<div id="export-status">Preparing…</div>`

The bar is updated repeatedly by text replacement (`js/app.js:6168-6170`):

> `status.textContent = verbatim ? what : 'Encoding ' + what + '… ' + Math.round(p * 100) + '%';`

**Trigger:** start an export with a screen reader. Progress and the final “Done” message are visually updated but are not exposed as a live region, so a user cannot tell whether a long export is progressing or finished without repeatedly querying the page.

### 7. PC layer-selection count is not announced when it changes

**Severity: medium. Confidence: high.**

**Evidence:** the PC count is created as a plain span (`js/app.js:7676`):

> `const sel = document.createElement('span'); sel.id = 't-sel';`

Selection refresh writes updated text to the phone live region and the PC span (`js/app.js:1025-1032`), but only the phone element has `aria-live="polite"` (`index.html:344`):

> `if (cnt) cnt.textContent = phone ? (n + ' selected') : ...;`

**Trigger:** on PC, enter multi-select and add/remove layers. The count changes visually but is not announced as a live update; the same feature already has a polite live region on phone.

### 8. Ordinary toast messages have no status/live semantics

**Severity: medium. Confidence: high.**

**Evidence:** the toast is an empty div (`index.html:638`):

> `<div id="toast" class="hidden"></div>`

`FM.toast` updates it with `textContent` and explicitly removes its role unless it is an actionable button (`js/app.js:1393-1399`):

> `t.textContent = msg;`
>
> `t.removeAttribute('role'); t.removeAttribute('tabindex');`

**Trigger:** perform an action whose confirmation or error is only a toast (for example toggling a preference or a transient operation). A screen-reader user receives no automatic announcement for these routine results. The separate actionable toast path is not the issue here.

### 9. Custom effect and volume scrubbers are pointer-only, without slider semantics

**Severity: high. Confidence: high.**

**Evidence:** every inspector scrubber is built as a `div` (`js/inspector.js:898-900`):

> `const strip = el('div', 'fx-scrub');`

Its value changes from pointer input (`js/inspector.js:1016-1024`):

> `strip.addEventListener('pointerdown', (e) => {`

No role, tab stop, value or keyboard handler is added before return (`js/inspector.js:1074-1076`). **Trigger:** open an effect or audio-volume inspector and try to focus and adjust its ruler with Tab/arrow keys or a screen reader. Numeric entry beside some sliders is a partial alternative but is not equivalent for all ranges, keyframing, or scrub-only rows.

### 10. Small “faint” text misses normal-text contrast in the dark editor and glass theme

**Severity: medium. Confidence: high for the specified solid-color surfaces.**

**Evidence:** dark theme uses `--text-faint: #59647a` against panel backgrounds such as `--panel-2: #1e2533` (`styles.css:12-18`); glass uses `#63808c` against `--panel-2: #0f1e26` (`theme-glass.css:31-38`). Many labels use this token, for example `.empty` and `.cat-num` (`styles.css:1037`, `1122`).

Computed WCAG contrast ratios: dark body text `#eef2f8` / background `#0e1320` = **16.50:1** and dim text `#8b96a8` / background = **6.20:1** (pass); dark faint text on panel `#1e2533` = **2.58:1** (fail). Glass body text `#e9f4f7` / `#060c0f` = **17.57:1** and dim text `#93aeb9` / ground = **8.43:1** (pass); glass faint text on panel `#0f1e26` = **4.05:1** (fail). Representative light Home text passes on `#f4f6fa`: title `#0d1420` = **17.06:1**, subtitle `#5a6478` = **5.50:1**, and meta `#5f6b7d` = **4.99:1**. The large 26px draft glyph `#7d8798` is **3.35:1**, above the 3:1 large-text/non-text threshold. **Trigger:** inspect faint labels such as empty-state/category copy in the editor, with either appearance selected. The failing ratios are for the specified solid tokens; text over other surfaces can vary.

### 11. Several Home search controls have phone hit areas below 44×44 CSS px

**Severity: low. Confidence: high from declared dimensions.**

**Evidence:** the search opener is `38×38` (`styles.css:5021`):

> `width: 38px; height: 38px;`

The clear-search button is `34×34` (`styles.css:5032`):

> `width: 34px; height: 34px;`

No larger hit-area pseudo-element is declared for these controls. **Trigger:** use Home search at a phone width and tap the small opener or clear icon. Both controls are below the requested 44×44 target. This does not repeat the older #98 measurement of the then-existing controls; these selectors were checked separately against the current tree.

### 12. Effect keyframe buttons have only a 40×40 invisible target on phone

**Severity: low. Confidence: high from declared dimensions.**

**Evidence:** the visible keyframe button is `20×20` and its pseudo-element makes a `40×40` hit region (`styles.css:1851-1854`):

> `.fx-kf { width: 20px; height: 20px; ... }`
>
> `width: 40px; height: 40px; /* the touch region, invisible and laid out as nothing */`

**Trigger:** tap the diamond beside an effect parameter on phone. The expanded target remains 4px short in each dimension of 44×44; neighboring controls also constrain the practical tap area. This applies to these effect keyframe controls, not the previously logged caption grips.

### 13. Project names are forcibly ellipsized, including at enlarged text/zoom

**Severity: low. Confidence: medium; enlarged-text rendering **UNVERIFIED**.**

**Evidence:** project card names are single-line and clipped (`styles.css:5504`):

> `.hm-name { font-size: 14.5px; ... white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`

**Trigger:** increase browser/text zoom or use a narrow phone with a long project name. The visible card can omit the end of the name rather than wrap. The Home card has an accessible name in `js/home.js:1360`, so this finding concerns the visible clipped text, not its accessible name. Actual clipping amount at a specific zoom level is **UNVERIFIED** without browser measurement.

### 14. Several effect keyframe controls expose an action title but no pressed/animated state

**Severity: low. Confidence: medium.**

**Evidence:** effect keyframe buttons are created with a diamond and title (`js/inspector.js:1135-1140`):

> `const kfb = el('button', 'fx-kf' + ... , '◆');`
>
> `kfb.title = FM.isAnimated(c) ? 'Keyframe at playhead (click to remove)' : 'Animate this parameter';`

No `aria-pressed` or equivalent state is set there. **Trigger:** toggle animation on an effect parameter, then revisit/read the control with a screen reader. The action title may change, but the button’s current on/off state is not exposed as a toggle state. The actual announcement of the title in each screen reader is **UNVERIFIED**.

### 15. The preview canvas has no textual description of its current image

**Severity: low. Confidence: high for absent fallback text; impact depends on user/task.**

**Evidence:** the editor’s visual stage is a bare canvas (`index.html:414`):

> `<canvas id="preview" ...></canvas>`

It has no accessible label or fallback description in the markup. **Trigger:** open a project and navigate to the preview using a screen reader. The user can operate labelled controls elsewhere, but cannot learn what the current rendered frame contains from the preview surface itself. Whether descriptions/canvas annotations are desirable for the editing workflow needs product consideration.

## Review notes

- The Home search icon and clear control’s accessible names are present in `index.html:683` and `:692`; the static button inventory did not reveal a confirmed unnamed button in the reviewed HTML. Many dynamic buttons also set `title` or `aria-label`, so the higher-confidence gaps are timeline objects and missing state/announcement semantics above.
- Reduced-motion support is present in both stylesheets and several JavaScript animation paths. I did not confirm a specific current animation that ignores the preference from this source-only pass; an exhaustive runtime sweep across dynamic effects remains **UNVERIFIED**.
- Escape handling is broad and several previously logged failures have fixes. The known #809 effect-sheet-through-overlay failure was skipped. I found no new, statically confirmed general Escape regression to add.
- The older #98 sweep already records that many phone controls are under 44px and that the user accepted the transport button size. Those known cases are not repeated here; the two Home search controls and effect-keyframe controls above are reported as current, separately identified controls.
