# Ezra's requests — the running list

> ## ⚠️ OLDEST FIRST
> The next item to work on is the **lowest-numbered open `- [ ]` entry in this file**. New requests are
> added at the bottom and wait their turn. The file is NOT in numeric order — find the next one with:
> ```bash
> grep -n "^- \[ \] \*\*[0-9]" REQUESTS.md | sed 's/^\([0-9]*\):- \[ \] \*\*\([0-9]*\).*/\2 (line \1)/' | sort -n | head
> ```
> Only two things jump the queue: he says so explicitly, or the build is broken. Blocked on a decision
> from him is **not** done — say so, and move to the next-oldest.


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
6. **New requests go at the BOTTOM of Open, not the top**, and the list is worked from the top down.
   His words, 14 Aug: *"whenever i say something to do you write it down in the list and put it at the
   bottom then continue working down the list."* I had been prepending them, which put the newest work
   first and buried the oldest — the opposite of what he asked for.

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

### How he wants this worked (13 Aug 2026, standing)

*"Continue with the list, ticking one thing off at a time… make sure everything is quality tested as
good as possible, dont stop to ask me questions, ask but keep going and re ask next time i say
something."* So: **one item at a time, all the way to shipped**, questions written down and asked
again next time he speaks rather than used as a reason to stop. Plus a specific one worth keeping —
*"make sure no workflow agents get stuck in a never ending loop like last time"*: any fan-out gets a
hard iteration bound and a dry-round counter, never an open `while` on an agent's own answer.
And on pacing — *"ticks should be sooner, no need to be waiting around doing nothing for a quote on
quote tick"*: don't idle between turns. 60s is the floor the scheduler allows, so that is the delay;
better still, keep working inside the turn rather than parking work for a later tick.

### In flight right now
- [x] **127 — Paste Style icons are stale.** (v6.89) His words: *"Paste style menu needs to reflect the current
      icons that have since changed."* Screenshot at v6.73: the Paste Style grid still uses the OLD
      category glyphs while the inspector below it shows the current ones (the gradient-coloured set from
      #77). Same nine categories, two different icon sets on screen at once.
      **Shipped v6.89, and the fix was to delete the second table rather than re-copy it.** Paste Style
      kept its own private list of flat single-path glyphs, which is why it drifted the moment the cards
      were regraded — copying the new paths across would only have reset the clock on the same bug. The
      grid asks the same `catIco()` the cards ask now, so there is nothing left that can go stale. The
      Text tile was a literal "Aa" in text, the one tile that was not an icon at all; it shows the
      serif-T glyph the Edit Text card shows. Off tiles are desaturated instead of recoloured, since a
      self-coloured icon cannot show on/off by changing its colour. The suite compares every tile's
      markup against the inspector's own, so a third table cannot grow back quietly.
- [ ] **128 — Opening/closing a project feels janky.** His words: *"the animation when opening a project
      feels janky, the fix is make it so the animation of the project layer moving to the left happens
      instantly, so it feels responsive, make sure it's smooth, then smoothly the project should swoop in
      too. Needs to be smoother and less janky when leaving a project also."* Note he has prescribed the
      FIX, not just the symptom: the card's exit should start on the very first frame with no wait, and
      the editor's entrance follows. Likely the two are currently sequenced or both wait on a layout/
      render that stalls the first frame — measure where the first frame goes before retiming anything.
      **MEASURED (tests/_openjank.html), and half of the prescription is right and half is not.**
      `openProject()` reads `await FM.projects.open(id)` and only THEN calls `home.close({push})`, so
      the card provably cannot move until the load resolves — that part is arithmetic. What that costs:

      | | desktop (1x) | 6x CPU throttle ≈ a phone |
      |---|---|---|
      | dead wait before the card moves | 28 ms median | **113 ms median** |
      | worst frame DURING the push | 18 ms | **18 ms** |
      | frames over 50 ms during the push | 0 | **0** |

      So **the animation itself is not janky** — it is a CSS transform running on the compositor and it
      stays smooth even at 6x throttle. There is no stutter to fix. What is real is the dead time before
      anything moves: 113 ms at phone speed on a FOUR-LAYER project, and it grows with project weight,
      which is exactly "doesn't feel responsive".
      **Not done unsupervised, deliberately.** The naive fix — start the push before awaiting the load —
      risks showing the PREVIOUS project sliding in for ~113 ms before the new one swaps in, which is a
      worse artefact than the one being fixed. The safe design is a two-phase push: the lead card's exit
      starts on the tap (literally his words), and #app's entrance is armed when the load resolves. That
      means splitting `startPush`, which is a delicate path — warm/cold lead, the press hand-off, the
      animationend backstop — that has been iterated several times already, and the payoff is a feel
      change I cannot judge from here. **Wants his eyes: worth 113 ms?** Asking next time he speaks.
      Also added: `tests/_probe.py --cpu N` (CDP CPU throttling), because every perf number in this repo
      is taken on a desktop Mac for an app used on a phone, and this item measured perfectly healthy at
      1x. #125/#130 should be re-measured with it.
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
      **PART-WAY, and there is something here he needs to decide.** Reading the ladder (`notePlaybackCost`
      in js/app.js) turns up a deliberate LATCH: a tier drop has to *earn its place*, and if shedding
      pixels does not cut the frame cost by 15% the tier is put straight back and the ladder stops
      probing. That latch exists because of **his own earlier request, queue 54** — *"its having to lower
      the quality when i do something as simple as just have one simple video"*. So #54 and #130 ask for
      **opposite behaviour**, and the code currently implements #54.
      The measured reason the latch is right: on one plain 2048×2048 clip, **thirteen times fewer pixels
      bought only 32% less frame time**, because decoding a video frame costs the same whatever canvas
      it lands in. Dropping the resolution genuinely does not fix his lag — which is also why he is right
      in the last line of his own report, *"for this one thing it shouldn't need to do that anyway"*.
      **So "it doesn't compress the quality" is probably not the bug.** The bug is the lag itself, and the
      quality drop was only ever a way of hiding it. The real work is the VIDEO DECODE path (#125's
      standing note).
      Added `FM._perfState()` — a read-only snapshot of tier / renderAvg / latch / canvas pixels — so
      this claim is checkable from outside instead of by reading the source and guessing.
      **MEASURED PROPERLY NOW, and it explains your report exactly — both halves of it at once.**
      Two earlier attempts at this probe were thrown away rather than reported: shapes cost 0.08 ms a
      frame, and eight Gaussian Blurs on a 1080×1920 comp at 6× CPU throttle cost **1.1 ms**. Neither
      put the ladder under any pressure, so neither could say anything about what it does under
      pressure. The third attempt, with per-pixel (CPU) effects, finally did:

      | load | frame cost the ladder measures | what the ladder did |
      |---|---|---|
      | 8 Gaussian Blurs, 1080×1920, 6× throttle | **1.1 ms** | nothing — it had no reason to |
      | the same comp with per-pixel effects | **16.4 ms** | dropped tier 0→4, canvas 571k→132k px, then latched |

      **So the ladder is not broken. It is BLIND to the costs that actually make your app lag.**
      It reacts to main-thread render time, and two of the biggest real costs never land there:
      **Gaussian Blur and friends compile to a canvas `filter`, which is GPU work**, and **video decode
      happens off the main thread as well**. The app can be visibly stuttering while the number the
      ladder watches reads perfectly healthy — so it correctly concludes there is nothing to do.
      That is precisely your sentence: *"the project lags from just that, it also still doesn't compress
      the quality"*. Both true at the same time, and not a contradiction.
      It also fits the older measurement in this file: 13× fewer pixels bought only 32% less time on a
      plain video clip, because decode dominated and decode is invisible here.
      **The fix direction, for you to okay:** drive the ladder from the frame's REAL cadence — wall-clock
      frame interval and dropped frames, both of which the app already tracks — instead of from the JS
      render duration alone. Then a GPU or decode stall counts as "we are behind" like anything else.
      **Not doing that unsupervised**: it changes playback behaviour globally, and you have asked for
      opposite things here twice (#54 "stop lowering the quality on one simple video" vs this one), so
      the threshold is a taste call as much as a technical one.
- [x] **131 — The overpull Easter egg freezes if you drag really far.** (v6.77) His words: *"there's a glitch now
      when you swipe down really far and then the Easter egg happens where it slams the screen, if you try
      dragging really far down it just freezes, you should still be able to drag it down as freely as you
      want and at any point of letting go after a certain amount it does the slam."* So the pull is being
      clamped hard (PULL_MAX 150 with a pow(dy,0.78) curve) and reads as a freeze once you pass it. He
      wants the drag to keep responding at any distance, with the slam on release past the threshold.

- [x] **142 — Home settings: a default colour for new shapes.** (v6.92) His words: *"In the home settings menu,
      make a setting to change the default colour of shapes when you import them. Applied to every
      shape."* So a colour control in the HOME settings cog (the app-wide one, not a project setting),
      and every shape added from then on starts in that colour instead of the current hard-coded default.
      Points to settle when building: it applies to shapes ADDED AFTER the change, never retroactively
      recolouring shapes already on a timeline; it should cover every shape the add menu offers (and the
      freehand/vector paths, which also create fillable layers); and it wants a sane reset-to-default.
      Check whether elements/templates carrying their own colours should be exempt — a saved element
      arriving in your colour instead of the one it was designed in would be wrong.
      **Shipped v6.92.** Settings → *Default shape colour*, sitting with Default layer duration since both
      answer "what is a new layer like?". Two states: a colour you pick, or **Random** — the app's
      long-standing behaviour, a fresh vivid hue per shape — which doubles as the reset. The swatch shows
      a spectrum when it is on random and the colour itself when it is not.
      Every point above is covered. It reaches **every** route that spawns a shape, including freehand and
      vector drawing, because it hooks the ONE line in `makeLayer` that decides a shape's fill. It is
      creation-time only, so shapes already on a timeline are untouched. And the exemption holds by
      construction: anything arriving WITH a fill — a saved project, a template, an element, an AI layer,
      a duplicate — passes it in and is never repainted.
      The test guards the exemption specifically, since silently recolouring a saved element is the one
      way this feature could do real harm; it also checks that corrupt storage can never reach a canvas
      fillStyle. Mutation-checked by removing the exemption, which reddened this test **and five effects
      tests** — that line is load-bearing well beyond this feature. Verified at 380px in both states.

- [ ] **141 — Export screen: prettier, custom ratios + fps, and our OWN save dialog.** His words: *"idk
      if you remember me saying this but I want the export screen to be prettied up and there's no way to
      do custom export ratios, or fps. And if you made a custom fps or other things etc there's no way to
      export at that. Maybe instead of the apple pop up we should have our own pop up so it looks
      finished and good. As pristine as possible."* Four separate things, and the third is the bug:
      1. **Custom is missing from export.** The canvas/project pickers offer Custom; the export dialog
         does not — I flagged exactly this when queue 119 landed the ordering. Needs custom fps AND a
         custom aspect/resolution.
         **PART 1 SHIPPED, v7.09.** The resolution list now ends with **"Custom size…"**, which reveals
         width and height fields. Every other rung is a uniform SCALE of the project, which is exactly
         why the dialog could only ever offer the project's own aspect — a custom size hands the exporter
         explicit dimensions instead.
         **The frame is CONTAINED in whatever you type, never cropped.** Exporting 9:16 work as 1:1 has to
         letterbox, and the alternative — cover/crop — silently throws away part of what you made, which
         is not a size option. The bars take the project's own background colour, or stay transparent on a
         transparent export. The bitrate is sized off the REAL output too, or a large custom render would
         have been encoded at the project's bitrate and come out starved.
         The fit maths is a pure exposed function so it can be tested without running an encoder — an
         export is the one operation you cannot casually re-run to check.
      2. **A project already on a custom setting cannot be exported at it.** This is the real defect:
         you can build at a custom fps or ratio and then have no way to render it out that way. Export
         should always offer "same as project" and default to it.
         **PART 2 SHIPPED, v7.08.** The frame-rate list was a fixed ladder whose own comment read "there
         is no Custom on this dialog", so a project built at 48fps could not be rendered at 48 by any
         route. It now leads with **"Same as project — N fps"**, labelled with the project's real rate so
         you can see what you are getting, and it SELECTS itself automatically whenever the project's
         rate is not one of the fixed rungs — which is precisely your case. A standard 30fps project
         still lands on its own rung, so nothing changed for the ordinary path.
         Resolution already had this covered (the list is built per-project and leads with "Full — W×H").
         Still open in this entry: **1** (a custom ratio/resolution in the export dialog), **3** (prettied
         up), **4** (our own save popup instead of the OS sheet).
      3. **Prettied up** — the dialog is functional and plain; he wants it to look finished.
      4. **Our own save popup instead of the OS one.** The native iOS share/save sheet is "the apple pop
         up". Check what is actually replaceable before promising: the final file hand-off is partly
         OS-owned, so the honest version may be our own dialog for everything UP TO the save, with the
         system sheet only at the last step. Say that plainly rather than claiming it can all be ours.
      Overlaps #121 (settings ↔ export one-way mirror) and #102 (export robustness) — do them as ONE
      piece of work on the export path rather than three passes over the same dialog.

- [x] **140 — Pinned cards need more visual flare.** (v6.77) His words: *"I want a bit more visual flare for
      pins, I want the layer to be visually different."* Follow-up to #138, which shipped with only the
      small tack on the thumbnail — his read is that the CARD itself should look different, not just
      carry a badge. So the whole row gets treated: an accent edge, a tint, something that says "pinned"
      at a glance down a long list. Keep it in the app's existing glass/cyan language rather than
      inventing a new colour, and it still must not shout over the thumbnail or the OPEN glint.

- [x] **139 — Project notepad + export reminders.** (v7.10) His words: *"In the top menu, put a little note pad
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
      **Shipped v7.10.** Notes live on the project, so they travel and save with it. Each one has a tick:
      untickcd it is just a note and never interrupts; ticked, it is shown once before the export dialog
      opens, with **Back** and **Export anyway** — and Back is the louder button, because a reminder
      exists precisely because you probably meant to do the thing first. Nothing ticked means no popup at
      all, and a ticked-but-empty note does not count, since it would interrupt with nothing to say.
      The gate sits inside `showExportDialog`, which is the ONE funnel every export route already goes
      through — top bar, phone bar, and home's ⋯ → Export video — so it covers all of them and cannot
      drift when a fourth appears.
      **On the phone it lives in Settings, not the top bar, and that was forced.** I added a bar button
      and the suite caught a real hazard: any extra control in that group shifts the settings cog
      sideways into the position the delete bin occupies in select mode — "a thumb going where it has
      always gone hits delete". The phone bar has no room, so notes joins the other project-level actions
      in the cog. On desktop it is a dedicated notepad button beside Export, with a dot when something is
      ticked.

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

- [x] **136 — A selected Captions layer locks the timeline and the layer.** (v6.88) His words: *"I can't do
      anything like drag the timeline or layer when you have a captions layer selected."* Screenshot on
      v6.74 shows the Captions layer selected with its clip spanning the whole timeline. So selecting a
      captions layer is swallowing the drag gestures — either the caption's own editing surface is
      capturing pointers over the timeline, or the clip is being treated as un-draggable and taking the
      scroll with it. Captions was made real in #43, so this is likely fallout from that.
      **Shipped v6.88 — and it was the first guess: the cues were eating the surface.** Nothing was
      locked. A captions track's cue chips can blanket its entire bar, and every chip grabbed the pointer
      the instant it went down (`stopPropagation` + `preventDefault`), so the clip's own handler never
      ran — no scrub, no hold-to-move, no scroll, on that one row only. The clip owns the gesture now and
      a cue has to be press-and-HELD to take it, the same idiom that grabs a clip, at 300ms so it always
      beats the clip's own 350ms cleanly. A tap on a cue still parks the playhead on it, and a mouse still
      grabs a cue immediately. Covered by a test that drives a real synthetic touch through a chip.

- [x] **137 — "Edit Text" has the wrong icon.** (v6.86) His words: *"edit text button should have a diff icon."*
      Screenshot: slot 7 "Edit Text" uses a green DIAMOND — which is the keyframe diamond used everywhere
      else in the app for animation. Reads as "add a keyframe", not "edit the text". Needs an icon that
      means text editing and does not collide with an existing meaning.
      **Fixed v6.86.** Text layers were falling through to ICO_SHAPE, whose path is literally a diamond
      (`M12 3.6 20.4 12 12 20.4 3.6 12z`) — the same mark the keyframe system uses. Text and caption
      layers now get their own serif capital-T glyph in the same element-family gradient, branching on
      exactly the condition elementLabel() already uses so the icon and the wording can never disagree.

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

- [x] **134 — Text is broken: 180pt renders tiny.** (v6.86) Screenshot on v6.74, iPhone: a text layer with the
      size control reading **180 pt** draws as a ~20px word on the canvas, with the selection box shrunk
      to match. So the point size is not reaching the render — the layer is drawn at something near the
      default regardless of what the control says. Note the control and the box AGREE with each other and
      both disagree with 180, which points at the value never being applied rather than at a stale box.
      This is the fourth text report (#88, #97, #98 lineage) so it needs a real reproduction on a device
      profile, not a desktop glance.
      **Fixed v6.86 — and the report's diagnosis was wrong, which matters.** fontSize was NOT being
      ignored: I measured the drawn ink at 40/160/180/400pt and it is perfectly linear, so the value
      reaches the renderer correctly. The real fault is the DEFAULT. addTextLayer used
      `Math.round(P.height / 12)`, and his project is 4:3 2160p — 2160/12 = exactly the 180 in his
      screenshot. Scaling by HEIGHT is only consistent while the height is the short side, i.e.
      portrait; on his frame 180pt is 11.5% of the width where the same formula gives 30% on 1080x1920.
      A 1920x1080 project was worse still: a 90pt default, 8.5% of the frame.
      Now `Math.min(P.width, P.height) / 6.75` — the same ratio against whichever side is shorter.
      Measured after: portrait 160 → 26.7% (byte-identical, no regression), his 4:3 320 → 20.0%,
      landscape 160 → 15.0%. Suite 231/231.

- [x] **135 — Black bar down the right edge (and the bottom).** (v6.85 — SIXTH attempt, finally the real cause.) He ticked it off
      (*"just assume it's fixed for now"*) and then immediately: *"Never mind it just came up."*
      **That is a real result, not just a failure.** v6.78 made the page impossible to pan sideways
      (`overflow-x: clip`, verified: forcing a 600px pan leaves scrollX at 0 even with the editor parked
      off-screen). The strip survived that. So horizontal scrolling is NOT the cause and is now ruled
      out — which also kills the "#app/#add-fab parked off to the right" theory, since you cannot reach
      them on an unpannable page.
      What is left: **a container that is genuinely NARROWER than the screen**, letting the page
      background show down its right side. That fits the screenshot better anyway — the fixed top bar
      stopped short of the strip too, which panning would not do (a fixed bar does not move when you
      pan). Chase inline/px widths pinned from a stale measurement during the open/close animation, and
      anything resolving against a stale viewport width on iOS.
      Keep the v6.78 clip anyway: it is correct on its own terms (nothing here should ever pan
      sideways), it just was not this bug.
      **THE ACTUAL TRIGGER, from him:** *"Happened when I started texting you then opened the app back
      up… Yeah it seems to trigger from leaving the app."* So it is NOT the project open/close animation
      at all — that was my assumption from the first report and it sent me at the wrong thing twice.
      It is **backgrounding the app and resuming it**. That is a known iOS shape: on resume the visual
      viewport is re-established, and anything holding a width measured at load — a px width written
      into an inline style, a CSS var set once from innerWidth, a cached clientWidth — is now stale and
      too narrow, so the page background shows down the right. Look for a width cached at load with no
      recompute on `resize` / `pageshow` / `visibilitychange`, and make it re-measure on resume. His words: *"there's a glitch
      where sometimes when opening in and out of the projects it leave a black bar on the left side of
      the screen."* Intermittent, which fits the open/close slide animation (#128, same area): the
      project panel translates in from the right and home exits left, so a transform that does not fully
      settle — or a will-change/compositor layer left behind — would show as a strip of background down
      one edge. Likely the same root cause as #128's jankiness; fix them together.
      **Screenshot supplied, and it is the RIGHT edge, not the left.** A black strip runs the full height
      down the right side, darker than the app's own background, with the fixed top bar stopping short of
      it too — so a container that should span the full width is ending early and letting the page
      background show through, OR the page has become horizontally scrollable and is sitting a few px
      over. The whole-height, whole-page nature of it (header included) rules out a single mis-sized
      card. Reproduce by opening and closing projects repeatedly and watching documentElement.scrollWidth
      against clientWidth.
      **v6.78 — fixed defensively, and I could NOT reproduce it, so this needs your eyes on a phone.**
      What I found: while home is up, TWO things are parked off-screen to the right — `#app` holds
      `translate3d(100%,0,0)` (fm-pop-out is animation-fill-mode:both, so it keeps its last frame) and
      `#add-fab` holds `translate3d(100vw,0,0)`. Both are position:fixed, which normally keeps them out
      of the scrollable area — but if anything lets the page pan sideways even a few pixels, what you see
      beside the app is the bare page background. That matches the screenshot exactly, including the
      fixed top bar stopping short of the strip, which a single mis-sized card could never do.
      What I could not do is make it happen here: 13 open/close cycles at different interleavings,
      sampled every frame, never once produced a transform-without-fixed state or scrollWidth >
      clientWidth. So instead of guessing which element wins the race on iOS, the sideways scroll itself
      is gone — `overflow-x: clip` on html and body. Nothing in this app is ever meant to pan
      horizontally, so that removes the whole class of bug whichever element causes it.
      Verified: forcing `window.scrollTo(600, 0)` now leaves scrollX at 0, and it still does with the
      editor deliberately parked at translateX(375px) — document stays exactly 375/375. Vertical list
      scrolling is unaffected. **Tell me if you still see the strip** — if you do, the cause is something
      that survives an unpannable page and I will need a different angle.

- [x] **132 — The slam Easter egg is GONE.** (v6.77) His words: *"The slam Easter egg is gone."* Reported on
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
      **Both fixed in v6.77, and #131 with them — it is one gesture.**
      · `dy <= 0` → `dy <= -12`, so a flat first frame or a pixel of jitter while you hold no longer
        destroys the pull. Only a deliberate upward move cancels now.
      · A `touchmove` preventDefault, scoped to only fire while a pull is actually live, stops Safari
        starting its own rubber-band and taking the gesture off us with pointercancel.
      · The hard `Math.min(150, …)` clamp is gone (that was #131's "freeze"): past 150px the travel is
        compressed to 28% instead of cut off, so it keeps answering your finger at ANY distance —
        heavier and heavier, never stuck — and still slams on release.
      Verified by replaying the gesture frame by frame: real finger with a dy=0 first frame → slams;
      jittery finger that dips backwards twice → slams; deliberate upward move → correctly does not;
      dragged 700px → still moving at release, and slams. Then MUTATION-CHECKED: put `dy <= 0` back and
      the real-finger case produced no travel and no slam — the exact symptom you reported — so the test
      can genuinely see this bug, which the old synthetic tests could not.

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

- [x] **123 — Linear Repeat is poor: it just squishes horizontally.** (v6.99) His words: *"Linear repeat effect
      is shit and needs work, currently it just squishes horizontally when you do it."* So the copies are
      being fitted into the frame width instead of being laid out at size — a repeat should place N
      copies along an axis at the ORIGINAL scale, with spacing and direction, not compress one copy.
      **Shipped v6.99, and you had diagnosed it exactly.** It was a per-pixel WARP:
      `cellW = W/count; lx = (x - floor(x/cellW)*cellW)/cellW; return [lx*W, y]` — every cell mapped its
      own 0..1 across the FULL source width, so each copy held the whole picture crushed into 1/count of
      the frame. That is not a repeat, it is N horizontal squishes.
      A repeat draws copies at their own size, which a coordinate remap cannot do, so it is a canvas
      effect now (the same machinery Tiles uses) and the layer's plate is drawn again at an offset.
      Nothing is scaled. It gained the controls a repeat actually needs — **Copies, Spacing, Direction
      and Fade out** — with spacing measured against the CONTENT's own width so 100% butts copies edge
      to edge whatever size the layer is. `count` keeps its key and default, so an existing instance
      keeps its number and simply stops squishing.
      The test measures the drawn ink: it fails if a copy comes out narrower than the original, which is
      the actual complaint, and separately if it draws only one copy.
- [x] **124 — Faves gesture: threshold + cancel, better animation, and rename to "Faves".** (v7.12) His words:
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
      **Shipped as pull-DOWN to open, reverse to cancel.** Releasing short of the commit point already
      did nothing, so the real gap was the case that rule cannot reach: you are past the commit point,
      at full stretch, and you change your mind — from there the old position-only rule needed about
      220px of return travel before it disarmed. Cancel is now measured back from the PEAK (12 damped px,
      ~40–50px of finger), so it works wherever you reversed from, and it STICKS — shoving back down
      cannot silently re-arm what you just called off, because a gesture that flip-flops under the finger
      leaves you unsure what you chose at the moment you let go. The hint now says which of the three
      things will happen — Faves / Release to open / Cancelled — and the block glides home under your
      finger on a cancel, so it is something you see rather than something you find out on release.
      Everything user-facing says "Faves" now, including the audio effects browser.
- [ ] **125 — Timeline scrolling still lags badly, with barely any layers — and he is right that I keep
      not fixing it.** His words: *"Still getting major lag when scrolling through the timeline; with not
      many layers added at all. I know I tell you about lag a lot but nothing much ever gets resolved,
      idk if you're working on it or think it should be fine but just letting you know it's not fine."*
      **NEW, 13 Aug — the biggest lead so far, from #130's measurement. Read that entry.** The adaptive
      quality ladder only sees MAIN-THREAD render time, and the two costs most likely to be behind your
      lag — canvas `filter` effects (GPU) and video decode (off-thread) — never land on that clock.
      Measured: eight Gaussian Blurs on a 1080×1920 comp at 6× CPU throttle registered **1.1 ms** a
      frame. The app can stutter badly while every number it watches says it is fine. That would explain
      why years of "measure the render path" have kept coming back clean, including my own passes.
      Also new: `tests/_probe.py --cpu N` throttles the CPU, so a phone can finally be approximated here
      instead of every measurement being taken on a fast Mac.
      **Fair criticism, recorded as such.** The pattern: every time lag comes up I have measured on THIS
      machine, found acceptable numbers, and moved on — which is exactly the trap that made #41 and #97
      drag on. Desktop timings are not evidence about his phone. Next pass must be a real profile of the
      timeline scroll path under CPU throttling, looking specifically for forced synchronous layout and
      per-frame innerHTML, and it takes priority over feature work.
      **First real profiling pass done (v6.78). Findings, including two dead ends — read these before
      trying anything, so the same ground is not covered a fourth time:**
      · Desktop, 8 layers, a 90-frame timeline scroll: median frame 16.7ms, p95 18.9ms, ZERO long tasks,
        renderScene averaging 0.32ms. Smooth. **This is not evidence** — it is the same measurement that
        made me say "it's fine" three times before, recorded here only to stop it being mistaken for one.
      · The scroll path itself is cheap and does no per-frame innerHTML: the handler calls FM.scrubTime
        once per scroll event (34 calls across 90 frames), and the timeline does NOT rebuild — its
        render() ran 0 times during the whole gesture. So the "per-frame innerHTML" I suspected is not
        there. That hypothesis is dead.
      · **The obvious lever is already known to be low-yield.** The preview does render more pixels than
        the screen shows (PREVIEW_SS = 1.5, so ~2.25x the device-pixel area; measured live at 2.98x the
        CSS box on a dpr-2 display). But notePlaybackCost's own comment records a measurement: on one
        plain 2048x2048 clip with no effects, **thirteen times fewer pixels bought only 32% less time**
        (12.2ms → 8.3ms). Decoding a video frame and handing it to the GPU costs the same whatever size
        canvas it lands in. So chasing canvas resolution — which is exactly where his "it doesn't
        compress the quality in the canvas playback" points — cannot be the main win for a video layer.
      · **Therefore the next pass belongs on the VIDEO path, not the raster path**: how often a frame is
        pulled off the <video> element while scrubbing, whether seeking is being forced per scroll event,
        and whether the same decoded frame is re-decoded rather than reused. His case is ONE two-second
        screen recording, so per-frame decode/seek is the only thing left big enough to explain it.
      · Still untested and worth doing: the adaptive tier only resizes the canvas when _inMotion FLIPS
        (app.js:150). If the ladder drops a further rung mid-gesture, nothing appears to call
        resizeCanvas() again — so the canvas may take one step down and then stop adapting. Verify that
        before assuming it is a defect.
- [x] **119 + 120 — The EXPORT frame-rate list is unordered, and should match the canvas one.** (v6.74) His
      words: *"This menu is all over the shop, needs to be ordered"* (screenshot: 30, 24, 25, 60, 50, 12
      — no order at all), then *"Yeah match it"* when I asked whether to bring it in line with the canvas
      list. So: same rates as the canvas picker, ascending. Note this drops 12 as well as 24 from export;
      Custom is not offered on the export dialog, so say so rather than let it go quietly.
- [x] **121 — Settings ↔ Export should mirror ONE WAY.** (v7.11) His words: *"the settings menu and export menu
      should replicate each other, so if I change a setting in the cog it should go to the export section
      as that"* and then, crucially, *"But if you change a setting in the export menu it shouldn't change
      the cog menu."* So the cog is the SOURCE OF TRUTH and export inherits from it; an export-time
      change is a one-off override for that export and must not write back. That asymmetry is the whole
      requirement — a naive two-way binding is exactly what he is ruling out.
      **What was actually wrong was subtler than a two-way binding, and had the same effect.** Nothing
      wrote back to the cog — but the export dialog REMEMBERED its frame rate and resolution and put
      them back next time you opened it. So a choice made once outranked the cog forever: set the
      project to 48fps in Canvas settings and export still opened on the 60 you picked last week. The
      cog was not the source of truth; the memory was. Fixed by splitting the remembered settings by
      OWNERSHIP — fps and resolution belong to the cog and are inherited fresh every time (an export
      change is a one-off), while format and quality belong to nothing else and are still remembered,
      which keeps the earlier "remember my export settings" request intact.
- [x] **122 — Onion skin does not belong in View options or App settings.** (v6.98) His words: *"shouldn't onion
      skin not be in the view options and app settings? Idk why it would be there since it only effects
      one layer, it should just be in the three dots when you have a layer selected."* He is right about
      the scope: onion skin ghosts the SELECTED layer either side of now, so it is a per-layer tool
      sitting in two global menus. Move it to the layer ⋯ menu and take it out of both. Check what
      happens to the setting when nothing is selected before moving it.
      **Shipped v6.98, and the code backed you up.** `drawOnionSkin()` opens with
      `const sel = FM.selectedLayer(...); if (!sel) return;` — it ghosts the SELECTED layer and does
      nothing at all without one. So App settings, which you can open with nothing selected, was
      offering a switch that could be flicked while unable to do anything. That answers the "check what
      happens when nothing is selected" note: nothing, which is the argument for moving it.
      **Moved, not copied** — both global entries are gone and the layer ⋯ menu is the one door, with a
      ✓ on the label since that menu has no switch to show state.
      Two existing tests had the old requirement written into them (Settings must lead with Onion skin).
      Updated, with your reversal quoted in place so nobody later "fixes" them back.

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
      **NOT REPRODUCED, and the hypothesis above is now dead — measured, not assumed.**
      `tests/_shapebounds.html`: **all 54** data shapes fit inside their unit box, the note's head at
      y 0.638…0.912. `tests/_noteink.html` then renders a real note layer and finds the painted pixels:

      | condition | bottom overshoot | left overshoot |
      |---|---|---|
      | square box, no stroke | **0 px** | 0 px |
      | the box it actually SPAWNS with (0.9 × 1) | **0 px** | 0 px |
      | stroke 8 enabled | **0 px** | 0 px |
      | stroke 24 enabled | **0 px** | 0 px |

      In a 400px box the note's ink runs y 138…465 — 38px of clearance at the top and 35px at the
      bottom. Nothing escapes, so "fix the bounds" would have been a change that fixed nothing.
      **So there is a condition in your screenshot I have not got.** Worth one line from you when you
      see this: was the note **rotated or scaled**, was it in **Edit Points**, or had it been **squished /
      had an effect on it**? Any of those could push ink past the box in a way a plain layer does not.
      Staying open until then rather than being closed on a clean measurement of the wrong thing.
- [ ] **115 — Dragging a clip to the screen edge should auto-scroll the timeline.** His words: *"When
      dragging a layer and you get to the end of the screen, make it so the screen moves so you can keep
      dragging a layer to the left or right without needing to let go and then scroll etc, like how we
      have the selecting multiple layers tool."* So the edge-scroll behaviour the paint-select drag
      already has needs to apply to a clip drag too — and he has named the precedent, so copy that one
      rather than inventing a second feel.
      **ATTEMPTED AND BACKED OUT — not shipped, and worth reading before the next go.** A horizontal
      edge-scroll already exists and is wired to TRIM drags only (`trimEdgeScroll`), so the work is to
      give a clip MOVE the same thing. Built it: the placement maths extracted into `applyClipMoveAt`
      so the rAF loop can re-run it each frame, plus the accumulated scroll added to the drag delta —
      without that the clip stops dead at the edge while the timeline slides underneath it, which is
      worse than having no auto-scroll at all.
      It made **three unrelated tests go red** — a text-editor geometry check, a text-editor layout
      check, and an edit-points snap — and bisecting pinned it to the ARMING of the loop, not the maths:
      with the arming disabled and everything else in place, the suite is 241/241.
      **Two real defects in my own design surfaced on the way, and both are worth keeping:**
      1. `v !== 0` only says the finger is inside the edge band. Pinned at scrollLeft 0 a leftward step
         is a no-op, so the loop re-armed forever, re-placing the clip and re-rendering every frame off
         a stale pointer position. Fix: compare scrollLeft before and after and stop if nothing moved.
      2. A trim is bounded by the media's length; a clip move is not. "Grow the scroller, then scroll
         into the space you just made" is unbounded — one missed pointerup and the timeline scrolls
         forever while the scroller grows 120px a frame. Fix: cap at the end of the composition (or the
         dragged clip) plus half a screen.
      Neither cap made the three tests green, so something else about an armed edge-scroll disturbs
      them. My theory was that an existing test leaves a clip drag un-released. **Checked, and that
      theory is WRONG** — the suite now asserts after every single test that no timeline gesture is
      still live, and it is green, so nothing leaks a drag.
      **That narrows it to the other state the edge-scroll writes, and neither is reset by anything:**
      `timelineEl.scrollLeft` and `innerEl.style.width`. Growing the scroller can add a horizontal
      scrollbar and change the timeline's layout height, which moves **#stage** — and therefore the
      canvas and the selection box on it. That is exactly the shape of the three failures ("the box is
      already 149px off the text", "the editor covers the canvas at y 341"), none of which touch the
      timeline at all.
      **That theory is dead too, measured directly.** Grew `innerEl` by 12,000px and set `scrollLeft` to
      4,000 on the live app: the canvas moved **0px** and resized **0px**, and `rebuild()` restores both
      to their original values anyway. So neither the scroll position nor the scroller width reaches the
      canvas, and the three failures are not that.
      **Two hypotheses killed by measurement, which is progress — it is where the next attempt starts.**
      What is left that an armed edge-scroll does, and has not been ruled out: it calls
      `applyClipMoveAt` — and therefore `FM.requestRender()`, `showSnap`/`hideSnap`, and a write to
      `layer.start` — once per animation frame for the length of the drag. So the suspects now are the
      SCENE (a dragged clip landing at a different `start`, which persists into whatever test inherits
      the scene) and the snap guide, not the scroller.
      **Do this next, instead of a third hypothesis:** re-apply the feature, dump the FULL pass/fail list
      rather than just the failures, and diff it against a clean run to find the FIRST test that behaves
      differently. The three reds are almost certainly downstream of something earlier, and guessing at
      the mechanism has now cost two attempts. Backed out rather than shipped red, or "fixed" by editing
      the tests it broke.
- [x] **116 — Sliders are too stiff; they should glide like the timeline. (REPEAT of #45.)** (v6.97) His words:
      *"The sliders we have for everything like effects and what not are too stiff, they need to flow
      like the timeline does, when you swipe it glides."* #45 "Give every slider the timeline's glide"
      is ticked as done, so either it never covered the effect-panel sliders or the glide it added is
      too weak to feel. Do NOT assume the old fix is present and correct — measure what a flick on an
      effect slider actually does today before changing anything, the way the timeline glide was
      measured for #103.
      **Shipped v6.97, and the cause is worth knowing because it is not what either of us assumed.**
      The glide was never missing — #45 really did add it, and it is attached to every one of these
      controls. What happened is that **#103 retuned the TIMELINE and not the sliders.** On your *"the
      glide ends too quick"*, the timeline's friction went 0.9 → 0.947 and a full-speed flick went from
      ~3.7s of timeline to ~8.8s. The slider code still read 0.9 — under a comment saying *"same friction
      as the timeline's momentum"*, which was true the day it was written and false from #103 onward.
      **So the sliders were not missing a glide; they were wearing the timeline's old one.** Next to the
      new one, that is exactly "stiff", and you were right both times.
      Fixed with the same lever #103 used, since friction sets the distance and launch speed does not:
      a full-speed flick now carries **~979px of ruler against ~395px**, 2.5× further, with the clamp
      raised only modestly so a light flick does not turn twitchy, and the stop threshold lowered so the
      longer tail is not cut off while still visibly moving.
      **The real fix is the test**: both tunings are now exposed and the suite fails if they ever differ
      again. A comment could not hold that invariant — it silently stopped being true, and the only
      symptom was you having to ask twice.
- [x] **117 — A locked layer should show a red lock on its preview thumbnail.** (v6.87) His words: *"When you
      lock a layer put a red lock icon on the layer's preview image."* Small and unambiguous: the lock
      state exists (`layer.locked`, and the timeline already refuses to move a locked clip), it just is
      not visible where you look for it.
      **Shipped v6.87.** Red padlock centred on the preview, and the preview itself dims so the badge
      reads over a bright frame. Two bugs on the way there, both invisible to the DOM and both caught
      by photographing it: a blur shadow muddied the red at 13px, and the dimming scrim painted OVER
      the padlock and turned #ff4d4d into brick — `getComputedStyle` reported the bright red the whole
      time. Measured after: rgb(255,77,77) exactly. Covered by a new regression test.

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
      **Step 1 FINISHED in v7.38.** v6.74 had only done four of the tables. Six more were still open, and
      one of them mattered a lot: TEXT_FX doesn't just *test* what it looks up, it **calls** it — so a
      project naming an effect `valueOf` on a text layer threw out of the render and killed the frame.
      The effects browser had a worse one, keyed off **localStorage** rather than a project file: a junk
      id in your recents list built a "tile" out of a prototype function and took the browser down the
      moment you opened it. All ten tables are now prototype-free and listed in one place so the suite
      walks the whole set instead of the ones someone remembered.
      And the actual gap this step existed to close is closed: `layer.effects` — alone among the layer's
      sub-structures — had no validation coming in, on the import path OR on the autosave load that every
      project takes on every open. It has one now, and the hard part was making it change *nothing*: a
      param the file leaves out has to STAY left out, because the renderer falls back to a legacy value
      rather than the schema default, so helpfully filling it in would have restyled every old project
      without a pixel of source changing. Asserted across all 180 effects at once.
      Found and fixed on the way past, unrelated to filters: a keyframe curve you shaped by hand was
      losing its tangents and its parameterised ease **on every reload** — the sanitiser they pass through
      only ever emitted `{t, v, e}`. So a bounce you dialled in came back linear and nothing said why.
      Scouting also corrected five factual errors in FILTERS-DESIGN.md, two of which would have sent
      later steps down the wrong road — including the cross-fade precedent, which had the wrong ZERO
      (copying it would have made strength 0 hide the layer instead of showing it unfiltered).
      **Step 2 shipped in v7.39 — one walker.** Seven places in the app walked a layer's effects one
      level deep, which is fine today and breaks silently the moment an effect can hold other effects.
      Each fails in its own quiet way: no keyframe diamonds for anything inside a filter; keyframes you
      can SEE and cannot delete; copy/paste landing on a different parameter than the one you copied; an
      audio link driving the wrong effect; and a Luma Matte or Displacement Map keeping a dead layer id
      after a duplicate, import or template insert — it just renders plain and never says why. All seven
      go through one walker now, and the three separate keyframe address grammars (the timeline's, the
      audio panel's, and the one the AI sends) share a single parser that reads both the old form and the
      nested one, so nothing already saved changes.
      Nothing creates a filter yet — this is deliberately the groundwork, landing before anything can
      depend on it.
      **Step 3 shipped in v7.40 — a filter renders, and Strength fades the whole group.** Strength is a
      cross-fade between the picture with the filter's effects and the picture without, NOT a scaling of
      the children's settings. That was the obvious approach and it is wrong three ways: half a colour is
      meaningless, half a "mode" switch corrupts the look instead of weakening it, and scaling a child
      that has keyframes would rewrite them permanently. Both ends are exact — at Strength 1 a filter is
      byte-for-byte the same picture as those effects sitting in the stack directly, at Strength 0 it is
      byte-for-byte the same as the filter not being there — so a filter can never be a different look
      from the effects inside it.
      The blend in between is a real mix rather than the "draw one image over the other" shortcut the
      compositor uses elsewhere; that shortcut is only correct where the top image is fully opaque, so it
      would have gone visibly wrong on soft edges and on any filter holding a key or a matte. Reverting to
      it turns a test red, which is what makes the extra work justified rather than assumed.
      **Step 4 shipped in v7.41 — and this is the first bit you can actually touch.** In the Effects
      panel there is now a "+ Add Filter" under "+ Add Effect". It drops in an empty filter, already
      open, with its own "+ Add effect to this filter" button inside it. Whatever you put in shows up
      as normal rows indented under the filter — same open/close, eye, delete, swipe and drag as any
      effect — with Strength sitting above them, since that is the control acting on all of them.
      Everything inside is scoped to the filter properly: deleting one removes it from the FILTER,
      not from whatever unrelated effect happens to sit at that spot in the layer's list, and opening
      one no longer closes the filter holding it.
      Worth a look and a poke — this is the point where you can tell me if it feels right before I
      build the library of ready-made filters on top of it (step 6, the "lots of people won't want to
      make filters themselves" half of what you asked for). Next is step 5, the filters tab.
      **v7.42 — a follow-up the moment filters became creatable.** The plan said copying a look with a
      filter in it, or saving it as a preset, would silently delete the filter. I measured it rather
      than trusting the plan, and it was already fine. What was NOT fine: nothing could ask whether a
      filter suits the layer you are pasting it onto — so a filter full of text effects landed on a
      shape as a row that looks like a look and does nothing. Fixed, and pasting now fits the look to
      the layer: a part that does not suit is dropped from inside the filter, the filter is kept, and
      it tells you what it left behind.
      **v7.43 — and one I had shipped broken myself.** The plan warned (§6) that nine effects are all
      applied together before everything else, so dragging them up and down the list has never changed
      anything — and that what must NOT ship is a reorderable list that does nothing. Then step 4 gave
      you a second list to drag things around inside. Those rows now say "always first" next to their
      name, so the ones whose order genuinely matters are the ones you can meaningfully move.
      **v7.44 — the filter library, 16 of them in four sections.** "+ Add Filter" now opens a picker:
      Cinematic, Retro & Analogue, Light & Glow, Stylised, or Empty filter to build your own. This is
      the "lots of people will not want to spend time making filters themselves" half of what you
      asked for. Every one is an ORDINARY filter, not a locked preset — open it up, retune anything
      inside, delete a part, add your own, or pull Strength down to blend it back toward the original.
      **What is left on #113:** step 5, the proper third tab in the effects browser with thumbnails,
      alongside Effects and Audio Effects. The picker is a stopgap so the 16 are usable now; it is not
      the browsing experience you described. Also still open from your original ask: the shortcut
      button at the top of the Colouring section.
      **And the honest bit:** I authored those 16 to my taste, not yours. They are quick to change —
      each is a few lines in js/filters.js — so tell me which ones are wrong, which are missing, and
      whether 16 is the right number, and I will rework them rather than adding 30 more of the same.
      One test caught along the way that COULD NOT FAIL: the duplicate check left the referenced layer
      out of what was being duplicated, so the remap was a no-op either way and it passed with the fix
      reverted. Rewritten to duplicate a group holding both, and it now goes red properly.

- [x] **111 — Snapping and Onion skin should say on screen what they just did.** **DONE v6.70.** His words: *"Make it so
      when you press the snapping and onion skin buttons it actually tells you on screen what happened."*
      He has picked exactly the right two: guides and loop show their result instantly (lines appear,
      playback changes), but snapping and onion skin change NOTHING until you next drag a clip or land
      next to another frame — so the only feedback is a small icon tint you have to go looking for. Use
      the existing FM.toast, and say the STATE ("Snapping on"), not the action.

- [x] **110 — A lot of effects in Colour & Light plainly do nothing.** (v7.20 — the thumbnails; the
      TEXT-layer half below is now tracked as #180) *MEASURED — the code is fine in
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
      only alter the glyph pixels and glow works. So a real bug, not a device one…
      **…AND THAT WAS WRONG TOO (2026-08-14). There is no bug in the text draw path.** The probe built
      its text subject with `fill: '#c84ab0'`, and a text layer does not take its glyph colour from
      `fill` — so the subject was the DEFAULT, which is pure WHITE. On pure white, brightness, contrast,
      saturate, grayscale and hue-rotate are all mathematically incapable of changing anything, while
      sepia and invert are not. That is exactly the split the audit reported and blamed on the renderer.
      Given a mid-tone colour, **all eight work on text**, changing every glyph pixel (~2800 of them).
      **What is left is real, and it is not a code bug — see #180.**
      **WHAT HE ACTUALLY MEANT, 2026-08-13:** *"You can tell the effects don't work because all the
      images don't show any change in the effects menu."* So this is the effect BROWSER's thumbnails,
      not the effects themselves — every preview tile in Colour & Light shows the same unchanged
      picture, so the whole section looks dead from the menu. That fits every measurement: the effects
      DO work when applied (audited on media, image and shape layers). The bug is in the thumbnail
      generation. Related to #52 / #85 / #144, which have circled this area three times before.

      **CAUSE FOUND AND FIXED (v7.20) — and my first write-up of it, one hour earlier, was WRONG.**
      That earlier note claimed "the thumbnail queue deadlocks when a whole category is mounted at
      once". It does not. Every one of the 42 Colour & Light tiles paints in under two seconds. The
      "deadlock" was in my probe: it built tiles with `document.createElement('canvas')` and no class,
      and the engine's re-mount step looks for `canvas.fxb-thumb-cv`, so it could not see them. My
      instrument caused the failure I then reported. Left here rather than quietly deleted, because
      that is the second time this week a measurement has produced a confident wrong answer.
      **What is actually wrong, and it is real:**
      · The fx-art photographs decode about 80ms after the first tile asks for them, and a decoded
        photo makes every tile stale — the fallback art had been baked into the cached frames. So the
        engine clears everything and re-mounts.
      · It re-mounted whatever `document.querySelectorAll('canvas.fxb-thumb-cv')` could find. But the
        clear-down wipes the queue first, so **any tile that was queued and not yet in the document was
        dropped with nothing left to re-queue it** — blank forever, no retry, no error.
      · **The browser sits squarely in that window.** `thumb()` in js/fx-browser.js mounts the canvas
        while its tile is still detached and hands the tile back for the caller to append. Every tile in
        a section is un-connected for the moment between being mounted and being inserted — and that is
        the same moment the photographs land. Lose that race and the section stays blank, which is
        exactly what he described.
      **Fixed** by capturing the in-flight tiles before the clear-down and re-mounting those too,
      de-duplicated against the DOM sweep so the normal path is unchanged. The test mounts tiles
      detached, fires the invalidation while they are still detached, and only then attaches them —
      the real order with the race lost on purpose. Mutation-checked: without the fix, 2 of 8 paint.
      `FM.fxThumbs.queueState()` is exposed now for the same reason `stats()` was — working this out
      took six probes purely because none of it could be read from outside.

- [x] **112 — sw.js is an EMPTY FILE.** (v7.19) Found while chasing 110. The app registers a service worker and
      is installable as a PWA, but sw.js is zero bytes — so there is no offline caching, no precache,
      nothing. Either it never got written or it was emptied. Worth deciding deliberately: a PWA that
      cannot open offline is a PWA in name only, and he uses this on a phone.
      **Written and PROVEN offline (v7.19).** The shape of it is dictated by the update mechanism this
      app already has — the version label, the `?v=` cache-busters and the tap-the-version force-update.
      A worker that served a stale index.html would strand you on an old build, which is worse than no
      worker at all. So: navigations are NETWORK-FIRST (index.html is the one file whose bytes change
      without its URL changing; the cache is only the offline fallback), versioned assets are CACHE-FIRST
      keyed on the full `?v=` URL (that query is a promise the bytes never change, so a version bump is a
      new URL, is a miss, is a fetch — the existing mechanism does the invalidation for free), and there
      is NO precache list, because a hand-kept list of files would be a second copy of what index.html
      already says and would go stale on the next `?v=` bump.
      **Verification took three goes and the first two were wrong, which is worth recording:**
      · Service workers cannot be registered in the in-app browser at all — a one-line control worker
        fails there identically — so this needed its own headless Chrome, and an HTTP/1.1 server, since
        `python -m http.server` answers HTTP/1.0. That runner is kept as `tests/_swoffline.py`.
      · The first offline test went offline after ONE load and "passed". Meaningless twice over: the
        worker registers on `load`, after every script has already been fetched, so its cache was still
        EMPTY (0 entries) — and Chrome's own HTTP cache was serving the reload, so it would have passed
        with no service worker at all.
      · Done properly — load twice so the cache fills (66 entries), then `Network.setCacheDisabled` AND
        offline, so only the worker can answer — the app boots: version label reads, scene / timeline /
        storage / settings / addMenu all present. **The second launch is the offline-capable one**, by
        design; there is no precache to make the first one work and adding one would cost more than it
        buys. His words: *"There's a shit load
      of effects in the colour & light section that blatantly do nothing and don't work."* Turn this into
      an exact list before touching anything: render a test frame with and without each effect in that
      category and count changed pixels. Must test at a STRONG setting as well as the default, or an
      effect whose default is a no-op (amount 0) gets wrongly condemned — and must include a control
      effect known to work, or a broken harness reads as "everything is broken".

- [x] **109 — Film Grain needs a ROUND grain option, and the thumbnail should show it.** (v7.22) His words:
      *"The film grain effect should have a circle option, instead of just squares, and also the preview
      image should show the circle version."* Today `filmgrain` hashes one value per square CELL
      (`cell = (y/size)*gw + (x/size)`), which is why the grain reads as blocks at size > 1 — real film
      grain is round. Two parts: a Shape option (Square / Round) on the effect, and the effect's
      thumbnail regenerated from the round variant so the browser advertises what he actually wants to
      see. Note the thumbnail is generated from the effect itself, so it should follow automatically
      once the default or the pictured params use Round — worth confirming rather than assuming.

- [x] **107 — Fill Behind's Blur does nothing; it only zooms.** (v7.21) His words: *"The blur on fill behind
      still does not work, it just zooms in."* "Still" — so a previous pass did not fix it. IMPORTANT:
      the suite has two tests that measure this blur and both PASS, so whatever is wrong does not
      reproduce in headless Chrome — same shape as the text-editing bug (#41), where synthetic checks
      were green on a broken build. Prime suspect is `ctx.filter`, which is what the fill uses for its
      blur: canvas filter support is missing or partial on older iOS Safari and some WebViews, and an
      unsupported `ctx.filter = 'blur(…)'` assignment fails SILENTLY — leaving the zoom, which is a
      separate transform, working perfectly. That would produce exactly "it just zooms in". Verify the
      support question first; do not tune the blur radius.
      **THAT SUSPECT IS DEAD, by the same evidence that killed it for #110:** he is on iOS 26.5.2 and
      canvas filters have worked since iOS 16.4.
      **MEASURED 2026-08-14 (`tests/_fbscale.html`) — one configuration reproduces it exactly.** The
      probe renders the effect at several preview scales AND project sizes, because those are the two
      things the suite never varies, and measures the mean pixel difference between blur 0 and blur 60
      rather than "does it look blurred":
      | project | preview scale | blur 0 vs 60 | fill plate built? |
      |---|---|---|---|
      | 640x360 | 1.0 | 6.46 | yes |
      | **640x360** | **0.28** | **0.00 — byte-identical** | **yes** |
      | 1080x1920 | 1.0 | 35.58 | yes |
      | 1080x1920 | 0.28 | 36.00 | yes |
      So at a reduced preview scale, in that configuration, **the Blur slider changes nothing at all
      while the effect still pays for a full fill plate** — the zoom is all you get, which is his exact
      complaint. It is scale-dependent, which is why two suite tests at 1:1 pass.
      Subject geometry matters and the first run got it wrong: holding a tiny 80x60 subject while
      growing the frame produced a 39x cover scale in portrait, which measured my own setup rather than
      the effect. The numbers above use a landscape clip at 92% of frame width — the case Fill Behind
      exists for.
      **CAUSE FOUND AND FIXED (v7.21). The blur was never the problem — the fill was not being drawn
      at all.** Dumping the pixels for that one configuration showed `FM._fbLast` unset for both blur
      values, i.e. `paintFillBehind` returned before it drew anything, having already paid for the
      plate. It bails at a "this layer already reaches every edge, so there is nothing to fill" test —
      and that test was reading `alphaBBoxFast`'s box as if it were exact. **It is not: that function
      pads its box OUTWARD by up to a whole scan cell on every side, and says so in its own comment.**
      A layer leaving a small genuine margin therefore reported edge-to-edge coverage. Measured here:
      the padded box read 0..179 of a 179px frame while the real content ran 8..171.
      **It is scale-dependent because the margin is in DEVICE pixels** — it shrinks with the preview
      quality tier until the padding swallows it. At 1:1 an 8px margin survives and the fill draws; at
      0.28 it does not, and blur 0 vs blur 60 come out byte-identical. Both existing tests for this
      blur render at 1:1, which is exactly why neither ever saw it.
      **The fix** uses the OPAQUE CORE, which the same scan already computes and which is exact, to
      decide coverage to within 1px, falling back to the loose box only when there is no core — a
      half-transparent layer really can cover the frame while being see-through, and that case keeps
      the behaviour it always had. (A first attempt tested the inset rect instead and broke exactly
      that case: the suite caught it immediately.)
      New test renders at 0.28 preview scale with a subject that leaves a real margin; mutation-checked
      against the old test.
- [x] **108 — What do the buttons on the canvas view rail do?** (v7.37) Answered in chat (loop / onion skin /
      snapping / guides / export marks / timeline zoom). Keeping it here because a control that has to
      be explained is a design note, not just a question — the row is icon-only with no labels, and he
      has now asked what two of them are.

      **Answered in the app rather than in chat (v7.37): hold any rail button and it names itself.**
      Captions under the icons were the obvious fix and are the wrong one — the rail is 46px wide and
      already SCROLLS because it is full, and it has been fixed once before for being "crammed in", so
      labels would roughly double its height. A hold costs no space, and it works on the one device
      where `title` does nothing: a phone.
      Holding also **swallows the press that follows**, so asking what a control is never also toggles
      it. The two timeline-zoom buttons are skipped because they already own the hold gesture (hold =
      zoom all the way), and two meanings on one gesture is a fight rather than a feature.
      Mutation-checked on the part that matters: letting the press through means learning what Loop is
      turns Loop on.
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

- [x] **101 — Timeline ruler notches vanish when fully zoomed IN.** (v7.36) *NOT REPRODUCED, and my first
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
      **REPRODUCED 2026-08-14 (`tests/_notches.html`), and the earlier "the cap never binds" conclusion
      was wrong.** It binds hard. Counting the notches that actually land inside a 380px phone lane:
      | project | 0.5x | 1x | 4x | 12x |
      |---|---|---|---|---|
      | 15s | 38 | 19 | 24 | 8 |
      | 60s | 38 | 19 | 12 | **4** |
      | 300s | 19 | 10 | 3 | **1** (197px apart) |
      | 1800s | 5 | 3 | **1** (526px) | **1** (1577px) |
      So the ruler goes bare on a LONG project at HIGH zoom, and zooming in makes it steadily worse —
      which is exactly his "there are some if you zoom out but not at fully zoomed in", and exactly the
      backwards behaviour flagged above.
      **Cause, confirmed:** `while (totalFrames / frameStep > 1500) frameStep *= 2` thins the notches
      off the WHOLE PROJECT's frame count, so a long project starts with a coarse frame step — and then
      zooming in multiplies that step's PIXEL gap without ever adding a notch back.
      Why the earlier measurement missed it: it was taken at desktop width on a short project, where
      the cap genuinely does not bind. (It also took two runs here — the first had no layers in the
      project, so the timeline was empty and reported one notch in all sixteen cases, which measures
      nothing.)
      **The fix is the windowed ruler that was built and reverted.** That revert was right at the time —
      it was justified by a wrong cause — but the cause is now confirmed to be exactly this, and no
      node budget spread across a whole project can keep notches on screen at 12x. It needs the ruler
      to render the VISIBLE span only and re-render as the timeline scrolls, so it is deliberately not
      being rushed in at the end of a session.
      **FIXED (v7.36) with the windowed ruler.** The thinning was computed from the WHOLE project's frame
      count, so a long project started with a coarse step and zooming IN multiplied that step's pixel gap
      without ever adding a notch back. The ruler now draws only the visible stretch plus a screen of
      margin, so the step follows the ZOOM and the node count follows the SCREEN.
      Same 380px lane, notches visible at each zoom — density is now identical whatever the project's
      length, which is the whole complaint:
      | project | 0.5x | 1x | 4x | 12x |
      |---|---|---|---|---|
      | 15s | 38 | 19 | 24 | 8 |
      | 300s (was 19 / 10 / 3 / **1**) | 38 | 19 | 24 | 8 |
      | 1800s (was 5 / 3 / **1** / **1**) | 38 | 19 | 24 | 8 |
      **And it removes the cost that #95's investigation measured on the edit path:** the ruler emitted
      901 notch + 151 tick divs on a 300s project, ~14.8ms on a path that runs on every tap. Now at most
      ~112 nodes regardless of length. The repaint-on-scroll is its own listener, deliberately not a line
      inside the scroll handler that drives FM.time and the playhead — that one has a stack of hard-won
      guards this needs none of, and it only repaints when the view leaves the margin already drawn.
      The earlier revert of a windowed ruler was right at the time — it was justified by a wrong cause —
      but the cause is now measured, and no node budget spread over a whole project can keep notches on
      screen at 12x.
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
- [x] **97 update — the freehand "dead band" did NOT reproduce on a clean load, and my first fix was
      inert.** I found a 303px empty band above the drawing area and shipped a CSS rule to collapse it —
      then mutation-checked it and the rule changed nothing: with it deleted before entering drawing
      mode on a fresh load, the grid rows are `52px 792px` and the canvas is 374x666 either way, byte
      for byte. The band I "reproduced" was my own testing artefact (I had resized the browser from
      desktop to phone width WITHOUT reloading, and the stale grid survived). Rule reverted rather than
      shipped. His screenshot still shows a real ~212px band on a real phone at v6.60, so the bug is
      real and the cause is still unknown. NEXT: the likely difference is the ROUTE — I called
      FM.startDraw() directly, whereas he goes Add sheet -> Freehand Drawing, and the sheet closing may
      be what leaves the grid stale. Reproduce via the add sheet, not the API.

      **FOUND AND FIXED (v7.35) — and it is ONE CSS RULE, reported twice under two numbers.**
      `body.drawing #app { grid-template-rows: 1fr !important }` (and the identical rule for
      `body.text-editing`). The phone grid places its children on EXPLICIT lines — `#topbar-m` on row 1,
      `#main` on row 2 — so collapsing to a single track left `#main` in an implicit, auto-sized row:
      the stage became content-sized and every spare pixel piled into the track holding the 52px top
      bar, pushing the canvas to the bottom.
      **It survived this long because it is ASPECT-DEPENDENT, and everyone tests portrait.** Measured
      gap above the canvas: **9:16 portrait 22px** (invisible), **1:1 square 314px**, **16:9 landscape
      477px**. A previous mutation check came back inert for exactly this reason — it was run on a 9:16
      project.
      Fixed to `auto 1fr`: the bar takes what it needs and the stage takes the rest. After, at 16:9:
      244 above / 338 below, and the below figure includes the 104px tool strip, so the real gaps match
      within ~10px — centred.
      **This is also #165 point 1** (*"I don't like how it puts the screen to the bottom, needs to be in
      the middle"*), which is therefore fixed by the same change.
      The test needed a second pass: comparing the canvas to its own STAGE is circular, because with the
      bug the stage is content-sized and shrinks to fit the canvas, so the two centres always agree — it
      passed against its own mutation. It measures against the screen below the top bar now.
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
      **MEASURED 14 Aug — the coordinate half does NOT reproduce.** Entering by his own route (+ FAB →
      Freehand Drawing, not the API), at 380x820 with touch emulation: `#draw-overlay`'s rect is
      identical to `#preview`'s — dx/dy/dw/dh all 0.00 — in every comp aspect tested, and injected
      strokes land within ~1.5px of the screen coordinates they were aimed at. The draw surface and the
      comp share one coordinate space.
      **What was real in this report was the BAND**, tracked as the "#97 update" entry below and fixed
      in v7.35 — the canvas was shoved to the bottom of the screen, which makes drawing feel wrong in a
      way that is easy to describe as "broken". Marking this half as not-reproduced rather than fixed,
      because that is what the evidence says.
- [ ] **98 — Add Text could be better (phone screenshot at v6.60).** His words: *"add text could be
      better."* From the screenshot: (a) TWO separate confirm buttons on screen at once — the blue ✓ in
      the top bar and another ✓ in the bar above the keyboard; (b) that second bar also carries ^ and v
      arrows and eats a row of space on an already-cramped phone; (c) the size says 225 pt but the
      rendered "Text" is tiny in the frame, so either the pt value is not what is being drawn or the
      readout is lying — measure which before changing anything; (d) the text box and its handles are
      small and fiddly at that size. Not a crash, a quality pass — but it is the screen people meet
      first when they add text.

      **INVESTIGATED 14 Aug, and it splits three ways.**
      · **(a) and (b) are not our UI at all.** With the phone text editor open the document contains
        exactly ONE `.te-bar`, ONE `.te-panel`, ONE `.te-dock`, exactly one visible ✓, zero up/down
        arrow glyphs and zero "Done" words. A second ✓ on a bar with ^ and v arrows sitting directly
        above the keyboard is **iOS Safari's own form-assistant accessory bar** — it cannot be seen in
        headless Chrome and nothing in our DOM can produce it. **This needs one photo from him to
        close**: if the extra row sits flush on top of the keyboard, it is Safari's and not ours.
      · **(c) "225pt renders tiny" is #134, shipped in v6.86 — but the fix is a NO-OP on portrait.**
        The default is `min(W,H)/6.75`, and `1920/12 === 1080/6.75 === 160`, so a 9:16 project gets a
        byte-identical default to the build he screenshotted. Whether (c) is fixed for him depends
        entirely on his project's aspect. 225pt implies the old `height/12` on a 2700-tall comp.
      · And the band from the "#97 update" entry applied to the text screen too (same CSS rule, fixed in
        v7.35), which squeezed the whole editor into the bottom third of the phone — very likely why (c)
        looked worse than it is.
- [ ] **96 — Adding a SONG is really buggy and sometimes will not play at all, as the only clip.** His
      words: *"I just tried adding a song and it's really buggy and won't even play at all sometimes, and
      it's the only thing in the timeline."* "Only thing in the timeline" rules out mixing, layer count,
      render load and effect cost — this is the audio path failing on its own. "Sometimes" means a RACE,
      not a broken code path: most likely the decode/AudioBuffer not being ready when play() is called,
      or a play generation token cancelling the start. Together with 95 (voice memo stutters) and 72
      (import loses parts of the file) this is now THREE separate audio reports, and it is the most
      broken thing in the app — treat the audio cluster as top priority over polish work.

      **ROOT CAUSE FOUND 14 Aug (parallel read-only agent), confirmed with fixtures in the real app.**
      Not a race — a **duration disagreement**. `FM.loadVideoFile` deliberately trusts an 8kHz decode
      over the container header (js/media.js:96-102, from queue 72), so `layer.duration` is the song's
      TRUE length. But the element the preview plays still believes the container's shorter figure, and
      `syncMediaToClock` gates every resume on THAT figure (js/app.js:1087-1088). So past `el.duration`
      the element is held paused and muted for the rest of the clip while the playhead runs on — the
      song stops and the transport carries on without it.
      Measured: a file whose header claims 11.21s but which decodes to 26.38s plays only its first 11s.
      **And it is not limited to broken files** — a well-formed control still disagreed by 60ms
      (26.383625 against 26.323125), so every song import has a small dead tail. The mechanism is
      general; only its size varies.
      **FIXED (v7.34):** the gate now takes whichever is longer, the decoded length or the element's
      claim, so a container that undersold its file can never cut the song short. Mutation-checked —
      trusting the element again silences a 26s song from 11.2s on.
      **The agent found TWO MORE "I pressed play and nothing happened" paths, both still open:**
      · a **700ms press on the Play button toggles Loop and swallows the tap** (js/app.js:3304-3315), so
        a slow press looks like play simply not working;
      · **adding a song as the first layer never moves the playhead to the clip** (js/app.js:1369), so
        playback starts from wherever the playhead already was — mid-song, or past the end.
      Neither is the duration bug and both match "sometimes will not play at all". Worth doing next,
      together, since they share a symptom.
      It could NOT reproduce total silence on a well-formed file: 30 add-then-play trials at 1x and 8x
      CPU throttle all played.
- [ ] **95 — Phone: timeline still laggy AND audio does not play smoothly (tested with a voice memo).**
      His words: *"Timeline on my phone is still really laggy and the audios don't play smoothly, I just
      tested adding a voice memo."* This is a REAL-DEVICE report, and that matters: the two measured
      causes behind the earlier lag item were fixed at v6.33 and the desktop numbers came back fine, so
      whatever is left does not reproduce on this machine. Do not "fix" it against desktop timings again.
      Overlaps 69 (audio must never lag — make the audio clock the master) and the standing PERF item;
      the voice-memo detail is the useful lead, because a recorded memo is a fresh decode with no cached
      frames or waveform, unlike an imported song. Needs profiling on HIS phone, or a throttled-CPU
      profile as the nearest stand-in, before touching anything.

      **INVESTIGATED 14 Aug (parallel read-only agent, measured in the real app at 4x CPU throttle,
      380x800 mobile emulation). It is TWO unrelated defects and only the audio one reproduced.**
      **The audio half is real, and is NOT phone-specific.** Every press of Play starts the transport
      clock immediately (`clockAnchor(FM.time)`, js/app.js:1227) while the element carrying the sound
      takes ~200ms to actually produce audio. Measured: `el.currentTime` sits at 0.000 for the first
      ~120ms and has reached only 0.028s at t=222ms, while the playhead is already at 0.220s. The gap
      peaks at **183ms** — under SYNC_HARD (350ms), so it never seeks. Instead the controller pins
      `playbackRate` at its +10% ceiling for **55 consecutive decisions**: every play begins with a
      pitched-up catch-up. Independently confirmed by the existing `tests/_ratechurn.html` (|err| median
      15.2ms, max 198.1ms).
      **And a finding that matters for #69:** with one plain audio layer playing, `FM.clockSource()` is
      `'raf'` and there is no AudioContext at all. A plain media element never creates one, so in exactly
      the case this entry is about, the transport is on `performance.now()` and the audio-clock adoption
      has nothing to adopt.
      **FIXED (v7.33).** The transport now holds at the current frame until an element that is SUPPOSED
      to make sound actually advances, then starts in step with it. The picture waits those ~200ms
      instead of the sound being resampled — the same trade every editor makes, and the one #69 already
      makes everywhere else.
      **The deadline is the important half**, and it is tested as hard as the feature: autoplay can be
      blocked, a device can be missing, a file can have no audio track. If nothing has advanced within
      400ms the transport starts regardless, so this can never wedge playback. Both halves
      mutation-checked — removing the wait puts the playhead 0.107s ahead of silent audio, and removing
      the deadline freezes the transport at 0.000s indefinitely.
      **The TIMELINE half — measured, and it is NOT the render loop.** With one audio layer at 380px,
      dpr3, 4x CPU throttle: 59.9fps, 0 dropped frames, renderScene 0.16ms, quality tier never dropped,
      and **zero timeline rebuilds during playback**. So playback is not what he feels. What IS slow is
      the EDIT path, and it scales two ways that compound:
      · `rebuild()` is linear in LAYER COUNT — 1.5ms at 1 layer, 5.2 at 13, **18.2ms at 61**;
      · `rebuild()` is also driven by timeline LENGTH through the ruler — 1.6ms at 10s, 9.5 at 120s,
        **14.8ms at 300s**, emitting 901 notch + 151 tick divs (js/timeline.js:587, 592). **A voice memo
        is minutes long, so this is directly on the path he reported.** (And it is the same ruler code
        as #101.)
      · `updatePlayhead()` is linear in visible clips — 0.117ms at 1 clip vs **1.42ms at 61** — and runs
        on EVERY frame during playback and every scrub move.
      **The insight that explains why earlier fixes "didn't work":** on a phone, selecting a clip builds
      exactly ONE row, so everything above is cheap. The expensive phone state is **nothing selected** —
      which is exactly the state you are in when you press play to watch it back.
      **Still open in this entry: the TIMELINE half.** The lag he describes did not reproduce in the
      agent's measurements, and #202's separate measurement put renderScene at a 4.4ms median against a
      16.7ms budget. That half needs the numbers from HIS device, which is the "what is slow" readout
      argued for in #202.
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
      **MEASURED 2026-08-14 (`tests/_wiggle93.html`), and the two halves came out differently.**
      **(a) does NOT reproduce — wiggle survives every mover I could test.** Measured as how far the
      layer's ink centre moves when Wiggle is ADDED, at identical times:
      | with | displacement | vs wiggle alone |
      |---|---|---|
      | nothing else (baseline) | 9.7px mean, 24.0 max | — |
      | Orbit effect | 9.7px mean, 24.0 max | **100%** |
      | inside a moving group | 9.3px | 96% |
      | under a moving camera | 7.0px | 73% |
      So wiggle is not being dropped. The camera case is weaker only because the camera scales the
      composite, so the same pixel displacement covers less screen — arguably correct.
      **My first instrument said the opposite and was wrong**, which is worth recording: it scored
      "jitter" as the second difference of the ink centre, which a fast circular Orbit produces plenty
      of by itself (44.7 against wiggle's 37), so the two were indistinguishable and it reported
      "wiggle is lost" from noise. Comparing the same times with and against is the clean question.
      **So (a) needs one line from him: what were you doing when wiggle stopped working?** A different
      effect, a parent's parent, a behaviour rather than an effect? As written, I cannot reproduce it.
      **(b) IS real, and gets much worse with amount.** A 60×60 layer, ink lost against no wiggle:
      | position | at amount 30 | at amount 90 |
      |---|---|---|
      | middle | ~0% | ~0% |
      | left edge | 2.5% | **15.3%** |
      | top-left corner | 7.6% | **23.6%** |
      Cause is exactly as guessed: wiggle translates the frame-sized plate, so at an edge it pulls EMPTY
      SPACE in behind the layer instead of moving it.
      **(b) FIXED in v7.32 — and the reason it first looked like a no-op is that MY TEST WAS WRONG.**
      Two faults, found in that order:
      1. The margin argument never applied. Four edits were made and only three were asserted; the one
         that let an effect ask `expand()` for a bigger margin silently matched nothing. Every
         replacement is asserted now — an unasserted string replace is a change that can quietly not
         happen, which is how an hour went into debugging code that was never there.
      2. **The test measured the wrong scenario.** It placed the layer FULLY INSIDE the frame, where
         there is no content outside to pull in — so displacing it toward an edge pushes part of it off
         screen and it is clipped, which is correct behaviour, not a bug. With the counter added, the
         expanded path was running every single time (112/112) and could only ever reproduce the same
         pixels. The real fault is the opposite case: **a layer ALREADY part-way off frame**. Wiggle
         works on a frame-sized plate, so that layer's off-screen half has been thrown away before
         wiggle sees it — displacing it back toward the middle reveals nothing, and it can only lose.
      Measured before and after, same scene, a 60×60 layer:
      | position | before | after |
      |---|---|---|
      | fully inside (control) | −2.5% / −1.5% | **identical** — the cheap path is untouched |
      | half off the left | lost 9.0% / 22.2% | −4.1% / +2.2% |
      | half off the corner | lost 17.8% / **33.0%** | −14.4% / −22.6% (content returns) |
      Wiggle now sources from a plate that reaches past the frame, but only when the layer's own bounds
      are within the displacement of an edge — an expanded plate costs a second full render of the
      layer, and this is the app's heaviest screen. Mutation-checked: without it, 41.2% eaten.
      **A better implementation exists and is NOT yet adopted** (parallel agent, high confidence,
      measured against a ground-truth render): wiggle is a pure TRANSLATION, and a translation never
      needs more pixels — it needs the same comp-sized plate taken from a window that has MOVED. Setting
      plate A's origin to −d through the existing `__fmOX/__fmOY` stamp before `drawLayer`, then blitting
      1:1, is reported **bit-exact** against a genuinely-moved layer (0 pixels differ over 4 positions ×
      10 frames) where the shipped approach is not — **and cheaper**: 4.12ms → 0.63ms per frame on a
      1080×1920 comp, because a whole-pixel blit skips the resample a fractional `translate()` forces
      across the whole frame.
      **Deliberately not adopted yet:** it replaces shipped, working code on the strength of a probe I
      have not run myself. Verify against ground truth first, then take it.

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
- [x] **69 — Audio must never lag.** Make the audio clock the master.
      **ALREADY DONE — second stale entry found by working oldest-first (2026-08-14).** The transport
      clock does exactly this today:
      · `clockAdopt()` switches the transport onto the **AudioContext clock** the moment a running
        context appears, carrying the current time across so the playhead does not jump;
      · the frame loop READS that clock (`FM.clockNow()`) rather than accumulating into it, so a slow
        frame cannot make time drift;
      · the order in `tick()` is explicit — **sound first, picture second and best-effort**. A comp that
        costs more than its frame budget DROPS frames rather than slowing the clock, which is the thing
        that used to shred the audio;
      · and there is a watchdog: an audio clock that stops advancing (an iOS phone call, a route change,
        a policy suspend) is detected against a TRAILING window and demoted back to the wall clock from
        exactly where it left off, rather than freezing the transport.
      Evidence it works rather than merely exists: **seven tests** carry the `audio-clock` tag — the
      playhead is derived from the audio clock and not the frame loop; a context appearing mid-play is
      adopted without moving the playhead; a context that stops advancing does not freeze playback; a
      comp costing 200ms a frame drops frames instead of seeking the audio; the canvas paints once per
      project frame; the correction is a rate nudge with a hard seek as last resort; and with no
      AudioContext at all playback still runs and never creates one. All green.
      Left ticked rather than deleted — the history is half the point of this file. (Note this is
      DIFFERENT from #195, where the preview cannot exceed unity gain; that one is still open.)
- [x] **70 — Extracted audio should look like an audio track.** (v7.31) *"it doesn't show it like an
      audio
      file, with the bumps to volume or whatever it's called"* — i.e. a waveform.
      **Cause, and it was one line.** `FM.extractAudio` builds the twin by DUPLICATING the video layer
      and setting its opacity to 0. So the twin was still a video layer *with a picture*, and the
      timeline drew it a filmstrip — a strip of invisible frames, identical to the clip it was extracted
      from, with nothing about it saying "this is the sound".
      The waveform path already existed and is thorough (it honours trim, speed and reverse); it was
      simply only reachable by a video that has **no picture at all**, which the twin is not. The twin is
      now marked `audioOnly`, which is what it actually is, and the timeline treats that as "no picture"
      — so it draws the waveform that was already there. Mutation-checked.
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
- [x] **37 — Presets rework:** AM's "Preset preview" screen. Supersedes the earlier thumbnail spec.
      **ALREADY DONE — this entry was stale, found while working the list oldest-first (2026-08-14).**
      It shipped around v6.30 and was never ticked. What exists today, in the effect browser's preset
      sheet: every row is a LIVE animated thumbnail of **your selected layer with that preset applied**
      — not a generic sample — with the preset's name, its duration (or "constant"), its description,
      a delete for your own presets, and a plain "just add the effect" row at the top so the sheet is
      never a dead end. When the layer has nothing on screen at the playhead it says so and falls back
      to the sample, rather than showing an empty box.
      Evidence it works rather than merely exists: five tests in the suite cover it — the tile is a
      picture of the SELECTED layer, adding the preset changes that picture, editing the layer changes
      it, a layer with nothing on screen falls back, and rendering a preview never mutates the layer
      document. All green.
      Left as a tick rather than deleted, because the history is half the point of this file.
- [ ] **31b — Transform blur can't smear effect- or camera-driven motion.**
      **MEASURED 2026-08-14 (`tests/_mbsources.html`) — confirmed exactly as written, and the cause is
      structural rather than a bug.** One 40×40 shape, shutter 0.9, 24 samples, one frame:
      | motion source | layer matrix moves? | smear |
      |---|---|---|
      | keyframed transform (the control) | yes | **smears** — ink widens 40→44px, 240 soft pixels |
      | camera movement | **no** | none — output byte-identical with blur on |
      | Orbit effect | **no** | none |
      | Wiggle effect | **no** | none |
      **Why.** This blur is RE-PROJECTION, and deliberately so: the layer is rasterised once at t and
      that plate is pushed through `D = M(τ)·M(t)⁻¹`, which is one render plus N cheap blits instead of
      N full renders. The price is that it can only smear motion which appears in the layer's own
      matrix (`layerCTM`). The independent witness in the probe says the matrix does not move at all for
      the other three, so no amount of tuning inside the current design can help — nothing is wrong with
      the blur, it is being asked to smear motion it cannot see.
      **Two halves, and they need different answers:**
      · **Camera** — and reading the code changed the answer here, so it is recorded before building.
        Layers do NOT render through the camera's transform: with a camera in the scene, every layer is
        drawn into a camera-space plate and **the camera's transform is applied once, to that whole
        plate**, at composite time. A layer's own matrix carries only the parallax term, and even that is
        read from a module-level stash frozen at the current frame — so sampling it either side of the
        shutter cannot see camera movement, which is exactly what the measurement showed.
        **So camera blur belongs at the COMPOSITE level, not per layer.** Smearing it per layer would
        double-count: the layer would be re-projected by the camera delta and then the composite would
        apply the camera transform again on top. Done at the composite it is also far cheaper — ONE
        re-projection of the camera plate smears the entire scene, whatever the layer count, instead of
        N per-layer passes.
        **That is a design decision he should make, because it changes what the control means:** motion
        blur is currently a per-LAYER switch, and camera blur would be a property of the CAMERA. So the
        camera needs its own motion-blur toggle and shutter — which is also how every real editor does
        it, and it is the answer to "why doesn't my whip pan smear". **Ask him before building.**
      · **Effects** cannot be done this way at all — Orbit and Wiggle displace pixels INSIDE the layer's
        render, so re-projecting one plate can never reproduce them. That needs either N real renders
        (the expensive path this design exists to avoid) or the content-aware motion blur that already
        exists in the effect list. **Measure whether that effect already covers this case before
        building anything** — it may be that the answer is "use that one", plus making the app say so.

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

<!-- Newest requests live BELOW this line, oldest first — see rule 6 in the header. -->

- [ ] **168 — PC: kill the left side rail, move everything into the transport row.** (13 Aug, with two *(logged as #143 by mistake — that number was already used by an earlier shipped item, so it is #168 from now on; commits and POLISH-LOG entries dated 13–14 Aug refer to it as #143.)*
      Studio screenshots at v6.86.) His words: *"on pc we can lokey remove the side bar, put export on the
      far left of the row with the play buttons then to it's right the settings button then the Version
      refresh, then on the right side of the play button after the copy paste button, put delete and the
      binding button and the group button, they only show up when they should, not always there."*
      Reading it as a layout, left to right along the one transport row:
      **Export · Settings · version-refresh chip** — then the existing centred cluster
      (undo · redo · ⏮ · ▶ · ⏭ · duplicate) — then, to the RIGHT of duplicate:
      **Delete · Bind (parenting) · Group**.
      The last clause is the part to get right: *"they only show up when they should, not always there."*
      Delete/Bind/Group are selection-dependent — Group wants 2+ layers, Bind wants a selection and a
      target, Delete wants any selection — so the row must grow and shrink with the selection rather
      than showing three permanently-dimmed buttons. Watch the centre cluster staying visually centred
      as the right side changes width, or the play button will drift as you select things.
      Screenshot 1 shows the rail to remove: back arrow, `↻ v6.86`, duplicate, delete, export, settings.
      **AMENDED minutes later, and this supersedes the left-hand half above.** His words: *"since you
      will needa spot for the back button, to go to the home screen, put the export button to the very
      far right just one before the view options button and put the settings cog to its left, change
      its logo to a normal image and not colourful (pc version only) so it fits in with everything
      else. Then back button to leave project can be at the far left."* So the row reads:
      **← back** (far left) · undo · redo · ⏮ · ▶ · ⏭ · duplicate · **delete · bind · group** (only when
      they apply) · … · **settings cog · export · view options** (far right).
      **ANSWERED 14 Aug, so this is no longer blocked.** His words: *"on the of move the refresh button
      to re load the page would go on the far right where the export button and settings cog would be,
      it would come after all of them so on the left of them."* So the chip joins the far-RIGHT cluster
      and sits to the LEFT of the cog and export. Final order for that end of the row:
      **`↻ v7.00` · settings cog · export · view options** (view options stays outermost, per the
      amendment). Nothing goes at the far left except the back button.
      **One thing still open:** *"change its logo"* — the cog is already a plain outline icon and the EXPORT
      button is the colourful glass one from #71, so this almost certainly means give export a plain
      monochrome icon on PC while the phone keeps the glass artwork. Building it that way; flagging it
      so he can correct me in one word if I have it backwards.

- [x] **143 — A bar at the bottom, on EVERY screen.** (v6.79) Screenshot on v6.78: the splash paints
      pure black with the wordmark and "tap to skip", and the bottom ~40px is a DIFFERENT, slightly
      lighter dark — the app background showing below a splash that does not reach the bottom edge.
      **Almost certainly the same defect as #135, on the other axis**: #135 is a full-height strip down
      the RIGHT (element too narrow), this is a strip along the BOTTOM (element too short). Treat them
      as one bug — "a full-bleed element is not filling the viewport" — rather than two, and fix them
      together. Two independent sightings on two axes is much better evidence than either alone.
      **Then he found the decisive fact:** *"it's there when you're in the home menu too… Oh wait it's
      def a glitch, it's there even when I'm in a project, urgently fix."* Present on the splash, on
      home AND inside a project — so it is not any one screen's layout, and it cannot be a gap under a
      z-index-10000 `position:fixed; inset:0` splash either. Nothing in the PAGE could paint it.
      **Cause: `theme-color`.** It was `#12151b` in both the meta tag and manifest.json. On iOS 26 a
      standalone PWA tints the area around the page with theme-color, including the home-indicator
      safe area — so that band sat under every screen, and read as a bar precisely because #12151b is
      lighter than the app's ground and lighter still than the splash's pure black. The screenshot
      agrees: the strip is LIGHTER than the black splash, which no missing-element gap would be.
      Fixed by setting both to #000000, matching the splash and the manifest's existing
      background_color, so the band is the same colour as what it sits under.
      **Note it also explains #135's right-hand strip** — same band, the side edge — which is why that
      one survived the v6.78 overflow fix. If the right strip is gone too, close #135 on this.
      Caveat for him: the META takes effect on reload, but iOS may have cached the MANIFEST from
      install, so a full close-and-reopen (or worst case re-adding to the Home Screen) may be needed
      before the manifest half applies.
      **v6.79 did NOT fix it either** (*"Fully closed and re opened and it's still there"*), so the
      theme-color theory was wrong too. Two wrong guesses.
      **v6.80-diag settled it with a measurement instead of a third guess.** A magenta band was painted
      across the last 60px of the PAGE with a cyan hairline on the page's true bottom edge, and the
      live numbers printed in it. His screenshot: **innerH 894 · visualH 894 · safeBottom 34 · dpr 3 ·
      standalone yes**, and the magenta band sits ABOVE a remaining dark strip.
      **Conclusion, now evidence-backed: the page ENDS EARLY and the bar is OUTSIDE the page.** The page
      is inset from the bottom by ~34pt — exactly the home-indicator safe area — even though
      `viewport-fit=cover` is present and `env(safe-area-inset-bottom)` correctly reports 34.
      **Nothing in CSS can ever paint there.** That is why the overflow fix and the theme-color fix both
      changed nothing, and it retires every "an element is too short" theory.
      **Most likely cause: iOS caches the launch configuration at ADD-TO-HOME-SCREEN time.** Closing and
      reopening does not re-read the viewport meta or manifest for an installed PWA. His icon is still
      launching with whatever config was current when he first installed it. **Next step is his, not a
      code change: delete the Home Screen icon and re-add it**, then check. If the bar survives a fresh
      install, the config itself is wrong and the next suspect is the interaction between
      `apple-mobile-web-app-status-bar-style: black-translucent` (deprecated) and `viewport-fit=cover`
      on iOS 26 — try dropping the legacy meta so the manifest alone drives standalone.
      Probe removed in v6.80; do not ship it again without a reason.
      **SOLVED in v6.85, and it was never a layout bug at all.** index.html painted the document
      CANVAS pure black — `<style>html,body{background:#000}</style>` — while the app's ground is
      #060c0f. The canvas covers the whole WEB VIEW, which under viewport-fit=cover on iOS is larger
      than the layout viewport the page is laid out in. So every sliver the page did not cover showed
      as a distinct BLACK bar: right edge, bottom edge, over the splash, on home and in a project.
      That is why five attempts failed. An overflow-x rule, a theme-color change, a fresh install and
      two reverts all hunted an element that was too small — and a four-agent audit proved no such
      element exists: no stylesheet rule constrains the width, env(safe-area-inset-right) is used zero
      times, nothing overflows horizontally, and no commit since v6.73 can narrow the page. His own
      probe screenshot agreed: innerW/outerW/screen.w/clientW/visualW/bodyW/scrollW ALL 440.
      Fix: html now paints the app's ground (inline for the first frame, `html { background: var(--bg) }`
      in styles.css so each theme drives it), and the splash surround matches too so it cannot show
      during load. Three colour values; no layout touched.
      **Lesson for next time, worth more than the fix:** the very first screenshot showed a strip
      DARKER than the app. I read that as "an element is missing" when it actually said "something
      behind everything is a different colour". Six rounds could have been one.

- [ ] **169 — PC: trim/split move onto the playhead, and the align buttons get the whole panel.** (13 Aug, *(logged as #144 by mistake — that number was already used by an earlier shipped item, so it is #169 from now on; commits and POLISH-LOG entries dated 13–14 Aug refer to it as #144.)*
      second screenshot, multi-select state.) His words: *"put the delete left side button to the left of
      the play head and then same for the right button, and put the split button in the middle on top of
      the playhead. Then in the left massive area where its currently got the six small buttons, just get
      rid of the buttons that are near the play head and then with the align buttons just make them big
      and fill up the whole section."*
      So: the three trim/split controls (`[|` trim-left, `<|>` split, `|]` trim-right) stop being a row
      floating above the ruler and become **playhead-anchored** — trim-left sits immediately LEFT of the
      playhead line, trim-right immediately RIGHT of it, and split sits centred ON the playhead. They
      travel with the playhead. Then the inspector's "EDIT 2 CLIPS" row is deleted outright (those are
      the same three buttons), leaving **ALIGN ON TIMELINE** alone in that panel — and its three buttons
      grow to fill the whole area instead of sitting as a small row at the top.
      Note this is the multi-select panel in the screenshot, but the same trim/split row shows for a
      single clip too (screenshot 1) — the playhead move applies to both.

- [x] **144 — The slam shake reveals the editor behind home.** (v6.82) His words: *"When the shake happens it
      shows the editing page behind it, looks weird, just make sure you don't see the page behind it,
      either make the page extend so the shake doesn't show anything else or what you think is best.
      Also idk why you would be able to see that behind it, like are both screens just sitting on top of
      each other? If so that seems lag a cause of lag."*
      Two parts, and the second is the better question:
      (a) **The visual.** #home-screen is position:fixed inset:0 and the slam TRANSLATES it up to ~13px,
          so for those 420ms there is a strip of un-covered viewport and #app shows through. Fix by
          painting the surround rather than by moving less — the impact IS the point of the egg.
      (b) **His architecture question, which is fair:** yes, the editor sits under home rather than being
          torn down. Whether that costs anything depends entirely on whether it keeps RENDERING while
          home is up — a covered but idle DOM tree is nearly free, a covered but still-drawing canvas is
          not. Measure it before claiming either way, and give him the honest answer.
      **Shipped v6.82 (a), answered (b).**
      (a) `#home-screen.hm-slam` now carries `box-shadow: 0 0 0 140px var(--bg)` — a ring of home's
          OWN background, on the same element, so it travels and twists with the shake and the gap is
          always the same colour as home. Chosen over moving less, because the impact is the whole
          point of the egg. Verified by painting the editor bright red and freezing home at the shake's
          worst frame (13px down, .34deg): no red anywhere. Note elementFromPoint CANNOT verify this —
          it ignores box-shadow and still reports the element underneath; only a screenshot can.
      (b) **Measured: the editor is NOT costing anything while home is up.** renderScene ran 0 times in
          1.5s with home open, and 0 times sitting idle in the editor — the canvas only draws on demand
          (scrub, play, edit), it has no idle loop. So the two screens stacking is not a lag source. The
          editor's DOM does stay laid out behind home, but that is a one-off layout, not per-frame work.
          His instinct was a good one; it just does not happen to be true here.

- [x] **170 — Add menu: colour the section buttons apart from the item buttons, and stop the PC icons *(logged as #145 by mistake — that number was already used by an earlier shipped item, so it is #170 from now on; commits and POLISH-LOG entries dated 13–14 Aug refer to it as #145.)*
      looking goofy.** (v6.93) (13 Aug, two messages.) His words: *"make the background of all the buttons like
      elements shape etc a different colour to the ones in inside each section, like text etc. so it shows
      the difference in action, and then you can add colour to all the sub section buttons, while ur at it
      as well make them look better for the pc version because when theyre big icons it looks really
      goofy."* Then, immediately after: *"on pc they should be sharp and detailed and have black outlines
      etc."*
      Three things:
      1. **Two visual classes, not one.** A button that CHANGES SECTION (Shape, Media, Audio, Object,
         Template, Elements, Freehand…) must not look like a button that ADDS A THING (Text, a specific
         shape, …). Different background colour, so "the difference in action" is visible before you tap.
      2. **Colour on the sub-section buttons too** — the item buttons get colour rather than staying grey.
      3. **PC: the big icons look goofy.** At the desktop size the glyphs are simple line drawings scaled
         up, which is exactly when a 24px icon falls apart. He wants them *"sharp and detailed"* with
         *"black outlines"* — so a heavier, properly-drawn treatment at the large size, not the same path
         stretched.
      Reading "elements shape etc" as the add menu's SECTION tabs and "text etc" as the items inside a
      section. If he meant the inspector's nine category cards instead, it is a one-word correction —
      **asking next time he speaks.**
      **Shipped v6.93, all three parts.** Tabs and cards really were one shared background rule, so a
      button that changes section was pixel-identical to one that adds a layer. Tabs are now a recessed
      well — the light falls *into* them, the way a control strip should read — and each item card
      carries a tinted plate behind its icon. Colour comes from a curated eight-hue ring walked by
      position, so every button gets one, neighbours stay far apart, and nothing needs maintaining when
      an item is added. Media tiles keep their own frame with no plate over it.
      The PC complaint was a real drawing fault, not taste: the glyphs are drawn at 24px with a 1.8
      stroke and rendered at 34px, so the figure grows while the line stays put and the whole thing
      thins out — desktop gets more weight plus the hard black edge you asked for.
      **One thing to look at when you're back:** the Shape grid is 6 tiles across in a 288px panel and
      genuinely has no room for a plate, so those tiles take the colour on the stroke only. It reads
      fine, but it is the one place the two families look less different than elsewhere.
      **CORRECTED BY HIM, 14 Aug — I built the wrong thing.** His words, with the whole "Text" CARD
      circled in his screenshot: *"When I said I want the background of these icons to have different
      colours I meant the whole shape around it, so you get rid of that little square bubble around then
      that's colourful, and since you made the top icons go dark when not selected you've already done
      enough. Also on the of version all the icons with this effect are now off centred."*
      So three things:
      1. **Kill the plate.** The little coloured square behind each icon goes entirely.
      2. **Tint the WHOLE CARD instead** — the background of the button itself is the colour.
      3. **The tabs are already sorted.** Making them go dark when not selected was enough on its own;
         nothing more is wanted there.
      Plus a defect I introduced: **the icons sit off-centre inside the plate** (visible on Text,
      Captions, Camera in his shot). That should die with the plate, but verify it rather than assume.

- [ ] **145 — Why does Alight Motion take ages to load and ours doesn't?** His words: *"alight motion
      always takes ages to load when you open the app but ours doesn't, idk if that's coz ours is shit
      and has nothing to load or just loads it well."* Not a bug — a question that deserves an honest
      answer rather than a flattering one. Answer with actual numbers: what we load at boot, what is
      deferred, and which parts are genuine architecture versus simply having far less to load than a
      mature native app.

- [x] **146 — PC: drop the project-name editor at the top, it is already at the bottom.** (v6.94) His words:
      *"also on pc get rid of the project name editor thats at the top, its already at the bottom."*
      Screenshot 1 shows both: **IF I HAD ONE** across the top-left, and the same name again on the
      INSPECTOR header at the bottom-left. Two editors for one field. Keep the bottom one — that is the
      one beside the layer/selection context — and remove the top. Belongs with #143/#144, which are
      rebuilding that top strip anyway.
      **Shipped v6.94, with one judgement call you should check.** That top field is **dual-purpose**:
      with a layer selected it renames THAT LAYER, and only with nothing selected does it show the
      project name. (That is why your screenshot has *"IF I HAD ONE"* up top and *"If i had one slowed"*
      in the inspector — they are a layer name and a project name, not two copies of one thing.) So it
      duplicates the inspector header **exactly when nothing is selected**, and the rest of the time it
      is the only rename control in the top strip.
      Deleting it outright would have quietly taken away layer renaming from the PC top bar, which you
      did not ask for — so it now hides **only** while it would be the second copy of the project name,
      and comes back as the layer renamer the moment you select something. Studio layout only; the
      classic layout has no second field to duplicate.
      **If you did mean "gone in both states", say so and it is one line.** Renaming a layer would then
      live on the timeline (double-click a track head), which already works.

- [ ] **147 — PC: the text editor covers the text you are editing. Get it off the canvas.** (13 Aug,
      screenshot at v6.86.) His words: *"this pop up menu on pc is so shit, it literally covers up the
      text while you edit it, get it off the canvas, also the text edit stuff on pc for some reason
      covers up the canvas, making it smaller when you could just put it in the add menu, so it doesnt
      take up real estate on the screen."*
      Two faults, and the second one carries his proposed fix:
      1. **It covers its own subject.** The "Aa" sheet (Spacing / Line height / Curve / Animate / caption
         controls) and the toolbar + text field below it are painted over the canvas — in the screenshot
         they cover the frame completely, so you are typing blind at the one moment you most need to see
         the result. This is the worst version of the bug: a text editor that hides the text.
      2. **On PC it also shrinks the canvas** to make room, spending screen on a panel that only exists
         while you type. His fix: *"you could just put it in the add menu"* — i.e. on desktop the whole
         text-editing UI belongs in the LEFT panel column (where Add / the inspector live), not as a
         canvas overlay. The canvas then keeps its full size and the text stays visible while you edit.
      Phone is a different problem and is NOT covered by this — there is no side column there, and the
      current overlay is the right shape for a phone. Desktop only.
      **Half shipped in v6.96 — the half you were actually looking at — and I want to be straight about
      which half.** Measured on a 1280x860 window (`tests/_tecover.html`):

      | | covers of the canvas |
      |---|---|
      | the editor card (toolbar + text field) | **0.0%** |
      | **the Aa options panel** | **100.0%** |

      So the card was never the thing hiding your text: `layoutDesktop` already reserves a band for it
      and that works. It was the **Aa panel**, covering the canvas completely — which is exactly your
      screenshot. It now opens in the side column instead, where the app already keeps vertical lists of
      controls, i.e. where you said to put it. Measured after: **0.0%**. Falls back to the old placement
      if that column is too small to hold it, so it can never be worse than it was.
      **Still outstanding: the second half.** The card reserves **169px** at the bottom of the stage, and
      that is the *"makes it smaller"* complaint. Removing it means docking the toolbar and field into
      the side column too — the column is 286px and the card's minimum is 320px, so it needs a real
      re-layout rather than a reparent, and it lands in the same strip #143/#144 are rebuilding. Left for
      when those are settled, so it is done once rather than twice.

- [ ] **148 — Imported audio plays back with a scratchy POPPING that hurts to listen to.** (13 Aug.)
      His words: *"the audio i import is making a realy scratchy popping noise that hurts my ears when im
      trying to play back stuff, this is related to the long on going lag issues with freemotion."*
      **Taking his diagnosis seriously — it is the most useful thing in the report.** Scratchy popping on
      playback is the classic signature of audio BUFFER UNDERRUN: the audio graph is starved because the
      main thread is busy, so the output drops to silence for a few samples and every gap is a click. That
      makes it the same illness as #125/#130, heard instead of seen — which is why it belongs with them
      and not on its own. It is also the loudest possible evidence FOR the lag being real, and unlike a
      dropped frame it is physically unpleasant.
      Other candidates to rule out before accepting that, because a pop has more than one cause:
      **discontinuities at clip/loop boundaries** (starting or stopping a source mid-waveform without a
      ramp clicks every time — a 5ms fade kills it), **sample-rate mismatch** between the decoded file and
      the AudioContext, and **clipping** if gain sums past 1.0. Measure which one it is before changing
      anything: record the output and look for the gaps, rather than guessing from the symptom the way
      the film-grain fix went wrong four times.
      Pairs with **69** (audio must never lag — make the audio clock the master), which is probably the
      real fix if it is starvation.
      **FOUND AND FIXED, v6.91 — and you were right that it is tied to the lag, though not by the route
      I expected.** Five independent readings of the audio path found nothing that survived a skeptic
      (no ScriptProcessor anywhere, so lag cannot starve the audio thread; no double-connect; no
      unramped clip boundary that could reach a plain imported song). What none of them examined was
      the drift correction. Measured in a real browser — four seconds of ONE plain audio clip, no
      effects, speed 1:

      | | before | after |
      |---|---|---|
      | real writes to `el.playbackRate` | **85 (21/s headless, 55/s real browser)** | **6 (1.5/s)** |
      | median sync error | 152.9 ms | **23.4 ms** (inside the 45 ms dead band) |
      | decisions that were a rate trim | 232 of 240 | 76 of 240 |

      `preservesPitch` defaults to true, so a media element answers a rate change with a **time-stretcher**,
      not a resample — and re-priming a WSOLA stretcher tens of times a second is exactly a scratchy,
      warbling noise. Nothing is ever dropped, which is why it left no trace in the seek counter and
      survived every reading of the file.
      **Why it never settled** is the actual defect: `el.currentTime` is latched to the last block the
      element handed the audio device, so it reads a constant OUTPUT LATENCY behind the true audible
      position. That constant is not drift, and a proportional controller cannot remove a constant — it
      just leaned on the throttle forever, asking for +10% permanently and re-deciding it every frame.
      A busier machine means a bigger, noisier latency, which is the real link to the lag.
      Fix: learn the constant with a slow EMA and subtract it (genuine drift accumulates and outruns
      the filter, so it is still corrected), and rate-limit the trim writes to 4/s — a ±10% correction
      needs a full second to close 100 ms, so re-deciding it 55 times inside that second bought nothing
      and cost a stretcher re-prime each time. A speed ramp or preview-rate change is the user asking
      for a rate and is still honoured on the very next frame.
      Covered by a regression test that gives the fake element an 80 ms latency — the harness's element
      was a *perfect* clock, which is why it reported everything healthy while a real browser churned.
      Mutation-checked: with the fix disabled it reports 26.5 writes/s and goes red.
      **Still worth your ears** — this is measured, not heard. If it still sounds scratchy, say so and
      the next suspect is the decode path, not the sync loop.

- [x] **149 — Dragging a caption cue's LENGTH should update live, not jump on release.** (v6.95) His words:
      *"when dragging the cue length for captions it should show it changing live not just wait for you
      to let go then jump."*
      **First look done, and the obvious suspects do NOT explain it — do not start by assuming they do.**
      The timeline chip already sets its own left/width on every pointermove, and the move handler
      already clamps to the clip duration exactly the way `normalize()` does on release, so neither the
      chip geometry nor the release-time clamp is an obvious jump. What is definitely NOT live: the
      inspector's captions list, which is only refreshed in the pointerup branch.
      So: **measure which surface actually jumps before touching anything** — sample the chip width,
      the inspector row and the rendered canvas text on each frame of a drag and compare each against
      its value after release. Guessing at one surface is how the black bar cost six attempts.
      **Measured, and the answer was the surface I had just talked myself out of.** The note above was
      wrong: the chip only *looked* live in the source. `tests/_cuelive.html` samples all three surfaces
      through a real drag —

      | surface | during the drag | across the release |
      |---|---|---|
      | the cue data (`cue.end`) | live | no change |
      | **the timeline chip's rendered width** | **flat at 0.0px** | **0.0 → 462.5 — the jump** |

      A rendered width of **zero** is the tell: the chip was DETACHED. `startCue` calls `selectLayer()`,
      which rebuilds the timeline and throws away the chip element captured one line earlier — so every
      pointermove afterwards was restyling a node that had left the document. Styling a detached node
      raises nothing and shows nothing, which is why reading the code said "already live" while the
      screen said otherwise, and why nothing ever caught it.
      **Fixed v6.95** in two halves: don't rebuild at all when the layer is already selected (the common
      case — you drag a cue on the track you are working on), and re-acquire the chip from the live DOM
      whenever a rebuild does take it, so a drag can never be left holding an orphan. Measured after:
      the chip tracks the finger for 101.9px and does not move at all on release — what you see while
      dragging is what you get. Mutation-checked; the test measures the RENDERED width, because the data
      and the style property were both correct the whole time.

- [ ] **150 — Auto-detect captions: much easier to reach, and let me choose what it scans.** His words:
      *"make the auto detect captions button way easier to access and use. and it should have a choice
      between only detecting where the captions are added in the project or detecting the whole project
      or detecting a specific audio later then let you select it."*
      Two parts:
      1. **Access.** Today "Detect speech" is buried in the Aa sheet next to a source dropdown (his own
         screenshot for #147 shows it). It should be reachable without going three levels deep.
      2. **Scope, three options**: (a) only the span the captions layer covers, (b) the whole project,
         (c) a specific audio layer — and for (c) a picker to choose which. Today it detects against one
         implicit source with no say in the matter.
      **UNBLOCKED — #152 is measured and the detector works** (see it for the numbers). And the measurement
      makes part 2 more important than it looked: it fails specifically when music sits within ~12 dB of
      the voice, so *"detecting a specific audio layer then let you select it"* is not a convenience, it
      is **the fix** — pointing it at the voice track instead of the finished mix is the difference
      between 3 cues and 0. Build the scope picker with that framing, and default to the most voice-like
      source rather than to whatever clip happens to be first.

- [ ] **151 — A caption layer needs effects PER CUE as well as effects on the whole layer.** His words:
      *"Also when editing a caption layer you should be able to chose somehow between adding effects to
      each section or adding effects that effect the whole layer."* So a caption track carries one
      effect stack today (it is a text layer, so `layer.effects` applies to the whole thing), and he
      wants the choice: apply this effect to THIS CUE only, or to the track. That is a real data-model
      change — per-cue effect stacks — plus a control in the effects panel to say which you mean, so
      cost it honestly before starting. Sits naturally with #150 and #149 as a captions pass.

- [ ] **152 — Auto-detect speech probably does not work. He would rather it be REMOVED than shipped bad.**
      His words: *"Also im pretty sure the auto detect speaking and auto make the captions doesnt work,
      could be soemthing way to hard to do and would be better to not add it then add a shit version for
      now."*
      **This changes #150's premise and must be settled first** — making a broken feature easier to reach
      is worse than leaving it buried. What is actually known today: the suite has a green test,
      *"captions: speech detection finds the bursts and ignores a steady tone"*, so the VAD does separate
      bursts from a constant tone **on synthetic audio**. That is a very low bar and says nothing about
      real speech over music, which is his case. It has never been measured on a real recording.
      **MEASURED, v6.90. Short answer: don't delete it — it works, and your report is still right.**
      Ran it against real speech (three sentences from the macOS speech synthesiser, laid out with
      silences of our choosing so the truth is exact — `tests/_vadreal.html`, fixtures committed):

      | what it was given | should find | found | verdict |
      |---|---|---|---|
      | a clean voice recording | 3 | **3** | edges within ~100 ms |
      | voice + music 18 dB down | 3 | **3** | ends up to 290 ms early |
      | voice + music 12 dB down | 3 | **2** | one missed, one 2.35 s late |
      | voice + music 6 dB down | 3 | **0** | finds nothing at all |
      | music, nobody talking | 0 | **0** | correct — invents nothing |

      So it is a genuinely working voice detector that **collapses once music comes within ~12 dB of the
      voice** — and the case you would actually try it on is an imported SONG, where there is no voice
      above the music at all. It then said *"No speech found"*, which reads exactly like a broken button.
      Crucially it does NOT scatter empty captions over a song, which is the failure that would have
      deserved deleting it.
      **v6.90 makes it say which it is**: when it finds nothing and the level never varies — a voice
      swings the level hugely (clipDbStd 100 on clean speech) and a music bed does not (0.18 with no
      voice, against 4.5 at −18 dB where detection still worked) — the message is now *"that reads as
      music, not talking"* instead of a flat "no speech found", with the full stats in the console.
      The suite's old VAD test only asked whether it could tell bursts from a steady tone, which could
      never have answered your question; there is a real-speech test now that fails if a clean voice
      stops being found within 250 ms, or if a cue is ever invented over music.
      **Still your call, and here is the honest trade-off:** the remaining gap is speech buried under
      loud music, which needs a real speech/music discriminator (spectral flux, not level) — a
      substantial piece of work. If you only ever caption voice recordings, it already does the job. Say
      the word and it goes; I am not attached to it.

- [x] **154 — Leaving a project flashes a black bar at the bottom, then it corrects itself.** (v7.02) (14 Aug,
      screenshot of home with a black band across the very bottom.) His words: *"When leaving a project
      for a split second there's a black bar at the bottom then it fixes itself."*
      **Same family as the v6.85 bar, and READ THAT ENTRY FIRST — it cost six attempts.** The lesson
      from it: a strip DARKER than the app means something behind everything is a different colour, not
      that an element is too small. The document canvas is already `#060c0f` (v6.85), so this is
      something else that is briefly uncovered or briefly painted black.
      What is different this time, and is the whole clue: it is **transient and tied to the leave-project
      transition**, so it is a state that exists only DURING the reverse push and is corrected on the
      frame after. Prime suspects, in order: the home screen's own background not yet painted on the
      first frame of its entrance; `#app` still occupying the strip while sliding out; or an element
      with an explicit `#000` (the stage/canvas is painted black by design) showing through for a frame.
      **Measure it as a sequence, not a still** — sample what occupies the bottom strip on every frame
      of the transition and find the frame where it is black. A single screenshot cannot see a
      one-frame fault, which is exactly why the last one took six goes.
      **FOUND AND FIXED, v7.02 — and it is the RESIDUAL of the v6.85 fix, not a new bug.** He reported it
      a second time ("Black bar again", with the band under the + on home), which is what made it worth
      chasing as a steady state rather than a one-frame flash.
      Measured on the live app: `<html>` painted a **flat `#060c0f` with `background-image: none`**,
      while `<body>` carried the glass theme's two radial gradients. Once `<html>` has a background of
      its own, `<body>`'s no longer propagates to the document CANVAS — and the canvas is what paints
      the whole web view, which under `viewport-fit=cover` is taller than the layout viewport. So every
      strip the page did not cover was the ground colour with **none of the theme's light**, while
      everything just above it was lit. Same colour, different brightness: a flat band along the bottom.
      **v6.85 matched the canvas COLOUR and stopped there; it never matched the LIGHT.** The gradients
      live on `<html>` now and `<body>` is transparent, so the two cannot double-paint where they
      overlap.
      The test that came out of it is the durable part: it asserts the canvas is never black against a
      non-black ground (v6.85), never flat against a lit page (this one), and never doubled — checked in
      **both** themes. Three attempts at this family have now each fixed one property of the canvas; the
      invariant is "html paints what the page paints", and it is pinned.
      **He then said "This still happens when I edit text fyi", with a phone screenshot.** Timing matters
      here: his version chip read **v7.00** in the shot just before, so that device had not loaded the
      v7.02 fix yet — it needs a reload before the report means anything. Flagged rather than assumed
      either way. If it DOES persist after reloading, the phone's text-editing takeover is a genuinely
      different path (`body.text-editing #app` collapses the grid to one cell and #stage takes the whole
      area at `var(--stage)`, which is darker than the home ground by design), so ask him which strip he
      means before chasing it.
      (14 Aug, with an Alight Motion screenshot.) His words: *"When dragging a clip from the edges to
      extend, in alight motions there's some differences, it tells you all of this information and also
      shows on little notches, by colouring in the exact notch it will land on, because the notches are
      frames and the whole thing has to actually line up with the notches."*
      Two things, and the second is the one with teeth:
      1. **The readout.** Six values in two rows above the strip, live while you drag:
         `Start` · `End` · `Duration` on the top row, `In` · `Out` · `Change` on the second — where
         Change is signed (`+00:02:59` in his shot). Note Start/End are the clip's place on the
         TIMELINE and In/Out are the trim points within the source, which is why AM shows both.
      2. **The notch strip, and the reason for it.** A tick strip under the numbers where **the exact
         notch the edge will land on is filled in**. His reasoning is the important part: *"the notches
         are frames and the whole thing has to actually line up with the notches."* So a trim is
         quantised to whole FRAMES and the strip is the readout of which frame you are about to get.
         His screenshot also has a coloured mark at each end (pink at the in-point, green at the
         out-point), so the strip shows the whole clip's span, not just the edge being dragged.
      Worth checking first whether our trim already quantises to frames — if it does not, the strip
      would be drawing a promise the trim does not keep, and the quantising is the real work.

- [ ] **155 — Put the open-project glint on the SELECTED add-menu tab.** (14 Aug.) His words: *"I want
      the effect that you have on the open project, like with the shiny line going around it, also on
      whatever you have selected, like elements or shapes etc"*, then immediately: *"Not the elements or
      shapes inside but the main button that opens the menu."*
      So: the travelling light that runs around the OPEN project's card on home (#135, v6.13) goes on the
      **active add-menu tab** — Elements / Shape / Media / Audio / Template — not on the item cards
      inside it. Same meaning in both places: *this is the one that is open*.
      Build it from the SAME implementation rather than a second copy, or the two will drift the way the
      slider glide drifted from the timeline's in #116.

- [x] **156 — Duplicating should leave the copy exactly where the original is.** (v7.01) (14 Aug.) His words:
      *"Duplicating stuff should duplicate it in its exact position, not move it slightly."*
      `FM.cloneLayer` adds **+30px to x and y** on every duplicate (and to every keyframe of an animated
      path), under the comment "nudge so the copy is visible". That was a reasonable default when
      "Duplicate in place" existed as a separate menu entry — but that entry was removed in v5.91 when
      he circled six items and said *"Remove the circled options in this menu"*, so the nudging version
      is now the ONLY duplicate there is. He wants the other one.
      **Shipped v7.01.** The nudge is gone — a duplicate lands exactly on its original, and an animated
      layer's whole keyframe path comes across unmoved (that half hides better than the static one: a
      path shifted 30px is an entire animation displaced). Paste loses the offset with it, which matches
      the AM behaviour that function already follows for time.
      The copy is still tellable apart now that it is underneath the original: it is selected on
      creation, named "… copy", and takes the next clip colour on its own timeline row — and the test
      asserts those two, because with the offset gone they are the only things left doing that job.

- [ ] **157 — TRY moving the film grain off the project cards and onto the background.** (14 Aug.) His
      words: *"I want to try removing the film grain from the projects and instead move it to the
      background, it might be better if the projects are smooth and shiny with a rough textured
      background instead of"* (message ends there). So: cards go **smooth and shiny**, the home
      **background** gets the rough texture.
      He said *"I want to try"* — this is an experiment, so keep it cheap to reverse and expect a verdict
      rather than assuming it lands.
      What is already there to move: the two-layer cross-fading grain on `.hm-card::before/::after`
      (queue 76 → 94 → 105 → 133, four rounds of tuning), six generated noise tiles, and a per-card
      phase. The home background's own `::before`/`::after` are BOTH already taken by the drifting light,
      so the grain needs its own layer rather than a third pseudo-element — and it should reuse the same
      keyframes rather than gaining a second copy (see #116 and #155 for why).

- [x] **158 — The spiral's last stretch is straight instead of curved.** (v7.03) (14 Aug, screenshot of a Spiral
      layer at v7.00.) His words: *"Spiral shapes last little bit is straight instead of round."*
      Visible in his shot: the outer end of the spiral runs off in a straight tail at the upper-left
      instead of continuing the curve. The spiral is an OPEN_POLY — it strokes its polyline rather than
      filling it — so the fault is in the point data or in which points are marked as curve-through
      points, not in the fill.
      **Fixed v7.03, and it was never about the spiral's data.** The tangent at each point is the
      Catmull-Rom (next - prev)/6. On a CLOSED path both neighbours always exist; on an OPEN one the
      missing neighbour was **clamped to the endpoint itself**, so at the last point "next" WAS the point
      and the tangent collapsed to (p - prev)/6 — half the length it should be, aimed straight down the
      chord. Invisible on a closed shape. On the spiral, whose final segment sweeps a wide arc at maximum
      radius, it is a straight tail.
      Reflecting the missing neighbour across the endpoint (2p - prev, the standard phantom point)
      restores it to (p - prev)/3. **This fixes every open path at once** — the spiral, and freehand and
      vector drawings, whose first and last strokes were flattening for exactly the same reason and which
      nobody had connected to this.

- [x] **159 — Shape icons in the add menu do not match the shapes they add. Make them 1:1.** (v7.17)
      His words: *"most shapes icons vary largely to the actual shape, try and make them 1-1."*
      Worth knowing before starting: js/addmenu.js already claims to render each icon **straight from
      the shape's own polygon data** (`FM.SHAPE_POLYS`), with the comment "the menu preview can never
      drift from what actually gets added". So either that path is not being used for the shapes he
      means, or it IS used and the RENDERING differs — stroke vs fill, a different aspect ratio, or the
      icon drawing the unit box where the real shape spawns at its own SHAPE_ASPECT.
      **Measured first** (tests/_shapedrift.html renders every icon and every real shape, normalises both
      silhouettes and scores the overlap). It was not fifty-four small bugs — it was **three** shared
      ones, all in the icon renderer, none in the shape data:
      1. **The icon forced every shape into a SQUARE box** while the app spawns it at its own
         SHAPE_ASPECT. A banner was advertised at 1.84:1 and arrived at 4.08:1; an arrow was shown square
         and arrived nearly 2:1. `SHAPE_ASPECT` is exported now and the menu reads that same table, so
         the two cannot disagree again. Every proportion now matches within about 2%.
      2. **Holes filled in solid.** Shapes made of a body plus an anticlockwise hole — clock, gear, sun,
         wreath, snowflake, laurel — were drawn as one `<polygon>` per subpath, and winding only cancels
         within a single path. A clock came out a plain disc. One path, one fill, nonzero, as the
         compositor does it.
      3. **Curves were drawn as straight lines.** Half these outlines flag points as smooth, and the
         compositor runs them through `FM.pointCtrl`; the icon walked straight segments, so a wreath was
         a polygon of itself. It emits the same beziers now, off the same function.
      **Result across all 54: 2 plainly wrong / 14 drifting / 38 fine → 0 / 6 / 48.** Eye 0.53→0.98,
      clock 0.41→0.92, flame 0.80→0.97, heart 0.86→0.99. The six still drifting are the very fine ones
      (snowflake, laurel, sun, wreath, spiral, note) and they sit at 0.81–0.89, which is small stuff.

- [ ] **160 — The two people shapes need arms, and he wants agents to check the result.** (14 Aug.) His
      words: *"The two people shapes are good but need arms, make sure when adding arms you get other
      agents to verify if it's any good or not."*
      Two shapes: `person` and `woman`. Both currently read as head + body with no arms.
      **The verification is part of the request, not an optional extra** — same arrangement as #63, the
      car, where he asked for "agents holding me accountable". So: draw the arms, render them, and have
      independent agents judge whether the result actually reads as a person with arms, before it ships.
      A drawing change is exactly the kind where my own judgement is worth least — I cannot see it the
      way he can, and the car took several passes.
      **First attempt made and reverted — the SUITE rejected it before any agent saw it, which is worth
      knowing before the next go.** Two existing invariants I had not accounted for:
      1. **"a torso that only tapers".** There is a test asserting the silhouette never narrows and then
         widens again between shoulder and crotch — it calls that "the hip nick". My design pinched the
         waist so the gap between arm and body would open downward; that is exactly the forbidden shape.
      2. **The sub-paths must wind the same way.** Both figures are filled with nonzero winding, so my
         left arm and right arm — built by mirrored branches — wound oppositely and CANCELLED where they
         met the shoulder. The test caught it as "person at 48px has 2 enclosed hole(s)".
      Also learned, and it constrains the design hard: a separating gap has to be **≥ ~0.03H** or it
      closes to a smear on the 24px add-menu icon. The file already records the same finding for the neck
      gap, sized by render rather than by taste.
      **So the next attempt cannot pinch the waist.** The workable direction is arms OUTBOARD of the
      torso — the silhouette's widest point, tapering monotonically once the arms end — with both arms
      generated by one builder and mirrored by coordinate, never by a second code path, so the winding
      cannot differ. Then render and hand it to the agents, as he asked.

      **SECOND ATTEMPT BUILT, SUITE-GREEN (248/248), AND REJECTED BY ALL THREE AGENTS. Not shipped.**
      This is the arrangement working exactly as you asked for it: the drawing passed every automated
      check and was still wrong, and three independent readers said so before it reached you.
      They converged on the same measurements:

      | | man | woman |
      |---|---|---|
      | arm actually separated from the body | ~21% of height | **~3%** |
      | gap between arm and body | 15px of 501 | 5–10px |
      | what it reads as | arms, but as *slots cut in a slab* | **cap sleeves / notches** |

      · **The woman is a regression** — all three said so independently, and two said they would take
        the old armless figure over it. At 96px her gap fills in completely; her bounding box is
        IDENTICAL before and after, so the arms add nothing but two bites out of her outline that read
        as damage.
      · **I made room by eating the man's body.** His torso went from a 148→120px taper to a dead
        constant 98px and his legs 45→35px. One agent called it a clothespin. The arms should have been
        hung outside the body, not carved out of it.
      · **At 24px it costs crispness rather than costing nothing**: solid-black pixels down 21%,
        mid-greys up 22%. The figure got softer, not more informative.
      · A real construction defect I introduced: the arm's outer edge sits ~1px proud of the shoulder
        cap, leaving a visible nick where the cap's radius ends.
      · And **my own judging sheet was clipped** — it never rendered the 24px woman at all, the very
        case that fails first. The third agent caught that. Sheet fixed to wrap.

      **THE REAL PROBLEM IS A CONFLICT, AND IT IS YOURS TO SETTLE.** What they want — a proper body, a
      gap at least as wide as the arm, and arms outside the torso — **cannot fit** inside the existing
      rule that shoulders stay within 1.7–2.3 head-widths. A 120px body plus a 40px gap already reaches
      the shoulder limit before the arm has any width at all. Pick one:
      **(a)** widen the shoulders past the pictogram band (they stop being 1.7–2.3 head-widths);
      **(b)** keep the narrow body and accept a slabbier figure;
      **(c)** give the MAN arms and leave the WOMAN as she is — she reads well armless and every agent
              preferred that to what I built;
      **(d)** leave both alone.
      My own read, for what it is worth: **(c)**, because her dress geometrically has nowhere to put an
      arm that survives 24px, and a mismatched pair is better than a damaged silhouette.

- [x] **161 — Make the Freehand Drawing icon a pencil.** (v7.04) His words: *"Make the free hand drawing
      icon a pencil."* It was a squiggle with a small nib.
      **Vector Drawing's icon was ALREADY a pencil silhouette**, so doing only what was asked would have
      left two pencils side by side — the exact fault the Elements cube note in this file records ("at
      22px the two were nearly the same mark and neither told you what it opened"). So Freehand takes the
      pencil, properly drawn with a ferrule and a tip, and **Vector becomes what it actually is**: a curve
      with two anchor squares, which is the universal mark for a vector path. Say the word if you would
      rather Vector kept its old icon and the pair stayed similar.

- [x] **162 — The loading screen is not fully black any more.** (v7.05) His words: *"Loading screen
      isn't fully black anymore"*, with a screenshot: the splash video's own frame is pure black and the
      surround around it is the app's dark navy, so the letterbox shows as two bands.
      It was deliberate, and the reasoning had expired. Queue 143 changed the splash surround from #000
      to the app ground because a pure-black splash made the UNCOVERED canvas beside it stand out as a
      bar — that was the first ever sighting of the black-bar bug. The note even claims "#060c0f against
      a black video edge is imperceptible at this size"; his screenshot is the disproof.
      **v7.02 removed the reason.** Now that the canvas paints what the page paints, the splash can be
      pure black again — as long as the CANVAS is black too while it is up, or the bands simply move to
      the safe area. So the boot script marks the document while the splash shows and both go black
      together, and the mark is dropped when the splash is removed, restoring the themed light.

- [ ] **163 — Make the pencil and vector drawing icons genuinely good, judged to a high bar.** (14 Aug.)
      His words: *"Make the logos for the pencil drawing and freehand drawing better, get multiple agents
      with really high standards to not accept it until it's perfect."*
      So the two icons v7.04 just changed (#161) are a starting point, not the finish. The verification is
      part of the request again, and the bar is explicitly higher than "does it read": multiple judges,
      high standards, iterate until they accept.
      **Bounded on purpose** — his standing instruction is that no agent loop may run away: a hard cap on
      rounds and a dry-round counter, never an open loop on a judge's own answer. Each round renders the
      candidates at 24 / 48 / 96px (24 is the size that actually matters — it is the shape-picker cell)
      and hands the sheet to judges who score and critique; I revise and re-render.

- [ ] **164 — A freehand stroke gets THICKER the moment you let go.** (14 Aug.) His words: *"When I do
      freehand drawing and finish a stroke it will for some reason make the stroke thicker when I let go
      of drawing, stop that from happening."*
      So the live preview and the committed layer disagree about width — you draw at one weight and get
      another. Almost certainly a coordinate-space mismatch: the preview strokes in SCREEN px on the
      overlay while the committed path is a shape layer whose stroke is in PROJECT px and then scaled by
      the canvas fit, or the committed path picks up a default width instead of the drawing one.
      **Measure both numbers before changing either** — the width used while drawing and the width stored
      on the layer — rather than nudging a constant until it looks close.

- [ ] **165 — Freehand drawing mode: centre the canvas, add erase, add pan/zoom, and real undo/redo.**
      (14 Aug, with a phone screenshot at v7.05.) Four things, in his words:
      1. *"I don't like how it puts the screen to the bottom, needs to be in the middle."* His shot shows
         the canvas shoved down against the tool bar with a large empty band above it — the drawing
         surface should be centred in the space it has.
      2. *"you should add an option to switch from drawing to erasing"* — a draw/erase toggle in the
         drawing bar. Worth settling: does erase remove whole strokes, or rub out parts of one? Rubbing
         out part of a stroke means splitting a path, which is real work; removing the stroke you touch
         is a tenth of the effort and is what most simple editors do.
      3. *"another option that lets you grab the screen and zoom in or out so you can do more detailed
         drawing"* — pan and pinch-zoom the drawing surface. Note this collides with the drawing gesture
         itself, so it needs to be a MODE (a grab/hand toggle) rather than a second meaning for one
         finger.
      4. *"instead of an undo button just add the undo and redo icons that we have in the normal menu so
         you can go back or forwards"* — the bar has a text "Undo" today; it should carry the same two
         glyphs the transport row uses, and redo must actually work inside drawing mode.
      Good sign in the same message: *"The free hand drawing is usable on mobile now"* — so this is
      polish on something that finally works, not another repair.

      **Point 1 ("puts the screen to the bottom") is FIXED in v7.35** — same single CSS rule as the
      "#97 update" band; see that entry for the measurements. The other points here (erase, pan/zoom,
      undo-redo icons) are still open.
- [x] **166 — You cannot swipe the timeline up and down when clips fill it.** (v7.16) (14 Aug, screenshot at
      v7.05 showing nine Freehand rows.) His words: *"For some reason on free hand drawing layers I simply
      can't swipe up and down on the timeline"*, then a minute later: *"Actually it's any layer not just
      free hand drawing layers."*
      **That second message confirms the diagnosis** — it is not freehand-specific at all. It is that he
      had NINE rows, so every touch lands on a clip. `.track-lane` carries `touch-action: none`, so the browser never scrolls it natively, and the
      clip's own touch handler treats any movement past the threshold as a horizontal SCRUB:
      `scrubIntent = adx > 6 && adx > ady` is computed but a vertical drag still falls through to
      `FM.scrubTime(...)`. With few layers you can start a swipe on empty lane and it works; fill the
      timeline with clips and there is nowhere left to start one.
      Fix direction: a vertical-dominant drag that begins on a clip should scroll the track list, which
      has to be done programmatically because touch-action has already opted out of the native scroll.
      **DONE (v7.16), and it was NOT already fixed** — worth recording, because #167's note claimed this
      was the same bug. It was not. #167 stopped one drawing from becoming nine layers, which made this
      much harder to run into; the branch that caused it was untouched. With enough real layers the
      timeline still could not be swiped, and the code still sent every clip-drag to the scrubber
      whatever direction it went.
      The clip path now has the SAME axis lock the empty-lane path already had 90 lines below: commit at
      5px, vertical needs to beat horizontal by 4 (scrubbing is the primary action, so it wins ties),
      and a vertical drag pans `#timeline.scrollTop` by hand — by hand because that element carries
      `touch-action: none`, so the browser will never scroll it natively. Hold-to-move is a different
      branch and is untouched.
      **Check the empty-lane path still scrolls too**, and that this does not break the hold-to-move
      gesture — a hold is stationary, so it should be unaffected, but measure rather than assume.

- [x] **167 — Freehand made a NEW LAYER for every stroke.** (v7.07) His words: *"For some reason when you
      draw with free hand drawing it creates multiple layers, it should all be inside the one drawing you
      just made not keep creating more."* His screenshot: nine `Freehand` rows from one drawing.
      **This is also the cause of #166** — with a row per stroke there was no empty lane left to start a
      vertical swipe on, which is why he could not scroll the timeline.
      `commitStroke()` called `addPathLayer` per stroke, by design ("a stroke is committed and the tool
      stays armed for the next one"). The renderer never needed that: `layer.subs` has been a
      multi-subpath field all along and nothing was ever writing more than one into it.
      **Fixed v7.07.** The first stroke of a session creates the layer; every stroke after it is appended
      and the layer is re-fitted around the union — the box grows and all strokes are re-normalised into
      it, since subs are stored in [0,1] of the layer's own box and a stroke drawn outside the old box
      would otherwise land outside the drawing. The layer keeps its id, stack position and selection.
      Also reset on `startDraw`, not just `stop()`: without that a second drawing would silently append
      its strokes to the first drawing's layer, which is a worse bug than the one being fixed.

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

## Newest requests (2026-08-14)

> **These wait their turn.** The next thing worked on is always the LOWEST-numbered open item in this
> file, not the newest. Ezra, 14 Aug: *"Remember I want the oldest things in the list done first, not
> what I just told you."* New requests are written here immediately so nothing is lost — that is not the
> same as being next.


- [x] **171 — Move the notes button, and hide it when a layer is selected.** (v7.12) *He marked this one "do this
      asap", so it jumps the queue.* His words: *"Put the notes button to the left of the settings cog,
      pushing the refresh button to the left, and you will have to make the editable area for the name
      smaller (mobile) when you have a layer selected and the delete button is there, the note button
      shouldn't even be there, it should only be there when you don't have anything selected."*
      Two things: the ORDER becomes … refresh · notes · cog, and on mobile the notes button is present
      only while nothing is selected — the moment a layer is selected the delete button needs that room,
      and the project-name field gives up width for it.
      **Done.** The phone bar now reads back · name · version · notes · cog · export, and notes is in
      exactly the two hide-lists the cog is in, so it leaves whenever a selection owns the bar. Measured
      at 380px: the name field keeps 128px unselected, and 124px with a layer selected (unchanged, since
      notes is gone by then). On desktop the notes button moved to the cog's left; the refresh chip takes
      the slot left of it when #168/#169 lands.
- [ ] **172 — Export resolution needs a "Same as project" option.** So you can export at exactly the
      canvas size without hunting for the number that matches. (Pairs with #121, which just made the cog
      the source of truth for resolution — this is the option that says "whatever the cog says".)
- [ ] **173 — Export quality should default to High.**
- [ ] **174 — "Export just this clip" should say LAYER, and be a picker, not a tick.** His words: *"With
      the export just this clip tick at the bottom, make it say export just this layer, and also make it
      so when you press it, it isn't a tick but it's a button and it lets you select what layer."* So:
      relabel, and replace the checkbox with a button that opens a layer chooser.
- [x] **185 — The notes button sits too close to the version chip.** (v7.13) His words: *"The spacing for
      the notes button in regards to the ones around it is off, it's too far to the left."* Measured at
      380px and he is right: the version pill is a bordered chip with no air inside its right edge, while
      the icon buttons carry ~10px of internal padding each — so the notes icon had 14px to the chip on
      its left and 24px to the cog on its right. Evened up.
- [x] **186 — Make the notes icon look like a note.** (v7.13) His words: *"Make the little icon for the
      notes menu have a yellow outline with a white background instead of clear and then black lines."*
      It was a plain stroked outline in the bar's own colour like every other icon; now it is a small
      sheet of paper — white page, yellow edge, dark ruled lines — which is the same object the panel it
      opens now is.
- [ ] **187 — The black bar is STILL there, and it CREEPS in.** His words: *"The black bar that comes in
      is really peculiar because it will slowly creep in, idk why and it still isn't fixed fyi, not
      urgent."* Marked not urgent by him, but the new detail is the whole lead and must not be lost:
      **it animates in.** Every fix so far treated it as a static painted band — v6.85 found the document
      canvas painted #000, and earlier rounds chased `theme-color` and the safe-area inset. A band that
      *creeps* is not a painted background at all; something is being TRANSITIONED or is growing over
      time (a height/transform animation, a lazily-applied inset, a layer resizing after first paint).
      So the next attempt starts by CAPTURING it over several frames rather than screenshotting the end
      state — the previous rounds all measured the finished picture, which is exactly why they kept
      finding a plausible-but-wrong static cause. Related history: #157/#166 and the v6.85 note.
- [x] **188 — The notes button still does not sit right.** (v7.17) His words, after v7.13 evened the gaps: *"The
      notes still has two much space from the buttons next to it, make it look good spacing wise."*
      #185 evened the GEOMETRIC gaps at 24px optical each side, and he is still seeing too much air — so
      the remaining cause is probably not the gap at all but the GLYPH: the notes page is a narrow
      upright rectangle while the cog and the export arrow fill their boxes, so the same gap reads wider
      around it. Measure the three icons' ink boxes before moving anything again.
      **That is exactly what it was.** Measured in each icon's own 24-unit space: notes **14 × 18**, cog
      **22 × 22**, export 12 × 16. The page was drawn a third narrower than the cog next to it, so the
      same gap carried about 4px more visible air on each side. The glyph is drawn to fill its box now
      (17.1 × 22 — as wide as a portrait page goes without distorting), and the 10px nudge from #185 came
      back down to 2px, since a wider glyph made that spacing wider still.
- [x] **189 — Even the spacing across refresh · notes · cog · Export (mobile).** (v7.23) His words, third
      time of asking: *"the distance between the settings cog and the export button needs to be the same
      for the notepad and refresh button, it just looks wonky still, don't make me need to ask again."*
      He was right and my first two attempts were aimed at the wrong thing — nudging one button while
      the run kept alternating wide and narrow. **The cause:** those four controls present different
      kinds of edge. The version chip is a bordered pill (ink runs to its border), notes and the cog are
      bare icons (ink sits ~11px inside a 42px tap target), and Export is a filled button (its
      background is the edge). So one flat `gap` yields three different VISIBLE gaps — measured at
      380px: **19.2px chip→notes, 28.1px notes→cog, 14.9px cog→Export**, a 13px spread. Icon-to-icon is
      widest because it pays the padding twice.
      **Fixed by spacing on the visible edges**: pull the two icons together by exactly the flex gap
      (never more — a negative margin past −4px would overlap their tap targets, which matters on a bar
      that also holds the delete bin) and open the two painted-edge gaps to match. **All three now
      24.1px, spread 0.1px.** `tests/_barink.html` measures real ink boxes rather than tap boxes, which
      is what the first two attempts were missing.
- [x] **193 — Nested groups should not be listed on the top-level timeline.** His words: *"groups inside
      groups should show up on the original timeline, only when you go inside the group."* His screenshot
      shows the phone timeline with FOUR "Group" rows stacked (teal, orange, red, purple), each indented
      one step further, and then Squircle and Square un-indented at the bottom — so every level of the
      hierarchy is being listed at once. What he wants is the ordinary tree behaviour: the top level
      shows only the outermost group, and you see what is inside it by going in.
      **Do #191, #192 and #193 together** — they are three views of one thing, how the timeline renders
      group hierarchy, and the screenshot for #192 is the same picture as this one.
      **Done (v7.25) by the same change** — with new groups starting closed, a group inside a group is
      one row at the top level, and you see what is in it by pressing its chevron or going inside. Both
      doors are asserted, because defaulting to closed with no way to open would be a worse bug than the
      one being fixed.
- [x] **194 — Make the + create button beautiful: the home background's palette, moving like it does.** (v7.26)
      His words: *"Make the plus create button look really appealing, give it the colour scheme of the
      background in the home menu and have it move around like it too, you'll need to design in
      differently than the background because the colours will need to be closer together and stuff."*
      He has already answered the hard part himself: a full-screen gradient's stops are spread over
      ~800px, and the same palette squeezed into a 64px circle turns to mud — so the colours have to sit
      CLOSER TOGETHER and the motion has to be scaled to the button, not copied from the background.
      Read the home background's actual gradient and animation first and derive from it rather than
      eyeballing it, so the two genuinely match. Mind the cost: this is a permanently animated element
      over a timeline that is already the app's slowest screen (#125/#130), so it wants to be a
      compositor-only animation (transform/opacity, or an animated background-position on a promoted
      layer) and it must respect prefers-reduced-motion.
      **Done.** The same three hues as `#home-screen::before`, read from that rule rather than typed
      again — teal 41,217,187, violet 122,92,255, blue 38,132,255 — with everything else rebuilt for the
      size exactly as you predicted: alpha up ~4x so a 20px pool survives, radii tightened so they read
      as three lights rather than one wash, travel ~4x larger in relative terms because 6% of a 64px
      button is 4px and invisible. Two pools on 13s and 19s, mirroring the background's 12s against 17s,
      so they keep rearranging instead of sliding as one sheet. Transform-only, so it composites and
      never repaints — it sits over the timeline, the app's heaviest screen — and it stops under
      prefers-reduced-motion.
      The aura is an inner clipped layer rather than the button's own background, because `#add-fab`
      must never take an overflow clip: the filter is applied before the clip, so that would slice the
      glow off square — the "box" you reported twice.
      **Judged by a panel before shipping, per your standing instruction on visual work.** First round
      came back 6.5/10 with one blocking flaw: the pools travelled far enough that a core left the disc
      at the ends of the cycle, so the orb dimmed and opened a dark patch instead of staying a constant
      object. Fixed by halving the travel, pulling the cores to about half the radius, screening the
      pools so they add light instead of painting over each other, and crossing the falloffs at half
      strength to kill a seam. That washed the violet out, so it was re-concentrated afterwards — three
      legible hues at 64px was the hard-won part. The halo is two coloured passes now, teal and
      violet-blue, so the light thrown on the timeline matches the light the orb contains.
      **A second panel then checked the fix, and it found two things I had shipped wrong (v7.27):**
      · **Glyph contrast had regressed.** Screening lifted the face from ~53–74 mean luma to ~112–125,
        which is the point — and it dropped the white + from about 9:1 against its background to
        **3.15–3.50:1**, at the floor for a 2.8px stroke. My comment still claimed "a dark base under
        them so the glyph keeps its contrast", which was stale: screened cores flood straight over any
        base. The shade now sits ON TOP of the pools as a soft centre pool that is not screen-blended.
        Measured after: **4.48–4.94:1** across every phase.
      · **The violet was still leaving the disc.** Its core sat at 0.83R and the drift carried it to
        1.096R — off the 64px face — so for roughly a quarter of the cycle there was no violet at all
        and the orb read as two hues. It did not open a HOLE only because the screened teal and blue
        hold the light up when it goes, which is exactly why checking brightness alone missed it. Pulled
        in to ~0.55R. And my comments claiming "cores moved to about half the radius" and "never takes a
        core outside the circle" were false for that pool — corrected, because comments in this file are
        load-bearing.
      · Also: my 3-frame sheet sampled 0/6.5/13s, which is pool A's period alone. Both pools alternate,
        so the pattern repeats every lcm(26, 38) = 494s and both extremes coincide at 247s — never
        rendered. The sheet samples the combined beat now, and carries a note that it must be shot below
        700px, since every `#add-fab` rule lives in the phone media query (a sheet shot at 800px came
        back as five empty squares and looked like broken CSS).
      · A judging agent left a hand-copied duplicate of this CSS in `tests/_fabcorners.html`, which was
        swept into the v7.26 commit. Deleted — a second copy of the pool values is precisely the
        drift-in-silence trap this codebase keeps hitting.
- [x] **199 — The top-bar run, corrected AGAIN — and the RULE was wrong, not just the numbers.** (v7.28)
      His words: *"Holy fuck why are you so bad at aligning the top buttons… Now the space between the
      settings cog and notes pad is perfect but you've got them far away from the export button and
      refresh button."*
      Three attempts, and the first two both chased the wrong target. #185 moved one button. #189 made
      all three gaps EQUAL by measurement (24.1px each) — and he rejected that too, correctly. **Equal
      distance is not equal appearance here:** a gap bounded by a HARD PAINTED EDGE (the version chip,
      the filled Export button) reads wider than the same gap between two soft glyphs, because between
      two icons the eye counts part of the space as belonging to the icons.
      So the rule is: the two edge-bounded gaps match EACH OTHER and are smaller than the icon-to-icon
      one. Measured now: **18.0 / 24.1 / 18.0** — notes→cog kept at exactly the value he called perfect,
      the outer two brought in and matched. The test encodes that rule now rather than "all equal".
- [x] **200 — The + button had lost its glass rim, which is why it read as flat.** (v7.28) His words:
      *"you've made the create button a square, it looks ugly as shit, it looks like you didn't even
      test it to see if it's good. Slow the fuck down."*
      It renders as a circle in the app — verified in the real editor, not a harness — so the "square"
      is either his phone hitting a WebKit fault or the rounded-square CARDS in the sheet I sent him,
      which was my mistake to send as though it were the button. Two real faults were found regardless:
      · **The glass rim was buried.** `--lg-rim` is an INSET box-shadow on the button, and inset shadows
        paint UNDER child content — the aura is opaque and covers the whole face, so the rim vanished
        and the orb came out lit from below: measured top edge 0.221 against 0.269 just inside it, i.e.
        backwards. That is exactly what makes something read as a printed sticker rather than a lens.
        The rim now rides the aura's topmost layer: edge 0.420, edge-vs-outside 4.06:1 → 7.05:1,
        matching the export button and the home +.
      · **It was frozen for the first two seconds.** Both pools started at t=0, which on
        ease-in-out + alternate is a zero-velocity turning point: 0.073 mean RGB delta in the first
        second against 0.819 mid-stroke, an 11x deficit — every single time the editor opened. Negative
        animation-delays open both mid-stroke.
      Also rebuilt to be unbreakable rather than merely correct in Chrome: no mix-blend-mode, no
      isolation, no oversized children, no rounded overflow clip holding a composited layer — that last
      being a known WebKit fault whose failure mode is a SQUARE.
      **Two finds worth more than the fix itself:**
      · `theme-glass.css` sets `filter:` on `#add-fab` and loads after styles.css, so the two coloured
        halo passes added in v7.26 **never rendered at all**. By this file's own count that load order
        has now silently killed six separate changes. Commented in place.
      · `#add-fab`'s `backdrop-filter` is invisible — the opaque aura covers the face, and rendering
        with it removed is byte-identical — while re-sampling the timeline every frame on the app's
        heaviest screen. Dropped.
      **Open question for him, not fixed silently:** he said "the plus create button" and referenced the
      home menu. The aura went on the EDITOR's +. The home screen's own "New project" + (`#hm-new`) has
      none — and a coloured button sitting on the coloured home background may lose separation, so that
      is a direction call rather than an oversight.
- [ ] **195 — The volume control should be a scrub field like the effects sliders, not a dot on a line.**
      His words: *"The volume slider needs to be like the effects slider and not a dot on a line, because
      I want to be able adjust the volume up to like 1000%."* Two things in one: the CONTROL type (the
      effect params use a drag-to-scrub number field with no fixed end, which is why he wants it) and the
      RANGE (a dot on a 0–100 line cannot express 1000%). Pairs with #184's "no speed cap" — same
      complaint about a slider whose ends are the limit.
      Before building: gain above 1 clips, so check what the audio path does past unity (a hard clip
      sounds broken and he will report that next). If it needs a limiter or a soft knee, say so rather
      than shipping a slider that distorts at 300%.
      **CHECKED FIRST, and it is not a slider job — the two audio paths disagree above 100%**
      (`tests/_volclamp.html`, measured rather than read):
      | path | above 100% |
      |---|---|
      | **Preview** — `m.el.volume`, an HTMLMediaElement property (js/app.js:1139, :1212) | **impossible.** Setting 2 THROWS IndexSizeError and the value stays 1. app.js also clamps it itself. |
      | **Export** — a Web Audio `GainNode` (js/exporter.js:242+) | accepts 10 without complaint and amplifies |
      So if the slider were simply widened today: **you would hear no change at all while dragging, and
      then get a distorted file.** Silent in the preview, loud in the export. That is exactly the kind of
      half-working feature that gets reported the day after it ships.
      **What it actually needs, in order:**
      1. **A gain stage in the preview** — route each media element through `createMediaElementSource` →
         `GainNode` → destination, so the preview can exceed unity and agrees with the export. This is
         the real work, and it carries a real risk worth naming: on iOS Safari, creating a
         MediaElementSource while the AudioContext is suspended can silence the element outright, and it
         cannot be undone for that element once created. Getting this wrong silences ALL audio on his
         phone, so it wants its own careful pass — not a tick that also does three other things.
      2. **Then** the control: a drag-to-scrub field like the effect params, which is the half he asked
         for by name.
      3. **Then** the range, with a limiter or soft knee. At 1000% anything already near full scale
         clips hard, and hard clipping sounds like a broken file rather than a loud one.
      **Question for him, since the honest options differ a lot in size:** do the gain stage properly so
      1000% really works everywhere (bigger, touches audio routing), or ship the scrub-field control
      first at today's range so at least the control feels right? My recommendation is the gain stage —
      the control alone would still leave the slider lying above 100%.
- [ ] **203 — An "Improve quality" action in a clip's ⋯ menu.** His words: *"We should add a button in
      the three dot menu when tapping on a clip to improve quality, so if your video or photo is low
      quality then you can add pixels or whatever to enhance it."*
      Be straight with him about what is possible before building anything: nothing in a browser invents
      detail that is not in the file. What CAN be done, and is worth having, is a proper upscale —
      resampling to a larger raster with a good kernel plus a little unsharp mask and grain, which does
      make a soft phone clip look meaningfully better on a big canvas. What cannot be done is
      film-and-TV "enhance". Name it for what it does (Sharpen & upscale, say) rather than promising
      pixels it cannot create, or the feature will read as broken.
- [ ] **204 — Swiping UP on Recents should open Faves — he has now said UP twice.** His words: *"Idk if
      you've done it but it still needs to be added that swiping up on the recents menu in effects opens
      the faves menu."*
      **This resolves the ambiguity flagged in #124.** That entry recorded the conflict honestly — he
      said swipe UP to open and also "swipe back up and cancel" — and it was built as pull-DOWN because
      down was self-consistent with the cancel. He has now said UP plainly and unprompted, so the
      gesture flips: **up opens, and reversing (down) cancels.** The mechanics from #124 all carry over
      unchanged — the commit threshold, the sticky reversal-cancel, the hint wording. Note the reason
      down was chosen originally, from the code comment: the browser is itself a vertical scroller, and
      up IS the scroll direction, so an up-gesture has to be claimed carefully — gate it on the scroller
      being at the BOTTOM, the mirror of the current `scrollTop <= 0` gate, or it will fight scrolling.
- [ ] **205 — Move & Transform should hide the outline and show the anchor point instead.** His words:
      *"Make it so when you open move and transform it gets rid of the outline on the shape or layer, and
      instead just shows the anchor point as a circle depending on where it is."*
      Sensible: while you are moving something, the selection box is the one thing you do not need, and
      the anchor is the thing you cannot currently see at all — which matters because everything rotates
      and scales around it. So: entering Move & Transform hides `#select-box` and draws a circle at the
      layer's real anchor, in canvas space, following it as anchorX/anchorY change. Check it survives
      rotation and scale (the anchor is in the layer's own space, so it has to go through the same
      matrix the handles use), and that leaving the section brings the box back.
      **And the same for Edit Points** — his follow-up: *"Same with when opening edit points."* That one
      already draws its own point handles, so the selection box on top of them is pure clutter. Do both
      in one pass: a single rule for "this section owns the canvas overlay, so the selection box stands
      down", rather than two special cases that will drift apart.
- [ ] **206 — Shapes need SENSIBLE edit points, not a million dots. ⚠️ HELD — he is doing this one WITH
      me, and asked me not to start it.** His words: *"in alight motion, each shape has sensible edit
      points that are actually useful and make sense, in ours only some shapes have that but most have
      just got a million little edit dots, which is finicky as shit, so we're going to have to fix that
      up but I know if you just go and do that urself ur gonna ruin every shape and make it look shit.
      So wait for me."*
      **DO NOT START THIS ALONE.** He is right about the risk: editing the point sets IS the shape
      library, and a bad pass would quietly wreck fifty-four shapes at once. This entry exists to hold
      the ask, not to authorise the work.
      What is worth knowing when he is ready — recorded now so the session with him starts informed
      rather than starting from scratch:
      · The dots come straight from `FM.SHAPE_POLYS`. A shape traced from a reference carries every
        sampled vertex, so a curve that reads as one smooth arc is a dozen points to drag; a shape drawn
        as geometry (rect, triangle, chevron) has only the points that mean something. That is exactly
        the split he is describing — "only some shapes have that".
      · So the fix is per-shape and is a DRAWING job, not a code job: choosing which points carry the
        form and letting the existing smooth-flag/bezier machinery (`FM.pointCtrl`) hold the curve
        between them, instead of approximating it with vertices.
      · Suggested first step, and it costs nothing and changes nothing: count the points per shape and
        rank them, so the conversation starts from "these eleven are the finicky ones" rather than from
        opinion. **Ask him before even doing that** — he said wait, and that includes me being clever.
      · Whatever we change, the ADD-MENU ICON follows automatically now (queue 159 made the icon read
        the same polygons), so the tile and the shape cannot drift apart while we work.
- [ ] **207 — The four home tabs should stagger their contents in, and the tab itself should react.**
      His words: *"Make it so when you open up any of the 4 menus like projects elements etc it does
      something like the animation when opening the app where all of the spawn in loading from top to
      bottom, i think that would look very clean, also adding a little animation to the button you press
      to open that menu."*
      The machinery already exists and is his own from v4.92: home.js stamps `.hm-in` plus a per-element
      `animation-delay` on each card so they rise on their own beat, top to bottom. This is asking for
      that same treatment on every TAB SWITCH, not just on first load — plus a small press reaction on
      the tab button itself. Reuse the existing keyframes rather than writing a second set, or the two
      will drift; and cap the stagger so a long list does not take a second to finish appearing.
- [ ] **208 — The add sheet wastes a band at the bottom on the phone.** His words: *"We need to utilise
      this wasted space on phone, each icon in that section could be longer and more square so then it
      fits it all nicely"* — with a screenshot of the Elements tab, a red ring drawn round an empty strip
      below "Adjustment / Empty group / Custom elements".
      So the twelve cards should grow to fill the sheet rather than leaving a dead band: taller cards,
      closer to square. Watch two things — the sheet's height varies with the device (and with the
      safe-area inset), so this wants the cards to FLEX into the available height rather than a taller
      fixed size that overflows a smaller phone; and the tabs above must not grow with them.
- [x] **201 — Show that a layer is LOADING, with a spinner bottom-left.** (v7.30) His words: *"I think the issue
      with layers I add being invisible is because they're just loading, so make the app identify this
      loading and put a nice smooth loading circle that moves in the bottom left corner."*
      His diagnosis is worth taking seriously — a just-added video has to decode before it can draw, and
      an empty canvas with no explanation is indistinguishable from a broken import. Needs: a real signal
      that a layer's media is not ready yet (not a timer), a smooth indicator bottom-left, and it must
      disappear the moment the frame is available. Pairs with #202, which is probably the same media not
      being ready.
      **He diagnosed it correctly, and it is measured** (`tests/_onevideo.html`). Importing a 1280×720
      clip and sampling the media element every 250ms from the moment the layer is added:
      `t=0ms readyState 1 → drawImage BLANK`, `t=250ms first pixels`, `t=500ms readyState 4`. So there is
      a real window where the layer exists, its clip is in the timeline, and the canvas can only draw
      nothing. Half a second here; far longer on a phone with a real camera-roll clip. Nothing was wrong
      with the import — **the app just never said it was working.**
      **Done:** a rotating arc bottom-left (that corner is the only empty one — the + owns bottom-right),
      naming the clip when there is one and counting them when there are several. Ready means
      `readyState >= 2` deliberately, not 4: that is the first state where a frame is guaranteed, and
      waiting for "can play through" would keep it up long after the picture is on screen. The poll runs
      only while something is pending and stops itself, because an always-on interval on the heaviest
      screen is exactly the sort of thing this project has had to hunt down before.
- [ ] **214 — Notes must belong to ONE project, and travel with the saved file.** His words: *"Currently
      the notes carry across projects, I want each projects notes only for that project, and when you
      save the project file as well it should save the notes."*
      Two halves. The first is a real bug: notes were designed to live on `scene.project.notes` precisely
      so they belong to the project — so either they are being written somewhere global, or the notes
      array is surviving a project switch because the scene object is reused. Find out which before
      changing anything; if it IS on the project, then something is copying it forward. The second half
      is a gap: the `.fmotion.json` save needs to carry `notes` through export AND import, and an old
      file without them must still open.
- [ ] **215 — ⚠️ EXPORTED VIDEO CAME OUT WITH NO AUDIO, though the clip had audio.** His words: *"I just
      exported and got no audio even tho the video had audio."*
      **I rate this the most serious open item.** Everything else is the app being awkward; this is the
      app's actual OUTPUT being wrong, silently, after a long render — and you only find out afterwards.
      It is going to the bottom of the queue per the oldest-first rule, but **say the word and it jumps
      to the front** — I think it should.
      Where to start: the export mix is built separately from the preview (`buildAudioMix` in
      js/exporter.js), so this is NOT the same code as #96, though it may be the same CLASS of bug —
      that one was a duration gate silently muting a clip. Check first whether the track is being muted,
      mixed at zero, or never decoded at all; and check `layer.muted`, since Extract Audio deliberately
      mutes the original and a muted ORIGINAL plus a missing twin would produce exactly this. Establish
      which by exporting a known clip and inspecting the file, not by reading.
- [ ] **216 — An "audio only" export option.** His words: *"Add an export option to just export audio."*
      A natural pair with #215 — and useful in its own right for pulling a soundtrack out. Needs a format
      decision (m4a/aac is the obvious default) and the export dialog's resolution/fps controls should
      hide themselves when it is chosen, rather than sitting there meaning nothing.
- [ ] **217 — Most ways of getting a layer into the app skip the safety checks.** *(Found by me on
      14 Aug while doing #113 step 1 — not something you reported.)* There is a function that rebuilds an
      imported layer's audio effects, masks, behaviours and camera from a known-good schema, so a corrupt
      or hand-edited project file can't reach the renderer. It has exactly ONE caller: importing a
      `.fmproj` file. Everything else gets nothing — inserting a template, inserting an element, duplicating
      a project, pasting a layer, and undo/redo restore. Effects are covered everywhere now (v7.38 wired
      those in separately, including the autosave load), but the rest of the layer still isn't.
      Not urgent and nothing you'd see today; the reason to fix it is that #113's filters make
      `layer.effects` a nested structure, and "which paths validate" stops being an academic question the
      moment a container can arrive through one that doesn't.
- [ ] **218 — Three saved lists write straight into a layer's effects with almost no checking.** *(Also
      found on 14 Aug.)* The effect clipboard, the effect presets and the layer presets all live in
      localStorage and all rebuild `layer.effects` from what they find there, checking only that the
      effect NAME is real — never the values. Same story as #217: harmless-ish today, genuinely not once a
      filter is a container with children inside it. Worth folding into the same pass as #217.
- [ ] **213 — The + at the bottom of the home screen needs a bigger HIT BOX, not a bigger button.** His
      words: *"Make it so the button on the bottom of the screen has a larger hit box, don't make it
      bigger but larger hit box cos I keep accidentally opening projects."*
      So a tap NEAR the + is landing on the project card behind or beside it and opening that project —
      which is the worst possible miss, since it navigates away. The button must look identical and
      catch more.
      Ways that keep the look: a transparent `::before` inset by a negative margin (the standard trick,
      and it costs nothing), or padding plus a background-clip so only the inner disc paints. Mind two
      things: the expanded box must not swallow taps meant for the card BEHIND it in a way that makes
      the list feel dead, and it must not overlap the safe-area home indicator. Measure the real hit
      rect before and after, the same way #189's spacing was measured — a hit box is invisible, so
      "looks fine" cannot confirm it.
- [ ] **212 — A long-exposure camera tool for his phone (Slow Shutter Cam style). NOT DECIDED — he asked
      whether it was possible, not for it to be built.** His words: *"Would it be possible for you to
      create me a camera tool for my phone that can do cool long exposure photography? Like this app
      here, if so make a plan on how ur gonna do this and lmk if it would be better if I switched this
      project to my laptop for development (Mac)"* — with a screenshot of Slow Shutter Cam: Capture Mode
      (Motion Blur / Light Trail / Low Light), Light Sensitivity, Shutter Speed, ISO.
      **Re-logged 14 Aug after a handover.** This was raised in a DIFFERENT session, logged there as
      #212 along with a plan and a probe page, and then removed again at his request — he found it
      confusing and did not want anything done inside FreeMotion. So its earlier absence from this file
      was a revert, not an oversight, and it is recorded here because the rule is that nothing he asks
      for is lost. **It is not authorised work.** Two things to settle before anything is built:
      whether it belongs in FreeMotion at all (his instinct was no), and his laptop-versus-phone
      question.
      Two facts checked rather than taken on trust: `git diff` between the commit before and the commit
      after that episode is **empty** — no app file, test or version was touched, and nothing was
      force-pushed. And a stray remote branch `claude/phone-camera-long-exposure-siapuq` still exists on
      GitHub holding the reverted content; it is merged into nothing and affects nothing, but **he may
      want to delete it from GitHub's branches page** — that session was refused permission to.- [ ] **211 — The layer thumbnails in the track heads are stretched and overflow their box.** His words:
      *"The images for each layer on the left side are glitched out, you see how they're like stretched
      and going out too far? Looks shit."* Screenshot: a blue house and an orange umbrella in the track
      heads, both squashed wide and spilling past their rounded frame.
      Both are SHAPE layers, and their thumbnails are drawn from the shape itself — so the likely cause
      is the same one #159 found in the add menu: the art being fitted to the box's aspect rather than
      its own. Worth checking that first, since the fix there (read `FM.SHAPE_ASPECT`, fit rather than
      stretch) may apply directly. Check media thumbnails too — if they use the same helper, a video
      whose aspect differs from the box will be stretched the same way and nobody has mentioned it yet.
- [ ] **210 — The add-menu cards look generic. Per-tab colour direction, in his own words.**
      *"The shapes colours are fine, but the rest aren't. They're generic and copy paste. They need to
      look quality."* Four screenshots, one per tab. Shape is the one to leave alone — it is the
      reference for "done right".
      · **Elements** — *"choose more subtle background colours, the main icon can stay bright but the
        backdrop more subtle, and also just change the colours up in general and pic better stuff, we
        don't want it the exact same as the shape menu."* So: keep the icons bright, drop the backdrop
        intensity, and pick a palette that is deliberately NOT Shape's.
      · **Media** — AI Scene: *"just a yellow colour for the background that isn't obnoxious."* Sample
        clip: *"a pinky red colour and blue gradient."* Import: *"a basic grey."*
      · **Audio** — Import audio: *"basic grey."* Sound effects: *"a rainbow 🏳️‍🌈."* Record voice:
        *"a strong red."*
      · **Template** — *"it shouldn't even colour it should show the hero image of whatever the template
        is (still keeping the text)."* So the card becomes a thumbnail of the template with its label
        over it. Note the empty state ("No templates yet") still needs to look like something.
      The greys are worth reading as a system rather than as three separate asks: **Import and Import
      audio are both plain grey on purpose** — the neutral, everyday action — while the things that
      MAKE something (AI Scene, Sound effects, Record voice) carry colour. That is a real hierarchy and
      it should survive whatever palette gets chosen.
- [ ] **209 — The × and search buttons in the effects header are off-centre and colourless.** His words:
      *"The search and x buttons in this menu look shit, make them actually centred inside their own
      circle. Make the x button red and the search one a nice blue."* Screenshot: the Add Effect header,
      where both glyphs sit visibly high/left inside their round buttons.
      Likely the same class as #188 — the glyph's ink not being centred in its box, rather than the box
      being wrong — so measure the ink, not the button. Colours: red for ×, blue for search.
- [ ] **202 — One simple video layer lags badly, and the video does not load properly.** His words:
      *"when I add just one Simple video layer even on smooth settings in FreeMotion the project still
      lags, no effects or anything, really laggy, and also the video is seemingly broken and not loading
      properly."*
      **This is the most serious thing open.** One clip, no effects, quality set to smooth, and it still
      lags — that is the core experience being wrong, not an edge case, and it sits with #125/#130 (the
      long-running lag) and #128. The second half — "seemingly broken and not loading properly" — may be
      the same root cause as #201: the media not being decoded/ready while the timeline already thinks it
      should draw. Measure both together: what the frame budget is spent on with exactly one video layer,
      and what state the media element is in during the period he calls broken. Do NOT tune anything
      before that measurement — this area has already produced three plausible-but-wrong causes.
      **MEASURED (`tests/_onevideo.html`), and the two halves give different answers.**
      · **"Not loading properly" is REAL and is now fixed** — see #201. There is a genuine window where
        the clip cannot draw at all, and the app said nothing about it.
      · **The LAG did not reproduce here.** Recording a real 1280×720 clip, importing it through the
        app's own path, quality on *smooth*, one layer, no effects: `renderScene` runs at a **median of
        4.40ms** (mean 4.62, p95 9.10) against the 16.7ms a 60fps frame has, and the app held itself on
        **tier 0 of 6** — it never even felt the need to drop quality. Nothing here is over budget.
      So the lag is **device-specific, or outside renderScene**, and I am not tuning anything on that
      basis — that is exactly how this area has already produced three plausible-but-wrong causes.
      **What would settle it:** the same measurement running ON HIS PHONE. `FM._perfState()` and
      `FM.playbackQualityInfo()` already report the tier, the frame average and the canvas size; the
      missing piece is a way for him to read them and send them over. That argues for a small "what is
      slow" readout in Settings rather than more guessing from here.
      Worth noting the decode window above is a plausible part of what he calls lag: while a clip is
      still decoding, the app is competing with the decoder for the same device.
- [x] **196 — A Sound Effects button in the Audio tab, with a library of effects.** (v7.29) His words: *"in the
      audio tab we will add a button that is sound effects and you will be able to use that to add sound
      effects to the project, we will have a sound effects menu with a bunch of our own sound effects and
      some royalty free ones we find online, that we can legally use for free."*
      The BROWSER is straightforward — a new tile in Audio opening a categorised list, one tap to add,
      the same shape as the elements browser. Two things to settle before any of that, though:
      1. **Where the audio actually comes from.** "Royalty free ones we find online" needs sources whose
         licence is explicit and permissive — CC0 / public domain, not "free to download". I will not
         pull audio off arbitrary sites, so this wants either a named CC0 source you are happy with, or
         effects generated in-app (a synthesised whoosh, click, pop, riser is very doable in the Web
         Audio API and has no licence question at all).
      2. **Size.** This is a no-build local-only app; a folder of WAVs is megabytes that everyone
         downloads on first load and the service worker then caches. Synthesised effects weigh nothing.
      **Worth a decision from you: synthesised set first, or sourced files?** My recommendation is to
      build the browser plus a synthesised starter set — it ships immediately, is legally clean, and the
      same menu can take real files later.
      **His reply: "Good ideas btw for the sound effects menu."** So that is what shipped.
      **Done (v7.29): sixteen effects across Movement / Impact / Build / Interface / Texture**, every one
      SYNTHESISED — no licence question, nothing to download, and re-tunable by changing a number rather
      than by finding another file. Each row plays on tap (the one real difficulty with sound effects is
      that a name tells you nothing) and adds as an ordinary audio clip: it renders to a WAV and goes
      through the same path the voice recorder already uses, so it trims, fades and exports like any
      import. Nothing downstream knows it was generated.
      **Three faults the measuring caught that code review would not have:**
      · Handing recipes a proxy context with `destination` overridden throws "Illegal invocation" on the
        first `createGain()` — a native method refuses a plain object as `this`. All sixteen failed
        identically. They are passed their output node explicitly now.
      · The ticking build **hung the renderer outright**: its gap shrank geometrically, so the intervals
        summed to 1.33s and `t` could never reach a 2s duration. Infinite loop, no output, no error. The
        gap has a floor now, which also sounds better — below ~45ms ticks stop being countable.
      · Levels were eleven-fold apart (Reverse whoosh 0.08 peak against Impact 0.90), so a whoosh after
        an impact would have sounded like nothing happened. Every effect is normalised to a common peak
        now, with a per-effect `level` for the ones that SHOULD sit lower — a click ought to be quieter
        than a boom. That makes relative loudness a decision rather than a side effect.
      Real files can still be added later; the browser does not care where a buffer came from.
- [x] **197 — Drop the "…" from the Import buttons in Media and Audio.** (v7.24) His words: *"On both the
      import buttons in the media and audio menus on mobile it has three dots on the text for those two
      buttons, get rid of that."*
      Checked it was not CSS truncation first — `.addmenu-lbl` does ellipsise, so that was the obvious
      suspect, but measuring every label in every tab (`tests/_lbltrunc.html`) showed **none of them is
      cut**. The dots are literal characters in the labels, `Import…` and `Import audio…`, the desktop
      convention for "this opens a picker". On a phone every tile opens something, so it says nothing
      and just looks like a truncated word. Removed.
- [x] **198 — Take Project notes out of App settings.** (v7.24) His words: *"Get project notes out of the
      app settings menu."* It only lived there because the notepad's phone button had been reverted once
      (the suite caught that it shifted the cog into the delete bin's slot); since #171 there is a real
      notes button on BOTH bars, so the settings row was a second door. Same rule as #175 (loop playback)
      and #122 (onion skin): one control, one home. Checked the remaining door exists on both bars before
      removing it.
- [x] **191 — The arrow beside a group's hide button, and the layout it shoves sideways.** His words:
      *"some weird stuff going on in the grouping menu, like an arrow next to the hide button, idk what
      that does and it pushes the ui over making it ugly."* Visible in his #190 screenshot: the group's
      track head carries a small ▾ to the LEFT of the eye, which is presumably the expand/collapse
      disclosure — and whatever it is, it is unlabelled, unexplained, and it widens the head so every
      row's contents shift. Two parts: say what it does (or remove it if the row already expands another
      way), and stop it changing the head's width — a control that only some rows have must not move the
      ones that do not.
      **Done (v7.25).** It is the group's expand/collapse toggle, and only group rows had one — so a
      group's eye, thumbnail and name all began 16px further right than every other row's, which is the
      shove he is describing. The slot now exists on EVERY row and is simply empty on a normal layer:
      same width, nothing drawn, nothing to tap. Its tooltip says what it does in words instead of
      expecting a triangle to explain itself. The test compares the eye's position across rows AT THE
      SAME DEPTH — members carry a deliberate 18px indent, which is the tree showing structure and not
      the fault he reported; the first version of the check argued with that indent and failed.
- [x] **192 — Grouping should MOVE the layers in, not copy them.** His words: *"when I group stuff I want
      the layers grouped to move inside the group not be duplicated and left outside the group."*
      Potentially serious — if grouping really leaves copies behind, every group doubles the scene. Check
      first whether they are genuine duplicates or the timeline is LISTING each member twice (once inside
      the expanded group, once at top level), because those are completely different bugs with the same
      appearance. Count `FM.scene.layers` before and after grouping to tell them apart before touching
      anything.
      **Done (v7.25), and nothing was ever duplicated.** `groupSelection` re-inserts the very same
      layer objects and the scene grows by exactly one row — the group itself; the test now asserts that
      count. What he saw is that a new group opened EXPANDED, so its members stayed listed on the
      top-level timeline underneath it, which looks exactly like copies left outside. A new group starts
      CLOSED now, so grouping does visually what it does structurally: the layers go in.
- [x] **190 — Remove the "Editing group ‹ Group" pill.** (v7.23) His words: *"Get rid of the editing group go back
      button pop up, the top left back button works fine."* Phone screenshot: a bordered pill floating at
      the bottom of the inspector reading "‹ Editing group  Group" while inside a group. He is right that
      the top-left back arrow already leaves the group, so it is a second door to the same place taking
      up the bottom of the panel. Check the back arrow really does exit group context on BOTH phone and
      desktop before deleting the pill, so this does not repeat queue 53 (Group's action survived and
      every way to reach it did not).
- [ ] **184 — Speed menu: AM's four "speed to the playhead" buttons, and no speed cap.** Three parts,
      from one message (AM screenshot attached showing the four buttons above the 1.00x slider):
      1. *"the speed menu needs the crop buttons… let's say your clip is slightly too short for what you
         need, then you can go on the timeline to exactly where you want it to last to, then press a
         button and it will change the speed to go exactly to that point."* So: park the playhead, press
         the button, and the speed is SOLVED for so the clip ends exactly there. AM has four of them —
         the same left-edge/right-edge × from/to pairs as our existing extend-and-crop buttons.
      2. *"it seems alight motion lets you speed up and slow down unlimitedly, you can have something
         1000x speed for example."* — so the slider's range stops being the limit; find our current cap.
      3. *"it should be able to speed up stuff to your pointer, kinda like how we have the extend and
         crop buttons already, but instead of extending it, it just makes it faster or slower."* — the
         same gesture vocabulary as trimming, applied to speed.
- [ ] **183 — Canvas settings needs "Save project as preset".** His words: *"This settings menu shall
      have an option that says save project as preset"* — screenshot is the **Canvas settings** dialog
      (aspect · Resolution · Frame rate · Background · Size · App settings / Cancel / Apply), so it is
      that dialog, not App settings. Presumably saves the canvas setup — ratio, resolution, fps,
      background — as a named preset you can start a project from. Ask what it should capture if it is
      not obvious when its turn comes.
- [x] **182 — "Save as preset…" should say "Save layer's effects as preset…".** (v7.15) His words: *"Where it
      says save as preset, make it say save layers effects as preset."* It is in the layer ⋯ menu, one
      line above "Save selection as element…", and on its own "Save as preset" does not say what it
      captures. **Done** — and naming the owner also tells it apart from the other one, an individual
      effect's own ⋯ → Save as preset, which stays as it is.
      **One thing to flag, since the new label is narrower than the truth:** a layer preset does not
      only store the effects list. It also carries the fill, stroke, shadow, blend mode, colour grade,
      corner radius and the transform curves (rotation/scale/opacity and x-y deltas). So applying one
      can change a layer's colour, not just its effects. Say the word and it becomes something like
      "Save layer's look as preset…"; left as you asked it for now.
- [ ] **179 — Finishing a vector drawing leaves you stuck in the full-height panel.** His words: *"When
      you finish adding a vector drawing it does this and you have to swipe down"* — with a phone shot of
      the nine-category inspector filling the ENTIRE screen: the nine cards at the top and roughly two
      thirds of the screen empty black below them, no canvas, no timeline. So on finishing a vector
      drawing the inspector opens in its full-height/editing state instead of the normal docked one, and
      the only way out is a swipe down. Related to #165's "puts the screen to the bottom" complaint about
      freehand drawing — check whether both come from the same place before fixing either.
- [ ] **180 — Lots of effects don't work on text.** His words exactly.
      **MEASURED, 2026-08-14 — he is right about what he sees, and the cause is arithmetic, not a bug.**
      Text defaults to pure WHITE (`js/scene.js`: `base.color = props.color || '#ffffff'`), and on pure
      white:
      | effect | on default white text |
      |---|---|
      | Saturate | **cannot ever do anything** — white has no colour to strengthen or drain |
      | Grayscale | **cannot ever do anything** — white is already grey |
      | Hue Rotate | **cannot ever do anything** — there is no hue to rotate |
      | Brightness | only works when LOWERED. Its default is 1.3, i.e. *brighter* — so adding it does nothing at all until you drag left |
      | Contrast | only works when lowered, same reason |
      | Sepia / Invert / Glow | work |
      So five of the eight headline colour effects appear dead on the most ordinary text layer there is,
      and two of those five do nothing *at their own default value*. Nothing in the app says why.
      **This needs a decision from him rather than a guess from me**, because every fix is a taste call:
      leave it and explain; warn in the inspector when an effect cannot affect this layer; or stop
      defaulting text to white. Worth asking whether his own case was white text — if he saw it on
      COLOURED text there is still a real bug to find, and this explanation is not it. Needs the same treatment #110 got:
      enumerate which effects do nothing on a TEXT layer, find out whether it's one shared cause (e.g.
      effects that sample the layer's pixel buffer vs. ones that transform it) or a list of separate
      bugs, and report the measurement before changing anything.
- [x] **178 — Get rid of the Classic theme option.** (v7.15) Careful one: "Classic" is a name this app uses for
      TWO different things — the Classic/Studio *layout* toggle and a Classic *theme*. Check which is on
      screen in Settings before deleting anything. **Checked — it is the theme, and he said "theme", so
      there is no ambiguity to resolve:** Settings → Appearance is `Liquid | Classic` (js/settings.js:328)
      and that is the one to lose, leaving Liquid as the only look. The separate `Classic | Studio`
      LAYOUT row (js/settings.js:373) stays exactly as it is. Delete the option, make glass unconditional,
      and remove the CSS only the classic theme used.
      **Done.** The whole Appearance row went — a segmented control with one segment is not a control.
      There was no classic-only CSS to delete: "Classic" was simply the app with `theme-glass.css`
      switched off (that sheet is scoped entirely to `html[data-theme="glass"]`), so the attribute is
      now set unconditionally. A `theme: 'classic'` saved before this is ignored on load rather than
      honoured — that stored value was the one way someone could still be looking at a look with no way
      back to the other one. The test checks the layout row survived, since a check for the word alone
      would have passed while the wrong control went missing.
- [x] **181 — Theme the notepad like Apple Notes.** (v7.12) His words: *"I want the notes area to be themed like
      a note pad, similar colours to apples notes app, yellow with white background, I feel this will look
      cool."* So the notes panel stops being another dark app surface and becomes a light paper one —
      yellow accent, white sheet. It is the one place in the app that is a *document* rather than a
      control surface, so it can afford to look unlike the rest.
      **Done.** Both the notepad and the pre-export card are paper now: a yellow glued top edge, a warm
      white sheet, ruled feint lines under the rows, and the writing sitting ON the paper instead of in
      dark boxes. Deliberately single-look — paper does not have a dark mode. The Done button had to stop
      being `btn-accent`: the app's blue outranked the paper styling and came out as a blue button on a
      white sheet.
- [x] **177 — Delete "Reset project" entirely.** (v7.14) His words: *"Completely remove the reset project
      button, it doesn't need to exist anymore, someone can just delete it and make a new project."*
      It lives in the Settings panel (it moved there in v6.13 when the ⋯ menu was dismantled). Remove
      the button, its handler and its confirm — and check nothing else calls the reset path before
      deleting it, rather than leaving an orphan.
      **Done.** The Settings row was the only caller of `FM.resetProject`, so the function went with it
      — 24 lines of teardown that nothing could reach. The test that used to prove the button asked
      before wiping every layer now proves the door is shut and the function did not survive it.
- [x] **176 — Tick notes off from the pre-export reminder card.** (v7.12) His words: *"When you press export and
      the notes show up, put an option in that menu to tick off the notes."* At the moment that card is
      read-only — it lists what you ticked and offers Back / Export anyway. He wants to deal with a
      reminder on the spot instead of going back into the notepad to untick it.
      **Done.** Every row has a tick now, and it really unticks the note rather than just crossing out a
      line. The row STAYS once ticked, struck through — a row that vanished would make the list jump
      under your finger at the exact moment you are deciding whether to export, and a wrong tap has to be
      undoable without leaving. Once nothing is outstanding the title becomes "All clear" and the quiet
      "Export anyway" becomes a plain "Export".
- [x] **175 — Loop playback does not belong in Settings.** (v7.14) His words: *"Get rid of loop play back out of
      the settings menu, it should only be in view options."* Same reasoning as #122 (onion skin): one
      control, one home. **Done** — its one door is the ⛶ view bar's loop button. The test now asserts
      both halves: the row is gone AND `#vb-loop` still exists, because removing a control is only safe
      if the remaining door does — that is the mistake queue 53 made with Group, where the action
      survived and every way to reach it did not.


Everything before this is in POLISH-LOG.md from v2.31 onward — roughly 90 more shipped items,
including the camera, captions, speed ramping, the easing editor, the shape library, the Studio
layout, motion blur, the elements browser and the effects browser.
