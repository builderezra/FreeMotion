import subprocess,sys,re,collections,json
R='/home/user/FreeMotion'
def sh(*a): return subprocess.run(['git','-C',R]+list(a),capture_output=True,text=True,errors='replace').stdout
def hunks(a,b):
    out=sh('diff','-U0','--no-renames','--no-color',a,b)
    H=[]; f=None; cur=None
    for l in out.split('\n'):
        if l.startswith('diff --git'):
            f=l.split(' b/',1)[1]; cur=None
        elif l.startswith('@@'):
            cur={'file':f,'hdr':l,'rm':[],'ad':[]}; H.append(cur)
        elif cur is not None and l.startswith('-') and not l.startswith('---'): cur['rm'].append(l[1:])
        elif cur is not None and l.startswith('+') and not l.startswith('+++'): cur['ad'].append(l[1:])
        elif l.startswith('new file') or l.startswith('deleted file') or l.startswith('Binary'):
            H.append({'file':f,'hdr':l,'rm':[],'ad':[l]}) 
    return H
def sig(h): return (h['file'],tuple(h['rm']),tuple(h['ad']))
PAIRS=[('P1 fu-lock-r5 -> fu-lock-r6',('b46b47d3','f0e6e8dd'),('470ee20e','c6bac13b')),
 ('P2 980-s12 -> 980-s12-r2',('b46b47d3','31205790'),('c6bac13b','9b4197ce')),
 ('P3 980-phase1 -> 980-phase1-r2',('31205790','0f044c59'),('9b4197ce','2ef57028')),
 ('P4 980-p21-fix -> 980-p21-r2',('0f044c59','31679477'),('2ef57028','9c32adc3')),
 ('P5 980-p22-trayb2 -> 980-p22-r2 (3d420fdb)',('31679477','a7000c6f'),('9c32adc3','3d420fdb')),
 ('P6 last commit 4e433adb on top of 3d420fdb',None,('3d420fdb','4e433adb'))]
res={}
for name,old,new in PAIRS:
    N=hunks(*new); O=hunks(*old) if old else []
    co=collections.Counter(sig(h) for h in O); cn=collections.Counter(sig(h) for h in N)
    dropped=list((co-cn).elements()); extra=list((cn-co).elements())
    byfile_o=collections.Counter(h['file'] for h in O); byfile_n=collections.Counter(h['file'] for h in N)
    res[name]={'old_hunks':len(O),'new_hunks':len(N),'dropped':len(dropped),'extra':len(extra),'files_old':len(byfile_o),'files_new':len(byfile_n),
               'dropped_list':[(d[0],len(d[1]),len(d[2]),(d[2][0][:90] if d[2] else (d[1][0][:90] if d[1] else ''))) for d in dropped],
               'extra_list':[(d[0],len(d[1]),len(d[2]),(d[2][0][:90] if d[2] else (d[1][0][:90] if d[1] else ''))) for d in extra]}
    print('==',name,'| old hunks',len(O),'new hunks',len(N),'| in OLD not in NEW:',len(dropped),'| in NEW not in OLD:',len(extra),'| files old/new',len(byfile_o),len(byfile_n),flush=True)
json.dump(res,open('/tmp/h31/res.json','w'),indent=1)
