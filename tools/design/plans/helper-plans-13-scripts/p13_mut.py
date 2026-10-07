import subprocess,sys,json
f,old,new,only=sys.argv[1:5]
s=open(f).read(); assert s.count(old)==1,(old,s.count(old))
open(f,'w').write(s.replace(old,new))
try:
    r=subprocess.run(['python3','tests/_cdp.py','--port','8896','--timeout','80','--url','http://localhost:8896/tests/run.html?only='+only],capture_output=True,text=True,timeout=110)
    import re
    print(re.findall(r'"summary": "(.*?)"',r.stdout), [x[:230] for x in re.findall(r'"FAIL(.*?)",?\n',r.stdout)][:2])
finally:
    open(f,'w').write(s)
