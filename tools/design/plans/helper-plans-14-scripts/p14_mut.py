import subprocess,sys,re
f,old,new,only,port=sys.argv[1:6]
s=open(f).read(); assert s.count(old)==1,(old,s.count(old))
open(f,'w').write(s.replace(old,new))
try:
    r=subprocess.run(['python3','tests/_cdp.py','--port',port,'--timeout','80','--url','http://localhost:%s/tests/run.html?only=%s'%(port,only)],capture_output=True,text=True,timeout=110)
    print(re.findall(r'"summary": "(.*?)"',r.stdout), [x[:260] for x in re.findall(r'"FAIL(.*?)",?\n',r.stdout)][:2])
finally:
    open(f,'w').write(s)
