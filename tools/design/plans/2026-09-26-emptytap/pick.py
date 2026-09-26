"""pick.py PREFIX N -> prints the first frame file for each stamp 0..N-1"""
import sys, glob, re
from PIL import Image
pre, N = sys.argv[1], int(sys.argv[2])
files = sorted(glob.glob(pre + '-*.png'), key=lambda f: int(re.search(r'-(\d+)\.png$', f).group(1)))
got = {}
for f in files:
    r, g, b = Image.open(f).convert('RGB').getpixel((8, 8))
    if b < 200: continue
    k = round((r - 20) / 30)
    if 0 <= k < N and k not in got: got[k] = f
print(' '.join(got.get(k, 'MISSING') for k in range(N)))
