import json,sys,collections
W=sys.argv[1]; path=sys.argv[2] if len(sys.argv)>2 else 'h41c_%s.log'%W
rows=[]
for l in open(path):
    if l.startswith('DIALOG'): continue
    try: rows.append(json.loads(l))
    except Exception: pass
rows.sort(key=lambda r:r[0])
F=['time','playing','pps','scene','projDur','proj','fps','layers','sel','tlstale','ui','win','pv','iso','body']
def get(s,f):
    if f=='tlstale':
        d,p=s.get('tlDur'),s.get('projDur')
        return None if d is None or p is None else (round(d-p,2))
    return s.get(f)
ev=collections.defaultdict(list)
for k,(i,name,ok,b,a) in enumerate(rows):
    for f in F:
        vb,va=get(b,f),get(a,f)
        if vb!=va:
            # how many later tests inherit va: consecutive tests whose before equals va
            n=0
            for (i2,n2,o2,b2,a2) in rows[k+1:]:
                if get(b2,f)==va: n+=1
                else: break
            ev[f].append((n,i,name,vb,va))
print('tests logged',len(rows))
for f in F:
    L=sorted(ev[f],reverse=True)
    print('\n== %s: %d tests change it'%(f,len(L)))
    for n,i,name,vb,va in L[:12]: print('  inherits=%-4d #%-5d %-80s %r -> %r'%(n,i,name[:80],vb,va))
json.dump({f:[list(x) for x in ev[f]] for f in F},open('h41_ev_%s.json'%W,'w'))
