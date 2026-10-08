#!/usr/bin/env python3
import sys,subprocess,os,json
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/'; T=SP+'wt-s4/'
label,only,f,o,n=sys.argv[1:6]
s=open(T+f).read()
if s.count(o)!=1: print('REFUSED',label,s.count(o)); sys.exit(2)
try:
    open(T+f,'w').write(s.replace(o,n))
    out=subprocess.run([SP+'s4_run.sh','mut_'+label,'380',only],capture_output=True,text=True).stdout
    print('MUT',label); print(out)
finally: open(T+f,'w').write(s)
print('restored; clean:',subprocess.run(['git','-C',T,'status','--short','--','js'],capture_output=True,text=True).stdout=='')
