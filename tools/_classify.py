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
    return ('only long-term ideas left' if hedged_only else
            'standing note (no build)' if _standing(body) else
            'held by Ezra' if (HELD.search(body) and not lifted) else
            'blocked on Ezra' if (needs_eye or (BLOCKED.search(body) and not answered)) else
            'needs its own session' if BIG.search(body) else 'ACTIONABLE')
