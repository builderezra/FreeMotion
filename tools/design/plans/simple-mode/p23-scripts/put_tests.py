import glob
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/'
p=SP+'wt-s1/tests/tests.js'
s=open(p).read()
end='\n})();\n'
assert s.endswith(end),repr(s[-20:])
marker='\n  /* ═══ SIMPLE MODE RELEASE 2.3: speed, sound and replacing'
if marker in s: s=s[:s.index(marker)]+end
body=''.join(open(f).read() for f in sorted(glob.glob(SP+'s1/tests_23*.js')))
s=s[:-len(end)]+'\n'+body.rstrip('\n')+'\n'+end[0:]
open(p,'w').write(s)
print('tests.js', s.count('simple P2.3 ·'), 'new tests')
