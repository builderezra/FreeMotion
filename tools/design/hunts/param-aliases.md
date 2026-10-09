# PL1: an alias table so a renamed effect or parameter keeps every old save

Branch `hunt/param-aliases`, based on main v17.33. Labels: **Measured** = ran it, **Read** = read the code, **Guess** = not verified.

## The hazard (Read, from AU17-2)
A saved project, an effect preset and the effect clipboard keep only the effect types and parameter keys the registry knows (`sanitizeEffects` in js/storage.js, `sanePreset` in js/fx-presets.js). Anything else is dropped on load, and the autosave then writes the loss back. So renaming `radius` to `size`, or renaming an effect type, resets that setting in every project anyone has saved, with no error. Nothing has been renamed yet, so nothing is lost today.

## What it is now
- **`FM.fxAliases`** in js/fx-registry.js: two plain tables, `types` (old type to new type) and `params` (filed under the effect's NEW type name: old key to new key). **Empty today.** The comment above it says what to add and when.
- **`FM.fxRegistry.migrate(entry)`** reads an entry (`{type, params}`) under today's names. With an empty table it returns the same object, so it costs one lookup and changes nothing. It never mutates its input; when an entry has both the old key and the new key the new one wins; keyframes move with the key. Chains (`a` to `b` to `c`) are followed up to 8 hops, so a loop ends.
- **A name that still exists is never rewritten.** An alias cannot hide a live control; this is enforced both in the code and by a test of the table.
- **Where it runs:** `sanitizeEffects`'s `sane()` right before the unknown-name checks (that one gate is also behind project load, `.fmproj` import, undo restore, the collab clone, the effect clipboard, layer presets and a Filter's children), and `sanePreset` for effect presets saved in localStorage.
- **`FM.fxRegistry.aliasResolve(type, key, have, table)`** is the one function both use, with the registry and the table passed in so the suite can ask about a rename that has not happened.

It converts names, not values. If a rename also changes meaning or unit (radius in px becomes a 0 to 100 amount) that is a migration and must write the new value itself. The comment says so.

## The AU17-2 guard
Your AU17-2 test (pinned list of every type and key in v17.32) is replaced by one that follows the table:
- a pinned name that is gone passes only if an alias carries it to something that exists;
- otherwise it fails with: `… a renamed key resets that setting in every saved project; add an alias in FM.fxAliases (js/fx-registry.js): FM.fxAliases.types.oldtype = 'newtype' or FM.fxAliases.params.newtype = { oldkey: 'newkey' }, and keep the old name in this list`.
The test is `AU17-2 every effect type and parameter key a v17.32 project can hold still exists, or is carried by an alias` and the pinned list is copied unchanged from `hunt/audit-fx-2` (206 types, 1,011 keys). If the builder has already merged AU17-2, replace that block with this one; the list does not change.

## Tests (tests/tests.js, each at 1280 and 380)
| test | what it proves |
|---|---|
| `PL1 a saved effect whose parameter or type was renamed keeps its value, keyframes included` | a renamed number, a renamed animated parameter (both keyframes), old+new both present (new wins), a renamed TYPE with a two-step renamed key, a disabled effect, an effect inside a Filter; controls: an un-aliased key is still dropped, an un-aliased type still refused, an alias never rewrites a live key |
| `PL1 an effect preset saved under the old names still loads under the new ones` | a preset saved under an old effect name and an old key loads as the new one; control: with the table empty it is refused |
| `PL1 the guard demands an alias for a rename and accepts one that exists, and a bad table is refused` | in a pretend build (Blur `radius` became `size`, Glow became `halo`) the guard flags both with no alias and accepts both with one; a table that hides a live name, loops, points at nothing or files params under an old type name is refused; the shipped table is clean |
| `AU17-2 …or is carried by an alias` | the real registry against the pinned v17.32 list |

- **Red on main** (Measured): all four fail on main, 0/3 and 0/1, at both widths (`FM.fxAliases is not reachable`). Green with the change: 3/3 and 1/1 at 1280 and 380.
- **Mutations** (`tools/mutate.sh --only`), all CAUGHT: the sanitiser call removed; the new key no longer winning; live names rewritten; type aliases ignored; the preset call removed; the guard ignoring aliases (`results/pl1_mut.log`).
- **Neighbours:** `sanit` 11/11, `clipboard` 6/6, `921 S1` (the collab schema gate) 24/24 with and without the change; `preset` 31/37 with the change against 30/37 on main, the same 6 reds on both (the extra red on main is the new preset test). Aliases do not touch the schema fingerprint, so `SCHEMA_REV` does not move.

## Not covered
- **Behaviours and audio-reactive links that point at a parameter by name** (`fx:<index>:<key>`, `parseFxProp` in js/audio-react.js). I read where they are stored: the bake writes keyframes into the effect's `params` and does not keep the link string, so nothing saved carries an old key there. Not exercised.
- **Collab with a mixed-version room.** A peer on the old build sends the old key; the guest's sanitiser now carries it over, but the host's fingerprint check will still refuse the join across a real rename (that is `SCHEMA_REV` and `C.SCHEMA_FP`, a separate and deliberate gate). Not measured.
- **AI-written ops** (`js/ai-ops.js`) read the registry directly and do not go through the alias table.
- A rename inside a Filter *library* definition (static data in js/filters.js) is the author's edit, not a saved file.

## Files
`js/fx-registry.js` (v 25.32), `js/storage.js` (60), `js/fx-presets.js` (13), `index.html`, `tests/tests.js`, this report, `param-aliases-scripts/results/`.
