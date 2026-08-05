# FreeMotion — project notes for Claude

Vanilla HTML/CSS/JS, no build step, no framework. Local-only (localStorage + IndexedDB).
Mobile-first — verify at ~380px. `index.html`'s version label is the source of truth; bump it
plus the `?v=` cache-busters and add a POLISH-LOG.md entry per release. Commit locally; Ezra
pushes via GitHub Desktop.

## ⚠️ Standing reminder — raise this before ANY public release

**The UI is modelled on Alight Motion and must be made visually our own before publishing.**
See [BEFORE-PUBLISHING.md](BEFORE-PUBLISHING.md) for what was copied and what "done" means.

Trigger it whenever Ezra talks about publishing, launching, releasing, the App Store, a public
link, a demo video, or a tutorial series. Don't silently start the re-design — say the note
exists, what's outstanding, and let him decide when. It's deliberately not done yet: copying AM
was the fast way to build, and the app should be worth publishing before we spend time on identity.

Also: when adding a NEW screen or panel that's based on an Alight Motion screenshot, add it to the
list in BEFORE-PUBLISHING.md as you go, so the list stays honest.
