# Judge: fit to Ezra

Step 2 of `STATUS.md` (judge panel). Lens: **fit to Ezra.** That means his brief clause by clause, `research/his-prefs.md`,
simplicity for someone who has never edited, speed for someone who has, phone and PC working the same, how it feels, and
whether he will understand it and like it. Written 29 Sep 2026 against HEAD `2d06a3f5` plus the working tree. Design
review only. Nothing in the repo was changed except this file.

I read all three designs in full: `design-model.md` (1,112 lines), `design-ux.md` (941) and `design-collab.md` (939).
I also read the brief (INBOX.md:28), STATUS.md, all of `his-prefs.md`, and the parts of `capcut-mobile.md` and `fm-ui.md`
that the designs rely on. I checked five code facts myself; they are marked **[checked]**.

---

## 0. The verdict in ten lines

1. **All three agree on the thing that matters most to him.** There is one project and two editors, a switch that
   converts nothing, things that follow their clip, captions that stay in sync, and a Full editor that keeps every
   option. None of them repeats the Rush→Premiere mistake.
2. **Ranking under this lens: UX first (8.6), Model second (7.4), Collab third (6.8).**
3. **Winning core architecture: Model option F, which is also UX's shape.** `start` stays the stored truth. One flag
   marks a main clip. Magnetism lives only in the simple editor's commands. That leaves the Full editor exactly as he
   knows it (#966, "anything anywhere"). It lets the first visible release come early. It is the Resolve precedent.
4. **Collab's derived-start model loses on this lens, not on engineering.** It changes how main-track clips behave
   inside **Full**: they push, they swap when dragged past a neighbour's middle, and gestures can no longer write
   `start` (design-collab §3.5-3.6). It also puts an invisible protocol change first (§15, Phase 0).
5. **Graft from Collab:** keyframes that travel clip-relative on the wire (§3.3). That idea stands on its own. It
   removes the one collab bug both other designs admit to (a keyframe edit landing just after a ripple), and it fixes a
   Full↔Full race that exists today. Also graft "keep my frame" (§10.5).
6. **Graft from Model:** show any project in Quick immediately with a worked-out main track, and write nothing until the
   first Quick edit (§5.2-5.3). Also graft its pre-flight lease check, so Quick can edit in a live session from the
   first release.
7. **Graft from UX:** almost the whole surface. Two toolbar rows, so project tools never vanish. The same A/S/D keys as
   Full, plus E to switch. The vertical-only morph. The plainest words ("Stay put", "Take sound out", no button called
   "Edit"). A visible Phase 1.
8. **A code fact two designs get wrong [checked]:** the stage's top-left corner is already taken. The collab people chip
   sits there on both layouts (`styles.css:10470-10471`, "the stage's top-left corner, on both layouts"). On the phone
   the red LIVE pill sits right beside it (`styles.css:10694-10695`, `top: 9px; left: 42px`). Model's and Collab's
   switch pill lands on top of both.
9. **What none of them includes:** the talk-to-it Assistant as a simple-mode door (#856, `js/ai-chat.js`). It is his own
   "CapCut one where you can just talk to her", and it is the most natural easy path in the app. Also missing: a check
   that the switch fits the 380 px transport row, and a written answer to "what does a beginner see first".
10. **Tell him in one line:** "Any project opens in either editor, nothing converts, clips stick together in Quick, and
    you and a friend can each use a different one at the same time." All three designs support that sentence. UX makes
    it feel the best.

---

## 1. The criteria

| # | Criterion | What a 10 looks like |
|---|---|---|
| C1 | **Brief coverage** | Every clause of INBOX.md:28 has an answer. The clauses: quick switch; how a project starts; can a project be turned and turned back; collab across modes "at the same time and not interfere"; clip after clip with overlays/effects/text in their own sections; captions; CapCut as the ceiling; phone = PC; visualizers and a code plan |
| C2 | **A non-editor can figure it out** | an obvious start (#326), nothing to learn before the first cut, no dead ends, no jargon |
| C3 | **Fast for someone experienced** | keys, few taps, no relearning between editors, nothing slows a pro |
| C4 | **Phone and PC work the same** | same names, same order, same model; laid out for each screen (#852); PC not behind (#229, #978) |
| C5 | **How it feels** | the switch is instant and animated cleanly (#373, #612), nothing jumps, continuity, "Make it actually feel good" |
| C6 | **His words and his way of deciding** | plain words (#484), don't overexplain (#294), one word = one meaning (#454), options as pictures with one recommended (#395), no company names, identity rule |
| C7 | **Full stays his** | the complex side keeps every option and behaves as today (#966) |
| C8 | **Collab as he would experience it** | two people, two editors, live, and neither gets in the other's way; surprises are rare and explained in one line |
| C9 | **He can see progress** | an early release he can hold on his phone ("I want to feel and see progress", 20 Sep) |
| C10 | **He will understand and like it** | the idea fits in one sentence he could repeat; the decision list is short and answerable with "do recommended" |

---

## 2. Scores

| | Model | UX | Collab |
|---|---|---|---|
| C1 Brief coverage | 8 | 7 | 9 |
| C2 Non-editor | 8 | 9 | 7 |
| C3 Experienced | 6 | 9 | 7 |
| C4 Phone = PC | 8 | 9 | 8 |
| C5 Feel | 7 | 10 | 7 |
| C6 His words / deciding | 7 | 9 | 7 |
| C7 Full stays his | 9 | 9 | 4 |
| C8 Collab as experienced | 7 | 6 | 9 |
| C9 Visible progress | 5 | 9 | 4 |
| C10 Understands and likes | 9 | 9 | 6 |
| **Mean** | **7.4** | **8.6** | **6.8** |

Why each score sits where it does is in §3-§5. Where a score rests on a code fact, the fact is cited.

---

## 3. design-model.md (Quick / Full, `FM.spine`)

### Scores explained
- **C1 8.** Every clause has an answer. His conversion question gets the best one-line answer of the three: "**there is
  nothing to turn.**" (§5.5). Collab is covered, but the leftover races show up as seam chips (§10.4).
- **C2 8.** Any project opens in Quick with **no button to press**. A pure classifier works out the main track, and
  nothing is written until the first Quick edit (§5.2-5.3). A new Quick project goes straight to the picker (§7). Lost
  points: the toolbar swaps to the item's tools when something is selected, which is CapCut's trap. A fixed "‹ Done"
  softens it (§8.2) but does not remove it.
- **C3 6.** Quick gets Premiere-style Q/W for trims, and "the Full editor's own keys … A/S/D … are off in Quick"
  (§8.3). Today A/S/D are Full's trim/split/trim keys (`js/app.js:8809-8814` **[checked]**). Someone who knows Full would
  have to learn different letters for the same three actions in Quick. That breaks the spirit of "you don't have to
  learn both", applied to the two editors.
- **C4 8.** Same buttons, same order, same names. The toolbar is a strip on the phone and a column on the PC (§8.3).
- **C5 7.** A FLIP morph of about 280 ms, plus the #974 random pool (§6). It is solid but thinly specified. The pill
  placement is wrong (see flaws).
- **C6 7.** The ≤ 34-character label rule is carried over (`js/timeline.js:2795`, §7). The brand guard is widened
  (§14.2). But the toolbar reads **Clips · Text · Captions · Overlay · Audio · Effects · Filters · Ratio · Background**
  (§8.2), which is CapCut's own set almost word for word. It also has a "Follows clip" toggle, "Tidy main track", and
  a "block" concept a beginner will not understand.
- **C7 9.** Full is untouched apart from optional badges and four layer-menu items (§9.4, §4.4).
- **C8 7.** A pre-flight check refuses a whole Quick command, naming the person, if any layer it would touch is leased
  or held (§10.3). What gets past that shows as a gap chip with a one-tap fix (§10.4). Honest and safe. But a
  beginner who sees "1.2s gap" appear because a friend edited at the same moment will not know why.
- **C9 5.** Phases 0-1 are invisible. The first thing he can hold is Phase 2, and only behind Settings → Labs (§15). The
  recommended D10 is "Start with the invisible parts".
- **C10 9.** The core sentence is short and true. The decision table (§17) is clean: ten rows, one recommended in each,
  written in plain words.

### Best ideas to graft
1. **Open any project in Quick with the main track already worked out, and write nothing until the first Quick edit.**
   The adoption happens in that edit's own undo step (§5.3). No banner, no "make a main track" button. For "someone who
   doesn't even know how to edit", this beats UX's banner.
2. **Pre-flight blockers** (§3.6, §10.3). Refuse the whole command with "Sam is editing 'Title'. Try again in a
   moment." instead of half-applying it. This is what lets Quick edit in a live session from its first release (UX
   cannot).
3. **Stacking bands for what Quick adds, without re-sorting what exists** (§3.5). The "effect directly above the
   top-most main clip" rule is right: an adjustment layer grades only the main track, which is what a CapCut user
   expects.
4. **Captions as "riders" that move cue by cue** (§3.4 rider span ops), including scaling cues on a speed change.
5. **One helper per copy route (`FM.spine.onCopy`) with a test that drives every route** (§14.3). This applies his
   "safeguards must be structural" rule and the whitelist-drift lesson.
6. **"Block" for groups made from main clips.** Quick ripples and reorders them as one piece, like CapCut desktop's
   compound clip (§9.3).
7. **A Labs flag for the first cut** (§15, Phase 2). The first version reaches his phone without touching anyone
   else's projects.

### Fatal or serious flaws
- **SERIOUS: the switch lands on the collab chips.** Model puts the pill at "the stage's top-left corner on both
  layouts, the corner the PC project name used to float in" (§6). That corner is the collab people chip's
  (`styles.css:10470-10471`: "who is here … the stage's top-left corner, on both layouts" **[checked]**). On the phone
  the LIVE pill is placed right of it (`styles.css:10694-10695` **[checked]**). The chip also doubles as the phone's
  invite door (`.cp-invite`, `styles.css:10482-10486`). fm-ui §7 marked the spot UNVERIFIED, and the design took it
  anyway. The move is fixable, but it has to happen before he sees a picture: #967 was all about those exact chips.
- **SERIOUS: different keys in the two editors** (C3 above).
- **MEDIUM: two attachment rules.** Items Quick creates store `sm.on` (the clip under the playhead). Full-made items
  are derived: they follow a clip only if at least 50% of the item overlaps it (§4.3). Only the link line tells them
  apart. A person can predict one rule. Two rules they have to find out by surprise.
- **MEDIUM: tools replace the toolbar when something is selected** (§8.2). This is CapCut's worst beginner trap
  (capcut-mobile §0.5 and §13.7: "tap an empty area … to deselect"). "‹ Done" is a patch. UX's two rows remove the
  trap.
- **MEDIUM: the words are CapCut's.** "Ratio", "Background", "Overlay" and "Adjust" as a row, in CapCut's order, is
  the kind of borrowing BEFORE-PUBLISHING exists to stop (his-prefs §10). The design logs it (§14.2) but does not try
  to avoid it.

### What it leaves out
- The Assistant (#856) as a simple-mode door.
- Any check of the phone's height budget. UX did the sums (§8.1). Model did not.
- What a remote ripple looks like to the other person. It has no glide and no "Sam moved 4 clips".
- Undo labels that say which editor an edit came from (Collab §11 has these).

---

## 4. design-ux.md (Quick / Full, `FM.seq`)

### Scores explained
- **C1 7.** Every clause has an answer, and it maps the four open #923 questions onto its decisions, including why a
  per-clip switch is not offered (§17, last paragraph). The one gap is serious for the brief: **Quick cannot edit in a
  live session until Phase 4.** In Phases 2-3 it is "look-and-select only" with "Switch to Full to edit together"
  (§10.2 rule 7). His brief asks for exactly the collab it postpones.
- **C2 9.** The main track is the add button (§7.4, with his moving colours from #398 and the hidden playhead from
  #354). There is one hint line that goes away on the first tap, which respects #294 "don't overexplain". Project tools
  never disappear (§8.3). "Higher on screen = in front", which fixes CapCut's hidden stacking order (§8.3). A hatched
  "black" band explains why the video runs past the last clip (§8.4). Lost point: old projects need a tap on "Make one
  from my clips" (§5.2).
- **C3 9.** The same A/S/D letters as Full, rippling in Quick. E switches editors, and bare E is unbound today (only
  M and A/S/D are bound, `js/app.js:8751`, `:8809` **[checked]**). A live ripple preview while dragging (§3.3). The
  project tools stay up, so adding text while a clip is selected takes no deselect.
- **C4 9.** "Same structure, same names, same order, same icons" (§8.2). A phone held sideways gets the PC layout, as
  today (edge 32).
- **C5 10.** This is the design that takes "Make it actually feel good" literally. Both editors share `pxPerSec`, the
  scroll mapping and the fixed centre line, so **every clip keeps its x position and the morph is almost purely
  vertical** (§6.3). There is a frame-by-frame choreography: heads fade and shrink over 0-120 ms, boxes fly over
  0-320 ms, the toolbar rises with his hinge (#612). Clip colours are kept so the eye can follow each clip. The target
  is "drawn within one frame of the tap". Reduced motion gets a 120 ms crossfade. The #974 random pool offers fold and
  slide too. Remote ripples glide over 200 ms in the mover's colour (§10.1). The switch test checks each clip's x
  across the switch to ±1 px (§14.3).
- **C6 9.** The plainest words of the three: **Stay put**, **Take sound out**, **Remove a colour**, **Look**, one
  **Crop** tool for crop/rotate/flip, and **no button called "Edit"** (§8.3, §8.6). The decision table has a reason for
  each recommendation and avoids "Pro" because he uses it for a paid tier (D1). The brand guard is widened (§14.2).
- **C7 9.** Full gains a thin stripe on main clips, a ⧓ on transitions, and one "Put on / Take off main track" toggle
  (§5.1, §5.3). Full never ripples.
- **C8 6.** The eventual plan is good: lease pre-check, all-or-nothing CAS with the intent re-run once, held-keyframe
  rebase, glides, and "Sam · Quick" chips (§10.2). But editing live is locked until Phase 4. Even then it says plainly
  that a finished Full keyframe edit landing after a ripple is still lost (§10.3).
- **C9 9.** Phase 1 is visible straight away: the switch, the morph, and any project drawn as clips (§15). D12 is
  "Build Phase 1 … and show you": small, visible and safe.
- **C10 9.** One paragraph (§1) he could read out loud. Twelve decisions is a lot, but each is phrased as a question he
  could answer with a glance at a picture.

### Best ideas to graft
1. **Two toolbar rows on the phone** (§8.1, §8.3, D8): the item's tray above, project tools always below.
2. **The vertical-only morph**, and the insight behind it: shared zoom and a shared centre line mean x never changes
   (§6.3).
3. **Same letters in both editors, plus E to switch** (§8.2).
4. **The attachment rule "follows the clip it starts on"**, with "Stay put" as the one opt-out (§4.1). There is one
   rule, it can be said in a sentence, and moving an item re-links it with no extra step. That is predictable for a
   non-editor. It also stores no id, so nothing needs remapping (§4.2).
5. **"Higher on screen = in front"**, with text and overlays above the main track and audio below (§8.3). This fixes
   CapCut's #6 trap (capcut-mobile §13.6), and the morph depends on it.
6. **Remote ripples glide in the mover's colour, with "Sam moved 4 clips"** (§10.1).
7. **The main-track check as a table of problem → how it shows → one-tap fix** (§3.6), including "main clip in front
   of an overlay → Put behind".
8. **The black band past the last clip** (§8.4).
9. **The height budget written down at 380×667** (§8.1), marked UNVERIFIED as his rule requires.
10. **Transitions that do not shorten clips** (§12), so the main-track maths never changes when a transition is added.
    For a beginner that is simpler than Model's `trIn` overlap, which slides every later clip back by `d`
    (design-model §3.4).

### Fatal or serious flaws
- **SERIOUS: no collab editing in Quick until Phase 4** (§10.2 rule 7). It is safe, but it answers his loudest
  question ("how are they both going to work on it at the same time") with "later", and it sends a beginner into Full
  to collaborate. Fix: take Model's pre-flight blockers into Phase 2. That removes the half-applied-ripple case that
  rule 7 exists to avoid.
- **MEDIUM: the switch in the phone transport is not measured.** The phone transport at 380 px already holds
  `⋯ ⧉ ◐ |◀ time ▶| ↶ ↷ ⛶` in a 40 px row (fm-ui §2.3). In Quick the left cluster goes, so there is room. **In Full**
  the "⇄Full" pill is added to a full row. It is the right place in principle (the one row that is the same on both
  layouts, and not the collab corner), but it needs a 380 px render before he sees it.
- **MEDIUM: the two-row height budget is tight.** By its own sums about 182 of about 208 px are left for the timeline
  on a 380×667 phone (§8.1). That is enough, but only just. The written fallback (icons only in the tray while
  selected) is the right one.
- **LOW: "No main track yet. [Make one from my clips]"** is a banner and a word ("main track") a first-timer has to
  parse before editing an old project (§5.2). Model's zero-step reading is smoother.
- **LOW: small holes in the pseudo-code.** `slideStranded` is used and never defined (§3.2 trimTail). A locked main
  clip still moves in a ripple (edge 5). That second one is defensible, but it is a different meaning of "locked" from
  Model's refusal and should be one of the pictured decisions.

### What it leaves out
- The Assistant (#856).
- Keyframe-safe collab. It names the real fix, clip-relative keyframe time, as a "model change across 888 evalProp
  sites" and puts it out of scope (§10.3). Collab's design shows it can be done **on the wire only**, touching none of
  those call sites (design-collab §3.3). UX missed that route.

---

## 5. design-collab.md (Simple / Full, `FM.track`)

### Scores explained
- **C1 9.** It answers the collab clause better than anything else in the panel. It works through 17 cross-mode cases
  (§10.3) and states a precise non-interference guarantee (§10.9). It also covers every other clause.
- **C2 7.** It has the big "+ Add clips" start and the picker straight away (§7). But an old project needs an adopt
  card (§5). The Captions tool makes **one caption track per spoken main clip** (§12). Restyling "all my captions"
  then means changing N tracks, which is at odds with his #151 ("effects that effect the whole layer"). The phone
  sketch also draws captions **below** the main track (§8.2) even though they render on top, which is CapCut's hidden
  stacking trap again (capcut-mobile §13.6).
- **C3 7.** S splits and Delete ripples, but "the complex keys (… A/S/D clip keys) are rebound or off in Simple"
  (§8.3). That is the same relearning problem as Model.
- **C4 8.** Same tools in the same order: a strip on the phone, a grid on the PC (§8.3).
- **C5 7.** "Keep my frame" is a thoughtful touch: when a friend's ripple slides your clip, your playhead slides with it
  (§10.5). The switch morph gets one line (§6). The pill has the same corner collision as Model's.
- **C6 7.** "Simple / Full" is closest to his own words ("a simple version and a complicated version"). "Stick /
  Unstick" is plain. But D6 ("pushes neighbours when it touches them") and D7 ("Only I arrange the main track") ask him
  to picture behaviour he has never seen.
- **C7 4.** This is the cost of the design. On main-track clips **the Full editor gets new rules**. Trims push (§3.5).
  A drag that crosses a neighbour's middle **swaps** them (`slotFor`, §3.5). No gesture may write `start` (§3.6), and
  the host refuses an `s start` on a derived layer (§10.2.4). The inspector's type-a-start is rerouted (edge 4). In a
  project started in Simple, the Full user's "anything anywhere" becomes "anything anywhere except these clips, which
  now behave like CapCut's". That is two rules inside one editor (#454, one meaning per thing), and it takes choice
  away from the complex side (#966). "Free everything" and "Take off main track" are escape hatches (§5, §16.4), not
  the default. The design admits the risk ("new behaviour in 'his' editor", §16.4).
- **C8 9.** Cases J, F and Q are real wins. A friend's crop tool no longer freezes your ripple. A keyframe edit and a
  ripple land correctly in either order. Undo leaves no holes. Nothing is refused for a clip you never touched.
- **C9 4.** Phase 0 is a wire-protocol change with no new screens, and Phase 1 adds magnetism inside Full (§15). The
  design knows this and recommends building Phases 0-2 together (D9 B), which makes the first visible release the
  biggest and latest of the three.
- **C10 6.** The story for him is simple ("they never clash"). The mechanism behind it is not: derived starts, a
  relative keyframe clock on the wire, order keys, gaps stored on the next clip, and a `sig` re-adopt guard for old
  builds. When something surprises him, the explanation will not fit in one line.

### Best ideas to graft
1. **Clip-relative keyframes on the wire only** (§3.3). The app keeps absolute keyframes in `FM.scene`, so the 674 to
   888 `evalProp` sites are untouched. The collab base and ops carry `t − layer.start`. A move then sends only `start`,
   a concurrent keyframe edit lands on the right frame in either order, and the Full↔Full race that exists today is
   fixed. The one known writer that breaks the rule is real: the clip drag shifts keyframes only at pointer-up
   (`js/timeline.js:5073-5075` **[checked]**, "retime every keyframe by the same delta"), and §3.3 names it. **This
   grafts cleanly onto the stored-start architecture**: ripples would still send `start` values, but never keyframe
   lists. It closes UX §10.3's admitted hole and Model §10.4 row 3.
2. **"Keep my frame"** (§10.5): the playhead follows the clip you are working in when a friend's ripple moves it.
3. **A lease protects a layer's content, not where it sits in time** (§10.4). Being told "Sam is cropping clip 5, so
   you can't trim clip 2" is the interference his brief rules out. Under the stored-start model this can be partly
   taken over: exempt a ripple's `start`-only ops from the lease gate as `fix`-like ops. That is a hole-poke item, not
   a free graft.
4. **The worked cross-mode case table** (§10.3). It is the right way to show him collab in a visualizer: two phones
   side by side, one case per frame.
5. **`FM.history.commit({label, ed})`** (§11), so "Undid: camera move (made in Full)" is readable.
6. **Extract audio makes a twin stuck at offset 0** (§4.1), a small improvement over today's free twin.

### Fatal or serious flaws
- **SERIOUS (for this lens): it changes the Full editor** (C7 above). This is not a bug, it is the design's premise,
  and it is the reason it ranks last here.
- **SERIOUS: the switch pill is on the collab chips** (§6, D3 A), the same conflict as Model's
  (`styles.css:10470-10471`, `:10694-10695` **[checked]**). This design is about collab, yet it puts its pill on the
  collab people chip.
- **MEDIUM: one caption track per clip** (§12). Styling, the cue editor and "Find speech" all become per-clip
  operations. Model and UX ride one track cue by cue, which keeps "one track = one style" (UX §12).
- **MEDIUM: the invisible first phase.** A protocol change with a `SCHEMA_REV` bump ships before anything he can see.
- **MEDIUM: "a leased clip can move in time"** (§10.4, §16.3) is right, but it is a change of meaning he needs to see
  drawn. The design only puts it in D7's picture.

### What it leaves out
- The Assistant (#856).
- Most of the feel. The switch gets one paragraph, and there are no first-run or empty-state details beyond "+ Add
  clips".
- A phone height budget.

---

## 6. Ranking

| Rank | Design | Mean | Why, in one line |
|---|---|---|---|
| **1** | **UX** | 8.6 | It is the one he will open, understand in a minute and enjoy. It keeps Full as it is and shows him something early. Its one real gap (no live editing in Quick until Phase 4) is closed by grafts from the other two. |
| **2** | **Model** | 7.4 | The same sound core, with the cleanest answer to "can I turn a project". Worse on feel, keys and the switch placement, and its first visible release is later. |
| **3** | **Collab** | 6.8 | The best engineering answer to the collab clause, paid for by changing how Full behaves and by an invisible first phase. Its wire-level keyframe fix is the most valuable single graft in the panel. |

---

## 7. Which core architecture should win, and why

**Model's option F, which UX independently chose (`seq.main` = `sm.main`): one optional flag per main clip, `start`
stays the stored truth, and magnetism is a behaviour of the simple editor's commands only.**

Why, under this lens:
1. **Full stays his.** His complex side is "anything anywhere" (INBOX.md:28) and keeps "as much choice as possible"
   (#966). With F, the Full editor's drags, trims and inspector fields behave exactly as today on every layer, main
   clips included. The derived-start model cannot offer that: the layout overwrites `start`, so Full has to learn push
   and swap (design-collab §3.5).
2. **One meaning per thing** (#454). Under F a clip in Full is always a free layer, and a clip in Quick is always on a
   magnetic track. Under derived starts, a main clip in Full behaves differently from the layer beside it.
3. **Progress he can see.** F needs no protocol change to show him the switch and any project drawn as clips (UX Phase
   1). The first thing he holds is the thing he asked for.
4. **The precedent he will recognise.** Resolve's Cut and Edit pages are two views over one timeline, with magnetism in
   the Cut page's commands (pro-editors §4). Final Cut's connected clips give the attachment idea. F takes both.
5. **The collab cost is real but bounded, and the grafts shrink it.** F's weak cases are two ripples at once and a
   keyframe edit racing a ripple (fm-collab §9.1). Clip-relative keyframes on the wire (Collab §3.3) remove the second
   one completely. Pre-flight blockers (Model §10.3) remove the common form of the first. An all-or-nothing CAS tx
   with a single intent re-run (UX §10.2 rule 3) handles most of the rest. What remains shows as a visible one-tap
   seam, never lost data.

Collab's derived start stays on file as the upgrade path if real sessions show seams often. Model §10.6 already plans
for that, "without touching Quick's UI".

---

## 8. The synthesis this judge recommends

| Area | Take from | Detail |
|---|---|---|
| Stored model | Model F / UX | `layer.<ns>.main`, `layer.<ns>.stay` (UX) for the opt-out, `project.<ns> = {v, home}`. Pick the namespace name once: `sm` or `seq`, neutral so a later rename never touches saved projects (UX §0). |
| Attachment rule | UX | "Follows the clip it starts on", "Stay put" to opt out, a link line on selection. Music and whole-video voice stay put by default. Hole-poke it against Model's stored `sm.on`. |
| Captions | Model riders + UX `rippleCues` | One track, cue-by-cue ripple, including scaling on a speed change. Not Collab's per-clip tracks. |
| Opening an old project | Model | Draw the worked-out main track at once and write nothing until the first Quick edit. Use UX's "Make overlay / Make main clip" for corrections. |
| Switch placement | UX (transport), **measured** | First control in the transport row, and in the cog's canvas dialog. **Not** the stage's top-left: that is the collab chip and LIVE pill. Render it at 380 in Full and in Quick as a pictured option (D2). |
| Switch feel | UX | The vertical morph, a one-frame target, hinge for the toolbar, the #974 random pool, reduced motion. |
| Toolbar | UX | Two rows, with the icons-only tray as the fallback if the 380×667 measurement says so. |
| Keys | UX | Same A/S/D in both editors (rippling in Quick), E to switch, Delete ripples in Quick. |
| Words | UX | Stay put, Take sound out, Look, Remove a colour, one Crop; no "Edit"; nothing named after another company; widen the brand guard (`tests/tests.js:68197-68208`). Avoid CapCut's toolbar order and wording where a plain alternative exists, and log what remains in BEFORE-PUBLISHING. |
| Collab, first release | Model | Pre-flight blockers, so Quick edits live from day one. Presence `ed`. UX's glides and "Sam moved 4 clips". |
| Collab, hardening | Collab + UX | Clip-relative keyframes on the wire (Collab §3.3, including the pointer-up drag fix at `js/timeline.js:5073`), keep my frame (Collab §10.5), all-or-nothing CAS with intent re-run (UX §10.2 rule 3), `commit({label, ed})` (Collab §11). |
| Transitions | UX | Do not shorten clips (UX §12). A later phase, with its own schema bump. |
| Phasing | UX | Phase 1 is visible (the switch and any project drawn as clips). Invisible plumbing rides along in the same release. Model's Labs flag for the first editing release. |
| Names (D1) | show all | "Quick / Full" (Model and UX) does not talk down to his "experienced but in a hurry" group (his-prefs §12.4). "Simple / Full" (Collab) is his own word. Draw both and mark one recommended. It is his call. |

### Add what all three left out
1. **The Assistant as a simple-mode door** (#856, `js/ai-chat.js`, v16.23). He named it as the CapCut feature he wants
   ("you can just talk to her and say what you want"). It needs his own key today, so it is an optional door and not
   part of the core. It is one button in the project tools row.
2. **A named "first ten seconds" for a beginner, drawn at 380 px:** New project → Quick card → picker → clips land →
   one hint line. All three describe pieces of this, and none draws it end to end. That is the picture he will judge
   first.
3. **One sentence on locked clips in Quick.** Model refuses the whole ripple; UX moves the clip anyway. Make it a
   pictured decision.
4. **A render check of every new stage and transport control against the collab chrome** (people chip, LIVE pill,
   comments bubble, person+ door) at 380 and 1280. #967 moved all of these in the last three releases.

---

## 9. Code facts checked for this judgement

| Fact | Where | Used for |
|---|---|---|
| The stage's top-left is the collab people chip "on both layouts" | `styles.css:10470-10471` | Model §6 and Collab §6 pill collision |
| The phone LIVE pill sits at `top: 9px; left: 42px` on the stage | `styles.css:10694-10695`; placed by `js/collab-ui.js:1050-1075` | the same |
| Only M and A/S/D are bare letter keys; E, Q and W are free | `js/app.js:8751`, `:8809-8814` | UX's E; Model's Q/W, and it dropping A/S/D |
| A clip drag shifts keyframes only at pointer-up | `js/timeline.js:5070-5075` | Collab §3.3's one broken writer is real |
| fm-ui left the stage-corner placement UNVERIFIED | `research/fm-ui.md:391`, `:451` | why two designs missed the collision |
