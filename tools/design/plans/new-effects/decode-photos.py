#!/usr/bin/env python3
"""decode-photos.py <out_dir> [size] — the fx-art photographs as raw RGBA, for measure-filters-node.js (node cannot decode a JPEG).

Each photo is centre-cropped square (they are 320x320 already) and resized to <size> (default 200) with LANCZOS, then written as
<out_dir>/<key>.rgba (size*size*4 bytes, row-major, alpha 255). Run inside WSL (PIL is there):
    python3 tools/design/plans/new-effects/decode-photos.py /tmp/fm-photos 200
"""
import os, sys
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
art = os.path.normpath(os.path.join(here, '..', '..', '..', '..', 'fx-art'))
out = sys.argv[1]
size = int(sys.argv[2]) if len(sys.argv) > 2 else 200
os.makedirs(out, exist_ok=True)
n = 0
for f in sorted(os.listdir(art)):
    if not f.endswith('.jpg'):
        continue
    im = Image.open(os.path.join(art, f)).convert('RGBA')
    s = min(im.size)
    x0, y0 = (im.width - s) // 2, (im.height - s) // 2
    im = im.crop((x0, y0, x0 + s, y0 + s)).resize((size, size), Image.LANCZOS)
    with open(os.path.join(out, f[:-4] + '.rgba'), 'wb') as fh:
        fh.write(im.tobytes())
    n += 1
print('decoded', n, 'photos at', size, 'px into', out)
