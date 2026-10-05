# FreeMotion performance and memory review

Reviewed 1 October 2026, snapshot `28104a3e83e01ac3880db3fac604a7444c7235aa` (v17.21), isolated branch `chatgpt/performance`. This report is the only added file. No source, tests, release files or running app were changed.

## Results and measurement limits

Three nonduplicate findings are supported below. Small Node probes evaluated the actual helper source extracted in memory from `js/compositor.js`, with counters and minimal stand-ins for browser APIs. They established operation counts, allocation sizes and retained cache entries. They did **not** measure browser frame times, native image memory, or iPhone behavior. Those impacts and all speed-up projections are **UNVERIFIED** until measured on the target device. No broad suite or competing browser benchmark was run.

Read the requested compositor, timeline, app playback/refresh and exporter paths. Searched `audits/*.json` and `REQUESTS.md` for their features/files, then specific helpers and failure mechanisms; also checked the active checkout's audit records. Existing findings were excluded: full-resolution group plates ignoring preview scale, earlier inspector/timeline accumulation, timeline gesture loops continuing after cancellation, and export encoder/VideoFrame cleanup on error paths (already explicitly recorded around `REQUESTS.md:26753–26758`). Existing 500-layer collaboration timing reports are not renderer measurements and were not recycled as new findings.

The costs below use the actual render-buffer dimensions. A phone's downscaled preview is not automatically a full 1080×1920 render; export and particular fallback paths can have different sizes. No desktop timing is presented as an iPhone result.

## P1 — Group membership is rebuilt with repeated full-scene scans every frame

**Severity: medium. Confidence: high for operation count; device-level slowdown UNVERIFIED.** Affects grouped scenes, including unchanged group topology during playback and export.

### Evidence

Every `FM.renderScene` calls the collector at `js/compositor.js:18353`:

```js
const memberToUnit = collectGroupUnits(scene, t);
```

The collector at `js/compositor.js:17866–17879` traverses the entire flat layer array for each visited group, and repeats descendant discovery independently for each composited group:

```js
for (const g of scene.layers) {
  if (g.type !== 'group' || !g.visible || !groupNeedsUnit(g, t)) continue;
  const members = [];
  const seen = new Set();
  (function walk(gid) {
```

```js
  if (seen.has(gid)) return;
  seen.add(gid);
  scene.layers.forEach(l => { if (l.parent === gid) { members.push(l); if (l.type === 'group') walk(l.id); } });
})(g.id);
```

`js/compositor.js:17889` additionally allocates a membership Set and mapping array per unit:

```js
units.push({ group: g, memberIds: new Set(members.map(l => l.id)), maskId: maskId, drawn: false, depth: 0 });
```

### Why it costs time

Topology does not normally change between playback frames. Nevertheless, discovery repeatedly tests unrelated layers. For flat groups this part is approximately `G × N`; nested groups repeat traversal of descendant groups as well. The per-frame active-unit decision may change with animated opacity/effects, but that does not require rebuilding the parent-child adjacency relationships.

**Controlled observation:** instrumented the actual collector's `scene.layers.forEach` callbacks, including its final ID-map pass:

- 500 entries: 250 composited groups, each with one shape: **125,500 callbacks per call**.
- 500 entries: 50 nested composited groups, with 450 shapes under the innermost group: **638,000 callbacks per call**.

Groups used opacity 0.5 to meet `groupNeedsUnit`; no drawing or canvas mock timing was included. At 30 renders/s those are approximately **3.77 million** and **19.14 million** layer callbacks/s respectively, before rasterization. Motion-blur/subframe rendering can multiply calls; that multiplier was not measured. These are constructed scaling examples, not a claim that ordinary projects contain 50 nested groups.

### Trigger and exact measurement plan

1. Use a disposable 500-entry project. For a practical control, compare 500 flat shapes with a version containing visible composited groups; set group opacity to 0.5. Keep effects, canvas size, render scale and media constant. The exact count fixtures above can be created through a test fixture rather than hundreds of UI actions.
2. Connect Safari Web Inspector to the iPhone. Warm playback once; record 10 seconds on the same frame range. Also record a short export separately.
3. Profile `collectGroupUnits`, count its calls and attribute self/total time separately from group rasterization. Record actual target canvas dimensions and preview quality tier.
4. For a repeatable operation-count check, wrap only that fixture array's `forEach` with a callback counter and invoke the extracted, unchanged collector once, as this review did. Do not use that instrumented run as a timing result.
5. After a future fix, compare collector median/p95 and whole-frame median/p95 with identical output frames. Preserve time-varying group activation, masking, ordering and nesting semantics.

**Expected opportunity:** eliminate most repeated full-array topology scans using a parent adjacency/index cache with correct invalidation. The helper's search work could fall substantially; a whole-app percentage is **UNVERIFIED**, especially where pixel effects dominate.

## P2 — CPU blur fallback allocates two full float images on every invocation

**Severity: medium. Confidence: high for allocations; activation and frame-time impact on a particular iPhone UNVERIFIED.** Conditional on the CPU fallback actually being used.

### Evidence

`js/compositor.js:1834–1838` reads the whole working image and allocates two new four-channel float buffers:

```js
function cpuBlurCanvas(cv, W, H, sigma) {
  const g = cv.getContext('2d');
  let img; try { img = g.getImageData(0, 0, W, H); } catch (e) { return false; }
  const d = img.data, N = W * H;
  let a = new Float32Array(N * 4), b = new Float32Array(N * 4);
```

`js/compositor.js:1897–1899` selects this path when the GPU blur does not return output:

```js
if (blur) {
  const o = FM.glColor && FM.glColor.blur ? FM.glColor.blur(_nbA, ww, wh, rw, { premul: true }) : null;
  if (o) back(o); else cpuBlurCanvas(_nbA, ww, wh, rw);
```

The buffer size is not necessarily the project size. `js/compositor.js:1887–1889` scales large radii down and adds padding:

```js
const k = r > 16 ? r / 16 : 1, rw = r / k;
const pad = blur ? Math.ceil(rw * 3) + 2 : 0;
const ww = Math.max(1, Math.ceil(dw / k) + 2 * pad), wh = Math.max(1, Math.ceil(dh / k) + 2 * pad);
```

### Why it costs time/memory

Two buffers × four floats × four bytes produce **32 × W × H bytes of fresh typed arrays per invocation**, plus approximately **4 × W × H** bytes of ImageData. Allocations, zero-initialization, the readback and multiple full-image blur passes compete for memory bandwidth and garbage collection. Reusing the float scratch space would remove allocation churn, but would not remove the underlying blur arithmetic or readback.

**Controlled observation:** executing the actual `boxesForGauss`/`cpuBlurCanvas` helpers on a 16×16 mock image allocated exactly two Float32Arrays totaling **8,192 bytes**. Their size formula is independent of device speed.

For an *actual helper grid* of 1080×1920: about **66.4 MB** of fresh float arrays, approximately **74.6 MB** including ImageData, per invocation. At 30 invocations/s that is approximately **2.24 GB/s of allocation volume**, not 2.24 GB of permanently retained memory and not measured bandwidth. The backing canvas and native intermediates are additional; padding/downscaling change the exact number.

### Trigger and exact measurement plan

1. In a disposable development session, use a moving layer with blur and inspect whether execution reaches `cpuBlurCanvas`. Do not infer this merely from the device being an iPhone: the GPU alternative may work.
2. If the real device never takes the branch, classify this as fallback-only, with no expected improvement for that normal configuration. To isolate it, invoke the exported `FM._drawBlurredNoFilter` seam while temporarily making `FM.glColor.blur` return `null` in that disposable session; restore it afterward. This forced-path run is not proof of normal iPhone behavior.
3. Record the `W`, `H`, call count and radius at `cpuBlurCanvas` for a 5-second run. Use Safari's allocation/timeline tooling to measure allocation churn, collection pauses and frame p95; record canvas size and quality tier.
4. Repeat once at half working resolution to test the pixel-area dependence. Compare future pooled-buffer changes against the same rendered output, including transparency, and measure separately from any algorithm change.

**Expected opportunity:** remove nearly all **32WH** repeated float-buffer allocation when dimensions stay constant, through correctly scoped reusable scratch buffers. Actual speed-up remains **UNVERIFIED**; reentrancy and dimension changes must be handled. This is not a recommendation to disable the fallback or sacrifice blur correctness.

## P3 — Fill-image cache retains a previous project's high-water mark

**Severity: medium. Confidence: high for JS reachability; decoded-image residency and iPhone memory impact UNVERIFIED.** Memory retention, not necessarily continuous frame-rate loss.

### Evidence

`js/compositor.js:14672–14677` keeps a module-lifetime cache keyed by layer ID:

```js
const _fillImg = {};
function getFillImage(layer) {
  const src = layer.fillImage;
  if (!src) return null;
  let rec = _fillImg[layer.id];
  if (!rec || rec.src !== src) {
```

`js/compositor.js:14683–14689` evicts at most one dead entry, only while inserting/replacing another:

```js
const keys = Object.keys(_fillImg);
if (keys.length > 40) {
  const live = new Set((FM.scene && FM.scene.layers || []).map(l => l.id));
  const dead = keys.find(k => !live.has(k) && k !== layer.id);
  if (dead) delete _fillImg[dead];
}
rec = _fillImg[layer.id] = { src: src, img: new Image(), ready: false };
```

No other references to `_fillImg` clear it on project departure. This is deliberately preferable to evicting still-live fills every frame, but it leaves a separate dead-entry retention gap.

### Why it retains memory

If 100 fill-image layers are all live, no entry qualifies for eviction. Leaving that project does not call cache cleanup. Adding one fill in another project removes one old entry and inserts one new entry, so the total remains 100. Replacing entries gradually changes their owners, but does not shrink the cache to its advertised small threshold.

This is **not** an assertion that opening equally sized projects grows the cache without bound: it retains the high-water mark. There is also a small-cache allowance around the threshold. Each retained entry strongly references an Image and its source data URL. Browsers may independently discard decoded image storage; exact resident/native memory cannot be deduced from those references alone.

**Controlled observation:** with the actual cache helper and mock Images, 100 live fills produced 100 cache entries; switching to an empty scene left **100**; requesting one fill in a new scene still left **100**. The mock establishes reachability, not browser decoding or GPU memory retention.

**Rough cost:** 100 distinct 1024×1024 RGBA decoded images represent approximately **400 MiB** if all decoded buffers remain resident, plus encoded source strings and native overhead. That is a planning estimate, **UNVERIFIED**, not measured retained heap. Repeated identical URLs may share native resources, so use distinct image contents when testing.

### Trigger and exact measurement plan

1. In a disposable project, use 100 distinct image fills on shapes (not ordinary media layers). Render them so every fill is requested. Record a Safari heap snapshot and process-memory baseline after loading stabilizes.
2. Open a small text-only project. Clear the old undo/scene ownership through the normal project switch; wait for pending loads to finish. Take another snapshot after garbage collection if the inspector offers it.
3. Inspect retaining paths to the Images/data URLs. Confirm the compositor's `_fillImg` closure is retaining the old entries; distinguish it from legitimate library/history ownership.
4. Add one image fill in the new project, then repeat the snapshot. Cache count should match the observed high-water behavior; separately measure whether native decoded memory falls.
5. After a future cleanup change, compare post-switch retained entries and process memory. Reopen the 100-fill project and check for placeholder flicker/redecode thrashing, since aggressively evicting live entries would reintroduce the problem this cache comment describes.

**Expected opportunity:** release dead cache entries on a safe scene/lifecycle boundary while keeping active fills stable. The likely benefit is lower long-session memory pressure and fewer reloads under pressure; FPS improvement is **UNVERIFIED** and may be zero when memory is plentiful.

## Other requested areas examined

- **Timeline rebuild frequency:** `js/timeline.js:3896` clears `tracksEl.innerHTML`, and lines 3942–3962 recreate displayed rows via `buildHead`/`buildLane`. Rebuild is broad, but it is not called unconditionally on every playback frame; gesture/debounce paths already exist at 5670–5689 and 5659–5661. Existing timeline/large-project profiling and rebuild complaints were found in `REQUESTS.md`, so generic “rebuild is slow” is not presented as a new measured finding. No new listener-accumulation chain was established from recreated row-local handlers alone.
- **Animation/timer loops:** inspected app playback and timeline gesture loops/teardown. `js/app.js:2643` cancels playback RAF; timeline contains explicit gesture cancellation/recovery. Previously documented runaway gesture probes were excluded. No additional always-running loop was confirmed.
- **Object URLs:** sampled application/exporter create/revoke pairs. For example `js/exporter.js:48–52` revokes its generated download URL after a delay. No new unpaired URL lifetime was confirmed in the reviewed paths. A delayed revocation alone is not proof of a leak.
- **Export resources:** seek listeners are removed in `js/exporter.js:193`; success closes VideoFrames/encoder at 1498/1516. Potential exceptional-path codec cleanup was already recorded and is excluded, not declared safe. Read audio mixing and encoded-chunk accumulation paths, but did not establish a new nonduplicate runaway allocation with a verified practical trigger.
- **Other per-pixel kernels/caches:** numerous kernels legitimately need image-sized workspaces; allocating memory is not automatically a leak. P2 names one specific repeat allocation with a verified count. No unsupported timing estimates are attached to the rest.

## Top 10 by expected speed-up

Only three nonduplicate items met the evidence threshold. Positions 4–10 are intentionally unfilled. Ranking is conditional on the workload; percentages and whole-app speed-ups remain **UNVERIFIED**.

| Rank | Finding | Where it could help | Expected removable cost |
| --- | --- | --- | --- |
| 1 | P1 — group topology scans | Group-heavy playback/export, especially nested scenes | Most repeated whole-layer-list searches; observed 125,500–638,000 callbacks per collector call in 500-entry fixtures |
| 2 | P2 — CPU blur scratch churn | Devices/runs actually using CPU fallback blur | 32WH bytes of fresh float arrays per invocation; does not eliminate blur computation |
| 3 | P3 — dead fill cache retention | Long editing sessions after leaving a fill-heavy project | Dead Image/data-URL references; speed benefit indirect through reduced memory pressure |
