#!/usr/bin/env python3
"""tools/design/sheets/sm3-sheet/build.py - sheet.html + the pictures + shots.json  ->  index.html, ONE self-contained page.

    python3 tools/design/sheets/sm3-sheet/build.py                  # refuses on anything missing (the normal way, via run-all.sh)
    python3 tools/design/sheets/sm3-sheet/build.py --allow-missing  # a draft: a red box for each missing picture, [not measured] words
    python3 tools/design/sheets/sm3-sheet/build.py --list-tall      # the pictures taller than 3x their width (run-all.sh splits them)

Every src="shot:NAME" in sheet.html becomes NAME.png as a JPEG data URI (PIL; a PNG data URI without it), shrunk to what a phone
shows; a figure marked data-optional="NAME" goes when NAME was not taken (a step that had nothing to show skips by design). Every
{{fact}} is filled from what capture.py MEASURED (shots.json) - the sheet's numbers, which option is "(recommended)" for 1, 2 and 3,
and why - so no sentence on the sheet claims what the pictures do not show. It refuses (exit 1) while capture recorded a failure, a
picture is missing, a fact was not measured, a {{...}} is left, the page is over 15 MB, or the template's script or style holds a
non-ASCII byte; the page it writes is ASCII, every other character an entity.
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

NAMES = {'clips': 'Clips', 'text': 'Text', 'captions': 'Captions', 'sound': 'Sound', 'overlay': 'Overlay', 'effects': 'Effects',
         'length': 'Length', 'audio': 'Audio', 'earlier': 'Move earlier', 'later': 'Move later', 'lift': 'Lift off', 'look': 'Look',
         'duplicateClip': 'Duplicate', 'crop': 'Crop', 'replace': 'Replace', 'more': 'More', 'delete': 'the bin',
         'editlines': 'Edit lines', 'capstyle': 'Style', 'findspeech': 'Find speech', 'capfollow': 'Follows the clips',
         'capstay': 'Stays with the sound'}
LETTERS = {1: 'ABC', 2: 'AB', 3: 'AB', 4: 'AB', 5: 'AB', 6: 'AB'}
BADGE = ' <span class="rec">(recommended)</span>'


def names(ids):
    return ', '.join(NAMES.get(i, i) for i in ids or [])


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


def bar_words(b):
    if not isinstance(b, dict) or b.get('fits') is None:
        return None
    if b['fits']:
        return 'the play bar still fits'
    why = []
    if b.get('out'):
        why.append('%d button%s past its edge' % (len(b['out']), '' if len(b['out']) == 1 else 's'))
    if b.get('overlaps'):
        why.append('%d overlapping' % b['overlaps'])
    if b.get('scrolls'):
        why.append('it scrolls')
    return 'the play bar no longer fits (' + ', '.join(why or ['measured']) + ')'


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

    # 1 - the PC tray: B needs all eleven inside the band at 1280 and 900, and the play bar no worse at 900
    nb = x('tray-b-1280', 'narrower')
    F['narrow1280'] = str(nb) if nb is not None else None
    out1280, cut1280 = x('tray-b-1280', 'outside'), x('tray-b-1280', 'cut')
    out900, bar_b, bar_a = x('tray-b-900', 'outside'), x('tray-b-900', 'bar'), x('tray-a-900', 'bar')
    F['bar_b900'] = bar_words(bar_b)
    if bar_b is not None and F['bar_b900'] is None:
        x.gaps.append('tray-b-900: the play bar was not on screen to measure')
    F['tools_b900'] = None if out900 is None else ('all 11 tools sit inside the band' if not out900 else
                                                  '%d tools run past the band (%s)' % (len(out900), names(out900)))
    rec1 = None
    if None not in (out1280, cut1280, out900) and isinstance(bar_b, dict) and isinstance(bar_a, dict) and bar_b.get('fits') is not None:
        bar_ok = bar_b['fits'] is True or bar_a.get('fits') is False
        problems = []
        if out1280:
            problems.append('%s run past the band at 1280' % names(out1280))
        if cut1280:
            problems.append('%s lose part of their words' % names(cut1280))
        if out900:
            problems.append('%s run past the band at 900' % names(out900))
        if not bar_ok:
            problems.append(F['bar_b900'] + ' at 900 wide')
        if not problems:
            rec1 = 'B'
            F['why1'] = ('It is the design\'s own answer: every tool stays on show, ' +
                         ('the play bar still fits at 900 wide' if bar_b['fits'] else 'the play bar is tight at 900 wide today and B does not make it worse') +
                         ', and the bottom row will need the room when Look for all and Ask arrive.')
        else:
            rec1 = 'C'
            F['why1'] = ('The wider band does not fit cleanly (' + '; '.join(problems) + '), so one Move tool keeps every tool on show in '
                         'today\'s band, at the cost of one extra tap to move a clip.')
    else:
        F['why1'] = None

    # 2 - where Look sits on a phone
    a_seen, a_hid, b_seen = x('tray-380', 'lookSeen'), x('tray-380', 'hidden'), x('tray-look3-380', 'lookSeen')
    rec2 = None
    if a_seen is not None and b_seen is not None:
        F['look_a'] = 'Look is on the first screen of the row' if a_seen else (
            'On a phone Look starts off the screen, one swipe in (off the screen at first: %s)' % names(a_hid))
        F['look_b'] = 'Look is on the first screen' if b_seen else 'Look is still off the first screen'
        rec2 = 'B' if (a_seen is False and b_seen is True) else 'A'
        F['why2'] = ('The hint promises speed or look, so Look should be on screen without a swipe, next to Audio, where speed lives.' if rec2 == 'B' else
                     ('Look is already on the first screen as built, so moving it changes nothing you can see.' if a_seen else
                      'Third still leaves Look off the first screen, so moving it buys nothing.'))
    else:
        F['look_a'] = F['look_b'] = F['why2'] = None

    # 3 - the caption tray's words on a phone
    a_scr, a_hid3, b_scr, b_hid3 = x('cap-tray-380', 'scrolls'), x('cap-tray-380', 'hidden'), x('cap-tray-short-380', 'scrolls'), x('cap-tray-short-380', 'hidden')
    rec3 = None
    if a_scr is not None and b_scr is not None:
        def off(hid):
            hid = hid or []
            return (': %s start%s off the screen' % (names(hid), 's' if len(hid) == 1 else '')) if hid else ''
        F['cap_a'] = ('The row scrolls' + off(a_hid3)) if a_scr else 'All six fit on one screen'
        F['cap_b'] = ('It still scrolls' + off(b_hid3)) if b_scr else 'All six fit on one screen'
        rec3 = 'B' if (a_scr and not b_scr) else 'A'
        F['why3'] = ('Every tool is on show with no swipe, and the long words stay where they help: screen readers and the PC.' if rec3 == 'B' else
                     ('All six already fit, so shorter words buy nothing.' if not a_scr else 'Short words still leave tools off the screen, so they buy nothing.'))
    else:
        F['cap_a'] = F['cap_b'] = F['why3'] = None

    # 4 - the effects picker
    tiles, cut = x('fx-picker-380', 'tiles'), x('fx-picker-380', 'cut')
    F['fx_tiles'] = str(tiles) if tiles is not None else None
    F['fx_cut'] = None if cut is None else ('no name is cut short' if not cut else '%d of the names are cut short at that size' % cut)

    # 5 - More's jump (#1171): the question only stands if More really moves
    jump, under = x('more-after-380', 'jump'), x('more-after-380', 'under')
    if jump is not None and jump < 5:
        x.gaps.append('more-after-380: More moved %s px, so question 5 ("More jumps") is not true of this build - rewrite it' % jump)
        jump = None
    F['more_jump'] = str(jump) if jump is not None else None
    F['more_under'] = under

    # 6 - the morph: how many boxes fly
    fp, fc = x('morph-simple-0-380', 'flights'), x('morph-simple-0-1280', 'flights')
    if isinstance(fp, dict) and isinstance(fc, dict):
        F['morph_n'] = '%d boxes fly on a phone, %d on a PC' % (sum(fp.values()), sum(fc.values()))
    else:
        F['morph_n'] = None

    # 7, 8 - the as-built words
    F['look_picked'] = None
    picked = x('look-filters-380', 'picked')
    if picked:
        F['look_picked'] = '%s is on Clip 2' % picked
    w380, w1280 = x('row-380', 'widths'), x('row-1280', 'widths')
    F['row380_w'] = str(round(sum(w380) / len(w380))) if w380 else None
    F['row1280_w'] = str(round(sum(w1280) / len(w1280))) if w1280 else None
    c380, c1280 = x('row-380', 'cut'), x('row-1280', 'cut')
    if c380 is None or c1280 is None:
        F['row_cut'] = None
    else:
        parts = (['%s on a phone' % names(c380)] if c380 else []) + (['%s on a PC' % names(c1280)] if c1280 else [])
        F['row_cut'] = 'no label is cut short' if not parts else 'cut short: ' + '; '.join(parts)
    F['cap_empty'] = x('cap-lines-380', 'empty') or None

    recs = {1: rec1, 2: rec2, 3: rec3, 4: 'A', 5: 'A', 6: 'A'}
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
