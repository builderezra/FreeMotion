# Plans for the next five after P35 (P36): #948, #954, #964, #967, #982

Against `origin/main` 0896fbf4 (v17.35). **Measured** = I ran it here (headless Chromium, 380 wide), **Read** = read the code or the entry, **Guess** = not checked. All five are built-out items waiting on a pick of his; the useful work is what each pick unlocks and what is stale.

## #964 empty project, phone: the add area's outline and tap animation
**Net: built and shipped; the entry's header is stale.** The header and the logger's first diagnosis describe v17.02 (an outline drawn from `:hover` and `:focus-within`, a small `.tl-tapburst`). **Both are gone (Read, `styles.css` 8855-8960, `js/timeline.js` `areaFx` at 3277):**
- The outline is now an EVENT layer, `.tl-areafx`, created on the press, sized to the area below the ruler row, removed on a timer, `z-index: 8` so it sits over the ruler row whose opaque background used to cover the old box's top edge. `pointer-events: none`. There is no resting state to stick: **Measured** that an empty project at 380 has no outline at rest or after `focus()` (computed `box-shadow` is `none` on `#timeline` and on the add row; script focus does not match `:focus-visible`).
- The keyboard ring is `:focus-visible` only, drawn by `::after` on the panel; a finger tap never matches it.
- **Measured, and why the old clause 1 happened:** at 380 the top 3 px of `#timeline` are covered by `.tick`, `#tl-ruler` and `#tl-rulerrow` (`document.elementsFromPoint` at the top edge), so a box drawn ON `#timeline` could never show its top side. The shipped layer fixes it by sitting above them, not by moving the box.
- Three colourways (Aurora, Rings and sparks, Key ripple) and both outline starts are random per press until he picks (#974, v17.12 and v17.13). **Open: his pick** (the others are then deleted). **Plan:** when he picks, delete the other two variants and their CSS; the area is a few hundred lines in `timeline.js` and one block in `styles.css`. **Stale:** the entry's "STATUS: BUILT OUT" should say "BUILT, waiting on which colourway".

## #982 Home's Join button becomes an icon
**Net: buildable now by his own rule.** The entry ends *"BUILT OUT UNTIL HE picks an icon (A recommended); if no answer by the time it is reached, build A (rule 16)"*. It has been four icons on his phone since 29 Sep with no pick, and it is the oldest item here, so by that sentence it is due. **Plan:** replace the "Join" word pill beside Select with icon A (arrow into a doorway), keep `aria-label` and `title` "Join", a 44 px target, and a test that the label is still "Join" and the target is at least 44 px at 380. One release, one file in `js/home.js` plus CSS. I did not build it (this item is in the builder's lane; I am a helper).

## #948 Templates and Elements: a proper + menu, and their own things
**Net: waits on A, B or C and on which of fixes 2 to 4 he wants.** Three menus were drawn and sent 26 Sep (`tools/design/948-options.html`). Clause 2's list (Read): a template can only be a copy of a project, a new element is a hidden "draft" project that becomes an element only through "Save as element", and so on. **Plan:** on his pick, A is the recommended menu; each of fixes 2 to 4 becomes its own entry (his word in the ASK). Nothing to build until then. **Likely callers to trace when it is built:** `home.js` (the + button and the tab switch, `newBtn` at 2557), `storage.js` `FM.templates` and `FM.elements`.

## #954 rename every effect away from Alight Motion, and reorder the categories
**Net: step (a) is done and sent; the renames are his to veto.** The record is `tools/design/954-effect-names.md`: 40 proposed renames, 70 plain names, and a proposed category order. **Plan:** on his answers, the rename is a registry change with a trap I have already seen in this tree: **`js/fx-registry.js` carries an alias table (PL1) so a renamed effect or parameter keeps opening in saved projects, and a guard test demands an alias for every rename** (P26 and the PL1 tests). So the rename is: change the label and keep the id where the id is stable, and where an id must change add the alias, then the guard passes. **Caution (Read):** `E1`'s new effects and ChatGPT's B6 (`3728d6f5`) both add an `oilpaint` id (see `landing-order.md`); do the renames after those land, or the collision gets harder to see. Category order is data in the registry's category table; no logic.

## #967 live collaboration feels underbaked on his phone
**Net: the audit he asked for was done (26 Sep, six agents); what is left is batch 2's doors, which need his pick, and I have not re-checked which of batch 1's fixes shipped (Guess: several did).** The root causes R1 to R6 (the switch hidden at the bottom of Settings, "off" meaning three things, wordless doors, the code route's 20 s race, builder-language, silent endings). Read in this tree: Settings has a "Test connection" report (`CLAUDE.md`), Home has a worded Join pill (#982's own text says so, v17.08), and the Share panel and rooms exist (`collab-ui.js`); I did not walk the six journeys again. **I have audited this surface twice (AU23, AU26, AU28) and found real defects in the room store, names, the MQTT reader and nothing in the handshake; I did not re-walk the six journeys.** **Plan:** the remaining open clauses are 5 (an end-to-end check on a phone) and 6 (a first-timer can use it). Neither is automatable here; the machine half is the `921` suite, which runs the fake network (about 240 tests, ten minutes) and the real two-device check, which needs two phones. **A concrete next step that does not need him:** run `921` at 380 on the integrated branch (`hunt/audit-integrated-3`) and report. I did run `921 S1` (24 of 24) and `921 S6` (32 of 34 at both widths, the same two reds on main).

## Summary
| # | state | closes when |
|---|---|---|
| 964 | built (v17.12, v17.13); header stale | he picks the colourway |
| 982 | due by its own rule 16, unbuilt | build icon A, or he picks |
| 948 | waits | he picks A, B or C and fixes 2 to 4 |
| 954 | waits | he answers the three picks |
| 967 | partly shipped; doors need him | batch 2 picks; two phones for the end-to-end |
