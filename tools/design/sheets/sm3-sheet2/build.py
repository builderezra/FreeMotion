#!/usr/bin/env python3
"""tools/design/sheets/sm3-sheet2/build.py - sheet.html + the pictures + shots.json  ->  index.html, ONE self-contained page.

    python3 tools/design/sheets/sm3-sheet2/build.py                  # refuses on anything missing (the normal way, via run-all.sh)
    python3 tools/design/sheets/sm3-sheet2/build.py --allow-missing  # a draft: a red box for each missing picture, [not measured] words
    python3 tools/design/sheets/sm3-sheet2/build.py --list-tall      # the pictures taller than 3x their width (run-all.sh splits them)

Copied from the first sheet's build.py (tools/design/sheets/sm3-sheet/, never edited), with this sheet's facts. Every src="shot:NAME"
in sheet.html becomes NAME.png as a JPEG data URI (PIL; a PNG data URI without it), shrunk to what a phone shows; a figure marked
data-optional="NAME" goes when NAME was not taken. Every {{fact}} is filled from what capture.py MEASURED (shots.json) - the sheet's
numbers, which option of question 1 is "(recommended)" and why - so no sentence on the sheet claims what the pictures do not show. It
refuses (exit 1) while capture recorded a failure, a picture is missing, a fact was not measured, a measurement says a question is not
true of this build, a {{...}} is left, the page is over 15 MB, or the template's script or style holds a non-ASCII byte; the page it
writes is ASCII, every other character an entity.
"""
import base64, datetime, html, io, json, os, re, struct, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'sheet.html')
OUT = os.path.join(HERE, 'index.html')
LIMIT = 15 * 1024 * 1024
try:
    from PIL import Image
except Exception:
    Image = None

NAMES = {'into': 'Into row', 'addfx': 'Add effect', 'crop': 'Crop', 'forward': 'Forward', 'backward': 'Back', 'stay': 'Stay put',
         'more': 'More', 'delete': 'the bin', 'editwords': 'Edit words', 'volume': 'Volume', 'fade': 'Fade', 'speed': 'Speed'}
LETTERS = {1: 'ABC', 2: 'AB', 3: 'ABC', 4: 'AB'}
BADGE = ' <span class="rec">(recommended)</span>'
X = '\u00d7'   # the multiplication sign, kept as an escape so this file stays ASCII


def names(ids):
    ids = list(ids or [])
    words = [NAMES.get(i, i) for i in ids]
    if len(words) <= 1:
        return ''.join(words)
    return ', '.join(words[:-1]) + ' and ' + words[-1]


def png_size(path):
    with open(path, 'rb') as f:
        head = f.read(24)
    if head[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    return struct.unpack('>II', head[16:24])


def list_tall():
    for f in sorted(os.listdir(HERE)):
        p = os.path.join(HERE, f)
        if not os.path.isfile(p):
            continue
        wh = None
        if f.endswith('.png'):
            wh = png_size(p)
        elif f.endswith(('.jpg', '.jpeg')) and Image is not None:
            with Image.open(p) as im:
                wh = im.size
        if wh and wh[1] > 3 * wh[0]:
            print(p)
    return 0


def embed(path, name):
    raw = open(path, 'rb').read()
    if Image is None:
        return 'data:image/png;base64,' + base64.b64encode(raw).decode('ascii')
    maxw = 900 if name.endswith('-crop') else (520 if name.endswith('-380') else 1100)
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=82, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


def missing_picture(name):
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="160"><rect width="600" height="160" fill="#5a0d0d"/>'
           '<text x="20" y="90" font-family="sans-serif" font-size="26" fill="#ffffff">MISSING PICTURE: %s</text></svg>' % html.escape(name))
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode('ascii', 'xmlcharrefreplace')).decode('ascii')


class Measured:
    """What capture.py measured, by picture name; every gap is recorded, never guessed."""
    def __init__(self, data):
        self.m = {s['name']: (s.get('meta') or {}) for s in data.get('shots', [])}
        self.gaps = []

    def __call__(self, shot, key):
        if shot not in self.m:
            self.gaps.append('%s was not taken' % shot)
            return None
        v = self.m[shot].get(key)
        if v is None:
            self.gaps.append('%s did not measure %s' % (shot, key))
        return v

    def meta(self, shot, keys):
        """the whole record of one picture, refused (None) unless every key in `keys` was measured"""
        if shot not in self.m:
            self.gaps.append('%s was not taken' % shot)
            return None
        miss = [k for k in keys if self.m[shot].get(k) is None]
        if miss:
            self.gaps.append('%s did not measure %s' % (shot, ', '.join(miss)))
            return None
        return self.m[shot]


R6_KEYS = ['band', 'room', 'tiles', 'done', 'pic']


def tiles_words(t):
    on, per, total, pages = int(t['on']), int(t['perPage']), int(t['total']), int(t['pages'])
    shape = "the Shape tab's %d tiles" % total
    if on <= 0:
        return 'not one of %s is wholly on show' % shape
    if on >= per:
        if pages <= 1:
            return 'all of %s are on show at once' % shape
        return 'a whole page of %d tiles is on show (%s are on %d pages)' % (per, shape, pages)
    return 'only %d of the %d tiles on a page %s wholly on show (%s are on %d pages)' % (on, per, 'is' if on == 1 else 'are', shape, pages)


def done_words(d):
    return '' if (isinstance(d, dict) and d.get('ok')) else ', and Done, in the row under it, cannot be pressed: something lies over it'


def fits(m):
    t, d = m['tiles'], m['done']
    return int(t['on']) >= int(t['perPage']) and int(t['perPage']) >= 4 and isinstance(d, dict) and d.get('ok') is True


def pic_words(p):
    return '%d %s %d px' % (p['w'], X, p['h'])


def derive(data):
    x, F = Measured(data), {}
    t = data.get('taken') or ''
    try:
        d = datetime.datetime.fromisoformat(t)
        F['taken'] = 'on %d %s %d at %s' % (d.day, d.strftime('%b'), d.year, d.strftime('%H:%M'))
    except Exception:
        F['taken'] = None
        x.gaps.append('shots.json has no time it was taken')
    F['tree'] = ('commit ' + data['tree']) if data.get('tree') else None
    if not data.get('tree'):
        x.gaps.append('shots.json does not say which commit the pictures are of')

    # 1 - R6, Extras on a PC: as built at 1280 and 900, (b) the band grown, (c) a sheet over the timeline
    a, a9 = x.meta('r6-a-1280', R6_KEYS), x.meta('r6-a-900', R6_KEYS)
    b, c = x.meta('r6-b-1280', R6_KEYS + ['before']), x.meta('r6-c-1280', R6_KEYS + ['sheet'])
    fu = x.meta('r6-full-1280', ['band', 'room', 'tiles'])
    for k in ('r6_band', 'r6_room', 'r6_a', 'r6_band900', 'r6_room900', 'r6_a900', 'r6_b_band', 'r6_b_room', 'r6_b', 'r6_b_pic',
              'r6_b_grow', 'r6_b_vs_full', 'r6_full', 'r6_c_room', 'r6_c', 'why1'):
        F[k] = None
    if fu:
        F['r6_full'] = 'Full\'s own Add menu in the same %s px band: %s px, and %s' % (fu['band'], fu['room'], tiles_words(fu['tiles']))
        if b:
            near = abs(int(b['room']) - int(fu['room'])) <= 24
            F['r6_b_vs_full'] = ('about the %s px Full\'s own Add menu has in the same window' if near else
                                 'where Full\'s own Add menu has %s px in the same window') % fu['room']
    rec1 = None
    if a:
        F['r6_band'], F['r6_room'], F['r6_a'] = str(a['band']), str(a['room']), tiles_words(a['tiles']) + done_words(a['done'])
        if fits(a):
            x.gaps.append('r6-a-1280: as built, Extras already shows a whole page with Done pressable at 1280x800, so question 1 is not '
                          'true of this build - rewrite it')
    if a9:
        F['r6_band900'], F['r6_room900'], F['r6_a900'] = str(a9['band']), str(a9['room']), tiles_words(a9['tiles']) + done_words(a9['done'])
    if b:
        bp = (b.get('before') or {}).get('pic')
        F['r6_b_band'], F['r6_b_room'], F['r6_b'] = str(b['band']), str(b['room']), tiles_words(b['tiles']) + done_words(b['done'])
        F['r6_b_grow'] = str(b.get('grow')) if b.get('grow') is not None else None
        if b.get('grow') is None:
            x.gaps.append('r6-b-1280 did not measure grow')
        if isinstance(bp, dict) and isinstance(b['pic'], dict):
            F['r6_b_pic'] = 'from %s to %s' % (pic_words(bp), pic_words(b['pic']))
        else:
            x.gaps.append('r6-b-1280 did not measure the picture before and after')
    if c:
        F['r6_c_room'], F['r6_c'] = str(c['room']), tiles_words(c['tiles']) + done_words(c['done'])
    if a and b and c:
        if fits(b):
            rec1 = 'B'
            F['why1'] = ('It gives Extras room for a whole page of tiles with Done pressable (%s px%s), you still see the picture while '
                         'you choose, everything goes back when Extras closes, and it is what question 7 on the first sheet recommends '
                         'for every panel.' % (b['room'], (', Full\'s Add menu has %s' % fu['room']) if fu else ''))
        elif fits(c):
            rec1 = 'C'
            F['why1'] = ('The grown band still does not fit cleanly (%s), while the sheet over the timeline does (%s), and the picture '
                         'stays uncovered.' % (F['r6_b'], F['r6_c']))
        else:
            x.gaps.append('question 1: neither the grown band (b: %s) nor the sheet (c: %s) shows a whole page of tiles with Done pressable '
                          '- redraw them before asking' % (F['r6_b'], F['r6_c']))

    # 3 - #5, the one-picture element: what the sound's tools say
    F['tie_with'] = x('tie-sound-380', 'with')

    # 4 - effects on an item
    hp, rp, op = x('fx-tray-pic-380', 'hidden'), x('fx-tray-pic-1280', 'rows'), x('fx-tray-pic-1280', 'outside')
    F['fx_pic_phone'] = None if hp is None else ('all eight are on the first screen' if not hp else
                                                 '%s start%s off the screen, a swipe away' % (names(hp), 's' if len(hp) == 1 else ''))
    if rp is None or op is None:
        F['fx_pic_pc'] = None
    else:
        F['fx_pic_pc'] = ('two rows of four' if list(rp) == [4, 4] else 'rows of %s' % ' and '.join(str(r) for r in rp)) + \
                         ((', with %s past the edge of the band' % names(op)) if op else ', all inside the band')
    ht, st, ot = x('fx-tray-title-1280', 'hidden'), x('fx-tray-title-1280', 'scrolls'), x('fx-tray-title-1280', 'outside')
    if ht is None or st is None or ot is None:
        F['fx_title_pc'] = None
    elif not ht and not st and not ot:
        F['fx_title_pc'] = 'all five fit in the band'
    else:
        off = sorted(set(list(ht) + list(ot)))
        F['fx_title_pc'] = ('they do not all fit: %s %s partly past the edge of the band, a swipe or the mouse wheel away' %
                            (names(off) or 'the last tool', 'is' if len(off) <= 1 else 'are'))
    h3 = x('fx-tray-title-380', 'hidden')
    F['fx_title_phone'] = None if h3 is None else ('all five fit on the screen' if not h3 else '%s start off the screen' % names(h3))
    tl, pr, ct = x('fx-item-picker-380', 'tiles'), x('fx-item-picker-380', 'presets'), x('fx-item-picker-380', 'cut')
    F['fx_tiles'] = str(tl) if tl is not None else None
    F['fx_presets'] = str(pr) if pr is not None else None
    F['fx_cut'] = None if ct is None else ('no name is cut short' if not ct else '%d of the names are cut short at that size' % ct)
    oc = x('fx-over-380', 'cut')
    F['fx_over_note'] = None if oc is None else ('the words fit on the item' if not oc else 'on this item the words are cut short with an ellipsis')
    fe = x('fx-face-effects-380', 'faces')
    if fe is not None and fe != 2:
        x.gaps.append('fx-face-effects-380: %s buttons read Effects, want 2 - option B of question 4 is not drawn' % fe)

    # 5 - Extras, just look
    F['clips_title'] = x('clips-list-380', 'title') or None
    tabs = x('x-elements-380', 'tabs')
    F['x_tabs'] = ', '.join(tabs) if tabs else None
    F['x_empty_title'] = x('x-noelements-380', 'title') or None
    lines = x('x-noelements-380', 'lines')
    F['x_empty_lines'] = ' '.join(lines) if lines else None
    F['x_with_stay'] = x('x-with-380', 'stay') or None
    hw = x('x-with-1280', 'hidden')
    F['x_with_pc'] = None if hw is None else ('all five tools still fit beside it' if not hw else 'it pushes %s partly out of the band' % names(hw))

    # 6 - template Replace, just look
    for shot, key in (('fill-lock-380', 'lock'), ('fill-frame-380', 'frame')):
        ln, bs = x(shot, 'line'), x(shot, 'buttons')
        F['fill_%s_line' % key] = ln or None
        F['fill_%s_btn' % key] = bs[0] if bs else None
    for shot in ('fill-lock-380', 'fill-lock-1280', 'fill-frame-380', 'fill-frame-1280'):
        if shot not in x.m:
            continue
        mm = x.m[shot]
        if mm.get('between') is not True:
            x.gaps.append('%s: the line is not between the slots and Replace Media, as the sheet says' % shot)
        if mm.get('armed') is not True or mm.get('pressable') is not True:
            x.gaps.append('%s: the line\'s button was not armed and pressable when it was shot' % shot)

    recs = {1: rec1, 2: 'A', 3: 'A', 4: 'A'}
    for q, letters in LETTERS.items():
        for o in letters:
            F['rec:%d%s' % (q, o)] = (BADGE if recs[q] == o else '') if recs[q] else None
    return F, x.gaps, recs


def main():
    if '--list-tall' in sys.argv:
        return list_tall()
    allow = '--allow-missing' in sys.argv
    sj = os.path.join(HERE, 'shots.json')
    if not os.path.exists(sj):
        print('build: no shots.json - run capture.sh first (run-all.sh does both)')
        return 1
    data = json.load(open(sj, encoding='utf-8'))
    problems = ['capture failed: %s step %s @ %s: %s' % (f['scene'], f['step'], f['tag'], f['error']) for f in data.get('failures', [])]
    src = open(SRC, encoding='utf-8').read()
    for tag in ('script', 'style'):
        for block in re.findall(r'<%s\b[^>]*>(.*?)</%s>' % (tag, tag), src, flags=re.S):
            if any(ord(ch) > 127 for ch in block):
                problems.append('sheet.html: a non-ASCII character inside <%s> (an entity there would be read literally)' % tag)
    facts, gaps, recs = derive(data)
    problems += gaps

    # only pictures THIS capture recorded: a file left on disk by an earlier run is not evidence of this build
    known = set()
    for s in data.get('shots', []):
        for k in ('file', 'crop'):
            if s.get(k):
                known.add(os.path.splitext(s[k])[0])

    def optional_fig(m):
        name = m.group(1)
        return m.group(0) if (name in known and os.path.exists(os.path.join(HERE, name + '.png'))) else ''
    out = re.sub(r'<figure\b[^>]*\bdata-optional="([a-z0-9-]+)"[^>]*>.*?</figure>', optional_fig, src, flags=re.S)

    used, size = [], [0]

    def picture(m):
        name = m.group(2)
        path = os.path.join(HERE, name + '.png')
        if not os.path.exists(path) or name not in known:
            problems.append(('picture missing: %s.png' % name) if not os.path.exists(path) else
                            ('%s.png is on disk but shots.json does not list it (left by an earlier run?)' % name))
            return 'src="%s"' % missing_picture(name)
        used.append(name)
        uri = embed(path, name)
        size[0] += len(uri)
        return 'src="%s"' % uri
    out = re.sub(r'src="shot(\?)?:([a-z0-9-]+)"', picture, out)

    def fact(m):
        k = m.group(1)
        if k not in facts:
            problems.append('sheet.html asks for {{%s}}, which build.py does not know' % k)
            return '[unknown: %s]' % k
        v = facts[k]
        if v is None:
            problems.append('not measured: {{%s}}' % k)
            return '[not measured: %s]' % html.escape(k)
        return v if k.startswith('rec:') else html.escape(str(v))
    out = re.sub(r'\{\{([A-Za-z0-9_:]+)\}\}', fact, out)
    if '{{' in out:
        problems.append('a {{...}} is left in the page')
    out = out.encode('ascii', 'xmlcharrefreplace').decode('ascii')
    if len(out) > LIMIT:
        problems.append('the page is %.1f MB, over the 15 MB limit' % (len(out) / 1048576))
    for p in problems:
        print(('WARN ' if allow else 'REFUSED ') + p)
    if problems and not allow:
        print('build: index.html NOT written (%d problem%s). A draft anyway: build.py --allow-missing' % (len(problems), '' if len(problems) == 1 else 's'))
        return 1
    with open(OUT, 'w', encoding='ascii', newline='\n') as f:
        f.write(out)
    print('build: %s - %d pictures, %.1f MB%s' % (OUT, len(used), len(out) / 1048576, ' (DRAFT: %d problems above)' % len(problems) if problems else ''))
    print('build: recommended - ' + ', '.join('%d%s' % (q, recs[q] or '?') for q in sorted(recs)))
    if Image is None:
        print('build: PIL is not installed, so the pictures went in as full-size PNGs')
    return 0


if __name__ == '__main__':
    sys.exit(main())
