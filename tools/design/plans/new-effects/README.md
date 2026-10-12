# New effects — options for Ezra to pick from (#966, backlog §B B8 + B1)

Data, checks and render probes only. Nothing here is in the app; his rule (#545) is draw the options, he picks, then build.
Branch `new-prep` (d50f8732: e1-land + polish batches 7 and 8). Every effect/control used exists on it.

## What is here

| File | What |
|---|---|
| `filter-candidates.js` | 12 filter looks (8 from B8, 4 new) + 3 reserves, as `js/filters.js` entries; the distance table at the bottom; `COMPARE` = the 3 existing filters each sits nearest to on its own photo |
| `voices.js` | 16 voices (the backlog's 13 + 3 extra) as stacks of existing audio effects; what could not be built is said in its header |
| `measure-filters-node.js` | no browser: build checks, #675's distance (with a control against browser-measured numbers), #858, #579, photo distances; `--write` refreshes the tables |
| `check-voices-node.js` | no browser: every voice builds, schedules and survives the load sanitiser (mock Web Audio; three controls that must fail) |
| `render-filters-probe.js` / `render-voices-probe.js` | `tools/shot.py --js-file` probes: the real compositor / audio chain |
| `recv.py` | local receiver the probes POST to (shot.py cuts a probe's return value at 4000 chars) |
| `run-probes.sh` | the browser-slot run: serve + recv + shot.py + compose + WAVs |
| `compose-filters-sheet.py` | filters.json → one contact sheet + phone-sized pages |
| `decode-photos.py` | fx-art → raw RGBA for the node photo measure |

## Run

No browser (any time, `nice -n 19` while a ship runs):

    node tools/design/plans/new-effects/measure-filters-node.js            # add --photos <dir from decode-photos.py> --write to refresh tables
    node tools/design/plans/new-effects/check-voices-node.js

In a browser slot (refuses without `~/.fm-browser-slot`, or while a ship/mutation runs):

    FM_RECOMMEND=handheld,xray,cctv,pencil,autumn,stainedglass,ledwall,darkroom \
      tools/design/plans/new-effects/run-probes.sh both /tmp/fm-new-effects

It prints the exact `shot.py` lines it runs. Out: `filters-sheet.jpg` (+ `-p1..p4.jpg` for his phone), `voices/NN-<id>.wav`,
and the probe's in-Chrome re-take of #675 in `filters-shot.txt` (the node table is a model of it; this is the thing itself).

## Things found on the way

- `tools/shot.py` prints `json.dumps({'js': val})[:4000]`: no probe can return images or WAVs through it — hence `recv.py`.
- The batch-7 `sounds-probe.js` pattern returned nothing: an IIFE inside shot.py's `(async () => { … })()` wrapper is not the
  wrapper's return value, and `FM.audioBufferToWav` returns a **Blob**, so `new Uint8Array(blob)` was empty. Both probes here
  are function bodies and read the Blob's `arrayBuffer()`.
- The fx-art photos are 320 px, so 720 px renders are upscaled 2.25×.
