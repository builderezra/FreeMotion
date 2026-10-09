#!/usr/bin/env python3
"""A SECONDS-FAST GATE for the Full-unchanged lock's plants (H59).

tools/full-unchanged.sh plants each change in tools/full-unchanged-plants.json into a copy of the tree and only then finds out
whether the plant's `old` anchor is there. On 9 Oct a whole 30-minute run was lost to "could not plant sanitiser": the anchor had
moved in the tree being checked. This reads the same file and checks, in well under a second and before any Chrome starts:

  - every plant with an `old` anchor: the anchor occurs EXACTLY ONCE in its `file` in the tree (the same count _fu_compare.py's
    `plant` makes), and `new` differs from `old`;
  - every plant has either `old` + `new` or `append`, never both and never neither, and its `file` exists;
  - plant names are unique.

Exit 0 when every plant can be planted, 1 naming each plant that cannot (and why), 2 on a usage or file error.

  python3 tools/_fu_plantcheck.py                    # the tree this file lives in
  python3 tools/_fu_plantcheck.py --root DIR --plants FILE
  python3 tools/_fu_plantcheck.py --selftest         # a fake plants file with a missing and a doubled anchor must both be caught
"""
import json, os, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PLANTS = os.path.join(HERE, 'full-unchanged-plants.json')


def check(root, plants_file):
    """Returns a list of (plant name, problem) — empty means every plant can be planted."""
    try:
        plants = json.load(open(plants_file, encoding='utf-8'))['plants']
    except (OSError, ValueError, KeyError) as e:
        raise SystemExit('❌ cannot read the plants from %s: %s' % (plants_file, e))
    bad, seen, cache = [], set(), {}
    for i, p in enumerate(plants):
        name = p.get('name', '#%d' % i)
        if name in seen:
            bad.append((name, 'the name is used twice'))
        seen.add(name)
        has_old, has_app = 'old' in p, 'append' in p
        if has_old == has_app:
            bad.append((name, 'needs exactly one of `old` (with `new`) or `append`'))
            continue
        path = os.path.join(root, p.get('file', ''))
        if not p.get('file') or not os.path.isfile(path):
            bad.append((name, 'its file %r is not in the tree' % p.get('file')))
            continue
        if has_app:
            continue
        if 'new' not in p or p['new'] == p['old']:
            bad.append((name, 'its `new` is missing or equal to `old`: the plant would change nothing'))
            continue
        if path not in cache:
            cache[path] = open(path, encoding='utf-8').read()
        n = cache[path].count(p['old'])
        if n != 1:
            bad.append((name, 'its anchor occurs %d times in %s (want exactly 1): %r' % (n, p['file'], p['old'][:100])))
    return bad


def selftest():
    with tempfile.TemporaryDirectory() as d:
        open(os.path.join(d, 'a.js'), 'w').write('one TWICE two TWICE three UNIQUE four\n')
        def run(plants):
            f = os.path.join(d, 'plants.json'); json.dump({'plants': plants}, open(f, 'w'))
            return dict(check(d, f))
        good = {'name': 'good', 'file': 'a.js', 'old': 'UNIQUE', 'new': 'unique'}
        cases = [
            ('a good anchor passes', [good], lambda r: not r),
            ('a MISSING anchor is caught by name', [good, {'name': 'gone', 'file': 'a.js', 'old': 'NOT THERE', 'new': 'x'}], lambda r: list(r) == ['gone'] and ' 0 times' in r['gone']),
            ('a DOUBLED anchor is caught by name', [good, {'name': 'dup', 'file': 'a.js', 'old': 'TWICE', 'new': 'x'}], lambda r: list(r) == ['dup'] and ' 2 times' in r['dup']),
            ('a missing file is caught', [{'name': 'nofile', 'file': 'b.js', 'old': 'a', 'new': 'b'}], lambda r: 'nofile' in r),
            ('old equal to new is caught', [{'name': 'same', 'file': 'a.js', 'old': 'UNIQUE', 'new': 'UNIQUE'}], lambda r: 'same' in r),
            ('both old and append is caught', [{'name': 'both', 'file': 'a.js', 'old': 'UNIQUE', 'new': 'x', 'append': 'y'}], lambda r: 'both' in r),
            ('an append plant needs no anchor', [{'name': 'app', 'file': 'a.js', 'append': '\nx'}], lambda r: not r),
        ]
        fails = [t for t, plants, ok in cases if not ok(run(plants))]
        for t, plants, ok in cases:
            print(('ok   ' if t not in fails else 'FAIL ') + t)
        return 1 if fails else 0


def main(argv):
    if '--selftest' in argv:
        return selftest()
    root, plants_file = os.path.dirname(HERE), DEFAULT_PLANTS
    for i, a in enumerate(argv):
        if a == '--root': root = argv[i + 1]
        if a == '--plants': plants_file = argv[i + 1]
    bad = check(root, plants_file)
    for name, why in bad:
        print('❌ plant %s: %s' % (name, why))
    if bad:
        print('%d plant(s) cannot be planted: fix %s before spending a run' % (len(bad), os.path.relpath(plants_file, root) if plants_file.startswith(root) else plants_file))
        return 1
    print('✅ every plant in %s can be planted (anchors found exactly once)' % os.path.basename(plants_file))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
