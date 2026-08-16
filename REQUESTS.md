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
- [x] **128 — Opening/closing a project feels janky. DONE — opening v7.60, closing v7.61.** His words: *"the animation when opening a project
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

      **BUILT AND BACKED OUT (15 Aug). It WORKS — the reason it is not shipped is the test section, and
      the design below is finished, so the next go is twenty minutes, not an afternoon.**
      Your own words already answered the question this entry was going to ask you, so I built it:
      *"the animation of the project layer moving to the left happens instantly… then smoothly the
      project should swoop in too"* is a description of a two-phase push, and that is what it is.

      **The design that works, in full:**
      · Phase 1 on the tap — `close({push:true, lead, wait:true})`: the lead card and the home screen
        leave immediately, and `#app` is PARKED off the right edge instead of animating in.
      · Phase 2 when the load resolves — `armPushIn()`: swap the park for `fm-push-in`.
      · `#app.fm-push-wait { transform: translate3d(100vw, 0, 0); }` — **100vw, not 100%**. Measured:
        `100%` resolves against #app's own border box, and under `body.fm-pushing` #app is
        position:fixed with no width, so it parked only 247px right and the previous project showed
        beside the leaving home screen. This is the same trap already written up on `fm-push-in-vw`.
      · Only split when `pushAllowed()` is true. On desktop `close()` hides home instantly, and
        splitting THAT would show the previous project for the whole load — the artefact, not the fix.
      · On a failed load, `abortPush()` — otherwise home is stranded dimmed at -24% with nothing coming.

      **TWO REAL BUGS IT UNCOVERED, both worth keeping whatever happens to this feature:**
      1. **`startPush` never called `endPop()`.** A leftover `fm-pop-out` on #app is an animation with
         `animation-fill-mode: both`, and a running animation BEATS a plain declaration — so the park
         was silently ignored and the editor sat wherever the pop's last frame left it. `endPush` has
         guarded exactly this for years ("a stranded matrix on #app"); the entry side never did,
         because until now everything in startPush was an animation too and could compete on equal terms.
      2. **`onPushEnd` tears the push down mid-load.** It ends the push when #home-screen's animation
         finishes — which on the split path happens LONG before the load. It has to ignore that while
         #app is parked, and the arriving editor (`fm-push-in`'s animationend on #app) becomes the
         honest end signal instead.

      **WHY IT IS NOT SHIPPED: the `home-push` test section, and it is a fair blocker.** That section is
      a ~40-assertion instrument choreographed end to end around "the push waits for the load" — the
      press held for every frame of the wait, the warm hand-off, the repeat and cross taps. Removing the
      wait invalidates its premise, so it has to be re-specified rather than patched, and patching it is
      exactly what I tried: FOUR different assertions failed in sequence, each one a new surprise. That
      is the shape of a moving target, so it was backed out rather than shipped red — same call as #115,
      for the same reason.
      **What the rewrite has to preserve** (the contract, not the mechanism):
      · the tapped card is visibly acknowledged CONTINUOUSLY from the finger onward — but by
        `fm-card-lead` now, not `fm-card-press`, so the assertions want an "is it acknowledged" helper
        rather than one specific class;
      · a repeat tap and a cross tap still cannot steal or move that acknowledgement;
      · the warm hand-off has not disappeared, it has MOVED: it only exists where there is no load to
        split, which is the already-current-project path that section 1b already drives. Testing it on
        the loading path is now testing something that cannot happen — the push starts in the same task
        as the click, so the press is never painted and the COLD keyframe is correct there.
      · and the new half: the editor must NOT arrive early, or the previous project slides in and gets
        swapped underneath the user.

      **SHIPPED v7.60.** The rewrite went the way the note above said it would — read the whole section
      first, re-specify it as a unit, and it converged. Tapping a project now moves it on the frame you
      touch it; the editor arrives when the project is ready.
      **A third defect turned up during the rewrite, and it is the one worth remembering:** an open that
      never settles used to strand a PRESSED CARD, and holdPress had a backstop for that. With the split
      it strands the whole transition instead — home dimmed and shoved aside, the editor parked
      off-screen, nothing arriving, no way out — and nothing guarded that. The waiting phase now carries
      its own deadline. The test asserts the home screen actually comes back.
      **And a correction to my own note above:** the claim that `100%` parked the editor only 247px was
      WRONG. That 247px was the lingering `fm-pop-out` animation beating the park's plain declaration,
      not the unit. #app is width:100%, so `100%` and `100vw` are identical here — and `100%` is what
      shipped, because it is the unit `fm-push-in` animates from, so phase 1 parks exactly where phase 2
      begins. Measuring the mutation is what caught the bad reasoning: swapping the unit changed nothing.
      **THE CLOSING HALF IS DONE TOO, v7.61 — and it was the same defect wearing a different hat.**
      Measured first (`tests/_popjank.html`), because assuming the cause would be the same as the
      opening half is exactly the trap this item has already sprung twice. It was: `home.open()` runs
      straight through to `startPop()`, its last line, so **81ms at 6× CPU throttle passes with your
      finger already lifted and nothing moving** — and **62ms of that 81 was one call**, stopping to
      take a fresh photograph of the project for its card.
      That call does two jobs and only one of them is urgent. The card grid needs the METADATA to
      render — name, size, duration, layer count — and that is nearly free. The PICTURE is the
      expensive half and nothing needs it until you can see it, while the cards are still sliding in.
      Split: metadata now, photograph a moment later. **81ms → 14ms.**
      The photograph waits for idle rather than a plain timer, and that detail was measured too: on a
      plain timer, two runs in four still put a frame over 50ms right where you land, so you arrive on
      the grid and it hitches under your thumb. Now it goes in a gap, with a timeout so it cannot be
      starved forever. The card shows its previous thumbnail until then — a picture of the project you
      were looking at seconds ago.
      **Both halves of your original message are now answered**, and neither turned out to be the
      animation: *"make it so the animation… happens instantly"* was 113ms of dead air on the way in,
      and *"less janky when leaving"* was 81ms of it on the way out. The animations were smooth all
      along, which is why "it feels janky" kept not matching anything a profiler pointed at.
- [ ] **129 — A 2-second screen recording adds a clip with NO VIDEO. PARTLY ANSWERED v7.62 — the app now tells you why; whether it FIXES your file is still unknown.** His words: *"Added a screen
      recording from my camera roll that's very short and it still has the issue of being on the timeline
      but not actually showing any video."* "Still" — this is a repeat. A screen recording is a specific
      case worth chasing: HEVC in an mp4/mov container, often with an odd colour range, and iOS screen
      recordings in particular. The clip EXISTS (it is on the timeline with a duration), so the decode or
      the draw is failing, not the import.

      **INVESTIGATED 15 Aug, and the honest finding is a gap in what the app can TELL you — not a
      reproduction of your file.** I do not have the clip and cannot make an H.265 recording here, so
      this is reasoning from the code plus one real hole that is definitely there.
      **Two ways a clip is present and blank, and only one was covered.** If the browser cannot read a
      video track at all, `videoWidth` is 0 — and the import already catches that and says "no picture
      — audio only". The other way had nothing watching it: the container parses fine, so the file
      reports honest dimensions and a real duration and lands on the timeline looking completely
      normal, and then the DECODER will not take it. `readyState` never reaches HAVE_CURRENT_DATA, the
      compositor skips any video below that, and the canvas stays black — forever, with no error, no
      toast and not one console line. **That is the exact shape of your report**, and iOS screen
      recordings are H.265, precisely the codec a browser will parse the container of and then refuse
      to decode.
      **What v7.62 does:** a clip that has produced no frame after fifteen seconds is named out loud,
      with the actionable half in the console — re-export as H.264, or open the project in Safari,
      which does decode HEVC. The clip is NOT thrown away: the audio may be fine, and something you can
      hear and trim beats a refused import.
      **What it does NOT do, and I would rather say so than let you find out:** it does not make the
      video play. If the file is H.265 in a browser that cannot decode H.265, no app code changes that
      — the fix is transcoding, which is a much larger feature.
      **So this stays OPEN, and one thing from you would close it.** Next time it happens: **if you see
      the new toast, the diagnosis is confirmed and the answer is transcoding. If you see NO toast and
      the clip is still blank, it is something else and I have been looking in the wrong place** —
      which is worth knowing just as much.
- [x] **130 — One 2-second clip, one project, and it lags — and the quality tier does not drop. THE TIER HALF IS DONE (v7.57, verified 15 Aug). The lag itself lives on in #125.** His
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

      **SHIPPED v7.57, AND THE #54 CONFLICT TURNED OUT NOT TO BE ONE.** The ladder now also watches the
      wall-clock gap between frames, so GPU filter work and video decode — the two costs it was blind to
      — finally register. Deliberately narrow: the scrub path only (playback skips frames on purpose, so
      its gaps mean something different), and only above a sustained ~24fps floor, because an earlier
      cut treated ordinary jitter as evidence and walked a single small shape down two rungs.
      **The reason it does not re-break #54 is the payoff latch, and that is now MEASURED rather than
      argued** (`tests/_q125tier.html?video=1` and the same page without it, both at 6× CPU throttle):

      | scene | what the ladder did |
      |---|---|
      | one plain video clip, no effects (#54's case) | probed down to tier 2, **gave it all back**, full resolution for the last 30 frames |
      | blurs + glows (#130's case) | dropped to tier 2 and **stayed** |

      So the two requests were never actually opposite. Seeing the cost and acting on the cost are
      different things: the ladder now SEES a decode stall, tries a smaller canvas, finds it bought
      nothing, and hands the picture straight back — which is exactly what you asked for in #54. Where
      resolution genuinely is the bottleneck it drops and holds, which is what you asked for here.
      **Ticked for the tier half only.** Your first sentence — *"the project lags from just that"* — is
      still the open question, and it is #125's, where four real costs have been removed and the last
      step needs numbers from your actual phone. This entry's own conclusion stands: the quality drop
      was only ever a way of hiding the lag, and you were right that for one short clip it should not
      have needed to.
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

- [x] **141 (DONE — all four parts: v7.08, v7.09, v7.63, v7.64) — Export screen: prettier, custom ratios + fps, and our OWN save dialog.** His words: *"idk
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
         *(That "still open: 1" line was stale the moment part 1 shipped in v7.09 — corrected here rather
         than left to send someone looking for work that is already done.)*
         **Every part of this entry has now shipped**: 1 (v7.09), 2 (v7.08), 3 (v7.63), 4 (v7.64).
      3. **Prettied up** — the dialog is functional and plain; he wants it to look finished.
         **DONE v7.63, and it turned out to be mostly not a taste call.** What made it look unfinished
         was ALIGNMENT: every row was space-between and a dropdown shrink-wraps to its longest option,
         so the five controls were five different widths starting in five different places — measured
         at 375px, x=355, 262, 262, 471 and 345. They share one column now, both edges true.
         Two corrections on the way, both of which only showed up in a screenshot and neither of which
         reading the CSS would have caught: narrowing the controls truncated "Same as project —
         1080×1920" to "Same as …", losing the only word that mattered, so the control column takes the
         room rather than splitting the row evenly with a one-word label; and the native chevron then
         overlapped the text until the arrow got a lane of its own.
         The checkbox is ours now instead of a stark white browser square beside five themed controls,
         and the card is clamped to the viewport — 330px plus padding overflowed a 320px phone.
         The alignment is ASSERTED in the suite, not admired: "prettied up" is not usually testable, but
         "these five controls share one left edge" is, and a column that drifts again will go red.
      4. **Our own save popup instead of the OS one.** The native iOS share/save sheet is "the apple pop
         up". Check what is actually replaceable before promising: the final file hand-off is partly
         OS-owned, so the honest version may be our own dialog for everything UP TO the save, with the
         system sheet only at the last step. Say that plainly rather than claiming it can all be ours.
         **DONE v7.64.** The scope below is what shipped, unchanged — worth reading, because what you
         asked for and what is possible are not quite the same thing and the difference matters.
         **The honest scope, read off the code (js/exporter.js `deliver`).**
         The share sheet is `navigator.share({files})`, and a browser will only open that from a real
         user gesture — which is exactly why the exporter already falls back to a plain download when a
         long render outlives the tap that started it. So the sheet itself cannot be replaced: it is the
         OS's file hand-off and there is no web API that writes to your camera roll without it.
         **What CAN be ours is everything around it**, and that is probably what you actually want: a
         finished-looking "your export is ready" card with the file name, size and duration, a preview
         of the first frame, and a Save button — so the Apple sheet appears because YOU pressed Save on
         our card, rather than being flung at you the instant the render ends. That also fixes the
         transient-activation fallback as a side effect, because the tap that opens the sheet would then
         always be fresh.
         **Shipped exactly that.** The render ends on an "Export ready" card with the first frame of
         your export, the file name, and `17.6 MB · 1:14 · 1080×1920 · 30 fps` — size, length and shape,
         the three things you would check before committing it anywhere and the three the Apple sheet
         does not tell you. Save opens the sheet; Discard throws the file away.
         **The first frame, not the last** — the last frame of a video is very often black, and a card
         whose picture is a black rectangle tells you nothing about what you made.
         **And it fixed the transient-activation fallback**, which was a real defect hiding behind a
         cosmetic one: the exports where landing the file in Photos matters most were precisely the long
         ones whose share sheet could no longer open.
         **What is NOT ours and cannot be:** the sheet itself. That is the OS's file hand-off.
         GIF and PNG-sequence exports still download straight away — the card is opt-in per format, and
         giving them the same treatment is a small follow-up rather than part of this.
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
      **CHECKED AFTER TONIGHT'S HOME-SCREEN WORK (16 Aug, `tests/_homecost.html`).** Three releases in
      one night piled work onto the home screen — v7.76 put a backdrop blur on every project card, v7.95
      put one on every tab and pill AND made the grain field BOIL, and v7.96 added a gradient surface to
      the add-menu panel. A backdrop-filter over an ANIMATING backdrop forces a readback per frame per
      element, and v7.76's blur was measured against a grain that only cross-faded — so the combination
      was never measured, on the very screen whose lag you have raised more than anything else.
      **Measured, 8 cards at 380×820, both unthrottled and at 6× CPU:**
      | | median | p95 |
      |---|---|---|
      | everything on, as shipped | **16.7ms** | 18.5ms |
      | grain boil off | 16.7ms | 18.4ms |
      | boil and all blur off | 16.7ms | 18.5ms |
      **Zero measurable cost — 0.0ms/frame, holding 60fps, and identical at 6× throttle.** These are
      compositor-side effects, so they never touch the main thread's budget, which is exactly the
      distinction #130 established and #125 has been chasing ever since.
      **The usual caveat still applies and is not a formality:** this is a throttled Mac, not your phone,
      and this entry exists because desktop numbers have been mistaken for evidence three times. What
      this rules out is a *new* regression from tonight — it says nothing about the lag you already had.

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

      **THREE FIXES SHIPPED, v7.57 — and the first one is why every previous pass came back clean.**
      · **That last hypothesis was WRONG, and is corrected rather than left to mislead.** The ladder
        DOES call resizeCanvas on every tier change, not only when motion starts (js/app.js, the
        `if (_playTier !== before)` line). Measured as well as read. Dead end, closed.
      · **The real one: the app could not see its own lag.** The ladder decides whether to soften the
        preview from ONE number — how long our JavaScript spends rendering. Canvas filter effects are
        done by the GPU after we return, and video decode happens off-thread, so neither ever lands on
        that clock. Six blurs plus six glows on a 1080×1920 comp at 6× CPU throttle reported **1.1ms a
        frame**. A tenth of budget. So the quality relief you were owed never once triggered on the
        scenes it exists for, which is exactly the shape of *"nothing much ever gets resolved"*. It now
        also watches the gap between frames, which sees all of it, and the same scrub sheds two rungs.
        The threshold turned out to matter more than the idea: my first cut treated any overrun as
        evidence, and one dropped frame is ordinary jitter — measured, it walked a single small shape
        with no effects down two rungs, which would have been a worse bug than your lag. It now only
        counts a sustained rate under about 24fps, and a trivial scene is verified to stay sharp.
      · **Half of a video scrub's cost was invisible to the ladder too.** Four `seeked` listeners
        repainted by calling render directly instead of through `FM.requestRender`, so they were
        neither coalesced (a video scrub paid for two full renders a frame) nor measured.
      · **And scrubbing kept re-seeking the video to a time it was already at.** A scrub snaps to the
        frame grid, so a slow finger makes many frames resolve to the same time, and every one
        re-issued the same seek — restarting the decoder and cancelling the decode of the very frame it
        was fetching, while emitting no event and so not even repainting. The exporter has had that
        guard for ages; the preview never did.
      **Still open, and honest about it: I have not proven this fixes YOUR phone.** Everything above is
      measured under CPU throttle on this Mac, which is a stand-in, not your device. What is different
      this time is that the app's own regulator can now see the cost it was blind to — so if it is still
      laggy, the numbers it reports will finally mean something. **Tell me if it is still bad and the
      next step is reading those numbers off your actual phone rather than guessing here.**
      **A FOURTH FIX, v7.58 — and this one is measured, not estimated.** Every preview render of a video
      layer also copies the whole frame at FULL SOURCE resolution into a spare canvas, so that if the
      next frame is still decoding the clip holds its last good picture instead of flashing black.
      Worth having. But it was paid on EVERY render, including the many showing an identical picture.
      `tests/_q125hold.html` puts a number on it: on a 2048×2048 clip at 6× CPU throttle one copy is
      **9.7ms — 58% of a whole frame's budget** (2.2ms at half size, 0.6ms at quarter). It now skips the
      copy when the video has not moved. A finger held still on the timeline re-renders continuously at
      one source time — and since v7.57 stopped the pointless re-seeking, the element really does stay
      put there — so that case was re-copying four megapixels a frame for a byte-identical result.
      **AND THE SHRINK IS DONE TOO, v7.59 — with two corrections to what I wrote above.**
      · **The obstacle I recorded did not exist.** I said the composite samples that canvas in source
        pixel coordinates so a smaller one would crop wrongly. It does sample in source coordinates —
        and it has always RESCALED them by the source's real size, because the frame cache has produced
        downscaled bitmaps for years. Grade and key likewise draw the source into their own output box.
        The composite was already built for exactly this. Reading it beat assuming, again.
      · **My first implementation was a PESSIMISATION and only measuring caught it.** Capping the
        longest side at a flat 960 made the copy cost **11.9ms — slower than not shrinking at all**
        (9.2ms), because 2048→960 is a 2.133:1 resample and the browser's fast path is exact halving.
        Halved to 1024 the same copy is **2.3ms**. So the rule halves while the result stays at or above
        640. There is now a test asserting the ratio is a power of two, because a later tidy-up to a
        "cleaner" flat cap would be a silent 5× regression with nothing to catch it.
      **Net for you: the most expensive single thing a video layer did per frame is four times cheaper**,
      and it is paid once per new frame instead of once per render. The only cost is that the held frame
      is slightly softer for the fraction of a second it shows during a seek, when the preview is
      deliberately soft anyway. A cropped clip is tested to still show the right part of the picture.
      **This entry stays OPEN on purpose**, because none of it is proof about YOUR phone — it is all
      measured under CPU throttle on this Mac. Four real costs have been found and removed and the app's
      own regulator can now see what it was blind to. **If it is still laggy, say so and the next step is
      reading the numbers off your actual device instead of a stand-in.**
      **BLOCKED, and named properly on 16 Aug so it stops looking actionable.** Its only remaining work
      is *"reading the numbers off your actual device"* — and there is currently no way for you to read
      them, which is exactly what **#202 (the "what is slow" readout)** is for. So #125 is blocked on
      #202 plus one sentence from you, not on more work here. **A fifth measurement on this Mac would be
      the precise trap this entry already calls out** — *"every time lag comes up I have measured on THIS
      machine, found acceptable numbers, and moved on"* — so it is not being done. #95's timeline half is
      blocked on the same thing. Skipped in the queue for those reasons rather than forgotten.
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
- [x] **115 — Dragging a clip to the screen edge should auto-scroll the timeline. DONE v7.56.** His words: *"When
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
      **THIRD ATTEMPT, 15 Aug — real progress, still not shipped, and one recorded conclusion above is
      WRONG.**
      · **The hang is solved.** An attempt earlier that day hung the whole suite: a headless test starts
        a drag and never releases, so a loop that only stops on pointerup never stops. Two independent
        brakes fix it — give up when the scroll DID NOT ACTUALLY MOVE, and a hard frame cap that makes
        an endless loop structurally impossible. With those, no hang.
      · **"Bisecting pinned it to the ARMING of the loop" is wrong.** Proved by experiment: arm the loop
        exactly as before but suppress everything from the scroll line onward, and the suite is
        **329/329 green**. Arming is innocent. The damage is in what the loop DOES.
      · **And it is not the scroll position either.** Resetting the timeline's scrollLeft after every
        test did NOT fix it — the same three tests still failed. So the remaining suspects are the
        scroller-width growth, and (in this attempt) replaying the placement by dispatching a real
        `pointermove` on `window` — which every OTHER drag handler in the app also receives, including
        edit-points and the text editor, which are exactly two of the three that fail. **Start there.**
      · A synthetic replay is attractive because it reuses the real handler instead of a second copy of
        the placement maths, but it cannot be dispatched on `window`. It needs to reach the timeline's
        handler ONLY.
      Reverted again rather than left red. The two brakes and the origin-shift trick (`startX -= moved`,
      which makes the existing dx absorb the scroll with no refactor at all) are both worth keeping.
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

      **FOURTH ATTEMPT — SHIPPED, v7.56. It works, and the cause was none of the four things we guessed.**
      Doing what the paragraph above said to do is what found it. The full pass/fail diff pinned the
      damage to a single call, and from there it took two experiments rather than another theory.
      **The auto-scroll loop was calling `FM.requestRender()` every frame.** That feeds `noteMotion()`
      in js/app.js — the adaptive-quality heuristic that decides the app is in motion and calls
      `resizeCanvas()` to drop the preview to a lower resolution, snapping back when you stop. That is
      correct behaviour and it is why an editor looks softer while you drag. But a loop repainting every
      frame while the finger sits still HOLDS it in that state, and the three tests that kept going red
      were measuring canvas geometry against a canvas that had been quietly resized. Nothing was ever
      wrong with the timeline, which is exactly why three rounds of looking at the timeline found
      nothing — it was invisible module state one file away.
      The loop now moves the clip in the timeline without repainting the canvas. The cost is honest and
      small: while your finger is HELD at the edge the picture does not refresh, so if the playhead sits
      over the clip it lags the scroll. Every actual movement refreshes it, so does letting go, and
      while you are edge-scrolling you are watching the timeline anyway.
      **Two more defects fixed on the way, both recorded above as risks and both real:** the growth
      limit was computed from the clip's LIVE position, so the loop pushed the clip right, which pushed
      the limit right, which made room to scroll further — measured, a single test drag grew the
      scroller from 900px to 1904px. It now comes from where the clip started, so it cannot run away.
      And the loop is cancelled on every gesture-end path, not just pointerup.
      **Two tools came out of this and are worth knowing about**, because the next mystery like it
      should not cost four attempts: `tests/_fmdiff.py` captures the FULL pass/fail list from a suite
      run and diffs two of them, and `tests/_only.html?items=a,b,c` runs any subset so you can ask
      whether a test fails on its own or only after something earlier ran.
      **Proven working, not merely green.** `tests/_q115b.html` drives a genuine pointer drag to the
      edge — at desktop width AND at 380px — and checks that the timeline scrolls, that the clip
      travels with it instead of stopping dead, that releasing stops it, and that no gesture is left
      live. 5/5 at both widths. Suite 340/340.
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

- [x] **113 — A third subsection: FILTERS, alongside Effects and Audio Effects.** *Big one — read this
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
      **v7.45 — the Colouring shortcut**, your *"button at the top of the colouring section as a
      shortcut to it"*. Opens the same picker as the one in Effects, so there is one filter menu in
      the app rather than two that drift apart.
      **v7.46 — the third subsection is in.** Effects | Filters | Audio, and Filters lists all 16 under
      their section headings with a sentence each AND what each one is built from (Teal & Orange reads
      "Contrast · Saturation · Teal & Orange · Vignette"). Tap one and it lands open on your stack.
      **#113 is now DONE except for picture previews on the filter tiles.** The thumbnail system is
      built around one effect per tile, so filters need their own path through it — a separate, honest
      piece of work rather than something to bodge. Logged as #219.
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

- [x] **97 — Freehand drawing is STILL broken (4th report), with a phone screenshot at v6.60. CLOSED — see below.** His words:
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
      **TICKED 16 Aug, for the same reason as #93 — resolved in its own text and never ticked.** The
      report had two possible causes and the evidence settled both: the coordinate misalignment does
      **not** reproduce (`#draw-overlay` and `#preview` agree to 0.00px by his own entry route), and the
      thing that WAS real — the canvas shoved into the bottom of the screen — was fixed in v7.35. Since
      then freehand has also gained undo/redo (v7.77), an eraser (v7.78), a zoom that survives entry
      (v8.00–8.01) and a clamped two-finger pan (v8.02–8.03), so if it feels broken again it will be a
      new report with new evidence rather than this one.
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
      **BOTH FIXED (v7.47).** The hold is gone from Play — Play just plays. Removed rather than retuned,
      because Loop already has the home you chose for it ("it should only be in view options"), and a
      second invisible door to the same toggle that costs you the press is not worth having. And the
      first clip now moves the playhead to itself, exactly as every later clip already did; without that,
      a song added to an empty project could start mid-way for no reason, or past the end, where pressing
      play really does do nothing.
      **What is left in this entry:** nothing I can act on. The agent could not reproduce total silence
      on a well-formed file across 30 add-then-play trials, so if it still happens to you, the useful
      thing is WHICH file and what you did just before.
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

      **RE-MEASURED 15 Aug (`tests/_tlcost.html`, in a real 390px app frame) — and all three numbers
      above are STALE. Two of the three costs are already gone.** They were true on 14 Aug and were
      fixed by work done for other entries, which is exactly how a list like this quietly starts lying.
      | cost | recorded here | today |
      |---|---|---|
      | rebuild() by timeline LENGTH | 1.6ms @10s → 9.5 @120s → **14.8ms @300s** | **0.6 → 0.8 → 0.8ms, and 0.8ms at 900s — flat** |
      | ruler nodes at 300s | 901 notch + 151 tick | **61 total, and still 61 at 900s** |
      | updatePlayhead() at 61 clips | **1.42ms**, every frame | **0.30ms** = 1.8% of a 60fps frame |
      | rebuild() at 61 layers | 18.2ms | 7.2ms — and **1.0ms at 8 layers**, which is his case |
      **Why:** queue 101 windowed the ruler to the visible stretch, so both its node count and its cost
      follow the SCREEN rather than the project. That killed the length term outright and took most of
      updatePlayhead with it. Also confirmed today: selecting a layer costs exactly **1** rebuild (the
      double-rebuild fix has held), and twenty scrub steps cost **0** — scrubbing does not rebuild.
      **So on this machine there is no timeline cost left to remove at the layer counts he describes**
      (*"with not many layers added at all"* — 1.0ms). The one term still scaling is rebuild() by layer
      count, and it is paid once per tap, not per frame.
      *I started to add a test locking the ruler's node count down and found queue 101 had already
      written one (`ruler notches do not thin out just because the project is long`) — and mine was
      dead anyway: `rebuild()` calls `autoFitDuration()`, so setting `project.duration` without a clip
      that long has the ruler measure a 4-second project twice. Only the mutation check caught that.
      Deleted rather than shipped; the instrument (`tests/_tlcost.html`) is committed.*
      **What this half needs is still a number from HIS phone, not another pass here.**
- [x] **94 — Film grain in the menu is too jumpy and too obvious.** **DONE v6.62.** His words: *"The film grain in the
      menu is too jumpy and too noticeable, need to make it move smoothly and less noticeable."* Two
      separate dials: AMPLITUDE (how visible each grain is) and TEMPORAL BEHAVIOUR (how it changes frame
      to frame). "Jumpy" is the second one — a grain that re-randomises every frame strobes; real film
      grain drifts. Likely this is the moving static over the home project cards from #76, so check that
      first, and confirm with him which screen he means if there is more than one grain in the menus.

- [x] **93 — Wiggle should see OTHER effects' motion, and behave in corners. CLOSED — see below.** His words: *"I want the
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
      **VERIFIED 15 Aug (`tests/_wigwin.html`) — and the verification changed the job.** Ground truth is
      the same layer with NO effect and its transform genuinely moved by the effect's own delta; both
      implementations are scored against THAT, not against each other, because that is the only
      reference that can say which is right rather than which is different. Every row carries a control
      (ground truth vs the layer not moved at all) so a row where nothing actually moved is thrown out.
      | effect | fully inside | half off the left | off the corner |
      |---|---|---|---|
      | **wiggle** (shipped, expanded plate) | 139 px, mean 0.04 | 151 px, mean 0.07 | 64 px, mean 0.03 |
      | **drift** | 0 px | **1,519 px, mean 6.38, worst 255** | **2,048 px, mean 8.63, worst 255** |
      | **orbit** | 100 px, mean 0.04 | **567 px, worst 255** | **660 px, worst 255** |
      **So the agent's headline was wrong and the v7.32 fix is fine.** Wiggle already tracks ground truth
      to within a rounding difference on a 60 px border — the "not bit-exact" it was marked down for is
      resample softness at mean 0.04/255, not lost content. Adopting the window trick for wiggle alone
      would be rewriting working code for a difference nobody can see.
      **What the probe found instead is the real bug, and it is next door.** `drift` and `orbit` are the
      same three lines wiggle was before v7.32 — translate the finished plate, blit — and they never got
      the expanded-plate fix, so at a frame edge they pull in empty space exactly as wiggle used to. A
      quarter of the frame wrong (worst 255 = solid content against solid nothing), not a rounding
      difference. **That is now #228** rather than being smuggled into a wiggle entry.
      **TICKED 16 Aug — both halves of what he asked for are answered, and this entry was left open by
      accident.** Found by sweeping the ticks rather than by working forwards, which is the second time
      that sweep has paid for itself. (a) *"work when you have other effects that make it move"* does
      **not reproduce** — wiggle survives every mover tested. (b) *"work in corners better"* was real,
      was the worse half (23.6% of the ink lost at a corner), and was **fixed in v7.32**; the table above
      shows the content coming back. Nothing here is waiting on anyone. **The live bug this entry
      produced is #228** — `drift` and `orbit` still have the pre-v7.32 code and still eat a quarter of
      the frame at an edge — and that is where the remaining work lives, under its own number.

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
- [ ] **259 — Phone: make the trash icon red. (16 Aug, with a screenshot.)** His words, verbatim:
      *"Make the trash icon red."* Screenshot is the PHONE top bar — back · "Laurel" · version chip ·
      duplicate · trash · ⋯ — where the bin is the same plain white as everything beside it.
      **The PC already does this** (v7.79 made the transport row's delete red), so this is the phone
      catching up rather than a new idea: the one destructive control in a row of neutral ones should
      not look like its neighbours. Match the tone used on PC rather than inventing a second red.
      Check the ⋯ menu's Delete entry at the same time — if that is still neutral on the phone the two
      doors to the same action disagree.

- [ ] **258 — Elements: the BACKGROUNDS should be fainter, but the ICONS should pop like they used to.
      (16 Aug, with a before/after pair of phone screenshots.)** His words, verbatim: *"In this section
      I wanted the colours of the background for each option more faint, not the actual icon itself,
      keep the background colours but make the icons pop like they used to"*.
      **This is a regression I introduced in v8.20, and he is right.** His original #210 wording was
      *"choose more subtle background colours, the main icon can stay bright but the backdrop more
      subtle"* — two separate things, and I collapsed them into one. I gave Elements a muted palette
      (sky/sea/moss/sand/dusk/ice) AND a fainter plate; but the icon takes its colour from the same
      `--am-tint`, so muting the palette muted the icons too. His v7.30 screenshot next to v8.24 shows
      it plainly: the old icons are saturated violet/blue/teal/amber, the new ones are washed out.
      **The fix is to split the two.** The plate keeps the faint treatment; the ICON needs its own,
      brighter value rather than sharing the tint. Options: a second `--am-ico` custom property set
      per card, or deriving a brighter colour from the tint in CSS (`color-mix` toward white, or
      raising the tint's saturation). A per-card second property is the honest one — a derived colour
      would still be a function of a palette chosen for backdrops.
      **Do this with #257** — both are corrections to v8.20's add-menu colour work and touch the same
      rules, and doing them apart risks a third round.

- [ ] **257 — Sound effects: white icon, and a gradient white border round the rainbow. (16 Aug, with a
      phone screenshot.)** His words, verbatim: *"The colour of the button for the sound effects should
      be white and the border colour around the rainbow should be white too, not solid white, give it
      some gradient"*.
      Follows v8.20, which gave the card its rainbow. Two changes, both on `.addmenu-card--rainbow`:
      · the **icon** goes white. It currently inherits the card's representative tint (pink/orange),
        which fights the rainbow behind it — white is the only colour that sits on all six hues.
      · the **border** goes white too, but **not flat white**: a gradient. A 1px border cannot take a
        `linear-gradient` directly, so this wants either `border-image` with a gradient, or a
        `background-image` pair (padding-box + border-box) — the second composes better with the
        rainbow fill the card already has, and keeps the rounded corners.
      Watch the glass theme: v8.20 established that `theme-glass.css` restates card backgrounds at
      (0,2,0) and silently beat the rainbow until it was restated there too. Whatever lands here needs
      the same treatment or it will look right in one theme and wrong in the one he actually uses.

- [ ] **256 — The microphone test is STILL flaky, after #226 was marked fixed at v7.98. (16 Aug.)**
      *(Found by me, twice in one day.)* `voice: the microphone is handed back on EVERY exit path` failed
      with **"timed out waiting for the mic to be acquired"** during a mutation run, and again during the
      v8.24 ship — where it did real damage, because `tools/ship.sh` correctly refused to push a green
      change on the strength of a red suite. Re-running immediately came back 413/413.
      **Why this matters more than one flaky test:** a red run that means nothing is worse than no test.
      It trains you to re-run and shrug, which is exactly how a real regression gets waved through — and
      it now actively blocks shipping, since the release gate reads the suite and believes it.
      **v7.98 fixed a DIFFERENT flake in the same test** — it replaced a fixed wait with one that waits
      on the real signal. This is the acquisition step timing out, not the release step, so it is a
      second cause rather than the first one returning. Do not assume the v7.98 note covers it.
      Next pass: find what the test waits on to decide the mic was acquired, and whether that signal can
      simply be late under load (both failures happened while a mutation run had a second Chrome busy on
      the same machine) rather than absent. If it is lateness, the wait needs to be on the signal with a
      generous ceiling, not a race against a timer.

- [x] **255 — The settings cog rotates once and never again until you refresh. DONE v8.16.** His words,
      verbatim: *"the setttings cog rotates once but never again until you refresh, prolly coz it doesnt
      un rotate"*.
      **His instinct was right that it was a restart problem, but the cause was one level down.** The
      animation has no fill mode, so it DOES un-rotate — the icon really is back at 0° afterwards. What
      failed was the replay. The code did the standard trick: remove the class, force a reflow, add it
      back. Forcing the reflow was `void ic.offsetWidth` — and **`ic` is an `<svg>` element, where
      `offsetWidth` is `undefined`**, because it is an `HTMLElement` property and `SVGElement` does not
      have it. So nothing was read, no layout was forced, the browser coalesced the remove and the add
      into no change at all, and the animation only ever ran the first time the class appeared.
      Measured before fixing: `typeof ic.offsetWidth === 'undefined'`, `ic instanceof SVGElement === true`.
      **Fixed** by forcing layout on the BUTTON (a real `HTMLElement`) and cancelling any in-flight
      animation first, so a fast double-press restarts cleanly rather than being swallowed. The test
      clicks twice and asserts a fresh animation each time; the old `offsetWidth`-on-SVG version turns
      it red.

- [ ] **254 — Edit Points has no keyframe functionality at all. (16 Aug, with a screenshot.)** His
      words, verbatim: *"edit points has literally no keyframe functionality. add it"*.
      The screenshot is the **Edit Points** panel on a Drawing layer: an X and a Y readout (522.9 /
      818.6), the "Swipe here to move point" pad, the three point-mode buttons down the left, and the
      hint line. **No ◆ anywhere** — every other property panel in the app has the keyframe diamond and
      its easing button on a left rail (`mt-rail`), and this one simply does not, so a point's position
      cannot be animated.
      **Check before building — the machinery may already exist.** The pen-mask system stores its path
      as EITHER a static `pts` array or an animated `{ kf }` (see the masks note in js/inspector.js), so
      an animated point-list is already a shape the app understands and renders. If shape/drawing points
      use the same representation, this is largely wiring the existing rail onto the points panel rather
      than inventing path interpolation. If they do NOT, say so in this entry before starting — that is
      a much bigger job (interpolating between two point lists needs matching point COUNTS, and a
      keyframe that adds or deletes a point has no obvious tween).
      **Two things to decide and record while building:** whether a keyframe captures the WHOLE path or
      just the selected point (whole-path is far simpler and is what mask animation already does), and
      what happens when a point is added or removed between two keyframes.
      Related: **#206** (sensible edit points) is HELD because he wants to do it with me — do not fold
      these together without asking.

- [ ] **253 — Shape sliders scrub too fast to hit an exact size. (16 Aug.)** His words, verbatim:
      *"when editing a shape the sliders move to quickly, i cant precisely get the exact size i want,
      cos it jumps a lot of numbers, leaving me to type in what i want"*.
      **The complaint is precision, and the tell is the last clause** — he is falling back to typing,
      which means the scrub is not usable for fine work. This is `tickStrip` (js/inspector.js), the
      drag-to-scrub ruler shared by every `rangeRow` in the app, so whatever changes here changes ALL
      of them — check the fix against a few different ranges, not just shape size.
      Likely one of: the value step per pixel is too large at the sizes he works at, the ruler's `step`
      is quantising away the in-between numbers, or there is no fine mode. **Worth measuring first: how
      many value-units does one pixel of drag produce, at the shape sizes he actually uses?** That
      number is the bug, and it should be written into the entry before anything changes.
      The obvious answer — a fine-drag modifier — is a poor one on a PHONE, where there is no modifier
      key. Prefer something that works with one finger: a slower rate near the current value, or a
      rate that falls the further the finger moves from the strip (the standard iOS scrubber idiom),
      so precision comes for free rather than needing a second input.
      **Do NOT just make it slower everywhere** — the same control has to cross 1–100000% on the speed
      row (#184), and a uniformly fine rate makes that untraversable. Whatever lands must serve both.

- [x] **252 — PC: the settings cog does not open the way he traced, and the menu should not need
      scrolling. DONE v8.11 (all three clauses). (16 Aug, with a traced screenshot.)** His words: *"the way i said the settings cog to
      open up does not open up like how i showed, look at my screenshot and replicate it. you dont have
      to follow the sizing strictly as i want it to all fit on screen nicely"* and *"so you dont have to
      scroll through the menu"*.
      **This is #241 revisited** — v7.93 anchored the canvas dialog to the cog (`--cv-anchor-right` /
      `--cv-anchor-top`) and kept the cog out of its own blur, which was the part he asked for then. What
      it did NOT do is match the SHAPE he drew.
      **What the new trace actually shows:** a tall panel filling the empty area to the RIGHT of the
      canvas, rising UPWARD from the cog — its bottom edge sitting on the transport row where the cog
      lives, its top reaching roughly the vertical middle of the stage. v7.93 drops the card DOWNWARD
      from the cog (`top: sr.bottom + 8`), which on a desktop puts it over the timeline and, being a
      fixed-width card, makes it scroll. He is pointing at the large unused region above instead.
      **So two changes, and the second is the reason for the first:** open the card UPWARD from the cog
      into that empty space, and size it so **every setting is visible at once with no scrolling** —
      which is the whole point (*"so you dont have to scroll through the menu"*). He has explicitly
      released the sizing: *"you dont have to follow the sizing strictly"*, so widen or re-flow the rows
      (two columns, say) if that is what makes it fit.
      Desktop-only — the phone sheet is a different layout and must not change. Verify by measuring the
      card's scrollHeight against its clientHeight and asserting it does not scroll, rather than by
      eyeballing a screenshot.
      **THIRD CLAUSE, added by him while this was being built:** *"Also when youre doing the cog menu
      rework, make it so you press anywhere on the screen out side of it it wil close the menu."* So
      tapping the backdrop closes it — same as Cancel, i.e. without applying.

      **DONE v8.11 — all three clauses, ticked one at a time:**
      1. ✅ **Opens into the space you traced.** At 1440×900 the card needed **473px** and was given
         **206** — it hung downward from a cog that sits low on the transport row, into the scraps —
         while **634px sat empty above it**. It now anchors by its bottom edge and grows upward.
      2. ✅ **No scrolling.** Everything is visible at once; the test asserts `scrollHeight` does not
         exceed `clientHeight`, rather than asserting a height, because you released the sizing and a
         height check would break the next time a row is added.
      3. ✅ **Tap outside closes it** — backdrop only, on pointerdown, and **without applying**, so a
         stray tap can never silently resize your project. There is a test for exactly that.
      **One thing I did NOT do, deliberately: it is not "always upward".** That would just be the old
      bug mirrored — in the other desktop layout the cog rides near the TOP of the screen and opening
      upward would push the menu off it. It measures the room on each side and takes the better one. On
      your layout that is always up.

- [ ] **251 — PC: the ground behind the three selection icons is too BRIGHT, and it is not centred or
      aligned. (16 Aug, with a screenshot.)** His words: *"the back drop for the three icons like the bin
      in this photo, make the backdrop more subtle, maybe instead of being brighter than everything else
      make its lightly darker, and also it isnt centred and aligned so fix that"*.
      This is **`#t-sel.has-sel`, shipped in v7.89** for his own request #242 (*"make these three buttons
      have a different background to signify their difference"*) — so the idea was right and the
      execution is wrong in two specific ways he has now named:
      · **Direction.** It is lighter than the transport row. He wants it **slightly darker** — a recess
        rather than a raised panel. Same job (telling the group apart), quieter means.
      · **Alignment.** In the screenshot the pill is visibly taller than the icon row inside it and does
        not line up with the neighbouring transport controls. Check the vertical centring of the icons
        within the ground AND the ground's own baseline against the rest of the row — the row is a flex
        line with 34–40px controls, so a wrapper with its own padding will not sit level by accident.
      Verify at a DESKTOP width (this is the PC layout, `min-width: 701px`), not at 380px, and compare
      the pill's box against a neighbouring button's box rather than eyeballing it.

- [ ] **250 — The slam Easter egg on PC is completely broken now. (16 Aug, REGRESSION.)** His words:
      *"the slam easter egg on pc is competely broken now"* — told to me mid-task with *"dont let this
      distract you but also dont forget to log it"*, so it is written down here and waits its turn
      rather than jumping the queue.
      **"Now" makes this a regression, and there are recent suspects to check FIRST rather than
      re-deriving it.** The slam was touched three times in quick succession: **v7.86** made it fire
      while you pull instead of after you stop (the wheel threshold with `wheelSpent` re-arming on
      130ms of silence), **v7.87** removed the black bar by dealing with the slam's own flat ring
      against the now-textured home, and **v7.95** changed the home grain to two 256px tiles that
      actually boil. Any of those could have broken it, and the v7.86 wheel-claiming change is the
      likeliest — the suite test `slam-wheel` covers the double-fire it was written for, so whatever
      is broken is something that test does not assert.
      **Ask when starting it: broken HOW?** No animation at all, an animation that plays wrong, or the
      screen left in a bad state afterwards? Each points somewhere different. Reproduce on PC at a
      desktop width before changing anything — this is a PC-only report and the phone path differs.

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
- [ ] **A documented conflict, your call.** An older `NEXT-SESSION.md` said in bold *"Supersedes the old
      thumbnail spec — do not build preset thumbnails"* and specced a full-screen preview player instead.
      I built the thumbnails because that is what you asked for that night. The engine behind them is
      exactly what that player would need, so nothing is wasted either way.
      **The citation used to be `NEXT-SESSION.md:183-192` and is corrected here (16 Aug): that file has
      since been rewritten — it is 125 lines now — and neither the line range nor the quoted sentence
      survives anywhere in it.** The quote is kept above because REQUESTS.md is the durable record and
      NEXT-SESSION.md is a working handover that gets replaced; citing a line number in a file that is
      rewritten every few days was always going to rot, and this is the file that exists to stop things
      rotting. **Anything worth keeping belongs here, quoted, not linked.**
      *(Related: **#37** — "merging the two is queue 37's real job" — turned out to be already DONE and
      merely un-ticked, found on 14 Aug. So that half of this entry has resolved itself; what is left is
      only the thumbnails-versus-player question, which is still yours.)*
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
      **THIS IS THE NEXT ITEM UP** (15 Aug). Not blocked on you — just big, and I stopped rather than
      start it badly at the end of a long session.
      **First, a correction to this entry's own claim.** "Chunk-replay resume is proven" implies there is
      working code somewhere to land. There is not. I searched the whole repo, the staged-diffs folder and
      the git history: the only mention of chunk-replay anywhere is this line and the handover note
      quoting it. Whatever was "proven" was proven in a conversation and never written down. This file has
      been caught by that shape of entry twice before (#37 was already done; the staged folder turned out
      to hold twelve diffs that had all shipped), so it is corrected rather than left to waste someone's
      morning.
      **And the real obstacle, now that I have read the export path.** The output is assembled in PAGE
      MEMORY — `createMp4Sink` holds folded Blobs plus a list of late patches and only becomes a file at
      `finish()`. Persisting those bytes to IndexedDB as they fold is easy. What cannot be persisted is
      the MUXER's own state: mp4-muxer keeps its track and sample tables in memory, and there is no way to
      rehydrate them, so you cannot reopen a half-written file and keep muxing into it. Encoding has the
      same problem one level down — a VideoEncoder cannot be resumed mid-GOP.
      So "save the chunks and carry on" is not achievable as stated. The shape that IS achievable is
      **segmented export**: render in N-second segments, each finalised into a complete little file in
      IndexedDB as it finishes, then join them at the end. A crash then costs you at most one segment, and
      it makes the progress bar honest as a side effect. That is a different and larger design than the
      line above promised, and it should be agreed before it is built.
      **PART OF THIS SHIPPED in v7.51 — the cheap half of "must not lose the render".** An export now
      warns before you navigate away, but only while one is actually rendering. That is not resume and
      is not pretending to be: it is the commonest way a render actually dies, which is not a crash but
      a refresh, a back swipe or a closed tab. Both directions are tested — no guard at all, and a
      guard that nags on every ordinary reload, each turn the test red.
      **CRASH-RESUME IS NOW DONE — v7.53 (15 Aug).** And the "segmented export" verdict above was wrong,
      so it is corrected here rather than left to send the next person down a much bigger road than the
      job needed. The fact was right: you cannot reopen a half-written MP4 and keep muxing into it. The
      inference from it was wrong. **The muxer never needed to be resumable, because muxing is a byte
      copy, not an encode.** What costs you minutes is rendering and ENCODING frames. So the answer is to
      save the encoded CHUNKS as they come out of the encoder, throw the half-written file away, and on
      the next run build a fresh muxer, replay the saved chunks into it in milliseconds, and carry on
      from the seam. No MP4 demuxer, no new library, no segment-joining — and the resumed file is
      assembled from exactly the chunks an uninterrupted run would have contained.
      **What it means for you:** an export killed by a crash, an out-of-memory kill or a discarded tab
      no longer starts over. Run it again and it picks up where it stopped, with a message saying so.
      A crash costs you about two seconds of footage instead of the whole render.
      **Two things it refuses to do, both on purpose:**
      · It will not resume a project you have EDITED since. The signature covers the scene document plus
        output size, fps, bitrate, codec, range and whether there is an audio track; anything different
        and the saved render is thrown away rather than spliced into a file it does not belong to. That
        is the one failure here that would be genuinely bad — a silently wrong movie — so the test for
        it is the longest one in the set.
      · It stops saving past 512 MB (about nine minutes of 1080p). Past that a crash costs the render as
        it always did, which is no worse than before, and better than quietly filling your phone with
        the leftovers of a render nobody is coming back for.
      **Proof, not assertion.** Seven unit tests cover the pieces, and `tests/_xresume.html` does it for
      real: it runs a genuine 150-frame export, kills it at frame 100 with a thrown error (not Cancel —
      Cancel is *meant* to discard), runs it again, and then counts the video samples in the finished
      MP4. 150. The resumed run re-rendered 90 frames instead of 150. All eleven checks green, and six
      deliberate mutations of the implementation each turned the right one red.
      *(Also worth knowing: a finished export leaves nothing behind. The chunks are deleted on success
      and on Cancel, and kept on any other exit — an exception on the way out is exactly the case this
      exists for.)*
      **v7.54 — and this one is worth reading, because v7.53 did not actually work for you.** I put the
      finished change through an adversarial review, and it found the one thing every test had missed:
      the app sweeps orphaned media out of its storage at every boot, and the saved export chunks belong
      to no layer and no project, so the sweep deleted them — at the first boot after a crash, which is
      exactly the boot they exist for. Resume worked when an export threw inside a live page (which is
      what the end-to-end probe does) and would never once have worked for a real out-of-memory kill.
      The tests could not have caught it because none of them ran the boot path at all. Fixed in both
      halves — the keys are exempt from the generic sweep, and because nothing generic is minding them
      any more, they now get reaped on their own terms instead (abandoned after three days, capped, or
      left behind by a torn write). Two new tests, one calling the real boot sweep rather than a
      stand-in; reverting the exemption reproduces the original bug exactly.
      **v7.55 — the last two things that review found, both of which only bite the people this was
      built for.** Neither would ever have produced a bug report, which is why they are worth naming:
      1. **It was loading the whole saved render into memory to resume it** — up to 512 MB, held for the
         rest of the export. That is an out-of-memory risk inside the one feature whose job is surviving
         an out-of-memory kill, and the nastier shape of it is that every retry after a crash would have
         been likelier to die than the attempt before. It now replays one ~3 MB batch at a time, so
         memory stays flat however long the render.
      2. **The join flashed on projects with time-based effects.** Motion Blur (Content), Frame Stutter,
         the temporal denoiser and the time warp each build each frame out of the one before it — the
         echo trail out of the whole preceding second. A resume started in the middle with that history
         wiped, so a built-up trail would vanish for a single frame and ramp back in, mid-file, in a
         file you would have had no way of knowing was different from an uninterrupted one. A resume now
         re-renders the 25 frames before the join without encoding them, purely to rebuild that history
         — and only when the project actually carries one of those four effects.
      **STILL OPEN (b): the second half — off the main thread.** Much larger again: a worker means the
      whole compositor (9,600 lines, DOM canvas throughout) on OffscreenCanvas. Not started, and unlike
      the resume half there is no shortcut hiding in it — **this one is a genuine decision for you**,
      because it is days of work and it risks the most load-bearing file in the app. Say the word and
      it goes to the front; otherwise I will keep it behind the smaller items.
      It also sits right next to **#215 (an export came out with NO AUDIO)**, which is still waiting on
      your word to jump the queue — asked three times now, and I still rate it the most serious open item.
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
        exists in the effect list.
        **MEASURED 15 Aug — and the answer IS "use that one". This half is ANSWERED (v7.50).**
        Motion Blur (Footage) smears effect-driven motion perfectly well: an Orbit at 22px/frame goes
        from 41px wide to 80px with 1,932 soft pixels. The two blurs are complementary, not overlapping
        — Object smears the layer's own keyframes and cannot see Orbit; Footage smears Orbit and does
        nothing for plain keyframed movement. Between them both cases are covered, which the suite now
        holds in place.
        **It has a speed limit, and that is worth knowing.** Sweeping Orbit's speed: it smears at 7, 15,
        22, 37, 56 and 73 px/frame, then stops between 73 and 103. It reads the picture frame to frame,
        so past roughly 75–100 px/frame there is no correspondence left to find. That is why Wiggle at
        168 px/frame appeared not to smear at all — nothing to do with Wiggle, it was simply too fast.
        **So the fix was the app saying so**, which it now does: Motion Blur (Footage)'s description
        names effect motion and its speed limit, and the Motion Blur (Object) panel says it smears the
        layer's OWN movement and points at the other one for effect or camera motion.
        *(My first measurement said Footage smears nothing at all — wrong, because it is TEMPORAL and I
        rendered one frame in isolation, giving it no previous frame to compare against. The run-up is
        part of the instrument now, in the test.)*
        **Still open on 31b: only the CAMERA half**, which needs your call — camera blur belongs at the
        composite level and means the camera getting its own motion-blur toggle.

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

- [x] **168 — PC: kill the left side rail, move everything into the transport row. DONE v7.52.** (13 Aug, with two *(logged as #143 by mistake — that number was already used by an earlier shipped item, so it is #168 from now on; commits and POLISH-LOG entries dated 13–14 Aug refer to it as #143.)*
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

- [x] **169 — PC: trim/split move onto the playhead, and the align buttons get the whole panel. DONE — first half back in v5.25, the rest v7.74.** (13 Aug, *(logged as #144 by mistake — that number was already used by an earlier shipped item, so it is #169 from now on; commits and POLISH-LOG entries dated 13–14 Aug refer to it as #144.)*
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

      **DONE v7.74, and the half that was already shipped is worth separating from the half that was not.**
      · **"put the delete left/right buttons either side of the playhead and split on top of it" — this
        shipped in v5.25** as `#tl-trim`, and `#tl-nudge` (v5.01) is its complement for when the playhead
        is off the clip. That is why the entry looked half-familiar; it was never ticked.
      · **"get rid of the buttons that are near the play head" — done now, and it could not safely have
        been done before today.** Those floating buttons read `FM.selectedLayer`, the PRIMARY layer. So
        with three clips selected they appeared over the playhead and edited ONE of the three, while the
        inspector kept a second, selection-aware copy of the same actions. Delete the copy on its own and
        "split all" quietly becomes "split one" — a loss you would notice several edits later, in a
        project you cannot undo your way out of. So the floats read the selection first: trim, split and
        extend act on every selected clip the playhead is inside, and MOVE takes the selection as a block
        (near edge to the playhead, each clip keeping its offset), which is the rule the inspector row
        used — copied from it rather than re-derived, so the two cannot drift apart. The titles carry the
        count ("Split all 3 at playhead"), because the buttons look identical either way.
      · **"make them big and fill up the whole section" — done.** With the duplicate gone this panel held
        nothing else: measured at 1440×900 with three clips selected, **168px of content in a 580px
        panel**, 412px empty. That is your "left massive area". The three align buttons now fill it as
        stacked full-width rows with names on them — Start together · One after another · End together —
        rather than three 88px icon columns stretched tall, because at that size a bare glyph reads as an
        unfinished button and start-vs-end is exactly the pair a mirrored icon fails to distinguish.
      **Phone untouched** — verified at 380px: the clip actions stay in the panel and both rows stay
      36px icon strips, one home per platform, the same arrangement the single-clip row has had since
      v5.25.
      **Three mutations, three reds:** making trim act on the primary only (durations came back 3, 6, 6),
      deleting the fill rule, and leaving the duplicate row on screen. The fill assertion had to be
      rewritten after the first mutation slipped past it — with the rule gone the buttons still measure
      47px, comfortably over any "bigger than the phone's 36" bar, while leaving 468px of the panel
      empty. The gap to the bottom of the panel is the number that tells the two states apart, so that
      is what the test measures now.

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

- [x] **145 — Why does Alight Motion take ages to load and ours doesn't? ANSWERED 15 Aug, with numbers.** His words: *"alight motion
      always takes ages to load when you open the app but ours doesn't, idk if that's coz ours is shit
      and has nothing to load or just loads it well."* Not a bug — a question that deserves an honest
      answer rather than a flattering one. Answer with actual numbers: what we load at boot, what is
      deferred, and which parts are genuine architecture versus simply having far less to load than a
      mature native app.

      **MEASURED (`tests/_boot.html`, cold profile, 390×800). Short answer: it is not because we have
      nothing to load. We load plenty. It is because of WHERE it comes from and how little we do with
      it once it arrives.**

      | | |
      |---|---|
      | requests at boot | **72** |
      | JavaScript | **2.82 MB** across 66 files |
      | CSS | 398 KB |
      | images + the splash video | **3.09 MB** |
      | **total** | **6.30 MB** |
      | DOM interactive | **119 ms** (220 ms at 6× CPU throttle) |
      | load event | **193 ms** (395 ms throttled) |

      **So "ours is shit and has nothing to load" is the one explanation the numbers rule out.** Six and
      a third megabytes is not nothing, and compositor.js alone is 743 KB. We are not winning on size.

      **The three real reasons, in order of how much they matter:**
      1. **Nothing is fetched over a network.** Everything is on the device already, and after the first
         visit the service worker serves it from disk. A native app launch usually includes at least one
         round trip — a licence or subscription check, a sync, an ad or analytics handshake — and one
         slow round trip costs more than our entire boot.
      2. **We do almost nothing at startup.** Our 2.82 MB is plain text that a browser parses in tens of
         milliseconds and then mostly sits there. A mature editor decodes fonts, builds effect
         thumbnails, scans an asset library, restores an project index and warms a render engine before
         it will show you anything. That work is not the file size, and it is where the seconds go.
      3. **Our boot cost does not grow with your library.** Project media lives in IndexedDB and is only
         read when a project is opened, so an empty home screen fetches none of it whether you have one
         project or two hundred. **That one IS genuine architecture and is worth protecting** — it is the
         property most likely to be lost by accident.

      **The honest caveats, because a flattering answer is not what you asked for:**
      · We are fast *today, at this size*. Nothing here is a moat. Adding web fonts, a downloadable
        asset library, or a sign-in would cost us most of this and none of them are exotic.
      · Some of Alight Motion's launch time is genuinely having more stuff than us — a decade of effects,
        presets and fonts is not free. Some of it is probably avoidable. From the outside I cannot tell
        you the split, and I am not going to guess at a number to make us look good.
      · **And one thing we should look at: the splash video is 2.8 MB fetched at boot** — about as much
        as the entire app's code — for something decorative. It is cached after the first visit, but the
        first visit on cellular pays for it. Logged as **#223**.

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

- [x] **147 — PC: the text editor covers the text you are editing. Get it off the canvas. DONE — first half v6.96, second half v7.65.** (13 Aug,
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

      **DONE v7.65, now that #143 and #144 have both landed and the reason for waiting had expired.**
      The measurement first, because the deferral above was a claim worth re-checking rather than
      inheriting: at 1280×860 the card was costing the stage **169px of 552**, nearly a quarter of the
      picture. And the blocker was real — squeezed into a 270px column, the toolbar overflows by 45px.
      **But it is the wrong conclusion to draw from it.** A column has the opposite budget to a bottom
      bar: width is scarce, height is not. 286×552 is a tall thin space, so the toolbar wraps onto two
      rows and there is nothing left to solve. No re-layout of the strip, no waiting on anything.
      **169px → 0px.** The canvas is exactly the size it was before you started typing.
      One thing the move forced, worth knowing: the Aa panel already lived in that column, so it now
      opens BELOW the card instead of at the top of it — otherwise the sheet opens over the toolbar that
      summoned it. And the fallback is tested, not promised: shrink the window and the card goes back to
      floating over the stage, because a column too narrow to hold it would cut the buttons off, which
      is worse than the 169px this replaces.
      **Phone is untouched**, as the entry always said it should be.

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

      **MEASURED 15 Aug (`tests/_pops.html`), and the leading theory is DISPROVEN. I have not reproduced
      your popping, and I would rather tell you that than ship a plausible fix for it.**

      **Two of the four candidates are ruled out by architecture, not by measurement.** `js/audio-play.js`
      — the Web Audio graph — only handles REVERSED clips. An ordinary imported song plays through the
      media ELEMENT, so there is no graph to starve, no gain bus to sum past 1.0 and no sample-rate
      mismatch to have: the browser owns all three. That kills "buffer underrun" as stated, which was
      both your diagnosis and mine.
      **The third candidate is what the app DOES own, and it measured clean.** The sync controller keeps
      the element level with the transport and has exactly two moves: trim the playbackRate, or SEEK.
      A seek on a playing element is a discontinuity, i.e. a click — so it was the obvious culprit.

      | six seconds of playback | seeks | rate trims | frame gap |
      |---|---|---|---|
      | one audio clip, idle machine | **0** | 5 writes, 1.00 → 1.096 → 1.00 | 16.7 ms |
      | audio + 6 heavy layers, 6× CPU throttle | **0** | **0** | 100.7 ms median, 349.6 worst, 128 frames dropped |

      Under real load — the case your report is about — the controller does **nothing at all**: rAF is so
      starved it only runs 50 times in six seconds, so it never seeks and never trims, while the browser
      keeps the audio playing off the main thread. **Our sync is not making your pops.**
      *(The first row is worth keeping too: on an idle machine playback pitches up to +9.6% and back over
      four audible steps at the start. That is a real artefact and not a pop — noted, not fixed.)*

      **What is left, and it is specific.** At a clip boundary the app does `m.el.pause()` and
      `m.el.muted = true` with no ramp (js/app.js:1135), and on re-entry `currentTime = local` then
      `play()` (js/app.js:1172). Both cut the waveform dead at an arbitrary sample, which is the textbook
      way to make a click — and it is candidate two from the list above, the one I had not tested,
      because six seconds of continuous playback never crosses a boundary. **Looping playback crosses one
      every lap.**
      **The fix, when it is done, is an anticipatory fade rather than a fade-on-pause**: start easing the
      element's volume down over the last ~40ms of the clip and pause exactly at the end. Fading only
      once the boundary has arrived would bleed the source audio past the clip, which is precisely what
      #1/#8 fixed and the comment on that line defends.
      **Why it is not done in this pass:** the entry's own instruction is to measure before changing, and
      I can measure a seek count but I cannot hear a click from here. Shipping a de-click on the strength
      of a code read would be the same move that made the film-grain fix wrong four times.
      **THE BOUNDARY FADE IS DONE (v7.66)** — built without waiting for your answer, because an abrupt
      cut of a playing waveform is a defect whether or not it is *your* pop. Every clip edge now fades
      over 45ms: anticipatory, so it reaches zero AT the boundary rather than bleeding past it, and
      45ms rather than the textbook 5ms because this is evaluated once per sync tick and those ticks
      were measured 100ms apart under load — a 5ms ramp would be stepped straight over on exactly the
      struggling machine that needs it. Pressing play mid-clip gets the same fade, which is the same
      click in the place you notice it most.
      **I am NOT claiming this fixes your report.** I cannot hear a click from here.
      **One line from you still settles it: does the popping happen on a LOOP or at a clip edge, or
      right through the middle of one long clip?** If the edges were it, v7.66 has it. If it is mid-clip,
      it is the browser's own decoder struggling under our main-thread load and the real answer is
      #125/#69 — and this entry can be closed as a red herring with a useful fix attached.
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

- [x] **150 — Auto-detect captions: much easier to reach, and let me choose what it scans. DONE — scope v7.67, access v7.68.** His words:
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

      **PART 2 SHIPPED v7.67.** Three choices above the button — **Just this caption clip · The whole
      project · One audio clip…** — with the clip picker appearing only for the third, since showing it
      beside the other two asks you to answer a question those modes do not have.
      *"The whole project"* is the one with real arithmetic in it: speech starting BEFORE the caption
      clip used to be thrown away silently, and now the clip moves back to meet it — which means every
      cue re-bases by that same shift, or they all slide by however far it moved. Pure maths, so it is a
      pure exported function with its own test; you should not have to decode audio to check where a cue
      lands. Three mutations caught, including the one that keeps the cues and forgets to re-base them.
      **On "default to the most voice-like source":** the honest way to know which clip that is, is the
      level distribution the detector returns — which means decoding, and decoding every clip up front
      is the expensive half of the whole operation. So the fallback is LAZY instead: try the clip you
      chose, and only if it finds nothing walk the rest. Same outcome where it matters, paid for only
      when you would otherwise be stuck on "no speech found" with no idea another clip was an option.
      **PART 1 SHIPPED v7.68 — exactly the tile described here.** **Captions** now sits on the property
      grid between Edit Text and Presets: one tap from a selected text layer, instead of text layer →
      text editor → Aa sheet → scroll. It opens onto detection first and the cue grid under it, and on a
      layer that is not a caption track yet it offers to make it one AND still shows the detector —
      because detection converts the layer and fills the grid in one press, so asking you to press "use
      as caption track" first would be a step for nothing.
      The card HOSTS the captions UI rather than owning it — js/captions.js still builds both halves —
      so this and the Aa sheet cannot drift into two different editors.
      One trap worth recording: the category list is built by BLACKLIST in every branch, so a new card
      appears on every layer kind unless it is explicitly removed. That is how Camera Options once
      turned up on shapes, text, media and groups. The test asserts the Captions tile is absent from
      shapes, groups, cameras and nulls, and the mutation that removes the guard is caught.

- [x] **151 — A caption layer needs effects PER CUE as well as effects on the whole layer. DONE v7.69.** His words:
      *"Also when editing a caption layer you should be able to chose somehow between adding effects to
      each section or adding effects that effect the whole layer."* So a caption track carries one
      effect stack today (it is a text layer, so `layer.effects` applies to the whole thing), and he
      wants the choice: apply this effect to THIS CUE only, or to the track. That is a real data-model
      change — per-cue effect stacks — plus a control in the effects panel to say which you mean, so
      cost it honestly before starting. Sits naturally with #150 and #149 as a captions pass.

      **COSTED 15 Aug, as the line above asks, and NOT started — deliberately. Here is the real shape of
      it, so the next pass is a build rather than a survey.**

      **The scary number is a red herring.** `layer.effects` is read in ~170 places (46 in the
      compositor, 43 in the inspector, 80 in fx-thumbs), and a genuine per-cue model would touch all of
      them. It does not have to: the compositor ALREADY has the pattern for this and uses it twice
      (js/compositor.js:1945 and :3589) — `Object.assign({}, layer, { effects: <a different array> })`,
      a shallow clone with a substituted stack. So the engine half is **one site**: where a caption
      layer renders, hand the pipeline a clone whose `.effects` is `layer.effects.concat(cue.effects)`.
      Everything downstream is unchanged and cannot tell the difference. Small, and safe.

      **The real cost is the UI, and it is spread out.** There is no single "add an effect" choke point:
      `layer.effects` is pushed or spliced from js/inspector.js:713, 739, 757, 1083, 1124, 1182 and
      js/fx-browser.js:63. Every one has to ask "which stack am I adding to?" instead of assuming. The
      clean way is one `fxTarget(layer)` helper returning the array to mutate — the track's, or the
      active cue's — and then those seven sites become the same line with a different subject. That is
      the change, and it is also the risk: a site left behind does not throw, it silently drops the
      effect on the wrong stack, which is a data bug you find later and cannot undo.

      **Two things that must not be forgotten, both already load-bearing elsewhere:**
      · `sanitizeEffects` (js/storage.js:581) validates `layer.effects` on every import and autosave
        load, and it does NOT walk `layer.captions`. Per-cue stacks would arrive completely unchecked
        from a hand-edited or older project file — and this file's own comment calls layer.effects "the
        sub-structure with the weakest validation on the way in". It needs the same walker.
      · The nesting cap. A filter container inside a cue's stack inside a caption is a third level the
        depth counter never anticipated.

      **BUILT v7.69, the pass after the costing — and the costing was right about the shape and wrong
      about the size.** The engine half really is one site, and the UI turned out much smaller than
      feared once the add paths were left alone: you add to the track and then move the effect down with
      **⋯ → Apply to this cue only**. Teaching the browser and three other add paths to aim at a
      different stack is the version that breaks quietly — an add path that guesses wrong does not
      throw, it puts your effect somewhere you never look — and one explicit move on a row that already
      exists buys the same thing for none of that risk.
      The Effects card shows the track's stack, a **This cue — "…"** divider naming the cue on screen,
      and that cue's stack beneath it, so which is which is never a guess.
      **Both hazards the costing flagged were real and are handled:** the row's ⋯ menu was acting on
      `layer.effects` at an index belonging to a different array (Duplicate and Delete would have hit
      whatever sat at that position on the TRACK) — it now takes its own stack, the same fix `fxRow`'s
      `listOf()` already carries one level up; and `sanitizeEffects` now walks cue stacks, which it did
      not, leaving them completely unchecked on import.
      One thing worth knowing: a cue's array is created only when something is put in it, so merely
      scrolling past a cue does not write `effects: []` into your project file.

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

- [x] **155 — Put the open-project glint on the SELECTED add-menu tab. ALREADY DONE — verified and tested v7.70.** (14 Aug.) His words: *"I want
      the effect that you have on the open project, like with the shiny line going around it, also on
      whatever you have selected, like elements or shapes etc"*, then immediately: *"Not the elements or
      shapes inside but the main button that opens the menu."*
      So: the travelling light that runs around the OPEN project's card on home (#135, v6.13) goes on the
      **active add-menu tab** — Elements / Shape / Media / Audio / Template — not on the item cards
      inside it. Same meaning in both places: *this is the one that is open*.
      Build it from the SAME implementation rather than a second copy, or the two will drift the way the
      slider glide drifted from the timeline's in #116.

      **ALREADY BUILT — this entry was stale, found while working the list oldest-first (15 Aug).** The
      glint has been on the active tab for some builds, and it does share the home card's implementation:
      same `.hm-glint` keyframes, nothing duplicated but the corner radius. **Verified, not assumed** —
      it sits on the active tab and only that one, and it follows the selection when you change tab.
      That is the THIRD stale entry the list has turned up, after #37 and #147's first half. Worth
      noticing that all three were found by working the list in order rather than by remembering, which
      is the argument for the list.
      **What v7.70 adds is the guard the entry asked for.** Your warning about drift was the right one
      and it is invisible on the day it happens: fork the CSS to tweak one ring and both still look fine
      on their own — only much later does anyone notice two lights that mean the same thing no longer
      move alike. There is now a test that goes red the moment they stop sharing keyframes, and a second
      one that the ring MOVES with the selection (the tab row is not rebuilt on a click, so a ring added
      once at build time sits on whichever tab opened first and looks right until you switch).

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

- [x] **157 — TRY moving the film grain off the project cards and onto the background. Experiment tried v7.71, he said no, fixed v7.76.** (14 Aug.) His
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

      **DONE v7.71 — and it is on the screen now, so the next move is yours.** The cards are smooth: they
      keep the glass edge, the light and the OPEN glint, and lose only the texture over the face. The
      whole background behind them is the rough surface instead.
      It went exactly as the note above said it had to: a real element (`#hm-grain`), because
      #home-screen's two pseudo-elements are both the drifting light already; and the SAME keyframes,
      not a copy — the linear curve in there was the fourth attempt at *"I want a constant flow, not a
      noticeable start and stop"*, and a fork would have thrown that away without anyone noticing.
      The per-card phase offset and tile pair are gone, along with the problem they existed for: with one
      field there is nothing left to de-synchronise.
      **The dial, so you can just tell me a direction:** it is at **.05** (`--hm-grain-alpha` on
      `#hm-grain`), up from the .032 it used on a card, because a card is a small bright surface and the
      background is the whole screen. Both keyframes read that one variable.
      **Three answers are all cheap: rougher, subtler, or put it back.** Say which — this is the
      experiment you asked for, not a decision I have made for you.

      **ANSWERED AND FIXED — v7.76. The fault was the TILE SIZE, not the strength, and that is worth
      reading because it explains why four rounds of tuning missed it.** The field is one random-noise
      PNG repeated, 64px since v6.23. A 64px tile repeats **about 76 times across a 380×820 phone**, and
      the eye is very good at spotting a repeated random field — so what you were looking at was a grid,
      not grain. On a CARD the same tile repeated roughly five times, which is invisible. So the texture
      was never wrong; asking it to cover a whole screen was. **At 256px it repeats 4.8 times.**
      It is also cheaper: six 64px tiles cost 54 KB and **166 ms** to generate, two 256px tiles cost
      272 KB and **15 ms** — most of the old cost was six separate `toDataURL` calls, and two tiles is
      all the cross-fade needs now that the cards use none.
      Strength came down as well, **.05 → .034**. It went up to .05 when the grain moved off the cards,
      on the argument that a whole screen can carry more than a small bright panel; with the grid gone
      that argument does not hold.
      *Shipped with **#227**, which is the other half — see there for the cards.*

      **HE ANSWERED, 15 Aug: *"The background film grain looks shit."*** So the verdict on the experiment
      is in and it is a no. Not blocked any more — this is now a real job with a clear brief, and it
      arrives together with **#227**, which is the other half of what he wants the home screen to be.
      Read them as one piece of work: the grain must stop being the thing you notice, and the cards must
      stay see-through without the grain showing through them. Doing #157 as a plain revert would put the
      texture back ON the cards, which is the opposite of #227 — so the answer is almost certainly a much
      quieter background field plus the cards masking it out, not `git revert`.

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

- [x] **163 — Make the pencil and vector drawing icons genuinely good, judged to a high bar. DONE v7.72 — 3/3 sign-off after three rounds.** (14 Aug.)
      His words: *"Make the logos for the pencil drawing and freehand drawing better, get multiple agents
      with really high standards to not accept it until it's perfect."*
      So the two icons v7.04 just changed (#161) are a starting point, not the finish. The verification is
      part of the request again, and the bar is explicitly higher than "does it read": multiple judges,
      high standards, iterate until they accept.
      **Bounded on purpose** — his standing instruction is that no agent loop may run away: a hard cap on
      rounds and a dry-round counter, never an open loop on a judge's own answer. Each round renders the
      candidates at 24 / 48 / 96px (24 is the size that actually matters — it is the shape-picker cell)
      and hands the sheet to judges who score and critique; I revise and re-render.

      **DONE v7.72. Three rounds, hard-capped, and the judges rejected me twice before signing off 3/3.**

      | round | verdict |
      |---|---|
      | 1 — the shipped v7.04 pair | **0/3 accept**, and 2 of 3 said the two could not be told apart at 24px |
      | 2 — first revisions | 1/3, pair chosen 2–1, new vector unanimous |
      | 3 — their three nits fixed | **3/3 ship, no blocking faults** |

      **What they found that I would not have.** The pencil was a hollow outline whose counter turns to
      mush at 24px — "reads as a paperclip" — and both details that make it a pencil (ferrule band, nib
      line) die at that size. But the real one is the concept: **a bare pencil is the universal EDIT
      glyph**, so it said "rename this", not "draw by hand". And on the vector: in a VIDEO editor a curve
      between two square nodes is the standard easing / keyframe-graph icon — the first-time-user judge's
      first guess was *"speed curve"*. Neither of those is a thing I would have got to alone, which is
      the whole point of the arrangement you asked for.
      **What shipped.** The pencil keeps its old geometry but FILLED (no counter left to lose) with a deep
      S-stroke trailing from under the nib — that stroke is the difference between an edit pencil and a
      drawing tool. The vector is a pen tool: 5.2px anchors that survive, the curve butt-capped so it
      stops flat at each edge instead of fusing into it, and a control handle with a solid knob, which is
      the part that says pen rather than graph.
      **Two dead ends, recorded because they were mine.** My first "solid" pencil redrew the body from
      scratch and lost the pencil — at 96px it read as a marker. My first trailing stroke flattened to a
      dash at 24px because its amplitude was too small for its weight. Both caught by the judges, not by
      me.
      `tests/_iconsheet.html` renders every candidate at 24/48/96 on the real cell colour and is
      committed — the next icon argument should not begin by rebuilding the rig.

- [x] **164 — A freehand stroke gets THICKER the moment you let go. ALREADY DONE — v7.06, same day you reported it; the entry was never ticked.** (14 Aug.) His words: *"When I do
      freehand drawing and finish a stroke it will for some reason make the stroke thicker when I let go
      of drawing, stop that from happening."*
      So the live preview and the committed layer disagree about width — you draw at one weight and get
      another. Almost certainly a coordinate-space mismatch: the preview strokes in SCREEN px on the
      overlay while the committed path is a shape layer whose stroke is in PROJECT px and then scaled by
      the canvas fit, or the committed path picks up a default width instead of the drawing one.
      **Measure both numbers before changing either** — the width used while drawing and the width stored
      on the layer — rather than nudging a constant until it looks close.

      **It was fixed on 14 Aug in v7.06 and this entry simply never got its tick** — found 15 Aug while
      working the list in order. That is the FIFTH stale entry (after #37, #147's first half, #155 and
      #93's "not bit-exact" claim), which is an argument for working the list rather than against it:
      every one of them was found by reaching it in turn, not by remembering.
      **The cause, since it is a good one.** The compositor draws an open path TWICE: a border
      under-stroke at `lw × 2`, so half shows either side of the line, and then the line itself at `lw`.
      The freehand tool was handing the new layer a border that was **enabled and the same colour as the
      line**, so the outline was invisible *as* an outline and simply made the mark double width — while
      the live preview strokes at `lw`. Exactly 2×, at the instant of release. The border is off by
      default now; turning it on in Border & Shadow does what it says.
      **Verified rather than assumed before ticking**, which is the rule these stale entries earned: the
      suite's `freehand-width` test renders a real 12px stroke and measures the thickest run of ink
      through it, and it is green at HEAD. It measures RENDERED PIXELS on purpose — the bug was a factor
      of two in the picture while every stored number looked correct.

- [x] **165 — Freehand drawing mode: centre the canvas, add erase, add pan/zoom, and real undo/redo. DONE — v7.35, v7.77, v7.78, v8.01, v8.02.**
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
      "#97 update" band; see that entry for the measurements.

      **Point 4 (the undo/redo icons) is DONE — v7.77, and building it turned up a real bug.** The bar
      carries the two glyphs from the transport row now, same paths, so one mark means one thing
      wherever you meet it.
      **The bug: Undo was deleting your whole drawing.** Queue 167 made a freehand session build ONE
      layer out of many strokes — *"it should all be inside the one drawing you just made"* — and Undo
      was never updated for it. It popped an id off the session's list and spliced that LAYER out of the
      scene, and only the FIRST stroke ever pushes an id. So three strokes in, one press of Undo took
      **all three**, and left the session pointing at a layer that no longer existed so the next stroke
      re-fitted a ghost. The unit of work is the stroke in both directions now; the layer is removed only
      when the last stroke leaves it and rebuilt when the first one comes back; drawing something new
      clears the redo stack. A half-drawn stroke still under your finger is thrown away first and does
      not go on the stack — it is the most recent thing you did and not something you would want back.
      Redo is freehand-only: in vector mode a "step" is a point on a shape you have not committed yet.
      **Two smaller things fell out of the same queue-167 change.** The bar's counter read off that same
      one-id list, so it had been stuck at "1 stroke" however much you drew; it counts subpaths now. And
      the bar **overflowed a phone** — measured at 380px: 378px of content in a 355px box, with Cancel's
      right edge 22px past the bar and off the screen. It was already ~12px over before this (a text
      "Undo" is ~66px, two icons are 77), so the icons did not cause it, they reached Cancel with it. The
      brush slider gives the space up now — `flex: 0 1 92px` with a real minimum, so it stays full width
      wherever there is room and shrinks only where there is not.
      *Worth recording: the first fix for that was a `@media (max-width: 700px)` rule, and the test
      written to guard it **passed against the bug** — a media query does not fire in a desktop-width
      test runner. The flexible version is verifiable at any width, which is why it replaced it. Three
      mutations red: whole-layer undo, a no-op redo, and a slider that refuses to shrink.*

      **Point 2 (erase) is DONE — v7.78.** A draw/erase toggle on the bar; in erase mode the same
      press-and-drag takes out whole strokes instead of laying one down.
      **Whole strokes, and the reasoning is recorded so you can overrule it:** rubbing out the middle of
      a stroke means splitting a path in two and re-fitting both halves; removing the stroke you touch is
      what most simple drawing tools do, and it is what "switch from drawing to erasing" most naturally
      means on a tool whose unit of work is already the stroke. **Say the word if you wanted the other
      kind** and it becomes a real job rather than a tweak.
      The hit test is distance to the nearest SEGMENT, topmost stroke first, with a reach of half the
      brush plus a finger's worth of slack converted from screen pixels so it feels identical at any
      zoom. A bounding box would grab every stroke that merely passes near; measuring to the sample
      POINTS would miss a long straight run between two far-apart samples.
      **The undo history had to be rebuilt to hold it**, and that is the interesting part: v7.77 pushed
      and popped the TAIL of the stroke list, which cannot put back something taken out of the MIDDLE
      without silently changing the order the strokes paint in. It is snapshots of the whole list now —
      a few small arrays — and every edit is undoable by the same code instead of each needing its own
      inverse. Erasing is undoable, and the test proves it.
      The bar needed room for a seventh control (28px over on a phone); the slack is spread rather than
      taken from one place — gap and padding 2px each, swatch 4, slider down to 40 — and it measures
      347px of content in a 355px box. Two mutations red: an eraser that hits everything, and an erase
      that is not undoable.

      **Still open here: point 3 (pan/zoom).** *"another option that lets you grab the screen and zoom in
      or out so you can do more detailed drawing"* — and as the note above says it has to be a MODE (a
      grab/hand toggle), because one finger already means "draw". The bar now has the toggle pattern for
      it, so this is the next one.

      **AND THE JOB IS SMALLER THAN IT LOOKS — read this before starting (found 16 Aug).** Pan and zoom
      already exist: `FM.viewport` (js/canvas-edit.js) has `scale`, `apply()`, `reset()` and
      `isDefault()`, and `FM.canvasZoom` mirrors it. So nothing needs building from scratch.
      **What stands in the way is one line, and it names the real obstacle.** `FM.startDraw` opens with:
      `if (FM.viewport && !FM.viewport.isDefault()) FM.viewport.reset();` — with the comment *"overlay
      lays out in screen px — a zoomed viewport double-scales it"*. The drawing tool deliberately throws
      your zoom away on entry because its overlay cannot survive one.
      **So the work is: make `#draw-overlay` respect the viewport transform, then stop resetting it and
      put a hand toggle on the bar.** `syncOverlay()` and `dispScale()` in draw-tool.js are where the
      screen-pixel assumption lives; the same `__fmOX/__fmOY/__fmRS` machinery the compositor uses for a
      cropped preview is the honest way to express it, since `toProject()` already reads those. Doing it
      in that order means the risky half (coordinates) is done and testable before any UI is added — and
      a stroke landing in the wrong place is exactly the bug #97 spent four rounds on.

      **⚠ CORRECTION FIRST (16 Aug, same session): the "102.8px error" written below is MY MISTAKE, not
      the app's.** The probe compared "where the canvas centre maps to" against the PROJECT centre — but
      at 2× the canvas shows a **crop**, and the centre of a crop is not the centre of the project.
      Checked properly, against the crop stamps the canvas actually carries:
      | | |
      |---|---|
      | visible project extent at 2× | 1080.0 × 1645.0 |
      | crop origin | 0.0, 240.3 |
      | so the canvas centre *should* be | 540.0, **1062.8** |
      | `toProject` actually returns | 540.0, **1062.8** |
      | **true mapping error** | **0.0px** |
      **`toProject` is exactly correct under a zoomed viewport.** The stroke-coordinate path — the one
      #97 spent four rounds on — needs no work at all. I wrote the opposite here an hour earlier with
      full confidence, which is the fourth time this file has caught one of my own recorded conclusions
      being wrong, and the reason the rule is "measure, do not inherit" even from me.
      **What IS still real:** the overlay BOX is 984×1501 against a 492×751 canvas — the double-scale is
      genuine, and the fix validated below is the right one. It is a hit-area and preview-drawing bug,
      not a "your strokes land in the wrong place" bug. **So the scary part of this job does not exist**,
      and the remaining part is one box calculation.

      **The original (partly wrong) measurement is kept below, struck through in spirit, because the
      overlay-box numbers in it are still valid and the error column is not.**

      **MEASURED 16 Aug (`tests/_drawzoom.html`).** Aiming at the centre of the canvas and asking where
      the tool thinks you aimed — **the "error" column is the flawed comparison described above**:
      | state | where a centre-aim lands | error |
      |---|---|---|
      | unzoomed (the control) | 540.0, 960.8 against a wanted 540, 960 | **0.8px** |
      | viewport at 2× | 540.0, **1062.8** | **102.8px** |
      And the cause is visible in the same run: at 2× the **overlay rect is 984×1501 while the canvas
      rect is 492×751** — the overlay is exactly twice the canvas, which is the "double-scales" the
      comment names. The canvas is also cropped by then (`__fmOX 0, __fmOY 240.3`), and the vertical
      error tracks that crop rather than the horizontal, which is why the miss is 103px down and 0
      across.
      **So the plan above stands and the order is not negotiable:** `syncOverlay` sizes and places the
      overlay from the canvas's screen rect without honouring `__fmOY`/`__fmRS`, so it must be taught the
      crop before anything else happens. Do NOT add the hand toggle first — a 103px miss is invisible in
      a screenshot and unmistakable to the hand, and #97 is four rounds of proof that this is the bug
      that gets shipped by accident.
      *(The probe is committed. It measures the coordinate maths directly rather than driving the UI, so
      it stays valid while the toggle is being built and can be re-run to prove the fix.)*

      **A SECOND, CHEAPER HYPOTHESIS — TESTED AND DISPROVED, which is worth as much as the measurement.**
      `syncOverlay()` sizes the overlay from the CANVAS's own `getBoundingClientRect()`, so it cannot be
      computing a wrong number — only running at the wrong TIME. A viewport zoom changes the canvas's box
      without firing a window resize, and a resize is the only thing that re-runs `syncOverlay`. If that
      were it, the overlay would merely be STALE and the fix would be one extra call.
      **It is not.** Forcing a resize at 2× changes nothing: the overlay stays 984×1501 against a 492×751
      canvas and the error stays at 102.8px. **Do not spend a morning on that idea.**
      **What the two results together actually say** — and this is the mechanism, stated so nobody has to
      re-derive it: `#draw-overlay` lives INSIDE `#canvas-wrap`, which is the element the viewport
      transform is applied to. So its CSS width/left are in the wrapper's LOCAL coordinates, while
      `getBoundingClientRect()` returns SCREEN coordinates. Feeding a screen rect back in as a local box
      applies the zoom a second time — exactly 2× at 2×, which is what the numbers show. It is not a
      timing bug and not a crop bug; it is a coordinate-space mismatch, and the ~103px vertical component
      is the crop (`__fmOY 240.3`) riding on top of it.
      **So the fix is: size and place the overlay in the wrapper's own space** (`offsetWidth`/`offsetLeft`,
      or the screen rect divided by the live viewport scale) rather than from the screen rect. Re-run
      `tests/_drawzoom.html` afterwards — the 2× error should fall to the control's 0.8px.

      **THE ARITHMETIC IS ALREADY CHECKED — on paper, in the probe, with nothing edited.** At 2×:
      | | |
      |---|---|
      | wrapper's applied scale | **2.000** (rect 492 / offsetWidth 246) — derived from the wrapper itself |
      | overlay box today | 984 × 1501 (a screen rect fed in as a local box) |
      | overlay box under the fix | **246 × 375** |
      | canvas LOCAL box — the target | **246 × 375** |
      It lands exactly. **Derive the scale from the wrapper (`rect.width / offsetWidth`), not from
      `FM.viewport.scale`** — that way it stays right whatever applies the transform, and it cannot drift
      from a second source of truth.
      **SHIPPED: v8.00 fixed the overlay's space, v8.01 removed the reset.** Entering the tool at 2× now
      reports `scale 2` (it reported 1 before), and a stroke drawn through project y=700, x 300…700 lands
      as a layer centred at **500, 702** against a wanted 500, 700 — a **2.0px** difference that is the
      freehand curve-smoothing rounding a three-point line, not a coordinate error. **Verified on ink,
      not on maths**, since where the line appears is the only thing that matters here.
      **So the ZOOM half of your request is done**, using the ⛶ view bar's existing zoom controls, which
      keep working while you draw — no second set of buttons inside the drawing bar.
      **AND THE PAN — DONE v8.02.** I wrote above that the gesture was a decision for you; on writing the
      constraints down it turned out to decide itself, so it did not need to wait. One finger already
      means DRAW and cannot be reassigned. The drawing bar is already full at 380px (347px of content in
      a 355px box), so an eighth toggle overflows it. And a mode you must switch into is worse than one
      you simply do. **A two-finger scroll satisfies all three**: it is what people already use to move a
      canvas everywhere else, it needs no control at all, and it cannot collide with drawing because a
      wheel event is not a pointer. Shift+wheel pans horizontally so a one-wheel mouse is not stuck.
      Measured: a scroll while drawing moves the viewport 120px and the surface stays on the canvas.
      *One honest correction: I first claimed the overlay stays with the canvas because the code re-syncs
      it. The mutation disproved that — removing the re-sync changed nothing, because `#draw-overlay` is
      a CHILD of the wrapper the viewport transforms, so a translate carries it for free. The call is
      kept for a SCALE change, which does alter the local box, and the comment now says so.*

      **#165 IS NOW COMPLETE** — centring (v7.35), erase (v7.78), undo/redo (v7.77), zoom (v8.01),
      pan (v8.02).

      **VERIFIED AT 380px AFTER THE FACT, and it closed a gap in my own process.** v8.00–v8.02 changed
      the draw overlay and added a global wheel handler, and I had checked all three at desktop width
      only — which is exactly the mistake that shipped v7.79's export bug (measured Classic, he uses
      Studio). On the phone layout: overlay 365×649 against a canvas of 365×649 (**exact**), a stroke
      aimed at project 500,700 lands at 500,702, and the drawing bar has **0px** of overflow with all
      seven controls on it.
      **One thing that surfaced and is worth your word: the two-finger pan is live on mobile too.** A
      dispatched wheel moved the viewport by 90px there. That is probably right — it is the same
      capability, and nothing on that screen scrolls behind the drawing surface — but it has only been
      tested with a synthetic event, never with real fingers on a real phone. **If panning ever feels
      wrong or fights you while drawing on the phone, say so and it becomes desktop-only in one line**
      (the nudge and trim pairs are already gated that way for their own reasons).

      **What is left is genuinely small.** `redraw()` and `dispScale()` derive from the canvas's SCREEN
      rect as well, so they want checking in the same pass — if the box moves to local space and the ink
      does not follow, the preview stroke and the surface part company. That is a PREVIEW bug rather than
      a stored-coordinate bug (see the correction at the top: `toProject` is already correct), so it is
      visible the moment you draw one line at 2× and does not need the four-round paranoia #97 earned.
      **The probe is the check either way** — it reports the overlay-box match and the true mapping error
      side by side.
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
- [x] **172 — Export resolution needs a "Same as project" option. ALREADY DONE — verified 16 Aug.** So you
      can export at exactly the canvas size without hunting for the number that matches. (Pairs with #121,
      which made the cog the source of truth for resolution — this is the option that says "whatever the
      cog says".)
      **Verified in the real dialog, not read off the source:** the resolution list opens on
      **"Same as project — 1080×1920"**, first and selected, and it names the project's ACTUAL pixels
      rather than saying "same" and leaving you to guess — the same treatment the frame-rate list above
      it got in #141. The **seventh** stale entry (after #37, #147a, #155, #93's headline, #164, #173).
      **Seven is no longer a coincidence, and it is worth naming what causes it:** these are items that
      got built as part of a NEIGHBOURING request — this one almost certainly alongside #141, which was
      doing exactly this to the frame-rate list — and the entry that asked for them was never revisited
      because nobody was working *that* entry at the time. Sweeping the list catches them; memory never
      does. **It is an argument for periodically auditing ticks rather than only working forwards.**
- [x] **173 — Export quality should default to High. ALREADY DONE — implemented and never ticked; verified 16 Aug.**
      Found by sweeping the middle of the list after #225 turned up undone — the **sixth** stale entry
      this file has produced (after #37, #147's first half, #155, #93's headline and #164).
      **And whoever did it thought harder than the request did**, which is why it is worth reading rather
      than just ticking: changing the `<option selected>` alone would have been a fix that only worked on
      a device which had never exported. Since #121 the quality IS remembered, so your own browser would
      have restored the Medium it saved months ago and you would have reported the identical thing again.
      So the prefs carry a schema version, and prefs written before the change drop their remembered
      quality exactly once — letting the new default win — after which a quality you choose is kept.
      **Verified rather than assumed:** seeded `localStorage` with a stale `{quality: "medium"}` from the
      old schema, opened the dialog, and it came up on **0.18 — the highest of the three options**.
- [x] **174 — "Export just this clip" should say LAYER, and be a picker, not a tick. DONE v8.05.** His words: *"With
      the export just this clip tick at the bottom, make it say export just this layer, and also make it
      so when you press it, it isn't a tick but it's a button and it lets you select what layer."* So:
      relabel, and replace the checkbox with a button that opens a layer chooser.

      **DONE v8.05.** The button opens on **All layers**, lists the project's layers top-down in timeline
      order, and once you pick one it wears that layer's name and takes the accent — so the dialog cannot
      quietly be set to export a fraction of your project without saying so.
      **The second half was the real change:** the tick could only isolate whatever was SELECTED, so
      exporting a different layer meant closing the dialog, selecting it and reopening. The button holds
      the choice, which is why it also had to stop reading the selection.
      **It opens on "All layers" every time rather than remembering, on purpose** — a solo that silently
      repeated last week's choice would hand you a file with most of the project missing and no clue why,
      so it is also deliberately kept out of the remembered export prefs.
      *The old checkbox is deleted rather than hidden: a hidden one still got laid out (a stylesheet rule
      outranks `hidden` here) and sat adrift of the column, which the dialog's own alignment test caught
      — x=499 against x=590. Deleting it left one source of truth as well.*
      **Verified at 380px** (which I had skipped on the first pass and had to come back for): the button
      is 179px wide ending at x=330, byte-identical to the resolution select above it, inside the card
      with zero overflow. The same screenshot shows **all three export items at once** — Quality **High**
      (#173), Resolution **Same as project…** (#172) and **Export just this layer → All layers** (#174),
      one column, nothing adrift.
      **And two mistakes of mine on this one, recorded because they are the same mistake twice:** I
      pushed it with a RED suite (ran the tests and committed in the same breath without reading the
      output — an older guard checked for the tick by id), and nothing tested that the picker DID
      anything, so the export could ignore it entirely and all 370 tests still passed. Both fixed; the
      effect is asserted now, not the label.
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

      **A CONFIRMED BLACK-BAR MECHANISM WAS FOUND AND FIXED IN v7.87 (#239), AND IT MATCHES THIS
      DESCRIPTION — including the "creeps in" that nobody could explain.** #239 gave the reproduction
      this entry never had: *"it seems to happen when you, like, do the easter egg thing where you're
      slamming the screen."* The cause was the slam's OWN ring — `#home-screen.hm-slam` carried a 140px
      `box-shadow` of flat `--bg`, added in #144 so the shake could not reveal the editor behind home.
      That was correct while home was a flat surface. Home is not flat any more (its own drifting light,
      and a grain field since v7.76), so every slam painted a band of dead `#060c0f` against a lit,
      textured screen.
      **And it explains the word this entry is built around.** You said it *creeps* in, and this entry
      rightly concluded that a band which animates is not a painted background — it is something moving.
      It was: the ring is attached to a 420ms shake animation, so the band arrives WITH that movement
      rather than appearing at once. Every earlier round screenshotted the end state, by which time the
      animation had finished and the band was gone — which is exactly why they kept finding
      plausible-but-wrong static causes, as this entry predicted.
      **The frame capture this entry asked for was done, and it is what proved the fix:** home's box was
      sampled 24 times across the whole 420ms with the editor painted bright red behind it, and the
      largest uncovered edge is **0px** — nothing can appear at any frame. The ring is gone; the shake
      now overscans by 6% so home's own surface fills the edges.
      **This is NOT ticked, deliberately, and it needs one word from you.** I cannot prove your original
      sighting was this mechanism — you reported it long before the slam was implicated, and there have
      been three plausible-but-wrong causes already, so declaring it closed on a match of symptoms would
      be the fourth. **Next time you would have expected the bar: does it still happen?** If yes, it is a
      second cause and this entry is still live; if no, this closes with v7.87.
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
- [x] **195 — The volume control should be a scrub field like the effects sliders, not a dot on a line. DONE v8.12.**
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

      **IN PROGRESS 16 Aug — step 1 (the gain stage) IS BUILT AND SHIPPED, but is INERT until the UI can
      ask for more than 100%.** Taking my own recommendation above rather than leaving it as a question.
      Landed in **v8.10/v8.11**, in `js/audio-fx-live.js`:
      · `boostOf(layer)` / `needsBoost(layer)` — the peak of a static or keyframed volume, so a clip
        whose volume goes above 1 anywhere is routed for its whole length (a chain cannot be built
        halfway through a drag without a gap in the sound).
      · `makeBoostStage(ctx)` — a GainNode into a DynamicsCompressor set as a **limiter**
        (threshold −1.5 dBFS, knee 0, ratio 20, attack 3ms, release 120ms). It engages only on what
        would have clipped, so ordinary boosts pass through unshaped.
      · `sync()` routes on boost as well as on audio effects, with the boost stage **last** — a limiter
        has to be the final thing in the path or an effect after it can push the signal back over the
        ceiling. `dropBoost()` on every exit; `passthrough()` unchanged.
      · `setBoost(layer, vol)` ramps the gain (`setTargetAtTime`, not a bare assignment, which clicks).
      · app.js's reconcile now **splits at unity**: `el.volume` keeps everything up to 1 — so fades,
        solo, mute and the de-click are untouched — and only the excess goes to the boost. They
        multiply back to the value asked for.
      **The iOS hazard named above is handled by REUSING this module rather than writing a second one.**
      It already owns the MediaElementSource rule (one per element, ever, cached on the media rec), so
      boost is just another reason to route and there is exactly one place that can get it wrong. **A
      layer at or below 100% is still never routed at all** and keeps today's exact native path.

      **WHAT IS LEFT — pick this up here:**
      1. `volumePanel` (js/inspector.js): `setPct` clamps to `Math.min(1, …)` and `mtVBox` is capped at
         `max: 100`. Both need to allow **1000**.
      2. Replace the dot-on-a-line `vol-slider-row` with the effects-style scrub ruler — the half he
         asked for **by name**: *"needs to be like the effects slider and not a dot on a line"*.
      3. Call `FM.audioFxLive.sync(layer)` when the volume crosses 1, or the chain is never built.
      4. Give the EXPORT the same limiter (`js/exporter.js`, the GainNode at ~line 242), or preview and
         file disagree again at 1000% — which is the whole reason this entry exists.
      5. Tests: preview and export must agree above unity, and a layer at ≤100% must NOT be routed.
      **Careful with #253** (sliders scrub too fast) — it is about this same `tickStrip`, so whatever
      lands there must still let this row cross 0–1000%.

      **DONE v8.12 — all three steps, in the order this entry set out.**
      1. ✅ **The gain stage**, reusing `audio-fx-live.js` rather than writing a second router, so the
         irreversible `MediaElementSource` rule stays in one place. A layer at or below 100% is never
         routed and keeps the native path — that negative is the load-bearing test, and making it
         route everything turns three tests red.
      2. ✅ **The control**: the dot-on-a-line is gone, replaced by the effects scrub ruler you asked
         for by name. The two halves of your sentence were one requirement — a range input maps its
         travel onto its range, so at 0–1000% every normal level would be squashed into the first
         tenth of the bar.
      3. ✅ **The range and the limiter**: 0–1000%, with a limiter (−1.5 dBFS, ratio 20) last in the
         chain, and **the same stage added to the export** so preview and file agree above unity —
         which is the disagreement this entry was opened for. The limiter is applied only to boosted
         clips, so it cannot quietly re-shape mixes you have already made.
      Verified at 375px. *(One of my own tests was dead: it set `layer.volume` directly and skipped the
      panel's clamp, so restoring the 100% cap left the suite green. It drags the real control now.)*
- [x] **203 — An "Improve quality" action in a clip's ⋯ menu. DONE v8.14, named honestly.** His words: *"We should add a button in
      the three dot menu when tapping on a clip to improve quality, so if your video or photo is low
      quality then you can add pixels or whatever to enhance it."*
      Be straight with him about what is possible before building anything: nothing in a browser invents
      detail that is not in the file. What CAN be done, and is worth having, is a proper upscale —
      resampling to a larger raster with a good kernel plus a little unsharp mask and grain, which does
      make a soft phone clip look meaningfully better on a big canvas. What cannot be done is
      film-and-TV "enhance". Name it for what it does (Sharpen & upscale, say) rather than promising
      pixels it cannot create, or the feature will read as broken.

      **DONE v8.14 — and it is called "Sharpen for upscaling…", not "Improve quality".** Taking the
      entry's own advice rather than leaving it as a worry. The reason, plainly: nothing in a browser
      can invent detail that is not in the file, so a button with your name on it would promise
      something it cannot do and look broken the first time it failed to rescue a really soft clip.
      What it DOES do is real and visible — it sharpens the detail that is there once the picture is
      being stretched over more pixels than it has — and it tells you the numbers when you use it:
      *"Sharpened for a 4× stretch (270×480 into 1080×1920). This sharpens the detail that is there —
      it cannot add detail the file never had."*
      **The dose follows the stretch.** A 4× upscale gets a wider radius than a 1.2× one; giving the
      4× settings to a clip that barely needs them is what produces the crunchy halo that makes
      "enhanced" footage look worse than the original. Capped at both ends.
      **Press it again and it comes off** — "do it again to improve it more" is the obvious thing to
      try, and two of them is a halo. It only ever removes the one IT added, so a sharpen you put on
      by hand is safe.
      **If you want it to actually invent detail**, that is an AI upscaler — a model, not a filter,
      and a much bigger conversation about size and where it runs. Say so and we will scope it.
- [x] **204 — Swiping UP on Recents should open Faves — he has now said UP twice. DONE v8.06.** His words: *"Idk if
      you've done it but it still needs to be added that swiping up on the recents menu in effects opens
      the faves menu."*
      **This resolves the ambiguity flagged in #124.** That entry recorded the conflict honestly — he
      said swipe UP to open and also "swipe back up and cancel" — and it was built as pull-DOWN because
      down was self-consistent with the cancel. He has now said UP plainly and unprompted, so the
      gesture flips: **up opens, and reversing (down) cancels.** The mechanics from #124 all carry over
      unchanged — the commit threshold, the sticky reversal-cancel, the hint wording. Note the reason
      down was chosen originally, from the code comment: the browser is itself a vertical scroller, and
      up IS the scroll direction, so an up-gesture has to be claimed carefully — gate it on the scroller

      **ASSESSED 16 Aug, NOT started, and the reason is specific rather than "it is big".** Read
      `attachFavPull` (js/fx-browser.js) before touching this: the down-pull is gated on
      `scrollTop <= 0`, and that gate is the entire reason it can be a bare gesture on the block at all.
      *"Down at the top of a scroller is different: there is nothing left to scroll to, so the gesture is
      free. It is the pull-to-refresh bargain."*
      **Flipping to UP does not flip that gate — it has to become the mirror**, `scrollTop + clientHeight
      >= scrollHeight - 1` (at the END of the scroller), because only there is an up-gesture free to
      claim. Get that wrong and the effects browser stops scrolling on the screen you use most, which is
      a far worse regression than the gesture being the wrong way round.
      **Also mirror, not merely negate:** the reversal-cancel measures distance back from the PEAK
      (`REVERSE_BY`, `REVERSE_FROM`), the damping is `Math.pow(dy, 0.78)`, and the commit point is in
      DAMPED pixels — 34 damped ≈ 92px of finger. All of that carries over with the sign changed, and the
      constants should not be re-tuned in the same pass or a mis-tune and a mis-claim become
      indistinguishable.
      **And the hint strings and `grab.title` say "Pull down"** — they are user-visible and must flip too.
      This wants a session with room to test the scroll-claim at 380px properly, which is why it is
      written down rather than half-done.

      **DONE v8.06 — and the assessment above was right about where the risk was.** Up opens, reversing
      (down) cancels, and the affordance reads "Pull up (or tap) for your faves".
      The gate is **mirrored, not negated**: `scrollTop + clientHeight >= scrollHeight - 1`, with 1px of
      slack because an exact equality never lands on a zoomed or high-dpr viewport and the gesture would
      then never arm at all. Everything else is mirrored rather than reinvented — the reversal-cancel
      still measures back from the PEAK, the damping is unchanged, and the commit point is untouched.
      **Verified at 380px that the effects browser still scrolls freely**, which is the thing that must
      not break. The suite's gesture test is mirrored (its assertions are the same contract either way)
      and gains one for the gate: an up-pull away from the end must not be claimed. Both mutations red,
      and the dangerous one reports **"scroller at 602/602"** — at the end, with the negated gate
      rejecting it anyway, which is exactly the unscrollable-browser mistake being caught.
      being at the BOTTOM, the mirror of the current `scrollTop <= 0` gate, or it will fight scrolling.
- [x] **205 — Move & Transform should hide the outline and show the anchor point instead. DONE v8.15, both halves.** His words:
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

      **DONE v8.15 — built exactly as that last line says, as ONE rule.** `FM.inspector.ownsCanvas()`
      names the section that owns the overlay (Move & Transform, or Edit Points), and the selection box
      stands down for whichever it is. Two special cases would have drifted apart the first time a
      third section joined them.
      The anchor now shows for the **whole** of Move & Transform rather than only its anchor sub-mode —
      it is what replaces the outline, so it has to be there the moment the section opens. It is drawn
      from the box's own transform origin, so it cannot disagree with where the layer really turns, and
      **there is a test that rotates and scales a layer and asserts the anchor does not move**: a pivot
      that drifts when you rotate would be worse than not showing one. Groups opt out — a group has no
      pivot of its own.
      **Leaving the section brings the outline back**, with its own assertion, because forgetting that
      would leave the app with no selection UI at all.
      *(A real bug surfaced doing this: nothing told the canvas overlay that the open section had
      changed. It only updates on a render or a canvas gesture, so the outline stayed up until you
      touched something — opening the panel did nothing until then. Fixed.)*
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
- [x] **207 — The four home tabs should stagger their contents in, and the tab itself should react. DONE v8.17.**
      His words: *"Make it so when you open up any of the 4 menus like projects elements etc it does
      something like the animation when opening the app where all of the spawn in loading from top to
      bottom, i think that would look very clean, also adding a little animation to the button you press
      to open that menu."*
      The machinery already exists and is his own from v4.92: home.js stamps `.hm-in` plus a per-element
      `animation-delay` on each card so they rise on their own beat, top to bottom. This is asking for
      that same treatment on every TAB SWITCH, not just on first load — plus a small press reaction on
      the tab button itself. Reuse the existing keyframes rather than writing a second set, or the two
      will drift; and cap the stagger so a long list does not take a second to finish appearing.

      **DONE v8.17 — both halves, on the existing animation as this entry insisted.** Only the GRID
      restages: the top bar and the tabs are already on screen, and restaging them would make the whole
      page flinch on every tab change. Capped at ten cards — 0.4s to the last one however many there
      are — which is the cap this entry asked for. Re-tapping the tab you are already on does nothing.
      The tab's own reaction is a 180ms dip-and-return, restarted with the v8.16 pattern (cancel the
      in-flight run, force layout on the button) so it cannot end up like the cog and fire once per
      page load.
      *(Both of my first assertions were DEAD. They read the real grid, which in the test browser holds
      one card, so "no stagger" and "no cap" both passed under mutation. The test builds a known
      40-card grid now — with 40 cards an uncapped stagger makes the last one wait 1.56s.)*
- [x] **208 — The add sheet wastes a band at the bottom on the phone. DONE v8.18.** His words: *"We need to utilise
      this wasted space on phone, each icon in that section could be longer and more square so then it
      fits it all nicely"* — with a screenshot of the Elements tab, a red ring drawn round an empty strip
      below "Adjustment / Empty group / Custom elements".
      So the twelve cards should grow to fill the sheet rather than leaving a dead band: taller cards,
      closer to square. Watch two things — the sheet's height varies with the device (and with the
      safe-area inset), so this wants the cards to FLEX into the available height rather than a taller
      fixed size that overflows a smaller phone; and the tabs above must not grow with them.

      **DONE v8.18.** Measured first: three rows of 111×64 cards (ratio 1.73) in a 260px body — 52px
      doing nothing. The rows share that height now and Elements is **111×81 (ratio 1.37)**, band gone.
      Both warnings in this entry were right and both are honoured: the cards **flex** into the height
      rather than taking a taller fixed size (so a smaller phone just gets smaller cards), and the tabs
      above are untouched.
      **The overcorrection is the part worth knowing.** Filling on EVERY tab gave Media — three cards on
      one row — a 111×260 card at ratio 0.43, a sliver, which is the opposite of what you asked for. So
      the fill is opt-in per page, drawn at two rows: 3 rows → 1.37, 2 rows → 0.88, 1 row → 0.43. A
      one-row tab keeps its natural size and the sheet has room to spare, which is more honest than
      stretching one card to four times its height to pretend the space is used.
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
- [x] **214 — Notes must belong to ONE project, and travel with the saved file. DONE v8.22.** His words: *"Currently
      the notes carry across projects, I want each projects notes only for that project, and when you
      save the project file as well it should save the notes."*
      Two halves. The first is a real bug: notes were designed to live on `scene.project.notes` precisely
      so they belong to the project — so either they are being written somewhere global, or the notes
      array is surviving a project switch because the scene object is reused. Find out which before
      changing anything; if it IS on the project, then something is copying it forward. The second half
      is a gap: the `.fmotion.json` save needs to carry `notes` through export AND import, and an old
      file without them must still open.

      **DONE v8.22 — and the entry's own instruction ("find out which before changing anything") paid
      off, because most of it was already right.** Measured: notes DO live on `scene.project.notes`;
      creating a project, opening one, switching away and back, and the saved `.fmotion.json` were all
      correct already — the file carries them and a new project starts empty. The notepad re-reads the
      list on every render, so it was not a stale cache either.
      **The one route that produced your symptom is a TEMPLATE.** `templates.save` packs the whole
      project object, so making a new project from a template handed you the notes of whoever made it.
      **The line I drew, and it is a judgement call worth knowing about:** a **duplicate** keeps its
      notes (it is a copy of that project — losing them would be its own bug), a **template** does not
      (it is a reusable starting point, and "fix the audio at 0:12" means nothing in the next project).
      Say so if you want duplicates cleaned too.
      Stripped at save AND when a template is used, so the templates already on your disk stop leaking
      without any migration.
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
      **REPRODUCTION, 15 Aug — the first one this entry has ever had.** His words: *"I made a fresh
      project, added some sound effects, pressed export with some pretty normal export settings and got
      an audioless clip."*
      **Read what is specific in that sentence, because it narrows this a long way:**
      · **A FRESH project** — so it is not state accumulated over a long edit, not a project migrated
        from an older build, and not something a previous export left behind.
      · **SOUND EFFECTS** — not an imported song. If he means the app's own audio (Elements / the audio
        browser) then these layers are created by a different path from `FM.loadVideoFile`, and every
        audio fix this file records (#96's duration disagreement, #95's start-up gap, #72's truncation)
        was measured on IMPORTED files. A sound-effect layer may never have been exported with audio at
        all, which would explain why this keeps coming back after each of those fixes.
      · **Normal export settings** — so it is not an exotic codec or resolution combination.
      **First move for whoever picks this up: build exactly that scene and export it.** Fresh project,
      add a sound effect the way the UI does, export at defaults, then count the audio samples in the
      resulting MP4 (`tests/_xresume.html` already counts video samples and shows how). Do NOT start from
      the encoder — start from whether the exporter can even SEE that layer as an audio source, because
      "a layer type the audio path does not recognise" fits every symptom here and nothing measured so
      far rules it out.
      **This is the most serious open item in the file** and now has a concrete repro, so it should go
      first once the current PC run is finished.

      **FIRST LOOK AT THE EXPORTER, 15 Aug — two lines that can silently drop a layer's sound.**
      `buildAudioMix` (js/exporter.js) opens its loop with:
      ```
      for (const layer of scene.layers) {
        if (layer.type !== 'video' || ...) continue;      // <- line 250
        const m = FM.media.get(layer.id);
        if (!m || !m.file) continue;                       // <- line 252
      ```
      Both are `continue`, not an error, so **anything they skip produces a silent export with no
      warning anywhere** — which is precisely the shape of this report.
      · **Line 250** mixes only layers whose type is `'video'`. Imported audio rides the video path (an
        mp3 becomes a `'video'` layer with a 0×0 picture — that is documented in the compositor), so
        imports are fine. A layer created by any other route with a different `type` is skipped.
      · **Line 252** also requires `m.file`, a real File object. Audio that arrives as a bundled asset or
        a URL rather than a picked file may have a decoded buffer and no `.file`, and would be skipped
        even if its type were right.
      **What I could not settle before running out of room, and it decides which of the two it is:** I
      could not find a distinct "sound effects" source in the code — no `sfx`, no `addAudioLayer`, no
      `type: 'audio'` layer constructor. So either "sound effects" means audio files he imported through
      the Audio tab (in which case both guards pass and the cause is further down the encoder), or they
      come from somewhere I did not find.
      **One line from him settles it: where did the sound effects come from — the Audio tab / his own
      files, or a built-in library inside the app?** Not blocking: the next session should build the
      scene both ways and count audio samples in the output, because the two guards above are testable
      without knowing the answer.

      **FOLLOWED THAT LEAD AND IT DIED — recorded because a wrong lead left lying about costs a morning.**
      The Audio tab does not open a picker: it lists previously-imported files as one-tap tiles and
      re-adds them by media id (`addmenu.js` → `FM.mediaLib.use(mid)`). That looked like the answer — a
      library re-add restoring from IndexedDB rather than a picked File would leave `m.file` empty and
      hit the line-252 guard exactly as reported. **It does not.** `mediaLib.use()` pulls the real File
      back out of storage and then calls `FM.loadVideoFile(file)` — *the identical path an import takes*.
      So a re-added audio tile ends up with the same media record as a fresh import, and **both guards
      pass**.
      **What that rules out, which is the useful part:** if his "sound effects" came from the Audio tab
      (his own files, either freshly imported or re-added), the mixer is NOT the thing dropping them, and
      the cause is downstream — the AAC encoder, the muxer's audio track, or the `!any` path. #47's own
      notes already flag that the muxer will commit an empty audio track to the moov on some iOS Safari
      versions and produce a silent file, which is worth reading before anything else.
      **So the question narrows rather than disappears:** if the effects came from the Audio tab, look
      downstream of the mix; if they came from somewhere else, find that path first. **v7.90's toast now
      answers this for him without him having to know any of it** — if it says "could not be read" the
      mixer dropped them and the reason is named; if no toast appears at all and the file is still
      silent, the mix was built fine and the loss is downstream.

      **WENT DOWNSTREAM AND FOUND A SECOND SILENT LOSS — v7.91, and this one fits your report better
      than the first.** Before declaring an audio track the exporter probes whether the browser can
      encode AAC, which is right: a muxer that commits an empty audio track to the moov makes a file
      strict players reject. But if the probe failed it threw the ENTIRE mix away and said so only in a
      `console.warn`. Nothing on screen at all.
      **And at that point the mix was built perfectly** — every clip read, every sample in place — so
      v7.90's reporting stays silent here. Normal settings, no warning, no sound. That is your sentence.
      It now toasts *"This browser cannot encode AAC — exporting WITHOUT SOUND."*
      **The bit that explains five rounds of failing to pin this down:** `AudioEncoder` support is a
      property of the BROWSER, not of your project or your settings. The same project exports with sound
      in one browser and without it in another, on the same machine, with nothing changed — which is
      unfalsifiable from a description alone.
      **Three outcomes are now distinguishable from the outside**, which is what this entry has always
      lacked: a toast naming a clip = the mixer; the AAC toast = the encoder; NEITHER toast and still a
      silent file = the muxer, and that is the last place left to look.
      *Known gap, stated rather than papered over: the AAC path has no direct test. It sits mid-`run()`
      behind a real `isConfigSupported` probe, so covering it needs a full export with a stubbed encoder
      — a bigger rig than this change earned today.*

      **AND THE THIRD PATH — v7.92, the worst of them.** `encodeAudio` throwing was also a bare
      `console.warn`, and it matters more than the other two because **the muxer has already declared an
      audio track by then** (`audio: mix ? {…} : undefined` is decided far higher up, while the mix still
      existed). So a throw there did not just lose the sound — it shipped a file whose moov **promises an
      audio track that was never fed**. That is exactly the "broken/silent track that strict players
      reject" the AAC probe was written to prevent, arriving by a route the probe cannot see: it answers
      "can this browser encode AAC", not "did this encode survive". Such a file can play silently in one
      player and be refused outright by another.
      **All three silent losses now report themselves, and the toast alone says which half broke:**
      | what you see | what broke |
      |---|---|
      | a toast naming a clip | the MIXER could not read that layer |
      | "cannot encode AAC" | the BROWSER has no AAC encoder |
      | "soundtrack failed to encode" | the encode started and threw |
      | no toast, still silent | none of the three — and that would be genuinely new information |
      This entry had no evidence attached for five rounds of asking precisely because every one of these
      was a bare `console.warn`. **The next occurrence answers itself.**

      **CHECKED END TO END, 16 Aug — the toast really does reach the screen**, which was worth proving
      rather than assuming: a diagnostic that only exists in a unit test is no use at the moment you
      need it. Building the scene his report describes (a clip whose audio cannot be read) produces, on
      screen and visible: **"Exporting with NO SOUND — 1 audio clip could not be read (see the console)"**,
      with the console naming it: *"Boom SFX (no file on its media record — a bundled or URL-backed
      clip?)"*.
      **So when it happens to you again, read the toast and the console line and send me those** — that
      is the whole answer, and it takes one screenshot.

- [x] **216 — An "audio only" export option. DONE v8.23.** His words: *"Add an export option to just export audio."*
      A natural pair with #215 — and useful in its own right for pulling a soundtrack out. Needs a format
      decision (m4a/aac is the obvious default) and the export dialog's resolution/fps controls should
      hide themselves when it is chosen, rather than sitting there meaning nothing.

      **DONE v8.23 — and I went with WAV rather than the m4a this entry suggested, for a reason worth
      knowing.** The mix already comes out of the audio engine as raw samples, and WAV needs no codec;
      **#215 proved a browser can flatly refuse to encode AAC** and hand you silence with nothing to
      show for it. An audio export that cannot fail for want of a codec beats a smaller one that
      sometimes does. Files are bigger — about 10MB a minute — so say the word if you would rather have
      m4a with a WAV fallback.
      The resolution, frame rate, custom size and transparency controls all hide themselves, and come
      back when you switch away (that has its own test — forgetting it would break the dialog for good
      after one visit). It uses the SAME mixer and the SAME range logic as the video export, so the two
      cannot disagree about what the soundtrack is.
      *(Two real bugs found by running it: `buildAudioMix` returns a wrapper, not a bare buffer, so the
      first version produced no file at all in silence; and **the WAV writer was mono-only** — built for
      sound effects — so it was quietly throwing away the right channel of your stereo mix. Caught by
      weighing the file, not by listening: 192KB where 384KB was due.)*
- [x] **220 — The filters section isn't what I asked for. Three corrections. ALL DONE (v7.48–v7.49).** (15 Aug.) His words:
      *"With the filters I wanted them to have a section like how effects and audio does, not how it
      currently is, idk if this is just the base state while you work on it. Also there should be an add
      filter button in the effect tab, you should have to go over to filters tab, and also I wanted a
      shortcut button to go to filters inside the colouring tab"*
      1. **The Filters tab should look like the Effects and Audio BROWSERS** — section banners and a grid
         of tiles with previews — not the list of text rows I built. This swallows #219, because tiles
         without pictures would be worse than the list, not better.
      2. **No "+ Add Filter" button in the Effects tab.** Going to the Filters tab is how you add one.
         (Reading his sentence as a dropped "n't" — the second half, "you should have to go over to
         filters tab", only makes sense that way, and it is the tidier design: one door, not two.)
      3. **The Colouring shortcut should NAVIGATE to the Filters tab**, not open a picker menu where it
         stands. He asked for "a shortcut button to go to filters" and I built a shortcut that adds a
         filter — a different thing.
      4. **Rename the "Effects" sub-tab to "Visual"** (said 15 Aug, right after the above): *"In the
         effects tab, change the effects sub tab to visual, because I want all the tabs to be classified
         as effects, so you go into the effects tab, then you have, visual, filters, and then audio."*
         The card is Effects; the three things inside it are Visual, Filters, Audio. Obvious in hindsight
         — "Effects → Effects" was always a bit odd.
      *(2), (3) and (4) shipped in v7.48. (1) — the tile browser with previews — shipped in v7.49, which
      also closed #219 and finished #113 outright.*
      **Scouted for (1), so the next go is a build rather than a hunt.** The tile itself is easy: the
      generator's `sceneFor(type, inst, span)` already takes a ready-made effect INSTANCE and skips its
      per-effect demo tweaks when you pass one — so a filter tile is
      `sceneFor(firstChildType, FM.filters.makeInstance(id), 0)` plus one `renderFrame`, static, no
      per-effect tuning needed at all (the authored settings ARE the look). Using the first child's type
      as the subject hint is right, not a bodge: a filter of colour effects then gets the same photo
      subject a colour effect gets.
      **The cost is the plumbing, not the picture.** The thumbnail pipeline forks on "is this a preset or
      an effect" in four places (`syntheticFor`, `layerStep`, the mount key, and the window/duration
      helper), and a filter is a third kind. That is a contained job but not a small one, and it is why
      it did not go in with v7.48.
- [x] **224 — A hidden EFFECT should look hidden, the way a hidden layer does. DONE v8.26.** (15 Aug.) His words:
      *"when you press the eye button on a layer and it puts a cross through it, changing what it looks
      like, you should also make it so it does that when you make an effect hidden, right now its hard to
      tell when an effect is hidden"*
      A layer's eye gets a slash through it and the row changes; an effect's eye does not, so a switched
      off effect reads almost the same as a live one. Copy the LAYER's treatment rather than inventing a
      second one — same slashed eye, same dimming — and it should apply to effects inside a filter too,
      not just top-level ones.

      **DONE v8.26, using the LAYER's own paths copied verbatim** from js/timeline.js rather than a
      second drawing of the same idea — the entry asked for that and it is the right call: two hand-made
      "off" icons would drift. The fade is lifted from .4 to .55 as well, because the struck-through
      glyph now carries the message and the dimming only supports it. Filter children get it free, since
      they are built by the same `fxRow`.
      *(The test asserts the GLYPH, not the class — a class can be present while the icon looks
      identical, which is precisely the state you were reporting.)*
- [ ] **249 — THREE layouts exist; there should be two.** *(Was #223, which collided with the splash-video entry of the same number; renumbered 16 Aug. His request, unchanged.)* (15 Aug, with two ultrawide photos.) His
      words: *"For some reason the new layout i had you make only shows up on certain display sizes like
      my laptop, but then an amalgamation of the old one shows when I flip my phone or use a wide
      monitor, I don't want this, I just want two layouts not three"*
      So on his laptop he gets the Studio layout he asked for; on an ultrawide monitor — and on his phone
      held sideways — he gets something in between, which is the old layout partly restyled. Two layouts
      only: phone, and everything else.
      **CAUSE FOUND (15 Aug), and it is not the screen size.** There are two DESKTOP layouts, chosen by a
      saved setting: `classic` (the old one — inspector down the right) and `studio` (the one you asked
      me to build). Classic is still the DEFAULT. The setting lives in that browser's own storage, so your
      laptop has studio saved from when we built it, while the ultrawide — a different machine — still has
      the classic default, and a landscape phone is over 700px wide so it takes the desktop layout too and
      shows classic as well. Three layouts in practice, exactly as you said.
      **The fix is one line — make studio the only one — and I tried it, and it is NOT one line.** With
      studio as the default, two suite tests go red immediately, because the whole suite has only ever run
      in classic:
      · the desktop text editor's "Aa" options cover **99.5% of the canvas** — you would be typing blind.
        That is your own #147 ("the text editor covers the text you are editing"), and it turns out to be
        much worse in studio than in classic;
      · a timeline geometry check is off by 14px at rest, because in studio the timeline starts after the
        left rail rather than at the window edge.
      So retiring classic means fixing #147 first, and re-checking the suite's desktop assumptions.
      Reverted for now rather than shipping a desktop that is worse than the one you have. **Doing #147
      and this together is the right shape.**
- [ ] **248 — A "?" in the top bar that opens the keyboard shortcuts.** *(Was #222, which collided with the flaky-test entry of the same number; renumbered 16 Aug. His request, unchanged.)* (15 Aug.) His words: *"Put a
      question mark in the top right corner to the left of note pad that quickly opens the keyboard
      shortcuts menu."* and *"On pc it can go on the play button row along side everything else when you
      get to that stage."*
      So: phone → top bar, immediately LEFT of the notepad icon. PC → the transport row with the rest,
      not the top bar. Note the top-bar spacing there has been got wrong twice already (#189), so measure
      the gaps rather than eyeballing them, and remember the notepad only appears when nothing is
      selected — the "?" must not shuffle position depending on selection.
      **Scouted 15 Aug, and half of it already exists.** There IS a `#btn-help` "?" button, wired to the
      shortcuts overlay (`js/shortcuts.js`) and to the `?` key — but it lives in `.topbar-extra`, the
      DESKTOP-only group, so on a phone it is simply never shown. So the phone half is a genuine addition
      to `.topbar-m` (the mobile bar that holds the notepad, refresh, duplicate, bin and ⋯), and the PC
      half is mostly a MOVE — from the desktop top bar down to the transport row, which is where you
      asked for it.
      **Deliberately not started at the tail of a session**, because that mobile bar's spacing is the
      thing that went wrong twice and got the "why are you so bad at aligning the top buttons" reply. The
      current gaps are hand-tuned (18.0 / 24.1 / 18.0) and inserting a button next to the notepad — which
      itself appears only when nothing is selected — has to be measured, not eyeballed.
- [x] **221 — Get rid of Delete from the layer ⋯ menu. DONE v7.48.** (15 Aug, with a phone screenshot.) His words:
      *"Get rid of the delete button in this menu"* — the long ⋯ menu on a selected layer, which ends in
      a red Delete under the colour tags. The bin icon is already in the top bar two inches away, so the
      menu entry is a second door to the most destructive action in the app, at the end of a list you
      scroll past. Nothing else in that menu is irreversible.
- [x] **219 — Filter tiles need picture previews. DONE v7.49.** *(Folded into #220 point 1 — he has now asked for the
      whole tab to match the effects browser, and tiles are half of that.)* *(Found by me on 15 Aug finishing #113 step 5.)*
      The Filters subsection lists each look with words — its name, what it does, and the effects it is
      made of. What it does NOT have is a little preview picture the way the effects grid does, and for
      choosing a LOOK a picture is worth more than a sentence.
      Not done yet because it is not a small job: the thumbnail machinery is built around one effect per
      tile (it takes an effect NAME, not a list), so filters need their own route through it. Doable —
      and easier than an effect thumbnail in one way, since a filter's settings are already chosen, so
      none of the per-effect preview tuning applies. Static tiles, not animated: 16 animated previews on
      a phone is not worth what it costs.
- [x] **217 — Most ways of getting a layer into the app skip the safety checks.** *(Found by me on
      14 Aug while doing #113 step 1 — not something you reported.)* There is a function that rebuilds an
      imported layer's audio effects, masks, behaviours and camera from a known-good schema, so a corrupt
      or hand-edited project file can't reach the renderer. It has exactly ONE caller: importing a
      `.fmproj` file. Everything else gets nothing — inserting a template, inserting an element, duplicating
      a project, pasting a layer, and undo/redo restore. Effects are covered everywhere now (v7.38 wired
      those in separately, including the autosave load), but the rest of the layer still isn't.
      Not urgent and nothing you'd see today; the reason to fix it is that #113's filters make
      `layer.effects` a nested structure, and "which paths validate" stops being an academic question the
      moment a container can arrive through one that doesn't.

      **DONE v8.24, and fixed structurally rather than by adding three more calls.** `reIdLayers` is the
      gate every batch of foreign layers already comes through — importing, template use, template
      insert, element insert, duplicate — and re-iding them is not optional, so the sanitising lives
      there. A future way of bringing layers in cannot forget. Running it twice on the import path is
      harmless: the sanitisers rebuild from a schema, so they are idempotent.
      **The control assertion is the important one** — a sanitiser that ate good data would be worse
      than the hole — so a real Luma Matte is tested to keep its cross-layer `params.source` and a real
      `follow` behaviour to keep its `targetId`, both remapped.
      *(Switching it on immediately reddened an existing test, and the FIXTURE was wrong, not the code:
      it built a `follow` with no `prop`, a channel the app never omits, so the sanitiser correctly threw
      it out. Checked that a realistic one survives before touching the test.)*
      **Still not covered, deliberately and as before: the autosave load.** It checks effects only, and
      its own comment says why — rewriting audioFx, masks and behaviours across every project already on
      your disk is a migration, not a patch. Unchanged here.
- [x] **218 — Three saved lists write straight into a layer's effects with almost no checking.** *(Also
      found on 14 Aug.)* The effect clipboard, the effect presets and the layer presets all live in
      localStorage and all rebuild `layer.effects` from what they find there, checking only that the
      effect NAME is real — never the values. Same story as #217: harmless-ish today, genuinely not once a
      filter is a container with children inside it. Worth folding into the same pass as #217.

      **DONE v8.24, in the same pass as #217 as this entry asked.** The clipboard, the effect presets
      and the layer presets all go through the **same** sanitiser the import path uses — not a second,
      weaker set of checks that would drift from it. It rebuilds each effect from the registry's own
      schema, so an effect that does not survive is not landed at all.
      *(A security review of the change caught one thing: the shared helper **failed open** if the
      sanitiser was unavailable, returning the list unchecked. That is the wrong way round — the one
      moment validation cannot run is the moment unvalidated data must not reach the renderer. It fails
      closed now.)*
- [x] **213 — The + at the bottom of the home screen needs a bigger HIT BOX, not a bigger button. DONE v8.21.** His
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

      **DONE v8.21, measured both ways as this entry asked.** Before: 58×58 button, catch area reaching
      **29–30px from centre** — exactly the disc — with `#hm-scroll` immediately outside, which is what
      was opening projects. After: **41–42px reach around an unchanged 58×58 disc**, and a tap 8px above
      the button now lands on the + instead of the list.
      Both cautions in this entry are honoured. It is a **circle**, not a square — the diagonal reach is
      41px against 42px on the axis, where a square would reach 59px into the corners, and the corners
      are the points furthest from the + and the likeliest to be a real tap on a card. And it is only
      12px, because the ring also blocks scroll drags that start inside it; more would make the bottom
      of the list feel dead. The outer edge stays 12px above the viewport bottom, clear of the home
      indicator.
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
- [x] **210 — The add-menu cards look generic. Per-tab colour direction, in his own words. ELEMENTS/MEDIA/AUDIO DONE v8.20; Template still open.**
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

      **v8.20 — Elements, Media and Audio are done; the greys are a system and are tested as one.**
      You had the cause exactly: ONE list of eight hues cycled by index on every tab, so a button's
      colour came from its position, not from what it does. Each tab has its own palette now (**Shape
      untouched**), and the buttons you named are coloured **by name**, so moving one cannot repaint it.
      Elements got a cooler, earthier family with the plate dropped to a whisper and the icons left
      bright. Import / Import audio are grey; AI Scene yellow; Sample clip pink-red into blue; Sound
      effects a rainbow; Record voice a strong red.
      *(Two things only measurement caught: `theme-glass.css` paints every card from the tint at (0,2,0)
      and was flattening the rainbow to plain orange — by eye it merely looked dull, and it took reading
      the computed background-image to see. And a flat-alpha rainbow reads as orange, because blues and
      violets carry far less luminance on this panel, so the alpha rises across the sweep.)*

      **⚠️ STILL OPEN — the TEMPLATE tab, which is not a colour job.** Your words: *"it shouldn't even
      colour it should show the hero image of whatever the template is (still keeping the text)."* That
      needs a thumbnail rendered or stored per template and drawn as the card's background with the
      label over it — closer to the home screen's project cards than to anything in this release. The
      empty state ("No templates yet") still needs to look like something too. Left for its own pass
      rather than half-built.
- [x] **209 — The × and search buttons in the effects header are off-centre and colourless. DONE v8.19.** His words:
      *"The search and x buttons in this menu look shit, make them actually centred inside their own
      circle. Make the x button red and the search one a nice blue."* Screenshot: the Add Effect header,
      where both glyphs sit visibly high/left inside their round buttons.
      Likely the same class as #188 — the glyph's ink not being centred in its box, rather than the box
      being wrong — so measure the ink, not the button. Colours: red for ×, blue for search.

      **DONE v8.19, and "measure the ink" was the right call — the boxes were never wrong.**
      · The **×** was a TEXT glyph. Flex centring centres the line box, not the ink, and where the ink
        sits in that box is up to the font — so it can look level on my screen and high on yours, which
        is exactly the disagreement this had. It is an SVG cross now, symmetric by construction, so no
        font can move it.
      · The **magnifier** was genuinely off by 0.4px: circle at 11,11, handle out to 21,21, so the ink
        centre is 12.5 in a box whose centre is 12. The viewBox origin is shifted that half pixel.
      Both now measure **exactly 0.000px** from centre. Red × and blue search, tinted rather than solid
      — a hard red disc reads as a warning and this is just a close button.
      *(My first centring test was dead: a 0.75px tolerance against a 0.4px defect. It is 0.25px now.)*
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

      **★ HIS FIRST REAL MEASUREMENT, 16 Aug — the thing this entry has needed since it opened.**
      Verbatim:
      ```
      FRAMES   44.6 fps average
               median gap 17.0ms · p95 38.0ms · worst 494.0ms
               14 of 446 frames were late (over 42ms)
      QUALITY  tier 0 (6 available) · mode smooth
               app-measured render 0.34ms · app-measured gap 0ms
      CANVAS   762k pixels
      PROJECT  3024×4032 @30fps · 8 layers (6 shape, 1 video, 1 image) · 2 effects
      DEVICE   screen 440×956 @dpr3 · 4 cores · Safari · iOS
      ```
      **Three findings, and the first is probably the whole story.**
      1. **The PROJECT is 3024×4032 — 12.2 megapixels.** That is a photo's dimensions, almost certainly
         inherited from an imported image, on a 4-core phone. Every frame composites 12.2M pixels. No
         amount of tuning the render path fixes a canvas that size; this is very likely the cause of the
         lag reported across #95, #125 and #202, and it is a *project setup* problem rather than an
         engine one. **Needs a product answer, not a perf fix** — a warning when a project is created
         far larger than any screen or export will use, and/or an offer to scale it down.
      2. **`app-measured gap 0ms` is a BUG.** v7.57 added gap-watching precisely so the ladder could see
         GPU and decode cost that its own render clock cannot. His report shows real gaps — p95 38ms,
         worst 494ms, 14 late frames — while the app's own gap metric reads **zero**. So the ladder is
         blind again, still sat on **tier 0 of 6** in *smooth* mode, and never shed quality through
         half-second freezes. That is exactly the shape of "nothing much ever gets resolved" from #125.
      3. **The readout's own READ line was wrong.** It printed *"this sample looks healthy"* because the
         MEDIAN (17ms) is fine, while ignoring 14 late frames and a 494ms worst case. A report that
         reaches a confident wrong verdict is the precise failure this feature exists to end, so the
         heuristic has to weigh the tail and the late count, not just the middle.

      **THE READOUT IS BUILT — v8.13.** This entry asked for it in its own last line, and #125 and #95
      are both blocked on the same thing, so it is done rather than guessed around again.
      **Settings → "What's slow" → Measure.** Use the app normally for ten seconds — do the thing that
      feels slow — then **Copy** and paste the block to me. Nothing is sent anywhere by itself.
      It measures the **real frame interval**, not our own render clock, which is the distinction that
      kept #125 alive: GPU filter work and video decode never touch that clock, and once reported
      1.1ms a frame while the app stuttered. The report also **interprets itself** — if the frames are
      slow while our drawing is fast it says the cost is GPU or decode — because "the numbers look
      fine" is how this has gone wrong three times running.
      **So #202, #125 and #95 all now need the same one thing from you: one measurement each, taken
      while it feels bad.** That is the whole remaining work on all three.
      *(Two flaws found by running it rather than testing it: with the tab hidden rAF never fires, so
      the probe hung forever and left Measure disabled — there is a wall-clock deadline now; and the
      first real report warned "NOT USABLE" at the top and said "looks healthy" at the bottom.)*
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
- [x] **184 — Speed menu: AM's four "speed to the playhead" buttons, and no speed cap. PARTS 1 & 2 DONE v8.09.** Three parts,
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

      **DONE v8.09 — parts 1 and 3, which are the same request said twice, and part 2.**
      Two buttons above the speed ruler. Park the playhead and the speed is **solved**: the footage in
      the clip (duration × speed) never changes when you re-time, so a clip that should end at T with
      its start fixed needs speed = footage ÷ (T − start). A 4-second clip told to end 2 seconds after
      it begins comes out at exactly 2.000× and lands on the playhead to the millisecond. One button
      holds the start and moves the end; the other holds the end and moves the start. They **refuse**
      the cases with no answer instead of doing something arbitrary — a playhead before the clip starts
      cannot be where it ends, and a clip with a **speed ramp** has no single speed to solve for, so
      solving one would throw your ramp away. Both say so.
      **Part 2 — the cap is gone.** It was 0.25×–4×, which is why you hit it; it is now **0.01×–1000×**.
      Type the number in the box for the extremes — the ruler still moves 5% a step so normal speeds
      feel exactly as they did, and a linear slider across that range would have put 1× a pixel from
      the left end. One caveat worth knowing: a browser caps how fast a `<video>` element can *play*,
      so live preview of a 900× clip cannot keep up. The render and the export seek frame by frame and
      are unaffected — the exported picture is right.

      **⚠️ WHY TWO BUTTONS AND NOT FOUR — one line from you closes this.** You said AM has four, and
      the screenshot is described as four buttons above the 1.00× slider. Working from the description
      alone I could only find **two operations that actually differ**: solve so the clip STARTS at the
      playhead, and solve so it ENDS there. Any other pairing I could invent came out as a duplicate
      of one of those wearing a different arrow. Rather than ship two buttons that quietly do the same
      thing as their neighbours, there are two. **If the other two do something I have not thought of,
      say what they do and they go in.** Everything else in this entry is finished.
- [x] **183 — Canvas settings needs "Save project as preset". DONE v8.08.** His words: *"This settings menu shall
      have an option that says save project as preset"* — screenshot is the **Canvas settings** dialog
      (aspect · Resolution · Frame rate · Background · Size · App settings / Cancel / Apply), so it is
      that dialog, not App settings. Presumably saves the canvas setup — ratio, resolution, fps,
      background — as a named preset you can start a project from. Ask what it should capture if it is
      not obvious when its turn comes.

      **DONE v8.08 — and it WAS obvious, so nothing was held up asking.** A preset here is the dialog's
      own contents: aspect, size, frame rate, background. Not the layers, not the duration, not the
      effects — the dialog you pointed at sets up an empty canvas, and a "preset" that quietly carried a
      copy of the project would be a different feature using the same word. Say so if you wanted the
      second thing and it is a separate, bigger job.
      **Two places, because saving one is pointless without somewhere to spend it.** Canvas settings
      saves it and lists your saved ones underneath (size and fps on each, × to delete); the **New
      project** screen shows them as chips under the name, which is the actual reason to keep a canvas
      setup — starting the next project from it.
      **Picking one writes the controls, not the project** — you still press Apply or Create, so a
      mis-tap is undone by Cancel like anything else in there. A preset whose named aspect no longer
      reproduces its saved pixels falls back to Custom on the exact saved size rather than quietly
      resizing it, and saving under a name you have used replaces it instead of leaving two rows you
      cannot tell apart.
      **The saved list is treated as hostile**, because it is text on disk you could edit: a width of 0,
      of 999999, a junk fps, a `javascript:` background and unparseable storage are all dropped or
      replaced rather than reaching a real project. Names go on screen as TEXT, never as HTML, and the
      test for that saves a name containing an `<img onerror>` and asserts nothing is created and
      nothing runs. Three tests, two mutations red, checked at 380px on both screens.
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

      **NOT REPRODUCED, 16 Aug — and the entry's own hypothesis looks right.** Driven the way you do it
      at 380×820: `startDraw('vector')`, three points, finish. Measured immediately after:
      | | |
      |---|---|
      | inspector panel | **281px of an 820px screen (34%)**, docked at the bottom |
      | canvas | **visible**, 312px |
      | timeline | **visible**, 440px |
      Your screenshot showed the nine cards at the top with roughly two thirds of the screen empty black
      below them, no canvas and no timeline. What is there now is the ordinary docked layout with the new
      shape selected on a visible canvas — the opposite picture.
      **Almost certainly fixed by v7.35**, exactly as this entry guessed: it said to check whether this
      and #165's "puts the screen to the bottom" come from the same place, and #165 point 1 was fixed by
      a single CSS rule in v7.35 (the same one as the "#97 update" band). Two symptoms, one rule.
      **Left OPEN rather than ticked**, because "I cannot reproduce it" is not the same as "it is fixed",
      and I do not have your exact route — you may have reached it from somewhere I did not. **If you
      finish a vector drawing and still land in a full-height panel, say so and it is live again**;
      otherwise it closes with v7.35.
- [x] **180 — Lots of effects don't work on text. ANSWERED v8.07** — the effects work, the layer is white; the app now says so.
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

      **DONE v8.07 — and the open question in this entry got ANSWERED by measuring rather than by
      asking you.** The entry said: *"Worth asking whether his own case was white text — if he saw it on
      COLOURED text there is still a real bug to find."* Measured 16 Aug on red and teal text: **every
      one of the seven works.** So there is no second defect hiding behind your report, and the
      arithmetic above is the whole story. That is the half that was blocking, and it is closed.

      **What shipped: the app saying so.** Same answer #31b's effects half got in v7.50, for the same
      reason — nothing is broken, the app was just silent about arithmetic you cannot see. A **toast
      when you add it** (the moment the confusion happens) and a **"does nothing here" tag on the
      inspector row** (for reopening the project next week and finding a Saturation sitting there doing
      nothing). Hover the tag for the reason: *"Saturation can't change this layer — it has no colour to
      work on. Give the layer a colour first."* The effect is still added — it is not wrong, your layer
      just has no colour yet, and deleting your choice for you would be the ruder half of being right.

      **It measures instead of hardcoding the arithmetic:** one pixel of the layer's own flat colour is
      run through the SHIPPED filter string, so the hint cannot drift from what the compositor really
      does and stays right if a default changes. It also asks the question the right way round — not
      "is white special" but "does adding this to what is already there change the pixel" — so a
      Saturation stacked ABOVE a Sepia is correctly left alone, while the same Saturation underneath it
      is flagged. And it makes **no claim it cannot prove**: blur and glow read neighbouring pixels, so
      one pixel cannot judge them; a video layer's pixels are unknown; a switched-off effect already has
      the eye to explain it. Five tests, four mutations red.

      *(A 380px screenshot caught what the DOM check missed: two tags on one row pushed the EYE button
      off the right edge, so you could not switch the effect off. One tag now — the dead hint wins,
      "always first" is trivia by comparison. The test asserts the eye, not the tag.)*

      **STILL YOUR CALL, and deliberately not done:** whether text should stop defaulting to WHITE.
      That is the one option here that changes existing projects — every text layer you have already
      made would render differently — so it is not something to decide on your behalf while you are
      asleep. Say the word and it is a small change. The warning above is useful either way.
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

- [x] **221 — Phone: the version number is on screen TWICE. NOT REPRODUCING — verified and locked down, v8.25.** Spotted by me at 380px while verifying
      v7.56, not reported by you — noting it rather than fixing it now, because it is not its turn and
      the queue is the queue. In the phone layout the build number appears both in the top bar next to
      the FreeMotion name and again as a small "v7.55"-style label just above the Export button. Almost
      certainly a leftover from **v7.52**, which moved the version-refresh control onto the transport
      row for the PC layout; the phone's own copy was presumably never hidden once the row gained one.
      Small, cosmetic, and the fix is likely one CSS rule — but two version labels disagreeing after a
      partial update is exactly the confusion the tap-to-force-update label exists to prevent.

      **CHECKED 16 Aug — it does not reproduce, so nothing was "fixed".** Measured at phone width on the
      home screen and in the editor: exactly ONE version label is visible. The desktop `#topbar` is
      `display: none` on a phone, which takes `.brand .ver` with it and leaves only `.m-ver`. Some later
      layout change closed it in passing — said plainly rather than shipping an invented fix for
      something that already works.
      **What shipped in v8.25 is the guard**, because this is exactly the kind of cosmetic bug a future
      layout change reintroduces with nothing watching: a test that counts every visible version label
      on a phone and requires exactly one. It asserts a CONTROL first — that at least one is visible —
      since "zero" would otherwise sail through an assertion aimed at "two" while actually meaning the
      tap-to-update control had disappeared.

- [x] **222 — A test in the suite is flaky, about 1 run in 5. DONE v7.99.** Found while working #128, and it is
      PRE-EXISTING — measured on a clean tree at HEAD, five runs, one red, so it is not something a
      recent change introduced. The assertion is `key/cold-actually-shrinks` in the `home-push` section:
      after a keyboard Enter, the cold lead animation is paused and scrubbed to 280ms of its 380ms and
      the card's scale is read. On a bad run the transform is still the identity matrix.
      **The diagnostic is captured, so this is a build not a hunt:** at the moment of failure the
      animation reports `dur=0.38s state=paused ct=280 name=fm-push-lead-cold`, and the card still
      carries `hm-in` — its entrance class. So the likeliest cause is that the lead animation has
      inherited an entrance DELAY and at ct=280 has not actually begun, which is exactly what
      `unstampIntro` exists to prevent and is intermittently not preventing.
      A test that is red one run in five is worse than no test: it trains you to re-run instead of read.

      **DONE v7.99, and the diagnostic captured in this entry is what solved it.** The lead animation had
      inherited an entrance DELAY — up to 0.82s — so at `ct=280` it had not begun, which is exactly the
      `state=paused ct=280` with `hm-in` still on the card that was recorded above.
      `unstampIntro` was being called correctly. **Removing the class is not enough on its own**, because
      `stampIntro` re-stamps every card in the grid whenever the list is re-entered — so a card that has
      already begun a push gets `hm-in`, and its delay, put straight back on. The element itself is the
      thing that must not be re-stamped, so it carries a flag now and `stampIntro` skips it.
      **Evidence, stated precisely: SIX consecutive clean runs plus an understood mechanism.** Six passes
      is still not proof against a 1-in-5 flake — about a 26% outcome on chance alone — so the reason to
      believe it is the diagnosis, not the count. If it returns, that is the assumption to re-check.
      **Both flaky tests are now closed** (#226 in v7.98, this in v7.99), which matters more than either
      alone: a suite that is red one run in five stops meaning anything, and it cost this session real
      doubt about a green result during a release.

- [ ] **223 — The splash video is 2.8 MB, about as much as the whole app's code.** Found while
      answering #145 with real numbers (`tests/_boot.html`): a cold boot pulls 6.30 MB, and 3.09 MB of
      that is images and video — almost all of it `splash.mp4`, which is decoration. The app's entire
      JavaScript is 2.82 MB, so the intro costs us more bytes than the editor does.
      It is cached by the service worker after the first visit, so this is a FIRST-RUN cost only — but
      first run on a phone on cellular is exactly the moment someone decides whether the app is any
      good. Options, cheapest first: re-encode it smaller (it is almost certainly nowhere near
      optimised), drop its resolution to what a phone actually shows, or load it lazily and let the
      poster image carry the first moment.
      **Not doing any of that unasked** — it is your intro and how it looks is your call, not a number
      I should quietly optimise away. Say which and it is quick.

- [x] **226 — A second flaky test: the microphone one. DONE v7.98.** *(Was numbered 224 by mistake — there were two
      #224s, and the other one is YOUR request, so it keeps the number and this one moved.)* Caught on 15 Aug while working #150 — the suite
      came back 350/351 with *"voice: the microphone is handed back on EVERY exit path — timed out
      waiting for the mic to be acquired"*, and two immediate re-runs were both fully green. Headless
      Chrome's fake microphone takes a variable time to come up, so the test's wait is racing it.
      Same family as **#222** (the `key/cold-actually-shrinks` flake, ~1 in 5). Two intermittent tests is
      the point at which a red run stops meaning anything, which is worse than having neither test — so
      they are worth fixing together: wait for the real signal rather than a timeout, or give the wait a
      budget that a slow acquisition cannot exceed.

      **DONE v7.98 — the first of the two options, "wait for the real signal".** A bigger timeout would
      have papered over it; the fix is a different KIND of waiting. `openMic()` now publishes its
      acquisition promise (`FM.voiceRec._micPending()`) and the test awaits that instead of polling for
      its side effects. A promise cannot be raced by a busy machine, and a genuinely dead mic still
      REJECTS rather than hanging — so this does not trade a flake for a freeze. The old poll stays as a
      fallback for a build without the hook, with a generous budget now it is not the primary path.
      **This one had already cost something real:** it went red during a release earlier in the same
      session and made a green run stop meaning anything for a minute, which is precisely the argument
      the entry makes against flaky tests.
      **#222 is still open** and is a different shape — an entrance-animation delay, diagnosed in its own
      entry — so a single green run is not yet fully trustworthy. One down, one to go.

- [x] **225 — Add subtle shading to the notes button. DONE v8.04.** (15 Aug.) His words: *"Add subtle shading to the
      notes button."* The notes icon got its yellow-page look in **#186 / v7.13** — white page, yellow
      edge, dark ruled lines — and this is the next pass on the same object: it currently reads flat.
      "Subtle" is the whole instruction, so this is a small amount of depth (a soft gradient down the
      page, a hint of a shadow under the sheet), not a skeuomorphic redraw, and it must still read at
      24px in the top bar on both layouts.

      **DONE v8.04** — a soft top-to-bottom gradient down the page so it reads as a lit sheet rather than
      a flat rectangle, plus one faint shadow line under the top edge where a real page catches its own
      curl. Both drawn INSIDE the existing page path, so the silhouette at 24px is byte-identical and the
      mark is unchanged; it has just stopped being flat.
      *Worth admitting: this sat undone for seventeen releases. It was the first thing logged this
      session, then your PC message jumped the queue with your permission and ran for hours, and I twice
      told you "everything is done except #244" — which was wrong. It surfaced from an integrity sweep of
      the tick marks rather than from memory, which is exactly why that sweep is worth doing.*

- [x] **227 — The project cards should stay see-through, but NOT show the film grain through them. DONE v7.76.**
      (15 Aug.) His words: *"the project layers are clear so you can see the film grain behind, i want
      them clear still but not showing the film grain, so they look smooth and nice."*
      Pairs with **#157**, where he also said the background grain *"looks shit"* — treat them as one job.
      The two asks pull against each other in the obvious implementation: `#hm-grain` is one full-screen
      field UNDER the cards, and the cards are translucent glass, so of course it shows through. Keeping
      the glass while losing the grain behind it means the grain has to be *knocked out* where a card is,
      not merely dimmed — a mask or a clip driven by the card rectangles, or the grain kept above the
      background but below the cards with each card carrying a backdrop of its own that the grain cannot
      reach. Whatever the route, the test is his sentence: still clear, and smooth.

      **DONE v7.76, and he had found a real hole in the theme rather than asked for a preference.**
      Every other glass surface in `theme-glass.css` — the settings panel, the add sheet, the export
      card, the context menu, the home top bar — pours its translucent tint over a **backdrop blur**.
      The project cards were written as "a gentler pour of the same material" and got the tint with **no
      blur at all**, so at 8.5%→3% alpha they were showing whatever sat behind them essentially raw.
      Since v7.71 what sits behind them is the grain. So the answer was not a mask or a knock-out: it
      was giving the card the one ingredient the recipe had skipped.
      **Blur is the right instrument, not a lucky one.** Grain is high-frequency noise by definition, so
      a blur destroys it while the low-frequency background — the base colour and the drifting light —
      passes straight through. The card stays genuinely see-through, which is the half of your sentence
      a solid backing would have thrown away, and what shows through it is smooth. 14px rather than the
      panels' 20, because too much blur turns the light behind a small surface into a blob.
      **Cost measured before shipping, since a backdrop-filter over an ANIMATING backdrop means a
      readback per grain frame per card:** with **eight cards** on screen, frame times are identical
      with the blur on and off — 16.7ms median, 18.6ms p95, both. That is this Mac, the usual caveat;
      the same theme already runs a full-width blur over this same background in `.hm-top`. Devices
      without backdrop-filter fall through to the `@supports` block that was already in the file.
      Both halves are tested, and both mutations — shrinking the tile back to 64px, and removing the
      blur — turn it red. The test builds its own card rather than needing the home screen open, and
      asserts the glass rules actually reached it first, so "no blur" cannot pass as "no rule".

- [ ] **228 — Drift and Orbit lose content at a frame edge, the way Wiggle used to.** (Found 15 Aug by
      `tests/_wigwin.html` while verifying #93 — not reported by you, but it is the same defect you DID
      report for wiggle in #93(b), sitting unfixed in two more effects.)
      Measured against ground truth (the same layer with no effect, genuinely moved by the same delta),
      a 60×60 layer half off the left edge: **drift is wrong over 1,519 pixels, mean error 6.38/255,
      worst 255**; orbit over 567. At the corner drift reaches 2,048 pixels. "Worst 255" means solid
      content against solid nothing — the effect is showing empty space where the layer should be.
      Cause is identical to wiggle's: they translate a COMP-SIZED plate, so whatever the layer had
      outside the frame was thrown away before the effect ever saw it, and sliding it back in reveals
      nothing. Wiggle got the expanded-plate fix in v7.32; these two were never touched.
      The cheap general fix is the one #93's entry describes and this probe now supports: a pure
      translation does not need MORE pixels, it needs the same plate taken from a window that has MOVED
      — set the plate's `__fmOX/__fmOY` before `drawLayer` and blit 1:1. One mechanism serves all three,
      and it is cheaper than the expanded plate as well as correct.

- [ ] **229 — PC: the buttons still are not where they should be, and he says the PC version is close to
      unusable.** (15 Aug.) His words: *"you still havent moved all the buttons on the pc version to
      where they should be, like the notepad button and all the different options when you have a layer
      selected, i know u gotta work from oldest to newest but you should focus on this because pc
      version is pretty un usable."*
      **He explicitly said to focus on this, so it JUMPS THE QUEUE** — that is the one exception the
      oldest-first rule has, and he even acknowledged the rule while overriding it.
      Two named things plus a general one:
      · **the notepad button — DONE v7.73, and he was exactly right.** #171 claimed it sat "to the cog's
        left"; measured at 1440×900 it was at x 1381 in the top header while the cog was at x 1257 in the
        transport row, 585px and a whole bar away. Cause: **v7.52 moved everything else down and left
        this one behind.** `pcTransportLayout` reparents `btn-back` → `#t-home`, delete/bind/group →
        `#t-sel`, and version-chip/cog/Export/view-options → `#t-far`; `btn-notes` was simply not in that
        last list, so it stayed in a 50px header whose only other contents are the wordmark and a
        project-name field the inspector header already duplicates. One missing name in one array.
        `#t-far` now reads v7.73 · notes · cog · Export · ⛶, which is the order #171 wrote down. The
        suite's Studio-layout test carries the list, so forgetting a button in the next migration is red
        rather than shipped; both mutations (drop it, or put it on the wrong side of the cog) caught it.
      · **"all the different options when you have a layer selected" — DONE v7.74**, as #169. The six
        small buttons in the multi-select panel are three big named ones filling the panel, and the
        trim/split trio by the playhead now acts on the whole selection instead of quietly editing one
        clip of the three. Read #169 for the detail and for the mutation that slipped past the first
        version of the test.
      · **"pretty un usable"** is the part that matters most and is not covered by either. Before
        rearranging anything, look at the whole PC layout with a selection live and find out what makes
        it unusable, rather than shipping the two named fixes and declaring it done.

      **MEASURED, and then he corrected my answer to it — both worth keeping.**
      At **1280×800 with a layer selected**, an entirely ordinary laptop: the canvas is **264×469, which
      is 24% of the stage**, with 730px of dead space either side of it, and **290px of the 800px window
      is chrome** (header 50 · transport 40 · timeline 240). The canvas is HEIGHT-limited — a 9:16 comp
      on a 16:9 screen — so only vertical space can ever help it. Of the three bands, the timeline is
      drag-resizable and the transport row is working controls; the 50px header was the only pure
      overhead, and after v7.73 its entire visible contents were a wordmark and a name field the
      inspector header already duplicates. Removing it measures **21% more canvas area** (290×515 against
      264×469) — the exact gain the Studio layout already takes, because Studio deleted that row at v7.52.
      **I started doing it and he said no:** *"no dont reclaim the top bar, i just want you to move the
      nescesary buttons to the bottoms one so its all there."* Reverted. **v7.75 does what he did ask
      for**: the name field — the last working control up there — moved down beside Back, so the whole
      chrome is one row and the header is a wordmark only. The field appears only when a layer is
      selected, because that is the case where it does something nothing else does (rename the layer);
      with nothing selected it was showing the project name a second time.
      **The 21% is written down here, not argued.** It is his layout, and the number will still be true
      whenever he wants it. One other route to the same space, which needs no layout change at all:
      **Studio, in the cog** — same canvas gain, inspector moves to a band under the stage.
      **What is still open in this entry:** whether anything else about PC is unusable. Two named things
      and the header are done, and the honest position is that I do not know what else he means. The
      remaining measured facts, none of them acted on: 730px of horizontal dead space around a portrait
      canvas (unavoidable for 9:16 unless the stage hosts panels), and the timeline's track heads at
      104px. **No horizontal overflow anywhere, and no unreachable or undersized controls** — so it is
      not broken, it is cramped. One sentence from him about what he was trying to DO when it felt
      unusable would aim the next pass.

### The PC layout message (15 Aug) — one message from him, split into jobs

*He sent all of this at once, with a screenshot of the PC editor at v7.76, and asked twice that it be
logged completely: "Please just make sure you correctly log everything I just said because this is a
massive text, and I just wanna make sure it all gets correctly logged, and you actually remember to do
it all." He also said **"finish whatever you're in the middle of and then move on to this"** and "I
kinda wanna see it done as soon as possible because it means a lot to me" — so this JUMPS THE QUEUE
once the in-flight item (#165's eraser, v7.78) is shipped.*
*And on how to work it: "try and make sure everything is good as you go, and don't rush anything, and
verify all looks good before you sign off on it. Maybe use other agents to verify… But also be careful
because often when you use other agents, they get stuck and go forever… make sure you don't wait on
them for too long and you give up on them after a certain period of time, and just keep going while you
wait for them to report back."*

- [x] **230 — PC chrome: the buttons should be bare icons, with the box only on hover. DONE v7.79.** His words, in
      order:
      · **Export** — *"instead of being this big massive button to be kind of like the others where it's
        just the icon with no button around it. And I want the coloring of it, though. Like, instead of
        it just be the white arrow line facing up, I want it to have, like, this… like, the blue colors
        and stuff so it stands out and looks noticeably different to the other stuff."* So: lose the
        filled accent pill and the word, keep it unmistakable by COLOURING THE ICON instead.
      · **Settings cog** — *"I don't know why you've turned it into that sort of button thing. I wish it
        was still just, like, the simple settings cog design where it's kind of just, like, a white
        outline like the others."*
      · **Notepad** — *"that also shouldn't have the box around it. It should just be the notepad
        button."*
      · **Back** — *"the back button shouldn't have that box around it. It should just be the back
        button, and you should just be able to press that."* (He likes where it is.)
      · **THE RULE THAT TIES THEM TOGETHER** — *"with the play button and all that, when you hover over
        it, it does show the box outline. But if you're not hovering over it, you don't show it. So I
        think it should be like that as well for the others where it has the box showing it around it so
        you can see the hit box radius. But that box around it should just be the same color as, like,
        when you hover over the play button and nothing else."* So: one hover treatment, taken from the
        play button, applied to every icon in the row; nothing carries a resting box.
      · **The refresh spin icon** — *"put the little refresh spin icon next to the version refresh
        button."*

      **All of it shipped in v7.79.** The play button's treatment is the rule for the whole row now, and
      back, notes, the cog, delete, parent and group all gave up their resting box. Export lost the pill
      and the word and keeps its job by being the one COLOURED mark in a row of white ones — accent blue
      with a soft glow. The version chip has its ↻. Scoped to `#transport` at desktop width, so `.btn`
      and `.icon-btn` are untouched everywhere else in the app.
      *(The red delete from **#232** shipped here too, since it is the same rule — the rest of #232, the
      re-ordering and the parenting icon, is still open.)*

- [x] **231 — PC: the layer-name field should REPLACE the project-name field, not pop up on the left. DONE v7.80.**
      His words: *"on the left side, for some reason, that layers text edit box pops up, and it's really
      messy. Instead, that layers text edit button that pops up should instead be replacing the projects
      text edit button. So then, like, when you click on a layer, it goes from showing the name of the
      project to showing the name of the layer, and you can then edit the layers name. I think that'd be
      a lot cleaner and make a lot more sense."*
      **DONE v7.80, and the pop-up turned out to be a compromise coming apart rather than a bug.** The
      field has always been dual-purpose — layer name when one is selected, project name otherwise — and
      the desktop had TWO of them, so #146 hid the top one in the case where it duplicated the inspector
      header and kept it in the case where it was the only layer renamer. Appearing and disappearing WAS
      the compromise.
      Now there is one field, the inspector header's: **"Inspector · Untitled"** with nothing selected,
      **"Layer · Yellow box"** with a layer selected, editable either way, and the label says which so it
      cannot change meaning on you silently. `#proj-name` stays in the DOM with its handlers wired (a
      project rename is still pushed through it so the phone copy cannot disagree) and is never shown on
      desktop. v7.75's version beside the Back button is reverted — that was the messy part.
      **I read your sentence as "one field, in the inspector, that swaps"** rather than "keep the
      transport-row field and make it always visible", because the second reading leaves the project name
      on screen twice whenever nothing is selected, which is the duplication #146 asked to end. Say if
      you meant the other one.
      The #146 test is rewritten rather than deleted, with your words in it so nobody reinstates the old
      shape by "fixing" the test, and it now writes THROUGH the field — showing the right value and
      writing to the right place are two different bugs, and the mutation that makes it always rename the
      project is caught by the second check, not the first.

- [x] **232 — PC: the delete and parenting buttons look bad, are in the wrong order, and the parenting
      icon is a twin of its neighbour. DONE — red delete and the hover-only box in v7.79, the rest in v7.81.** His words: *"the delete button, like the trash icon and the
      parenting button, those are in a good spot, but they just look shitty."*
      · Delete: *"it shouldn't have the box around it except for when you're hovering over it"* (same
        rule as #230) and *"the delete button should be, like, red by default. Like, it should just be a
        red icon. So it's, like, obvious."* — **both DONE in v7.79**, with #230, because they are the
        same rule. The rest of this entry is still open.
      · Order: *"instead of it being the first one to the right of the select layers button… it should be
        one over. So the one that's next to the select layers button should be the parenting button."*
        So the run becomes ⧉ layer-menu · parenting · delete.
      · *"the parenting button looks very similar to the select layers button. So I think you should
        change its design so it doesn't look the exact same."*
      · *"it still needs to be fixed where it doesn't have the outline, and it's just the white version
        of itself where it's just the white logo, and it doesn't have that weird box around it."*

      **DONE.** The cluster reads **⧉ layer menu · parent · delete** (Group last — it only shows at 2+
      selected, and third keeps delete exactly "one over" in both cases). The parenting icon is a
      **child-of tree** now — parent node, elbow down and across, child node. You were right that it was
      almost literally the same mark: the layer-menu button is a rounded square with a second one behind
      it, and parenting was a rounded square with a second one behind it; the only difference was a
      dashed stroke, which is invisible at 19px. The boxes and the red delete came in v7.79.
      The test compares the icon by SHAPE COUNTS — two rects and no paths is exactly the mark that was
      wrong — so putting the twin back goes red. Both mutations caught.

- [x] **233 — PC: the three-dot menu does not appear when a layer is selected. DONE v7.82.** His words: *"when you
      have a layer selected, it should show the three dot menu. That three dot menu doesn't show up at
      the moment, so there's no way to go into that and do all those settings, which is annoying."*
      This is a missing DOOR, not a style note — everything in that menu is currently unreachable on PC.

      **DONE v7.82, and you were right about the consequence.** Worth spelling out because there IS a
      menu button next to it: `#btn-layermenu` (⧉) is the **clipboard** menu — Select All, Group,
      Duplicate, Copy, Save Preset, Paste, Paste Style. The **full clip menu** — Lock, Onion skin, Reset
      transform, Flip H/V, Fit / Fill / Stretch to Composition Area, Create Clipping Mask, Convert to
      Outline, Media Info, the colour tag strip, **sixteen items** — was reachable on desktop only by
      RIGHT-CLICKING a clip, which nothing advertises. The phone has had a ⋯ for it all along.
      The new button opens `FM.layerMenuItems`, the same set the phone's ⋯ and the right-click open, so
      it is a second DOOR to one menu rather than a second menu to keep in sync — the mistake the old ⋯
      project menu made and was removed for in v6.13.
      The test's second assertion is the important one: a button that opened the WRONG menu would satisfy
      "there is a three-dot button" while leaving all sixteen settings just as unreachable. It checks for
      Lock / Onion skin / Reset transform and fails explicitly if it finds "Paste Style" instead — and
      the mutation that points it at the clipboard menu is caught by that, not by the first check.

- [x] **234 — PC: split sits ON the playhead, the two trims flank it, and all three move up a row. DONE v7.83.** His
      words: *"the buttons to split the layer or delete the layer all the way to the left or all the way
      to the right — those buttons aren't how I told you to change them. You probably forgot because I
      told you to do it, and you just logged it in your memory and didn't actually write it down."*
      *(He is right to be annoyed, and right about the cause. #169 recorded "trim-left immediately LEFT
      of the playhead, trim-right immediately RIGHT, split centred ON the playhead" — and what shipped in
      v5.25 put BOTH trims on the left with the split alone on the right, which is a different, earlier
      instruction. Nobody reconciled the two.)*
      What he wants now: *"the split button is hovering over the playhead. And then the two buttons to
      delete to the left or delete to the right, those two buttons should be on the left and right side
      of it. And they might need to be slightly moved up a bit so they're not going onto the top layer —
      just so they're on that top little row, right underneath the counter button, the button that tells
      you what time you're in the project."*

      **DONE v7.83.** It reads **trim-left · SPLIT · trim-right**, and the split is centred on the line
      *by construction* rather than by a tuned number: the container was already anchored to the playhead
      and centred with `translateX(-50%)`, so three equal buttons with equal gaps put the middle one on
      it. Measured: split centre 700 against a centreline centre of 701.
      **The move up was real too** — measured before the change, the group ran 686–710 against a ruler
      band ending at 705, so it genuinely hung 5px into the first track row. It runs 684–704 now, inside
      the band, under the counter. The split also takes the accent colour, because three near-identical
      outline buttons in a row need the middle one to say why it is the middle one.
      **You were right about the cause, but it was worse than forgetting.** v5.25 built this from an
      EARLIER instruction of yours — *"make sure the delete fully left and delete fully right are both on
      the left side and then the split is on the right side"* — and #169 later recorded the opposite.
      Both were written down. Neither was ever compared to the other, so the code kept the old shape
      while an open entry described the new one for weeks. That is the failure, not a lost note.
      Two mutations red: the old order, and the old vertical position — and the second fails at a **1px**
      overhang, which is the sensitivity this needed, since the whole complaint was five pixels.

- [x] **235 — PC: the move-to-playhead and extend-to-playhead buttons are indistinguishable, and badly
      placed.** His words: *"the two buttons when you have a layer selected that are basically to make
      the clip either extend out to the playhead or jump to the playhead — those two buttons are very
      similar. I think you should make some differentiation in them, like, so they look a bit different
      because right now, honestly, at first glance, I cannot tell a fucking difference. And they need to
      be moved up slightly as well. And also aligned a bit better, because one is closer to the playhead
      than the other, and it just looks weird. They just need a little bit better positioning."*
      *(Worth knowing when doing this: the two icons differ only by whether the box is closed or open at
      one end — a distinction of about four pixels at that size. See timeline.js syncNudge.)*

      **DONE v7.84, and all three complaints measured true.** The icons now differ by FILL versus
      OUTLINE, which is the strongest cue at 15px: MOVE is a solid block with a double chevron (the clip
      travels), EXTEND is an outlined block with a dashed span and one arrow (the edge is pulled out, and
      the dashes are the new material). **Alignment was 14px left against 12px right**, and the cause was
      worth finding rather than nudging: `#tl-centerline` is 2px wide drawn from its left edge, so its
      optical centre is x+1 while `translateX(-50%)` centres the row on x. A +1px correction on both
      flanking groups makes it 13/13 — and puts v7.83's split button dead on the line too (0px off, was
      1). **And the move up was real**: 686–710 against a ruler band ending at 705, so it hung 5px into
      the first track row; 684–704 now.

- [x] **236 — PC: the add menu needs a background of its own. DONE v7.85.** His words: *"on the PC version, for the
      background of the add menu, you should make it have, like, a cool pattern and design, kind of like
      the home screen page, but slightly different just so it looks good for that specific area."*

      **DONE v7.85.** Same family as home, deliberately not the same picture: home lights from the TOP
      CENTRE with a pool bottom-right, so this lights from the BOTTOM LEFT with its pool top-right and a
      diagonal sheen. Two things came out of it worth more than the gradient itself:
      · The version I nearly shipped had 9px of padding and a border, and that **gave the inspector an
        8px scrollbar it did not have before**. A decoration must not move the layout. Putting the
        padding back as a mutation turned TWO tests red, one of them pre-existing — which is as clear a
        confirmation as you get that it was a real regression.
      · **No grain, on purpose.** The plan was to reuse home's noise tile rather than generate a second
        136 KB one, but that variable is only set by home's own render, so on this screen it is very
        often unset and the field would simply not be there. A decoration that appears or not depending
        on which way you arrived is worse than one that does not exist.

- [x] **237 — PC: the pull-down slam Easter egg breaks the screen. DONE v7.87 — same cause as #239.** His words: *"on PC, when you do the
      Easter egg where you pull down and then it slams back up in the home menu, it kinda breaks the
      screen when you do it. Might need to fix that a bit. It kinda looks a bit tacky."*

- [x] **238 — PC: after over-pulling, it freezes before snapping back. DONE v7.86.** His words: *"when you do it and
      you swipe down too far on PC, it takes a bit too long before it snaps back up. It would be nice if
      when you kept swiping up, it was a bit of a smooth animation and didn't just freeze for a second
      before going back up."*

      **DONE v7.86, and the freeze had a specific cause: a 130ms debounce.** A trackpad has no
      `pointerup`, so the wheel path waited for a GAP in the events to decide your gesture had ended —
      which is why the list sat at full stretch, visibly stuck, until you lifted your fingers. The touch
      path never had it, because a finger release is a real event. Crossing the threshold IS the
      commitment, so the slam goes then: measured, **105ms into a flick that runs 366ms**.
      **The guard against re-slamming is where the real work was, and the suite is what got it right.**
      One flick is dozens of wheel events, so firing on threshold without a guard slams two or three
      times per gesture. My first guard was a fixed 520ms timer; it looked perfect in the browser and
      **the test caught it firing twice** — a flick that outlasts the timer re-crosses the threshold, and
      flick length depends on the machine. It is now spent-until-the-gesture-ends, re-arming on the same
      130ms silence the release path already uses, so one gesture is exactly one slam at any speed.

- [x] **239 — The black bar is STILL there, and it happens during the slam. DONE v7.87 — and it was the slam's OWN ring.** His words: *"the black bar
      glitch where the black bar comes up onto the side of the screen still happens, and it seems to
      happen when you, like, do the easter egg thing where you're slamming the screen and stuff."*
      **This is the lead the earlier black-bar entries never had** — see #187 and the queue-154 work,
      which chased it as a paint/background problem and fixed three real ones without closing it. "It
      happens when you slam" is a reproduction step, and the slam is exactly the moment the screen is
      TRANSFORMED (translate + rotate) with a 140px box-shadow ring standing in for the surround. Start
      there rather than re-reading the background rules.

      **FOUND, and it was the ring itself.** Not something showing through from behind — the fix for a
      DIFFERENT bug, gone stale. #144 gave the slam a `box-shadow: 0 0 0 140px var(--bg)` so the shake
      could not reveal the editor behind home. At the time home was a FLAT surface, so a flat ring
      matched it exactly and that fix was right. Home is not flat any more: it carries the drifting light
      on its own pseudo-elements and, since v7.76, a grain field. The ring stayed flat. So every slam
      painted a band of dead `#060c0f` hard against a lit, textured surface — a black bar, at the edge,
      during the slam, exactly as you said.
      **Your "it happens when you do the easter egg" is what cracked it** after three passes chased it as
      a paint problem behind the page.
      A box-shadow cannot carry a gradient, so the ring is gone and the shake runs with a **6% scale**
      that tapers back to 1: home's own surface fills the edges and nothing behind it can appear, which
      is the same guarantee without a second surface to keep in step. The overscan is arithmetic and my
      first attempt was wrong — 1.03 gives 13.2px against a 13px travel, 0.2px of margin before the twist
      takes ~8px at the corners; 1.06 gives 26px against a worst case near 21.
      **Verified** by painting the editor bright red and sampling home's box 24 times across the whole
      420ms: largest uncovered edge **0px**.

- [x] **240 — PC: the export button's border is too big and crosses the divider line. DONE v7.84.** (15 Aug, with a
      screenshot at v7.83.) His words: *"The export buttons border is too big so it goes over the divider
      line, make it fit abit better."*
      A regression from **v7.79**, which turned Export from a filled pill into a bare icon (queue 230) —
      the box it draws is taller than the transport row, so it laps over the rule between the row and the
      timeline. Visible in his shot as a lit rounded rect around the blue arrow, standing proud of every
      other icon on the row.

- [x] **241 — The cog should spin when you click it, and on PC the canvas-settings panel should come OUT
      of the cog rather than open in the middle. DONE — (a) v7.88, (b) and (c) v7.93.** (15 Aug, with a traced screenshot.) His words: *"Make
      the cog do a little turn animation when you click it and on pc make the canvas settings row show up
      next to where the button is instead of the middle and make it kinda of come out of the button like
      how ive traced in the image, so the settings button wouldnt be blured like everything else."*
      Three parts: (a) a short rotation on the cog when pressed; (b) on desktop the panel anchors to the
      cog — top-right, under it — instead of being centred on screen; (c) it should read as GROWING from
      the button, and the cog must stay sharp while the rest of the screen is blurred behind the panel,
      i.e. the cog sits above the backdrop layer rather than under it. His trace runs from the cog down
      and around the area the panel should occupy.

      **(a) DONE v7.88** — a quarter turn over 280ms, eased out. A quarter rather than a full rotation
      because a cog has radial symmetry, so 90° reads as complete in half the time. The restart is done
      by hand (remove class → reflow → add) because a class that is already present will not replay its
      animation, and without that a second press does nothing.
      **(b) and (c) DONE v7.93.** The card hangs from directly under the cog, right-aligned to it, and
      grows from that corner in 160ms instead of fading in the middle of the screen. The cog is lifted
      above the scrim so it stays sharp while everything else blurs — and only the cog, because lifting
      the whole row would put the transport controls over a modal meant to own the screen.
      It anchors to **whichever control was actually pressed**, not to `#btn-settings` by name: on desktop
      the cog forwards its click here, on the phone this dialog has other doors, and that is correct in
      both cases with no special-casing. The coordinates go out as CSS variables because the cog's
      position is only knowable at runtime — its x moves with the layout, its y with the timeline drag.
      *The test found a bug in itself and it is worth knowing: the cog is dual-purpose, so with home up
      it opens App settings instead, and the scrim it left behind failed an unrelated test several cases
      later. It closes home first and cleans up after itself now.*
      **The note below stays because it is still true and still the trap:** inside a project the
      cog does NOT open App settings: `#btn-settings`'s handler forwards the click to `#btn-canvas`
      (js/app.js, the `if (inProject && cv) { cv.click(); return; }` line). So the panel you are
      describing is the **Canvas settings dialog**, not the `.set-panel` left drawer the same cog opens
      from the home screen. Anchoring the wrong one would look like nothing changed.
      They were left out of v7.88 on purpose: re-anchoring a dialog to its button and lifting that button
      out of the dialog's own backdrop blur is a layout change, and it deserves a clean run rather than
      being tacked onto a 280ms flourish.

      **REOPENED AND FIXED 16 Aug (v8.10) — two of the three clauses were NOT working for him**, and
      this entry was ticked anyway. His words: *"you didnt even give the settings cog an animation like
      i asked and left it blury. like what i said was so simple to understand and you somehow missed
      it. maybe start logging my requests by copying exactly what i said because how do you leave all
      this out"*. Fair. His original request had three clauses and only the anchoring half really
      landed.
      **It was one cause, not two.** The animation had been running since v7.88 — underneath the blur
      scrim, where he could not see it. `#t-far` (the far-right cluster the PC row puts the cog in)
      had `transform: translateY(-50%)` just to centre itself, and **a transform creates a stacking
      context**, so the cog's `z-index: 101` was trapped inside it and could never clear the dialog.
      Measured: computed z-index 101 as designed, `elementFromPoint` over the cog returning
      `#canvas-dialog`. Covered, blurred, unclickable. Centring is now `top: 0; bottom: 0` + flex —
      identical result, no transform, no stacking context.
      **Why the test did not catch it, which is the part worth keeping:** it compared the two z-index
      NUMBERS, and 101 > 100 was true the whole time. That assertion is structurally blind to the only
      way this breaks. It now asserts what is actually painted over the cog, that only the cog is
      lifted, and that no ancestor creates a stacking context.
      **Still open from this message: #252** — the panel should open UPWARD into the empty space he
      traced and fit without scrolling.

- [x] **242 — The three layer buttons need a different background so they read as a group apart. DONE v7.89.** (15
      Aug, with the trio circled in red.) His words: *"make these three buttons have a different
      background to signify their difference."* The three are the SELECTION-dependent controls in the
      transport row — parenting, delete, and the new ⋯ layer menu (#t-sel) — which appear only when a
      layer is selected and sit between the always-there transport controls and the right-hand cluster.
      So: a shared background treatment behind those three, marking them as the set that belongs to the
      current selection rather than to the project.
      *Note: v7.79 (#230) deliberately stripped the resting box off every button in this row on his own
      instruction. This is not a reversal of that — it is a background behind the GROUP, not a box on
      each button — and it needs to keep the hover behaviour he asked for.*

      **DONE v7.89, built exactly that way.** One quiet pill behind all three; every button inside stays
      bare and keeps the hover box you asked for in #230. The test asserts BOTH halves, so a future
      version that reaches for per-button backgrounds goes red.
      **One thing that needed measuring rather than looking at:** hidden children still leave their
      wrapper's padding and background behind, so with nothing selected there was an empty lit pill
      sitting in the row — only 10px wide, easy to miss by eye. The wrapper is now marked in step with
      its buttons, and the empty case is asserted. Both mutations red.

- [x] **243 — Adding a benchmark does not turn the timer yellow until you leave and come back. DONE v7.94.** (15
      Aug.) His words: *"when you add a benchmark it doesnt show up as yellow, youve made it so if you
      add a bench mark, go away from it then go back itll show the timer as yellow but it should also
      show up straight away."*
      The timecode chip goes yellow when the playhead is PARKED ON a benchmark — that part works, and it
      is what he sees when he scrubs back onto one. What is missing is the same thing happening at the
      moment of CREATION: you are already standing on the benchmark you just made, so the chip should be
      yellow the instant it exists, with no round trip.
      Almost certainly the readout is only re-derived on a scrub/transport update and not on the marker
      being added, so the state is correct and simply not recomputed. Look at `updateReadout` and
      whatever adds a marker, rather than at the parked-detection itself — that is demonstrably fine.

      **That guess was right, and you had already diagnosed it in your own sentence.** `on-mark` is
      decided inside `updateReadout`, which runs on TIME changes — and adding a benchmark does not change
      the time, it changes the MARKERS. The state was never wrong, it was never looked at again; you were
      already standing on the thing that should have lit. Fixed on all three marker paths: the benchmark
      toggle, the thumbnail-frame pin, and the timeline's own "Add marker here" (a different module with
      the identical omission — `FM.updateReadout` is exported for it).
      The test **never moves the playhead**, on purpose: moving it is the bug's own workaround and would
      hide the defect. It also checks the reverse — removing a benchmark puts the chip out without a
      scrub — because the same staleness the other way round is just as wrong.

- [ ] **244 — PC: drag the add menu independently of the timeline, with a snap where they meet.** (15
      Aug. *He asked for this one to go to the BOTTOM: "This can go to the bottom of the list as you have
      a lot of things to work on still, remember ur doing oldest first."*) His words:
      *"Make it so you can seperatly drag up and down the add menu, on pc, but you cant drag lower than
      what the timeline is dragged too, if you start dragging it back down and hit the level of the
      timeline it should pause and snap for a second, showing a little blue flash that looks nice in the
      line that seperates the timeline inspector from the canvas. And then if you keep dragging down it
      drags the timeline down with it. Also dragging the timeline brings the add menu with it unless they
      arent connected, until you reach to where the add menu is at then it will do the same thing but the
      other way around by snapping them back together. and also when dragging the add menu seperatly it
      shouldnt push the canvas to be smaller but just go over the canvas."*
      So, precisely: the add menu gets its own drag handle; it may not go BELOW the timeline's top; coming
      back down onto that line it **pauses, snaps, and flashes the divider blue**; pushing further takes
      the timeline down with it. In the other direction the timeline carries the add menu until they meet
      and re-couple with the same snap. While dragged independently the add menu **overlays** the canvas
      rather than shrinking it.
      **And the reason he wants it, which shapes the design:** *"this will be good for later because im
      planning on changing how the effects menu works, by making it just appear in the add menu, and also
      the effects menu will just have the ability to preview what an effect will look like without adding
      it yet, by hovering ur curser over it. On mobile the effects menu will probably just take up all
      the space on screen except for the canvas so you can preview."* So the add menu is going to become
      a tall, resizable browser that must never cover the canvas — build the drag with that in mind.
      *"Feel free to do a demo of this when you get to it as well."*

      **DESIGN, written 16 Aug against the real code — not started, and deliberately so.** This is five
      behaviours in one (independent drag, a floor, a snap-and-flash, coupled dragging both directions,
      overlay-not-shrink) and it is groundwork for the effects browser, so it wants a clean run rather
      than the tail end of a long session. What follows is the research done, so the next session builds
      instead of reading.
      · **Mirror `#tl-resizer`** (js/app.js, the `pointerdown`/`pointermove`/`end` trio around line 3120).
        It is the right shape already: a handle, a clamp function, a CSS variable, and the height
        persisted to `localStorage` under `fm_tl_h`. Copy the structure, not the code — a second
        `--tl-h` writer would be a disaster.
      · **The timeline's height is `--tl-h` on `<html>`,** clamped by `FM.clampTimelineH` (exposed for
        the suite). The add menu should get its own `--am-h` on the same element, with its own clamp and
        its own stored key.
      · **"Cannot go lower than the timeline" is a clamp, not a collision test.** In the Studio layout —
        which is the one he uses, and the one where this request makes sense — the inspector band and the
        timeline are side by side under the stage, so the add menu's floor is simply the current `--tl-h`.
        Read it, do not re-measure the DOM: one source of truth.
      · **The snap-and-flash** is the interesting bit and the one to get right. Coming DOWN, when the
        dragged height reaches `--tl-h`, hold it there for a beat (ignore further movement until the
        pointer has travelled a threshold past it — the same "sticky" idea `snapCursor` in draw-tool.js
        already uses, ~9px converted to the gesture's units) and flash the divider. The divider is the
        border between the bottom band and the stage; a short accent-coloured animation on it, off under
        `prefers-reduced-motion`.
      · **Coupled dragging** falls out if the floor is `--tl-h`: past the sticky threshold, keep the add
        menu pinned to the floor and write `--tl-h` instead, so the timeline follows. The reverse
        (dragging the timeline up into the add menu) is the same rule with the roles swapped, and they
        re-couple with the same flash.
      · **Overlay, not shrink.** The band currently sizes the stage through the grid. For the add menu to
        pass over the canvas it has to leave the grid while dragged — `position: absolute` against the
        app, with the grid row frozen at its undragged height — otherwise every drag reflows the canvas,
        which is exactly what he does not want and is also the expensive path.
      · **His demo request stands**, and a probe page (`tests/_amdrag.html`) would be the honest way to
        show it: the gesture is hard to judge from a screenshot.

      **MEASURED 16 Aug — and it corrects the design above in one important way.** In the Studio layout
      (the one he uses) the add menu and the timeline are **not two things that can have different
      heights**. They are side by side in the SAME grid row:
      | | |
      |---|---|
      | `#app` grid rows | `616px 264px` — two rows, not three |
      | inspector panel | top 616, height 264 |
      | timeline panel | top 616, height 264 |
      | difference | **0px in both top and height** |
      So "drag the add menu up while the timeline stays put" is impossible *within the grid* — they are
      one row, and its height is `--tl-h`. Raising one raises both.
      **This makes his "it shouldn't push the canvas to be smaller but just go over the canvas" a
      STRUCTURAL REQUIREMENT rather than a preference**, which is worth knowing before anyone tries to
      honour it as a nicety: the add menu can only be taller than the timeline by leaving the grid
      altogether and floating above the stage. The design note above guessed at that for performance
      reasons; the real reason is that there is no other way for it to work at all.
      **Practical consequence for the build:** the drag does not resize a grid row. It takes the panel
      out of flow (absolute against `#app`, its grid slot left holding the undragged height so nothing
      reflows), sizes it upward from the band's top edge, and only writes `--tl-h` in the coupled case
      once it has been pushed back down onto the timeline. The floor is still `--tl-h`; what changes is
      that the menu above that floor is a floating surface, not a taller row.

- [x] **245 — Home: the tab buttons should be clear-but-grain-free like the cards, and the grain itself
      looks dead. DONE v7.95.** (15 Aug.) His words: *"In the home menu I also want all of the buttons like the one
      to open up all your projects or elements or tutorials. Those buttons should also be clear but not
      show the film grain. Also the film grain is seemingly still and not moving. It looks kind of cheap.
      It would be nice if it was just subtle and just smoothly moving in the background so it doesn't
      look shit — it's okay to just have it fast moving like actual film grain on the TV. Maybe this is
      up to you but maybe it shouldn't be film grain and it should just be some sort of texture that
      makes it look rough and like quality, I don't know what it would be but maybe there's a better
      option, think about it."*
      **(a) The tab buttons** — Projects / Templates / Elements / Tutorials, and the search/Select/cog
      pills with them. Same fix the CARDS got in #227: they are glass with no backdrop blur, so the field
      behind them comes through raw. One rule, the same one.
      **(b) The grain looking still is a REGRESSION I introduced in v7.76, and the cause is arithmetic.**
      Before that there were **six** tiles and the field cross-faded between randomly chosen pairs. v7.76
      cut it to **two** — correctly, for the card case, since the cards had stopped using them — and two
      tiles cross-fading can only ever go A→B→A→B. After the first second your eye has learned both
      patterns and the whole thing reads as one static field breathing, which is exactly "seemingly still
      and not moving… looks kind of cheap". More tiles, or a moving field, or something other than tiles.
      **(c) He is explicitly inviting a rethink of the whole texture**, and it is worth taking: a tiled
      noise PNG is the reason this keeps needing tuning (76 → 94 → 105 → 133 → 157 → 245). Options to
      weigh before building: more tiles cycled in a longer non-repeating order (cheapest, keeps
      everything else); a real per-frame re-roll on a small canvas (true TV static, costs a repaint);
      or a non-noise texture — a fine woven/brushed field, or a very low-contrast diagonal weave — which
      would read as "rough and quality" without pretending to be film. **His own steer: fast is fine.**

      **DONE v7.95, and it took the cheapest of the three options because it turned out to cost nothing.**
      (a) The tabs and the search / Select / cog pills get the cards' backdrop blur — same hole, same fix,
      12px rather than 14 because they are small.
      (b) The tiles are RANDOM noise, so sliding one by a non-repeating offset produces a visually
      unrelated field. Stepping through six offsets on each layer turns two images into **twelve apparent
      frames**, for zero extra bytes — no third tile, no per-frame canvas. `steps()` not a smooth slide,
      because v6.62 removed a smooth drift for reading as fabric moving past a window, and the app's own
      filmgrain effect re-rolls per frame for the same reason. The two layers run at different rates so
      they cannot fall into step and re-create the A→B flicker.
      **So (c) — replacing noise with some other texture — is NOT done, and is left open on purpose.**
      If it still looks cheap to you now that it genuinely moves, that is the conversation to have, and
      the options above still stand. This release fixed the thing that was measurably broken.

- [x] **246 — PC: the add-menu background must reach the menu's borders. DONE v7.96.** (15 Aug.) His words: *"the
      background you added behind everything on the add menu on pc looks whack, it needs to fully go to
      the borders on that menu."*
      A fault in **v7.85** (#236). The gradient went on `.addmenu--panel`, which is only the CONTENT box
      — measured 307×210 inside an inspector panel far taller than that — so it reads as a floating
      rectangle of light sitting inside the menu instead of as the menu's surface. It needs to be on the
      region that actually has the borders (`#inspector-panel` / `#inspector` while the add menu is up),
      edge to edge. **Do not simply pad the panel to fill** — v7.85 already learned that: 9px of padding
      there gave the inspector a scrollbar it did not have, and two tests catch it.

      **DONE v7.96.** The paint is on the bordered region now: measured after, the painted surface is the
      whole 264px panel against a 210px content box, so 54px that used to be bare panel is part of the
      material and the gradient ends where the border is. Anchored with `:has(.addmenu--panel)` rather
      than a body class — the add menu shows when nothing is selected and there is no marker for that
      state, so a class would be a second writer for something the DOM already says plainly. No padding,
      per the warning above.
      **The test had to be RE-ANCHORED, not just re-run**, and that is the lesson worth keeping: it
      measured the gradient on the CONTENT box, so it would have gone on passing while your complaint was
      fully present — a gradient on the inner box satisfies "there is a gradient" and looks exactly like
      the thing you reported.

- [x] **247 — Opening the export menu should pause playback. DONE v7.97.** (15 Aug.) His words: *"when you open the
      export menu playback should pause."* Straightforward: the export dialog opening is a hard stop for
      the transport. Worth checking the same for the other full-screen doors while in there (settings,
      canvas settings) and saying which ones already do it, rather than fixing one and leaving siblings
      inconsistent.

      **DONE v7.97.** The pause happens BEFORE the notepad confirm, which is itself a modal — running the
      transport through that would keep the same problem behind one more sheet — and it is guarded on
      `FM.playing`, because every `FM.pause()` invalidates an in-flight `requestPlay` and firing that for
      an already-stopped transport is how "I pressed play and nothing happened" gets born.
      **I measured the siblings as the note asked, with real playback running:**
      | door | pauses playback? |
      |---|---|
      | Export dialog | **yes, from v7.97** |
      | Canvas settings | no |
      | App settings | no |
      **Neither of the other two is changed, on purpose — it is a judgement call and it is yours.** There
      is an argument each way: Canvas settings changes resolution and fps live, so pausing is arguably
      right; App settings is appearance, and stopping playback to toggle a theme would be irritating.
      **One word and either or both get the same treatment.**
