# PRE3c: cloud pre-flight of wip/v17.40-tree f74966dd (the Full batch B1: ChatGPT's 14 commits + 4 land-list fixes + 6 tests + AU25; 2384 tests)

**Verdict: no red is new on this tree, all 22 tests it adds are green at both widths, and both mutation proofs are CAUGHT.** Reference: main d55cabc8 (v17.37). Driver: the tree's own `tests/_cdp.py` (one `FM_NO_REAP` line in a copy), headless Chromium on Linux; the suite in slices, the tail in chunks of 40 with a stall watchdog; each red alone, paired with its predecessor (`after=<the test two before>&upto=<the red>`, so the predecessor runs) and alone on main.

## 1. Static check (before any browser)

`index.html` against main: 0 script tags dropped, `js/spine-edit.js` and `js/simple-tools.js` added, no `js/*.js` file without a tag except `fx-registry.js` (the same on main), 0 `?v=` lower than main's. (The earlier `storage.js` 60→59 slip is gone.)

## 2. Counts
- **1280: 2386 ran, 50 red, 95 NOT RUN HERE.  380: 2386 ran, 51 red, 94 NOT RUN HERE.** 2 of the red are driver hangs at both widths (the two export tests `690 swiping the share sheet away after Save…` and `690 an export holds the screen awake…`; no H.264 here; skipped and counted red-by-hang).
- The red set equals the v17.38 (76f4a1b9) red set exactly, at 1280. At 380 one extra: `482 6.7 Glow Scan - a scan that sweeps Once or waits between sweeps…`, which is red on v17.38 and on main alone too (class C below), so it is not this tree's.

## 3. The 22 tests that exist only on this tree: ALL GREEN at 1280 and 380

- 14 `690 …` import/restore tests (malformed project dimensions, invalid project/layer refused before import, corrupt embedded clip/font named, deeply nested files, shared template names oversized clips/fonts, project file names a video whose source media is gone, the completed import keeps its warning, Replace media cancels a decoded file when its project was switched), `690 Remove Vocals instrumental follows source Speed while retaining one undo step and independent retimes`, `690 rebuilding a long caption list does not keep another document listener per cue`, `690 service worker keeps offline cache writes alive after network responses`;
- 6 `1069 B1: …` tests (saving the open project reads an undecoded photo from the device; a whole backup holds fonts to the size limit; a template file names an unreadable font; an embedded font that cannot be fetched is counted and the import goes on; the two `Remove Vocals` tests, split and trim/move);
- `AU25-1`, `AU25-2`.

## 4. The reds, classified (1280; 380 is the same set)

| class | what | count |
|---|---|---|
| C | red on main alone too: no H.264/H.265 here (`NO_VIDEO_CODEC`, `VideoEncoder … closed codec`, `splash.mp4 did not decode`), the 4× CPU throttle and a real camera the driver cannot give, no layer to work from in 3 Presets tests, clapper animation tests, Glow Scan, Motion Blur/Echo picture checks | 45 |
| P | `home push: the press answers the tap…`: green alone (1280 and 380), green on main alone; **RED paired with its predecessor** `home push: the editor’s body-level chrome travels with the editor, not with itself` (`the parked editor sits at x=40 in a 900px viewport`). Same on main v17.36 in my container (bisected there, predecessor is the polluter); the builder says it passes on the laptop and H56 ties it to my Chromium keeping paused animations | 1 |
| D | `playhead: a rebuild during the return-to-home pop…`, `921 S3 Stop sharing revokes the code…`, `981 review: with less motion the add menu arrives on its plain 220 ms slide…`: green alone, paired and on main alone at both widths; red only inside the full pass. The first two also red in my full pass on main v17.36 and bisected there to their polluters (`home push: the editor’s body-level chrome…` and `921 S3 the Share panel and the Join sheet fit a 380px phone…`) | 3 |

None of these is new on this tree (each is green on main alone or red on main too). Not measured here: the NOT RUN HERE tests (real finger, AAC, H.264), H.264 export, the 2 hangs.

## 5. The two mutation proofs prove.sh cannot see (on a copy, restored after each)

The unmutated slice `?only=1069 B1: Remove Vocals` is **green first** at 1280 and 380 (2 of 2). Then:

- **M1 — delete the split-guard line `if (source.splitOf && FM.scene.layers.some(…` in js/audio-tools.js: CAUGHT** at both widths. The split test goes RED (`the instrumental was cut down to the head half (start 1, length 2) — after the cut the muted song plays nothing`); the trim/move test stays green.
- **M2 — `const ratio = oldDur > 0 ? source.duration / oldDur : 1;` and `if (FM.animatedProps && …` (speedChanged/moved dropped): CAUGHT** at both widths. The trim/move test goes RED (`a trim squeezed the instrumental's volume keyframes to 1.375, 3.625 — they should stay at 1.5, 4.5`); the split test stays green.
- The file was restored byte for byte after each (checked).

DONE: PRE3c preflight-v17.40 — f74966dd at 1280 and 380: 2386 ran (2384 + 2 hang entries), 50/51 red, 0 new on the tree, the 22 new tests green, M1 and M2 CAUGHT.
