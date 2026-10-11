#!/usr/bin/env python3
"""Every **bold** name in a tutorial must still exist in the app's source (TUT1, 11 Oct).

A tutorial tells a person to tap **Export MP4**. If a release renames that button, the tutorial is silently wrong and
nothing notices. This reads each tutorials/*.md, takes every **bold** name (a list like **Length, Audio, Move** counts
as several), and requires each to appear as text in index.html or js/*.js of the tree it is checked against.

    python3 tools/check_tutorials.py                                  # tutorials/ against this tree
    python3 tools/check_tutorials.py tutorials/simple --src /path/to/newest-simple-tree   # the Simple set against a tree that has Simple

A name that is not a literal label is listed in the allow file next to the tutorials (tutorials/.bold-allow.txt, one
name per line, `# reason` after it), so every exception is visible and has a reason. Exit 0 = all found, 1 = something
missing (printed), 2 = bad arguments.
"""
import argparse, glob, os, re, sys

def names_in(md):
    body = re.sub(r'<!--.*?-->', '', md, flags=re.S).split('### Verification')[0].split('## Verification')[0]
    out = []
    for m in re.finditer(r'\*\*([^*]+)\*\*', body):
        raw = m.group(1).strip()
        parts = [p.strip() for p in raw.split(',')] if ',' in raw and len(raw) < 140 else [raw]
        for p in parts:
            if p and p not in out:
                out.append(p)
    return out

def variants(n):
    n = n.strip()
    s = {n.lower(), n.lower().replace('...', '…'), n.lower().replace('…', '...'), n.lower().replace('’', "'"), n.lower().replace("'", '’')}
    return {c.rstrip('.…:') for c in s if c}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dir', nargs='?', default='tutorials')
    ap.add_argument('--src', default='.')
    ap.add_argument('--allow', default=None)
    a = ap.parse_args()
    if not os.path.isdir(a.dir) or not os.path.exists(os.path.join(a.src, 'index.html')):
        print('check_tutorials: need a tutorials folder and a source tree with index.html (got %s, %s)' % (a.dir, a.src)); return 2
    text = ''
    for f in [os.path.join(a.src, 'index.html')] + sorted(glob.glob(os.path.join(a.src, 'js', '*.js'))):
        text += open(f, errors='ignore').read().lower() + '\n'
    allow_path = a.allow or os.path.join(a.dir, '.bold-allow.txt')
    allow = set()
    if os.path.exists(allow_path):
        for line in open(allow_path):
            line = line.split('#')[0].strip()
            if line: allow.add(line.lower())
    bad = 0; total = 0
    for p in sorted(x for x in glob.glob(os.path.join(a.dir, '*.md')) if not os.path.basename(x).lower().startswith('walk')):
        for n in names_in(open(p).read()):
            total += 1
            if n.lower() in allow: continue
            if not any(v in text for v in variants(n)):
                bad += 1; print('%s: **%s** is not in the source' % (os.path.basename(p), n))
    print('check_tutorials: %d bold names, %d not found (%s against %s)' % (total, bad, a.dir, a.src))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main())
