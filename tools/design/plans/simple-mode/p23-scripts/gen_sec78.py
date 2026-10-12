import json,re
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/'
def fails(path):
    t=open(path).read(); d=json.loads(t[t.index('{'):]); return d['summary'],d['failures']
names=json.load(open(SP+'s1/test_names.json')) if False else None
out=[]
out.append('## 7. How each test fails on the tree before 2.3 (the tip, `a51b5e1d`), at 1280 and at 380\n')
out.append('Run on a second copy of the tip carrying only the new `tests/tests.js`. **0 of 14 pass at 1280 and 0 of 14 at 380**, with the same message at both widths. Seven fail because a module is absent (they prove presence only — §8 is what proves they measure anything); seven fail by what the tip actually does:\n')
sm,f1=fails(SP+'s1b_run_1280.txt'); sm3,f3=fails(SP+'s1b_run_380.txt')
out.append('| test (first words) | before 2.3, at 1280 and at 380 |\n|---|---|')
for a in f1:
    nm=a[len('FAIL'):a.index(' — ')] if ' — ' in a else a
    why=a[a.rfind(' — ')+3:]
    short=nm.replace('simple P2.3 · ','')[:92]
    kind='module absent' if re.search(r'did not load|is not a function|is missing',why) else 'by behaviour'
    out.append('| %s… | %s: “%s” |'%(short.replace('|','/'),kind,why[:150].replace('|','/')))
open(SP+'s1/doc_sec7.md','w').write('\n'.join(out)+'\n')
print(sm,sm3)
