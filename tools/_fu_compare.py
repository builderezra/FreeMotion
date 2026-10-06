#!/usr/bin/env python3
"""Compare two runs of tests/full-unchanged.html — HEAD's and the tree's (queue 980; DESIGN.md §0.4.5).

Called by tools/full-unchanged.sh, which owns the measured numbers and the one mask list this reads from the environment:
    FU_INVISIBLE        the keys allowed to differ (one per line: "<path>  <its DESIGN §0.4.3 / §0.4.4 row>")
    FU_TOL_PX, FU_CHAN  a picture may differ in at most FU_TOL_PX pixels where a channel moved by more than FU_CHAN …
    FU_FAINT_TOL_PX, FU_FAINT_CHAN   … and in at most FU_FAINT_TOL_PX where one moved by more than FU_FAINT_CHAN (a faint
                                     recolour over a large area: a panel's border a few levels lighter)
    FU_GRID_TOL         a decoded export frame's 12x12 colour grid may move by at most this many levels per cell
    FU_AUDIO_TOL        the exported file's decoded sound: a 0.1 s window's RMS or peak (in 1/1000) may move by at most this
    FU_BYTES_PCT        the exported file's sound track may differ in size by at most this many percent

    python3 tools/_fu_compare.py REF_DIR CAND_DIR [--widths 380,1280] [--groups FU1,FU2] [--runs '380=FU1,FU2 1280=FU1'] [--max 12] [--json OUT]

A RUN is named by its label (tools/full-unchanged.sh FU_RUNS: '380', '1280', '440x956', 'env-380' …): each DIR holds
rec-<label>.json(.gz) and shots-<label>/*.png, and every difference line starts with its label. --runs gives each label its
own groups (the extra screens and environments measure a prefix of the probe's order, not all of it).
    python3 tools/_fu_compare.py plant NAME DIR      # plant one change from tools/full-unchanged-plants.json into DIR
    python3 tools/_fu_compare.py judge WORK          # did every plant turn it red for its own reason?
    python3 tools/_fu_compare.py measure HEAD HEAD2 MARGIN   # the numbers full-unchanged.sh carries
    python3 tools/_fu_compare.py plants              # list the plants (name, groups, widths) for the shell

Each DIR holds rec-<label>.json (the probe's dump) and shots-<label>/*.png. Exit 0: identical (pictures within the tolerance);
1: differences, the first ones printed BY NAME; 3: the instrument is broken (the probe could not drive REF, a record is
missing, or a step FELL BACK from Full's own control to the function underneath) — never PASS on a run that did not
measure what it says, because a step that fails the same way on both sides compares equal.

Nothing here decides what Full is: it only says where two records disagree. Ids were canonicalised by the probe.
"""
import argparse, difflib, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PLANTS_FILE = os.path.join(ROOT, 'tools', 'full-unchanged-plants.json')

# The probe writes its own column names into every record (DUMP.fields); this is v1's list, for an old record only.
FIELDS_V1 = ['path', 'x', 'y', 'w', 'h', 'text', 'aria-label', 'title', 'display', 'visibility', 'opacity', 'color',
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


# ─── the mask: FU_INVISIBLE and nothing else (DESIGN §21 F9), and only where DESIGN puts it ─────────────────────────────
# WHERE (review of v1): the LAYER keys mask the documents Full's edits produce — FU2's, FU3's, FU4's wire and its guest's
# document, and FU6's Canvas Apply / Cancel (all four start from the FU fixture, which each side's own app built, so a
# Simple release's add-time `srcW` is in them). NOT FU5: FU5 is I1's byte-for-byte guard of the sanitiser, and v1 masking
# it let a planted sanitiser that writes `pick` into every layer pass. FU5 masks N1's two `meta.` names and nothing else
# (its one self-built input, the FU fixture, is stripped of these keys on the way IN by the probe instead).
# `presence.` and `manifest.` keys mask FU4's presence frames and media manifest only (DESIGN I7).
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


def mask_docs(v, keys):
    """Every `layers` list and every `ops` list under v (a document, a step record, a wire message)."""
    if isinstance(v, dict):
        for k, x in list(v.items()):
            if k == 'layers' and isinstance(x, list):
                for L in x:
                    mask_layer(L, keys)
            if k == 'ops' and isinstance(x, list):
                v[k] = mask_ops(x, keys)
            mask_docs(v[k], keys)
    elif isinstance(v, list):
        for x in v:
            mask_docs(x, keys)


def drop_keys(v, names):
    if isinstance(v, dict):
        for n in names:
            v.pop(n, None)
        for x in v.values():
            drop_keys(x, names)
    elif isinstance(v, list):
        for x in v:
            drop_keys(x, names)


def apply_mask(rec, keys):
    lk = [k for k in keys if k.startswith('layer.')]
    for e in rec.get('fu2') or []:
        mask_docs(e.get('state'), lk)
    for e in rec.get('fu3') or []:
        mask_docs(e.get('state'), lk)
    f4 = rec.get('fu4')
    if isinstance(f4, dict):
        mask_docs(f4.get('guestDoc'), lk)
        pres = [k.split('.', 1)[1] for k in keys if k.startswith('presence.')]
        man = [k.split('.', 1)[1] for k in keys if k.startswith('manifest.')]
        for s in f4.get('steps') or []:
            for m in s.get('wire') or []:
                if not isinstance(m, dict):
                    continue
                mask_docs(m.get('msg'), lk)
                t = str(m.get('t') or '')
                if m.get('ch') == 'pres' or t in ('pr', 'PR'):
                    drop_keys(m.get('msg'), pres)
                if t == 'mf':
                    drop_keys(m.get('msg'), man)
    fn = (rec.get('fu6') or {}).get('function')
    if isinstance(fn, dict):
        mask_docs(fn, lk)
    meta = rec.get('fu5meta')
    if isinstance(meta, dict):
        for k in keys:
            if k.startswith('meta.'):
                meta.pop(k[5:], None)
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


def layout_diff(a, b, where, out, limit, fields=None):
    fields = fields or FIELDS_V1
    if not isinstance(a, list) or not isinstance(b, list):
        if a != b:
            out.append('%s: %s → %s' % (where, short(a, 60), short(b, 60)))
        return
    pa = [e[0] for e in a]
    pb = [e[0] for e in b]
    sm = difflib.SequenceMatcher(None, pa, pb, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for i, j in zip(range(i1, i2), range(j1, j2)):
                ea, eb = a[i], b[j]
                if ea != eb:
                    ch = ['%s %s → %s' % (fields[k] if k < len(fields) else k, short(ea[k] if k < len(ea) else None, 40), short(eb[k] if k < len(eb) else None, 40))
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


def grid_diff(a, b, where, out, tol):
    """The decoded export frames: exact for the header (size, length), within `tol` levels per cell for the pictures."""
    if not isinstance(a, list) or not isinstance(b, list) or len(a) != len(b) or not a:
        if a != b:
            out.append('%s: %s → %s' % (where, short(a, 60), short(b, 60)))
        return
    if a[0] != b[0]:
        out.append('%s: the decoded file %s → %s' % (where, short(a[0]), short(b[0])))
    for i in range(1, len(a)):
        fa, fb = a[i], b[i]
        if not isinstance(fa, list) or not isinstance(fb, list) or len(fa) != len(fb):
            out.append('%s frame %d: %s → %s' % (where, i, short(fa, 40), short(fb, 40)))
            continue
        worst = max([abs(x - y) for x, y in zip(fa, fb)] or [0])
        if worst > tol:
            out.append('%s frame %d: a cell of the decoded picture moved %d levels (tolerance %d)' % (where, i, worst, tol))


# ─── ONE REGION OF THE MAIN PICTURE IS NOT COMPARED BY PIXELS: THE PREVIEW CANVAS ITSELF ─────────────────────────────────
# Measured 1 Oct (HEAD against itself, three pairs): the preview's backing store and the image caches it draws from are
# ADAPTIVE BY DESIGN — js/app.js learns a quality tier from how fast this machine renders and sheds pixels while things
# move (FM._perfState) — so the same build drew a screen's preview at a different resampling in one run of three. That is
# the machine's speed, not Full. v1 stopped there, and the review found what that cost: the overlays drawn OVER the
# preview (#select-box, its handles, the guides, onion skin) and the preview's own resolution went unchecked. Now:
#   · the probe puts the quality ladder back to the top, waits out the motion window, and records the preview's backing
#     store, scale and crop (exact) and a hash of what it drew (exact) — so a blurry or blank preview is red;
#   · every screen has a SECOND picture, `<screen>~nopv`, with only the preview hidden: everything over it is compared
#     pixel for pixel, with nothing excluded.
PNG_UNSTABLE = ['canvas#preview']


def unstable_boxes(layout):
    out = []
    for e in layout or []:
        last = str(e[0]).split('>')[-1]
        if any(last == u or last.startswith(u + '.') for u in PNG_UNSTABLE):
            out.append((e[1], e[2], e[3], e[4]))
    return out


def png_counts(pa, pb, chans, boxes=()):
    """For each threshold in `chans`: pixels where any channel moved by more than it (outside `boxes`), and the box of
    the first threshold's changed pixels."""
    import numpy as np
    from PIL import Image
    A = np.asarray(Image.open(pa).convert('RGBA'), dtype=np.int16)
    B = np.asarray(Image.open(pb).convert('RGBA'), dtype=np.int16)
    if A.shape != B.shape:
        return [10 ** 9 for _ in chans], None
    d = np.abs(A - B).max(axis=2)
    keep = np.ones(d.shape, dtype=bool)
    for (x, y, w, h) in boxes:
        x0, y0 = max(0, int(x)), max(0, int(y))
        x1, y1 = int(x + w + 0.999), int(y + h + 0.999)
        keep[y0:y1, x0:x1] = False
    counts, box = [], None
    for i, c in enumerate(chans):
        m = (d > c) & keep
        n = int(m.sum())
        counts.append(n)
        if i == 0 and n:
            ys, xs = np.nonzero(m)
            box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    return counts, box


def png_changed(pa, pb, chan, boxes=()):
    """v1's call: pixels where any channel moved by more than `chan`, and their bounding box (outside `boxes`)."""
    c, box = png_counts(pa, pb, [chan], boxes)
    return c[0], box


def png_selftest(tol, chan, ftol=None, fchan=None):
    """THE PICTURE METRIC MUST SEE THE SMALLEST REAL CHANGES (DESIGN §0.4.5: "a 1 px move of a 1 px line"; the review: a
    6 px line moved 1 px counted 12 and hid under v1's 12, and a panel border recoloured 20 levels counted 0). Each must
    count over its tolerance, and the same picture must count zero — or every picture comparison below is blind.
    Returns (line_moved, same, faint_border) counts at their own thresholds."""
    import numpy as np
    from PIL import Image
    import tempfile
    d = tempfile.mkdtemp(prefix='fu-png-')
    a = np.zeros((60, 60, 4), np.uint8); a[..., 3] = 255
    b = a.copy()
    a[10:14, 12] = (200, 200, 200, 255)          # a 1 px line, 4 px long …
    b[10:14, 13] = (200, 200, 200, 255)          # … moved by one pixel
    pa, pb = os.path.join(d, 'a.png'), os.path.join(d, 'b.png')
    Image.fromarray(a).save(pa); Image.fromarray(b).save(pb)
    moved, _ = png_changed(pa, pb, chan)
    same, _ = png_changed(pa, pa, chan)
    # a 40x40 panel's 1 px border recoloured #2b3547 → #3f4a5c (the review's case: 20 levels on every channel)
    c = np.zeros((60, 60, 4), np.uint8); c[..., 3] = 255; c[...] = (20, 24, 32, 255)
    e = c.copy()
    for img, col in ((c, (0x2b, 0x35, 0x47, 255)), (e, (0x3f, 0x4a, 0x5c, 255))):
        img[10, 10:50] = col; img[49, 10:50] = col; img[10:50, 10] = col; img[10:50, 49] = col
    pc, pe_ = os.path.join(d, 'c.png'), os.path.join(d, 'e.png')
    Image.fromarray(c).save(pc); Image.fromarray(e).save(pe_)
    faint, _ = png_changed(pc, pe_, fchan if fchan is not None else chan)
    return moved, same, faint


def load(d, w):
    """rec-<W>.json.gz (what tools/full-unchanged.sh asks the driver for) or rec-<W>.json (a hand run)."""
    import gzip
    for p, opener in ((os.path.join(d, 'rec-%s.json.gz' % w), gzip.open), (os.path.join(d, 'rec-%s.json' % w), open)):
        if not os.path.exists(p):
            continue
        try:
            with opener(p, 'rt', encoding='utf-8') as fh:
                return json.load(fh)
        except Exception as e:
            return {'errors': ['the record %s could not be read: %s' % (p, e)]}
    return None


def instrument_errors(rec, w, groups):
    """Where the probe could not drive REF — or drove the function underneath instead of Full's control. Any of these
    means the run did not measure what it says."""
    out = []
    if rec is None:
        return ['%s: no record at all' % w]
    if rec.get('timedOut'):
        return ['%s: the probe ran out of time (last step: %s)' % (w, (rec.get('partial') or {}).get('step'))]
    for e in rec.get('errors') or []:
        out.append('%s: %s' % (w, e))
    if rec.get('step') != 'done':
        out.append('%s: the probe stopped at "%s"' % (w, rec.get('step')))
    for f in rec.get('fell') or []:
        out.append('%s FELL BACK (the step did not go through Full’s own control): %s' % (w, f))
    for n in rec.get('notes') or []:
        if 'upto=' in str(n):
            out.append('%s: a development run (%s) is not a measurement' % (w, n))
    if 'FU1' in groups:
        if not rec.get('screens'):
            out.append('%s FU1: no screens recorded' % w)
        for k, v in (rec.get('screens') or {}).items():
            if v.get('err'):
                out.append('%s FU1 %s: %s' % (w, k, v['err']))
            for hk, hv in (v.get('hovers') or {}).items():
                if isinstance(hv, dict) and hv.get('err'):
                    out.append('%s FU1 %s %s: %s' % (w, k, hk, hv['err']))
        reg = rec.get('registry')
        if not isinstance(reg, dict) or reg.get('err') or not reg.get('fx'):
            out.append('%s FU1: no registry of defaults (%s)' % (w, (reg or {}).get('err') if isinstance(reg, dict) else reg))
    for g, key in (('FU2', 'fu2'), ('FU3', 'fu3'), ('FU5', 'fu5')):
        if g in groups:
            if not rec.get(key):
                out.append('%s %s: nothing recorded' % (w, g))
            for r in rec.get(key) or []:
                if r.get('err'):
                    out.append('%s %s "%s": %s' % (w, g, r.get('name'), r['err']))
    if 'FU3' in groups:
        if not rec.get('phone') and not rec.get('fu3sweep'):
            out.append('%s FU3: the key sweep recorded nothing on a PC pass' % w)
        for r in rec.get('fu3sweep') or []:
            if r.get('err'):
                out.append('%s FU3 "%s": %s' % (w, r.get('name'), r['err']))
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


def sound_diff(a, b, where, out, tol):
    """The exported file's decoded sound: its rate, length and channels exact, each 0.1 s window's RMS and peak within tol."""
    if not isinstance(a, dict) or not isinstance(b, dict):
        if a != b:
            out.append('%s: %s → %s' % (where, short(a, 60), short(b, 60)))
        return
    if a.get('head') != b.get('head'):
        out.append('%s: the decoded sound %s → %s' % (where, short(a.get('head')), short(b.get('head'))))
        return
    for c, (ca, cb) in enumerate(zip(a.get('ch') or [], b.get('ch') or [])):
        worst, at = 0, None
        for i, (x, y) in enumerate(zip(ca, cb)):
            d = max(abs(x[0] - y[0]), abs(x[1] - y[1]))
            if d > worst:
                worst, at = d, i
        if worst > tol:
            out.append('%s: channel %d of the decoded sound moved %d/1000 at %.1f s (tolerance %d): %s → %s' % (where, c, worst, at / 10.0, tol, ca[at], cb[at]))


def bytes_diff(sa, sb, where, out, pct):
    """The exported file's sound track, in bytes: within pct % (the AAC encoder is not byte-exact run to run — 7216 and 7212
    from one build, 6 Oct — while a lower bitrate moves it by tens of percent). Taken out of both states once compared."""
    ta = (((sa or {}).get('out') or {}).get('mp4') or {}).get('tracks') or []
    tb = (((sb or {}).get('out') or {}).get('mp4') or {}).get('tracks') or []
    for i, (x, y) in enumerate(zip(ta, tb)):
        if not isinstance(x, dict) or not isinstance(y, dict) or ('bytes' not in x and 'bytes' not in y):
            continue
        bx, by = x.pop('bytes', None), y.pop('bytes', None)
        if bx is None or by is None or abs(bx - by) * 100.0 > max(bx, by) * pct:
            out.append('%s: state.out.mp4.tracks[%d].bytes: %s → %s (tolerance %d%%)' % (where, i, bx, by, pct))


def sweep_diff(A, B, w, out, per_step):
    """FU3's key sweep: per key, whether it changed anything and, where it did, the state it left — against the state its
    pass started from when the other side changed nothing, so a new shortcut reads as what it did."""
    sa, sb = A.get('fu3sweep') or [], B.get('fu3sweep') or []
    ba, bb = A.get('fu3sweepBase') or [], B.get('fu3sweepBase') or []
    if ba != bb:
        local = []
        json_diff(ba, bb, 'the state each sweep pass starts from', local, per_step)
        out += ['%s FU3 "sweep": %s' % (w, x) for x in local]
    for i, ra in enumerate(sa):
        rb = sb[i] if i < len(sb) else None
        if rb is None:
            out.append('%s FU3 "%s": missing on the tree' % (w, ra.get('name')))
            break
        local = []
        if ra.get('name') != rb.get('name'):
            local.append('key %s → %s' % (ra.get('name'), rb.get('name')))
        if ra.get('err') != rb.get('err'):
            local.append('error %s → %s' % (short(ra.get('err')), short(rb.get('err'))))
        if ra.get('changed') != rb.get('changed') or ra.get('state') != rb.get('state'):
            p = ra.get('pass') or 0
            xa = ra.get('state') if ra.get('state') is not None else (ba[p] if p < len(ba) else None)
            xb = rb.get('state') if rb.get('state') is not None else (bb[p] if p < len(bb) else None)
            if ra.get('changed') != rb.get('changed'):
                local.append('it changes anything: %s → %s' % (bool(ra.get('changed')), bool(rb.get('changed'))))
            json_diff(xa, xb, 'key.state', local, max(4, per_step))
        out += ['%s FU3 "%s": %s' % (w, ra.get('name'), x) for x in local]
    if len(sb) > len(sa):
        out.append('%s FU3 sweep: %d keys → %d' % (w, len(sa), len(sb)))


def compare(ref_dir, cand_dir, widths, groups, limit, per_step=6):
    """`widths` are run labels; `groups` is one list for all of them, or {label: [groups]}."""
    keys = invisible_list()
    tol, chan = envint('FU_TOL_PX'), envint('FU_CHAN')
    ftol, fchan = envint('FU_FAINT_TOL_PX', 10 ** 9), envint('FU_FAINT_CHAN', 255)
    gtol = envint('FU_GRID_TOL', 0)
    atol = envint('FU_AUDIO_TOL', 0)
    btol = envint('FU_BYTES_PCT', 0)
    by_label = groups if isinstance(groups, dict) else None
    diffs, broken, pictures = [], [], []
    for w in widths:
        groups = by_label.get(w, []) if by_label is not None else groups
        A, B = load(ref_dir, w), load(cand_dir, w)
        broken += instrument_errors(A, w, groups)
        if B is None:
            broken.append('%s: the tree produced no record' % w)
            continue
        if A is None:
            continue
        A, B = apply_mask(A, keys), apply_mask(B, keys)
        fields = A.get('fields') or FIELDS_V1
        out = []
        if A.get('fields') != B.get('fields'):
            out.append('%s the layout record’s columns: %s → %s' % (w, short(A.get('fields')), short(B.get('fields'))))
        if A.get('palette') != B.get('palette'):
            out.append('%s the clip-colour palette (js/scene.js CLIP_COLORS): %s → %s' % (w, short(A.get('palette')), short(B.get('palette'))))
        if B.get('step') != 'done':
            out.append('%s: the probe stopped on the tree at "%s" (%s)' % (w, B.get('step'), '; '.join((B.get('errors') or [])[:2])))
        for f in B.get('fell') or []:
            if f not in (A.get('fell') or []):
                out.append('%s: on the tree a step fell back from Full’s own control: %s' % (w, f))
        if 'FU1' in groups:
            for name, sa in (A.get('screens') or {}).items():
                sb = (B.get('screens') or {}).get(name)
                if sb is None:
                    out.append('%s %s: screen missing on the tree' % (w, name))
                    continue
                if sb.get('err') and not sa.get('err'):
                    out.append('%s %s: the tree could not reach this screen: %s' % (w, name, sb['err']))
                    continue
                if 'hovers' in sa or 'hovers' in sb:
                    ha, hb = sa.get('hovers') or {}, sb.get('hovers') or {}
                    for hk in list(ha.keys()) + [k for k in hb if k not in ha]:
                        va, vb = ha.get(hk) or {}, hb.get(hk) or {}
                        where = '%s %s %s' % (w, name, hk)
                        if va.get('target') != vb.get('target') or va.get('none') != vb.get('none'):
                            out.append('%s: hovered %s → %s' % (where, va.get('target') or va.get('none'), vb.get('target') or vb.get('none')))
                        layout_diff(va.get('layout') or [], vb.get('layout') or [], where + ' (hovered)', out, limit, fields)
                        for hk2 in ('around', 'err'):
                            if va.get(hk2) != vb.get(hk2):
                                out.append('%s (hovered): %s %s → %s' % (where, {'around': 'the box pictured'}.get(hk2, hk2), short(va.get(hk2)), short(vb.get(hk2))))
                        if va.get('motion') != vb.get('motion'):
                            local = []
                            json_diff(va.get('motion'), vb.get('motion'), 'motion', local, max(3, per_step))
                            out += ['%s (hovered): %s' % (where, x) for x in local]
                    continue
                layout_diff(sa.get('layout') or [], sb.get('layout') or [], '%s %s' % (w, name), out, limit, fields)
                for k in ('focus', 'pv', 'pvHash'):
                    if sa.get(k) != sb.get(k):
                        out.append('%s %s: %s %s → %s' % (w, name, {'pv': 'the preview’s backing store', 'pvHash': 'what the preview drew'}.get(k, k), short(sa.get(k)), short(sb.get(k))))
                for k in ('toast', 'playing'):
                    if sa.get(k) != sb.get(k):
                        local = []
                        json_diff(sa.get(k), sb.get(k), {'toast': 'the toast'}.get(k, k), local, max(4, per_step))
                        out += ['%s %s: %s' % (w, name, x) for x in local]
                if sa.get('motion') != sb.get('motion'):
                    local = []
                    json_diff(sa.get('motion'), sb.get('motion'), 'what it animated', local, max(4, per_step))
                    out += ['%s %s: %s' % (w, name, x) for x in local]
        if 'FU1' in groups and A.get('registry') != B.get('registry'):
            local = []
            json_diff(A.get('registry'), B.get('registry'), 'registry', local, max(8, per_step))
            out += ['%s %s' % (w, x) for x in local]
        if 'FU2' in groups:
            sa, sb = A.get('fu2') or [], B.get('fu2') or []
            for i, ra in enumerate(sa):
                rb = sb[i] if i < len(sb) else None
                if rb is None:
                    out.append('%s FU2 "%s": missing on the tree' % (w, ra['name']))
                    break
                local = []
                if rb.get('name') != ra.get('name'):
                    local.append('step %s → %s' % (short(ra.get('name')), short(rb.get('name'))))
                if rb.get('err') != ra.get('err'):
                    local.append('error %s → %s' % (short(ra.get('err')), short(rb.get('err'))))
                json_diff(ra.get('state'), rb.get('state'), 'state', local, per_step)
                sfa, sfb = ra.get('surf') or {}, rb.get('surf') or {}
                for sk in list(sfa.keys()) + [k for k in sfb if k not in sfa]:
                    layout_diff(sfa.get(sk), sfb.get(sk), 'the surface "%s"' % sk, local, per_step + len(local), fields)
                if 'grid' in ra or 'grid' in rb:
                    grid_diff(ra.get('grid'), rb.get('grid'), 'the exported file', local, gtol)
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
                # per_step, as FU2's steps (6 Oct: a fixed 4 let one change's lines hide another's — with the review's
                # nineteen replayed as ONE release, every key's first four lines were the colour plant's clipColor and
                # the remapped 3's inspectorView / addTab never reached the report)
                json_diff(ra, rb, 'key', local, max(4, per_step))
                for x in local:
                    out.append('%s FU3 "%s": %s' % (w, ra['name'], x))
                if len(out) >= limit:
                    break
            sweep_diff(A, B, w, out, per_step)
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
                        layout_diff(pa_.get('layout') or [], pb_.get('layout') or [], '%s FU6 %s %s' % (w, size, part), out, limit, fields)
                        for k in ('cls', 'focus', 'exp'):
                            if pa_.get(k) != pb_.get(k):
                                out.append('%s FU6 %s %s: %s %s → %s' % (w, size, part, k, short(pa_.get(k)), short(pb_.get(k))))
                        if pa_.get('motion') != pb_.get('motion'):
                            local = []
                            json_diff(pa_.get('motion'), pb_.get('motion'), 'what it animated', local, max(4, per_step))
                            out += ['%s FU6 %s %s: %s' % (w, size, part, x) for x in local]
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
        # pictures: the screen (the preview's own box left out — see PNG_UNSTABLE) and the screen with the preview hidden
        # (nothing left out), each held to BOTH thresholds
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
                boxes = []
                if '~' not in scr:
                    boxes = unstable_boxes(((A.get('screens') or {}).get(scr) or {}).get('layout')) + \
                        unstable_boxes(((B.get('screens') or {}).get(scr) or {}).get('layout'))
                (n, nf), box = png_counts(os.path.join(da, name), pb, [chan, fchan], boxes)
                pictures.append((w, name, n, nf))
                if n > tol:
                    out.append('%s picture %s: %d px differ by more than %d levels (tolerance %d), within %s' % (w, name, n, chan, tol, box))
                elif nf > ftol:
                    out.append('%s picture %s: %d px differ faintly, by more than %d levels (tolerance %d)' % (w, name, nf, fchan, ftol))
            for name in sorted(os.listdir(db)) if os.path.isdir(db) else []:
                if name.endswith('.png') and not os.path.exists(os.path.join(da, name)):
                    out.append('%s picture %s: new on the tree' % (w, name))
        diffs += out
    return diffs, broken, pictures


# ═══ THE SELF-TEST'S PLANTS (DESIGN §0.4.5 "The gate, structurally"; the 1 Oct review) ══════════════════════════════════
# They live in tools/full-unchanged-plants.json — one file the shell, this, and the suite's guard test all read. Each is
# planted in a COPY of the tree, measured, and must turn the comparison red FOR ITS OWN REASON.
def plants():
    return json.load(open(PLANTS_FILE, encoding='utf-8'))['plants']


def plant(kind, d):
    ps = [p for p in plants() if p['name'] == kind]
    if not ps:
        print('❌ no plant named %s in %s' % (kind, PLANTS_FILE))
        return 2
    p = ps[0]
    path = os.path.join(d, p['file'])
    src = open(path, encoding='utf-8').read()
    if 'append' in p:
        out = src + p['append']
    else:
        n = src.count(p['old'])
        if n != 1:
            print('❌ the %s plant\'s anchor appears %d times in %s (want exactly 1): %r — update %s' % (kind, n, p['file'], p['old'][:120], PLANTS_FILE))
            return 2
        out = src.replace(p['old'], p['new'], 1)
    if out == src:
        print('❌ the %s plant changed nothing' % kind)
        return 2
    # the copy is HARD-LINKED to the tree's (linkcopy): unlink first, or writing in place would plant into the tree too
    os.remove(path)
    open(path, 'w', encoding='utf-8').write(out)
    return 0


def linkcopy(src, dst):
    """A copy of a measured folder made of HARD LINKS (no bytes copied): ten plants of a ~60 MB app would otherwise take
    600 MB, and this Mac's disk ran out mid-run on 1 Oct. Anything that edits a file in the copy unlinks it first (plant)."""
    import shutil
    skip = shutil.ignore_patterns('shots-*', 'rec-*.json*', 'cdp-*.log')
    shutil.copytree(src, dst, copy_function=os.link, ignore=skip)
    return 0


def sig_hit(line, sig):
    """A difference line carries a plant's signature: every string is in it, and when the line names a step or a key
    (`… "<name>": <what differs>`), every string after the first is in WHAT differs — never only in the name. Measured
    6 Oct: 'Bounce on a camera … frames on the ring' carried ['Bounce on a camera', 'frames'] in its NAME, on a line that
    differed for another reason, while the planted 1.5x decay drew nothing at all — a catch by luck."""
    if not all(s in line for s in sig):
        return False
    m = STEP_LINE.match(line)
    if not m:
        return True
    rest = sig[1:]
    return bool(rest) and all(s in line[m.end():] for s in rest)


STEP_LINE = re.compile(r'^[\w.-]+ FU\d "[^"]*": ')   # "380 FU2 "<step>": <what differs>" ("440x956 FU2 …" too; a value's own JSON never starts a line)


def judge(work):
    ok = True
    for p in plants():
        kind, widths, groups, sig = p['name'], p['widths'], p['groups'].split(','), p['sig']
        diffs, broken, _ = compare(os.path.join(work, 'head'), os.path.join(work, 'plant-' + kind), widths, groups, 4000, per_step=200)
        if broken:
            print('   ❌ %s: the reference could not be measured — %s' % (kind, broken[0]))
            ok = False
            continue
        for w in widths:
            hits = [x for x in diffs if x.startswith(w + ' ') and sig_hit(x, sig)]
            if hits:
                print('   ✅ %s plant (%s) caught at %s: %s' % (kind, p.get('kind', ''), w, hits[0][:200]))
            elif diffs:
                print('   ❌ %s plant turned it red at %s, but NOT for the planted reason — first: %s' % (kind, w, diffs[0][:220]))
                ok = False
            else:
                print('   ❌ %s plant was NOT caught at %s: the comparison saw no difference at all' % (kind, w))
                ok = False
    return 0 if ok else 1


def measure(head, head2, margin):
    """The numbers tools/full-unchanged.sh carries: how much HEAD differs from ITSELF (the jitter — of the records, which
    must be NONE, of the pictures, and of the decoded export), and how much the smallest real change moves a picture (the
    #transport 1 px margin). Swept over the per-channel threshold."""
    names = []
    for w in ('380', '1280'):
        da = os.path.join(head, 'shots-%s' % w)
        names += [(w, n) for n in sorted(os.listdir(da)) if n.endswith('.png')] if os.path.isdir(da) else []
    groups = ['FU1', 'FU2', 'FU3', 'FU6', 'FU4', 'FU5', 'FU7']
    # the records first: two runs of the same build must be IDENTICAL, or the exact comparison measures the machine
    os.environ['FU_TOL_PX'] = str(10 ** 9)
    os.environ['FU_FAINT_TOL_PX'] = str(10 ** 9)
    os.environ['FU_GRID_TOL'] = '255'
    os.environ['FU_CHAN'] = '0'
    diffs, broken, _ = compare(head, head2, ['380', '1280'], groups, 400)
    print('records, HEAD against itself (every group): %s' % ('identical' if not diffs and not broken else '%d differences' % len(diffs)))
    for x in (broken + diffs)[:40]:
        print('   · ' + x)
    # the decoded export, HEAD against itself: the most any cell moved
    for w in ('380', '1280'):
        A, B = load(head, w) or {}, load(head2, w) or {}
        ga = [e.get('grid') for e in A.get('fu2') or [] if e.get('grid')]
        gb = [e.get('grid') for e in B.get('fu2') or [] if e.get('grid')]
        worst = 0
        for x, y in zip(ga, gb):
            for i in range(1, min(len(x), len(y))):
                worst = max([worst] + [abs(p - q) for p, q in zip(x[i], y[i])])
        print('decoded export at %s, HEAD against itself: the most a cell moved = %d levels' % (w, worst))
    mdiffs, _, _ = compare(head, margin, ['380', '1280'], ['FU1'], 400)
    moved = set((x.split(' ')[0], x.split(' ')[1].rstrip(':')) for x in mdiffs if '#transport' in x)
    print('the margin plant moved #transport in %d screen(s)' % len(moved))
    recs = {}
    for d in (head, head2, margin):
        for w in ('380', '1280'):
            recs[(d, w)] = load(d, w) or {}

    def boxes(da, db, w, n):
        scr = n[:-4]
        if '~' in scr:
            return []
        return unstable_boxes(((recs[(da, w)].get('screens') or {}).get(scr) or {}).get('layout')) + \
            unstable_boxes(((recs[(db, w)].get('screens') or {}).get(scr) or {}).get('layout'))

    def changed(da, db, w, n, chan):
        return png_changed(os.path.join(da, 'shots-%s' % w, n), os.path.join(db, 'shots-%s' % w, n), chan, boxes(da, db, w, n))
    print('\nchan  jitter(max px, HEAD vs HEAD)   smallest real (min px > 0 over screens the margin moved)')
    for chan in (0, 1, 2, 4, 6, 8, 12, 16, 24, 32, 64):
        jit = max([changed(head, head2, w, n, chan)[0] for (w, n) in names] or [0])
        real = [changed(head, margin, w, n, chan)[0] for (w, n) in names
                if (w, n[:-4].split('~')[0]) in moved and os.path.exists(os.path.join(margin, 'shots-%s' % w, n))]
        # the smallest VISIBLE change: a screen where Home covers #transport moves its box and not one pixel
        real_v = sorted(r for r in real if r > 0)
        print('%4d  %10d                       %10s   (all: %s)' % (chan, jit, real_v[0] if real_v else 0, real_v[:12]))
    for (w, n) in names:
        c = changed(head, head2, w, n, 0)
        if c[0]:
            print('   jitter at chan 0: %s %s %d px in %s' % (w, n, c[0], c[1]))
    return 0


def main():
    if len(sys.argv) > 1 and sys.argv[1] in ('plant', 'judge', 'measure', 'plants', 'linkcopy'):
        cmd = sys.argv[1]
        if cmd == 'plant':
            return plant(sys.argv[2], sys.argv[3])
        if cmd == 'linkcopy':
            return linkcopy(sys.argv[2], sys.argv[3])
        if cmd == 'judge':
            return judge(sys.argv[2])
        if cmd == 'plants':
            for p in plants():
                print('%s %s %s' % (p['name'], p['groups'], ','.join(p['widths'])))
            return 0
        return measure(sys.argv[2], sys.argv[3], sys.argv[4])
    ap = argparse.ArgumentParser()
    ap.add_argument('ref')
    ap.add_argument('cand')
    ap.add_argument('--widths', default='380,1280')
    ap.add_argument('--groups', default='FU1,FU2,FU3,FU6,FU4,FU5,FU7')
    ap.add_argument('--runs', default=None, help="each label's own groups: '380=FU1,FU2 440x956=FU1' (overrides --widths/--groups)")
    ap.add_argument('--max', type=int, default=12)
    ap.add_argument('--json', default=None)
    ap.add_argument('--png-selftest', action='store_true')
    a = ap.parse_args()
    tol, chan = envint('FU_TOL_PX'), envint('FU_CHAN')
    ftol, fchan = envint('FU_FAINT_TOL_PX', 10 ** 9), envint('FU_FAINT_CHAN', 255)
    moved, same, faint = png_selftest(tol, chan, ftol, fchan)
    if a.png_selftest:
        print('png self-test: a 1 px line (4 px long) moved 1 px = %d px at chan %d (tolerance %d); the same picture = %d; '
              'a panel border recoloured 20 levels = %d px at chan %d (tolerance %d)' % (moved, chan, tol, same, faint, fchan, ftol))
    if not (moved > tol and same == 0 and faint > ftol):
        print('❌ THE PICTURE COMPARISON IS BLIND: a 1 px line (4 px long) moved by 1 px counts %d px against a tolerance of %d, '
              'a panel border recoloured by 20 levels counts %d against %d, and the same picture counts %d. Re-measure '
              '(tools/full-unchanged.sh --measure) and lower the tolerances in tools/full-unchanged.sh.' % (moved, tol, faint, ftol, same))
        return 3
    if a.runs:
        runs = [x.split('=', 1) for x in a.runs.split()]
        labels, groups = [r[0] for r in runs], dict((r[0], r[1].split(',')) for r in runs)
    else:
        labels, groups = a.widths.split(','), a.groups.split(',')
    diffs, broken, pictures = compare(a.ref, a.cand, labels, groups, a.max * 50)
    if a.json:
        json.dump({'diffs': diffs, 'broken': broken, 'pictures': pictures}, open(a.json, 'w'), indent=1, ensure_ascii=False)
    if broken:
        print('❌ THE INSTRUMENT IS BROKEN — the probe could not drive the reference here as it says, so a match would prove nothing:')
        for b in broken[:a.max]:
            print('   · ' + b)
        return 3
    if diffs:
        print('❌ DIFFERENT FROM HEAD — %d difference(s); the first:' % len(diffs))
        for d in diffs[:a.max]:
            print('   · ' + d)
        return 1
    worst = max([p[2] for p in pictures] or [0])
    worstf = max([p[3] for p in pictures] or [0])
    print('✅ same as HEAD (%d pictures compared, the most-changed differs in %d px over %d levels and %d px over %d; '
          'tolerances %d and %d)' % (len(pictures), worst, chan, worstf, fchan, tol, ftol))
    return 0


if __name__ == '__main__':
    sys.exit(main())
