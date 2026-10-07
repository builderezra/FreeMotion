import json,re,os
R='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/wt-h40i/'
cands=json.load(open('/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/h40_scan.json'))
by={}
for c in cands: by.setdefault(c['file'],[]).append(c)
skipped=[]
for f,cs in by.items():
    L=open(R+f,encoding='utf8').read().split('\n')
    # insert from bottom so line numbers hold
    for c in sorted(cs,key=lambda c:-c['line']):
        i=c['line']-1; line=L[i]
        # declaration must end on this line: strip trailing comment crudely
        code=re.sub(r'\s//.*$','',line).rstrip()
        if not code.endswith(';') :
            skipped.append((f,c['line'],c['name'])); continue
        ins='  try{window.FM=window.FM||{};FM.__audit=FM.__audit||{};FM.__audit[%s]=function(){return %s;};}catch(__e){}'%(json.dumps('%s:%d:%s'%(f,c['line'],c['name'])),c['name'])
        L.insert(i+1,ins)
    open(R+f,'w',encoding='utf8').write('\n'.join(L))
print('skipped',skipped)
