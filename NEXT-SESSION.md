# Next session — the open queue

Rewritten 2026-08-07 at the end of the v4.30 session. **Everything above v4.09 is committed locally
and NOT pushed** — Ezra pushes via GitHub Desktop. Twenty-one releases are waiting (v4.10 → v4.30).

Work the list top-to-bottom; it is in the order Ezra asked for the items.

---

## 1. Shape clips should take the shape's colour

A shape layer's clip in the timeline should be tinted with that shape's own fill, so the track reads
at a glance instead of every clip being the same teal.

Where: `js/timeline.js` builds the clip bar; `layer.clipColor` already exists as a manual colour tag
(set from the layer ⋯ menu) and `styles.css` has the `.clip` background. The fill lives at
`layer.fill` for parametric shapes. Decide what wins when a manual `clipColor` is also set — the
manual tag should, since it was chosen deliberately.

## 2. Tiles: the mirror toggle can't be turned back on

Ezra: *"the button in the title to make it mirror or not isn't working, if you press it it stops
mirroring but then you can't undo it."* So the toggle is one-way. Look at the Tiles entry in
`js/compositor.js` (`FM.EFFECTS` schema + the `tiles` pixel fn) and at how a `def: 0` option param
round-trips through the inspector's `segRow` — a falsy value being treated as "absent" and falling
back to the ON default is the obvious suspect.

## 3. Tiles should repeat past the visible frame

Ezra: *"currently how you have the tiles will only make the tiles for what's on screen… if I drag the
clip down it will just make repeat a short sliver of it, because that's what's on screen."* Tiles
samples the composited frame, so anything off-frame is already gone by the time it runs. Needs an
option that repeats the layer's own content rather than the visible crop — i.e. render the layer to
its own plate first (the `drawTint` / `drawFogLayer` pattern in compositor.js) and tile THAT.

## 4. The two motion blurs — separate them, and fix the broken one  ← the big one

Ezra: *"there's two motion blur effects, one should only affect what's happening in the video, like if
I upload a video it will apply the motion blur very well to the content of the video, and if I were to
drag the clip around it wouldn't affect it. And then the other one for when you drag the clip around
that doesn't read what's inside the clip. Now they honestly need a lot of work, the normal one that
isn't just for the content currently is broken asf."*

Two systems that currently overlap:
- **Content motion blur** — reads movement *inside* the footage. Must ignore the clip's own transform.
  `drawContentMotionBlur` in `js/compositor.js`.
- **Transform motion blur** — reads the clip's own movement (position/rotation/scale keyframes). Must
  ignore the footage. `drawMotionBlur` in `js/compositor.js`; `layer.motionBlur` is the flag.

Do a real investigation before editing — this is the one item on the list that deserves a proper
look rather than a patch. Then make which-is-which obvious in the UI (they are currently both just
"motion blur" to a user).

## 5. Effect descriptions + tags, shown on hold and searchable

Every effect gets a description and tags, shown in the panel that appears when you HOLD an effect
tile in the Add Effect browser (Ezra supplied a reference screenshot: name, a sentence, a row of
tag chips). Searching the browser should then match descriptions and tags, not just names.

Where: `js/fx-registry.js` holds the catalogue metadata (`CATEGORY_OF`, `FX_FEATURED`); the browser
and its search are `js/fx-browser.js`. `FM.EFFECT_PRESETS` in `js/fx-presets.js` already carries a
`desc` field per preset — the same idea, one level up. 175 effects need writing up; consider doing it
in batches by category so it can be checked as it goes.

---

## Long-standing, not blocked on Ezra

- **EFFECTS-PLAN.md rounds** — the standing autonomous order. Nine rounds shipped (v3.87 → v4.13);
  round 10 starts from the proposal table in that file. The byte-identity rule and the three-gate
  harness are documented at the top of it, including the two traps that have caught me: `params:{}`
  renders at the LEGACY default (use `FM.fxRegistry.makeInstance`), and `makeInstance` stamps schema
  `def`s so a new instance can differ from an old one — decide that deliberately each time.

## Blocked on Ezra

- **The + button centring on mobile.** Cannot reproduce — measured 0.00px off centre at 375px in both
  themes. Needs a screenshot of what he's actually seeing.

---

## House rules (from CLAUDE.md — non-negotiable)

Vanilla HTML/CSS/JS, no build step. Mobile-first, verify at ~380px in the browser preview without
being asked. Verify then claim. Bump `index.html`'s version label + the `?v=` cache-busters on every
touched file + a POLISH-LOG.md entry per release. Commit locally; **never push**. Raise
BEFORE-PUBLISHING.md whenever publishing comes up. Add any new AM-modelled screen to that file's list
as you build it.
