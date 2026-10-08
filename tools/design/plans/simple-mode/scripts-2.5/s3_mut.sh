#!/bin/bash
# The eight mutations of release 2.5 (run from a checkout of hunt/simple-2.5; each is one tools/mutate.sh --only run).
cd "$(dirname "$0")/../../../../.." ; export FM_CHROME=${FM_CHROME:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3; }
m N1 js/simple-timeline.js 'if (d < bd) { bd = d; best = c[0]; }' 'if (false) { bd = d; best = c[0]; }' 'simple P2.5 · S3 a text dragged sideways'
m N2 js/simple-timeline.js 'if (hardGate(r)) { clearPreview(); teardown(); FM.spine.explain(r, id); return; }' 'if (false) { clearPreview(); teardown(); FM.spine.explain(r, id); return; }' 'simple P2.5 · S3 the arm gate'
m N3 js/simple-timeline.js 'if (hardGate(r)) { refreshNodes(); FM.spine.explain(r, id); return; }' 'if (false) { refreshNodes(); FM.spine.explain(r, id); return; }' 'simple P2.5 · S3 the arm gate'
m N4 js/simple-timeline.js 'if (v !== 0 && ++G.scrollFrames <= SCROLL_FRAMES_MAX) {' 'if (v !== 0 && ++G.scrollFrames <= 1e12) {' 'simple P2.5 · S3 holding the finger at the edge'
m N5 js/simple-timeline.js '    if (hardGate(gateOf(id))) return;
    const w = (e.end - e.start) * p;' '    const w = (e.end - e.start) * p;' 'simple P2.5 · S3 the selected clip shows two grips'
m N6 js/simple-timeline.js 'if (nowMs() < swallowUntil) { swallowUntil = 0;' 'if (false) { swallowUntil = 0;' 'simple P2.5 · S3 FINGER: a hold of 350 ms'   # SURVIVES here: only a finger proves it (NOT RUN on Linux)
m N7 js/app.js 'if (FM.simpleTimeline && FM.simpleTimeline.abortGestures && FM.simpleTimeline.abortGestures(same)) hit = true;' 'if (false) hit = true;' 'simple P2.5 · S3 the arm gate'
m N8 js/spine-edit.js 'if (tc < (e.start + e.end) / 2) return k;' 'if (tc < e.end) return k;' 'simple P2.5 · S3 the pure parts'
