import re,sys
def ver(l):
    m=re.search(r'\?v=([0-9.]+)',l)
    return tuple(int(x) for x in m.group(1).split('.')) if m else ()
def src(l):
    m=re.search(r'(?:src|href)="([^"?]+)',l)
    return m.group(1) if m else None
def pick(ours,theirs):
    out=[];seen={}
    for l in ours+theirs:
        k=src(l) or ('L:'+l)
        if k in seen:
            i=seen[k]
            if ver(l)>ver(out[i]): out[i]=l
        else:
            seen[k]=len(out); out.append(l)
    return out
def resolve(path, mode):
    lines=open(path).read().split('\n'); out=[]; i=0
    while i<len(lines):
        if lines[i].startswith('<<<<<<<'):
            ours=[];theirs=[];i+=1
            while not lines[i].startswith('======='): ours.append(lines[i]); i+=1
            i+=1
            while not lines[i].startswith('>>>>>>>'): theirs.append(lines[i]); i+=1
            i+=1
            out+= (ours+theirs) if mode=='both' else pick(ours,theirs)
        else: out.append(lines[i]); i+=1
    open(path,'w').write('\n'.join(out))
resolve(sys.argv[1], sys.argv[2])
