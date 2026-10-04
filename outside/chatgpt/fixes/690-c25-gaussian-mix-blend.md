# #690 / C25 Gaussian Blur mix and blend

Starting commit: `061581f0a29ffa3d282d3585454b16fee7073d9e` (`codex/690-reviewed-local`).

Gaussian Blur gains Mix (0–100%) and Blend (Normal, Screen, Soft light). Non-default settings run as an ordered plate pass; saved/default Blur remains on its existing CSS path. Normal Mix interpolates premultiplied colour and alpha, including transparent blur edges. Screen and Soft light combine the blurred result with the source for the requested Orton-style looks. The inspector notes that these controls follow stack order.

Changed: `js/compositor.js`, `index.html` (compositor cache 311), `tests/tests.js` (one `TBD` regression), this report.

Checks: new Mix/Blend browser regression and existing Gaussian Repeat regression passed 2/2 in native Chromium; JavaScriptCore syntax and `git diff --check` passed. No shared Claude checkout, protected file, push, PR or deployment touched.
