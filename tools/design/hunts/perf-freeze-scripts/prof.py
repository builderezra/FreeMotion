import sys,time,json
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import d4shot as S
port=int(sys.argv[1]); JS=sys.argv[2]
p,call=S.session(9970+port%10)
try:
    call('Page.enable'); call('Runtime.enable'); call('Profiler.enable')
    call('Emulation.setDeviceMetricsOverride',{'width':380,'height':760,'deviceScaleFactor':3,'mobile':False})
    call('Page.navigate',{'url':'http://localhost:%d/index.html?fmtest=1'%port}); time.sleep(4)
    call('Profiler.setSamplingInterval',{'interval':500})
    call('Profiler.start')
    r=S.ev(call,JS)
    prof=call('Profiler.stop')
    pr=prof['result']['profile'] if 'result' in prof else prof['profile']
    nodes={n['id']:n for n in pr['nodes']}
    self={}
    dt=pr['timeDeltas']; samples=pr['samples']
    for sid,d in zip(samples,dt):
        n=nodes[sid]; cf=n['callFrame']; k=(cf['functionName'] or '(anon)',cf['url'].split('/')[-1].split('?')[0],cf['lineNumber']+1)
        self[k]=self.get(k,0)+d
    parent={}
    for n in pr['nodes']:
        for c in n.get('children',[]): parent[c]=n['id']
    chains={}
    for sid,d in zip(samples,dt):
        n=nodes[sid]
        if n['callFrame']['functionName']!='drawImage': continue
        ch=[]; cur=sid
        while cur in parent and len(ch)<7:
            cur=parent[cur]; cf=nodes[cur]['callFrame']; ch.append((cf['functionName'] or '(anon)')+':'+cf['url'].split('/')[-1].split('?')[0]+':'+str(cf['lineNumber']+1))
        key=' < '.join(ch); chains[key]=chains.get(key,0)+d
    print('--- drawImage callers')
    for k,v in sorted(chains.items(),key=lambda x:-x[1])[:5]: print('%6.0f ms %s'%(v/1000,k))
    tot=sum(self.values())
    print(r)
    for k,v in sorted(self.items(),key=lambda x:-x[1])[:14]: print('%6.0f ms %4.1f%%  %s %s:%d'%(v/1000,100*v/tot,k[0],k[1],k[2]))
finally: p.kill()
