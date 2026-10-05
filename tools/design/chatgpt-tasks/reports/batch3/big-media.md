# Big-media phone risk review

Snapshot: `28104a3e83e01ac3880db3fac604a7444c7235aa`

Static review of media add, project hydration, thumbnail/waveform creation, playback and export paths, prioritizing phone memory. This report records code exposures and concrete confirmation steps. No iPhone was available for measurement, so device failure thresholds are marked **UNVERIFIED**. Previously recorded scenarios were excluded.

## Findings

### 1. Full-resolution photos are decoded without a source-dimension cap, and the project retains each image record

**Severity:** High potential impact on phones; likelihood depends on source dimensions and device memory  
**Confidence:** High that no dimension limit is applied on this path; **UNVERIFIED** that a particular iPhone will be killed.

**Evidence:** `js/media.js:801-807` creates a full Image from the original file and returns its native dimensions:

> const url = URL.createObjectURL(file);  
> const el = new Image();  
> el.onload = () => resolve({ kind: 'image', el, url, file, width: el.naturalWidth, height: el.naturalHeight });  
> ...  
> el.src = url;

There is no dimension check between decode and resolve. On reopen, `js/storage.js:457-472` walks every non-text layer, awaits loading, then retains each record in `FM.media`:

> for (const layer of FM.scene.layers) {  
> ...  
> const loaded = rec.kind === 'video' ? await FM.loadVideoFile(rec.file) : await FM.loadImageFile(rec.file);  
> ...  
> FM.media.set(layer.id, loaded);

**Trigger:** On iPhone, import a very large still (for example 8000×8000) or open a project with many such image layers; then scrub/play or export.

**Rough cost:** One 8000×8000 RGBA raster is about 256,000,000 bytes (244 MiB) before decoder, canvas, thumbnail and GPU copies. This is a raw-pixel estimate, not measured resident memory. A 50-photo project can retain many image elements/records; the browser may discard decoded surfaces, so actual cumulative memory is **UNVERIFIED**. Likely first pressure point: decoding/importing a very large still or hydrating many full-resolution stills, before the export encoder starts.

**Focused measurement:** On the actual iPhone, open a clean project, add one 8000×8000 JPEG/HEIC, and note whether import completes and preview remains responsive. Repeat with 5, then 20, then 50 ordinary 12MP photos. Record the first point where import, project reopen, scrub or export stalls/reloads. Use the same test project and source files; do not infer a threshold from desktop memory.

### 2. Each video layer receives its own video element with preload set to auto; there is no app-side active-decoder limit in the load path

**Severity:** Medium potential performance/memory impact  
**Confidence:** High for element creation and preload hint; **UNVERIFIED** for decoder count and iPhone resource usage.

**Evidence:** `js/media.js:125-134` creates a new video element for each loaded file and requests automatic preload:

> const url = URL.createObjectURL(file);  
> const el = document.createElement('video');  
> ...  
> el.src = url;  
> ...  
> el.preload = 'auto';

Project hydration loads each media layer and keeps its record at `js/storage.js:457-472` (quoted above). The requested preload value is a browser hint; this source alone does not prove how much each browser buffers or decodes.

**Trigger:** Import a project containing many 4K/60fps video layers, including clips that are not currently visible, then scrub or play on iPhone.

**Rough cost:** Per-element decoded-frame/buffer cost and the maximum number of simultaneous hardware decoders vary by device and codec. The source proves one HTMLVideoElement per loaded clip, but not the browser's actual decoder allocation. The point at which iOS slows, refuses playback or kills the PWA is **UNVERIFIED**.

**Focused measurement:** On iPhone, build/import 1, 4, 8 and 12 short 4K/60fps clips. After each count, reopen the project, scrub across clips and play overlapping clips. Record first import/reopen stall, black frame, audio interruption or app reload, and whether the failure recovers after closing/reopening.

### 3. HEIC/HEIF image import has no app-level conversion or fallback path

**Severity:** Low to medium compatibility risk  
**Confidence:** High that the app delegates image decoding to the browser; **UNVERIFIED** whether a given iOS/browser build decodes a particular HEIC/HEIF file.

**Evidence:** `js/media.js:801-807` creates an object URL, asks a browser Image element to load it, and rejects on its error event:

> const el = new Image();  
> el.onload = () => resolve({ kind: 'image', el, url, file, width: el.naturalWidth, height: el.naturalHeight });  
> el.onerror = () => { try { URL.revokeObjectURL(url); } catch (e2) {} reject(new Error('Could not load image: ' + file.name)); };

No alternate decoder or conversion is called from this function.

**Trigger:** Import an original HEIC/HEIF photo from the iPhone Photos picker or Files app. If that specific browser/file combination cannot decode it, this path rejects rather than converting it.

**Rough cost:** Not a performance estimate; outcome depends on the source encoding and browser support. Actual iPhone behavior is **UNVERIFIED**.

**Focused measurement:** Import one original HEIC from Photos and one JPEG export of that same photo. Compare whether both create a layer, how long each takes, and whether the original's dimensions/orientation are retained.

## Areas checked

- Video loading creates its element before metadata resolves; no concurrent-decoder cap is visible in this path.
- Still-image loading returns the full-resolution Image element and dimensions. The current path does not downsample the source for preview.
- Waveform creation has an explicit size/peak budget in `js/media.js:917-920` and `js/media.js:993-1009`; full-fidelity audio decode also has separate paths. No new waveform defect was confirmed in this source-only pass.
- Canvas project dimensions are separately clamped on import; that does not bound the dimensions of an imported source photo.
- No stable estimate of the “first” failing iPhone workload can be stated from source alone. Finding 1 is the most plausible initial pressure point because it decodes original stills before export; real-device measurement is required.
