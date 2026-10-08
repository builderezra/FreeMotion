#!/usr/bin/env python3
"""p16_mut.py <label> <only-substring (url-encoded)> <file> <old> <new> [<file2> <old2> <new2> ...]
One string change (or several), one test, restore. Refuses unless every old string occurs exactly once."""
import sys,subprocess,os
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/'
T=SP+'wt-p16/'
label,only=sys.argv[1],sys.argv[2]; a=sys.argv[3:]
edits=[(a[i],a[i+1],a[i+2]) for i in range(0,len(a),3)]
bak={}
try:
    for f,o,n in edits:
        p=T+f
        if f not in bak: bak[f]=open(p).read()
        s=open(p).read(); c=s.count(o)
        if c!=1: print('REFUSED: %r occurs %d times in %s'%(o[:60],c,f)); sys.exit(2)
        open(p,'w').write(s.replace(o,n))
    out=subprocess.run([SP+'p16_run.sh','p','1280','mut_'+label,only],capture_output=True,text=True).stdout
    print('MUT',label,'\n'+out)
finally:
    for f,s in bak.items(): open(T+f,'w').write(s)
    print('restored')
