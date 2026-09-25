#!/usr/bin/env python3
"""Split a tall options sheet into phone-sized pages that reach Ezra's phone.

WHY (25 Sep, #927/#929): a design sheet rendered at phone width is one very tall image — 1170x22005 — and the file
card that sends pictures to his phone refused all three ("server returned 400"), so they showed only on the Mac, where
he is not. Pages of about 2.6x the width, cut at the quietest row near each break so a line of text is never sliced,
at 780 px wide, arrive fine.

    python3 tools/phonepages.py sheet.jpg [more.jpg …] --out /some/dir      # → /some/dir/<name>-01.jpg, -02.jpg, …
"""
import argparse, os, sys
from PIL import Image


def split(path, out, width=780, ratio=2.6):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    step = int(W * ratio)
    name = os.path.splitext(os.path.basename(path))[0]
    pages, y, n = [], 0, 0
    while y < H:
        y2 = min(H, y + step)
        if y2 < H:                       # the quietest row in the last 200 px before the break
            best, bestv = y2, float('inf')
            for yy in range(max(y + step - 200, y + 1), y2):
                row = im.crop((0, yy, W, yy + 1)).convert('L').getdata()
                v = sum(abs(row[i] - row[i - 1]) for i in range(1, len(row), 3))
                if v < bestv:
                    bestv, best = v, yy
            y2 = best
        piece = im.crop((0, y, W, y2))
        if piece.height > 40:            # a sliver of empty margin at the end is not a page
            n += 1
            piece = piece.resize((width, int(piece.height * width / W)))
            p = os.path.join(out, '%s-%02d.jpg' % (name, n))
            piece.save(p, quality=78)
            pages.append(p)
        y = y2
    return pages


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('sheets', nargs='+')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    for s in a.sheets:
        for p in split(s, a.out):
            print(p)
