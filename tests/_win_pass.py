#!/usr/bin/env python3
"""THE AAC TESTS LINUX CHROME CANNOT RUN, RUN IN WINDOWS CHROME ON THE SAME LAPTOP (11 Oct, the PM's idea for #604).

    python3 tests/_win_pass.py --remaining .claude/ship/notrun-desktop.tsv [--width 1280] [--out win.json]
    python3 tests/_win_pass.py --available        # exit 0 when a Windows Chrome is reachable from here, 1 when not

Linux headless Chrome has no AAC encoder, so the export-audio tests say NOT RUN HERE in every pass on this laptop, and while
they do the feature gate refuses ANY change to the export code (tools/_shipgates.py FEATURES) — the guard for his silent
iPhone export (#604) could not ship. Windows Chrome on the same machine HAS the codecs (measured 11 Oct: AudioEncoder
mp4a.40.2 and avc1 both supported). So each such test runs here, alone, in a headless Windows Chrome with a profile of its
own under the Windows temp folder (never his), opening this tree through WSL's localhost forwarding.

There is no DevTools channel across the WSL boundary without a system setting, so this needs none: a wrapper page (served
here, never a file in the tree) holds tests/run.html?only=<name> in a frame, waits for its verdict, and POSTs what _cdp.py
would have read (the summary, the FAIL rows, window.__fmResults, window.__fmNotRun) back to this server. Only tests that ask
the driver for nothing can run this way; the AAC ones ask for nothing (checked 11 Oct: no __fmWant*, no real input).

The --remaining file is rewritten in place exactly as tests/_slow_pass.py does: a test that RAN and passed leaves it, one still
NOT RUN stays with its newest reason, every other line is kept. A red is red (exit 1). Exit 0 = nothing red, including when no
Windows Chrome is found (the list is then left as it was, and said); 2 = no list to read. The same exact-name rule as
tests/_touch_pass.py: a run counts only when the test with exactly that name ran once in its page.
"""
import argparse, http.server, json, os, socket, subprocess, sys, threading, time, urllib.parse, uuid

REASONS = ("needs an AAC audio encoder",)
CANDIDATES = ['/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
              '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe']
PS = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'
WRAP = '''<!doctype html><meta charset="utf-8"><title>win pass</title>
<iframe id="r" style="position:absolute;left:0;top:0;width:%(w)dpx;height:900px;border:0" src="%(src)s"></iframe>
<script>
(function () {
  var f = document.getElementById('r'), t0 = Date.now(), sent = false;
  function send(o) { if (sent) return; sent = true; fetch('/__win/result?id=%(id)s', { method: 'POST', body: JSON.stringify(o) }); }
  setInterval(function () {
    var d, w;
    try { d = f.contentDocument; w = f.contentWindow; } catch (e) { return; }
    var s = d && d.getElementById('sum');
    if (s && (s.textContent.indexOf('Regression') >= 0 || s.textContent.indexOf('Error') >= 0)) {
      send({ sum: s.textContent, fails: [].slice.call(d.querySelectorAll('#list .row.fail')).map(function (r) { return r.textContent.trim(); }),
             ran: (w.__fmResults || null) && w.__fmResults.map(function (r) { return { name: r.name, ok: !!r.ok, pending: !!r.pending, notRun: r.notRun || '' }; }),
             notRun: (w.__fmNotRun || []).map(function (r) { return { name: r.name, reason: r.reason }; }), ua: navigator.userAgent });
    } else if (Date.now() - t0 > %(ms)d) {
      send({ error: 'no verdict within %(s)ds' });
    }
  }, 250);
})();
</script>'''


def flat(s):
    return " ".join(str(s).split())


def chrome():
    env = os.environ.get('FM_WIN_CHROME')
    if env == 'none':                 # test-port.sh: as if no Windows Chrome were installed
        return None
    for c in ([env] if env else []) + CANDIDATES:
        if c and os.path.exists(c):
            return c
    return None


def serve(root, results):
    class H(http.server.SimpleHTTPRequestHandler):
        protocol_version = 'HTTP/1.1'

        def __init__(self, *a, **k):
            super().__init__(*a, directory=root, **k)

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            super().end_headers()

        def log_message(self, *a):
            pass

        def do_GET(self):
            u = urllib.parse.urlparse(self.path)
            if u.path == '/__win/run':
                q = urllib.parse.parse_qs(u.query)
                body = (WRAP % {'w': int(q['w'][0]), 'id': q['id'][0], 'ms': int(q['t'][0]) * 1000, 's': int(q['t'][0]),
                                'src': '/tests/run.html?only=' + urllib.parse.quote(q['only'][0])}).encode()
                self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
                return
            return super().do_GET()

        def do_POST(self):
            u = urllib.parse.urlparse(self.path)
            n = int(self.headers.get('Content-Length', 0))
            data = self.rfile.read(n)
            if u.path == '/__win/result':
                try:
                    results[urllib.parse.parse_qs(u.query)['id'][0]] = json.loads(data or b'{}')
                except Exception as ex:
                    results['?'] = {'error': 'unreadable result: %s' % ex}
            self.send_response(204); self.send_header('Content-Length', '0'); self.end_headers()

    class S(http.server.ThreadingHTTPServer):
        request_queue_size = 256       # tools/serve.sh point 3: the page pulls ~100 scripts at once
        daemon_threads = True
        allow_reuse_address = True

    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
    srv = S(('127.0.0.1', port), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, port


_WINTEMP = []


def wintemp():
    # the Windows user's own temp folder (where a throwaway profile belongs), asked once
    if not _WINTEMP:
        t = os.environ.get('FM_WIN_TMP', '')
        if not t:
            try:
                t = subprocess.run([PS, '-NoProfile', '-Command', '[IO.Path]::GetTempPath()'], capture_output=True, text=True,
                                   timeout=60).stdout.strip().rstrip('\\')
            except Exception:
                t = ''
        _WINTEMP.append(t or r'C:\Windows\Temp')
    return _WINTEMP[0]


def end_browser(tag, wintmp):
    # OUR browser only: every chrome.exe whose command line carries this run's own profile tag — never his Chrome
    cmd = ("Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*%s*' } | "
           "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep 1; "
           "Remove-Item -Recurse -Force '%s' -ErrorAction SilentlyContinue") % (tag, wintmp)
    try:
        subprocess.run([PS, '-NoProfile', '-Command', cmd], capture_output=True, timeout=90)
    except Exception:
        pass


def run_one(name, a, exe, port, results):
    rid = uuid.uuid4().hex[:10]
    tag = 'fm-winpass-' + rid
    wintmp = wintemp() + '\\' + tag
    url = 'http://localhost:%d/__win/run?%s' % (port, urllib.parse.urlencode({'only': name, 'id': rid, 'w': a.width, 't': a.timeout}))
    # --mute-audio: every test Chrome is silent (#1070: he heard test sounds through his speakers; this launcher was the last without it).
    p = subprocess.Popen([exe, '--headless=new', '--user-data-dir=' + wintmp, '--no-first-run', '--no-default-browser-check',
                          '--disable-extensions', '--mute-audio', '--window-size=%d,950' % (a.width + 20), url],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    t0 = time.time()
    grace = 30 if a.timeout >= 60 else 2     # the page's own deadline is a.timeout; this is for a browser that never loaded it
    try:
        while rid not in results and time.time() - t0 < a.timeout + grace:
            time.sleep(0.2)
    finally:
        end_browser(tag, wintmp)
        try:
            p.wait(timeout=10)
        except Exception:
            p.kill()
    r = results.get(rid)
    if not isinstance(r, dict):
        return 'red', 'no verdict from Windows Chrome within %ds' % (a.timeout + grace), ''
    if r.get('error'):
        return 'red', 'no verdict: ' + flat(r['error'])[:300], r.get('ua', '')
    ran = [x for x in (r.get('ran') or []) if x.get('name') == name]
    if len(ran) != 1:
        return 'red', 'the exact test did not run once in its page (ran: %d match(es) of %d)' % (len(ran), len(r.get('ran') or [])), r.get('ua', '')
    x = ran[0]
    if x.get('notRun'):
        return 'notrun', flat(x['notRun']), r.get('ua', '')
    if not x.get('ok'):
        fails = [f for f in (r.get('fails') or []) if name[:60] in f]
        return 'red', flat(fails[0] if fails else 'failed')[:400], r.get('ua', '')
    return 'pass', '', r.get('ua', '')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--remaining', help='the pass\'s NOT RUN list (name<TAB>reason), rewritten in place')
    ap.add_argument('--out', default=None)
    ap.add_argument('--width', type=int, default=1280)
    ap.add_argument('--timeout', type=int, default=300, help='seconds per test')
    ap.add_argument('--root', default='.', help='the tree to serve (default: here)')
    ap.add_argument('--available', action='store_true')
    a = ap.parse_args()
    exe = chrome()
    if a.available:
        print(exe or 'no Windows Chrome reachable from here')
        return 0 if exe else 1
    if not a.remaining:
        ap.error('--remaining is required')
    try:
        lines = [l.rstrip('\n') for l in open(a.remaining, encoding='utf-8') if l.strip()]
    except OSError:
        print('win pass: no NOT RUN list at %s — nothing judged' % a.remaining)
        return 2
    mine = [l for l in lines if l.split('\t', 1)[-1].startswith(REASONS)]
    if not mine:
        return 0
    if not exe:
        print('· win pass: %d AAC test(s) stay NOT RUN — no Windows Chrome reachable from here' % len(mine))
        return 0
    results = {}
    srv, port = serve(os.path.abspath(a.root), results)
    res = {'width': a.width, 'browser': '', 'total': len(mine), 'pass': [], 'red': [], 'notRun': []}
    keep = {}
    try:
        for l in mine:
            name = l.split('\t', 1)[0]
            t0 = time.time()
            verdict, why, ua = run_one(name, a, exe, port, results)
            res['browser'] = res['browser'] or ua
            res['pass' if verdict == 'pass' else 'red' if verdict == 'red' else 'notRun'].append({'name': name, 'why': why})
            if verdict == 'notrun':
                keep[l] = flat(name)[:200] + '\t' + flat(why)[:240]
            print('   %-6s %3ds  %s%s' % ({'pass': 'pass', 'red': 'RED', 'notrun': 'NOTRUN'}[verdict], time.time() - t0, flat(name)[:100],
                                         '' if verdict == 'pass' else '  — ' + why[:200]), flush=True)
    finally:
        srv.shutdown()
    if a.out:
        with open(a.out, 'w', encoding='utf-8') as f:
            json.dump(res, f, indent=1, ensure_ascii=False)
    passed = set(x['name'] for x in res['pass'])
    with open(a.remaining, 'w', encoding='utf-8') as f:
        for l in lines:
            if l.split('\t', 1)[0] in passed:
                continue
            f.write(keep.get(l, l) + '\n')
    print('AAC tests in Windows Chrome at %d px (%s): %d pass, %d red, %d still not run, of %d' % (
        a.width, flat(res['browser'])[-40:] or '?', len(res['pass']), len(res['red']), len(res['notRun']), len(mine)))
    return 1 if res['red'] else 0


if __name__ == '__main__':
    sys.exit(main())
