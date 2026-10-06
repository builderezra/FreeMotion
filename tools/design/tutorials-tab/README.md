# A home for the 20 tutorials (D2)

Against `origin/main` b46b47d (v17.23). Mockups and a plan only: no app code changed. Open the three HTML files in a browser. Each shows the phone list, the phone reader and the 1280 px computer view, drawn with the app's real tokens from `styles.css :root`. The mockups use real tutorial text but are drawn, not captured from the app.

## Today (verified)

The Tutorials tab exists and is a placeholder: `js/home.js:2601-2605` draws one empty state ("Tutorials are coming"), `js/home.js:1704` says nothing on that tab is selectable, and the round + is hidden there (`js/home.js:2557`). The tab itself is in `index.html:704-708`. Home keeps its content in a 700 px column (`--hm-col`, `styles.css:5058`), and on a phone the four tabs share one row (`styles.css:5064-5071`).

## The three layouts

| | Layout | Strength | Cost |
|---|---|---|---|
| **A** (recommended) | [Cards](A-cards.html): the same card grid as Projects, Templates and Elements; a reader per tutorial with Previous and Next | Matches the other three tabs; the existing Home search already filters by name; least new code | No progress memory; 20 cards is a lot to scan |
| B | [Learning path](B-path.html): grouped, ordered list with ticks and a progress bar; the reader shows one step at a time | Best for a true beginner; the only layout that uses a wide screen well (list left, article right) | Most code: progress storage, group data, a step viewer, the Markdown cut into steps |
| C | [Search first](C-search.html): a search box with topic chips; results with the matching words highlighted | Fast for "how do I export" | Slow for someone who does not know what to ask; needs a text index of all 20 files |

**Recommended: A, with two small borrowings.** The "Start here" ribbon on tutorial 1 (from B) and Previous and Next in the reader. Reasons: it is the smallest change that makes the tab real; it looks like everything else on Home, which is his stated taste; search is already there (the magnifier on Home); and B's progress ticks can be added later without redoing anything (they are a `localStorage` key and a tick on each card).

## How the Markdown would load (vanilla JS, no build step)

1. **A list, written by hand:** `tutorials/index.json`, an array of `{ "file": "01-first-video.md", "title": "Make your first video", "group": "Start", "mins": 2 }`. Twenty lines; a test can assert every file in `tutorials/` is listed and every entry exists.
2. **Fetch on demand:** the list when the tab opens, one `.md` when a card is tapped. 20 files are **54 KB in total** (33 KB of readable text), so nothing needs lazy-loading beyond that.
3. **A 60-line renderer** in a new `js/tutorials.js`, supporting only what the files use: `# title`, a paragraph, `1.` numbered steps, `**bold**`, and the three lead-ins `Tip:`, `If it doesn't work:`, `On a computer:` which become the coloured notes in the mockups. It builds DOM nodes with `textContent` only, **never `innerHTML`**, so a file can never inject markup.
4. **Two things the renderer must strip (verified in the current files):** the `<!-- … -->` comments that tutorials 01 to 06 carry after each step (they hold the file:line citations; 15 in file 01 alone), and everything from `### Verification` down (the table). Tutorials 07 to 20 have the table but no comments.
5. **Offline:** the service worker caches same-origin GETs only when they carry `?v=` (`sw.js`, `isVersionedAsset`; anything without it goes to the network, so a bare `tutorials/01-first-video.md` would not work on a train). So fetch `tutorials/01-first-video.md?v=<version>` using the same version the page already uses for its scripts, and the lessons are cached on first read like every script. One caveat: the service worker's clean-up only judges paths the page names in its own HTML (`sw.js` cache clean-up), so old `.md` versions are never evicted; 54 KB per version is small but not zero.
6. **The tab:** replace the placeholder at `js/home.js:2601`; reuse `emptyState` (`js/home.js:1722`) for a failed fetch ("Couldn't load tutorials. Check your connection."), and the card markup from `templateCard` (`js/home.js:1985`) for the grid (no ⋯ button, since a tutorial has no actions).

## Things to decide with Ezra (no code until he picks, per #545)

1. A, B or C (or A plus B's progress ticks).
2. Groups and order, if B: a proposal is Start (1, 2, 5, 6, 9), Look (3, 7, 15, 16), Move (4, 8, 20), Make (11, 12, 13, 14), Share and manage (10, 17, 18, 19).
3. Pictures: the files are text only. A small image per step would help a beginner most, but it is the largest piece of work (each needs capturing at 380 px and re-capturing when the UI changes, which it does every release).
4. Whether the Tutorials tab should be first for a brand-new user with no projects.

## Risks

- **Wrong labels after a release.** The tutorials cite exact on-screen words; a rename elsewhere makes a lesson wrong. A test could read each tutorial's bold button names and assert each still exists in the source (the verification tables already list the lines).
- **The tutorials are on a branch (`tutorials-drafts`), not in `main`.** They need to land in `tutorials/` on `main` before any of this works, and a reviewer should look at 07 to 20 first (07 to 10 were fixed after review; 11 to 20 have had no human review).

## Verified vs guess

Verified: the placeholder and its lines, the service-worker rule, the file sizes, the comments and tables in the files. Guess: that A is what he will pick; the group names; nothing about how it feels on a real phone.
