# Handoff from the index.html fix (29 Sep)

Defect fixed in `index.html` only: on a phone every page started about 1,420 px down (2,200 px on a first visit).

What index.html now does, in its own `<style>` and a small `<script>` after the v*.js tags:

- **Beach day is a one-line card** (`#vis-sample-fold`, a button plus a `hidden` section `#vis-sample`), folded on every load at every width. Opening it clicks the pressed Quick/Full button so `initSample` redraws at the real width.
  A `<details>` was tried first and dropped: the phone frame drawn inside a closed `<details>` fired "ResizeObserver loop completed with undelivered notifications" on every load.
- **The page list starts folded on a phone every time**, first visit included. This overrides `kit.js` line ~1438 (`details.open = wide.matches || !store('vis.open')`) after boot.
- **The header is tighter below 700 px** (spacing only; no words changed).

Optional tidy-up for whoever owns `kit.js` / `kit.css` (not needed for the fix):

1. `kit.js` initHub: change the phone default to `details.open = wide.matches;` and delete `foldList()` from index.html.
2. `kit.css`: `.h-sample h2` is now unused by the hub; the `.h-fold*` rules could move here from index.html's `<style>`.
