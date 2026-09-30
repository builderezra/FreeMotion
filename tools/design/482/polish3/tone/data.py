"""#482 polish batch 3 (tone review fixes) — measure the before/after numbers the review-fix pictures draw.
Usage: python3 tools/design/482/polish3/tone/data.py BEFORE_PORT AFTER_PORT
BEFORE_PORT serves the build as it came to review (6aa98bd0), AFTER_PORT this tree; both are tools/serve.sh servers.
Writes tone/data/pitch-finetune-level.json (level.js: how loud a voice-like tone, pink noise and white noise come out
at each Fine tune, export path) and tone/data/pitch-finetune-drag.json (clicks.js: how much the live preview crackles
when a slider moves, plus two short waveforms). render.py hands a sheet its file as window.__sheetData482t."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import probe  # noqa: E402

before, after = int(sys.argv[1]), int(sys.argv[2])
out = os.path.join(HERE, 'data')
os.makedirs(out, exist_ok=True)
LEVEL_OPTS = "window.__lvl482 = { sigs: ['voice', 'pink', 'noise'], cents: [-100, -75, -50, -30, -15, -8, -3, -1, 1, 3, 8, 15, 30, 50, 75, 100], semis: [0] };"
jobs = [('pitch-finetune-level', 'level.js', LEVEL_OPTS), ('pitch-finetune-drag', 'clicks.js', '')]
for name, script, pre in jobs:
    js = open(os.path.join(HERE, script)).read()
    data = {'before': probe.run(before, js, pre), 'after': probe.run(after, js, pre)}
    with open(os.path.join(out, name + '.json'), 'w') as f:
        json.dump(data, f)
    print(name, 'written')
