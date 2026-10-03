# Home layout from Ezra's phone reference

Starting commit: `746d53a8fd175a319c656b6c46adb160d9cac2da`.

The Home header now places Settings on the left, the FreeMotion wordmark at the screen centre, and Search plus a local profile button on the right. The profile menu uses the existing local name and colour and provides the Join, profile-edit and Settings actions; related collaboration help now points to that Join route. On phones, Projects, Templates, Elements and Tutorials form a compact bottom dock around the existing New button. Each card type can enter bulk selection from its three-dot menu, with a visible Cancel in the selection bar. As a long list scrolls, its top edge fades over 32 CSS pixels so departing cards leave cleanly. Reduced-motion preference disables the fade.

Changed: `index.html`, `styles.css`, `js/home.js`, `js/collab-ui.js`, one focused `{ item: 'TBD' }` regression and updated superseded Home/Join expectations in `tests/tests.js`, and this report. The changed CSS and script cache tags were bumped in `index.html`.

Checks run: the focused Home reference regression and updated #950 phone-selection regression each passed (1/1); 390px and 320px phone layouts were visually inspected in a local browser; JavaScriptCore syntax parsing and `git diff --check` passed. Actual installed-iPhone appearance and gesture feel remain UNVERIFIED. The profile circle shows local initials when a name is set, not an account photo.

Follow-up after Ezra re-sent the same reference (starting commit `b38e3d8f`): the phone header controls now line up more closely with the image, the hard header divider is gone, and the empty-state wording is smaller and slightly lower. A full-draw capture confirmed that the existing animated arrow finishes pointing at New; the earlier preview caught it mid-animation. Changed `styles.css`, its `index.html` cache tag and the focused Home regression. The Home regression passed (1/1); the final 390px layout was inspected; JavaScriptCore syntax and `git diff --check` passed.
