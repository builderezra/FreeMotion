import re,sys
p='index.html'; s=open(p).read()
pat=re.compile(r'<<<<<<< [^\n]*\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n',re.S)
s=pat.sub(lambda m:m.group(1),s); open(p,'w').write(s)
