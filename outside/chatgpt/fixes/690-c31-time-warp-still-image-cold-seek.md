# #690/C31 — Time Warp Scan still-image cold seeks

Starting commit: `0ee40ea0ea1bfe363e0a2a5851e37ac00809d7ea`.

A moving decoded still image could leave Time Warp Scan's frozen region painted with its picture at the playhead after a jump. The still image itself is immutable and synchronously available, so an otherwise simple image layer can now redraw the cropped strip at each historical crossing time. This deliberately excludes video, active upstream/downstream effects, image crop, masks, behavior-driven sources and complex parents.

Changed files: `js/compositor.js` (narrow still-image eligibility), `js/exporter.js` (main MP4 resume identity for image scans), `index.html` (compositor 295/exporter 134 cache tags), `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Checks: the new decoded-ImageBitmap regression passed for Freeze/Reveal at full and half preview sizes, proved the moving live image differs from the scan, and checked the main MP4 resume identity. The existing simple-shape scan/export-resume regression passed. Changed JavaScript syntax and `git diff --check` passed. One browser launch omitted app scripts and was retried; no broad suite ran.

Historical video decoding remains a separate C31 problem; this fix does not claim video cold-seek or release readiness.
