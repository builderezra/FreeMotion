# INBOX

Append requests below the divider. The building chat drains it: each entry moves into REQUESTS.md with a
number, then `tools/inbox.sh --done` removes only the lines it was shown, so anything added mid-drain stays.
The divider is the line of three dashes below. Keep that exact line out of this header prose: on 20 Sep
the old drain cut the file at the first three dashes in the header, and the inbox was blind for six days.

WHO WRITES HERE: Ezra from his phone, and the LOGGING CHAT (his arrangement, 26 Sep). The logging chat
writes one block per message he sends it:

    ### <date, time AWST> — <short title>
    **His words (verbatim):** …exactly what he typed, typos and all…
    **Logger's plan (not his words):** a READY-TO-BUILD plan: where in the code, the exact change,
    options already drawn/rendered (and his pick, when he has made it in the logging chat),
    measurements already taken, the test that proves it, and any question left (as a `❓ASK:` line).
    Big plans live in tools/design/plans/ and the block links them.

BUILDER: move the WHOLE block into the REQUESTS.md entry. His words go in as the verbatim quote and get
split into his numbered clauses as usual. The plan goes under them, labelled as the logger's plan.
Follow it; if the tree has moved and a step no longer fits, say so in the entry rather than improvising silently. Design requests still get drawn options before anything ships
(#545), and the queue order is unchanged: log it at the bottom and it waits its turn.

---


### 26 Sep 2026, ~20:29 AWST — Empty project, phone: tapping the big add area is glitchy. The blue outline misses the top edge and gets stuck; the tap animation needs a far better, colourful, whole-area version; the outline should PULSE around and then go

His screenshot (an empty project on his phone, v17.02) is saved at `tools/design/2026-09-26-empty-timeline-tap.png`.

**His words (verbatim; dictated, so transcription fixes are in [brackets]):** "When tapping on this menu and stuff it's very glitchy like the blue bar that's supposed to go around. The edges doesn't fully go around the edges at the top and also it just stays there get safe stock [gets stuck] and it doesn't look very good and also the animation you made for like when you tap on the screen looks really shitty. Like you could do way better better than that like cops [cook up a] way better animation that like actually play in that hole [whole] like that little touch pad area in the bottom bottom when you tap on it something a lot more colourful and actually put a lot of work into it and I'm not just a small little touch thing like I actually cook up the whole area and then also make sure that like the blue lines in the outside actually look good and actually go away like they actually pulse when you type of it [tap on it] don't just say that [stay there] and they pulse all the way around it not just like all the lines appear at once"

His clauses:
1. Tapping the empty project's big add area is glitchy: the blue outline meant to go around it does not reach the TOP edge.
2. The outline stays there (gets stuck) and does not look good.
3. The tap animation (#571's colourful press) looks bad. Make a far better one.
4. It plays across the WHOLE touch-pad area at the bottom, much more colourful, with real work put in. Not a small touch effect.
5. The blue lines around the outside must look good and GO AWAY.
6. When tapped, they PULSE, travelling all the way around the edge, not all the lines appearing at once.

**Logger's plan (not his words). A first diagnosis from the code (not yet measured on a phone). The full plan follows as its own block:**
- The outline is `styles.css` ~8357–8362: `#timeline-panel.tl-empty-start #timeline:focus-within, …#timeline:hover { box-shadow: inset 0 0 0 1px rgba(150,232,255,.8), inset 0 0 14px … }` (#600 moved it from the row to `#timeline`).
- **Why it gets stuck (clause 2):** it is drawn by `:hover` and `:focus-within`. On iOS, `:hover` sticks after a tap until you tap elsewhere. And the add row has `tabIndex = 0` (`js/timeline.js` ~2969), so it keeps focus after the tap, which makes `:focus-within` stay true. Both states persist, so the box persists.
- **Why the top is missing (clause 1):** most likely the ruler strip above the tracks overlaps `#timeline`'s top edge, or `#timeline` scrolls or clips at the top, so the inset line's top side is covered. MEASURE this at 380 and 440.
- The tap animation is `tapBurst()` in `js/timeline.js` ~2905–2945 (`.tl-tapburst`, `styles.css` ~8251–8294: a small ripple whose hue depends on position, 620ms, max 6 at once). His brief keeps #571's "comes from where you tapped" idea, but at the scale of the whole area.
- Direction for the plan:
  - (a) The outline becomes a one-shot, JS-triggered animation on pointerdown, not a CSS state. A bright segment travels all the way round the perimeter (SVG rect `stroke-dashoffset` or a rotating conic-gradient border), then fades out. It is never left on.
  - (b) Keep a real `:focus-visible` ring for KEYBOARD users only.
  - (c) A new whole-area colourful press animation, e.g. a colour wave or aurora that blooms from the tap point and sweeps across the entire area. Options will be drawn and shown to him (#545), with reduced-motion respected.

### 26 Sep 2026, ~20:57 AWST — Settings: redesign the close ✕, or use the same drawn ✕ as search (#951)

His screenshot (Home → Settings, light look, his phone) is saved at `tools/design/2026-09-26-settings-close-x.png`.

**His words (verbatim):** "Redesign the X for this menu and make it actually look good or just use the same design that you're gonna use for the other ex that I'm making you do now like the one for when you're selecting stuff I think it was or might be no it was for when you're searching stuff, yeah yeah that X"

His clauses:
1. Redesign the Settings panel's ✕ so it actually looks good…
2. …or just use the same design as the search ✕ (#951, shipped v17.03).

**Logger's plan (not his words). Ready to build:**
- Cause: the same bug class as #951. `js/settings.js` ~408 builds `el('button', 'set-close', '✕')`, a TEXT glyph in a 34px ring (`styles.css` ~6026 `.set-close {…font-size: 13px…}`), so it sits low and thin.
- Options drawn and SENT to him in the logging chat: `tools/design/plans/2026-09-26-settings-x/options.jpg`, source `options.html` in the same folder.
  - **A**: the search ✕ exactly (22px slate disc, white cross).
  - **B**: the same design at 28px, to match the big "Settings" title, with the same 34px tap area. **Recommended.**
  - **His pick: pending.** It comes back as its own block. If none has arrived when you reach this, build B (never block).
- Build (B; for A use width/height 22):
  - `js/settings.js` ~408: `const close = el('button', 'set-close');` then `close.innerHTML = '<svg viewBox="0 0 22 22" width="28" height="28" aria-hidden="true"><circle class="set-x-disc" cx="11" cy="11" r="11"/><path class="set-x-cross" d="M7.6 7.6l6.8 6.8M14.4 7.6l-6.8 6.8"/></svg>';`. Constant markup, no user data. Keep `type`, `aria-label` and the click handler as they are.
  - `styles.css` ~6026: replace the `.set-close` rule with `.set-close { width: 34px; height: 34px; border-radius: 50%; border: none; background: transparent; padding: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; } .set-close svg { display: block; } .set-x-disc { fill: var(--text-dim); } .set-x-cross { fill: none; stroke: var(--panel); stroke-width: 2; stroke-linecap: round; } .set-close:active .set-x-disc { opacity: .7; }`. These are the dark defaults and mirror `.hm-clear-disc`/`.hm-clear-x` at ~4776.
  - `theme-glass.css`:
    - Remove `html[data-theme="glass"] .set-close` from the glass round-button group (~278), or it paints a glass circle behind the disc.
    - Replace the light rule at ~1145 (`html[data-home="light"] body.home-open .set-close {background-color…; color: #23304a…}`) with `html[data-home="light"] body.home-open .set-close { background: transparent; border: none; box-shadow: none; } html[data-home="light"] body.home-open .set-x-disc { fill: #8792a4; } html[data-home="light"] body.home-open .set-x-cross { stroke: #fff; }`. Scoped to `home-open` so Settings opened from the dark editor keeps the dark disc.
  - Bump `?v=` for `js/settings.js`, `styles.css` and `theme-glass.css` in `index.html`.
- Test: copy #951's test (`tests/tests.js` ~100755). Open Settings; `.set-close` must contain `.set-x-disc` and `.set-x-cross`, and the cross's bbox centre must be within 0.5px of the button's centre. No test references `set-close` today, so nothing breaks. It fails on HEAD because there is no svg.
- ❓ASK (optional, recommend YES): the same text ✕ is used by five more close buttons: `js/ai-chat.js` ~293 `.aic-close`, `js/ai-panel.js` ~62 `.ai-close`, `js/elements-browser.js` ~133 `.fxb-close`, `js/voice-rec.js` ~270 `.vr-close`, and the notepad/caption/preset delete ✕s. Give all the close buttons the same drawn ✕ so there is one ✕ in the app? Do Settings now, the rest only on his yes.
- Verify: Settings opened from light Home, dark Home and the editor, at 380/440 and on PC.

### 26 Sep 2026, ~20:57 AWST — Standing instruction: when there is nothing else to do, add new effects, filters and sound effects, and polish effects with more features. This is the COMPLEX version: as much choice as possible

**His words (verbatim):** "You're a bunch of ideas of things you can do if you ever run out of things to do which I doubt it but in case you do you can add new effects. You can add new filters. You can add new sound effects you can polish other effects just giving them more features and making them work a bit better and have more customisation like you know more choices always better I'd say like for this we're definitely trying to keep it as you know like because we're gonna have two versions the simple version and then the complex version this is the complex version we want as much choice as possible"

His clauses:
1. If the builder ever runs out of things to do, it can: add new effects…
2. …add new filters…
3. …add new sound effects…
4. …and polish existing effects: more features, working better, more customisation. "More choices always better."
5. There will be two versions, a simple one and a complex one. **This app is the complex version: as much choice as possible.**

**Logger's plan (not his words):**
- **Make it structural, not a note:** today LOOP.md ends a turn in one line when the queue is empty, and `next.sh` reports "only long-term ideas left". Add a line to `tools/next.sh`: when ACTIONABLE is 0, print this entry's number with "IDLE STEER: new effects / filters / sound effects / polish effects with more options (his words, 26 Sep)". That way an idle loop turns into work instead of stopping. Then change LOOP.md's empty-queue rule to point at it.
- Standing note, not a build item: log it as a standing instruction (like #846/#875). It holds nothing in the queue.
- **Clause 5 is direction for #923** (easy editor + deep editor, "needs his approval before any build"). Record it there as context: the current app is the COMPLEX one, and more options are welcome in it. It is NOT approval to start the easy editor, which is still Q36 in his list.
- Where to look when idle, so the idle work has a starting menu:
  - #482 (go through every effect and improve it; its speed-slider offer).
  - #904 (effects missing a control).
  - #912 (the ten filters on branch fm912-filters, waiting on his pick, Q12).
  - #858 (the extreme filters).
  - The unnumbered "Continue the EFFECTS-PLAN build rounds" (Q34: three pro effects he wants pictures of first).
  - The sound-effects library in the Add menu's Audio tab.
- New effects and filters still go through #545 (draw options, show him, he picks) before shipping. Polish with more controls on an existing effect can ship with a before/after.
- A full, vetted idea backlog (existing effects/filters/sfx inventoried against what pro editors offer, with specs) can be drawn by the logging chat when the queue is close to empty. Say so in an INBOX block and it will be planned.

### 26 Sep 2026, ~21:08 AWST — HE ANSWERED the Settings ✕ question: the recommended options

**His words (verbatim):** "do reconmended"

**Logger's note (not his words):** this was his reply to the two questions the logging chat had just asked, which are the latest ones on screen:
1. **Settings ✕ → B** (the search ✕'s drawn design at 28px, same 34px tap area). Build B exactly as the plan in the Settings ✕ block above says.
2. **The optional sweep → YES**: give every text-✕ close button the same drawn ✕, so the app has one ✕. That covers `js/ai-chat.js` ~293 `.aic-close`, `js/ai-panel.js` ~62 `.ai-close`, `js/elements-browser.js` ~133 `.fxb-close`, `js/voice-rec.js` ~270 `.vr-close`, and the delete ✕s in `js/notepad.js` ~110, `js/captions.js` ~445 and `js/fx-browser.js` ~698.
   - Plan: factor ONE helper, e.g. `FM.drawnX(size)`, returning the svg string with classes `set-x-disc`/`set-x-cross`. Use it in all of them, sizing each to its button (close buttons 22–28px; small inline delete ✕s ~16px).
   - Move the `.set-x-*` colour rules to a shared name (e.g. `.fm-x-disc`/`.fm-x-cross`) with the light-Home override.
   - Render one before/after sheet of all of them and send it with the release.
   - Search's own `.hm-clear-*` can stay as it is, or join the helper. Your call, but keep #951's test passing.

This does NOT answer the 36-question list from this morning. Those are still open.
