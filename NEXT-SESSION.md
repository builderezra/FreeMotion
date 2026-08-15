# Where things are — written at v8.07, 16 Aug

**Read [REQUESTS.md](REQUESTS.md) first, then this.** This file is the short version; that one is the
truth. If the two disagree, REQUESTS.md wins.

## The one rule

Work **[REQUESTS.md](REQUESTS.md) oldest-first**. Find the next item with:

```bash
grep -n "^- \[ \] \*\*[0-9]" REQUESTS.md | sed 's/^\([0-9]*\):- \[ \] \*\*\([0-9]*\).*/\2 (line \1)/' | sort -n | head
```

An item whose only remaining work needs a decision or a detail from Ezra does **not** hold the queue —
note that in the entry and move to the next-lowest. Blocked is not done.

The exception, and it is currently in force: **he told me on 15 Aug to jump the queue for his PC-layout
message.** That block (#230–#239, plus #240–#247 as they arrived) comes before the older items. Inside
it, still oldest-first.

## Shipping checklist — every release

1. Bump the version label in `index.html` **and** the `?v=` cache-buster of every file touched.
2. `python3 tests/_cdp.py --port 8777` — **port 8777 only**. Green before commit.
3. **Mutation-check every new assertion.** Break the fix, confirm the test goes red, restore. This has
   caught three of my own bugs today that the browser check passed.
4. A `POLISH-LOG.md` entry, and tick the REQUESTS.md item with its version.
5. Commit, `git push ssh main`, then verify `git rev-parse HEAD` == `git rev-parse ssh/main`.
   `origin` is HTTPS with no stored credentials and will fail; `ssh` is the same repo and works.

## What shipped this run — v7.73 → v8.05

| | |
|---|---|
| 7.73 | PC: the notes button joins the transport row (v7.52 left it behind) |
| 7.74 | PC multi-select: three big align buttons; the playhead trio now means the whole selection |
| 7.75 | PC: the name field comes off the header onto the row |
| 7.76 | Home grain: 64px tile → 256 (it repeated 76× and read as a grid); cards get a backdrop blur |
| 7.77 | Freehand undo/redo icons — and Undo was deleting the whole drawing |
| 7.78 | Freehand eraser; undo history rebuilt as snapshots to hold it |
| 7.79 | PC row: bare icons, box on hover only, blue Export, red delete, ↻ on the version chip |
| 7.80 | One name field, in the inspector header, doing both jobs |
| 7.81 | Parent next to the layer menu, delete one over, new parenting icon |
| 7.82 | PC gets the layer ⋯ menu — 16 clip options were right-click-only |
| 7.83 | Split ON the playhead, trims either side, up inside the ruler band |
| 7.84 | Move/extend told apart (fill vs outline), level on the line; Export stops lapping the divider |
| 7.85 | PC add menu gets its own background |
| 7.86 | Trackpad slam fires while you pull instead of after you stop |
| 7.87 | **The black bar was the slam's own ring** — see the lessons below |
| 7.88 | The cog turns when pressed |
| 7.89 | The three selection buttons wear a shared ground |
| 7.90 | Export names any clip the mixer could not read, instead of dropping it in silence |
| 7.91 | …and says when the browser cannot encode AAC, which throws the whole mix away |
| 7.92 | …and when the encode itself fails after the track was already declared |
| 7.93 | Canvas settings hangs off the cog; the cog stays out of its own blur |
| 7.94 | A new benchmark lights the timecode chip immediately |
| 7.95 | Home tabs stop showing the grain; the grain actually boils |
| 7.96 | The add-menu background reaches its borders |
| 7.97 | Opening the export dialog stops the transport |
| 7.98 | The flaky mic test waits on the real signal |
| 7.99 | The flaky push test — `unstampIntro` now stays unstamped |
| 8.00 | The drawing overlay moves into the wrapper's space, so it survives a zoomed canvas |
| 8.01 | …so the reset on entry is gone: your zoom is kept while you draw |
| 8.02 | Two-finger scroll pans the canvas while drawing — **#165 is complete** |
| 8.03 | The pan is clamped — it could push the canvas entirely off screen with no way back |
| 8.04 | Subtle shading on the notes button (**#225**, which had been missed for 17 releases) |
| 8.05 | "Export just this layer" is a picker, not a tick (**#174**) |
| 8.06 | Swipe **UP** on Recents opens Faves (**#204**) — the gate mirrored, not negated |
| 8.07 | The app says when an effect **cannot do anything** to a layer (**#180**) |

Suite: **371/371** at v8.06, and **both flaky tests are closed** (#226 v7.98, #222 v7.99) — a single
green run finally means something again.

**His PC-layout block (#230–#247) is FINISHED except #244**, so the queue-jump exception above has
almost expired: do #244 when it is reached, and otherwise work the older items oldest-first.

## #215 — the most serious item, and it needs his next export

**#215 — export with no audio.** The most serious item in the file: the app produces silently wrong
output. He gave the first reproduction on 15 Aug (fresh project + sound effects + default settings).
v7.90–v7.92 did **not** fix it — they made all three silent failure paths *speak*, so the next
occurrence identifies itself. **Four outcomes are now distinguishable:** a toast naming a clip = the
mixer; the AAC toast = the browser has no encoder; "soundtrack failed to encode" = the encode threw;
**no toast and still silent = none of the three, which would be genuinely new information.** A dead
lead is recorded in the entry (library re-adds take the identical path as imports) — do not re-derive
it. **It cannot close without his next export**, so it does not hold the queue.
*(#165 is DONE — centring v7.35, undo/redo v7.77, erase v7.78, zoom v8.01, pan v8.02.)*


Then the older queue, oldest-first. Everything below #148 is currently blocked on him.

## What an AUDIT of the list turned up — do this again

Working forwards found the numbered items; **sweeping the ticks found six more things**, and none of
them were visible from "what is next". This is worth repeating periodically, not just working forwards:

- **#225 was never done.** Logged first thing that session, then his PC message jumped the queue and ran
  for seventeen releases. I twice reported "everything done except #244" — wrong both times. Shipped v8.04.
- **#172 and #173 were already built and never ticked** — the sixth and seventh stale entries. Both were
  done as part of a NEIGHBOURING request (#173 alongside #121's prefs work, #172 alongside #141's
  frame-rate list) while the entry that asked for them was never revisited.
- **#174 was genuinely missing** and is now built (v8.05).
- **#179 does not reproduce** — almost certainly fixed by v7.35, exactly as its own entry predicted.
- **#187's "creeps in"** is explained by v7.87: the black bar rode a 420ms animation, which is why every
  earlier round screenshotted the end state and found a plausible-but-wrong static cause.
- **Two number collisions** were hiding real requests: his "? for keyboard shortcuts" and "THREE layouts
  exist" shared numbers with other entries and are now **#248** and **#249**.
- **A SECOND sweep on 16 Aug found three more, so do this every session, not once.** #93 and #97 were
  both fully resolved in their own text and never ticked (#93: (a) did not reproduce, (b) was fixed in
  v7.32; #97: the coordinate half did not reproduce, the band was fixed in v7.35). And **#180's blocking
  question answered itself by measurement** — it had been waiting on him to say whether he saw it on
  COLOURED text, and measuring showed every effect works there, which closed the question without him.
  **The lesson: an entry that is "waiting on a word from him" is worth re-reading, because some of those
  words can be measured instead of asked for.**
- **The handover file itself was wrong about the queue.** It said "everything below #148 is blocked on
  him" and listed three next builds; the real open list runs #179, #180, #183, #184, #187, #195, #202,
  #203, #205, #207–#218, #221, #223, #224, #228, #244, #248, #249. Get the queue from the grep, never
  from this file.

## Next builds, in order

**#204 (v8.06) and #180 (v8.07) are done.** The next builds are:

1. **#228 — `drift` and `orbit` eat a quarter of the frame at an edge.** Found by #93's own probe. They
   are the same three lines wiggle was before v7.32 (translate the finished plate, blit) and never got
   the expanded-plate fix, so at a frame edge they pull in empty space: worst 255, i.e. solid content
   against solid nothing, not a rounding difference. **The fix already exists and is proven** — it is
   what v7.32 did to wiggle. This is the most valuable open item that is not waiting on him.
2. **#244 — the add-menu drag.** Design corrected by measurement: the add menu and timeline are the SAME
   grid row, so "float over the canvas" is structural, not a preference.
3. **#248 / #249** — his two requests that were invisible behind number collisions.


## Also waiting on a word from him

**#148** (does the audio pop at a clip edge or mid-clip?), **#152** (keep or delete speech detection),
**#160** (person icons, four options — my read is (c)), **#114**, **#98**, **#129**. None of these hold
the queue.

## Things that cost hours — read before repeating them

- **A probe is not a guard.** Probe pages REPORT; suite tests ASSERT. Twice on 16 Aug a "mutation check"
  ran through a probe, the probe printed the same thing with the code broken and fixed, and I read that
  as a pass — once for the pan clamp, once for an overlay claim. If a behaviour matters, it needs a test
  in `tests/tests.js` that goes red. Use probes to find things out, never to prove them.
- **Run the CONTROL assertion first.** A test that cannot see the defect proves nothing. Twice today an
  assertion passed against the bug it was written for.
- **A stale entry is a real category.** Five items this run were already done and never ticked (#37,
  #147's first half, #155, #93's headline, #164). Working the list in order is what finds them —
  remembering never does.
- **My own recorded conclusions have been confidently wrong.** #93's "not bit-exact", #47's "segmented
  export is the only way", #215's library-re-add lead. Measure before inheriting a claim from this file.
- **Two contradictory records is worse than none.** #234 shipped wrong for weeks because #169 recorded
  the opposite of what v5.25 built and nobody compared them. Both were written down.
- **Measure the layout you ship to, not the one you have open.** v7.79's export bug shipped because I
  checked Classic and he uses Studio. The test now checks both.
- **A fix can go stale.** v7.87's black bar was a *correct* 2024 fix (a flat ring matching a flat home)
  that broke when home gained light and grain. Ask what a guard is matching, not just whether it works.
- **The suite catches what the browser misses.** Three times today: a dead fill assertion, a
  double-firing slam, a layout-moving padding. Never skip the mutation check.

## The two flaky tests

**#222** (`key/cold-actually-shrinks`, ~1 in 5) and **#226** (the microphone one). Both pre-existing.
A red run that means nothing is worse than no test — they are worth fixing together.

## Before any public release

[BEFORE-PUBLISHING.md](BEFORE-PUBLISHING.md) — the UI is modelled on Alight Motion and must be made our
own first. Raise it if he mentions publishing, launching, the App Store, a demo or a tutorial. Do not
start the re-design unasked.
