# Overnight polish log
One line per shipped iteration — newest at the bottom. (Started when Ezra went to bed.)

- v2.31 — uid() now appends a random suffix: layer ids from different sessions can no longer collide, which could silently cross-link/destroy media between projects in the shared IndexedDB store.
- v2.32 — audio-only clips (mp3/wav) now show a music-note thumbnail in the timeline instead of a blank box.
- v2.33 — group selection box now hugs the members' actual bounds (was a meaningless 100px square at the corner); tapping grouped content on canvas selects the group as one object, and inside Edit Group the same tap picks the individual member.
- v2.34 — effect search now matches category names and ids too: typing "3d", "warp" or "blur" surfaces the whole family, not just effects with the word in their title.
