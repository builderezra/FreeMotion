# B54 Spill Suppressor — local build report

Starting commit: `5a5c03919d81f7d867dc2ed6c396a3b16005c71e` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (catalogue, effect routing and pixel kernel), `js/fx-registry.js` (Keying category, description and search), `index.html` (script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Spill Suppressor can follow either chroma key in the effect stack. It reduces the selected screen colour's excess channel according to chroma hue, with strength, hue range and whole-subject/soft-edge controls. It preserves alpha and other colour channels, so it does not change the matte. It can also be used on an unkeyed layer, but naturally green or blue content within the chosen hue range may change. The existing keys' despill controls remain unchanged.

Read: B54 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1267`; the standing #690 request at `REQUESTS.md:27376-27403`; the already-shipped Chroma Key despill item at `REQUESTS.md:32178` and its Chroma Key Pro correction at `REQUESTS.md:34409`. No duplicate standalone Spill Suppressor was found in `REQUESTS.md` or `audits/*.json`.

Ran: JavaScriptCore loaded the production compositor and registry and passed one focused kernel probe for green and blue keys, opaque/soft-edge selection, transparent pixels and alpha preservation. JavaScriptCore parsed the saved test source; `git diff --check` passed. Browser rendering, crop admission and iPhone appearance remain unverified. The effect deliberately stays on the full-frame path until crop equivalence is confirmed.

B52 Log to Normal and B53 Deflicker remain open. B52 needs exact camera colour-space transforms or approved manufacturer LUTs for every named camera; a generic contrast curve would mislabel footage. B53 needs a look-ahead or bounded multi-frame analysis route to avoid changing normal scene cuts while removing flicker.
