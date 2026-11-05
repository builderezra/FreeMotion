# #1079 — the add row in the phone's solo view (built 6 Nov, not shipped)

Drawn above the selected clip with no grip; a tap opens the Add menu. Taken out of v18.21 because it pushes the clip down
one row and the docked clip options lose that row (251 px of 760), where #835's test holds his words "Make sure that menu
still opens up fully and covers the same area it does now".

- `solo-add-row.patch` — the change, on top of v18.21 (`patch -p1 < solo-add-row.patch`), including the dock cap that kept
  the clip clear of the sheet on a 320x640 phone.
- `test-1079.js` — its test, as it stood (380, and 320x640 through atSize921).
- `solo-row-380.png`, `solo-row-320x640.png` — what it looked like.

Next: options that keep Add reachable without taking the menu's room (REQUESTS.md #1079).
