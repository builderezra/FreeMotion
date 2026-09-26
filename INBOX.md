# INBOX

Append requests below the divider. The building chat drains it: each entry moves into REQUESTS.md with a
number, then `tools/inbox.sh --done` removes only the lines it was shown, so anything added mid-drain stays.
The divider is the line of three dashes below. Keep that exact line out of this header prose: on 20 Sep
the old drain cut the file at the first three dashes in the header, and the inbox was blind for six days.

WHO WRITES HERE: Ezra from his phone, and the LOGGING CHAT (his arrangement, 26 Sep). The logging chat
writes one block per message he sends it:

    ### <date, time AWST> — <short title>
    **His words (verbatim):** …exactly what he typed, typos and all…
    **Logger's brainstorm (not his words):** what it could look like, how it would work, what to build,
    what to check, and any question for him (as a `❓ASK:` line).

BUILDER: move the WHOLE block into the REQUESTS.md entry. His words go in as the verbatim quote and get
split into his numbered clauses as usual. The brainstorm goes under them, labelled as the logger's spec.
It is a starting point, not his decision. Design requests still get drawn options before anything ships
(#545), and the queue order is unchanged: log it at the bottom and it waits its turn.

---


### 26 Sep 2026, ~11:08 AWST — His before/after picture for #950, #951 and #952 (the claude.ai handoff's prototype)

**His words (verbatim):** (none; he sent the picture on its own, as the handoff said he might)

Saved at `tools/design/950-952-before-after.png`. It is the TARGET look, rendered by the claude.ai chat against v17.00, not from your tree. Put a line pointing at it into each of the three entries.

**Logger's brainstorm (not his words): what the picture shows, and what to check against it once built:**
- **#952 Done while selecting:** after = blue gradient pill with a soft outer glow and dark ink, the same look as the lit search button. Before = the plain white pill. Compare your built Done against this crop in light AND dark.
- **#950 Select bar on a phone:** after = ONE row, "0 selected · Select all · Duplicate · Delete", with Cancel gone. Before = Cancel wrapped onto its own second row. The tinted strip above the bar in the after crop is only the page showing through, because the crop kept its height and the bar got shorter. Still, check on a phone that the bar sits where it did and nothing odd fills that space.
- **#951 Clear ✕ in search:** after = a smaller solid slate disc (#8792a4 in the light Home) with a bold white drawn ✕, dead centre. Before = a big pale 34px disc with a thin, low ✕ glyph. The new disc is 22px drawn inside the 34px button, so the tap target must stay 34px. It is noticeably darker and heavier than before, and that is the pick he asked for ("just pick the best one"), so no options.
- When shipping, render the same three crops from YOUR build and send them side by side with this picture, so he sees that what shipped matches what he approved.

### 26 Sep 2026, ~11:10 AWST — Reminder: a page of questions he still has to go through and answer (made by another chat)

**His words (verbatim):** "https://claude.ai/artifact/4hddzpLiJvQvkUifK2sdw5 Can you see this? If so make note that I still need to go through it and answer everything. You can read through but don’t make any decisions on it - I got another that to build this up"

**Logger's note (not his words):**
- The logging chat could NOT open this link ("artifact not found": not shared with this session, a different account, or deleted). Its contents are unknown here.
- ⚠️ **Make NO decisions from it.** It is his to go through and answer. Another chat of his is building it up. Log it as a reminder that is waiting on him (`BUILT OUT UNTIL HE answers the questions on the page at the link above`), not as work.
- It may overlap the 36 questions he was given in the logging chat today (#953) and the dead unblock page (#777). Do not merge, publish or republish anything about it until he says so. His answers come back as their own blocks.
