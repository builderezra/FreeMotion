# FreeMotion security review

Reviewed 1 October 2026. Snapshot: `28104a3e83e01ac3880db3fac604a7444c7235aa` (v17.21). Branch: `chatgpt/security`.

Only this report was added. No application changes, fixes, deployment, or live-user collaboration traffic. Line numbers below refer to the snapshot, not subsequent Claude edits.

## Result and limits

**One confirmed medium-severity finding; one UNVERIFIED medium-severity concern.** No confirmed critical/high finding, XSS, prototype pollution, role escalation, or API-key disclosure was established. This is a bounded source review with a focused Node VM reproduction of the real collaboration host and storage modules, not a claim that every app feature is secure. No full browser, mobile, WebRTC, or destructive memory-pressure testing was performed.

Searched `audits/*.json` and `REQUESTS.md` for the relevant files/features and then for the specific failure mechanisms, including the active checkout's records. Excluded previously recorded issues: prototype-named IDs/effect registries; unsafe fill-image URLs; dimension/timing/keyframe sanitization; generic malformed imports creating empty projects (#673); collaboration comment authorship, role/media bypasses, oversized fonts, font-family replacement, resync amplification and identity spoofing (#921); key-field focus theft/key-shaped chat messages (#930). The findings below concern different mechanisms. Imported font-family replacement was not relisted merely because file import is another entry point.

## F1 — Editor transaction throws after mutating the owner's authoritative document

**Severity: medium. Confidence: high. Status: CONFIRMED at the host API boundary.** Full browser symptoms, persistence across reload, and permanent project loss are **UNVERIFIED** and are not claimed.

An admitted editor can set a layer's `fillGradient` to a string. The transaction passes validation and mutates the host's authoritative base. The subsequent sanitizer throws before the transaction is sequenced or acknowledged. The host retains the invalid value with its sequence unchanged. This breaches transaction consistency rather than merely letting an editor make an unwanted visual edit.

An attacker needs an existing editor membership and a known, unlocked layer ID. This is not a viewer/commenter permission bypass or an unauthenticated internet attack.

### Evidence

`js/collab-session.js:618–626` hands the peer transaction to the host before acknowledgement, broadcast and application to the live scene:

```js
case 'tx': {
  const r = host.receive(mid, msg);
  if (r.ack) sendTo(mid, r.ack);
  if (r.b) {
    broadcast(r.b, mid);
```

`js/collab-host.js:665–666` mutates the authoritative base first:

```js
const op = resolveOp(ops[i], m);
const res = D.apply(base, op);
```

`js/collab-host.js:682` then invokes the invariants:

```js
return { accepted: accepted, fix: invariantFix(touched, projectTouched, structural) };
```

`js/collab-host.js:690–692` calls the layer sanitizer without rolling back the preceding base mutation:

```js
const c = clone(bl);
inv.layer(c);
D.diffNode(['L', lid], bl, c, out);
```

The production adapter, `js/collab-bridge.js:144`, uses the actual storage sanitizer:

```js
layer: function (c) { FM.storage._sanitizeLayers([c]); },
```

`js/storage.js:1537,1542–1543` tests truthiness, not object shape, before writing properties in strict mode:

```js
if (l.fillGradient) {
```

```js
l.fillGradient.angle = Math.max(0, Math.min(360, +l.fillGradient.angle || 0));
if (['linear', 'radial', 'angular'].indexOf(l.fillGradient.type) < 0) l.fillGradient.type = 'linear';
```

### Trigger

1. Start a sharing session and admit an editor. Have an unlocked layer with ID `a` (substitute an actual ID).
2. From that editor's transport send the following control-channel transaction, using a fresh `cid`:

```json
{"t":"tx","cid":1,"ops":[{"o":"s","p":["L","a","fillGradient"],"v":"bad"}]}
```

3. At `Host.receive`, observe `TypeError: Cannot create property 'angle' on string 'bad'`.
4. Inspect `host.base.layers`: the layer now contains `"fillGradient":"bad"`, while `host.seq` remains `0` in a fresh host. No acknowledgement/batch is returned by that call. The browser's subsequent repair/recovery behavior has not been measured.

The result was reproduced with these real modules and minimal browser stubs. Run from the reviewed checkout with Node; it does not write files or contact a network:

```js
const fs = require('fs'), vm = require('vm');
const c = {
  console, setTimeout, clearTimeout,
  location: { hostname: 'test', hash: '', search: '' },
  document: { addEventListener() {} },
  localStorage: { getItem() { return null; } }
};
c.window = c; c.addEventListener = () => {};
vm.createContext(c);
for (const f of ['storage', 'collab-core', 'collab-path', 'collab-diff', 'collab-host']) {
  vm.runInContext(fs.readFileSync('js/' + f + '.js', 'utf8'), c);
}
vm.runInContext(`
  const base = {
    project: {width:1080,height:1920,fps:30,duration:5},
    layers: [{id:'a',type:'shape',start:0,duration:5}]
  };
  const h = FM.collab.Host({base, invariants: {
    layer: x => FM.storage._sanitizeLayers([x]),
    project: x => FM.storage._clampProjectDims(x),
    layers: () => null
  }});
  h.join('e', {role:'editor'});
  try {
    console.log(h.receive('e', {t:'tx',cid:1,
      ops:[{o:'s',p:['L','a','fillGradient'],v:'bad'}]}));
  } catch (e) { console.log(e.name, e.message); }
  console.log(JSON.stringify(base), h.seq);
`, c);
```

The structural invariant is a no-op in this harness because this leaf-property transaction does not invoke structural repair. Layer and project sanitizers are the real implementation, not replicas.

**Repair direction:** validate field shapes before mutation and make transaction application atomic on sanitizer failure. Rejecting only this string payload leaves the broader apply-before-validation failure mode. No repair was implemented.

## F2 — Project import has no input-byte budget before full parsing

**Severity: medium (provisional). Confidence: medium. Status: UNVERIFIED resource-exhaustion impact.** Missing pre-parse limit is confirmed by source inspection; an actual phone/browser freeze, kill, or loss of unsaved work was not reproduced.

An attacker can supply a very large `.fmotion.json` and persuade the user to import it. Full file reading and parsing happen before the layer-count check. A file containing one layer and a very large text/extra field bypasses that count. The later JSON clone creates further allocations. This can expose the main editor process to memory pressure even though the scene has few layers. Legitimate embedded media also makes files large, so a repair must accommodate supported project sizes.

### Evidence

`js/storage.js:2022` reads and parses the entire file without checking `file.size` first:

```js
try { obj = JSON.parse(await file.text()); }
```

`js/storage.js:1977–1980` checks presence and layer count, not total bytes or nesting:

```js
if (!obj.project) return 'That project file is missing its canvas settings — it may be truncated or only half-downloaded.';
if (!Array.isArray(obj.layers)) return 'That project file has no layers list — it may be truncated or only half-downloaded.';
if (obj.layers.length > 2000) return 'That project has ' + obj.layers.length + ' layers, which is more than FreeMotion will open.';
return null;
```

`js/storage.js:1703` calls `reIdLayers(obj.layers)`, whose `js/storage.js:2051` performs another full serialization and parse:

```js
const out = JSON.parse(JSON.stringify(layers, FM.jsonReplacer));
```

### Trigger to confirm safely

1. In a disposable browser profile, prepare a valid exported project with one layer.
2. Increase a non-underscore layer string field (for example `extra`) to a large size, retaining valid JSON and the normal project header.
3. Import the file and measure responsiveness and peak memory during reading, parsing and re-ID. Increase size only within a deliberately chosen device memory budget. A damaging threshold was not established in this review.

A separate bounded depth probe used an 8,000-level object in `layer.extra` and called the real `_reIdLayers`; Node returned `RangeError: Maximum call stack size exceeded`. This proves a depth-sensitive clone failure, **not** browser memory exhaustion. The normal file-import outer catch (`js/storage.js:2027`) reports `Could not read that project file`; that caught error alone is not reported as another vulnerability or as project destruction.

**Repair direction:** establish explicit file-byte and decoded-document budgets before expensive cloning, reject excessive depth, and provide an actionable size error. Consider isolated parsing for responsiveness. No repair was implemented.

## Coverage and non-findings

| Requested area | Result |
| --- | --- |
| Text → HTML | Searched assignment/append HTML sinks and traced representative project, layer, caption, filename, template, collaboration and AI text paths. No confirmed attacker-controlled markup reached an executable sink. Examples: `js/ai-chat.js:35` and `js/collab-comments.js:58` use `if (text != null) e.textContent = text` / `d.textContent = text`. Inspector category labels at `js/inspector.js:3932,3957–3959` resolve to fixed labels (`elementLabel` at 2708–2711); icons/HTML helpers examined use app-owned markup. This is not a proof against every DOM-XSS path. |
| Imports and prototype pollution | Reviewed `sceneFileProblem`, `applyScene`, sanitizers, re-ID and pack import/export paths. Exported templates use the same portable project format (`js/storage.js:3106–3107,3126`). No confirmed prototype-pollution chain; re-ID uses `Object.create(null)` at 2050. F2 covers the remaining unverified resource concern. Generic malformed-import behavior already logged as #673 was excluded. |
| Collaboration | Reviewed host transaction validation/roles, path cloning, session dispatch, media admission, presence cleaning and transport parsing. F1 is confirmed. Path grammar and cloning exclude prototype keys; existing role/comment/media/resync findings were excluded. A validly admitted editor can intentionally edit content; that alone is not a security defect. |
| BYOK storage and leaks | `js/ai-key.js:14,17,26–29` uses `fm.anthropic.key`: memory while in use, plaintext localStorage when “remember” is selected. Exact persistence operation: `if (mem && remember) localStorage.setItem(LS_KEY, mem);`. This is readable by same-origin script; no exploit granting such access was established. `js/ai.js:15,47–61` sends the key as `'x-api-key': key` to fixed `https://api.anthropic.com/v1/messages`, not a user-selectable host or URL query. No key logging/export/collaboration leakage was found. Project/backup serializers enumerate project/layers/media/fonts (`js/storage.js:979,1876`), not all localStorage. Pasting a key into arbitrary document content cannot be made confidential by the storage design. |
| Service worker | `sw.js:100` uses `if (req.method !== 'GET') return;` and 104 uses `if (url.origin !== self.location.origin) return;`. Thus the cross-origin Anthropic POST is not cached by this worker. Versioned same-origin GETs and navigation fallback are cached. No sensitive cached response was established for the reviewed static-app paths. The worker is not a confidentiality boundary against other same-origin script. |
| postMessage/origin | `js/collab-link.js:167–198` defines `PostLink`: default `const origin = o.origin || '*';`, and its handler checks envelope IDs/channels, not `e.origin` or `e.source`. However, the discovered caller is the test rig at `tests/collab-agent.js:43`; no production instantiation was found. Therefore this is **not** presented as a confirmed production origin-bypass finding. If promoted to production, source/origin authentication needs review. Private MessagePort handlers were not treated as public window message handlers. |

The audit is pinned to the recorded commit. Changes made by the other sessions after that commit require separate review. No broad suite was run and no existing tests were changed.

## Ranked top 10

Only two nonduplicate items met the evidence threshold; positions 3–10 are intentionally unfilled rather than invented.

1. **F1 — Medium, confirmed:** admitted editor can make the owner's host throw after mutating authoritative state, before sequence/acknowledgement.
2. **F2 — Medium, UNVERIFIED impact:** unbounded project-file reading/parsing/cloning may exhaust browser memory; device-level reproduction required.
