# Start from a template, and save your own

You'll be able to begin a new project from a ready-made one, and turn your own project into a template.

1. On Home, tap the **Templates** tab, the second one along. On a fresh install it is empty (it says **No templates yet**), so do step 5 first to save a template of your own.
2. On a template's card, tap the small three-dots button at the right and choose **New project from template**.
3. A screen called **Insert your Media** opens. It says **Tap a slot to make it yours**. Tap a slot, then choose **Replace Media** for a photo or video, or type under **Your words** for a title.
4. Tap **Done**. Your new project opens.
5. To save your own: tap the **Projects** tab, tap the three dots on the project's card and choose **Save as template…**. Type a name and tap **Save**.
6. To drop a template into a project you are already editing, tap the add row, open the **Template** tab and tap the template.
7. To get rid of one, open its three dots, choose **Delete template…** and tap **Delete**.

On a computer: the same. Click instead of tap. <!-- not walked: the walk was the 380 px phone layout only -->

Tip: **Save template file…** in the same menu makes a file you can send to anyone.

If it doesn't work: If you tapped the card itself, a message says **Editing "name"**. That is the template, not a new project, and anything you change is saved into the template when you go Home. If you changed something, tap undo until it's back how it was. Then go Home with the back arrow at the top left (on a phone the first tap only deselects a clip), and use the three dots and **New project from template**.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 Templates tab | index.html:704 | yes |
| 2 three-dots on the card; New project from template | js/home.js:2003 | yes |
| 2 tapping the card edits the template instead | js/home.js:2019 | yes |
| 3 Insert your Media | js/template-fill.js:191 | yes |
| 3 Tap a slot to make it yours | js/template-fill.js:210 | yes |
| 3 Replace Media | js/template-fill.js:259 | yes |
| 3 Your words | js/template-fill.js:216 | yes |
| 4 Done | js/template-fill.js:192 | yes |
| 5 Save as template… on a project card | js/home.js:1471 | yes |
| 5 name box and Save | js/home.js:1472 | yes |
| 6 Template tab in the Add menu | js/addmenu.js:517 | yes |
| 6 tapping a template inserts it | js/addmenu.js:604 | yes |
| 7 Delete template… then Delete | js/home.js:2015 | yes |
| Tip: Save template file… | js/home.js:2007 | yes |
| If: Editing message | js/home.js:2037 | yes |
| If: tapping a card edits the template; going Home writes back | js/home.js:2030-2037, :3387 | yes |
| If: on a computer the back button goes straight Home | js/app.js:6909-6912 | yes |
