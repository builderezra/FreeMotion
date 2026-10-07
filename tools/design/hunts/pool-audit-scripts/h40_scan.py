import re,glob,json,sys,os
os.chdir('/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/wt-h40')
decl=re.compile(r'^(\s*)(const|let|var) ([A-Za-z_$][\w$]*)(?:\s*=\s*(new (?:Map|Set|WeakMap|WeakSet)\(|\[\]|\{\}|Object\.create\(null\)|new Array\())')
# multiple declarators like "const a = [], b = []"
files=sorted(glob.glob('js/*.js'))
src={f:open(f,encoding='utf8',errors='replace').read().split('\n') for f in files}
cands=[]
for f in files:
    for i,l in enumerate(src[f]):
        m=decl.match(l)
        if m and len(m.group(1))<=2:
            cands.append((f,i+1,m.group(3),m.group(4)))
        elif len(l)-len(l.lstrip())==2:
            for m2 in re.finditer(r'[,;]\s*([A-Za-z_$][\w$]*)\s*=\s*(new (?:Map|Set|WeakMap|WeakSet)\(|\[\]|\{\})',l):
                if re.match(r'\s*(const|let|var) ',l): cands.append((f,i+1,m2.group(1),m2.group(2)))
print(len(cands),'candidates',file=sys.stderr)
res=[]
for f,ln,name,kind in cands:
    pat=re.compile(r'(?<![\w$.])'+re.escape(name)+r'(?![\w$])')
    grow=[];trim=[]
    for ff in [f]:  # module scope: same file (IIFE) — but also check other files for FM exposure
        for i,l in enumerate(src[ff]):
            if i+1==ln: continue
            if not pat.search(l): continue
            s=l.strip()
            if re.search(re.escape(name)+r'\s*\.\s*(set|push|add|unshift)\s*\(|'+re.escape(name)+r'\s*\[[^\]]+\]\s*=[^=]',s): grow.append(i+1)
            if re.search(r'delete\s+'+re.escape(name)+r'\b|'+re.escape(name)+r'\s*\.\s*(delete|clear|shift|pop|splice)\s*\(|'+re.escape(name)+r'\.length\s*=\s*\d|^\s*'+re.escape(name)+r'\s*=\s*(\[\]|\{\}|new (Map|Set)|Object\.create)',s): trim.append(i+1)
    res.append(dict(file=f,line=ln,name=name,kind=kind,grow=grow,trim=trim))
json.dump(res,open('../h40_scan.json','w'))
for r in res:
    if r['grow'] and not r['trim']: print('NOTRIM',r['file'],r['line'],r['name'],r['kind'],'grow',r['grow'][:6])
