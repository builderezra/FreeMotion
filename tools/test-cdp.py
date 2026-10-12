#!/usr/bin/env python3
"""tools/test-cdp.py — proves tests/_cdp.py's CDP class against a scripted fake DevTools socket, in a second, no Chrome.

What it holds (12 Oct, the cloud helper's handoff: two 690 tests froze the page and the driver sat past --timeout):
  1. a JavaScript dialog that opens while a command waits is pressed OK at once (Page.handleJavaScriptDialog, accept true),
     its words are kept, and the command still gets ITS answer although the dismissal took the next id;
  2. a command the page never answers ends in `hung` after the socket's timeout, and every later command refuses at once
     instead of waiting another 600 s each;
  3. CONTROL: a plain command with no events in the way returns its own result.
Exit 0 = all hold; 1 = one did not (it says which).
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tests"))
import _cdp  # noqa: E402
import websocket  # noqa: E402


class FakeWS:
    def __init__(self, script):
        self.script = list(script)   # each: a dict to answer with, a callable(sent) -> dict, or an exception to raise
        self.sent = []

    def send(self, raw):
        self.sent.append(json.loads(raw))

    def recv(self):
        if not self.script:
            raise websocket.WebSocketTimeoutException("scripted: nothing more to say")
        nxt = self.script.pop(0)
        if isinstance(nxt, Exception):
            raise nxt
        if callable(nxt):
            nxt = nxt(self.sent)
        return json.dumps(nxt)

    def close(self):
        pass


def make(script):
    c = _cdp.CDP.__new__(_cdp.CDP)   # skip the real connection
    c.ws, c.n, c.crashed, c.hung, c.dialogs = FakeWS(script), 0, False, False, []
    return c


bad = []

# 3. CONTROL first: a plain answer
c = make([lambda sent: {"id": sent[-1]["id"], "result": {"result": {"value": 7}}}])
if c.eval("3+4") != 7:
    bad.append("CONTROL: a plain Runtime.evaluate did not return its value")

# 1. a dialog in the middle of a command
first = {}


def answer_original(sent):
    return {"id": first["id"], "result": {"result": {"value": "after the alert"}}}


c = make([
    {"method": "Page.javascriptDialogOpening", "params": {"type": "alert", "message": "NO_VIDEO_CODEC: this browser cannot make MP4"}},
    lambda sent: {"id": sent[-1]["id"], "result": {}},   # the reply to the dismissal
    answer_original,
])
_orig_send = c.ws.send


def spy(raw):
    m = json.loads(raw)
    if not first:
        first["id"] = m["id"]
    _orig_send(raw)


c.ws.send = spy
try:
    got = c.eval("document.title")
except Exception as e:
    got = "raised %s" % e
if got != "after the alert":
    bad.append("a command waiting through an alert got %r instead of its own answer" % (got,))
dis = [m for m in c.ws.sent if m.get("method") == "Page.handleJavaScriptDialog"]
if len(dis) != 1 or dis[0]["params"].get("accept") is not True:
    bad.append("the alert was not pressed OK exactly once (sent %s)" % [m.get("method") for m in c.ws.sent])
if not c.dialogs or "NO_VIDEO_CODEC" not in c.dialogs[0]["message"]:
    bad.append("the alert's words were not kept: %r" % (c.dialogs,))

# 2. a command never answered
c = make([websocket.WebSocketTimeoutException("scripted silence")])
try:
    c.eval("while(true){}")
    bad.append("a command the page never answered returned")
except RuntimeError as e:
    if "no answer" not in str(e):
        bad.append("the unanswered command raised the wrong error: %s" % e)
if not c.hung:
    bad.append("an unanswered command did not mark the page hung")
n_before = len(c.ws.sent)
try:
    c.eval("1")
    bad.append("a command after the page hung was sent and answered")
except RuntimeError:
    pass
if len(c.ws.sent) != n_before:
    bad.append("a command after the page hung was still sent (and would have waited another %ds)" % _cdp.STALL_SILENT_S)

if bad:
    print("❌ tests/_cdp.py: " + " · ".join(bad))
    sys.exit(1)
print("✅ tests/_cdp.py: a dialog is pressed OK and the waiting command still gets its answer; an unanswered command marks the page hung and nothing waits after it")
