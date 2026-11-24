#!/usr/bin/env python3
"""tools/names-gate.py — NO FILE IN A RELEASE MAY NAME ANOTHER EDITING APP (#1264).

His words, 24 Nov 2026: "Just make sure there's absolutely zero trace anywhere in any of our files, any of our GitHubs,
anything that it mentions anything about [another app] or any editing software at all. Nowhere to be found. All traces of
it gone without wrecking anything."

    python3 tools/names-gate.py check [--msg <commit message file>]   # what ship.sh runs: self-test, then every file
    python3 tools/names-gate.py list  [paths…]                        # the same findings, exit 0 (for a clean-up)
    python3 tools/names-gate.py allow <file>:<line>                   # the two initials on this line are not a name: remember it
    python3 tools/names-gate.py --self-test

WHAT IT READS: every text file a commit would hold — tracked files and new files git does not ignore — as it stands in the
working tree, the path itself included, and the commit message when --msg gives one.

THE NAMES ARE NOT IN THIS FILE. A list of the names here would be the very thing the gate forbids, and anyone searching
the repo would find it. Each name is kept as a FINGERPRINT: sixteen hex digits of a salted SHA-256 of its words. The gate
takes every word, pair and triple of words in a file, fingerprints the ones that could begin a name, and compares. So a
name is found however it is spelt in capitals, across a hyphen or an underscore, and across the line break of a wrapped
comment; and nothing here can be read back into a name. Some names are also ordinary words ("the final cut", "after
effects are applied"): those are matched only as a proper name is written, with its capitals.

TWO-LETTER INITIALS (the pair of capitals below) are different: no fingerprint can tell a name from a variable called the
same, a radio band or a clock time. A line that carries them as a word of their own is refused unless that exact line is
in tools/.names-allow (one fingerprint a line, added with `allow`), and a clock time, a radio band and long runs of
base64 are never counted.

WHAT IT DOES NOT COVER: the names inside OLD commits (the history is a separate job that needs his own yes), and
CLAUDE.md, which only he may have reworded: it is listed below as the one exception, and every run says so until it goes.

HIS OWN NAME, THE SAME WAY (PRIVATE, below): the repo is public and its commits carry a handle, not his name, but notes copied
from his computer carried its user name inside their paths. A file that holds it is refused like any other finding.

TO ADD A NAME (it never touches this file in clear):  python3 tools/names-gate.py print "Some Name" [--exact]
prints its entry; paste it into PRINTS (or PRIVATE) and move the count below it. --exact is for a name that is also a plain
word in lower case. `list` takes files or folders.
"""
import hashlib, itertools, os, re, subprocess, sys

SALT = b'fm-1264|'
EXEMPT = {'CLAUDE.md': 'only he may have this file reworded: asked 24 Nov (#1264)'}
ALLOW_FILE = os.path.join('tools', '.names-allow')
BINARY = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp3', '.m4a', '.wav', '.ogg', '.mp4', '.mov', '.webm', '.woff', '.woff2',
          '.ttf', '.otf', '.ico', '.zip', '.gz', '.pdf', '.psd', '.bin', '.wasm')

# (words in the name, which of them is looked up first, that word's fingerprint, the whole name's fingerprint, exact case?)
# BEGIN PRINTS (written by the list's keeper, outside the repo; `print` above makes one entry)
PRINTS = [
    (1, 0, '09254cee017b6231', '09254cee017b6231', False),
    (1, 0, '11b51924a3f2faed', '11b51924a3f2faed', True),
    (1, 0, '11ca34fa75958b82', '11ca34fa75958b82', False),
    (1, 0, '1313a4c777deb379', '1313a4c777deb379', False),
    (1, 0, '13ca89079c7e1500', '13ca89079c7e1500', False),
    (1, 0, '1aaecc35ee6a2de4', '1aaecc35ee6a2de4', False),
    (1, 0, '1d6aebc886fbd6f9', '1d6aebc886fbd6f9', False),
    (1, 0, '260f4ac7992fef3e', '260f4ac7992fef3e', True),
    (1, 0, '2688d0b954ab19ad', '2688d0b954ab19ad', True),
    (1, 0, '33486d8f89c55b4a', '33486d8f89c55b4a', True),
    (1, 0, '35b7878f41a27f54', '35b7878f41a27f54', False),
    (1, 0, '35fa8e6c442283e9', '35fa8e6c442283e9', False),
    (1, 0, '3a08f04dd048acb1', '3a08f04dd048acb1', False),
    (1, 0, '484bbc1ba25ec389', '484bbc1ba25ec389', False),
    (1, 0, '4a5834d4293712f1', '4a5834d4293712f1', False),
    (1, 0, '54a0968b92942754', '54a0968b92942754', False),
    (1, 0, '5845bf79da174aa7', '5845bf79da174aa7', True),
    (1, 0, '585ad54d0cd42d50', '585ad54d0cd42d50', True),
    (1, 0, '61ad8e7ef6589ff1', '61ad8e7ef6589ff1', False),
    (1, 0, '6d3420449dc28391', '6d3420449dc28391', True),
    (1, 0, '6f441c9afa80cace', '6f441c9afa80cace', False),
    (1, 0, '6f4d45242877b41e', '6f4d45242877b41e', False),
    (1, 0, '700a72e027ab96dd', '700a72e027ab96dd', False),
    (1, 0, '7b40c3539cc15e0f', '7b40c3539cc15e0f', False),
    (1, 0, '7cd0734289347029', '7cd0734289347029', False),
    (1, 0, '7d17032e8ee7249e', '7d17032e8ee7249e', False),
    (1, 0, '7d8a18b32e44a490', '7d8a18b32e44a490', False),
    (1, 0, '802f038d988c19e3', '802f038d988c19e3', False),
    (1, 0, '81015a8c9626d3f6', '81015a8c9626d3f6', False),
    (1, 0, '85c730af3a504800', '85c730af3a504800', False),
    (1, 0, '882d79b0b59be567', '882d79b0b59be567', False),
    (1, 0, '889fe03a008782d7', '889fe03a008782d7', False),
    (1, 0, '8a1c50c299c2d579', '8a1c50c299c2d579', False),
    (1, 0, '8e912a536486cadc', '8e912a536486cadc', False),
    (1, 0, '966686355a4493e2', '966686355a4493e2', False),
    (1, 0, '97ac526181ab0a95', '97ac526181ab0a95', False),
    (1, 0, '99170b67e6975a9a', '99170b67e6975a9a', False),
    (1, 0, '99249977f481cd80', '99249977f481cd80', False),
    (1, 0, '9ba70fbc1257c917', '9ba70fbc1257c917', False),
    (1, 0, '9f20675c055e0f4c', '9f20675c055e0f4c', False),
    (1, 0, 'a3500e767bee7ec4', 'a3500e767bee7ec4', False),
    (1, 0, 'a56daeae56970189', 'a56daeae56970189', True),
    (1, 0, 'b38e986b57a06411', 'b38e986b57a06411', False),
    (1, 0, 'b5eb1b40fa22061f', 'b5eb1b40fa22061f', False),
    (1, 0, 'b72b015c00da0148', 'b72b015c00da0148', False),
    (1, 0, 'b7a1424503c4df61', 'b7a1424503c4df61', False),
    (1, 0, 'c3dbff9840529056', 'c3dbff9840529056', False),
    (1, 0, 'd1745e22fe1f9b77', 'd1745e22fe1f9b77', False),
    (1, 0, 'd2305d616b0e0eaa', 'd2305d616b0e0eaa', False),
    (1, 0, 'd47012f420f8fa2e', 'd47012f420f8fa2e', False),
    (1, 0, 'd803c397a5a77553', 'd803c397a5a77553', False),
    (1, 0, 'dbb2b114c109c41d', 'dbb2b114c109c41d', False),
    (1, 0, 'dc0c236477be4f9f', 'dc0c236477be4f9f', False),
    (1, 0, 'e3ad16bcf48fde85', 'e3ad16bcf48fde85', False),
    (1, 0, 'ea0b01a7c64d1208', 'ea0b01a7c64d1208', False),
    (1, 0, 'ed58eaa50e122d33', 'ed58eaa50e122d33', True),
    (1, 0, 'edd657e2b1fd5b16', 'edd657e2b1fd5b16', False),
    (1, 0, 'effae9fc54100019', 'effae9fc54100019', False),
    (1, 0, 'f052d11dda9fada4', 'f052d11dda9fada4', True),
    (1, 0, 'f28b5ab9a9eb87fa', 'f28b5ab9a9eb87fa', False),
    (1, 0, 'f4cdd1f2b00624c8', 'f4cdd1f2b00624c8', False),
    (1, 0, 'f7e8fc530225a694', 'f7e8fc530225a694', True),
    (1, 0, 'fa8875f8bc00105e', 'fa8875f8bc00105e', False),
    (1, 0, 'ff225f505b639a77', 'ff225f505b639a77', False),
    (2, 0, '0767cabb4ec9e0da', '3e4e2cb4f0ae8529', False),
    (2, 0, '0e99ccb897184116', '4b35cdfa7f104297', False),
    (2, 0, '0e99ccb897184116', 'e227fce07c94ae66', False),
    (2, 0, '167a732a454a76f5', '20331e5ff20f39a3', True),
    (2, 0, '6035072bde32a4e5', '6b250514bb9ec36c', True),
    (2, 0, '64092584d5db091f', '1b39ac8a582edb57', False),
    (2, 0, '6f137488fbd9f208', '7ce27c5edc223e98', True),
    (2, 0, '72bb9a50e11ad6ed', '40ea1143237b22db', False),
    (2, 0, '8270b1d9690ada4f', '627fdad0d14a4679', False),
    (2, 0, 'a7eb208f2b143b7b', 'ce7dba52604d0342', True),
    (2, 0, 'bc317e40fefa60c8', 'a6f2c28c153268c1', True),
    (2, 0, 'c76abd22a99a321c', '7a13015e51da6d7d', True),
    (2, 0, 'd4717de41f314c68', '6654bc828ec874b9', True),
    (2, 0, 'da970dd15cdac805', '2b3a585c686b0243', False),
    (2, 0, 'f324cb67bf76a4e1', 'f1dd19cc3458c6df', True),
    (2, 0, 'fdb631f2b6eca948', 'afc77b855b3505e3', False),
    (2, 1, '0c783a39fde5751e', '60dcabaca6230336', True),
    (2, 1, '403377966e937104', '68b0b5c4eb4d3e6a', True),
    (2, 1, '454138e0cb8c28ab', '456c132f5c08a06f', False),
    (2, 1, '48b336c4554ec55d', 'fba0347b2ef77bdb', True),
    (2, 1, '51e2ab3a413ecc8e', '0c7c228b780a233e', False),
    (2, 1, '56d0f54cd22060f1', '04255ff660f04b71', True),
    (2, 1, '72bb9a50e11ad6ed', '876fbccbffe518a4', False),
    (2, 1, '7968ef1a49ac09f0', '05d69dd6fcc9b5e2', True),
    (2, 1, 'a498b713e668122c', '6e87a1899d55a522', False),
    (2, 1, 'a651fa676bb30f54', '9dd656c4496e67b4', True),
    (2, 1, 'c490f81eb61fc86a', '4c8a4aaaa40f1b10', False),
    (2, 1, 'd2275168298a4f1f', '9e39335ab8b2b463', False),
    (2, 1, 'd880a97daab326f3', '954270ddacaf0e72', True),
    (2, 1, 'e2bb197efc64c825', '1b16a24877286c22', False),
    (2, 1, 'ed2e3485a87f6086', '8a5ad64bf51d505f', True),
    (2, 1, 'f9421e74185d7c48', 'aa109ffaaccbba4e', True),
    (2, 1, 'fae04d1fec1edf21', 'b5935b95a5fd02bf', True),
    (3, 0, 'bc317e40fefa60c8', '5cb086e742722500', True),
    (3, 0, 'ea4f248c81637e51', 'd89e8635f9488fbd', False),
    (3, 1, 'ee29fcb693ae2ca6', '61b3c169fc9b7791', False),
    (3, 1, 'ee29fcb693ae2ca6', '7b30d850f0e756d9', False),
    (3, 2, 'de56a650abba37c4', '70a4344a50bf734d', True),
]
# END PRINTS
PRINT_COUNT = 102   # how many entries PRINTS must hold: an entry that silently went missing is a hole (the self-test reads it)
# HIS OWN NAME IS KEPT OUT THE SAME WAY (found beside #1264, 24 Nov): old audit files held paths with his computer's user name,
# which is his full name, in a public repo whose commits carry a handle and no name. Same fingerprints, its own message.
# BEGIN PRIVATE
PRIVATE = [
    (1, 0, '0f654f7085069563', '0f654f7085069563', False),
    (1, 0, 'c6886f56a137d89f', 'c6886f56a137d89f', False),
    (2, 1, '3fa91f00f4899226', 'bc437b236e36e5f9', False),
]
# END PRIVATE
PRIVATE_COUNT = 3

WORD = re.compile(r'[A-Za-z0-9]+')
SPLIT = re.compile(r'([A-Za-z0-9]+)')
SOFT = re.compile(r'^[\s*/#>|_\-]{1,14}$')       # what may stand between the words of one name: a space, a hyphen, a wrapped comment's edge
BASE64 = re.compile(r'[A-Za-z0-9+/=]{120,}')    # an embedded picture is not prose
# the two initials, as a word of their own; a hyphen after them still counts ("XX-style"); an identifier part does not
INITIALS = re.compile(r'(?<![A-Za-z0-9_$.#])A[ME](?![A-Za-z0-9_])')
_I1, _I2 = 'A' + 'M', 'A' + 'E'                  # the same two pairs, for a quick look before the pattern runs (never written here as a word)
# …and what is never a name: a clock time (an hour from 1 to 12, so "93 XX names" is not one), XX/PM, "I XX", a radio band
NOT_INITIALS = re.compile(r'(?<![\d.])(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s{0,2}A[M]\b|\bA[M]\s*(?:/|or)\s*PM\b|\bI A[M]\b|\bA[M] radio\b|\bA[M] band\b')


def fp(text, exact=False):
    return hashlib.sha256(SALT + (b'cs:' if exact else b'') + (text if exact else text.lower()).encode('utf-8')).hexdigest()[:16]


def _index(prints):
    lead = {}
    for n, at, lead_fp, full_fp, exact in prints:
        lead.setdefault((lead_fp, exact), []).append((n, at, full_fp))
    return lead


def scan_text(text, prints=None, allow=frozenset(), private=None):
    """Every finding in one text: [(line number, kind, the words as written)]. kind is 'name' (another editing app),
    'private' (his own name) or 'initials'."""
    groups = [(_index(PRINTS if prints is None else prints), 'name'), (_index(PRIVATE if private is None else private), 'private')]
    out = []
    if 'base64' in text or len(text) > 200000:      # an embedded picture is blanked, length kept, so the line numbers stand
        text = BASE64.sub(lambda m: ' ' * len(m.group(0)), text)
    if any(lead for lead, _ in groups):
        parts = SPLIT.split(text)                 # separator, word, separator, word, … (always odd, starts with a separator)
        words = parts[1::2]
        distinct = set(words)
        offs = None
        for lead, kind in groups:
            if not lead or not words: continue
            cache = {}
            def hits(w):
                r = cache.get(w)
                if r is None:
                    r = []
                    a, b = lead.get((fp(w), False)), lead.get((fp(w, True), True))
                    if a: r.append((False, a))
                    if b: r.append((True, b))
                    cache[w] = r
                return r
            hot = set(w for w in distinct if hits(w))
            if not hot: continue
            for i, w in enumerate(words):
                if w not in hot: continue
                for exact, entries in cache[w]:
                    for n, at, full_fp in entries:
                        j = i - at
                        if j < 0 or j + n > len(words): continue
                        if any(not SOFT.match(parts[2 * k + 2]) for k in range(j, j + n - 1)): continue
                        gram = ' '.join(words[j:j + n])
                        if fp(gram, exact) != full_fp: continue
                        if offs is None: offs = list(itertools.accumulate(len(p) for p in parts))
                        start = offs[2 * j]                                   # offs[k] = end of parts[k]; word j is parts[2j+1]
                        out.append((text.count('\n', 0, start) + 1, kind, ''.join(parts[2 * j + 1:2 * (j + n)])))
    if _I1 in text or _I2 in text:
        for ln, line in enumerate(text.split('\n'), 1):
            if _I1 not in line and _I2 not in line: continue
            bare = NOT_INITIALS.sub(' ', BASE64.sub(' ', line))
            m = INITIALS.search(bare)
            if m and line_fp(line) not in allow: out.append((ln, 'initials', m.group(0)))
    return sorted(set(out))


def line_fp(line):
    return hashlib.sha256(SALT + b'line:' + line.strip().encode('utf-8')).hexdigest()[:16]


# ─── PICTURES AND OTHER BINARY FILES ────────────────────────────────────────────────────────────────────────────────────
# A picture can name a program where nobody looks: a phone's screenshot carries a metadata packet whose labels are named
# after the program family that defined the format, and a picture that passed through an editor says so in a block of its
# own. Six tracked pictures did (24 Nov). So a binary file's bytes are read for a name as well (only names of six letters
# or more: four random bytes spell a short word often enough, in 140 MB, to cry wolf), a picture's metadata blocks are
# looked at by their KIND, and `strip` takes those blocks out without touching a pixel.
BIN_WORDS = re.compile(rb'[A-Za-z]{6,}(?:[ _-][A-Za-z0-9]{2,}){0,2}')


def picture_blocks(raw):
    """A picture's metadata blocks that say what made or labelled it: [(kind, start, end)], whole chunks (PNG) or segments (JPEG),
    so cutting those ranges out leaves a valid file with the same pixels. Text chunks and the packet of labels in a PNG; the
    label packet, the editor's own block and comments in a JPEG. The camera's block (orientation lives there) is left alone."""
    out = []
    if raw[:8] == b'\x89PNG\r\n\x1a\n':
        i = 8
        while i + 12 <= len(raw):
            n = int.from_bytes(raw[i:i + 4], 'big'); typ = raw[i + 4:i + 8]; end = i + 12 + n
            if typ in (b'tEXt', b'zTXt', b'iTXt'): out.append((typ.decode('latin-1'), i, end))
            if typ == b'IEND' or end > len(raw): break
            i = end
    elif raw[:2] == b'\xff\xd8':
        i = 2
        while i + 4 <= len(raw) and raw[i] == 0xFF:
            m = raw[i + 1]
            if m in (0xDA, 0xD9): break                              # the picture itself starts: no blocks after this
            if 0xD0 <= m <= 0xD7 or m == 0x01: i += 2; continue
            end = i + 2 + int.from_bytes(raw[i + 2:i + 4], 'big')
            if m == 0xED: out.append(('an editor\'s block', i, end))
            elif m == 0xE1 and raw[i + 4:i + 14].startswith(b'http://ns.'): out.append(('a label packet', i, end))
            elif m == 0xFE: out.append(('a comment', i, end))
            i = end
    return out


def scan_binary(raw):
    """[(kind, the words as written, where)] for one binary file: a name in its bytes, or a metadata block of a picture."""
    out = []
    for kind, a, b in picture_blocks(raw):
        if kind in ('an editor\'s block', 'a label packet') or (kind == 'iTXt' and raw[a + 8:a + 12] == b'XML:'):
            out.append(('metadata', kind, 'a metadata block named after an editing program family (lossless to remove: names-gate.py strip <file>)'))
    seen = set()
    for m in BIN_WORDS.finditer(raw):
        c = m.group(0).decode('latin-1')
        for _, kind, said in scan_text(c):
            if kind != 'initials' and sum(ch.isalpha() for ch in said) >= 6 and said.lower() not in seen:
                seen.add(said.lower()); out.append((kind, said, 'in the file\'s bytes, at %d' % m.start()))
    return out


def strip_picture(path):
    """Take a picture's metadata blocks out, in place; the pixels are not touched. Returns what was removed."""
    raw = open(path, 'rb').read()
    blocks = picture_blocks(raw)
    if not blocks: return []
    out, last = [], 0
    for kind, a, b in blocks: out.append(raw[last:a]); last = b
    out.append(raw[last:])
    open(path, 'wb').write(b''.join(out))
    return [k for k, _, _ in blocks]


def read_allow(root='.'):
    p = os.path.join(root, ALLOW_FILE)
    if not os.path.exists(p): return frozenset()
    return frozenset(l.split()[0] for l in open(p, encoding='utf-8') if l.strip() and not l.startswith('#'))


def files(root='.'):
    r = subprocess.run(['git', '-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], capture_output=True)
    if r.returncode != 0: raise SystemExit('names-gate: git could not list the files (%s): refusing, not passing' % r.stderr.decode('utf-8', 'replace').strip()[:200])
    return sorted(set(f for f in r.stdout.decode('utf-8', 'replace').split('\0') if f))


def scan_tree(root='.', only=None, msg=None):
    allow = read_allow(root)
    found, exempt, read = [], [], 0
    every = files(root)
    if only:      # a file, or a folder and everything under it
        every = [f for f in every if any(f == o.rstrip('/') or f.startswith(o.rstrip('/') + '/') for o in only)]
    for f in every:
        p = os.path.join(root, f)
        if not os.path.isfile(p): continue                     # deleted in the working tree: it will not be in the commit
        for ln, kind, said in scan_text(f.replace('/', ' / ')):   # the path is read too
            found.append((f, 0, kind, said, 'the path itself'))
        if f == ALLOW_FILE: continue
        try:
            raw = open(p, 'rb').read()
        except OSError as e:
            raise SystemExit('names-gate: could not read %s (%s): refusing, not passing' % (f, e))
        if f.lower().endswith(BINARY) or b'\0' in raw[:8192]:   # a picture, a sound, a font: its bytes are read for a name too
            found.extend((f, 0, kind, said, where) for kind, said, where in scan_binary(raw))
            continue
        text = raw.decode('utf-8', 'replace'); read += 1
        hits = scan_text(text, allow=allow)
        if not hits: continue
        lines = text.split('\n')
        rows = [(f, ln, kind, said, lines[ln - 1].strip()) for ln, kind, said in hits]
        (exempt if f in EXEMPT else found).extend(rows)
    if msg:
        text = open(msg, encoding='utf-8', errors='replace').read()
        lines = text.split('\n')
        found.extend(('the commit message', ln, kind, said, lines[ln - 1].strip()) for ln, kind, said in scan_text(text, allow=allow))
    return found, exempt, read


def show(rows, cap=60):
    for f, ln, kind, said, line in rows[:cap]:
        at = line.find(said); a = max(0, at - 44) if at >= 0 else 0
        print('   %s:%s  %s  “%s%s%s”' % (f, ln or '-', {'initials': 'initials', 'private': 'his own name', 'metadata': 'picture metadata'}.get(kind, 'a name'), '…' if a else '', line[a:a + 110], '…' if len(line) > a + 110 else ''))
    if len(rows) > cap: print('   … and %d more (python3 tools/names-gate.py list)' % (len(rows) - cap))


def self_test():
    bad = []
    def ok(cond, what):
        if not cond: bad.append(what)
    # a made-up name stands in for the real ones: one word, two words, and one that only counts with its capitals
    P = [(1, 0, fp('zzqcontrolapp'), fp('zzqcontrolapp'), False),
         (2, 0, fp('zzq'), fp('zzq studio'), False),
         (3, 1, fp('zzq'), fp('a zzq maker'), False),
         (2, 1, fp('Cutter', True), fp('Quiet Cutter', True), True)]
    def names(t): return [s for _, k, s in scan_text(t, prints=P) if k == 'name']
    ok(names('// like ZzqControlApp does') == ['ZzqControlApp'], 'a one-word name in other capitals is not found')
    ok(names('the Zzq-Studio look') == ['Zzq-Studio'], 'a two-word name across a hyphen is not found')
    ok(names('   * as in zzq\n   * studio, where') == ['zzq\n   * studio'], 'a name across a wrapped comment line is not found')
    ok(names("zzq_studio's panel") == ['zzq_studio'], 'a name across an underscore, with a possessive, is not found')
    ok(names('what a zzq maker has') == ['a zzq maker'], 'a three-word name looked up by its middle word is not found')
    ok(names('zzq. Studio is another sentence') == [], 'two words either side of a full stop were read as one name')
    ok(names('Quiet Cutter') == ['Quiet Cutter'] and names('a quiet cutter of film') == [], 'a name that only counts with its capitals: found in lower case, or not found at all')
    ok(names('a zzqcontrolappendix and my zzq, in the studio') == [], 'a longer word that starts like a name, or its words apart, were read as the name')
    ok([ln for ln, k, s in scan_text('one\ntwo zzq studio\nthree', prints=P)] == [2], 'the line number of a finding is wrong')
    def ini(t, allow=frozenset()): return [s for _, k, s in scan_text(t, prints=[], allow=allow) if k == 'initials']
    A, E = 'A' + 'M', 'A' + 'E'                      # the pair of capitals, never written here as a word of their own
    ok(ini('// %s: hold the header' % A) == [A] and ini('the %s-style ruler' % A) == [A] and ini("%s's Feather" % E) == [E], 'the initials as a word of their own are not found')
    ok(ini('at 9 %s, 11:30 %s, %s/PM, I %s SURE, an old %s radio' % (A, A, A, A, A)) == [], 'a clock time, "I ..", or a radio was read as the initials')
    ok(ini('93 %s names visible' % A) == [A] and ini('v5.43 %s' % A) == [A], 'a count or a version in front of the initials was read as a clock time')
    ok(ini('var x = %sOUNT + R%s + am-floating + this.%s;' % (A, A, A)) == [], 'part of a longer identifier was read as the initials')
    ok(ini('src="data:image/png;base64,' + ('Zm9v/%s/' % E) * 30 + '"') == [], 'base64 was read as prose')
    line = 'const %s=[0,.4,.8,1.2], FR=[];' % A
    ok(ini(line) == [A] and ini(line, allow=frozenset([line_fp('   ' + line + '  ')])) == [], 'the allow list does not work by the exact line, whatever its indent')
    ok(len(PRINTS) == PRINT_COUNT, 'PRINTS holds %d entries, PRINT_COUNT says %d: an entry went missing, or the count was not moved with the list' % (len(PRINTS), PRINT_COUNT))
    ok(len(PRIVATE) == PRIVATE_COUNT, 'PRIVATE holds %d entries, PRIVATE_COUNT says %d' % (len(PRIVATE), PRIVATE_COUNT))
    ok(all(len(e) == 5 and len(e[2]) == 16 and len(e[3]) == 16 and 0 <= e[1] < e[0] <= 3 for e in PRINTS + PRIVATE), 'an entry of PRINTS or PRIVATE is malformed')
    Q = [(1, 0, fp('zzqownername'), fp('zzqownername'), False)]
    got = scan_text('in /Users/zzqownername/Claude and -Users-ZzqOwnerName-Claude, like ZzqControlApp', prints=P, private=Q)
    ok(sorted(k for _, k, _ in got) == ['name', 'private', 'private'], 'his own name in a path is not found, or is not told apart from an app\'s name')
    # a picture: a PNG with a label packet and a text chunk, a JPEG with an editor's block; found, stripped, and nothing else moved
    def chunk(t, d): return len(d).to_bytes(4, 'big') + t + d + b'\0\0\0\0'
    body = chunk(b'IHDR', b'\0' * 13) + chunk(b'IDAT', b'\x01\x02\x03') + chunk(b'IEND', b'')
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', b'\0' * 13) + chunk(b'iTXt', b'XML:com.zzq.xmp\0\0\0\0\0<x:xmpmeta/>') + chunk(b'tEXt', b'Software\0zzqcontrolapp 3') + chunk(b'IDAT', b'\x01\x02\x03') + chunk(b'IEND', b'')
    ok([k for k, _, _ in picture_blocks(png)] == ['iTXt', 'tEXt'], 'a PNG\'s text chunks are not found')
    old = PRINTS[:]; PRINTS[:] = P
    try:
        kinds = sorted(k for k, _, _ in scan_binary(png))
        ok(kinds == ['metadata', 'name'], 'a picture\'s label packet, or a name in its bytes, is not found (%s)' % kinds)
        ok(scan_binary(b'\x89PNG\r\n\x1a\n' + body + b'zzq studio' * 0) == [] and scan_binary(b'\0\1zzq\2studio\3 short') == [], 'a clean picture, or two short words apart, was flagged')
    finally: PRINTS[:] = old
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as t: t.write(png)
    try:
        ok(strip_picture(t.name) == ['iTXt', 'tEXt'] and open(t.name, 'rb').read() == b'\x89PNG\r\n\x1a\n' + body, 'strip does not leave exactly the picture without its text chunks')
        jpg = b'\xff\xd8' + b'\xff\xe0\x00\x04JF' + b'\xff\xed\x00\x06zzqa' + b'\xff\xe1\x00\x0ehttp://ns.zz' + b'\xff\xe1\x00\x08Exif\0\0' + b'\xff\xda\x00\x02' + b'\x11\x22\xff\xd9'
        open(t.name, 'wb').write(jpg)
        ok(strip_picture(t.name) == ['an editor\'s block', 'a label packet'] and open(t.name, 'rb').read() == b'\xff\xd8' + b'\xff\xe0\x00\x04JF' + b'\xff\xe1\x00\x08Exif\0\0' + b'\xff\xda\x00\x02' + b'\x11\x22\xff\xd9',
           'strip does not take exactly the editor\'s block and the label packet out of a JPEG (the camera\'s block must stay)')
    finally: os.unlink(t.name)
    # THE WALK ITSELF, in a throwaway repo: what a commit would hold is read (tracked and new), what it would not is left (ignored,
    # deleted); a path, a picture and the message count; the one exception is listed apart; the allow list lets its line through
    import shutil
    d = tempfile.mkdtemp(prefix='fm-names-')
    old = PRINTS[:]; PRINTS[:] = P
    try:
        def put(rel, data):
            p = os.path.join(d, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(data if isinstance(data, bytes) else data.encode('utf-8'))
        run = lambda *a: subprocess.run(['git', '-C', d] + list(a), capture_output=True)
        run('init', '-q'); run('config', 'user.email', 't@t'); run('config', 'user.name', 't')
        put('tracked.txt', 'plain words\nlike ZzqControlApp does\n'); put('gone.txt', 'zzq studio\n'); put('.gitignore', 'ignored.txt\n')
        run('add', '-A'); run('commit', '-q', '-m', 'x')
        os.unlink(os.path.join(d, 'gone.txt'))
        put('ignored.txt', 'zzq studio\n'); put('new/Zzq-Studio/notes.md', 'nothing here\n'); put('pic.png', png)
        put('code.js', line + '\n'); put('tools/.names-allow', '# allowed\n%s  code.js\n' % line_fp(line))
        put('CLAUDE.md', 'the look of zzq studio\n'); put('msg.txt', 'a message that says ZZQ STUDIO\n')
        found, exempt, read = scan_tree(d, None, os.path.join(d, 'msg.txt'))
        got = sorted((f, k) for f, _, k, _, _ in found)
        want = sorted([('tracked.txt', 'name'), ('new/Zzq-Studio/notes.md', 'name'), ('pic.png', 'metadata'), ('pic.png', 'name'), ('the commit message', 'name'), ('msg.txt', 'name')])
        ok(got == want, 'the walk of a tree found %s, not %s' % (got, want))
        ok([f for f, *_ in exempt] == ['CLAUDE.md'], 'the one exception is not listed apart from the findings')
        only, _, _ = scan_tree(d, ['new'], None)
        ok([f for f, *_ in only] == ['new/Zzq-Studio/notes.md'], 'a folder named on the command line is not read as that folder and what is under it')
    finally:
        PRINTS[:] = old
        shutil.rmtree(d, ignore_errors=True)
    me = open(__file__, encoding='utf-8').read()
    ok(not [h for h in scan_text(me) if h[1] != 'initials'], 'this file itself names one')
    for b in bad: print('   ✗ names-gate self-test: ' + b)
    return not bad


def main(argv):
    if not argv or argv[0] in ('-h', '--help'): print(__doc__); return 0
    if argv[0] == '--self-test':
        good = self_test(); print('names-gate self-test: %s' % ('ok' if good else 'FAILED')); return 0 if good else 1
    if argv[0] == 'print':
        name = argv[1]; exact = '--exact' in argv
        ws = WORD.findall(name)
        if not 1 <= len(ws) <= 3: print('a name of one to three words'); return 2
        at = max(range(len(ws)), key=lambda i: len(ws[i]))      # the longest word is the rarest to look up first
        print("    (%d, %d, '%s', '%s', %s)," % (len(ws), at, fp(ws[at], exact), fp(' '.join(ws), exact), exact)); return 0
    if argv[0] == 'allow':
        f, ln = argv[1].rsplit(':', 1); line = open(f, encoding='utf-8', errors='replace').read().split('\n')[int(ln) - 1]
        if not INITIALS.search(NOT_INITIALS.sub(' ', BASE64.sub(' ', line))): print('that line carries no initials to allow'); return 2
        if any(k != 'initials' for _, k, _ in scan_text(line)): print('that line NAMES one: reword it, it cannot be allowed'); return 2
        have = read_allow()
        if line_fp(line) in have: print('already allowed'); return 0
        with open(ALLOW_FILE, 'a', encoding='utf-8') as o: o.write('%s  %s\n' % (line_fp(line), f))
        print('allowed: %s:%s' % (f, ln)); return 0
    if argv[0] == 'strip':
        for f in argv[1:]:
            if not f.lower().endswith(('.png', '.jpg', '.jpeg')): print('%s: only a PNG or a JPEG can be stripped' % f); return 2
            gone = strip_picture(f)
            print('%s: %s' % (f, ('took out ' + ', '.join(gone)) if gone else 'nothing to take out'))
        return 0
    if argv[0] in ('check', 'list'):
        if not self_test():
            print('❌ names-gate: its own self-test failed, so it can judge nothing'); return 1
        msg = argv[argv.index('--msg') + 1] if '--msg' in argv else None
        only = [a for a in argv[1:] if not a.startswith('--') and a != msg] or None
        found, exempt, read = scan_tree('.', only, msg if (msg and os.path.exists(msg)) else None)
        if exempt:
            by = {}
            for f, *_ in exempt: by[f] = by.get(f, 0) + 1
            for f, n in sorted(by.items()): print('○ names-gate: %s still names one on %d line(s) — the one exception: %s' % (f, n, EXEMPT[f]))
        if not found:
            print('✓ names-gate: %d text file(s) read%s, none names another editing app or holds his own name' % (read, ', and the commit message' if msg else '')); return 0
        mark, cap = ('❌' if argv[0] == 'check' else '→'), (60 if argv[0] == 'check' else 100000)
        apps, own = [r for r in found if r[2] != 'private'], [r for r in found if r[2] == 'private']
        if apps:
            print('%s names-gate: %d place(s) name another editing app (#1264: "absolutely zero trace anywhere in any of our files"):' % (mark, len(apps)))
            show(apps, cap)
            if argv[0] == 'check':
                print('   Say "another app" (in his own quoted words: "[another app]"), or describe the behaviour instead of naming where it came from.')
                print('   If the initials are NOT a name on that line (a variable, a codec), run:  python3 tools/names-gate.py allow <file>:<line>')
        if own:
            print('%s names-gate: %d place(s) hold HIS OWN NAME (a public repo: a path copied from his computer carries its user name):' % (mark, len(own)))
            show(own, cap)
            if argv[0] == 'check': print('   Shorten the path (the part from the repo on is enough), or say "his account".')
        return 1 if argv[0] == 'check' else 0
    print(__doc__); return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
