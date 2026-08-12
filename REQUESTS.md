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

## Open

Numbered with Ezra's own queue numbers where he gave them.

### In flight right now
- [ ] **63 — Fractal Ridges needs work.** *"more colour options and overlay options and animation
      options so it actually moves"* — workflow running: study → build in a worktree → adversarial verify.
- [ ] **64 — Iridescence: a blur option, and a motion amount.** Two separate asks —
      *"add a blur option to iridescence effect"* and *"you should be able to decide how much it
      actually moves"*. Same workflow as 63.
- [ ] **88 — Text adding is broken on PC, and still on mobile.** On PC the editor lays out as a phone
      bottom-sheet: toolbar stretched across a 2000px window, "Type your text…" stranded a full
      viewport below it. Workflow running: 3 parallel diagnoses → fix in a worktree → 4 adversarial
      verifiers. Note this has been "fixed" at v5.41, v5.44 and v5.47 and reported broken each time.

### Bugs
- [ ] **Playhead missing when a project opens.** Needs an app restart to come back. Diagnosed once
      (the push makes #app position:fixed and a recompute inside that window stores the translated
      edge) but the fix was never landed — he hit it again after that.
- [ ] **Editing lags, and gets bad fast.**
- [ ] **72 — Audio import loses parts of the file.** *"when it's importing the audio it literally cuts
      out certain parts making it jumpy, even on the timeline you can see how it's missing parts"*.
      Not lag — actual missing audio.
- [ ] **58 — The red delete bar flashes during fast scroll** in the effects list.
- [ ] **89 — Letterbox and Border Frame paint over the layers below them.** Same class of bug as Fill
      Behind (fixed in v6.15). Both do `if (d[i+3] < 255) d[i+3] = 255`, manufacturing opaque coverage
      where the layer has none. Deliberately deferred: the one-line removal turns them into effects
      that do nothing on a non-fullscreen layer, which this codebase already had to revert once. The
      real fix runs them on the layer's own bounds and needs bbox plumbing.
- [ ] **53 — PC is missing the Group and Mask options.**

### Features and changes
- [ ] **The Presets menu should preview what the LAYER will look like** with the preset applied —
      not a generic sample. Ezra: *"the presets menu should show a preview of what the layer will look
      like when you add the effects"*. This is the concrete version of queue 37 below.
- [ ] **68 — Speed should retime keyframes.** *"if you add a bunch of effects with key frames you may
      want to make it go faster or slower, changing all the key frames automatically to slow or speed
      with the layer instead of manually doing it"*. Also has to work on every layer type.
- [ ] **69 — Audio must never lag.** Make the audio clock the master.
- [ ] **70 — Extracted audio should look like an audio track.** *"it doesn't show it like an audio
      file, with the bumps to volume or whatever it's called"* — i.e. a waveform.
- [ ] **74 — Swipe up for a full-screen Favourites browser.** Replacing the swipe-right between
      Recent and Faves. Sorting by recency, effect type and A–Z, each with an inverted order.
- [ ] **60 — Reverse the open animation when returning to home.**
- [ ] **59 — Copy/paste button in the effects menu, and paste ONE effect.**
- [ ] **Per-effect-slider keyframes.** *"each effect slider having its own key frames still doesn't
      exist fully"*.
- [ ] **47 — Export must not lose the render on a crash,** and should get off the main thread.
      Chunk-replay resume is proven; not landed.
- [ ] **48 — Squish:** a new effect where the layer deforms against the canvas edges. Part of the
      recovered diff (see below).
- [ ] **37 — Presets rework:** AM's "Preset preview" screen. Supersedes the earlier thumbnail spec.
- [ ] **31b — Transform blur can't smear effect- or camera-driven motion.**

### Work that exists but isn't landed
- [ ] **Land the recovered voice-recorder diff.** 1301 lines, recovered from an in-repo worktree after
      a reboot wiped /tmp. Cut against v5.87, so it needs a `--3way` merge.
- [ ] **Land the recovered Squish diff.** Same story, 3509 lines, cut against v5.89.
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

- [x] **Easter egg: pull the home list past the top and it slams back and shakes the screen** — v6.25
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
