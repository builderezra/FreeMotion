#!/usr/bin/env python3
"""For every branch that changes a js file or styles.css: the ?v= it started from, the one it sets, and the one main holds NOW.
COLLIDES = it sets the number main already holds (a phone that cached main's file would never fetch the branch's)."""
import subprocess,re
def sh(*a):
    try: return subprocess.check_output(a,text=True,stderr=subprocess.DEVNULL)
    except Exception: return ''
main_idx=sh('git','show','origin/main:index.html')
def bust(idx,name):
    m=re.search(r'(?:js/)?'+re.escape(name)+r'\?v=([0-9.]+)',idx); return m.group(1) if m else None
def key(v): return tuple(int(x) for x in v.split('.')) if v else ()
branches=['hunt/perf-freeze','hunt/audit-fx-2','hunt/audit-filmstrip','hunt/perf-glow','hunt/param-aliases','hunt/audit-fx-3','hunt/audit-collab-media','hunt/audit-storage','hunt/audit-timeline','hunt/audit-inspector','hunt/audit-scene','hunt/audit-collab','hunt/audit-exporter','hunt/audit-mobile']
for b in branches:
    idx=sh('git','show','origin/'+b+':index.html')
    if not idx: continue
    base=sh('git','merge-base','origin/main','origin/'+b).strip()
    for f in [f for f in sh('git','diff','--name-only','origin/main...origin/'+b,'--','js','styles.css').split() if f]:
        n=f.split('/')[-1]; bv=bust(idx,n); mv=bust(main_idx,n); ov=bust(sh('git','show',base+':index.html'),n)
        st='ok' if key(bv)>key(mv) else 'COLLIDES' if bv==mv else 'BEHIND'
        if bv==ov: st='NOT BUMPED'
        print('%-26s %-18s base %-6s branch %-6s main %-6s %s'%(b,n,ov,bv,mv,st))
