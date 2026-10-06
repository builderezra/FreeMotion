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

### 06 Oct 2026, ~14:35 AWST — Phone: the Add menu grows out of where you tapped (a second animation mode, with a Settings toggle)

**His words (verbatim):** "Log this request so basically currently the animation for when you open up the ad menu on mobile folds up from the bottom but I had a cool idea where instead it basically wherever you touched from it basically expands out from where you touched and as I created from where you touched so like for instance let's say you started a new project and it's got that massive area. It's just like tap here to start creating and you can tap anywhere and wherever you type basically from around where your finger touched it will like be created around it. It will like pulse out from like a circle outwards but like in a nice looking way and it'll be fairly quick and also they're not safe if you're actually in the middle of editing and it's and you tap on the tap to add layer bar or tap to add whatever layer you tap on that and then the actual layer to add stuff like the tap to add layer basically expands up and down until it's created that menu like it'll just like expand from where it was on the timeline to fill up the screen area where it's supposed to be, I think this would be a very smooth and cool animation. Make sure it actually works because you've done a lot of design stuff already for that animation for popping up and stuff so it'll be a lot clashing and maybe just make it so it's reversible if I don't like what you're not doing and I prefer the old way like just have a toggle switch to change the two modes in the settings and yeah you're gonna pretty much have to rethink the animation and design a lot from what it used to be because you made all of those cool colour patterns and stuff that happen when you tap and the lines glowing and everything but you're gonna have to rethink all of that now and rework it sort it actually matches this new design but yeah, just log this"

**His clauses (to tick one by one):**
1. Phone Add menu: instead of folding up from the bottom, it opens FROM WHERE YOU TOUCHED.
2. Empty project (the big "Tap here to start creating" area): tap anywhere; the menu is created around the finger, pulsing out from a circle, nice-looking and fairly quick.
3. Mid-edit: tapping the "Tap to add a layer" row makes that row itself expand up and down until it fills the area where the menu belongs.
4. "Make sure it actually works": the existing open animations, press pulses, colour patterns and glowing lines must not clash with it. Rethink and rework them so they match the new design.
5. Reversible: a Settings toggle between the new mode and the old fold-up mode.

**Logger's plan (not his words); a design request, so animated options are shown to him before anything ships (#545).**
- **Where:** `js/mobile.js` `openAdd()` (~:398) and `closeAdd()`; `js/timeline.js` `openFromArea()` (~:3324), which already knows the tap point; the sheet's `.is-arriving` tap guard (styles.css ~:8876, pointer-events off while it arrives; keep it); the add-row press pulse `@keyframes tl-addpulse` (styles.css ~:9848) and the empty-start orb.
- **Mechanism:** read the pointer's clientX/Y from the opening tap and pass it as `openAdd({origin:{x,y}, from:'point'|'row', rowRect})`.
  - **Point mode (clause 2):** animate `clip-path: circle(0 at x y)` → `circle(150% at x y)` on the sheet, ~260–320 ms ease-out, with a soft ring pulse layer for the "pulse out from a circle".
  - **Row mode (clause 3):** animate from `inset(rowTop 0 rowBottom 0)` → `inset(0)`, so the bar grows up and down into the sheet. The sheet's content fades in for the last ~40% so text never shows squashed.
  - **Close:** the same shape in reverse, back to the point or row.
- **Clash work (clause 4):** stage the old pulses so they hand over to the new reveal instead of running on top of it. The row's glow/colour sweep becomes the edge of the expanding shape. Retire or retune `tl-addpulse` in the new mode only. Old mode stays byte-identical.
- **Toggle (clause 5):** a Settings item such as "Add menu animation: From your tap / Slide up", default to be his pick. Store it with the other settings (js/settings.js). Under `prefers-reduced-motion`, both modes use a plain fade.
- **Show him first:** record 2–3 short phone-size clips (380px) of each mode at real speed, and a slow-motion version, drawn through the app. Let him pick timings before building it fully.
- **Tests:**
  - The sheet's clip-path animation origin equals the tap point (±2px), and equals the row's rect in row mode.
  - Taps are ignored while arriving (the existing guard).
  - With the setting off, the old path is unchanged: assert today's animation classes and keyframes are still used.
  - Reduced motion uses a fade only.
  - Close reverses to the origin.
  - Run at --width 380.
- ❓ASK (when drawn): the default (new or old), and the speed after he sees the clips.
- **Queue:** in order, behind #980 Simple mode. Check it against Simple mode's own phone add flow too, which may share openAdd.

