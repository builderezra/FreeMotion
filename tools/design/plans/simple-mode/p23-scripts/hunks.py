"""Turn the difference between the tip (base) and the finished tree into Find / Replace hunks, each Find found exactly once.
usage as a module: hunks(base_text, new_text, file) -> [(find, replace)]"""
import difflib
def hunks(base, new, name='?', skip=None):
    B = base.split('\n'); N = new.split('\n')
    sm = difflib.SequenceMatcher(None, B, N, autojunk=False)
    ops = [o for o in sm.get_opcodes() if o[0] != 'equal']
    # merge opcodes closer than 3 equal lines into one block (keeps hunks readable)
    merged = []
    for o in ops:
        if merged and o[1] - merged[-1][2] <= 3:
            p = merged[-1]; merged[-1] = ('replace', p[1], o[2], p[3], o[4])
        else: merged.append(o)
    out = []; cur = base
    for tag, i1, i2, j1, j2 in merged:
        if skip and skip(i1, i2, j1, j2): continue
        k = 0
        while True:
            lo = max(0, i1 - k); hi = min(len(B), i2 + k)
            if i1 == i2:    # a pure insert: anchor on the lines AFTER the point (or before at the end of file)
                lo = i1; hi = min(len(B), i1 + max(1, k))
                if hi == lo: lo = max(0, i1 - max(1, k))
            find = '\n'.join(B[lo:hi])
            if find.strip() and base.count(find) == 1 and cur.count(find) == 1: break
            k += 1
            if k > 40: raise SystemExit('no unique anchor for %s lines %d-%d' % (name, i1, i2))
        # the replacement: the new lines of the block, with the same context around it
        if i1 == i2:
            if lo == i1: rep = '\n'.join(N[j1:j2] + B[lo:hi])
            else: rep = '\n'.join(B[lo:hi] + N[j1:j2])
        else:
            rep = '\n'.join(B[lo:i1] + N[j1:j2] + B[i2:hi])
        out.append((find, rep)); cur = cur.replace(find, rep)
    return out
def apply(text, hs, name='?'):
    for n, (f, r) in enumerate(hs):
        if text.count(f) != 1: raise SystemExit('%s hunk %d: Find found %d times' % (name, n + 1, text.count(f)))
        text = text.replace(f, r)
    return text
