# #863's work — built, tested, PARKED (not shipped in v16.17)

Queue order (12 Sep): #863 is a hunt/audit finding, so it sorts behind #865 (his own words, from
INBOX) regardless of number. #865 is unaddressed and real work (a live-sync bug reported three
times), so #863 was held back rather than jumped, and #864 shipped alone as v16.17.

**Nothing here was lost or is at risk** — it's saved as plain files so whoever works #865 next can
drop #863 back in and ship both together in one release.

## To restore

```bash
git apply tools/held-863/fx-browser.patch
```

Then paste `tools/held-863/863-test.js`'s contents into `tests/tests.js` near the other queue-8xx
effect tests, bump `js/fx-browser.js?v=` in index.html, tick #863 in REQUESTS.md again, and delete
this whole `tools/held-863/` folder once it ships — it's scaffolding, not a permanent fixture.

- `fx-browser.patch` — the fix itself: `cannotMove()` in js/fx-browser.js no longer treats a still
  IMAGE like a VIDEO (an image never moves; a video's picture changes frame to frame even when the
  layer itself is static). One-line fix plus its guarding comment.
- `863-test-clean.js` — the test, self-contained, 51 lines, ready to paste back into tests/tests.js
  near the other queue-8xx effect tests. Two controls: animating the photo must clear the badge, and
  a VIDEO layer must never get it.
- `863-test.js` — the RAW extraction before it was trimmed to the clean block above. Kept only as a
  paper trail of the mistake that produced it (see note below) — use `863-test-clean.js`, not this.

⚠️ **A note for whoever reads this next, because it's worth knowing:** the first attempt to split
this out grabbed everything between the START of this test and the START of #864's test as one
contiguous block — 9408 lines — because the two tests are NOT adjacent in tests.js (#863 sits near
its topical neighbours mid-file; #864 was appended at the tail). That would have deleted roughly
9000 lines of unrelated, working tests had it been committed. Caught before shipping by checking the
extracted line count against the diff's own `+178 insertions` — a number nine thousand lines off the
diff stat is not a small test. Nothing was committed at any point during this; `git checkout --` was
sufficient every time. The lesson, if it needs restating: two non-adjacent insertions in one file can
never be treated as one span — extract each by its own opening AND closing anchor.

## index.html

Its `js/fx-browser.js?v=85` cache-buster needs bumping to `?v=86` (or whatever it is by the time this
is picked up) when this ships — it was bumped and then reverted along with the file tonight.

## REQUESTS.md

Entry #863 is back to `[ ]` (open) with its ✅ DONE claim removed, since none of this shipped. The
descriptive text is otherwise accurate and doesn't need rewriting — just re-tick it and re-add the
version stamp once it actually ships.
