# Per-frame whole-scene scans

Snapshot: `28104a3e83e01ac3880db3fac604a7444c7235aa`  
Branch: `chatgpt/per-frame-scans`

## Scope and method

I searched `REQUESTS.md` and `audits/*.json` for renderScene, scene scans and group traversal. The logged scaled-group pivot issue (#690 / audit 937) is already fixed with stored pivots and is not repeated here. This is source analysis only: no browser benchmark or 500-layer render was run. Costs below are loop-count formulas, not measured milliseconds.

## Findings

### Nested group discovery repeatedly scans all layers

**Confidence: high; source-derived.** `renderScene` calls `collectGroupUnits` once each frame. It loops over all groups, and for each qualifying visual group recursively scans all `scene.layers` to discover children.

- `js/compositor.js:17863-17879` — quote: `for (const g of scene.layers)` and the recursive `scene.layers.forEach(l => ...)`.
- `js/compositor.js:18351-18354` — call site: `const memberToUnit = collectGroupUnits(scene, t);`
- Cost: `N × sum(descendant group nodes per qualifying group)`; flat groups are approximately `O(NG)), deeply nested groups can reach `O(NG²)). With 500 layers and 250 nested visual groups, the recursive scans alone can approach `500 × (250×251/2) = 15.7 million layer visits/frame`, or roughly 470 million/second at 30fps. This is a structural upper bound, not a measured workload.
- **Computable once/frame?** The parent-to-children relation is stable during a synchronous render. A single child index can replace rescanning the array at each recursive node; visibility and flattened pixels still vary by frame.

### Each flattened visual group performs another scene-wide pass

**Confidence: high; source-derived.** Group rasterization scans the whole array to draw members and does a second linear lookup for the group's mask.

- `js/compositor.js:17969-17988` — quote: `for (let i = scene.layers.length - 1; i >= 0; i--)` and `scene.layers.find(l => l.id === u.maskId)`.
- `js/compositor.js:18053-18055` — `drawGroupUnit` calls `buildGroupUnit`; renderScene invokes it in the main layer traversal at `18407-18415`.
- Cost: about `U×N) layer checks per frame for `U) flattened groups, plus each group's actual member rendering. At `U=250,N=500`, the top-level scans are about 125,000 visits/frame, 3.75 million/second at 30fps. Nested unit rendering can add repeated work. A group with Fill Behind can also be flattened in the pre-pass and later in the main pass (`18383-18402`).
- **Computable once/frame?** Member arrays and mask references can be indexed once and reused. Rasterization cannot be reused across frames where layer pixels/animation change.

### Parented layers multiply linear id lookups by parent depth

**Confidence: medium-high; source-derived and input-dependent.** Every parented rendered layer calls `applyParentChain`; each ancestor resolution calls `FM.clipAt`, which calls a linear `layerById`. A split parent may trigger another whole-array scan.

- `js/compositor.js:2748-2759` — quote: `const pl = FM.clipAt(scene, pid, t);`
- `js/scene.js:833-835` — quote: `return scene.layers.find(l => l.id === id) || null;`
- `js/scene.js:786-796` — `clipAt` scans siblings with matching split lineage if the first half does not cover time.
- Cost: `P×D×N) per frame, for `P) parented layers, mean depth `D), and `N) layers; a non-covering split half can add an extra `N) scan. At 500 layers, 250 parented layers, depth 3: about 375,000 comparisons/frame (~11.25 million/second at 30fps), before split lookups. Normal unparented projects do not pay this path.
- **Computable once/frame?** An id map and split-lineage index can be built once; transforms remain time-dependent.

### Legacy transformed groups without stored pivots can repeat a recursive bounds scan

**Confidence: medium; narrow path, source-derived.** A scaled/rotated group with no stored pivot falls back to rest-bounds measurement. The renderer's child transform can request that repeatedly.

- `js/compositor.js:2787-2789` — quote: `FM.groupPivot(pl, scene, t)` is called when a parent group has rotation/scale.
- `js/compositor.js:18817-18823` — absent stored pivot calls `groupPivotMeasured`.
- `js/compositor.js:18768-18789` — rest bounds recursively call `scene.layers.forEach` for each group.
- Cost: approximately `C×D×N) per frame for `C) rendered children under a qualifying legacy group and nesting depth `D). The ordinary UI write path stores pivots, so the cost is limited to imported/legacy state without that field. No runtime occurrence was measured.
- **Computable once/frame?** Yes, memoize bounds per group during the render; rest bounds could also be cached until membership/transforms change.

## Linear passes

The drag-order map (`18240-18245`), camera lookup (`activeCam`, `18071-18073`), solo/isolate checks (`18354`, `18371-18373`), Fill Behind pass (`16499-16510`) and final layer traversal (`18407+`) are whole-scene but linear individually. They are not called out as nested findings. Pixel/effect cost may dominate wall-clock time; no elapsed-time claim is made.

## Measurement recipe

Use identical 500-layer fixtures with (1) 250 nested visual groups, (2) 250 flat visual groups, and (3) 250 parented layers at depth 3. Count visits in the cited loops and time a warmed 300-frame `FM.renderScene` run at fixed dimensions/30fps. Compare traversal counters and p50/p95 timing with simple-layer control. Not executed for this report.

