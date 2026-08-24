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
    answered = 'ANSWERED BY EZRA' in body
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
    tail = body.rsplit('ANSWERED BY EZRA', 1)[-1] if answered else body
    return ('only long-term ideas left' if hedged_only else
            'standing note (no build)' if _standing(body) else
            'held by Ezra' if (HELD.search(body) and not lifted) else
            'blocked on Ezra' if (not unblocked and (needs_eye or BLOCKED.search(tail))) else
            'needs its own session' if BIG.search(body) else 'ACTIONABLE')


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

if __name__ == '__main__':
    import sys as _s
    bad = 0
    for body, want, why in _CASES:
        got = classify(body)
        if got != want:
            bad += 1
            print('FAIL: expected %-26s got %-26s — %s' % (want, got, why))
    if bad:
        print('\n%d of %d classifier rules are broken. Each one was a real bug; do not push this.' % (bad, len(_CASES)))
        _s.exit(1)
    print('classifier self-test: %d/%d ok' % (len(_CASES), len(_CASES)))
