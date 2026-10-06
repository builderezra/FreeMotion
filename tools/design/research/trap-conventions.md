# How CapCut and Alight Motion handle the 7 beginner traps (R2)

Against `origin/main` b46b47d (v17.23), and D1's pages on branch `design/beginner-traps`. Research only: no app code changed.

## Read this first: how much to trust this

I have no access to either app. What I could use: three web searches (they returned beginner-guide aggregator pages for CapCut, and for Alight Motion only Apple Motion documentation, which is a different product), plus what I know of both apps from general knowledge, plus FreeMotion's own repo (`PARITY.md` audits FreeMotion against Alight Motion's *features*, not its interface behaviour, so it does not settle these seven). Every claim below carries a tag:
- **[source]** a search result said it (weak sources: blogs, not the vendors);
- **[knowledge]** from my general knowledge of the apps; **I could not check it**, so treat it as a lead for a person with a phone to confirm in a minute;
- **[code]** about FreeMotion, read in this repo.

**The one result I would act on:** trap 7 (songs land at the playhead). CapCut does the same as FreeMotion does today, so D1's recommended option A for that trap goes *against* the convention a CapCut user already knows. Details below.

## The seven, one at a time

### 1. Export hidden after the first import (phone)
- **CapCut:** the Export button sits at the top right of the editing screen **[source: "Tap Export in the top right corner of the editing screen"]**. It does not disappear when a clip is selected; selecting a clip changes the *bottom* toolbar, not the top bar **[knowledge]**.
- **Alight Motion:** an export or share icon sits at the top right of the editor and stays while a layer is selected **[knowledge]**.
- **FreeMotion [code]:** `styles.css:4214` hides `#m-export` while a clip is selected.
- **Which D1 option matches:** **A** (keep the green Export in the clip header). It is the only one that matches the convention both apps share: export lives in the top bar and selection does not move it.

### 2. The add row vanishes while a clip is selected (phone)
- **CapCut:** a **+** at the end of the main track stays visible as you scroll, and the add tools are in the bottom toolbar when nothing is selected; with a clip selected the bottom toolbar swaps to clip tools **[knowledge]**. So CapCut also hides *the add toolbar* while a clip is selected, but keeps the in-timeline **+**.
- **Alight Motion:** a **+** button in the timeline area stays while a layer is selected **[knowledge]**.
- **FreeMotion [code]:** solo view (`js/timeline.js:2838`) shows one row with no add row and no **+** (`styles.css:4206`).
- **Which D1 option matches:** **A** (a slim "+ Add layer" strip under the solo row) is the closest to CapCut's in-timeline **+**. B (a floating green + over the sheet) matches Alight Motion's floating add button if it sits where theirs does **[knowledge]**.

### 3. No feedback when a clip is picked up (iPhone)
- **CapCut:** long-pressing a clip lifts it and collapses the track into small tiles you can drag to reorder; on iPhone the native app gives a haptic tick **[knowledge]** (a search for this returned nothing).
- **Alight Motion:** long-press then drag to reorder shows the layer lifted **[knowledge]**.
- **FreeMotion [code]:** the hold fires at `js/timeline.js:2207`; `navigator.vibrate` is used elsewhere (`js/app.js:1640`) but iOS Safari has no vibrate **[knowledge]**, and a native app can do haptics a web app cannot.
- **Which D1 option matches:** **A** (lift the clip) and **B** ("Moving" with the other rows dimmed) both resemble CapCut's collapse-to-tiles in spirit. A is the closer match to "it visibly lifts"; neither can copy the haptic.

### 4. The S key stretches when the playhead is off the clip
- **CapCut mobile:** there is no keyboard. **Split** is a labelled button that always splits at the playhead **[source: "tap the clip, move the playhead, tap Split"]**; shortening is by dragging the clip's edge **[source]**. There is no "extend to the playhead" action **[knowledge]**.
- **CapCut desktop, Premiere, Final Cut, Resolve:** each has a split or blade command bound to a key, and none of them turns the same key into a stretch **[knowledge; I am not sure of CapCut desktop's exact key, so do not quote one]**.
- **Alight Motion:** Split is a menu item acting at the playhead **[knowledge]**.
- **FreeMotion [code]:** S splits inside the clip and extends outside it (`js/timeline.js:5761-5809`).
- **Which D1 option matches:** the convention is "split is split". **C** (S does nothing off the clip and says why) is the closest to it; **A** (amber, "Stretch to here") keeps the stretch but labels it; **B** only adds an undo toast. If Ezra wants the stretch to stay, A is the honest compromise; the *convention* argues for C.

### 5. The "does nothing here" badge swallows the tap
- **CapCut and Alight Motion:** neither warns that an effect will have no visible result; you add it and see **[knowledge]**. I know of no badge in either app that intercepts the tap.
- **FreeMotion [code]:** `js/fx-browser.js:1064` stops the tile click on the badge.
- **Which D1 option matches:** **A** (the badge is decoration; the whole tile always adds) matches "tap the tile, it adds". **C** ("Add anyway?") is the most different from what users know.

### 6. Shadow only turns a full-frame clip black
- **CapCut:** a shadow is a text and stickers style; for video clips it is an effect or an overlay trick **[knowledge]**, so there is no direct counterpart and no convention to copy.
- **Alight Motion:** Shadow is an effect that draws a copy behind the layer; on a full-frame clip it is mostly hidden behind it, and there is no "shadow only" switch that I know of **[knowledge]**.
- **FreeMotion [code]:** `js/compositor.js:650` has the switch, the kernel is at `:7457`.
- **Which D1 option matches:** none is a convention. **A** (disable the switch with the reason) follows the app's own pattern for dead controls; I have no external evidence either way.

### 7. Songs land at the playhead  **(the one that changes a recommendation)**
- **CapCut:** the music is inserted at the **current playhead position** **[source: "The music track will be inserted into the timeline at the current playhead position … when you import a music file from your device, CapCut adds it to the timeline at the current playhead position"]**. Several blog guides say the same: move the playhead first.
- **Alight Motion:** a new layer, audio included, lands at the playhead **[knowledge]**.
- **FreeMotion [code]:** `js/app.js:3055`: the first clip at 0, later ones at the playhead. That is the same as both apps.
- **What this means for D1:** option **A** (songs start at 0:00 by default) is *different* from CapCut and Alight Motion, so a user coming from either would find it wrong ("I put the playhead where I wanted the music"). Option **B** (keep the placement, say it, offer "Move to start") matches both apps and fixes the surprise. **Revised recommendation for trap 7: B**, not A. The beginner trap is real (the song starts late), but the cure that matches what users already know is to *tell* them, not to change the rule.

## Summary table

| # | Trap | D1 recommended | Matches the apps? | After this research |
|---|---|---|---|---|
| 1 | Export hidden | A | yes | keep A |
| 2 | Add row hidden | A | closest | keep A |
| 3 | Grab feedback | A | in spirit | keep A |
| 4 | S stretches | A | no: convention is "split is split" | A is a compromise; **C matches the convention** |
| 5 | Badge swallows tap | A | yes | keep A |
| 6 | Shadow only | A | no convention | keep A (own pattern) |
| 7 | Songs at playhead | A | **no, it contradicts both apps** | **change to B** |

## What a person should check (five minutes, a phone with both apps)

1. In CapCut, select a clip: is Export still top right? 2. Is the **+** at the end of the track still visible with a clip selected? 3. Add a song with the playhead mid-project: where does it land? 4. Long-press a clip: what does it do? 5. Add Shadow or Glow to a full-frame clip in Alight Motion: what do you see? Items 3 and 4 decide the two recommendations I am least sure of.

## Verified vs guess

Verified: the FreeMotion lines. Weakly sourced: the CapCut Export position and the audio-at-playhead behaviour (blog aggregators, not CapCut's own help). Everything tagged [knowledge] is unverified. I did not get a single screenshot of either app.
