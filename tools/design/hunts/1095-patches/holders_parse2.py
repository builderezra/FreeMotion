import json,sys,collections
s=json.load(open('holders.heapsnapshot'))
meta=s['snapshot']['meta']; nf=meta['node_fields']; ef=meta['edge_fields']; nt=meta['node_types'][0]; et=meta['edge_types'][0]
N=len(nf); E=len(ef); nodes=s['nodes']; edges=s['edges']; strs=s['strings']
ni={f:i for i,f in enumerate(nf)}; ei={f:i for i,f in enumerate(ef)}
nn=len(nodes)//N
first=[0]*(nn+1); 
# edge ranges
cnt=0
for i in range(nn):
    first[i]=cnt; cnt+=nodes[i*N+ni['edge_count']]
first[nn]=cnt
def nname(i): return strs[nodes[i*N+ni['name']]]
def ntype(i): return nt[nodes[i*N+ni['type']]]
def ename(e):
    t=et[edges[e*E+ei['type']]]; v=edges[e*E+ei['name_or_index']]
    return t, (strs[v] if t in ('property','internal','shortcut','context','hidden','weak') else v)
# marked nodes
marked={}
for i in range(nn):
    for e in range(first[i],first[i+1]):
        t,n=ename(e)
        if t=='property' and n=='__bigmark': marked[i]=None
print('marked nodes',len(marked))
# BFS from root (node 0) over strong edges, parent pointers
par={0:None}; q=collections.deque([0])
while q:
    u=q.popleft()
    for e in range(first[u],first[u+1]):
        t,n=ename(e)
        if t=='weak': continue
        v=edges[e*E+ei['to_node']]//N
        if v not in par: par[v]=(u,t,n); q.append(v)
def path(v):
    out=[]
    while par.get(v):
        u,t,n=par[v]; out.append('%s[%s %s]'%(t,n,'')); v=u
    return out[::-1]
def desc(v): return '%s:%s'%(ntype(v),nname(v)[:60])
res=collections.Counter(); G={}
for m in marked:
    # find marker string: read __bigmark value
    mk='?'
    for e in range(first[m],first[m+1]):
        t,n=ename(e)
        if t=='property' and n=='__bigmark': mk=nname(edges[e*E+ei['to_node']]//N)
    chain=[]; v=m
    while par.get(v):
        u,t,n=par[v]; chain.append('%s(%s)'%(n,desc(u)[:45])); v=u
        if len(chain)>14: break
    key=' <- '.join(c for c in chain[:7])
    res[key]+=1
    G.setdefault((mk.split('#')[0], chain[0].split('(')[0] if chain else '?'),[]).append(' <- '.join(chain[:6]))

for (sz,holder),v in sorted(G.items(), key=lambda kv:-len(kv[1])):
    print(len(v),'x',sz,'held by',holder,'|',v[0][:330])
