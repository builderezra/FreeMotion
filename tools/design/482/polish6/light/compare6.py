"""#482 polish batch 6 light — compare two captures of defaults6.js (the build before the change and this one).
Usage: python3 tools/design/482/polish6/light/compare6.py BEFORE.json AFTER.json   (exit 1 if any picture moved)
base-v17.21.json beside this file is the capture taken on v17.21 (28104a3e) before the first edit."""
import json, sys
a = json.load(open(sys.argv[1]))
b = json.load(open(sys.argv[2]))
fx = [k for k in a if k not in ('filters', 'inst', 'nfilters')]
moved = [k for k in fx if a[k] != b.get(k)] + ['filter ' + k for k in a['filters'] if a['filters'][k] != b['filters'].get(k)]
print('%d fixtures (clip, shape, text; export, half preview, 0.3 phone plate) and %d library filters compared' % (len(fx), len(a['filters'])))
print('MOVED: ' + (', '.join(moved) if moved else 'none - byte-identical'))
sys.exit(1 if moved else 0)
