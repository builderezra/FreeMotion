# Overnight polish log
One line per shipped iteration — newest at the bottom. (Started when Ezra went to bed.)

- v2.31 — uid() now appends a random suffix: layer ids from different sessions can no longer collide, which could silently cross-link/destroy media between projects in the shared IndexedDB store.
- v2.32 — audio-only clips (mp3/wav) now show a music-note thumbnail in the timeline instead of a blank box.
- v2.33 — group selection box now hugs the members' actual bounds (was a meaningless 100px square at the corner); tapping grouped content on canvas selects the group as one object, and inside Edit Group the same tap picks the individual member.
- v2.34 — effect search now matches category names and ids too: typing "3d", "warp" or "blur" surfaces the whole family, not just effects with the word in their title.
- v2.35 — Wiggle/Drift/Orbit/Tiles/Raster-Extrude skip the per-frame full-canvas pixel scan they never used: those effects now cost a fraction of what they did during playback.
- v2.36 — home-screen project cards show their layer count in the meta line (fills in as each project is next opened/saved).
