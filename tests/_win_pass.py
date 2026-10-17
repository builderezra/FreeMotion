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

WHEN A TEST GETS NO VERDICT (18 Oct: v17.66's first ship was refused with all four "no verdict within 330s" and an empty user
agent, then the same test passed alone in 8 s, and nothing said why): every run now records whether the browser asked this
server for the page at all, how many requests followed and the last one, whether it posted, whether Chrome exited early, and
the end of Chrome's stderr — in the red's reason and in --out's "diag". The Chrome launched, its version and any update waiting
beside it (new_chrome.exe) are printed once and kept in --out's "chrome". A Chrome that NEVER ASKED FOR THE PAGE is launched
once more, printed and kept in --out's "relaunched": the test had not run, so this runs it for the first time. A page that
loaded and then said nothing is red at once — never re-run (his rule, 5 Oct: no "re-run failed tests once, then ship").
"""
import argparse, http.server, json, os, socket, subprocess, sys, tempfile, threading, time, urllib.parse, uuid

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


def serve(root, results, seen):
    # SEEN (18 Oct, after v17.66's first ship was refused with all four AAC tests "no verdict within 330s" and an EMPTY user
    # agent, then passed alone in 8 s): what the browser asked this server for, per run id — whether it fetched the wrapper at
    # all, how many page requests followed, the last one, and when it posted. That splits "Chrome never loaded anything"
    # from "the page loaded and then said nothing", which the old message could not.
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
                seen.setdefault(q['id'][0], {})['wrap'] = time.time()
                seen['_cur'] = q['id'][0]
                body = (WRAP % {'w': int(q['w'][0]), 'id': q['id'][0], 'ms': int(q['t'][0]) * 1000, 's': int(q['t'][0]),
                                'src': '/tests/run.html?only=' + urllib.parse.quote(q['only'][0])}).encode()
                self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
                return
            cur = seen.get(seen.get('_cur') or '')
            if isinstance(cur, dict):
                cur['gets'] = cur.get('gets', 0) + 1
                cur['last'] = u.path[:120]
            return super().do_GET()

        def do_POST(self):
            u = urllib.parse.urlparse(self.path)
            n = int(self.headers.get('Content-Length', 0))
            data = self.rfile.read(n)
            if u.path == '/__win/result':
                try:
                    rid = urllib.parse.parse_qs(u.query)['id'][0]
                    seen.setdefault(rid, {})['posted'] = time.time()
                    results[rid] = json.loads(data or b'{}')
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


def chrome_info(exe):
    # which Chrome this run launches, and its version — and whether an update is waiting beside it: on 18 Oct Chrome had a
    # new_chrome.exe pending since the 16th, a suspect for a browser that answers nothing (an empty user agent)
    info = {'exe': exe, 'version': '?', 'pendingUpdate': None}
    if not exe.startswith('/mnt/') or len(exe) < 7:
        return info
    win = exe[5].upper() + ':' + exe[6:].replace('/', '\\')
    cmd = ("$f='%s'; $v=(Get-Item -LiteralPath $f).VersionInfo.ProductVersion; "
           "$n=Test-Path -LiteralPath (Join-Path (Split-Path $f) 'new_chrome.exe'); \"$v|$n\"") % win
    try:
        out = subprocess.run([PS, '-NoProfile', '-Command', cmd], capture_output=True, text=True, timeout=60).stdout.strip()
        v, n = (out.split('|') + [''])[:2]
        info['version'] = v or '?'
        info['pendingUpdate'] = n.strip().lower() == 'true'
    except Exception:
        pass
    return info


def describe(d):
    # one line for a launch that gave no verdict, from what the server saw and what Chrome said
    if not d.get('wrapperFetched'):
        s = 'Chrome never asked for the page'
    else:
        s = 'the page loaded (%d request(s) after it, the last %s) but posted nothing' % (d.get('pageRequests', 0), d.get('lastRequest') or '-')
    if d.get('chromeExited'):
        s += '; Chrome exited ' + d['chromeExited']
    if d.get('stderr'):
        s += '; its stderr ends: ' + d['stderr'][-160:]
    return s


def launch(name, a, exe, port, results, seen):
    rid = uuid.uuid4().hex[:10]
    tag = 'fm-winpass-' + rid
    wintmp = wintemp() + '\\' + tag
    url = 'http://localhost:%d/__win/run?%s' % (port, urllib.parse.urlencode({'only': name, 'id': rid, 'w': a.width, 't': a.timeout}))
    errpath = os.path.join(tempfile.gettempdir(), tag + '.err')
    ef = open(errpath, 'wb')
    # --mute-audio: every test Chrome is silent (#1070: he heard test sounds through his speakers; this launcher was the last without it).
    # stderr goes to a file now (18 Oct), so a browser that answers nothing has said something we can read.
    p = subprocess.Popen([exe, '--headless=new', '--user-data-dir=' + wintmp, '--no-first-run', '--no-default-browser-check',
                          '--disable-extensions', '--mute-audio', '--window-size=%d,950' % (a.width + 20), url],
                         stdout=subprocess.DEVNULL, stderr=ef)
    t0 = time.time()
    exited = ''
    try:
        while rid not in results and time.time() - t0 < a.timeout + grace_of(a):
            if not exited and p.poll() is not None:
                exited = 'with code %s after %ds' % (p.returncode, time.time() - t0)
            time.sleep(0.2)
    finally:
        end_browser(tag, wintmp)
        try:
            p.wait(timeout=10)
        except Exception:
            p.kill()
        ef.close()
    try:
        with open(errpath, 'rb') as f:
            err = flat(f.read()[-2000:].decode('utf-8', 'replace'))
        os.remove(errpath)
    except OSError:
        err = ''
    s = seen.get(rid, {})
    return rid, {'wrapperFetched': 'wrap' in s, 'pageRequests': s.get('gets', 0), 'lastRequest': s.get('last', ''),
                 'posted': 'posted' in s, 'chromeExited': exited if rid not in results else '', 'stderr': err[-400:]}


def grace_of(a):
    return 30 if a.timeout >= 60 else 2     # the page's own deadline is a.timeout; this is for a browser that never loaded it


def run_one(name, a, exe, port, results, seen):
    rid, diag = launch(name, a, exe, port, results, seen)
    relaunched = ''
    # ONE relaunch, and only for a browser that NEVER ASKED FOR THE PAGE: the test did not run at all, so launching Chrome again
    # runs it for the first time — it is not a second try at a test that ran. A page that loaded and then said nothing is RED with
    # no retry: his rule (5 Oct, offered "re-run failed tests once, then ship": no) is never to blind-retry a test.
    if rid not in results and not diag['wrapperFetched']:
        relaunched = describe(diag)
        print('   relaunch %s — %s; launching Chrome once more' % (flat(name)[:80], relaunched[:240]), flush=True)
        first = diag
        rid, diag = launch(name, a, exe, port, results, seen)
        diag['firstLaunch'] = first
    r = results.get(rid)
    if not isinstance(r, dict):
        why = 'no verdict from Windows Chrome within %ds — %s' % (a.timeout + grace_of(a), describe(diag))
        if relaunched:
            why += ' (and on the first launch too)'
        return 'red', why, '', diag, relaunched
    if r.get('error'):
        return 'red', 'no verdict: ' + flat(r['error'])[:300], r.get('ua', ''), diag, relaunched
    ran = [x for x in (r.get('ran') or []) if x.get('name') == name]
    if len(ran) != 1:
        return 'red', 'the exact test did not run once in its page (ran: %d match(es) of %d)' % (len(ran), len(r.get('ran') or [])), r.get('ua', ''), diag, relaunched
    x = ran[0]
    if x.get('notRun'):
        return 'notrun', flat(x['notRun']), r.get('ua', ''), diag, relaunched
    if not x.get('ok'):
        fails = [f for f in (r.get('fails') or []) if name[:60] in f]
        return 'red', flat(fails[0] if fails else 'failed')[:400], r.get('ua', ''), diag, relaunched
    return 'pass', '', r.get('ua', ''), diag, relaunched


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
    results, seen = {}, {}
    srv, port = serve(os.path.abspath(a.root), results, seen)
    ci = chrome_info(exe)
    print('   Windows Chrome: %s, version %s%s' % (ci['exe'], ci['version'],
          ', an update (new_chrome.exe) is waiting beside it' if ci['pendingUpdate'] else ''), flush=True)
    res = {'width': a.width, 'browser': '', 'chrome': ci, 'total': len(mine), 'pass': [], 'red': [], 'notRun': [], 'relaunched': []}
    keep = {}
    try:
        for l in mine:
            name = l.split('\t', 1)[0]
            t0 = time.time()
            verdict, why, ua, diag, relaunched = run_one(name, a, exe, port, results, seen)
            res['browser'] = res['browser'] or ua
            res['pass' if verdict == 'pass' else 'red' if verdict == 'red' else 'notRun'].append({'name': name, 'why': why, 'diag': diag})
            if relaunched:
                res['relaunched'].append({'name': name, 'firstLaunch': relaunched})
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
    print('AAC tests in Windows Chrome at %d px (%s): %d pass, %d red, %d still not run, of %d%s' % (
        a.width, flat(res['browser'])[-40:] or '?', len(res['pass']), len(res['red']), len(res['notRun']), len(mine),
        ' — %d relaunched because Chrome never asked for the page' % len(res['relaunched']) if res['relaunched'] else ''))
    return 1 if res['red'] else 0


if __name__ == '__main__':
    sys.exit(main())
