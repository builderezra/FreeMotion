| where | name | grows at (line) | trimmed at (line) | read? | bound | what it holds / size |
|---|---|---|---|---|---|---|
| js/addmenu.js:661 | `_page` | 662 | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/ai-budget.js:17 | `listeners` | 22 | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/ai-chat.js:45 | `messages` | 187,207 | 254,255,259,393 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/ai-chat.js:46 | `pendingResults` | 216 | 184 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/ai-panel.js:25 | `fields` | - | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/ai-panel.js:26 | `rows` | 214 | 198 | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/app.js:1511 | `_jobOpen` | 1554 | 1533,1561 | read | the depth of nested jobs; popped in a finally | a few entries |
| js/audio-fx.js:103 | `_crushCache` | 108 | - | read | ≤16 keys (bit depths 1-16) | curve tables, ~4 MB if all 16 are used |
| js/audio-fx.js:126 | `_irCache` | 151 | 150 | read | 13 entries (trim at audio-fx.js:150) | stereo reverb impulse: sr x decay x 2 x 4 B each |
| js/audio-fx.js:166 | `_lfoCache` | 177 | 176 | read | 13 entries (trim :176) | mono LFO table |
| js/audio-fx.js:439 | `DEFS` | 468,526,849,988 | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/audio-fx.js:1497 | `REG` | 1540 | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/audio-play.js:10 | `active` | 207,208 | 217 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/audio-play.js:11 | `chains` | 203 | 211,220 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/audio-play.js:12 | `voices` | 207,208 | 218 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/audio-play.js:13 | `limiters` | 194 | 222 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/behaviors.js:74 | `REG` | 75 | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/canvas-edit.js:265 | `vpPtrs` | 379,450,547 | 276,702 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-comments.js:43 | `CM` | 431 | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/collab-media.js:31 | `M` | - | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/collab-media.js:1356 | `UI` | - | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/collab-presence.js:54 | `PZ` | - | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/collab-presence.js:117 | `people` | 322 | 543,656,1409 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-presence.js:128 | `hp` | 448 | 543,1410 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-presence.js:129 | `hostDirty` | 423,496 | 593 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-presence.js:136 | `roster` | - | - | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-presence.js:145 | `boxPool` | 936 | 1408 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-presence.js:146 | `painted` | 1065,1075 | 1029 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-presence.js:149 | `bound` | 158 | 1401 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-qr.js:27 | `Q` | - | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/collab-signal.js:45 | `S` | - | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/collab-signal.js:461 | `DENY_WHY` | 462 | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/collab-signal.js:681 | `codeCache` | 693 | 689,694 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-ui.js:40 | `U` | - | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/collab-ui.js:57 | `knockQueue` | 4062 | 4071,4079,4086 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-ui.js:67 | `ridMid` | 2530 | 658,690,1276 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-ui.js:405 | `locks` | 422 | 431 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-ui.js:406 | `releasing` | 432 | 432 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-ui.js:2936 | `leftWhy` | 668 | 2971,2972,2976 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-ui.js:2937 | `removing` | 614 | 616,2971 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-ui.js:2938 | `downSaid` | 2959 | 2535,2869,2963,2971 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-ui.js:2941 | `byCode` | 2870 | 2531,2871 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/collab-ui.js:4153 | `askCards` | 4159 | 4161,4177 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/compositor.js:1672 | `_ckCanvases` | 1681 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:1720 | `_lkCanvases` | 1728 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:2123 | `_fxFilled` | 2164 | - | read (type) | weak: collected with its key |  |
| js/compositor.js:2371 | `_sampleCache` | 2396 | - | read | 64 entries then cleared (compositor.js:2396) | 36-sample colour list per image layer, ~300 B |
| js/compositor.js:3355 | `_pmPool` | 3357 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:3507 | `_mbPool` | 3615 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:3921 | `_PX_KEYS` | 3926 | - | read | one per effect type (≤206) | a short list of parameter keys, ~25 B |
| js/compositor.js:4286 | `_pfPool` | 4401 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:4492 | `_fcPool` | 4523 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:4790 | `_grainRms` | 4802 | 4801 | read | 256 then cleared (compositor.js:4801) | a number |
| js/compositor.js:4816 | `_grainBlurRms` | 4852 | 4851 | read | cleared at 256 (:4851) | a number |
| js/compositor.js:4864 | `_gsBuf` | 4865 | - | read | a few slots, grows to the longest line blurred | Float32 scratch, ≤ ~8 KB per slot |
| js/compositor.js:9135 | `_wpPool` | 9174,9443 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:9574 | `_sqPool` | 9931 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:10165 | `_dspPool` | 10177 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:11581 | `_cfPool` | 11775 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:11583 | `_expPool` | 11722,11743 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:11859 | `_t3Pool` | 11887 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:12043 | `_meshCache` | 12048 | - | read | one per 3D solid type (15) | mesh, ~8 KB measured |
| js/compositor.js:12249 | `_mflow` | 12259 | 12253,12258 | read | 12 layers (compositor.js:12256), cleared at export START and project open, not at export end | one full plate per layer: 8.3 MB at export size. See top-5 #3 |
| js/compositor.js:14605 | `_dfPool` | 14614 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:14923 | `_miPool` | 14941 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:15007 | `_pxPool` | 15023 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:15163 | `_fillImg` | 15180 | 15178 | read | the known #1009 case, trimmed in the H27 patch | decoded fill pictures |
| js/compositor.js:16680 | `_fbPool` | 16750 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:17089 | `_olPool` | 17106 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:17947 | `_adjFcPool` | 17963 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/compositor.js:18411 | `_mgPool` | 18420 | - | read (shape) | one entry per nesting depth, never freed | two plate-sized canvases per entry (up to 8.3 MB each at 1080x1920); see the pool section |
| js/draw-tool.js:182 | `dPtrs` | 232,262 | 279 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/draw-tool.js:454 | `strokes` | 320,328,529,534 | 519,529,534,699 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/draw-tool.js:457 | `sessionSubs` | - | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/draw-tool.js:468 | `brushOf` | 321,331,652,964 | - | read (type) | weak: collected with its key |  |
| js/draw-tool.js:486 | `histPast` | 488,563 | 557 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/exporter.js:171 | `_staleSeeks` | 204 | - | read | reset at the start of each export (exporter.js:215) | strings |
| js/exporter.js:865 | `_primingByEncoder` | 901 | - | read (type) | weak: collected with its key |  |
| js/exporter.js:1001 | `_tickQ` | 1005 | - | read | drained by the message handler on the next tick | a few promise resolvers |
| js/fx-browser.js:120 | `sheetRoots` | 150 | 152 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/fx-browser.js:349 | `_picked` | 484 | 484,517,1938,1968 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/fx-browser.js:430 | `_fadeRest` | 441 | - | read (type) | weak: collected with its key |  |
| js/fx-browser.js:962 | `_deadCache` | 1001,1017,1020,1023 | - | read | 400 entries then cleared (fx-browser.js:1031) | a string per (layer, effect) verdict, ~80 B |
| js/fx-registry.js:608 | `REG` | 610 | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/fx-thumbs.js:49 | `PHOTOS` | 53 | - | read | 18 photographs, fixed at load | 7.4 MB, constant |
| js/fx-thumbs.js:412 | `PHOTO_SUBJECT` | 413 | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/fx-thumbs.js:1028 | `cache` | 1581 | 1505,1798,1820 | read | NO CAP on sample tiles; 10 MB LRU on layer previews only (fx-thumbs.js:1488) | 83 MB after one pass through the 12 categories. See top-5 #1 |
| js/fx-thumbs.js:1029 | `warned` | 1066,1099,1125,1475 | - | read | one per effect type | a flag |
| js/fx-thumbs.js:1288 | `contribCk` | 1418 | 1417 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/fx-thumbs.js:1435 | `jobs` | 1079,1456 | 1087,1093,1098,1474 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/fx-thumbs.js:1490 | `layerKeys` | 1500,1508 | 1499,1502,1508,1798 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/fx-thumbs.js:1511 | `live` | 1528 | 1516,1532,1825 | read | tiles on screen; dropped when the canvas leaves the DOM (fx-thumbs.js:1517) | references to cache frames, no copy |
| js/fx-thumbs.js:1540 | `pendingQ` | 1675 | 1584,1823 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/fx-thumbs.js:1549 | `meta` | 1671 | 1505 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/fx-thumbs.js:1550 | `queue` | 1563,1675 | 1563,1580,1823 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/fx-thumbs.js:1646 | `mounted` | 1651 | 1653,1778 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/gl-warp.js:48 | `_progs` | 198 | 94 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/graph-editor.js:175 | `ezPts` | 260 | 238 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/history.js:10 | `stack` | 241,296,325,326 | 261,295,298,302 | read | 120 snapshots or 48 million chars (history.js:297-304) | measured 56 KB a snapshot for 40 layers x 6 effects: 6.8 MB for the full 120 |
| js/home.js:89 | `selected` | 1632,1633,1666,1679 | 1631,1666,1679,1696 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/home.js:1278 | `awayPids` | - | - | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/home.js:2508 | `shownIds` | 2579,2599,2614,2620 | 2544 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/inspector.js:2641 | `_fltPicks` | 2157 | 2157,2217 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/inspector.js:3100 | `_merged` | 3106 | 2250,3116 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/masks.js:33 | `masks` | - | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/media.js:10 | `store` | 69 | 77 | read | one per live layer + pinned fx-thumb photos; released on delete and at snapshot discard (media.js:77, storage.js:2319) | by design the media itself; the fx-thumb pinned photos are 96x96 |
| js/media.js:19 | `pinned` | 73 | 78 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/medialib.js:31 | `memThumb` | 275,289 | 309,337 | read | one per library item; deleted with the item (medialib.js:309, 337) | ~10 KB dataURL each |
| js/medialib.js:59 | `inFlight` | 198 | 259 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/medialib.js:63 | `landed` | 253 | - | read | one per library tile tapped per project (medialib.js:253), never trimmed | a number each; bytes per hour |
| js/point-edit.js:18 | `cbs` | 388 | 389,465 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/scene.js:945 | `_spInt` | 964 | 966 | read | 24 entries (scene.js:966) | Float32 table 120 per clip-second, 24 KB per clip-minute |
| js/settings.js:73 | `listeners` | 1058 | - | not read in detail | fixed set filled at load (name and size pattern) |  |
| js/sfx.js:47 | `_seedUse` | 50 | - | read (type) | weak: collected with its key |  |
| js/sfx.js:675 | `_rendered` | 679,681 | 679,682,683 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/storage.js:310 | `_storeWarned` | 318 | 312 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/storage.js:511 | `_released` | 557 | 479,2525 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/storage.js:589 | `_stored` | 462,627 | 337 | read | one per layer saved this session, never trimmed | a layer id and a number, ~80 B |
| js/storage.js:590 | `_toldMissing` | 653 | - | read | one per missing clip per launch | an id |
| js/storage.js:594 | `_writing` | 595,596 | 596 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/storage.js:673 | `_saving` | 739 | 807 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/storage.js:677 | `_prevFiles` | 705,728 | - | read | one File per replaced clip per revision, NEVER trimmed (storage.js:705, 728) | a File handle (blob), RAM cost unmeasured; the IDB `prev:` copy is the boot sweep's. See top-5 #4 |
| js/storage.js:2261 | `_thumbCache` | 2262,2377,2380,2390 | 2263 | read | one per project in the library; deleted with it (storage.js:2263) | ~10 KB dataURL each; a 300-project library is ~3 MB |
| js/storage.js:3644 | `_fontReg` | 3687,3702,3751 | 3708,3715,3754 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/tilefit.js:202 | `_wordCache` | 217 | - | read | one per (font, word) measured | a number, ~100 B |
| js/timeline.js:412 | `heldPointers` | 424,436 | 420,425,428,436 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/timeline.js:546 | `stripCache` | 2143,2174 | 2144,2175 | read | 40 entries (timeline.js:2144, 2175) | a filmstrip canvas ~40 KB; ~1.6 MB at the cap |
| js/timeline.js:632 | `rebuiltFns` | 4817 | 4818 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/tracker.js:154 | `_tickQ` | 158 | - | read | drained by the message handler on the next tick | a few promise resolvers |
| js/variant.js:32 | `forced` | 63 | 62 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/voice-rec.js:76 | `ui` | - | - | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/voice-rec.js:77 | `micTracks` | - | - | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |
| js/voice-rec.js:78 | `chunks` | 625 | 458,583,618,680 | not read in detail | session, gesture or collab state (name and trim sites only) | small records keyed by a person, pointer or sheet |