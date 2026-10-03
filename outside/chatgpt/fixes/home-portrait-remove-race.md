# Removing a Home portrait wins over a slow replacement

Starting commit: `1fdd128b` on local `chatgpt/690-continuation`. Nothing pushed.

Read: The Home photo picker cropped an image asynchronously and then stored it without checking whether the user had removed the existing portrait meanwhile. The late replacement could reappear after Remove. This local portrait was introduced for Ezra's 3 Oct Home reference request; the existing portrait test covered only sequential choose/remove.

Changed: `js/home.js` checks each choose/remove action's version after cropping, orders photo writes so a later removal follows any earlier save, and keeps photo reads from invalidating an in-progress user action. `tests/tests.js` adds one focused `{ item: 'TBD' }` regression that pauses the replacement crop, removes the old portrait, then releases the crop and checks both the button and IndexedDB. `index.html` advances the Home script cache tag.

Ran: The new race regression and existing portrait control passed together in a focused browser run (2/2). JavaScriptCore parsed the changed scripts; `git diff --check` passed. Actual iPhone picker timing remains unverified.
