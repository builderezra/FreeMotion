# B31 Cartoon — local build report

Starting commit: `8437049886d079546084d7e7ce58f88098c2f1e3` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (catalogue, pixel kernel and reused scratch arrays), `js/fx-registry.js` (Stylize category and description), `index.html` (both script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Cartoon smooths fine colour texture without crossing strong luminance edges, quantizes shading into 2–12 bands, outlines detected edges and adjusts saturation. Edge width, threshold, edge colour and Mix are independent controls. Alpha is preserved, and Mix 0 returns the input unchanged. Large plates use a two-by-two working image for smoothing and edge detection, then map the result back to the output pixels; scratch arrays are reused across frames.

Read: B31 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1239`, #690 at `REQUESTS.md:27376-27403`, and existing Posterize, Find Edges and Smooth Edges kernels. Exact searches found no existing Cartoon video effect in `REQUESTS.md`, `audits/*.json`, or `js/*.js` on the starting snapshot; B4 in the same backlog is a separate *sound* category.

Ran: JavaScriptCore compiled the changed scripts and test source; one focused production-kernel probe confirmed neutral Mix, edge ink, shading change, alpha preservation and the large-plate branch. One timing probe after the last algorithm change took about 97 ms for a 720×1280 frame and 22 ms for a 300×540 reduced plate in JavaScriptCore on this Mac. Those are neither browser nor iPhone figures, and the effect remains relatively expensive. `git diff --check` passed. Browser visual quality and phone playback remain unverified.
