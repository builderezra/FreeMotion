#!/usr/bin/env python3
"""compose-filters-sheet.py <filters.json> <out.jpg> [--recommend id,id,...] [--per-page 3]

Turns render-filters-probe.js's one JSON object into ONE contact sheet for Ezra (the style of the More-panel sheet): each
candidate in its own row — the candidate big, then the photo as shot and the three existing filters it sits nearest to on that
same photo, names under each, and a line of what it is and how far it sits from the rest on #675's measure (re-taken in Chrome).
--recommend puts a "Recommended" badge on the ones named (his rule: "I just want options. Yu can just say recommended next to the
best option").

It also writes <out>-p1.jpg, -p2.jpg … with --per-page rows each (default 3), because a sheet more than ~3x taller than it is
wide does not reach his phone (memory: tall-images-fail-to-phone) — send the pages, keep the long one for a desk.
"""
import base64, io, json, os, sys
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
src, out = args[0], args[1]
rec = set()
per_page = 3
if '--recommend' in args:
    rec = set(x for x in args[args.index('--recommend') + 1].split(',') if x)
if '--per-page' in args:
    per_page = int(args[args.index('--per-page') + 1])

BG, PANEL, INK, DIM, ACC, WARN = (16, 20, 29), (24, 29, 40), (232, 238, 244), (150, 164, 180), (63, 208, 168), (255, 190, 90)


def font(sz, bold=False):
    for p in (['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] if bold else []) + ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        try:
            return ImageFont.truetype(p, sz)
        except Exception:
            pass
    return ImageFont.load_default()


F_T, F_H, F_B, F_S, F_X = font(34, True), font(32, True), font(23), font(20), font(18)
SECTION = {'cinematic': 'Cinematic', 'tuff': 'Tuff', 'retro': 'Retro / Analogue', 'glow': 'Light / Glow', 'stylised': 'Stylised',
           'mono': 'Black / White', 'vivid': 'Punchy'}

d = json.load(open(src, encoding='utf-8'))
rows = d.get('rows') or []
if not rows:
    sys.exit('no rows in ' + src + (' — errors: ' + '; '.join(d.get('errors') or []) if d.get('errors') else ''))
m675 = {r['id']: r for r in (d.get('m675') or [])}


def img(data_url, size):
    raw = base64.b64decode(data_url.split(',', 1)[1])
    return Image.open(io.BytesIO(raw)).convert('RGB').resize((size, size), Image.LANCZOS)


def wrap(g, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if g.textlength(t, font=f) <= width:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


M, BIG, SM, GAP = 40, 480, 228, 12
W = M + BIG + 24 + SM * 2 + GAP + M
TEXT_H = 130
ROW_H = BIG + 34 + TEXT_H
NAME_OF = {r['id']: r['name'] for r in rows}


def draw_row(sheet, g, r, y):
    x = M
    sheet.paste(img(r['cand'], BIG), (x, y))
    if r['id'] in rec:
        g.rounded_rectangle([x - 6, y - 6, x + BIG + 6, y + BIG + 6], radius=16, outline=ACC, width=6)
        g.rounded_rectangle([x + BIG - 200, y + 14, x + BIG - 14, y + 56], radius=14, fill=ACC)
        g.text((x + BIG - 186, y + 22), 'Recommended', font=F_S, fill=(4, 18, 15))
    gx = x + BIG + 24
    tiles = [('As shot', r['photo'])] + [(c['name'], c['img']) for c in r.get('compare', [])[:3]]
    for k, (name, data) in enumerate(tiles):
        tx, ty = gx + (k % 2) * (SM + GAP), y + (k // 2) * (SM + 18 + GAP)
        sheet.paste(img(data, SM), (tx, ty))
        g.rectangle([tx, ty + SM - 26, tx + SM, ty + SM], fill=(0, 0, 0))
        g.text((tx + 6, ty + SM - 24), (name if k == 0 else 'today: ' + name)[:24], font=F_X, fill=INK if k else DIM)
    ty = y + BIG + 16
    g.text((x, ty), r['name'], font=F_H, fill=ACC if r['id'] in rec else INK)
    nx = x + g.textlength(r['name'], font=F_H) + 16
    tag = SECTION.get(r['section'], r['section']) + ('  ·  from the backlog' if r.get('from') == 'B8' else '  ·  new') + \
        (' (was "' + r['was'] + '")' if r.get('was') else '')
    g.text((nx, ty + 9), tag, font=F_S, fill=DIM)
    yy = ty + 44
    for ln in wrap(g, r.get('desc') or '', F_B, W - 2 * M)[:2]:
        g.text((x, yy), ln, font=F_B, fill=INK)
        yy += 30
    m = m675.get(r['id'])
    if m:
        s = 'Nearest look today (#675 measure): %s %.1f  ·  nearest new one: %s %.1f' % (m['near'][0][0], m['near'][0][1], NAME_OF.get(m['peer'][0], m['peer'][0]), m['peer'][1])
        if m.get('mono'):
            s += '  ·  B/W: %.1f from the nearest' % m['mono']['nearest'][1]
        g.text((x, yy + 4), s + ('' if m.get('pass') else '   (!) under 10 — too close'), font=F_X, fill=DIM if m.get('pass') else WARN)


def sheet_for(chunk, title, sub):
    probe = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    tl, sl = wrap(probe, title, F_T, W - 2 * M), wrap(probe, sub, F_S, W - 2 * M)
    top = 30 + len(tl) * 44 + len(sl) * 28 + 40
    H = top + len(chunk) * (ROW_H + 40) + 20
    sheet = Image.new('RGB', (W, H), BG)
    g = ImageDraw.Draw(sheet)
    y = 30
    for ln in tl:
        g.text((M, y), ln, font=F_T, fill=INK); y += 44
    for ln in sl:
        g.text((M, y + 6), ln, font=F_S, fill=DIM); y += 28
    y = top
    for r in chunk:
        g.rounded_rectangle([M - 16, y - 16, W - M + 16, y + ROW_H + 8], radius=18, fill=PANEL)
        draw_row(sheet, g, r, y)
        y += ROW_H + 40
    return sheet


n = len(rows)
title = 'New filter looks — pick eight of these %d' % n
sub = 'Each one big on a photo of yours; beside it the photo as shot and the three filters you already have that it is closest to.'
full = sheet_for(rows, title, sub)
full.save(out, quality=86)
print(out, full.size)
base, ext = os.path.splitext(out)
for p in range(0, n, per_page):
    chunk = rows[p:p + per_page]
    pg = sheet_for(chunk, title + '  (%d/%d)' % (p // per_page + 1, (n + per_page - 1) // per_page), sub)
    path = '%s-p%d%s' % (base, p // per_page + 1, ext or '.jpg')
    pg.save(path, quality=86)
    print(path, pg.size)
