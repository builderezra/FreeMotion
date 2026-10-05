# Per-frame whole-scene scans

Snapshot: `28104a3e83e01ac3880db3fac604a7444c7235aa`  
Branch: `chatgpt/per-frame-scans`

## Scope and method

I searched `REQUESTS.md` and `audits/*.json` for compositor/per-frame scene scans, group traversal and `renderScene`. The recorded scaled-group pivot defect (#690 / audit 937) is already fixed with stored pivots and is not repeated as a defect here. Existing camera/effect findings are not restated.

This is a source-read cost analysis of the current render call tree. I did not run a browser benchmark or a 500-layer render in this clone; all counts below are formulas / worked upper-bound examples, not measured milliseconds.

## Findings

### 1. Visual group discovery recursively rescans the entire layer array

**Confidence: high (source-derived).** `collectGroupUnits` runs from `FM.renderScene` every rendered frame. For every visible group requiring flattening, its recursive `walk` scans every scene layer to find that group's children:

- `js/compositor.js:17863-17879`: `for (const g of scene.layers)` and, for each qualifying group, `scene.layers.forEach(l => ...)` inside recursive `walk`.
- `js/compositor.js:18351-18354`: the per-frame `renderScene` call site is `const memberToUnit = collectGroupUnits(scene, t)`.
- The outer scan is `N). The nested cost is `N × sum(descendant-group-count(g))`; a deeply nested tree can make this approach `O(N·G²)`, while a flat set of groups is about `O(N·G)`. For 500 layers with 250 nested visual groups, the recursive scans alone can reach about `500 × (250×251/2) = 15.7 million` layer visits per frame. At 30 fps that is about 470 million visits/second before drawing pixels. This is an intentionally conservative structural upper bound, not a benchmark.
- **Can it be computed once/frame?** Yes. The function already computes a frame-local group-unit map; building a parent-to-children index in one pass and reusing it across the group walks would avoid rescanning all `N` layers for each recursive parent. Membership and visibility still need frame-specific handling.

The recursive scan also allocates a `Set` and a members array for each qualifying group (`17868-17870`), then later builds membership maps (`17902-17917`); these costs are subordinate to the repeated scene scans at large nesting depth.

### 2. Flattening each group unit makes another whole-scene pass, including group-mask lookup

**Confidence: high (source-derived).** A group unit is drawn from the main loop and may also be flattened in the Fill Behind pass. Each `buildGroupUnit` scans `scene.layers` from end to start to draw its members, then separately searches the entire list for the mask layer:

- `js/compositor.js:17969-17988`: `for (let i = scene.layers.length - 1; i >= 0; i--)` runs for each group unit; if there is a group mask, `scene.layers.find(l => l.id === u.maskId)` adds another linear lookup.
- `js/compositor.js:18053-18055`: `drawGroupUnit` calls `buildGroupUnit`; the main layer loop calls it at `18313-18315` (exact loop lines: 18407-18415).
- Cost is approximately `U × N` layer checks per frame for `U` group units that are flattened, plus recursive work for nested units and pixel rendering of each member. With 250 flattened groups and 500 layers, the outer scans alone are roughly 125,000 layer checks/frame (3.75 million/second at 30 fps); deeply nested groups can add repeated child flattening. The Fill Behind callback can request a group flatten before the later main layer loop, so groups with group-level Fill Behind can incur a second build in that same frame (`18383-18402`).
- **Can it be computed once/frame?** The group member lists and mask-layer references can be indexed/reused from `collectGroupUnits`. The actual rasterized group plate cannot be reused across frames because the member pixels, animated transforms, and effects change.

### 3. Parented rendering can multiply linear lookups by parent depth

**Confidence: medium-high (source-derived; input dependent).** Every rendered layer with a parent calls `applyParentChain`; resolving each parent invokes `FM.clipAt`, which first calls linear `FM.layerById`. For a split parent, `clipAt` may scan the layer array again to find the time-owning half:

- `js/compositor.js:2748-2759`: each parent-chain step calls `FM.clipAt(scene, pid, t)`.
- `js/scene.js:833-835`: `FM.layerById` is `scene.layers.find(...)`, therefore `O(N)).
- `js/scene.js:786-796`: `clipAt` uses that lookup and, when `splitOf` is set and its first half does not cover `t`, loops all layers at `792-795`.
- Cost is `P × D × N` per frame for `P) parented rendered layers and mean ancestor depth `D`; split-lineage lookups add another up-to-`N` scan for each split parent that needs its sibling. At 500 layers with 250 parented children and depth 3, the first lookup can be about 375,000 comparisons/frame (~11.25 million/second at 30 fps), worst-case order-dependent. Ordinary unparented projects pay none of this path. No browser timing was taken.
- **Can it be computed once/frame?** A per-frame ID map plus split-lineage index could be built once and reused by `clipAt`; parent transforms themselves remain time-dependent.

### 4. Conditional legacy-group pivot fallback can repeat a recursive full-scene bounds walk

**Confidence: medium (source-derived, narrow legacy path).** A transformed group with no stored `pivot` asks `groupPivot` to measure the rest bounds. That walk scans all layers at every nested group; the renderer can ask for it once per rendered child per frame:

- `js/compositor.js:2787-2789`: a scaled/rotated parent group calls `FM.groupPivot(pl, scene, t)` during each child’s parent-chain transform.
- `js/compositor.js:18817-18823`: if the group has no stored pivot, `groupPivot` falls back to `groupPivotMeasured` without a time.
- `js/compositor.js:18768-18789`: the no-time measure calls `groupRestBoundsLocal`; its recursive `walk` uses `scene.layers.forEach` at each group depth.
- Cost is about `C × D × N) per frame for `C) parented children whose scaled/turned ancestor lacks a stored pivot and nested-group depth `D). The normal UI write path stores a pivot, so this is limited to legacy/imported groups or other inputs where that field is absent; no runtime occurrence was measured.
- **Can it be computed once/frame?** Yes, by memoizing bounds/pivot per group during a render. Better still, this rest box depends on membership and static project-time values rather than current render time, so it may be cached until the group’s membership/transforms change.

## One-pass scans that are not nested costs

`renderScene` also makes expected linear passes: drag-order map creation (`18240-18245`), active-camera lookup (`18259` via `activeCam`, `18071-18073`), group-unit discovery, solo/isolate checks (`18354`, `18371-18373`), Fill Behind traversal (`16499-16510`), and the final layer draw (`18407+`). By themselves these are `O(N)) per frame; the findings above are the multiplicative paths. The camera and frame pixel work can still dominate elapsed time, but no pixel timing was collected here.

## How to measure on the app

Use a synthetic scene with 500 layers, separate variants with (a) 250 visual groups nested as a chain, (b) 250 flat visual groups, and (c) 250 parented children at depth 3; keep effects simple and render the same canvas at fixed dimensions and 30 fps. Instrument only the cited loops with counters and time `FM.renderScene` over a warmed 300-frame run. Report per-frame loop counts as well as median / p95 time so raster cost is separated from traversal. This measurement was not executed for this report.

