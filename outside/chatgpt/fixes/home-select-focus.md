# Home selection keeps keyboard focus

Starting commit: `ee15f89da1ba0ef04eb5990ac80aaab2fd7fcf72` on `chatgpt/home-ui-release`.

Opening **Select…** from a project menu rebuilt the card that held keyboard focus. The user could enter selection but focus fell back to the document instead of the available selection controls. `enterSelect` now focuses the visible Cancel control after rendering. The Home keyboard-menu regression checks that handoff.

Changed: `js/home.js`, its cache tag in `index.html`, and one focused assertion in `tests/tests.js`.

Checks run: the focused keyboard-menu browser test passed at 390×844 and 1280×900; JavaScript syntax and diff whitespace were checked. A physical iPhone keyboard was not available.
