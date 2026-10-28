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


### 28 Oct 2026, ~14:15 AWST — the intro looks AI-made; make it feel human (#1180's Keyframes splash)
**His words, verbatim:** "THe intro u have on the app rn looks very Ai made, try making it feel more human, research what makes ai stuff feel ai when it comes to claude design and stuff."
He was looking at the logo canvas (artboards Main, Greys, Teal, Grades, Across, D2-Animations) when he said it.

**What "the intro" is:** the launch splash in index.html (#splash / #splash-mark, inline SVG + SMIL, 5.5 s timeline). It is
card 7 of tools/design/logo-1180/canvas/D2-Round2.dc.html, his pick on 23 Oct ("i love the first one").

**PM's first reading of the AI tells in it (research and drawn options follow in a block titled "#intro feels AI — PM plan"):**
1. The tagline **"EDITING, EVOLVED"**: the stock "X, reimagined / X, evolved" formula, in small, wide-spaced grey capitals.
2. **Every element fades up and settles** (the name rises 8 px, the tagline 6 px), the most common AI entrance.
3. The same expo-out spline (0.16 1 0.3 1) and the same springy overshoot (1.3 → 0.92 → 1) on all three diamonds,
   with an even 0.018-cycle stagger. It is mechanically regular.
4. **Glow blooms and pulse rings** (white radial flashes, an expanding outline ring, a teal halo on the playhead), plus
   gradient-filled bars, a neon teal accent on near-black, and a dead-centre symmetric layout.

**Not to build until the PM's plan lands** (options drawn on the canvas for him to pick, one recommended).

### 28 Oct 2026, ~15:00 AWST — #intro feels AI — PM plan (READY TO BUILD: H2 "Scrub", recommended; he may pick another)
Follows the block "the intro looks AI-made; make it feel human". His words, verbatim: "THe intro u have on the app rn looks very
Ai made, try making it feel more human, research what makes ai stuff feel ai when it comes to claude design and stuff."

**Research (3 web researchers, ~45 sources: Anthropic's frontend-design skill and blog, Adrian Krebs' 500-page "design slop"
count, Pixelslop's catalogue, impeccable.style, Emil Kowalski, Apple HIG, School of Motion, Saul Bass and Spider-Verse writing).
The current splash hits nearly every named tell:**
1. Tinted near-black #0b0b0d with ONE bright accent. Anthropic's own skill lists exactly this as a Claude default
   (#0B0B0B / #111, single bright accent), and Pixelslop gives it its top severity score.
2. Glow halos: the white radial flashes, the expanding outline-ring pulses and the playhead's teal halo. "Dark-mode glow" and
   "pulsing indicators" are named tells. A white rotated square popping with a glow also reads as the AI sparkle (✨).
3. "EDITING, EVOLVED": the tracked grey all-caps label tell plus the "X, reimagined" slogan formula. Apple: no text on a launch screen.
4. Fade-and-rise entrances (the name rises 8 px, the tagline 6 px). Anthropic's skill: "the generic default and read as AI-generated".
5. One curve (expo-out 0.16 1 0.3 1) on everything, an even stagger, a scale-from-0 spring with 30% overshoot
   (Kowalski: never from 0, start at ~0.9; bounce 0.1–0.3 at most).
6. Too many effects (pops, glows, rings, spins, slides, drop, two fades) over 5.5 s on every launch. The research says one idea, short.
7. A dead-centre symmetric layout and a system font with no decision behind it.
Human moves the research backs: one idea native to the subject (a scrub, a cut, keys), uneven hand timing, a different ease per
role (falling = ease-in with a hard stop), motivated motion (the playhead CAUSES the reveal), stepped "on twos" texture,
holds, a hard cut instead of a dissolve, a ground that matches the first real frame. Full notes are in the PM scratchpad
research-intro.md.
**The 23 Oct "Keyframes, by hand" round changed only the motion.** It kept the glow, the tagline, the gradient bars on
#0b0b0d and Sora, so it fixed tells 5–6 and left 1–4.

**Drawn on his logo canvas, new board "Human intro · four takes"** (https://claude.ai/artifact/4ot9bNBsNL6HCv6Nei8QN7,
project/Human-Intro.dc.html). Every take keeps his logo exactly (the F of clips, the light-from-above grey, the teal playhead) and:
- has a **true black #000 ground**, the colour the iPhone launch images already use (index.html:73), so launch → splash is one
  colour, and the playhead's knock-out backing becomes #000;
- has **no glow, no rings, no tagline, no fade-ups, no scale-from-0**;
- uses a **left-aligned lockup**: the name starts on the F's spine (logo at translate(21 30), the text at x=35, text-anchor start,
  letter-spacing -0.3), instead of mirrored centring;
- sets the name in the font the app really ships (SF / Segoe; the canvas used to show Sora, which the app never loads);
- moves in under 1.6 s instead of 5.5 s.
The takes:
- **H1 · Keyframes, played.** The keys are tapped onto the F's spine at uneven times (0.12 / 0.27 / 0.55 s), and each clip
  plays out from its key with ease-out (0.23 1 0.32 1), ending at 1.20 / 1.24 / 1.32 s. The playhead falls with an ease-in
  (0.55 0 1 0.45), lands hard at 1.54 s with a 1 px settle, and the name cuts in on the landing frame. Closest to his pick.
- **H2 · Scrub — RECOMMENDED.** The playhead cuts in at the clips' start (0.15 s), holds a beat, then sweeps right
  (0.40→0.98 s, ease-in-out 0.77 0 0.175 1). The clips are revealed exactly at its edge (a clipPath width on the same spline),
  so it overshoots to x=112. Then it rocks back like a hand scrubbing tape: 112→70→90→79→82, at 1.16 / 1.30 / 1.41 / 1.50 s,
  each swing shorter. It stops on its frame and the name cuts in on that frame. ONE idea, the gesture an editor's hand
  really makes, and the playhead causes everything.
- **H3 · On twos.** The clips step in at 12 fps (calcMode discrete, out of sync, with holds) under a sub-pixel gate weave,
  the playhead falls smooth on ones, and the name appears two letters per step. The most "hand-made" texture, and the most stylised.
- **H4 · Quiet.** Everything cuts in on frame one, and the playhead plays at an even speed from the clips' start to its place
  (0.40→0.95 s) and stops dead. This is Apple's "launch is not a branding moment" reading, and the least show.
Exact SMIL values (keyTimes on a 4 s loop: divide by 4 for seconds) are in the board's file. In the app, play ONE pass with
fill="freeze" and no repeatCount, re-timed onto its own short dur (H2's motion ends at 1.50 s).

**Build H2 into the splash (his standing rule since 21 Oct: ship the recommended pick ON, he corrects later). What changes in index.html:**
1. #splash-mark: replace the Keyframes SMIL with H2's, one-shot. The END FRAME (the still for reduced motion / no SMIL /
   paused clock) is H2's last frame.
2. The splash ground #0b0b0d → #000 in splash-css (#splash.splash-kf background-color AND the image layer;
   html.splash-on.splash-kf-on). Keep queue 920's split for the light Home: only the COLOUR ramps to #fafdff.
3. Delete the tagline <text>, the radial gradients nC_w / nC_t, every glow circle and every outline-ring polygon.
4. Hand-over: dissolve .9s → the existing quick .28s path (an editor cuts, it doesn't dissolve). Hold the end frame ~0.6 s
   (the research says a beat to read the name; it was 0.4 s).
5. Re-derive the cap and the 15 s ceiling from the new timeline (motion 1.5 s + 0.6 s hold), and re-point every #1180
   test that names old timings (3.36 s settle, 5.5 s dur, "EDITING, EVOLVED", nC_ ids). Release 1's rules stay:
   splashed per build, the clock-based cap, the still if the clock hasn't started or animationsPaused().
6. A phone check at 380 px plus a desktop check, and send him a recording or a three-frame strip (0.2 s, 1.0 s, end), per the
   design rule: he sees it before it is called done.
**Not decided by the PM:** a timecode readout (the research suggested a frame counter that freezes on the stop; left out
as an extra element), sound (none in the app's splash today), and whether the logo's own grey gradient should go flat (it is
his chosen grade, so it is kept).
