#!/usr/bin/env python3
"""After the merges: every js/css file that differs from origin/main must carry a ?v= strictly greater than main's, and no two files are compared (each file has its own number).
Prints a table of main / branch-max / final."""
import re,subprocess
def sh(*a): return subprocess.check_output(a,text=True)
def vers(txt):
    d={}
    for m in re.finditer(r'(?:src|href)="((?:js/|)[^"?]+\.(?:js|css))\?v=([0-9.]+)"',txt): d[m.group(1)]=m.group(2)
    return d
def key(v): return tuple(int(x) for x in v.split('.'))
def bump(v):
    p=v.split('.'); p[-1]=str(int(p[-1])+1); return '.'.join(p)
cur=open('index.html').read(); main=vers(sh('git','show','origin/main:index.html'))
changed=set(sh('git','diff','--name-only','origin/main','--','js','styles.css').split())
now=vers(cur); rows=[]
for f in sorted(changed):
    if f not in main: continue
    v=now.get(f); mv=main[f]
    fin=v if key(v)>key(mv) else bump(mv)
    if fin!=v: cur=re.sub(r'((?:src|href)="'+re.escape(f)+r'\?v=)'+re.escape(v)+'"',r'\g<1>'+fin+'"',cur)
    rows.append((f,mv,v,fin))
open('index.html','w').write(cur)
for r in rows: print('%-28s main %-7s merged %-7s final %s'%r)
