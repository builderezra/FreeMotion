# Ezra's requests — the running list

**This file is the record of everything Ezra has asked for.** Every request goes in here the moment
he makes it, however small, in the order he said it. Nothing is judged too minor to write down —
"make the arrow look nice" is a line in this file the same as "fix the export".

**The rules, for Claude:**
1. A new request gets added to **Open** immediately, before any work starts on it. If it arrives
   while something else is in flight, it still gets written down first.
2. Work them roughly **in order**, oldest first, unless Ezra says otherwise or something is
   genuinely blocking (a bug that destroys work jumps the queue — say so when it does).
3. When one ships, move it to **Done** with the version it shipped in. Don't delete it — Ezra should
   be able to scroll back and see the whole history.
4. Quote his own words where they're short enough. His phrasing is usually more precise about what
   he actually wants than a tidied-up restatement.
5. If something is deliberately NOT being done, it stays in Open with a **Held** note saying why.
   Silently dropping a request is the failure this file exists to prevent.

Detail on how each shipped item was built lives in [POLISH-LOG.md](POLISH-LOG.md), one line per
version. This file is the *what and whether*; that one is the *how*.

---

## While you were asleep — 12–13 Aug 2026

**v6.35 → v6.54, twenty releases. Suite 190 → 228 tests, all green at desktop and at 380px.
39 commits waiting for GitHub Desktop.**

Your queue: **89** (Letterbox erasing layers, on the 4th attempt), **captions never opening the
editor**, **58** (red delete bar), **53** (PC Group/Mask), **68** (Speed retimes keyframes),
**74** (Favourites browser), **48** (Squish landed at last), plus the landscape-phone squeeze.

Then I worked the BUG-HUNT backlog and closed ten findings — warp effects changing strength when
the preview quality dropped, Particles being invisible in every phone preview, Edit Shape silently
destroying keyframed borders, the locked crop decaying its own ratio, two group bugs that blanked
the timeline, two ways audio escaped and played under the Home screen, the AI panel spending past
its cap and faking its answers with a stale demo flag, exports being handed the 640px preview cache,
and the text anchor doing nothing.

**Four things want you, not more work from me:**
- **72 — audio import.** The half you can SEE was already fixed in v6.08 and never ticked here (my
  miss). The half you can HEAR I could not reproduce: synthetic files are clean through every path.
  **Send me the file, or its name and format.**
- **Three audio sliders** (Distortion Drive, Bit Crush Bits, Lo-Fi Amount) could be keyframed — I
  measured the cost at 0.24ms, affordable. Reverb can't (12.5ms, and it clicks). I didn't build them
  because it's audio automation I can't hear. Say the word and you can listen.
- **74** — I did NOT delete the left-right pager. *"Replacing the swipe-right"* reads two ways and
  I won't remove a working gesture on a coin flip. One line either way.
- **"Color & Light"** is spelled the American way in the effects browser, which sits oddly next to
  the "Colouring" rename you asked for. Your app's voice, not mine to change unasked.

One fix I **reverted rather than ship**: the stage-resize hook. It's correct, but a ResizeObserver
never fires in either browser I can drive here, so I couldn't demonstrate it — and a resize hook that
silently doesn't fire looks exactly like one that works. BUG-HUNT.md says how to finish it.

---

## Open

Numbered with Ezra's own queue numbers where he gave them.

### In flight right now
- [ ] **127 — Paste Style icons are stale.** His words: *"Paste style menu needs to reflect the current
      icons that have since changed."* Screenshot at v6.73: the Paste Style grid still uses the OLD
      category glyphs while the inspector below it shows the current ones (the gradient-coloured set from
      #77). Same nine categories, two different icon sets on screen at once.
- [ ] **128 — Opening/closing a project feels janky.** His words: *"the animation when opening a project
      feels janky, the fix is make it so the animation of the project layer moving to the left happens
      instantly, so it feels responsive, make sure it's smooth, then smoothly the project should swoop in
      too. Needs to be smoother and less janky when leaving a project also."* Note he has prescribed the
      FIX, not just the symptom: the card's exit should start on the very first frame with no wait, and
      the editor's entrance follows. Likely the two are currently sequenced or both wait on a layout/
      render that stalls the first frame — measure where the first frame goes before retiming anything.
- [ ] **129 — A 2-second screen recording adds a clip with NO VIDEO.** His words: *"Added a screen
      recording from my camera roll that's very short and it still has the issue of being on the timeline
      but not actually showing any video."* "Still" — this is a repeat. A screen recording is a specific
      case worth chasing: HEVC in an mp4/mov container, often with an odd colour range, and iOS screen
      recordings in particular. The clip EXISTS (it is on the timeline with a duration), so the decode or
      the draw is failing, not the import.
- [ ] **130 — One 2-second clip, one project, and it lags — and the quality tier does not drop.** His
      words: *"I have got no other projects, just one; and I managed to add one screen recording that's
      two seconds long, and the project lags from just that, it also still doesn't compress the quality
      in the canvas playback, even though just for this one thing it shouldn't need to do that anyway."*
      Two facts in one report, and the second is the useful one: the adaptive quality tier is NOT kicking
      in. If the preview is lagging AND refusing to drop resolution, the tier logic is either not
      measuring the right thing or is gated off. Pair this with 125.
- [ ] **131 — The overpull Easter egg freezes if you drag really far.** His words: *"there's a glitch now
      when you swipe down really far and then the Easter egg happens where it slams the screen, if you try
      dragging really far down it just freezes, you should still be able to drag it down as freely as you
      want and at any point of letting go after a certain amount it does the slam."* So the pull is being
      clamped hard (PULL_MAX 150 with a pow(dy,0.78) curve) and reads as a freeze once you pass it. He
      wants the drag to keep responding at any distance, with the slam on release past the threshold.

- [ ] **139 — Project notepad + export reminders.** His words: *"In the top menu, put a little note pad
      icon and make it so you can add notes about the project and reminders, make it so you can tick
      wether it will remind you to do these things when you press the export button, so anytime you press
      export it'll give you a pop up first showing the reminder."*
      So: a notepad icon in the project's TOP BAR; a panel where you write notes about that project;
      individual items you can **tick as "remind me at export"**; and the export button checks for ticked
      reminders and shows them in a dialog BEFORE the export dialog. Notes are per-project and save with
      the project. Design points to settle when building: an item with the reminder tick unset is just a
      note (never interrupts), the pre-export popup must offer "Export anyway" as well as "Back", and it
      must not fire when there are no ticked reminders — an empty popup on every export would be worse
      than no feature. Also decide whether ticking a reminder DONE clears it or just unticks the
      remind-at-export flag; leaning towards a plain checklist that keeps its items.
      **And it must reach the PC layout too** — his follow-up: *"Make sure that also comes to the pc
      beesoon."* So the notepad button needs a home in the Studio top bar as well as the phone one, and
      the pre-export reminder must fire from BOTH export entry points (the editor button and the home
      ⋯ → Export video…), not just the mobile one.

- [x] **138 — Pin to top, in every home category.** (v6.76) His words: *"For each category make it so if you
      press the three dots on a project or even template etc you can press pin and the project will stay
      at the top, give a little design indicator that they're pinned, you decide, if it looks bad I'll
      just give an idea. Make sure you can pin as many as you want."*
      So: a **Pin** entry in each card's ⋯ menu, on EVERY home tab (projects, templates, elements — and
      any tab added later), pinned items sorted to the top of their own tab, a visual indicator on a
      pinned card, and **no cap** on how many are pinned. Toggling off unpins. The indicator is my call
      with his review — keep it small and quiet, in the card's existing furniture rather than a new
      badge fighting the OPEN glint and the grain. Pinned state is per-item and must survive reload, so
      it persists like the rest of the home metadata. Ordering WITHIN the pinned block should stay
      whatever the tab's normal sort is, so pinning never scrambles a list you already know.
      **Shipped v6.76.** ⋯ → **Pin to top** on projects, templates and elements; the row flips to
      **Unpin** once it is on. No cap — verified by pinning every project at once. Pinned cards lift to
      the front as a STABLE partition, so your existing order (recently edited, or A–Z) still holds
      inside each block. The indicator is a small blue tack on the thumbnail's top-right, on the same
      dark plate as the OPEN badge and the duration so it reads as one family; it hides while you are in
      Select mode, because the selection tick wants that same corner and two stacked badges look broken.
      Pins live in localStorage keyed by tab, NOT on the project record — a pinned project you export
      and re-import should not arrive pinned on someone else's home. Verified live: pin, reorder, badge,
      unpin, and survival across a reload. **Works on PC too** — home is one shared screen, so the same
      ⋯ menu is there in the Studio layout.
      Deliberate call worth knowing: pins do NOT apply while you are searching. With a query typed you
      want the best match first, and a pinned item outranking a closer one reads as broken search. Say
      if you want it the other way.

- [ ] **136 — A selected Captions layer locks the timeline and the layer.** His words: *"I can't do
      anything like drag the timeline or layer when you have a captions layer selected."* Screenshot on
      v6.74 shows the Captions layer selected with its clip spanning the whole timeline. So selecting a
      captions layer is swallowing the drag gestures — either the caption's own editing surface is
      capturing pointers over the timeline, or the clip is being treated as un-draggable and taking the
      scroll with it. Captions was made real in #43, so this is likely fallout from that.

- [ ] **137 — "Edit Text" has the wrong icon.** His words: *"edit text button should have a diff icon."*
      Screenshot: slot 7 "Edit Text" uses a green DIAMOND — which is the keyframe diamond used everywhere
      else in the app for animation. Reads as "add a keyframe", not "edit the text". Needs an icon that
      means text editing and does not collide with an existing meaning.

- [x] **133 — Film grain: CONSTANT FLOW, no start/stop. Fourth time asking.** (v6.75) His words: *"Film grain
      needs to move faster, I want a constant flow, not a noticeable start and stop. PLEASE JUST MAKE IT
      WORK I DONT WANMA ASK AGAIN."* **This one is entirely my fault and the diagnosis was wrong every
      time.** I kept treating it as a RATE problem and kept changing the speed (2.6s → 0.5s). It is a
      METHOD problem: a cross-fade animates opacity .032 → 0 → .032 on ease-in-out, which IS a start and
      a stop — it pulses, and no speed fixes a pulse. He has now described the symptom precisely enough
      that there is no excuse: constant flow means the grain never pauses, so the opacity must not be
      animated at all. Replace the dissolve with continuous linear motion of the noise field.
      **Fixed v6.75, and it was one word.** The timing function was `ease-in-out`, which flattens the
      curve at BOTH ends of every cycle — the grain literally stopped twice per cycle and restarted.
      Changed to `linear` (plus .5s → .36s). Measured on the real keyframes at high sample rate:
      ease-in-out sat effectively motionless for **12.5% of every cycle**, linear for **0.0%**; rate
      variation dropped from CV 0.545 to 0.056. So there is now no instant at which it rests.
      For the record on my three failed attempts: I read "faster" literally each time and only ever
      changed the DURATION, which cannot fix a pause — speeding up a stop-start just stutters more
      often. The stop was in the curve the whole time.

- [ ] **134 — Text is broken: 180pt renders tiny.** Screenshot on v6.74, iPhone: a text layer with the
      size control reading **180 pt** draws as a ~20px word on the canvas, with the selection box shrunk
      to match. So the point size is not reaching the render — the layer is drawn at something near the
      default regardless of what the control says. Note the control and the box AGREE with each other and
      both disagree with 180, which points at the value never being applied rather than at a stale box.
      This is the fourth text report (#88, #97, #98 lineage) so it needs a real reproduction on a device
      profile, not a desktop glance.

- [ ] **135 — Black bar down the left after opening/closing projects.** His words: *"there's a glitch
      where sometimes when opening in and out of the projects it leave a black bar on the left side of
      the screen."* Intermittent, which fits the open/close slide animation (#128, same area): the
      project panel translates in from the right and home exits left, so a transform that does not fully
      settle — or a will-change/compositor layer left behind — would show as a strip of background down
      one edge. Likely the same root cause as #128's jankiness; fix them together.

- [ ] **132 — The slam Easter egg is GONE.** His words: *"The slam Easter egg is gone."* Reported on
      v6.74, and it supersedes the "it freezes" report in #131 — it is no longer freezing because it is
      no longer happening at all. Prime suspect is v6.61, which changed Faves from a sideways swipe to a
      PULL-DOWN on Recents: two gestures now want the same downward drag on the same screen, and if the
      faves pull claims the pointer first the slam never gets to see it. Fix both together — #131 wants
      the drag to stay responsive at any distance with the slam on release, #132 wants it to fire at all,
      and they are the same gesture. Whatever lands must keep Faves working, since that was also his ask.
      **That guess above was WRONG, and the truth is worse.** `git log -L 370,470:js/home.js` returns
      exactly ONE commit — the whole overpull block is byte-identical to the day it shipped in v6.26.
      Nothing regressed it, and the faves rework never touched home.js at all. **It has been broken on a
      real phone the entire time**; it only ever worked in my desktop tests.
      The mechanism, found by reading the guards rather than the history:

          if (dy <= 0 || sc.scrollTop > 0) { if (pull.px) setPull(0); pull = null; return; }

      `pull = null` is PERMANENT — nothing re-arms it until the next pointerdown. On a real touchscreen
      the first pointermove very often reports the same clientY as the pointerdown, so `dy === 0`, which
      `dy <= 0` treats as "this is not a pull" and destroys the gesture on frame one. Every synthetic
      test I ran jumped 20px on the first move and so never produced dy === 0 — which is exactly why
      this survived being "verified" more than once.
      Second, separate defect in the same handler: pointercancel is wired to the same release() as
      pointerup, and iOS fires pointercancel as soon as Safari claims the drag for its own rubber-band.
      Both need fixing; neither alone is enough.

- [x] **126 — The grain now reads as switched OFF; it needs to be FASTER, still smooth.** (v6.74) His words:
      *"you've just turned off the animation of the film grain in the home menu, I asked for it to be
      faster and you turned it off, wtf."* He is right and this one is on me: v6.68 cross-fades between
      two noise fields over 2.6 SECONDS, which is roughly one change per 1.3s — technically animating,
      visually indistinguishable from a still image. Chasing "smooth" I dropped the rate through the
      floor. The fix is rate, not method: keep the cross-fade (that is what killed the strobing) and run
      it several times a second so it visibly boils.
      **Shipped v6.74:** the cross-fade period went 2.6s → 0.5s, so the grain field now turns over about
      five times a second — visibly boiling, still cross-faded so it never strobes. Method unchanged;
      only the rate moved, which is what you actually asked for both times.

- [ ] **123 — Linear Repeat is poor: it just squishes horizontally.** His words: *"Linear repeat effect
      is shit and needs work, currently it just squishes horizontally when you do it."* So the copies are
      being fitted into the frame width instead of being laid out at size — a repeat should place N
      copies along an axis at the ORIGINAL scale, with spacing and direction, not compress one copy.
- [ ] **124 — Faves gesture: threshold + cancel, better animation, and rename to "Faves".** His words:
      *"you start by swiping up on the recents menu, when your swipe reaches a certain level and you let
      go it opens the faves menu, since people may start swiping and not want to go in that menu … you
      can just swipe back up and cancel the swipe to opening the menu, kinda like how swiping an effect
      deletes it. The animation has to be smooth and obvious and actually look nice and make sense.
      Don't name it all faves, just faves."*
      **DIRECTION IS AMBIGUOUS and I am not guessing silently:** he says swipe UP to open, then says
      swipe back UP to cancel — those cannot both be true. v6.61 built pull-DOWN (from his earlier "if
      you swipe down on recents"), and "swipe back up to cancel" is self-consistent with a DOWN-opening
      gesture. Proceeding as DOWN-to-open / reverse-to-cancel and flagging it; one word from him flips it.
      What is definitely new regardless of direction: reversing mid-swipe must actively CANCEL (today it
      only cancels by releasing short of the threshold), the animation wants real work, and the strip
      label becomes "Faves".
- [ ] **125 — Timeline scrolling still lags badly, with barely any layers — and he is right that I keep
      not fixing it.** His words: *"Still getting major lag when scrolling through the timeline; with not
      many layers added at all. I know I tell you about lag a lot but nothing much ever gets resolved,
      idk if you're working on it or think it should be fine but just letting you know it's not fine."*
      **Fair criticism, recorded as such.** The pattern: every time lag comes up I have measured on THIS
      machine, found acceptable numbers, and moved on — which is exactly the trap that made #41 and #97
      drag on. Desktop timings are not evidence about his phone. Next pass must be a real profile of the
      timeline scroll path under CPU throttling, looking specifically for forced synchronous layout and
      per-frame innerHTML, and it takes priority over feature work.
- [x] **119 + 120 — The EXPORT frame-rate list is unordered, and should match the canvas one.** (v6.74) His
      words: *"This menu is all over the shop, needs to be ordered"* (screenshot: 30, 24, 25, 60, 50, 12
      — no order at all), then *"Yeah match it"* when I asked whether to bring it in line with the canvas
      list. So: same rates as the canvas picker, ascending. Note this drops 12 as well as 24 from export;
      Custom is not offered on the export dialog, so say so rather than let it go quietly.
- [ ] **121 — Settings ↔ Export should mirror ONE WAY.** His words: *"the settings menu and export menu
      should replicate each other, so if I change a setting in the cog it should go to the export section
      as that"* and then, crucially, *"But if you change a setting in the export menu it shouldn't change
      the cog menu."* So the cog is the SOURCE OF TRUTH and export inherits from it; an export-time
      change is a one-off override for that export and must not write back. That asymmetry is the whole
      requirement — a naive two-way binding is exactly what he is ruling out.
- [ ] **122 — Onion skin does not belong in View options or App settings.** His words: *"shouldn't onion
      skin not be in the view options and app settings? Idk why it would be there since it only effects
      one layer, it should just be in the three dots when you have a layer selected."* He is right about
      the scope: onion skin ghosts the SELECTED layer either side of now, so it is a per-layer tool
      sitting in two global menus. Move it to the layer ⋯ menu and take it out of both. Check what
      happens to the setting when nothing is selected before moving it.

- [x] **118 — Frame-rate list: drop 24, keep 25, add 15 and 120.** (v6.74) His words: *"Why do we have 24 and 25
      fps? Just make 25 only, and also add a 120 option, and a 15 fps option."*
      **One concern, raised once and then his call:** 24 and 25 are not redundant — 24 is the worldwide
      CINEMA standard (every film, and what "cinematic" means to most people), 25 is PAL broadcast
      (UK/AU/EU television). Dropping 24 means anyone matching film footage has to go through Custom.
      Cheapest middle ground if he wants a shorter list: keep both but put 25 first. Doing it as asked
      unless he says otherwise — Custom still reaches 24 either way.
      **Shipped v6.74:** every frame-rate list is now 15, 25, 30, 50, 60, 120 (Custom still on the two
      project pickers). 24 is gone from the menus as you asked; if you ever need it for film footage it
      is one tap away under Custom. The AI's own fps snapping was moved to the same list, so it cannot
      land the project on a rate the menu can no longer re-pick.

- [ ] **114 — Music note shape: the bottom falls off.** His words: *"Music note shape needs a slight fix,
      the bottom part is falling off."* Screenshot at v6.73: the note HEAD (the filled ellipse) hangs
      below and left of the layer's own selection box, so the shape's geometry is drawn outside the box
      that is supposed to contain it. That means the bounds are wrong, not the drawing — check the path's
      extents against the box the transform hands it, the same class as the car shape (#63) and the
      squircle work.
- [ ] **115 — Dragging a clip to the screen edge should auto-scroll the timeline.** His words: *"When
      dragging a layer and you get to the end of the screen, make it so the screen moves so you can keep
      dragging a layer to the left or right without needing to let go and then scroll etc, like how we
      have the selecting multiple layers tool."* So the edge-scroll behaviour the paint-select drag
      already has needs to apply to a clip drag too — and he has named the precedent, so copy that one
      rather than inventing a second feel.
- [ ] **116 — Sliders are too stiff; they should glide like the timeline. (REPEAT of #45.)** His words:
      *"The sliders we have for everything like effects and what not are too stiff, they need to flow
      like the timeline does, when you swipe it glides."* #45 "Give every slider the timeline's glide"
      is ticked as done, so either it never covered the effect-panel sliders or the glide it added is
      too weak to feel. Do NOT assume the old fix is present and correct — measure what a flick on an
      effect slider actually does today before changing anything, the way the timeline glide was
      measured for #103.
- [ ] **117 — A locked layer should show a red lock on its preview thumbnail.** His words: *"When you
      lock a layer put a red lock icon on the layer's preview image."* Small and unambiguous: the lock
      state exists (`layer.locked`, and the timeline already refuses to move a locked clip), it just is
      not visible where you look for it.

- [ ] **113 — A third subsection: FILTERS, alongside Effects and Audio Effects.** *Big one — read this
      whole entry before starting.* His words: *"now I want a third subsection for filters. It'll work
      the same as the others, and have a button at the top of the colouring section as a shortcut to it.
      This will be good because lots of people will not want to spend time making filters themselves."*
      **THE HARD REQUIREMENT, and the reason this is not just presets:** *"Make sure when you add a
      filter it doesn't just add a bunch of effects and change their variables for you, even if that's
      what some of the filters are, I want it to show up in the effects menu and actually be grouped as
      one thing, so let's say you open up the filter to see a bunch of effects inside the filter, like a
      drop down menu with the effects, basically effects inside effects (filters) and at the top you
      will have an opacity slider, so you can turn down the effects strength and it will automatically
      apply it to every effect under that filter."*
      So a filter is a CONTAINER in the effect stack — one row, expandable, holding real effects, with a
      strength slider at the top that scales every child at once. That is a new layer-data shape and a
      new inspector row type, not a preset that explodes on apply. Existing presets DO explode, which is
      exactly what he is ruling out.
      Also: *"Some filters will just be their own thing, and not made with just stuff in here, even if
      it's rare"* — so the container must also be able to hold a bespoke kernel, not only child effects.
      And: *"You will make a Bunch of filters and section them, so that people can find stuff organised,
      like how the effects are organised."* — categories, a browser, thumbnails, the lot.
      PLAN IT BEFORE BUILDING. The pieces are: (a) the container data shape + save/load, (b) the
      compositor rendering a container and its strength, (c) the inspector's expandable row, (d) the
      third browser tab + its categories/thumbnails, (e) the shortcut button on Colouring, (f) the
      filter library itself. (a)-(c) are the risky ones — everything downstream depends on the shape.
      **Planned — see [FILTERS-DESIGN.md](FILTERS-DESIGN.md).** The shape is decided and written down
      before any of it gets built, because the effect list is touched by the compositor, inspector,
      timeline, audio-react, save/load, undo, duplicate, presets and Paste Style, and a wrong shape means
      redoing all of them. The two decisions worth knowing: a filter is ONE normal effect that renders its
      children into its own plate (not a nested list that gets flattened — flattening would send 24
      compositor kernels into infinite recursion and hang the tab), and strength is a CROSS-FADE between
      the filtered and unfiltered plate, never a scaling of the children's parameters (half a colour
      string is meaningless, and scaling a keyframed child would rewrite its keyframes destructively).
      **Step 1 of 6 shipped in v6.74 — registry hardening.** Scouting turned up a live bug worth fixing on
      its own: the effect tables were plain object literals read with bare bracket lookups, so an effect
      named `toString` in a project file resolved to a FUNCTION off the prototype chain, passed the
      "is this a real effect" check, and then took the whole effects panel down with a TypeError. That is
      reachable today because `layer.effects` is the one major layer sub-structure with no import
      sanitisation at all. Now null-prototype with own-property guards, verified live: those keys return
      nothing and a real effect still resolves. Steps 2–6 (the walker, the container, the inspector row,
      the browser tab, the library) are still to come, and nothing after step 2 is safe to start early.

- [x] **111 — Snapping and Onion skin should say on screen what they just did.** **DONE v6.70.** His words: *"Make it so
      when you press the snapping and onion skin buttons it actually tells you on screen what happened."*
      He has picked exactly the right two: guides and loop show their result instantly (lines appear,
      playback changes), but snapping and onion skin change NOTHING until you next drag a clip or land
      next to another frame — so the only feedback is a small icon tint you have to go looking for. Use
      the existing FM.toast, and say the STATE ("Snapping on"), not the action.

- [ ] **110 — A lot of effects in Colour & Light plainly do nothing.** *MEASURED — the code is fine in
      Chrome, so this is a DEVICE problem, and it is almost certainly the same root cause as 107.*
      Audited all 42 (`tests/_colourfx.html`): 41 change pixels, and the one that does not (Match Grade)
      needs a reference layer. My first run accused 6 — five of those were artefacts of testing at
      MAXIMUM only (a hue rotation at max is 360 degrees, i.e. a no-op by definition; vignette at max
      size covers nothing), which the second sweep caught.
      THE LINK: exactly 9 effects are drawn with `ctx.filter`, and 8 of them are in this category —
      brightness, contrast, saturate, hue, grayscale, sepia, invert, glow — plus the blur behind 107.
      Canvas filters are unsupported on older iOS Safari/WebViews and the assignment fails SILENTLY.
      That single fact would make precisely this set of effects do nothing while every pixel-loop
      effect kept working. **THEORY REFUTED 2026-08-13: he is on an iPhone 16 Pro Max, iOS 26.5.2.**
      Canvas filters have been supported since iOS 16.4, so ctx.filter is NOT the problem and no
      fallback is needed. Recorded rather than quietly dropped, because the reasoning was sound and
      someone will otherwise re-derive it. NEW LEAD: his screenshot was a SHAPE layer (a pink
      squircle), and shapes get their colour from the FILL system — `fillOwnsColor()` already makes
      the compositor skip the colour-grade filter for exactly those layers. Test whether colour
      effects do anything on a shape/text layer as opposed to media.
      **RESULT — it is TEXT, and it reproduces in Chrome.** Same audit run on three subject types
      (`tests/_colourfx.html`, top block): on media and on shapes all eight ctx.filter effects work; on
      TEXT, brightness / contrast / saturate / grayscale / hue change NOTHING, while sepia and invert
      only alter the glyph pixels and glow works. So a real bug, not a device one — and it is not the
      whole of his complaint either, since he sees dead effects generally. Investigate the text draw
      path: it is the one that paints glyphs through the fill system, and something there is dropping
      the filter for the value-changing functions while letting the palette-changing ones through.
      **WHAT HE ACTUALLY MEANT, 2026-08-13:** *"You can tell the effects don't work because all the
      images don't show any change in the effects menu."* So this is the effect BROWSER's thumbnails,
      not the effects themselves — every preview tile in Colour & Light shows the same unchanged
      picture, so the whole section looks dead from the menu. That fits every measurement: the effects
      DO work when applied (audited on media, image and shape layers). The bug is in the thumbnail
      generation. Related to #52 / #85 / #144, which have circled this area three times before.
      *MEASURED (`tests/_fxthumbs.html`, through the menu's own FM.fxThumbs.mount):* in Chrome all 42
      tiles differ from each other — control invert-vs-grayscale 127, median pair distance 40, none
      blank. Does not reproduce here either. BUT at a PERCEPTUAL threshold 13 pairs are close enough
      that a person would call them the same tile at 84px: grayscale~spotcolor (5), brightness~bumpmap
      (6), lightglow~softglow (6), contrast~levels (9), vibrance~tealorange (9), exposure~bumpmap (11),
      longshadow~radialshadow (11) and six more at 12. THAT is fixable here without his device, and a
      menu where a dozen tiles look interchangeable reads as "none of these do anything" whatever the
      compositor is doing. Fix = subjects and params chosen to show what each effect actually does.
- [ ] **112 — sw.js is an EMPTY FILE.** Found while chasing 110. The app registers a service worker and
      is installable as a PWA, but sw.js is zero bytes — so there is no offline caching, no precache,
      nothing. Either it never got written or it was emptied. Worth deciding deliberately: a PWA that
      cannot open offline is a PWA in name only, and he uses this on a phone. His words: *"There's a shit load
      of effects in the colour & light section that blatantly do nothing and don't work."* Turn this into
      an exact list before touching anything: render a test frame with and without each effect in that
      category and count changed pixels. Must test at a STRONG setting as well as the default, or an
      effect whose default is a no-op (amount 0) gets wrongly condemned — and must include a control
      effect known to work, or a broken harness reads as "everything is broken".

- [ ] **109 — Film Grain needs a ROUND grain option, and the thumbnail should show it.** His words:
      *"The film grain effect should have a circle option, instead of just squares, and also the preview
      image should show the circle version."* Today `filmgrain` hashes one value per square CELL
      (`cell = (y/size)*gw + (x/size)`), which is why the grain reads as blocks at size > 1 — real film
      grain is round. Two parts: a Shape option (Square / Round) on the effect, and the effect's
      thumbnail regenerated from the round variant so the browser advertises what he actually wants to
      see. Note the thumbnail is generated from the effect itself, so it should follow automatically
      once the default or the pictured params use Round — worth confirming rather than assuming.

- [ ] **107 — Fill Behind's Blur does nothing; it only zooms.** His words: *"The blur on fill behind
      still does not work, it just zooms in."* "Still" — so a previous pass did not fix it. IMPORTANT:
      the suite has two tests that measure this blur and both PASS, so whatever is wrong does not
      reproduce in headless Chrome — same shape as the text-editing bug (#41), where synthetic checks
      were green on a broken build. Prime suspect is `ctx.filter`, which is what the fill uses for its
      blur: canvas filter support is missing or partial on older iOS Safari and some WebViews, and an
      unsupported `ctx.filter = 'blur(…)'` assignment fails SILENTLY — leaving the zoom, which is a
      separate transform, working perfectly. That would produce exactly "it just zooms in". Verify the
      support question first; do not tune the blur radius.
- [ ] **108 — What do the buttons on the canvas view rail do?** Answered in chat (loop / onion skin /
      snapping / guides / export marks / timeline zoom). Keeping it here because a control that has to
      be explained is a design note, not just a question — the row is icon-only with no labels, and he
      has now asked what two of them are.

- [x] **106 — Grain level is right, but it is still too jumpy: make it SMOOTH.** **DONE v6.68.** His words: *"The level
      of film grain is good but again it's too jumpy, just make it smooth."* So .032 opacity stays. The
      remaining problem is that v6.67 swaps tiles with steps(1) — an instant cut between noise fields
      five times a second, which is a strobe. Smooth means the change between grain states must be
      CONTINUOUS, while the field still must not translate (that was 105). Answer: cross-fade between
      two noise layers instead of cutting between them.

- [x] **105 — The v6.62 film grain is wrong: it slides as one sheet and every card moves together.** **DONE v6.67.**
      His words: *"I don't like what you've done with the film grain in the home menu, it looks like
      it's all moving together, I want it to be each one having its own things and the film grain
      shouldn't be moving like that, it should be kinda like the effect we have in our app."*
      Three separate corrections, and my v6.62 caused two of them: (a) it TRANSLATES, and a sliding
      noise field reads as a sheet moving past rather than as grain — the old v6.23 comment actually
      warned about exactly this before I overrode it; (b) every card shares one tile and one animation,
      so they move in lockstep; (c) the target is the app's OWN grain effect, i.e. grain that boils in
      place. So: no translation at all, a different tile and phase per card, and an in-place scintillate
      rather than either a slide (v6.62) or a 5-frame jump (v6.23). Both previous attempts are wrong in
      different directions — do not simply revert to v6.23.

- [x] **103 — Timeline scroll glide stops too soon.** **DONE v6.67.** His words: *"When scrolling on the timeline the
      glide ends too quick, it should glide a bit more, just to make it feel smoother and be able to get
      to the other side a bit quicker."* Two things at once: a LONGER glide (less friction, so a flick
      carries further) and the practical benefit of covering a long timeline in fewer flicks. Tune the
      momentum decay, not the initial velocity — throwing it harder would make short flicks
      overshoot while doing nothing for the tail, which is the part he can feel.
- [x] **104 — PC: the timeline overshoots the end and snaps back.** **DONE v6.67.** His words: *"on pc when you swipe
      left and right on the timeline and it hits the end it glitches a little bit, like it keeps going
      past the wall but then corrects itself and pulls back."* So the momentum keeps integrating past
      the clamp and the position is corrected afterwards, instead of the glide being STOPPED at the
      wall. Fix the momentum to end at the boundary rather than letting it run and yanking it back.
      RELATED to 103 — a longer glide will make this worse and more visible, so do them together.

- [ ] **101 — Timeline ruler notches vanish when fully zoomed IN.** *NOT REPRODUCED, and my first
      diagnosis was wrong — recorded so nobody re-walks it.* I found the notch thinner capping on
      `totalFrames / frameStep > 1500`, i.e. on the WHOLE project rather than the visible window, and
      built a windowed renderer for it. Then measured, and the cap never binds: at MAX zoom the ruler
      shows 11 notches at 25px spacing, and that is **identical for a 60s, 300s, 900s, 1800s and 3600s
      project** — 236 nodes every time. `viewDur()` already bounds what the ruler covers, so project
      length never reaches the cap. The windowing was reverted (it was a node-count optimisation
      justified by a wrong cause, 236 -> 27, not a fix for this). STILL UNREPRODUCED: notches are
      present at max zoom on this machine. Next: get the exact zoom + project length from his device,
      or have him screenshot the ruler at full zoom — his earlier screenshot DOES show ticks, so the
      failing state may be a specific zoom step rather than "fully in". His words: *"It appears the little
      notches are missing, there are some if you zoom out but not at fully zoomed in."* Screenshot at
      v6.64 shows the ruler nearly bare. Note this is the opposite of what you'd expect — zooming in
      should give MORE notches (one per frame at full zoom, which v2.53 built deliberately), so
      something is culling them at the densest end rather than failing to draw them at the sparse end.
- [x] **102 — The playhead line is off-centre under its triangle.** **DONE v6.71.** His words: *"the playhead is
      actually off centred to its little triangle at the top, if you just slightly move over the little
      start triangle bit to the left it should be good."* So the TRIANGLE moves left a touch, not the
      line — the line is the accurate one and must not move, since it is what everything is measured
      against.

- [x] **100 — Dragging a timeline clip still selects it; I want to drag without selecting.** **DONE v6.66.** His words:
      *"Dragging a clip still selects it, I want to be able to drag layers without selecting them, right
      now it just selects it but doesn't show the ui."* Note the second half — this is TWO things. The
      drag is selecting the layer (it shouldn't), AND the selection it makes is a half-selection: the
      layer becomes selected but the inspector UI does not come up, so you end up in a state that is
      neither "not selected" nor "properly selected". Fixing only the first half would leave a layer
      silently selected with no UI, which is the worse bug of the two. Related to #58 (hold a clip to
      drag it without selecting first, shipped) — so this is a REGRESSION or that fix only covered the
      hold path and not the plain drag.
- [ ] **97 update — the freehand "dead band" did NOT reproduce on a clean load, and my first fix was
      inert.** I found a 303px empty band above the drawing area and shipped a CSS rule to collapse it —
      then mutation-checked it and the rule changed nothing: with it deleted before entering drawing
      mode on a fresh load, the grid rows are `52px 792px` and the canvas is 374x666 either way, byte
      for byte. The band I "reproduced" was my own testing artefact (I had resized the browser from
      desktop to phone width WITHOUT reloading, and the stale grid survived). Rule reverted rather than
      shipped. His screenshot still shows a real ~212px band on a real phone at v6.60, so the bug is
      real and the cause is still unknown. NEXT: the likely difference is the ROUTE — I called
      FM.startDraw() directly, whereas he goes Add sheet -> Freehand Drawing, and the sheet closing may
      be what leaves the grid stale. Reproduce via the add sheet, not the API.

- [x] **99 — Rotate dial should snap every 45 degrees.** **DONE v6.63.** His words: *"The spin tool should have snapping
      every 45 degrees."* i.e. the rotation control catches at 0/45/90/135/180/225/270/315. Needs a pull
      threshold so you can still land on an arbitrary angle by dragging past the notch — a hard snap that
      makes 47 degrees unreachable is worse than none. The existing snap idiom in this app is the Move &
      Transform trackpad (snaps) vs the canvas drag (free), so match that feel, and give it the same
      haptic tick the other snaps use.

- [ ] **97 — Freehand drawing is STILL broken (4th report), with a phone screenshot at v6.60.** His words:
      *"Freehand drawing is still broken."* The screenshot is the useful part: the drawing surface is a
      SEPARATE black rectangle that does not line up with the comp preview above it — the comp is a
      partial strip at the top, and the draw area is a second, differently-placed black box below it. So
      whatever you draw cannot land where you aimed. Previous attempts (#27 "should fill the screen",
      #60 "fix the bugs and the look") both shipped and both missed, which says the earlier fixes were
      verified synthetically and not against the real phone layout. DO NOT fix this one blind again —
      reproduce the misalignment at phone size first and prove the draw surface and the comp share one
      coordinate space.
- [ ] **98 — Add Text could be better (phone screenshot at v6.60).** His words: *"add text could be
      better."* From the screenshot: (a) TWO separate confirm buttons on screen at once — the blue ✓ in
      the top bar and another ✓ in the bar above the keyboard; (b) that second bar also carries ^ and v
      arrows and eats a row of space on an already-cramped phone; (c) the size says 225 pt but the
      rendered "Text" is tiny in the frame, so either the pt value is not what is being drawn or the
      readout is lying — measure which before changing anything; (d) the text box and its handles are
      small and fiddly at that size. Not a crash, a quality pass — but it is the screen people meet
      first when they add text.

- [ ] **96 — Adding a SONG is really buggy and sometimes will not play at all, as the only clip.** His
      words: *"I just tried adding a song and it's really buggy and won't even play at all sometimes, and
      it's the only thing in the timeline."* "Only thing in the timeline" rules out mixing, layer count,
      render load and effect cost — this is the audio path failing on its own. "Sometimes" means a RACE,
      not a broken code path: most likely the decode/AudioBuffer not being ready when play() is called,
      or a play generation token cancelling the start. Together with 95 (voice memo stutters) and 72
      (import loses parts of the file) this is now THREE separate audio reports, and it is the most
      broken thing in the app — treat the audio cluster as top priority over polish work.

- [ ] **95 — Phone: timeline still laggy AND audio does not play smoothly (tested with a voice memo).**
      His words: *"Timeline on my phone is still really laggy and the audios don't play smoothly, I just
      tested adding a voice memo."* This is a REAL-DEVICE report, and that matters: the two measured
      causes behind the earlier lag item were fixed at v6.33 and the desktop numbers came back fine, so
      whatever is left does not reproduce on this machine. Do not "fix" it against desktop timings again.
      Overlaps 69 (audio must never lag — make the audio clock the master) and the standing PERF item;
      the voice-memo detail is the useful lead, because a recorded memo is a fresh decode with no cached
      frames or waveform, unlike an imported song. Needs profiling on HIS phone, or a throttled-CPU
      profile as the nearest stand-in, before touching anything.

- [x] **94 — Film grain in the menu is too jumpy and too obvious.** **DONE v6.62.** His words: *"The film grain in the
      menu is too jumpy and too noticeable, need to make it move smoothly and less noticeable."* Two
      separate dials: AMPLITUDE (how visible each grain is) and TEMPORAL BEHAVIOUR (how it changes frame
      to frame). "Jumpy" is the second one — a grain that re-randomises every frame strobes; real film
      grain drifts. Likely this is the moving static over the home project cards from #76, so check that
      first, and confirm with him which screen he means if there is more than one grain in the menus.

- [ ] **93 — Wiggle should see OTHER effects' motion, and behave in corners.** His words: *"I want the
      wiggle effect to also work when you have other effects that make it move, and also it should work
      in corners better."* Two parts. (a) Wiggle currently jitters the layer's own transform, so a layer
      being moved by something else — Drift, Orbit, Spin, a camera, a parent group — doesn't get wiggled
      along that motion. (b) Corners: needs measuring before I guess, but the likely cause is that the
      wiggle displaces without expanding the plate, so at a frame edge the offset content is clipped
      instead of moving. RELATED to 31b (transform blur can't smear effect- or camera-driven motion) —
      same underlying gap, that effect-driven motion isn't visible to the things that should react to it.
      Worth checking whether one fix serves both.

- [x] **92 — Favourites: kill the sideways swipe, open it by pulling DOWN on Recents.** **DONE v6.61.** His words:
      *"With the faves section I want it to be really easy to open, remove the feature of swiping right
      to see ur faves, just make it if you swipe down on recents it does a clean little animation and
      opens up the faves menu you have just built."* So: the "Recents & favourites" block is currently
      a sideways PAGER — Recents is page 1 and your favourites are pages 2, 3… behind a swipe right,
      with page dots. That paging goes. The block becomes just Recents, and a pull-down on it opens the
      full-screen Favourites browser from #74 with an animation. The ▲ "All favourites" strip below it
      stays a tap target, because a gesture nobody told you about is how Group ended up unreachable on
      PC (#53) — but it stops being the only way in.
      NOTE: `js/audio-fx-browser.js` has the same sideways pager for AUDIO effects. Left alone for now
      — he asked about the effects browser, and the audio one has no full-screen favourites view to
      open. Say the word and it gets the same treatment.


### Bugs
- [x] **Captions never open the text editor.** **DONE v6.36.** `addCaptionLayer` added the track and
      stopped; `addTextLayer` opens the editor on its placeholder. Now it scrubs to the first cue and
      opens the editor on it, which is the same pair the cue buttons in the Aa sheet already used.
- [ ] **Six effects' option buttons run off a phone, last options untappable.** Measured at 380px:
      Channel Remap overflows by 434px, HSL Bands 169, Text Transform 106, Mirror 97, Thermal 71,
      Match Grade 25. Pre-existing. The fix is a taste call — equal-width-with-ellipsis vs wrapping to
      two rows vs horizontal scroll — so it is yours to pick.
- [x] **Landscape phone (844x390) text editing is cramped.** **DONE v6.41.** A landscape phone is
      over 700px wide, so it gets the desktop layout — which gave the bottom row a flat 232px no
      matter how short the screen was, i.e. 60% of it. Worse, if you'd ever dragged the timeline
      taller on a big screen, that height was remembered and followed you: a stored 270px left the
      canvas 120px. Both now shrink only on short screens. Measured: canvas 145x145 → 194x194, and a
      desktop keeps exactly the height you dragged.
- [ ] **Playhead missing when a project opens.** Needs an app restart to come back.
      *Status (v6.31):* the known cause IS fixed and now tested on BOTH paths — a recompute landing
      mid-animation no longer stores the translated edge, on the project-open push and on the
      return-to-home pop that v6.27 added. Measured drift under 1px on both, with a control assertion
      proving the panel really was moving so the test cannot pass vacuously.
      **Left open on purpose:** Ezra reported this AFTER the first fix, so if it happens again it is a
      third cause and these two are ruled out. Worth knowing next time: does the playhead ELEMENT
      exist and is it just mispositioned, or is it missing from the DOM entirely?
- [ ] **Editing lags, and gets bad fast.** *Status (v6.33):* the two measured causes are fixed —
      playback went 95.09 → 17.43 ms/frame on a 6-layer comp (5.5x, dropped frames 191 → 3) and
      forced layouts per tap are now FLAT with layer count instead of linear (211 → 5 at 80 layers).
      Left open until Ezra confirms it feels better on his own device and projects.
      **Known and NOT fixed:** FM.media never releases a deleted clip's record, so memory grows with
      every import you throw away. That one needs undo-stack surgery and was deliberately deferred.
- [x] **72 — Audio import loses parts of the file.** **DONE v6.64 — it was TWO separate bugs.** *"when it's importing the audio it literally cuts
      out certain parts making it jumpy, even on the timeline you can see how it's missing parts"*.
      Not lag — actual missing audio. **HALF DONE, and I owe you an admission on the bookkeeping:**
      the half you can SEE was fixed back in **v6.08** ("fix the gaps in a long clip's waveform") and
      nobody ticked it here, which is the exact thing this file exists to stop. Re-verified from
      scratch tonight with a new probe (`tests/_audiogaps.html`): a synthetic file with no silence in
      it at all, at 10s / 60s / 3min / 5min, decodes to its full length every time and produces **zero
      silent bins** in the drawn waveform. So the timeline is no longer lying to you.
      The half you can HEAR is still open, and I could not reproduce it. What I have RULED OUT, by
      measurement rather than by reading: the decode is not truncated (full duration, all four
      lengths), the decoded audio has no silent spans, the waveform binning invents no holes, and the
      playback sync only hard-seeks past 350ms of drift with a 400ms minimum gap, so it is not
      chopping the sound to stay in time. **What I need from you:** the actual file, or its name and
      format. Synthetic WAV is clean through every path, so whatever this is lives in a real encoder's
      output — a VBR mp3 or an m4a whose duration the browser reports wrong is the obvious suspect and
      I can't conjure one that misbehaves. Related to 69 (audio clock) but not the same bug.
- [x] **58 — The red delete bar flashes during fast scroll** in the effects list. **DONE v6.37.**
      The red panel was painted behind EVERY row all the time, hidden only by an opaque wrapper that
      had `will-change: transform` on it permanently — which makes every row its own compositor
      layer, and lets a fast scroll show the parent (red) before the rows repaint. The gesture code
      was never the problem. Now the panel is hidden outright until a swipe actually starts, so
      there is nothing to flash. Checked in the real app on your phone width, not just in the tests.
- [x] **89 — Letterbox and Border Frame paint over the layers below them.** **DONE v6.35**, on the
      fourth attempt. Both effects drew their frame against the effect PLATE's edges, and that plate
      is the size of the project, not of the layer — so a Letterbox on a small layer barred the whole
      frame, and each kernel forced alpha to 255 there, manufacturing opaque pixels that erased
      whatever was underneath. Both are bounded to the layer's own box now, so they frame the layer
      they are attached to and cannot reach anything else. Three passes were refused first: one no
      longer applied to current code; one snapped to "full-frame" on a 4px tolerance measured in
      plate pixels, which a shrinking preview slipped under; one tested the padded, strided bbox
      instead of the pixels, so a layer a few px inside the frame still erased a rim. The edge test
      now reads the plate's four edge lines directly. The third pass also carried a regression of its
      own — a thin layer whose alpha the strided scan could not see was DELETED from the composite
      rather than left unframed — which is fixed here and now has a test. Verified: 288-config
      byte-identity sweep vs v6.34, 0 full-frame configs changed (saved projects don't shift), 0
      control effects changed; suite 198/198 at desktop and 380px, both new tests mutation-checked.
      Known and left: on a layer only ~1px tall at reduced preview scale the bar/ring can't be drawn
      at all, so it no-ops — exports at scale 1 are unaffected.
- [x] **53 — PC is missing the Group and Mask options.** **DONE v6.38.** The actions were always
      there (the ⧉ menu and right-clicking a clip both had them) but the BUTTON was phone-only —
      measured at 1440x900 with two layers selected, the Group button reports zero size, because it
      lives inside a phone-only media query. So on PC there was nothing in the place you'd look.
      Now the same button sits in the PC bar and opens the same Group / Masking Group menu, appearing
      once you have 2+ layers selected. Checked by actually clicking it in a 1440px window: menu
      opens, Group makes a real group with both layers in it.

### Features and changes
- [ ] **Check I changed the right "Presets".** v6.30 gave live per-layer previews to the preset rows
      in the EFFECTS BROWSER. The inspector category card literally named **Presets** is a different,
      older system (saved effect stacks, no tiles, empty on a fresh install) and is untouched. If the
      menu you meant was that one, say so and I will move it — merging the two is queue 37's real job.
- [ ] **A documented conflict, your call.** `NEXT-SESSION.md:183-192` says in bold *"Supersedes the old
      thumbnail spec — do not build preset thumbnails"* and specs a full-screen preview player instead.
      I built the thumbnails because that is what you asked for tonight. The engine behind them is
      exactly what that player would need, so nothing is wasted either way.
- [x] **68 — Speed should retime keyframes.** **DONE v6.39.** Changing Speed already re-timed the
      clip but left every keyframe where it was, so a 2x speed-up halved the bar and left the
      animation running past the end of it. Now the whole animation stretches with the clip. And
      Speed is offered on **every layer type** — which looks like it undoes 83/38 ("Speed does
      nothing on shapes but is still offered") and doesn't: greying it out was the cheap answer to
      that, and now that it retimes keyframes it genuinely does something on a shape or text layer,
      so the control is live instead of hidden. Checked by actually dragging it on a shape: speed
      100% → 200% takes a 4s clip to 2s and moves its keyframes from 0/2/4 to 0/1/2.
- [ ] **69 — Audio must never lag.** Make the audio clock the master.
- [ ] **70 — Extracted audio should look like an audio track.** *"it doesn't show it like an audio
      file, with the bumps to volume or whatever it's called"* — i.e. a waveform.
- [x] **74 — Swipe up for a full-screen Favourites browser.** **DONE v6.40.** All three sorts, each
      invertible (press the active sort again to flip it) — Recent, Type (grouped under category
      headings) and A–Z. Your choice is remembered. **One decision I made and one I left to you:**
      the swipe lives on its own strip under the page dots rather than on the whole block, because
      the browser scrolls vertically and a swipe-up over the block IS the scroll gesture — claiming
      it would make the page unscrollable right where you need to scroll. The strip is also a button,
      so it can just be tapped. And I did **not** remove the left-right pager between Recents and
      Faves: *"replacing the swipe-right between Recent and Faves"* reads two ways (drop the first
      swipe, or drop the endless swiping through fave pages) and I won't delete a working gesture on
      a coin flip. Tell me which and it's a one-line change.
- [x] **Tiny: "Color & Light" is spelled the American way** **DONE v6.72.** in the effects browser's categories,
      which looks odd next to the "Colouring" rename you asked for in 83. Say the word and I'll
      change it — it's your app's voice, not mine to decide.
- [ ] **Per-effect-slider keyframes.** *"each effect slider having its own key frames still doesn't
      exist fully"*. **Measured, and it is more finished than that** — here is exactly where it stands,
      because "doesn't exist fully" needed a number rather than another guess.
      **Visual effects: 499 of 499 sliders are keyframable.** Verified end to end, not just counted:
      the ◆ and the easing button render on every slider row, keyframing Gaussian Blur's radius at 0s
      and 4s interpolates 6 → 23 → 40 through the middle, and tapping the parameter's NAME scopes the
      timeline to that parameter's diamonds. So for visual effects this is done.
      **Audio effects: 54 of 60.** The six without are Reverb Size, Reverb Decay, Distortion Drive,
      Bit Crush Bits, Lo-Fi Amount and Pitch Shift Semitones — and they are not an oversight. Every
      one rebuilds a BUFFER or a CURVE instead of driving a normal audio parameter, so animating them
      means rebuilding that thing on every frame. I measured the cost:
      · **Reverb Size / Decay — correctly left out.** Rebuilding the room takes **12.5ms** at the
        longest decay, which is 75% of a whole frame's budget for one effect, and swapping the room
        mid-tail would click even if it were free.
      · **Distortion Drive, Bit Crush Bits, Lo-Fi Amount — I WAS WRONG ABOUT THESE. Measured now.**
        I said they were real candidates because the rebuild is cheap (0.24ms). Cheap to compute is
        not the same as clean to hear, and I can measure the second thing after all: a click is a
        sample-level jump, so rendering a swept curve through an OfflineAudioContext shows it.
        **All three click.** Worst sample-to-sample jump against each effect's own static control:
        Bit Crush **6.8x**, Distortion **2.8x**, Lo-Fi **1.7x**. Not one is clean.
        Two things I got wrong inside that, both worth knowing:
        - It is **not** about how far the slider travels. Bit Crush 12 → 8 bits is clean; **6 → 5, one
          single step, clicks.** At low bit counts the levels are coarse, so a small change moves every
          output sample.
        - It is **not** about the curve being smooth. I assumed Distortion would be fine because it is
          a tanh at 4x oversampling. It is the worst of the three after Bit Crush.
        **The real reason, which points at the actual fix:** every one of these is implemented as
        "rebuild the transfer curve". Swapping a curve is a STEP CHANGE — the same input sample maps
        to a different output the instant it happens — so smoothness *in x* cannot help; what is
        missing is continuity *in time*. Making these animate properly means crossfading between two
        shaper nodes, or driving the parameter through a real AudioParam instead of a curve rebuild.
        That is a bigger job than flipping a `keyframable` flag, and now you know that before asking
        for it rather than after hearing it.
      · Pitch Shift Semitones — not measured yet.
      **Held pending your call**, for the same reason as 72: making those three animate means audio
      automation I cannot HEAR, and a slider that clicks or zips every frame is worse than one that
      doesn't animate. Say the word and I'll build the three cheap ones and you can listen.
- [ ] **47 — Export must not lose the render on a crash,** and should get off the main thread.
      Chunk-replay resume is proven; not landed.
- [x] **48 — Squish:** a new effect where the layer deforms against the canvas edges. **DONE v6.42.**
      The frame edges are solid now: slide a layer off-frame and it squashes against the wall instead
      of being cut off. Put a Bounce ease on Position and the impact squash comes free. Six controls
      (amount, spread, bulge, firmness, inset, walls). Same story as the voice recorder — it was built
      and verified weeks ago, never committed, and survived only in a worktree. Proof it works: a ball
      driven past the right wall is clipped to 100x140 without it and squashes to 100x212 with it.
      Nothing else moved — 288 of 288 configurations byte-identical against v6.41.
- [ ] **37 — Presets rework:** AM's "Preset preview" screen. Supersedes the earlier thumbnail spec.
- [ ] **31b — Transform blur can't smear effect- or camera-driven motion.**

### Work that exists but isn't landed
- [x] **Every other recovered diff is now landed.** Checked at v6.42, and the answer is that the
      `.claude/staged/` folder was lying to us: all twelve diffs in it had ALREADY shipped. Confirmed
      two ways — none of them still applies, and the feature each carries is present in main
      (fractal → v6.x, iridescence → v6.x, occlude → v6.15, lag → v6.33, preset-preview → v6.30,
      textedit → v6.29, voice-recorder → v6.34, letterbox → v6.35, squish → v6.42). They have moved to
      `.claude/staged/applied/` with a README saying so, because a folder named "staged" full of
      diffs reads as unlanded work and costs a session an hour to disprove.
- [ ] **Rebuild the two lost audio diffs** (reverse + misc). These were verified but staged in /tmp and
      the reboot destroyed them. No worktree has them — they are genuinely gone and must be rebuilt.
      *Held:* `audio-envelope` stays deliberately unlanded — its eviction corrupts exports.
- [ ] **Continue the EFFECTS-PLAN build rounds.**
- [ ] **Clear the rest of the BUG-HUNT backlog** (~59 items).

### Held, on purpose
- [ ] **The visual identity pass before any public release.** The UI is modelled on Alight Motion and
      has to be made our own before publishing. See [BEFORE-PUBLISHING.md](BEFORE-PUBLISHING.md).
      *Held because* copying AM was the fast way to build and the app should be worth publishing
      before we spend time on identity — but this gets raised the moment Ezra mentions launching,
      the App Store, a public link, a demo or a tutorial series.

---

## Done

Newest first. Every one of these has a line in [POLISH-LOG.md](POLISH-LOG.md) with the detail.

- [x] **Voice recorder landed.** Add menu → Audio → "Record voice…". Built weeks ago, lost to the
      reboot before it was ever committed, recovered from a worktree and rebased 40 releases forward —
      v6.34
- [x] **59 — One effect clipboard.** There were two that could not see each other, so copying one
      effect from a row's ⋯ left the panel's Paste greyed out — v6.32
- [x] **Presets preview the selected layer** with the preset applied, instead of a generic sample.
      Also fixed a cache-poisoning bug it exposed — v6.30
- [x] **88 — Text adding fixed on PC.** A desktop layout had never been written — the phone
      bottom-sheet WAS the desktop layout. Also fixed a data-loss bug it exposed — v6.29
- [x] **63 — Fractal Ridges: colour, overlay/blend, and it actually MOVES.** It was measurably a
      still image before — t=0 vs t=0.5 differed by exactly 0 — v6.28
- [x] **64 — Iridescence gained Blur and Motion.** It also did not move at all before — v6.28
- [x] **60 — Returning to home reverses the open animation** — editor leaves right, home returns from
      the left — v6.27
- [x] **Easter egg: pull the home list past the top and it slams back and shakes the screen** — v6.25,
      and on PC by *scrolling* past the top with a wheel or trackpad — v6.26
- [x] **Onion skin, Snapping and Guides are one tap away again,** on the ⛶ view bar. They had moved
      into Settings as agreed, then two of my own later changes buried them three taps deep — v6.24
- [x] **76 — Subtle moving static over every project card,** like the reference photo — v6.23
- [x] **71 — Multi-select bar: group and delete moved to the right.** The bin is deliberately not
      flush in the corner — that is where Export lives, and a reflex aimed at Export must not delete
      your selection. Group takes the outer slot instead — v6.22
- [x] **73 — Clip names stay at the clip's start,** not following the scroll — v6.21
- [x] **67 + 31 — Every numeric inspector control is a real slider,** not a browser range input.
      One fix in `rangeRow` covered all 37 of them — v6.20
- [x] **65 — A finger on a slider no longer eats your scroll** (it was silently zeroing values) — v6.19
- [x] **The PC back button is just the arrow now,** no label — v6.18
- [x] **87 — Selecting templates and elements works** (the bar counted the tap, the card never
      showed it) — v6.17
- [x] **84 — Effect previews render at 2×,** plus the filter-scale bug behind it — v6.16
- [x] **Fill Behind erased every layer beneath it** — the disappearing-layer bug — v6.15
- [x] **85 — Effect category colours are brighter** — v6.14
- [x] **35 — The last ⋯ menu is gone** (the phone's) — v6.14
- [x] **86 — Export sits above the cog** in the Studio rail — v6.14
- [x] **78 — Settings can clear the songs and media import history** — v6.13
- [x] **79 — The home background moves faster** — v6.13
- [x] **75 — OPEN badge reverted, and the open project has a travelling glint** — v6.13
- [x] **The export button's shine is properly blurred** — v6.13
- [x] **80 — The PC settings cog opens the right menu** — v6.13
- [x] **81 — The PC back arrow reads as a back button** — v6.13
- [x] **82 — The project name shows in the ADD panel header** — v6.13
- [x] **83 — "Colour & Fill" is "Colouring", and its icon no longer looks like fire** — v6.13
- [x] **77 — The nine inspector category icons are coloured** — v6.12
- [x] **Paste Style gained Speed and Volume** — v6.11
- [x] **The effect open/close control is findable** — v6.10
- [x] **The logo-crystal buttons went back to Liquid Glass** — v6.09
- [x] **66 — Ezra's own photos are the effect thumbnails**
- [x] **62 — Effects can be favourited, including from the ⋯ menu**
- [x] **61 — Hovering a benchmark turns the highlighted section yellow**

Everything before this is in POLISH-LOG.md from v2.31 onward — roughly 90 more shipped items,
including the camera, captions, speed ramping, the easing editor, the shape library, the Studio
layout, motion blur, the elements browser and the effects browser.
