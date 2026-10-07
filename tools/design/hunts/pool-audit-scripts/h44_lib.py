import subprocess,json,time,os
CL=SP+'../h44clips/'
def rss(ud=None):
    ud=ud or w.ud; tot={'browser':0,'renderer':0,'other':0}
    for ln in subprocess.run(['ps','-eo','rss,args'],capture_output=True,text=True).stdout.splitlines():
        if ud in ln:
            r=int(ln.split()[0])/1024.0
            k='renderer' if '--type=renderer' in ln else ('other' if '--type=' in ln else 'browser')
            tot[k]+=r
    tot['total']=sum(tot.values()); return {k:round(v,1) for k,v in tot.items()}
def heap(gc=True):
    if gc: w.call('HeapProfiler.collectGarbage'); 
    r=w.call('Runtime.getHeapUsage')['result']; return round(r['usedSize']/1048576,1)
PF="""(function(){var k=Object.keys(FM.__audit).filter(function(x){return /:_prevFiles$/.test(x)})[0]; var m=FM.__audit[k](); var n=0,b=0,ids=0; m.forEach(function(inner){ids++; inner.forEach(function(f){n++; b+=f.size;});}); return JSON.stringify({layers:ids,files:n,mb:Math.round(b/1048576*10)/10});})()"""
def pf(): return w.ev(PF)
def snap(tag):
    s={'tag':tag,'heapMB':heap(),'rss':rss(),'prevFiles':pf()}
    print(json.dumps(s)); S.append(s); return s
S=[]
