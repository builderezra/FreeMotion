"""ONE definition of "can this be worked on?", shared by tools/next.sh and tools/status.sh.

WHY IT LIVES HERE. next.sh classifies every open entry so the loop knows what to pick up. status.sh
writes that same verdict into REQUESTS.md so Ezra can see it without running anything. Those are two
readers of ONE rule, and a rule that lives in two places is the single most expensive bug shape in
this project — it has caused, among others, the caption re-base (v11.06), the group-carry (v11.12),
the ramp integral (v11.13) and the link rewiring (v11.16). So neither tool owns the regexes: this
file does, and both import it.

Deliberately conservative, exactly as next.sh always was: anything it cannot classify is ACTIONABLE,
so the failure mode is being handed work rather than being told there is none.
"""
import re

HELD    = re.compile(r'⚠️ *HELD|Held because|Log don.t do yet|held at (his|your) request|deliberately not being done', re.I)
BLOCKED = re.compile(r'one word from (him|you)|need one photo|worth one line from (him|you)|your call|your word|'
                     r'needs? (his|your) (decision|word|call)|decision for you|say the word|Ask him|'
                     r'would settle it|from you would close it|LEFT OPEN for your eye|still worth your ears|'
                     r'waiting on (his|your)|ASKED HIM|STAYS OPEN|is his call|his call alone|'
                     # …and the plain ways a PARTIAL SHIP says it, which the list above all missed:
                     # "waiting on him" (not "his"), and a decision named as still outstanding.
                     r'waiting on (him|ezra)|decisions? only ezra can|decision (he|you) still owes?|'
                     r'his verdict|still waiting on|only he can (decide|answer|say)|'
                     # …and the big one the first version missed: items that are FIXED and left open only
                     # until he confirms on his own device. They read as actionable and are not — there is
                     # nothing to build, only something for him to look at.
                     r'Left OPEN rather than ticked|left open until|until (he|you) confirm|say so and (it|this) is live|'
                     r'if it still|next time it happens|one line from (him|you)|REAL-DEVICE report|'
                     # …and the plainest block of all: the thing the request refers to never arrived.
                     r'IS NOT IN THE INBOX|did not come through|never arrived|no screenshot|reference image', re.I)
BIG     = re.compile(r'wants a session of its own|Not started deliberately|days of work', re.I)
# …and entries that are NOT WORK AT ALL. Some exist as a receipt — a standing instruction he has had to
# repeat, kept so it does not live only in a chat log — and some say in their own words that they no
# longer hold the queue. Both used to land in ACTIONABLE, because nothing about them looks blocked, and
# that sends the next session to read a reminder instead of building something.
# TWO KINDS OF "not work", and conflating them hid five real items (21 Aug).
# An entry that IS a standing note says so in its HEADER — #353 "Standing instructions for the loop".
# An entry that merely MENTIONS one does not: logging his answers added the words "his standing
# instruction of the same day" to #342, #395, #419, #432 and #456, and all five instantly read as
# "nothing to build" and vanished from the actionable list. Real work, made unreachable by a phrase in
# a note about it — the same shape as the `[0-9]` bug tools/next.sh was written to kill, and caused by
# the logging that this file's own rules demand. So the header phrases are matched in the HEADER only.
STANDING_HEAD = re.compile(r'Standing reminder|Standing instruction', re.I)
# …and these say outright that the entry has no work in it, wherever they appear.
STANDING_BODY = re.compile(r'Nothing to build|this is the receipt|no longer holds the queue', re.I)


def _standing(body):
    head = body.split('\n', 1)[0]
    return bool(STANDING_HEAD.search(head) or STANDING_BODY.search(body))


# …and entries whose REMAINING clauses are all marked by him as ideas rather than requests. #277 had
# nine of ten clauses shipped with the last one written "potentially"; #343's two open clauses both say
# "(long term)". Both were topping the actionable list looking like days of work. If every unticked
# clause is hedged that way, the entry is not queued work — the ticked ones are the real state.
CLAUSE  = re.compile(r'^\s*\d+\. \[ \]')
HEDGED  = re.compile(r'\(long term\)|\(Idea|potentially|eventually|one day', re.I)


BUCKETS = ['ACTIONABLE', 'blocked on Ezra', 'held by Ezra', 'needs its own session',
           'standing note (no build)', 'only long-term ideas left']


def classify(body):
    """body = the entry's full text, header line included. Returns one of BUCKETS."""
    # ⚠️ IGNORE OUR OWN STATUS STAMP, OR THE VERDICT FEEDS ITSELF FOREVER (24 Aug).
    # tools/status.sh writes a line into each entry from THIS function's answer, and the line it
    # writes for a blocked item is "STATUS: 🟠 NEEDS YOU — waiting on your answer". That text matches
    # the BLOCKED pattern below. So the moment an entry was stamped blocked it could never become
    # actionable again: the stamp kept it blocked, no matter what was written underneath it.
    # Found on #456 — Ezra chased it ("why haven't you done any of that?"), the entry was rewritten to
    # say UNBLOCKED and "Just build it", and `next.sh` went on hiding it, because the stale stamp was
    # still in the body. An item that cannot be un-blocked is exactly the unreachable-request failure
    # this whole file exists to prevent, and the call was coming from inside the house.
    body = '\n'.join(l for l in body.split('\n') if '**STATUS:' not in l)
    open_clauses = [l for l in body.split('\n') if CLAUSE.match(l)]
    hedged_only = bool(open_clauses) and all(HEDGED.search(l) for l in open_clauses)
    # AN ANSWER FROM HIM OUTRANKS EVERY "waiting on him" PHRASE IN THE ENTRY (21 Aug). The blocked
    # test matches prose anywhere in the body — "your call", "say the word", "would settle it". When
    # he finally answers, that prose is still sitting there, in the history this file exists to keep.
    # Six entries he had just answered still counted as blocked, and every oldest-first listing
    # skipped them: answered, and unreachable. Held still wins (he can answer and still say "not
    # yet"), and so does a standing note, which never had work in it.
    # 'HE ANSWERED' in capitals counts too (2 Sep): two entries (#98, #560) recorded his answer that way,
    # got no credit, and sat as blocked for a day each. Lowercase prose ("he answered a different question")
    # deliberately does NOT count — see the #250 case below.
    answered = ('ANSWERED BY EZRA' in body) or ('HE ANSWERED' in body)
    # A HOLD CAN BE LIFTED, and the words that placed it stay in the entry forever (this file keeps its
    # history on purpose). #419 carried "⚠️ HELD AT HIS REQUEST — Log don't do yet" from 18 Aug and was
    # still reading as held after he said "just make it what I want" on the 21st. Held rightly outranks
    # a mere answer — he can answer and still say not yet — so lifting one has to be explicit rather
    # than inferred. Same shape as the answered-beats-blocked rule above.
    lifted = 'HOLD LIFTED' in body
    # AN EXPLICIT UNBLOCK BEATS THE PROSE THAT PLACED THE BLOCK (24 Aug). Same shape as the two rules
    # above, and needed for the same reason: this file keeps its history on purpose, so the words that
    # once made an entry blocked are still sitting in it afterwards. #456 carried an old clause reading
    # "⏳ WAITING ON EZRA — a letter, or a mix", and #507 QUOTES my own past mistake ("I marked it
    # 'waiting on your answer' and left it") — both live blocks as far as a regex is concerned, and both
    # long since decided. Ezra had chased #456 with "why haven't you done any of that?", which is the
    # opposite of waiting on him. So a decision to proceed has to be sayable in a way the tool honours.
    unblocked = 'UNBLOCKED' in body
    # LOOKING IS NOT ANSWERING. #250's measurable bug was fixed and the entry says plainly that only his
    # EYE is outstanding — but he had also answered a different question about it ("still want it at
    # all?" / "yes i want it"), and `answered` promoted it to actionable. The next loop tick would then
    # have rebuilt a working effect on the strength of a report predating its own fix. An entry that
    # says it needs him to LOOK stays waiting on him however many other questions he has answered.
    # Generalised from "his eye" to anything still needed FROM him (21 Aug). #202 wants a performance
    # readout taken while playing, #215 the toast text if a silent export recurs, #387 whether he was
    # playing or scrubbing, #342 what "more effort" means. All four had ANSWERED BY EZRA somewhere in
    # their history — he HAS answered things about them — so `answered` promoted every one to
    # actionable, and each topped the oldest-first list again on the next tick with nothing that could
    # be done. An explicit marker beats inference, exactly as HOLD LIFTED does.
    needs_eye = ('WAITING ON HIS EYE' in body or 'LEFT OPEN for your eye' in body
                 or 'WAITING ON EZRA' in body)
    # A NEW QUESTION OUTRANKS AN OLD ANSWER — the fourth outing for one bug shape (22 Aug, #392).
    # `answered` is STICKY FOREVER: once an entry contains "ANSWERED BY EZRA" anywhere, every blocking
    # phrase in it is treated as stale history, so the entry can never block again. That is right for
    # the prose his answer superseded, and wrong the moment a PARTIAL SHIP raises a fresh question —
    # #392 shipped one of four clauses, asked him to choose between cloud TTS and recording a voiceover,
    # and came back ACTIONABLE with nothing that could be done. The three previous cures were all
    # explicit markers a future session had to REMEMBER to write, which is precisely the kind of
    # safeguard this project treats as no safeguard at all.
    # The fix uses a property the file already has: entries are append-only, so they are chronological.
    # Blocking prose written AFTER his last answer has not been superseded by it — nothing came later.
    # So the answer only silences what precedes it. When there is no answer, `tail` is the whole body and
    # this is exactly the old rule.
    tail = re.split(r'ANSWERED BY EZRA|HE ANSWERED', body)[-1] if answered else body   # after his LAST answer, whichever wording
    return ('only long-term ideas left' if hedged_only else
            'standing note (no build)' if _standing(body) else
            'held by Ezra' if (HELD.search(body) and not lifted) else
            'blocked on Ezra' if (not unblocked and (needs_eye or BLOCKED.search(tail))) else
            'needs its own session' if BIG.search(body) else 'ACTIONABLE')


# ── WHICH ITEM SHOULD BE WORKED NEXT ────────────────────────────────────────────────────────────────
# WHY THIS IS HERE AND NOT IN A NOTE. CLAUDE.md has said "work the list oldest first" for weeks, and on
# 26 Aug the loop shipped v12.69 closing #556, #557 and #558 while #524, #539, #545, #548 and #550 sat
# ACTIONABLE and untouched — five items jumped, by the very session that had just re-read the rule.
# Nothing was wrong with next.sh: it printed the right answer. The answer was simply not obeyed, because
# obeying it was a thing to REMEMBER, and this project treats that as no safeguard at all.
# The reason it is so easy to get wrong is written in CLAUDE.md too: an item parked on a decision feels
# blocked even when the tool says READY, and a request he typed yesterday feels more urgent than one from
# three weeks ago. Both feelings are wrong and both are persistent. So the check moves into ship.sh,
# which refuses.
ENTRY = re.compile(r'^- \[[ x]\] \*\*')
OPEN  = re.compile(r'^- \[ \] \*\*')
NUM   = re.compile(r'^- \[ \] \*\*(\d+)([a-z]?) ')
# THE ESCAPE HATCH, and it has to exist. CLAUDE.md names two things that legitimately jump the queue:
# something he says to do now ("do this asap"), and a real emergency like a broken build. Neither can be
# inferred, so it is declared — put `JUMPED:` in the skipped entry with the reason, and the gate honours
# it. A reason written down is the point: it turns a silent reordering into a line he can read.
JUMPED = re.compile(r'JUMPED:')


# ── WHICH UNTICKED CLAUSES INSIDE A DONE ENTRY ARE ACTUALLY A MISS ─────────────────────────────────
# next.sh warns when an entry is ticked DONE while a clause inside it is not. That warning caught two
# genuine half-shipped requests (#418, #352) and is worth keeping. But it fired on #615 forever, and
# #615 is FINISHED — because the house style writes HIS clause list first, as he asked for it, and then
# a second ticked list under the DONE marker. The first list is the request, not the state.
# A banner that is wrong every tick is a banner you stop reading, so the rule is:
#   · a clause is HEDGED if it says why it is unticked (his own "potentially", "until he confirms") —
#     that is a decision, not a miss;
#   · a clause is SUPERSEDED if it sits above a DONE marker and its NUMBER comes back ticked below it —
#     that is the same clause, restated as finished.
# Everything else is a real miss and gets shouted about.
_CLAUSE_OPEN = re.compile(r'^\s*(\d+[a-z]?)\. \[ \]')
_CLAUSE_DONE = re.compile(r'^\s*(\d+[a-z]?)\. \[x\]', re.I)
_DONE_MARK = re.compile(r'(✅|═══).*(DONE|BUILT|SHIPPED|FIXED)', re.I)
_HEDGE = re.compile(r'\(idea|potentially|long term|eventually|one day|until (he|you) confirm|'
                    r'unticked until|his call|your call|held\b', re.I)
# A clause can also be resolved by MOVING it: #579's first clause is not a to-do, it is a finding that
# the complaint belongs to #572 and must be fixed there. That is a decision too. Kept DELIBERATELY
# NARROW — it needs a redirect phrase AND another entry's number in the same clause, because a loose
# rule here is how five real items were hidden by a passing mention (see _standing's comment).
_REDIRECT = re.compile(r'(?:not here|not a separate|belongs (?:to|in)|tracked (?:in|as|under)|'
                       r'covered by|fix it there|duplicate of)', re.I)
_ENTRYREF = re.compile(r'#\d+')


def live_clauses(body):
    """Unticked clauses in a DONE entry that are genuinely unaccounted for."""
    lines = body.split('\n')
    mark = next((i for i, l in enumerate(lines) if _DONE_MARK.search(l)), None)
    resolved = set()
    if mark is not None:
        for l in lines[mark:]:
            m = _CLAUSE_DONE.match(l)
            if m:
                resolved.add(m.group(1))
    live = []
    for i, l in enumerate(lines):
        m = _CLAUSE_OPEN.match(l)
        if not m:
            continue
        if mark is not None and i < mark and m.group(1) in resolved:
            continue                      # the request, restated as finished below
        blk = [l]
        for nxt in lines[i + 1:]:         # the reason is usually on the wrapped lines under it
            if _CLAUSE_OPEN.match(nxt) or _CLAUSE_DONE.match(nxt) or not nxt.startswith('    '):
                break
            blk.append(nxt)
        txt = ' '.join(blk)
        if _HEDGE.search(txt) or (_REDIRECT.search(txt) and _ENTRYREF.search(txt)):
            continue
        live.append(l)
    return live


# Each case is a real entry shape, and the first one is the false alarm that cost this rule its credibility.
_LIVE = [
    ('1. [ ] white background\n2. [ ] keep grain\n      ✅ **BUILT v13.57 — every clause done.**\n'
     '1. [x] white background\n2. [x] grain kept', 0,
     '#615: his clause list restated as ticked under the DONE marker is not a miss'),
    ('1. [ ] white background\n2. [ ] keep grain\n      ✅ **BUILT v13.57.**\n1. [x] white background', 1,
     'a clause that never comes back ticked IS a miss (#418, #352 shipped half a request)'),
    ('1. [ ] add a cloud voice (long term)', 0, 'a clause that says why it is parked is a decision'),
    ('1. [ ] the thing he asked for', 1, 'a bare unticked clause with no DONE block anywhere is a miss'),
    ('1. [ ] rename it\n      unticked until he confirms the wording', 0,
     'the reason lives on the WRAPPED line under the clause, not the clause itself (#426)'),
    ('1. [ ] saturation does not work\n      so this clause is #572, not here. Fix it there.', 0,
     '#579: a clause moved to another entry is resolved, not missing'),
    ('1. [ ] saturation does not work\n      this is like #572 and also like #593', 1,
     'MENTIONING another entry must not hide a clause — only an explicit redirect does'),
    ('1. [ ] do the thing\n      not here', 1,
     'a redirect with no entry number to redirect TO is not a resolution'),
]


def entries(md):
    """Split REQUESTS.md into whole entries, header line first. Shared so the gate and the listing
       can never disagree about where one request ends and the next begins."""
    out, cur = [], None
    for line in md.split('\n'):
        if ENTRY.match(line):
            if cur is not None: out.append('\n'.join(cur))
            cur = [line]
        elif cur is not None:
            cur.append(line)
    if cur is not None: out.append('\n'.join(cur))
    return out


def sort_key(num, suffix):
    """Unnumbered items sort FIRST — they predate the numbering, so they are the oldest. Letter
       suffixes sort inside their number (#31b after #31), which the first version of next.sh got
       wrong by sorting it to the bottom."""
    if num is None: return (0, 0, '')
    return (1, num, suffix)



# ═══ WHAT A RELEASE ACTUALLY CLOSES — READ FROM THE DIFF, NOT FROM THE PROSE ══════════════════════
# 29 Aug. ship.sh's oldest-first gate worked out which items a release closes by grepping the
# POLISH-LOG line for the words "queue 651". That is a rule about PHRASING, and phrasing is not a
# thing a gate can rely on: five releases in a row (v14.31, v14.34, v14.35, v14.36, v14.37) wrote
# "#651" instead, so `CLOSES` came back EMPTY and the gate — the one added on 26 Aug precisely because
# "obeying it was a thing to remember" — sat there matching nothing and passing everything.
#
# This is the same defect shape ship.sh's own header already names about its backtick check: "A
# safeguard that reads like protection and cannot fire is worse than none, because it stops you being
# careful." It fired accidentally on v14.32 and v14.33, because those log lines happened to quote a
# code comment containing the words "queue 650" — which is worse again, because it looked alive.
#
# So the question is asked of the thing that cannot be phrased around: REQUESTS.md's own diff. An item
# is CLOSED by this release exactly when its checkbox goes from `- [ ]` to `- [x]` in it. No convention
# to remember, no words to get right, and it stays true if the log entry is written in any style at all.
def closed_in_diff(diff):
    """Numbers whose entry checkbox goes `- [ ]` -> `- [x]` in a `git diff` of REQUESTS.md.

    Returns a sorted list of (num, suffix). Unnumbered entries come back as (None, '') — they are the
    oldest in the file, so a release closing one still has to satisfy the ordering gate."""
    opened, closed = set(), set()
    for line in (diff or '').split('\n'):
        if not line or line[0] not in '+-':
            continue
        # `---`/`+++` are the file headers, not content
        if line.startswith('---') or line.startswith('+++'):
            continue
        body = line[1:]
        m = re.match(r'- \[( |x)\] \*\*(\d+)([a-z]?)[ —]', body)
        if not m:
            # …and the unnumbered entries, which have no number at all
            m2 = re.match(r'- \[( |x)\] \*\*(?!\d)', body)
            if not m2:
                continue
            key = (None, body[:60])
            (closed if m2.group(1) == 'x' else opened).add(key)
            continue
        key = (int(m.group(2)), m.group(3))
        (closed if m.group(1) == 'x' else opened).add(key)
    # A number that only appears as `+- [x]` is a NEW entry added already-ticked, not a close of
    # something that was open — those are logged all the time and must not trip the ordering gate.
    out = []
    for k in closed:
        if k[0] is None:
            if any(o[0] is None and o[1] == k[1] for o in opened):
                out.append((None, ''))
        elif k in opened:
            out.append(k)
    return sorted(set(out), key=lambda t: sort_key(t[0], t[1]))


def next_up(md):
    """The single lowest OPEN + ACTIONABLE entry — the one CLAUDE.md says to work.
       Returns (num, suffix, header) or None. `num` is None for an unnumbered entry."""
    best = None
    for body in entries(md):
        if not OPEN.match(body): continue
        if JUMPED.search(body): continue          # declared, with a reason, so it does not hold the queue
        if classify(body) != 'ACTIONABLE': continue
        m = NUM.match(body)
        num = int(m.group(1)) if m else None
        suf = m.group(2) if m else ''
        k = sort_key(num, suf)
        if best is None or k < best[0]:
            best = (k, num, suf, body.split('\n', 1)[0])
    return None if best is None else (best[1], best[2], best[3])


# ── STALE ASKS ────────────────────────────────────────────────────────────────────────────────────
# AN ANSWERED QUESTION THAT IS STILL WRITTEN AS A QUESTION KEEPS THE ENTRY BLOCKED (2 Sep). #98's last
# open clause was the default text size. He answered it on 1 Sep — "160pt — what you have now" — and the
# entry recorded that answer in full. It ALSO still carried the line "❓ASK: how big should text start?",
# because striking the ask is a thing a session has to remember, and the answer had been written as "HE
# ANSWERED", not the literal "ANSWERED BY EZRA" the rule above credits. So an item with nothing left to do
# sat in "blocked on Ezra" for a day, and every oldest-first listing walked past it.
# This does NOT reclassify (the #250 case shows an unrelated answer must not promote an entry). It NAMES
# the contradiction — an unstruck ❓ASK beside any record of an answer — so next.sh can shout it, and the
# fix is one edit: strike the ask, or say plainly that the answer was to something else.
_ASK = re.compile(r'^\s*❓\s*ASK', re.M)
_ANSWERED = re.compile(r'ANSWERED BY EZRA|HE ANSWERED|EZRA ANSWERED|He answered|he answered', re.M)
def stale_asks(md):
    out = []
    for chunk in re.split(r'(?m)^(?=- \[[ x]\] \*\*)', md):
        m = re.match(r'- \[( |x)\] \*\*(\d+[a-z]?)?', chunk)
        if not m or m.group(1) == 'x': continue
        asks = [l for l in chunk.split('\n') if _ASK.match(l) and '~~' not in l and not l.lstrip().startswith('✅')]
        if asks and _ANSWERED.search(chunk):
            out.append((m.group(2) or '(unnumbered)', asks[0].strip()[:110]))
    return out

# ── SELF-TEST ───────────────────────────────────────────────────────────────────────────────────────
# `python3 tools/_classify.py` and it checks its own rules. tools/ship.sh runs this and REFUSES to
# push when it fails, because every rule in this file was written to cure a specific bug and nothing
# else would notice if one stopped working. Each case below IS one of those bugs, in its own words.
_CASES = [
    # AN EXPLICIT UNBLOCK BEATS BOTH THE PROSE AND THE "needs his eye" MARKER (24 Aug). Real cases:
    # #456 carried an old "WAITING ON EZRA — a letter, or a mix" clause and #507 quotes my own past
    # "waiting on your answer" as history. Both were decided; both stayed invisible.
    ("""- [ ] **456 — two buttons should differ**
      ⏳ **WAITING ON EZRA — a letter, or a mix.**
      **UNBLOCKED 24 Aug — he chased it, so build it.**""",
     'ACTIONABLE',
     "an explicit UNBLOCKED must beat WAITING ON EZRA — otherwise a decided item can never be worked"),
    # …and without it, that same marker must still block.
    ("""- [ ] **998 — something**
      ⏳ **WAITING ON EZRA — a letter, or a mix.**""",
     'blocked on Ezra',
     "WAITING ON EZRA still blocks when nothing has un-blocked it"),
    # THE STAMP MUST NOT DECIDE THE VERDICT (24 Aug). status.sh writes this line from classify()'s own
    # answer; if classify() then reads it, a blocked item is blocked forever. Real case: #456.
    ("""- [ ] **456 — two buttons should differ**
      **STATUS: 🟠 NEEDS YOU — waiting on your answer**
      He chased it on 24 Aug. Just build it — nothing is outstanding from him.""",
     'ACTIONABLE',
     "a stale STATUS stamp must not keep an entry blocked — that loop made #456 permanently invisible"),
    # …and a REAL blocked phrase in the prose must still block.
    ("""- [ ] **999 — something**
      **STATUS: 🟢 READY — nothing is stopping this**
      This one genuinely needs one word from you before it can be built.""",
     'blocked on Ezra',
     "stripping the stamp must not stop real blocked prose from counting"),
    # The bug this file was extracted to fix: two copies of the rule drifting apart. Nothing to assert
    # there — but these are the behaviours that must survive any future edit.
    ('- [ ] **1 — plain** something to build', 'ACTIONABLE',
     'an ordinary entry with no signals must be workable — the conservative default'),
    ('- [ ] **2 — x** it is your call whether to do this', 'blocked on Ezra',
     'an unanswered question blocks'),
    ('- [ ] **3 — x** it is your call.\nANSWERED BY EZRA: do it', 'ACTIONABLE',
     'his answer un-blocks the prose that came BEFORE it (21 Aug: six answered entries were unreachable)'),
    ('- [ ] **4 — x** ANSWERED BY EZRA: do it\nlater: shipped half; the rest is waiting on him',
     'blocked on Ezra',
     'a question raised AFTER his answer still blocks (22 Aug, #392: a partial ship came back actionable)'),
    ('- [ ] **5 — x** ⚠️ HELD AT HIS REQUEST\nANSWERED BY EZRA: yes', 'held by Ezra',
     'held outranks answered — he can answer and still say not yet'),
    ('- [ ] **6 — x** ⚠️ HELD AT HIS REQUEST\nHOLD LIFTED', 'ACTIONABLE',
     'a lifted hold is workable again (#419 stayed held after "just make it what I want")'),
    ('- [ ] **7 — x** ANSWERED BY EZRA: yes\nWAITING ON EZRA to look at it', 'blocked on Ezra',
     'looking is not answering (#250: fixed, needs only his eye, promoted by an unrelated answer)'),
    ('- [ ] **3b — x** it is your call.\n✅ HE ANSWERED, 1 Sep: do it', 'ACTIONABLE',
     'an uppercase HE ANSWERED is an answer (2 Sep: #98 and #560 each sat blocked a day for the wording)'),
    ('- [ ] **3c — x** it is your call.\nhe answered a different question about it', 'blocked on Ezra',
     'lowercase prose about answering is NOT the marker — an unrelated answer must not promote an entry'),
    ('- [ ] **8 — Standing reminder** about the thing', 'standing note (no build)',
     'a standing note in the HEADER is not work'),
    # The phrase must sit in the BODY here, not the header — that distinction IS the rule. Writing this
    # case with "standing instruction" in the header line failed, correctly, and is worth recording: a
    # header saying it IS a standing note should match; a body merely quoting one must not.
    ('- [ ] **9 — x** real work\n      per his standing instruction of the same day, logged here',
     'ACTIONABLE',
     'MENTIONING a standing note must not hide the entry (21 Aug: it hid five real items)'),
    ('- [ ] **10 — x** wants a session of its own', 'needs its own session', 'big items are flagged, not hidden'),
    ('- [ ] **11 — x**\n 1. [ ] do this (long term)\n 2. [ ] and this (long term)', 'only long-term ideas left',
     'an entry whose every open clause is hedged is not queued work (#277, #343)'),
]

# ── SELF-TEST FOR THE QUEUE-ORDER GATE ──────────────────────────────────────────────────────────────
# Each case is the ordering bug it prevents, in the terms it actually happened in.
_ORDER = [
    # THE ONE IT WAS WRITTEN FOR (26 Aug). Three items shipped together while five lower-numbered ones
    # sat ACTIONABLE. Everything about the tooling was right; the order simply was not obeyed.
    ("""- [ ] **524 — drag past the end**
      nothing is stopping this
- [x] **556 — delete clears selection**
      done
- [ ] **558 — lens flare colours**
      nothing is stopping this""",
     (524, ''),
     'the LOWEST open actionable item wins, and a ticked entry in between is not a candidate'),
    # Unnumbered entries predate the numbering, so they are OLDER than #1 and must sort first. The
    # first version of next.sh got the mirror of this wrong and made ten of them unreachable.
    ("""- [ ] **an old one with no number**
      nothing is stopping this
- [ ] **12 — a numbered one**
      nothing is stopping this""",
     (None, ''),
     'an unnumbered entry is the oldest thing in the file and outranks every number'),
    # A letter suffix belongs INSIDE its number: #31b is older than #32, not younger than everything.
    ("""- [ ] **32 — later**
      nothing is stopping this
- [ ] **31b — earlier**
      nothing is stopping this""",
     (31, 'b'),
     '#31b sorts inside 31, not at the bottom — the exact bug the first next.sh shipped'),
    # A BLOCKED lower item does NOT hold the queue. CLAUDE.md: "say so and move to the next-oldest".
    ("""- [ ] **10 — blocked one**
      waiting on your answer
- [ ] **20 — a workable one**
      nothing is stopping this""",
     (20, ''),
     'a lower item that is blocked on Ezra must not hold the queue behind it'),
    # THE ESCAPE HATCH. Declared, with a reason, so it stops holding the queue — and the reason is
    # written down instead of the reordering being silent.
    ("""- [ ] **10 — skipped one**
      JUMPED: he said do #20 right now
- [ ] **20 — the one he asked for**
      nothing is stopping this""",
     (20, ''),
     'a declared JUMPED: skip releases the queue; without it, #10 would still be next'),
]


# ═══ WHAT THE LOOP WORKS NEXT — AND "BLOCKED" IS IN IT (queue 660, 28 Aug) ═════════════════════════
# Ezra: *"Dont ask questions like that dont stop to ask questions, log ur question and ask it me when
# i ask for me, just keep going, also ur not doing oldest first"*.
# He said both halves in one breath because they are one fault. `next.sh` built its START HERE list
# from ACTIONABLE alone, and the classifier files **43 of 76 open items as "blocked on Ezra"** — so
# more than half the list was invisible and the loop worked the newest third while believing it was
# working oldest-first. #47, #95, #96, #98, #125, #129, #148 and #202 all sat open and unreachable
# while 610/631/632 were being offered as "START HERE (oldest first)".
# "Blocked" was only ever a reason to skip because ASKING was treated as a precondition. It is not one
# any more: write the question into the entry, build every part that does not depend on the answer,
# move on. So a blocked item is WORK, and it goes back in the queue.
# ⚠️ THIS IS NOT `next_up`, AND THE TWO MUST NOT BE MERGED. `next_up` decides what may be CLOSED, and
# it still excludes blocked items — a gate that demanded an unanswerable item be closed first would
# stop every release. WORK includes blocked; CLOSE does not. Same file, different question.
# 'held by Ezra' stays out: he has said explicitly not to do those, which is an answer, not a gap.
WORKABLE = ('ACTIONABLE', 'blocked on Ezra')


def work_queue(buckets):
    """buckets = {bucket_name: [(tag, title, line), ...]}. Returns [(tag, title, line, bucket), ...]
    oldest first — unnumbered entries before every number, letter suffixes sorted inside their number."""
    items = []
    for k in WORKABLE:
        for row in buckets.get(k, []):
            items.append((row[0], row[1], row[2], k))

    def key(t):
        m = re.match(r'(\d+)([a-z]?)$', str(t[0]))
        return (1, int(m.group(1)), m.group(2)) if m else (0, 0, '')
    return sorted(items, key=key)


_WORK = [
    # THE BUG ITSELF: a blocked #47 must come out AHEAD of an actionable #610, not be hidden by it.
    ({'ACTIONABLE': [('610', 'border and shadow', 5)],
      'blocked on Ezra': [('47', 'export on a crash', 9)]},
     ['47', '610'],
     'a blocked older item leads the WORK queue — hiding it is what made the loop stop being oldest-first'),
    # Unnumbered entries predate the numbering, so they are older than #1 — same rule next.sh already has.
    ({'ACTIONABLE': [('12', 'a numbered one', 3), ('(unnumbered)', 'an old one', 1)],
      'blocked on Ezra': []},
     ['(unnumbered)', '12'],
     'an unnumbered entry outranks every number in the work queue too'),
    # Letter suffixes sort INSIDE their number, not at the bottom. This bug shipped once already.
    ({'ACTIONABLE': [('32', 'later', 3)], 'blocked on Ezra': [('31b', 'earlier', 1)]},
     ['31b', '32'],
     '#31b sorts inside 31 — the same mis-sort the first next.sh shipped'),
    # HELD is not a gap in my knowledge, it is his decision. It must stay OUT of the work queue.
    ({'ACTIONABLE': [('610', 'border', 5)], 'held by Ezra': [('206', 'shape edit points', 1)]},
     ['610'],
     'an item HE held must not be handed back as work — that would be ignoring him, not obeying him'),
]


# Each of these is the bug that made this function necessary, or one it must not cause.
_DIFF = [
    ('-- [ ] **651 — Explain what templates ARE.**\n+- [x] **651 — Explain what templates ARE.**',
     [(651, '')], 'a plain tick is a close'),
    ('+- [x] **674 — a brand new entry, logged already done.**',
     [], 'an entry ADDED already-ticked is not closing anything that was open'),
    ('-- [ ] **31b — a letter-suffixed item.**\n+- [x] **31b — a letter-suffixed item.**',
     [(31, 'b')], 'letter suffixes survive — mis-sorting one is a bug this repo has already had'),
    ('-      some prose about #642 and queue 650\n+      more prose about #642',
     [], 'a number mentioned in prose is not a close — the whole point of not reading prose'),
    ('-- [ ] **215 — no audio.**\n+- [ ] **215 — no audio.** extra note',
     [], 'an entry edited but left OPEN is not a close'),
    ('-- [ ] **648 — a tap.**\n+- [x] **648 — a tap.**\n-- [ ] **650 — hover.**\n+- [x] **650 — hover.**',
     [(648, ''), (650, '')], 'two closes in one release, in order'),
]

_STALE_CASES = [
    ("- [ ] **98 — x**\n      ✅ HE ANSWERED THE SIZE QUESTION, 1 Sep: 160pt.\n      ❓ASK: how big should text start?", True,
     "an unstruck ❓ASK beside a recorded answer is stale — #98 sat blocked for a day this way"),
    ("- [ ] **99 — x**\n      ❓ASK: which file failed?", False,
     "an open ask with no answer recorded is simply open"),
    ("- [ ] **98 — x**\n      ✅ ~~ASK: how big should text start?~~ ANSWERED 1 Sep: 160pt.", False,
     "a struck ask is not stale — striking it is the fix"),
    ("- [x] **98 — x**\n      HE ANSWERED it.\n      ❓ASK: how big?", False,
     "a closed entry is nobody's queue; do not shout about it"),
    ("- [ ] **7 — x**\n      He answered a different question about it.\n      ✅ ASK (struck): resolved", False,
     "an ask already marked ✅ does not count as open"),
]

if __name__ == '__main__':
    import sys as _s
    bad = 0
    for body, want, why in _CASES:
        got = classify(body)
        if got != want:
            bad += 1
            print('FAIL: expected %-26s got %-26s — %s' % (want, got, why))
    for md, want, why in _ORDER:
        got = next_up(md)
        got2 = None if got is None else (got[0], got[1])
        if got2 != want:
            bad += 1
            print('FAIL: next_up expected %-14s got %-14s — %s' % (want, got2, why))
    for buckets, want, why in _WORK:
        got = [r[0] for r in work_queue(buckets)]
        if got != want:
            bad += 1
            print('FAIL: work_queue expected %-22s got %-22s — %s' % (want, got, why))
    for body, want, why in _LIVE:
        got = len(live_clauses(body))
        if got != want:
            bad += 1
            print('FAIL: live_clauses expected %d got %d — %s' % (want, got, why))
    for diff, want, why in _DIFF:
        got = closed_in_diff(diff)
        if got != want:
            bad += 1
            print('FAIL: closed_in_diff expected %-16s got %-16s — %s' % (want, got, why))
    _total = len(_CASES) + len(_ORDER) + len(_WORK) + len(_LIVE) + len(_DIFF)
    if bad:
        print('\n%d of %d classifier rules are broken. Each one was a real bug; do not push this.' % (bad, _total))
        _s.exit(1)
    # the stale-ask detector's own cases (2 Sep) — a rule with no test is a rule that rots
    sbad = 0
    for body, expect, why in _STALE_CASES:
        got = bool(stale_asks(body))
        if got != expect:
            sbad += 1; print('STALE-ASK RULE BROKEN: expected %s, got %s — %s' % (expect, got, why))
    if sbad:
        print('\n%d stale-ask rule(s) broken; do not push this.' % sbad)
        _s.exit(1)
    print('classifier self-test: %d/%d ok (+%d stale-ask cases)' % (_total, _total, len(_STALE_CASES)))
