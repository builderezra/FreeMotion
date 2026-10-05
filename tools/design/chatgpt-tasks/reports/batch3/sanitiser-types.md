# Sanitiser and collaboration value-type matrix

Snapshot: `28104a3e83e01ac3880db3fac604a7444c7235aa`  
Branch: `chatgpt/sanitiser-types`

## Scope

I searched `REQUESTS.md` and `audits/*.json` for storage sanitizers, import shapes, collab value types and prototype keys. Prototype-key/adversarial collaboration hardening is already logged under #921 / REQUESTS.md around line 15135 and is not repeated as a finding. This matrix is source-read only: I did not execute a dynamic six-type matrix. “Pass” means retained/forwarded by this validator, not guaranteed later renderer compatibility.

Columns refer to JSON string, finite number, boolean, array and null values.

## Project fields

| Fields / rule | string | number | boolean | array | null | Source |
|---|---|---|---|---|---|---|
| width, height | numeric strings coerced and rounded/clamped 16–7680; nonnumeric defaults | clamped/even-rounded | coerced; true/false both clamp to 16 | numeric-coercible arrays can become numbers; others default | skipped then default if missing/invalid | `js/storage.js:1004-1010`: `(+n || 0)` |
| fps, duration | numeric strings coerced | rounded/clamped (fps 1–120; duration 0–3600) | true→1; false→default/0 | numeric-coercible arrays coerced | fps null becomes default 30, duration null becomes 0 | `js/storage.js:1015-1017`: `Math.round(+p.fps) || 30` |
| markers / marker t, thumb, extra scalar props | t string rejected; strings retained/capped (label 80, others 200) | finite t clamped, other finite numbers retained | thumb strict boolean; other booleans retained | non-array marker list replaced; array entries rejected; array properties dropped | invalid list becomes []; null marker dropped | `js/storage.js:1030-1056` |
| name, background, loopIn/out, thumbPinned, sizePicked | name capped; background string length≤64; loop requires finite number | number name invalid; finite loop kept | loop invalid→null; thumbPinned false; sizePicked deleted | invalid flags/loop repaired or deleted | background null intentionally preserved; loop null preserved | `js/storage.js:1059-1064` |
| notes list / note.text | list elements require object; text string or null; other note properties are not rebuilt | note element fails; number text fails | boolean text fails | nonarray list→[]; array note element fails object/nonarray check | null text accepted; null list→[] | `js/storage.js:1065-1070` |

The import gate checks only truthy `project` and array `layers`, then clamps dimensions and sanitizes selected layer substructures (`js/storage.js:1694-1698`: `if (!obj || !obj.project || !Array.isArray(obj.layers)) return false;`). Other project keys are not rebuilt from a closed schema.

## Layer fields / substructures

| Fields / rule | string | finite number | boolean | array | null | Source |
|---|---|---|---|---|---|---|
| start, duration; plain trimStart, speed, volume | numeric strings coerced/clamped; nonnumeric default | clamped to ranges | true/false coerced | numeric-coercible arrays can coerce; otherwise default | start/duration default; optional fields stay absent/null | `js/storage.js:1560-1595`; animated trimStart/speed/volume objects are intentionally left for keyframe handling |
| fillImage, labelColor, clipColor, clipColorSet | fillImage string-coerced for `data:image/`; CSS colors require safe string form; clipColorSet booleanized | image/colors deleted; non-null flag→true | image/colors deleted; flag false/true | an array stringifying to data:image prefix can pass while original array remains (unchecked type; downstream behavior UNVERIFIED); colors deleted; flag→true | null skipped | `js/storage.js:1531-1536`: `/^data:image\//i.test(String(l.fillImage))` |
| fillGradient c0/c1/angle/type | valid color strings; numeric string angle coerced; type whitelist | colors default; angle clamped | angle coerced; type defaults | numeric singleton array may coerce to angle | null whole gradient skipped | `js/storage.js:1537-1543` |
| masks / path points / mask fields | id/mode require strings; point numeric strings coerce | coords finite, clamped ±100000; feather/opacity clamped | exact/default enabled/invert/closed behavior | list max24; points max2000; path keyframes max200; malformed item/path dropped | null masks stay absent; null paths drop mask; empty static path survives | `js/storage.js:1274-1331` |
| audioFx / behaviors and schema params | type must exist; enum/string params restricted | finite numeric params clamped; numeric strings default rather than coerce | enabled defaults on unless exact false | arrays capped 16/24; invalid items filtered; keyframes capped 200 | null means absent | `js/storage.js:1167-1187,1233-1267` |
| trimPath, stroke.dash, repeater | numeric string rejected by numOrKf, uses default | numeric values clamped | enabled true only if exact true | accepts object-shaped substructure (arrays included), rebuilds known fields | null means absent | `js/storage.js:1199-1221` |
| effects / containers / params / uid,name,fid | type/ids/color checked; numeric parameter strings coerced; unknown effect dropped | finite values clamped; segment matches registered options | enabled defaults on except exact false; toggles accept bool or 0/1 | effect list max120; one container level/24 children; keyframes schema-checked | null effects means absent | `js/storage.js:1371-1514`; numeric string branch at :1400-1405 |
| camera fov/focus/fog | numeric strings coerce; fog color safeColor | finite/ranged numbers retained | focus/fog `enabled` uses truthiness, not strict boolean | truthy arrays normalize to default-filled camera objects | null substructures skipped | `js/storage.js:1337-1349` |

**UNVERIFIED crash candidate:** a truthy primitive for `fillGradient` enters the block and then receives `.angle`/`.type` assignments in strict mode. Lines `js/storage.js:1537-1543` show no object/array guard. A non-empty string, positive number, or true may therefore throw instead of being rejected/coerced. This was not executed.

**Unchecked base-layer fields:** the imported-layer pass calls a fixed set of nested sanitizers and does not rebuild ordinary `type`, `transform`, `name`, shape/text fields, `parent`, or media references (`js/storage.js:1638-1650`, quote: `sanitizeMasks(l); sanitizeAudioFx(l); ... sanitizeKeyframes(l, 0);`). These fields pass through this sanitizer; per-field renderer outcomes were not exhaustively tested.

## Embedded media and file validators

| Fields / rule | string | number | boolean | array | null | Source |
|---|---|---|---|---|---|---|
| obj.media[id].kind/dataURL/name | kind exact video/image; dataURL string beginning data:; name has no explicit schema/length validation before File constructor | kind/dataURL rejected; name passed | kind/dataURL rejected; name passed | kind/dataURL rejected; name passed | media record skipped; dataURL returns null | `js/storage.js:1714-1723,939-943`; `dataURLToFile` quote: `typeof dataURL !== 'string' || !/^data:/i.test(dataURL)` |
| File-like sound-track probe | must have callable slice and size≥16 | fails shape check | fails | ordinary array lacks required slice API | rejected | `js/media.js:865-867`: `typeof file.slice !== 'function'` |

Malformed data URL or decode errors are caught and leave the imported layer media-less (`js/storage.js:1719-1723`).

## Collaboration validator values

| Field / rule | string | finite number | boolean | array | null | Source |
|---|---|---|---|---|---|---|
| tx.cid / tx.ops / operation | cid requires safe integer; ops requires array and cap; operation must be object and have grammar fields | safe integer cid accepted | cid rejected | ops accepted; array op usually lacks required fields; no plain-object-only tx check in this source | tx rejected | `js/collab-host.js:188-199,227-239` |
| id, anchor, path and keyed segments | id/anchor/path segments must match string grammar; path is array of bounded segments | rejected in string positions | rejected | only path/ops arrays are accepted at those positions | null allowed for optional anchor | `js/collab-host.js:197-218`, `js/collab-path.js:68-81` |
| generic op.v tree | leaf strings pass below cap | finite passes; NaN/Infinity rejected | passes | recursively inspected with depth/byte limits | passes | `js/collab-host.js:168-185,220-224` |
| comment/reply id,text,lid,t,resolved,by,at,replies | text capped; id/lid regex; by/at host stamped | finite t retained | resolved true retained; edit validator requires boolean | replies capped and malformed/duplicate reply objects dropped | null text normalizes empty; invalid refs dropped | `js/collab-host.js:525-549,583-586` |

The host rejects malformed operation envelopes, then passes accepted layer/project changes through real sanitizer invariants on clones (`js/collab-bridge.js:141-149`, quote: `layer: function (c) { FM.storage._sanitizeLayers([c]); }`). Generic values are not field-type-validated unless an explicit rule above applies. Confidence is high for source behavior; no adversarial runtime matrix was run.

