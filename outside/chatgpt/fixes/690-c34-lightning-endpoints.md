# #690 / C34 — Lightning controls

Started from clean preferred commit `e16d69594db9c7448ecc83a6022746e120652947` in the isolated `codex/690-lightning-c34` clone. The #690 request, #320 lightning look, #403 layer-alpha gate, #904 strike angle, and backlog C34 / §11.6 were checked before implementation. No matching Lightning audit JSON was present.

Lightning now offers a point-to-point path with editable start/end percentages, glow width/intensity, an independently chosen core colour, path segments, and opt-in **Draw on: Everywhere**. The previous downward path and arbitrary strike angle remain available. New instances default to Down the layer, Glow 100%, Segments 20, and Layer pixels. An untouched Core colour follows the Glow colour through the original 80%-toward-white calculation, including on saved effects; the picker shows that effective colour. Choosing a core makes it independent. Everywhere uses source-over blending so a bolt can add alpha on a transparent layer; the default still clips RGB and alpha to the layer's existing pixels.

Files changed: `js/compositor.js` (controls and kernel), `js/inspector.js` (effective followed-core swatch), `index.html` (compositor cache tag 278 → 279 and inspector 415 → 416), and `tests/tests.js` (one focused `{item:'TBD'}` regression). This report is the only other file. No protected request, inbox, log, or `tools/` file was edited.

Focused browser checks on localhost with the isolated clone:

- `?only=690%20C34`: Regression 1/1 passed. It checks controls/defaults, saved-path byte identity before and after saved-parameter filling with a nondefault Glow colour, transparent-layer default no-op, the layer gate, selected endpoints, core colour, glow width, and segment detail.
- `?only=Lightning%20strikes%20the%20layer`: existing #403 layer-bound regression 1/1 passed.

JavaScript syntax parsing and `git diff --check` passed. No broad suite or release action was run. The starting snapshot's other pending work is outside this change.

Consolidated local integration: cherry-picked onto clean `d8f4998b` as `545389fa`, then raised the compositor cache tag to 280 because Glow Scan had already used 279. The focused C34 browser regression passed 1/1 in that checkpoint; an initial app-frame load omitted `renderScene` before assertions, and the warm retry passed. Changed JavaScript syntax and diff checks passed. This remains local and unreleased.
