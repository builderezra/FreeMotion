# #948 — the + on Templates and Elements (option A) + fixes 2, 3, 4 — build notes

Branch `hunt/948-plus`, built on `hunt/929-heart` (ssh/main v17.53 + the #929 heart fix), one commit per part:
A, fix 2, fix 3, fix 4, these notes.

**Code only. Nothing was run**: no browser, no server, no suite, no slice, no python. A release ship was running on
the laptop and memory was low. The only checks were `node --check` on every changed js file and on tests/tests.js, a
grep of the diff for the Full-unchanged gate's hook words (none), and a grep for `//` comments appended to continued
lines (none). The five new tests have never run; every wait in them is borrowed from the Home tests around them.

## What was decided

His words, 26 Sep (#944, logged as #948): in the Templates and Elements tabs, + "still just open up a shitty tiny menu
instead of like a proper thought out one … I do want elements and templates to be their own things, not just reskinned
projects."

The PM decided on 11 Oct, under his #1130 rule: "the + menu is option A, plus fixes 2, 3 and 4."

## A — what it is, and how the build matches the drawing

The sheet (`tools/design/948-options.html`, pictures `948/A-*.jpg`, prototype `948-proto.js`) describes A as "one card:
Start-from-scratch with shape chips + a sideways row of his projects", in the New project card's look, with the words
"One tap either way."

Built in `js/home.js` (`openLibNew` and the `ln*` helpers) and `styles.css` (the `#948` block after `.hm-dlg-actions`):

- **The card.** `#hm-libnew` is a scrim like `#hm-dialog`. Its card uses the New project card's own classes
  (`.hm-dlg-card`, `.hm-dlg-title`, `.hm-dlg-scroll`, `.hm-dlg-actions`). So the dark Home, the glass look and the light
  Home all reach it through rules that already exist, and no new design language is added. On a phone it enters with
  the card hinge, on PC with the pop, and the scrim blooms. Reduced motion turns all of that off.
- **The words are the drawing's.**
  - Elements: "New element"; "A piece you drop into any edit: a logo, a watermark, a lower-third."; "Build from
    scratch" / "A clear canvas to draw it on"; "From one of your projects"; Cancel.
  - Templates: "New template"; "A starting point: open it, swap in your own media, and it's a new project."; "Start
    from a blank template"; "From one of your projects".
  - **One change:** the drawing said "Pick its shape and length, then build it". The length is not picked anywhere on
    the card; a template is as long as what he builds. So it says **"Pick its shape, then build it"**.
- **The from-scratch tile.** Left to right: the dashed checkered square with a +, the title and line, the four chips
  **1:1 · 9:16 · 16:9 · 4:5**, and a ›.
  - The + is drawn with two bars, not a typed glyph (the rule the `#hm-new` comment gives).
  - 1:1 is picked by default, as drawn. The pick is remembered per tab for the session.
  - A chip only picks the shape. Tapping anywhere else on the tile starts the build.
  - Sizes: 1:1 = 1080×1080, 9:16 = 1080×1920, 16:9 = 1920×1080, 4:5 = 1080×1350.
  - The chips are 32 px tall and wrap to a second row when the tile is too narrow (at 320, and possibly at 380). The
    chevron is pinned to the right edge so that the row has as much width as possible.
- **His projects.** A sideways row of 92 × 122 tiles (the drawing's size) showing picture, name and "9:16 · 0:24".
  - The list is `projectsInGridOrder()`, the Projects grid's own list and order, so hidden workspaces never appear.
  - **Placeholders replaced:** the drawing used stand-in gradients. The build shows each project's **real card
    picture** (`FM.projects.getThumb`, the same IndexedDB thumbnail the Projects grid shows). Until it paints, the grid's
    ▶ placeholder shows.
  - The row scrolls sideways by finger and by trackpad. A plain mouse wheel also moves it sideways (his #976 complaint).
  - With no projects, the row is replaced by "No projects yet. Make one in Projects and it shows up here."
- **One tap either way**, as drawn:
  - **A project tap** makes that project a template (`FM.templates.save`) or an element (`FM.elements.saveFromProject`),
    **named after the project, with no name prompt**. The card closes, he stays on that tab, and a toast says "Saved "X"
    as a template". An empty project under Elements makes nothing and is told why ("That project is empty…").
  - **The tile** starts a workspace of the picked shape (`FM.templates.startNew` / `FM.elements.startNew` in
    storage.js) and pushes into the editor. The new one is called **Template N / Element N**, the first number not
    already taken. An element's canvas is clear. `returnTo` remembers the project he came from, the same way
    `openForEdit` does.
- **Closing.**
  - Cancel closes it at once (his #947 words about New project).
  - Escape closes it.
  - A tap on the backdrop closes it, using the `#hm-dialog` rule: only a press that *began* on the backdrop. The + sits
    under the backdrop, so tapping the + again closes the card rather than reopening it (his #944 complaint).
  - Home closing takes the card with it.
- **Escaping.** Every name goes in through `el()`, which sets `textContent`. No `innerHTML` anywhere in the card.
- **The fit**, from the CSS (not measured, since nothing was run):
  - The card is `min(380px, 92vw)` like New project: about 350 px at 380 and 380 px on PC, centred.
  - The middle is `.hm-dlg-scroll`, so on a short screen the tile and row scroll while the title and Cancel stay put.
  - The drawing had no PC version, so on PC the card is New project's width.
- The old text menu, the `pickProject` 14-item project list and its FM.ask name prompts are gone.
- The Templates tab's empty state now reads "Tap + to start one from scratch or from one of your projects."

## Fix 2 — a new element saves itself when he goes Home

The list sent 26 Sep, item 2: "A new element is really a hidden project. It only becomes an element if you remember ⋯ →
Save as element. Until then it sits in Elements as a draft." The fix it named: "it saves itself as an element when you
leave, the way editing an existing one already does".

- **The marker.** A workspace started from the card carries `libNew: 'element' | 'template'` on its **index record
  only** (`FM.projects.create`, opt `libNew`). The project document is unchanged.
- **The save.** Coming Home, the same funnel that saves an edit (`FM.home.open`) now calls
  `FM.elements.commitNew()` / `FM.templates.commitNew()`, which run `storage.js commitLibDraft`. That function is
  `commitDraft`'s twin and runs in the same order:
  1. It acts only on this tab's open workspace, and only one carrying `libNew`.
  2. The flush must land. If it does not, the draft is kept.
  3. If the workspace has no layers, nothing is made, the empty workspace is put away, and he is told "Nothing was added,
     so no element was made".
  4. Otherwise it saves under the name in the editor's name field, through the same save the draft card's ⋯ uses
     (`saveFromProject` / `templates.save`). The card picture is taken from the live scene first (queue 915's rule).
  5. The marker is removed as soon as the save lands, so a failed switch can never save the same work twice.
  6. It switches back to `returnTo` first, then discards the workspace.
- **What he sees.**
  - On a successful save he lands on the Elements (or Templates) tab and sees "Saved "X" as an element".
  - A refused save keeps the draft and says so.
- **Words updated to match.**
  - The draft card of such a workspace (if a save was refused) reads "Not saved yet — open it, then go back Home and it
    saves itself as an element".
  - The Add → Elements browser's how-to line says "Elements → + → Build from scratch. Build it, then go back Home — it
    saves itself as an element."
- A blank **template** from the card works the same way and is saved as a template on the way Home.

## Fix 3 — editing a template or an element says so; no Export

The list, item 3: "Editing a template or element looks exactly like editing a project. Same bar, same Export button, and
nothing says what you're editing." The fix: "a slim bar saying "Editing element: Logo sting · Done", and no Export button
while you're in it."

- **When it applies.** While this tab's open project is a template or element workspace, `<body>` gets `lib-edit`
  (`home.js libEditSync`).
- **The bar.** A pill at the top centre of the stage (`#lib-bar`) reads one of:
  - **Editing element: <name> · Done** (or *template*): editing an existing one.
  - **New element: <name> · Done**: one the + card started.
  - **Element draft: <name> · Done**: an older draft, which is not saved by itself.
- **Done** goes Home, and Home is what saves it.
- **No Export.** `#btn-export` (PC) and `#m-export` (phone) are hidden under the class.
- **When it updates.**
  - Home closing, which covers every way into the editor.
  - A project switch inside the editor: storage.js `open()` calls `FM.libEditSync`.
  - The boot that lands straight in the editor.
  - An ordinary project never gets the class.
- **The name.** The bar shows the project name as text and follows the editor's name field as he types. The field is
  read after its own handler runs, because on PC the same field renames a selected layer.
- **That name is now the element's or template's name.** `commitDraft` passes it to `updateFrom`, which renames the card
  if the name is non-empty and different (`libRename`, at most 120 characters). This is the only rename either has. The
  + card makes them in one tap with no name prompt, so without this a template made from "Beach reel" could never be
  called anything else. "Update template from project" passes no name and still changes none.

## Fix 4 — their own file types

The list, item 4: "Sharing a template saves a project file, so it opens as a project on the other phone. Elements can't
be shared at all." The fix: "their own file types, so they open straight into Templates and Elements."

- **Saving a template.** ⋯ → Save template file now writes **NAME.fmtemplate.json**. Its body is the same project-file
  body as before (`app`, `project`, `layers`, `media`, `fonts`, `omitted`, `omittedFonts`), plus `kind: 'template'`,
  `name`, and the card `thumb`.
- **Saving an element.** The element card's ⋯ has a new **Save element file…**, which writes **NAME.fmelement.json**:
  - the same body around the element's layers and their files, with the same embedding limit and named omissions
    (`serializeWith`);
  - plus `kind: 'element'`, `name`, `canvas` (the size its layers sit on, via `elementCanvas`) and `thumb`;
  - its `project` is only a clear frame at that canvas.
  - Its toast is the template file's message in its own word (`templateFileMessage(result, 'Element')`).
- **Opening a file.** Settings → Import a project file, and the editor's Open project, now hand the parsed file to
  `FM.storage.importParsed`:
  - **`kind: 'template'` / `'element'`** → `templates.importObject` / `elements.importObject`, which are checked like
    any project file (`sceneFileProblem`). Then:
    - layers go through the import sanitisers, and parent loops are repaired;
    - media is taken only from `data:` URLs (`dataURLToFile`), and only for layers that exist;
    - the session pointers and notes are taken off a template's project, and its size is clamped;
    - a card picture is kept only if it is a plain base64 PNG, JPEG or WebP `data:` URL under 600 KB, because it lands
      in an `<img src>`;
    - the pack is written first and the card second, and the pack is taken back if the card cannot be written;
    - it is added to its library and Home switches to that tab. **No project is made**, and Settings' "close Home" is not
      called.
  - **Anything else** → `importObject`, a project, exactly as before.
- Settings' Import row now adds: "A template or element file someone sent you goes straight into Templates or
  Elements."

## Storage safety — nothing in his library is lost or converted

- **Projects.** Untouched. The only new index field, `libNew`, is written only on workspaces the new card creates.
- **Templates and elements already saved.**
  - Packs (`tpl:<id>` / `elem:<id>`) and their index entries keep their shape.
  - Nothing is migrated or rewritten on load.
  - A name changes only when he edits one and has typed a different name in the editor's field (fix 3).
  - Old index entries with no `count` or `thumb` behave as before.
- **What happens to an existing draft.**
  - **Element drafts that already exist** are left exactly as they were. These are `elementDraft` with no `ofElement`:
    "Build a new one…" workspaces from before this release, and any orphans an old version left behind.
    - They have no `libNew`, so going Home from one does **not** save it by itself.
    - Their card still says "Draft — open it, build it, then ⋯ → Save as element".
    - ⋯ → Save as element and Delete draft still work.
    - The reason: nothing can tell an unsaved sketch from an orphaned copy of an element, and filing either by itself is
      the #505 duplicate failure.
    - The one thing that changes: when one is open, the editor shows **"Element draft: <name> · Done"** and **no Export
      button** (fix 3).
  - **Template drafts that already exist** (`templateDraft` with no `ofTemplate`, which is what a backup restore brings
    back) get the same treatment: "Template draft:" in the bar, no Export, and ⋯ → Save as template still works.
  - **A workspace already editing an element or template** (`ofElement` / `ofTemplate`) saves back on Home exactly as
    before. New: the bar, no Export, and the name in the editor's field becomes the element's or template's name. If he
    had typed a different name into such a workspace before this release, it applies the next time he goes Home.
  - **A + card workspace inside a backup** comes back as an older-style draft, because the backup carries only the kind,
    never `libNew`.
- **Files.**
  - Every template file saved before this release has no `kind`, so it still opens as a project, as it always did.
  - A new .fmtemplate/.fmelement file opened in an older FreeMotion also opens as a project, because the body is still
    a project file's.
- **The paths that delete.**
  - `commitLibDraft` discards a workspace only after its save landed, or when it holds no layers.
  - `discardDraft` deletes only that workspace's own media records. The saved pack holds its own copies of the files,
    which is what ⋯ → Save as element + Delete draft has always relied on.

## The tests (appended at the end of tests/tests.js, all `{ item: '948' }`), and why each fails on the base

1. **`948 the + on Templates and Elements opens one designed card - …`** (at 380 and at 1280)
   - **Fails on base:** the + opens `#ctx-menu`, not a card. The failure reads "the + on elements opened no card - it is
     still the small text menu (New element Build a new one… …)".
   - **Also holds:**
     - the drawn title and tile words, and the four chips, exactly one picked;
     - a chip tap moves the pick and does not start a build;
     - the card is on screen and the page is no wider than the window;
     - the chips sit inside the tile and are at least 30 px tall; Cancel is in the card;
     - the project row scrolls sideways inside the card and never lists a hidden element draft;
     - a project named `T948 <b>bold</b> & co` shows as plain text;
     - T948 Beach's tile shows its own pinned card picture;
     - Cancel makes nothing;
     - Escape closes the card;
     - the backdrop closes it. The **control** is that a click whose press did not begin on the backdrop does not.
2. **`948 the + card does what it says - …`**
   - **Fails on base:** the same first sentence, from the shared opener: no card.
   - **Also holds:**
     - at 380, Elements 16:9 → a 1920×1080 element workspace that is clear, remembers `returnTo` and is hidden from
       Projects;
     - Templates 9:16 → a 1080×1920 template workspace;
     - at 1280, one tap on a project makes a template, then an element, holding its layer, with Home still up and no
       project made;
     - an empty project under Elements makes nothing and is told why.
3. **`948 fix 2 - …`**
   - **Fails on base:** there is no `startNew`, so the test starts the base's own from-scratch workspace (what Build a new
     one… made), builds in it and goes Home. Nothing is filed. The failure reads "he built T948 my logo from scratch and
     went Home - no element called T948 my logo exists; it is still a draft that only becomes one through ⋯ → Save as
     element".
   - **Also holds:**
     - the same for a template;
     - exactly one is made, holding the layer, and the element keeps its 1:1 canvas;
     - he lands back in the project he came from, on that tab;
     - an empty one makes nothing and leaves no draft;
     - **CONTROL:** an older draft with no `libNew` is not filed by itself and is still there;
     - a + card draft's card says it saves itself.
4. **`948 fix 3 - …`** (at 380 with `#m-export` and at 1280 with `#btn-export`)
   - **CONTROL first:** an ordinary project shows its Export and no bar. This passes on the base.
   - **Fails on base:** "at 380: editing the element T948 bar element looks exactly like editing a project - nothing says
     what he is editing".
   - **Also holds:**
     - the bar reads Editing element: / template: <name> … Done and sits inside the stage;
     - Export is hidden;
     - Done is at least 30 px tall, takes him Home, and the workspace is put away;
     - typing a new name in `#proj-name-m` updates the bar, and the element comes Home renamed.
5. **`948 fix 4 - …`**
   - **Fails on base:** "a template still saves as a project file (T948 file template.fmotion.json, kind undefined) - it
     opens as a project on the phone he sends it to".
   - **Also holds:**
     - an element saves as .fmelement.json with its layers and canvas;
     - each file, opened through `importParsed`, adds to its own library with **no project made** and Home on that tab;
     - a name with markup shows as plain text on the card;
     - a `javascript:` card picture is dropped, and a real PNG one is kept;
     - an embedded image comes in as a File;
     - **CONTROL:** a template file with no `kind` still opens as a project.

## Busters (index.html)

home.js 203→204, storage.js 65→66, styles.css 771→772, elements-browser.js 4→5, settings.js 53→54.

## The Full-unchanged lock

- This is a Home and Full change, not Simple. No Simple-owned file was touched (spine*, simple-*, editor-mode), and the
  diff contains none of `tools/_fu_gate.py`'s hook words (checked by grep), so the gate should read NOT-TRIGGERED.
- Full's editor **does** change for template and element workspaces (the bar, and Export hidden). That is the point of
  fix 3. An ordinary project gets neither.

## #545 — the picture to send him with the release

He saw A as drawn on the 26 Sep sheet, with stand-in project pictures. With the release, send the **built** card, shot
through the real app at 390 × 844 the way the sheet was (`948-render.py`'s frame), **beside the matching drawn picture**:

- the **Elements** card on the **dark** Home next to `948/A-element-dark.jpg`;
- the **Templates** card on the **light** Home next to `948/A-template-light.jpg`;
- in both, a library with a few real projects, so the row shows his kind of pictures instead of gradients.

Add one PC shot (1280 × 800) of either card, which the sheet never had, and one 380 shot of the editor while editing an
element: the "Editing element: … · Done" pill with no Export (fix 3).

## Unsure / for the loop session

- **Nothing was run.**
  - The waits in the five tests are guesses.
  - The layout claims (chips wrapping, the card fitting at 320 and 380, the pill clearing the canvas's top edge) are from
    the CSS, not measured. The tests measure them at 380 and 1280 on the first run.
  - All the tests use `click()` and DOM boxes, not a real finger.
- **No name prompt anywhere on the card** ("one tap either way"). Names come from the project, or Template N / Element N,
  and the only rename is the editor's name field while editing (fix 3). If he wants a name prompt after a project tap,
  it is one `FM.ask` in `lnFromProject`.
- **An empty blank template is not kept.** One with only a background colour and no layers counts as empty and is put
  away, the same as an empty element.
- **Export is hidden for older drafts too.** A video can no longer be exported straight from an old loose element draft
  without saving it first.
- **The project row lists every project**, with no cap, and each one costs a thumbnail read; the Projects grid does the
  same.
- **The pill sits over the top of the stage.** On a phone with a tall canvas it may cover the canvas's top edge (about
  38 px). If it gets in the way of handles there, it could move into the top bar instead.
- **Simple's own export entry.** simple-tools.js hooks the same `#btn-export`, which is hidden under the class, but Simple
  was not looked at beyond that, and its files were not touched.
