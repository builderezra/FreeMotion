import re,json,sys
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/'
NAMES=sorted({n for _,n in json.load(open(SP+'testnames.json'))},key=len,reverse=True)
def split(line):
    for n in NAMES:
        if line==n or line.startswith(n+' — '): return n,line[len(n)+3:]
    a,_,b=line.partition(' — '); return a,b
def reds(prefix,tag):
    out={};sums=[]
    for i in range(4):
        try: t=open(SP+'%s_%s_s%d.txt'%(prefix,tag,i)).read()
        except FileNotFoundError: sums.append('missing s%d'%i); continue
        d=json.loads(t[t.index('{'):]); sums.append(d['summary'])
        for x in d['failures']:
            n,w=split(x[4:]); out[n]=w
    return out,sums
if __name__=='__main__':
    w=sys.argv[1]
    s,ss=reds('h51_pass','S'+w); b,bs=reds('h52_pass','N'+w)
    print('stack',len(s),ss); print('base ',len(b),bs)
    print('RED ON STACK ONLY:'); [print('  ',n[:110],'|',s[n][:90]) for n in sorted(set(s)-set(b))]
    print('RED ON BASE ONLY:'); [print('  ',n[:110],'|',b[n][:90]) for n in sorted(set(b)-set(s))]
