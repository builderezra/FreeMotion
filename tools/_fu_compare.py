#!/usr/bin/env python3
"""Compare two runs of tests/full-unchanged.html — HEAD's and the tree's (queue 980; DESIGN.md §0.4.5).

Called by tools/full-unchanged.sh, which owns the two numbers and the one mask list this reads from the environment:
    FU_INVISIBLE   the document keys allowed to differ (one per line: "<path>  <its DESIGN §0.4.3 row>")
    FU_TOL_PX      a picture may differ in at most this many pixels …
    FU_CHAN        … where a pixel counts as different when any channel moved by more than this

    python3 tools/_fu_compare.py REF_DIR CAND_DIR [--widths 380,1280] [--groups FU1,FU2] [--max 12] [--json OUT]

Each DIR holds rec-<W>.json (the probe's dump) and shots-<W>/*.png. Exit 0: identical (pictures within the tolerance);
1: differences, the first ones printed BY NAME; 3: the instrument is broken (the probe could not drive REF, or a record is
missing) — never PASS on a run that did not measure, because a step that fails the same way on both sides compares equal.

Nothing here decides what Full is: it only says where two records disagree. Ids were canonicalised by the probe.
"""
import argparse, difflib, json, os, sys

FIELDS = ['path', 'x', 'y', 'w', 'h', 'text', 'aria-label', 'title', 'display', 'visibility', 'opacity', 'color',
          'background-color', 'font-size', 'transform']


def envint(k, d=0):
    try:
        return int(os.environ.get(k, d))
    except (TypeError, ValueError):
        return d


def invisible_list():
    out = []
    for line in os.environ.get('FU_INVISIBLE', '').splitlines():
        line = line.split('#', 1)[0].strip()
        if not line:
            continue
        out.append(line.split()[0])
    return out


# ─── the mask: FU_INVISIBLE and nothing else (DESIGN §21 F9) ────────────────────────────────────────────────────────────
def mask_layer(layer, keys):
    if not isinstance(layer, dict):
        return
    for k in keys:
        parts = k.split('.')
        if parts[0] != 'layer':
            continue
        rest = parts[1:]
        node = layer
        for p in rest[:-1]:
            node = node.get(p) if isinstance(node, dict) else None
        if isinstance(node, dict) and rest and rest[-1] in node:
            del node[rest[-1]]
        # an object emptied by the mask (sm after sm.twin) is gone too — HEAD never had it
        if len(rest) > 1:
            parent = layer
            for p in rest[:-2]:
                parent = parent.get(p) if isinstance(parent, dict) else None
            if isinstance(parent, dict) and isinstance(parent.get(rest[-2]), dict) and not parent[rest[-2]]:
                del parent[rest[-2]]


def mask_ops(ops, keys):
    """FU4's wire: an `li` carries a whole layer; an `s` op addresses ['L', id, …path]. Masked by FU_INVISIBLE only."""
    lk = [k.split('.')[1:] for k in keys if k.startswith('layer.')]
    out = []
    for op in ops or []:
        if not isinstance(op, dict):
            out.append(op)
            continue
        if op.get('o') == 'li' and isinstance(op.get('v'), dict):
            mask_layer(op['v'], keys)
        p = op.get('p')
        if isinstance(p, list) and len(p) >= 3 and p[0] == 'L':
            rest = [str(x) for x in p[2:]]
            if any(rest[:len(k)] == k for k in lk):
                continue                                  # the op writes ONLY an invisible key: not part of what Full does
            for k in lk:
                # an op that writes a PARENT of an invisible key (the whole `sm` object) keeps its op, minus that key
                if len(k) > len(rest) and k[:len(rest)] == rest and isinstance(op.get('v'), dict):
                    node = op['v']
                    for q in k[len(rest):-1]:
                        node = node.get(q) if isinstance(node, dict) else None
                    if isinstance(node, dict):
                        node.pop(k[-1], None)
        out.append(op)
    return out


def apply_mask(rec, keys):
    def walk(v):
        if isinstance(v, dict):
            for k, x in list(v.items()):
                if k == 'layers' and isinstance(x, list):
                    for L in x:
                        mask_layer(L, keys)
                if k == 'ops' and isinstance(x, list):
                    v[k] = mask_ops(x, keys)
                walk(v[k])
        elif isinstance(v, list):
            for x in v:
                walk(x)
    walk(rec)
    meta = rec.get('fu5meta')
    if isinstance(meta, dict):
        for k in keys:
            if k.startswith('meta.'):
                meta.pop(k[5:], None)
    # a sanitised layer list is a bare list, not under 'layers'
    for r in rec.get('fu5') or []:
        if isinstance(r.get('sanitised'), list):
            for L in r['sanitised']:
                mask_layer(L, keys)
    return rec


# ─── record comparison ─────────────────────────────────────────────────────────────────────────────────────────────────
def short(v, n=90):
    s = json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v
    return s if len(s) <= n else s[:n] + '…'


def json_diff(a, b, where, out, limit):
    if len(out) >= limit:
        return
    if type(a) != type(b):
        out.append('%s: %s → %s' % (where, short(a), short(b)))
        return
    if isinstance(a, dict):
        for k in list(a.keys()) + [k for k in b.keys() if k not in a]:
            if k not in b:
                out.append('%s.%s: removed (was %s)' % (where, k, short(a[k])))
            elif k not in a:
                out.append('%s.%s: added (%s)' % (where, k, short(b[k])))
            else:
                json_diff(a[k], b[k], '%s.%s' % (where, k), out, limit)
            if len(out) >= limit:
                return
    elif isinstance(a, list):
        if len(a) != len(b):
            out.append('%s: %d items → %d' % (where, len(a), len(b)))
        for i in range(min(len(a), len(b))):
            json_diff(a[i], b[i], '%s[%d]' % (where, i), out, limit)
            if len(out) >= limit:
                return
    elif a != b:
        out.append('%s: %s → %s' % (where, short(a), short(b)))


def layout_diff(a, b, where, out, limit):
    pa = [e[0] for e in a]
    pb = [e[0] for e in b]
    sm = difflib.SequenceMatcher(None, pa, pb, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for i, j in zip(range(i1, i2), range(j1, j2)):
                ea, eb = a[i], b[j]
                if ea != eb:
                    ch = ['%s %s → %s' % (FIELDS[k] if k < len(FIELDS) else k, short(ea[k], 40), short(eb[k], 40))
                          for k in range(1, max(len(ea), len(eb))) if (ea[k] if k < len(ea) else None) != (eb[k] if k < len(eb) else None)]
                    out.append('%s: %s — %s' % (where, ea[0], '; '.join(ch)))
                    if len(out) >= limit:
                        return
        else:
            for i in range(i1, i2):
                out.append('%s: %s — GONE (was %s,%s %sx%s %s)' % (where, a[i][0], a[i][1], a[i][2], a[i][3], a[i][4], short(a[i][5], 30)))
                if len(out) >= limit:
                    return
            for j in range(j1, j2):
                out.append('%s: %s — NEW (%s,%s %sx%s %s)' % (where, b[j][0], b[j][1], b[j][2], b[j][3], b[j][4], short(b[j][5], 30)))
                if len(out) >= limit:
                    return


# ─── ONE REGION OF EVERY PICTURE IS NOT COMPARED BY PIXELS: THE PREVIEW CANVAS ITSELF ────────────────────────────────────
# Measured 1 Oct (HEAD against itself, three pairs): the preview's backing store and the image caches it draws from are
# ADAPTIVE BY DESIGN — js/app.js learns a quality tier from how fast this machine renders and sheds pixels while things
# move (FM._perfState) — so the same build drew fu1-one-selected's preview at a different resampling in one run of three
# (7125 px, every shape's edge, nothing else). That is the machine's speed, not Full. What the preview DRAWS is compared
# exactly elsewhere, through the compositor itself: FU2's three frame hashes after every edit, FU4's, and the export's
# frames every quarter second. The canvas's BOX stays in the layout record (exact), so a moved or resized preview is still
# red. Nothing else is excluded: every other pixel of every screen is compared.
PNG_UNSTABLE = ['canvas#preview']


def unstable_boxes(layout):
    out = []
    for e in layout or []:
        last = str(e[0]).split('>')[-1]
        if any(last == u or last.startswith(u + '.') for u in PNG_UNSTABLE):
            out.append((e[1], e[2], e[3], e[4]))
    return out


def png_changed(pa, pb, chan, boxes=()):
    """Pixels where any channel moved by more than `chan`, and their bounding box (outside `boxes`)."""
    import numpy as np
    from PIL import Image
    A = np.asarray(Image.open(pa).convert('RGBA'), dtype=np.int16)
    B = np.asarray(Image.open(pb).convert('RGBA'), dtype=np.int16)
    if A.shape != B.shape:
        return 10 ** 9, None
    m = (np.abs(A - B).max(axis=2) > chan)
    for (x, y, w, h) in boxes:
        x0, y0 = max(0, int(x)), max(0, int(y))
        x1, y1 = int(x + w + 0.999), int(y + h + 0.999)
        m[y0:y1, x0:x1] = False
    n = int(m.sum())
    if not n:
        return 0, None
    ys, xs = np.nonzero(m)
    return n, (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))


def png_selftest(tol, chan):
    """THE PICTURE METRIC MUST SEE THE SMALLEST REAL CHANGE (DESIGN §0.4.5: "a 1 px move of a 1 px line"). A 1 px line,
    16 px long, moved by one pixel, must count as more than the tolerance — or every picture comparison below is blind.
    Positive control too: the same picture twice counts zero."""
    import numpy as np
    from PIL import Image
    import tempfile
    d = tempfile.mkdtemp(prefix='fu-png-')
    a = np.zeros((40, 40, 4), np.uint8); a[..., 3] = 255
    b = a.copy()
    a[10:26, 12] = (200, 200, 200, 255)
    b[10:26, 13] = (200, 200, 200, 255)
    pa, pb = os.path.join(d, 'a.png'), os.path.join(d, 'b.png')
    Image.fromarray(a).save(pa); Image.fromarray(b).save(pb)
    moved, _ = png_changed(pa, pb, chan)
    same, _ = png_changed(pa, pa, chan)
    return moved, same


def load(d, w):
    p = os.path.join(d, 'rec-%s.json' % w)
    if not os.path.exists(p):
        return None
    try:
        return json.load(open(p, encoding='utf-8'))
    except Exception as e:
        return {'errors': ['the record %s could not be read: %s' % (p, e)]}


def instrument_errors(rec, w, groups):
    """Where the probe could not drive REF. Any of these means the run measured nothing there."""
    out = []
    if rec is None:
        return ['%s: no record at all' % w]
    if rec.get('timedOut'):
        return ['%s: the probe ran out of time (last step: %s)' % (w, (rec.get('partial') or {}).get('step'))]
    for e in rec.get('errors') or []:
        out.append('%s: %s' % (w, e))
    if rec.get('step') != 'done':
        out.append('%s: the probe stopped at "%s"' % (w, rec.get('step')))
    if 'FU1' in groups:
        if not rec.get('screens'):
            out.append('%s FU1: no screens recorded' % w)
        for k, v in (rec.get('screens') or {}).items():
            if v.get('err'):
                out.append('%s FU1 %s: %s' % (w, k, v['err']))
    for g, key in (('FU2', 'fu2'), ('FU3', 'fu3'), ('FU5', 'fu5')):
        if g in groups:
            if not rec.get(key):
                out.append('%s %s: nothing recorded' % (w, g))
            for r in rec.get(key) or []:
                if r.get('err'):
                    out.append('%s %s "%s": %s' % (w, g, r.get('name'), r['err']))
    if 'FU4' in groups:
        f4 = rec.get('fu4') or {}
        if not f4.get('steps'):
            out.append('%s FU4: nothing recorded%s' % (w, (' — ' + f4['err']) if f4.get('err') else ''))
        if f4.get('err'):
            out.append('%s FU4: %s' % (w, f4['err']))
        for r in f4.get('steps') or []:
            if r.get('err'):
                out.append('%s FU4 "%s": %s' % (w, r.get('name'), r['err']))
    if 'FU6' in groups:
        f6 = rec.get('fu6') or {}
        if len([k for k in f6 if k != 'function']) < 14:
            out.append('%s FU6: only %d sizes recorded' % (w, len([k for k in f6 if k != 'function'])))
        for k, v in f6.items():
            if v.get('err'):
                out.append('%s FU6 %s: %s' % (w, k, v['err']))
    return out


def compare(ref_dir, cand_dir, widths, groups, limit, per_step=6):
    keys = invisible_list()
    tol = envint('FU_TOL_PX')
    chan = envint('FU_CHAN')
    diffs, broken, pictures = [], [], []
    for w in widths:
        A, B = load(ref_dir, w), load(cand_dir, w)
        broken += instrument_errors(A, w, groups)
        if B is None:
            broken.append('%s: the tree produced no record' % w)
            continue
        if A is None:
            continue
        A, B = apply_mask(A, keys), apply_mask(B, keys)
        out = []
        if A.get('palette') != B.get('palette'):
            out.append('%s the clip-colour palette (js/scene.js CLIP_COLORS): %s → %s' % (w, short(A.get('palette')), short(B.get('palette'))))
        if B.get('step') != 'done':
            out.append('%s: the probe stopped on the tree at "%s" (%s)' % (w, B.get('step'), '; '.join((B.get('errors') or [])[:2])))
        if 'FU1' in groups:
            for name, sa in (A.get('screens') or {}).items():
                sb = (B.get('screens') or {}).get(name)
                if sb is None:
                    out.append('%s %s: screen missing on the tree' % (w, name))
                    continue
                if sb.get('err') and not sa.get('err'):
                    out.append('%s %s: the tree could not reach this screen: %s' % (w, name, sb['err']))
                    continue
                layout_diff(sa.get('layout') or [], sb.get('layout') or [], '%s %s' % (w, name), out, limit)
                if sa.get('focus') != sb.get('focus'):
                    out.append('%s %s: focus %s → %s' % (w, name, sa.get('focus'), sb.get('focus')))
        if 'FU2' in groups:
            sa, sb = A.get('fu2') or [], B.get('fu2') or []
            for i, ra in enumerate(sa):
                rb = sb[i] if i < len(sb) else None
                if rb is None:
                    out.append('%s FU2 "%s": missing on the tree' % (w, ra['name']))
                    break
                local = []
                if rb.get('err') != ra.get('err'):
                    local.append('error %s → %s' % (short(ra.get('err')), short(rb.get('err'))))
                json_diff(ra.get('state'), rb.get('state'), 'state', local, per_step)
                for x in local:
                    out.append('%s FU2 "%s": %s' % (w, ra['name'], x))
                if len(out) >= limit:
                    break
        if 'FU3' in groups:
            for i, ra in enumerate(A.get('fu3') or []):
                rb = (B.get('fu3') or [None] * (i + 1))[i] if i < len(B.get('fu3') or []) else None
                if rb is None:
                    out.append('%s FU3 "%s": missing on the tree' % (w, ra['name']))
                    break
                local = []
                json_diff(ra, rb, 'key', local, 4)
                for x in local:
                    out.append('%s FU3 "%s": %s' % (w, ra['name'], x))
                if len(out) >= limit:
                    break
        if 'FU4' in groups:
            local = []
            json_diff(A.get('fu4'), B.get('fu4'), 'FU4', local, limit)
            out += ['%s %s' % (w, x) for x in local]
        if 'FU5' in groups:
            local = []
            json_diff(A.get('fu5'), B.get('fu5'), 'FU5', local, limit)
            json_diff(A.get('fu5meta'), B.get('fu5meta'), 'FU5 meta', local, limit)
            out += ['%s %s' % (w, x) for x in local]
        if 'FU6' in groups:
            f6a, f6b = A.get('fu6') or {}, B.get('fu6') or {}
            if any(((v.get('canvas') or {}).get('hasEditor') or (v.get('friends') or {}).get('hasEditor')) for v in f6b.values() if isinstance(v, dict)):
                # COG-DESIGN §6.4's measured price applies only once the Editor block exists. Until step 1.3 builds the check
                # that holds the price to those numbers ±1 px, a tree WITH the block cannot PASS — it must not skip FU6.
                out.append('%s FU6: the tree has #cv-editor, and the price check (COG-DESIGN §6.4 ±1 px at 380×800 Friends, '
                           '380×667, 375×553, 320×568) is not built yet — step 1.3 must build it in tools/_fu_compare.py' % w)
            for size, va in f6a.items():
                vb = f6b.get(size) or {}
                if va.get('noCog') != vb.get('noCog'):
                    out.append('%s FU6 %s: where the cog is: %s → %s' % (w, size, short(va.get('noCog')), short(vb.get('noCog'))))
                for part in ('canvas', 'friends', 'reopened'):
                    if part in va or part in vb:
                        pa_, pb_ = va.get(part) or {}, vb.get(part) or {}
                        layout_diff(pa_.get('layout') or [], pb_.get('layout') or [], '%s FU6 %s %s' % (w, size, part), out, limit)
                        for k in ('cls', 'focus', 'exp'):
                            if pa_.get(k) != pb_.get(k):
                                out.append('%s FU6 %s %s: %s %s → %s' % (w, size, part, k, short(pa_.get(k)), short(pb_.get(k))))
                if size == 'function':
                    local = []
                    json_diff(va, vb, 'FU6 function', local, limit)
                    out += ['%s %s' % (w, x) for x in local]
        if 'FU7' in groups:
            f7 = B.get('fu7') or {}
            if f7.get('hasSwitch') and not f7.get('wired'):
                out.append('%s FU7: the tree has a switch (FM.editor or #cv-editor) and the round trip through the cog is not '
                           'wired in tests/full-unchanged.html yet — step 1.3 must wire it; FU7 cannot be skipped' % w)
            elif json.dumps(A.get('fu7'), sort_keys=True) != json.dumps(B.get('fu7'), sort_keys=True) and not f7.get('hasSwitch'):
                out.append('%s FU7: %s → %s' % (w, short(A.get('fu7')), short(B.get('fu7'))))
        # pictures
        if 'FU1' in groups:
            da, db = os.path.join(ref_dir, 'shots-%s' % w), os.path.join(cand_dir, 'shots-%s' % w)
            for name in sorted(os.listdir(da)) if os.path.isdir(da) else []:
                if not name.endswith('.png'):
                    continue
                pb = os.path.join(db, name)
                if not os.path.exists(pb):
                    out.append('%s picture %s: missing on the tree' % (w, name))
                    continue
                scr = name[:-4]
                boxes = unstable_boxes(((A.get('screens') or {}).get(scr) or {}).get('layout')) + \
                    unstable_boxes(((B.get('screens') or {}).get(scr) or {}).get('layout'))
                n, box = png_changed(os.path.join(da, name), pb, chan, boxes)
                pictures.append((w, name, n))
                if n > tol:
                    out.append('%s picture %s: %d px differ (tolerance %d), within %s' % (w, name, n, tol, box))
        diffs += out
    return diffs, broken, pictures


#  ═══ THE SELF-TEST'S THREE PLANTS (DESIGN §0.4.5 "The gate, structurally") ═══════════════════════════════════════════
# Changes Full must never get. Each is planted in a COPY of the tree, measured, and must turn the comparison red FOR ITS
# OWN REASON — a red that names something else (a jitter, a crash) is not a catch, it is luck.
PLANTS = {
    'margin': ('styles.css', None, '\n/* full-unchanged self-test plant: never shipped */\n#transport { margin-top: 1px !important; }\n'),
    'toast': ('js/app.js', 'Park the playhead inside the clip to split it', 'Park the playhead within the clip to split it'),
    'floor': ('js/app.js', 'if (t <= layer.start + 0.02 || t >= end - 0.02) {', 'if (t <= layer.start + 0.1 || t >= end - 0.1) {'),
}
# What each must be caught BY: (widths, groups, a substring every catching line carries, a second one it must also carry)
SIGNATURES = {
    'margin': (['380', '1280'], ['FU1'], '#transport', ''),
    'toast': (['380'], ['FU2'], 'split at a clip’s very edge', 'toasts'),
    'floor': (['380'], ['FU2'], 'split Clip C 0.05 s from its start', ''),
}


def plant(kind, d):
    f, old, new = PLANTS[kind]
    p = os.path.join(d, f)
    src = open(p, encoding='utf-8').read()
    if old is None:
        out = src + new
    else:
        n = src.count(old)
        if n != 1:
            print('❌ the %s plant\'s anchor appears %d times in %s (want exactly 1): %r — update PLANTS in tools/_fu_compare.py' % (kind, n, f, old))
            return 2
        out = src.replace(old, new, 1)
    if out == src:
        print('❌ the %s plant changed nothing' % kind)
        return 2
    open(p, 'w', encoding='utf-8').write(out)
    return 0


def judge(work):
    ok = True
    for kind, (widths, groups, sig, sig2) in SIGNATURES.items():
        diffs, broken, _ = compare(os.path.join(work, 'head'), os.path.join(work, kind), widths, groups, 2000, per_step=200)
        if broken:
            print('   ❌ %s: the reference could not be measured — %s' % (kind, broken[0]))
            ok = False
            continue
        for w in widths:
            hits = [x for x in diffs if x.startswith(w + ' ') and sig in x and sig2 in x]
            if hits:
                print('   ✅ %s plant caught at %s: %s' % (kind, w, hits[0][:220]))
            elif diffs:
                print('   ❌ %s plant turned it red at %s, but NOT for the planted reason — first: %s' % (kind, w, diffs[0][:220]))
                ok = False
            else:
                print('   ❌ %s plant was NOT caught at %s: the comparison saw no difference at all' % (kind, w))
                ok = False
    return 0 if ok else 1


def measure(head, head2, margin):
    """The two numbers tools/full-unchanged.sh carries: how much HEAD differs from ITSELF (the jitter), and how much the
    smallest real change moves a picture (the #transport 1 px margin). Swept over the per-channel threshold."""
    names = []
    for w in ('380', '1280'):
        da = os.path.join(head, 'shots-%s' % w)
        names += [(w, n) for n in sorted(os.listdir(da)) if n.endswith('.png')] if os.path.isdir(da) else []
    # the records first: two runs of the same build must be IDENTICAL, or the exact comparison measures the machine
    os.environ['FU_TOL_PX'] = str(10 ** 9)
    os.environ['FU_CHAN'] = '0'
    diffs, broken, _ = compare(head, head2, ['380', '1280'], ['FU1'], 40)
    print('records, HEAD against itself: %s' % ('identical' if not diffs and not broken else '%d differences' % len(diffs)))
    for x in (broken + diffs)[:12]:
        print('   · ' + x)
    mdiffs, _, _ = compare(head, margin, ['380', '1280'], ['FU1'], 400)
    moved = set((x.split(' ')[0], x.split(' ')[1].rstrip(':')) for x in mdiffs if '#transport' in x)
    print('the margin plant moved #transport in %d screen(s)' % len(moved))
    recs = {}
    for d in (head, head2, margin):
        for w in ('380', '1280'):
            recs[(d, w)] = load(d, w) or {}

    def boxes(da, db, w, n):
        scr = n[:-4]
        return unstable_boxes(((recs[(da, w)].get('screens') or {}).get(scr) or {}).get('layout')) + \
            unstable_boxes(((recs[(db, w)].get('screens') or {}).get(scr) or {}).get('layout'))

    def changed(da, db, w, n, chan):
        return png_changed(os.path.join(da, 'shots-%s' % w, n), os.path.join(db, 'shots-%s' % w, n), chan, boxes(da, db, w, n))
    print('\nchan  jitter(max px, HEAD vs HEAD)   smallest real (min px > 0 over screens the margin moved)')
    for chan in (0, 1, 2, 4, 8, 16, 24, 32, 64):
        jit = max([changed(head, head2, w, n, chan)[0] for (w, n) in names] or [0])
        real = [changed(head, margin, w, n, chan)[0] for (w, n) in names
                if (w, n[:-4]) in moved and os.path.exists(os.path.join(margin, 'shots-%s' % w, n))]
        # the smallest VISIBLE change: a screen where Home covers #transport moves its box and not one pixel
        real_v = sorted(r for r in real if r > 0)
        print('%4d  %10d                       %10s   (all: %s)' % (chan, jit, real_v[0] if real_v else 0, real_v[:12]))
    line_moved, _ = png_selftest(0, 0)
    print('\na 1 px line, 16 px long, moved 1 px: %d px at chan 0' % line_moved)
    for (w, n) in names:
        c = changed(head, head2, w, n, 0)
        if c[0]:
            print('   jitter at chan 0: %s %s %d px in %s' % (w, n, c[0], c[1]))
    for (w, n) in names:
        if (w, n[:-4]) in moved:
            c = changed(head, margin, w, n, 24)
            print('   margin at chan 24: %s %s %d px in %s' % (w, n, c[0], c[1]))
    return 0


def main():
    if len(sys.argv) > 1 and sys.argv[1] in ('plant', 'judge', 'measure'):
        cmd = sys.argv[1]
        if cmd == 'plant':
            return plant(sys.argv[2], sys.argv[3])
        if cmd == 'judge':
            return judge(sys.argv[2])
        return measure(sys.argv[2], sys.argv[3], sys.argv[4])
    ap = argparse.ArgumentParser()
    ap.add_argument('ref')
    ap.add_argument('cand')
    ap.add_argument('--widths', default='380,1280')
    ap.add_argument('--groups', default='FU1,FU2,FU3,FU4,FU5,FU6,FU7')
    ap.add_argument('--max', type=int, default=12)
    ap.add_argument('--json', default=None)
    ap.add_argument('--png-selftest', action='store_true')
    a = ap.parse_args()
    tol, chan = envint('FU_TOL_PX'), envint('FU_CHAN')
    moved, same = png_selftest(tol, chan)
    if a.png_selftest:
        print('png self-test: a 1 px line moved 1 px = %d px changed; the same picture = %d; tolerance %d' % (moved, same, tol))
    if not (moved > tol and same == 0):
        print('❌ THE PICTURE COMPARISON IS BLIND: a 1 px line moved by 1 px counts %d px, the tolerance is %d (and the same '
              'picture counts %d). Lower FU_TOL_PX or FU_CHAN in tools/full-unchanged.sh.' % (moved, tol, same))
        return 3
    diffs, broken, pictures = compare(a.ref, a.cand, a.widths.split(','), a.groups.split(','), a.max * 50)
    if a.json:
        json.dump({'diffs': diffs, 'broken': broken, 'pictures': pictures}, open(a.json, 'w'), indent=1, ensure_ascii=False)
    if broken:
        print('❌ THE INSTRUMENT IS BROKEN — the probe could not drive the reference here, so a match would prove nothing:')
        for b in broken[:a.max]:
            print('   · ' + b)
        return 3
    if diffs:
        print('❌ DIFFERENT FROM HEAD — %d difference(s); the first:' % len(diffs))
        for d in diffs[:a.max]:
            print('   · ' + d)
        return 1
    worst = max([p[2] for p in pictures] or [0])
    print('✅ same as HEAD (%d pictures compared, the most-changed differs in %d px; tolerance %d)' % (len(pictures), worst, tol))
    return 0


if __name__ == '__main__':
    sys.exit(main())
