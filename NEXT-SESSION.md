# Where things are — written at v7.91, 15 Aug

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

## What shipped this run — v7.73 → v7.91

| | |
|---|---|
| 7.73 | PC: the notes button joins the transport row (v7.52 left it behind) |
| 7.74 | PC multi-select: three big align buttons; the playhead trio now means the whole selection |
| 7.75 | PC: the name field comes off the header onto the row |
| 7.76 | Home grain: 64px tile → 256 (it was repeating 76× and reading as a grid); cards get a backdrop blur |
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
| 7.87 | **The black bar was the slam's own ring** — see below |
| 7.88 | The cog turns when pressed |
| 7.89 | The three selection buttons wear a shared ground |
| 7.90 | Export names any clip it could not read, instead of dropping it in silence |
| 7.91 | …and says when the browser cannot encode AAC, which drops the whole mix |

Suite: **365/365** at v7.91.

## What is open, in the order to do it

1. **#215 — export with no audio.** The most serious item in the file: the app produces silently wrong
   output. He gave the first reproduction on 15 Aug (fresh project + sound effects + default settings).
   v7.90 and v7.91 did not fix it — they made the two silent failure paths *speak*, so the next time it
   happens the app says which half broke. **Three outcomes are now distinguishable:** a toast naming a
   clip = the mixer; the AAC toast = the encoder; **neither toast and still a silent file = the muxer**,
   which is the last place left to look and the next thing to read. A dead lead is recorded in the entry
   (library re-adds go through the identical path as imports) — do not re-derive it.
2. **#241 (b)(c)** — the Canvas settings panel anchored to the cog, cog kept out of its own blur.
   **Read the entry first:** inside a project the cog does *not* open App settings, it forwards to
   `#btn-canvas`. Anchoring the wrong panel would look like nothing changed.
3. **#243** — a new benchmark should turn the timecode chip yellow immediately, not after you leave and
   come back.
4. **#244** — drag the add menu independently of the timeline, with a snap where they meet. He asked for
   this one to go at the bottom. It is groundwork for a bigger effects-browser plan; read the entry.
5. **#245** — home tab buttons need the cards' no-grain treatment, **and the grain reads as static**.
   That second half is my own regression: v7.76 cut six noise tiles to two, and two tiles can only
   cross-fade A→B→A→B, which the eye learns in about a second. He is also inviting a rethink of the
   texture entirely — the entry weighs three options.
6. **#246** — the v7.85 add-menu background must reach the menu's borders; it is on the content box, not
   the bordered region. **Do not fix it with padding** — v7.85 already learned that gives the inspector a
   scrollbar, and two tests catch it.
7. **#247** — opening the export menu should pause playback.

Then back to oldest-first in the older queue.

## Still waiting on a word from him

**#148** (does the audio pop at a clip edge or mid-clip?), **#152** (keep or delete speech detection),
**#160** (person icons, four options — my read is (c)), **#114**, **#98**, **#129**. None of these hold
the queue.

## Things that cost hours — read before repeating them

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
